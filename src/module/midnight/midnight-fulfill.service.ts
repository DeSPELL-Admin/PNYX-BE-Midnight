import {
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { MidnightService, PinnedEscrowRow } from './midnight.service';
import { MidnightOrderService } from 'src/module/domain/midnight-order/midnight-order.service';
import { MidnightOrderRecord } from 'src/module/domain/midnight-order/midnight-order.repository';
import { MidnightEscrowService } from 'src/module/domain/midnight-escrow/midnight-escrow.service';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import { ItemService } from 'src/module/domain/item/item.service';
import {
    canonicalDatasetJson,
    resolveItemNames,
    sha256HexUtf8,
} from './lib/market';
import {
    MidnightOrderStage,
    MidnightOrderStatus,
} from 'src/module/common/util/enum.util';
import { bytes32, toHex } from './lib/bytes';

const ESCROW_BATCH = 8;
const STALL_MS = 15 * 60 * 1000;
/** 백오프: 30초 → 2분 → 8분 */
const BACKOFF_MS = [30_000, 120_000, 480_000];

/**
 * 주문 fulfill 상태머신 (docs/market-dev-plan.md §2).
 *
 * PAID → FULFILLING(registering → building → proving → confirming) → FULFILLED | FAILED
 *
 * 오퍼레이터 지갑은 프로세스 내 단일 세션이므로 fulfill 은 프로미스 체인으로 직렬화한다.
 * (동시 sellRows 는 코인 선택이 충돌한다 — 계획 리스크 1)
 */
@Injectable()
export class MidnightFulfillService implements OnModuleInit {
    private readonly logger = new Logger(MidnightFulfillService.name);
    private readonly maxAttempts = parseInt(
        process.env.MIDNIGHT_MARKET_MAX_ATTEMPTS ?? '3',
        10,
    );
    private chain: Promise<void> = Promise.resolve();

    constructor(
        private readonly midnightService: MidnightService,
        private readonly orderService: MidnightOrderService,
        private readonly escrowService: MidnightEscrowService,
        private readonly tournamentService: TournamentService,
        private readonly itemService: ItemService,
    ) {}

    /** 부팅 복구 — 스톨된 FULFILLING 을 PAID 로 되돌리고, 모든 PAID 를 다시 큐에 넣는다. */
    onModuleInit(): void {
        if (process.env.MIDNIGHT_ENABLED !== 'true') return;
        void (async () => {
            const stalled = await this.orderService.findStalledFulfilling(
                new Date(Date.now() - STALL_MS),
            );
            for (const o of stalled) {
                this.logger.warn(
                    `recovering stalled order ${o.orderId} (FULFILLING > 15m) → PAID`,
                );
                await this.orderService.updateByOrderId(o.orderId, {
                    status: MidnightOrderStatus.PAID,
                    stage: MidnightOrderStage.QUEUED,
                });
            }
            const paid = await this.orderService.findPaidOrders();
            for (const o of paid) this.enqueue(o.orderId);
            if (paid.length)
                this.logger.log(
                    `re-enqueued ${paid.length} paid order(s) on boot`,
                );
        })().catch((e) =>
            this.logger.error(
                `fulfill boot recovery failed: ${e?.message ?? e}`,
            ),
        );
    }

    /** 직렬 큐 — 앞 주문의 증명(60~90초)이 끝나야 다음이 시작된다. */
    enqueue(orderId: string): void {
        this.chain = this.chain
            .then(() => this.fulfill(orderId))
            .catch((e) =>
                this.logger.error(
                    `fulfill chain error (${orderId}): ${e?.message ?? e}`,
                ),
            );
    }

    private async fulfill(orderId: string): Promise<void> {
        const order = await this.orderService.findByOrderId(orderId);
        if (!order || order.status !== MidnightOrderStatus.PAID) return; // 이미 처리됐거나 취소됨
        await this.setStage(
            orderId,
            MidnightOrderStatus.FULFILLING,
            MidnightOrderStage.QUEUED,
        );

        try {
            // [1] registering — 구매자 키 온체인 등록 (최초 1회)
            await this.setStage(
                orderId,
                MidnightOrderStatus.FULFILLING,
                MidnightOrderStage.REGISTERING,
            );
            if (
                !(await this.midnightService.isBuyerRegistered(order.buyerPk))
            ) {
                const reg = await this.midnightService.registerBuyer(
                    order.buyerPk,
                );
                await this.orderService.updateByOrderId(orderId, {
                    registerBuyerTxId: reg.txId,
                });
                this.logger.log(
                    `registerBuyer ${order.buyerPk.slice(0, 12)}… tx=${reg.txId.slice(0, 16)}`,
                );
                // 등록 tx 가 컨트랙트 상태에 반영되기 전에 sellRows 를 빌드하면 BuyerNotRegistered 로
                // 시뮬레이션이 깨진다 — 인덱서에 buyers 반영이 보일 때까지 대기 (3초 × 20회)
                let visible = false;
                for (let i = 0; i < 20 && !visible; i++) {
                    await new Promise((r) => setTimeout(r, 3000));
                    visible = await this.midnightService.isBuyerRegistered(
                        order.buyerPk,
                    );
                }
                if (!visible)
                    throw new Error('registerBuyer not visible on indexer yet');
            }

            // [2] building — 판매 시점 로우 고정(pin) + 데이터셋 확정
            await this.setStage(
                orderId,
                MidnightOrderStatus.FULFILLING,
                MidnightOrderStage.BUILDING,
            );
            const built = await this.buildOrReuseDataset(order, orderId);
            if (!built) return; // fail() 이미 기록됨 (EmptyDataset)
            const { pinned, datasetHash } = built;

            // [3] proving — sellRows 증명 + 제출 (60~90초)
            await this.setStage(
                orderId,
                MidnightOrderStatus.FULFILLING,
                MidnightOrderStage.PROVING,
            );
            const sell = await this.midnightService.sellRows({
                buyerPkHex: order.buyerPk,
                tournamentId: order.tournamentId,
                specHashHex: order.specHash,
                datasetHashHex: datasetHash,
                pinnedRows: pinned,
            });
            await this.orderService.updateByOrderId(orderId, {
                sellTxId: sell.txId,
            });
            this.logger.log(
                `sellRows order=${orderId} tx=${sell.txId.slice(0, 16)}… block=${sell.blockHeight}`,
            );

            // [4] confirming — 온체인 License 확인 (인덱서 지연 흡수: 3초 × 5회)
            await this.setStage(
                orderId,
                MidnightOrderStatus.FULFILLING,
                MidnightOrderStage.CONFIRMING,
            );
            await this.confirmLicense(order, orderId);
        } catch (e) {
            await this.handleFailure(order, orderId, e);
        }
    }

    /**
     * 판매 대상 로우와 데이터셋 바이트를 확정한다.
     *
     * 이전 시도가 이미 고정한 것이 있으면 **그대로 재사용**한다. 시도 1이 온체인에는
     * 올라갔는데 응답만 유실된 경우, 시도 2가 라이브 escrow/이름으로 재빌드하면
     * 이미 체인에 박힌 datasetHash 와 다른 파일을 팔게 된다 (escrow 로우가 늘었거나
     * 아이템 이름·토너먼트 제목이 수정됐을 수 있다).
     *
     * @returns 데이터셋. escrow 가 비어 fail() 을 기록한 경우 null.
     */
    private async buildOrReuseDataset(
        order: MidnightOrderRecord,
        orderId: string,
    ): Promise<{
        pinned: PinnedEscrowRow[];
        datasetJson: string;
        datasetHash: string;
    } | null> {
        if (
            order.datasetJson &&
            order.datasetHash &&
            order.pinnedRows?.length
        ) {
            const pinned: PinnedEscrowRow[] = order.pinnedRows.map((r) => ({
                tournamentId: r.tournamentId,
                itemId: r.itemId,
                bracket: r.bracket ?? [],
                segment: r.segment,
                salt: r.salt,
            }));
            this.logger.log(
                `order ${orderId}: reusing dataset pinned by a previous attempt (rows=${pinned.length} hash=${order.datasetHash.slice(0, 16)}…)`,
            );
            return {
                pinned,
                datasetJson: order.datasetJson,
                datasetHash: order.datasetHash,
            };
        }

        const escrow = await this.escrowService.findByTournament(
            order.chainId,
            order.tournamentId,
        );
        const pinned: PinnedEscrowRow[] = escrow
            .slice(0, ESCROW_BATCH)
            .map((r) => ({
                tournamentId: r.tournamentId,
                itemId: r.itemId,
                bracket: r.bracket ?? [],
                segment: r.segment,
                salt: r.salt,
            }));
        if (pinned.length === 0) {
            await this.fail(
                orderId,
                'EmptyDataset: no escrow rows at fulfill time',
            );
            return null;
        }
        // 데이터셋 v2 — 판매 파일 안에 사람이 읽을 수 있는 이름을 함께 담는다.
        // 이름은 데이터셋 JSON 전용이며, ZK witness 로 가는 pinned 는 그대로 둔다.
        const [tournamentTitle, nameByItemId] = await Promise.all([
            this.tournamentTitleOf(order.tournamentId),
            this.itemNamesOf(order.tournamentId),
        ]);
        const datasetJson = canonicalDatasetJson({
            tournamentId: order.tournamentId,
            tournamentTitle,
            orderId,
            rows: resolveItemNames(pinned, nameByItemId),
        });
        const datasetHash = sha256HexUtf8(datasetJson);
        await this.orderService.updateByOrderId(orderId, {
            rowCount: pinned.length,
            datasetJson,
            datasetHash,
            pinnedRows: pinned,
        });
        return { pinned, datasetJson, datasetHash };
    }

    /**
     * 시드에 없는 토너먼트여도 fulfill 은 계속돼야 한다 — "없음"일 때만 기본 제목으로 폴백.
     * 그 밖의 오류(DB 장애 등)는 그대로 던져 이번 시도를 실패시킨다: 여기서 삼키면
     * 잘못된 제목이 datasetHash 에 그대로 고정된다.
     */
    private async tournamentTitleOf(tournamentId: number): Promise<string> {
        try {
            const t =
                await this.tournamentService.getTournamentById(tournamentId);
            return t?.title ?? `Tournament ${tournamentId}`;
        } catch (e) {
            if (e instanceof NotFoundException)
                return `Tournament ${tournamentId}`;
            throw e;
        }
    }

    /**
     * 이름 조회 오류는 이번 시도를 실패시킨다 — 데이터셋 바이트의 sha256 이 몇 초 뒤
     * 온체인에 고정되므로, 일시적 DB 오류로 만들어진 `#<id>` 투성이 파일이 영구히
     * 팔려나가면 안 된다. 카탈로그에 정말 없는 id 만 resolveItemNames 가 폴백한다.
     */
    private async itemNamesOf(
        tournamentId: number,
    ): Promise<Map<number, string>> {
        const items =
            await this.itemService.findNamesByTournamentId(tournamentId);
        return new Map(items.map((i) => [i.itemId, i.name]));
    }

    private async confirmLicense(
        order: MidnightOrderRecord,
        orderId: string,
    ): Promise<void> {
        for (let i = 0; i < 5; i++) {
            const lic = await this.midnightService.getLicense(
                order.buyerPk,
                order.tournamentId,
                order.specHash,
            );
            if (lic) {
                await this.orderService.updateByOrderId(orderId, {
                    status: MidnightOrderStatus.FULFILLED,
                    stage: MidnightOrderStage.DONE,
                    licenseId: await this.licenseIdHex(order),
                    deliveredRowCount: lic.rowCount,
                    sampleAtSale: lic.sampleAtSale,
                });
                this.logger.log(
                    `order ${orderId} FULFILLED — rows=${lic.rowCount} sampleAtSale=${lic.sampleAtSale}`,
                );
                return;
            }
            await new Promise((r) => setTimeout(r, 3000));
        }
        throw new Error('License not visible on indexer yet');
    }

    private async licenseIdHex(order: MidnightOrderRecord): Promise<string> {
        // pureCircuits.licenseId 재계산 — FE 검증 패널과 같은 경로
        const { TF } = await (
            this.midnightService as unknown as {
                getCtx(): Promise<{
                    TF: {
                        pureCircuits: {
                            licenseId(
                                a: Uint8Array,
                                b: bigint,
                                c: Uint8Array,
                            ): Uint8Array;
                        };
                    };
                }>;
            }
        )['getCtx']();
        return toHex(
            TF.pureCircuits.licenseId(
                bytes32(order.buyerPk, 'buyerPk'),
                BigInt(order.tournamentId),
                bytes32(order.specHash, 'specHash'),
            ),
        );
    }

    /** cause 체인까지 내려가 메시지를 모은다 — 회로 assert 이름(CompactError)은 깊숙한 cause 에 있다. */
    private collectErrorText(e: unknown, depth = 0): string {
        if (e == null || depth > 6) return '';
        const err = e as Error & { cause?: unknown };
        return [
            String(err.message ?? e),
            this.collectErrorText(err.cause, depth + 1),
        ]
            .filter(Boolean)
            .join(' <- ');
    }

    private async handleFailure(
        order: MidnightOrderRecord,
        orderId: string,
        e: unknown,
    ): Promise<void> {
        const msg = this.collectErrorText(e).slice(0, 500);

        // 증명 성공 후 응답 수신 전에 죽었던 재시도 — specHash 에 orderId 가 있으므로 이건 "같은 주문의 성공"이다
        if (msg.includes('LicenseExists')) {
            this.logger.warn(
                `order ${orderId}: LicenseExists → treating as success`,
            );
            try {
                await this.confirmLicense(order, orderId);
                return;
            } catch {
                /* 아래 재시도 경로로 */
            }
        }

        // 재시도가 무의미한 회로 거부
        if (/EmptyDataset|WrongTournament|RowNotOnChain/.test(msg)) {
            await this.fail(orderId, msg);
            return;
        }

        const attempts = (order.attempts ?? 0) + 1;
        await this.orderService.incrementAttempts(orderId);
        await this.orderService.updateByOrderId(orderId, { error: msg });
        if (attempts >= this.maxAttempts) {
            await this.fail(orderId, msg);
            return;
        }
        const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
        this.logger.warn(
            `order ${orderId} attempt ${attempts} failed (${msg.slice(0, 120)}) — retry in ${delay / 1000}s`,
        );
        await this.orderService.updateByOrderId(orderId, {
            status: MidnightOrderStatus.PAID,
            stage: MidnightOrderStage.QUEUED,
        });
        setTimeout(() => this.enqueue(orderId), delay);
    }

    private async fail(orderId: string, msg: string): Promise<void> {
        this.logger.error(`order ${orderId} FAILED: ${msg.slice(0, 200)}`);
        await this.orderService.updateByOrderId(orderId, {
            status: MidnightOrderStatus.FAILED,
            error: msg,
        });
    }

    private async setStage(
        orderId: string,
        status: MidnightOrderStatus,
        stage: MidnightOrderStage,
    ): Promise<void> {
        await this.orderService.updateByOrderId(orderId, { status, stage });
    }
}

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { MidnightService } from './midnight.service';
import { MidnightFulfillService } from './midnight-fulfill.service';
import { MidnightOrderService } from 'src/module/domain/midnight-order/midnight-order.service';
import { MidnightOrderRecord } from 'src/module/domain/midnight-order/midnight-order.repository';
import { MidnightEscrowService } from 'src/module/domain/midnight-escrow/midnight-escrow.service';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import {
    buyerPkHex,
    canonicalQuerySpec,
    newOrderId,
    specHashHex,
} from './lib/market';
import {
    MidnightOrderStage,
    MidnightOrderStatus,
} from 'src/module/common/util/enum.util';
import { MarketProductResDto } from './dto/res/market-product.res.dto';
import { OrderResDto } from './dto/res/order.res.dto';

/** escrow 배치 상한 — 회로의 Vector<8, EscrowRow> 와 같아야 한다. */
export const ESCROW_BATCH = 8;

/**
 * 데이터 마켓 (docs/market-dev-plan.md) — 상품 목록 · 주문 · 결제 기록 · 데이터셋 서빙.
 * 판매(온체인 sellRows)는 MidnightFulfillService 가 비동기로 수행한다.
 */
@Injectable()
export class MidnightMarketService {
    private readonly logger = new Logger(MidnightMarketService.name);
    /** 로우당 가격 (tNIGHT 원자단위). 1 tNIGHT = 1e6 units (walletInfo 실측) — 기본 10 tNIGHT. */
    private readonly pricePerRowUnits = BigInt(
        process.env.MIDNIGHT_MARKET_PRICE_PER_ROW_UNITS ?? '10000000',
    );
    private ledgerCache: {
        at: number;
        sampleCounts: Map<number, number>;
    } | null = null;

    constructor(
        private readonly midnightService: MidnightService,
        private readonly fulfillService: MidnightFulfillService,
        private readonly orderService: MidnightOrderService,
        private readonly escrowService: MidnightEscrowService,
        private readonly tournamentService: TournamentService,
    ) {}

    /** escrow 가 있는 토너먼트만 상품이 된다. 온체인 sampleCount 는 10초 캐시. */
    async getProducts(
        chainId: number,
        tournamentId?: number,
    ): Promise<MarketProductResDto[]> {
        const counts = await this.escrowService.countByTournaments(chainId);
        const tids = [...counts.keys()]
            .filter((t) => tournamentId === undefined || t === tournamentId)
            .sort((a, b) => a - b);
        if (tids.length === 0) return [];

        const sampleCounts = await this.sampleCountsCached(tids);
        return await Promise.all(
            tids.map(async (tid) => {
                const escrowRowCount = counts.get(tid) ?? 0;
                const sellableRowCount = Math.min(escrowRowCount, ESCROW_BATCH);
                let title = `Tournament ${tid}`;
                let category = '';
                let firstItemImageName: string | null = null;
                try {
                    const t =
                        await this.tournamentService.getTournamentById(tid);
                    title = t.title;
                    category = String(
                        (t as { category?: string }).category ?? '',
                    );
                    firstItemImageName =
                        (t as { firstItemImageName?: string })
                            .firstItemImageName ?? null;
                } catch {
                    // 시드에 없는 토너먼트여도 온체인/escrow 기준으로는 판매 가능 — 제목만 기본값
                }
                return {
                    tournamentId: tid,
                    title,
                    category,
                    firstItemImageName,
                    sampleCount: sampleCounts.get(tid) ?? 0,
                    escrowRowCount,
                    sellableRowCount,
                    pricePerRowUnits: this.pricePerRowUnits.toString(),
                    priceUnits: (
                        this.pricePerRowUnits * BigInt(sellableRowCount)
                    ).toString(),
                    soldOut: sellableRowCount === 0,
                };
            }),
        );
    }

    async createOrder(
        chainId: number,
        walletAddress: string,
        tournamentId: number,
    ): Promise<OrderResDto> {
        const escrowRows = await this.escrowService.findByTournament(
            chainId,
            tournamentId,
        );
        const sellable = Math.min(escrowRows.length, ESCROW_BATCH);
        if (sellable === 0)
            throw new BadRequestException(
                'No sellable rows for this tournament yet',
            );

        // 같은 (buyer, tournament) 의 결제 전 주문은 재사용 — 가격/표본만 현재 값으로 갱신
        const existing = await this.orderService.findCreatedFor(
            chainId,
            walletAddress,
            tournamentId,
        );
        const sampleCount =
            await this.midnightService.sampleCountOf(tournamentId);
        if (existing) {
            await this.orderService.updateByOrderId(existing.orderId, {
                rowCount: sellable,
                sampleCountAtOrder: sampleCount,
                priceUnits: (
                    this.pricePerRowUnits * BigInt(sellable)
                ).toString(),
            });
            return await this.toResDto(
                (await this.orderService.findByOrderId(existing.orderId))!,
            );
        }

        const orderId = newOrderId();
        const querySpec = canonicalQuerySpec(tournamentId, orderId);
        await this.orderService.create({
            orderId,
            chainId,
            buyerAddress: walletAddress,
            buyerPk: buyerPkHex(walletAddress),
            tournamentId,
            rowCount: sellable,
            sampleCountAtOrder: sampleCount,
            priceUnits: (this.pricePerRowUnits * BigInt(sellable)).toString(),
            querySpec,
            specHash: specHashHex(querySpec),
        });
        this.logger.log(
            `order created ${orderId} — buyer=${walletAddress.slice(0, 20)}… tid=${tournamentId} rows=${sellable}`,
        );
        return await this.toResDto(
            (await this.orderService.findByOrderId(orderId))!,
        );
    }

    async payOrder(
        chainId: number,
        walletAddress: string,
        orderId: string,
        txId: string,
    ): Promise<OrderResDto> {
        const order = await this.requireOwnOrder(
            chainId,
            walletAddress,
            orderId,
        );
        if (
            order.status === MidnightOrderStatus.FULFILLED ||
            order.status === MidnightOrderStatus.FAILED
        ) {
            throw new ConflictException(`Order already ${order.status}`);
        }
        if (order.status === MidnightOrderStatus.CREATED) {
            if (process.env.MIDNIGHT_MARKET_VERIFY_PAYMENT_TX === 'true') {
                const tx = await this.midnightService.getTransaction(txId);
                if (!tx)
                    throw new BadRequestException(
                        'Payment transaction not found on indexer',
                    );
            }
            await this.orderService.updateByOrderId(orderId, {
                status: MidnightOrderStatus.PAID,
                stage: MidnightOrderStage.QUEUED,
                paymentTxId: txId,
            });
            this.fulfillService.enqueue(orderId);
        }
        return await this.toResDto(
            (await this.orderService.findByOrderId(orderId))!,
        );
    }

    async getOrder(
        chainId: number,
        walletAddress: string,
        orderId: string,
    ): Promise<OrderResDto> {
        return await this.toResDto(
            await this.requireOwnOrder(chainId, walletAddress, orderId),
        );
    }

    /** 다운로드 원문 — datasetJson 문자열을 재직렬화 없이 그대로 반환해야 datasetHash 가 유지된다. */
    async getDatasetJson(
        chainId: number,
        walletAddress: string,
        orderId: string,
    ): Promise<{ filename: string; json: string }> {
        const order = await this.requireOwnOrder(
            chainId,
            walletAddress,
            orderId,
        );
        if (
            order.status !== MidnightOrderStatus.FULFILLED ||
            !order.datasetJson
        ) {
            throw new ConflictException('Order is not fulfilled yet');
        }
        return {
            filename: `pnyx-dataset-${orderId}.json`,
            json: order.datasetJson,
        };
    }

    private async requireOwnOrder(
        chainId: number,
        walletAddress: string,
        orderId: string,
    ): Promise<MidnightOrderRecord> {
        const order = await this.orderService.findByOrderId(orderId);
        if (!order || order.chainId !== chainId)
            throw new NotFoundException('Order not found');
        if (order.buyerAddress !== walletAddress)
            throw new ForbiddenException('Not your order');
        return order;
    }

    private async toResDto(order: MidnightOrderRecord): Promise<OrderResDto> {
        const [payTo, tokenTypeRaw] = await Promise.all([
            this.midnightService.operatorAddress(),
            this.midnightService.nativeTokenRaw(),
        ]);
        const { datasetJson: _omit, ...rest } = order as MidnightOrderRecord & {
            updatedAt?: Date;
        };
        return {
            ...(rest as unknown as OrderResDto),
            pricePerRowUnits: this.pricePerRowUnits.toString(),
            payTo,
            tokenTypeRaw,
            updatedAt: (
                (order as { updatedAt?: Date }).updatedAt ?? new Date()
            ).toISOString(),
        };
    }

    private async sampleCountsCached(
        tids: number[],
    ): Promise<Map<number, number>> {
        if (
            this.ledgerCache &&
            Date.now() - this.ledgerCache.at < 10_000 &&
            tids.every((t) => this.ledgerCache!.sampleCounts.has(t))
        ) {
            return this.ledgerCache.sampleCounts;
        }
        const map = new Map<number, number>();
        // readLedger 1회로 전 토너먼트 조회 (인덱서 왕복 최소화)
        const ledger = await this.midnightService.readLedger();
        for (const tid of tids) {
            const t = BigInt(tid);
            map.set(
                tid,
                ledger.sampleCount.member(t)
                    ? Number(ledger.sampleCount.lookup(t).read())
                    : 0,
            );
        }
        this.ledgerCache = { at: Date.now(), sampleCounts: map };
        return map;
    }
}

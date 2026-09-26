import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { keccak256 } from 'ethers';
import { tournamentDataToUint16Array } from 'src/util/hex-conversion.util';
import { LockService } from 'src/module/domain/lock/lock.service';
import { PlayVerificationService } from 'src/module/domain/play-verification/play-verification.service';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import { TournamentType } from 'src/module/common/util/enum.util';
import { MidnightService } from 'src/module/midnight/midnight.service';
import { MidnightGrantService } from 'src/module/domain/midnight-grant/midnight-grant.service';
import type { MidnightGrantRecord } from 'src/module/domain/midnight-grant/midnight-grant.repository';
import { FinalizeTournamentResDto } from './dto/res/finalize-tournament.res.dto';
import {
    getTournamentDataByteLength,
    hasDuplicateIds,
    isValidBracketByteLength,
    sortedEqual,
} from './signature.util';

@Injectable()
export class SignatureService {
    private readonly grantTtlSeconds = BigInt(
        parseInt(process.env.MIDNIGHT_GRANT_TTL_SECONDS || '86400', 10),
    );
    private readonly deadlineGraceSeconds = BigInt(
        parseInt(process.env.MIDNIGHT_GRANT_DEADLINE_GRACE_SECONDS || '30', 10),
    );
    /**
     * grant tx 가 인덱서에 안 보이는 상태를 "아직 전파 중"으로 봐 주는 시간. 제출→인덱싱 실측 ≈19s 에 블록 타임 변동을
     * 더한 값이고, FE 의 leaf 폴링 예산(≈58s)보다 짧아야 사용자의 재시도가 재발급을 트리거한다.
     */
    private readonly grantLivenessThresholdSeconds = BigInt(
        parseInt(
            process.env.MIDNIGHT_GRANT_LIVENESS_THRESHOLD_SECONDS || '45',
            10,
        ),
    );
    private readonly logger = new Logger(SignatureService.name);

    constructor(
        private readonly lockService: LockService,
        private readonly playVerificationService: PlayVerificationService,
        private readonly playInfoService: PlayInfoService,
        private readonly tournamentService: TournamentService,
        private readonly midnightService: MidnightService,
        private readonly midnightGrantService: MidnightGrantService,
    ) {}

    async getTournamentFinalizeSignature(
        chainId: number,
        walletAddress: string,
        tournamentId: number,
        tournamentData: string,
        userPk?: string,
    ): Promise<FinalizeTournamentResDto> {
        // 라우트 전체(락+검증+포인트+leaf+제출) 소요 — grant API p50 측정의 유일한 기준 계측이다.
        const t0 = Date.now();
        try {
            return await this.getMidnightFinalizeGrant(
                chainId,
                walletAddress,
                tournamentId,
                tournamentData,
                userPk,
            );
        } finally {
            this.logger.log(
                `[grant-api-latency] chainId=${chainId} tournamentId=${tournamentId} ms=${Date.now() - t0}`,
            );
        }
    }

    private async getMidnightFinalizeGrant(
        chainId: number,
        walletAddress: string,
        tournamentId: number,
        tournamentData: string,
        userPk?: string,
    ): Promise<FinalizeTournamentResDto> {
        if (!userPk)
            throw new BadRequestException('userPk is required on Midnight');

        const resourceId = `signature:tournament-finalize:user:${walletAddress}`;
        const lockValue = await this.lockService.setWithLock(
            resourceId,
            'midnight finalize grant request',
        );
        try {
            const normalizedData = tournamentData.toLowerCase();
            const entryItemIds = this.decodeAndValidateData(normalizedData);
            await this.assertMatchesPlayVerification(
                walletAddress,
                tournamentId,
                entryItemIds,
            );
            const point = await this.resolvePoint(
                walletAddress,
                tournamentId,
                entryItemIds.length,
            );
            const key = { chainId, walletAddress, tournamentId };
            const existing = await this.midnightGrantService.findOne(key);
            const now = BigInt(Math.floor(Date.now() / 1000));
            if (
                existing &&
                !existing.finalizeTxId &&
                existing.userPk === userPk &&
                existing.entryItemHexes === normalizedData &&
                now < BigInt(existing.deadline) + this.deadlineGraceSeconds
            ) {
                return this.reuseOrReplaceGrant(key, existing, now);
            }
            if (existing?.finalizeTxId) {
                throw new ConflictException(
                    'This tournament is already finalized on Midnight',
                );
            }

            const deadline = this.computeDeadline();
            const leaf = await this.midnightService.eligibilityLeaf(
                userPk,
                tournamentId,
                point,
                deadline,
                normalizedData,
            );
            const { txId } = await this.midnightService.grantEligibility(leaf);
            await this.midnightGrantService.upsert(key, {
                userPk,
                entryItemHexes: normalizedData,
                tournamentDataHash: keccak256(normalizedData),
                point,
                deadline: deadline.toString(),
                leaf,
                txId,
            });
            return {
                exists: false,
                deadline: deadline.toString(),
                point,
                txId,
                segment: null,
            };
        } finally {
            await this.lockService.releaseLock(resourceId, lockValue);
        }
    }

    /**
     * 유효한 grant 레코드가 있을 때 — 온체인에 실제로 살아 있는지 확인하고, 확정 사망이면 같은 leaf 로 다시 제출한다.
     * 제출이 비동기라 "레코드 있음 ≠ grant 있음" 이기 때문이다.
     *
     *   success                 → exists:true (오늘과 같은 재사용)
     *   failed                  → 즉시 재발급 (나이 무관 — 확정 사망)
     *   absent + 임계 미만      → exists:true (아직 전파 중, FE 가 계속 폴링)
     *   absent + 임계 이상      → 재발급
     *   inconclusive            → exists:true (인덱서 불확실 — fail-open, 재발급 안 함)
     *
     * 재발급은 leaf/deadline/point 를 그대로 두고 txId 만 바꾼다 — FE 가 기다리는 leaf 가 바뀌지 않고, 같은 leaf 가
     * 트리에 두 번 들어가도 membership 은 그대로다(grantedCount 만 표시용으로 1 늘어난다).
     * 재발급 자체가 제출 전에 실패하면 레코드를 건드리지 않고 그대로 throw(5xx) 한다 — 죽은 grant 를 exists:true 로
     * 돌려주면 FE 는 InvalidSigner/leaf 타임아웃을 반복할 뿐이라, 보이게 실패시키는 쪽이 맞다.
     */
    private async reuseOrReplaceGrant(
        key: { chainId: number; walletAddress: string; tournamentId: number },
        existing: MidnightGrantRecord,
        now: bigint,
    ): Promise<FinalizeTournamentResDto> {
        const reuse: FinalizeTournamentResDto = {
            exists: true,
            deadline: existing.deadline,
            point: existing.point,
            txId: existing.txId,
            segment: null,
        };
        const ageSec =
            now -
            BigInt(Math.floor(new Date(existing.updatedAt).getTime() / 1000));
        const probe = await this.midnightService.probeGrantLiveness(
            existing.txId,
        );
        const tag = `tournament=${key.tournamentId} tx=${existing.txId.slice(0, 10)}… age=${ageSec}s`;
        switch (probe.state) {
            case 'success':
                return reuse;
            case 'inconclusive':
                this.logger.warn(
                    `[grant-liveness] inconclusive, keeping grant (${tag}): ${probe.reason}`,
                );
                return reuse;
            case 'absent':
                if (ageSec < this.grantLivenessThresholdSeconds) return reuse;
                this.logger.warn(
                    `[grant-liveness] absent past threshold, re-granting (${tag})`,
                );
                break;
            case 'failed':
                this.logger.warn(
                    `[grant-liveness] tx ${probe.status}, re-granting (${tag})`,
                );
                break;
        }
        let txId: string;
        try {
            ({ txId } = await this.midnightService.grantEligibility(
                existing.leaf,
            ));
        } catch (e) {
            this.logger.error(
                `[grant-liveness] replacement grant failed (${tag}): ${(e as Error)?.message ?? e}`,
            );
            throw e;
        }
        await this.midnightGrantService.upsert(key, {
            userPk: existing.userPk,
            entryItemHexes: existing.entryItemHexes,
            tournamentDataHash: existing.tournamentDataHash,
            point: existing.point,
            deadline: existing.deadline,
            leaf: existing.leaf,
            txId,
        });
        this.logger.log(
            `[grant-liveness] re-granted (${tag}) new tx=${txId.slice(0, 10)}…`,
        );
        return {
            exists: false,
            deadline: existing.deadline,
            point: existing.point,
            txId,
            segment: null,
        };
    }

    private decodeAndValidateData(tournamentData: string): number[] {
        let entryItemIds: number[];
        try {
            entryItemIds = tournamentDataToUint16Array(
                tournamentData as `0x${string}`,
            );
        } catch {
            throw new BadRequestException('Invalid tournamentData');
        }
        const byteLength = getTournamentDataByteLength(tournamentData);
        if (!isValidBracketByteLength(byteLength)) {
            throw new BadRequestException(
                'tournamentData length must be a power of two between 4 and 2048 bytes',
            );
        }
        if (hasDuplicateIds(entryItemIds)) {
            throw new BadRequestException(
                'tournamentData contains duplicate item ids',
            );
        }
        return entryItemIds;
    }

    private async assertMatchesPlayVerification(
        walletAddress: string,
        tournamentId: number,
        entryItemIds: number[],
    ): Promise<void> {
        const verification = await this.playVerificationService.findOne(
            walletAddress,
            tournamentId,
        );
        const servedIds = verification.itemIds.split('_').map(Number);
        if (entryItemIds.length !== servedIds.length) {
            throw new BadRequestException(
                'Item id count does not match the served items',
            );
        }
        if (!sortedEqual(entryItemIds, servedIds)) {
            throw new BadRequestException(
                'Item ids do not match the served items',
            );
        }
    }

    private async resolvePoint(
        walletAddress: string,
        tournamentId: number,
        itemCount: number,
    ): Promise<number> {
        if (await this.playInfoService.hasPlayInfo(walletAddress, tournamentId))
            return 0;
        const tournament =
            await this.tournamentService.findTypeAndPointById(tournamentId);
        if (tournament?.type === TournamentType.EVENT) {
            if (tournament.point === undefined || tournament.point === null) {
                throw new BadRequestException(
                    'Event tournament has no point configured',
                );
            }
            return tournament.point;
        }
        return itemCount;
    }

    private computeDeadline(): bigint {
        return BigInt(Math.floor(Date.now() / 1000)) + this.grantTtlSeconds;
    }
}

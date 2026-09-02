import {
    BadRequestException,
    ConflictException,
    Injectable,
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
        return this.getMidnightFinalizeGrant(
            chainId,
            walletAddress,
            tournamentId,
            tournamentData,
            userPk,
        );
    }

    private async getMidnightFinalizeGrant(
        chainId: number,
        walletAddress: string,
        tournamentId: number,
        tournamentData: string,
        userPk?: string,
    ): Promise<FinalizeTournamentResDto> {
        if (!userPk) throw new BadRequestException('userPk is required on Midnight');

        const resourceId = `signature:tournament-finalize:user:${walletAddress}`;
        const lockValue = await this.lockService.setWithLock(
            resourceId,
            'midnight finalize grant request',
        );
        try {
            const normalizedData = tournamentData.toLowerCase();
            const entryItemIds = this.decodeAndValidateData(normalizedData);
            await this.assertMatchesPlayVerification(walletAddress, tournamentId, entryItemIds);
            const point = await this.resolvePoint(walletAddress, tournamentId, entryItemIds.length);
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
                return {
                    exists: true,
                    deadline: existing.deadline,
                    point: existing.point,
                    txId: existing.txId,
                    segment: null,
                };
            }
            if (existing?.finalizeTxId) {
                throw new ConflictException('This tournament is already finalized on Midnight');
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

    private decodeAndValidateData(tournamentData: string): number[] {
        let entryItemIds: number[];
        try {
            entryItemIds = tournamentDataToUint16Array(tournamentData as `0x${string}`);
        } catch {
            throw new BadRequestException('Invalid tournamentData');
        }
        const byteLength = getTournamentDataByteLength(tournamentData);
        if (!isValidBracketByteLength(byteLength)) {
            throw new BadRequestException('tournamentData length must be a power of two between 4 and 2048 bytes');
        }
        if (hasDuplicateIds(entryItemIds)) {
            throw new BadRequestException('tournamentData contains duplicate item ids');
        }
        return entryItemIds;
    }

    private async assertMatchesPlayVerification(
        walletAddress: string,
        tournamentId: number,
        entryItemIds: number[],
    ): Promise<void> {
        const verification = await this.playVerificationService.findOne(walletAddress, tournamentId);
        const servedIds = verification.itemIds.split('_').map(Number);
        if (entryItemIds.length !== servedIds.length) {
            throw new BadRequestException('Item id count does not match the served items');
        }
        if (!sortedEqual(entryItemIds, servedIds)) {
            throw new BadRequestException('Item ids do not match the served items');
        }
    }

    private async resolvePoint(walletAddress: string, tournamentId: number, itemCount: number): Promise<number> {
        if (await this.playInfoService.hasPlayInfo(walletAddress, tournamentId)) return 0;
        const tournament = await this.tournamentService.findTypeAndPointById(tournamentId);
        if (tournament?.type === TournamentType.EVENT) {
            if (tournament.point === undefined || tournament.point === null) {
                throw new BadRequestException('Event tournament has no point configured');
            }
            return tournament.point;
        }
        return itemCount;
    }

    private computeDeadline(): bigint {
        return BigInt(Math.floor(Date.now() / 1000)) + this.grantTtlSeconds;
    }
}

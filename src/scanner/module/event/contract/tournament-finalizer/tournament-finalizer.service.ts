import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { TournamentFinalizedEvent } from './event/tournament-finalized.event';
import { ethers } from 'ethers';
import { TypeEventLog } from 'src/scanner/util/type-event-log.util';
import { ItemService } from '../../domain/item/item.service';
import { MatchService } from '../../domain/match/match.service';
import { PlayInfoService } from '../../domain/play-info/play-info.service';
import { TournamentService } from '../../domain/tournament/tournament.service';
import { UserService } from '../../domain/user/user.service';
import { tournamentDataToUint16Array } from 'src/util/hex-conversion.util';
import { extractMatchStats } from './tournament-finalizer.util';
import { toDate } from 'src/scanner/util/timestamp.util';

@Injectable()
export class TournamentFinalizerService {
    private readonly logger = new Logger(TournamentFinalizerService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly tournamentService: TournamentService,
        private readonly playInfoService: PlayInfoService,
        private readonly matchService: MatchService,
        private readonly itemService: ItemService,
        private readonly userService: UserService,
    ) {}

    public async handleTournamentFinalized(
        tournamentFinalizedEvent: TournamentFinalizedEvent,
        log: ethers.Log,
        chainId: number,
    ): Promise<void> {
        const {
            transactionHash: txHash,
            blockNumber,
            blockHash,
            index: logIndex,
        } = log;

        const {
            timestamp,
            user,
            tournamentDataHash,
            tournamentId,
            tournamentData: entryItemHexes,
            point,
        } = tournamentFinalizedEvent;

        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => {
                const buf = Buffer.from(entryItemHexes.slice(2), 'hex');
                const totalCount = buf.length / 2;

                const firstItemId = buf.readUInt16BE(0);
                const secondItemId = buf.readUInt16BE((totalCount / 2) * 2);

                const upserted = await this.playInfoService.upsert(
                    {
                        chainId,
                        txHash,
                        logIndex,
                    },
                    {
                        user,
                        tournamentId,
                        firstItemId,
                        secondItemId,
                        entryItemHexes,
                        tournamentDataHash,
                        blockNumber,
                        blockHash,
                        point,
                        createdAt: toDate(timestamp),
                    },
                    session,
                );

                if (!upserted) return;

                await this.userService.incrementPoint(user, point, session);

                await this.tournamentService.updateTournamentCount(
                    {
                        tournamentId,
                    },
                    {
                        selectedCount: 1,
                    },
                    session,
                );

                const entryItemIds: number[] = tournamentDataToUint16Array(
                    entryItemHexes as `0x${string}`,
                );
                const { itemUpdates, matchUpdates } = extractMatchStats(
                    entryItemIds,
                    tournamentId,
                    firstItemId,
                    secondItemId,
                    1,
                );

                await this.itemService.updateBulkItem(itemUpdates, session);
                await this.matchService.updateBulkMatch(matchUpdates, session);

                this.logger
                    .log(`TournamentFinalizer: TournamentFinalized event processed
                (user: ${user}, tournamentDataHash: ${tournamentDataHash}), tournamentId: ${tournamentId}, tournamentData: ${entryItemHexes})
                (txHash: ${txHash}, blockNumber: ${blockNumber}))`);
            });
        } finally {
            await session.endSession();
        }
    }

    public async rollbackTournamentFinalized(
        tournamentFinalizedEvent: TournamentFinalizedEvent,
        log: TypeEventLog,
        chainId: number,
    ): Promise<void> {
        const { txHash, blockNumber, logIndex } = log;

        const {
            user,
            tournamentDataHash,
            tournamentId,
            tournamentData: entryItemHexes,
            point,
        } = tournamentFinalizedEvent;

        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => {
                const result = await this.playInfoService.deletePlayInfo(
                    {
                        chainId,
                        txHash,
                        logIndex,
                    },
                    session,
                );

                if (result.deletedCount === 0) return;

                await this.userService.incrementPoint(user, -point, session);

                await this.tournamentService.updateTournamentCount(
                    {
                        tournamentId,
                    },
                    {
                        selectedCount: -1,
                    },
                    session,
                );

                const buf = Buffer.from(entryItemHexes.slice(2), 'hex');
                const totalCount = buf.length / 2;

                const firstItemId = buf.readUInt16BE(0);
                const secondItemId = buf.readUInt16BE((totalCount / 2) * 2);

                const entryItemIds: number[] = tournamentDataToUint16Array(
                    entryItemHexes as `0x${string}`,
                );
                const { itemUpdates, matchUpdates } = extractMatchStats(
                    entryItemIds,
                    tournamentId,
                    firstItemId,
                    secondItemId,
                    -1,
                );

                await this.itemService.updateBulkItem(itemUpdates, session);
                await this.matchService.updateBulkMatch(matchUpdates, session);

                this.logger
                    .log(`TournamentFinalizer: TournamentFinalized event rolled back
                (user: ${user}, tournamentDataHash: ${tournamentDataHash}), tournamentId: ${tournamentId}, tournamentData: ${entryItemHexes})
                (txHash: ${txHash}, blockNumber: ${blockNumber}))`);
            });
        } finally {
            await session.endSession();
        }
    }
}

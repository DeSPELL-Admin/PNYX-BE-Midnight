import { ethers } from 'ethers';
import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';

import {
    PlayInfo,
    PlayInfoDocument,
    PlayInfoSchema,
} from 'src/schema/domain/event/play-info.schema';
import {
    Tournament,
    TournamentDocument,
    TournamentSchema,
} from 'src/schema/domain/event/tournament.schema';
import {
    Item,
    ItemDocument,
    ItemSchema,
} from 'src/schema/domain/event/item.schema';
import {
    Match,
    MatchDocument,
    MatchSchema,
} from 'src/schema/domain/event/match.schema';
import {
    User,
    UserDocument,
    UserSchema,
} from 'src/schema/domain/event/user.schema';

import { PlayInfoRepository } from './../../domain/play-info/play-info.repository';
import { TournamentRepository } from './../../domain/tournament/tournament.repository';
import { ItemRepository } from './../../domain/item/item.repository';
import { MatchRepository } from './../../domain/match/match.repository';
import { UserRepository } from './../../domain/user/user.repository';
import { PlayInfoService } from './../../domain/play-info/play-info.service';
import { TournamentService } from './../../domain/tournament/tournament.service';
import { ItemService } from './../../domain/item/item.service';
import { MatchService } from './../../domain/match/match.service';
import { UserService } from './../../domain/user/user.service';
import { TournamentFinalizerService } from './tournament-finalizer.service';
import { TournamentFinalizedEvent } from './event/tournament-finalized.event';
import { TypeEventLog } from 'src/scanner/util/type-event-log.util';

// ---- Fixed input vector (4-item bracket) --------------------------------
// entryItemIds = [10, 20, 30, 40] -> hex 0x000a0014001e0028
// firstItemId  = readUInt16BE(0)          = 10
// secondItemId = readUInt16BE((4/2)*2 = 4) = 30
const CHAIN_ID = 9999;
const TOURNAMENT_ID = 1;
const ENTRY_HEXES = '0x000a0014001e0028';
const USER = '0x000000000000000000000000000000000000beef';
const TIMESTAMP = 1_700_000_000;
const POINT = 16;
const TX_HASH =
    '0x1111111111111111111111111111111111111111111111111111111111111111';
const BLOCK_HASH =
    '0x2222222222222222222222222222222222222222222222222222222222222222';
const BLOCK_NUMBER = 100;
const ENTRY_ITEM_IDS = [10, 20, 30, 40];

const EVENT: TournamentFinalizedEvent = {
    timestamp: TIMESTAMP,
    user: USER,
    tournamentDataHash:
        '0x3333333333333333333333333333333333333333333333333333333333333333',
    tournamentId: TOURNAMENT_ID,
    tournamentData: ENTRY_HEXES,
    point: POINT,
};

function makeLog(logIndex: number, txHash = TX_HASH): ethers.Log {
    return {
        transactionHash: txHash,
        blockNumber: BLOCK_NUMBER,
        blockHash: BLOCK_HASH,
        index: logIndex,
    } as unknown as ethers.Log;
}

function makeEventLog(logIndex: number, txHash = TX_HASH): TypeEventLog {
    return {
        blockNumber: BLOCK_NUMBER,
        blockHash: BLOCK_HASH,
        logIndex,
        txHash,
        contractAddress: '0x000000000000000000000000000000000000cafe',
        topics: ['0x00'],
        data: '0x',
        chainId: CHAIN_ID,
    };
}

describe('TournamentFinalizerService (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;

    let playInfoModel: Model<PlayInfoDocument>;
    let tournamentModel: Model<TournamentDocument>;
    let itemModel: Model<ItemDocument>;
    let matchModel: Model<MatchDocument>;
    let userModel: Model<UserDocument>;

    let itemRepo: ItemRepository;
    let service: TournamentFinalizerService;

    beforeAll(async () => {
        mem = await startTestMongo();
        connection = mem.connection;

        // Register untyped then cast: passing the Document generic to
        // connection.model() trips Mongoose's schema-type inference.
        playInfoModel = connection.model(
            PlayInfo.name,
            PlayInfoSchema,
        ) as unknown as Model<PlayInfoDocument>;
        tournamentModel = connection.model(
            Tournament.name,
            TournamentSchema,
        ) as unknown as Model<TournamentDocument>;
        itemModel = connection.model(
            Item.name,
            ItemSchema,
        ) as unknown as Model<ItemDocument>;
        matchModel = connection.model(
            Match.name,
            MatchSchema,
        ) as unknown as Model<MatchDocument>;
        userModel = connection.model(
            User.name,
            UserSchema,
        ) as unknown as Model<UserDocument>;

        await Promise.all([
            playInfoModel.syncIndexes(),
            tournamentModel.syncIndexes(),
            itemModel.syncIndexes(),
            matchModel.syncIndexes(),
            userModel.syncIndexes(),
        ]);

        itemRepo = new ItemRepository(itemModel);
        service = new TournamentFinalizerService(
            connection,
            new TournamentService(new TournamentRepository(tournamentModel)),
            new PlayInfoService(new PlayInfoRepository(playInfoModel)),
            new MatchService(new MatchRepository(matchModel)),
            new ItemService(itemRepo),
            new UserService(new UserRepository(userModel)),
        );
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        jest.restoreAllMocks();
        await Promise.all([
            playInfoModel.deleteMany({}),
            tournamentModel.deleteMany({}),
            itemModel.deleteMany({}),
            matchModel.deleteMany({}),
            userModel.deleteMany({}),
        ]);
        // Tournament & Item updates use updateOne WITHOUT upsert -> seed them.
        await tournamentModel.create({
            category: 'cat',
            tournamentId: TOURNAMENT_ID,
            title: 'T',
            selectedCount: 0,
        });
        // User point uses $inc WITHOUT upsert -> seed the wallet at 0.
        await userModel.create({ walletAddress: USER, point: 0 });
        await itemModel.create(
            ENTRY_ITEM_IDS.map((itemId) => ({
                tournamentId: TOURNAMENT_ID,
                itemId,
                name: `item-${itemId}`,
                imageName: `img-${itemId}`,
            })),
        );
    });

    const itemBy = async (itemId: number) =>
        itemModel.findOne({ tournamentId: TOURNAMENT_ID, itemId }).lean();

    const userPoint = async (): Promise<number | undefined> =>
        (await userModel.findOne({ walletAddress: USER }).lean())?.point;

    it('forward: applies exact counts to PlayInfo / Tournament / Item / Match', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);

        // PlayInfo: exactly one doc, with logIndex preserved.
        const plays = await playInfoModel.find({ chainId: CHAIN_ID }).lean();
        expect(plays).toHaveLength(1);
        expect(plays[0]).toMatchObject({
            user: USER,
            tournamentId: TOURNAMENT_ID,
            firstItemId: 10,
            secondItemId: 30,
            txHash: TX_HASH,
            logIndex: 0,
            point: POINT,
        });
        // createdAt is the block.timestamp carried by the event.
        expect(plays[0].createdAt.getTime()).toBe(TIMESTAMP * 1000);

        // User point credited exactly once.
        expect(await userPoint()).toBe(POINT);

        // Tournament selectedCount +1.
        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(1);

        // Items: exact derived counts.
        expect(await itemBy(10)).toMatchObject({
            firstCount: 1,
            secondCount: 0,
            wins: 2,
            tournamentEntries: 1,
            totalMatchEntries: 2,
        });
        expect(await itemBy(20)).toMatchObject({
            firstCount: 0,
            secondCount: 0,
            wins: 0,
            tournamentEntries: 1,
            totalMatchEntries: 1,
        });
        expect(await itemBy(30)).toMatchObject({
            firstCount: 0,
            secondCount: 1,
            wins: 1,
            tournamentEntries: 1,
            totalMatchEntries: 2,
        });
        expect(await itemBy(40)).toMatchObject({
            firstCount: 0,
            secondCount: 0,
            wins: 0,
            tournamentEntries: 1,
            totalMatchEntries: 1,
        });

        // Matches: 3 bracket matches, each with totalMatches 1 / lowWins 1.
        const matches = await matchModel
            .find({})
            .sort({ itemLowId: 1, itemHighId: 1 })
            .lean();
        expect(
            matches.map((m) => ({
                low: m.itemLowId,
                high: m.itemHighId,
                lowWins: m.lowWins,
                highWins: m.highWins,
                totalMatches: m.totalMatches,
            })),
        ).toEqual([
            { low: 10, high: 20, lowWins: 1, highWins: 0, totalMatches: 1 },
            { low: 10, high: 30, lowWins: 1, highWins: 0, totalMatches: 1 },
            { low: 30, high: 40, lowWins: 1, highWins: 0, totalMatches: 1 },
        ]);
    });

    it('idempotency: reprocessing the same log does not double-count', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);

        expect(await playInfoModel.countDocuments({ chainId: CHAIN_ID })).toBe(
            1,
        );
        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(1);
        // item 10 wins stays at 2 (not 4).
        expect((await itemBy(10))?.wins).toBe(2);
        // point credited once, not twice.
        expect(await userPoint()).toBe(POINT);
    });

    it('logIndex granularity: two events in the same tx are both recorded and counted', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);
        await service.handleTournamentFinalized(EVENT, makeLog(1), CHAIN_ID);

        const plays = await playInfoModel
            .find({ chainId: CHAIN_ID, txHash: TX_HASH })
            .sort({ logIndex: 1 })
            .lean();
        expect(plays.map((p) => p.logIndex)).toEqual([0, 1]);

        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(2);
        // counts applied twice.
        expect((await itemBy(10))?.wins).toBe(4);
        expect((await itemBy(10))?.tournamentEntries).toBe(2);
        // point credited once per distinct logIndex.
        expect(await userPoint()).toBe(POINT * 2);
    });

    it('atomicity: a failure mid-transaction rolls back ALL prior writes', async () => {
        // updateBulkItem runs AFTER playInfo upsert + tournament increment.
        jest.spyOn(itemRepo, 'updateBulkItem').mockRejectedValueOnce(
            new Error('boom'),
        );

        await expect(
            service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID),
        ).rejects.toThrow('boom');

        // Nothing from the aborted transaction must persist.
        expect(await playInfoModel.countDocuments({ chainId: CHAIN_ID })).toBe(
            0,
        );
        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(0);
        expect(await matchModel.countDocuments({})).toBe(0);
        // user point increment is part of the aborted transaction.
        expect(await userPoint()).toBe(0);
    });

    it('rollback: reverses a finalized event back to baseline', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);
        await service.rollbackTournamentFinalized(
            EVENT,
            makeEventLog(0),
            CHAIN_ID,
        );

        expect(await playInfoModel.countDocuments({ chainId: CHAIN_ID })).toBe(
            0,
        );
        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(0);
        expect(await itemBy(10)).toMatchObject({
            firstCount: 0,
            secondCount: 0,
            wins: 0,
            tournamentEntries: 0,
            totalMatchEntries: 0,
        });
        // Match docs were upserted on forward then decremented to 0 on rollback.
        const matches = await matchModel.find({}).lean();
        expect(matches.every((m) => m.totalMatches === 0)).toBe(true);
        // credited point reversed back to baseline.
        expect(await userPoint()).toBe(0);
    });

    it('rollback idempotency: a second rollback is a no-op (no negative counts)', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);
        await service.rollbackTournamentFinalized(
            EVENT,
            makeEventLog(0),
            CHAIN_ID,
        );
        await service.rollbackTournamentFinalized(
            EVENT,
            makeEventLog(0),
            CHAIN_ID,
        );

        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(0);
        // not -1.
        expect((await itemBy(10))?.wins).toBe(0);
    });

    it('rollback granularity: rolling back one logIndex leaves the other intact', async () => {
        await service.handleTournamentFinalized(EVENT, makeLog(0), CHAIN_ID);
        await service.handleTournamentFinalized(EVENT, makeLog(1), CHAIN_ID);

        await service.rollbackTournamentFinalized(
            EVENT,
            makeEventLog(0),
            CHAIN_ID,
        );

        const plays = await playInfoModel
            .find({ chainId: CHAIN_ID, txHash: TX_HASH })
            .lean();
        expect(plays).toHaveLength(1);
        expect(plays[0].logIndex).toBe(1);

        // counts decremented exactly once (from 2x back to 1x).
        const tournament = await tournamentModel
            .findOne({ tournamentId: TOURNAMENT_ID })
            .lean();
        expect(tournament?.selectedCount).toBe(1);
        expect((await itemBy(10))?.wins).toBe(2);
        expect((await itemBy(10))?.tournamentEntries).toBe(1);
    });
});

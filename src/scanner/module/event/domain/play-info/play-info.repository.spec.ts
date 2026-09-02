import { ClientSession, Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    PlayInfo,
    PlayInfoDocument,
    PlayInfoSchema,
} from 'src/schema/domain/event/play-info.schema';
import { PlayInfoRepository } from './play-info.repository';

const CHAIN = 7103;
const TX = '0x' + 'ab'.repeat(32);
const CREATED_AT = new Date('2026-01-02T03:04:05.000Z');

const upsertData = (over: Record<string, unknown> = {}) => ({
    user: '0x' + 'cd'.repeat(20),
    tournamentId: 1,
    firstItemId: 1,
    secondItemId: 2,
    entryItemHexes: '0x00',
    tournamentDataHash: '0xhash',
    blockNumber: 1,
    blockHash: '0x' + 'ef'.repeat(32),
    point: 16,
    createdAt: CREATED_AT,
    ...over,
});

describe('Scanner PlayInfoRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<PlayInfoDocument>;
    let repo: PlayInfoRepository;
    let session: ClientSession;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_scanner_play_info' });
        connection = mem.connection;
        model = registerModel<PlayInfoDocument>(
            connection,
            PlayInfo.name,
            PlayInfoSchema,
        );
        await model.syncIndexes();
        repo = new PlayInfoRepository(model);
        session = await connection.startSession();
    }, 60000);

    afterAll(async () => {
        await session.endSession();
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    const key = { chainId: CHAIN, txHash: TX, logIndex: 0 };

    it('reports upsertedCount 1 on insert and 0 when the doc already exists', async () => {
        expect(
            (await repo.upsert(key, upsertData(), session)).upsertedCount,
        ).toBe(1);
        expect(
            (await repo.upsert(key, upsertData(), session)).upsertedCount,
        ).toBe(0);
        expect(await model.countDocuments(key)).toBe(1);
    });

    it('persists point and createdAt on insert', async () => {
        await repo.upsert(key, upsertData({ point: 64 }), session);
        const doc = (await model.findOne(key).lean()) as {
            point: number;
            createdAt: Date;
        };
        expect(doc.point).toBe(64);
        expect(doc.createdAt.getTime()).toBe(CREATED_AT.getTime());
    });

    it('keeps the original createdAt on re-upsert ($setOnInsert)', async () => {
        await repo.upsert(key, upsertData(), session);
        const later = new Date(CREATED_AT.getTime() + 60_000);
        await repo.upsert(
            key,
            upsertData({ point: 32, createdAt: later }),
            session,
        );
        const doc = (await model.findOne(key).lean()) as {
            point: number;
            createdAt: Date;
        };
        expect(doc.createdAt.getTime()).toBe(CREATED_AT.getTime());
    });

    it('does not modify an existing doc on re-upsert ($setOnInsert keeps original)', async () => {
        await repo.upsert(key, upsertData({ tournamentId: 1 }), session);
        const second = await repo.upsert(
            key,
            upsertData({ tournamentId: 42 }),
            session,
        );
        expect(second.upsertedCount).toBe(0);
        const doc = (await model.findOne(key).lean()) as {
            tournamentId: number;
        };
        expect(doc.tournamentId).toBe(1);
    });

    it('deletePlayInfo returns deletedCount 1 then 0 on repeat', async () => {
        await repo.upsert(key, upsertData(), session);
        const first = await repo.deletePlayInfo(key, session);
        const second = await repo.deletePlayInfo(key, session);
        expect(first.deletedCount).toBe(1);
        expect(second.deletedCount).toBe(0);
    });
});

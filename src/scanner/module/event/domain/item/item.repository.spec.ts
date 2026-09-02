import { ClientSession, Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    Item,
    ItemDocument,
    ItemSchema,
} from 'src/schema/domain/event/item.schema';
import { ItemUpdate } from '../../contract/tournament-finalizer/tournament-finalizer.util';
import { ItemRepository } from './item.repository';

const TID = 1;

const update = (
    over: Partial<ItemUpdate> & { itemId: number },
): ItemUpdate => ({
    tournamentId: TID,
    firstCount: 0,
    secondCount: 0,
    wins: 0,
    tournamentEntries: 0,
    totalMatchEntries: 0,
    ...over,
});

describe('Scanner ItemRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<ItemDocument>;
    let repo: ItemRepository;
    let session: ClientSession;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_scanner_item' });
        connection = mem.connection;
        model = registerModel<ItemDocument>(connection, Item.name, ItemSchema);
        await model.syncIndexes();
        repo = new ItemRepository(model);
        session = await connection.startSession();
    }, 60000);

    afterAll(async () => {
        await session.endSession();
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    const seedItem = (itemId: number, counts: Partial<ItemUpdate> = {}) =>
        model.create({
            tournamentId: TID,
            itemId,
            name: `n-${itemId}`,
            imageName: `img-${itemId}`,
            firstCount: 0,
            secondCount: 0,
            wins: 0,
            tournamentEntries: 0,
            totalMatchEntries: 0,
            ...counts,
        });

    it('is a silent no-op when the target item does not exist ($inc without upsert)', async () => {
        await repo.updateBulkItem([update({ itemId: 1, wins: 1 })], session);
        expect(await model.countDocuments({})).toBe(0);
    });

    it('increments existing items by exact positive and negative deltas', async () => {
        await seedItem(1, { wins: 10, firstCount: 2 });
        await repo.updateBulkItem(
            [update({ itemId: 1, wins: 3, firstCount: -1 })],
            session,
        );
        const doc = (await model.findOne({ itemId: 1 }).lean()) as {
            wins: number;
            firstCount: number;
        };
        expect(doc.wins).toBe(13);
        expect(doc.firstCount).toBe(1);
    });

    it('applies all updates across internal chunks (load)', async () => {
        const ids = Array.from({ length: 1024 }, (_, i) => i);
        await model.insertMany(
            ids.map((itemId) => ({
                tournamentId: TID,
                itemId,
                name: `n-${itemId}`,
                imageName: `img-${itemId}`,
                firstCount: 0,
                secondCount: 0,
                wins: 0,
                tournamentEntries: 0,
                totalMatchEntries: 0,
            })),
        );
        await repo.updateBulkItem(
            ids.map((itemId) => update({ itemId, wins: 1 })),
            session,
        );
        expect(await model.countDocuments({ wins: 1 })).toBe(1024);
    }, 30000);

    it('is a no-op for an empty array', async () => {
        await repo.updateBulkItem([], session);
        expect(await model.countDocuments({})).toBe(0);
    });
});

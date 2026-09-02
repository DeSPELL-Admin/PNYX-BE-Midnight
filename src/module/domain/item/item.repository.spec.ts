import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    Item,
    ItemDocument,
    ItemSchema,
} from 'src/schema/domain/event/item.schema';
import { ItemRepository } from './item.repository';

const TID = 7;

const item = (over: Record<string, unknown>) => ({
    tournamentId: TID,
    name: `n-${over.itemId}`,
    imageName: `img-${over.itemId}`,
    firstCount: 0,
    secondCount: 0,
    wins: 0,
    tournamentEntries: 0,
    totalMatchEntries: 0,
    ...over,
});

describe('ItemRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<ItemDocument>;
    let repo: ItemRepository;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_item_repo' });
        connection = mem.connection;
        model = registerModel<ItemDocument>(connection, Item.name, ItemSchema);
        await model.syncIndexes();
        repo = new ItemRepository(model);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    describe('getItemCountByTournamentId', () => {
        it('counts only the matching tournament', async () => {
            await model.create([
                item({ itemId: 1 }),
                item({ itemId: 2 }),
                item({ itemId: 3 }),
                item({ itemId: 4, tournamentId: 99 }),
            ]);
            expect(await repo.getItemCountByTournamentId(TID)).toBe(3);
        });

        it('returns 0 when empty', async () => {
            expect(await repo.getItemCountByTournamentId(TID)).toBe(0);
        });
    });

    describe('getItemByTournamentIdItemId', () => {
        it('projects name and imageName for a match', async () => {
            await model.create(item({ itemId: 1 }));
            expect(await repo.getItemByTournamentIdItemId(TID, 1)).toEqual({
                name: 'n-1',
                imageName: 'img-1',
            });
        });

        it('returns null for a missing itemId or wrong tournament', async () => {
            await model.create(item({ itemId: 1 }));
            expect(await repo.getItemByTournamentIdItemId(TID, 999)).toBeNull();
            expect(await repo.getItemByTournamentIdItemId(999, 1)).toBeNull();
        });
    });

    describe('findItemStatisticsByTournamentId', () => {
        const seed = () =>
            model.create([
                item({
                    itemId: 1,
                    firstCount: 1,
                    tournamentEntries: 4,
                    wins: 1,
                    totalMatchEntries: 2,
                }),
                item({
                    itemId: 2,
                    firstCount: 2,
                    tournamentEntries: 4,
                    wins: 8,
                    totalMatchEntries: 10,
                }),
                item({
                    itemId: 3,
                    firstCount: 2,
                    tournamentEntries: 4,
                    wins: 2,
                    totalMatchEntries: 10,
                }),
                item({
                    itemId: 4,
                    firstCount: 0,
                    tournamentEntries: 0,
                    wins: 0,
                    totalMatchEntries: 0,
                }),
            ]);

        it('computes exact firstRate and winRate', async () => {
            await seed();
            const rows = await repo.findItemStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.find((r) => r.itemId === 1)).toEqual({
                itemId: 1,
                name: 'n-1',
                imageName: 'img-1',
                firstRate: 0.25,
                winRate: 0.5,
            });
        });

        it('returns 0 rates for zero denominators ($cond branch)', async () => {
            await seed();
            const rows = await repo.findItemStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.find((r) => r.itemId === 4)).toMatchObject({
                firstRate: 0,
                winRate: 0,
            });
        });

        it('orders by firstRate desc then winRate desc', async () => {
            await seed();
            const rows = await repo.findItemStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.map((r) => r.itemId)).toEqual([2, 3, 1, 4]);
        });

        it('paginates', async () => {
            await seed();
            const page1 = await repo.findItemStatisticsByTournamentId(
                TID,
                1,
                2,
            );
            const page2 = await repo.findItemStatisticsByTournamentId(
                TID,
                2,
                2,
            );
            const page3 = await repo.findItemStatisticsByTournamentId(
                TID,
                3,
                2,
            );
            expect(page1.map((r) => r.itemId)).toEqual([2, 3]);
            expect(page2.map((r) => r.itemId)).toEqual([1, 4]);
            expect(page3).toEqual([]);
        });

        it('breaks firstRate/winRate ties by createdAt desc', async () => {
            const base = new Date('2026-01-01T00:00:00.000Z');
            // identical rates (firstRate 0.5, winRate 0.5); item 11 created later
            await model.collection.insertMany([
                {
                    ...item({
                        itemId: 10,
                        firstCount: 1,
                        tournamentEntries: 2,
                        wins: 1,
                        totalMatchEntries: 2,
                    }),
                    createdAt: base,
                    updatedAt: base,
                },
                {
                    ...item({
                        itemId: 11,
                        firstCount: 1,
                        tournamentEntries: 2,
                        wins: 1,
                        totalMatchEntries: 2,
                    }),
                    createdAt: new Date(base.getTime() + 1000),
                    updatedAt: base,
                },
            ]);
            const rows = await repo.findItemStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.map((r) => r.itemId)).toEqual([11, 10]);
        });

        it('orders a large data set by firstRate', async () => {
            const docs = Array.from({ length: 1000 }, (_, i) =>
                item({ itemId: i, firstCount: i, tournamentEntries: 1000 }),
            );
            await model.insertMany(docs);
            const page = await repo.findItemStatisticsByTournamentId(
                TID,
                10,
                50,
            );
            expect(page).toHaveLength(50);
            expect(page[0].itemId).toBe(549);
            expect(page[49].itemId).toBe(500);
            expect(await repo.getItemCountByTournamentId(TID)).toBe(1000);
        }, 30000);
    });

    describe('findItemBettingStatisticsByTournamentId', () => {
        it('orders by totalBetAmount numerically, not lexicographically, with missing treated as 0', async () => {
            await model.create([
                item({ itemId: 1, totalBetAmount: '9' }),
                item({ itemId: 2, totalBetAmount: '100' }),
                item({ itemId: 3, totalBetAmount: '1000000000000000000' }),
                item({ itemId: 4 }), // no totalBetAmount -> sorts as 0
            ]);
            const rows = await repo.findItemBettingStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            // lexicographic order would be ['9','1000...','100'] -> wrong;
            // numeric order is 1e18 > 100 > 9 > 0.
            expect(rows.map((r) => r.itemId)).toEqual([3, 2, 1, 4]);
        });

        it('returns the original string and "0" for a missing amount', async () => {
            await model.create([
                item({ itemId: 1, totalBetAmount: '1000000000000000000' }),
                item({ itemId: 4 }),
            ]);
            const rows = await repo.findItemBettingStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.find((r) => r.itemId === 1)).toEqual({
                itemId: 1,
                name: 'n-1',
                imageName: 'img-1',
                totalBetAmount: '1000000000000000000',
            });
            expect(rows.find((r) => r.itemId === 4)?.totalBetAmount).toBe('0');
        });

        it('paginates in bet-amount descending order', async () => {
            await model.create([
                item({ itemId: 1, totalBetAmount: '10' }),
                item({ itemId: 2, totalBetAmount: '40' }),
                item({ itemId: 3, totalBetAmount: '30' }),
                item({ itemId: 4, totalBetAmount: '20' }),
            ]);
            const page1 = await repo.findItemBettingStatisticsByTournamentId(
                TID,
                1,
                2,
            );
            const page2 = await repo.findItemBettingStatisticsByTournamentId(
                TID,
                2,
                2,
            );
            expect(page1.map((r) => r.itemId)).toEqual([2, 3]);
            expect(page2.map((r) => r.itemId)).toEqual([4, 1]);
        });

        it('scopes to the given tournament only', async () => {
            await model.create([
                item({ itemId: 1, totalBetAmount: '5' }),
                item({ itemId: 2, tournamentId: 99, totalBetAmount: '1000' }),
            ]);
            const rows = await repo.findItemBettingStatisticsByTournamentId(
                TID,
                1,
                10,
            );
            expect(rows.map((r) => r.itemId)).toEqual([1]);
        });
    });
});

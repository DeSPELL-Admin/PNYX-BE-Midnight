import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    Match,
    MatchDocument,
    MatchSchema,
} from 'src/schema/domain/event/match.schema';
import {
    Item,
    ItemDocument,
    ItemSchema,
} from 'src/schema/domain/event/item.schema';
import { MatchRepository } from './match.repository';

const TID = 7;
const ITEM = 5;
const base = new Date('2026-01-01T00:00:00.000Z');

const itemDoc = (over: Record<string, unknown>) => ({
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

describe('MatchRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let matchModel: Model<MatchDocument>;
    let itemModel: Model<ItemDocument>;
    let repo: MatchRepository;

    const insertMatches = (
        docs: Array<Record<string, unknown>>,
    ): Promise<unknown> =>
        matchModel.collection.insertMany(
            docs.map((d) => ({
                tournamentId: TID,
                lowWins: 0,
                highWins: 0,
                totalMatches: 0,
                createdAt: base,
                updatedAt: base,
                ...d,
            })),
        );

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_match_repo' });
        connection = mem.connection;
        matchModel = registerModel<MatchDocument>(
            connection,
            Match.name,
            MatchSchema,
        );
        itemModel = registerModel<ItemDocument>(
            connection,
            Item.name,
            ItemSchema,
        );
        await matchModel.syncIndexes();
        await itemModel.syncIndexes();
        repo = new MatchRepository(matchModel);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await Promise.all([
            matchModel.deleteMany({}),
            itemModel.deleteMany({}),
        ]);
    });

    const seedScenario = async () => {
        await insertMatches([
            {
                itemLowId: 5,
                itemHighId: 9,
                lowWins: 3,
                highWins: 1,
                totalMatches: 4,
                createdAt: base,
            },
            {
                itemLowId: 2,
                itemHighId: 5,
                lowWins: 1,
                highWins: 3,
                totalMatches: 4,
                createdAt: new Date(base.getTime() + 2000),
            },
            {
                itemLowId: 5,
                itemHighId: 8,
                lowWins: 0,
                highWins: 0,
                totalMatches: 0,
                createdAt: new Date(base.getTime() + 1000),
            },
            { itemLowId: 1, itemHighId: 2, totalMatches: 1 },
        ]);
        await itemModel.create([
            itemDoc({ itemId: 9, name: 'nine', imageName: 'img9' }),
            itemDoc({ itemId: 2, name: 'two', imageName: 'img2' }),
        ]);
    };

    it('resolves the opponent and winRate from either side via $cond', async () => {
        await seedScenario();
        const rows = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            1,
            10,
        );
        const byOpp = new Map(rows.map((r) => [r.opponentItemId, r.winRate]));
        expect(byOpp.get(9)).toBe(0.75);
        expect(byOpp.get(2)).toBe(0.75);
    });

    it('returns winRate 0 when totalMatches is 0', async () => {
        await seedScenario();
        const rows = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            1,
            10,
        );
        expect(rows.find((r) => r.opponentItemId === 8)?.winRate).toBe(0);
    });

    it('enriches with the opponent item name and image', async () => {
        await seedScenario();
        const rows = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            1,
            10,
        );
        const row = rows.find((r) => r.opponentItemId === 9);
        expect(row?.opponentItemName).toBe('nine');
        expect(row?.opponentItemImageName).toBe('img9');
    });

    it('keeps the row but omits enrichment for a missing opponent item', async () => {
        await seedScenario();
        const rows = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            1,
            10,
        );
        const row = rows.find((r) => r.opponentItemId === 8);
        expect(row).toBeDefined();
        expect(row).not.toHaveProperty('opponentItemName');
    });

    it('orders by winRate desc then createdAt desc', async () => {
        await seedScenario();
        const rows = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            1,
            10,
        );
        expect(rows.map((r) => r.opponentItemId)).toEqual([2, 9, 8]);
    });

    it('filters out other items; counts only matches involving the item', async () => {
        await seedScenario();
        expect(
            await repo.countItemDetailStatisticsByTournamentIdItemId(TID, ITEM),
        ).toBe(3);
        expect(
            await repo.countItemDetailStatisticsByTournamentIdItemId(TID, 999),
        ).toBe(0);
        expect(
            await repo.findItemDetailStatisticsByTournamentIdItemId(
                TID,
                777,
                1,
                10,
            ),
        ).toEqual([]);
    });

    it('paginates', async () => {
        await seedScenario();
        const page2 = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            2,
            2,
        );
        expect(page2.map((r) => r.opponentItemId)).toEqual([8]);
    });

    it('orders a large data set by winRate', async () => {
        const docs = Array.from({ length: 1000 }, (_, k) => ({
            itemLowId: 5,
            itemHighId: 10 + k,
            lowWins: k,
            highWins: 0,
            totalMatches: 1000,
            createdAt: base,
            updatedAt: base,
        }));
        await insertMatches(docs);
        const page = await repo.findItemDetailStatisticsByTournamentIdItemId(
            TID,
            ITEM,
            5,
            50,
        );
        expect(page).toHaveLength(50);
        expect(page[0].opponentItemId).toBe(809);
        expect(page[49].opponentItemId).toBe(760);
        expect(
            await repo.countItemDetailStatisticsByTournamentIdItemId(TID, ITEM),
        ).toBe(1000);
    }, 30000);

    it('returns identical results under concurrent reads', async () => {
        await seedScenario();
        const results = await Promise.all(
            Array.from({ length: 20 }, () =>
                repo.findItemDetailStatisticsByTournamentIdItemId(
                    TID,
                    ITEM,
                    1,
                    10,
                ),
            ),
        );
        for (const r of results) {
            expect(r.map((x) => x.opponentItemId)).toEqual([2, 9, 8]);
        }
    });
});

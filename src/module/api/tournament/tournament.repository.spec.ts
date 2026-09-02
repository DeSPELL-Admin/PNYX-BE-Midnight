import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
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
import { TournamentRepository } from './tournament.repository';
import { SortTournamentsType } from './tournament.util';
import {
    BettingType,
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

const base = new Date('2026-01-01T00:00:00.000Z');
const D = (days: number) => new Date(base.getTime() + days * 86_400_000);
// repo가 내부에서 new Date()(현재, 2026년대)를 사용하므로, period 분류가
// 결정적이도록 시작/종료 시각을 극단값으로 고정한다(현재는 항상 그 사이).
const PAST = new Date('2000-01-01T00:00:00.000Z');
const FUTURE = new Date('2999-01-01T00:00:00.000Z');
const sortIds = (rows: Array<{ tournamentId: number }>) =>
    rows.map((r) => r.tournamentId).sort((a, b) => a - b);

describe('TournamentRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let tModel: Model<TournamentDocument>;
    let iModel: Model<ItemDocument>;
    let repo: TournamentRepository;

    const insertTournaments = (docs: Array<Record<string, unknown>>) =>
        tModel.collection.insertMany(
            docs.map((d) => ({
                selectedCount: 0,
                type: TournamentType.CLASSIC,
                createdAt: base,
                updatedAt: base,
                ...d,
            })),
        );

    const insertItems = (docs: Array<Record<string, unknown>>) =>
        iModel.collection.insertMany(
            docs.map((d) => ({
                firstCount: 0,
                secondCount: 0,
                wins: 0,
                tournamentEntries: 0,
                totalMatchEntries: 0,
                createdAt: base,
                updatedAt: base,
                ...d,
            })),
        );

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_tournament_repo' });
        connection = mem.connection;
        tModel = registerModel<TournamentDocument>(
            connection,
            Tournament.name,
            TournamentSchema,
        );
        iModel = registerModel<ItemDocument>(connection, Item.name, ItemSchema);
        await tModel.syncIndexes();
        await iModel.syncIndexes();
        repo = new TournamentRepository(tModel);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await Promise.all([tModel.deleteMany({}), iModel.deleteMany({})]);
    });

    const seedBase = async () => {
        await insertTournaments([
            {
                category: 'anime',
                tournamentId: 1,
                title: 'A',
                selectedCount: 5,
                createdAt: D(0),
            },
            {
                category: 'food',
                tournamentId: 2,
                title: 'B',
                selectedCount: 10,
                createdAt: D(1),
            },
            {
                category: 'anime',
                tournamentId: 3,
                title: 'C',
                selectedCount: 5,
                createdAt: D(2),
            },
        ]);
        await insertItems([
            {
                tournamentId: 1,
                itemId: 1,
                firstCount: 3,
                name: 'a',
                imageName: 'img-a',
                createdAt: D(0),
            },
            {
                tournamentId: 1,
                itemId: 2,
                firstCount: 3,
                name: 'b',
                imageName: 'img-b',
                createdAt: D(1),
            },
            {
                tournamentId: 1,
                itemId: 3,
                firstCount: 1,
                name: 'c',
                imageName: 'img-c',
                createdAt: D(0),
            },
            {
                tournamentId: 3,
                itemId: 1,
                firstCount: 1,
                name: 'c3',
                imageName: 'img-c3',
                createdAt: D(0),
            },
        ]);
    };

    describe('findTypeAndPointById', () => {
        it('returns type and point for an event tournament', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 100,
                    title: 'Event',
                    type: TournamentType.EVENT,
                    point: 50,
                },
            ]);

            const result = await repo.findTypeAndPointById(100);

            expect(result).toEqual({
                type: TournamentType.EVENT,
                point: 50,
            });
        });

        it('returns the type with point undefined for a classic tournament without a point', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 101,
                    title: 'Classic',
                    type: TournamentType.CLASSIC,
                },
            ]);

            const result = await repo.findTypeAndPointById(101);

            expect(result).toEqual({ type: TournamentType.CLASSIC });
            expect(result?.point).toBeUndefined();
        });

        it('returns null when no tournament matches the id', async () => {
            expect(await repo.findTypeAndPointById(999)).toBeNull();
        });
    });

    describe('findTournaments', () => {
        it('orders by popularity (selectedCount desc, createdAt desc)', async () => {
            await seedBase();
            const rows = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(rows.map((r) => r.tournamentId)).toEqual([2, 3, 1]);
        });

        it('orders by latest (createdAt desc) — a different order than popularity', async () => {
            await seedBase();
            const rows = await repo.findTournaments(
                SortTournamentsType.LATEST,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(rows.map((r) => r.tournamentId)).toEqual([3, 2, 1]);
        });

        it('resolves the top-2 item images (firstCount desc, createdAt tiebreak)', async () => {
            await seedBase();
            const rows = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            const t1 = rows.find((r) => r.tournamentId === 1);
            expect(t1?.firstItemImageName).toBe('img-b');
            expect(t1?.secondItemImageName).toBe('img-a');
        });

        it('returns null images when there are 1 or 0 items ($ifNull)', async () => {
            await seedBase();
            const rows = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            const t3 = rows.find((r) => r.tournamentId === 3);
            const t2 = rows.find((r) => r.tournamentId === 2);
            expect(t3?.firstItemImageName).toBe('img-c3');
            expect(t3?.secondItemImageName).toBeNull();
            expect(t2?.firstItemImageName).toBeNull();
            expect(t2?.secondItemImageName).toBeNull();
        });

        it('projects exactly the expected keys', async () => {
            await seedBase();
            const [row] = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                1,
                TournamentType.CLASSIC,
            );
            expect(Object.keys(row).sort()).toEqual([
                'category',
                'firstItemImageName',
                'secondItemImageName',
                'selectedCount',
                'title',
                'tournamentId',
            ]);
        });

        it('projects the genre/period/betting metadata fields when present', async () => {
            await insertTournaments([
                {
                    category: 'bet',
                    tournamentId: 50,
                    title: 'BetT',
                    selectedCount: 1,
                    type: TournamentType.EVENT,
                    genre: TournamentGenre.BETTING,
                    startedAt: PAST,
                    endedAt: FUTURE,
                    point: 1000,
                    totalPrize: '1000000000000000000',
                    minBetAmount: '1000000000000000',
                    bettingType: BettingType.USDSC,
                    winItemId: 5,
                },
            ]);
            const [row] = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.EVENT,
            );
            expect(row).toMatchObject({
                tournamentId: 50,
                genre: TournamentGenre.BETTING,
                startedAt: PAST,
                endedAt: FUTURE,
                point: 1000,
                totalPrize: '1000000000000000000',
                minBetAmount: '1000000000000000',
                bettingType: BettingType.USDSC,
                winItemId: 5,
            });
        });

        it('omits absent betting fields for a tournament that has none', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 60,
                    title: 'ClassicT',
                    selectedCount: 1,
                    startedAt: PAST,
                    endedAt: FUTURE,
                },
            ]);
            const [row] = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(row).toMatchObject({
                tournamentId: 60,
                startedAt: PAST,
                endedAt: FUTURE,
            });
            expect(row).not.toHaveProperty('point');
            expect(row).not.toHaveProperty('totalPrize');
            expect(row).not.toHaveProperty('minBetAmount');
            expect(row).not.toHaveProperty('bettingType');
            expect(row).not.toHaveProperty('winItemId');
        });

        it('paginates', async () => {
            await seedBase();
            const p1 = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                2,
                TournamentType.CLASSIC,
            );
            const p2 = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                2,
                2,
                TournamentType.CLASSIC,
            );
            const p3 = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                3,
                2,
                TournamentType.CLASSIC,
            );
            expect(p1.map((r) => r.tournamentId)).toEqual([2, 3]);
            expect(p2.map((r) => r.tournamentId)).toEqual([1]);
            expect(p3).toEqual([]);
        });

        it('paginates a large data set by popularity', async () => {
            const docs = Array.from({ length: 1000 }, (_, i) => ({
                category: 'load',
                tournamentId: i,
                title: `T${i}`,
                selectedCount: i,
                createdAt: base,
            }));
            await insertTournaments(docs);
            const page = await repo.findTournaments(
                SortTournamentsType.POPULARITY,
                25,
                20,
                TournamentType.CLASSIC,
            );
            expect(page.map((r) => r.tournamentId)).toEqual(
                Array.from({ length: 20 }, (_, i) => 519 - i),
            );
            expect(await repo.countTournaments(TournamentType.CLASSIC)).toBe(
                1000,
            );
        }, 30000);

        it('counts all tournaments of the given type across chains', async () => {
            await seedBase();
            expect(await repo.countTournaments(TournamentType.CLASSIC)).toBe(3);
        });

        describe('type filter', () => {
            const seedTyped = () =>
                insertTournaments([
                    {
                        category: 'a',
                        tournamentId: 1,
                        title: 'classic-1',
                        selectedCount: 10,
                        type: TournamentType.CLASSIC,
                        createdAt: D(0),
                    },
                    {
                        category: 'a',
                        tournamentId: 2,
                        title: 'event-1',
                        selectedCount: 8,
                        type: TournamentType.EVENT,
                        createdAt: D(1),
                    },
                    {
                        category: 'a',
                        tournamentId: 3,
                        title: 'classic-2',
                        selectedCount: 6,
                        type: TournamentType.CLASSIC,
                        createdAt: D(2),
                    },
                ]);

            it('returns only tournaments of the requested type, preserving order', async () => {
                await seedTyped();
                const classics = await repo.findTournaments(
                    SortTournamentsType.POPULARITY,
                    1,
                    10,
                    TournamentType.CLASSIC,
                );
                expect(classics.map((r) => r.tournamentId)).toEqual([1, 3]);

                const events = await repo.findTournaments(
                    SortTournamentsType.POPULARITY,
                    1,
                    10,
                    TournamentType.EVENT,
                );
                expect(events.map((r) => r.tournamentId)).toEqual([2]);
            });

            it('counts only the requested type', async () => {
                await seedTyped();
                expect(
                    await repo.countTournaments(TournamentType.CLASSIC),
                ).toBe(2);
                expect(await repo.countTournaments(TournamentType.EVENT)).toBe(
                    1,
                );
            });
        });
    });

    describe('getTournamentById', () => {
        it('returns a single tournament with images and no tournamentId key', async () => {
            await seedBase();
            const result = await repo.getTournamentById(1);
            expect(result).toEqual({
                category: 'anime',
                title: 'A',
                selectedCount: 5,
                firstItemImageName: 'img-b',
                secondItemImageName: 'img-a',
            });
            expect(result).not.toHaveProperty('tournamentId');
        });

        it('returns null for an unknown tournament', async () => {
            await seedBase();
            expect(await repo.getTournamentById(999)).toBeNull();
        });

        it('returns null images when there are no items', async () => {
            await seedBase();
            const result = await repo.getTournamentById(2);
            expect(result?.firstItemImageName).toBeNull();
            expect(result?.secondItemImageName).toBeNull();
        });

        it('projects the genre/period/betting metadata fields when present', async () => {
            await insertTournaments([
                {
                    category: 'bet',
                    tournamentId: 50,
                    title: 'BetT',
                    selectedCount: 1,
                    type: TournamentType.EVENT,
                    genre: TournamentGenre.BETTING,
                    startedAt: PAST,
                    endedAt: FUTURE,
                    point: 1000,
                    totalPrize: '1000000000000000000',
                    minBetAmount: '1000000000000000',
                    bettingType: BettingType.USDSC,
                    winItemId: 5,
                },
            ]);
            const result = await repo.getTournamentById(50);
            expect(result).toMatchObject({
                category: 'bet',
                title: 'BetT',
                selectedCount: 1,
                genre: TournamentGenre.BETTING,
                startedAt: PAST,
                endedAt: FUTURE,
                point: 1000,
                totalPrize: '1000000000000000000',
                minBetAmount: '1000000000000000',
                bettingType: BettingType.USDSC,
                winItemId: 5,
            });
        });
    });

    describe('findTournamentsByCategory', () => {
        const seedCategory = () =>
            insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 1,
                    title: 'A',
                    selectedCount: 10,
                    createdAt: D(0),
                },
                {
                    category: 'anime',
                    tournamentId: 3,
                    title: 'C',
                    selectedCount: 5,
                    createdAt: D(2),
                },
                {
                    category: 'food',
                    tournamentId: 2,
                    title: 'B',
                    selectedCount: 99,
                    createdAt: D(1),
                },
            ]);

        it('filters by category and orders by popularity', async () => {
            await seedCategory();
            const rows = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(rows.map((r) => r.tournamentId)).toEqual([1, 3]);
        });

        it('orders by latest — a different order than popularity', async () => {
            await seedCategory();
            const rows = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.LATEST,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(rows.map((r) => r.tournamentId)).toEqual([3, 1]);
        });

        it('omits the category key in this projection', async () => {
            await seedCategory();
            const [row] = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                1,
                TournamentType.CLASSIC,
            );
            expect(Object.keys(row).sort()).toEqual([
                'firstItemImageName',
                'secondItemImageName',
                'selectedCount',
                'title',
                'tournamentId',
            ]);
        });

        it('projects the genre/period/betting metadata fields when present', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 50,
                    title: 'BetT',
                    selectedCount: 1,
                    type: TournamentType.EVENT,
                    genre: TournamentGenre.BETTING,
                    startedAt: PAST,
                    endedAt: FUTURE,
                    point: 1000,
                    totalPrize: '1000000000000000000',
                    minBetAmount: '1000000000000000',
                    bettingType: BettingType.USDSC,
                    winItemId: 5,
                },
            ]);
            const [row] = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.EVENT,
            );
            expect(row).toMatchObject({
                tournamentId: 50,
                genre: TournamentGenre.BETTING,
                startedAt: PAST,
                endedAt: FUTURE,
                point: 1000,
                totalPrize: '1000000000000000000',
                minBetAmount: '1000000000000000',
                bettingType: BettingType.USDSC,
                winItemId: 5,
            });
        });

        it('counts by category', async () => {
            await seedCategory();
            expect(
                await repo.countTournamentsByCategory(
                    'anime',
                    TournamentType.CLASSIC,
                ),
            ).toBe(2);
            expect(
                await repo.countTournamentsByCategory(
                    'food',
                    TournamentType.CLASSIC,
                ),
            ).toBe(1);
            expect(
                await repo.countTournamentsByCategory(
                    'nope',
                    TournamentType.CLASSIC,
                ),
            ).toBe(0);
            expect(
                await repo.countTournamentsByCategory(
                    '',
                    TournamentType.CLASSIC,
                ),
            ).toBe(0);
        });

        it('filters by category AND type together', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 1,
                    title: 'classic-anime',
                    selectedCount: 10,
                    type: TournamentType.CLASSIC,
                    createdAt: D(0),
                },
                {
                    category: 'anime',
                    tournamentId: 2,
                    title: 'event-anime',
                    selectedCount: 8,
                    type: TournamentType.EVENT,
                    createdAt: D(1),
                },
                {
                    category: 'food',
                    tournamentId: 3,
                    title: 'classic-food',
                    selectedCount: 5,
                    type: TournamentType.CLASSIC,
                    createdAt: D(2),
                },
            ]);

            const animeClassic = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.CLASSIC,
            );
            expect(animeClassic.map((r) => r.tournamentId)).toEqual([1]);

            const animeEvent = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                10,
                TournamentType.EVENT,
            );
            expect(animeEvent.map((r) => r.tournamentId)).toEqual([2]);

            expect(
                await repo.countTournamentsByCategory(
                    'anime',
                    TournamentType.CLASSIC,
                ),
            ).toBe(1);
            expect(
                await repo.countTournamentsByCategory(
                    'anime',
                    TournamentType.EVENT,
                ),
            ).toBe(1);
        });
    });

    describe('period filter', () => {
        // started × ended 매트릭스(과거/미래/null) → 기대 period
        const seedPeriods = () =>
            insertTournaments([
                // ended: endedAt <= now
                {
                    category: 'anime',
                    tournamentId: 1,
                    title: 'ended-past-past',
                    startedAt: PAST,
                    endedAt: PAST,
                },
                {
                    category: 'anime',
                    tournamentId: 7,
                    title: 'ended-null-past',
                    startedAt: null,
                    endedAt: PAST,
                },
                // ongoing: (started null|<=now) AND (ended null|>now)
                {
                    category: 'anime',
                    tournamentId: 2,
                    title: 'ongoing-past-future',
                    startedAt: PAST,
                    endedAt: FUTURE,
                },
                {
                    category: 'anime',
                    tournamentId: 4,
                    title: 'ongoing-null-null',
                    startedAt: null,
                    endedAt: null,
                },
                {
                    category: 'anime',
                    tournamentId: 5,
                    title: 'ongoing-null-future',
                    startedAt: null,
                    endedAt: FUTURE,
                },
                {
                    category: 'anime',
                    tournamentId: 6,
                    title: 'ongoing-past-null',
                    startedAt: PAST,
                    endedAt: null,
                },
                // upcoming: startedAt > now
                {
                    category: 'anime',
                    tournamentId: 3,
                    title: 'upcoming-future-future',
                    startedAt: FUTURE,
                    endedAt: FUTURE,
                },
                {
                    category: 'anime',
                    tournamentId: 8,
                    title: 'upcoming-future-null',
                    startedAt: FUTURE,
                    endedAt: null,
                },
            ]);

        const find = (period?: TournamentPeriod) =>
            repo.findTournaments(
                SortTournamentsType.POPULARITY,
                1,
                50,
                TournamentType.CLASSIC,
                period,
            );

        it('upcoming returns only future-started tournaments', async () => {
            await seedPeriods();
            expect(sortIds(await find(TournamentPeriod.UPCOMING))).toEqual([
                3, 8,
            ]);
            expect(
                await repo.countTournaments(
                    TournamentType.CLASSIC,
                    TournamentPeriod.UPCOMING,
                ),
            ).toBe(2);
        });

        it('ongoing includes the both-null case and one-sided nulls', async () => {
            await seedPeriods();
            expect(sortIds(await find(TournamentPeriod.ONGOING))).toEqual([
                2, 4, 5, 6,
            ]);
            expect(
                await repo.countTournaments(
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                ),
            ).toBe(4);
        });

        it('ended returns only tournaments whose endedAt is past', async () => {
            await seedPeriods();
            expect(sortIds(await find(TournamentPeriod.ENDED))).toEqual([1, 7]);
            expect(
                await repo.countTournaments(
                    TournamentType.CLASSIC,
                    TournamentPeriod.ENDED,
                ),
            ).toBe(2);
        });

        it('without a period returns every tournament (no filtering)', async () => {
            await seedPeriods();
            expect(sortIds(await find())).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(await repo.countTournaments(TournamentType.CLASSIC)).toBe(8);
        });

        it('the three periods partition the full set (mutually exclusive, exhaustive)', async () => {
            await seedPeriods();
            const [upcoming, ongoing, ended] = await Promise.all([
                find(TournamentPeriod.UPCOMING),
                find(TournamentPeriod.ONGOING),
                find(TournamentPeriod.ENDED),
            ]);
            const union = sortIds([...upcoming, ...ongoing, ...ended]);
            expect(union).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(new Set(union).size).toBe(8);
        });

        it('combines category AND period on findTournamentsByCategory', async () => {
            await insertTournaments([
                {
                    category: 'anime',
                    tournamentId: 1,
                    title: 'a-ongoing',
                    startedAt: PAST,
                    endedAt: FUTURE,
                },
                {
                    category: 'anime',
                    tournamentId: 2,
                    title: 'a-ongoing-null',
                    startedAt: null,
                    endedAt: null,
                },
                {
                    category: 'anime',
                    tournamentId: 3,
                    title: 'a-ended',
                    startedAt: PAST,
                    endedAt: PAST,
                },
                {
                    category: 'food',
                    tournamentId: 4,
                    title: 'f-ongoing',
                    startedAt: PAST,
                    endedAt: FUTURE,
                },
            ]);

            const animeOngoing = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                50,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
            );
            expect(sortIds(animeOngoing)).toEqual([1, 2]);
            expect(
                await repo.countTournamentsByCategory(
                    'anime',
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                ),
            ).toBe(2);
            // 다른 카테고리의 ongoing은 섞이지 않는다.
            expect(
                await repo.countTournamentsByCategory(
                    'food',
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                ),
            ).toBe(1);
            // ended는 anime의 t3만.
            const animeEnded = await repo.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                50,
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );
            expect(sortIds(animeEnded)).toEqual([3]);
        });
    });
});

import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
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
import { PlayInfoRepository } from './play-info.repository';
import {
    BettingType,
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

const CHAIN = 7103;
const USER = '0x' + 'ab'.repeat(20);
const USER2 = '0x' + 'cd'.repeat(20);
const base = new Date('2026-01-01T00:00:00.000Z');
const D = (days: number) => new Date(base.getTime() + days * 86_400_000);
const tx = (i: number) => '0x' + i.toString(16).padStart(64, '0');
// repo가 내부에서 new Date()(현재)를 쓰므로 period 분류가 결정적이도록 극단값 사용.
const PAST = new Date('2000-01-01T00:00:00.000Z');
const FUTURE = new Date('2999-01-01T00:00:00.000Z');

describe('PlayInfoRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let pModel: Model<PlayInfoDocument>;
    let tModel: Model<TournamentDocument>;
    let iModel: Model<ItemDocument>;
    let repo: PlayInfoRepository;

    // PlayInfo keeps chainId as provenance; reads no longer filter by it.
    const play = (over: Record<string, unknown>) => ({
        chainId: CHAIN,
        user: USER,
        tournamentId: 0,
        firstItemId: 1,
        secondItemId: 2,
        entryItemHexes: '0x0001',
        tournamentDataHash: '0xhash',
        txHash: tx(0),
        blockNumber: 1,
        blockHash: '0xblock',
        logIndex: 0,
        createdAt: base,
        updatedAt: base,
        ...over,
    });

    const insertPlays = (docs: Array<Record<string, unknown>>) =>
        pModel.collection.insertMany(docs.map(play));

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_play_info_repo' });
        connection = mem.connection;
        pModel = registerModel<PlayInfoDocument>(
            connection,
            PlayInfo.name,
            PlayInfoSchema,
        );
        tModel = registerModel<TournamentDocument>(
            connection,
            Tournament.name,
            TournamentSchema,
        );
        iModel = registerModel<ItemDocument>(connection, Item.name, ItemSchema);
        await pModel.syncIndexes();
        await tModel.syncIndexes();
        await iModel.syncIndexes();
        repo = new PlayInfoRepository(pModel);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await Promise.all([
            pModel.deleteMany({}),
            tModel.deleteMany({}),
            iModel.deleteMany({}),
        ]);
    });

    describe('findTournamentsByAddress', () => {
        const seed = async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1), createdAt: D(0) },
                { tournamentId: 100, txHash: tx(2), createdAt: D(2) },
                { tournamentId: 200, txHash: tx(3), createdAt: D(1) },
                { tournamentId: 300, txHash: tx(4), createdAt: D(3) },
                {
                    tournamentId: 100,
                    txHash: tx(5),
                    user: USER2,
                    createdAt: D(5),
                },
            ]);
            await tModel.create([
                {
                    tournamentId: 100,
                    category: 'anime',
                    title: 'T100',
                    selectedCount: 7,
                },
                {
                    tournamentId: 200,
                    category: 'food',
                    title: 'T200',
                    selectedCount: 3,
                },
                {
                    tournamentId: 300,
                    category: 'game',
                    title: 'T300',
                    selectedCount: 1,
                },
            ]);
            await iModel.create([
                {
                    tournamentId: 100,
                    itemId: 1,
                    name: 'hi',
                    imageName: 'img-hi',
                    firstCount: 9,
                },
                {
                    tournamentId: 100,
                    itemId: 2,
                    name: 'lo',
                    imageName: 'img-lo',
                    firstCount: 1,
                },
            ]);
        };

        it('dedups by tournamentId (4 in-scope plays -> 3 grouped rows)', async () => {
            await seed();
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows).toHaveLength(3);
        });

        it('picks the latest play per tournament and orders by latest play desc', async () => {
            await seed();
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            // assert outer ordering via txHash of each tournament's latest play.
            expect(rows.map((r) => r.txHash)).toEqual([tx(4), tx(2), tx(3)]);
            const t100 = rows.find((r) => r.tournamentId === 100);
            expect(t100?.txHash).toBe(tx(2));
        });

        it('enriches with tournament fields and the top-2 item images', async () => {
            await seed();
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows.find((r) => r.tournamentId === 100)).toMatchObject({
                category: 'anime',
                tournamentId: 100,
                title: 'T100',
                selectedCount: 7,
                txHash: tx(2),
                firstItemImageName: 'img-hi',
                secondItemImageName: 'img-lo',
            });
        });

        it('maps the new tournament metadata fields (genre/period/betting) through', async () => {
            await insertPlays([
                { tournamentId: 700, txHash: tx(70), createdAt: D(0) },
            ]);
            await tModel.create({
                tournamentId: 700,
                category: 'bet',
                title: 'T700',
                selectedCount: 0,
                type: TournamentType.EVENT,
                genre: TournamentGenre.BETTING,
                startedAt: PAST,
                endedAt: FUTURE,
                point: 1000,
                totalPrize: '1000000000000000000',
                minBetAmount: '1000000000000000',
                bettingType: BettingType.USDSC,
                winItemId: 5,
            });
            const [row] = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.BETTING,
            );
            expect(row).toMatchObject({
                tournamentId: 700,
                txHash: tx(70),
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

        it('drops a play whose tournament doc is missing (no type to match)', async () => {
            await seed();
            // tid 400 has plays but no tournament doc, so it cannot match a type.
            await insertPlays([
                { tournamentId: 400, txHash: tx(40), createdAt: D(9) },
            ]);
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows.map((r) => r.txHash)).not.toContain(tx(40));
            expect(rows).toHaveLength(3);
        });

        it('isolates by user', async () => {
            await seed();
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows.map((r) => r.txHash)).not.toContain(tx(5));
        });

        it('aggregates a user plays across chains into one grouped row', async () => {
            await tModel.create({
                tournamentId: 100,
                category: 'anime',
                title: 'T100',
                selectedCount: 1,
            });
            await insertPlays([
                { tournamentId: 100, txHash: tx(1), createdAt: D(0) },
                {
                    tournamentId: 100,
                    txHash: tx(2),
                    chainId: 9999,
                    createdAt: D(1),
                },
            ]);
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].tournamentId).toBe(100);
            expect(
                await repo.countTournamentsByAddress(
                    USER,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toBe(1);
        });

        it('count matches the grouped tournament total even when a user replays', async () => {
            await seed();
            const rows = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            const count = await repo.countTournamentsByAddress(
                USER,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            // 4 raw plays across 3 distinct tournaments -> count must equal the
            // grouped row total (3), so pagination totals are not inflated.
            expect(rows).toHaveLength(3);
            expect(count).toBe(3);
            expect(count).toBe(rows.length);
        });

        it('matches user case-sensitively (caller must pass a lowercased address)', async () => {
            await tModel.create({
                tournamentId: 100,
                category: 'anime',
                title: 'T100',
                selectedCount: 0,
            });
            await pModel.create({
                ...play({ tournamentId: 100, txHash: tx(7) }),
                user: '0x' + 'AB'.repeat(20),
            });
            const lower = await repo.findTournamentsByAddress(
                USER,
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            const mixed = await repo.findTournamentsByAddress(
                '0x' + 'AB'.repeat(20),
                1,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(lower).toHaveLength(1);
            expect(mixed).toEqual([]);
        });

        it('paginates grouped rows by latest play time', async () => {
            const plays: Array<Record<string, unknown>> = [];
            const tournaments: Array<Record<string, unknown>> = [];
            for (let tid = 1; tid <= 30; tid++) {
                plays.push({
                    tournamentId: tid,
                    txHash: tx(tid * 2),
                    createdAt: new Date(base.getTime() + tid * 1000),
                });
                plays.push({
                    tournamentId: tid,
                    txHash: tx(tid * 2 + 1),
                    createdAt: base,
                });
                tournaments.push({
                    tournamentId: tid,
                    category: 'g',
                    title: `T${tid}`,
                    selectedCount: 0,
                });
            }
            await insertPlays(plays);
            await tModel.create(tournaments);

            const page = await repo.findTournamentsByAddress(
                USER,
                2,
                10,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(page.map((r) => r.tournamentId)).toEqual(
                Array.from({ length: 10 }, (_, i) => 20 - i),
            );
        }, 30000);

        it('handles a large data set', async () => {
            const plays = Array.from({ length: 1000 }, (_, i) => ({
                tournamentId: i,
                txHash: tx(i + 100),
                createdAt: new Date(base.getTime() + i * 1000),
            }));
            await insertPlays(plays);
            // Every play must reference a matching (classic) tournament to survive
            // the type filter, so seed the corresponding tournament docs.
            await tModel.collection.insertMany(
                Array.from({ length: 1000 }, (_, i) => ({
                    tournamentId: i,
                    category: 'g',
                    title: `T${i}`,
                    selectedCount: 0,
                    type: TournamentType.CLASSIC,
                    // raw insertMany bypasses schema defaults, so set genre
                    // explicitly (the required genre filter would drop these).
                    genre: TournamentGenre.TOURNAMENT,
                    createdAt: base,
                    updatedAt: base,
                })),
            );
            const page = await repo.findTournamentsByAddress(
                USER,
                2,
                50,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(page).toHaveLength(50);
            expect(new Set(page.map((r) => r.txHash)).size).toBe(50);
            expect(
                await repo.countTournamentsByAddress(
                    USER,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toBe(1000);
        }, 30000);

        describe('type filter (joined tournaments.type)', () => {
            const seedTyped = async () => {
                await insertPlays([
                    { tournamentId: 100, txHash: tx(1), createdAt: D(0) },
                    { tournamentId: 200, txHash: tx(2), createdAt: D(1) },
                    { tournamentId: 300, txHash: tx(3), createdAt: D(2) },
                ]);
                await tModel.create([
                    {
                        tournamentId: 100,
                        category: 'a',
                        title: 'T100',
                        selectedCount: 1,
                        type: TournamentType.CLASSIC,
                    },
                    {
                        tournamentId: 200,
                        category: 'a',
                        title: 'T200',
                        selectedCount: 1,
                        type: TournamentType.EVENT,
                    },
                    {
                        tournamentId: 300,
                        category: 'a',
                        title: 'T300',
                        selectedCount: 1,
                        type: TournamentType.CLASSIC,
                    },
                ]);
            };

            it('returns only rows whose tournament matches the type, and counts them', async () => {
                await seedTyped();

                const classics = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    10,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                );
                expect(
                    classics.map((r) => r.tournamentId).sort((a, b) => a - b),
                ).toEqual([100, 300]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.CLASSIC,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(2);

                const events = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    10,
                    TournamentType.EVENT,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                );
                expect(events.map((r) => r.tournamentId)).toEqual([200]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.EVENT,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(1);
            });

            it('applies the type filter BEFORE pagination so a page is not diluted by other types', async () => {
                // Event tid 5 is the most recent play; classics 1..4 are older.
                // A post-pagination filter would let tid 5 occupy a page slot and
                // then drop it, shrinking the page below the limit.
                await insertPlays([
                    { tournamentId: 1, txHash: tx(11), createdAt: D(1) },
                    { tournamentId: 2, txHash: tx(12), createdAt: D(2) },
                    { tournamentId: 3, txHash: tx(13), createdAt: D(3) },
                    { tournamentId: 4, txHash: tx(14), createdAt: D(4) },
                    { tournamentId: 5, txHash: tx(15), createdAt: D(9) },
                ]);
                await tModel.create([
                    {
                        tournamentId: 1,
                        category: 'a',
                        title: 'c1',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                    },
                    {
                        tournamentId: 2,
                        category: 'a',
                        title: 'c2',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                    },
                    {
                        tournamentId: 3,
                        category: 'a',
                        title: 'c3',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                    },
                    {
                        tournamentId: 4,
                        category: 'a',
                        title: 'c4',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                    },
                    {
                        tournamentId: 5,
                        category: 'a',
                        title: 'e5',
                        selectedCount: 0,
                        type: TournamentType.EVENT,
                    },
                ]);

                const page1 = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    2,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                );
                expect(page1.map((r) => r.tournamentId)).toEqual([4, 3]);
                expect(page1).toHaveLength(2);

                const page2 = await repo.findTournamentsByAddress(
                    USER,
                    2,
                    2,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                );
                expect(page2.map((r) => r.tournamentId)).toEqual([2, 1]);

                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.CLASSIC,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(4);
            });
        });

        describe('period filter (joined tournaments startedAt/endedAt)', () => {
            const sortIds = (rows: Array<{ tournamentId: number }>) =>
                rows.map((r) => r.tournamentId).sort((a, b) => a - b);

            const seedPeriods = async () => {
                await insertPlays([
                    { tournamentId: 1, txHash: tx(1) },
                    { tournamentId: 2, txHash: tx(2) },
                    { tournamentId: 3, txHash: tx(3) },
                    { tournamentId: 4, txHash: tx(4) },
                    { tournamentId: 5, txHash: tx(5) },
                    { tournamentId: 6, txHash: tx(6) },
                ]);
                await tModel.create([
                    // ended
                    {
                        tournamentId: 1,
                        category: 'a',
                        title: 'ended-past-past',
                        selectedCount: 0,
                        startedAt: PAST,
                        endedAt: PAST,
                    },
                    {
                        tournamentId: 5,
                        category: 'a',
                        title: 'ended-null-past',
                        selectedCount: 0,
                        startedAt: null,
                        endedAt: PAST,
                    },
                    // ongoing
                    {
                        tournamentId: 2,
                        category: 'a',
                        title: 'ongoing-past-future',
                        selectedCount: 0,
                        startedAt: PAST,
                        endedAt: FUTURE,
                    },
                    {
                        tournamentId: 4,
                        category: 'a',
                        title: 'ongoing-null-null',
                        selectedCount: 0,
                        startedAt: null,
                        endedAt: null,
                    },
                    // upcoming
                    {
                        tournamentId: 3,
                        category: 'a',
                        title: 'upcoming-future-future',
                        selectedCount: 0,
                        startedAt: FUTURE,
                        endedAt: FUTURE,
                    },
                    {
                        tournamentId: 6,
                        category: 'a',
                        title: 'upcoming-future-null',
                        selectedCount: 0,
                        startedAt: FUTURE,
                        endedAt: null,
                    },
                ]);
            };

            const find = (period: TournamentPeriod) =>
                repo.findTournamentsByAddress(
                    USER,
                    1,
                    50,
                    TournamentType.CLASSIC,
                    period,
                    TournamentGenre.TOURNAMENT,
                );

            it('upcoming returns only future-started tournaments', async () => {
                await seedPeriods();
                expect(sortIds(await find(TournamentPeriod.UPCOMING))).toEqual([
                    3, 6,
                ]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.CLASSIC,
                        TournamentPeriod.UPCOMING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(2);
            });

            it('ongoing includes the both-null case', async () => {
                await seedPeriods();
                expect(sortIds(await find(TournamentPeriod.ONGOING))).toEqual([
                    2, 4,
                ]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.CLASSIC,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(2);
            });

            it('ended returns only tournaments whose endedAt is past', async () => {
                await seedPeriods();
                expect(sortIds(await find(TournamentPeriod.ENDED))).toEqual([
                    1, 5,
                ]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.CLASSIC,
                        TournamentPeriod.ENDED,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(2);
            });
        });

        describe('genre filter (joined tournaments.genre)', () => {
            const sortIds = (rows: Array<{ tournamentId: number }>) =>
                rows.map((r) => r.tournamentId).sort((a, b) => a - b);

            // 실제 시드상 betting은 type=event이지만, genre가 type과 독립적으로
            // 필터됨을 증명하기 위해 (type, genre) 4조합을 모두 심는다.
            const seedGenres = async () => {
                await insertPlays([
                    { tournamentId: 100, txHash: tx(1), createdAt: D(0) },
                    { tournamentId: 200, txHash: tx(2), createdAt: D(1) },
                    { tournamentId: 300, txHash: tx(3), createdAt: D(2) },
                    { tournamentId: 400, txHash: tx(4), createdAt: D(3) },
                ]);
                await tModel.create([
                    {
                        tournamentId: 100,
                        category: 'a',
                        title: 'classic-tournament',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                        genre: TournamentGenre.TOURNAMENT,
                    },
                    {
                        tournamentId: 200,
                        category: 'a',
                        title: 'event-betting',
                        selectedCount: 0,
                        type: TournamentType.EVENT,
                        genre: TournamentGenre.BETTING,
                    },
                    {
                        tournamentId: 300,
                        category: 'a',
                        title: 'event-tournament',
                        selectedCount: 0,
                        type: TournamentType.EVENT,
                        genre: TournamentGenre.TOURNAMENT,
                    },
                    {
                        tournamentId: 400,
                        category: 'a',
                        title: 'classic-betting',
                        selectedCount: 0,
                        type: TournamentType.CLASSIC,
                        genre: TournamentGenre.BETTING,
                    },
                ]);
            };

            it('genre=betting within a type returns only that genre, and counts it', async () => {
                await seedGenres();

                const rows = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    10,
                    TournamentType.EVENT,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.BETTING,
                );
                expect(sortIds(rows)).toEqual([200]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.EVENT,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.BETTING,
                    ),
                ).toBe(1);
            });

            it('genre=tournament within a type excludes betting tournaments', async () => {
                await seedGenres();

                const rows = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    10,
                    TournamentType.EVENT,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                );
                expect(sortIds(rows)).toEqual([300]);
                expect(
                    await repo.countTournamentsByAddress(
                        USER,
                        TournamentType.EVENT,
                        TournamentPeriod.ONGOING,
                        TournamentGenre.TOURNAMENT,
                    ),
                ).toBe(1);
            });

            it('filters genre independently of type (classic betting is reachable)', async () => {
                await seedGenres();

                const rows = await repo.findTournamentsByAddress(
                    USER,
                    1,
                    10,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.BETTING,
                );
                expect(sortIds(rows)).toEqual([400]);
            });
        });
    });

    describe('findPlayInfosByAddressTournamentId', () => {
        it('sorts by createdAt desc and projects only the play fields', async () => {
            await insertPlays([
                {
                    tournamentId: 100,
                    txHash: tx(1),
                    createdAt: D(0),
                    firstItemId: 11,
                    secondItemId: 22,
                    entryItemHexes: '0xaa',
                },
                {
                    tournamentId: 100,
                    txHash: tx(2),
                    createdAt: D(2),
                    firstItemId: 33,
                    secondItemId: 44,
                    entryItemHexes: '0xbb',
                },
            ]);
            const rows = await repo.findPlayInfosByAddressTournamentId(
                USER,
                100,
                1,
                10,
                TournamentGenre.TOURNAMENT,
            );
            expect(rows).toEqual([
                {
                    firstItemId: 33,
                    secondItemId: 44,
                    entryItemHexes: '0xbb',
                    txHash: tx(2),
                },
                {
                    firstItemId: 11,
                    secondItemId: 22,
                    entryItemHexes: '0xaa',
                    txHash: tx(1),
                },
            ]);
        });

        it('genre=betting sorts by createdAt desc and projects only the bet fields', async () => {
            await insertPlays([
                {
                    tournamentId: 100,
                    txHash: tx(1),
                    createdAt: D(0),
                    betItemId: 7,
                    betAmount: '1000',
                },
                {
                    tournamentId: 100,
                    txHash: tx(2),
                    createdAt: D(2),
                    betItemId: 9,
                    betAmount: '2000',
                },
            ]);
            const rows = await repo.findPlayInfosByAddressTournamentId(
                USER,
                100,
                1,
                10,
                TournamentGenre.BETTING,
            );
            // firstItemId/secondItemId/entryItemHexes(기본값으로 존재)는 제외되고
            // betItemId/betAmount/txHash만 createdAt 내림차순으로 반환되어야 한다.
            expect(rows).toEqual([
                { betItemId: 9, betAmount: '2000', txHash: tx(2) },
                { betItemId: 7, betAmount: '1000', txHash: tx(1) },
            ]);
        });

        it('filters by tournament and user, aggregating plays across chains', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1), createdAt: D(0) },
                { tournamentId: 100, txHash: tx(2), createdAt: D(1) },
                { tournamentId: 200, txHash: tx(3), createdAt: D(0) },
                {
                    tournamentId: 100,
                    txHash: tx(4),
                    user: USER2,
                    createdAt: D(0),
                },
                {
                    tournamentId: 100,
                    txHash: tx(5),
                    chainId: 9999,
                    createdAt: D(0),
                },
            ]);
            // tx(1), tx(2), tx(5) are USER@tid100 across chains -> 3; tx(3) other
            // tournament, tx(4) other user are excluded.
            expect(
                await repo.countPlayInfosByAddressTournamentId(USER, 100),
            ).toBe(3);
            expect(
                await repo.findPlayInfosByAddressTournamentId(
                    USER,
                    100,
                    5,
                    20,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toEqual([]);
        });

        it('handles a large data set', async () => {
            const plays = Array.from({ length: 2000 }, (_, i) => ({
                tournamentId: 100,
                txHash: tx(i + 1),
                createdAt: new Date(base.getTime() - i * 1000),
            }));
            await insertPlays(plays);
            const page = await repo.findPlayInfosByAddressTournamentId(
                USER,
                100,
                50,
                20,
                TournamentGenre.TOURNAMENT,
            );
            expect(page).toHaveLength(20);
            // createdAt desc: newest is i=0 (tx 1). page 50 limit 20 -> ranks 981..1000
            expect(page[0].txHash).toBe(tx(981));
            expect(page[19].txHash).toBe(tx(1000));
            expect(
                await repo.countPlayInfosByAddressTournamentId(USER, 100),
            ).toBe(2000);
        }, 30000);
    });

    describe('existsByAddressTournamentId', () => {
        it('returns true when at least one play exists for the user/tournament', async () => {
            await insertPlays([{ tournamentId: 100, txHash: tx(1) }]);
            expect(await repo.existsByAddressTournamentId(USER, 100)).toBe(
                true,
            );
        });

        it('returns true when the user replayed (multiple matching rows)', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1) },
                { tournamentId: 100, txHash: tx(2) },
            ]);
            expect(await repo.existsByAddressTournamentId(USER, 100)).toBe(
                true,
            );
        });

        it('returns false when no play exists for that tournament', async () => {
            await insertPlays([{ tournamentId: 100, txHash: tx(1) }]);
            expect(await repo.existsByAddressTournamentId(USER, 200)).toBe(
                false,
            );
        });

        it('returns false when only another user has plays', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1), user: USER2 },
            ]);
            expect(await repo.existsByAddressTournamentId(USER, 100)).toBe(
                false,
            );
        });

        it('returns false on an empty collection', async () => {
            expect(await repo.existsByAddressTournamentId(USER, 100)).toBe(
                false,
            );
        });
    });

    describe('findPlayedTournamentIds', () => {
        const sortNum = (ids: number[]) => [...ids].sort((a, b) => a - b);

        it('returns only the played ids among the requested set', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1) },
                { tournamentId: 200, txHash: tx(2) },
            ]);
            const played = await repo.findPlayedTournamentIds(
                USER,
                [100, 200, 300],
            );
            // 300 was never played -> excluded; 100/200 returned.
            expect(sortNum(played)).toEqual([100, 200]);
        });

        it('dedups tournaments the user replayed into a single id', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1) },
                { tournamentId: 100, txHash: tx(2) },
                { tournamentId: 100, txHash: tx(3), chainId: 9999 },
            ]);
            expect(await repo.findPlayedTournamentIds(USER, [100])).toEqual([
                100,
            ]);
        });

        it('excludes ids played only by another user', async () => {
            await insertPlays([
                { tournamentId: 100, txHash: tx(1) },
                { tournamentId: 200, txHash: tx(2), user: USER2 },
            ]);
            expect(
                sortNum(await repo.findPlayedTournamentIds(USER, [100, 200])),
            ).toEqual([100]);
        });

        it('normalizes address casing: distinct() applies the schema lowercase setter to both the stored value and the query filter', async () => {
            await pModel.create({
                ...play({ tournamentId: 100, txHash: tx(7) }),
                user: '0x' + 'AB'.repeat(20),
            });
            // create() lowercases the stored user; distinct() (a query method,
            // unlike aggregate()) also lowercases the filter value, so a lower-
            // and a mixed-case lookup both resolve to the same stored document.
            expect(await repo.findPlayedTournamentIds(USER, [100])).toEqual([
                100,
            ]);
            expect(
                await repo.findPlayedTournamentIds(
                    '0x' + 'AB'.repeat(20),
                    [100],
                ),
            ).toEqual([100]);
        });

        it('returns an empty array (and runs no query) for an empty id list', async () => {
            await insertPlays([{ tournamentId: 100, txHash: tx(1) }]);
            const spy = jest.spyOn(pModel, 'distinct');
            expect(await repo.findPlayedTournamentIds(USER, [])).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('returns an empty array when none of the requested ids were played', async () => {
            await insertPlays([{ tournamentId: 100, txHash: tx(1) }]);
            expect(
                await repo.findPlayedTournamentIds(USER, [200, 300]),
            ).toEqual([]);
        });

        it('handles a large requested id set against many plays', async () => {
            // user played even tournamentIds 0..1998; request all 0..1999.
            const plays = Array.from({ length: 1000 }, (_, i) => ({
                tournamentId: i * 2,
                txHash: tx(i + 1),
            }));
            await insertPlays(plays);
            const requested = Array.from({ length: 2000 }, (_, i) => i);
            const played = await repo.findPlayedTournamentIds(USER, requested);
            expect(played).toHaveLength(1000);
            expect(sortNum(played)).toEqual(
                Array.from({ length: 1000 }, (_, i) => i * 2),
            );
        }, 30000);
    });
});

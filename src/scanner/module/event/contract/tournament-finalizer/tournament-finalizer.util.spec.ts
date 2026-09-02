import {
    extractMatchStats,
    ItemUpdate,
    MatchUpdate,
} from './tournament-finalizer.util';

const TOURNAMENT_ID = 1;

const stats = (
    entries: number[],
    first: number,
    second: number,
    sign: -1 | 1 = 1,
) => extractMatchStats(entries, TOURNAMENT_ID, first, second, sign);

const item = (over: Partial<ItemUpdate> & { itemId: number }): ItemUpdate => ({
    tournamentId: TOURNAMENT_ID,
    firstCount: 0,
    secondCount: 0,
    wins: 0,
    tournamentEntries: 1,
    totalMatchEntries: 0,
    ...over,
});

const match = (
    over: Partial<MatchUpdate> & { itemLowId: number; itemHighId: number },
): MatchUpdate => ({
    tournamentId: TOURNAMENT_ID,
    lowWins: 0,
    highWins: 0,
    totalMatches: 1,
    ...over,
});

describe('extractMatchStats', () => {
    describe('2-item bracket', () => {
        it('credits the lower winner correctly', () => {
            const result = stats([10, 20], 10, 20);
            expect(result.itemUpdates).toEqual([
                item({
                    itemId: 10,
                    firstCount: 1,
                    wins: 1,
                    totalMatchEntries: 1,
                }),
                item({ itemId: 20, secondCount: 1, totalMatchEntries: 1 }),
            ]);
            expect(result.matchUpdates).toEqual([
                match({ itemLowId: 10, itemHighId: 20, lowWins: 1 }),
            ]);
        });

        it('normalizes a high-id winner into highWins', () => {
            const result = stats([20, 10], 20, 10);
            expect(result.matchUpdates).toEqual([
                match({ itemLowId: 10, itemHighId: 20, highWins: 1 }),
            ]);
            expect(result.itemUpdates.find((i) => i.itemId === 20)?.wins).toBe(
                1,
            );
        });
    });

    describe('4-item bracket [10,20,30,40], first=10, second=30', () => {
        const result = stats([10, 20, 30, 40], 10, 30);

        it('produces 3 matches in push order', () => {
            expect(result.matchUpdates).toEqual([
                match({ itemLowId: 10, itemHighId: 20, lowWins: 1 }),
                match({ itemLowId: 30, itemHighId: 40, lowWins: 1 }),
                match({ itemLowId: 10, itemHighId: 30, lowWins: 1 }),
            ]);
        });

        it('accumulates per-item counts across rounds', () => {
            expect(result.itemUpdates).toEqual([
                item({
                    itemId: 10,
                    firstCount: 1,
                    wins: 2,
                    totalMatchEntries: 2,
                }),
                item({ itemId: 20, totalMatchEntries: 1 }),
                item({
                    itemId: 30,
                    secondCount: 1,
                    wins: 1,
                    totalMatchEntries: 2,
                }),
                item({ itemId: 40, totalMatchEntries: 1 }),
            ]);
        });
    });

    describe('8-item bracket [1..8], first=1, second=5', () => {
        const result = stats([1, 2, 3, 4, 5, 6, 7, 8], 1, 5);

        it('produces 7 matches where the lower id always wins', () => {
            expect(result.matchUpdates).toEqual([
                match({ itemLowId: 1, itemHighId: 2, lowWins: 1 }),
                match({ itemLowId: 3, itemHighId: 4, lowWins: 1 }),
                match({ itemLowId: 5, itemHighId: 6, lowWins: 1 }),
                match({ itemLowId: 7, itemHighId: 8, lowWins: 1 }),
                match({ itemLowId: 1, itemHighId: 3, lowWins: 1 }),
                match({ itemLowId: 5, itemHighId: 7, lowWins: 1 }),
                match({ itemLowId: 1, itemHighId: 5, lowWins: 1 }),
            ]);
        });

        it('tallies wins and totalMatchEntries per item', () => {
            const byId = new Map(result.itemUpdates.map((i) => [i.itemId, i]));
            expect(byId.get(1)).toMatchObject({
                wins: 3,
                totalMatchEntries: 3,
            });
            expect(byId.get(3)).toMatchObject({
                wins: 1,
                totalMatchEntries: 2,
            });
            expect(byId.get(5)).toMatchObject({
                wins: 2,
                totalMatchEntries: 3,
            });
            expect(byId.get(7)).toMatchObject({
                wins: 1,
                totalMatchEntries: 2,
            });
            for (const even of [2, 4, 6, 8]) {
                expect(byId.get(even)).toMatchObject({
                    wins: 0,
                    totalMatchEntries: 1,
                });
            }
        });
    });

    it('cntSign=-1 mirrors cntSign=+1 exactly', () => {
        const forward = stats([1, 2, 3, 4, 5, 6, 7, 8], 1, 5, 1);
        const rollback = stats([1, 2, 3, 4, 5, 6, 7, 8], 1, 5, -1);

        // Normalize -0 to 0: the implementation writes a literal 0 (not -0) for
        // the "no count" branch, so negating a forward 0 must stay +0 to match.
        const neg = (x: number) => (x === 0 ? 0 : -x);
        const negateItem = (i: ItemUpdate): ItemUpdate => ({
            ...i,
            firstCount: neg(i.firstCount),
            secondCount: neg(i.secondCount),
            wins: neg(i.wins),
            tournamentEntries: neg(i.tournamentEntries),
            totalMatchEntries: neg(i.totalMatchEntries),
        });
        const negateMatch = (m: MatchUpdate): MatchUpdate => ({
            ...m,
            lowWins: neg(m.lowWins),
            highWins: neg(m.highWins),
            totalMatches: neg(m.totalMatches),
        });

        expect(rollback.itemUpdates).toEqual(
            forward.itemUpdates.map(negateItem),
        );
        expect(rollback.matchUpdates).toEqual(
            forward.matchUpdates.map(negateMatch),
        );
    });

    it('collapses duplicate itemIds into a single ItemUpdate', () => {
        const result = stats([10, 10], 10, 10);
        expect(result.itemUpdates).toEqual([
            item({
                itemId: 10,
                firstCount: 1,
                secondCount: 1,
                wins: 1,
                tournamentEntries: 1,
                totalMatchEntries: 2,
            }),
        ]);
        expect(result.matchUpdates).toEqual([
            match({ itemLowId: 10, itemHighId: 10, lowWins: 1 }),
        ]);
    });

    it('throws when the first round is odd', () => {
        expect(() => stats([1, 2, 3], 1, 2)).toThrow(
            'Invalid round array length (must be even): 3',
        );
    });

    it('throws when a later round becomes odd', () => {
        expect(() => stats([1, 2, 3, 4, 5, 6], 1, 2)).toThrow(
            'Invalid round array length (must be even): 3',
        );
    });

    it('throws on a non-array input', () => {
        expect(() =>
            extractMatchStats(
                null as unknown as number[],
                TOURNAMENT_ID,
                1,
                2,
                1,
            ),
        ).toThrow('entryItemIds must be an array');
    });

    it('handles a 1024-item bracket (load case)', () => {
        const entries = Array.from({ length: 1024 }, (_, i) => i);
        const result = stats(entries, 0, 512);

        expect(result.matchUpdates).toHaveLength(1023);
        expect(result.itemUpdates).toHaveLength(1024);
        expect(result.matchUpdates.every((m) => m.totalMatches === 1)).toBe(
            true,
        );

        const byId = new Map(result.itemUpdates.map((i) => [i.itemId, i]));
        expect(byId.get(0)).toMatchObject({
            firstCount: 1,
            wins: 10,
            totalMatchEntries: 10,
        });
        expect(byId.get(512)).toMatchObject({
            secondCount: 1,
            wins: 9,
            totalMatchEntries: 10,
        });
        expect(byId.get(1023)).toMatchObject({
            wins: 0,
            totalMatchEntries: 1,
        });
    });
});

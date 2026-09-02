import { TournamentSchema } from './tournament.schema';
import { BettingType, TournamentGenre } from 'src/module/common/util/enum.util';

describe('TournamentSchema (betting 확장)', () => {
    it('genre는 필수 enum, default tournament', () => {
        const path = TournamentSchema.path('genre');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBe(true);
        expect(path.options.default).toBe(TournamentGenre.TOURNAMENT);
        expect(path.options.enum).toEqual(TournamentGenre);
    });

    it('startedAt, endedAt는 nullable Date, default null', () => {
        for (const field of ['startedAt', 'endedAt']) {
            const path = TournamentSchema.path(field);
            expect(path.instance).toBe('Date');
            expect(path.options.required).toBeUndefined();
            expect(path.options.default).toBeNull();
        }
    });

    it('point는 옵셔널 number', () => {
        const path = TournamentSchema.path('point');
        expect(path.instance).toBe('Number');
        expect(path.options.required).toBeUndefined();
    });

    it('totalPrize, minBetAmount는 옵셔널 bigint-safe string', () => {
        for (const field of ['totalPrize', 'minBetAmount']) {
            const path = TournamentSchema.path(field);
            expect(path.instance).toBe('String');
            expect(path.options.required).toBeUndefined();
        }
    });

    it('bettingType는 옵셔널 enum(point|usdsc)', () => {
        const path = TournamentSchema.path('bettingType');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBeUndefined();
        expect(path.options.enum).toEqual(BettingType);
        expect(Object.values(BettingType)).toEqual(['point', 'usdsc']);
    });

    it('winItemId는 옵셔널 number, default null', () => {
        const path = TournamentSchema.path('winItemId');
        expect(path.instance).toBe('Number');
        expect(path.options.required).toBeUndefined();
        expect(path.options.default).toBeNull();
    });
});

describe('TournamentSchema indexes (period 필터 커버리지)', () => {
    // 각 인덱스의 키 이름을 선언 순서대로 추출한다(순서가 ESR 설계의 핵심).
    const indexKeySets: string[][] = TournamentSchema.indexes().map(([keys]) =>
        Object.keys(keys as Record<string, unknown>),
    );

    const findByPrefix = (prefix: string[]) =>
        indexKeySets.find(
            (keys) =>
                keys.length >= prefix.length &&
                prefix.every((key, i) => keys[i] === key),
        );

    // 직접 조회(findTournaments / findTournamentsByCategory)의 정렬 인덱스는
    // 정렬 키 뒤에 startedAt, endedAt이 "마지막 두 키"로 붙어야 한다(ESR).
    it.each([
        [['type', 'selectedCount', 'createdAt']],
        [['type', 'createdAt']],
        [['category', 'type', 'selectedCount', 'createdAt']],
        [['category', 'type', 'createdAt']],
    ])(
        'extends the %j index with startedAt,endedAt as the trailing keys',
        (prefix) => {
            expect(findByPrefix(prefix)).toEqual([
                ...prefix,
                'startedAt',
                'endedAt',
            ]);
        },
    );

    it('keeps the unique tournamentId index', () => {
        const unique = TournamentSchema.indexes().find(
            ([keys]) =>
                Object.keys(keys as Record<string, unknown>).join(',') ===
                'tournamentId',
        );
        expect(unique).toBeDefined();
        expect(unique?.[1]).toMatchObject({ unique: true });
    });
});

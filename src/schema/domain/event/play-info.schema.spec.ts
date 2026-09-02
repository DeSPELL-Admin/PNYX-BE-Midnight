import { PlayInfoSchema } from './play-info.schema';

describe('PlayInfoSchema (betting 확장)', () => {
    it('point는 옵셔널로 완화되어 default 0 제거됨', () => {
        const path = PlayInfoSchema.path('point');
        expect(path.instance).toBe('Number');
        expect(path.options.required).toBeUndefined();
        expect(path.options.default).toBeUndefined();
    });

    it('firstItemId, secondItemId는 옵셔널 number', () => {
        for (const field of ['firstItemId', 'secondItemId']) {
            const path = PlayInfoSchema.path(field);
            expect(path.instance).toBe('Number');
            expect(path.options.required).toBeUndefined();
        }
    });

    it('entryItemHexes, tournamentDataHash는 옵셔널 string (trim 유지)', () => {
        for (const field of ['entryItemHexes', 'tournamentDataHash']) {
            const path = PlayInfoSchema.path(field);
            expect(path.instance).toBe('String');
            expect(path.options.required).toBeUndefined();
            expect(path.options.trim).toBe(true);
        }
    });

    it('betItemId는 옵셔널 number', () => {
        const path = PlayInfoSchema.path('betItemId');
        expect(path.instance).toBe('Number');
        expect(path.options.required).toBeUndefined();
    });

    it('betAmount는 옵셔널 bigint-safe string', () => {
        const path = PlayInfoSchema.path('betAmount');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBeUndefined();
    });

    it('chainId, user, tournamentId 등 기존 필수 필드는 유지', () => {
        expect(PlayInfoSchema.path('chainId').options.required).toBe(true);
        expect(PlayInfoSchema.path('user').options.required).toBe(true);
        expect(PlayInfoSchema.path('tournamentId').options.required).toBe(true);
    });
});

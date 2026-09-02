import { ItemSchema } from './item.schema';

describe('ItemSchema (betting 확장)', () => {
    it('카운터 필드는 옵셔널로 완화되어 default 0 제거됨', () => {
        for (const field of [
            'firstCount',
            'secondCount',
            'wins',
            'tournamentEntries',
            'totalMatchEntries',
        ]) {
            const path = ItemSchema.path(field);
            expect(path.instance).toBe('Number');
            expect(path.options.required).toBeUndefined();
            expect(path.options.default).toBeUndefined();
        }
    });

    it('totalBetAmount는 옵셔널 bigint-safe string', () => {
        const path = ItemSchema.path('totalBetAmount');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBeUndefined();
    });

    it('tournamentId, itemId는 여전히 필수 number', () => {
        expect(ItemSchema.path('tournamentId').options.required).toBe(true);
        expect(ItemSchema.path('itemId').options.required).toBe(true);
    });
});

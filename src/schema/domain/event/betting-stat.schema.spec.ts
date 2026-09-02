import { Schema } from 'mongoose';
import { BettingStat, BettingStatSchema } from './betting-stat.schema';
import { BettingStatus } from 'src/module/common/util/enum.util';

const hasUniqueIndex = (
    schema: Schema,
    keys: Record<string, number>,
): boolean =>
    schema.indexes().some((entry) => {
        const [fields, options] = entry as [
            Record<string, number>,
            { unique?: boolean },
        ];
        return (
            options?.unique === true &&
            JSON.stringify(fields) === JSON.stringify(keys)
        );
    });

describe('BettingStatSchema', () => {
    it('walletAddress는 필수 lowercase string', () => {
        const path = BettingStatSchema.path('walletAddress');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBe(true);
        expect(path.options.lowercase).toBe(true);
        expect(path.options.trim).toBe(true);
    });

    it('tournamentId, itemId는 필수 number', () => {
        expect(BettingStatSchema.path('tournamentId').instance).toBe('Number');
        expect(BettingStatSchema.path('tournamentId').options.required).toBe(
            true,
        );
        expect(BettingStatSchema.path('itemId').instance).toBe('Number');
        expect(BettingStatSchema.path('itemId').options.required).toBe(true);
    });

    it('amount는 bigint-safe string, 필수, default "0"', () => {
        const path = BettingStatSchema.path('amount');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBe(true);
        expect(path.options.default).toBe('0');
    });

    it('status는 enum(ONGOING|PENDING|REWARDED), 필수, default ONGOING', () => {
        const path = BettingStatSchema.path('status');
        expect(path.options.required).toBe(true);
        expect(path.options.default).toBe(BettingStatus.ONGOING);
        expect(path.options.enum).toEqual(BettingStatus);
        expect(Object.values(BettingStatus)).toEqual([
            'ONGOING',
            'PENDING',
            'REWARDED',
        ]);
    });

    it('(walletAddress, tournamentId, itemId) unique 복합 인덱스', () => {
        expect(
            hasUniqueIndex(BettingStatSchema, {
                walletAddress: 1,
                tournamentId: 1,
                itemId: 1,
            }),
        ).toBe(true);
    });

    it('timestamps(createdAt/updatedAt) 자동 추가', () => {
        expect(BettingStatSchema.path('createdAt')).toBeDefined();
        expect(BettingStatSchema.path('updatedAt')).toBeDefined();
    });

    it('document 타입 클래스 export', () => {
        expect(BettingStat).toBeDefined();
    });
});

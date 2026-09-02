import { Schema } from 'mongoose';
import {
    VotePointManagerRequest,
    VotePointManagerRequestSchema,
} from './vote-point-manager-request.schema';

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

describe('VotePointManagerRequestSchema', () => {
    it('chainId, tournamentId, itemId는 필수 number', () => {
        for (const field of ['chainId', 'tournamentId', 'itemId']) {
            const path = VotePointManagerRequestSchema.path(field);
            expect(path.instance).toBe('Number');
            expect(path.options.required).toBe(true);
        }
    });

    it('walletAddress는 필수 lowercase string', () => {
        const path = VotePointManagerRequestSchema.path('walletAddress');
        expect(path.instance).toBe('String');
        expect(path.options.required).toBe(true);
        expect(path.options.lowercase).toBe(true);
    });

    it('amount, option, nonce, deadline, signature는 필수 string', () => {
        for (const field of [
            'amount',
            'option',
            'nonce',
            'deadline',
            'signature',
        ]) {
            const path = VotePointManagerRequestSchema.path(field);
            expect(path.instance).toBe('String');
            expect(path.options.required).toBe(true);
        }
    });

    it('(chainId, walletAddress, nonce) unique 복합 인덱스', () => {
        expect(
            hasUniqueIndex(VotePointManagerRequestSchema, {
                chainId: 1,
                walletAddress: 1,
                nonce: 1,
            }),
        ).toBe(true);
    });

    it('document 타입 클래스 export', () => {
        expect(VotePointManagerRequest).toBeDefined();
    });
});

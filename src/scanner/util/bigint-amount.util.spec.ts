import { addSignedAmount } from './bigint-amount.util';

describe('addSignedAmount', () => {
    it('adds a positive delta to a string amount', () => {
        expect(addSignedAmount('1000', '500')).toBe('1500');
    });

    it('applies a negative delta (cancel) down to a valid amount', () => {
        expect(addSignedAmount('1000', '-400')).toBe('600');
    });

    it('supports amounts beyond Number.MAX_SAFE_INTEGER (bigint-safe)', () => {
        expect(addSignedAmount('9007199254740993', '9007199254740993')).toBe(
            '18014398509481986',
        );
    });

    it('returns "0" when the delta exactly cancels the current amount', () => {
        expect(addSignedAmount('1000000000000000000', '-1000000000000000000')).toBe(
            '0',
        );
    });

    it('throws on underflow (result would be negative)', () => {
        expect(() => addSignedAmount('100', '-200')).toThrow(/amount underflow/);
    });
});

import { calculateBettingReward } from './betting-stat.util';

describe('calculateBettingReward', () => {
    it('computes floor(0.99 * totalPrize * amount / totalBetAmount) for integer-scale values', () => {
        // 0.99 * 1000 * 100 / 200 = 495
        expect(calculateBettingReward('1000', '100', '200')).toBe('495');
    });

    it('drops the fractional part (floor) of the result', () => {
        // 0.99 * 1000 * 101 / 200 = 499.95 -> 499
        expect(calculateBettingReward('1000', '101', '200')).toBe('499');
    });

    it('keeps full precision for 1e18-scale bigint-safe strings', () => {
        // 0.99 * 1e18 * 5e17 / 1e18 = 4.95e17
        expect(
            calculateBettingReward(
                '1000000000000000000', // 1e18 totalPrize
                '500000000000000000', // 5e17 amount
                '1000000000000000000', // 1e18 totalBetAmount
            ),
        ).toBe('495000000000000000');
    });

    it('floors a non-terminating wei-scale division instead of rounding', () => {
        // (99 * 1 * 1) / (100 * 3) = 99 / 300 = 0.33 -> 0
        expect(calculateBettingReward('1', '1', '3')).toBe('0');
    });

    it('returns null when amount is 0 (not greater than 0)', () => {
        expect(calculateBettingReward('1000', '0', '200')).toBeNull();
    });

    it('returns null when totalBetAmount is 0 (avoids divide-by-zero)', () => {
        expect(calculateBettingReward('1000', '100', '0')).toBeNull();
    });

    it('returns null when totalPrize is missing', () => {
        expect(calculateBettingReward(null, '100', '200')).toBeNull();
    });

    it('returns null when winItemTotalBetAmount is missing', () => {
        expect(calculateBettingReward('1000', '100', null)).toBeNull();
    });
});

import { calculateSkip } from './pagination.util';

describe('calculateSkip', () => {
    it.each([
        [1, 20, 0],
        [2, 20, 20],
        [5, 10, 40],
        [1, 1, 0],
        [3, 1, 2],
    ])('page %i, limit %i -> skip %i', (page, limit, expected) => {
        expect(calculateSkip(page, limit)).toBe(expected);
    });

    it('handles large page/limit without precision loss', () => {
        expect(calculateSkip(1_000_000, 50)).toBe(49_999_950);
    });

    it.each([
        [1, 0, 0],
        [7, 0, 0],
    ])('limit 0 always skips 0 (page %i)', (page, limit, expected) => {
        expect(calculateSkip(page, limit)).toBe(expected);
    });

    // Current behavior: page < 1 yields a negative skip. Callers (PaginationQueryDto)
    // enforce page >= 1, so this documents the raw arithmetic, it is not a target to "fix".
    it('page 0 produces a negative skip (documents current behavior)', () => {
        expect(calculateSkip(0, 20)).toBe(-20);
    });
});

import { toDate } from './timestamp.util';

describe('toDate', () => {
    it('converts unix seconds to a Date in milliseconds', () => {
        const result = toDate(1_700_000_000);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(1_700_000_000_000);
        expect(result.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    });

    it('maps 0 to the unix epoch', () => {
        expect(toDate(0).getTime()).toBe(0);
        expect(toDate(0).toISOString()).toBe('1970-01-01T00:00:00.000Z');
    });

    it('handles negative timestamps (before the epoch)', () => {
        expect(toDate(-1).getTime()).toBe(-1000);
    });
});

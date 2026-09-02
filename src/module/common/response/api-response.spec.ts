import { createPaginationData } from './api-response';

describe('createPaginationData', () => {
    it('first page with a non-divisible total rounds totalPages up', () => {
        expect(createPaginationData(1, 20, 101)).toEqual({
            page: 1,
            limit: 20,
            total: 101,
            totalPages: 6,
            hasNext: true,
            hasPrev: false,
        });
    });

    it('last page (rounded) has no next and has prev', () => {
        expect(createPaginationData(6, 20, 101)).toEqual({
            page: 6,
            limit: 20,
            total: 101,
            totalPages: 6,
            hasNext: false,
            hasPrev: true,
        });
    });

    it('middle page has both next and prev', () => {
        const result = createPaginationData(2, 20, 100);
        expect(result.totalPages).toBe(5);
        expect(result.hasNext).toBe(true);
        expect(result.hasPrev).toBe(true);
    });

    it('exact last page on a divisible total has no next', () => {
        const result = createPaginationData(5, 20, 100);
        expect(result.totalPages).toBe(5);
        expect(result.hasNext).toBe(false);
        expect(result.hasPrev).toBe(true);
    });

    it('zero total yields zero pages and no navigation', () => {
        expect(createPaginationData(1, 20, 0)).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
        });
    });

    it('single full page', () => {
        const result = createPaginationData(1, 1, 1);
        expect(result.totalPages).toBe(1);
        expect(result.hasNext).toBe(false);
        expect(result.hasPrev).toBe(false);
    });

    it('page 0 has no prev (documents current behavior)', () => {
        expect(createPaginationData(0, 20, 100).hasPrev).toBe(false);
    });

    // Current behavior with a degenerate limit of 0: Math.ceil(total/0) === Infinity / NaN.
    // Callers cap limit at 1..100, so these pin the raw math rather than a desired API.
    it('limit 0 with a positive total gives Infinity pages and hasNext true', () => {
        const result = createPaginationData(1, 0, 50);
        expect(result.totalPages).toBe(Infinity);
        expect(result.hasNext).toBe(true);
    });

    it('limit 0 with zero total gives NaN pages and hasNext false', () => {
        const result = createPaginationData(1, 0, 0);
        expect(result.totalPages).toBeNaN();
        expect(result.hasNext).toBe(false);
    });
});

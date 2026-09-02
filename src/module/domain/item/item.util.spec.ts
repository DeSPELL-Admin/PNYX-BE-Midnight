import { pickRandomNumbers } from './item.util';

describe('pickRandomNumbers', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('properties (real RNG)', () => {
        it('returns B unique in-range integers over many iterations', () => {
            for (let iter = 0; iter < 200; iter++) {
                const result = pickRandomNumbers(50, 10);
                expect(result).toHaveLength(10);
                expect(result.every((n) => Number.isInteger(n))).toBe(true);
                expect(result.every((n) => n >= 0 && n < 50)).toBe(true);
                expect(new Set(result).size).toBe(10);
            }
        });

        it('returns a full permutation when B === A', () => {
            const result = pickRandomNumbers(16, 16);
            expect([...result].sort((a, b) => a - b)).toEqual(
                Array.from({ length: 16 }, (_, i) => i),
            );
        });

        it.each([
            [0, 0, []],
            [1, 1, [0]],
            [5, 0, []],
        ])('pickRandomNumbers(%i, %i) -> %p', (a, b, expected) => {
            expect(pickRandomNumbers(a, b)).toEqual(expected);
        });
    });

    describe('deterministic with mocked Math.random', () => {
        it('all-zero random keeps the identity prefix', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0);
            expect(pickRandomNumbers(5, 3)).toEqual([0, 1, 2]);
        });

        it('near-one random swaps each slot with the tail', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.9999999);
            expect(pickRandomNumbers(5, 3)).toEqual([4, 0, 1]);
        });

        it('matches a hand-traced Fisher-Yates prefix', () => {
            jest.spyOn(Math, 'random')
                .mockReturnValueOnce(0.5)
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(0.5);
            expect(pickRandomNumbers(4, 3)).toEqual([2, 1, 3]);
        });
    });

    describe('statistical sanity (real RNG)', () => {
        it('draws each of 4 values roughly uniformly', () => {
            const counts = [0, 0, 0, 0];
            for (let i = 0; i < 10_000; i++) {
                counts[pickRandomNumbers(4, 1)[0]]++;
            }
            for (const c of counts) {
                expect(c).toBeGreaterThan(2200);
                expect(c).toBeLessThan(2800);
            }
        });
    });

    describe('load', () => {
        it('produces a full permutation of 100k elements', () => {
            const result = pickRandomNumbers(100_000, 100_000);
            expect(result).toHaveLength(100_000);
            expect(new Set(result).size).toBe(100_000);
            expect(Math.min(...result)).toBe(0);
            expect(Math.max(...result)).toBe(99_999);
        }, 30000);

        it('picks a small subset from a large pool quickly', () => {
            const result = pickRandomNumbers(100_000, 10);
            expect(result).toHaveLength(10);
            expect(new Set(result).size).toBe(10);
        });
    });
});

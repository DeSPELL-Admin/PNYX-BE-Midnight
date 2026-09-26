import {
    buyerPkHex,
    canonicalDatasetJson,
    canonicalQuerySpec,
    newOrderId,
    resolveItemNames,
    sha256HexUtf8,
    specHashHex,
} from './market';

describe('market.ts', () => {
    describe('buyerPkHex', () => {
        it('is deterministic for the same address', () => {
            const a = buyerPkHex('0xAbC123');
            const b = buyerPkHex('0xAbC123');

            expect(a).toBe(b);
            expect(a).toMatch(/^[0-9a-f]{64}$/);
        });

        it('normalizes the address to lowercase before hashing', () => {
            expect(buyerPkHex('0xAbC123')).toBe(buyerPkHex('0xabc123'));
        });

        it('produces different output for different addresses', () => {
            expect(buyerPkHex('0xabc123')).not.toBe(buyerPkHex('0xdef456'));
        });
    });

    describe('canonicalQuerySpec', () => {
        it('produces the exact fixed byte layout with keys in order v, product, tournamentId, orderId', () => {
            const spec = canonicalQuerySpec(7, 'abc123');

            expect(spec).toBe(
                '{"v":1,"product":"rows","tournamentId":7,"orderId":"abc123"}',
            );
        });

        it('does not embed rowCount (uniqueness comes from orderId alone)', () => {
            const spec = canonicalQuerySpec(7, 'abc123');

            expect(spec).not.toContain('rowCount');
        });
    });

    describe('specHashHex', () => {
        it('matches a known sha256(utf8) test vector', () => {
            const spec = canonicalQuerySpec(7, 'abc123');

            expect(spec).toBe(
                '{"v":1,"product":"rows","tournamentId":7,"orderId":"abc123"}',
            );
            expect(specHashHex(spec)).toBe(
                'ae83227b11137676918473ba1afb69da3ab24dea50c397bc9720c77151639b06',
            );
        });
    });

    describe('resolveItemNames', () => {
        const names = new Map<number, string>([
            [3, 'Berserk'],
            [10, 'Crayon Shinchan'],
        ]);

        it('fills itemName and bracketNames in the same order/length as bracket', () => {
            const [row] = resolveItemNames(
                [
                    {
                        tournamentId: 0,
                        itemId: 3,
                        bracket: [3, 10],
                        segment: 'all',
                        salt: 'saltA',
                    },
                ],
                names,
            );

            expect(row.itemName).toBe('Berserk');
            expect(row.bracketNames).toEqual(['Berserk', 'Crayon Shinchan']);
            expect(row.bracketNames).toHaveLength(row.bracket.length);
        });

        it('falls back to #<id> for an itemId missing from the name map', () => {
            const [row] = resolveItemNames(
                [
                    {
                        tournamentId: 0,
                        itemId: 42,
                        bracket: [3, 42],
                        segment: 'all',
                        salt: 's',
                    },
                ],
                names,
            );

            expect(row.itemName).toBe('#42');
            expect(row.bracketNames).toEqual(['Berserk', '#42']);
        });

        it('treats a missing bracket as an empty array', () => {
            const [row] = resolveItemNames(
                [
                    {
                        tournamentId: 0,
                        itemId: 3,
                        segment: 'all',
                        salt: 's',
                    } as any,
                ],
                names,
            );

            expect(row.bracket).toEqual([]);
            expect(row.bracketNames).toEqual([]);
        });
    });

    describe('canonicalDatasetJson', () => {
        it('emits v2 with key order v, tournamentId, tournamentTitle, orderId, rowCount, rows', () => {
            const json = canonicalDatasetJson({
                tournamentId: 0,
                tournamentTitle: 'Anime Series World Cup',
                orderId: 'abc123',
                rows: [
                    {
                        tournamentId: 0,
                        itemId: 3,
                        itemName: 'Berserk',
                        bracket: [3, 10],
                        bracketNames: ['Berserk', 'Crayon Shinchan'],
                        segment: 'all',
                        salt: 'saltA',
                    },
                ],
            });

            expect(json).toBe(
                '{"v":2,"tournamentId":0,"tournamentTitle":"Anime Series World Cup","orderId":"abc123","rowCount":1,"rows":[{"tournamentId":0,"itemId":3,"itemName":"Berserk","bracket":[3,10],"bracketNames":["Berserk","Crayon Shinchan"],"segment":"all","salt":"saltA"}]}',
            );
        });

        it('fixes the per-row key order and auto-computes rowCount across rows', () => {
            const json = canonicalDatasetJson({
                tournamentId: 7,
                tournamentTitle: 'T7',
                orderId: 'abc123',
                rows: [
                    {
                        tournamentId: 7,
                        itemId: 1,
                        itemName: 'One',
                        bracket: [1, 2],
                        bracketNames: ['One', 'Two'],
                        segment: 'A',
                        salt: 'saltA',
                    },
                    {
                        tournamentId: 7,
                        itemId: 2,
                        itemName: 'Two',
                        bracket: [1, 2],
                        bracketNames: ['One', 'Two'],
                        segment: 'B',
                        salt: 'saltB',
                    },
                ],
            });

            expect(json).toBe(
                '{"v":2,"tournamentId":7,"tournamentTitle":"T7","orderId":"abc123","rowCount":2,"rows":[{"tournamentId":7,"itemId":1,"itemName":"One","bracket":[1,2],"bracketNames":["One","Two"],"segment":"A","salt":"saltA"},{"tournamentId":7,"itemId":2,"itemName":"Two","bracket":[1,2],"bracketNames":["One","Two"],"segment":"B","salt":"saltB"}]}',
            );
        });

        it('accepts rows straight out of resolveItemNames', () => {
            const json = canonicalDatasetJson({
                tournamentId: 0,
                tournamentTitle: 'Anime Series World Cup',
                orderId: 'abc123',
                rows: resolveItemNames(
                    [
                        {
                            tournamentId: 0,
                            itemId: 3,
                            bracket: [3, 10],
                            segment: 'all',
                            salt: 'saltA',
                        },
                    ],
                    new Map([
                        [3, 'Berserk'],
                        [10, 'Crayon Shinchan'],
                    ]),
                ),
            });

            expect(json).toBe(
                '{"v":2,"tournamentId":0,"tournamentTitle":"Anime Series World Cup","orderId":"abc123","rowCount":1,"rows":[{"tournamentId":0,"itemId":3,"itemName":"Berserk","bracket":[3,10],"bracketNames":["Berserk","Crayon Shinchan"],"segment":"all","salt":"saltA"}]}',
            );
        });

        it('recomputes rowCount from rows.length rather than trusting an input field', () => {
            const json = canonicalDatasetJson({
                tournamentId: 1,
                tournamentTitle: 'T1',
                orderId: 'x',
                rows: [],
            });
            const parsed = JSON.parse(json);

            expect(parsed.v).toBe(2);
            expect(parsed.rowCount).toBe(0);
            expect(parsed.rows).toEqual([]);
        });

        it('never includes walletAddress even if a caller smuggles it into a row object', () => {
            const json = canonicalDatasetJson({
                tournamentId: 1,
                tournamentTitle: 'T1',
                orderId: 'x',
                rows: [
                    {
                        tournamentId: 1,
                        itemId: 1,
                        itemName: 'One',
                        bracket: [1, 2],
                        bracketNames: ['One', 'Two'],
                        segment: 'A',
                        salt: 's',
                        walletAddress: '0xdead',
                    } as any,
                ],
            });

            expect(json).not.toContain('walletAddress');
            expect(json).not.toContain('0xdead');
        });

        it('contains no newlines or extra whitespace', () => {
            const json = canonicalDatasetJson({
                tournamentId: 1,
                tournamentTitle: 'T1',
                orderId: 'x',
                rows: [
                    {
                        tournamentId: 1,
                        itemId: 1,
                        itemName: 'One',
                        bracket: [1, 2],
                        bracketNames: ['One', 'Two'],
                        segment: 'A',
                        salt: 's',
                    },
                ],
            });

            expect(json).not.toMatch(/[\n\r]/);
            expect(json).not.toMatch(/,\s|:\s/);
        });
    });

    describe('sha256HexUtf8', () => {
        it('is deterministic and returns 64 lowercase hex chars', () => {
            const a = sha256HexUtf8('hello');
            const b = sha256HexUtf8('hello');

            expect(a).toBe(b);
            expect(a).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    describe('newOrderId', () => {
        it('returns a 32-char lowercase hex string with no dashes', () => {
            const id = newOrderId();

            expect(id).toMatch(/^[0-9a-f]{32}$/);
        });

        it('is unique across calls', () => {
            const ids = new Set(Array.from({ length: 20 }, () => newOrderId()));

            expect(ids.size).toBe(20);
        });
    });
});

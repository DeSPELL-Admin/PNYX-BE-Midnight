import { normalizeDocuments } from './normalize-seed';

describe('normalizeDocuments', () => {
    const itemOptions = {
        dedupKeys: ['tournamentId', 'itemId'],
        resetFields: [
            'firstCount',
            'secondCount',
            'wins',
            'tournamentEntries',
            'totalMatchEntries',
        ],
    };

    it('removes the top-level chainId field from every kept document', () => {
        const docs = [
            { _id: 'a', chainId: 1946, tournamentId: 0, itemId: 0 },
            { _id: 'b', chainId: 1868, tournamentId: 0, itemId: 0 },
        ];

        const { normalized } = normalizeDocuments(docs, itemOptions);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]).not.toHaveProperty('chainId');
    });

    it('resets every accumulated field to 0, even when populated', () => {
        const docs = [
            {
                _id: 'a',
                chainId: 1946,
                tournamentId: 0,
                itemId: 0,
                firstCount: 4,
                secondCount: 2,
                wins: 3,
                tournamentEntries: 2,
                totalMatchEntries: 5,
            },
            { _id: 'b', chainId: 1868, tournamentId: 0, itemId: 0 },
        ];

        const { normalized } = normalizeDocuments(docs, itemOptions);

        expect(normalized[0]).toMatchObject({
            firstCount: 0,
            secondCount: 0,
            wins: 0,
            tournamentEntries: 0,
            totalMatchEntries: 0,
        });
    });

    it('dedups by composite key and keeps the first occurrence (and its _id)', () => {
        const docs = [
            { _id: 'keep', chainId: 1946, tournamentId: 1, itemId: 7, name: 'first' },
            { _id: 'drop', chainId: 1868, tournamentId: 1, itemId: 7, name: 'second' },
        ];

        const { normalized, removedCount } = normalizeDocuments(docs, itemOptions);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]._id).toBe('keep');
        expect(normalized[0].name).toBe('first');
        expect(removedCount).toBe(1);
    });

    it('treats different composite keys as distinct documents', () => {
        const docs = [
            { _id: 'a', chainId: 1946, tournamentId: 1, itemId: 0 },
            { _id: 'b', chainId: 1946, tournamentId: 1, itemId: 1 },
            { _id: 'c', chainId: 1868, tournamentId: 1, itemId: 0 },
            { _id: 'd', chainId: 1868, tournamentId: 1, itemId: 1 },
        ];

        const { normalized, originalCount, removedCount } = normalizeDocuments(
            docs,
            itemOptions,
        );

        expect(originalCount).toBe(4);
        expect(normalized).toHaveLength(2);
        expect(removedCount).toBe(2);
        expect(normalized.map((d) => d._id)).toEqual(['a', 'b']);
    });

    it('preserves fields that are not in resetFields', () => {
        const docs = [
            {
                _id: 'a',
                chainId: 1946,
                tournamentId: 0,
                itemId: 0,
                name: 'Attack on Titan',
                imageName: 'AttackonTitan-0',
                __v: 0,
            },
        ];

        const { normalized } = normalizeDocuments(docs, itemOptions);

        expect(normalized[0]).toMatchObject({
            name: 'Attack on Titan',
            imageName: 'AttackonTitan-0',
            __v: 0,
        });
    });

    it('flags composite keys that do not appear exactly twice', () => {
        const docs = [
            { _id: 'a', chainId: 1946, tournamentId: 0, itemId: 0 }, // once only
            { _id: 'b', chainId: 1946, tournamentId: 0, itemId: 1 }, // thrice
            { _id: 'c', chainId: 1868, tournamentId: 0, itemId: 1 },
            { _id: 'd', chainId: 99, tournamentId: 0, itemId: 1 },
            { _id: 'e', chainId: 1946, tournamentId: 0, itemId: 2 }, // exactly twice (ok)
            { _id: 'f', chainId: 1868, tournamentId: 0, itemId: 2 },
        ];

        const { unexpectedDuplicateKeys } = normalizeDocuments(docs, itemOptions);

        // key (0,0) appears once and (0,1) appears three times -> both flagged; (0,2) is fine
        expect(unexpectedDuplicateKeys).toHaveLength(2);
        expect(unexpectedDuplicateKeys).toContain('0|0');
        expect(unexpectedDuplicateKeys).toContain('0|1');
        expect(unexpectedDuplicateKeys).not.toContain('0|2');
    });

    it('supports a single-field dedup key (tournaments)', () => {
        const tournamentOptions = {
            dedupKeys: ['tournamentId'],
            resetFields: ['selectedCount'],
        };
        const docs = [
            { _id: 't1', chainId: 1946, tournamentId: 0, selectedCount: 19, title: 'x' },
            { _id: 't2', chainId: 1868, tournamentId: 0, selectedCount: 0, title: 'x' },
        ];

        const { normalized } = normalizeDocuments(docs, tournamentOptions);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]._id).toBe('t1');
        expect(normalized[0].selectedCount).toBe(0);
        expect(normalized[0]).not.toHaveProperty('chainId');
    });
});

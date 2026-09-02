import { createHash, randomUUID } from 'node:crypto';

/**
 * Pure helpers for the data-market order pipeline. No SDK imports here (see
 * midnight.service.ts's ESM caveat) — only `node:crypto`, so this file is
 * jest-testable under ts-node, unlike the rest of `src/module/midnight`.
 */

export function sha256HexUtf8(s: string): string {
    return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function buyerPkHex(walletAddress: string): string {
    return sha256HexUtf8(walletAddress.toLowerCase());
}

// orderId makes this unique on its own — no rowCount here (see plan review note:
// order-time rowCount and fulfill's re-derived rowCount could otherwise diverge).
export function canonicalQuerySpec(
    tournamentId: number,
    orderId: string,
): string {
    return JSON.stringify({ v: 1, product: 'rows', tournamentId, orderId });
}

export function specHashHex(querySpec: string): string {
    return sha256HexUtf8(querySpec);
}

export interface CanonicalDatasetRow {
    tournamentId: number;
    itemId: number;
    /** LWA final array — 구매자가 bracketHash 를 재계산해 온체인 커밋과 대조하는 원문 */
    bracket: number[];
    segment: string;
    salt: string;
}

// walletAddress must never appear in this payload.
export function canonicalDatasetJson(args: {
    tournamentId: number;
    orderId: string;
    rows: CanonicalDatasetRow[];
}): string {
    const { tournamentId, orderId, rows } = args;

    return JSON.stringify({
        v: 1,
        tournamentId,
        orderId,
        rowCount: rows.length,
        rows: rows.map((row) => ({
            tournamentId: row.tournamentId,
            itemId: row.itemId,
            bracket: row.bracket,
            segment: row.segment,
            salt: row.salt,
        })),
    });
}

export function newOrderId(): string {
    return randomUUID().replace(/-/g, '');
}

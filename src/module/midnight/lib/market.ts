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
    /** 최종 선택 아이템의 표시 이름 (v2) */
    itemName: string;
    /** LWA final array — 구매자가 bracketHash 를 재계산해 온체인 커밋과 대조하는 원문 */
    bracket: number[];
    /** bracket 과 같은 길이·순서의 표시 이름 배열 (v2) */
    bracketNames: string[];
    segment: string;
    salt: string;
}

/** 이름이 아직 채워지지 않은 escrow 원본 로우 — fulfill 이 resolveItemNames 로 승격시킨다. */
export type CanonicalDatasetRowInput = Omit<
    CanonicalDatasetRow,
    'itemName' | 'bracketNames'
>;

/** 알 수 없는 itemId 는 `#<id>` 로 폴백한다 — 데이터셋 바이트는 항상 결정적이어야 한다. */
function nameOf(nameByItemId: Map<number, string>, itemId: number): string {
    return nameByItemId.get(itemId) ?? `#${itemId}`;
}

export function resolveItemNames(
    rows: CanonicalDatasetRowInput[],
    nameByItemId: Map<number, string>,
): CanonicalDatasetRow[] {
    return rows.map((row) => ({
        tournamentId: row.tournamentId,
        itemId: row.itemId,
        itemName: nameOf(nameByItemId, row.itemId),
        bracket: row.bracket ?? [],
        bracketNames: (row.bracket ?? []).map((id) => nameOf(nameByItemId, id)),
        segment: row.segment,
        salt: row.salt,
    }));
}

// walletAddress must never appear in this payload.
// 키 순서 자체가 계약이다 — sha256(이 바이트)가 온체인 License.datasetHash 로 고정된다.
export function canonicalDatasetJson(args: {
    tournamentId: number;
    tournamentTitle: string;
    orderId: string;
    rows: CanonicalDatasetRow[];
}): string {
    const { tournamentId, tournamentTitle, orderId, rows } = args;

    return JSON.stringify({
        v: 2,
        tournamentId,
        tournamentTitle,
        orderId,
        rowCount: rows.length,
        rows: rows.map((row) => ({
            tournamentId: row.tournamentId,
            itemId: row.itemId,
            itemName: row.itemName,
            bracket: row.bracket,
            bracketNames: row.bracketNames,
            segment: row.segment,
            salt: row.salt,
        })),
    });
}

export function newOrderId(): string {
    return randomUUID().replace(/-/g, '');
}

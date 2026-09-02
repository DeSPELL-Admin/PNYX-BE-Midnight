/** Byte length of a 0x-prefixed, even-length hex string. */
export function getTournamentDataByteLength(tournamentData: string): number {
    return (tournamentData.length - 2) / 2;
}

export function isValidBracketByteLength(byteLength: number): boolean {
    return byteLength >= 4 && byteLength <= 2048 && (byteLength & (byteLength - 1)) === 0;
}

export function hasDuplicateIds(ids: number[]): boolean {
    return new Set(ids).size !== ids.length;
}

export function sortedEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x - y);
    const sb = [...b].sort((x, y) => x - y);
    return sa.every((value, index) => value === sb[index]);
}

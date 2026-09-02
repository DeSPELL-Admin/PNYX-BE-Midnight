export function tournamentDataToUint16Array(
    tournamentData: `0x${string}`,
): number[] {
    const buf = Buffer.from(tournamentData.slice(2), 'hex');

    if (buf.length % 2 !== 0) {
        throw new Error('Invalid tournamentData length (must be even)');
    }

    const out = new Array<number>(buf.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = buf.readUInt16BE(i * 2);
    }
    return out;
}

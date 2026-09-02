import { tournamentDataToUint16Array } from './hex-conversion.util';

describe('tournamentDataToUint16Array', () => {
    it('decodes big-endian uint16 words', () => {
        expect(tournamentDataToUint16Array('0x000a0014001e0028')).toEqual([
            10, 20, 30, 40,
        ]);
    });

    it('returns an empty array for "0x"', () => {
        expect(tournamentDataToUint16Array('0x')).toEqual([]);
    });

    it('reads bytes in big-endian order', () => {
        expect(tournamentDataToUint16Array('0x0100')).toEqual([256]);
        expect(tournamentDataToUint16Array('0x0001')).toEqual([1]);
    });

    it('handles values above one byte', () => {
        expect(tournamentDataToUint16Array('0xffff')).toEqual([65535]);
        expect(tournamentDataToUint16Array('0x01ff')).toEqual([511]);
    });

    it('throws on an odd byte count', () => {
        expect(() => tournamentDataToUint16Array('0x0a0b0c')).toThrow(
            'Invalid tournamentData length (must be even)',
        );
    });

    // Buffer.from(_, 'hex') stops at the first invalid hex pair, so trailing
    // garbage is silently dropped. Pins this surprising decode behavior.
    it('silently truncates at invalid hex characters', () => {
        expect(tournamentDataToUint16Array('0x000azz')).toEqual([10]);
    });

    it('round-trips a 2048-entry payload', () => {
        const hex =
            '0x' +
            Array.from({ length: 2048 }, (_, i) =>
                i.toString(16).padStart(4, '0'),
            ).join('');
        const out = tournamentDataToUint16Array(hex as `0x${string}`);
        expect(out).toHaveLength(2048);
        expect(out[0]).toBe(0);
        expect(out[255]).toBe(255);
        expect(out[2047]).toBe(2047);
    });
});

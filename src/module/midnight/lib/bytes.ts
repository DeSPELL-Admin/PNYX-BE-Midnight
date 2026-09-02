export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export function fromHex(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) throw new Error('invalid hex');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return out;
}

export function bytes32(hex: string, label = 'value'): Uint8Array {
    const b = fromHex(hex);
    if (b.length !== 32) throw new Error(`${label} must be 32 bytes`);
    return b;
}

/** Compact `pad(32, s)` */
export function pad32(text: string): Uint8Array {
    const enc = new TextEncoder().encode(text);
    if (enc.length > 32) throw new Error(`pad32: "${text}" exceeds 32 bytes`);
    const out = new Uint8Array(32);
    out.set(enc, 0);
    return out;
}

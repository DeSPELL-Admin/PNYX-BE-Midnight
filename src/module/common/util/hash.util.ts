import { createHmac, timingSafeEqual } from 'crypto';
import { getEnv } from 'src/util/env.util';

export function hash(value: string): string {
    return hashOpaqueValue(value, hashPepper());
}

function hashPepper(): string {
    return getEnv('HASH_PEPPER');
}

function hashOpaqueValue(value: string, pepper: string): string {
    return createHmac('sha256', pepper).update(value).digest('hex');
}

export function safeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

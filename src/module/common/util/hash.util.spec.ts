import { hash, safeEqualHex } from './hash.util';
import { snapshotEnv } from 'src/test-utils/env';

describe('hash.util', () => {
    const env = snapshotEnv(['HASH_PEPPER']);

    beforeAll(() => {
        env.save();
        process.env.HASH_PEPPER = 'pepper-1';
    });
    afterAll(env.restore);

    describe('hash', () => {
        it('produces a deterministic 64-char hex HMAC for the same input', () => {
            const a = hash('hello');
            const b = hash('hello');

            expect(a).toBe(b);
            expect(a).toMatch(/^[0-9a-f]{64}$/);
        });

        it('produces different output for different input', () => {
            expect(hash('alice')).not.toBe(hash('bob'));
        });

        it('output depends on the pepper', () => {
            const withPepper1 = hash('same-input');

            process.env.HASH_PEPPER = 'pepper-2';
            const withPepper2 = hash('same-input');
            process.env.HASH_PEPPER = 'pepper-1';

            expect(withPepper2).not.toBe(withPepper1);
        });
    });

    describe('safeEqualHex', () => {
        it('returns true for identical hex strings', () => {
            expect(safeEqualHex('abcd1234', 'abcd1234')).toBe(true);
        });

        it('returns false for different hex of equal length', () => {
            expect(safeEqualHex('abcd1234', 'abcd1235')).toBe(false);
        });

        it('returns false when lengths differ', () => {
            expect(safeEqualHex('abcd', 'abcd1234')).toBe(false);
        });
    });
});

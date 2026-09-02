import { getEnv } from './env.util';

const KEY = '__ENV_UTIL_SPEC_KEY__';

describe('getEnv', () => {
    afterEach(() => {
        delete process.env[KEY];
    });

    it('returns the value when the variable is set', () => {
        process.env[KEY] = 'abc';
        expect(getEnv(KEY)).toBe('abc');
    });

    it('throws when the variable is missing', () => {
        delete process.env[KEY];
        expect(() => getEnv(KEY)).toThrow(`Missing env: ${KEY}`);
    });

    // The implementation uses a falsy check, so an empty string is treated as missing.
    it('throws when the variable is an empty string (documents falsy check)', () => {
        process.env[KEY] = '';
        expect(() => getEnv(KEY)).toThrow(`Missing env: ${KEY}`);
    });
});

import {
    accessCookieOptions,
    clearAuthCookies,
    getCookieNames,
    nonceCookieOptions,
    refreshCookieOptions,
} from './cookie.util';
import { snapshotEnv } from 'src/test-utils/env';
import type { Response } from 'express';

describe('cookie.util', () => {
    const env = snapshotEnv([
        'NODE_ENV',
        'COOKIE_SAME_SITE',
        'ACCESS_TOKEN_EXPIRES_IN',
        'REFRESH_TOKEN_EXPIRES_IN',
        'SIWE_NONCE_TTL',
    ]);

    beforeAll(env.save);
    afterAll(env.restore);

    beforeEach(() => {
        process.env.COOKIE_SAME_SITE = 'none';
        process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
        process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
        process.env.SIWE_NONCE_TTL = '5m';
    });

    describe('getCookieNames', () => {
        it('uses plain names in local', () => {
            process.env.NODE_ENV = 'local';
            expect(getCookieNames()).toEqual({
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
                siweNonce: 'siwe_nonce',
            });
        });

        it('prefixes names with __Host- outside local', () => {
            process.env.NODE_ENV = 'production';
            expect(getCookieNames()).toEqual({
                accessToken: '__Host-access_token',
                refreshToken: '__Host-refresh_token',
                siweNonce: '__Host-siwe_nonce',
            });
        });
    });

    describe('cookie options', () => {
        it('marks cookies httpOnly + partitioned, secure only outside local', () => {
            process.env.NODE_ENV = 'local';
            const local = accessCookieOptions();
            expect(local.httpOnly).toBe(true);
            expect(local.partitioned).toBe(false);
            expect(local.secure).toBe(false);
            expect(local.sameSite).toBe('lax');
            expect(local.path).toBe('/');

            process.env.NODE_ENV = 'production';
            expect(accessCookieOptions().secure).toBe(true);
        });

        it('derives maxAge from the matching expiry env', () => {
            process.env.NODE_ENV = 'local';
            expect(accessCookieOptions().maxAge).toBe(15 * 60_000);
            expect(refreshCookieOptions().maxAge).toBe(7 * 86_400_000);
            expect(nonceCookieOptions().maxAge).toBe(5 * 60_000);
        });

        it('falls back to lax for an invalid sameSite value', () => {
            process.env.NODE_ENV = 'local';
            process.env.COOKIE_SAME_SITE = 'bogus';
            expect(accessCookieOptions().sameSite).toBe('lax');
        });
    });

    describe('clearAuthCookies', () => {
        it('clears all three auth cookies', () => {
            process.env.NODE_ENV = 'local';
            const cleared: string[] = [];
            const response = {
                clearCookie: (name: string) => cleared.push(name),
            } as unknown as Response;

            clearAuthCookies(response);

            expect(cleared).toEqual([
                'access_token',
                'refresh_token',
                'siwe_nonce',
            ]);
        });
    });
});

import { UnauthorizedException } from '@nestjs/common';
import {
    buildJwtSignOptions,
    buildJwtVerifyOptions,
    resolveRequestAudience,
} from './jwt.util';
import { snapshotEnv } from 'src/test-utils/env';
import type { Request } from 'express';

describe('jwt.util', () => {
    const env = snapshotEnv([
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_ISSUER',
        'JWT_AUDIENCES',
    ]);

    beforeAll(() => {
        env.save();
        process.env.JWT_ACCESS_SECRET = 'access-secret';
        process.env.JWT_REFRESH_SECRET = 'refresh-secret';
        process.env.JWT_ISSUER = 'pnyx-test';
        process.env.JWT_AUDIENCES = 'http://a.com | http://b.com';
    });
    afterAll(env.restore);

    describe('buildJwtSignOptions', () => {
        it('uses the access secret and converts expiresIn to ms', () => {
            const opts = buildJwtSignOptions('15m', 'access', 'http://a.com');
            expect(opts.secret).toBe('access-secret');
            expect(opts.expiresIn).toBe(15 * 60_000);
            expect(opts.algorithm).toBe('HS256');
            expect(opts.issuer).toBe('pnyx-test');
            expect(opts.audience).toBe('http://a.com');
        });

        it('uses the refresh secret for refresh tokens', () => {
            expect(
                buildJwtSignOptions('7d', 'refresh', 'http://a.com').secret,
            ).toBe('refresh-secret');
        });
    });

    describe('buildJwtVerifyOptions', () => {
        it('verifies against the parsed audience list when no audience is given', () => {
            const opts = buildJwtVerifyOptions('access');
            expect(opts.secret).toBe('access-secret');
            expect(opts.algorithms).toEqual(['HS256']);
            expect(opts.audience).toEqual(['http://a.com', 'http://b.com']);
        });

        it('verifies against the explicit audience when provided', () => {
            expect(buildJwtVerifyOptions('refresh', 'http://b.com')).toEqual(
                expect.objectContaining({
                    secret: 'refresh-secret',
                    audience: 'http://b.com',
                }),
            );
        });
    });

    describe('resolveRequestAudience', () => {
        const req = (headers: Record<string, string>, method = 'GET') =>
            ({ headers, method }) as unknown as Request;

        it('returns the origin of the Origin header', () => {
            expect(
                resolveRequestAudience(req({ origin: 'http://a.com/path' })),
            ).toBe('http://a.com');
        });

        it('falls back to the Referer origin', () => {
            expect(
                resolveRequestAudience(req({ referer: 'http://b.com/x/y' })),
            ).toBe('http://b.com');
        });

        it('returns undefined for safe methods with no origin/referer', () => {
            expect(resolveRequestAudience(req({}, 'GET'))).toBeUndefined();
        });

        it('throws for mutating methods with no origin/referer', () => {
            expect(() => resolveRequestAudience(req({}, 'POST'))).toThrow(
                UnauthorizedException,
            );
        });

        it('throws for a malformed origin', () => {
            expect(() =>
                resolveRequestAudience(req({ origin: 'not-a-url' })),
            ).toThrow(UnauthorizedException);
        });
    });
});

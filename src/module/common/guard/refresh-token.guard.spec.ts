import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenGuard, RequestWithPayload } from './refresh-token.guard';
import { snapshotEnv } from 'src/test-utils/env';

describe('RefreshTokenGuard', () => {
    const env = snapshotEnv([
        'NODE_ENV',
        'COOKIE_SAME_SITE',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_ISSUER',
        'JWT_AUDIENCES',
    ]);
    let jwtService: { verifyAsync: jest.Mock };
    let guard: RefreshTokenGuard;
    let clearCookie: jest.Mock;

    beforeAll(() => {
        env.save();
        process.env.NODE_ENV = 'local';
        process.env.COOKIE_SAME_SITE = 'lax';
        process.env.JWT_ACCESS_SECRET = 'access-secret';
        process.env.JWT_REFRESH_SECRET = 'refresh-secret';
        process.env.JWT_ISSUER = 'pnyx-test';
        process.env.JWT_AUDIENCES = 'http://localhost:3000';
    });
    afterAll(env.restore);

    beforeEach(() => {
        jwtService = { verifyAsync: jest.fn() };
        guard = new RefreshTokenGuard(jwtService as unknown as JwtService);
        clearCookie = jest.fn();
    });

    const contextFor = (request: Partial<RequestWithPayload>) =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => ({ clearCookie }),
            }),
        }) as unknown as ExecutionContext;

    const baseRequest = (
        cookies: Record<string, string>,
    ): Partial<RequestWithPayload> => ({
        cookies,
        headers: { origin: 'http://localhost:3000' },
        method: 'POST',
    });

    it('throws when the refresh token cookie is missing', async () => {
        await expect(
            guard.canActivate(contextFor(baseRequest({}))),
        ).rejects.toThrow('Refresh token missing');
        expect(clearCookie).not.toHaveBeenCalled();
    });

    it('attaches the payload and raw token, then allows the request', async () => {
        const payload = { sub: 'u1', tokenType: 'refresh', jti: 'j1' };
        jwtService.verifyAsync.mockResolvedValue(payload);
        const request = baseRequest({ refresh_token: 'rt' });

        await expect(guard.canActivate(contextFor(request))).resolves.toBe(
            true,
        );
        expect(request.payload).toEqual(payload);
        expect(request.token).toBe('rt');
    });

    it('clears auth cookies and throws on verification failure', async () => {
        jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

        await expect(
            guard.canActivate(contextFor(baseRequest({ refresh_token: 'rt' }))),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(clearCookie).toHaveBeenCalledTimes(3);
    });
});

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenGuard, RequestWithUser } from './access-token.guard';
import { snapshotEnv } from 'src/test-utils/env';

describe('AccessTokenGuard', () => {
    const env = snapshotEnv([
        'NODE_ENV',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_ISSUER',
        'JWT_AUDIENCES',
    ]);
    let jwtService: { verifyAsync: jest.Mock };
    let guard: AccessTokenGuard;

    beforeAll(() => {
        env.save();
        process.env.NODE_ENV = 'local';
        process.env.JWT_ACCESS_SECRET = 'access-secret';
        process.env.JWT_REFRESH_SECRET = 'refresh-secret';
        process.env.JWT_ISSUER = 'pnyx-test';
        process.env.JWT_AUDIENCES = 'http://localhost:3000';
    });
    afterAll(env.restore);

    beforeEach(() => {
        jwtService = { verifyAsync: jest.fn() };
        guard = new AccessTokenGuard(jwtService as unknown as JwtService);
    });

    const contextFor = (request: Partial<RequestWithUser>) =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => ({}),
            }),
        }) as unknown as ExecutionContext;

    const baseRequest = (
        cookies: Record<string, string>,
    ): Partial<RequestWithUser> => ({
        cookies,
        headers: { origin: 'http://localhost:3000' },
        method: 'GET',
    });

    it('throws when the access token cookie is missing', async () => {
        await expect(
            guard.canActivate(contextFor(baseRequest({}))),
        ).rejects.toThrow('Access token missing');
    });

    it('attaches the verified payload and allows the request', async () => {
        const payload = { sub: 'u1', tokenType: 'access' };
        jwtService.verifyAsync.mockResolvedValue(payload);
        const request = baseRequest({ access_token: 'token' });

        await expect(guard.canActivate(contextFor(request))).resolves.toBe(
            true,
        );
        expect(request.payload).toEqual(payload);
    });

    it('rejects a token whose type is not access', async () => {
        jwtService.verifyAsync.mockResolvedValue({
            sub: 'u1',
            tokenType: 'refresh',
        });

        await expect(
            guard.canActivate(contextFor(baseRequest({ access_token: 't' }))),
        ).rejects.toThrow('Invalid access token type');
    });

    it('maps a verification failure to Unauthorized', async () => {
        jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

        await expect(
            guard.canActivate(contextFor(baseRequest({ access_token: 't' }))),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });
});

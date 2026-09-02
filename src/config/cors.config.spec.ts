import { Logger } from '@nestjs/common';
import { createCorsOptions } from './cors.config';
import { snapshotEnv } from '../test-utils/env';

type OriginFn = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
) => void;

const env = snapshotEnv(['NODE_ENV']);

const ALLOWED = ['https://a.com', 'https://b.com'];

const callOrigin = (origin: string | undefined, allowed = ALLOWED) => {
    const options = createCorsOptions(allowed);
    const cb = jest.fn();
    (options.origin as OriginFn)(origin, cb);
    return cb;
};

describe('createCorsOptions', () => {
    beforeAll(env.save);
    afterAll(env.restore);

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(
            () => undefined,
        );
        process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('allows any origin in local', () => {
        process.env.NODE_ENV = 'local';
        const cb = callOrigin('http://evil.com');
        expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('allows a request with no origin (same-origin/server-side)', () => {
        const cb = callOrigin(undefined);
        expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('allows a listed origin in production', () => {
        const cb = callOrigin('https://a.com');
        expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('blocks an unlisted origin with a CORS error and logs it', () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const cb = callOrigin('https://evil.com');
        expect(cb).toHaveBeenCalledTimes(1);
        const [err] = cb.mock.calls[0];
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('CORS policy violation');
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('https://evil.com'),
        );
    });

    it('blocks an origin that is not in the provided allow-list', () => {
        const cb = callOrigin('https://b.com', ['https://a.com']);
        const [err] = cb.mock.calls[0];
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('CORS policy violation');
    });

    it('sets the static CORS fields', () => {
        expect(createCorsOptions(ALLOWED)).toMatchObject({
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        });
    });
});

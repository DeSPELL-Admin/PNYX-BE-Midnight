import helmet from 'helmet';
import { createHelmetMiddleware } from './helmet.config';
import { snapshotEnv } from '../test-utils/env';

jest.mock('helmet', () => ({
    __esModule: true,
    default: jest.fn(() => 'helmet-mw-sentinel'),
}));

const env = snapshotEnv(['NODE_ENV']);
const helmetMock = helmet as unknown as jest.Mock;

const optionsFor = (nodeEnv: string) => {
    process.env.NODE_ENV = nodeEnv;
    const result = createHelmetMiddleware();
    return { result, options: helmetMock.mock.calls[0][0] };
};

describe('createHelmetMiddleware', () => {
    beforeAll(env.save);
    afterAll(env.restore);

    beforeEach(() => {
        helmetMock.mockClear();
    });

    it('disables CSP and HSTS in local', () => {
        const { result, options } = optionsFor('local');
        expect(result).toBe('helmet-mw-sentinel');
        expect(options.contentSecurityPolicy).toBe(false);
        expect(options.hsts).toBe(false);
    });

    it('enables strict directives and HSTS in production', () => {
        const { options } = optionsFor('production');
        expect(options.contentSecurityPolicy.directives.defaultSrc).toEqual([
            "'self'",
        ]);
        expect(options.hsts).toEqual({
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        });
        expect(options.frameguard).toEqual({ action: 'deny' });
        expect(options.noSniff).toBe(true);
        expect(options.hidePoweredBy).toBe(true);
    });

    it('throws when NODE_ENV is missing', () => {
        delete process.env.NODE_ENV;
        expect(() => createHelmetMiddleware()).toThrow('Missing env: NODE_ENV');
    });
});

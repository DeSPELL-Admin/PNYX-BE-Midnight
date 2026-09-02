import type { NextFunction, Request, Response } from 'express';
import { CsrfProtectionMiddleware } from './csrf.middleware';

const ALLOWED = ['https://app.example.com', 'https://admin.example.com'];

type Headers = Record<string, string | undefined>;

function makeReq(opts: {
    method?: string;
    path?: string;
    headers?: Headers;
}): Request {
    const headers = opts.headers ?? {};
    return {
        method: opts.method ?? 'POST',
        path: opts.path ?? '/api/resource',
        get: (name: string) => headers[name.toLowerCase()],
    } as unknown as Request;
}

function invoke(mw: CsrfProtectionMiddleware, req: Request) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();
    mw.use(
        req,
        { status } as unknown as Response,
        next as unknown as NextFunction,
    );
    return { status, json, next };
}

function denyBody(reason: string) {
    return {
        statusCode: 403,
        message: `CSRF blocked: ${reason}`,
        error: 'Forbidden',
    };
}

describe('CsrfProtectionMiddleware', () => {
    let mw: CsrfProtectionMiddleware;

    beforeEach(() => {
        mw = new CsrfProtectionMiddleware({
            allowedOrigins: ALLOWED,
            excludedPaths: ['/api/webhook'],
        });
    });

    describe('pass-through cases', () => {
        it.each(['GET', 'HEAD', 'OPTIONS'])(
            'lets safe method %s through without checks',
            (method) => {
                const { next, status } = invoke(
                    mw,
                    makeReq({
                        method,
                        headers: { origin: 'https://evil.com' },
                    }),
                );

                expect(next).toHaveBeenCalledTimes(1);
                expect(status).not.toHaveBeenCalled();
            },
        );

        it('lets an excluded path through even for unsafe methods', () => {
            const { next, status } = invoke(
                mw,
                makeReq({
                    method: 'POST',
                    path: '/api/webhook/stripe',
                    headers: { 'sec-fetch-site': 'cross-site' },
                }),
            );

            expect(next).toHaveBeenCalledTimes(1);
            expect(status).not.toHaveBeenCalled();
        });

        it('allows a request whose origin is in the allow-list', () => {
            const { next, status } = invoke(
                mw,
                makeReq({ headers: { origin: 'https://app.example.com' } }),
            );

            expect(next).toHaveBeenCalledTimes(1);
            expect(status).not.toHaveBeenCalled();
        });

        it('allows when sec-fetch-site is same-origin and origin is allowed', () => {
            const { next } = invoke(
                mw,
                makeReq({
                    headers: {
                        'sec-fetch-site': 'same-origin',
                        origin: 'https://admin.example.com',
                    },
                }),
            );

            expect(next).toHaveBeenCalledTimes(1);
        });

        it('allows when the referer origin is in the allow-list', () => {
            const { next, status } = invoke(
                mw,
                makeReq({
                    headers: { referer: 'https://app.example.com/some/page' },
                }),
            );

            expect(next).toHaveBeenCalledTimes(1);
            expect(status).not.toHaveBeenCalled();
        });
    });

    describe('blocked cases', () => {
        it('blocks a cross-site request via sec-fetch-site', () => {
            const { next, status, json } = invoke(
                mw,
                makeReq({ headers: { 'sec-fetch-site': 'cross-site' } }),
            );

            expect(next).not.toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith(denyBody('cross-site request'));
        });

        it('blocks an origin that is not in the allow-list', () => {
            const { next, status, json } = invoke(
                mw,
                makeReq({ headers: { origin: 'https://evil.com' } }),
            );

            expect(next).not.toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith(denyBody('invalid origin'));
        });

        it('blocks when neither origin nor referer is present', () => {
            const { next, json } = invoke(mw, makeReq({ headers: {} }));

            expect(next).not.toHaveBeenCalled();
            expect(json).toHaveBeenCalledWith(
                denyBody('missing origin/referer'),
            );
        });

        it('blocks a referer whose origin is not allowed', () => {
            const { next, json } = invoke(
                mw,
                makeReq({ headers: { referer: 'https://evil.com/page' } }),
            );

            expect(next).not.toHaveBeenCalled();
            expect(json).toHaveBeenCalledWith(denyBody('invalid referer'));
        });

        it('blocks a malformed referer that cannot be parsed', () => {
            const { next, json } = invoke(
                mw,
                makeReq({ headers: { referer: 'not-a-valid-url' } }),
            );

            expect(next).not.toHaveBeenCalled();
            expect(json).toHaveBeenCalledWith(denyBody('malformed referer'));
        });
    });
});

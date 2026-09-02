import type { NextFunction, Request, Response } from 'express';
import { createCsrfMiddleware } from './csrf-middleware.factory';

const ALLOWED = ['https://app.example.com'];

function makeReq(opts: {
    method?: string;
    headers?: Record<string, string | undefined>;
}): Request {
    const headers = opts.headers ?? {};
    return {
        method: opts.method ?? 'POST',
        path: '/api/resource',
        get: (name: string) => headers[name.toLowerCase()],
    } as unknown as Request;
}

function invoke(mw: NestUse, req: Request) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();
    mw(req, { status } as unknown as Response, next as unknown as NextFunction);
    return { status, json, next };
}

type NestUse = ReturnType<typeof createCsrfMiddleware>;

describe('createCsrfMiddleware', () => {
    it('returns a callable middleware function', () => {
        const mw = createCsrfMiddleware({ allowedOrigins: ALLOWED });
        expect(typeof mw).toBe('function');
    });

    it('delegates to CsrfProtectionMiddleware: safe method passes through', () => {
        const mw = createCsrfMiddleware({ allowedOrigins: ALLOWED });

        const { next, status } = invoke(mw, makeReq({ method: 'GET' }));

        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('delegates to CsrfProtectionMiddleware: cross-site request is blocked', () => {
        const mw = createCsrfMiddleware({ allowedOrigins: ALLOWED });

        const { next, status, json } = invoke(
            mw,
            makeReq({
                method: 'POST',
                headers: { 'sec-fetch-site': 'cross-site' },
            }),
        );

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            statusCode: 403,
            message: 'CSRF blocked: cross-site request',
            error: 'Forbidden',
        });
    });

    it('keeps options per instance: each call builds an independent allow-list', () => {
        const strict = createCsrfMiddleware({ allowedOrigins: [] });

        const { next, json } = invoke(
            strict,
            makeReq({ headers: { origin: 'https://app.example.com' } }),
        );

        expect(next).not.toHaveBeenCalled();
        expect(json).toHaveBeenCalledWith({
            statusCode: 403,
            message: 'CSRF blocked: invalid origin',
            error: 'Forbidden',
        });
    });
});

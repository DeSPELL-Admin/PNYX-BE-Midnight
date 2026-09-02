import type { Request, Response } from 'express';
import { createSwaggerNoStoreMiddleware } from './swagger.config';

const callMiddleware = (path: string) => {
    const setHeader = jest.fn();
    const next = jest.fn();
    const req = { path } as Request;
    const res = { setHeader } as unknown as Response;

    createSwaggerNoStoreMiddleware()(req, res, next);

    return { setHeader, next };
};

describe('createSwaggerNoStoreMiddleware', () => {
    it('sets Cache-Control: no-store on swagger-ui-init.js and calls next once', () => {
        const { setHeader, next } = callMiddleware('/swagger-ui-init.js');

        expect(setHeader).toHaveBeenCalledTimes(1);
        expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });

    it('also covers the nested docs/swagger-ui-init.js variant', () => {
        const { setHeader, next } = callMiddleware('/docs/swagger-ui-init.js');

        expect(setHeader).toHaveBeenCalledTimes(1);
        expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('does NOT set Cache-Control on static bundle assets and calls next once', () => {
        const { setHeader, next } = callMiddleware('/swagger-ui-bundle.js');

        expect(setHeader).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns a three-argument (req, res, next) middleware', () => {
        expect(createSwaggerNoStoreMiddleware()).toHaveLength(3);
    });
});

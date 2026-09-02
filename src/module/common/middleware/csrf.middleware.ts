import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfMiddlewareOptions {
    allowedOrigins: string[];
    excludedPaths?: string[];
}

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
    private readonly allowedOrigins: Set<string>;
    private readonly excludedPaths: string[];

    constructor(options: CsrfMiddlewareOptions) {
        this.allowedOrigins = new Set(options.allowedOrigins);
        this.excludedPaths = options.excludedPaths ?? [];
    }

    use(req: Request, res: Response, next: NextFunction) {
        if (SAFE_METHODS.has(req.method)) {
            return next();
        }

        if (this.excludedPaths.some((path) => req.path.startsWith(path))) {
            return next();
        }

        const deny = (reason: string) =>
            res.status(403).json({
                statusCode: 403,
                message: `CSRF blocked: ${reason}`,
                error: 'Forbidden',
            });

        // 1차: Fetch Metadata
        const secFetchSite = req.get('sec-fetch-site');
        if (secFetchSite === 'cross-site') {
            return deny('cross-site request');
        }

        // 2차: Origin 검증
        const origin = req.get('origin');
        if (origin) {
            return this.allowedOrigins.has(origin)
                ? next()
                : deny('invalid origin');
        }

        // 3차: Referer fallback
        const referer = req.get('referer');
        if (!referer) {
            return deny('missing origin/referer');
        }

        try {
            const refererOrigin = new URL(referer).origin;
            return this.allowedOrigins.has(refererOrigin)
                ? next()
                : deny('invalid referer');
        } catch {
            return deny('malformed referer');
        }
    }
}

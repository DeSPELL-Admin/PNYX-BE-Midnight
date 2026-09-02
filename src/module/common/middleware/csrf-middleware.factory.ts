import type { NestMiddleware } from '@nestjs/common';
import {
    CsrfProtectionMiddleware,
    CsrfMiddlewareOptions,
} from './csrf.middleware';

export function createCsrfMiddleware(
    options: CsrfMiddlewareOptions,
): NestMiddleware['use'] {
    const middleware = new CsrfProtectionMiddleware(options);
    return middleware.use.bind(middleware) as NestMiddleware['use'];
}

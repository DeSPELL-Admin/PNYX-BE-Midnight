import { Request } from 'express';

export function extractUserAgent(request: Request): string | null {
    const value = request.headers['user-agent'];
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function extractClientIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
        return forwardedFor.split(',')[0].trim();
    }

    return request.ip || null;
}

import { UnauthorizedException } from '@nestjs/common';
import { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { Request } from 'express';
import { durationToMs } from 'src/util/duration.util';
import { getEnv } from 'src/util/env.util';

type JwtTokenType = 'access' | 'refresh';

function getJwtSecret(tokenType: JwtTokenType): string {
    return tokenType === 'access'
        ? getEnv('JWT_ACCESS_SECRET')
        : getEnv('JWT_REFRESH_SECRET');
}

export function buildJwtSignOptions(
    expiresIn: string,
    tokenType: JwtTokenType,
    clientAudience: string,
): JwtSignOptions {
    const JWT_ISSUER = getEnv('JWT_ISSUER');

    return {
        secret: getJwtSecret(tokenType),
        expiresIn: durationToMs(expiresIn),
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        audience: clientAudience,
    };
}

export function buildJwtVerifyOptions(
    tokenType: JwtTokenType,
    audience?: string,
): JwtVerifyOptions {
    const JWT_ISSUER = getEnv('JWT_ISSUER');
    const JWT_AUDIENCES = getEnv('JWT_AUDIENCES')
        .split('|')
        .map((s) => s.trim());

    return {
        secret: getJwtSecret(tokenType),
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: audience
            ? audience
            : (JWT_AUDIENCES as [string, ...string[]]),
    };
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
export function resolveRequestAudience(request: Request): string | undefined {
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    const source = origin || referer;

    if (source) {
        try {
            const url = new URL(source);
            return url.origin;
        } catch {
            throw new UnauthorizedException('Invalid origin or referer header');
        }
    }

    if (MUTATING_METHODS.has(request.method.toUpperCase())) {
        throw new UnauthorizedException(
            'Origin or Referer header is required for mutating requests',
        );
    }

    return undefined;
}

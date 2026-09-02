import { CookieOptions, Response } from 'express';
import { durationToMs } from 'src/util/duration.util';
import { getEnv } from 'src/util/env.util';

type SameSiteMode = 'lax' | 'strict' | 'none';

export interface AuthCookieNames {
    accessToken: string;
    refreshToken: string;
    siweNonce: string;
}

function isLocal(): boolean {
    return getEnv('NODE_ENV') === 'local';
}

function getSameSite(): SameSiteMode {
    const COOKIE_SAME_SITE = getEnv('COOKIE_SAME_SITE').toLowerCase();

    if (COOKIE_SAME_SITE === 'strict' || COOKIE_SAME_SITE === 'none') {
        return COOKIE_SAME_SITE;
    }

    return 'lax';
}

function baseCookieName(prefix: string): string {
    return isLocal() ? prefix : `__Host-${prefix}`;
}

function baseCookieOptions(): CookieOptions {
    const secure = !isLocal();
    let sameSite = getSameSite();

    // SameSite=None과 Partitioned는 모두 Secure를 강제한다(브라우저 정책).
    // local(http)에서는 Secure를 붙일 수 없어 이 조합이면 브라우저가 쿠키를
    // 저장 자체를 거부하므로, SameSite=None은 lax로 낮추고 Partitioned는 끈다.
    // prod(https)에서는 secure=true라 기존 동작(None/Partitioned) 그대로 유지된다.
    if (!secure && sameSite === 'none') {
        sameSite = 'lax';
    }

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        partitioned: secure,
    };
}

export function getCookieNames(): AuthCookieNames {
    return {
        accessToken: baseCookieName('access_token'),
        refreshToken: baseCookieName('refresh_token'),
        siweNonce: baseCookieName('siwe_nonce'),
    };
}

export function accessCookieOptions(): CookieOptions {
    return {
        ...baseCookieOptions(),
        maxAge: durationToMs(getEnv('ACCESS_TOKEN_EXPIRES_IN')),
    };
}

export function refreshCookieOptions(): CookieOptions {
    return {
        ...baseCookieOptions(),
        maxAge: durationToMs(getEnv('REFRESH_TOKEN_EXPIRES_IN')),
    };
}

export function nonceCookieOptions(): CookieOptions {
    return {
        ...baseCookieOptions(),
        maxAge: durationToMs(getEnv('SIWE_NONCE_TTL')),
    };
}

export function clearNonceCookie(response: Response): void {
    const names = getCookieNames();
    const base = baseCookieOptions();

    response.clearCookie(names.siweNonce, base);
}

export function clearAuthCookies(response: Response): void {
    const names = getCookieNames();
    const base = baseCookieOptions();

    response.clearCookie(names.accessToken, base);
    response.clearCookie(names.refreshToken, base);
    response.clearCookie(names.siweNonce, base);
}

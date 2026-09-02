import { getEnv } from '../util/env.util';

export function getAllowedOrigins(): string[] {
    return getEnv('ALLOWED_ORIGINS')
        .split('|')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

import { Injectable, Logger } from '@nestjs/common';
import {
    createPublicKey,
    KeyObject,
    verify as cryptoVerify,
    type JsonWebKey as CryptoJsonWebKey,
} from 'crypto';
import { getEnv } from 'src/util/env.util';
import { SvixHeaders } from './ns-webhook.type';

export class WebhookSignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WebhookSignatureError';
    }
}

@Injectable()
export class NsWebhookVerifyService {
    private readonly logger = new Logger(NsWebhookVerifyService.name);
    private readonly NS_JWKS_URL = getEnv('NS_JWKS_URL');
    private readonly JWKS_CACHE_TTL_MS = 10 * 60 * 1000;
    private readonly MIN_REFRESH_INTERVAL_MS = 60 * 1000;
    private readonly TIMESTAMP_TOLERANCE_SEC = 5 * 60;

    private cachedKeys: KeyObject[] | null = null;
    private cachedAt = 0;

    async verify(rawBody: string, headers: SvixHeaders): Promise<void> {
        const { svixId, svixTimestamp, svixSignature } = headers;
        if (!svixId || !svixTimestamp || !svixSignature) {
            throw new WebhookSignatureError('Missing svix headers');
        }

        this.assertFreshTimestamp(svixTimestamp);

        const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
        const data = Buffer.from(signedContent, 'utf8');
        const signatures = this.extractSignatures(svixSignature);
        if (signatures.length === 0) {
            throw new WebhookSignatureError('No signatures present');
        }

        const keys = await this.getKeys();
        if (this.tryVerify(data, signatures, keys)) {
            return;
        }

        // 키 로테이션 대응: 캐시가 충분히 오래된 경우에만 1회 강제 갱신 후 재시도
        if (Date.now() - this.cachedAt > this.MIN_REFRESH_INTERVAL_MS) {
            const refreshed = await this.refresh();
            if (this.tryVerify(data, signatures, refreshed)) {
                return;
            }
        }

        throw new WebhookSignatureError('Signature verification failed');
    }

    private assertFreshTimestamp(svixTimestamp: string): void {
        const ts = Number(svixTimestamp);
        if (!Number.isFinite(ts)) {
            throw new WebhookSignatureError('Invalid svix-timestamp');
        }
        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - ts) > this.TIMESTAMP_TOLERANCE_SEC) {
            throw new WebhookSignatureError('svix-timestamp outside tolerance');
        }
    }

    private extractSignatures(header: string): Buffer[] {
        return header
            .split(' ')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
                const commaIdx = part.indexOf(',');
                return commaIdx >= 0 ? part.slice(commaIdx + 1) : part;
            })
            .filter(Boolean)
            .map((b64) => Buffer.from(b64, 'base64'));
    }

    private tryVerify(
        data: Buffer,
        signatures: Buffer[],
        keys: KeyObject[],
    ): boolean {
        for (const key of keys) {
            for (const signature of signatures) {
                try {
                    if (cryptoVerify(null, data, key, signature)) {
                        return true;
                    }
                } catch {
                    // 키 타입 불일치/서명 형식 오류 → 다음 키/서명 시도
                }
            }
        }
        return false;
    }

    private async getKeys(): Promise<KeyObject[]> {
        if (
            this.cachedKeys &&
            Date.now() - this.cachedAt < this.JWKS_CACHE_TTL_MS
        ) {
            return this.cachedKeys;
        }
        return this.refresh();
    }

    private async refresh(): Promise<KeyObject[]> {
        const keys = await this.fetchKeys();
        this.cachedKeys = keys;
        this.cachedAt = Date.now();
        return keys;
    }

    private async fetchKeys(): Promise<KeyObject[]> {
        const url = this.NS_JWKS_URL;

        let response: Response;
        try {
            response = await fetch(url);
        } catch {
            throw new WebhookSignatureError('Failed to fetch JWKS');
        }
        if (!response.ok) {
            throw new WebhookSignatureError(
                `JWKS fetch failed with status ${response.status}`,
            );
        }

        const body = (await response.json()) as { keys?: CryptoJsonWebKey[] };
        const jwks = Array.isArray(body.keys) ? body.keys : [];

        const keys: KeyObject[] = [];
        for (const jwk of jwks) {
            try {
                keys.push(createPublicKey({ key: jwk, format: 'jwk' }));
            } catch {
                this.logger.warn('Skipping JWK that could not be imported');
            }
        }

        if (keys.length === 0) {
            throw new WebhookSignatureError('No usable keys in JWKS');
        }
        return keys;
    }
}

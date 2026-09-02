import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from 'src/module/common/redis/redis.constant';
import { durationToMs } from 'src/util/duration.util';
import { getEnv } from 'src/util/env.util';
import { NotificationTokenService } from '../notification-token.service';
import { ActiveNotificationTokenQueryResult } from '../query-result/active-notification-token.query-result';
import { validateNotificationContent } from './notification-content.validator';
import {
    NsSendRequest,
    NsSendResponse,
    SendNotificationParams,
    SendNotificationResult,
} from './ns-send.type';

interface ChunkSendResult {
    successful: string[];
    invalid: string[];
    rateLimited: string[];
    failed: string[];
}

// postToNs 단일 호출 결과. retry = 일시 오류(429/5xx/네트워크)로 재시도 대상,
// failed = 영구 오류(429 제외 4xx, 예: 정책 위반 400)로 재시도하지 않음.
interface NsPostOutcome {
    successful: string[];
    invalid: string[];
    retry: string[];
    failed: string[];
}

@Injectable()
export class NotificationSenderService {
    private readonly logger = new Logger(NotificationSenderService.name);
    private readonly MAX_TOKENS_PER_REQUEST = parseInt(
        getEnv('MAX_TOKENS_PER_REQUEST'),
        10,
    );
    private readonly DAILY_LIMIT = parseInt(getEnv('DAILY_LIMIT'), 10);
    private readonly DAILY_TTL_MS = durationToMs(getEnv('DAILY_TTL_SEC'));
    private readonly MAX_RETRIES = parseInt(getEnv('MAX_RETRIES'), 10);
    private readonly RETRY_BASE_DELAY_MS = parseInt(
        getEnv('RETRY_BASE_DELAY_MS'),
        10,
    );
    private readonly RL_PREFIX = 'miniapp-notif:rl:';

    constructor(
        private readonly tokenService: NotificationTokenService,
        @Inject(REDIS_CLIENT)
        private readonly redis: RedisClientType,
    ) {}

    async sendToUsers(
        params: SendNotificationParams,
    ): Promise<SendNotificationResult> {
        const notificationId =
            params.notificationId ?? this.generateNotificationId();

        validateNotificationContent({
            title: params.title,
            body: params.body,
        });

        const uniqueAddresses = [
            ...new Set(params.userAddresses.map((a) => a.toLowerCase())),
        ];

        const tokens = await this.tokenService.getActiveTokens(uniqueAddresses);

        const { acceptedTokens, skippedByDailyLimitCount } =
            await this.applyDailyLimit(tokens);

        const base = {
            notificationId,
            title: params.title,
            body: params.body,
        };

        const aggregate = await this.dispatchTokens(acceptedTokens, base);

        if (aggregate.invalid.length > 0) {
            await this.cleanupInvalidTokens(aggregate.invalid);
        }

        if (aggregate.failed.length > 0) {
            this.logger.error(
                `NS send permanently failed for ${aggregate.failed.length} token(s) (notificationId=${notificationId}); likely a content-policy or request error`,
            );
        }

        return {
            notificationId,
            successfulCount: aggregate.successful.length,
            invalidCount: aggregate.invalid.length,
            rateLimitedCount: aggregate.rateLimited.length,
            failedCount: aggregate.failed.length,
            skippedByDailyLimitCount,
        };
    }

    private async applyDailyLimit(
        tokens: ActiveNotificationTokenQueryResult[],
    ): Promise<{
        acceptedTokens: ActiveNotificationTokenQueryResult[];
        skippedByDailyLimitCount: number;
    }> {
        const tokensByUser = new Map<
            string,
            ActiveNotificationTokenQueryResult[]
        >();
        for (const token of tokens) {
            const list = tokensByUser.get(token.userAddress) ?? [];
            list.push(token);
            tokensByUser.set(token.userAddress, list);
        }

        const acceptedTokens: ActiveNotificationTokenQueryResult[] = [];
        let skippedByDailyLimitCount = 0;

        for (const [userAddress, userTokens] of tokensByUser) {
            const allowed = await this.consumeDailyQuota(userAddress);
            if (allowed) {
                acceptedTokens.push(...userTokens);
            } else {
                skippedByDailyLimitCount += 1;
            }
        }

        return { acceptedTokens, skippedByDailyLimitCount };
    }

    private async consumeDailyQuota(userAddress: string): Promise<boolean> {
        const key = `${this.RL_PREFIX}${userAddress}:${this.todayUtc()}`;
        const count = await this.redis.incr(key);
        if (count === 1) {
            await this.redis.pExpire(key, this.DAILY_TTL_MS);
        }
        return count <= this.DAILY_LIMIT;
    }

    private async dispatchTokens(
        tokens: ActiveNotificationTokenQueryResult[],
        base: Omit<NsSendRequest, 'tokens'>,
    ): Promise<ChunkSendResult> {
        const aggregate: ChunkSendResult = {
            successful: [],
            invalid: [],
            rateLimited: [],
            failed: [],
        };

        const tokensByUrl = new Map<string, string[]>();
        for (const token of tokens) {
            const list = tokensByUrl.get(token.notificationUrl) ?? [];
            list.push(token.token);
            tokensByUrl.set(token.notificationUrl, list);
        }

        for (const [url, urlTokens] of tokensByUrl) {
            for (const chunk of this.chunk(
                urlTokens,
                this.MAX_TOKENS_PER_REQUEST,
            )) {
                const result = await this.postWithRetry(url, base, chunk);
                aggregate.successful.push(...result.successful);
                aggregate.invalid.push(...result.invalid);
                aggregate.rateLimited.push(...result.rateLimited);
                aggregate.failed.push(...result.failed);
            }
        }

        return aggregate;
    }

    private async postWithRetry(
        url: string,
        base: Omit<NsSendRequest, 'tokens'>,
        tokens: string[],
    ): Promise<ChunkSendResult> {
        const successful: string[] = [];
        const invalid: string[] = [];
        const failed: string[] = [];
        let pending = tokens;

        for (
            let attempt = 0;
            attempt <= this.MAX_RETRIES && pending.length > 0;
            attempt += 1
        ) {
            if (attempt > 0) {
                await this.sleep(this.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
            }
            const outcome = await this.postToNs(url, {
                ...base,
                tokens: pending,
            });
            successful.push(...outcome.successful);
            invalid.push(...outcome.invalid);
            failed.push(...outcome.failed);
            pending = outcome.retry;
        }

        // 재시도를 모두 소진하고도 남은 pending 은 rate-limited 로 최종 집계한다.
        return { successful, invalid, rateLimited: pending, failed };
    }

    private async postToNs(
        url: string,
        payload: NsSendRequest,
    ): Promise<NsPostOutcome> {
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (error) {
            // 네트워크 오류: 일시적으로 보고 재시도한다.
            this.logger.error(
                `NS send request failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            return {
                successful: [],
                invalid: [],
                retry: payload.tokens,
                failed: [],
            };
        }

        if (!response.ok) {
            // 429(게이트웨이 rate-limit) / 5xx 는 일시 오류 → 재시도.
            // 그 외 4xx(예: 콘텐츠 정책 위반 400)는 영구 오류 → 재시도 금지.
            const isTransient =
                response.status === 429 || response.status >= 500;
            if (isTransient) {
                this.logger.warn(
                    `NS send transient error, status ${response.status}; will retry`,
                );
                return {
                    successful: [],
                    invalid: [],
                    retry: payload.tokens,
                    failed: [],
                };
            }
            this.logger.error(
                `NS send permanent error, status ${response.status}; not retrying`,
            );
            return {
                successful: [],
                invalid: [],
                retry: [],
                failed: payload.tokens,
            };
        }

        const data = (await response.json()) as Partial<NsSendResponse>;
        return {
            successful: data.successfulTokens ?? [],
            invalid: data.invalidTokens ?? [],
            retry: data.rateLimitedTokens ?? [],
            failed: [],
        };
    }

    private async cleanupInvalidTokens(tokens: string[]): Promise<void> {
        for (const token of tokens) {
            await this.tokenService.removeByToken(token);
        }
    }

    private chunk<T>(items: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    private generateNotificationId(): string {
        return `miniapp-${Date.now()}-${randomUUID()}`;
    }

    private todayUtc(): string {
        return new Date().toISOString().slice(0, 10);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

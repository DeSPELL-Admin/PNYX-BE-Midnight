import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from 'src/module/common/redis/redis.constant';
import { getEnv } from 'src/util/env.util';
import { NotificationTokenService } from './notification-token.service';
import {
    NsWebhookVerifyService,
    WebhookSignatureError,
} from './webhook/ns-webhook-verify.service';
import {
    parseNsWebhookPayload,
    WebhookPayloadError,
} from './webhook/ns-webhook.parser';
import {
    NsWebhookEvent,
    NsWebhookPayload,
    SvixHeaders,
} from './webhook/ns-webhook.type';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly MINIAPP_SENDER_ID = getEnv('MINIAPP_SENDER_ID');
    private readonly DEDUP_PREFIX = 'miniapp-notif:svix:';
    private readonly DEDUP_TTL_SEC = 60 * 60;

    constructor(
        private readonly verifyService: NsWebhookVerifyService,
        private readonly tokenService: NotificationTokenService,
        @Inject(REDIS_CLIENT)
        private readonly redis: RedisClientType,
    ) {}

    async handleWebhook(rawBody: string, headers: SvixHeaders): Promise<void> {
        try {
            await this.verifyService.verify(rawBody, headers);
        } catch (error) {
            if (error instanceof WebhookSignatureError) {
                throw new UnauthorizedException(error.message);
            }
            throw error;
        }

        const dedupKey = `${this.DEDUP_PREFIX}${headers.svixId}`;
        const isFirstDelivery = await this.redis.set(dedupKey, '1', {
            NX: true,
            EX: this.DEDUP_TTL_SEC,
        });
        if (isFirstDelivery !== 'OK') {
            this.logger.log(
                `Duplicate webhook delivery skipped (svix-id=${headers.svixId})`,
            );
            return;
        }

        try {
            const payload = this.parse(rawBody);

            if (!this.isOwnSender(payload.senderId)) {
                this.logger.warn(
                    `Ignoring webhook for foreign senderId: ${payload.senderId}`,
                );
                return;
            }

            await this.dispatch(payload);
        } catch (error) {
            // 처리 실패 시 멱등 키를 제거하여 NS 재전송 시 재처리되도록 한다
            await this.redis.del(dedupKey);
            throw error;
        }
    }

    private isOwnSender(senderId: string): boolean {
        try {
            return (
                new URL(senderId).origin ===
                new URL(this.MINIAPP_SENDER_ID).origin
            );
        } catch {
            return false;
        }
    }

    private parse(rawBody: string): NsWebhookPayload {
        try {
            return parseNsWebhookPayload(rawBody);
        } catch (error) {
            if (error instanceof WebhookPayloadError) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }
    }

    private async dispatch(payload: NsWebhookPayload): Promise<void> {
        const userAddress = payload.userAddress;

        switch (payload.event) {
            case NsWebhookEvent.MINIAPP_ADDED:
            case NsWebhookEvent.NOTIFICATIONS_ENABLED:
                if (!userAddress) {
                    this.logger.warn(
                        `Skipping ${payload.event}: userAddress unresolved, cannot store token`,
                    );
                    return;
                }
                await this.tokenService.saveOrRotate({
                    userAddress,
                    token: payload.notificationDetails.token,
                    notificationUrl: payload.notificationDetails.url,
                });
                return;
            case NsWebhookEvent.NOTIFICATIONS_DISABLED:
                if (!userAddress) {
                    return;
                }
                await this.tokenService.disable(userAddress);
                return;
            case NsWebhookEvent.MINIAPP_REMOVED:
                if (!userAddress) {
                    return;
                }
                await this.tokenService.remove(userAddress);
                return;
        }
    }
}

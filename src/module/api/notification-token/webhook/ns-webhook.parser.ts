import {
    NotificationDetails,
    NsWebhookEvent,
    NsWebhookPayload,
} from './ns-webhook.type';

export class WebhookPayloadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WebhookPayloadError';
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function parseNotificationDetails(value: unknown): NotificationDetails {
    if (!isRecord(value)) {
        throw new WebhookPayloadError('notificationDetails must be an object');
    }
    if (!isNonEmptyString(value.url)) {
        throw new WebhookPayloadError('notificationDetails.url is missing');
    }
    if (!isNonEmptyString(value.token)) {
        throw new WebhookPayloadError('notificationDetails.token is missing');
    }
    return { url: value.url, token: value.token };
}

export function parseNsWebhookPayload(rawBody: string): NsWebhookPayload {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawBody);
    } catch {
        throw new WebhookPayloadError('Invalid JSON body');
    }

    if (!isRecord(parsed)) {
        throw new WebhookPayloadError('Body must be a JSON object');
    }

    const { event, senderId, userAddress, notificationDetails } = parsed;

    if (!isNonEmptyString(senderId)) {
        throw new WebhookPayloadError('senderId is missing');
    }

    // 문서상 userAddress 는 NS 가 해결하지 못하면 생략될 수 있다.
    // 부재/null/빈 문자열은 undefined 로 정규화하고, 값이 있으나 문자열이 아닐 때만 거부한다.
    if (
        userAddress !== undefined &&
        userAddress !== null &&
        typeof userAddress !== 'string'
    ) {
        throw new WebhookPayloadError(
            'userAddress must be a string when present',
        );
    }
    const normalizedUserAddress = isNonEmptyString(userAddress)
        ? userAddress
        : undefined;

    switch (event) {
        case NsWebhookEvent.MINIAPP_ADDED:
            return {
                event: NsWebhookEvent.MINIAPP_ADDED,
                senderId,
                userAddress: normalizedUserAddress,
                notificationDetails:
                    parseNotificationDetails(notificationDetails),
            };
        case NsWebhookEvent.NOTIFICATIONS_ENABLED:
            return {
                event: NsWebhookEvent.NOTIFICATIONS_ENABLED,
                senderId,
                userAddress: normalizedUserAddress,
                notificationDetails:
                    parseNotificationDetails(notificationDetails),
            };
        case NsWebhookEvent.NOTIFICATIONS_DISABLED:
            return {
                event: NsWebhookEvent.NOTIFICATIONS_DISABLED,
                senderId,
                userAddress: normalizedUserAddress,
            };
        case NsWebhookEvent.MINIAPP_REMOVED:
            return {
                event: NsWebhookEvent.MINIAPP_REMOVED,
                senderId,
                userAddress: normalizedUserAddress,
            };
        default:
            throw new WebhookPayloadError(
                `Unknown event type: ${String(event)}`,
            );
    }
}

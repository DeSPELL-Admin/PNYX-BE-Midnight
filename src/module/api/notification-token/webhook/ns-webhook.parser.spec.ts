import {
    parseNsWebhookPayload,
    WebhookPayloadError,
} from './ns-webhook.parser';
import {
    MiniappAddedPayload,
    NotificationsEnabledPayload,
    NsWebhookEvent,
} from './ns-webhook.type';

const SENDER_ID = 'https://miniapp.example.com';
const USER_ADDRESS = '0xABC123';

describe('parseNsWebhookPayload', () => {
    it('miniapp_added 이벤트를 토큰 정보와 함께 파싱한다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_added',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
            notificationDetails: {
                url: 'https://ns.example.com/send',
                token: 'tok-1',
            },
        });

        const payload = parseNsWebhookPayload(raw) as MiniappAddedPayload;

        expect(payload.event).toBe(NsWebhookEvent.MINIAPP_ADDED);
        expect(payload.senderId).toBe(SENDER_ID);
        expect(payload.userAddress).toBe(USER_ADDRESS);
        expect(payload.notificationDetails).toEqual({
            url: 'https://ns.example.com/send',
            token: 'tok-1',
        });
    });

    it('notifications_enabled 이벤트를 토큰 정보와 함께 파싱한다', () => {
        const raw = JSON.stringify({
            event: 'notifications_enabled',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
            notificationDetails: { url: 'https://ns/send', token: 'tok-2' },
        });

        const payload = parseNsWebhookPayload(
            raw,
        ) as NotificationsEnabledPayload;

        expect(payload.event).toBe(NsWebhookEvent.NOTIFICATIONS_ENABLED);
        expect(payload.notificationDetails.token).toBe('tok-2');
    });

    it('notifications_disabled 이벤트를 토큰 없이 파싱한다', () => {
        const raw = JSON.stringify({
            event: 'notifications_disabled',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
        });

        const payload = parseNsWebhookPayload(raw);

        expect(payload.event).toBe(NsWebhookEvent.NOTIFICATIONS_DISABLED);
        expect('notificationDetails' in payload).toBe(false);
    });

    it('miniapp_removed 이벤트를 토큰 없이 파싱한다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_removed',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
        });

        const payload = parseNsWebhookPayload(raw);

        expect(payload.event).toBe(NsWebhookEvent.MINIAPP_REMOVED);
    });

    it('잘못된 JSON 이면 WebhookPayloadError 를 던진다', () => {
        expect(() => parseNsWebhookPayload('not-json')).toThrow(
            WebhookPayloadError,
        );
    });

    it('알 수 없는 이벤트 타입이면 던진다', () => {
        const raw = JSON.stringify({
            event: 'unknown_event',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
        });
        expect(() => parseNsWebhookPayload(raw)).toThrow(WebhookPayloadError);
    });

    it('senderId 가 없으면 던진다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_removed',
            userAddress: USER_ADDRESS,
        });
        expect(() => parseNsWebhookPayload(raw)).toThrow(WebhookPayloadError);
    });

    it('userAddress 가 없어도 파싱되며 undefined 로 정규화한다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_added',
            senderId: SENDER_ID,
            notificationDetails: {
                url: 'https://ns.example.com/send',
                token: 'tok-1',
            },
        });

        const payload = parseNsWebhookPayload(raw) as MiniappAddedPayload;

        expect(payload.event).toBe(NsWebhookEvent.MINIAPP_ADDED);
        expect(payload.userAddress).toBeUndefined();
        expect(payload.notificationDetails.token).toBe('tok-1');
    });

    it('userAddress 가 문자열이 아니면 던진다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_removed',
            senderId: SENDER_ID,
            userAddress: 12345,
        });
        expect(() => parseNsWebhookPayload(raw)).toThrow(WebhookPayloadError);
    });

    it('added 이벤트인데 notificationDetails.token 이 없으면 던진다', () => {
        const raw = JSON.stringify({
            event: 'miniapp_added',
            senderId: SENDER_ID,
            userAddress: USER_ADDRESS,
            notificationDetails: { url: 'https://ns/send' },
        });
        expect(() => parseNsWebhookPayload(raw)).toThrow(WebhookPayloadError);
    });
});

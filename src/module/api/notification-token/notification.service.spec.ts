process.env.MINIAPP_SENDER_ID = 'https://miniapp.example.com';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { WebhookSignatureError } from './webhook/ns-webhook-verify.service';
import { SvixHeaders } from './webhook/ns-webhook.type';

const SENDER_ID = 'https://miniapp.example.com';
const NS_URL = 'https://ns.example.com/send';

const headers: SvixHeaders = {
    svixId: 'msg_1',
    svixTimestamp: '1700000000',
    svixSignature: 'v1a,sig',
};

const setup = () => {
    const verifyService = {
        verify: jest.fn().mockResolvedValue(undefined),
    };
    const tokenService = {
        saveOrRotate: jest.fn().mockResolvedValue(undefined),
        disable: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
    };
    const redis = {
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
    };

    const service = new NotificationService(
        verifyService as never,
        tokenService as never,
        redis as never,
    );
    return { service, verifyService, tokenService, redis };
};

const addedBody = JSON.stringify({
    event: 'miniapp_added',
    senderId: SENDER_ID,
    userAddress: '0xABC',
    notificationDetails: { url: NS_URL, token: 'tok-1' },
});

describe('NotificationService.handleWebhook', () => {
    it('miniapp_added 수신 시 토큰을 저장한다', async () => {
        const { service, tokenService } = setup();

        await service.handleWebhook(addedBody, headers);

        expect(tokenService.saveOrRotate).toHaveBeenCalledWith({
            userAddress: '0xABC',
            token: 'tok-1',
            notificationUrl: NS_URL,
        });
    });

    it('notifications_enabled 수신 시 토큰을 갱신(저장)한다', async () => {
        const { service, tokenService } = setup();
        const raw = JSON.stringify({
            event: 'notifications_enabled',
            senderId: SENDER_ID,
            userAddress: '0xABC',
            notificationDetails: { url: NS_URL, token: 'tok-2' },
        });

        await service.handleWebhook(raw, headers);

        expect(tokenService.saveOrRotate).toHaveBeenCalledWith({
            userAddress: '0xABC',
            token: 'tok-2',
            notificationUrl: NS_URL,
        });
    });

    it('notifications_disabled 수신 시 비활성화한다', async () => {
        const { service, tokenService } = setup();
        const raw = JSON.stringify({
            event: 'notifications_disabled',
            senderId: SENDER_ID,
            userAddress: '0xABC',
        });

        await service.handleWebhook(raw, headers);

        expect(tokenService.disable).toHaveBeenCalledWith('0xABC');
        expect(tokenService.saveOrRotate).not.toHaveBeenCalled();
    });

    it('miniapp_removed 수신 시 삭제한다', async () => {
        const { service, tokenService } = setup();
        const raw = JSON.stringify({
            event: 'miniapp_removed',
            senderId: SENDER_ID,
            userAddress: '0xABC',
        });

        await service.handleWebhook(raw, headers);

        expect(tokenService.remove).toHaveBeenCalledWith('0xABC');
    });

    it('userAddress 없는 miniapp_added 는 저장하지 않고 ack 한다(멱등 키 유지)', async () => {
        const { service, tokenService, redis } = setup();
        const raw = JSON.stringify({
            event: 'miniapp_added',
            senderId: SENDER_ID,
            notificationDetails: { url: NS_URL, token: 'tok-1' },
        });

        await expect(
            service.handleWebhook(raw, headers),
        ).resolves.toBeUndefined();

        expect(tokenService.saveOrRotate).not.toHaveBeenCalled();
        expect(redis.del).not.toHaveBeenCalled();
    });

    it('userAddress 없는 miniapp_removed 는 no-op 이다', async () => {
        const { service, tokenService } = setup();
        const raw = JSON.stringify({
            event: 'miniapp_removed',
            senderId: SENDER_ID,
        });

        await service.handleWebhook(raw, headers);

        expect(tokenService.remove).not.toHaveBeenCalled();
    });

    it('senderId 가 우리 앱과 다르면 저장하지 않고 무시한다', async () => {
        const { service, tokenService } = setup();
        const raw = JSON.stringify({
            event: 'miniapp_added',
            senderId: 'https://other-miniapp.example.com',
            userAddress: '0xABC',
            notificationDetails: { url: NS_URL, token: 'tok-x' },
        });

        await service.handleWebhook(raw, headers);

        expect(tokenService.saveOrRotate).not.toHaveBeenCalled();
    });

    it('서명 검증 실패 시 401 을 던지고 토큰을 건드리지 않는다', async () => {
        const { service, verifyService, tokenService, redis } = setup();
        verifyService.verify.mockRejectedValue(
            new WebhookSignatureError('bad signature'),
        );

        await expect(service.handleWebhook(addedBody, headers)).rejects.toThrow(
            UnauthorizedException,
        );

        expect(redis.set).not.toHaveBeenCalled();
        expect(tokenService.saveOrRotate).not.toHaveBeenCalled();
    });

    it('동일 svix-id 재수신(SET NX 실패) 시 처리를 건너뛴다', async () => {
        const { service, tokenService, redis } = setup();
        redis.set.mockResolvedValue(null);

        await service.handleWebhook(addedBody, headers);

        expect(tokenService.saveOrRotate).not.toHaveBeenCalled();
    });

    it('잘못된 body 면 400 을 던지고 멱등 키를 제거한다', async () => {
        const { service, redis } = setup();

        await expect(
            service.handleWebhook('not-json', headers),
        ).rejects.toThrow(BadRequestException);

        expect(redis.del).toHaveBeenCalledWith('miniapp-notif:svix:msg_1');
    });
});

process.env.MAX_TOKENS_PER_REQUEST = '100';
process.env.DAILY_LIMIT = '20';
process.env.DAILY_TTL_SEC = '24h';
process.env.MAX_RETRIES = '3';
process.env.RETRY_BASE_DELAY_MS = '1000';

import { BadRequestException } from '@nestjs/common';
import { NotificationSenderService } from './notification-sender.service';

const NS_URL = 'https://ns.example.com/send';

interface FetchCall {
    url: string;
    tokens: string[];
}

const setup = () => {
    const tokenService = {
        getActiveTokens: jest.fn().mockResolvedValue([]),
        removeByToken: jest.fn().mockResolvedValue(undefined),
    };
    const redis = {
        incr: jest.fn().mockResolvedValue(1),
        pExpire: jest.fn().mockResolvedValue(true),
    };
    const service = new NotificationSenderService(
        tokenService as never,
        redis as never,
    );
    return { service, tokenService, redis };
};

const setFetch = (
    handler: (call: FetchCall) => {
        ok?: boolean;
        status?: number;
        body: Partial<{
            successfulTokens: string[];
            invalidTokens: string[];
            rateLimitedTokens: string[];
        }>;
    },
): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation((url: string, opts) => {
        const tokens = JSON.parse((opts as { body: string }).body)
            .tokens as string[];
        const res = handler({ url, tokens });
        return Promise.resolve({
            ok: res.ok ?? true,
            status: res.status ?? 200,
            json: async () => res.body,
        });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
};

const validContent = {
    title: 'Daily reward ready',
    body: 'Come back to claim your reward',
};

const tokensFor = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        userAddress: `0x${i}`,
        token: `t${i}`,
        notificationUrl: NS_URL,
    }));

describe('NotificationSenderService.sendToUsers', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        delete (global as { fetch?: unknown }).fetch;
    });

    it('정책 위반 콘텐츠(title 초과)는 전송 전에 거부한다', async () => {
        const { service, tokenService } = setup();
        const fetchMock = setFetch(() => ({ body: {} }));

        await expect(
            service.sendToUsers({
                userAddresses: ['0xa'],
                title: 'x'.repeat(33),
                body: 'ok',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(tokenService.getActiveTokens).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('활성 토큰으로 발송하고 성공 수를 집계한다', async () => {
        const { service, tokenService } = setup();
        tokenService.getActiveTokens.mockResolvedValue([
            { userAddress: '0xa', token: 't1', notificationUrl: NS_URL },
            { userAddress: '0xb', token: 't2', notificationUrl: NS_URL },
        ]);
        const fetchMock = setFetch(({ tokens }) => ({
            body: {
                successfulTokens: tokens,
                invalidTokens: [],
                rateLimitedTokens: [],
            },
        }));

        const result = await service.sendToUsers({
            userAddresses: ['0xa', '0xb'],
            ...validContent,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.successfulCount).toBe(2);
        expect(result.skippedByDailyLimitCount).toBe(0);
    });

    it('100개를 초과하는 토큰은 100개 단위로 청크 전송한다', async () => {
        const { service, tokenService } = setup();
        tokenService.getActiveTokens.mockResolvedValue(tokensFor(150));
        const sentSizes: number[] = [];
        setFetch(({ tokens }) => {
            sentSizes.push(tokens.length);
            return {
                body: {
                    successfulTokens: tokens,
                    invalidTokens: [],
                    rateLimitedTokens: [],
                },
            };
        });

        const result = await service.sendToUsers({
            userAddresses: tokensFor(150).map((t) => t.userAddress),
            ...validContent,
        });

        expect(sentSizes).toEqual([100, 50]);
        expect(result.successfulCount).toBe(150);
    });

    it('invalidTokens 는 DB 에서 제거한다', async () => {
        const { service, tokenService } = setup();
        tokenService.getActiveTokens.mockResolvedValue([
            { userAddress: '0xa', token: 'bad', notificationUrl: NS_URL },
        ]);
        setFetch(() => ({
            body: {
                successfulTokens: [],
                invalidTokens: ['bad'],
                rateLimitedTokens: [],
            },
        }));

        const result = await service.sendToUsers({
            userAddresses: ['0xa'],
            ...validContent,
        });

        expect(tokenService.removeByToken).toHaveBeenCalledWith('bad');
        expect(result.invalidCount).toBe(1);
    });

    it('rateLimitedTokens 는 backoff 후 재시도한다', async () => {
        const { service, tokenService } = setup();
        jest.spyOn(
            service as unknown as { sleep: () => Promise<void> },
            'sleep',
        ).mockResolvedValue(undefined);
        tokenService.getActiveTokens.mockResolvedValue([
            { userAddress: '0xa', token: 'rl', notificationUrl: NS_URL },
        ]);
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    successfulTokens: [],
                    invalidTokens: [],
                    rateLimitedTokens: ['rl'],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    successfulTokens: ['rl'],
                    invalidTokens: [],
                    rateLimitedTokens: [],
                }),
            });
        global.fetch = fetchMock as unknown as typeof fetch;

        const result = await service.sendToUsers({
            userAddresses: ['0xa'],
            ...validContent,
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.successfulCount).toBe(1);
        expect(result.rateLimitedCount).toBe(0);
    });

    it('NS 4xx(정책 위반 등) 응답은 재시도하지 않고 failed 로 분류한다', async () => {
        const { service, tokenService } = setup();
        tokenService.getActiveTokens.mockResolvedValue([
            {
                userAddress: '0xa',
                token: 'bad-content',
                notificationUrl: NS_URL,
            },
        ]);
        const fetchMock = setFetch(() => ({
            ok: false,
            status: 400,
            body: {},
        }));

        const result = await service.sendToUsers({
            userAddresses: ['0xa'],
            ...validContent,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.failedCount).toBe(1);
        expect(result.rateLimitedCount).toBe(0);
        expect(result.successfulCount).toBe(0);
        expect(tokenService.removeByToken).not.toHaveBeenCalled();
    });

    it('NS 429 는 일시 오류로 보고 재시도한다', async () => {
        const { service, tokenService } = setup();
        jest.spyOn(
            service as unknown as { sleep: () => Promise<void> },
            'sleep',
        ).mockResolvedValue(undefined);
        tokenService.getActiveTokens.mockResolvedValue([
            { userAddress: '0xa', token: 't-429', notificationUrl: NS_URL },
        ]);
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => ({}),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    successfulTokens: ['t-429'],
                    invalidTokens: [],
                    rateLimitedTokens: [],
                }),
            });
        global.fetch = fetchMock as unknown as typeof fetch;

        const result = await service.sendToUsers({
            userAddresses: ['0xa'],
            ...validContent,
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.successfulCount).toBe(1);
        expect(result.failedCount).toBe(0);
        expect(result.rateLimitedCount).toBe(0);
    });

    it('일일 한도를 초과한 유저는 발송 대상에서 제외한다', async () => {
        const { service, tokenService, redis } = setup();
        redis.incr.mockResolvedValue(21);
        tokenService.getActiveTokens.mockResolvedValue([
            { userAddress: '0xa', token: 't1', notificationUrl: NS_URL },
        ]);
        const fetchMock = setFetch(() => ({ body: {} }));

        const result = await service.sendToUsers({
            userAddresses: ['0xa'],
            ...validContent,
        });

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.skippedByDailyLimitCount).toBe(1);
        expect(result.successfulCount).toBe(0);
    });
});

process.env.NS_JWKS_URL = 'https://jwks.test/.well-known/jwks.json';

import { generateKeyPairSync, KeyObject, sign as cryptoSign } from 'crypto';
import {
    NsWebhookVerifyService,
    WebhookSignatureError,
} from './ns-webhook-verify.service';
import { SvixHeaders } from './ns-webhook.type';

function toJwk(publicKey: KeyObject): JsonWebKey {
    return publicKey.export({ format: 'jwk' }) as JsonWebKey;
}

function signSvix(
    privateKey: KeyObject,
    svixId: string,
    svixTimestamp: string,
    rawBody: string,
): string {
    const content = `${svixId}.${svixTimestamp}.${rawBody}`;
    const signature = cryptoSign(
        null,
        Buffer.from(content, 'utf8'),
        privateKey,
    );
    return `v1a,${signature.toString('base64')}`;
}

function mockJwksFetch(jwks: JsonWebKey[]): jest.Mock {
    const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: jwks }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

const RAW_BODY = JSON.stringify({ event: 'miniapp_removed' });

describe('NsWebhookVerifyService', () => {
    const nowSec = () => Math.floor(Date.now() / 1000).toString();

    afterEach(() => {
        jest.restoreAllMocks();
        delete (global as { fetch?: unknown }).fetch;
    });

    it('유효한 Ed25519 서명을 통과시킨다', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        const fetchMock = mockJwksFetch([toJwk(publicKey)]);
        const service = new NsWebhookVerifyService();

        const svixId = 'msg_1';
        const svixTimestamp = nowSec();
        const headers: SvixHeaders = {
            svixId,
            svixTimestamp,
            svixSignature: signSvix(
                privateKey,
                svixId,
                svixTimestamp,
                RAW_BODY,
            ),
        };

        await expect(
            service.verify(RAW_BODY, headers),
        ).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('본문이 변조되면 서명 검증에 실패한다', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        mockJwksFetch([toJwk(publicKey)]);
        const service = new NsWebhookVerifyService();

        const svixId = 'msg_2';
        const svixTimestamp = nowSec();
        const headers: SvixHeaders = {
            svixId,
            svixTimestamp,
            svixSignature: signSvix(
                privateKey,
                svixId,
                svixTimestamp,
                RAW_BODY,
            ),
        };

        await expect(
            service.verify(RAW_BODY + 'tampered', headers),
        ).rejects.toThrow(WebhookSignatureError);
    });

    it('JWKS 에 여러 키가 있을 때(로테이션) 일치하는 키로 통과한다', async () => {
        const wrong = generateKeyPairSync('ed25519');
        const correct = generateKeyPairSync('ed25519');
        mockJwksFetch([toJwk(wrong.publicKey), toJwk(correct.publicKey)]);
        const service = new NsWebhookVerifyService();

        const svixId = 'msg_3';
        const svixTimestamp = nowSec();
        const headers: SvixHeaders = {
            svixId,
            svixTimestamp,
            svixSignature: signSvix(
                correct.privateKey,
                svixId,
                svixTimestamp,
                RAW_BODY,
            ),
        };

        await expect(
            service.verify(RAW_BODY, headers),
        ).resolves.toBeUndefined();
    });

    it('svix 헤더가 누락되면 거부한다', async () => {
        mockJwksFetch([]);
        const service = new NsWebhookVerifyService();

        await expect(
            service.verify(RAW_BODY, { svixId: 'x', svixTimestamp: nowSec() }),
        ).rejects.toThrow(WebhookSignatureError);
    });

    it('timestamp 가 허용 범위를 벗어나면 거부한다', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        mockJwksFetch([toJwk(publicKey)]);
        const service = new NsWebhookVerifyService();

        const svixId = 'msg_4';
        const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
        const headers: SvixHeaders = {
            svixId,
            svixTimestamp: staleTimestamp,
            svixSignature: signSvix(
                privateKey,
                svixId,
                staleTimestamp,
                RAW_BODY,
            ),
        };

        await expect(service.verify(RAW_BODY, headers)).rejects.toThrow(
            WebhookSignatureError,
        );
    });

    it('서명이 임의 값이면 거부한다', async () => {
        const { publicKey } = generateKeyPairSync('ed25519');
        mockJwksFetch([toJwk(publicKey)]);
        const service = new NsWebhookVerifyService();

        const svixId = 'msg_5';
        const svixTimestamp = nowSec();
        const headers: SvixHeaders = {
            svixId,
            svixTimestamp,
            svixSignature: `v1a,${Buffer.from('garbage').toString('base64')}`,
        };

        await expect(service.verify(RAW_BODY, headers)).rejects.toThrow(
            WebhookSignatureError,
        );
    });
});

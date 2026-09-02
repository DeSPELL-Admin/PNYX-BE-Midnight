import { InternalServerErrorException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { NonceService } from './nonce.service';
import { snapshotEnv } from 'src/test-utils/env';

describe('NonceService', () => {
    const env = snapshotEnv(['HASH_PEPPER']);
    let redis: {
        set: jest.Mock;
        exists: jest.Mock;
        getDel: jest.Mock;
        del: jest.Mock;
    };
    let service: NonceService;

    beforeAll(() => {
        env.save();
        process.env.HASH_PEPPER = 'pepper';
    });
    afterAll(env.restore);

    beforeEach(() => {
        redis = {
            set: jest.fn(),
            exists: jest.fn(),
            getDel: jest.fn(),
            del: jest.fn(),
        };
        service = new NonceService(redis as unknown as RedisClientType);
    });

    describe('issueNonce', () => {
        it('rejects a non-positive ttl', async () => {
            await expect(service.issueNonce('n', 0)).rejects.toBeInstanceOf(
                InternalServerErrorException,
            );
            expect(redis.set).not.toHaveBeenCalled();
        });

        it('sets a hashed key with PX + NX and returns true on OK', async () => {
            redis.set.mockResolvedValue('OK');

            const issued = await service.issueNonce('abc', 300000);

            expect(issued).toBe(true);
            expect(redis.set).toHaveBeenCalledTimes(1);
            const [key, value, options] = redis.set.mock.calls[0];
            expect(key).toMatch(/^auth:siwe:nonce:[0-9a-f]{64}$/);
            expect(value).toBe('1');
            expect(options).toEqual({ PX: 300000, NX: true });
        });

        it('returns false when the key already exists (set returns null)', async () => {
            redis.set.mockResolvedValue(null);
            expect(await service.issueNonce('abc', 300000)).toBe(false);
        });
    });

    describe('hasActiveNonce', () => {
        it('returns true when redis reports the key exists', async () => {
            redis.exists.mockResolvedValue(1);
            expect(await service.hasActiveNonce('abc')).toBe(true);
        });

        it('returns false when the key does not exist', async () => {
            redis.exists.mockResolvedValue(0);
            expect(await service.hasActiveNonce('abc')).toBe(false);
        });
    });

    describe('consumeNonce', () => {
        it('returns true when getDel returns a value (atomic one-time use)', async () => {
            redis.getDel.mockResolvedValue('1');
            expect(await service.consumeNonce('abc')).toBe(true);
        });

        it('returns false when getDel returns null', async () => {
            redis.getDel.mockResolvedValue(null);
            expect(await service.consumeNonce('abc')).toBe(false);
        });
    });
});

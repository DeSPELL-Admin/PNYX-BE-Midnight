import { ConflictException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { snapshotEnv } from 'src/test-utils/env';
import { LockService } from './lock.service';

describe('LockService', () => {
    const env = snapshotEnv(['REDIS_LOCK_TTL']);
    let redis: { set: jest.Mock; eval: jest.Mock };
    let service: LockService;

    beforeAll(env.save);
    afterAll(env.restore);

    beforeEach(() => {
        process.env.REDIS_LOCK_TTL = '10s';
        redis = { set: jest.fn(), eval: jest.fn() };
        service = new LockService(redis as unknown as RedisClientType);
    });

    describe('acquireLock', () => {
        it('sets the lock with the configured TTL + NX and returns a token on success', async () => {
            redis.set.mockResolvedValue('OK');

            const token = await service.acquireLock('user:1');

            expect(token).toEqual(expect.any(String));
            expect(token).not.toHaveLength(0);
            expect(redis.set).toHaveBeenCalledWith('lock:user:1', token, {
                PX: 10_000, // '10s' -> ms
                NX: true,
            });
        });

        it('returns null when the lock is already held (SET NX miss)', async () => {
            redis.set.mockResolvedValue(null);

            expect(await service.acquireLock('user:1')).toBeNull();
        });

        it('uses a fresh random token per acquisition', async () => {
            redis.set.mockResolvedValue('OK');

            const first = await service.acquireLock('user:1');
            const second = await service.acquireLock('user:1');

            expect(first).not.toEqual(second);
        });
    });

    describe('releaseLock', () => {
        it('runs the ownership-checked delete script and reports success', async () => {
            redis.eval.mockResolvedValue(1);

            const released = await service.releaseLock('user:1', 'token-abc');

            expect(released).toBe(true);
            expect(redis.eval).toHaveBeenCalledWith(expect.any(String), {
                keys: ['lock:user:1'],
                arguments: ['token-abc'],
            });
        });

        it('reports failure when the script deletes nothing (not the owner)', async () => {
            redis.eval.mockResolvedValue(0);

            expect(await service.releaseLock('user:1', 'token-abc')).toBe(
                false,
            );
        });
    });

    describe('setWithLock', () => {
        it('returns the acquired token when the lock is free', async () => {
            redis.set.mockResolvedValue('OK');

            const token = await service.setWithLock('user:1', 'a request');

            expect(token).toEqual(expect.any(String));
        });

        it('throws ConflictException when the lock is contended', async () => {
            redis.set.mockResolvedValue(null);

            await expect(
                service.setWithLock('user:1', 'a request'),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });
});

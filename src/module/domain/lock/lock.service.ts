import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from 'src/module/common/redis/redis.constant';
import { getEnv } from 'src/util/env.util';
import { durationToMs } from 'src/util/duration.util';

@Injectable()
export class LockService {
    private readonly LOCK_PREFIX = 'lock:';
    private readonly LOCK_TTL = durationToMs(getEnv('REDIS_LOCK_TTL'));

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly redis: RedisClientType,
    ) {}

    private generateLockKey(resourceId: string): string {
        return `${this.LOCK_PREFIX}${resourceId}`;
    }

    async acquireLock(resourceId: string): Promise<string | null> {
        const lockKey = this.generateLockKey(resourceId);
        const lockValue = randomUUID();

        const result = await this.redis.set(lockKey, lockValue, {
            PX: this.LOCK_TTL,
            NX: true,
        });

        return result === 'OK' ? lockValue : null;
    }

    async releaseLock(resourceId: string, value: string): Promise<boolean> {
        const lockKey = this.generateLockKey(resourceId);
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        const result = await this.redis.eval(script, {
            keys: [lockKey],
            arguments: [value],
        });

        return result === 1;
    }

    async setWithLock(
        resourceId: string,
        requestDesc: string,
        options?: { errorCode?: string },
    ): Promise<string> {
        const lockValue = await this.acquireLock(resourceId);
        if (!lockValue) {
            const message = `
                Processing ${requestDesc}. Please try again later.
            `;
            throw new ConflictException(
                options?.errorCode
                    ? { message, errorCode: options.errorCode }
                    : message,
            );
        }
        return lockValue;
    }
}

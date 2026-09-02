import {
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from 'src/module/common/redis/redis.constant';
import { hash } from 'src/module/common/util/hash.util';

@Injectable()
export class NonceService {
    constructor(
        @Inject(REDIS_CLIENT)
        private readonly redis: RedisClientType,
    ) {}

    async issueNonce(nonce: string, ttlMs: number): Promise<boolean> {
        if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
            throw new InternalServerErrorException('Invalid nonce ttl');
        }

        const result = await this.redis.set(this.buildKey(nonce), '1', {
            PX: ttlMs,
            NX: true,
        });

        return result === 'OK';
    }

    async hasActiveNonce(nonce: string): Promise<boolean> {
        const exists = await this.redis.exists(this.buildKey(nonce));
        return exists === 1;
    }

    async consumeNonce(nonce: string): Promise<boolean> {
        const value = await this.redis.getDel(this.buildKey(nonce));
        return value !== null;
    }

    async deleteNonce(nonce: string): Promise<void> {
        await this.redis.del(this.buildKey(nonce));
    }

    private buildKey(nonce: string): string {
        return `auth:siwe:nonce:${hash(nonce)}`;
    }
}

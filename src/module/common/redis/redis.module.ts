import { Global, Module } from '@nestjs/common';
import { redisProvider } from './redis.provider';
import { RedisLifecycle } from './redis.lifecycle';

@Global()
@Module({
    providers: [redisProvider, RedisLifecycle],
    exports: [redisProvider],
})
export class RedisModule {}

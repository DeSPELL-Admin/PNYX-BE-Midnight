import { Logger } from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_CLIENT } from './redis.constant';
import { getEnv } from 'src/util/env.util';

export type AppRedisClient = ReturnType<typeof createClient>;

export const redisProvider = {
    provide: REDIS_CLIENT,
    useFactory: async (): Promise<AppRedisClient> => {
        const logger = new Logger('Redis');

        const client = createClient({
            url: getEnv('REDIS_URL'),
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error(
                            'Redis 재연결 최대 시도 횟수 초과. 연결을 포기합니다.',
                        );
                        return new Error('Redis connection failed');
                    }
                    const delay = Math.min(retries * 500, 3000);
                    logger.warn(
                        `Redis 연결 끊김. ${delay}ms 후 재연결 시도... (시도 횟수: ${retries})`,
                    );
                    return delay;
                },
            },
        });

        client.on('error', (error) => {
            logger.error(
                error instanceof Error ? error.message : String(error),
                error instanceof Error ? error.stack : undefined,
            );
        });

        await client.connect();

        return client;
    },
};

// src/config/cors.config.ts
import { Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { getEnv } from '../util/env.util';

export function createCorsOptions(allowedOrigins: string[]): CorsOptions {
    const logger = new Logger('CorsConfig');

    const isLocal = getEnv('NODE_ENV') === 'local';

    const corsOptions: CorsOptions = {
        origin: (origin, callback) => {
            if (isLocal) {
                return callback(null, true);
            }

            // origin이 없는 경우(같은 도메인 / 서버 사이드 요청 등): 허용
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked request from origin: ${origin}`);
                // Nest의 HttpExceptionFilter에서 잡히진 않고,
                // 브라우저에서 CORS 에러로 보이게 됨
                callback(new Error('CORS policy violation'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        optionsSuccessStatus: 200,
    };

    return corsOptions;
}

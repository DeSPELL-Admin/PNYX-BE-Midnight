// src/config/swagger.config.ts
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../util/env.util';
import { getCookieNames } from '../module/common/util/cookie.util';

export const SWAGGER_PATH = '/api/docs';

// swagger-ui-init.js 만 OpenAPI 스펙을 인라인으로 담으므로, 이 파일만 엣지 캐싱을 막는다.
// (무거운 swagger-ui-bundle.js / css 는 배포 간 불변이라 캐싱 유지)
export function createSwaggerNoStoreMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.path.endsWith('/swagger-ui-init.js')) {
            res.setHeader('Cache-Control', 'no-store');
        }
        next();
    };
}

export function setupSwagger(app: INestApplication) {
    if (getEnv('NODE_ENV') === 'production') {
        return;
    }

    const cookieNames = getCookieNames();

    const config = new DocumentBuilder()
        .setTitle('PNYX Backend API')
        .setDescription('PNYX Backend API Documentation')
        .setVersion(process.env.npm_package_version ?? '1.0')
        .addCookieAuth(
            cookieNames.accessToken,
            {
                type: 'apiKey',
                in: 'cookie',
                description:
                    'Midnight 로그인으로 발급된 access token (httpOnly 쿠키)',
            },
            'access_token',
        )
        .addCookieAuth(
            cookieNames.refreshToken,
            {
                type: 'apiKey',
                in: 'cookie',
                description:
                    '토큰 재발급/로그아웃에 사용되는 refresh token (httpOnly 쿠키)',
            },
            'refresh_token',
        )
        .addTag('Auth', 'Midnight (Lace) 로그인/토큰 갱신/로그아웃 API')
        .addTag('User', '사용자 별 토너먼트 정보 API')
        .addTag('Category', '카테고리 관련 API')
        .addTag('Tournament', '토너먼트 관련 API')
        .addTag('Signature', 'Midnight 참가 자격(grant) 발급 API')
        .addTag('File', '파일 관련 API')
        .addTag('Health', '헬스 관련 API')
        .addTag('Midnight Market', '데이터 마켓 주문/판매 API')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    app.use(SWAGGER_PATH, createSwaggerNoStoreMiddleware());

    SwaggerModule.setup(SWAGGER_PATH, app, document, {
        swaggerOptions: {
            displayRequestDuration: true,
            docExpansion: 'list',
            operationsSorter: 'alpha',
            withCredentials: true,
        },
    });
}

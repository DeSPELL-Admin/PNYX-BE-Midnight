import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { createCorsOptions } from './config/cors.config';
import { createHelmetMiddleware } from './config/helmet.config';
import {
    Logger,
    ShutdownSignal,
    ValidationPipe,
    VersioningType,
} from '@nestjs/common';
import { getEnv } from './util/env.util';
import cookieParser from 'cookie-parser';
import { createCsrfMiddleware } from './module/common/middleware/csrf-middleware.factory';
import { getAllowedOrigins } from './config/allowed-origins.config';
import { registerGlobalErrorGuards } from './util/process-guard.util';

async function bootstrap() {
    // 잡히지 않은 프로미스 rejection으로 프로세스가 죽지 않도록 가장 먼저 등록
    registerGlobalErrorGuards();

    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    const logger = new Logger('NestApplication');

    // 전역 ValidationPipe 설정
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true, // DTO의 @Transform, @Type 적용 + 컨트롤러에서 DTO 인스턴스로 받기
            whitelist: true, // DTO에 없는 필드는 자동 제거
            forbidNonWhitelisted: true, // true로 두면 없는 필드 들어오면 400 에러
            transformOptions: {
                enableImplicitConversion: true, // number, boolean 등 자동 변환
            },
            validateCustomDecorators: true, // 커스텀 데코레이터까지 검증에 포함
        }),
    );

    // Helmet (보안 헤더)
    app.use(createHelmetMiddleware());

    // 허용 출처 목록 (CORS / CSRF 공통 사용)
    const allowedOrigins = getAllowedOrigins();

    // CORS 설정
    app.enableCors(createCorsOptions(allowedOrigins));

    // Cookie Parser: 문자열을 객체로 파싱
    app.use(cookieParser());

    // CSRF 보호
    const NODE_ENV = getEnv('NODE_ENV');
    if (NODE_ENV === 'production') {
        app.use(
            createCsrfMiddleware({
                allowedOrigins,
                excludedPaths: [
                    '/health',
                    '/health/ready',
                    '/api/v1/miniapp-notifications/webhook',
                ],
            }),
        );
    }

    // 전역 prefix, 단, /health, /ready는 제외
    app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });

    // URI 버저닝 (기본 prefix 'v' + defaultVersion '1' => /api/v1/...)
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    // Swagger 설정
    setupSwagger(app);

    // Graceful shutdown hook 활성화
    app.enableShutdownHooks([ShutdownSignal.SIGINT, ShutdownSignal.SIGTERM]);

    const PORT = parseInt(getEnv('PORT'), 10);
    await app.listen(PORT);
    logger.log(`Nest server running on port ${PORT}`);
}
bootstrap().catch((error) => {
    new Logger('NestApplication').error('Failed to start application', error);
    process.exit(1);
});

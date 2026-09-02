import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
    Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { Error as MongooseError } from 'mongoose';
import { getEnv } from '../../../util/env.util';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string | number;
}

interface ParsedError {
    statusCode: number;
    message: string;
    errorCode?: string;
    extra?: Record<string, unknown>;
}

interface ErrorResponseBody {
    success: boolean;
    message: string;
    data: null;
    meta: {
        timestamp: string;
        path: string;
        method: string;
        errorCode?: string;
    };
    errors?: unknown;
    error?: {
        message?: unknown;
        stack?: unknown;
    };
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // 1. 불필요한 요청(정적 파일 등) 조기 종료 (Early Return)
        if (this.shouldIgnoreRequest(request, exception)) {
            return response.status(HttpStatus.NOT_FOUND).end();
        }

        // 2. 에러 타입에 따른 파싱 (다형성/분기 처리)
        const parsedError = this.parseException(exception);

        // 3. 상태 코드별 기본 메시지 보정 (메시지가 비어있을 경우 대비)
        parsedError.message = this.ensureDefaultMessage(
            parsedError.statusCode,
            parsedError.message,
        );

        // 4. 응답 객체 생성
        const responseBody = this.buildResponseBody(request, parsedError);

        // 5. 환경에 따른 디버깅 정보 추가 (로컬/개발)
        this.appendDevErrorsIfNeeded(responseBody, exception);

        // 6. 에러 로깅
        this.logException(request, parsedError, exception);

        // 7. 클라이언트 응답
        return response.status(parsedError.statusCode).json(responseBody);
    }

    /* ====================================================================
     * Private Helper Methods (관심사 분리)
     * ==================================================================== */

    private shouldIgnoreRequest(request: Request, exception: unknown): boolean {
        if (!(exception instanceof HttpException)) return false;

        const status: HttpStatus = exception.getStatus();
        const isNotFound = status === HttpStatus.NOT_FOUND;

        return (
            isNotFound &&
            (request.url.includes('/favicon') ||
                request.url.includes('/docs/docs/') ||
                !!request.url.match(/\/docs\/.*\.(png|ico|svg|css|js)$/))
        );
    }

    private parseException(exception: unknown): ParsedError {
        // 1. DB 에러 (MongoDB / Mongoose)
        if (this.isMongoError(exception)) {
            return this.handleMongoError(exception as AppError);
        }

        // 2. NestJS 표준 HTTP 에러 (Validation 포함)
        if (exception instanceof HttpException) {
            return this.handleHttpException(exception);
        }

        // 3. 기타 일반 에러 (Fallback)
        return this.handleGenericError(exception);
    }

    private isMongoError(exception: unknown): boolean {
        if (!(exception instanceof Error)) return false;

        const mongoErrorNames = [
            // Mongoose 레벨
            'ValidationError',
            'CastError',
            'DocumentNotFoundError',
            'VersionError',
            'StrictModeError',
            'MongooseServerSelectionError',
            // MongoDB Driver 레벨
            'MongoServerError',
            'MongoError',
            'MongoNetworkError',
            'MongoTimeoutError',
            'MongoServerSelectionError',
            'MongoBulkWriteError',
        ];

        return mongoErrorNames.includes(exception.name);
    }

    private handleMongoError(error: AppError): ParsedError {
        // 1. Mongoose 레벨 명명형 에러 우선 처리
        switch (error.name) {
            case 'ValidationError': {
                // Mongoose 스키마 검증 실패
                const validationErrors = Object.values(
                    (error as MongooseError.ValidationError).errors ?? {},
                ).map((err) => err.message);

                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Validation Error',
                    errorCode: 'MONGO_VALIDATION_ERROR',
                    extra: { validationErrors },
                };
            }

            case 'CastError': // 잘못된 ObjectId / 타입 변환 실패
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Invalid ID or value format',
                    errorCode: 'MONGO_CAST_ERROR',
                };

            case 'DocumentNotFoundError': // .orFail() 등에서 문서 없음
                return {
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Document not found',
                    errorCode: 'MONGO_DOCUMENT_NOT_FOUND',
                };

            case 'VersionError': // __v 기반 낙관적 락 충돌
                return {
                    statusCode: HttpStatus.CONFLICT,
                    message: 'Document version conflict',
                    errorCode: 'MONGO_VERSION_CONFLICT',
                };

            case 'StrictModeError': // 스키마에 없는 필드 저장 시도
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Strict mode violation',
                    errorCode: 'MONGO_STRICT_MODE_VIOLATION',
                };

            case 'MongooseServerSelectionError':
            case 'MongoServerSelectionError': // DB 서버 선택 실패 (Replica set 이슈 등)
                return {
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'Database connection unavailable',
                    errorCode: 'MONGO_SERVER_SELECTION_ERROR',
                };

            case 'MongoNetworkError': // 네트워크 단절
                return {
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'Database network error',
                    errorCode: 'MONGO_NETWORK_ERROR',
                };

            case 'MongoTimeoutError': // 드라이버 레벨 타임아웃
                return {
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    message: 'Database timeout',
                    errorCode: 'MONGO_TIMEOUT',
                };
        }

        // 2. MongoDB 드라이버 레벨 코드 기반 에러
        switch (error.code) {
            case 11000: // DuplicateKey (E11000)
            case 11001: // DuplicateKey on update (deprecated)
                return {
                    statusCode: HttpStatus.CONFLICT,
                    message: 'Duplicate field value entered',
                    errorCode: 'MONGO_DUPLICATE_KEY',
                };

            case 50: // ExceededTimeLimit
            case 287: // MaxTimeMSExpired
                return {
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    message: 'Database operation timed out',
                    errorCode: 'MONGO_OPERATION_TIMEOUT',
                };

            case 89: // NetworkTimeout
                return {
                    statusCode: HttpStatus.GATEWAY_TIMEOUT,
                    message: 'Database network timeout',
                    errorCode: 'MONGO_NETWORK_TIMEOUT',
                };

            case 91: // ShutdownInProgress
                return {
                    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'Database is shutting down',
                    errorCode: 'MONGO_SHUTDOWN_IN_PROGRESS',
                };

            case 121: // DocumentValidationFailure (서버측 $jsonSchema 검증 실패)
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Document validation failed',
                    errorCode: 'MONGO_DOCUMENT_VALIDATION',
                };

            case 56: // WriteConflict
            case 112: // WriteConflict (newer name)
            case 251: // NoSuchTransaction
                return {
                    statusCode: HttpStatus.CONFLICT,
                    message: 'Write conflict',
                    errorCode: 'MONGO_WRITE_CONFLICT',
                };

            default:
                return {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: error.message || 'Database Error',
                    errorCode: `MONGO_ERROR_${error.code ?? error.name ?? 'UNKNOWN'}`,
                };
        }
    }

    private handleHttpException(exception: HttpException): ParsedError {
        const statusCode: HttpStatus = exception.getStatus();
        const response = exception.getResponse();
        let message = exception.message;
        let errorCode: string | undefined;
        let extra: Record<string, unknown> | undefined;

        if (typeof response === 'string') {
            message = response;
        } else if (typeof response === 'object' && response !== null) {
            const resObj = response as { message?: string | string[] };

            if (Array.isArray(resObj.message)) {
                message = resObj.message.join(', ');
                // ValidationPipe에서 발생한 에러 처리
                if (statusCode === HttpStatus.BAD_REQUEST) {
                    errorCode = 'VALIDATION_ERROR';
                    extra = { validationErrors: resObj.message };
                }
            } else {
                message = resObj.message || exception.message;
            }
        }

        // 권한 관련 에러 코드 기본 할당 (errorCode 미지정 시)
        if (statusCode === HttpStatus.UNAUTHORIZED && !errorCode) {
            errorCode = 'AUTH_UNAUTHORIZED';
        }
        if (statusCode === HttpStatus.FORBIDDEN && !errorCode) {
            errorCode = 'AUTH_FORBIDDEN';
        }

        return { statusCode, message, errorCode, extra };
    }

    private handleGenericError(exception: unknown): ParsedError {
        const error = exception as AppError;
        return {
            statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Internal Server Error',
        };
    }

    private ensureDefaultMessage(
        statusCode: number,
        currentMessage: string,
    ): string {
        if (currentMessage && currentMessage !== 'Internal Server Error') {
            return currentMessage;
        }

        const defaults: Record<number, string> = {
            [HttpStatus.BAD_REQUEST]: 'Bad Request',
            [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
            [HttpStatus.FORBIDDEN]: 'Forbidden',
            [HttpStatus.NOT_FOUND]: 'Resource not found',
            [HttpStatus.CONFLICT]: 'Conflict',
            [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
            [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
            [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
            [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
            [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
            [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
        };

        return defaults[statusCode] || 'Unknown Error';
    }

    private buildResponseBody(
        request: Request,
        parsed: ParsedError,
    ): ErrorResponseBody {
        const body: ErrorResponseBody = {
            success: false,
            message: parsed.message,
            data: null,
            meta: {
                timestamp: new Date().toISOString(),
                path: request.path || request.url,
                method: request.method,
                ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {}),
            },
        };

        if (parsed.extra?.validationErrors) {
            body.errors = parsed.extra.validationErrors;
        }

        return body;
    }

    private appendDevErrorsIfNeeded(
        responseBody: ErrorResponseBody,
        exception: unknown,
    ) {
        const NODE_ENV = getEnv('NODE_ENV');
        const error = exception as
            | { message?: unknown; stack?: unknown }
            | null
            | undefined;

        if (NODE_ENV === 'local' || NODE_ENV === 'development') {
            responseBody.error = {
                message: error?.message,
                ...(NODE_ENV === 'local' ? { stack: error?.stack } : {}),
            };
        }
    }

    private logException(
        request: Request,
        parsed: ParsedError,
        exception: unknown,
    ) {
        // 토큰 없음/만료 등 루틴성 401은 운영 노이즈이므로 로깅을 건너뛴다
        if (this.isRoutineAuthError(parsed)) {
            return;
        }

        const logMeta = {
            error: parsed.message,
            stack: (exception as Error)?.stack,
            url: request.url,
            method: request.method,
            ip: request.ip,
            userAgent: request.get('User-Agent'),
            statusCode: parsed.statusCode,
            errorCode: parsed.errorCode,
        };

        if (parsed.statusCode >= 500) {
            this.logger.error('API Error [5xx]', logMeta);
        } else if (parsed.statusCode >= 400) {
            this.logger.warn(`API Warning [${parsed.statusCode}]`, logMeta);
        } else {
            this.logger.log('API Info', logMeta);
        }
    }

    private isRoutineAuthError(parsed: ParsedError): boolean {
        if ((parsed.statusCode as HttpStatus) !== HttpStatus.UNAUTHORIZED) {
            return false;
        }

        const routineAuthErrorCodes = new Set([
            'AUTH_TOKEN_EXPIRED',
            'AUTH_INVALID_TOKEN',
            'AUTH_TOKEN_NOT_BEFORE',
            'AUTH_ERROR',
            'AUTH_UNAUTHORIZED',
        ]);

        return (
            !!parsed.errorCode && routineAuthErrorCodes.has(parsed.errorCode)
        );
    }
}

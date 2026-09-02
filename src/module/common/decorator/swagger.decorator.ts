import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { getStandardErrorResponseSchema } from '../util/swagger.util';

export function ApiStandardResponse<T>(options: {
    summary: string;
    description?: string;
    successStatus?: HttpStatus;
    successType?: Type<T>;
    successDescription?: string;
    includeBadRequest?: boolean;
    includeUnauthorized?: boolean;
    includeForbidden?: boolean;
    includeNotFound?: boolean;
    includeInternalServerError?: boolean;
    /** 바이너리 파일 응답인 경우 (StreamableFile 등) */
    isBinary?: boolean;
    /** 바이너리 응답의 Content-Type (예: 'image/*', 'application/octet-stream') */
    binaryContentType?: string;
}) {
    const {
        summary,
        description,
        successStatus = HttpStatus.OK,
        successType,
        successDescription = '요청 성공',
        includeBadRequest = false,
        includeUnauthorized = false,
        includeForbidden = false,
        includeNotFound = false,
        includeInternalServerError = false,
        isBinary = false,
        binaryContentType = 'application/octet-stream',
    } = options;

    const decorators = [
        ApiOperation({
            summary,
            description,
        }),
    ];

    // 바이너리 응답인 경우
    if (isBinary) {
        decorators.push(
            ApiResponse({
                status: successStatus,
                description: successDescription,
                content: {
                    [binaryContentType]: {
                        schema: {
                            type: 'string',
                            format: 'binary',
                        },
                    },
                },
            }),
        );
    } else {
        // 일반 JSON 응답
        decorators.push(
            ApiResponse({
                status: successStatus,
                description: successDescription,
                type: successType,
            }),
        );
    }

    if (includeBadRequest) {
        decorators.push(
            ApiResponse({
                status: HttpStatus.BAD_REQUEST,
                description: '잘못된 요청 (파라미터 검증 실패 등)',
                schema: getStandardErrorResponseSchema('Bad Request'),
            }),
        );
    }

    if (includeUnauthorized) {
        decorators.push(
            ApiResponse({
                status: HttpStatus.UNAUTHORIZED,
                description: '인증 실패 (토큰 누락/만료/유효하지 않음)',
                schema: getStandardErrorResponseSchema('Unauthorized'),
            }),
        );
    }

    if (includeForbidden) {
        decorators.push(
            ApiResponse({
                status: HttpStatus.FORBIDDEN,
                description: '접근 거부 (CSRF 검증 실패 등)',
                schema: getStandardErrorResponseSchema('Forbidden'),
            }),
        );
    }

    if (includeNotFound) {
        decorators.push(
            ApiResponse({
                status: HttpStatus.NOT_FOUND,
                description: '리소스를 찾을 수 없음',
                schema: getStandardErrorResponseSchema('Resource not found'),
            }),
        );
    }

    if (includeInternalServerError) {
        decorators.push(
            ApiResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                description: '서버 내부 오류',
                schema: getStandardErrorResponseSchema('Internal Server Error'),
            }),
        );
    }

    return applyDecorators(...decorators);
}

/**
 * Swagger 공통 유틸리티
 */

/**
 * 표준 에러 응답 스키마 생성
 */
export function getStandardErrorResponseSchema(message: string) {
    return {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: message },
            data: { type: 'null' },
            meta: {
                type: 'object',
                properties: {
                    timestamp: {
                        type: 'string',
                        example: '2024-01-01T00:00:00.000Z',
                    },
                    path: { type: 'string', example: '/api/endpoint' },
                    method: { type: 'string', example: 'GET' },
                    errorCode: {
                        type: 'string',
                        nullable: true,
                        description:
                            '특정 에러 케이스에서만 포함되는 에러 코드 (DTO Validation, MongoDB 에러 등)',
                        enum: [
                            // DTO Validation (ValidationPipe)
                            'VALIDATION_ERROR',
                            // Mongoose 레벨
                            'MONGO_VALIDATION_ERROR',
                            'MONGO_CAST_ERROR',
                            'MONGO_DOCUMENT_NOT_FOUND',
                            'MONGO_VERSION_CONFLICT',
                            'MONGO_STRICT_MODE_VIOLATION',
                            'MONGO_SERVER_SELECTION_ERROR',
                            'MONGO_NETWORK_ERROR',
                            'MONGO_TIMEOUT',
                            // MongoDB Driver 레벨
                            'MONGO_DUPLICATE_KEY',
                            'MONGO_OPERATION_TIMEOUT',
                            'MONGO_NETWORK_TIMEOUT',
                            'MONGO_SHUTDOWN_IN_PROGRESS',
                            'MONGO_DOCUMENT_VALIDATION',
                            'MONGO_WRITE_CONFLICT',
                        ],
                        example: 'VALIDATION_ERROR',
                    },
                },
            },
        },
    };
}

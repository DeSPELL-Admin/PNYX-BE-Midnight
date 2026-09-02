import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ApiResponse,
    createPaginationData,
    PaginatedApiResponse,
    PaginationResult,
} from '../response/api-response';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { RESPONSE_DTO_KEY } from '../decorator/response-dto.decorator';
import { NO_TRANSFORM_KEY } from '../decorator/no-transform.decorator';

function isPaginationResult<T>(
    contents: unknown,
): contents is PaginationResult<T> {
    if (typeof contents !== 'object' || contents === null) return false;
    const candidate = contents as Partial<PaginationResult<T>>;
    return (
        typeof candidate.page === 'number' &&
        typeof candidate.limit === 'number' &&
        typeof candidate.total === 'number'
    );
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | PaginatedApiResponse<T> | T
> {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponse<T> | PaginatedApiResponse<T> | T> {
        const skip = this.reflector.getAllAndOverride<boolean>(
            NO_TRANSFORM_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (skip) return next.handle();

        const handler = context.getHandler();
        const DtoClass = this.reflector.get<ClassConstructor<T>>(
            RESPONSE_DTO_KEY,
            handler,
        );

        return next.handle().pipe(
            map((contents) => {
                // 1️⃣ 페이지네이션 응답 형태라면
                if (isPaginationResult<T>(contents)) {
                    const { data, page, limit, total } = contents;

                    const transformedItems = DtoClass
                        ? plainToInstance(DtoClass, data, {
                              excludeExtraneousValues: true,
                          })
                        : data;

                    const pagination = createPaginationData(page, limit, total);

                    const response: PaginatedApiResponse<T> = {
                        success: true,
                        data: transformedItems,
                        pagination,
                        meta: {
                            timestamp: new Date().toISOString(),
                        },
                    };

                    return response;
                }

                // 2️⃣ 그 외는 모두 "단일 응답"으로 간주
                // null이나 undefined인 경우 변환하지 않고 그대로 반환
                const transformedData =
                    DtoClass && contents != null
                        ? plainToInstance(DtoClass, contents, {
                              excludeExtraneousValues: true,
                          })
                        : contents;

                const response: ApiResponse<T> = {
                    success: true,
                    data: transformedData,
                    meta: {
                        timestamp: new Date().toISOString(),
                    },
                };

                return response;
            }),
        );
    }
}

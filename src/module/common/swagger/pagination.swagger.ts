import { ApiProperty } from '@nestjs/swagger';
import type { Type } from '@nestjs/common';
import { SwaggerMetadata } from './meta.swagger';

class SwaggerPaginationData {
    @ApiProperty({
        description: '현재 페이지 번호',
        example: 1,
        type: Number,
    })
    readonly page!: number;

    @ApiProperty({
        description: '페이지당 항목 수',
        example: 20,
        type: Number,
    })
    readonly limit!: number;

    @ApiProperty({
        description: '전체 항목 수',
        example: 100,
        type: Number,
    })
    readonly total!: number;

    @ApiProperty({
        description: '전체 페이지 수',
        example: 5,
        type: Number,
    })
    readonly totalPages!: number;

    @ApiProperty({
        description: '다음 페이지 존재 여부',
        example: true,
        type: Boolean,
    })
    readonly hasNext!: boolean;

    @ApiProperty({
        description: '이전 페이지 존재 여부',
        example: false,
        type: Boolean,
    })
    readonly hasPrev!: boolean;
}

export function createSwaggerPaginationResult<T>(
    dataType: Type<T>,
): Type<unknown> {
    class SwaggerPaginationResult {
        @ApiProperty({
            description: '성공 여부',
            type: Boolean,
        })
        readonly success: boolean;

        @ApiProperty({
            description: '데이터',
            type: dataType,
            isArray: true,
        })
        readonly data: T[];

        @ApiProperty({
            description: '페이지네이션 정보',
            type: SwaggerPaginationData,
        })
        readonly pagination!: SwaggerPaginationData;

        @ApiProperty({
            description: '메타데이터',
            type: SwaggerMetadata,
        })
        readonly meta!: SwaggerMetadata;
    }
    Object.defineProperty(SwaggerPaginationResult, 'name', {
        value: `PaginationResult_${dataType.name}`,
    });
    return SwaggerPaginationResult;
}

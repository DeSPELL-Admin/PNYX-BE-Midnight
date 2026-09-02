import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { SwaggerMetadata } from './meta.swagger';

export function createSwaggerSingleResult<T>(dataType: Type<T>): Type<unknown> {
    class SwaggerSingleResult {
        @ApiProperty({
            description: '성공 여부',
            type: Boolean,
        })
        readonly success: boolean;

        @ApiProperty({
            description: '데이터',
            type: dataType,
        })
        readonly data: T;

        @ApiProperty({
            description: '메타데이터',
            type: SwaggerMetadata,
        })
        readonly meta!: SwaggerMetadata;
    }
    Object.defineProperty(SwaggerSingleResult, 'name', {
        value: `SingleResult_${dataType.name}`,
    });
    return SwaggerSingleResult;
}

export function createSwaggerArraySingleResult<T>(
    dataType: Type<T>,
): Type<unknown> {
    class SwaggerArraySingleResult {
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
            description: '메타데이터',
            type: SwaggerMetadata,
        })
        readonly meta!: SwaggerMetadata;
    }
    Object.defineProperty(SwaggerArraySingleResult, 'name', {
        value: `ArraySingleResult_${dataType.name}`,
    });
    return SwaggerArraySingleResult;
}

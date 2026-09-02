import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
    @ApiPropertyOptional({
        description: '페이지 번호 (1 이상의 정수, 기본값: 1)',
        example: 1,
        type: Number,
        minimum: 1,
        default: 1,
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    readonly page?: number = 1;

    @ApiPropertyOptional({
        description: '페이지당 항목 수 (1 이상 100 이하의 정수, 기본값: 20)',
        example: 20,
        type: Number,
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(100)
    readonly limit?: number = 20;
}

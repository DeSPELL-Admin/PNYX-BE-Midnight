import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ByChainIdParamDto {
    @ApiProperty({
        description: '체인 ID (1 이상의 정수)',
        example: 1,
        type: Number,
        minimum: 1,
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Min(1)
    readonly chainId!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderParamDto {
    @ApiProperty({ description: '체인 ID', example: 99101 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    readonly chainId!: number;
    @ApiProperty({ description: '주문 ID (32 hex)' })
    @IsString()
    @Matches(/^[0-9a-f]{32}$/)
    readonly orderId!: string;
}

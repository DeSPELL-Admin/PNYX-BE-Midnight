import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class FindMyPointResDto {
    @ApiProperty({
        description: '보유 포인트',
        example: 1200,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly point!: number;
}

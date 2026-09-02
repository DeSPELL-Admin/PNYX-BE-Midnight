import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Exclude()
export class FindItemStatisticsByTournamentIdResDto {
    @ApiProperty({
        description: '아이템 ID',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly itemId!: number;

    @ApiProperty({
        description: '아이템 이름',
        example: 'Gozo',
        type: String,
    })
    @Expose()
    readonly name!: string;

    @ApiProperty({
        description: '아이템 이미지 이름',
        example: 'Gozo-1',
        type: String,
    })
    @Expose()
    readonly imageName!: string;

    @ApiPropertyOptional({
        description: '우승 비율 (genre=tournament 에서만 반환)',
        example: 0.5,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly firstRate?: number;

    @ApiPropertyOptional({
        description: '승률 (genre=tournament 에서만 반환)',
        example: 0.6,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly winRate?: number;

    @ApiPropertyOptional({
        description:
            '총 베팅액 (genre=betting 에서만 반환, bigint-safe string). 미설정 시 "0".',
        example: '1000000000000000000',
        type: String,
    })
    @Expose()
    readonly totalBetAmount?: string;
}

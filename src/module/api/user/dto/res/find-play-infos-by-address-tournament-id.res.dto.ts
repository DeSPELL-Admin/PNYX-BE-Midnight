import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Exclude()
export class FindPlayInfosByAddressTournamentIdResDto {
    @ApiPropertyOptional({
        description: '우승 아이템 ID (genre=tournament 에서만 반환)',
        example: 106,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly firstItemId?: number;

    @ApiPropertyOptional({
        description: '준우승 아이템 ID (genre=tournament 에서만 반환)',
        example: 57,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly secondItemId?: number;

    @ApiPropertyOptional({
        description:
            '참여 아이템 uint16 Hex 문자열 (genre=tournament 에서만 반환)',
        example: '0x1234567890abcdef1234567890abcdef12345678',
        type: String,
    })
    @Expose()
    readonly entryItemHexes?: string;

    @ApiPropertyOptional({
        description: '베팅 아이템 ID (genre=betting 에서만 반환)',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly betItemId?: number;

    @ApiPropertyOptional({
        description: '베팅액 (genre=betting 에서만 반환, bigint-safe string)',
        example: '1000000000000000000',
        type: String,
    })
    @Expose()
    readonly betAmount?: string;

    @ApiProperty({
        description: '트랜잭션 해시',
        example:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        type: String,
    })
    @Expose()
    readonly txHash!: string;
}

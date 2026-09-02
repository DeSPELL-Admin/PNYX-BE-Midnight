import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BettingStatus } from 'src/module/common/util/enum.util';

@Exclude()
export class FindBettingStatsByAddressTournamentIdResDto {
    @ApiProperty({
        description: '베팅 아이템 ID',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly itemId!: number;

    @ApiProperty({
        description: '누적 베팅액 (bigint-safe string)',
        example: '1000000000000000000',
        type: String,
    })
    @Expose()
    readonly amount!: string;

    @ApiProperty({
        description: '베팅 상태',
        enum: BettingStatus,
        example: BettingStatus.ONGOING,
    })
    @Expose()
    readonly status!: BettingStatus;

    @ApiPropertyOptional({
        description:
            '보상액 (bigint-safe string). 토너먼트가 종료(now >= endedAt)되고 ' +
            '우승 아이템(winItemId)에 베팅액 0 초과로 베팅한 경우에만 반환된다. ' +
            'floor(0.99 * totalPrize * amount / 우승 아이템 totalBetAmount).',
        example: '990000000000000000',
        type: String,
    })
    @Expose()
    readonly reward?: string;
}

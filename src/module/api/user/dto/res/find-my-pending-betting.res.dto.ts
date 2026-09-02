import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VoteMessageOption } from 'src/module/common/util/enum.util';

@Exclude()
export class FindMyPendingBettingResDto {
    @ApiProperty({
        description: '진행중 베팅의 토너먼트 ID',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly tournamentId!: number;

    @ApiProperty({
        description: '진행중 베팅의 아이템 ID',
        example: 3,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly itemId!: number;

    @ApiProperty({
        description: '진행중 베팅의 액션 (bet | cancel | reward)',
        enum: VoteMessageOption,
        example: VoteMessageOption.BET,
        nullable: true,
    })
    @Expose()
    readonly option!: VoteMessageOption | null;

    @ApiProperty({
        description: '진행중 베팅의 서명 액션 금액 (bigint-safe string)',
        example: '500',
        type: String,
    })
    @Expose()
    readonly amount!: string;

    @ApiProperty({
        description:
            '서명 만료 시각 (Unix seconds string). 지나면 재요청 시 재서명된다.',
        example: '1720512000',
        type: String,
        nullable: true,
    })
    @Expose()
    readonly deadline!: string | null;
}

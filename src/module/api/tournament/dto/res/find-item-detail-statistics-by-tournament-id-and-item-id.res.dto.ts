import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class FindItemDetailStatisticsByTournamentIdItemIdResDto {
    @ApiProperty({
        description: '패배한 아이템 ID',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly opponentItemId!: number;

    @ApiProperty({
        description: '상대 아이템 이름',
        example: 'Skuna',
        type: String,
    })
    @Expose()
    readonly opponentItemName!: string;

    @ApiProperty({
        description: '상대 아이템 이미지 이름',
        example: 'Skuna-1',
        type: String,
    })
    @Expose()
    readonly opponentItemImageName!: string;

    @ApiProperty({
        description: '1:1 승률',
        example: 0.7,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly winRate!: number;
}

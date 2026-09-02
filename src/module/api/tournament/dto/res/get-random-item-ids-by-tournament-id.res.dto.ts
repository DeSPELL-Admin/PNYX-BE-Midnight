import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class GetRandomItemIdsByTournamentIdResDto {
    @ApiProperty({
        description: '랜덤 아이템 ID 목록',
        example: [1, 2, 3, 4, 5],
        type: [Number],
    })
    @Expose()
    @Type(() => Number)
    readonly randomItemIds!: number[];
}

import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Exclude()
export class GetItemByTournamentIdItemIdResDto {
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
}

import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TournamentIdParamDto } from './tournament-id.param.dto';

export class TournamentIdItemIdParamDto extends TournamentIdParamDto {
    @ApiProperty({
        description: '아이템 ID (0 이상의 정수)',
        example: 1,
        type: Number,
        minimum: 0,
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Min(0)
    readonly itemId!: number;
}

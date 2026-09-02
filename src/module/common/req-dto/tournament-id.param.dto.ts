import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TournamentIdParamDto {
    @ApiProperty({
        description: '토너먼트 ID (0 이상의 정수)',
        example: 13,
        type: Number,
        minimum: 0,
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Min(0)
    readonly tournamentId!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateOrderBodyDto {
    @ApiProperty({ example: 0 })
    @IsInt()
    @Min(0)
    readonly tournamentId!: number;
}

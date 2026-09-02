import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsString, Length, Matches } from 'class-validator';
import { IsNotEmpty } from 'class-validator';

export class FindTournamentsByCategoryParamDto {
    @ApiProperty({
        description: '카테고리',
        example: 'Animation',
        type: String,
    })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @Length(1, 30)
    @Transform(({ value }) => String(value ?? '').trim())
    @Matches(/^[A-Za-z0-9_-]+$/)
    readonly category!: string;
}

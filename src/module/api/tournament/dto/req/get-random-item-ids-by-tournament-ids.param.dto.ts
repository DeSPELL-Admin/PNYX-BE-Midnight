import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max } from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { Min } from 'class-validator';
import { IsPowerOfTwo } from 'src/module/common/decorator/is-power-of-two.decorator';
import { TournamentIdParamDto } from 'src/module/common/req-dto/tournament-id.param.dto';

export class GetRandomItemIdsByTournamentIdParamDto extends TournamentIdParamDto {
    @ApiProperty({
        description: '라운드 수 (2 이상 1024 이하의 정수)',
        example: 64,
        type: Number,
        minimum: 2,
        maximum: 1024,
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Min(2)
    @Max(1024)
    @IsPowerOfTwo({
        message: 'roundCount must be a power of two between 2 and 1024',
    })
    readonly roundCount!: number;
}

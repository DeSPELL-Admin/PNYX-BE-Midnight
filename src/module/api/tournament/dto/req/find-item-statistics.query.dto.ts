import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/module/common/req-dto/pagination.query.dto';
import { TournamentGenre } from 'src/module/common/util/enum.util';

export class FindItemStatisticsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description:
            '통계 장르 (tournament | betting, 기본값: tournament). betting은 totalBetAmount 내림차순으로 반환.',
        enum: TournamentGenre,
        example: TournamentGenre.TOURNAMENT,
        default: TournamentGenre.TOURNAMENT,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsEnum(TournamentGenre)
    readonly genre?: TournamentGenre = TournamentGenre.TOURNAMENT;
}

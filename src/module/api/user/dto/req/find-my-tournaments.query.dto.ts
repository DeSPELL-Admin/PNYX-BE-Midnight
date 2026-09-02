import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/module/common/req-dto/pagination.query.dto';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

export class FindMyTournamentsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: '토너먼트 타입 필터 (event | classic, 기본값: classic)',
        enum: TournamentType,
        example: TournamentType.CLASSIC,
        default: TournamentType.CLASSIC,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsEnum(TournamentType)
    readonly type?: TournamentType = TournamentType.CLASSIC;

    @ApiPropertyOptional({
        description:
            '기간 필터 (upcoming | ongoing | ended, 기본값: ongoing). startedAt/endedAt이 null이면 ongoing으로 간주.',
        enum: TournamentPeriod,
        example: TournamentPeriod.ONGOING,
        default: TournamentPeriod.ONGOING,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsEnum(TournamentPeriod)
    readonly period?: TournamentPeriod = TournamentPeriod.ONGOING;

    @ApiPropertyOptional({
        description:
            '장르 필터 (tournament | betting, 기본값: tournament). 베팅 목록 조회 시 ' +
            'genre=betting과 함께 type=event를 지정하세요(베팅 토너먼트는 type=event).',
        enum: TournamentGenre,
        example: TournamentGenre.BETTING,
        default: TournamentGenre.TOURNAMENT,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.toLowerCase() : value,
    )
    @IsEnum(TournamentGenre)
    readonly genre?: TournamentGenre = TournamentGenre.TOURNAMENT;
}

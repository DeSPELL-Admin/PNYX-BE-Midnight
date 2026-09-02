import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderByPaginationQueryDto } from 'src/module/common/req-dto/order-by-pagination.query.dto';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

export class FindTournamentsQueryDto extends OrderByPaginationQueryDto {
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
}

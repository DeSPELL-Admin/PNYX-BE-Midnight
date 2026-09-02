import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortTournamentsType } from '../../api/tournament/tournament.util';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination.query.dto';

export class OrderByPaginationQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: '정렬 기준 (POPULARITY | LATEST, 기본값: POPULARITY)',
        enum: SortTournamentsType,
        example: SortTournamentsType.POPULARITY,
        default: SortTournamentsType.POPULARITY,
    })
    @IsOptional()
    @IsEnum(SortTournamentsType)
    readonly orderBy?: SortTournamentsType = SortTournamentsType.POPULARITY;
}

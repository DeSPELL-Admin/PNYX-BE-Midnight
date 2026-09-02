import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { TournamentService } from './tournament.service';
import { PaginationResult } from 'src/module/common/response/api-response';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerPaginationResult } from 'src/module/common/swagger/pagination.swagger';
import { FindTournamentsResDto } from './dto/res/find-tournaments.res.dto';
import { PaginationQueryDto } from '../../common/req-dto/pagination.query.dto';
import { FindTournamentsQueryDto } from './dto/req/find-tournaments.query.dto';
import { SortTournamentsType } from './tournament.util';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { createSwaggerSingleResult } from 'src/module/common/swagger/single.swagger';
import { TournamentIdParamDto } from '../../common/req-dto/tournament-id.param.dto';
import { TournamentIdItemIdParamDto } from '../../common/req-dto/tournament-id-item-id.param.dto';
import { GetItemByTournamentIdItemIdResDto } from './dto/res/get-item-by-tournament-id-and-item-id.res.dto';
import { GetRandomItemIdsByTournamentIdResDto } from './dto/res/get-random-item-ids-by-tournament-id.res.dto';
import { GetRandomItemIdsByTournamentIdParamDto } from './dto/req/get-random-item-ids-by-tournament-ids.param.dto';
import { FindItemStatisticsByTournamentIdResDto } from './dto/res/find-item-statistics-by-tournament-id.res.dto';
import { FindItemStatisticsQueryDto } from './dto/req/find-item-statistics.query.dto';
import { FindItemDetailStatisticsByTournamentIdItemIdResDto } from './dto/res/find-item-detail-statistics-by-tournament-id-and-item-id.res.dto';
import { GetTournamentByIdResDto } from './dto/res/get-tournament-by-id.res.dto';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';
import { Payload } from 'src/module/common/decorator/payload.decorator';

@ApiTags('Tournament')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller('tournaments')
export class TournamentController {
    constructor(private readonly tournamentService: TournamentService) {}

    @Get()
    @ResponseDto(FindTournamentsResDto)
    @ApiStandardResponse({
        summary: '토너먼트 목록 조회 (페이지네이션)',
        description:
            '모든 체인에 걸쳐 통합된 토너먼트 목록을 페이지네이션하여 조회합니다.',
        successType: createSwaggerPaginationResult(FindTournamentsResDto),
        successDescription: '토너먼트 목록 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findTounaments(
        @Payload('sub') walletAddress: string,
        @Query() findTournamentsQuery: FindTournamentsQueryDto,
    ): Promise<PaginationResult<FindTournamentsResDto>> {
        return await this.tournamentService.findTournaments(
            walletAddress.toLowerCase(),
            findTournamentsQuery.orderBy ?? SortTournamentsType.POPULARITY,
            findTournamentsQuery.page ?? 1,
            findTournamentsQuery.limit ?? 20,
            findTournamentsQuery.type ?? TournamentType.CLASSIC,
            findTournamentsQuery.period ?? TournamentPeriod.ONGOING,
        );
    }

    @Get(':tournamentId')
    @ResponseDto(GetTournamentByIdResDto)
    @ApiStandardResponse({
        summary: '특정 토너먼트 조회',
        description: '특정 토너먼트를 조회합니다.',
        successType: createSwaggerSingleResult(GetTournamentByIdResDto),
        successDescription: '특정 토너먼트 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeNotFound: true, // 토너먼트를 찾을 수 없음 (404)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async getTournamentById(
        @Param() params: TournamentIdParamDto,
    ): Promise<GetTournamentByIdResDto> {
        return await this.tournamentService.getTournamentById(
            params.tournamentId,
        );
    }

    @Get(':tournamentId/rounds/:roundCount')
    @ResponseDto(GetRandomItemIdsByTournamentIdResDto)
    @ApiStandardResponse({
        summary: '특정 토너먼트의 랜덤 아이템 ID 목록 조회',
        description: '특정 토너먼트의 랜덤 아이템 ID 목록을 조회합니다.',
        successType: createSwaggerSingleResult(
            GetRandomItemIdsByTournamentIdResDto,
        ),
        successDescription: '특정 토너먼트의 랜덤 아이템 ID 목록 조회 성공',
        includeBadRequest: true, // DTO Validation 또는 roundCount 초과 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async getRandomItemIdsByTournamentId(
        @Payload('sub') walletAddress: string,
        @Param() params: GetRandomItemIdsByTournamentIdParamDto,
    ): Promise<GetRandomItemIdsByTournamentIdResDto> {
        return await this.tournamentService.getRandomItemIdsByTournamentId(
            walletAddress.toLowerCase(),
            params.tournamentId,
            params.roundCount,
        );
    }

    @Get(':tournamentId/items/:itemId')
    @ResponseDto(GetItemByTournamentIdItemIdResDto)
    @ApiStandardResponse({
        summary: '특정 토너먼트의 특정 아이템 조회',
        description: '특정 토너먼트의 특정 아이템을 조회합니다.',
        successType: createSwaggerSingleResult(
            GetItemByTournamentIdItemIdResDto,
        ),
        successDescription: '특정 토너먼트의 특정 아이템 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeNotFound: true, // 아이템을 찾을 수 없음 (404)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async getItemByTournamentIdItemId(
        @Param() params: TournamentIdItemIdParamDto,
    ): Promise<GetItemByTournamentIdItemIdResDto> {
        return await this.tournamentService.getItemByTournamentIdItemId(
            params.tournamentId,
            params.itemId,
        );
    }

    @Get(':tournamentId/statistics')
    @ResponseDto(FindItemStatisticsByTournamentIdResDto)
    @ApiStandardResponse({
        summary: '특정 토너먼트의 아이템 통계 조회 (페이지네이션)',
        description:
            '특정 토너먼트의 아이템 통계를 조회합니다. genre=tournament(기본값)는 우승 비율·승률 기준으로, genre=betting은 totalBetAmount 내림차순으로 반환합니다.',
        successType: createSwaggerPaginationResult(
            FindItemStatisticsByTournamentIdResDto,
        ),
        successDescription: '특정 토너먼트의 아이템 통계 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findItemStatisticsByTournamentId(
        @Param() params: TournamentIdParamDto,
        @Query() query: FindItemStatisticsQueryDto,
    ): Promise<PaginationResult<FindItemStatisticsByTournamentIdResDto>> {
        return await this.tournamentService.findItemStatisticsByTournamentId(
            params.tournamentId,
            query.genre ?? TournamentGenre.TOURNAMENT,
            query.page ?? 1,
            query.limit ?? 20,
        );
    }

    @Get(':tournamentId/items/:itemId/statistics')
    @ResponseDto(FindItemDetailStatisticsByTournamentIdItemIdResDto)
    @ApiStandardResponse({
        summary: '특정 토너먼트의 특정 아이템 통계 조회 (페이지네이션)',
        description: '특정 토너먼트의 특정 아이템 통계를 조회합니다.',
        successType: createSwaggerPaginationResult(
            FindItemDetailStatisticsByTournamentIdItemIdResDto,
        ),
        successDescription: '특정 토너먼트의 특정 아이템 통계 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findItemDetailStatisticsByTournamentIdItemId(
        @Param() params: TournamentIdItemIdParamDto,
        @Query() paginationQuery: PaginationQueryDto,
    ): Promise<
        PaginationResult<FindItemDetailStatisticsByTournamentIdItemIdResDto>
    > {
        return await this.tournamentService.findItemDetailStatisticsByTournamentIdItemId(
            params.tournamentId,
            params.itemId,
            paginationQuery.page ?? 1,
            paginationQuery.limit ?? 20,
        );
    }
}

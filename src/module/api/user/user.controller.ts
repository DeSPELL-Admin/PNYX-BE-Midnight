import {
    Controller,
    Get,
    Header,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { FindMyTournamentsQueryDto } from './dto/req/find-my-tournaments.query.dto';
import { FindMyPlayInfosQueryDto } from './dto/req/find-my-play-infos.query.dto';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { PaginationResult } from 'src/module/common/response/api-response';
import { UserService } from './user.service';
import { FindTournamentsByAddressResDto } from './dto/res/find-tournaments-by-address.res.dto';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerPaginationResult } from 'src/module/common/swagger/pagination.swagger';
import {
    createSwaggerArraySingleResult,
    createSwaggerSingleResult,
} from 'src/module/common/swagger/single.swagger';
import { FindPlayInfosByAddressTournamentIdResDto } from './dto/res/find-play-infos-by-address-tournament-id.res.dto';
import { FindBettingStatsByAddressTournamentIdResDto } from './dto/res/find-betting-stats-by-address-tournament-id.res.dto';
import { FindMyPendingBettingResDto } from './dto/res/find-my-pending-betting.res.dto';
import { FindMyPointResDto } from './dto/res/find-my-point.res.dto';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';
import { Payload } from 'src/module/common/decorator/payload.decorator';
import { TournamentIdParamDto } from 'src/module/common/req-dto/tournament-id.param.dto';

@ApiTags('User')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller('me')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @Header('Cache-Control', 'no-store')
    @ResponseDto(FindMyPointResDto)
    @ApiStandardResponse({
        summary: '내 포인트 조회',
        description: '인증된 지갑 주소의 보유 포인트를 반환합니다.',
        successType: createSwaggerSingleResult(FindMyPointResDto),
        successDescription: '내 포인트 조회 성공',
        includeUnauthorized: true, // 인증 실패 (401)
        includeNotFound: true, // 사용자 없음 (404)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async getMyPoint(
        @Payload('sub') walletAddress: string,
    ): Promise<FindMyPointResDto> {
        return await this.userService.getPoint(walletAddress.toLowerCase());
    }

    @Get('betting/pending')
    @Header('Cache-Control', 'no-store')
    @ResponseDto(FindMyPendingBettingResDto)
    @ApiStandardResponse({
        summary: '내 진행중(PENDING) 베팅 위치 조회',
        description:
            '인증된 지갑 주소의 진행중(PENDING) 베팅 위치를 반환합니다. PENDING은 ' +
            '지갑당 최대 1건이며, tournamentId/itemId/option(bet|cancel|reward)/amount/deadline을 ' +
            '반환합니다. 진행중 베팅이 없으면 data는 null입니다.',
        successType: createSwaggerSingleResult(FindMyPendingBettingResDto),
        successDescription: '내 진행중 베팅 위치 조회 성공 (없으면 null)',
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findMyPendingBetting(
        @Payload('sub') walletAddress: string,
    ): Promise<FindMyPendingBettingResDto | null> {
        return await this.userService.findMyPendingBetting(
            walletAddress.toLowerCase(),
        );
    }

    @Get('tournaments')
    @Header('Cache-Control', 'no-store')
    @ResponseDto(FindTournamentsByAddressResDto)
    @ApiStandardResponse({
        summary: '내 토너먼트 목록 조회 (페이지네이션)',
        description:
            '인증된 지갑 주소의 토너먼트 목록을 모든 체인에 걸쳐 통합 조회합니다. ' +
            'genre(tournament|betting) 미지정 시 tournament 장르를 반환하며, 베팅 목록은 ' +
            'genre=betting&type=event로 조회합니다(베팅 토너먼트는 type=event).',
        successType: createSwaggerPaginationResult(
            FindTournamentsByAddressResDto,
        ),
        successDescription: '내 토너먼트 목록 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findTournamentsByAddress(
        @Payload('sub') walletAddress: string,
        @Query() findMyTournamentsQuery: FindMyTournamentsQueryDto,
    ): Promise<PaginationResult<FindTournamentsByAddressResDto>> {
        return await this.userService.findTournamentsByAddress(
            walletAddress.toLowerCase(),
            findMyTournamentsQuery.page ?? 1,
            findMyTournamentsQuery.limit ?? 20,
            findMyTournamentsQuery.type ?? TournamentType.CLASSIC,
            findMyTournamentsQuery.period ?? TournamentPeriod.ONGOING,
            findMyTournamentsQuery.genre ?? TournamentGenre.TOURNAMENT,
        );
    }

    @Get('tournaments/:tournamentId/play-infos')
    @Header('Cache-Control', 'no-store')
    @ResponseDto(FindPlayInfosByAddressTournamentIdResDto)
    @ApiStandardResponse({
        summary: '내 토너먼트 플레이 상세 정보 조회 (페이지네이션)',
        description:
            '인증된 지갑 주소의 특정 토너먼트 플레이 상세 정보를 모든 체인에 걸쳐 통합 조회합니다. ' +
            'genre=tournament(기본값)는 우승/준우승/참여 아이템 정보를, genre=betting은 betItemId/betAmount/txHash를 createdAt 내림차순으로 반환합니다.',
        successType: createSwaggerPaginationResult(
            FindPlayInfosByAddressTournamentIdResDto,
        ),
        successDescription: '내 토너먼트 플레이 상세 정보 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findPlayInfosByAddressTournamentId(
        @Payload('sub') walletAddress: string,
        @Param() params: TournamentIdParamDto,
        @Query() query: FindMyPlayInfosQueryDto,
    ): Promise<PaginationResult<FindPlayInfosByAddressTournamentIdResDto>> {
        return await this.userService.findPlayInfosByAddressTournamentId(
            walletAddress.toLowerCase(),
            params.tournamentId,
            query.page ?? 1,
            query.limit ?? 20,
            query.genre ?? TournamentGenre.TOURNAMENT,
        );
    }

    @Get('tournaments/:tournamentId/betting-stats')
    @Header('Cache-Control', 'no-store')
    @ResponseDto(FindBettingStatsByAddressTournamentIdResDto)
    @ApiStandardResponse({
        summary: '내 토너먼트 베팅 현황 조회',
        description:
            '인증된 지갑 주소의 특정 토너먼트 베팅 현황(itemId/amount/status)을 ' +
            '배열로 반환합니다. 토너먼트가 종료(now >= endedAt)되고 우승 ' +
            '아이템(winItemId)에 베팅액 0 초과로 베팅한 경우, 해당 행에 ' +
            'reward(bigint-safe string)를 함께 반환합니다.',
        successType: createSwaggerArraySingleResult(
            FindBettingStatsByAddressTournamentIdResDto,
        ),
        successDescription: '내 토너먼트 베팅 현황 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findBettingStatsByAddressTournamentId(
        @Payload('sub') walletAddress: string,
        @Param() params: TournamentIdParamDto,
    ): Promise<FindBettingStatsByAddressTournamentIdResDto[]> {
        return await this.userService.findBettingStatsByAddressTournamentId(
            walletAddress.toLowerCase(),
            params.tournamentId,
        );
    }
}

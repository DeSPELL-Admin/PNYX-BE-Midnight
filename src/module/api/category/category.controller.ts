import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { GetCategoriesResDto } from './dto/res/get-categories.res.dto';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerPaginationResult } from 'src/module/common/swagger/pagination.swagger';
import { PaginationQueryDto } from 'src/module/common/req-dto/pagination.query.dto';
import { PaginationResult } from 'src/module/common/response/api-response';
import { FindTournamentsQueryDto } from 'src/module/api/tournament/dto/req/find-tournaments.query.dto';
import { FindTournamentsByCategoryParamDto } from './dto/req/find-tournaments-by-category.param.dto';
import { FindTournamentsByCategoryResDto } from './dto/res/find-tournaments-by-category.res.dto';
import { SortTournamentsType } from 'src/module/api/tournament/tournament.util';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';

@ApiTags('Category')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller()
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Get('categories')
    @ResponseDto(GetCategoriesResDto)
    @ApiStandardResponse({
        summary: '카테고리 목록 조회 (페이지네이션)',
        description: '카테고리 목록을 조회합니다.',
        successType: createSwaggerPaginationResult(GetCategoriesResDto),
        successDescription: '카테고리 목록 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async getCategories(
        @Query() paginationQuery: PaginationQueryDto,
    ): Promise<PaginationResult<GetCategoriesResDto>> {
        return await this.categoryService.getCategories(
            paginationQuery.page ?? 1,
            paginationQuery.limit ?? 20,
        );
    }

    @Get('categories/:category/tournaments')
    @ResponseDto(FindTournamentsByCategoryResDto)
    @ApiStandardResponse({
        summary: '카테고리별 토너먼트 목록 조회 (페이지네이션)',
        description: '카테고리별 토너먼트 목록을 조회합니다.',
        successType: createSwaggerPaginationResult(
            FindTournamentsByCategoryResDto,
        ),
        successDescription: '카테고리별 토너먼트 목록 조회 성공',
        includeBadRequest: true, // DTO Validation 에러 (400)
        includeUnauthorized: true, // 인증 실패 (401)
        includeInternalServerError: true, // DB 에러 (500)
    })
    async findTournamentsByCategory(
        @Param() params: FindTournamentsByCategoryParamDto,
        @Query() findTournamentsQuery: FindTournamentsQueryDto,
    ): Promise<PaginationResult<FindTournamentsByCategoryResDto>> {
        return await this.categoryService.findTournamentsByCategory(
            params.category,
            findTournamentsQuery.orderBy ?? SortTournamentsType.POPULARITY,
            findTournamentsQuery.page ?? 1,
            findTournamentsQuery.limit ?? 20,
            findTournamentsQuery.type ?? TournamentType.CLASSIC,
            findTournamentsQuery.period ?? TournamentPeriod.ONGOING,
        );
    }
}

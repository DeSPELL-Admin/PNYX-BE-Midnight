import { Injectable } from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { GetCategoriesResDto } from './dto/res/get-categories.res.dto';
import { PaginationResult } from 'src/module/common/response/api-response';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import { SortTournamentsType } from 'src/module/api/tournament/tournament.util';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { FindTournamentsByCategoryResDto } from './dto/res/find-tournaments-by-category.res.dto';

@Injectable()
export class CategoryService {
    constructor(
        private readonly categoryRepository: CategoryRepository,
        private readonly tournamentService: TournamentService,
    ) {}

    async getCategories(
        page: number,
        limit: number,
    ): Promise<PaginationResult<GetCategoriesResDto>> {
        const [categories, total] = await Promise.all([
            this.categoryRepository.getCategories(page, limit),
            this.categoryRepository.countCategories(),
        ]);
        return {
            data: categories,
            page,
            limit,
            total,
        };
    }

    async findTournamentsByCategory(
        category: string,
        orderBy: SortTournamentsType,
        page: number,
        limit: number,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<PaginationResult<FindTournamentsByCategoryResDto>> {
        return await this.tournamentService.findTournamentsByCategory(
            category,
            orderBy,
            page,
            limit,
            type,
            period,
        );
    }
}

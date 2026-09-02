import { Injectable, NotFoundException } from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { PaginationResult } from 'src/module/common/response/api-response';
import { FindTournamentsResDto } from './dto/res/find-tournaments.res.dto';
import { SortTournamentsType, TournamentStatus } from './tournament.util';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { FindTournamentsByCategoryResDto } from 'src/module/api/category/dto/res/find-tournaments-by-category.res.dto';
import { GetTournamentByIdResDto } from './dto/res/get-tournament-by-id.res.dto';
import { ItemService } from 'src/module/domain/item/item.service';
import { MatchService } from 'src/module/domain/match/match.service';
import { PlayVerificationService } from 'src/module/domain/play-verification/play-verification.service';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { GetRandomItemIdsByTournamentIdResDto } from './dto/res/get-random-item-ids-by-tournament-id.res.dto';
import { GetItemByTournamentIdItemIdResDto } from './dto/res/get-item-by-tournament-id-and-item-id.res.dto';
import { FindItemStatisticsByTournamentIdResDto } from './dto/res/find-item-statistics-by-tournament-id.res.dto';
import { FindItemDetailStatisticsByTournamentIdItemIdResDto } from './dto/res/find-item-detail-statistics-by-tournament-id-and-item-id.res.dto';
import { FindTypeAndPointByIdQueryResult } from './query-result/find-type-and-point-by-id.query-result';


@Injectable()
export class TournamentService {
    constructor(
        private readonly tournamentRepository: TournamentRepository,
        private readonly itemService: ItemService,
        private readonly matchService: MatchService,
        private readonly playVerificationService: PlayVerificationService,
        private readonly playInfoService: PlayInfoService,
    ) {}

    async findTournaments(
        walletAddress: string,
        orderBy: SortTournamentsType,
        page: number,
        limit: number,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<PaginationResult<FindTournamentsResDto>> {
        const [tournaments, total] = await Promise.all([
            this.tournamentRepository.findTournaments(
                orderBy,
                page,
                limit,
                type,
                period,
            ),
            this.tournamentRepository.countTournaments(type, period),
        ]);

        const playedTournamentIds =
            await this.playInfoService.findPlayedTournamentIds(
                walletAddress,
                tournaments.map((tournament) => tournament.tournamentId),
            );
        const playedTournamentIdsSet = new Set(playedTournamentIds);

        const data = tournaments.map((tournament) => ({
            ...tournament,
            status: playedTournamentIdsSet.has(tournament.tournamentId)
                ? TournamentStatus.COMPLETED
                : TournamentStatus.INCOMPLETE,
        }));

        return {
            data,
            page,
            limit,
            total,
        };
    }

    async getTournamentById(
        tournamentId: number,
    ): Promise<GetTournamentByIdResDto> {
        const [tournament, itemCount] = await Promise.all([
            this.tournamentRepository.getTournamentById(tournamentId),
            this.itemService.getItemCountByTournamentId(tournamentId),
        ]);

        if (!tournament) throw new NotFoundException('Tournament not found');

        return { ...tournament, itemCount };
    }

    async findTypeAndPointById(
        tournamentId: number,
    ): Promise<FindTypeAndPointByIdQueryResult> {
        const result =
            await this.tournamentRepository.findTypeAndPointById(tournamentId);

        if (!result) {
            throw new NotFoundException('Tournament not found');
        }

        return result;
    }

    async findTournamentsByCategory(
        category: string,
        orderBy: SortTournamentsType,
        page: number,
        limit: number,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<PaginationResult<FindTournamentsByCategoryResDto>> {
        const [tournaments, total] = await Promise.all([
            this.tournamentRepository.findTournamentsByCategory(
                category,
                orderBy,
                page,
                limit,
                type,
                period,
            ),
            this.tournamentRepository.countTournamentsByCategory(
                category,
                type,
                period,
            ),
        ]);

        return {
            data: tournaments,
            page,
            limit,
            total,
        };
    }

    async getRandomItemIdsByTournamentId(
        walletAddress: string,
        tournamentId: number,
        roundCount: number,
    ): Promise<GetRandomItemIdsByTournamentIdResDto> {
        const result = await this.itemService.getRandomItemIdsByTournamentId(
            tournamentId,
            roundCount,
        );

        await this.playVerificationService.upsert(
            walletAddress,
            tournamentId,
            result.randomItemIds.join('_'),
        );

        return result;
    }

    async getItemByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
    ): Promise<GetItemByTournamentIdItemIdResDto> {
        return await this.itemService.getItemByTournamentIdItemId(
            tournamentId,
            itemId,
        );
    }

    async findItemStatisticsByTournamentId(
        tournamentId: number,
        genre: TournamentGenre,
        page: number,
        limit: number,
    ): Promise<PaginationResult<FindItemStatisticsByTournamentIdResDto>> {
        return await this.itemService.findItemStatisticsByTournamentId(
            tournamentId,
            genre,
            page,
            limit,
        );
    }

    async findItemDetailStatisticsByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
        page: number,
        limit: number,
    ): Promise<
        PaginationResult<FindItemDetailStatisticsByTournamentIdItemIdResDto>
    > {
        return await this.matchService.findItemDetailStatisticsByTournamentIdItemId(
            tournamentId,
            itemId,
            page,
            limit,
        );
    }
}

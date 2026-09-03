import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ItemRepository } from './item.repository';
import { FindNamesByTournamentIdQueryResult } from './query-result/find-names-by-tournament-id.query-result';
import { GetItemByTournamentIdItemIdResDto } from 'src/module/api/tournament/dto/res/get-item-by-tournament-id-and-item-id.res.dto';
import { GetRandomItemIdsByTournamentIdResDto } from 'src/module/api/tournament/dto/res/get-random-item-ids-by-tournament-id.res.dto';
import { pickRandomNumbers } from './item.util';
import { FindItemStatisticsByTournamentIdResDto } from 'src/module/api/tournament/dto/res/find-item-statistics-by-tournament-id.res.dto';
import { PaginationResult } from 'src/module/common/response/api-response';
import { TournamentGenre } from 'src/module/common/util/enum.util';

@Injectable()
export class ItemService {
    constructor(private readonly itemRepository: ItemRepository) {}

    async getItemCountByTournamentId(tournamentId: number): Promise<number> {
        return await this.itemRepository.getItemCountByTournamentId(
            tournamentId,
        );
    }

    async getRandomItemIdsByTournamentId(
        tournamentId: number,
        roundCount: number,
    ): Promise<GetRandomItemIdsByTournamentIdResDto> {
        const totalItemCount =
            await this.itemRepository.getItemCountByTournamentId(tournamentId);

        if (totalItemCount < roundCount) {
            throw new BadRequestException(
                'Round count is greater than total item count',
            );
        }

        const randomItemIds = pickRandomNumbers(totalItemCount, roundCount);
        return { randomItemIds };
    }

    /** 토너먼트의 (itemId, name, imageName) 전체 — 데이터셋 이름 해석·구매 카탈로그용. */
    async findNamesByTournamentId(
        tournamentId: number,
    ): Promise<FindNamesByTournamentIdQueryResult[]> {
        return await this.itemRepository.findNamesByTournamentId(tournamentId);
    }

    async getItemByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
    ): Promise<GetItemByTournamentIdItemIdResDto> {
        const item = await this.itemRepository.getItemByTournamentIdItemId(
            tournamentId,
            itemId,
        );

        if (!item) throw new NotFoundException('Item not found');

        return item;
    }

    async findItemStatisticsByTournamentId(
        tournamentId: number,
        genre: TournamentGenre,
        page: number,
        limit: number,
    ): Promise<PaginationResult<FindItemStatisticsByTournamentIdResDto>> {
        const statisticsQuery =
            genre === TournamentGenre.BETTING
                ? this.itemRepository.findItemBettingStatisticsByTournamentId(
                      tournamentId,
                      page,
                      limit,
                  )
                : this.itemRepository.findItemStatisticsByTournamentId(
                      tournamentId,
                      page,
                      limit,
                  );

        const [itemStatistics, total] = await Promise.all([
            statisticsQuery,
            this.itemRepository.getItemCountByTournamentId(tournamentId),
        ]);

        return {
            data: itemStatistics,
            page,
            limit,
            total,
        };
    }
}

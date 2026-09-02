import { Injectable } from '@nestjs/common';
import { MatchRepository } from './match.repository';
import { PaginationResult } from 'src/module/common/response/api-response';
import { FindItemDetailStatisticsByTournamentIdItemIdResDto } from 'src/module/api/tournament/dto/res/find-item-detail-statistics-by-tournament-id-and-item-id.res.dto';

@Injectable()
export class MatchService {
    constructor(private readonly matchRepository: MatchRepository) {}

    async findItemDetailStatisticsByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
        page: number,
        limit: number,
    ): Promise<
        PaginationResult<FindItemDetailStatisticsByTournamentIdItemIdResDto>
    > {
        const [matches, total] = await Promise.all([
            this.matchRepository.findItemDetailStatisticsByTournamentIdItemId(
                tournamentId,
                itemId,
                page,
                limit,
            ),
            this.matchRepository.countItemDetailStatisticsByTournamentIdItemId(
                tournamentId,
                itemId,
            ),
        ]);

        return {
            data: matches,
            page,
            limit,
            total,
        };
    }
}

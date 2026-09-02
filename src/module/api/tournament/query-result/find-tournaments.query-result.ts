import { BettingType, TournamentGenre } from 'src/module/common/util/enum.util';

export class FindTournamentsQueryResult {
    readonly tournamentId!: number;
    readonly category!: string;
    readonly title!: string;
    readonly selectedCount!: number;
    readonly firstItemImageName!: string;
    readonly secondItemImageName!: string;
    readonly genre!: TournamentGenre;
    readonly startedAt!: Date | null;
    readonly endedAt!: Date | null;
    readonly point?: number;
    readonly totalPrize?: string;
    readonly minBetAmount?: string;
    readonly bettingType?: BettingType;
    readonly winItemId?: number | null;
}

import { BettingType, TournamentGenre } from 'src/module/common/util/enum.util';

export class FindTournamentsByCategoryQueryResult {
    readonly tournamentId!: number;
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

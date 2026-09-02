import { BettingType, TournamentGenre } from 'src/module/common/util/enum.util';

export class FindTournamentsByAddressQueryResult {
    readonly category!: string;
    readonly tournamentId!: number;
    readonly title!: string;
    readonly selectedCount!: number;
    readonly firstItemImageName!: string;
    readonly secondItemImageName!: string;
    readonly txHash!: string;
    readonly genre!: TournamentGenre;
    readonly startedAt!: Date | null;
    readonly endedAt!: Date | null;
    readonly point?: number;
    readonly totalPrize?: string;
    readonly minBetAmount?: string;
    readonly bettingType?: BettingType;
    readonly winItemId?: number | null;
}

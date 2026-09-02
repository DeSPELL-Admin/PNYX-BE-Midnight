import { BettingStatus } from 'src/module/common/util/enum.util';

export class FindBettingStatsByAddressTournamentIdQueryResult {
    readonly itemId!: number;
    readonly amount!: string;
    readonly status!: BettingStatus;
    readonly endedAt!: Date | null;
    readonly winItemId!: number | null;
    readonly totalPrize!: string | null;
    readonly winItemTotalBetAmount!: string | null;
}

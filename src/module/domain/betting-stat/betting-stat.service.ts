import { Injectable } from '@nestjs/common';
import { BettingStatRepository } from './betting-stat.repository';
import { FindBettingStatsByAddressTournamentIdResDto } from 'src/module/api/user/dto/res/find-betting-stats-by-address-tournament-id.res.dto';
import { calculateBettingReward } from './betting-stat.util';
import { FindPendingBettingQueryResult } from './query-result/find-pending-betting.query-result';

@Injectable()
export class BettingStatService {
    constructor(private readonly bettingStatRepository: BettingStatRepository) {}

    async findBettingStatsByAddressTournamentId(walletAddress: string, tournamentId: number): Promise<FindBettingStatsByAddressTournamentIdResDto[]> {
        const rows = await this.bettingStatRepository.findByWalletAddressAndTournamentId(walletAddress, tournamentId);
        const now = new Date();
        return rows.map((row) => {
            const base: FindBettingStatsByAddressTournamentIdResDto = { itemId: row.itemId, amount: row.amount, status: row.status };
            const isEnded = row.endedAt !== null && now.getTime() >= new Date(row.endedAt).getTime();
            const isWinningItem = row.winItemId !== null && row.itemId === row.winItemId;
            if (isEnded && isWinningItem) {
                const reward = calculateBettingReward(row.totalPrize, row.amount, row.winItemTotalBetAmount);
                if (reward !== null) return { ...base, reward };
            }
            return base;
        });
    }

    async findPending(walletAddress: string): Promise<FindPendingBettingQueryResult | null> {
        return this.bettingStatRepository.findPending(walletAddress);
    }
}

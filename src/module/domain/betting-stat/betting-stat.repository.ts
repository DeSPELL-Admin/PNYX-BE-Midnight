import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BettingStat, BettingStatDocument } from 'src/schema/domain/event/betting-stat.schema';
import { BettingStatus } from 'src/module/common/util/enum.util';
import { FindBettingStatsByAddressTournamentIdQueryResult } from './query-result/find-betting-stats-by-address-tournament-id.query-result';
import { FindPendingBettingQueryResult } from './query-result/find-pending-betting.query-result';

@Injectable()
export class BettingStatRepository {
    constructor(@InjectModel(BettingStat.name) private readonly bettingStatModel: Model<BettingStatDocument>) {}

    async findByWalletAddressAndTournamentId(walletAddress: string, tournamentId: number): Promise<FindBettingStatsByAddressTournamentIdQueryResult[]> {
        return this.bettingStatModel.aggregate<FindBettingStatsByAddressTournamentIdQueryResult>([
            { $match: { walletAddress, tournamentId } },
            { $lookup: { from: 'tournaments', localField: 'tournamentId', foreignField: 'tournamentId', as: 'tournament' } },
            { $unwind: { path: '$tournament', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'items', let: { tid: '$tournamentId', win: '$tournament.winItemId' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$tournamentId', '$$tid'] }, { $eq: ['$itemId', '$$win'] }] } } }, { $project: { _id: 0, totalBetAmount: 1 } }], as: 'winItem' } },
            { $sort: { itemId: 1 } },
            { $project: { _id: 0, itemId: 1, amount: 1, status: 1, endedAt: { $ifNull: ['$tournament.endedAt', null] }, winItemId: { $ifNull: ['$tournament.winItemId', null] }, totalPrize: { $ifNull: ['$tournament.totalPrize', null] }, winItemTotalBetAmount: { $ifNull: [{ $arrayElemAt: ['$winItem.totalBetAmount', 0] }, null] } } },
        ]).exec();
    }

    async findPending(walletAddress: string): Promise<FindPendingBettingQueryResult | null> {
        return this.bettingStatModel.findOne({ walletAddress, status: BettingStatus.PENDING }).select('tournamentId itemId amount -_id').lean<FindPendingBettingQueryResult>().exec();
    }
}

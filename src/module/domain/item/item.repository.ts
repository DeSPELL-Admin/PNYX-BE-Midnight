import { InjectModel } from '@nestjs/mongoose';
import { Item, ItemDocument } from 'src/schema/domain/event/item.schema';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { GetItemByTournamentIdAndItemIdQueryResult } from './query-result/get-item-by-tournament-id-and-item-id.query-result';
import { FindItemStatisticsByTournamentIdQueryResult } from './query-result/find-item-statistics-by-tournament-id.query-result';
import { FindItemBettingStatisticsByTournamentIdQueryResult } from './query-result/find-item-betting-statistics-by-tournament-id.query-result';
import { FindNamesByTournamentIdQueryResult } from './query-result/find-names-by-tournament-id.query-result';
import { calculateSkip } from 'src/module/common/util/pagination.util';

@Injectable()
export class ItemRepository {
    constructor(
        @InjectModel(Item.name)
        private readonly itemModel: Model<ItemDocument>,
    ) {}

    async getItemCountByTournamentId(tournamentId: number): Promise<number> {
        return await this.itemModel.countDocuments({
            tournamentId,
        });
    }

    async getItemByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
    ): Promise<GetItemByTournamentIdAndItemIdQueryResult | null> {
        return await this.itemModel
            .findOne({ tournamentId, itemId })
            .select('name imageName -_id')
            .lean()
            .exec();
    }

    /** 데이터셋/카탈로그용 이름 조회 — itemId 오름차순. */
    async findNamesByTournamentId(
        tournamentId: number,
    ): Promise<FindNamesByTournamentIdQueryResult[]> {
        return await this.itemModel
            .find({ tournamentId })
            .sort({ itemId: 1 })
            .select('itemId name imageName -_id')
            .lean<FindNamesByTournamentIdQueryResult[]>()
            .exec();
    }

    async findItemStatisticsByTournamentId(
        tournamentId: number,
        page: number,
        limit: number,
    ): Promise<FindItemStatisticsByTournamentIdQueryResult[]> {
        const skip = calculateSkip(page, limit);

        return this.itemModel
            .aggregate<FindItemStatisticsByTournamentIdQueryResult>([
                {
                    $match: {
                        tournamentId,
                    },
                },
                {
                    // $addFields (not $project) so createdAt survives to the
                    // $sort below; otherwise the createdAt tiebreak is a no-op.
                    $addFields: {
                        firstRate: {
                            $cond: [
                                { $gt: ['$tournamentEntries', 0] },
                                {
                                    $divide: [
                                        '$firstCount',
                                        '$tournamentEntries',
                                    ],
                                },
                                0,
                            ],
                        },
                        winRate: {
                            $cond: [
                                { $gt: ['$totalMatchEntries', 0] },
                                { $divide: ['$wins', '$totalMatchEntries'] },
                                0,
                            ],
                        },
                    },
                },
                { $sort: { firstRate: -1, winRate: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        itemId: 1,
                        name: 1,
                        imageName: 1,
                        firstRate: 1,
                        winRate: 1,
                    },
                },
            ])
            .exec();
    }

    async findItemBettingStatisticsByTournamentId(
        tournamentId: number,
        page: number,
        limit: number,
    ): Promise<FindItemBettingStatisticsByTournamentIdQueryResult[]> {
        const skip = calculateSkip(page, limit);

        return this.itemModel
            .aggregate<FindItemBettingStatisticsByTournamentIdQueryResult>([
                {
                    $match: {
                        tournamentId,
                    },
                },
                {
                    // totalBetAmount는 bigint-safe string이라 그대로 $sort하면
                    // 사전식 정렬("9" > "100")이 된다. Decimal128로 변환해
                    // 숫자 정렬하고, 값이 없으면 0으로 취급한다.
                    $addFields: {
                        betAmountSort: {
                            $convert: {
                                input: '$totalBetAmount',
                                to: 'decimal',
                                onNull: 0,
                                onError: 0,
                            },
                        },
                    },
                },
                { $sort: { betAmountSort: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        itemId: 1,
                        name: 1,
                        imageName: 1,
                        totalBetAmount: { $ifNull: ['$totalBetAmount', '0'] },
                    },
                },
            ])
            .exec();
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from 'src/schema/domain/event/match.schema';
import { FindItemDetailStatisticsByTournamentIdAndItemIdQueryResult } from './query-result/find-item-detail-statistics-by-tournament-id-and-item-id.query-reuslt';
import { calculateSkip } from 'src/module/common/util/pagination.util';

@Injectable()
export class MatchRepository {
    constructor(
        @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    ) {}

    async findItemDetailStatisticsByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
        page: number,
        limit: number,
    ): Promise<FindItemDetailStatisticsByTournamentIdAndItemIdQueryResult[]> {
        const skip = calculateSkip(page, limit);

        const ITEM_COLLECTION = 'items';

        return this.matchModel
            .aggregate<FindItemDetailStatisticsByTournamentIdAndItemIdQueryResult>(
                [
                    {
                        $match: {
                            tournamentId,
                            $or: [
                                { itemLowId: itemId },
                                { itemHighId: itemId },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            _isLow: { $eq: ['$itemLowId', itemId] },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            opponentItemId: {
                                $cond: ['$_isLow', '$itemHighId', '$itemLowId'],
                            },
                            winRate: {
                                $cond: [
                                    { $gt: ['$totalMatches', 0] },
                                    {
                                        $divide: [
                                            {
                                                $cond: [
                                                    '$_isLow',
                                                    '$lowWins',
                                                    '$highWins',
                                                ],
                                            },
                                            '$totalMatches',
                                        ],
                                    },
                                    0,
                                ],
                            },
                            createdAt: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: ITEM_COLLECTION,
                            let: { opponentItemId: '$opponentItemId' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        '$tournamentId',
                                                        tournamentId,
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        '$itemId',
                                                        '$$opponentItemId',
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                { $project: { _id: 0, name: 1, imageName: 1 } },
                            ],
                            as: 'opponentItem',
                        },
                    },
                    {
                        $unwind: {
                            path: '$opponentItem',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $addFields: {
                            opponentItemName: '$opponentItem.name',
                            opponentItemImageName: '$opponentItem.imageName',
                        },
                    },
                    {
                        $project: {
                            opponentItem: 0,
                        },
                    },

                    { $sort: { winRate: -1, createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ],
            )
            .exec();
    }

    async countItemDetailStatisticsByTournamentIdItemId(
        tournamentId: number,
        itemId: number,
    ): Promise<number> {
        return this.matchModel
            .countDocuments({
                tournamentId,
                $or: [{ itemLowId: itemId }, { itemHighId: itemId }],
            })
            .exec();
    }
}

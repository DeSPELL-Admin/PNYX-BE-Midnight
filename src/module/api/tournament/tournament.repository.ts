import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    Tournament,
    TournamentDocument,
} from 'src/schema/domain/event/tournament.schema';
import { FindTournamentsQueryResult } from './query-result/find-tournaments.query-result';
import { calculateSkip } from 'src/module/common/util/pagination.util';
import { SortTournamentsType } from './tournament.util';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { buildPeriodMatchFilter } from 'src/module/common/util/tournament-period.util';
import { FindTournamentsByCategoryQueryResult } from './query-result/find-tournaments-by-category.query-result';
import { GetTournamentByIdQueryResult } from './query-result/get-tournament-by-id.query-result';
import { FindTypeAndPointByIdQueryResult } from './query-result/find-type-and-point-by-id.query-result';


@Injectable()
export class TournamentRepository {
    constructor(
        @InjectModel(Tournament.name)
        private readonly tournamentModel: Model<TournamentDocument>,
    ) {}

    async findTournaments(
        orderBy: SortTournamentsType,
        page: number,
        limit: number,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<FindTournamentsQueryResult[]> {
        const skip = calculateSkip(page, limit);
        const sort: Record<string, 1 | -1> =
            orderBy === SortTournamentsType.POPULARITY
                ? { selectedCount: -1, createdAt: -1 }
                : { createdAt: -1 };

        const ITEM_COLLECTION = 'items';

        return await this.tournamentModel
            .aggregate<FindTournamentsQueryResult>([
                {
                    $match: {
                        type,
                        ...buildPeriodMatchFilter(period, new Date()),
                    },
                },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        category: 1,
                        tournamentId: 1,
                        title: 1,
                        selectedCount: 1,
                        genre: 1,
                        startedAt: 1,
                        endedAt: 1,
                        point: 1,
                        totalPrize: 1,
                        minBetAmount: 1,
                        bettingType: 1,
                        winItemId: 1,
                    },
                },
                {
                    $lookup: {
                        from: ITEM_COLLECTION,
                        let: { tid: '$tournamentId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$tournamentId', '$$tid'],
                                    },
                                },
                            },
                            { $sort: { firstCount: -1, createdAt: -1 } },
                            { $limit: 2 },
                            { $project: { _id: 0, imageName: 1 } },
                        ],
                        as: 'topItems',
                    },
                },
                {
                    $addFields: {
                        firstItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 0] },
                                null,
                            ],
                        },
                        secondItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 1] },
                                null,
                            ],
                        },
                    },
                },

                { $project: { topItems: 0 } },
            ])
            .exec();
    }

    async countTournaments(
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<number> {
        return await this.tournamentModel
            .countDocuments({
                type,
                ...buildPeriodMatchFilter(period, new Date()),
            })
            .exec();
    }

    async getTournamentById(
        tournamentId: number,
    ): Promise<GetTournamentByIdQueryResult | null> {
        const ITEM_COLLECTION = 'items';

        const result = await this.tournamentModel
            .aggregate<GetTournamentByIdQueryResult>([
                { $match: { tournamentId } },
                { $limit: 1 },
                {
                    $project: {
                        _id: 0,
                        category: 1,
                        title: 1,
                        selectedCount: 1,
                        genre: 1,
                        startedAt: 1,
                        endedAt: 1,
                        point: 1,
                        totalPrize: 1,
                        minBetAmount: 1,
                        bettingType: 1,
                        winItemId: 1,
                    },
                },
                {
                    $lookup: {
                        from: ITEM_COLLECTION,
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$tournamentId', tournamentId],
                                    },
                                },
                            },
                            { $sort: { firstCount: -1, createdAt: -1 } },
                            { $limit: 2 },
                            { $project: { _id: 0, imageName: 1 } },
                        ],
                        as: 'topItems',
                    },
                },
                {
                    $addFields: {
                        firstItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 0] },
                                null,
                            ],
                        },
                        secondItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 1] },
                                null,
                            ],
                        },
                    },
                },

                { $project: { topItems: 0 } },
            ])
            .exec();

        return result[0] ?? null;
    }

    async findTypeAndPointById(
        tournamentId: number,
    ): Promise<FindTypeAndPointByIdQueryResult | null> {
        return await this.tournamentModel
            .findOne({ tournamentId })
            .select('type point -_id')
            .lean<FindTypeAndPointByIdQueryResult>()
            .exec();
    }

    async findTournamentsByCategory(
        category: string,
        orderBy: SortTournamentsType,
        page: number,
        limit: number,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<FindTournamentsByCategoryQueryResult[]> {
        const skip = calculateSkip(page, limit);
        const sort: Record<string, 1 | -1> =
            orderBy === SortTournamentsType.POPULARITY
                ? { selectedCount: -1, createdAt: -1 }
                : { createdAt: -1 };

        const ITEM_COLLECTION = 'items';

        return await this.tournamentModel
            .aggregate<FindTournamentsByCategoryQueryResult>([
                {
                    $match: {
                        category,
                        type,
                        ...buildPeriodMatchFilter(period, new Date()),
                    },
                },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        tournamentId: 1,
                        title: 1,
                        selectedCount: 1,
                        genre: 1,
                        startedAt: 1,
                        endedAt: 1,
                        point: 1,
                        totalPrize: 1,
                        minBetAmount: 1,
                        bettingType: 1,
                        winItemId: 1,
                    },
                },
                {
                    $lookup: {
                        from: ITEM_COLLECTION,
                        let: { tid: '$tournamentId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$tournamentId', '$$tid'],
                                    },
                                },
                            },
                            { $sort: { firstCount: -1, createdAt: -1 } },
                            { $limit: 2 },
                            { $project: { _id: 0, imageName: 1 } },
                        ],
                        as: 'topItems',
                    },
                },
                {
                    $addFields: {
                        firstItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 0] },
                                null,
                            ],
                        },
                        secondItemImageName: {
                            $ifNull: [
                                { $arrayElemAt: ['$topItems.imageName', 1] },
                                null,
                            ],
                        },
                    },
                },

                { $project: { topItems: 0 } },
            ])
            .exec();
    }

    async countTournamentsByCategory(
        category: string,
        type: TournamentType,
        period?: TournamentPeriod,
    ): Promise<number> {
        return await this.tournamentModel
            .countDocuments({
                category,
                type,
                ...buildPeriodMatchFilter(period, new Date()),
            })
            .exec();
    }
}

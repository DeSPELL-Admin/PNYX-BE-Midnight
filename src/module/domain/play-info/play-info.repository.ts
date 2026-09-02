import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { calculateSkip } from 'src/module/common/util/pagination.util';
import {
    PlayInfo,
    PlayInfoDocument,
} from 'src/schema/domain/event/play-info.schema';
import { FindTournamentsByAddressQueryResult } from './query-result/find-tournaments-by-address.query-result';
import { FindPlayInfosByAddressTournamentIdQueryResult } from './query-result/find-play-infos-by-address-tournament-id.query-result';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { buildPeriodMatchFilter } from 'src/module/common/util/tournament-period.util';

@Injectable()
export class PlayInfoRepository {
    constructor(
        @InjectModel(PlayInfo.name)
        private readonly playInfoModel: Model<PlayInfoDocument>,
    ) {}

    async findTournamentsByAddress(
        address: string,
        page: number,
        limit: number,
        type: TournamentType,
        period: TournamentPeriod,
        genre: TournamentGenre,
    ): Promise<FindTournamentsByAddressQueryResult[]> {
        const skip = calculateSkip(page, limit);

        const TOURNAMENT_COLLECTION = 'tournaments';
        const ITEM_COLLECTION = 'items';

        return this.playInfoModel
            .aggregate<FindTournamentsByAddressQueryResult>([
                {
                    $match: {
                        user: address,
                    },
                },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: '$tournamentId',
                        doc: { $first: '$$ROOT' },
                    },
                },
                { $replaceRoot: { newRoot: '$doc' } },
                {
                    $lookup: {
                        from: TOURNAMENT_COLLECTION,
                        let: { tid: '$tournamentId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$tournamentId', '$$tid'],
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    category: 1,
                                    tournamentId: 1,
                                    title: 1,
                                    selectedCount: 1,
                                    type: 1,
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
                        ],
                        as: 'tournament',
                    },
                },
                // type/period는 조인 대상(tournaments)의 필드다. 이 필터들은
                // 페이지네이션보다 먼저 와야 페이지 크기와 total이 일치한다.
                // $unwind가 토너먼트 문서가 없는(orphan) 플레이를 먼저 제거하고,
                // 이어지는 $match가 type(및 period)이 일치하는 것만 남긴다.
                { $unwind: '$tournament' },
                {
                    $match: {
                        'tournament.type': type,
                        'tournament.genre': genre,
                        ...buildPeriodMatchFilter(
                            period,
                            new Date(),
                            'tournament.',
                        ),
                    },
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        category: '$tournament.category',
                        tournamentId: '$tournament.tournamentId',
                        title: '$tournament.title',
                        selectedCount: '$tournament.selectedCount',
                        txHash: 1,
                        genre: '$tournament.genre',
                        startedAt: '$tournament.startedAt',
                        endedAt: '$tournament.endedAt',
                        point: '$tournament.point',
                        totalPrize: '$tournament.totalPrize',
                        minBetAmount: '$tournament.minBetAmount',
                        bettingType: '$tournament.bettingType',
                        winItemId: '$tournament.winItemId',
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

    async countTournamentsByAddress(
        address: string,
        type: TournamentType,
        period: TournamentPeriod,
        genre: TournamentGenre,
    ): Promise<number> {
        // findTournamentsByAddress는 tournamentId로 그룹핑하므로 total은 raw 플레이
        // 수가 아니라 type/period/genre가 일치하는 distinct 토너먼트 수여야 한다(find와 동일 기준).
        const TOURNAMENT_COLLECTION = 'tournaments';
        const result = await this.playInfoModel
            .aggregate<{ total: number }>([
                { $match: { user: address } },
                { $group: { _id: '$tournamentId' } },
                {
                    $lookup: {
                        from: TOURNAMENT_COLLECTION,
                        localField: '_id',
                        foreignField: 'tournamentId',
                        as: 'tournament',
                    },
                },
                { $unwind: '$tournament' },
                {
                    $match: {
                        'tournament.type': type,
                        'tournament.genre': genre,
                        ...buildPeriodMatchFilter(
                            period,
                            new Date(),
                            'tournament.',
                        ),
                    },
                },
                { $count: 'total' },
            ])
            .exec();

        return result[0]?.total ?? 0;
    }

    async findPlayInfosByAddressTournamentId(
        address: string,
        tournamentId: number,
        page: number,
        limit: number,
        genre: TournamentGenre,
    ): Promise<FindPlayInfosByAddressTournamentIdQueryResult[]> {
        const skip = calculateSkip(page, limit);

        const projection =
            genre === TournamentGenre.BETTING
                ? 'betItemId betAmount txHash -_id'
                : 'firstItemId secondItemId entryItemHexes txHash -_id';

        return await this.playInfoModel
            .find({ user: address, tournamentId })
            .select(projection)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<FindPlayInfosByAddressTournamentIdQueryResult[]>()
            .exec();
    }

    async countPlayInfosByAddressTournamentId(
        address: string,
        tournamentId: number,
    ): Promise<number> {
        return await this.playInfoModel
            .countDocuments({ user: address, tournamentId })
            .exec();
    }

    async existsByAddressTournamentId(
        address: string,
        tournamentId: number,
    ): Promise<boolean> {
        const doc = await this.playInfoModel
            .exists({ user: address, tournamentId })
            .exec();
        return doc !== null;
    }

    async findPlayedTournamentIds(
        address: string,
        tournamentIds: number[],
    ): Promise<number[]> {
        if (tournamentIds.length === 0) return [];

        return this.playInfoModel.distinct('tournamentId', {
            user: address,
            tournamentId: { $in: tournamentIds },
        });
    }
}

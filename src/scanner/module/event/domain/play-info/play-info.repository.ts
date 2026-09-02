import {
    ClientSession,
    DeleteResult,
    Model,
    UpdateWriteOpResult,
} from 'mongoose';
import {
    PlayInfo,
    PlayInfoDocument,
} from 'src/schema/domain/event/play-info.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayInfoRepository {
    constructor(
        @InjectModel(PlayInfo.name)
        private readonly playInfoModel: Model<PlayInfoDocument>,
    ) {}

    async upsert(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        upsertData: {
            user: string;
            tournamentId: number;
            firstItemId: number;
            secondItemId: number;
            entryItemHexes: string;
            tournamentDataHash: string;
            blockNumber: number;
            blockHash: string;
            point: number;
            createdAt: Date;
        },
        session: ClientSession,
    ): Promise<UpdateWriteOpResult> {
        return await this.playInfoModel.updateOne(
            queryData,
            { $setOnInsert: upsertData },
            {
                upsert: true,
                setDefaultsOnInsert: true,
                session,
            },
        );
    }

    async upsertBet(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        upsertData: {
            user: string;
            tournamentId: number;
            betItemId: number;
            betAmount: string;
            blockNumber: number;
            blockHash: string;
            createdAt: Date;
        },
        session: ClientSession,
    ): Promise<UpdateWriteOpResult> {
        return await this.playInfoModel.updateOne(
            queryData,
            { $setOnInsert: upsertData },
            {
                upsert: true,
                setDefaultsOnInsert: true,
                session,
            },
        );
    }

    async deletePlayInfo(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        session: ClientSession,
    ): Promise<DeleteResult> {
        return await this.playInfoModel.deleteOne(queryData, { session });
    }
}

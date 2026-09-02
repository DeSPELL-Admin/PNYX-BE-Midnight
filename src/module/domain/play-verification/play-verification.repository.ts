import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    PlayVerification,
    PlayVerificationDocument,
} from 'src/schema/domain/event/play-verification.schema';
import { FindPlayVerificationQueryResult } from './query-result/find-play-verification.query-result';

@Injectable()
export class PlayVerificationRepository {
    constructor(
        @InjectModel(PlayVerification.name)
        private readonly playVerificationModel: Model<PlayVerificationDocument>,
    ) {}

    async upsert(
        walletAddress: string,
        tournamentId: number,
        itemIds: string,
    ): Promise<void> {
        await this.playVerificationModel.findOneAndUpdate(
            { walletAddress, tournamentId },
            { $set: { itemIds } },
            { upsert: true },
        );
    }

    async findOne(
        walletAddress: string,
        tournamentId: number,
    ): Promise<FindPlayVerificationQueryResult | null> {
        return await this.playVerificationModel
            .findOne({ walletAddress, tournamentId })
            .select('itemIds -_id')
            .lean()
            .exec();
    }
}

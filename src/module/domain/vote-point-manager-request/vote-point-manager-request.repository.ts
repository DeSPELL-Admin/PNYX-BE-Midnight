import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    VotePointManagerRequest,
    VotePointManagerRequestDocument,
} from 'src/schema/domain/signature/vote-point-manager-request.schema';
import { FindPendingVoteQueryResult } from './query-result/find-pending-vote.query-result';

@Injectable()
export class VotePointManagerRequestRepository {
    constructor(
        @InjectModel(VotePointManagerRequest.name)
        private readonly votePointManagerRequestModel: Model<VotePointManagerRequestDocument>,
    ) {}

    async findLatestByWalletTournamentItem(
        walletAddress: string,
        tournamentId: number,
        itemId: number,
    ): Promise<FindPendingVoteQueryResult | null> {
        return this.votePointManagerRequestModel
            .findOne({ walletAddress, tournamentId, itemId })
            .select('option amount deadline -_id')
            .sort({ createdAt: -1 })
            .lean<FindPendingVoteQueryResult>()
            .exec();
    }
}

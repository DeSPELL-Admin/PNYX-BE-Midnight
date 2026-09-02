import { Injectable } from '@nestjs/common';
import { VotePointManagerRequestRepository } from './vote-point-manager-request.repository';
import { FindPendingVoteQueryResult } from './query-result/find-pending-vote.query-result';

@Injectable()
export class VotePointManagerRequestService {
    constructor(
        private readonly votePointManagerRequestRepository: VotePointManagerRequestRepository,
    ) {}

    async findLatestByWalletTournamentItem(
        walletAddress: string,
        tournamentId: number,
        itemId: number,
    ): Promise<FindPendingVoteQueryResult | null> {
        return this.votePointManagerRequestRepository.findLatestByWalletTournamentItem(
            walletAddress,
            tournamentId,
            itemId,
        );
    }
}

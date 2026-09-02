import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { MatchRepository } from './match.repository';
import { MatchUpdate } from '../../contract/tournament-finalizer/tournament-finalizer.util';

@Injectable()
export class MatchService {
    constructor(private readonly matchRepository: MatchRepository) {}

    async updateBulkMatch(
        matchUpdates: MatchUpdate[],
        session: ClientSession,
    ): Promise<void> {
        await this.matchRepository.updateBulkMatch(matchUpdates, session);
    }
}

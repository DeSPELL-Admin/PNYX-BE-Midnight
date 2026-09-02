import { Injectable } from '@nestjs/common';
import {
    MidnightEscrowRecord,
    MidnightEscrowRepository,
} from './midnight-escrow.repository';

@Injectable()
export class MidnightEscrowService {
    constructor(private readonly repo: MidnightEscrowRepository) {}

    upsert(record: MidnightEscrowRecord): Promise<void> {
        return this.repo.upsert(record);
    }

    findByTournament(
        chainId: number,
        tournamentId: number,
    ): Promise<MidnightEscrowRecord[]> {
        return this.repo.findByTournament(chainId, tournamentId);
    }

    countByTournaments(chainId: number): Promise<Map<number, number>> {
        return this.repo.countByTournaments(chainId);
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { ClientSession, UpdateResult } from 'mongoose';
import { addSignedAmount } from 'src/scanner/util/bigint-amount.util';
import { TournamentRepository } from './tournament.repository';

@Injectable()
export class TournamentService {
    private readonly logger = new Logger(TournamentService.name);

    constructor(private readonly tournamentRepository: TournamentRepository) {}

    async updateTournamentCount(
        queryData: {
            tournamentId: number;
        },
        updateData: {
            selectedCount: number;
        },
        session: ClientSession,
    ): Promise<UpdateResult> {
        return await this.tournamentRepository.updateTournamentCount(
            queryData,
            updateData,
            session,
        );
    }

    // selectedCount 증감과 totalPrize 누적을 한 번의 updateOne으로 반영한다.
    // totalPrize는 bigint-safe string이라 현재값을 읽어 BigInt로 계산한 뒤 함께 쓴다.
    async applySettlement(
        tournamentId: number,
        selectedCountDelta: number,
        totalPrizeSignedDelta: string,
        session: ClientSession,
    ): Promise<void> {
        const tournament = await this.tournamentRepository.findTotalPrize(
            tournamentId,
            session,
        );

        if (!tournament) {
            this.logger.warn(
                `Tournament not found for settlement: tournament ${tournamentId}`,
            );
            return;
        }

        const nextTotalPrize = addSignedAmount(
            tournament.totalPrize ?? '0',
            totalPrizeSignedDelta,
        );

        await this.tournamentRepository.applySettlement(
            tournamentId,
            selectedCountDelta,
            nextTotalPrize,
            session,
        );
    }
}

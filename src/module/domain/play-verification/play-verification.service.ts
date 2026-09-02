import { BadRequestException, Injectable } from '@nestjs/common';
import { PlayVerificationRepository } from './play-verification.repository';
import { FindPlayVerificationQueryResult } from './query-result/find-play-verification.query-result';

@Injectable()
export class PlayVerificationService {
    constructor(
        private readonly playVerificationRepository: PlayVerificationRepository,
    ) {}

    async upsert(
        walletAddress: string,
        tournamentId: number,
        itemIds: string,
    ): Promise<void> {
        await this.playVerificationRepository.upsert(
            walletAddress,
            tournamentId,
            itemIds,
        );
    }

    async findOne(
        walletAddress: string,
        tournamentId: number,
    ): Promise<FindPlayVerificationQueryResult> {
        const verification = await this.playVerificationRepository.findOne(
            walletAddress,
            tournamentId,
        );

        if (!verification) {
            throw new BadRequestException(
                'No play verification found for this tournament',
            );
        }

        return verification;
    }
}

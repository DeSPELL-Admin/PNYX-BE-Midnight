import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async incrementPoint(
        walletAddress: string,
        pointDelta: number,
        session: ClientSession,
    ): Promise<void> {
        if (pointDelta === 0) return;

        const result = await this.userRepository.incrementPoint(
            walletAddress,
            pointDelta,
            session,
        );

        if (result.matchedCount === 0) {
            throw new NotFoundException(
                `User not found for wallet address: ${walletAddress}`,
            );
        }
    }
}

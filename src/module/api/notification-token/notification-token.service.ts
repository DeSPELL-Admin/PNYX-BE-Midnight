import { Injectable } from '@nestjs/common';
import {
    NotificationTokenRepository,
    UpsertTokenParams,
} from './notification-token.repository';
import { ActiveNotificationTokenQueryResult } from './query-result/active-notification-token.query-result';

@Injectable()
export class NotificationTokenService {
    constructor(
        private readonly tokenRepository: NotificationTokenRepository,
    ) {}

    async saveOrRotate(params: UpsertTokenParams): Promise<void> {
        await this.tokenRepository.upsert({
            ...params,
            userAddress: params.userAddress.toLowerCase(),
        });
    }

    async disable(userAddress: string): Promise<void> {
        await this.tokenRepository.disable(userAddress.toLowerCase());
    }

    async remove(userAddress: string): Promise<void> {
        await this.tokenRepository.softDeleteByUser(userAddress.toLowerCase());
    }

    async removeByToken(token: string): Promise<void> {
        await this.tokenRepository.softDeleteByToken(token);
    }

    async getActiveTokens(
        userAddresses: string[],
    ): Promise<ActiveNotificationTokenQueryResult[]> {
        const normalized = userAddresses.map((address) =>
            address.toLowerCase(),
        );
        return this.tokenRepository.findActiveTokens(normalized);
    }
}

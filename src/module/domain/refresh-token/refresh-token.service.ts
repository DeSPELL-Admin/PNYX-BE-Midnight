import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from './refresh-token.repository';
import { GetActiveTokenQueryResult } from './query-result/get-active-token.query-result';

@Injectable()
export class RefreshTokenService {
    constructor(
        private readonly refreshTokenRepository: RefreshTokenRepository,
    ) {}

    async create(insertData: {
        walletAddress: string;
        tokenHash: string;
        expiresAt: Date;
        userAgentHash?: string | null;
        ipHash?: string | null;
    }): Promise<void> {
        await this.refreshTokenRepository.create(insertData);
    }

    async getByWalletAddressAndToken(
        walletAddress: string,
        tokenHash: string,
    ): Promise<GetActiveTokenQueryResult | null> {
        return await this.refreshTokenRepository.findByWalletAddressAndToken(
            walletAddress,
            tokenHash,
        );
    }

    async rotateByWalletAddressAndToken(
        queryData: {
            walletAddress: string;
            tokenHash: string;
        },
        updateData: {
            tokenHash: string;
            expiresAt: Date;
            userAgentHash?: string | null;
            ipHash?: string | null;
        },
    ): Promise<boolean> {
        const result =
            await this.refreshTokenRepository.updateByWalletAddressAndToken(
                queryData,
                updateData,
            );

        return result.matchedCount > 0;
    }

    async revokeByWalletAddressAndToken(
        walletAddress: string,
        tokenHash: string,
    ): Promise<void> {
        await this.refreshTokenRepository.deleteByWalletAddressAndToken(
            walletAddress,
            tokenHash,
        );
    }
}

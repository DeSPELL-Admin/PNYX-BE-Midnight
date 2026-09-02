import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateWriteOpResult } from 'mongoose';
import {
    RefreshToken,
    RefreshTokenDocument,
} from 'src/schema/domain/auth/refresh-token.schema';
import { GetActiveTokenQueryResult } from './query-result/get-active-token.query-result';

@Injectable()
export class RefreshTokenRepository {
    constructor(
        @InjectModel(RefreshToken.name)
        private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    ) {}

    async create(insertData: {
        walletAddress: string;
        tokenHash: string;
        expiresAt: Date;
        userAgentHash?: string | null;
        ipHash?: string | null;
    }): Promise<void> {
        await this.refreshTokenModel.create(insertData);
    }

    async findByWalletAddressAndToken(
        walletAddress: string,
        tokenHash: string,
    ): Promise<GetActiveTokenQueryResult | null> {
        return await this.refreshTokenModel
            .findOne({ walletAddress, tokenHash })
            .select('expiresAt -_id')
            .lean()
            .exec();
    }

    async updateByWalletAddressAndToken(
        queryData: { walletAddress: string; tokenHash: string },
        updateData: {
            tokenHash: string;
            expiresAt: Date;
            userAgentHash?: string | null;
            ipHash?: string | null;
        },
    ): Promise<UpdateWriteOpResult> {
        return await this.refreshTokenModel.updateOne(queryData, {
            $set: updateData,
        });
    }

    async deleteByWalletAddressAndToken(
        walletAddress: string,
        tokenHash: string,
    ): Promise<void> {
        await this.refreshTokenModel.deleteOne({ walletAddress, tokenHash });
    }
}

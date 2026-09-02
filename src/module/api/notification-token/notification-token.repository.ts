import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    NotificationToken,
    NotificationTokenDocument,
} from 'src/schema/domain/notification-token.schema';
import { ActiveNotificationTokenQueryResult } from './query-result/active-notification-token.query-result';

export interface UpsertTokenParams {
    userAddress: string;
    token: string;
    notificationUrl: string;
}

@Injectable()
export class NotificationTokenRepository {
    constructor(
        @InjectModel(NotificationToken.name)
        private readonly tokenModel: Model<NotificationTokenDocument>,
    ) {}

    async upsert(params: UpsertTokenParams): Promise<void> {
        // user_address 유니크 기준 upsert. soft-delete 된 행을 다시 살린다
        // (enabled=true, deletedAt=null).
        await this.tokenModel.updateOne(
            { userAddress: params.userAddress },
            {
                $set: {
                    token: params.token,
                    notificationUrl: params.notificationUrl,
                    enabled: true,
                    deletedAt: null,
                },
            },
            { upsert: true, setDefaultsOnInsert: true },
        );
    }

    async disable(userAddress: string): Promise<void> {
        await this.tokenModel.updateOne(
            { userAddress },
            { $set: { enabled: false } },
        );
    }

    async softDeleteByUser(userAddress: string): Promise<void> {
        await this.tokenModel.updateOne(
            { userAddress },
            { $set: { deletedAt: new Date() } },
        );
    }

    async softDeleteByToken(token: string): Promise<void> {
        await this.tokenModel.updateOne(
            { token },
            { $set: { deletedAt: new Date() } },
        );
    }

    async findActiveTokens(
        userAddresses: string[],
    ): Promise<ActiveNotificationTokenQueryResult[]> {
        if (userAddresses.length === 0) {
            return [];
        }

        const rows = await this.tokenModel
            .find({
                userAddress: { $in: userAddresses },
                enabled: true,
                deletedAt: null,
            })
            .select('userAddress token notificationUrl -_id')
            .lean();

        return rows.map((row) => ({
            userAddress: row.userAddress,
            token: row.token,
            notificationUrl: row.notificationUrl,
        }));
    }
}

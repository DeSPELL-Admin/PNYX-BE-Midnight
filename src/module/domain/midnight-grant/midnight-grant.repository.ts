import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    MidnightGrant,
    MidnightGrantDocument,
} from 'src/schema/domain/midnight/midnight-grant.schema';

// `@Schema({ timestamps: true })` 가 보장하는 관리 필드 — `.select('-_id -__v').lean()` 에도 남는다.
// updatedAt 은 마지막 (재)grant 시각이다 (upsert 가 매번 갱신).
export type MidnightGrantRecord = MidnightGrant & {
    createdAt: Date;
    updatedAt: Date;
};
export type MidnightGrantKey = {
    chainId: number;
    walletAddress: string;
    tournamentId: number;
};
/** upsert 페이로드 — 도매인 필드만. 키와 Mongoose 관리 필드(createdAt/updatedAt)는 호출자가 넣지 않는다. */
export type MidnightGrantUpsertData = Omit<
    MidnightGrantRecord,
    keyof MidnightGrantKey | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class MidnightGrantRepository {
    constructor(
        @InjectModel(MidnightGrant.name)
        private readonly model: Model<MidnightGrantDocument>,
    ) {}

    async findOne(key: MidnightGrantKey): Promise<MidnightGrantRecord | null> {
        return await this.model
            .findOne(key)
            .select('-_id -__v')
            .lean<MidnightGrantRecord>()
            .exec();
    }

    async upsert(
        key: MidnightGrantKey,
        data: MidnightGrantUpsertData,
    ): Promise<void> {
        await this.model.findOneAndUpdate(
            key,
            { $set: data },
            { upsert: true },
        );
    }

    async setFinalizeTxId(
        key: MidnightGrantKey,
        finalizeTxId: string,
    ): Promise<void> {
        await this.model.updateOne(key, { $set: { finalizeTxId } });
    }
}

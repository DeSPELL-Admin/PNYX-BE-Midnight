import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MidnightGrant, MidnightGrantDocument } from 'src/schema/domain/midnight/midnight-grant.schema';

export type MidnightGrantRecord = Omit<MidnightGrant, never>;
export type MidnightGrantKey = { chainId: number; walletAddress: string; tournamentId: number };

@Injectable()
export class MidnightGrantRepository {
    constructor(@InjectModel(MidnightGrant.name) private readonly model: Model<MidnightGrantDocument>) {}

    async findOne(key: MidnightGrantKey): Promise<MidnightGrantRecord | null> {
        return await this.model.findOne(key).select('-_id -__v').lean<MidnightGrantRecord>().exec();
    }

    async upsert(key: MidnightGrantKey, data: Omit<MidnightGrantRecord, keyof MidnightGrantKey>): Promise<void> {
        await this.model.findOneAndUpdate(key, { $set: data }, { upsert: true });
    }

    async setFinalizeTxId(key: MidnightGrantKey, finalizeTxId: string): Promise<void> {
        await this.model.updateOne(key, { $set: { finalizeTxId } });
    }
}

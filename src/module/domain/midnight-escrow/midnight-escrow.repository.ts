import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    MidnightEscrow,
    MidnightEscrowDocument,
} from 'src/schema/domain/midnight/midnight-escrow.schema';

export type MidnightEscrowRecord = Omit<MidnightEscrow, never>;

@Injectable()
export class MidnightEscrowRepository {
    constructor(
        @InjectModel(MidnightEscrow.name)
        private readonly model: Model<MidnightEscrowDocument>,
    ) {}

    async upsert(record: MidnightEscrowRecord): Promise<void> {
        const { chainId, walletAddress, tournamentId, ...data } = record;
        await this.model.findOneAndUpdate(
            { chainId, walletAddress, tournamentId },
            { $set: data },
            { upsert: true },
        );
    }

    async findByTournament(
        chainId: number,
        tournamentId: number,
    ): Promise<MidnightEscrowRecord[]> {
        // 정렬이 없으면 sellRows 의 slice(0,8) 이 호출마다 달라져 datasetHash 와 witness 가 어긋난다.
        return await this.model
            .find({ chainId, tournamentId })
            .sort({ createdAt: 1, _id: 1 })
            .select('-_id -__v')
            .lean<MidnightEscrowRecord[]>()
            .exec();
    }

    async countByTournaments(chainId: number): Promise<Map<number, number>> {
        const rows = await this.model
            .aggregate<{
                _id: number;
                count: number;
            }>([{ $match: { chainId } }, { $group: { _id: '$tournamentId', count: { $sum: 1 } } }])
            .exec();
        return new Map(rows.map((r) => [r._id, r.count]));
    }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BettingStatus } from 'src/module/common/util/enum.util';

export type BettingStatDocument = HydratedDocument<BettingStat>;

@Schema({ timestamps: true })
export class BettingStat {
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    itemId: number;

    // 누적 베팅액. bigint-safe 위해 string 저장.
    @Prop({ type: String, required: true, default: '0' })
    amount: string;

    @Prop({
        type: String,
        required: true,
        enum: BettingStatus,
        default: BettingStatus.ONGOING,
    })
    status: BettingStatus;
}

export const BettingStatSchema = SchemaFactory.createForClass(BettingStat);

BettingStatSchema.index(
    { walletAddress: 1, tournamentId: 1, itemId: 1 },
    { unique: true },
);

// 지갑 전역 PENDING 가드(existsPending) 전용.
// PENDING은 지갑당 최대 1건이라 부분 인덱스로 크기를 최소화한다.
BettingStatSchema.index(
    { walletAddress: 1 },
    { partialFilterExpression: { status: BettingStatus.PENDING } },
);

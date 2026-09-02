import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlayInfoDocument = HydratedDocument<PlayInfo>;

@Schema({ timestamps: { createdAt: false, updatedAt: true } })
export class PlayInfo {
    @Prop({ type: Number, required: true })
    chainId: number;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    user: string;

    @Prop({ type: Number })
    point?: number;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number })
    firstItemId?: number;

    @Prop({ type: Number })
    secondItemId?: number;

    @Prop({ type: String, trim: true })
    entryItemHexes?: string;

    @Prop({ type: String, trim: true })
    tournamentDataHash?: string;

    // 베팅한 아이템.
    @Prop({ type: Number })
    betItemId?: number;

    // 베팅액. bigint-safe 위해 string 저장.
    @Prop({ type: String })
    betAmount?: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    txHash: string;

    @Prop({ type: Number, required: true })
    blockNumber: number;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    blockHash: string;

    @Prop({ type: Number, required: true })
    logIndex: number;

    @Prop({ type: Date, required: true })
    createdAt: Date;
}

export const PlayInfoSchema = SchemaFactory.createForClass(PlayInfo);

PlayInfoSchema.index({ chainId: 1, txHash: 1, logIndex: 1 }, { unique: true });

PlayInfoSchema.index({ user: 1, createdAt: -1 });

PlayInfoSchema.index({
    user: 1,
    tournamentId: 1,
    createdAt: -1,
});

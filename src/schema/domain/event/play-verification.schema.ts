import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlayVerificationDocument = HydratedDocument<PlayVerification>;

@Schema({ timestamps: true })
export class PlayVerification {
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: String, required: true, trim: true })
    itemIds: string;
}

export const PlayVerificationSchema =
    SchemaFactory.createForClass(PlayVerification);

PlayVerificationSchema.index(
    { walletAddress: 1, tournamentId: 1 },
    { unique: true },
);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true })
export class RefreshToken {
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: String, required: true })
    tokenHash: string;

    @Prop({ type: String, default: null })
    userAgentHash: string | null;

    @Prop({ type: String, default: null })
    ipHash: string | null;

    @Prop({ type: Date, required: true })
    expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ walletAddress: 1, tokenHash: 1 }, { unique: true });

// 만료된 토큰을 MongoDB가 자동 삭제 (PIKIT의 cron sweep을 TTL 인덱스로 대체)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

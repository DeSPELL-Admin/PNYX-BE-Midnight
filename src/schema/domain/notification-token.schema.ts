import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationTokenDocument = HydratedDocument<NotificationToken>;

@Schema({ timestamps: true })
export class NotificationToken {
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    userAddress: string; // NS가 전달한 유저 지갑 주소 (소문자로 저장)

    @Prop({ type: String, required: true })
    token: string; // NS가 발급한 per-user push 토큰

    @Prop({ type: String, required: true })
    notificationUrl: string; // NS 발송 엔드포인트 URL (notificationDetails.url)

    @Prop({ type: Boolean, default: true })
    enabled: boolean; // 알림 활성화 여부 (notifications_disabled 수신 시 false)

    @Prop({ type: Date, default: null })
    deletedAt: Date | null; // soft delete (TypeORM @DeleteDateColumn 대체)
}

export const NotificationTokenSchema =
    SchemaFactory.createForClass(NotificationToken);

// uq_notification_token_user_address 대응
NotificationTokenSchema.index({ userAddress: 1 }, { unique: true });
// idx_notification_token_token 대응 (무효 토큰 정리 시 token 값으로 조회)
NotificationTokenSchema.index({ token: 1 });

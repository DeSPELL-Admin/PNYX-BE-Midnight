import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    NotificationToken,
    NotificationTokenSchema,
} from 'src/schema/domain/notification-token.schema';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NsWebhookVerifyService } from './webhook/ns-webhook-verify.service';
import { NotificationSenderService } from './sender/notification-sender.service';
import { NotificationTokenRepository } from './notification-token.repository';
import { NotificationTokenService } from './notification-token.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NotificationToken.name, schema: NotificationTokenSchema },
        ]),
    ],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        NsWebhookVerifyService,
        NotificationSenderService,
        NotificationTokenRepository,
        NotificationTokenService,
    ],
    exports: [NotificationSenderService],
})
export class NotificationModule {}

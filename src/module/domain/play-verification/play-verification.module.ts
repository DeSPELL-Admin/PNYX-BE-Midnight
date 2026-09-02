import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    PlayVerification,
    PlayVerificationSchema,
} from 'src/schema/domain/event/play-verification.schema';
import { PlayVerificationService } from './play-verification.service';
import { PlayVerificationRepository } from './play-verification.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlayVerification.name, schema: PlayVerificationSchema },
        ]),
    ],
    providers: [PlayVerificationService, PlayVerificationRepository],
    exports: [PlayVerificationService],
})
export class PlayVerificationModule {}

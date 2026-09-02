import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    VotePointManagerRequest,
    VotePointManagerRequestSchema,
} from 'src/schema/domain/signature/vote-point-manager-request.schema';
import { VotePointManagerRequestService } from './vote-point-manager-request.service';
import { VotePointManagerRequestRepository } from './vote-point-manager-request.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: VotePointManagerRequest.name,
                schema: VotePointManagerRequestSchema,
            },
        ]),
    ],
    providers: [
        VotePointManagerRequestService,
        VotePointManagerRequestRepository,
    ],
    exports: [VotePointManagerRequestService],
})
export class VotePointManagerRequestModule {}

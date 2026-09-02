import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    PlayInfo,
    PlayInfoSchema,
} from 'src/schema/domain/event/play-info.schema';
import { PlayInfoRepository } from './play-info.repository';
import { PlayInfoService } from './play-info.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlayInfo.name, schema: PlayInfoSchema },
        ]),
    ],
    providers: [PlayInfoService, PlayInfoRepository],
    exports: [PlayInfoService],
})
export class PlayInfoModule {}

import { Module } from '@nestjs/common';
import { PlayInfoService } from './play-info.service';
import { PlayInfoRepository } from './play-info.repository';
import { MongooseModule } from '@nestjs/mongoose';
import {
    PlayInfo,
    PlayInfoSchema,
} from 'src/schema/domain/event/play-info.schema';

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

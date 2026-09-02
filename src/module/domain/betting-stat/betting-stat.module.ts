import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    BettingStat,
    BettingStatSchema,
} from 'src/schema/domain/event/betting-stat.schema';
import { BettingStatService } from './betting-stat.service';
import { BettingStatRepository } from './betting-stat.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: BettingStat.name, schema: BettingStatSchema },
        ]),
    ],
    providers: [BettingStatService, BettingStatRepository],
    exports: [BettingStatService],
})
export class BettingStatModule {}

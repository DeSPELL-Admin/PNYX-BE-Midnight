import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from 'src/schema/domain/event/match.schema';
import { MatchRepository } from './match.repository';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    ],
    providers: [MatchService, MatchRepository],
    exports: [MatchService],
})
export class MatchModule {}

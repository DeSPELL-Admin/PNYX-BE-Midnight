import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import {
    Tournament,
    TournamentSchema,
} from 'src/schema/domain/event/tournament.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TournamentController } from './tournament.controller';
import { ItemModule } from '../../domain/item/item.module';
import { MatchModule } from '../../domain/match/match.module';
import { PlayVerificationModule } from '../../domain/play-verification/play-verification.module';
import { PlayInfoModule } from '../../domain/play-info/play-info.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Tournament.name, schema: TournamentSchema },
        ]),
        ItemModule,
        MatchModule,
        PlayVerificationModule,
        PlayInfoModule,
    ],
    controllers: [TournamentController],
    providers: [TournamentService, TournamentRepository],
    exports: [TournamentService],
})
export class TournamentModule {}

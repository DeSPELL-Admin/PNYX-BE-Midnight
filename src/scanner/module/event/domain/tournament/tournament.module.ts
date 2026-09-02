import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Tournament,
    TournamentSchema,
} from 'src/schema/domain/event/tournament.schema';
import { TournamentRepository } from './tournament.repository';
import { TournamentService } from './tournament.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Tournament.name, schema: TournamentSchema },
        ]),
    ],
    providers: [TournamentService, TournamentRepository],
    exports: [TournamentService],
})
export class TournamentModule {}

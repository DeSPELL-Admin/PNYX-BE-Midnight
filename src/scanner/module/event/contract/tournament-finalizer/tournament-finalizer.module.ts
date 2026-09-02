import { Module } from '@nestjs/common';
import { TournamentFinalizerService } from './tournament-finalizer.service';
import { MatchModule } from '../../domain/match/match.module';
import { PlayInfoModule } from '../../domain/play-info/play-info.module';
import { ItemModule } from '../../domain/item/item.module';
import { TournamentModule } from '../../domain/tournament/tournament.module';
import { UserModule } from '../../domain/user/user.module';

@Module({
    imports: [
        TournamentModule,
        PlayInfoModule,
        MatchModule,
        ItemModule,
        UserModule,
    ],
    providers: [TournamentFinalizerService],
    exports: [TournamentFinalizerService],
})
export class TournamentFinalizerModule {}

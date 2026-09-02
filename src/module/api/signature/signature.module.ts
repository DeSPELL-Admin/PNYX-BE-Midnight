import { Module } from '@nestjs/common';
import { SignatureController } from './signature.controller';
import { SignatureService } from './signature.service';
import { ChainModule } from 'src/module/chain/chain.module';
import { LockModule } from 'src/module/domain/lock/lock.module';
import { PlayVerificationModule } from 'src/module/domain/play-verification/play-verification.module';
import { PlayInfoModule } from 'src/module/domain/play-info/play-info.module';
import { TournamentModule } from 'src/module/api/tournament/tournament.module';
import { MidnightModule } from 'src/module/midnight/midnight.module';

@Module({
    imports: [
        ChainModule,
        LockModule,
        PlayVerificationModule,
        PlayInfoModule,
        TournamentModule,
        MidnightModule,
    ],
    controllers: [SignatureController],
    providers: [SignatureService],
})
export class SignatureModule {}

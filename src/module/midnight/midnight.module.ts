import { Module } from '@nestjs/common';
import { MidnightService } from './midnight.service';
import { MidnightFinalizeService } from './midnight-finalize.service';
import { MidnightMarketService } from './midnight-market.service';
import { MidnightFulfillService } from './midnight-fulfill.service';
import { MidnightController } from './midnight.controller';
import { MarketController } from './market.controller';
import { ChainModule } from 'src/module/chain/chain.module';
import { MidnightGrantModule } from 'src/module/domain/midnight-grant/midnight-grant.module';
import { MidnightEscrowModule } from 'src/module/domain/midnight-escrow/midnight-escrow.module';
import { MidnightOrderModule } from 'src/module/domain/midnight-order/midnight-order.module';
import { TournamentModule } from 'src/module/api/tournament/tournament.module';
import { TournamentFinalizerModule } from 'src/scanner/module/event/contract/tournament-finalizer/tournament-finalizer.module';

@Module({
    imports: [
        ChainModule,
        MidnightGrantModule,
        MidnightEscrowModule,
        MidnightOrderModule,
        TournamentModule,
        TournamentFinalizerModule,
    ],
    controllers: [MidnightController, MarketController],
    providers: [
        MidnightService,
        MidnightFinalizeService,
        MidnightMarketService,
        MidnightFulfillService,
    ],
    exports: [MidnightService, MidnightGrantModule],
})
export class MidnightModule {}

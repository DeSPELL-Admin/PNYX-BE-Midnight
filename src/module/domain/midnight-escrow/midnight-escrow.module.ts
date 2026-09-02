import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MidnightEscrow, MidnightEscrowSchema } from 'src/schema/domain/midnight/midnight-escrow.schema';
import { MidnightEscrowRepository } from './midnight-escrow.repository';
import { MidnightEscrowService } from './midnight-escrow.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: MidnightEscrow.name, schema: MidnightEscrowSchema }])],
    providers: [MidnightEscrowService, MidnightEscrowRepository],
    exports: [MidnightEscrowService],
})
export class MidnightEscrowModule {}

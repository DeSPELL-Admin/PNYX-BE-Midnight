import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    MidnightOrder,
    MidnightOrderSchema,
} from 'src/schema/domain/midnight/midnight-order.schema';
import { MidnightOrderRepository } from './midnight-order.repository';
import { MidnightOrderService } from './midnight-order.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: MidnightOrder.name, schema: MidnightOrderSchema },
        ]),
    ],
    providers: [MidnightOrderService, MidnightOrderRepository],
    exports: [MidnightOrderService],
})
export class MidnightOrderModule {}

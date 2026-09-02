import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MidnightGrant, MidnightGrantSchema } from 'src/schema/domain/midnight/midnight-grant.schema';
import { MidnightGrantRepository } from './midnight-grant.repository';
import { MidnightGrantService } from './midnight-grant.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: MidnightGrant.name, schema: MidnightGrantSchema }])],
    providers: [MidnightGrantService, MidnightGrantRepository],
    exports: [MidnightGrantService],
})
export class MidnightGrantModule {}

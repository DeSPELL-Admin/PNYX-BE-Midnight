import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/domain/event/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PlayInfoModule } from '../../domain/play-info/play-info.module';
import { BettingStatModule } from '../../domain/betting-stat/betting-stat.module';
import { VotePointManagerRequestModule } from '../../domain/vote-point-manager-request/vote-point-manager-request.module';

@Module({
    imports: [
        PlayInfoModule,
        BettingStatModule,
        VotePointManagerRequestModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService],
})
export class UserModule {}

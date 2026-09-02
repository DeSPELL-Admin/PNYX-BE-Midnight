import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, UpdateResult } from 'mongoose';
import { User, UserDocument } from 'src/schema/domain/event/user.schema';

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) {}

    async incrementPoint(
        walletAddress: string,
        pointDelta: number,
        session: ClientSession,
    ): Promise<UpdateResult> {
        return await this.userModel.updateOne(
            { walletAddress: walletAddress.toLowerCase() },
            { $inc: { point: pointDelta } },
            { session },
        );
    }
}

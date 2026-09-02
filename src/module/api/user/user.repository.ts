import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { User, UserDocument } from 'src/schema/domain/event/user.schema';
import { FindPointByWalletAddressQueryResult } from './query-result/find-point-by-wallet-address.query-result';

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) {}

    async getOrCreate(walletAddress: string): Promise<number> {
        const user = await this.userModel
            .findOneAndUpdate(
                { walletAddress },
                { $setOnInsert: { walletAddress } },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    projection: { point: 1 },
                },
            )
            .lean();
        return user?.point ?? 0;
    }

    async findPointByWalletAddress(
        walletAddress: string,
    ): Promise<FindPointByWalletAddressQueryResult | null> {
        return await this.userModel
            .findOne({ walletAddress })
            .select('point -_id')
            .lean()
            .exec();
    }

    // 포인트 선차감(PIKIT 출금 서명자 패턴). { point: { $gte: amount } } 가드로
    // 원자적으로 차감해 잔액 부족/경합 시 음수가 되지 않게 한다. 갱신된 문서가
    // 없으면(잔액 부족 또는 유저 없음) false 반환.
}

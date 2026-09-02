import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    MidnightOrder,
    MidnightOrderDocument,
} from 'src/schema/domain/midnight/midnight-order.schema';
import { MidnightOrderStatus } from 'src/module/common/util/enum.util';

export type MidnightOrderRecord = Omit<MidnightOrder, never>;

export type CreateMidnightOrderRecord = Pick<
    MidnightOrder,
    | 'orderId'
    | 'chainId'
    | 'buyerAddress'
    | 'buyerPk'
    | 'tournamentId'
    | 'rowCount'
    | 'sampleCountAtOrder'
    | 'priceUnits'
    | 'querySpec'
    | 'specHash'
> &
    Partial<Pick<MidnightOrder, 'status' | 'stage' | 'attempts'>>;

@Injectable()
export class MidnightOrderRepository {
    constructor(
        @InjectModel(MidnightOrder.name)
        private readonly model: Model<MidnightOrderDocument>,
    ) {}

    async create(record: CreateMidnightOrderRecord): Promise<void> {
        await this.model.create(record);
    }

    async findByOrderId(orderId: string): Promise<MidnightOrderRecord | null> {
        return await this.model
            .findOne({ orderId })
            .select('-_id -__v')
            .lean<MidnightOrderRecord>()
            .exec();
    }

    async findCreatedFor(
        chainId: number,
        buyerAddress: string,
        tournamentId: number,
    ): Promise<MidnightOrderRecord | null> {
        return await this.model
            .findOne({
                chainId,
                buyerAddress,
                tournamentId,
                status: MidnightOrderStatus.CREATED,
            })
            .select('-_id -__v')
            .lean<MidnightOrderRecord>()
            .exec();
    }

    async findByBuyer(
        chainId: number,
        buyerAddress: string,
        limit = 20,
    ): Promise<MidnightOrderRecord[]> {
        return await this.model
            .find({ chainId, buyerAddress })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('-_id -__v')
            .lean<MidnightOrderRecord[]>()
            .exec();
    }

    async findPaidOrders(): Promise<MidnightOrderRecord[]> {
        return await this.model
            .find({ status: MidnightOrderStatus.PAID })
            .sort({ updatedAt: 1 })
            .select('-_id -__v')
            .lean<MidnightOrderRecord[]>()
            .exec();
    }

    async findStalledFulfilling(
        beforeDate: Date,
    ): Promise<MidnightOrderRecord[]> {
        return await this.model
            .find({
                status: MidnightOrderStatus.FULFILLING,
                updatedAt: { $lt: beforeDate },
            })
            .select('-_id -__v')
            .lean<MidnightOrderRecord[]>()
            .exec();
    }

    async updateByOrderId(
        orderId: string,
        update: Partial<MidnightOrderRecord>,
    ): Promise<void> {
        await this.model.updateOne({ orderId }, { $set: update }).exec();
    }

    async incrementAttempts(orderId: string): Promise<void> {
        await this.model
            .updateOne({ orderId }, { $inc: { attempts: 1 } })
            .exec();
    }
}

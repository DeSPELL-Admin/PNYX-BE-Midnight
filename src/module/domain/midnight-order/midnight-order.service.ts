import { Injectable } from '@nestjs/common';
import {
    CreateMidnightOrderRecord,
    MidnightOrderRecord,
    MidnightOrderRepository,
} from './midnight-order.repository';

@Injectable()
export class MidnightOrderService {
    constructor(private readonly repo: MidnightOrderRepository) {}

    create(record: CreateMidnightOrderRecord): Promise<void> {
        return this.repo.create(record);
    }

    findByOrderId(orderId: string): Promise<MidnightOrderRecord | null> {
        return this.repo.findByOrderId(orderId);
    }

    findCreatedFor(
        chainId: number,
        buyerAddress: string,
        tournamentId: number,
    ): Promise<MidnightOrderRecord | null> {
        return this.repo.findCreatedFor(chainId, buyerAddress, tournamentId);
    }

    findByBuyer(
        chainId: number,
        buyerAddress: string,
        limit = 20,
    ): Promise<MidnightOrderRecord[]> {
        return this.repo.findByBuyer(chainId, buyerAddress, limit);
    }

    findPaidOrders(): Promise<MidnightOrderRecord[]> {
        return this.repo.findPaidOrders();
    }

    findStalledFulfilling(beforeDate: Date): Promise<MidnightOrderRecord[]> {
        return this.repo.findStalledFulfilling(beforeDate);
    }

    updateByOrderId(
        orderId: string,
        update: Partial<MidnightOrderRecord>,
    ): Promise<void> {
        return this.repo.updateByOrderId(orderId, update);
    }

    incrementAttempts(orderId: string): Promise<void> {
        return this.repo.incrementAttempts(orderId);
    }
}

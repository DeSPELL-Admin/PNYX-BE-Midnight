import { Injectable, Logger } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { addSignedAmount } from 'src/scanner/util/bigint-amount.util';
import { ItemRepository } from './item.repository';
import { ItemUpdate } from '../../contract/tournament-finalizer/tournament-finalizer.util';

@Injectable()
export class ItemService {
    private readonly logger = new Logger(ItemService.name);

    constructor(private readonly itemRepository: ItemRepository) {}

    async updateBulkItem(
        itemUpdates: ItemUpdate[],
        session: ClientSession,
    ): Promise<void> {
        await this.itemRepository.updateBulkItem(itemUpdates, session);
    }

    async accumulateTotalBetAmount(
        tournamentId: number,
        itemId: number,
        signedDelta: string,
        session: ClientSession,
    ): Promise<void> {
        const item = await this.itemRepository.findTotalBetAmount(
            tournamentId,
            itemId,
            session,
        );

        if (!item) {
            this.logger.warn(
                `Item not found for totalBetAmount accumulation: tournament ${tournamentId} / item ${itemId}`,
            );
            return;
        }

        const nextTotalBetAmount = addSignedAmount(
            item.totalBetAmount ?? '0',
            signedDelta,
        );

        await this.itemRepository.setTotalBetAmount(
            tournamentId,
            itemId,
            nextTotalBetAmount,
            session,
        );
    }
}

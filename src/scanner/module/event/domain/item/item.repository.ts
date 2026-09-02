import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    AnyBulkWriteOperation,
    ClientSession,
    Model,
    UpdateResult,
} from 'mongoose';
import { Item, ItemDocument } from 'src/schema/domain/event/item.schema';
import { ItemUpdate } from '../../contract/tournament-finalizer/tournament-finalizer.util';

@Injectable()
export class ItemRepository {
    private readonly CHUNK_SIZE = 500;

    constructor(
        @InjectModel(Item.name)
        private readonly itemModel: Model<ItemDocument>,
    ) {}

    async updateBulkItem(
        itemUpdates: ItemUpdate[],
        session: ClientSession,
    ): Promise<void> {
        if (!itemUpdates.length) return;

        for (let i = 0; i < itemUpdates.length; i += this.CHUNK_SIZE) {
            const slice = itemUpdates.slice(i, i + this.CHUNK_SIZE);

            const ops: AnyBulkWriteOperation<ItemDocument>[] = slice.map(
                (itemUpdate) => ({
                    updateOne: {
                        filter: {
                            tournamentId: itemUpdate.tournamentId,
                            itemId: itemUpdate.itemId,
                        },
                        update: {
                            $inc: {
                                firstCount: itemUpdate.firstCount,
                                secondCount: itemUpdate.secondCount,
                                wins: itemUpdate.wins,
                                tournamentEntries: itemUpdate.tournamentEntries,
                                totalMatchEntries: itemUpdate.totalMatchEntries,
                            },
                        },
                    },
                }),
            );

            if (!ops.length) continue;

            await this.itemModel.bulkWrite(ops, {
                ordered: false,
                session,
            });
        }
    }

    async findTotalBetAmount(
        tournamentId: number,
        itemId: number,
        session: ClientSession,
    ): Promise<{ totalBetAmount?: string } | null> {
        return await this.itemModel
            .findOne({ tournamentId, itemId })
            .select({ totalBetAmount: 1 })
            .session(session)
            .lean();
    }

    async setTotalBetAmount(
        tournamentId: number,
        itemId: number,
        totalBetAmount: string,
        session: ClientSession,
    ): Promise<UpdateResult> {
        return await this.itemModel.updateOne(
            { tournamentId, itemId },
            { $set: { totalBetAmount } },
            { session },
        );
    }
}

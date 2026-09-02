import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, ClientSession, Model } from 'mongoose';
import { Match, MatchDocument } from 'src/schema/domain/event/match.schema';
import { MatchUpdate } from '../../contract/tournament-finalizer/tournament-finalizer.util';

@Injectable()
export class MatchRepository {
    private readonly CHUNK_SIZE = 500;

    constructor(
        @InjectModel(Match.name)
        private readonly matchModel: Model<MatchDocument>,
    ) {}

    async updateBulkMatch(
        matchUpdates: MatchUpdate[],
        session: ClientSession,
    ): Promise<void> {
        if (!matchUpdates.length) return;

        for (let i = 0; i < matchUpdates.length; i += this.CHUNK_SIZE) {
            const slice = matchUpdates.slice(i, i + this.CHUNK_SIZE);

            const ops: AnyBulkWriteOperation<MatchDocument>[] = slice.map(
                (matchUpdate) => ({
                    updateOne: {
                        filter: {
                            tournamentId: matchUpdate.tournamentId,
                            itemLowId: matchUpdate.itemLowId,
                            itemHighId: matchUpdate.itemHighId,
                        },
                        update: {
                            $inc: {
                                lowWins: matchUpdate.lowWins,
                                highWins: matchUpdate.highWins,
                                totalMatches: matchUpdate.totalMatches,
                            },
                        },
                        upsert: true,
                    },
                }),
            );

            if (!ops.length) continue;

            await this.matchModel.bulkWrite(ops, {
                ordered: false,
                session,
            });
        }
    }
}

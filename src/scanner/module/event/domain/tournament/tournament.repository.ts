import { ClientSession, Model, UpdateResult } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
    Tournament,
    TournamentDocument,
} from 'src/schema/domain/event/tournament.schema';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TournamentRepository {
    constructor(
        @InjectModel(Tournament.name)
        private readonly tournamentModel: Model<TournamentDocument>,
    ) {}

    async updateTournamentCount(
        queryData: {
            tournamentId: number;
        },
        updateData: {
            selectedCount: number;
        },
        session: ClientSession,
    ): Promise<UpdateResult> {
        return await this.tournamentModel.updateOne(
            queryData,
            { $inc: updateData },
            { session },
        );
    }

    async findTotalPrize(
        tournamentId: number,
        session: ClientSession,
    ): Promise<{ totalPrize?: string } | null> {
        return await this.tournamentModel
            .findOne({ tournamentId })
            .select({ totalPrize: 1 })
            .session(session)
            .lean();
    }

    // selectedCount($inc)와 totalPrize($set)를 같은 문서에 한 번의 updateOne으로 반영한다.
    async applySettlement(
        tournamentId: number,
        selectedCountDelta: number,
        totalPrize: string,
        session: ClientSession,
    ): Promise<UpdateResult> {
        return await this.tournamentModel.updateOne(
            { tournamentId },
            {
                $inc: { selectedCount: selectedCountDelta },
                $set: { totalPrize },
            },
            { session },
        );
    }
}

import { Injectable } from '@nestjs/common';
import { ClientSession, DeleteResult } from 'mongoose';
import { PlayInfoRepository } from './play-info.repository';

@Injectable()
export class PlayInfoService {
    constructor(private readonly playInfoRepository: PlayInfoRepository) {}

    async upsert(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        upsertData: {
            user: string;
            tournamentId: number;
            firstItemId: number;
            secondItemId: number;
            entryItemHexes: string;
            tournamentDataHash: string;
            blockNumber: number;
            blockHash: string;
            point: number;
            createdAt: Date;
        },
        session: ClientSession,
    ): Promise<boolean> {
        const result = await this.playInfoRepository.upsert(
            queryData,
            upsertData,
            session,
        );

        return result.upsertedCount > 0;
    }

    async upsertBet(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        upsertData: {
            user: string;
            tournamentId: number;
            betItemId: number;
            betAmount: string;
            blockNumber: number;
            blockHash: string;
            createdAt: Date;
        },
        session: ClientSession,
    ): Promise<boolean> {
        const result = await this.playInfoRepository.upsertBet(
            queryData,
            upsertData,
            session,
        );

        return result.upsertedCount > 0;
    }

    async deletePlayInfo(
        queryData: {
            chainId: number;
            txHash: string;
            logIndex: number;
        },
        session: ClientSession,
    ): Promise<DeleteResult> {
        return await this.playInfoRepository.deletePlayInfo(queryData, session);
    }
}

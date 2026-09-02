import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ethers } from 'ethers';
import { MidnightService } from './midnight.service';
import { MidnightGrantService } from 'src/module/domain/midnight-grant/midnight-grant.service';
import { MidnightEscrowService } from 'src/module/domain/midnight-escrow/midnight-escrow.service';
import { TournamentFinalizerService } from 'src/scanner/module/event/contract/tournament-finalizer/tournament-finalizer.service';
import { TournamentFinalizedEvent } from 'src/scanner/module/event/contract/tournament-finalizer/event/tournament-finalized.event';

/**
 * Midnight 에는 EVM 로그 스캐너가 없다. 유저가 `finalizeTournament` 를 제출한 뒤 FE 가 txId 를
 * 알려 주면, 인덱서로 트랜잭션·컨트랙트 호출을 확인하고 legacy chain 스캐너와 **같은 도메인 갱신**
 * (PlayInfo · 포인트 · 토너먼트/아이템/매치 통계)을 실행한다.
 *
 * 온체인에는 커밋/널리파이어만 있어 "누가 무엇을 골랐는지" 는 알 수 없으므로, 통계는 grant 시점에
 * 서버가 검증해 둔 브라켓(entryItemHexes)으로 계산한다 — 이는 legacy chain 에서도 서버가 서명한 값이다.
 */
@Injectable()
export class MidnightFinalizeService {
    private readonly logger = new Logger(MidnightFinalizeService.name);

    constructor(
        private readonly midnight: MidnightService,
        private readonly grantService: MidnightGrantService,
        private readonly escrowService: MidnightEscrowService,
        private readonly tournamentFinalizerService: TournamentFinalizerService,
    ) {}

    async confirmFinalize(chainId: number, walletAddress: string, tournamentId: number, txId: string): Promise<{ confirmed: boolean; point: number }> {
        const grant = await this.grantService.findOne({ chainId, walletAddress, tournamentId });
        if (!grant) throw new NotFoundException('No eligibility grant for this tournament');
        if (grant.finalizeTxId) return { confirmed: true, point: grant.point };

        const tx = await this.midnight.getTransaction(txId);
        if (!tx) throw new BadRequestException('Transaction not found on the Midnight indexer yet — retry shortly');
        const contractAddress = this.midnight.config!.tournamentFinalizerAddress.toLowerCase();
        if (!tx.contractActions?.some((a) => a.address?.toLowerCase() === contractAddress)) {
            throw new BadRequestException('Transaction does not call the TournamentFinalizer contract');
        }

        const event: TournamentFinalizedEvent = {
            timestamp: Math.floor(Number(tx.block.timestamp) / 1000),
            user: walletAddress,
            tournamentDataHash: grant.tournamentDataHash,
            tournamentId,
            tournamentData: grant.entryItemHexes,
            point: grant.point,
        };
        const log = { transactionHash: txId, blockNumber: tx.block.height, blockHash: tx.block.hash, index: 0 } as unknown as ethers.Log;
        await this.tournamentFinalizerService.handleTournamentFinalized(event, log, chainId);
        await this.grantService.setFinalizeTxId({ chainId, walletAddress, tournamentId }, txId);
        this.logger.log(`finalize confirmed: ${walletAddress} tournament=${tournamentId} tx=${txId}`);
        return { confirmed: true, point: grant.point };
    }

    async escrow(chainId: number, walletAddress: string, body: { tournamentId: number; itemId: number; bracket: number[]; segment: string; salt: string; txId: string }): Promise<void> {
        const grant = await this.grantService.findOne({ chainId, walletAddress, tournamentId: body.tournamentId });
        if (!grant) throw new NotFoundException('No eligibility grant for this tournament');
        await this.escrowService.upsert({ chainId, walletAddress, ...body });
    }
}

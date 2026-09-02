import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { PaginationResult } from 'src/module/common/response/api-response';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { BettingStatService } from 'src/module/domain/betting-stat/betting-stat.service';
import { VotePointManagerRequestService } from 'src/module/domain/vote-point-manager-request/vote-point-manager-request.service';
import { FindTournamentsByAddressResDto } from './dto/res/find-tournaments-by-address.res.dto';
import { FindPlayInfosByAddressTournamentIdResDto } from './dto/res/find-play-infos-by-address-tournament-id.res.dto';
import { FindBettingStatsByAddressTournamentIdResDto } from './dto/res/find-betting-stats-by-address-tournament-id.res.dto';
import { FindMyPendingBettingResDto } from './dto/res/find-my-pending-betting.res.dto';
import { UserRepository } from './user.repository';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { FindPointByWalletAddressQueryResult } from './query-result/find-point-by-wallet-address.query-result';

@Injectable()
export class UserService {
    constructor(
        private readonly playInfoService: PlayInfoService,
        private readonly bettingStatService: BettingStatService,
        private readonly votePointManagerRequestService: VotePointManagerRequestService,
        private readonly userRepository: UserRepository,
    ) {}

    async getOrCreate(walletAddress: string): Promise<number> {
        return await this.userRepository.getOrCreate(walletAddress);
    }

    async getPoint(
        walletAddress: string,
    ): Promise<FindPointByWalletAddressQueryResult> {
        const result =
            await this.userRepository.findPointByWalletAddress(walletAddress);
        if (result === null) {
            throw new NotFoundException('User not found');
        }
        return result;
    }

    async findTournamentsByAddress(
        address: string,
        page: number,
        limit: number,
        type: TournamentType,
        period: TournamentPeriod,
        genre: TournamentGenre,
    ): Promise<PaginationResult<FindTournamentsByAddressResDto>> {
        return await this.playInfoService.findTournamentsByAddress(
            address,
            page,
            limit,
            type,
            period,
            genre,
        );
    }

    async findPlayInfosByAddressTournamentId(
        address: string,
        tournamentId: number,
        page: number,
        limit: number,
        genre: TournamentGenre,
    ): Promise<PaginationResult<FindPlayInfosByAddressTournamentIdResDto>> {
        return await this.playInfoService.findPlayInfosByAddressTournamentId(
            address,
            tournamentId,
            page,
            limit,
            genre,
        );
    }

    async findBettingStatsByAddressTournamentId(
        address: string,
        tournamentId: number,
    ): Promise<FindBettingStatsByAddressTournamentIdResDto[]> {
        return await this.bettingStatService.findBettingStatsByAddressTournamentId(
            address,
            tournamentId,
        );
    }

    // 지갑 전역 PENDING 베팅(최대 1건)의 위치를 조회한다. 없으면 null.
    // PENDING 여부의 권위는 betting-stat, option/서명 금액/deadline은 vote 요청에 있어
    // 두 도메인을 조합한다. 정상 흐름에서는 두 레코드가 트랜잭션으로 함께 생성되지만,
    // vote 요청이 없는 예외 상황에서는 option/deadline을 null로, amount는 누적액으로 폴백한다.
    async findMyPendingBetting(
        address: string,
    ): Promise<FindMyPendingBettingResDto | null> {
        const pending = await this.bettingStatService.findPending(address);
        if (!pending) {
            return null;
        }

        const request =
            await this.votePointManagerRequestService.findLatestByWalletTournamentItem(
                address,
                pending.tournamentId,
                pending.itemId,
            );

        return {
            tournamentId: pending.tournamentId,
            itemId: pending.itemId,
            option:
                (request?.option as FindMyPendingBettingResDto['option']) ??
                null,
            amount: request?.amount ?? pending.amount,
            deadline: request?.deadline ?? null,
        };
    }
}

import { Injectable } from '@nestjs/common';
import { PlayInfoRepository } from './play-info.repository';
import { PaginationResult } from 'src/module/common/response/api-response';
import { FindTournamentsByAddressResDto } from 'src/module/api/user/dto/res/find-tournaments-by-address.res.dto';
import { FindPlayInfosByAddressTournamentIdResDto } from 'src/module/api/user/dto/res/find-play-infos-by-address-tournament-id.res.dto';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

@Injectable()
export class PlayInfoService {
    constructor(private readonly playInfoRepository: PlayInfoRepository) {}

    async findTournamentsByAddress(
        address: string,
        page: number,
        limit: number,
        type: TournamentType,
        period: TournamentPeriod,
        genre: TournamentGenre,
    ): Promise<PaginationResult<FindTournamentsByAddressResDto>> {
        const [playInfos, total] = await Promise.all([
            this.playInfoRepository.findTournamentsByAddress(
                address,
                page,
                limit,
                type,
                period,
                genre,
            ),
            this.playInfoRepository.countTournamentsByAddress(
                address,
                type,
                period,
                genre,
            ),
        ]);

        return {
            data: playInfos,
            page,
            limit,
            total,
        };
    }

    async hasPlayInfo(address: string, tournamentId: number): Promise<boolean> {
        return await this.playInfoRepository.existsByAddressTournamentId(
            address,
            tournamentId,
        );
    }

    async findPlayedTournamentIds(
        address: string,
        tournamentIds: number[],
    ): Promise<number[]> {
        return await this.playInfoRepository.findPlayedTournamentIds(
            address,
            tournamentIds,
        );
    }

    async findPlayInfosByAddressTournamentId(
        address: string,
        tournamentId: number,
        page: number,
        limit: number,
        genre: TournamentGenre,
    ): Promise<PaginationResult<FindPlayInfosByAddressTournamentIdResDto>> {
        const [playInfos, total] = await Promise.all([
            this.playInfoRepository.findPlayInfosByAddressTournamentId(
                address,
                tournamentId,
                page,
                limit,
                genre,
            ),
            this.playInfoRepository.countPlayInfosByAddressTournamentId(
                address,
                tournamentId,
            ),
        ]);

        return {
            data: playInfos,
            page,
            limit,
            total,
        };
    }
}

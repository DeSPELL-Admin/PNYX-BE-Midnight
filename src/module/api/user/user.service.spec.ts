import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { BettingStatService } from 'src/module/domain/betting-stat/betting-stat.service';
import { VotePointManagerRequestService } from 'src/module/domain/vote-point-manager-request/vote-point-manager-request.service';
import { UserRepository } from './user.repository';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

describe('UserService', () => {
    let playInfoService: jest.Mocked<PlayInfoService>;
    let bettingStatService: jest.Mocked<BettingStatService>;
    let votePointManagerRequestService: jest.Mocked<VotePointManagerRequestService>;
    let userRepository: jest.Mocked<UserRepository>;
    let service: UserService;

    beforeEach(() => {
        playInfoService = {
            findTournamentsByAddress: jest.fn(),
            findPlayInfosByAddressTournamentId: jest.fn(),
        } as unknown as jest.Mocked<PlayInfoService>;
        bettingStatService = {
            findBettingStatsByAddressTournamentId: jest.fn(),
            findPending: jest.fn(),
        } as unknown as jest.Mocked<BettingStatService>;
        votePointManagerRequestService = {
            findLatestByWalletTournamentItem: jest.fn(),
        } as unknown as jest.Mocked<VotePointManagerRequestService>;
        userRepository = {
            getOrCreate: jest.fn(),
            findPointByWalletAddress: jest.fn(),
        } as unknown as jest.Mocked<UserRepository>;
        service = new UserService(
            playInfoService,
            bettingStatService,
            votePointManagerRequestService,
            userRepository,
        );
    });

    describe('getOrCreate', () => {
        it('delegates to the repository and returns the point', async () => {
            userRepository.getOrCreate.mockResolvedValue(42);

            await expect(service.getOrCreate('0xwallet')).resolves.toBe(42);
            expect(userRepository.getOrCreate).toHaveBeenCalledWith('0xwallet');
        });

        it('propagates a repository rejection', async () => {
            userRepository.getOrCreate.mockRejectedValue(new Error('boom'));

            await expect(service.getOrCreate('0xwallet')).rejects.toThrow(
                'boom',
            );
        });
    });

    describe('getPoint', () => {
        it('returns the point as a dto for an existing user', async () => {
            userRepository.findPointByWalletAddress.mockResolvedValue({
                point: 42,
            });

            await expect(service.getPoint('0xwallet')).resolves.toEqual({
                point: 42,
            });
            expect(
                userRepository.findPointByWalletAddress,
            ).toHaveBeenCalledWith('0xwallet');
        });

        it('returns { point: 0 } for an existing user with no points', async () => {
            userRepository.findPointByWalletAddress.mockResolvedValue({
                point: 0,
            });

            await expect(service.getPoint('0xwallet')).resolves.toEqual({
                point: 0,
            });
        });

        it('throws NotFoundException when the user does not exist', async () => {
            userRepository.findPointByWalletAddress.mockResolvedValue(null);

            await expect(service.getPoint('0xwallet')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('propagates a repository rejection', async () => {
            userRepository.findPointByWalletAddress.mockRejectedValue(
                new Error('boom'),
            );

            await expect(service.getPoint('0xwallet')).rejects.toThrow('boom');
        });
    });

    describe('findTournamentsByAddress', () => {
        it('delegates with the exact arg tuple and returns the value', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findTournamentsByAddress.mockResolvedValue(ret);
            expect(
                await service.findTournamentsByAddress(
                    '0xabc',
                    3,
                    20,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toBe(ret);
            expect(
                playInfoService.findTournamentsByAddress,
            ).toHaveBeenCalledWith(
                '0xabc',
                3,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the type filter to the play-info service', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findTournamentsByAddress.mockResolvedValue(ret);

            await service.findTournamentsByAddress(
                '0xabc',
                3,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );

            expect(
                playInfoService.findTournamentsByAddress,
            ).toHaveBeenCalledWith(
                '0xabc',
                3,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the period filter to the play-info service', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findTournamentsByAddress.mockResolvedValue(ret);

            await service.findTournamentsByAddress(
                '0xabc',
                3,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.UPCOMING,
                TournamentGenre.TOURNAMENT,
            );

            expect(
                playInfoService.findTournamentsByAddress,
            ).toHaveBeenCalledWith(
                '0xabc',
                3,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.UPCOMING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the genre filter to the play-info service', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findTournamentsByAddress.mockResolvedValue(ret);

            await service.findTournamentsByAddress(
                '0xabc',
                3,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );

            expect(
                playInfoService.findTournamentsByAddress,
            ).toHaveBeenCalledWith(
                '0xabc',
                3,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );
        });

        it('propagates a rejection', async () => {
            playInfoService.findTournamentsByAddress.mockRejectedValue(
                new Error('boom'),
            );
            await expect(
                service.findTournamentsByAddress(
                    '0xabc',
                    1,
                    20,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                ),
            ).rejects.toThrow('boom');
        });
    });

    describe('findPlayInfosByAddressTournamentId', () => {
        it('delegates with tournamentId second and forwards the genre', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findPlayInfosByAddressTournamentId.mockResolvedValue(
                ret,
            );
            expect(
                await service.findPlayInfosByAddressTournamentId(
                    '0xabc',
                    42,
                    3,
                    20,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toBe(ret);
            expect(
                playInfoService.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith(
                '0xabc',
                42,
                3,
                20,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the betting genre to the play-info service', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            playInfoService.findPlayInfosByAddressTournamentId.mockResolvedValue(
                ret,
            );

            await service.findPlayInfosByAddressTournamentId(
                '0xabc',
                42,
                1,
                20,
                TournamentGenre.BETTING,
            );

            expect(
                playInfoService.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith('0xabc', 42, 1, 20, TournamentGenre.BETTING);
        });
    });

    describe('findBettingStatsByAddressTournamentId', () => {
        it('delegates to the betting-stat service with the exact arg tuple and returns the value', async () => {
            const ret = [
                { itemId: 1, amount: '100', status: 'ONGOING' },
            ] as never;
            bettingStatService.findBettingStatsByAddressTournamentId.mockResolvedValue(
                ret,
            );

            expect(
                await service.findBettingStatsByAddressTournamentId(
                    '0xabc',
                    42,
                ),
            ).toBe(ret);
            expect(
                bettingStatService.findBettingStatsByAddressTournamentId,
            ).toHaveBeenCalledWith('0xabc', 42);
        });

        it('propagates a rejection', async () => {
            bettingStatService.findBettingStatsByAddressTournamentId.mockRejectedValue(
                new Error('boom'),
            );

            await expect(
                service.findBettingStatsByAddressTournamentId('0xabc', 42),
            ).rejects.toThrow('boom');
        });
    });

    describe('findMyPendingBetting', () => {
        it('returns null and skips the vote lookup when no PENDING exists', async () => {
            bettingStatService.findPending.mockResolvedValue(null);

            await expect(
                service.findMyPendingBetting('0xabc'),
            ).resolves.toBeNull();
            expect(bettingStatService.findPending).toHaveBeenCalledWith(
                '0xabc',
            );
            expect(
                votePointManagerRequestService.findLatestByWalletTournamentItem,
            ).not.toHaveBeenCalled();
        });

        it('composes the PENDING location with the latest vote request', async () => {
            bettingStatService.findPending.mockResolvedValue({
                tournamentId: 12,
                itemId: 3,
                amount: '0',
            });
            votePointManagerRequestService.findLatestByWalletTournamentItem.mockResolvedValue(
                { option: 'bet', amount: '500', deadline: '1720512000' },
            );

            await expect(
                service.findMyPendingBetting('0xabc'),
            ).resolves.toEqual({
                tournamentId: 12,
                itemId: 3,
                option: 'bet',
                amount: '500',
                deadline: '1720512000',
            });
            expect(
                votePointManagerRequestService.findLatestByWalletTournamentItem,
            ).toHaveBeenCalledWith('0xabc', 12, 3);
        });

        it('falls back to null option/deadline and the stat amount when no vote request is found', async () => {
            bettingStatService.findPending.mockResolvedValue({
                tournamentId: 12,
                itemId: 3,
                amount: '250',
            });
            votePointManagerRequestService.findLatestByWalletTournamentItem.mockResolvedValue(
                null,
            );

            await expect(
                service.findMyPendingBetting('0xabc'),
            ).resolves.toEqual({
                tournamentId: 12,
                itemId: 3,
                option: null,
                amount: '250',
                deadline: null,
            });
        });
    });
});

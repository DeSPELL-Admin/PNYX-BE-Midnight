import { NotFoundException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FindMyTournamentsQueryDto } from './dto/req/find-my-tournaments.query.dto';
import { FindMyPlayInfosQueryDto } from './dto/req/find-my-play-infos.query.dto';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

describe('UserController', () => {
    let userService: jest.Mocked<UserService>;
    let controller: UserController;

    beforeEach(() => {
        userService = {
            getPoint: jest.fn(),
            getOrCreate: jest.fn(),
            findTournamentsByAddress: jest.fn(),
            findPlayInfosByAddressTournamentId: jest.fn(),
            findMyPendingBetting: jest.fn(),
        } as unknown as jest.Mocked<UserService>;
        controller = new UserController(userService);
    });

    describe('getMyPoint', () => {
        it('lowercases the wallet address and returns the service dto', async () => {
            userService.getPoint.mockResolvedValue({ point: 1200 });

            await expect(
                controller.getMyPoint('0xAbCdEf0123456789'),
            ).resolves.toEqual({ point: 1200 });

            expect(userService.getPoint).toHaveBeenCalledTimes(1);
            expect(userService.getPoint).toHaveBeenCalledWith(
                '0xabcdef0123456789',
            );
        });

        it('returns { point: 0 } for a user with no points', async () => {
            userService.getPoint.mockResolvedValue({ point: 0 });

            await expect(controller.getMyPoint('0xabc')).resolves.toEqual({
                point: 0,
            });
        });

        it('propagates the NotFoundException when the user is missing', async () => {
            userService.getPoint.mockRejectedValue(
                new NotFoundException('User not found'),
            );

            await expect(controller.getMyPoint('0xabc')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findTournamentsByAddress', () => {
        it('lowercases the wallet and forwards pagination + type + period filters', async () => {
            const ret = { data: [], page: 2, limit: 20, total: 0 } as never;
            userService.findTournamentsByAddress.mockResolvedValue(ret);

            const query = {
                page: 2,
                limit: 20,
                type: TournamentType.EVENT,
                period: TournamentPeriod.ENDED,
            } as FindMyTournamentsQueryDto;

            await expect(
                controller.findTournamentsByAddress('0xAbCdEf', query),
            ).resolves.toBe(ret);

            expect(userService.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabcdef',
                2,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('defaults page/limit and falls back to classic type, ongoing period, and tournament genre when omitted', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            userService.findTournamentsByAddress.mockResolvedValue(ret);

            await controller.findTournamentsByAddress(
                '0xABC',
                {} as FindMyTournamentsQueryDto,
            );

            expect(userService.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the betting genre when provided', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            userService.findTournamentsByAddress.mockResolvedValue(ret);

            const query = {
                type: TournamentType.EVENT,
                period: TournamentPeriod.ENDED,
                genre: TournamentGenre.BETTING,
            } as FindMyTournamentsQueryDto;

            await controller.findTournamentsByAddress('0xABC', query);

            expect(userService.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                1,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );
        });
    });

    describe('findPlayInfosByAddressTournamentId', () => {
        it('lowercases the wallet and forwards pagination + genre', async () => {
            const ret = { data: [], page: 2, limit: 10, total: 0 } as never;
            userService.findPlayInfosByAddressTournamentId.mockResolvedValue(
                ret,
            );

            const query = {
                page: 2,
                limit: 10,
                genre: TournamentGenre.BETTING,
            } as FindMyPlayInfosQueryDto;

            await expect(
                controller.findPlayInfosByAddressTournamentId(
                    '0xAbCdEf',
                    { tournamentId: 42 },
                    query,
                ),
            ).resolves.toBe(ret);

            expect(
                userService.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith(
                '0xabcdef',
                42,
                2,
                10,
                TournamentGenre.BETTING,
            );
        });

        it('defaults page/limit and falls back to the tournament genre when omitted', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            userService.findPlayInfosByAddressTournamentId.mockResolvedValue(
                ret,
            );

            await controller.findPlayInfosByAddressTournamentId(
                '0xABC',
                { tournamentId: 7 },
                {} as FindMyPlayInfosQueryDto,
            );

            expect(
                userService.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith(
                '0xabc',
                7,
                1,
                20,
                TournamentGenre.TOURNAMENT,
            );
        });
    });

    describe('findMyPendingBetting', () => {
        it('lowercases the wallet and returns the service dto', async () => {
            const ret = {
                tournamentId: 12,
                itemId: 3,
                option: 'bet',
                amount: '500',
                deadline: '1720512000',
            } as never;
            userService.findMyPendingBetting.mockResolvedValue(ret);

            await expect(
                controller.findMyPendingBetting('0xAbCdEf0123456789'),
            ).resolves.toBe(ret);

            expect(userService.findMyPendingBetting).toHaveBeenCalledTimes(1);
            expect(userService.findMyPendingBetting).toHaveBeenCalledWith(
                '0xabcdef0123456789',
            );
        });

        it('returns null when there is no pending betting', async () => {
            userService.findMyPendingBetting.mockResolvedValue(null);

            await expect(
                controller.findMyPendingBetting('0xabc'),
            ).resolves.toBeNull();
        });
    });
});

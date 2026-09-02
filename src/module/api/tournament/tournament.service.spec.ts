import { NotFoundException } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import { ItemService } from 'src/module/domain/item/item.service';
import { MatchService } from 'src/module/domain/match/match.service';
import { PlayVerificationService } from 'src/module/domain/play-verification/play-verification.service';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { SortTournamentsType, TournamentStatus } from './tournament.util';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

const WALLET = '0x' + 'ab'.repeat(20);

describe('TournamentService', () => {
    let repo: jest.Mocked<TournamentRepository>;
    let itemService: jest.Mocked<ItemService>;
    let matchService: jest.Mocked<MatchService>;
    let playVerificationService: jest.Mocked<PlayVerificationService>;
    let playInfoService: jest.Mocked<PlayInfoService>;
    let service: TournamentService;

    beforeEach(() => {
        repo = {
            findTournaments: jest.fn(),
            countTournaments: jest.fn(),
            getTournamentById: jest.fn(),
            findTypeAndPointById: jest.fn(),
            findTournamentsByCategory: jest.fn(),
            countTournamentsByCategory: jest.fn(),
        } as unknown as jest.Mocked<TournamentRepository>;
        itemService = {
            getRandomItemIdsByTournamentId: jest.fn(),
            getItemByTournamentIdItemId: jest.fn(),
            findItemStatisticsByTournamentId: jest.fn(),
            getItemCountByTournamentId: jest.fn().mockResolvedValue(0),
        } as unknown as jest.Mocked<ItemService>;
        matchService = {
            findItemDetailStatisticsByTournamentIdItemId: jest.fn(),
        } as unknown as jest.Mocked<MatchService>;
        playVerificationService = {
            upsert: jest.fn(),
        } as unknown as jest.Mocked<PlayVerificationService>;
        playInfoService = {
            findPlayedTournamentIds: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<PlayInfoService>;
        service = new TournamentService(
            repo,
            itemService,
            matchService,
            playVerificationService,
            playInfoService,
        );
    });

    describe('findTournaments', () => {
        it('combines find + count and tags each row with the play status', async () => {
            const rows = [{ tournamentId: 1 }, { tournamentId: 2 }] as never;
            repo.findTournaments.mockResolvedValue(rows);
            repo.countTournaments.mockResolvedValue(57);
            // wallet has played tournament 2 only
            playInfoService.findPlayedTournamentIds.mockResolvedValue([2]);

            const result = await service.findTournaments(
                WALLET,
                SortTournamentsType.POPULARITY,
                3,
                20,
                TournamentType.CLASSIC,
            );

            expect(result).toEqual({
                data: [
                    { tournamentId: 1, status: TournamentStatus.INCOMPLETE },
                    { tournamentId: 2, status: TournamentStatus.COMPLETED },
                ],
                page: 3,
                limit: 20,
                total: 57,
            });
            expect(repo.findTournaments).toHaveBeenCalledWith(
                SortTournamentsType.POPULARITY,
                3,
                20,
                TournamentType.CLASSIC,
                undefined,
            );
            expect(repo.countTournaments).toHaveBeenCalledWith(
                TournamentType.CLASSIC,
                undefined,
            );
            // played lookup is scoped to the wallet and the current page's ids
            expect(
                playInfoService.findPlayedTournamentIds,
            ).toHaveBeenCalledWith(WALLET, [1, 2]);
        });

        it('forwards the type filter to both find and count', async () => {
            repo.findTournaments.mockResolvedValue([] as never);
            repo.countTournaments.mockResolvedValue(0);

            await service.findTournaments(
                WALLET,
                SortTournamentsType.LATEST,
                2,
                15,
                TournamentType.EVENT,
            );

            expect(repo.findTournaments).toHaveBeenCalledWith(
                SortTournamentsType.LATEST,
                2,
                15,
                TournamentType.EVENT,
                undefined,
            );
            expect(repo.countTournaments).toHaveBeenCalledWith(
                TournamentType.EVENT,
                undefined,
            );
        });

        it('forwards the period filter to both find and count', async () => {
            repo.findTournaments.mockResolvedValue([] as never);
            repo.countTournaments.mockResolvedValue(0);

            await service.findTournaments(
                WALLET,
                SortTournamentsType.LATEST,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
            );

            expect(repo.findTournaments).toHaveBeenCalledWith(
                SortTournamentsType.LATEST,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
            );
            expect(repo.countTournaments).toHaveBeenCalledWith(
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
            );
        });

        it('marks every row incomplete when the wallet has played none', async () => {
            const rows = [{ tournamentId: 1 }, { tournamentId: 2 }] as never;
            repo.findTournaments.mockResolvedValue(rows);
            repo.countTournaments.mockResolvedValue(2);
            playInfoService.findPlayedTournamentIds.mockResolvedValue([]);

            const result = await service.findTournaments(
                WALLET,
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.CLASSIC,
            );

            expect(result.data).toEqual([
                { tournamentId: 1, status: TournamentStatus.INCOMPLETE },
                { tournamentId: 2, status: TournamentStatus.INCOMPLETE },
            ]);
        });

        it('handles an empty result set without querying played ids for nothing', async () => {
            repo.findTournaments.mockResolvedValue([] as never);
            repo.countTournaments.mockResolvedValue(0);
            const result = await service.findTournaments(
                WALLET,
                SortTournamentsType.LATEST,
                1,
                20,
                TournamentType.CLASSIC,
            );
            expect(result).toEqual({ data: [], page: 1, limit: 20, total: 0 });
            expect(
                playInfoService.findPlayedTournamentIds,
            ).toHaveBeenCalledWith(WALLET, []);
        });

        it('propagates a repository rejection', async () => {
            repo.findTournaments.mockRejectedValue(new Error('db down'));
            repo.countTournaments.mockResolvedValue(0);
            await expect(
                service.findTournaments(
                    WALLET,
                    SortTournamentsType.LATEST,
                    1,
                    20,
                    TournamentType.CLASSIC,
                ),
            ).rejects.toThrow('db down');
        });

        it('propagates a played-id lookup rejection', async () => {
            repo.findTournaments.mockResolvedValue([
                { tournamentId: 1 },
            ] as never);
            repo.countTournaments.mockResolvedValue(1);
            playInfoService.findPlayedTournamentIds.mockRejectedValue(
                new Error('play-info down'),
            );
            await expect(
                service.findTournaments(
                    WALLET,
                    SortTournamentsType.LATEST,
                    1,
                    20,
                    TournamentType.CLASSIC,
                ),
            ).rejects.toThrow('play-info down');
        });
    });

    describe('getTournamentById', () => {
        it('merges the repository document with the item count', async () => {
            const doc = { tournamentId: 9, title: 'T9' } as never;
            repo.getTournamentById.mockResolvedValue(doc);
            itemService.getItemCountByTournamentId.mockResolvedValue(16);

            expect(await service.getTournamentById(9)).toEqual({
                tournamentId: 9,
                title: 'T9',
                itemCount: 16,
            });
            expect(repo.getTournamentById).toHaveBeenCalledWith(9);
            expect(itemService.getItemCountByTournamentId).toHaveBeenCalledWith(
                9,
            );
        });

        it('throws NotFoundException when missing', async () => {
            repo.getTournamentById.mockResolvedValue(null);
            itemService.getItemCountByTournamentId.mockResolvedValue(0);
            await expect(service.getTournamentById(9)).rejects.toThrow(
                new NotFoundException('Tournament not found'),
            );
        });

        it('propagates an item-count rejection', async () => {
            repo.getTournamentById.mockResolvedValue({
                tournamentId: 9,
            } as never);
            itemService.getItemCountByTournamentId.mockRejectedValue(
                new Error('count failed'),
            );
            await expect(service.getTournamentById(9)).rejects.toThrow(
                'count failed',
            );
        });
    });

    describe('findTypeAndPointById', () => {
        it('delegates to the repository and returns its result', async () => {
            const doc = { type: TournamentType.EVENT, point: 50 };
            repo.findTypeAndPointById.mockResolvedValue(doc);

            expect(await service.findTypeAndPointById(7)).toBe(doc);
            expect(repo.findTypeAndPointById).toHaveBeenCalledWith(7);
        });

        it('rejects when the repository finds no tournament', async () => {
            repo.findTypeAndPointById.mockResolvedValue(null);

            await expect(service.findTypeAndPointById(7)).rejects.toThrow(
                'Tournament not found',
            );
            expect(repo.findTypeAndPointById).toHaveBeenCalledWith(7);
        });
    });

    describe('findTournamentsByCategory', () => {
        it('passes category/orderBy/page/limit/type (period undefined) and combines results', async () => {
            const rows = [{ tournamentId: 5 }] as never;
            repo.findTournamentsByCategory.mockResolvedValue(rows);
            repo.countTournamentsByCategory.mockResolvedValue(1);

            const result = await service.findTournamentsByCategory(
                'anime',
                SortTournamentsType.LATEST,
                2,
                10,
                TournamentType.EVENT,
            );

            expect(result).toEqual({
                data: rows,
                page: 2,
                limit: 10,
                total: 1,
            });
            expect(repo.findTournamentsByCategory).toHaveBeenCalledWith(
                'anime',
                SortTournamentsType.LATEST,
                2,
                10,
                TournamentType.EVENT,
                undefined,
            );
            expect(repo.countTournamentsByCategory).toHaveBeenCalledWith(
                'anime',
                TournamentType.EVENT,
                undefined,
            );
        });

        it('forwards the period filter to both find and count', async () => {
            repo.findTournamentsByCategory.mockResolvedValue([] as never);
            repo.countTournamentsByCategory.mockResolvedValue(0);

            await service.findTournamentsByCategory(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );

            expect(repo.findTournamentsByCategory).toHaveBeenCalledWith(
                'anime',
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );
            expect(repo.countTournamentsByCategory).toHaveBeenCalledWith(
                'anime',
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );
        });
    });

    describe('delegations', () => {
        it('returns ItemService result and upserts the served items as a PlayVerification', async () => {
            const ret = { randomItemIds: [0, 3, 1] };
            itemService.getRandomItemIdsByTournamentId.mockResolvedValue(ret);
            playVerificationService.upsert.mockResolvedValue(undefined);

            expect(
                await service.getRandomItemIdsByTournamentId('0xabc', 7, 4),
            ).toBe(ret);
            expect(
                itemService.getRandomItemIdsByTournamentId,
            ).toHaveBeenCalledWith(7, 4);
            // served (shuffled) order is preserved, joined with '_'
            expect(playVerificationService.upsert).toHaveBeenCalledWith(
                '0xabc',
                7,
                '0_3_1',
            );
        });

        it('does not upsert a PlayVerification when ItemService throws', async () => {
            itemService.getRandomItemIdsByTournamentId.mockRejectedValue(
                new Error('Round count is greater than total item count'),
            );

            await expect(
                service.getRandomItemIdsByTournamentId('0xabc', 7, 999),
            ).rejects.toThrow();
            expect(playVerificationService.upsert).not.toHaveBeenCalled();
        });

        it('rejects when the PlayVerification upsert fails', async () => {
            itemService.getRandomItemIdsByTournamentId.mockResolvedValue({
                randomItemIds: [1],
            });
            playVerificationService.upsert.mockRejectedValue(
                new Error('save failed'),
            );

            await expect(
                service.getRandomItemIdsByTournamentId('0xabc', 7, 1),
            ).rejects.toThrow('save failed');
        });

        it('delegates getItemByTournamentIdItemId to ItemService', async () => {
            const ret = { name: 'x' } as never;
            itemService.getItemByTournamentIdItemId.mockResolvedValue(ret);
            expect(await service.getItemByTournamentIdItemId(7, 3)).toBe(ret);
            expect(
                itemService.getItemByTournamentIdItemId,
            ).toHaveBeenCalledWith(7, 3);
        });

        it('delegates findItemStatistics to ItemService with the genre', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            itemService.findItemStatisticsByTournamentId.mockResolvedValue(ret);
            expect(
                await service.findItemStatisticsByTournamentId(
                    7,
                    TournamentGenre.BETTING,
                    1,
                    20,
                ),
            ).toBe(ret);
            expect(
                itemService.findItemStatisticsByTournamentId,
            ).toHaveBeenCalledWith(7, TournamentGenre.BETTING, 1, 20);
        });

        it('delegates findItemDetailStatistics to MatchService', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            matchService.findItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(
                ret,
            );
            expect(
                await service.findItemDetailStatisticsByTournamentIdItemId(
                    7,
                    3,
                    2,
                    20,
                ),
            ).toBe(ret);
            expect(
                matchService.findItemDetailStatisticsByTournamentIdItemId,
            ).toHaveBeenCalledWith(7, 3, 2, 20);
        });
    });

    it('handles many concurrent calls', async () => {
        repo.findTournaments.mockResolvedValue([] as never);
        repo.countTournaments.mockResolvedValue(0);
        await Promise.all(
            Array.from({ length: 100 }, () =>
                service.findTournaments(
                    WALLET,
                    SortTournamentsType.POPULARITY,
                    1,
                    20,
                    TournamentType.CLASSIC,
                ),
            ),
        );
        expect(repo.findTournaments).toHaveBeenCalledTimes(100);
    });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemRepository } from './item.repository';
import { TournamentGenre } from 'src/module/common/util/enum.util';

describe('ItemService', () => {
    let repo: jest.Mocked<ItemRepository>;
    let service: ItemService;

    beforeEach(() => {
        repo = {
            getItemCountByTournamentId: jest.fn(),
            getItemByTournamentIdItemId: jest.fn(),
            findItemStatisticsByTournamentId: jest.fn(),
            findItemBettingStatisticsByTournamentId: jest.fn(),
        } as unknown as jest.Mocked<ItemRepository>;
        service = new ItemService(repo);
    });

    describe('getItemCountByTournamentId', () => {
        it('delegates to the repository and returns the count', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(16);
            expect(await service.getItemCountByTournamentId(7)).toBe(16);
            expect(repo.getItemCountByTournamentId).toHaveBeenCalledWith(7);
        });

        it('returns 0 for a tournament with no items', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(0);
            expect(await service.getItemCountByTournamentId(99)).toBe(0);
        });

        it('propagates a repository rejection', async () => {
            repo.getItemCountByTournamentId.mockRejectedValue(
                new Error('count failed'),
            );
            await expect(service.getItemCountByTournamentId(7)).rejects.toThrow(
                'count failed',
            );
        });
    });

    describe('getRandomItemIdsByTournamentId', () => {
        it('throws BadRequestException when roundCount exceeds item count', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(8);
            await expect(
                service.getRandomItemIdsByTournamentId(7, 16),
            ).rejects.toThrow(
                new BadRequestException(
                    'Round count is greater than total item count',
                ),
            );
        });

        it('returns a full permutation at the equal boundary (count === roundCount)', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(16);
            const { randomItemIds } =
                await service.getRandomItemIdsByTournamentId(7, 16);
            expect(randomItemIds).toHaveLength(16);
            expect([...randomItemIds].sort((a, b) => a - b)).toEqual(
                Array.from({ length: 16 }, (_, i) => i),
            );
        });

        it('returns unique in-range ids for a partial pick', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(100);
            const { randomItemIds } =
                await service.getRandomItemIdsByTournamentId(7, 4);
            expect(randomItemIds).toHaveLength(4);
            expect(new Set(randomItemIds).size).toBe(4);
            expect(randomItemIds.every((n) => n >= 0 && n < 100)).toBe(true);
            expect(repo.getItemCountByTournamentId).toHaveBeenCalledWith(7);
        });

        it('allows the zero boundary (0 < 0 is false)', async () => {
            repo.getItemCountByTournamentId.mockResolvedValue(0);
            const { randomItemIds } =
                await service.getRandomItemIdsByTournamentId(7, 0);
            expect(randomItemIds).toEqual([]);
        });
    });

    describe('getItemByTournamentIdItemId', () => {
        it('returns the repository item by reference', async () => {
            const item = { name: 'x' } as never;
            repo.getItemByTournamentIdItemId.mockResolvedValue(item);
            expect(await service.getItemByTournamentIdItemId(7, 3)).toBe(item);
        });

        it('throws NotFoundException when missing', async () => {
            repo.getItemByTournamentIdItemId.mockResolvedValue(null);
            await expect(
                service.getItemByTournamentIdItemId(7, 3),
            ).rejects.toThrow(new NotFoundException('Item not found'));
        });
    });

    describe('findItemStatisticsByTournamentId', () => {
        it('uses the tournament-genre query and combines it with count into a PaginationResult', async () => {
            const rows = [{ itemId: 1 }] as never;
            repo.findItemStatisticsByTournamentId.mockResolvedValue(rows);
            repo.getItemCountByTournamentId.mockResolvedValue(42);

            const result = await service.findItemStatisticsByTournamentId(
                7,
                TournamentGenre.TOURNAMENT,
                2,
                20,
            );

            expect(result).toEqual({
                data: rows,
                page: 2,
                limit: 20,
                total: 42,
            });
            expect(repo.findItemStatisticsByTournamentId).toHaveBeenCalledWith(
                7,
                2,
                20,
            );
            expect(
                repo.findItemBettingStatisticsByTournamentId,
            ).not.toHaveBeenCalled();
            expect(repo.getItemCountByTournamentId).toHaveBeenCalledWith(7);
        });

        it('uses the betting-genre query and returns its rows', async () => {
            const rows = [{ itemId: 1, totalBetAmount: '100' }] as never;
            repo.findItemBettingStatisticsByTournamentId.mockResolvedValue(
                rows,
            );
            repo.getItemCountByTournamentId.mockResolvedValue(8);

            const result = await service.findItemStatisticsByTournamentId(
                7,
                TournamentGenre.BETTING,
                1,
                20,
            );

            expect(result).toEqual({
                data: rows,
                page: 1,
                limit: 20,
                total: 8,
            });
            expect(
                repo.findItemBettingStatisticsByTournamentId,
            ).toHaveBeenCalledWith(7, 1, 20);
            expect(
                repo.findItemStatisticsByTournamentId,
            ).not.toHaveBeenCalled();
            expect(repo.getItemCountByTournamentId).toHaveBeenCalledWith(7);
        });

        it('propagates a repository rejection (tournament genre)', async () => {
            repo.findItemStatisticsByTournamentId.mockRejectedValue(
                new Error('agg failed'),
            );
            repo.getItemCountByTournamentId.mockResolvedValue(0);
            await expect(
                service.findItemStatisticsByTournamentId(
                    7,
                    TournamentGenre.TOURNAMENT,
                    1,
                    20,
                ),
            ).rejects.toThrow('agg failed');
        });

        it('propagates a repository rejection (betting genre)', async () => {
            repo.findItemBettingStatisticsByTournamentId.mockRejectedValue(
                new Error('betting agg failed'),
            );
            repo.getItemCountByTournamentId.mockResolvedValue(0);
            await expect(
                service.findItemStatisticsByTournamentId(
                    7,
                    TournamentGenre.BETTING,
                    1,
                    20,
                ),
            ).rejects.toThrow('betting agg failed');
        });
    });
});

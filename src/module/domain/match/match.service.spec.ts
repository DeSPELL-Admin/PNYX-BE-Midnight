import { MatchService } from './match.service';
import { MatchRepository } from './match.repository';

describe('MatchService', () => {
    let repo: jest.Mocked<MatchRepository>;
    let service: MatchService;

    beforeEach(() => {
        repo = {
            findItemDetailStatisticsByTournamentIdItemId: jest.fn(),
            countItemDetailStatisticsByTournamentIdItemId: jest.fn(),
        } as unknown as jest.Mocked<MatchRepository>;
        service = new MatchService(repo);
    });

    it('combines find (4 args) + count (2 args) into a PaginationResult', async () => {
        const rows = [{ opponentItemId: 9 }] as never;
        repo.findItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(
            rows,
        );
        repo.countItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(3);

        const result =
            await service.findItemDetailStatisticsByTournamentIdItemId(
                7,
                5,
                2,
                20,
            );

        expect(result).toEqual({ data: rows, page: 2, limit: 20, total: 3 });
        expect(
            repo.findItemDetailStatisticsByTournamentIdItemId,
        ).toHaveBeenCalledWith(7, 5, 2, 20);
        expect(
            repo.countItemDetailStatisticsByTournamentIdItemId,
        ).toHaveBeenCalledWith(7, 5);
    });

    it('handles an empty result', async () => {
        repo.findItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(
            [] as never,
        );
        repo.countItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(0);
        const result =
            await service.findItemDetailStatisticsByTournamentIdItemId(
                7,
                5,
                1,
                20,
            );
        expect(result).toEqual({ data: [], page: 1, limit: 20, total: 0 });
    });

    it('propagates a rejection from either arm', async () => {
        repo.findItemDetailStatisticsByTournamentIdItemId.mockResolvedValue(
            [] as never,
        );
        repo.countItemDetailStatisticsByTournamentIdItemId.mockRejectedValue(
            new Error('count failed'),
        );
        await expect(
            service.findItemDetailStatisticsByTournamentIdItemId(7, 5, 1, 20),
        ).rejects.toThrow('count failed');
    });
});

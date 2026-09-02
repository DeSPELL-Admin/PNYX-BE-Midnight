import { PlayInfoService } from './play-info.service';
import { PlayInfoRepository } from './play-info.repository';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

describe('PlayInfoService', () => {
    let repo: jest.Mocked<PlayInfoRepository>;
    let service: PlayInfoService;

    beforeEach(() => {
        repo = {
            findTournamentsByAddress: jest.fn(),
            countTournamentsByAddress: jest.fn(),
            findPlayInfosByAddressTournamentId: jest.fn(),
            countPlayInfosByAddressTournamentId: jest.fn(),
            existsByAddressTournamentId: jest.fn(),
            findPlayedTournamentIds: jest.fn(),
        } as unknown as jest.Mocked<PlayInfoRepository>;
        service = new PlayInfoService(repo);
    });

    describe('findTournamentsByAddress', () => {
        it('combines find + count with the exact arg tuple', async () => {
            const rows = [{ tournamentId: 1 }] as never;
            repo.findTournamentsByAddress.mockResolvedValue(rows);
            repo.countTournamentsByAddress.mockResolvedValue(9);

            const result = await service.findTournamentsByAddress(
                '0xabc',
                2,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );

            expect(result).toEqual({
                data: rows,
                page: 2,
                limit: 20,
                total: 9,
            });
            expect(repo.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                2,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(repo.countTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                TournamentType.CLASSIC,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('handles an empty result', async () => {
            repo.findTournamentsByAddress.mockResolvedValue([] as never);
            repo.countTournamentsByAddress.mockResolvedValue(0);
            expect(
                await service.findTournamentsByAddress(
                    '0xabc',
                    1,
                    20,
                    TournamentType.CLASSIC,
                    TournamentPeriod.ONGOING,
                    TournamentGenre.TOURNAMENT,
                ),
            ).toEqual({ data: [], page: 1, limit: 20, total: 0 });
        });

        it('forwards the type filter to both find and count', async () => {
            repo.findTournamentsByAddress.mockResolvedValue([] as never);
            repo.countTournamentsByAddress.mockResolvedValue(0);

            await service.findTournamentsByAddress(
                '0xabc',
                2,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );

            expect(repo.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                2,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
            expect(repo.countTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                TournamentType.EVENT,
                TournamentPeriod.ONGOING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the period filter to both find and count', async () => {
            repo.findTournamentsByAddress.mockResolvedValue([] as never);
            repo.countTournamentsByAddress.mockResolvedValue(0);

            await service.findTournamentsByAddress(
                '0xabc',
                2,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.UPCOMING,
                TournamentGenre.TOURNAMENT,
            );

            expect(repo.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                2,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.UPCOMING,
                TournamentGenre.TOURNAMENT,
            );
            expect(repo.countTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                TournamentType.CLASSIC,
                TournamentPeriod.UPCOMING,
                TournamentGenre.TOURNAMENT,
            );
        });

        it('forwards the genre filter to both find and count', async () => {
            repo.findTournamentsByAddress.mockResolvedValue([] as never);
            repo.countTournamentsByAddress.mockResolvedValue(0);

            await service.findTournamentsByAddress(
                '0xabc',
                2,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );

            expect(repo.findTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                2,
                20,
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );
            expect(repo.countTournamentsByAddress).toHaveBeenCalledWith(
                '0xabc',
                TournamentType.EVENT,
                TournamentPeriod.ENDED,
                TournamentGenre.BETTING,
            );
        });
    });

    describe('hasPlayInfo', () => {
        it('returns true when at least one play record exists', async () => {
            repo.existsByAddressTournamentId.mockResolvedValue(true);

            expect(await service.hasPlayInfo('0xabc', 42)).toBe(true);
            expect(repo.existsByAddressTournamentId).toHaveBeenCalledWith(
                '0xabc',
                42,
            );
        });

        it('returns false when no play record exists', async () => {
            repo.existsByAddressTournamentId.mockResolvedValue(false);

            expect(await service.hasPlayInfo('0xabc', 42)).toBe(false);
        });
    });

    describe('findPlayInfosByAddressTournamentId', () => {
        it('combines find + count, forwarding genre only to find', async () => {
            const rows = [{ txHash: '0x1' }] as never;
            repo.findPlayInfosByAddressTournamentId.mockResolvedValue(rows);
            repo.countPlayInfosByAddressTournamentId.mockResolvedValue(4);

            const result = await service.findPlayInfosByAddressTournamentId(
                '0xabc',
                42,
                3,
                10,
                TournamentGenre.TOURNAMENT,
            );

            expect(result).toEqual({
                data: rows,
                page: 3,
                limit: 10,
                total: 4,
            });
            expect(
                repo.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith(
                '0xabc',
                42,
                3,
                10,
                TournamentGenre.TOURNAMENT,
            );
            expect(
                repo.countPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith('0xabc', 42);
        });

        it('forwards the betting genre to the repository find', async () => {
            repo.findPlayInfosByAddressTournamentId.mockResolvedValue(
                [] as never,
            );
            repo.countPlayInfosByAddressTournamentId.mockResolvedValue(0);

            await service.findPlayInfosByAddressTournamentId(
                '0xabc',
                42,
                1,
                20,
                TournamentGenre.BETTING,
            );

            expect(
                repo.findPlayInfosByAddressTournamentId,
            ).toHaveBeenCalledWith('0xabc', 42, 1, 20, TournamentGenre.BETTING);
        });

        it('propagates a rejection', async () => {
            repo.findPlayInfosByAddressTournamentId.mockResolvedValue(
                [] as never,
            );
            repo.countPlayInfosByAddressTournamentId.mockRejectedValue(
                new Error('boom'),
            );
            await expect(
                service.findPlayInfosByAddressTournamentId(
                    '0xabc',
                    42,
                    1,
                    20,
                    TournamentGenre.TOURNAMENT,
                ),
            ).rejects.toThrow('boom');
        });
    });

    describe('findPlayedTournamentIds', () => {
        it('delegates to the repository with the exact address and id list', async () => {
            repo.findPlayedTournamentIds.mockResolvedValue([2, 5]);

            expect(
                await service.findPlayedTournamentIds('0xabc', [2, 5, 9]),
            ).toEqual([2, 5]);
            expect(repo.findPlayedTournamentIds).toHaveBeenCalledWith(
                '0xabc',
                [2, 5, 9],
            );
        });

        it('returns an empty array unchanged', async () => {
            repo.findPlayedTournamentIds.mockResolvedValue([]);
            expect(await service.findPlayedTournamentIds('0xabc', [])).toEqual(
                [],
            );
        });
    });
});

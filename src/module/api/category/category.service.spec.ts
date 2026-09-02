import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import { SortTournamentsType } from 'src/module/api/tournament/tournament.util';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

describe('CategoryService', () => {
    let repo: jest.Mocked<CategoryRepository>;
    let tournamentService: jest.Mocked<TournamentService>;
    let service: CategoryService;

    beforeEach(() => {
        repo = {
            getCategories: jest.fn(),
            countCategories: jest.fn(),
        } as unknown as jest.Mocked<CategoryRepository>;
        tournamentService = {
            findTournamentsByCategory: jest.fn(),
        } as unknown as jest.Mocked<TournamentService>;
        service = new CategoryService(repo, tournamentService);
    });

    describe('getCategories', () => {
        it('combines find + count', async () => {
            const rows = [{ category: 'a' }] as never;
            repo.getCategories.mockResolvedValue(rows);
            repo.countCategories.mockResolvedValue(12);

            const result = await service.getCategories(2, 5);

            expect(result).toEqual({
                data: rows,
                page: 2,
                limit: 5,
                total: 12,
            });
            expect(repo.getCategories).toHaveBeenCalledWith(2, 5);
            expect(repo.countCategories).toHaveBeenCalledWith();
        });

        it('propagates a repository rejection', async () => {
            repo.getCategories.mockResolvedValue([] as never);
            repo.countCategories.mockRejectedValue(new Error('count failed'));
            await expect(service.getCategories(1, 20)).rejects.toThrow(
                'count failed',
            );
        });
    });

    describe('findTournamentsByCategory', () => {
        it('delegates category/orderBy/page/limit/type (period undefined) to TournamentService and returns its value', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            tournamentService.findTournamentsByCategory.mockResolvedValue(ret);
            expect(
                await service.findTournamentsByCategory(
                    'food',
                    SortTournamentsType.POPULARITY,
                    1,
                    20,
                    TournamentType.EVENT,
                ),
            ).toBe(ret);
            expect(
                tournamentService.findTournamentsByCategory,
            ).toHaveBeenCalledWith(
                'food',
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.EVENT,
                undefined,
            );
        });

        it('forwards the period filter to TournamentService', async () => {
            const ret = { data: [], page: 1, limit: 20, total: 0 } as never;
            tournamentService.findTournamentsByCategory.mockResolvedValue(ret);

            await service.findTournamentsByCategory(
                'food',
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );

            expect(
                tournamentService.findTournamentsByCategory,
            ).toHaveBeenCalledWith(
                'food',
                SortTournamentsType.POPULARITY,
                1,
                20,
                TournamentType.CLASSIC,
                TournamentPeriod.ENDED,
            );
        });
    });
});

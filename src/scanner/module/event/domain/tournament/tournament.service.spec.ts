import { ClientSession, UpdateResult } from 'mongoose';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';

describe('Scanner TournamentService', () => {
    let repo: jest.Mocked<TournamentRepository>;
    let service: TournamentService;
    const session = {} as ClientSession;

    const updateResult: UpdateResult = {
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
    };

    beforeEach(() => {
        repo = {
            updateTournamentCount: jest.fn().mockResolvedValue(updateResult),
        } as unknown as jest.Mocked<TournamentRepository>;
        service = new TournamentService(repo);
    });

    it('delegates to the repository with the same arguments and returns its result', async () => {
        const query = { tournamentId: 42 };
        const update = { selectedCount: 3 };

        const result = await service.updateTournamentCount(
            query,
            update,
            session,
        );

        expect(repo.updateTournamentCount).toHaveBeenCalledTimes(1);
        expect(repo.updateTournamentCount).toHaveBeenCalledWith(
            query,
            update,
            session,
        );
        expect(result).toBe(updateResult);
    });
});

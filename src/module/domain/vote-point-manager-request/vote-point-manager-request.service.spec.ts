import { Test } from '@nestjs/testing';
import { VotePointManagerRequestService } from './vote-point-manager-request.service';
import { VotePointManagerRequestRepository } from './vote-point-manager-request.repository';

describe('VotePointManagerRequestService (retained reader)', () => {
    let service: VotePointManagerRequestService;
    const repo = {
        findLatestByWalletTournamentItem: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                VotePointManagerRequestService,
                {
                    provide: VotePointManagerRequestRepository,
                    useValue: repo,
                },
            ],
        }).compile();
        service = moduleRef.get(VotePointManagerRequestService);
    });

    describe('findLatestByWalletTournamentItem', () => {
        it('delegates to the repository with the same args and returns its result', async () => {
            const row = { tournamentId: 1, itemId: 3, status: 'pending' };
            repo.findLatestByWalletTournamentItem.mockResolvedValue(row);

            await expect(
                service.findLatestByWalletTournamentItem('0xabc', 1, 3),
            ).resolves.toBe(row);
            expect(
                repo.findLatestByWalletTournamentItem,
            ).toHaveBeenCalledWith('0xabc', 1, 3);
        });

        it('returns null when there is no matching request', async () => {
            repo.findLatestByWalletTournamentItem.mockResolvedValue(null);
            await expect(
                service.findLatestByWalletTournamentItem('0xabc', 1, 3),
            ).resolves.toBeNull();
        });
    });
});

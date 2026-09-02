import { Test } from '@nestjs/testing';
import { BettingStatService } from './betting-stat.service';
import { BettingStatRepository } from './betting-stat.repository';

describe('BettingStatService (retained readers)', () => {
    let service: BettingStatService;
    const repo = {
        findByWalletAddressAndTournamentId: jest.fn(),
        findPending: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                BettingStatService,
                { provide: BettingStatRepository, useValue: repo },
            ],
        }).compile();
        service = moduleRef.get(BettingStatService);
    });

    describe('findBettingStatsByAddressTournamentId', () => {
        it('returns base rows (itemId/amount/status) with no reward when the tournament has not ended', async () => {
            repo.findByWalletAddressAndTournamentId.mockResolvedValue([
                {
                    itemId: 3,
                    amount: '1000',
                    status: 'ongoing',
                    endedAt: null,
                    winItemId: null,
                    totalPrize: '0',
                    winItemTotalBetAmount: '0',
                },
            ]);

            const result = await service.findBettingStatsByAddressTournamentId(
                '0xabc',
                1,
            );

            expect(repo.findByWalletAddressAndTournamentId).toHaveBeenCalledWith(
                '0xabc',
                1,
            );
            expect(result).toEqual([
                { itemId: 3, amount: '1000', status: 'ongoing' },
            ]);
            expect(result[0]).not.toHaveProperty('reward');
        });

        it('does not add reward for an ended row that is not the winning item', async () => {
            repo.findByWalletAddressAndTournamentId.mockResolvedValue([
                {
                    itemId: 3,
                    amount: '1000',
                    status: 'settled',
                    endedAt: new Date(Date.now() - 1000).toISOString(),
                    winItemId: 9,
                    totalPrize: '1000000',
                    winItemTotalBetAmount: '500000',
                },
            ]);

            const result = await service.findBettingStatsByAddressTournamentId(
                '0xabc',
                1,
            );

            expect(result[0]).not.toHaveProperty('reward');
        });

        it('returns an empty array when the wallet has no rows', async () => {
            repo.findByWalletAddressAndTournamentId.mockResolvedValue([]);
            await expect(
                service.findBettingStatsByAddressTournamentId('0xabc', 1),
            ).resolves.toEqual([]);
        });
    });

    describe('findPending', () => {
        it('delegates to the repository and returns its result', async () => {
            const pending = { tournamentId: 1, itemId: 3 };
            repo.findPending.mockResolvedValue(pending);
            await expect(service.findPending('0xabc')).resolves.toBe(pending);
            expect(repo.findPending).toHaveBeenCalledWith('0xabc');
        });

        it('returns null when nothing is pending', async () => {
            repo.findPending.mockResolvedValue(null);
            await expect(service.findPending('0xabc')).resolves.toBeNull();
        });
    });
});

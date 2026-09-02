import { UpdateWriteOpResult } from 'mongoose';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenRepository } from './refresh-token.repository';

const WALLET = '0x000000000000000000000000000000000000beef';

const updateResult = (matchedCount: number): UpdateWriteOpResult => ({
    acknowledged: true,
    matchedCount,
    modifiedCount: matchedCount,
    upsertedCount: 0,
    upsertedId: null,
});

describe('RefreshTokenService', () => {
    let repo: jest.Mocked<RefreshTokenRepository>;
    let service: RefreshTokenService;

    beforeEach(() => {
        repo = {
            create: jest.fn(),
            findByWalletAddressAndToken: jest.fn(),
            updateByWalletAddressAndToken: jest.fn(),
            deleteByWalletAddressAndToken: jest.fn(),
        } as unknown as jest.Mocked<RefreshTokenRepository>;
        service = new RefreshTokenService(repo);
    });

    it('create forwards the insert payload to the repository', async () => {
        const data = {
            walletAddress: WALLET,
            tokenHash: 'h1',
            expiresAt: new Date('2030-01-01'),
            userAgentHash: 'ua',
            ipHash: 'ip',
        };
        await service.create(data);
        expect(repo.create).toHaveBeenCalledWith(data);
    });

    it('getByWalletAddressAndToken returns the repository result', async () => {
        const row = { expiresAt: new Date('2030-01-01') };
        repo.findByWalletAddressAndToken.mockResolvedValue(row);
        expect(await service.getByWalletAddressAndToken(WALLET, 'h1')).toBe(
            row,
        );
        expect(repo.findByWalletAddressAndToken).toHaveBeenCalledWith(
            WALLET,
            'h1',
        );
    });

    it('rotate returns true when the repository matched a row', async () => {
        repo.updateByWalletAddressAndToken.mockResolvedValue(updateResult(1));
        const query = { walletAddress: WALLET, tokenHash: 'old' };
        const update = { tokenHash: 'new', expiresAt: new Date('2030-01-01') };

        expect(await service.rotateByWalletAddressAndToken(query, update)).toBe(
            true,
        );
        expect(repo.updateByWalletAddressAndToken).toHaveBeenCalledWith(
            query,
            update,
        );
    });

    it('rotate returns false when no row matched (reuse / unknown token)', async () => {
        repo.updateByWalletAddressAndToken.mockResolvedValue(updateResult(0));
        expect(
            await service.rotateByWalletAddressAndToken(
                { walletAddress: WALLET, tokenHash: 'old' },
                { tokenHash: 'new', expiresAt: new Date('2030-01-01') },
            ),
        ).toBe(false);
    });

    it('revoke delegates to repository delete', async () => {
        await service.revokeByWalletAddressAndToken(WALLET, 'h1');
        expect(repo.deleteByWalletAddressAndToken).toHaveBeenCalledWith(
            WALLET,
            'h1',
        );
    });
});

import { NotFoundException } from '@nestjs/common';
import { ClientSession, UpdateResult } from 'mongoose';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('Scanner UserService', () => {
    let repo: jest.Mocked<UserRepository>;
    let service: UserService;
    const session = {} as ClientSession;
    const wallet = '0x' + 'ab'.repeat(20);

    beforeEach(() => {
        repo = {
            incrementPoint: jest
                .fn()
                .mockResolvedValue({ matchedCount: 1 } as UpdateResult),
        } as unknown as jest.Mocked<UserRepository>;
        service = new UserService(repo);
    });

    it('forwards a positive point delta to the repository', async () => {
        await service.incrementPoint(wallet, 16, session);

        expect(repo.incrementPoint).toHaveBeenCalledTimes(1);
        expect(repo.incrementPoint).toHaveBeenCalledWith(wallet, 16, session);
    });

    it('forwards a negative point delta (only zero short-circuits)', async () => {
        await service.incrementPoint(wallet, -4, session);

        expect(repo.incrementPoint).toHaveBeenCalledWith(wallet, -4, session);
    });

    it('does not touch the repository when the delta is zero', async () => {
        await service.incrementPoint(wallet, 0, session);

        expect(repo.incrementPoint).not.toHaveBeenCalled();
    });

    it('throws when no user matches the wallet address', async () => {
        repo.incrementPoint.mockResolvedValue({
            matchedCount: 0,
        } as UpdateResult);

        await expect(
            service.incrementPoint(wallet, 16, session),
        ).rejects.toThrow(NotFoundException);
    });
});

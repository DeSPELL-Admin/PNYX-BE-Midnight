import { BadRequestException } from '@nestjs/common';
import { PlayVerificationService } from './play-verification.service';
import { PlayVerificationRepository } from './play-verification.repository';

describe('PlayVerificationService', () => {
    let repo: jest.Mocked<PlayVerificationRepository>;
    let service: PlayVerificationService;

    beforeEach(() => {
        repo = {
            upsert: jest.fn(),
            findOne: jest.fn(),
        } as unknown as jest.Mocked<PlayVerificationRepository>;
        service = new PlayVerificationService(repo);
    });

    it('delegates upsert to the repository with the exact arg tuple', async () => {
        repo.upsert.mockResolvedValue(undefined);

        await service.upsert('0xabc', 7, '0_3_1');

        expect(repo.upsert).toHaveBeenCalledTimes(1);
        expect(repo.upsert).toHaveBeenCalledWith('0xabc', 7, '0_3_1');
    });

    it('propagates a repository rejection', async () => {
        repo.upsert.mockRejectedValue(new Error('db down'));

        await expect(service.upsert('0xabc', 7, '0_3_1')).rejects.toThrow(
            'db down',
        );
    });

    it('delegates findOne and returns the stored itemIds', async () => {
        repo.findOne.mockResolvedValue({ itemIds: '0_3_1' });

        const result = await service.findOne('0xabc', 7);

        expect(result).toEqual({ itemIds: '0_3_1' });
        expect(repo.findOne).toHaveBeenCalledWith('0xabc', 7);
    });

    it('throws BadRequestException from findOne when no verification exists', async () => {
        repo.findOne.mockResolvedValue(null);

        await expect(service.findOne('0xabc', 7)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });
});

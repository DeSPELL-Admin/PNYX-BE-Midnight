import { ClientSession, DeleteResult, UpdateWriteOpResult } from 'mongoose';
import { PlayInfoService } from './play-info.service';
import { PlayInfoRepository } from './play-info.repository';

const CREATED_AT = new Date('2026-01-02T03:04:05.000Z');

const key = { chainId: 7103, txHash: '0x' + 'ab'.repeat(32), logIndex: 0 };

const upsertData = {
    user: '0x' + 'cd'.repeat(20),
    tournamentId: 1,
    firstItemId: 1,
    secondItemId: 2,
    entryItemHexes: '0x00',
    tournamentDataHash: '0xhash',
    blockNumber: 1,
    blockHash: '0x' + 'ef'.repeat(32),
    point: 16,
    createdAt: CREATED_AT,
};

const updateResult = (upsertedCount: number): UpdateWriteOpResult => ({
    acknowledged: true,
    matchedCount: upsertedCount === 0 ? 1 : 0,
    modifiedCount: upsertedCount === 0 ? 1 : 0,
    upsertedCount,
    upsertedId: null,
});

describe('Scanner PlayInfoService', () => {
    let repo: jest.Mocked<PlayInfoRepository>;
    let service: PlayInfoService;
    const session = {} as ClientSession;

    beforeEach(() => {
        repo = {
            upsert: jest.fn(),
            deletePlayInfo: jest.fn(),
        } as unknown as jest.Mocked<PlayInfoRepository>;
        service = new PlayInfoService(repo);
    });

    it('upsert returns true when the repository inserted a new doc', async () => {
        repo.upsert.mockResolvedValue(updateResult(1));

        expect(await service.upsert(key, upsertData, session)).toBe(true);
        expect(repo.upsert).toHaveBeenCalledWith(key, upsertData, session);
    });

    it('upsert returns false when the doc already existed (no insert)', async () => {
        repo.upsert.mockResolvedValue(updateResult(0));

        expect(await service.upsert(key, upsertData, session)).toBe(false);
    });

    it('deletePlayInfo forwards to the repository and returns its result', async () => {
        const result = { acknowledged: true, deletedCount: 1 } as DeleteResult;
        repo.deletePlayInfo.mockResolvedValue(result);

        expect(await service.deletePlayInfo(key, session)).toBe(result);
        expect(repo.deletePlayInfo).toHaveBeenCalledWith(key, session);
    });
});

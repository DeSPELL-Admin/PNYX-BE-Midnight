import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { SignatureService } from './signature.service';
import { LockService } from 'src/module/domain/lock/lock.service';
import { PlayVerificationService } from 'src/module/domain/play-verification/play-verification.service';
import { PlayInfoService } from 'src/module/domain/play-info/play-info.service';
import { TournamentService } from 'src/module/api/tournament/tournament.service';
import { MidnightService } from 'src/module/midnight/midnight.service';
import { MidnightGrantService } from 'src/module/domain/midnight-grant/midnight-grant.service';
import type { MidnightGrantRecord } from 'src/module/domain/midnight-grant/midnight-grant.repository';

/**
 * grant 재사용 경로 결정표 — `probeGrantLiveness` 는 mock 으로 네 상태를 주입한다(매핑 자체는
 * midnight.service.spec.ts 가 검증). 공개 진입점 `getTournamentFinalizeSignature` 를 통해 호출한다.
 */
const CHAIN = 99101;
const WALLET = 'mn_addr_test';
const TOURNAMENT = 12;
const USER_PK = '0x' + 'ab'.repeat(32);
// 16강 브라켓: item id 1..16, uint16 BE → 32 bytes (power of two, no duplicates)
const ITEM_IDS = Array.from({ length: 16 }, (_, i) => i + 1);
const TOURNAMENT_DATA =
    '0x' + ITEM_IDS.map((id) => id.toString(16).padStart(4, '0')).join('');
const LEAF = '0x' + 'cd'.repeat(32);
const OLD_TX = '00dead' + '0'.repeat(58);
const NEW_TX = '00beef' + '0'.repeat(58);
const NOW_SEC = 1_800_000_000;
const THRESHOLD_SEC = 45; // default of MIDNIGHT_GRANT_LIVENESS_THRESHOLD_SECONDS

const existingRecord = (
    ageSec: number,
    extra: Partial<MidnightGrantRecord> = {},
): MidnightGrantRecord => ({
    chainId: CHAIN,
    walletAddress: WALLET,
    tournamentId: TOURNAMENT,
    userPk: USER_PK,
    entryItemHexes: TOURNAMENT_DATA,
    tournamentDataHash: '0x' + '11'.repeat(32),
    point: 16,
    deadline: String(NOW_SEC + 3600),
    leaf: LEAF,
    txId: OLD_TX,
    createdAt: new Date((NOW_SEC - ageSec) * 1000),
    updatedAt: new Date((NOW_SEC - ageSec) * 1000),
    ...extra,
});

describe('SignatureService.getTournamentFinalizeSignature (Midnight grant)', () => {
    let service: SignatureService;
    const lockService = { setWithLock: jest.fn(), releaseLock: jest.fn() };
    const playVerificationService = { findOne: jest.fn() };
    const playInfoService = { hasPlayInfo: jest.fn() };
    const tournamentService = { findTypeAndPointById: jest.fn() };
    const midnightService = {
        eligibilityLeaf: jest.fn(),
        grantEligibility: jest.fn(),
        probeGrantLiveness: jest.fn(),
    };
    const midnightGrantService = { findOne: jest.fn(), upsert: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(NOW_SEC * 1000);
        lockService.setWithLock.mockResolvedValue('lock-value');
        lockService.releaseLock.mockResolvedValue(true);
        playVerificationService.findOne.mockResolvedValue({
            itemIds: ITEM_IDS.join('_'),
        });
        playInfoService.hasPlayInfo.mockResolvedValue(false);
        tournamentService.findTypeAndPointById.mockResolvedValue({
            type: 'NORMAL',
        });
        midnightService.eligibilityLeaf.mockResolvedValue(LEAF);
        midnightService.grantEligibility.mockResolvedValue({ txId: NEW_TX });
        midnightGrantService.upsert.mockResolvedValue(undefined);

        const moduleRef = await Test.createTestingModule({
            providers: [
                SignatureService,
                { provide: LockService, useValue: lockService },
                {
                    provide: PlayVerificationService,
                    useValue: playVerificationService,
                },
                { provide: PlayInfoService, useValue: playInfoService },
                { provide: TournamentService, useValue: tournamentService },
                { provide: MidnightService, useValue: midnightService },
                {
                    provide: MidnightGrantService,
                    useValue: midnightGrantService,
                },
            ],
        }).compile();
        service = moduleRef.get(SignatureService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const call = () =>
        service.getTournamentFinalizeSignature(
            CHAIN,
            WALLET,
            TOURNAMENT,
            TOURNAMENT_DATA,
            USER_PK,
        );

    it('requires a Midnight public key for a finalize grant', async () => {
        await expect(
            service.getTournamentFinalizeSignature(
                CHAIN,
                WALLET,
                TOURNAMENT,
                TOURNAMENT_DATA,
            ),
        ).rejects.toThrow('userPk is required on Midnight');
    });

    describe('reuse path (existing record within the deadline window)', () => {
        it('probe success → exists:true, no re-grant', async () => {
            midnightGrantService.findOne.mockResolvedValue(existingRecord(10));
            midnightService.probeGrantLiveness.mockResolvedValue({
                state: 'success',
            });

            await expect(call()).resolves.toMatchObject({
                exists: true,
                txId: OLD_TX,
                point: 16,
            });
            expect(midnightService.probeGrantLiveness).toHaveBeenCalledWith(
                OLD_TX,
            );
            expect(midnightService.grantEligibility).not.toHaveBeenCalled();
            expect(midnightGrantService.upsert).not.toHaveBeenCalled();
        });

        it.each(['FAILURE', 'PARTIAL_SUCCESS', 'MISSING_ACTION'])(
            'probe failed (%s) → immediate same-leaf re-grant regardless of age',
            async (status) => {
                midnightGrantService.findOne.mockResolvedValue(
                    existingRecord(1),
                ); // young
                midnightService.probeGrantLiveness.mockResolvedValue({
                    state: 'failed',
                    status,
                });

                await expect(call()).resolves.toMatchObject({
                    exists: false,
                    txId: NEW_TX,
                    point: 16,
                });
                expect(midnightService.grantEligibility).toHaveBeenCalledWith(
                    LEAF,
                );
                expect(midnightService.eligibilityLeaf).not.toHaveBeenCalled(); // leaf reused, not recomputed
                expect(midnightGrantService.upsert).toHaveBeenCalledWith(
                    {
                        chainId: CHAIN,
                        walletAddress: WALLET,
                        tournamentId: TOURNAMENT,
                    },
                    {
                        userPk: USER_PK,
                        entryItemHexes: TOURNAMENT_DATA,
                        tournamentDataHash: '0x' + '11'.repeat(32),
                        point: 16,
                        deadline: String(NOW_SEC + 3600),
                        leaf: LEAF,
                        txId: NEW_TX,
                    },
                );
            },
        );

        it('probe absent + young (< threshold) → exists:true, keep polling', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(THRESHOLD_SEC - 1),
            );
            midnightService.probeGrantLiveness.mockResolvedValue({
                state: 'absent',
            });

            await expect(call()).resolves.toMatchObject({
                exists: true,
                txId: OLD_TX,
            });
            expect(midnightService.grantEligibility).not.toHaveBeenCalled();
        });

        it('probe absent + old (>= threshold) → re-grant', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(THRESHOLD_SEC),
            );
            midnightService.probeGrantLiveness.mockResolvedValue({
                state: 'absent',
            });

            await expect(call()).resolves.toMatchObject({
                exists: false,
                txId: NEW_TX,
            });
            expect(midnightService.grantEligibility).toHaveBeenCalledWith(LEAF);
            expect(midnightGrantService.upsert).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ txId: NEW_TX, leaf: LEAF }),
            );
        });

        it('probe inconclusive → fail-open exists:true even when old, no re-grant, no 5xx', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(THRESHOLD_SEC * 10),
            );
            midnightService.probeGrantLiveness.mockResolvedValue({
                state: 'inconclusive',
                reason: 'indexer 502',
            });

            await expect(call()).resolves.toMatchObject({
                exists: true,
                txId: OLD_TX,
            });
            expect(midnightService.grantEligibility).not.toHaveBeenCalled();
            expect(midnightGrantService.upsert).not.toHaveBeenCalled();
        });

        it('replacement grant fails pre-submit → propagates, record untouched', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(THRESHOLD_SEC),
            );
            midnightService.probeGrantLiveness.mockResolvedValue({
                state: 'failed',
                status: 'FAILURE',
            });
            midnightService.grantEligibility.mockRejectedValue(
                new Error('Insufficient Funds: could not balance dust'),
            );

            await expect(call()).rejects.toThrow('Insufficient Funds');
            expect(midnightGrantService.upsert).not.toHaveBeenCalled();
            expect(lockService.releaseLock).toHaveBeenCalled();
        });

        it('record already finalized → ConflictException before any probe', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(10, { finalizeTxId: '00f1na1' }),
            );

            await expect(call()).rejects.toBeInstanceOf(ConflictException);
            expect(midnightService.probeGrantLiveness).not.toHaveBeenCalled();
            expect(midnightService.grantEligibility).not.toHaveBeenCalled();
        });

        it('reuse window expired → fresh grant path (new leaf), no probe', async () => {
            midnightGrantService.findOne.mockResolvedValue(
                existingRecord(100_000, { deadline: String(NOW_SEC - 3600) }),
            );

            await expect(call()).resolves.toMatchObject({
                exists: false,
                txId: NEW_TX,
            });
            expect(midnightService.probeGrantLiveness).not.toHaveBeenCalled();
            expect(midnightService.eligibilityLeaf).toHaveBeenCalled();
            expect(midnightService.grantEligibility).toHaveBeenCalledWith(LEAF);
        });
    });

    it('no existing record → fresh grant, stores txId only (async submit)', async () => {
        midnightGrantService.findOne.mockResolvedValue(null);

        await expect(call()).resolves.toMatchObject({
            exists: false,
            txId: NEW_TX,
            point: 16,
        });
        expect(midnightService.eligibilityLeaf).toHaveBeenCalledWith(
            USER_PK,
            TOURNAMENT,
            16,
            expect.any(BigInt),
            TOURNAMENT_DATA,
        );
        expect(midnightGrantService.upsert).toHaveBeenCalledWith(
            { chainId: CHAIN, walletAddress: WALLET, tournamentId: TOURNAMENT },
            expect.objectContaining({ txId: NEW_TX, leaf: LEAF, point: 16 }),
        );
        expect(midnightService.probeGrantLiveness).not.toHaveBeenCalled();
    });
});

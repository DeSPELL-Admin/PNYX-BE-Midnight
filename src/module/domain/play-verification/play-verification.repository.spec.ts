import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    PlayVerification,
    PlayVerificationDocument,
    PlayVerificationSchema,
} from 'src/schema/domain/event/play-verification.schema';
import { PlayVerificationRepository } from './play-verification.repository';

describe('PlayVerificationRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<PlayVerificationDocument>;
    let repository: PlayVerificationRepository;

    const WALLET = '0x000000000000000000000000000000000000beef';
    const OTHER_WALLET = '0x000000000000000000000000000000000000cafe';
    const TOURNAMENT_ID = 42;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_play_verification' });
        connection = mem.connection;
        model = registerModel<PlayVerificationDocument>(
            connection,
            PlayVerification.name,
            PlayVerificationSchema,
        );
        await model.syncIndexes();
        repository = new PlayVerificationRepository(model);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    it('creates a new verification on first call', async () => {
        await repository.upsert(WALLET, TOURNAMENT_ID, '0_3_1');

        const doc = await model.findOne({
            walletAddress: WALLET,
            tournamentId: TOURNAMENT_ID,
        });
        expect(doc).not.toBeNull();
        expect(doc!.walletAddress).toBe(WALLET);
        expect(doc!.tournamentId).toBe(TOURNAMENT_ID);
        expect(doc!.itemIds).toBe('0_3_1');
        expect(await model.countDocuments({})).toBe(1);
    });

    it('overwrites itemIds on repeat call without duplicating the document', async () => {
        await repository.upsert(WALLET, TOURNAMENT_ID, '0_3_1');
        const first = await model.findOne({
            walletAddress: WALLET,
            tournamentId: TOURNAMENT_ID,
        });

        await repository.upsert(WALLET, TOURNAMENT_ID, '7_2_9_5');
        const second = await model.findOne({
            walletAddress: WALLET,
            tournamentId: TOURNAMENT_ID,
        });

        expect(second!._id.toString()).toBe(first!._id.toString());
        expect(second!.itemIds).toBe('7_2_9_5');
        expect(await model.countDocuments({})).toBe(1);
    });

    it('keeps verifications distinct per (walletAddress, tournamentId)', async () => {
        await repository.upsert(WALLET, TOURNAMENT_ID, '1_2');
        await repository.upsert(OTHER_WALLET, TOURNAMENT_ID, '3_4');
        await repository.upsert(WALLET, TOURNAMENT_ID + 1, '5_6');

        expect(await model.countDocuments({})).toBe(3);
        expect(
            await model.countDocuments({
                walletAddress: WALLET,
                tournamentId: TOURNAMENT_ID,
            }),
        ).toBe(1);
    });

    it('findOne returns the stored itemIds for a known (wallet, tournamentId)', async () => {
        await repository.upsert(WALLET, TOURNAMENT_ID, '0_3_1');

        expect(await repository.findOne(WALLET, TOURNAMENT_ID)).toEqual({
            itemIds: '0_3_1',
        });
    });

    it('findOne returns null when no verification exists', async () => {
        expect(await repository.findOne(WALLET, TOURNAMENT_ID)).toBeNull();
        expect(
            await repository.findOne(OTHER_WALLET, TOURNAMENT_ID),
        ).toBeNull();
    });

    it('stays a single document under many repeated upserts (load)', async () => {
        for (let i = 0; i < 50; i++) {
            await repository.upsert(WALLET, TOURNAMENT_ID, `round_${i}`);
        }

        expect(await model.countDocuments({})).toBe(1);
        const doc = await model.findOne({
            walletAddress: WALLET,
            tournamentId: TOURNAMENT_ID,
        });
        expect(doc!.itemIds).toBe('round_49');
    });
});

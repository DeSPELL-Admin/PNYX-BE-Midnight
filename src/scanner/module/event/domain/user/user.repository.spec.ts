import { ClientSession, Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import {
    User,
    UserDocument,
    UserSchema,
} from 'src/schema/domain/event/user.schema';
import { UserRepository } from './user.repository';

const WALLET = '0x' + 'ab'.repeat(20);

describe('Scanner UserRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<UserDocument>;
    let repo: UserRepository;
    let session: ClientSession;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_scanner_user' });
        connection = mem.connection;
        model = registerModel<UserDocument>(connection, User.name, UserSchema);
        await model.syncIndexes();
        repo = new UserRepository(model);
        session = await connection.startSession();
    }, 60000);

    afterAll(async () => {
        await session.endSession();
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    const point = async (walletAddress: string): Promise<number | null> => {
        const doc = (await model
            .findOne({ walletAddress: walletAddress.toLowerCase() })
            .lean()) as { point: number } | null;
        return doc ? doc.point : null;
    };

    it('does not create the user when it does not exist ($inc without upsert)', async () => {
        const result = await repo.incrementPoint(WALLET, 16, session);
        expect(result.matchedCount).toBe(0);
        expect(await model.countDocuments({})).toBe(0);
    });

    it('increments an existing user by a positive delta', async () => {
        await model.create({ walletAddress: WALLET, point: 0 });
        await repo.incrementPoint(WALLET, 16, session);
        expect(await point(WALLET)).toBe(16);
    });

    it('decrements an existing user by a negative delta (rollback)', async () => {
        await model.create({ walletAddress: WALLET, point: 64 });
        await repo.incrementPoint(WALLET, -16, session);
        expect(await point(WALLET)).toBe(48);
    });

    it('accumulates across repeated increments', async () => {
        await model.create({ walletAddress: WALLET, point: 0 });
        await repo.incrementPoint(WALLET, 16, session);
        await repo.incrementPoint(WALLET, 32, session);
        await repo.incrementPoint(WALLET, 64, session);
        expect(await point(WALLET)).toBe(112);
    });

    it('matches the stored lowercase wallet when given a checksum-cased address', async () => {
        await model.create({ walletAddress: WALLET, point: 0 });
        const upperCased = '0x' + 'AB'.repeat(20);
        const result = await repo.incrementPoint(upperCased, 16, session);
        expect(result.matchedCount).toBe(1);
        expect(await point(WALLET)).toBe(16);
    });
});

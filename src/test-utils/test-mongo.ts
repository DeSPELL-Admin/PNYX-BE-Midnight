import 'dotenv/config';
import mongoose, { Connection } from 'mongoose';

const DEFAULT_TEST_DB_NAME = 'pnyx_session_test';

// EventLogService / ReorgEventLogService read these at construction time via getEnv().
// Provide defaults so tests do not depend on them being present in .env.
process.env.CHUNK_SIZE = process.env.CHUNK_SIZE ?? '100';
process.env.CONCURRENCY_LIMIT = process.env.CONCURRENCY_LIMIT ?? '10';

export type TestMongo = {
    connection: Connection;
    stop: () => Promise<void>;
};

/**
 * Connects to the replica-set MongoDB configured in MONGODB_URI but forces a
 * dedicated database name so tests never touch development data. Transactions
 * require a replica set; if MONGODB_URI points at a standalone mongod the first
 * withTransaction call will throw and the relevant test will fail loudly.
 *
 * Pass a unique `dbName` per spec file so Jest's parallel workers never share a
 * database — `stop()` drops the whole database, so two specs sharing the default
 * name would wipe each other's collections mid-run.
 */
export async function startTestMongo(opts?: {
    dbName?: string;
}): Promise<TestMongo> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error(
            'MONGODB_URI is required (replica-set URI) to run session tests',
        );
    }

    const dbName = opts?.dbName ?? DEFAULT_TEST_DB_NAME;

    const connection = await mongoose
        .createConnection(uri, { dbName })
        .asPromise();

    const stop = async (): Promise<void> => {
        await connection.dropDatabase();
        await connection.close();
    };

    return { connection, stop };
}

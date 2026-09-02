import { createMongooseOptions } from './mongoose.config';
import { snapshotEnv } from '../test-utils/env';

const env = snapshotEnv(['MONGODB_URI']);

describe('createMongooseOptions', () => {
    beforeAll(env.save);
    afterAll(env.restore);

    it('builds the connection options from MONGODB_URI', () => {
        process.env.MONGODB_URI = 'mongodb://test-host:27017/x';
        expect(createMongooseOptions()).toEqual({
            uri: 'mongodb://test-host:27017/x',
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
    });

    it('throws when MONGODB_URI is missing', () => {
        delete process.env.MONGODB_URI;
        expect(() => createMongooseOptions()).toThrow(
            'Missing env: MONGODB_URI',
        );
    });
});

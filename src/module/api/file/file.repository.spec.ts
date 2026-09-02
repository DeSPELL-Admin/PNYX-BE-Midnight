import { Connection, Model } from 'mongoose';
import { startTestMongo, TestMongo } from 'src/test-utils/test-mongo';
import { registerModel } from 'src/test-utils/register-model';
import { File, FileDocument, FileSchema } from 'src/schema/domain/file.schema';
import { FileRepository } from './file.repository';

const fileDoc = (over: Record<string, unknown> = {}) => ({
    originalName: 'orig.json',
    uploadedName: 'u-1.json',
    bucketPath: 'json',
    fileSize: 10,
    mimeType: 'application/json',
    ...over,
});

describe('FileRepository (integration, real replica-set Mongo)', () => {
    let mem: TestMongo;
    let connection: Connection;
    let model: Model<FileDocument>;
    let repo: FileRepository;

    beforeAll(async () => {
        mem = await startTestMongo({ dbName: 'pnyx_test_file' });
        connection = mem.connection;
        // The repository injects the model via the global `File` token; here the
        // model is passed directly, so registering under File.name ('File') matches.
        model = registerModel<FileDocument>(connection, File.name, FileSchema);
        await model.syncIndexes();
        repo = new FileRepository(model);
    }, 60000);

    afterAll(async () => {
        await mem.stop();
    });

    beforeEach(async () => {
        await model.deleteMany({});
    });

    it('returns the projected fields for an exact match', async () => {
        await model.create(fileDoc());
        expect(await repo.findFileByOriginalName('orig.json')).toEqual({
            uploadedName: 'u-1.json',
            bucketPath: 'json',
            mimeType: 'application/json',
        });
    });

    it('returns null for an unknown name', async () => {
        expect(await repo.findFileByOriginalName('nope')).toBeNull();
    });

    it('is case-sensitive', async () => {
        await model.create(fileDoc({ originalName: 'Logo.PNG' }));
        expect(await repo.findFileByOriginalName('logo.png')).toBeNull();
    });

    it('returns a single row when multiple share an originalName', async () => {
        await model.create([
            fileDoc({ originalName: 'dup', uploadedName: 'u-a' }),
            fileDoc({ originalName: 'dup', uploadedName: 'u-b' }),
        ]);
        const result = await repo.findFileByOriginalName('dup');
        expect(['u-a', 'u-b']).toContain(result?.uploadedName);
    });

    it('finds a record in a large data set', async () => {
        const docs = Array.from({ length: 2000 }, (_, i) =>
            fileDoc({
                originalName: `file-${i}`,
                uploadedName: `up-${i}`,
            }),
        );
        await model.insertMany(docs);
        expect(
            (await repo.findFileByOriginalName('file-1234'))?.uploadedName,
        ).toBe('up-1234');
    }, 30000);
});

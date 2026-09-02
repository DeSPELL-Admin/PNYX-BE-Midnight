import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { FileService } from './file.service';
import { FileRepository } from './file.repository';
import { snapshotEnv } from '../../../test-utils/env';

jest.mock('@google-cloud/storage', () => {
    const file = { exists: jest.fn(), download: jest.fn() };
    const bucket = { file: jest.fn(() => file) };
    const storageInstance = { bucket: jest.fn(() => bucket) };
    return {
        Storage: jest.fn(() => storageInstance),
        __mock: { file, bucket, storageInstance },
    };
});

const mock = jest.requireMock('@google-cloud/storage').__mock;

const env = snapshotEnv(['FILE_SERVER_API_KEY', 'BUCKET_NAME']);

const fileDoc = (over: Record<string, unknown> = {}) => ({
    uploadedName: 'u.json',
    bucketPath: 'meta',
    mimeType: 'application/json',
    ...over,
});

describe('FileService', () => {
    let repo: jest.Mocked<FileRepository>;
    let service: FileService;

    beforeAll(env.save);
    afterAll(env.restore);

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FILE_SERVER_API_KEY = 'test-key.json';
        process.env.BUCKET_NAME = 'test-bucket';
        repo = {
            findFileByOriginalName: jest.fn(),
        } as unknown as jest.Mocked<FileRepository>;
        service = new FileService(repo);
    });

    it('initializes the GCS bucket from env', () => {
        expect(Storage).toHaveBeenCalledWith({ keyFilename: 'test-key.json' });
        expect(mock.storageInstance.bucket).toHaveBeenCalledWith('test-bucket');
    });

    describe('downloadJsonByOriginalName', () => {
        it('throws NotFoundException when the record is missing', async () => {
            repo.findFileByOriginalName.mockResolvedValue(null);
            await expect(
                service.downloadJsonByOriginalName('x'),
            ).rejects.toThrow(new NotFoundException('JSON file not found'));
            expect(mock.bucket.file).not.toHaveBeenCalled();
        });

        it('rejects a non-JSON mime type', async () => {
            repo.findFileByOriginalName.mockResolvedValue(
                fileDoc({ mimeType: 'text/plain' }) as never,
            );
            await expect(
                service.downloadJsonByOriginalName('x'),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.downloadJsonByOriginalName('x'),
            ).rejects.toThrow('text/plain');
        });

        it('builds the path with bucketPath when present', async () => {
            repo.findFileByOriginalName.mockResolvedValue(fileDoc() as never);
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([Buffer.from('{"a":1}')]);
            await service.downloadJsonByOriginalName('x');
            expect(mock.bucket.file).toHaveBeenCalledWith('meta/u.json');
        });

        it('omits the prefix when bucketPath is empty', async () => {
            repo.findFileByOriginalName.mockResolvedValue(
                fileDoc({ bucketPath: '' }) as never,
            );
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([Buffer.from('{"a":1}')]);
            await service.downloadJsonByOriginalName('x');
            expect(mock.bucket.file).toHaveBeenCalledWith('u.json');
        });

        it('throws NotFoundException with the path when the GCS object is missing', async () => {
            repo.findFileByOriginalName.mockResolvedValue(fileDoc() as never);
            mock.file.exists.mockResolvedValue([false]);
            await expect(
                service.downloadJsonByOriginalName('x'),
            ).rejects.toThrow('File not found in GCS: meta/u.json');
        });

        it('parses and returns the JSON content', async () => {
            repo.findFileByOriginalName.mockResolvedValue(fileDoc() as never);
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([
                Buffer.from('{"a":1,"b":[2,3]}'),
            ]);
            expect(await service.downloadJsonByOriginalName('x')).toEqual({
                a: 1,
                b: [2, 3],
            });
        });

        it('decodes UTF-8 content', async () => {
            repo.findFileByOriginalName.mockResolvedValue(fileDoc() as never);
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([
                Buffer.from('{"name":"안녕"}', 'utf8'),
            ]);
            expect(await service.downloadJsonByOriginalName('x')).toEqual({
                name: '안녕',
            });
        });

        it('propagates a JSON parse error', async () => {
            repo.findFileByOriginalName.mockResolvedValue(fileDoc() as never);
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([Buffer.from('not-json')]);
            await expect(
                service.downloadJsonByOriginalName('x'),
            ).rejects.toThrow(SyntaxError);
        });
    });

    describe('downloadImageByOriginalName', () => {
        const imgDoc = (over: Record<string, unknown> = {}) =>
            fileDoc({
                uploadedName: 'pic.png',
                bucketPath: 'img',
                mimeType: 'image/png',
                ...over,
            });

        it('throws NotFoundException when the record is missing', async () => {
            repo.findFileByOriginalName.mockResolvedValue(null);
            await expect(
                service.downloadImageByOriginalName('x'),
            ).rejects.toThrow(new NotFoundException('Image file not found'));
        });

        it('rejects a non-image mime type', async () => {
            repo.findFileByOriginalName.mockResolvedValue(
                imgDoc({ mimeType: 'application/json' }) as never,
            );
            await expect(
                service.downloadImageByOriginalName('x'),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects an undefined mime type', async () => {
            repo.findFileByOriginalName.mockResolvedValue(
                imgDoc({ mimeType: undefined }) as never,
            );
            await expect(
                service.downloadImageByOriginalName('x'),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when the GCS object is missing', async () => {
            repo.findFileByOriginalName.mockResolvedValue(imgDoc() as never);
            mock.file.exists.mockResolvedValue([false]);
            await expect(
                service.downloadImageByOriginalName('x'),
            ).rejects.toThrow('File not found in GCS: img/pic.png');
        });

        it('returns the buffer, mime type and original file name', async () => {
            const buffer = Buffer.from([1, 2, 3]);
            repo.findFileByOriginalName.mockResolvedValue(imgDoc() as never);
            mock.file.exists.mockResolvedValue([true]);
            mock.file.download.mockResolvedValue([buffer]);
            const result =
                await service.downloadImageByOriginalName('orig.png');
            expect(result.buffer).toBe(buffer);
            expect(result.mimeType).toBe('image/png');
            expect(result.fileName).toBe('orig.png');
        });
    });
});

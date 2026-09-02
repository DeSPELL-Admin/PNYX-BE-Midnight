import { Bucket, Storage } from '@google-cloud/storage';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { FileRepository } from './file.repository';
import { getEnv } from '../../../util/env.util';
import { DownloadJsonByOriginalNameResDto } from './dto/res/download-json-by-original-name.res.dto';
import { DownloadImageByOriginalNameResDto } from './dto/res/download-image-by-original-name.res.dto';

@Injectable()
export class FileService {
    private bucket: Bucket;

    constructor(private readonly fileRepository: FileRepository) {
        const FILE_SERVER_API_KEY = getEnv('FILE_SERVER_API_KEY');
        const BUCKET_NAME = getEnv('BUCKET_NAME');

        const storage = new Storage({ keyFilename: FILE_SERVER_API_KEY });
        this.bucket = storage.bucket(BUCKET_NAME);
    }

    async downloadJsonByOriginalName(
        originalName: string,
    ): Promise<DownloadJsonByOriginalNameResDto> {
        const jsonFile =
            await this.fileRepository.findFileByOriginalName(originalName);
        if (!jsonFile) {
            throw new NotFoundException('JSON file not found');
        }

        if (jsonFile.mimeType !== 'application/json') {
            throw new BadRequestException(
                `File is not a JSON file. MIME type: ${jsonFile.mimeType}`,
            );
        }

        const filePath = jsonFile.bucketPath
            ? `${jsonFile.bucketPath}/${jsonFile.uploadedName}`
            : jsonFile.uploadedName;
        const file = this.bucket.file(filePath);

        // 파일 존재 여부 확인
        const [exists] = await file.exists();
        if (!exists) {
            throw new NotFoundException(`File not found in GCS: ${filePath}`);
        }

        // 파일 내용 다운로드
        const [fileContent] = await file.download();
        const jsonString = fileContent.toString('utf8');

        // JSON 파싱 (파싱 에러는 전역 핸들러로 전달)
        const jsonData = JSON.parse(
            jsonString,
        ) as DownloadJsonByOriginalNameResDto;

        return jsonData;
    }

    async downloadImageByOriginalName(
        originalName: string,
    ): Promise<DownloadImageByOriginalNameResDto> {
        const imageFile =
            await this.fileRepository.findFileByOriginalName(originalName);
        if (!imageFile) {
            throw new NotFoundException('Image file not found');
        }

        if (!imageFile.mimeType || !imageFile.mimeType.startsWith('image/')) {
            throw new BadRequestException(
                `File is not an image file. MIME type: ${imageFile.mimeType}`,
            );
        }

        const filePath = imageFile.bucketPath
            ? `${imageFile.bucketPath}/${imageFile.uploadedName}`
            : imageFile.uploadedName;
        const file = this.bucket.file(filePath);

        // 파일 존재 여부 확인
        const [exists] = await file.exists();
        if (!exists) {
            throw new NotFoundException(`File not found in GCS: ${filePath}`);
        }

        const [fileContent] = await file.download();

        return {
            buffer: fileContent,
            mimeType: imageFile.mimeType,
            fileName: originalName,
        };
    }
}

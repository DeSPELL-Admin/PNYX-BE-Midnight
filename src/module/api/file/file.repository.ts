import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileDocument } from 'src/schema/domain/file.schema';
import { FindFileByOriginalNameQueryResult } from './query-result/find-file-by-original-name.query-result';

@Injectable()
export class FileRepository {
    constructor(
        @InjectModel(File.name)
        private readonly fileModel: Model<FileDocument>,
    ) {}

    async findFileByOriginalName(
        originalName: string,
    ): Promise<FindFileByOriginalNameQueryResult | null> {
        return await this.fileModel
            .findOne({ originalName })
            .select('uploadedName bucketPath mimeType -_id')
            .lean()
            .exec();
    }
}

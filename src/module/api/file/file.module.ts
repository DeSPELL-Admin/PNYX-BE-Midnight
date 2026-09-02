import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileRepository } from './file.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema } from 'src/schema/domain/file.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
    ],
    controllers: [FileController],
    providers: [FileService, FileRepository],
})
export class FileModule {}

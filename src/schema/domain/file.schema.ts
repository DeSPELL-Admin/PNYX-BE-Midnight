import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

@Schema({ timestamps: true })
export class File {
    @Prop({ type: String, required: true, index: true })
    originalName: string;

    @Prop({ type: String, required: true, unique: true })
    uploadedName: string;

    @Prop({ type: String, required: true })
    bucketPath: string;

    @Prop({ type: Date, default: Date.now })
    uploadTimestamp: Date;

    @Prop({ type: Number, required: true })
    fileSize: number;

    @Prop({ type: String, required: true })
    mimeType: string;
}

export const FileSchema = SchemaFactory.createForClass(File);

import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DownloadImageByOriginalNameResDto {
    @Expose()
    readonly buffer!: Buffer;

    @Expose()
    readonly mimeType!: string;

    @Expose()
    readonly fileName!: string;
}

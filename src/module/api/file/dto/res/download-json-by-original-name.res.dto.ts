import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class DownloadJsonByOriginalNameResDto<T = unknown> {
    @ApiProperty({
        description: 'JSON 데이터',
        example: { key: 'value' },
        type: Object,
    })
    @Expose()
    readonly data!: T;
}

import { ApiProperty } from '@nestjs/swagger';

export class SwaggerMetadata {
    @ApiProperty({
        description: '메타데이터',
        type: String,
        example: '2025-01-01T00:00:00.000Z',
    })
    readonly timestamp!: string;
}

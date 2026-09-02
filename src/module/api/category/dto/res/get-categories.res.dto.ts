import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GetCategoriesResDto {
    @ApiProperty({
        description: '카테고리 목록',
        example: 'Animation',
        type: String,
    })
    @Expose()
    readonly category!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class FinalizeConfirmResDto {
    @ApiProperty({ example: true }) @Expose() readonly confirmed!: boolean;
    @ApiProperty({ example: 8 }) @Expose() readonly point!: number;
}

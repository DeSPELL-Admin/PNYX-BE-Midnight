import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PayOrderBodyDto {
    @ApiProperty({ description: 'tNIGHT 결제 tx id (indexer identifier)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    readonly txId!: string;
}

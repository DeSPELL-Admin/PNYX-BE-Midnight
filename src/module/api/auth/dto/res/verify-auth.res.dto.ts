import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyAuthResDto {
    @ApiProperty({
        description: '인증된 지갑 주소 (소문자)',
        example: '0x000000000000000000000000000000000000beef',
    })
    @Expose()
    readonly walletAddress!: string;

    @ApiProperty({
        description: '사용자 보유 포인트',
        example: 0,
    })
    @Expose()
    readonly point!: number;
}

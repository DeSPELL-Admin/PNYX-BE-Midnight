import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class IssueNonceResDto {
    @ApiProperty({
        description: 'Midnight(Lace) 로그인 검증에 사용할 1회성 nonce',
        example: 'k9f3Lxv2Qp8Mz1Nc',
    })
    @Expose()
    readonly nonce!: string;

    @ApiProperty({
        description: '로그인 서명 메시지의 statement 값',
        example: 'Sign in to PNYX.',
        nullable: true,
    })
    @Expose()
    readonly statement!: string | null;

    @ApiProperty({
        description: 'nonce 만료 시간(ms)',
        example: 300000,
    })
    @Expose()
    readonly expiresInMs!: number;
}

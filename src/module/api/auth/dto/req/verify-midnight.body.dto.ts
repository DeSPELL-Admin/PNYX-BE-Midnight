import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Lace `signData(message, { encoding: 'text', keyType: 'unshielded' })` 결과 + 원문 */
export class VerifyMidnightBodyDto {
    @ApiProperty({ description: '로그인 메시지 원문 (FE buildMidnightAuthMessage)', example: 'pnyx.fun wants you to sign in with your Midnight account:\nmn_addr_preprod1…' })
    @IsString() @IsNotEmpty() @MaxLength(2000)
    message!: string;

    @ApiProperty({ description: 'Lace Signature.data — 지갑이 서명한 페이로드 (text | hex | base64, 지갑 구현에 따라 다름)', example: 'pnyx.fun wants you to sign in…' })
    @IsString() @IsNotEmpty() @MaxLength(8000)
    signedData!: string;

    @ApiProperty({ description: '서명 (Lace Signature.signature)', example: 'abcd…' })
    @IsString() @IsNotEmpty() @MaxLength(4096)
    signature!: string;

    @ApiProperty({ description: 'unshielded verifying key (Lace Signature.verifyingKey)', example: 'abcd…' })
    @IsString() @IsNotEmpty() @MaxLength(4096)
    verifyingKey!: string;
}

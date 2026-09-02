import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Matches, Min } from 'class-validator';

export class TournamentFinalizeBodyDto {
    @ApiProperty({
        description: '토너먼트 ID',
        example: 7,
        type: Number,
        minimum: 0,
    })
    @IsInt()
    @Min(0)
    readonly tournamentId!: number;

    @ApiProperty({
        description:
            '토너먼트 데이터 (0x-prefixed, big-endian uint16 아이템 ID 바이트열)',
        example: '0x000300010002',
    })
    @IsNotEmpty()
    @Matches(/^0x([0-9a-fA-F]{2})+$/, {
        message: 'tournamentData must be a 0x-prefixed even-length hex string',
    })
    readonly tournamentData!: string;

    @ApiProperty({
        description:
            'userPublicKey(userSecret) — 64 hex. eligibility leaf 에 바인딩된다. secret 자체는 절대 보내지 않는다.',
        example: '6cb8ab57dea335cbcff5179f973eda5bf470201db75d643433e568c3cdf46c99',
        required: true,
    })
    @IsNotEmpty()
    @Matches(/^[0-9a-fA-F]{64}$/, { message: 'userPk must be 64 hex chars' })
    readonly userPk!: string;
}

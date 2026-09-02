import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class FinalizeTournamentResDto {
    @ApiProperty({
        description:
            '유효한 기존 grant가 재사용되었는지 여부',
        example: false,
    })
    @Expose()
    readonly exists!: boolean;

    @ApiProperty({
        description: '(Midnight) grantEligibility 트랜잭션 id',
        example: '0023b62f…',
        required: false,
        nullable: true,
    })
    @Expose()
    readonly txId?: string | null;

    @ApiProperty({
        description: '(Midnight) 서버 권장 세그먼트 태그 (없으면 null → FE 는 "all")',
        example: null,
        required: false,
        nullable: true,
    })
    @Expose()
    readonly segment?: string | null;

    @ApiProperty({
        description: 'grant 만료 시각 Unix timestamp(초) 문자열',
        example: '1760000000',
    })
    @Expose()
    readonly deadline!: string;

    @ApiProperty({
        description: '획득 포인트 (이미 finalize 기록이 있으면 0)',
        example: 8,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly point!: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { BettingType, TournamentGenre } from 'src/module/common/util/enum.util';

@Exclude()
export class FindTournamentsByCategoryResDto {
    @ApiProperty({
        description: '토너먼트 ID',
        example: 12,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly tournamentId!: number;

    @ApiProperty({
        description: '제목',
        example: 'Who is your favorite character?',
        type: String,
    })
    @Expose()
    readonly title!: string;

    @ApiProperty({
        description: '토너먼트 선택 횟수',
        example: 101,
        type: Number,
    })
    @Expose()
    @Type(() => Number)
    readonly selectedCount!: number;

    @ApiProperty({
        description: '해당 토너먼트 우승 최다 아이템 이미지 이름',
        example: 'Gozo-1',
        type: String,
    })
    @Expose()
    readonly firstItemImageName!: string;

    @ApiProperty({
        description: '해당 토너먼트 우승 두번째 아이템 이미지 이름',
        example: 'Skuna-1',
        type: String,
    })
    @Expose()
    readonly secondItemImageName!: string;

    @ApiProperty({
        description: '토너먼트 장르',
        enum: TournamentGenre,
        example: TournamentGenre.TOURNAMENT,
    })
    @Expose()
    readonly genre!: TournamentGenre;

    @ApiPropertyOptional({
        description: '토너먼트 시작 시간',
        example: '2026-01-01T00:00:00.000Z',
        type: String,
        nullable: true,
    })
    @Expose()
    @Type(() => Date)
    readonly startedAt!: Date | null;

    @ApiPropertyOptional({
        description: '토너먼트 종료 시간',
        example: '2026-01-08T00:00:00.000Z',
        type: String,
        nullable: true,
    })
    @Expose()
    @Type(() => Date)
    readonly endedAt!: Date | null;

    @ApiPropertyOptional({
        description: '이벤트 토너먼트 지급 포인트',
        example: 1000,
        type: Number,
        nullable: true,
    })
    @Expose()
    @Type(() => Number)
    readonly point?: number;

    @ApiPropertyOptional({
        description: '베팅 총 상금 풀 (bigint-safe 문자열)',
        example: '1000000000000000000',
        type: String,
        nullable: true,
    })
    @Expose()
    readonly totalPrize?: string;

    @ApiPropertyOptional({
        description: '최소 베팅 금액 (bigint-safe 문자열)',
        example: '1000000000000000',
        type: String,
        nullable: true,
    })
    @Expose()
    readonly minBetAmount?: string;

    @ApiPropertyOptional({
        description: '베팅 화폐 종류',
        enum: BettingType,
        example: BettingType.POINT,
        nullable: true,
    })
    @Expose()
    readonly bettingType?: BettingType;

    @ApiPropertyOptional({
        description: '베팅 우승 아이템 ID',
        example: 12,
        type: Number,
        nullable: true,
    })
    @Expose()
    @Type(() => Number)
    readonly winItemId?: number | null;
}

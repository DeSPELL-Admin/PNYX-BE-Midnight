import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class MarketProductResDto {
    @ApiProperty({ example: 0 }) @Expose() readonly tournamentId!: number;
    @ApiProperty({ example: 'Anime Series World Cup' })
    @Expose()
    readonly title!: string;
    @ApiProperty({ example: 'classic' }) @Expose() readonly category!: string;
    @ApiProperty({ nullable: true }) @Expose() readonly firstItemImageName!:
        | string
        | null;
    @ApiProperty({ description: '온체인 sampleCount (누적 finalize 수)' })
    @Expose()
    readonly sampleCount!: number;
    @ApiProperty({ description: 'escrow 로 판매 가능한 로우 수' })
    @Expose()
    readonly escrowRowCount!: number;
    @ApiProperty({ description: 'min(escrowRowCount, 8) — 1회 판매 배치 상한' })
    @Expose()
    readonly sellableRowCount!: number;
    @ApiProperty({
        description: '로우당 가격 (tNIGHT 원자단위, bigint 문자열)',
    })
    @Expose()
    readonly pricePerRowUnits!: string;
    @ApiProperty({ description: '총 가격 (tNIGHT 원자단위, bigint 문자열)' })
    @Expose()
    readonly priceUnits!: string;
    @ApiProperty() @Expose() readonly soldOut!: boolean;
}

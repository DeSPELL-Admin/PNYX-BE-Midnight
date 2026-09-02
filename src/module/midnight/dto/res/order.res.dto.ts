import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    MidnightOrderStage,
    MidnightOrderStatus,
} from 'src/module/common/util/enum.util';

export class OrderResDto {
    @ApiProperty() @Expose() readonly orderId!: string;
    @ApiProperty() @Expose() readonly tournamentId!: number;
    @ApiProperty({ enum: MidnightOrderStatus })
    @Expose()
    readonly status!: MidnightOrderStatus;
    @ApiProperty({ enum: MidnightOrderStage })
    @Expose()
    readonly stage!: MidnightOrderStage;
    @ApiProperty({ description: 'sha256(walletAddress) 64hex' })
    @Expose()
    readonly buyerPk!: string;
    @ApiProperty() @Expose() readonly rowCount!: number;
    @ApiProperty() @Expose() readonly sampleCountAtOrder!: number;
    @ApiProperty({ description: '총 가격 (원자단위 문자열)' })
    @Expose()
    readonly priceUnits!: string;
    @ApiProperty({ description: '로우당 가격 (원자단위 문자열)' })
    @Expose()
    readonly pricePerRowUnits!: string;
    @ApiProperty({ description: '결제 수신 오퍼레이터 주소 (bech32m)' })
    @Expose()
    readonly payTo!: string;
    @ApiProperty({
        description: 'Lace DesiredOutput.type 에 그대로 쓰는 raw token type',
    })
    @Expose()
    readonly tokenTypeRaw!: string;
    @ApiProperty({ required: false }) @Expose() readonly paymentTxId?: string;
    @ApiProperty({ required: false })
    @Expose()
    readonly registerBuyerTxId?: string;
    @ApiProperty({ required: false }) @Expose() readonly sellTxId?: string;
    @ApiProperty({
        description:
            '정규 QuerySpec JSON 원문 — 구매자가 재해시해 licenseId 를 독립 계산',
    })
    @Expose()
    readonly querySpec!: string;
    @ApiProperty() @Expose() readonly specHash!: string;
    @ApiProperty({ required: false }) @Expose() readonly licenseId?: string;
    @ApiProperty({ required: false }) @Expose() readonly datasetHash?: string;
    @ApiProperty({ required: false })
    @Expose()
    readonly deliveredRowCount?: number;
    @ApiProperty({ required: false }) @Expose() readonly sampleAtSale?: number;
    @ApiProperty({ required: false }) @Expose() readonly error?: string;
    @ApiProperty() @Expose() readonly updatedAt!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class OrderCatalogItemResDto {
    @ApiProperty({ example: 3 }) @Expose() readonly itemId!: number;
    @ApiProperty({ example: 'Berserk' }) @Expose() readonly name!: string;
    @ApiProperty({ example: 'Berserk-0' })
    @Expose()
    readonly imageName!: string;
}

/**
 * 주문의 토너먼트 아이템 카탈로그 — 구매자가 데이터셋의 itemId/bracket 을
 * 이름·이미지로 렌더링하기 위한 참조표. 주문 상태와 무관하게 조회된다.
 */
export class OrderCatalogResDto {
    @ApiProperty({ example: 0 }) @Expose() readonly tournamentId!: number;
    @ApiProperty({ example: 'Anime Series World Cup' })
    @Expose()
    readonly tournamentTitle!: string;
    @ApiProperty({ type: OrderCatalogItemResDto, isArray: true })
    @Expose()
    @Type(() => OrderCatalogItemResDto)
    readonly items!: OrderCatalogItemResDto[];
}

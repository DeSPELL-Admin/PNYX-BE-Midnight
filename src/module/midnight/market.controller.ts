import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerSingleResult } from 'src/module/common/swagger/single.swagger';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';
import { NoTransform } from 'src/module/common/decorator/no-transform.decorator';
import { Payload } from 'src/module/common/decorator/payload.decorator';
import { ByChainIdParamDto } from 'src/module/common/req-dto/by-chain-id.param.dto';
import { ChainService } from 'src/module/chain/chain.service';
import { MidnightMarketService } from './midnight-market.service';
import { CreateOrderBodyDto } from './dto/req/create-order.body.dto';
import { PayOrderBodyDto } from './dto/req/pay-order.body.dto';
import { OrderParamDto } from './dto/req/order.param.dto';
import { MarketProductResDto } from './dto/res/market-product.res.dto';
import { OrderResDto } from './dto/res/order.res.dto';

/** 데이터 마켓 — 구매자 주문/결제/다운로드. 판매(sellRows)는 BE 가 자동 fulfill (docs/market-dev-plan.md). */
@ApiTags('Midnight Market')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller('chains/:chainId/market')
export class MarketController {
    constructor(
        private readonly marketService: MidnightMarketService,
        private readonly chainService: ChainService,
    ) {}

    @Get('products')
    @ResponseDto(MarketProductResDto)
    @ApiStandardResponse({
        summary: '판매 가능한 토너먼트 데이터셋 목록',
        description:
            'escrow 로우가 있는 토너먼트별 온체인 표본 수·가격. 1회 판매 배치 상한은 8행.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(MarketProductResDto),
        successDescription: '상품 목록',
        includeUnauthorized: true,
        includeInternalServerError: true,
    })
    async products(
        @Param() param: ByChainIdParamDto,
        @Query('tournamentId') tournamentId?: number,
    ): Promise<MarketProductResDto[]> {
        this.chainService.validateChainId(param.chainId);
        return await this.marketService.getProducts(
            param.chainId,
            tournamentId !== undefined ? Number(tournamentId) : undefined,
        );
    }

    @Post('orders')
    @HttpCode(HttpStatus.CREATED)
    @ResponseDto(OrderResDto)
    @ApiStandardResponse({
        summary: '데이터셋 구매 주문 생성',
        description:
            '같은 (구매자, 토너먼트) 의 결제 전 주문은 재사용됩니다. 결제 정보(payTo, priceUnits, tokenTypeRaw)를 응답으로 받습니다.',
        successStatus: HttpStatus.CREATED,
        successType: createSwaggerSingleResult(OrderResDto),
        successDescription: '주문 생성됨',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeInternalServerError: true,
    })
    async createOrder(
        @Param() param: ByChainIdParamDto,
        @Payload('sub') walletAddress: string,
        @Body() body: CreateOrderBodyDto,
    ): Promise<OrderResDto> {
        this.chainService.validateChainId(param.chainId);
        return await this.marketService.createOrder(
            param.chainId,
            walletAddress.toLowerCase(),
            body.tournamentId,
        );
    }

    @Post('orders/:orderId/pay')
    @HttpCode(HttpStatus.OK)
    @ResponseDto(OrderResDto)
    @ApiStandardResponse({
        summary: '결제 트랜잭션 기록 → fulfill 시작',
        description:
            'Lace makeTransfer 로 payTo 에 priceUnits 만큼 전송한 txId 를 기록하면 BE 가 자동으로 registerBuyer → sellRows 를 진행합니다.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(OrderResDto),
        successDescription: 'PAID 로 전이됨',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeNotFound: true,
        includeInternalServerError: true,
    })
    async payOrder(
        @Param() param: OrderParamDto,
        @Payload('sub') walletAddress: string,
        @Body() body: PayOrderBodyDto,
    ): Promise<OrderResDto> {
        this.chainService.validateChainId(param.chainId);
        return await this.marketService.payOrder(
            param.chainId,
            walletAddress.toLowerCase(),
            param.orderId,
            body.txId,
        );
    }

    @Get('orders/:orderId')
    @ResponseDto(OrderResDto)
    @ApiStandardResponse({
        summary: '주문 상태 조회 (폴링)',
        description:
            'status/stage 로 fulfill 진행을 표시합니다. FULFILLED 면 dataset 다운로드 가능.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(OrderResDto),
        successDescription: '주문 상태',
        includeUnauthorized: true,
        includeNotFound: true,
        includeInternalServerError: true,
    })
    async getOrder(
        @Param() param: OrderParamDto,
        @Payload('sub') walletAddress: string,
    ): Promise<OrderResDto> {
        this.chainService.validateChainId(param.chainId);
        return await this.marketService.getOrder(
            param.chainId,
            walletAddress.toLowerCase(),
            param.orderId,
        );
    }

    @Get('orders/:orderId/dataset')
    @NoTransform()
    @ApiStandardResponse({
        summary: '구매한 데이터셋 다운로드',
        description:
            'sha256(응답 바이트) == 온체인 License.datasetHash. 재직렬화 없이 원문 바이트를 반환합니다.',
        successStatus: HttpStatus.OK,
        successDescription: 'application/json attachment',
        includeUnauthorized: true,
        includeNotFound: true,
        includeInternalServerError: true,
    })
    async dataset(
        @Param() param: OrderParamDto,
        @Payload('sub') walletAddress: string,
        @Res() res: Response,
    ): Promise<void> {
        this.chainService.validateChainId(param.chainId);
        const { filename, json } = await this.marketService.getDatasetJson(
            param.chainId,
            walletAddress.toLowerCase(),
            param.orderId,
        );
        res.set({
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.send(Buffer.from(json, 'utf8'));
    }
}

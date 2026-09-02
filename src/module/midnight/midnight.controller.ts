import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerSingleResult } from 'src/module/common/swagger/single.swagger';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';
import { Payload } from 'src/module/common/decorator/payload.decorator';
import { ByChainIdParamDto } from 'src/module/common/req-dto/by-chain-id.param.dto';
import { ChainService } from 'src/module/chain/chain.service';
import { MidnightFinalizeService } from './midnight-finalize.service';
import { EscrowBodyDto } from './dto/req/escrow.body.dto';
import { FinalizeConfirmBodyDto } from './dto/req/finalize-confirm.body.dto';
import { FinalizeConfirmResDto } from './dto/res/finalize-confirm.res.dto';

@ApiTags('Midnight')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller('chains/:chainId')
export class MidnightController {
    constructor(
        private readonly finalizeService: MidnightFinalizeService,
        private readonly chainService: ChainService,
    ) {}

    @Post('midnight/finalize-confirm')
    @HttpCode(HttpStatus.OK)
    @ResponseDto(FinalizeConfirmResDto)
    @ApiStandardResponse({
        summary: 'Midnight finalizeTournament 트랜잭션 확인 및 도메인 반영',
        description: '인덱서로 tx 를 검증한 뒤 PlayInfo/포인트/통계를 갱신합니다 (legacy chain 스캐너의 TournamentFinalized 처리에 대응).',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(FinalizeConfirmResDto),
        successDescription: '확인 완료',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeNotFound: true,
        includeInternalServerError: true,
    })
    async finalizeConfirm(@Param() param: ByChainIdParamDto, @Payload('sub') walletAddress: string, @Body() body: FinalizeConfirmBodyDto): Promise<FinalizeConfirmResDto> {
        this.chainService.validateChainId(param.chainId);
        return await this.finalizeService.confirmFinalize(param.chainId, walletAddress.toLowerCase(), body.tournamentId, body.txId);
    }

    @Post('escrow')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiStandardResponse({
        summary: '데이터 마켓 escrow 위탁 (모든 투표)',
        description: '(tournamentId, itemId, segment, salt) 를 보관합니다. 온체인 커밋을 여는 열쇠이며 sellRows 회로의 witness 가 됩니다.',
        successStatus: HttpStatus.NO_CONTENT,
        successDescription: '저장 완료',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeNotFound: true,
        includeInternalServerError: true,
    })
    async escrow(@Param() param: ByChainIdParamDto, @Payload('sub') walletAddress: string, @Body() body: EscrowBodyDto): Promise<void> {
        this.chainService.validateChainId(param.chainId);
        await this.finalizeService.escrow(param.chainId, walletAddress.toLowerCase(), { ...body, salt: body.salt.toLowerCase() });
    }
}

import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SignatureService } from './signature.service';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerSingleResult } from 'src/module/common/swagger/single.swagger';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { AccessTokenGuard } from 'src/module/common/guard/access-token.guard';
import { Payload } from 'src/module/common/decorator/payload.decorator';
import { ByChainIdParamDto } from 'src/module/common/req-dto/by-chain-id.param.dto';
import { TournamentFinalizeBodyDto } from './dto/req/tournament-finalize.body.dto';
import { FinalizeTournamentResDto } from './dto/res/finalize-tournament.res.dto';
import { ChainService } from 'src/module/chain/chain.service';

@ApiTags('Signature')
@ApiCookieAuth('access_token')
@UseGuards(AccessTokenGuard)
@Controller('chains/:chainId/signatures')
export class SignatureController {
    constructor(
        private readonly signatureService: SignatureService,
        private readonly chainService: ChainService,
    ) {}

    @Post('tournament-finalize')
    @HttpCode(HttpStatus.OK)
    @ResponseDto(FinalizeTournamentResDto)
    @ApiStandardResponse({
        summary: 'Midnight 참가 자격 grant 발급',
        description: 'tournamentData를 검증한 뒤 Midnight finalize용 eligibility grant를 발급합니다.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(FinalizeTournamentResDto),
        successDescription: 'grant 발급 성공',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeInternalServerError: true,
    })
    async getTournamentFinalizeSignature(
        @Param() param: ByChainIdParamDto,
        @Payload('sub') walletAddress: string,
        @Body() body: TournamentFinalizeBodyDto,
    ): Promise<FinalizeTournamentResDto> {
        this.chainService.validateChainId(param.chainId);
        return this.signatureService.getTournamentFinalizeSignature(
            param.chainId,
            walletAddress.toLowerCase(),
            body.tournamentId,
            body.tournamentData,
            body.userPk.toLowerCase(),
        );
    }
}

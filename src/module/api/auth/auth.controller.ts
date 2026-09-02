import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Payload } from 'src/module/common/decorator/payload.decorator';
import { Token } from 'src/module/common/decorator/token.decorator';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { createSwaggerSingleResult } from 'src/module/common/swagger/single.swagger';
import { RefreshTokenGuard } from 'src/module/common/guard/refresh-token.guard';
import { AuthService } from './auth.service';
import { VerifyMidnightBodyDto } from './dto/req/verify-midnight.body.dto';
import { IssueNonceResDto } from './dto/res/issue-nonce.res.dto';
import { VerifyAuthResDto } from './dto/res/verify-auth.res.dto';
import type { RefreshTokenPayload } from './auth.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('nonce')
    @Header('Cache-Control', 'no-store')
    @ResponseDto(IssueNonceResDto)
    @ApiStandardResponse({
        summary: '로그인 nonce 발급',
        description:
            '로그인에 사용할 1회성 nonce와 statement, 만료 시간을 반환하고 nonce 쿠키를 설정합니다.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(IssueNonceResDto),
        successDescription: 'nonce 발급 성공',
        includeInternalServerError: true,
    })
    async issueNonce(
        @Res({ passthrough: true }) response: Response,
    ): Promise<IssueNonceResDto> {
        return await this.authService.issueNonce(response);
    }

    @Post('midnight/verify')
    @Header('Cache-Control', 'no-store')
    @HttpCode(HttpStatus.OK)
    @ResponseDto(VerifyAuthResDto)
    @ApiStandardResponse({
        summary: 'Midnight(Lace) 서명 검증 및 로그인',
        description:
            'FE 의 Midnight 로그인 메시지와 Lace signData 결과(signedData/signature/verifyingKey)를 검증하고 access/refresh 토큰을 HttpOnly 쿠키로 발급합니다. nonce 쿠키는 GET /auth/nonce 와 공유합니다.',
        successStatus: HttpStatus.OK,
        successType: createSwaggerSingleResult(VerifyAuthResDto),
        successDescription: 'Midnight 로그인 성공',
        includeBadRequest: true,
        includeUnauthorized: true,
        includeInternalServerError: true,
    })
    async verifyMidnight(
        @Body() body: VerifyMidnightBodyDto,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<VerifyAuthResDto> {
        return await this.authService.verifyMidnight(body, request, response);
    }

    @Post('refresh')
    @Header('Cache-Control', 'no-store')
    @HttpCode(HttpStatus.OK)
    @UseGuards(RefreshTokenGuard)
    @ApiCookieAuth('refresh_token')
    @ApiStandardResponse({
        summary: '토큰 재발급',
        description:
            'refresh token 쿠키를 검증하고 access/refresh 토큰을 재발급(회전)합니다.',
        successStatus: HttpStatus.OK,
        successDescription: '토큰 재발급 성공',
        includeUnauthorized: true,
        includeForbidden: true,
        includeInternalServerError: true,
    })
    async refresh(
        @Payload() payload: RefreshTokenPayload,
        @Token() refreshToken: string,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.authService.refresh(
            payload,
            refreshToken,
            request,
            response,
        );
    }

    @Post('logout')
    @Header('Cache-Control', 'no-store')
    @HttpCode(HttpStatus.OK)
    @UseGuards(RefreshTokenGuard)
    @ApiCookieAuth('refresh_token')
    @ApiStandardResponse({
        summary: '로그아웃',
        description:
            'refresh token 기준으로 세션을 종료하고 인증 쿠키를 제거합니다.',
        successStatus: HttpStatus.OK,
        successDescription: '로그아웃 성공',
        includeUnauthorized: true,
        includeForbidden: true,
        includeInternalServerError: true,
    })
    async logout(
        @Payload() payload: RefreshTokenPayload,
        @Token() refreshToken: string,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.authService.logout(payload, refreshToken, response);
    }
}

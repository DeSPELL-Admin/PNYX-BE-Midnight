import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { generateNonce } from 'siwe';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.type';
import { VerifyMidnightBodyDto } from './dto/req/verify-midnight.body.dto';
import { MidnightService } from 'src/module/midnight/midnight.service';
import { IssueNonceResDto } from './dto/res/issue-nonce.res.dto';
import { VerifyAuthResDto } from './dto/res/verify-auth.res.dto';
import { NonceService } from 'src/module/domain/nonce/nonce.service';
import { UserService } from 'src/module/api/user/user.service';
import { RefreshTokenService } from 'src/module/domain/refresh-token/refresh-token.service';
import {
    accessCookieOptions,
    clearAuthCookies,
    clearNonceCookie,
    getCookieNames,
    nonceCookieOptions,
    refreshCookieOptions,
} from 'src/module/common/util/cookie.util';
import { addDuration, durationToMs } from 'src/util/duration.util';
import {
    buildJwtSignOptions,
    resolveRequestAudience,
} from 'src/module/common/util/jwt.util';
import {
    extractClientIp,
    extractUserAgent,
} from 'src/module/common/util/request.util';
import { hash } from 'src/module/common/util/hash.util';
import { getEnv } from 'src/util/env.util';

@Injectable()
export class AuthService {
    private readonly SIWE_NONCE_TTL: string = getEnv('SIWE_NONCE_TTL');
    private readonly SIWE_DOMAINS: string[] = getEnv('SIWE_DOMAINS')
        .split('|')
        .map((s) => s.trim());
    private readonly SIWE_URIS: string[] = getEnv('SIWE_URIS')
        .split('|')
        .map((s) => s.trim());
    private readonly SIWE_STATEMENT: string = getEnv('SIWE_STATEMENT');
    private readonly ACCESS_TOKEN_EXPIRES_IN: string = getEnv(
        'ACCESS_TOKEN_EXPIRES_IN',
    );
    private readonly REFRESH_TOKEN_EXPIRES_IN: string = getEnv(
        'REFRESH_TOKEN_EXPIRES_IN',
    );

    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly nonceService: NonceService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly midnightService: MidnightService,
    ) {}

    async issueNonce(response: Response): Promise<IssueNonceResDto> {
        const { nonce, ttlMs } = await this.getNonceAndTtl();
        const names = getCookieNames();
        response.cookie(names.siweNonce, nonce, nonceCookieOptions());

        return {
            nonce,
            statement: this.SIWE_STATEMENT,
            expiresInMs: ttlMs,
        };
    }

    private async getNonceAndTtl(): Promise<{ nonce: string; ttlMs: number }> {
        const ttlMs = durationToMs(this.SIWE_NONCE_TTL);

        let nonce: string | null = null;

        for (let i = 0; i < 3; i += 1) {
            const candidate = generateNonce();
            const issued = await this.nonceService.issueNonce(candidate, ttlMs);

            if (issued) {
                nonce = candidate;
                break;
            }
        }

        if (!nonce) {
            throw new InternalServerErrorException(
                'Failed to issue SIWE nonce',
            );
        }

        return { nonce, ttlMs };
    }

    /**
     * Midnight(Lace) 로그인 — SIWE 와 같은 nonce 쿠키/도메인/URI 규칙, 서명 검증만 ledger-v8 로.
     * 메시지 포맷은 FE `buildMidnightAuthMessage` 와 1:1 (line-based).
     */
    async verifyMidnight(
        body: VerifyMidnightBodyDto,
        request: Request,
        response: Response,
    ): Promise<VerifyAuthResDto> {
        const names = getCookieNames();
        const cookieNonce = request.cookies?.[names.siweNonce] as string | undefined;
        if (!cookieNonce) throw new UnauthorizedException('nonce cookie missing');
        if (!(await this.nonceService.hasActiveNonce(cookieNonce))) {
            clearNonceCookie(response);
            throw new UnauthorizedException('nonce expired or invalid');
        }

        const parsed = this.parseMidnightAuthMessage(body.message);
        const requestAudience = resolveRequestAudience(request);
        const originHost = requestAudience ? new URL(requestAudience).host : undefined;
        if (originHost !== parsed.domain) throw new UnauthorizedException('Request Origin does not match signed domain');
        if (!this.SIWE_DOMAINS.includes(parsed.domain)) throw new UnauthorizedException('domain mismatch');
        const matchedUri = this.SIWE_URIS.find((uri) => this.sameUrl(parsed.uri, uri));
        if (!matchedUri) throw new UnauthorizedException('URI mismatch');
        if (parsed.statement !== this.SIWE_STATEMENT) throw new UnauthorizedException('statement mismatch');
        if (parsed.nonce !== cookieNonce) throw new UnauthorizedException('nonce mismatch');
        if (!this.midnightService.isMidnightChain(parsed.chainId)) throw new UnauthorizedException('unsupported chainId');
        const ageMs = Date.now() - Date.parse(parsed.issuedAt);
        if (!Number.isFinite(ageMs) || ageMs < -60_000 || ageMs > 10 * 60_000) throw new UnauthorizedException('message expired');

        const ok = await this.midnightService.verifyAuthSignature({
            message: body.message,
            signedData: body.signedData,
            signature: body.signature,
            verifyingKey: body.verifyingKey,
            expectedAddress: parsed.address,
        });
        if (!ok) throw new UnauthorizedException('Midnight signature verification failed');

        if (!(await this.nonceService.consumeNonce(cookieNonce))) {
            throw new UnauthorizedException('nonce already used or expired');
        }
        clearNonceCookie(response);

        const walletAddress = parsed.address.toLowerCase();
        const point = await this.userService.getOrCreate(walletAddress);
        await this.startAuthToken(walletAddress, request, response, parsed.uri);
        return { walletAddress, point };
    }

    private parseMidnightAuthMessage(message: string): {
        domain: string;
        address: string;
        statement: string | null;
        uri: string;
        chainId: number;
        nonce: string;
        issuedAt: string;
    } {
        const lines = message.split('\n');
        const header = /^(.+) wants you to sign in with your Midnight account:$/.exec(lines[0] ?? '');
        const address = lines[1]?.trim();
        if (!header || !address || !/^mn_addr_/.test(address)) throw new BadRequestException('Malformed Midnight auth message');
        const field = (name: string): string | undefined => {
            const l = lines.find((x) => x.startsWith(`${name}: `));
            return l ? l.slice(name.length + 2).trim() : undefined;
        };
        const uri = field('URI');
        const version = field('Version');
        const chainId = Number(field('Chain ID'));
        const nonce = field('Nonce');
        const issuedAt = field('Issued At');
        if (!uri || version !== '1' || !Number.isInteger(chainId) || !nonce || !issuedAt) {
            throw new BadRequestException('Malformed Midnight auth message');
        }
        // statement = 주소 다음 빈 줄 뒤, "URI:" 앞까지의 비어있지 않은 줄 (SIWE 와 동일 위치)
        const uriIdx = lines.findIndex((x) => x.startsWith('URI: '));
        const statementLines = lines.slice(2, uriIdx).filter((x) => x.trim() !== '');
        const statement = statementLines.length ? statementLines.join('\n') : null;
        return { domain: header[1], address, statement, uri, chainId, nonce, issuedAt };
    }

    private sameUrl(left: string, right: string): boolean {
        try {
            return new URL(left).toString() === new URL(right).toString();
        } catch {
            return left === right;
        }
    }

    private async startAuthToken(
        walletAddress: string,
        request: Request,
        response: Response,
        clientAudience: string,
    ): Promise<void> {
        const { accessToken, refreshToken } = await this.issueTokens(
            walletAddress,
            clientAudience,
        );

        await this.refreshTokenService.create({
            walletAddress,
            tokenHash: hash(refreshToken).toLowerCase(),
            expiresAt: addDuration(this.REFRESH_TOKEN_EXPIRES_IN),
            ...this.buildTokenClientMeta(request),
        });

        this.setAuthCookies(response, accessToken, refreshToken);
    }

    async refresh(
        payload: RefreshTokenPayload,
        refreshToken: string,
        request: Request,
        response: Response,
    ): Promise<void> {
        const currentTokenHash = hash(refreshToken).toLowerCase();
        await this.validateRefreshTokenPayload(
            payload,
            currentTokenHash,
            response,
        );
        await this.validateRefreshToken(
            payload.sub,
            currentTokenHash,
            response,
        );
        const originHost = this.validateOrigin(request);

        const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } =
            await this.issueTokens(payload.sub, originHost);

        await this.rotateRefreshToken(
            payload,
            currentTokenHash,
            hash(nextRefreshToken).toLowerCase(),
            request,
            response,
        );

        this.setAuthCookies(response, nextAccessToken, nextRefreshToken);
    }

    private async validateRefreshTokenPayload(
        payload: RefreshTokenPayload,
        tokenHash: string,
        response: Response,
    ): Promise<void> {
        if (payload.tokenType !== 'refresh') {
            await this.refreshTokenService.revokeByWalletAddressAndToken(
                payload.sub,
                tokenHash,
            );

            clearAuthCookies(response);
            throw new UnauthorizedException('Invalid refresh token type');
        }
    }

    private async validateRefreshToken(
        walletAddress: string,
        tokenHash: string,
        response: Response,
    ): Promise<void> {
        const token = await this.refreshTokenService.getByWalletAddressAndToken(
            walletAddress,
            tokenHash,
        );

        if (!token) {
            clearAuthCookies(response);
            throw new UnauthorizedException('Refresh token not found');
        }

        if (token.expiresAt < new Date()) {
            await this.refreshTokenService.revokeByWalletAddressAndToken(
                walletAddress,
                tokenHash,
            );

            clearAuthCookies(response);
            throw new UnauthorizedException('Refresh token expired');
        }
    }

    private validateOrigin(request: Request): string {
        const originAudience = resolveRequestAudience(request);
        const originHost = originAudience
            ? new URL(originAudience).host
            : undefined;

        if (!originHost || !this.SIWE_DOMAINS.includes(originHost)) {
            throw new UnauthorizedException('SIWE domain mismatch');
        }

        return originAudience!;
    }

    private async rotateRefreshToken(
        payload: RefreshTokenPayload,
        currentTokenHash: string,
        nextTokenHash: string,
        request: Request,
        response: Response,
    ): Promise<void> {
        const rotated =
            await this.refreshTokenService.rotateByWalletAddressAndToken(
                {
                    walletAddress: payload.sub,
                    tokenHash: currentTokenHash,
                },
                {
                    tokenHash: nextTokenHash,
                    expiresAt: addDuration(this.REFRESH_TOKEN_EXPIRES_IN),
                    ...this.buildTokenClientMeta(request),
                },
            );

        if (!rotated) {
            await this.refreshTokenService.revokeByWalletAddressAndToken(
                payload.sub,
                currentTokenHash,
            );

            clearAuthCookies(response);
            throw new UnauthorizedException('Refresh token reuse detected');
        }
    }

    async logout(
        payload: RefreshTokenPayload,
        refreshToken: string,
        response: Response,
    ): Promise<void> {
        if (refreshToken && payload.tokenType === 'refresh') {
            try {
                await this.refreshTokenService.revokeByWalletAddressAndToken(
                    payload.sub,
                    hash(refreshToken).toLowerCase(),
                );
            } catch {
                // ignore invalid refresh token during logout
            }
        }

        clearAuthCookies(response);
    }

    private async issueTokens(
        walletAddress: string,
        clientAudience: string,
    ): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const accessToken = await this.signAccessToken(
            walletAddress,
            clientAudience,
        );
        const refreshToken = await this.signRefreshToken(
            walletAddress,
            clientAudience,
        );

        return { accessToken, refreshToken };
    }

    private async signAccessToken(
        walletAddress: string,
        clientAudience: string,
    ): Promise<string> {
        const payload: AccessTokenPayload = {
            sub: walletAddress,
            tokenType: 'access',
        };

        return await this.jwtService.signAsync(
            payload,
            buildJwtSignOptions(
                this.ACCESS_TOKEN_EXPIRES_IN,
                'access',
                clientAudience,
            ),
        );
    }

    private async signRefreshToken(
        walletAddress: string,
        clientAudience: string,
    ): Promise<string> {
        const payload: RefreshTokenPayload = {
            sub: walletAddress,
            jti: randomUUID(),
            tokenType: 'refresh',
        };

        return await this.jwtService.signAsync(
            payload,
            buildJwtSignOptions(
                this.REFRESH_TOKEN_EXPIRES_IN,
                'refresh',
                clientAudience,
            ),
        );
    }

    private setAuthCookies(
        response: Response,
        accessToken: string,
        refreshToken: string,
    ): void {
        const names = getCookieNames();

        response.cookie(names.accessToken, accessToken, accessCookieOptions());

        response.cookie(
            names.refreshToken,
            refreshToken,
            refreshCookieOptions(),
        );
    }

    private buildTokenClientMeta(request: Request): {
        userAgentHash: string | null;
        ipHash: string | null;
    } {
        const userAgent = extractUserAgent(request);
        const ip = extractClientIp(request);

        return {
            userAgentHash: userAgent ? hash(userAgent).toLowerCase() : null,
            ipHash: ip ? hash(ip).toLowerCase() : null,
        };
    }
}

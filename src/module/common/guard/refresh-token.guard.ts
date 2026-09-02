import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { clearAuthCookies, getCookieNames } from '../util/cookie.util';
import { RefreshTokenPayload } from 'src/module/api/auth/auth.type';
import {
    buildJwtVerifyOptions,
    resolveRequestAudience,
} from '../util/jwt.util';

export type RequestWithPayload = Request & {
    payload?: RefreshTokenPayload;
    token?: string;
};

@Injectable()
export class RefreshTokenGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithPayload>();
        const response = context.switchToHttp().getResponse<Response>();
        const names = getCookieNames();

        const token = request.cookies?.[names.refreshToken] as
            | string
            | undefined;

        if (!token) {
            throw new UnauthorizedException('Refresh token missing');
        }

        const audience = resolveRequestAudience(request);
        const payload = await this.verifyRefreshToken(
            token,
            response,
            audience,
        );

        request.payload = payload;
        request.token = token;

        return true;
    }

    private async verifyRefreshToken(
        token: string,
        response: Response,
        audience?: string,
    ): Promise<RefreshTokenPayload> {
        try {
            return await this.jwtService.verifyAsync<RefreshTokenPayload>(
                token,
                buildJwtVerifyOptions('refresh', audience),
            );
        } catch (error) {
            clearAuthCookies(response);
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
}

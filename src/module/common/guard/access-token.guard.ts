import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccessTokenPayload } from 'src/module/api/auth/auth.type';
import { getCookieNames } from '../util/cookie.util';
import {
    buildJwtVerifyOptions,
    resolveRequestAudience,
} from '../util/jwt.util';

export type RequestWithUser = Request & {
    payload?: AccessTokenPayload;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const names = getCookieNames();

        const token = request.cookies?.[names.accessToken] as
            | string
            | undefined;

        if (!token) {
            throw new UnauthorizedException('Access token missing');
        }

        const audience = resolveRequestAudience(request);
        const payload = await this.verifyAccessToken(token, audience);

        request.payload = payload;

        return true;
    }

    private async verifyAccessToken(
        token: string,
        audience?: string,
    ): Promise<AccessTokenPayload> {
        try {
            const payload =
                await this.jwtService.verifyAsync<AccessTokenPayload>(
                    token,
                    buildJwtVerifyOptions('access', audience),
                );

            if (payload.tokenType !== 'access') {
                throw new UnauthorizedException('Invalid access token type');
            }

            return payload;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new UnauthorizedException('Invalid or expired access token');
        }
    }
}

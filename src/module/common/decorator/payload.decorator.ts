import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from 'src/module/api/auth/auth.type';

type AuthenticatedRequest = Request & { payload?: AccessTokenPayload };

export const Payload = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

        const payload = request.payload;

        if (!payload) {
            throw new UnauthorizedException('Payload not found');
        }

        return data ? payload[data as keyof AccessTokenPayload] : payload;
    },
);

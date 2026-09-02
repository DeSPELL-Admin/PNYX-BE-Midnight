import {
    createParamDecorator,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

type TokenRequest = Request & { token?: string };

export const Token = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<TokenRequest>();

        const token = request.token;

        if (!token) {
            throw new UnauthorizedException('Token not found');
        }

        return data
            ? (token as unknown as Record<string, string>)[data]
            : token;
    },
);

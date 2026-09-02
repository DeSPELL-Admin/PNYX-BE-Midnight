import {
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NoTransform } from 'src/module/common/decorator/no-transform.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notification')
@Controller('miniapp-notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @NoTransform()
    @ApiExcludeEndpoint()
    async webhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('svix-id') svixId?: string,
        @Headers('svix-timestamp') svixTimestamp?: string,
        @Headers('svix-signature') svixSignature?: string,
    ): Promise<{ success: true }> {
        const rawBody = req.rawBody?.toString('utf8') ?? '';

        await this.notificationService.handleWebhook(rawBody, {
            svixId,
            svixTimestamp,
            svixSignature,
        });

        return { success: true };
    }
}

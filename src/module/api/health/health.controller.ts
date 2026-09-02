import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { MongoDBService } from 'src/database/mongodb.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly mongoDBService: MongoDBService,
    ) {}

    /**
     * @title health
     * @notice 기본 헬스 체크 (프로세스 살아있는지만 확인)
     * @route GET /health
     */
    @Get('')
    health() {
        return 'ok';
    }

    /**
     * @title ready
     * @notice DB 준비 상태 체크
     * @route GET /ready
     */
    @Get('ready')
    ready() {
        const dbReady = this.mongoDBService.isConnected();
        return dbReady ? 'ok' : 'not-ready';
    }
}

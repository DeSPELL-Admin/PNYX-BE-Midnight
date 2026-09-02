import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { FileModule } from './module/api/file/file.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './module/api/health/health.module';
import { TransformInterceptor } from './module/common/interceptor/transform.interceptor';
import { HttpExceptionFilter } from './module/common/filter/http-exception.filter';
import { UserModule } from './module/api/user/user.module';
import { TournamentModule } from './module/api/tournament/tournament.module';
import { ItemModule } from './module/domain/item/item.module';
import { CategoryModule } from './module/api/category/category.module';
import { MatchModule } from './module/domain/match/match.module';
import { PlayInfoModule } from './module/domain/play-info/play-info.module';
import { RedisModule } from './module/common/redis/redis.module';
import { AuthGuardModule } from './module/common/guard/auth-guard.module';
import { AuthModule } from './module/api/auth/auth.module';
import { SignatureModule } from './module/api/signature/signature.module';
import { MidnightModule } from 'src/module/midnight/midnight.module';
import { NotificationModule } from './module/api/notification-token/notification.module';

@Module({
    imports: [
        DatabaseModule,
        RedisModule,
        AuthGuardModule,
        FileModule,
        HealthModule,
        UserModule,
        TournamentModule,
        ItemModule,
        CategoryModule,
        MatchModule,
        PlayInfoModule,
        AuthModule,
        SignatureModule,
        MidnightModule,
        NotificationModule,
    ],
    providers: [
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ],
})
export class AppModule {}

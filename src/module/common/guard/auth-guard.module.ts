import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { RefreshTokenGuard } from './refresh-token.guard';

/**
 * 토큰 가드를 전역에서 사용할 수 있도록 제공한다.
 * JWT 서명/검증 옵션은 호출 시점에 buildJwtSign/VerifyOptions로 주입하므로
 * JwtModule은 빈 설정으로 등록한다.
 */
@Global()
@Module({
    imports: [JwtModule.register({})],
    providers: [AccessTokenGuard, RefreshTokenGuard],
    exports: [JwtModule, AccessTokenGuard, RefreshTokenGuard],
})
export class AuthGuardModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { NonceModule } from 'src/module/domain/nonce/nonce.module';
import { UserModule } from 'src/module/api/user/user.module';
import { RefreshTokenModule } from 'src/module/domain/refresh-token/refresh-token.module';
import { MidnightModule } from 'src/module/midnight/midnight.module';

@Module({
    imports: [
        JwtModule.register({}),
        UserModule,
        NonceModule,
        RefreshTokenModule,
        MidnightModule,
    ],
    providers: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}

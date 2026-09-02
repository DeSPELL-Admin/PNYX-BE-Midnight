import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    RefreshToken,
    RefreshTokenSchema,
} from 'src/schema/domain/auth/refresh-token.schema';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshTokenService } from './refresh-token.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: RefreshToken.name, schema: RefreshTokenSchema },
        ]),
    ],
    providers: [RefreshTokenService, RefreshTokenRepository],
    exports: [RefreshTokenService],
})
export class RefreshTokenModule {}

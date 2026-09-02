// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDBService } from './mongodb.service';
import { createMongooseOptions } from '../config/mongoose.config';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            useFactory: () => createMongooseOptions(),
        }),
    ],
    providers: [MongoDBService],
    exports: [MongoDBService],
})
export class DatabaseModule {}

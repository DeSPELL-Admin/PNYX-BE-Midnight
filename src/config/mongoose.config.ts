import { MongooseModuleOptions } from '@nestjs/mongoose';
import { getEnv } from '../util/env.util';

export function createMongooseOptions(): MongooseModuleOptions {
    return {
        uri: getEnv('MONGODB_URI'),
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };
}

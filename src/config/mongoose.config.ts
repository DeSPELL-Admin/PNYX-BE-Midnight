import { Logger } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { getEnv } from '../util/env.util';

export function createMongooseOptions(): MongooseModuleOptions {
    return {
        uri: getEnv('MONGODB_URI'),
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // 실제로 붙은 DB 이름을 기동 로그에 남긴다 — 셸에 export 된 MONGODB_URI 가 .env 를 덮어써서
        // 다른 프로젝트 DB(토너먼트 0건)로 뜬 적이 있다. 로그 한 줄이면 재시작 직후 바로 알아챈다.
        connectionFactory: (connection: Connection) => {
            new Logger('MongoDB').log(
                `connected — db "${connection.name}" @ ${connection.host}:${connection.port}`,
            );
            return connection;
        },
    };
}

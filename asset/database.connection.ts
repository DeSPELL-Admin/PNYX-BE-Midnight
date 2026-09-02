import mongoose from "mongoose";
import { createMongooseOptions } from "../src/config/mongoose.config";

export async function connectDatabase(): Promise<typeof mongoose> {
    const mongooseOptions = createMongooseOptions();

    if (!mongooseOptions.uri) {
        // .env에서 못 읽어오면 바로 에러 처리
        throw new Error('MONGODB_URI 환경변수가 설정되어 있지 않습니다.');
    }

    // Node 스크립트에서 설정해두던 옵션 유지
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferTimeoutMS', 0);

    await mongoose.connect(mongooseOptions.uri, {
        maxPoolSize: mongooseOptions.maxPoolSize,
        serverSelectionTimeoutMS: mongooseOptions.serverSelectionTimeoutMS,
        socketTimeoutMS: mongooseOptions.socketTimeoutMS,
    });

    return mongoose;
}
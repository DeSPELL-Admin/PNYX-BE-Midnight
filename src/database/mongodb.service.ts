import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MongoDBService.name);

    constructor(@InjectConnection() private readonly connection: Connection) {}

    onModuleInit() {
        this.connection.on('error', (error) => {
            this.logger.error('MongoDB connection error', error);
        });

        this.connection.on('disconnected', () => {
            this.logger.warn('MongoDB disconnected');
        });

        this.connection.on('reconnected', () => {
            this.logger.log('MongoDB reconnected');
        });

        if (this.connection.readyState === ConnectionStates.connected) {
            this.logger.log('MongoDB connected successfully');
        }
    }

    async onModuleDestroy() {
        await this.connection.close();
        this.logger.log('MongoDB connection closed');
    }

    isConnected(): boolean {
        return this.connection.readyState === ConnectionStates.connected;
    }
}

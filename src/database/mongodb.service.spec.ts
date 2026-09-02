import { Logger } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MongoDBService } from './mongodb.service';

type Handler = (...args: unknown[]) => void;

const makeConn = (readyState: number) => {
    const handlers: Record<string, Handler> = {};
    const conn = {
        readyState,
        on: jest.fn((event: string, handler: Handler) => {
            handlers[event] = handler;
        }),
        close: jest.fn().mockResolvedValue(undefined),
    };
    return { conn: conn as unknown as Connection, raw: conn, handlers };
};

describe('MongoDBService', () => {
    let logSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        logSpy = jest
            .spyOn(Logger.prototype, 'log')
            .mockImplementation(() => undefined);
        errorSpy = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        warnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('isConnected', () => {
        it('returns true only when readyState is connected (1)', () => {
            const { conn } = makeConn(1);
            expect(new MongoDBService(conn).isConnected()).toBe(true);
        });

        it.each([0, 2, 3, 99])('returns false for readyState %i', (state) => {
            const { conn } = makeConn(state);
            expect(new MongoDBService(conn).isConnected()).toBe(false);
        });
    });

    describe('onModuleInit', () => {
        it('registers error/disconnected/reconnected listeners', () => {
            const { conn, raw } = makeConn(1);
            new MongoDBService(conn).onModuleInit();
            const events = raw.on.mock.calls.map((c) => c[0]);
            expect(events).toEqual(['error', 'disconnected', 'reconnected']);
        });

        it('logs success when already connected', () => {
            const { conn } = makeConn(1);
            new MongoDBService(conn).onModuleInit();
            expect(logSpy).toHaveBeenCalledWith(
                'MongoDB connected successfully',
            );
        });

        it('does not log success when not connected but still registers listeners', () => {
            const { conn, raw } = makeConn(0);
            new MongoDBService(conn).onModuleInit();
            expect(logSpy).not.toHaveBeenCalledWith(
                'MongoDB connected successfully',
            );
            expect(raw.on).toHaveBeenCalledTimes(3);
        });

        it('routes connection events to the correct log levels', () => {
            const { conn, handlers } = makeConn(1);
            new MongoDBService(conn).onModuleInit();

            const err = new Error('conn-err');
            handlers.error(err);
            expect(errorSpy).toHaveBeenCalledWith(
                'MongoDB connection error',
                err,
            );

            handlers.disconnected();
            expect(warnSpy).toHaveBeenCalledWith('MongoDB disconnected');

            handlers.reconnected();
            expect(logSpy).toHaveBeenCalledWith('MongoDB reconnected');
        });
    });

    describe('onModuleDestroy', () => {
        it('closes the connection and logs', async () => {
            const { conn, raw } = makeConn(1);
            await new MongoDBService(conn).onModuleDestroy();
            expect(raw.close).toHaveBeenCalledTimes(1);
            expect(logSpy).toHaveBeenCalledWith('MongoDB connection closed');
        });
    });
});

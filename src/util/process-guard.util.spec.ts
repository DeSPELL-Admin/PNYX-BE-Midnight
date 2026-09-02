import { Logger } from '@nestjs/common';
import { registerGlobalErrorGuards } from './process-guard.util';

type ProcListener = (...args: unknown[]) => void;

describe('registerGlobalErrorGuards', () => {
    let registered: Array<[string | symbol, ProcListener]>;
    let onSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        registered = [];
        // 실제 전역 핸들러가 테스트 프로세스에 누수되지 않도록 process.on을 가로챈다
        onSpy = jest
            .spyOn(process, 'on')
            .mockImplementation(
                (event: string | symbol, listener: ProcListener) => {
                    registered.push([event, listener]);
                    return process;
                },
            );
        errorSpy = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const getHandler = (event: string): ProcListener | undefined =>
        registered.find(([e]) => e === event)?.[1];

    it('registers an unhandledRejection handler', () => {
        registerGlobalErrorGuards();
        expect(onSpy).toHaveBeenCalledWith(
            'unhandledRejection',
            expect.any(Function),
        );
        expect(getHandler('unhandledRejection')).toBeInstanceOf(Function);
    });

    it('logs the error stack without rethrowing for Error reasons', () => {
        registerGlobalErrorGuards();
        const handler = getHandler('unhandledRejection');
        const reason = new Error('boom');

        expect(() => handler?.(reason)).not.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(
            'Unhandled promise rejection (logged; process kept alive)',
            reason.stack,
        );
    });

    it('logs the raw reason without rethrowing for non-Error reasons', () => {
        registerGlobalErrorGuards();
        const handler = getHandler('unhandledRejection');

        expect(() => handler?.('plain string reason')).not.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(
            'Unhandled promise rejection (logged; process kept alive)',
            'plain string reason',
        );
    });
});

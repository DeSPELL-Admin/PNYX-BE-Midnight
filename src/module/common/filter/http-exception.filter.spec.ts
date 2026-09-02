import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Logger,
    NotFoundException,
    UnauthorizedException,
    ArgumentsHost,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

const makeRes = () =>
    ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
    }) as unknown as Response & {
        status: jest.Mock;
        json: jest.Mock;
        end: jest.Mock;
    };

const makeReq = (over: Partial<Request> = {}) =>
    ({
        url: '/api/test',
        path: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('jest-agent'),
        ...over,
    }) as unknown as Request;

const makeHost = (req: Request, res: Response): ArgumentsHost =>
    ({
        switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    }) as unknown as ArgumentsHost;

const mongoErr = (name: string, extra: Record<string, unknown> = {}) =>
    Object.assign(new Error(`${name} message`), { name, ...extra });

describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let savedNodeEnv: string | undefined;

    beforeAll(() => {
        savedNodeEnv = process.env.NODE_ENV;
        jest.spyOn(Logger.prototype, 'error').mockImplementation(
            () => undefined,
        );
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(
            () => undefined,
        );
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    afterAll(() => {
        if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = savedNodeEnv;
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        filter = new HttpExceptionFilter();
        process.env.NODE_ENV = 'production';
        jest.clearAllMocks();
    });

    const run = (exception: unknown, reqOver: Partial<Request> = {}) => {
        const res = makeRes();
        const req = makeReq(reqOver);
        filter.catch(exception, makeHost(req, res));
        const status = res.status.mock.calls[0]?.[0];
        const body = res.json.mock.calls[0]?.[0];
        return { res, req, status, body };
    };

    describe('shouldIgnoreRequest', () => {
        it('ignores a 404 for /favicon.ico (ends without a JSON body)', () => {
            const { res } = run(new NotFoundException(), {
                url: '/favicon.ico',
            });
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.end).toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it('ignores a 404 for /docs/docs/swagger.json', () => {
            const { res } = run(new NotFoundException(), {
                url: '/docs/docs/swagger.json',
            });
            expect(res.end).toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it.each(['/docs/logo.png', '/docs/app.js', '/docs/x.ico'])(
            'ignores a 404 for static doc asset %s',
            (url) => {
                const { res } = run(new NotFoundException(), { url });
                expect(res.end).toHaveBeenCalled();
                expect(res.json).not.toHaveBeenCalled();
            },
        );

        it('does NOT ignore a 404 on a normal API route', () => {
            const { res, body } = run(new NotFoundException(), {
                url: '/api/foo',
            });
            expect(res.json).toHaveBeenCalled();
            expect(body.success).toBe(false);
        });

        it('does NOT ignore a non-404 HttpException on /favicon', () => {
            const { res } = run(new BadRequestException(), {
                url: '/favicon.ico',
            });
            expect(res.json).toHaveBeenCalled();
        });

        it('does NOT ignore a non-HttpException on /favicon', () => {
            const { res } = run(new Error('boom'), { url: '/favicon.ico' });
            expect(res.json).toHaveBeenCalled();
        });
    });

    describe('mongoose named errors', () => {
        it('maps ValidationError with field messages', () => {
            const ex = mongoErr('ValidationError', {
                errors: { a: { message: 'a bad' }, b: { message: 'b bad' } },
            });
            const { status, body } = run(ex);
            expect(status).toBe(400);
            expect(body.message).toBe('Validation Error');
            expect(body.meta.errorCode).toBe('MONGO_VALIDATION_ERROR');
            expect(body.errors).toEqual(['a bad', 'b bad']);
        });

        it('maps ValidationError without errors to an empty list', () => {
            const { body } = run(mongoErr('ValidationError'));
            expect(body.errors).toEqual([]);
        });

        it.each([
            [
                'CastError',
                400,
                'Invalid ID or value format',
                'MONGO_CAST_ERROR',
            ],
            [
                'DocumentNotFoundError',
                404,
                'Document not found',
                'MONGO_DOCUMENT_NOT_FOUND',
            ],
            [
                'VersionError',
                409,
                'Document version conflict',
                'MONGO_VERSION_CONFLICT',
            ],
            [
                'StrictModeError',
                400,
                'Strict mode violation',
                'MONGO_STRICT_MODE_VIOLATION',
            ],
            [
                'MongooseServerSelectionError',
                503,
                'Database connection unavailable',
                'MONGO_SERVER_SELECTION_ERROR',
            ],
            [
                'MongoServerSelectionError',
                503,
                'Database connection unavailable',
                'MONGO_SERVER_SELECTION_ERROR',
            ],
            [
                'MongoNetworkError',
                503,
                'Database network error',
                'MONGO_NETWORK_ERROR',
            ],
            ['MongoTimeoutError', 504, 'Database timeout', 'MONGO_TIMEOUT'],
        ])('maps %s', (name, code, message, errorCode) => {
            const { status, body } = run(mongoErr(name));
            expect(status).toBe(code);
            expect(body.message).toBe(message);
            expect(body.meta.errorCode).toBe(errorCode);
        });
    });

    describe('mongo driver codes', () => {
        it.each([
            [
                11000,
                409,
                'Duplicate field value entered',
                'MONGO_DUPLICATE_KEY',
            ],
            [
                11001,
                409,
                'Duplicate field value entered',
                'MONGO_DUPLICATE_KEY',
            ],
            [
                50,
                504,
                'Database operation timed out',
                'MONGO_OPERATION_TIMEOUT',
            ],
            [
                287,
                504,
                'Database operation timed out',
                'MONGO_OPERATION_TIMEOUT',
            ],
            [89, 504, 'Database network timeout', 'MONGO_NETWORK_TIMEOUT'],
            [
                91,
                503,
                'Database is shutting down',
                'MONGO_SHUTDOWN_IN_PROGRESS',
            ],
            [
                121,
                400,
                'Document validation failed',
                'MONGO_DOCUMENT_VALIDATION',
            ],
            [56, 409, 'Write conflict', 'MONGO_WRITE_CONFLICT'],
            [112, 409, 'Write conflict', 'MONGO_WRITE_CONFLICT'],
            [251, 409, 'Write conflict', 'MONGO_WRITE_CONFLICT'],
        ])('maps driver code %i', (code, status, message, errorCode) => {
            const { status: s, body } = run(
                mongoErr('MongoServerError', { code }),
            );
            expect(s).toBe(status);
            expect(body.message).toBe(message);
            expect(body.meta.errorCode).toBe(errorCode);
        });

        it('maps an unknown driver code to a 500 with the original message', () => {
            const ex = Object.assign(new Error('boom'), {
                name: 'MongoServerError',
                code: 999,
            });
            const { status, body } = run(ex);
            expect(status).toBe(500);
            expect(body.message).toBe('boom');
            expect(body.meta.errorCode).toBe('MONGO_ERROR_999');
        });

        it('falls back to name when a MongoError has no code', () => {
            const ex = Object.assign(new Error(''), { name: 'MongoError' });
            const { status, body } = run(ex);
            expect(status).toBe(500);
            expect(body.message).toBe('Database Error');
            expect(body.meta.errorCode).toBe('MONGO_ERROR_MongoError');
        });
    });

    describe('HttpException', () => {
        it('joins array validation messages and flags VALIDATION_ERROR on 400', () => {
            const { status, body } = run(
                new BadRequestException(['x must be int', 'y required']),
            );
            expect(status).toBe(400);
            expect(body.message).toBe('x must be int, y required');
            expect(body.meta.errorCode).toBe('VALIDATION_ERROR');
            expect(body.errors).toEqual(['x must be int', 'y required']);
        });

        it('joins array messages and assigns AUTH_FORBIDDEN on 403', () => {
            const { status, body } = run(
                new HttpException({ message: ['a', 'b'] }, 403),
            );
            expect(status).toBe(403);
            expect(body.message).toBe('a, b');
            expect(body.meta.errorCode).toBe('AUTH_FORBIDDEN');
            expect(body.errors).toBeUndefined();
        });

        it('uses a string response directly', () => {
            const { status, body } = run(
                new HttpException('plain string', 418),
            );
            expect(status).toBe(418);
            expect(body.message).toBe('plain string');
        });

        it('uses the standard message for NotFoundException', () => {
            const { status, body } = run(new NotFoundException(), {
                url: '/api/missing',
            });
            expect(status).toBe(404);
            expect(body.message).toBe('Not Found');
        });

        it('falls back to exception.message when the object has no message', () => {
            const ex = new HttpException({ statusCode: 400 }, 400);
            const { status, body } = run(ex);
            expect(status).toBe(400);
            expect(body.message).toBe(ex.message);
        });
    });

    describe('generic errors and default messages', () => {
        it('maps a plain Error to 500 with its message', () => {
            const { status, body } = run(new Error('kaboom'));
            expect(status).toBe(500);
            expect(body.message).toBe('kaboom');
        });

        it('uses the default message for an empty 422', () => {
            const ex = Object.assign(new Error(''), { statusCode: 422 });
            const { status, body } = run(ex);
            expect(status).toBe(422);
            expect(body.message).toBe('Unprocessable Entity');
        });

        it('uses Unknown Error for an unmapped status with no message', () => {
            const ex = Object.assign(new Error(''), { statusCode: 599 });
            const { status, body } = run(ex);
            expect(status).toBe(599);
            expect(body.message).toBe('Unknown Error');
        });

        it('handles a thrown string', () => {
            const { status, body } = run('oops');
            expect(status).toBe(500);
            expect(body.message).toBe('Internal Server Error');
        });
    });

    describe('NODE_ENV dev fields', () => {
        it('local includes message and stack', () => {
            process.env.NODE_ENV = 'local';
            const { body } = run(new Error('kaboom'));
            expect(body.error.message).toBe('kaboom');
            expect(body.error.stack).toContain('Error');
        });

        it('development includes message but not stack', () => {
            process.env.NODE_ENV = 'development';
            const { body } = run(new Error('kaboom'));
            expect(body.error.message).toBe('kaboom');
            expect('stack' in body.error).toBe(false);
        });

        it('production exposes no error object', () => {
            const { body } = run(new Error('kaboom'));
            expect('error' in body).toBe(false);
        });
    });

    describe('response body shape and logging', () => {
        it('always returns the standard envelope', () => {
            const { body, req } = run(new Error('kaboom'));
            expect(body.success).toBe(false);
            expect(body.data).toBeNull();
            expect(body.meta.path).toBe(req.path);
            expect(body.meta.method).toBe('GET');
            expect(typeof body.meta.timestamp).toBe('string');
        });

        it('falls back to url when path is empty', () => {
            const { body } = run(new Error('kaboom'), {
                path: '',
                url: '/fallback',
            });
            expect(body.meta.path).toBe('/fallback');
        });

        it('logs 5xx as error and 4xx as warn', () => {
            const errorSpy = jest.spyOn(Logger.prototype, 'error');
            run(new Error('kaboom'));
            expect(errorSpy).toHaveBeenCalledWith(
                'API Error [5xx]',
                expect.objectContaining({ statusCode: 500 }),
            );

            const warnSpy = jest.spyOn(Logger.prototype, 'warn');
            run(new NotFoundException(), { url: '/api/missing' });
            expect(warnSpy).toHaveBeenCalledWith(
                'API Warning [404]',
                expect.objectContaining({ statusCode: 404 }),
            );
        });
    });

    describe('routine auth error logging', () => {
        it('assigns AUTH_UNAUTHORIZED and suppresses the warn log for a 401 (Access token missing)', () => {
            const warnSpy = jest.spyOn(Logger.prototype, 'warn');
            const { status, body } = run(
                new UnauthorizedException('Access token missing'),
                { url: '/api/v1/categories', method: 'GET' },
            );
            expect(status).toBe(401);
            expect(body.message).toBe('Access token missing');
            expect(body.meta.errorCode).toBe('AUTH_UNAUTHORIZED');
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('suppresses the warn log for a 401 (Refresh token missing)', () => {
            const warnSpy = jest.spyOn(Logger.prototype, 'warn');
            const { status, body } = run(
                new UnauthorizedException('Refresh token missing'),
                { url: '/api/v1/auth/refresh', method: 'POST' },
            );
            expect(status).toBe(401);
            expect(body.meta.errorCode).toBe('AUTH_UNAUTHORIZED');
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('still warns for a non-401 4xx (does not over-suppress)', () => {
            const warnSpy = jest.spyOn(Logger.prototype, 'warn');
            const { status } = run(new BadRequestException('bad input'));
            expect(status).toBe(400);
            expect(warnSpy).toHaveBeenCalledWith(
                'API Warning [400]',
                expect.objectContaining({ statusCode: 400 }),
            );
        });

        it('assigns AUTH_FORBIDDEN but still warns for a 403 (not silenced)', () => {
            const warnSpy = jest.spyOn(Logger.prototype, 'warn');
            const { status, body } = run(new ForbiddenException('nope'));
            expect(status).toBe(403);
            expect(body.meta.errorCode).toBe('AUTH_FORBIDDEN');
            expect(warnSpy).toHaveBeenCalledWith(
                'API Warning [403]',
                expect.objectContaining({ statusCode: 403 }),
            );
        });
    });
});

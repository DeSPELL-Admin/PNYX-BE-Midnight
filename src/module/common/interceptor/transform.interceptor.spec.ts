import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ResponseDto } from '../decorator/response-dto.decorator';
import { NoTransform } from '../decorator/no-transform.decorator';
import { FindTournamentsResDto } from '../../api/tournament/dto/res/find-tournaments.res.dto';
import { PaginationResult } from '../response/api-response';

const TIMESTAMP = '2026-01-02T03:04:05.000Z';

class DummyController {
    @ResponseDto(FindTournamentsResDto)
    withDto() {}

    @NoTransform()
    skipped() {}

    plain() {}
}

@NoTransform()
class SkippedClassController {
    handler() {}
}

const ctxFor = (handler: unknown, klass: unknown): ExecutionContext =>
    ({
        getHandler: () => handler,
        getClass: () => klass,
    }) as unknown as ExecutionContext;

const callHandlerOf = (value: unknown): CallHandler =>
    ({ handle: () => of(value) }) as CallHandler;

const ROW = {
    category: 'Animation',
    tournamentId: 12,
    title: 'Q',
    selectedCount: 101,
    firstItemImageName: 'a',
    secondItemImageName: 'b',
};

describe('TransformInterceptor', () => {
    let interceptor: TransformInterceptor<unknown>;

    beforeAll(() => {
        jest.useFakeTimers({ now: new Date(TIMESTAMP) });
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        interceptor = new TransformInterceptor(new Reflector());
    });

    const run = (ctx: ExecutionContext, value: unknown) =>
        firstValueFrom(interceptor.intercept(ctx, callHandlerOf(value)));

    describe('NoTransform', () => {
        it('returns the handler value untouched for a method-level decorator', async () => {
            const payload = { raw: true };
            const result = await run(
                ctxFor(DummyController.prototype.skipped, DummyController),
                payload,
            );
            expect(result).toBe(payload);
        });

        it('skips when the class is decorated', async () => {
            const payload = { raw: true };
            const result = await run(
                ctxFor(
                    SkippedClassController.prototype.handler,
                    SkippedClassController,
                ),
                payload,
            );
            expect(result).toBe(payload);
        });
    });

    describe('single response', () => {
        it('wraps a plain object without a DTO, keeping the same data reference', async () => {
            const payload = { a: 1 };
            const result = await run(
                ctxFor(DummyController.prototype.plain, DummyController),
                payload,
            );
            expect(result).toEqual({
                success: true,
                data: payload,
                meta: { timestamp: TIMESTAMP },
            });
            expect((result as { data: unknown }).data).toBe(payload);
        });

        it('does not transform a null payload even with a DTO', async () => {
            const result = (await run(
                ctxFor(DummyController.prototype.withDto, DummyController),
                null,
            )) as { data: unknown };
            expect(result.data).toBeNull();
        });

        it('wraps an undefined payload', async () => {
            const result = (await run(
                ctxFor(DummyController.prototype.withDto, DummyController),
                undefined,
            )) as { data: unknown };
            expect(result.data).toBeUndefined();
        });

        it('applies the DTO, stripping extraneous fields and coercing types', async () => {
            const result = (await run(
                ctxFor(DummyController.prototype.withDto, DummyController),
                { ...ROW, tournamentId: '12', secret: 'x' },
            )) as { data: FindTournamentsResDto & { secret?: string } };

            expect(result.data).toBeInstanceOf(FindTournamentsResDto);
            expect(result.data.secret).toBeUndefined();
            expect(result.data.tournamentId).toBe(12);
            expect(result.data.category).toBe('Animation');
        });
    });

    describe('pagination detection', () => {
        const paginated = (
            over: Partial<PaginationResult<unknown>> = {},
        ): PaginationResult<unknown> => ({
            data: [ROW],
            page: 2,
            limit: 20,
            total: 101,
            ...over,
        });

        it('expands a PaginationResult and transforms each item', async () => {
            const result = (await run(
                ctxFor(DummyController.prototype.withDto, DummyController),
                paginated(),
            )) as {
                pagination: unknown;
                data: FindTournamentsResDto[];
            };

            expect(result.pagination).toEqual({
                page: 2,
                limit: 20,
                total: 101,
                totalPages: 6,
                hasNext: true,
                hasPrev: true,
            });
            expect(result.data[0]).toBeInstanceOf(FindTournamentsResDto);
        });

        it('keeps item references when no DTO is set', async () => {
            const input = paginated();
            const result = (await run(
                ctxFor(DummyController.prototype.plain, DummyController),
                input,
            )) as { data: unknown[] };
            expect(result.data[0]).toBe(ROW);
        });

        it('handles an empty page', async () => {
            const result = (await run(
                ctxFor(DummyController.prototype.plain, DummyController),
                paginated({ data: [], total: 0 }),
            )) as { pagination: { totalPages: number; hasNext: boolean } };
            expect(result.pagination.totalPages).toBe(0);
            expect(result.pagination.hasNext).toBe(false);
        });

        it.each([
            ['empty object', {}],
            ['page as string', { data: [], page: '1', limit: 20, total: 5 }],
            ['missing total', { data: [], page: 1, limit: 20 }],
            ['array payload', [1, 2, 3]],
        ])('treats %s as a single response', async (_label, payload) => {
            const result = (await run(
                ctxFor(DummyController.prototype.plain, DummyController),
                payload,
            )) as Record<string, unknown>;
            expect(result).not.toHaveProperty('pagination');
            expect(result.data).toBe(payload);
        });
    });
});

import { MidnightService } from './midnight.service';

/**
 * `probeGrantLiveness` — 인덱서 GraphQL 응답을 네 상태(success/failed/absent/inconclusive)로 매핑하는 경계.
 * SignatureService 스펙은 이 결과를 mock 으로 주입하므로, 실제 매핑은 여기서 fetch 를 흉내 내어 직접 검증한다.
 */
const TF_ADDRESS = '0200aabbccddeeff';

const makeService = (): MidnightService => {
    const service = new MidnightService({} as never);
    (service as unknown as { config: unknown }).config = {
        indexerUrl: 'https://indexer.test/graphql',
        tournamentFinalizerAddress: TF_ADDRESS,
    };
    return service;
};

type FetchReply = {
    ok?: boolean;
    status?: number;
    body?: unknown;
    reject?: Error;
};

const setFetch = (reply: FetchReply): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(() => {
        if (reply.reject) return Promise.reject(reply.reject);
        return Promise.resolve({
            ok: reply.ok ?? true,
            status: reply.status ?? 200,
            json: async () => reply.body,
        });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
};

const tx = (status: string | undefined, actions: string[] = [TF_ADDRESS]) => ({
    hash: '00abc',
    block: { height: 1, hash: '00', timestamp: 0 },
    contractActions: actions.map((address) => ({ address })),
    ...(status === undefined ? {} : { transactionResult: { status } }),
});

describe('MidnightService.eligibilityLeaf', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('uses the domainTag cached in Ctx and never touches the indexer per grant', async () => {
        const fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
        const domainTag = new Uint8Array(32).fill(7);
        const leafBytes = new Uint8Array(32).fill(9);
        const eligibilityLeaf = jest.fn().mockReturnValue(leafBytes);
        const bracketHash16 = jest
            .fn()
            .mockReturnValue(new Uint8Array(32).fill(1));
        const service = new MidnightService({} as never);
        (service as unknown as { ctxPromise: unknown }).ctxPromise =
            Promise.resolve({
                TF: { pureCircuits: { eligibilityLeaf, bracketHash16 } },
                domainTag,
            });
        const bracket =
            '0x' +
            Array.from({ length: 16 }, (_, i) =>
                (i + 1).toString(16).padStart(4, '0'),
            ).join('');

        const a = await service.eligibilityLeaf(
            '0x' + 'ab'.repeat(32),
            12,
            16,
            1_800_003_600n,
            bracket,
        );
        const b = await service.eligibilityLeaf(
            '0x' + 'ab'.repeat(32),
            12,
            16,
            1_800_003_600n,
            bracket,
        );

        expect(a).toBe(b);
        expect(eligibilityLeaf).toHaveBeenCalledTimes(2);
        expect(eligibilityLeaf.mock.calls[0][0]).toBe(domainTag);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('MidnightService.probeGrantLiveness', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('queries the indexer by txId with the transactionResult fragment', async () => {
        const fetchMock = setFetch({
            body: { data: { transactions: [tx('SUCCESS')] } },
        });
        await makeService().probeGrantLiveness('00abc');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, opts] = fetchMock.mock.calls[0] as [
            string,
            { body: string },
        ];
        expect(url).toBe('https://indexer.test/graphql');
        const payload = JSON.parse(opts.body) as {
            query: string;
            variables: { id: string };
        };
        expect(payload.variables.id).toBe('00abc');
        expect(payload.query).toContain(
            '... on RegularTransaction { transactionResult { status } }',
        );
    });

    it('SUCCESS with a TournamentFinalizer action → success', async () => {
        setFetch({ body: { data: { transactions: [tx('SUCCESS')] } } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({ state: 'success' });
    });

    it('matches the contract address case-insensitively', async () => {
        setFetch({
            body: {
                data: {
                    transactions: [tx('SUCCESS', [TF_ADDRESS.toUpperCase()])],
                },
            },
        });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({ state: 'success' });
    });

    it('PARTIAL_SUCCESS → failed', async () => {
        setFetch({ body: { data: { transactions: [tx('PARTIAL_SUCCESS')] } } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({
            state: 'failed',
            status: 'PARTIAL_SUCCESS',
        });
    });

    it('FAILURE → failed', async () => {
        setFetch({ body: { data: { transactions: [tx('FAILURE')] } } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({
            state: 'failed',
            status: 'FAILURE',
        });
    });

    it('SUCCESS but no TournamentFinalizer action → failed (MISSING_ACTION)', async () => {
        setFetch({
            body: { data: { transactions: [tx('SUCCESS', ['0200other'])] } },
        });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({
            state: 'failed',
            status: 'MISSING_ACTION',
        });
    });

    it('empty transactions → absent', async () => {
        setFetch({ body: { data: { transactions: [] } } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toEqual({ state: 'absent' });
    });

    it('non-2xx → inconclusive', async () => {
        setFetch({ ok: false, status: 502, body: {} });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toMatchObject({
            state: 'inconclusive',
            reason: expect.stringContaining('502'),
        });
    });

    it('GraphQL errors → inconclusive (never treated as absent)', async () => {
        setFetch({
            body: { data: { transactions: [] }, errors: [{ message: 'boom' }] },
        });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toMatchObject({
            state: 'inconclusive',
            reason: expect.stringContaining('boom'),
        });
    });

    it('network throw → inconclusive', async () => {
        setFetch({ reject: new Error('ECONNREFUSED') });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toMatchObject({
            state: 'inconclusive',
            reason: expect.stringContaining('ECONNREFUSED'),
        });
    });

    it('never-resolving indexer → aborted by the bounded timeout → inconclusive', async () => {
        // fetch 가 signal 을 존중하는 것처럼 흔내 낸다: abort 전까지 영원히 pending, abort 시 DOMException(TimeoutError) reject.
        const fetchMock = jest.fn().mockImplementation(
            (_url: string, opts: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    opts.signal.addEventListener('abort', () =>
                        reject(opts.signal.reason),
                    );
                }),
        );
        global.fetch = fetchMock as unknown as typeof fetch;
        const started = Date.now();
        const result = await makeService().probeGrantLiveness('00abc');
        expect(result).toMatchObject({
            state: 'inconclusive',
            reason: expect.stringContaining('timeout'),
        });
        // 기본 5s 상한 — 테스트 예산 안에서 실제로 끊기는지 확인
        expect(Date.now() - started).toBeLessThan(6000);
        expect(
            (fetchMock.mock.calls[0] as [string, { signal: AbortSignal }])[1]
                .signal,
        ).toBeInstanceOf(AbortSignal);
    }, 10_000);

    it('headers arrive but the body never resolves → inconclusive (body read timeout) within one shared deadline', async () => {
        jest.useFakeTimers();
        try {
            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => new Promise(() => undefined),
            });
            global.fetch = fetchMock as unknown as typeof fetch;
            const pending = makeService().probeGrantLiveness('00abc');
            await jest.advanceTimersByTimeAsync(5_000);
            await expect(pending).resolves.toMatchObject({
                state: 'inconclusive',
                reason: expect.stringContaining('body read timeout'),
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('missing transactionResult → inconclusive', async () => {
        setFetch({ body: { data: { transactions: [tx(undefined)] } } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toMatchObject({ state: 'inconclusive' });
    });

    it('malformed response (no transactions array) → inconclusive', async () => {
        setFetch({ body: { data: {} } });
        await expect(
            makeService().probeGrantLiveness('00abc'),
        ).resolves.toMatchObject({
            state: 'inconclusive',
            reason: 'malformed response',
        });
    });
});

import {
    Injectable,
    InternalServerErrorException,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMidnightConfig, MidnightConfig } from './midnight.config';
import { loadMidnightSdk, MidnightSdk } from './lib/sdk';
import {
    buildOperatorWallet,
    OperatorWallet,
    walletProviders,
} from './lib/wallet';
import { bytes32, fromHex, toHex } from './lib/bytes';
import { MidnightEscrowService } from 'src/module/domain/midnight-escrow/midnight-escrow.service';
import { pad32 } from './lib/bytes';

type TFModule =
    typeof import('../../../midnight-contract/TournamentFinalizer/contract/index');

type Ctx = {
    sdk: MidnightSdk;
    TF: TFModule;
    operator: OperatorWallet;
    providers: any;
    contract: any; // FoundContract<TF.Contract>
    compiled: any; // CompiledContract<TF.Contract> — submitCallTxAsync 가 직접 받는다
    /**
     * ledger.domainTag — 부팅 시 한 번만 읽는다. 매 grant 마다 컨트랙트 상태 전체(≈70KB, ≈1.4s)를 내려받아 32바이트
     * 상수를 꺼내는 것이 grant 지연의 BE 쪽 몹이었다. 이 값은 오너의 `setDomainTag` 로만 바뀜 수 있고, 그
     * 순간 미제출 grant 가 전부 무효화되므로 어차피 운영 이벤트다 — 바꿀 때 BE 를 재시작한다.
     */
    domainTag: Uint8Array;
};

export type IndexerTxStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';

export type IndexerTx = {
    hash: string;
    block: { height: number; hash: string; timestamp: number };
    contractActions: { address: string }[];
    /** RegularTransaction 에만 있다 (system tx 는 없음). 블록 포함 ≠ 성공 — 성공 판정은 이 값으로. */
    transactionResult?: { status: IndexerTxStatus };
};

/**
 * grant tx 생존 판정 — 비동기 제출(`submitCallTxAsync` + InBlock 대기)은 블록 포함까지만 보장하므로 재사용 시점에
 * 인덱서로 결과를 다시 본다. 네 상태를 구분한다:
 *   - success      : 블록 포함 + status SUCCESS + TournamentFinalizer 액션 존재 → grant 살아 있음
 *   - failed       : 블록 포함이지만 FAILURE/PARTIAL_SUCCESS, 또는 SUCCESS 인데 기대 액션이 없음 → 확정 사망
 *   - absent       : 인덱서 응답은 정상인데 tx 가 없음 → 아직 전파 중이거나 드롭됨 (나이로 판단)
 *   - inconclusive : 인덱서 오류/비정상 응답 → 아무 결론도 내리지 않는다 (호출자는 fail-open)
 */
export type GrantLivenessResult =
    | { state: 'success' }
    | { state: 'failed'; status: IndexerTxStatus | 'MISSING_ACTION' }
    | { state: 'absent' }
    | { state: 'inconclusive'; reason: string };

/**
 * 생존 판정 조회의 상한. 이 조회는 grant 요청의 사용자 락 안에서 동기로 돌므로, 인덱서가 응답 없이 멈추면
 * 요청이 락을 잡은 채 매달린다. 시간 초과는 "모름"(inconclusive) 으로 처리해 기존 grant 를 그대로 돌려준다.
 */
const GRANT_PROBE_TIMEOUT_MS = parseInt(
    process.env.MIDNIGHT_GRANT_PROBE_TIMEOUT_MS ?? '5000',
    10,
);

class ProbeBodyTimeoutError extends Error {
    constructor() {
        super('body read timeout');
        this.name = 'TimeoutError';
    }
}

const INDEXER_TX_QUERY = `query($id: HexEncoded!) { transactions(offset: { identifier: $id }) { hash block { height hash timestamp } contractActions { address } ... on RegularTransaction { transactionResult { status } } } }`;

const PRIVATE_STATE_ID = 'pnyxTournamentFinalizerOperator';

/** escrow 저장분과 같은 모양 — sellRows 판매 시점에 고정(pin)되어 witness 로 들어간다. */
export type PinnedEscrowRow = {
    tournamentId: number;
    itemId: number;
    /** LWA final array — 커밋의 bracketHash 를 재계산하는 원문 (16/32/64개) */
    bracket: number[];
    segment: string;
    salt: string;
};

export type OnChainLicense = {
    tournamentId: number;
    rowCount: number;
    sampleAtSale: number;
    datasetHash: string;
    commitDigest: string;
    querySpecHash: string;
    buyerPk: string;
};

/**
 * Midnight 오퍼레이터 서비스 — legacy chain 의 `ChainService`(서명 지갑) + 스캐너 읽기의 역할.
 *
 *   - 오퍼레이터 지갑(finalizeSigner) 으로 `grantEligibility` 를 온체인 제출 (legacy signing 서명 발급 대체)
 *   - 인덱서 GraphQL 로 트랜잭션 확인 (스캐너 대체)
 *   - Lace `signData` 서명 검증 (SIWE 대체)
 *
 * 초기화(지갑 동기화)는 시간이 걸리므로 부팅을 막지 않고 백그라운드에서 시작한다.
 */
@Injectable()
export class MidnightService implements OnModuleInit {
    private readonly logger = new Logger(MidnightService.name);
    readonly config: MidnightConfig | null;
    private ctxPromise: Promise<Ctx> | undefined;
    /**
     * sellRows 판매 시점의 로우 고정(pin). datasetHash 는 회로 "인자"라 증명 전에 확정되는데
     * escrowRows witness 는 증명 "중"에 호출된다 — 그 사이 새 투표가 escrow 되면 데이터셋과
     * witness 가 어긋나 증명이 깨진다. fulfill 큐가 직렬이므로 인스턴스 필드로 안전.
     */
    private pinnedRows: PinnedEscrowRow[] | null = null;

    constructor(private readonly escrowService: MidnightEscrowService) {
        this.config =
            process.env.MIDNIGHT_ENABLED === 'true'
                ? loadMidnightConfig()
                : null;
    }

    onModuleInit(): void {
        if (!this.config) {
            this.logger.log(
                'MIDNIGHT_ENABLED != true — Midnight operator disabled',
            );
            return;
        }
        // onModuleInit 은 app.listen() 보다 먼저 실행된다. 여기서 바로 초기화하면 wallet-sdk 의
        // ESM/WASM 로딩과 동기화가 listen 과 같은 이벤트 루프를 두고 경쟁해 포트가 늦게 열리고
        // 배포 스크립트의 /health 체크가 실패한다. 몇 초 미뤄서 서버가 먼저 뜨게 한다.
        const delayMs = parseInt(
            process.env.MIDNIGHT_INIT_DELAY_MS ?? '5000',
            10,
        );
        setTimeout(() => {
            void this.getCtx().catch((e) =>
                this.logger.error(
                    `Midnight operator init failed: ${e?.message ?? e}`,
                ),
            );
        }, delayMs);
    }

    get chainId(): number | null {
        return this.config?.chainId ?? null;
    }

    isMidnightChain(chainId: number): boolean {
        return this.config !== null && chainId === this.config.chainId;
    }

    private requireConfig(): MidnightConfig {
        if (!this.config)
            throw new InternalServerErrorException('Midnight is not enabled');
        return this.config;
    }

    private getCtx(): Promise<Ctx> {
        if (!this.ctxPromise) {
            this.ctxPromise = this.initialize().catch((e) => {
                this.ctxPromise = undefined; // 다음 호출에서 재시도
                throw e;
            });
        }
        return this.ctxPromise;
    }

    private async initialize(): Promise<Ctx> {
        const config = this.requireConfig();
        const sdk = await loadMidnightSdk();
        sdk.networkId.setNetworkId(
            config.networkId === 'undeployed' ? 'undeployed' : config.networkId,
        );

        const contractDir = path.resolve(config.contractDir);
        const TF = (await import(
            pathToFileURL(path.join(contractDir, 'contract', 'index.js')).href
        )) as TFModule;

        this.logger.log(
            'building Midnight operator wallet (first sync may take ~30 min on preprod)…',
        );
        const operator = await buildOperatorWallet(sdk, config);

        const wp = walletProviders(sdk, operator);
        const zkConfigProvider = new sdk.zkConfig.NodeZkConfigProvider(
            contractDir,
        );
        const providers = {
            privateStateProvider: sdk.privateState.levelPrivateStateProvider({
                privateStateStoreName: 'pnyx-midnight-operator',
                accountId: operator.coinPublicKey,
                privateStoragePasswordProvider: () =>
                    `${Buffer.from(operator.coinPublicKey, 'hex').toString('base64')}!`,
            }),
            publicDataProvider: sdk.indexer.indexerPublicDataProvider(
                config.indexerUrl,
                config.indexerWsUrl,
            ),
            zkConfigProvider,
            proofProvider: sdk.proof.httpClientProofProvider(
                config.proofServerUrl,
                zkConfigProvider,
            ),
            walletProvider: wp,
            midnightProvider: wp,
        };

        const zero = new Uint8Array(32);
        const emptyPath = (leaf: Uint8Array) => ({
            leaf,
            path: Array.from({ length: 16 }, () => ({
                sibling: { field: 0n },
                goes_left: false,
            })),
        });
        const chainId = config.chainId;
        // 오퍼레이터는 투표하지 않는다 — user witness 는 더미, escrowRows 는 pin(판매 시점 고정) 우선, 없으면 DB
        const witnesses = {
            userSecret: ({ privateState }: any) => [privateState, zero],
            voteSalt: ({ privateState }: any) => [privateState, zero],
            eligibilityPath: ({ privateState }: any, leaf: Uint8Array) => [
                privateState,
                emptyPath(leaf),
            ],
            // 주의: witness 는 반드시 동기여야 한다 — compact-js 는 [state, result] 배열을 기대하고
            // Promise 를 주면 "object is not iterable" 로 죽는다. 그래서 DB 폴백 없이
            // sellRows() 가 미리 세팅한 pin 만 읽는다.
            escrowRows: (
                { ledger, privateState }: any,
                _tournamentId: bigint,
            ) => {
                const rows: PinnedEscrowRow[] = this.pinnedRows ?? [];
                if (rows.length === 0) {
                    throw new Error(
                        'escrowRows witness called without pinned rows — call sellRows() with pinnedRows',
                    );
                }
                const hashers: Record<number, (b: bigint[]) => Uint8Array> = {
                    16: TF.pureCircuits.bracketHash16,
                    32: TF.pureCircuits.bracketHash32,
                    64: TF.pureCircuits.bracketHash64,
                };
                const out = rows.slice(0, 8).map((r) => {
                    const hasher = hashers[r.bracket?.length ?? 0];
                    if (!hasher)
                        throw new Error(
                            `escrow row has invalid bracket length ${r.bracket?.length ?? 0}`,
                        );
                    const row = {
                        tournamentId: BigInt(r.tournamentId),
                        itemId: BigInt(r.itemId),
                        bracketHash: hasher(r.bracket.map((x) => BigInt(x))),
                        segment: pad32(r.segment),
                    };
                    const salt = bytes32(r.salt, 'salt');
                    const commit = TF.pureCircuits.voteCommitment(row, salt);
                    return {
                        present: true,
                        row,
                        salt,
                        path:
                            ledger.voteCommits.findPathForLeaf(commit) ??
                            emptyPath(commit),
                    };
                });
                while (out.length < 8)
                    out.push({
                        present: false,
                        row: {
                            tournamentId: 0n,
                            itemId: 0n,
                            bracketHash: zero,
                            segment: zero,
                        },
                        salt: zero,
                        path: emptyPath(zero),
                    });
                return [privateState, out];
            },
        };

        const compiled = sdk.compactJs.CompiledContract.make(
            'TournamentFinalizer',
            TF.Contract as any,
        ).pipe(sdk.compactJs.CompiledContract.withWitnesses(witnesses as any));
        const contract = await sdk.contracts.findDeployedContract(
            providers as any,
            {
                contractAddress: config.tournamentFinalizerAddress,
                compiledContract: compiled,
                privateStateId: PRIVATE_STATE_ID,
                initialPrivateState: {},
            } as any,
        );

        const st = await providers.publicDataProvider.queryContractState(
            config.tournamentFinalizerAddress,
        );
        if (!st)
            throw new InternalServerErrorException(
                'TournamentFinalizer contract state not found on indexer',
            );
        const domainTag: Uint8Array = TF.ledger(st.data).domainTag;

        this.logger.log(
            `joined TournamentFinalizer ${config.tournamentFinalizerAddress} as ${operator.unshieldedAddress} (domainTag ${toHex(domainTag).slice(0, 10)}…)`,
        );
        return { sdk, TF, operator, providers, contract, compiled, domainTag };
    }

    /** 컨트랙트 public ledger 스냅샷 */
    async readLedger(): Promise<any> {
        const { TF, providers } = await this.getCtx();
        const st = await providers.publicDataProvider.queryContractState(
            this.requireConfig().tournamentFinalizerAddress,
        );
        if (!st)
            throw new InternalServerErrorException(
                'TournamentFinalizer contract state not found on indexer',
            );
        return TF.ledger(st.data);
    }

    /**
     * leaf = H(domainTag, userPk, tournamentId, point, deadline, bracketHash) — hex.
     * entryItemHexes(검증된 브라켓)를 해시로 바인딩해, grant 와 다른 브라켓 제출을 회로에서 차단한다.
     */
    async eligibilityLeaf(
        userPkHex: string,
        tournamentId: number,
        point: number,
        deadline: bigint,
        entryItemHexes: string,
    ): Promise<string> {
        const { TF, domainTag } = await this.getCtx();
        const bytes = fromHex(entryItemHexes);
        const count = bytes.length / 2;
        if (![16, 32, 64].includes(count)) {
            throw new InternalServerErrorException(
                `Midnight bracket must be 16/32/64 items, got ${count}`,
            );
        }
        const bracket: bigint[] = [];
        for (let i = 0; i < count; i++)
            bracket.push(BigInt((bytes[i * 2] << 8) | bytes[i * 2 + 1]));
        const hashers = {
            16: TF.pureCircuits.bracketHash16,
            32: TF.pureCircuits.bracketHash32,
            64: TF.pureCircuits.bracketHash64,
        } as const;
        const bHash = hashers[count as 16 | 32 | 64](bracket);
        return toHex(
            TF.pureCircuits.eligibilityLeaf(
                domainTag,
                bytes32(userPkHex, 'userPk'),
                BigInt(tournamentId),
                BigInt(point),
                deadline,
                bHash,
            ),
        );
    }

    /**
     * grant leaf 를 온체인 Merkle 트리에 넣는다 — **비동기 제출**.
     *
     * `contract.callTx` 는 제출 후 `watchForTxData` 로 인덱서 최종 반영까지 기다린 뒤 resolve 되는데,
     * FE 는 어차피 leaf 가 인덱서에 보일 때까지 직접 폴링하므로 여기서 기다릴 이유가 없다.
     * `submitCallTxAsync` 는 증명 → 밸런싱 → 제출까지만 하고 txId 를 돌려준다. 제출은 우리 지갑 어댑터
     * (`lib/wallet.ts` submitTx)가 **블록 포함('InBlock', ≈6s)**까지 기다린다 — facade 기본값인 최종성('Finalized',
     * ≈18s)이 예전 grant 지연의 진짜 원인이었다. 인덱서에는 최종성 뒤(응답 후 ≈15s)에야 leaf 가 보인다.
     * 제출 전 실패(proof server, DUST 부족, 노드 거부)는 여전히 여기서 throw 된다. 제출 후 실패(포함된
     * 블록이 최종성에서 빠짐, 회로 실패)는 `probeGrantLiveness` 가 잡는다.
     * grantEligibility 는 private state 를 바꾸지 않으므로 nextPrivateState 저장이 필요 없다 — 다른 회로에
     * 이 방식을 그대로 쓰면 안 된다.
     */
    async grantEligibility(leafHex: string): Promise<{ txId: string }> {
        const { sdk, providers, compiled } = await this.getCtx();
        const config = this.requireConfig();
        // 증명 / 밸런싱(지갑 DUST 증명) / 제출(지갑이 블록 포함까지 기다린다) 각 구간을 재서 남긴다 —
        // grant 지연의 어느 족이 병목인지는 이 로그로만 알 수 있다 (이 세 단계는 SDK 안에서 직렬로 돈다).
        const t: Record<string, number> = {};
        const timed = <T>(name: string, p: Promise<T>): Promise<T> => {
            const t0 = Date.now();
            return p.finally(() => {
                t[name] = Date.now() - t0;
            });
        };
        const timedProviders = {
            ...providers,
            proofProvider: {
                ...providers.proofProvider,
                proveTx: (...a: unknown[]) =>
                    timed('prove', providers.proofProvider.proveTx(...a)),
            },
            walletProvider: {
                ...providers.walletProvider,
                balanceTx: (...a: unknown[]) =>
                    timed('balance', providers.walletProvider.balanceTx(...a)),
            },
            midnightProvider: {
                ...providers.midnightProvider,
                submitTx: (...a: unknown[]) =>
                    timed('submit', providers.midnightProvider.submitTx(...a)),
            },
        };
        const t0 = Date.now();
        try {
            const { txId } = await sdk.contracts.submitCallTxAsync(
                timedProviders,
                {
                    compiledContract: compiled,
                    circuitId: 'grantEligibility',
                    contractAddress: config.tournamentFinalizerAddress,
                    privateStateId: PRIVATE_STATE_ID,
                    args: [fromHex(leafHex)],
                },
            );
            return { txId: String(txId) };
        } finally {
            this.logger.log(
                `[grant-submit] prove=${t.prove ?? '-'}ms balance=${t.balance ?? '-'}ms submit=${t.submit ?? '-'}ms total=${Date.now() - t0}ms`,
            );
        }
    }

    /** 인덱서에서 트랜잭션 조회 (identifier = txId). 없으면 null. */
    async getTransaction(txId: string): Promise<IndexerTx | null> {
        const config = this.requireConfig();
        const res = await fetch(config.indexerUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: INDEXER_TX_QUERY,
                variables: { id: txId },
            }),
        });
        if (!res.ok)
            throw new InternalServerErrorException(`indexer ${res.status}`);
        const json = (await res.json()) as {
            data?: { transactions?: IndexerTx[] };
            errors?: unknown;
        };
        if (json.errors)
            this.logger.warn(
                `indexer errors: ${JSON.stringify(json.errors).slice(0, 300)}`,
            );
        return json.data?.transactions?.[0] ?? null;
    }

    /**
     * grant tx 생존 판정 (`GrantLivenessResult` 참고). `getTransaction` 과 달리 인덱서 오류를 절대 "없음"으로
     * 뭉개지 않는다 — 오류는 `inconclusive` 로 돌려서 호출자가 기존 grant 를 유지(fail-open)하게 한다.
     */
    async probeGrantLiveness(txId: string): Promise<GrantLivenessResult> {
        const config = this.requireConfig();
        let json: {
            data?: { transactions?: IndexerTx[] };
            errors?: unknown;
        };
        // 헤더와 본문을 합쳤 하나의 데드라인이다 — 이 조회는 사용자 grant 락 안에서 도니 총 보유 시간이 상한을 넘으면 안 된다.
        const deadline = Date.now() + GRANT_PROBE_TIMEOUT_MS;
        try {
            const res = await fetch(config.indexerUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    query: INDEXER_TX_QUERY,
                    variables: { id: txId },
                }),
                signal: AbortSignal.timeout(GRANT_PROBE_TIMEOUT_MS),
            });
            if (!res.ok)
                return {
                    state: 'inconclusive',
                    reason: `indexer ${res.status}`,
                };
            // 본문 읽기는 남은 시간만 준다 — fetch 의 signal 은 undici 에서 본문 읽기도 끊지만, 그 동작에
            // 기대지 않고 여기서 직접 보장한다(응답 헤더는 왔는데 본문이 멈추면 락을 잡은 채 매달린다).
            let bodyTimer: NodeJS.Timeout | undefined;
            try {
                json = await Promise.race([
                    res.json(),
                    new Promise<never>((_, reject) => {
                        bodyTimer = setTimeout(
                            () => reject(new ProbeBodyTimeoutError()),
                            Math.max(0, deadline - Date.now()),
                        );
                    }),
                ]);
            } finally {
                clearTimeout(bodyTimer);
            }
        } catch (e) {
            const err = e as { name?: string; message?: string };
            const reason =
                e instanceof ProbeBodyTimeoutError
                    ? `indexer body read timeout after ${GRANT_PROBE_TIMEOUT_MS}ms`
                    : err?.name === 'TimeoutError' || err?.name === 'AbortError'
                      ? `indexer timeout after ${GRANT_PROBE_TIMEOUT_MS}ms`
                      : `indexer unreachable: ${err?.message ?? String(e)}`;
            return { state: 'inconclusive', reason };
        }
        if (json.errors)
            return {
                state: 'inconclusive',
                reason: `graphql errors: ${JSON.stringify(json.errors).slice(0, 200)}`,
            };
        const txs = json.data?.transactions;
        if (!Array.isArray(txs))
            return { state: 'inconclusive', reason: 'malformed response' };
        const tx = txs[0];
        if (!tx) return { state: 'absent' };
        const status = tx.transactionResult?.status;
        if (
            status !== 'SUCCESS' &&
            status !== 'PARTIAL_SUCCESS' &&
            status !== 'FAILURE'
        )
            return {
                state: 'inconclusive',
                reason: `unknown transactionResult ${String(status)}`,
            };
        if (status !== 'SUCCESS') return { state: 'failed', status };
        const expected = config.tournamentFinalizerAddress.toLowerCase();
        const hasAction = (tx.contractActions ?? []).some(
            (a) => a?.address?.toLowerCase() === expected,
        );
        if (!hasAction) return { state: 'failed', status: 'MISSING_ACTION' };
        return { state: 'success' };
    }

    /**
     * Lace `signData(message, { encoding: 'text', keyType: 'unshielded' })` 검증.
     *
     * 지갑이 돌려주는 `Signature.data` 의 인코딩은 구현마다 달라(text 원문 | hex | base64) 후보를 모두
     * 만들어 본다. 서명 대상 바이트는 "프리픽스 + message" 일 수 있으므로 각 후보가 message 바이트로
     * 끝나는지(=사용자가 실제 그 메시지에 서명했는지) 확인한 뒤 `verifySignature` 를 시도한다.
     * 성공한 조합은 로그로 남겨 포맷을 확정할 수 있게 한다.
     */
    async verifyAuthSignature(args: {
        message: string;
        signedData: string;
        signature: string;
        verifyingKey: string;
        expectedAddress: string;
    }): Promise<boolean> {
        const sdk = await loadMidnightSdk();
        const config = this.requireConfig();
        const msg = Buffer.from(args.message, 'utf8');
        const strip0x = (v: string) => v.replace(/^0x/i, '');
        const isHex = (v: string) =>
            /^[0-9a-fA-F]+$/.test(v) && v.length % 2 === 0;
        const isB64 = (v: string) =>
            /^[A-Za-z0-9+/]+=*$/.test(v) && v.length % 4 === 0;

        const dataCandidates: [string, Buffer][] = [
            ['text', Buffer.from(args.signedData, 'utf8')],
        ];
        if (isHex(strip0x(args.signedData)))
            dataCandidates.push([
                'hex',
                Buffer.from(strip0x(args.signedData), 'hex'),
            ]);
        if (isB64(args.signedData))
            dataCandidates.push([
                'base64',
                Buffer.from(args.signedData, 'base64'),
            ]);
        // 지갑이 data 를 돌려주지 않거나 다른 값을 줘도, message 원문 자체에 서명했을 가능성
        dataCandidates.push(['message', msg]);

        const sigCandidates: [string, string][] = [
            ['raw', strip0x(args.signature)],
        ];
        if (!isHex(strip0x(args.signature)) && isB64(args.signature))
            sigCandidates.push([
                'b64→hex',
                Buffer.from(args.signature, 'base64').toString('hex'),
            ]);
        const vkCandidates: [string, string][] = [
            ['raw', strip0x(args.verifyingKey)],
        ];
        if (!isHex(strip0x(args.verifyingKey)) && isB64(args.verifyingKey))
            vkCandidates.push([
                'b64→hex',
                Buffer.from(args.verifyingKey, 'base64').toString('hex'),
            ]);

        let verified: { vk: string; how: string } | undefined;
        for (const [dName, data] of dataCandidates) {
            if (
                data.length < msg.length ||
                !data.subarray(data.length - msg.length).equals(msg)
            )
                continue;
            for (const [sName, sig] of sigCandidates) {
                for (const [vName, vk] of vkCandidates) {
                    try {
                        if (
                            sdk.ledger.verifySignature(
                                vk,
                                new Uint8Array(data),
                                sig,
                            )
                        ) {
                            verified = {
                                vk,
                                how: `data=${dName} sig=${sName} vk=${vName}`,
                            };
                            break;
                        }
                    } catch {
                        /* 다음 후보 */
                    }
                }
                if (verified) break;
            }
            if (verified) break;
        }
        if (!verified) {
            this.logger.warn(
                `midnight signature rejected — data(len=${args.signedData.length}, hex=${isHex(strip0x(args.signedData))}, b64=${isB64(args.signedData)}, endsWithMsg(text)=${dataCandidates[0][1].subarray(-msg.length).equals(msg)}) ` +
                    `sig(len=${args.signature.length}, hex=${isHex(strip0x(args.signature))}) vk(len=${args.verifyingKey.length}, hex=${isHex(strip0x(args.verifyingKey))})`,
            );
            return false;
        }
        this.logger.log(`midnight signature ok (${verified.how})`);

        const addrHex = sdk.ledger.addressFromKey(verified.vk);
        const bech32 = sdk.addressFormat.UnshieldedAddress.codec
            .encode(
                config.networkId === 'undeployed'
                    ? 'undeployed'
                    : config.networkId,
                new sdk.addressFormat.UnshieldedAddress(
                    Buffer.from(addrHex, 'hex'),
                ),
            )
            .toString();
        const ok = bech32.toLowerCase() === args.expectedAddress.toLowerCase();
        if (!ok)
            this.logger.warn(
                `midnight address mismatch: derived ${bech32} vs message ${args.expectedAddress}`,
            );
        return ok;
    }

    // =========================
    // DATA MARKET (docs/market-dev-plan.md)
    // =========================

    /** 결제 수신용 오퍼레이터 unshielded 주소 (bech32m). */
    async operatorAddress(): Promise<string> {
        const { operator } = await this.getCtx();
        return operator.unshieldedAddress;
    }

    /** FE 가 Lace makeTransfer 의 DesiredOutput.type 에 그대로 쓰는 tNIGHT raw token type (hex). */
    async nativeTokenRaw(): Promise<string> {
        const { sdk } = await this.getCtx();
        return sdk.ledger.nativeToken().raw;
    }

    async isBuyerRegistered(buyerPkHex: string): Promise<boolean> {
        const ledger = await this.readLedger();
        return ledger.buyers.member(bytes32(buyerPkHex, 'buyerPk'));
    }

    /** 오퍼레이터가 구매자 키를 온체인 등록. 이미 등록돼 있으면 호출 전에 isBuyerRegistered 로 걸러라. */
    async registerBuyer(
        buyerPkHex: string,
    ): Promise<{ txId: string; blockHeight: number }> {
        const { contract } = await this.getCtx();
        const tx = await contract.callTx.registerBuyer(
            bytes32(buyerPkHex, 'buyerPk'),
        );
        return {
            txId: tx.public.txId,
            blockHeight: Number(tx.public.blockHeight),
        };
    }

    /**
     * 판매 증명 제출. `pinnedRows` 는 datasetJson 을 만든 바로 그 로우 목록이어야 한다 —
     * witness 가 이 pin 을 읽으므로 증명 중 escrow 가 늘어나도 안전하다. 60~90초 소요.
     */
    async sellRows(args: {
        buyerPkHex: string;
        tournamentId: number;
        specHashHex: string;
        datasetHashHex: string;
        pinnedRows: PinnedEscrowRow[];
    }): Promise<{ txId: string; blockHeight: number }> {
        const { contract } = await this.getCtx();
        this.pinnedRows = args.pinnedRows;
        try {
            const tx = await contract.callTx.sellRows(
                bytes32(args.buyerPkHex, 'buyerPk'),
                BigInt(args.tournamentId),
                bytes32(args.specHashHex, 'specHash'),
                bytes32(args.datasetHashHex, 'datasetHash'),
            );
            return {
                txId: tx.public.txId,
                blockHeight: Number(tx.public.blockHeight),
            };
        } finally {
            this.pinnedRows = null;
        }
    }

    /** licenseId = H(buyerPk, tournamentId, specHash) 로 온체인 License 조회. 없으면 null. */
    async getLicense(
        buyerPkHex: string,
        tournamentId: number,
        specHashHex: string,
    ): Promise<OnChainLicense | null> {
        const { TF } = await this.getCtx();
        const ledger = await this.readLedger();
        const id = TF.pureCircuits.licenseId(
            bytes32(buyerPkHex, 'buyerPk'),
            BigInt(tournamentId),
            bytes32(specHashHex, 'specHash'),
        );
        if (!ledger.licenses.member(id)) return null;
        const lic = ledger.licenses.lookup(id);
        return {
            tournamentId: Number(lic.tournamentId),
            rowCount: Number(lic.rowCount),
            sampleAtSale: Number(lic.sampleAtSale),
            datasetHash: toHex(lic.datasetHash),
            commitDigest: toHex(lic.commitDigest),
            querySpecHash: toHex(lic.querySpecHash),
            buyerPk: toHex(lic.buyerPk),
        };
    }

    /** 온체인 sampleCount (해당 토너먼트의 누적 finalize 수). */
    async sampleCountOf(tournamentId: number): Promise<number> {
        const ledger = await this.readLedger();
        const tid = BigInt(tournamentId);
        return ledger.sampleCount.member(tid)
            ? Number(ledger.sampleCount.lookup(tid).read())
            : 0;
    }
}

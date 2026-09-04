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
};

export type IndexerTx = {
    hash: string;
    block: { height: number; hash: string; timestamp: number };
    contractActions: { address: string }[];
};

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
                    if (!hasher) throw new Error(`escrow row has invalid bracket length ${r.bracket?.length ?? 0}`);
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
                        row: { tournamentId: 0n, itemId: 0n, bracketHash: zero, segment: zero },
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

        this.logger.log(
            `joined TournamentFinalizer ${config.tournamentFinalizerAddress} as ${operator.unshieldedAddress}`,
        );
        return { sdk, TF, operator, providers, contract };
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
        const { TF } = await this.getCtx();
        const ledger = await this.readLedger();
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
                ledger.domainTag,
                bytes32(userPkHex, 'userPk'),
                BigInt(tournamentId),
                BigInt(point),
                deadline,
                bHash,
            ),
        );
    }

    async grantEligibility(
        leafHex: string,
    ): Promise<{ txId: string; blockHeight: number }> {
        const { contract } = await this.getCtx();
        const tx = await contract.callTx.grantEligibility(fromHex(leafHex));
        return {
            txId: tx.public.txId,
            blockHeight: Number(tx.public.blockHeight),
        };
    }

    /** 인덱서에서 트랜잭션 조회 (identifier = txId). 없으면 null. */
    async getTransaction(txId: string): Promise<IndexerTx | null> {
        const config = this.requireConfig();
        const res = await fetch(config.indexerUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                query: `query($id: HexEncoded!) { transactions(offset: { identifier: $id }) { hash block { height hash timestamp } contractActions { address } } }`,
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

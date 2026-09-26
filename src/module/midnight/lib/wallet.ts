/**
 * 오퍼레이터(finalizeSigner) 지갑 — PNYX-Contract/scripts/lib/wallet.ts 를 NestJS 용으로 옮김.
 * (example-counter, Apache-2.0 에서 파생) 동기화 체크포인트/배치 동기화/keepAlive 등 preprod 에서
 * 실측으로 필요했던 설정을 그대로 유지한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import type { MidnightConfig } from '../midnight.config';
import type { MidnightSdk } from './sdk';

type Ledger = typeof import('@midnight-ntwrk/ledger-v8');
type WalletFacade = any; // ESM 전용 — sdk.ts 참고
type UnshieldedKeystore = any;

export interface OperatorWallet {
    wallet: WalletFacade;
    shieldedSecretKeys: any;
    dustSecretKey: any;
    unshieldedKeystore: UnshieldedKeystore;
    coinPublicKey: string;
    encryptionPublicKey: string;
    unshieldedAddress: string;
}

type Checkpoint = {
    shielded: string;
    unshielded: string;
    dust: string;
    savedAt: string;
};

const logger = new Logger('MidnightWallet');

// 정상 복원이면 첫 배치가 수 초 안에 적용된다 — 이만큼 아무 진행이 없으면 체크포인트가 못 쓰는 것이다.
const CHECKPOINT_STALL_MS = 90_000;

class StaleCheckpointError extends Error {}

function readCheckpoint(file: string): Checkpoint | undefined {
    try {
        return fs.existsSync(file)
            ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Checkpoint)
            : undefined;
    } catch {
        return undefined;
    }
}

export async function saveCheckpoint(
    file: string,
    wallet: WalletFacade,
): Promise<void> {
    const cp: Checkpoint = {
        shielded: await wallet.shielded.serializeState(),
        unshielded: await wallet.unshielded.serializeState(),
        dust: await wallet.dust.serializeState(),
        savedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cp));
}

// unshielded + dust 만 동기화되면 트랜잭션 가능 (shielded 코인은 쓰지 않는다)
const isReady = (s: any): boolean =>
    s.unshielded.progress.isStrictlyComplete() &&
    s.dust.progress.isStrictlyComplete();

export async function buildOperatorWallet(
    sdk: MidnightSdk,
    config: MidnightConfig,
): Promise<OperatorWallet> {
    const {
        ledger,
        facade,
        hd,
        shielded,
        unshielded,
        dust,
        abstractions,
        networkId: nid,
        rxjs: Rx,
    } = sdk;
    const networkId = nid.getNetworkId();

    const hdw = hd.HDWallet.fromSeed(Buffer.from(config.walletSeed, 'hex'));
    if (hdw.type !== 'seedOk')
        throw new Error('MIDNIGHT_WALLET_SEED is invalid');
    const derived = hdw.hdWallet
        .selectAccount(0)
        .selectRoles([hd.Roles.Zswap, hd.Roles.NightExternal, hd.Roles.Dust])
        .deriveKeysAt(0);
    if (derived.type !== 'keysDerived')
        throw new Error('Failed to derive Midnight keys');
    hdw.hdWallet.clear();

    const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(
        derived.keys[hd.Roles.Zswap],
    );
    const dustSecretKey = ledger.DustSecretKey.fromSeed(
        derived.keys[hd.Roles.Dust],
    );
    const unshieldedKeystore = unshielded.createKeystore(
        derived.keys[hd.Roles.NightExternal],
        networkId,
    );

    const savedCp = readCheckpoint(config.walletStateFile);
    if (savedCp)
        logger.log(`restoring wallet sync checkpoint from ${savedCp.savedAt}`);

    let started: { wallet: WalletFacade; synced: any };
    try {
        started = await startAndSync(savedCp);
    } catch (e) {
        if (!(e instanceof StaleCheckpointError)) throw e;
        logger.warn(`${e.message} — discarding it and syncing from genesis`);
        started = await startAndSync(undefined);
    }
    const { wallet, synced } = started;

    // 체크포인트는 재시작 시 동기화 시간을 아끼는 캐시일 뿐이다 — 읽기 전용 FS 등으로 못 써도 부팅은 계속한다.
    try {
        await saveCheckpoint(config.walletStateFile, wallet);
    } catch (e) {
        logger.warn(
            `wallet checkpoint not saved (${config.walletStateFile}): ${e instanceof Error ? e.message : String(e)}`,
        );
    }

    const night =
        synced.unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;
    const dustBalance = synced.dust.balance(new Date());
    logger.log(
        `operator wallet ready — ${unshieldedKeystore.getBech32Address().toString()} | tNight ${night} | DUST ${dustBalance}`,
    );
    if (dustBalance === 0n)
        logger.warn(
            'operator wallet has no DUST — register NIGHT for dust generation (PNYX-Contract scripts do this on first run)',
        );

    return {
        wallet,
        shieldedSecretKeys,
        dustSecretKey,
        unshieldedKeystore,
        coinPublicKey: synced.shielded.coinPublicKey.toHexString(),
        encryptionPublicKey: synced.shielded.encryptionPublicKey.toHexString(),
        unshieldedAddress: unshieldedKeystore.getBech32Address().toString(),
    };

    async function startAndSync(
        cp: Checkpoint | undefined,
    ): Promise<{ wallet: WalletFacade; synced: any }> {
        const wallet = await facade.WalletFacade.init({
            configuration: {
                networkId,
                indexerClientConnection: {
                    indexerHttpUrl: config.indexerUrl,
                    indexerWsUrl: config.indexerWsUrl,
                    keepAlive: 10_000,
                },
                provingServerUrl: new URL(config.proofServerUrl),
                relayURL: new URL(config.nodeUrl.replace(/^http/, 'ws')),
                txHistoryStorage:
                    new abstractions.NoOpTransactionHistoryStorage(),
                costParameters: {
                    additionalFeeOverhead: 300_000_000_000_000n,
                    feeBlocksMargin: 5,
                },
                batchUpdates: { size: 2000, timeout: 250 },
            },
            shielded: (cfg) =>
                cp
                    ? shielded.ShieldedWallet(cfg).restore(cp.shielded)
                    : shielded
                          .ShieldedWallet(cfg)
                          .startWithSecretKeys(shieldedSecretKeys),
            unshielded: (cfg) =>
                cp
                    ? unshielded.UnshieldedWallet(cfg).restore(cp.unshielded)
                    : unshielded
                          .UnshieldedWallet(cfg)
                          .startWithPublicKey(
                              unshielded.PublicKey.fromKeyStore(
                                  unshieldedKeystore,
                              ),
                          ),
            dust: (cfg) =>
                cp
                    ? dust.DustWallet(cfg).restore(cp.dust)
                    : dust
                          .DustWallet(cfg)
                          .startWithSecretKey(
                              dustSecretKey,
                              ledger.LedgerParameters.initialParameters().dust,
                          ),
        });
        await wallet.start(shieldedSecretKeys, dustSecretKey);

        let ticks = 0;
        let lastProgressKey = '';
        let lastProgressAt = Date.now();
        const ready: Promise<any> = Rx.firstValueFrom(
            (wallet.state() as import('rxjs').Observable<any>).pipe(
                Rx.tap((s: any) => {
                    const key = `${s.shielded?.progress?.appliedIndex}|${s.dust.progress.appliedIndex}|${s.unshielded.progress.appliedId}`;
                    if (key === lastProgressKey) return;
                    lastProgressKey = key;
                    lastProgressAt = Date.now();
                }),
                Rx.throttleTime(15_000),
                Rx.tap((s: any) => {
                    if (isReady(s)) return;
                    ticks += 1;
                    logger.log(
                        `sync dust ${s.dust.progress.appliedIndex} | unshielded ${s.unshielded.progress.appliedId}/${s.unshielded.progress.highestTransactionId}`,
                    );
                    if (ticks % 8 === 0)
                        void saveCheckpoint(
                            config.walletStateFile,
                            wallet,
                        ).catch(() => undefined);
                }),
                Rx.filter((s: any) => isReady(s)),
            ),
        );
        if (!cp) return { wallet, synced: await ready };

        // 복원한 체크포인트가 인덱서와 어긋나면(재인덱싱으로 이벤트 id 가 밀린 경우 등) SDK 는
        // "values inserted non-linearly into … commitment tree" 를 내며 같은 자리에서 영원히 재시도한다.
        // 진행이 멈춘 채로 남아 있으면 체크포인트를 버리고 genesis 부터 다시 동기화한다.
        let watchdog: NodeJS.Timeout | undefined;
        const stalled = new Promise<never>((_, reject) => {
            watchdog = setInterval(() => {
                if (Date.now() - lastProgressAt >= CHECKPOINT_STALL_MS)
                    reject(
                        new StaleCheckpointError(
                            `wallet checkpoint from ${cp.savedAt} made no sync progress for ${CHECKPOINT_STALL_MS / 1000}s`,
                        ),
                    );
            }, 5_000);
        });
        try {
            return { wallet, synced: await Promise.race([ready, stalled]) };
        } catch (e) {
            ready.catch(() => undefined); // stop() 이 state 스트림을 끝내며 내는 EmptyError
            await wallet.stop().catch(() => undefined);
            throw e;
        } finally {
            clearInterval(watchdog);
        }
    }
}

/** wallet-sdk signRecipe 의 proof marker 버그 우회 — PNYX-Contract scripts/lib/wallet.ts 와 동일 */
function signTransactionIntents(
    ledger: Ledger,
    tx: { intents?: Map<number, any> },
    signFn: (p: Uint8Array) => string,
    marker: 'proof' | 'pre-proof',
): void {
    if (!tx.intents || tx.intents.size === 0) return;
    for (const segment of tx.intents.keys()) {
        const intent = tx.intents.get(segment);
        if (!intent) continue;
        const cloned = ledger.Intent.deserialize(
            'signature',
            marker,
            'pre-binding',
            intent.serialize(),
        ) as any;
        const signature = signFn(cloned.signatureData(segment));
        for (const key of [
            'fallibleUnshieldedOffer',
            'guaranteedUnshieldedOffer',
        ]) {
            const offer = cloned[key];
            if (offer) {
                const sigs = offer.inputs.map(
                    (_: unknown, i: number) =>
                        offer.signatures.at(i) ?? signature,
                );
                cloned[key] = offer.addSignatures(sigs);
            }
        }
        tx.intents.set(segment, cloned);
    }
}

export function walletProviders(sdk: MidnightSdk, op: OperatorWallet) {
    return {
        getCoinPublicKey: () => op.coinPublicKey,
        getEncryptionPublicKey: () => op.encryptionPublicKey,
        async balanceTx(tx: any, ttl?: Date) {
            const recipe = await op.wallet.balanceUnboundTransaction(
                tx,
                {
                    shieldedSecretKeys: op.shieldedSecretKeys,
                    dustSecretKey: op.dustSecretKey,
                },
                { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
            );
            const signFn = (p: Uint8Array) => op.unshieldedKeystore.signData(p);
            signTransactionIntents(
                sdk.ledger,
                recipe.baseTransaction as any,
                signFn,
                'proof',
            );
            if (recipe.balancingTransaction)
                signTransactionIntents(
                    sdk.ledger,
                    recipe.balancingTransaction as any,
                    signFn,
                    'pre-proof',
                );
            return op.wallet.finalizeRecipe(recipe);
        },
        // facade 의 `submitTransaction` 은 `waitForStatus: 'Finalized'` 로 고정돼 있어 Substrate 최종성(≈18s)까지
        // 기다린다. 우리는 블록 포함('InBlock', 블록 타임 ≈6s)까지만 기다린다 — 포함된 tx 가 최종성에서 빠지는
        // 경우는 사실상 없고, 만에 하나 빠지면 grant 재사용 경로의 인덱서 프로브가 잡아 같은 leaf 를 재발급한다.
        // pending 등록/revert 는 facade 의 submitTransaction 과 같은 순서로 직접 한다(코인 이중 사용 방지).
        submitTx: async (tx: any) => {
            const wallet = op.wallet as any;
            try {
                await wallet.pendingTransactionsService.addPendingTransaction(
                    tx,
                );
                await wallet.submissionService.submitTransaction(tx, 'InBlock');
                return tx.identifiers().at(-1);
            } catch (e) {
                await wallet.revert(tx);
                throw e;
            }
        },
    };
}

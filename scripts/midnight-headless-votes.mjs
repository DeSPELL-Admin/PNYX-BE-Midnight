/**
 * Midnight 헤드리스 투표 생성기 — 데이터 마켓 데모용으로 한 토너먼트에 실제 온체인 투표를 N개 쌓는다.
 *
 * 투표 하나 = 브라우저 finalize 플로우 전체:
 *   새 시뮬레이션 Lace 지갑으로 로그인 → GET /tournaments/:id/rounds/:n (playVerification)
 *   → POST /chains/:chainId/signatures/tournament-finalize (BE 가 eligibility leaf 온체인 삽입)
 *   → finalizeTournament{16|32|64} ZK 증명 + 제출 (userSecret / voteSalt 는 투표마다 새로 생성)
 *   → POST /chains/:chainId/midnight/finalize-confirm → POST /chains/:chainId/escrow
 *
 * 왜 이렇게 해야 하나: sellRows 회로가 판매 로우마다 온체인 voteCommits 멤버십을 검증한다
 * (RowNotOnChain). DB 에 로우를 직접 넣으면 판매 증명이 실패하므로 투표는 반드시 온체인이어야 한다.
 * nullifier 는 hash(userSecret, tournamentId) 라 지갑이 아니라 userSecret 만 다르면 되고,
 * 수수료·제출은 BE 오퍼레이터 지갑(MIDNIGHT_WALLET_SEED)을 그대로 쓴다.
 *
 *   npm run build                                   # dist/ 의 sdk/wallet 로더를 재사용한다
 *   bash scripts/start-local.sh node scripts/midnight-headless-votes.mjs \
 *       [baseUrl] [origin] [tournamentId] [count] [--round=16|32|64] [--champion=<itemId>] [--pause=<sec>]
 *       [--contract-dir=<dir with keys/finalizeTournament*.prover>]   # 기본: ../PNYX-Contract/contracts/managed/TournamentFinalizer
 *
 *   예) 로컬 BE 에 토너먼트 0 투표 2개:
 *       bash scripts/start-local.sh node scripts/midnight-headless-votes.mjs http://127.0.0.1:3001 http://localhost:3000 0 2
 *   예) dev 서버에 10개 (로컬 proof server 대신 호스팅 주소를 쓰려면 env 로 덮어쓴다):
 *       bash scripts/start-local.sh env MIDNIGHT_PROOF_SERVER_URL=https://proof.midnight.pnyx.fun \
 *           node scripts/midnight-headless-votes.mjs https://midnight.pnyx.fun https://midnight.pnyx.fun 0 10
 *
 * 주의
 *   - BE(grant) 와 이 스크립트(finalize) 가 같은 오퍼레이터 지갑을 쓴다. 투표는 직렬로 돌리고
 *     확정 후 --pause 만큼 쉬어 BE 지갑이 인덱서에서 이 스크립트의 지출을 반영할 시간을 준다.
 *   - 지갑 체크포인트는 BE 가 쓰는 파일과 충돌하지 않도록 `.headless.json` 사본에 저장한다.
 *   - 브래킷은 서빙된 아이템의 무작위 순열이다(BE 는 아이템 집합만 검증). [0] 이 우승.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { signData, signatureVerifyingKey } from '@midnight-ntwrk/ledger-v8';

const require = createRequire(import.meta.url);
const { loadMidnightSdk } = require('../dist/module/midnight/lib/sdk.js');
const { buildOperatorWallet, walletProviders } = require('../dist/module/midnight/lib/wallet.js');
const { loadMidnightConfig } = require('../dist/module/midnight/midnight.config.js');
const { pad32, toHex } = require('../dist/module/midnight/lib/bytes.js');

// ---- 인자 ----
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
        const [k, v = 'true'] = a.slice(2).split('=');
        return [k, v];
    }),
);
const [base = 'http://127.0.0.1:3001', origin = 'http://localhost:3000', tournamentArg = '0', countArg = '1'] = positional;
const tournamentId = Number(tournamentArg);
const count = Number(countArg);
const round = Number(flags.round ?? 16);
const forcedChampion = flags.champion !== undefined ? Number(flags.champion) : undefined;
const pauseSec = Number(flags.pause ?? 10);
if (![16, 32, 64].includes(round)) throw new Error(`--round must be 16|32|64 (got ${round})`);
if (!Number.isInteger(count) || count < 1) throw new Error(`count must be >= 1 (got ${countArg})`);

const config = loadMidnightConfig();
const chainId = String(config.chainId);
const api = `${base}/api/v1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString().slice(11, 19);
const log = (msg) => console.log(`[${now()}] ${msg}`);

// ---- HTTP 세션 (투표마다 새 지갑 = 새 쿠키 통) ----
function session() {
    let cookies = '';
    const merge = (res) => {
        const set = res.headers.getSetCookie?.() ?? [];
        if (set.length)
            cookies = [...new Set([...cookies.split('; ').filter(Boolean), ...set.map((c) => c.split(';')[0])])].join('; ');
    };
    return async function call(method, p, body) {
        const res = await fetch(`${api}${p}`, {
            method,
            headers: { origin, ...(cookies ? { cookie: cookies } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        merge(res);
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch { json = text; }
        if (res.status < 200 || res.status >= 300) {
            const detail = typeof json === 'string' ? json : JSON.stringify(json);
            throw new Error(`${method} ${p} → ${res.status}: ${detail.slice(0, 300)}`);
        }
        return json?.data; // escrow 는 204 No Content
    };
}

// ---- 시뮬레이션 Lace 지갑 로그인 (midnight-e2e-smoke.mjs 와 동일) ----
async function loginFreshWallet(call, network) {
    const seed = randomBytes(32).toString('hex');
    const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
    const keys = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0).keys;
    const ks = createKeystore(keys[Roles.NightExternal], network);
    const address = ks.getBech32Address().toString();
    const sk = ks.getSecretKey().toString('hex');

    const { nonce, statement } = await call('GET', '/auth/nonce');
    const host = new URL(origin).host;
    const message = [
        `${host} wants you to sign in with your Midnight account:`, address, '',
        ...(statement ? [statement, ''] : []),
        `URI: ${origin}`, 'Version: 1', `Chain ID: ${chainId}`, `Nonce: ${nonce}`, `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
    const payload = Buffer.from(message, 'utf8');
    await call('POST', '/auth/midnight/verify', {
        message,
        signedData: payload.toString('hex'),
        signature: signData(sk, new Uint8Array(payload)),
        verifyingKey: signatureVerifyingKey(sk),
    });
    return { address, seed };
}

// ---- 브래킷: 서빙된 아이템의 무작위 순열, [0]=우승 ----
function makeBracket(itemIds) {
    const arr = [...itemIds];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (forcedChampion !== undefined) {
        const idx = arr.indexOf(forcedChampion);
        if (idx < 0) throw new Error(`--champion=${forcedChampion} 은 이번에 서빙된 아이템(${itemIds.join(',')})에 없다`);
        [arr[0], arr[idx]] = [arr[idx], arr[0]];
    }
    return arr;
}
const encodeTournamentData = (bracket) => '0x' + bracket.map((id) => id.toString(16).padStart(4, '0')).join('');

// ---- 투표자용 private state provider (메모리) — 투표마다 새 userSecret/voteSalt 를 확실히 쓰기 위해 ----
function memoryPrivateStateProvider() {
    const states = new Map();
    const keys = new Map();
    return {
        setContractAddress() {},
        async set(id, s) { states.set(id, s); },
        async get(id) { return states.get(id) ?? null; },
        async remove(id) { states.delete(id); },
        async clear() { states.clear(); },
        async setSigningKey(a, k) { keys.set(a, k); },
        async getSigningKey(a) { return keys.get(a) ?? null; },
        async removeSigningKey(a) { keys.delete(a); },
        async clearSigningKeys() { keys.clear(); },
        async exportPrivateStates() { throw new Error('not supported'); },
        async importPrivateStates() { throw new Error('not supported'); },
        async exportSigningKeys() { throw new Error('not supported'); },
        async importSigningKeys() { throw new Error('not supported'); },
    };
}

// ---- 투표자 witness (FE TournamentFinalizer.witnesses.ts 와 동일 의미) ----
const ELIGIBILITY_DEPTH = 16;
const zero = new Uint8Array(32);
const emptyPath = (leaf) => ({
    leaf,
    path: Array.from({ length: ELIGIBILITY_DEPTH }, () => ({ sibling: { field: 0n }, goes_left: false })),
});
const voterWitnesses = {
    userSecret: ({ privateState }) => [privateState, privateState.userSecret],
    voteSalt: ({ privateState }) => [privateState, privateState.voteSalt],
    eligibilityPath: ({ ledger, privateState }, leaf) => [privateState, ledger.eligibility.findPathForLeaf(leaf) ?? emptyPath(leaf)],
    escrowRows: ({ privateState }) => [
        privateState,
        Array.from({ length: 8 }, () => ({
            present: false,
            row: { tournamentId: 0n, itemId: 0n, bracketHash: zero, segment: zero },
            salt: zero,
            path: emptyPath(zero),
        })),
    ],
};

/** ContractRuntimeError 는 assert 이름이 cause 안에 묻혀 있다 — 체인을 펼쳐서 보여준다. */
function describeError(e) {
    const parts = [];
    let cur = e;
    for (let d = 0; cur && d < 6; d++) {
        const m = cur?.message ?? String(cur);
        if (m && !parts.includes(m)) parts.push(m);
        cur = cur?.cause;
    }
    return parts.join(' ← ').slice(0, 500);
}

/**
 * BE 의 grant 는 tx 제출 직후 응답한다. 인덱서가 그 블록을 반영하기 전에 회로를 돌리면
 * eligibilityPath 를 못 찾아 "InvalidSigner" 로 실패하므로, leaf 가 보일 때까지 기다린다.
 * (BE 의 registerBuyer 도 같은 이유로 buyers.member 를 폴링한다.)
 */
async function waitForEligibilityLeaf(publicDataProvider, TF, leafHex, { timeoutMs = 120_000, everyMs = 3_000 } = {}) {
    const leaf = Uint8Array.from(Buffer.from(leafHex, 'hex'));
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        const st = await publicDataProvider.queryContractState(config.tournamentFinalizerAddress);
        if (st && TF.ledger(st.data).eligibility.findPathForLeaf(leaf)) return (Date.now() - t0) / 1000;
        await sleep(everyMs);
    }
    throw new Error(`grant leaf 가 ${timeoutMs / 1000}s 안에 인덱서에 나타나지 않았다`);
}

async function withRetry(label, fn, { tries = 12, delayMs = 5_000 } = {}) {
    let last;
    for (let i = 1; i <= tries; i++) {
        try { return await fn(); } catch (e) {
            last = e;
            if (i < tries) { log(`  ${label} 실패 (${i}/${tries}): ${String(e.message ?? e).slice(0, 160)} — ${delayMs / 1000}s 후 재시도`); await sleep(delayMs); }
        }
    }
    throw last;
}

async function main() {
    log(`target ${base} (origin ${origin}) · tournament ${tournamentId} · round ${round} · votes ${count} · chainId ${chainId}`);

    // ---- 오퍼레이터 지갑 + 컨트랙트 (BE 와 같은 시드, 체크포인트는 사본에) ----
    const sdk = await loadMidnightSdk();
    sdk.networkId.setNetworkId(config.networkId);
    const network = sdk.networkId.getNetworkId();

    const headlessState = config.walletStateFile.replace(/\.json$/, '') + '.headless.json';
    if (fs.existsSync(config.walletStateFile)) fs.copyFileSync(config.walletStateFile, headlessState);
    const walletConfig = { ...config, walletStateFile: headlessState };

    // 컨트랙트 모듈(contract/index.js)은 반드시 BE 의 디렉터리에서 로드한다 — 다른 저장소의 사본을
    // import 하면 그쪽 node_modules 의 compact-runtime(WASM) 이 한 벌 더 올라와 indexer provider 가
    // 만든 상태와 instanceof 가 어긋난다("expected instance of ChargedState").
    const contractDir = path.resolve(config.contractDir);
    const TF = await import(pathToFileURL(path.join(contractDir, 'contract', 'index.js')).href);

    // 반면 BE 의 midnight-contract/ 에는 finalizeTournament*.prover 가 일부러 없다(브라우저 전용 회로).
    // 증명 키(keys/, zkir/)는 prover 가 있는 디렉터리에서 읽는다 — --contract-dir, 아니면
    // PNYX-Contract 의 managed 출력(동일 컴파일 결과, index.js 가 바이트 단위로 같다).
    const proverName = `finalizeTournament${round}.prover`;
    const hasProver = (dir) => fs.existsSync(path.join(dir, 'keys', proverName));
    const candidates = [
        flags['contract-dir'],
        config.contractDir,
        path.join('..', 'PNYX-Contract', 'contracts', 'managed', 'TournamentFinalizer'),
    ].filter(Boolean).map((d) => path.resolve(d));
    const zkDir = candidates.find(hasProver);
    if (!zkDir)
        throw new Error(
            `${proverName} 를 가진 디렉터리를 찾지 못했다 (확인한 경로: ${candidates.join(', ')}). ` +
            `--contract-dir=<PNYX-Contract/contracts/managed/TournamentFinalizer> 로 지정하라.`,
        );
    log(`contract module ${contractDir}\n           zk keys ${zkDir}`);

    log(`operator wallet 동기화 중 (checkpoint: ${headlessState})…`);
    const operator = await buildOperatorWallet(sdk, walletConfig);
    const wp = walletProviders(sdk, operator);
    const zkConfigProvider = new sdk.zkConfig.NodeZkConfigProvider(zkDir);
    const baseProviders = {
        publicDataProvider: sdk.indexer.indexerPublicDataProvider(config.indexerUrl, config.indexerWsUrl),
        zkConfigProvider,
        proofProvider: sdk.proof.httpClientProofProvider(config.proofServerUrl, zkConfigProvider),
        walletProvider: wp,
        midnightProvider: wp,
    };
    const compiled = sdk.compactJs.CompiledContract.make('TournamentFinalizer', TF.Contract).pipe(
        sdk.compactJs.CompiledContract.withWitnesses(voterWitnesses),
    );
    log(`operator ready · proof server ${config.proofServerUrl} · contract ${config.tournamentFinalizerAddress.slice(0, 16)}…`);

    const results = [];
    for (let i = 1; i <= count; i++) {
        const t0 = Date.now();
        console.log(`\n━━ vote ${i}/${count} ━━`);
        try {
            const call = session();
            const { address } = await loginFreshWallet(call, network);
            log(`  wallet ${address.slice(0, 28)}…`);

            const served = await call('GET', `/tournaments/${tournamentId}/rounds/${round}`);
            const bracket = makeBracket(served.randomItemIds);
            const tournamentData = encodeTournamentData(bracket);

            const userSecret = new Uint8Array(randomBytes(32));
            const voteSalt = new Uint8Array(randomBytes(32));
            const userPk = toHex(TF.pureCircuits.userPublicKey(userSecret));

            const grant = await withRetry('grant', () =>
                call('POST', `/chains/${chainId}/signatures/tournament-finalize`, { tournamentId, tournamentData, userPk }),
            { tries: 3, delayMs: 15_000 });
            const segment = grant.segment ?? 'all';
            log(`  grant ok · point ${grant.point} · champion item ${bracket[0]} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);

            // BE 와 동일하게 leaf 를 계산해 인덱서 반영을 기다린다 (domainTag 는 온체인 값)
            const stNow = await baseProviders.publicDataProvider.queryContractState(config.tournamentFinalizerAddress);
            const domainTag = TF.ledger(stNow.data).domainTag;
            const bracketHash = TF.pureCircuits[`bracketHash${round}`](bracket.map((id) => BigInt(id)));
            const leafHex = toHex(TF.pureCircuits.eligibilityLeaf(
                domainTag, TF.pureCircuits.userPublicKey(userSecret), BigInt(tournamentId), BigInt(grant.point), BigInt(grant.deadline), bracketHash,
            ));
            const waited = await waitForEligibilityLeaf(baseProviders.publicDataProvider, TF, leafHex);
            log(`  leaf visible on indexer after ${waited.toFixed(0)}s`);

            const providers = { ...baseProviders, privateStateProvider: memoryPrivateStateProvider() };
            const contract = await sdk.contracts.findDeployedContract(providers, {
                contractAddress: config.tournamentFinalizerAddress,
                compiledContract: compiled,
                privateStateId: 'pnyxHeadlessVoter',
                initialPrivateState: { userSecret, voteSalt },
            });
            const t1 = Date.now();
            const tx = await contract.callTx[`finalizeTournament${round}`](
                BigInt(tournamentId),
                BigInt(grant.point),
                BigInt(grant.deadline),
                bracket.map((id) => BigInt(id)),
                pad32(segment),
            );
            const txId = tx.public.txId;
            log(`  finalize submitted · tx ${txId.slice(0, 20)}… · proof+submit ${((Date.now() - t1) / 1000).toFixed(0)}s`);

            await withRetry('finalize-confirm', () =>
                call('POST', `/chains/${chainId}/midnight/finalize-confirm`, { tournamentId, txId }));
            log('  confirmed');

            await call('POST', `/chains/${chainId}/escrow`, {
                tournamentId, itemId: bracket[0], segment, salt: toHex(voteSalt), txId, bracket,
            });
            log(`  escrowed · total ${((Date.now() - t0) / 1000).toFixed(0)}s`);
            results.push({ i, ok: true, txId, champion: bracket[0], address });
        } catch (e) {
            const msg = describeError(e);
            log(`  ✗ vote ${i} 실패: ${msg}`);
            results.push({ i, ok: false, error: msg.slice(0, 200) });
        }
        if (i < count) { log(`  ${pauseSec}s 대기 (BE 지갑 동기화)`); await sleep(pauseSec * 1000); }
    }

    const ok = results.filter((r) => r.ok);
    console.log(`\n완료: ${ok.length}/${count} 투표 온체인 + escrow (tournament ${tournamentId})`);
    for (const r of results)
        console.log(r.ok ? `  #${r.i} champion=${r.champion} tx=${r.txId}` : `  #${r.i} FAILED ${r.error}`);
    process.exit(ok.length === count ? 0 : 1);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });

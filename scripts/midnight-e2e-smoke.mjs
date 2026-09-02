/**
 * Midnight 헤드리스 E2E — 브라우저 없이 BE 경로 전체를 검증한다.
 *
 *   nonce → Lace 서명(시뮬레이션) → /auth/midnight/verify → /me
 *   → GET /tournaments → GET /tournaments/:id/rounds/16 (playVerification 생성)
 *   → POST /chains/99101/signatures/tournament-finalize (온체인 grantEligibility)
 *
 * 브라우저에서만 가능한 단계(ZK 증명 생성 + Lace 제출 + finalize-confirm)는 마지막에 안내만 한다.
 *
 *   node scripts/midnight-e2e-smoke.mjs [baseUrl] [origin] [tournamentId]
 *   SMOKE_SEED=<64hex>  같은 지갑으로 반복 테스트하고 싶을 때 고정
 */
import 'dotenv/config';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { signData, signatureVerifyingKey } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { randomBytes } from 'node:crypto';

const [base = 'http://127.0.0.1:3001', origin = 'http://localhost:3000', tournamentId = '0'] = process.argv.slice(2);
const chainId = process.env.MIDNIGHT_CHAIN_ID ?? '99101';
const network = process.env.MIDNIGHT_NETWORK ?? 'preprod';
setNetworkId(network);

const api = `${base}/api/v1`;
let cookies = '';
const mergeCookies = (res) => {
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookies = [...new Set([...cookies.split('; ').filter(Boolean), ...set.map((c) => c.split(';')[0])])].join('; ');
};
async function call(method, path, body) {
    const res = await fetch(`${api}${path}`, {
        method,
        headers: { origin, ...(cookies ? { cookie: cookies } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    mergeCookies(res);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
}
const step = (n, label) => console.log(`\n[${n}] ${label}`);
const fail = (msg, detail) => { console.error(`  ✗ ${msg}`, typeof detail === 'string' ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300)); process.exit(1); };

// ---- 지갑(시뮬레이션 Lace) ----
const seed = process.env.SMOKE_SEED ?? randomBytes(32).toString('hex');
const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
const keys = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0).keys;
const ks = createKeystore(keys[Roles.NightExternal], network);
const address = ks.getBech32Address().toString();
const sk = ks.getSecretKey().toString('hex');
console.log(`wallet  ${address}\nseed    ${seed}  (SMOKE_SEED 로 재사용 가능)`);

// ---- 1. 로그인 ----
step(1, 'GET /auth/nonce → sign → POST /auth/midnight/verify');
const nonceRes = await call('GET', '/auth/nonce');
if (nonceRes.status !== 200) fail(`nonce ${nonceRes.status}`, nonceRes.json);
const { nonce, statement } = nonceRes.json.data;
const host = new URL(origin).host;
const message = [
    `${host} wants you to sign in with your Midnight account:`, address, '',
    ...(statement ? [statement, ''] : []),
    `URI: ${origin}`, 'Version: 1', `Chain ID: ${chainId}`, `Nonce: ${nonce}`, `Issued At: ${new Date().toISOString()}`,
].join('\n');
const payload = Buffer.from(message, 'utf8');
const verifyRes = await call('POST', '/auth/midnight/verify', {
    message,
    signedData: payload.toString('hex'),
    signature: signData(sk, new Uint8Array(payload)),
    verifyingKey: signatureVerifyingKey(sk),
});
if (verifyRes.status !== 200) fail(`verify ${verifyRes.status}`, verifyRes.json);
console.log(`  ✓ logged in — point ${verifyRes.json.data.point}`);

step(2, 'GET /me (세션 프로브)');
const me = await call('GET', '/me');
if (me.status !== 200) fail(`me ${me.status}`, me.json);
console.log(`  ✓ /me 200 — ${JSON.stringify(me.json.data)}`);

// ---- 3. 게임 데이터 ----
step(3, 'GET /tournaments (목록)');
const list = await call('GET', '/tournaments?page=1&limit=10&orderBy=LATEST&type=classic');
if (list.status !== 200) fail(`tournaments ${list.status}`, list.json);
const titles = (list.json.data ?? []).map((t) => `${t.tournamentId}:${t.title}`);
if (!titles.length) fail('토너먼트가 0건 — node scripts/seed-midnight-demo.mjs 먼저 실행', '');
console.log(`  ✓ ${titles.length}건 — ${titles.join(', ')}`);

step(4, `GET /tournaments/${tournamentId}/rounds/16 (라운드 서빙 = playVerification 생성)`);
const rounds = await call('GET', `/tournaments/${tournamentId}/rounds/16`);
if (rounds.status !== 200) fail(`rounds ${rounds.status}`, rounds.json);
const itemIds = rounds.json.data.randomItemIds;
console.log(`  ✓ served items: ${itemIds.join(', ')}`);

step('4b', `GET /tournaments/${tournamentId}/items/:itemId (게임 화면이 쓰는 아이템 상세)`);
for (const id of itemIds.slice(0, 2)) {
    const item = await call('GET', `/tournaments/${tournamentId}/items/${id}`);
    if (item.status !== 200) fail(`item ${id} → ${item.status} (시드의 itemId 가 0-based 인지 확인)`, item.json);
    console.log(`  ✓ item ${id}: ${item.json.data.name}`);
}

// ---- 5. grant (온체인) ----
const tournamentData = '0x' + itemIds.map((id) => id.toString(16).padStart(4, '0')).join('');
const userPk = randomBytes(32).toString('hex'); // 실제 FE 는 pureCircuits.userPublicKey(userSecret)
step(5, `POST /chains/${chainId}/signatures/tournament-finalize (온체인 grantEligibility — 20~40초)`);
console.log(`  tournamentData ${tournamentData}`);
const t0 = Date.now();
const grant = await call('POST', `/chains/${chainId}/signatures/tournament-finalize`, { tournamentId: Number(tournamentId), tournamentData, userPk });
if (grant.status !== 200) fail(`grant ${grant.status}`, grant.json);
const g = grant.json.data;
console.log(`  ✓ grant ${((Date.now() - t0) / 1000).toFixed(1)}s — exists=${g.exists} point=${g.point} deadline=${g.deadline}`);
console.log(`    txId ${g.txId}`);

console.log(`\n브라우저에서만 가능한 남은 단계:`);
console.log(`  6. finalizeTournament ZK 증명 생성 + Lace 제출  (FE Result 화면 Submit)`);
console.log(`  7. POST /chains/${chainId}/midnight/finalize-confirm { tournamentId, txId }  (FE 자동 호출)`);
console.log(`  8. consent>=2 면 POST /chains/${chainId}/escrow  (FE 자동 호출)`);

// Smoke: simulate a Lace wallet with the wallet SDK, log in via /auth/midnight/verify, then hit the grant endpoint.
//   node scripts/midnight-auth-smoke.mjs http://127.0.0.1:3061 http://localhost:3000
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { signData, signatureVerifyingKey } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { randomBytes } from 'node:crypto';

const [base = 'http://127.0.0.1:3061', origin = 'http://localhost:3000', chainId = '99101'] = process.argv.slice(2);
setNetworkId('preprod');
const hd = HDWallet.fromSeed(Buffer.from(process.env.SMOKE_SEED ?? "11".repeat(32), "hex"));
const keys = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0).keys;
const ks = createKeystore(keys[Roles.NightExternal], 'preprod');
const address = ks.getBech32Address().toString();
console.log('smoke wallet', address);
const vk = signatureVerifyingKey(ks.getSecretKey().toString('hex'));

const nonceRes = await fetch(`${base}/api/v1/auth/nonce`, { headers: { origin } });
const cookie = (nonceRes.headers.get('set-cookie') ?? '').split(';')[0];
const { data: { nonce, statement } } = await nonceRes.json();
const host = new URL(origin).host;
const message = [`${host} wants you to sign in with your Midnight account:`, address, '', ...(statement ? [statement, ''] : []), `URI: ${origin}`, 'Version: 1', `Chain ID: ${chainId}`, `Nonce: ${nonce}`, `Issued At: ${new Date().toISOString()}`].join('\n');
const signedBytes = Buffer.from(message, 'utf8');
const signature = signData(ks.getSecretKey().toString('hex'), new Uint8Array(signedBytes));

const verifyRes = await fetch(`${base}/api/v1/auth/midnight/verify`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin, cookie },
  body: JSON.stringify({ message, signedData: signedBytes.toString('hex'), signature, verifyingKey: vk }),
});
const verifyJson = await verifyRes.json();
console.log('verify →', verifyRes.status, JSON.stringify(verifyJson).slice(0, 200));
if (!verifyRes.ok) process.exit(1);
const auth = (verifyRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');


// ==== 데이터 마켓 E2E (docs/market-dev-plan.md Phase 1~2 검증) ====
const j = (r) => r.json();
const H = { 'content-type': 'application/json', origin, cookie: auth };

console.log('\n[M1] GET /market/products');
const prods = (await (await fetch(`${base}/api/v1/chains/${chainId}/market/products`, { headers: H })).json()).data;
console.log('  products:', prods.map((p) => `tid=${p.tournamentId} rows=${p.sellableRowCount} sample=${p.sampleCount} price=${p.priceUnits}`).join(' | ') || '(없음)');
const target = prods.find((p) => !p.soldOut);
if (!target) { console.log('판매 가능 상품 없음'); process.exit(1); }

console.log(`\n[M2] POST /market/orders (tid ${target.tournamentId})`);
const order = (await j(await fetch(`${base}/api/v1/chains/${chainId}/market/orders`, { method: 'POST', headers: H, body: JSON.stringify({ tournamentId: target.tournamentId }) }))).data;
console.log(`  order=${order.orderId} status=${order.status} price=${order.priceUnits} payTo=${order.payTo.slice(0, 24)}… tokenType=${order.tokenTypeRaw.slice(0, 12)}…`);

console.log('\n[M3] POST pay (데모: 결제 tx 검증 off, dummy txId)');
const paid = (await j(await fetch(`${base}/api/v1/chains/${chainId}/market/orders/${order.orderId}/pay`, { method: 'POST', headers: H, body: JSON.stringify({ txId: 'deadbeef'.repeat(8) }) }))).data;
console.log(`  status=${paid.status} stage=${paid.stage}`);

console.log('\n[M4] 폴링 (fulfill: registerBuyer → sellRows 증명 — 수 분)');
let cur = paid;
for (let i = 0; i < 100 && !['FULFILLED', 'FAILED'].includes(cur.status); i++) {
  await new Promise((r) => setTimeout(r, 3000));
  cur = (await j(await fetch(`${base}/api/v1/chains/${chainId}/market/orders/${order.orderId}`, { headers: H }))).data;
  if (i % 5 === 0 || ['FULFILLED', 'FAILED'].includes(cur.status)) console.log(`  ${cur.status}/${cur.stage} sellTx=${(cur.sellTxId ?? '').slice(0, 12)} err=${(cur.error ?? '').slice(0, 60)}`);
}
if (cur.status !== 'FULFILLED') { console.log('FULFILL 실패:', cur.error); process.exit(1); }
console.log(`  ✓ FULFILLED — deliveredRows=${cur.deliveredRowCount} sampleAtSale=${cur.sampleAtSale} licenseId=${(cur.licenseId ?? '').slice(0, 16)}…`);

console.log('\n[M5] dataset 다운로드 + 해시 대조');
const res = await fetch(`${base}/api/v1/chains/${chainId}/market/orders/${order.orderId}/dataset`, { headers: H });
const bytes = Buffer.from(await res.arrayBuffer());
const { createHash } = await import('node:crypto');
const localHash = createHash('sha256').update(bytes).digest('hex');
console.log(`  bytes=${bytes.length} sha256=${localHash.slice(0, 20)}…`);
console.log(`  onchain datasetHash=${cur.datasetHash.slice(0, 20)}…`);
console.log(localHash === cur.datasetHash ? '  ✓ HASH MATCH — 구매자 검증 통과' : '  ✗ HASH MISMATCH!');
console.log('\nMARKETSMOKE ' + (localHash === cur.datasetHash ? 'PASS' : 'FAIL'));

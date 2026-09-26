// Smoke: log in with the smoke wallet, then read-only checks of the buyer endpoints
//   GET /market/orders, GET /market/orders/:id/catalog, GET /market/orders/:id/dataset (if FULFILLED).
//   node scripts/market-orders-smoke.mjs http://127.0.0.1:3001 http://localhost:3000
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { signData, signatureVerifyingKey } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createHash } from 'node:crypto';

const [base = 'http://127.0.0.1:3001', origin = 'http://localhost:3000', chainId = '99101'] = process.argv.slice(2);
setNetworkId('preprod');
const hd = HDWallet.fromSeed(Buffer.from(process.env.SMOKE_SEED ?? '11'.repeat(32), 'hex'));
const keys = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0).keys;
const ks = createKeystore(keys[Roles.NightExternal], 'preprod');
const address = ks.getBech32Address().toString();
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
if (!verifyRes.ok) { console.log('login failed', verifyRes.status); process.exit(1); }
const auth = (verifyRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const H = { origin, cookie: auth };
const api = `${base}/api/v1/chains/${chainId}/market`;

console.log('[1] GET /market/orders');
const listRes = await fetch(`${api}/orders`, { headers: H });
const orders = (await listRes.json()).data ?? [];
console.log(`  ${listRes.status} → ${orders.length} orders`);
for (const o of orders) console.log(`  ${o.orderId.slice(0, 8)} tid=${o.tournamentId} ${o.status}/${o.stage} rows=${o.rowCount} updated=${o.updatedAt} datasetJson=${'datasetJson' in o ? 'LEAKED' : 'omitted'}`);

const first = orders[0];
if (!first) { console.log('no orders for smoke wallet'); process.exit(0); }

console.log(`\n[2] GET /market/orders/${first.orderId.slice(0, 8)}/catalog`);
const catRes = await fetch(`${api}/orders/${first.orderId}/catalog`, { headers: H });
const cat = (await catRes.json()).data;
console.log(`  ${catRes.status} → title="${cat?.tournamentTitle}" items=${cat?.items?.length}`, cat?.items?.slice(0, 3));

console.log('\n[3] catalog with a bogus order id (expect 404)');
console.log('  ', (await fetch(`${api}/orders/${'0'.repeat(32)}/catalog`, { headers: H })).status);

const fulfilled = orders.find((o) => o.status === 'FULFILLED');
if (fulfilled) {
  console.log(`\n[4] dataset of ${fulfilled.orderId.slice(0, 8)}`);
  const res = await fetch(`${api}/orders/${fulfilled.orderId}/dataset`, { headers: H });
  const bytes = Buffer.from(await res.arrayBuffer());
  const parsed = JSON.parse(bytes.toString('utf8'));
  const hash = createHash('sha256').update(bytes).digest('hex');
  console.log(`  v=${parsed.v} title=${parsed.tournamentTitle ?? '(none)'} rows=${parsed.rows.length} itemName=${parsed.rows[0]?.itemName ?? '(none)'} bracketNames=${parsed.rows[0]?.bracketNames?.slice(0, 3) ?? '(none)'}`);
  console.log(`  sha256 ${hash === fulfilled.datasetHash ? 'MATCH' : 'MISMATCH'}`);
}
console.log('\nORDERSMOKE DONE');

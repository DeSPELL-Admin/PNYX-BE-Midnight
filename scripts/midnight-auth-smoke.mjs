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

const grantRes = await fetch(`${base}/api/v1/chains/${chainId}/signatures/tournament-finalize`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin, cookie: auth },
  body: JSON.stringify({ tournamentId: 7, tournamentData: '0x0001000200030004', userPk: '6cb8ab57dea335cbcff5179f973eda5bf470201db75d643433e568c3cdf46c99' }),
});
console.log('grant  →', grantRes.status, (await grantRes.text()).slice(0, 200));

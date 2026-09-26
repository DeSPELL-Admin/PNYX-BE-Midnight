# PNYX — Authentic Data Protocol on Midnight (Backend)

NestJS API for PNYX, a preference-data protocol that collects "A vs B" tournament votes, seals them
on [Midnight](https://midnight.network) with zero-knowledge proofs, and sells verified vote rows to
businesses under on-chain licenses. Built for the **Midnight Korea Hackathon 2026**, running on preprod.

| Repository | Role |
| --- | --- |
| [PNYX-FE-Midnight](https://github.com/DeSPELL-Admin/PNYX-FE-Midnight) | Next.js app: wallet login, play, in-browser ZK proving, market, buyer verification |
| **PNYX-BE-Midnight** (this repo) | Operator API: auth, tournaments, eligibility grants, escrow, order fulfilment on-chain |
| [PNYX-Contract-Midnight](https://github.com/DeSPELL-Admin/PNYX-Contract-Midnight) | Compact contract `TournamentFinalizer`, tests, deploy scripts |

## What the backend does on Midnight

The backend runs the **operator wallet** (`finalizeSigner` of the contract) and drives the operator-side
circuits of `TournamentFinalizer`:

| Step | Route | On-chain action |
| --- | --- | --- |
| Login | `POST /api/v1/auth/midnight/verify` | verifies the wallet `signData` signature (ledger `verifySignature`) and issues a cookie session |
| Grant | `POST /api/v1/chains/99101/signatures/tournament-finalize` | validates the played bracket against the server-issued item set, computes `eligibilityLeaf(...)` with the contract's pure circuit and submits `grantEligibility(leaf)` |
| Confirm | `POST /api/v1/chains/99101/midnight/finalize-confirm` | checks the user's `finalizeTournament` tx on the indexer, then records play info, points and item statistics |
| Escrow | `POST /api/v1/chains/99101/escrow` | stores the vote row (`tournamentId, itemId, bracket, segment, salt`) that becomes the witness for `sellRows` |
| Market | `GET/POST /api/v1/chains/99101/market/*` | products, orders, `pay` (records the buyer's tNIGHT tx id), dataset download |
| Fulfil | in-process serial queue | `registerBuyer(buyerPk)` → pin escrow rows + dataset hash → `sellRows` (proves every row is in `voteCommits`) → `License` confirmed |

`99101` is the synthetic chain id for Midnight preprod (`MIDNIGHT_CHAIN_ID`).

What stays private: users' picks never reach the ledger — the contract only records nullifiers,
sealed commitments and `sampleCount`. The escrowed rows are held by this server and released only to a
buyer whose license was minted on-chain; the buyer re-derives each row's commitment to verify it.

## Run locally

Prerequisites: Node **22.13+ or 24** with npm ≥ 10.9.2, MongoDB, Docker (proof server), and an operator wallet on preprod
holding tNIGHT and DUST (its coin public key must equal the contract's `finalizeSigner`).

```bash
npm ci
# create .env with the variables below (no .env.example is shipped)
npm run build          # required: midnight-js / wallet-sdk are ESM and load from dist via dynamic import()
bash scripts/start-local.sh npm run start:prod    # http://localhost:3001, Swagger at /api/docs
```

Minimum `.env`:

```
PORT=3001
NODE_ENV=local
MONGODB_URI=mongodb://localhost:27017/pnyx
JWT_ACCESS_SECRET=...            JWT_REFRESH_SECRET=...
ALLOWED_ORIGINS=http://localhost:3000

MIDNIGHT_ENABLED=true
MIDNIGHT_NETWORK=preprod
MIDNIGHT_CHAIN_ID=99101
MIDNIGHT_WALLET_SEED=<operator wallet seed — the contract deployer/finalizeSigner>
MIDNIGHT_TOURNAMENT_FINALIZER_CONTRACT_ADDRESS=1fe82f185fe7187ef335365c1ccf9fa7bc47b7a03fab84372d70c73262d00249
MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:6300
MIDNIGHT_WALLET_STATE_FILE=midnight-wallet-state-preprod.json
# optional: MIDNIGHT_INDEXER_URL / MIDNIGHT_NODE_URL overrides,
#           MIDNIGHT_MARKET_PRICE_PER_ROW_UNITS (default 10000000 = 10 tNIGHT),
#           MIDNIGHT_MARKET_VERIFY_PAYMENT_TX=true to require the payment tx on the indexer
```

Notes:

- `scripts/start-local.sh` loads `.env` with override so stray shell variables cannot point the app at
  another database.
- The compiled contract lives in `midnight-contract/TournamentFinalizer/` and is **committed** (contract
  module, verifier keys, zkir, and the operator prover keys for `grantEligibility` / `registerBuyer` /
  `sellRows`). The user-side `finalizeTournament*` prover keys are browser assets in the frontend repo and
  are deliberately not shipped here. Regenerate with `bash scripts/sync-contract.sh` only when the
  contract changes (needs a sibling PNYX-Contract checkout with `npm run compact` done).
- `midnight-wallet-state-preprod.json` is a committed sync checkpoint (public keys + synced state, no seed)
  so a fresh process skips the ~30 min genesis sync.
- A proof server that accepts contract circuits is required for grants and sales
  (`docker run --rm -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v`).

Seed data (tournaments, items, images): `bash scripts/start-local.sh npx ts-node -r tsconfig-paths/register asset/seed-creation/import-from-bucket.ts --dry`
imports from the asset bucket (`BUCKET_NAME`, `FILE_SERVER_API_KEY`).

## Development

```bash
npm run start:dev      # watch mode (Midnight ESM modules still load from dist — run npm run build first)
npm test               # jest unit tests (84 spec files); Midnight wallet code is exercised via the built app, not jest
npm run lint && npm run format
node scripts/midnight-e2e-smoke.mjs        # headless: nonce → signature → login → rounds → on-chain grant
node scripts/midnight-headless-votes.mjs   # headless vote generator (grant → prove → finalize → escrow)
```

## Layout

```
src/module/midnight/        MidnightService (operator wallet, grantEligibility, indexer lookups),
                            MidnightFinalizeService (finalize-confirm, escrow), MidnightMarketService,
                            MidnightFulfillService (registerBuyer → sellRows queue), controllers, lib/ (sdk, wallet, market)
src/module/api/auth         Midnight signData login (replaces SIWE)
src/module/api/signature    tournament-finalize grant route
src/module/domain/*         tournaments, items, users, play-info, midnight-grant, midnight-escrow, midnight-order
midnight-contract/          compiled Compact contract + operator zk assets (committed)
scripts/                    start-local.sh, sync-contract.sh, headless smoke/vote generators
```

## License

Hackathon submission by DeSPELL. All rights reserved unless stated otherwise.

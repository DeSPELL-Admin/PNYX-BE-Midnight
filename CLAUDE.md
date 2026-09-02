# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev        # watch mode (nest start --watch)
npm run start:debug      # watch + --debug
npm run start            # single run
npm run start:prod       # node dist/main.js (after build)
npm run build            # nest build -> dist/

npm run lint             # eslint --fix on src/, apps/, libs/, test/
npm run format           # prettier on src/**/*.ts and test/**/*.ts

npm test                 # jest, testRegex=.*\.spec\.ts$, rootDir=src
npm run test:watch
npm run test:cov
npm run test:e2e         # uses ./test/jest-e2e.json
```

Run a single test file: `npx jest path/to/file.spec.ts`. Run a single test name: `npx jest -t "test name"`. Jest uses `moduleNameMapper` for `src/*` -> `<rootDir>/$1`, so imports use absolute `src/...` paths.

The repo uses npm (no yarn/pnpm lockfile), Prettier with `singleQuote`, `trailingComma: 'all'`, `tabWidth: 4`. TS target ES2023, `module: nodenext`, `noImplicitAny: false`, `strictNullChecks: true`. `ts-node` overrides to `module: commonjs` for dev tooling.

## High-Level Architecture

This is a NestJS 11 HTTP API service:

**HTTP API** under prefix `/api` (Swagger UI at `/api/docs`, JSON at `/api/swagger.json`), serving read endpoints scoped per chain under `/api/chains/:chainId/...`. Health probes `/health` and `/health/ready` are exempt from the prefix.

### Two top-level module trees

- `src/module/<domain>/` — HTTP API layer. Each domain has `controller/`, `service/`, `repository/`, `dto/req`, `dto/res`. Domains: `tournament`, `user`, `item`, `match`, `category`, `play-info`, `file`, `health`, plus shared `common/`. The repository pattern is mandatory (controller → service → repository → mongoose model).

Mongoose schemas live in `src/schema/`.

### HTTP response & error pipeline

A controller method's return value is **never** the final response body. Two app-wide providers wrap everything (registered in `app.module.ts`):

- `TransformInterceptor` (`src/module/common/interceptor/transform.interceptor.ts`) wraps payloads in `{ success, data, meta:{timestamp} }`. If the value matches `PaginationResult<T>` (has numeric `page`/`limit`/`total`), it expands into `{ success, data, pagination, meta }`. Apply `@ResponseDto(SomeResDto)` on the handler to run `plainToInstance(SomeResDto, value, { excludeExtraneousValues: true })` — without `@Expose()` on a DTO field, that field is stripped. Use `@NoTransform()` to opt out entirely (e.g. file streams).
- `HttpExceptionFilter` (`src/module/common/filter/http-exception.filter.ts`) catches **all** thrown errors. Special-cases Mongoose `ValidationError` (400), `CastError` (400), duplicate key 11000 (409). Includes `error.stack` only when `NODE_ENV=local`, `error.message` only on `local`/`development`. Production exposes no internals.

Validation: `main.ts` enables a global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, `enableImplicitConversion: true`. Bodies and params with extraneous keys reject with 400; declared types auto-cast. All DTOs use `class-validator` + `class-transformer`.

Swagger: use the `@ApiStandardResponse({ summary, description, successType, successDescription })` decorator from `src/module/common/decorator/swagger.decorator.ts` instead of raw `@ApiResponse` — it emits the standard error schemas for 400/404/500. For paginated endpoints wrap `successType` with `createSwaggerPaginationResult(Dto)`, for single items use `createSwaggerSingleResult(Dto)`. Tags are pre-declared in `src/config/swagger.config.ts`.

### Service + repository conventions

- Services do business logic and orchestrate repositories; repositories own all mongoose calls. Do not put `tournamentModel.find(...)` inside a service.
- Aggregation pipelines that join across collections (e.g. `tournament` joining top items from `items`) live in repositories. Cross-aggregate joins use hard-coded collection names (`'items'`) rather than schema references — Mongoose pluralizes class names so `Item` schema -> `items` collection.
- Repository methods that return projected shapes have a matching `*.query-result.ts` type under `repository/query-result/` — keep them in sync so the service signature reflects only the projected fields.
- Refactor by single responsibility — one repository per aggregate, one service per domain, controllers only translate HTTP <-> service args.

### Database connection

`DatabaseModule` connects via `MongooseModule.forRootAsync` with options from `src/config/mongoose.config.ts` (`MONGODB_URI`, default `mongodb://localhost:27017/scanner`, `maxPoolSize: 10`). `MongoDBService` exposes `isConnected()` for the readiness probe and logs connection state transitions.

## Environment variables

The `.env` file is gitignored and never read by Claude — ask the user when key names or values are needed. Variables observed in code:

- Server: `PORT` (default 3000), `NODE_ENV` (`local` | `development` | `production` — controls error verbosity).
- DB: `MONGODB_URI`.

## Deployment

GitHub Actions (`.github/workflows/PNYX-BE-{Development,Production}-Server-CI-CD.yml`) deploy via SSH on push to `develop` / production. The remote runs `bash ./scripts/PNYX-BE/run.sh`. Slack notifications post to a webhook on success/failure.

## Midnight (hackathon fork — `midnight/PNYX-BE`)

This copy is Midnight-only; the legacy EVM scanner and signing stack were removed.

- **Module** `src/module/midnight/` — `MidnightService` (operator wallet = `finalizeSigner`, joins
  `TournamentFinalizer`, `grantEligibility`, indexer tx lookup, Lace signature verification),
  `MidnightFinalizeService` (finalize-confirm / escrow), `MidnightController`.
- **Routes** (all under the existing `/api/v1` prefix, synthetic `chainId` **99101** for preprod):
  - `POST /auth/midnight/verify { message, signedData, signature, verifyingKey }` — SIWE replacement; same
    nonce cookie/domain/URI rules; verifies with `ledger-v8.verifySignature` and binds `addressFromKey(vk)` → bech32m.
  - `POST /chains/99101/signatures/tournament-finalize { tournamentId, tournamentData, userPk }` — the
    Midnight eligibility route; it validates the bracket/playVerification/point, then **inserts an eligibility leaf on-chain** and returns `{ exists, txId, point, deadline, segment }` (grant-shaped; the legacy EVM `signature` field was removed).
    The leaf binds `bracketHash(entryItemHexes)` — the circuit rejects any other bracket at finalize time,
    which is what lets the circuit publish per-match counters that users cannot poison.
    Records live in `midnightgrants`.
  - `POST /chains/99101/midnight/finalize-confirm { tournamentId, txId }` — the FE reports its
    `finalizeTournament` tx; BE checks it on the indexer and records PlayInfo/points/stats.
  - `POST /chains/99101/escrow` — data-market escrow rows (`midnightescrows`), witness source for `sell*`.
- **ESM caveat**: wallet-sdk-* and midnight-js-* subpackages are ESM-only; `src/module/midnight/lib/sdk.ts`
  loads them with dynamic `import()` (preserved by `module: nodenext`). They do **not** work under ts-node/jest —
  Midnight code is exercised via `npm run build && node dist/main.js`, never in unit tests.
- **Compiled contract**: `bash scripts/sync-contract.sh` copies `../PNYX-Contract/contracts/managed/TournamentFinalizer`
  (ESM contract + keys/zkir) to `midnight-contract/` (gitignored). Proving keys are required for `grantEligibility`.
- **Env**: `MIDNIGHT_ENABLED`, `MIDNIGHT_NETWORK`, `MIDNIGHT_CHAIN_ID`, `MIDNIGHT_WALLET_SEED` (same wallet as the
  contract deployer/operator), `MIDNIGHT_TOURNAMENT_FINALIZER_CONTRACT_ADDRESS`, `MIDNIGHT_PROOF_SERVER_URL`,
  `MIDNIGHT_WALLET_STATE_FILE` (sync checkpoint — copy `PNYX-Contract/scripts/output/wallet-state-preprod.json`
  here to skip the ~30 min first sync), `MIDNIGHT_GRANT_TTL_SECONDS`.
- **Real seed data** comes from the GCS asset bucket, which is the only surviving source (the
  `PNYX-Assets` dumps and the remote dev Mongo are both unavailable here):

  ```bash
  bash scripts/start-local.sh npx ts-node -r tsconfig-paths/register \
      asset/seed-creation/import-from-bucket.ts [--dry]
  ```

  It lists `images/{ts}_{uuid}_{imageName}.webp`, parses `imageName` as `{sanitizedName}-{tournamentId}`
  (the rule `insert-metadata.ts` writes; `10`/`11` share a `-10-11` suffix), and upserts `files`
  (`originalName` → `uploadedName`, required or images 404), `categories`, `tournaments` and `items`.
  Result: 9 tournaments (`0,1,2,3,4,9,10,11,12`) × 64 items = 576 items, 512 file rows.

  Two things the bucket cannot carry, both isolated so they are easy to correct:
  - **Tournament titles/categories** — inferred from the item sets, in `TOURNAMENT_META` at the top of the
    importer. Edit there if the originals are known.
  - **`itemId` order and exact display names** — the original `itemId` was the index in the source JSON
    array, which no longer exists, so the importer assigns `0..63` by `imageName` sort; display names are
    de-camelCased (`AttackonTitan` → `Attackon Titan`). This means the pre-existing `matches`/`playinfos`
    rows in `pnyx_snapshot` (legacy EVM history, chainId 1946) reference a *different* itemId ordering —
    statistics screens will pair the wrong items until those are re-derived or cleared.

  The canonical forward path (`asset/json` → `insert-metadata.ts`) is unchanged and still preferred when the
  `PNYX-Assets` dumps are available.

- **Always launch through `scripts/start-local.sh`** (it also wraps arbitrary commands, e.g.
  `bash scripts/start-local.sh npm run start:dev`). `dotenv` never overwrites an existing environment
  variable, and this machine's shell exports ~40 keys from another project — including `MONGODB_URI`,
  `BUCKET_NAME` and `FILE_SERVER_API_KEY`. Running `node dist/main.js` directly silently talks to the wrong
  database and bucket; that is how a seed run once landed in the PressA database.

- **Headless E2E**: `node scripts/midnight-e2e-smoke.mjs [base] [origin] [tournamentId]` runs everything the
  browser is not needed for: nonce → simulated Lace signature → `/auth/midnight/verify` → `/me` → `/tournaments`
  → `/tournaments/:id/rounds/8` (creates playVerification) → on-chain `grantEligibility` (~30 s). Prints the
  `SMOKE_SEED` so the same simulated wallet can be reused. `scripts/midnight-auth-smoke.mjs` is the older
  login-only version.
- `ChainService.getAllSupportedChainIds()` appends the Midnight chainId when enabled; `chain.service.spec.ts`
  pins `MIDNIGHT_ENABLED=false`.
- **Data market** (`docs/market-dev-plan.md` in `midnight/`): `/chains/99101/market/*` — products
  (escrow-backed tournaments + on-chain sampleCount), orders (idempotent per buyer+tournament while
  CREATED), pay (records txId; `MIDNIGHT_MARKET_VERIFY_PAYMENT_TX=true` checks existence on the
  indexer), order polling, dataset download (raw `datasetJson` bytes — never re-serialize, the
  on-chain `datasetHash` binds them). B-design: escrow rows carry the raw `bracket` (16/32/64 ids);
  the operator witness derives `bracketHash{N}` per row for the sealed VoteRow commitment, and the
  sold dataset includes the bracket so buyers can verify it against the on-chain commitment. Fulfill is an in-process serial queue
  (`MidnightFulfillService`): registerBuyer (waits until `buyers.member` is visible on the indexer
  before proceeding!) → pin escrow rows → sellRows (60–90 s proof) → confirm License.
  `LicenseExists` on retry is treated as success (specHash embeds the orderId). Two hard-won rules:
  **witnesses must be synchronous** (compact-js expects `[state, result]`; an async witness dies
  with "object is not iterable"), and escrow reads must be deterministically sorted
  (`createdAt,_id`) or the pinned dataset diverges from the witness. Env:
  `MIDNIGHT_MARKET_PRICE_PER_ROW_UNITS` (default 10000000 = 10 tNIGHT; 1 tNIGHT = 1e6 units),
  `MIDNIGHT_MARKET_MAX_ATTEMPTS`.
- Not ported: VotePointManager (bet/cancel/reward) on Midnight.

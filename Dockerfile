# ─────────────────────────────────────────────────────────────────────────────
# Build Stage: TypeScript 빌드 + 프로덕션 의존성만 남기기
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# 작업 디렉터리를 하나로 고정해 COPY/RUN 경로 일관성과 가독성을 유지한다.
WORKDIR /app

# 의존성 레이어를 먼저 고정해 소스 변경 시에도 캐시 효율을 높인다.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# 빌드에 필요한 설정/소스를 복사한다.
COPY nest-cli.json tsconfig.json ./
COPY src ./src

# Midnight 컴파일 컨트랙트(ESM contract + keys/zkir). midnight.service.ts 의
# `typeof import('../../../midnight-contract/...')` 타입 해석에 필요하므로 빌더에도 복사한다.
# 이 디렉터리는 레포에 커밋되어 있다(배포 빌드 컨텍스트에는 PNYX-Contract 가 없으므로).
# 컨트랙트를 다시 컴파일하면 scripts/sync-contract.sh 로 갱신해 커밋한다. FE 전용
# finalizeTournament*.prover 는 제외되어 있다(BE 는 그 회로를 증명하지 않는다).
# node_modules 밖이라 `npm prune` 후에도 유지된다.
COPY midnight-contract ./midnight-contract

# 애플리케이션 빌드 후 dev 의존성을 제거해 런타임 크기를 축소한다.
RUN npm run build \
    && npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Runtime Stage: 운영 실행에 필요한 최소 파일만 포함
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

# 작업 디렉터리를 하나로 고정해 COPY/RUN 경로 일관성과 가독성을 유지한다.
WORKDIR /app

# 운영 기본값: 앱이 즉시 기동 가능하도록 최소 환경을 명시한다.
ENV NODE_ENV=production
ENV PORT=3000

# PID 1 신호 전달/좀비 프로세스 정리를 위해 init 프로세스를 사용한다.
RUN apk add --no-cache dumb-init

# 실행에 필요한 산출물만 복사해 이미지 크기와 공격 표면을 줄인다.
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# Midnight 런타임 자산: contract/index.js 동적 import + NodeZkConfigProvider 가
# keys/zkir 를 읽는다. MIDNIGHT_CONTRACT_DIR(기본 midnight-contract/TournamentFinalizer)
# 는 /app 기준으로 해석된다.
COPY --from=builder --chown=node:node /app/midnight-contract ./midnight-contract

# preprod 오퍼레이터 지갑 동기화 체크포인트(레포에 커밋됨, 공개키 + 동기화 상태만).
# 없으면 컨테이너가 제네시스부터 ~30분 동기화하며 그동안 이벤트 루프가 막혀 헬스체크가 실패한다.
# MIDNIGHT_WALLET_STATE_FILE 기본값(midnight-wallet-state-<network>.json, cwd 기준)과 경로가 같다.
COPY --chown=node:node midnight-wallet-state-preprod.json ./midnight-wallet-state-preprod.json

# 런타임이 cwd(/app) 에 상태를 쓴다 — 지갑 동기화 체크포인트(MIDNIGHT_WALLET_STATE_FILE, 기본
# midnight-wallet-state-<network>.json) 와 midnight-js private state DB(midnight-level-db/).
# WORKDIR 이 만든 /app 은 root 소유라 node 유저로는 EACCES 가 나므로 디렉터리 소유권을 넘긴다.
# 컨테이너가 갱신한 체크포인트는 재배포 시 사라진다 — 유지하려면 두 경로를 볼륨으로 마운트한다.
RUN chown node:node /app

# 보안 기본값: root 권한 대신 node 사용자로 실행한다.
USER node

# 애플리케이션 포트
EXPOSE 3000

# dumb-init을 엔트리포인트로 두어 정상 종료/재시작 시그널을 안정적으로 처리한다.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

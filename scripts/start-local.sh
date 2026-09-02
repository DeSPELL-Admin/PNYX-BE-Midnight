#!/usr/bin/env bash
# .env 를 권위 있는 설정으로 삼아 서버를 띄운다.
#
# dotenv 는 이미 존재하는 환경변수를 덮지 않는다. 이 머신의 셸에는 다른 프로젝트(PressA)의
# MONGODB_URI / BUCKET_NAME / FILE_SERVER_API_KEY 등이 export 되어 있어, 그냥 실행하면
# .env 가 무시되고 엉뚱한 DB·버킷을 바라본다(실제로 다른 프로젝트 DB 에 쓰는 사고가 났다).
# 그래서 .env 가 정의한 키를 환경에서 제거한 뒤 실행한다.
#
#   bash scripts/start-local.sh              # node dist/main.js (build 필요)
#   bash scripts/start-local.sh npm run start:dev
set -euo pipefail
cd "$(dirname "$0")/.."

# macOS 기본 bash 3.2 에는 mapfile 이 없어 while-read 로 읽는다.
UNSET=()
REMOVED=()
while IFS= read -r key; do
  if [ -n "${!key+x}" ]; then UNSET+=(-u "$key"); REMOVED+=("$key"); fi
done < <(grep -oE '^[A-Z_][A-Z0-9_]*=' .env | tr -d '=' | sort -u)

if [ ${#REMOVED[@]} -gt 0 ]; then
  echo "shell 환경에서 제거: ${REMOVED[*]}"
fi

if [ $# -eq 0 ]; then set -- node dist/main.js; fi
exec env "${UNSET[@]}" "$@"

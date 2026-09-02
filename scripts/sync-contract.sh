#!/usr/bin/env bash
# Copy the compiled Compact contract (ESM) + zk assets from ../PNYX-Contract into ./midnight-contract/.
# Kept outside src/ (nest build only emits .ts) and loaded at runtime via dynamic import().
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$HERE/../PNYX-Contract/contracts/managed/TournamentFinalizer"
[ -f "$SRC/keys/grantEligibility.prover" ] || { echo "no proving keys — run 'npm run compact' in PNYX-Contract"; exit 1; }
DST="$HERE/midnight-contract/TournamentFinalizer"
mkdir -p "$DST"
rsync -a --delete "$SRC/contract/" "$DST/contract/"
rsync -a --delete "$SRC/keys/" "$DST/keys/"
rsync -a --delete "$SRC/zkir/" "$DST/zkir/"
printf '{ "type": "module" }\n' > "$DST/contract/package.json"
echo "synced → midnight-contract/TournamentFinalizer ($(du -sh "$DST" | cut -f1))"

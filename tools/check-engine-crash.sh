#!/usr/bin/env bash
# mtg-table — does an engine crash fail the run?  (decision D115)
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Usage:  ./tools/check-engine-crash.sh          # ~8 s; check-all.sh runs it as 12c
#
# The defect: a card the engine cannot build throws out of Match.prepareAllZones
# on Forge's game thread before turn 1, nothing in Forge catches it, and
# MtgTable used to sit with no frame for 60 s until AutoTransport's stuck
# watchdog conceded -- then print `MTGTABLE OK` and exit 0 with `player turns =
# 0`.  RecordMatch did exit 1, but left a frame log that simply stopped at
# `hello_ok`.  (Found by the engine-upgrade lane: a 2.0.15 card script whose
# ApiType, `Empower`, the 2.0.14 jar lacks.)
#
# This script builds that crash on purpose, in a SCRATCH Forge home under
# var/crash-probe/ -- its own config.json, its own userDir and cacheDir, and a
# custom-cards overlay holding D14's A.I.M. Scientists plus a Depower script
# with `A:SP$ Empower` -- so the committed forge-home/ still holds exactly one
# overlay file (hard rule 11) and nothing outside var/ is written.  Then it
# asserts, for MtgTable (--transport null: no watchdog should be needed) and
# for RecordMatch:
#
#   - the exit code is 1, promptly (no 60 s watchdog, no GAME_TIMEOUT);
#   - stderr names the cause: `ENGINE CRASHED` and the ApiType message;
#   - the frame log ends in `over`, preceded by an error `notice` (the
#     "incomplete" marker), and carries no `state` frame;
#   - the engine's own message never reached the file -- it names the card
#     ("check card script of Depower"), and a card can be the opponent's.
#
# Exit 0 when every assertion holds, 1 otherwise.  Hard rule 9: run it from the
# repo root; it reads the jar from config.json or $FORGE_JAR via tools/config.sh.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

FORGE_INSTALL="$(cd "$(dirname "$FORGE_JAR")" && pwd)"
FORGE_RES="$FORGE_INSTALL/res"
[ -d "$FORGE_RES" ] || { echo "Forge res/ not found beside the jar: $FORGE_RES" >&2; exit 1; }
[ -d bridge/out ] || { echo "not built yet -- run ./bridge/build.sh" >&2; exit 1; }

P="$REPO_ROOT/var/crash-probe"
case "$P/" in
  "$FORGE_INSTALL"/*|"$HOME"/.forge/*) echo "refusing to write inside the Forge installation: $P" >&2; exit 1;;
esac
rm -rf "$P"
mkdir -p "$P/forge-home" "$P/forge/custom/cards" "$P/cache"
ln -s "$FORGE_RES" "$P/forge-home/res"
printf 'userDir=%s/forge/\ncacheDir=%s/cache/\n' "$P" "$P" > "$P/forge-home/forge.profile.properties"
cp forge-home/custom-cards/*.txt "$P/forge/custom/cards/"
# Depower is in decks/pacho-shield.dck (and so in both seats' libraries); an
# overlay wins by name (D14's mechanism).  `Empower` is a 2.0.15 ApiType.
cat > "$P/forge/custom/cards/depower.txt" <<'CARD'
Name:Depower
ManaCost:2 U
Types:Instant
A:SP$ Empower | ValidTgts$ Creature | SpellDescription$ An ApiType the 2.0.14 jar does not have.
Oracle:tools/check-engine-crash.sh -- a card the engine cannot build.
CARD
node -e '
  const fs = require("node:fs");
  const c = JSON.parse(fs.readFileSync("config.json", "utf8"));
  c.forgeHome = process.argv[1] + "/forge-home";
  c.deck = process.argv[2] + "/decks/pacho-shield.dck";
  fs.writeFileSync(process.argv[1] + "/config.json", JSON.stringify(c, null, 2) + "\n");
' "$P" "$REPO_ROOT"
export MTG_TABLE_CONFIG="$P/config.json"

fails=0
check() {   # $1 what, then a command that must succeed
  local what="$1"
  shift
  if "$@"; then
    echo "  ok    $what"
  else
    echo "  FAIL  $what"
    fails=$((fails + 1))
  fi
}
last_type() { tail -1 "$1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).type))}catch{process.stdout.write("?")}})'; }
second_last_notice() {
  node -e '
    const L = require("node:fs").readFileSync(process.argv[1], "utf8").trim().split("\n").map(JSON.parse);
    const n = L[L.length - 2];
    process.exit(n && n.type === "notice" && n.body.level === "error" && n.body.title === "Engine error" ? 0 : 1);
  ' "$1"
}
no_state() { ! grep -q '"type":"state"' "$1"; }
no_card_name() { ! grep -q 'Depower' "$1"; }
exit_is_1() { [ "$1" = "1" ]; }
quick() { [ "$1" -lt 45 ]; }

run_case() {   # $1 label, $2 frame log, $3 server log, then the command
  local label="$1" frames="$2" out="$3"
  shift 3
  local t0 rc=0
  t0=$(date +%s)
  timeout --kill-after=15s 120s "$@" > "$out" 2>&1 || rc=$?
  local secs=$(( $(date +%s) - t0 ))
  echo "== $label: exit $rc in ${secs}s (log: ${out#"$REPO_ROOT"/})"
  check "exit code 1 (was 0 before D115)" exit_is_1 "$rc"
  check "prompt: ${secs}s, no stuck watchdog, no timeout" quick "$secs"
  check "stderr says ENGINE CRASHED" grep -q '^ENGINE CRASHED' "$out"
  check "stderr carries the cause (the missing ApiType)" grep -q 'Empower not found in ApiType enum' "$out"
  check "no stuck-watchdog concede" bash -c "! grep -q 'AUTO STUCK' '$out'"
  if [ -s "$frames" ]; then
    check "the frame log ends in \`over\`" [ "$(last_type "$frames")" = "over" ]
    check "an error notice (\"Engine error\") marks it incomplete, right before \`over\`" second_last_notice "$frames"
    check "no \`state\` frame (nothing was dealt)" no_state "$frames"
    check "the engine's message, which names the card, is not in the file" no_card_name "$frames"
  else
    check "a frame log at ${frames#"$REPO_ROOT"/}" false
  fi
}

run_case "MtgTable --transport null" "$P/var/games/crash-probe-null/frames.jsonl" "$P/mtgtable.log" \
  ./bridge/run.sh mtgtable.MtgTable --transport null --seed 7 --game-id crash-probe-null \
    --deck "$REPO_ROOT/decks/pacho-shield.dck"
grep -q '^MTGTABLE FAILED: .*the engine crashed' "$P/mtgtable.log" \
  && echo "  ok    MtgTable prints MTGTABLE FAILED with the cause" \
  || { echo "  FAIL  MtgTable prints MTGTABLE FAILED with the cause"; fails=$((fails + 1)); }

run_case "RecordMatch" "$P/record.jsonl" "$P/record.log" \
  ./bridge/run.sh mtgtable.RecordMatch --seed 42 --deck "$REPO_ROOT/decks/pacho-shield.dck" \
    --out "$P/record.jsonl"
grep -q '^RECORD FAILED: ' "$P/record.log" \
  && echo "  ok    RecordMatch prints RECORD FAILED" \
  || { echo "  FAIL  RecordMatch prints RECORD FAILED"; fails=$((fails + 1)); }

if [ "$fails" -gt 0 ]; then
  echo "check-engine-crash: $fails assertion(s) FAILED (${SECONDS} s)"
  exit 1
fi
echo "check-engine-crash OK: an engine crash before turn 1 fails both runs, with the cause, and ends the log in \`over\` (${SECONDS} s)"

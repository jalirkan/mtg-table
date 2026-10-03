#!/usr/bin/env bash
# mtg-table — tools/ml: record AI-vs-AI games of deck pairs for the dataset.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# A small self-play recorder for tools/ml/ (D305).  For every deck pair and every
# seed it runs `mtgtable.RecordMatch` (both seats AI, unpaced, `--match`) and
# writes one seat's frame log; `--seats 0,1` records the same game from both
# chairs (one seed is one game, protocol.md §8.7 — dataset.py keeps the two in
# one split group).  Each worker boots Forge in a home of its own under
# var/ml/homes/ (tools/config.sh's forge_home_make, D129), so `--jobs N` is safe.
#
#   tools/ml/record-pairs.sh --pairs PAIRS.txt --seeds 1-4 [--seats 0] [--jobs 2] \
#       [--out var/ml/games]
#
# PAIRS.txt: one pair per line, `<deckA.dck> <deckB.dck>`, paths relative to the
# repo root (decks must be under the checkout: Config.root() resolves --deck).
# `#` comments and blank lines are ignored.  Output names:
#   <out>/<deckA>-vs-<deckB>-s<seed>-seat<k>.jsonl
# A file already there is skipped, so a killed run resumes.  Run from the repo
# root (hard rule 9); the jar comes from config.json or $FORGE_JAR.
#
# This is a stop-gap for the cube lab's own `--record M` (docs/guides/cube-lab.md
# on its branch); tools/ml/README.md says what the lab should record at scale.
set -euo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=../config.sh
. tools/config.sh

PAIRS="" SEEDS="1-2" SEATS="0" JOBS=2 OUT="var/ml/games"
while [ $# -gt 0 ]; do
  case "$1" in
    --pairs) PAIRS="$2"; shift 2 ;;
    --seeds) SEEDS="$2"; shift 2 ;;
    --seats) SEATS="$2"; shift 2 ;;
    --jobs)  JOBS="$2"; shift 2 ;;
    --out)   OUT="$2"; shift 2 ;;
    *) echo "record-pairs: unknown flag $1" >&2; exit 2 ;;
  esac
done
[ -n "$PAIRS" ] || { echo "record-pairs: --pairs is required" >&2; exit 2; }
[ -d bridge/out ] || { echo "record-pairs: run ./bridge/build.sh first" >&2; exit 2; }
mkdir -p "$OUT" var/ml/homes

seed_list() {  # "1-4" or "1,3,9"
  local s="$1"
  if [[ "$s" == *-* ]]; then seq "${s%-*}" "${s#*-}"; else tr ',' '\n' <<<"$s"; fi
}

TASKS=()
while read -r a b _; do
  case "$a" in ''|'#'*) continue ;; esac
  for seed in $(seed_list "$SEEDS"); do
    for seat in ${SEATS//,/ }; do TASKS+=("$a|$b|$seed|$seat"); done
  done
done < "$PAIRS"
echo "record-pairs: ${#TASKS[@]} game(s), $JOBS at a time, into $OUT"

worker() {
  local w="$1" i task a b seed seat name out cfg
  cfg="$(forge_home_make "var/ml/homes/w$w")"
  for ((i = w; i < ${#TASKS[@]}; i += JOBS)); do
    task="${TASKS[$i]}"
    IFS='|' read -r a b seed seat <<<"$task"
    name="$(basename "$a" .dck)-vs-$(basename "$b" .dck)-s$seed-seat$seat"
    out="$OUT/$name.jsonl"
    if [ -s "$out" ] && tail -n 1 "$out" | grep -q '"type":"over"'; then
      echo "skip $name (already recorded)"; continue
    fi
    if MTG_TABLE_CONFIG="$cfg" timeout "${GAME_TIMEOUT:-300}" ./bridge/run.sh mtgtable.RecordMatch \
         --deck "$a" --ai-deck "$b" --match --seed "$seed" --seat "$seat" --out "$out" \
         > "$OUT/$name.log" 2>&1; then
      echo "ok   $name"
    else
      echo "FAIL $name (see $OUT/$name.log)"
    fi
  done
}

for ((w = 0; w < JOBS; w++)); do worker "$w" & done
wait
echo "record-pairs: done"

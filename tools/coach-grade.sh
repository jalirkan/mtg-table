#!/usr/bin/env bash
# mtg-table — the engine analysis of a decision (D334–D336).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Rebuilds a decision of a game from the viewing seat's redacted log, the hidden
# cards determinized (never the real ones), and plays every legal option (spell
# / pass, attack, block, target) out with Forge's Default AI on both seats, on
# common random numbers with racing: each option gets a win rate and a regret
# (best win rate minus its own) with intervals.  Two uses: the LIVE analysis a
# coach explains (analyse / serve, a few seconds), and the coach bench's regret
# tables (grade / batch, minutes; ForgeCoach `bench:coach -- import-graded`).
# A tool beside the game, like ai-bench: NOT in the gate (it boots the engine);
# its arithmetic is held by bridge/build.sh (mtgtable.grade.GradeSelfTest).
#
#   ./tools/coach-grade.sh grade --log F --frame N [--mode live|review] --type T \
#        [--opp-deck D | --opp-pool P] [--deck D] [--playouts 200] [--seed 1] ...
#   ./tools/coach-grade.sh batch --moments M.jsonl --out OUT.jsonl [--jobs K] ...
#   ./tools/coach-grade.sh selftest [--log F --frame N --type T --opp-deck D]
#   ./tools/coach-grade.sh analyse --log F --type T [--frame N] [--opp-deck D] [--budget-ms 3000]
#   ./tools/coach-grade.sh serve [defaults]      # JSON requests on stdin, one answer line each
#
# Every flag of grade / batch is mtgtable.grade.CoachGrade's (see its header):
# --playouts N rounds an option still in the race ends with (200), --initial N
# (40) and --batch N (20) for racing, --no-race, --horizon T (-1 = to the end of
# the game), --max-turns, --timeout-ms (per playout), --max-ms (per decision),
# --max-playouts, --cap, --lands, --only 'tok tok', --extra 'tok tok', --budget-ms.
#
# batch --jobs K runs K JVMs on every K-th moment, each with a Forge home of its
# own under var/coach-grade/<run>/home-<i>/ (forge_home_make, D129), appending
# to <out>.shard-<i>.jsonl, then concatenates them into <out>; a rerun resumes.
#
# analyse / serve are the LIVE analysis (D336): the current decision of a game
# being played, inside a wall-clock budget (default 3 s, at least two rounds),
# playouts to the end of this turn scored by the search's leaf evaluator, so a
# coach can explain the engine's numbers.  serve keeps one booted engine (Forge
# takes ~10 s to start) and answers one JSON request per stdin line:
#   {"id","log","type","frame"?,"mode"?,"oppDeck"?,"oppPool"?,"deck"?,"budgetMs"?,"horizon"?,"seed"?,"only"?}
# with one JSON line on stdout (`{"ready":true}` first); see CoachGrade's header.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
[ -d bridge/out/mtgtable/grade ] || { echo "bridge/out is missing or stale -- run ./bridge/build.sh" >&2; exit 1; }

# Hard rule 6's flags, a config of the caller's choosing.
jvm() {
  local config="$1"; shift
  env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -Dmtgtable.config="$config" \
    -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" mtgtable.grade.CoachGrade "$@"
}

# A Forge home of its own (D129) for one JVM of this run.
home_for() { forge_home_make "$REPO_ROOT/var/coach-grade/$1"; }

batch() {
  local jobs=1 run="" out="" args=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --jobs) jobs="$2"; shift 2 ;;
      --run) run="$2"; shift 2 ;;
      --out) out="$2"; shift 2 ;;
      *) args+=("$1"); shift ;;
    esac
  done
  [ -n "$out" ] || { echo "batch needs --out" >&2; exit 2; }
  [ -n "$run" ] || run="batch-$(date +%Y%m%d-%H%M%S)-$$"
  case "$run" in */*|.*) echo "--run must be a plain name" >&2; exit 2 ;; esac
  mkdir -p "$(dirname "$out")"
  local pids=() i rc=0
  for ((i = 0; i < jobs; i++)); do
    local home; home="$(home_for "$run/home-$i")"
    jvm "$home" batch "${args[@]}" --shard "$i/$jobs" --out "$out.shard-$i.jsonl" \
      > "$out.shard-$i.log" 2>&1 &
    pids+=("$!")
  done
  for p in "${pids[@]}"; do wait "$p" || rc=1; done
  cat "$out".shard-*.jsonl > "$out"
  echo "coach-grade: $(wc -l < "$out") graded moment(s) -> $out"
  [ "$rc" = 0 ] || echo "coach-grade: a shard failed -- see $out.shard-*.log" >&2
  return "$rc"
}

mode="${1:-}"
case "$mode" in
  grade)
    shift
    jvm "$(home_for grade-home)" grade "$@"
    ;;
  selftest)
    shift
    jvm "$(home_for selftest-home)" selftest "$@"
    ;;
  batch)
    shift
    batch "$@"
    ;;
  analyse)
    shift
    jvm "$(home_for analyse-home)" analyse "$@"
    ;;
  serve)
    shift
    jvm "$(home_for serve-home)" serve "$@"
    ;;
  *)
    sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac

#!/usr/bin/env bash
# mtg-table — AI-vs-AI benchmark on fixed decks (D300).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Forge's AI against Forge's AI, many games, one JSON line per game, and a
# report with Wilson 95% intervals.  A measuring tool beside the game (like
# tools/audit-deck.mjs): no socket, no protocol, no frame log.  NOT in the gate:
# it needs the engine and takes minutes to hours; its self-test is cheap.
#
#   ./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt \
#        --a Experimental --b Default [--games 20] [--jobs 3] [--seed 1] \
#        [--timeout 300] [--run NAME]
#   ./tools/ai-bench.sh report var/ai-bench/<run>/*.jsonl [--by-pair]
#   ./tools/ai-bench.sh --selftest [--no-engine]
#
# A seat config is <Profile>[+sim|+hybrid][+outlets|+shadow]: an .ai profile
# (Default, Cautious, Reckless, Experimental), Forge's simulation option (a
# lobby-player AIOption, not a profile key), and the sacrifice-outlet policy
# (D301: +outlets acts, +shadow only counts what it would have done).  Game g of
# a pair gives config A the pair's first deck when g is even, and seat 0 when
# g/2 is even, so every four games cover both decks on both seats.
#
# --jobs K runs K JVMs, each with every K-th game and a Forge home of its own
# under var/ai-bench/<run>/home-<i>/ (tools/config.sh's forge_home_make, D129's
# rule: no two JVMs share a Forge profile).  Output: var/ai-bench/<run>/
# shard-<i>.jsonl and report.txt.  Needs ./bridge/build.sh first (bridge/out).
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
[ -d bridge/out/mtgtable/ai ] || { echo "bridge/out is missing or stale -- run ./bridge/build.sh" >&2; exit 1; }

CLASSES="$REPO_ROOT/var/ai-bench/classes"

compile() {
  mkdir -p "$CLASSES"
  # javac through the jdk.compiler module (JRE only; never --release -- see bridge/build.sh).
  java -m jdk.compiler/com.sun.tools.javac.Main -nowarn -encoding UTF-8 \
    -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" -d "$CLASSES" tools/ai-bench/AiBench.java
}

# Hard rule 6's flags, a config of the caller's choosing.
jvm() {
  local config="$1"; shift
  env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -Dmtgtable.config="$config" \
    -cp "$CLASSES:$REPO_ROOT/bridge/out:$FORGE_JAR" mtgtable.bench.AiBench "$@"
}

mode="${1:-}"
case "$mode" in
  --selftest)
    shift
    compile
    home="$(forge_home_make "$REPO_ROOT/var/ai-bench/selftest-home")"
    jvm "$home" selftest "$@"
    ;;
  report)
    shift
    compile
    jvm "$REPO_ROOT/config.json" report "$@"
    ;;
  play)
    shift
    jobs=3 run="" args=()
    while [ $# -gt 0 ]; do
      case "$1" in
        --jobs) jobs="$2"; shift 2 ;;
        --run) run="$2"; shift 2 ;;
        *) args+=("$1"); shift ;;
      esac
    done
    [ -n "$run" ] || run="$(date +%Y%m%d-%H%M%S)-$$"
    case "$run" in */*|.*) echo "--run must be a plain name" >&2; exit 2 ;; esac
    dir="$REPO_ROOT/var/ai-bench/$run"
    mkdir -p "$dir"
    compile
    echo "ai-bench: run $run, $jobs job(s) -> $dir"
    pids=()
    for ((i = 0; i < jobs; i++)); do
      home="$(forge_home_make "$dir/home-$i")"
      jvm "$home" play "${args[@]}" --shard "$i/$jobs" --out "$dir/shard-$i.jsonl" \
        > "$dir/shard-$i.log" 2>&1 &
      pids+=("$!")
    done
    rc=0
    for p in "${pids[@]}"; do wait "$p" || rc=1; done
    [ "$rc" = 0 ] || { echo "ai-bench: a shard failed -- see $dir/shard-*.log" >&2; }
    jvm "$REPO_ROOT/config.json" report "$dir"/shard-*.jsonl | tee "$dir/report.txt"
    exit "$rc"
    ;;
  *)
    sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac

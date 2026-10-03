#!/usr/bin/env bash
# mtg-table — AI-vs-AI benchmark on fixed decks (D309).
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
#        [--timeout 300] [--no-mirror] [--run NAME]
#   ./tools/ai-bench.sh report var/ai-bench/<run>/*.jsonl [--by-pair]
#   ./tools/ai-bench.sh paired --control var/ai-bench/<c>/shard-*.jsonl \
#        --treatment var/ai-bench/<t>/shard-*.jsonl     # same --pairs/--seed/--games
#   ./tools/ai-bench.sh --selftest [--no-engine]
#
# A seat config is <Profile>[+sim|+hybrid][+outlets|+shadow][+search[:k=v,..]]: an .ai profile
# (Default, Cautious, Reckless, Experimental), Forge's simulation option (a
# lobby-player AIOption, not a profile key), and the sacrifice-outlet policy
# (D310: +outlets acts, +shadow only counts what it would have done), and the
# determinized rollout search (D312: keys ms, cands, turns, rounds, margin,
# maxrounds, what -- see mtgtable.ai.SearchConfig).  Game g of a pair gives
# config A the pair's first deck when g is even, and seat 0 when g/2 is even,
# so every four games cover both decks on both seats.  `play` MIRRORS by
# default (D318): games 4k/4k+3 and 4k+1/4k+2 get one seed each -- the same deck
# in the same seat, the configs swapped, each deal from both sides -- and
# `report` tests A against the known 50% by deal, so no control run is needed.
# --no-mirror deals as before D318 (to reproduce the D309-D314 runs' seeds).
#
# --jobs K runs K JVMs, each with every K-th game and a Forge home of its own
# under var/ai-bench/<run>/home-<i>/ (tools/config.sh's forge_home_make, D129's
# rule: no two JVMs share a Forge profile).  Output: var/ai-bench/<run>/
# shard-<i>.jsonl and report.txt.  Needs ./bridge/build.sh first (bridge/out).
#
# `play` RESUMES (D334): run the same line again after a kill and it plays only
# the games no shard file holds yet (same pairs, seed, games and configs; a
# different configuration in the same --run is refused), after cutting off a
# torn last line.  Under the lab runner (LAB_CONTROL set, tools/runner/) each
# JVM reads the control file before a game: paused holds it, and a lower
# maxWorkers lets a JVM go after its game, to be started again later.
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
  paired)
    shift
    compile
    jvm "$REPO_ROOT/config.json" paired "$@"
    ;;
  play)
    shift
    jobs=3 run="" args=() mirror=--mirror
    while [ $# -gt 0 ]; do
      case "$1" in
        --jobs) jobs="$2"; shift 2 ;;
        --run) run="$2"; shift 2 ;;
        --mirror) mirror=--mirror; shift ;;
        --no-mirror) mirror=""; shift ;;
        *) args+=("$1"); shift ;;
      esac
    done
    [ -n "$run" ] || run="$(date +%Y%m%d-%H%M%S)-$$"
    case "$run" in */*|.*) echo "--run must be a plain name" >&2; exit 2 ;; esac
    dir="$REPO_ROOT/var/ai-bench/$run"
    mkdir -p "$dir"
    # One `play` per run folder at a time (D334): the lock's fd is inherited by
    # every JVM, so even a JVM whose shell was killed keeps the folder locked.
    exec 9>>"$dir/.lock"
    flock -n 9 || { echo "ai-bench: another play is still running on $dir (a JVM of it, maybe: pgrep -f 'AiBench play')" >&2; exit 2; }
    compile
    echo "ai-bench: run $run, $jobs job(s) -> $dir"
    # Resume (D334): cut a torn last line off every shard file of an earlier,
    # killed run, and hand each JVM the other shards' files so it skips every
    # game already played there (a restart with another --jobs included).
    shopt -s nullglob
    old=("$dir"/shard-*.jsonl)
    shopt -u nullglob
    if [ ${#old[@]} -gt 0 ]; then
      node -e 'const fs=require("fs");for(const f of process.argv.slice(1)){const b=fs.readFileSync(f);const i=b.lastIndexOf(10);if(i+1<b.length){fs.truncateSync(f,i+1);console.log("ai-bench: cut a torn last line off "+f)}}' "${old[@]}"
    fi
    done_args=()
    for f in "${old[@]}"; do done_args+=(--done "$f"); done
    for ((i = 0; i < jobs; i++)); do
      case " ${old[*]:-} " in *" $dir/shard-$i.jsonl "*) ;; *) done_args+=(--done "$dir/shard-$i.jsonl") ;; esac
    done
    homes=() pids=() state=() slot=()
    for ((i = 0; i < jobs; i++)); do homes+=("$(forge_home_make "$dir/home-$i")"); done
    # launch <shard> <slot>: one JVM; LAB_SLOT is the slot the control file's maxWorkers is compared with.
    launch() {
      LAB_SLOT="$2" jvm "${homes[$1]}" play "${args[@]}" ${mirror:+"$mirror"} --shard "$1/$jobs" \
        --out "$dir/shard-$1.jsonl" "${done_args[@]}" >> "$dir/shard-$1.log" 2>&1 &
      pids[$1]=$! state[$1]=run slot[$1]=$2
    }
    rc=0
    if [ -z "${LAB_CONTROL:-}" ]; then
      for ((i = 0; i < jobs; i++)); do launch "$i" "$i"; done
      for ((i = 0; i < jobs; i++)); do wait "${pids[$i]}" || rc=1; done
    else
      # The lab runner's control file (tools/runner/control.ts): a JVM holds
      # while paused and exits 75 (parked) when maxWorkers falls to its slot;
      # this loop starts a parked shard again in a free slot below the cap.
      echo "ai-bench: under the control file $LAB_CONTROL"
      ctl() { read -r c_paused c_max < <(node "$REPO_ROOT/tools/runner/control.ts" get "$LAB_CONTROL") || true
            case "${c_paused:-}" in 1) ;; *) c_paused=0 ;; esac
            case "${c_max:-}" in ''|*[!0-9]*|0) c_max=$jobs ;; esac; }
      for ((i = 0; i < jobs; i++)); do state[$i]=parked; done
      while :; do
        live=0
        for ((i = 0; i < jobs; i++)); do
          [ "${state[$i]}" = run ] || continue
          if kill -0 "${pids[$i]}" 2>/dev/null; then live=$((live + 1)); continue; fi
          r=0; wait "${pids[$i]}" || r=$?
          case "$r" in
            0) state[$i]=done ;;
            75) state[$i]=parked; echo "ai-bench: shard $i parked" ;;
            *) state[$i]=failed; rc=1 ;;
          esac
        done
        ctl
        for ((i = 0; i < jobs; i++)); do
          [ "${state[$i]}" = parked ] && [ "$c_paused" = 0 ] && [ "$live" -lt "$c_max" ] || continue
          for ((s = 0; s < c_max; s++)); do
            used=0
            for ((k = 0; k < jobs; k++)); do [ "${state[$k]}" = run ] && [ "${slot[$k]}" = "$s" ] && used=1; done
            [ "$used" = 0 ] && break
          done
          echo "ai-bench: shard $i starts in slot $s"
          launch "$i" "$s"; live=$((live + 1))
        done
        more=0
        for ((i = 0; i < jobs; i++)); do case "${state[$i]}" in run|parked) more=1 ;; esac; done
        [ "$more" = 1 ] || break
        sleep 2
      done
    fi
    [ "$rc" = 0 ] || { echo "ai-bench: a shard failed -- see $dir/shard-*.log" >&2; }
    jvm "$REPO_ROOT/config.json" report "$dir"/shard-*.jsonl | tee "$dir/report.txt"
    exit "$rc"
    ;;
  *)
    sed -n '2,43p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac

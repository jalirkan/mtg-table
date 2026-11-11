#!/usr/bin/env bash
# mtg-table — the label probe (D538): at recorded move-atlas decisions, which
# option a ladder player picks there.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   ./tools/label-probe.sh --decisions <keys.jsonl> --player <ladder name> \
#        --data <lab data dir> [--repeats 3] [--seed 1] [--workers 1] \
#        [--game-timeout 1800] --out <rows.jsonl>
#   python3 -I tools/atlas/agreement.py --labels <labels.jsonl> <rows.jsonl>...   # the agreement read
#
# Each line of --decisions names a decision by the labels' key,
# <night>/<spine>/d<d> (J186/s01/d9), and may name its spine's folder as
# `dir`; without one the folder is <data>/lab-<night>/b-<spine>-*, the lab's
# own layout (~/code/lab/data on the PC).  The folder is what
# `tools/cubelab.sh atlas` wrote: plan.json and phaseB/baseline.json.
#
# For each (decision, repeat) the baseline is replayed from its seed exactly as
# an atlas branch unit replays it (tools/cubelab/AtlasProbe.java builds the
# unit's match line; CubeLab.playMatch plays it), and at the decision the
# player's own policy and search are asked on the real position
# (bridge/src/mtgtable/ai/LabelProbe.java).  The player's seat config is the
# ladder's (`ai-ladder.sh cfg <name>`: tools/ai-ladder/kinds.ts is the one
# mapping from players.json); each repeat seeds its search with a seed of its
# own, from --seed and the key.  One JSON line a (decision, repeat) in --out:
# the option picked, its token, whether the search ran, its rounds and time, a
# status (ok, off-atlas, ambiguous, mismatch, unsupported, error).
#
# --workers K runs K JVMs, each with every K-th (decision, repeat) and a Forge
# home of its own under var/label-probe/<run>/home-<i>/ (forge_home_make,
# D129's rule), all appending to --out, one write a line.  A JVM that exits 3
# (a stuck game thread) or 4 (its heap exhausted, D465) is started again, up
# to twelve runs of a shard in all.  RESUMES: run the same line again and it
# skips every row --out holds for this player, after cutting off a torn last
# line; an error row is tried again once, and a second error at the same
# (decision, repeat) is final; a row of this player made with another seat
# config or --seed refuses the run.  Two --out files need two basenames: the
# run's folder is var/label-probe/<basename>-<player>.
# Logs: var/label-probe/<run>/shard-<i>.log (each probe's line, the match
# lines, Forge's chatter).  Needs ./bridge/build.sh first (bridge/out).  Not in
# the gate: it boots the engine and takes minutes to hours.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

usage() { sed -n '2,41p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

workers=1 player="" out="" args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --workers) workers="${2:-}"; shift 2 ;;
    --player) player="${2:-}"; shift 2 ;;
    --out) out="${2:-}"; shift 2 ;;
    --decisions|--data|--repeats|--seed|--game-timeout) args+=("$1" "${2:-}"); shift 2 ;;
    -h|--help) usage ;;
    *) echo "label-probe: unknown flag $1" >&2; exit 2 ;;
  esac
done
[ -n "$player" ] && [ -n "$out" ] || usage
case "$workers" in ''|*[!0-9]*|0) echo "label-probe: --workers wants a number >= 1, got $workers" >&2; exit 2 ;; esac

[ -f "$FORGE_JAR" ] || { echo "label-probe: FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
[ -f bridge/out/mtgtable/ai/LabelProbe.class ] || { echo "label-probe: bridge/out is missing or stale -- run ./bridge/build.sh" >&2; exit 1; }

# The player's seat config and config hash, from the ladder's registry.
line="$(node tools/ai-ladder/cli.ts cfg "$player")" || { echo "label-probe: no seat config for $player" >&2; exit 1; }
hash="${line%%$'\t'*}"
seat="${line#*$'\t'}"
[ -n "$hash" ] && [ -n "$seat" ] && [ "$hash" != "$line" ] || { echo "label-probe: ai-ladder cfg printed '$line'" >&2; exit 1; }

# The probe's classes: the cube lab's worker and the probe's entry point, compiled together (javac through
# jdk.compiler, never --release; the lint already scans tools/).
CLASSES="$REPO_ROOT/var/label-probe/classes"
SRCS=(tools/cubelab/CubeLab.java tools/cubelab/AtlasProbe.java)
stale=0
[ -f "$CLASSES/mtgtable/cubelab/AtlasProbe.class" ] || stale=1
for s in "${SRCS[@]}" bridge/out/mtgtable/ai/LabelProbe.class bridge/out/mtgtable/ai/Atlas.class; do
  if [ "$s" -nt "$CLASSES/mtgtable/cubelab/AtlasProbe.class" ]; then stale=1; fi
done
if [ "$stale" = 1 ]; then
  rm -rf "$CLASSES"
  mkdir -p "$CLASSES"
  java -m jdk.compiler/com.sun.tools.javac.Main -encoding UTF-8 -Xlint:all \
    -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" -d "$CLASSES" "${SRCS[@]}" >&2
fi

# Hard rule 6's flags, a config of the caller's choosing.
jvm() {
  local config="$1"; shift
  env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -Dmtgtable.config="$config" \
    -cp "$CLASSES:$REPO_ROOT/bridge/out:$FORGE_JAR" mtgtable.cubelab.AtlasProbe "$@"
}

run="$(basename "$out" .jsonl)-$player"
case "$run" in */*|.*) echo "label-probe: --out must name a file" >&2; exit 2 ;; esac
dir="$REPO_ROOT/var/label-probe/$run"
mkdir -p "$dir" "$(dirname "$out")"
# One run per --out at a time: the lock's fd is inherited by every JVM.
exec 9>>"$out.lock"
flock -n 9 || { echo "label-probe: another run is still writing $out (a JVM of it, maybe: pgrep -f AtlasProbe)" >&2; exit 2; }
if [ -f "$out" ]; then
  node -e 'const fs=require("fs");const f=process.argv[1];const b=fs.readFileSync(f);const i=b.lastIndexOf(10);if(i+1<b.length){fs.truncateSync(f,i+1);console.log("label-probe: cut a torn last line off "+f)}' "$out"
fi
echo "label-probe: $player ($hash), $workers worker(s) -> $out; logs under $dir"

pids=()
for ((i = 0; i < workers; i++)); do
  home="$(forge_home_make "$dir/home-$i")"
  (
    attempt=0
    while :; do
      rc=0
      jvm "$home" "${args[@]}" --player "$player" --seat "$seat" --hash "$hash" --shard "$i/$workers" \
        --out "$out" >> "$dir/shard-$i.log" 2>&1 || rc=$?
      attempt=$((attempt + 1))
      if { [ "$rc" = 3 ] || [ "$rc" = 4 ]; } && [ "$attempt" -lt 12 ]; then
        echo "label-probe: shard $i exited $rc; starting it again" >&2
        continue
      fi
      exit "$rc"
    done
  ) &
  pids+=($!)
done
rc=0
for p in "${pids[@]}"; do wait "$p" || rc=1; done
[ "$rc" = 0 ] || echo "label-probe: a shard failed -- see $dir/shard-*.log" >&2
python3 -I -c '
import collections, json, sys
last = {}
for line in open(sys.argv[1]):
    try:
        r = json.loads(line)
    except ValueError:
        continue
    if r.get("player") != sys.argv[2]:
        continue
    k = (r.get("key"), r.get("repeat"))
    # the row that is read: the last of a repeat that is not an error, else its last error (agreement.py)
    if k not in last or r.get("status") != "error" or last[k].get("status") == "error":
        last[k] = r
n = collections.Counter(r.get("status") for r in last.values())
print("label-probe: %s rows of %s: %s" % (sum(n.values()), sys.argv[2], ", ".join("%s %d" % kv for kv in sorted(n.items()))))
' "$out" "$player"
exit "$rc"

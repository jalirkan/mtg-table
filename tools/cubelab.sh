#!/usr/bin/env bash
# mtg-table — the cube lab: draft a two-player cube with two AIs, build their
# decks, play them against each other on Forge, and report what happened.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   tools/cubelab.sh check   cubes/synergy-cube-180.md
#   tools/cubelab.sh ratings init cubes/synergy-cube-180.md     # -> cubes/synergy-cube-180.ratings.tsv
#   tools/cubelab.sh run     cubes/synergy-cube-180.md --format grid --drafts 40 --jobs 4 --seed 1 --record 3
#   tools/cubelab.sh report  var/cubelab/runs/synergy-cube-180-grid-1   # also writes meta.json
#   tools/cubelab.sh meta    var/cubelab/runs/synergy-cube-180-grid-1 --cube cubes/synergy-cube-180.md
#   tools/cubelab.sh learn   var/cubelab/runs/synergy-cube-180-grid-1 --cube cubes/synergy-cube-180.md \
#                            --out var/cubelab/learned/synergy.ratings.tsv           # D301, no engine
#   tools/cubelab.sh selfplay cubes/synergy-cube-180.md --iterations 2 --drafts-per-iter 30 --jobs 2   # D302
#
# Overnight, one command (resumable: run it again with the same --out and it
# skips the drafts already in drafts.jsonl):
#
#   tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 1000 --jobs 4 \
#       --out var/cubelab/runs/overnight && tools/cubelab.sh report var/cubelab/runs/overnight
#
# docs/guides/cube-lab.md is the manual (every flag, every weight, the JSONL
# shape); DECISIONS.md D293-D296 are why it is built this way.  This script:
#
#   1. reads the jar from $FORGE_JAR or config.json (hard rule 9, tools/config.sh);
#   2. builds the bridge if bridge/out is missing, and compiles
#      tools/cubelab/CubeLab.java into var/cubelab/classes/ when it is stale
#      (javac through jdk.compiler, never --release; the lint already scans it);
#   3. for `check`, `ratings`, `run` and `selfplay` (not `learn`, which reads files only), builds one Forge home per job under
#      var/cubelab/homes/<k>/ with forge_home_make (D129's helper), so no two
#      JVMs share a userDir, and hands them to the TypeScript side;
#   4. runs tools/cubelab/cli.ts under Node (type stripping, no build step).
#
# It writes under var/ only (plus `ratings init`'s TSV, beside the cube unless
# --out says otherwise), and never touches forge-home/ or var/forge/.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

[ $# -ge 1 ] || { node tools/cubelab/cli.ts; exit 2; }

cmd="$1"
if [ "$cmd" != "report" ] && [ "$cmd" != "meta" ] && [ "$cmd" != "learn" ]; then
  [ -f "$FORGE_JAR" ] || { echo "cubelab: FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
  if [ ! -f bridge/out/mtgtable/Bootstrap.class ]; then
    echo "cubelab: bridge/out is not built -- running ./bridge/build.sh first" >&2
    ./bridge/build.sh >&2
  fi
  CLASSES="$REPO_ROOT/var/cubelab/classes"
  HELPER="$CLASSES/mtgtable/cubelab/CubeLab.class"
  SRC="$REPO_ROOT/tools/cubelab/CubeLab.java"
  if [ ! -f "$HELPER" ] || [ "$SRC" -nt "$HELPER" ] || [ bridge/out/mtgtable/Bootstrap.class -nt "$HELPER" ]; then
    rm -rf "$CLASSES"
    mkdir -p "$CLASSES"
    java -m jdk.compiler/com.sun.tools.javac.Main -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" \
      -d "$CLASSES" -Xlint:all "$SRC" >&2
  fi
  # One Forge home per job (--jobs K; 1 for check / ratings).
  jobs=1
  prev=""
  for a in "$@"; do
    if [ "$prev" = "--jobs" ]; then jobs="$a"; fi
    prev="$a"
  done
  case "$jobs" in ''|*[!0-9]*) echo "cubelab: --jobs wants a number, got $jobs" >&2; exit 2 ;; esac
  [ "$jobs" -ge 1 ] || jobs=1
  homes=""
  for ((k = 0; k < jobs; k++)); do
    cfg="$(forge_home_make "${CUBELAB_HOME_ROOT:-var/cubelab/homes}/$k")"
    homes="${homes:+$homes,}$cfg"
  done
  export CUBELAB_CP="$CLASSES:$REPO_ROOT/bridge/out:$FORGE_JAR"
  export CUBELAB_HOMES="$homes"
fi
exec node tools/cubelab/cli.ts "$@"

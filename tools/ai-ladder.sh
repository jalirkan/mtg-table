#!/usr/bin/env bash
# mtg-table — the AI ladder: named AI configs rated against each other and
# stock Forge, from ai-bench games (D315-D318).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   tools/ai-ladder.sh list                                  # the registry, and what is unavailable here
#   tools/ai-ladder.sh run --hours 8 --jobs 7                # spend a time budget where it is most informative
#   tools/ai-ladder.sh sprt policy-outlet forge-default --elo0 0 --elo1 20 --jobs 7
#   tools/ai-ladder.sh tune policy-outlet --param profile=Default,Cautious,Reckless,Experimental \
#                           --param outlets=on,off --jobs 7
#   tools/ai-ladder.sh league --hours 8 --jobs 7             # the self-play loop
#   tools/ai-ladder.sh ratings [--bootstrap 200]
#   tools/ai-ladder.sh report                                # var/ai-ladder/report.html + ladder.json
#
# docs/guides/ai-ladder.md is the manual.  Players are tools/ai-ladder/players.json;
# results are var/ai-ladder/results/<host>.jsonl, append-only, one file per machine.
# Every game is a tools/ai-bench/AiBench.java game (D309): this script compiles it
# into var/ai-ladder/classes/ (javac through jdk.compiler, never --release), makes
# one Forge home per --jobs worker under var/ai-ladder/homes/<k>/ (forge_home_make,
# D129's rule), and runs tools/ai-ladder/cli.ts under Node.  `list`, `ratings`
# and `report` read files only and need no engine.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"

[ $# -ge 1 ] || { node tools/ai-ladder/cli.ts; exit 2; }

cmd="$1"
case "$cmd" in
  run|sprt|tune|league)
    [ -f "$FORGE_JAR" ] || { echo "ai-ladder: FORGE_JAR not found: $FORGE_JAR" >&2; exit 1; }
    if [ ! -f bridge/out/mtgtable/ai/PolicyLobbyPlayerAi.class ]; then
      echo "ai-ladder: bridge/out is not built -- running ./bridge/build.sh first" >&2
      ./bridge/build.sh >&2
    fi
    CLASSES="$REPO_ROOT/var/ai-ladder/classes"
    HELPER="$CLASSES/mtgtable/bench/AiBench.class"
    SRC="$REPO_ROOT/tools/ai-bench/AiBench.java"
    if [ ! -f "$HELPER" ] || [ "$SRC" -nt "$HELPER" ] || [ bridge/out/mtgtable/Bootstrap.class -nt "$HELPER" ]; then
      rm -rf "$CLASSES"
      mkdir -p "$CLASSES"
      java -m jdk.compiler/com.sun.tools.javac.Main -nowarn -encoding UTF-8 \
        -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" -d "$CLASSES" "$SRC" >&2
    fi
    jobs=2
    prev=""
    for a in "$@"; do
      if [ "$prev" = "--jobs" ]; then jobs="$a"; fi
      prev="$a"
    done
    case "$jobs" in ''|*[!0-9]*) echo "ai-ladder: --jobs wants a number, got $jobs" >&2; exit 2 ;; esac
    [ "$jobs" -ge 1 ] || jobs=1
    homes=""
    for ((k = 0; k < jobs; k++)); do
      cfg="$(forge_home_make "${LADDER_HOME_ROOT:-var/ai-ladder/homes}/$k")"
      homes="${homes:+$homes,}$cfg"
    done
    export LADDER_CP="$CLASSES:$REPO_ROOT/bridge/out:$FORGE_JAR"
    export LADDER_HOMES="$homes"
    # --jobs is the shell's; the rest goes to the CLI
    args=()
    skip=0
    for a in "$@"; do
      if [ "$skip" = 1 ]; then skip=0; continue; fi
      if [ "$a" = "--jobs" ]; then skip=1; continue; fi
      args+=("$a")
    done
    exec node tools/ai-ladder/cli.ts "${args[@]}"
    ;;
esac
exec node tools/ai-ladder/cli.ts "$@"

#!/usr/bin/env bash
# mtg-table — run a bridge main class against the installed Forge fat jar.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Usage:  ./bridge/run.sh mtgtable.Smoke [args...]
#
# The flags, and why each one is here:
#   env -u DISPLAY                            prove the run is genuinely headless
#   -Xmx4096m                                 what forge.sh itself uses
#   -Djava.awt.headless=true                  2.0.14 does not set this for itself
#   -Dio.netty.tryReflectionSetAccessible     what forge.sh itself uses
#   -Dfile.encoding=UTF-8                     card names carry non-ASCII
#   -Dsentry.uncaught.handler.enabled=false   LOAD-BEARING.  Sentry installs an
#       uncaught-exception handler that swallows startup crashes and leaves a
#       silent exit 1 with no stack trace.  Without this flag you cannot debug a
#       boot failure at all.
#   -Dmtgtable.config                         config.json -- or $MTG_TABLE_CONFIG,
#       which Config.java already documents and which this line used to
#       override.  tools/check-engine-crash.sh points it at a scratch config
#       under var/ whose Forge home carries a card the engine cannot build;
#       nothing else sets it (D115), and check-all.sh, scripts/play.sh and
#       scripts/spectate.sh unset it.  Any other config is named on stderr, so
#       a stray export shows.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR"; exit 1; }
[ -d "$REPO_ROOT/bridge/out" ] || { echo "not built yet -- run ./bridge/build.sh"; exit 1; }
[ $# -ge 1 ] || { echo "usage: $0 <main-class> [args...]"; exit 1; }

# Relative paths in config.json (forgeHome, deck) are repo-relative.
cd "$REPO_ROOT"

CONFIG="${MTG_TABLE_CONFIG:-$REPO_ROOT/config.json}"
if [ "$CONFIG" != "$REPO_ROOT/config.json" ]; then
  echo "bridge/run.sh: config $CONFIG (from MTG_TABLE_CONFIG), not $REPO_ROOT/config.json" >&2
fi

exec env -u DISPLAY java \
  -Xmx4096m \
  -Djava.awt.headless=true \
  -Dio.netty.tryReflectionSetAccessible=true \
  -Dfile.encoding=UTF-8 \
  -Dsentry.uncaught.handler.enabled=false \
  -Dmtgtable.config="$CONFIG" \
  -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" \
  "$@"

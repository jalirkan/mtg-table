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
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR"; exit 1; }
[ -d "$REPO_ROOT/bridge/out" ] || { echo "not built yet -- run ./bridge/build.sh"; exit 1; }
[ $# -ge 1 ] || { echo "usage: $0 <main-class> [args...]"; exit 1; }

# Relative paths in config.json (forgeHome, deck) are repo-relative.
cd "$REPO_ROOT"

exec env -u DISPLAY java \
  -Xmx4096m \
  -Djava.awt.headless=true \
  -Dio.netty.tryReflectionSetAccessible=true \
  -Dfile.encoding=UTF-8 \
  -Dsentry.uncaught.handler.enabled=false \
  -Dmtgtable.config="$REPO_ROOT/config.json" \
  -cp "$REPO_ROOT/bridge/out:$FORGE_JAR" \
  "$@"

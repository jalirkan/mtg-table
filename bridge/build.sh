#!/usr/bin/env bash
# mtg-table — compile the Java bridge against the installed Forge fat jar.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# This machine has an OpenJDK 21 *JRE* and no javac binary, but the JRE image
# still carries the jdk.compiler module, so the compiler is reachable as a
# module main class.
#
# NEVER add --release: the JRE image ships no ct.sym, so --release fails with
# "release version N not supported".  Plain javac emits Java 21 bytecode, which
# runs fine on the Java 21 that is going to run it.  Source stays Java 17
# compatible anyway, because the Forge jar is class-file major 61.
#
# Usage:  ./bridge/build.sh
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"

[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR"; exit 1; }

OUT="$REPO_ROOT/bridge/out"
SRC="$REPO_ROOT/bridge/src"

# The grep lint runs BEFORE javac, because every rule in it is about a call that
# compiles perfectly well: FModel.getDecks() renaming the user's .dck files,
# CardView.getBackup() handing out the real card behind a morph, an engine
# string that names a card in a hidden zone.  See tools/lint-bridge.sh for the
# rules and the reason behind each one.
"$REPO_ROOT/tools/lint-bridge.sh"

mkdir -p "$OUT"
mapfile -t SOURCES < <(find "$SRC" -name '*.java' | sort)
[ "${#SOURCES[@]}" -gt 0 ] || { echo "no sources under $SRC"; exit 1; }

echo "compiling ${#SOURCES[@]} file(s) -> $OUT"
java -m jdk.compiler/com.sun.tools.javac.Main \
     -cp "$FORGE_JAR" \
     -d "$OUT" \
     -Xlint:all \
     "${SOURCES[@]}"

# Unit-check Json.java on every build.  A broken escape or a broken nesting
# check has to fail here, not three hundred frames into a fixture -- and there
# is no JUnit on this machine (JRE only, no Maven), so the test is a main().
# It needs the Forge jar on the classpath because Json.parse delegates to
# org.eclipse.jetty.util.ajax.JSON, which is bundled in it.
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.JsonSelfTest

echo "build OK"

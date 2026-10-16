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
#
# And before the lint, the lint's own negative controls (D180): every rule it
# declares must FIRE on a snippet planted in a scratch copy of bridge/src and
# tools/ under var/lint-selftest/, and a rule with no case there fails the
# build.  Two rules were dead from the first commit because nothing asked.
# About a second (its cases run concurrently); --quiet prints only failures and
# the summary.
"$REPO_ROOT/tools/lint-bridge-selftest.sh" --quiet
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
# org.eclipse.jetty.util.ajax.JSON, which is bundled in it.  It also holds
# Snap.block, the `blockers` event's entry (amendment M52, D290).
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.JsonSelfTest

# Unit-check the ask path's answer marshalling on every build, for the same
# reason and in the same shape.  Forge dispatched only 2 of the 11 ask kinds in
# every game recorded for M2, so for the other nine this is the ONLY check that
# runs at all -- and assign_damage's "index 0 is the defending player, index i is
# blockers.get(i-1)" (protocol section 5.3) is a one-off error that produces a
# perfectly well-formed answer either way.  It parses its answers with
# Json.parse, hence the Forge jar on the classpath (Jetty is bundled in it).
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.AskSelfTest

# Unit-check the frame log's close path, with the same mutation discipline.  The
# defect it exists for was invisible in a green run: close() held this object's
# monitor across its own thread.join(30s) while the appender needed that monitor
# after every line, so close() burned the whole timeout and returned a TRUNCATED
# file (measured: 12,089 of 20,001 lines on disk), and MtgTable/RecordMatch call
# System.exit next, which kills the daemon appender mid-write.  Every `frames =
# N` in a run summary and every `tail -1 == over` assertion downstream depends on
# this being correct, so it is asserted in time and in line count, not in shape.
# It writes only under var/.
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.GameLogSelfTest "$REPO_ROOT/var/gamelog-selftest"

# Unit-check that `over` stays the TERMINAL frame when another thread is
# emitting at the same instant (protocol sections 7 and 8.4).  WireGuiGame.emit
# and logC2s once checked `overEmitted` outside the log's monitor, so a frame
# that read the flag false could be numbered one past `over` -- seen only under
# load, as three gate runs failing 10a/10b/10g on "the last frame ... is not
# over".  The test parks both racers on the monitor so the losing interleaving
# happens every run, then stresses it without help.  It loads WireGuiGame, so it
# installs the headless GUI first (hard rule 1) and runs under hard rule 6's
# flags; it boots no engine, and writes only under var/.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.OverRaceSelfTest "$REPO_ROOT/var/over-race-selftest" \
    "$REPO_ROOT/forge-home"

# Unit-check D136's guard -- the check in front of the two acts that write the
# engine from the EDT (`undo`, `useMana`), which used to be applied whenever
# they arrived and so raced Game-0 inside MagicStack's undo stack (an
# ArrayIndexOutOfBoundsException in the story branch's gate run).  The decision
# table, each condition failing on its own, and the thread-state reading the
# last condition rests on, on real threads.  The race itself is reproduced end
# to end by tools/undo-race-repro.sh, which needs a game.  Same launch as the
# test above (it installs the headless GUI first, hard rule 1, and borrows its
# mtg-table-bg threads); it boots no engine and writes nothing.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.ActGuardSelfTest "$REPO_ROOT/forge-home"

# Unit-check amendment M50 (D280-D282): the read-only observer socket and the
# Origin allowlist, on a real WsTransport bound to a free loopback port, driven
# by raw-socket clients that choose their own Origin header.  A disallowed
# Origin is a 403 on both paths; an observer is never the seat (a second /ws is
# still refused 4001, onResync/onDisconnect never fire for one); everything an
# observer sends reaches nothing; a late observer's catch-up is the cached
# frames byte for byte; and one that stops reading is dropped at the backlog
# bound without holding up push().  No game and no Forge class -- the netty in
# the jar is all it loads -- and it writes nothing; hard rule 6's flags anyway,
# because it runs the bridge's own netty server.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.WsObserveSelfTest

# Unit-check amendment M51 (D287-D289): LAN play's pairing token, the static
# ForgeCoach site and the same-origin rule, on real WsTransports bound to free
# ports.  A phone is played from 127.0.0.1 by swapping the transport's loopback
# predicate: without the token a non-loopback peer gets 403 on the page, an
# asset, /health and both sockets; the cookie the page hands back admits assets
# and never a socket; content types, no Content-Encoding on a .jsonl.gz; every
# traversal spelling and a symlink out of the root refused; http://<Host> is an
# allowed Origin for a remote peer and never for a loopback one (DNS
# rebinding).  No game, no Forge class; it writes a scratch site under var/.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.WsLanSelfTest "$REPO_ROOT/var/lan-selftest"

# Unit-check amendment M59 (D402): a table of two's door, on a real TableServer
# bound to free loopback ports with two table seats.  A seat token per seat and
# no loopback exemption (no token or a wrong one is 403 from 127.0.0.1); no
# /observe; the Origin rule (the page's host on another port, https, a
# --table-origin); a second socket with the same token replaces the first (4002);
# ten wrong tokens from one tunnelled address and the next is 429; the health
# port answers /health and nothing else; the seats file's exact shape.  No game,
# no Forge class; it writes two small files under var/.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.TableSelfTest "$REPO_ROOT/var/table-selftest"
# D448: a game nobody is connected to on a --games N server is abandoned with no
# result and the session goes on -- MtgTable's own loop over a fake seat whose
# clock it advances, and a real WsTransport's client line and /health header.
# No engine, so CI's bridge job runs it too.
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "$OUT:$FORGE_JAR" mtgtable.StalledGameSelfTest

# Unit-check the position evaluator's Java half (D316) against its Python half:
# fixtures/eval/golden.json is tools/ml/eval_golden.py's answer for every
# decision row of every committed recording -- the rows chosen, every feature,
# and P(win) from fixtures/eval/model.json -- and Java must reproduce it; a
# model with another schema id or for another cube is refused; and D305's
# hidden-zone scrambler, in Java, must change no feature.  No engine and no
# Forge class beyond Jetty's JSON parser; it writes one temp file and deletes it.
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.eval.EvalSelfTest "$REPO_ROOT"

# Unit-check the coach grader's arithmetic (D334): common-random-number
# seeds, Wilson and paired-difference intervals, the regret table, racing on
# synthetic options with known win rates, enumeration by creature class, the
# coach bench's token spelling, and the frame-log reader's moments.  No engine;
# the engine half is tools/coach-grade.sh selftest (not in the build).
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.grade.GradeSelfTest

# Unit-check the AI seats' decision records (D347): the token grammar the
# redaction checker also holds, the attack and block spellings agreeing with the
# grader's, the JSON body, and a token that could carry a card name refused
# before it is written.  No engine.
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.ai.DecisionSelfTest

# Unit-check the distilled policy's engine-free half (J126, B1): the layout
# against fixtures/distill/names.json (what tools/ml/distill.py reads), the
# model's Java forward pass against numpy's on fixtures/distill/golden.json, its
# refusals of another layout, the search config's distill= key, and the row
# exporter's lines.  No engine; it writes one temp folder and deletes it.
java -Dfile.encoding=UTF-8 -cp "$OUT:$FORGE_JAR" mtgtable.ai.DistillSelfTest "$REPO_ROOT"

echo "build OK"

#!/usr/bin/env bash
# mtg-table — the undo race, reproduced every run  (decision D136)
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Usage:  ./tools/undo-race-repro.sh                 # both halves, ~15 s
#         UNDO_RACE_PORT=8805 ./tools/undo-race-repro.sh
#
# The defect: `act: undo` was applied on mtg-table-EDT whenever it arrived.
# Forge's undo stack is a plain java.util.Stack that Game-0 also walks, so an
# undo that arrived while the engine was between a mana payment and the stack
# raced MagicStack.clearUndoStack (a lastIndexOf, then a remove(int)) -- an
# ArrayIndexOutOfBoundsException on Game-0 in the story branch's gate run, and
# out of undoLastAction() itself in M6's evidence section 4.3.
#
# The race window, held open.  The server runs with MTGTABLE_HOLD_UNDO_WINDOW_MS,
# which holds the game thread (spinning, RUNNABLE) at the first state of a game
# that offers an undo while NO input is up: the payment's stop() has removed the
# InputPayMana and is flushing our forwarder, and the next thing the engine does
# is release Game-0 into MagicStack.add -> recordUndoableActions ->
# clearUndoStack.  `tools/ws-auto-play.mjs --undo-race` sends `undo` the instant
# that state arrives, so it lands inside the hold every run.  Deck
# decks/yield-probe.dck (one-mana Thallids the policy pays for with Auto), seed 13.
#
# Two runs, and each one must come out the way it says:
#
#   guarded       the bridge as built.  The act is refused -- the client gets
#                 `notice {title:"Not now"}` (amendment M48) and exits 0 -- and
#                 the server's hook reports the undo stack UNTOUCHED across the
#                 hold (`undo window = 1 hold(s), ... mutated ... 0 time(s); ...
#                 1 refused, 0 applied`).
#   unguarded     the negative control: MTGTABLE_TEST_UNGUARDED_ACTS=1 turns
#                 D136's guard off, as the bridge was before it.  No "Not now";
#                 the client exits 9; the hook reports the undo stack MUTATED
#                 under the held engine thread (`... 1 time(s); ... 0 refused,
#                 1 applied`) -- the concurrent write that, unheld, is the crash.
#
# And the concede.  The client concedes the moment it has its verdict, which in
# the guarded run is while the window is still held -- the engine running.  A
# concede from the EDT then walked the player list under Game-0 (a
# ConcurrentModificationException, D136's sweep).  Guarded, it is DEFERRED: the
# outcome is written and the engine ends the game on its own thread
# (`concedes = 0 at once, 1 deferred`, and the game still reaches `over` with a
# `gameOver` state -- the client would exit 8 otherwise).  Unguarded it is
# applied at once, as it always was.
#
# Exit 0 when both halves came out as stated, 1 otherwise.  Hard rule 9: run it
# from the repo root; the jar comes from config.json or $FORGE_JAR, via
# bridge/run.sh.  Writes only under var/undo-race/ and var/games/undo-race-*/.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"
cd "$REPO_ROOT"
unset MTG_TABLE_CONFIG

[ -d bridge/out ] || { echo "not built yet -- run ./bridge/build.sh" >&2; exit 1; }
PORT="${UNDO_RACE_PORT:-8800}"
HOLD_MS="${UNDO_RACE_HOLD_MS:-1500}"
OUT="$REPO_ROOT/var/undo-race"
mkdir -p "$OUT"

SERVER_PID=""
stop_server() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}
trap stop_server EXIT

healthy() {
  node -e 'fetch("http://127.0.0.1:" + process.argv[1] + "/health")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => process.exit(t.trim() === "ok" ? 0 : 1))
      .catch(() => process.exit(1));' "$PORT" >/dev/null 2>&1
}

fails=0
check() {   # $1 what, then a command that must succeed
  local what="$1"
  shift
  if "$@"; then
    echo "  ok    $what"
  else
    echo "  FAIL  $what"
    fails=$((fails + 1))
  fi
}

# $1 tag, $2 the client exit code this half must produce, then env assignments.
half() {
  local tag="$1" want="$2"
  shift 2
  local slog="$OUT/$tag-server.log" clog="$OUT/$tag-client.log"
  rm -rf "var/games/undo-race-$tag"
  echo "== $tag (MTGTABLE_HOLD_UNDO_WINDOW_MS=$HOLD_MS${*:+ $*})"
  # `timeout` backgrounded directly, so $! is the wrapper that forwards our kill.
  env "$@" MTGTABLE_HOLD_UNDO_WINDOW_MS="$HOLD_MS" timeout --kill-after=15s 180s \
    ./bridge/run.sh mtgtable.MtgTable --transport ws --seed 13 --port "$PORT" \
    --game-id "undo-race-$tag" --deck decks/yield-probe.dck > "$slog" 2>&1 &
  SERVER_PID=$!
  local i
  for i in $(seq 1 90); do
    healthy && break
    sleep 1
  done
  healthy || { tail -20 "$slog" >&2; echo "  FAIL  the $tag server never answered /health on $PORT"; fails=$((fails + 1)); stop_server; return; }
  local rc=0
  node tools/ws-auto-play.mjs --port "$PORT" --timeout 150 --undo-race \
    --log "$OUT/$tag-client.jsonl" > "$clog" 2>&1 || rc=$?
  wait "$SERVER_PID" || true
  SERVER_PID=""
  grep -E 'UNDO RACE|FAILED' "$clog" | sed 's/^/    client: /'
  grep -E '^TEST HOOK|^NOT NOW|^CONCEDE|^undo window|^acts not now|^concedes|^ENGINE CRASHED' "$slog" \
    | sed 's/^/    server: /'
  check "$tag: the client exited $want (got $rc)" [ "$rc" = "$want" ]
  check "$tag: the server printed MTGTABLE OK" grep -q '^MTGTABLE OK$' "$slog"
  check "$tag: the server held the undo window once" grep -q '^undo window    = 1 hold(s)' "$slog"
}

half guarded 0 MTGTABLE_TEST_UNGUARDED_ACTS=0
check "guarded: the undo stack was untouched across the hold, the act refused" \
  grep -q 'mutated under a held engine thread 0 time(s); acts during a hold: 1 refused, 0 applied' \
  "$OUT/guarded-server.log"
check "guarded: the server refused it with the reason \"no input is up\"" \
  grep -q '^NOT NOW: undo refused, the engine is not quiet on this seat -- no input is up' "$OUT/guarded-server.log"
check "guarded: the client was told \"Not now\"" grep -q 'refused with "Not now"' "$OUT/guarded-client.log"
check "guarded: its concede, sent while the window was held, was deferred to the engine's own check" \
  grep -q '^concedes       = 0 at once, 1 deferred' "$OUT/guarded-server.log"

half unguarded 9 MTGTABLE_TEST_UNGUARDED_ACTS=1
check "unguarded (negative control): the undo stack was MUTATED under the held engine thread" \
  grep -q 'mutated under a held engine thread 1 time(s); acts during a hold: 0 refused, 1 applied' \
  "$OUT/unguarded-server.log"
check "unguarded (negative control): the hook saw it happen" \
  grep -q '^TEST HOOK: UNDO STACK MUTATED UNDER A RUNNING ENGINE THREAD' "$OUT/unguarded-server.log"
check "unguarded (negative control): the concede was applied at once, from the EDT" \
  grep -q '^concedes       = 1 at once, 0 deferred' "$OUT/unguarded-server.log"

if [ "$fails" -eq 0 ]; then
  echo "undo-race-repro: OK -- guarded refuses the late undo, the guard off lets it write under a running engine thread"
  exit 0
fi
echo "undo-race-repro: $fails check(s) FAILED (logs: $OUT)"
exit 1

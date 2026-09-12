#!/usr/bin/env bash
# mtg-table — play a game in a browser tab.  M3.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# One command, five steps:
#
#   1. tools/check-forge.sh      the jar is present and carries the 8 classes
#   2. bridge/build.sh           javac + the lint + the three self-tests
#   3. the bridge, in the background:
#        ./bridge/run.sh mtgtable.MtgTable --transport ws --port <wsPort> ...
#      with its stdout and stderr in var/play/server.log
#   4. wait for GET /health to answer 200 "ok" on the same port
#   5. vite (web/node_modules/.bin/vite, exec'd directly so the pid this script
#      holds is the server itself), in the foreground, opening the board in
#      ws mode:
#
#        http://127.0.0.1:<webPort>/?ws=1
#
#   Ctrl-C stops both.  So does the bridge exiting: the JVM plays ONE game and
#   exits 0 after `over`, and this script notices and stops vite with it.
#
# Usage:
#   ./scripts/play.sh                       # config.json's deck, ports and a random seed
#   ./scripts/play.sh --seed 42             # a reproducible shuffle
#   ./scripts/play.sh --deck decks/pacho-shield.dck --deck2 decks/morph-probe.dck
#   ./scripts/play.sh --port 8643           # a second bridge beside a running one
#   ./scripts/play.sh --no-open             # do not launch a browser
#   ./scripts/play.sh --keep-open           # leave the bridge up 30 s after `over`
#
# Everything after `--` goes to `mtgtable.MtgTable` untouched, so a flag this
# script has never heard of still reaches the bridge:
#
#   ./scripts/play.sh -- --ai-name "Doom"
#
# The ports come from config.json (`wsPort`, `webPort`) and are overridable with
# --port / --web-port.  The web port is vite's `strictPort: false`, so if 5173 is
# busy vite picks another and prints it; the URL below is the one it was ASKED
# for, which is why the script prints vite's own line too.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"
cd "$REPO_ROOT"

WS_PORT="$(cfg_get wsPort || echo 8642)"
WEB_PORT="$(cfg_get webPort || echo 5173)"
OPEN=1
KEEP_OPEN=0
PASSTHROUGH=()

while [ $# -gt 0 ]; do
  case "$1" in
    --port)      WS_PORT="$2"; shift 2 ;;
    --web-port)  WEB_PORT="$2"; shift 2 ;;
    --no-open)   OPEN=0; shift ;;
    --keep-open) KEEP_OPEN=1; shift ;;
    --help|-h)   sed -n '5,39p' "$0"; exit 0 ;;
    --)          shift; PASSTHROUGH+=("$@"); break ;;
    *)           PASSTHROUGH+=("$1"); shift ;;
  esac
done

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31mplay.sh: %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------------------
# 1 + 2: the gate and the build
# --------------------------------------------------------------------------

say "check-forge"
./tools/check-forge.sh >/dev/null || die "tools/check-forge.sh failed — run it directly for the detail"
echo "jar OK"

say "build"
./bridge/build.sh || die "bridge/build.sh failed"

[ -d web/node_modules ] || die "web/node_modules is missing — run: npm --prefix web install"

# --------------------------------------------------------------------------
# 3: the bridge, in the background
# --------------------------------------------------------------------------

mkdir -p var/play
SERVER_LOG="var/play/server.log"
: > "$SERVER_LOG"

SERVER_PID=""
VITE_PID=""

stop() {
  # Idempotent: this runs from the trap AND from the normal exit path.
  trap - INT TERM EXIT
  if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$VITE_PID" 2>/dev/null || break
      sleep 0.3
    done
    kill -9 "$VITE_PID" 2>/dev/null || true
    wait "$VITE_PID" 2>/dev/null || true
  fi
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\nstopping the bridge (pid %s)\n' "$SERVER_PID"
    kill "$SERVER_PID" 2>/dev/null || true
    # The JVM gets a moment to close the socket and flush its frame log; the
    # log is written per line (§8) so even a KILL leaves a parseable file.
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.3
    done
    kill -9 "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap stop INT TERM EXIT

say "bridge — ws://127.0.0.1:$WS_PORT/ws"
KEEP_ARGS=()
[ "$KEEP_OPEN" = "1" ] && KEEP_ARGS+=(--keep-open)
./bridge/run.sh mtgtable.MtgTable --transport ws --port "$WS_PORT" \
    "${KEEP_ARGS[@]+"${KEEP_ARGS[@]}"}" "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}" \
    >>"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "pid $SERVER_PID · log $SERVER_LOG"

# --------------------------------------------------------------------------
# 4: readiness — GET /health on the same port
# --------------------------------------------------------------------------

say "waiting for GET http://127.0.0.1:$WS_PORT/health"
READY=0
for i in $(seq 1 120); do          # 120 × 0.5 s = 60 s; a cold FModel.initialize is ~10 s
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    tail -30 "$SERVER_LOG" >&2
    die "the bridge exited before it was ready (full log: $SERVER_LOG)"
  fi
  if command -v curl >/dev/null 2>&1; then
    body="$(curl -fsS --max-time 2 "http://127.0.0.1:$WS_PORT/health" 2>/dev/null || true)"
  else
    body="$(node -e '
      fetch(`http://127.0.0.1:${process.argv[1]}/health`).then(r => r.text()).then(t => process.stdout.write(t)).catch(() => {});
    ' "$WS_PORT" 2>/dev/null || true)"
  fi
  case "$body" in
    ok*) READY=1; break ;;
  esac
  sleep 0.5
  [ $((i % 10)) -eq 0 ] && printf '.'
done
[ "$READY" = "1" ] || { tail -30 "$SERVER_LOG" >&2; die "no /health after 60 s (full log: $SERVER_LOG)"; }
echo "ready"

# --------------------------------------------------------------------------
# 5: the board
# --------------------------------------------------------------------------

URL="http://127.0.0.1:$WEB_PORT/?ws=1"
[ "$WS_PORT" = "8642" ] || URL="$URL&port=$WS_PORT"

say "board — $URL"
cat <<EOF
  Space  press the engine's OK button      (its label is Forge's: OK / Auto / …)
  Esc    press the engine's Cancel button  (… / Undo (2) / End Turn)
  click  any card, any player name — Forge judges the click (protocol §4.1, M8)
  the bridge plays ONE game and exits; Ctrl-C stops both halves.
EOF

# vite DIRECTLY, not `npm run dev`.  Contract (e) says Ctrl-C stops both halves,
# and through npm it did not: $! was the npm WRAPPER, and the vite process npm
# spawned was reparented and kept listening after this script returned 0
# (measured: pid 476167 `node .../vite --port 5173`, PPID 2432, still LISTENing
# on 127.0.0.1:5173 with the bridge already gone).  `env -C web` execs the
# binary, so the pid this script holds IS the server -- `npm run dev` is
# literally `vite`, so nothing else is lost.
VITE_BIN="$REPO_ROOT/web/node_modules/.bin/vite"
[ -x "$VITE_BIN" ] || die "$VITE_BIN is missing or not executable — run: npm --prefix web install"
VITE_ARGS=(--port "$WEB_PORT")
[ "$OPEN" = "1" ] && VITE_ARGS+=(--open "/?ws=1$([ "$WS_PORT" = "8642" ] || printf '&port=%s' "$WS_PORT")")
env -C "$REPO_ROOT/web" "$VITE_BIN" "${VITE_ARGS[@]}" &
VITE_PID=$!

# Whichever half stops first takes the other with it: a dead bridge leaves a
# board with nothing to talk to, and a closed browser means the game is over.
while kill -0 "$VITE_PID" 2>/dev/null; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    say "the bridge exited — its last lines:"
    tail -20 "$SERVER_LOG"
    break
  fi
  sleep 1
done

stop

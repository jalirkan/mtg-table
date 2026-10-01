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
#   Ctrl-C stops both.  So does the bridge exiting: when the match is over and
#   the linger window has closed, the JVM exits 0 and this script stops vite.
#
# M6 CHANGED THE DEFAULTS, and PLAN.md's M6 command block is why: a bare
# `./scripts/play.sh` is "three games back to back, one command typed".  So this
# script now passes `--games 3` (unless the caller gave a --games of their own)
# AND `--keep-open` (unless `--no-keep-open`).  Both are needed for the board's
# New Game row to have a session to act in: without --games the JVM stops after
# game 1, and without --keep-open it closes the socket the instant the LAST
# `over` lands -- which is the moment the row appears.  M6's verification found
# exactly that dead end on the milestone's own headline command.
#
# MATCH SETUP (protocol amendment M44) picks what you play against:
#
#   --deck <path>        your deck               config.json match.deck    (else "deck")
#   --ai-deck <path>     the AI's deck           config.json match.aiDeck  -- shipped as
#                        (--deck2 is the same flag)   decks/doom-legion.dck; null = a mirror
#   --ai-profile <name>  which AI profile        config.json match.aiProfile (else Default)
#                        -- one of the .ai files in forge-home/res/ai/: Default, Cautious,
#                        Reckless, Experimental.  Forge has no "difficulty": each file is
#                        a set of ~120 heuristics (docs/research/11 section 9) whose effect
#                        is situational, and in same-seed pairs against the automated seat
#                        Cautious and Reckless were NOT measurably different
#                        (docs/evidence/match-setup.md section P).  It is not a dial.
#   --mirror             ignore match.aiDeck: the AI plays a copy of your deck
#   config.json match.games is how many games a bare run plays (default 3).
#
# The flags win over config.json, and a flag typed after `--` wins over both.
# The board's seat rails then say which deck each seat is on and the AI's
# profile; the AI's deck reaches the browser as a NAME and a card count only.
#
# Usage:
#   ./scripts/play.sh                       # three games vs Doom Legion (config.json's match block), random seed
#   ./scripts/play.sh --seed 42             # a reproducible shuffle
#   ./scripts/play.sh --ai-deck decks/morph-probe.dck --ai-profile Reckless
#   ./scripts/play.sh --deck decks/pacho-shield.dck --mirror --ai-profile Cautious
#   ./scripts/play.sh --port 8643           # a second bridge beside a running one
#   ./scripts/play.sh --arena               # open the 3D arena instead of the board
#   ./scripts/play.sh --no-open             # do not launch a browser
#   ./scripts/play.sh --no-keep-open        # close the socket the moment the match ends
#   ./scripts/play.sh -- --games 1          # one game only (your --games wins)
#   ./scripts/play.sh --engine-only         # ONLY the engine: no vite, no browser (below)
#   ./scripts/play.sh --engine-only --lan   # ...and play from a phone on the same Wi-Fi (below)
#   ./scripts/play.sh --lan --refresh-site  # ...re-downloading ForgeCoach's site first
#   ./scripts/play.sh --lan --site-dir ../ForgeCoach/dist   # ...serving a local ForgeCoach build
#
# Everything after `--` goes to `mtgtable.MtgTable` untouched, so a flag this
# script has never heard of still reaches the bridge:
#
#   ./scripts/play.sh -- --ai-name "Doom"
#
# M7 adds --arena, and it is one URL fragment: the arena is a SECOND RENDERER
# for the same frame stream, not a second app, so the socket, the bridge and the
# reducer are untouched and `#arena` is all that changes.  `V` switches back to
# the board mid-game without dropping a frame; `?arena=off` is the kill switch
# if WebGL will not start.
#
# --lan (amendment M51, D287-D289) is --engine-only for a PHONE on the same Wi-Fi.
# A phone cannot use the github.io page against this machine -- an https page may
# not open ws:// to a LAN address (mixed content; only localhost is exempt) -- so
# the bridge serves ForgeCoach ITSELF, over plain http on the ws port, and the
# phone opens http://<this machine's LAN IP>:<wsPort>/?token=<T>.  It implies
# --engine-only, and:
#
#   - binds 0.0.0.0 instead of 127.0.0.1, behind a fresh 128-bit pairing token per
#     run: every request from another machine (the page, its files, /health, /ws,
#     /observe) without it is a 403.  This machine needs no token, so the desktop's
#     browser -- github.io's ForgeCoach included -- works exactly as before;
#   - downloads ForgeCoach's built site, https://jalirkan.github.io/ForgeCoach/
#     forgecoach-site.zip, into var/forgecoach/ (re-downloaded when older than a
#     day, or with --refresh-site; offline, the cached copy; neither is an error
#     that says so) and the bridge serves it at / (--site-dir <path> serves a local
#     ForgeCoach build instead, e.g. its dist/ built with --base ./);
#   - prints the phone URL for every non-loopback IPv4 address, best guess first,
#     and a QR code of the first if `qrencode` is installed.
#
# THE TOKEN IS THE ONLY LOCK.  It is for a home network you trust: anyone on the
# same network who sees the URL can take the seat.  Ctrl-C stops it, and the next
# run has a new token.  D286's idle limit still applies: an hour with no /ws client
# ends the session.
#
# --engine-only is steps 1-4 and then a wait: no vite, no browser, no `web/node_modules`
# needed.  It is for a client that is not this repo's board -- ForgeCoach
# (https://jalirkan.github.io/ForgeCoach/), whose Play button connects to the
# bridge's seat socket ws://127.0.0.1:<wsPort>/ws from the browser (its Origin is on
# config.json's wsAllowedOrigins, D281).  The match flags are the same and so are
# the defaults (--games 3, --keep-open), because that client's New game / Next game
# needs the session to outlive an `over` exactly as the board's does.  It prints
# "Engine ready on ws://...", then runs until Ctrl-C (or SIGTERM) or until the
# match is over and the linger window has closed; either way the JVM is stopped
# and its pid reaped, and the script exits 0 (D285).  Do NOT keep an mtg-table
# board tab open beside it: the first /ws client takes the seat and a second one
# is refused 4001 (M13).  --arena, --web-port and --no-open mean nothing here and
# are ignored.
#
# The ports come from config.json (`wsPort`, `webPort`) and are overridable with
# --port / --web-port.  The web port is vite's `strictPort: false`, so if 5173 is
# busy vite picks another and prints it; the URL below is the one it was ASKED
# for, which is why the script prints vite's own line too.
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"
cd "$REPO_ROOT"

# This script reads config.json (the ports, the `match` block) and the bridge
# must read the same file: bridge/run.sh honours $MTG_TABLE_CONFIG, which
# tools/check-engine-crash.sh (D115) and the gate's jobs and ten-games' rows
# (D129) set for runs of their own, so an inherited one is dropped here.
unset MTG_TABLE_CONFIG

WS_PORT="$(cfg_get wsPort || echo 8642)"
WEB_PORT="$(cfg_get webPort || echo 5173)"
OPEN=1
ENGINE_ONLY=0                    # D285: steps 1-4 only, see the header
LAN=0                            # M51: a phone on the same Wi-Fi, see the header
REFRESH_SITE=0                   # M51: re-download ForgeCoach's site even if cached
SITE_DIR=""                      # M51: serve this ForgeCoach build instead of the download
SITE_URL="https://jalirkan.github.io/ForgeCoach/forgecoach-site.zip"
SITE_CACHE="var/forgecoach"
ARENA=0                          # M7: --arena opens /#arena instead of the board
KEEP_OPEN=1                      # M6: the default, see the header
PASSTHROUGH=()

# Match setup (M44): config.json's `match` block, then the flags.  `cfg_get`
# reads top-level keys only, so the block is read here; a missing block or key
# is the old behaviour (your `deck`, a mirror, Default, three games).
cfg_match() {
  node -e '
    const c = require(process.argv[1]); const m = c.match ?? {};
    const v = m[process.argv[2]];
    if (v === undefined || v === null || v === "") process.exit(2);
    process.stdout.write(String(v));
  ' "$CONFIG_JSON" "$1" 2>/dev/null
}
DECK="$(cfg_match deck || cfg_get deck || echo decks/pacho-shield.dck)"
AI_DECK="$(cfg_match aiDeck || true)"   # empty = a mirror of DECK
AI_PROFILE="$(cfg_match aiProfile || echo Default)"
GAMES_DEFAULT="$(cfg_match games || echo 3)"   # M6: "three games back to back, one command typed"

while [ $# -gt 0 ]; do
  case "$1" in
    --port)      WS_PORT="$2"; shift 2 ;;
    --web-port)  WEB_PORT="$2"; shift 2 ;;
    --engine-only) ENGINE_ONLY=1; shift ;;
    --lan)       LAN=1; ENGINE_ONLY=1; shift ;;
    --refresh-site) REFRESH_SITE=1; shift ;;
    --site-dir)  SITE_DIR="$2"; shift 2 ;;
    --no-open)   OPEN=0; shift ;;
    --arena)     ARENA=1; shift ;;
    --no-arena)  ARENA=0; shift ;;
    --keep-open) KEEP_OPEN=1; shift ;;
    --no-keep-open) KEEP_OPEN=0; shift ;;
    --deck)      DECK="$2"; shift 2 ;;
    --ai-deck|--deck2) AI_DECK="$2"; shift 2 ;;
    --ai-profile) AI_PROFILE="$2"; shift 2 ;;
    --mirror)    AI_DECK=""; shift ;;
    --help|-h)   sed -n '5,118p' "$0"; exit 0 ;;
    --)          shift; PASSTHROUGH+=("$@"); break ;;
    *)           PASSTHROUGH+=("$1"); shift ;;
  esac
done

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31mplay.sh: %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------------------
# 0: the match -- checked before anything slow runs
# --------------------------------------------------------------------------

# A flag the caller typed after `--` goes to MtgTable untouched and wins; this
# script then adds nothing of its own for that setting (the --games rule below).
passthrough_has() {
  local f
  for f in "$@"; do
    case " ${PASSTHROUGH[*]+${PASSTHROUGH[*]}} " in
      *" $f "*|*" $f="*) return 0 ;;
    esac
  done
  return 1
}
deck_name() {   # the .dck's own Name=, which is what the board will print
  local n
  n="$(sed -n 's/^Name=//p' "$1" | head -1 | tr -d '\r')"
  [ -n "$n" ] && printf '%s' "$n" || basename "$1" .dck
}
MATCH_ARGS=()
if ! passthrough_has --deck; then
  [ -f "$DECK" ] || die "your deck $DECK does not exist (--deck, or config.json match.deck)"
  MATCH_ARGS+=(--deck "$DECK")
fi
if ! passthrough_has --deck2 --ai-deck; then
  if [ -n "$AI_DECK" ]; then
    [ -f "$AI_DECK" ] || die "the AI's deck $AI_DECK does not exist (--ai-deck, or config.json match.aiDeck; --mirror plays your own)"
    MATCH_ARGS+=(--ai-deck "$AI_DECK")
  fi
fi
if ! passthrough_has --ai-profile; then
  # The bridge validates this too (Bootstrap.resolveAiProfile) -- this copy is
  # only so a typo costs a second instead of a build and an engine boot.
  PROFILES=()
  for f in forge-home/res/ai/*.ai; do
    [ -f "$f" ] && PROFILES+=("$(basename "$f" .ai)")
  done
  if [ "${#PROFILES[@]}" -gt 0 ]; then
    CANON=""
    for p in "${PROFILES[@]}"; do
      [ "${p,,}" = "${AI_PROFILE,,}" ] && CANON="$p"
    done
    [ -n "$CANON" ] || die "--ai-profile $AI_PROFILE is not one of: ${PROFILES[*]} (the .ai files in forge-home/res/ai/)"
    AI_PROFILE="$CANON"
  fi
  MATCH_ARGS+=(--ai-profile "$AI_PROFILE")
fi
say "match"
[ "$ENGINE_ONLY" = "1" ] && echo "mode: engine only (no vite, no browser) — D285"
[ "$LAN" = "1" ] && echo "mode: LAN — a phone on the same network, behind a pairing token (amendment M51)"
if passthrough_has --deck; then echo "you:  (the --deck after --)"; else
  echo "you:  $(deck_name "$DECK")  [$DECK]"; fi
if passthrough_has --deck2 --ai-deck; then echo "AI:   (the --ai-deck after --)"
elif [ -n "$AI_DECK" ]; then echo "AI:   $(deck_name "$AI_DECK")  [$AI_DECK]"
else echo "AI:   a mirror of your deck  (--mirror, or config.json match.aiDeck is null)"; fi
passthrough_has --ai-profile && echo "AI profile: (the --ai-profile after --)" \
  || echo "AI profile: $AI_PROFILE"

# --------------------------------------------------------------------------
# 0b: --lan's site (amendment M51, D289) -- before anything slow, so a missing
#     site costs a second and not a build
# --------------------------------------------------------------------------

# unpack_zip ZIP DIR -- `unzip`, or Python's zipfile where there is none.  Both
# refuse a member that would land outside DIR.
unpack_zip() {
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$1" -d "$2"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m zipfile -e "$1" "$2"
  else
    die "neither unzip nor python3 is installed, so $1 cannot be unpacked"
  fi
}
zip_ok() {   # a complete zip, not an HTML error page or a cut-off download
  if command -v unzip >/dev/null 2>&1; then unzip -tq "$1" >/dev/null 2>&1
  else python3 -c 'import sys,zipfile; sys.exit(zipfile.ZipFile(sys.argv[1]).testzip() is not None)' "$1" 2>/dev/null; fi
}
fetch_site() {
  local zip="$SITE_CACHE/forgecoach-site.zip" site="$SITE_CACHE/site" stamp="$SITE_CACHE/site.stamp" fresh=0
  mkdir -p "$SITE_CACHE"
  if [ "$REFRESH_SITE" = "1" ] || [ ! -f "$zip" ] || [ -n "$(find "$zip" -mmin +1440 2>/dev/null)" ]; then
    echo "downloading $SITE_URL"
    if command -v curl >/dev/null 2>&1 \
        && curl -fsSL --max-time 120 -o "$zip.part" "$SITE_URL" && zip_ok "$zip.part"; then
      mv -f "$zip.part" "$zip"
      fresh=1
    else
      rm -f "$zip.part"
      [ -f "$zip" ] || die "could not download $SITE_URL and there is no cached copy in $zip -- check the network (or curl), or pass --site-dir <a built ForgeCoach>"
      echo "  could not download it; using the cached copy of $(date -r "$zip" '+%Y-%m-%d %H:%M')"
    fi
  else
    echo "ForgeCoach's site: the cached copy of $(date -r "$zip" '+%Y-%m-%d %H:%M') (under a day old; --refresh-site re-downloads)"
  fi
  if [ "$fresh" = "1" ] || [ ! -f "$site/index.html" ] || [ ! -f "$stamp" ] || [ "$zip" -nt "$stamp" ]; then
    rm -rf "$site.new"
    mkdir -p "$site.new"
    unpack_zip "$zip" "$site.new" || die "could not unpack $zip"
    [ -f "$site.new/index.html" ] || die "$zip has no index.html at its root -- not ForgeCoach's site zip"
    rm -rf "$site"
    mv "$site.new" "$site"
    touch "$stamp"
  fi
  SITE_DIR="$site"
}
SITE_ARGS=()
if [ "$LAN" = "1" ] || [ -n "$SITE_DIR" ]; then
  say "ForgeCoach's site"
  if [ -n "$SITE_DIR" ]; then
    [ -f "$SITE_DIR/index.html" ] || die "--site-dir $SITE_DIR has no index.html at its root -- build ForgeCoach with --base ./ first"
    echo "serving $SITE_DIR (--site-dir)"
  else
    fetch_site
  fi
  SITE_ARGS+=(--site-dir "$SITE_DIR")
  [ "$LAN" = "1" ] && SITE_ARGS+=(--lan)
fi

# --------------------------------------------------------------------------
# 1 + 2: the gate and the build
# --------------------------------------------------------------------------

say "check-forge"
./tools/check-forge.sh >/dev/null || die "tools/check-forge.sh failed — run it directly for the detail"
echo "jar OK"

say "build"
./bridge/build.sh || die "bridge/build.sh failed"

[ "$ENGINE_ONLY" = "1" ] || [ -d web/node_modules ] || die "web/node_modules is missing — run: npm --prefix web install"

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
# --games: the caller's wins.  `--games` may arrive either before `--` (this
# script does not parse it, so it lands in PASSTHROUGH) or after it, and both
# spellings end up in the same array -- so one scan of that array decides.
case " ${PASSTHROUGH[*]+${PASSTHROUGH[*]}} " in
  *" --games "*|*" --games="*) : ;;
  *) KEEP_ARGS+=(--games "$GAMES_DEFAULT") ;;
esac
./bridge/run.sh mtgtable.MtgTable --transport ws --port "$WS_PORT" \
    "${MATCH_ARGS[@]+"${MATCH_ARGS[@]}"}" \
    "${KEEP_ARGS[@]+"${KEEP_ARGS[@]}"}" "${SITE_ARGS[@]+"${SITE_ARGS[@]}"}" \
    "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}" \
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
# 4b: --engine-only stops here and waits (D285)
# --------------------------------------------------------------------------

if [ "$ENGINE_ONLY" = "1" ]; then
  # `wait` is interrupted at once by a trapped signal, unlike a sleep loop.  The
  # terminal's Ctrl-C also reaches the JVM (same process group); either order ends
  # here, with stop() reaping whatever is left.
  on_signal() { printf '\nsignal received\n'; stop; exit 0; }
  trap on_signal INT TERM
  say "engine"
  printf 'Engine ready on ws://127.0.0.1:%s/ws — open https://jalirkan.github.io/ForgeCoach/ and click Play\n' "$WS_PORT"
  echo "  (observers: ws://127.0.0.1:$WS_PORT/observe · log: $SERVER_LOG · Ctrl-C stops it)"
  echo "  keep every mtg-table board tab closed: the first /ws client takes the seat"
  if [ "$LAN" = "1" ]; then
    # The bridge prints one `WS LAN PAGE` line per address, best guess first,
    # just after the readiness flip; give it a moment to land in the log.
    PAGES=()
    for _ in $(seq 1 20); do
      mapfile -t PAGES < <(sed -n 's/^WS LAN PAGE  //p' "$SERVER_LOG")
      [ "${#PAGES[@]}" -gt 0 ] && break
      sleep 0.25
    done
    say "LAN — open this on your phone (same Wi-Fi), then click Play"
    if [ "${#PAGES[@]}" -eq 0 ]; then
      echo "  no non-loopback IPv4 address found -- is this machine on a network? (log: $SERVER_LOG)"
    else
      echo "  ${PAGES[0]}"
      [ "${#PAGES[@]}" -gt 1 ] && echo "  other addresses of this machine, if that one does not load:"
      for u in "${PAGES[@]:1}"; do echo "    $u"; done
      if command -v qrencode >/dev/null 2>&1; then
        echo
        qrencode -t ANSIUTF8 -m 2 "${PAGES[0]}" || true
      fi
    fi
    echo "  this desktop needs no token: http://127.0.0.1:$WS_PORT/ or https://jalirkan.github.io/ForgeCoach/"
    echo "  the token is the only lock -- for a home network you trust; the next run has a new one"
  fi
  SERVER_RC=0
  wait "$SERVER_PID" || SERVER_RC=$?
  say "the bridge exited ($SERVER_RC) — its last lines:"
  tail -20 "$SERVER_LOG"
  stop
  exit "$SERVER_RC"
fi

# --------------------------------------------------------------------------
# 5: the board
# --------------------------------------------------------------------------

URL="http://127.0.0.1:$WEB_PORT/?ws=1"
[ "$WS_PORT" = "8642" ] || URL="$URL&port=$WS_PORT"
# The hash is the view (web/src/useView.ts), so it goes LAST and survives a
# bookmark, a reload and the Back button.
[ "$ARENA" = "1" ] && URL="$URL#arena"

say "$([ "$ARENA" = "1" ] && echo "arena" || echo "board") — $URL"
cat <<EOF
  Space  press the button the engine FOCUSED (input.buttons.focus, amendment
         M39 — its label is Forge's: OK / Auto / …). "Space = OK" was never a
         Forge shortcut.
  Esc    press the engine's Cancel button  (… / Undo (2) / End Turn)
  E T B  pass to end of turn / my next turn / just before my turn (act: yieldTo)
  P      pass priority          CTRL+Z  undo the last mana ability
  Y N    always yes / always no for the ability on top of the stack
  V      board <-> 3D arena (M7) -- the same game, two renderers, one state
  K      skip every animation playing in the arena
  H      the full key table, rendered from the one keymap
  click  any card, any player name — Forge judges the click (protocol §4.1, M8)
  the bridge plays the whole match and then waits for New Game for as long as
  this browser stays connected; Ctrl-C stops both halves.
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
if [ "$OPEN" = "1" ]; then
  OPEN_PATH="/?ws=1$([ "$WS_PORT" = "8642" ] || printf '&port=%s' "$WS_PORT")"
  [ "$ARENA" = "1" ] && OPEN_PATH="$OPEN_PATH#arena"
  VITE_ARGS+=(--open "$OPEN_PATH")
fi
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

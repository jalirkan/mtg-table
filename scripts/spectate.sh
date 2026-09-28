#!/usr/bin/env bash
# mtg-table — watch two Forge AIs play one game, in the 3D arena.  Spectating.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# One command:
#
#   ./scripts/spectate.sh                    # your deck vs config.json's match.aiDeck, random seed
#
# and what it does, in order:
#
#   1. tools/check-forge.sh       the jar is present and carries the 8 classes
#   2. bridge/build.sh            javac + the lint + the self-tests (--no-build skips it)
#   3. mtgtable.RecordMatch       BOTH seats AI, each on its own deck and Forge AI
#                                 profile, recorded from ONE seat's viewpoint into
#                                   var/spectate/<deckA>-vs-<deckB>-<seed>[-seat1].jsonl
#                                 with its own output beside it (.log)
#   4. vite (web/, dev server)    opening the arena on that file:
#                                   /?replay=spectate/<name>.jsonl&follow=1#arena
#                                 -- or, with --story, the story page on it:
#                                   /?replay=spectate/<name>.jsonl&follow=1#story
#
# FOLLOW MODE is the default: the recorder runs in the background, PACED
# (--pace, 600 ms after a frame where something happened and a quarter of that
# after one that only moved the phase strip), and the page plays each frame as
# it is written, at the recorder's pace, with the arena's cues animating it
# (decisions D118 and D120).  An AI-vs-AI game at engine speed is over in about
# 3.5 seconds, which is why the pace exists at all.  When the recorder writes
# its `over` frame the page stops polling and the replay controls take over:
# scrub back, step, change speed, switch camera.
#
# --no-follow records the whole game FIRST, at engine speed (~7 s including the
# engine's boot), and then opens it as an ordinary replay.
#
# WHOSE EYES.  A recording is one seat's view: --seat 0 (the default) is your
# deck's chair, and the other seat's hand stays hidden exactly as it would at the
# table -- there is no omniscient viewer (hard rule 8).  --seat 1 records the
# same seed from the other deck's chair; the same seed is the SAME GAME from the
# other side (measured: tools/same-game.mjs, docs/evidence/spectate.md).  The
# two files are named apart (-seat1), so you can record both and flip between
# them.
#
# THE MATCH, and where each default comes from:
#
#   --deck <path>          seat 0's deck      config.json match.deck (else "deck")
#   --ai-deck <path>       seat 1's deck      config.json match.aiDeck; --mirror plays seat 0's
#                          (--deck2 is the same flag)
#   --profile <name>       seat 0's Forge AI profile     Default
#   --ai-profile <name>    seat 1's Forge AI profile     config.json match.aiProfile (else Default)
#                          (--profile2 is the same flag) -- one of the .ai files in
#                          forge-home/res/ai/: Default, Cautious, Reckless, Experimental.
#                          Not a difficulty (D107): a set of ~120 heuristics each.
#   --seed <n>             the shuffle        random (printed, so you can replay it)
#   --seat 0|1             whose view         0
#
# and how you watch it:
#
#   --pace <ms>            the recorder's pace in follow mode (default 600; 0 = engine speed)
#   --no-follow            record first, then open the replay (engine speed unless --pace)
#   --2d                   open the 2D board instead of the arena (--arena is the default)
#   --story                open the STORY instead (#story, D125): the game told turn by
#                          turn as it is played -- who cast what, who attacked, who
#                          blocked, what died -- beside the replay bar; its `arena`
#                          link switches to the 3D table at the same frame, and back
#   --no-open              do not launch a browser; print the URL (the server still runs)
#   --no-serve             do not start vite either: record, check, print the URL for a
#                          dev server you already run (npm --prefix web run dev), exit
#   --web-port <n>         vite's port            config.json webPort (5173)
#   --no-build             skip bridge/build.sh (the gate, which has just built)
#   --name <name>          the file's name instead of <deckA>-vs-<deckB>-<seed>[-seat1]
#                          (letters, digits, . _ -; the gate uses its own so it never
#                          overwrites a recording of yours)
#
# Everything after `--` goes to mtgtable.RecordMatch untouched.
#
# The page's spectator mode is on by itself (a replay has no seat); press 6 (or
# 0) for the auto director, 1-5 for the fixed views, K to skip the animation on
# screen, V for the 2D board.  On the story page: the arrows walk the moments and
# the turns, Space plays and pauses, V is the arena and B the board.  Ctrl-C
# stops the recorder and the server.
#
# config.json's `match` block is read HERE and by scripts/play.sh -- the two
# commands a person types -- and by nothing the gate runs (D106, D122).
set -euo pipefail

. "$(cd "$(dirname "${BASH_SOURCE[0]}")/../tools" && pwd)/config.sh"
cd "$REPO_ROOT"

# This script reads config.json (the web port, the `match` block) and the
# recorder must read the same file: bridge/run.sh honours $MTG_TABLE_CONFIG,
# which only tools/check-engine-crash.sh sets (D115), so an inherited one is
# dropped here, exactly as scripts/play.sh and the gate drop it.
unset MTG_TABLE_CONFIG

cfg_match() {
  node -e '
    const c = require(process.argv[1]); const m = c.match ?? {};
    const v = m[process.argv[2]];
    if (v === undefined || v === null || v === "") process.exit(2);
    process.stdout.write(String(v));
  ' "$CONFIG_JSON" "$1" 2>/dev/null
}

WEB_PORT="$(cfg_get webPort || echo 5173)"
DECK="$(cfg_match deck || cfg_get deck || echo decks/pacho-shield.dck)"
AI_DECK="$(cfg_match aiDeck || true)"        # empty = a mirror of DECK
PROFILE="Default"
AI_PROFILE="$(cfg_match aiProfile || echo Default)"
SEED=""
SEAT=0
PACE=""                                      # "" = the mode's default
FOLLOW=1
OPEN=1
SERVE=1
VIEW=arena                                   # arena | board | story
BUILD=1
NAME_OVERRIDE=""
PASSTHROUGH=()

while [ $# -gt 0 ]; do
  case "$1" in
    --deck)                 DECK="$2"; shift 2 ;;
    --ai-deck|--deck2)      AI_DECK="$2"; shift 2 ;;
    --mirror)               AI_DECK=""; shift ;;
    --profile)              PROFILE="$2"; shift 2 ;;
    --ai-profile|--profile2) AI_PROFILE="$2"; shift 2 ;;
    --seed)                 SEED="$2"; shift 2 ;;
    --seat)                 SEAT="$2"; shift 2 ;;
    --pace)                 PACE="$2"; shift 2 ;;
    --follow)               FOLLOW=1; shift ;;
    --no-follow)            FOLLOW=0; shift ;;
    --no-open)              OPEN=0; shift ;;
    --no-serve)             SERVE=0; OPEN=0; shift ;;
    --2d|--board)           VIEW=board; shift ;;
    --arena)                VIEW=arena; shift ;;
    --story)                VIEW=story; shift ;;
    --web-port)             WEB_PORT="$2"; shift 2 ;;
    --no-build)             BUILD=0; shift ;;
    --name)                 NAME_OVERRIDE="$2"; shift 2 ;;
    --help|-h)              sed -n '5,83p' "$0"; exit 0 ;;
    --)                     shift; PASSTHROUGH+=("$@"); break ;;
    *) printf 'spectate.sh: unknown flag %s (see --help)\n' "$1" >&2; exit 2 ;;
  esac
done

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31mspectate.sh: %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------------------
# 0: the match -- checked before anything slow runs
# --------------------------------------------------------------------------

[ -f "$DECK" ] || die "seat 0's deck $DECK does not exist (--deck, or config.json match.deck)"
[ -z "$AI_DECK" ] || [ -f "$AI_DECK" ] || die "seat 1's deck $AI_DECK does not exist (--ai-deck, or config.json match.aiDeck; --mirror plays seat 0's)"
[ -n "$AI_DECK" ] || AI_DECK="$DECK"
case "$SEAT" in 0|1) ;; *) die "--seat is 0 (seat 0's deck, the default) or 1, got $SEAT" ;; esac
if [ -z "$SEED" ]; then
  SEED=$(( (RANDOM << 15 | RANDOM) % 100000 ))
fi
[[ "$SEED" =~ ^-?[0-9]+$ ]] || die "--seed must be an integer, got $SEED"
if [ -z "$PACE" ]; then
  if [ "$FOLLOW" = "1" ]; then PACE=600; else PACE=0; fi
fi
[[ "$PACE" =~ ^[0-9]+$ ]] || die "--pace must be milliseconds, got $PACE"
if [ "$FOLLOW" = "1" ] && [ "$PACE" = "0" ]; then
  echo "note: --pace 0 in follow mode -- the whole game will be written in a few seconds and play at engine speed" >&2
fi

# The bridge validates both profiles too (Bootstrap.resolveAiProfile, before
# FModel.initialize); this copy is only so a typo costs a second, not a build.
PROFILES=()
for f in forge-home/res/ai/*.ai; do
  [ -f "$f" ] && PROFILES+=("$(basename "$f" .ai)")
done
canon_profile() {   # <flag> <value> -> the file's own spelling
  local p
  if [ "${#PROFILES[@]}" -eq 0 ]; then printf '%s' "$2"; return 0; fi
  for p in "${PROFILES[@]}"; do
    [ "${p,,}" = "${2,,}" ] && { printf '%s' "$p"; return 0; }
  done
  die "$1 $2 is not one of: ${PROFILES[*]} (the .ai files in forge-home/res/ai/)"
}
PROFILE="$(canon_profile --profile "$PROFILE")"
AI_PROFILE="$(canon_profile --ai-profile "$AI_PROFILE")"

deck_name() {   # the .dck's own Name=, which is what the page will print
  local n
  n="$(sed -n 's/^Name=//p' "$1" | head -1 | tr -d '\r')"
  [ -n "$n" ] && printf '%s' "$n" || basename "$1" .dck
}
slug() { basename "$1" .dck | tr -c 'A-Za-z0-9._-' '-' | sed 's/-*$//'; }

NAME="$(slug "$DECK")-vs-$(slug "$AI_DECK")-${SEED}"
[ "$SEAT" = "1" ] && NAME="$NAME-seat1"
if [ -n "$NAME_OVERRIDE" ]; then
  # The dev route serves one path segment of these characters (devRoute.ts).
  [[ "$NAME_OVERRIDE" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || die "--name must be letters, digits, . _ - (got $NAME_OVERRIDE)"
  NAME="${NAME_OVERRIDE%.jsonl}"
fi
OUT="var/spectate/$NAME.jsonl"
REC_LOG="var/spectate/$NAME.log"

PAGE="/?replay=spectate/$NAME.jsonl"
[ "$FOLLOW" = "1" ] && PAGE="$PAGE&follow=1"
[ "$VIEW" = "arena" ] && PAGE="$PAGE#arena"
[ "$VIEW" = "story" ] && PAGE="$PAGE#story"
URL="http://127.0.0.1:$WEB_PORT$PAGE"

say "match"
echo "seat 0: $(deck_name "$DECK")  [$DECK]  -- $PROFILE"
echo "seat 1: $(deck_name "$AI_DECK")  [$AI_DECK]  -- $AI_PROFILE$([ "$AI_DECK" = "$DECK" ] && echo '  (a mirror)')"
echo "seed:   $SEED"
echo "seen from: seat $SEAT ($([ "$SEAT" = "0" ] && deck_name "$DECK" || deck_name "$AI_DECK")'s chair -- the other hand stays hidden)"
if [ "$FOLLOW" = "1" ]; then
  echo "follow: yes -- the engine is paced at $PACE ms a frame ($((PACE / 4)) ms for a bare phase change)"
else
  echo "follow: no -- record first$([ "$PACE" != "0" ] && echo ", paced at $PACE ms"), then replay"
fi
echo "file:   $OUT"

# --------------------------------------------------------------------------
# 1 + 2: the gate and the build
# --------------------------------------------------------------------------

say "check-forge"
./tools/check-forge.sh >/dev/null || die "tools/check-forge.sh failed -- run it directly for the detail"
echo "jar OK"

if [ "$BUILD" = "1" ]; then
  say "build"
  ./bridge/build.sh || die "bridge/build.sh failed"
else
  [ -d bridge/out ] || die "--no-build, but bridge/out does not exist -- run ./bridge/build.sh"
fi
if [ "$SERVE" = "1" ]; then
  [ -x web/node_modules/.bin/vite ] || die "web/node_modules is missing -- run: npm --prefix web install"
fi

# --------------------------------------------------------------------------
# 3: the recorder
# --------------------------------------------------------------------------

mkdir -p var/spectate
# A file left by an earlier run of the same seed would be FOLLOWED as if it were
# this one (and then shrink under the page, which reports it as re-recorded).
rm -f "$OUT" "$REC_LOG"

REC_ARGS=(--deck "$DECK" --ai-deck "$AI_DECK" --profile "$PROFILE" --ai-profile "$AI_PROFILE"
          --seed "$SEED" --seat "$SEAT" --match --out "$OUT")
[ "$PACE" != "0" ] && REC_ARGS+=(--pace "$PACE")

REC_PID=""
VITE_PID=""
stop() {
  trap - INT TERM EXIT
  local pid
  for pid in "$VITE_PID" "$REC_PID"; do
    [ -n "$pid" ] || continue
    kill -0 "$pid" 2>/dev/null || continue
    kill "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.3
    done
    kill -9 "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
}
trap stop INT TERM EXIT

# The recording is checked like every other frame log in this repo (hard rule
# 8): a spectated game must pass the same redaction gate a fixture does.
check_recording() {
  local out
  if out="$(node tools/check-redaction.mjs "$OUT" 2>&1)"; then
    echo "$out" | grep -E '^(PASS|FAIL)|hello_ok.match' || true
    return 0
  fi
  echo "$out" | tail -20
  return 1
}
summary() {
  grep -E '^(frames|player turns|winner|game wall time|paced dwell|RECORD OK|RECORD FAILED)' "$REC_LOG" || true
}

record_foreground() {
  say "recording -- mtgtable.RecordMatch (log: $REC_LOG)"
  local rc=0
  ./bridge/run.sh mtgtable.RecordMatch "${REC_ARGS[@]}" "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}" \
      > "$REC_LOG" 2>&1 || rc=$?
  summary
  if [ "$rc" != "0" ] || ! grep -q '^RECORD OK$' "$REC_LOG"; then
    tail -30 "$REC_LOG" >&2
    die "the recorder failed (exit $rc; full log: $REC_LOG)"
  fi
  say "redaction check"
  check_recording || die "$OUT failed tools/check-redaction.mjs"
}

serve() {   # vite DIRECTLY (not npm run dev), so the pid this script holds IS the server
  local args=(--port "$WEB_PORT")
  [ "$OPEN" = "1" ] && args+=(--open "$PAGE")
  env -C "$REPO_ROOT/web" "$REPO_ROOT/web/node_modules/.bin/vite" "${args[@]}" &
  VITE_PID=$!
}

howto() {
  if [ "$VIEW" = "story" ]; then
    cat <<EOF
  the page: $URL
  the story of the game, turn by turn, as the recorder writes it (what comes
  after the frame on screen stays hidden while it is being recorded; S shows it)
  <- / ->   the moment before / the next moment      up / down   the turn
  SPACE     play / pause                              , / .       one frame
  V         the 3D arena at this frame                B           the 2D board
  the replay bar: pause, step, scrub, speed (in follow mode, speed scales the recorder's pace)
EOF
    return
  fi
  cat <<EOF
  the page: $URL
  1-5    camera views (the table, over each shoulder, side-on, low)
  6 / 0  the auto director -- it cuts to what is happening
  O      spectator mode (on by itself: nobody is sitting at this table)
  K      skip every animation on screen      V   the 2D board and back
  the replay bar: pause, step, scrub, speed (in follow mode, speed scales the recorder's pace)
EOF
}

if [ "$FOLLOW" = "0" ]; then
  record_foreground
  if [ "$SERVE" = "0" ]; then
    say "done -- open it on a running dev server (npm --prefix web run dev):"
    echo "  $URL"
    exit 0
  fi
  say "the replay -- $URL"
  howto
  serve
  wait "$VITE_PID" || true
  exit 0
fi

if [ "$SERVE" = "0" ]; then
  say "follow it on your own dev server (npm --prefix web run dev) while it records:"
  echo "  $URL"
  record_foreground
  exit 0
fi

say "recording in the background -- mtgtable.RecordMatch (log: $REC_LOG)"
./bridge/run.sh mtgtable.RecordMatch "${REC_ARGS[@]}" "${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}" \
    > "$REC_LOG" 2>&1 &
REC_PID=$!
echo "pid $REC_PID -- the page waits for its first line (the engine boots in about ten seconds)"

say "following -- $URL"
howto
serve

# The recorder finishing is not the end: the page is still playing the game at
# the recorder's pace, and after that it is a replay you may want to scrub. So
# report the recording, check it, and keep serving until Ctrl-C.
REPORTED=0
while kill -0 "$VITE_PID" 2>/dev/null; do
  if [ "$REPORTED" = "0" ] && ! kill -0 "$REC_PID" 2>/dev/null; then
    REPORTED=1
    rc=0
    wait "$REC_PID" || rc=$?
    REC_PID=""
    say "the recorder finished (exit $rc)"
    summary
    if [ "$rc" = "0" ] && grep -q '^RECORD OK$' "$REC_LOG"; then
      check_recording || printf '\033[31m%s failed tools/check-redaction.mjs\033[0m\n' "$OUT" >&2
    else
      tail -20 "$REC_LOG" >&2
    fi
    echo "still serving the page -- Ctrl-C when you are done watching"
  fi
  sleep 1
done

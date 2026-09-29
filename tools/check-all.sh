#!/usr/bin/env bash
# mtg-table — the one command to run before committing.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Runs everything that can tell you the two hand-written ends have drifted
# apart, and stops at the FIRST failure.  Since D129 it runs them CONCURRENTLY:
# GATE_JOBS (default min(4, nproc/4)) independent steps at a time, each in a
# process of its own with its own ports, game ids, var/ paths and Forge home, in
# the order and under the dependencies set out under "THE PARALLEL GATE" below.
# GATE_JOBS=1 is the serial gate -- the steps below, one after another, in this
# order, printing their log as they run.  The steps:
#
#   1. tools/check-forge.sh       the jar is present and carries the 8 classes
#   2. tools/lint-bridge.sh       the grep bans (hidden info, data loss, 2.0.15-only APIs,
#                                 the three game-thread hops) over bridge/src AND
#                                 tools/**/*.java (D181, D182).  Then 2b:
#                                 tools/lint-bridge-selftest.sh -- every rule the
#                                 lint declares FIRES on a snippet planted in a
#                                 scratch copy, and a rule with no case fails
#                                 (D180; ~1 s)
#   3. bridge/build.sh            javac + the five self-tests (build.sh re-runs 2b and 2)
#   4. mtgtable.Smoke             boots the engine, proves the prefs and the card overlay
#   5. mtgtable.RecordMatch       a FRESH recording into var/, not a committed fixture
#   6. the VALUE-LEVEL drift check  tools/wire-drift.mjs: that fresh recording is
#                                 the same wire as fixtures/games/g1.jsonl -- the
#                                 same non-state frames, event stream, phase walk,
#                                 final board, boards cut at a turn/phase/outcome
#                                 event, and stack on every id-set both caught,
#                                 flush boundaries aside (D113; STRICT_G1=1 for
#                                 the old byte-for-byte diff), after
#                                 tools/wire-drift-selftest.mjs has shown the
#                                 comparison still rejects thirteen drifts; the ids
#                                 inside a `stats` event compared as a set (D121)
#                                 Then 6b (spectating, M47): ./scripts/spectate.sh
#                                 records seed 5 PACED from seat 0 and at engine
#                                 speed from seat 1, and tools/same-game.mjs must
#                                 call them the same game (~20 s)
#   7. mtgtable.MtgTable         a FRESH human-seat game (--transport null): the
#                                 input path, the ask path and exactly one `over`
#   8. mtgtable.MtgTable         the DOCUMENTED console smoke, scripted: the line
#                                 protocol, the quit thread and the exit code
#   9. mtgtable.MtgTable         one --transport auto game at a seed no fixture
#                                 uses: the transport that produced five of them.
#                                 Then 9b, ADVISORY: re-record human-auto-42 at
#                                 seed 42 and compare it to the committed fixture
#                                 as a MULTISET (tools/fixture-multiset-diff.mjs)
#                                 -- content drift without byte-order flakiness.
#                                 Loud, never an exit code (SKIP_DRIFT=1 to skip,
#                                 DRIFT_FATAL=1 to make it fatal).
#                                 Then 9c, THE M5 EXIT CRITERION:
#                                 tools/ten-games.sh -- ten consecutive
#                                 --transport auto games at seeds 1..10,
#                                 alternating decks/pacho-shield.dck and the five
#                                 probe decks, each asserted for `over`, for zero
#                                 UNIMPL (both the summary line and a raw grep of
#                                 the server log and the frame log) and for
#                                 check-redaction.mjs -- plus, since match setup,
#                                 rows 11-14: your deck against the villain deck
#                                 under each of the four AI profiles, with the
#                                 profile read back from the in-game AI and every
#                                 preferences file fingerprinted.  It is a NUMBERED SUB-STEP
#                                 rather than a step of its own so that every
#                                 "step 10d" in the docs stays correct, and it is
#                                 the single most expensive thing in this file:
#                                 ~6-9 minutes.  SKIP_TEN=1 skips it.
#                                 9d (M6) is the SIDEBOARD ask: two games of one
#                                 match on decks/sideboard-probe.dck, which is
#                                 the only way the eleventh ask kind is reachable
#                                 at all (amendments M27/M38), asserted for the
#                                 ask, for a legal non-identity answer, and for
#                                 one frame log per game.
#                                 9e (match setup, amendment M44) is ONE game of
#                                 your deck against the villain deck with
#                                 --ai-profile Reckless: `over`, zero UNIMPL,
#                                 redaction, `hello_ok.match` naming the right
#                                 decks and profile, the profile's values read
#                                 back from the in-game AI, NO preferences file
#                                 touched, and an unknown profile refused before
#                                 the engine boots.  It runs even with
#                                 SKIP_TEN=1, which skips 9c's rows 11-14.
#  10. mtgtable.MtgTable --transport ws   THE M3 STEP: seven fresh servers on a
#                                 loopback socket -- the ws-smoke doorstep test
#                                 (connect -> resync -> concede), the same test's
#                                 --disconnect-mid-ask variant, a full unattended
#                                 game through tools/ws-auto-play.mjs, that
#                                 same client with --refuse-first-ask, which
#                                 drops the socket on the first `ask` FRAME and
#                                 is the only thing in the repo that exercises
#                                 ReplyPool.cancelAll() with a game thread
#                                 actually parked (`cancelling 1 pending ask(s)`,
#                                 asserted), and 10e's --concede-before-input,
#                                 which is the only thing that reaches amendment
#                                 M11's exception path (`over` with no `gameOver`
#                                 state in front of it, asserted through the
#                                 bridge's own `OVER WITHOUT A gameOver STATE`),
#                                 and 10f (M5), ws-auto-play --probe at seed 42,
#                                 which is the only thing anywhere that sends the
#                                 `clickAbility` ACT from a client rather than
#                                 answering an ability_menu by index, and 10g
#                                 (M6), THREE GAMES BACK TO BACK over one socket
#                                 with --games 3 --comfort: three `over`s, three
#                                 `hello_ok`s with distinct gameIds, three frame
#                                 logs, both HostedMatch.continueMatch and
#                                 restartMatch, and M6's five acts each asserted
#                                 for the EFFECT it had on the next `state` --
#                                 plus (M6 fix) the BEHAVIOUR of auto-yield on
#                                 decks/yield-probe.dck, whose key ability
#                                 repeats every upkeep, with
#                                 --require-yield-repeat -- and (D136) the held
#                                 undo window with --require-late-undo: an undo
#                                 sent between the payment and the stack must
#                                 draw `notice {title:"Not now"}`.
#                                 Each asserts exactly one `over`, `over` last,
#                                 and its log through check-redaction.mjs.
#  11. tools/check-redaction.mjs  over every committed fixture (games AND synthetic)
#                                 AND every fresh recording this run produced
#  12. check-redaction-selftest   the checker's own negative controls: twelve
#                                 one-defect probes that must be REJECTED.
#                                 Then 12b: build-workshop-catalog.ts --check --
#                                 web/src/workshop/catalog.json is byte for byte
#                                 what decks/, fixtures/games/ and cues.json make.
#                                 Then 12c: tools/check-engine-crash.sh -- an
#                                 engine crash, built on purpose in a scratch
#                                 Forge home, fails MtgTable AND RecordMatch and
#                                 ends each frame log in an error notice and a
#                                 null `over` (D115).
#                                 Then 12d: tools/narrate-selftest.mjs, the
#                                 frame-log narrator's gate -- every fixture and
#                                 every log this run recorded told as a story
#                                 with hard rule 8 held by ids and by names, six
#                                 negative controls, no re-delivered frame told
#                                 twice and no frame a client holds left untold
#                                 (polish-1), and fixtures/narrate/'s goldens
#                                 (D123; ~1 s)
#                                 Then 12e: node tools/build-deck.ts --check --
#                                 every AI deck under decks/ is byte for byte
#                                 what its decks/specs/*.json builds, every name
#                                 re-resolved against the local card index
#                                 var/cards/cards.sqlite (D116, D183).  It needs
#                                 that index -- built from Scryfall, so NOT in CI
#                                 -- and fails without it; SKIP_DECKS=1 skips it
#                                 and says so
#  13. web: npm run build && npm test   (tsc, node --test, and the vitest render
#                                 smoke test that actually mounts <Board/>), with
#                                 MTGTABLE_WS_LOGS naming the logs step 10
#                                 just produced so web/test/ws-log.test.ts
#                                 replays THOSE and not whatever is in var/
#
# Step 10 is M3's half of the same argument steps 7-9 make for M2: WsTransport is
# the only transport with a network in it, and the two failure modes it adds --
# a client that goes away while a game thread is parked on an ask, and a client
# that comes back and expects the game to still be there -- are invisible to
# every other step.  10d is the first of those two, measured rather than assumed:
# before it, every committed drop test landed on an `input` and printed
# `cancelling 0 pending ask(s)`.  It is also the only step that runs the browser's own client
# code path (tools/ws-auto-play.mjs speaks the same frames web/src/transport/ws.ts
# speaks), so drift between the two hand-written ends shows up here first.
#
# Steps 8 and 9 exist because step 7 runs `--transport null` and nothing else,
# which left ConsoleTransport (788 lines: the whole line protocol, the quit
# thread, the Runtime.halt path) and AutoTransport (607 lines, and the producer
# of five committed fixtures) with no automated coverage at all.
#
# Step 5 is the one that makes this more than a replay of old evidence: the
# committed fixtures were produced by whatever Snap.java looked like the day they
# were recorded, so a checker that only ever reads them cannot see a change made
# an hour ago.  Re-recording and checking that is the actual drift test.
#
# Step 6 is the half of that test step 8 (the checker) structurally cannot do.  A checker
# asserts SHAPES: it would pass a Snap.java that started writing every `power`
# as a number, every phase name lowercased, or one fewer event per flush,
# because all of those are still "a string where a string belongs".  The fresh
# recording and the committed one are the same seed against the same jar, so
# after normalising away the per-run values -- `t`, `startedAt`, `gameId` --
# they are the same game, and any difference in WHAT was said is a change to the
# wire that the committed corpus no longer reflects.  (Measured 2026-09-11: 377
# lines each, diff empty.)  Section 8.7 warned against promising byte-identical
# replay because thread interleaving is not deterministic, and it went flaky
# exactly that way: at a load average of 42-73 the same game came back with one
# more `state` frame (PLAN.md slice-4 follow-up 13(b)), because WHERE a flush
# cuts the event stream is wall-clock.  So since D113 the step compares what
# a re-partition cannot move -- tools/wire-drift.mjs's six questions -- and its
# selftest proves the relaxed comparison still rejects every drift above.
# STRICT_G1=1 restores the byte-for-byte diff.
# One canonicalisation joined the per-run values on 2026-09-28 (decision D121,
# spectating): the ORDER of the ids inside a `stats` event is sorted in both
# files, by wire-drift.mjs's own normalisation and so in both modes.  That order
# is a hash-set iteration over identity-hashed objects inside Forge, and a few
# println lines added to RecordMatch's main thread before FModel.initialize
# reordered it in 11 of 14 runs, against 15 of 15 byte-identical from the build
# before them (same ids, same frames, same game) -- docs/evidence/spectate.md
# section D.  The set is still compared, and the selftest holds both halves.
#
# Step 9 is the one that makes step 8 mean anything.  A checker can only prove
# an emitter did not drift if the checker itself would notice; this one once
# accepted five separate reverted amendments without a word, so its own
# regressions now have a corpus (fixtures/negative/redaction/, one defect per
# file, every one of which must be rejected).
#
# Every JVM step runs under `timeout` (see GAME_TIMEOUT below).  A gate whose
# failure mode is "hangs until someone notices" is not a gate: the whole point
# of the M2 threading work is that a wedged game thread is the defect class that
# costs the most to find, and the GameLog.close() self-deadlock the verification
# pass found had already burned a silent 30 s per run without failing anything.
# A run that hits the cap dies with its own message naming the cap.
#
# THE PARALLEL GATE (D129-D135, the gate-speed lane, 2026-09-28).  Every step
# above is a JOB: a shell function run in a subshell of its own, whose stdout
# and stderr go to var/check-all/<run>/<job>.log.  Most steps are one job; a
# few are split where the halves are independent -- 6b's two recordings and
# their comparison; 9c's fourteen rows (`tools/ten-games.sh --run-row N`) and
# their report (`--report`); step 10's seven servers, 10a..10g; step 11's
# committed fixtures and its fresh recordings; step 13's `npm run build`,
# `vitest run` and `node --test`.  The scheduler starts the next READY job
# (every dependency passed) in a fixed priority order whenever fewer than
# GATE_JOBS are running.  The order constraints are dependencies, not luck:
#
#   - check-forge, lint (with 2b, the lint's self-test, beside it) and build
#     (steps 1-3) run first and alone -- every job
#     depends on them;
#   - step 6 depends on step 5 (it compares RecordMatch's fresh recording);
#     6b's comparison on both of 6b's recordings; 9c's report on its fourteen
#     rows;
#   - 9c's rows and 9e wait for step 4's Smoke, so an engine that cannot boot
#     fails once, at step 4, before fifteen games start.  (They waited first
#     because a first boot on a fresh checkout creates an empty
#     var/forge/preferences/ that their fingerprints read; since every job and
#     every row boots in a Forge home of its own -- job_home, below; D129 as
#     amended at merge -- nothing they fingerprint is shared any more.)
#   - `node --test` (13) replays MTGTABLE_WS_LOGS, i.e. step 10's logs, so it
#     depends on 10a, 10b, 10c, 10d, 10f and 10g (10e is not in the list);
#   - step 11's fresh half and 12d's narrator read EVERY fresh recording, so
#     they depend on every job that records one;
#   - 12b (the catalog), 12c (the crash check, its own scratch Forge home) and
#     12e (the AI decks against their specs) depend on nothing but the build.
#
# Step 10's servers listen on WSPORT+0 .. WSPORT+6 (10a..10g) when GATE_JOBS >
# 1, so all seven can be up at once; GATE_JOBS=1 keeps the single WSPORT.
#
# The console shows one line when a job starts and one when it ends, then a
# TIMING TABLE -- every job's start and end (seconds since the gate started),
# its seconds and its status -- and the 1-minute load average seen at each of
# those events.  var/check-all/<run>/gate.log is every job's log concatenated
# in the serial order, i.e. the log GATE_JOBS=1 prints.  A failure stops new
# jobs, TERMs every running job's process tree (only processes this gate
# started), prints the failed job's log tail, the table so far and a
# `check-all FAILED at step N` line -- always, even for a job that died
# without a message -- and exits 1.  GATE_JOBS=1 streams each job's log to the
# console as it runs: the pre-D129 gate's lines in its order, but not its bytes
# -- each job runs under `2>&1 | tee`, so `die`'s stderr arrives on stdout
# (PLAN.md's gate-speed follow-up 5), 10g adds a "was played" line per game
# (D134), and the timing table follows `check-all OK`.  The timeout is still
# per JVM (GAME_TIMEOUT), and nothing is ever retried: a step that fails under
# concurrent load and never serially is a finding (D135), not a flake to paper
# over.
#
# Usage:  ./tools/check-all.sh            # ~5 minutes at GATE_JOBS=4 (D129); ~15 serially
#         GATE_JOBS=1 ./tools/check-all.sh        # the serial gate, one step at a time
#         GATE_JOBS=8 ./tools/check-all.sh        # eight at a time (needs ~16 GB free)
#         WSPORT=8750 ./tools/check-all.sh        # step 10's ports: 8750..8756 in parallel
#         SKIP_WEB=1 ./tools/check-all.sh # engine side only (no node_modules yet)
#         GAME_TIMEOUT=600 ./tools/check-all.sh   # a slower machine
#         SKIP_DRIFT=1 ./tools/check-all.sh       # no 9b re-recording (~30 s)
#         DRIFT_FATAL=1 ./tools/check-all.sh      # 9b's advisory becomes a failure
#         SKIP_TEN=1 ./tools/check-all.sh         # no 9c ten-games (~6 minutes serially); 9e still runs
#         SKIP_DECKS=1 ./tools/check-all.sh       # no 12e (a checkout with no var/cards/cards.sqlite)
#         VILLAIN_DECK=decks/x.dck ./tools/check-all.sh   # 9c rows 11-14 and 9e play this deck
#         STRICT_G1=1 ./tools/check-all.sh        # step 6 byte for byte (fails under load: D113)
#         GATE_KEEP_RUNS=50 ./tools/check-all.sh  # keep 50 runs under var/check-all/ (default 20)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# bridge/run.sh honours $MTG_TABLE_CONFIG (D115: step 12c's crash check points
# its own runs at a scratch config under var/ and exports it itself).  A stray
# export in the calling shell would silently point every other JVM step -- its
# forgeHome, so Forge's userDir, and its deck -- at another config, so the gate
# never inherits one: every job gets its OWN instead (job_home, below).
unset MTG_TABLE_CONFIG
# REPO_ROOT, CONFIG_JSON, FORGE_JAR (config.json's forgeJar, or $FORGE_JAR: hard
# rule 9) and forge_home_make, which builds each job's Forge home.
# shellcheck source=tools/config.sh
. tools/config.sh

# Seconds any single JVM step may take.  Measured 2026-09-11: the slowest game
# in the gate is ~45 s, so 300 is ~6x headroom and still fails a wedge fast
# enough to be useful.  `bridge/run.sh` ends in `exec java`, so TERM reaches the
# JVM itself rather than a wrapper shell; --kill-after adds the KILL that
# follows if it ignores TERM.  Per JVM, whatever GATE_JOBS is (D129).
GAME_TIMEOUT="${GAME_TIMEOUT:-300}"
jvm() { timeout --kill-after=15s "${GAME_TIMEOUT}s" "$@"; }

# 124 is `timeout`'s own "the cap fired"; 137 is the KILL that --kill-after sent
# when the JVM ignored the TERM.
capped() { case "$1" in 124 | 137) return 0 ;; *) return 1 ;; esac; }

# ---------------------------------------------------------------------------
# The knobs of the parallel gate (D129).
# ---------------------------------------------------------------------------
# GATE_JOBS: how many jobs run at once.  min(4, nproc/4), at least 1: four on
# this 16-thread box, where every JVM is an -Xmx4096m process and four of them
# plus the web suites leave the machine usable; GATE_JOBS=1 is the serial gate.
NPROC="$(nproc 2>/dev/null || echo 4)"
GATE_JOBS_DEFAULT=$(( NPROC / 4 ))
[ "$GATE_JOBS_DEFAULT" -ge 1 ] || GATE_JOBS_DEFAULT=1
[ "$GATE_JOBS_DEFAULT" -le 4 ] || GATE_JOBS_DEFAULT=4
GATE_JOBS="${GATE_JOBS:-$GATE_JOBS_DEFAULT}"
case "$GATE_JOBS" in
  '' | *[!0-9]* | 0) echo "check-all: GATE_JOBS must be a positive integer, got '$GATE_JOBS'" >&2; exit 2 ;;
esac

# Port 8643, not config.json's 8642: a developer with `scripts/play.sh` running
# should be able to run the gate without the two fighting over a port.  With
# GATE_JOBS > 1, 10a..10g listen on WSPORT+0 .. WSPORT+6 (D131).
WSPORT="${WSPORT:-8643}"
case "$WSPORT" in '' | *[!0-9]*) echo "check-all: WSPORT must be a port number, got '$WSPORT'" >&2; exit 2 ;; esac

# One directory per run: every job's log, the timing table, gate.log (D130).
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
RUN_DIR="var/check-all/$RUN_ID"
mkdir -p "$RUN_DIR"

# ...and only the last GATE_KEEP_RUNS of them (default 20, this one included)
# are kept: a run is ~4 MB since every job keeps its Forge home in it (gate
# speed's follow-up 4, closed by polish-1).  Only directories named like a
# RUN_ID (YYYYmmdd-HHMMSS-pid, so the name order IS the start order) are ever
# removed -- anything else under var/check-all/ is left alone -- and never this
# run's own.  One gate per checkout (gate speed's follow-up 7) is what makes
# "the oldest" safe to delete.
GATE_KEEP_RUNS="${GATE_KEEP_RUNS:-20}"
case "$GATE_KEEP_RUNS" in
  '' | *[!0-9]* | 0) echo "check-all: GATE_KEEP_RUNS must be a positive integer, got '$GATE_KEEP_RUNS'" >&2; exit 2 ;;
esac
prune_runs() {
  local runs=() i n pruned=0
  mapfile -t runs < <(find var/check-all -mindepth 1 -maxdepth 1 -type d -regextype posix-extended \
    -regex '.*/[0-9]{8}-[0-9]{6}-[0-9]+' -printf '%f\n' | LC_ALL=C sort)
  # The pattern must see THIS run, or a change to RUN_ID's format would stop the
  # pruning without a word; it fails the gate instead.
  local r seen=0
  for r in "${runs[@]}"; do [ "$r" = "$RUN_ID" ] && seen=1; done
  [ "$seen" = "1" ] || {
    echo "check-all: this run's id $RUN_ID does not match prune_runs' pattern -- change the two together" >&2
    exit 2
  }
  n=$(( ${#runs[@]} - GATE_KEEP_RUNS ))
  for (( i = 0; i < n; i++ )); do
    [ "var/check-all/${runs[$i]}" = "$RUN_DIR" ] && continue
    rm -rf -- "var/check-all/${runs[$i]}"
    pruned=$(( pruned + 1 ))
  done
  echo "check-all: run $RUN_ID; keeping the last $GATE_KEEP_RUNS runs under var/check-all/ (${#runs[@]} there, $pruned pruned)"
}
prune_runs

# `die` names the step the running JOB belongs to; each job's subshell sets STEP
# (the parent number for a lettered sub-step, exactly as the serial gate did).
STEP=""
die() { echo "check-all FAILED at step $STEP: $1" >&2; exit 1; }
hdr() { printf '\n=== %s. %s ===\n' "$1" "$2"; }
# The last line of a frame log is `over` (section 8.4).  A `$(tail -n 1 ...)`
# and a pattern, never `tail | grep`: no pipe for pipefail to judge (D132).
last_is_over() { [[ "$(tail -n 1 "$1")" == *'"type":"over"'* ]]; }
# Step 10's port for sub-step k (0 = 10a .. 6 = 10g).
ws_port() { if [ "$GATE_JOBS" -gt 1 ]; then echo $(( WSPORT + $1 )); else echo "$WSPORT"; fi; }

# Every job boots Forge in a HOME OF ITS OWN (D129, amended at merge): before
# its function runs, job_home builds var/check-all/<run>/<job>/ with
# tools/config.sh's forge_home_make -- a forge-home/ whose res/ is the jar's, a
# userDir and a cacheDir of the job's own, D14's overlay -- and exports
# MTG_TABLE_CONFIG at its config.json, which every ./bridge/run.sh the job
# starts reads.  So no two jobs' JVMs share a userDir: not Forge's achievements
# files, which a JVM that exits mid-save leaves EMPTY for the next reader
# (evidence section 3.2), not its preferences, not its profile directories.
# tools/ten-games.sh goes one further and gives each ROW its own; step 12c's
# crash check builds its own scratch home, as it always did.  JOB_HOME is the
# directory; job_prefs_check, after the function, fails the job if any JVM of it
# SAVED a Forge preferences file there -- every home starts with none, so this
# covers every JVM the gate runs, where the old fingerprint of one shared
# var/forge/preferences/ covered only what ran during 9c's rows and 9e.
job_home() {
  JOB_HOME="$REPO_ROOT/$RUN_DIR/$1"
  MTG_TABLE_CONFIG="$(forge_home_make "$JOB_HOME")" \
    || die "could not build job $1's Forge home under $JOB_HOME"
  export JOB_HOME MTG_TABLE_CONFIG
}
job_prefs_check() {
  local f
  f="$(find "$JOB_HOME/forge/preferences" -type f -print -quit 2>/dev/null || true)"
  [ -z "$f" ] || die "a JVM of this job SAVED a Forge preferences file, $f -- a run must never save prefs (CLAUDE.md, hard rule 11; the empty-profileOverride branch of GamePlayerUtil.createAiPlayer is one way)"
}

# ---------------------------------------------------------------------------
# Every path more than one step reads, named once (the serial gate set these as
# it went; a job cannot see another job's variables).
# ---------------------------------------------------------------------------
FRESH="var/check-all-record.jsonl"                          # 5, read by 6, 11, 12d
SP_PACED="var/spectate/check-all-spectate-paced.jsonl"      # 6b
SP_SEAT1="var/spectate/check-all-spectate-seat1.jsonl"      # 6b
M2FRAMES="var/games/check-all-m2/frames.jsonl"              # 7
CONLOG="var/games/check-all-console/frames.jsonl"           # 8
AUTOLOG="var/games/check-all-auto/frames.jsonl"             # 9
MS_ID="check-all-match-reckless"                            # 9e
MS_LOG="var/games/$MS_ID/frames.jsonl"
# shellcheck source=tools/villain-deck.sh
. tools/villain-deck.sh                                     # VILLAIN, VILLAIN_NOTE: 6b, 9e
HAVE_AUTOPLAY=0
[ -f tools/ws-auto-play.mjs ] && HAVE_AUTOPLAY=1
# Step 13 replays exactly these and nothing else (web/test/ws-log.test.ts): the
# client's own --log plus the bridge's copies from 10a, 10b, 10c, 10d, 10f and
# 10g, in the order the serial gate used to accumulate them.
if [ "$HAVE_AUTOPLAY" = "1" ]; then
  WS_LOGS="var/ws-auto-13.jsonl,var/games/check-all-ws-auto/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-smoke/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-drop/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-refuse/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/ws-auto-probe-42.jsonl,var/games/check-all-ws-probe/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-3g/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-3g-g2/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-3g-g3/frames.jsonl"
else
  WS_LOGS="var/games/check-all-ws-smoke/frames.jsonl,var/games/check-all-ws-drop/frames.jsonl"
fi

# ===========================================================================
# THE STEPS.  One function per job, in the serial order.  Each runs in a
# subshell of its own with `set -e` and its STEP set, stdout and stderr to its
# log; nothing here reads a variable another job set.
# ===========================================================================

s01_forge() {
  hdr 1 "check-forge.sh -- the jar and the eight classes"
  ./tools/check-forge.sh || die "check-forge.sh"
}

s02_lint() {
  hdr 2 "lint-bridge.sh -- the grep bans"
  ./tools/lint-bridge.sh || die "lint-bridge.sh"
}

# 2b. D180: the lint's own negative controls.  Every rule tools/lint-bridge.sh
#     declares (read from its --list-rules) must fire on a snippet planted in a
#     scratch copy of bridge/src and tools/**/*.java under var/lint-selftest/ --
#     that rule and no other -- the real tree must pass, and a rule with no case
#     fails.  Two rules (GameView.getDeck / .getGame) were dead from the first
#     commit because nothing asked.  About a second; bridge/build.sh runs it too.
s02b_lintself() {
  printf '\n=== 2b. lint-bridge-selftest.sh -- every lint rule fires (D180) ===\n'
  ./tools/lint-bridge-selftest.sh || die "lint-bridge-selftest.sh (a lint rule did not fire on the code it exists for, or has no case)"
}

s03_build() {
  hdr 3 "bridge/build.sh -- javac + Json self-test"
  ./bridge/build.sh || die "bridge/build.sh"
}

s04_smoke() {
  hdr 4 "Smoke -- boot the engine, prove the prefs (D13) and the card overlay (D14)"
  mkdir -p var
  local rc=0
  jvm ./bridge/run.sh mtgtable.Smoke > var/check-all-smoke.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -40 var/check-all-smoke.log >&2
    capped "$rc" && die "mtgtable.Smoke did not finish within ${GAME_TIMEOUT}s (full log: var/check-all-smoke.log)"
    die "mtgtable.Smoke (full log: var/check-all-smoke.log)"
  fi
  grep -E '^(pref |A\.I\.M\. Scientists|deck conformance|cards in DB|SMOKE OK)' var/check-all-smoke.log || true
  grep -q '^SMOKE OK$' var/check-all-smoke.log || die "Smoke did not print SMOKE OK"
}

s05_record() {
  hdr 5 "RecordMatch -- a FRESH recording (seed 42) into var/, not a committed fixture"
  rm -f "$FRESH"
  local rc=0
  jvm ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
      --out "$FRESH" > var/check-all-record.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -40 var/check-all-record.log >&2
    capped "$rc" && die "mtgtable.RecordMatch did not finish within ${GAME_TIMEOUT}s (raise GAME_TIMEOUT, or the recorder is wedged)"
    die "mtgtable.RecordMatch (full log: var/check-all-record.log)"
  fi
  grep -E '^(frames|snapshot errors|events dropped|unzoned cards|UNIMPL members)' var/check-all-record.log || true
  grep -q '^RECORD OK$' var/check-all-record.log || die "RecordMatch did not print RECORD OK"
}

s06_drift() {
  hdr 6 "value-level drift -- the fresh recording against fixtures/games/g1.jsonl (tools/wire-drift.mjs)"
  # Why a comparison and not just the shape checker (step 8): a checker asserts the
  # key set and the runtime TYPE of every key, so it would happily pass a Snap.java
  # that started emitting phase names lowercased, `power` as a number, one fewer
  # event per flush, or a stack ordered top-first.  Same deck, same seed, same
  # jar -> the same game, once the per-run values are normalised away.
  #
  # D113 (PLAN.md slice-4 follow-up 13(b)).  This was `diff | head -20` over the
  # two normalised files, byte for byte, and it failed twice at a load average of
  # 42-73 on one extra `state` frame of an otherwise identical game -- and under
  # `set -o pipefail` the `head` gave it exit 141 and no message at all.  Both are
  # fixed here: tools/wire-drift.mjs prints its own verdict and exits 0 or 1, and by
  # default it asks only what a busy machine cannot move, because WHERE a flush cuts
  # the event stream is wall-clock: the non-state frames, the event stream, the
  # phase walk, the final board, every board cut AT a turn/phase/outcome event (the
  # players, every public zone, `priority` and mid-game `combat`, 347 times in g1)
  # and the stack -- `stack` and `stackCards`, order included -- for every set of
  # stack ids both recordings caught (a phase boundary never has a stack, so that
  # question is the stack serialiser's only check; its reach is in the tool's
  # header).  Measured: 9b's multiset comparison fails those loaded runs too, so it
  # was not the answer.  The selftest runs first -- the stack reversed, a stack key
  # renamed, `priority` nulled and a combat key renamed mid-game among its drifts --
  # so a relaxed comparison that stopped rejecting drift fails the gate here and not
  # silently.  STRICT_G1=1 is the old step: byte for byte, flush boundaries and all.
  # Both modes sort the ids inside a `stats` event first (D121, spectating: their
  # order follows HotSpot identity hashes, not the game); the SET is still compared,
  # and the selftest has a reorder both must accept and a dropped id both reject.
  # (D132: no `| head` and no `| tail` anywhere in this file any more.)
  node tools/wire-drift-selftest.mjs > var/check-all-wire-drift-selftest.log 2>&1 || {
    cat var/check-all-wire-drift-selftest.log >&2
    die "tools/wire-drift-selftest.mjs: the step-6 comparison no longer gives the verdicts it must (log: var/check-all-wire-drift-selftest.log)"
  }
  tail -1 var/check-all-wire-drift-selftest.log
  local WIRE_DRIFT_MODE=""
  [ "${STRICT_G1:-0}" = "1" ] && WIRE_DRIFT_MODE="--strict"
  # shellcheck disable=SC2086
  if ! node tools/wire-drift.mjs $WIRE_DRIFT_MODE fixtures/games/g1.jsonl "$FRESH" > var/check-all-wire-drift.log 2>&1; then
    cat var/check-all-wire-drift.log >&2
    if [ -n "$WIRE_DRIFT_MODE" ]; then
      die "the fresh seed-42 recording is not byte-identical to fixtures/games/g1.jsonl under STRICT_G1=1 -- \
if the default comparison passes, only the flush boundaries moved, which is load (D113); if it fails too, \
Snap.java changed the wire: re-record fixtures/games/*.jsonl"
    fi
    die "Snap.java changed the wire: the fresh seed-42 recording is not the same game as fixtures/games/g1.jsonl \
(the DIFFER line above says which of the six questions failed) -- re-record fixtures/games/*.jsonl"
  fi
  cat var/check-all-wire-drift.log
}

# 6b. SPECTATING (protocol amendment M47, decisions D118-D122): an AI-vs-AI
#     game recorded the way ./scripts/spectate.sh records one, through the
#     script itself (--no-serve: no vite, no browser), twice:
#
#       - seat 0, PACED (--pace 25, so the dwells run but cost ~4 s), with
#         each seat's own profile: the header must say `paceMs`, the handshake
#         must carry `match` with the viewer's own `yourProfile`, the recorder
#         must report its dwells, and the file must pass check-redaction (the
#         script refuses a recording that does not);
#       - the SAME SEED from seat 1, at engine speed.
#
#     Then tools/same-game.mjs must call the two the SAME GAME -- which is the
#     two claims spectating makes in one comparison: pacing does not change the
#     game, and the other chair sees the same game (every public fact, every
#     event, every phase-boundary state; the hands set aside) -- and must call a
#     copy of the second with one life total changed NOT the same game, so the
#     comparison can fail. ~20 s. Its own names, so it never overwrites a
#     recording of yours in var/spectate/.  Three jobs (D129): the two
#     recordings are independent processes, and the comparison needs both.
s06b_paced() {
  printf '\n=== 6b. spectating: a paced AI-vs-AI recording, and the same seed from the other chair (M47) ===\n'
  echo "  $VILLAIN_NOTE"
  local rc=0
  jvm ./scripts/spectate.sh --no-serve --no-build --name check-all-spectate-paced \
      --deck decks/pacho-shield.dck --ai-deck "$VILLAIN" --profile Default --ai-profile Reckless \
      --seed 5 --pace 25 > var/check-all-spectate-paced.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -30 var/check-all-spectate-paced.log >&2
    capped "$rc" && die "the paced spectate recording did not finish within ${GAME_TIMEOUT}s"
    die "./scripts/spectate.sh (paced, seat 0) exited $rc (full log: var/check-all-spectate-paced.log)"
  fi
}

s06b_seat1() {
  local rc=0
  jvm ./scripts/spectate.sh --no-serve --no-build --no-follow --name check-all-spectate-seat1 \
      --deck decks/pacho-shield.dck --ai-deck "$VILLAIN" --profile Default --ai-profile Reckless \
      --seed 5 --seat 1 > var/check-all-spectate-seat1.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -30 var/check-all-spectate-seat1.log >&2
    capped "$rc" && die "the seat-1 spectate recording did not finish within ${GAME_TIMEOUT}s"
    die "./scripts/spectate.sh (seat 1) exited $rc (full log: var/check-all-spectate-seat1.log)"
  fi
}

s06b_check() {
  grep -hE '^(frames|winner|game wall time|paced dwell|PASS)' var/check-all-spectate-paced.log var/check-all-spectate-seat1.log || true
  grep -qE '^paced dwell    = [1-9][0-9]* dwell' var/spectate/check-all-spectate-paced.log \
    || die "the paced recording reported no dwells (var/spectate/check-all-spectate-paced.log)"
  local f
  for f in "$SP_PACED" "$SP_SEAT1"; do
    [ "$(grep -c '"type":"over"' "$f" || true)" = "1" ] || die "$f does not have exactly one \`over\`"
    last_is_over "$f" || die "the last frame of $f is not \`over\`"
  done
  node -e '
    const fs = require("node:fs");
    const [paced, seat1, villain] = process.argv.slice(1);
    const lines = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(JSON.parse);
    const nameOf = (p) => (fs.readFileSync(p, "utf8").match(/^Name=(.*)$/m) ?? [])[1]?.trim() ?? p;
    const [hp, ...fp] = lines(paced);
    const [h1, ...f1] = lines(seat1);
    const mp = fp.find((f) => f.type === "hello_ok").body.match;
    const m1 = f1.find((f) => f.type === "hello_ok").body.match;
    const fail = (m) => { console.error(m); process.exit(1); };
    if (hp.paceMs !== 25) fail(`the paced header says paceMs=${JSON.stringify(hp.paceMs)}, expected 25`);
    if (h1.paceMs !== undefined) fail("the unpaced header carries paceMs");
    if (hp.seat !== 0 || h1.seat !== 1) fail(`seats ${hp.seat} / ${h1.seat}, expected 0 / 1`);
    const pacho = nameOf("decks/pacho-shield.dck"), villainName = nameOf(villain);
    const want0 = { yourDeck: pacho, aiDeck: villainName, aiProfile: "Reckless", yourProfile: "Default" };
    const want1 = { yourDeck: villainName, aiDeck: pacho, aiProfile: "Default", yourProfile: "Reckless" };
    const got = (m) => ({ yourDeck: m?.yourDeck?.name, aiDeck: m?.aiDeck?.name, aiProfile: m?.aiProfile, yourProfile: m?.yourProfile });
    if (JSON.stringify(got(mp)) !== JSON.stringify(want0)) fail(`seat 0 match ${JSON.stringify(mp)}`);
    if (JSON.stringify(got(m1)) !== JSON.stringify(want1)) fail(`seat 1 match ${JSON.stringify(m1)}`);
    console.log(`OK: both handshakes name the decks and each seat its own profile; paceMs=${hp.paceMs}`);
  ' "$SP_PACED" "$SP_SEAT1" "$VILLAIN" || die "the spectate recordings do not describe the match that was played"
  local sg=var/check-all-same-game.log
  if ! node tools/same-game.mjs "$SP_PACED" "$SP_SEAT1" > "$sg" 2>&1; then
    cat "$sg"
    die "a paced seat-0 recording and an unpaced seat-1 recording of seed 5 are not the same game"
  fi
  cat "$sg"
  # polish-1 (spectating's skeptic): the tool says, per log, what it did NOT
  # compare -- and, for two logs of one seat, that the projection is the same
  # one (its header once claimed a same-seat pair had nothing set aside).
  [ "$(grep -c '^  set aside, never compared -- ' "$sg")" = "2" ] \
    || die "same-game.mjs did not say, for each log, what it set aside (log: $sg)"
  node tools/same-game.mjs "$SP_PACED" "$SP_PACED" > var/check-all-same-game-self.log 2>&1 \
    || { cat var/check-all-same-game-self.log; die "same-game.mjs called a recording a different game from itself"; }
  grep -q "^  both logs are seat 0's: the values above were set aside although both logs show them" \
      var/check-all-same-game-self.log \
    || { cat var/check-all-same-game-self.log; die "same-game.mjs compared two logs of one seat without saying what it set aside"; }
  echo "OK: same-game.mjs names what it set aside for each log, and says so for a same-seat pair"
  # The negative control: one life total changed in the seat-1 copy.
  node -e '
    const fs = require("node:fs");
    const [src, dst] = process.argv.slice(1);
    const lines = fs.readFileSync(src, "utf8").split("\n").filter(Boolean);
    const i = lines.findLastIndex((l) => l.includes("\"type\":\"state\""));
    const f = JSON.parse(lines[i]);
    f.body.players[0].life += 1;
    lines[i] = JSON.stringify(f);
    fs.writeFileSync(dst, lines.join("\n") + "\n");
  ' "$SP_SEAT1" var/check-all-spectate-mutant.jsonl
  if node tools/same-game.mjs "$SP_PACED" var/check-all-spectate-mutant.jsonl --quiet > /dev/null; then
    die "tools/same-game.mjs called a recording with a changed life total the same game -- the comparison cannot fail"
  fi
  echo "OK: same-game.mjs rejects the one-life-point mutant (its negative control)"
}

s07_null() {
  hdr 7 "MtgTable --transport null -- the M2 seam, end to end, with every ask answered null"
  # The gate's only coverage of WireGuiGame. RecordMatch above has no seat, so it
  # exercises neither the input path, nor the ask path, nor `over`. This does all
  # three in ~30 s: every ask resolves to protocol section 5.4's documented
  # default, which is what proves no member throws and no thread wedges -- and the
  # log it writes is then held to the same redaction standard as a fixture.
  #
  # `over` is asserted explicitly. It used to be emitted only from finishGame(),
  # which Forge does not reliably call after a concede, and the failure mode was a
  # session that never terminates plus a green exit code (protocol section 7).
  local M2LOG="var/check-all-m2"
  rm -rf "$M2LOG" var/games/check-all-m2
  local rc=0
  jvm ./bridge/run.sh mtgtable.MtgTable --transport null --seed 42 --game-id check-all-m2 \
      > var/check-all-m2.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -40 var/check-all-m2.log >&2
    capped "$rc" && die "the --transport null session did not finish within ${GAME_TIMEOUT}s -- a wedged game thread is exactly what this step exists to catch (full log: var/check-all-m2.log)"
    die "mtgtable.MtgTable --transport null (full log: var/check-all-m2.log)"
  fi
  grep -E '^(finished|ask kinds|UNIMPL members|emit errors|notices swept)' var/check-all-m2.log || true
  grep -q '^MTGTABLE OK$' var/check-all-m2.log || die "MtgTable did not print MTGTABLE OK"
  [ -s "$M2FRAMES" ] || die "MtgTable wrote no frame log at $M2FRAMES"
  local overs
  overs="$(grep -c '"type":"over"' "$M2FRAMES" || true)"
  [ "$overs" = "1" ] || die "the M2 session wrote $overs \`over\` frames; section 7 and section 8.4 say exactly one"
  last_is_over "$M2FRAMES" || \
    die "the M2 session's last frame is not \`over\` -- the terminal frame of a session (section 8.4)"
}

s08_console() {
  hdr 8 "MtgTable --transport console -- the documented smoke, scripted"
  # CLAUDE.md documents this exact command, and until now nothing ran it: the
  # console transport is the biggest untested file in the bridge, and its quit
  # path can halt() the JVM with a non-zero code of its own (QUIT_NO_OVER_EXIT).
  # Four Enters answer the pre-game prompts (the empty line is "OK when OK is
  # enabled, Cancel otherwise"); `q` concedes and quits. It ends BEFORE a card is
  # dealt, which is why check-redaction.mjs's two "this file proves nothing"
  # assertions are warnings on a session whose every `state` is turn 0 -- the
  # documented command used to produce an artifact this gate rejected.  The five
  # lines arrive as a here-string, not `printf | jvm`: no pipe for pipefail to
  # judge (D132) -- the same bytes, "\n\n\n\nq\n".
  rm -rf var/games/check-all-console
  local rc=0
  jvm ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
      --game-id check-all-console > var/check-all-console.log 2>&1 <<< $'\n\n\n\nq' || rc=$?
  if [ "$rc" != "0" ]; then
    tail -40 var/check-all-console.log >&2
    capped "$rc" && die "the console session did not finish within ${GAME_TIMEOUT}s -- the reader thread is parked on a prompt the script did not answer (full log: var/check-all-console.log)"
    die "mtgtable.MtgTable --transport console exited $rc (2 is the quit path's own \
'the game never reported \`over\`' code; full log: var/check-all-console.log)"
  fi
  grep -q '^MTGTABLE OK$' var/check-all-console.log || die "the console session did not print MTGTABLE OK"
  [ -s "$CONLOG" ] || die "the console session wrote no frame log at $CONLOG"
  local overs
  overs="$(grep -c '"type":"over"' "$CONLOG" || true)"
  [ "$overs" = "1" ] || die "the console session wrote $overs \`over\` frames; section 7 says exactly one"
  last_is_over "$CONLOG" || \
    die "the console session's last frame is not \`over\` (section 8.4)"
}

s09_auto() {
  hdr 9 "MtgTable --transport auto --seed 11 -- the policy transport, on a seed no fixture uses"
  # AutoTransport produced five of the committed fixtures and was itself never run
  # by the gate. Seed 11 is deliberately not one of the recorded seeds (42/7/2026/
  # 99), so this is a game nobody has seen: a new UNIMPL member or an emit error
  # here is a real degradation, not a replay of an old one.
  rm -rf var/games/check-all-auto
  local rc=0
  jvm ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 11 --game-id check-all-auto \
      > var/check-all-auto.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    tail -40 var/check-all-auto.log >&2
    capped "$rc" && die "the --transport auto session did not finish within ${GAME_TIMEOUT}s (AutoTransport's own STUCK_MS watchdog is 60 s, so reaching this cap means the watchdog thread is wedged too; full log: var/check-all-auto.log)"
    die "mtgtable.MtgTable --transport auto (full log: var/check-all-auto.log)"
  fi
  grep -E '^(finished|winner|player turns|ask kinds|UNIMPL members|emit errors)' var/check-all-auto.log || true
  grep -q '^MTGTABLE OK$' var/check-all-auto.log || die "the auto session did not print MTGTABLE OK"
  grep -q '^finished       = true' var/check-all-auto.log || die "the auto session did not finish (the game thread is wedged)"
  grep -q '^UNIMPL members = none$' var/check-all-auto.log || \
    die "the auto session hit an unimplemented IGuiGame member: $(grep '^UNIMPL members' var/check-all-auto.log)"
  grep -q '^emit errors    = 0$' var/check-all-auto.log || \
    die "the auto session logged an emit error: $(grep '^emit errors' var/check-all-auto.log)"
  local overs
  overs="$(grep -c '"type":"over"' "$AUTOLOG" || true)"
  [ "$overs" = "1" ] || die "the auto session wrote $overs \`over\` frames; section 7 says exactly one"
  last_is_over "$AUTOLOG" || \
    die "the auto session's last frame is not \`over\` (section 8.4)"
}
# 9b. ADVISORY, and deliberately non-fatal: HUMAN-SEAT fixture drift, compared as
#     a multiset (M3 follow-up 7).
#
#     Step 6 compares a fresh AI-vs-AI recording against fixtures/games/g1.jsonl
#     (byte for byte until D113; now on what a re-partition cannot move), and
#     nothing in a RecordMatch run competes for the log.  The five human-seat fixtures are different: they are recorded
#     through a seat, so a `state` written by the game thread and two `input`s
#     written by the EDT can be assigned their `seq` in either order.  Measured
#     over three re-recordings of human-auto-42 (docs/evidence/m3-ws.md 13.5): 0,
#     then 8, then 8 differing lines -- the same three frames, reordered.  A
#     byte-level step here would be flaky, and a flaky gate step is worse than no
#     gate step because it teaches everyone to re-run until it is green.
#
#     tools/fixture-multiset-diff.mjs asks the question that IS stable: is any
#     frame's content different, or has one appeared or vanished?  It says
#     nothing about order.  It is advisory because the remaining instability is
#     real and is not drift either -- human-trample-7 re-records with two extra
#     `input` frames, which is Forge's awaitNextInput() re-pushing the same
#     prompt every 250 ms while it thinks, i.e. wall-clock.  So a difference here
#     is a REASON TO LOOK, printed loudly, and never an exit code.
#
#     DRIFT_FATAL=1 makes it one for someone who wants that; SKIP_DRIFT=1 skips
#     the 30 s re-recording entirely.
#
#     The committed fixture predates amendment M44, so its `hello_ok` has no
#     `match` block and every fresh recording's does: the diff tool drops a key
#     in its AMENDED_KEYS table from the fresh side when the committed side has
#     none (and says so on a line of its own), so this step goes on reporting
#     real emitter drift instead of firing on every run.  The fixtures were NOT
#     re-recorded for M44: frame indices into them are cited across the docs and
#     tests (`human-auto-42`@717, say), and a re-recorded human-seat log comes
#     back in a different frame order even when its content is identical.
DRIFT_FIXTURE="fixtures/games/human-auto-42.jsonl"
DRIFT_ID="check-all-drift-42"
DRIFT_LOG="var/games/$DRIFT_ID/frames.jsonl"
drift_advisory() {   # $1 what happened
  printf '\n'
  echo "  *** ADVISORY (not a failure): $1"
  echo "  *** Reproduce:  ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42 --game-id $DRIFT_ID"
  echo "  ***             node tools/fixture-multiset-diff.mjs $DRIFT_FIXTURE $DRIFT_LOG"
  echo "  *** If the wire really changed, re-record the five human fixtures"
  echo "  *** (var/verify/m3fix-rerecord.sh) and say so in the commit message."
  printf '\n'
  [ "${DRIFT_FATAL:-0}" = "1" ] && die "fixture drift, and DRIFT_FATAL=1"
  return 0
}
s09b_drift() {
  if [ "${SKIP_DRIFT:-0}" = "1" ]; then
    echo "(9b fixture-drift advisory skipped: SKIP_DRIFT=1)"
  elif [ ! -f "$DRIFT_FIXTURE" ]; then
    drift_advisory "$DRIFT_FIXTURE is not there to compare against"
  else
    rm -rf "var/games/$DRIFT_ID"
    local rc=0
    jvm ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42 --game-id "$DRIFT_ID" \
        > var/check-all-drift.log 2>&1 || rc=$?
    if [ "$rc" != "0" ] || [ ! -s "$DRIFT_LOG" ]; then
      tail -20 var/check-all-drift.log >&2
      drift_advisory "the seed-42 re-recording exited $rc (full log: var/check-all-drift.log). \
Step 9 above already proves a fresh --transport auto game finishes, at seed 11, so this is not \
the gate's only chance to catch that -- but a seed-specific crash is worth a look."
    elif node tools/fixture-multiset-diff.mjs "$DRIFT_FIXTURE" "$DRIFT_LOG" --limit 6; then
      echo "OK: $DRIFT_FIXTURE re-records to the same multiset of frames (order ignored)"
    elif node tools/fixture-multiset-diff.mjs "$DRIFT_FIXTURE" "$DRIFT_LOG" --only-dir s2c --quiet \
        > /dev/null 2>&1; then
      # The emitter's half is identical and only the seat's own frames moved.
      # That is AutoTransport's policy meeting Forge's awaitNextInput(), which
      # re-pushes the same prompt every 250 ms while it thinks: how many acts land
      # on one prompt is wall-clock.  Measured over seven re-recordings of
      # human-auto-42: five identical, two with a single duplicate
      # `act {"action":"buttonCancel"}` fewer -- and an s2c half identical in all
      # seven.  Still printed, because "known noise" is a judgement that should be
      # re-made by a human and not by this script.
      drift_advisory "$DRIFT_FIXTURE and a fresh seed-42 recording differ, but ONLY in dir=c2s \
frames -- the seat's own acts.  The emitter's half (dir=s2c) is identical, so THE WIRE DID NOT \
CHANGE: this is AutoTransport reacting to one extra or one missing wall-clock re-push of the same \
prompt, which is the known instability of a human-seat fixture (docs/evidence/m3-ws.md 13.5)."
    else
      drift_advisory "the committed $DRIFT_FIXTURE and a fresh seed-42 recording are NOT the same \
multiset of frames, AND the difference reaches dir=s2c -- the emitter's own output.  That is a \
CONTENT difference in the wire, which is exactly what this check exists to find, and is not the \
frame-order noise a byte diff would report."
    fi
  fi
}

# 9c. THE M5 EXIT CRITERION (PLAN.md M5: "ten consecutive games with zero UNIMPL
#     lines and no state where the board is stuck waiting on something the
#     browser cannot express").  Everything above this line plays at most one
#     game per deck; five of these ten play the probe decks, which are the only
#     decks that reach `choose_entities` with a delayedReveal, `assign_amount`,
#     `confirm` and `text` at all (docs/evidence/m5-probes.md).
#
#     A sub-step of 9, not a step of its own: it is ten more `--transport auto`
#     games, it catches step 9's failure modes, and numbering it 11 would make
#     every "step 10d" reference in CLAUDE.md and the evidence files wrong.
#
#     Serially (GATE_JOBS=1) it is ONE job, the whole script.  In parallel each
#     row is a job of the gate's own pool -- `ten-games.sh --run-row N`, every
#     assertion of the row intact -- so rows interleave with every other game,
#     and one more job, `ten-games.sh --report`, prints the fourteen blocks in
#     row order, the UNIMPL sweep and the summary once all of them passed
#     (D129).  `ten-games.sh --jobs N` is the same thing standalone.
TEN_HDR='\n=== 9c. ten-games.sh -- the M5 exit criterion: ten consecutive games, zero UNIMPL (plus rows 11-14, match setup) ===\n'
s09c_skipped() {
  printf '\n(9c ten-games.sh skipped: SKIP_TEN=1 -- the M5 exit criterion did NOT run)\n'
}
s09c_ten() {
  # shellcheck disable=SC2059
  printf "$TEN_HDR"
  ./tools/ten-games.sh || die "tools/ten-games.sh (the M5 exit criterion; logs in var/ten-games/)"
}
s09c_row() {   # $1 the row's seed
  ./tools/ten-games.sh --run-row "$1" \
    || die "tools/ten-games.sh --run-row $1 (the M5 exit criterion; logs in var/ten-games/)"
}
s09c_report() {
  # shellcheck disable=SC2059
  printf "$TEN_HDR"
  ./tools/ten-games.sh --report || die "tools/ten-games.sh --report (the M5 exit criterion; logs in var/ten-games/)"
}
# The seeds of ten-games.sh's ROWS, read from the script itself so a new row is
# a new job without an edit here.
TEN_SEEDS="$(sed -nE 's/^  "([0-9]+)\|.*/\1/p' tools/ten-games.sh | tr '\n' ' ')"

# 9d. M6: THE SIDEBOARD ASK, which needs a session that survives `over`.
#
#     The eleventh ask kind had no engine recording of any sort until M6, and
#     the reason was never the wire (protocol amendment M27): `IGuiGame.sideboard`
#     is called by `Match.prepareAllZones` BETWEEN games, and the session used to
#     end at game 1's `over`.  With `act: newGame {mode}` it reaches the seat, on
#     the game thread, like any other ask.
#
#     Two games, so there is a "between"; --probe, so the answer is a real swap
#     (the last main card for the first sideboard card) rather than the identity
#     that a player clicking straight through would send -- the identity is legal
#     and is the default policy, and it never exercises the index marshalling.
s09d_sideboard() {
  printf '\n=== 9d. the sideboard ask: two games of one match, and a legal swap (M6) ===\n'
  rm -rf var/games/check-all-sideboard var/games/check-all-sideboard-g2
  jvm ./bridge/run.sh mtgtable.MtgTable --transport auto --probe --games 2 --seed 7 \
      --deck decks/sideboard-probe.dck --game-id check-all-sideboard \
      > var/check-all-sideboard.log 2>&1 \
    || { tail -30 var/check-all-sideboard.log >&2; die "the two-game sideboard probe did not finish"; }
  grep -q "^MTGTABLE OK$" var/check-all-sideboard.log || die "the sideboard probe did not print MTGTABLE OK"
  grep -q "games          = 2 played of 2" var/check-all-sideboard.log \
    || { grep '^games ' var/check-all-sideboard.log >&2; die "the sideboard probe did not play two games"; }
  local SB_G1="var/games/check-all-sideboard/frames.jsonl"
  local SB_G2="var/games/check-all-sideboard-g2/frames.jsonl"
  local f overs
  for f in "$SB_G1" "$SB_G2"; do
    [ -s "$f" ] || die "the sideboard probe wrote no frame log at $f (one file per game, amendment M38)"
    overs="$(grep -c '"type":"over"' "$f" || true)"
    [ "$overs" = "1" ] || die "$f has $overs \`over\` frames; section 7 says exactly one per game"
    last_is_over "$f" || die "the last frame of $f is not \`over\`"
  done
  grep -q '"gameId":"check-all-sideboard"' "$SB_G1" || die "$SB_G1 does not carry its own gameId"
  grep -q '"gameId":"check-all-sideboard-g2"' "$SB_G2" \
    || die "$SB_G2 does not carry a NEW gameId -- a new game must emit a new hello_ok (amendment M38)"
  grep -q '"type":"ask","body":{"askId":"[^"]*","kind":"sideboard"' "$SB_G2" \
    || die "no \`sideboard\` ask in game 2 of the match -- the kind M27 said only M6 could reach"
  # The answer is the new main deck as indices into `main ++ side` (section 5.1),
  # and --probe's swap is what makes it different from the identity: the last index
  # is `main`, i.e. the FIRST SIDEBOARD CARD, and the array is still main-sized.
  node -e '
    const fs = require("node:fs");
    const lines = fs.readFileSync(process.argv[1], "utf8").trim().split("\n").map(JSON.parse);
    const ask = lines.find((f) => f.type === "ask" && f.body.kind === "sideboard");
    const ans = lines.find((f) => f.type === "answer" && f.body.askId === ask.body.askId);
    const main = ask.body.main.length, side = ask.body.side.length, v = ans.body.value;
    const fail = (m) => { console.error("SIDEBOARD: " + m); process.exit(1); };
    if (side === 0) fail("the probe deck has no sideboard, so the ask proves nothing");
    if (!Array.isArray(v)) fail("the answer is not an array of indices (section 5.1)");
    if (v.length !== main) fail(`the answer is ${v.length} cards, the deck was ${main}`);
    if (new Set(v).size !== v.length) fail("the answer repeats an index");
    if (!v.every((i) => Number.isInteger(i) && i >= 0 && i < main + side)) fail("an index is out of range");
    if (!v.some((i) => i >= main)) fail("the answer is the identity -- --probe must swap a card in");
    console.log(`OK: sideboard ask ${main} main + ${side} side, answered with ${v.length} indices, `
      + `${v.filter((i) => i >= main).length} from the sideboard`);
  ' "$SB_G2" || die "the sideboard answer is not a legal new main deck"
  node tools/check-redaction.mjs "$SB_G1" "$SB_G2" || die "check-redaction.mjs on the sideboard probe"
}

# 9e. MATCH SETUP (protocol amendment M44): your deck against the villain deck,
#     with the AI on Forge's `Reckless` profile.
#
#     The villain deck is tools/villain-deck.sh's -- decks/doom-legion.dck,
#     named there once for this step and tools/ten-games.sh alike, VILLAIN_DECK
#     overriding -- and if that file is missing this step plays
#     decks/morph-probe.dck and says STAND-IN, because what it guards is the
#     profile path:
#
#       - `Bootstrap.createAiPlayer` passes a NON-EMPTY profileOverride, always.
#         The empty-override branch of GamePlayerUtil.createAiPlayer can call
#         ForgePreferences.save() (report 11 section 9), so the user's real
#         ~/.forge/preferences/ and this checkout's var/forge/preferences/ are
#         fingerprinted before and after and must not move;
#       - the AI PLAYED the profile: the summary's `ai profile     =` line reads
#         PLAY_AGGRO and CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS back from the in-game
#         AI player through AiProfileUtil.getProperty -- the lookup
#         AiController.getProperty makes -- and both must equal Reckless.ai's;
#       - `hello_ok.match` names both decks and the profile, the AI's deck as
#         {name, cards} only (check-redaction holds the shape, this the content);
#       - a profile that is not a file is refused in the argument check, before
#         FModel.initialize, with the list of the ones that are.
#
#     Seed 21, not ten-games' 13: a second Reckless game rather than the same one.
# A preferences directory with no file in it fingerprints the same whether it
# exists or not (D133, as tools/ten-games.sh's): Forge's first boot in a fresh
# checkout creates an EMPTY var/forge/preferences/, which is no preferences write.
# Three directories: the user's real one, the checkout's default home (a JVM that
# ignored its config would write there), and this job's own, where the game
# boots (JOB_HOME, D129 amended at merge).
ms_prefs() {
  local d
  for d in "$HOME/.forge/preferences" var/forge/preferences "$JOB_HOME/forge/preferences"; do
    if [ -d "$d" ] && [ -n "$(find "$d" -type f -print -quit)" ]; then
      find "$d" -type f -print0 | sort -z | xargs -0 -r sha256sum
      find "$d" -type f -print0 | sort -z | xargs -0 -r stat -c '%n %Y %s'
    else
      echo "$d: no files"
    fi
  done
}
s09e_match() {
  printf '\n=== 9e. match setup: your deck vs the villain deck, --ai-profile Reckless (M44) ===\n'
  local MS_VILLAIN="$VILLAIN"
  echo "  $VILLAIN_NOTE"
  [ -f "$MS_VILLAIN" ] || die "the villain deck $MS_VILLAIN does not exist"
  rm -rf "var/games/$MS_ID"
  local MS_PREFS_BEFORE rc=0
  MS_PREFS_BEFORE="$(ms_prefs)"
  jvm ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 21 --game-id "$MS_ID" \
      --deck decks/pacho-shield.dck --ai-deck "$MS_VILLAIN" --ai-profile Reckless \
      > var/check-all-match.log 2>&1 || rc=$?
  if [ "$(ms_prefs)" != "$MS_PREFS_BEFORE" ]; then
    diff <(echo "$MS_PREFS_BEFORE") <(ms_prefs) >&2 || true
    die "the Reckless game CHANGED a Forge preferences file -- never save() prefs"
  fi
  if [ "$rc" != "0" ]; then
    tail -30 var/check-all-match.log >&2
    capped "$rc" && die "the match-setup game did not finish within ${GAME_TIMEOUT}s"
    die "the match-setup game exited $rc (full log: var/check-all-match.log)"
  fi
  grep -E '^(deck you|deck ai|ai profile|finished|winner|UNIMPL members|emit errors)' var/check-all-match.log || true
  grep -q '^MTGTABLE OK$' var/check-all-match.log || die "the match-setup game did not print MTGTABLE OK"
  grep -q '^finished       = true' var/check-all-match.log || die "the match-setup game did not reach \`over\`"
  grep -q '^UNIMPL members = none$' var/check-all-match.log || die "the match-setup game hit an UNIMPL member"
  # Two counts, not `grep | grep -qv` (D132): see tools/ten-games.sh.
  if [ "$(grep -c 'UNIMPL' var/check-all-match.log || true)" -gt \
       "$(grep -c '^UNIMPL members = none$' var/check-all-match.log || true)" ]; then
    die "UNIMPL line(s) in var/check-all-match.log"
  fi
  ! grep -q 'UNIMPL' "$MS_LOG" || die "an UNIMPL notice reached the wire ($MS_LOG)"
  grep -q '^emit errors    = 0$' var/check-all-match.log || die "the match-setup game logged an emit error"
  [ "$(grep -c '"type":"over"' "$MS_LOG" || true)" = "1" ] || die "$MS_LOG does not have exactly one \`over\`"
  last_is_over "$MS_LOG" || die "the last frame of $MS_LOG is not \`over\`"
  node tools/check-redaction.mjs "$MS_LOG" || die "check-redaction.mjs on the match-setup game"
  local MS_LINE MS_WANT_AGGRO MS_WANT_CHAIN
  MS_LINE="$(grep '^ai profile     = ' var/check-all-match.log || true)"
  # The first match by sed's own `q`, never `| head -1` (D132).
  MS_WANT_AGGRO="$(sed -n '/^PLAY_AGGRO=/{s///p;q}' forge-home/res/ai/Reckless.ai)"
  MS_WANT_CHAIN="$(sed -n '/^CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=/{s///p;q}' forge-home/res/ai/Reckless.ai)"
  case "$MS_LINE" in
    "ai profile     = Reckless "*"in game: PLAY_AGGRO=$MS_WANT_AGGRO CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=$MS_WANT_CHAIN,"*) ;;
    *) die "the in-game AI did not read Reckless.ai's values (want PLAY_AGGRO=$MS_WANT_AGGRO, CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=$MS_WANT_CHAIN): $MS_LINE" ;;
  esac
  node -e '
    const fs = require("node:fs");
    const [file, deck, villain] = process.argv.slice(1);
    const nameOf = (p) => (fs.readFileSync(p, "utf8").match(/^Name=(.*)$/m) ?? [])[1]?.trim();
    // The [main] section of a .dck, summed: "<count> <name>|<SET>" per line.
    const cardsOf = (p) => {
      let inMain = false, n = 0;
      for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
        const line = raw.trim();
        if (line.startsWith("[")) { inMain = line.toLowerCase() === "[main]"; continue; }
        const c = inMain ? line.match(/^(\d+)\s/) : null;
        if (c) n += Number(c[1]);
      }
      return n;
    };
    const hello = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(JSON.parse)
      .find((f) => f.type === "hello_ok");
    const m = hello?.body?.match;
    const want = {
      yourDeck: { name: nameOf(deck), path: deck, cards: cardsOf(deck) },
      aiDeck: { name: nameOf(villain) ?? villain.replace(/^.*\//, "").replace(/\.dck$/, ""), cards: cardsOf(villain) },
      aiProfile: "Reckless", games: 1,
    };
    if (JSON.stringify(m) !== JSON.stringify(want)) {
      console.error("hello_ok.match is\n  " + JSON.stringify(m) + "\nexpected\n  " + JSON.stringify(want));
      process.exit(1);
    }
    console.log(`OK: hello_ok.match = ${JSON.stringify(m)}`);
  ' "$MS_LOG" decks/pacho-shield.dck "$MS_VILLAIN" || die "hello_ok.match does not describe the match that was played"
  echo "OK: no Forge preferences file changed (~/.forge/preferences, var/forge/preferences, this job's own)"
  # The refusal half: a profile that is not a file never reaches the engine.
  rc=0
  jvm ./bridge/run.sh mtgtable.MtgTable --transport null --seed 21 --game-id check-all-match-bad \
      --ai-profile NoSuchProfile > var/check-all-match-bad.log 2>&1 || rc=$?
  [ "$rc" != "0" ] || die "--ai-profile NoSuchProfile was accepted"
  grep -q 'is not one of Cautious, Default, Experimental, Reckless' var/check-all-match-bad.log \
    || { tail -5 var/check-all-match-bad.log >&2; die "--ai-profile NoSuchProfile failed without naming the four profiles"; }
  ! grep -q 'FModel.initialize took' var/check-all-match-bad.log \
    || die "--ai-profile NoSuchProfile was only refused AFTER the engine booted"
  echo "OK: --ai-profile NoSuchProfile refused before FModel.initialize, naming the four profiles"
}

# ---------------------------------------------------------------------------
# Step 10: the socket.
# ---------------------------------------------------------------------------
# M3, plus M6's 10g.  Seven servers, because each client run ends its own
# session: the three ws-smoke variants concede, and the four ws-auto-play runs
# play to a natural end -- the last of them three games long.  Every one
# of them is asserted the way steps 7-9 are -- exactly one `over`, `over` last,
# and the seat log through check-redaction.mjs -- plus the server's own exit
# code, which is MtgTable's `MTGTABLE OK` path and nothing else.
#
# Seven JOBS since D129/D131, one per server, each on its own port -- WSPORT+0
# for 10a up to WSPORT+6 for 10g when GATE_JOBS > 1, all of them WSPORT
# serially -- and each with its own game ids, server log and client log, so
# nothing one of them asserts can be satisfied by another's files.  Every job
# is its own subshell, so WSPORT and WS_PID below are that job's own.
WS_PID=""
ws_stop() {
  if [ -n "${WS_PID:-}" ]; then
    # GNU timeout forwards a signal it receives to the command it manages, so
    # this reaches the JVM and not just the wrapper.
    kill "$WS_PID" 2>/dev/null || true
    wait "$WS_PID" 2>/dev/null || true
    WS_PID=""
  fi
}
ws_job() {   # $1 the sub-step's index (10a = 0 .. 10g = 6): its port and its EXIT trap
  WSPORT="$(ws_port "$1")"
  WS_PID=""
  trap ws_stop EXIT
}
# Readiness is GET /health on the socket's own port (contract (a)), polled with
# node because node is already a dependency of this gate and curl is not.
ws_wait_health() {
  local i
  for i in $(seq 1 "${2}"); do
    if node -e 'fetch("http://127.0.0.1:" + process.argv[1] + "/health")
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
        .then((t) => process.exit(t.trim() === "ok" ? 0 : 1))
        .catch(() => process.exit(1));' "$1" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

ws_start() {   # $1 gameId, $2 server log, $3 (optional) "no-health-wait"
  rm -rf "var/games/$1"
  # `timeout` is backgrounded DIRECTLY rather than through jvm(): with an EXIT
  # trap installed bash cannot exec-optimise the last command of a subshell, so
  # `jvm ... &` would make $! the subshell and ws_stop would kill that and orphan
  # the JVM.  --keep-open on every one of these: the flag has to be exercised
  # somewhere, and it costs nothing here because keepOpen() returns the instant
  # the client disconnects, which all three clients do the moment they see `over`.
  # WS_EXTRA lets one caller change the seed or add a flag without disturbing the
  # positional contract $3 already uses ("no-health-wait").  10f is the only user.
  # shellcheck disable=SC2086
  timeout --kill-after=15s "${GAME_TIMEOUT}s" \
      ./bridge/run.sh mtgtable.MtgTable --transport ws --seed "${WS_SEED:-13}" --port "$WSPORT" \
      --keep-open --game-id "$1" ${WS_EXTRA:-} > "$2" 2>&1 &
  WS_PID=$!
  if [ "${3:-}" = "no-health-wait" ]; then
    # 10e only.  Readiness is `lastHello != null` (amendment M15), so by the time
    # /health says `ok` the engine is already ~0 ms into the ~150 ms window that
    # step measures, and one `sleep 1` of this poll loop would be the whole
    # margin.  The client does its own retry-until-the-port-accepts instead
    # (ws-smoke's Conn.openEarly), which is also the only way to be the client
    # that arrives BEFORE the session exists -- a case WsTransport handles by
    # name and nothing else in the gate reaches.  The WS LISTENING assertion
    # moves to the caller, after the client has finished.
    return 0
  fi
  ws_wait_health "$WSPORT" 90 || {
    cat "$2" >&2
    die "the ws server never answered GET /health on 127.0.0.1:$WSPORT (log: $2)"
  }
  grep -q "^WS LISTENING ws://127.0.0.1:$WSPORT/ws$" "$2" || \
    die "the ws server did not print its WS LISTENING line (contract (a); log: $2)"
}

ws_finish() {  # $1 gameId, $2 server log, $3 what, $4 (optional) "no-redaction"
  wait "$WS_PID" || {
    rc=$?
    WS_PID=""
    tail -40 "$2" >&2
    capped "$rc" && die "the ws server for $3 did not finish within ${GAME_TIMEOUT}s (log: $2)"
    die "the ws server for $3 exited $rc (log: $2)"
  }
  WS_PID=""
  grep -q "^MTGTABLE OK$" "$2" || die "the ws server for $3 did not print MTGTABLE OK (log: $2)"
  local f="var/games/$1/frames.jsonl"
  [ -s "$f" ] || die "the ws session $3 wrote no frame log at $f"
  overs="$(grep -c '"type":"over"' "$f" || true)"
  [ "$overs" = "1" ] || die "the ws session $3 wrote $overs \`over\` frames; section 7 says exactly one"
  last_is_over "$f" || \
    die "the last frame of the ws session $3 is not \`over\` (section 8.4)"
  if [ "${4:-}" = "no-redaction" ]; then
    return 0     # the caller runs its own, conditionally -- see 10e
  fi
  node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on the ws session $f"
}

s10a_smoke() {
  hdr 10 "MtgTable --transport ws -- the socket: doorstep, reconnect, a full game, a refused ask"
  ws_job 0
  # 10a. The M3 doorstep test: connect -> resync -> concede, no exception, an
  #      `over`.  A browser autoconnects and sends `resync` before Forge has asked
  #      this seat for anything, and `onResync` must NOT arm `inputSeen` -- when it
  #      did, the concede that follows removed a player while
  #      Match.prepareAllZones was iterating them and Forge threw inside its own
  #      setup.
  ws_start check-all-ws-smoke var/check-all-ws-smoke.log
  node tools/ws-smoke.mjs --port "$WSPORT" --timeout 120 --log var/check-all-ws-smoke-frames.jsonl \
    || die "tools/ws-smoke.mjs (connect -> resync -> concede) failed against 127.0.0.1:$WSPORT"
  ws_finish check-all-ws-smoke var/check-all-ws-smoke.log "the resync smoke"
}

s10b_drop() {
  ws_job 1
  # 10b. The cancelAll test.  Contract (c): the ask timeout over a socket is 0
  #      (infinite) WHILE A CLIENT IS CONNECTED, and what unparks a game thread is
  #      the disconnect, not a clock.  Drop the socket at a live decision, come
  #      back two seconds later, and the game must still be there.
  ws_start check-all-ws-drop var/check-all-ws-drop.log
  node tools/ws-smoke.mjs --port "$WSPORT" --timeout 180 --disconnect-mid-ask \
      --log var/check-all-ws-drop-frames.jsonl \
    || die "tools/ws-smoke.mjs --disconnect-mid-ask failed against 127.0.0.1:$WSPORT"
  ws_finish check-all-ws-drop var/check-all-ws-drop.log "the disconnect/reconnect smoke"
}

# 10c. A whole game, unattended, over the socket.  tools/ws-auto-play.mjs is the
#      web side's file: if it is not written yet this step SKIPS loudly rather
#      than failing, because the bridge half of M3 is testable without it and a
#      red gate that means "the other agent has not landed yet" teaches everyone
#      to ignore the gate.
s10c_auto() {
  ws_job 2
  if [ "$HAVE_AUTOPLAY" = "1" ]; then
    ws_start check-all-ws-auto var/check-all-ws-auto.log
    node tools/ws-auto-play.mjs --port "$WSPORT" --timeout 300 --log var/ws-auto-13.jsonl \
      || die "tools/ws-auto-play.mjs did not finish a game against 127.0.0.1:$WSPORT"
    ws_finish check-all-ws-auto var/check-all-ws-auto.log "the full ws game"
    grep -E "^(winner|player turns|ask kinds|ws connections|ws frames)" var/check-all-ws-auto.log || true
    grep -q "^UNIMPL members = none$" var/check-all-ws-auto.log || \
      die "the ws game hit an unimplemented IGuiGame member: $(grep "^UNIMPL members" var/check-all-ws-auto.log)"
    grep -q "^emit errors    = 0$" var/check-all-ws-auto.log || \
      die "the ws game logged an emit error: $(grep "^emit errors" var/check-all-ws-auto.log)"
    # The CLIENT's own copy of that same session, through the same checker. It is
    # a different shape on purpose (amendment M10: a resync re-delivers frames
    # verbatim, and the frames emitted while nobody was connected are missing), and
    # until this line existed nothing in the gate ever ran the combination -- so
    # `node tools/check-redaction.mjs var/ws-auto-*.jsonl`, a documented command,
    # exited non-zero on five seq complaints with every content assertion passing.
    # The mode is auto-detected from the header's recordedBy:"client" (§8.1).
    node tools/check-redaction.mjs var/ws-auto-13.jsonl \
      || die "check-redaction.mjs on the CLIENT log var/ws-auto-13.jsonl"
  else
    printf "\n"
    echo "  *** SKIPPED: tools/ws-auto-play.mjs does not exist yet, so NO FULL GAME"
    echo "  *** was played over the socket in this run.  The two ws-smoke variants"
    echo "  *** above still ran.  This step is not green until that file lands."
    printf "\n"
  fi
}

s10d_refuse() {
  [ "$HAVE_AUTOPLAY" = "1" ] || return 0
  ws_job 3
  # 10d. THE cancelAll() test, with a real pending ask.  10b settles for "an
  #      `ask` OR an `input` whose OK is enabled", and in every deck here the
  #      input always comes first -- both committed runs print `cancelling 0
  #      pending ask(s)`, so the defect amendment M19 was written for (a
  #      disconnect while a game thread is parked inside ReplyPool.await) had no
  #      coverage at all.  --refuse-first-ask drops the socket on the first `ask`
  #      FRAME, which is the only way to be inside that window, and reaching one
  #      needs a client that can play a game: every ask in these decks is
  #      downstream of an act, which is why this is ws-auto-play's flag and not a
  #      third ws-smoke variant (a second copy of the policy would be a policy
  #      that can drift from AutoTransport's).
  #
  #      The assertion is the server's own line.  `cancelling 1 pending ask(s)`
  #      is the whole point: 1, not 0, means a game thread really was parked.
  ws_start check-all-ws-refuse var/check-all-ws-refuse.log
  node tools/ws-auto-play.mjs --port "$WSPORT" --timeout 300 --refuse-first-ask \
      --reconnect-after 5000 --quiet --log var/ws-auto-refuse-13.jsonl \
    || die "tools/ws-auto-play.mjs --refuse-first-ask did not finish a game against 127.0.0.1:$WSPORT"
  ws_finish check-all-ws-refuse var/check-all-ws-refuse.log "the refused-ask game"
  grep -q "cancelling 1 pending ask(s)" var/check-all-ws-refuse.log || \
    die "the refused-ask run never cancelled a PENDING ask -- $(grep -c 'cancelling' var/check-all-ws-refuse.log) disconnect line(s), \
none with a parked game thread, so ReplyPool.cancelAll() is still uncovered (log: var/check-all-ws-refuse.log)"
  grep -q "^ASK TIMEOUT" var/check-all-ws-refuse.log && \
    die "an ask TIMED OUT in the refused-ask run: the disconnect is supposed to cancel it, not a clock (log: var/check-all-ws-refuse.log)"
  grep -q "^emit errors    = 0$" var/check-all-ws-refuse.log || \
    die "the refused-ask game logged an emit error: $(grep "^emit errors" var/check-all-ws-refuse.log)"
  grep -E "^(ws connections|ws frames)" var/check-all-ws-refuse.log || true
  # M19's other half, REPORTED and not asserted, because whether the engine
  # raises an ask inside the five seconds nobody is connected is a property of
  # the seed, not of the code: at seed 13 it does (`a2` 7 ms after the cancelled
  # `a1`), at seed 17 it does not.  When it happens, this is the only place in
  # the repo where NO_CLIENT_ASK_TIMEOUT_MS reaches the wire.
  if grep -q '"timeoutMs":120000' "var/games/check-all-ws-refuse/frames.jsonl"; then
    echo "OK: an ask raised while nobody was connected carried timeoutMs=120000 (NO_CLIENT_ASK_TIMEOUT_MS, M19)"
  else
    echo "note: no ask was raised during the disconnected window in this run -- M19's 120 s cap saw no traffic (seed-dependent)"
  fi
  # Its CLIENT log is checked but deliberately NOT added to WS_LOGS: ws-log.test.ts
  # requires every ask in a client log to carry an answer, and this client refused
  # one on purpose.  The bridge's own copy IS added, where an ask completed by
  # cancelAll() with no `answer` line is the documented shape (section 5.4).
  node tools/check-redaction.mjs var/ws-auto-refuse-13.jsonl \
    || die "check-redaction.mjs on the CLIENT log var/ws-auto-refuse-13.jsonl"
}

# 10e. Amendment M11's EXCEPTION path -- a fifth server, and M3 follow-up 5.
#      `over` is documented to follow the `state` that carries `gameOver` on
#      every path where Forge published an outcome, and there is exactly one path
#      where it does not: a concede before the engine has asked this seat for
#      anything, which applyAct's pre-`inputSeen` guard answers by ending the
#      session without entering Forge's game-over at all.  There is then no
#      outcome to snapshot and no thread it would be legal to build one on (the
#      act runs on the EDT), so `over` carries {winner: null, reason: null,
#      matchOver: true} with nothing in front of it and the bridge says so on
#      stderr.  Until this step that branch was REASONED, not measured:
#      `grep -rl 'OVER WITHOUT A gameOver STATE' var/` found nothing across every
#      run on disk, because 10a and 10b both concede after the first `input` and
#      end `winner=1 reason=AllOpponentsLost`.
#
#      The server is started WITHOUT the /health wait, and the client connects on
#      a retry loop and writes its concede from inside the `hello_ok` handler:
#      measured at seed 13, `hello_ok` -> concede is 0-3 ms and `hello_ok` -> the
#      first engine `input` is ~150 ms.  ws-smoke asserts the client's half (no
#      state/input/ask in front of the concede, and the M11 body); this asserts
#      the server's half, which is the stderr line and the absence of a
#      `gameOver` snapshot in the frame log.
s10e_m11() {
  ws_job 4
  ws_start check-all-ws-m11 var/check-all-ws-m11.log no-health-wait
  node tools/ws-smoke.mjs --port "$WSPORT" --timeout 120 --concede-before-input \
      --log var/check-all-ws-m11-frames.jsonl \
    || die "tools/ws-smoke.mjs --concede-before-input failed against 127.0.0.1:$WSPORT -- if it \
says \"the window was missed\" this is a timing failure on a loaded machine and not a bridge \
failure: the concede has to beat the engine's first prompt (~150 ms) to reach amendment M11's \
branch at all (server log: var/check-all-ws-m11.log)"
  ws_finish check-all-ws-m11 var/check-all-ws-m11.log "the pre-input concede" no-redaction
  grep -q "^WS LISTENING ws://127.0.0.1:$WSPORT/ws$" var/check-all-ws-m11.log || \
    die "the ws server did not print its WS LISTENING line (contract (a); log: var/check-all-ws-m11.log)"
  # THE assertion of this step: the bridge's own stderr line for the branch.
  grep -q "^OVER WITHOUT A gameOver STATE" var/check-all-ws-m11.log || \
    die "the pre-input concede did NOT take amendment M11's exception path: the bridge never printed \
\`OVER WITHOUT A gameOver STATE\`, so this run conceded through Forge's own game-over like every \
other step and M11's branch is still unmeasured (log: var/check-all-ws-m11.log)"
  grep -q "^CONCEDE BEFORE START: ending the session$" var/check-all-ws-m11.log || \
    die "the concede did not hit applyAct's pre-\`inputSeen\` guard (log: var/check-all-ws-m11.log)"
  # A c2s frame that arrived before the session existed would be dropped in silence
  # (amendment M20), and a client that tripped that would be waiting for an answer
  # that is never coming -- so this step doubles as M20's live assertion: it
  # connects inside the window on purpose and sends nothing until `hello_ok`.
  grep -qE ', 0 read before the session existed' var/check-all-ws-m11.log || \
    die "the pre-input concede sent a frame BEFORE the session existed (amendment M20 drops those \
in silence): $(grep '^ws frames' var/check-all-ws-m11.log) (log: var/check-all-ws-m11.log)"
  M11LOG="var/games/check-all-ws-m11/frames.jsonl"
  grep -q '"gameOver":{' "$M11LOG" && \
    die "M11's exception path emitted a \`gameOver\` snapshot after all -- then this is the ordinary \
path and the stderr line above is wrong (log: $M11LOG)"
  # check-redaction.mjs is run only if a `state` reached the log at all.  This
  # session's whole wire is header + hello_ok + act + over: with no `state`, the
  # checker's two "this file proves nothing" assertions are FAILURES rather than
  # the warnings it grants a turn-0 pre-game session, and its "no state frames at
  # all" rule fires as well -- correctly, because a file with no state in it proves
  # nothing about redaction.  The stronger statement is made directly instead: not
  # one card was serialised, because the only s2c frames are `hello_ok` and `over`.
  m11states="$(grep -c '"type":"state"' "$M11LOG" || true)"
  if [ "$m11states" = "0" ]; then
    # Cards only ever reach the wire inside a `state`, an `input` or an `ask`, so
    # "the only s2c frames are hello_ok and over" is the whole statement.  (Not a
    # grep for `"cards"`: the session header and hello_ok both carry the deck
    # LENGTHS, decks[].cards, which is a count and not a card.)
    m11bad="$(grep '"dir":"s2c"' "$M11LOG" | grep -cvE '"type":"(hello_ok|over)"' || true)"
    [ "$m11bad" = "0" ] || die "the pre-input concede's log has $m11bad s2c frame(s) that are neither \
\`hello_ok\` nor \`over\`, and no \`state\` to hold to check-redaction.mjs (log: $M11LOG)"
    echo "OK: the pre-input concede put NO \`state\` on the wire at all -- $(wc -l < "$M11LOG") log lines \
(header, hello_ok, the act, over) and not one card serialised"
  else
    # The game thread landed its first snapshot inside the ~1 ms before the session
    # closed.  It is a turn-0 pre-game state, which is the shape the checker grants
    # its warnings to, so hold it to the same standard as every other session.
    node tools/check-redaction.mjs "$M11LOG" || die "check-redaction.mjs on the pre-input concede $M11LOG"
  fi
  # NOT added to WS_LOGS: web/test/ws-log.test.ts replays those as boards, and a
  # four-line session with no `state` in it is not a board.
}

# 10f. M5's two typed acts, OVER THE SOCKET -- a sixth server, at seed 42 on the
#      user's own deck, driven by tools/ws-auto-play.mjs --probe.
#
#      PLAN.md M5, "Typed acts with no control on the board", names two:
#      `useMana` ("this is the one real dead end") and `clickAbility` ("the
#      console seat sends it; THE BROWSER NEVER HAS").  Both now have a client
#      that sends them, and this is the step that keeps it true: `--probe`
#      declines every `ability_menu` with `null` and makes the same choice again
#      as an `act`, so the ACT -- not the answer -- is what reaches
#      IGameController.selectAbility.
#
#      Seed 42 and pacho-shield, not 13, because `ability_menu` is only raised by
#      a card with two playable abilities, A.I.M. Scientists' cast + landcycling
#      is the one in this deck, and seed 42 is the shuffle measured to raise
#      seven of them (it is also what fixtures/games/human-ability-42.jsonl was
#      recorded at).  `useMana` is REPORTED here and asserted elsewhere: it needs
#      floating mana the user's deck cannot reliably make, so its gate is
#      ten-games.sh **assertion 8** on seed 4 / decks/amount-probe.dck --
#      `>= 1` act AND the seat's `manaPool` strictly lower in the `state` after
#      one than in the `state` before it.  That assertion was WRITTEN because
#      this comment claimed it: until 2026-09-12 the string `useMana` did not
#      appear in ten-games.sh at all, and nothing outside web/test/pool.test.ts
#      would have failed if the act had stopped working end to end.
s10f_probe() {
  [ "$HAVE_AUTOPLAY" = "1" ] || return 0
  ws_job 5
  WS_SEED=42 ws_start check-all-ws-probe var/check-all-ws-probe.log
  if ! node tools/ws-auto-play.mjs --port "$WSPORT" --timeout 300 --probe --quiet \
      --log var/ws-auto-probe-42.jsonl > var/check-all-ws-probe-client.log 2>&1; then
    cat var/check-all-ws-probe-client.log >&2
    die "tools/ws-auto-play.mjs --probe did not finish a game against 127.0.0.1:$WSPORT"
  fi
  cat var/check-all-ws-probe-client.log
  ws_finish check-all-ws-probe var/check-all-ws-probe.log "the probe-policy game"
  PROBEFRAMES="var/games/check-all-ws-probe/frames.jsonl"
  CLICKABILITY="$(grep -c '"action":"clickAbility"' "$PROBEFRAMES" || true)"
  [ "$CLICKABILITY" -ge 1 ] || die "the --probe ws game sent $CLICKABILITY \`clickAbility\` act(s). \
That act had no client that sends it at all before M5 (PLAN.md M5), so a zero here means its only \
coverage is a unit test again (log: $PROBEFRAMES)"
  if grep -q '"title":"Unknown ability"' "$PROBEFRAMES"; then
    die "a \`clickAbility\` act named an abilityId the bridge could not resolve: the act reached \
the server and did nothing, which is exactly the failure this step exists to catch (log: $PROBEFRAMES)"
  fi
  echo "OK: $CLICKABILITY \`clickAbility\` act(s) over the socket, none of them unresolvable"
  node tools/check-redaction.mjs var/ws-auto-probe-42.jsonl \
    || die "check-redaction.mjs on the CLIENT log var/ws-auto-probe-42.jsonl"
}

# 10g. M6, and the milestone's own command: THREE GAMES BACK TO BACK over ONE
#      socket, plus the five comfort acts with the EFFECT each is supposed to
#      have.  A seventh server, and the only step in the gate where a session
#      outlives an `over`.
#
#      Three games and not two because `--games 3` is a best-of-three: the match
#      can be decided 2-0, so `over` #2 arrives with `matchOver: true` and the
#      client must ask for a RESTART rather than a continue -- which is how both
#      HostedMatch.continueMatch() and HostedMatch.restartMatch() get exercised
#      by one flag.  Each game writes its own var/games/<id>/frames.jsonl with
#      its own session header, its own seq series and its own terminal `over`
#      (amendment M38), and each `hello_ok` carries a DIFFERENT gameId, which is
#      what tells a client "drop every id you cached" apart from "you
#      reconnected".
#
#      `--comfort` is the other half, and it is here rather than in a step of
#      its own because a typed act earns its gate with its effect and not with a
#      count (CLAUDE.md, M5 convention 6): setPhaseStop must make UPKEEP a stop
#      in the next `state`, undo must lower `state.undo.depth`, setYield must
#      turn `stack[].yielded` to "yes", yieldTo must turn `state.yield` on and
#      `buttonCancel` must turn it back off.  ws-auto-play exits 7 if any of
#      them went out and nothing moved.  FIVE acts with an effect; the sixth,
#      `passPriority`, is a COUNT and is labelled as one below -- it is a no-op
#      unless the engine is on an InputPassPriority, so no field of the next
#      `state` is uniquely its doing.
#
#      THE DECK IS decks/yield-probe.dck, and that is the M6 verification fix.
#      `setYield` used to be asserted only at the STORE -- `stack[].yielded`
#      turning "yes" -- because no deck in the repo could be relied on to put the
#      same ability back on the stack, so what the store is FOR
#      (PlayerControllerHuman.chooseSpellAbilityToPlay returning null without
#      raising an InputPassPriority at all) was measured and printed rather than
#      asserted.  22 Thallids, one MANDATORY upkeep trigger each, removes the
#      excuse: the same yieldKey comes back to the top of the stack every turn,
#      and `--require-yield-repeat` fails a run in which it does not.  The
#      assertion itself -- zero `input` frames with buttons.ok.enabled while that
#      key is on top, after the occurrence the yield was set on -- is always on,
#      on every deck.  Nothing else about this step changed: three games, three
#      ids, three logs, five acts by effect.
s10g_three() {
  [ "$HAVE_AUTOPLAY" = "1" ] || return 0
  ws_job 6
  printf '\n=== 10g. three games over one socket, and M6'"'"'s five acts with their effects ===\n'
  rm -rf var/games/check-all-ws-3g var/games/check-all-ws-3g-g2 var/games/check-all-ws-3g-g3
  # MTGTABLE_HOLD_GAME_END_MS (D114, PLAN.md slice-4 follow-up 13(c)): the
  # bridge holds each game's thread 2 s after its `over`, so the client's
  # immediate `newGame` ALWAYS lands before Forge has finished the game -- the
  # window that, unheld, opened once in two gate runs at a load average of
  # 15-32 and let game 2's late finishGame() end game 3 before it had dealt a
  # card.  Held, it is every run, and the queue that closes it is asserted below.
  # MTGTABLE_HOLD_UNDO_WINDOW_MS (D136, protocol amendment M48): the bridge
  # holds the game thread 1 s at the first state that offers an undo while no
  # input is up -- the payment's stop(), just before Game-0 puts the spell on the
  # stack, where an applied undo raced MagicStack.clearUndoStack -- and
  # --require-late-undo fails the client unless its undo there drew
  # `notice {title:"Not now"}`.  Its other undo floats mana and undoes it while
  # the engine is parked, and is the one the M6 line below counts.
  MTGTABLE_HOLD_GAME_END_MS=2000 MTGTABLE_HOLD_UNDO_WINDOW_MS=1000 WS_SEED=13 \
    WS_EXTRA="--games 3 --deck decks/yield-probe.dck" \
    ws_start check-all-ws-3g var/check-all-ws-3g.log
  if ! node tools/ws-auto-play.mjs --port "$WSPORT" --timeout 900 --games 3 --comfort --quiet \
      --require-yield-repeat --require-late-undo \
      --log var/ws-auto-3g.jsonl > var/check-all-ws-3g-client.log 2>&1; then
    cat var/check-all-ws-3g-client.log >&2
    die "tools/ws-auto-play.mjs --games 3 --comfort did not finish against 127.0.0.1:$WSPORT"
  fi
  cat var/check-all-ws-3g-client.log
  wait "$WS_PID" || {
    rc=$?
    WS_PID=""
    tail -40 var/check-all-ws-3g.log >&2
    die "the three-game ws server exited $rc (log: var/check-all-ws-3g.log)"
  }
  WS_PID=""
  grep -q "^MTGTABLE OK$" var/check-all-ws-3g.log || die "the three-game ws server did not print MTGTABLE OK"
  grep -q "games          = 3 played of 3" var/check-all-ws-3g.log \
    || { grep '^games ' var/check-all-ws-3g.log >&2; die "the ws session did not play three games"; }
  THREE_IDS=""
  for g in check-all-ws-3g check-all-ws-3g-g2 check-all-ws-3g-g3; do
    f="var/games/$g/frames.jsonl"
    [ -s "$f" ] || die "game $g wrote no frame log at $f -- one file per game (amendment M38)"
    overs="$(grep -c '"type":"over"' "$f" || true)"
    [ "$overs" = "1" ] || die "$f has $overs \`over\` frames; exactly one per game (section 7)"
    last_is_over "$f" || \
      die "the last frame of $f is not \`over\` (section 8.4)"
    [ "$(grep -c '"type":"hello_ok"' "$f")" = "1" ] || die "$f does not carry exactly one hello_ok"
    # D114: every one of these games ends by Forge's own game-over, so its
    # `over` follows a `state` carrying `gameOver`.  One that does not was ended
    # from outside -- the late finishGame() of the game before it.
    grep -q '"gameOver":{' "$f" || die "$f has no \`state\` carrying \`gameOver\`: the game was ended from \
outside Forge's own game-over -- the previous game's late finishGame() (D114, PLAN.md slice-4 follow-up 13(c))"
    grep -q "\"gameId\":\"$g\"" "$f" || die "$f does not carry its own gameId \"$g\""
    # D134 (PLAN.md's engine-and-sets follow-up 3): the game was PLAYED -- it
    # has a `state` frame, and one of them is at turn 1 or later.  `over` last
    # and a `gameOver` state do not say that: a game born dead, or one whose
    # engine threw at the deal, still ends in both, and "OK: three games" once
    # printed over a game that died at birth -- only web/test/ws-log.test.ts
    # caught it, at step 13.
    node -e '
      const fs = require("node:fs");
      const [file, id] = process.argv.slice(1);
      let states = 0, maxTurn = -1;
      for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        if (line === "" || !line.includes("\"type\":\"state\"")) continue;
        const f = JSON.parse(line);
        if (f.type !== "state") continue;
        states += 1;
        maxTurn = Math.max(maxTurn, Number(f.body?.turn ?? -1));
      }
      if (states === 0) { console.error(`${id}: no \`state\` frame at all -- the game was never played`); process.exit(1); }
      if (maxTurn < 1) { console.error(`${id}: ${states} state frame(s), none past turn ${maxTurn} -- the game was never played`); process.exit(1); }
      console.log(`OK: ${id} was played: ${states} state frames, up to turn ${maxTurn}`);
    ' "$f" "$g" || die "$f: game $g was not PLAYED (no state frame at turn 1 or later) -- D134"
    THREE_IDS="$THREE_IDS $g"
    node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on $f"
  done
  [ "$(printf '%s\n' $THREE_IDS | sort -u | wc -l)" = "3" ] || die "the three games do not have three distinct ids"
  # D114, the server's half.  With the 2 s hold, both `newGame` acts must have
  # been QUEUED behind Forge finishing the game and then RELEASED -- one queued
  # act that never ran is a session that silently stopped -- and no game may
  # have ended through amendment M11's exception path.
  if grep -q "^OVER WITHOUT A gameOver STATE" var/check-all-ws-3g.log; then
    die "a game of the three-game session ended WITHOUT a gameOver state -- the race D114 closes \
(log: var/check-all-ws-3g.log)"
  fi
  NG_QUEUED="$(grep -c '^NEW GAME QUEUED' var/check-all-ws-3g.log || true)"
  NG_RELEASED="$(grep -c '^NEW GAME RELEASED' var/check-all-ws-3g.log || true)"
  [ "$NG_QUEUED" -ge 1 ] && [ "$NG_QUEUED" = "$NG_RELEASED" ] || die "the early-newGame queue: \
$NG_QUEUED queued, $NG_RELEASED released -- with MTGTABLE_HOLD_GAME_END_MS every newGame should have been \
queued behind Forge finishing its game and then run (D114; log: var/check-all-ws-3g.log)"
  echo "OK: $NG_QUEUED early \`newGame\` act(s) queued behind Forge finishing the game and released; no game ended from outside"
  echo "OK: three games, three hello_oks, three frame logs:$THREE_IDS"
  # The client's own three logs, one per game, same rules -- checked, and
  # deliberately NOT added to WS_LOGS.  Games 2 and 3 open with the `newGame`
  # act that asked for them, held until their header the way amendment M9 holds
  # any early frame, so their first line is a c2s frame rather than the
  # `hello_ok` web/test/ws-log.test.ts replays a board from.  The bridge's own
  # three copies ARE added, above, and they are the same game.
  for f in var/ws-auto-3g.jsonl var/ws-auto-3g-g2.jsonl var/ws-auto-3g-g3.jsonl; do
    [ -s "$f" ] || die "the client wrote no log at $f (--games rolls one file per game)"
    node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on the CLIENT log $f"
  done
  # The comfort acts, from the server's own side: every one of them was applied,
  # not merely received.  (ws-auto-play already failed the run if an effect was
  # missing; this is the assertion that the acts existed at all.)
  grep -q "^M6 acts        = newGame 2, setYield 1, yieldTo 1, setPhaseStop 1, undo 1$" \
      var/check-all-ws-3g.log || {
    grep '^M6 acts' var/check-all-ws-3g.log >&2
    die "the server did not apply the expected M6 acts (2 newGame for three games, one of each other)"
  }
  # Five acts with an EFFECT, and one with a count -- said plainly, because the
  # earlier wording of this line claimed six effects.  ws-auto-play's
  # comfortReport() returns passPriority's own "sent" flag in its effect column:
  # `passPriority` is a no-op unless the engine is on an InputPassPriority
  # (report 11 §4.3), which is the point of it, so there is nothing in the next
  # `state` that is uniquely its doing.
  echo "OK: setPhaseStop, undo, setYield, yieldTo and buttonCancel(yield) each moved the board; passPriority sent (a count, no-op by design)"
  # D136, the server's half: the held undo window was entered, the late undo
  # arrived inside it and was refused, and the undo stack was not written under
  # the held engine thread.
  grep -qE '^undo window    = [1-9][0-9]* hold\(s\), the undo stack mutated under a held engine thread 0 time\(s\); acts during a hold: [1-9][0-9]* refused, 0 applied' \
      var/check-all-ws-3g.log || {
    grep '^undo window\|^NOT NOW\|^TEST HOOK: UNDO' var/check-all-ws-3g.log >&2
    die "10g: the late undo was not refused inside the held undo window (D136; log: var/check-all-ws-3g.log)"
  }
  echo "OK: the late undo, sent into the held window between the payment and the stack, was refused \"Not now\" (D136)"
  # D136, the client's half (polish-1, the undo race's skeptic).  The server
  # line above holds the refusal; this holds the CLIENT'S ASSERTION of it.
  # ws-auto-play sends the late undo in any --comfort run, so without
  # --require-late-undo the server still refuses it and the line above stays
  # green -- and the client, which then requires nothing, prints no
  # `undo(late)` at all.  So each half is held by its own grep: take the flag
  # off the client and this fails; take MTGTABLE_HOLD_UNDO_WINDOW_MS off the
  # server and the line above fails (no hold); the controls are in
  # docs/evidence/polish-1.md.
  grep -qF 'undo(late)=ok' var/check-all-ws-3g-client.log || {
    grep -o 'comfort [^·]*' var/check-all-ws-3g-client.log >&2 || true
    die "10g: the client's summary does not say undo(late)=ok -- it was not run with --require-late-undo, \
or its late undo drew no \"Not now\" (D136; log: var/check-all-ws-3g-client.log)"
  }
  echo "OK: the client's summary says undo(late)=ok -- it required the refusal and saw it"
  # The BEHAVIOURAL half of auto-yield, from the client's own summary line.
  # ws-auto-play already exited 7 if the key repeated and the engine prompted
  # anyway, or (under --require-yield-repeat) if it never repeated at all; this
  # asserts the line exists and says what it is supposed to say, so a future
  # edit that quietly drops the flag is visible here.
  grep -qE 'autoYield key=y[0-9]+ isAbility=true repeats=[1-9][0-9]* promptsWhileOnTop=0' \
      var/check-all-ws-3g-client.log || {
    grep -o 'autoYield[^·]*' var/check-all-ws-3g-client.log >&2
    die "10g did not prove the BEHAVIOUR of auto-yield: the yielded key must be an ability, must \
come back to the top of the stack at least once more, and must draw no ok-enabled \`input\` while \
it is there (decks/yield-probe.dck exists to guarantee the repeat)"
  }
  echo "OK: the yielded ability came back to the top of the stack and the engine never asked again"
}

# ---------------------------------------------------------------------------
# Steps 11-13.
# ---------------------------------------------------------------------------
s11_fixtures() {
  hdr 11 "check-redaction.mjs -- every committed fixture, then the fresh recording"
  # NO --pre-amendment anywhere in this file, deliberately: the flag downgrades a
  # missing `owner` / `token` / `alt` / `library.cards` to a warning, and this is
  # the gate that has to see exactly that.  fixtures/synthetic/ is checked too --
  # it is hand-written, which is a reason to audit it, not a reason to skip it.
  #
  # And no --opponent-library-ok either, for the same reason: full cards in a seat
  # other than the viewer's `library.cards` is a FAILURE here.  The shape is
  # reachable (Opposition Agent, Bribery, Gonti) and no card in any committed deck
  # reaches it, so the day a recording needs the flag is the day someone should
  # have to type it -- and say in the commit why.
  for f in fixtures/games/*.jsonl fixtures/synthetic/*.jsonl; do
    node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on $f"
  done
}

# Step 11's second half: the fresh recordings of steps 5, 7, 8 and 9.  A job of
# its own because the first half depends on nothing, and this one -- like 12d --
# waits for EVERY recorder in the run, not only these four (D129).
s11_fresh() {
  node tools/check-redaction.mjs "$FRESH" || die "check-redaction.mjs on the fresh recording $FRESH"
  # The human-seat logs from the three steps above: asks, answers, notices and c2s
  # lines, none of which an AI-vs-AI recording contains.
  node tools/check-redaction.mjs "$M2FRAMES" || die "check-redaction.mjs on the fresh M2 session $M2FRAMES"
  node tools/check-redaction.mjs "$CONLOG" || die "check-redaction.mjs on the console session $CONLOG"
  node tools/check-redaction.mjs "$AUTOLOG" || die "check-redaction.mjs on the auto session $AUTOLOG"
}

s12_selftest() {
  hdr 12 "check-redaction-selftest.mjs -- the checker's own negative controls"
  node tools/check-redaction-selftest.mjs || die "check-redaction-selftest.mjs (the checker no longer catches a defect it is supposed to catch)"
}

# 12b. The workshop's catalog is GENERATED (D104) from decks/*.dck, the
#      committed recordings and the card names web/src/arena/cues/cues.json has
#      an entry for (`threeD`, the card browser's View in 3D).  A new per-card
#      cues.json row for a deck card, or a new deck, without a rebuild used to be
#      caught only by web/test/workshop.test.ts deep in step 13, as a deepEqual
#      over parsed JSON -- skipped under SKIP_WEB=1, and blind to a hand edit
#      that reorders keys.  The builder's own --check is byte for byte, needs no
#      node_modules (node type stripping and no imports), and names the command
#      that fixes it (workshop follow-up 17).
s12b_catalog() {
  printf '\n=== 12b. build-workshop-catalog.ts --check -- the workshop catalog is what decks/, fixtures/games/ and cues.json make ===\n'
  node tools/build-workshop-catalog.ts --check \
    || die "web/src/workshop/catalog.json is stale (a deck, a committed recording or a cues.json card entry changed without a rebuild) -- run: node tools/build-workshop-catalog.ts"
}

# 12c. D115: an exception out of Forge's game loop FAILS the run.  Before the
#      hardening pass a card the engine could not build crashed zone
#      preparation before turn 1, MtgTable sat 60 s until the stuck watchdog
#      conceded and then printed MTGTABLE OK with exit 0, and RecordMatch's log
#      stopped at `hello_ok`.  Nothing else in this gate can reach that path:
#      every deck here builds.  So the script builds the crash on purpose -- a
#      Depower whose script uses the 2.0.15 ApiType `Empower`, in a SCRATCH
#      Forge home under var/crash-probe/ (its own config through
#      MTG_TABLE_CONFIG; forge-home/ keeps its one overlay file, hard rule 11)
#      -- and asserts twenty things about both mains: exit 1, promptly, the
#      cause on stderr, and a frame log ending in an error `notice` and a null
#      `over` that never names the card (hard rule 8).  About 8 s, no
#      node_modules, so it runs under SKIP_WEB=1 and SKIP_TEN=1 too.  Added on
#      the rebase onto match setup (PLAN.md's hardening follow-up 2).
s12c_crash() {
  printf '\n=== 12c. check-engine-crash.sh -- an engine crash fails MtgTable and RecordMatch, and ends each log in `over` (D115) ===\n'
  rc=0
  jvm ./tools/check-engine-crash.sh > var/check-all-engine-crash.log 2>&1 || rc=$?
  if [ "$rc" != "0" ]; then
    cat var/check-all-engine-crash.log >&2
    capped "$rc" && die "check-engine-crash.sh did not finish within ${GAME_TIMEOUT}s"
    die "check-engine-crash.sh exited $rc: an engine crash no longer fails the run the way D115 says (log: var/check-all-engine-crash.log)"
  fi
  grep -E '^(==|  FAIL|check-engine-crash)' var/check-all-engine-crash.log || true
  [ "$(grep -c '^  ok  ' var/check-all-engine-crash.log)" = "20" ] \
    || die "check-engine-crash.sh passed $(grep -c '^  ok  ' var/check-all-engine-crash.log) assertion(s), not 20 (log: var/check-all-engine-crash.log)"
}

# 12d. The narrator (tools/narrate.mjs, D123): every committed fixture told as a
#      story, hard rule 8 held BY IDS (no id concealed in every appearance is
#      ever named) and BY NAMES (no card name in decks/*.dck that the log never
#      shows is ever printed), no name remembered across frames, five negative
#      controls, a client log rebuilt with verbatim re-deliveries (M10) that
#      must narrate nothing twice, and the two golden files byte for byte.  A
#      LETTERED sub-step so every "step 13" reference stays correct; about a
#      second, so it costs the gate nothing.
#
#      It also reads every log THIS run recorded -- named here one by one, never
#      globbed out of var/ (CLAUDE.md: a test whose result depends on what is
#      lying around in var/ is not a test) -- and holds each to the same rules.
#      A CLIENT log is paired with the bridge's own log of the same game
#      (`client=bridge`), and the client's story may never tell a moment more
#      often than the bridge's does: that is "a resync never narrates a turn
#      twice" measured on the real socket, where 10d's reconnect re-delivers
#      the last `state` verbatim.  A step 10 that did not run leaves its files
#      out rather than failing here; its own step already said so.  6b's two
#      spectate recordings are in the list too (added on the rebase onto
#      spectating): an AI-vs-AI log from each chair, one of them with a
#      `paceMs` header, which the narrator reads like any other session header.
s12d_narrate() {
  printf '\n=== 12d. narrate-selftest.mjs -- the narrator over every fixture and every fresh log ===\n'
  NARRATE_LOGS=""
  narrate_add() {   # $1 a log; $2 (optional) the bridge's log of the same game
    [ -s "$1" ] || return 0
    if [ -n "${2:-}" ]; then
      [ -s "$2" ] || return 0
      NARRATE_LOGS="${NARRATE_LOGS:+$NARRATE_LOGS,}$1=$2"
    else
      NARRATE_LOGS="${NARRATE_LOGS:+$NARRATE_LOGS,}$1"
    fi
  }
  narrate_add "$FRESH"
  narrate_add "$SP_PACED"
  narrate_add "$SP_SEAT1"
  narrate_add "$M2FRAMES"
  narrate_add "$CONLOG"
  narrate_add "$AUTOLOG"
  narrate_add var/games/check-all-sideboard/frames.jsonl
  narrate_add var/games/check-all-sideboard-g2/frames.jsonl
  narrate_add "var/games/$MS_ID/frames.jsonl"
  narrate_add var/check-all-ws-smoke-frames.jsonl var/games/check-all-ws-smoke/frames.jsonl
  narrate_add var/check-all-ws-drop-frames.jsonl var/games/check-all-ws-drop/frames.jsonl
  narrate_add var/ws-auto-13.jsonl var/games/check-all-ws-auto/frames.jsonl
  narrate_add var/ws-auto-refuse-13.jsonl var/games/check-all-ws-refuse/frames.jsonl
  narrate_add var/check-all-ws-m11-frames.jsonl var/games/check-all-ws-m11/frames.jsonl
  narrate_add var/ws-auto-probe-42.jsonl var/games/check-all-ws-probe/frames.jsonl
  narrate_add var/ws-auto-3g.jsonl var/games/check-all-ws-3g/frames.jsonl
  narrate_add var/ws-auto-3g-g2.jsonl var/games/check-all-ws-3g-g2/frames.jsonl
  narrate_add var/ws-auto-3g-g3.jsonl var/games/check-all-ws-3g-g3/frames.jsonl
  node tools/narrate-selftest.mjs ${NARRATE_LOGS:+--logs "$NARRATE_LOGS"} \
    || die "narrate-selftest.mjs (12d: the narrator broke a hidden-information rule, narrated a re-delivered frame twice, dropped a frame a client holds, or drifted from fixtures/narrate/)"
}

# 12e. D183: every AI deck is its spec's.  tools/build-deck.ts --check
#      re-resolves every name of every decks/specs/*.json against the local card
#      index and diffs the .dck it would write against the committed one, byte for
#      byte.  web/test/deck-specs.test.ts (step 13, and CI) is the hermetic half
#      -- names, counts and order -- and passes a deck whose unpinned line was
#      switched from MSH to MSC; this catches it (docs/evidence/guards.md
#      section 5).  It needs var/cards/cards.sqlite, which only
#      `node tools/card-library/build.ts` makes (Scryfall's bulk file: network,
#      ~24 MB, under ten seconds), so it is a LOCAL job, not a CI one, and a
#      checkout without the index fails here with that command -- or skips the
#      step under SKIP_DECKS=1, which says so.  About a tenth of a second.
s12e_decks() {
  printf '\n=== 12e. build-deck.ts --check -- every AI deck is what its spec builds (D116, D183) ===\n'
  [ -f var/cards/cards.sqlite ] \
    || die "var/cards/cards.sqlite is missing: build the local card index with  node tools/card-library/build.ts  (network; tools/card-library/README.md), or pass SKIP_DECKS=1 to skip 12e and say so"
  node tools/build-deck.ts --check \
    || die "an AI deck under decks/ is not what its decks/specs/*.json builds (or a spec breaks a deck rule) -- run: node tools/build-deck.ts"
}
s12e_skipped() {
  printf '\n(12e skipped: SKIP_DECKS=1 -- the AI decks were NOT checked against their specs; web/test/deck-specs.test.ts, the hermetic half, still runs in step 13)\n'
}

s13_skipped() {
  printf '\n(web steps skipped: SKIP_WEB=1)\n'
}
# `npm test` is `node --test test/*.test.ts` AND `vitest run`, and the arena's
# headless suites are already in that glob -- camera.test.ts, cues-exhaustive,
# replay-cues (the fixture sweep over all eighteen recordings), layout,
# liveness, colour. Nothing extra is needed here, and that is the point of
# report 09 section 2.4's [NO three] annotations: the whole cue engine, the
# pose math and the layout are importable in bare Node.
#
# NOT here: tools/arena-bench.mjs (report 09 section 9.4). It needs a built
# dist, a preview server and a headless Chromium, which is a different kind of
# dependency from everything else this gate has -- run it by hand, see
# docs/evidence/m7-arena.md.
#
# MTGTABLE_WS_LOGS is THE corpus web/test/ws-log.test.ts replays, and it names
# the logs step 10 just produced -- the client's own --log plus the bridge's
# three copies.  It used to glob var/ instead, which made `npm test` depend on
# whatever scratch state was lying around: three leftover probe directories
# were enough to turn a green suite red with nothing in the repo changed
# (measured: 282 pass / 3 fail with them present, 279 / 0 with them moved
# aside).  With the variable unset the test falls back to the committed
# fixtures alone and says on stderr that it proved less.
#
# Serially it is one job, as it always was.  In parallel it is three (D131):
# `npm run build`, `npm run test:render` (vitest, ~55 s of render.test.tsx on
# one thread, which reads only committed fixtures) and `npm run test:node`
# (node --test, whose ws-log suite is the only reader of MTGTABLE_WS_LOGS) --
# the two halves of package.json's own `test` script, the same commands -- so
# only the ~9 s half waits for step 10.  It waits for the build as well, because
# personal.test.ts reads the web/dist that job writes (D195).
# The relief's three Python-step tests (web/test/relief.test.ts: the depth step on
# a synthetic gradient and its flat gate, the two layers through the step, and
# layers() with its controls) need the likeness venv -- torch, transformers,
# numpy and scipy -- and run only when MTG_TABLE_LIKENESS names one; nothing
# here sets it, because a gate that found it under var/ would pass or fail on
# what lies there.  Export it before the gate to run them (the variable passes
# through to npm test).  This line says which it was, so a green gate cannot
# hide that they were skipped (the relief window's verifier, round 2).
relief_python_note() {
  if [ -n "${MTG_TABLE_LIKENESS:-}" ] && [ -x "${MTG_TABLE_LIKENESS}/venv/bin/python" ]; then
    printf '(relief: the three Python-step tests RUN -- MTG_TABLE_LIKENESS=%s)\n' "$MTG_TABLE_LIKENESS"
  else
    printf '(relief: the three Python-step tests are SKIPPED -- export MTG_TABLE_LIKENESS=<the likeness venv root> to run them)\n'
  fi
}
s13_web() {
  hdr 13 "web -- npm run build && npm test (includes the arena's six headless suites)"
  relief_python_note
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  (cd web && npm run build) || die "npm run build"
  (cd web && MTGTABLE_WS_LOGS="${WS_LOGS:-}" npm test) || die "npm test"
}
s13_build() {
  hdr 13 "web -- npm run build && npm test (includes the arena's six headless suites)"
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  (cd web && npm run build) || die "npm run build"
}
s13_render() {
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  (cd web && npm run test:render) || die "npm test (vitest run)"
}
s13_node() {
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  relief_python_note
  (cd web && MTGTABLE_WS_LOGS="${WS_LOGS:-}" npm run test:node) || die "npm test (node --test)"
}

# ===========================================================================
# THE JOB TABLE (D129).  job ID STEP MODE FUNCTION DEPS
#   ID      the job's name: its log is var/check-all/<run>/<ID>.log
#   STEP    what `die` says ("step 9" for all of 9..9e, as the serial gate did)
#   MODE    both | serial (GATE_JOBS=1 only) | parallel (GATE_JOBS > 1 only)
#   DEPS    ids that must have PASSED first (parallel mode; serially the table
#           order is the only order there is, and it already satisfies them)
# Registered in the SERIAL order -- the order of this file's header list, and
# the order gate.log concatenates the logs in.
# ===========================================================================
declare -a J_ORDER=()
declare -A J_STEP=() J_MODE=() J_FN=() J_DEPS=() J_FRAG=()
job() { J_ORDER+=("$1"); J_STEP[$1]="$2"; J_MODE[$1]="$3"; J_FN[$1]="$4"; J_DEPS[$1]="${5:-}"; }

PRE="03-build"                       # every pool job waits for the build
job 01-forge      1  both     s01_forge
job 02-lint       2  both     s02_lint          "01-forge"
job 02b-lintself  2  both     s02b_lintself     "01-forge"
job 03-build      3  both     s03_build         "02-lint 02b-lintself"
job 04-smoke      4  both     s04_smoke         "$PRE"
job 05-record     5  both     s05_record        "$PRE"
job 06-drift      6  both     s06_drift         "05-record"
job 06b-paced     6  both     s06b_paced        "$PRE"
job 06b-seat1     6  both     s06b_seat1        "$PRE"
job 06b-check     6  both     s06b_check        "06b-paced 06b-seat1"
job 07-null       7  both     s07_null          "$PRE"
job 08-console    8  both     s08_console       "$PRE"
job 09-auto       9  both     s09_auto          "$PRE"
job 09b-drift     9  both     s09b_drift        "$PRE"
TEN_ROWS=""
if [ "${SKIP_TEN:-0}" = "1" ]; then
  job 09c-skipped 9  both     s09c_skipped      "$PRE"
else
  job 09c-ten     9  serial   s09c_ten
  for seed in $TEN_SEEDS; do
    id="$(printf '09c-row%02d' "$seed")"
    job "$id"     9  parallel "s09c_row $seed"  "04-smoke"
    J_FRAG[$id]=1                    # its block reaches gate.log through the report
    TEN_ROWS="$TEN_ROWS $id"
  done
  job 09c-report  9  parallel s09c_report       "$TEN_ROWS"
fi
job 09d-sideboard 9  both     s09d_sideboard    "$PRE"
job 09e-match     9  both     s09e_match        "04-smoke"
job 10a-smoke     10 both     s10a_smoke        "$PRE"
job 10b-drop      10 both     s10b_drop         "$PRE"
job 10c-auto      10 both     s10c_auto         "$PRE"
job 10d-refuse    10 both     s10d_refuse       "$PRE"
job 10e-m11       10 both     s10e_m11          "$PRE"
job 10f-probe     10 both     s10f_probe        "$PRE"
job 10g-three     10 both     s10g_three        "$PRE"
# Every job that writes a frame log step 11's fresh half or 12d reads.
RECORDERS="05-record 06b-paced 06b-seat1 07-null 08-console 09-auto 09d-sideboard 09e-match"
RECORDERS="$RECORDERS 10a-smoke 10b-drop 10c-auto 10d-refuse 10e-m11 10f-probe 10g-three"
job 11-fixtures   11 both     s11_fixtures      "$PRE"
job 11-fresh      11 both     s11_fresh         "$RECORDERS"
job 12-selftest   12 both     s12_selftest      "$PRE"
job 12b-catalog   12 both     s12b_catalog      "$PRE"
job 12c-crash     12 both     s12c_crash        "$PRE"
job 12d-narrate   12 both     s12d_narrate      "$RECORDERS"
if [ "${SKIP_DECKS:-0}" = "1" ]; then
  job 12e-skipped 12 both     s12e_skipped      "$PRE"
else
  job 12e-decks   12 both     s12e_decks        "$PRE"
fi
if [ "${SKIP_WEB:-0}" = "1" ]; then
  job 13-skipped  13 both     s13_skipped       "$PRE"
else
  job 13-web      13 serial   s13_web
  job 13a-build   13 parallel s13_build         "$PRE"
  job 13b-render  13 parallel s13_render        "$PRE"
  # 13c waits for 13a too: personal.test.ts reads the build it made (web/dist
  # carries no personal path, D195) -- run beside it, it read a stale or
  # half-rewritten dist (the personal tier's verifier, 2026-09-29).
  job 13c-node    13 parallel s13_node          "10a-smoke 10b-drop 10c-auto 10d-refuse 10f-probe 10g-three 13a-build"
fi

# The parallel launch ORDER: whenever a slot is free, the first READY job in
# this list starts.  The cheap checks with no JVM come first -- step 6's
# comparison the moment step 5 lands, the committed fixtures' redaction, the
# checker's selftest, the catalog -- so a drift or a stale file fails the run in
# seconds rather than after every game has played.  Then longest-first, with
# what feeds a dependency first: 10g (three games, ~135 s under load) and
# vitest (~60 s on one thread) head it because `node --test` waits for step 10
# and nothing waits for the ten-games rows, and the build is right behind them
# because `node --test` waits for it too; Smoke is early because 9c and 9e
# wait for it.  Anything not named runs after, in table order.
PAR_FIRST="06-drift 06b-check 11-fixtures 12-selftest 12b-catalog 12e-decks"
PAR_FIRST="$PAR_FIRST 10g-three 13b-render 13a-build 04-smoke 05-record 09d-sideboard 10c-auto 10d-refuse 10f-probe"
PAR_FIRST="$PAR_FIRST 10b-drop 07-null 06b-paced 06b-seat1 09b-drift 09-auto 09e-match"
PAR_FIRST="$PAR_FIRST $TEN_ROWS 10a-smoke 10e-m11 08-console 12c-crash"

# ---------------------------------------------------------------------------
# The runner (D130).
# ---------------------------------------------------------------------------
declare -A J_START=() J_END=() J_STATUS=() J_LOAD=()
T0_US="${EPOCHREALTIME/./}"
now_ms() { local us="${EPOCHREALTIME/./}"; echo $(( (us - T0_US) / 1000 )); }
secs() { printf '%d.%d' $(( $1 / 1000 )) $(( ($1 % 1000) / 100 )); }   # ms -> "12.3"
load1() { local l; read -r l _ < /proc/loadavg 2>/dev/null || l="?"; echo "$l"; }
LOAD_START="$(load1)"
LOAD_MAX="$LOAD_START"
NL=""
note_load() {   # NL = the 1-minute load average now; LOAD_MAX = the run's highest (no subshell)
  NL="$(load1)"
  if [ "$NL" != "?" ] && awk -v a="$NL" -v b="$LOAD_MAX" 'BEGIN { exit !(a > b) }'; then
    LOAD_MAX="$NL"
  fi
}

active() {   # is this job part of this mode's run?
  case "${J_MODE[$1]}" in
    both) return 0 ;;
    serial) [ "$GATE_JOBS" = "1" ] ;;
    parallel) [ "$GATE_JOBS" -gt 1 ] ;;
  esac
}

# The table: every job of this run, in the serial order, with its seconds.
print_table() {
  local id st en dur status sum=0 n=0 wall
  wall="$(now_ms)"
  printf '\n== check-all timing: GATE_JOBS=%s, WSPORT=%s, run %s ==\n' "$GATE_JOBS" "$WSPORT" "$RUN_ID"
  printf '%-4s  %-14s %8s %8s %8s  %-7s %s\n' step job start end seconds status "load(1m) at end"
  for id in "${J_ORDER[@]}"; do
    active "$id" || continue
    status="${J_STATUS[$id]:-not run}"
    if [ -n "${J_START[$id]:-}" ] && [ -n "${J_END[$id]:-}" ]; then
      st="${J_START[$id]}"; en="${J_END[$id]}"; dur=$(( en - st ))
      sum=$(( sum + dur )); n=$(( n + 1 ))
      printf '%-4s  %-14s %8s %8s %8s  %-7s %s\n' "${J_STEP[$id]}" "$id" "$(secs "$st")" "$(secs "$en")" \
          "$(secs "$dur")" "$status" "${J_LOAD[$id]:-}"
    elif [ -n "${J_START[$id]:-}" ]; then
      printf '%-4s  %-14s %8s %8s %8s  %-7s\n' "${J_STEP[$id]}" "$id" "$(secs "${J_START[$id]}")" - - "$status"
    else
      printf '%-4s  %-14s %8s %8s %8s  %-7s\n' "${J_STEP[$id]}" "$id" - - - "$status"
    fi
  done
  printf 'wall %s s for %d jobs whose seconds sum to %s s; load average (1 min) %s at the start, %s at most, %s at the end\n' \
      "$(secs "$wall")" "$n" "$(secs "$sum")" "$LOAD_START" "$LOAD_MAX" "$(load1)"
  printf 'logs: %s/<job>.log; every log in the serial order: %s/gate.log\n' "$RUN_DIR" "$RUN_DIR"
}
write_table() { print_table > "$RUN_DIR/timing.txt"; cat "$RUN_DIR/timing.txt"; }

# gate.log: the jobs' logs in the serial order -- what GATE_JOBS=1 prints.
assemble() {
  local id
  : > "$RUN_DIR/gate.log"
  for id in "${J_ORDER[@]}"; do
    active "$id" || continue
    [ -z "${J_FRAG[$id]:-}" ] || continue
    [ -f "$RUN_DIR/$id.log" ] && cat "$RUN_DIR/$id.log" >> "$RUN_DIR/gate.log"
  done
  return 0
}

# A job that failed without its own `check-all FAILED` line (a `set -e` exit, a
# signal) still gets one: the 141 of D113 was a gate that died saying nothing.
failed_line() {   # $1 id, $2 rc
  grep -q "^check-all FAILED at step " "$RUN_DIR/$1.log" 2>/dev/null \
    || echo "check-all FAILED at step ${J_STEP[$1]}: job $1 exited $2 without a message (log: $RUN_DIR/$1.log)" >&2
}

run_serial() {
  local id rc
  for id in "${J_ORDER[@]}"; do
    active "$id" || continue
    J_START[$id]="$(now_ms)"
    set +e
    ( STEP="${J_STEP[$id]}"; set -e; job_home "$id"; ${J_FN[$id]}; job_prefs_check ) 2>&1 | tee "$RUN_DIR/$id.log"
    rc="${PIPESTATUS[0]}"
    set -e
    J_END[$id]="$(now_ms)"
    note_load; J_LOAD[$id]="$NL"
    if [ "$rc" != "0" ]; then
      J_STATUS[$id]="FAILED"
      failed_line "$id" "$rc"
      assemble
      write_table
      exit 1
    fi
    J_STATUS[$id]="ok"
  done
}

# Every process a running job started, children before parents.
descendants() {
  local c
  for c in $(ps -o pid= --ppid "$1" 2>/dev/null); do
    descendants "$c"
    echo "$c"
  done
}
declare -A RUNNING=()   # pid -> job id
abort_running() {       # TERM every running job's whole tree: only what this gate started
  local pid all="" p alive
  [ "${#RUNNING[@]}" -gt 0 ] || return 0
  for pid in "${!RUNNING[@]}"; do kill -STOP "$pid" 2>/dev/null || true; done   # no new forks
  for pid in "${!RUNNING[@]}"; do all="$all $(descendants "$pid" | tr '\n' ' ')"; done
  # shellcheck disable=SC2086
  [ -z "${all// /}" ] || kill -TERM $all 2>/dev/null || true
  for pid in "${!RUNNING[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
    kill -CONT "$pid" 2>/dev/null || true
  done
  for _ in $(seq 1 50); do
    alive=""
    for p in $all; do kill -0 "$p" 2>/dev/null && alive="$alive $p"; done
    [ -z "$alive" ] && break
    sleep 0.1
  done
  # shellcheck disable=SC2086
  [ -z "${alive:-}" ] || kill -KILL $alive 2>/dev/null || true
  for pid in "${!RUNNING[@]}"; do
    wait "$pid" 2>/dev/null || true
    J_END[${RUNNING[$pid]}]="$(now_ms)"
    J_STATUS[${RUNNING[$pid]}]="killed"
    unset "RUNNING[$pid]"
  done
}

progress() {   # $1 what ("start" | "ok" | "FAILED"), $2 id
  local t; t="$(secs "$(now_ms)")"
  if [ "$1" = "start" ]; then
    printf '  [%7s s] start  %-14s (%d running)\n' "$t" "$2" "${#RUNNING[@]}"
  else
    printf '  [%7s s] %-6s %-14s %7s s   load %s\n' "$t" "$1" "$2" \
        "$(secs $(( J_END[$2] - J_START[$2] )))" "${J_LOAD[$2]}"
  fi
}

deps_ok() {
  local d
  for d in ${J_DEPS[$1]}; do
    active "$d" || continue
    [ "${J_STATUS[$d]:-}" = "ok" ] || return 1
  done
  return 0
}

run_parallel() {
  local pending=() id seen=" " i pid rc launched
  for id in $PAR_FIRST "${J_ORDER[@]}"; do
    [ -n "${J_MODE[$id]:-}" ] || continue
    active "$id" || continue
    case "$seen" in *" $id "*) continue ;; esac
    seen="$seen$id "
    pending+=("$id")
  done
  printf 'check-all: %d jobs, %s at a time, step 10 on ports %s-%s, logs in %s/\n' \
      "${#pending[@]}" "$GATE_JOBS" "$WSPORT" "$(( WSPORT + 6 ))" "$RUN_DIR"
  trap 'echo; echo "check-all: interrupted -- stopping every job" >&2; abort_running; assemble; write_table; exit 130' INT TERM
  while :; do
    launched=1
    while [ "$launched" = "1" ] && [ "${#RUNNING[@]}" -lt "$GATE_JOBS" ]; do
      launched=0
      for i in "${!pending[@]}"; do
        id="${pending[$i]}"
        deps_ok "$id" || continue
        unset "pending[$i]"
        J_START[$id]="$(now_ms)"
        ( STEP="${J_STEP[$id]}"; set -e; job_home "$id"; ${J_FN[$id]}; job_prefs_check ) \
            > "$RUN_DIR/$id.log" 2>&1 < /dev/null &
        RUNNING[$!]="$id"
        progress start "$id"
        launched=1
        break
      done
    done
    if [ "${#RUNNING[@]}" = "0" ]; then
      [ "${#pending[@]}" = "0" ] && break
      echo "check-all: internal error -- ${pending[*]} can never start (a dependency is not in this run)" >&2
      exit 1
    fi
    rc=0; pid=""
    wait -n -p pid || rc=$?
    if [ -z "$pid" ] && [ "$rc" = "127" ]; then
      echo "check-all: internal error -- ${#RUNNING[@]} job(s) recorded as running, and no child to wait for" >&2
      exit 1
    fi
    [ -n "$pid" ] && [ -n "${RUNNING[$pid]:-}" ] || continue
    id="${RUNNING[$pid]}"
    unset "RUNNING[$pid]"
    J_END[$id]="$(now_ms)"
    note_load; J_LOAD[$id]="$NL"
    if [ "$rc" = "0" ]; then
      J_STATUS[$id]="ok"
      progress ok "$id"
    else
      J_STATUS[$id]="FAILED"
      progress FAILED "$id"
      abort_running
      {
        printf '\n---- %s failed (exit %s); the last 60 lines of %s/%s.log:\n' "$id" "$rc" "$RUN_DIR" "$id"
        tail -n 60 "$RUN_DIR/$id.log"
        printf -- '---- end of %s\n' "$id"
      } >&2
      assemble
      write_table
      failed_line "$id" "$rc"
      echo "check-all: failed at $id -- its log is $RUN_DIR/$id.log, every log in serial order $RUN_DIR/gate.log" >&2
      exit 1
    fi
  done
  trap - INT TERM
}

# ---------------------------------------------------------------------------
# Run.
# ---------------------------------------------------------------------------
if [ "$GATE_JOBS" = "1" ]; then
  run_serial
  assemble
  printf '\ncheck-all OK\n'
  relief_python_note
  write_table
else
  run_parallel
  assemble
  write_table
  printf '\ncheck-all OK\n'
  relief_python_note
fi

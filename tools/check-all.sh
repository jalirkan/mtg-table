#!/usr/bin/env bash
# mtg-table — the one command to run before committing.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Runs, in order, everything that can tell you the two hand-written ends have
# drifted apart, and stops at the FIRST failure:
#
#   1. tools/check-forge.sh       the jar is present and carries the 8 classes
#   2. tools/lint-bridge.sh       the grep bans (hidden info, data loss, 2.0.15-only APIs)
#   3. bridge/build.sh            javac + the Json self-test (build.sh re-runs 2)
#   4. mtgtable.Smoke             boots the engine, proves the prefs and the card overlay
#   5. mtgtable.RecordMatch       a FRESH recording into var/, not a committed fixture
#   6. the VALUE-LEVEL drift diff  normalise that fresh recording and the committed
#                                 fixtures/games/g1.jsonl and diff them
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
#                                 check-redaction.mjs.  It is a NUMBERED SUB-STEP
#                                 rather than a step of its own so that every
#                                 "step 10d" in the docs stays correct, and it is
#                                 the single most expensive thing in this file:
#                                 ~4-8 minutes.  SKIP_TEN=1 skips it.
#                                 9d (M6) is the SIDEBOARD ask: two games of one
#                                 match on decks/sideboard-probe.dck, which is
#                                 the only way the eleventh ask kind is reachable
#                                 at all (amendments M27/M38), asserted for the
#                                 ask, for a legal non-identity answer, and for
#                                 one frame log per game.
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
#                                 --require-yield-repeat.
#                                 Each asserts exactly one `over`, `over` last,
#                                 and its log through check-redaction.mjs.
#  11. tools/check-redaction.mjs  over every committed fixture (games AND synthetic)
#                                 AND every fresh recording this run produced
#  12. check-redaction-selftest   the checker's own negative controls: twelve
#                                 one-defect probes that must be REJECTED
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
# after normalising away the four per-run values -- `t`, `startedAt`, `gameId`
# and the fresh file's own name -- they are byte-identical, and any difference
# at all is a change to the wire that the committed corpus no longer reflects.
# (Measured 2026-09-11: 377 lines each, diff empty.  Section 8.7 warns against
# promising byte-identical replay because thread interleaving is not
# deterministic; if this step ever goes flaky rather than failing consistently,
# that is the reason, and the fix is to compare the two normalised files
# frame-type-by-frame rather than to delete the step.)
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
# Usage:  ./tools/check-all.sh            # ~8-12 minutes, mostly the nineteen games
#         SKIP_WEB=1 ./tools/check-all.sh # engine side only (no node_modules yet)
#         GAME_TIMEOUT=600 ./tools/check-all.sh   # a slower machine
#         SKIP_DRIFT=1 ./tools/check-all.sh       # no 9b re-recording (~30 s)
#         DRIFT_FATAL=1 ./tools/check-all.sh      # 9b's advisory becomes a failure
#         SKIP_TEN=1 ./tools/check-all.sh         # no 9c ten-games (~4-8 minutes)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Seconds any single JVM step may take.  Measured 2026-09-11: the slowest game
# in the gate is ~45 s, so 300 is ~6x headroom and still fails a wedge fast
# enough to be useful.  `bridge/run.sh` ends in `exec java`, so TERM reaches the
# JVM itself rather than a wrapper shell; --kill-after adds the KILL that
# follows if it ignores TERM.
GAME_TIMEOUT="${GAME_TIMEOUT:-300}"
jvm() { timeout --kill-after=15s "${GAME_TIMEOUT}s" "$@"; }

step=0
say() { step=$((step + 1)); printf '\n=== %d. %s ===\n' "$step" "$1"; }
die() { echo "check-all FAILED at step $step: $1" >&2; exit 1; }
# 124 is `timeout`'s own "the cap fired"; 137 is the KILL that --kill-after sent
# when the JVM ignored the TERM.
capped() { case "$1" in 124 | 137) return 0 ;; *) return 1 ;; esac; }

say "check-forge.sh -- the jar and the eight classes"
./tools/check-forge.sh || die "check-forge.sh"

say "lint-bridge.sh -- the grep bans"
./tools/lint-bridge.sh || die "lint-bridge.sh"

say "bridge/build.sh -- javac + Json self-test"
./bridge/build.sh || die "bridge/build.sh"

say "Smoke -- boot the engine, prove the prefs (D13) and the card overlay (D14)"
mkdir -p var
rc=0
jvm ./bridge/run.sh mtgtable.Smoke > var/check-all-smoke.log 2>&1 || rc=$?
if [ "$rc" != "0" ]; then
  tail -40 var/check-all-smoke.log >&2
  capped "$rc" && die "mtgtable.Smoke did not finish within ${GAME_TIMEOUT}s (full log: var/check-all-smoke.log)"
  die "mtgtable.Smoke (full log: var/check-all-smoke.log)"
fi
grep -E '^(pref |A\.I\.M\. Scientists|deck conformance|cards in DB|SMOKE OK)' var/check-all-smoke.log || true
grep -q '^SMOKE OK$' var/check-all-smoke.log || die "Smoke did not print SMOKE OK"

say "RecordMatch -- a FRESH recording (seed 42) into var/, not a committed fixture"
FRESH="var/check-all-record.jsonl"
rm -f "$FRESH"
rc=0
jvm ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out "$FRESH" > var/check-all-record.log 2>&1 || rc=$?
if [ "$rc" != "0" ]; then
  tail -40 var/check-all-record.log >&2
  capped "$rc" && die "mtgtable.RecordMatch did not finish within ${GAME_TIMEOUT}s (raise GAME_TIMEOUT, or the recorder is wedged)"
  die "mtgtable.RecordMatch (full log: var/check-all-record.log)"
fi
grep -E '^(frames|snapshot errors|events dropped|unzoned cards|UNIMPL members)' var/check-all-record.log || true
grep -q '^RECORD OK$' var/check-all-record.log || die "RecordMatch did not print RECORD OK"

say "value-level drift -- normalise the fresh recording and diff it against fixtures/games/g1.jsonl"
# Why a diff and not just the shape checker (step 8): a checker asserts the key
# set and the runtime TYPE of every key, so it would happily pass a Snap.java
# that started emitting phase names lowercased, `power` as a number, one fewer
# event per flush, or a stack ordered top-first.  Same deck, same seed, same
# jar -> the same bytes, once the four per-run values are normalised away.
NORM="var/check-all-normalise.mjs"
cat > "$NORM" <<'NORMALISER'
// Written by tools/check-all.sh. Replaces the per-run values of a frame log
// with a constant, everywhere they appear at any depth, so two recordings of
// the same seed can be compared byte for byte:
//   t          epoch ms, different every run (envelope, section 1)
//   startedAt  ISO-8601, session header only (section 8.1)
//   gameId     the --out basename: "g1" vs "check-all-record" (header, hello_ok
//              body and every state body)
// Nothing else is touched. In particular seq, forgeJarSha256, the deck sha256s
// and every value inside a card stay exactly as the emitter wrote them -- those
// ARE the wire, and a difference in one is the finding.
import { readFileSync } from 'node:fs';
const PER_RUN = new Set(['t', 'startedAt', 'gameId']);
const scrub = (v) => {
  if (Array.isArray(v)) return v.map(scrub);
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = PER_RUN.has(k) ? '<per-run>' : scrub(val);
    return out;
  }
  return v;
};
const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.length > 0);
process.stdout.write(lines.map((l) => JSON.stringify(scrub(JSON.parse(l)))).join('\n') + '\n');
NORMALISER
node "$NORM" "$FRESH" > var/check-all-fresh.norm.jsonl || die "normalising $FRESH"
node "$NORM" fixtures/games/g1.jsonl > var/check-all-g1.norm.jsonl || die "normalising fixtures/games/g1.jsonl"
if ! diff -q var/check-all-g1.norm.jsonl var/check-all-fresh.norm.jsonl > /dev/null; then
  echo "--- fixtures/games/g1.jsonl (committed)   +++ $FRESH (just recorded)" >&2
  diff var/check-all-g1.norm.jsonl var/check-all-fresh.norm.jsonl | head -20 >&2
  echo "   (full diff: diff var/check-all-g1.norm.jsonl var/check-all-fresh.norm.jsonl)" >&2
  die "Snap.java changed the wire: re-record fixtures/games/*.jsonl"
fi
echo "OK: $(wc -l < var/check-all-fresh.norm.jsonl) normalised lines identical to fixtures/games/g1.jsonl"

say "MtgTable --transport null -- the M2 seam, end to end, with every ask answered null"
# The gate's only coverage of WireGuiGame. RecordMatch above has no seat, so it
# exercises neither the input path, nor the ask path, nor `over`. This does all
# three in ~30 s: every ask resolves to protocol section 5.4's documented
# default, which is what proves no member throws and no thread wedges -- and the
# log it writes is then held to the same redaction standard as a fixture.
#
# `over` is asserted explicitly. It used to be emitted only from finishGame(),
# which Forge does not reliably call after a concede, and the failure mode was a
# session that never terminates plus a green exit code (protocol section 7).
M2LOG="var/check-all-m2"
rm -rf "$M2LOG" var/games/check-all-m2
rc=0
jvm ./bridge/run.sh mtgtable.MtgTable --transport null --seed 42 --game-id check-all-m2 \
    > var/check-all-m2.log 2>&1 || rc=$?
if [ "$rc" != "0" ]; then
  tail -40 var/check-all-m2.log >&2
  capped "$rc" && die "the --transport null session did not finish within ${GAME_TIMEOUT}s -- a wedged game thread is exactly what this step exists to catch (full log: var/check-all-m2.log)"
  die "mtgtable.MtgTable --transport null (full log: var/check-all-m2.log)"
fi
grep -E '^(finished|ask kinds|UNIMPL members|emit errors|notices swept)' var/check-all-m2.log || true
grep -q '^MTGTABLE OK$' var/check-all-m2.log || die "MtgTable did not print MTGTABLE OK"
M2FRAMES="var/games/check-all-m2/frames.jsonl"
[ -s "$M2FRAMES" ] || die "MtgTable wrote no frame log at $M2FRAMES"
overs="$(grep -c '"type":"over"' "$M2FRAMES" || true)"
[ "$overs" = "1" ] || die "the M2 session wrote $overs \`over\` frames; section 7 and section 8.4 say exactly one"
[ "$(tail -1 "$M2FRAMES" | grep -c '"type":"over"')" = "1" ] || \
  die "the M2 session's last frame is not \`over\` -- the terminal frame of a session (section 8.4)"

say "MtgTable --transport console -- the documented smoke, scripted"
# CLAUDE.md documents this exact command, and until now nothing ran it: the
# console transport is the biggest untested file in the bridge, and its quit
# path can halt() the JVM with a non-zero code of its own (QUIT_NO_OVER_EXIT).
# Four Enters answer the pre-game prompts (the empty line is "OK when OK is
# enabled, Cancel otherwise"); `q` concedes and quits. It ends BEFORE a card is
# dealt, which is why check-redaction.mjs's two "this file proves nothing"
# assertions are warnings on a session whose every `state` is turn 0 -- the
# documented command used to produce an artifact this gate rejected.
CONLOG="var/games/check-all-console/frames.jsonl"
rm -rf var/games/check-all-console
rc=0
printf '\n\n\n\nq\n' | jvm ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
    --game-id check-all-console > var/check-all-console.log 2>&1 || rc=$?
if [ "$rc" != "0" ]; then
  tail -40 var/check-all-console.log >&2
  capped "$rc" && die "the console session did not finish within ${GAME_TIMEOUT}s -- the reader thread is parked on a prompt the script did not answer (full log: var/check-all-console.log)"
  die "mtgtable.MtgTable --transport console exited $rc (2 is the quit path's own \
'the game never reported \`over\`' code; full log: var/check-all-console.log)"
fi
grep -q '^MTGTABLE OK$' var/check-all-console.log || die "the console session did not print MTGTABLE OK"
[ -s "$CONLOG" ] || die "the console session wrote no frame log at $CONLOG"
overs="$(grep -c '"type":"over"' "$CONLOG" || true)"
[ "$overs" = "1" ] || die "the console session wrote $overs \`over\` frames; section 7 says exactly one"
[ "$(tail -1 "$CONLOG" | grep -c '"type":"over"')" = "1" ] || \
  die "the console session's last frame is not \`over\` (section 8.4)"

say "MtgTable --transport auto --seed 11 -- the policy transport, on a seed no fixture uses"
# AutoTransport produced five of the committed fixtures and was itself never run
# by the gate. Seed 11 is deliberately not one of the recorded seeds (42/7/2026/
# 99), so this is a game nobody has seen: a new UNIMPL member or an emit error
# here is a real degradation, not a replay of an old one.
AUTOLOG="var/games/check-all-auto/frames.jsonl"
rm -rf var/games/check-all-auto
rc=0
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
overs="$(grep -c '"type":"over"' "$AUTOLOG" || true)"
[ "$overs" = "1" ] || die "the auto session wrote $overs \`over\` frames; section 7 says exactly one"
[ "$(tail -1 "$AUTOLOG" | grep -c '"type":"over"')" = "1" ] || \
  die "the auto session's last frame is not \`over\` (section 8.4)"

# 9b. ADVISORY, and deliberately non-fatal: HUMAN-SEAT fixture drift, compared as
#     a multiset (M3 follow-up 7).
#
#     Step 6 diffs a fresh AI-vs-AI recording against fixtures/games/g1.jsonl
#     byte for byte, and can, because nothing in a RecordMatch run competes for
#     the log.  The five human-seat fixtures are different: they are recorded
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
if [ "${SKIP_DRIFT:-0}" = "1" ]; then
  echo "(9b fixture-drift advisory skipped: SKIP_DRIFT=1)"
elif [ ! -f "$DRIFT_FIXTURE" ]; then
  drift_advisory "$DRIFT_FIXTURE is not there to compare against"
else
  rm -rf "var/games/$DRIFT_ID"
  rc=0
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
if [ "${SKIP_TEN:-0}" = "1" ]; then
  printf '\n(9c ten-games.sh skipped: SKIP_TEN=1 -- the M5 exit criterion did NOT run)\n'
else
  printf '\n=== 9c. ten-games.sh -- the M5 exit criterion: ten consecutive games, zero UNIMPL ===\n'
  ./tools/ten-games.sh || die "tools/ten-games.sh (the M5 exit criterion; logs in var/ten-games/)"
fi

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
printf '\n=== 9d. the sideboard ask: two games of one match, and a legal swap (M6) ===\n'
rm -rf var/games/check-all-sideboard var/games/check-all-sideboard-g2
jvm ./bridge/run.sh mtgtable.MtgTable --transport auto --probe --games 2 --seed 7 \
    --deck decks/sideboard-probe.dck --game-id check-all-sideboard \
    > var/check-all-sideboard.log 2>&1 \
  || { tail -30 var/check-all-sideboard.log >&2; die "the two-game sideboard probe did not finish"; }
grep -q "^MTGTABLE OK$" var/check-all-sideboard.log || die "the sideboard probe did not print MTGTABLE OK"
grep -q "games          = 2 played of 2" var/check-all-sideboard.log \
  || { grep '^games ' var/check-all-sideboard.log >&2; die "the sideboard probe did not play two games"; }
SB_G1="var/games/check-all-sideboard/frames.jsonl"
SB_G2="var/games/check-all-sideboard-g2/frames.jsonl"
for f in "$SB_G1" "$SB_G2"; do
  [ -s "$f" ] || die "the sideboard probe wrote no frame log at $f (one file per game, amendment M38)"
  overs="$(grep -c '"type":"over"' "$f" || true)"
  [ "$overs" = "1" ] || die "$f has $overs \`over\` frames; section 7 says exactly one per game"
  [ "$(tail -1 "$f" | grep -c '"type":"over"')" = "1" ] || die "the last frame of $f is not \`over\`"
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

say "MtgTable --transport ws -- the socket: doorstep, reconnect, a full game, a refused ask"
# M3, plus M6's 10g.  Seven servers, because each client run ends its own
# session: the three ws-smoke variants concede, and the four ws-auto-play runs
# play to a natural end -- the last of them three games long.  Every one
# of them is asserted the way steps 7-9 are -- exactly one `over`, `over` last,
# and the seat log through check-redaction.mjs -- plus the server's own exit
# code, which is MtgTable's `MTGTABLE OK` path and nothing else.
#
# Port 8643, not config.json's 8642: a developer with `scripts/play.sh` running
# should be able to run the gate without the two fighting over a port.
WSPORT="${WSPORT:-8643}"
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
trap ws_stop EXIT

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
  [ "$(tail -1 "$f" | grep -c '"type":"over"')" = "1" ] || \
    die "the last frame of the ws session $3 is not \`over\` (section 8.4)"
  if [ "${4:-}" = "no-redaction" ]; then
    return 0     # the caller runs its own, conditionally -- see 10e
  fi
  node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on the ws session $f"
}

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

# 10b. The cancelAll test.  Contract (c): the ask timeout over a socket is 0
#      (infinite) WHILE A CLIENT IS CONNECTED, and what unparks a game thread is
#      the disconnect, not a clock.  Drop the socket at a live decision, come
#      back two seconds later, and the game must still be there.
ws_start check-all-ws-drop var/check-all-ws-drop.log
node tools/ws-smoke.mjs --port "$WSPORT" --timeout 180 --disconnect-mid-ask \
    --log var/check-all-ws-drop-frames.jsonl \
  || die "tools/ws-smoke.mjs --disconnect-mid-ask failed against 127.0.0.1:$WSPORT"
ws_finish check-all-ws-drop var/check-all-ws-drop.log "the disconnect/reconnect smoke"

# 10c. A whole game, unattended, over the socket.  tools/ws-auto-play.mjs is the
#      web side's file: if it is not written yet this step SKIPS loudly rather
#      than failing, because the bridge half of M3 is testable without it and a
#      red gate that means "the other agent has not landed yet" teaches everyone
#      to ignore the gate.
if [ -f tools/ws-auto-play.mjs ]; then
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

  # Step 13 replays exactly these five and nothing else: see WS_LOGS below.
  WS_LOGS="var/ws-auto-13.jsonl,var/games/check-all-ws-auto/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-smoke/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-drop/frames.jsonl"
  WS_LOGS="$WS_LOGS,var/games/check-all-ws-refuse/frames.jsonl"
else
  printf "\n"
  echo "  *** SKIPPED: tools/ws-auto-play.mjs does not exist yet, so NO FULL GAME"
  echo "  *** was played over the socket in this run.  The two ws-smoke variants"
  echo "  *** above still ran.  This step is not green until that file lands."
  printf "\n"
  WS_LOGS="var/games/check-all-ws-smoke/frames.jsonl,var/games/check-all-ws-drop/frames.jsonl"
fi

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
if [ -f tools/ws-auto-play.mjs ]; then
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
  WS_LOGS="${WS_LOGS:-},var/ws-auto-probe-42.jsonl,var/games/check-all-ws-probe/frames.jsonl"
fi

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
if [ -f tools/ws-auto-play.mjs ]; then
  printf '\n=== 10g. three games over one socket, and M6'"'"'s five acts with their effects ===\n'
  rm -rf var/games/check-all-ws-3g var/games/check-all-ws-3g-g2 var/games/check-all-ws-3g-g3
  WS_SEED=13 WS_EXTRA="--games 3 --deck decks/yield-probe.dck" \
    ws_start check-all-ws-3g var/check-all-ws-3g.log
  if ! node tools/ws-auto-play.mjs --port "$WSPORT" --timeout 900 --games 3 --comfort --quiet \
      --require-yield-repeat \
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
    [ "$(tail -1 "$f" | grep -c '"type":"over"')" = "1" ] || \
      die "the last frame of $f is not \`over\` (section 8.4)"
    [ "$(grep -c '"type":"hello_ok"' "$f")" = "1" ] || die "$f does not carry exactly one hello_ok"
    grep -q "\"gameId\":\"$g\"" "$f" || die "$f does not carry its own gameId \"$g\""
    THREE_IDS="$THREE_IDS $g"
    node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on $f"
    WS_LOGS="${WS_LOGS:-},$f"
  done
  [ "$(printf '%s\n' $THREE_IDS | sort -u | wc -l)" = "3" ] || die "the three games do not have three distinct ids"
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
fi

say "check-redaction.mjs -- every committed fixture, then the fresh recording"
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
node tools/check-redaction.mjs "$FRESH" || die "check-redaction.mjs on the fresh recording $FRESH"
# The human-seat logs from the three steps above: asks, answers, notices and c2s
# lines, none of which an AI-vs-AI recording contains.
node tools/check-redaction.mjs "$M2FRAMES" || die "check-redaction.mjs on the fresh M2 session $M2FRAMES"
node tools/check-redaction.mjs "$CONLOG" || die "check-redaction.mjs on the console session $CONLOG"
node tools/check-redaction.mjs "$AUTOLOG" || die "check-redaction.mjs on the auto session $AUTOLOG"

say "check-redaction-selftest.mjs -- the checker's own negative controls"
node tools/check-redaction-selftest.mjs || die "check-redaction-selftest.mjs (the checker no longer catches a defect it is supposed to catch)"

if [ "${SKIP_WEB:-0}" = "1" ]; then
  printf '\n(web steps skipped: SKIP_WEB=1)\n'
else
  say "web -- npm run build && npm test"
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  (cd web && npm run build) || die "npm run build"
  # MTGTABLE_WS_LOGS is THE corpus web/test/ws-log.test.ts replays, and it names
  # the logs step 10 just produced -- the client's own --log plus the bridge's
  # three copies.  It used to glob var/ instead, which made `npm test` depend on
  # whatever scratch state was lying around: three leftover probe directories
  # were enough to turn a green suite red with nothing in the repo changed
  # (measured: 282 pass / 3 fail with them present, 279 / 0 with them moved
  # aside).  With the variable unset the test falls back to the committed
  # fixtures alone and says on stderr that it proved less.
  (cd web && MTGTABLE_WS_LOGS="${WS_LOGS:-}" npm test) || die "npm test"
fi

printf '\ncheck-all OK\n'

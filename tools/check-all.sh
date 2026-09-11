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
#   6. tools/check-redaction.mjs  over every committed fixture (games AND synthetic)
#                                 AND that fresh recording
#   7. check-redaction-selftest   the checker's own negative controls: ten
#                                 one-defect probes that must be REJECTED
#   8. web: npm run build && npm test
#
# Step 5 is the one that makes this more than a replay of old evidence: the
# committed fixtures were produced by whatever Snap.java looked like the day they
# were recorded, so a checker that only ever reads them cannot see a change made
# an hour ago.  Re-recording and checking that is the actual drift test.
#
# Step 7 is the one that makes step 6 mean anything.  A checker can only prove
# an emitter did not drift if the checker itself would notice; this one once
# accepted five separate reverted amendments without a word, so its own
# regressions now have a corpus (fixtures/negative/redaction/, one defect per
# file, every one of which must be rejected).
#
# Usage:  ./tools/check-all.sh            # ~3-5 minutes, mostly the two games
#         SKIP_WEB=1 ./tools/check-all.sh # engine side only (no node_modules yet)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

step=0
say() { step=$((step + 1)); printf '\n=== %d. %s ===\n' "$step" "$1"; }
die() { echo "check-all FAILED at step $step: $1" >&2; exit 1; }

say "check-forge.sh -- the jar and the eight classes"
./tools/check-forge.sh || die "check-forge.sh"

say "lint-bridge.sh -- the grep bans"
./tools/lint-bridge.sh || die "lint-bridge.sh"

say "bridge/build.sh -- javac + Json self-test"
./bridge/build.sh || die "bridge/build.sh"

say "Smoke -- boot the engine, prove the prefs (D13) and the card overlay (D14)"
mkdir -p var
./bridge/run.sh mtgtable.Smoke > var/check-all-smoke.log 2>&1 || {
  tail -40 var/check-all-smoke.log >&2
  die "mtgtable.Smoke (full log: var/check-all-smoke.log)"
}
grep -E '^(pref |A\.I\.M\. Scientists|deck conformance|cards in DB|SMOKE OK)' var/check-all-smoke.log || true
grep -q '^SMOKE OK$' var/check-all-smoke.log || die "Smoke did not print SMOKE OK"

say "RecordMatch -- a FRESH recording (seed 42) into var/, not a committed fixture"
FRESH="var/check-all-record.jsonl"
rm -f "$FRESH"
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out "$FRESH" > var/check-all-record.log 2>&1 || {
  tail -40 var/check-all-record.log >&2
  die "mtgtable.RecordMatch (full log: var/check-all-record.log)"
}
grep -E '^(frames|snapshot errors|events dropped|unzoned cards|UNIMPL members)' var/check-all-record.log || true
grep -q '^RECORD OK$' var/check-all-record.log || die "RecordMatch did not print RECORD OK"

say "check-redaction.mjs -- every committed fixture, then the fresh recording"
# NO --pre-amendment anywhere in this file, deliberately: the flag downgrades a
# missing `owner` / `token` / `alt` / `library.cards` to a warning, and this is
# the gate that has to see exactly that.  fixtures/synthetic/ is checked too --
# it is hand-written, which is a reason to audit it, not a reason to skip it.
for f in fixtures/games/*.jsonl fixtures/synthetic/*.jsonl; do
  node tools/check-redaction.mjs "$f" || die "check-redaction.mjs on $f"
done
node tools/check-redaction.mjs "$FRESH" || die "check-redaction.mjs on the fresh recording $FRESH"

say "check-redaction-selftest.mjs -- the checker's own negative controls"
node tools/check-redaction-selftest.mjs || die "check-redaction-selftest.mjs (the checker no longer catches a defect it is supposed to catch)"

if [ "${SKIP_WEB:-0}" = "1" ]; then
  printf '\n(web steps skipped: SKIP_WEB=1)\n'
else
  say "web -- npm run build && npm test"
  [ -d web/node_modules ] || die "web/node_modules is missing -- run (cd web && npm install)"
  (cd web && npm run build) || die "npm run build"
  (cd web && npm test) || die "npm test"
fi

printf '\ncheck-all OK\n'

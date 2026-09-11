#!/usr/bin/env bash
# mtg-table — grep lint over bridge/src.  Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Every rule here has a verified leak or a verified data-loss behind it, and
# every one of them is a call that COMPILES and looks reasonable.  A grep is a
# crude tool, but the failure mode it defends against is "a later change reaches
# for the obvious accessor", and a grep catches exactly that.
#
# Sources: docs/research/06-hidden-information-audit.md (sections 1.3, 4, 7, P10),
#          docs/guides/java-for-typescript-people.md, CLAUDE.md's eleven hard rules.
#
# Usage:  ./tools/lint-bridge.sh          # run from anywhere; scans bridge/src
# Exit:   0 clean, 1 on the first rule with a hit (all hits are printed).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/bridge/src"
[ -d "$SRC" ] || { echo "no sources at $SRC"; exit 1; }

fail=0

# A hit whose line is prose in a comment (starts with //, * or /*) is not a
# call.  This file's own rules and Snap.java's javadoc name most of these
# accessors on purpose; banning the WORDS would ban explaining the ban.
strip_comments() { grep -vE ':[0-9]+:[[:space:]]*(//|\*|/\*)'; }

# ban <pattern> <why>
ban() {
  ban_except '' "$1" "$2"
}

# ban_except <allowed-basename|''> <pattern> <why>
# The exemption is per FILE and is always spelled out at the call site, so an
# allowed use is a decision somebody wrote down rather than a hole.
ban_except() {
  local allow="$1" pattern="$2" why="$3" hits
  hits="$(grep -rn --include='*.java' -F "$pattern" "$SRC" 2>/dev/null | strip_comments || true)"
  if [ -n "$allow" ] && [ -n "$hits" ]; then
    hits="$(printf '%s\n' "$hits" | grep -v "/$allow:" || true)"
  fi
  if [ -n "$hits" ]; then
    echo "LINT FAIL: $pattern -- $why" >&2
    echo "$hits" | sed 's/^/  /' >&2
    fail=1
  fi
}

# --------------------------------------------------------------------------
# 1. Destroys the user's data
# --------------------------------------------------------------------------
ban 'getDecks(' \
  'FModel.getDecks() reaches DeckStorage.adjustFileLocation, which renames a .dck to its Name= metadata, moves it up a directory and DELETES unparseable ones. Use DeckSerializer.fromFile.'

# --------------------------------------------------------------------------
# 2. Absent from the 2.0.14 jar (compiles against the 2.0.15 source, not here)
# --------------------------------------------------------------------------
ban 'setNoGUIUser' \
  'Game.setNoGUIUser() exists only in the 2.0.15 source checkout; it is not in the jar we compile against.'
ban 'com.google.gson' \
  'gson is a 2.0.15 dependency and is not in the 2.0.14 jar. JSON in: org.eclipse.jetty.util.ajax.JSON. JSON out: mtgtable.Json.'

# --------------------------------------------------------------------------
# 3. Hidden information -- the identity accessors (report 06 sections 1.3, 4)
#
# Each of these returns the REAL card behind a face-down one, or splices a
# hidden-zone card name into a string, and none of them consults any gate.
# --------------------------------------------------------------------------
ban 'getBackup(' \
  'CardView.getBackup() is the PaperCardBackup of the real printing, stored while the card was face UP and never cleared when it turns face down.'
ban 'getLeftSplitState(' \
  'the real half of a split card, ungated.'
ban 'getRightSplitState(' \
  'the real half of a split card, ungated.'
ban 'getOracleName(' \
  'do not rely on it being "" for face-down cards; the protocol has no oracle-name field.'
ban 'getCloner(' \
  'TrackableProperty.Cloner is the string "<real name> (<id>)".'
ban 'getMergedCards(' \
  'a string of merged card names and ids.'
# Allowed in Smoke.java alone: M0 prints Game.getGameLog()'s MATCH_RESULTS
# entries to the OPERATOR'S CONSOLE, never to a frame, and Smoke has no viewer
# and emits no protocol at all.  Anywhere that can reach the wire, this is the
# whole unredacted log, built from CardView.toString().
ban_except 'Smoke.java' 'getGameLog(' \
  'GameView.getGameLog() is the whole unredacted log, built from CardView.toString().'
ban 'GameView.getDeck' \
  'the full decklist of any seat.'
ban 'GameView.getGame' \
  'the live Game object, i.e. everything.'

# The three fail-OPEN predicates.  canBeShownToAny(empty) is true;
# AbstractGuiGame.mayView has three fail-open branches, one of which
# (!hasLocalPlayers()) is exactly the AI-vs-AI recorder; mayLookAtAllCards is
# the dev-mode cheat.
ban 'canBeShownToAny' \
  'fail-open for an empty viewer collection (CardView.java:616-620). Use canBeShownTo(viewer).'
ban 'mayView' \
  'AbstractGuiGame.mayView returns TRUE when there are no local players -- the recorder case -- and after game over in the libgdx port.'
ban 'mayFlip' \
  'AbstractGuiGame.mayFlip is Forge''s own renderer gate; call cv.canFaceDownBeShownTo(viewer) directly.'
ban 'mayLookAtAllCards' \
  'the IDevModeCheats reveal-everything switch.'

# Engine strings that name cards in zones the viewer may not see.
ban 'targetDescription(' \
  'GameEventSpellAbilityCast.targetDescription() names every target, library cards included. Emit stack[].targetCardIds instead.'
ban 'stackDescription(' \
  'GameEventSpellResolved.stackDescription() is the same string as stack[].text reached from a second accessor -- the exact shape of the leak protocol section 10.12 records. It goes through Snap.stackText or it does not go.'
ban 'outcomeStrings(' \
  'GameEventGameOutcome.outcomeStrings() is free text.'
ban 'matchSummary(' \
  'GameEventGameOutcome.matchSummary() is free text.'

# --------------------------------------------------------------------------
# 4. getAlternateState: allowed EXACTLY ONCE, in Snap.card()'s `alt` block
#
# This one is not a ban but a budget, because the accessor is how a viewer sees
# their own morph.  One occurrence, in one file, gated on
# canFaceDownBeShownTo(viewer) -- a second occurrence anywhere is a second place
# that decides whether an identity may be shown.
# --------------------------------------------------------------------------
alt_hits="$(grep -rn --include='*.java' -F 'getAlternateState(' "$SRC" 2>/dev/null | strip_comments || true)"
alt_n=0
[ -n "$alt_hits" ] && alt_n="$(printf '%s\n' "$alt_hits" | wc -l)"
alt_elsewhere="$(printf '%s' "$alt_hits" | grep -v '/Snap\.java:' || true)"
if [ -n "$alt_elsewhere" ]; then
  echo "LINT FAIL: getAlternateState( outside Snap.java -- the real card behind a face-down one may only be read in Snap.card()'s alt block, gated on canFaceDownBeShownTo(viewer)." >&2
  echo "$alt_elsewhere" | sed 's/^/  /' >&2
  fail=1
elif [ "$alt_n" != "1" ]; then
  echo "LINT FAIL: getAlternateState( appears $alt_n time(s) in Snap.java, expected exactly 1 (the alt block of Snap.card())." >&2
  [ -n "$alt_hits" ] && echo "$alt_hits" | sed 's/^/  /' >&2
  fail=1
fi

# --------------------------------------------------------------------------
# 5. Rule 8 made mechanical: only Snap.java may name a CardView
#
# "Exactly one card-serialisation function" is a rule about code nobody has
# written yet, which is the kind of rule that quietly stops being true.  A file
# that cannot name the type cannot serialise it.  Files that legitimately need
# the type are listed here, each with the reason, and the list is meant to stay
# short: adding to it is a decision, not a formality.
# --------------------------------------------------------------------------
allow_cardview() {
  case "$1" in
    Snap.java)        return 0 ;;   # THE serialiser.  This is the point.
    # RecordMatch's SpectatorGui implements IGuiGame, whose own signatures take
    # CardView (showPromptMessage, setCard, assignCombatDamage, ...).  Every one
    # of those bodies is a logged no-op returning a documented default; none of
    # them reads a field off the card.  M2's WireGuiGame will need the same
    # exemption and the same scrutiny.
    RecordMatch.java) return 0 ;;
    *)                return 1 ;;
  esac
}
while IFS= read -r f; do
  base="$(basename "$f")"
  allow_cardview "$base" && continue
  hits="$(grep -n -F 'CardView' "$f" 2>/dev/null | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' || true)"
  if [ -n "$hits" ]; then
    echo "LINT FAIL: CardView named in $base -- only Snap.java (the one serialiser) and the IGuiGame implementations listed in tools/lint-bridge.sh may. A file that cannot name the type cannot grow a second serialiser." >&2
    echo "$hits" | sed "s|^|  $base:|" >&2
    fail=1
  fi
done < <(find "$SRC" -name '*.java' | sort)

if [ "$fail" -ne 0 ]; then
  echo "bridge lint FAILED" >&2
  exit 1
fi
echo "bridge lint OK ($(find "$SRC" -name '*.java' | wc -l) file(s))"

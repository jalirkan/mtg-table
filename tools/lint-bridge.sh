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
# 4b. StackItemView.getKey(): allowed EXACTLY ONCE, in WireGuiGame's handle table
#
# M6, protocol amendment M36.  `StackItemView.getKey()` is
# `CardView.toString() + ": " + the ability's text` -- a card NAME, its id and
# its rules text -- i.e. the same text channel report 06 section 4 opens with,
# reached from an accessor whose name says nothing about cards at all.  The wire
# carries an opaque bridge-minted handle ("y7") instead, and `act: setYield`
# resolves it back.
#
# This is a budget rather than a ban because the key is how an auto-yield is
# addressed at all.  One occurrence, in WireGuiGame.rawYieldKey(), tagged
# `// ALLOW getKey:`.  A second one anywhere is a second place that can put
# Forge's string on the wire.
#
# `Map.Entry.getKey()` is everywhere in this codebase and is not what this rule
# is about, so the rule has to separate the two.  The FIRST cut matched the
# literal receiver name `si.`, which meant a second reader who spelled it
# `top.getKey()` / `item.getKey()` / `stack.get(0).getKey()` passed the lint
# silently -- the one thing the rule exists to stop.  It now works from the
# DECLARED TYPE instead: every identifier introduced as `StackItemView <name>`
# anywhere under bridge/src (locals, parameters, enhanced-for variables) becomes
# a receiver to watch, so a rename is caught by construction.  A
# `stack.get(0).getKey()` with no named variable does not type-check against
# this rule, so `rawYieldKey(StackItemView)` is deliberately the only accessor
# and the negative control in tools/check-redaction-selftest.mjs backstops the
# wire itself (a `yieldKey` containing a space or a `(` is a failure there).
# --------------------------------------------------------------------------
si_names="$(grep -rhoE --include='*.java' 'StackItemView[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' "$SRC" 2>/dev/null \
  | awk '{print $2}' | sort -u || true)"
if [ -n "$si_names" ]; then
  si_alt="$(printf '%s' "$si_names" | paste -sd '|' -)"
  key_pattern="\\b(${si_alt})\\.getKey\\(\\)"
else
  key_pattern='\bsi\.getKey\(\)'
fi
key_hits="$(grep -rn --include='*.java' -E "$key_pattern" "$SRC" 2>/dev/null | strip_comments || true)"
key_n=0
[ -n "$key_hits" ] && key_n="$(printf '%s\n' "$key_hits" | wc -l)"
key_elsewhere="$(printf '%s' "$key_hits" | grep -v '/WireGuiGame\.java:' || true)"
key_untagged="$(printf '%s' "$key_hits" | grep -v 'ALLOW getKey:' || true)"
if [ -n "$key_elsewhere" ]; then
  echo "LINT FAIL: StackItemView.getKey() outside WireGuiGame.java -- a yield key is a card name, an id and its rules text (protocol amendment M36). The wire carries the opaque handle WireGuiGame mints; nothing else may read the key." >&2
  echo "$key_elsewhere" | sed 's/^/  /' >&2
  fail=1
elif [ "$key_n" != "1" ] || [ -n "$key_untagged" ]; then
  echo "LINT FAIL: StackItemView.getKey() appears $key_n time(s) in WireGuiGame.java (receivers watched: $(printf '%s' "$si_names" | paste -sd ',' -)), expected exactly 1 tagged \`// ALLOW getKey:\` (the yield-handle table)." >&2
  [ -n "$key_hits" ] && echo "$key_hits" | sed 's/^/  /' >&2
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
    # WireGuiGame is M2's IGuiGame: 37 abstract members whose own signatures take
    # CardView (showPromptMessage, setCard, setSelectables, assignCombatDamage,
    # manipulateCardList, getAbilityToPlay, ...).  It never reads a field off one:
    # a push takes getId() and nothing else (report 07 R1), and every card and
    # every option LABEL that reaches the wire goes through Snap.card / Snap.label
    # -- the same single gate the zone walk uses.
    WireGuiGame.java) return 0 ;;
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

# --------------------------------------------------------------------------
# 6. Thread names: every thread we create is named, from a constant, "mtg-table-*"
#
# forge.util.ThreadUtil.isGameThread() is a bare
# getName().startsWith("Game") -- no registry, no identity, just a prefix match
# on a string.  Snap's game-thread assert, Transport's assertGameThread and
# WireGuiGame's R1 rule are all built on it, so a thread of OURS that drifted
# into that prefix would be allowed to walk the view graph and would corrupt the
# Tracker silently.
#
# HeadlessGuiBase asserts the same thing at class-init, over the same seven
# names.  This rule is the half that assert cannot do: it catches a name that is
# never constructed in the run that happens to execute the assert (the console's
# quit watcher only exists after a `q`), and it catches an unnamed thread, whose
# name would be "Thread-0" today and whatever the JDK feels like tomorrow.
#
# The name must be on the `new Thread(` line itself, which is also why
# ConsoleTransport.quit() hands a method reference to a named quitWatch() rather
# than an inline lambda: a grep can only see one line.
# --------------------------------------------------------------------------
thread_ok() {
  # $1: the name expression from a `new Thread(...)` call site.
  case "$1" in
    '"mtg-table-'*'"') return 0 ;;             # a literal, right prefix
    '"'*) return 1 ;;                          # a literal, wrong prefix
  esac
  # An identifier (possibly qualified): find its declaration and check the literal.
  local ident="${1##*.}" decl
  decl="$(grep -rhoE "String +${ident} *= *\"[^\"]*\"" "$SRC" 2>/dev/null | head -1 || true)"
  [ -n "$decl" ] || return 1
  case "${decl##*= }" in
    '"mtg-table-'*) return 0 ;;
    *) return 1 ;;
  esac
}
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  expr_="$(printf '%s' "$hit" | sed -E 's/.*new Thread\(//; s/\).*$//; s/.*, *//; s/[[:space:]]*$//')"
  if ! thread_ok "$expr_"; then
    echo "LINT FAIL: unnamed or misnamed thread -- every \`new Thread(\` under bridge/src must" >&2
    echo "  pass a name on the same line, as a constant (or an \"mtg-table-...\" literal) whose" >&2
    echo "  value starts with \"mtg-table-\". ThreadUtil.isGameThread() is nothing but" >&2
    echo "  getName().startsWith(\"Game\"), so an unnamed or drifting thread of ours can be" >&2
    echo "  handed the view graph. Got: ${expr_:-<no name argument>}" >&2
    echo "  $hit" >&2
    fail=1
  fi
done < <(grep -rn --include='*.java' -F 'new Thread(' "$SRC" 2>/dev/null | strip_comments || true)

ban 'defaultThreadFactory' \
  'Executors.defaultThreadFactory() names its threads "pool-N-thread-M", which nothing in this repo asserts on. Pass a factory that names the thread from a constant (see HeadlessGuiBase).'

if [ "$fail" -ne 0 ]; then
  echo "bridge lint FAILED" >&2
  exit 1
fi
echo "bridge lint OK ($(find "$SRC" -name '*.java' | wc -l) file(s))"

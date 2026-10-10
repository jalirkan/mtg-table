#!/usr/bin/env bash
# mtg-table — grep lint over bridge/src and tools/**/*.java.
# Copyright (C) 2026 mtg-table contributors.
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
# WHAT IT SCANS (D182): every *.java under bridge/src AND under tools/.  The
# second tree is the Java that is not the bridge but boots the same engine the
# same way -- tools/audit-deck/AuditDeck.java -- and it once called the banned
# two-argument GamePlayerUtil.createAiPlayer because nothing looked there.  The
# rules are the same in both trees; every exemption names a repo-relative PATH,
# never a bare file name, so a tools/ file cannot inherit a bridge file's ALLOW.
#
# EVERY RULE CAN FIRE, AND THAT IS TESTED (D180).  A rule is declared by exactly
# one of three lines -- `ban <id> ...`, `ban_except <id> ...` or `rule <id>
# <check function>` -- and fails only through `lint_fail`, which tags the
# message `LINT FAIL [<id>]`.  `--list-rules` prints the ids;
# tools/lint-bridge-selftest.sh reads that list, plants a minimal Java snippet
# for each id in a scratch copy of the two trees under var/, and requires the
# lint to fail with THAT id and no other.  A rule added here without a case
# there fails the self-test, and so does a rule that cannot fire: the two
# GameView rules below matched the literal text `GameView.getDeck` from the
# first commit (2026-09-11) to 2026-09-28, while real code writes
# `gameView.getDeck(p)`, and nobody knew (docs/evidence/guards.md section 1).
#
# Usage:  ./tools/lint-bridge.sh                  # run from anywhere; scans this checkout
#         ./tools/lint-bridge.sh --root <dir>     # scan <dir>/bridge/src and <dir>/tools
#                                                 # instead (the self-test's scratch trees)
#         ./tools/lint-bridge.sh --list-rules     # every rule id, one per line; scans nothing
# Exit:   0 clean, 1 if any rule has a hit (every hit of every rule is printed), 2 usage.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$REPO_ROOT"
LIST=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root)
      [ $# -ge 2 ] || { echo "lint-bridge.sh: --root needs a directory" >&2; exit 2; }
      ROOT="$(cd "$2" && pwd)" || { echo "lint-bridge.sh: no directory $2" >&2; exit 2; }
      shift 2 ;;
    --list-rules) LIST=1; shift ;;
    *) echo "usage: tools/lint-bridge.sh [--root <dir>] [--list-rules]" >&2; exit 2 ;;
  esac
done

# Relative paths from here on, so a hit reads `bridge/src/mtgtable/X.java:12: ...`
# and an exemption is a repo-relative path.
cd "$ROOT"
TREES=(bridge/src tools)
if [ "$LIST" = 0 ]; then
  [ -d bridge/src ] || { echo "no sources at $ROOT/bridge/src" >&2; exit 1; }
  [ -d tools ] || { echo "no tools/ at $ROOT/tools" >&2; exit 1; }
fi

fail=0
CURRENT_RULE=""
RULE_N=0

# The one place a rule fails.  The self-test holds that `LINT FAIL` and
# `fail=1` appear nowhere else in this file, so every failure carries its rule's
# id and a check cannot fail the lint without being a registered rule.
lint_fail() {
  echo "LINT FAIL [${CURRENT_RULE:-unregistered}]: $*" >&2
  fail=1
}

# rule <id> <command...>: declare a rule and run its check -- or, under
# --list-rules, name it and scan nothing.
rule() {
  local id="$1"
  shift
  RULE_N=$((RULE_N + 1))
  if [ "$LIST" = 1 ]; then
    echo "$id"
    return 0
  fi
  CURRENT_RULE="$id"
  "$@"
  CURRENT_RULE=""
}

# Every *.java this lint reads, one per line.
java_files() { find "${TREES[@]}" -name '*.java' -type f | LC_ALL=C sort; }

# A hit whose line is prose in a comment (starts with //, * or /*) is not a
# call.  This file's own rules and Snap.java's javadoc name most of these
# accessors on purpose; banning the WORDS would ban explaining the ban.
strip_comments() { grep -vE ':[0-9]+:[[:space:]]*(//|\*|/\*)' || true; }

# grep_java <grep flags...> <pattern>: every non-comment hit in both trees
# (and an empty string, not a failed pipeline, when there is none).
grep_java() { { grep -rn --include='*.java' "$@" "${TREES[@]}" 2>/dev/null || true; } | strip_comments; }

# ban <id> <pattern> <why>
ban() {
  rule "$1" scan_ban '' "$2" "$3"
}

# ban_except <id> <allowed repo-relative path|''> <pattern> <why>
# The exemption is per FILE, by path, and is always spelled out at the call
# site, so an allowed use is a decision somebody wrote down rather than a hole.
ban_except() {
  rule "$1" scan_ban "$2" "$3" "$4"
}

scan_ban() {
  local allow="$1" pattern="$2" why="$3" hits
  hits="$(grep_java -F "$pattern")"
  if [ -n "$allow" ] && [ -n "$hits" ]; then
    hits="$(printf '%s\n' "$hits" | grep -v "^$allow:" || true)"
  fi
  if [ -n "$hits" ]; then
    lint_fail "$pattern -- $why"
    echo "$hits" | sed 's/^/  /' >&2
  fi
}

# --------------------------------------------------------------------------
# 1. Destroys the user's data
# --------------------------------------------------------------------------
ban getDecks 'getDecks(' \
  'FModel.getDecks() reaches DeckStorage.adjustFileLocation, which renames a .dck to its Name= metadata, moves it up a directory and DELETES unparseable ones. Use DeckSerializer.fromFile.'

# Match setup (protocol amendment M44).  GamePlayerUtil.createAiPlayer's
# two-argument overload delegates with profileOverride = "", and the empty-
# override branch of the five-argument one reads FPref.UI_CURRENT_AI_PROFILE and,
# when that is not a loaded profile, calls ForgePreferences.save() (javap:
# offset 83) -- persisting every in-memory pref Bootstrap sets (D13, D14, the
# mana-lost prompt).  Bootstrap.createAiPlayer is THE seam: it refuses an empty
# profile and asserts the profile loaded.  So the Forge call is allowed in
# bridge/src/mtgtable/Bootstrap.java alone -- tools/ included (D182: the audit
# helper seats its two throwaway AIs through Bootstrap too).  The pattern has no
# `(` on purpose: it also catches
# `import static forge.player.GamePlayerUtil.createAiPlayer;`, after which a
# bare `createAiPlayer(` would be invisible to a grep; the method reference and
# the static wildcard import are the other two spellings.  GamePlayerUtil is a
# final class (javap), so there is no subclass to call it through.
ban_except createAiPlayer 'bridge/src/mtgtable/Bootstrap.java' 'GamePlayerUtil.createAiPlayer' \
  'seat an AI through Bootstrap.createAiPlayer(name, avatar, profile). GamePlayerUtil.createAiPlayer with an empty profileOverride (the two-argument overload passes "") reaches the branch that calls ForgePreferences.save().'
ban_except createAiPlayer-ref 'bridge/src/mtgtable/Bootstrap.java' 'GamePlayerUtil::createAiPlayer' \
  'the same call as a method reference -- seat an AI through Bootstrap.createAiPlayer.'
ban GamePlayerUtil-wildcard 'GamePlayerUtil.*;' \
  'a static wildcard import of GamePlayerUtil makes a bare createAiPlayer( call invisible to this lint. Import the class and call Bootstrap.createAiPlayer.'

# --------------------------------------------------------------------------
# 2. Absent from the 2.0.14 jar (compiles against the 2.0.15 source, not here)
# --------------------------------------------------------------------------
ban setNoGUIUser 'setNoGUIUser' \
  'Game.setNoGUIUser() exists only in the 2.0.15 source checkout; it is not in the jar we compile against.'
ban gson 'com.google.gson' \
  'gson is a 2.0.15 dependency and is not in the 2.0.14 jar. JSON in: org.eclipse.jetty.util.ajax.JSON. JSON out: mtgtable.Json.'

# --------------------------------------------------------------------------
# 3. Hidden information -- the identity accessors (report 06 sections 1.3, 4)
#
# Each of these returns the REAL card behind a face-down one, or splices a
# hidden-zone card name into a string, and none of them consults any gate.
# --------------------------------------------------------------------------
ban getBackup 'getBackup(' \
  'CardView.getBackup() is the PaperCardBackup of the real printing, stored while the card was face UP and never cleared when it turns face down.'
ban getLeftSplitState 'getLeftSplitState(' \
  'the real half of a split card, ungated.'
ban getRightSplitState 'getRightSplitState(' \
  'the real half of a split card, ungated.'
ban getOracleName 'getOracleName(' \
  'do not rely on it being "" for face-down cards; the protocol has no oracle-name field.'
ban getCloner 'getCloner(' \
  'TrackableProperty.Cloner is the string "<real name> (<id>)".'
ban getMergedCards 'getMergedCards(' \
  'a string of merged card names and ids.'
# Allowed in Smoke.java alone: M0 prints Game.getGameLog()'s MATCH_RESULTS
# entries to the OPERATOR'S CONSOLE, never to a frame, and Smoke has no viewer
# and emits no protocol at all.  Anywhere that can reach the wire, this is the
# whole unredacted log, built from CardView.toString().
ban_except getGameLog 'bridge/src/mtgtable/Smoke.java' 'getGameLog(' \
  'GameView.getGameLog() is the whole unredacted log, built from CardView.toString().'

# GameView.getDeck(PlayerView) is any seat's whole decklist and
# GameView.getGame() the live Game object -- i.e. everything, hidden zones and
# all, with no viewer anywhere.  These two rules searched for the literal text
# `GameView.getDeck` / `GameView.getGame` until 2026-09-28, which no code ever
# writes (an instance call reads `gameView.getDeck(p)` or `view.getGame()`), so
# a call planted in a scratch copy gave 0 hits: they were DEAD
# (docs/evidence/guards.md section 1).  They now work the way 4b does, from the
# TYPE rather than the text: every identifier DECLARED `GameView <name>` in
# either tree (fields, parameters, locals) is a receiver, and so is every
# expression a grep can see is a GameView -- `getGameView()` (IGuiGame,
# AbstractGuiGame, HostedMatch), `getView()` (Game's is the only getView()
# whose result HAS a getDeck or a getGame -- CardView, PlayerView and
# GameEntityView have neither, javap), a cast to GameView (`(GameView) o` or
# `(forge.game.GameView) o` -- the self-test's first run caught the rule
# missing the second), and the method references `GameView::getDeck` /
# `GameView::getGame`.  HostedMatch.getGame()
# is NOT this call (its receiver is a HostedMatch) and stays legal.  A GameView
# reached through an unnamed expression the grep cannot type -- `views.get(0)
# .getGame()` -- is not caught, the same limit 4b states; no bridge code has a
# collection of GameViews.  No ALLOW: nothing in either tree calls either one
# today, and nothing should.
gameview_call() {  # $1 the method (getDeck | getGame), $2 why
  local m="$1" why="$2" names alt receivers hits
  names="$(grep -rhoE --include='*.java' '\bGameView[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' "${TREES[@]}" 2>/dev/null \
    | awk '{print $2}' | LC_ALL=C sort -u || true)"
  alt="$(printf '%s' "$names" | paste -sd '|' -)"
  receivers='getGameView\(\)|getView\(\)|GameView\)[^;]*'
  [ -n "$alt" ] && receivers="\\b(${alt})|${receivers}"
  hits="$(grep_java -E "(${receivers})\\.${m}\\(|\\bGameView(::|\\.)${m}\\b")"
  if [ -n "$hits" ]; then
    lint_fail "GameView.$m -- $why (receivers watched: $(printf '%s' "$names" | paste -sd ',' -), getGameView(), getView(), a cast to GameView)"
    echo "$hits" | sed 's/^/  /' >&2
  fi
}
rule GameView-getDeck gameview_call getDeck 'the full decklist of any seat.'
rule GameView-getGame gameview_call getGame 'the live Game object, i.e. everything.'

# The three fail-OPEN predicates.  canBeShownToAny(empty) is true;
# AbstractGuiGame.mayView has three fail-open branches, one of which
# (!hasLocalPlayers()) is exactly the AI-vs-AI recorder; mayLookAtAllCards is
# the dev-mode cheat.
ban canBeShownToAny 'canBeShownToAny' \
  'fail-open for an empty viewer collection (CardView.java:616-620). Use canBeShownTo(viewer).'
ban mayView 'mayView' \
  'AbstractGuiGame.mayView returns TRUE when there are no local players -- the recorder case -- and after game over in the libgdx port.'
ban mayFlip 'mayFlip' \
  'AbstractGuiGame.mayFlip is Forge''s own renderer gate; call cv.canFaceDownBeShownTo(viewer) directly.'
ban mayLookAtAllCards 'mayLookAtAllCards' \
  'the IDevModeCheats reveal-everything switch.'

# Engine strings that name cards in zones the viewer may not see.
ban targetDescription 'targetDescription(' \
  'GameEventSpellAbilityCast.targetDescription() names every target, library cards included. Emit stack[].targetCardIds instead.'
ban stackDescription 'stackDescription(' \
  'GameEventSpellResolved.stackDescription() is the same string as stack[].text reached from a second accessor -- the exact shape of the leak protocol section 10.12 records. It goes through Snap.stackText or it does not go.'
ban outcomeStrings 'outcomeStrings(' \
  'GameEventGameOutcome.outcomeStrings() is free text.'
ban matchSummary 'matchSummary(' \
  'GameEventGameOutcome.matchSummary() is free text.'

# --------------------------------------------------------------------------
# 4. getAlternateState: allowed EXACTLY ONCE, in Snap.card()'s `alt` block
#
# This one is not a ban but a budget, because the accessor is how a viewer sees
# their own morph.  One occurrence, in one file, gated on
# canFaceDownBeShownTo(viewer) -- a second occurrence anywhere is a second place
# that decides whether an identity may be shown.
# --------------------------------------------------------------------------
check_alternate_state() {
  local alt_hits alt_n=0 alt_elsewhere
  alt_hits="$(grep_java -F 'getAlternateState(')"
  [ -n "$alt_hits" ] && alt_n="$(printf '%s\n' "$alt_hits" | wc -l)"
  alt_elsewhere="$(printf '%s' "$alt_hits" | grep -v '^bridge/src/mtgtable/Snap\.java:' || true)"
  if [ -n "$alt_elsewhere" ]; then
    lint_fail "getAlternateState( outside Snap.java -- the real card behind a face-down one may only be read in Snap.card()'s alt block, gated on canFaceDownBeShownTo(viewer)."
    echo "$alt_elsewhere" | sed 's/^/  /' >&2
  elif [ "$alt_n" != "1" ]; then
    lint_fail "getAlternateState( appears $alt_n time(s) in Snap.java, expected exactly 1 (the alt block of Snap.card())."
    [ -n "$alt_hits" ] && echo "$alt_hits" | sed 's/^/  /' >&2
  fi
  return 0
}
rule getAlternateState check_alternate_state

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
# anywhere in either tree (locals, parameters, enhanced-for variables) becomes
# a receiver to watch, so a rename is caught by construction.  A
# `stack.get(0).getKey()` with no named variable does not type-check against
# this rule, so `rawYieldKey(StackItemView)` is deliberately the only accessor
# and the negative control in tools/check-redaction-selftest.mjs backstops the
# wire itself (a `yieldKey` containing a space or a `(` is a failure there).
# --------------------------------------------------------------------------
check_stack_key() {
  local si_names si_alt key_pattern key_hits key_n=0 key_elsewhere key_untagged
  si_names="$(grep -rhoE --include='*.java' 'StackItemView[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' "${TREES[@]}" 2>/dev/null \
    | awk '{print $2}' | LC_ALL=C sort -u || true)"
  if [ -n "$si_names" ]; then
    si_alt="$(printf '%s' "$si_names" | paste -sd '|' -)"
    key_pattern="\\b(${si_alt})\\.getKey\\(\\)"
  else
    key_pattern='\bsi\.getKey\(\)'
  fi
  key_hits="$(grep_java -E "$key_pattern")"
  [ -n "$key_hits" ] && key_n="$(printf '%s\n' "$key_hits" | wc -l)"
  key_elsewhere="$(printf '%s' "$key_hits" | grep -v '^bridge/src/mtgtable/WireGuiGame\.java:' || true)"
  key_untagged="$(printf '%s' "$key_hits" | grep -v 'ALLOW getKey:' || true)"
  if [ -n "$key_elsewhere" ]; then
    lint_fail "StackItemView.getKey() outside WireGuiGame.java -- a yield key is a card name, an id and its rules text (protocol amendment M36). The wire carries the opaque handle WireGuiGame mints; nothing else may read the key."
    echo "$key_elsewhere" | sed 's/^/  /' >&2
  elif [ "$key_n" != "1" ] || [ -n "$key_untagged" ]; then
    lint_fail "StackItemView.getKey() appears $key_n time(s) in WireGuiGame.java (receivers watched: $(printf '%s' "$si_names" | paste -sd ',' -)), expected exactly 1 tagged \`// ALLOW getKey:\` (the yield-handle table)."
    [ -n "$key_hits" ] && echo "$key_hits" | sed 's/^/  /' >&2
  fi
  return 0
}
rule StackItemView-getKey check_stack_key

# --------------------------------------------------------------------------
# 5. Rule 8 made mechanical: only Snap.java may name a CardView
#
# "Exactly one card-serialisation function" is a rule about code nobody has
# written yet, which is the kind of rule that quietly stops being true.  A file
# that cannot name the type cannot serialise it.  Files that legitimately need
# the type are listed here, each with the reason, and the list is meant to stay
# short: adding to it is a decision, not a formality.  Since D182 it covers
# tools/**/*.java too, with the same list (no tools/ file is on it).
# --------------------------------------------------------------------------
allow_cardview() {
  case "$1" in
    bridge/src/mtgtable/Snap.java)        return 0 ;;   # THE serialiser.  This is the point.
    # RecordMatch's SpectatorGui implements IGuiGame, whose own signatures take
    # CardView (showPromptMessage, setCard, assignCombatDamage, ...).  Every one
    # of those bodies is a logged no-op returning a documented default; none of
    # them reads a field off the card.  M2's WireGuiGame will need the same
    # exemption and the same scrutiny.
    bridge/src/mtgtable/RecordMatch.java) return 0 ;;
    # WireGuiGame is M2's IGuiGame: 37 abstract members whose own signatures take
    # CardView (showPromptMessage, setCard, setSelectables, assignCombatDamage,
    # manipulateCardList, getAbilityToPlay, ...).  It never reads a field off one:
    # a push takes getId() and nothing else (report 07 R1), and every card and
    # every option LABEL that reaches the wire goes through Snap.card / Snap.label
    # -- the same single gate the zone walk uses.
    bridge/src/mtgtable/WireGuiGame.java) return 0 ;;
    *)                                    return 1 ;;
  esac
}
check_cardview() {
  local f hits
  while IFS= read -r f; do
    allow_cardview "$f" && continue
    hits="$(grep -n -F 'CardView' "$f" 2>/dev/null | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' || true)"
    if [ -n "$hits" ]; then
      lint_fail "CardView named in $f -- only Snap.java (the one serialiser) and the IGuiGame implementations listed in tools/lint-bridge.sh may. A file that cannot name the type cannot grow a second serialiser."
      echo "$hits" | sed "s|^|  $f:|" >&2
    fi
  done < <(java_files)
  return 0
}
rule CardView check_cardview

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
# HeadlessGuiBase asserts the same thing at class-init, over the same eight
# names.  This rule is the half that assert cannot do: it catches a name that is
# never constructed in the run that happens to execute the assert (the console's
# quit watcher only exists after a `q`), and it catches an unnamed thread, whose
# name would be "Thread-0" today and whatever the JDK feels like tomorrow.
#
# The name must be on the `new Thread(` line itself, which is also why
# ConsoleTransport.quit() hands a method reference to a named quitWatch() rather
# than an inline lambda: a grep can only see one line.  And a thread may only be
# made with `new Thread(`: Java 21's builders (`Thread.ofPlatform().name(...)`,
# `Thread.ofVirtual()`) put the name on a line this rule does not read, so they
# are banned below (D181).
# --------------------------------------------------------------------------
thread_ok() {
  # $1: the name expression from a `new Thread(...)` call site.
  case "$1" in
    '"mtg-table-'*'"') return 0 ;;             # a literal, right prefix
    '"'*) return 1 ;;                          # a literal, wrong prefix
  esac
  # An identifier (possibly qualified): find its declaration and check the literal.
  # The first one, read by a sed that reads all its input -- no early-exiting
  # reader in a pipeline (D132).
  local ident="${1##*.}" decl
  decl="$(grep -rhoE --include='*.java' "String +${ident} *= *\"[^\"]*\"" "${TREES[@]}" 2>/dev/null \
    | sed -n '1p' || true)"
  [ -n "$decl" ] || return 1
  case "${decl##*= }" in
    '"mtg-table-'*) return 0 ;;
    *) return 1 ;;
  esac
}
check_thread_names() {
  local hit expr_
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    expr_="$(printf '%s' "$hit" | sed -E 's/.*new Thread\(//; s/\).*$//; s/.*, *//; s/[[:space:]]*$//')"
    if ! thread_ok "$expr_"; then
      lint_fail "unnamed or misnamed thread -- every \`new Thread(\` must pass a name on the same line, as a constant (or an \"mtg-table-...\" literal) whose value starts with \"mtg-table-\". ThreadUtil.isGameThread() is nothing but getName().startsWith(\"Game\"), so an unnamed or drifting thread of ours can be handed the view graph. Got: ${expr_:-<no name argument>}"
      echo "  $hit" >&2
    fi
  done < <(grep_java -F 'new Thread(')
  return 0
}
rule thread-name check_thread_names

ban defaultThreadFactory 'defaultThreadFactory' \
  'Executors.defaultThreadFactory() names its threads "pool-N-thread-M", which nothing in this repo asserts on. Pass a factory that names the thread from a constant (see HeadlessGuiBase).'

check_thread_builders() {
  local hits
  hits="$(grep_java -E '\bThread[[:space:]]*\.[[:space:]]*of(Platform|Virtual)[[:space:]]*\(')"
  if [ -n "$hits" ]; then
    lint_fail "Thread.ofPlatform() / Thread.ofVirtual() -- a thread builder names its thread on a line section 6 cannot read, so nothing checks that the name starts with \"mtg-table-\" rather than \"Game\". Use new Thread(runnable, A_NAME_CONSTANT)."
    echo "$hits" | sed 's/^/  /' >&2
  fi
}
rule thread-builder check_thread_builders

# --------------------------------------------------------------------------
# 7. Game-thread hops: EXACTLY the three listed, each tagged with its argument
#
# Hard rule 3.  forge.util.ThreadUtil.invokeInGameThread(Runnable) is
# Executors.newCachedThreadPool(new WorkerThreadFactory("Game")) (javap -c of
# ThreadUtil's static init), so a runnable handed to it lands on a SECOND
# `Game-n` worker while `Game-0` runs the match -- and passes every
# isGameThread() assert.  Each place the bridge does that needs a written
# exclusion argument in DECISIONS.md or docs/decisions/ (D379), because a green
# run is not one.  There are
# three; a fourth needs a fourth argument (D181):
#
#   captureOutcome    D39's rationale: it hops only at game end
#   asyncAbilityMenu  D22: the input-generation stamp, sound because it is only
#                     reached from inside a live input
#   refreshState      D39: the stamp PLUS a positive "the engine is parked"
#                     predicate, because its four acts can arrive at any time
#
# The rule counts every non-comment mention of `invokeInGameThread` in either
# tree -- the call, a lambda or method-reference argument, a method reference
# to it (`ThreadUtil::invokeInGameThread`), a static import of it, a reflective
# lookup by name -- and requires the set of (file, tagged method, decision) to
# be EXACTLY HOP_ALLOW.  Each mention must carry `// ALLOW hop: D<n> <method>`
# on its own line; <method> must be the nearest method declaration above it (so
# a tag cannot be copied onto a new hop elsewhere), and D<n> must be a heading
# in DECISIONS.md or in a docs/decisions/ file (has_decision).  A hop added,
# removed or moved fails the lint until this list, the tag and hard rule 3 say
# the same thing.
#
# It is the only way onto that pool from outside Forge: ThreadUtil's other
# executors are named "Delayed" (delay), default-named (getComputingPool,
# executeWithTimeout) or work-stealing (getServicePool, limit) -- none starts
# with "Game" -- and WorkerThreadFactory is package-private (javap), so building
# a pool of our own that carries the prefix means reflection on it or on the
# private gameThreadPool / getGameThreadPool, which game-pool-reflection bans
# outright.  FThreads.invokeInEdt* and invokeInBackgroundThread are not hops
# onto the game pool.  Forge's own code hops too (GameAction, InputPassPriority,
# InputConfirmMulligan, InputBlock, ...); that is the engine's input protocol,
# which D136 classifies act by act, and it is not ours to count.
# --------------------------------------------------------------------------
HOP_ALLOW='bridge/src/mtgtable/WireGuiGame.java captureOutcome D39
bridge/src/mtgtable/WireGuiGame.java asyncAbilityMenu D22
bridge/src/mtgtable/WireGuiGame.java refreshState D39'

# The nearest method declaration at or above line $2 of file $1: a line that
# starts with a modifier and names an identifier directly before `(`, with no
# `=` or `;` in between (so a field initialiser or a local is never taken for
# one).  A method with no modifier is never found, which fails closed: the tag
# then disagrees with whatever declaration IS found.
enclosing_method() {
  sed -nE "1,${2}{s/^[[:space:]]*(public|private|protected|static|final|synchronized|abstract|default)[[:space:]][^=;(]*[[:space:]]([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*\\(.*/\\2/p}" "$1" \
    | sed -n '$p'
}
# has_decision D<n>: D<n> is a decision heading, `## D<n> — ...`, in the frozen
# DECISIONS.md (D1-D378) or in one of docs/decisions/'s files (D379 on, one
# decision per file, the heading its first line).  tools/decisions.mjs is the
# full resolver; this is its grep, so the lint keeps needing nothing but bash.
has_decision() {
  local f
  if [ -f DECISIONS.md ] && grep -q "^## $1 " DECISIONS.md; then return 0; fi
  for f in docs/decisions/D*.md; do
    [ -f "$f" ] && head -n 1 "$f" | grep -q "^## $1 " && return 0
  done
  return 1
}
check_hops() {
  local hits hit file rest line text tag dec tagged method got="" want
  hits="$(grep_java -E '\binvokeInGameThread\b')"
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    file="${hit%%:*}"
    rest="${hit#*:}"
    line="${rest%%:*}"
    text="${rest#*:}"
    tag="$(printf '%s' "$text" | sed -nE 's|.*// ALLOW hop: (D[0-9]+) ([A-Za-z_][A-Za-z0-9_]*).*|\1 \2|p')"
    if [ -z "$tag" ]; then
      lint_fail "a game-thread hop with no \`// ALLOW hop: D<n> <method>\` tag -- ThreadUtil.invokeInGameThread runs on a SECOND Game-n thread beside Game-0 and passes every isGameThread() assert (hard rule 3). A hop needs a written exclusion argument in DECISIONS.md or docs/decisions/, a tag citing it, and a line in HOP_ALLOW."
      echo "  $hit" >&2
      continue
    fi
    dec="${tag%% *}"
    tagged="${tag#* }"
    method="$(enclosing_method "$file" "$line")"
    if [ "$method" != "$tagged" ]; then
      lint_fail "a hop tagged \`$tagged\` sits in \`${method:-<no method declaration found>}\` -- the tag names the method the hop is in, so it cannot be copied onto another hop."
      echo "  $hit" >&2
    fi
    if ! has_decision "$dec"; then
      lint_fail "a hop tag cites $dec, which is not a decision heading in DECISIONS.md or docs/decisions/ -- the tag names the decision that argues the hop is safe."
      echo "  $hit" >&2
    fi
    got="$got$file $tagged $dec"$'\n'
  done <<< "$hits"
  got="$(printf '%s' "$got" | LC_ALL=C sort)"
  want="$(printf '%s\n' "$HOP_ALLOW" | LC_ALL=C sort)"
  if [ "$got" != "$want" ]; then
    lint_fail "the game-thread hops are not HOP_ALLOW's three -- a fourth hop needs a fourth written argument (DECISIONS.md or docs/decisions/), a tag and a line in HOP_ALLOW; a hop removed or moved comes off the list (and out of hard rule 3) in the same change."
    diff <(printf '%s\n' "$want") <([ -z "$got" ] || printf '%s\n' "$got") | sed -n 's/^< /  listed, not found: /p; s/^> /  found, not listed: /p' >&2 || true
  fi
  return 0
}
rule game-thread-hop check_hops

check_game_pool_reflection() {
  local hits
  hits="$(grep_java -E '\b(WorkerThreadFactory|gameThreadPool|getGameThreadPool)\b')"
  if [ -n "$hits" ]; then
    lint_fail "ThreadUtil's Game pool reached by name -- WorkerThreadFactory is package-private and gameThreadPool / getGameThreadPool are private, so naming one is reflection onto the pool whose threads pass isGameThread(): a game-thread hop that game-thread-hop cannot count."
    echo "$hits" | sed 's/^/  /' >&2
  fi
}
rule game-pool-reflection check_game_pool_reflection

# --------------------------------------------------------------------------
# 8. A Forge field read by name (D423)
#
# A private field read through reflection is a seam javap does not list and an
# engine upgrade can move without a compile error.  The bridge has exactly one
# reader, InputPeek: InputSelectTargets keeps the targets chosen so far and the
# ability being targeted in private fields with no getter in the pinned jar
# (javap), and input.selectable.chosen / playerIds (amendments M65, M66) need
# both.  It looks each field up once and sends null when one is missing.  A
# second reader is a decision, not a formality.  (Reflection onto our OWN
# classes, as OverRaceSelfTest does with getDeclaredMethod, is not this rule.)
# --------------------------------------------------------------------------
ban_except forge-field-read 'bridge/src/mtgtable/InputPeek.java' 'getDeclaredField(' \
  'a field read by name through reflection. The one allowed reader is InputPeek (InputSelectTargets has no getter for its targets or its ability, D423); add a second only with a decision.'

[ "$LIST" = 1 ] && exit 0

if [ "$fail" -ne 0 ]; then
  echo "bridge lint FAILED" >&2
  exit 1
fi
echo "bridge lint OK ($(find bridge/src -name '*.java' | wc -l) file(s) under bridge/src, $(find tools -name '*.java' | wc -l) under tools/; $RULE_N rules)"

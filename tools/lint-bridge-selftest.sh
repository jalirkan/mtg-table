#!/usr/bin/env bash
# mtg-table — tools/lint-bridge.sh's own negative controls: every rule must FIRE.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# D180.  A lint rule that cannot fire looks exactly like a lint rule nobody has
# broken: both print `bridge lint OK`.  Two of them were dead from the first
# commit (2026-09-11) to 2026-09-28 -- `GameView.getDeck` and
# `GameView.getGame` searched for the literal class-qualified text, and real
# code writes `gameView.getDeck(p)`
# (docs/evidence/guards.md section 1).  So this script proves, on every build,
# that each rule catches the code it exists for:
#
#   1. It reads the rule list FROM THE LINT (`--list-rules`), and checks it
#      against the lint's own source: every `ban` / `ban_except` / `rule` line
#      is listed, every id is unique, `LINT FAIL` is printed only by
#      `lint_fail` and `fail=1` is set only there -- so a check cannot fail the
#      lint without being a registered rule with an id.
#   2. Every rule id has at least one case below and every case names a rule:
#      a rule added to the lint without a case here FAILS this script.
#   3. The real tree passes, and so does a pristine scratch copy of it (the
#      copy is faithful, so a case's failure is the case's).
#   4. Each case copies bridge/src, tools/**/*.java, DECISIONS.md and
#      docs/decisions/ into a
#      scratch tree under var/lint-selftest/, plants a minimal Java snippet (a
#      new file, or a line injected into / edited in a real one), runs
#      `tools/lint-bridge.sh --root <scratch>`, and requires exit 1 with THAT
#      rule's id -- and no other id -- in the `LINT FAIL [<id>]` lines.
#   5. A few PASS cases hold the other direction: the shapes a rule must not
#      catch (HostedMatch.getGame(), a Map.Entry's getKey(), a banned name in a
#      comment, a correctly named thread) leave the lint green.
#
# The snippets need not compile: the lint reads text.  Each is the text real
# code would contain -- tools/lint-bridge.sh's own header and
# docs/evidence/guards.md show the GameView one compiled against the pinned jar.
#
# Usage:  ./tools/lint-bridge-selftest.sh           # from anywhere; writes only under var/lint-selftest/
#         ./tools/lint-bridge-selftest.sh --quiet   # only failures and the summary (bridge/build.sh)
#         LINT_SELFTEST_JOBS=1 ./tools/lint-bridge-selftest.sh   # one case at a time
# Exit:   0 every rule fired on every case and every PASS case passed; 1 otherwise.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
LINT="$REPO_ROOT/tools/lint-bridge.sh"
QUIET=0
case "${1:-}" in
  "") ;;
  --quiet | -q) QUIET=1 ;;
  *) echo "usage: tools/lint-bridge-selftest.sh [--quiet]" >&2; exit 2 ;;
esac

mkdir -p var/lint-selftest
BASE="$(mktemp -d "$REPO_ROOT/var/lint-selftest/run.XXXXXX")"
PRISTINE="$BASE/pristine"
W="$BASE/work"
keep=0
cleanup() { [ "$keep" = 1 ] || rm -rf "$BASE"; }
trap cleanup EXIT

checks=0
failed=0
ok() { checks=$((checks + 1)); [ "$QUIET" = 1 ] || printf '  ok    %s\n' "$*"; }
bad() { checks=$((checks + 1)); failed=$((failed + 1)); keep=1; printf '  FAIL  %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. The rule list, from the lint itself.
# ---------------------------------------------------------------------------
[ "$QUIET" = 1 ] || echo "lint-bridge-selftest: the rules"
mapfile -t RULES < <(bash "$LINT" --list-rules)
[ "${#RULES[@]}" -gt 0 ] || { echo "lint-bridge-selftest: --list-rules printed nothing" >&2; exit 1; }
# The same ids read statically off the source: a rule declared somewhere
# --list-rules cannot see (behind a condition, say) would differ here.
mapfile -t STATIC < <(sed -nE 's/^[[:space:]]*(ban|ban_except|rule)[[:space:]]+([A-Za-z0-9_.-]+)([[:space:]].*)?$/\2/p' "$LINT")
if [ "${RULES[*]}" = "${STATIC[*]}" ]; then
  ok "--list-rules names the ${#RULES[@]} rules the source declares, in order"
else
  bad "--list-rules (${RULES[*]}) differs from the source's ban/ban_except/rule lines (${STATIC[*]})"
fi
dups="$(printf '%s\n' "${RULES[@]}" | LC_ALL=C sort | uniq -d | paste -sd' ' -)"
if [ -z "$dups" ]; then ok "every rule id is unique"; else bad "duplicate rule ids: $dups"; fi
# Non-comment lines only: the header and this file's prose may name both.
code_lines() { grep -nE "$1" "$LINT" | grep -vE '^[0-9]+:[[:space:]]*#' || true; }
lf="$(code_lines 'LINT FAIL')"
if [ "$(printf '%s\n' "$lf" | grep -c . || true)" = "1" ] && [[ "$lf" == *'echo "LINT FAIL [${CURRENT_RULE'* ]]; then
  ok "LINT FAIL is printed in one place, lint_fail(), tagged with the running rule's id"
else
  bad "LINT FAIL is printed outside lint_fail(): $lf"
fi
f1="$(code_lines 'fail=1')"
if [ "$(printf '%s\n' "$f1" | grep -c . || true)" = "1" ]; then
  ok "fail=1 is set in one place (lint_fail): a check cannot fail the lint without an id"
else
  bad "fail=1 is set outside lint_fail(): $f1"
fi

# ---------------------------------------------------------------------------
# The scratch trees.
# ---------------------------------------------------------------------------
mkdir -p "$PRISTINE/bridge" "$PRISTINE/tools"
cp -a bridge/src "$PRISTINE/bridge/src"
while IFS= read -r f; do
  mkdir -p "$PRISTINE/$(dirname "$f")"
  cp -a "$f" "$PRISTINE/$f"
done < <(find tools -name '*.java' -type f)
cp -a DECISIONS.md "$PRISTINE/DECISIONS.md"
# D379: decisions from D379 on are files of their own; a hop tag resolves in either.
if [ -d docs/decisions ]; then mkdir -p "$PRISTINE/docs"; cp -a docs/decisions "$PRISTINE/docs/decisions"; fi

fresh() { rm -rf "$W"; cp -a "$PRISTINE" "$W"; }

# probe <repo-relative path>: a NEW .java file, stdin the class body.
probe() {
  local path="$1" cls pkg
  cls="$(basename "$path" .java)"
  case "$path" in
    bridge/src/mtgtable/*) pkg=mtgtable ;;
    *) pkg=mtgtable.probe ;;
  esac
  mkdir -p "$W/$(dirname "$path")"
  { printf 'package %s;\n\nfinal class %s {\n' "$pkg" "$cls"; cat; printf '}\n'; } > "$W/$path"
}
# whole <repo-relative path>: a NEW file, stdin all of it (for imports).
whole() { mkdir -p "$W/$(dirname "$1")"; cat > "$W/$1"; }
# inject <repo-relative path>: stdin inserted before the file's final `}`.
inject() {
  local snippet
  snippet="$(cat)"
  SNIPPET="$snippet" perl -0pi -e 's/\}\s*\z/$ENV{SNIPPET}\n}\n/' "$W/$1"
}
# edit <repo-relative path> <perl substitution>: change a real file; the
# substitution must match, or the case is void.
edit() {
  local before
  before="$(sha256sum < "$W/$1")"
  perl -0pi -e "$2" "$W/$1"
  [ "$(sha256sum < "$W/$1")" != "$before" ] || { echo "    (the edit '$2' did not match $1)"; return 1; }
}

CASE_IDS=()
lint_scratch() { bash "$LINT" --root "$W" 2>&1; }
fired_ids() { sed -nE 's/^LINT FAIL \[([^]]+)\]:.*/\1/p' | LC_ALL=C sort -u | paste -sd' ' -; }

# The cases run CONCURRENTLY, each in a scratch tree of its own
# ($BASE/work-<n>), LINT_SELFTEST_JOBS at a time (default nproc/2, 1..8); each
# writes its lines to $BASE/results/<n>, and the results are printed and counted
# in case order at the end, so the output reads the same at any concurrency.
JOBS="${LINT_SELFTEST_JOBS:-$(( $(nproc 2>/dev/null || echo 2) / 2 ))}"
case "$JOBS" in '' | *[!0-9]*) JOBS=1 ;; esac
[ "$JOBS" -ge 1 ] || JOBS=1
[ "$JOBS" -le 8 ] || JOBS=8
mkdir -p "$BASE/results"
SEQ=0
# spawn <command...>: run it in the background, its output to the next results file.
spawn() {
  SEQ=$((SEQ + 1))
  SLOT="$(printf '%03d' "$SEQ")"
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n || true; done
  ( W="$BASE/work-$SLOT"; QUIET=0; "$@" ) > "$BASE/results/$SLOT" 2>&1 &
}
# section <title>: a heading, in order with the results.
section() {
  SEQ=$((SEQ + 1))
  printf '%s\n' "$1" > "$BASE/results/$(printf '%03d' "$SEQ")"
}

# fires <rule id> <what the case plants> <setup function>
fires() {
  CASE_IDS+=("$1")
  spawn fires_body "$@"
}
fires_body() {
  local id="$1" label="$2" setup="$3" out rc=0 fired
  fresh
  if ! "$setup"; then bad "$id: $label -- the case's setup did not apply"; return 0; fi
  out="$(lint_scratch)" || rc=$?
  fired="$(printf '%s\n' "$out" | fired_ids)"
  if [ "$rc" = "1" ] && [ "$fired" = "$id" ]; then
    ok "$id: $label"
    rm -rf "$W"
  else
    bad "$id: $label -- exit $rc, fired [${fired}], want exactly [$id]"
    printf '%s\n' "$out" | sed 's/^/        | /'
  fi
}
# passes <what the case plants> <setup function>: the lint must stay green.
passes() {
  spawn passes_body "$@"
}
passes_body() {
  local label="$1" setup="$2" out rc=0
  fresh
  if ! "$setup"; then bad "PASS: $label -- the case's setup did not apply"; return 0; fi
  out="$(lint_scratch)" || rc=$?
  if [ "$rc" = "0" ]; then
    ok "PASS: $label"
    rm -rf "$W"
  else
    bad "PASS: $label -- the lint failed (exit $rc) on code it must allow"
    printf '%s\n' "$out" | sed 's/^/        | /'
  fi
}

# ---------------------------------------------------------------------------
# 3. The real tree and a pristine copy both pass.
# ---------------------------------------------------------------------------
section "lint-bridge-selftest: the real tree"
real_tree_body() {
  local out rc=0
  out="$(bash "$LINT" 2>&1)" || rc=$?
  if [ "$rc" = 0 ]; then
    ok "the checkout passes: ${out##*$'\n'}"
  else
    bad "the checkout FAILS the lint (exit $rc)"
    printf '%s\n' "$out" | sed 's/^/        | /'
  fi
}
spawn real_tree_body
nothing() { :; }
passes "a pristine scratch copy of bridge/src, tools/**/*.java, DECISIONS.md and docs/decisions/" nothing

# ---------------------------------------------------------------------------
# 4. Every rule fires.  One function per case; the id is the rule's.
# ---------------------------------------------------------------------------
section "lint-bridge-selftest: every rule fires"

# -- 1. data loss / the preferences file
c_getDecks() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object decks() {
        return forge.model.FModel.getDecks().getConstructed();
    }
JAVA
}
fires getDecks 'FModel.getDecks() in a bridge file' c_getDecks

c_ai_tools() { probe tools/probe/LintProbe.java <<'JAVA'
    static Object seat() {
        return forge.player.GamePlayerUtil.createAiPlayer("Probe", 0);
    }
JAVA
}
fires createAiPlayer 'the two-argument GamePlayerUtil.createAiPlayer in tools/ (what AuditDeck.java did)' c_ai_tools
c_ai_bridge() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object seat() {
        return forge.player.GamePlayerUtil.createAiPlayer("Probe", 0);
    }
JAVA
}
fires createAiPlayer 'GamePlayerUtil.createAiPlayer in a bridge file other than Bootstrap.java' c_ai_bridge
c_ai_static() { whole tools/probe/LintProbe.java <<'JAVA'
package mtgtable.probe;

import static forge.player.GamePlayerUtil.createAiPlayer;

final class LintProbe {
    static Object seat() {
        return createAiPlayer("Probe", 0);
    }
}
JAVA
}
fires createAiPlayer 'a static import of GamePlayerUtil.createAiPlayer, then a bare call' c_ai_static
c_ai_basename() { probe tools/probe/Bootstrap.java <<'JAVA'
    static Object seat() {
        return forge.player.GamePlayerUtil.createAiPlayer("Probe", 0);
    }
JAVA
}
fires createAiPlayer 'the call in tools/probe/Bootstrap.java: the ALLOW is a path, not a file name' c_ai_basename

c_ai_ref() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static final java.util.function.BiFunction<String, Integer, forge.LobbyPlayer> SEAT =
            forge.player.GamePlayerUtil::createAiPlayer;
JAVA
}
fires createAiPlayer-ref 'GamePlayerUtil::createAiPlayer as a method reference' c_ai_ref

c_ai_wild() { whole bridge/src/mtgtable/LintProbe.java <<'JAVA'
package mtgtable;

import static forge.player.GamePlayerUtil.*;

final class LintProbe {
    private LintProbe() { }
}
JAVA
}
fires GamePlayerUtil-wildcard 'import static forge.player.GamePlayerUtil.*;' c_ai_wild

# -- 2. absent from the 2.0.14 jar
c_nogui() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static void quiet(final forge.game.Game game) {
        game.setNoGUIUser();
    }
JAVA
}
fires setNoGUIUser 'Game.setNoGUIUser()' c_nogui
c_gson() { whole tools/probe/LintProbe.java <<'JAVA'
package mtgtable.probe;

import com.google.gson.Gson;

final class LintProbe {
    static String json(final Object o) {
        return new Gson().toJson(o);
    }
}
JAVA
}
fires gson 'import com.google.gson.Gson in tools/' c_gson

# -- 3. the identity accessors, planted in Snap.java: the one file that may
#       name a CardView, i.e. where a second identity read would really land.
c_backup() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static Object lintProbeBackup(final CardView cv) {
        return cv.getBackup();
    }
JAVA
}
fires getBackup 'cv.getBackup() in Snap.java' c_backup
c_left() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static Object lintProbeLeft(final CardView cv) {
        return cv.getLeftSplitState();
    }
JAVA
}
fires getLeftSplitState 'cv.getLeftSplitState() in Snap.java' c_left
c_right() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static Object lintProbeRight(final CardView cv) {
        return cv.getRightSplitState();
    }
JAVA
}
fires getRightSplitState 'cv.getRightSplitState() in Snap.java' c_right
c_oracle() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static String lintProbeOracle(final CardView.CardStateView st) {
        return st.getOracleName();
    }
JAVA
}
fires getOracleName 'state.getOracleName() in Snap.java' c_oracle
c_cloner() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static String lintProbeCloner(final CardView cv) {
        return cv.getCloner();
    }
JAVA
}
fires getCloner 'cv.getCloner() in Snap.java' c_cloner
c_merged() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static String lintProbeMerged(final CardView cv) {
        return cv.getMergedCards();
    }
JAVA
}
fires getMergedCards 'cv.getMergedCards() in Snap.java' c_merged

c_gamelog() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object log(final forge.game.Game game) {
        return game.getGameLog().getLogEntries(null);
    }
JAVA
}
fires getGameLog 'game.getGameLog() in a bridge file other than Smoke.java' c_gamelog
c_gamelog_basename() { probe tools/probe/Smoke.java <<'JAVA'
    static Object log(final forge.game.Game game) {
        return game.getGameLog();
    }
JAVA
}
fires getGameLog 'getGameLog() in tools/probe/Smoke.java: the ALLOW is a path, not a file name' c_gamelog_basename

# GameView.getDeck / getGame: the calls the two DEAD rules let through.
c_deck_field() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static forge.deck.Deck deckOf(final forge.game.GameView gameView, final forge.game.player.PlayerView p) {
        return gameView.getDeck(p);
    }
JAVA
}
fires GameView-getDeck 'gameView.getDeck(p) -- the finding, verbatim' c_deck_field
c_deck_renamed() { probe tools/probe/LintProbe.java <<'JAVA'
    static forge.deck.Deck deckOf(final forge.game.GameView v, final forge.game.player.PlayerView p) {
        return v.getDeck(p);
    }
JAVA
}
fires GameView-getDeck 'v.getDeck(p) on a parameter declared GameView v, in tools/' c_deck_renamed
c_deck_view() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static forge.deck.Deck deckOf(final forge.game.Game game, final forge.game.player.PlayerView p) {
        return game.getView().getDeck(p);
    }
JAVA
}
fires GameView-getDeck 'game.getView().getDeck(p): no GameView variable at all' c_deck_view
c_deck_cast() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static forge.deck.Deck deckOf(final Object o, final forge.game.player.PlayerView p) {
        return ((forge.game.GameView) o).getDeck(p);
    }
JAVA
}
fires GameView-getDeck '((GameView) o).getDeck(p)' c_deck_cast
c_deck_ref() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static final java.util.function.BiFunction<forge.game.GameView, forge.game.player.PlayerView, forge.deck.Deck> DECK =
            forge.game.GameView::getDeck;
JAVA
}
fires GameView-getDeck 'GameView::getDeck as a method reference' c_deck_ref

c_game_local() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static forge.game.Game gameOf(final forge.game.Game live) {
        final forge.game.GameView view = live.getView();
        return view.getGame();
    }
JAVA
}
fires GameView-getGame 'view.getGame() on a local declared GameView view' c_game_local
c_game_existing() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private forge.game.Game lintProbeGame() {
        return gameView.getGame();
    }
JAVA
}
fires GameView-getGame "WireGuiGame's own gameView field: gameView.getGame()" c_game_existing
c_game_getter() { probe tools/probe/LintProbe.java <<'JAVA'
    static forge.game.Game gameOf(final forge.gamemodes.match.HostedMatch hosted) {
        return hosted.getGameView().getGame();
    }
JAVA
}
fires GameView-getGame 'hosted.getGameView().getGame()' c_game_getter

c_any() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static boolean lintProbeAny(final CardView cv) {
        return cv.canBeShownToAny(java.util.Collections.emptyList());
    }
JAVA
}
fires canBeShownToAny 'cv.canBeShownToAny(...) in Snap.java' c_any
c_mayview() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private boolean lintProbeMayView(final CardView cv) {
        return mayView(cv);
    }
JAVA
}
fires mayView "AbstractGuiGame.mayView(cv) in WireGuiGame" c_mayview
c_mayflip() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private boolean lintProbeMayFlip(final CardView cv) {
        return mayFlip(cv);
    }
JAVA
}
fires mayFlip "AbstractGuiGame.mayFlip(cv) in WireGuiGame" c_mayflip
c_maylook() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static boolean cheat(final forge.gui.interfaces.IGuiGame gui) {
        return gui.mayLookAtAllCards();
    }
JAVA
}
fires mayLookAtAllCards 'mayLookAtAllCards()' c_maylook
c_target() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static String targets(final forge.game.event.GameEventSpellAbilityCast e) {
        return e.targetDescription();
    }
JAVA
}
fires targetDescription 'GameEventSpellAbilityCast.targetDescription()' c_target
c_stackdesc() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static String resolved(final forge.game.event.GameEventSpellResolved e) {
        return e.stackDescription();
    }
JAVA
}
fires stackDescription 'GameEventSpellResolved.stackDescription()' c_stackdesc
c_outcome() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object said(final forge.game.event.GameEventGameOutcome e) {
        return e.outcomeStrings();
    }
JAVA
}
fires outcomeStrings 'GameEventGameOutcome.outcomeStrings()' c_outcome
c_summary() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object said(final forge.game.event.GameEventGameOutcome e) {
        return e.matchSummary();
    }
JAVA
}
fires matchSummary 'GameEventGameOutcome.matchSummary()' c_summary

# -- 4. getAlternateState: a budget of one, in Snap.java
c_alt_second() { inject bridge/src/mtgtable/Snap.java <<'JAVA'
    static Object lintProbeAlt(final CardView cv) {
        return cv.getAlternateState();
    }
JAVA
}
fires getAlternateState 'a SECOND getAlternateState() in Snap.java' c_alt_second
c_alt_elsewhere() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private Object lintProbeAlt(final CardView cv) {
        return cv.getAlternateState();
    }
JAVA
}
fires getAlternateState 'getAlternateState() in WireGuiGame.java' c_alt_elsewhere
c_alt_gone() { edit bridge/src/mtgtable/Snap.java 's/cv\.getAlternateState\(\)/cv.getState(forge.card.CardStateName.Original)/'; }
fires getAlternateState 'the ONE getAlternateState() taken out of Snap.java (the budget is exactly 1)' c_alt_gone

# -- 4b. StackItemView.getKey(): a budget of one, tagged, in WireGuiGame.java
c_key_second() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private String lintProbeKey(final StackItemView top) {
        return top.getKey();   // ALLOW getKey: a second reader
    }
JAVA
}
fires StackItemView-getKey 'a second, TAGGED StackItemView.getKey() in WireGuiGame.java' c_key_second
c_key_elsewhere() { probe tools/probe/LintProbe.java <<'JAVA'
    static String keyOf(final forge.game.spellability.StackItemView item) {
        return item.getKey();
    }
JAVA
}
fires StackItemView-getKey 'item.getKey() on a StackItemView in tools/' c_key_elsewhere
c_key_untagged() { edit bridge/src/mtgtable/WireGuiGame.java 's|   // ALLOW getKey: the yield-handle table||'; }
fires StackItemView-getKey "the real call's // ALLOW getKey: tag taken off" c_key_untagged

# -- 5. CardView: only the three listed files may name it
c_cv_bridge() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static int idOf(final forge.game.card.CardView cv) {
        return cv.getId();
    }
JAVA
}
fires CardView 'a new bridge file that names CardView' c_cv_bridge
c_cv_tools() { probe tools/probe/LintProbe.java <<'JAVA'
    static int idOf(final forge.game.card.CardView cv) {
        return cv.getId();
    }
JAVA
}
fires CardView 'a tools/ file that names CardView' c_cv_tools
c_cv_basename() { probe tools/probe/Snap.java <<'JAVA'
    static int idOf(final forge.game.card.CardView cv) {
        return cv.getId();
    }
JAVA
}
fires CardView 'tools/probe/Snap.java: the ALLOW is a path, not a file name' c_cv_basename

# -- 6. thread names
c_thread_unnamed() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return new Thread(r);
    }
JAVA
}
fires thread-name 'new Thread(r) with no name' c_thread_unnamed
c_thread_game() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return new Thread(r, "GameLog-appender");
    }
JAVA
}
fires thread-name 'new Thread(r, "GameLog-appender"): the Game prefix' c_thread_game
c_thread_const() { probe tools/probe/LintProbe.java <<'JAVA'
    static final String PROBE_THREAD_NAME = "Game-probe";

    static Thread start(final Runnable r) {
        return new Thread(r, PROBE_THREAD_NAME);
    }
JAVA
}
fires thread-name 'a constant whose value is "Game-probe", in tools/' c_thread_const
c_thread_undeclared() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return new Thread(r, NO_SUCH_NAME);
    }
JAVA
}
fires thread-name 'new Thread(r, NO_SUCH_NAME): a name the lint cannot resolve' c_thread_undeclared
c_factory() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static final java.util.concurrent.ExecutorService POOL =
            java.util.concurrent.Executors.newSingleThreadExecutor(java.util.concurrent.Executors.defaultThreadFactory());
JAVA
}
fires defaultThreadFactory 'Executors.defaultThreadFactory()' c_factory
c_builder_platform() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return Thread.ofPlatform().name("Game-7").start(r);
    }
JAVA
}
fires thread-builder 'Thread.ofPlatform().name("Game-7")' c_builder_platform
c_builder_virtual() { probe tools/probe/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return Thread.ofVirtual().start(r);
    }
JAVA
}
fires thread-builder 'Thread.ofVirtual() in tools/' c_builder_virtual

# -- 7. game-thread hops: exactly the three listed, each tagged
c_hop_fourth_tagged() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private void lintProbeHop() {
        ThreadUtil.invokeInGameThread(() -> { });  // ALLOW hop: D39 lintProbeHop
    }
JAVA
}
fires game-thread-hop 'a FOURTH hop, tagged with a real decision and its own method (not on HOP_ALLOW)' c_hop_fourth_tagged
c_hop_fourth_untagged() { inject bridge/src/mtgtable/WireGuiGame.java <<'JAVA'
    private void lintProbeHop() {
        ThreadUtil.invokeInGameThread(this::refreshState);
    }
JAVA
}
fires game-thread-hop 'a fourth hop with no tag' c_hop_fourth_untagged
c_hop_tools() { probe tools/probe/LintProbe.java <<'JAVA'
    static void later(final Runnable r) {
        forge.util.ThreadUtil.invokeInGameThread(r);
    }
JAVA
}
fires game-thread-hop 'a hop in tools/' c_hop_tools
c_hop_ref() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static final java.util.function.Consumer<Runnable> HOP = forge.util.ThreadUtil::invokeInGameThread;
JAVA
}
fires game-thread-hop 'ThreadUtil::invokeInGameThread as a method reference' c_hop_ref
c_hop_static() { whole bridge/src/mtgtable/LintProbe.java <<'JAVA'
package mtgtable;

import static forge.util.ThreadUtil.invokeInGameThread;

final class LintProbe {
    static void later(final Runnable r) {
        invokeInGameThread(r);
    }
}
JAVA
}
fires game-thread-hop 'a static import of invokeInGameThread, then a bare call' c_hop_static
c_hop_reflect() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object hop() throws ReflectiveOperationException {
        return forge.util.ThreadUtil.class.getMethod("invokeInGameThread", Runnable.class);
    }
JAVA
}
fires game-thread-hop 'the hop looked up by name through reflection' c_hop_reflect
c_hop_gone() { edit bridge/src/mtgtable/WireGuiGame.java 's|ThreadUtil\.invokeInGameThread\(this::captureOutcome\);  // ALLOW hop: D39 captureOutcome[^\n]*|captureOutcomeLater();|'; }
fires game-thread-hop "captureOutcome's hop removed: two found, three listed" c_hop_gone
c_hop_wrong_method() { edit bridge/src/mtgtable/WireGuiGame.java 's|// ALLOW hop: D39 captureOutcome|// ALLOW hop: D39 refreshState|'; }
fires game-thread-hop "captureOutcome's tag naming refreshState: a tag copied onto another hop" c_hop_wrong_method
c_hop_no_decision() { edit bridge/src/mtgtable/WireGuiGame.java 's|// ALLOW hop: D22 asyncAbilityMenu|// ALLOW hop: D9999 asyncAbilityMenu|'; }
fires game-thread-hop 'a tag citing D9999, which DECISIONS.md does not have' c_hop_no_decision
# D379: a docs/decisions/ file counts only when its FIRST line is that heading.
c_hop_file_wrong_heading() {
  edit bridge/src/mtgtable/WireGuiGame.java 's|// ALLOW hop: D22 asyncAbilityMenu|// ALLOW hop: D9999 asyncAbilityMenu|' || return 1
  mkdir -p "$W/docs/decisions"
  printf '## D9998 — a probe whose heading is not D9999\n\n**2026-10-04**\n' > "$W/docs/decisions/D9999-probe.md"
}
fires game-thread-hop 'a tag citing D9999, whose docs/decisions/D9999-*.md file is headed D9998' c_hop_file_wrong_heading

c_pool_field() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object pool() throws ReflectiveOperationException {
        final java.lang.reflect.Method m = forge.util.ThreadUtil.class.getDeclaredMethod("getGameThreadPool");
        m.setAccessible(true);
        return m.invoke(null);
    }
JAVA
}
fires game-pool-reflection 'ThreadUtil.getGameThreadPool reached through reflection' c_pool_field
c_pool_factory() { probe tools/probe/LintProbe.java <<'JAVA'
    static Object factory() throws ReflectiveOperationException {
        return Class.forName("forge.util.ThreadUtil$WorkerThreadFactory");
    }
JAVA
}
fires game-pool-reflection 'ThreadUtil$WorkerThreadFactory by name, in tools/' c_pool_factory

# -- 8. a Forge field read by name: InputPeek alone (D423)
c_field_read() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Object sa(final Object input) throws ReflectiveOperationException {
        final java.lang.reflect.Field f = forge.gamemodes.match.input.InputSelectTargets.class.getDeclaredField("sa");
        f.setAccessible(true);
        return f.get(input);
    }
JAVA
}
fires forge-field-read 'InputSelectTargets.sa read by name in a file other than InputPeek.java' c_field_read
c_field_read_tools() { probe tools/probe/InputPeek.java <<'JAVA'
    static Object targets(final Object input) throws ReflectiveOperationException {
        return input.getClass().getDeclaredField("targets").get(input);
    }
JAVA
}
fires forge-field-read 'getDeclaredField in tools/probe/InputPeek.java: the ALLOW is a path, not a file name' c_field_read_tools
c_field_write_elsewhere() { probe bridge/src/mtgtable/ai/LintProbe.java <<'JAVA'
    static java.lang.reflect.Field paper() throws ReflectiveOperationException {
        return forge.game.card.Card.class.getDeclaredField("paperCard");   // ALLOW paperCard write: D497
    }
JAVA
}
fires forge-field-read "Card.paperCard by name, TAGGED, in a file other than LenientGameCopier.java (the tag exempts nothing)" c_field_write_elsewhere
c_field_write_tools() { probe tools/probe/LenientGameCopier.java <<'JAVA'
    static java.lang.reflect.Field paper() throws ReflectiveOperationException {
        return forge.game.card.Card.class.getDeclaredField("paperCard");   // ALLOW paperCard write: D497
    }
JAVA
}
fires forge-field-read 'getDeclaredField in tools/probe/LenientGameCopier.java: the ALLOW is a path, not a file name' c_field_write_tools
c_field_all() { probe bridge/src/mtgtable/ai/LintProbe.java <<'JAVA'
    static java.lang.reflect.Field paper() {
        for (final java.lang.reflect.Field f : forge.game.card.Card.class.getDeclaredFields()) {
            if (f.getName().equals("paperCard")) {
                return f;
            }
        }
        return null;
    }
JAVA
}
fires forge-field-read 'Card.paperCard found among getDeclaredFields() (round the lookup by name)' c_field_all
c_field_lookup() { probe tools/probe/FieldProbe.java <<'JAVA'
    static Object paper() throws ReflectiveOperationException {
        return java.lang.invoke.MethodHandles.privateLookupIn(forge.game.card.Card.class,
                java.lang.invoke.MethodHandles.lookup());
    }
JAVA
}
fires forge-field-read 'a MethodHandles.privateLookupIn onto Card, in tools/ (round the lookup by name)' c_field_lookup

# -- 8b. the one Forge field written by name: Card.paperCard, a budget of one, in LenientGameCopier (D497)
c_field_write_second() { inject bridge/src/mtgtable/ai/LenientGameCopier.java <<'JAVA'
    static Field secondPaper() throws ReflectiveOperationException {
        return Card.class.getDeclaredField("paperCard");   // ALLOW paperCard write: D497
    }
JAVA
}
fires forge-field-write 'a SECOND tagged getDeclaredField("paperCard") in LenientGameCopier.java' c_field_write_second
c_field_write_same_line() { edit bridge/src/mtgtable/ai/LenientGameCopier.java 's/(Card\.class\.getDeclaredField\("paperCard"\);)/$1 Card.class.getDeclaredField("owner");/'; }
fires forge-field-write 'a second getDeclaredField( on the tagged line itself (occurrences, not lines)' c_field_write_same_line
c_field_write_other() { edit bridge/src/mtgtable/ai/LenientGameCopier.java 's/getDeclaredField\("paperCard"\)/getDeclaredField("owner")/'; }
fires forge-field-write 'the tagged line names another Card field (owner) instead of paperCard' c_field_write_other
c_field_write_untagged() { edit bridge/src/mtgtable/ai/LenientGameCopier.java 's|   // ALLOW paperCard write: D497||'; }
fires forge-field-write "the real write's // ALLOW paperCard write: tag taken off" c_field_write_untagged
c_field_write_gone() { edit bridge/src/mtgtable/ai/LenientGameCopier.java 's/Card\.class\.getDeclaredField\("paperCard"\);/(Field) null;/'; }
fires forge-field-write 'the ONE getDeclaredField("paperCard") taken out of LenientGameCopier.java (the budget is exactly 1)' c_field_write_gone

# ---------------------------------------------------------------------------
# 5. What the rules must NOT catch.
# ---------------------------------------------------------------------------
section "lint-bridge-selftest: what no rule may catch"
p_hosted() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static int turn(final forge.gamemodes.match.HostedMatch hosted) {
        return hosted.getGame().getPhaseHandler().getTurn();
    }
JAVA
}
passes 'hosted.getGame() on a HostedMatch (not a GameView)' p_hosted
# D379: a D<n> that lives only in docs/decisions/ resolves.  D22's heading is
# taken out of the scratch DECISIONS.md and written as a file of its own.
p_hop_decision_file() {
  edit DECISIONS.md 's|^## D22 — |## (moved) D22 — |m' || return 1
  if grep -q '^## D22 ' "$W/DECISIONS.md"; then return 1; fi
  mkdir -p "$W/docs/decisions"
  printf '## D22 — a probe: the hop argument as a file of its own\n\n**2026-10-04**\n' > "$W/docs/decisions/D022-probe.md"
}
passes 'a hop tag citing D22 when D22 lives only in docs/decisions/' p_hop_decision_file
p_entry() { probe tools/probe/LintProbe.java <<'JAVA'
    static String first(final java.util.Map<String, Integer> m) {
        for (final java.util.Map.Entry<String, Integer> e : m.entrySet()) {
            return e.getKey();
        }
        return null;
    }
JAVA
}
passes "a Map.Entry's getKey()" p_entry
p_comment() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    // Never gameView.getDeck(p), cv.getBackup(), FModel.getDecks() or
    // ThreadUtil.invokeInGameThread(r) here -- see tools/lint-bridge.sh.
    /* Nor new Thread(r) or Thread.ofVirtual(). */
    private LintProbe() { }
JAVA
}
passes 'the banned calls named in comments' p_comment
p_thread_ok() { probe bridge/src/mtgtable/LintProbe.java <<'JAVA'
    static Thread start(final Runnable r) {
        return new Thread(r, HeadlessGuiBase.EDT_NAME);
    }
JAVA
}
passes 'new Thread(r, HeadlessGuiBase.EDT_NAME): a constant with the mtg-table- prefix' p_thread_ok
p_bootstrap_seat() { probe tools/probe/LintProbe.java <<'JAVA'
    static Object seat() {
        return mtgtable.Bootstrap.createAiPlayer("Probe", 0, mtgtable.Bootstrap.DEFAULT_AI_PROFILE);
    }
JAVA
}
passes 'Bootstrap.createAiPlayer(name, avatar, profile) in tools/ (the fix AuditDeck.java took)' p_bootstrap_seat

# Every case has run: print the results in case order, and count them.
wait
for r in "$BASE"/results/*; do
  if [ "$QUIET" = 0 ] || grep -q '^  FAIL ' "$r"; then cat "$r"; fi
  checks=$(( checks + $(grep -cE '^  (ok|FAIL) ' "$r" || true) ))
  failed=$(( failed + $(grep -c '^  FAIL ' "$r" || true) ))
done
[ "$failed" -eq 0 ] || keep=1

# ---------------------------------------------------------------------------
# 2. Every rule has a case, and every case names a rule.
# ---------------------------------------------------------------------------
[ "$QUIET" = 1 ] || echo "lint-bridge-selftest: coverage"
declare -A HAVE=()
for id in "${CASE_IDS[@]}"; do HAVE[$id]=$(( ${HAVE[$id]:-0} + 1 )); done
missing=""
for id in "${RULES[@]}"; do [ -n "${HAVE[$id]:-}" ] || missing="$missing $id"; done
if [ -z "$missing" ]; then
  ok "every one of the ${#RULES[@]} rules has a case here (${#CASE_IDS[@]} cases)"
else
  bad "rule(s) with NO case in tools/lint-bridge-selftest.sh:$missing -- a rule that has never been seen to fire may be dead; add a case"
fi
declare -A KNOWN=()
for id in "${RULES[@]}"; do KNOWN[$id]=1; done
stale=""
for id in "${!HAVE[@]}"; do [ -n "${KNOWN[$id]:-}" ] || stale="$stale $id"; done
if [ -z "$stale" ]; then ok "every case names a rule the lint has"; else bad "case(s) for rule id(s) the lint does not have:$stale"; fi

if [ "$failed" -ne 0 ]; then
  echo "lint-bridge-selftest FAILED: $failed of $checks check(s) (scratch trees kept under ${BASE#"$REPO_ROOT"/})" >&2
  exit 1
fi
echo "lint-bridge-selftest OK: ${#RULES[@]} rules, ${#CASE_IDS[@]} firing cases (each fired its own rule and no other), $checks checks"

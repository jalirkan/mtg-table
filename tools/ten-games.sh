#!/usr/bin/env bash
# mtg-table — tools/ten-games.sh: M5's exit criterion, run.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# PLAN.md M5: "**Ten consecutive games with zero `UNIMPL` lines** and no state
# where the board is stuck waiting on something the browser cannot express."
#
# This is that sentence as a command.  Ten `--transport auto` games at seeds
# 1..10, **alternating the user's own deck and the probe decks**, and every one
# of them held to eight assertions:
#
#   1. the process exits 0 and prints `MTGTABLE OK`;
#   2. `finished = true` -- the game reached `over` rather than timing out,
#      which is the difference between "played" and "the game thread wedged";
#   3. `UNIMPL members = none` in the summary **and** not one `UNIMPL` line
#      anywhere in the server log or in the frame log.  Those are two different
#      questions: the summary is `WireGuiGame.unimplemented()`, a set the
#      emitter maintains, and the greps are the raw text `Transport.unimpl()`
#      writes to stderr and pushes as a `notice`.  A member that logged and
#      forgot to record itself would pass the first and fail the second;
#   4. `emit errors    = 0`;
#   5. exactly one `over` frame, and it is the last line of the log (section 7,
#      section 8.4);
#   6. `tools/check-redaction.mjs` over the whole frame log -- the same standard
#      the committed fixtures are held to, with no flags (CLAUDE.md: never
#      `--pre-amendment`, never `--opponent-library-ok`);
#   6b. **(M6)** every `state` frame carries `players[].phaseStops {own,opp}`,
#      `state.yield` and `state.undo`.  check-redaction declares those optional
#      because a recording with no seat legitimately has none (protocol section
#      3.1); every file in this loop HAS a seat, so an emitter that stopped
#      writing them would otherwise fail nothing at all;
#   7. **no more than $ASK_KIND_CAP asks of any one kind in one game.**  An ask
#      loop is the one wedge every assertion above is blind to: the game is not
#      silent (the engine re-asks the instant the policy answers), it still
#      reaches `over` if the cap is generous, and the log is legal all the way
#      down.  It shipped once -- a `confirm` backstop that latched on the wrong
#      answer produced 2,278 identical asks and a 35 MB frame log inside one
#      300 s step, and this gate was green only because no seed in the rotation
#      happened to raise that prompt a third time.
#   8. **the typed acts a row exists to prove -- and their EFFECT.**  A row may
#      name acts in its sixth field; each must appear at least once in that
#      game's frame log.  Seed 4 names `useMana`, the act `PLAN.md` M5 calls
#      *"the one real dead end"*, and for that one a count is not enough: this
#      step also asserts that the seat's `manaPool` is strictly smaller in the
#      `state` frame after a `useMana` act than it was in the `state` before it.
#      A count alone would still pass if AutoTransport sent the act and the
#      bridge quietly dropped it; the drop in the pool is the act landing in
#      `IGameController.useMana`.  Until this assertion existed `useMana` had no
#      end-to-end guard anywhere in the repo -- check-all.sh step 10f says it is
#      "asserted elsewhere", elsewhere was this file, and this file did not
#      contain the string at all.  Its only coverage was the pure client mapping
#      (web/test/pool.test.ts) and a static fixture.
#
# **Why the probe decks are in the rotation.**  Five of the ten seeds play
# `decks/pacho-shield.dck`, which is the game the user actually plays; the other
# five play the decks that force an ask kind the user's deck never produces
# (`docs/evidence/m5-probes.md`).  Ten games of one deck would prove the engine
# does not dead-end *on the paths that deck reaches*, and every ask kind M5 added
# evidence for is on a path it does not.
#
# **Match setup (protocol amendment M44) added four rows, 11-14**: the user's
# deck against the VILLAIN deck -- `decks/doom-legion.dck`, named in ONE place,
# `tools/villain-deck.sh`, which tools/check-all.sh's step 9e sources too
# (`VILLAIN_DECK=<path>` overrides it) -- once under each of Forge's four AI
# profiles, `Default`, `Cautious`, `Reckless` and `Experimental` (report 11
# section 9).  If that file is missing the four rows play
# `decks/morph-probe.dck` as a STAND-IN and say so on every row: the code under
# test is the profile path, and a gate that skipped four rows would be a gate
# that said nothing.  What the rows do NOT assert is that the four profiles
# play differently: they are sets of ~120 heuristics whose effect is
# situational, and against this seat (which alpha-strikes every turn and so
# rarely leaves a blocker up) same-seed pairs were not measurably different
# (docs/evidence/match-setup.md section P).  Those rows carry two more
# assertions, and every row carries the third:
#
#   9. **the profile's EFFECT, read back from the engine.**  The summary's
#      `ai profile     =` line prints what `AiProfileUtil.getProperty(Player,
#      AiProps)` -- the exact lookup `AiController.getProperty` makes -- returns
#      for the in-game AI player, for `PLAY_AGGRO` and for
#      `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS` (90 / 25 / 75 / 100 across the four
#      files, so it tells all four apart).  Both must equal the value in
#      `forge-home/res/ai/<profile>.ai` itself.  A name alone would not do:
#      `getAIProp` silently falls back to built-in defaults for a profile it
#      has no map for;
#   9b. `hello_ok.match` says `aiProfile: <profile>` and names the AI's deck by
#      its `Name=` (check-redaction holds its shape; this holds its CONTENT);
#   10. **no preferences file changed.**  `~/.forge/preferences/` (the user's
#      real Forge) and `var/forge/preferences/` are fingerprinted before and
#      after every row.  The empty-`profileOverride` branch of
#      `GamePlayerUtil.createAiPlayer` calls `ForgePreferences.save()`, and a run
#      that took it would change one of the two.
#
# It also prints an **ADVISORY** line per row comparing the ask kinds the seed
# produced against the kinds its deck exists to force.  Advisory means advisory:
# a missing kind is never an exit code, because which kinds fire is a property of
# the shuffle and not of the code (see seed 8 below).
#
# Usage:
#   ./tools/ten-games.sh                 # all fourteen rows, one at a time, ~6-7 minutes
#   ./tools/ten-games.sh --jobs 4        # four rows at a time, ~2 minutes (D129)
#   ./tools/ten-games.sh --games 3       # the first three rows, for a quick look
#   ./tools/ten-games.sh --seed 13       # one row: your deck vs the villain, Reckless
#   VILLAIN_DECK=decks/x.dck ./tools/ten-games.sh --seed 13
#   GAME_TIMEOUT=600 ./tools/ten-games.sh
#   TEN_GAMES_DIR=var/ten ./tools/ten-games.sh
#
# **`--jobs N` (D129)** runs N rows at once -- tools/deck-smoke.sh's pattern.
# Every row is the same eleven assertions whichever way it runs: each is its own
# process with its own `--game-id ten-<seed>`, its own frame log under
# var/games/ten-<seed>/ and its own server log, so nothing a row asserts can be
# satisfied by another row's files.  Assertion 10 gets STRONGER, not weaker: a
# row's before/after fingerprint now spans whatever else was running, so a
# preferences write by ANY concurrent game fails some row.  With N > 1 a line
# per finished row prints as it lands, then every row's block in ROW order,
# then the sweep and the summary; the first failure stops new rows from
# starting, the running ones finish, and the run exits 1 after printing them.
# `--jobs 1` (the default) is the old loop, byte for byte.
#
# Two entry points exist for tools/check-all.sh's parallel mode, which runs each
# row as a job of its own pool (so rows interleave with the gate's other games)
# and then asks for the summary:
#   ./tools/ten-games.sh --run-row 13    # ONE row, numbered as in the full run
#                                        # (13/14), block to stdout and to
#                                        # $TEN_GAMES_DIR/ten-13.out; exit 0/1
#   ./tools/ten-games.sh --report        # no games: every selected row's saved
#                                        # block in order, the sweep, the summary;
#                                        # fails if a row has no passing result
#
# It is sub-step 9c of tools/check-all.sh, where SKIP_TEN=1 turns it off.  The
# name stayed "ten-games" when match setup added rows 11-14: rows 1-10 are still
# M5's exit criterion exactly as written, and every reference to the file
# stayed correct.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
# forge_home_make (each row's own Forge home, below) and FORGE_JAR (hard rule 9).
# shellcheck source=tools/config.sh
. tools/config.sh

GAME_TIMEOUT="${GAME_TIMEOUT:-300}"
OUT_DIR="${TEN_GAMES_DIR:-var/ten-games}"
WANT=""                          # every row unless --games N says the first N
ONLY_SEED=""                     # --seed N: that one row
JOBS=1                           # --jobs N: N rows at a time (D129)
MODE=run                         # run | row (--run-row) | report (--report)
ROW_SEED=""
# Assertion 7.  Generous on purpose: the busiest legitimate row in the rotation
# raises 15 asks of one kind, and a real loop raises hundreds within seconds.
# The number is a wedge detector, not a budget.
ASK_KIND_CAP="${ASK_KIND_CAP:-150}"

while [ $# -gt 0 ]; do
  case "$1" in
    --games) WANT="$2"; shift 2 ;;
    --seed) ONLY_SEED="$2"; shift 2 ;;
    --jobs) JOBS="$2"; shift 2 ;;
    --run-row) MODE=row; ROW_SEED="$2"; shift 2 ;;
    --report) MODE=report; shift ;;
    -h | --help)
      sed -n '2,133p' "$0"
      exit 0
      ;;
    *) echo "ten-games: unknown argument $1" >&2; exit 2 ;;
  esac
done
case "$JOBS" in '' | *[!0-9]* | 0) echo "ten-games: --jobs takes a positive number" >&2; exit 2 ;; esac

# seed | deck | deck2 ("-" = same as deck) | extra flags | advisory kinds | acts
# The rotation alternates: odd seeds are the user's deck, even seeds a probe.
# `--deck2 decks/morph-probe.dck` on every probe row is not decoration --
# docs/evidence/m2-console.md section 9.3 measured that leaving it off changes
# what the engine asks, and six re-records of human-trample-7 without it produced
# no `assign_damage` ask at all.
#
# The fifth field is the kind the row exists to force, for the ADVISORY line
# only -- never an exit code.  **Seed 8 is the row that shows why.**
# `trample-probe` is here for `assign_damage`, and `assign_damage` needs two
# blockers on one attacker, or a trampler the AI blocks and does not kill: a
# seed does not guarantee either, and at seed 8 it does not happen (measured
# twice -- `seed 8  trample-probe  21 (round 11)  29s  [choose_list]`).  That is
# not a failure and the gate must not treat it as one; this gate asserts that
# nothing dead-ends, not that a kind fires.  The committed evidence for
# `assign_damage` is `fixtures/games/human-trample-7.jsonl`, recorded at the seed
# where it does fire (docs/evidence/m5-probes.md section 10).
#
# The SIXTH field is the fifth field's opposite: acts that MUST appear, and a
# missing one IS an exit code (assertion 8).  Only seed 4 carries one --
# `--mana-lost-prompt` on `amount-probe` is the row in the rotation that
# reliably floats mana and then spends it.  The other typed act M5 added,
# `clickAbility`, is asserted over the socket instead (check-all.sh step 10f).
ROWS=(
  "1|decks/pacho-shield.dck|-||"
  "2|decks/search-probe.dck|decks/morph-probe.dck|--probe|choose_entities"
  "3|decks/pacho-shield.dck|-||"
  "4|decks/amount-probe.dck|decks/morph-probe.dck|--probe --mana-lost-prompt|assign_amount confirm|useMana"
  "5|decks/pacho-shield.dck|-||"
  "6|decks/number-probe.dck|decks/morph-probe.dck|--probe|text"
  "7|decks/pacho-shield.dck|-||"
  "8|decks/trample-probe.dck|decks/morph-probe.dck||assign_damage"
  "9|decks/pacho-shield.dck|-|--probe|"
  "10|decks/scry-probe.dck|decks/morph-probe.dck|--probe|order"
  # M44 -- match setup: your deck against the villain deck, one row per AI
  # profile.  `@villain` is resolved below.
  "11|decks/pacho-shield.dck|@villain|--ai-profile Default|"
  "12|decks/pacho-shield.dck|@villain|--ai-profile Cautious|"
  "13|decks/pacho-shield.dck|@villain|--ai-profile Reckless|"
  "14|decks/pacho-shield.dck|@villain|--ai-profile Experimental|"
)

# The villain deck: tools/villain-deck.sh is its one definition (it sets
# VILLAIN and VILLAIN_NOTE; VILLAIN_DECK overrides it).
# shellcheck source=tools/villain-deck.sh
. tools/villain-deck.sh
[ -f "$VILLAIN" ] || { echo "ten-games FAILED: the villain deck $VILLAIN does not exist" >&2; exit 1; }

# Assertion 10: every preferences file a run could write, fingerprinted.  A
# directory with no file in it prints the same line whether it exists or not
# (D133): the first engine boot in a fresh checkout creates an EMPTY
# var/forge/preferences/, which is not a preferences write, and the old "absent"
# line failed row 1 of a first run on it -- serially too, where only the gate's
# own earlier steps had ever hidden it.  Any FILE still changes the print.
# Three directories since each row boots in a Forge home of its own (D129,
# amended at merge): the user's real one, the checkout's default home (a JVM that
# ignored its config would write there) and the row's own ($1).
prefs_fingerprint() {
  local d
  for d in "$HOME/.forge/preferences" var/forge/preferences "$1"; do
    if [ -d "$d" ] && [ -n "$(find "$d" -type f -print -quit)" ]; then
      find "$d" -type f -print0 | sort -z | xargs -0 -r sha256sum
      find "$d" -type f -print0 | sort -z | xargs -0 -r stat -c '%n %Y %s'
    else
      echo "$d: no files"
    fi
  done
}
# A deck's public name the way the bridge computes it (MtgTable.deckName):
# its `Name=`, else the file's base name without `.dck`.  The first match is
# taken by sed's own `q`, never `| head -1`: under `set -o pipefail` a reader
# that stops early can SIGPIPE the writer and fail the pipeline with 141 (D132).
deck_name() {
  local n
  n="$(sed -n '/^Name=/{s///p;q}' "$1" | tr -d '\r' | sed 's/^ *//; s/ *$//')"
  [ -n "$n" ] && printf '%s' "$n" || basename "$1" .dck
}
# What a profile file says a key is, e.g. `ai_prop Reckless PLAY_AGGRO` -> true.
ai_prop() { sed -n "/^$2=/{s///p;q}" "forge-home/res/ai/$1.ai" | tr -d '\r'; }

die() { echo "ten-games FAILED: $1" >&2; exit 1; }
capped() { case "$1" in 124 | 137) return 0 ;; *) return 1 ;; esac; }

# The rows this run plays, as "index|of|<the ROWS entry>".  `index/of` is what
# the row's header line prints: its place in THIS run, or -- for --run-row -- its
# place in the full rotation, so a parallel gate's report reads like a full run.
SEL=()
if [ "$MODE" = row ]; then
  i=0
  for row in "${ROWS[@]}"; do
    i=$((i + 1))
    [ "${row%%|*}" = "$ROW_SEED" ] && SEL+=("$i|${#ROWS[@]}|$row")
  done
  [ "${#SEL[@]}" = "1" ] || { echo "ten-games: no row has seed $ROW_SEED" >&2; exit 2; }
else
  [ -n "$WANT" ] || WANT="${#ROWS[@]}"
  [ -n "$ONLY_SEED" ] && WANT=1
  n=0
  for row in "${ROWS[@]}"; do
    [ "$n" -ge "$WANT" ] && break
    if [ -n "$ONLY_SEED" ] && [ "${row%%|*}" != "$ONLY_SEED" ]; then continue; fi
    n=$((n + 1))
    SEL+=("$n|$WANT|$row")
  done
fi

# ONE ROW: the game and all eleven assertions.  Always run in a subshell of its
# own (`( set -e; run_row ... )`), because `die` ends the row by `exit 1`; on a
# pass it writes $OUT_DIR/ten-<seed>.pass -- start and end epoch seconds, the
# summary line, the ask kinds -- which is all the drivers below collect.
run_row() {   # $1 index, $2 of, $3 the ROWS entry
  local idx="$1" of="$2" row="$3"
  local seed deck deck2 flags want_kinds must_acts profile id log frames
  IFS='|' read -r seed deck deck2 flags want_kinds must_acts <<< "$row"
  [ "$deck2" = "@villain" ] && deck2="$VILLAIN"
  profile=""
  case " $flags " in *" --ai-profile "*) profile="$(sed -E 's/.*--ai-profile +([^ ]+).*/\1/' <<< "$flags")" ;; esac
  id="ten-$seed"
  log="$OUT_DIR/$id.log"
  frames="var/games/$id/frames.jsonl"
  rm -rf "var/games/$id"
  rm -f "$OUT_DIR/$id.pass"
  # A Forge home of the row's own (D129, amended at merge): $OUT_DIR/home-<seed>/,
  # built fresh by tools/config.sh's forge_home_make, so the row's JVM never
  # boots in a userDir another row -- beside it under --jobs or in the gate, or
  # before it serially -- wrote: not Forge's achievements files, which a JVM that
  # exits mid-save leaves empty for the next reader, not its preferences.  The
  # export is the row's own: run_row always runs in a subshell.
  local home="$OUT_DIR/home-$seed"
  MTG_TABLE_CONFIG="$(forge_home_make "$home")" || die "seed $seed: could not build its Forge home under $home"
  export MTG_TABLE_CONFIG

  local args=(--transport auto --seed "$seed" --game-id "$id" --deck "$deck")
  [ "$deck2" != "-" ] && args+=(--deck2 "$deck2")
  # shellcheck disable=SC2206
  [ -n "$flags" ] && args+=($flags)

  printf '=== %2d/%d  seed %-3s %-28s %s\n' "$idx" "$of" "$seed" "$(basename "$deck")" \
      "$flags${profile:+  vs $(basename "$deck2")}"
  local prefs_before t0 rc wall
  prefs_before="$(prefs_fingerprint "$home/forge/preferences")"
  t0=$(date +%s)
  rc=0
  timeout --kill-after=15s "${GAME_TIMEOUT}s" ./bridge/run.sh mtgtable.MtgTable "${args[@]}" \
      > "$log" 2>&1 || rc=$?
  wall=$(( $(date +%s) - t0 ))
  # Assertion 10, first, because it is true or false whatever else happened.
  if [ "$(prefs_fingerprint "$home/forge/preferences")" != "$prefs_before" ]; then
    diff <(echo "$prefs_before") <(prefs_fingerprint "$home/forge/preferences") >&2 || true
    die "seed $seed CHANGED a Forge preferences file -- a run must never save prefs (CLAUDE.md; the empty-profileOverride branch of GamePlayerUtil.createAiPlayer is one way) (log: $log)"
  fi

  if [ "$rc" != "0" ]; then
    tail -30 "$log" >&2
    capped "$rc" && die "seed $seed did not finish within ${GAME_TIMEOUT}s -- a wedged game thread is exactly what this gate exists to catch (log: $log)"
    die "seed $seed exited $rc (log: $log)"
  fi
  grep -q '^MTGTABLE OK$' "$log" || die "seed $seed did not print MTGTABLE OK (log: $log)"
  grep -q '^finished       = true' "$log" || die "seed $seed did not reach \`over\` (log: $log)"
  grep -q '^UNIMPL members = none$' "$log" || \
    die "seed $seed hit an unimplemented IGuiGame member: $(grep '^UNIMPL members' "$log") (log: $log)"
  grep -q '^emit errors    = 0$' "$log" || \
    die "seed $seed logged an emit error: $(grep '^emit errors' "$log") (log: $log)"

  # The raw grep, which is the one PLAN.md's command line actually writes
  # (`grep UNIMPL var/*.log`).  `UNIMPL members = none` is the emitter's own
  # bookkeeping; this is the text `Transport.unimpl` prints and pushes.  Two
  # COUNTS, not `grep | grep -qv`: the -q reader stops at its first line, and
  # under pipefail a writer it cut off turned the whole test false (D132).
  if [ "$(grep -c 'UNIMPL' "$log" || true)" -gt "$(grep -c '^UNIMPL members = none$' "$log" || true)" ]; then
    grep -n 'UNIMPL' "$log" | grep -v 'UNIMPL members = none' >&2 || true
    die "seed $seed has UNIMPL line(s) in its server log ($log)"
  fi
  if grep -q 'UNIMPL' "$frames" 2>/dev/null; then
    grep -o 'UNIMPL[^"]*' "$frames" | sort -u | sed -n '1,5p' >&2 || true
    die "seed $seed pushed an UNIMPL notice onto the wire ($frames)"
  fi

  [ -s "$frames" ] || die "seed $seed wrote no frame log at $frames"
  local overs
  overs="$(grep -c '"type":"over"' "$frames" || true)"
  [ "$overs" = "1" ] || die "seed $seed wrote $overs \`over\` frames; section 7 says exactly one"
  [[ "$(tail -n 1 "$frames")" == *'"type":"over"'* ]] || \
    die "seed $seed's last frame is not \`over\` (section 8.4)"

  node tools/check-redaction.mjs "$frames" > "$OUT_DIR/$id.redaction.txt" 2>&1 || {
    cat "$OUT_DIR/$id.redaction.txt" >&2
    die "check-redaction.mjs on seed $seed ($frames)"
  }
  sed -n '1p' "$OUT_DIR/$id.redaction.txt"

  # Assertion 6b (M6): every `state` a SEAT recorded carries the comfort fields.
  #
  # `players[].phaseStops`, `state.yield` and `state.undo` are server-owned and
  # the client derives none of them, so a game that stopped writing them would
  # not fail anything above -- check-redaction declares them optional, because an
  # AI-vs-AI recording legitimately has none (protocol section 3.1). Every file
  # in THIS loop has a seat, so here they are required.
  node -e '
    const fs = require("node:fs");
    let states = 0, missing = 0, first = null;
    const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "" || !lines[i].includes("\"state\"")) continue;
      let f; try { f = JSON.parse(lines[i]); } catch { continue; }
      if (f.type !== "state") continue;
      states += 1;
      const ok = f.body.undo !== undefined && f.body.yield !== undefined
        && (f.body.players ?? []).every((p) => p.phaseStops && Array.isArray(p.phaseStops.own)
                                               && Array.isArray(p.phaseStops.opp));
      if (!ok) { missing += 1; first ??= i + 1; }
    }
    if (states === 0) { console.error("no state frames at all"); process.exit(1); }
    if (missing > 0) {
      console.error(`${missing} of ${states} state frames are missing phaseStops/yield/undo `
        + `(first at line ${first})`);
      process.exit(1);
    }
  ' "$frames" || die "seed $seed wrote state frames without M6's comfort fields ($frames)"

  # Assertion 6c (M44): every `hello_ok` a SEAT recorded carries `match`, and it
  # describes THIS row's match.  check-redaction declares the key optional (the
  # whole committed corpus predates it) and holds its shape; here, where every
  # file has a seat and was just recorded, its absence is an emitter that stopped
  # writing it, and its content is checked against the row.
  node -e '
    const fs = require("node:fs");
    const [file, deckName, aiName, profile] = process.argv.slice(1);
    let hellos = 0;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (line === "" || !line.includes("\"hello_ok\"")) continue;
      const f = JSON.parse(line);
      if (f.type !== "hello_ok") continue;
      hellos += 1;
      const m = f.body.match;
      const bad = (msg) => { console.error(`hello_ok.match: ${msg} -- got ${JSON.stringify(m)}`); process.exit(1); };
      if (m === undefined || m === null) bad("absent from a seat recording");
      if (m.yourDeck?.name !== deckName) bad(`yourDeck.name is not ${JSON.stringify(deckName)}`);
      if (m.aiDeck?.name !== aiName) bad(`aiDeck.name is not ${JSON.stringify(aiName)}`);
      if (JSON.stringify(Object.keys(m.aiDeck).sort()) !== "[\"cards\",\"name\"]") bad("aiDeck is not exactly {name, cards}");
      if (m.aiProfile !== profile) bad(`aiProfile is not ${JSON.stringify(profile)}`);
    }
    if (hellos === 0) { console.error("no hello_ok at all"); process.exit(1); }
  ' "$frames" "$(deck_name "$deck")" \
      "$(deck_name "$([ "$deck2" = "-" ] && echo "$deck" || echo "$deck2")")" \
      "${profile:-Default}" \
    || die "seed $seed: hello_ok.match does not describe the match this row played ($frames)"

  # Assertion 9 (M44): the profile the AI actually PLAYED, read from the engine.
  if [ -n "$profile" ]; then
    local line got_aggro got_chain want_aggro want_chain
    line="$(grep '^ai profile     = ' "$log" || true)"
    [ -n "$line" ] || die "seed $seed printed no \`ai profile     =\` summary line ($log)"
    got_aggro="$(sed -nE 's/.*in game: PLAY_AGGRO=([^ ]+) .*/\1/p' <<< "$line")"
    got_chain="$(sed -nE 's/.*CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=([0-9]+).*/\1/p' <<< "$line")"
    want_aggro="$(ai_prop "$profile" PLAY_AGGRO)"
    want_chain="$(ai_prop "$profile" CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS)"
    case "$line" in "ai profile     = $profile "*) ;; *)
      die "seed $seed asked for --ai-profile $profile and the summary says: $line" ;; esac
    [ -n "$want_chain" ] || die "forge-home/res/ai/$profile.ai has no CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS line"
    if [ "$got_aggro" != "$want_aggro" ] || [ "$got_chain" != "$want_chain" ]; then
      die "seed $seed: the in-game AI read PLAY_AGGRO=$got_aggro CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=$got_chain, but $profile.ai says $want_aggro / $want_chain -- the profile did not reach the AI ($log)"
    fi
    printf '    profile: %s -- in game PLAY_AGGRO=%s CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=%s, as %s.ai says; prefs unchanged\n' \
        "$profile" "$got_aggro" "$got_chain" "$profile"
  fi

  # Assertion 7: no one ask kind may run away inside a single game.
  local worst worst_kind worst_n
  worst="$(node -e '
    const fs = require("fs");
    const counts = new Map();
    for (const line of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
      if (line === "" || !line.includes("\"ask\"")) continue;
      let f; try { f = JSON.parse(line); } catch { continue; }
      if (f.type !== "ask") continue;
      const k = String(f.body?.kind);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    let best = ["-", 0];
    for (const e of counts) if (e[1] > best[1]) best = e;
    process.stdout.write(best[0] + " " + best[1]);
  ' "$frames")"
  worst_kind="${worst%% *}"; worst_n="${worst##* }"
  if [ "$worst_n" -gt "$ASK_KIND_CAP" ]; then
    die "seed $seed raised $worst_n \`$worst_kind\` asks in one game (cap $ASK_KIND_CAP) -- that is an ask loop, not a game ($frames)"
  fi

  # Assertion 8: the typed acts this row exists to prove, end to end.
  local acts_line="" act n
  for act in $must_acts; do
    n="$(grep -c "\"action\":\"$act\"" "$frames" || true)"
    [ "$n" -ge 1 ] || die "seed $seed sent no \`$act\` act. This row exists to drive that act \
through the bridge; a zero here means its only remaining coverage is a unit test and a static \
fixture ($frames)"
    acts_line="$acts_line $act x$n"
  done
  # ...and for `useMana`, the effect rather than the act.  The act is a c2s frame
  # and proves only that AutoTransport sent it; the POOL GOING DOWN in the next
  # `state` is the half that proves the bridge applied it.
  case " $must_acts " in
    *" useMana "*)
      local drop d_acts d_drops
      drop="$(node -e '
        const fs = require("fs");
        const total = (pool) => Object.values(pool ?? {}).reduce((a, b) => a + Number(b), 0);
        let seat = null, last = null, armedFrom = null, acts = 0, drops = 0;
        for (const line of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
          if (line === "") continue;
          let f; try { f = JSON.parse(line); } catch { continue; }
          if (f.kind === "session" && seat === null) seat = f.seat ?? null;
          else if (f.type === "hello_ok") seat = f.body?.you ?? seat;
          else if (f.type === "state") {
            const p = (f.body?.players ?? []).find((x) => x.id === seat);
            const now = total(p?.manaPool);
            if (armedFrom !== null && now < armedFrom) drops++;
            armedFrom = null;
            last = now;
          } else if (f.type === "act" && f.body?.action === "useMana") {
            acts++;
            if (armedFrom === null) armedFrom = last;
          }
        }
        process.stdout.write(acts + " " + drops);
      ' "$frames")"
      d_acts="${drop%% *}"; d_drops="${drop##* }"
      [ "$d_drops" -ge 1 ] || die "seed $seed sent $d_acts \`useMana\` act(s) and the seat's \
\`manaPool\` never went down in the \`state\` after one. The act reached the bridge and did \
nothing, which is the whole failure this assertion exists to catch ($frames)"
      acts_line="$acts_line (pool dropped after $d_drops of $d_acts)"
      ;;
  esac
  # `[ -n ... ] && printf` would be the last command of the body and would take
  # `set -e` down with it on every row that names no act.
  if [ -n "$acts_line" ]; then printf '    acts:%s\n' "$acts_line"; fi

  local kinds turns summary_line
  kinds="$(sed -n 's/^ask kinds      = //p' "$log")"
  turns="$(sed -n 's/^player turns   = //p' "$log")"
  summary_line="$(printf '  seed %-3s %-24s %-22s %-9s %s' \
      "$seed" "$(basename "$deck" .dck)${profile:+ vs $(basename "$deck2" .dck)/$profile}" \
      "$turns" "${wall}s" "$kinds")"
  printf '    %s  |  %s  |  %s  |  busiest kind %s x%s\n' \
      "$turns" "$kinds" "${wall}s" "$worst_kind" "$worst_n"
  # ADVISORY (never an exit code): did this row produce the kind it is here for?
  if [ -n "$want_kinds" ]; then
    local missing="" k
    for k in $want_kinds; do
      case " $(echo "$kinds" | tr -d '[]' | tr ',' ' ') " in
        *" $k "*) ;;
        *) missing="$missing $k" ;;
      esac
    done
    if [ -n "$missing" ]; then
      printf '    ADVISORY: seed %s produced no%s -- which kinds fire is a property of the shuffle, not of the code (see the ROWS comment)\n' \
          "$seed" "$missing"
    else
      printf '    advisory: seed %s produced the kind(s) it is here for (%s)\n' "$seed" "$want_kinds"
    fi
  fi
  printf '\n'
  printf '%s\n%s\n%s\n%s\n' "$t0" "$(date +%s)" "$summary_line" "$kinds" > "$OUT_DIR/$id.pass"
}

seed_of() { local rest="${1#*|}"; rest="${rest#*|}"; printf '%s' "${rest%%|*}"; }   # of "index|of|row"

mkdir -p "$OUT_DIR"

# --run-row: one row, its block to stdout AND to $OUT_DIR/ten-<seed>.out, where
# --report finds it.  No header, no sweep, no summary -- the report prints those.
if [ "$MODE" = row ]; then
  s="${SEL[0]}"
  seed="$(seed_of "$s")"
  IFS='|' read -r idx of row <<< "$s"
  rm -f "$OUT_DIR/ten-$seed.out" "$OUT_DIR/ten-$seed.pass"
  set +e
  ( set -e; run_row "$idx" "$of" "$row" ) 2>&1 | tee "$OUT_DIR/ten-$seed.out"
  rc="${PIPESTATUS[0]}"
  set -e
  exit "$rc"
fi

echo "== ten-games =="
echo "repo         = $REPO_ROOT"
echo "game timeout = ${GAME_TIMEOUT}s each"
echo "logs         = $OUT_DIR/"
echo "rows 11-14   = $VILLAIN_NOTE"
[ "$MODE" = run ] && [ "$JOBS" -gt 1 ] && echo "jobs         = $JOBS rows at a time (D129)"
echo

t_all=$(date +%s)

if [ "$MODE" = report ]; then
  # Every selected row's saved block, in row order, exactly as --run-row wrote
  # it; a row with no block, or with a block but no .pass, fails the report.
  for s in "${SEL[@]}"; do
    seed="$(seed_of "$s")"
    [ -f "$OUT_DIR/ten-$seed.out" ] || die "seed $seed has no result in $OUT_DIR/ -- it never ran (--run-row $seed)"
    cat "$OUT_DIR/ten-$seed.out"
    [ -f "$OUT_DIR/ten-$seed.pass" ] || die "seed $seed did not pass (its block above says why; log: $OUT_DIR/ten-$seed.log)"
  done
elif [ "$JOBS" = 1 ]; then
  # The loop as it always was: one row at a time, its block straight to the
  # console, and the run ends at the first failure.
  for s in "${SEL[@]}"; do
    seed="$(seed_of "$s")"
    IFS='|' read -r idx of row <<< "$s"
    rm -f "$OUT_DIR/ten-$seed.out"
    set +e
    ( set -e; run_row "$idx" "$of" "$row" )
    rc=$?
    set -e
    [ "$rc" = "0" ] || exit 1     # the row has already said "ten-games FAILED: ..."
  done
else
  # --jobs N: deck-smoke's pattern.  Each row writes its whole block to
  # $OUT_DIR/ten-<seed>.out; a one-line note prints as each lands; the first
  # failure stops new rows from starting, and the ones already running finish.
  declare -A SEED_OF_PID=()
  running=0
  failed=""
  for s in "${SEL[@]}"; do
    [ -n "$failed" ] && break
    seed="$(seed_of "$s")"
    IFS='|' read -r idx of row <<< "$s"
    rm -f "$OUT_DIR/ten-$seed.out"
    ( set -e; run_row "$idx" "$of" "$row" ) > "$OUT_DIR/ten-$seed.out" 2>&1 &
    SEED_OF_PID[$!]="$seed"
    running=$((running + 1))
    if [ "$running" -ge "$JOBS" ]; then
      rc=0; wait -n -p done_pid || rc=$?
      running=$((running - 1))
      printf '  [%4ds] seed %-3s %s\n' "$(( $(date +%s) - t_all ))" "${SEED_OF_PID[$done_pid]}" \
          "$([ "$rc" = 0 ] && echo ok || echo FAILED)"
      [ "$rc" = 0 ] || failed="$failed ${SEED_OF_PID[$done_pid]}"
    fi
  done
  while [ "$running" -gt 0 ]; do
    rc=0; wait -n -p done_pid || rc=$?
    running=$((running - 1))
    printf '  [%4ds] seed %-3s %s\n' "$(( $(date +%s) - t_all ))" "${SEED_OF_PID[$done_pid]}" \
        "$([ "$rc" = 0 ] && echo ok || echo FAILED)"
    [ "$rc" = 0 ] || failed="$failed ${SEED_OF_PID[$done_pid]}"
  done
  echo
  for s in "${SEL[@]}"; do
    seed="$(seed_of "$s")"
    [ -f "$OUT_DIR/ten-$seed.out" ] && cat "$OUT_DIR/ten-$seed.out"
  done
  [ -z "$failed" ] || die "seed(s)$failed failed -- each block above ends in its reason (logs in $OUT_DIR/)"
fi

# What the rows left behind: the summary lines and ask kinds, in row order.
played=0
kinds_all=""
summary=""
t_first=""
t_last=""
for s in "${SEL[@]}"; do
  seed="$(seed_of "$s")"
  pass="$OUT_DIR/ten-$seed.pass"
  [ -f "$pass" ] || die "seed $seed left no result ($pass)"
  played=$((played + 1))
  t0="$(sed -n '1p' "$pass")"; t1="$(sed -n '2p' "$pass")"
  { [ -z "$t_first" ] || [ "$t0" -lt "$t_first" ]; } && t_first="$t0"
  { [ -z "$t_last" ] || [ "$t1" -gt "$t_last" ]; } && t_last="$t1"
  summary="$summary$(sed -n '3p' "$pass")"$'\n'
  kinds_all="$kinds_all $(sed -n '4p' "$pass" | tr -d '[]' | tr ',' ' ')"
done

# The closing sweep PLAN.md M5 actually writes on its command line
# (`grep UNIMPL var/*.log`), over everything this run produced at once.  The
# per-game greps above already cover these files; this one is here so the
# milestone's own command has a literal answer, and so a log this script forgot
# to check would still be caught.  The only permitted UNIMPL line anywhere is the
# summary's own `UNIMPL members = none`.
echo
sweep=""
for f in "$OUT_DIR"/*.log var/games/ten-*/frames.jsonl; do
  [ -f "$f" ] || continue
  all="$(grep -c 'UNIMPL' "$f" || true)"
  ok="$(grep -c '^UNIMPL members = none$' "$f" || true)"
  if [ "$all" -gt "$ok" ]; then
    sweep="$sweep $f"
    grep -n 'UNIMPL' "$f" | grep -v 'UNIMPL members = none' | sed -n '1,3p' >&2 || true
  fi
done
if [ -n "$sweep" ]; then
  die "grep UNIMPL found real UNIMPL line(s) in:$sweep"
fi
echo "grep UNIMPL over $OUT_DIR/*.log and var/games/ten-*/frames.jsonl: nothing but each run's own \`UNIMPL members = none\` summary line"

echo
[ "$played" -gt 0 ] || die "no row matched (--seed $ONLY_SEED?)"
echo "== ten-games: $played/$played games reached \`over\`, zero UNIMPL, every log through check-redaction, no preferences file touched =="
printf '%s' "$summary"
echo "  ask kinds seen across the run: $(echo "$kinds_all" | tr ' ' '\n' | sed '/^$/d' | sort -u | tr '\n' ' ')"
if [ "$MODE" = report ]; then
  echo "  total wall: $(( t_last - t_first ))s (first row's start to last row's end)"
else
  echo "  total wall: $(( $(date +%s) - t_all ))s"
fi
echo "TEN GAMES OK"

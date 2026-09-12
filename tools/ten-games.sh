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
# of them held to seven assertions:
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
# It also prints an **ADVISORY** line per row comparing the ask kinds the seed
# produced against the kinds its deck exists to force.  Advisory means advisory:
# a missing kind is never an exit code, because which kinds fire is a property of
# the shuffle and not of the code (see seed 8 below).
#
# Usage:
#   ./tools/ten-games.sh                 # ten games, ~4-8 minutes
#   ./tools/ten-games.sh --games 3       # the first three rows, for a quick look
#   GAME_TIMEOUT=600 ./tools/ten-games.sh
#   TEN_GAMES_DIR=var/ten ./tools/ten-games.sh
#
# It is sub-step 9c of tools/check-all.sh, where SKIP_TEN=1 turns it off.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAME_TIMEOUT="${GAME_TIMEOUT:-300}"
OUT_DIR="${TEN_GAMES_DIR:-var/ten-games}"
WANT=10
# Assertion 7.  Generous on purpose: the busiest legitimate row in the rotation
# raises 15 asks of one kind, and a real loop raises hundreds within seconds.
# The number is a wedge detector, not a budget.
ASK_KIND_CAP="${ASK_KIND_CAP:-150}"

while [ $# -gt 0 ]; do
  case "$1" in
    --games) WANT="$2"; shift 2 ;;
    -h | --help)
      sed -n '2,68p' "$0"
      exit 0
      ;;
    *) echo "ten-games: unknown argument $1" >&2; exit 2 ;;
  esac
done

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
)

die() { echo "ten-games FAILED: $1" >&2; exit 1; }
capped() { case "$1" in 124 | 137) return 0 ;; *) return 1 ;; esac; }

mkdir -p "$OUT_DIR"
echo "== ten-games =="
echo "repo         = $REPO_ROOT"
echo "game timeout = ${GAME_TIMEOUT}s each"
echo "logs         = $OUT_DIR/"
echo

played=0
kinds_all=""
t_all=$(date +%s)
summary=""

for row in "${ROWS[@]}"; do
  [ "$played" -ge "$WANT" ] && break
  IFS='|' read -r seed deck deck2 flags want_kinds must_acts <<< "$row"
  played=$((played + 1))
  id="ten-$seed"
  log="$OUT_DIR/$id.log"
  frames="var/games/$id/frames.jsonl"
  rm -rf "var/games/$id"

  args=(--transport auto --seed "$seed" --game-id "$id" --deck "$deck")
  [ "$deck2" != "-" ] && args+=(--deck2 "$deck2")
  # shellcheck disable=SC2206
  [ -n "$flags" ] && args+=($flags)

  printf '=== %2d/%d  seed %-3s %-28s %s\n' "$played" "$WANT" "$seed" "$(basename "$deck")" "$flags"
  t0=$(date +%s)
  rc=0
  timeout --kill-after=15s "${GAME_TIMEOUT}s" ./bridge/run.sh mtgtable.MtgTable "${args[@]}" \
      > "$log" 2>&1 || rc=$?
  wall=$(( $(date +%s) - t0 ))

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
  # bookkeeping; this is the text `Transport.unimpl` prints and pushes.
  if grep -n 'UNIMPL' "$log" | grep -qv '^[0-9]*:UNIMPL members = none$'; then
    grep -n 'UNIMPL' "$log" | grep -v 'UNIMPL members = none' >&2
    die "seed $seed has UNIMPL line(s) in its server log ($log)"
  fi
  if grep -q 'UNIMPL' "$frames" 2>/dev/null; then
    grep -o 'UNIMPL[^"]*' "$frames" | sort -u | head -5 >&2
    die "seed $seed pushed an UNIMPL notice onto the wire ($frames)"
  fi

  [ -s "$frames" ] || die "seed $seed wrote no frame log at $frames"
  overs="$(grep -c '"type":"over"' "$frames" || true)"
  [ "$overs" = "1" ] || die "seed $seed wrote $overs \`over\` frames; section 7 says exactly one"
  [ "$(tail -1 "$frames" | grep -c '"type":"over"')" = "1" ] || \
    die "seed $seed's last frame is not \`over\` (section 8.4)"

  node tools/check-redaction.mjs "$frames" > "$OUT_DIR/$id.redaction.txt" 2>&1 || {
    cat "$OUT_DIR/$id.redaction.txt" >&2
    die "check-redaction.mjs on seed $seed ($frames)"
  }
  head -1 "$OUT_DIR/$id.redaction.txt"

  # Assertion 7: no one ask kind may run away inside a single game.
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
  acts_line=""
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
  # `[ -n ... ] && printf` would be the last command of the loop body and would
  # take `set -e` down with it on every row that names no act.
  if [ -n "$acts_line" ]; then printf '    acts:%s\n' "$acts_line"; fi

  kinds="$(sed -n 's/^ask kinds      = //p' "$log")"
  turns="$(sed -n 's/^player turns   = //p' "$log")"
  kinds_all="$kinds_all $(echo "$kinds" | tr -d '[]' | tr ',' ' ')"
  summary="$summary$(printf '  seed %-3s %-24s %-22s %-9s %s\n' \
      "$seed" "$(basename "$deck" .dck)" "$turns" "${wall}s" "$kinds")"$'\n'
  printf '    %s  |  %s  |  %s  |  busiest kind %s x%s\n' \
      "$turns" "$kinds" "${wall}s" "$worst_kind" "$worst_n"
  # ADVISORY (never an exit code): did this row produce the kind it is here for?
  if [ -n "$want_kinds" ]; then
    missing=""
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
    grep -n 'UNIMPL' "$f" | grep -v 'UNIMPL members = none' | head -3 >&2
  fi
done
if [ -n "$sweep" ]; then
  die "grep UNIMPL found real UNIMPL line(s) in:$sweep"
fi
echo "grep UNIMPL over $OUT_DIR/*.log and var/games/ten-*/frames.jsonl: nothing but each run's own \`UNIMPL members = none\` summary line"

echo
echo "== ten-games: $played/$played games reached \`over\`, zero UNIMPL, every log through check-redaction =="
printf '%s' "$summary"
echo "  ask kinds seen across the run: $(echo "$kinds_all" | tr ' ' '\n' | sed '/^$/d' | sort -u | tr '\n' ' ')"
echo "  total wall: $(( $(date +%s) - t_all ))s"
echo "TEN GAMES OK"

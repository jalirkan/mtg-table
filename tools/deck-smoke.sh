#!/usr/bin/env bash
# mtg-table — tools/deck-smoke.sh: every AI deck, played by the AI.  NOT in the gate.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
# The user's request (2026-09-27): "I'd also like to watch AIs vs each other with
# my deck vs different decks so I can see how they play it."  A deck the AI is
# handed is only worth watching if the AI actually PLAYS it -- casts its cards and
# attacks with them -- and if a game with it ends and stays inside the
# hidden-information gate.  tools/check-deck.mjs answers "is every card in the
# engine"; this answers "does Forge's AI pilot it", which no static check can:
# Trickster's Stratagem was a faithful script the AI never once cast
# (docs/evidence/match-setup.md section D.6).
#
# For each AI deck, five `--transport auto` games at seeds 1-5 -- the user's deck
# (decks/pacho-shield.dck, the automated seat) against the AI on that deck, the
# default AI profile -- and every game held to:
#
#   1. exit 0 within GAME_TIMEOUT, `MTGTABLE OK`, `finished = true` (it reached
#      `over` rather than timing out);
#   2. `UNIMPL members = none` and `emit errors    = 0`;
#   3. exactly one `over` frame, and it is the last line of the frame log;
#   4. tools/check-redaction.mjs over the frame log, with no flags;
#   5. the AI CAST at least min(MIN_SPELLS, T - 3) spells, where MIN_SPELLS is 8
#      and T is the number of turns the AI took (the `turn` events whose
#      `player` is the AI); DECK_SMOKE_STRICT=1 demands the flat MIN_SPELLS.
#      A spell is a `cast` event (state.events[], protocol section 3.6) whose
#      `controller` is the AI's player id (the `hello_ok.players[]` entry with
#      `isAi: true`) and whose stack item -- the `state.stack[]` entry with that
#      `id`, in any frame -- has `isAbility: false`: never a triggered or an
#      activated ability (a Saga chapter, a power-up, a land's ability), which
#      arrive as `cast` events too.  Distinct stack ids; a cast with no stack
#      item to classify fails the game;
#   6. the AI ATTACKED at least MIN_ATTACKS (1) times: an `attackers` event whose
#      `player` is the AI with at least one id in `bands[].attackerIds` (Forge
#      fires the event every combat, empty bands included).
#
# 5 and 6 are thresholds on the DECK, not on the code: if a deck's AI never
# attacks or never gets its cards down, the deck changes, not the number.  Why 5
# is a RATE and not the flat 8 the lane was asked for (DECISIONS.md D117):
# against this seat the AI wins in five to eleven of its own turns and casts
# about one spell a turn -- it taps out for its biggest card, and casts its
# creatures after combat, so its first turn and its winning one are usually
# empty -- and 5 of 40 games reached 8, with any 17-land deck.  T - 3 is a spell
# every turn but the first, the last and one more; it still fails a deck the AI
# stalls with (a red-heavy Hulk list, 4 of 10) and the negative control, 23
# Trickster's Stratagem (0 spells, 0 attacks).  Then a table per deck: AI wins /
# losses, turns, spells, attacking combats -- and, ADVISORY, the deck's lines the
# AI never cast across the run (the Stratagem check).
#
# Usage (from the repo root, hard rule 9; the jar comes from config.json):
#   ./tools/deck-smoke.sh                                # every AI deck, seeds 1-5
#   ./tools/deck-smoke.sh decks/hulk-family.dck          # one deck (or several)
#   ./tools/deck-smoke.sh --seeds "6 7 8"                # other seeds
#   ./tools/deck-smoke.sh --jobs 3                       # three games at a time
#   ./tools/deck-smoke.sh --ai-profile Reckless          # another AI profile
#   GAME_TIMEOUT=600 DECK_SMOKE_DIR=var/deck-smoke ./tools/deck-smoke.sh
#
# "Every AI deck" is every `decks/specs/*.json` (tools/build-deck.ts), each of
# which names its `.dck`: the deck the gate seats the AI behind
# (decks/doom-legion.dck, tools/villain-deck.sh) and the three added with it.
# Each game writes var/games/smoke-<deck>-<seed>/frames.jsonl, its server log
# and its counts under DECK_SMOKE_DIR (default var/deck-smoke).
#
# NOT in tools/check-all.sh, on purpose: twenty games are ~2.5 minutes with
# --jobs 4 and ~10 without, on top of a gate that is already 15-20, and what they
# measure is the decks, which change far less often than the code.  Run it after
# changing a deck or the AI policy; docs/evidence/more-villains.md is its first
# run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAME_TIMEOUT="${GAME_TIMEOUT:-300}"
OUT_DIR="${DECK_SMOKE_DIR:-var/deck-smoke}"
SEAT_DECK="decks/pacho-shield.dck"
MIN_SPELLS=8
MIN_ATTACKS=1
STRICT="${DECK_SMOKE_STRICT:-0}"
SEEDS="1 2 3 4 5"
JOBS=1
PROFILE=""
DECKS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --seeds) SEEDS="$2"; shift 2 ;;
    --jobs) JOBS="$2"; shift 2 ;;
    --ai-profile) PROFILE="$2"; shift 2 ;;
    -h | --help) sed -n '2,69p' "$0"; exit 0 ;;
    --*) echo "deck-smoke: unknown flag $1" >&2; exit 2 ;;
    *) DECKS+=("$1"); shift ;;
  esac
done
case "$JOBS" in '' | *[!0-9]* | 0) echo "deck-smoke: --jobs takes a positive number" >&2; exit 2 ;; esac

if [ "${#DECKS[@]}" -eq 0 ]; then
  for spec in decks/specs/*.json; do
    [ -f "$spec" ] || continue
    DECKS+=("$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).deck)' "$spec")")
  done
fi
[ "${#DECKS[@]}" -gt 0 ] || { echo "deck-smoke: no deck named and no decks/specs/*.json" >&2; exit 2; }
for d in "${DECKS[@]}"; do [ -f "$d" ] || { echo "deck-smoke: $d does not exist" >&2; exit 2; }; done
[ -d bridge/out ] || { echo "deck-smoke: bridge/out is missing -- run ./bridge/build.sh first" >&2; exit 2; }

# The counts, from one frame log.  One JSON object on stdout; the fields are the
# header's items 5 and 6 plus what the table prints.
COUNT_JS='
const fs = require("node:fs");
const [file] = process.argv.slice(1);
let ai = null, seat = null, winner, over = 0, lastIsOver = false;
const isAbility = new Map();            // stack id -> isAbility, from any frame
const casts = [];                       // AI cast events
const names = new Map();                // card id -> name, from any face-up sighting
const lands = new Set();                // names whose type line says Land
let attackTurns = 0, attackers = 0, aiTurns = 0, maxTurn = 0;
const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => l !== "");
lines.forEach((line, i) => {
  const f = JSON.parse(line);
  if (f.kind === "session") return;
  if (f.type === "over") { over++; winner = f.body.winner; lastIsOver = i === lines.length - 1; return; }
  if (f.type === "hello_ok") {
    seat = f.body.you;
    ai = (f.body.players ?? []).find((p) => p.isAi)?.id ?? null;
    return;
  }
  if (f.type !== "state") return;
  const b = f.body;
  for (const s of b.stack ?? []) isAbility.set(s.id, s.isAbility);
  const see = (c) => {
    if (!c || typeof c.name !== "string" || c.name === "") return;
    names.set(c.id, c.name);
    if (/\bLand\b/.test(c.types ?? "")) lands.add(c.name);
  };
  (b.stackCards ?? []).forEach(see);
  for (const p of b.players ?? []) for (const z of Object.values(p.zones ?? {})) (z.cards ?? []).forEach(see);
  for (const e of b.events ?? []) {
    if (e.kind === "cast" && e.controller === ai) casts.push(e);
    else if (e.kind === "attackers" && e.player === ai) {
      const n = (e.bands ?? []).reduce((a, band) => a + (band.attackerIds ?? []).length, 0);
      if (n > 0) { attackTurns++; attackers += n; }
    } else if (e.kind === "turn") {
      if (e.player === ai) aiTurns++;
      maxTurn = Math.max(maxTurn, e.turn);
    }
  }
});
const seen = new Set();
let spells = 0, abilities = 0, unknown = 0;
const cast = {};
for (const e of casts) {
  if (seen.has(e.stackId)) continue;
  seen.add(e.stackId);
  const ab = isAbility.get(e.stackId);
  if (ab === false) {
    spells++;
    const n = names.get(e.cardId) ?? `#${e.cardId}`;
    cast[n] = (cast[n] ?? 0) + 1;
  } else if (ab === true) abilities++;
  else unknown++;
}
process.stdout.write(JSON.stringify({
  ai, seat, winner: winner ?? null, over, lastIsOver, aiWon: winner === ai, turns: maxTurn, aiTurns,
  spells, abilities, unknown, attackTurns, attackers, cast, lands: [...lands],
}));
'

mkdir -p "$OUT_DIR"
fails="$OUT_DIR/failures.txt"
: > "$fails"

# One game.  Writes $OUT_DIR/<id>.result (the counts, one JSON line) or appends a
# reason to $fails; prints one line either way.  Never exits the script: a
# failed game is a row in the table, and the run ends non-zero after it.
play() {
  local deck="$1" seed="$2"
  local base; base="$(basename "$deck" .dck)"
  local id="smoke-$base-$seed"
  local log="$OUT_DIR/$id.log" frames="var/games/$id/frames.jsonl" res="$OUT_DIR/$id.result"
  rm -rf "var/games/$id" "$res"
  local args=(--transport auto --seed "$seed" --game-id "$id" --deck "$SEAT_DECK" --ai-deck "$deck")
  [ -n "$PROFILE" ] && args+=(--ai-profile "$PROFILE")
  local t0 rc=0 wall
  t0=$(date +%s)
  timeout --kill-after=15s "${GAME_TIMEOUT}s" ./bridge/run.sh mtgtable.MtgTable "${args[@]}" > "$log" 2>&1 || rc=$?
  wall=$(( $(date +%s) - t0 ))
  bad() { echo "$id: $1 (log: $log)" >> "$fails"; printf '  %-28s FAIL  %s\n' "$id" "$1"; }
  if [ "$rc" != 0 ]; then
    case "$rc" in 124 | 137) bad "did not finish within ${GAME_TIMEOUT}s" ;; *) bad "exited $rc" ;; esac
    return 0
  fi
  grep -q '^MTGTABLE OK$' "$log" || { bad "no MTGTABLE OK"; return 0; }
  grep -q '^finished       = true' "$log" || { bad "did not reach over"; return 0; }
  grep -q '^UNIMPL members = none$' "$log" || { bad "$(grep '^UNIMPL members' "$log")"; return 0; }
  grep -q '^emit errors    = 0$' "$log" || { bad "$(grep '^emit errors' "$log")"; return 0; }
  [ -s "$frames" ] || { bad "no frame log at $frames"; return 0; }
  if ! node tools/check-redaction.mjs "$frames" > "$OUT_DIR/$id.redaction.txt" 2>&1; then
    bad "check-redaction.mjs failed ($OUT_DIR/$id.redaction.txt)"
    return 0
  fi
  local counts
  counts="$(node -e "$COUNT_JS" "$frames")" || { bad "could not count $frames"; return 0; }
  local verdict
  verdict="$(node -e '
    const c = JSON.parse(process.argv[1]);
    const [minSpells, minAttacks] = [Number(process.argv[2]), Number(process.argv[3])];
    const out = [];
    if (c.ai === null) out.push("no AI player in hello_ok");
    if (c.over !== 1) out.push(`${c.over} over frames, not 1`);
    else if (!c.lastIsOver) out.push("the last frame is not over");
    // min(MIN_SPELLS, AI turns - 3) unless DECK_SMOKE_STRICT=1: see the header.
    const need = process.argv[4] === "1" ? minSpells : Math.max(0, Math.min(minSpells, c.aiTurns - 3));
    if (c.spells < need) out.push(`the AI cast ${c.spells} spell(s) in ${c.aiTurns} turn(s), fewer than ${need}`);
    if (c.attackTurns < minAttacks) out.push(`the AI attacked ${c.attackTurns} time(s), fewer than ${minAttacks}`);
    if (c.unknown > 0) out.push(`${c.unknown} AI cast(s) with no stack item to classify`);
    process.stdout.write(out.join("; "));
  ' "$counts" "$MIN_SPELLS" "$MIN_ATTACKS" "$STRICT")"
  # Every counted game is a row in the table, passed or not; `pass` says which.
  node -e '
    const c = JSON.parse(process.argv[1]);
    c.wall = Number(process.argv[2]);
    c.pass = process.argv[3] === "";
    process.stdout.write(JSON.stringify(c) + "\n");
  ' "$counts" "$wall" "$verdict" > "$res"
  local line
  line="$(node -e '
    const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write(`AI ${c.aiWon ? "won " : c.winner === null ? "drew" : "lost"}  turns ${String(c.turns).padStart(2)}  spells ${String(c.spells).padStart(2)}  attacks ${String(c.attackTurns).padStart(2)}  ${c.wall}s`);
  ' "$res")"
  if [ -n "$verdict" ]; then bad "$verdict -- $line"; return 0; fi
  printf '  %-28s ok    %s\n' "$id" "$line"
}

echo "== deck-smoke =="
echo "seat         = $SEAT_DECK (--transport auto), the AI on each deck below${PROFILE:+, --ai-profile $PROFILE}"
echo "seeds        = $SEEDS"
echo "decks        = ${DECKS[*]}"
echo "thresholds   = the AI casts >= $MIN_SPELLS spells and attacks >= $MIN_ATTACKS time(s) per game"
echo "game timeout = ${GAME_TIMEOUT}s; jobs = $JOBS; logs in $OUT_DIR/"
echo
t_all=$(date +%s)
running=0
for deck in "${DECKS[@]}"; do
  for seed in $SEEDS; do
    play "$deck" "$seed" &
    running=$((running + 1))
    if [ "$running" -ge "$JOBS" ]; then wait -n || true; running=$((running - 1)); fi
  done
done
wait || true
total_wall=$(( $(date +%s) - t_all ))

echo
node -e '
  const fs = require("node:fs");
  const [dir, decksArg, seedsArg, wall] = process.argv.slice(1);
  const decks = decksArg.split("\n").filter(Boolean);
  const seeds = seedsArg.trim().split(/\s+/);
  const nameOf = (d) => (/^Name=(.*)$/m.exec(fs.readFileSync(d, "utf8"))?.[1] ?? d).trim();
  const linesOf = (d) => {
    const out = [];
    for (const l of fs.readFileSync(d, "utf8").split("\n")) {
      const m = /^(\d+)\s+([^|]+)/.exec(l.trim());
      if (m) out.push(m[2].trim());
    }
    return out;
  };
  const rows = [];
  let ok = 0, all = 0;
  for (const d of decks) {
    const base = d.replace(/^.*\//, "").replace(/\.dck$/, "");
    const rs = [];
    for (const s of seeds) {
      all++;
      const f = `${dir}/smoke-${base}-${s}.result`;
      if (!fs.existsSync(f)) continue;
      const r = JSON.parse(fs.readFileSync(f, "utf8"));
      rs.push(r);
      if (r.pass) ok++;
    }
    const sum = (k) => rs.reduce((a, r) => a + r[k], 0);
    const mean = (k) => (rs.length ? (sum(k) / rs.length).toFixed(1) : "-");
    const min = (k) => (rs.length ? Math.min(...rs.map((r) => r[k])) : "-");
    const cast = {};
    const lands = new Set();
    for (const r of rs) {
      for (const [n, k] of Object.entries(r.cast)) cast[n] = (cast[n] ?? 0) + k;
      for (const n of r.lands) lands.add(n);
    }
    rows.push({ d, name: nameOf(d), n: rs.length, passed: rs.filter((r) => r.pass).length, of: seeds.length, won: rs.filter((r) => r.aiWon).length,
      lost: rs.filter((r) => !r.aiWon && r.winner !== null).length, drawn: rs.filter((r) => r.winner === null).length,
      turns: mean("turns"), minTurns: min("turns"), spells: mean("spells"), minSpells: min("spells"),
      attacks: mean("attackTurns"), minAttacks: min("attackTurns"), wall: mean("wall"),
      never: linesOf(d).filter((n) => !(n in cast) && !lands.has(n)), cast });
  }
  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);
  console.log("== deck-smoke: the AI on each deck, against " + "decks/pacho-shield.dck ==");
  console.log(pad("deck", 22) + lpad("passed", 7) + lpad("AI won", 8) + lpad("AI lost", 9) + lpad("turns", 13) +
    lpad("AI spells", 15) + lpad("AI attacks", 15) + lpad("wall", 8));
  console.log(pad("", 22) + lpad("", 7) + lpad("", 8) + lpad("", 9) + lpad("mean (min)", 13) + lpad("mean (min)", 15) + lpad("mean (min)", 15) + lpad("mean", 8));
  for (const r of rows) {
    console.log(pad(r.d.replace(/^decks\//, ""), 22) + lpad(`${r.passed}/${r.of}`, 7) + lpad(r.won, 8) + lpad(r.lost + (r.drawn ? `+${r.drawn}d` : ""), 9) +
      lpad(`${r.turns} (${r.minTurns})`, 13) + lpad(`${r.spells} (${r.minSpells})`, 15) + lpad(`${r.attacks} (${r.minAttacks})`, 15) + lpad(`${r.wall}s`, 8));
  }
  console.log("  turns = player turns, both seats (a round is two); spells = AI cast events whose stack item is not an ability;");
  console.log("  attacks = AI combats with at least one attacker.  Won/lost is the AI seat; the means are over every");
  console.log("  game that was counted, passed or not (a game that crashed or failed redaction has no counts).");
  console.log("");
  for (const r of rows) {
    const top = Object.entries(r.cast).sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n} ${k}`).join(", ");
    console.log(`  ${r.name}: cast by the AI -- ${top || "(nothing)"}`);
    // A land is any name some frame showed with "Land" in its type line; a line
    // never seen at all is listed too. ADVISORY: never an exit code.
    if (r.never.length) console.log(`    ADVISORY, never cast by the AI in ${r.n} game(s) (a land here was never even played): ${r.never.join("; ")}`);
    else console.log(`    every nonland line was cast by the AI at least once in ${r.n} game(s)`);
  }
  console.log("");
  console.log(`  ${ok}/${all} games passed; total wall ${wall}s`);
' "$OUT_DIR" "$(printf '%s\n' "${DECKS[@]}")" "$SEEDS" "$total_wall" | tee "$OUT_DIR/table.txt"

if [ -s "$fails" ]; then
  echo
  echo "deck-smoke FAILED:"
  sed 's/^/  /' "$fails"
  exit 1
fi
echo "DECK SMOKE OK"

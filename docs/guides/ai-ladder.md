# The AI ladder — manual

*D317–D320. `tools/ai-ladder.sh`, `tools/ai-ladder/`. What was measured with it is
[`docs/evidence/ai-ladder.md`](../evidence/ai-ladder.md); the design's place in
the AI roadmap is [`docs/research/ai-architecture.md`](../research/ai-architecture.md) §9.*

The ladder answers one question, night after night: **how strong is each AI
config, on one scale, with an honest interval?** Every config is a named player;
every game is an ai-bench game (D309) on fixed deck pairs, each deal played from
both sides; the ratings are a Bradley–Terry fit on the Elo scale with stock
Forge's Default AI fixed at 1500. On top of the ratings sit three tools that
spend games where they decide something: an SPRT (is A stronger than B?), a
tuner (which parameter values?) and the league (the self-play loop).

Nothing here is in the gate: it boots Forge and takes hours. Its logic is
unit-tested engine-free in `web/test/ai-ladder.test.ts` (step 13, CI).

## Quick start

```bash
./bridge/build.sh                               # once: bridge/out
./tools/ai-ladder.sh list                       # the players, and which this checkout can play
./tools/ai-ladder.sh run --hours 1 --jobs 2     # rate them for an hour
./tools/ai-ladder.sh report                     # var/ai-ladder/report.html + ladder.json
```

## Players: `tools/ai-ladder/players.json`

One line per player: `{"name", "kind", "params", "anchor"?, "note"?, "from"?, "candidate"?}`.

| kind | params (default) | ai-bench seat config | available |
|---|---|---|---|
| `forge` | `profile` (Default \| Cautious \| Reckless \| Experimental), `sim` (none \| full \| hybrid) | `Reckless`, `Default+sim` | always |
| `policy` | `profile`, `outlets` (on \| off \| shadow; on) | `Default+outlets` | always (D309/D310) |
| `search` | `profile`, `outlets`, `budgetMs` (1500), `cands` (6), `turns` (0), `rounds` (2), `margin` (20), `maxRounds` (12), `what` (pab) | `Default+outlets+search:ms=1500,cands=6,...` | yes, since the search AI merged (D312–D314); `search-v1` is the game's `--ai-policy search` with its defaults |
| `search-eval` | the search's, plus `model` (a model hash) | — | not yet: the evaluator has no bench option (branch c/evaluator) |

- **A name is permanent.** A player's identity in the results is its **config
  hash** (sha256 of the kind and the params with defaults filled, 12 hex
  digits). Games are credited to whichever registered player has that hash, so
  a tuner's candidate that is later registered keeps its games; and if someone
  edits a played player's params, its old games stay with the old config, rated
  apart as `name@hash` ("old config" in the report). Add a new name instead.
- **Anchors** (`"anchor": true`) are stock Forge: `forge-default`,
  `forge-reckless`, `forge-cautious`, `forge-experimental`. They are always in
  the pool, the scheduler always gives them a share, and `forge-default` is the
  scale's zero, 1500.
- **Unavailable is not an error.** An unknown kind, or a known one whose engine
  side is missing from this checkout, is listed with its reason and never
  scheduled; `sprt` or `tune` naming it stops with the reason.
- Tools only **append**: `tune` writes its winner as `<base>-t<n>` (or
  `--name`, with `-2`, `-3`… if taken) and never edits an existing line. The
  writer keeps one player per line, so an append is a one-line diff to commit.

## How a game is played

A **batch** is one `AiBench play` JVM: `--a <cfg> --b <cfg> --games 4 --mirror
--seed <bseed>` over `--batch-pairs` deck pairs from `--pairs`
(`tools/ai-bench/pairs-cube.txt`, the ten Forge-drafted cube pairs). For each
pair the four games are both decks on both seats, and `--mirror` (the one hook
the ladder added to ai-bench) gives games 0 and 3, and 1 and 2, the same seed:
the same deck in the same seat with the same shuffle, the two configs swapped.
Each deal is played once from each side. The JVM's own start (~5–20 s) is paid
once per batch, so batches are minutes long: `run`'s default is ten pairs, 40
games (~2.5 min at 3.8 s a game).

**Seeds** are allocated so that results line up: batch k of a matchup on a host
uses `--seed` = the host's base + k and a fixed set of pairs for k, so "x vs
z, batch 3" and "y vs z, batch 3" are the same deals — x's and y's results
against a common opponent are paired, as in the bench. Each host has its own
base (a hash of its name), so a second PC deals different games. SPRT, tuner
and league tests use their own seed ranges.

Every game becomes one line of `var/ai-ladder/results/<host>.jsonl` (the
`GameRecord` in `tools/ai-ladder/results.ts`). **The log is append-only and one
file per machine**: to merge a second PC, copy its `results/<host>.jsonl` into
this PC's `var/ai-ladder/results/` (and its `sprt.jsonl`/`tune.jsonl` lines,
if you want them in the report). Ids are unique across machines and a line
read twice counts once. A draw (an ai-bench timeout or an engine error) is kept
in the log, counted in the report, and left out of the ratings.

## Ratings

`P(A beats B) = 1 / (1 + 10^((R_B − R_A)/400))`; `forge-default` is fixed at
1500; every other rating is the maximum a posteriori estimate under a normal
prior centred on 1500 with sd `--prior-sd` (350). The prior only matters for a
player with few or one-sided games (an unbeaten player still gets a finite
rating). Intervals are 95%: the Hessian's by default (fast; ±1.96 se), or
`--bootstrap N` resamples of mirror blocks (a deal from both sides is one
unit, because its two games are correlated). A player with no decisive game is
unrated. "vs forge-default" is the raw head-to-head record with Wilson's
interval, beside the fitted rating.

## `run --hours H --jobs J`

Runs batches on J workers until the time is spent (a batch starts only if it is
expected to end in time; Ctrl-C keeps every finished game). The next matchup,
whenever a worker frees (`tools/ai-ladder/schedule.ts`):

1. **New first**: a player with fewer than `--new-games` (40) decisive games,
   against forge-default until that pair has 40, then against its nearest
   rating.
2. **The anchor share**: if fewer than `--anchor-share` (25%) of this run's
   batches involved an anchor, the most informative pair with one.
3. **Most informative**: the pair maximising `p(1−p)·(se_A² + se_B²)`,
   discounted by batches of the same pair already running — close ratings and
   uncertain players first.

`--players a,b,c` limits the run to those; `--max-games N` stops after N games.

## `sprt A B --elo0 0 --elo1 20 [--alpha 0.05 --beta 0.05 --max-games 4000]`

Plays A vs B in batches of `--batch-pairs` (2 here: 8 games) until the test
decides "A is stronger than B by ≥ elo1" (H1) or "by ≤ elo0" (H0), or the game
limit says inconclusive. The unit of evidence is a mirrored pair (A's share of
its decisive games: 0, ½ or 1) and the statistic is the generalized SPRT on
those scores, `LLR = N((x̄−s0)² − (x̄−s1)²)/(2σ²)` with `s = 1/(1+10^(−elo/400))`,
stopping at Wald's bounds `ln(β/(1−α))` and `ln((1−β)/α)`; no decision before 8
pairs. It prints the games used, and appends a line to `var/ai-ladder/sprt.jsonl`.
Its games are ladder games too. Elo is the logistic scale above, not
"normalized" Elo. Rough cost: a true +70 decides in a few hundred games, a true
+20 against `--elo1 20` in a few thousand.

## `tune <base> --param k=v1,v2 [--param ...]`

Any int or enum parameter of the base's kind. The grid is every combination
(`--sample K` draws K of them, seeded by `--seed`). Successive halving
(`tools/ai-ladder/tune.ts`): in round r every surviving candidate plays
`--blocks · eta^r` batches against **each** opponent in `--pool`
(forge-default,forge-reckless), all candidates on the same deals; the score is
the win rate over all rounds; the best `ceil(n/eta)` survive (`--eta` 2) until
one is left or `--max-rounds`. The winner goes into `players.json` under a new
name (`--candidate` marks it for the league); if its config is already
registered the tuner says so and writes nothing. A line goes to `tune.jsonl`.

Without the search, on parameters that have always existed: `tune policy-outlet --param
profile=Default,Cautious,Reckless,Experimental --param outlets=on,off`.

## `league --hours H [--pool-size 4 --share 0.5 --elo1 20 --min-forge-games 80 --forge-margin 0]`

The self-play loop. State is `var/ai-ladder/league.json`: the current best
(`--start`, forge-default by default), the promoted versions, and every decided
candidate. The pool is the last `--pool-size` promoted versions plus the
available anchors. Each batch is either the best against the pool member it
has played least (`--share` of the batches), a pending candidate's test, or an
ordinary ladder batch. A candidate is a registry player with `"candidate":
true` not yet decided; its tests cycle candidate-vs-best (the SPRT, twice),
candidate-vs-forge-default and best-vs-forge-default on the same deals. It is
**promoted only if** the SPRT accepts H1 **and**, on those shared deals with at
least `--min-forge-games` decisive games each, its Elo against forge-default is
not below the best's by more than `--forge-margin`: no "beats itself, forgets
Forge" promotions. H0, an inconclusive SPRT or a failed Forge check rejects it.

## `report [--bootstrap N] [--out DIR]` and `ladder.json`

Writes `report.html` (one self-contained page: the ladder table, rating over
time, recent SPRT outcomes, tuner results, the league) and `ladder.json`.

**`ladder.json`, schema version 1** — the contract for ForgeCoach. A field may
be added within version 1; renaming, removing or redefining one is version 2 and
a change on ForgeCoach's side in the same breath (D297's rule).

```jsonc
{
  "schema": "mtg-table/ai-ladder",
  "version": 1,
  "generatedAt": "2026-10-03T14:00:00.000Z",
  "anchor": { "name": "forge-default", "rating": 1500 },
  "scale": "elo",                       // P(A beats B) = 1/(1+10^((Rb-Ra)/400))
  "ci": "hessian",                      // or "bootstrap:<samples>"; lo/hi are 95%
  "totals": { "games": 48, "decisive": 47, "draws": 1, "hosts": ["pc"], "first": "…", "last": "…" },
  "players": [                          // best first; rated players before unrated
    { "name": "forge-reckless", "kind": "forge", "params": { "profile": "Reckless", "sim": "none" },
      "hash": "77b72fd483b2", "anchor": true, "registered": true,
      "available": true, "unavailable": null,
      "rating": 1563.2, "lo": 1480.1, "hi": 1646.3, "rated": true,
      "games": 31, "wins": 18, "losses": 13, "draws": 1,
      "vsAnchor": { "wins": 9, "losses": 7, "rate": 0.563, "lo": 0.332, "hi": 0.769 } }
                                        // vsAnchor: head-to-head vs forge-default (Wilson 95%); null for the anchor or with no games
  ],
  "history": [ { "at": "…", "run": "<host>:<run>", "games": 47,
                 "ratings": { "forge-reckless": [1563.2, 1480.1, 1646.3] } } ],   // cumulative fit after each run, ≤ 60 points
  "sprt":   [ { "at": "…", "id": "…", "a": "…", "b": "…", "elo0": 0, "elo1": 20, "alpha": 0.05, "beta": 0.05,
                "result": "H1", "llr": 2.97, "lower": -2.944, "upper": 2.944,
                "games": 812, "pairs": 404, "score": 0.541, "purpose": "sprt" } ],     // newest first; result H1|H0|inconclusive|stopped
  "tune":   [ { "at": "…", "id": "…", "base": "policy-outlet", "vary": { "outlets": ["on", "off"] },
                "pool": ["forge-default"], "eta": 2, "games": 640,
                "winner": { "label": "outlets=on", "params": { … }, "hash": "…", "registeredAs": "policy-outlet" },
                "rounds": [ { "round": 0, "blocks": 1, "standings": [ { "label": "outlets=on", "wins": 21, "losses": 17, "score": 0.553 } ] } ] } ],
  "league": { "best": "forge-default", "pool": ["forge-default", "…"], "promoted": [ { "name": "…", "at": "…", "reason": "…" } ] }   // or null
}
```

Players include every registered one (unavailable ones too, with
`available: false` and the reason) and any unregistered config that has games
(`registered: false`, named `name@hash`). Ratings are rounded to 0.1, rates to
0.001.

## Overnight on the owner's PC (Ryzen 7 9700X, 7 workers, ~3.8 s a game)

About 6,600 games an hour on 7 workers, so 8 hours is about 50,000 games.

```bash
cd ~/code/mtg-table
./bridge/build.sh
# 1. The ladder: every available player, 8 hours, then the report.
./tools/ai-ladder.sh run --hours 8 --jobs 7 && ./tools/ai-ladder.sh report --bootstrap 200
# 2. Or settle one question first: is the outlet policy at least +20 over Default?
./tools/ai-ladder.sh sprt policy-outlet forge-default --elo0 0 --elo1 20 --jobs 7 --hours 2
# 3. Or tune today's knobs (8 candidates, about 2,000 games), then rate the winner overnight:
./tools/ai-ladder.sh tune policy-outlet --param profile=Default,Cautious,Reckless,Experimental \
    --param outlets=on,off --jobs 7 --candidate
./tools/ai-ladder.sh league --hours 6 --jobs 7 && ./tools/ai-ladder.sh report
```

Open `var/ai-ladder/report.html` in a browser. A second PC: the same commands
there, then copy its `var/ai-ladder/results/<its-host>.jsonl` into this PC's
`var/ai-ladder/results/` and run `report` again.

## The search, and the evaluator when it merges

- **The search (D312–D314)** is on `main`, and the `search` kind is available
  (its probe reads the bench source for the `+search` seat option). `search-v1`
  is exactly the game's `MtgTable --ai-policy search` seat: the Default profile,
  D310's outlet policy on, and `SearchConfig`'s defaults. A variant is a new
  line, e.g. `{"name":"search-v1-b3000","kind":"search","params":{"budgetMs":3000}}`
  (the seat `--ai-search ms=3000` would give), and the tuner can race its knobs:
  `tune search-v1 --param budgetMs=500,1500,3000 --param turns=0,1 --param
  what=p,pab`. If the bench's spelling of a knob changes, the one place to
  change is `SEARCH_KEYS` and `cfg()` in `tools/ai-ladder/kinds.ts`.
- **The evaluator (branch c/evaluator).** When the bench gains an option to load a model,
  write `search-eval`'s `cfg()` (its params already include `model`, a model
  hash) and drop its `available()` refusal; register
  `{"name":"search-v1-eval-<hash8>","kind":"search-eval","params":{"model":"<hash>"}}`
  with `"candidate": true` and let the league decide it. A new model is a new
  player (a new hash), never an edit.
- **Search's budget is wall clock**: rate search players on the machine that
  will play them, and never compare a game time from this shared container with
  the owner's PC.

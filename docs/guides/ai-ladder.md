# The AI ladder — manual

*D318–D321. `tools/ai-ladder.sh`, `tools/ai-ladder/`. What was measured with it is
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
./tools/ai-ladder.sh list                       # the players, which this checkout can play, the deck sets
./tools/ai-ladder.sh run --hours 1 --jobs 2     # rate them for an hour (confirm set)
./tools/ai-ladder.sh check                      # the data checks a pilot runs
./tools/ai-ladder.sh report                     # var/ai-ladder/report.html + ladder.json
./tools/ai-ladder.sh experiments                # the committed experiment log
```

On a machine whose checkout must stay clean (the owner's PC under `pc-jobs`),
pass `--experiments var/ai-ladder/experiments.jsonl` and, for `tune`,
`--registry var/ai-ladder/players.json` (a copy), and send those files back.

## Players: `tools/ai-ladder/players.json`

One line per player: `{"name", "kind", "params", "anchor"?, "note"?, "from"?, "candidate"?}`.

| kind | params (default) | ai-bench seat config | available |
|---|---|---|---|
| `forge` | `profile` (Default \| Cautious \| Reckless \| Experimental), `sim` (none \| full \| hybrid) | `Reckless`, `Default+sim` | always |
| `policy` | `profile`, `outlets` (on \| off \| shadow; on) | `Default+outlets` | always (D309/D310) |
| `search` | `profile`, `outlets`, `budgetMs` (1500), `cands` (6), `turns` (0 = to the end of THIS turn), `rounds` (2), `margin` (20), `maxRounds` (12), `what` (pab), `seed` (0 = clock); D350–D351's switches, out of the hash and the seat config while at their defaults: `aturns` (-1: attacks' own horizon), `override` (margin \| lcb) with `z`, `untapped` (1), `oracle` (off \| on: TEST ONLY); D388–D390's likewise: `anytime` (off \| on), `rank` (order \| prior) with `gen` (24), `rollout` (default \| outlets \| both); D417's likewise: `mull` (off \| on) with `mullMs` (6000) and `mullTurns` (3), `targets` (off \| on) | `Default+outlets+search:ms=1500,cands=6,...` | yes (D312–D314): `search-v1` was the game's `--ai-policy search` until D412; since then the game's seat is search-v2, which the ladder rates as `search-v1-anytime` (the same config, its name and hash unchanged; `--ai-search anytime=0` plays `search-v1` live); `search-v1-fixed3` is the fixed-rollout benchmark mode; `search-v1-fixed3-aturns1`, `-lcb` and `-oracle` are night 2's SPRT entrants (D350–D351); `search-v1-anytime` (against `search-v1`, wall clock on purpose), `search-v1-fixed3-ranked` and `search-v1-fixed3-routlets` are the week-3 search upgrades' (D388–D390); `search-v2-mull`, `search-v2-targets` and `search-v2-mull-targets` are search-v2 plus D417's opening-hand and target searches (fixed matches against `search-v1-anytime`). An `oracle` player reads the real hidden cards: `run` rates it only when `--players` names it, the league never takes it as a candidate, and the game's seat refuses `oracle=1` |
| `search-eval` | the search's, plus `model` (a model hash) | — | not yet: the evaluator has no bench option (branch c/evaluator) |

- **A name is permanent.** A player's identity in the results is its **config
  hash** (sha256 of the kind and the params with defaults filled, 12 hex
  digits). Games are credited to whichever registered player has that hash, so
  a tuner's candidate that is later registered keeps its games; and if someone
  edits a played player's params, its old games stay with the old config, rated
  apart as `name@hash` ("old config" in the report). Add a new name instead.
- **A code change is not a config change.** The hash is the params, so a fix
  to the engine side leaves a player's name and hash as they were, and its
  games before and after the fix are pooled unless you split them by the
  experiment log's git sha. Split them when a decision says the behaviour
  changed. For example, D466 (#184, 9fe69ad8) lets every search seat
  map and rank plays with an optional cost, which it used to drop or fall
  back on, so search results from before and after it are not pooled; and
  D472 (`pc/atlas-fork-altcost`) lets it map plays by an alternative cost
  (Snuff Out's life payment, flashback, foretell, ...), which threw or mapped
  to the base spell, so results from before and after D472 are not pooled
  either. The same holds, each for its own reason, for D476 (#201,
  0f9275b4), which maps a play by an effect's may-play permission (an
  adventure's creature from exile, impulse draw) that threw; D477 (#202,
  fb3f21f5), which plays a rollout on through Karn Liberated's restart where
  it errored; D478's addendum (#204, edd374c6), which scores a rollout the
  engine ended drawn as a draw, not a loss (D478 itself, #203, fbca6235,
  rescored the atlas's capped branches and left the search's rollouts as they
  were, so it alone does not split them); and D479
  (`pc/copier-effect-source-exiled-with`), which gives every fork's copied
  effect card its triggers, replacement effects and source and keeps every
  "exiled with" link, so a copied monarch draws and a copied adventure is on
  its adventure. Search results from before and after each of D476, D477,
  D478's addendum and D479 are not pooled.
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
--seed <bseed>` over `--batch-pairs` deck pairs of the command's deck set (below). For each
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
and league tests use their own seed ranges; `match` starts at the host base + 900,000, so two
matches against a common opponent (`x vs z`, `y vs z`) are played on the same deals.

Every game becomes one line of `var/ai-ladder/results/<host>.jsonl` (the
`GameRecord` in `tools/ai-ladder/results.ts`). **The log is append-only and one
file per machine**: to merge a second PC, copy its `results/<host>.jsonl` into
this PC's `var/ai-ladder/results/` (and its `sprt.jsonl`/`tune.jsonl` lines,
if you want them in the report). Ids are unique across machines and a line
read twice counts once. A draw (an ai-bench timeout or an engine error) is kept
in the log, counted in the report, and left out of the ratings.

## Deck sets: dev and confirm

Tuning and confirming on the same decks selects settings that exploit those
decks. So the ladder has two generated sets, from cube-lab drafts across six
cubes (fair-fight, modern-era, pauper, peasant, synergy, vintage; two AI
drafters and the lab's builder, `cubelab.sh run --games 0`, which drafts and
builds and plays nothing):

| set | file | used by |
|---|---|---|
| **dev** | `tools/ai-bench/pairs-dev.txt` | `tune` (always; it refuses the confirm set), pilots, exploration |
| **confirm** | `tools/ai-bench/pairs-confirm.txt` | `run`, `sprt`, `league`, and `ratings`/`report` (which rate only the confirm set's games unless `--set all`) |

Each cube's drafts, sorted by seed, are dealt alternately to dev and confirm,
so the split is a function of the drafts. The sets are drafted at the
**reserved seeds** 900,000,000+ (`ai-ladder.sh decksets --per-cube 10`, D340;
`tools/cubelab/seeds.ts`): the cube lab's runs and the overnight queue refuse
those seeds, so they never draft or play a deck-set deck, and the ML dataset
builders also drop any game whose deck matches a deck-set deck card for card.
The committed sets are 10 drafts per cube from seed 900,000,000, regenerated
on 2026-10-03 (the first sets, at seeds 9100–9109, were inside the range the
queue drafts, and the lab re-drafted them card for card): 30 pairs each.
Results on the old sets carry their own `setHash` in the experiment log. The decks are under `tools/ai-bench/decks/sets/`. The old
`pairs-cube.txt` (ten Forge-drafted pairs from two cubes) stays for D309–D314's
numbers and as `--pairs` for anything that must compare with them. **Never tune
on confirm**, and quote published numbers from confirm only.

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

Plays A vs B on the confirm set in batches of `--batch-pairs` (2 here: 8 games) until the test
decides "A is stronger than B by ≥ elo1" (H1) or "by ≤ elo0" (H0), or the game
limit says inconclusive. The unit of evidence is a mirrored pair (A's share of
its decisive games: 0, ½ or 1) and the statistic is the generalized SPRT on
those scores, `LLR = N((x̄−s0)² − (x̄−s1)²)/(2σ²)` with `s = 1/(1+10^(−elo/400))`,
stopping at Wald's bounds `ln(β/(1−α))` and `ln((1−β)/α)`; σ² is the pairs' sample
variance floored at 0.05, and no decision is taken before 100 pairs (D373; the old 8 pairs
and 0.01 are `--min-pairs 8 --var-floor 0.01`). **H0 means "A is not shown to be ≥ elo1
better", never "no gain"**: a gain between elo0 and elo1 is invisible to the test. It prints the games used, and appends a line to `var/ai-ladder/sprt.jsonl`.
Its games are ladder games too. Elo is the logistic scale above, not
"normalized" Elo. Rough cost: a true +70 decides in a few hundred games, a true
+20 against `--elo1 20` in a few thousand.

## `match A B --games N [--out FILE]`

A **fixed-size** paired match (D398): N games of A against B on the confirm set, rounded up
to whole batches of `--batch-pairs` (2: 8 games), in mirrored deals like `sprt`, and **no
stopping rule**. Use it when the question is "how big", or when the plausible effect is below
any elo1 worth an SPRT (an SPRT would spend its game limit to say H0). It reports A's score
over the mirror pairs with a 95% interval (x̄ ± 1.96·s/√N on the pair scores), the same in Elo
(the two ends mapped through the logistic scale, so not symmetric), the draws, errors and
timeouts, and **each side's search counters** read from the batches' ai-bench lines: decisions
searched, answers changed, fallbacks to Forge's answer by reason, and the budget-fallback rate
with a 95% interval clustered by game. A line goes to `var/ai-ladder/match.jsonl` (with
`--out FILE`, the same JSON to FILE, for a job's metrics); the games are ladder games too.
Planning: at a pair-score SD of about 0.35, ±20 Elo takes about 570 pairs (1,140 games),
±30 about 250 (`pairsForHalfWidth` in `tools/ai-ladder/match.ts`). Stopped early (the
deadline, a signal), the line says `complete: false` and the interval is over what was played.

## `tune <base> --param k=v1,v2 [--param ...]`

Any int or enum parameter of the base's kind, **on the dev set only**. The grid is every combination
(`--sample K` draws K of them, seeded by `--seed`). Successive halving
(`tools/ai-ladder/tune.ts`): in round r every surviving candidate plays
`--blocks · eta^r` batches against **each** opponent in `--pool`
(forge-default,forge-reckless), all candidates on the same deals; the score is
the win rate over all rounds; the best `ceil(n/eta)` survive (`--eta` 2) until
one is left or `--max-rounds`. The winner goes into `players.json` under a new
name (`--candidate` marks it for the league); if its config is already
registered the tuner says so and writes nothing. A line goes to `tune.jsonl`.
**The winner's score is optimistic** (it won a race on noisy scores — the
winner's curse), so it is never evidence: confirm the winner on the confirm set
with `sprt` or the league (`--candidate`).

Without the search, on parameters that have always existed: `tune policy-outlet --param
profile=Default,Cautious,Reckless,Experimental --param outlets=on,off`.

## `league --hours H [--pool-size 4 --share 0.5 --elo1 20 --ni-margin 30 --ni-alpha 0.05 --ni-beta 0.1]`

The self-play loop, on the confirm set. State is `var/ai-ladder/league.json`:
the current best (`--start`, forge-default by default), the promoted versions,
and every decided candidate. The pool is the last `--pool-size` promoted
versions plus the available anchors. Each batch is either the best against the
pool member it has played least (`--share` of the batches), a pending
candidate's tests, or an ordinary ladder batch. A candidate is a registry
player with `"candidate": true` not yet decided (`tune --candidate` sets it).

**A candidate is promoted only if both tests pass:**

1. **SPRT**, candidate vs best: "beats it by ≥ `--elo1`" (H1).
2. **Non-inferiority against forge-default.** Candidate and best each play
   forge-default on the same deals; each shared mirrored deal gives
   d = candidate's pair score − best's. A sequential test of H0 "inferior by
   δ" (mean d = −δ, δ = `--ni-margin` 30 Elo ≈ 0.043 in score) against H1
   "equal" (mean d = 0), Wald's bounds. Its stated error rates: a candidate
   truly 30 Elo worse than the best against Forge passes with probability
   `--ni-alpha` (5%); a candidate truly equal passes with probability
   1 − `--ni-beta` (90%). Simulated with correlated deals: 4.8% and 93.8%;
   a candidate 15 Elo worse passes 37%; 20 Elo better, 100%. Average cost:
   about 650 shared deals (≈ 1,300 games per side); a fixed-size test would
   need about 940 (`niPairsNeeded`). When the best is forge-default itself,
   d = candidate's pair score − ½, read from the SPRT's own games (they are
   already candidate vs forge-default), so no extra games are played.

H0 or an inconclusive SPRT, or an "inferior" or inconclusive Forge test,
rejects the candidate at once. (The first version compared two 80-game point
estimates with no margin: it rejected about half of the candidates equal to the
best and about 30% of those 20 Elo better — the methodology review's M5.)

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
  "league": { "best": "forge-default", "pool": ["forge-default", "…"], "promoted": [ { "name": "…", "at": "…", "reason": "…" } ] },  // or null
  "set": "tools/ai-bench/pairs-confirm.txt",   // the deck set the ratings are on, or "all"
  "experiments": [ { "at": "…", "id": "…", "cmd": "sprt", "purpose": "confirm", "status": "finished",   // newest first; status
                     "sha": "…", "dirty": false, "set": "…", "hypothesis": "…", "games": 812 } ]        // finished|stopped|failed|abandoned|running?
}
```

Players include every registered one (unavailable ones too, with
`available: false` and the reason) and any unregistered config that has games
(`registered: false`, named `name@hash`). Ratings are rounded to 0.1, rates to
0.001.

## Benchmarks that reproduce: mirrored deals, fixed rollouts, the experiment log

- **Mirrored deals, tested against 50%.** Every ladder game is mirrored, and
  `ai-bench.sh play` now mirrors by default too (`--no-mirror` reproduces the
  pre-D318 seeds). With deck and seat swapped, a config tied with its opponent
  scores exactly 50% by symmetry, so a comparison needs no separate
  Default-vs-Default control: `ai-bench.sh report` prints A's score against the
  known 50% by deal, with its interval, p and Elo. (A control's own luck, the
  47% in D312's confirmation, no longer leaks into the effect.)
- **Fixed rollouts.** `search-v1` budgets 1.5 s of wall clock per decision; on
  a busy machine a quarter of its decisions fell back to Forge (D312's
  evidence), so its strength depends on the machine. `search-v1-fixed3` is
  the same search with `rounds = maxRounds = 3`, `budgetMs` at its 60000
  ceiling and a fixed determinization seed: every searched decision does
  exactly three rounds, on any machine. Use it (or another fixed-count
  variant) for ladder, SPRT and tuner numbers; keep the wall clock for live
  play. Forge's own 5 s evaluation timeout is still wall clock — each game line
  records the machine's load and Forge's timeout count (`load`,
  `evalTimeouts`).
- **The experiment log** is committed: `docs/evidence/experiments.jsonl`.
  Every `run`, `sprt`, `tune` and `league` appends a start line before its
  first game (git sha and dirty flag, deck set and its hash, players and
  config hashes, seed base, purpose `pilot | dev | confirm`, hypothesis) and
  an end line when it stops (status, games, seed range, result). A start with no
  end is an abandoned run, and it stays in the log. Write `--hypothesis "…"`
  before a confirm run; `sprt`, `tune` and `league` write their own.
  `ai-ladder.sh experiments` lists it; the report shows it. Commit the file
  with the run's write-up.

## On the owner's PC (Ryzen 7 9700X, 7 workers)

Long runs go to the owner's PC as `pc-jobs` jobs (pilot, commands, abort-if,
report); the current ones are in `docs/evidence/ai-ladder.md` §4. About 3.8 s a
plain game and 7 workers: some 6,600 plain games an hour. A fixed-rollout search
game costs several times that, so budget search jobs in games, not hours.

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

## Known issues

- **synergy-1003, pair 0 of `tools/ai-bench/pairs-cube.txt`: one deal hit the
  game cap once (noted 2026-10-24, not investigated).** In the cloud's `+search`
  smoke for #191 (D470), one game on this pair ran 35 turns to the 300 s game cap
  and was scored a draw. It had 2 search step timeouts (`stepTimeouts`, D468)
  and 9 Forge AI evaluation timeouts. On the previous run, the same deal went 23
  turns in 85 s. D470 changed only block search, and nothing ties this game to
  it. If a pairs-cube run shows game timeouts, look at this pair first. Replay the
  deal (the bench line's `seed`) with and without `+search`, and set its
  `aiEvalTimeouts` and `cpuMs` against `ms`, so a busy machine is not mistaken
  for a hang.

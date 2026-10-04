# The cube lab

Design a two-player cube, then watch two Forge AIs draft it, build decks from
what they drafted and play those decks against each other, as many times as
you like, on your own machine. What comes out is a report — which colour pairs
and themes win, which cards get picked, make decks and win, which never do —
and the raw data behind it, every pick with the cards that were on offer, for
a drafting AI or a play AI to learn from later. No tokens, no network: Forge
plays every game.

The decisions are **D293–D297** (and **D299–D300** for *Evolve*) in [`DECISIONS.md`](../../DECISIONS.md); what
was measured is [`docs/evidence/cube-lab.md`](../evidence/cube-lab.md).

## One command

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 40 --jobs 4 --record 3
tools/cubelab.sh report var/cubelab/runs/synergy-cube-180-grid-1
```

Then open `var/cubelab/runs/synergy-cube-180-grid-1/report.html` in a browser.

Overnight, with every core busy (resumable — run the same line again after a
stop and it skips the drafts already done):

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 1000 --jobs 4 \
    --out var/cubelab/runs/overnight && tools/cubelab.sh report var/cubelab/runs/overnight
```

A draft and its best of three take about 25 s of one core; four workers on
four cores did 40 drafts in about ten minutes (the evidence file has the exact
numbers). Memory: each worker is a JVM with `-Xmx4096m` (hard rule 6), so
`--jobs` is bounded by RAM as much as by cores.

## The cube file

A cube is a markdown file in the shape of the two under `cubes/`:

```markdown
## The list (name — themes)
### White (24)
Thraben Inspector — ART ETB SAC · Spirited Companion — ETB SAC · …
### Gold (20)
WU: Reflector Mage — ETB removal · Soulherder — ETB CTR
### Lands (20)
Shocklands: Hallowed Fountain, Watery Grave, …
Pathways: Hengegate 4.85 · Clearwater 4.47 · …
```

- Any `## The list…` heading opens the list; each `### Name (N)` is a section,
  and `check` warns when a section does not hold the N it promises.
- Items are separated by ` · `. After a name, ` — ` starts its tags:
  **UPPER-CASE codes are themes** (`SAC`, `TOK`, `LIFE`; a colour pair like `WU`
  is not one) and lower-case words are roles (`removal`, `counter`). A trailing
  number is a price and is dropped.
- A `Shocklands:` / `Fetchlands:` / `Pathways:` line may use commas; a Pathway
  given by its first word becomes `<word> Pathway`, the front face Forge keys the
  card by.
- A `| Code | Theme | … |` table names the themes in the report; a
  `| WU | <plan> | … |` table names the colour pairs' archetypes.

`tools/cubelab.sh check <cube.md>` looks every card up in the engine's own
database and lists what is missing (with spelling suggestions), two-faced cards
(looked up by the front face), Forge's `AI:RemAIDeck` cards — the ones Forge
says its AI plays poorly or not at all, worth knowing before you read a card's
win rate — and the cards Forge has no draft rank for.

## Ratings

`tools/cubelab.sh ratings init <cube.md>` writes `<cube>.ratings.tsv` beside the
cube: one line per card, `name  rating  forge  source`. The rating starts as
Forge's own draft score for the card's best-ranked printing — CubeCobra's cube
list first, then the set's rank file — because Forge's default printing is often
a recent reprint with no rank at all, and a card with no rank scores −100 in
Forge ("draft it last"); here it starts at `unrated` (40). **Edit the rating
column** to tell the drafters what you think a card is worth; `run` reads the
file beside the cube by default (`--ratings <tsv>` names another, and the
report says which it used).

## How the AIs draft (D294)

Forge 2.0.14 cannot run a two-player cube draft on its own: its Winston AI picks
at random and crashes deciding its colours, and it has no Grid draft. So the lab
drafts itself, with the same ingredients Forge's drafters use and a few of its
own. A drafter values a card it could take as

```
rating                                      the ratings TSV
+ synergy × Σ over the card's themes of √(min(synergyCap, picks sharing it))
+ colour term                               lean early, penalties once committed
+ fixing                                    a land or fixer that makes its colours
− remAIDeck                                 (0 by default)
```

- **Synergy** counts the drafter's picks that share a theme with the card — after
  it commits, only the picks in its colours. A hub card with three themes in a
  pile of sacrifice and token cards is worth a lot more than its rating.
- **Colours.** Forge's drafter commits to the colours of its first good pick and
  never looks back. Here a drafter only **leans** until it has made `commitAt`
  (a third) of its expected picks, then commits to its two heaviest colours —
  re-read at every pick, so it can still drift into a colour it keeps being
  passed. After that a card outside the pair costs `offColour`, unless it can
  be a **splash**: one colour off, at most one pip of it, rated at least
  `splashMinRating`, with `splashSources` ways to make that colour already
  picked — then it costs only `splash`.
- **Sets.** A grid line or a Winston pile is worth its best card plus `setRest`
  (0.6) of each other card.

**Grid** (the cubes' recommended format): 162 of the shuffled 180 laid out as 18
grids of 3 × 3, face up; the first drafter takes a row or a column, the second a
remaining one (3 cards if parallel, 2 if it crosses), the rest is discarded,
and the first pick alternates. **Winston**: 90 of the 180 face down, three
one-card piles; look at pile 1, take it or add the top card to it and look at
pile 2, then 3; declining all three takes the top card blind; a taken pile is
replaced by one card. The AI takes a pile when it is worth the expected value
of a blind card (the mean of the cards it has not seen) plus a margin
(`winstonMargin1..3`). Who opens is the seed's parity.

## How the decks are built (D294)

Every two-colour pair, with no splash and with each splash colour the pool can
support, is built and scored, and the best one plays:

- 23 spells chosen by rating plus synergy with the other candidates
  (`buildSynergy`), against a curve target of 3 / 6 / 5 / 4 / 3 / 2 at mana value
  0–1 / 2 / 3 / 4 / 5 / 6+; **16 lands and 24 spells** when the spells average
  `sixteenLandsAt` (2.5) or less, else 17 and 23;
- lands: the pool's duals and fetches that make two of the deck's colours (or
  the splash colour), then basics by pip count; a splash needs
  `splashDeckSources` sources and may take at most two basics to get them;
- score = mean rating + `deckPlayable` × playables (rated ≥ `playable`) +
  `deckTheme` × (best theme's count + half the second's) − `deckCurve` × distance
  from the curve − `deckCreatures` × creatures short of `creaturesMin` −
  `deckSplash` × splash cards.

Every deck is **40 cards with 16–17 lands**, two colours plus at most a
`maxSplash`-card splash. When no pair reaches 23 spells (a thin Winston pool),
a second pass (D298) scores three kinds of build together and plays the best:
a splash of up to `maxSplashStretch` cards; **18 lands and 22 spells**
(−`deckEighteenLands`); and **three full colours** on 17 or 18 lands, which
needs a land or fixer making its least-used colour (−`deckThreeColour` per
spell outside its best pair). The report counts these as *stretched*; when
even that fails, Forge's `BoosterDeckBuilder` builds the deck. Forge's builder
runs for every pool anyway, and the JSONL keeps its deck beside the lab's
(`--builder forge` plays Forge's decks instead, to compare).

## How the games are played (D295)

Each draft is a best of `--games` (3) between the two decks, both seats Forge's
AI under `--profiles` (Default, Default). Who is on the play alternates game by
game (and game 1 alternates draft by draft), so being on the play is spread
evenly; the report shows how much it is worth. A game that runs past
`--game-timeout` (300 s) is ended and recorded as a draw (`timeout: true`); a
game whose engine thread will not stop, or a worker that dies, is recorded as
an engine error with the games it finished, and a fresh worker carries on.

`--record M` plays the first M drafts' decks once more through
`mtgtable.RecordMatch` and keeps each game as a frame log in `<out>/frames/`,
seen from drafter A's seat. **To watch one, open ForgeCoach, choose Load file,
and pick the `.jsonl`** — it replays like any recorded game (the other seat's
hand stays hidden, as in every frame log). A recorded game is its own game of
the same two decks, not one of the counted ones.

### Recording every game, for the ML dataset (D315)

`--record-all` records **the games the workers play**, in the worker, while
they are played: every game of every draft, from **both chairs**, as two
gzipped frame logs —

```
<out>/games/<seed>/g<n>-seat0.jsonl.gz    drafter A's view (seat 0)
<out>/games/<seed>/g<n>-seat1.jsonl.gz    drafter B's view (seat 1)
<out>/cube.md                             the cube as drafted: the dataset's vocabulary
```

`--record-every N` samples instead: every game of each draft whose seed is a
multiple of N (`--record-every 1` is `--record-all`). Recording is off unless
one of the two is given, and a run without them writes exactly what it wrote
before.

Each log is a `RecordMatch --match` recording in all but name: the worker
reuses the bridge's own recorder (`mtgtable.SeatRecorder` around
`RecordMatch`'s spectator seam and `Snap.state`), so each chair's log is
redacted for that chair exactly as the bridge redacts a seat, and
`tools/check-redaction.mjs` (which reads `.gz`) passes it. The session header
carries a `lab` block — `run`, `cube`, `cubeFile`, `cubeSha`, `format`,
`match`, `draftSeed`, `game`, `gameSeed`, `onPlay` — and its `seed` is the
game's seed; `hello_ok.match` names the two decks `cubelab <seed> A` and
`cubelab <seed> B` (name and count only for the other chair, as always), so
the dataset keeps the two chairs of a game in one split and `--group-by match`
holds a draft's decks out. The game's row in `drafts.jsonl` gains
`recorded: {dir, bytes, frames, errors}`.

Then, from the repo root:

```bash
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/overnight    # -> <run>/dataset/
```

`--record M` still exists for watching a game in ForgeCoach (a plain
`.jsonl`, the `--record M` replay); `--record-all` is for training data.

### Decision records and mixed AI styles (D347)

A recorded game's seats are mtg-table's own AI controller (D309's, which with
no policy plays exactly as Forge's), so each chair's log also holds **that
chair's decisions** — `dir:"ai"` `decision` lines (protocol amendment M55): at
every decision with more than one legal answer (priority, attacks, blocks, the
targets of what it plays, choices, the mulligan), the legal options as tokens
(`pass`, `cast:<id>`, `land:<id>`, `attack:<ids>`, `block:<b>><a>`, ...), the
option chosen, the policy that chose it (`forge`, `outlets`, `search`), the
`state` frame it was taken in, and, when the search decided, its per-option
playouts, mean leaf score and win estimate. A one-option decision (a forced
pass) is counted, not written; a `decisions` line at the end of each log has
the counts. A seat's records are in its own log only — they name its hand —
and `check-redaction.mjs` fails a log holding the other seat's. The game's row
in `drafts.jsonl` gains `recorded.decisions`. `MTGTABLE_DECISIONS=off` in the
environment records as before D347 (for measuring their cost).

`tools/ml/policy_data.py --run-dir <out>` turns them into a policy dataset
(`tools/ml/README.md`).

**`--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25`** draws each
drafter's AI for each draft from the mix instead of `--profiles`: independently
for A and B, from a generator seeded by the draft's seed and a stream of its
own, so the draw is a pure function of the seed (any `--jobs`, a resumed run)
and the picks and decks are what they would be without it. An entry is a seat
spec, `<Profile>[+outlets][+search[:k=v/k=v]]` — inside a mix the search's
knobs are separated by `/`, since `,` separates the entries —, and
`--profiles` takes the same specs (`--profiles Default+search,Default`). Each
draft's `drafts.jsonl` line says which two seats played (`profiles`), the run
records the mix (`run.json`'s `profileMix`; resuming with another mix is
refused), and every recording's header names each seat's `profile` and
`policy` (`seats`) and the lab block the two specs (`seatA`, `seatB`) and the
lab version (`ver`, D341). A search seat thinks about 1.5 s a decision (`ms=`
lowers it): a mix with search plays slower games.

## Every flag

| flag | default | |
|---|---|---|
| `--format grid\|winston` | `grid` | |
| `--drafts N` | 10 | drafts, seeds `S` .. `S+N-1` |
| `--seed S` | 1 | a draft and its decks are a function of their seed; 900,000,000+ is reserved for the AI ladder's deck sets and refused (D340, *Seeds and versions* below) |
| `--games N` | 3 | best of N; stops at a majority. `0` drafts and builds only and plays nothing (the AI ladder's deck sets, D318) |
| `--jobs K` | 1 | worker JVMs, each in its own Forge home under `var/cubelab/homes/<k>/` |
| `--profiles A,B` | `Default,Default` | the AI of each seat: a profile (`forge-home/res/ai/*.ai`), optionally `+outlets` and `+search[:k=v,...]` (D347) |
| `--profile-mix S:w,...` | off | each drafter's seat drawn per draft from these seat specs and weights, seeded by the draft (D347, above) |
| `--ratings <tsv>` | `<cube>.ratings.tsv` if present, else Forge's ranks | |
| `--record M` | 0 | frame logs of M drafts' decks, in `<out>/frames/` |
| `--record-all` | off | every game played, both chairs, gzipped, in `<out>/games/` (D315), with each chair's decision records (D347) |
| `--record-every N` | 0 (off) | the same for each draft whose seed is a multiple of N |
| `--out <dir>` | `var/cubelab/runs/<cube>-<format>-<seed>` | the same `--out` resumes, under the same lab version only (D341) |
| `--allow-version-change` | off | resume a folder another lab version (code, jar, ratings, cube, weights) wrote; logged in `run.json` (D341) |
| `--deckset` | off | draft the AI ladder's deck sets at the reserved seeds; needs `--games 0` (`ai-ladder.sh decksets` passes it; D340) |
| `--play-explore on \| name=value` | off | a seeded share of the drafts play games whose decisions explore (D358, *Play exploration* below): `share=0.15,epsilon=0.05,closecall=0.02,opening=off` |
| `--builder lab\|forge` | `lab` | which deck plays |
| `--game-timeout <sec>` | 300 | a game past it is a draw |
| `--winston-cards N` | 90 | the size of the Winston stack |
| `--weights <file.json>` | | a partial object of the weights below |
| `--weight name=value` | | one weight; repeatable; wins over `--weights` |
| `--synergy <tsv>` | | learned pair synergy for both drafters (`learn` writes it; D301) |
| `--deck-synergy on\|off` | `off` | ...and for both deckbuilders (needs `--synergy`) |
| `--bridge a,b[,c]` | | a bridge run: no cube file; every draft's pool mixed from these cubes (below, D322) |
| `--bridge-ratio 0.5,0.5` | equal | each cube's share of a bridge pool |
| `--bridge-size N` | 180 | a bridge pool's size (at least 162, a grid's deal) |
| `--bridge-ratings even\|own` | `even` | rescale each cube's ratings to the pool's scale per draft, or keep them |

## The weights

`tools/cubelab/weights.ts` is the list and the defaults; the run's `run.json`
records the weights it used, and a run folder refuses to resume under different
ones.

| weight | default | what it does |
|---|---|---|
| `unrated` | 40 | the rating of a card Forge has no rank for |
| `landScale` | 0.45 | a nonbasic land's rating is scaled by this while drafting |
| `synergy` | 4 | points per shared theme, times √(picks sharing it) |
| `synergyCap` | 6 | at most this many picks count toward one theme |
| `lean` | 10 | before commitment, the pull of the drafter's colours |
| `commitAt` | 0.333 | commit after this share of the expected picks |
| `offColour` | 40 | after commitment, a card that cannot be played |
| `splash` | 15 | after commitment, a card that can be splashed |
| `splashMinRating` | 70 | a splash card is at least this good |
| `splashSources` | 2 | ...and this many sources of its colour are picked already |
| `fixing` | 12 | a land or fixer that makes both committed colours (half for one) |
| `setRest` | 0.6 | the weight of a line's or pile's second and later cards |
| `winstonMargin1..3` | 10, 5, 0 | how much better than a blind card pile 1, 2, 3 must be |
| `remAIDeck` | 0 | subtract for Forge's AI:RemAIDeck cards, picking and building |
| `playable` | 45 | a spell rated this or more is a playable |
| `deckPlayable` | 2 | deck score per playable |
| `deckTheme` | 1.5 | deck score per spell of its best theme (half for the second) |
| `deckCurve` | 1 | deck score lost per spell off the curve target |
| `deckCreatures` | 1.5 | deck score lost per creature short of `creaturesMin` |
| `creaturesMin` | 13 | |
| `deckSplash` | 3 | deck score lost per splash card |
| `maxSplash` | 3 | splash cards allowed |
| `maxSplashStretch` | 7 | splash cards allowed on the second pass, for a thin pool |
| `deckThreeColour` | 1.5 | second pass: points lost per spell outside a three-colour build's best pair |
| `deckEighteenLands` | 2 | second pass: points lost for an 18-land build |
| `splashDeckSources` | 3 | sources of the splash colour a deck needs |
| `buildSynergy` | 3 | spell choice: points per √(other candidates sharing a theme) |
| `sixteenLandsAt` | 2.5 | 16 lands when the spells' average mana value is at most this |

For example, to see how much the themes matter, run the same seeds twice:

```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 100 --jobs 4 --out var/cubelab/runs/syn-on
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 100 --jobs 4 --out var/cubelab/runs/syn-off \
    --weight synergy=0 --weight buildSynergy=0 --weight deckTheme=0
```

## What a run writes

`<out>/` holds `run.json` (the cube, its sha256, every option and weight),
`cards.json` (each card as the run saw it: section, colours, mana value, themes,
rating), `decks/<seed>-A.dck` and `-B.dck` (the lab's) and `-A-forge.dck` /
`-B-forge.dck` (Forge's builder's), `logs/worker-<k>.log` (the engine's own
output), `frames/` and `recordings.json` under `--record`, `games/` and
`cube.md` under `--record-all` / `--record-every` (above), and
**`drafts.jsonl`**, one line per draft:

```jsonc
{ "v": 1, "cube": "…", "seed": 7, "format": "grid", "dealt": 162, "aOpens": false,
  "drafters": [                                   // A, then B
    { "seat": "A",
      "picks": [ { "n": 1, "kind": "grid", "at": 1, "how": "col 2", "value": 144,
                   "seen": ["…the cards on offer…"], "took": ["…"] } ],   // pile | blind | forced for Winston
      "pool": ["…"],
      "deck": { "colors": "WU", "splash": "G", "main": [[1, "Snapcaster Mage"], …, [10, "Island"]],
                "spells": 23, "lands": 17, "curve": [6,7,5,2,1,2], "avgCmc": 2.6, "creatures": 13,
                "themes": [["ETB", 10], …], "score": 135.5, "parts": {…}, "alternatives": […], "stretched": false },
      "deckErrors": [], "played": "lab", "deckFile": "decks/7-A.dck",
      "forge": { "colors": "WU", "spells": 22, "lands": 18, "value": 22.7, "main": […] } }, … ],
  "match": { "games": [ { "n": 1, "onPlay": "B", "onPlayVerified": "B", "winner": "A",
                          "turns": 18, "ms": 11162, "timeout": false, "reason": "AllOpponentsLost",
                          "cpuMs": 21540, "gameCpuMs": 10870,       // the worker's CPU time, all threads / the game thread
                          "recorded": { "dir": "games/7", "bytes": 125523, "frames": 683, "errors": 0 } } ],  // D315, when recorded
             "winsA": 1, "winsB": 0, "winner": "A", "worker": 0 },
  "ms": { "draft": 15, "build": 20, "match": 24970 } }
```

`report <out>` reads the folder and writes `report.html` (one self-contained
page: no script, font or style from anywhere), `report.md` (the headline
numbers as text), `summary.json` (everything the two show) and `meta.json`
(below). Win rates there
are over decisive games, with Wilson's 95% interval — with a few dozen games
per colour pair, **the interval is the finding**; run more drafts before
reading much into a difference inside it.

To query every run folder and the whole queue with SQL or pandas, `tools/lab/warehouse.py`
(D363) copies `drafts.jsonl` into Parquet tables with a DuckDB file of views:
`docs/guides/lab-warehouse.md`.

## meta.json — for ForgeCoach's draft and deck assistant (D297)

`report` also writes `<out>/meta.json`, and `tools/cubelab.sh meta <out> [--cube
<cube.md>] [--min-pair-games 6] [--max-pairs 300]` writes it alone. ForgeCoach
reads it; **schema 1 is a contract** — fields may be added, never renamed or
redefined without a schema 2 on both sides.

```jsonc
{ "schema": 1,
  "cube":   { "name", "file", "cards": [{ "name", "colors": ["W"], "mv": 1, "types": ["Creature"], "themes": ["ART"] }] },
  "sample": { "drafts", "games", "seedRange": [1, 40], "aiProfile": "Default",
              "format", "shrinkage": { "prior": "beta", "mean": 0.5, "strength": 20 } },   // the last two are extras
  "cards":  { "<name>": { "picked", "seen", "pickRate", "avgPickIndex", "inDecks", "inclusionRate",
                          "games", "wins", "winRate", "winRateShrunk", "ci": [lo, hi] } },
  "archetypes": [{ "id": "BR-SAC", "colors": "BR", "primaryTheme": "SAC", "decks", "games", "winRate", "ci",
                   "keyCards": ["…"], "avgLands", "avgCurve": { "1": 6.3, …, "6+": 1 }, "sampleDecks": [["…40 names…"]] }],
  "pairs":  [{ "a", "b", "games", "winRateTogether", "lift" }],
  "lands":  { "overall": { "16": { "games", "winRate" }, "17": {…} }, "byArchetype": { "<id>": {…} } },
  "splash": { "games", "winRate", "vsNoSplash" } }
```

- **games / wins / winRate** are over decisive games of the decks a card (or
  pair, archetype, land count) was played in; `ci` is Wilson's 95% interval
  (`[0, 1]` with no games). `seen` is the drafts the card was dealt into;
  `avgPickIndex` its average position among its drafter's takes (1 = first).
- **winRateShrunk** = (wins + 20·m) / (games + 20): the mean of a Beta posterior
  whose prior is centred on m, the run's mean over every card-game observation,
  with the strength of 20 games. A 4–0 card moves to about 0.58, a 60–20 card
  goes to 0.70, a card never played is m. Rank cards by it, not by winRate.
- An **archetype** is a played deck's two colours plus its primary theme (the
  theme ≥ 5 of its spells carry): `BR-SAC`, or `BR` alone. **keyCards** rank its
  nonland cards by appearances × (the card's shrunk win rate inside those decks
  − the archetype's rate), positive ones only, at most 12. `sampleDecks` are
  its (up to three) winningest decks, card by card.
- **pairs**: two nonland cards in the same played deck, at least
  `--min-pair-games` decisive games together; **lift** = their shrunk win rate
  together ÷ the mean of their two shrunk win rates (above 1: better together
  than apart); the top `--max-pairs` by lift.
- **lands**: win rate by the played deck's land count; **splash**: the
  splashing decks' win rate, and `vsNoSplash` its difference from the rest.

## Evolve: a cube that changes by simulation (D299–D300, D331, D357)

`evolve` runs generations of the lab on a cube and swaps cards in from a seed
pool where the evidence says a card is dead or dominating, writing the next
version of the cube document each time. Omega (`cubes/omega-cube-180.md`, its
938-card pool `cubes/omega-seed-pool.tsv` and `cubes/omega-notes.tsv`) is the
cube it was built for.

```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
    --generations 2 --drafts-per-gen 30 --jobs 2 --seed 1 --out var/cubelab/evolve/omega-1
```

Overnight on a four-core PC (resumable: run the same line again after a stop;
a finished generation is skipped and a half-played one picks up its seeds).
At about 25 s of one core a draft, a 200-draft generation is some 20 minutes on
four workers, plus a confirmation batch of up to 300 drafts in a generation
that found something (below), so eight generations are three to six hours.
`--record-all` (or `--record-every N`) records both batches' games for the ML
dataset, as `run` does (D315):

```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
    --generations 8 --drafts-per-gen 200 --jobs 4 --seed 1 --record-all --out var/cubelab/evolve/omega-overnight
```

Then open `var/cubelab/evolve/omega-overnight/index.html`; the latest cube is
`omega-cube-180.md` in the same folder, and `changelog.md` says what changed and
why. Copy the cube over `cubes/omega-cube-180.md` when you agree with it.

**One generation.** Generation g drafts the cube going in (`gen-NN/input.md`)
over seeds `S + (g−1)·N` .. `S + g·N − 1` (grid, best of three, the run's
weights), then reads every card's numbers from the run's `meta.json` plus one
more: how often it went in the **first line taken** from its grid (3 of 9 cards
is the base rate, so a card that goes there every time is everyone's first
pick). A land's decks and games are counted from the played decks' full lists
(`meta.json` counts a deck's spells only, so there every land reads as never
played). **Nothing is pooled across generations** (D331, which replaced
D300's pooling): every decision reads one batch of drafts that no earlier
decision has looked at. Each card is then assessed:

| status | when |
|---|---|
| `dead` | a **candidate** (below): it sat in a drafter's pool whose played deck could cast it (its colours within the deck's, splash included) ≥ `minOnColour` times, and the test "at least `deadPlayRateHi` of those decks play it" fails — passed over when it was there to play. A gold card of a pair nobody drafted is not dead — it never had the chance (the changelog names such pairs) |
| `dominant-win` | a **candidate**: ≥ `minGames` decisive games in played decks, the test "it wins no more than the run's mean" fails (its games counted by deck, below), and it won at least `dominantMargin` over the mean |
| `dominant-pick` | a **candidate**: dealt in ≥ `minSeen` drafts, the test "it goes in the first line taken at most `dominantFirstPickLo` of the time" fails, and its shrunk win rate is at least the mean |
| `note-cut` / `note-keep` | the notes file says `cut` / `keep` (or `try` for a card already in) |
| `ai-limited` | Forge marks it `AI:RemoveDeck:All` or `:Random` (the pool's `forge_ai_flag`, or the engine's own facts): its numbers are reported, the status the AI evidence alone would give is shown beside them, and **only a note can cut it** |
| `builder-limited` | every land: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land (Mutavault) never, so a land's deck rate and win rate measure its pair, not the land; a land goes only by a note (the changelog lists the lands never played) |
| `rating-limited` | dead (or leaning dead) but rated under `deadMinRating`: the deckbuilder plays by rating, so the data cannot tell a weak card from an underrated one; **never cut** — `--explore` (below, D356) judges it by forcing it into decks at random, or raise its rating in a ratings TSV (`tools/cubelab.sh ratings init`, edit, then `evolve … --ratings <tsv>`; the loop then judges every rating, the pool's too, by that file) |
| `watch` | a lead — an on-colour play rate at or under `deadPlayRateHi`, or a win rate `watchWinMargin` over the mean — that has **not** passed its test: *insufficient data*, with the drafts per generation at which it would likely be discovered |

**Discovery, then confirmation (D331).** About 180 cards are looked at every
generation, so a test that is wrong one time in twenty per card is wrong
about several cards every generation: on a simulated cube where no card is
better than another, the old rule (a 95% interval per card) called some card
"dominant" in 43% of 30-draft generations, and in 90% once three generations
were pooled. Two looks fix it:

- **Discovery.** Every rule is an exact one-sided binomial test, and every
  test a cut could follow from (the cards no note, AI flag, land or low rating
  protects) is one family. Benjamini–Hochberg at `fdrQ` (10%) decides which
  pass: of the cards it flags, at most about one in ten is a fluke on
  average — and when nothing is really wrong with the cube, it flags anything
  at all in at most one generation in ten (2–3% in the simulation). A
  discovery is a **candidate**, not a verdict.
- **Confirmation.** When there are candidates, the generation plays a second
  batch of fresh drafts on the same cube, from a seed range nothing else uses
  (`S + confirmSeedOffset + (g−1)·confirmMaxDrafts` onward, into
  `gen-NN/confirm/`), and tests each candidate again, the same way, on that
  batch alone, with Holm at `confirmAlpha` (5%) across the candidates. Only a
  **confirmed** candidate is cut, so the chance that a generation cuts any card
  by chance is at most 5% whatever discovery did (under 0.5% in the
  simulation). The batch is sized for power `confirmPower` (80%) against the
  smallest effect that matters — a win rate `dominantEffect` over the mean, a
  first-line rate of `pickEffect`, an on-colour play rate of `deadEffect` — at
  the rate the card met observations in discovery, between `confirmMinDrafts`
  and `confirmMaxDrafts` drafts. A generation with no candidate plays no
  confirmation batch.
- **A repeat attempt pools (D357).** Every generation gives a candidate a new
  confirmation batch, so a card discovered again and again would get a fresh
  chance to confirm by luck each time, and a failed batch would be forgotten
  (J039's Fable of the Mirror-Breaker: 140 of 296 in generation 3, not
  confirmed; 179 of 316 in generation 4, cut — 319 of 612 together). Now a
  card's second, third… confirmation on the same rule is judged on **all** its
  confirmation batches pooled, the failed ones included, and its p is doubled
  for each earlier attempt before Holm (attempt j at `confirmAlpha` / 2^(j−1)),
  so whatever the number of attempts a card with no real effect is cut with a
  chance of at most 2·`confirmAlpha` (4.7% after eight attempts in the
  simulation, against 32% for each batch alone). A **first** attempt is judged
  exactly as before. The size filter reads the pooled rate. Knob
  `confirmPool` (1, the default; 0 is D331's rule); a folder started before
  D357 resumes under D331. Discovery is still never pooled.

The changelog and `index.html` show both: each candidate's discovery numbers
(with its p and BH q value) beside its confirmation numbers (with its
Holm-adjusted p), and whether it was confirmed; a swap's evidence names both
seed ranges. A *Confirmation history* table at the top of the changelog lists
every card that was ever confirmed or refused: each attempt with its batch's
own numbers and outcome, and every attempt pooled (D357).

**A card's games come in clumps**: one deck, against one opponent, best of
three (about 2.4 games). Win rates therefore count the deck's match as the
unit: the generation's *design effect* D — the spread of the decks' match
results over what independent games would give (1 for independent games, the
best-of-three stopping included) — divides a card's games and wins before its
test and its interval. The lab's own runs measure D at 1.08–1.21. Play and
first-line rates need no such correction: a card is in at most one pool and
one grid a draft.

**What it costs and what it finds** (`node tools/cubelab/evolve-sim.ts`, a
simulated 180-card cube with D ≈ 1.15 and about 0.6 decisive games per card per
draft, as Omega's runs give): a card played in 5% of the decks that could play
it is found and cut about nine times in ten at 200 drafts a generation. Win
rates are much harder: a card that adds 15 points to its deck's chance of
winning a game is confirmed about one time in six at 200 drafts, one in two at
400 and eight in ten at 600; one that adds 10 points, only one in five even at
600. So 30 drafts
a generation will almost never cut on AI evidence; 200 finds the dead; a
dominant card by wins needs 400–600 a generation, or a note.

**The swaps.** The cuts, in order — notes, then dominant by wins, by picks,
then dead, strongest first — each take the best-fitting pool card that keeps
every constraint, at most `swaps` a generation. A pool card is eligible when
Forge supports it, it is not in the cube, it has at most two colours, it is
rated at least `deadMinRating` (a card the drafters undervalue would only come
back `rating-limited`), no note says `cut` and no earlier generation cut it,
and it is **not
`AI:RemoveDeck:All`** (the AI cannot judge it) unless a note says `try`. Its
fit with the card it replaces is `fitSameClass` for the same colour class
(the same mono colour, the same gold pair, colourless, or a land) +
`fitTheme` per shared theme + `fitRole` per shared role − `fitMv` per mana
value of difference + `fitRating` × its rating ÷ 100 (for a dominant cut, the
rating counts only up to `dominantReplaceRatio` of the cut's, and costs above
it) + `fitBalance` × how far its themes and colours sit below the mean (0 to 1;
a tenth below is 1) + `fitTry` for a note's `try`. The constraints, from the
starting cube: exactly its size, singleton; each colour's nonland count within
`colourSlack` of its start; the land count exactly; at least as many fixers
(lands and nonland cards that make two or more colours); and every colour pair
keeps `minSignposts` gold cards. A swap never adds a violation. AI:RemoveDeck:All
cards that fit the weakest archetypes are listed as **human-test candidates**:
play them in real games, and add a `try` line to test one.

**The notes file** (`cubes/<cube>-notes.tsv`, e.g. `cubes/omega-notes.tsv`, or
`--notes <tsv>`) is `card<TAB>verdict<TAB>note`: `keep` (never cut), `cut` (cut
now if it is in the cube; never add it if it is not) or `try` (add it when a cut
makes room). It is Justin's verdicts from real games, and it wins over every AI
number. Omega's starts with v1's own design exclusions (*Power choices*: the
Power Nine, fast mana, Oko and the other draft-deciders, the cheat plans and the
two-card wins) as `cut`, so the loop never adds them. It is re-read every
generation, so it can be edited between runs.

**What a generation writes**, under `<out>/gen-NN/`: `input.md`, the run folder
`run/` (with `report.html` and `meta.json`), `cube.md` (the next version: the
swaps applied, the title's version bumped, the format-counts table and section
headings recounted, and one entry in its `## Iteration log` listing each swap
and its evidence; every other line as it was), `stats.json` (every card's
numbers and assessment, the balance by pair, colour and theme, the decision),
`section.html` and, last, `result.json`; and, when discovery found
candidates, `confirm/` (the confirmation batch's run folder, with its own
`meta.json` and `report.html`). `<out>/` holds `evolve.json` (options,
knobs, the constraints, each generation's swaps), `changelog.md`, `index.html`
(every generation, one self-contained page) and the latest cube under its own
file name. A folder made with another cube, pool, seed, drafts, games, profiles,
weights or knobs is refused. So is a folder another evolve is still running in
(`evolve.lock` holds its pid): two would append the same seeds and share the
workers' Forge homes. To decide a generation again — after editing the notes,
say — delete its `result.json` (and the later generations' folders) and run the
same line: its drafts are kept, even though the cube it read now carries a
different iteration-log line.

The drafts and decks are a function of the seed and the swaps a function of the
drafts' results, so a generation is repeatable from its `drafts.jsonl`; Forge's
games are not byte-for-byte repeatable (above), so a fresh run may swap
differently where the evidence is close — which is why a swap needs the
evidence to pass a threshold.

### The evolve knobs

`tools/cubelab/evolve.ts`'s `EVOLVE_DEFAULTS`; `--evolve name=value` changes one
(`--swaps M` is `--evolve swaps=M`), and `evolve.json` records them. They are
the evolve loop's own, not draft weights, so they do not touch `run.json`.

| knob | default | what it does |
|---|---|---|
| `swaps` | 6 | at most this many swaps a generation |
| `minSeen` | 15 | drafts a card must be dealt in before first-pick evidence counts |
| `minGames` | 20 | decisive games in played decks before win-rate evidence counts |
| `minOnColour` | 8 | on-colour pools a card must have sat in before play-rate evidence counts |
| `deadPlayRateHi` | 0.35 | dead: the upper bound of its on-colour play rate is at most this |
| `deadMinRating` | 60 | a dead card rated under this is `rating-limited`, never cut; and no pool card rated under it is added (unless a note says `try`) |
| `dominantMargin` | 0.05 | dominant by wins: its win rate must also be this far over the mean, in both batches (replaces D299's `dominantLoMargin`) |
| `dominantFirstPickLo` | 0.75 | dominant by picks: the first-line rate it is tested against |
| `fdrQ` | 0.1 | discovery: the false-discovery rate (Benjamini–Hochberg) over the generation's tests |
| `confirmAlpha` | 0.05 | confirmation: the chance of confirming any card by chance (Holm over the candidates) |
| `confirmPower` | 0.8 | confirmation: the power the batch is sized for |
| `dominantEffect` | 0.1 | confirmation is sized to confirm a card winning this far over the mean |
| `pickEffect` | 0.9 | ...a card going in the first line this often |
| `deadEffect` | 0.1 | ...a card played this often by the decks that could |
| `confirmMinDrafts` | 20 | the smallest confirmation batch |
| `confirmMaxDrafts` | 300 | the largest (also the spacing of the generations' confirmation seed ranges) |
| `confirmSeedOffset` | 1000000 | confirmation seeds start this far above `--seed` |
| `confirmPool` | 1 | D357: a repeat confirmation pools the card's every confirmation batch on the rule, at `confirmAlpha` / 2^(attempt−1); 0 is D331 (each batch alone); a folder from before D357 resumes with 0 |
| `watchWinMargin` | 0.12 | a win rate this far over the mean is a lead to watch |
| `colourSlack` | 2 | each colour's nonland count may move this far from the start |
| `minSignposts` | 2 | gold cards each colour pair keeps (or its starting count, if fewer) |
| `fitSameClass` | 4 | fit: the same colour class as the cut |
| `fitTheme` | 3 | fit: per shared theme |
| `fitRole` | 2 | fit: per shared role (removal, counter, …) |
| `fitMv` | 1 | fit: lost per mana value of difference |
| `fitRating` | 4 | fit: per 100 points of rating |
| `fitBalance` | 3 | fit: helping the weakest themes and colours (0 to 1) |
| `fitTry` | 20 | fit: the notes say `try` |
| `dominantReplaceRatio` | 0.9 | a dominant card's replacement is rated up to this share of it |
| `humanTest` | 10 | human-test candidates listed |

With 30 drafts a generation a card is dealt about 27 times, sits on colour in
some 5–15 pools and plays some 10–25 decisive games, so with some 400 tests in
the family almost nothing passes; the changelog's *insufficient data* table
says how many drafts would find the rest. Two hundred drafts a generation
finds the dead cards; dominance by wins needs 400–600 (above). An evolve
folder made before D331 is refused (its knobs differ): start a new `--out`.

### Judging the low-rated cards: `--explore` (D356)

The deckbuilder ranks spells by rating, so a card rated low (Delver of Secrets
19.7, Ephemerate 22.9) sits in on-colour pools and is not played: the loop can
only call it `rating-limited`, at any number of drafts. `--explore on` (or
`--explore share=0.3 --explore cap=4 …`) runs a seeded, logged experiment in
the **discovery** batches (confirmation batches never explore):

- a draft is *explored* with probability `share`; in it each seat's deck is
  built as always (the *choice* deck), and at most one *eligible target* — a
  nonland pool card rated under `deadMinRating`, not AI:RemAIDeck, castable in
  the deck's main colours, not chosen — is forced in, card c with probability
  v_c / max(Σv, `cap`) (v = `gold` for a multicolour card, else 1), replacing
  the lowest-rated spell of its mana value. `drafts.jsonl`'s `deck` is the deck
  that played; `explore.seats[k]` keeps the eligible list with its
  probabilities, `in`, `out` and the choice deck;
- the play and pick rules read every draft's **choice** decks (an unexplored
  run's numbers: the drafts, picks and choice decks are identical at the same
  seed), the win-rate rules, the mean, the balance and `meta.json` read the
  **plain** drafts only (a random subset of an unexplored run's), so no cut
  changes meaning;
- each target's *delta* compares the decks it was forced into with the decks
  where it was eligible and was not, weighted by the recorded probabilities
  (so a thin pool forcing more often biases nothing), a deck's match as the
  unit. The changelog's table at the top pools every generation: **holds its
  own when played** (delta shown above −`margin`), **weak when played** (shown
  below 0; a human test — the notes decide), *undecided*, or *too few* forced
  decks (under `minDecks`). **No verdict cuts a card**; `stats.json` has each
  generation's table and the health numbers (explored share, forced against
  expected, the balance of the choice decks' mean rating).

| `--explore` | default | what it does |
|---|---|---|
| `share` | 0.3 | the share of discovery drafts explored (the win-rate rules keep the rest) |
| `cap` | 4 | a target is forced with probability v / max(Σv, cap): one eligible mono card, 1/4 |
| `gold` | 4 | v of a multicolour target (its pair's decks are about a fifth as many) |
| `margin` | 0.1 | *holds its own*: delta shown above −margin |
| `minDecks` | 10 | forced (and control) decks before a card is judged |

At 2,000 drafts a generation and share 0.3, Omega's common low-rated cards
get 15–60 forced decks a generation and a gold one about 10; the rarest stay
*too few*. Exploration is part of `run.json`, the folder check and the version
stamp only when on, so a run without it is the old run.

### Raising the ratings exploration vindicates: `ratings apply` (D360)

A card that **holds its own when played** is rated too low for the builder to play it.
`ratings apply` turns the pooled table into a ratings file by one rule, `explore-eb`:

```bash
tools/cubelab.sh ratings apply cubes/omega-cube-180.md --from var/cubelab/evolve/omega-explore-2000 \
    --rule explore-eb --out cubes/omega-cube-180.ratings-raised.tsv      # an evolve folder: exact
tools/cubelab.sh ratings apply cubes/omega-cube-180.md --from changelog.md \
    --rule explore-eb --out cubes/omega-cube-180.ratings-raised.tsv      # a PC job's changelog: replays the drafts
```

- only `holds` moves; undecided, too few, weak and AI-limited (D343) cards keep their
  rating, and a rating is only ever raised (a weak card is the notes' question);
- each delta is shrunk toward 0 by empirical Bayes over every judged card;
- the new rating is the mean rating of the spells the card replaced in its forced decks
  (what delta was measured against) plus K × the shrunk delta, K = (top-pick line − the
  mean of those anchors) / 0.1;
- capped one step under the top-pick line (the 90th percentile of the cube's nonland
  ratings) unless delta's 95% interval is above 0, and then at the best nonland rating.

It writes the TSV (every other line the base's: `--base <tsv>`, or Forge's ranks as
`ratings init` writes them), a report of every change with its evidence and every judged
card left alone with why (`--report`, default beside the TSV), and the same as JSON. From a
changelog alone the anchors come from replaying the generations' discovery seeds without
games; the replay must match the changelog's explored drafts and every card's forced and
expected decks, or the command refuses. `--raise effect=0.1,topQuantile=0.9,pointsPerWin=auto`
and `--explore share=0.3,cap=4,gold=4,below=60` change the rule's and the replay's settings.

Omega's raised file is `cubes/omega-cube-180.ratings-raised.tsv`, made from J039 (report:
`docs/evidence/omega-ratings-raise.md`). It is **not** the default file beside the cube,
which `run`, the queue and bridge drafts would pick up on their own: pass it with
`--ratings` until the A/B (`node tools/cubelab/ratings-verify.ts --a <runs> --b <runs>
--raised docs/evidence/omega-ratings-raise.json`, PC job J064, D360's pre-registered
reading) says to promote it.

## Learning the drafters' values from the games (D301–D302)

The ratings start as Forge's draft ranks and the synergy term is a hand
weight. `learn` and `selfplay` replace guesses with what the lab's own games
say — on your machine, from Forge's games, no LLM and no network.

```bash
# fit card values and pair synergy from any run folders (no engine; seconds)
tools/cubelab.sh learn var/cubelab/runs/synergy-grid-40 --cube cubes/synergy-cube-180.md \
    --out var/cubelab/learned/synergy.ratings.tsv
# -> synergy.ratings.tsv  synergy.synergy.tsv  synergy.learn.md (.html)  synergy.learn.json

# draft with them (both drafters), and build with the pairs too
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 40 --jobs 2 \
    --ratings var/cubelab/learned/synergy.ratings.tsv \
    --synergy var/cubelab/learned/synergy.synergy.tsv --deck-synergy on

# the loop: self-play -> learn -> learned drafter vs baseline drafter, I times
tools/cubelab.sh selfplay cubes/synergy-cube-180.md --from var/cubelab/runs/synergy-grid-40 \
    --iterations 2 --drafts-per-iter 30 --h2h 40 --games 1 --deck-synergy on --jobs 2
```

**The model** (`tools/cubelab/learn.ts`). Every decisive game is one
observation, the two played decks entering with opposite signs:

```
logit P(A wins) = beta · (A on the play ? +1 : −1)
                + alpha · (Σ z over A's deck − Σ z over B's)        z = the prior rating, standardised
                + Σ delta over A's deck − Σ delta over B's          a card's deviation from its prior
                + Σ s over A's pairs   − Σ s over B's pairs         a pair's synergy
```

`delta ~ N(0, tauCard²)` and `s ~ N(0, tauPair²)`: an L2 penalty that is a
prior, so a card seen in four games stays where its rating put it and one seen
in four hundred goes where the games say. Pairs are only the `maxPairs` most
frequent nonland pairs with at least `minPairGames` decisive games in one deck.
Basic lands are no feature. Solved by Newton's method with a Cholesky
factorisation in plain TypeScript; the same games give the same files, byte for
byte. **alpha** says how well the prior ratings predict wins at all.

**What it writes.** `<x>.ratings.tsv` is a ratings file the lab already reads
(`--ratings`): `rating = prior + K · delta`, plus the prior, delta, its
posterior SD, the card's **effective sample** (decisive games it was in exactly
one deck of), its wins and a status — `learned`, `unseen` (no game: kept at the
prior) or **`ai-limited`**: Forge's `AI:RemAIDeck` cards are kept at the prior
whatever their games say and are in no pair, because Forge's AI plays them
poorly and their record is the AI's, not the card's. `<x>.synergy.tsv` is
`a  b  points  logit  sd  games`, points = K · s. K, the rating points per
logit, is the prior's own exchange rate (rating SD ÷ alpha) when alpha is
clearly above zero, else `pointsPerLogitFallback` (150); the header says which.
`<x>.learn.md` is the readable summary — the movers, the pairs, alpha, the
effective samples — and the **held-out check**: the games split by draft into
five folds, each predicted by a model fitted on the other four, the full model's
log loss against the prior-only model's (alpha and the play), with the 95%
interval of the difference. If that interval crosses zero, the learned values
are not yet signal.

**Prior.** `--prior <tsv>`, else the ratings beside `--cube`, else the first
run's ratings file. Always learn against the original ratings, never against
an earlier learned file — `selfplay` does — so nothing compounds.

**Picking with pairs** (`--synergy`): a card gains the points of every pair it
makes with the picks the theme term counts (after commitment, the on-colour
ones). **Building with pairs** (`--deck-synergy on`): a candidate spell gains
its points with the spells already chosen, and the deck's score adds its pairs'
points per spell (`parts.pairs`). Off by default; without a synergy file
nothing changes.

**Self-play** (`selfplay`, `tools/cubelab/selfplay.ts`). Values v0 are the
cube's ratings (or learned from `--from` runs). Each iteration plays
`--drafts-per-iter` drafts with the current values on both seats, learns from
every self-play game so far, then plays `--h2h` **head-to-head** drafts: seat A drafts
and builds with the new values, seat B with the baseline ratings and no pairs,
on the same seeds every iteration (so iterations differ only by the values; the head-to-head games are never learned from, so those deals stay held out).
Who opens and who is on the play alternate as in any run, so a seat has no
edge of its own: **A's win rate over decisive games, with Wilson's 95%
interval, is the evidence the drafting AI got stronger.** A **control** runs first
(`--control on`, the default): the same head-to-head seeds with both seats on
the baseline — what seat A wins on those deals with nothing learned — and each
iteration is paired with it seed by seed: how many drafts the learned seat
turned from a loss into a win and back, with the exact sign test's p. `--deck-h2h N` adds
a head-to-head of the deckbuilder alone (both draft with the baseline; A builds
with the learned values). At the end every pool is rebuilt both ways offline
and the summary reports the change in deck value judged both ways (each builder
is best by its own measure, so this says how far apart they are, not which is
stronger). Everything is under `--out` (default
`var/cubelab/selfplay/<cube>-<seed>/`): `iter-<i>/selfplay/` and
`iter-<i>/h2h/` are ordinary run folders (`report` reads them),
`values-<i>.*` the learned files, `summary.md`, `summary.html` (self-contained) and `summary.json` the table.
Game play is Forge's AI on both sides in every mode: a better drafter shows up
only as better decks.

**How much is signal.** A 95% interval of ±5 points around 50% needs 385
decisive games; ±3 points needs 1,068. With `--games 1` that is a draft a game
(independent games are worth more than a best of three's correlated ones). Per
card, the data add precision of about a quarter per game the card is in (p(1−p)
near 0.5) against the prior's 1/0.25² = 16, so a card's posterior SD halves
(0.25 → 0.125 logits) after about 190 games in one deck; on the synergy cube a
card is in one of the two decks in about 28% of games, so that is about 700
decisive games, and telling a card ±0.1 logit (≈ ±2.5 points of win rate) from
its prior at 95% takes about 5,000. Run it overnight on the PC:

```bash
tools/cubelab.sh selfplay cubes/synergy-cube-180.md --from var/cubelab/runs/synergy-grid-40 \
    --iterations 4 --drafts-per-iter 300 --h2h 400 --deck-h2h 200 --games 1 \
    --deck-synergy on --jobs 4 --out var/cubelab/selfplay/synergy-overnight
```

| `learn` option (`--learn name=value`) | default | |
|---|---|---|
| `tauCard` | 0.25 | prior SD of a card's delta, logits |
| `tauPair` | 0.15 | prior SD of a pair's synergy, logits |
| `tauFixed` | 10 | prior SD of alpha and the play term (weak) |
| `minPairGames` | 8 | a pair needs this many decisive games in one deck |
| `maxPairs` | 300 | at most this many pair features |
| `pointsPerLogit` | 0 | rating points per logit; 0 = auto (rating SD ÷ alpha) |
| `pointsPerLogitMin`, `…Max` | 50, 400 | the auto rate's clamp |
| `pointsPerLogitFallback` | 150 | when alpha is not two SDs above zero |
| `minPairPoints` | 1 | smaller pairs are left out of the synergy TSV |
| `maxIter`, `tol` | 50, 1e-7 | Newton's method |
| `folds` | 5 | held-out check, by draft; 0 = none |

`selfplay` takes `run`'s flags (`--jobs`, `--games`, `--seed`, `--format`,
`--profiles`, `--ratings` for the baseline, `--weights`, `--weight`,
`--game-timeout`) plus `--iterations` (2), `--drafts-per-iter` (30), `--h2h`
(= drafts per iteration), `--deck-h2h` (0), `--deck-synergy on|off` (off),
`--control on|off` (on),
`--from <run-dir>` (repeatable) and `--learn name=value`.
## Bridge drafts and the overnight queue (D322–D323)

The matchup model (`tools/ml/matchup.py`, D324; `tools/ml/README.md`) rates
every card of every cube on ONE scale from games between whole decks. Games
inside one cube can only rank that cube's cards against each other; a
**bridge draft** puts two cubes' cards into one pool, so the decks it makes
link the cubes' scales, the way cross-pool games anchor an Elo ladder.

```bash
tools/cubelab.sh run --bridge pauper,modern-era --drafts 40 --games 1 --jobs 4
tools/cubelab.sh run --bridge fair-fight,vintage --bridge-ratio 0.6,0.4 --drafts 40 --jobs 4
```

**The pool** is sampled afresh for every draft from the draft's seed (rng
stream `bridge`, D294's rule: the same seed gives the same pool, picks and
decks anywhere): each cube gives its share (half each by default), spread
over that cube's own sections in proportion, so each half keeps its cube's
colour balance; a card both cubes list is taken once and the next card of the
same section stands in. A cube is named by its id (`fair-fight` for
`cubes/fair-fight-cube-180.md`) or a path.

**Ratings.** Each cube's ratings file (or Forge's ranks) rates its own
cards, and those scales differ: a drafter comparing them takes mostly the
stronger cube's cards, and the weaker cube's cards then rarely meet the other
cube's in a game. So by default (`--bridge-ratings even`) each draft rescales
each cube's cards to the pool's own mean and SD: within a cube the order is
kept, between the cubes the halves weigh the same. The model reads only what
was played, so this changes which cards meet, not what a game says.
`matchup.py`'s report shows each bridge deck's share from each cube.

**What it writes.** Every draft line in `drafts.jsonl` carries
`bridge: {sources, shares, from}` — `from` names the cube each card of the
pool came from — and `run.json` a `bridge` block (the sources with their
sha256, the shares, the size, the ratings mode); `cubeFile` reads
`bridge:<a>+<b>`. A run without `--bridge` writes exactly what it wrote
before. `report` reads a bridge folder like any other.

### The overnight queue

`tools/cubelab.sh queue` plans and plays a night of normal and bridge drafts
over all the committed cubes, into one root folder that every night adds to:

```bash
tools/cubelab.sh queue plan --night 1 --drafts 25000 --jobs 7            # print the plan, play nothing
tools/cubelab.sh queue run  --night 1 --drafts 25000 --jobs 7 --record-every 1   # play it; resumable
python3 tools/ml/matchup.py train var/cubelab/queue --out var/ml/matchup/night-1
tools/cubelab.sh queue run  --night 2 --drafts 25000 --jobs 7 --record-every 1 --power var/ml/matchup/night-1/power.tsv
tools/cubelab.sh queue run  --night 3 --drafts 25000 --jobs 7 --record-every 1 --power var/ml/matchup/night-2/power.tsv \
    --play-explore share=0.15,epsilon=0.05,closecall=0.02 --allow-version-change   # D358, below
```

| flag | default | |
|---|---|---|
| `--night N` | | the night; its plan is `<root>/night-N.json`, written once and re-read on a re-run |
| `--drafts D` | | the night's drafts (a new night only) |
| `--bridge-share x` | 0.2 | the share of bridge drafts |
| `--games N` | 1 | games a draft: fixed for the root (independent games are worth more than a best of three's) |
| `--chunk N` | 250 | drafts per run call; chunks of every key are interleaved, so a night cut short has some of everything |
| `--min-drafts N` | 20 | a key that would get fewer gets none, and its share goes to the rest |
| `--cubes a,b,…` | every `cubes/*-cube-180.md` | |
| `--power <tsv>` | | the matchup model's `power.tsv`: its `sdPost` column (the posterior SD, D342) drives the allocation; an old file with only a bootstrap `sd` is refused, and an AI-limited card counts 0 |
| `--allow-version-change` | off | append to key folders another lab version wrote (D341; logged in each `run.json`) |
| `--bridge-ratings even\|own` | `even` | as for `run` |
| `--record-every N` | 0 | passed to every run: record every game of every Nth draft in the worker, both chairs (D315; the night stops if a run did not record) |
| `--play-explore share=…,epsilon=…,closecall=…,opening=on\|off` | off | a seeded share of every chunk's drafts play games whose decisions explore (D358, *Play exploration* below); recorded in the night's plan, and a re-run of the night must not change it |
| `--root <dir>` | `var/cubelab/queue` | |

**No double work.** A draft is a function of its pool key (`normal/<cube>` or
`bridge/<a>+<b>`, a pair keyed in one order) and its seed. The root's
`queue.json` hands out each key's seeds once across all nights, the planner
refuses a plan that would repeat one, every key keeps one run folder that
nights append to, and `run` skips a seed its `drafts.jsonl` already holds, so
re-running a night plays only what never finished. One engine lookup covers
every cube's cards at the start; every chunk's lookup is then a subset of it
(the facts cache reuses a file that covers the names).

**Where the drafts go.** The bridge share is fixed; inside each half the
drafts follow weights, printed by `plan`:

- a cube's weight is Σ over its cards of var_c / m_c: var_c is the card's
  uncertainty (`--power`'s `sdPost`², else 1 / (16 + g_c/4), g_c its decisive
  games so far under the root, POOLED BY NAME across cubes), m_c the number of
  cubes listing it, so a card five cubes share is paid for once and a cube
  whose cards are well covered elsewhere gets fewer drafts;
- a pair's weight is novelty × link × uncertainty: novelty = 1 − shared /
  the smaller cube (Omega and Vintage share 108 of 180 cards, so their mix is
  mostly an in-cube draft again); link by power tier (flat: Pauper, Peasant,
  Fair Fight; middle: Synergy, Modern-Era; powered: Omega, Vintage): 1.0 for
  adjacent tiers, which chain the levels, 0.7 for flat with powered (lopsided
  games teach a logistic model little), 0.4 within a tier; a pair whose
  novelty × link is under 0.25 is skipped (Omega+Vintage 0.16, Fair
  Fight+Pauper 0.18).

The queue's knobs are `QUEUE_DEFAULTS` in `tools/cubelab/queue.ts` (the
plan file records them) and the tiers its `TIERS` table:

| knob | default | what it does |
|---|---|---|
| `bridgeShare` | 0.2 | the night's share of bridge drafts (`--bridge-share`) |
| `linkAdjacent` | 1.0 | a pair's link for adjacent power tiers |
| `linkFar` | 0.7 | ...for flat with powered |
| `linkSame` | 0.4 | ...for two cubes of one tier |
| `minPairWeight` | 0.25 | a pair whose novelty × link is under this is skipped |
| `tau` | 0.25 | the prior SD (logits) behind var_c from game counts when there is no `--power` |
| `minDrafts` | 20 | a key under this many drafts gets none (`--min-drafts`) |

### Play exploration (D358)

Every queue game is Forge's AI against Forge's AI, and Forge plays the same line from
the same position, so the positions the queue records for the learned evaluator follow
Forge's well-worn paths. `--play-explore` (on `queue run` and on `run`) spends a share
of the drafts on games that leave those paths a little:

- a draft **explores** with probability `share`, drawn from its own stream of the
  draft's seed (any `--jobs`, a resumed night, the same answer; the draft, picks and
  decks are untouched). Both seats of every game of an exploring draft explore;
- **epsilon**: each decision of an explorable kind -- what to play with a priority
  (pass, a land, Forge's own answer, or any spell or ability Forge would play with the
  targets it chose, or an untargeted spell it can cast), the attack, the blocks, and
  each single target of what it plays or triggers -- is replaced with probability
  `epsilon` by a uniformly random **legal** answer (an attack or a block redrawn until
  Forge accepts it). Mana, costs, modes and other choices stay Forge's;
- **closecall**: where Forge chose a creature by its own creature score (a target, or a
  creature an effect asks for), the legal creature of the same controller whose score
  is within `closecall` of it (relative) is a coin flip against it. Plain Forge scores
  nothing else per option, so this is the only close call a plain seat has;
- **opening=on** (off by default): who plays first is a coin instead of the
  alternation, and the seven-card mulligan decision is an epsilon decision.

Each seat's draws come from a generator seeded by the draft's seed, the game and the
seat (`mtgtable.ai.ExploreMath.seedFor`), never from Forge's own random stream, so a
re-run of the same draft plays the same decisions (measured: two runs of four exploring
drafts, 1,598 decision records, identical). Everything chosen at random is among the
seat's own legal options; nothing reads a hand, a library or a face-down card.

| `--play-explore` | default | |
|---|---|---|
| `share` | 0.15 | the share of drafts whose games explore |
| `epsilon` (`eps`) | 0.05 | per explorable decision, the chance of a random legal answer |
| `closecall` (`cc`) | 0.02 | the relative margin of a creature close call; 0 = off |
| `opening` | off | `on`: play/draw by a coin, the opening mulligan explorable |

**What it writes.** An exploring draft's line in `drafts.jsonl` carries `playExplore:
{epsilon, closeCall, opening}`, and each of its game rows `playExplore` with both seats'
counts (`decisionsRandomised`, `changed` -- of those, the ones that differ from the
seat's own answer -- `closeCalls`, `closeCallsChanged`, `coins`, `failures`, `byKind`,
and `onPlayDrawn` with `opening`). A recording's header carries `playExplore`; each
decision record the explorer answered carries `explore: {rule: random|closeCall, forge:
<the seat's own answer>}`; each seat's `decisions` summary line its counts (protocol
amendment M57). `run.json` and the night's plan record the settings.

**How to read it.**

- **Win rates leave exploring drafts out**: `report`, `meta`, `learn`, the queue's own
  coverage and `tools/ml/matchup.py` (whose `--play-explore include|only` brings them
  back for an experiment). A random move is not the deck's strength.
- **The position dataset keeps them** (`tools/ml/dataset.py`; `--play-explore
  exclude|only` to compare): the positions after a random move are real, and the game
  was played out from them.
- **The policy dataset drops every randomised decision** (`tools/ml/policy_data.py`),
  and keeps the rest of the game.
- Filter yourself with `playExplore` on a draft line or a recording's header, and
  `explore` on a decision record.

**Versions.** The settings are part of each folder's lab version (D341) when on: a night
that turns exploration on, off or changes it appends a new version to every key folder,
so it needs `--allow-version-change` (logged in `run.json`), and every line keeps its
`ver` and its `playExplore` tag. Night 3 needs the flag anyway when the code changed.

### Seeds and versions (D340–D341)

**Seeds belong to someone** (`tools/cubelab/seeds.ts`). A draft is a function
of its seed, so two tools drafting one cube at one seed make the same decks.
The line is split once: **1 – 799,999,999** is the lab's (plain runs, the
queue's ledger counting up from 1, selfplay, evolve); **800,000,000 –
899,999,999** is for pre-registered verifications (`matchup.py design` prints
its job there; the queue never reaches it); **900,000,000 – 999,999,999** is
**reserved** for the AI ladder's dev and confirm deck sets. `run` refuses a
reserved seed unless `--deckset`, which `ai-ladder.sh decksets` passes and
which requires `--games 0`: the lab never plays a deck-set deck, so none of
their games can reach a training set. The queue refuses a plan or a chunk
outside the lab range. The seed rule has a second line behind it: the dataset
builders drop any game whose deck *is* a deck-set deck, card for card,
whatever its seed (`tools/ml/reserved.py`).

**Every run says what made it** (`tools/cubelab/versions.ts`). `run.json`
keeps `versions`: each lab version that wrote to the folder, oldest first —
the HEAD commit (recorded), a hash of the committed tree under `bridge/src`,
`tools/cubelab` and `forge-home` and whether those paths are dirty (with a
hash of the diff), the Forge jar's sha256, the ratings file's (a bridge run:
each source's), the cube's, the weights', and the Node version (recorded) —
with the first seed it drafted. Every `drafts.jsonl` line carries `ver`, the
version's 12-hex id. **A folder is one version**: resuming under a different
code tree, diff, jar, ratings, cube or weights is refused, naming what changed;
`--allow-version-change` appends anyway and logs it in `run.json`
(`allowedChange`: the flag, what changed, the version before), so a reader can
split the folder by `ver` (`matchup.py train --ver`, `dataset.py --ver`). A
docs-only commit changes HEAD but not the tree hash, so it does not stop a
night. The queue's `night-N.json` lists every `queue run` of the night with its
commit, tree, diff and jar; a version refusal stops the night (every chunk would
fail the same way).

## What it does not do

- It never touches the game: no bridge code, no wire, nothing the board reads.
  It boots the same engine the same way (`mtgtable.Bootstrap`), under the same
  lint, and writes only under `var/` (and the ratings TSV you ask for).
- Forge's AI is the only player. A card the AI misplays — Forge marks some
  `AI:RemAIDeck` — will look worse than it is; `check` lists them and the
  report tags them.
- Games are not byte-for-byte repeatable: Forge's AI runs on its own threads.
  The drafts and decks are (the same seed gives the same picks and decks on any
  machine and any `--jobs`), and so are play exploration's draws (D358).

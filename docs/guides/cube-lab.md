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

## Every flag

| flag | default | |
|---|---|---|
| `--format grid\|winston` | `grid` | |
| `--drafts N` | 10 | drafts, seeds `S` .. `S+N-1` |
| `--seed S` | 1 | a draft and its decks are a function of their seed |
| `--games N` | 3 | best of N; stops at a majority |
| `--jobs K` | 1 | worker JVMs, each in its own Forge home under `var/cubelab/homes/<k>/` |
| `--profiles A,B` | `Default,Default` | the AI profile of each seat (`forge-home/res/ai/*.ai`) |
| `--ratings <tsv>` | `<cube>.ratings.tsv` if present, else Forge's ranks | |
| `--record M` | 0 | frame logs of M drafts' decks, in `<out>/frames/` |
| `--out <dir>` | `var/cubelab/runs/<cube>-<format>-<seed>` | the same `--out` resumes |
| `--builder lab\|forge` | `lab` | which deck plays |
| `--game-timeout <sec>` | 300 | a game past it is a draw |
| `--winston-cards N` | 90 | the size of the Winston stack |
| `--weights <file.json>` | | a partial object of the weights below |
| `--weight name=value` | | one weight; repeatable; wins over `--weights` |

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
output), `frames/` and `recordings.json` under `--record`, and
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
                          "turns": 18, "ms": 11162, "timeout": false, "reason": "AllOpponentsLost" } ],
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

## Evolve: a cube that changes by simulation (D299–D300)

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
a finished generation is skipped and a half-played one picks up its seeds):

```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
    --generations 6 --drafts-per-gen 200 --jobs 4 --seed 1 --out var/cubelab/evolve/omega-overnight
```

Then open `var/cubelab/evolve/omega-overnight/index.html`; the latest cube is
`omega-cube-180.md` in the same folder, and `changelog.md` says what changed and
why. Copy the cube over `cubes/omega-cube-180.md` when you agree with it.

**One generation.** Generation g drafts the cube going in (`gen-NN/input.md`)
over seeds `S + (g−1)·N` .. `S + g·N − 1` (grid, best of three, the run's
weights), then reads every card's numbers from the run's `meta.json` plus one
more: how often it went in the **first line taken** from its grid (3 of 9 cards
is the base rate, so a card that goes there every time is everyone's first
pick). When the generations just before it drafted the same list (none of
them swapped anything), their drafts are pooled with this one's — the same
list's evidence adds up, so a run of *insufficient data* generations settles
on its own. Each card is then assessed:

| status | when |
|---|---|
| `dead` | dealt in ≥ `minSeen` drafts, and the Wilson 95% upper bound of *decks it was played in ÷ drafts it was dealt in* is ≤ `deadDeckRateHi` |
| `dominant-win` | ≥ `minGames` decisive games in played decks, and the Wilson lower bound of its win rate is ≥ the run's mean + `dominantLoMargin` |
| `dominant-pick` | dealt in ≥ `minSeen` drafts, the Wilson lower bound of its first-line rate is ≥ `dominantFirstPickLo`, and its shrunk win rate is at least the mean |
| `note-cut` / `note-keep` | the notes file says `cut` / `keep` (or `try` for a card already in) |
| `ai-limited` | Forge marks it `AI:RemoveDeck:All` or `:Random` (the pool's `forge_ai_flag`, or the engine's own facts): its numbers are reported, the status the AI evidence alone would give is shown beside them, and **only a note can cut it** |
| `builder-limited` | a land that makes fewer than two colours (Mutavault): the lab's deckbuilder plays lands only for colour, so a low deck rate says nothing |
| `watch` | a lead — deck rate at or under `deadDeckRateHi`, or win rate `watchWinMargin` over the mean — that has **not** passed its threshold: *insufficient data*, with the drafts per generation that would likely settle it |

**The swaps.** The cuts, in order — notes, then dominant by wins, by picks,
then dead, strongest first — each take the best-fitting pool card that keeps
every constraint, at most `swaps` a generation. A pool card is eligible when
Forge supports it, it is not in the cube, it has at most two colours, no note
says `cut` and no earlier generation cut it, and it is **not
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
`section.html` and, last, `result.json`. `<out>/` holds `evolve.json` (options,
knobs, the constraints, each generation's swaps), `changelog.md`, `index.html`
(every generation, one self-contained page) and the latest cube under its own
file name. A folder made with another cube, pool, seed, drafts, games, profiles,
weights or knobs is refused. So is a folder another evolve is still running in
(`evolve.lock` holds its pid): two would append the same seeds and share the
workers' Forge homes.

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
| `minSeen` | 15 | drafts a card must be dealt in before deck-rate or first-pick evidence counts |
| `minGames` | 20 | decisive games in played decks before win-rate evidence counts |
| `deadDeckRateHi` | 0.15 | dead: the upper bound of its deck rate is at most this |
| `dominantLoMargin` | 0.05 | dominant: the lower bound of its win rate is this far over the mean |
| `dominantFirstPickLo` | 0.75 | dominant by picks: the lower bound of its first-line rate |
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

With 30 drafts a generation a card is dealt about 27 times and plays some 10–25
decisive games, so only clear cases pass; the changelog's *insufficient data*
table says how many drafts would settle the rest. Two hundred drafts a
generation is where most leads resolve.

## What it does not do

- It never touches the game: no bridge code, no wire, nothing the board reads.
  It boots the same engine the same way (`mtgtable.Bootstrap`), under the same
  lint, and writes only under `var/` (and the ratings TSV you ask for).
- Forge's AI is the only player. A card the AI misplays — Forge marks some
  `AI:RemAIDeck` — will look worse than it is; `check` lists them and the
  report tags them.
- Games are not byte-for-byte repeatable: Forge's AI runs on its own threads.
  The drafts and decks are (the same seed gives the same picks and decks on any
  machine and any `--jobs`).

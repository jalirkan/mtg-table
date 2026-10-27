# The cube lab

Design a two-player cube, then watch two Forge AIs draft it, build decks from
what they drafted and play those decks against each other, as many times as
you like, on your own machine. What comes out is a report — which colour pairs
and themes win, which cards get picked, make decks and win, which never do —
and the raw data behind it, every pick with the cards that were on offer, for
a drafting AI or a play AI to learn from later. No tokens, no network: Forge
plays every game.

The decisions are **D293–D297** (and **D299–D300** for *Evolve*) in [`DECISIONS.md`](../../DECISIONS.md), [D441](../decisions/D441-cube-population-compare.md) for *Comparing cube populations*, and [D446](../decisions/D446-census-shapes.md) for the census's *Shapes*; what
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

### The human-pick drafter (D416)

`--drafter human-picks:<ForgeCoach>/public/cubes/<cube>.picks.json` makes one seat
(`--drafter-seat`, default A) draft with ForgeCoach's pick model fitted to 17Lands'
human Powered Cube picks (ForgeCoach `docs/human-picks.md`) instead of the score
above; the other seat drafts as always, and both build with the lab builder and
the cube's ratings. `tools/cubelab/humanpicks.ts` computes each card's utility
`u = s·(1 + γ·t) + β·x` exactly as ForgeCoach's `humanPicks.ts` and its fitter do
(the tests check both). A card the file does not cover gets
`s = a + b·rating`, the least-squares line over the covered cards (in `run.json`).
A **grid line** is worth Σ exp(u) over its cards, taken best first, each against
the pool plus the cards before it: invariant to the logit's additive constant
(a crossing line holds 2 cards, a parallel one 3), and the best card dominates.
Grid only; one cube; no `--synergy`, `--bridge` or `--explore`. The drafter, its
seat and the file's sha256 are part of the folder's identity and version.

### The drafters, and how to name each (D439)

A plain run drafts both seats with the **lab drafter** above. `--drafter <spec>` gives one seat
(`--drafter-seat A|B`, default A) another drafter; the other seat stays the lab drafter, and both
seats build with the lab builder and the cube's ratings, so two mirrored folders on the same seeds
(the drafter at A in one, at B in the other) compare **picking** alone. Every drafter but the lab's is
grid only, on one cube, with no `--synergy`, `--bridge`, head-to-head or `--explore`; the spec, its
seat and what pins it (a file's sha256, a model's name) are part of the folder's identity and lab
version, so a folder never mixes drafters.

| drafter | on the command line | what picks | cost |
|---|---|---|---|
| the lab drafter | (no `--drafter`) | rating + theme synergy + colour lean, committing after a third of its picks (D294, above) | free |
| Forge's ranks | `--drafter forge-ranks` | Forge's own pick function in the lab's terms: each card at Forge's raw draft score (as `ratings init` seeds it, whatever the ratings file says), no synergy, no lean, committing after its first line (`synergy 0, lean 0, commitAt 0.04`, D439). An approximation of what D294 rejected, not Forge's code: Forge has no grid draft | free |
| the human-pick model | `--drafter human-picks:<ForgeCoach>/public/cubes/<cube>.picks.json` | ForgeCoach's 17Lands pick model (D416, above). It lost to the lab drafter on Vintage (J114) | free |
| an LLM | `--drafter llm:<haiku\|sonnet\|opus>[:thinking=off\|low\|default]` | Claude, asked once a decision through the logged-in Claude Code CLI (below) | **API money** |
| a fake LLM | `--drafter llm:fake` | the first line the prompt lists: no network, no spend; for tests, pilots and dry runs | free |

"Search AI" is not a drafter: search-v2 is a way of *playing* games (`--profiles …+search`, D347),
and it can pilot the decks any of these drafters build.

**The LLM drafter (D439, `tools/cubelab/llmdraft.ts`).** One fresh call per decision, 18 a draft,
with the LLM seat's CLI wrapper (`tools/llm-seat/lib/model.mjs`: every tool off, one turn, thinking
through coach-helper's two variables; `thinking` defaults to `low`, as the seat's). The system prompt
is the grid's rules and the reply format; the user prompt is the cube's name, a summary of its own
document (its "What it is", "The themes and how they connect" or "Design principles" section, else
its opening line and "Source and credit"; at most 600 characters), the grid with every card's name,
cost, type, P/T and oracle text (cut at 200 characters), the lines it may take, and its own pool so
far grouped by colour with mana value and type. `--llm-sees-opponent` adds the opponent's pool (grid
picks are public, so it hides nothing either way; the default keeps the prompt small). Nothing in a
grid draft is hidden: all nine cards are face up for both drafters.

- **The reply** is `{"take": "row"|"col", "index": 0..2, "reason": "…"}`, parsed strictly: the object
  alone (or in one ```` ```json ```` fence), no other key, an integer index, a line the rules allow. A
  reply that fails, or a call that fails, is sent back once with the fault named; a second failure
  takes the **lab drafter's line** for that decision and counts a **fallback**.
- **Cost accounting.** Each draft's line in `drafts.jsonl` carries `llm`: calls, retries, fallbacks,
  failed calls, input tokens (plain, cache read, cache write), output tokens, the CLI's own cost
  figure, the milliseconds inside the model and the draft's wall time, and every decision's line,
  reason and faults. The run prints the totals.
- **Determinism and resume.** The CLI exposes no temperature, so the answers are not a function of
  the seed; the deal, who opens, the other seat and every fallback are. Each finished draft's
  decisions go to `<out>/llm/<seed>.json` at once, and a resumed run replays that file instead of
  asking again: a stopped run never pays twice, and a folder's drafts can be rebuilt from it.
- **`--llm-jobs N`** (default 2, at most 4) drafts N seeds at once; the model is the wait, not the CPU.
  More lanes would not be faster for long (the CLI runs one question a lane, and the account's rate
  limit is shared) and each lane is one call the dollar cap's projection has to allow for.
- **The spend cap and the fallback stop** (the #144 review). One budget covers the whole run, every
  lane of it: `--llm-max-calls N` (model calls, retries included; no cap by default) and
  `--llm-max-usd X` (dollars at list price, the CLI's own cost figure summed; **default $5**, `none` to
  lift it) refuse the call that would pass them — the dollar check projects the next call at the
  run's mean cost a call so far, so it stops *before* crossing the cap, by at most one call a lane
  when the calls vary. A call the CLI reports no cost for, and a call killed in flight (a stop, a
  timeout), is charged the run's mean priced call, or $0.05 when none is priced, so a CLI that never
  reports a cost still stops at the default cap, after 100 calls. `--llm-fallback-rate R` (default 0.25; 1 never stops) ends the run once more
  than that share of its decisions so far fell back, the share taken over at least 8 decisions: a
  logged-out CLI, whose every call fails, stops after its third decision (six failed calls) instead of
  quietly drafting lab against lab under an `llm` label; 3 fallbacks in the first 9 decisions stop
  it, 4 spread over a draft of 18 do not. A stop names its reason (`the call cap`, `the spend cap`,
  `the fallback stop`) and the counts, kills the CLI calls in flight, abandons the draft in progress
  (the finished ones keep their replay files, so a resume does not pay for them again) and exits
  with an error; `<out>/llm/spend.json` holds the caps, the spend and why it stopped, written at the
  end of every LLM run, stopped or not.

**What it costs (measured, 2026-10-15).** The one real smoke, Vintage, seed 899,000,001, seat A
`llm:haiku` (thinking low), `--games 0`: 18 decisions, 18 calls, 0 retries, 0 fallbacks; 57,971
input tokens a draft (36 plain, 57,935 written to the cache, none read: every call is fresh and the
Claude Code CLI writes its prompt to the one-hour cache), 6,610 output tokens; 114.6 s wall, 6.4 s a
call; the CLI's cost figure $0.0149. At the same token counts, Sonnet 5.5's list price (claude-api
skill, prices cached 2026-10-06: $2 input, $10 output per million tokens, a one-hour cache write 2×
input) is about **$0.30 a draft** — 57,935 × $4 + 6,610 × $10 per million — and more if Sonnet
writes longer replies or thinks longer than Haiku did (+$0.07 a draft per doubling of the output).
On a Claude subscription login the CLI draws on the plan instead; the figure is what the API would
charge. **Running it at scale is Justin's call**: building the option was approved, spending on it
was not.

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
an engine error with the games it finished, and a fresh worker carries on. The
pool's own watchdog kills a worker that has not answered a draft's games in
games × (timeout + 40 s) + 120 s, timed on a monotonic clock (D459).

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

### Archiving a finished night to zstd (D370)

A queue night's recordings are gzip while they are written and while anything
may open them. Once the night is over, `tools/lab/archive.py` recompresses
them to `.jsonl.zst` (level 19; J065 measured 4.4x smaller than gzip on the
PC's nights, the committed fixtures 3.5x):

```bash
python3 tools/lab/archive.py night --root var/cubelab/queue --night 1 --dry-run   # expected savings only
python3 tools/lab/archive.py night --root var/cubelab/queue --night 1 --jobs 4    # resumable; re-run to resume
python3 tools/lab/archive.py dir var/cubelab/runs/X --jobs 4                      # a finished run folder
python3 tools/lab/archive.py restore PATH...                                      # back to a verified .gz
```

It refuses (exit 3, nothing touched) a night that is still running or has
unfinished drafts, deletes each `.gz` only after its `.zst` was read back from
disk and its SHA-256 matched, runs a sample through `check-redaction.mjs`
before and after, and writes `<root>/archive/night-N.json` (counts, bytes
before and after). The dataset builders and `check-redaction.mjs` read `.zst`
(Python needs the `zstandard` package, Node 22.15+); the Java readers
(coach-grade, leaf rows) do not, so the logs the gate lists name stay gzip and
`restore` brings back any other. A job reading an archived night must pin a
commit with D370.

### The cold drive: finished nights off the hot disk (D378)

Once nothing reads a night's recordings any more, `archive.py cold` moves them to the
archive drive. The drive is `config.json`'s `labArchiveRoot` (on the PC,
`/mnt/e/forgecoach-archive`, NTFS), or `--archive-root`, or `$LAB_ARCHIVE_ROOT`; an optional
second copy goes to `labArchiveMirror`. Each key folder becomes one `night-N/<key>.tar.zst`,
which holds the recordings decompressed so that one zstd stream sees them all. The night's
quarantine folder becomes `night-N/quarantine.tar.zst`, kept byte for byte as evidence.

```bash
python3 tools/lab/archive.py cold --night 1 --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --dry-run   # checks, drive, estimate
python3 tools/lab/archive.py cold --night 1 --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --jobs 4    # resumable
python3 tools/lab/archive.py restore-night --night 1                                     # back, verified
```

It refuses (exit 3) unless all of these hold:
- the night is closed;
- the night's redaction pass ran (its quarantine folder exists: `--quarantine DIR`, else
  `<root>-quarantine-nN`; night 1's is `var/cubelab/queue-quarantine`, with no suffix, and must be
  named; the folder is walked for its recordings, and `failed.txt` is not trusted);
- the warehouse ingested every line of the night;
- a dataset encoded at least 90% of its recordings;
- no hold in `tools/lab/archive-holds.json` names the night while a job the hold waits for is
  not `done`.

It skips with a warning (exit 4) when the drive is missing or read-only. A hot file is deleted
only after its archive has been read back from the drive and every member's SHA-256
matched. The manifests are on both sides (`<root>/archive/cold-night-N.json` and
`<drive>/night-N/manifest.json`), and the warehouse's `cold_archives` table and its
`recording_location` view read them. The `drafts.jsonl` files stay hot.

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
| `--drafter human-picks:<x.picks.json>` | off | one seat drafts with ForgeCoach's human pick model instead (grid only; *The human-pick drafter* above, D416) |
| `--drafter forge-ranks` | off | one seat drafts on Forge's ranks (grid only; *The drafters* above, D439) |
| `--drafter llm:<model>[:thinking=off\|low\|default]` | off | one seat asks Claude (`haiku`, `sonnet`, `opus`; `fake` spends nothing), once a decision (grid only; D439). **Costs API money** |
| `--drafter-seat A\|B` | `A` | which seat that is (a mirrored test runs both) |
| `--llm-sees-opponent` | off | the LLM's prompt also lists the opponent's pool (part of the folder's identity) |
| `--llm-jobs N` | 2 | LLM drafts asked at once, 1..4 |
| `--llm-max-calls N` | none | stop the run before its (N+1)th model call |
| `--llm-max-usd X\|none` | 5 | stop the run before a call that would take its spend (list price) past $X |
| `--llm-fallback-rate R` | 0.25 | stop the run once more than R of its decisions fell back (over at least 8; 1 = never) |
| `--shape-a`, `--shape-b` | `auto` | the seat's deck shape: `auto`, `two-colour`, `mono`, `three-colour`, `good-stuff` (grid; *Shapes*, D446) |
| `--shape-explore on \| share=x[,<shape>=w...]` | off | each auto seat forced to a weighted random shape with probability x, seeded by the draft (D446) |
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
`cube.md` under `--record-all` / `--record-every` (above), `llm/<seed>.json` under an LLM
drafter (each draft's decisions, replayed on resume; D439), and
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

With shapes on (D446), each drafter also carries `"shape": "mono", "shapeForced": true` and, when its shape
had no build and today's builder's deck played, `"shapeFallback": true`.

Under an LLM drafter (D439) a line also carries `"llm": { "seat": "A", "model": "haiku", "thinking":
"low", "resolved": "claude-haiku-…", "decisions": 18, "calls": 18, "retries": 0, "fallbacks": 0,
"callErrors": 0, "tokensIn": 36, "cacheRead": 0, "cacheCreate": 57935, "tokensOut": 6610,
"costUsd": 0.0149, "modelMs": 114437, "wallMs": 114559, "replayed": false, "picks": [ { "at": 1,
"line": "col 2", "by": "model", "reason": "…", "promptChars": 2610 }, … ] }` — `line` in the lab's
own 1-based names, as `picks[].how`; `by` is `model`, `retry` or `fallback`.

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
- **Lands** (D380): a nonbasic land's `inDecks`, `games`, `wins` and rates are
  counted like a spell's, over the played decks that ran it. The deckbuilder
  plays a dual or fetchland only in its own pair's decks, so a land's win rate
  measures its pair more than the land. Basics are not cube cards and have no
  entry; pairs, key cards and curves stay nonland.
- **picked, inDecks 0** is data, not a lost name (D380): a grid pick takes a
  whole row or column, so `picked` counts every card of it, and the deckbuilder
  chooses spells by rating, so a card rated low in the run's ratings rides along
  in picks and is never built (evolve's `rating-limited`, below).
- **winRateShrunk** = (wins + 20·m) / (games + 20): the mean of a Beta posterior
  whose prior is centred on m, the run's mean over every nonland card-game
  observation (lands do not move it), with the strength of 20 games. A 4–0 card moves to about 0.58, a 60–20 card
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

## Evolve: a cube that changes by simulation (D299–D300, D331, D357, D469)

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
pick). A land's decks and games are `meta.json`'s, which counts nonbasic lands
like spells since D380. **Nothing is pooled across generations** (D331, which replaced
D300's pooling): every decision reads one batch of drafts that no earlier
decision has looked at. Each card is then assessed:

| status | when |
|---|---|
| `dead` | a **candidate** (below): it sat in a drafter's pool whose played deck could cast it (its colours within the deck's, splash included) ≥ `minOnColour` times, and the test "at least `deadPlayRateHi` of those decks play it" fails — passed over when it was there to play. A gold card of a pair nobody drafted is not dead — it never had the chance (the changelog names such pairs) |
| `dominant-win` | a **candidate**: ≥ `minGames` decisive games in played decks, the test "it wins no more than its null" fails (its games counted by deck, below), and it won at least `dominantMargin` over that null. **The null (D377)**: in a run started after D377, the card's colour-adjusted expectation — the games-weighted win rate of its decks' colour pairs in the same batch, with both decks of its own matches left out and each pair shrunk 20 games toward the batch's deck mean (`tools/cubelab/colour-null.ts`; a normal test that adds the baseline's own error). A folder started before D377 keeps D331's null, the run's mean card win rate, for every generation (`evolve.json`'s `winNull`). Confirmation uses the same null on its own batch. |
| `dominant-pick` | a **candidate**: dealt in ≥ `minSeen` drafts, the test "it goes in the first line taken at most `dominantFirstPickLo` of the time" fails, and its shrunk win rate is at least the mean |
| `note-cut` / `note-keep` | the notes file says `cut` / `keep` (or `try` for a card already in) |
| `ai-limited` | Forge marks it `AI:RemoveDeck:All` or `:Random` (the pool's `forge_ai_flag`, or the engine's own facts): its numbers are reported, the status the AI evidence alone would give is shown beside them, and **only a note can cut it** |
| `builder-limited` | every land: the lab's deckbuilder plays a dual or fetchland only in its own pair's decks and a colourless land (Mutavault) never, so a land's deck rate and win rate measure its pair, not the land; a land goes only by a note (the changelog lists the lands never played) |
| `rating-limited` | dead (or leaning dead) but rated under `deadMinRating`: the deckbuilder plays by rating, so the data cannot tell a weak card from an underrated one; **never cut** — `--explore` (below, D356) judges it by forcing it into decks at random, or raise its rating in a ratings TSV (`tools/cubelab.sh ratings init`, edit, then `evolve … --ratings <tsv>`; the loop then judges every rating, the pool's too, by that file) |
| `watch` | a lead — an on-colour play rate at or under `deadPlayRateHi`, or a win rate `watchWinMargin` over the mean — that has **not** passed its test: *insufficient data*, with the drafts per generation at which it would likely be discovered |
| `balance` | **balance mode only** (`--balance <balance.json>`, D469; *Balance mode* below): a gold card of the colour pair whose drafted payoff sits furthest from .5 in a J145-shaped balance read, swapped for a seed-pool gold card of the same pair. A rule of its own, not `dead`: a rating under `deadMinRating` does not shield the cut |

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

### Balance mode: `--balance` (D469)

Evolve's rules above judge cards one at a time; none of them aims at a balance
between the colour pairs (`fitBalance` only weights the fit of an addition).
`--balance <balance.json>` turns on the **registered Omega swap rule** (the PC's
`study/omega-swap-rule.md`, accepted by Justin on 2026-10-23): one gold-for-gold
swap in the colour pair that a J145-shaped balance read finds furthest from
even.

```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
    --balance <J145-shaped run>/balance.json --generations 1 --drafts-per-gen 30 --jobs 4 --seed 1 \
    --out var/cubelab/evolve/omega-balance-1
```

- **The read** is a balance job's `balance.json` (J145's shape: `payoff.<arm>.colour`
  and `.pairs`, each cell `n`, `hits`, `est`, `lo`, `hi`), judged on the arm its
  `verdict.judgedPayoff` names (`Blab`: lab-drafted decks against each other).
  Only payoff is read: **pull never drives a swap** (Justin's answer 2 — not
  before 30 real Omega drafts).
- **The objective:** over the pairs with at least `balanceMinGames` (400) drafted
  deck-games — the smallest n at which an interval can sit inside the band at
  all — minimise max |pair payoff − .5|. The pair furthest from .5 is the
  target.
- **It refuses**, and says why, when a colour is OFF on that arm (the rule is
  written for a cube balanced at colour level), when no pair has 400 deck-games,
  when the target's interval includes .5 (nothing to fix), or when a label the
  read carries disagrees with its classifier (a `balanceBand` other than the
  read's). OFF / EVEN / UNCLEAR is J145's registered classifier
  (`payoffLabel` in `tools/cubelab/evolve-balance.ts`): OFF when the 95% interval
  excludes .5 and the point is at least `balanceBand` from it, EVEN when the
  interval sits inside [.5 − band, .5 + band], else UNCLEAR.
- **Cuts:** the cube's gold cards of that pair (nonland, exactly its two
  printed colours). Not a `keep` (or `try`) note's card, and not an AI-limited
  one unless a note says `cut`. A rating under `deadMinRating` does **not**
  shield a cut: that guard belongs to the `dead` rule, whose evidence is a play
  rate the drafters' ratings decide; a pair's payoff is not. They are tried in
  order of the generation's own evidence that the slot adds least to the pair's
  decks: the lowest on-colour play rate first, then the lowest rating.
- **Additions:** the pool's gold cards of that pair that evolve's own add rules
  admit (supported by Forge, no `cut` note, not cut before, not
  AI:RemoveDeck:All and rated at least `deadMinRating` unless a note says
  `try`); evolve's fit picks one, and the swap keeps all five constraints. Gold
  for gold in one pair, so `minSignposts` and every colour count stay where they
  were. On Omega v1 and J145's read the target is UG (.423, .382–.465, 544
  deck-games), the cuts are Uro and Mystic Snake, and the one addition is
  **Risen Reef** (rated 88.4): Lonis (38.8) and Wistfulness (44.9) are under 60,
  Oko and Nadu have `cut` notes, Tamiyo, Collector of Tales is
  AI:RemoveDeck:All, and Talisman of Curiosity (printed colourless) and Tamiyo,
  Inquisitive Student (printed blue) are not UG gold cards in evolve's colour
  model — a swap to either would take a signpost from UG.
- **One swap a generation** (`balanceSwaps`, Justin's answer 3), and **no other
  rule swaps** in balance mode: every rule is still assessed and reported, but a
  cut it supports (a note's `cut` too) is held, listed under *Supported cuts not
  made*, so a move in the pair's payoff can be attributed to the one swap. No
  confirmation batch is played. **One generation** (`--generations 1`): the read
  measured the cube going in, not the cube after a swap.
- **Recorded** with its evidence — the read, the arm, the pair, its payoff,
  interval and deck-games, the cut, the addition and the rule id `balance` — in
  `evolve.json` (each swap's `balance` block, and the read's path, sha, job and
  arm as `balance`), `stats.json`, the changelog (a *balance rule* paragraph and
  a table of every pair) and the cube's iteration log.
- **Confirmation and stopping are the lab's**: a fresh-seed, J145-shaped
  re-measure of the swapped cube keeps the swap only if the pair's interval then
  includes .5, no colour is OFF and no pair with 400+ deck-games is OFF; else the
  cube reverts. The rule stops on success, after two generations in a row with
  no confirmed improvement (Justin's answer 4), or when the candidate set is used
  up; it never widens the set by itself.
- **Off** (no `--balance`), evolve and its folders are what they were: the three
  balance knobs are not recorded in `evolve.json`, and `--evolve balance…=` without
  `--balance` is refused.

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
| `balanceMinGames` | 400 | balance mode (D469): a colour pair counts toward the objective at this many drafted deck-games |
| `balanceSwaps` | 1 | balance mode: at most this many balance swaps a generation |
| `balanceBand` | 0.05 | balance mode: OFF / EVEN / UNCLEAR's band around .5 (J145's; a value other than the read's own is refused) |

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

### The whole library as a pool, and candidate 180s from it (`library-candidates`)

"The best 180 out of the whole library" (Justin, 2026-10-15) is a comparison, not one cube: seed several
candidate 180s by different ideas, play each on the same seeds, evolve each a couple of generations from
the whole library, and compare them on `compare`'s pre-registered measures (lab job J136). The candidates
and the pool are committed under `cubes/library/`:

```bash
tools/cubelab.sh library-candidates --fc ~/code/ForgeCoach [--out cubes/library] [--seed 180] [--min-games 80]
```

- **`library-pool.tsv`**, the library: every card of ForgeCoach's nine cube documents
  (`public/cubes/*.md`) and its two proxy lists (`docs/proxies/mtgo-vintage-cube-540.txt`,
  `old-school-93-94-360.txt`), one row a card by Forge's name, in `omega-seed-pool.tsv`'s columns, so
  `evolve --pool` reads it as it is. Support and the AI flag are the engine's facts (a card Forge 2.0.14
  lacks is listed with `forge_supported` `no` and is never drawn or added); the tags are
  `omega-seed-pool.tsv`'s, else the Synergy Cube's, else none. Five more columns: `colors` (printed),
  `produces` (what a land makes or fetches), and `lab_games`, `lab_wr_shrunk`, `lab_cubes` — every meta
  in ForgeCoach's `public/cubes` that played the card, its games summed and its `winRateShrunk` averaged
  with those games as weights. The file's `#` header says which ForgeCoach commit it was made from.
- **`hits-180.md`**, the greatest hits by lab rating: the cards with 80 or more lab games (`--min-games`),
  best pooled shrunk win rate first (to four decimals, then games). A card with no lab data, or fewer
  games, has no slot; the header says how many that excludes.
- **`random-180.md`**, the control: every drawable card, keyed by a seeded uniform draw (`--seed`, 180,
  `rng.ts`), under the same skeleton — a legal, colour-balanced cube that nobody selected. Its draw
  holds **3 cards Forge marks `AI:RemoveDeck:All`** (Adanto Vanguard, Flash, Memory Jar; its own header
  names them), kept on purpose: the control draws every supported card alike, and leaving the flagged
  ones out would make it a selected cube. The hits hold none and Omega none by design, and the lab's
  default weights do not mark the flag down (`remAIDeck: 0`), so Forge's AI may play those three
  poorly in random-180's games: a difference against the control includes those 3 slots of 180.
- **`synergy-v2-180.md`**: ForgeCoach's Synergy Cube as it was then, version 2, copied with one provenance
  line under its title, for reference. J136 does not read it: its Synergy population is ForgeCoach's v2 only,
  copied from its pinned clone and checked by sha256. Synergy v2 against a v3 is a separate job, J137.
  Version 3 shipped after J137 ([D449](../decisions/D449-synergy-v3-shipped.md)) and is
  `cubes/synergy-cube-180.md`; this file stays as v2's reference.
- Omega is used as it is, `cubes/omega-cube-180.md`.

**Omega's skeleton**, for the two that are drawn: 24 mono-coloured nonland cards a colour, 2 gold cards a
pair and none of three colours or more, 18 colourless nonland cards, 22 lands (2 a pair that make exactly
that pair, 2 others), and Omega's nonland curve (3 / 24 / 32 / 34 / 30 / 17 / 11 / 7 at mana value 0–6
and 7+), every count exact; colours are printed colours, as evolve's colour constraint counts them. The
lands are each pair's best two fixing lands and the best two others; the nonland cards are the single
selection with the largest total key that fills every colour quota and every curve count (a min-cost
flow). Deterministic: the same ForgeCoach commit and engine give the same files.
`web/test/cubelab-library.test.ts` holds the committed files to it: 180 cards, no duplicates, only
supported cards, every document written back unchanged, the skeleton exact, and the hits and the random
cube exactly what the rule gives on the committed pool.

Every candidate drafts on Forge's ranks (none has a ratings file beside it, and neither does Omega), so
the comparison is of the lists, not of anyone's ratings.

## The library census (D445)

**The programme.** Treat the whole library as one population, one copy of each card, and learn each
card's value *in context* — power band, colour structure, archetype — then suggest balanced cubes and
decks at a chosen power level, every suggestion confirmed by a fresh, pre-registered lab run (Justin,
2026-10-16; the plan and its agreed corrections are the cloud's notes in `pc-jobs`' README, *NOTES TO
THE PC*, and the PC's critique and J140's design in `pc-results/HEARTBEAT.md`, 2026-10-16). Phase 0 is
the population and a sampler (no engine runs, nothing played). *Shapes* below (D446, #153) gives the
lab drafter and builder shape variants: an option for cube balance, compares and "does this cube draft
well", where drafting is the question. What is played on the population is the next section's deck
census (D447), which has no drafter and uses no shape (Justin's amendment of 2026-10-17).

```bash
tools/cubelab.sh census build --fc ~/code/ForgeCoach            # cubes/library/census.tsv
tools/cubelab.sh census build --fc ~/code/ForgeCoach --check    # exit 1 when it is stale
tools/cubelab.sh sample --band peasant --structure three-colour --seed 1 --count 40 --out var/cubelab/census/cubes
```

**`cubes/library/census.tsv`**, one row a card of `library-pool.tsv` (1,592), committed:

| column | what |
|---|---|
| `name`, `sources`, `forge_supported`, `forge_ai_flag`, `colour_identity`, `type`, `mana_value` | `library-pool.tsv`'s own columns (the engine's facts), copied |
| `lowest_rarity`, `lowest_rarity_set` | the lowest rarity of any printing in Forge's edition files (`res/editions/*.txt` beside the jar, every printing section but `[tokens]`; C < U < R < M < S, Forge's `L` read as C), and the set that prints it so (a paper set's own edition first, then an Online one, then a promo); blank when no edition prints the card |
| `lab_games`, `lab_wr_shrunk` | the lab's metas in ForgeCoach's `public/cubes`: games summed, `winRateShrunk` averaged with those games as weights; the rate blank under 80 games |
| `member_vintage`, `member_legacy`, `member_peasant`, `member_pauper` | 1 when a list of that kind lists it: `vintage180` or `mtgovc`; any other list; `peasant`; `pauper` |
| `band`, `band_source`, `provisional` | the band by the rule below, which rule fired, and 1 on every row |

**The band rule**, the first that applies: **powered** = on the fixed powered list (written in the
file's header and in D445: the Power Nine, the ten original duals, Library of Alexandria, Bazaar of
Baghdad, Mishra's Workshop, Candelabra of Tawnos, Sol Ring, Mana Crypt, Mana Vault, Time Vault,
Tolarian Academy, Strip Mine, and twelve restricted-style cards of the Vintage cubes); **pauper** =
ever printed at common; **peasant** = ever at uncommon, never at common; **legacy** = everything else
with a printing; and for a card no edition prints, its membership: a Pauper cube → pauper, else a
Peasant cube → peasant, else legacy. Every label is **provisional** until the census's first round,
whose re-labelling rule (the lab's shrunk win rate where it has 80+ games, with the band edges a soft
feature) is written before that round runs. Today: pauper 444, peasant 425, legacy 682 (24 of them
by membership — the cards Forge 2.0.14 lacks), powered 41. The file's header carries the sha256 of
the pool, of Forge's editions and of each meta, so `--check` rebuilds it, compares the bytes and names
the input that moved.

**`tools/cubelab.sh sample`** writes `--count` cube documents of 180 cards, a uniform random draw
within `--band` under a **structure**:

| structure | nonland | lands |
|---|---|---|
| `two-colour` | Omega's skeleton: 24 a colour, 2 gold a pair, 18 colourless | 2 a pair + 2 others |
| `mono-heavy` | a main colour 60 (the five rotate across a run from a seeded start), the other four 18 each, 1 gold a pair, 22 colourless | light: 1 a pair + 6 others |
| `three-colour` | 20 a colour, 3 gold a pair, 20 colourless | 3 a pair (30) |
| `good-stuff` | 24 a colour, 20 gold of any two or more colours (five-colour allowed), 18 colourless | 20 fixers (any land of two or more colours) + 2 of fewer |

The curve is always Omega's, scaled to the structure's nonland count, and every count is exact. A
pair's land slot takes a land of exactly that pair, or failing that one of three or more colours that
includes it. The selection is `library-candidates`' min-cost flow, generalised (`skeleton.ts`'s
`selectSlots`): each eligible card (supported, not a basic land, not AI:RemoveDeck:All unless
`--allow-ai-flagged`) has one seeded uniform key, and the costs are tiers first, keys second:

- **in-band** slots take the band's cards; only where the band cannot fill a slot do they take the
  nearest band that can (down first, then up), listed in the header as **FILL**. In practice: peasant
  has no land of exactly a pair, so a peasant cube's pair lands are pauper's (about 17 a two-colour
  cube); pauper borrows one or two cards where a curve or gold slot runs out; powered (41 cards) fills
  about three quarters of every cube from legacy, which is what a vintage cube is. `--band all` draws
  from every band alike.
- the **cross-band slice** (`--cross-band`, 0.10; none for `all`) is round(share × 180) slots spread by
  a seeded draw over the slot groups the neighbouring bands (pauper–peasant–legacy–powered) have cards
  for, filled from those neighbours and listed as **CROSS**: it is there to learn the band offsets.
  Over 20 cubes it lands at 9.6–10.0% in every band and structure.

Each document's header records the band, structure, seed, cube index, main colour, the census's and
the pool's sha256, the eligible pool and its in-band and neighbour sizes, the plan exactly, the CROSS
and FILL cards with their bands, and the cube's composition by band. Cube *i* depends only on the
census, the flags, the seed and *i* (`rng(S, 'census-sample/<band>/<structure>/<i>')`), so a larger
`--count` extends a run without changing its first cubes; `<band>-<structure>-<seed>.tsv` beside them
lists every file with its in-band, cross and fill counts and its sha256. A census built from another
`library-pool.tsv` is refused. `web/test/cubelab-census.test.ts` holds both tools: the rows and
columns, the rule on every row and on known cards, determinism, every band × structure's cube
parsing with no warning and only supported cards (what `check` needs), each structure's counts, and
the cross-band share.

### Shapes (D446, Phase 1)

The lab drafter leans to two colours and the builder plays two, so mono decks and decks of three or more
colours only ever appeared as accidents of a thin pool. A seat can now be given a **shape** to draft and
build to, and an exploration share forces shapes at random so that every shape gets games:

```bash
tools/cubelab.sh run var/cubelab/census/cubes/legacy-two-colour-1-001.md --drafts 100 --games 1 --jobs 4 \
    --shape-explore share=1,mono=0.5,two-colour=0.17,three-colour=0.17,good-stuff=0.16
tools/cubelab.sh run cubes/pauper-cube-180.md --drafts 40 --games 1 --jobs 4 --shape-a mono   # seat A always mono
tools/cubelab.sh shapes var/lab-j140/runs/*/* --out var/lab-j140/out                          # the measures by band
```

| shape | the drafter | the builder |
|---|---|---|
| `auto` (the default) | today's | today's: with both seats `auto` and no `--shape-explore`, a run is byte for byte what it was |
| `two-colour` | today's | today's (the exploration's control arm) |
| `mono` | leans as today for two picks; from its 3rd pick committed for good to the heaviest colour so far, then on-colour or colourless cards only (anything else −`offColour`) | one colour, a splash of at most 2 one-pip cards; 16 lands and 24 spells, 17 and 23 when those 24 average mana value 3.0 or more |
| `three-colour` | leans as today; at `commitAt` committed to its three heaviest colours (off them −`offColour`), fixers ×2 | exactly three colours, no splash, each needed by 3+ spells; 17 lands with 3+ fixers for them in the pool, else 18 |
| `good-stuff` | no lean and no synergy (the highest-rated card), +`fixing` for any land or fixer of two or more colours | the most colours (3–5) its fixers support (3 a colour beyond two), no splash, 18 lands |

A shape whose builder finds no legal deck plays today's deck (`shapeFallback`). Shapes are grid only and
refuse `--bridge`, `--drafter`, `--explore` and the head-to-head modes. Every number is `SHAPE_RULES` in
`tools/cubelab/shapes.ts`, written in D446 before any test.

**`--shape-explore share=x`** (or `on`, 0.25), optionally with weights per shape (`mono=…,two-colour=…,
three-colour=…,good-stuff=…`; default equal): each `auto` seat is forced with probability x, its shape
drawn by the weights, B never the shape a forced A got (so the exploration makes no mirrors), all from the
draft's own stream `rng(seed, 'shape-explore')`. A fixed `--shape-a/-b` seat is never forced. Measured offline
on census cubes (no engine: a draft and its build are pure), mono finds a build in 46–50% of seats a band
(about 90% in mono-heavy cubes, 17–42% elsewhere), three-colour 94–99%, good-stuff 87–99%; the weights are
there to give mono its share of built decks.

**What it writes.** With shapes on, each drafter's line carries `shape`, `shapeForced` and (when today's
builder played) `shapeFallback`; `run.json` carries `shapes: {A, B, explore: {share, weights}, rules, flow}`,
part of the folder's identity and version; `cards.json` marks each **card-flow** card `flow: true` — a rule on
the engine's oracle text generalising the Synergy v3 study's 17 cards that draw or filter without adding to
the board (`tools/cubelab/cardflow.ts`; 40 of the library's cards).

**The measures** (`report`'s *Shapes* section for a run with shapes on; every population of `compare`, as
`pop.<name>.shape.<key>` in `compare.json`; and `shapes` over many folders), each with a draft-clustered 95%
interval:

| key | what |
|---|---|
| `cc1`…`cc4p` `_all`, `_forced`, `_unforced` | match win rate (over decisive matches) by the played deck's main colour count, 1, 2, 3, 4+ |
| `spread` | max − min of those over colour counts with 30+ decisive matches |
| `pw5_cc1`…`pw5_cc4p` | the share of colour combinations (W, WU, WUB …) with 30+ decisive games within 5 points of 50% |
| `label_<shape>` | by shape: the seats drafted and built to it, mirrors left out (J140's rule reads this) |
| `fallback_<shape>` | the share of a shape's seats whose shape had no build |
| `flow_cc…`, `flow_<shape>` | card-flow cards per played deck (runs with shapes on only) |

`tools/cubelab.sh shapes <run-dir>... --out <dir>` groups the folders by the census band in each cube's
first line, pools each band's drafts, and writes `shapes.json` (numbers only), `shapes.md` and
`ratings-rough.tsv`: the by-shape labels from each interval (`--viable 0.5 --dominant 0.55 --not-viable
0.45`: VIABLE iff it holds 0.5, DOMINANT iff wholly above 0.55, NOT VIABLE iff wholly below 0.45; no label
under 30 decisive matches), the band offsets from the cross-band slice (each other band's CROSS cards'
pooled win rate minus the in-band cards'; FILL cards in neither), and every card's games within its band
(report only).

## The deck census (D447)

**What it is.** No drafter, no shape, no rating: 40-card decks drawn straight from a census band's pool
at random colour makeups over the whole spectrum, played deck against deck, Bo1, Forge's Default AI on
both sides, numbers only. "Mono", "two-colour" and "mostly red with a little white" are read off each
deck's realised profile afterwards, never enforced (Justin's amendment, `pc-results/HEARTBEAT.md`,
2026-10-17 01:30). [D447](../decisions/D447-deck-census.md) pre-registers the method. A reported
difference is **a candidate until it holds on fresh seeds**.

```bash
tools/cubelab.sh decks --band legacy --count 2500 --seed 1401 --out var/census/legacy/decks          # no engine, ~15 s
tools/cubelab.sh census-play --decks var/census/legacy/decks --pairs 20000 --seed 1401 --jobs 7 --out var/census/legacy/games
tools/cubelab.sh census-read --games var/census/legacy/games --decks var/census/legacy/decks --out var/census/read
# J141's pilot slice: the same games again, the live search seat on side a
tools/cubelab.sh census-play --decks var/census/legacy/decks --replay slice.jsonl --policy-a search --jobs 7 --out var/census/legacy/slice-search-a
```

**The rules** (`tools/cubelab/deckcensus.ts`; the decision has the numbers):

| rule | what |
|---|---|
| prior | k colours uniform on 1–5, a uniform k-subset of WUBRG, shares from a flat Dirichlet(1, …, 1): a two-colour makeup's main share is uniform on [0.5, 1] |
| eligible | drawable, not AI:RemoveDeck:All, every printed colour in the makeup, every cost symbol payable (hybrid `GW` by either colour, Phyrexian `BP` and two-brid `2W` always, a split card's two faces both); costs from Forge's card scripts beside the jar, in Forge's own tokens |
| draw | 25 spells without replacement: colourless with the band pool's own colourless share, else a colour by the shares and a uniform eligible card of it; cross-band with probability `--cross-band` (0.10) from the neighbouring bands; fallbacks band → FILL → other colours |
| lands | L = clamp(17 + round(2 × (m − 3)), 15, 18), m the mean mana value of the first 23 drawn, the first 40 − L spells kept; F = min(supply, round(L × (1 − s_max))) fixers that can make 2+ of the pip colours, uniform, band then FILL; the rest basics: one at a time to the first colour with fewer sources than its most demanding spell's pips (at least 1), then by the largest deficit to its pip share |
| sources | a basic its colour; a nonbasic what it taps for; a fetcher or cycler (fetchland, Landscape, Evolving Wilds, Ash Barrens) only the colours of the deck's lands it can find — a basic of a type it searches for, or a typed nonbasic unless basics-only — so a "two-colour fixer" reaching one colour of the deck counts as one |
| castability | every spell castable from the deck's own sources (a colour's sources ≥ the spell's plain pips of it; a hybrid symbol a source of either colour), or the deck is redrawn (the same makeup 50 times, then a new one), every rejection counted; the test checks it with a checker of its own over 400 decks a band |
| bands | census.tsv's, exclusive; powered (37 eligible cards) is drawn as one pool with legacy, its cross slice from peasant |
| pairing | consecutive pairs of a run of seeded permutations: every deck within one game of 2M / N; game g's seed S × 1,000,000 + g, side a on the play when it is even (half the games, not balanced per deck: `first` is on every row) |

**`decks`** writes `decks/<id>.dck` (`<band>-<seed>-<i>`, five digits), `decks.jsonl` (one deck a line:
the makeup, the 40 cards, spells, fixers and basics, land count, mean mana value, the realised profile
— each colour's pip share, the main colour and its share, colours with 3+ spells — and, version 2, the
deck's variables: `nColours`, `creatures`, `mvHist` (mana values 0, 1, 2, 3, 4, 5, 6+), `xSpells`,
`cardFlow` (by #153's oracle-text rule, `cardflow.ts`'s `isCardFlow`, read off the scripts: 40 library
cards, the Synergy v3 study's 17 among them), `fixersReal` (the fixers that reach two of its colours),
the CROSS and FILL cards, the rejections before it) and `decks.json` (the rules as text, the counts by
k, by colours with 3+ spells and by main-share bin, the rejections and the decks redrawn, the means of
the variables and the summed mana-value histogram, the census's and the pool's sha256). Deck i depends
only on the census, the flags, the seed and i.

**The engine-unplayable list** ([D482](../decisions/D482-census-engine-unplayable-list.md)). `decks --band`
never deals a card listed in `tools/cubelab/engine-unplayable.json`. A card is listed when Forge's AI cannot
finish its games inside the atlas's branch budget. Today that is two cards: Scute Swarm, whose token boards
stalled the AI's combat prediction for 1,000–1,300 s inside one event-free engine step in J166, and Chain of
Smog, which two Forge AIs copy at each other without end (J173, [D490](../decisions/D490-chain-of-smog-engine-unplayable.md)). This is an
engine limitation, not a judgement about the card or anyone's decks, and a card goes on the list only with
a measured stall and its evidence (`since`, `why`, `evidence` per card). A pick that lands on a listed card
is made again from the same list. So a deck none of whose picks landed on a listed card is byte for byte the deck it was (its `.dck`
and its `decks.jsonl` row, which `census-play`'s `plan.json` hashes), and a deck with such a pick changes from
that pick on — a pick the draw would have dropped anyway still counts and still shifts the fixer shuffle after it. Every skip is counted: a row's `engineSkips` (only when there was one), `decks.json`'s
`engineUnplayable` (the file, its sha, the cards, the skips by card, the decks with a skip), and the summary
line `decks` prints. `--unplayable none` draws without the list, and `--unplayable <file>` reads another.
`decks --cube`, the drafts, `evolve` and the board never read it.

**`census-play`** plays `--pairs` games on `--jobs` cube-lab workers (`CubeLab.java play`, one game a
match line, no pool so no Forge build), appending one row a game to `games.jsonl` as games finish:

```jsonc
{ "v": 1, "g": 17, "seed": 1401000017, "a": "legacy-1401-00811", "b": "legacy-1401-02213",
  "policyA": "plain", "policyB": "plain", "winner": "a", "first": "b", "turns": 14, "ms": 1180,
  "timeout": false, "reason": "AllOpponentsLost", "error": null, "engineError": null, "worker": 3,
  "searchA": { "searched": 19, "changed": 5, "msPerDecision": 1006.1, "counts": { "search.p.considered": 14, … } } }   // a search seat only
```

`plan.json` binds the run to `decks.jsonl`'s sha256 and its options, and a run started again with the
same `--out` skips the games it has; other options are refused, except a larger `--pairs` on the same seed,
which extends the run (the pairing is prefix-stable; `plan.json` records it under `extended`). A game that
hits an engine error is retried once on fresh workers at the end of the run and its row marked `retried`;
a second error stays on the row. `census-play.json` is the tally (decisive, drawn, timeouts, engine errors,
retried, the first player's rate, games an hour per session). `--policy-a` /
`--policy-b search` seat the live search seat (`RecordMatch --policy search`'s: search-v2 at 1.5 s);
`--replay <games.jsonl>` plays exactly the listed games — numbers, sides, seeds — under this run's
pilots. Plain against plain, a replay gave the same winner and turn count in all five games tried
(D447's smoke).

**`census-read`** reads any number of `--games` and `--decks` folders (deck ids name their band) into
`spectrum.json` (strict), `spectrum.md` and `cards.tsv`: per band, the win rate by colours with 3+ spells,
by the prior's k and by main-colour pip share (bins `lt40`, `s40_50` … `s90_100`, `eq100`), each with
Wilson's unclustered interval and the one to read, a deck-clustered bootstrap (`--boot` 1,000); and one
row per band and card: decks, deck-games, wins, the win rate when in the deck and shrunk toward 0.5 at
strength 20, and the means of its decks' variables and its opponents' (main share, colours with 3+ spells,
number of colours, k, lands, mean mana value and the mana-value histogram, creatures, X spells, card flow,
fixers and those that reach two colours, each colour's pip share; the opponent's main share and colours;
the CROSS and FILL shares). No verdicts and no labels beyond the bins.
It counts each deck once (a `--decks` folder named twice, or one deck in two folders; one id with two
lists is refused) and each game once per pilot pair, keyed by (band, seed, g, policyA, policyB), so a
folder read with its own replay counts each game once, and the bands may share a `--seed` (the example's
1401 for every band reads together); two runs of ONE band on one seed name two deck pairs for one game and
are refused, so each run of a band gets its own seed. The rows must be one pilot pair unless `--mixed-pilots`.
`spectrum.json`'s `dropped` and `pilots` say what it did. Per band it also reports **the weak-deck tail**,
`redraws`: every deck played is castable, so the decks that could not be are the generator's rejected
draws, counted over the band's decks (a line of `spectrum.md`, and `cards.tsv`'s `redraws` column).
Every rate and every card's value is **"in a random deck of this makeup"** (D447 point 10): the decks
are pure draws from the pool beyond their colours, mostly weaker than built ones; `spectrum.md` opens
with that sentence. Utility lands are never drawn, so the census says nothing about them.

**Rate.** D447's smoke beside a seven-worker job: 2,472 games an hour on 2 workers, about 2.2 CPU-seconds
a game — some 11,000 games an hour on seven free cores.

### A cube's pool: `decks --cube` (D456)

`decks --cube <cube.md>` draws the same decks from one cube's own list instead of a band's pool
([D456](../decisions/D456-decks-from-a-cube.md)): the document's cards that the library knows, Forge
supports and the AI may play (the rest named in `decks.json`), k uniform on `--k` (default 1, 2, 3), the
cube's own colourless share, no cross-band slice and nothing to fill from; the land formula and
castability are D447's. Deck ids are `<cube>-<seed>-<i>` and each deck's `band` is `cube:<cube>`, which
`census-read` reports as a group of its own; `census-play` plays the folder as it plays a band's.

```bash
tools/cubelab.sh decks --cube cubes/omega-cube-180.md --count 2000 --seed 1601 --out var/census/omega/decks   # no engine, ~2 s
```

- **The repeat cap.** A mono deck keeps about 23 spells from its colour's cards, so on a 180-card cube a
  coloured card is in most of its colour's mono decks (Omega: median 0.80): that repeat is structural and
  reported, not capped. What is capped is a card's share of ALL the k = 1 decks: at most
  max(10, floor(`--max-share-k1` × N1)) of the run's N1 (0.25 by default; a coloured card's ceiling is
  about a fifth, Omega's largest 0.194, so it never binds there). It binds on a pool whose mono decks pile
  onto a few colours, and then the run keeps fewer k = 1 decks, every redraw counted.
- **`card-shares.tsv`**, a row a card: its decks and share of all decks, and per k its decks, its share of
  that k's decks, the decks whose makeup admits it and its share of those. `decks.json` has the summary
  (max, median, top ten per k) and the cap's numbers.

### Recording the cake: `--record`, `census-replay` (D450)

A census game keeps more than its result. `census-play --record` takes `none`, `rows` (the
default) or `full` ([D450](../decisions/D450-record-the-cake.md)):

| mode | per game | about (legacy, 100 games) |
|---|---|---|
| `none` | the `games.jsonl` row, as D447 | 0.4 KB |
| `rows` | + every p, a and b decision of both seats as a D435 row, `<out>/rows/rows-<pid>.jsonl`; + a ledger line, `<out>/ledger.jsonl` | rows 45 KB (gzip 11×), ledger 1.5 KB |
| `full` | + both seats' frame logs, `<out>/frames/g<g>-seat{0,1}.jsonl.gz` | + 103 KB |

```bash
tools/cubelab.sh census-play --decks var/census/legacy/decks --pairs 20000 --seed 1401 --jobs 7 --out var/census/legacy/games            # rows
tools/cubelab.sh census-play ... --record full --out var/census/legacy/games-full
tools/cubelab.sh census-replay var/census/legacy/games/rows/rows-12345.jsonl --game census:1401000017 --out var/cubelab/replay-17
```

- **A row** is one seat's decision, from that seat's view: the state (D361's encoder: the other hand
  and every library by size only), each candidate's vector and token, the index played, and
  `policy` (`forge` for a plain seat, `search` for a search seat). A plain seat that records is our
  controller with an observing search (`observe=1`): the search's candidates, Forge's answer played.
  The rows of a game follow a `begin` line, its recipe (seed, deck ids and files, pilots, who was on
  the play), and end with an `end` line. The recipe is for `census-replay` only, never a feature: no
  reader may learn from a path, a file name or a deck id. `tools/ml/distill.py` trains on `search`
  rows only.
- **The ledger** is one line a game: per turn, per seat, life, hand and library counts, lands /
  creatures / other permanents, spells cast, lands played, mana spent, damage dealt (to anything and
  to players). Public numbers only.
- **The checks**, at the end of every run, fail it (exit 3) on any problem: every rows file by
  `rowscheck.ts` (shape, the token grammar, and in `full` mode every id a row names against its
  seat's own log); every frame log by `tools/check-redaction.mjs`; and in `rows` mode the engine's
  `RowsLeakCheck` on every `--rows-check-every` (50) rows: the opponent's hidden cards redealt must
  not move the row's state or any candidate's vector, the seat's own hand swapped must move the state. `census-play.json`'s `record` has the
  sizes per game (mean, median, p90, max) and the checks' counts.
- **A folder keeps one mode** (`plan.json`); a folder made before D450 is `none`, so extend it with
  `--record none`.
- **`census-replay`** plays one game again from its `begin` line (`--record full` by default) and
  asserts it is the same game: every row (but its wall time), the winner, and, when the original's
  frame logs are beside its rows, both logs (but the wall clock, the stack's per-process instance
  ids, and the order inside an event's `cardIds`). Exit 0 the same, 4 not; `<out>/replay.json` either
  way. It clears `<out>/rows` and `<out>/frames` first, so an `--out` that is a census folder
  (`plan.json`, `games.jsonl`) or holds the rows file is refused. Plain pilots only: a search seat is wall-clock bound. Measured: `none`, `rows` and `full` play
  the same 20 games, and three replays matched row for row and frame for frame.

### Where the heavy outputs live: `LAB_DATA_DIR` (D450)

`LAB_DATA_DIR=/mnt/lab` (or `config.json`'s `labDataDir`) puts the lab's outputs on another drive
without changing a command: a relative path under `var/` is re-rooted there, so
`--out var/census/legacy/games` writes `/mnt/lab/census/legacy/games`. Reads look there first and
fall back to the repo's `var/`. Absolute paths and paths outside `var/` (`cubes/...`, `decks/...`)
never move. It applies to `census-play`, `census-read`, `census-replay`, `decks`, `atlas`, `run`,
`evolve` and `queue --root`; the Forge homes and the compiled classes stay in the repo's `var/`. A
setting that names no existing directory stops the command (an unmounted drive is never replaced by
a folder on the system disk). A folder begun under the repo's `var/` before the setting is not
restarted on the drive: a write whose repo copy holds work the drive copy lacks is refused, naming
both, until it is moved. `web/test/cubelab-record-cake.test.ts` runs a real lab job with it set
and checks that it wrote there and nothing under the repo's `var/`.

## The move atlas (D451)

Two decks, one seed: what each option of a decision is worth when the rest of the game is played at
random by BOTH seats, and when it is played by Forge on both — two regret maps of the same decisions,
side by side ([D451](../decisions/D451-move-atlas.md)). Method only: no verdict.

```bash
tools/cubelab.sh atlas --pair auto --seed 451 --rollouts 10000 --branch-random 200 --branch-forge 40 --jobs 7 --out var/cubelab/atlas/j142
tools/cubelab.sh atlas --deck-a A.dck --deck-b B.dck --seed 1 --rollouts 50 --decisions 3 --branch-random 16 --branch-forge 8 --chunk 8 --jobs 2 --out var/cubelab/atlas/smoke
tools/cubelab.sh atlas ... --phase report     # atlas.json and atlas.md again from the folder, no engine games
tools/cubelab.sh atlas ... --branch-error-max 0.05   # D466: an option past 5% errored branch games is a problem (default 0.1)
tools/cubelab.sh atlas ... --branch-capped-warn 0.5  # D478: an option past half its branch games capped is a warning (default 0.25)
tools/cubelab.sh atlas ... --decisions 8 --min-options 3 --screen 25 --early-stop on --checks-parallel 7   # D480: the cut design (below)
tools/cubelab.sh atlas-selftest               # a tiny atlas with every check asserted, G5 on a tax pair, G6 on a Crypt Rats pair, the checks on two workers, and the cut design on two short spines (engine)
tools/cubelab.sh seat-identity                # the Forge, search and explore seats still play origin/main's games (~30 s, engine)
```

`atlas-selftest` runs at `--jobs 2` by default, so two workers open their first frame logs in one fresh
`frames/` folder at the same moment. `GameLog` used to create that folder with `isDirectory()` and then
`mkdirs()`, and the worker whose `mkdirs()` lost the race threw `cannot create directory`. It now uses
`Files.createDirectories`, which accepts a folder that already exists. Sharing the folder is correct, because
each log's file name is its own game, branch and seat. A run that fails only at `--jobs` above 1 is a race
like this one, not a fault in the atlas.

- **The random seat** is D358's exploration at epsilon 1 with a wider list: at a priority, a uniform pick
  among pass, each land, Forge's own answer and every spell or non-mana ability it can play and pay for
  (targets drawn at random from the legal ones it can see); the attack, the blocks and single targets
  random as in D358; mana payment (Forge's auto-pay), costs, modes and other choices Forge's. Its
  **guardrails are mechanical**: a legal land drop is always taken (G1); no pass in its first main phase
  while a land drop is pending (G2, which is G1 itself and has no code of its own); an activated ability that changed nothing public is
  not repeated at its next decision (G3); the opening hand is kept (G4); a play the engine refused to pay
  for (a tax such as Elite Spellbinder's) is not picked again in the same priority window -- the turn, the
  phase, the stack and the seat's land count, so a land drop opens a new one (G5, D458, D462); a
  play of its own with {X} in its mana cost gets X drawn uniformly from 1 to the most it can pay
  (Forge's `ComputerUtilCost.setMaxXValue`), and one payable only at X = 0 is not offered -- Forge's
  own answer keeps Forge's X (G6, [D471](../decisions/D471-random-seat-zero-x.md): before it, Crypt
  Rats' free X = 0 activation was picked thousands of times a branch and ran J158's pauper branches to
  the 120 s kill); a
  game past `--turn-cap` (40) is a draw. G1 and G4 are read back from the seats' decision records after
  the run, and G3's, G5's and G6's counts from each random seat's `decisions` summary (protocol M71, M73)
  into `atlas.json`'s `checks.guardrails` (`noRepeatNoOp`, `refusedCast`, `noRepeatRefused`, `xDrawn`,
  `zeroXLeftOut`, and G6's violation `zeroX` -- an own X play the engine paid at X = 0 -- which is a
  problem above 0 and is in `violationsBy`). G6, like G5, changed the random policy: atlases from before
  and after it are not pooled. G5 changed the
  random policy: an atlas from before D458 and one after it are two policies, not a repeat. Since
  [D466](../decisions/D466-atlas-j156-tool-faults.md) the record's land options and the seat's are one
  listing with the land drop checked (a land exile lets the seat play is not offered after the drop), the
  count of violations is the true one (`violations`, `violationsBy`; the first 50 are named), and a cast
  the engine refused to pay for puts its card back where it was instead of leaving it in the Stack zone,
  so G5 has a play to leave out -- a third change to the random policy.
- **Branch errors** ([D466](../decisions/D466-atlas-j156-tool-faults.md)): every branch game that errored
  is counted by error text in `checks.branchErrors`, and an option whose branch games errored more than
  `--branch-error-max` (0.1) of the time is a problem naming the option and its errors (atlas.md's
  *Branch games that errored*). A frame log gunzip cannot read -- a worker the watchdog killed leaves its
  branch's two logs truncated -- is left out of the checks and named (`checks.unreadableFrameLogs`), and
  `atlas.json` is still written.
- **Capped branches** ([D478](../decisions/D478-capped-atlas-branch-is-a-draw.md)): a branch the turn cap
  (or the step cap, or the deadline between steps) ended is a draw, `result` 0 and `score` .5, kept in its
  option's value at a half. One written otherwise is a problem (`checks.branchCapped.notDrawn`, exit 3).
  Capped branches are counted by option in `checks.branchCapped`, and an option with more than
  `--branch-capped-warn` (0.25) of its branch games capped is a **warning** (`checks.warnings`, atlas.md's
  *Branch games the turn cap ended*), never a problem: a capped branch is a long position, not a fault, and
  a pauper or ff5 night at the 40-turn cap can run long without anything being wrong. A game the engine
  itself ends drawn (both seats losing at once, or an effect that makes the game a draw) is a draw too
  (D478's addendum).
- **`--pair auto`** takes the line of `tools/ai-bench/pairs-confirm.txt` with the most ladder games and
  the most even record: the smallest |p − ½| + 1.96·√(p(1−p)/n) over the line's decisive ladder games
  (`--ladder`, default `var/ai-ladder`). The plan keeps the choice for a resumed atlas.
- **Phase A** plays `--rollouts` games from the opening, both seats random; **phase B** plays the baseline
  (Forge both sides, seed `--seed`), lists seat A's decisions with two or more options (the search's
  candidates, up to `--options` 8, Forge's answer first), picks `--decisions` of them evenly spaced
  (default all), and at each plays every option out `--branch-random` times (random continuation) and
  `--branch-forge` times (Forge), from a fork: a copy, the option forced, what seat A cannot see redealt
  from the multiset, branch i of every option on one seed. Work goes out in units of one decision, one
  continuation and `--chunk` (25) branches; a unit replays the baseline to its decision and checks the
  options are the same. A unit that has not answered in `--unit-timeout` minutes (30) is killed as hung
  and recorded as not finished; the pool measures it on a monotonic clock, so a jump of the wall clock
  cannot trip it ([D459](../decisions/D459-monotonic-unit-watchdog.md)).
- **Everything is recorded**: every phase A game and every branch as D450's rows (both seats), ledger and
  both frame logs; `phaseA/`, `phaseB/` under `--out`. Every fork is checked (the position, card for card);
  `--leak-checks` (1 a unit) plays a branch again after seat B's real hidden cards were redealt in the real
  game (nothing may move) and after seat A's own hand was (something must). Every rows file and frame log
  is checked as D450's are. A problem exits 3.
- **`atlas.json`** (strict): the plan and the pair's table, phase A's outcome distribution, game length
  and the rollouts a ± 2-point interval needs; per decision every option's value under each continuation
  (Wilson), each map's regret (best − played, a paired bootstrap interval), the rank correlation between
  the two maps (bootstrap interval) and whether they name the same best; the decisions where they disagree
  most; the checks; timings. **`atlas.md`** is the same as two tables side by side and a paragraph.
- **The worker heap**: the atlas's workers run at `-Xmx2048m`, every other command's at hard rule 6's
  4096m; `CUBELAB_WORKER_XMX=2560m` (or `3g`) sets every worker's heap, the atlas's included, and wins
  over both. Phase B keeps a worker alive over hundreds of branch games and the heap grows to its cap:
  under 4096m four workers sat at 3.6–4.7 GB RSS, and three atlases (J143, J146, J148) were killed by the
  kernel when the runner fitted 6–7 of them into 21.4 GB from a declared 2.5–3 GB. The atlas-selftest
  (`--jobs 2`) passes at 2048m (peak RSS 1.53 GB) and at 1536m (1.08 GB), but is too short to fill a
  heap; J148's long-lived workers held 0.9–1.1 GB of old generation, so 1536m would leave 1.4× that and
  2048m leaves 2×. Expect about 2.6 GB RSS a worker (the cap plus ~0.5 GB off-heap).
- **A long-lived worker fills its heap to `-Xmx`; declare `mem_per_worker_gb` from the cap, not from
  phase A's measurement.** Phase A's short games peaked at 1.3–1.85 GB under 4096m and never showed it;
  an atlas job at the default heap declares `mem_per_worker_gb: 2.7`, one with `CUBELAB_WORKER_XMX` its
  cap plus 0.6 GB.
- **Rate** (the smoke, two workers beside the lab's seven): a phase A game 5.5 s a worker (8 CPU-s), a
  branch game 3.0 s (random 3.0, Forge 2.0); a phase A game keeps 234 KB, a branch 136 KB. A random game
  is slower than a Forge game: every random priority lists every play the seat could make, and the
  observing seat lists the search's candidates for its row.

### The cut design (D480)

Five flags, each off by default, so a J158- or J162-shaped job runs as it did
([D480](../decisions/D480-atlas-cut-design.md), from the atlas review of 2026-10-24, design B):

| flag | what it changes | default |
|---|---|---|
| `--checks-parallel n` | the post-spine checks (the rows' id checks and the guardrail reads on `n` worker threads, `n` redaction batches at once); `atlas.json`'s checks are the serial run's but for `redactionMs` | 1 (serial) |
| `--early-stop on` (or `a,b,c`) | after 50, 100 and 150 random branches, an option whose paired-bootstrap interval against the leader lies entirely below zero stops; option 0 never stops; the Forge map plays the options still running | off |
| `--screen n` | after `n` random branches of every option, a decision whose mean value is <= .04 or >= .96 is settled (`screened: true`, a cheap label) and the next listed decision not yet branched takes its place | 0 (off) |
| `--min-options k` | `--decisions` are spread over the decisions with `k` or more plays (D483: distinct play identities, so one token can be two plays and Forge's doubled may-play twin is none), filled from the rest when too few | 1 |
| `--branch-forge 0` | already a flag: a spine with no Forge map; its decisions are `complete`, `decided` and `settled` on the random map, and it makes no agreement read | 40 |

- **The barrier.** A checkpoint is a chunk boundary (`--chunk` must divide it). A decision's next units wait until every
  unit of its current stage has finished. Then the checkpoint is decided from the paired rows, and the next units go out
  carrying the options still running (the job's `atlas.options`, `Atlas.Unit.options`). The pool keeps idle workers alive
  for those units (`holdIdle`). Every verdict is a line of `phaseB/schedule.jsonl`, written when it is made: a pick with its
  `k` and why (`spread`, `fill`, `replaces`), a screen with its mean value, a stop with the leader, the options dropped and
  each option's bootstrap low end. A resumed atlas replays the file and never decides a checkpoint twice. The file's first
  line is the plan it was made under (its sha256 and each deck file's); a resume under another plan is refused, naming
  both hashes.
- **What the label reads.** A stopped option's mean and its paired bootstrap use the option's own branches. A row is
  paired when every option still running at that branch index has a score, so a stopped option's empty cell does not unpair
  the row. Its option entry says `stoppedAt`. Early stopping changes an option's n, not the estimator; the sample is
  adaptively sized (D480 point 2's bound). The bootstrap resamples the same rows as an uncut run, so a label moves only by
  the stopped options' shorter means.
- **`atlas.json`** gains, on every decision, `decided` and `settled`, and, when the schedule speaks, `k`, `why`,
  `replaces`, `screened`, `screenMean` and `forgeOptions`. It also gains `phaseB.schedule` (what the cuts did on the
  spine) and `phaseB.forgeMap: false` on a spine with no Forge map. The plan records `cuts`, and a resume with other cuts
  is refused.
- **Completeness.** Under the cuts a job reads `phaseB.schedule` (`branchedInFull`, `screened`) and `units.jsonl`. It
  cannot use `min(--decisions, listed) x (ceil(R / chunk) + ceil(F / chunk))`, because a screened decision has one unit
  and its replacement adds more.
- **Pooling.** Labels made under `--min-options` are a different population: most 2-option attack-or-not and cast-or-pass
  decisions leave. Screened decisions are not complete. Neither is pooled with earlier nights except through the unchanged
  (i)–(iii) definitions.
- **Design B in the wide shape**, one spine (a pair and a seed) a command, about 13 a night:
  `--phase b --decisions 8 --min-options 3 --screen 25 --early-stop on --branch-random 200 --branch-forge 40 --chunk 25
  --checks-parallel <workers> --unit-timeout 30`, with `--branch-forge 0` on all but one spine in six if the night is for
  labels rather than agreement.

### The futility stop (D489)

Off by default ([D489](../decisions/D489-atlas-futility-stop.md), amending D480, from the atlas review of 2026-10-27 §5 #2):

| flag | what it changes | default |
|---|---|---|
| `--futility i` | at `--early-stop`'s `i`-th checkpoint (0: the first, 50 with `on`), a decision whose option 0 has the best mean over the paired rows of the options still running, or is within `--futility-tie` of it, is stopped: no more branches of any option and no Forge map. Its label is partial | off |
| `--futility-tie t` | the margin: option 0's gap to the best mean (`best − o0`) at or below `t` is futile | 0 (o0 leads or ties) |
| `--futility-sample s` | a seeded share `s` of the decisions the rule would stop is played to the full n anyway, as the rule's bias control | 0.1 |

- **The label rows.** A stopped decision stays in `atlas.json`'s `phaseB.decisions` with its numbers at the checkpoint's
  n and `partial: true`, `stoppedAt` (the checkpoint) and `stopWhy: "futile"`. It is never `complete`, so a reader's
  confident test (`complete` and the random `regretLo` above zero) never counts it. `why` stays the pick's reason
  (`spread`, `fill` or `replaces`). A control has `futilityControl: true` and is otherwise an ordinary decision. Every
  decision the rule read carries `futilityGap`: option 0's gap to the best at the checkpoint.
- **The counters.** `phaseB.schedule` gains `futility` (each read: `d`, `at`, `gap`, `futile`, `control`, `stopped`),
  `futileStopped`, `futileControls`, `futileBranchGamesSaved` and `partialLabels`. The games saved are an upper bound: the
  stopped decisions' later random stages and Forge map, counted with every option that was running at the checkpoint.
  `labels` still counts complete rows only. `branchedInFull` leaves out the stopped decisions as well as the screened ones.
- **Spending the saving.** A futile decision is not replaced. At a fixed spine count and `--decisions`, the night just
  ends earlier. To get more labels, the job raises `--decisions` (or the spine count). Compare nights by confident labels
  per branch worker-hour, not by confident share: controls count as complete labels. Pool the controls across nights,
  since about 3.5 a night at share .1 show nothing alone.
- **A control** still obeys early stopping, at the futility checkpoint and after it: it is the decision as it would have
  run with the rule off.
- **The record.** Every read is a `futility` line of `phaseB/schedule.jsonl` (the means, the gap, the draw, `control`,
  `stopped`). A stopped decision writes no `stop` line at that checkpoint and is not replaced. The rule's settings are in
  plan.json's `cuts.futility` and in the schedule header's plan hash, so a resume under another `--futility`,
  `--futility-tie` or `--futility-sample` is refused. With the rule off, both are D480's, key for key.
- **Replaying a finished spine:** `node docs/evidence/d489-futility-replay.mjs <spine dir>` replays the spine's own
  schedule through `AtlasSchedule` and adds only the futility read. It prints what the rule would have stopped and saved,
  and which of the spine's confident labels it would have cost.

## The library card model and the balanced-cube generator (D473)

`balance-model` fits every card the deck census drew — a ridge linear-probability model of deck win on its
cards and its makeup, the opponent's deck antisymmetric — and generates cubes whose colours and pairs are
predicted to win evenly when the lab drafter drafts them and Forge plays them. No engine; about 50 s.

```bash
tools/cubelab.sh balance-model --census /home/justin-a/code/lab/data/lab-j144 --omega /home/justin-a/code/lab/data/lab-j145 \
    --facts var/cubelab/facts/<library facts>.json --out var/balance-model/j144-j145 --cubes-out cubes/library/balanced
# the same cubes without the census's powered band (the first night measures both):
tools/cubelab.sh balance-model ... --out var/balance-model/j144-j145-nopower --cubes-out cubes/library/balanced \
    --exclude cubes/library/powered-exclude.txt --suffix -nopower
```

- **In:** a recorded deck census (`out/census-decks.jsonl.gz`, `out/census-games.jsonl.gz`), optionally a
  J145-shaped night (`out/drafted-decks.jsonl.gz`, `out/games.jsonl.gz`, `census/decks/decks.jsonl`,
  `out/balance.json`), `cubes/library/library-pool.tsv` and `census.tsv`, and a cached facts file for Forge's
  ranks (`var/cubelab/facts/`, the one that lists the library's 1,592 cards).
- **Out:** `model.json` (every number, with the inputs' sha256), `cards-<source>.tsv` (each card's value in
  win-rate points per game, SD, 95% interval, decks, deck-games — per band, legacy + powered together, and
  J145's arms), `summary.md` (fit quality, coverage, agreement between sources, the validation against
  J145, the top and bottom 20, the cubes' predicted tables, the programme simulation, Omega's appendix) and
  one cube document a candidate.
- **The method** is `tools/cubelab/balance-model.ts`'s header and D473: makeup groups (colour count × main
  share, no colour identity) so a card's value is absolute within its band; a deck bootstrap with each game
  carried by one of its decks; CV and split-half repeatability both by game and **by deck** (no deck on
  both sides — the headline, what a card's value is worth on new decks); the generator's min-cost flow on
  sample.ts's `two-colour` plan (`OMEGA_SKELETON`: Omega's counts and curve, a designed prior kept on
  purpose) and a balancing search after it that stops once the colour + pair gap is at most `--search-tol`
  (.008, about one card's SD). Each cube prints its gap after the flow alone beside the searched one: even
  to within the model's own uncertainty, not to the third decimal.
- **`--exclude <file>`** keeps a list out of every cube (one name a line, `#` comments; every name a
  library card), recorded with its sha256 in each cube document and `model.json`; `--suffix` names the
  files apart. `cubes/library/powered-exclude.txt` is the census's `POWERED` list (`census.ts`, D445),
  held equal to it by the test.
- **What is validated:** the card values, summed over the decks J145 played, predict its colour and pair
  payoffs (r .84). The cubes' tables come from class means × an assumed deck mix × a rating play curve,
  which no measurement has tested yet: the first night on a generated cube is that test. The residual
  transfer error came out 0, which 15 cells cannot tell from a real one, so `summary.md` simulates the
  measurement programme at .015 (the base case: median 4 nights, 80th percentile 5–6, at 4–8 candidates a
  night under the no-off rule) and .03 (pessimistic: 6–8), and keeps 0 only as the lower bound.
- **What it cannot see:** human pull (every number is the lab drafter's and Forge's AI's), cards that matter
  only together (the model is additive), lands (chosen by the plan, the band and the rating), and anything
  a random census deck never does with a card.
- The committed candidates, `cubes/library/balanced/balanced-legacy-even-high.md`, `-legacy-even-mid.md`,
  `-pauper-even.md`, `-legacy-even-high-nopower.md` and `-legacy-even-mid-nopower.md` (the pauper cube is
  the same without the list, so it has no `-nopower` file), are predictions to measure head to head on
  fresh seeds, never a verdict. `web/test/cubelab-balance-model.test.ts` loads each as `run` and `draft`
  do and drafts it. J160 measured them: transfer error .030 / .047, nearly all of it in the census values rather than in
  the mix (the night's own decks with census values score .028 / .046) — model v2 (below, D475).

### Model v2: drafted context, the drafter's own decks, a robust search (D475)

Give `balance-model` measured nights and it runs v2 (without one it is v1, byte for byte):

```bash
D=/home/justin-a/code/lab/data
tools/cubelab.sh balance-model --census $D/lab-j144 --omega $D/lab-j145 --night $D/lab-j159 --night $D/lab-j160/report \
    --facts var/cubelab/facts/<library facts>.json --out var/balance-model/v2 --cubes-out cubes/library/balanced/v2
# and the same with --exclude cubes/library/powered-exclude.txt --suffix -nopower
```

- **Nights** (`--night <dir>`, repeated, or `--sources a,b`): a J145-shaped folder (`out/drafted-decks.jsonl.gz`,
  `out/games.jsonl.gz`, `out/balance.json`) or a report folder of per-cube files (`<cube>.drafted-decks.jsonl.gz`,
  `.games.jsonl.gz`, `.balance.json`). Each deck's `band: cube:<id>` names its cube, found under `cubes/` as
  `<id>.md` (so a cube id must be unique there). `--omega` is read as a night too, and is where v1's mix comes
  from for the comparison.
- **The values** are fitted on every arm-B game, decks clustered by draft, each deck's census strength a
  covariate with a free alpha per band and each card's own term shrunk toward alpha × its census value. CV by
  draft chooses between census, drafted and this blend (`summary.md`'s first table; the blend won).
  `cards-drafted.tsv` puts the three side by side.
- **The mix** is the lab drafter's own: `balance-model` drafts the candidate cube 2,000 times with the
  TypeScript drafter at fresh seeds (it reproduces a night's decks exactly from their seeds) and reads the
  three-colour share, cards per class, the play curve and each card's **concentration** (its play share over
  the curve's) off those decks. `--drafts` sets the count.
- **The validation** refits without each night (the headline), without each cube, and with nothing held out,
  and prints v1 beside v2 with the decomposition (v2's values on the night's own decks, census values on v2's
  mix, …), pooled per night. The transfer error it leaves is computed per source — on new cubes (no other
  night drafted them) and on re-measured ones — and the new-cube figure goes into every generated cube's
  intervals. `model.json` also records each night's lab-arm ratings and weights against what the simulation
  assumes (Forge's ranks, the default weights).
  `--no-validate` skips it (the intervals then carry the .015 / .025 floor).
- **The search** scores a swap by the mean gap over the even bootstrap replicates, takes it only for
  `--min-gain` (.002), lets a card replace one within `--rating-window` (25) Forge rating points, at most
  `--max-swaps` (40); the result is re-drafted and kept only if it beats the flow on the odd replicates.
  Each cube document prints the point gap, the robust gap and the gap with the transfer error — read the
  last as what a night should expect to measure.
- **What it says** (D475): v2 is a little better than v1 on a cube no night has drafted (J160 held out: .028 /
  .042 against .030 / .047) and much better on one that has (J159 held out, J145 in: .007 / .017 against .017 /
  .021). The blue misses are in card values, not in the mix: once a night has drafted a card, its drafted value
  carries what the census missed. `web/test/cubelab-balance-model-v2.test.ts` holds the pieces, and a trimmed
  slice of J160 under `fixtures/cubelab/balance-model-v2/`.

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
tools/cubelab.sh queue check --night 4 --drafts 38000 --jobs 7 --record-every 1 ... --allow-version-change  # D394: would every key folder accept it? writes nothing
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

**Identity and version (D394).** Two checks guard a folder. Its *identity* — cube,
format, games, profiles, builder, weights, Winston cards, learned files, bridge,
deck exploration — is never appended across, flag or not ("holds a run with a
different games", naming the fields: use a new `--out`). Everything that is a
deliberate change between nights is in the *version* instead and passes with
`--allow-version-change`: the code, jar, ratings, D358's play exploration and
D375's profile mix (whose lines also carry their seats' `profiles`). Before a
`queue run` plays anything it checks every key folder of the night the way
that folder's first chunk will, and stops on a refusal; `queue check`, with the
same flags as the run, does only that and writes nothing (a job's pilot runs it
on the real root).

## Watching two bots draft and play (D440)

`watch` is the lab made to be watched: ONE grid draft, then a best of three
you follow as it is played.

```bash
tools/cubelab.sh watch cubes/fair-fight-cube-180.md                       # Default vs Default, best of 3, a random seed
tools/cubelab.sh watch cubes/pauper-cube-180.md --seed 12 --player-b search-v2 --games 5
tools/cubelab.sh watch cubes/fair-fight-cube-180.md --games 1 --pace 0    # the smoke: about 20 s
tools/cubelab.sh watch cubes/fair-fight-cube-180.md --drafter-b llm:sonnet   # Claude drafts B: SPENDS, at most $1 (D443)
```

| Flag | Default | |
|---|---|---|
| `--format grid` | grid | the only format: a grid is what a viewer replays pick by pick |
| `--seed S` | random 1–99,999 (printed in the id) | the draft's seed, as `run`'s; game `n` plays at `S × 10 + n` |
| `--games N` | 3 | a best of N (odd, 1–7); it stops once a side has more than half |
| `--drafter-a`, `--drafter-b` | `lab` | `lab`, or for one side `forge-ranks`, `llm:<model>[:thinking=…]` (D439) or `human-picks:<x.picks.json>` (D416); the other side is then `lab` (D443) |
| `--player-a`, `--player-b` | `Default` | who plays each drafter's deck: a Forge profile, or `search-v2` (`search` also; the live search seat, through RecordMatch's `--policy search`). No Claude player: RecordMatch seats Forge AIs only |
| `--llm-max-usd X`, `--llm-max-calls N`, `--llm-fallback-rate R` | 1, 40, 0.25 | an `llm:` drafter's cap for the whole watch and its fallback stop (D442): past either cap, or past R of its picks falling back to the lab drafter's line, the watch ends `error` with the reason |
| `--pace ms` | 600 | the recorder's pace (M47); 0 = engine speed |
| `--shape-a`, `--shape-b` | `auto` | the lab drafter's deck shape per seat (D446; not with `human-picks`) |
| `--out <dir>` | `var/spectate/watch-<cube>-<seed>` | the folder; its name is the watch's id |
| `--ratings <tsv>`, `--game-timeout <sec>` | as `run` | |

What it writes, all in the one folder:

- `lab/` — `run --drafts 1 --games 0` itself (run.json, drafts.jsonl, the decks):
  the same picks and decks `run` makes at that seed;
- `draft.json` — the draft as a viewer replays it: every grid as each drafter
  saw it (nine slots, null where the opener's line was), the line taken (0–2
  rows, 3–5 columns) and the cards gained, both pools, both decks with the
  builder's reasons. Checked before it is written (nine slots, a legal line
  holding what was taken, pools the sum of the picks, 40-card decks);
- `deck-A.dck`, `deck-B.dck` — the decks the games play (`Drafter A (UB)`);
- `<id>-g<n>.jsonl` — each game, a paced both-AI `mtgtable.RecordMatch` from
  seat 0's eyes (drafter A; the other hand stays the five-key stub), checked by
  `tools/check-redaction.mjs` as soon as it ends; `<id>-g<n>.log` its output;
- `match.json` — `status` `drafting` → `playing` → `done` (or `error` /
  `stopped`, with why), the games, their winners, the wins and the result,
  rewritten after every change; from its first write it names the cube, the
  seed, the players, the drafters and `startedAt`, and with an `llm:` drafter its
  `cost` (calls, failed calls, decisions, fallbacks, tokens, dollars at list
  price) follows the spend while it drafts (D443).

**The draft is face up, so draft.json shows both pools and both decks**: in a
grid draft both drafters see every grid and every line the other takes. The
games are not: one seat's view, as every spectated game.

ForgeCoach starts and follows a watch through the coach helper (`POST /watch`,
one at a time); [`docs/watch-bots.md`](../watch-bots.md) is that contract, with
both files' schemas. A watch boots its own Forge home,
`var/cubelab/watch-homes/0`, so it never shares one with a lab run's job 0.
## Comparing cube populations: `compare` (D441)

Which cube, or which version of one, makes the AIs draft the more balanced decks? `compare`
plays two to six **populations** on the same seeds and measures each one the same way, with
intervals:

```bash
tools/cubelab.sh compare cubes/synergy-cube-180.md cubes/omega-cube-180.md cubes/fair-fight-cube-180.md \
    --variant syn17=cubes/synergy-cube-180.md,weight.sixteenLandsAt=0 \
    --drafts 600 --games 3 --jobs 4 --seed 801330001 --out var/cubelab/compare/four
tools/cubelab.sh compare ... --no-run          # the measures again from the run folders, no engine
```

- **A population** is a cube file (its name is the file's, `fair-fight-cube-180.md` → `fair_fight`)
  or a `--variant name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...`: the same cube on other
  ratings or weights (`weight.sixteenLandsAt=0` makes the builder play 17 lands whenever its
  first pass can), or another cube file under a name of your choosing. Each cube reads its own
  ratings file beside it, as `run` does; a population's run takes `ratings=` instead.
- **Each population is an ordinary `run`** into `<out>/runs/<name>/`, one after another, with
  `--drafts`, `--seed`, `--games`, `--jobs` and every other `run` flag you pass (`--profiles`,
  `--game-timeout`, `--weight` for all of them). It resumes like any run: the same line again skips
  the drafts already played. `--bridge`, `--play-explore`, `--deckset`, recording and a global
  `--ratings` are refused. The default seed is 800,000,001, in the verification range (*Seeds and
  versions*, above); give a fresh block per comparison.
- **The same seeds, asserted.** Before measuring, every population must hold exactly the same
  seeds (and, unless `--no-run` without `--drafts`, exactly the block asked for); otherwise it
  stops and names the seeds one has and another lacks. Two variants of one cube therefore draft
  the very same deals.

**The measures** (pre-registered in D441; every one per population):

| id | what | unit |
|---|---|---|
| `flatness` | the noise-corrected spread (true SD) of the cards' win rates: ForgeCoach's `flatness.ts` exactly, over cards with 10+ decisive games (`tools/cubelab/flatness.ts` is the port; the cards are counted as `meta.json` counts them, lands included) | points |
| `pair_spread` | max − min win rate over the two-colour pairs with `--min-pair-games` (30) decisive games | points |
| `pair_within5` | the share of those pairs within 5 points of 50% | % |
| `draw_rate`, `timeout_rate` | draws (timeouts are draws) and timeouts per game | % |
| `game_turns` | mean turns a game | turns |
| `lands`, `colours` | the played decks' mean land count; mean colours (main colours + splash) | |
| `two_colour`, `splash` | the share of played decks with exactly two main colours (splash or not); with a splash | % |
| `first_pick_top10` | of every card in the first line taken from each grid (evolve's first-line count), the share held by the 10 cards most often there | % |

Beside them each population carries D446's shape measures (*Shapes*, above) as `pop.<name>.shape.<key>`
in `compare.json` and a *Shapes* section in `compare.md`, on the same bootstrap replicates; they are read
side by side, with no pairwise differences.

**Intervals.** 95%, percentile, from a **draft-clustered bootstrap** (`--boot 1000` replicates,
`--boot-seed 1`): a replicate draws the seeds with replacement and takes each drawn seed's whole
draft — both decks, every game — in every population at once, so each pairwise difference is
paired. The replicates of `flatness`, `pair_spread` and `first_pick_top10` are recentred on their
estimate first: a resample makes those three larger whatever the truth (it carries the games'
noise twice; it duplicates drafts into a max and a top 10), and without the recentring a
flat cube's flatness interval can lie wholly above its own estimate of 0.

**Verdicts only by rule.** Without `--rule` there is no verdict: each measure's table ranks the
populations (1 = lowest) with their intervals and lists the pairwise differences whose interval
excludes 0. `--rule flatness:lower-better:margin=1.0` (repeatable, one per measure) adds one line:
A beats B when A is better by more than the margin, in the measure's unit (points for rates and
shares), **and** the difference's interval excludes 0.

**What it writes.** `<out>/compare.json` is strict JSON with numbers only — no strings, arrays,
NaN or infinities; a measure that could not be measured is an absent key — so a lab job's `sh:`
metrics read it flat: `same_seeds`, `drafts`, `populations`, `pop.<name>.m.<measure>.{est,lo,hi,valid}`,
`pop.<name>.flatness_detail` (ForgeCoach's own chi-square interval `fc_lo`/`fc_hi`, the cards it
read, the design effect), `diff.<a>.<b>.<measure>.{est,lo,hi,excludes_zero}` (a listed before b),
`rank.<measure>.<name>`, and with rules `verdict.<measure>.<a>.<b>` (1 a beats b, −1 b beats a, 0
neither). `<out>/compare.md` is the same as tables, with each population's cube, sha, ratings,
weights and run folder.

**Reading it.** Card flatness needs drafts: a 180-card cube's typical card plays about 0.6
decisive games a draft at best of three (two decks of some 25 nonbasic cards, about 2.3 games a
match), so a few hundred at 600 drafts, while at 6 drafts no card has 10 and the measure is absent. `pair_spread` and
`first_pick_top10` are biased upward by small samples, the same way in populations of the same
size, so read their differences rather than their levels. The AI drafts and plays every game:
a balanced cube here is one Forge's AI finds balanced.

## What it does not do

- It never touches the game: no bridge code, no wire, nothing the board reads
  (`watch` runs the bridge's own recorder, `mtgtable.RecordMatch`, as
  `scripts/spectate.sh` does, and changes nothing it writes).
  It boots the same engine the same way (`mtgtable.Bootstrap`), under the same
  lint, and writes only under `var/` (and the ratings TSV you ask for).
- Forge's AI is the only player. A card the AI misplays — Forge marks some
  `AI:RemAIDeck` — will look worse than it is; `check` lists them and the
  report tags them.
- Games are not byte-for-byte repeatable: Forge's AI runs on its own threads.
  The drafts and decks are (the same seed gives the same picks and decks on any
  machine and any `--jobs`), and so are play exploration's draws (D358).

# tools/ml/ — the dataset for a learned position evaluator

<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

The long-term plan, which the owner approved, is a stronger play AI for the 180-card cubes, trained on
this machine from self-play and with no LLM: **search over Forge's engine,
guided by a small learned position evaluator** that answers "who's winning from
this board?". This directory is the **preparation**: the pipeline that turns
recorded games into training rows, so collection can start as soon as the cube
lab records games. Decision **D305** is why it is built this way.

Python 3. `encode.py` is standard library only; `dataset.py` and
`baseline_eval.py` need **numpy**; `train_mlp.py` needs **torch** and exits 0
with a note when it is missing. Run everything from the repo root (hard rule 9).

## How data flows

```
cube lab (--record-all, D315) / tools/ml/record-pairs.sh / any seat or spectate recording
        │  frame logs: <run>/games/<seed>/g<n>-seat{0,1}.jsonl.gz, var/ml/games/*.jsonl, var/games/<id>/frames.jsonl
        ▼
encode.py      one row per decision state, a fixed-size vector for the cube's card pool
        ▼
dataset.py     split by game, int16 .npz shards + features.json + games.jsonl + stats.json
        ▼
baseline_eval.py (logistic regression, numpy)   train_mlp.py (small MLP, torch)
train_eval.py   the position evaluator: train, calibrate, compare, export JSON (D316)
        ▼
bridge/src/mtgtable/eval/   the same features and model in Java, for the search AI's leaves
```

```bash
# a night of the cube lab, recorded (both chairs of every game), then its dataset (D315):
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 45000 --games 1 --jobs 7 \
    --seed 100001 --record-all --out var/cubelab/runs/night-1    # resumable: the same line again continues
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1      # -> var/cubelab/runs/night-1/dataset/
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1 --run-dir var/cubelab/runs/night-2 \
    --out var/ml/data/synergy-nights                                 # several nights of one cube
# 1. games: the cube lab's recordings, or deck pairs recorded directly
tools/ml/record-pairs.sh --pairs var/ml/pairs.txt --seeds 1-4 --seats 0,1 --jobs 4
# 2. the dataset (the vocabulary is the cube the decks were drafted from)
python3 tools/ml/dataset.py --vocab cubes/synergy-cube-180.md --out var/ml/data/synergy var/ml/games
python3 tools/ml/dataset.py ... --group-by match      # every game of a deck pair in one split
python3 tools/ml/dataset.py ... --jobs 7              # 7 encoding processes; the same files as --jobs 1
# 3. the baselines
python3 tools/ml/baseline_eval.py var/ml/data/synergy --json var/ml/data/synergy/baseline.json
python3 tools/ml/train_mlp.py var/ml/data/synergy --out var/ml/models/synergy-mlp.pt
# rows as JSONL, for a look
python3 tools/ml/encode.py --vocab cubes/synergy-cube-180.md var/ml/games --out rows.jsonl \
    --features-json features.json
# the tests (gate step 12h; CI runs the standard-library half)
python3 -m unittest discover -s tools/ml/tests
```

`var/` is gitignored, and every output above belongs there. `record-pairs.sh`
takes a file of `<deckA.dck> <deckB.dck>` lines (decks inside the checkout),
gives each worker a Forge home of its own (`forge_home_make`, D129) and skips a
game already recorded, so a killed run resumes.

## What a row is

**A decision state**: a `state` frame in which the log's viewing seat holds
`priority`, the phase is a main phase or a combat step (`--phases` adds
`beginning`, `end` or any Forge phase name), and the game is not over. Two
consecutive decision states of one game with identical vectors are one row.
Every kind of log works: AI-vs-AI recordings (`RecordMatch`, `spectate.sh`,
the cube lab), seat recordings (`MtgTable`, the board, ForgeCoach), `.jsonl.gz`,
a client log's re-delivered frames (read once), a file with several headers.

**The label** is the eventual winner from the viewer's side: **+1** won, **−1**
lost, **0** a draw, from `over` (or a `gameOver` state). A game with no outcome
— a killed recorder, or an engine crash's `over` with `winner` and `reason` both
null (amendment M46) — gives no rows. Each row also carries `turns_to_end`
(the last turn minus this one) and `rows_to_end` (this game's decision rows
after this one), for tempo targets and for weighting.

**The perspective is always the viewer's**: `me` is the log's `seat`, `opp` the
other player. Recording both chairs of a game (`--seats 0,1`) is two
perspectives of one game: twice the rows, but one game for the split.

## The feature layout

`features.json` is the full layout — every feature's name, its block, offset
and meaning, the vocabulary, the card states, and a `schemaId` (a hash of the
names) that every dataset and model carries. For the 180-card synergy cube it
is **3,456 features**: 243 board-level ones and 3,213 card counts.

| block | size | what |
|---|---|---|
| `global` | 31 | turn, round, whose turn, priority, a phase one-hot (13 phases and none), the stack (size, mine, theirs, abilities), combat (attackers, attacking power, power in unblocked bands, blockers — per side) |
| `me.player`, `opp.player` | 31 each | life, poison, other player counters; hand, library, graveyard, exile, command **counts**; lands and untapped lands; untapped lands by colour (a basic land type gives its colour, a land with none — fetchlands, utility lands — counts as C); floating mana by colour; mana available (untapped lands + floating mana); this turn's land drop, lands played and spells cast (the storm count's share) and abilities put on the stack; this game's spells and lands; mulligans |
| `me.board`, `opp.board` | 30 each | the battlefield by controller: creatures, total and max power, toughness, untapped creatures and their power, damage marked, +1/+1, −1/−1 and other counters, planeswalkers and loyalty, artifacts, enchantments, tokens and token power, attached permanents, face-down permanents, and creatures with each of twelve keywords (flying, reach, first and double strike, deathtouch, lifelink, trample, vigilance, menace, haste, hexproof, indestructible) |
| `types` | 90 | for nine zone groups (my hand, battlefield, graveyard, exile, stack; theirs except the hand): card count, mana-value sum and max, and counts of creatures, lands, instants, sorceries, artifacts, enchantments and planeswalkers, over every card whose face the viewer sees |
| `cards` | vocab × 17 | how many copies of each vocabulary card are in each of 17 states: my hand; battlefield untapped, tapped, summoning-sick, attacking, blocking (mine and theirs: untapped and tapped split the battlefield, the other three are flags on top); graveyard, exile and stack (mine and theirs) |

**The vocabulary** is the closed card pool, from `--vocab`: a cube design file
in the format of `cubes/*.md` (`## The list`, `### Section (N)`, items split by
` · `, `Name — THEMES`, prices dropped, `WU:` pair prefixes, and `Shocklands: a,
b, c` group lines in a lands section — the cube lab's parser, `tools/cubelab/cube.ts`, read in Python: it gives the same 180 names in the same order for all four `cubes/*.md`),
a Forge `.dck`, or a plain list (`4 Name` allowed); several merge in order. The
slots are the six basics first, the pool in listed order, then three special
slots: **`<other>`** for any card outside the pool, **`<token>`** for every token,
**`<facedown>`** for every face-down card. The `types` block covers what the
`<other>` slot loses: an unknown card still adds its mana value and types.
A double-faced card is matched by the name the engine shows: the back face of
a transformed card (Delver's Insectile Aberration) is `<other>`.

Every feature is an integer, so the shards store `X` as **int16**; the
trainers standardise it with the training split's mean and deviation.

## Hidden information

The encoder is hard rule 8's fourth reader (after the redaction checker, the
narrator and the board), and it is **stricter than the log**:

- the opponent's hand is its `count` and nothing else — never a card of it, even
  one the log shows face up;
- both libraries are their `count` alone (a Future Sight top card is skipped);
- a redacted stub adds to its zone's count only;
- a face-down card is the `<facedown>` slot, never its `alt` name;
- no engine string but a card's public `name`, `types` and `manaCost` is read —
  never `stack[].text` or `cast.text`.

`tests/test_encode.py` holds it with a **scrambler**: every state of every
fixture has its hidden zones rewritten as if the log had leaked them (the
opponent's hand stubs become named cards, shuffled, with new ids; both libraries
get named cards; every stub gets a name; every opponent face-down card an
`alt`), and every feature of every row must be unchanged. A negative control
applies the same rewrite to the viewer's own hand and must change the rows, and
a planted leak (the encoder reading the opponent's hand) fails two tests.

## The split

`dataset.py` splits by **split group**, never by row, and the group is the
**deck pair** by default (`--group-by match`, since D317): every game of one
pair of decks -- one draft, in the cube lab -- lands in one split, so the test
split is decks the model never saw. A bench replays the same pairs over many
seeds, and D305's by-game split (`--group-by game`, still there) scores
positions of decks already seen in training: it flatters, measurably (below).
A log with no match block is its own group. The split is a hash of the group,
so it is deterministic and a game never changes split as the corpus grows.
`train_eval.py --split-by` re-splits a built dataset the same ways, and one
more: `holdout:REGEX` makes every game whose deck names or log path match the
test split -- a whole cube held out (`holdout:^modern-`,
`holdout:runs/vintage`), with a vocabulary that covers both cubes.

## The position evaluator (D316)

`train_eval.py` trains a position-value model -- P(the viewer wins) from one
row -- compares it with D305's baselines, and exports it as JSON for the Java
side, `bridge/src/mtgtable/eval/`, which the search AI calls at its leaves.

**The model** (`evalnet.py`'s header has the long form). The ~240 board
numbers go in standardised. The card block -- vocab x 17 counts, the part that
overfit in D305 -- is **pooled through one learned 8-number embedding per
card**, shared by all 17 states and both sides: `pooled[state] = sum_c
count[c, state] * E[c]`, then `concat(board, pooled)` -> a 64-unit ReLU layer ->
sigmoid. A card costs 8 parameters instead of 17 x 64; what is learned about a
card in hand transfers to it on either battlefield; `E` starts at zero and has
its own strong L2 (`--card-l2`), so a card seen rarely stays near zero and the
`types` block (counts and mana values by type and zone -- the "group by type
and mana value" half) carries it. Not read: the nine live-unsafe features (a
live Forge game cannot reproduce them as the log has them: this game's spells,
lands and mulligans, abilities this turn, the stack's ability count) and every
column constant in training (`excluded` in the export lists both).

**Training** is CPU numpy by default (gradients by hand, checked against finite
differences; it measured faster than CPU torch here), `--backend torch` for a
GPU. Early stopping on the validation split's log-loss (`--patience`).
`--grid --time-budget S` searches hidden size, embedding size, both L2s,
dropout and learning rate in a fixed random order and exports the best.
`--cv K` scores every row out of fold, folds by deck pair (leave-one-pair-out
when there are K pairs or fewer), early stopping on games held out inside each
fold's training pairs. Every report has log-loss, Brier, accuracy, expected
calibration error and a ten-bin reliability table, overall and by turn bucket,
for the model and for `prior`, `life` and `core` (D305's baselines) fitted on
the same rows.

**The export** (`formatVersion` 1) carries the schema id, the vocabulary, the
board columns with their mean and deviation, the embedding and the layers. Java
recomputes the schema id from the vocabulary and refuses a mismatch; a caller
naming its cube file refuses a model trained for another card list; a model
that reads a live-unsafe feature is refused for live use.

**Java, for the search** (`mtgtable.eval.PositionEvaluator`):

```java
PositionEvaluator ev = PositionEvaluator.load(Path.of("var/ml/models/synergy-eval.json"),
                                              Path.of("cubes/synergy-cube-180.md"));
double p = ev.winProbability(game, aiPlayer);   // P(aiPlayer wins), 0..1; ev.logit(...) too
```

It reads only what that player knows -- the other hand and both libraries are
sizes -- so a determinized copy scores exactly as the real game. One instance
serves every thread; call it where the game is not moving (a rollout's own
copy, or the game thread). Check `hasWon()/hasLost()` first: a finished game is
not special-cased. The model was trained on decision states (the viewer holding
priority in a main phase or combat); at another phase the inputs that were
constant in training are simply not read.

**Parity.** `bridge/build.sh` runs `mtgtable.eval.EvalSelfTest`:
`fixtures/eval/` holds a small model and Python's answer for every decision row
of the 22 committed recordings (`eval_golden.py`); Java must pick the same rows,
produce identical integer features and the same P(win) within 1e-9, read every
cube and deck list as Python does, and pass D305's hidden-zone scrambler.
`tools/ml/eval-live-check.sh` (boots Forge, not in the gate) plays games and
compares, at every decision of both chairs, the live encoding with the encoding
of `Snap.state` for the same moment, then redeals the hidden zones and requires
the live encoding not to move. A change to `encode.py` that moves a feature
fails `tests/test_eval.py`: run `python3 tools/ml/eval_golden.py` and read the
diff.

### On the owner's PC

The 7-worker night run is the cube lab's (`--record-all`, D315); then, from the
repo root:

```bash
# 0. once: numpy (and torch only for a GPU) in a venv under var/
python3 -m venv var/ml/venv && var/ml/venv/bin/pip install numpy
. var/ml/venv/bin/activate
./bridge/build.sh                                  # includes the Java parity self-test
# 1. the dataset, split by draft (the default)
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1 --out var/ml/data/night-1
# 2. the honest number first: five folds by draft
python3 tools/ml/train_eval.py var/ml/data/night-1 --cv 5 --report var/ml/reports/night-1-cv.json \
    | tee var/ml/reports/night-1-cv.txt
# 3. an overnight search, exporting the best model (6 h)
python3 tools/ml/train_eval.py var/ml/data/night-1 --grid --time-budget 21600 \
    --grid-log var/ml/reports/night-1-grid.jsonl --out var/ml/models/synergy-eval.json \
    --report var/ml/reports/night-1.json | tee var/ml/reports/night-1.txt
# 4. the live parity check on a few of the night's decks, one JVM, with the model
tools/ml/eval-live-check.sh --pairs var/ml/pairs-check.txt --seeds 1-5 \
    --vocab cubes/synergy-cube-180.md --model var/ml/models/synergy-eval.json \
    | tee var/ml/reports/live-check.txt
# 5. a second cube held out entirely: record it too, build ONE dataset over both
#    cubes' runs with both lists as the vocabulary, and hold one out
python3 tools/ml/dataset.py --vocab cubes/synergy-cube-180.md --vocab cubes/modern-era-cube-180.md \
    --out var/ml/data/two-cubes var/cubelab/runs/night-1/games var/cubelab/runs/modern-1/games
python3 tools/ml/train_eval.py var/ml/data/two-cubes --split-by 'holdout:runs/modern-1' \
    --report var/ml/reports/cube-holdout.json | tee var/ml/reports/cube-holdout.txt
```

`var/ml/pairs-check.txt` is `<deckA.dck> <deckB.dck>` lines (a few decks of the
run, copied under the checkout). **Send back** the `.txt` reports
(`night-1-cv`, `night-1`, `live-check`, `cube-holdout`), the dataset's
`stats.json`, the last lines of `night-1-grid.jsonl`, and the model's
`training` block (`python3 -c "import json;print(json.load(open('var/ml/models/synergy-eval.json'))['training'])"`).
`--batch 4096` is faster on the 9700X.

**Memory.** Training keeps the rows in the shards' int16 with the card block
sparse, re-splits as it reads the shards, computes the standardisation in chunks
and turns only the few columns a baseline reads into float64. That is about
0.7 KB a row, whatever the stage. A synthetic dataset of night-1's shape
(6,343,314 rows, 12,670 features, 24 card cells a row) peaked at 5.5 GiB through
a grid fit, its baselines and scoring, against 4.2 GiB at 1 M rows before the fix
(about 27 GiB at full size; D354's amendment). Every run logs
`memory: STAGE: rss X GB, peak Y GB` after loading, fitting, the baselines and
scoring, and the report carries the same numbers under `memory`. `--dry-load`
makes every allocation of a real run at full size without training: it loads
and splits the data, standardises, runs one batch, builds the baselines' matrices
and scores once. Then it prints `dry-load: ... peak RSS X GB` and exits. A job's
pilot runs the fit's own command line with `--dry-load` and its own `--report`:

```bash
python3 tools/ml/train_eval.py var/ml/data/night-1 --split-by pair --grid --time-budget 10800 --batch 4096 \
    --dry-load --report var/ml/reports/night-1-dry.json
```

## The win chance in ForgeCoach (D361)

The coach helper serves the evaluator to ForgeCoach: `POST /eval` on port 8643
(`tools/eval-runner.mjs`'s header is the contract) answers P(the viewing seat
wins) for the position the board shows, and ForgeCoach draws it as a win-chance
strip while you play and a line over a replay's timeline. The model stays on
this machine: the helper reads it from `var/ml/` (gitignored) and only the
number leaves the process.

```bash
./scripts/play.sh --engine-only                       # loads var/ml/models/night-1-eval.json when it exists
./scripts/play.sh --engine-only --eval-model var/ml/models/<other>.json
curl -s http://127.0.0.1:8643/health                  # ... "eval":1,"evalModel":"<sha12>","evalSchema":"<schemaId>"
grep EVAL var/play/coach.log                          # why it is off, when it is
python3 tools/ml/eval_serve.py --model var/ml/models/night-1-eval.json --log var/games/<id>/frames.jsonl
node tools/coach-helper.mjs --eval-schema 82815752c2f5e346 --eval-cube cubes/synergy-cube-180.md   # stricter checks
```

- **One encoder.** `eval_serve.py` runs in one child process of the helper
  (Python: `--eval-python`, else `var/ml/venv/bin/python3` when it exists, else
  `python3`; it needs numpy). It calls `encode.py`'s `TurnTally` and
  `encode_state` -- the functions behind `encode_game`, which is where
  `dataset.py`'s rows come from -- and `evalnet.py`'s forward pass. Nothing is
  ported.
- **The request** is the board's own state (the viewing seat's redacted view) and
  the game's earlier frames' `events` and `stack` (only those holding a `turn`,
  `land`, `cast` or `mulligan` event are needed). The history feeds the counters
  a training row carries: this turn's land drop, lands and spells.
- **Parity, proven.** `tests/test_eval_serve.py` (12h):
  - standard library: for every decision row of every committed recording, the
    vector built from the request (full and reduced history) equals
    `encode_game`'s row; the hidden-zone scrambler moves no online feature;
  - numpy: `dataset.py` builds a dataset of the recordings, a small model is
    trained on it, and for every row of every split the online vector equals the
    dataset's int16 row and the served P(win) equals the model's on that row (to
    1e-12), also through the JSON-lines process.
  `tools/eval-runner-selftest.mjs` (12f) sends two recordings' decision rows
  through the helper's `/eval`, built as ForgeCoach builds them, against
  `fixtures/eval/golden.json` (hash and P(win) to 1e-9).
- **Refusals.** The model is not served (and `/health` says `"eval": 0` with
  `evalError`) when the schema id `encode.py` computes from the model's own
  vocabulary is not its `schemaId` (the encoder changed since training), when
  `--eval-schema` or `--eval-cube` disagree, or when it reads a live-unsafe
  feature. Only D305's full schema is served: an r17 model (D359's outside exam)
  is refused.
- **Hidden information.** The evaluator reads only the request's state, and that
  state is what the viewing seat's board shows. It reads it the way the training
  rows read each chair's own log (each row is encoded from the log's own seat):
  the opponent's hand and both libraries are counts, a stub adds to a count, a
  face-down card is anonymous. A state whose viewer's own hand is redacted (made
  for the other seat) is refused, and the request has no other field.

### Uncertainty and "why" (D368)

```bash
# an ensemble: several seeds of one config, one schema (also: a directory, or a manifest)
./scripts/play.sh --engine-only --eval-model var/ml/models/night-1-eval.json,var/ml/models/night-1-eval-s1.json
./scripts/play.sh --engine-only               # prefers var/ml/models/night-1-ensemble.json when it exists
curl -s http://127.0.0.1:8643/health          # ... "evalEnsemble":5,"evalExplain":1
```

- **The ensemble.** `--eval-model` takes several exports of one schema --
  `a.json,b.json`, a directory (its `ensemble.json`, else every `*.json`), or a
  manifest `{"format": "mtgtable-position-eval-ensemble", "formatVersion": 1,
  "models": [paths relative to it]}`. Every member passes every refusal above,
  and all must share the schema id, vocabulary, feature count, card offset and
  card states. `/eval`'s `p` is the members' mean, `sd` their sample standard
  deviation, `n` their number. `sd` is how much training runs that differ only in
  their seed disagree about this position: the model's own uncertainty, not the
  game's. One model is served exactly as before (its own sha, its own P(win)).
  Training one needs nothing new: `train_eval.py` again with another `--seed`
  (the split does not depend on it).
- **The attributions** (`attribution.py`; `"explain": true` on `/eval`):
  integrated gradients in logit space, computed exactly (the ReLU network is
  piecewise linear along the path, walked segment by segment), against one
  baseline per model -- the training split's mean board and no card known by
  name. Each feature's share is grouped into a bucket ("your board", "their
  life", "cards in hand", "your mana and lands", "your Glorybringer"...). The
  shares sum to logit - baseline logit; points of win chance are the shares
  times (p - p0) / (logit - logit0), so they sum to 100 (p - p0). A card's own
  bucket is what the model knows of that card beyond its type, size and mana
  value (those are in the board buckets). Only cards in the encoded vector get a
  share, so only cards the viewer sees are ever named.
  `tests/test_attribution.py` checks completeness on every committed decision row
  (1e-9), the walk against a 4,000-point Riemann sum, gradient x input on a model
  with no hidden layer, and that D305's hidden-zone scrambler changes no
  attribution.
- **Where it is trusted.** The model learned from decision rows (the viewer
  holding priority in a main phase or combat, Forge's AI on both sides);
  `/eval` says `"decision": false` for any other state, and ForgeCoach shows
  only decision rows.

## The evaluator's three gates (D354)

The search uses the learned evaluator at its leaves (`SearchConfig`
`leaf=eval:<model.json>`) only after three gates pass, in order. Each gate's
rule is fixed in `gates.py` (`FIT_RULE`, `REGRET_RULE`, `SPRT_RULE`) and in
D354. Each script prints `PASS` or `FAIL` and takes no flag that loosens the
rule. A failed gate is not lowered: collect another night and retry.

```bash
M=var/ml/models/night-1-eval.json        # train_eval.py ... --split-by pair --out $M
# gate 1: the held-out fit (core baseline on decision rows; the fitted leaf on rebuilt turn ends; calibration)
python3 tools/ml/gate_fit.py heldout --model $M --out var/ml/gates/fit/heldout.txt
tools/ml/leaf-rows.sh --list var/ml/gates/fit/heldout.txt --model $M --out var/ml/gates/fit/leaf-rows.jsonl
python3 tools/ml/gate_fit.py score --model $M --leaf-rows var/ml/gates/fit/leaf-rows.jsonl --report var/ml/gates/fit/report.json
# gate 2: regret against full-game truth tables, on ~300 held-out decisions
R=var/ml/gates/regret
python3 tools/ml/gate_regret_build.py candidates --model $M --logs var/cubelab/queue --out $R/candidates.jsonl
python3 tools/ml/gate_regret_grade.py rank --leaf hand --requests $R/candidates.jsonl --out $R/rank-hand-3.jsonl --jobs 7
python3 tools/ml/gate_regret_build.py select --candidates $R/candidates.jsonl --screen $R/rank-hand-3.jsonl --out $R/set.jsonl
python3 tools/ml/gate_regret_grade.py truth --requests $R/set.jsonl --out $R/truth.jsonl --jobs 7      # a night; resumable
python3 tools/ml/gate_regret_grade.py rank --leaf eval:$M --requests $R/set.jsonl --out $R/rank-eval-3.jsonl --jobs 7
python3 tools/ml/gate_regret_score.py --set $R/set.jsonl --truth $R/truth.jsonl --hand $R/rank-hand-3.jsonl \
    --eval $R/rank-eval-3.jsonl --report $R/report.json
# gate 3: the SPRT, search-v1-fixed3 with the evaluator's leaves against search-v1-fixed3
N=$(python3 tools/ml/gate_sprt.py register --model $M --registry var/ml/gates/players.json)
tools/ai-ladder.sh sprt $N search-v1-fixed3 --elo0 0 --elo1 20 --max-games 2400 --registry var/ml/gates/players.json --jobs 7
python3 tools/ml/gate_sprt.py verdict --name $N --report var/ml/gates/sprt.json
```

How each gate works:

- **Gate 2's grading** goes through `coach-grade.sh serve`, the live analysis.
  - D348's hidden-information guard therefore holds. The opponent's hidden
    cards come from the run's cube list (pool mode), and the opponent's deck
    list is never sent.
  - `gate_regret_grade.py` runs K serve JVMs, each with its own Forge home. It
    writes an answer line per decision as it comes, and a rerun skips every
    answered decision.
  - A JVM that dies or hangs is restarted.
  - `<out>.meta.json` stamps the code version, and a resume under another
    version is refused (D341).
- **The rankers** score the same end-of-this-turn rollouts. Only the leaf
  differs: the hand leaf through σ(leaf/500), or the evaluator's P(win).
- **`gate_metrics.py`** prints flat numbers for the lab runner's checks.
- **The tests** are `tests/test_gates.py`. They run every rule on synthetic
  numbers whose answer is known, and drive the grading driver with a fake
  `serve`.

## Outside exam (17Lands)

**Data credit: 17Lands.** The human games come from 17Lands' public datasets
(https://www.17lands.com/public_datasets), licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/). What the exam reads is derived from them:
filtered to Arena's Powered Cube and to mostly-Vintage-cube boards, and re-encoded as r17
rows. 17Lands does not endorse this project. Only the published files are downloaded, never
the API, and nothing of them is committed (`var/` is gitignored; NOTICE §8).

**The question** (D359): the evaluator passed gate 1 on Forge-vs-Forge games — does what it
learned carry over to human games, or is it a model of Forge's habits? Arena's Powered Cube
shares 152 of the Vintage cube's 180 cards, and 17Lands' replay data records an end-of-turn
snapshot of every half-turn of its users' games. So a **reduced evaluator** is trained on our
Vintage-cube games with only the features both sources have, and scored on 17Lands' games
against simple rules fitted on our data.

**The reduced schema `r17`** (`r17.py`): at the end of each half-turn from turn 3 (never a
game's final half-turn) — the turn, its round, whose turn it was, on the play or the draw, both
life totals, both hand **sizes**, and per side the lands, non-land permanents, creatures and
off-vocabulary non-land permanents (tokens and face-down ones included), plus each
battlefield's vocabulary cards (a card block of vocabulary × 2). Missing on purpose: tapped
state, counters, damage, P/T, graveyards, exile, libraries, the stack, combat and every
decision. The net and trainer are D316's, pooling 2 card states instead of 17; an r17 model's
baselines are `prior`, `life`, `board` (the non-land permanent difference) and r17's reduced
`core`. Java refuses an r17 model.

```bash
# 1. our rows: the queue's Vintage-cube games (normal/vintage and the bridge folders naming vintage),
#    end-of-half-turn states, reserved decks dropped (D340), exploring games left out (D358's flag)
python3 tools/ml/dataset.py --schema r17 --queue-root var/cubelab/queue --cube vintage --nights 1 \
    --out var/ml/data/r17-vintage-n1 --jobs 7
# 2. the reduced evaluator, split by deck pair as gate 1's
python3 tools/ml/train_eval.py var/ml/data/r17-vintage-n1 --split-by pair --grid --time-budget 3600 \
    --out var/ml/models/r17-vintage-n1.json --report var/ml/reports/r17-vintage-n1.json
# 3. 17Lands' Powered Cube replays (resumed, size-checked) and their r17 rows
python3 tools/ml/ext17l.py fetch --set powered-premier --dir var/ml/17lands
python3 tools/ml/ext17l.py rows var/ml/17lands/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz \
    --out var/ml/17lands/rows-premier --perspective both
# 4. the exam: prints every table, the transfer gap and the verdict against EXAM_RULE
python3 tools/ml/outside_exam.py --model var/ml/models/r17-vintage-n1.json --ext var/ml/17lands/rows-premier \
    --report var/ml/reports/outside-exam.json
```

**The reader** (`ext17l.py`). A replay file has one row per game and column groups
`user_turn_N_*` / `oppo_turn_N_*` for the user's and the opponent's N-th turn; cards are Arena
ids named through `cards.csv` (cached; tokens have rarity `token`). The half-turns are ordered
by `on_play` (on the play the user's N-th turn is half-turn 2N−1); a half-turn the game reached
has a permanent on some battlefield at its end (past the end the number columns read `0.0`);
the last one is dropped, its snapshot being half-written. A position is written when at least
`--min-share` (0.5) of its non-basic permanents, both sides, are vocabulary cards; tokens and
unknown ids count as outside. `stats.json` counts the positions qualifying at 0.5, 0.7, 0.8
and 1.0. The file is streamed a megabyte at a time; `fetch --max-bytes N` takes only the
first N bytes, which the reader reads up to the last whole row (the exam then gives no verdict).

**Perspective.** A replay row is its 17Lands user's game, so the user is always "me" and the
label is whether the user won. The users run the tracker — a stronger-than-average population
that won 54% of the qualifying games — so every model starts with that calibration shift on
the same rows. Only hand sizes are read, so the user's knowledge of their own hand never enters.
`--perspective both` adds the opponent's mirror rows (label inverted) as a secondary table.

**The rule** (`EXAM_RULE` in `outside_exam.py`, D359; written before the run, no flag changes
it): on PremierDraft's `test` half (a hash of the game id), the user's rows, turn ≥ 3, share ≥
0.5, take the best simple rule b\* among prior, life and board. **PASS** when log-loss(b\*) −
log-loss(eval) > 0 with the lower end of its 95% interval from 2,000 resamples over 17Lands
games above 0, on at least 2,000 games and 10,000 rows (fewer: FAIL, underpowered). Every
simple rule is fitted on our training split only; nothing is tuned on 17Lands data, and the
`dev` half is for looking at. Reported beside it: the reduced core, every model by turn bucket
with Brier, accuracy and ECE, the dev half, share ≥ 0.8, both perspectives, TradDraft's file,
and the **transfer gap** — the evaluator's advantage over b\* on our test split minus its
advantage on 17Lands.

**Measured** (D359, this container): the PremierDraft file is 143 MB; all 266,117 games read
in 222–294 s on one process at a 0.40 GB peak; 2,667,602 user-side positions, of which 306,819
(11.5%) qualify at share ≥ 0.5 and 38,431 (1.4%) at ≥ 0.8; the rule's population is 154,302
rows from 51,161 games. The exam over those rows took 85 s at a 0.46 GB peak.

## Hardware: the owner's desktop

Ryzen 7 9700X (8 cores, 16 threads), 30 GB, a GTX 1080 (8 GB) until the RTX 50
card arrives (`docs/guides/gpu-day.md`).

- **Recording** is the bottleneck: every `RecordMatch` boots a JVM (Forge loads
  its card database first: `FModel.initialize` took 29 s here) and an AI-vs-AI cube game then took
  18–90 s of engine time in this branch's run, on a shared 4-core container at a
  load of ~15. Each JVM may grow to `-Xmx4096m` (hard rule 6), so `--jobs 6` is
  the most 30 GB holds with room for the desktop.
- **Encoding** is about 1,000 rows a second per process, single-threaded;
  `dataset.py --jobs N` spreads the recordings over N processes (one file each at a
  time, at most 2 × N in flight) and writes byte for byte what `--jobs 1` writes. While
  it runs, `progress.json` in the output folder holds the rows so far
  (`gate_metrics.py dataset` reads it until `stats.json`, written last, exists).
- **Storage**: a 180-card cube's row is 6.9 KB as int16 before compression and
  mostly zeros, so `.npz` compression is large. A million rows is ~7 GB raw in
  memory; train from shards, or `--shard-rows` small and stream, past that.
- **Training**: the logistic baseline is numpy on the CPU (seconds to minutes).
  The MLP (3,456 → 256 → 64 → 2 heads, ~0.9 M parameters) trains on the CPU
  well enough at this size; on the GTX 1080 install a CUDA torch whose arch
  list has `sm_60` or `sm_61` (`cu126` does; `docs/guides/gpu-day.md` §3 has the
  check), and for the RTX 50 card one with `sm_120` (CUDA 12.8 or later).
  Install it in a venv under `var/` (`python3 -m venv var/ml/venv`), never
  system-wide.

## What the cube lab needs to record for this to scale

*Items 1–4 and 6 are done by D315 (`run --record-all` / `--record-every N`,
and `--run-dir` here, which takes the run's own `cube.md` as the vocabulary and
refuses a cube whose sha256 is not the run's); 5 and the policy target below
are done by D347 (`--profile-mix`, and the decision records: *Policy targets*
below).*

1. **Every game, not the first M.** A position evaluator wants tens of
   thousands of games; `--record M` replays M drafts' decks through a fresh
   `RecordMatch` each. The lab should write a frame log for every game it plays,
   in the process that plays it (no second JVM per game).
2. **Both chairs.** Two perspectives of one game cost nothing extra in the
   engine if the lab writes both seats' redacted views from one game; today that
   is two `RecordMatch` runs.
3. **The match block.** `hello_ok.match` (`--match`) names both decks; the split
   uses it to keep the two chairs of a game together and `--group-by match` to
   hold decks out. Seeds must differ between games of one pair.
4. **The cube's own file** beside the run (`cubes/<cube>.md`), so the
   vocabulary is the pool the decks were drafted from; the `schemaId` names
   which vocabulary a dataset used.
5. **Varied play.** Forge's AI against itself is one policy; the four AI
   profiles, and later the search player itself, widen the positions seen.
6. **Gzip** (`.jsonl.gz`) for storage: the reader takes both.

For a policy (not only a value): every AI seat of a recorded lab or bench game
now logs each decision it takes (D347, next section).

## Policy targets — decision records (D347)

A recording made by the cube lab (`--record-all`) or ai-bench (`play
--record-all`) holds, **in each seat's own log only**, one `dir:"ai"`
`decision` line per decision that seat took with more than one legal answer
(protocol amendment M55):

```json
{"v":1,"seq":3,"t":1791047152050,"dir":"ai","type":"decision","body":{"seat":0,"n":2,"kind":"priority",
 "frame":25,"stateSeq":24,"turn":2,"phase":"MAIN1","options":["pass","cast:18","cast:37"],
 "chosen":"cast:18","by":"search",
 "search":{"options":[{"token":"pass","n":2,"meanLeaf":40.0,"se":0.0,"diff":0.0,"seDiff":0.0,"win":0.525},
                      {"token":"cast:18","n":2,"meanLeaf":80.0,"se":0.0,"diff":40.0,"seDiff":0.0,"win":0.5498}],
           "forge":0,"best":1,"rounds":2,"playouts":4,"horizon":0,"rule":"margin","margin":20,
           "ms":683,"budgetMs":30000,"timedOut":false,"overrode":true,"fallback":null}}}
```

(the search seat's third record in `fixtures/cubelab/decisions/`: Forge would
have passed; two rounds of rollouts put casting card 18 40 leaf points ahead,
past the 20-point margin, so the search overrode it.)

- **kinds**: `priority` (pass, play a land, cast, activate), `attack`, `block`,
  `target` (the targets of what the seat played: `parent` is that priority
  decision's `n`; or of a trigger), `choice` (an effect's choice of cards or
  players, yes/no, optional triggers), `mulligan`;
- **options** are the legal answers as the coach bench's and the grader's
  tokens over wire card ids; attacks and blocks list every combination while
  there are at most 64 (each creature's legality is the engine's; whole-
  declaration rules such as must-attack are not checked), else a shortlist with
  `complete: false`, and `atoms` (who can attack; every legal `b>a` block);
- **chosen** is one of them; **by** is the policy that chose (`forge`,
  `outlets` — D310's outlet policy, its reason in `why` — or `search`);
- **search** (when the search ran): each candidate's rounds (`n`), mean leaf
  score and its standard error, the paired difference to Forge's answer and its
  standard error (common random numbers: option 0 is Forge's), and win estimate
  (a finished playout 1/0/½, else a logistic of the leaf at
  `SearchPolicy.LEAF_SCALE` points per logit, D349's fitted 500, as the grader's live analysis);
  the rounds, playouts, horizon, the override rule, margin and the statistic it compared (`stat`, and `z` under `override=lcb`); whether it
  overrode Forge, whether the time budget cut it, and why it fell back to
  Forge's answer (`budget`, `copyError`, `unmappable`, `rolloutErrors`,
  `invalidAtEnd`) — `by` is `search` only when it reached a verdict;
- **frame / stateSeq**: the `state` frame the decision was taken in (the
  recorder flushes before each decision, so it is the position decided in);
- a one-option decision (a forced pass) is counted in the `decisions` summary
  line at the end, not written; the header's `seats` names each seat's
  `profile` and `policy`.

```bash
python3 tools/ml/policy_data.py --run-dir var/cubelab/runs/night-1           # -> <run>/policy/
python3 tools/ml/policy_data.py --vocab cubes/synergy-cube-180.md --out var/ml/policy/bench \
    var/ai-bench/<run>/games --searched-only                                 # expert-iteration targets only
```

`policy_data.py` writes, per split, `<split>-NNNNN.npz` (`X` int16 — the
decision state encoded for the deciding seat with D305's features — `game`,
`label`) and `<split>-NNNNN.jsonl`, one target per row in the same order
(`kind`, `options`, `chosen`, `chosenIndex`, `by`, `complete`, `atoms`,
`parent`, `source` and `search` with the per-option `tokens`, `n`,
`meanLeaf`, `se`, `diff`, `seDiff`, `win`), plus `games.jsonl` (each game's `source`, `ver`, `seat`,
`profile`, `policy`) and `stats.json` (rows per kind and policy, searched and
overriding rows, everything dropped and why). `--kinds` narrows the kinds,
`--searched-only` keeps the search's decisions. The split is `dataset.py`'s
(by deck pair). **D340 and D341 hold**: a game played with an AI-ladder
dev/confirm deck is dropped with its other chair, card for card (a bench
recording's two decks are read from the pairs file its header names), so is a
lab draft at a reserved seed; `--keep-reserved` turns it off and says so;
`--ver` keeps only some versions — a lab game's is its draft's `ver`, a bench
game's the header's `bench.ver` (D341's fields over `bridge/src`,
`tools/ai-bench` and `forge-home`, and the jar). Note that the ladder's own
games are played ON the dev and confirm decks, so its recordings are dropped by
default: record the search on other pairs (`pairs-cube.txt`, lab-drafted pairs
at lab seeds) to make training data of it.

Hidden information: the features are D305's encoder, which reads no hidden
zone (`tests/test_policy.py` scrambles every hidden zone of the committed
decision recording and requires no row to move), and a record of the other seat
is never read (the redaction checker fails such a log; the reader refuses it
too). Cost, measured (D347): three synergy-cube games, one worker, both chairs
recorded — see the decision's *Measured*.

## Exploring games (D358)

The queue's `--play-explore` (docs/guides/cube-lab.md, *Play exploration*) plays a
seeded share of the drafts with each seat answering some decisions at random (a
uniformly random legal move with probability epsilon, or a coin between two close
creature choices). Such a recording's header carries `playExplore`, and each decision
the explorer answered carries `explore: {rule, forge}` (`forge`: the seat's own answer).

| reader | default | flag |
|---|---|---|
| `dataset.py` (positions, the evaluator) | **keeps** them: the positions and the outcome are real | `--play-explore include\|exclude\|only`; `games.jsonl` marks `"explore": true`, `stats.json` counts them |
| `policy_data.py` (decision targets) | **drops every randomised decision** (counted in `notes`); keeps the rest of the game | -- |
| `matchup_data.py` / `matchup.py train` (card ratings) | **leaves them out**: a random move is not the deck's strength | `--play-explore include\|exclude\|only` |
| `matchup_verify.py`, `gate_regret_build.py` | leave them out | -- |

## The owner's own games — the human test set (D347)

Justin's games go under **`var/ml/human/`** (gitignored, like all of `var/`):
copy in ForgeCoach's saved games (the review screen's frame logs) and the
bridge's `var/games/<id>/frames.jsonl` for games played through it, one file
per game, any names, `.jsonl` or `.jsonl.gz`. Every dataset builder tags each
game with a stable **`source`** — `human` for anything under `var/ml/human/`
(or a `--human DIR`), `lab`, `bench`, `other` — in `games.jsonl` and
`stats.json`, and **never trains on a human game by default**: `dataset.py`
writes their rows to a fourth split, `human` (`human-NNNNN.npz`), and

```bash
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1 --out var/ml/data/night-1   # picks up var/ml/human/
python3 tools/ml/train_eval.py var/ml/data/night-1 --eval-human    # every model scored on the human games, apart
```

`--train-human` puts them into the normal split instead. A human seat's log
carries no decision records (only an AI seat writes them), so `policy_data.py`
counts human games and gives them no rows; the value evaluator's metrics on
them are the first number. The vocabulary must cover the human games' cards
(the cube they were drafted from); a card outside it is `<other>`.

## The matchup model — one card scale across every cube (D324)

A second, separate model: not "who's winning from this board" but **"which of
two decks wins"**, from both 40-card lists and who is on the play. It is meant
to become the ONE source of card value for every cube — replacing the per-cube
card win rates of `meta.json` (`winRateShrunk`, which mostly measure a card's
deck and archetype) and `learn.ts`'s per-cube fit — because it credits a card
net of its deckmates and its opponent, and pools a card's games across every
cube that lists it (722 distinct cards in the seven cubes' 1,260 slots).

```bash
# the record: one JSON line per decisive game, from any cube lab run folders or a queue root
python3 tools/ml/matchup_data.py var/cubelab/queue --out var/ml/matchup/games.jsonl --overlap
# train: the ladder of models, baselines, held-out drafts and cubes, power.tsv, balance.json, report.md
python3 tools/ml/matchup.py train var/cubelab/queue --out var/ml/matchup --holdout-cubes all [--embed 8]
# a candidate cube (prototype; PROPOSED BY MODEL, UNVERIFIED until the pre-registered test it prints says ACCEPT)
python3 tools/ml/matchup.py design --model var/ml/matchup --target-cube synergy --out var/ml/design/synergy.md
# the verification test's operating characteristics, and the uncertainty/balance check on a simulated world (seconds)
python3 tools/ml/matchup_verify.py sim --per-arm 8000 --trials 400
python3 tools/ml/matchup_sim.py --sigma 0.06
python3 -m unittest tools/ml/tests/test_matchup.py tools/ml/tests/test_review2.py
```

**The data needs nothing new from the lab.** `drafts.jsonl` already holds both
played decks, every game's winner and play side (`onPlayVerified`), and
`run.json` the cube; bridge runs (D322) add `bridge.from`, the cube each card
came from. `matchup_data.py` reads run folders into **the record (v1)**:
`{v, id, draft, pool, kind: normal|bridge, cubes, seed, game, deckA, deckB,
onPlay, winner, from?, run}`, decisive games only, each game once (a game is
its pool, seed, number and both decks: a copied folder is not counted twice),
cards keyed by name. Card features come from the engine facts the lab already
caches (`var/cubelab/facts/*.json`: type, colours, cost, P/T, rules text,
Forge's draft rank), so a card no game has shown still gets a guess.

**The ladder** (simplest first; a bigger model is used only if it beats the
smaller one on held-out drafts AND held-out cubes):

| model | what it is |
|---|---|
| M0 | pooled Bradley-Terry on cards: logit P(A) = Σ (n_A − n_B)·p_c + β·play, p_c = w·f_c + b_c — **one number per card**, its features as the prior mean |
| M1 | M0 + a per-cube deviation for a card in its cube's games (a hierarchy) |
| M2 | M0 + embeddings, a deck term and an antisymmetric matchup term (torch, `--embed k`) |

and three baselines: (a) coin with play/draw, (b) plain Bradley-Terry on cards,
(c) the per-cube shrunk win rates as `meta.json` computes them. The prior
widths (τ per card, τ_w for the features, τ_cube) are chosen by `--tau-by`:
**the Laplace evidence** (type-II maximum likelihood) when every draft has one
decisive game — the queue's default, where the games are independent and the
evidence is sound — else **5-fold cross-validation grouped by draft** (a best
of three's games share both decks, and the evidence would count them as
independent; D324). In the simulation (`matchup_sim.py`) the evidence lands on
the true τ where cross-validation's pick is noisy and low, and everything below
inherits τ (D342). The split is by draft (70/15/15 by a hash of the draft id —
the deck pair, as the evaluator's `--split-by pair`) and the held-out intervals
bootstrap over drafts. **A card's uncertainty is its Laplace posterior SD**
(`sdPost`: the square root of the diagonal of the inverse Hessian at the MAP,
centred as the power is; D342). The bootstrap over training drafts stays as
`sdBoot`, a misspecification check only: it measures how much the *shrunk*
estimate moves, about 0 for a card with no games, and understated the error
2–15× for the least-seen cards (review 2, N1). Numpy only for M0, M1 and the
baselines; torch only for M2.

**What it leaves out.** A game played with a deck of the AI ladder's dev or
confirm set (`tools/ai-bench/pairs-*.txt`), matched **card for card** whatever
its seed (`reserved.py`, D340), and on request games of other lab versions
(`--ver`, D341; every draft line carries `ver`, and the report counts games per
version). **AI-limited cards** (Forge's `AI:RemoveDeck:All`, from the engine
facts, a run's `cards.json` and the cube documents' notes; D343) are not
rated: their card columns are zero, so they stay at their feature prior, and
one shared column — how many such cards each deck holds — takes the dead weight
of a card Forge's pilot seldom casts, so it is not blamed on their deckmates.
`power.tsv` marks them `ai = limited` and does not rank them, `design` never
cuts one, and the queue spends no draft on learning one. `--rate-ai-limited`
switches this off.

**Outputs.** `power.tsv` (every card on one scale: logits per copy against the
average nonland card, × 25 ≈ points of win rate at even odds; `sdPost`, the
posterior SD — act on a card only where it is below about τ/2, review 2 N7;
`sdBoot`; the part the features predict; games; `ai`; the cubes listing it —
the `--power` input of `cubelab.sh queue`, which refuses an old file with only
a bootstrap `sd`), `cube-dev.tsv` (M1's per-cube deviations), `balance.json`
and `report.md` (held-out tables with sample sizes, calibration, held-out
cubes, **each cube's balance number**, bridge-deck composition, the overlap
report, games per lab version, the reserved games dropped), `model.json`
(`powerSdPost`; `design` refuses a model without it).

**The balance number** is the SD across a cube's decks of each deck's predicted
win rate against the cube's other decks (at most 400 of them), **de-biased for
shrinkage** (D342): the MAP's predictions are pulled toward even odds by an
amount that depends on how many games the cube has, so the old number read 3.6
for a true 6.1 points at 8k games and ranked cubes partly by sample size
(review 2, N2). It is now sqrt(mean of SD² over 200 draws from M1's Laplace
posterior) — the law of total variance: the spread of the posterior means plus
the variance the shrinkage left out — with the draws' 2.5–97.5% as its
interval. The report keeps the shrunk number beside it and a **reliability**,
shrunk² / de-biased², the share of the spread the data has pinned down:
**compare two cubes only when their reliabilities are alike.** On the
simulated world (8 seeds, `matchup_sim.py`) the de-biased number reads
close to the truth where the old one read balanced: 6.5–6.6 for a true
6.6–6.7 points (shrunk 4.0–5.6) and 3.2–3.4 for 3.4 (shrunk 1.6–2.2) on the
seed-7 worlds at 1,000–12,000 games; over seeds 1–4 it runs 3–7% high at a 6.5
spread and 12–16% high at a 3.3 spread, and its interval (a posterior interval
given τ) is too narrow — treat it as a lower bound (D342).

**Verifying a `design` candidate** (D344). `design` prints the exact job: both
arms (the original cube and the candidate, with the same ratings) on the same
fresh seeds in the verification range (800,000,000+), one game per draft, a
look every 2,000 drafts per arm up to 8,000, and `matchup_verify.py test` at
each look. The statistic is the difference of the two arms' between-archetype
variances of win rate (method of moments: raw variance minus binomial noise),
its SE a bootstrap over drafts; accept only when z crosses the O'Brien–Fleming
bound (3.47, 2.45, 2.00, 1.73: one-sided α 5% overall), stop for futility when
z < 0 from look 2. Simulated (`matchup_verify.py sim`, 400 trials, 10
archetypes): at 8,000 drafts per arm a no-change cube (5 → 5 points) is
accepted 4.5% of the time, a 5 → 3 improvement 90% (stopping after 5,930 drafts
per arm on average), 5 → 4 42%, a 5 → 7 worsening never (stopped at 4,035 on
average); at 4,000 per arm the 5 → 3 power is only 64%, at 12,000 99%. **One candidate costs about one PC night**; the
themes and roles are still a person's check.

**The balance number and ForgeCoach's flatness.** Flatness
(`src/cube/flatness.ts`) reads `meta.json`'s per-card and per-archetype win
rates and subtracts binomial noise; the matchup model's number is a deck-level
spread from a model fitted net of deckmates, de-biased for its shrinkage
(above; before D342 it was a lower bound); flatness's intervals are
too narrow under clumped games (a card's games come about 2.4 at a time from
one deck pair). Compare the two only at thousands of games per cube.

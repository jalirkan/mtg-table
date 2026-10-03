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
cube lab (--record-all, D313) / tools/ml/record-pairs.sh / any seat or spectate recording
        │  frame logs: <run>/games/<seed>/g<n>-seat{0,1}.jsonl.gz, var/ml/games/*.jsonl, var/games/<id>/frames.jsonl
        ▼
encode.py      one row per decision state, a fixed-size vector for the cube's card pool
        ▼
dataset.py     split by game, int16 .npz shards + features.json + games.jsonl + stats.json
        ▼
baseline_eval.py (logistic regression, numpy)   train_mlp.py (small MLP, torch)
        ▼
later: the evaluator guides a search over Forge's engine (not built yet)
```

```bash
# a night of the cube lab, recorded (both chairs of every game), then its dataset (D313):
tools/cubelab.sh run cubes/synergy-cube-180.md --drafts 5000 --games 3 --jobs 7 --seed 1 --record-all \
    --out var/cubelab/runs/night-1
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1      # -> var/cubelab/runs/night-1/dataset/
python3 tools/ml/dataset.py --run-dir var/cubelab/runs/night-1 --run-dir var/cubelab/runs/night-2 \
    --out var/ml/data/synergy-nights                                 # several nights of one cube
# 1. games: the cube lab's recordings, or deck pairs recorded directly
tools/ml/record-pairs.sh --pairs var/ml/pairs.txt --seeds 1-4 --seats 0,1 --jobs 4
# 2. the dataset (the vocabulary is the cube the decks were drafted from)
python3 tools/ml/dataset.py --vocab cubes/synergy-cube-180.md --out var/ml/data/synergy var/ml/games
python3 tools/ml/dataset.py ... --group-by match      # every game of a deck pair in one split
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

`dataset.py` splits **by game**, never by row: a row's split is a hash of its
game's **split group**, so it is deterministic and a game never changes split
as the corpus grows. One seed of one match is one game (protocol §8.7), so the
two chairs of a game are one group; a game with no seed is its own group.
`--group-by match` puts every game of a deck pair in one split, which asks the
harder question: does the evaluator generalise to decks it never saw? With many
drafted pairs, that is the number to trust.

## Hardware: the owner's desktop

Ryzen 7 9700X (8 cores, 16 threads), 30 GB, a GTX 1080 (8 GB) until the RTX 50
card arrives (`docs/guides/gpu-day.md`).

- **Recording** is the bottleneck: every `RecordMatch` boots a JVM (Forge loads
  its card database first: `FModel.initialize` took 29 s here) and an AI-vs-AI cube game then took
  18–90 s of engine time in this branch's run, on a shared 4-core container at a
  load of ~15. Each JVM may grow to `-Xmx4096m` (hard rule 6), so `--jobs 6` is
  the most 30 GB holds with room for the desktop.
- **Encoding** is about 1,000 rows a second per process, single-threaded.
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

*Items 1–4 and 6 are done by D313 (`run --record-all` / `--record-every N`,
and `--run-dir` here, which takes the run's own `cube.md` as the vocabulary and
refuses a cube whose sha256 is not the run's); 5 and the policy target below
are still open.*

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

Later, for a policy (not only a value): the seat's `act`/`answer` lines are in
seat recordings already; AI-vs-AI recordings carry no actions, so a policy
target needs the lab to log the AI's chosen action at each decision.

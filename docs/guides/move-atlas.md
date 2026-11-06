# The move atlas: its label pipeline and its dataset

The move atlas measures what each option of a Magic decision is worth by playing the rest of the game out many
times from the exact position. This guide is the manual of its second half, the scripts under `tools/atlas/` that
turn a finished spine folder into label rows and reads, and of the public dataset built from them
([D515](../decisions/D515-publish-the-atlas.md)). The first half, the engine side, is `tools/cubelab.sh atlas`, and
its manual is [the cube lab guide's *The move atlas*](cube-lab.md#the-move-atlas-d451).

## What the atlas is (cited, not re-derived)

- **The method** is [D451](../decisions/D451-move-atlas.md): two decks and a seed; a baseline game with Forge's
  Default AI on both seats; at chosen decisions of seat A, every option Forge listed (option 0 is Forge's own
  choice) forced on a fork of the real position, with what seat A cannot see redealt, and played out under two
  continuations, the random seat on both sides (the *random map*) and Forge on both (the *Forge map*). The cut
  design that decides how many branches each option gets is [D480](../decisions/D480-atlas-cut-design.md); the
  futility stop that ends a decision early when Forge's choice already leads is
  [D489](../decisions/D489-atlas-futility-stop.md).
- **The label contract is v6**, registered by lab job J177 before its data: one row per branched decision,
  complete, screened or partial, every field of v5 kept. Its definitions are the comment block of
  `tools/atlas/labels.py` (the J177 and J173 paragraphs), and the field dictionary below says what each key holds.
- **The population** is D508's ([D508](../decisions/D508-last-known-copy-judged-where-the-card-is.md)): the seat
  policy that six nights (J186, J187, J188, J190, J191, J193) ran unchanged, pooled under the names
  `random-<band>-d508` with `randomSeat` `D508`. D489's *Comparability* rule is why rows pool only inside one
  population.
- **The seat is frozen** between landings ([D509](../decisions/D509-seat-frozen-between-landings.md)): nothing that
  changes what the seat plays or offers lands while a population runs, and a reader pooling leaves out the units a
  night failed on (point 4).

## The pipeline

| step | command | writes |
|---|---|---|
| draw the decks | `tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10 --out <dir>` | `<dir>/decks/*.dck`, `decks.jsonl`, `decks.json` (D447; no engine) |
| play a spine | `tools/cubelab.sh atlas --deck-a … --deck-b … --seed <g> --phase b …` | the spine folder: `plan.json`, `phaseB/`, `atlas.json`, `atlas.md` (D451; boots Forge) |
| scan its frame logs | `python3 -I tools/atlas/metrics.py --scan <spine> <cache dir> <jobs>` | `<cache dir>/<spine>.json`: the refused and lost casts per option (optional) |
| label it | `python3 -I tools/atlas/labels.py NAME:POOL:DECKSEED:GAMESEED:SHA:DIR … --out=labels.jsonl` | the label rows, and the reads on stdout |
| read a night | `reads.py`, `ncurve.py`, `cuts.py`, `compare.py` | one JSON object each on stdout |
| release | `python3 -I tools/atlas/release.py --out … --night J193=<dir> …` | the dataset folder and its zip |

`tools/README.md` has a row for every script under `tools/atlas/`. Each script's header says what it reads and
writes. Five of them (`draws.py`, `drawsha.py`, `deckcheck.py`, `deckcode.py`, `pilot.py`) are a lab night's pilot
checks and carry J193's seeds; a later night edits their constants, as it edits `metrics.py`'s spine table.

## Make one spine on your machine

This needs what the rest of the repository needs: Forge 2.0.14 (the jar the root `CLAUDE.md` pins by sha256), a
Java 21 runtime, Node 24, Python 3 and the repository at any commit since D515. It plays J193's s07, a legacy pair
with a Forge map, at J193's settings, with four workers.

```bash
./tools/make-forge-home.sh && ./tools/check-forge.sh && ./bridge/build.sh

# 1. the decks: a function of the seed and the draw code (D294, D447); these are byte for byte J193's s07 decks
tools/cubelab.sh decks --band legacy --count 2 --seed 3691 --cross-band 0.10 --out var/atlas-demo/decks/s07-legacy-3691
python3 -I tools/atlas/drawsha.py var/atlas-demo/decks/s07-legacy-3691
#   1686096db3ec04c2defd228d7349c78809c33719113a5e31b9086efa193d57cf 2   (J193's draw)

# 2. the spine: J193's design (150 random branches, the futility stop at 50 with a quarter played on, the cuts,
#    10 decisions, a Forge map of 40 branches); J193's took two hours at six workers
K=var/atlas-demo/decks/s07-legacy-3691/decks
tools/cubelab.sh atlas --deck-a $K/legacy-3691-00001.dck --deck-b $K/legacy-3691-00002.dck --seed 3791 \
    --phase b --decisions 10 --min-options 3 --screen 25 --early-stop 50,100 --branch-random 150 --branch-forge 40 \
    --futility 0 --futility-tie 0 --futility-sample 0.25 --chunk 25 --checks-parallel 4 --unit-timeout 30 --jobs 4 \
    --out var/atlas-demo/b-s07-legacy-3791

# 3. the frame-log scan (the refused and lost casts; optional, a few minutes)
python3 -I tools/atlas/metrics.py --scan var/atlas-demo/b-s07-legacy-3791 var/atlas-demo/lost 4

# 4. the labels: NAME:POOL:DECKSEED:GAMESEED:SHA:DIR, as the nights' reports passed them
python3 -I tools/atlas/labels.py \
    s07:random-legacy-d508:3691:3791:$(git rev-parse --short=8 HEAD):var/atlas-demo/b-s07-legacy-3791 \
    --out=var/atlas-demo/labels.jsonl --training=1 --lost=var/atlas-demo/lost > var/atlas-demo/labels.json
```

`LAB_DATA_DIR` (D450) moves everything the lab writes under `var/` to another drive; a spine with frame logs is
about a gigabyte. A spine played again is a new measurement of the same position, not a copy of J193's: the
atlas replays the baseline from its seed in every unit and checks it reaches the same decision (D511), but read the
two spines' numbers side by side rather than expecting the same bytes. The release's
`atlas/J193/b-s07-legacy-3791.atlas.json` is J193's own.

**Reading a night of your own.** `compare.py <night folder> <labels.json>` gives the spine's numbers;
`reads.py s07:random-legacy-d508:<spine>/atlas.json` the agreement between the two maps; `ncurve.py s07:<spine>` how
many labels were already confident at 50 and 100 branches.

## The label row

<!-- fields -->
| key | what it holds |
|---|---|
| `v` | 6, the row's version |
| `contract` | `mtg-table rung-4b label v6 (J177)` |
| `night` | the lab night that made the row, `J186` … `J193` (added by the release; not written by `labels.py`) |
| `spine` | the spine's position in its night, `s01` … `s13`; with `night`, the key of a spine |
| `pool` | `random-<band>-d508`: the band the decks were drawn from (pauper, peasant, legacy, powered) and the seat's population |
| `training` | `true` when the night passed `--training=1` (every row of these nights) |
| `split` | `"train"` when `training`, else null |
| `deckA` | seat A's deck file (in the release, `decks/<night>/<deck folder>/<file>.dck`) |
| `deckB` | seat B's deck file, the same way |
| `deckSeed` | the seed the two decks were drawn at (`tools/cubelab.sh decks --seed`) |
| `spineSeed` | the baseline game's seed (`tools/cubelab.sh atlas --seed`) |
| `sha` | the generator's commit the night ran at, eight hex digits |
| `listing` | `D483` when the baseline gave a play identity beside every option, `pre-D483` otherwise |
| `playCount` | the distinct plays among the options (distinct identities) |
| `tokenTwice` | one token names two options |
| `randomSeat` | the random seat's population, `D508` |
| `biased` | `lost-cast` on a spine a reader marked biased (`--biased=`), else null; null throughout |
| `d` | the decision: its index among seat A's listed decisions of the baseline game |
| `kind` | `p` a priority (cast, activate or pass), `a` the attack, `b` the blocks |
| `turn` | the game turn of the decision |
| `k` | the number of options |
| `kBucket` | `k` as `2`, `3-4`, `5-6` or `7-8` |
| `why` | why the schedule branched it: `spread`, `fill` or `replaces` (D480) |
| `replaces` | the screened decision it replaced, else null |
| `forgeOption` | the option Forge's AI chose in the baseline, always 0 |
| `forgeToken` | that option's token |
| `options` | the options in order, each an object of the seven keys below |
| `options[].o` | the option's index; 0 is Forge's choice |
| `options[].token` | the play: `pass`, `cast:<card id>`, `activate:<card id>#<ability>`, `attack:<attacker ids>` or `attack:none`, `block:<blocker>><attacker>,…` or `block:none` (card ids are the game's own) |
| `options[].label` | a readable name: the card's name for a cast or an activation, `attack <names>`, `block <blocker>><attacker>`, `pass` |
| `options[].identity` | the play identity, `name\|spell or ability\|face\|alternative cost\|AltCost\|may-play host\|free\|optional costs` (the release drops a ninth field, Forge's rules text); `pass`, `attack:…` and `block:…` are their tokens |
| `options[].stoppedAt` | the random-branch count at which early stopping stopped the option, else null |
| `options[].random` | `n` branch games, `mean` score (win 1, draw .5, loss 0) and its Wilson 95% interval `lo`, `hi`, on the random map |
| `options[].forge` | the same on the Forge map; `n` 0 and nulls on a spine without one or a decision not branched there |
| `bestRandom` | the option with the best random-map mean |
| `bestForge` | the same on the Forge map; null without one |
| `regret` | the best random-map mean minus option 0's |
| `regretLo` | the low end of `regret`'s paired-bootstrap 95% interval |
| `regretHi` | its high end |
| `regretForge` | `regret` on the Forge map; null without one |
| `regretForgeLo` | its interval's low end |
| `regretForgeHi` | its interval's high end |
| `confident` | complete, not partial, and `regretLo` > 0: an option beat Forge's choice on the random map |
| `confidentForge` | complete and `regretForgeLo` > 0, on a spine with a Forge map; null otherwise |
| `complete` | every option branched as the plan wants (D480's `complete`); never a screened or partial decision |
| `screened` | the screen settled it after 25 branches (the decision's mean value ≤ .04 or ≥ .96) |
| `screenMean` | the decision's mean value at the screen's checkpoint |
| `partial` | the futility stop ended it at its checkpoint (D489) |
| `stoppedAt` | that checkpoint's random-branch count (50) on a partial row, else null |
| `stopWhy` | `futile` on a partial row, else null |
| `futilityControl` | one the stop would have ended, played to the full count as the rule's control |
| `futilityGap` | option 0's gap to the best mean at the futility checkpoint; null where the rule did not read it |
| `branchRandom` | the plan's random branches an option (150) |
| `decided` | complete and every option ≥ .95 (atlas.json's definition) |
| `inQ` | complete and not decided |
| `settled` | atlas.json's: decided, every option ≤ .05, or screened |
| `gap` | the best minus the worst random-map mean, on a complete row; else null |
| `rho` | the rank correlation of the options' values between the two maps; null without a Forge map |
| `sameBest` | the two maps name the same best option; null without a Forge map |
| `forgeMap` | the spine has a Forge map |
| `branches` | the plan: `random` and `forge` branch counts, `branchTimeoutSec`, and `cuts` (D480's and D489's settings) |
| `view` | seat A in the baseline: `seat` (its index), `player` (`Drafter A`), `deck` (`A`) |
| `frameLog` | seat A's baseline frame log (relative to the night's data folder in the release; not in v1) |
| `rows` | `file`, the baseline's decision rows (not in v1); `seatRow`, the row read (= `d`); `match`, its tokens, kind and turn are the listing's |
| `branchFrames` | the pattern of the decision's branch frame logs (not in v1) |
| `branchesFile` | the spine's branch rows (in the release, `branches/<night>/<spine>.branches.jsonl`) |
| `atlas` | the spine's atlas.json (in the release, `atlas/<night>/<spine>.atlas.json`) |
| `modesDrawn` | the plays whose modes the branches' random seats drew (D486), summed over the decision's branch rows |
| `retargeted` | the plays whose stale targets they replaced (D485), summed |
| `targetCountTrimmed` | the plays whose target count they cut to one they could pay for (D488), summed |
| `costTargetAvoided` | the plays whose targets they drew away from the play's own cost (D488), summed |
| `modesDrawnBranches` | the decision's branch rows with `modesDrawn` > 0 |
| `targetCountTrimmedBranches` | its branch rows with `targetCountTrimmed` > 0 |
| `costTargetAvoidedBranches` | its branch rows with `costTargetAvoided` > 0 |
| `branchRows` | its branch rows, both maps |
| `fullN` | option 0's random-map branch rows |
| `branchedInFull` | complete and `fullN` ≥ `branchRandom` |
| `lostCastOptions` | the options whose forced cast was lost (no trace of it on the stack) in more than half their branches, from the frame-log scan; null without one |
| `lostCastVoid` | option 0 is among them; null without a scan |
| `lostCastBranches` | the decision's branch games with a lost cast; null without a scan |
| `refusedCastOptions` | the options whose forced cast was refused (put back in its caster's hand) in more than half their branches; null without a scan |
| `refusedCastVoid` | option 0 is among them; null without a scan |
| `refusedCastBranches` | the decision's branch games with a refused cast; null without a scan |
| `refusedCastBranchShare` | `refusedCastBranches` over `branchRows`; null without a scan |
| `void` | `D470` on a block decision whose options all played the same game in every branch, else null |
| `voidEvidence` | on a void row only: per map, how many branch indices played identically |
<!-- /fields -->

## The dataset

`tools/atlas/release.py` builds the public release: one folder and its zip under `var/release/`, every label row of
the population's six nights but the excluded units, each spine's branch rows and `atlas.json`, the decks, a README
(which opens with the YAML front matter Hugging Face reads as a dataset card), a manifest, `LICENSE.md` and
`CITATION.cff` (the dataset's citation, the same block as the first reference of the repository's own
`CITATION.cff`; [D516](../decisions/D516-public-ready.md)). Its header has the layout, the scrub and the check; [D515](../decisions/D515-publish-the-atlas.md)
has the decision, the licences and what stays the owner's. v1 was built with:

```bash
L=<the lab's data folder>; R=<the runner's results folder>
# J186 stopped before its report: its rows are made again exactly as its report would have (J187's job file)
largs=""; for d in $L/lab-j186/b-s??-*-25??; do
  [ -f $d/atlas.json ] || continue; n=$(basename $d); s=$(echo $n | cut -d- -f2); b=$(echo $n | cut -d- -f3); g=$(echo $n | cut -d- -f4)
  largs="$largs $s:random-$b-d508:$((g - 100)):$g:e557dedf:$d"
done
mkdir -p var/release/work
python3 -I tools/atlas/labels.py $largs --out=var/release/work/j186-labels.jsonl --training=1 \
    --times=$L/lab-j186/spine-times.txt > var/release/work/j186-labels.json
python3 -I tools/atlas/release.py --out var/release/move-atlas-v1 \
    --night J186=$L/lab-j186 --labels J186=var/release/work/j186-labels.jsonl --night J187=$L/lab-j187 \
    --night J188=$L/lab-j188 --night J190=$L/lab-j190 --night J191=$L/lab-j191 --night J193=$L/lab-j193 \
    --results J186=$R/J186 --results J187=$R/J187 --results J188=$R/J188 --results J190=$R/J190 \
    --results J191=$R/J191 --results J193=$R/J193
```

The scrub keeps card names and drops card text: the ninth field of a play identity (Forge's description of the
play, which renders the rules text) and an activated ability's text in its label. The check that ends the build
fails on an absolute path of a home, mount or temp folder or a Windows drive, on the owner's name, a mail address,
the building machine's host name, Forge's `CARDNAME` placeholder or a mana symbol, on an identity with a ninth
field, and on an activate label that is not its card's name (and an absolute path outside a night's folder stops
the build before anything is written); `python3 -I tools/atlas/release.py --check <folder>`
runs it alone.

## The fixture and the tests

`fixtures/atlas/night/` is J193's s07 cut down by `tools/atlas/make_fixture.py`: its atlas.json, baseline and decks
as they ran (scrubbed), three branches of every option. `tools/atlas/tests/test_atlas.py` runs `labels.py` and
`compare.py` over it against golden counts, builds a release from it and plants each thing the scrub check must
catch. The gate runs it as step 12n, and CI's `redaction` job too.

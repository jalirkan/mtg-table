id: J158
title: The move atlas, rung 3 -- the first labelling night, sized for one night: five confirm-set pairs by D451's pair rule weighted by what a label tells (fair-fight-900000005 two spines, peasant-900000007, pauper-900000005, synergy-900000009, modern-era-900000007 one each; the vintage cube left out on J157's evidence), six Forge-vs-Forge spine games at fresh seeds 461-466, 16 decisions a spine, every option forked 200 times random and 40 times Forge as in rung 2, no phase A; the output is the label set, labels.jsonl (the rung-3 contract rung 4 reads), and labels per night by pair; on db496097 (the step clock, D467). Pre-registered reads, numbers only; method only, no outcome rule beyond D451's and J156's (iv)
public_title: Move atlas 3: the first labelling night
public_est: ~10 h
public_decides: None by itself; labels a night by deck pair, before 7-8 nights are committed
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@db496097 (the merge of #185 and #186 over 9fe69ad8: D466's follow-ups with atlas-selftest's G5 leg, and the atlas's branch timeout read inside an engine step (D467))
decides: nothing by itself. Rung 3 of the atlas ladder: turn the map into LABELS. For each branched decision, the regret of Forge's choice (the best option's random-map value minus Forge's option's, with its interval), and whether it is confident (the interval's low end above zero); measured on one night so the cloud and Justin can read labels per night, and confident labels per night, by pair, before committing the 7-8 nights a 1,000-label set would take
hypothesis: none to confirm about the maps. The sizing has a prior: J156's spines, read by this file's labels.py, gave per 10 h at 6 workers ff5 69 labels (26 confident), peasant7 135 (31), vintage7 266 (7); J157's vintage median best-worst gap 1.5 points. One candidate is read for repetition (iv): C1 "cast now where Forge passes", +8.3 points [4.2, 13.3] on ff5 at seeds 452-454 (J156)
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459 (unit watchdog), D465, D466 and D467. Pre-registered here, before any J158 data: the label contract and the reads (a)-(c) computed by var/lab-j158-local/bin/labels.py, and J156's reads (i)-(vi) plus (iv) by pair computed by var/lab-j158-local/bin/reads.py, both exactly as written in the pilot. A candidate of (iv) HOLDS on a pair only if its point is > 0 (J148's and J156's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~10 h at 7 workers (sizing below): pilot ~15 min; six spines ~9.8 h with their checks (ff5 ~2.05 h each, peasant7 ~1.05 h, pauper5 ~2.05 h, synergy9 ~1.55 h, modern7 ~1.0 h); report ~2 min. Disk ~17 GB on the lab data folder /home/justin-a/code/lab/data (J156: an ff5 spine 3.3 GB, a peasant spine 1.6 GB)
resumable: yes
timeout: 5h
progress: lines /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/branches.jsonl of 81000
metrics: branches = lines /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j158/b-*/phaseB/logs/*.log "Didn't find what to pay for"
metrics: armed = sh: cat var/lab-j158-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j158-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j158') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.decisions, atlas.labels, atlas.confident, atlas.meanRho, atlas.refusedCastFf5, atlas.branchTimeouts, atlas.branchTimeoutsInStep, atlas.problems

**Why.** The atlas ladder (the cloud, 2026-10-21; HEARTBEAT *What's our strategy*): rung 1 (J148) drew one
game's two maps; rung 2 (J156, J157) drew nine spines and measured what a labelled decision costs; **rung 3
turns the map into LABELS** -- for each decision the atlas scores, the regret of what Forge chose (the best
option's random-map value minus the chosen one's), and decisions whose regret is confident become training
rows, their full frames kept; rung 4 trains an option scorer on those rows and holds it to the fixed-match
bar. The cloud, 2026-10-23 16:55 UTC: "Weight the pairs by what each label tells: vintage is low-information,
ff5-like pairs are high. Size it for one night first and report labels per night before committing the 7-8
nights." This is that night.

**What changed since J157** (in the pin; the pilot checks each is there):
- **The step clock (D467, #186).** `Atlas.StepClock` reads the 120-s branch deadline on the branch copy's
  event bus, inside an engine step, and ends a branch that never leaves one step as an engine error
  (`timedOut` and `engineError` on its row). J156's and J157's one hung unit (vintage 458 d9, an Ocelot Pride
  token cascade) cost each run a unit; here it would cost one branch. **`branchTimeouts`** counts every
  timed-out branch and **`branchTimeoutsInStep`** the ones the clock ended inside a step: reported, not checked.
- **D466's follow-ups (#185).** atlas-selftest has a G5 leg on the committed ff5 pair (seed 452, 6 rollouts,
  `refusedCast >= 1` and `noRepeatRefused >= 1`); a skipped rows id check is named (`checks.idChecksSkipped`).
- Nothing else moved the random policy: **J158's random seat is J157's** (9fe69ad8, D466 point 4: a refused
  cast puts its card back), so J158's numbers sit beside J157's, and beside J156's (6fb13bf9, before the
  put-back) as a different policy, never pooled with them.

**The pairs, weighted by what a label tells.** D451's pair rule (point 3: the smallest |p - 1/2| + 1.96
sqrt(p(1-p)/n) over a line's decisive ladder games) ranks `tools/ai-bench/pairs-confirm.txt` over the ladder's
25,056 games (`autoPair` on the lab's `var/ai-ladder`, 2026-10-23; unchanged since J156):

| rank | line | pair | games | A won | score | ladder turns (mean) | here |
|---|---|---|---|---|---|---|---|
| 1 | 2 | fair-fight-900000005 (ff5) | 844 | 439 | 0.0538 | 17.9 | **2 spines** |
| 2 | 18 | peasant-900000007 (peasant7) | 828 | 397 | 0.0546 | 16.6 | **1 spine** |
| 3 | 28 | vintage-900000007 | 832 | 395 | 0.0592 | 14.5 | left out |
| 4 | 25 | vintage-900000001 | 836 | 442 | 0.0625 | 16.3 | left out |
| 5 | 12 | pauper-900000005 (pauper5) | 832 | 382 | 0.0747 | 21.2 | **1 spine** |
| 6 | 24 | synergy-900000009 (synergy9) | 836 | 383 | 0.0756 | 17.7 | **1 spine** |
| 7 | 8 | modern-era-900000007 (modern7) | 836 | 460 | 0.0840 | 15.8 | **1 spine** |

- **Vintage is left out, both lines.** J157 measured the vintage cube's pair on the fixed tool: a median
  best-worst option gap of **1.5 points**, 12 of 43 decisions settled either way, priority regret 1.3 points
  [0.5, 2.6] with 1 decision of 29 clear of zero, Forge-vs-Forge spines of 11-14 turns. Read by this file's
  labels.py, J156's vintage spines gave 1 confident label in 36 (0.028 [0.0, 0.098]) against ff5's 18 in 48
  (0.375 [0.229, 0.521]). vintage-900000001 is a draft of the same cube, so it is left out with it; it is the
  first line a later night adds if the vintage cube is to be measured again.
- **ff5 gets two spines.** It is the high-information pair (J156: the largest regrets, priority 8.9 points
  [5.2, 13.7]; median gap 9.75 points; rho 0.554 [0.289, 0.774]) and the repeat pair of C1. Its labels cost
  the most (J156: 2.3 h a spine at 6 workers), and per 10 h it gave 26 confident labels to peasant7's 31.
- **peasant7 gets one fresh spine** (J156: 11 confident labels of 48, median gap 6.0 points).
- **The next three lines by the rule get one spine each** (pauper5, synergy9, modern7): unmeasured pairs, so
  that the 7-8 nights can be split by measured labels per night instead of guessed. One spine a pair makes
  their intervals decision-level only; that is the price of measuring five pairs in one night.

**The design** (D451's method; rung 2's sizes, so the labels are comparable to J156's and J157's):

| | |
|---|---|
| spines | six Forge-vs-Forge baseline games at fresh seeds (never 451-460): ff5 **461, 462**; peasant7 **463**; pauper5 **464**; synergy9 **465**; modern7 **466**. Run in that order but ff5's second last (461, 463, 464, 465, 466, 462), so a short night still covers every pair |
| phase A | **none.** Labels are phase B's; phase A (rung 2's random-vs-random rollouts from the opening) labels nothing and would cost ~0.6 h a pair |
| phase B | each spine `--phase b`, its own folder `var/lab-j158/b-<pair>-<seed>` (re-rooted to the data folder); **16 of seat A's decisions** evenly spaced by D451's `spread` (all if the game lists 16 or fewer); every option **200 times random, 40 times Forge**, units of 25 branches; `--unit-timeout 30` (minutes, monotonic); the branch timeout at its 120-s default, now read inside a step (D467); `--branch-error-max` at its 0.1 default |
| checks | D451 point 6 on every folder as D466 amends it |

**Sizing** (J156's measured spines, wall time from `plan.json` to `atlas.json`, the checks included, at 6
workers; the phase-B part scaled to 7):
- ff5: 175, 85 and 156 min a spine at 6 workers (67, 52 and 59 options); **~2.05 h** at 7. Two: ~4.1 h.
- peasant7: 79, 74 and 60 min; **~1.05 h** at 7.
- The three unmeasured pairs, by their ladder game length against ff5's 17.9 and peasant7's 16.6 turns:
  pauper5 (21.2) at ff5's **~2.05 h**, synergy9 (17.7) at the two pairs' mean **~1.55 h**, modern7 (15.8) at
  peasant7's **~1.0 h**.
- **Six spines ~9.8 h**, the pilot ~15 min, the report ~2 min: **~10 h**. ~96 labels if every spine lists 16
  decisions; at J156's confident shares, ~25 confident.
- **`timeout: 5h`** bounds each block (one spine a block): the largest is an unmeasured pair at up to 1.25 x
  ff5's slowest measured spine (2.6 h at 7 workers), ~3.3 h, + 50%.
- **Disk** ~17 GB; the pilot and every block require 50 GB free (651 GB free on 2026-10-23), and `abort:`
  fires under 50 GB.

**Where it writes: the lab data folder,** as J156 and J157: every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, and `atlasCommand` re-roots `--out var/lab-j158/...` there through
`labPath(..., 'write')`. **A new folder, `lab-j158`.** J156's `lab-j150` and J157's `lab-j157` are read, never
written (the pilot proves reads.py and labels.py on them). The Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J158`),
`atlas-selftest`'s own folder and the job's scripts (`var/lab-j158-local/`) stay in the clone. As J144/J149/J156/J157:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`;
- they `mkdir -p` the data folder before anything reads it, and stop under 50 GB free;
- every run block asserts the path and the 50 GB again before it plays;
- `abort:` fires under 50 GB;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path.
- **No `clean:`, and nothing is deleted there: rung 4 reads these folders** (below). A restart from scratch
  would need `/home/justin-a/code/lab/data/lab-j158` moved aside by hand, by Justin or the PC session, and
  `var/lab-j158-local/armed.txt` removed (the J152 lesson, below).

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it and hold the GPU lane.
No `pilot_cores:` (the J146 lesson). A light job may still run beside it; keep that to the coach bench or nothing.

**The abort lines read only this run's artefacts (the J152 lesson).** J152 aborted 0 s into prepare on a
`units.jsonl` left by J151. Here every abort that reads the atlas's own files is gated on `armed == 1`, and
`var/lab-j158-local/armed.txt` is written by this job's pilot (its first block, after the data-folder guard)
and removed by the Report block's last line. During prepare `armed` is 0 and those aborts cannot fire; the
folder `lab-j158` is new, so nothing older is in it.

## The label set: the rung-3 contract

`report/labels.jsonl`, one JSON row a branched decision (labels.py writes it; its header is the definition):

| field | what it is |
|---|---|
| `v`, `contract` | 1, `mtg-table rung-3 label v1 (J158)` |
| `pair`, `deckA`, `deckB`, `spineSeed`, `sha` | the pair (ff5, peasant7, pauper5, synergy9, modern7), its two deck files, the spine's seed, the mtg-table commit |
| `d`, `kind`, `turn` | the decision's id in the spine (seat A's d-th listed decision), p / a / b, the game turn |
| `forgeOption`, `forgeToken` | Forge's choice: option 0, the one the spine played, and its token |
| `options[]` | every option: `o`, `token`, `label`, `random` {n, mean, lo, hi}, `forge` {n, mean, lo, hi} (means are seat A's score 0-1; Wilson intervals) |
| `bestRandom`, `bestForge` | the best option under each map |
| `regret`, `regretLo`, `regretHi` | **the label**: the random map's best minus option 0, with atlas.json's paired-bootstrap interval |
| `regretForge`, `regretForgeLo`, `regretForgeHi` | the same under the Forge map, as information |
| `confident` | `regretLo > 0` (and the decision complete); `confidentForge` the same under the Forge map |
| `complete`, `decided`, `inQ`, `settled`, `gap`, `rho`, `sameBest` | J156's definitions; `settled` = decided or every option <= 0.05 under both maps; `gap` = best minus worst random mean |
| `branches` | the branch counts (200 / 40) and the branch timeout |
| `view` | the seat whose decision it is: `{seat, player: "Drafter A", deck: "A"}` |
| `frameLog` | the spine's frame log from that seat's view, `phaseB/baseline/frames/baseline-seat<k>.jsonl.gz`: the whole game seat A saw, redacted as the wire is (D451 point 6 checks it) |
| `rows` | `{file, seatRow, match}`: the spine's baseline rows file and the row of seat A that IS this decision (its d-th), the D361 encoder's state `s` and candidates `c` from seat A's own view, Forge's answer first; `match` is true when that row's tokens, kind and turn equal the decision's |
| `branchFrames`, `branchesFile`, `atlas` | the pattern of the decision's branch games' frame logs (`phaseB/frames/d<d>-<random or forge>-o<o>-b<i>-seat<k>.jsonl.gz`), every branch's row, and the spine's atlas.json |
| `notForTraining` | the D451 marker, carried: see *For rung 4* |

**What rung 4 reads, and why nothing is cleaned.** `report/labels.jsonl` (the index); for each label the
`rows` row (the position and the candidates as the seat saw them, already encoded), the `frameLog` (to encode
it again, from the seat's view), and the `branchesFile` and `branchFrames` (every branch's result and game, to
re-weight or re-bootstrap a label). They are all already written per spine under
`/home/justin-a/code/lab/data/lab-j158/b-*/`: nothing new is recorded, and nothing there is deleted.
The frame log is not indexed to the decision's frame; the rows row is the decision's position.

**For rung 4, not this job: the confirm set is held out.** D451 point 3 and D318/D340: these are confirm-set
decks, every atlas game carries `notForTraining`, and `tools/ml/reserved.py` drops every deck-set deck from
every training set; rung 4's fixed-match bar is itself played on the confirm set. Training on these labels
needs a decision of its own (amend D451 point 3, and keep rung 4's bar off the labelled pairs), or the 7-8
nights move to pairs outside the deck sets. J158 measures; it changes no marker.

**Pre-registered reads** (numbers only):
- **(a) Labels produced and confident** (labels.py): labels (complete decisions) and confident labels (random
  regret low end > 0) per pair and per kind; the confident share with its interval, pooled (pair -> spine ->
  decision), by pair (spine -> decision; a one-spine pair is decision-level) and by kind; the same over Q;
  `confidentForge` beside, as information. Intervals: 95% percentile bootstrap, 10,000 draws, seed 150.
- **(b) What a label tells, by pair**: the median best-worst gap (random map, J157's measure), the mean
  regret, and the settled share, with intervals.
- **(c) The sizing line**: labels per 10-h night and confident labels per 10-h night, by pair and as run, at
  this run's wall time (each spine's block writes `<folder> <start> <end> <workers>` to `spine-times.txt`; a
  resumed spine's segments are summed, so a crash can only under-count); and reads.py's worker-second line
  (vi), pooled and by pair.
- **(i)-(iii) Agreement, as rung 2** (reads.py, J156's definitions unchanged): (i) same best over Q; (ii) mean
  rho over the rankable decisions, how many have two options, and over Q; (iii) regret at Forge's choice by
  kind under each map, with how many clear zero. Pooled over five pairs (the pair level resamples five) and
  by pair.
- **(iv) C1 "cast now where Forge passes"** (J156's statistic: over Q priority decisions listing pass and a
  cast/activate option, the mean of the cast/activate options' random value minus pass's): on **ff5's new
  seeds 461-462** (J156: +8.3 points [4.2, 13.3] at 452-454, J148 +1.3) and on **each new pair**. It HOLDS on
  a pair if its point is > 0 and its interval's low end is > 0, else NOT SHOWN. `iv_repeat` (ff5, C1 and C2)
  is J156's read unchanged; `iv_byPair` is C1's verdict per pair and C2 beside it as information. Under
  D466 point 4 the random policy is not J156's, so a repeat is of a direction, not a value.
- **(v) Guardrails and G5 counts**: G1 lands offered and taken, G4 hands kept, violations (G1 and G4
  apart), G3 `noRepeatNoOp`, G5 `refusedCast` / `noRepeatRefused` (ff5 must show both: Elite Spellbinder),
  `payfail` beside; and **`branchTimeouts` / `branchTimeoutsInStep`** (D467).
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j158/`).
- `b-<pair>-<seed>/`: `plan.json`, `atlas.json`, `atlas.md`, `phaseB/` (the baseline, its rows and frames,
  branches.jsonl, units.jsonl, every branch's frames and rows, the worker logs). `pilot-ff5/`, the smoke.
- `exits.txt` (each atlas command's exit) and `spine-times.txt`.
- `report/`: each spine's `atlas.json` and `atlas.md` under its folder's name, `reads.json`, `labels.jsonl`,
  `labels.json` (reads (a)-(c)), `labels-head.jsonl` (its first 20 rows), `exits.txt`, `spine-times.txt`,
  and `missing.txt` (empty when nothing was missing).
- Never `summary.md` or `metrics.json`.

## Pilot
About 15 minutes: the data folder and the abort gate; the pin carries D466, its follow-ups and D467; the node
tests; the two engine self-tests; reads.py proved on J148's, J156's and J157's atlases and labels.py on
J156's and J157's spines; a 2-decision smoke on ff5 in which G5 must fire and every label must find its row.

**The proofs, by sha256.** `proj.py` takes a reads.json's numbers (every read J156 registered: the counts,
(i)-(iv), (v) and (vi)) and prints the sha256 of their canonical JSON. J156's `report/reads.json` (lab-j150,
6fb13bf9) is **`a8116fdf09c70061b074cdc10b74c6fe4c1c8ad7232b2b52bc21a1534afb5d39`** and J157's (lab-j157, 9fe69ad8) **`7a9520fdc73c9511d357d8eee93a0bd8428cc445ee425beb5eeb8954e0d5652a`**: the pilot checks the files on
disk still give these, and that this file's reads.py, run on the same atlases, gives them too. labels.py on
J156's nine spine folders must give 132 labels, 0 unmatched rows, 30 confident in Q (J156's (iii): 24 + 4 + 2
clear of zero under the random map) and median gaps ff5 0.0975, peasant7 0.06, vintage7 0.01; on J157's three,
43, 0, 1 and vintage7 0.015 (J157's "1.5 points").

**Why atlas-selftest runs on one worker.** At `--jobs 2` on db496097 (2026-10-23, the PC) it failed once:
"worker exited (1) during a1", `java.io.IOException: cannot create directory .../atlas-selftest/phaseA/frames`
at `GameLog.<init>` (GameLog.java:176): two workers created the same fresh folder at once, and `GameLog`
treats `mkdirs()` returning false as a failure even when the other worker has just made it. The selftest
then counts one rollout short. At `--jobs 1` it passed (1 min 52 s; the tax pair's G5 refused 2 / left out 2).
In a spine the same race only retries a unit (`attempts: 2`, still `ok`), so the run is not exposed; the
fix (`!dir.mkdirs() && !dir.isDirectory()`) is a pc/ PR, not this job.

**The smoke** plays the repeat pair (Elite Spellbinder in deck B) at J157's seed 4600, where J157's pilot
logged `refusedCast` 6 and `noRepeatRefused` 5: 60 rollouts, 2 decisions, 8 + 4 branches. It must show G5
both ways, no problem, no violation, the 120-s branch timeout in its plan, and two labels whose rows match.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J158: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j158 var/lab-j158-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J158: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
echo 1 > var/lab-j158-local/datadir.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j158-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j158-local/merged.txt || echo 0 > var/lab-j158-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j158-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'landPlays' bridge/src/mtgtable/ai/Decisions.java && grep -q 'putBack' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'unreadableFrameLogs' tools/cubelab/atlas.ts && grep -q 'branch-error-max' tools/cubelab/atlas.ts && grep -q 'idChecksSkipped' tools/cubelab/atlas.ts && echo 1 > var/lab-j158-local/has-d466.txt || echo 0 > var/lab-j158-local/has-d466.txt
grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class BranchTimeout' bridge/src/mtgtable/ai/Atlas.java && grep -q 'stepClock' bridge/src/mtgtable/ai/DecisionSelfTest.java && echo 1 > var/lab-j158-local/has-d467.txt || echo 0 > var/lab-j158-local/has-d467.txt
grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'noRepeatRefused' bridge/src/mtgtable/ai/Explorer.java && grep -q 'fair-fight-900000005' tools/cubelab/atlas.ts && echo 1 > var/lab-j158-local/has-g5.txt || echo 0 > var/lab-j158-local/has-g5.txt
grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'monotonicMs' tools/cubelab/engine.ts && echo 1 > var/lab-j158-local/has-watchdog.txt || echo 0 > var/lab-j158-local/has-watchdog.txt
grep -rq 'CUBELAB_WORKER_XMX' tools/cubelab && echo 1 > var/lab-j158-local/has-heap.txt || echo 0 > var/lab-j158-local/has-heap.txt
grep -q 'empty-hand-ok' tools/check-redaction.mjs && grep -q 'empty-hand-ok' tools/cubelab/atlas.ts && echo 1 > var/lab-j158-local/has-checker.txt || echo 0 > var/lab-j158-local/has-checker.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j158-local/xmx-unset.txt || echo 0 > var/lab-j158-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts
cat > var/lab-j158-local/bin/reads.py <<'PY'
# J158's pre-registered reads (pc-results drafts/J158-move-atlas-3.md): J156's reads.py unchanged in every
# definition (J157 kept them too), with J157's side-by-side dropped and one read added, (iv) by pair. From the
# atlas.json files named on the command line as PAIR:SEED:PATH. Standard library only; no engine.
# Writes one JSON object to stdout. Definitions (fixed before any J150 data, kept for J157 and J158):
#   decided    every option's mean is >= 0.95 under BOTH maps (J148: 27 of 49 by this rule, 21 of them at 100.0)
#   Q          the complete decisions (both maps) that are not decided
#   R          the complete decisions whose rank correlation is defined (both maps' values vary)
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: pooled reads draw the pairs with replacement,
#              then each drawn pair's spines with replacement, then each drawn spine's decisions with
#              replacement (pair -> spine -> decision); a read of one pair starts at the spine level
#   (i)   same best over Q
#   (ii)  mean rho over R, per pair and pooled; how many of R have two options (rho is +/-1 by construction)
#   (iii) regret at Forge's choice (best minus option 0, atlas.json's) by kind p / a / b over Q, both maps;
#         and how many of those decisions have a regret interval whose low end is above zero
#   (iv)  the repeat pair (REPEAT below) only: C1 "cast now": over Q priority decisions listing pass and at
#         least one cast:/activate: option, mean over decisions of (the mean random value of the cast/activate
#         options minus pass's random value); C2 "don't attack": over Q attack decisions whose option 0 is not
#         attack:none and that list attack:none, mean of (attack:none's random value minus option 0's).
#         J148's direction is + for both (C1 +0.013 over 18, C2 +0.059 over 4). A candidate HOLDS when the
#         point is > 0 and the interval's low end is > 0; else NOT SHOWN. The Forge map's same statistics are
#         reported beside, as information.
#   (iv) by pair (J158): C1 with the same statistic and the same rule on EVERY pair, each from its own spines
#         (spine -> decision; a pair with one spine is a decision-level interval); C2 beside it as information,
#         no verdict. `iv_repeat` above stays as J156 wrote it (ff5 only), so the pilot's proofs still hold.
#   (v)   the guardrail counts of every atlas.json's checks (phase A folders too: pass them as PAIR:A:PATH)
#   (vi)  rung 3 sizing: options per decision, branch games per labelled decision (options x (R + F)),
#         worker-seconds per labelled decision at the measured branch times, labelled decisions per 7-worker
#         hour and per 10-hour night, and Q's share of the decisions; and (J158) the same line for each pair
import json, random, sys

REPEAT = 'ff5'
B, SEED = 10000, 150
args = [a for a in sys.argv[1:] if not a.startswith('--')]
NB = {'random': 200, 'forge': 40}
for a in sys.argv[1:]:
    if a.startswith('--branches='):
        r, f = a.split('=', 1)[1].split(',')
        NB = {'random': int(r), 'forge': int(f)}

spines, guard = {}, {}
for a in args:
    pair, seed, p = a.split(':', 2)
    doc = json.load(open(p))
    g = doc['checks']['guardrails']
    gp = guard.setdefault(pair, {})
    for k, v in g.items():
        if isinstance(v, (int, float)):
            gp[k] = gp.get(k, 0) + v
    if seed == 'A' or not doc.get('phaseB'):
        continue
    spines.setdefault(pair, {})[seed] = doc


def decided(x):
    return all((o['random']['mean'] is not None and o['random']['mean'] >= 0.95) and
               (o['forge']['mean'] is not None and o['forge']['mean'] >= 0.95) for o in x['options'])


def complete(x):
    return x['complete'] and all(o['random']['mean'] is not None and o['forge']['mean'] is not None for o in x['options'])


def Q(doc):
    return [x for x in doc['phaseB']['decisions'] if complete(x) and not decided(x)]


def R(doc):
    return [x for x in doc['phaseB']['decisions'] if complete(x) and x['rho'] is not None]


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def boot(tree, stat, levels):
    """tree: {pair: {seed: [items]}}; levels 3 = pair -> spine -> item, 2 = spine -> item (one pair)."""
    rng = random.Random(SEED)
    pairs = sorted(tree)
    out = []
    for _ in range(B):
        items = []
        ps = [rng.choice(pairs) for _ in pairs] if levels == 3 else pairs
        for p in ps:
            ss = sorted(tree[p])
            for s in [rng.choice(ss) for _ in ss]:
                xs = tree[p][s]
                items.extend(rng.choice(xs) for _ in xs)
        v = stat(items)
        if v is not None:
            out.append(v)
    if len(out) < B / 2:
        return [None, None]
    out.sort()
    return [round(out[int(0.025 * len(out))], 4), round(out[min(len(out) - 1, int(0.975 * len(out)))], 4)]


def read(select, stat):
    """The pooled read (pair -> spine -> decision) and each pair's (spine -> decision)."""
    tree = {p: {s: select(d) for s, d in ss.items()} for p, ss in spines.items()}
    flat = [x for ss in tree.values() for xs in ss.values() for x in xs]
    pt = stat(flat)
    res = {'n': len(flat), 'point': None if pt is None else round(pt, 4), 'interval': boot(tree, stat, 3) if len(tree) > 1 else boot(tree, stat, 2), 'byPair': {}}
    for p in sorted(tree):
        one = {p: tree[p]}
        xs = [x for v in tree[p].values() for x in v]
        q = stat(xs)
        res['byPair'][p] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot(one, stat, 2)}
    return res


out = {'spines': {p: sorted(ss) for p, ss in spines.items()}, 'definitions': 'see the header of this script'}
alld = [x for ss in spines.values() for d in ss.values() for x in d['phaseB']['decisions']]
out['decisions'] = len(alld)
out['complete'] = sum(1 for x in alld if complete(x))
out['decided'] = sum(1 for x in alld if complete(x) and decided(x))
out['Q'] = out['complete'] - out['decided']
# (i)
out['i_sameBest'] = read(Q, lambda xs: mean([1.0 if x['sameBest'] else 0.0 for x in xs]))
# (ii)
out['ii_rho'] = read(R, lambda xs: mean([x['rho'] for x in xs]))
out['ii_rho']['twoOption'] = sum(1 for ss in spines.values() for d in ss.values() for x in R(d) if len(x['options']) == 2)
out['ii_rho_Q'] = read(lambda d: [x for x in Q(d) if x['rho'] is not None], lambda xs: mean([x['rho'] for x in xs]))
# (iii)
out['iii_regret'] = {}
for k in ('p', 'a', 'b'):
    sel = lambda d, k=k: [x for x in Q(d) if x['kind'] == k]
    row = {}
    for m in ('random', 'forge'):
        row[m] = read(sel, lambda xs, m=m: mean([x[m]['regret'] for x in xs if x[m]['regret'] is not None]))
        row[m]['clearOfZero'] = sum(1 for ss in spines.values() for d in ss.values() for x in sel(d)
                                    if x[m]['regretLo'] is not None and x[m]['regretLo'] > 0)
    out['iii_regret'][k] = row
# (iv)
def val(x, tok, m):
    for o in x['options']:
        if o['token'] == tok:
            return o[m]['mean']
    return None


def c1(m):
    def sel(d):
        xs = []
        for x in Q(d):
            toks = [o['token'] for o in x['options']]
            acts = [o[m]['mean'] for o in x['options'] if o['token'].startswith(('cast:', 'activate:'))]
            if x['kind'] == 'p' and 'pass' in toks and acts:
                xs.append(mean(acts) - val(x, 'pass', m))
        return xs
    return sel


def c2(m):
    def sel(d):
        xs = []
        for x in Q(d):
            toks = [o['token'] for o in x['options']]
            if x['kind'] == 'a' and 'attack:none' in toks and toks[0] != 'attack:none':
                xs.append(val(x, 'attack:none', m) - x['options'][0][m]['mean'])
        return xs
    return sel


def verdict(r):
    lo = r['interval'][0]
    return 'HOLDS' if r['point'] is not None and r['point'] > 0 and lo is not None and lo > 0 else 'NOT SHOWN'


out['iv_repeat'] = {}
if REPEAT in spines:
    keep = spines
    spines = {REPEAT: keep[REPEAT]}
    for name, f in (('C1_castNow', c1), ('C2_dontAttack', c2)):
        r = read(f('random'), mean)
        r = {'n': r['n'], 'point': r['point'], 'interval': r['byPair'][REPEAT]['interval']}
        fr = read(f('forge'), mean)
        out['iv_repeat'][name] = {'random': r, 'verdict': verdict(r), 'forgeMap': {'n': fr['n'], 'point': fr['point'], 'interval': fr['byPair'][REPEAT]['interval']}}
    spines = keep
# (v)
tot = {}
for gp in guard.values():
    for k, v in gp.items():
        tot[k] = tot.get(k, 0) + v
out['v_guardrails'] = {'byPair': guard, 'total': tot}
# (vi)
def sizing(sp):
    ds = [x for ss in sp.values() for d in ss.values() for x in d['phaseB']['decisions']]
    opts = sum(len(x['options']) for x in ds)
    nr = sum(o['random']['n'] for x in ds for o in x['options'])
    nf = sum(o['forge']['n'] for x in ds for o in x['options'])
    ms = {m: 0.0 for m in NB}
    for ss in sp.values():
        for d in ss.values():
            w = {'random': sum(o['random']['n'] for x in d['phaseB']['decisions'] for o in x['options']),
                 'forge': sum(o['forge']['n'] for x in d['phaseB']['decisions'] for o in x['options'])}
            for m in NB:
                ms[m] += (d['phaseB'].get('meanBranchMs') or {}).get(m, 0) * w[m]
    tr = ms['random'] / nr / 1000 if nr else None
    tf = ms['forge'] / nf / 1000 if nf else None
    per = opts / len(ds) if ds else None
    comp = sum(1 for x in ds if complete(x))
    q = comp - sum(1 for x in ds if complete(x) and decided(x))
    if not (per and tr and tf):
        return None
    ws = per * (NB['random'] * tr + NB['forge'] * tf)
    return {'optionsPerDecision': round(per, 2), 'branchGamesPerDecision': round(per * (NB['random'] + NB['forge'])),
            'secRandomBranch': round(tr, 2), 'secForgeBranch': round(tf, 2), 'workerSecPerDecision': round(ws),
            'decisionsPer7WorkerHour': round(7 * 3600 / ws, 1), 'decisionsPer10hNight': round(70 * 3600 / ws),
            'undecidedShare': round(q / comp, 3) if comp else None}


v6 = sizing(spines)
if v6 is not None:
    out['vi_rung3'] = v6
out['vi_rung3_byPair'] = {p: sizing({p: spines[p]}) for p in sorted(spines)}
# (iv) by pair (J158): C1 on every pair, with the registered rule; C2 as information
r1, f1 = read(c1('random'), mean), read(c1('forge'), mean)
r2, f2 = read(c2('random'), mean), read(c2('forge'), mean)
out['iv_byPair'] = {}
for p in sorted(spines):
    c1r = r1['byPair'][p]
    out['iv_byPair'][p] = {'C1_castNow': {'random': c1r, 'verdict': verdict(c1r), 'forgeMap': f1['byPair'][p]},
                           'C2_dontAttack': {'random': r2['byPair'][p], 'forgeMap': f2['byPair'][p], 'verdict': None}}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j158-local/bin/labels.py <<'PY'
# J158's label set (pc-results drafts/J158-move-atlas-3.md): the rung-3 contract, labels.jsonl, and the label reads.
# From spine folders named on the command line as PAIR:SEED:DIR (DIR holds plan.json, atlas.json and phaseB/).
#   --out=FILE     write labels.jsonl there (one row per branched decision, complete or not)
#   --times=FILE   the run blocks' spine-times.txt ("<folder> <start epoch s> <end epoch s> <workers>", one line a run
#                  of a spine's block), for the sizing
#   --sha=SHA      the mtg-table commit the labels were made on
# Standard library only; no engine. Prints one JSON object (the label reads) to stdout.
# Definitions (fixed before any J158 data):
#   label      a branched decision of seat A whose every option has a value under BOTH maps (reads.py's `complete`)
#   regret     atlas.json's random-map regret: the best option's mean minus option 0's (Forge's answer, the one the
#              spine played), with atlas.json's paired-bootstrap interval; the best is picked after the fact, so the
#              point leans high and the low end is the part to read
#   confident  the regret's low end is > 0 (random map); `confidentForge` is the same under the Forge map, as information
#   decided    every option's mean >= 0.95 under both maps (reads.py); inQ = complete and not decided
#   settled    decided, or every option's mean <= 0.05 under both maps (lost either way)
#   gap        a label's best minus worst option mean under the random map (J157's "information" measure)
#   interval   reads.py's: 95% percentile bootstrap, 10,000 draws, seed 150, pair -> spine -> decision pooled,
#              spine -> decision for one pair (a pair with one spine is a decision-level interval)
#   rows       the d-th row of seat A in the spine's baseline rows (phaseB/baseline/rows/*.jsonl) IS decision d:
#              its tokens must equal baseline.json's for d (`rows.match`); that row is seat A's own view encoded
#              (D361's encoder, the state `s` and the candidates `c`, Forge's answer first)
import glob, json, os, random, statistics, sys

B, SEED = 10000, 150
CONTRACT = 'mtg-table rung-3 label v1 (J158)'
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)


def complete(x):
    return x['complete'] and all(o['random']['mean'] is not None and o['forge']['mean'] is not None for o in x['options'])


def decided(x):
    return all(o['random']['mean'] >= 0.95 and o['forge']['mean'] >= 0.95 for o in x['options'])


def lost(x):
    return all(o['random']['mean'] <= 0.05 and o['forge']['mean'] <= 0.05 for o in x['options'])


def seat_rows(spine):
    """Seat A's baseline decision rows, the file they came from, seat A's index and name."""
    for f in sorted(glob.glob(os.path.join(spine, 'phaseB', 'baseline', 'rows', '*.jsonl'))):
        rows, begin = [], None
        for line in open(f):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if r.get('type') == 'begin':
                begin = r
            elif r.get('type') == 'row':
                rows.append(r)
        if not begin:
            continue
        seat = 0 if begin.get('seat0') == 'Drafter A' else 1 if begin.get('seat1') == 'Drafter A' else None
        if seat is None:
            continue
        return f, seat, 'Drafter A', [r for r in rows if r.get('seat') == 'Drafter A']
    return None, None, None, []


labels, tree = [], {}
for a in args:
    pair, seed, spine = a.split(':', 2)
    spine = os.path.abspath(spine)
    doc = json.load(open(os.path.join(spine, 'atlas.json')))
    plan = json.load(open(os.path.join(spine, 'plan.json')))
    base = json.load(open(os.path.join(spine, 'phaseB', 'baseline.json')))
    btok = {x['d']: x for x in base['decisions']}
    rf, seat, player, arows = seat_rows(spine)
    for x in (doc.get('phaseB') or {}).get('decisions', []):
        d = x['d']
        row = arows[d] if d < len(arows) else None
        match = bool(row) and d in btok and row['tokens'] == btok[d]['tokens'] and row['kind'] == x['kind'] and row['turn'] == x['turn']
        comp = complete(x)
        rnd = [o['random']['mean'] for o in x['options']]
        lab = {
            'v': 1, 'contract': CONTRACT, 'pair': pair, 'deckA': plan['deckA'], 'deckB': plan['deckB'], 'sha': opt.get('sha'),
            'spineSeed': int(seed), 'd': d, 'kind': x['kind'], 'turn': x['turn'],
            'forgeOption': x['chosen'], 'forgeToken': x['options'][x['chosen']]['token'],
            'options': [{'o': o['o'], 'token': o['token'], 'label': o['label'],
                         'random': {k: o['random'][k] for k in ('n', 'mean', 'lo', 'hi')},
                         'forge': {k: o['forge'][k] for k in ('n', 'mean', 'lo', 'hi')}} for o in x['options']],
            'bestRandom': x['random']['best'], 'bestForge': x['forge']['best'],
            'regret': x['random']['regret'], 'regretLo': x['random']['regretLo'], 'regretHi': x['random']['regretHi'],
            'regretForge': x['forge']['regret'], 'regretForgeLo': x['forge']['regretLo'], 'regretForgeHi': x['forge']['regretHi'],
            'confident': comp and x['random']['regretLo'] is not None and x['random']['regretLo'] > 0,
            'confidentForge': comp and x['forge']['regretLo'] is not None and x['forge']['regretLo'] > 0,
            'complete': comp, 'decided': comp and decided(x), 'inQ': comp and not decided(x),
            'settled': comp and (decided(x) or lost(x)),
            'gap': round(max(rnd) - min(rnd), 4) if comp else None,
            'rho': x['rho'], 'sameBest': x['sameBest'],
            'branches': {'random': plan['branchRandom'], 'forge': plan['branchForge'], 'branchTimeoutSec': plan.get('branchTimeoutSec')},
            'view': {'seat': seat, 'player': player, 'deck': 'A'},
            'frameLog': os.path.join(spine, 'phaseB', 'baseline', 'frames', 'baseline-seat%s.jsonl.gz' % seat) if seat is not None else None,
            'rows': {'file': rf, 'seatRow': d, 'match': match},
            'branchFrames': os.path.join(spine, 'phaseB', 'frames', 'd%d-{random|forge}-o{o}-b{i}-seat%s.jsonl.gz' % (d, seat)),
            'branchesFile': os.path.join(spine, 'phaseB', 'branches.jsonl'),
            'atlas': os.path.join(spine, 'atlas.json'),
            'notForTraining': 'D451 point 3: a confirm-set deck pair; training on it needs a decision of its own (J158, rung 4)',
        }
        labels.append(lab)
        tree.setdefault(pair, {}).setdefault(seed, [])
        if comp:
            tree[pair][seed].append(lab)

if opt.get('out'):
    with open(opt['out'], 'w') as f:
        for lab in labels:
            f.write(json.dumps(lab, separators=(',', ':')) + '\n')


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def boot(t, stat, levels):
    rng = random.Random(SEED)
    pairs = sorted(t)
    vals = []
    for _ in range(B):
        items = []
        ps = [rng.choice(pairs) for _ in pairs] if levels == 3 else pairs
        for p in ps:
            ss = sorted(t[p])
            for s in [rng.choice(ss) for _ in ss]:
                xs = t[p][s]
                items.extend(rng.choice(xs) for _ in xs)
        v = stat(items)
        if v is not None:
            vals.append(v)
    if len(vals) < B / 2:
        return [None, None]
    vals.sort()
    return [round(vals[int(0.025 * len(vals))], 4), round(vals[min(len(vals) - 1, int(0.975 * len(vals)))], 4)]


def read(sel, stat):
    t = {p: {s: [x for x in xs if sel(x)] for s, xs in ss.items()} for p, ss in tree.items()}
    flat = [x for ss in t.values() for xs in ss.values() for x in xs]
    pt = stat(flat)
    res = {'n': len(flat), 'point': None if pt is None else round(pt, 4),
           'interval': boot(t, stat, 3 if len(t) > 1 else 2) if flat else [None, None], 'byPair': {}}
    for p in sorted(t):
        xs = [x for v in t[p].values() for x in v]
        q = stat(xs)
        res['byPair'][p] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({p: t[p]}, stat, 2) if xs else [None, None]}
    return res


share = lambda key: (lambda xs: mean([1.0 if x[key] else 0.0 for x in xs]))
everything = lambda x: True
out = {'contract': CONTRACT, 'spines': {p: sorted(ss, key=int) for p, ss in tree.items()},
       'branched': len(labels), 'labels': sum(1 for x in labels if x['complete']),
       'rowsUnmatched': sum(1 for x in labels if not x['rows']['match']),
       'confident': sum(1 for x in labels if x['confident']),
       'confidentQ': sum(1 for x in labels if x['confident'] and x['inQ']),
       'confidentForge': sum(1 for x in labels if x['confidentForge'])}
out['byPair'] = {}
for p in sorted(tree):
    xs = [x for v in tree[p].values() for x in v]
    out['byPair'][p] = {'spines': len(tree[p]), 'labels': len(xs), 'inQ': sum(1 for x in xs if x['inQ']),
                        'confident': sum(1 for x in xs if x['confident']), 'confidentQ': sum(1 for x in xs if x['confident'] and x['inQ']),
                        'confidentForge': sum(1 for x in xs if x['confidentForge']),
                        'byKind': {k: {'labels': sum(1 for x in xs if x['kind'] == k), 'confident': sum(1 for x in xs if x['kind'] == k and x['confident'])} for k in ('p', 'a', 'b')}}
# (a) the confident share, pooled and by pair, and by kind
out['a_confidentShare'] = read(everything, share('confident'))
out['a_confidentShareByKind'] = {k: read(lambda x, k=k: x['kind'] == k, share('confident')) for k in ('p', 'a', 'b')}
out['a_confidentShareQ'] = read(lambda x: x['inQ'], share('confident'))
# (b) what a label tells, by pair: the gap, the regret, the settled share
out['b_gapMedian'] = {p: (round(statistics.median([x['gap'] for v in ss.values() for x in v]), 4) if any(ss.values()) else None) for p, ss in tree.items()}
out['b_gapMean'] = read(everything, lambda xs: mean([x['gap'] for x in xs]))
out['b_regretMean'] = read(everything, lambda xs: mean([x['regret'] for x in xs if x['regret'] is not None]))
out['b_settledShare'] = read(everything, share('settled'))
# (c) the sizing line at this run's measured wall time (spine folder start to end, its checks included)
wall = {}
if opt.get('times') and os.path.exists(opt['times']):
    for line in open(opt['times']):
        f = line.split()
        if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
            # a resumed spine has one line a run of its block: the segments are summed (a segment cut by a crash
            # wrote no line, so the wall time can only be under-counted)
            prev = wall.get(f[0], (0, None))
            wall[f[0]] = (prev[0] + int(f[2]) - int(f[1]), f[3] if len(f) > 3 else prev[1])
size = {}
for a in args:
    pair, seed, spine = a.split(':', 2)
    w = wall.get(os.path.basename(os.path.abspath(spine)))
    s = size.setdefault(pair, {'wallSec': 0, 'spinesTimed': 0, 'labels': 0, 'confident': 0, 'workers': set()})
    if w is None:
        continue
    s['wallSec'] += w[0]
    s['spinesTimed'] += 1
    s['workers'].add(w[1])
    s['labels'] += len(tree.get(pair, {}).get(seed, []))
    s['confident'] += sum(1 for x in tree.get(pair, {}).get(seed, []) if x['confident'])
tot = {'wallSec': 0, 'labels': 0, 'confident': 0}
for p, s in size.items():
    s['workers'] = sorted(x for x in s['workers'] if x)
    h = s['wallSec'] / 3600
    s['labelsPerHour'] = round(s['labels'] / h, 2) if h else None
    s['labelsPer10hNight'] = round(10 * s['labels'] / h) if h else None
    s['confidentPer10hNight'] = round(10 * s['confident'] / h) if h else None
    for k in tot:
        tot[k] += s[k]
th = tot['wallSec'] / 3600
tot['labelsPer10hNight'] = round(10 * tot['labels'] / th) if th else None
tot['confidentPer10hNight'] = round(10 * tot['confident'] / th) if th else None
out['c_sizing'] = {'byPair': size, 'asRun': tot}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j158-local/bin/metrics.py <<'PY'
# J158's metrics (pc-results drafts/J158-move-atlas-3.md): one JSON object over every spine folder b-* under the data
# folder's lab-j158 (no phase A in this job), the branch rows' timeouts, and the report's labels.json and reads.json.
# Standard library only; no engine.
import glob, json, math, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j158'
PAIRS = ('ff5', 'peasant7', 'pauper5', 'synergy9', 'modern7')
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'g5keys': 0,
       'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0, 'refusedCastFf5': 0, 'noRepeatRefusedFf5': 0,
       'branchErrored': 0, 'branchErrorOptions': 0, 'truncatedLogs': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0,
       'decisions': 0, 'sameBest': 0, 'meanRho': None, 'unitsShort': 0, 'reads': 0, 'labels': -1, 'confident': -1,
       'rowsUnmatched': -1}
for p in PAIRS:
    out['spines_' + p] = 0
rhos = []
for f in sorted(glob.glob(D + '/b-*/atlas.json')):
    d = json.load(open(f))
    c = d['checks']
    g = c['guardrails']
    name = os.path.basename(os.path.dirname(f))
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['guardViolations'] += g.get('violations', 0)
    vb = g.get('violationsBy') or {}
    out['violationsG1'] += vb.get('G1', 0)
    out['violationsG4'] += vb.get('G4', 0)
    out['g5keys'] += 1 if 'refusedCast' in g and 'noRepeatRefused' in g else 0
    for k in ('refusedCast', 'noRepeatRefused', 'noRepeatNoOp'):
        out[k] += g.get(k, 0)
    if name.startswith('b-ff5-'):
        out['refusedCastFf5'] += g.get('refusedCast', 0)
        out['noRepeatRefusedFf5'] += g.get('noRepeatRefused', 0)
    be = c.get('branchErrors') or {}
    out['branchErrored'] += be.get('errored', 0)
    out['branchErrorOptions'] += len(be.get('options', []))
    out['truncatedLogs'] += len(c.get('unreadableFrameLogs') or [])
    b = d.get('phaseB')
    if b:
        out['spinesDone'] += 1
        pair = name[2:].rsplit('-', 1)[0]
        if pair in PAIRS:
            out['spines_' + pair] += 1
        out['decisions'] += len(b['decisions'])
        out['sameBest'] += b['agreement']['sameBest']
        rhos += [x['rho'] for x in b['decisions'] if x['complete'] and x['rho'] is not None]
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
# D467: every branch that timed out, and those the step clock ended inside an engine step (timed out AND an engine error)
for f in glob.glob(D + '/b-*/phaseB/branches.jsonl'):
    for line in open(f):
        if '"timedOut":true' not in line:
            continue
        out['branchTimeouts'] += 1
        if '"engineError":true' in line:
            out['branchTimeoutsInStep'] += 1
# every planned unit of every spine finished: min(--decisions, listed) x (ceil(R / chunk) + ceil(F / chunk)) distinct ok ids
for p in sorted(glob.glob(D + '/b-*/plan.json')):
    dd = os.path.dirname(p)
    plan = json.load(open(p))
    base = os.path.join(dd, 'phaseB', 'baseline.json')
    if not os.path.exists(base):
        out['unitsShort'] += 1
        continue
    listed = len(json.load(open(base))['decisions'])
    n = listed if plan['decisions'] == 'all' else min(plan['decisions'], listed)
    per = math.ceil(plan['branchRandom'] / plan['chunk']) + math.ceil(plan['branchForge'] / plan['chunk'])
    ok = set()
    uf = os.path.join(dd, 'phaseB', 'units.jsonl')
    if os.path.exists(uf):
        for line in open(uf):
            try:
                u = json.loads(line)
            except ValueError:
                continue
            if u.get('ok'):
                ok.add(u['id'])
    out['unitsShort'] += max(0, n * per - len(ok))
try:
    r = json.load(open(D + '/report/reads.json'))
    out['reads'] = 1 if sorted(r['spines']) == sorted(PAIRS) and sum(len(v) for v in r['spines'].values()) == 6 and 'iv_byPair' in r else 0
except (OSError, ValueError, KeyError):
    pass
try:
    lb = json.load(open(D + '/report/labels.json'))
    out['labels'], out['confident'], out['rowsUnmatched'] = lb['labels'], lb['confident'], lb['rowsUnmatched']
except (OSError, ValueError, KeyError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j158-local/bin/proj.py <<'PY'
# J158 pilot: the projection of a reads.json that J156's and J157's reads.json are pinned by (sha256 of its canonical JSON)
import hashlib, json, sys
KEYS = ('spines', 'decisions', 'complete', 'decided', 'Q', 'i_sameBest', 'ii_rho', 'ii_rho_Q', 'iii_regret', 'iv_repeat', 'v_guardrails', 'vi_rung3')
d = json.load(open(sys.argv[1]))
p = {k: d.get(k) for k in KEYS}
p['spines'] = {k: sorted(v) for k, v in p['spines'].items()}
print(hashlib.sha256(json.dumps(p, sort_keys=True, separators=(',', ':')).encode()).hexdigest())
PY
# reads.py on J148's own atlas (one pair, one spine): it must give J148's published numbers
python3 -I var/lab-j158-local/bin/reads.py ff5:451:var/lab-j142/atlas/atlas.json > var/lab-j158-local/reads-j148.json
python3 -I -c "import json; d = json.load(open('var/lab-j158-local/reads-j148.json')); ok = (d['decided'], d['Q'], d['i_sameBest']['point'], d['ii_rho']['n'], d['ii_rho']['point'], d['iv_repeat']['C1_castNow']['random']['point'], d['iv_repeat']['C2_dontAttack']['random']['point']) == (27, 22, 0.3182, 18, -0.3416, 0.0129, 0.0588); print(1 if ok else 0)" > var/lab-j158-local/reads-self.txt
# reads.py on J156's twelve atlases and J157's four (read, never written): each must give its run's reads.json, by sha256
R=/home/justin-a/code/lab/data/lab-j150/report
args=""
for p in ff5 peasant7 vintage7; do args="$args $p:A:$R/a-$p.atlas.json"; for f in $R/b-$p-*.atlas.json; do s=${f%.atlas.json}; args="$args $p:${s##*-}:$f"; done; done
python3 -I var/lab-j158-local/bin/reads.py $args > var/lab-j158-local/reads-j156.json || true
test "$(python3 -I var/lab-j158-local/bin/proj.py $R/reads.json)" = a8116fdf09c70061b074cdc10b74c6fe4c1c8ad7232b2b52bc21a1534afb5d39 && test "$(python3 -I var/lab-j158-local/bin/proj.py var/lab-j158-local/reads-j156.json)" = a8116fdf09c70061b074cdc10b74c6fe4c1c8ad7232b2b52bc21a1534afb5d39 && echo 1 > var/lab-j158-local/reads-j156.txt || echo 0 > var/lab-j158-local/reads-j156.txt
R7=/home/justin-a/code/lab/data/lab-j157/report
python3 -I var/lab-j158-local/bin/reads.py vintage7:A:$R7/a-vintage7.atlas.json vintage7:458:$R7/b-vintage7-458.atlas.json vintage7:459:$R7/b-vintage7-459.atlas.json vintage7:460:$R7/b-vintage7-460.atlas.json > var/lab-j158-local/reads-j157.json || true
test "$(python3 -I var/lab-j158-local/bin/proj.py $R7/reads.json)" = 7a9520fdc73c9511d357d8eee93a0bd8428cc445ee425beb5eeb8954e0d5652a && test "$(python3 -I var/lab-j158-local/bin/proj.py var/lab-j158-local/reads-j157.json)" = 7a9520fdc73c9511d357d8eee93a0bd8428cc445ee425beb5eeb8954e0d5652a && echo 1 > var/lab-j158-local/reads-j157.txt || echo 0 > var/lab-j158-local/reads-j157.txt
# labels.py on J156's nine spine folders and J157's three: the counts above
largs=""
for d in /home/justin-a/code/lab/data/lab-j150/b-*; do n=$(basename "$d"); p=${n#b-}; largs="$largs ${p%-*}:${n##*-}:$d"; done
python3 -I var/lab-j158-local/bin/labels.py $largs --out=var/lab-j158-local/labels-j156.jsonl > var/lab-j158-local/labels-j156.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j158-local/labels-j156.json')); print(1 if (d['labels'], d['rowsUnmatched'], d['confidentQ'], d['b_gapMedian']) == (132, 0, 30, {'ff5': 0.0975, 'peasant7': 0.06, 'vintage7': 0.01}) else 0)" > var/lab-j158-local/labels-j156.txt 2>/dev/null || echo 0 > var/lab-j158-local/labels-j156.txt
L7=/home/justin-a/code/lab/data/lab-j157
python3 -I var/lab-j158-local/bin/labels.py vintage7:458:$L7/b-vintage7-458 vintage7:459:$L7/b-vintage7-459 vintage7:460:$L7/b-vintage7-460 > var/lab-j158-local/labels-j157.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j158-local/labels-j157.json')); print(1 if (d['labels'], d['rowsUnmatched'], d['confidentQ'], d['b_gapMedian']) == (43, 0, 1, {'vintage7': 0.015}) else 0)" > var/lab-j158-local/labels-j157.txt 2>/dev/null || echo 0 > var/lab-j158-local/labels-j157.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh atlas-selftest --jobs 1 && echo 1 > var/lab-j158-local/selftest.txt || echo 0 > var/lab-j158-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j158-local/identity.txt || echo 0 > var/lab-j158-local/identity.txt
S=tools/ai-bench/decks/sets
tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 4600 --rollouts 60 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --unit-timeout 30 --jobs {workers} --out var/lab-j158/pilot-ff5 || true
python3 -I var/lab-j158-local/bin/labels.py ff5:4600:/home/justin-a/code/lab/data/lab-j158/pilot-ff5 --out=var/lab-j158-local/pilot-labels.jsonl --sha=$(cat var/lab-j158-local/sha.txt) > var/lab-j158-local/pilot-labels.json || true
```
metrics: datadir = sh: cat var/lab-j158-local/datadir.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j158-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466 = sh: cat var/lab-j158-local/has-d466.txt 2>/dev/null || echo 0
metrics: has_d467 = sh: cat var/lab-j158-local/has-d467.txt 2>/dev/null || echo 0
metrics: has_g5 = sh: cat var/lab-j158-local/has-g5.txt 2>/dev/null || echo 0
metrics: has_watchdog = sh: cat var/lab-j158-local/has-watchdog.txt 2>/dev/null || echo 0
metrics: has_heap = sh: cat var/lab-j158-local/has-heap.txt 2>/dev/null || echo 0
metrics: has_checker = sh: cat var/lab-j158-local/has-checker.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j158-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j158-local/reads-self.txt 2>/dev/null || echo 0
metrics: reads_j156 = sh: cat var/lab-j158-local/reads-j156.txt 2>/dev/null || echo 0
metrics: reads_j157 = sh: cat var/lab-j158-local/reads-j157.txt 2>/dev/null || echo 0
metrics: labels_j156 = sh: cat var/lab-j158-local/labels-j156.txt 2>/dev/null || echo 0
metrics: labels_j157 = sh: cat var/lab-j158-local/labels-j157.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j158-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j158-local/identity.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -c "import json; d=json.load(open('/home/justin-a/code/lab/data/lab-j158/pilot-ff5/atlas.json')); c=d['checks']; g=c['guardrails']; lb=json.load(open('var/lab-j158-local/pilot-labels.json')); print(json.dumps({'problems': len(c['problems']), 'decisions': len(d['phaseB']['decisions']), 'g5': 1 if 'refusedCast' in g and 'noRepeatRefused' in g and 'noRepeatNoOp' in g else 0, 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0), 'guardViolations': g['violations'], 'branchTimeoutSec': d['plan']['branchTimeoutSec'], 'labels': lb['labels'], 'rowsUnmatched': lb['rowsUnmatched']}))" 2>/dev/null || echo '{"problems":-1}'
check: datadir == 1
check: data_free_gb >= 50
check: merged == 1
check: has_d466 == 1
check: has_d467 == 1
check: has_g5 == 1
check: has_watchdog == 1
check: has_heap == 1
check: has_checker == 1
check: xmx_unset == 1
check: reads_self == 1
check: reads_j156 == 1
check: reads_j157 == 1
check: labels_j156 == 1
check: labels_j157 == 1
check: selftest == 1
check: identity == 1
check: pilot.g5 == 1
check: pilot.refusedCast >= 1
check: pilot.noRepeatRefused >= 1
check: pilot.problems == 0
check: pilot.decisions == 2
check: pilot.guardViolations == 0
check: pilot.branchTimeoutSec == 120
check: pilot.labels == 2
check: pilot.rowsUnmatched == 0

## Commands
One block a spine, in the order ff5 461, peasant7 463, pauper5 464, synergy9 465, modern7 466, ff5 462. Every
atlas command resumes what is done. An atlas that finds a problem exits 3 and the job goes on to the next
spine (the exit is kept in `/home/justin-a/code/lab/data/lab-j158/exits.txt`); each block appends its spine's wall time to
`/home/justin-a/code/lab/data/lab-j158/spine-times.txt`; the final checks read every folder's `atlas.json`. Each block asserts the data folder
and its 50 GB again before it plays.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-ff5-461; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 461 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-peasant7-463; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/peasant-900000007-A.dck --deck-b $S/peasant-900000007-B.dck --seed 463 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-pauper5-464; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/pauper-900000005-A.dck --deck-b $S/pauper-900000005-B.dck --seed 464 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-synergy9-465; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/synergy-900000009-A.dck --deck-b $S/synergy-900000009-B.dck --seed 465 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-modern7-466; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/modern-era-900000007-A.dck --deck-b $S/modern-era-900000007-B.dck --seed 466 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J158: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j158
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J158: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J158
S=tools/ai-bench/decks/sets
n=b-ff5-462; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 462 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j158/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j158/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j158/spine-times.txt
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j158
mkdir -p $D/report
: > $D/report/missing.txt
args=""; largs=""
for d in $D/b-*; do
  n=$(basename "$d"); p=${n#b-}; p=${p%-*}; s=${n##*-}
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md" || echo "$n: no atlas.md" >> $D/report/missing.txt
    args="$args $p:$s:$d/atlas.json"; largs="$largs $p:$s:$d"
  else
    echo "$n: no atlas.json" >> $D/report/missing.txt
  fi
done
python3 -I var/lab-j158-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j158-local/bin/labels.py $largs --out=$D/report/labels.jsonl --times=$D/spine-times.txt --sha=$(cat var/lab-j158-local/sha.txt) > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
cp $D/exits.txt $D/report/exits.txt || echo "exits.txt: none" >> $D/report/missing.txt
cp $D/spine-times.txt $D/report/spine-times.txt || echo "spine-times.txt: none" >> $D/report/missing.txt
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j158-local/armed.txt
```
check: atlas.atlases == 6
check: atlas.spinesDone == 6
check: atlas.spines_ff5 == 2
check: atlas.spines_peasant7 == 1
check: atlas.spines_pauper5 == 1
check: atlas.spines_synergy9 == 1
check: atlas.spines_modern7 == 1
check: unit_errors == 0
check: atlas.unitsShort == 0
check: atlas.g5keys == 6
check: atlas.refusedCastFf5 >= 1
check: atlas.noRepeatRefusedFf5 >= 1
check: atlas.guardViolations == 0
check: atlas.problems == 0
check: engine_errors <= 50
check: atlas.reads == 1
check: atlas.labels >= 1
check: atlas.rowsUnmatched == 0

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block (above), so the first two cannot read another run's
files. `unit_errors` counts units that did not finish (one line a unit since D465, `attempts` inside it), so
`== 0` means every unit finished. `atlas.unitsShort` is "every planned unit finished": min(16, listed) x (8 +
2) distinct ok units a spine. `engine_errors` counts branch rows with `engineError` (a Java Error: an OOM, or
since D467 a branch the step clock ended inside a step); J156's and J157's spines had 0 outside the vintage
cascade, so 50 in ~81,000 is a small bound. `atlas.problems == 0` covers branch errors past the 0.1 share and
unreadable frame logs (D466). `branch_timeouts` and `atlas.branchTimeoutsInStep` are reported, not checked.

## Report
collect: /home/justin-a/code/lab/data/lab-j158/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j158/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j158/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j158/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j158/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j158/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j158/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j158/report/missing.txt
The summary says, for Justin and the cloud, in plain words and numbers only:
- **Labels per night, first** (`labels.json` (c)): labels and confident labels per 10-h night, by pair and as
  run, at the measured wall time and workers; what 1,000 labels, and 1,000 confident labels, would take at
  each pair's rate and at the mix run here. This is the number the 7-8 nights wait for.
- **(a)** labels and confident labels per pair and per kind, with the confident share's interval (pooled, by
  pair, by kind, and over Q), `confidentForge` beside.
- **(b)** what a label tells by pair: median gap, mean regret, settled share; beside J156's and J157's
  (ff5 9.75 points, peasant7 6.0, vintage7 1.0 in J156 and 1.5 in J157).
- **(i)-(iii)** as `reads.json` gives them, pooled and by pair, beside J156's (and J157's vintage) as a
  different random policy (J156) or the same one (J157), never pooled.
- **(iv)** C1 per pair, **HOLDS** or **NOT SHOWN** by the registered rule, with the Forge map beside; ff5's
  beside J156's +8.3 [4.2, 13.3] and J148's +1.3; C2 as information.
- **(v)** the guardrail and G5 counts, `payfail`, and `branchTimeouts` / `branchTimeoutsInStep`, naming any
  branch the step clock ended (its decision, option, branch and the error's turn and step).
- **Per spine,** one line: the baseline (turns, winner), decisions listed and branched, labels, confident,
  decided / Q, same best, mean rho, branch errors, wall time.
- **The checks,** with any exit in `exits.txt` and anything in `missing.txt` explained.
- **The intervals' coarseness:** five pairs; four of them have one spine, so their intervals are
  decision-level only; say so beside every per-pair interval.
- **The label set:** where `labels.jsonl` is, its row count, and that rung 4's files are kept; and the open
  point that these are confirm-set pairs (*For rung 4*).
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh seed and a second pair show it.

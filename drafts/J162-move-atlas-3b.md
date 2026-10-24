id: J162
title: The move atlas, rung 3b -- the four spines J158 did not finish (pauper-900000005, synergy-900000009, modern-era-900000007 and fair-fight-900000005's second spine) at their original fresh seeds 464, 465, 466 and 462, on the fixed tool (D470 forced blocks at the fork's own combat, D471 G6 the random seat's own X with #195's restore, D472 alternative costs in the fork); J158's shape unchanged (16 decisions a spine, every option 200 times random and 40 times Forge, no phase A, labels.jsonl the rung-3 contract), with the tool's new counters read and checked; a new data folder lab-j162; on f6dba5e4. Pre-registered reads, numbers only; no outcome rule beyond D451's and J156's (iv). These labels are a new random policy and tool, and are never pooled with J156's, J157's or J158's
public_title: Move atlas 3b: the four spines J158 did not finish
public_est: ~8 to 9 h
public_decides: None by itself; labels a night for three new pairs and a second ff5 seed
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@f6dba5e4 (origin/main: D470 #191 with #193's addendum, D471 #192 and #195's restore of X and targets, D472 #194, on D466 and D467; merged == 1, checked by the pilot)
decides: nothing by itself. Rung 3 of the atlas ladder, finished: J158 was stopped after two of its six spines (pauper5's random branches looped on a free Crypt Rats activation, D471, and its block decisions were hollow, D470). This job plays the other four on the fixed tool, so that labels a night, and confident labels a night, are measured on five pairs before the 7-8 nights a 1,000-label set would take are committed, and so that the fixes are seen working at scale (pauper5's branch timeouts, D470's unavailable options, G6's counts, D472's errors by kind)
hypothesis: none to confirm about the maps. The sizing has priors: J158 measured, at 6 workers scaled to 7, ff5 130 labels a 10-h night (32 confident) and peasant7 106 (13); J156's spines gave ff5 80 / 30 and peasant7 158 / 36 at 7. pauper5's spine is expected at ~2.5 h on the fixed tool (J158's d0 cost 10.8 s a branch with 42% of its branch time in timeouts). One candidate is read for repetition (iv): C1 "cast now where Forge passes", which HELD on ff5 461 (+4.3 points [1.0, 7.6]) and peasant7 463 (+2.8 [0.3, 5.0]) in J158 and on ff5 452-454 in J156 (+8.3 [4.2, 13.3]), each on its own random policy
rule: D451 (method; no outcome rule) with D458/D462/D466 (G5), D459 (unit watchdog), D465, D466, D467, D470, D471 (G6) and D472. Pre-registered here, before any J162 data: the label contract (J158's, plus the `void` field) and the reads (a)-(c) computed by var/lab-j162-local/bin/labels.py, J156's reads (i)-(vi) plus (iv) by pair computed by var/lab-j162-local/bin/reads.py (J158's file, unchanged), and the tool's counters computed by var/lab-j162-local/bin/metrics.py, all exactly as written in the pilot. A candidate of (iv) HOLDS on a pair only if its point is > 0 and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. Every other difference is a candidate (D447 point 9). No read carries any other verdict
followup: morning-read
est: ~8.5 h at 6 workers (the memory rule gave J158 and J160 6 of the 7 asked), ~7.5 h at 7 (sizing below): pilot ~15 min; four spines ~6.95 h at 7 workers with their checks (pauper5 ~2.5 h, synergy9 ~1.55 h, modern7 ~1.3 h, ff5 462 ~1.6 h), ~8.1 h at 6; report ~2 min. Disk ~12 GB on the lab data folder /home/justin-a/code/lab/data (J158: ff5 461 1.5 GB, peasant7 463 2.4 GB; pauper5's partial 8.2 GB for 42% of a spine, inflated by the looping branches' logs), ~20 GB if pauper5's logs stay that long
resumable: yes
timeout: 5h
progress: lines /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/branches.jsonl of 55000
metrics: branches = lines /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unavailable = count /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/branches.jsonl "\"unavailable\":\""
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j162/b-*/phaseB/logs/*.log "Didn't find what to pay for"
metrics: armed = sh: cat var/lab-j162-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j162-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j162') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.spinesDone, atlas.decisions, atlas.labels, atlas.confident, atlas.voidLabels, atlas.meanRho, atlas.branchTimeouts, atlas.timeoutSharePauper5, atlas.branchUnavailable, atlas.zeroXLeftOut, atlas.zeroX, atlas.problems

**Why.** The atlas ladder (the cloud, 2026-10-21; HEARTBEAT *What's our strategy*): rung 3 turns the map into
LABELS, the regret of what Forge chose at each decision the atlas scores, sized on one night "before committing
the 7-8 nights" (the cloud, 2026-10-23). J158 was that night. It finished two of its six spines (ff5 461,
peasant7 463: 32 labels, 6 confident, 3 of them D470-void; results/J158/summary.md) and was stopped and
withdrawn at 00:11 EDT 2026-10-24 in its third, pauper5 464, which was losing 4.0% of its random branches
(243 of 6,065, 42% of its branch time) to the 120-s step clock. Three pairs, pauper5, synergy9 and modern7,
have no measured rate, and ff5's C1 repeat rests on one seed. **This job plays the four spines J158 did not
finish, on the tool the three fixes made.**

**What changed since J158** (in the pin; the pilot checks each is there):
- **D470 (#191, with #193's addendum): a forced block is given at the fork's own combat.** `BlockCand.install`
  takes the seat's blocks off the copied combat before it rewinds, so the seat is asked at the fork's combat;
  an option the copy cannot give is **`unavailable`** on its branch row (no error, no result, left out of the
  option's value), counted in `checks.optionUnavailable` by reason and by option; an option unavailable in
  more than `--branch-error-max` (0.1) of its branches is a problem. J158's three block decisions on ff5 461
  (d10, d14, d30) played Forge's block under every option; that cause is fixed, so **no label is expected to
  be void** here, and "0 void labels" is a check.
- **D471 (#192) and #195: G6, the random seat sizes X itself.** An own play with {X} in its mana cost has X
  drawn uniformly from 1 to the most the seat can pay (`xDrawn`); a play payable only at X = 0 is left out
  (`zeroXLeftOut`); an own play the engine paid at X = 0 is a violation (`zeroX`, a problem). #195 puts the
  drawn X and the random targets back on every listed play the seat did not pick. This ends J158's pauper5
  loop: the replayed `d0-random-o0-b27` ended in 4.2 s instead of the 120-s kill. Every pair here holds an
  {X} card in its main decks (pauper5 Crypt Rats and Fireball; synergy9 Walking Ballista; modern7 Polukranos
  and Walking Ballista; ff5 Walking Ballista and Hangarback Walker), so G6 changes all four random maps.
- **D472 (#194): the fork finds a play by its alternative cost.** J158's pauper5 d12 (Forge's Snuff Out for 4
  life) errored on 240 of 240 branches; it now plays. A play the copy cannot rebuild stays a branch **error**
  that names its kind (`no <description> [<kind>] on the copy's <card>`), never D470's unavailable.

**These labels are a policy of their own, and are never pooled.** D466 point 4 and D471 point 6: an atlas after
D471 is a new random policy, even on the same pair, seed and baseline, and D470 changes every block decision
of the hollow kind. J162's labels are on the D470 + D471 (with #195) + D472 tool and random policy; they are
**never pooled with J156's, J157's or J158's** labels or reads. J158's two spines are read **beside** them only:
the Report block copies J158's `reads.json` and `labels.json` into this job's report as `j158-reads.json` and
`j158-labels.json`, and the summary prints them in their own column. The split key, for rung 4 and anyone
after, is each label's `sha` (f6dba5e4 here, db496097 in J158).

**The spines: J158's four, at their original seeds.** J158 registered six fresh seeds, 461-466. 461 (ff5) and
463 (peasant7) are done and kept under `lab-j158`. **The other four are used here and nowhere else:**

| order | pair | line | seed | J158 |
|---|---|---|---|---|
| 1 | pauper-900000005 (pauper5) | 12 | **464** | stopped at 80 of 160 units; no atlas; **not reused** |
| 2 | synergy-900000009 (synergy9) | 24 | **465** | never started |
| 3 | modern-era-900000007 (modern7) | 8 | **466** | never started |
| 4 | fair-fight-900000005 (ff5) | 2 | **462** | never started |

- **pauper5 first**, the spine that failed, so its fix is seen working before the night is spent. Then the two
  unmeasured pairs, then ff5's second seed (the high-information pair, already measured once in J158).
- **pauper5 464's partial under `lab-j158/b-pauper5-464` is NOT reused**: it is pre-fix data on another policy.
  This job writes a new folder, `lab-j162`, and plays 464 from its baseline.
- **One overlap, harmless:** D471's `atlas-selftest` G6 leg plays **phase A** of the pauper pair at seed 464
  (`SELFTEST_G6`, 6 random-vs-random rollouts from the opening). Phase A labels nothing, and nothing of it is
  read here; the spine's phase B baseline and branches are its own. The pilot's smoke uses seed 4640.

**The design** (J158's, unchanged, so the labels compare with J158's as a cost and with rung 2's as a size):

| | |
|---|---|
| spines | four Forge-vs-Forge baseline games at the seeds above, one block each, in that order |
| phase A | **none** (it labels nothing) |
| phase B | each spine `--phase b`, its own folder `var/lab-j162/b-<pair>-<seed>` (re-rooted to the data folder); **16 of seat A's decisions** evenly spaced by D451's `spread`; every option **200 times random, 40 times Forge**, units of 25 branches; `--unit-timeout 30` (minutes, monotonic); the branch timeout at its 120-s default, read inside a step (D467); `--branch-error-max` at its 0.1 default (D466's errors and, since D470, unavailable options, each against the bar) |
| checks | D451 point 6 on every folder, as D466, D470 and D471 amend it |

**Sizing** (wall time from `plan.json` to `atlas.json`, the checks included):
- **pauper5 ~2.5 h at 7 workers (2-3.2 h).** J158's 80 units cost 19.2 worker-hours of branch time, 8.1 of them
  timeouts; its branches that did not time out still averaged 8.2 s random (ff5 1.8, peasant7 1.8), because
  the loop ran in many branches for less than 120 s (the replays fell from 120 s to 2.8-7.5 s). At ~3-4 s a
  random branch on the fixed tool (pauper games are 21.2 turns on the ladder against ff5's 17.9) and 1.8 s a
  Forge one, its 14,400 branch games are 11-15 worker-hours, ~1.6-2.1 h of branch time at 7 workers, ~2.1-2.8
  h at J158's measured 70-80% of that line, plus ~20 min of checks.
- **synergy9 ~1.55 h, modern7 ~1.3 h, ff5 462 ~1.6 h at 7.** J158 measured ff5 461 at 1.23 h and peasant7 463
  at 1.51 h (scaled to 7); J156's three ff5 spines averaged 2.0 h. synergy9 (17.7 ladder turns) at J158's prior
  of 1.55 h; modern7 (15.8) at J158's two pairs' mean, 1.3 h (J158's prior said 1.0 from J156's peasant7, and
  J158's own peasant7 came in at 1.51); ff5 462 between its two measures, 1.6 h.
- **Four spines ~6.95 h at 7 workers, ~8.1 h at 6**; the pilot ~15 min; the report ~2 min: **~8.5 h at 6
  workers** (what the memory rule gave J158 and J160), ~7.5 h at 7. ~64 labels if every spine lists 16
  decisions.
- **`timeout: 5h`** bounds each block (one spine a block), as in J158: the largest, pauper5, at up to ~3.2 h,
  + 50%.
- **Disk** ~12 GB (~20 GB if pauper5's logs stay as long as J158's partial); the pilot and every block require
  50 GB free (~650 GB free on 2026-10-24), and `abort:` fires under 50 GB.

**Where it writes: the lab data folder,** as J156-J158: every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, and `atlasCommand` re-roots `--out var/lab-j162/...` there.
**A new folder, `lab-j162`**, created empty by the PC session before posting; the pilot creates it again if
absent. `lab-j158` is read (its report and its two spine folders, for the pins and the side-by-side), never
written. The Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J162`), `atlas-selftest`'s own folder and the
job's scripts (`var/lab-j162-local/`) stay in the clone. As J158:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`; they `mkdir -p` the data folder before anything reads it, and stop under 50 GB free;
- the pilot records whether `lab-j162` held no spine folder when it first ran (`fresh`, checked);
- every run block asserts the path and the 50 GB again before it plays; `abort:` fires under 50 GB;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path;
- **no `clean:`, and nothing is deleted there: rung 4 reads these folders.** A restart from scratch needs
  `/home/justin-a/code/lab/data/lab-j162` moved aside by hand and `var/lab-j162-local/armed.txt` and
  `var/lab-j162-local/fresh.txt` removed (the J152 lesson, below).

**Nothing beside it.** `cores: 7` of 8 reserves the box: post nothing heavy beside it and hold the GPU lane.
No `pilot_cores:` (the J146 lesson). No `after:` line: J160 is lower-numbered and runs first, and the core
budget serialises the two.

**The abort lines read only this run's artefacts (the J152 lesson).** Every abort that reads the atlas's own
files is gated on `armed == 1`; `var/lab-j162-local/armed.txt` is written by this job's pilot (after the
data-folder guard) and removed by the Report block's last line. J158's own marker
(`var/lab-j158-local/armed.txt`, left in place when it was withdrawn) is a different file and is never read.

## The label set: the rung-3 contract, unchanged, plus `void`

`report/labels.jsonl`, one JSON row a branched decision of seat A, written by labels.py: **J158's contract
field for field** (`contract` still reads `mtg-table rung-3 label v1 (J158)`; results/J158/labels-readme.md is
its table), with the two fields J158's hand post-processing added, now computed by labels.py itself:

| field | what it is |
|---|---|
| everything in J158's table | `v`, `contract`, `pair`, `deckA`, `deckB`, `spineSeed`, `sha` (f6dba5e4), `d`, `kind`, `turn`, `forgeOption`, `forgeToken`, `options[]`, `bestRandom`, `bestForge`, `regret`/`regretLo`/`regretHi` (**the label**), `regretForge*`, `confident`, `confidentForge`, `complete`, `decided`, `inQ`, `settled`, `gap`, `rho`, `sameBest`, `branches`, `view`, `frameLog`, `rows`, `branchFrames`, `branchesFile`, `atlas`, `notForTraining` |
| **`void`** | `"D470"` or `null`: a **block** decision where, in **both** continuations, every branch index at which every option played (no error, no timeout, no engine error, **not unavailable**) has identical `turns`, `steps` and `result` across the options, with at least one such index in each; every option played the same game, so the regret measures nothing. J158's rule (labels-readme.md), with D470's unavailable rows added to "not played". Detected from `branches.jsonl`, never a list |
| **`voidEvidence`** | on a void row: for `random` and `forge`, how many played indices were identical, of how many, and how many indices had an errored, timed-out or unavailable option |

- **Expected: 0 void labels** (D470 fixed the cause); `atlas.voidLabels == 0` is a check, and labels.py's
  `sameGameNotBlock` lists any non-block decision that passes the same test (reported, never voided). The
  pilot proves the rule still fires: on J158's two spines labels.py must mark exactly ff5 461 d10, d14 and d30.
- Void rows, if any, stay in the file and in every count; a reader filters `void == null`.
- **What rung 4 reads, and why nothing is cleaned**, and **the confirm set is held out**: as J158 wrote them.
  These are confirm-set decks (D451 point 3, D318/D340), every row carries `notForTraining`, and training on
  them needs a decision of its own. J162 measures; it changes no marker.

## Pre-registered reads (numbers only)
- **(a) Labels produced and confident** (labels.py, J158's definitions): labels and confident labels per pair
  and per kind; the confident share with its interval, pooled (pair -> spine -> decision) and by pair (one
  spine a pair, so decision-level), by kind and over Q; `confidentForge` beside. Intervals: 95% percentile
  bootstrap, 10,000 draws, seed 150.
- **(b) What a label tells, by pair**: the median best-worst gap (random map), the mean regret, the settled share.
- **(c) The sizing line, first in the summary**: labels and confident labels **per spine**, and per 10-h night at
  the measured wall time and workers (`c_sizing`, J158's) and **per 7-worker 10-h night** (`c_sizing7`: the
  wall times its workers / 7, as J158's summary scaled it), by pair and as run; and reads.py's worker-second
  line (vi). Beside them, never pooled: **J158's measured ff5 130 labels / 32 confident and peasant7 106 / 13 a
  7-worker night**, and the prior from J156's spines, ff5 80 / 30 and peasant7 158 / 36 at 7. Then what 1,000
  labels and 1,000 confident labels take at each pair's rate and at this run's mix, and at the mix of all six
  measured spines (J158's two and these four) as a **cost** read only.
- **(i)-(iii) Agreement, as rung 2** (reads.py, J156's definitions unchanged): (i) same best over Q; (ii) mean
  rho over the rankable decisions, how many have two options, and over Q; (iii) regret at Forge's choice by
  kind under each map, with how many clear zero. Pooled over four pairs and by pair. J158's two spines beside.
- **(iv) C1 "cast now where Forge passes"** (J156's statistic) **on each new pair**, pauper5, synergy9, modern7
  and ff5 462 (`iv_byPair`), and ff5's repeat (`iv_repeat`, now seed 462 alone): **HOLDS** if the point is > 0
  and the interval's low end is > 0, else **NOT SHOWN**; the Forge map and C2 beside, as information. Beside
  it, never pooled: J158's ff5 461 +4.3 [1.0, 7.6] and peasant7 +2.8 [0.3, 5.0], J156's ff5 +8.3 [4.2, 13.3],
  J148's +1.3. A repeat is of a direction, not a value (D466 point 4, D471 point 6).
- **(v) Guardrails**: G1 lands offered and taken, violations (G1, G4, G6 apart), G3 `noRepeatNoOp`, G5
  `refusedCast` / `noRepeatRefused` (ff5 must show both: Elite Spellbinder), `payfail` beside; and **G6's
  `xDrawn`, `zeroXLeftOut` and `zeroX`** per pair (pauper5 must show `zeroXLeftOut` >= 1: Crypt Rats; **any
  `zeroX` > 0 fails the atlas**, its own problem line, and a check here).
- **(vii) The tool's counters** (metrics.py, `report/tool.json`, per spine and in all):
  - **`branchTimeouts` and `branchTimeoutsInStep`** (D467; "in step" = timed out and an engine error), by
    decision. **pauper5's must be under 1% of its branch games** (a check; J158's partial: **4.0%**, 243 of
    6,065, 241 in a step, by decision d0 16, d2 31, d4 18, d6 21, d8 26, d10 49, d12 65, d14 14, d17 3). The
    other spines' are reported (J158: 0 on ff5 461 and peasant7 463).
  - **`checks.optionUnavailable`** (D470): unavailable branch games in all, **by reason** (ids as #) and **by
    option**, every option with its count against its branch games, below the bar too. An option unavailable
    in more than 10% of its branches is a problem (the atlas's own line) and `unavailableOptionsOverBar == 0`
    is a check; any unavailable option is named in the summary with its reason.
  - **Branch errors by kind**: `timeout (D467)`, `play not rebuilt on the copy (D472)` (D472's
    `no <description> [<kind>] on the copy's <card>`), `optional cost not offered (D466)`, `recording`, else
    the exception's class. J158's partial, for the before: pauper5 240 `optional cost not offered` (d12's
    Snuff Out, fixed by D472) and 241 timeouts; ff5 461 211 `NullPointerException` (D470's, fixed).
  - Engine errors **other than** step-clock timeouts are bounded at 50 (a check, J158's bound).
- Everything else is a candidate (D447 point 9).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j162/`).
- `b-<pair>-<seed>/`: `plan.json`, `atlas.json`, `atlas.md`, `phaseB/` (the baseline, its rows and frames,
  branches.jsonl, units.jsonl, every branch's frames and rows, the worker logs). `pilot-pauper5/`, the smoke.
- `exits.txt` (each atlas command's exit) and `spine-times.txt`.
- `report/`: each spine's `atlas.json` and `atlas.md` under its folder's name, `reads.json`, `labels.jsonl`,
  `labels.json` (reads (a)-(c), the void count, `c_sizing7`), `labels-head.jsonl` (its first 20 rows),
  `tool.json` (the counters of (v) and (vii)), `j158-reads.json` and `j158-labels.json` (J158's, copied for
  the side-by-side), `exits.txt`, `spine-times.txt` and `missing.txt` (empty when nothing was missing).
- Never `summary.md` or `metrics.json`.

## Pilot
About 15 minutes: the data folder and the abort gate; the pin carries D466, D467, D470 (and #193), D471 (and
#195) and D472; the node tests; the two engine self-tests (atlas-selftest with its G5 leg on ff5 and its G6
leg on pauper5); reads.py and labels.py proved on J148's atlas and J158's two spines by sha256; a 6-rollout
smoke on pauper5 in which G6 must fire and no branch may time out.

**The proofs, by sha256.** `proj.py` prints the sha256 of the canonical JSON of a file's registered keys:
`reads` (every key J158's reads.py printed), `labels` (every key J158's labels.py printed) and `rows` (a
labels.jsonl with J162's two added row fields taken out). Over J158's report (lab-j158, db496097):
- `reads.json` is **`37310cc3d9eb14b11a826918daae9a432806090ce2850b63fde012f7a93c44ad`**;
- `labels.json` is **`23d1a593792f97ef490b67fa15bc0b9aaa71ffb56265244a6406953fb81b6f10`**;
- `labels-raw.jsonl` (labels.py's own rows, before J158's hand marking) is
  **`96f1c174b9137ec364012ba5abfab02f185bc1afacad63f3875a264920cf2e74`**.

The pilot checks that the files on disk still give these, and that this file's reads.py and labels.py, run on
J158's two spines (`--times` J158's spine-times.txt, `--sha=db496097`), give them too; and that labels.py
marks exactly the three void labels J158's hand rule found (the positive control of the "0 void" check), with
no non-block decision passing the test. reads.py on J148's own atlas must give J148's published numbers, as in
J158. All of this was run by hand on 2026-10-24 on the lab's files: every hash matched.

**The self-tests.** `atlas-selftest --jobs 1` (J158's reason for one worker: the `GameLog` folder race, since
fixed on main; one worker is what D470-D472 measured, ~4 min): its main atlas, **its G5 leg** (ff5, seed 452,
16 rollouts since D471: `refusedCast` >= 1 and `noRepeatRefused` >= 1) and **its G6 leg** (pauper5, seed 464,
6 rollouts: `xDrawn` >= 1, `zeroXLeftOut` >= 1, `zeroX` 0). The pilot reads both legs' atlas.json and checks
their counts itself. Then `seat-identity`.

**The smoke** plays pauper5 at seed **4640** (not a spine seed): 6 rollouts of phase A, 2 decisions, 8 + 4
branches. It must show G6's keys with `zeroXLeftOut` >= 1 (phase A and the random branches; Crypt Rats in A and
Fireball in B make an X = 0-only offer likely in every game) and `zeroX` 0, **no branch timed out**, no
problem, no violation, the 120-s branch timeout in its plan, and two labels whose rows match, none void.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J162: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J162: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j162 var/lab-j162-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J162: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J162: under 50 GB free on the data folder')"
echo 1 > var/lab-j162-local/datadir.txt
# fresh: lab-j162 held no spine folder when this pilot first ran (written once; a later pilot run keeps the first answer)
test -f var/lab-j162-local/fresh.txt || { if ls -d /home/justin-a/code/lab/data/lab-j162/b-* >/dev/null 2>&1; then echo 0; else echo 1; fi; } > var/lab-j162-local/fresh.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j162-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j162-local/merged.txt || echo 0 > var/lab-j162-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j162-local/sha.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'landPlays' bridge/src/mtgtable/ai/Decisions.java && grep -q 'putBack' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'unreadableFrameLogs' tools/cubelab/atlas.ts && grep -q 'branch-error-max' tools/cubelab/atlas.ts && grep -q 'idChecksSkipped' tools/cubelab/atlas.ts && echo 1 > var/lab-j162-local/has-d466.txt || echo 0 > var/lab-j162-local/has-d466.txt
grep -q 'class StepClock' bridge/src/mtgtable/ai/Atlas.java && grep -q 'class BranchTimeout' bridge/src/mtgtable/ai/Atlas.java && grep -q 'stepClock' bridge/src/mtgtable/ai/DecisionSelfTest.java && echo 1 > var/lab-j162-local/has-d467.txt || echo 0 > var/lab-j162-local/has-d467.txt
grep -q 'class OptionUnavailable' bridge/src/mtgtable/ai/RolloutController.java && grep -q 'undoBlockingAssignment' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'countUnavailable' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'unavailableBranches' tools/cubelab/atlas.ts && grep -q 'optionUnavailable' tools/cubelab/atlas.ts && echo 1 > var/lab-j162-local/has-d470.txt || echo 0 > var/lab-j162-local/has-d470.txt
grep -q 'zeroXLeftOut' bridge/src/mtgtable/ai/Explorer.java && grep -q 'drawX' bridge/src/mtgtable/ai/Explorer.java && grep -q 'restoreChoices' bridge/src/mtgtable/ai/Explorer.java && grep -q 'SELFTEST_G6' tools/cubelab/atlas.ts && grep -q 'zeroX' tools/check-redaction.mjs && echo 1 > var/lab-j162-local/has-d471.txt || echo 0 > var/lab-j162-local/has-d471.txt
grep -q 'sameKind' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'copyCandidates' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'addedOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && echo 1 > var/lab-j162-local/has-d472.txt || echo 0 > var/lab-j162-local/has-d472.txt
grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'noRepeatRefused' bridge/src/mtgtable/ai/Explorer.java && grep -q 'fair-fight-900000005' tools/cubelab/atlas.ts && echo 1 > var/lab-j162-local/has-g5.txt || echo 0 > var/lab-j162-local/has-g5.txt
grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'monotonicMs' tools/cubelab/engine.ts && echo 1 > var/lab-j162-local/has-watchdog.txt || echo 0 > var/lab-j162-local/has-watchdog.txt
grep -rq 'CUBELAB_WORKER_XMX' tools/cubelab && echo 1 > var/lab-j162-local/has-heap.txt || echo 0 > var/lab-j162-local/has-heap.txt
grep -q 'empty-hand-ok' tools/check-redaction.mjs && grep -q 'empty-hand-ok' tools/cubelab/atlas.ts && echo 1 > var/lab-j162-local/has-checker.txt || echo 0 > var/lab-j162-local/has-checker.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j162-local/xmx-unset.txt || echo 0 > var/lab-j162-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts
cat > var/lab-j162-local/bin/reads.py <<'PY'
# J162 runs this file unchanged from J158 (pc-results drafts/J162-move-atlas-3b.md): every definition below is J158's,
# and the pilot pins J158's reads.json by sha256 over every key it printed.
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
cat > var/lab-j162-local/bin/labels.py <<'PY'
# J162's label set (pc-results drafts/J162-move-atlas-3b.md): J158's labels.py, the rung-3 contract unchanged, with two
# additions, both registered before any J162 data: every row carries `void` (D470's signature, read from the rows) and
# `voidEvidence`; and the sizing gains a 7-worker line (`c_sizing7`). Every key J158's labels.py printed is printed
# exactly as it printed it (the pilot pins J158's labels.json by sha256 over those keys).
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
#   void       (J162; J158's hand rule, results/J158/labels-readme.md, with D470's `unavailable` rows added to "not played")
#              "D470" when the decision is a block and, in BOTH continuations, every branch index at which every option
#              has a played row (no error, no timeout, no engine error, not unavailable) has identical (turns, steps,
#              result) across the options, with at least one such index in each continuation: every option played the
#              same game, so the regret measures nothing. Else null. `voidEvidence` on a void row. A non-block decision
#              passing the same test is listed in `sameGameNotBlock`, never voided
#   c_sizing7  (J162) c_sizing's labels and confident labels per 10-h night scaled to 7 workers: the measured wall
#              times its workers / 7 (the whole wall, checks included, as J158's summary scaled it)
import collections, glob, json, os, random, statistics, sys

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


SAME = {}


def same_game(branches_file):
    """Per decision: whether every option played the same game at every index where all of them played (J162's void test)."""
    if branches_file in SAME:
        return SAME[branches_file]
    rows, nopt = collections.defaultdict(dict), collections.defaultdict(set)
    if os.path.exists(branches_file):
        for line in open(branches_file):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            rows[(r['d'], r['c'], r['i'])][r['o']] = r
            nopt[r['d']].add(r['o'])
    s = {}
    for (d, c, i), opts in rows.items():
        e = s.setdefault(d, {}).setdefault(c, {'indices': 0, 'allPlayed': 0, 'identical': 0})
        e['indices'] += 1
        if len(opts) < len(nopt[d]):
            continue
        if not all(r.get('error') is None and not r.get('timedOut') and not r.get('engineError') and not r.get('unavailable') for r in opts.values()):
            continue
        e['allPlayed'] += 1
        if len({(r['turns'], r['steps'], r['result']) for r in opts.values()}) == 1:
            e['identical'] += 1
    res = {}
    for d, cs in s.items():
        same = all(cs.get(c, {}).get('allPlayed', 0) > 0 and cs[c]['identical'] == cs[c]['allPlayed'] for c in ('random', 'forge'))
        ev = {c: '%d of %d played indices identical across the %d options (%d of %d indices had an errored, timed-out or unavailable option)' % (
            cs.get(c, {}).get('identical', 0), cs.get(c, {}).get('allPlayed', 0), len(nopt[d]),
            cs.get(c, {}).get('indices', 0) - cs.get(c, {}).get('allPlayed', 0), cs.get(c, {}).get('indices', 0)) for c in ('random', 'forge')}
        res[d] = {'same': same, 'evidence': ev}
    SAME[branches_file] = res
    return res


labels, tree, same_any = [], {}, []
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
        sg = same_game(lab['branchesFile']).get(d, {'same': False, 'evidence': None})
        same_any.append((lab, sg['same']))
        lab['void'] = 'D470' if x['kind'] == 'b' and sg['same'] else None
        if lab['void']:
            lab['voidEvidence'] = sg['evidence']
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
# (J162) the void count (0 expected since D470), any non-block decision that played one game under every option,
# the counts without the void, and the sizing scaled to 7 workers
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s %s d%d %s' % (x['pair'], x['spineSeed'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s %s d%d' % (x['pair'], x['spineSeed'], x['d']) for x, same in same_any if same and x['kind'] != 'b']
out['withoutVoid'] = {p: {'labels': sum(1 for x in labels if x['pair'] == p and x['complete'] and not x['void']),
                          'confident': sum(1 for x in labels if x['pair'] == p and x['confident'] and not x['void'])} for p in sorted(tree)}
s7 = {}
for p, s in size.items():
    w = [int(v) for v in s['workers'] if str(v).isdigit()]
    h7 = s['wallSec'] / 3600 * (w[0] / 7) if len(w) == 1 and s['wallSec'] else None
    s7[p] = {'workers': w, 'labelsPer7Worker10hNight': round(10 * s['labels'] / h7) if h7 else None,
             'confidentPer7Worker10hNight': round(10 * s['confident'] / h7) if h7 else None}
ws = sum(s['wallSec'] * int(s['workers'][0]) / 7 for s in size.values() if len(s['workers']) == 1 and str(s['workers'][0]).isdigit())
lt = sum(s['labels'] for s in size.values() if len(s['workers']) == 1)
ct = sum(s['confident'] for s in size.values() if len(s['workers']) == 1)
s7['asRun'] = {'labelsPer7Worker10hNight': round(10 * lt / (ws / 3600)) if ws else None,
               'confidentPer7Worker10hNight': round(10 * ct / (ws / 3600)) if ws else None}
out['c_sizing7'] = s7
print(json.dumps(out, indent=1))
PY
cat > var/lab-j162-local/bin/metrics.py <<'PY'
# J162's metrics (pc-results drafts/J162-move-atlas-3b.md): one JSON object over every spine folder b-* under the data
# folder's lab-j162 (no phase A in this job), the branch rows (timeouts, D470's unavailable, errors by kind), the atlases'
# G5 and G6 counts, and the report's labels.json and reads.json. Standard library only; no engine.
import glob, json, math, os, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j162'
PAIRS = ('pauper5', 'synergy9', 'modern7', 'ff5')
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0, 'refusedCastFf5': 0, 'noRepeatRefusedFf5': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'xDrawnPauper5': 0, 'zeroXLeftOutPauper5': 0,
       'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'truncatedLogs': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'branchErrored': 0, 'branchUnavailable': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'timeoutsByPair': {}, 'branchesByPair': {}, 'timeoutSharePauper5': None,
       'decisions': 0, 'sameBest': 0, 'meanRho': None, 'unitsShort': 0, 'reads': 0, 'labels': -1, 'confident': -1,
       'rowsUnmatched': -1, 'voidLabels': -1, 'bySpine': {}}
for p in PAIRS:
    out['spines_' + p] = 0


def pair_of(name):
    return name[2:].rsplit('-', 1)[0]


def kind_of(err):
    """A branch error's kind (J162): D472's unrebuildable play and D466's optional cost by their texts, else the class."""
    if err.startswith('BranchTimeout'):
        return 'timeout (D467)'
    if re.match(r"IllegalStateException: no .* on the copy's ", err):
        return 'play not rebuilt on the copy (D472)'
    if re.match(r'IllegalStateException: optional cost .* is not offered on the copy', err):
        return 'optional cost not offered (D466)'
    if err.startswith('recording:'):
        return 'recording'
    return err.split(':', 1)[0].strip() or 'other'


rhos = []
for f in sorted(glob.glob(D + '/b-*/atlas.json')):
    d = json.load(open(f))
    c = d['checks']
    g = c['guardrails']
    name = os.path.basename(os.path.dirname(f))
    pair = pair_of(name)
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['guardViolations'] += g.get('violations', 0)
    vb = g.get('violationsBy') or {}
    for k in ('G1', 'G4', 'G6'):
        out['violations' + k] += vb.get(k, 0)
    out['g5keys'] += 1 if 'refusedCast' in g and 'noRepeatRefused' in g else 0
    out['g6keys'] += 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0
    for k in ('refusedCast', 'noRepeatRefused', 'noRepeatNoOp', 'xDrawn', 'zeroXLeftOut', 'zeroX'):
        out[k] += g.get(k, 0)
    if pair == 'ff5':
        out['refusedCastFf5'] += g.get('refusedCast', 0)
        out['noRepeatRefusedFf5'] += g.get('noRepeatRefused', 0)
    if pair == 'pauper5':
        out['xDrawnPauper5'] += g.get('xDrawn', 0)
        out['zeroXLeftOutPauper5'] += g.get('zeroXLeftOut', 0)
    out['branchErroredOptions'] += len((c.get('branchErrors') or {}).get('options', []))
    out['unavailableOptionsOverBar'] += len((c.get('optionUnavailable') or {}).get('options', []))
    out['truncatedLogs'] += len(c.get('unreadableFrameLogs') or [])
    b = d.get('phaseB')
    if b:
        out['spinesDone'] += 1
        if pair in PAIRS:
            out['spines_' + pair] += 1
        out['decisions'] += len(b['decisions'])
        out['sameBest'] += b['agreement']['sameBest']
        rhos += [x['rho'] for x in b['decisions'] if x['complete'] and x['rho'] is not None]
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
# the branch rows, live: timeouts (D467; in step = timed out AND an engine error), D470's unavailable by reason (ids as #),
# errors by kind (an unavailable row has no error; a timeout is counted once, under its own kind)
for f in sorted(glob.glob(D + '/b-*/phaseB/branches.jsonl')):
    pair = pair_of(os.path.basename(os.path.dirname(os.path.dirname(f))))
    n = t = 0
    sp = out['bySpine'].setdefault(os.path.basename(os.path.dirname(os.path.dirname(f))), {
        'rows': 0, 'timeouts': 0, 'timeoutsInStep': 0, 'timeoutsByDecision': {}, 'unavailable': 0, 'unavailableByOption': {},
        'errored': 0, 'errorsByKind': {}})
    opt_n = {}
    for line in open(f):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        n += 1
        ok = 'd%s o%s %s' % (r.get('d'), r.get('o'), r.get('token'))
        opt_n[ok] = opt_n.get(ok, 0) + 1
        if r.get('timedOut'):
            t += 1
            ins = 1 if r.get('engineError') else 0
            out['branchTimeoutsInStep'] += ins
            sp['timeoutsInStep'] += ins
            dk = 'd%s' % r.get('d')
            sp['timeoutsByDecision'][dk] = sp['timeoutsByDecision'].get(dk, 0) + 1
        if r.get('unavailable'):
            out['branchUnavailable'] += 1
            sp['unavailable'] += 1
            k = re.sub(r'\d+', '#', r['unavailable'])[:160]
            out['unavailableByReason'][k] = out['unavailableByReason'].get(k, 0) + 1
            sp['unavailableByOption'][ok] = sp['unavailableByOption'].get(ok, 0) + 1
        if r.get('error'):
            out['branchErrored'] += 1
            sp['errored'] += 1
            k = kind_of(r['error'])
            out['errorsByKind'][k] = out['errorsByKind'].get(k, 0) + 1
            sp['errorsByKind'][k] = sp['errorsByKind'].get(k, 0) + 1
    sp['rows'], sp['timeouts'] = n, t
    # D470's bar, per option and below it too: each option's unavailable count against its branch games
    sp['unavailableByOption'] = {k: '%d of %d' % (v, opt_n[k]) for k, v in sorted(sp['unavailableByOption'].items())}
    out['branchRows'] += n
    out['branchTimeouts'] += t
    out['branchesByPair'][pair] = out['branchesByPair'].get(pair, 0) + n
    out['timeoutsByPair'][pair] = out['timeoutsByPair'].get(pair, 0) + t
if out['branchesByPair'].get('pauper5'):
    out['timeoutSharePauper5'] = round(out['timeoutsByPair']['pauper5'] / out['branchesByPair']['pauper5'], 5)
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
    out['reads'] = 1 if sorted(r['spines']) == sorted(PAIRS) and sum(len(v) for v in r['spines'].values()) == 4 and 'iv_byPair' in r else 0
except (OSError, ValueError, KeyError):
    pass
try:
    lb = json.load(open(D + '/report/labels.json'))
    out['labels'], out['confident'], out['rowsUnmatched'], out['voidLabels'] = lb['labels'], lb['confident'], lb['rowsUnmatched'], lb['voidLabels']
except (OSError, ValueError, KeyError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j162-local/bin/proj.py <<'PY'
# J162 pilot: the projections J158's reads.json and labels.json are pinned by (sha256 of canonical JSON over the keys
# J158's reads.py and labels.py printed). Usage: proj.py reads|labels|rows FILE. `rows` hashes a labels.jsonl with J162's
# two added row fields (void, voidEvidence) taken out, so it compares with J158's labels.py rows (labels-raw.jsonl).
import hashlib, json, sys
READS = ('spines', 'decisions', 'complete', 'decided', 'Q', 'i_sameBest', 'ii_rho', 'ii_rho_Q', 'iii_regret', 'iv_repeat',
         'v_guardrails', 'vi_rung3', 'vi_rung3_byPair', 'iv_byPair')
LABELS = ('contract', 'spines', 'branched', 'labels', 'rowsUnmatched', 'confident', 'confidentQ', 'confidentForge', 'byPair',
          'a_confidentShare', 'a_confidentShareByKind', 'a_confidentShareQ', 'b_gapMedian', 'b_gapMean', 'b_regretMean',
          'b_settledShare', 'c_sizing')
kind, f = sys.argv[1], sys.argv[2]
if kind == 'rows':
    rows = []
    for line in open(f):
        r = json.loads(line)
        r.pop('void', None)
        r.pop('voidEvidence', None)
        rows.append(r)
    p = rows
else:
    d = json.load(open(f))
    p = {k: d.get(k) for k in (READS if kind == 'reads' else LABELS)}
    p['spines'] = {k: sorted(v, key=str) for k, v in p['spines'].items()}
print(hashlib.sha256(json.dumps(p, sort_keys=True, separators=(',', ':')).encode()).hexdigest())
PY
cat > var/lab-j162-local/bin/pilot.py <<'PY'
# J162 pilot: the smoke on pauper5 (seed 4640) and the atlas-selftest's G5 and G6 legs, as one JSON object.
# Standard library only; no engine. Run from the clone (the self-test's folder is the repo's var/cubelab/atlas-selftest).
import json
S = '/home/justin-a/code/lab/data/lab-j162/pilot-pauper5'
out = {'smoke': {'problems': -1}, 'g5': {'refusedCast': -1}, 'g6': {'zeroXLeftOut': -1}}
try:
    d = json.load(open(S + '/atlas.json'))
    c, g = d['checks'], d['checks']['guardrails']
    rows = [json.loads(l) for l in open(S + '/phaseB/branches.jsonl') if l.strip()]
    lb = json.load(open('var/lab-j162-local/pilot-labels.json'))
    out['smoke'] = {'problems': len(c['problems']), 'decisions': len(d['phaseB']['decisions']),
                    'g6': 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0,
                    'xDrawn': g.get('xDrawn', 0), 'zeroXLeftOut': g.get('zeroXLeftOut', 0), 'zeroX': g.get('zeroX', -1),
                    'guardViolations': g['violations'], 'branchTimeoutSec': d['plan']['branchTimeoutSec'],
                    'branches': len(rows), 'timeouts': sum(1 for r in rows if r.get('timedOut')),
                    'unavailable': sum(1 for r in rows if r.get('unavailable')), 'errored': sum(1 for r in rows if r.get('error')),
                    'labels': lb['labels'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels']}
except (OSError, ValueError, KeyError, TypeError):
    pass
for leg in ('g5', 'g6'):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        g = d['checks']['guardrails']
        out[leg] = {'problems': len(d['checks']['problems']), 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0),
                    'xDrawn': g.get('xDrawn', 0), 'zeroXLeftOut': g.get('zeroXLeftOut', 0), 'zeroX': g.get('zeroX', -1)}
    except (OSError, ValueError, KeyError, TypeError):
        pass
print(json.dumps(out))
PY
# reads.py on J148's own atlas (one pair, one spine): it must give J148's published numbers
python3 -I var/lab-j162-local/bin/reads.py ff5:451:var/lab-j142/atlas/atlas.json > var/lab-j162-local/reads-j148.json
python3 -I -c "import json; d = json.load(open('var/lab-j162-local/reads-j148.json')); ok = (d['decided'], d['Q'], d['i_sameBest']['point'], d['ii_rho']['n'], d['ii_rho']['point'], d['iv_repeat']['C1_castNow']['random']['point'], d['iv_repeat']['C2_dontAttack']['random']['point']) == (27, 22, 0.3182, 18, -0.3416, 0.0129, 0.0588); print(1 if ok else 0)" > var/lab-j162-local/reads-self.txt
# reads.py and labels.py on J158's two spines (read, never written): each must give J158's report, by sha256
R8=/home/justin-a/code/lab/data/lab-j158
python3 -I var/lab-j162-local/bin/reads.py ff5:461:$R8/report/b-ff5-461.atlas.json peasant7:463:$R8/report/b-peasant7-463.atlas.json > var/lab-j162-local/reads-j158.json || true
test "$(python3 -I var/lab-j162-local/bin/proj.py reads $R8/report/reads.json)" = 37310cc3d9eb14b11a826918daae9a432806090ce2850b63fde012f7a93c44ad && test "$(python3 -I var/lab-j162-local/bin/proj.py reads var/lab-j162-local/reads-j158.json)" = 37310cc3d9eb14b11a826918daae9a432806090ce2850b63fde012f7a93c44ad && echo 1 > var/lab-j162-local/reads-j158.txt || echo 0 > var/lab-j162-local/reads-j158.txt
python3 -I var/lab-j162-local/bin/labels.py ff5:461:$R8/b-ff5-461 peasant7:463:$R8/b-peasant7-463 --out=var/lab-j162-local/labels-j158.jsonl --times=$R8/spine-times.txt --sha=db496097 > var/lab-j162-local/labels-j158.json || true
test "$(python3 -I var/lab-j162-local/bin/proj.py labels $R8/report/labels.json)" = 23d1a593792f97ef490b67fa15bc0b9aaa71ffb56265244a6406953fb81b6f10 && test "$(python3 -I var/lab-j162-local/bin/proj.py labels var/lab-j162-local/labels-j158.json)" = 23d1a593792f97ef490b67fa15bc0b9aaa71ffb56265244a6406953fb81b6f10 && test "$(python3 -I var/lab-j162-local/bin/proj.py rows $R8/report/labels-raw.jsonl)" = 96f1c174b9137ec364012ba5abfab02f185bc1afacad63f3875a264920cf2e74 && test "$(python3 -I var/lab-j162-local/bin/proj.py rows var/lab-j162-local/labels-j158.jsonl)" = 96f1c174b9137ec364012ba5abfab02f185bc1afacad63f3875a264920cf2e74 && echo 1 > var/lab-j162-local/labels-j158.txt || echo 0 > var/lab-j162-local/labels-j158.txt
# the void rule's positive control: on J158's spines exactly ff5 461 d10, d14 and d30, and no non-block decision
python3 -I -c "import json; d = json.load(open('var/lab-j162-local/labels-j158.json')); print(1 if (d['voidLabels'], d['voidList'], d['sameGameNotBlock']) == (3, ['ff5 461 d10 block:35>78', 'ff5 461 d14 block:21>71', 'ff5 461 d30 block:25>80,40>81'], []) else 0)" > var/lab-j162-local/void-j158.txt 2>/dev/null || echo 0 > var/lab-j162-local/void-j158.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J162
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh atlas-selftest --jobs 1 && echo 1 > var/lab-j162-local/selftest.txt || echo 0 > var/lab-j162-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j162-local/identity.txt || echo 0 > var/lab-j162-local/identity.txt
S=tools/ai-bench/decks/sets
tools/cubelab.sh atlas --deck-a $S/pauper-900000005-A.dck --deck-b $S/pauper-900000005-B.dck --seed 4640 --rollouts 6 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --unit-timeout 30 --jobs {workers} --out var/lab-j162/pilot-pauper5 || true
python3 -I var/lab-j162-local/bin/labels.py pauper5:4640:/home/justin-a/code/lab/data/lab-j162/pilot-pauper5 --out=var/lab-j162-local/pilot-labels.jsonl --sha=$(cat var/lab-j162-local/sha.txt) > var/lab-j162-local/pilot-labels.json || true
```
metrics: datadir = sh: cat var/lab-j162-local/datadir.txt 2>/dev/null || echo 0
metrics: fresh = sh: cat var/lab-j162-local/fresh.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j162-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466 = sh: cat var/lab-j162-local/has-d466.txt 2>/dev/null || echo 0
metrics: has_d467 = sh: cat var/lab-j162-local/has-d467.txt 2>/dev/null || echo 0
metrics: has_d470 = sh: cat var/lab-j162-local/has-d470.txt 2>/dev/null || echo 0
metrics: has_d471 = sh: cat var/lab-j162-local/has-d471.txt 2>/dev/null || echo 0
metrics: has_d472 = sh: cat var/lab-j162-local/has-d472.txt 2>/dev/null || echo 0
metrics: has_g5 = sh: cat var/lab-j162-local/has-g5.txt 2>/dev/null || echo 0
metrics: has_watchdog = sh: cat var/lab-j162-local/has-watchdog.txt 2>/dev/null || echo 0
metrics: has_heap = sh: cat var/lab-j162-local/has-heap.txt 2>/dev/null || echo 0
metrics: has_checker = sh: cat var/lab-j162-local/has-checker.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j162-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j162-local/reads-self.txt 2>/dev/null || echo 0
metrics: reads_j158 = sh: cat var/lab-j162-local/reads-j158.txt 2>/dev/null || echo 0
metrics: labels_j158 = sh: cat var/lab-j162-local/labels-j158.txt 2>/dev/null || echo 0
metrics: void_j158 = sh: cat var/lab-j162-local/void-j158.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j162-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j162-local/identity.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -I var/lab-j162-local/bin/pilot.py 2>/dev/null || echo '{"smoke":{"problems":-1}}'
check: datadir == 1
check: data_free_gb >= 50
check: fresh == 1
check: merged == 1
check: has_d466 == 1
check: has_d467 == 1
check: has_d470 == 1
check: has_d471 == 1
check: has_d472 == 1
check: has_g5 == 1
check: has_watchdog == 1
check: has_heap == 1
check: has_checker == 1
check: xmx_unset == 1
check: reads_self == 1
check: reads_j158 == 1
check: labels_j158 == 1
check: void_j158 == 1
check: selftest == 1
check: identity == 1
check: pilot.g5.problems == 0
check: pilot.g5.refusedCast >= 1
check: pilot.g5.noRepeatRefused >= 1
check: pilot.g6.problems == 0
check: pilot.g6.xDrawn >= 1
check: pilot.g6.zeroXLeftOut >= 1
check: pilot.g6.zeroX == 0
check: pilot.smoke.problems == 0
check: pilot.smoke.decisions == 2
check: pilot.smoke.g6 == 1
check: pilot.smoke.zeroXLeftOut >= 1
check: pilot.smoke.zeroX == 0
check: pilot.smoke.branches >= 1
check: pilot.smoke.timeouts == 0
check: pilot.smoke.guardViolations == 0
check: pilot.smoke.branchTimeoutSec == 120
check: pilot.smoke.labels == 2
check: pilot.smoke.rowsUnmatched == 0
check: pilot.smoke.voidLabels == 0

## Commands
One block a spine, in the order pauper5 464, synergy9 465, modern7 466, ff5 462. Every atlas command resumes
what is done. An atlas that finds a problem exits 3 and the job goes on to the next spine (the exit is kept in
`/home/justin-a/code/lab/data/lab-j162/exits.txt`); each block appends its spine's wall time to
`/home/justin-a/code/lab/data/lab-j162/spine-times.txt`; the final checks read every folder's `atlas.json`. Each
block asserts the data folder and its 50 GB again before it plays. **pauper5's expected wall is ~2.5 h** on the
fixed tool; the 5-h block timeout is J158's, unchanged.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J162: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j162
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J162: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J162
S=tools/ai-bench/decks/sets
n=b-pauper5-464; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/pauper-900000005-A.dck --deck-b $S/pauper-900000005-B.dck --seed 464 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j162/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j162/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j162/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J162: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j162
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J162: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J162
S=tools/ai-bench/decks/sets
n=b-synergy9-465; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/synergy-900000009-A.dck --deck-b $S/synergy-900000009-B.dck --seed 465 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j162/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j162/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j162/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J162: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j162
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J162: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J162
S=tools/ai-bench/decks/sets
n=b-modern7-466; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/modern-era-900000007-A.dck --deck-b $S/modern-era-900000007-B.dck --seed 466 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j162/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j162/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j162/spine-times.txt
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J162: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j162
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J162: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J162
S=tools/ai-bench/decks/sets
n=b-ff5-462; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 462 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j162/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j162/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j162/spine-times.txt
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j162
R8=/home/justin-a/code/lab/data/lab-j158/report
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
python3 -I var/lab-j162-local/bin/reads.py $args > $D/report/reads.json || echo "reads.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j162-local/bin/labels.py $largs --out=$D/report/labels.jsonl --times=$D/spine-times.txt --sha=$(cat var/lab-j162-local/sha.txt) > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
head -n 20 $D/report/labels.jsonl > $D/report/labels-head.jsonl || echo "labels.jsonl: none" >> $D/report/missing.txt
python3 -I var/lab-j162-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
# J158's reads and labels, beside these and never pooled with them
cp $R8/reads.json $D/report/j158-reads.json || echo "J158 reads.json: none" >> $D/report/missing.txt
cp $R8/labels.json $D/report/j158-labels.json || echo "J158 labels.json: none" >> $D/report/missing.txt
cp $D/exits.txt $D/report/exits.txt || echo "exits.txt: none" >> $D/report/missing.txt
cp $D/spine-times.txt $D/report/spine-times.txt || echo "spine-times.txt: none" >> $D/report/missing.txt
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j162-local/armed.txt
```
check: atlas.atlases == 4
check: atlas.spinesDone == 4
check: atlas.spines_pauper5 == 1
check: atlas.spines_synergy9 == 1
check: atlas.spines_modern7 == 1
check: atlas.spines_ff5 == 1
check: unit_errors == 0
check: atlas.unitsShort == 0
check: atlas.g5keys == 4
check: atlas.g6keys == 4
check: atlas.refusedCastFf5 >= 1
check: atlas.noRepeatRefusedFf5 >= 1
check: atlas.zeroXLeftOutPauper5 >= 1
check: atlas.zeroX == 0
check: atlas.guardViolations == 0
check: atlas.problems == 0
check: atlas.unavailableOptionsOverBar == 0
check: atlas.timeoutSharePauper5 < 1%
check: engine_errors - atlas.branchTimeoutsInStep <= 50
check: atlas.reads == 1
check: atlas.labels >= 1
check: atlas.rowsUnmatched == 0
check: atlas.voidLabels == 0

## Abort if
abort: armed == 1 and unit_errors > 20
abort: armed == 1 and engine_errors > 500
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block (above), so the first two cannot read another run's
files. `unit_errors` counts units that did not finish (one line a unit since D465), so `== 0` means every unit
finished; `atlas.unitsShort` is "every planned unit finished", min(16, listed) x (8 + 2) distinct ok units a
spine. `engine_errors` counts branch rows with `engineError` (a Java Error, or a branch the step clock ended
inside a step); J158's pauper5 reached 241 in 6,065 branches before the fix, so the 500 abort stops a night
whose loop has come back, while the checks bound the rest: pauper5's timeouts under 1% of its branch games
(144 of ~14,400), and engine errors other than step-clock timeouts at 50. No abort reads the timeouts alone: a
pauper5 that fails its 1% check still leaves the other three spines' labels worth playing.
`atlas.problems == 0` covers branch errors and unavailable options past the 0.1 share (D466, D470), G6's `zeroX`
(D471) and unreadable frame logs; `atlas.zeroX` and `atlas.unavailableOptionsOverBar` are checked by name too,
so the summary can say which fired. `unavailable` and `atlas.branchUnavailable` below the bar are reported.

## Report
collect: /home/justin-a/code/lab/data/lab-j162/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j162/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j162/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j162/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j162/report/labels-head.jsonl
collect: /home/justin-a/code/lab/data/lab-j162/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j162/report/j158-reads.json
collect: /home/justin-a/code/lab/data/lab-j162/report/j158-labels.json
collect: /home/justin-a/code/lab/data/lab-j162/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j162/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j162/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The policy, first line:** these labels are on the D470 + D471 (with #195) + D472 tool and random policy
  (f6dba5e4), never pooled with J156's, J157's or J158's; J158's numbers appear in their own column.
- **Labels per night** (`labels.json` (c), `c_sizing7`): labels and confident labels per spine, per 10-h night
  at the measured workers and per 7-worker 10-h night, by pair and as run, beside J158's measured ff5 130 / 32
  and peasant7 106 / 13 and the J156 prior (ff5 80 / 30, peasant7 158 / 36 at 7); what 1,000 labels and 1,000
  confident labels take at each pair's rate, at this run's mix, and at the six measured spines' mix (a cost
  read only). This is the number the 7-8 nights wait for.
- **The tool, at scale** (`tool.json`): pauper5's branch timeouts against its 1% check and J158's 4.0% (by
  decision); every spine's timeouts and in-step timeouts; D470's unavailable branch games by reason and by
  option, every option named with its count against its branches; branch errors by kind (D472's kind named if
  any); G6's `xDrawn` / `zeroXLeftOut` / `zeroX` per pair; the void count (0 expected) and any
  `sameGameNotBlock` decision.
- **(a)** labels and confident labels per pair and per kind, with the confident share's interval (pooled, by
  pair, by kind, over Q), `confidentForge` beside.
- **(b)** median gap, mean regret, settled share by pair, beside J158's (ff5 4.75 points, peasant7 8.25) and
  J156's (ff5 9.75, peasant7 6.0) in their own columns.
- **(i)-(iii)** as `reads.json` gives them, pooled and by pair, with `j158-reads.json` beside, never pooled.
- **(iv)** C1 per pair, **HOLDS** or **NOT SHOWN** by the registered rule, with the Forge map beside; ff5 462
  beside J158's 461 (+4.3 [1.0, 7.6]), J156's (+8.3 [4.2, 13.3]) and J148's (+1.3); C2 as information.
- **(v)** the guardrail, G5 and G6 counts and `payfail`.
- **Per spine,** one line: the baseline (turns, winner), decisions listed and branched, labels, confident,
  void, decided / Q, same best, mean rho, branch errors, timeouts, unavailable, wall time.
- **The checks,** with any exit in `exits.txt` and anything in `missing.txt` explained.
- **The intervals' coarseness:** four pairs, one spine each, so every per-pair interval is decision-level only;
  say so beside each.
- **The label set:** where `labels.jsonl` is, its row count, that rung 4's files are kept, and the open point
  that these are confirm-set pairs (J158's *For rung 4*).
- **No verdict** beyond (iv)'s: any other surprise is a candidate until a fresh seed and a second pair show it.

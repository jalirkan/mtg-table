## D489 — The move atlas's futility stop: a decision whose option 0 leads or ties at the first checkpoint stops there, as a partial label, with a seeded tenth played on as the rule's control (amends D480)

*Branch `pc/d489-futility`, on origin/main `6e87e5d4` (#217, D488, merged). The lane was handed D489. Amends **D480**
point 2 (early stopping: what a checkpoint can decide) and its record (`phaseB/schedule.jsonl`, the plan hash).*

**2026-10-27**

**Context.** The atlas review of 2026-10-27 (`pc-results/study/atlas-review-2026-10-27.md`, sections 1, 2 and 5;
`report/futility.md`) read 29 spines, 222 complete decisions and 64 confident labels. One predictor stands out: **option
0's regret after 50 random branches.** Where Forge's own option (o0) leads or ties at 50, 3 of 77 decisions end confident
(.04). Where it trails by .10 or more, 39 of 50 do. Two thirds of branch time goes to decisions that end without a
confident label. The review's recommendation #2 is to end a decision at 50 when o0 leads or ties: +17% confident labels a
night alone, and +39% with the 150 cap (#1, a flag change). It also asks for two safeguards against selection bias: keep
the cheap partial labels in the label file, and play a random sample of the stopped decisions to the full length.

**Decision.** Three flags on `tools/cubelab.sh atlas`. All are off by default, so a D480-shaped job runs unchanged: the
same units, events, plan.json and plan hash.

1. **`--futility i`** (`off` or a checkpoint index; default off). At `--early-stop`'s `i`-th checkpoint (0 is the first: 50
   under `on`), the schedule reads every decision that reaches it (`atlascuts.ts` `futileAt`, at `:236`, called from
   `AtlasSchedule.checkpoint`, `tools/cubelab/atlascuts.ts:461-476`):
   - the paired rows below the checkpoint, over the options still running (as early stopping reads them);
   - each option's mean, and the best (the highest mean; the first on a tie, as early stopping's leader);
   - the **gap**, the best's mean minus option 0's (never below zero).

   The decision is **futile** when the gap is at most `--futility-tie` (the comparison `gap <= tie + 1e-12`,
   `atlascuts.ts:244`). A futile decision is **stopped**, unless it is a control (point 3):
   - no more random branches of any option and no Forge map;
   - no `stop` line at that checkpoint;
   - no replacement: the decision keeps its place among `--decisions` with a partial label.

   The schedule moves on to the other decisions. A decision with no paired row is no evidence and is never futile.
   `checkCuts` refuses an index that names no `--early-stop` checkpoint, so the rule always sits on an existing barrier
   and adds no stage. It is read after the screen, when the screen shares the checkpoint, and before early stopping.
2. **`--futility-tie t`** (default **0**: option 0 leads or ties exactly). Why 0 and not .02 or .04, from
   `report/futility.md`'s rows at N = 50:

   | margin | stopped (all 29) | confident kept (of 65) | gain alone / with the cap | D486 seat (13 spines, out of sample): kept of 28, gain alone / with cap |
   |---|---|---|---|---|
   | **0 (leads/ties)** | 77 | **62** | +17% / +39% | **27**, +15% / +35% |
   | < .02 | 89 | 59 | +22% / +43% | 25, +14% / +37% |
   | < .04 | 107 | 57 | +27% / +47% | 24, +20% / +41% |

   - **The larger out-of-sample seat does not pay for the margin.** On D486's 13 spines, .02 gains nothing alone (+14%
     against +15%) and costs two more labels.
   - **The fitted seat does not pay for it either.** On the old seat, .02 buys six points for one more label.
   - **D488's three spines favour .02** (+28% against +1% alone), but that is 24 decisions and 9 labels.
   - **The fixture agrees.** On D480's fixture (J158's and J162's six primary spines, another seat and another night;
     below), 0 stops 37 decisions and loses 1 label of 13, .02 stops 42 and loses 2, and .04 stops 50 and loses 4.
   - **The review's recommended row is 0** and asks for the rule to be pre-registered. A margin is a registered arm for a
     later night (`--futility-tie 0.02`), never adopted from this data.
3. **`--futility-sample s`** (default **0.1**). A futile decision is a **control** when its draw is below `s`: the
   decision is played to the full n as if the rule were off, and marked. The draw is uniform on [0, 1), from the atlas seed,
   the decision and the checkpoint (`futilityDraw`: `rng(seed * 1013 + d * 7919 + at, 'atlas/futility')`, a stream of its
   own). It is fixed before any branch is played and does not depend on the rows, so the controls are a simple random
   sample of the futile decisions. The controls measure what the rule costs: the controls' confident labels, weighted by
   `1 / s`, estimate the labels lost.

   A control is the right counterfactual: it is the decision as it would have run with the rule off. It still obeys early
   stopping, both at the futility checkpoint and at the later ones, since the futility read comes first and a control
   then goes on to the ordinary early-stop verdict.

   **One night is too few controls.** At share .1, a 13-spine night has about 3.5 controls (the J171 replay: 35 futile, 6
   drawn). At the review's .04 rate that is about 0.14 confident labels expected, so one night's controls show nothing.
   The controls are **pooled across nights**, or the first nights raise `--futility-sample` to .25.

   **Controls also move the confident share.** A control counts as an ordinary complete label, so a night with controls has
   a higher confident share than one without, for that reason alone. The number that compares across nights is
   **confident labels per branch worker-hour** (or the controls weighted by `1 / s`), never the share.

**The record.**
- **`phaseB/schedule.jsonl`.** Every read is a `futility` line: `d`, `at`, `alive`, `tie`, `sample`, `o0Mean`, `best`,
  `bestMean`, `gap`, `futile`, `draw`, `control` and `stopped`. A resumed atlas replays it and never reads a checkpoint
  twice. A checkpoint whose units were all done but whose line was not written is read then. A stopped decision's later
  units are never released, as a screened decision's are not.
- **The plan.** The rule's settings are `cuts.futility` (`{at, tie, sample}`) in plan.json and in the schedule header's
  plan, so a resume with another `--futility`, `--futility-tie` or `--futility-sample` is refused by both checks. With the
  rule off, neither has the key, and a D480 schedule's plan hash is unchanged.
- **The flags in a report.** `--phase report` on a folder reads its own rule, as it reads its cuts.

**The label rows** (`atlas.json` `phaseB.decisions[]`; a lab job's `labels.py` copies them into its label file, so this is
what the next job's readers follow):

| field | on | meaning |
|---|---|---|
| `futilityGap` | every decision the rule read | option 0's gap to the best mean at the checkpoint (the review's `regret50`) |
| `partial: true` | a stopped decision | its numbers (every option's `random` stat, the regret and its interval) are at the checkpoint's n |
| `stoppedAt` | a stopped decision | the checkpoint's random-branch count (50); the option-level `stoppedAt` is still early stopping's |
| `stopWhy: "futile"` | a stopped decision | why it stopped |
| `futilityControl: true` | a control | the rule would have stopped it; it ran to the full n and is otherwise an ordinary decision |
| `complete` | — | **false** on a stopped decision, so a reader's confident test (`complete` and `random.regretLo > 0`, J172's and the review's) never counts it |
| `why` | — | unchanged: the pick's `spread`, `fill` or `replaces` |

**What readers should know.**
- **A partial row is never confident.** It carries `partial`, `stoppedAt`, `stopWhy` and `futilityGap`, and
  `futilityControl` is absent. A control row carries `futilityControl` and `futilityGap`.
- **`phaseB.schedule.labels` is unchanged.** It still counts `complete` rows only, so it leaves out screened rows (as
  under D480) and partial rows. The partial rows are counted separately in `partialLabels`.
- **`branchedInFull` changed.** It was `picked − screened` (`atlas.ts:958`). It now also leaves out the decisions the
  futility rule stopped (`picked − screened − futileStopped`), and atlas.md says how many those were. This is a one-line
  code change, tested in the cuts test. With the rule off, the value is what it was. A job's completeness check that
  reads `branchedInFull` (D480's *Completeness*) therefore counts only decisions that ran to the full n, controls
  included.

The brief named the field `why: "futile"`. It is `stopWhy`, because `why` already carries the pick's reason on every
decision, and J172's label rows copy it (`"why":"spread"`). A reader that drops partial labels filters on `partial`; one
that keeps them as cheap labels reads them like a screened decision's (D480 point 3).

**The counters** (`phaseB.schedule`, written when a cut is on, with the rule on):
- `futility`: each read's `d`, `at`, `gap`, `futile`, `control` and `stopped`;
- `futileStopped`, `futileControls` and `partialLabels`;
- `futileBranchGamesSaved`: the stopped decisions' later random stages and Forge map, each with every option that was
  running at the checkpoint. This is an upper bound when early stopping is on, since some of those options would have
  stopped later.

atlas.md says what the rule did, and marks each partial label and each control.

**Rejected.**
- **Replacing a futile decision, as the screen replaces a settled one.** A screened decision is a lost or won position
  with nothing to label. A futile one is labelled, partially, and that label is evidence about Forge's own pick. A
  replacement chain would stretch every spine by an amount the review never measured.

  **The saved time is realised only if the job schedules more work.** A futile decision is not replaced. At a fixed 13
  spines × `--decisions 8`, the night simply ends about 15% earlier, with the same number of complete labels less those
  the rule stopped. The review's +17% and +39% are rates per branch worker-hour, not per night. To turn the rate into
  labels, the next job raises `--decisions` (or the spine count) so that a spine's wall stays near 45 minutes.
- **`why: "futile"`.** It would overwrite the pick's reason on the label row (above).
- **A checkpoint by branch count** (`--futility 50`). The rule needs early stopping's barrier. An index into
  `--early-stop` cannot name a count that is not a checkpoint.
- **Stopping without controls.** All four of the review's "where to look" cuts tilt the label set toward "Forge was wrong,
  late, with many options", and only a full-length sample of the stopped decisions measures what this one costs.
- **Defaulting it on.** As with D480's cuts, the job turns it on (`--futility 0`), so an old job's command still means
  what it did.

**Tests.** `web/test/cubelab-atlas-cuts.test.ts`, 17 tests (5 new):
- **The rule.** Option 0 leads (futile), ties exactly (futile at 0), trails by .05 (futile only with a .05 margin, not at
  0 or .02), or trails far (never). Option 0 is found wherever its column sits, and no row means not futile. The flags
  and `checkCuts`' refusals are covered: an index past the checkpoints, and the rule with early stopping off.
- **The control draw.** The same seed, decision and checkpoint give the same draw, and another decision or seed gives
  another. At shares .1, .25 and .5 and three seeds, the count of controls over 1,000 decisions is within four standard
  deviations of the share.
- **The schedule.** Three decisions: o0 always wins, o0 never wins, and o0 wins half against options that never do.
  - The two futile decisions play their first stage only. They get no later random unit, no Forge map and no `stop`
    line, and the third runs to the full n.
  - The labels: `partial`, `stoppedAt: 4`, `stopWhy: 'futile'`, `complete: false`, the pick's `why` kept, and `futilityGap`.
  - The counters: 2 stopped, 0 controls, 36 games saved.
  - With share 1 both are controls, run to the full n and are marked. With the rule off there is no line and no counter.
  - A resume decides nothing again and releases no stopped decision's unit. A crash before the futility line is read on
    resume, and that decision has nothing left to play.
- **The plan hash.** It changes with the rule, its margin and its share. With the rule off the cuts are D480's key for
  key, a resume under another rule is refused, and the same rule resumes.
- **The review's fixture.** D480's six primary spines are replayed through `AtlasSchedule` with design B's cuts plus the
  rule at 50 (controls off). The rule stops **37 of the 90**, loses **1 of the 13** confident labels and flips no other.
  The share of their branch rows not played goes from **32.4% to 55.5%**.

**Measured.**
- **The s06 replay** (`node docs/evidence/d489-futility-replay.mjs /home/justin-a/code/lab/data/lab-j170/b-s06-peasant-2106`;
  J171's spine, the D486 seat, read only). The script hands the spine's own `schedule.jsonl` to `AtlasSchedule` as a
  resumed atlas's, with every unit done. Every recorded verdict is replayed, and the script refuses to go on if any other
  verdict is re-decided. Only the futility read is new. The spine: 23 listed, 14 picked, 6 screened, 8 read at 50.

  | d | turn | kind | k | o0 mean | best (mean) | gap | futile | as-run regret [lo] | confident as run | saved games |
  |---|---|---|---|---|---|---|---|---|---|---|
  | d2 | 5 | p | 5 | .78 | o2 (.94) | .16 | no | .195 [.14] | yes | 0 |
  | d10 | 13 | p | 7 | .74 | o6 (.84) | .10 | no | .205 [.125] | yes | 0 |
  | d12 | 15 | p | 6 | .74 | o3 (.80) | .06 | no | .035 [0] | no | 0 |
  | d15 | 17 | p | 5 | .72 | o1 (.88) | .16 | no | .10 [.035] | yes | 0 |
  | **d17** | 19 | p | 8 | .94 | o0 (.94) | 0 | **yes** | 0 [0] | no | 250 |
  | d14 | 15 | p | 6 | .84 | o5 (.92) | .08 | no | .12 [.06] | yes | 0 |
  | **d16** | 17 | a | 4 | .92 | o0 (.92) | 0 | **yes** | 0 [0] | no | 150 |
  | **d3** | 7 | p | 6 | .98 | o0 (.98) | 0 | **yes** | 0 [0] | no | 200 |

  - The rule would have stopped **d3, d16 and d17**, none confident as run. All four of the spine's confident labels (d2,
    d10, d14, d15) are kept.
  - It saves **600 of 6,525 branch games (9.2%)**, or 0.42 of 6.08 branch hours (7.0%).
  - None of the three draws under .1, so there would have been no control.
- **The same replay on all 13 of J171's spines** (`lab-j170/b-s01` … `b-s13`):
  - 101 decisions read and **35 futile**, which is the review's D486 row at N = 50, leads/ties, exactly (35 stopped).
  - **1 of the 28 confident labels lost** (s11 d3), the review's 27 of 28.
  - At share .1, 6 of the 35 would have been controls (s03 d19, s07 d3 and d5, s08 d13, s12 d0 and d5).
  - **Saved, the rule's ceiling (no controls):** 13,240 of 71,940 branch games (18.4%), 8.92 of 54.05 branch hours
    (16.5%).
  - **Saved at share .1** (the six controls play on): 11,510 games (16.0%), 7.83 branch hours (14.5%).
- **`tools/cubelab.sh atlas-selftest --jobs 2`** (`CUBELAB_HOME_ROOT=var/d489-homes`, beside J173 on the CPU). Every
  cuts leg now carries `--futility 0`, and there is a third leg, `cuts-futile`. It is the first leg's spine (pauper5, seed
  464) at `--futility-sample 0` where the first runs at .5, so the engine runs both paths: at seed 464, d31 has option 0
  leading at 4 branches with a draw of .38. Each leg must have:
  - a futility read for every decision past the screen;
  - for a stopped decision, no branch past the checkpoint, no Forge branch, and a partial label;
  - for a control, branches past the checkpoint and the mark;
  - the four counters, and `futileStopped` equal to the partial labels' count.

  The first leg must also show a control, and the third a stop.

  **OK, about 5 minutes.**
  - `cuts`: d31 futile (gap 0) and a control, played to 6 branches and a Forge map, `futilityControl: true`, complete. d2
    is not futile (gap .25). 72 branch games.
  - `cuts-futile`: d31 stopped at 4 (`partial: true`, `stoppedAt: 4`, `stopWhy: "futile"`, `complete: false`, 4 random
    branches, no Forge branch), and d2 the same as in `cuts`. 48 branch games: the 24 saved are exactly
    `futileBranchGamesSaved` (6 options × (2 random + 2 Forge)).
  - `cuts-noforge`: d18 read at the screen's checkpoint (2) and not futile (gap 1).
  - Every leg's checks are clean, and plan.json's `cuts.futility` is `{at: 0, tie: 0, sample: …}`.
- **The gate:** `rm -rf bridge/out && ./tools/make-forge-home.sh && FORGE_JAR=… WSPORT=9900 GATE_JOBS=2
  ./tools/check-all.sh` on this tree: **OK, 60 of 60 jobs**, 954.5 s wall (load average up to 14.8, J173 on the CPU).
  13c-node: 1,880 tests, 1,869 pass, 11 skipped, 0 fail. A first run stopped at 12e-decks only because the new worktree had
  no `var/cards` (the card index). It was linked from the main checkout, never committed.

**Follow-ups.**
- **The next night's job** turns the rule on beside the 150 cap: `--branch-random 150 --early-stop 50,100 --futility 0`.
  It raises `--decisions` (or the spine count) so the saved time is spent (*Rejected*, first item). Its label reader
  carries `partial`, `stopWhy`, `futilityControl` and `futilityGap` into the label rows. Its morning read reports
  confident labels per branch worker-hour. It adds the night's controls to the pooled count, and reads their confident
  share against the review's .04 only once the pool is large enough to show it.
- **The k=3 and early-turn arms** (the review's #3 and #4) remain registered arms, not defaults.

## D480 — The move atlas's cut design: parallel checks, early stopping per option, the 25-branch screen, decisions by option count, the Forge map per spine (amends D451)

*Branch `pc/atlas-cut-design`, on origin/main `ce42306a` (#206, D479's follow-ups, merged). `node tools/decisions.mjs next`
gave D480. Amends **D451** point 5 (phase B: which decisions, how many branches of each option, the units) and point 7 (the
arithmetic: an option's n), and the post-spine checks of point 6 (how they run, not what they check).*

**2026-10-24**

**Context.** The atlas review of 2026-10-24 (`pc-results/study/atlas-review-2026-10-24.md`, sections 2, 3 and 5) costed
J158's and J162's six primary spines and re-scored their branch rows under smaller designs. It found four cuts that lose
no confident label on that data, and named them design B:
- **The checks are serial.** After each spine, the rows check and the redaction check (`node tools/check-redaction.mjs`, 100
  logs a call, one call after another) run on one core while the workers sit idle. That is about 19% of each spine's wall,
  ~1.7 reserved worker-hours a spine (2a).
- **Early stopping per option** (3b). With checkpoints at 50, 100 and 150 random branches, stop an option whose paired
  bootstrap interval against the leader lies entirely below it, and never stop option 0. On the 90 primary decisions this
  saves 12.0% of branch time, or 15.3% with the Forge map only on the options still running, with 90 of 90 confident
  flags unchanged.
- **The 25-branch screen** (3d). After 25 random branches, a decision whose mean value is <= .04 or >= .96 is settled.
  That is 17 of the 90, 8% of branch time, and none of them confident. The review recommends replacing such a decision
  rather than skipping it.
- **The option count** (1c). A decision with 7–8 options gives a confident label at 4× the rate per worker-hour of a
  2-option decision. With B's cuts, k >= 3 selection goes from 0.32 to 0.42 confident per branch worker-hour.
- **The Forge map** is the agreement study's instrument, not the label's (3c). It costs ~13% of every night, and a
  spine without it is possible today (`--branch-forge 0`), but the reads assumed it.

Together, B's cuts replayed on 229 decisions kept 13 of 13 primary confident labels with no status flip, and saved 18% of
branch time and 16% of wall overhead.

**Decision.** Five flags on `tools/cubelab.sh atlas`. Each defaults to today's behaviour, so a J158- or J162-shaped job
runs unchanged: no `schedule.jsonl`, the plan's keys as they were, the same units in the same order and the same
atlas.json values. atlas.json gains two keys on every decision, `decided` and `settled` (point 5).

1. **`--checks-parallel n`** (default 1). The checks run as they always have, through one function. The rows files'
   shape is checked in the main thread. The rows' id checks (each game's ids against its seat's own frame log) and the
   guardrail pass (every random seat's log read back; every Forge seat's for D465's pay cap) go to `n` worker threads, in
   contiguous slices of the serial order (`atlaschecks.ts`, `atlaschecks-worker.ts`). Each slice has its own frame-log
   reader. The redaction batches run `n` at a time (`censusplay.ts` `redactionCheckParallel`). The parts are put back in
   the serial order:
   - the 200-problem cap is applied game by game as the serial walk applies it;
   - the first 50 named guardrail violations are the first 50 in order;
   - the unreadable logs are the union.

   So atlas.json's `checks` are the serial run's byte for byte, except `redactionMs`, which is wall time. Overlapping the
   checks with the next spine's branching was not built: it would cross commands (a spine is a command), and the parallel
   checks recover the idle workers either way.
2. **`--early-stop on`** (50/100/150; or a comma list of chunk boundaries below `--branch-random`). After each
   checkpoint, the running options' paired rows below it are bootstrapped together (`--boot` resamples, a seed per
   decision and checkpoint). The leader is the running option with the highest mean. An option stops when the 2.5% point
   of (leader − option) is above zero. Option 0, Forge's answer, never stops, and neither does the leader.
   - The units after a checkpoint carry the options still running: the job's `atlas.options`, which becomes
     `Atlas.Unit.options` in the bridge, and the hook skips the rest. The Forge map's 40 branches go out after the last
     checkpoint, on those options only.
   - **An option's n changes; its estimator does not.** A stopped option's mean is over its own branches. A branch index
     is a paired row when every option still running there has a score, so a stopped option's empty cell does not unpair
     the row. The regret's bootstrap resamples the same rows as an uncut run and takes each option's mean over the rows it
     has. With no stop this is D451's arithmetic, bit for bit. The Forge map's regret, and the agreement (rank correlation,
     same best), are over the options the Forge map played. Each stopped option says `stoppedAt` in atlas.json.
3. **`--screen n`** (the review's 25). After `n` random branches of every option, a decision's mean value is the mean of
   its options' means over the paired rows. A decision whose mean value is <= .04 or >= .96 is settled. It keeps those
   `n` branches as a cheap label (`screened: true`, `settled: true`, never `complete`) and gets no Forge map. The next
   listed decision not yet branched takes its place: forward from it, then back, among those with `--min-options` or more
   options first. That holds the spine's count of decisions branched in full at `--decisions`.
   - The rule is the review's validated one: the mean over the options. "Every option <= .05 or >= .95" was the review's
     stricter row, with 14 skipped instead of 17.
4. **`--min-options k`** (default 1). `--decisions` are spread (D451's `spread`) over the listed decisions with `k` or
   more options. When fewer than that many have `k`, all of them are taken, and the rest are spread over the others.
   Each pick's `k` and why (`spread`, `fill`, `replaces`) are recorded.
5. **The Forge map per spine.** `--branch-forge` was already a per-command flag, and a spine is a command. Verified: a
   job can pass 40 on one spine and 0 on the next, and the plan's resume check does not hold it. What changes is the reads
   on a spine with 0 (`forgeMap: false`):
   - a decision is `complete` on its random map alone;
   - `decided` (every option's mean >= .95 under each map the spine has) and `settled` (that, or every option <= .05)
     read the random map alone. Both are new on every decision, with J158's reader definitions;
   - the agreement block is empty, with no decisions and `forgeMap: false`, and there is no disagreement list;
   - atlas.md says why.

   On a spine with a Forge map, nothing changes.

**How it runs.** A checkpoint is a chunk boundary (`--chunk` must divide it, and `checkCuts` refuses otherwise). Phase B's
units go out stage by stage (`atlascuts.ts` `AtlasSchedule`; `atlas.ts` `runUnits`):
- **The barrier.** A decision's next units wait until every unit of its current stage has written its `units.jsonl` line.
  A unit given up after D465's attempts counts too.
- **The pool.** Under barriers the pool keeps an idle worker alive instead of quitting (`PoolHooks.holdIdle`). It wakes
  idle workers and starts parked slots when an answer queues more work. A slot the first stage did not need waits parked.
- **The record.** Every verdict is a line of `phaseB/schedule.jsonl`, written when it is made: a pick (its `k` and why), a
  screen (its mean value), a stop (the leader, the options dropped, each option's bootstrap low end).
  - A resumed atlas replays the file. A checkpoint with a line is never decided again, so a unit re-run after a crash plays
    the options its stage had. A checkpoint whose units were all done but whose line was not written is decided then.
  - The plan records `cuts`, and a resume with other cuts is refused.
- **The summary.** `phaseB.schedule` in atlas.json (and a section of atlas.md) says what the cuts did on the spine.

**What this changes in the maps and the labels.**
- **Early stopping** changes an option's n, not its estimator. A stopped option's interval is wider, and the regret's
  bootstrap sees its shorter mean. On the review's data no confident flag moves (below). The Forge map's regret and the
  agreement are over the options still running, so (i) and (ii) on a cut spine are about the options that were not
  clearly worse.
- **The screen** changes which decisions are branched in full. A screened decision is a label of its own kind (cheap,
  not complete), and the decision that replaced it is a later one in the listing.
- **`--min-options`** changes the label population: most 2-option attack-or-not and cast-or-pass decisions leave. The
  review counts two of the 13 current confident labels among them (modern7 d13 and ff5 461 d8).
- **None of these is pooled with earlier nights** except through the unchanged definitions of (i)–(iii) on complete
  decisions, read per spine.
- **`--checks-parallel`** changes nothing in the maps.

**Validation: the review's numbers on its own data** (`fixtures/cubelab/atlas-cuts/primary-six.json.gz`).
- The fixture is the branch scores of J158's ff5-461 and peasant7-463 and J162's pauper5-464, synergy9-465, modern7-466
  and ff5-462, trimmed to a character per option and branch, with scores as written (before D478). It has the atlas's own
  regret interval beside each decision. It is 11 KB.
- `web/test/cubelab-atlas-cuts.test.ts` replays the cuts through `AtlasSchedule` and `decisionAtlas` themselves. Branch
  i of every option has one seed, so a cut run's rows are a subset of the uncut run's.

| | this branch | the review |
|---|---|---|
| the atlas's regret, interval and confident flag reproduced | **96 of 96** decisions | 230 of 230 (its own bootstrap) |
| decisions with >= 150 paired random branches | 90 | 90 |
| confident at 200 | 13 | 13 |
| **screen (25, .04/.96) + early stopping (50/100/150, o0 kept, Forge on survivors)** | **13 of 13 kept, 0 flips**; 17 screened, none confident; 63 options stopped, never o0 | 13 of 13, 0 flips |
| ... branch time saved (each branch's own `ms`, the lab rows) | 20.3% of the 90 (19.2% of all 96) | 18% |
| early stopping alone | 13 of 13, 0 flips; 76 options stopped; 14.3% of branch time | 90/90 same status; 15.3% |
| the screen alone | 17 screened, none confident; 7.7% of branch time | 17 skipped, 0 lost; 8% |
| `confidentForge` changed (the Forge map on survivors) | 1 of 90 | not counted |

The time saved is before replacement: the review counts a screened decision's budget as spent again on the next listed
decision, which is what `--screen` does. The early-stop counts differ a little from the review's (63 or 76 options against
its rule's own) because the bootstrap seeds differ (`stopSeed`, sfc32, against numpy's). The label arithmetic is this
repo's, and it keeps every flag.

**Rejected.**
- **Dropping a stopped option from the label**, as the review's simulation scored it (a regret over the surviving columns
  only). The option was played and its branches are evidence. Keeping it at its own n is the honest reading, and on this
  data it changes no flag.
- **A Wilson rule, unpaired** (the review's W50). The paired test drops 3–6× as much because branch i shares its seed.
- **Overlapping the checks with the next spine's branching.** A spine is one command, so it needs a runner that holds two
  spines at once. The parallel checks take back the same idle workers inside the command.
- **Recomputing a checkpoint on resume.** A unit given up and re-run would then see a subset different from its stage's.
  The schedule's events are authoritative.
- **Making `--early-stop` a bare switch.** The CLI's flags all take a value (`cli.ts`), so `on` means the review's 50/100/150.

**Tests.**
- `web/test/cubelab-atlas-cuts.test.ts` (10 tests):
  - `--min-options`' pick, which is `spread` itself at k = 1;
  - the screen's rule and its replacement;
  - the early-stop rule (option 0 and the leader never stop; a close option runs on);
  - the schedule with every cut off (D451's units, no event);
  - the cut schedule stage by stage, its labels and its resume (one checkpoint decided again, nothing else);
  - the no-Forge-map reads;
  - the review's numbers above;
  - the guardrails of slices merged;
  - `--checks-parallel` byte for byte on a folder of 234 logs, three batches, mixed pass and fail, a truncated log, 300
    id problems past the cap and 96 violations past the 50 named;
  - the pool behind the barrier with a fake worker: the last stage on both workers, the jobs carrying the options.
- The existing atlas tests pass unchanged: `cubelab-atlas.test.ts`, `cubelab-atlas-resume.test.ts` and
  `cubelab-atlas-redaction.test.ts`.
- `tools/cubelab.sh atlas-selftest`. Its legs are unchanged with the flags off. Then:
  - the main folder is reported again with `--checks-parallel 2`, and its checks must equal the serial run's;
  - a cuts leg runs two short spines of the self-test pair with all five on (`--min-options 3 --screen 2 --early-stop 4
    --checks-parallel 2`, one spine with `--branch-forge 2` and one with 0). Each spine's schedule is held against its
    rows and units.

**Measured.**
- `./bridge/build.sh`: OK (the lint and its self-test, javac, every self-test; `DecisionSelfTest` 176 checks).
- `./tools/ai-bench.sh --selftest`: 176 checks, 0 failures. A new scenario, *an atlas unit plays its option subset
  (D480, engine)*: three candidates (pass, a Bolt, Forge's answer), two branches each, through `Atlas.Hook` itself. With
  `options` {0, 2} it plays 4 branches over options 0 and 2; with no subset (the control) it plays 6 over all three. This
  is the engine half of early stopping that no self-test spine is sure to reach, since a drop at 4 branches needs a
  lopsided decision.
- `npm --prefix web run test:node`: 1,853 tests, 1,843 pass, 10 skipped, 0 fail; `tsc --noEmit` clean.
- `tools/cubelab.sh atlas-selftest --jobs 1`: **OK**, 399 s. `--jobs 2`: **OK**, 368 s.
  - The main legs are as before (16 forks, 8 no-leak checks, 38 frame logs, 538 rows; G5 2 / 2; G6 10 / 63 / 0).
  - The checks on two workers equal the serial run's.
  - The cuts legs ran on pauper-900000005, seed 464. The spine with a Forge map branched 2 decisions in full (d2 with 3
    options, d31 with 6): 72 branch games. The spine with none branched 1 (d18): 12 games, complete on its random map,
    with no agreement read. At these branch counts nothing settled and nothing stopped.
  - The first run, on the self-test's own pair (pacho-shield against doom-legion, seed 4515), is why the legs moved to
    pauper5. Seat A lost every random branch of every decision. The screen settled each decision at 2 branches and
    replaced it with the next, 18 of 18 in turn (110 branch games), and both spines passed by the "every listed decision
    taken" rule. That run is the replacement chain end to end on the engine.
  - At `--jobs 2`, the spine with no Forge map started with one unit, and its second worker was started for the later
    stages (`holdIdle`).
- **Not measured: the barrier's tail at night scale.** Units that wait for a checkpoint can leave workers idle at the end of
  a spine. The review's wall estimate (overhead from 1.26 to ~1.06 × branch time) assumed none. The first cut night's
  `units.jsonl` and pool log will show it.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on this branch's code (only this line
  differs): **OK, 59 of 59 jobs**, 780.5 s wall (load average up to 33.4).

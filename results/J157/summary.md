# J157 — the move atlas, rung 2's vintage pair again on the fixed tool (D451, D466): summary

Written by the PC session, 2026-10-23, from `report/reads.json` and `report/reads-j156-vintage.json` (the job's own `reads.py`), the four `report/*.atlas.json`/`.atlas.md`, `exits.txt`, each spine's `phaseB/units.jsonl`, the `pilot-ff5` and `pilot-vintage7` folders, J156's four vintage atlases under `lab-j150/report`, results/J157 (STATUS, checks, metrics, pilot, run1–2 logs), the job file, results/J156/summary.md, D466 and D467 (PR #186, open).

**Method only.** D451 registers no rule on what the maps say, and J157 registered no verdict: (iv) belongs to the repeat pair, which this job does not play.

## The run
- **Posted** 08:16 and pinned to 9fe69ad8. **The pilot passed 22 of 22 checks at 08:23** (378 s):
  - the 37 node tests passed, the "two maps" test included;
  - `reads.py` reproduced J148's numbers and J156's vintage numbers exactly;
  - **the ff5 smoke** (seed 4600) logged G5 `refusedCast` **6** and `noRepeatRefused` **5** (J156's pilot: 5 and 0), so a refused card now comes back and G5 sees it;
  - **the vintage smoke** (seed 4601) had 60 rollouts, 2 decisions, 0 problems, 0 branch errors and 0 violations.
- **Workers.** 6 (memory-sized); peak worker RSS 1.62 GB; 4.1 GB on disk.
- **run1:** phase A 08:23–08:45, then spine 458 to 10:24, 459 to 11:04 and 460 to 11:39 (exit 0). **run2:** the report, exit 0 at 11:39:54. That is 3 h 23 min against ~5 h estimated.
- **Exits:** a-vintage7 0, 458 **3**, 459 0, 460 0. The 3 is the hang below.
- **One worker retired** after two OOMs at d16-random-75 (heap after GC 187 MB of 2,048). The resume finished the unit, so it is not a unit error.

**Why the runner says "failed": exactly the predicted unit.**
- **The unit.** 458's d9-random-150 hung on both attempts at branch **d9-random-o0-b165** (d9, an attack, option 0 `attack:17,19`, branch 165, random continuation), the same branch J156 hung on. The 30-min watchdog ended each attempt, and the unit stopped at 75 of 125 branches.
- **The cause** (D467, PR #186). Seat B's Ocelot Pride, copied each turn by Reflection of Kiki-Jiki, reaches 18 end-step triggers. Each one copies every token that entered that turn. The battlefield grew from **61 to 8,243 permanents in 30 min, all inside one `mainLoopStep`**, and the 120-s branch deadline was read only between steps. #186's step clock reads the deadline on the copy's event bus and ends the branch at its deadline as an engine error. **It is not in this run.**
- **The three failing checks are that one unit:**
  - `unit_errors` **1**. `units.jsonl` writes one line for the unit, carrying `attempts: 2`. The job file expected 2.
  - `atlas.unitsShort` **1**.
  - `atlas.problems` **2**, both on 458. One names the two truncated frame logs (`d9-random-o0-b165-seat0.jsonl.gz` and `-seat1.jsonl.gz`, "gzip: unexpected end of file"), skipped and named. The other is "1 unit(s) did not finish: d9-random-150: no answer in 1800 s (hung)".
- **This time 458's `atlas.json` was written and the reads ran.** No hand repair.

## What the fixes bought (against J156's vintage run)

| | J157 (9fe69ad8) | J156 (6fb13bf9) |
|---|---|---|
| 458 complete decisions | **16 of 16** | 9 of 16 |
| 458 branch errors | **265 of 16,990**: 245 NPE, 18 NPE (`paperCard` null), 2 OOM | 6,615: 6,480 `optional costs are not copied`, 133 NPE, 2 OOM |
| 460 branch errors | 23 (`No band for attacker` NPE) | 23 (the same) |
| options past the 0.1 error bar | 0 | (not checked) |
| G1 violations | **0** | 3,071 (printed as 200) |
| truncated logs | 2, named; atlas written | 2; the checks died |

The four atlases total 288 errored branches. None crosses `--branch-error-max`, so branch errors contribute nothing to `problems`.

## Phase A: 2,400 rollouts, both seats random, 0 engine errors
- **Outcomes.** Seat A scores **53.3% [51.3, 55.3]**: 1,276 / 1,118 / 6 draws (all 6 at the cap).
- **Length.** Mean 20.2 turns, median 19, 10th–90th 14–27.
- **Precision.** ±2 points needed 2,386 rollouts. The rate was 8,072 games/h.
- **J156's row exactly.** With no refusals on this pair, D466 point 4 never acted, and point 3 changes no choice.

## Per spine

| spine | baseline | listed | branched | decided / Q | same best (of Q) | mean ρ (n) |
|---|---|---|---|---|---|---|
| 458 | 11 turns, A | 18 | 16 | 2 / 14 | 3 | 0.145 (12) |
| 459 | 14, A | 17 | 16 | 6 / 10 | 4 | −0.113 (10) |
| 460 | 12, B | 11 | 11 | 0 / 11 | 4 | −0.106 (6) |

**459 and 460 reproduce J156 option by option** (n and mean, both maps). So do 458's nine decisions that J156 completed. All the change sits in the seven recovered decisions (458 d5, d7, d8, d10, d12, d14 and d15):
- all are priority decisions, all are in Q, and none has the same best;
- their ρ runs from −0.548 to +0.579.

## The reads
- **Intervals:** 95% bootstrap, spine then decision, over one pair and three spines. The spine level is coarse, and every interval below is wide for that reason.
- **Base:** 43 decisions, **43 complete, 8 decided, Q 35.**

**(i) Same best before decided:** **0.314 [0.154, 0.514]**, n 35.

**(ii) Mean ρ:** **−0.001 [−0.364, 0.306]** over 28 rankable decisions, 9 of them two-option. Over Q alone: −0.006 [−0.382, 0.300] (26).

**(iii) Regret at Forge's choice** (points, over Q):

| kind | n | random map | clear of 0 | Forge map | clear of 0 |
|---|---|---|---|---|---|
| priority | 29 | 1.3 [0.5, 2.6] | 1 | 1.5 [0.3, 3.3] | 0 |
| attack | 4 | 1.5 [0.0, 3.3] | 0 | 0.6 [0.0, 1.7] | 0 |
| block | 2 | 0.0 [0.0, 0.0] | 0 | 1.4 [0.0, 2.9] | 0 |

**(iv)** None: registered for the repeat pair only.

**(v) Guardrails** (four atlases):
- 60,700 logs;
- land offered = taken **191,647**;
- 4,800 hands kept of 4,800;
- violations **0** (G1 0, G4 0);
- G3 `noRepeatNoOp` 21,890;
- G5 `refusedCast` 0 / `noRepeatRefused` 0 (the vintage pair has no tax card);
- `payfail` 0; `forgePayCap` 0.

**(vi) Rung 3's sizing (vintage only):**

| | J157 | J156 vintage |
|---|---|---|
| options a decision | 3.26 | 3.26 |
| branch games a label | 781 | 781 |
| s a branch (random / Forge) | 1.15 / 0.87 | 1.20 / 0.73 |
| worker-s a label | 859 | 879 |
| labels a 7-worker hour | 29.3 | 28.7 |
| labels a 10-h night | 293 | 287 |
| Q's share | 0.814 | 0.778 |

- **Measured end to end:** 43 decisions in 2 h 54 min of phase B plus checks at 6 workers. That is ~15/h, ~17/h scaled to 7, with the hang's two 30-min windows inside it.
- **Branch rate:** 12,000/h on 458, 19,500 on 459, 14,300 on 460.

## Side by side with J156 (`vs_j156`)
These are two random policies (D466 point 4), **read side by side and never pooled**. J156's 458 was 9 of 16 complete.

| read | J157 | J156 |
|---|---|---|
| complete / decided / Q | 43 / 8 / 35 | 36 / 8 / 28 |
| (i) same best | 0.314 [0.154, 0.514] (35) | 0.393 [0.214, 0.583] (28) |
| (ii) ρ | −0.001 [−0.364, 0.306] (28) | −0.028 [−0.400, 0.412] (21) |
| (ii) ρ over Q | −0.006 [−0.382, 0.300] (26) | −0.039 [−0.429, 0.421] (19) |
| priority regret, random | 1.3 [0.5, 2.6] (29) | 1.5 [0.4, 2.9] (22) |
| priority regret, Forge | 1.5 [0.3, 3.3] (29) | 0.7 [0.2, 1.7] (22) |
| attack, block (both maps) | identical | — |
| land offered / taken | 191,647 / 191,647 | 176,843 / 173,772 |
| violations | 0 | 3,071 (200 printed) |

Same best fell from 11 of 28 to 11 of 35 because the seven recovered decisions all disagree. ρ and regret moved within their intervals.

**The vintage pair as an atlas subject: little information a label.**
- **Short games.** Forge-vs-Forge spines run 11–14 turns; random-vs-random runs 20.2 on average.
- **Settled decisions.** 8 of 43 are decided (won). 4 more on 460 (d7–d10) have every option ≤ 5 under both maps (lost) and sit in Q. So 12 of 43 are settled either way.
- **Close options.** The median gap between a decision's best and worst option on the random map is 1.5 points.
- **Small regrets.** 1–1.5 points against J156's ff5 8.9 and peasant 3.5.
- **For rung 3.** The design should weight this pair accordingly.

## Known gaps
- **One unit short.** All five options of 458's d9 rest on n 177 random and 36 Forge (as in J156). Two frame logs are left out of 458's checks.
- **The step clock (D467, #186, open) is not in this run.** With it, b165 would end at 120 s as an engine error, and the unit would finish.
- **The pair's low information**, above. Three spines make every interval coarse.
- **265 + 23 errored branches**, under the bar, dropped out of their options' means.
- **The 16-decision cap:** 43 of 46 listed decisions were branched.
- **Forge's map** rests on n 40 an option (36 at d9).
- **"Decided" means won only:** 4 lost decisions sit in Q.
- **The runner's record is "failed"** on that one unit. Everything else, the reads included, came from the job's own blocks.

## What it says
On the fixed tool, the vintage pair's spine 458 is complete, G1 is clean and the hung branch is named rather than fatal. Every number that could be compared reproduces J156, and the only change is seven recovered decisions. Before the game is decided, the two maps agree on the best move about a third of the time (0.31 [0.15, 0.51]) and do not correlate (ρ −0.001 [−0.36, 0.31]). Forge's choices cost about 1–1.5 points. This pair's short games and close options make it a low-information atlas subject.

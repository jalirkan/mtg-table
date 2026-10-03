# The engine review's week 1 — measured (D348–D351)

*2026-10-03, branch `c/engine-week1`, in the shared 4-core container. No engine
game was played beyond smoke size: the scale fit rebuilds recorded positions
and plays nothing; every smoke below stayed under 20 playouts in one JVM. The
review is the 2026-10-03 engine methodology review (H1, H2, H3, M1, M5); its
simulations are re-run here for the new rules (`engine-week1-sims.py`, numpy
and scipy).*

## 1. The leaf → P(win) scale (D349)

`./tools/coach-grade.sh fit-scale --logs <dirs>` rebuilt each turn's last state
of every recorded game it was given, from each seat's redacted log, scored it
with `SearchPolicy.leaf`, and fitted `P(the viewer wins) = σ(leaf / scale)` by
maximum likelihood, with a 200-resample bootstrap over games (both seats of a
game move together).

**Data: every recorded lab game in reach.** The cube lab's D315 recordings of
the Synergy cube (runs `bench-on-1`, `-2`, `-3` and `rec-test`, the gate's
`check-all-cubelab` game, two `bridge-rec` games of the matchup lane, and the
committed `fixtures/cubelab/recorded` game): 56 seat logs of 28 games; 6 logs
(3 games) ended with no winner and 2 were unreadable, leaving **24 games, 48
seat views, 888 end-of-turn positions**, none failing to rebuild.

| | value |
|---|---|
| **scale** (no intercept) | **502.8**, bootstrap 95% **[268, 1301]** |
| two-parameter fit | intercept −0.0002, slope 1/503 |
| log-loss at the fit / at 400 / a coin | 0.6126 / 0.6158 / 0.6931 |
| Brier at the fit / at 400 | 0.2158 / 0.2180 |

Reliability at the fitted scale:

| predicted | positions | mean predicted | observed |
|---|---|---|---|
| 0.0–0.1 | 23 | 0.062 | 0.000 |
| 0.1–0.2 | 49 | 0.152 | 0.122 |
| 0.2–0.3 | 47 | 0.246 | 0.234 |
| 0.3–0.4 | 88 | 0.358 | 0.432 |
| 0.4–0.5 | 233 | 0.454 | 0.511 |
| 0.5–0.6 | 241 | 0.545 | 0.490 |
| 0.6–0.7 | 88 | 0.642 | 0.568 |
| 0.7–0.8 | 47 | 0.754 | 0.766 |
| 0.8–0.9 | 49 | 0.848 | 0.878 |
| 0.9–1.0 | 23 | 0.938 | 1.000 |

**Shipped: 500** (`SearchPolicy.LEAF_SCALE`). Read it honestly: 24 games make
a wide interval, 400 is inside it, and the improvement in log-loss is small.
The point is that the number now has a fit and an interval behind it; the PC
refits it on the lab's nights (`fit-scale --logs var/cubelab/runs`, which the
live modes then pick up from `var/coach-grade/leaf-scale.json`). The middle
bins are flat (0.43–0.57 observed across 0.36–0.64 predicted): the hand leaf
separates clear positions and barely ranks close ones, which is the review's
case for the learned evaluator (H4).

A cross-check on the 22 committed `fixtures/games/` recordings (one seat per
game, a scripted seat against Forge on the gate's decks — another population)
fits 264 [112, 613] with an intercept of −0.59 (the scripted seat loses more);
it is not the coach's population and is not shipped.

## 2. Interval coverage, before and after (D349)

Paired leaf-mode differences, true difference 0.04, 20,000 replications per
row (`engine-week1-sims.py` §1). *Before*: D334's normal interval with the 1/n
floor; *after*: the sample sd floored at 0.02, Student's t with n − 1 df.

| paired sd | n | before: coverage | before: ± | after: coverage | after: ± |
|---|---|---|---|---|---|
| 0.03 | 2 | 100.0% | 0.981 | 100.0% | 0.262 |
| 0.03 | 4 | 100.0% | 0.491 | 98.9% | 0.047 |
| 0.03 | 6 | 100.0% | 0.328 | 96.8% | 0.031 |
| 0.03 | 12 | 100.0% | 0.164 | 95.5% | 0.019 |
| 0.06 | 2 | 100.0% | 0.983 | 100.0% | 0.451 |
| 0.06 | 4 | 100.0% | 0.493 | 95.6% | 0.088 |
| 0.06 | 6 | 100.0% | 0.330 | 95.2% | 0.060 |
| 0.06 | 12 | 100.0% | 0.167 | 95.0% | 0.037 |
| 0.12 | 4 | 100.0% | 0.504 | 94.7% | 0.176 |
| 0.12 | 6 | 100.0% | 0.340 | 95.0% | 0.119 |
| 0.12 | 12 | 100.0% | 0.177 | 95.0% | 0.075 |

With heavier tails (Student t, 3 df, same sd) the new interval covers 95.9–99%
at n ≥ 6. Before, every interval covered 100% because it was 5–10 times too
wide: the floor, not the data, set its width. `GradeSelfTest` repeats the
check on every build (4,000 replications a row, n = 4, 6, 12, sd 0.06 and
0.12: coverage 95.1–95.9%), and the review's acceptance case — n = 6, sd 0.03
— is ±0.031 there and ±0.038 in its deterministic table check (< 0.05).

## 3. Racing at live round counts (D349)

Five options, paired sd 0.06 plus a common round effect, CRN, racing at 99%
(`engine-week1-sims.py` §2, 3,000 decisions a row):

| case | settings | rule | options retired (of 4) | best retired | reported best is the true best |
|---|---|---|---|---|---|
| clear (0.60 vs 0.50 … 0.35) | 9 rounds, race from 6 every 3 (D336) | before | 0.02 | 0.0% | 100% |
| | | after | 3.91 | 0.0% | 100% |
| | 8 rounds, from 4 every 2 (now) | before | 0.00 | 0.0% | 100% |
| | | after | **3.84** | **0.0%** | 100% |
| close (0.55 vs 0.53 … 0.40) | 8 rounds, from 4 | after | 2.21 | 0.1% | 82.7% |
| flat (0.52 vs 0.51 … 0.49) | 8 rounds, from 4 | after | 0.30 | 0.5% | 56.0% |

Racing now retires clearly worse options at live budgets and almost never the
best; on close and flat decisions it keeps playing them, as it should. The
self-test's version: 3.8 of 4 retired per decision over 40 decisions, the best
never, and 0 under the old floor.

## 4. Smokes (one JVM, at most 20 playouts each)

- `bridge/build.sh`: green; `GradeSelfTest` 70 checks (39 before), the planted-leak
  test among them.
- `./tools/ai-bench.sh --selftest`: 42 checks; the new scenario runs the attack
  search with `aturns=1,override=lcb,z=1,margin=0,untapped=5,oracle=1`: 3
  rounds, 12 rollouts (all oracle), horizon 1, the report filled per candidate,
  Forge's lethal attack kept.
- `./tools/coach-grade.sh selftest`: 12 checks, 10 playouts; the 5-round
  horizon-1 attack grade now reads regret 0.10 [0.08, 0.13] for the worse option
  where the floor would have made it about ±0.4.
- `coach-grade.sh serve`, three requests on `human-trample-7.jsonl` frame 941:
  pool mode with a known pick (`ok`, 2 rounds, 4 playouts, leaf scale 500, `t,
  sample sd`); the opponent's deck list without the flag (`refused`); the same
  marked public with no reason (`refused`).
- Thirty-two decision moments of the committed fixtures checked with zero
  playouts (`--max-playouts 0`): 19 enumerate options (`ok`), 13 are single-option
  (`trivial`), none fail; twelve of them are the PC grader smoke's set.

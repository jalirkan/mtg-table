# The search AI — measured against Forge's Default AI (D312–D314)

*2026-10-03, branch `c/search-ai`. Every number comes from `tools/ai-bench.sh`
runs under `var/ai-bench/<run>/` (gitignored; one JSON line per game) and is
reproducible with the command beside it. The design is
[`docs/research/ai-architecture.md`](../research/ai-architecture.md) §8.*

## 0. Conditions — read before any time below

The container has **4 cores**, shared with other lanes; the 1-minute load ran
from about 2 to 6 during these runs (it had been far higher earlier in the
day, `ai-baseline.md` §0). Every run used `--jobs 2`. **Seconds per game are
wall-clock on this machine** and comparable only between runs that ran
back to back. The search budgets by wall clock, so on a slower or busier machine
it completes fewer rounds and falls back to Forge more often (the budget
fallback rate below is the measure of that) — it never waits longer than its
budget.

**Pairing.** Game g of a pair gets its seed from `--seed`, the pair and g, so a
control run (Default against Default) and a treatment run (the search against
Default) on the same `--pairs --seed --games` play the **same deals**. The deal
happens before any search runs, and the search restores Forge's random source
after every rollout, so the treatment cannot perturb its own deal.
`ai-bench.sh paired` matches the two runs deal by deal: the treatment's win
rate with its Wilson 95% interval, and the deals the change turned from a loss
into a win and back, with McNemar's exact two-sided p.

## 1. Pilots (choosing the horizon) — cube pairs, seed 11, 40 deals

`--pairs tools/ai-bench/pairs-cube.txt --games 4 --seed 11 --jobs 2`, A = the
config, B = `Default`; control A = `Default`.

| A | A wins | 95% CI | paired gained / lost | p | s/game | searched / game | changed | budget fallbacks | copier errors |
|---|---|---|---|---|---|---|---|---|---|
| `Default` (control) | 19 / 40 (47.5%) | 32.9–62.5% | — | — | 7.7 | — | — | — | — |
| `Default+search:turns=0` | 22 / 40 (55.0%) | 39.8–69.3% | 8 / 5 | 0.58 | 38.2 | 24.3 | 14.6% | 18.5% | 0 |
| `Default+search:turns=1` | 23 / 40 (57.5%) | 42.2–71.5% | 10 / 6 | 0.45 | 48.5 | 26.7 | 7.4% | 53.3% | 0 |

Both point the same way and neither is significant at 40 deals. A rollout to
the end of the next turn costs about three times one to the end of this turn
(≈180 ms against ≈68 ms of play, plus ≈8 ms to copy, on these decks), so at
1.5 s `turns=1` finishes its two rounds on fewer than half of its decisions and
hands the rest back to Forge. **`turns=0` is the default**; `turns=1` is for a
larger budget (`ms=3000` and up) on a faster machine.

## 2. The confirmation run — fresh deals, seed 21

Chosen before this run: `turns=0` and every other default (`ms=1500`, six
candidates, two rounds minimum, margin 20). New deals (seed 21, never used by
the pilots), 20 games of each of the ten cube pairs:

```bash
./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --games 20 --seed 21 --jobs 2 --run cube-control --a Default --b Default
./tools/ai-bench.sh play --pairs tools/ai-bench/pairs-cube.txt --games 20 --seed 21 --jobs 2 --run cube-search  --a Default+search --b Default
./tools/ai-bench.sh paired --control var/ai-bench/cube-control/shard-*.jsonl --treatment var/ai-bench/cube-search/shard-*.jsonl
```

| A (vs Default) | A wins of 200 | 95% CI | paired: gained / lost | exact p | s / game | mean turns |
|---|---|---|---|---|---|---|
| `Default` (control) | 94 (47.0%) | 40.2–53.9% | — | — | 7.4 | 18.8 |
| **`Default+search`** | **113 (56.5%)** | **49.6–63.2%** | **37 / 18** | **0.0145** | 44.3 | 18.0 |

**The search beats plain Default**: +9.5 points over the control on the same
deals (an unpaired 95% interval for the difference of about −0.3 to +19; the
paired test is the sharper one, p = 0.015 two-sided). No game hit the 300 s cap
and no engine error ended a game. Load was 1–3 throughout (control 10:47–11:00,
search 11:00–12:18).

By pair (A's wins of 20, treatment / control, and the deals gained / lost):

| focus pair | search | control | gained / lost |
|---|---|---|---|
| synergy-1003 | 11 | 10 | 3 / 2 |
| synergy-1004 | 13 | 8 | 8 / 3 |
| synergy-1006 | 9 | 10 | 1 / 2 |
| synergy-1009 | 9 | 10 | 3 / 4 |
| synergy-1011 | 10 | 7 | 4 / 1 |
| synergy-1014 | 14 | 9 | 5 / 0 |
| synergy-1018 | 9 | 8 | 2 / 1 |
| modern-3 | 17 | 12 | 6 / 1 |
| modern-3100 | 10 | 11 | 1 / 2 |
| modern-3101 | 11 | 9 | 4 / 2 |

Seven pairs gained, three lost one deal net; no pair moved against the search
by more than one deal.

**What it did.** 5,017 decisions searched (25 a game: 3,450 priorities, 1,167
attacks, 400 blocks), 626 answers changed (12.5%): 503 priorities (202 times
Forge passed and the search played something, 174 times Forge played and the
search held, 127 times a different play), 94 attacks and 29 blocks. 1.47 s per searched decision,
73,704 rollouts (14.7 a decision; 79 ms each to play, 8.8 ms to copy).
Land drops (1,517) are never searched.

**The cost.** 44 s a game against 7.4 s, on two JVMs here — about 37 s of
thinking a game, 1.5 s at a time. In a game against the owner that is a short
pause at most main phases and combats.

## 3. The sacrifice decks — the outlet policy with and without the search

RESULTS-SAC

## 4. The copier, and every fallback

Over the 200 searched games (`cube-search`):

| outcome of a searched decision | count | rate |
|---|---|---|
| searched | 5,017 | — |
| the copy needed a stand-in (D313's sideboard workaround) | 3,285 | 65.5% |
| **copier error → Forge's answer** | **11** | **0.22%** |
| budget: fewer than two complete rounds in 1.5 s → Forge's answer | 1,301 | 25.9% |
| Forge's own answer could not be mapped onto the copy → Forge's answer | 2 | 0.04% |
| an alternative could not be mapped (dropped, search went on) | 14 | — |
| rollouts that threw (round dropped) | 3 | of 73,704 |

**Without D313's workaround two decisions in three would have failed to copy**
— the stand-in rate is the copier-error rate Forge's own simulator would have
had. The 11 that still failed were all one card, `Couldn't map Bird Token`, a
token in a copied zone that the copier's zone listing did not return (a
phased-out or combat-only reference); since commit `26563b1` such a card gets a
stand-in too, so the sacrifice run below is on the corrected copier. The
budget fallbacks are the real limit on this machine: a quarter of the searched
decisions had more candidates than 1.5 s could roll out twice (six candidates at
≈ 90 ms is ≈ 1.1 s a round); a faster PC or `ms=3000` turns most of them into
searches.

Forge's own AI-eval timeouts (its 5 s limit, cut to 1 s inside a copy): 0.08 a
game with the search (the count includes the copies' own) against 0.005 in the
control.

## 5. The self-test

`./tools/ai-bench.sh --selftest` — 37 checks, about 20 s at low load. The
search's part:

- **Determinization never sees hidden cards.** Two games whose opponent holds
  the same five cards split differently between hand and library, in a
  different order, are determinized with seeds 1–40: the forty results are
  identical between the two games (and the AI's own hand is kept), while a
  game gives 18 distinct opponent hands over the forty seeds.
- **The copier's failure and its workaround.** With Tarmogoyf and Grist, the
  Hunger Tide in the AI's sideboard, Forge's `GameCopier.makeCopy()` throws
  `Couldn't map Grist, the Hunger Tide` (the control), and `LenientGameCopier`
  copies the board with two stand-ins and the battlefield Tarmogoyf intact.
- **A copier error falls back.** With a copy failure injected, the controller
  plays Forge's own answer (Typhoid Rats) and counts
  `search.fallback.copyError = 1`.
- **The search runs end to end inside its budget**, leaves the real game
  untouched (the opponent still holds its Lightning Bolt), and on an empty
  board at 4 life keeps both Grizzly Bears in the lethal attack — the check
  that caught the first version's leaf, which read a winner's
  `isInGame() == false` as a loss and preferred a one-Bear attack.

## 6. The overnight benchmark for the owner's PC

This machine could afford 200 cube deals and 80 sacrifice deals per
configuration. The interval that separates +5 points from +10 needs about
400 deals each, which is a night on a desktop. From the checkout, with nothing
else running (Forge's own 5 s AI timeout makes plain Forge weaker on a busy
machine, and the search budgets by the clock — a game in the browser at the same
time would slow both), `JOBS` about half the cores:

```bash
cd /home/justin-a/code/mtg-table && ./bridge/build.sh && ./tools/ai-bench.sh --selftest && \
JOBS=4 S=31 && B=tools/ai-bench.sh && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-control --a Default --b Default && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-search --a Default+search --b Default && \
$B play --pairs tools/ai-bench/pairs-cube.txt --games 40 --seed $S --jobs $JOBS --run night-cube-search3 --a "Default+search:ms=3000,turns=1" --b Default && \
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs $JOBS --run night-sac-control --a Default+outlets --b Default+outlets && \
$B play --pairs tools/ai-bench/pairs-sac.txt --games 40 --seed $S --jobs $JOBS --run night-sac-search --a Default+outlets+search --b Default+outlets && \
for t in cube-search cube-search3; do $B paired --control var/ai-bench/night-cube-control/shard-*.jsonl --treatment var/ai-bench/night-$t/shard-*.jsonl; done && \
$B paired --control var/ai-bench/night-sac-control/shard-*.jsonl --treatment var/ai-bench/night-sac-search/shard-*.jsonl
```

Each `play` line is 400 games. Expected wall time at four jobs, scaled from
this machine's per-game times (plain ≈ 8 s, the default search ≈ 38 s, the
3 s next-turn search perhaps 75 s per game per JVM): about 0.2 h, 1 h, 2 h,
0.2 h and 1 h — four and a half hours. `play` appends to its shards, so a run
that was interrupted is redone from scratch: delete `var/ai-bench/<run>/` and
run its line again.

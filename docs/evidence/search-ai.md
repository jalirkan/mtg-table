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

RESULTS-CUBE

## 3. The sacrifice decks — the outlet policy with and without the search

RESULTS-SAC

## 4. The copier, and every fallback

RESULTS-FALLBACK

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

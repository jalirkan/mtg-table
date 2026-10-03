# The AI ladder — what was measured, and the runs for the owner's PC (D318–D321)

*2026-10-03, branch `c/ai-ladder`. The manual is
[`docs/guides/ai-ladder.md`](../guides/ai-ladder.md). Every engine run is in the
committed log [`experiments.jsonl`](experiments.jsonl).*

## 0. Conditions

The cloud container has 4 cores and 15 GB, shared by five lanes; during this
work its 1-minute load ran from about 8 to **132**, with memory nearly full.
After the coordinator's rule (2026-10-03), the cloud runs only smoke tests of
20 games or fewer, one engine process at a time; every real run is a job for the
owner's PC (§4). **Nothing below is a strength claim**: the cloud numbers prove
the plumbing and size the intervals, nothing more.

## 1. The plumbing run (pilot, stopped)

`run --players forge-default,forge-reckless,policy-outlet --jobs 2
--batch-pairs 2 --max-games 48` on `tools/ai-bench/pairs-cube.txt` (before the
dev/confirm sets existed), commit `5b2961b`. Stopped at the coordinator's request
after **35 of 48 games** (the interrupted batch's three finished games were
kept, which also exercised the Ctrl-C path). Games took a median 41 s and up to
961 s at load 20–130 (the owner's PC: 3.8 s).

| player | rating | 95% CI (Hessian) | decisive games | W–L |
|---|---|---|---|---|
| policy-outlet | 1517 | 1365–1670 | 19 | 10–9 |
| forge-default | 1500 | fixed | 35 | 18–17 |
| forge-reckless | 1459 | 1293–1625 | 16 | 7–9 |

0 draws, 0 engine errors, 2 games over the 300 s cap that still finished in the
grace period. Intervals of ±150 Elo are what 16–19 games buy: **no player is
distinguishable from forge-default**, as expected. `ai-bench report` on the
same lines, against the known 50% by deal: Default+outlets 55.0% over 10 deals
(95% CI 41.5–68.5%, p = 0.47, +35 Elo, CI −60 to +135); Reckless 37.5% over 4
deals (5–70%).

**The mirror finding.** Of the 17 complete mirrored deals, **16 were decided
by the deal**: the same deck in the same seat won both games, whichever config
held it; one was won by the same config from both sides. On these decks the
deal outweighs the AI by far — which is why the pair, not the game, is the unit
(the SPRT, the bootstrap, the non-inferiority test), and why a block bootstrap
on 18 blocks is degenerate (it can only resample the one unsplit block: its
"interval" was 1500–1561). At this size quote the Hessian interval.

## 1b. Smoke tests of every command (after the review fixes)

Commit `474b522`, one engine process, 8 games each, `--batch-pairs 1`, logged
as `pilot` in `experiments.jsonl` (load 6–8 by then; game median 9.9 s):

| command | set | result |
|---|---|---|
| `sprt policy-outlet forge-default --max-games 8` | confirm | 4–4, LLR −0.17 in [−2.94, 2.94]: **inconclusive** at the limit, as 8 games must be |
| `tune policy-outlet --param outlets=on,off --pool forge-default --max-rounds 1` | dev | 2–2 and 2–2 on the same deals; winner `outlets=on` (the grid's first on a tie) is already `policy-outlet`, so the registry was left alone |
| `league --max-games 8` (candidate `policy-outlet`) | confirm | one share batch (forge-default 1–3 forge-cautious), one SPRT batch (2–2); no decision |
| `check` | all | 24 games, 0 draws, 0 errors, 12 mirrored deals, 0 malformed; **11 decided by the deal**, 1 by the config |

The deal-dominance of §1 holds on the new cube-lab decks too (11 of 12).

## 2. The mirror hook (pilot)

`ai-bench play --pairs <first cube pair> --a Default --b Reckless --games 4
--mirror` (commit `e49800e` plus the hook): games 1 and 2 got seed 1000004 with
the B deck in seat 0 both times, A and B swapped — the mirror works. Forge's
`FModel.initialize` took 19 s at load 26, which is why a batch is minutes of
games per JVM.

## 3. The statistics, on synthetic results (`web/test/ai-ladder.test.ts`)

| piece | check | result |
|---|---|---|
| Bradley–Terry | four players, true 1420–1600, 600 mirrored pairs per pairing | every rating within 3 se, the order right, anchor exactly 1500 |
| bootstrap | correlated deals (the deal tilts both games) | covers the truth; width 0.6–2× the Hessian's |
| SPRT, elo0 0 / elo1 20 | +70 Elo; −30 Elo; 0 Elo | H1 20/20; H0 20/20; false H1 ≤ 10% of 120 (the methodology review's own simulation: 4.3%) |
| non-inferiority, δ 30 Elo, α 0.05, β 0.1 | 400 runs each, correlated deals | **30 worse: passes 4.8%; 15 worse: 37%; equal: 93.8%; 20 better: 100%**; ≈ 650 shared deals on average (fixed-size equivalent: 936) |
| tuner | eight configs, the best 50 Elo above the next | the best wins ≥ 8 of 10 tunes; 8 → 4 → 2 candidates, blocks doubling |

## 4. Jobs for the owner's PC

In the `pc-jobs` format. Every job runs on `mtg-table@c/ai-ladder` (until it
merges), uses one Forge home per worker, and writes **nothing tracked**: the
experiment log and any tuned registry go under `var/`, and the job sends them
back, so the checkout stays clean. Common build step: `./bridge/build.sh`.

The jobs, their pilots, abort conditions and reports are the text handed to the
coordinator; they are repeated here so the branch carries them.

### J-L1 — Rate the stock profiles and the outlet policy on the confirm set

```text
id: J-L1
title: AI ladder: stock Forge profiles and the outlet policy, confirm set
cpu: heavy
repos: mtg-table@c/ai-ladder
est: ~4 h on the 9700X (about 26,000 games)
## Pilot
cd /home/justin-a/code/mtg-table && ./bridge/build.sh
./tools/ai-ladder.sh list            # must print pairs-dev.txt and pairs-confirm.txt "present"
./tools/ai-ladder.sh run --hours 0.2 --jobs 7 --max-games 280 \
    --players forge-default,forge-reckless,policy-outlet \
    --dir var/ai-ladder-pilot --experiments var/ai-ladder-pilot/experiments.jsonl
./tools/ai-ladder.sh check --dir var/ai-ladder-pilot --experiments var/ai-ladder-pilot/experiments.jsonl --min-games 250
Checks (all must hold):
- check prints "check: OK" (>= 250 games, draw rate <= 3%, engine errors <= 1%,
  0 malformed mirrored deals, every line has the load field);
- its game time median is 2-10 s;
- var/ai-ladder-pilot/experiments.jsonl has one start and one end line, status finished;
- `git status --porcelain` in the checkout is empty.
## Commands
./tools/ai-ladder.sh run --hours 4 --jobs 7 \
    --players forge-default,forge-reckless,forge-cautious,forge-experimental,policy-outlet,policy-outlet-reckless \
    --experiments var/ai-ladder/experiments.jsonl
./tools/ai-ladder.sh check --experiments var/ai-ladder/experiments.jsonl --min-games 15000
./tools/ai-ladder.sh report --bootstrap 200 --experiments var/ai-ladder/experiments.jsonl
## Abort if
- every 30 min: `./tools/ai-ladder.sh check --experiments var/ai-ladder/experiments.jsonl`
  prints a CHECK FAIL for the draw rate, engine errors or malformed deals;
- the game time median (from check) passes 15 s, or the 1-minute load stays above 16;
- a batch log under var/ai-ladder/batches/<run>/ shows "AI-BENCH FAILED".
## Report
- STATUS done/failed; summary.md with the output of `./tools/ai-ladder.sh ratings`
  and of `check`, the wall time and the final game count;
- copy var/ai-ladder/ladder.json, var/ai-ladder/report.html,
  var/ai-ladder/experiments.jsonl and var/ai-ladder/results/<host>.jsonl
  (under 5 MB; else its path and size) into results/J-L1/.
```

### J-L2 — Tune the outlet policy's profile and switch on the dev set, then let the league judge the winner on confirm

```text
id: J-L2
title: AI ladder: tune policy-outlet (profile x outlets) on dev; league on confirm
cpu: heavy
after: J-L1
repos: mtg-table@c/ai-ladder
est: ~45 min tune (about 2,000 games) + 4 h league
## Pilot
cd /home/justin-a/code/mtg-table && ./bridge/build.sh
mkdir -p var/ai-ladder var/ai-ladder-pilot
cp tools/ai-ladder/players.json var/ai-ladder/players.json
cp tools/ai-ladder/players.json var/ai-ladder-pilot/players.json
./tools/ai-ladder.sh tune policy-outlet --param outlets=on,off --pool forge-default \
    --batch-pairs 2 --blocks 1 --max-rounds 1 --jobs 7 \
    --dir var/ai-ladder-pilot --registry var/ai-ladder-pilot/players.json \
    --experiments var/ai-ladder-pilot/experiments.jsonl
./tools/ai-ladder.sh check --dir var/ai-ladder-pilot --experiments var/ai-ladder-pilot/experiments.jsonl --min-games 16
Checks:
- tune prints "round 1: 2 candidate(s), 2 batch(es)" and a winner line;
- check prints "check: OK";
- tools/ai-ladder/players.json is unchanged (`git status --porcelain` empty).
## Commands
./tools/ai-ladder.sh tune policy-outlet --param profile=Default,Cautious,Reckless,Experimental \
    --param outlets=on,off --jobs 7 --candidate \
    --registry var/ai-ladder/players.json --experiments var/ai-ladder/experiments.jsonl
./tools/ai-ladder.sh league --hours 4 --jobs 7 \
    --registry var/ai-ladder/players.json --experiments var/ai-ladder/experiments.jsonl
./tools/ai-ladder.sh report --experiments var/ai-ladder/experiments.jsonl --registry var/ai-ladder/players.json
## Abort if
- `./tools/ai-ladder.sh check --set all --experiments var/ai-ladder/experiments.jsonl` prints CHECK FAIL;
- tune's round 1 shows any candidate with more than 5% draws.
## Report
- the tune's full console output (every round's standings and the winner line);
- the league's decision line ("PROMOTED" or "rejected -- <reason>"), or "still
  running" with the last LLR lines;
- the diff of var/ai-ladder/players.json against tools/ai-ladder/players.json;
- var/ai-ladder/league.json, var/ai-ladder/sprt.jsonl, var/ai-ladder/tune.jsonl,
  var/ai-ladder/experiments.jsonl, var/ai-ladder/ladder.json.
```

### J-L3 — SPRT: the fixed-rollout search against forge-default, confirm set

```text
id: J-L3
title: AI ladder: SPRT search-v1-fixed3 >= forge-default + 20 Elo, confirm set
cpu: heavy
after: J-L1
repos: mtg-table@c/ai-ladder
est: 1-3 h (a +55 Elo edge decides in about 300 games; a search game costs several plain ones)
## Pilot
cd /home/justin-a/code/mtg-table && ./bridge/build.sh
./tools/ai-ladder.sh sprt search-v1-fixed3 forge-default --max-games 16 --batch-pairs 1 --jobs 2 \
    --dir var/ai-ladder-pilot --experiments var/ai-ladder-pilot/experiments.jsonl
./tools/ai-ladder.sh check --dir var/ai-ladder-pilot --min-games 16
grep -h "search.fallback.budget" var/ai-ladder-pilot/batches/*/b*.jsonl | head -1   # must print nothing
Checks:
- the SPRT prints an LLR line after each batch and ends "stopped" or decided;
- check prints "check: OK";
- no budget fallback in the batch lines (fixed rollouts never run out of time);
- the search game time median is under 60 s.
## Commands
./tools/ai-ladder.sh sprt search-v1-fixed3 forge-default --elo0 0 --elo1 20 --jobs 7 --hours 6 \
    --experiments var/ai-ladder/experiments.jsonl
./tools/ai-bench.sh report var/ai-ladder/batches/*/b*.jsonl > var/ai-ladder/j-l3-bench-report.txt
## Abort if
- check prints CHECK FAIL;
- more than 2% of searched decisions fall back for "copyError" (the bench report's search line).
## Report
- the SPRT's last 3 lines (result, games used, LLR, score);
- var/ai-ladder/j-l3-bench-report.txt (with "A vs the known 50%" and the search counters);
- var/ai-ladder/sprt.jsonl and var/ai-ladder/experiments.jsonl.
```

What to send back from every job: `summary.md`, the job's `experiments.jsonl`
lines (the cloud appends them to the committed log), and the small JSON/HTML
files named in its Report.

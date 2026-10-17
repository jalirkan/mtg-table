id: J142
title: The move atlas, first full run -- one deck pair chosen by rule from the ladder's confirm set (pairs-confirm line with the most ladder games and the most even record, D451), seed 451; phase A 10,000 games from the opening with BOTH seats the random seat under D451's mechanical guardrails; phase B, at every one of seat A's 15 decisions in the Forge-vs-Forge baseline, every option forked and played out 200 times with both seats random and 40 times with Forge on both; everything recorded (rows, ledger, frame logs) and checked; the two regret maps side by side. Method only, no outcome rule
public_title: Move atlas: random play vs Forge play, one deck pair
public_est: ~4 h
public_decides: None by itself; the first full run of the method, for Justin to read
cpu: heavy
cores: 7
pilot_cores: 2
max_workers: 7
mem_per_worker_gb: 2.5
after: J141
repos: mtg-table@810e5685 (re-pinned 2026-10-18 to the merge of #164 on origin/main) (the head of pc/move-atlas after the #161 review fixes, PR 2, D451, stacked on pc/record-the-cake; RE-PIN to the commit on origin/main that merges it before posting: the pilot fails on merged == 1 until then)
decides: nothing by itself. It is the first full move atlas: how often and how strongly the random map and Forge's map of the same decisions agree, reported with intervals, for Justin to read ("what we'd gain")
hypothesis: none to confirm, and none is tested. The smoke (50 rollouts, 3 decisions at 16 + 8 branches) is too small to say anything about agreement: every interval straddles the other
rule: D451, written 2026-10-16 before this run: the guardrails (point 2), the pair rule (point 3), the fork and its checks (points 5-6) and the arithmetic (point 7). Method only: no pass/fail rule on what the maps say; the agreement is reported with intervals. The only checks are mechanical (the pilot's and the final ones below)
followup: morning-read
est: ~4 h on 7 workers at the smoke's loaded per-worker rates (D451): phase A 10,000 games x 5.5 s / 7 = 2.2 h; phase B 15 decisions, 37 options x 240 branches = 8,880 branch games x 3.07 s / 7 = 1.1 h (replays and leak checks included); then the checks in one process, ~40 min (rows of 18,880 games, ~38,000 frame logs through check-redaction at ~46 ms each); plus ~10 min of pilot. Disk ~3.5 GB (a phase A game 234 KB, a branch 136 KB) in the clone's var/
resumable: yes
timeout: 9h
clean: var/lab-j142 var/cubelab/homes-J142
progress: lines var/lab-j142/atlas/phaseA/games.jsonl var/lab-j142/atlas/phaseB/branches.jsonl of 18880
metrics: played_a = lines var/lab-j142/atlas/phaseA/games.jsonl
metrics: branches = lines var/lab-j142/atlas/phaseB/branches.jsonl
metrics: engine_errors = count var/lab-j142/atlas/phaseA/games.jsonl "\"engineError\":\""
metrics: unit_errors = count var/lab-j142/atlas/phaseB/units.jsonl "\"ok\":false"
metrics: atlas = sh: python3 -c "import json; d=json.load(open('var/lab-j142/atlas/atlas.json')); c=d['checks']; print(json.dumps({'problems': len(c['problems']), 'rows': c['rows'], 'logs': c['frameLogs'], 'forks': c['forks'], 'forkProblems': c['forkProblems'], 'leaks': c['leaks'], 'leakChecks': c['leakChecks'], 'guardViolations': c['guardrails']['violations'], 'decisions': len(d['phaseB']['decisions']), 'meanRho': d['phaseB']['agreement']['meanRho'], 'sameBest': d['phaseB']['agreement']['sameBest'], 'aScore': d['phaseA']['aScore']}))" 2>/dev/null || echo '{"problems":-1}'
metrics: disk_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('.').free / 1e9, 1))"
headline: played_a, branches, atlas.decisions, atlas.meanRho, atlas.sameBest, atlas.aScore, atlas.problems

**Why (Justin, 2026-10-16 evening).** Explore moves with both sides making random moves under
mechanical guardrails, so the result owes nothing to Forge's play; use sense about what counts as a
sensible move; he wants to see what we'd gain. Every lab number so far is "with Forge playing on". The
atlas puts a second map beside it: what each option of a decision is worth when both sides play at
random afterwards.

**The method** (D451, `docs/decisions/D451-move-atlas.md`):

| | rule |
|---|---|
| the pair | `--pair auto`: the line of `tools/ai-bench/pairs-confirm.txt` with the smallest \|p - 1/2\| + 1.96 sqrt(p(1-p)/n) over its decisive ladder games (`var/ai-ladder/results`); the plan records the table. On 2026-10-16 it was line 18, peasant-900000007 (736 games, deck A 357). The confirm set is only measured on; every atlas game's frame-log header and rows begin line carry `notForTraining`, which every dataset builder skips whatever the decks (the #161 review), besides the deck-set rule (D340) |
| the random seat | D358's exploration at epsilon 1: a uniform pick among pass, each land, Forge's answer and every spell or non-mana ability it can play and pay for (random legal targets it can see); random attacks, blocks and single targets; mana payment, costs, modes and other choices Forge's |
| guardrails | mechanical: a legal land drop always taken (G1); no pass in main phase 1 while a land drop is pending (G2, which is G1 itself, no code of its own); an activated ability that changed nothing public not repeated at the next decision (G3); the opening hand kept (G4); a game past turn 40 a draw |
| phase A | 10,000 games from the opening, both seats random, seeds 451 x 1,000,000 + r, deck A on the play every other game; recorded |
| phase B | the baseline (seed 451, Forge both sides) lists seat A's decisions with 2+ options (15, 37 options, as the smoke measured); at each, every option forked (a copy, the option forced, what seat A cannot see redealt from the multiset, branch i of every option on one seed) and played to the end: 200 times both seats random, 40 times Forge both sides; units of one decision, one continuation and 25 branches, each replaying the baseline to its decision and checking the options; recorded |
| checks | every fork the position; one no-leak check a unit (seat B's real hidden cards redealt in the real game: nothing moves; seat A's own hand swapped: something does); every rows file and frame log checked (D450); G1 and G4 read back from the decision records |
| report | `atlas.json` (strict) and `atlas.md`: per decision the options' values under each continuation (Wilson), each map's regret (best - played, paired bootstrap interval), the rank correlation between the maps (bootstrap interval), same best; the most-disagreeing decisions; phase A's outcome distribution, game length and the rollouts a +/- 2-point interval needs |

**Outputs** (`var/lab-j142/atlas/`): `plan.json`, `atlas.json`, `atlas.md`; `phaseA/` and `phaseB/`
(games and branches rows, units, ledgers, rows files, frame logs). Never `summary.md` or `metrics.json`.

**Disk.** ~3.5 GB in the clone's `var/` (the root disk had 16 GB free on 2026-10-16); the pilot checks
for 8 GB free. When the data drive is mounted and the README's safety rules name it, the same commands
run with `export LAB_DATA_DIR=<drive>/mtg-table` before them (D450) and the metrics' paths move with it.

## Pilot
About 10 minutes on 2 workers: the tests, the two engine self-tests (the atlas's own checks asserted;
the Forge, search and explore seats still play origin/main's games), and a small atlas of the same pair.
```bash
mkdir -p var/lab-j142
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j142/merged.txt || echo 0 > var/lab-j142/merged.txt
node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record-cake.test.ts
export CUBELAB_HOME_ROOT=var/cubelab/homes-J142
tools/cubelab.sh atlas-selftest --jobs {workers} && echo 1 > var/lab-j142/selftest.txt || echo 0 > var/lab-j142/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j142/identity.txt || echo 0 > var/lab-j142/identity.txt
tools/cubelab.sh atlas --pair auto --ladder var/ai-ladder --seed 4590 --rollouts 20 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --jobs {workers} --out var/lab-j142/pilot || true
```
metrics: merged = sh: cat var/lab-j142/merged.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j142/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j142/identity.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -c "import json; d=json.load(open('var/lab-j142/pilot/atlas.json')); print(json.dumps({'problems': len(d['checks']['problems']), 'played': d['phaseA']['played'], 'decisions': len(d['phaseB']['decisions'])}))" 2>/dev/null || echo '{"problems":-1}'
check: merged == 1
check: selftest == 1
check: identity == 1
check: pilot.problems == 0
check: pilot.played == 20
check: pilot.decisions == 2
check: disk_gb >= 8

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J142
tools/cubelab.sh atlas --pair auto --ladder var/ai-ladder --seed 451 --rollouts 10000 --branch-random 200 --branch-forge 40 --jobs {workers} --out var/lab-j142/atlas
```
check: played_a == 10000
check: branches == 8880
check: engine_errors <= 100
check: unit_errors == 0
check: atlas.problems == 0

## Abort if
abort: played_a >= 500 and engine_errors > played_a * 0.02
abort: disk_gb < 2

## Report
collect: var/lab-j142/atlas/atlas.md
collect: var/lab-j142/atlas/atlas.json
collect: var/lab-j142/atlas/plan.json
The summary says, for Justin, in plain words: phase A's outcome distribution and game length, and the
rollouts a +/- 2-point interval needed; then the two maps -- at how many of the 15 decisions they name
the same best option (with its interval), the mean rank correlation with its interval, and the three
decisions where they disagree most, each with its options' values under both continuations. No verdict:
D451 has no outcome rule. Any surprise is a candidate until a fresh seed shows it again.

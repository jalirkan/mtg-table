id: J154
title: The move atlas, rung 2 -- three deck pairs by D451's pair rule (fair-fight-900000005 again as the repeat, peasant-900000007, vintage-900000007) x three Forge-vs-Forge spine games each at fresh seeds 452-460; phase A 2,400 random-vs-random rollouts a pair; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; the random seat under G5 (D458, no re-pick of a play the engine refused to pay for); pre-registered reads, numbers only. Method only, no outcome rule beyond D451's
public_title: Move atlas 2: three deck pairs, nine spine games
public_est: ~16 h
public_decides: None by itself; the second rung of the move atlas, for Justin to read
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 4.2
repos: mtg-table@8fca7250 (the merge of #179 and #181 over 5a02afc0; #175–#178 in; the pin the cloud gave on 2026-10-22 14:05 UTC)
decides: nothing by itself. Rung 2 of the move atlas: whether J148's one-game picture (the two maps rarely agree before the game is decided; rho below zero; "cast now / don't attack" under random play) is a property of one spine or of the method, read on nine spines of three pairs, with intervals clustered by pair and spine; and how much a labelled decision costs, for rung 3
hypothesis: none to confirm about the maps. Two candidates from J148 are read for repetition on the repeat pair only (iv): C1 "cast now" and C2 "don't attack", both + on J148 (C1 +0.013 over 18 decisions, C2 +0.059 over 4; neither excluded zero there)
rule: D451 (method; no outcome rule) with D458 (G5) and D459 (unit watchdog). Pre-registered here, before any J150 data: the reads (i)-(vi) below, computed by var/lab-j150-local/bin/reads.py exactly as written in the pilot; a candidate of (iv) HOLDS only if its point is > 0 (J148's direction) and its interval's low end is > 0, as D447 point 9 holds a census candidate; else NOT SHOWN. No other read carries a verdict
followup: morning-read
est: ~16 h at 7 workers (sizing below): pilot ~25 min; per pair ~5.3 h (phase A 2,400 games ~0.5 h + its checks ~5 min; three spines of ~13,200 branch games ~1.2 h each + their checks ~25 min each); reads ~1 min. Disk ~22 GB on the lab data folder /home/justin-a/code/lab/data (a phase A game 234 KB, a branch ~173 KB as J148 measured)
resumable: yes
timeout: 26h
progress: lines /home/justin-a/code/lab/data/lab-j150/a-*/phaseA/games.jsonl /home/justin-a/code/lab/data/lab-j150/b-*/phaseB/branches.jsonl of 125700
metrics: played_a = lines /home/justin-a/code/lab/data/lab-j150/a-*/phaseA/games.jsonl
metrics: played_a_ff5 = lines /home/justin-a/code/lab/data/lab-j150/a-ff5/phaseA/games.jsonl
metrics: played_a_peasant7 = lines /home/justin-a/code/lab/data/lab-j150/a-peasant7/phaseA/games.jsonl
metrics: played_a_vintage7 = lines /home/justin-a/code/lab/data/lab-j150/a-vintage7/phaseA/games.jsonl
metrics: branches = lines /home/justin-a/code/lab/data/lab-j150/b-*/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j150/a-*/phaseA/games.jsonl "\"engineError\":\""
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j150/b-*/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j150/b-*/phaseB/logs/*.log "Didn't find what to pay for"
metrics: atlas = sh: python3 -I var/lab-j150-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j150') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: played_a, branches, atlas.spinesDone, atlas.decisions, atlas.meanRho, atlas.sameBest, atlas.refusedCast, atlas.refusedCastSpinesFf5, atlas.problems

**Why.** J148 (results/J148/summary.md) was the first full atlas: one pair, one spine game, one seed. On that
game the maps named the same best option at 32 of 49 decisions, but 21 of those were moves after the game
was won; where both could rank, rho was -0.34 [-0.63, -0.03] over 18 decisions; random play favoured
casting now and not attacking where Forge passed, cast Sentinel and attacked. Its *Known gaps* say why none
of it generalises yet: one pair, one baseline, one seed, decisions from one game. This is rung 2: the same
method on three pairs, three fresh spines each, so the reads have a between-game interval.

**What changed since J148** (all in the pin; the pilot checks each is there):
- **G5 (D458, mtg-table #177).** The random seat does not pick again, in the same priority window, a play
  the engine refused to pay for (J148: 1,066 "Didn't find what to pay for {1}" lines under Elite
  Spellbinder's tax, one unit dead of a heap OOM). Requested as "G4"; D451 already names the opening-hand
  keep G4, so the new guardrail is G5. **It changes the random policy's support: J150's random map is
  not J148's policy, so the repeat pair's numbers are compared with J148's as two policies, never pooled
  with them**, and (iv) is a repetition of a direction, not of a value.
- **Guardrail counts from the logs (protocol M71).** `atlas.json`'s `checks.guardrails` now carries G3's
  `noRepeatNoOp` and G5's `refusedCast` / `noRepeatRefused`, summed from every random seat's own log
  (phase A's and every random branch's), beside G1's and G4's read-backs.
- **Memory (#175).** The atlas's workers run at `-Xmx2048m` by default; `CUBELAB_WORKER_XMX` is **left
  unset** here so that default applies (J148's three OOM kills were 4096m heaps at 6-7 workers).
  `mem_per_worker_gb: 2.7` (J148's live workers held 0.9-1.1 GB of long-lived heap by jstat; the
  self-test peaked at 1.53 GB): 7 x 2.7 = 18.9 GB, inside the heavy budget.
- **The unit watchdog (#176, D459).** A monotonic clock and `--unit-timeout 30` minutes (J148's longest
  honest unit 976 s), so a boot-time clock jump no longer "hangs" every worker.
- **The checker (#178, D460).** `check-redaction.mjs --empty-hand-ok` turns the two "proves nothing"
  assertions into a WARN only when the file itself shows the opponent's hand count 0 and no opponent
  library card in every state; the atlas passes it for branch logs itself (J148's 24 false positives), so
  no atlas line below names it.
- **The runner's step clock (#179, D461; the pin waits for it).** Step durations on the monotonic clock, so
  a boot-time RTC jump cannot fire the 8h `timeout:` early, as it fired J143's 9 h after ~5 h.

**Where it writes: the lab data folder.** Every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data` (the README's safety rules: the only value it may take). The
atlas honours it: `atlasCommand` resolves `--out` through `labPath(..., 'write')` (tools/cubelab/labdata.ts,
as census-play does), and every phase A and phase B path (rows, frames, ledgers, units, logs, atlas.json) is
built from that absolute folder; so `--out var/lab-j150/b-ff5-452` lands at
`/home/justin-a/code/lab/data/lab-j150/b-ff5-452`. `labPath` refuses a write whose repo copy already holds
work (none does: nothing is written to the clone's `var/lab-j150`). The ladder is read through
`labPath(..., 'read')` and is not used here (the decks are named). The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J150`), `atlas-selftest`'s own folder (absolute,
`var/cubelab/atlas-selftest`) and the job's scripts (`var/lab-j150-local/`) stay in the clone. As J144/J149:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`;
- they `mkdir -p` the data folder before anything (a metric, a tool) reads it, and stop under 50 GB free;
- every run block asserts the path and the 50 GB again before it plays;
- `abort:` fires under 50 GB;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path.
- **No `clean:`** (the runner refuses data-folder paths there, and the job is `resumable: yes`). A restart
  from scratch would need `/home/justin-a/code/lab/data/lab-j150` removed by hand, by Justin or the PC
  session; no job deletes there.

**Nothing beside it.** `cores: 7` of the PC's 8 reserves the box for this job: post nothing heavy beside it,
and hold the GPU lane for the whole run (J146 was OOM-killed beside it). There is no `pilot_cores:` on
purpose: the pilot holds the full width, so nothing narrow starts beside it and then makes run1 wait (the
J146 lesson). A light job may still run beside it (the runner's rule); the PC should keep that to the coach
bench or nothing.

**The design** (D451's method throughout):

| | |
|---|---|
| pairs | D451's rule (point 3), the three best-scored lines of `tools/ai-bench/pairs-confirm.txt` over the ladder's 25,056 games (checked 2026-10-22 with `autoPair` on the lab's `var/ai-ladder`; the same table as J148's atlas.md): **line 2 fair-fight-900000005** (844 games, A 439 of 844, score 0.0538) -- the repeat pair; **line 18 peasant-900000007** (828, A 397, 0.0546); **line 28 vintage-900000007** (832, A 395, 0.0592). Named here by deck file, not `--pair auto`, so a growing ladder cannot change them |
| spines | three Forge-vs-Forge baseline games a pair at fresh seeds: fair-fight **452, 453, 454**; peasant **455, 456, 457**; vintage **458, 459, 460** (J148 was 451) |
| phase A | **2,400 rollouts a pair** from the opening, both seats random, seeds S x 1,000,000 + r with S the pair's first spine seed (452, 455, 458); J148 measured ~2,300 for a +/- 2-point interval on seat A's score. `--phase a`, its own folder `var/lab-j150/a-<pair>` (re-rooted to the data folder, above) |
| phase B | each spine `--phase b`, its own folder `var/lab-j150/b-<pair>-<seed>` (likewise); **16 of seat A's decisions** with two or more options, evenly spaced by D451's `spread` (all of them if the game lists 16 or fewer); every option forked and played out **200 times random, 40 times Forge**, units of 25 branches, one no-leak check a unit-chunk as before |
| why 16 decisions | J148 branched all 49 of its spine (40,213 branch games). All decisions of nine spines would be ~363,000 branch games, ~31 h of phase B plus ~10 h of checks at 7 workers. 16 a spine is ~118,500 and ~16 h in all. The between-game interval is set by the nine spines, not by decisions within one, so the cap costs the reads little; turns 2-12 still get ~5 decisions a spine |
| checks | D451 point 6 on every folder, with `--empty-hand-ok` for branch logs (above); guardrails G1/G4 read back, G3/G5 counted from the logs |

**Sizing** (J148's measured rates):
- **Phase A:** 7,200 games. J143 ran 10,000 at 4,850 games/h on 7 workers, so this is ~1.5 h, about
  0.5 h a pair.
- **Phase B:** 9 spines x 16 decisions x 3.43 options a decision (J148: 168 options over 49 decisions)
  x 240 = **~118,500 branch games** (98,800 random, 19,800 Forge).
  - At 2.28 s a random branch and 1.27 s a Forge branch per worker: 98,800 x 2.28 + 19,800 x 1.27 =
    250,400 worker-s = 69.6 worker-h, **~9.9 h on 7 workers**. Add ~5% for each unit's replay of the
    spine and the leak checks: ~10.4 h, ~1.16 h a spine.
  - J148's resume rate (9,650 branch games/h at 4 workers, x 7/4 = 16,900/h) would give 7.0 h. That rate
    is low: the resume ran J148's later decisions, whose branches are short (0.78 s random after turn
    18, against 3.94 s at turns 2-12). The per-branch rates are used here.
- **Checks**, single-process at the end of each atlas command (the workers idle meanwhile):
  - ~252,000 frame logs at J148's 33 ms each (3,274 s for ~100,000): ~2.3 h.
  - The rows and the rest: J148's other 42 minutes x 2.5 for ~2.5 times its games, ~1.75 h.
  - About 4 h in all, ~25 minutes a spine.
- **A pair's block** is ~0.57 h of phase A and its checks, plus 3 x 1.6 h of spines, **~5.3 h**. Three
  blocks, ~16 h; the pilot ~20 min.
- **`timeout: 8h`** is one block's 5.3 h + 50%, and it bounds each step (each block is one step).
  - The runner's step clock is monotonic from #179 (D461), which the pin waits for; before it, a
    boot-time jump of the RTC (Windows writes local time) fired J143's 9 h timeout after ~5 h.
  - The job is `resumable: yes`, so a stop or a restart resumes at the block. The PC watches the first
    boot after posting.
- **Unit timeout: `--unit-timeout 30`** (minutes, monotonic). A random unit of 25 branches at J148's
  early-game 3.94 s is ~100 s plus its replay.
- **Disk:** ~1.7 GB for phase A and ~20.5 GB for phase B (J148: 9.3 GB for ~50,000 games), on the lab
  data folder. The pilot and every run block require 50 GB free, and `abort:` fires under 50 GB.

**Pre-registered reads** (numbers only, no verdict beyond D451; `reads.py` below computes every one, and
the pilot proves it on J148's own `atlas.json`, where it must give J148's published numbers):
- **Decided.** A decision whose every option is >= 95 under both maps. J148 has 27 decided by this rule
  (21 of them at exactly 100.0); Q is the complete decisions not decided, 22 in J148.
- **Intervals.** 95% percentile bootstrap, 10,000 draws, seed 150, clustered three ways: the pairs with
  replacement, then each drawn pair's spines, then each drawn spine's decisions. A per-pair interval
  starts at the spine level. With three pairs the pooled interval's pair level is coarse (a resample of
  three pairs has only ten distinct compositions), and with three spines a pair so is a pair's spine
  level; these intervals are wide by design, and that width is the honest answer.
- **(i) Agreement before the game is decided:** the same best option's share over Q, pooled with its
  interval, and per pair.
- **(ii) rho:** the mean Spearman correlation between the maps over the rankable decisions (both maps
  vary), per pair and pooled, each with its interval.
  - How many rankable decisions have two options, where rho is +/-1 by construction.
  - As information, the same over Q alone.
- **(iii) Regret at Forge's choice by kind** (priority / attack / block): the mean of atlas.json's regret
  (best minus option 0) over Q, under each map, with intervals.
  - How many decisions have a regret interval clear of zero, under each map.
  - A kind with no decision is reported as none; J148 listed no block decision with two or more options.
- **(iv) J148's pattern, on the repeat pair (fair-fight-900000005) at seeds 452-454 only.**
  - **C1 "cast now":** over Q priority decisions that list pass and at least one cast/activate option,
    the mean over decisions of (the mean random value of the cast/activate options minus pass's random
    value). J148: +0.013 over 18.
  - **C2 "don't attack":** over Q attack decisions whose option 0 (Forge's) attacks and that list
    `attack:none`, the mean of (attack:none's random value minus option 0's). J148: +0.059 over 4.
  - Each **HOLDS** if its point is > 0 and the low end of its interval (spine, then decision) is > 0;
    otherwise it is **NOT SHOWN**.
  - The Forge map's same statistics are reported beside, as information.
  - Under G5 this is the same direction read under a changed random policy (above).
- **(v) Guardrails:** per pair and in total, from every atlas.json's checks. G5 must have fired on the repeat
  pair (pilot and final checks, below); how often it fired on the other two pairs is reported, not checked.
  - G1: lands offered and taken.
  - G4: hands kept.
  - Violations.
  - G3: `noRepeatNoOp`.
  - G5: `refusedCast` and `noRepeatRefused`.
  - Beside them, the worker logs' "Didn't find what to pay for" lines (`payfail`). G5 bounds these to one
    a window; J148 had 1,066.
- **(vi) Rung 3's sizing line,** at the rates this run measured: options a decision, branch games a
  labelled decision (options x 240), worker-seconds a labelled decision, labelled decisions per 7-worker
  hour and per 10-hour night, and Q's share of the decisions (the labels that are not already won).

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j150/`).
- `a-<pair>/` and `b-<pair>-<seed>/`: each with `plan.json`, `atlas.json`, `atlas.md`, and `phaseA/` or
  `phaseB/`; `pilot/`, the pilot's smoke.
- `report/`: each folder's `atlas.json` and `atlas.md` copied under its folder's name, `reads.json` and
  `exits.txt` (each atlas command's exit code).
- Never `summary.md` or `metrics.json`.

**Heap (2026-10-22, after J151):** J151 ran the atlas's 2048m default and aborted at `unit_errors > 30` two hours in: the workers hit `java.lang.OutOfMemoryError: Java heap space` inside Forge's AI payment search (`ComputerUtilMana` / `AiController.chooseSpellAbilityToPlayFromList`) on this pair's Elite Spellbinder games -- Forge's OWN seat, not the random seat, so G5 does not reach it -- and each OOM killed the worker mid-unit (69/75, 0/150 branches). J148 at 4096m lost 2 units to the same loop. This file runs every worker at `CUBELAB_WORKER_XMX=4096m` and declares 4.2 GB a worker (5 workers fit the 21.4 GB budget); the est. scales accordingly. The class fix (a branch game surviving its own OOM; a cap on Forge's failed-cast retries) is a separate pc/ PR.

## Pilot
About 25 minutes at up to 3 workers: the data folder; the pin carries the five PRs; the tests; the two engine
self-tests (the atlas's checks with G3/G5's keys asserted; the Forge, search and explore seats still play
origin/main's games); `reads.py` written and proved on J148's atlas; a smoke of the repeat pair with 60
rollouts and 2 decisions, in which G5 must fire.

**Why the pilot's G5 check is on a smoke of the repeat pair and not on its spines.** Spines 452-454 are the
run itself (~3.5 h of phase B); the pilot cannot play them without becoming the job. It plays the repeat
pair instead, deck for deck, at its own seed 4600: 60 random-vs-random rollouts and a 2-decision phase B.
Elite Spellbinder is in deck B. In J148's phase A (the same pair, the same random seat) 1,389 of 10,000
games logged at least one refused payment ("Didn't find what to pay for", attributed to games by the worker
log's game lines), 13.9% a game. So 60 games all without one has a chance of 0.861^60, about 1 in 8,000:
`pilot.refusedCast >= 1` is a mechanical check that G5 is wired, not a gamble. The spines themselves are
held to it by the final checks: `atlas.refusedCastFf5 >= 1` (phase A's 2,400 games and the three spines;
J148's 13.9% makes a miss impossible in practice) and `atlas.refusedCastSpinesFf5 >= 1` (the three spines'
random branches alone; J148's random branches of this pair logged 1,066 refusals in 217 of its unit
attempts).
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J150: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J150: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j150 var/lab-j150-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J150: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J150: under 50 GB free on the data folder')"
echo 1 > var/lab-j150-local/datadir.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j150-local/merged.txt || echo 0 > var/lab-j150-local/merged.txt
grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'noRepeatRefused' bridge/src/mtgtable/ai/Explorer.java && echo 1 > var/lab-j150-local/has-g5.txt || echo 0 > var/lab-j150-local/has-g5.txt
grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'monotonicMs' tools/cubelab/engine.ts && echo 1 > var/lab-j150-local/has-watchdog.txt || echo 0 > var/lab-j150-local/has-watchdog.txt
grep -rq 'CUBELAB_WORKER_XMX' tools/cubelab && echo 1 > var/lab-j150-local/has-heap.txt || echo 0 > var/lab-j150-local/has-heap.txt
grep -q 'empty-hand-ok' tools/check-redaction.mjs && grep -q 'empty-hand-ok' tools/cubelab/atlas.ts && echo 1 > var/lab-j150-local/has-checker.txt || echo 0 > var/lab-j150-local/has-checker.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j150-local/xmx-unset.txt || echo 0 > var/lab-j150-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts
cat > var/lab-j150-local/bin/reads.py <<'PY'
# J150's pre-registered reads (pc-results drafts/J150-move-atlas-2.md), from the phase-B atlas.json files
# of the spines named on the command line as PAIR:SEED:PATH. Standard library only; no engine.
# Writes one JSON object to stdout. Definitions (fixed before any J150 data):
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
#   (v)   the guardrail counts of every atlas.json's checks (phase A folders too: pass them as PAIR:A:PATH)
#   (vi)  rung 3 sizing: options per decision, branch games per labelled decision (options x (R + F)),
#         worker-seconds per labelled decision at the measured branch times, labelled decisions per 7-worker
#         hour and per 10-hour night, and Q's share of the decisions
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
opts = sum(len(x['options']) for x in alld)
nr = sum(o['random']['n'] for x in alld for o in x['options'])
nf = sum(o['forge']['n'] for x in alld for o in x['options'])
ms = {m: 0.0 for m in NB}
for ss in spines.values():
    for d in ss.values():
        w = {'random': sum(o['random']['n'] for x in d['phaseB']['decisions'] for o in x['options']),
             'forge': sum(o['forge']['n'] for x in d['phaseB']['decisions'] for o in x['options'])}
        for m in NB:
            ms[m] += (d['phaseB'].get('meanBranchMs') or {}).get(m, 0) * w[m]
tr = ms['random'] / nr / 1000 if nr else None
tf = ms['forge'] / nf / 1000 if nf else None
per = opts / len(alld) if alld else None
if per and tr and tf:
    ws = per * (NB['random'] * tr + NB['forge'] * tf)
    out['vi_rung3'] = {'optionsPerDecision': round(per, 2), 'branchGamesPerDecision': round(per * (NB['random'] + NB['forge'])),
                       'secRandomBranch': round(tr, 2), 'secForgeBranch': round(tf, 2), 'workerSecPerDecision': round(ws),
                       'decisionsPer7WorkerHour': round(7 * 3600 / ws, 1), 'decisionsPer10hNight': round(70 * 3600 / ws),
                       'undecidedShare': round(out['Q'] / out['complete'], 3) if out['complete'] else None}
print(json.dumps(out, indent=1))
PY
cat > var/lab-j150-local/bin/metrics.py <<'PY'
# J150's metrics (pc-results drafts/J150-move-atlas-2.md): one JSON object over every atlas.json under
# the data folder's lab-j150 (3 phase-A folders a-*, 9 spine folders b-*). Standard library only; no engine.
import glob, json, math, os
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'guardViolations': 0, 'g5keys': 0, 'refusedCast': 0,
       'noRepeatRefused': 0, 'noRepeatNoOp': 0, 'refusedCastFf5': 0, 'refusedCastSpinesFf5': 0, 'decisions': 0, 'sameBest': 0, 'meanRho': None, 'unitsShort': 0, 'reads': 0}
rhos = []
D = '/home/justin-a/code/lab/data/lab-j150'
for f in sorted(glob.glob(D + '/[ab]-*/atlas.json')):
    d = json.load(open(f))
    c = d['checks']
    g = c['guardrails']
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['guardViolations'] += g.get('violations', 0)
    out['g5keys'] += 1 if 'refusedCast' in g else 0
    for k in ('refusedCast', 'noRepeatRefused', 'noRepeatNoOp'):
        out[k] += g.get(k, 0)
    name = os.path.basename(os.path.dirname(f))
    if name == 'a-ff5' or name.startswith('b-ff5-'):
        out['refusedCastFf5'] += g.get('refusedCast', 0)
    if name.startswith('b-ff5-'):
        out['refusedCastSpinesFf5'] += g.get('refusedCast', 0)
    b = d.get('phaseB')
    if b:
        out['spinesDone'] += 1
        out['decisions'] += len(b['decisions'])
        out['sameBest'] += b['agreement']['sameBest']
        rhos += [x['rho'] for x in b['decisions'] if x['complete'] and x['rho'] is not None]
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
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
    out['reads'] = 1 if len(r['spines']) == 3 and sum(len(v) for v in r['spines'].values()) == 9 else 0
except (OSError, ValueError, KeyError):
    pass
print(json.dumps(out))
PY
# reads.py on J148's own atlas (one pair, one spine): it must give J148's published numbers
python3 -I var/lab-j150-local/bin/reads.py ff5:451:var/lab-j142/atlas/atlas.json > var/lab-j150-local/reads-j148.json
python3 -I -c "import json; d = json.load(open('var/lab-j150-local/reads-j148.json')); ok = (d['decided'], d['Q'], d['i_sameBest']['point'], d['ii_rho']['n'], d['ii_rho']['point'], d['iv_repeat']['C1_castNow']['random']['point'], d['iv_repeat']['C2_dontAttack']['random']['point']) == (27, 22, 0.3182, 18, -0.3416, 0.0129, 0.0588); print(1 if ok else 0)" > var/lab-j150-local/reads-self.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J150
export CUBELAB_WORKER_XMX=4096m
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh atlas-selftest --jobs {workers} && echo 1 > var/lab-j150-local/selftest.txt || echo 0 > var/lab-j150-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j150-local/identity.txt || echo 0 > var/lab-j150-local/identity.txt
S=tools/ai-bench/decks/sets
tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 4600 --rollouts 60 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --unit-timeout 30 --jobs {workers} --out var/lab-j150/pilot || true
```
metrics: datadir = sh: cat var/lab-j150-local/datadir.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j150-local/merged.txt 2>/dev/null || echo 0
metrics: has_g5 = sh: cat var/lab-j150-local/has-g5.txt 2>/dev/null || echo 0
metrics: has_watchdog = sh: cat var/lab-j150-local/has-watchdog.txt 2>/dev/null || echo 0
metrics: has_heap = sh: cat var/lab-j150-local/has-heap.txt 2>/dev/null || echo 0
metrics: has_checker = sh: cat var/lab-j150-local/has-checker.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j150-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j150-local/reads-self.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j150-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j150-local/identity.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -c "import json; d=json.load(open('/home/justin-a/code/lab/data/lab-j150/pilot/atlas.json')); g=d['checks']['guardrails']; print(json.dumps({'problems': len(d['checks']['problems']), 'played': d['phaseA']['played'], 'decisions': len(d['phaseB']['decisions']), 'g5': 1 if 'refusedCast' in g and 'noRepeatRefused' in g and 'noRepeatNoOp' in g else 0, 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0), 'guardViolations': g['violations']}))" 2>/dev/null || echo '{"problems":-1}'
check: datadir == 1
check: data_free_gb >= 50
check: merged == 1
check: has_g5 == 1
check: has_watchdog == 1
check: has_heap == 1
check: has_checker == 1
check: xmx_unset == 1
check: reads_self == 1
check: selftest == 1
check: identity == 1
check: pilot.problems == 0
check: pilot.played == 60
check: pilot.decisions == 2
check: pilot.g5 == 1
check: pilot.refusedCast >= 1
check: pilot.guardViolations == 0

## Commands
One block a pair: its phase A, then its three spines. Every atlas command resumes what is done. An atlas
that finds a problem exits 3 and the block goes on to the next spine (the exit is kept in
`/home/justin-a/code/lab/data/lab-j150/exits.txt`); the final checks read every folder's `atlas.json`. Each block asserts the data folder
and its 50 GB again before it plays.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J150: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j150
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J150: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J150
export CUBELAB_WORKER_XMX=4096m
S=tools/ai-bench/decks/sets
A=$S/fair-fight-900000005-A.dck; B=$S/fair-fight-900000005-B.dck
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 452 --rollouts 2400 --phase a --jobs {workers} --out var/lab-j150/a-ff5 || rc=$?; echo "a-ff5 $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
for s in 452 453 454; do
  rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed $s --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j150/b-ff5-$s || rc=$?; echo "b-ff5-$s $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
done
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J150: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j150
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J150: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J150
export CUBELAB_WORKER_XMX=4096m
S=tools/ai-bench/decks/sets
A=$S/peasant-900000007-A.dck; B=$S/peasant-900000007-B.dck
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 455 --rollouts 2400 --phase a --jobs {workers} --out var/lab-j150/a-peasant7 || rc=$?; echo "a-peasant7 $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
for s in 455 456 457; do
  rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed $s --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j150/b-peasant7-$s || rc=$?; echo "b-peasant7-$s $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
done
```
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J150: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j150
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J150: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J150
export CUBELAB_WORKER_XMX=4096m
S=tools/ai-bench/decks/sets
A=$S/vintage-900000007-A.dck; B=$S/vintage-900000007-B.dck
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 458 --rollouts 2400 --phase a --jobs {workers} --out var/lab-j150/a-vintage7 || rc=$?; echo "a-vintage7 $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
for s in 458 459 460; do
  rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed $s --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j150/b-vintage7-$s || rc=$?; echo "b-vintage7-$s $rc" >> /home/justin-a/code/lab/data/lab-j150/exits.txt
done
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j150
mkdir -p $D/report
for d in $D/a-* $D/b-*; do
  n=$(basename "$d")
  cp "$d/atlas.json" "$D/report/$n.atlas.json"
  cp "$d/atlas.md" "$D/report/$n.atlas.md"
done
args=""
for p in ff5 peasant7 vintage7; do
  args="$args $p:A:$D/a-$p/atlas.json"
  for d in $D/b-$p-*; do args="$args $p:${d##*-}:$d/atlas.json"; done
done
python3 -I var/lab-j150-local/bin/reads.py $args > $D/report/reads.json
cp $D/exits.txt $D/report/exits.txt
```
check: played_a_ff5 == 2400
check: played_a_peasant7 == 2400
check: played_a_vintage7 == 2400
check: engine_errors <= 72
check: unit_errors == 0
check: atlas.atlases == 12
check: atlas.spinesDone == 9
check: atlas.unitsShort == 0
check: atlas.g5keys == 12
check: atlas.refusedCastFf5 >= 1
check: atlas.refusedCastSpinesFf5 >= 1
check: atlas.guardViolations == 0
check: atlas.problems == 0
check: atlas.reads == 1

## Abort if
abort: played_a >= 500 and engine_errors > played_a * 0.02
abort: unit_errors > 30
abort: data_free_gb < 50
`unit_errors` counts every `"ok":false` line, a first attempt that a retry then finished included (J148 had
11 such lines for 6 units), so the final `unit_errors == 0` is strict on purpose: every unit finished on its
first try. `atlas.unitsShort` is the plainer "every planned unit finished": min(16, listed) x (8 + 2) distinct
ok units a spine, summed over the nine.

## Report
collect: /home/justin-a/code/lab/data/lab-j150/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j150/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j150/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j150/report/exits.txt
The summary says, for Justin, in plain words and numbers only:
- **Phase A, per pair:** the outcome distribution, the game length, and the rollouts a +/- 2-point interval
  needed.
- **Reads (i) to (vi),** as `reads.json` gives them, each with its interval and n:
  - (i) the agreement before the game is decided, pooled and per pair;
  - (ii) rho, per pair and pooled, and how many rankable decisions have two options;
  - (iii) regret at Forge's choice by kind, under each map, and how many decisions clear zero;
  - (iv) C1 and C2 on the repeat pair, each **HOLDS** or **NOT SHOWN** by the registered rule, with the
    Forge map's numbers beside, and the note that J150's random policy is not J148's (G5);
  - (v) the guardrail counts per pair, `payfail` beside G5's;
  - (vi) the rung 3 sizing line.
- **Per spine,** one line: its decisions, decided / Q, same best, and mean rho.
- **The checks,** with any exit in `exits.txt` explained.
- **The intervals' coarseness:** with three pairs the pooled interval's pair level is coarse (three pairs
  resample to only ten distinct compositions), and with three spines a pair so is each pair's spine level;
  say so beside every pooled and per-pair interval.
- **No verdict:** D451 has none. Any other surprise is a candidate until a fresh seed and a second pair
  show it again.

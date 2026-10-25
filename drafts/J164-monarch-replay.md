id: J164
title: The Monarch replay -- J162's pauper5 464 spine re-branched at exactly its eight Monarch decisions (d17, d19, d21, d23, d25, d27, d29, d31; 36 options, 8,640 branch games, J162's seeds) on the fixed copier (D479: a copied Monarch now draws and can change hands; with D476-D478) and re-labelled, so the shift the copier's bias caused is measured, side by side with J162's labels and never pooled with them; on ce42306a, a new data folder lab-j164
public_title: Move atlas: the Monarch replay
public_est: ~85 min
public_decides: None by itself; measures the copier fix on eight pauper5 labels
cpu: heavy
cores: 6
max_workers: 6
mem_per_worker_gb: 2.7
repos: mtg-table@ce42306a (origin/main: D479 #205 with #206's follow-ups, on D476 #201, D477 #202, D478 #203 and #204; merged == 1, checked by the pilot)
decides: nothing by itself. D479 found that every copy the atlas forked held a Monarch with no triggers (Forge's copier drops an effect card's triggers), so at J162 pauper5 464's d17-d31 the monarch at the fork never drew and could never lose the crown by combat damage; D479 says those maps and labels are not pooled across the fix "unless recomputed". This job recomputes them: the same plan, baseline, decisions, seeds and branch counts on the fixed copier, and reads how far the bias had moved the values, the labels, the best options and the one confident label in the range (d29)
hypothesis: none to confirm. Direction expected from the mechanism, not registered as a rule: where seat B held the Monarch at the fork (d17, d19, d21, d25) seat A's values fall, where seat A held it (d23, d27, d29, d31) they rise; J162's rows show the copied Monarch drew 0 times in 8,640 branches (a Monarch made later in a branch drew in 2,375), and at d27-d31 almost no branch made a new one, so the bias is largest there
rule: D451 (method; no outcome rule), D479 (comparability: not pooled), D478 (capped branches are draws). Pre-registered here, before any J164 game: the reads (i)-(v) as computed by var/lab-j164-local/bin/shift.py, the Monarch counter var/lab-j164-local/bin/monarch.py, and the labels by J162's labels.py byte for byte (sha256 0020dbbf...), all proved on J162's own rows by sha256 in the pilot. No read carries a verdict
followup: morning-read
est: ~1.4 h at 6 workers: pilot ~20 min (self-tests ~6, J162's readers ~3, a 450-branch smoke ~8); the spine ~1.0 h (phase B ~45 min: J162's own 80 units for these decisions summed 4.41 worker-hours, list-scheduled on 6 workers 0.74 h; the serial checks ~16 min, J162's 27 min scaled by frame logs, 17,280 of 28,800); report ~3 min
resumable: yes
timeout: 3h
progress: lines /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/branches.jsonl of 8640
metrics: branches = lines /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/branches.jsonl "\"engineError\":true"
metrics: branch_timeouts = count /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/branches.jsonl "\"timedOut\":true"
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j164/b-pauper5-464/phaseB/logs/*.log "Didn't find what to pay for"
metrics: armed = sh: cat var/lab-j164-local/armed.txt 2>/dev/null || echo 0
metrics: atlas = sh: python3 -I var/lab-j164-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j164') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: branches, atlas.decisionsComplete, atlas.problems, atlas.timeoutShare, atlas.seedsMatch, atlas.forkDrawBranches, atlas.forkStealBranches, atlas.labels, atlas.skipLines

**Why.** D479 (#205, 2026-10-24) found that Forge's `GameCopier` builds an effect card from its name, type,
statics and spell abilities only, so on every fork the atlas made **The Monarch had no triggers**: the copied
monarch never drew at its end step and never lost the crown to combat damage. D479's exposure table names
**J162's pauper5 464 d17-d31** as the place a fork's game most plausibly differs (8,640 branch games, the
Monarch in a command zone at every fork), and its comparability rule says maps and labels from before and after
the fix are **not pooled unless recomputed**. J162's pauper5 spine gave the night's largest labels (three
confident: d10, d12, d29). This job recomputes exactly the Monarch decisions on the fixed copier, so their labels
rest on a correct copy and the size of the bias is measured, not guessed.

**Which decisions, and why eight, not eleven.** J162's pauper5 spine branched 16 of its 32 listed decisions
(D451's `spread`): d0, 2, 4, 6, 8, 10, 12, 14, 17, 19, 21, 23, 25, 27, 29, 31. Read from each fork's first state
frame (branch 0 of option 0, seat 0's log, the command zone public): **no Monarch at d0-d14, the Monarch at every
one of d17-d31** (seat B holds it at d17, d19, d21, d25; seat A at d23, d27, d29, d31), and monarch.py confirms it
on all 8,640 of their branch logs. That is **8 decisions, 36 options, 8,640 branch games** (200 random + 40 Forge
an option). D479's table says "The Monarch | 11 decisions | 9,089 branch games": that count spans J158's partial
pauper5 464, J162's and the J161/J162 pilots; **J162's own share is these 8 and 8,640**, the number D479 itself
gives for "J162's pauper5 d17-d31". d10 and d12, two of the three confident labels, forked before anyone was the
monarch, so the copier's Monarch could not touch them; they are **not replayed** and their J162 labels stand.

**What changed since J162's pin** (f6dba5e4, which already held D474; the pilot checks each is in ce42306a):
- **D479 (#205, #206): the carry pass.** The copy carries an effect card's triggers, replacement effects and SVars,
  every card's effect source, every "exiled with" link, and the timestamps in every zone. Its self-test
  `copy-monarch-triggers` (the copied Monarch has 2 triggers; Forge's own copy 0) runs in this pilot.
- **D478 (#203, #204): a capped branch is a draw** (`result` 0, `score` .5), checked by the atlas as a problem
  when not. **J162 wrote its capped branches as wins or losses**: 37 of the 8,640 rows replayed here are capped.
  So the registered shift (new - old) holds D478's rescoring too; shift.py also reports `shift478` (new - J162's
  rows rescored as D478 scores them), the part D478 does not explain. On J162's rows alone the rescoring moves a
  value by 0.23 points on average (max 1.25), so nearly all of a larger shift is the copier.
- **D476 (may-play hosts by id) and D477 (Karn restarts)**: no card in either pauper5 deck exercises them; any
  effect would show as a branch error or a `restarts` row, both counted.

**The subset, honestly.** `tools/cubelab.sh atlas` at the pin has no flag that branches chosen decisions:
`--decisions N` picks N evenly spaced (`spread`), and phase B plays every unit of those N whose id has no
`"ok":true` line in `phaseB/units.jsonl` (D465's resume). Trimming `baseline.json`'s decision list does not work
(a unit's decision is its index in the replayed game). So the prepare step (`prepare.py`, in the pilot):
1. checks J162's pauper5 464 `plan.json`, `phaseB/baseline.json`, the `phaseB/baseline/` tree (its rows, frames and
   ledger), `phaseB/branches.jsonl` and `atlas.json` against sha256 pins taken on 2026-10-24;
2. copies the plan and the baseline (never the branches) into `lab-j164/b-pauper5-464`, and checks the copies;
3. writes **80 skip lines** into the new folder's `units.jsonl` before anything plays, one per unit of the eight
   decisions it does not replay (8 decisions x (8 random + 2 Forge) units), each `"ok":true,"branches":0,
   "expected":0` with a `skipped` field that says why.

Then the unchanged atlas command, `--phase b --decisions 16` at J162's flags, finds the baseline, replays it to
each decision (a unit refuses a position whose options are not the baseline's), and plays **exactly the 80 units
of d17-d31**, every branch at J162's seed (`Atlas.branchSeed(seed, d, i)`), into a new `branches.jsonl`;
`writeAtlas` maps only decisions with branch rows. Every J164 reader counts a skip line apart, never as a
finished unit (`skipLines == 80`, `unitsShort == 0` over the 80 real units), no branch row may exist for a skipped
decision (`otherDecisionRows == 0`), and every new row's seed must equal J162's at the same decision, map, option
and branch index (`seedsMatch == 8640`). The smoke proves all of it on two decisions before the night.

**The design** (J162's for this spine, unchanged):

| | |
|---|---|
| spine | J162's pauper5 464 (pauper-900000005 A vs B, seed 464): its plan and its baseline game, copied, not replayed as a new baseline |
| decisions | J162's 16 in the plan; the 8 Monarch decisions played (d17-d31), the other 8 skipped |
| branches | every option **200 times random, 40 times Forge**, units of 25, J162's seeds |
| guardrails, timeouts | J162's: `--unit-timeout 30`, the 120-s branch timeout read inside a step (D467), `--branch-error-max` 0.1 (D466, D470), G1-G6 as D471 left them; D478's `--branch-capped-warn` 0.25 at its default (a warning, never a problem) |
| workers | 6 |
| data | `/home/justin-a/code/lab/data/lab-j164/` (new, created empty by the PC session before posting); J162's folder is read, never written |

**Never pooled.** D479: every search and atlas result across the fix is split by sha. These eight labels carry
`sha` ce42306a; J162's carry f6dba5e4. The report prints them **side by side** and never mixes them into one read:
J162's other eight pauper5 labels (d0-d14) and its other three spines stay J162's, on J162's tool.

**Where it writes: the lab data folder,** as J162: every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, and `--out var/lab-j164/...` is re-rooted there. The pilot asserts
`LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s `labDataDir`; `mkdir -p`s the folder;
stops under 50 GB free (~1.5 GB are expected: J162's pauper5 spine was 2.5 GB for 14,400 branch games); records
whether `lab-j164` held no spine folder when it first ran (`fresh`, checked). Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J164`) and the job's scripts (`var/lab-j164-local/`) stay in the clone.
**No `clean:`, and nothing is deleted there.** A restart from scratch needs `lab-j164` moved aside by hand and
`var/lab-j164-local/armed.txt` and `fresh.txt` removed.

**The abort lines read only this run's files** (the J152 lesson): gated on `armed == 1`, written by this pilot after
the data-folder guard and removed by the Report block's last line.

## The labels and the reads

`report/labels.jsonl` is **J162's labels.py, byte for byte** (sha256
`0020dbbf308e52b7ba3aa906ec16fde520c4baaf96b578bb55116885df782da5`; the rung-3 contract, `contract` still
`mtg-table rung-3 label v1 (J158)`, results/J158/labels-readme.md its table), run on the new folder with
`--sha` the pin: one row per replayed decision, 8 rows. J162's eight rows for the same decisions are copied beside
it (`report/j162-labels-d17-d31.jsonl`).

**Pre-registered reads** (shift.py; numbers only; definitions in its header, fixed before any J164 game):
- **(i) The shift.** Per option and map, the value on each copy (atlas.json's option mean, recomputed from the
  rows as decisionAtlas does; the reader must reproduce J162's atlas.json exactly) and **shift = new - old** with
  a **paired percentile bootstrap** over the branch indices both copies completed (same seed, same index): 10,000
  draws, seeds 150 + 7919 d + 101 o (+1 for the Forge map, +2 for `shift478`). Then, random map first and the
  Forge map beside: **the mean |shift| over the 36 options and the max** (which option, its interval), with
  `noiseFloor` beside (the mean |shift| no effect at all would give, from each option's bootstrap spread), the
  mean signed shift, and how many shifts are clear of 0 (about 5% would be by chance). `shift478` the same.
- **(ii) Labels whose confident status changes** (labels.py's `confident`, the regret's low end above 0 on the
  random map), old -> new; `confidentForge` beside.
- **(iii) Best-option flips**: `bestRandom` old -> new; `bestForge` beside.
- **(iv) J162's three confident pauper5 labels**: d29 (attack with Gurmag Angler, regret 16.0 [10.5, 21.5]) on
  the new copy, confident or not, with its regret old -> new; d10 and d12 **not replayed** (no Monarch at their
  forks), so they stand as J162's labels on J162's tool.
- **(v) Information, no verdict:** the mean signed random-map shift over the options of the B-held decisions and
  of the A-held ones; option 0's (Forge's own choice) shift per decision; the regret old -> new per label.

**The Monarch, observed** (monarch.py, from every branch's seat-0 frame log: the command zone and the stack
events are public). A Monarch trigger reaches the log as a `cast` event whose `cardId` is the Monarch card and whose
text is the trigger's. Counted per decision and map: branches with the Monarch at the fork; **branches in which the
fork's own Monarch card** (its id in the first state frame) **put its end-step draw on the stack** (`forkDraw`), and
**its combat-damage trigger** (`forkSteal`, the crown changing hands); the same for a Monarch card made after the
fork (`new*`, a player becoming the monarch again in the branch, whose effect Forge always built whole); and
branches whose frames ever show two Monarch cards at once (information). **On J162's rows: 0 fork draws and 0 fork
steals in 8,640 branches** (the Monarch at the fork in all of them), 2,375 branches with a new Monarch's draw, 0
double (pinned, sha256 `133876bc...`). On the new copy `forkDrawBranches >= 1` is a check: D479 reached the atlas.

**What nothing here says.** A shift is how far a value moved on this spine at these decisions; one spine says
nothing about the size of the bias on another pair. No C1/C2 read: pauper5's (iv) in J162 mixed decisions from
both sides of d17, and a recomputation would pool across D479.

## Pilot
About 20 minutes: the data folder and the abort gate; the pin carries D474, D476, D477, D478 and D479; the node
tests; three engine self-tests (`atlas-selftest`, `seat-identity`, `ai-bench --selftest` with D479's
`copy-monarch-triggers`); the inputs by sha256 and the skip lines; the readers proved on J162's own rows by sha256
(labels.py reproduces J162's eight label rows; shift.py reproduces J162's atlas.json and gives shift 0 against
itself; monarch.py gives the pinned counts); and a **smoke**: the same plan and baseline copied to
`lab-j164/pilot-smoke`, with skip lines for every decision but d17 and d19, played at 25 random and 25 Forge
branches an option (9 options, 450 branch games, 4 units), which must show 0 problems, both decisions complete, no
row for a skipped decision, every seed J162's, and the fork's own Monarch drawing in at least one branch.

**The pins** (taken on 2026-10-24 from the lab's files; every one reproduced by hand with these scripts):
- J162's inputs: `plan.json` `390eecce...64ab9`, `phaseB/baseline.json` `658cdb56...bcf`, the `phaseB/baseline/`
  tree `69f5e4b5...54` (sha256 of `find baseline -type f | LC_ALL=C sort | xargs sha256sum` from `phaseB/`),
  `phaseB/branches.jsonl` `c6672814...98`, `atlas.json` `b3122c96...73` (full hashes in prepare.py);
- J162's d17-d31 label rows (the canonical JSON of `report/labels.jsonl`'s pauper5 rows with d >= 17, in order):
  **`acd86b9518a4cfab9668846a4e4b951bde997ce7d787b87e74842de5a060b816`**, from the file and from labels.py run on
  J162's spine with `--sha=f6dba5e4`;
- monarch.py over J162's d17-d31 logs: **`133876bc9e753dfda80ea7897cc842772aa2168ae917ceb6b24ee161ad16f413`**.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J164: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J164: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j164 var/lab-j164-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J164: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J164: under 50 GB free on the data folder')"
echo 1 > var/lab-j164-local/datadir.txt
# fresh: lab-j164 held no spine folder when this pilot first ran (written once; a later pilot run keeps the first answer)
test -f var/lab-j164-local/fresh.txt || { if ls -d /home/justin-a/code/lab/data/lab-j164/b-* >/dev/null 2>&1; then echo 0; else echo 1; fi; } > var/lab-j164-local/fresh.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the Report block disarms it
echo 1 > var/lab-j164-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j164-local/merged.txt || echo 0 > var/lab-j164-local/merged.txt
git rev-parse --short=8 HEAD > var/lab-j164-local/sha.txt
grep -q 'carryPlainTimestampsForTest' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'zoneOnCopy' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'exileLinksLost' bridge/src/mtgtable/ai/Atlas.java && grep -q 'effectSourceNull' tools/cubelab/atlas.ts && grep -q 'copy-monarch-triggers' tools/ai-bench/AiBench.java && grep -q 'copy-mirror-zone' tools/ai-bench/AiBench.java && echo 1 > var/lab-j164-local/has-d479.txt || echo 0 > var/lab-j164-local/has-d479.txt
grep -q 'bCappedNotDrawn' tools/cubelab/atlas.ts && grep -q 'branch-capped-warn' tools/cubelab/atlas.ts && echo 1 > var/lab-j164-local/has-d478.txt || echo 0 > var/lab-j164-local/has-d478.txt
grep -q 'restarts' tools/cubelab/atlas.ts && grep -q 'karn-restart-fork' tools/ai-bench/AiBench.java && grep -q 'adventure-map' tools/ai-bench/AiBench.java && grep -q 'copy-stale-monarch' tools/ai-bench/AiBench.java && echo 1 > var/lab-j164-local/has-d474-d477.txt || echo 0 > var/lab-j164-local/has-d474-d477.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j164-local/xmx-unset.txt || echo 0 > var/lab-j164-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts
cat > var/lab-j164-local/bin/labels.py <<'PY'
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
cat > var/lab-j164-local/bin/shift.py <<'PY'
# J164's shift reader (pc-results drafts/J164-monarch-replay.md), registered before any J164 game. Standard library only;
# no engine. From two spine folders of ONE atlas plan (J162's pauper5 464 and J164's replay of it) it writes, per replayed
# decision and option and for each map, the option's value on each copy and the shift between them, then reads (i)-(v).
#   shift.py OUT.json --old=DIR --new=DIR --decisions=17,19,... [--old-labels=FILE --new-labels=FILE]
# Definitions (fixed before any J164 data):
#   value      atlas.json's option mean, recomputed from branches.jsonl exactly as atlas.ts's decisionAtlas does: per map
#              ("continuation"), the branch indices at which EVERY option of the decision has a played row (no error, not
#              unavailable), each option's mean score over them (a win 1, a draw .5, a loss 0), rounded to 4 places. The
#              reader's old values must equal J162's atlas.json for these decisions (`reproducesOld`, a pilot check)
#   old478     J162's rows rescored as D478 scores them on the new tool: a capped or timed-out played row is a draw (.5).
#              J162 wrote every capped branch as `result` 1 (D478), so `shift` = new - old holds D478's rescoring AND
#              D479's Monarch; `shift478` = new - old478 is the part D478 does not explain. Both are reported; `shift` is
#              the registered one (the label as published against the label on the correct copy)
#   shift      new value - old value (points = x 100 in the summary); its interval is a paired percentile bootstrap over
#              the branch indices complete on BOTH copies (both copies play branch i of every option on one seed, so the
#              pairing is by seed): 10,000 draws of those indices with replacement, the shift recomputed on each, the 2.5th
#              and 97.5th percentiles; seed 150 + 7919 d + 101 o (+ 1 for the Forge map, + 2 for shift478). `pairedPoint`
#              is the shift over those common indices (equal to the point when neither copy dropped a branch)
#   clear      a shift whose interval excludes 0
#   noiseFloor what mean |shift| would be with no effect at all: the mean over options of se * sqrt(2 / pi), se the
#              bootstrap standard deviation of the option's shift (the expected |N(0, se^2)|)
# Reads (registered):
#   (i)   mean |shift| over every option of the replayed decisions, random map (the Forge map beside), with noiseFloor
#         beside it; the max |shift| and its option; how many shifts are clear of 0 (about 5% would be by chance)
#   (ii)  labels whose confident status changes (old label rows against new, labels.py's `confident`; `confidentForge`
#         beside)
#   (iii) best-option flips: `bestRandom` differs between the two label rows (`bestForge` beside)
#   (iv)  J162's three confident pauper5 labels (d10, d12, d29): each one's status on the new copy where it was replayed,
#         else "not replayed" (forked before the Monarch existed in the game)
#   (v)   information only: the mean signed random-map shift over the options of the decisions where seat B held the
#         Monarch at the fork and where seat A did (from monarch.py's forkHolder), and option 0's (Forge's choice) shift
#         per decision; and the label's regret old -> new
import json, math, random, sys

B, SEED = 10000, 150
opt = {}
for a in sys.argv[2:]:
    k, _, v = a[2:].partition('=')
    opt[k] = v
OUT = sys.argv[1]
DS = [int(x) for x in opt['decisions'].split(',')]


def rows(spine):
    out = []
    for line in open(spine + '/phaseB/branches.jsonl'):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        if r['d'] in DS:
            out.append(r)
    return out


def r4(x):
    # atlasmath.ts r4: Math.round(x * 1e4) / 1e4 (half up)
    return math.floor(x * 1e4 + 0.5) / 1e4


def score(r, rescore):
    if rescore and (r.get('capped') or r.get('timedOut')):
        return 0.5
    return r['score']


def matrix(rs, d, c, k, rescore=False):
    by = {}
    for r in rs:
        if r['d'] != d or r['c'] != c or r.get('error') or r.get('unavailable'):
            continue
        by.setdefault(r['i'], [None] * k)[r['o']] = score(r, rescore)
    return {i: v for i, v in by.items() if all(x is not None for x in v)}


def stat(col):
    n = len(col)
    w = sum(1 for s in col if s == 1)
    l = sum(1 for s in col if s == 0)
    dr = n - w - l
    return {'n': n, 'wins': w, 'draws': dr, 'losses': l, 'mean': r4((w + dr / 2) / n) if n else None}


def boot(mo, mn, o, seed):
    common = sorted(set(mo) & set(mn))
    if len(common) < 2:
        return None, [None, None], None, len(common)
    diff = [mn[i][o] - mo[i][o] for i in common]
    n = len(diff)
    pp = sum(diff) / n
    rng = random.Random(seed)
    xs = []
    for _ in range(B):
        s = 0.0
        for j in rng.choices(range(n), k=n):
            s += diff[j]
        xs.append(s / n)
    xs.sort()
    m = sum(xs) / B
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (B - 1))
    return round(pp, 4), [round(xs[int(0.025 * B)], 4), round(xs[min(B - 1, int(0.975 * B))], 4)], sd, n


old_dir, new_dir = opt['old'], opt['new']
ro, rn = rows(old_dir), rows(new_dir)
base = json.load(open(old_dir + '/phaseB/baseline.json'))['decisions']
atl_old = {x['d']: x for x in json.load(open(old_dir + '/atlas.json'))['phaseB']['decisions']}
res = {'decisions': DS, 'oldRows': len(ro), 'newRows': len(rn),
       'oldCappedOrTimedOut': sum(1 for r in ro if (r.get('capped') or r.get('timedOut')) and not r.get('error') and not r.get('unavailable')),
       'newCappedOrTimedOut': sum(1 for r in rn if (r.get('capped') or r.get('timedOut')) and not r.get('error') and not r.get('unavailable')),
       'options': [], 'reproducesOld': 1, 'reproduceMismatches': []}
for d in DS:
    k = len(base[d]['tokens'])
    for c in ('random', 'forge'):
        mo, mo8, mn = matrix(ro, d, c, k), matrix(ro, d, c, k, True), matrix(rn, d, c, k)
        for o in range(k):
            so = stat([v[o] for v in mo.values()])
            so8 = stat([v[o] for v in mo8.values()])
            sn = stat([v[o] for v in mn.values()])
            a = atl_old.get(d)
            ref = a['options'][o][c] if a else None
            if not ref or any(ref[x] != so[x] for x in ('n', 'wins', 'draws', 'losses', 'mean')):
                res['reproducesOld'] = 0
                res['reproduceMismatches'].append('d%d %s o%d: %s vs %s' % (d, c, o, so, ref))
            sd0 = SEED + 7919 * d + 101 * o + (1 if c == 'forge' else 0)
            pp, iv, se, nc = boot(mo, mn, o, sd0)
            pp8, iv8, se8, _ = boot(mo8, mn, o, sd0 + 2)
            sh = None if so['mean'] is None or sn['mean'] is None else round(sn['mean'] - so['mean'], 4)
            sh8 = None if so8['mean'] is None or sn['mean'] is None else round(sn['mean'] - so8['mean'], 4)
            res['options'].append({'d': d, 'kind': base[d]['kind'], 'o': o, 'token': base[d]['tokens'][o], 'label': base[d]['labels'][o],
                                   'map': c, 'old': so, 'old478': so8, 'new': sn, 'commonIndices': nc,
                                   'shift': sh, 'pairedPoint': pp, 'interval': iv, 'se': None if se is None else round(se, 5),
                                   'clear': iv[0] is not None and (iv[0] > 0 or iv[1] < 0),
                                   'shift478': sh8, 'interval478': iv8, 'clear478': iv8[0] is not None and (iv8[0] > 0 or iv8[1] < 0)})


def read_i(c, key='shift', ivk='interval', clk='clear'):
    xs = [x for x in res['options'] if x['map'] == c and x[key] is not None]
    if not xs:
        return None
    mx = max(xs, key=lambda x: abs(x[key]))
    return {'options': len(xs), 'meanAbsShift': round(sum(abs(x[key]) for x in xs) / len(xs), 4),
            'noiseFloor': round(sum(x['se'] * math.sqrt(2 / math.pi) for x in xs if x['se'] is not None) / len(xs), 4),
            'meanSignedShift': round(sum(x[key] for x in xs) / len(xs), 4),
            'maxAbsShift': mx[key], 'maxAt': 'd%d o%d %s (%s)' % (mx['d'], mx['o'], mx['token'], mx['label']), 'maxInterval': mx[ivk],
            'clear': sum(1 for x in xs if x[clk]), 'clearList': ['d%d o%d %s %+.4f %s' % (x['d'], x['o'], x['label'], x[key], x[ivk]) for x in xs if x[clk]]}


res['i_shift'] = {'random': read_i('random'), 'forge': read_i('forge')}
res['i_shift478'] = {'random': read_i('random', 'shift478', 'interval478', 'clear478'), 'forge': read_i('forge', 'shift478', 'interval478', 'clear478')}


def labels(f):
    out = {}
    if f:
        for line in open(f):
            if line.strip():
                r = json.loads(line)
                if r.get('pair') == 'pauper5':
                    out[r['d']] = r
    return out


lo, ln = labels(opt.get('old-labels')), labels(opt.get('new-labels'))
side = []
for d in DS:
    a, b = lo.get(d), ln.get(d)
    if not a or not b:
        side.append({'d': d, 'missing': 'old' if not a else 'new'})
        continue
    side.append({'d': d, 'kind': a['kind'], 'turn': a['turn'], 'forgeToken': a['forgeToken'],
                 'old': {k: a[k] for k in ('bestRandom', 'bestForge', 'regret', 'regretLo', 'regretHi', 'regretForge', 'regretForgeLo', 'regretForgeHi', 'confident', 'confidentForge', 'complete', 'inQ', 'settled', 'gap', 'rho', 'sameBest', 'void')},
                 'new': {k: b[k] for k in ('bestRandom', 'bestForge', 'regret', 'regretLo', 'regretHi', 'regretForge', 'regretForgeLo', 'regretForgeHi', 'confident', 'confidentForge', 'complete', 'inQ', 'settled', 'gap', 'rho', 'sameBest', 'void')}})
res['labelsSideBySide'] = side
ok = [s for s in side if 'missing' not in s]
res['ii_confidentChanged'] = ['d%d %s -> %s' % (s['d'], s['old']['confident'], s['new']['confident']) for s in ok if s['old']['confident'] != s['new']['confident']]
res['ii_confidentForgeChanged'] = ['d%d %s -> %s' % (s['d'], s['old']['confidentForge'], s['new']['confidentForge']) for s in ok if s['old']['confidentForge'] != s['new']['confidentForge']]
res['ii_confidentOld'] = sum(1 for s in ok if s['old']['confident'])
res['ii_confidentNew'] = sum(1 for s in ok if s['new']['confident'])
res['iii_bestRandomFlips'] = ['d%d o%s -> o%s' % (s['d'], s['old']['bestRandom'], s['new']['bestRandom']) for s in ok if s['old']['bestRandom'] != s['new']['bestRandom']]
res['iii_bestForgeFlips'] = ['d%d o%s -> o%s' % (s['d'], s['old']['bestForge'], s['new']['bestForge']) for s in ok if s['old']['bestForge'] != s['new']['bestForge']]
res['iv_j162Confident'] = {}
for d in (10, 12, 29):
    s = next((x for x in ok if x['d'] == d), None)
    res['iv_j162Confident']['d%d' % d] = 'not replayed (forked before the Monarch existed in the game; J162 label stands)' if d not in DS else (
        'missing' if s is None else ('survives' if s['new']['confident'] else 'does not survive') + ' (regret %s [%s, %s] -> %s [%s, %s])' % (
            s['old']['regret'], s['old']['regretLo'], s['old']['regretHi'], s['new']['regret'], s['new']['regretLo'], s['new']['regretHi']))
mon = json.load(open(opt['monarch'])) if opt.get('monarch') else None
res['v_byHolder'] = None
if mon:
    hold = {}
    for d in DS:
        h = mon['byDecision'].get('d%d' % d, {})
        a, n = h.get('random_forkHolderA', 0) + h.get('forge_forkHolderA', 0), h.get('random_monarchAtFork', 0) + h.get('forge_monarchAtFork', 0)
        hold[d] = 'A' if n and a == n else 'B' if n and a == 0 else 'mixed'
    grp = {}
    for x in res['options']:
        if x['map'] == 'random' and x['shift'] is not None:
            grp.setdefault(hold[x['d']], []).append(x['shift'])
    res['v_byHolder'] = {'holder': {'d%d' % d: h for d, h in hold.items()},
                         'meanRandomShift': {h: {'options': len(v), 'mean': round(sum(v) / len(v), 4)} for h, v in sorted(grp.items())}}
res['v_option0'] = ['d%d %s: random %+.4f, forge %+.4f' % (d, base[d]['labels'][0],
                    next(x['shift'] for x in res['options'] if x['d'] == d and x['o'] == 0 and x['map'] == 'random') or 0,
                    next(x['shift'] for x in res['options'] if x['d'] == d and x['o'] == 0 and x['map'] == 'forge') or 0) for d in DS]
json.dump(res, open(OUT, 'w'), indent=1)
print(json.dumps({k: res[k] for k in ('oldRows', 'newRows', 'reproducesOld', 'oldCappedOrTimedOut', 'i_shift', 'ii_confidentChanged', 'iii_bestRandomFlips', 'iv_j162Confident')}, indent=1))
PY
cat > var/lab-j164-local/bin/monarch.py <<'PY'
# J164's Monarch counter (pc-results drafts/J164-monarch-replay.md): from each branch's seat-0 frame log (the command zone
# and the stack events are public), how often the Monarch's two triggers went on the stack, split by whether the trigger's
# source is THE FORK'S OWN Monarch card (the copier's card: its id in the log's first state frame) or a Monarch card made
# after the fork (a player became the monarch again in the branch: a fresh effect, whose triggers Forge always had).
# Standard library only; no engine. Usage: monarch.py OUT.json FRAMES_DIR D[,D...]
#   draw   a `cast` event whose cardId is a Monarch card and whose text is the end-step draw
#   steal  the same with the combat-damage trigger ("... its controller becomes the monarch.")
#   fork*  the trigger's source is the fork's own Monarch card; new* a Monarch card first seen after the fork
#   forkHolderA  the fork's Monarch is in seat A's ("Drafter A") command zone; doubleMonarch  a state frame shows a Monarch
#          card in two players' command zones at once (information: Forge keeps one monarch)
# Before D479 the fork's card had no triggers (D479's table), so fork* must be 0 on J162's rows; after it, fork draws are the
# copied Monarch drawing, and fork steals are it changing hands by combat damage.
import collections, glob, gzip, json, os, sys

DRAW = 'At the beginning of your end step, draw a card.'
STEAL = 'its controller becomes the monarch'


def scan(f):
    s = {'forkId': None, 'forkHolderA': 0, 'forkDraw': 0, 'forkSteal': 0, 'newDraw': 0, 'newSteal': 0, 'other': 0, 'double': 0}
    mon, first = set(), True
    with gzip.open(f, 'rt') as fh:
        for line in fh:
            if '"type":"state"' not in line:
                continue
            b = json.loads(line)['body']
            held = {p['name']: [c['id'] for c in p['zones']['command']['cards'] if c.get('name') == 'The Monarch'] for p in b['players']}
            ids = {i for v in held.values() for i in v}
            if sum(1 for v in held.values() if v) > 1:
                s['double'] = 1
            if first:
                first = False
                if len(ids) == 1:
                    s['forkId'] = next(iter(ids))
                    s['forkHolderA'] = 1 if held.get('Drafter A') else 0
            mon |= ids
            for e in b.get('events') or []:
                if e.get('kind') != 'cast' or e.get('cardId') not in mon:
                    continue
                t = e.get('text') or ''
                who = 'fork' if e['cardId'] == s['forkId'] else 'new'
                if t == DRAW:
                    s[who + 'Draw'] += 1
                elif STEAL in t:
                    s[who + 'Steal'] += 1
                else:
                    s['other'] += 1
    return s


def main():
    out, d0, ds = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
    res = {'logs': 0, 'unreadable': 0, 'byDecision': {}}
    tot = collections.Counter()
    for d in ds:
        agg = collections.Counter()
        for f in sorted(glob.glob(os.path.join(d0, 'd%d-*-seat0.jsonl.gz' % d))):
            c = 'random' if '-random-' in os.path.basename(f) else 'forge'
            try:
                s = scan(f)
            except (OSError, EOFError, ValueError):
                res['unreadable'] += 1
                continue
            res['logs'] += 1
            for k, v in (('branches', 1), ('monarchAtFork', s['forkId'] is not None), ('forkHolderA', s['forkHolderA']), ('doubleMonarch', s['double']),
                         ('forkDrawBranches', s['forkDraw'] > 0), ('forkDraws', s['forkDraw']),
                         ('forkStealBranches', s['forkSteal'] > 0), ('forkSteals', s['forkSteal']),
                         ('newDrawBranches', s['newDraw'] > 0), ('newDraws', s['newDraw']), ('newSteals', s['newSteal']), ('otherTriggers', s['other'])):
                agg[c + '_' + k] += int(v)
                tot[c + '_' + k] += int(v)
                tot['all_' + k] += int(v)
        res['byDecision']['d%d' % d] = dict(sorted(agg.items()))
    res['total'] = dict(sorted(tot.items()))
    json.dump(res, open(out, 'w'), indent=1, sort_keys=True)
    print(json.dumps(res['total'], sort_keys=True))


if __name__ == '__main__':
    main()
PY
cat > var/lab-j164-local/bin/metrics.py <<'PY'
# J164's metrics (pc-results drafts/J164-monarch-replay.md): one JSON object over ONE spine folder of the replay (the main
# spine, or the pilot's smoke with --replay=17,19 --random=25 --forge=25), its branch rows against J162's at the same keys
# (the same seed for the same decision, map, option and branch index), its units (J164's skip lines apart), its atlas.json,
# and the report's labels, shift and Monarch counts when present. Standard library only; no engine.
#   metrics.py [SPINE] [--replay=17,19,...] [--random=200] [--forge=40] [--chunk=25]
import json, os, sys

opt, args = {}, []
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
SP = args[0] if args else '/home/justin-a/code/lab/data/lab-j164/b-pauper5-464'
OLD = '/home/justin-a/code/lab/data/lab-j162/b-pauper5-464/phaseB/branches.jsonl'
REP = os.path.join(os.path.dirname(SP), 'report')
REPLAY = [int(x) for x in opt.get('replay', '17,19,21,23,25,27,29,31').split(',')]
NR, NF, CH = int(opt.get('random', 200)), int(opt.get('forge', 40)), int(opt.get('chunk', 25))
out = {'atlas': 0, 'problems': -1, 'warnings': -1, 'guardViolations': -1, 'zeroX': -1, 'xDrawn': 0, 'zeroXLeftOut': 0, 'g6keys': 0,
       'decisions': 0, 'decisionsComplete': 0, 'otherDecisions': 0, 'decisionList': '',
       'branchRows': 0, 'otherDecisionRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None,
       'branchErrored': 0, 'branchUnavailable': 0, 'engineErrors': 0, 'cappedRows': 0, 'cappedNotDrawn': 0,
       'unitsOk': 0, 'unitsFailed': 0, 'skipLines': 0, 'skipsInReplay': 0, 'unitsShort': -1,
       'seedsMatch': 0, 'seedsDiffer': 0, 'seedsMissing': 0, 'effectSourceNullBranches': 0, 'exileLinksLostBranches': 0,
       'labels': -1, 'rowsUnmatched': -1, 'voidLabels': -1, 'shiftOk': 0, 'forkDrawBranches': -1, 'forkStealBranches': -1, 'doubleMonarch': -1}
af = os.path.join(SP, 'atlas.json')
if os.path.exists(af):
    try:
        d = json.load(open(af))
        c, g = d['checks'], d['checks']['guardrails']
        out['atlas'] = 1
        out['problems'], out['warnings'] = len(c['problems']), len(c.get('warnings') or [])
        out['guardViolations'], out['zeroX'] = g.get('violations', 0), g.get('zeroX', -1)
        out['xDrawn'], out['zeroXLeftOut'] = g.get('xDrawn', 0), g.get('zeroXLeftOut', 0)
        out['g6keys'] = 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0
        b = d.get('phaseB') or {}
        ds = b.get('decisions') or []
        out['decisions'] = len(ds)
        out['decisionsComplete'] = sum(1 for x in ds if x['complete'] and x['d'] in REPLAY)
        out['otherDecisions'] = sum(1 for x in ds if x['d'] not in REPLAY)
        out['decisionList'] = ','.join(str(x['d']) for x in ds)
        out['effectSourceNullBranches'] = (b.get('effectSourceNull') or {}).get('branches', 0)
        out['exileLinksLostBranches'] = (b.get('exileLinksLost') or {}).get('branches', 0)
    except (OSError, ValueError, KeyError, TypeError):
        out['atlas'] = 0
old = {}
if os.path.exists(OLD):
    for line in open(OLD):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        old[(r['d'], r['c'], r['o'], r['i'])] = r['seed']
bf = os.path.join(SP, 'phaseB', 'branches.jsonl')
if os.path.exists(bf):
    for line in open(bf):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        out['branchRows'] += 1
        if r['d'] not in REPLAY:
            out['otherDecisionRows'] += 1
        if r.get('timedOut'):
            out['branchTimeouts'] += 1
            out['branchTimeoutsInStep'] += 1 if r.get('engineError') else 0
        out['branchErrored'] += 1 if r.get('error') else 0
        out['branchUnavailable'] += 1 if r.get('unavailable') else 0
        out['engineErrors'] += 1 if r.get('engineError') else 0
        if r.get('capped') and not r.get('error') and not r.get('unavailable'):
            out['cappedRows'] += 1
            out['cappedNotDrawn'] += 1 if (r.get('result') != 0 or r.get('score') != 0.5) else 0
        s = old.get((r['d'], r['c'], r['o'], r['i']))
        if s is None:
            out['seedsMissing'] += 1
        elif s == r['seed']:
            out['seedsMatch'] += 1
        else:
            out['seedsDiffer'] += 1
    if out['branchRows']:
        out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
want = {'d%d-%s-%d' % (dd, cc, i0) for dd in REPLAY for cc, n in (('random', NR), ('forge', NF)) for i0 in range(0, n, CH)}
ok = set()
uf = os.path.join(SP, 'phaseB', 'units.jsonl')
if os.path.exists(uf):
    for line in open(uf):
        try:
            u = json.loads(line)
        except ValueError:
            continue
        if u.get('skipped'):
            out['skipLines'] += 1
            out['skipsInReplay'] += 1 if u.get('d') in REPLAY else 0
            continue
        if u.get('ok'):
            out['unitsOk'] += 1
            ok.add(u['id'])
        else:
            out['unitsFailed'] += 1
    out['unitsShort'] = len(want - ok)
try:
    lb = json.load(open(os.path.join(REP, 'labels.json')))
    out['labels'], out['rowsUnmatched'], out['voidLabels'] = lb['labels'], lb['rowsUnmatched'], lb['voidLabels']
except (OSError, ValueError, KeyError):
    pass
try:
    sh = json.load(open(os.path.join(REP, 'shift.json')))
    out['shiftOk'] = 1 if sh['reproducesOld'] == 1 and len(sh['options']) == 2 * sum(1 for x in sh['options'] if x['map'] == 'random') > 0 and not any(s.get('missing') for s in sh['labelsSideBySide']) else 0
except (OSError, ValueError, KeyError):
    pass
try:
    mo = json.load(open(os.path.join(REP, 'monarch.json')))['total']
    out['forkDrawBranches'], out['forkStealBranches'], out['doubleMonarch'] = mo['all_forkDrawBranches'], mo['all_forkStealBranches'], mo['all_doubleMonarch']
except (OSError, ValueError, KeyError):
    pass
print(json.dumps(out))
PY
cat > var/lab-j164-local/bin/prepare.py <<'PY'
# J164's inputs (pc-results drafts/J164-monarch-replay.md): copy J162's pauper5 464 plan and baseline into a replay folder,
# sha256-checked against J162's files, and write the replay's skip lines. Standard library only; no engine.
#   prepare.py DEST --replay=17,19,... [--random=200] [--forge=40] [--chunk=25]
# THE SUBSET. tools/cubelab.sh atlas has no flag that branches a chosen subset of decisions: --decisions N picks N evenly
# spaced (atlasmath.ts spread), and a resumed phase B plays every unit of those N whose id has no `"ok":true` line in
# phaseB/units.jsonl (D465). J164 keeps J162's plan (--decisions 16, the same 16 decisions) and marks the units of the
# decisions it does NOT replay as done before the first run: one line per unit, `"ok":true,"branches":0,"expected":0`
# and a `skipped` field saying why. The atlas then plays exactly the replayed decisions' units, every one at J162's seeds,
# and writeAtlas maps only the decisions that have branch rows. Every J164 reader counts a skip line apart (metrics.py's
# skipLines, never a finished unit), and no branch row may exist for a skipped decision (otherDecisionRows == 0).
import hashlib, json, os, shutil, sys

SRC = '/home/justin-a/code/lab/data/lab-j162/b-pauper5-464'
PIN = {'plan.json': '390eecce638b2418a8b2b9559cee7032ffd5760d4f4ddf4afa49556464464ab9',
       'phaseB/baseline.json': '658cdb56c9c5db09a3ef9a73edf423a3f28b8dc8702d6ac76be0a21041d03bcf',
       'phaseB/baseline/': '69f5e4b5a8f245c9b73d872b7b42fcb590e55c4aaca8b753ec5fbeeb34797854',
       'phaseB/branches.jsonl': 'c6672814be48c93966bea612dba5d6dd2cb09f5fd718ed8f1056f3671aad6d98',
       'atlas.json': 'b3122c96e8d394b41316972586d04752b7826db9f716e04c9305c7206f2f9973'}
PLAN_KEYS = ('deckA', 'deckB', 'seed', 'turnCap', 'options', 'chunk', 'branchTimeoutSec')
WHY = 'J164: not replayed -- forked before the Monarch existed in this game; J162 map and label stand (the replay is the Monarch decisions)'


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def tree(root, rel):
    """sha256 of `cd root && find rel -type f | LC_ALL=C sort | xargs sha256sum`'s output."""
    fs = []
    for dp, _, names in os.walk(os.path.join(root, rel)):
        for n in names:
            fs.append(os.path.relpath(os.path.join(dp, n), root))
    fs.sort(key=lambda s: s.encode())
    return hashlib.sha256(''.join('%s  %s\n' % (sha(os.path.join(root, f)), f) for f in fs).encode()).hexdigest()


def digest(root, k):
    return tree(os.path.join(root, 'phaseB'), 'baseline') if k.endswith('/') else sha(os.path.join(root, k))


def main():
    dest = sys.argv[1]
    opt = dict(a[2:].partition('=')[::2] for a in sys.argv[2:] if a.startswith('--'))
    replay = [int(x) for x in opt['replay'].split(',')]
    nr, nf, ch = int(opt.get('random', 200)), int(opt.get('forge', 40)), int(opt.get('chunk', 25))
    out = {'dest': dest, 'srcOk': 1, 'srcBad': [], 'copied': 0, 'destOk': 1, 'destBad': [], 'skipLines': 0, 'skipWritten': 0, 'replay': replay}
    for k, v in PIN.items():
        if digest(SRC, k) != v:
            out['srcOk'] = 0
            out['srcBad'].append(k)
    branched = [x['d'] for x in json.load(open(os.path.join(SRC, 'atlas.json')))['phaseB']['decisions']]
    out['j162Branched'] = branched
    skip = [d for d in branched if d not in replay]
    out['skip'] = skip
    out['replayInJ162'] = 1 if all(d in branched for d in replay) else 0
    if out['srcOk'] and not os.path.exists(os.path.join(dest, 'phaseB', 'baseline.json')):
        os.makedirs(os.path.join(dest, 'phaseB'), exist_ok=True)
        shutil.copy2(os.path.join(SRC, 'plan.json'), os.path.join(dest, 'plan.json'))
        shutil.copy2(os.path.join(SRC, 'phaseB', 'baseline.json'), os.path.join(dest, 'phaseB', 'baseline.json'))
        shutil.copytree(os.path.join(SRC, 'phaseB', 'baseline'), os.path.join(dest, 'phaseB', 'baseline'), dirs_exist_ok=True)
        out['copied'] = 1
    for k in ('phaseB/baseline.json', 'phaseB/baseline/'):
        if not os.path.exists(os.path.join(dest, k)) or digest(dest, k) != PIN[k]:
            out['destOk'] = 0
            out['destBad'].append(k)
    # plan.json: J162's file until the first atlas run rewrites it with the pin's plan (D478 adds branchCappedWarn); the
    # keys the atlas refuses a changed plan on must be J162's either way
    try:
        a, b = json.load(open(os.path.join(SRC, 'plan.json'))), json.load(open(os.path.join(dest, 'plan.json')))
        out['planIsJ162'] = 1 if sha(os.path.join(dest, 'plan.json')) == PIN['plan.json'] else 0
        if any(a[k] != b[k] for k in PLAN_KEYS):
            out['destOk'] = 0
            out['destBad'].append('plan.json keys')
    except (OSError, ValueError, KeyError):
        out['destOk'] = 0
        out['destBad'].append('plan.json')
    uf = os.path.join(dest, 'phaseB', 'units.jsonl')
    want = ['d%d-%s-%d' % (d, c, i0) for d in skip for c, n in (('random', nr), ('forge', nf)) for i0 in range(0, n, ch)]
    if out['destOk'] and not os.path.exists(uf):
        with open(uf, 'w') as f:
            for d in skip:
                for c, n in (('random', nr), ('forge', nf)):
                    for i0 in range(0, n, ch):
                        f.write(json.dumps({'v': 1, 'id': 'd%d-%s-%d' % (d, c, i0), 'd': d, 'c': c, 'i0': i0, 'i1': min(n, i0 + ch), 'ok': True,
                                            'branches': 0, 'expected': 0, 'error': None, 'ms': None, 'cpuMs': None, 'attempts': 0,
                                            'engineErrors': 0, 'skipped': WHY}, separators=(',', ':')) + '\n')
                        out['skipWritten'] += 1
    have = set()
    if os.path.exists(uf):
        for line in open(uf):
            try:
                u = json.loads(line)
            except ValueError:
                continue
            if u.get('skipped') and u.get('ok'):
                have.add(u['id'])
    out['skipLines'] = len(have)
    out['skipExpected'] = len(want)
    out['ok'] = 1 if out['srcOk'] and out['destOk'] and out['replayInJ162'] and set(want) == have else 0
    print(json.dumps(out))
    sys.exit(0 if out['ok'] else 1)


if __name__ == '__main__':
    main()
PY
cat > var/lab-j164-local/bin/proj.py <<'PY'
# J164 pilot: the sha256 of the canonical JSON of a labels.jsonl's pauper5 rows at the replayed decisions (d >= 17), in
# file order. Usage: proj.py FILE [MIN_D]. J162's report/labels.jsonl gives the pin; labels.py on J162's own spine must too.
import hashlib, json, sys
md = int(sys.argv[2]) if len(sys.argv) > 2 else 17
rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
rows = [r for r in rows if r.get('pair') == 'pauper5' and r['d'] >= md]
print(hashlib.sha256(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()).hexdigest())
PY
test "$(sha256sum var/lab-j164-local/bin/labels.py | cut -d' ' -f1)" = 0020dbbf308e52b7ba3aa906ec16fde520c4baaf96b578bb55116885df782da5 && echo 1 > var/lab-j164-local/labels-py.txt || echo 0 > var/lab-j164-local/labels-py.txt
# J162's inputs by sha256, copied into the replay folder and the smoke's, and the skip lines written (prepare.py's header)
D=/home/justin-a/code/lab/data/lab-j164
J=/home/justin-a/code/lab/data/lab-j162
python3 -I var/lab-j164-local/bin/prepare.py $D/b-pauper5-464 --replay=17,19,21,23,25,27,29,31 > var/lab-j164-local/prepare.json && echo 1 > var/lab-j164-local/inputs.txt || echo 0 > var/lab-j164-local/inputs.txt
python3 -I var/lab-j164-local/bin/prepare.py $D/pilot-smoke --replay=17,19 --random=25 --forge=25 > var/lab-j164-local/prepare-smoke.json && echo 1 > var/lab-j164-local/inputs-smoke.txt || echo 0 > var/lab-j164-local/inputs-smoke.txt
mkdir -p $D/inputs && test -f $D/inputs/j162-b-pauper5-464-plan.json || cp $J/b-pauper5-464/plan.json $D/inputs/j162-b-pauper5-464-plan.json
# the readers on J162's own rows (read, never written): each must give J162's numbers, by sha256
P=acd86b9518a4cfab9668846a4e4b951bde997ce7d787b87e74842de5a060b816
python3 -I var/lab-j164-local/bin/labels.py pauper5:464:$J/b-pauper5-464 --out=var/lab-j164-local/labels-j162.jsonl --sha=f6dba5e4 > var/lab-j164-local/labels-j162.json || true
test "$(python3 -I var/lab-j164-local/bin/proj.py $J/report/labels.jsonl)" = $P && test "$(python3 -I var/lab-j164-local/bin/proj.py var/lab-j164-local/labels-j162.jsonl)" = $P && echo 1 > var/lab-j164-local/labels-j162.txt || echo 0 > var/lab-j164-local/labels-j162.txt
python3 -I var/lab-j164-local/bin/monarch.py var/lab-j164-local/monarch-j162.json $J/b-pauper5-464/phaseB/frames 17,19,21,23,25,27,29,31 || true
test "$(sha256sum var/lab-j164-local/monarch-j162.json | cut -d' ' -f1)" = 133876bc9e753dfda80ea7897cc842772aa2168ae917ceb6b24ee161ad16f413 && echo 1 > var/lab-j164-local/monarch-j162.txt || echo 0 > var/lab-j164-local/monarch-j162.txt
python3 -I var/lab-j164-local/bin/shift.py var/lab-j164-local/shift-j162.json --old=$J/b-pauper5-464 --new=$J/b-pauper5-464 --decisions=17,19,21,23,25,27,29,31 --old-labels=$J/report/labels.jsonl --new-labels=$J/report/labels.jsonl --monarch=var/lab-j164-local/monarch-j162.json > /dev/null || true
python3 -I -c "import json; d = json.load(open('var/lab-j164-local/shift-j162.json')); r, f = d['i_shift']['random'], d['i_shift']['forge']; ok = d['reproducesOld'] == 1 and d['oldRows'] == 8640 and d['oldCappedOrTimedOut'] == 37 and len(d['options']) == 72 and (r['options'], r['meanAbsShift'], r['clear'], f['options'], f['meanAbsShift'], f['clear']) == (36, 0.0, 0, 36, 0.0, 0) and d['ii_confidentChanged'] == [] and d['iii_bestRandomFlips'] == [] and d['v_byHolder']['holder'] == {'d17': 'B', 'd19': 'B', 'd21': 'B', 'd23': 'A', 'd25': 'B', 'd27': 'A', 'd29': 'A', 'd31': 'A'}; print(1 if ok else 0)" > var/lab-j164-local/shift-j162.txt 2>/dev/null || echo 0 > var/lab-j164-local/shift-j162.txt
# the engine self-tests at the pin
export CUBELAB_HOME_ROOT=var/cubelab/homes-J164
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh atlas-selftest --jobs 1 && echo 1 > var/lab-j164-local/selftest.txt || echo 0 > var/lab-j164-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j164-local/identity.txt || echo 0 > var/lab-j164-local/identity.txt
tools/ai-bench.sh --selftest > var/lab-j164-local/aibench-selftest.log 2>&1 || true
grep -Eq '^ai-bench selftest: [0-9]+ check\(s\), 0 failure\(s\)$' var/lab-j164-local/aibench-selftest.log && grep -q 'ok   the copied monarch effect has its 2 triggers' var/lab-j164-local/aibench-selftest.log && echo 1 > var/lab-j164-local/aibench.txt || echo 0 > var/lab-j164-local/aibench.txt
# the smoke: d17 and d19 at 25 + 25 branches an option, every other decision skipped, the same plan and baseline
S=tools/ai-bench/decks/sets
tools/cubelab.sh atlas --deck-a $S/pauper-900000005-A.dck --deck-b $S/pauper-900000005-B.dck --seed 464 --phase b --decisions 16 --branch-random 25 --branch-forge 25 --unit-timeout 30 --jobs {workers} --out var/lab-j164/pilot-smoke || true
python3 -I var/lab-j164-local/bin/monarch.py var/lab-j164-local/pilot-monarch.json $D/pilot-smoke/phaseB/frames 17,19 || true
```
metrics: datadir = sh: cat var/lab-j164-local/datadir.txt 2>/dev/null || echo 0
metrics: fresh = sh: cat var/lab-j164-local/fresh.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j164-local/merged.txt 2>/dev/null || echo 0
metrics: has_d479 = sh: cat var/lab-j164-local/has-d479.txt 2>/dev/null || echo 0
metrics: has_d478 = sh: cat var/lab-j164-local/has-d478.txt 2>/dev/null || echo 0
metrics: has_d474_d477 = sh: cat var/lab-j164-local/has-d474-d477.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j164-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: labels_py = sh: cat var/lab-j164-local/labels-py.txt 2>/dev/null || echo 0
metrics: inputs = sh: cat var/lab-j164-local/inputs.txt 2>/dev/null || echo 0
metrics: inputs_smoke = sh: cat var/lab-j164-local/inputs-smoke.txt 2>/dev/null || echo 0
metrics: prep = sh: cat var/lab-j164-local/prepare.json 2>/dev/null || echo '{"skipLines":-1}'
metrics: prep_smoke = sh: cat var/lab-j164-local/prepare-smoke.json 2>/dev/null || echo '{"skipLines":-1}'
metrics: labels_j162 = sh: cat var/lab-j164-local/labels-j162.txt 2>/dev/null || echo 0
metrics: monarch_j162 = sh: cat var/lab-j164-local/monarch-j162.txt 2>/dev/null || echo 0
metrics: monarch_old = sh: python3 -I -c "import json; print(json.dumps(json.load(open('var/lab-j164-local/monarch-j162.json'))['total']))" 2>/dev/null || echo '{"all_monarchAtFork":-1}'
metrics: shift_j162 = sh: cat var/lab-j164-local/shift-j162.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j164-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j164-local/identity.txt 2>/dev/null || echo 0
metrics: aibench = sh: cat var/lab-j164-local/aibench.txt 2>/dev/null || echo 0
metrics: smoke = sh: python3 -I var/lab-j164-local/bin/metrics.py /home/justin-a/code/lab/data/lab-j164/pilot-smoke --replay=17,19 --random=25 --forge=25 2>/dev/null || echo '{"problems":-1}'
metrics: smoke_monarch = sh: python3 -I -c "import json; print(json.dumps(json.load(open('var/lab-j164-local/pilot-monarch.json'))['total']))" 2>/dev/null || echo '{"all_forkDrawBranches":-1}'
check: datadir == 1
check: data_free_gb >= 50
check: fresh == 1
check: merged == 1
check: has_d479 == 1
check: has_d478 == 1
check: has_d474_d477 == 1
check: xmx_unset == 1
check: labels_py == 1
check: inputs == 1
check: inputs_smoke == 1
check: prep.skipLines == 80
check: prep_smoke.skipLines == 28
check: labels_j162 == 1
check: monarch_j162 == 1
check: monarch_old.all_monarchAtFork == 8640
check: monarch_old.all_forkDrawBranches == 0
check: monarch_old.all_forkStealBranches == 0
check: shift_j162 == 1
check: selftest == 1
check: identity == 1
check: aibench == 1
check: smoke.atlas == 1
check: smoke.problems == 0
check: smoke.decisionsComplete == 2
check: smoke.otherDecisions == 0
check: smoke.branchRows == 450
check: smoke.otherDecisionRows == 0
check: smoke.seedsMatch == 450
check: smoke.branchErrored == 0
check: smoke.branchTimeouts == 0
check: smoke.branchUnavailable == 0
check: smoke.cappedNotDrawn == 0
check: smoke.unitsShort == 0
check: smoke.unitsFailed == 0
check: smoke.skipLines == 28
check: smoke.guardViolations == 0
check: smoke.zeroX == 0
check: smoke_monarch.all_branches == 450
check: smoke_monarch.all_monarchAtFork == 450
check: smoke_monarch.all_forkDrawBranches >= 1

`smoke.branchErrored == 0` is strict on purpose: J162's rows at d17-d31 have no branch error, so any error in the
smoke is the new copier's and is read before 8,640 games are spent. `smoke_monarch.all_forkDrawBranches >= 1` is
the positive control of the whole job: on J162's tool the fork's own Monarch never drew (0 of 8,640), and on the
pin it must.

## Commands
One spine, then the report. The atlas command resumes what is done; an atlas that finds a problem exits 3 (kept in
`exits.txt`) and the report still runs. Before it plays, the block re-checks the inputs and the 80 skip lines
(prepare.py: J162's files by sha256, the copies, the skip lines), so a folder that lost them stops instead of
playing all 16 decisions.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J164: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j164
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J164: under 50 GB free on the data folder')"
python3 -I var/lab-j164-local/bin/prepare.py /home/justin-a/code/lab/data/lab-j164/b-pauper5-464 --replay=17,19,21,23,25,27,29,31
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J164
S=tools/ai-bench/decks/sets
n=b-pauper5-464; t0=$(date +%s)
rc=0; tools/cubelab.sh atlas --deck-a $S/pauper-900000005-A.dck --deck-b $S/pauper-900000005-B.dck --seed 464 --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j164/$n || rc=$?
echo "$n $rc" >> /home/justin-a/code/lab/data/lab-j164/exits.txt
echo "$n $t0 $(date +%s) {workers}" >> /home/justin-a/code/lab/data/lab-j164/spine-times.txt
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j164
J=/home/justin-a/code/lab/data/lab-j162
R=17,19,21,23,25,27,29,31
mkdir -p $D/report
: > $D/report/missing.txt
n=b-pauper5-464
cp $D/$n/atlas.json $D/report/$n.atlas.json || echo "$n: no atlas.json" >> $D/report/missing.txt
cp $D/$n/atlas.md $D/report/$n.atlas.md || echo "$n: no atlas.md" >> $D/report/missing.txt
# the new labels (J162's labels.py), and J162's for the same decisions beside them, never pooled
python3 -I var/lab-j164-local/bin/labels.py pauper5:464:$D/$n --out=$D/report/labels.jsonl --times=$D/spine-times.txt --sha=$(cat var/lab-j164-local/sha.txt) > $D/report/labels.json || echo "labels.py exited $?" >> $D/report/missing.txt
python3 -I -c "import json, sys; [sys.stdout.write(l) for l in open(sys.argv[1]) if l.strip() and json.loads(l)['pair'] == 'pauper5' and json.loads(l)['d'] >= 17]" $J/report/labels.jsonl > $D/report/j162-labels-d17-d31.jsonl || echo "J162 labels: none" >> $D/report/missing.txt
# the Monarch on the new copy, and J162's counts (the pilot's, pinned) beside
python3 -I var/lab-j164-local/bin/monarch.py $D/report/monarch.json $D/$n/phaseB/frames $R || echo "monarch.py exited $?" >> $D/report/missing.txt
cp var/lab-j164-local/monarch-j162.json $D/report/monarch-j162.json || echo "monarch-j162.json: none" >> $D/report/missing.txt
# the reads (i)-(v)
python3 -I var/lab-j164-local/bin/shift.py $D/report/shift.json --old=$J/$n --new=$D/$n --decisions=$R --old-labels=$D/report/j162-labels-d17-d31.jsonl --new-labels=$D/report/labels.jsonl --monarch=$D/report/monarch.json > $D/report/shift-head.json || echo "shift.py exited $?" >> $D/report/missing.txt
python3 -I var/lab-j164-local/bin/metrics.py > $D/report/tool.json || echo "metrics.py exited $?" >> $D/report/missing.txt
cp $D/exits.txt $D/report/exits.txt || echo "exits.txt: none" >> $D/report/missing.txt
cp $D/spine-times.txt $D/report/spine-times.txt || echo "spine-times.txt: none" >> $D/report/missing.txt
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j164-local/armed.txt
```
check: unit_errors == 0
check: atlas.atlas == 1
check: atlas.problems == 0
check: atlas.zeroX == 0
check: atlas.guardViolations == 0
check: atlas.cappedNotDrawn == 0
check: atlas.timeoutShare < 1%
check: engine_errors - atlas.branchTimeoutsInStep <= 30
check: atlas.decisionsComplete == 8
check: atlas.otherDecisions == 0
check: atlas.branchRows == 8640
check: atlas.otherDecisionRows == 0
check: atlas.unitsShort == 0
check: atlas.unitsFailed == 0
check: atlas.skipLines == 80
check: atlas.skipsInReplay == 0
check: atlas.seedsMatch == 8640
check: atlas.labels == 8
check: atlas.rowsUnmatched == 0
check: atlas.shiftOk == 1
check: atlas.forkDrawBranches >= 1

## Abort if
abort: armed == 1 and unit_errors > 10
abort: armed == 1 and engine_errors > 300
abort: data_free_gb < 50
`armed` is 1 only from this job's pilot to its Report block, so the first two cannot read another run's files.
`unit_errors` counts units that did not finish (the skip lines are `"ok":true` and never count); `atlas.unitsShort`
is "every one of the 80 real units finished". `engine_errors` counts branch rows with `engineError`: J162 had 0 at
these decisions, so 300 (J162's 500 scaled to 8,640 branches) stops a copier that throws Errors, while the checks
bound the rest (timeouts under 1% of 8,640, other engine errors at 30). `atlas.problems == 0` covers branch errors
and unavailable options past the 0.1 share (D466, D470), G6's `zeroX`, D478's capped branches not scored a draw and
unreadable frame logs; `atlas.zeroX` and `atlas.cappedNotDrawn` are checked by name too, so the summary can say
which fired. D479's `effectSourceNull` and `exileLinksLost` branches are reported, never checked (D479: never a
problem).

## Report
collect: /home/justin-a/code/lab/data/lab-j164/report/b-pauper5-464.atlas.md
collect: /home/justin-a/code/lab/data/lab-j164/report/b-pauper5-464.atlas.json
collect: /home/justin-a/code/lab/data/lab-j164/report/labels.jsonl
collect: /home/justin-a/code/lab/data/lab-j164/report/labels.json
collect: /home/justin-a/code/lab/data/lab-j164/report/j162-labels-d17-d31.jsonl
collect: /home/justin-a/code/lab/data/lab-j164/report/shift.json
collect: /home/justin-a/code/lab/data/lab-j164/report/shift-head.json
collect: /home/justin-a/code/lab/data/lab-j164/report/monarch.json
collect: /home/justin-a/code/lab/data/lab-j164/report/monarch-j162.json
collect: /home/justin-a/code/lab/data/lab-j164/report/tool.json
collect: /home/justin-a/code/lab/data/lab-j164/report/exits.txt
collect: /home/justin-a/code/lab/data/lab-j164/report/spine-times.txt
collect: /home/justin-a/code/lab/data/lab-j164/report/missing.txt
The summary says, for Justin, in plain words and numbers only:
- **The policy, first line:** these eight labels are on ce42306a (D479's copier, D478's draws), J162's on
  f6dba5e4; they are printed side by side and never pooled, and J162's other 51 labels are untouched.
- **The Monarch, observed** (`monarch.json` against `monarch-j162.json`): branches where the fork's own Monarch
  drew, and where it changed hands by combat damage, per decision and map, against J162's 0 and 0; new-Monarch
  draws beside; any double-Monarch frame.
- **(i)** the mean |shift| over the 36 options and the max with its option and interval, random map then Forge,
  with `noiseFloor` and the count clear of 0 beside; the same for `shift478`; a table of every option's shift
  (points) with its interval, old and new values and n.
- **(ii)-(iii)** each label's confident status and best option, old -> new, with the regret and its interval
  both ways (`labelsSideBySide`).
- **(iv)** d29's status on the new copy, with its regret old -> new; d10 and d12 not replayed and why.
- **(v)** the signed shift by Monarch holder, and option 0's shift per decision, as information.
- **The run:** the spine's wall time against the ~1.0-h estimate, branch games an hour, errors by text, timeouts,
  unavailable, capped (D478, scored .5), `effectSourceNull` / `exileLinksLost` branches (D479's counters), G6's
  counts, `payfail`, the checks, and anything in `exits.txt` or `missing.txt`.
- **No verdict:** a shift on one spine at eight decisions says how far these labels moved, not how far any other
  pair's would.

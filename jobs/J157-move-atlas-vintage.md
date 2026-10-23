id: J157
title: The move atlas, rung 2's vintage pair again on the fixed tool -- vintage-900000007 x three Forge-vs-Forge spine games at J156's seeds 458-460; phase A 2,400 random-vs-random rollouts; phase B 16 decisions a spine, every option forked 200 times random and 40 times Forge; on 9fe69ad8 (D466: the fork carries optional costs, branch errors are problems, G1 reads one land listing, a refused cast's card is put back, a truncated frame log is skipped); J156's reads, numbers only, read side by side with J156's vintage numbers and never pooled. Method only, no outcome rule beyond D451's
public_title: Move atlas 2b: the vintage pair again
public_est: ~5 h
public_decides: None by itself; the vintage pair of atlas rung 2 again, for Justin to read
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.7
repos: mtg-table@9fe69ad8 (the merge of #184 over 6fb13bf9: J156's atlas tool faults fixed (D466))
decides: nothing by itself. The vintage pair of rung 2 as J156 meant it: J156's vintage numbers rest on spine 458 at 9 of 16 complete decisions (retrace casts that did not fork), G1 flags that were the checker's, and a hand repair; this is the same pair at the same seeds on the fixed tool, so its reads stand on their own, beside J156's
hypothesis: none to confirm about the maps. J156's vintage reads are the comparison: (i) same best 0.393 [0.214, 0.583] over 28, (ii) rho -0.028 [-0.400, 0.412] over 21; read side by side, never pooled (D466 point 4 changed the random policy)
rule: D451 (method; no outcome rule) with D458 and D462 (G5) as D466 amends them, D459 (unit watchdog) and D466. Pre-registered here, before any J157 data: J156's reads (i)-(vi) over the three vintage spines and the side-by-side against J156's vintage numbers, computed by var/lab-j157-local/bin/reads.py exactly as written in the pilot. No read carries a verdict: (iv)'s HOLDS / NOT SHOWN was registered for the repeat pair (fair-fight-900000005) only, which J157 does not play
followup: morning-read
est: ~5 h at 7 workers (sizing below): pilot ~30 min; phase A 2,400 games ~0.5 h + its checks ~5 min; three spines of ~11,200 branch games on average, ~1.2 h each with their checks; reads ~1 min. Disk ~4.5 GB on the lab data folder /home/justin-a/code/lab/data (J156's vintage folders held 3.5 GB with 458 39% errored)
resumable: yes
timeout: 10h
progress: lines /home/justin-a/code/lab/data/lab-j157/a-*/phaseA/games.jsonl /home/justin-a/code/lab/data/lab-j157/b-*/phaseB/branches.jsonl of 36000
metrics: played_a_vintage7 = lines /home/justin-a/code/lab/data/lab-j157/a-vintage7/phaseA/games.jsonl
metrics: branches = lines /home/justin-a/code/lab/data/lab-j157/b-*/phaseB/branches.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j157/a-*/phaseA/games.jsonl "\"engineError\":\""
metrics: unit_errors = count /home/justin-a/code/lab/data/lab-j157/b-*/phaseB/units.jsonl "\"ok\":false"
metrics: payfail = count /home/justin-a/code/lab/data/lab-j157/b-*/phaseB/logs/*.log "Didn't find what to pay for"
metrics: atlas = sh: python3 -I var/lab-j157-local/bin/metrics.py 2>/dev/null || echo '{"problems":-1}'
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j157') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
headline: played_a_vintage7, branches, atlas.spinesDone, atlas.decisions, atlas.meanRho, atlas.sameBest, atlas.branchErrored, atlas.truncatedLogs, atlas.problems

**Why.** J156 (results/J156/summary.md) ran rung 2 on three pairs. Its ff5 and peasant spines are clean; its
vintage pair is not, and every fault was the tool's, not the play's:
- **Spine 458 was 9 of 16 complete.** 6,480 of its 16,990 branch games errored with `optional costs are not
  copied`: from d5 on, every branch of every retrace cast after Six (cast at d2). Seven decisions lack a value
  at one or more options.
- **The atlas named none of it**: branch errors were not problems.
- **G1 flagged 3,071 lands** (printed as 200, the checker's cap) on all four vintage atlases: lands in exile
  that Laelia, the Blade Reforged lets her controller play, listed by the decision record after the land drop
  was used. The seat's own options held none of them.
- **A hung unit cost 458 its atlas.json**: d9-random-150 hung twice on the same branch (d9, option 0, b165),
  the watchdog killed the worker, the branch's two frame logs were left truncated, and the end-of-spine checks
  died on them. The PC wrote 458's atlas by hand with `--phase report`.

So J156's vintage reads (i) 0.393 over 28, (ii) -0.028 over 21 rest on a short spine, and four of its final
checks failed for the vintage pair alone. **J157 runs that pair again, the same decks and seeds, on
9fe69ad8** (#184, D466), and nothing else: the ff5 and peasant numbers of J156 stand as they are.

**What changed since J156** (all in the pin; the pilot checks each is there):
- **The fork carries a play's optional costs (D466 point 1).** `SearchPolicy.mapSa` gives the copy's base
  spell the costs the play was built with (`chosenOptionalCosts`); a retrace cast now forks. Measured on
  458's own d5 listing: Orcish Bowmasters' retrace cast played 6 of 6 branches, against J156's 240 of 240
  errored.
- **Branch errors are problems (point 2).** `checks.branchErrors` counts every errored branch game by text,
  and an option whose branch games errored more than `--branch-error-max` of the time (0.1, the default, kept
  in the plan) is a problem. So `atlas.problems == 0` now means what it says.
- **G1 reads one land listing (point 3).** The decision record, the random seat and the exploring seat all
  list lands from `Decisions.landPlays`; G1 can flag only a land the seat could have played, and
  `checks.guardrails.violations` is now the full count (`violationsBy` splits G1 from G4). **This changes no
  choice of the random seat**: D466 replayed J156's vintage rollouts g101 and g102 to the same games.
- **A refused cast puts its card back (point 4, G5).** The random seat's refused spell goes back to the zone it
  was cast from; Forge's own AI left it stranded in the Stack zone, which is why J156's `noRepeatRefused` was
  0 of 4,942. **This changes the random policy after every refusal: J157's random map is a fourth random
  policy, so its numbers are read beside J156's, never pooled with them** (D466, *Comparability*). J156's
  vintage pair logged 0 refusals (no tax card), so on this pair the change should reach few games, if any.
- **A truncated frame log is skipped and named (point 5)**: `checks.unreadableFrameLogs`, one problem, and
  `atlas.json` is still written.
- **The atlas test's "two maps" flake is fixed (point 6)**: the pilot runs `cubelab-atlas.test.ts` in full
  again (J156's pilot skipped that one test).

**The one known risk: 458's hung branch.** J156's d9-random-150 hung twice on branch b165 of d9 option 0,
deterministically, and none of D466's points is a fix for a hang (the 120-s branch timeout did not end it;
the 30-min unit watchdog did). D466 point 3 changes no choice and point 4 acts only after a refusal, so the
same branch may hang again. If it does: the watchdog ends the unit twice (`unit_errors` 2, `atlas.unitsShort`
1), its two logs are skipped and named (`atlas.truncatedLogs` 2), 458's atlas.json is written this time, and
`unit_errors == 0`, `unitsShort == 0` and `problems == 0` fail. That is a result, not a reason to re-run: the
summary names the branch and the hang, and the reads still come out.

**Where it writes: the lab data folder,** as J156: every atlas command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data`, and `atlasCommand` re-roots `--out var/lab-j157/...` there through
`labPath(..., 'write')`, so `--out var/lab-j157/b-vintage7-458` lands at
`/home/justin-a/code/lab/data/lab-j157/b-vintage7-458`. **A new folder, `lab-j157`**: J156's `lab-j150` is
read, never written (the pilot reads its four vintage atlases for the reads' proof). The Forge homes
(`CUBELAB_HOME_ROOT=var/cubelab/homes-J157`), `atlas-selftest`'s own folder and the job's scripts
(`var/lab-j157-local/`) stay in the clone. As J144/J149/J156:
- the pilot's first lines assert that `LAB_DATA_DIR` is unset or exactly that path, and so is `config.json`'s
  `labDataDir`;
- they `mkdir -p` the data folder before anything (a metric, a tool) reads it, and stop under 50 GB free;
- the run block asserts the path and the 50 GB again before it plays;
- `abort:` fires under 50 GB;
- the metrics, `progress:` and `collect:` read the data folder by its absolute path.
- **No `clean:`** (the runner refuses data-folder paths there, and the job is `resumable: yes`). A restart
  from scratch would need `/home/justin-a/code/lab/data/lab-j157` removed by hand, by Justin or the PC
  session; no job deletes there.

**Nothing beside it.** `cores: 7` of the PC's 8 reserves the box for this job: post nothing heavy beside it,
and hold the GPU lane for the whole run. There is no `pilot_cores:` on purpose (the J146 lesson). A light job
may still run beside it (the runner's rule); the PC should keep that to the coach bench or nothing.

**The design** (D451's method throughout; J156's vintage block unchanged):

| | |
|---|---|
| pair | **vintage-900000007** (`tools/ai-bench/pairs-confirm.txt` line 28: 832 games, A 395, score 0.0592), J156's third pair, named by deck file |
| spines | three Forge-vs-Forge baseline games at J156's seeds **458, 459, 460**: Forge on both seats is unchanged, so these should be J156's baseline games (11, 14 and 12 turns) and its branched decisions; the listing now reads lands through D466's one listing, which can only drop a land the seat could not play |
| phase A | **2,400 rollouts** from the opening, both seats random, seeds 458 x 1,000,000 + r; `--phase a`, its own folder `var/lab-j157/a-vintage7` (re-rooted to the data folder, above) |
| phase B | each spine `--phase b`, its own folder `var/lab-j157/b-vintage7-<seed>`; **16 of seat A's decisions** with two or more options, evenly spaced by D451's `spread` (all of them if the game lists 16 or fewer: 460 lists 11); every option forked and played out **200 times random, 40 times Forge**, units of 25 branches |
| checks | D451 point 6 on every folder as D466 amends it: branch errors and unreadable frame logs are problems, G1 from one listing, `--branch-error-max` at its 0.1 default |

**Sizing** (J156's vintage numbers):
- **Phase A:** 2,400 games at ~4,850 games/h on 7 workers, ~0.5 h, ~5 min of checks.
- **Phase B:** J156's baselines branch 71, 42 and 27 options: 140 x 240 = **33,600 branch games** (J156's
  `branches.jsonl` held 16,990, 10,080 and 6,480 lines; 458 was 50 short of the hung unit).
  - J156's vintage branches ran 1.2 s random and 0.73 s Forge a worker (reads.py over the vintage atlases),
    but 39% of 458's were errors that failed at once. At J156's all-pair rates (2.06 s and 1.56 s): 33,600 x
    (200 x 2.06 + 40 x 1.56) / 240 = 66,400 worker-s, ~2.6 h on 7 workers; at the vintage rates ~1.5 h. Take
    ~2 h.
  - The checks: ~72,000 frame logs at ~33 ms, ~0.7 h, and the rows ~0.3 h: ~1 h in all.
- **The block** is ~3.5 h; with the pilot ~4 h; with 458's hang, if it recurs (two 30-min watchdog ends
  on one worker, near the tail), up to ~5 h. **`timeout: 10h`** bounds the block at about twice that.
- **Unit timeout: `--unit-timeout 30`** (minutes, monotonic), as J156.
- **Disk:** J156's vintage folders held 3.5 GB (458 1.1 GB with 39% errors); ~4.5 GB here. The pilot and
  the run block require 50 GB free, and `abort:` fires under 50 GB.

**Pre-registered reads** (numbers only, no verdict; `reads.py` below is J156's script with every definition
unchanged and one section added, and the pilot proves it twice: on J148's own `atlas.json`, where it must
give J148's published numbers, and on J156's four vintage atlases, where it must give J156's vintage numbers
exactly):
- **Decided, Q, intervals:** J156's definitions. One pair, so every interval is the pair's: 95% percentile
  bootstrap, 10,000 draws, seed 150, spine then decision. With three spines the spine level is coarse, and
  that width is the honest answer.
- **(i) Agreement before the game is decided:** the same best option's share over Q.
- **(ii) rho:** the mean Spearman correlation over the rankable decisions, how many have two options, and the
  same over Q alone.
- **(iii) Regret at Forge's choice by kind** (priority / attack / block), under each map, with how many
  decisions have a regret interval clear of zero.
- **(iv) J148's candidates:** registered for the repeat pair only; J157 has no repeat pair, so `reads.json`'s
  `iv_repeat` is empty and nothing is read here.
- **(v) Guardrails,** from every atlas.json's checks: G1 lands offered and taken, G4 hands kept, violations
  (now the full count, G1 and G4 apart), G3 `noRepeatNoOp`, G5 `refusedCast` / `noRepeatRefused`; beside them
  the worker logs' "Didn't find what to pay for" lines (`payfail`).
- **(vi) Rung 3's sizing line** at this run's rates, for the vintage pair alone.
- **Side by side with J156 (`vs_j156`).** Each of (i), (ii), (ii) over Q, (iii) by kind and map, and (v)'s
  counts, J157's beside J156's vintage numbers, from a fixture of J156's `report/reads.json` (its
  `byPair.vintage7` of each read, copied into this file, sha256
  `147a6fa4c65d2794ca7f7f7337132353392b5d0d740bba2de1d2e9b5b8bddc3f`, checked by the pilot). **Two random policies, read side by side, never
  pooled** (D466 point 4). J156's vintage-only (vi) and its decided / Q counts are in the pilot's proof file,
  copied to `report/reads-j156-vintage.json`.

**Outputs** (on the data folder, `/home/justin-a/code/lab/data/lab-j157/`).
- `a-vintage7/` and `b-vintage7-<seed>/`: each with `plan.json`, `atlas.json`, `atlas.md`, and `phaseA/` or
  `phaseB/`; `pilot-ff5/` and `pilot-vintage7/`, the pilot's smokes.
- `report/`: each folder's `atlas.json` and `atlas.md` copied under its folder's name, `reads.json`,
  `reads-j156-vintage.json`, `exits.txt` (each atlas command's exit code), and `missing.txt` if a folder had
  no atlas.json.
- Never `summary.md` or `metrics.json`.

## Pilot
About 30 minutes: the data folder; the pin carries D466 and the PRs before it; the tests;
the two engine self-tests; `reads.py` written and proved on J148's atlas and on J156's vintage atlases; the
J156 fixture's sha256; two smokes of 60 rollouts and 2 decisions each.

**Why two smokes.** The G5 checks need a tax card, and the vintage pair has none (J156's vintage refusals: 0).
So, as J156's pilot did, the pilot plays the repeat pair fair-fight-900000005 (Elite Spellbinder in deck B)
at its seed 4600, and checks **`pilot.refusedCast >= 1` and `pilot.noRepeatRefused >= 1`**: now that a
refused card is put back, a later offer of it in the same window is there for G5 to leave out, and the second
counter must fire. J156's pilot logged 5 refusals in this smoke, and D466's replay of five J156 ff5 rollouts
gave 7 refusals and `noRepeatRefused` 5. The rest of the pilot's checks (problems, games, decisions,
violations) are on a smoke of the vintage pair itself, at seed 4601.
```bash
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created before anything reads it, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J157: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J157: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j157 var/lab-j157-local/bin
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J157: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J157: under 50 GB free on the data folder')"
echo 1 > var/lab-j157-local/datadir.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j157-local/merged.txt || echo 0 > var/lab-j157-local/merged.txt
grep -q 'chosenOptionalCosts' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'landPlays' bridge/src/mtgtable/ai/Decisions.java && grep -q 'putBack' bridge/src/mtgtable/ai/PolicyControllerAi.java && grep -q 'unreadableFrameLogs' tools/cubelab/atlas.ts && grep -q 'branch-error-max' tools/cubelab/atlas.ts && echo 1 > var/lab-j157-local/has-d466.txt || echo 0 > var/lab-j157-local/has-d466.txt
grep -q 'COUNTED_GUARDRAILS' tools/cubelab/atlas.ts && grep -q 'noRepeatRefused' bridge/src/mtgtable/ai/Explorer.java && echo 1 > var/lab-j157-local/has-g5.txt || echo 0 > var/lab-j157-local/has-g5.txt
grep -q 'unit-timeout' tools/cubelab/atlas.ts && grep -q 'monotonicMs' tools/cubelab/engine.ts && echo 1 > var/lab-j157-local/has-watchdog.txt || echo 0 > var/lab-j157-local/has-watchdog.txt
grep -rq 'CUBELAB_WORKER_XMX' tools/cubelab && echo 1 > var/lab-j157-local/has-heap.txt || echo 0 > var/lab-j157-local/has-heap.txt
grep -q 'empty-hand-ok' tools/check-redaction.mjs && grep -q 'empty-hand-ok' tools/cubelab/atlas.ts && echo 1 > var/lab-j157-local/has-checker.txt || echo 0 > var/lab-j157-local/has-checker.txt
test -z "${CUBELAB_WORKER_XMX:-}" && echo 1 > var/lab-j157-local/xmx-unset.txt || echo 0 > var/lab-j157-local/xmx-unset.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-atlas.test.ts web/test/cubelab-record.test.ts web/test/cubelab-watchdog.test.ts
cat > var/lab-j157-local/bin/reads.py <<'PY'
# J157's pre-registered reads (pc-results drafts/J157-move-atlas-vintage.md): J156's reads.py unchanged in every
# definition, plus the side-by-side against J156's vintage numbers (--vs-j156=FIXTURE). From the atlas.json files
# named on the command line as PAIR:SEED:PATH. Standard library only; no engine.
# Writes one JSON object to stdout. Definitions (fixed before any J150 data, kept for J157):
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
#   vs J156 (J157): with --vs-j156=FIXTURE (J156's report/reads.json, byPair.vintage7 of each read), each read of
#         (i)-(iii) and the (v) counts of PAIR (vintage7) here beside J156's, as two random policies (D466 point 4:
#         a refused cast now puts its card back) -- side by side, never pooled. `same` says whether n, point and
#         interval are equal: they are when this script is run on J156's own four vintage atlases (the pilot's
#         proof), and need not be on J157's.
import json, random, sys

REPEAT = 'ff5'
B, SEED = 10000, 150
args = [a for a in sys.argv[1:] if not a.startswith('--')]
NB = {'random': 200, 'forge': 40}
VS = None
for a in sys.argv[1:]:
    if a.startswith('--branches='):
        r, f = a.split('=', 1)[1].split(',')
        NB = {'random': int(r), 'forge': int(f)}
    if a.startswith('--vs-j156='):
        VS = json.load(open(a.split('=', 1)[1]))

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
# vs J156 (J157): side by side, never pooled
if VS is not None:
    P = 'vintage7'
    pick = lambda r: None if r is None or P not in r['byPair'] else {k: r['byPair'][P][k] for k in ('n', 'point', 'interval')}
    two = lambda a, b: {'j157': a, 'j156': b, 'same': a == b}
    vs = {'pair': P, 'policies': 'J156 (6fb13bf9) and J157 (9fe69ad8): two random policies (D466 point 4); side by side, never pooled',
          'j156Spines': VS['spines'], 'j157Spines': sorted(spines.get(P, {})),
          'i_sameBest': two(pick(out['i_sameBest']), VS['i_sameBest']),
          'ii_rho': two(pick(out['ii_rho']), VS['ii_rho']),
          'ii_rho_Q': two(pick(out['ii_rho_Q']), VS['ii_rho_Q']),
          'iii_regret': {k: {m: two(pick(out['iii_regret'][k][m]), VS['iii_regret'][k][m]) for m in ('random', 'forge')} for k in ('p', 'a', 'b')}}
    g = guard.get(P, {})
    vs['v_guardrails'] = {k: two(g.get(k), v) for k, v in sorted(VS['v_guardrails'].items())}
    flat = [vs[k] for k in ('i_sameBest', 'ii_rho', 'ii_rho_Q')] + [vs['iii_regret'][k][m] for k in ('p', 'a', 'b') for m in ('random', 'forge')] + list(vs['v_guardrails'].values())
    vs['allSame'] = all(x['same'] for x in flat)
    out['vs_j156'] = vs
print(json.dumps(out, indent=1))
PY
cat > var/lab-j157-local/bin/metrics.py <<'PY'
# J157's metrics (pc-results drafts/J157-move-atlas-vintage.md): one JSON object over every atlas.json under
# the data folder's lab-j157 (the phase-A folder a-vintage7, the spine folders b-vintage7-*). Standard library only; no engine.
import glob, json, math, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/home/justin-a/code/lab/data/lab-j157'
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'g5keys': 0,
       'refusedCast': 0, 'noRepeatRefused': 0, 'noRepeatNoOp': 0, 'branchErrored': 0, 'branchErrorOptions': 0, 'truncatedLogs': 0,
       'decisions': 0, 'sameBest': 0, 'meanRho': None, 'unitsShort': 0, 'reads': 0}
rhos = []
for f in sorted(glob.glob(D + '/[ab]-*/atlas.json')):
    d = json.load(open(f))
    c = d['checks']
    g = c['guardrails']
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['guardViolations'] += g.get('violations', 0)
    vb = g.get('violationsBy') or {}
    out['violationsG1'] += vb.get('G1', 0)
    out['violationsG4'] += vb.get('G4', 0)
    out['g5keys'] += 1 if 'refusedCast' in g and 'noRepeatRefused' in g else 0
    for k in ('refusedCast', 'noRepeatRefused', 'noRepeatNoOp'):
        out[k] += g.get(k, 0)
    be = c.get('branchErrors') or {}
    out['branchErrored'] += be.get('errored', 0)
    out['branchErrorOptions'] += len(be.get('options', []))
    out['truncatedLogs'] += len(c.get('unreadableFrameLogs') or [])
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
    out['reads'] = 1 if sorted(r['spines']) == ['vintage7'] and len(r['spines']['vintage7']) == 3 and 'vs_j156' in r else 0
except (OSError, ValueError, KeyError):
    pass
print(json.dumps(out))
PY
# J156's vintage numbers: byPair.vintage7 of each read of /home/justin-a/code/lab/data/lab-j150/report/reads.json, one line, checked by sha256
cat > var/lab-j157-local/j156-vintage.json <<'JSON'
{"i_sameBest":{"interval":[0.2143,0.5833],"n":28,"point":0.3929},"ii_rho":{"interval":[-0.3998,0.4124],"n":21,"point":-0.0284},"ii_rho_Q":{"interval":[-0.4287,0.4205],"n":19,"point":-0.0385},"iii_regret":{"a":{"forge":{"interval":[0.0,0.0167],"n":4,"point":0.0063},"random":{"interval":[0.0,0.0333],"n":4,"point":0.0152}},"b":{"forge":{"interval":[0.0,0.0286],"n":2,"point":0.0143},"random":{"interval":[0.0,0.0],"n":2,"point":0.0}},"p":{"forge":{"interval":[0.0018,0.0167],"n":22,"point":0.0068},"random":{"interval":[0.0044,0.0293],"n":22,"point":0.0145}}},"source":"J156 report/reads.json (lab-j150, mtg-table@6fb13bf9), byPair.vintage7 of each read","spines":["458","459","460"],"v_guardrails":{"forgePayCap":0,"kept":4800,"landOffered":176843,"landTaken":173772,"logs":49900,"mulligans":4800,"noRepeatNoOp":20637,"noRepeatRefused":0,"priorityDecisions":1563264,"refusedCast":0,"violations":200}}
JSON
test "$(sha256sum var/lab-j157-local/j156-vintage.json | cut -c1-64)" = 147a6fa4c65d2794ca7f7f7337132353392b5d0d740bba2de1d2e9b5b8bddc3f && echo 1 > var/lab-j157-local/fixture.txt || echo 0 > var/lab-j157-local/fixture.txt
# reads.py on J148's own atlas (one pair, one spine): it must give J148's published numbers
python3 -I var/lab-j157-local/bin/reads.py ff5:451:var/lab-j142/atlas/atlas.json > var/lab-j157-local/reads-j148.json
python3 -I -c "import json; d = json.load(open('var/lab-j157-local/reads-j148.json')); ok = (d['decided'], d['Q'], d['i_sameBest']['point'], d['ii_rho']['n'], d['ii_rho']['point'], d['iv_repeat']['C1_castNow']['random']['point'], d['iv_repeat']['C2_dontAttack']['random']['point']) == (27, 22, 0.3182, 18, -0.3416, 0.0129, 0.0588); print(1 if ok else 0)" > var/lab-j157-local/reads-self.txt
# reads.py on J156's own four vintage atlases (read, never written): every side-by-side read must equal the fixture
R=/home/justin-a/code/lab/data/lab-j150/report
python3 -I var/lab-j157-local/bin/reads.py vintage7:A:$R/a-vintage7.atlas.json vintage7:458:$R/b-vintage7-458.atlas.json vintage7:459:$R/b-vintage7-459.atlas.json vintage7:460:$R/b-vintage7-460.atlas.json --vs-j156=var/lab-j157-local/j156-vintage.json > var/lab-j157-local/reads-j156-vintage.json || true
python3 -I -c "import json; d = json.load(open('var/lab-j157-local/reads-j156-vintage.json')); print(1 if d['vs_j156']['allSame'] and d['spines'] == {'vintage7': ['458', '459', '460']} and (d['decisions'], d['Q']) == (43, 28) else 0)" > var/lab-j157-local/reads-j156.txt 2>/dev/null || echo 0 > var/lab-j157-local/reads-j156.txt
export CUBELAB_HOME_ROOT=var/cubelab/homes-J157
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh atlas-selftest --jobs {workers} && echo 1 > var/lab-j157-local/selftest.txt || echo 0 > var/lab-j157-local/selftest.txt
tools/cubelab.sh seat-identity --jobs {workers} && echo 1 > var/lab-j157-local/identity.txt || echo 0 > var/lab-j157-local/identity.txt
S=tools/ai-bench/decks/sets
tools/cubelab.sh atlas --deck-a $S/fair-fight-900000005-A.dck --deck-b $S/fair-fight-900000005-B.dck --seed 4600 --rollouts 60 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --unit-timeout 30 --jobs {workers} --out var/lab-j157/pilot-ff5 || true
tools/cubelab.sh atlas --deck-a $S/vintage-900000007-A.dck --deck-b $S/vintage-900000007-B.dck --seed 4601 --rollouts 60 --decisions 2 --branch-random 8 --branch-forge 4 --chunk 4 --unit-timeout 30 --jobs {workers} --out var/lab-j157/pilot-vintage7 || true
```
metrics: datadir = sh: cat var/lab-j157-local/datadir.txt 2>/dev/null || echo 0
metrics: merged = sh: cat var/lab-j157-local/merged.txt 2>/dev/null || echo 0
metrics: has_d466 = sh: cat var/lab-j157-local/has-d466.txt 2>/dev/null || echo 0
metrics: has_g5 = sh: cat var/lab-j157-local/has-g5.txt 2>/dev/null || echo 0
metrics: has_watchdog = sh: cat var/lab-j157-local/has-watchdog.txt 2>/dev/null || echo 0
metrics: has_heap = sh: cat var/lab-j157-local/has-heap.txt 2>/dev/null || echo 0
metrics: has_checker = sh: cat var/lab-j157-local/has-checker.txt 2>/dev/null || echo 0
metrics: xmx_unset = sh: cat var/lab-j157-local/xmx-unset.txt 2>/dev/null || echo 0
metrics: fixture = sh: cat var/lab-j157-local/fixture.txt 2>/dev/null || echo 0
metrics: reads_self = sh: cat var/lab-j157-local/reads-self.txt 2>/dev/null || echo 0
metrics: reads_j156 = sh: cat var/lab-j157-local/reads-j156.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j157-local/selftest.txt 2>/dev/null || echo 0
metrics: identity = sh: cat var/lab-j157-local/identity.txt 2>/dev/null || echo 0
metrics: pilot = sh: python3 -c "import json; d=json.load(open('/home/justin-a/code/lab/data/lab-j157/pilot-ff5/atlas.json')); c=d['checks']; g=c['guardrails']; print(json.dumps({'problems': len(c['problems']), 'played': d['phaseA']['played'], 'decisions': len(d['phaseB']['decisions']), 'g5': 1 if 'refusedCast' in g and 'noRepeatRefused' in g and 'noRepeatNoOp' in g else 0, 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0), 'guardViolations': g['violations']}))" 2>/dev/null || echo '{"problems":-1}'
metrics: pilot_vintage7 = sh: python3 -c "import json; d=json.load(open('/home/justin-a/code/lab/data/lab-j157/pilot-vintage7/atlas.json')); c=d['checks']; g=c['guardrails']; print(json.dumps({'problems': len(c['problems']), 'played': d['phaseA']['played'], 'decisions': len(d['phaseB']['decisions']), 'branchErrored': (c.get('branchErrors') or {}).get('errored', 0), 'truncated': len(c.get('unreadableFrameLogs') or []), 'guardViolations': g['violations']}))" 2>/dev/null || echo '{"problems":-1}'
check: datadir == 1
check: data_free_gb >= 50
check: merged == 1
check: has_d466 == 1
check: has_g5 == 1
check: has_watchdog == 1
check: has_heap == 1
check: has_checker == 1
check: xmx_unset == 1
check: fixture == 1
check: reads_self == 1
check: reads_j156 == 1
check: selftest == 1
check: identity == 1
check: pilot.g5 == 1
check: pilot.refusedCast >= 1
check: pilot.noRepeatRefused >= 1
check: pilot.guardViolations == 0
check: pilot_vintage7.problems == 0
check: pilot_vintage7.played == 60
check: pilot_vintage7.decisions == 2
check: pilot_vintage7.guardViolations == 0

## Commands
One block: phase A, then the three spines. Every atlas command resumes what is done. An atlas that finds a
problem exits 3 and the block goes on to the next spine (the exit is kept in
`/home/justin-a/code/lab/data/lab-j157/exits.txt`); the final checks read every folder's `atlas.json`. The block
asserts the data folder and its 50 GB again before it plays.
```bash
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J157: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
mkdir -p /home/justin-a/code/lab/data/lab-j157
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; sys.exit(0 if f >= 50 else 'J157: under 50 GB free on the data folder')"
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J157
S=tools/ai-bench/decks/sets
A=$S/vintage-900000007-A.dck; B=$S/vintage-900000007-B.dck
rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed 458 --rollouts 2400 --phase a --jobs {workers} --out var/lab-j157/a-vintage7 || rc=$?; echo "a-vintage7 $rc" >> /home/justin-a/code/lab/data/lab-j157/exits.txt
for s in 458 459 460; do
  rc=0; tools/cubelab.sh atlas --deck-a $A --deck-b $B --seed $s --phase b --decisions 16 --branch-random 200 --branch-forge 40 --unit-timeout 30 --jobs {workers} --out var/lab-j157/b-vintage7-$s || rc=$?; echo "b-vintage7-$s $rc" >> /home/justin-a/code/lab/data/lab-j157/exits.txt
done
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j157
mkdir -p $D/report
for d in $D/a-* $D/b-*; do
  n=$(basename "$d")
  if [ -f "$d/atlas.json" ]; then
    cp "$d/atlas.json" "$D/report/$n.atlas.json"
    cp "$d/atlas.md" "$D/report/$n.atlas.md"
  else
    echo "$n: no atlas.json" >> "$D/report/missing.txt"
  fi
done
args="vintage7:A:$D/a-vintage7/atlas.json"
for d in $D/b-vintage7-*; do args="$args vintage7:${d##*-}:$d/atlas.json"; done
python3 -I var/lab-j157-local/bin/reads.py $args --vs-j156=var/lab-j157-local/j156-vintage.json > $D/report/reads.json
cp var/lab-j157-local/reads-j156-vintage.json $D/report/reads-j156-vintage.json
cp $D/exits.txt $D/report/exits.txt
```
check: played_a_vintage7 == 2400
check: engine_errors <= 24
check: unit_errors == 0
check: atlas.atlases == 4
check: atlas.spinesDone == 3
check: atlas.unitsShort == 0
check: atlas.g5keys == 4
check: atlas.guardViolations == 0
check: atlas.problems == 0
check: atlas.reads == 1

## Abort if
abort: played_a_vintage7 >= 500 and engine_errors > played_a_vintage7 * 0.02
abort: unit_errors > 30
abort: data_free_gb < 50
`unit_errors` counts every `"ok":false` line, a first attempt that a retry then finished included, so the
final `unit_errors == 0` is strict on purpose: every unit finished on its first try. `atlas.unitsShort` is the
plainer "every planned unit finished": min(16, listed) x (8 + 2) distinct ok units a spine, summed over the
three. `atlas.problems` now counts branch errors past the 0.1 share and unreadable frame logs (D466), so `== 0`
means every option of every branched decision has its value and every log was checked. `atlas.truncatedLogs`
and `atlas.branchErrored` are reported, not checked: they are in the headline.

## Report
collect: /home/justin-a/code/lab/data/lab-j157/report/*.atlas.md
collect: /home/justin-a/code/lab/data/lab-j157/report/*.atlas.json
collect: /home/justin-a/code/lab/data/lab-j157/report/reads.json
collect: /home/justin-a/code/lab/data/lab-j157/report/reads-j156-vintage.json
collect: /home/justin-a/code/lab/data/lab-j157/report/exits.txt
The summary says, for Justin, in plain words and numbers only:
- **Phase A:** the outcome distribution, the game length, and the rollouts a +/- 2-point interval needed,
  beside J156's vintage row (53.3% [51.3, 55.3], 1,276 / 1,118 / 6, turns mean 20.2).
- **Reads (i) to (vi),** as `reads.json` gives them, each with its interval and n:
  - (i) the agreement before the game is decided;
  - (ii) rho, and how many rankable decisions have two options;
  - (iii) regret at Forge's choice by kind, under each map, and how many decisions clear zero;
  - (iv) none: registered for the repeat pair only;
  - (v) the guardrail counts, `payfail` beside G5's, and G1's full count (it should be 0 now; any flag left
    is a land from hand, which D466 says would be the seat's);
  - (vi) the rung 3 sizing line, beside J156's vintage-only line from `reads-j156-vintage.json`.
- **Side by side with J156,** from `reads.json`'s `vs_j156`: each read's J157 and J156 numbers in one table,
  with the note that they are two random policies (D466 point 4), read side by side and never pooled, and that
  J156's 458 was 9 of 16 complete.
- **Per spine,** one line: its decisions, decided / Q, same best, mean rho, and its branch errors.
- **The checks,** with any exit in `exits.txt` explained; if 458's d9 branch hung again, say so and name it.
- **The intervals' coarseness:** with three spines the spine level is coarse; say so beside every interval.
- **No verdict:** D451 has none. Any other surprise is a candidate until a fresh seed and a second pair
  show it again.

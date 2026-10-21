id: J144
title: The deck census, night 2 -- D447 unchanged on fresh seeds (decks and games 1501-1504, one a band; pilot games 1591-1594), 2,500 decks a band, each in 16 Bo1 games against random decks of its band (20,000 games a band, 80,000 in all; game seeds S x 1,000,000 + g), Forge Default both seats, the first RECORDED census night (census-play --record rows: both seats' decision rows and a per-turn ledger, under LAB_DATA_DIR=/home/justin-a/code/lab/data); then the pre-registered confirmation (D447 point 9) of night 1's three candidates per band -- (i) colours-with-3+ bin 1 above 0.5, (ii) bins 4 and 5 below 0.5, (iii) mono minus the < 0.4 main-share bin above 0 -- each HOLDS or NOT SHOWN on night 2's own deck-clustered bootstrap
public_title: Library deck census night 2: fresh seeds, recorded, confirming night 1
public_est: ~11-12 h
public_decides: Whether the night 1 colour-count pattern holds on fresh seeds
cpu: heavy
cores: 5
pilot_cores: 3
max_workers: 5
mem_per_worker_gb: 3
repos: mtg-table@60252b32 (origin/main on 2026-10-20 after #168, #169, #171 and #172 merged; tools/cubelab is byte-identical to 3c398ff2, where the 4-game smoke below ran. D447's census, D450's --record and LAB_DATA_DIR are on it. RE-PIN to origin/main's head when posting if main has moved: the pilot checks merged == 1)
decides: whether each of night 1's three colour-count candidates HOLDS in each band on fresh seeds (D447 point 9), pre-registered below: twelve verdicts (3 candidates x 4 bands), each holds or not shown. Nothing is promoted, removed or re-banded by this job; a candidate that holds stops being a candidate and becomes a finding "in a random deck of this makeup, as Forge's AI plays it". It is also the census's first recorded night: 80,000 games of both seats' decision rows for Phase 3
hypothesis: night 1 (J140, seeds 1401-1404) found in every band: decks with one colour of 3+ spells won .574-.599 (every interval above .5); four colours .393-.415 and five .341-.400 (every interval below .5); mono minus < .4 main share about +.18 to +.21. If those are properties of random decks of these makeups under Forge's AI and not of night 1's seeds, all twelve hold on night 2 (night 1's intervals clear the null by .06 or more, so the power is high); a candidate that is not shown is the method working, not a failure
rule: the confirmation rule (D447 point 9), registered by the cloud on 2026-10-19 23:20 UTC and written here before any night-2 game. Per band, on night 2's data alone: (i) the colours-with-3+ bin 1 cell above 0.5; (ii) the bins 4 AND 5 cells below 0.5 (both must hold); (iii) the mono (main share 1.0) cell minus the < 0.4 main-share cell above 0. A candidate HOLDS in a band when night 2's 95% interval excludes the null (0.5, 0.5 and 0.5, 0) in night 1's direction (above, below, above); otherwise NOT SHOWN. The interval is the one night 1 was read on: census-read's deck-clustered percentile bootstrap (censusread.ts cellOf, 1,000 replicates, --boot-seed 1) -- for (i) and (ii) census-read's own interval from night 2's spectrum.json; for (iii), whose difference census-read does not report, cellOf's scheme applied to each of the two cells (disjoint decks) and the percentile interval of the replicate differences, by the job's confirm.py, which re-derives every cell census-read reported and must equal its point estimates and fall within 0.02 of its intervals. No pooling with night 1 for the verdict; the pooled numbers (both nights' decks and games, the same estimator) are information only. cards.tsv is reported, not confirmed (Phase 3). No multiple-comparison correction is applied to the twelve verdicts: each is reported on its own, and the report says so
followup: morning-read
est: ~11.5 h (10.5-12.5 h) on 5 workers. J140 played the same 80,000 games' shapes on 5 workers beside the GPU lane at 5,203 (pauper, 22.6 turns a game), 8,186 (peasant), 9,467 (legacy) and 9,156 (powered) games an hour: 3.84 + 2.44 + 2.11 + 2.18 = 10.6 h with no recording. D450 measured rows mode at about 4% under none side by side (1,695 against 1,760 games an hour), which gives ~11.0 h, plus each band's end-of-run record check (every rows file through rowscheck.ts, about 0.9 GB a band, and the engine leak check on every 50th row during play: a few minutes a band). Plus ~15 min of pilot (the tests, 10,000 decks, the read's self-test on night 1, 48 games) and ~5 min to read. Storage on the data folder: rows ~45 KB a game (D450: 45.4 KB mean over 100 legacy games; this PC's 4-game smoke on 2026-10-20: 43.3 KB) and a 1.5 KB ledger line, so ~3.7 GB for 80,000 games, plus ~40 MB of games and decks
resumable: yes
timeout: 6h
clean: var/lab-j144-local var/cubelab/homes-J144
progress: lines /home/justin-a/code/lab/data/lab-j144/games/pauper/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/peasant/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/legacy/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/powered/games.jsonl of 80000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: played = lines /home/justin-a/code/lab/data/lab-j144/games/pauper/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/peasant/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/legacy/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/powered/games.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j144/games/pauper/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/peasant/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/legacy/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/powered/games.jsonl "\"engineError\":\""
metrics: timeouts = count /home/justin-a/code/lab/data/lab-j144/games/pauper/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/peasant/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/legacy/games.jsonl /home/justin-a/code/lab/data/lab-j144/games/powered/games.jsonl "\"timeout\":true"
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j144') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
metrics: gpa = sh: cat /home/justin-a/code/lab/data/lab-j144/games/pauper/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gpe = sh: cat /home/justin-a/code/lab/data/lab-j144/games/peasant/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gle = sh: cat /home/justin-a/code/lab/data/lab-j144/games/legacy/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gpo = sh: cat /home/justin-a/code/lab/data/lab-j144/games/powered/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: rec = sh: python3 -c "import json; d=[json.load(open(f'/home/justin-a/code/lab/data/lab-j144/games/{b}/census-play.json')).get('record') or {} for b in ['pauper', 'peasant', 'legacy', 'powered']]; print(json.dumps({'bands': sum(1 for x in d if x.get('mode') == 'rows'), 'games': sum(x.get('games', 0) for x in d), 'problems': sum(len(x.get('problems') or []) for x in d), 'rowsChecked': sum((x.get('rowsCheck') or {}).get('rows', 0) for x in d), 'rowsProblems': sum((x.get('rowsCheck') or {}).get('problems', 0) for x in d), 'leakChecks': sum((x.get('leakCheck') or {}).get('checks', 0) for x in d), 'leaks': sum((x.get('leakCheck') or {}).get('leaks', 0) for x in d), 'rowsKbMean': round(sum(((x.get('sizes') or {}).get('rows') or {}).get('total', 0) for x in d) / max(1, sum(x.get('games', 0) for x in d)) / 1000, 1)}))" 2>/dev/null || echo '{"bands":0}'
metrics: sp = sh: cat /home/justin-a/code/lab/data/lab-j144/out/spectrum.json 2>/dev/null || echo '{"games":0}'
metrics: strict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j144/out/spectrum.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: cards = sh: test -s /home/justin-a/code/lab/data/lab-j144/out/cards.tsv && echo $(($(wc -l < /home/justin-a/code/lab/data/lab-j144/out/cards.tsv) - 1)) || echo 0
metrics: gz = sh: test -s /home/justin-a/code/lab/data/lab-j144/out/census-games.jsonl.gz && gzip -dc /home/justin-a/code/lab/data/lab-j144/out/census-games.jsonl.gz | wc -l || echo 0
metrics: redraws = sh: python3 -c "import json; print(json.dumps({b: json.load(open(f'/home/justin-a/code/lab/data/lab-j144/decks/{b}/decks.json')).get('rejections') for b in ['pauper', 'peasant', 'legacy', 'powered']}))" 2>/dev/null || echo '{}'
metrics: cf = sh: cat /home/justin-a/code/lab/data/lab-j144/out/confirm.json 2>/dev/null || echo '{"summary":{"candidates":0}}'
metrics: cfstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j144/out/confirm.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
headline: played, engine_errors, cf.summary.holds, cf.summary.notShown, cf.summary.holdsByCandidate.i, cf.summary.holdsByCandidate.ii, cf.summary.holdsByCandidate.iii, rec.rowsKbMean, data_used_gb

**Why (the cloud's design, pc-jobs README, 2026-10-19 23:20 UTC).** Night 1 (J140) is the census's first data, and
D447 point 9 makes every difference it reported a candidate until it holds on fresh seeds: a fresh deck seed and a
fresh game seed, the same method, read on the same interval. Night 2 is that test for the three candidates night 1
showed in every band, written down before any night-2 game. It is also the first census night that keeps the game
itself (D450's rows: both seats' decisions and a per-turn ledger), on the lab data folder.

**The method is D447's, unchanged** (`docs/decisions/D447-deck-census.md`; J140's table): the prior (k uniform on
1-5, Dirichlet(1, ..., 1) shares), the draw (25 spells, the band pool's colourless share, a 10% cross-band slice),
the one land formula, castability (rejections counted), the bands (powered drawn with legacy) and the one frozen
pairing rule (seeded permutations within a band, game g's seed S x 1,000,000 + g). Only the seeds differ:

| band | deck seed | game seed | pilot game seed |
|---|---|---|---|
| pauper | 1501 | 1501 | 1591 |
| peasant | 1502 | 1502 | 1592 |
| legacy | 1503 | 1503 | 1593 |
| powered | 1504 | 1504 | 1594 |

Bo1, Forge's Default AI on both seats (`plain`), `--cross-band 0.10`, 2,500 decks and 20,000 games a band.

**Recording (D450): `--record rows`, rows only -- no frame logs.** The cloud asked for frames (`full`) on a fixed 2%
of games chosen by a seed rule IF census-play supports a sample. It does not: `--record` is one mode per folder
(`none|rows|full`, `plan.json` binds it), with no sampling flag (`tools/cubelab/censusplay.ts` at the pin). So this
night is rows only. (A later job could add frames for a seed-chosen 2% without new code: `census-play --replay` of
those games' rows with `--record full` into a folder of its own replays the same games -- D450 measured `none`,
`rows` and `full` playing the same games, and `census-replay` asserts it -- at ~2% more games and ~150 KB each. It
is not done here.) Per game: every p, a and b decision of BOTH seats as a D435 row (`rows/rows-<pid>.jsonl`, the
observing seat's candidates with Forge's answer played, D450 point 2) and one ledger line (`ledger.jsonl`, public
numbers only). At the end of each band, census-play checks every rows file (`rowscheck.ts`: shape, token grammar)
and the engine's `RowsLeakCheck` runs on every 50th row while the games play (opponent's hidden cards redealt: the
row must not move; the seat's own hand swapped: it must); any problem fails the band's step (exit 3).

**Where it writes: the lab data folder, and nowhere else heavy.** Every lab command runs under
`LAB_DATA_DIR=/home/justin-a/code/lab/data` (the README's safety rules: the only value it may take), so
`var/lab-j144/...` on a command line is re-rooted to `/home/justin-a/code/lab/data/lab-j144/...` (D450 point 6);
the Forge homes (`var/cubelab/homes-J144`) and the job's own small files (`var/lab-j144-local/`: the pin checks,
the read script, its self-test) stay in the clone. The pilot's first block checks that `LAB_DATA_DIR` is unset or
exactly that path (and `config.json`'s `labDataDir` likewise), creates the folder if it is absent (`mkdir -p`), and
stops unless it has 50 GB free; each band's step checks the 50 GB again before it plays, and `abort:` watches it.
The metrics read the data folder by its absolute path. `clean:` names only the clone's folders (the runner's lint
refuses a `clean:` path outside `var/`): a restart from scratch would leave `/home/justin-a/code/lab/data/lab-j144`
in place, and the job is resumable, so it never needs one; remove that folder by hand if a fresh start is ever wanted.

**Workers: 5, and why.** J140's run1 started on 7 workers beside the GPU lane and was killed once on memory (oomd or
the OOM killer, no exit code) after 6,920 pauper games; it then ran clean on 5 for 9 h 16 m (one 5-minute drop to 4
on swap-in). So `max_workers: 5`, what ran clean beside the GPU lane. `mem_per_worker_gb: 3` is J140's measured peak
(2.15 GB a worker, STATUS) plus 40% for rows mode's observing seat (the search's candidate generation on every
decision; J143's recorded atlas peaked at 1.85 GB): the runner then sizes the run at min(5, budget / 3 x 0.85), which
is 5 on a 21-23 GB budget and fewer if the budget shrinks, so a 7-worker start cannot recur. If the GPU lane is idle
when it starts, raising max_workers is a re-post, not a runner decision.

**The confirmation read** (`var/lab-j144-local/bin/confirm.py`, written by the pilot, numpy only; the rule above).
It reads night 2's games and decks, takes census-read's own `spectrum.json` intervals for (i) and (ii), computes
(iii)'s difference with census-read's `cellOf` scheme (each cell's decks resampled with replacement, wins over
decisive deck-games, 1,000 replicates, the 2.5% and 97.5% order statistics as census-read takes them), and
re-derives every cell census-read reported as a check. It does not invent a second bootstrap: it is `cellOf`'s,
applied to a difference census-read does not report. Two things are information only and never a verdict: the
pooled numbers (night 1's and night 2's decks and games together, the same estimator) and a joint deck bootstrap
of (iii) (one replicate moving both cells, J141's multinomial weights). Its self-test, in the pilot, reads NIGHT 1
as if it were night 2: it must reproduce J140's census-read cells exactly (52 point estimates equal, intervals
within 0.02) and find all twelve candidates holding there, as night 1 showed them. Run on 2026-10-20 against J140's
own files: 12 of 12 hold, 52 of 52 estimates equal, the largest interval gap 0.0047, 2.4 s.

Never `summary.md` or `metrics.json`: those names are the runner's and the PC session's.

**Not beside a queue night.** It aborts if a `queue run` starts. `census-play` resumes (it skips every game already in
`games.jsonl`; a band's folder keeps its `--record rows` mode); `decks` is deterministic, so a stop costs only the
games in flight. To stop cleanly: `tools/runner.sh stop J144`, and `resume` carries on.

## Pilot
About 15 minutes. It checks the data folder, the pin and the tools, runs the census and record tests, draws the four
bands' 2,500 decks onto the data folder (the run's own decks: no engine), writes the confirmation read and runs its
self-test on night 1, then plays 12 recorded games a band on the pilot seeds and reads them.
cores: 1
```bash
mkdir -p var/lab-j144-local/bin
# the lab data folder: exactly /home/justin-a/code/lab/data (README safety rules), created if absent, 50 GB free or stop
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J144: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J144: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data
export LAB_DATA_DIR=/home/justin-a/code/lab/data
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J144: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J144: under 50 GB free on the data folder')"
echo 1 > var/lab-j144-local/datadir.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j144-local/merged.txt || echo 0 > var/lab-j144-local/merged.txt
grep -q "export const RECORD_MODES = \['none', 'rows', 'full'\]" tools/cubelab/censusplay.ts && grep -q 'export function pairingOf' tools/cubelab/censusplay.ts && grep -q 'export function landPlan' tools/cubelab/deckcensus.ts && grep -q 'export function labPath' tools/cubelab/labdata.ts && grep -q 'export function cellOf' tools/cubelab/censusread.ts && echo 1 > var/lab-j144-local/has-tools.txt || echo 0 > var/lab-j144-local/has-tools.txt
cat var/lab-j144-local/datadir.txt var/lab-j144-local/merged.txt var/lab-j144-local/has-tools.txt
# the tests run without the data folder: their own lab paths stay theirs
env -u LAB_DATA_DIR node --test web/test/cubelab-deck-census.test.ts web/test/cubelab-record-cake.test.ts
# the run's decks: 2,500 a band, deck seeds 1501-1504, the 10% cross-band slice, onto the data folder (deterministic: the run blocks reuse them)
K=1
for B in pauper peasant legacy powered; do
  tools/cubelab.sh decks --band "$B" --count 2500 --seed $((1500 + K)) --cross-band 0.10 --out "var/lab-j144/decks/$B"
  K=$((K + 1))
done
cat > var/lab-j144-local/bin/confirm.py <<'PY'
import argparse, gzip, json, math, os, sys
import numpy as np
# J144's confirmation read (pc-results drafts/J144-census-night-2.md, "The confirmation rule"): D447 point 9
# applied to night 1's (J140's) three candidates, per band, on night 2's own data.  numpy only, no engine.
#
#   (i)   colours with 3+ spells, bin 1: above 0.5          (census-read's byColours["1"])
#   (ii)  colours with 3+ spells, bins 4 and 5: below 0.5   (byColours["4"], byColours["5"]; holds when BOTH do)
#   (iii) mono minus the < 0.4 main-share bin: above 0      (byMainShare["eq100"] - byMainShare["lt40"])
#
# A candidate HOLDS in a band when night 2's 95% interval excludes the null (0.5, 0.5, 0) in night 1's
# direction; otherwise it is NOT SHOWN.  The interval is the one night 1 was read on: census-read's
# deck-clustered percentile bootstrap (tools/cubelab/censusread.ts cellOf: a cell's decks resampled with
# replacement, its wins over its decisive deck-games, 1,000 replicates, the 2.5% and 97.5% order
# statistics at floor(0.025 (B-1)) and ceil(0.975 (B-1))).  (i) and (ii) take census-read's own interval
# from night 2's spectrum.json.  census-read reports no difference of two cells, so (iii) applies cellOf's
# scheme here to each of the two cells (their decks are disjoint: a deck has one main-share bin) and takes
# the percentile interval of the replicate differences; this script re-derives every cell census-read
# reported and checks it gets census-read's point estimate exactly and its interval within --tol.
# No pooling with night 1 for the verdict: the pooled numbers (both nights' decks and games together, the
# same estimator) are information only.  cards.tsv is reported by census-read and confirmed by nothing here.
ap = argparse.ArgumentParser()
ap.add_argument('--games', action='append', required=True)       # night 2: a census-play folder (games.jsonl) or a .jsonl[.gz] file
ap.add_argument('--decks', action='append', required=True)       # night 2: a decks folder (decks.jsonl) or a .jsonl[.gz] file
ap.add_argument('--spectrum', required=True)                     # night 2's census-read spectrum.json
ap.add_argument('--night1-games', action='append', default=[])   # J140's census-games.jsonl.gz (information: pooled numbers)
ap.add_argument('--night1-decks', action='append', default=[])
ap.add_argument('--night1-spectrum', default=None)               # J140's spectrum.json (shown beside)
ap.add_argument('--boot', type=int, default=1000)
ap.add_argument('--seed', type=int, default=144)
ap.add_argument('--tol', type=float, default=0.02)
ap.add_argument('--label', default='night 2 (J144)')
ap.add_argument('--out', required=True)
a = ap.parse_args()

BANDS = ['pauper', 'peasant', 'legacy', 'powered']
SHARE_KEYS = ['lt40', 's40_50', 's50_60', 's60_70', 's70_80', 's80_90', 's90_100', 'eq100']
CANDIDATES = [
    ('i', 'colours with 3+ spells = 1, above 0.5', [('byColours', '1', 'above', 0.5)]),
    ('ii', 'colours with 3+ spells = 4 and = 5, both below 0.5', [('byColours', '4', 'below', 0.5), ('byColours', '5', 'below', 0.5)]),
    ('iii', 'mono (main share 1.0) minus main share < 0.4, above 0', [('diff', 'eq100-lt40', 'above', 0.0)]),
]


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def lines_of(p):
    files = [os.path.join(p, f) for f in (['games.jsonl'] if os.path.exists(os.path.join(p, 'games.jsonl')) else ['decks.jsonl'] if os.path.exists(os.path.join(p, 'decks.jsonl')) else sorted(x for x in os.listdir(p) if x.endswith('.jsonl')))] if os.path.isdir(p) else [p]
    out = []
    for f in files:
        op = gzip.open if f.endswith('.gz') else open
        with op(f, 'rt', encoding='utf8') as fh:
            for l in fh:
                if l.strip() and l.endswith('\n'):
                    out.append(json.loads(l))
    return out


def share_key(s):
    if s is None:
        return None
    if s >= 1 - 1e-9:
        return 'eq100'
    if s < 0.4:
        return 'lt40'
    return SHARE_KEYS[min(9, int(math.floor(s * 10 + 1e-9))) - 3]


def load(game_srcs, deck_srcs):
    decks = {}
    for p in deck_srcs:
        for d in lines_of(p):
            decks[d['id']] = d
    rows = {}
    for p in game_srcs:
        for r in lines_of(p):
            if r['a'] not in decks or r['b'] not in decks:
                continue
            k = (decks[r['a']]['band'], r['seed'], r['g'], r.get('policyA'), r.get('policyB'))
            if k not in rows or (rows[k].get('engineError') and not r.get('engineError')):
                rows[k] = r
    return decks, list(rows.values())


def deck_tallies(decks, rows):
    """Per band: each deck's (wins, decisive, deck-games) over its games, and its two cell keys."""
    t = {b: {} for b in BANDS}
    for r in rows:
        if r.get('engineError'):
            continue
        band = decks[r['a']]['band']
        if band not in t:
            continue
        dec = r.get('winner') in ('a', 'b')
        for side in ('a', 'b'):
            x = t[band].setdefault(r[side], [0, 0, 0])
            x[2] += 1
            if dec:
                x[1] += 1
                x[0] += 1 if r['winner'] == side else 0
    return t


def cell_arrays(decks, tall, axis, key):
    ids = sorted(i for i in tall if (str(decks[i]['profile']['coloursWith3']) if axis == 'byColours' else share_key(decks[i]['profile']['mainShare'])) == key)
    w = np.array([tall[i][0] for i in ids], float)
    n = np.array([tall[i][1] for i in ids], float)
    g = np.array([tall[i][2] for i in ids], float)
    return ids, w, n, g


def reps_of(w, n, rng):
    if len(w) < 2 or n.sum() == 0:
        return np.array([])
    idx = rng.integers(0, len(w), size=(a.boot, len(w)))
    sw, sn = w[idx].sum(1), n[idx].sum(1)
    return np.where(sn > 0, sw / np.where(sn > 0, sn, 1), np.nan)


def pct(reps):
    reps = np.sort(reps[np.isfinite(reps)])
    if len(reps) == 0:
        return None, None
    return r4(reps[int(math.floor(0.025 * (len(reps) - 1)))]), r4(reps[int(math.ceil(0.975 * (len(reps) - 1)))])


def read(decks, rows, tag):
    """Every cell of both axes and the (iii) difference, per band, cellOf's scheme."""
    tall = deck_tallies(decks, rows)
    out = {}
    for bi, b in enumerate(BANDS):
        if not tall[b]:
            continue
        cells, reps = {}, {}
        for ai, (axis, keys) in enumerate((('byColours', ['0', '1', '2', '3', '4', '5']), ('byMainShare', SHARE_KEYS))):
            for ki, k in enumerate(keys):
                ids, w, n, g = cell_arrays(decks, tall[b], axis, k)
                if not ids:
                    continue
                rng = np.random.default_rng([a.seed, tag, bi, ai, ki])
                rp = reps_of(w, n, rng)
                lo, hi = pct(rp)
                cells[f'{axis}.{k}'] = {'decks': len(ids), 'deckGames': int(g.sum()), 'decisive': int(n.sum()), 'wins': int(w.sum()), 'est': r4(w.sum() / n.sum()) if n.sum() else None, 'lo': lo, 'hi': hi}
                reps[f'{axis}.{k}'] = rp
        m, l = cells.get('byMainShare.eq100'), cells.get('byMainShare.lt40')
        if m and l and m['est'] is not None and l['est'] is not None and len(reps['byMainShare.eq100']) and len(reps['byMainShare.lt40']):
            lo, hi = pct(reps['byMainShare.eq100'] - reps['byMainShare.lt40'])
            # information only: one joint deck bootstrap over the band's decks (J141's multinomial weights), so a replicate moves both cells together
            ids = sorted(tall[b])
            W = np.random.default_rng([a.seed, tag, bi, 99]).multinomial(len(ids), np.full(len(ids), 1 / len(ids)), size=a.boot).astype(float)
            def joint(key):
                mask = np.array([share_key(decks[i]['profile']['mainShare']) == key for i in ids])
                wv = np.array([tall[b][i][0] for i in ids], float) * mask
                nv = np.array([tall[b][i][1] for i in ids], float) * mask
                sn = W @ nv
                return np.where(sn > 0, (W @ wv) / np.where(sn > 0, sn, 1), np.nan)
            jlo, jhi = pct(joint('eq100') - joint('lt40'))
            cells['diff.eq100-lt40'] = {'est': r4(m['wins'] / m['decisive'] - l['wins'] / l['decisive']), 'lo': lo, 'hi': hi, 'jointLo': jlo, 'jointHi': jhi,
                                        'decks': m['decks'] + l['decks'], 'deckGames': m['deckGames'] + l['deckGames']}
        out[b] = cells
    return out


def judge(cell, direction, null):
    if not cell or cell.get('lo') is None or cell.get('hi') is None:
        return 'not shown', 0, 'no interval (the cell is empty or too small)'
    if direction == 'above' and cell['lo'] > null:
        return 'holds', 1, f"interval [{cell['lo']}, {cell['hi']}] above {null}"
    if direction == 'below' and cell['hi'] < null:
        return 'holds', 1, f"interval [{cell['lo']}, {cell['hi']}] below {null}"
    return 'not shown', 0, f"interval [{cell['lo']}, {cell['hi']}] does not exclude {null} {direction}"


decks2, rows2 = load(a.games, a.decks)
mine = read(decks2, rows2, 2)
spec = json.load(open(a.spectrum))
spec1 = json.load(open(a.night1_spectrum)) if a.night1_spectrum and os.path.exists(a.night1_spectrum) else None
pooled = night1 = None
if a.night1_games and a.night1_decks and all(os.path.exists(p) for p in a.night1_games + a.night1_decks):
    d1, r1 = load(a.night1_games, a.night1_decks)
    night1 = read(d1, r1, 1)
    pooled = read({**d1, **decks2}, r1 + rows2, 3)

# the check: this script's cells against census-read's own, cell for cell
chk = {'cellsCompared': 0, 'estimatesEqual': 0, 'intervalsWithinTol': 0, 'maxIntervalGap': 0.0, 'tol': a.tol, 'mismatches': []}
for b in BANDS:
    for axis in ('byColours', 'byMainShare'):
        for k, c in ((spec.get('bands', {}).get(b) or {}).get(axis) or {}).items():
            m = (mine.get(b) or {}).get(f'{axis}.{k}')
            chk['cellsCompared'] += 1
            if not m:
                chk['mismatches'].append(f'{b} {axis}.{k}: missing here')
                continue
            if m['est'] == c['wr'] and m['decks'] == c['decks'] and m['decisive'] == c['decisive']:
                chk['estimatesEqual'] += 1
            else:
                chk['mismatches'].append(f"{b} {axis}.{k}: here {m['est']} over {m['decks']} decks, census-read {c['wr']} over {c['decks']}")
            if c.get('bootLo') is None or m['lo'] is None:
                if c.get('bootLo') is None and m['lo'] is None:
                    chk['intervalsWithinTol'] += 1
                continue
            gap = max(abs(m['lo'] - c['bootLo']), abs(m['hi'] - c['bootHi']))
            chk['maxIntervalGap'] = max(chk['maxIntervalGap'], round(gap, 4))
            chk['intervalsWithinTol'] += 1 if gap <= a.tol else 0

doc = {'v': 1, 'job': 'J144', 'decision': 'D447 point 9', 'label': a.label, 'options': {'boot': a.boot, 'seed': a.seed, 'tol': a.tol},
       'rule': 'a candidate HOLDS in a band when night 2\'s 95% deck-clustered bootstrap interval excludes the null in night 1\'s direction; else NOT SHOWN. (ii) holds when both bin 4 and bin 5 hold. No pooling with night 1 for the verdict.',
       'games': len(rows2), 'decks': len(decks2), 'check': chk, 'bands': {}, 'summary': {}}
holds = 0
total = 0
by_cand = {c: 0 for c, _, _ in CANDIDATES}
for b in BANDS:
    sb = (spec.get('bands') or {}).get(b)
    if not sb:
        continue
    bd = {}
    for cid, text, parts in CANDIDATES:
        res = []
        for axis, key, direction, null in parts:
            if axis == 'diff':
                cell = (mine.get(b) or {}).get(f'diff.{key}')
                source = 'this script, cellOf\'s scheme on each cell, the replicate differences'
            else:
                c = (sb.get(axis) or {}).get(key)
                cell = None if not c else {'est': c['wr'], 'lo': c['bootLo'], 'hi': c['bootHi'], 'decks': c['decks'], 'deckGames': c['deckGames']}
                source = 'census-read spectrum.json (cellOf)'
            verdict, code, why = judge(cell, direction, null)
            n1 = ((night1 or {}).get(b) or {}).get(f'diff.{key}') if axis == 'diff' else None
            if spec1 and axis != 'diff':
                c1 = ((spec1.get('bands') or {}).get(b) or {}).get(axis, {}).get(key)
                n1 = None if not c1 else {'est': c1['wr'], 'lo': c1['bootLo'], 'hi': c1['bootHi'], 'decks': c1['decks']}
            pl = ((pooled or {}).get(b) or {}).get(f'{axis}.{key}' if axis != 'diff' else f'diff.{key}')
            res.append({'cell': f'{axis}.{key}', 'direction': direction, 'null': null, 'night2': cell, 'source': source, 'verdict': verdict, 'code': code, 'why': why,
                        'night1': n1, 'pooledInformationOnly': pl})
        code = 1 if all(x['code'] == 1 for x in res) else 0
        bd[cid] = {'text': text, 'verdict': 'holds' if code else 'not shown', 'code': code, 'parts': res}
        holds += code
        total += 1
        by_cand[cid] += code
    doc['bands'][b] = bd
doc['summary'] = {'candidates': total, 'holds': holds, 'notShown': total - holds, 'holdsByCandidate': by_cand,
                  'codes': {f'{b}.{c}': doc['bands'][b][c]['code'] for b in doc['bands'] for c in doc['bands'][b]}}


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return r4(o)
    return o


doc = clean(doc)
os.makedirs(a.out, exist_ok=True)
with open(os.path.join(a.out, 'confirm.json'), 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')
f3 = lambda x: '–' if x is None else f'{x:.3f}'
iv = lambda c: '–' if not c or c.get('lo') is None else f"{f3(c['lo'])}–{f3(c['hi'])}"
L = [f'# J144: does night 1\'s colour-count pattern hold on fresh seeds? ({a.label})', '',
     'Every rate is "in a random deck of this makeup", as Forge\'s Default AI plays it (D447 point 10). Pre-registered (D447 point 9; the job file, before any night-2 game): '
     'a candidate HOLDS in a band when night 2\'s 95% deck-clustered bootstrap interval excludes the null in night 1\'s direction, else NOT SHOWN. '
     'No pooling with night 1 for the verdict; the pooled column is information only. cards.tsv is reported, not confirmed.', '',
     f"**{holds} of {total} hold**: " + ', '.join(f'({c}) in {n} of {len(doc["bands"])} bands' for c, n in by_cand.items()) + '.', '',
     '| band | candidate | cell | night 2 | 95% | night 1 | 95% | pooled (info) | 95% | verdict |', '|---|---|---|---|---|---|---|---|---|---|']
for b, bd in doc['bands'].items():
    for cid, c in bd.items():
        for p in c['parts']:
            L.append(f"| {b} | ({cid}) {p['direction']} {p['null']} | {p['cell']} | {f3((p['night2'] or {}).get('est'))} | {iv(p['night2'])} | {f3((p['night1'] or {}).get('est'))} | {iv(p['night1'])} | "
                     f"{f3((p['pooledInformationOnly'] or {}).get('est'))} | {iv(p['pooledInformationOnly'])} | {p['verdict']} |")
        L.append(f"| {b} | **({cid})** | | | | | | | | **{c['verdict']}** |")
L += ['', '(iii)\'s interval is census-read\'s per-cell scheme on each cell, differenced (the verdict); a joint deck bootstrap of the difference (both cells moved by one replicate, information only):', '']
for b in doc['bands']:
    d = (mine.get(b) or {}).get('diff.eq100-lt40')
    if d:
        L.append(f"- {b}: {f3(d['est'])}, verdict interval {f3(d['lo'])}–{f3(d['hi'])}, joint {f3(d['jointLo'])}–{f3(d['jointHi'])}")
L += ['', f"**The check.** This script re-derived {chk['cellsCompared']} cells of census-read's spectrum.json: {chk['estimatesEqual']} point estimates equal, {chk['intervalsWithinTol']} intervals within {a.tol} (largest gap {chk['maxIntervalGap']}; two independent 1,000-replicate bootstraps).",
      '', f"{doc['games']} games, {doc['decks']} decks read."]
with open(os.path.join(a.out, 'confirm.md'), 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'holds': holds, 'of': total, 'byCandidate': by_cand, 'check': {k: chk[k] for k in ('cellsCompared', 'estimatesEqual', 'intervalsWithinTol', 'maxIntervalGap')}}))
PY
# the read's self-test: night 1 (J140's own files) read as if it were night 2 must reproduce J140's cells and hold 12 of 12
N1=var/lab-j140/out
if [ ! -s "$N1/census-games.jsonl.gz" ] || [ ! -s "$N1/spectrum.json" ]; then N1=/home/justin-a/code/lab/pc-results/results/J140; fi
python3 var/lab-j144-local/bin/confirm.py --games "$N1/census-games.jsonl.gz" --decks "$N1/census-decks.jsonl.gz" --spectrum "$N1/spectrum.json" \
    --night1-spectrum "$N1/spectrum.json" --label 'self-test: night 1 (J140) read as night 2' --out var/lab-j144-local/selftest
cp var/lab-j144-local/selftest/confirm.json var/lab-j144-local/selftest-confirm.json
echo "$N1" > var/lab-j144-local/night1-dir.txt
```
metrics: merged = sh: cat var/lab-j144-local/merged.txt 2>/dev/null || echo 0
metrics: has_tools = sh: cat var/lab-j144-local/has-tools.txt 2>/dev/null || echo 0
metrics: datadir = sh: cat var/lab-j144-local/datadir.txt 2>/dev/null || echo 0
metrics: st = sh: cat var/lab-j144-local/selftest-confirm.json 2>/dev/null || echo '{"summary":{"holds":0}}'
metrics: dpa = sh: cat /home/justin-a/code/lab/data/lab-j144/decks/pauper/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dpe = sh: cat /home/justin-a/code/lab/data/lab-j144/decks/peasant/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dle = sh: cat /home/justin-a/code/lab/data/lab-j144/decks/legacy/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dpo = sh: cat /home/justin-a/code/lab/data/lab-j144/decks/powered/decks.json 2>/dev/null || echo '{"count":0}'
cores: 3
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J144
K=1
for B in pauper peasant legacy powered; do
  tools/cubelab.sh census-play --decks "var/lab-j144/decks/$B" --pairs 12 --seed $((1590 + K)) --jobs {workers} --record rows --out "var/lab-j144/pilot/$B"
  K=$((K + 1))
done
tools/cubelab.sh census-read --games var/lab-j144/pilot/pauper --games var/lab-j144/pilot/peasant --games var/lab-j144/pilot/legacy --games var/lab-j144/pilot/powered \
    --decks var/lab-j144/decks/pauper --decks var/lab-j144/decks/peasant --decks var/lab-j144/decks/legacy --decks var/lab-j144/decks/powered \
    --boot 200 --out var/lab-j144/pilot/out
D=/home/justin-a/code/lab/data/lab-j144
python3 var/lab-j144-local/bin/confirm.py --games "$D/pilot/pauper" --games "$D/pilot/peasant" --games "$D/pilot/legacy" --games "$D/pilot/powered" \
    --decks "$D/decks/pauper" --decks "$D/decks/peasant" --decks "$D/decks/legacy" --decks "$D/decks/powered" \
    --spectrum "$D/pilot/out/spectrum.json" --boot 200 --tol 1 --label 'pilot (48 games: runs the read, judges nothing)' --out "$D/pilot/out"
head -30 "$D/pilot/out/spectrum.md"
```
metrics: ppa = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/pauper/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ppe = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/peasant/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ple = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/legacy/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ppo = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/powered/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: prec = sh: python3 -c "import json; d=[json.load(open(f'/home/justin-a/code/lab/data/lab-j144/pilot/{b}/census-play.json')).get('record') or {} for b in ['pauper', 'peasant', 'legacy', 'powered']]; print(json.dumps({'bands': sum(1 for x in d if x.get('mode') == 'rows'), 'games': sum(x.get('games', 0) for x in d), 'problems': sum(len(x.get('problems') or []) for x in d), 'rowsChecked': sum((x.get('rowsCheck') or {}).get('rows', 0) for x in d), 'rowsProblems': sum((x.get('rowsCheck') or {}).get('problems', 0) for x in d), 'leaks': sum((x.get('leakCheck') or {}).get('leaks', 0) for x in d), 'rowsKbMean': round(sum(((x.get('sizes') or {}).get('rows') or {}).get('total', 0) for x in d) / max(1, sum(x.get('games', 0) for x in d)) / 1000, 1)}))" 2>/dev/null || echo '{"bands":0}'
metrics: psp = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/out/spectrum.json 2>/dev/null || echo '{"games":0}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j144/pilot/out/spectrum.json'), parse_constant=lambda c: sys.exit(1)); json.load(open('/home/justin-a/code/lab/data/lab-j144/pilot/out/confirm.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pcf = sh: cat /home/justin-a/code/lab/data/lab-j144/pilot/out/confirm.json 2>/dev/null || echo '{"summary":{"candidates":0}}'
check: merged == 1
check: has_tools == 1
check: datadir == 1
check: data_free_gb >= 50
check: qwriters == 0
check: st.summary.candidates == 12
check: st.summary.holds == 12
check: st.check.cellsCompared >= 48
check: st.check.estimatesEqual == st.check.cellsCompared
check: st.check.intervalsWithinTol == st.check.cellsCompared
check: dpa.count == 2500 and dpe.count == 2500 and dle.count == 2500 and dpo.count == 2500
check: dpa.seed == 1501 and dpe.seed == 1502 and dle.seed == 1503 and dpo.seed == 1504
check: dpa.decksOf40 == 2500 and dpe.decksOf40 == 2500 and dle.decksOf40 == 2500 and dpo.decksOf40 == 2500
check: dpa.decksAllCastable == 2500 and dpe.decksAllCastable == 2500 and dle.decksAllCastable == 2500 and dpo.decksAllCastable == 2500
check: dpa.makeupK.k1 between 425 and 575 and dpe.makeupK.k1 between 425 and 575 and dle.makeupK.k1 between 425 and 575 and dpo.makeupK.k1 between 425 and 575
check: dpa.makeupK.k5 between 425 and 575 and dpe.makeupK.k5 between 425 and 575 and dle.makeupK.k5 between 425 and 575 and dpo.makeupK.k5 between 425 and 575
check: dpa.coloursWith3.c1 >= 300 and dpe.coloursWith3.c1 >= 300 and dle.coloursWith3.c1 >= 300 and dpo.coloursWith3.c1 >= 300
check: dpa.coloursWith3.c5 >= 25 and dpe.coloursWith3.c5 >= 25 and dle.coloursWith3.c5 >= 25 and dpo.coloursWith3.c5 >= 25
check: dpa.mainShare.lt40 >= 200 and dpe.mainShare.lt40 >= 200 and dle.mainShare.lt40 >= 200 and dpo.mainShare.lt40 >= 200
check: dpa.mainShare.eq100 >= 250 and dpe.mainShare.eq100 >= 250 and dle.mainShare.eq100 >= 250 and dpo.mainShare.eq100 >= 250
check: dpa.meanCross between 1.8 and 2.8 and dle.meanCross between 1.8 and 2.8
check: ppa.games == 12 and ppe.games == 12 and ple.games == 12 and ppo.games == 12
check: ppa.engineErrors + ppe.engineErrors + ple.engineErrors + ppo.engineErrors <= 1
check: prec.bands == 4
check: prec.problems == 0
check: prec.rowsProblems == 0
check: prec.leaks == 0
check: prec.rowsChecked >= 1000
check: prec.rowsKbMean between 10 and 150
check: pstrict == 1
check: psp.games == 48
check: psp.decks == 10000
check: pcf.games == 48

The pilot asks whether anything is broken:
- **The data folder.** `LAB_DATA_DIR` is unset or exactly `/home/justin-a/code/lab/data` (and so is `config.json`'s
  `labDataDir`); the folder exists (made if absent) with 50 GB free.
- **The pin and the tools.** On origin/main, with D447's census, D450's `--record` and `LAB_DATA_DIR`, and
  census-read's `cellOf`; the census and record tests pass on it.
- **The read.** Its self-test on night 1 reproduces J140's 52 census-read cells (every point estimate equal, every
  interval within 0.02) and finds all twelve candidates holding, as night 1 showed them.
- **The decks.** All 10,000 on the data folder, 40 cards, castable, on seeds 1501-1504, with the prior's coverage
  (each k near a fifth; enough decks in the cells the rule reads: 1 colour with 3+ spells, 5 colours, main share
  < 0.4 and mono -- night 1 had 570-650, 56-142, 316-426 and 493-567 a band).
- **The games.** 12 recorded games a band, at most one engine error, every rows file checked clean, no leak, rows
  of a sane size; census-read and the confirmation read write strict JSON over the 48 games (the pilot's
  confirmation judges nothing: 48 games give no interval worth reading, and its `--tol 1` turns the cell check off).

No check is on a win rate.

Dry run: not done (the runner and the engine lane are on J143; the cloud reviews this file first). What was run
outside the runner on 2026-10-20: the confirmation read's self-test on J140's files (above), and one 4-game
`census-play --record rows --jobs 1` smoke at main 3c398ff2 (tools/cubelab identical to the pin) on 8 legacy decks of seed 1599 (4 decisive, 0 engine
errors, rows 43.3 KB a game mean, ledger 1.6 KB, 132 rows checked clean, 1,036 games an hour on one worker beside
J143's seven). `tools/runner.sh check`: lint clean (below).

## Commands
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J144
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J144: under 50 GB free on the data folder')"
# the same decks as the pilot's (deterministic); census-play refuses decks whose sha256 moved
test -s /home/justin-a/code/lab/data/lab-j144/decks/pauper/decks.json || tools/cubelab.sh decks --band pauper --count 2500 --seed 1501 --cross-band 0.10 --out var/lab-j144/decks/pauper
tools/cubelab.sh census-play --decks var/lab-j144/decks/pauper --pairs 20000 --seed 1501 --jobs {workers} --record rows --out var/lab-j144/games/pauper
```
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J144
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J144: under 50 GB free on the data folder')"
test -s /home/justin-a/code/lab/data/lab-j144/decks/peasant/decks.json || tools/cubelab.sh decks --band peasant --count 2500 --seed 1502 --cross-band 0.10 --out var/lab-j144/decks/peasant
tools/cubelab.sh census-play --decks var/lab-j144/decks/peasant --pairs 20000 --seed 1502 --jobs {workers} --record rows --out var/lab-j144/games/peasant
```
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J144
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J144: under 50 GB free on the data folder')"
test -s /home/justin-a/code/lab/data/lab-j144/decks/legacy/decks.json || tools/cubelab.sh decks --band legacy --count 2500 --seed 1503 --cross-band 0.10 --out var/lab-j144/decks/legacy
tools/cubelab.sh census-play --decks var/lab-j144/decks/legacy --pairs 20000 --seed 1503 --jobs {workers} --record rows --out var/lab-j144/games/legacy
```
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J144
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J144: under 50 GB free on the data folder')"
test -s /home/justin-a/code/lab/data/lab-j144/decks/powered/decks.json || tools/cubelab.sh decks --band powered --count 2500 --seed 1504 --cross-band 0.10 --out var/lab-j144/decks/powered
tools/cubelab.sh census-play --decks var/lab-j144/decks/powered --pairs 20000 --seed 1504 --jobs {workers} --record rows --out var/lab-j144/games/powered
```
cores: 1
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
D=/home/justin-a/code/lab/data/lab-j144
for B in pauper peasant legacy powered; do test "$(wc -l < "$D/games/$B/games.jsonl")" -eq 20000; done
test -s var/lab-j144-local/bin/confirm.py
tools/cubelab.sh census-read --games var/lab-j144/games/pauper --games var/lab-j144/games/peasant --games var/lab-j144/games/legacy --games var/lab-j144/games/powered \
    --decks var/lab-j144/decks/pauper --decks var/lab-j144/decks/peasant --decks var/lab-j144/decks/legacy --decks var/lab-j144/decks/powered \
    --boot 1000 --boot-seed 1 --out var/lab-j144/out
for B in pauper peasant legacy powered; do cat "$D/games/$B/games.jsonl"; done | gzip -9 > "$D/out/census-games.jsonl.gz"
for B in pauper peasant legacy powered; do cat "$D/decks/$B/decks.jsonl"; done | gzip -9 > "$D/out/census-decks.jsonl.gz"
python3 - <<'PY'
import json
D = '/home/justin-a/code/lab/data/lab-j144'
doc, rec = {}, {}
for b in ['pauper', 'peasant', 'legacy', 'powered']:
    d = json.load(open(f'{D}/decks/{b}/decks.json'))
    d.pop('rules', None)
    g = json.load(open(f'{D}/games/{b}/census-play.json'))
    rec[b] = g.pop('record', None)
    doc[b] = {'decks': d, 'games': g}
json.dump(doc, open(f'{D}/out/counts.json', 'w'), indent=2)
json.dump(rec, open(f'{D}/out/record.json', 'w'), indent=2)
print(json.dumps({b: {'decks': doc[b]['decks']['count'], 'rejections': doc[b]['decks']['rejections'], 'games': doc[b]['games']['games'], 'engineErrors': doc[b]['games']['engineErrors'],
                      'rowsKbMean': round(((rec[b] or {}).get('sizes') or {}).get('rows', {}).get('mean', 0) / 1000, 1)} for b in doc}))
PY
# the confirmation (the rule above); night 1's files beside it for the information-only columns
N1=$(cat var/lab-j144-local/night1-dir.txt 2>/dev/null || echo var/lab-j140/out)
python3 var/lab-j144-local/bin/confirm.py --games "$D/games/pauper" --games "$D/games/peasant" --games "$D/games/legacy" --games "$D/games/powered" \
    --decks "$D/decks/pauper" --decks "$D/decks/peasant" --decks "$D/decks/legacy" --decks "$D/decks/powered" \
    --spectrum "$D/out/spectrum.json" --night1-spectrum "$N1/spectrum.json" --night1-games "$N1/census-games.jsonl.gz" --night1-decks "$N1/census-decks.jsonl.gz" \
    --boot 1000 --seed 144 --tol 0.02 --label 'night 2 (J144, seeds 1501-1504)' --out "$D/out"
head -60 "$D/out/confirm.md"
head -80 "$D/out/spectrum.md"
```
check: played == 80000
check: gz == 80000
check: strict == 1
check: cfstrict == 1
check: sp.games == 80000
check: sp.decks == 10000
check: sp.bands.pauper.games == 20000 and sp.bands.peasant.games == 20000 and sp.bands.legacy.games == 20000 and sp.bands.powered.games == 20000
check: sp.bands.pauper.decks == 2500 and sp.bands.peasant.decks == 2500 and sp.bands.legacy.decks == 2500 and sp.bands.powered.decks == 2500
check: sp.bands.pauper.deckGamesMin >= 14 and sp.bands.peasant.deckGamesMin >= 14 and sp.bands.legacy.deckGamesMin >= 14 and sp.bands.powered.deckGamesMin >= 14
check: gpa.engineErrorRate <= 0.01 and gpe.engineErrorRate <= 0.01 and gle.engineErrorRate <= 0.01 and gpo.engineErrorRate <= 0.01
check: timeouts <= 0.02 * played
check: gpa.searchSeats + gpe.searchSeats + gle.searchSeats + gpo.searchSeats == 0
check: rec.bands == 4
check: rec.games >= 79000
check: rec.problems == 0
check: rec.rowsProblems == 0
check: rec.leaks == 0
check: rec.leakChecks > 0
check: cards >= 1500
check: cf.games == 80000
check: cf.summary.candidates == 12
check: cf.check.cellsCompared >= 48
check: cf.check.estimatesEqual == cf.check.cellsCompared
check: cf.check.intervalsWithinTol == cf.check.cellsCompared

What the checks mean:
- Every planned game was played and is in the gzipped file; census-read wrote strict JSON over 80,000 games and
  10,000 decks, 20,000 games and 2,500 decks a band, and every deck kept at least 14 of its 16 deck-games.
- Engine errors at most 1% a band, timeouts at most 2% of games, no seat searched.
- **The record.** All four bands recorded rows (`census-play.json`'s `record`), every rows file checked with no
  problem, the engine leak check ran and found no leak.
- **The confirmation** wrote strict JSON with twelve verdicts over the 80,000 games, and re-derived every
  census-read cell exactly (estimates) and within 0.02 (intervals).

No check is on a win rate or a verdict: "not shown" is a result.

## Abort if
abort: qwriters > 0
abort: played >= 1000 and engine_errors > 0.02 * played
abort: played >= 1000 and timeouts > 0.05 * played
abort: data_free_gb < 50
- The data folder under 50 GB free (the README's rule; each band's step also refuses to start under it).

## Report
collect: /home/justin-a/code/lab/data/lab-j144/out/confirm.md
collect: /home/justin-a/code/lab/data/lab-j144/out/confirm.json
collect: /home/justin-a/code/lab/data/lab-j144/out/spectrum.json
collect: /home/justin-a/code/lab/data/lab-j144/out/spectrum.md
collect: /home/justin-a/code/lab/data/lab-j144/out/cards.tsv
collect: /home/justin-a/code/lab/data/lab-j144/out/counts.json
collect: /home/justin-a/code/lab/data/lab-j144/out/record.json
collect: /home/justin-a/code/lab/data/lab-j144/out/census-games.jsonl.gz
collect: /home/justin-a/code/lab/data/lab-j144/out/census-decks.jsonl.gz
collect: var/lab-j144-local/selftest-confirm.json

The rows and ledgers stay on the data folder (`/home/justin-a/code/lab/data/lab-j144/games/<band>/rows/` and
`ledger.jsonl`, ~3.7 GB); nothing here collects them. summary.md is the PC session's. It covers, in this order:
- **The verdicts, first.** `confirm.md`'s table: per band, each candidate's night-2 estimate and interval, night 1's
  beside it, the verdict (holds / not shown), and the count (k of 12 hold; per candidate, in how many bands). Say
  plainly what "holds" means (night 2's interval excludes the null in night 1's direction, on night 2's data alone)
  and that the pooled column is information, not the verdict. No multiple-comparison correction was registered:
  say so.
- **The read's check.** The cells re-derived, estimates equal, the largest interval gap; and (iii)'s joint
  bootstrap interval beside the verdict's (information).
- **The pin, the decks and the weak-deck tail.** The seeds, the counts by k, colours with 3+ spells and main share
  (`counts.json`), the rejections (report them even at 0), the cross-band slice.
- **The spectrum.** The three tables of `spectrum.md`, per band, with deck-bootstrap intervals, as J140's summary
  gave them, and the first player's rate.
- **The cards** (`cards.tsv`): the row counts and median deck-games a band. Reported, not confirmed: no top or bottom
  list is a finding.
- **The record.** Rows and ledger sizes per game (`record.json`), rows checked, leak checks and leaks, the data
  folder's use and free space at the end.
- **The run.** Engine errors, timeouts, wall time, games an hour per band from `census-play.json`'s sessions against
  J140's (5,203 / 8,186 / 9,467 / 9,156 on 5 workers, no recording), and the peak worker RSS against the 3 GB
  declared.
- **What a rate means.** Every rate is "in a random deck of this makeup", as Forge's Default AI plays it (D447 point
  10); a candidate that holds is a finding about such decks under that pilot, not about built decks (J141: search
  moves each colour about equally).

#!/usr/bin/env python3
# mtg-table — tools/atlas: the move atlas's label rows (contract v6) and the night's label reads.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The move atlas's labels (D451; label contract v6, J177; D489's futility stop): one row per branched decision of
seat A, read from finished spine folders, and the night's reads over them.

    python3 -I tools/atlas/labels.py NAME:POOL:DECKSEED:GAMESEED:SHA:DIR ... [--out=labels.jsonl] [--times=spine-times.txt]
        [--training=1] [--seat=D508] [--lost=CACHE_DIR] [--biased=s01,...] [--j191=LABELS_JSON]

READS, per spine DIR (what `tools/cubelab.sh atlas` writes): atlas.json, plan.json, phaseB/baseline.json,
phaseB/baseline/rows/*.jsonl (the baseline's decision rows, for `rows.match`) and phaseB/branches.jsonl; with --lost,
CACHE_DIR/<folder>.json, metrics.py --scan's cache of the spine's frame logs (read only when stamped with the spine's
atlas.json mtime); with --times, spine-times.txt ("<folder> <start s> <end s> <workers>"); with --j191, an earlier
night's labels.json, read beside as information.
WRITES the rows to --out (one JSON object a line; docs/guides/move-atlas.md has every key) and one JSON object, the
reads, to stdout. Nothing else. Standard library only; no engine. Every row keeps the absolute paths of the folders it
was read from (`frameLog`, `rows.file`, `branchFrames`, `branchesFile`, `atlas`): tools/atlas/release.py rewrites them
for a release.

ATLAS_SCAN_STAMP names the scan caches' stamp (default "J193 v5", what metrics.py --scan writes); a cache with
another stamp is read for its lost casts only. An older night's caches carry their own ("J191 v5").

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the scan stamp, which was a
constant. The comment block below is the job's own, a record of how the definitions grew night by night, and the
J-numbers in it name lab jobs.
"""
# J193 (drafts/J193-atlas-4b-night-fifteen.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J193 data. What changes: nothing in the rows. J193 is D508's population's SIXTH night (D509: the seat frozen since J186's
# pin e557dedf; D510 changed the record and D511 the replay, between landings, before J188's pin, and D513 the checker after J191's;
# none changed what the seat plays or offers), so its rows pool with J186's, J187's, J188's, J190's and J191's under the same pool names
# (D489, D508, D509, Comparability): --seat= defaults to "D508", as theirs (the self-test on J171's night still passes --seat=D486), the
# Report names the pools `random-<band>-d508`; and the sizing read's beside-column is J191's (--j191= LABELS_JSON: its c_sizingRead,
# per-worker-hour yield and futilityRead, THE SAME POPULATION's fifth night, as information and as the pooled futility read's fifth
# input; null when absent). J190's, the fourth, J188's, the third, J187's, the second, and J186's, the first (J186 was aborted before its
# Report), are registered in the job file. Every field, read and definition otherwise J177's, unchanged; the scan stamp `J193 v5`.
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py (contract v5) with the rung-4b contract v6, registered before any J177 data.
# v6 is v5 on D489's design: the SAME population as J173's v5 (D488's seat, unchanged), branched with fewer branches, so its rows may be
# pooled with J173's with the branch count as a column, and never with v1-v4's. What v6 changes (every v5 field kept, every v5 read and
# definition unchanged): `v` 6, `contract` v6's; EVERY branched row is kept -- complete, screened, or a futile-stopped PARTIAL one -- and
# each carries D489's `partial` (bool), `stoppedAt` and `stopWhy` (the decision-level checkpoint and "futile" on a partial row; null
# elsewhere: an option's own `stoppedAt` stays inside `options`), `futilityControl` (bool) and `futilityGap` (null where the rule did
# not read the decision), `branchRandom` (the plan's), `fullN` (option 0's random branch rows, any outcome) and `branchedInFull`
# (complete and fullN >= branchRandom, computed here whatever atlas.json's own `branchedInFull` counts). `confident` is v5's and also
# requires `partial` false (D489 makes a partial row incomplete; this is a second lock). `labels` stays the complete rows' count;
# `partialLabels`, `futilityControls`, `branchedInFullRows` and `confidentPartial` (0 expected) are new. New reads, registered before
# any J177 data:
#   f_futilityRead   the decisions the rule read (futilityGap not null), the futile ones (stopped or control), the stopped ones and the
#                    CONTROLS (futilityControl): how many controls are complete and confident at the full n (the rule's measured loss),
#                    their share with an exact Clopper-Pearson 95% interval, beside the atlas review's 3 of 77; the labels lost
#                    estimated as share x stopped, the interval scaled the same way. `pooledInputs` are the counts a later night adds to
#                    (the read is POOLED across nights; one night's is partial)
#   c_sizing7        adds `workerHours` (the walls times their workers) and `confidentPerWorkerHour`: THE yield number to compare
#                    across nights; the confident share over complete rows is not (the stopped futile decisions left the denominator)
#   c_sizingRead     adds J173's own sizing read (--j173=LABELS_JSON: its c_sizingRead and per-worker-hour yield, the same seat at 200
#                    branches, other decks; null when the file is absent) and the review's ~46 [41, 51] (32.8 x 1.39 [1.25, 1.55], no
#                    controls), as information, no verdict
# J173's header, unchanged below:
# v5 is a NEW POPULATION (D488, Comparability: "Labels and reads from before D488 are not pooled with those after it"): its rows are
# never pooled with v1-v4's. What v5 changes (every v4 field kept): `v` 5, `contract` v5's; `randomSeat` is --seat= (default "D488"; the
# pilot's self-test on J171's night passes --seat=D486), the same on every spine; the pool as named on the command line (J177:
# `random-<band>-d488`); each row adds D488's branch-row counters `targetCountTrimmed` and `costTargetAvoided` (the sums over the
# decision's branch rows, both maps; BranchRow writes each when > 0), `targetCountTrimmedBranches` and `costTargetAvoidedBranches` (its
# branch rows with each > 0) and `branchRows` (all of its branch rows); and, from metrics.py --scan's v5 caches (--lost=DIR),
# `refusedCastOptions` (the options whose OWN forced cast was refused -- put back in its caster's hand -- in more than half of their
# branches, either map), `refusedCastVoid` (option 0, Forge's own answer, is one of them), `refusedCastBranches` (the decision's branch
# games with any refused cast) and `refusedCastBranchShare` (over `branchRows`); a row with no v5 cache carries null in the four. Out:
# `d488Rows`, `refusedCastVoid` / `refusedCastVoidList`, `refusedCastOptionRows`; each spine's scan numbers beside its labels. The
# sizing read's expectation names J171's numbers as ANOTHER population. The reads themselves are J171's, unchanged.
# J171's (J170's v4) header, in short: --biased= and --lost= are J169's; `lostCastOptions`, `lostCastVoid` and `lostCastBranches` are
# J169's (the lost cast as J169 defined it; metrics.py's scan keeps it); `confidentPer7Poisson95` is Garwood's exact interval scaled
# as the point is; `byRandomSeat` counts whatever seats the rows carry. J167's: each spine names its own sha; `listing`, `playCount`,
# `tokenTwice`, each option's `identity`; `byListing`.
# From spine folders named on the command line as NAME:POOL:DECKSEED:GAMESEED:SHA:DIR (DIR holds plan.json, atlas.json, phaseB/).
#   --out=FILE       write labels.jsonl there (one row per branched decision: complete, screened or neither)
#   --times=FILE     spine-times.txt ("<folder> <start epoch s> <end epoch s> <workers>", one line a run of a spine's block)
#   --training=1     mark every row `training: true`; anything else writes `training: false`
# Standard library only; no engine. Prints one JSON object (the label reads) to stdout.
# Definitions (J166's, fixed before any J166 data):
#   label      a branched decision of seat A that atlas.json calls complete (D480), not screened
#   regret     atlas.json's random-map regret: the best option's mean minus option 0's (Forge's answer, the one the spine
#              played), with atlas.json's paired-bootstrap interval; an option early stopping dropped keeps its own n (D480)
#   confident  complete and the regret's low end is > 0 (random map); `confidentForge` the same under the Forge map, on a
#              spine with one (null on a spine without), as information
#   decided    atlas.json's (D480); fallback J158's: every option's mean >= 0.95 under both maps; inQ = complete, not decided
#   settled    atlas.json's (D480: decided, or every option <= 0.05 under each map, or screened); fallback J158's
#   gap        best minus worst option mean under the random map, over every option (J157's "information" measure)
#   k bucket   the decision's option count (listed and branched): 2, 3-4, 5-6, 7-8
#   interval   95% percentile bootstrap, 10,000 draws, seed 150: pool -> spine -> decision when more than one pool is read,
#              spine -> decision for one pool, decision for one spine
#   rows       the d-th row of seat A in the spine's baseline rows IS decision d (`rows.match`), J158's rule
#   void       J162's: "D470" when a block decision played one game under every option in every continuation the spine has
#   c_sizing7  labels and confident labels per 10-h night at the measured wall (spine-times.txt, checks included) scaled to 7
#              workers (wall x workers / 7), per spine, per pool and as run
import collections, glob, json, math, os, random, statistics, sys

B, SEED = 10000, 150
CONTRACT = 'mtg-table rung-4b label v6 (J177)'
SCAN_V = os.environ.get('ATLAS_SCAN_STAMP', 'J193 v5')   # D515: an older night's scan caches carry its own stamp ('J191 v5')
args, opt = [], {}
for a in sys.argv[1:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('=')
        opt[k] = v
    else:
        args.append(a)
TRAINING = opt.get('training') == '1'
SEAT = opt.get('seat') or 'D508'
BIASED = set(x for x in opt.get('biased', '').split(',') if x)
ROW_KEYS = ('modesDrawn', 'retargeted', 'targetCountTrimmed', 'costTargetAvoided')
ROW0 = {'modesDrawn': 0, 'retargeted': 0, 'targetCountTrimmed': 0, 'costTargetAvoided': 0,
        'modesDrawnBranches': 0, 'targetCountTrimmedBranches': 0, 'costTargetAvoidedBranches': 0, 'branchRows': 0, 'fullN': 0}


def lost_cache(folder):
    """metrics.py --scan's cache for this spine folder, only when it was made from this folder's atlas.json as it stands"""
    if not opt.get('lost'):
        return None
    try:
        c = json.load(open(os.path.join(opt['lost'], os.path.basename(folder) + '.json')))
        return c if c.get('atlasMtime') == int(os.path.getmtime(os.path.join(folder, 'atlas.json'))) else None
    except (OSError, ValueError):
        return None


def forge_map(doc):
    return (doc.get('phaseB') or {}).get('forgeMap', True) is not False and doc['plan'].get('branchForge', 40) > 0


def complete(x, fm):
    if x.get('screened'):
        return False
    if 'decided' in x:   # D480's atlas: its own `complete`
        return bool(x['complete'])
    return x['complete'] and all(o['random']['mean'] is not None and (not fm or o['forge']['mean'] is not None) for o in x['options'])


def decided(x, fm):
    if 'decided' in x:
        return bool(x['decided'])
    return all(o['random']['mean'] >= 0.95 and (not fm or o['forge']['mean'] >= 0.95) for o in x['options'])


def settled(x, fm, comp):
    if 'settled' in x:
        return bool(x['settled'])
    return comp and decided(x, fm) or comp and all(o['random']['mean'] <= 0.05 and (not fm or o['forge']['mean'] <= 0.05) for o in x['options'])


def kbucket(k):
    return '2' if k <= 2 else '3-4' if k <= 4 else '5-6' if k <= 6 else '7-8'


def seat_rows(spine):
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


def same_game(branches_file, conts):
    """Per decision: whether every option played the same game at every index where all of them played (J162's void test)."""
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
        same = all(cs.get(c, {}).get('allPlayed', 0) > 0 and cs[c]['identical'] == cs[c]['allPlayed'] for c in conts)
        ev = {c: '%d of %d played indices identical across the %d options (%d of %d indices had an errored, timed-out, unavailable or stopped option)' % (
            cs.get(c, {}).get('identical', 0), cs.get(c, {}).get('allPlayed', 0), len(nopt[d]),
            cs.get(c, {}).get('indices', 0) - cs.get(c, {}).get('allPlayed', 0), cs.get(c, {}).get('indices', 0)) for c in conts}
        res[d] = {'same': same, 'evidence': ev}
    return res


def row_counts(branches_file):
    """v5: per decision, the sums of D486's modesDrawn, D485's retargeted and D488's targetCountTrimmed and costTargetAvoided over its
    branch rows (both maps), its rows with modesDrawn, targetCountTrimmed and costTargetAvoided above 0, and all of its branch rows"""
    rc = {}
    if os.path.exists(branches_file):
        for line in open(branches_file):
            try:
                r = json.loads(line)
            except ValueError:
                continue
            e = rc.setdefault(r['d'], dict(ROW0))
            e['branchRows'] += 1
            e['fullN'] += 1 if r.get('c') == 'random' and r.get('o') == 0 else 0
            for k in ROW_KEYS:
                v = r.get(k)
                if isinstance(v, (int, float)) and v > 0:
                    e[k] += v
                    if k != 'retargeted':
                        e[k + 'Branches'] += 1
    return rc


def poisson95(k):
    """the exact (Garwood) 95% interval of a Poisson mean with k observed, by bisection on the Poisson CDF"""
    def cdf(n, mu):
        return sum(math.exp(i * math.log(mu) - mu - math.lgamma(i + 1)) for i in range(n + 1)) if mu > 0 else 1.0

    def solve(f, lo, hi):
        for _ in range(200):   # f falls as mu grows: keep the root between lo and hi
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if f(mid) > 0 else (lo, mid)
        return (lo + hi) / 2
    top = 10.0 * (k + 10)
    lower = 0.0 if k == 0 else solve(lambda mu: cdf(k - 1, mu) - 0.975, 0.0, top)
    upper = solve(lambda mu: cdf(k, mu) - 0.025, 0.0, top)
    return lower, upper


labels, tree, same_any, meta = [], {}, [], {}
for a in args:
    name, pool, dseed, gseed, sha, spine = a.split(':', 5)
    spine = os.path.abspath(spine)
    doc = json.load(open(os.path.join(spine, 'atlas.json')))
    plan = json.load(open(os.path.join(spine, 'plan.json')))
    base = json.load(open(os.path.join(spine, 'phaseB', 'baseline.json')))
    fm = forge_map(doc)
    btok = {x['d']: x for x in base['decisions']}
    spine_listing = 'D483' if base['decisions'] and all(x.get('identities') for x in base['decisions']) else 'pre-D483' if not any(x.get('identities') for x in base['decisions']) else 'mixed'
    rf, seat, player, arows = seat_rows(spine)
    sg_all = same_game(os.path.join(spine, 'phaseB', 'branches.jsonl'), ('random', 'forge') if fm else ('random',))
    rc_all = row_counts(os.path.join(spine, 'phaseB', 'branches.jsonl'))
    pb = doc.get('phaseB') or {}
    sch = pb.get('schedule') or {}
    lc = lost_cache(spine)
    v5 = lc is not None and lc.get('scan') == SCAN_V
    meta[name] = {'pool': pool, 'deckSeed': int(dseed), 'gameSeed': int(gseed), 'sha': sha, 'listing': spine_listing, 'folder': os.path.basename(spine), 'forgeMap': fm,
                  'deckA': plan['deckA'], 'deckB': plan['deckB'],
                  'baseline': {'turns': (pb.get('baseline') or {}).get('turns'), 'winner': (pb.get('baseline') or {}).get('winner'),
                               'listed': (pb.get('baseline') or {}).get('decisionsListed')},
                  'branchedInFull': sch.get('branchedInFull'), 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'),
                  'stoppedOptions': sch.get('stoppedOptions'), 'meanOptions': sch.get('meanOptions'),
                  'randomSeat': SEAT, 'biased': 'lost-cast' if name in BIASED else None,
                  'lostScanned': lc is not None, 'lostCasts': lc.get('lostCasts') if lc else None, 'lostCastBranches': lc.get('lostCastBranches') if lc else None,
                  'scanV5': v5, 'casts': lc.get('casts') if v5 else None, 'refusedCast': lc.get('refusedCast') if v5 else None,
                  'refusedCastShare': lc.get('refusedCastShare') if v5 else None, 'castsRefused': lc.get('castsRefused') if v5 else None,
                  'refusedCastBranches': lc.get('refusedCastBranches') if v5 else None}
    tree.setdefault(pool, {}).setdefault(name, [])
    for x in pb.get('decisions', []):
        d = x['d']
        row = arows[d] if d < len(arows) else None
        match = bool(row) and d in btok and row['tokens'] == btok[d]['tokens'] and row['kind'] == x['kind'] and row['turn'] == x['turn']
        comp = complete(x, fm)
        dec = comp and decided(x, fm)
        rnd = [o['random']['mean'] for o in x['options'] if o['random']['mean'] is not None]
        lst = btok.get(d) or {}
        ids = lst.get('identities') or []
        toks = lst.get('tokens') or []
        lab = {
            'v': 6, 'contract': CONTRACT, 'spine': name, 'pool': pool, 'training': TRAINING, 'split': 'train' if TRAINING else None,
            'deckA': plan['deckA'], 'deckB': plan['deckB'], 'deckSeed': int(dseed), 'spineSeed': int(gseed), 'sha': sha,
            'listing': 'D483' if ids else 'pre-D483', 'playCount': len(set(ids)) if ids else len(toks), 'tokenTwice': len(set(toks)) < len(toks),
            'randomSeat': SEAT, 'biased': 'lost-cast' if name in BIASED else None,
            'd': d, 'kind': x['kind'], 'turn': x['turn'], 'k': len(x['options']), 'kBucket': kbucket(len(x['options'])),
            'why': x.get('why'), 'replaces': x.get('replaces'),
            'forgeOption': x['chosen'], 'forgeToken': x['options'][x['chosen']]['token'],
            'options': [{'o': o['o'], 'token': o['token'], 'label': o['label'], 'identity': ids[o['o']] if ids and o['o'] < len(ids) else None,
                         'stoppedAt': o.get('stoppedAt'),
                         'random': {k: o['random'][k] for k in ('n', 'mean', 'lo', 'hi')},
                         'forge': {k: o['forge'][k] for k in ('n', 'mean', 'lo', 'hi')}} for o in x['options']],
            'bestRandom': x['random']['best'], 'bestForge': x['forge']['best'] if fm else None,
            'regret': x['random']['regret'], 'regretLo': x['random']['regretLo'], 'regretHi': x['random']['regretHi'],
            'regretForge': x['forge']['regret'] if fm else None, 'regretForgeLo': x['forge']['regretLo'] if fm else None,
            'regretForgeHi': x['forge']['regretHi'] if fm else None,
            'confident': comp and not x.get('partial') and x['random']['regretLo'] is not None and x['random']['regretLo'] > 0,
            'confidentForge': (comp and x['forge']['regretLo'] is not None and x['forge']['regretLo'] > 0) if fm else None,
            'complete': comp, 'screened': bool(x.get('screened')), 'screenMean': x.get('screenMean'),
            'partial': bool(x.get('partial')), 'stoppedAt': x.get('stoppedAt') if x.get('partial') else None,
            'stopWhy': x.get('stopWhy') if x.get('partial') else None, 'futilityControl': bool(x.get('futilityControl')),
            'futilityGap': x.get('futilityGap'), 'branchRandom': plan['branchRandom'],
            'decided': dec, 'inQ': comp and not dec, 'settled': settled(x, fm, comp),
            'gap': round(max(rnd) - min(rnd), 4) if comp and rnd else None,
            'rho': x['rho'] if fm else None, 'sameBest': x['sameBest'] if fm else None, 'forgeMap': fm,
            'branches': {'random': plan['branchRandom'], 'forge': plan['branchForge'], 'branchTimeoutSec': plan.get('branchTimeoutSec'), 'cuts': plan.get('cuts')},
            'view': {'seat': seat, 'player': player, 'deck': 'A'},
            'frameLog': os.path.join(spine, 'phaseB', 'baseline', 'frames', 'baseline-seat%s.jsonl.gz' % seat) if seat is not None else None,
            'rows': {'file': rf, 'seatRow': d, 'match': match},
            'branchFrames': os.path.join(spine, 'phaseB', 'frames', 'd%d-{random|forge}-o{o}-b{i}-seat%s.jsonl.gz' % (d, seat)),
            'branchesFile': os.path.join(spine, 'phaseB', 'branches.jsonl'),
            'atlas': os.path.join(spine, 'atlas.json'),
        }
        lab.update(rc_all.get(d, dict(ROW0)))
        lab['branchedInFull'] = comp and lab['fullN'] >= plan['branchRandom']
        keys = [(o['o'], 'd%d/%s/o%d' % (d, c, o['o'])) for o in x['options'] for c in ('random', 'forge')]
        if lc is not None:
            bo = lc.get('byOption') or {}
            lab['lostCastOptions'] = sorted({oo for oo, kk in keys if (bo.get(kk) or {}).get('forcedLostBranches', 0) * 2 > (bo.get(kk) or {}).get('branches', 0) > 0})
            lab['lostCastVoid'] = 0 in lab['lostCastOptions']
            lab['lostCastBranches'] = sum((bo.get(kk) or {}).get('lostBranches', 0) for oo, kk in keys)
        else:
            lab['lostCastOptions'], lab['lostCastVoid'], lab['lostCastBranches'] = None, None, None
        if v5:
            bo = lc.get('byOption') or {}
            lab['refusedCastOptions'] = sorted({oo for oo, kk in keys if (bo.get(kk) or {}).get('forcedRefusedBranches', 0) * 2 > (bo.get(kk) or {}).get('branches', 0) > 0})
            lab['refusedCastVoid'] = 0 in lab['refusedCastOptions']
            lab['refusedCastBranches'] = sum((bo.get(kk) or {}).get('refusedBranches', 0) for oo, kk in keys)
            lab['refusedCastBranchShare'] = round(lab['refusedCastBranches'] / lab['branchRows'], 4) if lab['branchRows'] else None
        else:
            lab['refusedCastOptions'], lab['refusedCastVoid'], lab['refusedCastBranches'], lab['refusedCastBranchShare'] = None, None, None, None
        sg = sg_all.get(d, {'same': False, 'evidence': None})
        same_any.append((lab, sg['same']))
        lab['void'] = 'D470' if x['kind'] == 'b' and sg['same'] and comp else None
        if lab['void']:
            lab['voidEvidence'] = sg['evidence']
        labels.append(lab)
        if comp:
            tree[pool][name].append(lab)

if opt.get('out'):
    with open(opt['out'], 'w') as f:
        for lab in labels:
            f.write(json.dumps(lab, separators=(',', ':')) + '\n')


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def boot(t, stat):
    """t: {pool: {spine: [items]}}: pool -> spine -> decision when t has several pools, spine -> decision for one, decision for one spine."""
    rng = random.Random(SEED)
    pools = sorted(t)
    vals = []
    for _ in range(B):
        items = []
        ps = [rng.choice(pools) for _ in pools] if len(pools) > 1 else pools
        for p in ps:
            ss = sorted(t[p])
            for s in ([rng.choice(ss) for _ in ss] if len(ss) > 1 else ss):
                xs = t[p][s]
                items.extend(rng.choice(xs) for _ in xs)
        v = stat(items)
        if v is not None:
            vals.append(v)
    if len(vals) < B / 2:
        return [None, None]
    vals.sort()
    return [round(vals[int(0.025 * len(vals))], 4), round(vals[min(len(vals) - 1, int(0.975 * len(vals)))], 4)]


def read(sel, stat, by_spine=False):
    t = {p: {s: [x for x in xs if sel(x)] for s, xs in ss.items()} for p, ss in tree.items()}
    flat = [x for ss in t.values() for xs in ss.values() for x in xs]
    pt = stat(flat)
    res = {'n': len(flat), 'point': None if pt is None else round(pt, 4), 'interval': boot(t, stat) if flat else [None, None], 'byPool': {}}
    for p in sorted(t):
        xs = [x for v in t[p].values() for x in v]
        q = stat(xs)
        res['byPool'][p] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({p: t[p]}, stat) if xs else [None, None]}
    if by_spine:
        res['bySpine'] = {}
        for p in sorted(t):
            for s in sorted(t[p]):
                xs = t[p][s]
                q = stat(xs)
                res['bySpine'][s] = {'n': len(xs), 'point': None if q is None else round(q, 4), 'interval': boot({p: {s: xs}}, stat) if xs else [None, None]}
    return res


share = lambda key: (lambda xs: mean([1.0 if x[key] else 0.0 for x in xs]))
everything = lambda x: True
out = {'contract': CONTRACT, 'training': TRAINING, 'pools': {p: sorted(ss) for p, ss in tree.items()},
       'branched': len(labels), 'labels': sum(1 for x in labels if x['complete']),
       'screenedRows': sum(1 for x in labels if x['screened']),
       'rowsUnmatched': sum(1 for x in labels if not x['rows']['match']),
       'confident': sum(1 for x in labels if x['confident']),
       'confidentQ': sum(1 for x in labels if x['confident'] and x['inQ']),
       'confidentForge': sum(1 for x in labels if x['confidentForge']),
       'trainingRows': sum(1 for x in labels if x['training'] is True),
       'partialLabels': sum(1 for x in labels if x['partial']), 'futilityControls': sum(1 for x in labels if x['futilityControl']),
       'branchedInFullRows': sum(1 for x in labels if x['branchedInFull']), 'confidentPartial': sum(1 for x in labels if x['partial'] and x['confident']),
       'futilityRead': sum(1 for x in labels if x['futilityGap'] is not None)}
out['byListing'] = {L: {'spines': sorted({x['spine'] for x in labels if x['listing'] == L}), 'rows': sum(1 for x in labels if x['listing'] == L),
                        'labels': sum(1 for x in labels if x['listing'] == L and x['complete']), 'confident': sum(1 for x in labels if x['listing'] == L and x['confident']),
                        'tokenTwice': sum(1 for x in labels if x['listing'] == L and x['tokenTwice'])} for L in ('pre-D483', 'D483')}
out['biasedRows'] = sum(1 for x in labels if x['biased'])
out['lostCastVoid'] = sum(1 for x in labels if x['lostCastVoid'])
out['lostCastVoidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['lostCastVoid']]
out['lostCastOptionRows'] = ['%s d%d o%s' % (x['spine'], x['d'], ','.join(str(o) for o in x['lostCastOptions'])) for x in labels if x['lostCastOptions']]
out['refusedCastVoid'] = sum(1 for x in labels if x['refusedCastVoid'])
out['refusedCastVoidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['refusedCastVoid']]
out['refusedCastOptionRows'] = ['%s d%d o%s' % (x['spine'], x['d'], ','.join(str(o) for o in x['refusedCastOptions'])) for x in labels if x['refusedCastOptions']]
out['byRandomSeat'] = {S: {'spines': sorted({x['spine'] for x in labels if x['randomSeat'] == S}), 'rows': sum(1 for x in labels if x['randomSeat'] == S),
                           'labels': sum(1 for x in labels if x['randomSeat'] == S and x['complete']), 'confident': sum(1 for x in labels if x['randomSeat'] == S and x['confident'])}
                       for S in sorted({x['randomSeat'] for x in labels})}
out['bySpine'] = {}
for name, m in meta.items():
    xs = [x for x in labels if x['spine'] == name]
    cs = [x for x in xs if x['complete']]
    out['bySpine'][name] = dict(m, rows=len(xs), labels=len(cs), screenedRows=sum(1 for x in xs if x['screened']),
                                partialLabels=sum(1 for x in xs if x['partial']), futilityControls=sum(1 for x in xs if x['futilityControl']),
                                branchedInFullRows=sum(1 for x in xs if x['branchedInFull']), decisionsBranched=sum(1 for x in xs if not x['screened']),
                                inQ=sum(1 for x in cs if x['inQ']), decided=sum(1 for x in cs if x['decided']), settled=sum(1 for x in cs if x['settled']),
                                confident=sum(1 for x in cs if x['confident']), confidentForge=sum(1 for x in cs if x['confidentForge']) if m['forgeMap'] else None,
                                byKind={k: {'labels': sum(1 for x in cs if x['kind'] == k), 'confident': sum(1 for x in cs if x['kind'] == k and x['confident'])} for k in ('p', 'a', 'b')},
                                gapMedian=round(statistics.median([x['gap'] for x in cs]), 4) if cs else None,
                                regretMean=round(mean([x['regret'] for x in cs if x['regret'] is not None]), 4) if any(x['regret'] is not None for x in cs) else None,
                                confidentList=['d%d %s t%d k%d %s -> o%s, %.1f [%.1f, %.1f]' % (x['d'], x['kind'], x['turn'], x['k'], x['forgeToken'], x['bestRandom'],
                                               100 * x['regret'], 100 * x['regretLo'], 100 * x['regretHi']) for x in cs if x['confident']])
out['byPool'] = {p: {'spines': len(ss), 'labels': sum(len(v) for v in ss.values()), 'confident': sum(1 for v in ss.values() for x in v if x['confident'])} for p, ss in tree.items()}
# (a) the confident share: pooled, by pool, by spine; by kind; by option count; over Q
out['a_confidentShare'] = read(everything, share('confident'), by_spine=True)
out['a_confidentShareByKind'] = {k: read(lambda x, k=k: x['kind'] == k, share('confident')) for k in ('p', 'a', 'b')}
out['a_confidentShareByK'] = {k: read(lambda x, k=k: x['kBucket'] == k, share('confident')) for k in ('2', '3-4', '5-6', '7-8')}
out['a_confidentShareQ'] = read(lambda x: x['inQ'], share('confident'))
# (b) what a label tells: the gap, the regret, the settled share
out['b_gapMedian'] = {p: (round(statistics.median([x['gap'] for v in ss.values() for x in v]), 4) if any(ss.values()) else None) for p, ss in tree.items()}
out['b_gapMean'] = read(everything, lambda xs: mean([x['gap'] for x in xs]))
out['b_regretMean'] = read(everything, lambda xs: mean([x['regret'] for x in xs if x['regret'] is not None]))
out['b_settledShare'] = read(everything, share('settled'))
# (c) the sizing: per spine, per pool, per night, at the measured wall (checks included), and scaled to 7 workers
wall = {}
if opt.get('times') and os.path.exists(opt['times']):
    for line in open(opt['times']):
        f = line.split()
        if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
            prev = wall.get(f[0], (0, set()))
            wall[f[0]] = (prev[0] + int(f[2]) - int(f[1]), prev[1] | ({f[3]} if len(f) > 3 else set()))


def size(names):
    s = {'wallSec': 0, 'spinesTimed': 0, 'labels': 0, 'confident': 0, 'wallSecAt7': 0.0, 'workerHours': 0.0}
    for n in names:
        m = meta[n]
        w = wall.get(m['folder'])
        if w is None:
            continue
        ws = [int(v) for v in w[1] if str(v).isdigit()]
        s['wallSec'] += w[0]
        s['spinesTimed'] += 1
        s['labels'] += len(tree[m['pool']][n])
        s['confident'] += sum(1 for x in tree[m['pool']][n] if x['confident'])
        s['wallSecAt7'] += w[0] * (ws[0] / 7) if len(ws) == 1 else float('nan')
        s['workerHours'] += w[0] * ws[0] / 3600 if len(ws) == 1 else float('nan')
    h, h7 = s['wallSec'] / 3600, s['wallSecAt7'] / 3600
    ok7 = h7 == h7 and h7 > 0
    s['wallSecAt7'] = round(s['wallSecAt7']) if ok7 else None
    s['labelsPer10hNight'] = round(10 * s['labels'] / h) if h else None
    s['confidentPer10hNight'] = round(10 * s['confident'] / h) if h else None
    s['labelsPer7Worker10hNight'] = round(10 * s['labels'] / h7) if ok7 else None
    s['confidentPer7Worker10hNight'] = round(10 * s['confident'] / h7, 1) if ok7 else None
    lo, hi = poisson95(s['confident'])
    s['confidentPer7Poisson95'] = [round(10 * lo / h7, 1), round(10 * hi / h7, 1)] if ok7 else None
    okw = s['workerHours'] == s['workerHours'] and s['workerHours'] > 0
    s['confidentPerWorkerHour'] = round(s['confident'] / s['workerHours'], 4) if okw else None
    s['confidentPerWorkerHourPoisson95'] = [round(lo / s['workerHours'], 4), round(hi / s['workerHours'], 4)] if okw else None
    s['workerHours'] = round(s['workerHours'], 2) if okw else None
    return s


out['c_sizing7'] = {'bySpine': {n: size([n]) for n in meta}, 'byPool': {p: size(sorted(ss)) for p, ss in tree.items()}, 'asRun': size(list(meta))}
out['c_sizingRead'] = {'confidentPer7Worker10hNight': out['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                       'confident': out['c_sizing7']['asRun']['confident'], 'labelsPer7Worker10hNight': out['c_sizing7']['asRun']['labelsPer7Worker10hNight'],
                       'poisson95': out['c_sizing7']['asRun']['confidentPer7Poisson95'],
                       'confidentPerWorkerHour': out['c_sizing7']['asRun']['confidentPerWorkerHour'],
                       'confidentPerWorkerHourPoisson95': out['c_sizing7']['asRun']['confidentPerWorkerHourPoisson95'],
                       'readThis': 'confidentPerWorkerHour and confidentPer7Worker10hNight are the yield to compare across nights; the confident share over complete rows is not (D489: the stopped futile decisions are not in it)',
                       'review': {'confidentPer7Worker10hNight': 45.6, 'interval': [41.0, 50.8], 'base': 32.8, 'gain': [1.39, 1.25, 1.55],
                                  'note': 'the atlas review of 2026-10-27, section 5: the cap and the futility stop re-scored on 29 spines (no controls; ~43-44 with a quarter of the futile decisions played on: its hours x 0.675 / 0.71); another mix of decks and seats; as information'},
                       'expectation': 'as information, no verdict: J191 (THE SAME POPULATION: D508\'s fifth night, the same seat and design, other decks) below as its own report read it; J190 (its fourth night), J188 (its third), J187 (its second) and J186 (its first, aborted before its Report) in the job file; J185 (D507), J183 and J182 (D498), J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations; the review ~46 [41, 51]'}
J191 = None
if opt.get('j191') and os.path.exists(opt['j191']):
    try:
        j6 = json.load(open(opt['j191']))
        a6 = j6['c_sizing7']['asRun']
        wh6 = a6['wallSecAt7'] * 7 / 3600 if a6.get('wallSecAt7') else None
        J191 = {'labels': j6['labels'], 'confident': j6['confident'], 'confidentShare': (j6.get('a_confidentShare') or {}).get('point'),
                'confidentPer7Worker10hNight': a6['confidentPer7Worker10hNight'], 'poisson95': a6['confidentPer7Poisson95'],
                'workerHours': round(wh6, 2) if wh6 else None, 'confidentPerWorkerHour': round(a6['confident'] / wh6, 4) if wh6 else None,
                'spines': len(j6.get('bySpine') or {}), 'contract': j6.get('contract'), 'pools': sorted(j6.get('pools') or {}),
                'futilityRead': {k: (j6.get('f_futilityRead') or {}).get(k) for k in ('controls', 'controlsConfident', 'stopped', 'read')},
                'population': 'D508 (the same population, its fifth night): pooled with this night, J186, J187, J188 and J190 under the same pool names; its futilityRead is the pooled futility read\'s fifth input, J186\'s by-hand one, J187\'s, J188\'s and J190\'s the first four (D508, D509, Comparability)'}
    except (OSError, ValueError, KeyError, TypeError):
        J191 = None
out['c_sizingRead']['j191'] = J191


def clopper(k, n):
    """the exact (Clopper-Pearson) 95% interval of a binomial share, k of n, by bisection on the binomial CDF"""
    if n == 0:
        return [None, None]

    def cdf(kk, p):
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(kk + 1))

    def solve(f):
        lo, hi = 0.0, 1.0
        for _ in range(100):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if f(mid) > 0 else (lo, mid)
        return (lo + hi) / 2
    low = 0.0 if k == 0 else solve(lambda p: cdf(k - 1, p) - 0.975)
    high = 1.0 if k == n else solve(lambda p: cdf(k, p) - 0.025)
    return [round(low, 4), round(high, 4)]


# (f) the futility read: the controls are the decisions the rule would have stopped, played to the full n; how many end confident is
# what the rule loses. POOLED across nights: this night's counts are pooledInputs; one night's ~10 controls are a partial read
ctl = [x for x in labels if x['futilityControl']]
stp = [x for x in labels if x['partial']]
kc = sum(1 for x in ctl if x['confident'])
cp = clopper(kc, len(ctl))
out['f_futilityRead'] = {'read': sum(1 for x in labels if x['futilityGap'] is not None), 'futile': len(ctl) + len(stp), 'stopped': len(stp),
                         'controls': len(ctl), 'controlsComplete': sum(1 for x in ctl if x['complete']), 'controlsConfident': kc,
                         'controlConfidentShare': round(kc / len(ctl), 4) if ctl else None, 'controlConfidentShare95': cp,
                         'labelsLostEstimate': round(kc / len(ctl) * len(stp), 2) if ctl else None,
                         'labelsLostEstimate95': [round(cp[0] * len(stp), 2), round(cp[1] * len(stp), 2)] if ctl else None,
                         'controlList': ['%s d%d k%d gap %s -> %s' % (x['spine'], x['d'], x['k'], x['futilityGap'], 'confident' if x['confident'] else 'not confident') for x in ctl],
                         'stoppedList': ['%s d%d k%d gap %s' % (x['spine'], x['d'], x['k'], x['futilityGap']) for x in stp],
                         'review': {'confident': 3, 'of': 77, 'share': 0.039, 'note': 'the atlas review of 2026-10-27, section 1: o0 leading or tied at 50 branches -> 3 of 77 confident at the full n (200), on 29 spines of three seats; read after the fact, not on controls'},
                         'pooledInputs': {'controls': len(ctl), 'controlsConfident': kc, 'stopped': len(stp), 'read': sum(1 for x in labels if x['futilityGap'] is not None)},
                         'partial': True, 'note': 'one night of a read pooled across nights: add pooledInputs to later nights\' before reading the share; no verdict'}
unb = [n for n in meta if n not in BIASED]
out['c_sizingReadUnbiased'] = dict(size(unb), spines=sorted(unb), left=sorted(n for n in meta if n in BIASED),
                                   note='the sizing read over the spines not marked biased (--biased=); J193 marks none, so it is the as-run read')
out['d486Rows'] = {'modesDrawn': sum(x['modesDrawn'] for x in labels), 'modesDrawnBranches': sum(x['modesDrawnBranches'] for x in labels),
                   'retargeted': sum(x['retargeted'] for x in labels), 'rowsWithModesDrawn': sum(1 for x in labels if x['modesDrawn'] > 0)}
out['d488Rows'] = {'targetCountTrimmed': sum(x['targetCountTrimmed'] for x in labels), 'costTargetAvoided': sum(x['costTargetAvoided'] for x in labels),
                   'targetCountTrimmedBranches': sum(x['targetCountTrimmedBranches'] for x in labels),
                   'costTargetAvoidedBranches': sum(x['costTargetAvoidedBranches'] for x in labels),
                   'rowsWithTrimmed': sum(1 for x in labels if x['targetCountTrimmed'] > 0), 'rowsWithAvoided': sum(1 for x in labels if x['costTargetAvoided'] > 0),
                   'refusedCastBranches': sum(x['refusedCastBranches'] or 0 for x in labels)}
# the void count (0 expected since D470), any non-block decision that played one game under every option
out['voidLabels'] = sum(1 for x in labels if x['void'])
out['voidList'] = ['%s d%d %s' % (x['spine'], x['d'], x['forgeToken']) for x in labels if x['void']]
out['sameGameNotBlock'] = ['%s d%d' % (x['spine'], x['d']) for x, same in same_any if same and x['kind'] != 'b' and x['complete']]
print(json.dumps(out, indent=1))

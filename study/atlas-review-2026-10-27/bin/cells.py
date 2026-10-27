"""(1) Where confident labels come from, and (2a) branch time per confident label, by cell, seat as a column.
Unit: a decision branched in full (complete). Cost: every branched decision's worker time in the cell, screened ones too
(their 25 branches), random and Forge map. Writes report/cells.md and report/cells.json."""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]

def gapb(x):
    if x is None: return '?'
    return '<.02' if x < .02 else '.02-.05' if x < .05 else '.05-.10' if x < .10 else '>=.10'
def regb(x):
    if x is None: return '?'
    return '<=0 (o0 leads)' if x <= 0 else '0-.05' if x < .05 else '.05-.10' if x < .10 else '.10-.20' if x < .20 else '>=.20'
def baseb(x):
    if x is None: return '?'
    v = x * (1 - x)
    return 'p(1-p)<.05' if v < .05 else '.05-.15' if v < .15 else '.15-.20' if v < .20 else '>.20 (near even)'
KIND = {'p': 'priority', 'a': 'attack', 'b': 'block'}
CELLS = {
    'kind': lambda r: KIND[r['kind']],
    'k (distinct plays)': lambda r: kb(r.get('k')),
    'turn': lambda r: tb(r['turn']),
    'band': lambda r: r['band'],
    'life (chooser - opponent)': lambda r: lifeb(r['state']),
    'creatures on board (both sides)': lambda r: boardb(r['state']),
    'creature count (chooser vs opponent)': lambda r: boarddiff(r['state']),
    'why picked': lambda r: r.get('why') or '?',
    'gap best - second (final, outcome-derived)': lambda r: gapb(r.get('gapBest2')),
    'regret of o0 after 50 branches (an early read)': lambda r: regb(r.get('regret50')),
    'mean value after 25 branches (the screen\'s read)': lambda r: baseb(r.get('base25')),
    'Forge map on the spine': lambda r: 'yes' if r['forgeMap'] else 'no',
    'kind x k': lambda r: KIND[r['kind']] + ' ' + ('k2' if (r.get('k') or 0) <= 2 else 'k3-4' if r['k'] <= 4 else 'k5+'),
    'turn x k': lambda r: tb(r['turn']) + (' k<=4' if (r.get('k') or 0) <= 4 else ' k5+'),
}

def wh(r):
    return sum(r.get('seg', {}).values()) / 3.6e6

def tally(rows, f):
    t = collections.defaultdict(lambda: collections.Counter())
    for r in rows:
        c = f(r); s = r['seat']
        t[c][('n', s)] += 1 if r.get('complete') else 0
        t[c][('conf', s)] += 1 if r.get('confident') else 0
        t[c][('scr', s)] += 1 if r.get('screened') else 0
        t[c][('wh', s)] += wh(r)
        t[c][('g', s)] += (r.get('nRandomGames') or 0) + (r.get('nForgeGames') or 0)
    return t

def main():
    md = ['# (1)–(2a) Confident labels and branch time by cell', '',
          'Unit: a decision branched in full (`complete`). `n` and `conf` per seat (old = J166–J169, 13 spines; D486 = J171, 13; '
          'D488 = J173, 3 so far). Pooled columns are a design read only, never a training pool. `wh` = branch worker-hours spent '
          'in the cell, screened decisions\' 25 branches and the Forge map included. Wilson 95% on the pooled rate.', '']
    js = {}
    flags_hi, flags_lo = [], []
    for name, f in CELLS.items():
        t = tally(B, f)
        hdr = ['cell'] + [f'{s} n/conf' for s in SEATS] + ['pooled n', 'conf', 'rate', 'Wilson 95%', 'screened', 'wh', 'wh / conf', 'games / conf']
        rows = []
        for c in sorted(t, key=lambda x: str(x)):
            x = t[c]
            n = sum(x[('n', s)] for s in SEATS); cf = sum(x[('conf', s)] for s in SEATS)
            w = sum(x[('wh', s)] for s in SEATS); sc = sum(x[('scr', s)] for s in SEATS); g = sum(x[('g', s)] for s in SEATS)
            rate = cf / n if n else None; lo, hi = wilson(cf, n)
            rows.append([c] + [f"{x[('n', s)]}/{x[('conf', s)]}" for s in SEATS] + [n, cf, rate, f'{fmt(lo)}–{fmt(hi)}' if n else '—', sc, w, (w / cf if cf else None), (int(g / cf) if cf else None)])
            js.setdefault(name, {})[c] = dict(n=n, conf=cf, rate=rate, wilson=[lo, hi], wh=w, screened=sc,
                                             bySeat={s: [x[('n', s)], x[('conf', s)], x[('wh', s)]] for s in SEATS})
            if n >= 8 and rate is not None and rate >= 0.4: flags_hi.append((name, c, n, cf, rate))
            if n >= 8 and rate is not None and rate <= 0.1: flags_lo.append((name, c, n, cf, rate))
        md += [f'## {name}', '', md_table(hdr, rows), '']
    tot_n = sum(1 for r in B if r.get('complete')); tot_c = sum(1 for r in B if r.get('confident')); tot_w = sum(wh(r) for r in B)
    md += ['## Cells at a rate >= 0.4 or <= 0.1 (pooled, n >= 8)', '',
           f'Overall: {tot_n} complete, {tot_c} confident ({tot_c/tot_n:.3f}), {tot_w:.1f} branch wh, {tot_w/tot_c:.2f} wh a confident label.', '',
           md_table(['', 'family', 'cell', 'n', 'conf', 'rate'], [['>= 0.4', a, b, n, c, r] for a, b, n, c, r in flags_hi] +
                    [['<= 0.1', a, b, n, c, r] for a, b, n, c, r in flags_lo]), '']
    # per seat overall
    rows = []
    for s in SEATS:
        bs = [r for r in B if r['seat'] == s]
        n = sum(1 for r in bs if r.get('complete')); c = sum(1 for r in bs if r.get('confident')); w = sum(wh(r) for r in bs)
        rows.append([s, len({r['spine'] for r in bs}), n, sum(1 for r in bs if r.get('screened')), c, c / n, w, w / c])
    md += ['## Per seat', '', md_table(['seat', 'spines', 'complete', 'screened', 'confident', 'rate', 'branch wh', 'wh / conf'], rows), '']
    open(os.path.join(REPORT, 'cells.md'), 'w').write('\n'.join(md))
    json.dump(js, open(os.path.join(REPORT, 'cells.json'), 'w'), indent=1)
    print('\n'.join(md))

main()

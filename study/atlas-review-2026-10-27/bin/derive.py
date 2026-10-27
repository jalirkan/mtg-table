"""Per branched decision: final gaps and base value, the 25/50-branch predictors, the n curve (the atlas's own
arithmetic re-run on rows i < N with the as-run stops), cost by segment, and a check that this bootstrap
reproduces atlas.json's confident flag. Writes work/derived.jsonl."""
import json, os, sys, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

NS = [25, 50, 100, 150, 200]

def main():
    L = listed()
    out = open(os.path.join(WORK, 'derived.jsonl'), 'w')
    agree = collections.Counter()
    for r in L:
        if not r['branched']:
            out.write(json.dumps(r) + '\n'); continue
        rd = rows_of(r); k = rd['k']; stops = rd['stops']; rows = rd['rows']
        full = matrix(rows, k, None, 'random', stops)
        mu = opt_means(full) if len(full) else None
        if mu is not None and len(full):
            s = sorted(mu, reverse=True)
            r['gapBest2'] = float(s[0] - s[1]) if len(s) > 1 else 0.0
            r['gapBestWorst'] = float(s[0] - s[-1])
            r['baseValue'] = float(np.mean(mu))
            r['nPaired'] = int(len(full))
        # the as-run label, re-computed (seed differs from the atlas's)
        if r.get('complete'):
            reg, best, lo, hi = regret_interval(full, seed=7 + r['d'])
            mine = lo is not None and lo > 0
            agree[(mine == r['confident'])] += 1
            r['myLo200'] = lo
        # the predictors available early
        for N in (25, 50):
            m = matrix(rows, k, N, 'random', stops)
            if len(m) >= 2:
                mm = opt_means(m)
                r[f'regret{N}'] = float(mm.max() - mm[0])
                s = sorted(mm, reverse=True); r[f'gap2_{N}'] = float(s[0] - s[1])
                r[f'base{N}'] = float(mm.mean())
        # n curve
        if r.get('complete'):
            nc = {}
            for N in NS:
                m = matrix(rows, k, N, 'random', stops)
                reg, best, lo, hi = regret_interval(m, seed=11 + N + r['d'])
                nc[N] = dict(regret=reg, best=best, lo=lo, hi=hi, conf=(lo is not None and lo > 0), n=int(len(m)))
            r['ncurve'] = nc
        # cost by segment (worker ms), random rows by branch index, and the Forge map's
        seg = collections.Counter()
        for (c, o, i, score, ms, err) in rows:
            if c == 'forge': seg['forge'] += ms
            else:
                seg['r<25' if i < 25 else 'r25-50' if i < 50 else 'r50-100' if i < 100 else 'r100-150' if i < 150 else 'r150-200'] += ms
        r['seg'] = dict(seg)
        out.write(json.dumps(r) + '\n')
    print('my bootstrap vs atlas confident flag at 200:', dict(agree))

main()

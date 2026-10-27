"""(2b') The n curve at every chunk (25..200), averaged over 5 bootstrap seeds to take out the low-end's RNG, and a
paired-difference projection to 300/400 for the decisions not confident at 200. Writes report/ncurve.md."""
import json, os, sys, math, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
C = [r for r in D if r['branched'] and r.get('complete')]
NS = [25, 50, 75, 100, 125, 150, 175, 200]
SEEDS = [101, 202, 303, 404, 505]
mats = {id(r): (rows_of(r)) for r in C}
res = collections.defaultdict(dict)  # id -> N -> mean conf over seeds
for r in C:
    rd = mats[id(r)]
    for N in NS:
        m = matrix(rd['rows'], rd['k'], N, 'random', rd['stops'])
        cs = []
        for s in SEEDS:
            reg, best, lo, hi = regret_interval(m, seed=s + r['d'] * 7 + N)
            cs.append(lo is not None and lo > 0)
        res[id(r)][N] = np.mean(cs)
md = ['# (2b\') The n curve, smoothed over 5 bootstrap seeds', '',
      'Expected confident count at a cap of N random branches (the as-run stops kept), mean over 5 seeds; "kept" = the expected overlap '
      'with the 200-branch set (a product of the per-seed flags is not taken: both are seed means). Cost = random rows i < N plus the Forge map.', '']
rows = []
for s in SEATS + ['all']:
    cs = [r for r in C if s == 'all' or r['seat'] == s]
    for N in NS:
        e = sum(res[id(r)][N] for r in cs)
        keep = sum(min(res[id(r)][N], res[id(r)][200]) for r in cs)
        cost = 0
        for r in cs:
            for (c, o, i, score, ms, err) in mats[id(r)]['rows']:
                if c == 'forge' or i < N: cost += ms
        cost /= 3.6e6
        rows.append([s, N, e, keep, cost, e / cost])
md += [md_table(['seat', 'N', 'E[confident]', 'E[overlap with 200]', 'wh', 'confident / wh'], rows), '']

# paired-difference projection
def proj(r, Nnew):
    rd = mats[id(r)]; m = matrix(rd['rows'], rd['k'], None, 'random', rd['stops'])
    mu = opt_means(m); b = int(np.argmax(mu))
    if b == 0: return 0.0, 0.0
    ok = ~np.isnan(m[:, b]) & ~np.isnan(m[:, 0])
    dlt = m[ok, b] - m[ok, 0]; n = len(dlt)
    if n < 10 or dlt.std() == 0: return 0.0, 0.0
    dbar = dlt.mean(); se = dlt.std(ddof=1) / math.sqrt(n)
    f = n / Nnew
    # true ~ N(dbar, se^2); new rows' mean ~ N(true, se^2 n/(Nnew-n)); pooled = f dbar + (1-f) new; need pooled > 1.96 se sqrt(f)
    sd = (1 - f) * math.sqrt(se * se + se * se * n / (Nnew - n))
    p_opt = 0.5 * (1 + math.erf((dbar - 1.96 * se * math.sqrt(f)) / (sd * math.sqrt(2))))
    # shrunk: the true difference at half the observed (a winner's-curse discount)
    p_half = 0.5 * (1 + math.erf((f * dbar + (1 - f) * dbar / 2 - 1.96 * se * math.sqrt(f)) / (max((1 - f) * se * math.sqrt(n / (Nnew - n)), 1e-9) * math.sqrt(2))))
    return p_opt, p_half
nc = [r for r in C if res[id(r)][200] < 0.5]
rows = []
for Nnew in (300, 400):
    po = ph = 0; cost = 0
    for r in nc:
        a, b = proj(r, Nnew); po += a; ph += b
        per = sum(ms for (c, o, i, sc, ms, err) in mats[id(r)]['rows'] if c == 'random' and 150 <= i < 200) / 50
        cost += per * (Nnew - 200) / 3.6e6
    rows.append([Nnew, len(nc), po, ph, cost, po / cost, ph / cost])
md += ['## Extending every decision not confident at 200 to 300 / 400 (projection)', '',
       'Paired difference between the 200-branch best option and o0. "Optimistic" takes the observed difference as the truth\'s '
       'centre; "discounted" halves it for the new rows (the best is picked after the fact, so its lead is inflated). '
       'Cost: each decision\'s own per-branch cost over its options still running at 150–200.', '',
       md_table(['N', 'decisions', 'E[new confident] optimistic', 'discounted', 'extra wh', 'conf / wh optimistic', 'discounted'], rows), '']
# only the close ones: z between 1 and 1.96
md += ['For comparison, new decisions yield the design\'s own rate (see budget.md (2b): ~0.6 confident / wh at 200, ~0.74 at 150).', '']
open(os.path.join(REPORT, 'ncurve.md'), 'w').write('\n'.join(md))
print('\n'.join(md))

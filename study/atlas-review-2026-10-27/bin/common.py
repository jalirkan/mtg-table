"""Shared helpers: the table, buckets, Wilson intervals and a numpy copy of atlasmath.regretInterval (D480's cut rows)."""
import json, os, math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, '..', 'work')
REPORT = os.path.join(HERE, '..', 'report')
SEATS = ['old', 'D486', 'D488']

def listed():
    return [json.loads(l) for l in open(os.path.join(WORK, 'listed.jsonl'))]

def rows_of(r):
    return json.load(open(os.path.join(WORK, 'rows', f"{r['seat']}-{r['spine']}-d{r['d']}.json")))

def kb(k):
    if k is None: return '?'
    return '2' if k <= 2 else '3' if k == 3 else '4' if k == 4 else '5-6' if k <= 6 else '7+'

def tb(t):
    return '1-4' if t <= 4 else '5-8' if t <= 8 else '9-14' if t <= 14 else '15+'

def lifeb(s):
    if not s: return '?'
    x = s['me.life'] - s['opp.life']
    return 'behind (<=-3)' if x <= -3 else 'ahead (>=+3)' if x >= 3 else 'even (-2..+2)'

def boardb(s):
    if not s: return '?'
    n = s['me.board.creatures'] + s['opp.board.creatures']
    return '0-2' if n <= 2 else '3-5' if n <= 5 else '6+'

def boarddiff(s):
    if not s: return '?'
    x = s['me.board.creatures'] - s['opp.board.creatures']
    return 'fewer creatures' if x < 0 else 'more creatures' if x > 0 else 'equal creatures'

def wilson(x, n, z=1.96):
    if n == 0: return (None, None)
    p = x / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0, c - h), min(1, c + h))

def matrix(rowsd, k, nmax=None, c='random', stops=None):
    """Paired matrix as decisionAtlas builds it: rows i < nmax, a stopped option's cell empty past its stop."""
    stops = {int(o): at for o, at in (stops or {}).items()}
    byI = {}
    for (cc, o, i, score, ms, err) in rowsd:
        if cc != c or err or score is None: continue
        if nmax is not None and i >= nmax: continue
        if c == 'random' and o in stops and i >= stops[o]: continue
        byI.setdefault(i, [np.nan] * k)[o] = score
    out = []
    for i in sorted(byI):
        row = byI[i]
        if all((not np.isnan(row[o])) or (o in stops and i >= stops[o]) for o in range(k)):
            out.append(row)
    return np.array(out, dtype=float).reshape(-1, k)

def regret_interval(m, boot=1000, seed=1, chosen=0):
    """max of option means - option `chosen`'s mean, and a paired bootstrap 2.5/97.5% (best re-picked per draw)."""
    n, k = m.shape
    if n < 2: return None, None, None, None
    v = np.nan_to_num(m); w = (~np.isnan(m)).astype(float)
    mu = v.sum(0) / np.maximum(w.sum(0), 1)
    if (w.sum(0) == 0).any(): return None, None, None, None
    best = int(np.argmax(mu)); reg = mu[best] - mu[chosen]
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n, size=(boot, n))
    S = v[idx].sum(1); C = w[idx].sum(1)
    ok = (C > 0).all(1)
    M = S[ok] / C[ok]
    g = M.max(1) - M[:, chosen]
    lo, hi = np.quantile(g, 0.025), np.quantile(g, 0.975)
    return float(reg), best, float(lo), float(hi)

def opt_means(m):
    v = np.nan_to_num(m); w = (~np.isnan(m)).astype(float)
    return v.sum(0) / np.maximum(w.sum(0), 1)

def fmt(x, nd=2):
    if x is None: return '—'
    if isinstance(x, float): return f'{x:.{nd}f}'
    return str(x)

def md_table(header, rows):
    out = ['| ' + ' | '.join(header) + ' |', '|' + '---|' * len(header)]
    for r in rows: out.append('| ' + ' | '.join(fmt(x) for x in r) + ' |')
    return '\n'.join(out)

# J168 read (numpy): each branched decision's random-map regret with stranded-cast branches taken out, and a control.
# usage: relabel2.py SPINE_DIR SCAN.jsonl NAME [--triggers]
import json, sys
import numpy as np
spine, scanf, name = sys.argv[1], sys.argv[2], sys.argv[3]
use_trig = '--triggers' in sys.argv
B, REPS = 10000, 200
atlas = json.load(open(spine + '/atlas.json'))
rows = [json.loads(l) for l in open(spine + '/phaseB/branches.jsonl') if l.strip()]
taint = {}
for l in open(scanf):
    r = json.loads(l)
    ev = r['stranded'] + (r['dropped'] if use_trig else [])
    if ev:
        taint[(r['d'], r['c'], r['o'], r['i'])] = ev

def build(x):
    k = len(x['options'])
    stopped = {o['o']: o['stoppedAt'] for o in x['options'] if o.get('stoppedAt') is not None}
    run = lambda o, i: o not in stopped or i < stopped[o]
    byI, tI = {}, {}
    for r in rows:
        if r['d'] != x['d'] or r['c'] != 'random' or r.get('error') or r.get('unavailable') or not run(r['o'], r['i']):
            continue
        byI.setdefault(r['i'], [np.nan] * k)[r['o']] = r['score']
        tI.setdefault(r['i'], [False] * k)[r['o']] = (r['d'], 'random', r['o'], r['i']) in taint
    idx = [i for i in sorted(byI) if all(not np.isnan(byI[i][o]) for o in range(k) if run(o, i))]
    M = np.array([byI[i] for i in idx], dtype=float).reshape(len(idx), k)
    T = np.array([tI[i] for i in idx], dtype=bool).reshape(len(idx), k)
    return M, T

def stat(M, cols, rng=None, boot=B):
    """regret (best mean - col 0 mean) over cols; point, best, lo, hi."""
    if M.shape[0] == 0:
        return None
    X = M[:, cols]
    with np.errstate(all='ignore'):
        mu = np.nanmean(X, axis=0)
    if np.isnan(mu).any():
        return None
    best = int(np.argmax(mu))
    pt = float(mu[best] - mu[0])
    if X.shape[0] < 2:
        return {'regret': pt, 'best': cols[best], 'lo': None, 'hi': None, 'n': X.shape[0]}
    rng = rng or np.random.default_rng(150)
    n = X.shape[0]
    I = rng.integers(0, n, size=(boot, n))
    S = X[I]                               # boot x n x k
    cnt = (~np.isnan(S)).sum(axis=1)
    sm = np.nansum(S, axis=1)
    with np.errstate(all='ignore'):
        mus = sm / cnt
    g = np.nanmax(mus, axis=1) - mus[:, 0]
    g = g[~np.isnan(mus).any(axis=1)]
    lo, hi = np.quantile(g, 0.025), np.quantile(g, 0.975)
    return {'regret': round(pt, 4), 'best': cols[best], 'lo': round(float(lo), 4), 'hi': round(float(hi), 4), 'n': n}

def scr(M, cols):
    with np.errstate(all='ignore'):
        mu = np.nanmean(M[:, cols], axis=0)
    return None if M.shape[0] == 0 or np.isnan(mu).any() else round(float(mu.mean()), 4)

for x in atlas['phaseB']['decisions']:
    k = len(x['options'])
    M, T = build(x)
    allc = list(range(k))
    nopt = [o['random']['n'] for o in x['options']]
    forced = [0] * k
    later = [0] * k
    for (d, c, o, i), ev in taint.items():
        if d == x['d'] and c == 'random':
            forced[o] += sum(1 for e in ev if e.get('forced'))
            later[o] += 1 if any(not e.get('forced') for e in ev) else 0
    dead = [o for o in range(k) if forced[o] >= 0.5 * max(1, nopt[o])]
    keep = [o for o in range(k) if o not in dead]
    bad_all = T.any(axis=1)
    bad_keep = T[:, keep].any(axis=1) if keep else bad_all
    base = stat(M, allc)
    drop = stat(M[~bad_all], allc)
    # clean vs tainted value per option (all branches, unpaired)
    cv = []
    for o in range(k):
        col, tc = M[:, o], T[:, o]
        ok = ~np.isnan(col)
        cv.append({'clean': round(float(col[ok & ~tc].mean()), 3) if (ok & ~tc).any() else None, 'nClean': int((ok & ~tc).sum()),
                   'tainted': round(float(col[ok & tc].mean()), 3) if (ok & tc).any() else None, 'nTainted': int((ok & tc).sum())})
    dd = None
    if dead:
        if 0 in dead:
            dd = {'void': True}
        else:
            dd = stat(M[~bad_keep], keep)
    # control: drop the same number of rows at random; how often is the label still confident with the same best?
    ctrl = None
    nb = int(bad_all.sum())
    if base and base['lo'] is not None and base['lo'] > 0 and 0 < nb < M.shape[0] - 1:
        rng = np.random.default_rng(7)
        keepc = 0
        for _ in range(REPS):
            sel = np.ones(M.shape[0], bool)
            sel[rng.choice(M.shape[0], nb, replace=False)] = False
            s = stat(M[sel], allc, rng, 2000)
            keepc += 1 if s and s['lo'] is not None and s['lo'] > 0 and s['best'] == base['best'] else 0
        ctrl = round(keepc / REPS, 3)
    out = {'spine': name, 'd': x['d'], 'kind': x['kind'], 'turn': x['turn'], 'k': k, 'complete': x['complete'], 'screened': bool(x.get('screened')),
           'tokens': [o['token'] for o in x['options']], 'labels': [o['label'] for o in x['options']], 'n': nopt,
           'forcedStranded': forced, 'laterTaintedBranches': later, 'pairedRows': int(M.shape[0]), 'taintedRows': nb,
           'atlas': {'regret': x['random']['regret'], 'best': x['random']['best'], 'lo': x['random']['regretLo'], 'hi': x['random']['regretHi']},
           'base': base, 'dropRows': drop, 'deadOptions': dead, 'dropDead': dd, 'controlKeepShare': ctrl, 'cleanVsTainted': cv,
           'screenMean': x.get('screenMean'), 'screenMeanClean': scr(M[~bad_all], allc) if x.get('screened') else None}
    print(json.dumps(out))

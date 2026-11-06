#!/usr/bin/env python3
# mtg-table — tools/atlas: the atlas's cap read: how many confident labels each branch count would have given.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The cap read, (g): how much of a night's final confident set is already confident at N random branches.

    python3 -I tools/atlas/ncurve.py [--n=50,100,150] NAME:DIR ...

READS each spine DIR's atlas.json and phaseB/branches.jsonl. WRITES one JSON object to stdout. Standard library only;
Python's own random.Random for the bootstrap, so a read is reproducible; no engine.

Moved into the repository from the lab's J193 job file, byte for byte (D515); the comment block below is the job's.
"""
# J193: J177's ncurve.py, unchanged (the cap read, (g), on J193's own branches).
# J177 (drafts/J177-atlas-4b-night-three.md): the cap read, (g) -- the atlas review's n curve (study/atlas-review-2026-10-27,
# bin/ncurve.py, report/ncurve.md) on this night's own branches, registered before any J177 data. Standard library only; no engine.
# For every COMPLETE decision of seat A (not screened, not a futility-stopped partial label; a futility control is complete):
#   the paired random-map matrix as decisionAtlas builds it -- branch rows i < N of every option, a row kept when every option
#   has a score there or is stopped by early stopping at or before i (its cell then empty), an errored or unavailable row empty;
#   the regret (the best option's mean minus option 0's) and its paired bootstrap interval, 1,000 draws, the best re-picked in
#   each draw, the 2.5% / 97.5% quantiles; CONFIDENT AT N when the low end is > 0. The bootstrap is Python's random.Random, seeded
#   s + 7 d + N for s in 101, 202, 303, 404, 505 (the review's seeds and offsets), and a decision's confident-at-N is the MEAN over
#   the five (the review's "smoothed over 5 bootstrap seeds"), so the read is a seed mean, not atlas.json's own interval.
#   the final set   the decisions atlas.json calls confident (complete and random.regretLo > 0) at their full n
#   keptAtN         the sum over the final set of the decision's confident-at-N: how much of the final set is already
#                   confident with N branches; keptShareAtN = keptAtN / |final set|
#   expectedAtN     the sum over every complete decision of its confident-at-N (the review's E[confident])
#   selfAgree       at the decision's full n, the decisions whose seed-mean verdict (> .5) is atlas.json's own (the review: 215 of 222)
#   ncurve.py [--n=50,100,150] NAME:DIR ...   prints one JSON object
import glob, json, os, random, sys

SEEDS = (101, 202, 303, 404, 505)
B = 1000
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
NS = [int(x) for x in opt.get('n', '50,100,150').split(',')]
# the review's n curve, all 29 spines (old, D486 and D488 seats; final n = 200): E[confident] and E[overlap with 200]
REVIEW = {'final': 65.4, 'atN': {'50': {'expected': 43.4, 'kept': 35.0}, '100': {'expected': 50.0, 'kept': 44.6},
                                 '150': {'expected': 64.8, 'kept': 57.0}, '200': {'expected': 65.4, 'kept': 65.4}},
          'note': 'study/atlas-review-2026-10-27/report/ncurve.md, seat "all": a 200-branch design; "at 150, 88% of the final confident set is already confident" (section 2)'}


def matrix(rows, k, nmax, stops):
    by = {}
    for o, i, s in rows:
        if nmax is not None and i >= nmax:
            continue
        if o in stops and i >= stops[o]:
            continue
        by.setdefault(i, [None] * k)[o] = s
    out = []
    for i in sorted(by):
        r = by[i]
        if all(r[o] is not None or (o in stops and i >= stops[o]) for o in range(k)):
            out.append(r)
    return out


def regret_lo(m, k, seed):
    n = len(m)
    if n < 2:
        return None
    v = [[(r[o] if r[o] is not None else 0.0) for r in m] for o in range(k)]
    w = [[(1.0 if r[o] is not None else 0.0) for r in m] for o in range(k)]
    full = [all(x == 1.0 for x in w[o]) for o in range(k)]
    if any(sum(w[o]) == 0 for o in range(k)):
        return None
    rng = random.Random(seed)
    idx_all = range(n)
    g = []
    for _ in range(B):
        idx = rng.choices(idx_all, k=n)
        mu = []
        ok = True
        for o in range(k):
            s = sum(map(v[o].__getitem__, idx))
            c = n if full[o] else sum(map(w[o].__getitem__, idx))
            if c == 0:
                ok = False
                break
            mu.append(s / c)
        if ok:
            g.append(max(mu) - mu[0])
    if not g:
        return None
    g.sort()
    return g[int(0.025 * (len(g) - 1) + 0.5)]


out = {'definitions': 'see the header of this script', 'n': NS, 'review': REVIEW, 'bySpine': {}, 'final': 0, 'complete': 0,
       'atN': {str(N): {'expected': 0.0, 'kept': 0.0} for N in NS}, 'selfAgree': 0}
for a in args:
    name, d0 = a.split(':', 1)
    try:
        doc = json.load(open(os.path.join(d0, 'atlas.json')))
    except (OSError, ValueError):
        continue
    rows = {}
    for line in open(os.path.join(d0, 'phaseB', 'branches.jsonl')):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        if r.get('c') != 'random':
            continue
        s = r.get('score') if r.get('error') is None and not r.get('unavailable') else None
        rows.setdefault(r['d'], []).append((r['o'], r['i'], s))
    sp = {'final': 0, 'complete': 0, 'atN': {str(N): {'expected': 0.0, 'kept': 0.0} for N in NS}, 'selfAgree': 0}
    for x in doc['phaseB']['decisions']:
        if not x.get('complete') or x.get('screened') or x.get('partial'):
            continue
        k = len(x['options'])
        stops = {o['o']: o['stoppedAt'] for o in x['options'] if o.get('stoppedAt') is not None}
        conf = x['random']['regretLo'] is not None and x['random']['regretLo'] > 0
        sp['complete'] += 1
        sp['final'] += 1 if conf else 0
        full = matrix(rows.get(x['d'], []), k, None, stops)
        fm = sum(1 for s in SEEDS if (lambda lo: lo is not None and lo > 0)(regret_lo(full, k, s + 7 * x['d'] + len(full)))) / len(SEEDS)
        sp['selfAgree'] += 1 if (fm > 0.5) == conf else 0
        for N in NS:
            m = matrix(rows.get(x['d'], []), k, N, stops)
            e = sum(1 for s in SEEDS if (lambda lo: lo is not None and lo > 0)(regret_lo(m, k, s + 7 * x['d'] + N))) / len(SEEDS)
            sp['atN'][str(N)]['expected'] += e
            sp['atN'][str(N)]['kept'] += e if conf else 0.0
    for N in NS:
        for kk in ('expected', 'kept'):
            sp['atN'][str(N)][kk] = round(sp['atN'][str(N)][kk], 2)
            out['atN'][str(N)][kk] += sp['atN'][str(N)][kk]
    for kk in ('final', 'complete', 'selfAgree'):
        out[kk] += sp[kk]
    out['bySpine'][name] = sp
for N in NS:
    a = out['atN'][str(N)]
    a['expected'], a['kept'] = round(a['expected'], 2), round(a['kept'], 2)
    a['keptShare'] = round(a['kept'] / out['final'], 4) if out['final'] else None
print(json.dumps(out, indent=1))

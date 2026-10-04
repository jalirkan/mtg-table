# mtg-table — evolve's discovery rule simulated under realistic clustering (docs/evidence/evolve-calibration.md).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   python3 docs/evidence/evolve-calibration-sim.py extract <run1.log> <matches.json>
#   python3 docs/evidence/evolve-calibration-sim.py hetero <matches.json>
#   python3 docs/evidence/evolve-calibration-sim.py run <matches.json> <cards.json> [--gens 300] [--seed 1]
#
# Inputs are derived from pc-results results/J039 (see the evidence file):
#   matches.json  every match line of run1.log: batch (d<gen> discovery, c<gen>
#                 confirmation), A pair, B pair, game letters (`extract`)
#   cards.json    gen 1's stats.json cards with the Omega cube's colours and land
#                 flag: name, colors, land, inDecks (committed beside this file
#                 as evolve-calibration-cards.json)
#
# `hetero` is the between-batch chi-square of colour and pair win rates (the
# evidence file's section 2).  `run` is the simulation:
#
# It replays the discovery rule of tools/cubelab/evolve.ts (dominant-win:
# exact binomial on counts divided by the deck-level design effect, null
# boundary = the batch's mean card win rate, BH at fdrQ 0.1 over a family of
# ~394 tests, size filter rate >= mean + 0.05) and the confirmation rule (300
# fresh drafts, Holm at 0.05, same size filter) on simulated generations:
#
#   null      every pair equally strong, no card has an effect of its own;
#   colour    each pair as strong as J039's four discovery batches pooled say,
#             still no card effect of its own (the cards win as their decks do).
#
# Deck pairs come from J039's own matches (who drafted what against whom), so
# the co-occurrence of cards through colours is the real one; within a colour
# a card joins a deck with its gen-1 inclusion rate.  A deck has a random
# strength (sd `--deck-sd`, logit scale) on top of its pair's, tuned so the
# deck-level design effect is J039's ~1.02.  Nothing here reads drafts.jsonl.

import argparse
import collections
import json
import math
import re
import sys

import numpy as np
from scipy import stats as SS
from scipy.special import betainc


def extract(log: str, out: str) -> None:
    rows, batch, g = [], None, 0
    for line in open(log, encoding='utf-8').read().splitlines():
        m = re.match(r'== generation (\d+)/', line)
        if m:
            g = int(m.group(1)); batch = f'd{g}'; continue
        if 'confirming on' in line:
            batch = f'c{g}'; continue
        m = re.match(r'\[(\d+)/(\d+)\] seed (\d+): A:(\S+) (\d)-(\d) B:(\S+)\s+games (\S+)', line)
        if m:
            rows.append(dict(batch=batch, seed=int(m.group(3)), A=m.group(4), B=m.group(7), games=m.group(8)))
    json.dump(rows, open(out, 'w'))
    print(collections.Counter(r['batch'] for r in rows))


def hetero(path: str) -> None:
    rows = json.load(open(path))
    by = collections.defaultdict(list)
    for r in rows:
        gl = [x for x in r['games'] if x in 'AB']
        a, n = gl.count('A'), len(gl)
        by[r['batch']] += [(r['A'].split('+')[0], a, n), (r['B'].split('+')[0], n - a, n)]
    disc = sorted(b for b in by if b.startswith('d'))
    conf = sorted(b for b in by if b.startswith('c'))

    def group(ds, key):
        acc = collections.defaultdict(list)
        for pair, w, n in ds:
            for k in key(pair): acc[k].append((w, n))
        out = {}
        for k, v in acc.items():
            W = sum(w for w, _ in v); G = sum(n for _, n in v)
            if G:
                r = W / G
                out[k] = (r, G, sum((w - r * n) ** 2 for w, n in v) / G ** 2, r * (1 - r) / G)
        return out
    for label, key in [('colour', lambda p: list(set(p))), ('pair', lambda p: [p])]:
        S = {b: group(by[b], key) for b in disc + conf}
        chi = chib = df = 0.0
        print(f'=== by {label}: ' + ' '.join(disc + conf))
        for k in sorted(S[disc[0]], key=lambda k: -S[disc[0]][k][1]):
            rs = [S[b][k] for b in disc if k in S[b]]
            w = np.array([1 / x[2] for x in rs]); r = np.array([x[0] for x in rs]); rbar = (w * r).sum() / w.sum()
            c = (w * (r - rbar) ** 2).sum(); chi += c; df += len(rs) - 1
            chib += (np.array([1 / x[3] for x in rs]) * (r - rbar) ** 2).sum()
            print(f'{k:3s} ' + ' '.join(f'{S[b][k][0]:.3f}({S[b][k][1]})' if k in S[b] else '-' for b in disc + conf))
        print(f'between discovery batches: chi2 {chi:.1f} (cluster variance), {chib:.1f} (binomial) on {df:.0f} df, p {1 - SS.chi2.cdf(chi, df):.3f}')
        D = group(sum((by[b] for b in disc), []), key); C = group(sum((by[b] for b in conf), []), key)
        z2 = [(C[k][0] - D[k][0]) ** 2 / (C[k][2] + D[k][2]) for k in D if k in C]
        print(f'confirmation pooled vs discovery pooled: chi2 {sum(z2):.1f} on {len(z2)} df, p {1 - SS.chi2.cdf(sum(z2), len(z2)):.3f}')
    for b in disc + conf:
        ds = by[b]; G = sum(n for *_, n in ds); W = sum(w for _, w, _ in ds); p = W / G
        print(b, 'deck-level design effect', round(sum((w - p * n) ** 2 for _, w, n in ds) / (p * (1 - p) * G), 3))


if len(sys.argv) > 1 and sys.argv[1] == 'extract':
    extract(sys.argv[2], sys.argv[3]); sys.exit(0)
if len(sys.argv) > 1 and sys.argv[1] == 'hetero':
    hetero(sys.argv[2]); sys.exit(0)
if len(sys.argv) > 1 and sys.argv[1] == 'run':
    del sys.argv[1]

ap = argparse.ArgumentParser()
ap.add_argument('matches')
ap.add_argument('cards')
ap.add_argument('--gens', type=int, default=300)
ap.add_argument('--seed', type=int, default=1)
ap.add_argument('--plain', type=int, default=1400, help='plain drafts read by the discovery rule (J039: 1342-1423 of 2000)')
ap.add_argument('--confirm', type=int, default=300)
ap.add_argument('--deck-sd', type=float, default=0.25)
ap.add_argument('--family', type=int, default=394)
a = ap.parse_args()
rng = np.random.default_rng(a.seed)

rows = json.load(open(a.matches))
disc_rows = [r for r in rows if r['batch'].startswith('d')]
pairs = sorted({r[k].split('+')[0] for r in disc_rows for k in 'AB'})
pidx = {p: i for i, p in enumerate(pairs)}
match_pairs = np.array([[pidx[r['A'].split('+')[0]], pidx[r['B'].split('+')[0]]] for r in disc_rows])

# Pooled pair win rates over J039's discovery batches.
w = collections.Counter(); g = collections.Counter()
for r in disc_rows:
    gl = [x for x in r['games'] if x in 'AB']
    for k in 'AB':
        p = r[k].split('+')[0]
        g[p] += len(gl); w[p] += gl.count(k)
pair_wr = np.array([w[p] / g[p] for p in pairs])

cards = [c for c in json.load(open(a.cards)) if not c['land']]
deck_count = collections.Counter()
for r in rows:
    if r['batch'] == 'd1':
        for k in 'AB':
            p = r[k].split('+')[0]
            for c in set(p): deck_count[c] += 1
            deck_count[p] += 1
            deck_count[''] += 1
# eligible[c, pair]: the card can be played by a deck of that pair; q[c]: inclusion given eligible.
elig = np.zeros((len(cards), len(pairs)), bool)
q = np.zeros(len(cards))
for i, c in enumerate(cards):
    col = c['colors']
    for j, p in enumerate(pairs): elig[i, j] = all(x in p for x in col)
    denom = deck_count[col] if len(col) == 2 else deck_count[col] if col else deck_count['']
    q[i] = min(0.49, c['inDecks'] / max(1, denom))
names = [c['name'] for c in cards]
colours = [c['colors'] for c in cards]


def bin_upper(k, n, p):
    k = np.asarray(k, float); n = np.asarray(n, float)
    out = np.ones_like(k)
    ok = (k > 0) & (k <= n)
    out[ok] = betainc(k[ok], n[ok] - k[ok] + 1, p)
    out[k > n] = 0
    return out


def bh(ps, qv):
    m = len(ps); o = np.argsort(ps); r = np.arange(1, m + 1)
    passed = ps[o] <= r / m * qv
    if not passed.any(): return np.zeros(m, bool)
    kmax = np.nonzero(passed)[0].max()
    rej = np.zeros(m, bool); rej[o[:kmax + 1]] = True
    return rej


def holm(ps, alpha):
    m = len(ps); o = np.argsort(ps); rej = np.zeros(m, bool)
    for r, i in enumerate(o):
        if ps[i] * (m - r) <= alpha: rej[i] = True
        else: break
    return rej


def batch(n_drafts, beta):
    """One batch: card games and wins, the batch mean, the deck-level design effect."""
    mp = match_pairs[rng.integers(0, len(match_pairs), n_drafts)]
    u = rng.normal(0, a.deck_sd, (n_drafts, 2))
    th = beta[mp] + u
    pA = 1 / (1 + np.exp(-(th[:, 0] - th[:, 1])))
    # best of three: game 1, game 2, game 3 only at 1-1
    g1 = rng.random(n_drafts) < pA; g2 = rng.random(n_drafts) < pA; g3 = rng.random(n_drafts) < pA
    third = g1 != g2
    winsA = g1.astype(int) + g2 + (third & g3)
    games = 2 + third.astype(int)
    dw = np.stack([winsA, games - winsA], 1)  # deck wins
    dg = np.stack([games, games], 1)
    # card membership: eligible in A or B (singleton: at most one deck)
    eA = elig[:, mp[:, 0]]; eB = elig[:, mp[:, 1]]
    uu = rng.random((len(cards), n_drafts))
    inA = eA & (uu < q[:, None])
    inB = eB & ~inA & (uu >= q[:, None]) & (uu < 2 * q[:, None])
    cg = inA @ dg[:, 0] + inB @ dg[:, 1]
    cw = inA @ dw[:, 0] + inB @ dw[:, 1]
    mean = cw.sum() / cg.sum()
    W = dw.ravel(); G = dg.ravel(); pbar = W.sum() / G.sum()
    deff = max(1.0, ((W - pbar * G) ** 2).sum() / (pbar * (1 - pbar) * G.sum()))
    colour_rate = {}
    for c in 'WUBRG':
        has = np.array([c in p for p in pairs])
        mA = has[mp[:, 0]]; mB = has[mp[:, 1]]
        colour_rate[c] = (dw[:, 0] @ mA + dw[:, 1] @ mB) / (dg[:, 0] @ mA + dg[:, 1] @ mB)
    return cg, cw, mean, deff, colour_rate


def generation(beta):
    cg, cw, mean, deff, colr = batch(a.plain, beta)
    test = cg >= 20
    p = np.where(test, bin_upper(cw / deff, cg / deff, mean), 1.0)
    rate = np.where(cg > 0, cw / np.maximum(cg, 1), 0)
    nwin = int(test.sum())
    filler = rng.random(max(0, a.family - nwin))  # the pick and dead tests, null
    fam = np.concatenate([p[test], filler])
    rej = bh(fam, 0.1)[:nwin]
    idx = np.nonzero(test)[0][rej]
    cand = [i for i in idx if rate[i] >= mean + 0.05]
    out = dict(cands=len(cand), names=[names[i] for i in cand], minp=float(p[test].min()), n_p002=int((p[test] <= 0.002).sum()),
               disc_rate=[float(rate[i]) for i in cand], deff=deff, red=colr['R'])
    if cand:
        cg2, cw2, mean2, deff2, colr2 = batch(a.confirm, beta)
        p2 = bin_upper(cw2[cand] / deff2, cg2[cand] / deff2, mean2)
        p2 = np.where(cg2[cand] > 0, p2, 1.0)
        r2 = cw2[cand] / np.maximum(cg2[cand], 1)
        ok = holm(p2, 0.05) & (r2 >= mean2 + 0.05)
        out.update(confirmed=int(ok.sum()), conf_games=int(cg2[cand].sum()), conf_wins=int(cw2[cand].sum()), red_conf=colr2['R'])
    return out


logit = lambda x: np.log(x / (1 - x))


def pair_rates(beta, n):
    mp = match_pairs[rng.integers(0, len(match_pairs), n)]
    th = beta[mp] + rng.normal(0, a.deck_sd, (n, 2))
    pA = 1 / (1 + np.exp(-(th[:, 0] - th[:, 1])))
    num = np.bincount(mp[:, 0], pA, len(pairs)) + np.bincount(mp[:, 1], 1 - pA, len(pairs))
    den = np.bincount(mp[:, 0], None, len(pairs)) + np.bincount(mp[:, 1], None, len(pairs))
    return num / den


# Fit the pair strengths so the simulated pair win rates are J039's (a few fixed-point steps on expected rates).
beta_c = logit(pair_wr)
for _ in range(8): beta_c = beta_c + logit(pair_wr) - logit(pair_rates(beta_c, 200000))
print('pair win rates, J039 vs simulated:', ', '.join(f'{p} {t:.3f}/{s:.3f}' for p, t, s in zip(pairs, pair_wr, pair_rates(beta_c, 200000))))
for label, beta in [('null', np.zeros(len(pairs))), ('colour', beta_c)]:
    res = [generation(beta) for _ in range(a.gens)]
    c = np.array([r['cands'] for r in res])
    n002 = np.array([r['n_p002'] for r in res])
    conf = sum(r.get('confirmed', 0) for r in res)
    cg = sum(r.get('conf_games', 0) for r in res); cw = sum(r.get('conf_wins', 0) for r in res)
    dr = [x for r in res for x in r['disc_rate']]
    cols = collections.Counter(colours[names.index(n)] or 'C' for r in res for n in r['names'])
    ntests = np.mean([1 for _ in res])
    print(f'== {label}: {a.gens} generations, {a.plain} plain drafts, deck sd {a.deck_sd}')
    print(f'  design effect (deck level): mean {np.mean([r["deff"] for r in res]):.3f}')
    print(f'  dominant-win tests with p <= 0.002 per generation: mean {n002.mean():.2f}, P(>=1) {np.mean(n002 >= 1):.2f}, P(>=5) {np.mean(n002 >= 5):.3f}')
    print(f'  candidates per generation: mean {c.mean():.2f}; P(>=1) {np.mean(c >= 1):.2f}; P(>=3) {np.mean(c >= 3):.3f}; P(>=8) {np.mean(c >= 8):.3f}; by colour {dict(cols)}')
    print(f'  red colour win rate per batch: mean {np.mean([r["red"] for r in res]):.3f} sd {np.std([r["red"] for r in res]):.4f}')
    if c.sum():
        print(f'  candidates\' discovery win rate: mean {np.mean(dr):.3f}; confirmation pooled {cw / max(1, cg):.3f} over {cg} card-games; confirmed {conf} of {c.sum()} ({conf / c.sum():.2f})')

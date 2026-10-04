# mtg-table — evolve's discovery rule simulated under realistic clustering (docs/evidence/evolve-calibration.md).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   python3 docs/evidence/evolve-calibration-sim.py extract <run1.log> <matches.json>
#   python3 docs/evidence/evolve-calibration-sim.py hetero <matches.json>
#   python3 docs/evidence/evolve-calibration-sim.py run <matches.json> <cards.json> [--gens 300] [--seed 1]
#       [--rules mean,colour] [--scenarios null,colour,planted]
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
#             still no card effect of its own (the cards win as their decks do);
#   planted   colour, plus PLANT_N cards (seeded, spread over the colours) that
#             raise their deck's win probability by +0.05, +0.10 or +0.15 at an
#             even match (a logit shift of 4x that), so power can be read.
#
# Two rules (D377):
#
#   mean      D331's dominant-win, as above: the null boundary is the batch mean;
#   colour    D377's colour-adjusted dominant-win (tools/cubelab/colour-null.ts):
#             each card's null is the games-weighted mean of its decks' colour
#             pairs' win rates in the same batch, each pair's rate with the
#             card's own games left out and shrunk toward the batch's deck mean
#             by COLOUR_NULL_K games; the test is one-sided normal on
#             (rate - p0) / sqrt(p0(1-p0) deff / games + se0^2), se0 the
#             baseline's own standard error.  The size filter is rate >= p0 +
#             dominantMargin; confirmation runs the same rule on its own batch.
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
ap.add_argument('--rules', default='mean,colour')
ap.add_argument('--scenarios', default='null,colour,planted')
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


# D377's constants (tools/cubelab/colour-null.ts COLOUR_NULL): pseudo-games of shrinkage toward the batch's deck mean.
COLOUR_NULL_K = 20
MARGIN = 0.05
P = len(pairs)
# Planted card effects: PLANT_N cards drawn once (seed 2026) from the cards played often enough to be tested.
PLANT_N = 12
PLANT_SIZES = [0.05, 0.10, 0.15]
_prng = np.random.default_rng(2026)
_often = np.nonzero(q * elig.sum(1) >= 0.05 * P)[0]
plant_idx = _prng.choice(_often, PLANT_N, replace=False)
plant_eff = np.zeros(len(cards))
for j, i in enumerate(plant_idx): plant_eff[i] = PLANT_SIZES[j % len(PLANT_SIZES)]


def batch(n_drafts, beta, eff):
    """One batch: card games and wins (total and by the deck's pair), pair totals, the batch mean, the design effect."""
    mp = match_pairs[rng.integers(0, len(match_pairs), n_drafts)]
    # card membership first (a planted card changes its deck's strength): eligible in A or B, singleton
    eA = elig[:, mp[:, 0]]; eB = elig[:, mp[:, 1]]
    uu = rng.random((len(cards), n_drafts))
    inA = eA & (uu < q[:, None])
    inB = eB & ~inA & (uu >= q[:, None]) & (uu < 2 * q[:, None])
    th = beta[mp] + rng.normal(0, a.deck_sd, (n_drafts, 2))
    th[:, 0] += (4 * eff) @ inA; th[:, 1] += (4 * eff) @ inB
    pA = 1 / (1 + np.exp(-(th[:, 0] - th[:, 1])))
    g1 = rng.random(n_drafts) < pA; g2 = rng.random(n_drafts) < pA; g3 = rng.random(n_drafts) < pA
    third = g1 != g2
    winsA = g1.astype(int) + g2 + (third & g3)
    games = 2 + third.astype(int)
    dw = np.stack([winsA, games - winsA], 1)
    dg = np.stack([games, games], 1)
    OA = np.eye(P)[mp[:, 0]]; OB = np.eye(P)[mp[:, 1]]
    cgP = (inA * dg[:, 0]) @ OA + (inB * dg[:, 1]) @ OB   # cards x pairs
    cwP = (inA * dw[:, 0]) @ OA + (inB * dw[:, 1]) @ OB
    GP = dg[:, 0] @ OA + dg[:, 1] @ OB
    WP = dw[:, 0] @ OA + dw[:, 1] @ OB
    # the opponents' games in the card's matches, by the opponent's pair (D377 leaves the card's whole matches out)
    ogP = (inA * dg[:, 1]) @ OB + (inB * dg[:, 0]) @ OA
    owP = (inA * dw[:, 1]) @ OB + (inB * dw[:, 0]) @ OA
    cg = cgP.sum(1); cw = cwP.sum(1)
    mean = cw.sum() / cg.sum()
    W = dw.ravel(); G = dg.ravel(); pbar = W.sum() / G.sum()
    deff = max(1.0, ((W - pbar * G) ** 2).sum() / (pbar * (1 - pbar) * G.sum()))
    red = np.array(['R' in p for p in pairs])
    return dict(cg=cg, cw=cw, cgP=cgP, cwP=cwP, ogP=ogP, owP=owP, GP=GP, WP=WP, mean=mean, deck_mean=pbar, deff=deff, red=WP[red].sum() / GP[red].sum())


def colour_null(b):
    """D377: each card's colour-adjusted p0 and its standard error (both decks of the card's matches left out of its pairs)."""
    G = b['GP'][None, :] - b['cgP'] - b['ogP']; W = b['WP'][None, :] - b['cwP'] - b['owP']
    r = (W + COLOUR_NULL_K * b['deck_mean']) / (G + COLOUR_NULL_K)
    v = b['deff'] * r * (1 - r) / (G + COLOUR_NULL_K)
    n = np.maximum(b['cg'], 1)[:, None]
    w = b['cgP'] / n
    return (w * r).sum(1), np.sqrt((w * w * v).sum(1))


def test(b, rule, idx=None):
    """p-values and the size filter for every card (or the cards in idx)."""
    cg, cw = b['cg'], b['cw']
    if idx is not None: cg, cw = cg[idx], cw[idx]
    rate = cw / np.maximum(cg, 1)
    if rule == 'mean':
        p = bin_upper(cw / b['deff'], cg / b['deff'], b['mean'])
        return np.where(cg > 0, p, 1.0), rate >= b['mean'] + MARGIN, np.full(len(cg), b['mean'])
    p0, se0 = colour_null(b)
    if idx is not None: p0, se0 = p0[idx], se0[idx]
    sd = np.sqrt(p0 * (1 - p0) * b['deff'] / np.maximum(cg, 1) + se0 ** 2)
    # continuity correction: half a win in effective counts (the exact test the mean rule uses counts the point mass)
    cc = 0.5 * b['deff'] / np.maximum(cg, 1)
    p = SS.norm.sf((rate - p0 - cc) / np.where(sd > 0, sd, 1))
    return np.where(cg > 0, p, 1.0), rate >= p0 + MARGIN, p0


def generation(beta, eff, rule):
    b = batch(a.plain, beta, eff)
    tested = b['cg'] >= 20
    p, big, p0 = test(b, rule)
    nwin = int(tested.sum())
    fam = np.concatenate([p[tested], rng.random(max(0, a.family - nwin))])  # the pick and dead tests, null
    rej = bh(fam, 0.1)[:nwin]
    idx = np.nonzero(tested)[0][rej]
    cand = [int(i) for i in idx if big[i]]
    zero = tested & (eff == 0)
    out = dict(cands=cand, n_p002=int((p[tested] <= 0.002).sum()), ntest=nwin, pnull=p[zero], deff=b['deff'], red=b['red'],
               disc_rate=[float(b['cw'][i] / b['cg'][i]) for i in cand], disc_p0=[float(p0[i]) for i in cand], confirmed=[])
    if cand:
        c = batch(a.confirm, beta, eff)
        p2, big2, _ = test(c, rule, np.array(cand))
        ok = holm(p2, 0.05) & big2 & (c['cg'][cand] > 0)
        out.update(confirmed=[i for i, o in zip(cand, ok) if o], conf_games=int(c['cg'][cand].sum()), conf_wins=int(c['cw'][cand].sum()))
    return out


logit = lambda x: np.log(x / (1 - x))


def pair_rates(beta, n):
    mp = match_pairs[rng.integers(0, len(match_pairs), n)]
    th = beta[mp] + rng.normal(0, a.deck_sd, (n, 2))
    pA = 1 / (1 + np.exp(-(th[:, 0] - th[:, 1])))
    num = np.bincount(mp[:, 0], pA, P) + np.bincount(mp[:, 1], 1 - pA, P)
    den = np.bincount(mp[:, 0], None, P) + np.bincount(mp[:, 1], None, P)
    return num / den


# Fit the pair strengths so the simulated pair win rates are J039's (a few fixed-point steps on expected rates).
beta_c = logit(pair_wr)
for _ in range(8): beta_c = beta_c + logit(pair_wr) - logit(pair_rates(beta_c, 200000))
print('pair win rates, J039 vs simulated:', ', '.join(f'{p} {t:.3f}/{s:.3f}' for p, t, s in zip(pairs, pair_wr, pair_rates(beta_c, 200000))))
print('planted:', '; '.join(f'{names[i]} ({colours[i] or "C"}) +{plant_eff[i]:.2f}' for i in plant_idx))
scen = {'null': (np.zeros(P), np.zeros(len(cards))), 'colour': (beta_c, np.zeros(len(cards))), 'planted': (beta_c, plant_eff)}
summary = {}
for label in a.scenarios.split(','):
    beta, eff = scen[label]
    for rule in a.rules.split(','):
        res = [generation(beta, eff, rule) for _ in range(a.gens)]
        false = np.array([sum(1 for i in r['cands'] if eff[i] == 0) for r in res])
        conf_false = sum(1 for r in res for i in r['confirmed'] if eff[i] == 0)
        n002 = np.array([r['n_p002'] for r in res]); ntest = np.mean([r['ntest'] for r in res])
        pn = np.concatenate([r['pnull'] for r in res]); zn = SS.norm.isf(np.clip(pn, 1e-12, 1 - 1e-12))
        cols = collections.Counter(colours[i] or 'C' for r in res for i in r['cands'] if eff[i] == 0)
        allc = sum(len(r['cands']) for r in res)
        cg = sum(r.get('conf_games', 0) for r in res); cw = sum(r.get('conf_wins', 0) for r in res)
        print(f'== scenario {label}, rule {rule}: {a.gens} generations, {a.plain} plain drafts, deck sd {a.deck_sd}')
        print(f'  design effect (deck level): mean {np.mean([r["deff"] for r in res]):.3f}; red win rate per batch mean {np.mean([r["red"] for r in res]):.3f}')
        print(f'  dominant-win tests at p <= 0.002 per generation: mean {n002.mean():.2f} of {ntest:.0f} (a uniform null gives {0.002 * ntest:.2f})')
        print(f'  cards with no effect of their own: share at p <= 0.05 {np.mean(pn <= 0.05):.4f}, <= 0.01 {np.mean(pn <= 0.01):.4f}, <= 0.002 {np.mean(pn <= 0.002):.4f}; '
              f'z mean {zn.mean():+.3f} sd {zn.std():.3f} ({len(pn)} tests)')
        print(f'  FALSE candidates (no planted effect) per generation: mean {false.mean():.3f}; P(>=1) {np.mean(false >= 1):.3f}; P(>=3) {np.mean(false >= 3):.3f}; '
              f'P(>=8) {np.mean(false >= 8):.3f}; by colour {dict(cols)}; false cuts (confirmed) {conf_false} in {a.gens} generations')
        if allc:
            print(f'  every candidate: discovery rate {np.mean([x for r in res for x in r["disc_rate"]]):.3f} against its null {np.mean([x for r in res for x in r["disc_p0"]]):.3f}; '
                  f'confirmation pooled {cw / max(1, cg):.3f} over {cg} card-games')
        row = dict(p05=float(np.mean(pn <= 0.05)), p01=float(np.mean(pn <= 0.01)), p002=float(np.mean(pn <= 0.002)), z_sd=float(zn.std()), false_mean=float(false.mean()), false_p1=float(np.mean(false >= 1)), false_cuts=conf_false, n002=float(n002.mean()))
        if eff.any():
            for size in PLANT_SIZES:
                ids = [i for i in plant_idx if plant_eff[i] == size]
                found = np.mean([sum(1 for i in r['cands'] if i in ids) / len(ids) for r in res])
                cut = np.mean([sum(1 for i in r['confirmed'] if i in ids) / len(ids) for r in res])
                print(f'  planted +{size:.2f} ({len(ids)} cards): discovered in {found:.2f} of generations, confirmed (cut) in {cut:.2f}')
                row[f'found_{size:.2f}'] = float(found); row[f'cut_{size:.2f}'] = float(cut)
            for i in plant_idx:
                print(f'    {names[i]} ({colours[i] or "C"}) +{plant_eff[i]:.2f}: discovered {np.mean([i in r["cands"] for r in res]):.2f}, cut {np.mean([i in r["confirmed"] for r in res]):.2f}')
        summary[f'{label}/{rule}'] = row
print(json.dumps(summary))

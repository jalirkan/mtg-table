"""Between-game vs within-game signal of the two leaves on gate 1's 27,628 rebuilt turn-end positions (J092's
fit-v2/leaf-rows.jsonl: evaluator v2's P(win) and the hand leaf, same positions, 1,500 held-out games).
Question: is the evaluator's better log-loss signal that separates GAMES (deck and matchup strength, which cancels
inside a decision) or signal that tracks how a game CHANGES (what ranks moves)?
Usage: python3 leaf_within.py > ../tables/leaf-within.md"""
import json, math
import numpy as np

P = '/home/justin-a/code/lab/mtg-table/var/ml/gates/fit-v2/leaf-rows.jsonl'
SCALE = 351.6   # J092's verdict line: the fitted leaf scale used by gate 1 clause B
rows = [json.loads(l) for l in open(P)]
g = {}
for r in rows:
    g.setdefault((r['file'], r['seat']), []).append(r)
def logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6); return math.log(p / (1 - p))
E, H, Y, T, G = [], [], [], [], []
for k, rs in g.items():
    rs.sort(key=lambda r: r['frame'])
    for r in rs:
        E.append(logit(r['eval'])); H.append(r['leaf'] / SCALE); Y.append(r['won']); T.append(r['turn']); G.append(k)
E, H, Y, T = map(np.array, (E, H, Y, T))
gid = {k: i for i, k in enumerate(dict.fromkeys(G))}; Gi = np.array([gid[k] for k in G])
def ll(z, y):
    p = 1 / (1 + np.exp(-np.clip(z, -30, 30))); p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
def fit1(x, y):   # 1-D logistic fit a + b x by Newton, to put both leaves on their best scale
    a, b = 0.0, 0.0
    for _ in range(50):
        z = a + b * x; p = 1 / (1 + np.exp(-z)); w = p * (1 - p) + 1e-9
        ga, gb = np.sum(y - p), np.sum((y - p) * x)
        haa, hab, hbb = np.sum(w), np.sum(w * x), np.sum(w * x * x)
        det = haa * hbb - hab * hab
        a += (hbb * ga - hab * gb) / det; b += (haa * gb - hab * ga) / det
    return a, b
def icc(x):
    gm = np.bincount(Gi, weights=x) / np.bincount(Gi)
    return float(np.var(gm[Gi]) / np.var(x))
print('# Between-game and within-game signal of the two leaves (gate 1, J092: 27,628 turn-end positions, 1,500 held-out games)\n')
print(f'positions {len(Y)}, games {len(gid)}; hand leaf read as leaf/{SCALE} (J092 clause B); both refitted a + b x on these rows for the log-loss column.\n')
print('| measure | evaluator v2 | hand leaf |')
print('|---|---|---|')
for name, x in (('eval', E), ('hand', H)):
    pass
ae, be = fit1(E, Y); ah, bh = fit1(H, Y)
print(f'| log-loss, all positions (refitted) | {ll(ae+be*E, Y):.4f} | {ll(ah+bh*H, Y):.4f} |')
for lo, hi in ((1, 2), (3, 4), (5, 8), (9, 14), (15, 99)):
    m = (T >= lo) & (T <= hi)
    print(f'| log-loss, turns {lo}-{hi if hi < 99 else "+"} ({m.sum()} positions) | {ll(ae+be*E[m], Y[m]):.4f} | {ll(ah+bh*H[m], Y[m]):.4f} |')
print(f'| share of the score\'s variance that is between games (ICC) | {icc(E):.2f} | {icc(H):.2f} |')
# turn-to-turn changes within a game: does the score move toward the eventual result?
dE, dH, dY = [], [], []
for i in range(1, len(Y)):
    if Gi[i] == Gi[i - 1]:
        dE.append(be * (E[i] - E[i - 1])); dH.append(bh * (H[i] - H[i - 1])); dY.append(2 * Y[i] - 1)
dE, dH, dY = map(np.array, (dE, dH, dY))
def agree(d):
    nz = d != 0
    return float(np.mean(np.sign(d[nz]) == dY[nz])), int(nz.sum())
aE, nE = agree(dE); aH, nH = agree(dH)
print(f'| turn-to-turn change points toward the eventual winner (share of non-zero moves) | {aE:.3f} (n {nE}) | {aH:.3f} (n {nH}) |')
print(f'| corr(turn-to-turn change, eventual result), changes on the refitted logit scale | {np.corrcoef(dE, dY)[0,1]:.3f} | {np.corrcoef(dH, dY)[0,1]:.3f} |')
# game-level bootstrap for the two agreement shares and their difference
rng = np.random.default_rng(20261105)
pairs_g = []
for i in range(1, len(Y)):
    if Gi[i] == Gi[i - 1]:
        pairs_g.append(Gi[i])
pairs_g = np.array(pairs_g)
games = np.unique(pairs_g); idx = {gg: np.where(pairs_g == gg)[0] for gg in games}
diffs = []
for _ in range(1000):
    pick = rng.choice(games, len(games))
    ii = np.concatenate([idx[gg] for gg in pick])
    def a(d):
        dd = d[ii]; yy = dY[ii]; nz = dd != 0
        return np.mean(np.sign(dd[nz]) == yy[nz])
    diffs.append(a(dE) - a(dH))
lo, hi = np.percentile(diffs, [2.5, 97.5])
print(f'\nEvaluator minus hand leaf, turn-to-turn agreement: {aE-aH:+.3f} [{lo:+.3f}, {hi:+.3f}] (1,000 resamples of games).')

"""Why the learned evaluator ranks no better than the hand leaf: within-decision spread, signal-to-noise
and slope against the truth, on gate 2's 291 decisions (J050 truth, J050 hand ranker at 3 rounds, J081 v2
eval ranker at 3 rounds). Read-only over the lab clone. Usage: python3 gate2_within.py > ../tables/gate2-within.md
"""
import json, sys, math
import numpy as np

G = '/home/justin-a/code/lab/mtg-table/var/ml/gates'
def load(p):
    out = {}
    for l in open(p):
        d = json.loads(l)
        if d.get('status') == 'ok':
            out[d['id']] = d
    return out

truth = load(f'{G}/regret/truth.jsonl')
hand = load(f'{G}/regret/rank-hand-3.jsonl')
ev = load(f'{G}/regret-v2/rank-eval-3.jsonl')
ev1 = load(f'{G}/regret/rank-eval-3.jsonl')
sset = {json.loads(l)['id']: json.loads(l) for l in open(f'{G}/regret/set.jsonl')}

def opts(d):
    return {o['token']: o for o in d['options'] if not o.get('failed') and o.get('n', 0) > 0}

rows = []
for i, t in truth.items():
    if i not in hand or i not in ev:
        continue
    T, H, E = opts(t), opts(hand[i]), opts(ev[i])
    E1 = opts(ev1[i]) if i in ev1 else {}
    toks = [k for k in T if k in H and k in E]
    if len(toks) < 2:
        continue
    tw = np.array([T[k]['winRate'] for k in toks])
    hw = np.array([H[k]['winRate'] for k in toks])
    ew = np.array([E[k]['winRate'] for k in toks])
    e1 = np.array([E1[k]['winRate'] for k in toks]) if all(k in E1 for k in toks) else None
    s = sset.get(i, {})
    rows.append(dict(id=i, type=t['type'], turn=t['turn'], k=len(toks), tw=tw, hw=hw, ew=ew, e1=e1,
                     hnoise=hand[i].get('noise'), enoise=ev[i].get('noise'), tnoise=t.get('noise'),
                     forge=[T[k].get('forge') for k in toks]))

def sd(x): return float(np.std(x)) if len(x) > 1 else 0.0

def summarise(rs, label):
    ts = np.array([sd(r['tw']) for r in rs]); hs = np.array([sd(r['hw']) for r in rs]); es = np.array([sd(r['ew']) for r in rs])
    hn = np.array([r['hnoise'] or np.nan for r in rs]); en = np.array([r['enoise'] or np.nan for r in rs])
    # pooled within-decision slope of truth on ranker (centered per decision)
    def slope(key):
        X = np.concatenate([r[key] - r[key].mean() for r in rs]); Y = np.concatenate([r['tw'] - r['tw'].mean() for r in rs])
        b = float((X @ Y) / (X @ X)); c = float(np.corrcoef(X, Y)[0, 1]); return b, c
    bh, ch = slope('hw'); be, ce = slope('ew')
    # Forge option's within-decision z under each ranker (how far the ranker moves away from Forge)
    return (f"| {label} | {len(rs)} | {np.median(ts):.3f} | {np.median(hs):.3f} | {np.median(es):.3f} | "
            f"{np.nanmedian(es/np.where(hs>0,hs,np.nan)):.2f} | {np.nanmedian(hs/hn):.2f} | {np.nanmedian(es/en):.2f} | "
            f"{ch:.3f} | {ce:.3f} | {bh:.2f} | {be:.2f} |")

print('# Gate 2, read within the decision (J050 truth; J050 hand ranker, 3 rounds; J081 evaluator v2 ranker, 3 rounds)\n')
print('Spread = the standard deviation of the options\' scores inside one decision (win-rate units: truth = full-game win rate, '
      'hand = sigmoid(leaf/500), eval = P(win)). Noise = the ranker file\'s own `noise` field: the median half-width of the options\' 95% regret intervals (`GradeMath.noise`, about 1.96 SE of a paired difference), so spread/noise 0.46 means the options sit about 0.9 SE apart. '
      'r and slope: options centred per decision, pooled; truth regressed on the ranker.\n')
print('| stratum | decisions | truth spread | hand spread | eval spread | eval/hand spread | hand spread/noise | eval spread/noise | r(truth, hand) | r(truth, eval) | slope truth~hand | slope truth~eval |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
print(summarise(rows, 'all'))
for ty in ('attack', 'block', 'spell'):
    print(summarise([r for r in rows if r['type'] == ty], ty))
for lo, hi, lab in ((1, 6, 'turn 1-6'), (7, 10, 'turn 7-10'), (11, 14, 'turn 11-14'), (15, 99, 'turn 15+')):
    print(summarise([r for r in rows if lo <= r['turn'] <= hi], lab))
for lo, hi, lab in ((2, 2, 'k=2'), (3, 4, 'k=3-4'), (5, 99, 'k=5+')):
    print(summarise([r for r in rows if lo <= r['k'] <= hi], lab))

# v1 vs v2 eval spread, same decisions
both = [r for r in rows if r['e1'] is not None]
print(f"\nEvaluator v1 (J051) on the same {len(both)} decisions: median spread {np.median([sd(r['e1']) for r in both]):.3f}; "
      f"v2 {np.median([sd(r['ew']) for r in both]):.3f}; hand {np.median([sd(r['hw']) for r in both]):.3f}.")

# Truth noise ceiling: how much of the truth's within-decision variance is signal
rel = []
for r in rows:
    t = truth[r['id']]; T = opts(t)
    se2 = np.mean([((o['winHi'] - o['winLo']) / 3.92) ** 2 for o in T.values()])
    v = np.var(r['tw'])
    rel.append(1 - se2 / v if v > 0 else np.nan)
rel = np.array(rel)
print(f"Truth reliability inside a decision (1 - mean se^2 / var): median {np.nanmedian(rel):.2f}; share of decisions above 0.5: {np.nanmean(rel>0.5):.2f}.")
# Forge's pick: mean regret by truth, and how often Forge's pick is the truth's best
fr = []; fb = 0
for r in rows:
    j = [ix for ix, f in enumerate(r['forge']) if f]
    if not j: continue
    j = j[0]; fr.append(r['tw'].max() - r['tw'][j]); fb += int(np.argmax(r['tw']) == j)
print(f"Forge's own option: mean truth regret {np.mean(fr):.4f} over {len(fr)} decisions (noisy-max biased up); truth's best is Forge's in {fb} ({fb/len(fr):.0%}).")

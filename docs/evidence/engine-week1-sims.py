# SPDX-License-Identifier: GPL-3.0-or-later
# mtg-table -- docs/evidence/engine-week1.md section 2: run with `python3 docs/evidence/engine-week1-sims.py` (numpy, scipy).
# Week-1 fixes: interval coverage and live racing, before (D334's 1/n floor, normal z)
# and after (D349: leaf measure = sample sd floored at 0.02, Student t with n-1 df).
import math
import numpy as np
from scipy import stats

rng = np.random.default_rng(20261003)
Z95, Z99 = 1.959963984540054, 2.5758293035489
FLOOR = 0.02

def se_before(d):
    n = len(d)
    var = d.var(ddof=1) if n > 1 else 0.25
    return math.sqrt(var / n + 1 / n ** 2), Z95

def se_after(d, z=Z95):
    n = len(d)
    sd = max(d.std(ddof=1), FLOOR) if n > 1 else 0.5
    q = stats.t.ppf(stats.norm.cdf(z), max(1, n - 1))
    return sd / math.sqrt(n), q

print("== 1. Coverage of the 95% interval on a paired leaf-mode difference (true diff 0.04) ==")
print("   dist   sd    n | before: cover  half-width | after: cover  half-width")
for dist in ("normal", "t3"):
    for sd in (0.03, 0.06, 0.12):
        for n in (2, 3, 4, 6, 8, 12):
            T = 20000
            if dist == "normal":
                d = rng.normal(0.04, sd, (T, n))
            else:
                d = 0.04 + sd * rng.standard_t(3, (T, n)) / math.sqrt(3)
            cb = hb = ca = ha = 0
            for row in d:
                m = row.mean()
                s, q = se_before(row); cb += abs(m - 0.04) <= q * s; hb += q * s
                s, q = se_after(row); ca += abs(m - 0.04) <= q * s; ha += q * s
            print(f"   {dist:6s} {sd:.2f} {n:3d} |        {cb/T:6.1%}  {hb/T:7.3f}    |       {ca/T:6.1%}  {ha/T:7.3f}")

print()
print("== 2. Racing at live settings (continuous leaf values, paired sd 0.06, CRN) ==")

def race(p, sd, target, initial, batch, rule, trials=3000):
    k = len(p); tb = int(np.argmax(p)); best_ret = 0; ret = 0; correct = 0; reg = []
    for _ in range(trials):
        x = np.full((k, target), np.nan); act = np.ones(k, bool)
        for r in range(target):
            common = rng.normal(0, 0.05)
            out = np.array(p) + common + rng.normal(0, sd / math.sqrt(2), k)
            x[act, r] = out[act]
            rounds = r + 1
            if rounds >= initial and (rounds - initial) % batch == 0:
                means = [np.nanmean(x[i]) if act[i] else -9 for i in range(k)]
                b = int(np.argmax(means)); new = act.copy()
                for i in range(k):
                    if i == b or not act[i]: continue
                    m = ~np.isnan(x[b]) & ~np.isnan(x[i]); dd = x[b][m] - x[i][m]; n = len(dd)
                    if n < initial: continue
                    if rule == "before":
                        s = math.sqrt(dd.var(ddof=1) / n + 1 / n ** 2); q = Z99
                    else:
                        s, q = se_after(dd, Z99)
                    if dd.mean() - q * s > 0: new[i] = False
                act = new
            if act.sum() <= 1: break
        best_ret += not act[tb]; ret += (k - act.sum())
        means = [np.nanmean(x[i]) if act[i] else -9 for i in range(k)]
        b = int(np.argmax(means)); correct += b == tb; reg.append(p[tb] - p[b])
    return best_ret / trials, ret / trials, correct / trials, float(np.mean(reg))

cases = {
    "clear (0.60 vs 0.50,0.45,0.40,0.35)": [0.60, 0.50, 0.45, 0.40, 0.35],
    "close (0.55 vs 0.53,0.50,0.45,0.40)": [0.55, 0.53, 0.50, 0.45, 0.40],
    "flat  (0.52 vs 0.51,0.50,0.50,0.49)": [0.52, 0.51, 0.50, 0.50, 0.49],
}
for (initial, batch, target) in ((6, 3, 9), (4, 2, 8), (4, 2, 12)):
    print(f"  initial {initial}, batch {batch}, {target} rounds")
    for name, p in cases.items():
        for rule in ("before", "after"):
            br, r, c, g = race(p, 0.06, target, initial, batch, rule)
            print(f"   {name} {rule:6s}: options retired {r:4.2f} of 4, best retired {br:5.1%}, reported best is true best {c:5.1%}, regret {g:.3f}")

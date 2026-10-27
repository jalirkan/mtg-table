"""(2) The branch budget: unlabelled time, the n curve, futility stops, the 150->200 margin and a 300 projection,
what the screen and early stopping saved and could have missed. Writes report/budget.md and report/budget.json."""
import json, os, sys, collections, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]
C = [r for r in B if r.get('complete')]
H = 3.6e6
def wh(r): return sum(r.get('seg', {}).values()) / H
def seg(r, *names): return sum(r.get('seg', {}).get(n, 0) for n in names) / H
md = ['# (2) The branch budget', '']
J = {}

# (a) where the time went
rows = []
for s in SEATS + ['all']:
    bs = [r for r in B if s == 'all' or r['seat'] == s]
    tot = sum(wh(r) for r in bs)
    conf = sum(wh(r) for r in bs if r.get('confident'))
    unl = sum(wh(r) for r in bs if r.get('complete') and not r.get('confident'))
    scr = sum(wh(r) for r in bs if r.get('screened'))
    fg = sum(seg(r, 'forge') for r in bs)
    rows.append([s, tot, conf, conf / tot, unl, unl / tot, scr, scr / tot, fg, fg / tot])
md += ['## (2a) Where the branch time went', '', md_table(['seat', 'branch wh', 'on confident', 'share', 'complete, not confident', 'share', 'screened', 'share', 'Forge map', 'share'], rows), '']

# (2b) the n curve
md += ['## (2b) The n curve: the atlas\'s arithmetic re-run on branches i < N (the as-run stops kept)', '',
       'Reference "at 200" is this bootstrap\'s own flag at 200 (it matches atlas.json on 215 of 222; the 7 others sit at a '
       'low end within 0.0075 of zero). Cost at N = random rows i < N plus the Forge map.', '']
rows = []
for s in SEATS + ['all']:
    cs = [r for r in C if s == 'all' or r['seat'] == s]
    ref = {id(r) for r in cs if r['ncurve']['200']['conf']}
    for N in ['25', '50', '100', '150', '200']:
        cn = {id(r) for r in cs if r['ncurve'][N]['conf']}
        keep = len(cn & ref); new = len(cn - ref)
        segs = {'25': ['r<25'], '50': ['r<25', 'r25-50'], '100': ['r<25', 'r25-50', 'r50-100'], '150': ['r<25', 'r25-50', 'r50-100', 'r100-150'],
                '200': ['r<25', 'r25-50', 'r50-100', 'r100-150', 'r150-200']}[N]
        cost = sum(seg(r, *segs) + seg(r, 'forge') for r in cs)
        rows.append([s, N, len(cn), keep, f'{keep}/{len(ref)} = {keep/len(ref):.2f}' if ref else '—', new, cost, len(cn) / cost if cost else None])
    J.setdefault('ncurve', {})[s] = rows[-5:]
md += [md_table(['seat', 'N', 'confident at N', 'of which confident at 200', 'share of the 200 set', 'confident at N but not at 200', 'wh (complete decisions)', 'confident / wh'], rows), '']

# the 150 -> 200 margin
gain = [r for r in C if r['ncurve']['200']['conf'] and not r['ncurve']['150']['conf']]
lost = [r for r in C if r['ncurve']['150']['conf'] and not r['ncurve']['200']['conf']]
c150_200 = sum(seg(r, 'r150-200') for r in C)
gain100 = [r for r in C if r['ncurve']['150']['conf'] and not r['ncurve']['100']['conf']]
lost100 = [r for r in C if r['ncurve']['100']['conf'] and not r['ncurve']['150']['conf']]
c100_150 = sum(seg(r, 'r100-150') for r in C)
tot_rate = sum(1 for r in C if r['confident']) / sum(wh(r) for r in B)
md += ['### The last 50 branches', '',
       f'- 150 -> 200: **{len(gain)} gained, {len(lost)} lost** (net {len(gain)-len(lost)}) for {c150_200:.1f} wh: '
       f'{(len(gain)-len(lost))/c150_200:.2f} net confident / wh, against {tot_rate:.2f} for the whole design (new decisions).',
       f'- 100 -> 150: {len(gain100)} gained, {len(lost100)} lost for {c100_150:.1f} wh: {(len(gain100)-len(lost100))/c100_150:.2f} net / wh.', '']
J['margin'] = dict(gain150_200=len(gain), lost150_200=len(lost), wh150_200=c150_200, gain100_150=len(gain100), lost100_150=len(lost100), wh100_150=c100_150, rateAll=tot_rate)

# (2c) a projection to 300 / 400 on the close ones
def proj(r, Nnew):
    nc = r['ncurve']['200']; reg, lo = nc['regret'], nc['lo']
    if reg is None or lo is None or reg <= 0: return 0.0
    se = max((reg - lo) / 1.96, 1e-6)
    # posterior on the true regret ~ N(reg, se^2); the extra (Nnew-200) rows estimate it with se_new; then the pooled estimate's low end
    f = 200 / Nnew
    # pooled estimate = f*reg + (1-f)*new, new ~ N(true, se^2 * 200/(Nnew-200)); marginal over true: var = (1-f)^2*(se^2 + se^2*200/(Nnew-200))
    sd = (1 - f) * math.sqrt(se * se + se * se * 200 / (Nnew - 200))
    lo_new_center = reg - 1.96 * se * math.sqrt(f)
    # P(lo_new > 0) = P(pooled > 1.96 se sqrt(f))
    z = (reg - 1.96 * se * math.sqrt(f)) / sd if sd > 0 else 0
    return 0.5 * (1 + math.erf((lo_new_center - 0) / (sd * math.sqrt(2)))) if sd > 0 else float(lo_new_center > 0)
close = [r for r in C if not r['ncurve']['200']['conf'] and r['ncurve']['200']['lo'] is not None and r['ncurve']['200']['lo'] > -0.03]
rows = []
for Nnew in (300, 400):
    exp = sum(proj(r, Nnew) for r in close)
    # cost: each close decision's random cost per branch x (Nnew-200) x running options at 200
    cost = sum((seg(r, 'r150-200') / 50) * (Nnew - 200) for r in close)
    rows.append([Nnew, len(close), exp, cost, exp / cost if cost else None])
md += ['## (2c) Extending the close ones (low end in (-0.03, 0] at 200) to 300 or 400', '',
       'A normal projection that takes the 200-branch regret as the truth\'s centre (optimistic: the max over options is biased '
       'upward, and the measured 150 -> 200 step above is the honest check).', '',
       md_table(['N', 'close decisions', 'expected new confident (upper bound)', 'extra wh', 'confident / wh'], rows), '']
J['extend'] = rows

# (2d) futility: stop a decision at 25 or 50 when Forge's option leads (or nearly)
md += ['## (2d) A futility stop: end a decision at a checkpoint when option 0 (Forge\'s) leads', '',
       'Saved = that decision\'s random rows past the checkpoint and its Forge map. Lost = its confident label at 200 (atlas flag). '
       'The yield column spends the saving on new decisions at the design\'s own rate.', '']
rows = []
base_conf = sum(1 for r in C if r['confident']); base_wh = sum(wh(r) for r in B)
for N, thr in [(25, 0.0), (50, 0.0), (50, 0.02), (50, 0.04), (100, 0.0), (100, 0.02)]:
    key = f'regret{N}' if N in (25, 50) else None
    hit = []
    for r in C:
        reg = r.get(key) if key else (r['ncurve']['100']['regret'])
        if reg is not None and reg <= thr: hit.append(r)
    later = {25: ['r25-50', 'r50-100', 'r100-150', 'r150-200'], 50: ['r50-100', 'r100-150', 'r150-200'], 100: ['r100-150', 'r150-200']}[N]
    saved = sum(seg(r, *later) + seg(r, 'forge') for r in hit)
    lostc = [r for r in hit if r['confident']]
    new_wh = base_wh - saved
    conf_after = base_conf - len(lostc)
    rate_after = conf_after / new_wh
    rows.append([f'at {N}, o0 within {thr:.2f} of the leader' if thr else f'at {N}, o0 leads (or ties)', len(hit), len(lostc), saved, saved / base_wh,
                 rate_after, rate_after / (base_conf / base_wh) - 1, ', '.join(f"{r['seat']} {r['spine']} d{r['d']}" for r in lostc)])
    J.setdefault('futility', []).append(rows[-1])
md += [md_table(['rule', 'decisions stopped', 'confident lost', 'wh saved', 'share of branch wh', 'confident / wh after', 'gain', 'the lost'], rows), '']

# (2e) the screen
md += ['## (2e) The screen (25 branches, mean value <= .04 or >= .96)', '']
scr = [r for r in B if r.get('screened')]
diffs = [(r['screenMean'], r['baseValue']) for r in C if r.get('screenMean') is not None and r.get('baseValue') is not None]
d = np.array(diffs)
ad = np.abs(d[:, 0] - d[:, 1])
md += [f'- **Passed it ({len(C)} complete):** the 25-branch mean value against the final mean value: correlation {np.corrcoef(d[:,0], d[:,1])[0,1]:.3f}, '
       f'median |difference| {np.median(ad):.3f}, 90th percentile {np.quantile(ad, .9):.3f}, max {ad.max():.3f}.']
for lo_b, hi_b in [(0.06, 0.94), (0.08, 0.92), (0.10, 0.90), (0.15, 0.85)]:
    would = [r for r in C if r.get('screenMean') is not None and (r['screenMean'] <= lo_b or r['screenMean'] >= hi_b)]
    sv = sum(seg(r, 'r25-50', 'r50-100', 'r100-150', 'r150-200', 'forge') for r in would)
    lc = [r for r in would if r['confident']]
    md.append(f'- Bounds {lo_b:.2f}/{hi_b:.2f} would also have screened **{len(would)}** complete decisions, saving {sv:.1f} wh ({sv/base_wh:.1%}), '
              f'losing **{len(lc)}** confident ({", ".join(f"{r["seat"]} {r["spine"]} d{r["d"]} regret {r["regret"]:.3f}" for r in lc) or "none"}).')
    J.setdefault('screenBounds', []).append([lo_b, hi_b, len(would), sv, len(lc)])
# screened decisions: what 25 branches saw
sc_rows = []
for r in scr:
    rd = rows_of(r); m = matrix(rd['rows'], rd['k'], 25, 'random', rd['stops'])
    if len(m) == 0: continue
    mm = opt_means(m)
    sc_rows.append((r['seat'], r['spine'], r['d'], KIND_ := r['kind'], r['k'], r['turn'], r['screenMean'], float(mm.max() - mm[0]), r['k'] * 0.04, len(m)))
obs = np.array([x[7] for x in sc_rows])
md += [f'- **Screened ({len(scr)}):** at 25 branches, the observed regret of o0 (best mean − o0 mean): median {np.median(obs):.3f}, '
       f'max {obs.max():.3f}; {int((obs > 0).sum())} of {len(obs)} above 0, {int((obs >= 0.04).sum())} at 0.04 or more. The bound is k × .04 (D480 point 3).',
       f'- Screened by side: {sum(1 for x in sc_rows if x[6] <= .04)} lost (<= .04), {sum(1 for x in sc_rows if x[6] >= .96)} won (>= .96).', '']
top = sorted(sc_rows, key=lambda x: -x[7])[:8]
md += ['The screened decisions with the largest observed gap at 25:', '',
       md_table(['seat', 'spine', 'd', 'kind', 'k', 'turn', 'mean value at 25', 'o0 regret at 25', 'bound k×.04', 'rows'], top), '']
# complete decisions whose FINAL mean value is extreme: were any confident?
ext = [r for r in C if r.get('baseValue') is not None and (r['baseValue'] <= .06 or r['baseValue'] >= .94)]
md += [f'- Complete decisions whose final mean value is <= .06 or >= .94: {len(ext)}, confident {sum(1 for r in ext if r["confident"])}.', '']

# (2f) early stopping
md += ['## (2f) Early stopping per option (50/100/150; o0 and the leader never stop)', '']
stops = []
for r in C:
    if not r.get('stops'): continue
    rd = rows_of(r); full = matrix(rd['rows'], rd['k'], None, 'random', rd['stops']); mu = opt_means(full)
    best = int(np.argmax(mu))
    for o, at in r['stops'].items():
        o = int(o)
        # the leader at the stop: highest mean over rows i < at among options running then
        m_at = matrix(rd['rows'], rd['k'], at, 'random', {k_: v for k_, v in rd['stops'].items() if v < at})
        mm = opt_means(m_at)
        stops.append(dict(seat=r['seat'], spine=r['spine'], d=r['d'], o=o, at=at, stopMean=float(mu[o]), finalBest=float(mu[best]),
                          finalO0=float(mu[0]), leaderAt=int(np.argmax(mm)), finalBestIdx=best, conf=r['confident'],
                          aboveO0=float(mu[o]) > float(mu[0])))
st = collections.Counter(s['at'] for s in stops)
miss = [s for s in stops if s['stopMean'] >= s['finalBest']]
near = [s for s in stops if s['stopMean'] >= s['finalBest'] - 0.02]
lead_changed = {(s['seat'], s['spine'], s['d']) for s in stops if s['leaderAt'] != s['finalBestIdx']}
above0 = [s for s in stops if s['aboveO0']]
md += [f'- {len(stops)} options stopped on {len({(s["seat"], s["spine"], s["d"]) for s in stops})} complete decisions: at 50 {st[50]}, at 100 {st[100]}, at 150 {st[150]}.',
       f'- A stopped option whose mean at its stop is at or above the final best\'s mean (a possible missed winner): **{len(miss)}**; within .02 of it: {len(near)}.',
       f'- Decisions where the leader at a stop was not the final best: {len(lead_changed)}.',
       f'- Stopped options whose stop-time mean was above o0\'s final mean (they matter to the regret only if they were the true best): {len(above0)}.', '']
J['stops'] = dict(n=len(stops), byAt=dict(st), miss=len(miss), near=len(near), leaderChanged=len(lead_changed), aboveO0=len(above0))
# savings as-run: random time an uncut run would have spent ~ stopped option's per-branch cost x remaining
# fragility
frag = [r for r in C if r['confident'] and r['regretLo'] <= 0.01]
md += ['## (2g) How firm the confident labels are', '',
       f'- Confident labels with a low end at or below 0.01: **{len(frag)} of {base_conf}** (old {sum(1 for r in frag if r["seat"]=="old")}, D486 {sum(1 for r in frag if r["seat"]=="D486")}, D488 {sum(1 for r in frag if r["seat"]=="D488")}). '
       'Scores are 0 / .5 / 1, so the low end moves in steps of .0025 and these flip with the bootstrap seed (7 flags differ between this bootstrap and the atlas\'s).', '']
J['fragile'] = len(frag)
open(os.path.join(REPORT, 'budget.md'), 'w').write('\n'.join(md))
json.dump(J, open(os.path.join(REPORT, 'budget.json'), 'w'), indent=1, default=str)
print('\n'.join(md))

"""(5) Candidate designs re-scored on the as-run branches: confident labels per branch worker-hour and per night,
with a spine-cluster bootstrap (resampled within seat) for the gain over the as-run design. The label flags are this
bootstrap's (one seed) at 200 and at 150, so a rule's gain is not a seed artefact. Writes report/policy.md."""
import json, os, sys, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]
H = 3.6e6
SEGS = ['r<25', 'r25-50', 'r50-100', 'r100-150', 'r150-200']
def seg(r, *n): return sum(r.get('seg', {}).get(x, 0) for x in n) / H
NIGHT_WH = 54.06 * 28.9 / 28   # J171: 28 confident on 54.06 branch wh read as 28.9 a 7-worker 10-h night

def outcome(r, cap150=False, fut=None, noforge=False):
    """(confident 0/1, cost wh) of one branched decision under a design."""
    forge = 0 if noforge else seg(r, 'forge')
    if r.get('screened') or not r.get('complete'):
        return 0, seg(r, *SEGS) + forge
    nc = r['ncurve']
    if fut == 50 and (r.get('regret50') is not None and r['regret50'] <= 0):
        return 0, seg(r, 'r<25', 'r25-50')
    if fut == 100 and (nc['100']['regret'] is not None and nc['100']['regret'] <= 0):
        return 0, seg(r, 'r<25', 'r25-50', 'r50-100')
    if cap150:
        return int(nc['150']['conf']), seg(r, *SEGS[:4]) + forge
    return int(nc['200']['conf']), seg(r, *SEGS) + forge

FILTERS = {
    'all (as run)': lambda r: True,
    'k >= 4': lambda r: (r.get('k') or 0) >= 4,
    'k >= 5': lambda r: (r.get('k') or 0) >= 5,
    'skip turns 1-4': lambda r: r['turn'] >= 5,
    'skip turns 1-8': lambda r: r['turn'] >= 9,
    'skip turns 15+': lambda r: r['turn'] <= 14,
    'priority only': lambda r: r['kind'] == 'p',
    'attack + block only': lambda r: r['kind'] in 'ab',
    'no priority k3-4': lambda r: not (r['kind'] == 'p' and (r.get('k') or 0) in (3, 4)),
    'peasant only': lambda r: r['band'] == 'peasant',
    'no pauper/legacy': lambda r: r['band'] in ('peasant', 'powered'),
}
RULES = {
    'as run (200, screen, stops)': dict(),
    'cap 150': dict(cap150=True),
    'futility at 50 (o0 leads)': dict(fut=50),
    'futility at 100 (o0 leads)': dict(fut=100),
    'no Forge map': dict(noforge=True),
    'futility 50 + cap 150': dict(fut=50, cap150=True),
    'futility 50 + cap 150 + no Forge map': dict(fut=50, cap150=True, noforge=True),
}
spines = sorted({(r['seat'], r['spine']) for r in B})
by_sp = collections.defaultdict(list)
for r in B: by_sp[(r['seat'], r['spine'])].append(r)
rng = np.random.default_rng(2027)
BOOT = 2000
draws = []
# old and D486 are the same 13 spines (decks, seeds, Forge baselines, listings) under two rollout seats, so a draw takes a
# spine id for both seats together; D488's three spines (other decks) are drawn on their own.
shared = sorted({x[1] for x in spines if x[0] in ('old', 'D486')})
own = [x for x in spines if x[0] == 'D488']
for _ in range(BOOT):
    pick = []
    for i in rng.integers(0, len(shared), len(shared)):
        pick += [x for x in spines if x[1] == shared[i] and x[0] in ('old', 'D486')]
    pick += [own[i] for i in rng.integers(0, len(own), len(own))]
    draws.append(pick)

def score(filt, rule, sp_list=None):
    c = w = 0
    for key in (sp_list or spines):
        for r in by_sp[key]:
            if not filt(r): continue
            a, b = outcome(r, **rule); c += a; w += b
    return c, w

base_c, base_w = score(FILTERS['all (as run)'], RULES['as run (200, screen, stops)'])
base_boot = [score(FILTERS['all (as run)'], RULES['as run (200, screen, stops)'], d) for d in draws]
md = ['# (5) Designs re-scored on the as-run branches', '',
      f'All {len(spines)} spines (old 13, D486 13, D488 3), every branched decision. Base: {base_c} confident (this bootstrap\'s flags) on '
      f'{base_w:.1f} branch wh = {base_c/base_w:.3f} / wh = **{base_c/base_w*NIGHT_WH:.1f} a 7-worker night** (J171\'s conversion, {NIGHT_WH:.1f} branch wh a night). '
      'Gain = (confident / wh) over the base\'s, with a 95% spine-cluster bootstrap (2,000 draws, a spine id drawn for old and D486 together, the D488 spines on their own). '
      'A filter keeps only the decisions in its cell: the night is assumed to find enough such decisions (see the availability column), '
      'which for the narrow filters means more spines, each a baseline game of seconds.', '']
rows = []
KIND = {'p': 'priority', 'a': 'attack', 'b': 'block'}
def avail(filt):
    per = collections.Counter()
    for r in D:
        if filt(r) and (r.get('k') or r['kList']) >= 2 and (r['kList'] >= 3 or r['branched']): per[(r['seat'], r['spine'])] += 1
    return np.mean([per[s] for s in spines])
for fname, filt in FILTERS.items():
    for rname, rule in RULES.items():
        if fname != 'all (as run)' and rname not in ('as run (200, screen, stops)', 'futility 50 + cap 150'): continue
        c, w = score(filt, rule)
        if w == 0: continue
        g = []
        for d, (bc, bw) in zip(draws, base_boot):
            cc, ww = score(filt, rule, d)
            if ww > 0 and bc > 0: g.append((cc / ww) / (bc / bw) - 1)
        lo, hi = np.quantile(g, [0.025, 0.975])
        sel = [r for r in B if filt(r)]
        conf_r = [r for r in sel if outcome(r, **rule)[0]]
        comp = (f"att/blk {sum(1 for r in conf_r if r['kind'] in 'ab')/max(len(conf_r),1):.0%}, k5+ {sum(1 for r in conf_r if (r.get('k') or 0) >= 5)/max(len(conf_r),1):.0%}, "
                f"turn 15+ {sum(1 for r in conf_r if r['turn'] >= 15)/max(len(conf_r),1):.0%}")
        rows.append([fname, rname, len([r for r in sel if r.get('complete')]), c, w, c / w, c / w * NIGHT_WH, f'{(c/w)/(base_c/base_w)-1:+.0%}',
                     f'{lo:+.0%} to {hi:+.0%}', f'{avail(filt):.1f}', comp])
md += [md_table(['decisions', 'design', 'complete', 'confident', 'wh', 'conf / wh', 'per night', 'gain', '95% (spines)', 'listed k>=3 a spine', 'the confident labels: share attack/block, k5+, turn 15+'], rows), '']
base_comp = [r for r in B if r.get('complete') and r['ncurve']['200']['conf']]
open(os.path.join(REPORT, 'policy.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

# per seat: was each rule's gain there on every seat? (the old seat is where a rule would have been found; D486 and D488 are other populations)
md2 = ['## The same rules, seat by seat', '']
rows = []
for s in SEATS:
    sp = [x for x in spines if x[0] == s]
    bc, bw = score(FILTERS['all (as run)'], RULES['as run (200, screen, stops)'], sp)
    for rname, rule in RULES.items():
        c, w = score(FILTERS['all (as run)'], rule, sp)
        lost = sum(1 for key in sp for r in by_sp[key] if r.get('complete') and r['ncurve']['200']['conf'] and not outcome(r, **rule)[0])
        gained = sum(1 for key in sp for r in by_sp[key] if r.get('complete') and not r['ncurve']['200']['conf'] and outcome(r, **rule)[0])
        rows.append([s, rname, c, f'-{lost} +{gained}', w, c / w, f'{(c/w)/(bc/bw)-1:+.0%}'])
md2 += [md_table(['seat', 'design', 'confident', 'lost / gained vs 200', 'wh', 'conf / wh', 'gain'], rows), '']
open(os.path.join(REPORT, 'policy.md'), 'a').write('\n\n' + '\n'.join(md2)); print('\n'.join(md2))

"""A futility stop on Forge's option's regret, at 25 or 50 branches, thresholds 0 / .02 / .04, alone and with a 150 cap;
per seat (old is where the rule would be fitted; D486 and D488 are out of sample). Exact on complete decisions (paired
seeds: a stopped decision's first N rows are the as-run rows). Writes report/futility.md."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]
SEGS = ['r<25', 'r25-50', 'r50-100', 'r100-150', 'r150-200']
def seg(r, *n): return sum(r.get('seg', {}).get(x, 0) for x in n) / 3.6e6
def out(r, N, t, cap):
    if not r.get('complete'): return 0, seg(r, *SEGS, 'forge')
    reg = r.get(f'regret{N}')
    if reg is not None and reg < t + 1e-12 if t > 0 else (reg is not None and reg <= 0):
        return 0, seg(r, *(SEGS[:1] if N == 25 else SEGS[:2]))
    if cap: return int(r['ncurve']['150']['conf']), seg(r, *SEGS[:4], 'forge')
    return int(r['ncurve']['200']['conf']), seg(r, *SEGS, 'forge')
rows = []
for s in SEATS + ['all']:
    bs = [r for r in B if s == 'all' or r['seat'] == s]
    bc = sum(int(r['ncurve']['200']['conf']) for r in bs if r.get('complete')); bw = sum(seg(r, *SEGS, 'forge') for r in bs)
    for N in (25, 50):
        for t in (0, .02, .04):
            for cap in (False, True):
                c = w = stopped = 0
                for r in bs:
                    a, b = out(r, N, t, cap); c += a; w += b
                    if r.get('complete') and r.get(f'regret{N}') is not None and ((r[f'regret{N}'] <= 0) if t == 0 else r[f'regret{N}'] < t): stopped += 1
                rows.append([s, N, 'leads/ties' if t == 0 else f'< {t:.2f}', 'yes' if cap else 'no', stopped, c, bc, w, f'{(c/w)/(bc/bw)-1:+.0%}'])
md = ['# A futility stop on o0\'s regret', '', 'Stop a decision at N branches when Forge\'s option (o0) is the leader (or within t of it); '
      '"cap" also ends every other decision at 150. Base: the as-run design (200).', '',
      md_table(['seat', 'N', 'o0 regret', 'cap 150', 'decisions stopped', 'confident', 'base confident', 'wh', 'gain in conf / wh'], rows), '']
open(os.path.join(REPORT, 'futility.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

"""What the screen may have missed: complete decisions just inside the bounds, by their 25-branch o0 regret, read onto the
screened ones. Writes report/screen-miss.md."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]; C = [r for r in B if r.get('complete')]
def wh(r): return sum(r.get('seg', {}).values()) / 3.6e6
def ext(r): return min(r['screenMean'], 1 - r['screenMean'])
md = ['# What the screen may have missed', '', 'Complete decisions by how close their 25-branch mean value came to the bounds (min(p, 1−p)), and by '
      'Forge\'s option\'s observed regret at 25 (best mean − o0 mean).', '']
rows = []
for lo, hi in [(0.04, 0.06), (0.06, 0.10), (0.10, 0.20), (0.20, 0.51)]:
    for rl, rh, nm in [(-1, 0.04, 'o0 regret < .04 at 25'), (0.04, 9, 'o0 regret >= .04 at 25')]:
        s = [r for r in C if r.get('screenMean') is not None and lo < ext(r) <= hi and r.get('regret25') is not None and rl <= r['regret25'] < rh]
        c = sum(r['confident'] for r in s); w = sum(wh(r) for r in s)
        rows.append([f'({lo:.2f}, {hi:.2f}]', nm, len(s), c, c / len(s) if s else None, w / len(s) if s else None, c / w if w else None])
md += [md_table(['min(p,1-p) at 25', 'o0 at 25', 'complete', 'confident', 'rate', 'wh a decision', 'conf / wh'], rows), '']
scr = [r for r in B if r.get('screened')]
hiN = sum(1 for r in scr if (r.get('regret25') or 0) >= 0.04); loN = len(scr) - hiN
md += [f'- Screened: {len(scr)}, of which {hiN} with o0 regret >= .04 at 25 and {loN} below.',
       '- Reading the (0.04, 0.06] row onto them (the nearest decisions that were branched): see the summary for the arithmetic.', '']
open(os.path.join(REPORT, 'screen-miss.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

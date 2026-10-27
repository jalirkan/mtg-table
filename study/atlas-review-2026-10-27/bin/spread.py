"""How many spines (deck pairs) stand behind each notable cell; old and D486 share their 13 spines, so a spine id counts once.
Writes report/spread.md."""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
C = [r for r in D if r['branched'] and r.get('complete')]
sid = lambda r: ('J173 ' if r['seat'] == 'D488' else 'J166-71 ') + r['spine']
cells = {
    'peasant band': lambda r: r['band'] == 'peasant',
    'block': lambda r: r['kind'] == 'b',
    'block k5+': lambda r: r['kind'] == 'b' and r['k'] >= 5,
    'attack k3-4': lambda r: r['kind'] == 'a' and 3 <= r['k'] <= 4,
    'priority k5+': lambda r: r['kind'] == 'p' and r['k'] >= 5,
    'priority k3-4': lambda r: r['kind'] == 'p' and 3 <= r['k'] <= 4,
    '6+ creatures on board': lambda r: r['state'] and r['state']['me.board.creatures'] + r['state']['opp.board.creatures'] >= 6,
    'turn 1-4': lambda r: r['turn'] <= 4,
    'turn 5-8': lambda r: 5 <= r['turn'] <= 8,
    'o0 leads at 50': lambda r: (r.get('regret50') or 0) <= 0,
    'o0 regret >= .10 at 50': lambda r: (r.get('regret50') or 0) >= .10,
}
md = ['# Spines behind the notable cells', '', 'Confident labels per spine id (old+D486 share a spine id; D488 spines are other decks). '
      '"distinct decisions" counts a decision branched on both old and D486 once.', '']
rows = []
for n, f in cells.items():
    s = [r for r in C if f(r)]
    per = collections.Counter(sid(r) for r in s if r['confident'])
    dist = {(sid(r), r['d']) for r in s}; distc = {(sid(r), r['d']) for r in s if r['confident']}
    top = per.most_common(1)[0] if per else ('—', 0)
    rows.append([n, len(s), sum(per.values()), len(dist), len(distc), len({sid(r) for r in s}), len(per), f'{top[0]} ({top[1]})',
                 ', '.join(f'{k} {v}' for k, v in sorted(per.items()))])
md += [md_table(['cell', 'complete', 'confident', 'distinct decisions', 'distinct confident', 'spine ids', 'spine ids with a confident', 'largest', 'confident by spine'], rows), '']
open(os.path.join(REPORT, 'spread.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

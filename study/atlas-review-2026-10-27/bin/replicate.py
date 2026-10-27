"""Label robustness across the seat change: the same decision (spine, d, turn, kind, option tokens) branched on the old
seat (J169) and on D486 (J171) -- same Forge baseline, new rollout policy. Which cells' confident labels survive?
Writes report/replicate.md. (A design read: the two seats are never pooled for training.)"""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
C = [r for r in D if r['branched'] and r.get('complete')]
key = lambda r: (r['spine'], r['d'], r['turn'], r['kind'], tuple(o['token'] for o in r['opts']))
old = {key(r): r for r in C if r['seat'] == 'old'}
new = {key(r): r for r in C if r['seat'] == 'D486'}
pairs = [(old[k], new[k]) for k in old if k in new]
KIND = {'p': 'priority', 'a': 'attack', 'b': 'block'}
def cellrows(f):
    t = collections.defaultdict(collections.Counter)
    for a, b in pairs:
        c = f(a)
        t[c]['pairs'] += 1
        t[c]['either'] += a['confident'] or b['confident']
        t[c]['both'] += a['confident'] and b['confident']
        t[c]['bothSameBest'] += a['confident'] and b['confident'] and a['best'] == b['best']
        t[c]['old'] += a['confident']; t[c]['new'] += b['confident']
    return [[c, x['pairs'], x['old'], x['new'], x['either'], x['both'], x['bothSameBest'], (x['both'] / x['either']) if x['either'] else None] for c, x in sorted(t.items())]
hdr = ['cell', 'paired decisions', 'confident old', 'confident D486', 'either', 'both', 'both, same best', 'both / either']
md = ['# Do confident labels survive the seat change? (old J169 vs D486 J171, same decisions)', '',
      f'{len(pairs)} complete decisions pair (same spine, index, turn, kind and option tokens). "both / either" is a replication rate: '
      'the share of decisions confident on one seat that are confident on the other too.', '',
      '## all', '', md_table(hdr, cellrows(lambda r: 'all')), '',
      '## by kind', '', md_table(hdr, cellrows(lambda r: KIND[r['kind']])), '',
      '## by k', '', md_table(hdr, cellrows(lambda r: kb(r['k']))), '',
      '## by turn', '', md_table(hdr, cellrows(lambda r: tb(r['turn']))), '',
      '## by the old seat\'s regret at 50 branches', '',
      md_table(hdr, cellrows(lambda r: 'o0 leads' if (r.get('regret50') or 0) <= 0 else '0-.10' if r['regret50'] < .1 else '>=.10')), '',
      '## by the old label\'s low end', '',
      md_table(hdr, cellrows(lambda r: 'not confident' if not r['confident'] else 'lo <= .01' if r['regretLo'] <= .01 else 'lo .01-.03' if r['regretLo'] <= .03 else 'lo > .03')), '']
open(os.path.join(REPORT, 'replicate.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

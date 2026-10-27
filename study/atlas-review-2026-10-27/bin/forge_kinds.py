"""(3) The Forge map on the seven Forge-map spines; (4) what is listed and what is branched, by kind and k;
the attack/block night. Writes report/forge.md and report/kinds.md."""
import json, os, sys, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = [json.loads(l) for l in open(os.path.join(WORK, 'derived.jsonl'))]
B = [r for r in D if r['branched']]; C = [r for r in B if r.get('complete')]
H = 3.6e6
def wh(r): return sum(r.get('seg', {}).values()) / H
def fw(r): return r.get('seg', {}).get('forge', 0) / H

# (3)
md = ['# (3) The Forge map', '', 'Seven spines carry it: old s01, s07, s13; D486 s01, s07, s13; D488 s01 (40 branches an option, on the options '
      'still running after the last checkpoint). The label (`regret`, `confident`) is the random map\'s alone (D451, D480).', '']
rows = []
for s in SEATS + ['all']:
    fs = [r for r in B if r['forgeMap'] and (s == 'all' or r['seat'] == s)]
    fc = [r for r in fs if r.get('complete')]
    if not fs: continue
    tot = sum(wh(r) for r in fs); f = sum(fw(r) for r in fs)
    conf = sum(1 for r in fc if r['confident']); cf = sum(1 for r in fc if r['confidentForge'])
    both = sum(1 for r in fc if r['confident'] and r['confidentForge'])
    onlyF = sum(1 for r in fc if r['confidentForge'] and not r['confident'])
    sb = [r['sameBest'] for r in fc if r.get('sameBest') is not None]
    rho = [r['rho'] for r in fc if r.get('rho') is not None]
    samebest_conf = [r['sameBest'] for r in fc if r['confident'] and r.get('sameBest') is not None]
    rows.append([s, len({(r["seat"], r["spine"]) for r in fs}), len(fc), tot, f, f / tot, conf, cf, both, onlyF,
                 f'{sum(sb)}/{len(sb)}', float(np.mean(rho)) if rho else None, f'{sum(samebest_conf)}/{len(samebest_conf)}'])
md += [md_table(['seat', 'spines', 'complete', 'branch wh', 'Forge wh', 'Forge share', 'confident (random)', 'confidentForge', 'both', 'Forge only',
                 'same best', 'mean rho', 'same best on the confident'], rows), '']
# where confident and the Forge map disagree on the best
dis = [r for r in C if r['forgeMap'] and r['confident'] and r.get('forgeBest') is not None and r['forgeBest'] != r['best']]
md += [f'- Confident labels on Forge-map spines whose Forge-map best differs from the random-map best: {len(dis)} of '
       f'{sum(1 for r in C if r["forgeMap"] and r["confident"])}.']
# the regret at Forge's choice under the Forge map vs random map
fr = [(r['regret'], r['forgeRegret']) for r in C if r['forgeMap'] and r.get('forgeRegret') is not None]
a = np.array(fr)
md += [f'- Mean regret at o0: random map {a[:,0].mean():.3f}, Forge map {a[:,1].mean():.3f} (n {len(a)}); correlation {np.corrcoef(a[:,0], a[:,1])[0,1]:.2f}.']
allwh = sum(wh(r) for r in B); allf = sum(fw(r) for r in B)
md += [f'- Over all {len(B)} branched decisions the Forge map is {allf:.2f} of {allwh:.1f} branch wh ({allf/allwh:.1%}); on its spines '
       f'{sum(fw(r) for r in B if r["forgeMap"]):.2f} of {sum(wh(r) for r in B if r["forgeMap"]):.1f} ({sum(fw(r) for r in B if r["forgeMap"])/sum(wh(r) for r in B if r["forgeMap"]):.1%}).', '']
open(os.path.join(REPORT, 'forge.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

# (4)
KIND = {'p': 'priority', 'a': 'attack', 'b': 'block'}
md = ['# (4) What is listed, what is branched', '', 'Listed = every decision of the viewing seat (A) in the baseline game with 2+ options '
      '(the atlas lists priority, attack and block decisions only: no mulligan, no target decision is ever an atlas decision). '
      'k = distinct plays for branched decisions (D483), distinct identities for the listing.', '']
rows = []
for s in SEATS:
    for kd in 'pab':
        Ls = [r for r in D if r['seat'] == s and r['kind'] == kd]
        k3 = [r for r in Ls if r['kList'] >= 3]
        br = [r for r in Ls if r['branched']]
        sc = [r for r in br if r.get('screened')]
        cp = [r for r in br if r.get('complete')]
        cf = [r for r in cp if r['confident']]
        rows.append([s, KIND[kd], len(Ls), len(k3), len(br), f'{len(br)/len(Ls):.2f}' if Ls else '—', f'{len(br)/len(k3):.2f}' if k3 else '—',
                     len(sc), len(cp), len(cf), sum(wh(r) for r in br) / max(len(cp), 1)])
md += [md_table(['seat', 'kind', 'listed', 'listed k>=3', 'branched', 'share of listed', 'branched / listed k>=3', 'screened', 'complete',
                 'confident', 'wh a complete decision'], rows), '']
# turns of listed blocks / attacks, and their screened share
for kd in 'ab':
    br = [r for r in B if r['kind'] == kd]
    md.append(f'- {KIND[kd]}: branched {len(br)}, screened {sum(1 for r in br if r.get("screened"))} '
              f'({sum(1 for r in br if r.get("screened"))/len(br):.0%}); median turn {np.median([r["turn"] for r in br]):.0f}; '
              f'priority\'s screened share {sum(1 for r in B if r["kind"]=="p" and r.get("screened"))/sum(1 for r in B if r["kind"]=="p"):.0%}.')
md.append('')
# per-spine availability of k>=3 attacks/blocks
for s in SEATS:
    spines = sorted({r['spine'] for r in D if r['seat'] == s})
    av = [sum(1 for r in D if r['seat'] == s and r['spine'] == sp and r['kind'] in 'ab' and r['kList'] >= 3) for sp in spines]
    av2 = [sum(1 for r in D if r['seat'] == s and r['spine'] == sp and r['kind'] in 'ab') for sp in spines]
    md.append(f'- {s}: listed attack+block decisions a spine {av2} (mean {np.mean(av2):.1f}); with k >= 3 {av} (mean {np.mean(av):.1f}).')
md.append('')
# the attack / block labels
md += ['## Every confident attack or block label', '']
rows = []
for r in C:
    if r['kind'] in 'ab' and r['confident']:
        o = {x['o']: x for x in r['opts']}
        rows.append([r['seat'], r['spine'], r['d'], KIND[r['kind']], r['k'], r['turn'], o[0]['token'][:40], o[r['best']]['token'][:40], r['regret'], r['regretLo'], r['regretHi']])
md += [md_table(['seat', 'spine', 'd', 'kind', 'k', 'turn', 'Forge\'s (o0)', 'best', 'regret', 'lo', 'hi'], rows), '']
# s02 d3 across seats
md += ['## s02 d3 (the attack J166 labelled) on each seat', '']
for r in D:
    if r['spine'] == 's02' and r['d'] == 3 and r['seat'] in ('old', 'D486'):
        if r['branched']:
            md.append(f"- {r['seat']}: kind {r['kind']}, k {r.get('k')}, turn {r['turn']}, regret {r['regret']} [{r['regretLo']}, {r['regretHi']}], confident {r['confident']}, "
                      f"options {[(x['token'], x['rmean']) for x in r['opts']]}")
        else:
            md.append(f"- {r['seat']}: not branched")
md.append('')
open(os.path.join(REPORT, 'kinds.md'), 'w').write('\n'.join(md)); print('\n'.join(md))

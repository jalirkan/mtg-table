#!/usr/bin/env python3
# J171 read: pair J171's (v4, D486 seat) label rows with J169's (v3, pre-D486, final) by spine and decision index, where the
# baseline turn, kind and the option tokens agree; per pair: same best, confidence kept, option values moved.  Read only.
# Usage: pair_labels.py J171_labels.jsonl J169_labels.jsonl J171_lab J169_lab OUT.json
import json, sys, statistics as st
a = {(r['spine'], r['d']): r for r in map(json.loads, open(sys.argv[1]))}
b = {(r['spine'], r['d']): r for r in map(json.loads, open(sys.argv[2]))}
def vals(atlas, d):
    for x in json.load(open(atlas))['phaseB']['decisions']:
        if x['d'] == d: return {o['token']: o.get('random', {}).get('mean') for o in x['options']}
pairs, moved = [], []
for k, r in sorted(a.items()):
    q = b.get(k)
    if not q: continue
    same = q['turn'] == r['turn'] and q['kind'] == r['kind'] and [o['token'] for o in q['options']] == [o['token'] for o in r['options']]
    if not same: pairs.append({'spine': k[0], 'd': k[1], 'paired': False}); continue
    va, vb = vals(r['atlas'], k[1]), vals(q['atlas'], k[1])
    dv = [va[t] - vb[t] for t in va if va.get(t) is not None and vb.get(t) is not None]
    moved += dv
    pairs.append({'spine': k[0], 'd': k[1], 'paired': True, 'complete': [q['complete'], r['complete']], 'best': [q['bestRandom'], r['bestRandom']],
                  'sameBest': q['bestRandom'] == r['bestRandom'], 'confident': [q['confident'], r['confident']], 'regret': [q['regret'], r['regret']],
                  'meanAbsMove': round(st.mean(abs(x) for x in dv), 4) if dv else None, 'biasedJ169': q.get('biased')})
P = [p for p in pairs if p['paired'] and all(p['complete'])]
s = {'j171Rows': len(a), 'j169Rows': len(b), 'sameIndex': len(pairs), 'paired': sum(p['paired'] for p in pairs), 'pairedBothLabels': len(P),
     'sameBest': sum(p['sameBest'] for p in P), 'confBoth': sum(all(p['confident']) for p in P), 'confJ169Only': sum(p['confident'][0] and not p['confident'][1] for p in P),
     'confJ171Only': sum(p['confident'][1] and not p['confident'][0] for p in P),
     'confBothSameBest': sum(all(p['confident']) and p['sameBest'] for p in P),
     'optionValueMeanAbsMove': round(st.mean(abs(x) for x in moved), 4) if moved else None, 'optionValueMedianAbsMove': round(st.median(abs(x) for x in moved), 4) if moved else None, 'optionsCompared': len(moved),
     'bySpine': {}}
for sp in sorted({p['spine'] for p in pairs}):
    Q = [p for p in P if p['spine'] == sp]
    s['bySpine'][sp] = {'sameIndex': sum(p['spine'] == sp for p in pairs), 'paired': sum(p['spine'] == sp and p['paired'] for p in pairs), 'bothLabels': len(Q),
                        'sameBest': sum(p['sameBest'] for p in Q), 'confJ169': sum(p['confident'][0] for p in Q), 'confJ171': sum(p['confident'][1] for p in Q), 'confBoth': sum(all(p['confident']) for p in Q)}
json.dump({'summary': s, 'pairs': pairs}, open(sys.argv[5], 'w'), indent=1)
print(json.dumps(s, indent=1))

# The label file and its free reads: every judged decision of the atlas population (round 2's 154, J203's 160, wave 1),
# both judges' options, the label (their common pick, else none), and what the atlas's own maps say of the label.
# usage: python3 -I score4.py <scratchpad dir>   writes llm-judge4/labels-judged.jsonl and llm-judge4/score.json
import json, os, sys, random, collections
S = sys.argv[1]
rows = {}
for l in open(os.path.join(S, 'llm-judge/data/move-atlas-v1/labels.jsonl')):
    r = json.loads(l); rows['%s/%s/d%d' % (r['night'], r['spine'], r['d'])] = r
J = {}
for l in open(os.path.join(S, 'llm-judge2/picks.jsonl')):
    p = json.loads(l); J[p['key']] = ('round2', p['judge1']['option'], p['judge2']['option'], p['judge1']['conf'], p['judge2']['conf'])
for l in open(os.path.join(S, 'llm-judge3/ingest/picks.jsonl')):
    p = json.loads(l); a, b = p['A'], p['B']  # 29 of J203's decisions were also in round 2: J203's judging (unselected, blind) is the one kept
    J[p['key']] = ('J203', a['option'], b['option'], a['conf'], b['conf'])
f4 = os.path.join(S, 'llm-judge4/picks.jsonl')
for l in open(f4):
    p = json.loads(l); a, b = p['A'], p['B']; assert p['key'] not in J
    J[p['key']] = ('wave1', a['option'], b['option'], a['conf'], b['conf'])
out = []
for k, (src, a, b, ca, cb) in J.items():
    r = rows[k]; o = {x['o']: x for x in r['options']}
    status = 'confident' if r['confident'] else 'complete' if r['complete'] else 'partial' if r['partial'] else 'screened'
    lab = a if a == b else None
    def val(m, i):
        x = o.get(i, {}).get(m) or {}
        return x.get('mean') if x.get('n') else None
    rb = max((x for x in r['options'] if x['random'].get('n')), key=lambda x: x['random']['mean'], default=None)
    out.append({'key': k, 'source': src, 'night': r['night'], 'spine': r['spine'], 'd': r['d'], 'kind': r['kind'], 'k': r['k'],
                'status': status, 'A': a, 'B': b, 'confA': ca, 'confB': cb, 'label': lab,
                'labelToken': o[lab]['token'] if lab is not None else None, 'forgeToken': r['forgeToken'],
                'randomLabel': val('random', lab) if lab is not None else None, 'randomForge': val('random', 0),
                'forgeLabel': val('forge', lab) if lab is not None else None, 'forgeForge': val('forge', 0),
                'randomBest': rb['o'] if rb else None,
                'randomA': val('random', a), 'randomB': val('random', b), 'forgeA': val('forge', a), 'forgeB': val('forge', b)})
out.sort(key=lambda x: (x['night'], x['spine'], x['d']))
with open(os.path.join(S, 'llm-judge4/labels-judged.jsonl'), 'w') as f:
    for x in out: f.write(json.dumps(x) + '\n')

def boot(items, fn, n=4000, seed=538):
    """cluster bootstrap by spine: fn(list of rows) -> number or None"""
    by = collections.defaultdict(list)
    for x in items: by[(x['night'], x['spine'])].append(x)
    ks = sorted(by); rng = random.Random(seed); vs = []
    for _ in range(n):
        s = [y for k in (rng.choice(ks) for _ in ks) for y in by[k]]
        v = fn(s)
        if v is not None: vs.append(v)
    vs.sort()
    return (round(vs[int(.025 * len(vs))], 4), round(vs[int(.975 * len(vs))], 4)) if vs else None
def mean(v): return sum(v) / len(v) if v else None
def gain(m):
    """mean over decisions of (value of the judges' pick - value of Forge's), each judge's pick counted half; 0 where it is Forge's"""
    def fn(s):
        d = []
        for x in s:
            f = x[m + 'Forge']; a, b = x[m + 'A'], x[m + 'B']
            if f is None or a is None or b is None: continue
            d.append((a + b) / 2 - f)
        return mean(d)
    return fn
def share(m):
    """among decisions where both judges pick one option that is not Forge's and both values exist: share where it scores above Forge's (ties half)"""
    def fn(s):
        d = [(1 if x[m + 'Label'] > x[m + 'Forge'] else .5 if x[m + 'Label'] == x[m + 'Forge'] else 0) for x in s
             if x['label'] not in (None, 0) and x[m + 'Label'] is not None and x[m + 'Forge'] is not None]
        return mean(d)
    return fn
def labgain(m):
    def fn(s):
        d = [x[m + 'Label'] - x[m + 'Forge'] for x in s if x['label'] not in (None, 0) and x[m + 'Label'] is not None and x[m + 'Forge'] is not None]
        return mean(d)
    return fn
res = {}
def block(name, items):
    n = len(items); ag = [x for x in items if x['label'] is not None]
    r = {'n': n, 'agree': len(ag), 'bothForge': sum(x['label'] == 0 for x in ag), 'bothSameOther': sum(x['label'] != 0 for x in ag),
         'split': n - len(ag)}
    for m in ('random', 'forge'):
        nn = sum(1 for x in items if x['label'] not in (None, 0) and x[m + 'Label'] is not None and x[m + 'Forge'] is not None)
        r[m] = {'nOther': nn, 'shareAbove': share(m)(items), 'shareCI': boot(items, share(m)) if nn >= 8 else None,
                'labelGain': labgain(m)(items), 'labelGainCI': boot(items, labgain(m)) if nn >= 8 else None,
                'gainAll': gain(m)(items), 'gainAllCI': boot(items, gain(m)),
                'nAll': sum(1 for x in items if None not in (x[m + 'Forge'], x[m + 'A'], x[m + 'B']))}
    res[name] = r
    def f(v): return 'none' if v is None else ('%.3f' % v)
    print('%-22s n %3d agree %3d (%.2f)  both Forge %3d  same other %3d  split %3d' % (name, n, len(ag), len(ag) / n if n else 0, r['bothForge'], r['bothSameOther'], r['split']))
    for m in ('random', 'forge'):
        q = r[m]; print('    %-6s map: other-label n %3d share above Forge %s %s  gain %s %s | all-decision gain %s %s (n %d)' % (
            m, q['nOther'], f(q['shareAbove']), q['shareCI'], f(q['labelGain']), q['labelGainCI'], f(q['gainAll']), q['gainAllCI'], q['nAll']))
block('all', out)
for s in ('round2', 'J203', 'wave1'): block(s, [x for x in out if x['source'] == s])
unsel = [x for x in out if x['source'] != 'round2']
block('unselected (J203+w1)', unsel)
for kd in 'pab': block('unselected kind ' + kd, [x for x in unsel if x['kind'] == kd])
for st in ('complete', 'partial', 'screened'): block('unselected ' + st, [x for x in unsel if x['status'] == st])
json.dump(res, open(os.path.join(S, 'llm-judge4/score.json'), 'w'), indent=1)

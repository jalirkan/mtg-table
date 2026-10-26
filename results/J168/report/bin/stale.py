# J168 read: target decisions whose chosen card target is on no battlefield and no stack in the state frame the decision
# answers (a stale or off-board target), per branch frame log. usage: stale.py SPINE_DIR OUT.jsonl [jobs]
import gzip, json, os, re, sys, glob
from multiprocessing import Pool
spine, out = sys.argv[1], sys.argv[2]
jobs = int(sys.argv[3]) if len(sys.argv) > 3 else 6
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')

def where(b, t):
    for p in b.get('players') or []:
        for z, v in (p.get('zones') or {}).items():
            for c in (v or {}).get('cards') or []:
                if c and c.get('id') == t:
                    return z if not c.get('hidden') else z + '(hidden)', c.get('name')
    for c in b.get('stackCards') or []:
        if c and c.get('id') == t:
            return 'stack', c.get('name')
    for s in b.get('stack') or []:
        if s and s.get('id') == t:
            return 'stackitem', None
    return 'nowhere', None

def scan(path):
    m = NAME.search(path)
    d, c, o, i, seat = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))
    last = None
    lastdec = {}
    hits = []
    with gzip.open(path, 'rt') as f:
        for l in f:
            if '"type":"state"' in l:
                last = l
                continue
            if '"dir":"ai"' not in l or '"type":"decision"' not in l:
                continue
            x = json.loads(l)['body']
            lastdec[x.get('n')] = x
            if x.get('kind') != 'target' or last is None:
                continue
            ch = x.get('chosen')
            ch = ch if isinstance(ch, list) else [ch]
            ts = [int(t.split(':')[1]) for t in ch if isinstance(t, str) and re.fullmatch(r'target:\d+', t)]
            if not ts:
                continue
            b = json.loads(last)['body']
            for t in ts:
                z, nm = where(b, t)
                if z in ('battlefield', 'stack', 'stackitem'):
                    continue
                par = lastdec.get(x.get('parent')) or {}
                pc = par.get('chosen')
                pid = int(pc.split(':')[1].split('#')[0]) if isinstance(pc, str) and re.match(r'(cast|activate):\d+', pc) else None
                pz, pn = where(b, pid) if pid is not None else (None, None)
                hits.append({'n': x.get('n'), 'turn': x.get('turn'), 'target': t, 'targetZone': z, 'targetName': nm, 'parent': pc, 'parentName': pn,
                             'parentBy': par.get('by'), 'parentRule': (par.get('explore') or {}).get('rule'), 'by': x.get('by'), 'options': len(x.get('options') or [])})
    return {'d': d, 'c': c, 'o': o, 'i': i, 'seat': seat, 'hits': hits} if hits else None

files = sorted(glob.glob(os.path.join(spine, 'phaseB', 'frames', '*.jsonl.gz')))
n = 0
with Pool(jobs) as p, open(out, 'w') as f:
    for r in p.imap_unordered(scan, files, chunksize=32):
        n += 1
        if r:
            f.write(json.dumps(r) + '\n')
print(out, n)

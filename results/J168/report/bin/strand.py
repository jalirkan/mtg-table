# J168 read: stranded casts in branch frame logs (read only).
# usage: strand.py SPINE_DIR SEAT SPELL_IDS(comma) TRIGGER_IDS(comma or -) OUT.jsonl [jobs]
# A spell is stranded when a {hand}->{stack} zone event for it is followed by no state whose stackCards holds it
# and no later zone event moving it from the stack. A trigger is dropped when the card moves stack->battlefield and
# no stack item with that sourceCardId appears in the next 4 state frames.
import gzip, json, os, re, sys, glob
from multiprocessing import Pool
spine, seat = sys.argv[1], int(sys.argv[2])
spells = [int(x) for x in sys.argv[3].split(',') if x and x != '-']
trigs = [int(x) for x in sys.argv[4].split(',') if x and x != '-']
out = sys.argv[5]
jobs = int(sys.argv[6]) if len(sys.argv) > 6 else 4
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')
keys = ['"cardId":%d,' % x for x in spells + trigs]

def scan(path):
    m = NAME.search(path)
    d, c, o, i = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4))
    lines = []
    with gzip.open(path, 'rt') as f:
        for l in f:
            lines.append(l)
    lab = json.loads(lines[0]).get('lab') or {}
    res = {'d': d, 'c': c, 'o': o, 'i': i, 'token': lab.get('optionToken'), 'stranded': [], 'dropped': [], 'casts': 0}
    lastdec = None
    lastcast = {}
    firstdec = True
    def iscast(tok, cid):
        return isinstance(tok, str) and (tok == 'cast:%d' % cid or tok.startswith('cast:%d#' % cid))
    for k, l in enumerate(lines):
        if '"dir":"ai"' in l and '"type":"decision"' in l:
            lastdec = json.loads(l)['body']
            for cid in spells:
                if iscast(lastdec.get('chosen'), cid):
                    lastcast[cid] = lastdec
            firstdec = False
            continue
        if not any(x in l for x in keys):
            continue
        fr = json.loads(l)
        b = fr.get('body') or {}
        if not isinstance(b, dict):
            continue
        for e in b.get('events') or []:
            cid = e.get('cardId')
            if e.get('kind') != 'zone':
                continue
            fz, tz = (e.get('from') or {}).get('zone'), (e.get('to') or {}).get('zone')
            if cid in spells and fz == 'hand' and tz == 'stack':
                res['casts'] += 1
                ok = False
                for l2 in lines[k:]:
                    if '"type":"state"' not in l2 or ('%d' % cid) not in l2:
                        continue
                    b2 = json.loads(l2)['body']
                    if any(sc and sc.get('id') == cid for sc in b2.get('stackCards') or []):
                        ok = True; break
                    if any(e2.get('kind') == 'zone' and e2.get('cardId') == cid and (e2.get('from') or {}).get('zone') == 'stack' for e2 in b2.get('events') or []):
                        ok = True; break
                if not ok:
                    if firstdec and iscast(lab.get('optionToken'), cid):
                        origin = {'forced': True}
                    else:
                        dd = lastcast.get(cid) or {}
                        origin = {'forced': False, 'n': dd.get('n'), 'seat': dd.get('seat'), 'chosen': dd.get('chosen'), 'by': dd.get('by'),
                                  'rule': (dd.get('explore') or {}).get('rule'), 'forgePick': (dd.get('explore') or {}).get('forge'), 'lastDecBy': (lastdec or {}).get('by'), 'lastDecKind': (lastdec or {}).get('kind'), 'firstdec': firstdec}
                    res['stranded'].append(dict(card=cid, turn=b.get('turn'), **origin))
            if cid in trigs and fz == 'stack' and tz == 'battlefield':
                res['casts'] += 1
                seen, ns = False, 0
                for l2 in lines[k:]:
                    if '"type":"state"' not in l2:
                        continue
                    ns += 1
                    b2 = json.loads(l2)['body']
                    if any(c2 and ('(%d)\'s Effect' % cid) in (c2.get('name') or '') for p2 in b2.get('players') or [] for c2 in ((p2.get('zones') or {}).get('command') or {}).get('cards') or []):
                        seen = True; break
                    if ns >= 6:
                        break
                if not seen:
                    dd = lastdec or {}
                    res['dropped'].append({'card': cid, 'turn': b.get('turn'), 'forced': firstdec, 'n': dd.get('n'), 'by': dd.get('by'), 'rule': (dd.get('explore') or {}).get('rule')})
    return res

files = sorted(glob.glob(os.path.join(spine, 'phaseB', 'frames', '*-seat%d.jsonl.gz' % seat)))
with Pool(jobs) as p, open(out, 'w') as f:
    for r in p.imap_unordered(scan, files, chunksize=16):
        f.write(json.dumps(r) + '\n')
print(out, len(files))

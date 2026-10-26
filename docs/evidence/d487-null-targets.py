#!/usr/bin/env python3
# mtg-table -- docs/evidence/d487-null-targets.py
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""D487's verification of J171's `chosen: null` target records, reproducible.

    python3 -I docs/evidence/d487-null-targets.py scan <out.jsonl> <spine>/phaseB/frames [...]
    python3 -I docs/evidence/d487-null-targets.py summary <out.jsonl> [...]
    python3 -I docs/evidence/d487-null-targets.py scripts "Tear Asunder" "Garruk, Curse Breaker" ...

`scan` reads every frame log (gzipped JSONL) of the given directories and writes one line per decision record
whose `chosen` is null: its parent priority answer, every target record of that parent (n, chosen, options), the
cast event of the parent's card that followed (its stack text, which names each part's targets with their ids, and
the stack item's targets), and whether each target the cast carried was (a) among the options of the parent's
target records, (b) shown to the seat by the record's or the cast's state frame, (c) one of the records' answers.
`summary` counts them by card, by shape, by Tear Asunder half (which text segment is empty against which record is
null), and lists any target outside the options.  `scripts` prints each card's TargetMin$ / TargetMax$ (and the SVars
they name) from the pinned engine's cardsfolder.zip -- read only.

J171 (D487): s02 s04 s08 s09 s10 of /home/justin-a/code/lab/data/lab-j170 gave 4,717 records in 4,501 logs; Tear
Asunder 4,616 (3,959 with both halves written, 656 with the other half a one-candidate record, 1 fizzled), 101
"up to" planeswalker abilities; 0 targets outside the options.
"""
import gzip, json, os, re, sys, zipfile, collections
from multiprocessing import Pool

ZIP = '/home/justin-a/forge/res/cardsfolder/cardsfolder.zip'

def visible(body, seat):
    ids = set()
    for p in body.get('players') or []:
        for zn, z in (p.get('zones') or {}).items():
            if zn == 'library' and p.get('id') != seat: continue
            for c in (z or {}).get('cards') or []:
                if c and c.get('hidden') is not True and isinstance(c.get('id'), int): ids.add(c['id'])
    for c in body.get('stackCards') or []:
        if c and c.get('hidden') is not True: ids.add(c['id'])
    return ids

def scan(path):
    out = []
    frames = [json.loads(l) for l in gzip.open(path, 'rt').read().splitlines()]
    seat = frames[0].get('seat')
    recs = {}
    for i, f in enumerate(frames):
        if f.get('dir') == 'ai' and f.get('type') == 'decision':
            recs[f['body']['n']] = (i, f['body'])
    for n, (i, b) in recs.items():
        if not ('chosen' in b and b['chosen'] is None): continue
        par = recs.get(b.get('parent'))
        ptok = par[1]['chosen'] if par else None
        sibs = sorted([(bb['n'], bb['chosen'], bb['options']) for (ii, bb) in recs.values()
                       if bb.get('parent') == b.get('parent') and bb['kind'] == 'target'])
        m = re.match(r'^(cast|activate):(\d+)', ptok or '')
        cid = int(m.group(2)) if m else None
        r = {'file': os.path.basename(path), 'line': i + 1, 'n': n, 'parent': ptok, 'sibs': sibs,
             'kind': b['kind'], 'by': b['by'], 'source': b.get('source'), 'keys': sorted(b.keys()),
             'nopts': len(b['options']), 'hidden': b.get('hidden', 0)}
        recvis = visible(frames[b['frame']]['body'], seat) if isinstance(b.get('frame'), int) else set()
        found = None
        for f in frames[i + 1:]:
            if f.get('type') != 'state': continue
            for e in f['body'].get('events') or []:
                if e.get('kind') == 'cast' and e.get('cardId') == cid:
                    found = (e, f['body']); break
            if found: break
        if not found:
            r['cast'] = None; out.append(r); continue
        e, body = found
        st = next((s for s in body.get('stack') or [] if s.get('id') == e.get('stackId')), None)
        text = e.get('text') or (st or {}).get('text') or ''
        if not text:
            # resolved inside the frame: the name from any later state that lists the card
            for f in frames:
                if f.get('type') != 'state': continue
                for p in f['body'].get('players') or []:
                    for z in (p.get('zones') or {}).values():
                        for c in (z or {}).get('cards') or []:
                            if c.get('id') == cid and c.get('name'): r['nameLater'] = c['name']
                if r.get('nameLater'): break
        r['text'] = text
        r['name'] = text.split(' (')[0] if text else r.get('nameLater')
        body_txt = text.split(' - ', 1)[1] if ' - ' in text else ''
        segs = [s.strip() for s in re.split(r'\.(?:\s|$)', body_txt) if s.strip() != '' or True]
        r['segs'] = segs
        ids = [int(x) for x in re.findall(r'\((\d+)\)', body_txt)]
        tc = list((st or {}).get('targetCardIds') or []); tp = list((st or {}).get('targetPlayerIds') or [])
        r['stackTargets'] = tc + ['p%d' % x for x in tp]
        tgt = set(tc) | set(ids)
        allopts = set(); allchosen = set()
        for (_, ch, opts) in sibs:
            allopts |= set(opts)
            for t in (ch if isinstance(ch, list) else [ch]):
                if t: allchosen.add(t)
        castvis = visible(body, seat)
        r['targets'] = sorted(tgt)
        r['notInAnyOptions'] = sorted(x for x in tgt if 'target:%d' % x not in allopts)
        r['notChosen'] = sorted(x for x in tgt if 'target:%d' % x not in allchosen)
        r['notVisible'] = sorted(x for x in tgt if x not in recvis and x not in castvis)
        r['fizzled'] = any(ev.get('kind') == 'resolved' and ev.get('cardId') == cid and ev.get('fizzled') for ev in body.get('events') or [])
        out.append(r)
    return out


def summary(fns):
    for fn in fns:
        rs=[json.loads(l) for l in open(fn)]
        C=collections.Counter()
        ex=collections.defaultdict(list)
        for r in rs:
            name=r.get('name') or '?'
            C[('name',name)]+=1
            C[('shape',r['kind'],r['by'],r['source'],tuple(r['keys']))]+=1
            if r.get('cast') is None and 'text' not in r: C['NO CAST']+=1; ex['nocast'].append(r); continue
            if r['notInAnyOptions']: C['target not in any record option']+=1; ex['notopt'].append(r)
            if r['notVisible']: C['target not visible']+=1; ex['notvis'].append(r)
            nt=len(r['targets'])
            C[('ntargets',name,nt)]+=1
            if name=='Tear Asunder':
                segs=r['segs']
                empty=[i for i,s in enumerate(segs) if re.fullmatch(r'Exile',s)]
                # which part the null record is: its position among the written siblings
                pos=[i for i,(n,ch,o) in enumerate(r['sibs']) if n==r['n']][0]
                k=('TA', 'segs',len(segs),'emptyAt',tuple(empty),'nullPos',pos,'sibs',len(r['sibs']),'fizz',r['fizzled'],'notChosen',len(r['notChosen']))
                C[k]+=1
                if len(r['sibs'])==2 and empty and empty[0]!=pos: ex['mismatch'].append(r)
            else:
                if nt: ex['pwtarget'].append(r)
        print('==',fn,len(rs),'records',len({r['file'] for r in rs}),'files')
        for k,v in sorted(C.items(),key=lambda x:str(x[0])): print('  ',k,v)
        for k,v in ex.items():
            print('  EX',k,len(v))
            for r in v[:3]: print('    ',json.dumps({x:r.get(x) for x in ('file','line','n','parent','sibs','text','targets','notInAnyOptions','notVisible','notChosen')})[:700])


def scripts(names):
    z = zipfile.ZipFile(ZIP)
    by = {}
    for n in z.namelist():
        if n.endswith('.txt') and not n.startswith('rebalanced/'):
            by[os.path.basename(n)[:-4]] = n
    for name in names:
        slug = re.sub(r'_+$', '', re.sub(r'[^a-z0-9]+', '_', re.sub(r"[',]", '', name.lower())))
        f = by.get(slug)
        if f is None:
            print('??', name); continue
        text = z.read(f).decode('utf-8')
        svars = dict(re.findall(r'^SVar:([^:]+):(.*)$', text, re.M))
        print('==', name, '(' + f + ')')
        for line in text.splitlines():
            if 'TargetMin$' in line or 'TargetMax$' in line:
                mm = re.findall(r'Target(Min|Max)\$ *([^ |]+)', line)
                desc = ', '.join('%s %s%s' % (k, v, ' = ' + svars[v] if v in svars else '') for k, v in mm)
                print('   ', desc, '|', (re.search(r'(SpellDescription|TgtPrompt)\$ *([^|]+)', line) or [None, None, ''])[2].strip())


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'scan':
        files = []
        for d in sys.argv[3:]:
            files += [os.path.join(d, x) for x in os.listdir(d) if x.endswith('.jsonl.gz')]
        with Pool(6) as p, open(sys.argv[2], 'w') as o:
            for rs in p.imap_unordered(scan, files, chunksize=20):
                for r in rs:
                    o.write(json.dumps(r) + '\n')
    elif cmd == 'summary':
        summary(sys.argv[2:])
    elif cmd == 'scripts':
        scripts(sys.argv[2:])
    else:
        print(__doc__); sys.exit(2)

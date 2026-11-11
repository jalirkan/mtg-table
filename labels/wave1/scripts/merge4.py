# Wave 1 merge: validate judge A's and judge B's per-batch pick files, map letters to option indices, read agreement.
# usage: python3 -I merge4.py <llm-judge4 dir>   (reads batches/index.json, scripts/keymap.json, sample.jsonl,
#   judge{A,B}/picks/batchNN.jsonl; writes picks-A.jsonl, picks-B.jsonl, picks.jsonl, merge.json; exit 1 on a bad line)
import json, os, sys, collections
D = sys.argv[1]
idx = json.load(open(os.path.join(D, 'batches/index.json')))
km = json.load(open(os.path.join(D, 'scripts/keymap.json')))
samp = {json.loads(l)['key']: json.loads(l) for l in open(os.path.join(D, 'sample.jsonl'))}
bad, rows, pending = [], {'A': {}, 'B': {}}, []
for who in 'AB':
    for b in sorted(idx):
        f = os.path.join(D, 'judge' + who, 'picks', 'batch%s.jsonl' % b)
        if not os.path.exists(f):
            pending.append(who + b); continue
        seen = set()
        for n, l in enumerate(open(f), 1):
            if not l.strip(): continue
            try: p = json.loads(l)
            except Exception as e:
                bad.append('%s%s line %d: not JSON' % (who, b, n)); continue
            k = p.get('key')
            if k not in idx[b]: bad.append('%s%s line %d: key %r not in batch' % (who, b, n, k)); continue
            if k in seen: bad.append('%s%s: %s twice' % (who, b, k)); continue
            L = str(p.get('pick', '')).strip().upper()[:1]; S = str(p.get('second', '')).strip().upper()[:1]
            if L not in km[k] or S not in km[k] or L == S:
                bad.append('%s%s: %s pick %r second %r (letters %s)' % (who, b, k, p.get('pick'), p.get('second'), ''.join(sorted(km[k])))); continue
            if p.get('conf') not in (1, 2, 3): bad.append('%s%s: %s conf %r' % (who, b, k, p.get('conf'))); continue
            seen.add(k)
            rows[who][k] = {'letter': L, 'option': km[k][L], 'secondLetter': S, 'second': km[k][S], 'conf': p['conf'], 'reason': p.get('reason')}
        miss = [k for k in idx[b] if k not in seen]
        if miss: bad.append('%s%s: %d missing: %s' % (who, b, len(miss), ', '.join(miss)))
print('pending batches:', ' '.join(pending) or 'none')
for x in bad: print('BAD', x)
for who in 'AB':
    with open(os.path.join(D, 'picks-%s.jsonl' % who), 'w') as o:
        for k in samp:
            if k in rows[who]: o.write(json.dumps({'key': k, **rows[who][k]}) + '\n')
both = [k for k in samp if k in rows['A'] and k in rows['B']]
def frac(a, b): return '%d/%d (%.3f)' % (a, b, a / b) if b else '0/0'
out = {'decisions': len(samp), 'A': len(rows['A']), 'B': len(rows['B']), 'both': len(both), 'bad': bad, 'pending': pending}
agree = [k for k in both if rows['A'][k]['option'] == rows['B'][k]['option']]
print('judged by both:', len(both), ' A/B agree:', frac(len(agree), len(both)))
for who in 'AB':
    print('judge', who, 'picks Forge option:', frac(sum(rows[who][k]['option'] == 0 for k in rows[who]), len(rows[who])),
          ' conf', dict(sorted(collections.Counter(rows[who][k]['conf'] for k in rows[who]).items())))
print('both pick Forge:', frac(sum(rows['A'][k]['option'] == 0 for k in agree), len(both)),
      ' both pick the same non-Forge:', frac(sum(rows['A'][k]['option'] != 0 for k in agree), len(both)))
by = collections.defaultdict(lambda: [0, 0, 0, 0])
for k in both:
    r = by[samp[k]['kind']]; r[0] += 1
    a = rows['A'][k]['option'] == rows['B'][k]['option']; r[1] += a
    r[2] += a and rows['A'][k]['option'] == 0; r[3] += a and rows['A'][k]['option'] != 0
for kind in 'pab':
    r = by[kind]; print(' kind', kind, 'n', r[0], 'agree', frac(r[1], r[0]), 'both Forge', r[2], 'both same non-Forge', r[3])
out['byKind'] = {k: by[k] for k in by}; out['agree'] = len(agree)
with open(os.path.join(D, 'picks.jsonl'), 'w') as o:
    for k in both:
        a, b = rows['A'][k], rows['B'][k]
        o.write(json.dumps({'key': k, 'kind': samp[k]['kind'], 'k': samp[k]['k'], 'status': samp[k]['status'], 'tokens': samp[k]['tokens'],
                            'A': a, 'B': b, 'agree': a['option'] == b['option'],
                            'label': a['option'] if a['option'] == b['option'] else None}) + '\n')
json.dump(out, open(os.path.join(D, 'merge.json'), 'w'), indent=1)
sys.exit(1 if bad else 0)

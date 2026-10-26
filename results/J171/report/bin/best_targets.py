#!/usr/bin/env python3
# J171 read: does each labelled decision's option target a card when it is forced?  Read only.
# For every label row (labels.jsonl), every option o: up to N random-map branch logs of the viewing seat, the first `cast`
# event of the option's card (cast:/activate:<id>) in that log; "card" when the text after " - " names a card id other than its own (approximate: a target the engine wrote into the text).
# Usage: best_targets.py LABELS.jsonl OUT.json [N]
import gzip, json, re, sys, os, collections
lab, out = sys.argv[1], sys.argv[2]; N = int(sys.argv[3]) if len(sys.argv) > 3 else 10
TOK = re.compile(r'^(cast|activate):(\d+)')
CARDT = None
IDS = re.compile(r'\((\d+)\)')
def classify(path, cid):
    try:
        with gzip.open(path, 'rt') as f:
            for line in f:
                if '"cast"' not in line: continue
                o = json.loads(line)
                if o.get('type') != 'state': continue
                for e in o['body'].get('events') or []:
                    if e.get('kind') == 'cast' and e.get('cardId') == cid:
                        t = e.get('text') or ''
                        body = t.split(' - ', 1)[1] if ' - ' in t else t
                        other = [int(x) for x in IDS.findall(body) if int(x) != cid]
                        return 'card' if other else ('player' if 'Targeting:' in t else 'none')
        return 'nocast'
    except (OSError, EOFError):
        return 'unreadable'
rows = [json.loads(l) for l in open(lab)]
res = []
for r in rows:
    if r.get('screened') or not r.get('complete'): continue
    pat = r['branchFrames']
    opts = []
    for o in r['options']:
        m = TOK.match(o['token']); c = collections.Counter()
        if m:
            cid = int(m.group(2))
            for i in range(N):
                p = pat.replace('{random|forge}', 'random').replace('{o}', str(o['o'])).replace('{i}', str(i))
                if os.path.exists(p): c[classify(p, cid)] += 1
        n = sum(c.values()); share = c['card'] / n if n else 0.0
        opts.append({'o': o['o'], 'token': o['token'], 'label': o.get('label'), 'counts': dict(c), 'cardShare': share, 'cardTargeting': n > 0 and share >= 0.5})
    best = r['bestRandom']
    bo = next(x for x in opts if x['o'] == best)
    res.append({'spine': r['spine'], 'd': r['d'], 'kind': r['kind'], 'k': r['k'], 'confident': r['confident'], 'bestRandom': best, 'forgeOption': r.get('forgeOption', 0),
                'bestCardTargeting': bo['cardTargeting'], 'anyCardTargeting': any(x['cardTargeting'] for x in opts),
                'nCardTargetingOptions': sum(x['cardTargeting'] for x in opts), 'options': opts})
def summ(sel):
    return {'labels': len(sel), 'withCardTargetingOption': sum(x['anyCardTargeting'] for x in sel),
            'cardTargetingOptions': sum(x['nCardTargetingOptions'] for x in sel), 'options': sum(len(x['options']) for x in sel),
            'bestIsCardTargeting': sum(x['bestCardTargeting'] for x in sel),
            'bestIsCardTargetingWhereOffered': sum(x['bestCardTargeting'] for x in sel if x['anyCardTargeting'])}
s = {'labels': summ(res), 'confident': summ([x for x in res if x['confident']]),
     'bySpine': {sp: summ([x for x in res if x['spine'] == sp]) for sp in sorted({x['spine'] for x in res})}, 'N': N, 'source': lab}
json.dump({'summary': s, 'rows': res}, open(out, 'w'), indent=1)
print(json.dumps(s['labels']), json.dumps(s['confident']))

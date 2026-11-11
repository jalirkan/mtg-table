# J203's sample: the population of move-atlas v1 decisions J200's provenance rules admit, and a stratified draw of 160.
# usage: python3 -I sample.py <move-atlas-v1 dir> <out dir>
# Reads no option value: the population and the draw use only provenance (folder, seed, deck bytes, the night's
# baseline listing at d, the frame log and its alignment), the decision's kind and its option count.
# POPULATION: every row of labels.jsonl (the release already leaves out D509's 8 excluded units) such that
#   (1) its night spine folder is on disk under ~/code/lab/data/lab-<night>/<folder>;
#   (2) the folder's plan.json seed is the row's spineSeed;
#   (3) both deck files hash to the deckSha256 the folder's phaseB/schedule.jsonl header recorded (the night's decks);
#   (4) the folder's phaseB/baseline.json lists at d exactly the row's option tokens (in o order), kind and turn;
#   (5) k >= 2;
#   (6) the baseline frame log aligns: one seat-0 decision frame of that turn and kind with Forge's chosen token, whose
#       state frame matches the seat row's state vector on every field (llm-judge2's align.py, unchanged in logic).
#   NOT filtered by confident, complete, partial, screened, either map's values or any judge.
# DRAW: stratified by kind (p / a / b) in the population's proportion (largest remainder to 160), seed 203:
#   random.Random(203); per kind in order p, a, b: rng.sample(sorted keys of that kind, n_kind).
import json, gzip, os, sys, hashlib, collections, random

SEED, N = 538, 320
LAB = '~/code/lab/data'
KIND = {'p': 'priority', 'a': 'attack', 'b': 'block'}

def sha(f):
    with open(f, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()

def norm(t):
    if ':' in t and t.split(':')[0] in ('attack', 'block'):
        h, b = t.split(':', 1)
        return h + ':' + ','.join(sorted(b.split(',')))
    return t

def feats(state, seat):
    b = state['body']; me = [p for p in b['players'] if p['id'] == seat][0]; op = [p for p in b['players'] if p['id'] != seat][0]
    z = lambda p, n: p['zones'].get(n, {}).get('count', len(p['zones'].get(n, {}).get('cards', [])))
    lands = lambda p, untapped: sum(1 for c in p['zones']['battlefield'].get('cards', []) if not c.get('hidden') and 'Land' in (c.get('types') or '') and (not untapped or not c.get('tapped')))
    f = {'me.life': me['life'], 'opp.life': op['life'], 'me.hand': z(me, 'hand'), 'opp.hand': z(op, 'hand'), 'me.graveyard': z(me, 'graveyard'),
         'opp.graveyard': z(op, 'graveyard'), 'me.library': z(me, 'library'), 'stack.size': len(b.get('stack') or []),
         'me.lands': lands(me, False), 'opp.lands': lands(op, False), 'me.lands_untapped': lands(me, True)}
    f['phase.' + str(b['phase'])] = 1.0
    return f

def main(data, out):
    rows = [json.loads(l) for l in open(os.path.join(data, 'labels.jsonl'))]
    spine = {}
    framec, rowsc = {}, {}
    pop, bad = [], collections.Counter()
    align = {}
    for r in rows:
        key = '%s/%s/d%d' % (r['night'], r['spine'], r['d'])
        folder = r['frameLog'].split('/')[0]
        nd = os.path.join(LAB, 'lab-' + r['night'].lower(), folder)
        if folder not in spine:
            s = {'ok': False}
            try:
                pj = json.load(open(os.path.join(nd, 'plan.json')))
                head = json.loads(open(os.path.join(nd, 'phaseB', 'schedule.jsonl')).readline())
                s = {'ok': True, 'seed': pj['seed'], 'decks': all(sha(pj[d]) == head['deckSha256'][d] for d in ('deckA', 'deckB')),
                     'base': json.load(open(os.path.join(nd, 'phaseB', 'baseline.json')))}
            except (OSError, ValueError, KeyError):
                pass
            spine[folder] = s
        s = spine[folder]
        if not s['ok']:
            bad['spine folder unreadable'] += 1; continue
        if s['seed'] != r['spineSeed']:
            bad['seed'] += 1; continue
        if not s['decks']:
            bad['deck bytes'] += 1; continue
        lst = s['base']['decisions']
        y = lst[r['d']] if r['d'] < len(lst) else {}
        toks = [o['token'] for o in sorted(r['options'], key=lambda o: o['o'])]
        if y.get('tokens') != toks or y.get('kind') != r['kind'] or y.get('turn') != r['turn']:
            bad['listing at d'] += 1; continue
        if r['k'] < 2 or len(toks) < 2:
            bad['k < 2'] += 1; continue
        # (6) alignment, as llm-judge2/scripts/align.py
        fl = os.path.join(LAB, 'lab-' + r['night'].lower(), r['frameLog'])
        if not os.path.exists(fl):
            bad['no frame log'] += 1; continue
        if fl not in framec:
            framec.clear(); framec[fl] = [json.loads(l) for l in gzip.open(fl, 'rt')]
        frames = framec[fl]
        states = {f['seq']: f for f in frames if f.get('type') == 'state'}
        rf = os.path.join(LAB, 'lab-' + r['night'].lower(), r['rows']['file'])
        if rf not in rowsc:
            rowsc.clear(); rowsc[rf] = [json.loads(l) for l in open(rf)]
        rr = rowsc[rf]
        names = rr[0]['stateNames']
        player, seat = r['view']['player'], r['view']['seat']
        arows = [x for x in rr if x.get('type') == 'row' and x['seat'] == player]
        srow = arows[r['rows']['seatRow']]
        sv = {names[i]: v for i, v in srow['s']}
        tset = set(norm(t) for t in toks)
        ok_row = srow['turn'] == r['turn'] and srow['kind'] == r['kind'] and set(map(norm, srow['tokens'])) == tset and norm(srow['tokens'][srow['chosen']]) == norm(r['forgeToken'])
        decs = [f for f in frames if f.get('type') == 'decision' and f['body']['seat'] == seat and f['body']['kind'] == KIND[r['kind']] and f['body']['turn'] == r['turn']]
        cands = [f for f in decs if norm(f['body']['chosen']) == norm(r['forgeToken']) and tset <= set(map(norm, f['body']['options']))]
        fallback = False
        if not cands:
            cands = [f for f in decs if norm(f['body']['chosen']) == norm(r['forgeToken'])]; fallback = True
        scored = []
        for f in cands:
            st = states.get(f['body']['stateSeq'])
            if not st:
                continue
            fe = feats(st, seat)
            mism = [k for k, v in fe.items() if float(sv.get(k, 0.0)) != float(v)]
            scored.append((len(mism), f['seq'], f, mism))
        scored.sort(key=lambda x: (x[0], x[1]))
        if not ok_row:
            bad['seat row differs'] += 1; continue
        if not scored or scored[0][0] != 0:
            bad['no frame matches the state'] += 1; continue
        best = scored[0]
        ties = sum(1 for x in scored if x[0] == 0)
        f = best[2]
        align[key] = dict(frameLog=fl, decisionSeq=f['seq'], stateSeq=f['body']['stateSeq'], phase=f['body']['phase'], nCands=len(cands),
                          ties=ties, chosenOnlyMatch=fallback, landDropUsed=sv.get('me.land_drop_used', 0.0), manaAvailable=sv.get('me.mana_available', 0.0),
                          oppManaAvailable=sv.get('opp.mana_available', 0.0))
        pop.append({'key': key, 'night': r['night'], 'spine': r['spine'], 'folder': folder, 'd': r['d'], 'kind': r['kind'], 'turn': r['turn'],
                    'k': r['k'], 'seed': r['spineSeed'], 'tokens': toks, 'forgeOption': r['forgeOption'],
                    'status': 'confident' if r['confident'] else 'complete' if r['complete'] else 'partial' if r['partial'] else 'screened' if r['screened'] else 'other'})
    # the draw
    # llm-judge4 (the labels wave 1): the pool is the population less J203's 160 (judged, llm-judge3) and less the
    # 154 confident decisions (judged in round 2, llm-judge2); the draw is stratified by kind in the POOL's proportion.
    j203 = {json.loads(l)['key'] for l in open('<scratchpad>/llm-judge3/sample.jsonl')}
    r2 = {json.loads(l)['key'] for l in open('<scratchpad>/llm-judge2/picks.jsonl')}
    conf_keys = {x['key'] for x in pop if x['status'] == 'confident'}
    pool = [x for x in pop if x['key'] not in j203 and x['key'] not in r2]
    byk = collections.defaultdict(list)
    for x in pool:
        byk[x['kind']].append(x['key'])
    quota = {k: N * len(byk[k]) / len(pool) for k in 'pab'}
    n = {k: int(quota[k]) for k in 'pab'}
    for k in sorted('pab', key=lambda k: -(quota[k] - n[k]))[:N - sum(n.values())]:
        n[k] += 1
    rng = random.Random(SEED)
    drawn = []
    for k in 'pab':
        drawn += rng.sample(sorted(byk[k]), n[k])
    pk = {x['key']: x for x in pop}
    sample = [pk[k] for k in drawn]
    sample.sort(key=lambda x: (x['night'], x['spine'], x['d']))
    j200 = set()
    j200plan = '~/code/pc-results/results/J200/plan.jsonl'
    rec = {'seed': SEED, 'n': N, 'source': os.path.abspath(os.path.join(data, 'labels.jsonl')),
           'sourceSha256': sha(os.path.join(data, 'labels.jsonl')), 'rows': len(rows),
           'population': len(pop), 'excludedFromPopulation': dict(bad), 'populationByKind': {k: len(byk[k]) for k in 'pab'},
           'quota': n, 'populationByStatus': dict(collections.Counter(x['status'] for x in pop)),
           'sampleByStatus': dict(collections.Counter(x['status'] for x in sample)),
           'sampleByNight': dict(collections.Counter(x['night'] for x in sample)),
           'sampleSpines': len({(x['night'], x['folder']) for x in sample}),
           'sampleForgeOptionIsZero': sum(1 for x in sample if x['forgeOption'] == 0),
           'drawOrder': drawn, 'populationKeys': sorted(pk), 'pool': len(pool), 'poolByKind': {k: len(byk[k]) for k in 'pab'}, 'excludedJ203': len(j203), 'excludedRound2': len(r2), 'round2NotInPopulation': sorted(r2 - set(pk)), 'confidentNotInRound2': sorted(conf_keys - r2), 'wave2Keys': sorted(set(x['key'] for x in pool) - set(drawn))}
    os.makedirs(out, exist_ok=True)
    json.dump(rec, open(os.path.join(out, 'draw.json'), 'w'), indent=1)
    with open(os.path.join(out, 'sample.jsonl'), 'w') as f:
        for x in sample:
            f.write(json.dumps(x) + '\n')
    json.dump({x['key']: align[x['key']] for x in sample}, open(os.path.join(out, 'align.json'), 'w'), indent=0)
    print(json.dumps({k: v for k, v in rec.items() if k not in ('drawOrder', 'populationKeys', 'wave2Keys')}))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

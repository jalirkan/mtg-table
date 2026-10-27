"""Load every listed decision of every spine (three seats) into one table.

Writes work/listed.jsonl (one row per listed decision, branched or not) and work/rows/<seat>-<spine>.npz-ish json
with each branched decision's per-branch scores and ms (for the n-curve and screen re-scoring).
Read-only on the lab data.
"""
import json, glob, os, re, gzip, collections, sys

LAB = '/home/justin-a/code/lab/data'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')
SEATS = [  # (seat, night, lab folder, labels file or None)
    ('old', 'J166-J169', 'lab-j166', f'{LAB}/lab-j166/report/labels.jsonl'),
    ('D486', 'J171', 'lab-j170', f'{LAB}/lab-j170/report/labels.jsonl'),
    ('D488', 'J173', 'lab-j173', None),
]

def spine_dirs(lab):
    return sorted(d for d in glob.glob(f'{LAB}/{lab}/b-s??-*-2???') if re.search(r'/b-s\d\d-[a-z]+-\d{4}$', d))

def state_of(row, names_idx):
    s = dict((int(i), v) for i, v in row['s'])
    return {n: s.get(i, 0.0) for n, i in names_idx.items()}

WANT = ['me.life', 'opp.life', 'me.hand', 'opp.hand', 'me.lands', 'opp.lands', 'me.board.creatures', 'opp.board.creatures',
        'me.board.power', 'opp.board.power', 'me.board.planeswalkers', 'opp.board.planeswalkers', 'me.board.artifacts',
        'opp.board.artifacts', 'me.board.enchantments', 'opp.board.enchantments', 'my_turn', 'stack.size', 'combat.active']

def main():
    os.makedirs(f'{OUT}/rows', exist_ok=True)
    listed_out = open(f'{OUT}/listed.jsonl', 'w')
    summary = collections.Counter()
    for seat, night, lab, labfile in SEATS:
        labels = {}
        if labfile:
            for l in open(labfile):
                r = json.loads(l); labels[(r['spine'], r['d'])] = r
        for sd in spine_dirs(lab):
            name = os.path.basename(sd)
            m = re.match(r'b-(s\d\d)-([a-z]+)-(\d+)', name)
            spine, band, seed = m.group(1), m.group(2), int(m.group(3))
            af = f'{sd}/atlas.json'
            if not os.path.exists(af):
                summary[(seat, 'no-atlas')] += 1
                continue
            atlas = json.load(open(af))
            forge_map = atlas['plan']['branchForge'] > 0
            base = json.load(open(f'{sd}/phaseB/baseline.json'))
            # the viewer's rows -> state per listed decision
            rf = glob.glob(f'{sd}/phaseB/baseline/rows/rows-*.jsonl')
            rows = [json.loads(l) for l in open(rf[0])]
            names = rows[0]['stateNames']; idx = {n: names.index(n) for n in WANT}
            view = 'Drafter A'
            vrows = [r for r in rows if r.get('type') == 'row' and r['seat'] == view]
            # match the listing to the viewer's rows by tokens, in order
            states = {}
            j = 0
            for d in base['decisions']:
                while j < len(vrows) and vrows[j]['tokens'] != d['tokens']:
                    j += 1
                if j < len(vrows):
                    states[d['d']] = state_of(vrows[j], idx); j += 1
            summary[(seat, 'state-matched')] += len(states); summary[(seat, 'listed')] += len(base['decisions'])
            adec = {d['d']: d for d in atlas['phaseB']['decisions']}
            # branch rows
            br = collections.defaultdict(list)
            bf = f'{sd}/phaseB/branches.jsonl'
            for l in open(bf):
                r = json.loads(l)
                br[r['d']].append((r['c'], r['o'], r['i'], r.get('score'), r.get('ms', 0), bool(r.get('error')) or bool(r.get('unavailable')), bool(r.get('capped'))))
            sched = [json.loads(l) for l in open(f'{sd}/phaseB/schedule.jsonl')] if os.path.exists(f'{sd}/phaseB/schedule.jsonl') else []
            stops = collections.defaultdict(dict)
            for e in sched:
                if e.get('type') == 'stop':
                    for o in e['dropped']:
                        stops[e['d']][o] = e['at']
            for d in base['decisions']:
                dd = d['d']
                ids = d.get('identities') or d['tokens']
                rec = dict(seat=seat, night=night, lab=lab, spine=spine, band=band, seed=seed, d=dd, kind=d['kind'], turn=d['turn'],
                           kTokens=len(d['tokens']), kList=len(set(ids)), forgeMap=forge_map,
                           baseTurns=base['turns'], baseWinner=base['winner'], listedN=len(base['decisions']),
                           state=states.get(dd))
                a = adec.get(dd)
                lab_r = labels.get((spine, dd))
                if a:
                    rec.update(branched=True, k=a.get('k'), why=a.get('why'), screened=a.get('screened'), screenMean=a.get('screenMean'),
                               complete=a.get('complete'), settled=a.get('settled'), decided=a.get('decided'),
                               regret=a['random']['regret'], regretLo=a['random']['regretLo'], regretHi=a['random']['regretHi'],
                               best=a['random']['best'], forgeRegret=a.get('forge', {}).get('regret'), forgeRegretLo=a.get('forge', {}).get('regretLo'),
                               forgeBest=a.get('forge', {}).get('best'), sameBest=a.get('sameBest'), rho=a.get('rho'),
                               opts=[dict(o=o['o'], token=o['token'], rn=o['random']['n'], rmean=o['random']['mean'],
                                          fn=(o.get('forge') or {}).get('n'), fmean=(o.get('forge') or {}).get('mean'), stoppedAt=o.get('stoppedAt'))
                                     for o in a['options']])
                    conf = bool(a.get('complete')) and a['random']['regretLo'] is not None and a['random']['regretLo'] > 0
                    rec['confident'] = conf
                    rec['confidentForge'] = bool(a.get('complete')) and (a.get('forge') or {}).get('regretLo') not in (None,) and (a.get('forge') or {}).get('regretLo', 0) > 0
                    if lab_r is not None:
                        assert lab_r['confident'] == conf, (seat, spine, dd)
                        rec['biased'] = lab_r.get('biased'); rec['lostCastVoid'] = lab_r.get('lostCastVoid')
                        rec['labelK'] = lab_r['k']
                    # cost
                    rows_d = br.get(dd, [])
                    rec['msRandom'] = sum(x[4] for x in rows_d if x[0] == 'random')
                    rec['msForge'] = sum(x[4] for x in rows_d if x[0] == 'forge')
                    rec['nRandomGames'] = sum(1 for x in rows_d if x[0] == 'random')
                    rec['nForgeGames'] = sum(1 for x in rows_d if x[0] == 'forge')
                    rec['capped'] = sum(1 for x in rows_d if x[6])
                    rec['stops'] = stops.get(dd, {})
                    json.dump(dict(seat=seat, spine=spine, d=dd, k=len(d['tokens']), stops=stops.get(dd, {}),
                                   rows=[x[:6] for x in rows_d]), open(f'{OUT}/rows/{seat}-{spine}-d{dd}.json', 'w'))
                else:
                    rec.update(branched=False)
                listed_out.write(json.dumps(rec) + '\n')
                summary[(seat, 'branched' if a else 'unbranched')] += 1
    for k, v in sorted(summary.items()):
        print(k, v)

if __name__ == '__main__':
    main()

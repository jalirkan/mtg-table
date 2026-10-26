import json, glob, os
D = '/home/justin-a/code/lab/data/lab-j166'
lab = json.load(open(D + '/report/labels.json'))
cuts = json.load(open(D + '/report/cuts.json'))['bySpine']
wall = {}
for l in open(D + '/spine-times.txt'):
    f = l.split(); wall[f[0]] = wall.get(f[0], 0) + int(f[2]) - int(f[1])
out = {}
for sp in sorted(glob.glob(D + '/b-s??-*-21??')):
    name = os.path.basename(sp); s = name.split('-')[1]
    a = json.load(open(sp + '/atlas.json')); pb = a['phaseB']; sch = pb['schedule']
    b = json.load(open(sp + '/phaseB/baseline.json'))['decisions']
    rows = [json.loads(l) for l in open(sp + '/phaseB/branches.jsonl') if l.strip()]
    rr = [r for r in rows if r['c'] == 'random']
    k3 = sum(1 for x in b if len(set(x['identities'] if x.get('identities') else x['tokens'])) >= 3)
    k3tok = sum(1 for x in b if len(x['tokens']) >= 3)
    br = pb['decisions']
    m = lab['bySpine'][s]
    o = {
        'band': name.split('-')[2], 'branchedBy': 'J166 325c2dd8' if s in ('s01', 's02', 's03') else 'J167 bf978690' if s == 's04' else 'J168 26a8db00',
        'listing': m['listing'], 'forgeMap': m['forgeMap'], 'decksAB': [os.path.basename(a['plan']['deckA']), os.path.basename(a['plan']['deckB'])],
        'baselineTurns': pb['baseline']['turns'], 'baselineWinner': pb['baseline']['winner'],
        'listed': len(b), 'listedK3': k3, 'listedK3tokens': k3tok, 'listedPerTurn': round(len(b) / pb['baseline']['turns'], 2),
        'branched': len(br), 'inFull': sch['branchedInFull'], 'screened': len(sch.get('screened') or []), 'fill': sch.get('fill'), 'stoppedOptions': sch.get('stoppedOptions'),
        'options': sum(len(x['options']) for x in br), 'optionsInFull': sum(len(x['options']) for x in br if not x.get('screened')),
        'optionsPerFull': round(sum(len(x['options']) for x in br if not x.get('screened')) / max(1, sch['branchedInFull']), 2),
        'branchGames': len(rows), 'forgeGames': sum(1 for r in rows if r['c'] == 'forge'),
        'labels': m['labels'], 'confident': m['confident'], 'confidentForge': m['confidentForge'],
        'engineErrors': sum(1 for r in rows if r.get('engineError')), 'errors': sum(1 for r in rows if r.get('error')),
        'timeouts': sum(1 for r in rows if r.get('timedOut')), 'unavailable': sum(1 for r in rows if r.get('unavailable')),
        'capped': sum(1 for r in rows if r.get('capped')), 'cappedShare': round(sum(1 for r in rows if r.get('capped')) / len(rows), 4),
        'restarted': sum(1 for r in rows if (r.get('restarts') or 0) > 0),
        'effectSourceNull': sum(1 for r in rows if (r.get('effectSourceNull') or 0) > 0), 'exileLinksLost': sum(1 for r in rows if (r.get('exileLinksLost') or 0) > 0),
        'chooseSourceGuardRows': sum(1 for r in rows if (r.get('chooseSourceGuard') or 0) > 0), 'chooseSourceGuardSum': sum(r.get('chooseSourceGuard') or 0 for r in rows),
        'meanBranchTurns': round(sum(r['turns'] for r in rr if r.get('turns') is not None) / max(1, sum(1 for r in rr if r.get('turns') is not None)), 1),
        'meanRandomBranchSec': round(sum(r['ms'] for r in rr) / len(rr) / 1000, 2),
        'wallSec': wall.get(name), 'phaseBSec': cuts[name]['phaseBWallSec'], 'checksSec': cuts[name]['checksSec'],
        'branchGamesPerHourWall': round(len(rows) / (wall.get(name) / 3600)), 'gapMedian': m['gapMedian'], 'regretMean': m['regretMean'],
        'kindsInFull': {k: v['labels'] for k, v in m['byKind'].items()}, 'confidentByKind': {k: v['confident'] for k, v in m['byKind'].items()},
        'savedShare': cuts[name]['savedShare'], 'earlyStopShare': cuts[name]['earlyStopShare'], 'screenShare': cuts[name]['screenShare'], 'idleShare': cuts[name]['idleShare'],
        'exit': None,
    }
    out[s] = o
for l in open(D + '/exits.txt'):
    f = l.split(); s = f[0].split('-')[1]
    if s in out: out[s]['exit'] = int(f[1])
print(json.dumps(out, indent=1))

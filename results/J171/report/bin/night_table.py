#!/usr/bin/env python3
# J171 read: the per-spine night table from lab-j170/report (tool.json, labels.json, cuts.json, compare-j168.json), the
# baselines and spine-times.txt.  Read only.  Usage: night_table.py LAB_DIR > night.md
import json, sys, os
D = sys.argv[1]; R = os.path.join(D, 'report')
t = json.load(open(f'{R}/tool.json'))['bySpine']; L = json.load(open(f'{R}/labels.json')); cu = json.load(open(f'{R}/cuts.json'))['bySpine']
cm = json.load(open(f'{R}/compare-j168.json'))['bySpine']
times = {l.split()[0]: int(l.split()[2]) - int(l.split()[1]) for l in open(f'{D}/spine-times.txt')}
print('| spine | listed | k>=3 listed | picked | branched | screened | stopped | opts/full | rows | labels | conf | /night [Poisson] | errored | capped | wall min (J168) |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for k, v in t.items():
    s = k.split('-')[1]; b = json.load(open(f'{D}/{k}/phaseB/baseline.json')); a = json.load(open(f'{D}/{k}/atlas.json'))['phaseB']['schedule']
    k3 = sum(1 for d in b['decisions'] if len(d['tokens']) >= 3); l = L['bySpine'][s]; z = L['c_sizing7']['bySpine'][s]
    print(f"| {s} | {v['listed']} | {k3} | {a['picked']} | {v['branchedInFull']} | {v['screened']} | {v['stoppedOptions']} | {v['meanOptions']} | {v['rows']:,} | {l['labels']} | {l['confident']} | {z['confidentPer7Worker10hNight']} [{z['confidentPer7Poisson95'][0]}, {z['confidentPer7Poisson95'][1]}] | {v['errored']} | {v['capped']} ({v['capped']/v['rows']:.1%}) | {times[k]/60:.1f} ({cm[s]['j168']['wallSec']/60:.1f}) |")
print()
print('| spine | csGuard rows (n) | retargeted rows (seats) | modesDrawn rows | MODES_DRAWN recs | cardTargetOffered / prio listings (share) | target recs incomplete | lost casts (branches, forced): cards | null-chosen logs |')
print('|---|---|---|---|---|---|---|---|---|')
for k, v in t.items():
    s = k.split('-')[1]
    nul = sum(1 for _ in open(os.path.join(os.path.dirname(__file__), '..', 'null-chosen', f'null-{k}.txt')))
    print(f"| {s} | {v['chooseSourceGuardRows']} ({v['chooseSourceGuard']}) | {v['retargetedRows']} ({v['retargeted']}) | {v['modesDrawnRows']} | {v['modesDrawnRecords']} | {v['cardTargetOffered']:,} / {v['randomisedPriority']:,} ({v['cardTargetShare']:.1%}) | {v['targetRecords']-v['targetRecordsComplete']:,} of {v['targetRecords']:,} | {v['lostCasts']} ({v['lostCastBranches']}, {v['lostCastForced']}): {', '.join(f'{n} {c}' for n, c in v['lostCastCards'].items()) or '-'} | {nul} |")
print()
print('| spine | J168 -> J171: listed/turn | opts/full | labels | conf | conf share | regret | capped | games |')
print('|---|---|---|---|---|---|---|---|---|')
for s, v in cm.items():
    a, b = v['j168'], v['j171']
    print('| ' + s + ' | ' + ' | '.join(f"{a[x]} -> {b[x]}" for x in ['listedPerTurn', 'optionsPerFull', 'labels', 'confident', 'confidentShare', 'regretMean', 'cappedShare', 'branchGames']) + ' |')

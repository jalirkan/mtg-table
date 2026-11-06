#!/usr/bin/env python3
# mtg-table — tools/atlas: the atlas night's pilot read: the smoke spine and the atlas-selftest legs.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The pilot's read of its smoke spine and of the atlas-selftest's G5, G6 and cut-design legs, as one JSON object
for the runner's pilot checks.

    ATLAS_DATA=<night data folder> python3 -I tools/atlas/pilot.py

READS $ATLAS_DATA/pilot-smoke-j193/ (atlas.json, plan.json, phaseB/), $ATLAS_LOCAL/pilot-labels.json and
$ATLAS_LOCAL/lost-smoke/ (ATLAS_LOCAL defaults to var/lab-j193-local) and var/cubelab/atlas-selftest/*/atlas.json;
WRITES one JSON object to stdout. Standard library only; no engine. Run from the repository root.

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the two folders, which were
paths on the lab machine and are now $ATLAS_DATA and $ATLAS_LOCAL. The comment block below is the job's.
"""
# J193 pilot: J177's pilot.py with J193's paths and scan stamp, unchanged otherwise.
# J177 pilot: J173's pilot.py with J177's paths and D489: the smoke runs with the futility stop on, so its plan must carry
# cuts.futility {at 0, tie 0, sample 0.25} and its schedule D489's four counters (futileStopped >= 0), `partialLabels` must equal the
# partial decisions, and its units are planned per decision (a partial one: ceil(stoppedAt / chunk)); the smoke's `labels` + `partial`
# are its two decisions; and the self-test's `cuts-futile` leg is read beside `cuts` (a control there, a stop here).
# J173's: J171's pilot.py with J173's paths (the smoke in its own folder, its decks the pilot's own draw) and the smoke's
# frame scan read with J173's scan (refused-cast options, D486-D488's counters, D487's null and legacy records). J171's (J170's, J169's):
# the smoke (J166's powered pair, deck seed 2099, game seed 2199, every cut on, a new folder) and the atlas-selftest's G5, G6 and cuts
# legs, as one JSON object; the smoke's D483 listing read (an identity beside every token, no play twice).
# Standard library only; no engine. Run from the clone (the self-test's folder is var/cubelab/atlas-selftest).
import json, math, os, sys
S = (os.environ.get('ATLAS_DATA') or sys.exit('pilot.py: name the night\'s data folder in ATLAS_DATA')) + '/pilot-smoke-j193'
L = os.environ.get('ATLAS_LOCAL', 'var/lab-j193-local')
out = {'smoke': {'problems': -1}, 'g5': {'refusedCast': -1}, 'g6': {'zeroXLeftOut': -1}, 'cuts': {'problems': -1}, 'cutsNoforge': {'problems': -1}, 'cutsFutile': {'problems': -1}}


def units_ok(d):
    ok = set()
    for line in open(os.path.join(d, 'phaseB', 'units.jsonl')):
        try:
            u = json.loads(line)
        except ValueError:
            continue
        if u.get('ok'):
            ok.add(u['id'])
    return len(ok)


try:
    d = json.load(open(S + '/atlas.json'))
    c, g, b = d['checks'], d['checks']['guardrails'], d['phaseB']
    s, p = b['schedule'], d['plan']
    rows = [json.loads(l) for l in open(S + '/phaseB/branches.jsonl') if l.strip()]
    lb = json.load(open(L + '/pilot-labels.json'))
    ls = json.load(open(S + '/phaseB/baseline.json'))['decisions']
    per = math.ceil(p['branchRandom'] / p['chunk']) + math.ceil(p['branchForge'] / p['chunk'])
    scr = math.ceil(p['cuts']['screen'] / p['chunk'])
    planned = sum(scr if x.get('screened') else math.ceil(x['stoppedAt'] / p['chunk']) if x.get('partial') else per for x in b['decisions'])
    fu = (p.get('cuts') or {}).get('futility')
    out['smoke'] = {'problems': len(c['problems']), 'warnings': len(c.get('warnings') or []), 'decisions': len(b['decisions']),
                    'branchedInFull': s['branchedInFull'], 'branched': sum(1 for x in b['decisions'] if not x.get('screened')),
                    'screened': len(s['screened']), 'stoppedOptions': s['stoppedOptions'],
                    'unitsPlanned': planned, 'unitsOk': units_ok(S),
                    'futilityPlan': 1 if fu == {'at': 0, 'tie': 0, 'sample': 0.25} else 0,
                    'futileStopped': s['futileStopped'] if isinstance(s.get('futileStopped'), int) else -1,
                    'futileControls': s['futileControls'] if isinstance(s.get('futileControls'), int) else -1,
                    'futileBranchGamesSaved': s['futileBranchGamesSaved'] if isinstance(s.get('futileBranchGamesSaved'), int) else -1,
                    'partialLabelsKey': s['partialLabels'] if isinstance(s.get('partialLabels'), int) else -1,
                    'futilityReads': len(s['futility']) if isinstance(s.get('futility'), list) else -1,
                    'partialDecisions': sum(1 for x in b['decisions'] if x.get('partial')), 'partial': lb['partialLabels'], 'confidentPartial': lb['confidentPartial'],
                    'cuts': 1 if p.get('cuts', {}).get('decision') == 'D480' and p['cuts']['minOptions'] == 3 else 0,
                    'g6': 1 if all(k in g for k in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0, 'zeroX': g.get('zeroX', -1),
                    'd479': 1 if isinstance(b.get('effectSourceNull'), dict) and isinstance(b.get('exileLinksLost'), dict) and 'branchRestarted' in b else 0,
                    'guardViolations': g['violations'], 'branchTimeoutSec': p['branchTimeoutSec'],
                    'branches': len(rows), 'timeouts': sum(1 for r in rows if r.get('timedOut')),
                    'unavailable': sum(1 for r in rows if r.get('unavailable')), 'errored': sum(1 for r in rows if r.get('error')),
                    'trimmedRows': sum(1 for r in rows if (r.get('targetCountTrimmed') or 0) > 0), 'avoidedRows': sum(1 for r in rows if (r.get('costTargetAvoided') or 0) > 0),
                    'labels': lb['labels'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                    'trainingRows': lb['trainingRows'], 'branchedRows': lb['branched'],
                    'listed': len(ls), 'identities': 1 if ls and all(len(x.get('identities') or []) == len(x['tokens']) for x in ls) else 0,
                    'repeatedPlays': sum(1 for x in ls if len(set(x.get('identities') or [])) < len(x.get('identities') or []))}
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    c = json.load(open(L + '/lost-smoke/pilot-smoke-j193.json'))
    out['smoke']['scan'] = {'scanned': 1 if c.get('atlasMtime') == int(os.path.getmtime(S + '/atlas.json')) and c.get('scan') == 'J193 v5' else 0, 'logs': c['logs'],
                            'lostCastOptions': len(c['lostCastOptions']), 'refusedCastOptions': len(c['refusedCastOptions']), 'lostCasts': c['lostCasts'],
                            **{k: c.get(k, 0) for k in ('casts', 'refusedCast', 'castsRefused', 'lostPutBack', 'lostStranded', 'cardTargetOffered', 'randomisedPriority',
                                                         'modesDrawn', 'retargeted', 'targetCountTrimmed', 'costTargetAvoided', 'modesDrawnRecords', 'modesSourceRecords',
                                                         'targetRecords', 'targetRecordsCard', 'targetRecordsCardComplete', 'targetNoneChosen', 'targetNoneListed',
                                                         'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets')},
                            'refusedCastShare': c.get('refusedCastShare')}
except (OSError, ValueError, KeyError, TypeError):
    out['smoke']['scan'] = {'scanned': 0, 'lostCastOptions': -1, 'refusedCastOptions': -1, 'legacyNullTargets': -1, 'nullChosenTargets': -1}
for leg in ('g5', 'g6'):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        g = d['checks']['guardrails']
        out[leg] = {'problems': len(d['checks']['problems']), 'refusedCast': g.get('refusedCast', 0), 'noRepeatRefused': g.get('noRepeatRefused', 0),
                    'xDrawn': g.get('xDrawn', 0), 'zeroXLeftOut': g.get('zeroXLeftOut', 0), 'zeroX': g.get('zeroX', -1)}
    except (OSError, ValueError, KeyError, TypeError):
        pass
for key, leg in (('cuts', 'cuts'), ('cutsNoforge', 'cuts-noforge'), ('cutsFutile', 'cuts-futile')):
    try:
        d = json.load(open('var/cubelab/atlas-selftest/%s/atlas.json' % leg))
        sc = d['phaseB']['schedule']
        out[key] = {'problems': len(d['checks']['problems']), 'schedule': 1 if d['phaseB'].get('schedule') else 0,
                    'forgeMap': 0 if d['phaseB'].get('forgeMap') is False else 1, 'labels': sc['labels'],
                    'futileStopped': sc.get('futileStopped', -1), 'futileControls': sc.get('futileControls', -1),
                    'partial': sum(1 for x in d['phaseB']['decisions'] if x.get('partial')),
                    'control': sum(1 for x in d['phaseB']['decisions'] if x.get('futilityControl'))}
    except (OSError, ValueError, KeyError, TypeError):
        pass
print(json.dumps(out))

#!/usr/bin/env python3
# mtg-table — tools/atlas: a night's atlas numbers beside another night's, spine by spine at the same position.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""One night's atlas numbers beside another night's at the same spine position (s01 beside s01, ...), and the
self-comparison that proves the readers on J171's night.

    python3 -I tools/atlas/compare.py THIS_DIR THIS_LABELS_JSON [BEFORE_DIR BEFORE_LABELS_JSON] [--only=s01,s07,...]

READS, in each night folder, the spine folders matching b-s??-*-[23]??? (atlas.json, phaseB/baseline.json,
phaseB/branches.jsonl), the folder's spine-times.txt, and the labels.json labels.py printed for that night.
WRITES one JSON object to stdout (`this`, `before`, `selfMatch`, `selfMatchNight`). Standard library only; no engine.

Moved into the repository from the lab's J193 job file, byte for byte (D515); the comment block below is the job's.
"""
# J193 (drafts/J193-atlas-4b-night-fifteen.md): each spine's numbers beside J191's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J193 data. DIFFERENT DECKS (J191: deck seeds 2901-2913, game seeds 3001-3013; J193: 3685-3697, 3785-3797; the same band at
# each position), THE SAME SEAT (D488's policy, D498's redeal, D500's damage history, D508's gate: frozen since J186's pin, D509; D510
# and D511 changed the record and the replay, not the seat, before J188's pin, which is J190's and J191's too; D513 the checker only,
# before J193's) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions): J191 and J193 are D508's
# population's fifth and sixth nights. A difference is a candidate, never a verdict, and no position is a pair (the decks differ
# everywhere). J177's compare.py, unchanged but for its note: `this` is J193, `before` J191, read from lab-j191 at the Report (read
# only), its report/labels.json written by J191's own Report. Its spine glob is J191's `b-s??-*-[23]???`: compare.py runs on THREE folder
# families -- the pilot's self-comparison on J171's night in lab-j170 (2101-2113), J191's in lab-j191 (3001-3013) and J193's own -- and J192,
# which narrowed it to `b-s??-*-3???`, failed at its pilot on the first (derive-j193.py now runs that self-comparison before posting).
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J177 data. DIFFERENT DECKS (J173: deck seeds 2014-2026, game seeds 2114-2126; J177: 2040-2052, 2140-2152; the same band at
# each position), THE SAME SEAT (D488's, unchanged) and ANOTHER BRANCHING DESIGN (J173: 200 random branches, 8 decisions; J177: 150,
# the futility stop, 10 decisions): a difference is a candidate, never a verdict, and no position is a pair. J173's compare.py (J171's,
# J170's, on J168's definitions) made symmetric: BOTH columns are computed from their folders and labels.json by the same code, so
# J173's column is read from lab-j173 at the Report (read only) and is null where J173 left nothing.
# Definitions, per spine and for the night (J168's, plus J177's last five):
#   listedPerTurn    decisions listed (phaseB/baseline.json) / the baseline game's turns     (the night: sum / sum)
#   optionsPerFull   options of the decisions branched (not screened) / those decisions     (sum / sum)
#   labels, confident, confidentShare   labels.json's bySpine (confidentShare = confident / labels)   (sum, sum, sum / sum)
#   regretMean       labels.json's bySpine regretMean; the night: labels.json's b_regretMean point (pooled over every label)
#   cappedShare      branch rows ended at the turn cap / branch rows     (sum / sum)
#   branchGames      branch rows; wallSec: the spine's spine-times.txt lines summed
#   decisionsBranched   the decisions not screened (complete, or futile-stopped and partial); partial: those with `partial: true`
#   branchedInFullRows  the complete decisions whose option 0 has the plan's branchRandom random rows (computed here)
#   workerHours, confidentPerWorkerHour   the walls times their workers (spine-times.txt's fourth field); confident / workerHours:
#                    THE yield to compare (the confident share is not: D489's stopped decisions leave its denominator)
#   compare.py THIS_DIR THIS_LABELS_JSON [BEFORE_DIR BEFORE_LABELS_JSON] [--only=s01,s07,...]   prints one JSON object: `this` (J177),
#   `before` (J173). The pilot's self-test runs it with lab-j170 (J171's own folders) and J171's labels as labels.py gives them as THIS,
#   and requires J171's registered values (J173's compare.py) back (`selfMatch` 13).
# Standard library only; no engine.
import glob, json, os, sys
# J171's per-spine numbers (results/J172/compare-j168.json, column j171), registered in J173's compare.py: the self-test's want only;
# `by` says what each position held
J171 = {
    's01': {'by': 'J171 f2b4e9c2, pauper 2001/2101', 'listedPerTurn': 0.72, 'optionsPerFull': 3.25, 'labels': 8, 'confident': 2, 'regretMean': 0.0275, 'cappedShare': 0.2837, 'wallSec': 2808, 'branchGames': 5720},
    's02': {'by': 'J171 f2b4e9c2, peasant 2002/2102', 'listedPerTurn': 0.5, 'optionsPerFull': 2.0, 'labels': 5, 'confident': 1, 'regretMean': 0.043, 'cappedShare': 0.1017, 'wallSec': 1946, 'branchGames': 2075},
    's03': {'by': 'J171 f2b4e9c2, legacy 2003/2103', 'listedPerTurn': 0.79, 'optionsPerFull': 3.12, 'labels': 8, 'confident': 2, 'regretMean': 0.0481, 'cappedShare': 0.0389, 'wallSec': 2282, 'branchGames': 4550},
    's04': {'by': 'J171 f2b4e9c2, powered 2004/2104', 'listedPerTurn': 1.06, 'optionsPerFull': 3.38, 'labels': 8, 'confident': 1, 'regretMean': 0.025, 'cappedShare': 0.0005, 'wallSec': 4782, 'branchGames': 5775},
    's05': {'by': 'J171 f2b4e9c2, pauper 2005/2105', 'listedPerTurn': 0.86, 'optionsPerFull': 4.62, 'labels': 8, 'confident': 2, 'regretMean': 0.0225, 'cappedShare': 0.0563, 'wallSec': 3684, 'branchGames': 6325},
    's06': {'by': 'J171 f2b4e9c2, peasant 2006/2106', 'listedPerTurn': 1.05, 'optionsPerFull': 5.88, 'labels': 8, 'confident': 4, 'regretMean': 0.0819, 'cappedShare': 0.0, 'wallSec': 4367, 'branchGames': 6525},
    's07': {'by': 'J171 f2b4e9c2, legacy 2007/2107', 'listedPerTurn': 1.14, 'optionsPerFull': 3.75, 'labels': 8, 'confident': 1, 'regretMean': 0.015, 'cappedShare': 0.0008, 'wallSec': 1269, 'branchGames': 5110},
    's08': {'by': 'J171 f2b4e9c2, powered 2008/2108', 'listedPerTurn': 1.85, 'optionsPerFull': 5.0, 'labels': 8, 'confident': 4, 'regretMean': 0.0713, 'cappedShare': 0.0, 'wallSec': 3984, 'branchGames': 6750},
    's09': {'by': 'J171 f2b4e9c2, pauper 2009/2109', 'listedPerTurn': 1.17, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 1, 'regretMean': 0.0381, 'cappedShare': 0.0533, 'wallSec': 3242, 'branchGames': 6075},
    's10': {'by': 'J171 f2b4e9c2, peasant 2010/2110', 'listedPerTurn': 1.7, 'optionsPerFull': 4.75, 'labels': 8, 'confident': 3, 'regretMean': 0.0503, 'cappedShare': 0.0122, 'wallSec': 3495, 'branchGames': 6500},
    's11': {'by': 'J171 f2b4e9c2, legacy 2011/2111', 'listedPerTurn': 1.22, 'optionsPerFull': 4.38, 'labels': 8, 'confident': 4, 'regretMean': 0.0528, 'cappedShare': 0.0056, 'wallSec': 4484, 'branchGames': 6450},
    's12': {'by': 'J171 f2b4e9c2, powered 2012/2112', 'listedPerTurn': 1.17, 'optionsPerFull': 3.0, 'labels': 8, 'confident': 2, 'regretMean': 0.0652, 'cappedShare': 0.0011, 'wallSec': 2317, 'branchGames': 3650},
    's13': {'by': 'J171 f2b4e9c2, pauper 2013/2113', 'listedPerTurn': 1.1, 'optionsPerFull': 4.25, 'labels': 8, 'confident': 1, 'regretMean': 0.0334, 'cappedShare': 0.0328, 'wallSec': 1993, 'branchGames': 6435},
}
# J171's night (results/J172/compare-j168.json, night.j171): 101 labels and 28 confident, 11 h 18 of walls at 6 workers, 71,940 rows
J171_NIGHT = {'listedPerTurn': 1.09, 'optionsPerFull': 4.03, 'labels': 101, 'confident': 28, 'confidentShare': 0.2772, 'regretMean': 0.0442,
              'cappedShare': 0.0421, 'wallSec': 40653, 'branchGames': 71940}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
only = set(x for x in opt.get('only', '').split(',') if x)


def side(D, LJ):
    """one night's columns from its folder and labels.json: ({position: values}, night); empty when the labels are absent"""
    try:
        lab = json.load(open(LJ))
    except (OSError, ValueError):
        return {}, None
    wall, wk = {}, {}
    if os.path.exists(D + '/spine-times.txt'):
        for line in open(D + '/spine-times.txt'):
            f = line.split()
            if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
                wall[f[0]] = wall.get(f[0], 0) + int(f[2]) - int(f[1])
                if len(f) > 3 and f[3].isdigit():
                    wk[f[0]] = wk.get(f[0], 0) + (int(f[2]) - int(f[1])) * int(f[3])
    by = {}
    tot = {'listed': 0, 'turns': 0, 'options': 0, 'branched': 0, 'labels': 0, 'confident': 0, 'capped': 0, 'rows': 0, 'wallSec': 0, 'workerSec': 0,
           'partial': 0, 'fullRows': 0}
    for sp in sorted(glob.glob(D + '/b-s??-*-[23]???')):   # three families: J193's 3785-3797, J191's 3001-3013, J171's self-check 2101-2113 (lab-j170)
        name = os.path.basename(sp)
        s = name.split('-')[1]
        if only and s not in only:
            continue
        try:
            a = json.load(open(sp + '/atlas.json'))
            pb = a['phaseB']
            b = json.load(open(sp + '/phaseB/baseline.json'))['decisions']
            rows = [json.loads(x) for x in open(sp + '/phaseB/branches.jsonl') if x.strip()]
            m = lab['bySpine'][s]
        except (OSError, ValueError, KeyError, TypeError):
            continue
        R = a['plan']['branchRandom']
        br = [x for x in pb['decisions'] if not x.get('screened')]
        o0 = {}
        for r in rows:
            if r['c'] == 'random' and r['o'] == 0:
                o0[r['d']] = o0.get(r['d'], 0) + 1
        capped = sum(1 for r in rows if r.get('capped'))
        part = sum(1 for x in br if x.get('partial'))
        fullr = sum(1 for x in br if x.get('complete') and o0.get(x['d'], 0) >= R)
        ws = wk.get(name)
        v = {'folder': name, 'branchRandom': R, 'listedPerTurn': round(len(b) / pb['baseline']['turns'], 2), 'optionsPerFull': round(sum(len(x['options']) for x in br) / max(1, len(br)), 2),
             'decisionsBranched': len(br), 'partial': part, 'branchedInFullRows': fullr,
             'labels': m['labels'], 'confident': m['confident'], 'confidentShare': round(m['confident'] / m['labels'], 4) if m['labels'] else None,
             'regretMean': m['regretMean'], 'cappedShare': round(capped / len(rows), 4) if rows else None, 'wallSec': wall.get(name), 'branchGames': len(rows),
             'workerHours': round(ws / 3600, 2) if ws else None, 'confidentPerWorkerHour': round(m['confident'] / (ws / 3600), 4) if ws else None}
        by[s] = v
        tot['listed'] += len(b)
        tot['turns'] += pb['baseline']['turns']
        tot['options'] += sum(len(x['options']) for x in br)
        tot['branched'] += len(br)
        tot['labels'] += m['labels']
        tot['confident'] += m['confident']
        tot['capped'] += capped
        tot['rows'] += len(rows)
        tot['wallSec'] += wall.get(name) or 0
        tot['workerSec'] += ws or 0
        tot['partial'] += part
        tot['fullRows'] += fullr
    night = {'spines': len(by), 'listedPerTurn': round(tot['listed'] / tot['turns'], 2) if tot['turns'] else None,
             'optionsPerFull': round(tot['options'] / tot['branched'], 2) if tot['branched'] else None, 'labels': tot['labels'],
             'confident': tot['confident'], 'confidentShare': round(tot['confident'] / tot['labels'], 4) if tot['labels'] else None,
             'regretMean': (lab.get('b_regretMean') or {}).get('point'), 'cappedShare': round(tot['capped'] / tot['rows'], 4) if tot['rows'] else None,
             'wallSec': tot['wallSec'], 'branchGames': tot['rows'], 'decisionsBranched': tot['branched'], 'partial': tot['partial'],
             'branchedInFullRows': tot['fullRows'], 'decisionsBranchedPerSpine': round(tot['branched'] / len(by), 2) if by else None,
             'workerHours': round(tot['workerSec'] / 3600, 2) if tot['workerSec'] else None,
             'confidentPerWorkerHour': round(tot['confident'] / (tot['workerSec'] / 3600), 4) if tot['workerSec'] else None}
    return by, night


this, tn = side(args[0], args[1])
before, bn = side(args[2], args[3]) if len(args) >= 4 else ({}, None)
out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J191 (D508\'s population, its fifth night; deck seeds 2901-2913, 150 branches, the futility stop, 10 decisions) beside J193 (D508\'s population, its sixth night, the seat frozen since J186\'s pin, D509, on D513\'s merge on J191\'s pin; deck seeds 3685-3697, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is the seat\'s: the decks differ at every position and the seat does not',
       'bySpine': {s: {'before': before.get(s), 'this': v} for s, v in this.items()}, 'night': {'before': bn, 'this': tn}}
# the self-test's number: positions whose every J171 value comes back from the folders read (meaningful only on J171's own, lab-j170)
K = ('listedPerTurn', 'optionsPerFull', 'labels', 'confident', 'regretMean', 'cappedShare', 'wallSec', 'branchGames')
out['selfMatch'] = sum(1 for s, v in this.items() if s in J171 and all(J171[s][k] == v[k] for k in K))
out['selfMatchNight'] = 1 if tn and all(tn.get(k) == J171_NIGHT[k] for k in K + ('confidentShare',)) else 0
print(json.dumps(out, indent=1))

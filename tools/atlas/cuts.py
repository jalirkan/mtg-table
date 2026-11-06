#!/usr/bin/env python3
# mtg-table — tools/atlas: what the atlas's cut design and futility stop saved, per spine and for the night.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""What D480's cut design and D489's futility stop saved, per spine and for the night, and where the night's wall
went (the branches, the checks, idle workers).

    python3 -I tools/atlas/cuts.py DIR ... [--times=spine-times.txt] [--recheck-times=FILE]

READS each spine DIR's atlas.json (or the first atlas.j166/j168/j171.json timing copy a re-check left), its
phaseB/branches.jsonl, phaseB/schedule.jsonl and phaseB/units.jsonl, and the spine-times.txt lines. WRITES one JSON
object to stdout. Standard library only; no engine.

Moved into the repository from the lab's J193 job file, byte for byte (D515); the comment block below is the job's.
"""
# J193: J177's cuts.py, unchanged. `capSavedMs` stays measured against a 200-branch design (J173's; a definition, not a
# comparison); compare.py now carries J177's column, not J173's.
# J177: J173's cuts.py with D489's and the cap's savings and what they bought, registered before any J177 data (every J173 number and
# definition unchanged; on a spine with no futility read and branchRandom 200 the new ones are 0). New, per spine and for the night:
#   futileSavedMs     for each decision the futility rule STOPPED (its schedule.jsonl `futility` line, `stopped: true`): the options
#                     running at the checkpoint (`alive`) x (branchRandom - at) x the decision's mean random-branch ms, plus, on a
#                     Forge-map spine, branchForge x alive x the spine's mean Forge-branch ms (a stopped decision has no Forge map)
#   capSavedMs        for each complete decision when branchRandom < 200 (J173's design): its options early stopping did not stop x
#                     (200 - branchRandom) x its mean random-branch ms -- an upper bound (J173's design early-stops some at 150)
#   futilityCapShare  (futileSavedMs + capSavedMs) / (branchMs + futileSavedMs + capSavedMs): the branch time the two saved, against
#                     the same decisions on J173's design
#   futileBranchGamesSaved, futileStopped, futileControls   atlas.json's (an upper bound, D489)
#   decisionsBranched the decisions not screened (complete or partial); partial the futile-stopped ones; branchedInFullRows the complete
#                     ones whose option 0 has branchRandom random rows (computed here, whatever atlas.json's branchedInFull counts):
#                     what the saved time bought, against J173's 8 a spine (compare.py has J173's column)
# J173's header: J172's cuts.py (J171's with `atlas.j171.json` among the timing copies, so the pilot's self-test on J171's night, whose five
# re-checked spines carry J171's phase-B timing in that copy, gives J171's numbers back; lab-j177 holds no copy, so every J177 spine's
# timing is its own atlas.json's), with one addition registered before any J173 data: the night's `redactionHours` (the sum of each
# atlas.json's `checks.redactionMs`: the redaction checker's own wall, which J171's failing logs tripled on five spines) and
# `redactionShareOfChecks` (its share of `checksHours`). J171's header (J170's, J169's, J168's, J167's, J166's):
# What the cut design (D480) saved, per spine and for the night. A spine whose atlas.json was rewritten by a re-check reads phase B's
# timing from the first of its `atlas.j166.json`, `atlas.j168.json`, `atlas.j171.json` copies that exists (a re-check's own timing says
# 0 units, 0 ms); --recheck-times=FILE gives each re-check's wall apart (`recheckSec`), never added to the spine's checks.
# Definitions (J166's, registered before any J166 data):
#   branchMs         the sum of every branch row's ms (both continuations, errors included): the branch time as run
#   earlyStopAvoided for each option early stopping stopped at `at` random branches: (branchRandom - at) x the decision's mean
#                    random-branch ms, plus, on a spine with a Forge map, branchForge x the decision's mean Forge-branch ms
#   screenAvoided    for each screened decision: (branchRandom - screen) x k x its mean random-branch ms, plus, on a spine with
#                    a Forge map, branchForge x k x the spine's mean Forge-branch ms (a screened decision has no Forge map)
#   projectedMs      branchMs + earlyStopAvoided + screenAvoided: the same decisions branched in full, uncut
#   savedShare       (projectedMs - branchMs) / projectedMs; the review's replay of the cuts on six spines: 18-20%
#   idleShare        1 - (sum of the ok units' ms) / (phase B wall x workers): the workers' time phase B held without a unit
#   checksSec        the spine's wall in spine-times.txt (its block's start to end, summed over resumed runs) minus atlas.json's
#                    timing.wallMs (the baseline and phase B; written before the checks run): the post-spine checks' wall
#   checksSecPerKGames  checksSec per 1,000 branch games; J162's serial checks took 60-113 s per 1,000 (mean 93)
#   checksShare      the night's checksSec over its wallSec (J170's addition)
import json, os, sys

J162_SERIAL_S_PER_KGAMES = 93
J173_RANDOM = 200
args = [a for a in sys.argv[1:] if not a.startswith('--')]
wall, rewall = {}, {}
for a in sys.argv[1:]:
    for flag, dst in (('--times=', wall), ('--recheck-times=', rewall)):
        if a.startswith(flag) and os.path.exists(a.split('=', 1)[1]):
            for line in open(a.split('=', 1)[1]):
                f = line.split()
                if len(f) >= 3 and f[1].isdigit() and f[2].isdigit():
                    dst[f[0]] = dst.get(f[0], 0) + int(f[2]) - int(f[1])
out, night = {'bySpine': {}}, {'branchMs': 0, 'earlyStopAvoidedMs': 0, 'screenAvoidedMs': 0, 'projectedMs': 0, 'checksSec': 0, 'branchGames': 0,
                                'unitMs': 0, 'heldMs': 0, 'screened': 0, 'stoppedOptions': 0, 'spines': 0, 'recheckSec': 0, 'wallSec': 0, 'redactionSec': 0,
                                'futileSavedMs': 0, 'capSavedMs': 0, 'futileBranchGamesSaved': 0, 'futileStopped': 0, 'futileControls': 0,
                                'decisionsBranched': 0, 'partial': 0, 'branchedInFullRows': 0}
for spine in args:
    name = os.path.basename(os.path.abspath(spine))
    try:
        doc = json.load(open(os.path.join(spine, 'atlas.json')))
    except (OSError, ValueError):
        continue
    tfile = next((os.path.join(spine, x) for x in ('atlas.j166.json', 'atlas.j168.json', 'atlas.j171.json') if os.path.exists(os.path.join(spine, x))), os.path.join(spine, 'atlas.j166.json'))
    tdoc = doc
    if os.path.exists(tfile):
        try:
            tdoc = json.load(open(tfile))
        except (OSError, ValueError):
            pass
    plan, pb, tm = doc['plan'], doc.get('phaseB') or {}, tdoc.get('timing') or {}
    R, F, screen = plan['branchRandom'], plan['branchForge'], ((plan.get('cuts') or {}).get('screen') or 0)
    fm = pb.get('forgeMap', True) is not False and F > 0
    rows = []
    for line in open(os.path.join(spine, 'phaseB', 'branches.jsonl')):
        try:
            rows.append(json.loads(line))
        except ValueError:
            pass
    ms = {}
    for r in rows:
        ms.setdefault((r['d'], r['c']), []).append(r.get('ms') or 0)
    mean = lambda xs: sum(xs) / len(xs) if xs else 0.0
    allF = [m for (d, c), v in ms.items() if c == 'forge' for m in v]
    sch = pb.get('schedule') or {}
    kof = {int(k[1:]): v for k, v in (sch.get('optionsByDecision') or {}).items()}
    es = sum((R - s['at']) * mean(ms.get((s['d'], 'random'), [])) + (F * mean(ms.get((s['d'], 'forge'), [])) if fm else 0) for s in sch.get('stopped') or [])
    sc = sum((R - screen) * kof.get(s['d'], 0) * mean(ms.get((s['d'], 'random'), [])) + (F * kof.get(s['d'], 0) * mean(allF) if fm else 0) for s in sch.get('screened') or [])
    bms = sum(r.get('ms') or 0 for r in rows)
    proj = bms + es + sc
    # D489 and the cap: what they saved against the same decisions on J173's design
    fut = 0.0
    sf = os.path.join(spine, 'phaseB', 'schedule.jsonl')
    if os.path.exists(sf):
        for line in open(sf):
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if e.get('type') == 'futility' and e.get('stopped'):
                na = len(e.get('alive') or [])
                fut += na * (R - e['at']) * mean(ms.get((e['d'], 'random'), [])) + (F * na * mean(allF) if fm else 0)
    o0r = {}
    for r in rows:
        if r['c'] == 'random' and r['o'] == 0:
            o0r[r['d']] = o0r.get(r['d'], 0) + 1
    cap = 0.0
    if R < J173_RANDOM:
        for x in pb.get('decisions') or []:
            if x.get('complete') and not x.get('partial'):
                cap += sum(1 for o in x['options'] if o.get('stoppedAt') is None) * (J173_RANDOM - R) * mean(ms.get((x['d'], 'random'), []))
    dec = [x for x in pb.get('decisions') or [] if not x.get('screened')]
    units = []
    uf = os.path.join(spine, 'phaseB', 'units.jsonl')
    if os.path.exists(uf):
        for line in open(uf):
            try:
                u = json.loads(line)
            except ValueError:
                continue
            if u.get('ok') and u.get('ms'):
                units.append(u['ms'])
    tb = tm.get('phaseB') or {}
    held = (tb.get('ms') or 0) * (tb.get('workers') or 0)
    chk = wall[name] - (tm.get('wallMs') or 0) / 1000 if name in wall else 0
    red = ((doc.get('checks') or {}).get('redactionMs') or 0) / 1000
    s = {'forgeMap': fm, 'timingFrom': os.path.basename(tfile) if tdoc is not doc else 'atlas.json', 'branchGames': len(rows), 'branchMs': bms,
         'earlyStopAvoidedMs': round(es), 'screenAvoidedMs': round(sc), 'projectedMs': round(proj),
         'savedShare': round((proj - bms) / proj, 4) if proj else None, 'earlyStopShare': round(es / proj, 4) if proj else None,
         'screenShare': round(sc / proj, 4) if proj else None, 'screened': len(sch.get('screened') or []), 'stoppedOptions': sch.get('stoppedOptions', 0),
         'phaseBWallSec': round((tb.get('ms') or 0) / 1000), 'workers': tb.get('workers'), 'unitSec': round(sum(units) / 1000),
         'idleShare': round(1 - sum(units) / held, 4) if held else None, 'checksSec': round(chk), 'redactionSec': round(red),
         'checksSecPerKGames': round(1000 * chk / len(rows), 1) if rows else None, 'j162SerialSecPerKGames': J162_SERIAL_S_PER_KGAMES,
         'recheckSec': rewall.get(name),
         'futileSavedMs': round(fut), 'capSavedMs': round(cap), 'futilityCapShare': round((fut + cap) / (bms + fut + cap), 4) if bms + fut + cap else None,
         'futileBranchGamesSaved': sch.get('futileBranchGamesSaved', 0), 'futileStopped': sch.get('futileStopped', 0), 'futileControls': sch.get('futileControls', 0),
         'decisionsBranched': len(dec), 'partial': sum(1 for x in dec if x.get('partial')),
         'branchedInFullRows': sum(1 for x in dec if x.get('complete') and o0r.get(x['d'], 0) >= R)}
    out['bySpine'][name] = s
    for k in ('branchMs', 'branchGames', 'screened', 'stoppedOptions'):
        night[k] += s[k]
    night['earlyStopAvoidedMs'] += es
    night['screenAvoidedMs'] += sc
    night['projectedMs'] += proj
    night['checksSec'] += chk
    night['unitMs'] += sum(units)
    night['heldMs'] += held
    night['spines'] += 1
    night['recheckSec'] += rewall.get(name) or 0
    night['wallSec'] += wall.get(name, 0)
    night['redactionSec'] += red
    night['futileSavedMs'] += fut
    night['capSavedMs'] += cap
    for k in ('futileBranchGamesSaved', 'futileStopped', 'futileControls', 'decisionsBranched', 'partial', 'branchedInFullRows'):
        night[k] += s[k]
p = night['projectedMs']
out['night'] = {'spines': night['spines'], 'branchGames': night['branchGames'], 'branchHours': round(night['branchMs'] / 3.6e6, 2), 'projectedHours': round(p / 3.6e6, 2),
                'savedShare': round((p - night['branchMs']) / p, 4) if p else None, 'earlyStopShare': round(night['earlyStopAvoidedMs'] / p, 4) if p else None,
                'screenShare': round(night['screenAvoidedMs'] / p, 4) if p else None, 'screened': night['screened'], 'stoppedOptions': night['stoppedOptions'],
                'idleShare': round(1 - night['unitMs'] / night['heldMs'], 4) if night['heldMs'] else None, 'checksHours': round(night['checksSec'] / 3600, 2),
                'wallSec': night['wallSec'], 'checksShare': round(night['checksSec'] / night['wallSec'], 4) if night['wallSec'] else None,
                'checksSecPerKGames': round(1000 * night['checksSec'] / night['branchGames'], 1) if night['branchGames'] else None,
                'checksHoursAtJ162Serial': round(night['branchGames'] * J162_SERIAL_S_PER_KGAMES / 1000 / 3600, 2), 'recheckSec': night['recheckSec'],
                'redactionHours': round(night['redactionSec'] / 3600, 2),
                'redactionShareOfChecks': round(night['redactionSec'] / night['checksSec'], 4) if night['checksSec'] else None,
                'reviewExpectation': 'cuts save 18-20% of branch time (atlas review 3b+3d; D480 replay 20.3%); J171 measured 31.5% (early stop 16.4%, screen 15.1%)',
                'futileSavedHours': round(night['futileSavedMs'] / 3.6e6, 2), 'capSavedHours': round(night['capSavedMs'] / 3.6e6, 2),
                'futilityCapShare': round((night['futileSavedMs'] + night['capSavedMs']) / (night['branchMs'] + night['futileSavedMs'] + night['capSavedMs']), 4) if night['branchMs'] else None,
                'futileBranchGamesSaved': night['futileBranchGamesSaved'], 'futileStopped': night['futileStopped'], 'futileControls': night['futileControls'],
                'decisionsBranched': night['decisionsBranched'], 'partial': night['partial'], 'branchedInFullRows': night['branchedInFullRows'],
                'decisionsBranchedPerSpine': round(night['decisionsBranched'] / night['spines'], 2) if night['spines'] else None,
                'futilityExpectation': 'the atlas review, policy.md: the cap and the futility stop take the same decisions from 110.61 to 74.67 branch worker-hours (32.5% saved; no controls); D489 replay of J171: the stop alone 16.5% of branch hours; J173 branched 8 decisions a spine'}
print(json.dumps(out, indent=1))

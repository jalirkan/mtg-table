#!/usr/bin/env python3
# mtg-table — tools/atlas: the atlas night's tool counters, and the scan of its branch frame logs.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The atlas night's tool counters for the lab runner's checks, and the scan of a spine's branch frame logs that
places every cast (the refused and lost casts) and counts D485-D488's records.

    python3 -I tools/atlas/metrics.py --scan SPINE_DIR CACHE_DIR [JOBS]
    python3 -I tools/atlas/metrics.py [DATA_DIR [SPINE_GLOB [CACHE_DIR]]]      (DATA_DIR defaults to $ATLAS_DATA)

--scan READS SPINE_DIR's phaseB/branches.jsonl and phaseB/frames/d*-*-o*-b*-seat?.jsonl.gz and WRITES
CACHE_DIR/<folder>.json (stamped with the spine's atlas.json mtime) and a summary line to stdout.
The main mode READS DATA_DIR/SPINE_GLOB's plan.json, atlas.json, phaseB/{baseline.json, branches.jsonl,
units.jsonl, logs/*.log}, the scan caches in CACHE_DIR, DATA_DIR/validation/, DATA_DIR/report/{reads,labels,
ncurve,compare-j191}.json, and $ATLAS_LOCAL/{draws-pilot.json, sha.txt} (ATLAS_LOCAL defaults to
var/lab-j193-local, the job's own folder), and WRITES one JSON object to stdout. Its spine table and the plan it
wants are J193's: a later night edits them. Standard library only; no engine.

ATLAS_SCAN_STAMP names the stamp --scan writes and the main mode wants (default "J193 v5").

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the data folder, which was a
path on the lab machine and is now argument 1 or $ATLAS_DATA, the job folder, now $ATLAS_LOCAL, and the scan
stamp, now $ATLAS_SCAN_STAMP. The comment block below is the job's.
"""
# J193's metrics (drafts/J193-atlas-4b-night-fifteen.md): J177's metrics.py for a NEW data folder, lab-j193, where all 13 spines are
# J193's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J193 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J193's (deck seeds 3685-3697, game
# seeds 3785-3797, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population,
# J186's, J187's, J188's, J190's, J191's and this night's); (c) compare-j191.json for the `compare` key; (d) the scan stamp `J193 v5` and
# the defaults lab-j193, var/lab-j193-local. D479's `exileLinksLostBranches` and `exileLinksLostLinks` are J177's keys, read per spine at
# the morning read (J191's s01 and s03 the population's first non-zero).
# J177's header, unchanged below:
# J177's metrics (drafts/J177-atlas-4b-night-three.md): J173's metrics.py for a NEW data folder, lab-j177, where all 13 spines are J177's,
# branched at the pin by D488's random seat (unchanged since J173) on D489's design; registered before any J177 data. What changed from
# J173's (every J173 key and definition kept):
# (a) The spine table is J177's (deck seeds 2040-2052, game seeds 2140-2152, the bands cycled as J166's); the plan wanted is
#     --branch-random 150, --decisions 10 and the cuts {earlyStop [50, 100], screen 25, minOptions 3, futility {at 0, tie 0, sample 0.25}}.
# (b) D489's counters per spine and summed, from each atlas.json's phaseB.schedule: `futilityReads` (len of `futility`), `futileRead`
#     (those futile), `futileStopped`, `futileControls`, `futileBranchGamesSaved`, `partialLabels`; `futilityKeys` the spines whose schedule
#     carries all four counters; `partialDecisions` the decisions with `partial: true` (== futileStopped, a check through labels.json).
# (c) "Branched in full" and the units planned are computed per decision from atlas.json's own fields, so they are right whether or not
#     atlas.json's `branchedInFull` counts a futile-stopped decision: `decisionsBranched` = not screened (complete or partial); fullShort
#     when that is below min(decisions, listed - screened); units planned = a screened decision's ceil(screen / chunk), a partial one's
#     ceil(stoppedAt / chunk), every other's ceil(branchRandom / chunk) + ceil(branchForge / chunk).
# (d) From labels.json: `partialLabels` (rows), `confidentPartial` (0), `futilityControls`, `confidentPerWorkerHour`; compare-j173.json
#     (column `j177`) for the `compare` key.
# J173's header (J171's metrics.py, lab-j173): the validation draw's sha256 is the one the pilot recorded
#     (var/lab-j177-local/draws-pilot.json, made at the pin and checked against the redraw), not a constant; J167's s04 deck check is gone;
#     the pools are `random-<band>-d488` and the seat "D488" (poolOk).
# (2) THE SCAN places every cast, beside J169's lost casts. D488 (Context) found that 614 of J171's 645 "lost casts" were G5's refused
#     payments: D466's put-back returns the card to the hand by a zone move that fires no event, so J169's definition counts it lost,
#     and misses a refused cast whose card is cast again later. So, per cast (a zone event {hand, the viewer} -> {stack, null}):
#       ON THE STACK  a state frame at or after it lists the card in `stackCards`, or a `cast` event or a zone event off the stack names it;
#       REFUSED       before the first such line, the first state frame that lists the card anywhere lists it in its caster's own hand
#                     (the viewer's: `castsRefused`, by card name); FORCED when the card is the branch's own option and it is put back
#                     before the branch's first AI decision record (`castsRefusedForced`);
#       A REFUSED-CAST OPTION: (decision, map, option) whose forced cast was refused in more than half of its branch rows
#                     (`refusedCastOptions`; J173's final check, 0);
#     J169's LOST CAST is kept as defined (no stack evidence after the cast, ever; `lostCastOptions`, a final check at 0), split into
#     `lostPutBack` (its card is next listed in its caster's hand: a refusal J169 counted lost) and `lostStranded` (the rest).
#     THE HEADLINE: `refusedCastShare` = the seats' own `refusedCast` (G5's count, each log's guardrail summary) / casts, per spine and for
#     the night (J171: 4,451 / 840,488); `castsRefusedShare` = castsRefused / casts beside it. `refusedCast` is an upper bound on the
#     payment refusals (D488, Not fixed: it also counts D485's stale answers not offered and Forge's answers D488 could not fit), so
#     `staleRefused` is read beside it and the put-backs are the frames' own count of the payment refusals.
#     D488's counters from the same summaries: `targetCountTrimmed`, `costTargetAvoided` (protocol M77).
#     D487's from the target records: `target:none` chosen (`targetNoneChosen`) and listed (`targetNoneListed`), `why: "NO_TARGET"`
#     (`noTargetRecords`), any null answer (`nullChosenTargets`) and J171's legacy shape (`legacyNullTargets`: by forge, source targets,
#     chosen null, two or more target:<id> / target:p<id> options and nothing else, none of min, why, complete, hidden, explore, search;
#     D487, M76) -- 0 expected on a D487 pin, a final check (`legacyNullTargetRecords`). `completeShare`: complete target records / all.
#     The cache carries `scan: "J177 v5"`; main mode reads only such caches.
# (3) The branch rows' `targetCountTrimmed` and `costTargetAvoided` (D488, BranchRow, written when > 0), beside D486's `modesDrawn`.
# (4) The worker logs, per spine: `AI failed to play <card> (<id>) [...]` (`failedToPlay`, by card: Forge's own line for a payment the
#     AI refused, naming the card), `Didn't find what to pay for` (`payFail`) and D488's `branch error, stack:` (`branchErrorStacks`).
# (5) An optional third argument: the scan caches' folder (default var/lab-j177-local/lost; the pilot's self-tests pass lost-self).
# J169's and J171's definitions otherwise, unchanged.
#   metrics.py --scan FOLDER CACHE_DIR [JOBS]  scans FOLDER's phase B branch frame logs and writes CACHE_DIR/<folder>.json, stamped
#                                              with FOLDER's atlas.json mtime (a cache of another atlas.json is never read)
#   metrics.py [DATA_DIR] [SPINE_GLOB] [CACHE_DIR]   default the lab's lab-j177 data folder, b-s??-*-21?? (never the pilot
#                                              folders) and var/lab-j177-local/lost
# Standard library only; no engine.
import bisect, glob, gzip, hashlib, json, math, os, re, sys
NAME = re.compile(r'd(\d+)-(random|forge)-o(\d+)-b(\d+)-seat(\d)\.jsonl\.gz$')
CAST_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"hand","player":(\d+)\},"to":\{"zone":"stack","player":null\}')
LIVE_RE = re.compile(r'"kind":"zone","cardId":(\d+),"from":\{"zone":"stack"|"kind":"cast","stackId":-?\d+,"cardId":(\d+)')
CARD_TOKEN = re.compile(r'target:p?\d+$')
FTP = re.compile(r'AI failed to play (.+?) \(\d+\) \[')
LEGACY_BAN = ('min', 'why', 'complete', 'hidden', 'explore', 'search')
SCAN_V = os.environ.get('ATLAS_SCAN_STAMP', 'J193 v5')   # D515: an older night's scan caches carry its own stamp ('J191 v5')
SCAN_COUNTS = ('casts', 'lost', 'forced', 'refused', 'refusedForced', 'lostPutBack', 'stale', 'modesWhy', 'modesSource', 'targetRecords',
               'targetRecordsCard', 'targetRecordsComplete', 'targetRecordsCardComplete', 'targetNoneChosen', 'targetNoneListed',
               'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets', 'randomised', 'randomisedPriority', 'summaries')
BO0 = {'branches': 0, 'lostBranches': 0, 'forcedLostBranches': 0, 'refusedBranches': 0, 'forcedRefusedBranches': 0}


def where(body, cid, seat):
    """where a state frame lists card cid: 'stack', 'hand' (its caster's, the viewer's, own hand), another zone's name, or None"""
    for sc in body.get('stackCards') or []:
        if isinstance(sc, dict) and sc.get('id') == cid:
            return 'stack'
    for p in body.get('players') or []:
        zs = p.get('zones') if isinstance(p, dict) else None
        for zn, z in (zs if isinstance(zs, dict) else {}).items():
            for cd in (z.get('cards') if isinstance(z, dict) else None) or []:
                if isinstance(cd, dict) and cd.get('id') == cid:
                    return 'hand' if zn == 'hand' and p.get('id') == seat else zn
    return None


def legacy(b):
    """J171's legacy null target record (D487, M76), whatever the log's date"""
    opts = b.get('options') or []
    return (b.get('by') == 'forge' and b.get('source') == 'targets' and 'chosen' in b and b['chosen'] is None and len(opts) >= 2
            and all(isinstance(t, str) and CARD_TOKEN.match(t) for t in opts) and not any(k in b for k in LEGACY_BAN))


def scan_log(path):
    """one branch frame log: its casts from the viewer's own hand, where each went (the stack, back in hand: refused, or nowhere: J169's
    lost), the forced ones, the cards' names, D485's, D486's and D487's records, and its decisions summary's explore counts"""
    m = NAME.search(path)
    d, c, o, i, seat = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))
    casts, live, states, first_dec, tok = [], {}, {}, None, None
    n = dict.fromkeys(SCAN_COUNTS, 0)
    g = {}
    with gzip.open(path, 'rt') as f:
        for k, l in enumerate(f):
            if k == 0:
                try:
                    h = json.loads(l)
                    tok, seat = (h.get('lab') or {}).get('optionToken'), h.get('seat', seat)
                except ValueError:
                    pass
                continue
            if '"dir":"ai"' in l:
                if '"type":"decisions"' in l:
                    try:
                        e = ((json.loads(l).get('body') or {}).get('explore')) or {}
                    except ValueError:
                        e = {}
                    n['summaries'] += 1
                    n['randomised'] += e.get('decisionsRandomised') or 0
                    n['randomisedPriority'] += (e.get('byKind') or {}).get('priority') or 0
                    for kk, v in (e.get('guardrails') or {}).items():
                        if isinstance(v, (int, float)):
                            g[kk] = g.get(kk, 0) + v
                elif '"type":"decision"' in l:
                    first_dec = k if first_dec is None else first_dec
                    n['stale'] += 1 if '"STALE_TARGETS"' in l else 0
                    n['modesWhy'] += 1 if '"MODES_DRAWN"' in l else 0
                    n['modesSource'] += 1 if '"source":"modes"' in l else 0
                    if '"kind":"target"' in l:
                        try:
                            b = json.loads(l).get('body') or {}
                        except ValueError:
                            b = {}
                        if b.get('kind') == 'target':
                            opts = b.get('options') or []
                            card = any(isinstance(t, str) and t.startswith('target:') and not t.startswith('target:p') and t != 'target:none' for t in opts)
                            whole = b.get('complete') is not False
                            n['targetRecords'] += 1
                            n['targetRecordsCard'] += 1 if card else 0
                            n['targetRecordsComplete'] += 1 if whole else 0
                            n['targetRecordsCardComplete'] += 1 if card and whole else 0
                            n['targetNoneChosen'] += 1 if b.get('chosen') == 'target:none' else 0
                            n['targetNoneListed'] += 1 if 'target:none' in opts else 0
                            n['noTargetRecords'] += 1 if b.get('why') == 'NO_TARGET' else 0
                            n['nullChosenTargets'] += 1 if 'chosen' in b and b['chosen'] is None else 0
                            n['legacyNullTargets'] += 1 if legacy(b) else 0
                continue
            if '"type":"state"' not in l:
                continue
            states[k] = l
            for mm in CAST_RE.finditer(l):
                if int(mm.group(2)) == seat:
                    casts.append((int(mm.group(1)), k))
            for mm in LIVE_RE.finditer(l):
                live.setdefault(int(mm.group(1) or mm.group(2)), []).append(k)
            if '"stackCards":[{' in l:
                try:
                    b = json.loads(l).get('body') or {}
                except ValueError:
                    b = {}
                for sc in b.get('stackCards') or []:
                    if isinstance(sc, dict) and isinstance(sc.get('id'), int):
                        live.setdefault(sc['id'], []).append(k)
    own = lambda cid: isinstance(tok, str) and (tok == 'cast:%d' % cid or tok.startswith('cast:%d#' % cid))
    order = sorted(states)
    lost, refused, putback = [], [], []
    for cid, ln in casts:
        lv = live.get(cid) or []
        j = bisect.bisect_left(lv, ln)
        fl = lv[j] if j < len(lv) else None   # the first line at or after the cast with the card on the stack
        placed = None
        if fl != ln:
            for k in order[bisect.bisect_left(order, ln):]:
                if fl is not None and k >= fl:
                    break
                try:
                    b = json.loads(states[k]).get('body') or {}
                except ValueError:
                    continue
                placed = where(b, cid, seat)
                if placed is not None:
                    break
        before = first_dec is None or ln < first_dec
        is_lost = not lv or lv[-1] < ln   # J169's: no stack evidence after the cast, ever
        if is_lost:
            lost.append(cid)
            n['forced'] += 1 if own(cid) and before else 0
        if placed == 'hand':
            refused.append(cid)
            n['refusedForced'] += 1 if own(cid) and before else 0
            if is_lost:
                putback.append(cid)
    n['casts'], n['lost'], n['refused'], n['lostPutBack'] = len(casts), len(lost), len(refused), len(putback)
    names = {}
    want = set(lost) | set(refused)
    if want:   # rare: the cards' names, from the caster's own state frames (its hand named them)
        for k in order:
            l = states[k]
            for cid in list(want - set(names)):
                mm = re.search(r'\{"id":%d,"name":"((?:[^"\\]|\\.)*)"' % cid, l)
                if mm:
                    names[cid] = mm.group(1)
            if len(names) == len(want):
                break
    return {'key': 'd%d/%s/o%d' % (d, c, o), 'i': i, 'n': n, 'g': g, 'cards': lost, 'names': [names.get(x, '?') for x in lost],
            'refusedNames': [names.get(x, '?') for x in refused], 'putBackNames': [names.get(x, '?') for x in putback]}


def scan_folder(F, J):
    """every phase B branch frame log of the spine folder F, on J processes: the cache's content"""
    import multiprocessing
    Pool = multiprocessing.get_context('fork').Pool   # the module's top level is the default mode: never re-imported in a worker
    F = os.path.abspath(F)
    mt = int(os.path.getmtime(F + '/atlas.json'))
    bo = {}
    for line in open(F + '/phaseB/branches.jsonl'):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        bo.setdefault('d%d/%s/o%d' % (r['d'], r['c'], r['o']), dict(BO0))['branches'] += 1
    files = sorted(glob.glob(F + '/phaseB/frames/d*-*-o*-b*-seat?.jsonl.gz'))
    tot = dict.fromkeys(SCAN_COUNTS, 0)
    res = {'scan': SCAN_V, 'folder': os.path.basename(F), 'atlasMtime': mt, 'logs': len(files), 'byCard': {}, 'byName': {}, 'byNameRefused': {},
           'byNamePutBack': {}, 'guardrails': {}}
    sets = {'lostBranches': set(), 'forcedLostBranches': set(), 'refusedBranches': set(), 'forcedRefusedBranches': set()}
    with Pool(J) as p:
        for x in p.imap_unordered(scan_log, files, chunksize=16):
            for k in SCAN_COUNTS:
                tot[k] += x['n'][k]
            for k, v in x['g'].items():
                res['guardrails'][k] = res['guardrails'].get(k, 0) + v
            for cid, nm in zip(x['cards'], x['names']):
                res['byCard'][str(cid)] = res['byCard'].get(str(cid), 0) + 1
                res['byName'][nm] = res['byName'].get(nm, 0) + 1
            for nm in x['refusedNames']:
                res['byNameRefused'][nm] = res['byNameRefused'].get(nm, 0) + 1
            for nm in x['putBackNames']:
                res['byNamePutBack'][nm] = res['byNamePutBack'].get(nm, 0) + 1
            for key, cnt in (('lostBranches', 'lost'), ('forcedLostBranches', 'forced'), ('refusedBranches', 'refused'), ('forcedRefusedBranches', 'refusedForced')):
                if x['n'][cnt]:
                    sets[key].add((x['key'], x['i']))
    for key, s in sets.items():
        for k, i in s:
            bo.setdefault(k, dict(BO0))[key] += 1
    gr = res['guardrails']
    res.update({'casts': tot['casts'], 'lostCasts': tot['lost'], 'lostCastForced': tot['forced'], 'staleTargetRecords': tot['stale'],
                'modesDrawnRecords': tot['modesWhy'], 'modesSourceRecords': tot['modesSource'], 'targetRecords': tot['targetRecords'],
                'targetRecordsCard': tot['targetRecordsCard'], 'targetRecordsComplete': tot['targetRecordsComplete'],
                'targetRecordsCardComplete': tot['targetRecordsCardComplete'], 'summaries': tot['summaries'], 'randomised': tot['randomised'],
                'randomisedPriority': tot['randomisedPriority'], 'cardTargetOffered': gr.get('cardTargetOffered', 0),
                'modesDrawn': gr.get('modesDrawn', 0), 'retargeted': gr.get('retargeted', 0), 'staleRefused': gr.get('staleRefused', 0),
                'refusedCast': gr.get('refusedCast', 0), 'noRepeatRefused': gr.get('noRepeatRefused', 0),
                'targetCountTrimmed': gr.get('targetCountTrimmed', 0), 'costTargetAvoided': gr.get('costTargetAvoided', 0),
                'castsRefused': tot['refused'], 'castsRefusedForced': tot['refusedForced'], 'lostPutBack': tot['lostPutBack'],
                'lostStranded': tot['lost'] - tot['lostPutBack'], 'targetNoneChosen': tot['targetNoneChosen'], 'targetNoneListed': tot['targetNoneListed'],
                'noTargetRecords': tot['noTargetRecords'], 'nullChosenTargets': tot['nullChosenTargets'], 'legacyNullTargets': tot['legacyNullTargets']})
    res['cardTargetShare'] = round(res['cardTargetOffered'] / res['randomisedPriority'], 4) if res['randomisedPriority'] else None
    res['refusedCastShare'] = round(res['refusedCast'] / res['casts'], 5) if res['casts'] else None
    res['castsRefusedShare'] = round(res['castsRefused'] / res['casts'], 5) if res['casts'] else None
    res['completeShare'] = round(res['targetRecordsComplete'] / res['targetRecords'], 4) if res['targetRecords'] else None
    res['lostCastBranches'] = len(sets['lostBranches'])
    res['refusedCastBranches'] = len(sets['refusedBranches'])
    res['byOption'] = bo
    res['lostCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedLostBranches'] > v['branches'])
    res['refusedCastOptions'] = sorted(k for k, v in bo.items() if v['branches'] and 2 * v['forcedRefusedBranches'] > v['branches'])
    return res


if len(sys.argv) > 1 and sys.argv[1] == '--scan':
    res = scan_folder(sys.argv[2], int(sys.argv[4]) if len(sys.argv) > 4 else 1)
    C = sys.argv[3]
    os.makedirs(C, exist_ok=True)
    with open(os.path.join(C, res['folder'] + '.json'), 'w') as f:
        json.dump(res, f)
    print(json.dumps({k: v for k, v in res.items() if k != 'byOption'}))
    sys.exit(0)
D = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ATLAS_DATA') or sys.exit('metrics.py: name the night\'s data folder: argument 1 or ATLAS_DATA')
G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-3???'
L = os.environ.get('ATLAS_LOCAL', 'var/lab-j193-local')
CD = sys.argv[3] if len(sys.argv) > 3 else L + '/lost'
# name: (band, deck seed, game seed, branchForge) -- J193's spine table (deck seeds 3685-3697, game seeds 3785-3797)
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SPINES = {'s%02d' % k: (BANDS[k - 1], 3684 + k, 3784 + k, 40 if k in (1, 7, 13) else 0) for k in range(1, 14)}
try:
    VALIDATION_SHA = json.load(open(L + '/draws-pilot.json'))['validation'].split()[0]
except (OSError, ValueError, KeyError, AttributeError):
    VALIDATION_SHA = None
CUTS = {'earlyStop': [50, 100], 'screen': 25, 'minOptions': 3, 'futility': {'at': 0, 'tie': 0, 'sample': 0.25}}
SCAN_KEYS = ('casts', 'lostCasts', 'lostCastBranches', 'lostCastForced', 'lostPutBack', 'lostStranded', 'castsRefused', 'castsRefusedForced',
             'refusedCastBranches', 'refusedCast', 'noRepeatRefused', 'targetCountTrimmed', 'costTargetAvoided', 'staleTargetRecords',
             'modesDrawnRecords', 'modesSourceRecords', 'targetRecords', 'targetRecordsCard', 'targetRecordsComplete', 'targetRecordsCardComplete',
             'targetNoneChosen', 'targetNoneListed', 'noTargetRecords', 'nullChosenTargets', 'legacyNullTargets', 'randomised', 'randomisedPriority',
             'cardTargetOffered', 'modesDrawn', 'retargeted', 'staleRefused')
out = {'atlases': 0, 'spinesDone': 0, 'problems': 0, 'warnings': 0, 'guardViolations': 0, 'violationsG1': 0, 'violationsG4': 0, 'violationsG6': 0,
       'g5keys': 0, 'g6keys': 0, 'd479keys': 0, 'scheduleKeys': 0, 'noRepeatNoOp': 0,
       'xDrawn': 0, 'zeroXLeftOut': 0, 'zeroX': 0, 'branchErroredOptions': 0, 'unavailableOptionsOverBar': 0, 'cappedOptionsOverWarn': 0, 'truncatedLogs': 0,
       'atlasRefusedCast': 0, 'atlasNoRepeatRefused': 0, 'atlasTargetCountTrimmed': 0, 'atlasCostTargetAvoided': 0,
       'planOk': 0, 'planBad': [], 'forgeSpines': 0, 'cutsSpines': 0,
       'branchRows': 0, 'branchTimeouts': 0, 'branchTimeoutsInStep': 0, 'timeoutShare': None, 'branchErrored': 0, 'branchUnavailable': 0,
       'branchRestarted': 0, 'branchCapped': 0, 'effectSourceNullBranches': 0, 'effectSourceNullCards': 0, 'exileLinksLostBranches': 0, 'exileLinksLostLinks': 0,
       'errorsByKind': {}, 'unavailableByReason': {}, 'decisions': 0, 'branchedInFull': 0, 'screened': 0, 'fill': 0, 'stoppedOptions': 0,
       'unitsPlanned': 0, 'unitsOk': 0, 'unitsShort': 0, 'fullShort': 0, 'meanRho': None,
       'listedDecisions': 0, 'identityDecisions': 0, 'identityOptions': 0, 'identityListingsShort': 0, 'd483Spines': 0, 'pre483Spines': 0,
       'repeatedPlays': 0, 'sharedToken': 0, 'scuteDecks': 0,
       'chooseSourceGuardRows': 0, 'chooseSourceGuard': 0, 'chooseSourceGuardKeyRows': 0, 'retargetedRows': 0, 'retargetedOnRows': 0,
       'modesDrawnRows': 0, 'modesDrawnOnRows': 0, 'targetCountTrimmedRows': 0, 'targetCountTrimmedOnRows': 0, 'costTargetAvoidedRows': 0, 'costTargetAvoidedOnRows': 0,
       'failedToPlay': 0, 'failedToPlayByCard': {}, 'payFail': 0, 'branchErrorStacks': 0,
       'lostCastScanned': 0, 'lostCastOptions': 0, 'lostCastOptionList': [], 'lostCastCards': {}, 'lostPutBackCards': {}, 'refusedCastOptions': 0,
       'refusedCastOptionList': [], 'refusedCastCards': {}, 'scanLogs': 0, 'cardTargetSpines': 0, 'cardTargetShare': None, 'refusedCastShare': None,
       'castsRefusedShare': None, 'completeShare': None, 'legacyNullTargetRecords': 0, 'trimmedSpines': 0, 'avoidedSpines': 0,
       'validationFolders': 0, 'validationDecks': 0, 'validationShaOk': 0, 'validationBranched': 0,
       'reads': 0, 'labels': -1, 'confident': -1, 'confidentPer7Worker10hNight': None, 'confidentPer7Poisson95': None, 'rowsUnmatched': -1, 'voidLabels': -1,
       'branchedRows': -1, 'trainingRows': -1, 'lostCastVoid': -1, 'refusedCastVoid': -1, 'poolOk': 0, 'compare': 0, 'bySpine': {},
       'futilityKeys': 0, 'futilityReads': 0, 'futileRead': 0, 'futileStopped': 0, 'futileControls': 0, 'futileBranchGamesSaved': 0,
       'partialDecisions': 0, 'decisionsBranched': 0, 'ncurve': 0, 'partialLabels': -1, 'confidentPartial': -1, 'futilityControls': -1, 'confidentPerWorkerHour': None}
for k in SCAN_KEYS:
    out[k] = 0
for b in ('pauper', 'peasant', 'legacy', 'powered'):
    out['spines_' + b] = 0


def key_of(name):
    """b-s01-pauper-2114 -> s01"""
    return name.split('-')[1] if name.count('-') >= 3 else None


def kind_of(err):
    if err.startswith('BranchTimeout'):
        return 'timeout (D467)'
    if re.match(r"IllegalStateException: no .* on the copy's ", err):
        return 'play not rebuilt on the copy (D472, D476)'
    if re.match(r'IllegalStateException: optional cost .* is not offered on the copy', err):
        return 'optional cost not offered (D466)'
    if err.startswith('recording:'):
        return 'recording'
    return err.split(':', 1)[0].strip() or 'other'


def scute(p):
    try:
        return re.search(rb'(?m)^\d+ Scute Swarm\s*$', open(p, 'rb').read()) is not None
    except OSError:
        return False


rhos = []
for f in sorted(glob.glob(D + '/' + G + '/plan.json')):
    dd = os.path.dirname(f)
    name = os.path.basename(dd)
    k = key_of(name)
    plan = json.load(open(f))
    sp = out['bySpine'].setdefault(name, {})
    if k in SPINES:
        band, ds, gs, bf = SPINES[k]
        want = {'deckA': '%s/decks/%s-%s-%d/decks/%s-%d-00001.dck' % (D, k, band, ds, band, ds), 'deckB': '%s/decks/%s-%s-%d/decks/%s-%d-00002.dck' % (D, k, band, ds, band, ds),
                'seed': gs, 'branchForge': bf, 'branchRandom': 150, 'chunk': 25, 'decisions': 10}
        bad = [x for x, v in want.items() if plan.get(x) != v and not (x.startswith('deck') and str(plan.get(x, '')).endswith(v.split(D + '/', 1)[1]))]
        cuts = plan.get('cuts') or {}
        if any(cuts.get(x) != v for x, v in CUTS.items()):
            bad.append('cuts')
        if name != 'b-%s-%s-%d' % (k, band, gs):
            bad.append('folder')
    else:
        bad = ['not in the spine table']
    if bad:
        out['planBad'].append('%s: %s' % (name, ', '.join(bad)))
    else:
        out['planOk'] += 1
    out['forgeSpines'] += 1 if plan.get('branchForge', 0) > 0 else 0
    out['cutsSpines'] += 1 if (plan.get('cuts') or {}).get('decision') == 'D480' else 0
    out['scuteDecks'] += sum(1 for x in ('deckA', 'deckB') if scute(str(plan.get(x))))
    for x in ('deckA', 'deckB'):
        if '/validation/' in str(plan.get(x)):
            out['validationBranched'] += 1
    # D483: the baseline's listing (every J193 spine lists identities)
    try:
        ls = json.load(open(os.path.join(dd, 'phaseB', 'baseline.json')))['decisions']
    except (OSError, ValueError, KeyError, TypeError):
        ls = None
    if ls is not None:
        withid = [x for x in ls if x.get('identities')]
        out['listedDecisions'] += len(ls)
        out['identityDecisions'] += len(withid)
        out['identityOptions'] += sum(len(x['identities']) for x in withid)
        out['d483Spines'] += 1 if ls and all(len(x.get('identities') or []) == len(x['tokens']) for x in ls) else 0
        out['pre483Spines'] += 1 if not withid else 0
        out['identityListingsShort'] += sum(1 for x in ls if len(x.get('identities') or []) != len(x['tokens']))
        for x in ls:
            ids, toks = x.get('identities') or [], x['tokens']
            if ids:
                out['repeatedPlays'] += 1 if len(set(ids)) < len(ids) else 0
                by = {}
                for t, i in zip(toks, ids):
                    by.setdefault(t, set()).add(i)
                out['sharedToken'] += 1 if any(len(v) > 1 for v in by.values()) else 0
    af = os.path.join(dd, 'atlas.json')
    if not os.path.exists(af):
        continue
    d = json.load(open(af))
    c, g = d['checks'], d['checks']['guardrails']
    out['atlases'] += 1
    out['problems'] += len(c['problems'])
    out['warnings'] += len(c.get('warnings') or [])
    out['guardViolations'] += g.get('violations', 0)
    vb = g.get('violationsBy') or {}
    for x in ('G1', 'G4', 'G6'):
        out['violations' + x] += vb.get(x, 0)
    out['g5keys'] += 1 if 'refusedCast' in g and 'noRepeatRefused' in g else 0
    out['g6keys'] += 1 if all(x in g for x in ('xDrawn', 'zeroXLeftOut', 'zeroX')) else 0
    for x in ('noRepeatNoOp', 'xDrawn', 'zeroXLeftOut', 'zeroX'):
        out[x] += g.get(x, 0)
    for x, y in (('refusedCast', 'atlasRefusedCast'), ('noRepeatRefused', 'atlasNoRepeatRefused'), ('targetCountTrimmed', 'atlasTargetCountTrimmed'),
                 ('costTargetAvoided', 'atlasCostTargetAvoided')):
        out[y] += g.get(x, 0)
    out['branchErroredOptions'] += len((c.get('branchErrors') or {}).get('options', []))
    out['unavailableOptionsOverBar'] += len((c.get('optionUnavailable') or {}).get('options', []))
    out['cappedOptionsOverWarn'] += len((c.get('branchCapped') or {}).get('options', []))
    out['truncatedLogs'] += len(c.get('unreadableFrameLogs') or [])
    sp.update({'problems': len(c['problems']), 'warnings': len(c.get('warnings') or []), 'problemList': c['problems'][:5], 'warningList': (c.get('warnings') or [])[:5]})
    b = d.get('phaseB')
    if not b:
        continue
    out['spinesDone'] += 1
    if k in SPINES:
        out['spines_' + SPINES[k][0]] += 1
    out['decisions'] += len(b['decisions'])
    out['d479keys'] += 1 if isinstance(b.get('effectSourceNull'), dict) and isinstance(b.get('exileLinksLost'), dict) and 'branchRestarted' in b else 0
    rhos += [x['rho'] for x in b['decisions'] if x['complete'] and x.get('rho') is not None]
    s = b.get('schedule')
    if s:
        out['scheduleKeys'] += 1
        listed = b['baseline']['decisionsListed']
        nscr = len(s.get('screened') or [])
        # (c): branched and planned per decision, from atlas.json's own fields (whatever its branchedInFull counts)
        full = sum(1 for x in b['decisions'] if not x.get('screened'))
        out['branchedInFull'] += s.get('branchedInFull', 0)
        out['decisionsBranched'] += full
        # (b): D489's counters
        fk = all(isinstance(s.get(x), int) for x in ('futileStopped', 'futileControls', 'futileBranchGamesSaved', 'partialLabels')) and isinstance(s.get('futility'), list)
        out['futilityKeys'] += 1 if fk else 0
        fr = s.get('futility') or []
        fsum = {'futilityReads': len(fr), 'futileRead': sum(1 for x in fr if x.get('futile')), 'futileStopped': s.get('futileStopped', 0) or 0,
                'futileControls': s.get('futileControls', 0) or 0, 'futileBranchGamesSaved': s.get('futileBranchGamesSaved', 0) or 0,
                'partialDecisions': sum(1 for x in b['decisions'] if x.get('partial'))}
        for kk, vv in fsum.items():
            out[kk] += vv
        sp.update(fsum)
        out['screened'] += nscr
        out['fill'] += s.get('fill', 0)
        out['stoppedOptions'] += s.get('stoppedOptions', 0)
        plan_ = d['plan']
        want_full = min(plan_['decisions'] if plan_['decisions'] != 'all' else listed, listed - nscr)
        short = 1 if full < want_full else 0
        out['fullShort'] += short
        per = math.ceil(plan_['branchRandom'] / plan_['chunk']) + math.ceil(plan_['branchForge'] / plan_['chunk'])
        scr_units = math.ceil(((plan_.get('cuts') or {}).get('screen') or plan_['branchRandom']) / plan_['chunk'])
        planned = sum(scr_units if x.get('screened') else math.ceil(x['stoppedAt'] / plan_['chunk']) if x.get('partial') else per for x in b['decisions'])
        ok = set()
        uf = os.path.join(dd, 'phaseB', 'units.jsonl')
        if os.path.exists(uf):
            for line in open(uf):
                try:
                    u = json.loads(line)
                except ValueError:
                    continue
                if u.get('ok'):
                    ok.add(u['id'])
        out['unitsPlanned'] += planned
        out['unitsOk'] += len(ok)
        out['unitsShort'] += max(0, planned - len(ok))
        sp.update({'listed': listed, 'branchedInFull': s.get('branchedInFull', 0), 'decisionsBranched': full, 'screened': nscr, 'fill': s.get('fill', 0), 'stoppedOptions': s.get('stoppedOptions', 0),
                   'meanOptions': s.get('meanOptions'), 'unitsPlanned': planned, 'unitsOk': len(ok), 'fullShort': short,
                   'baseline': '%s turns, winner %s' % (b['baseline']['turns'], b['baseline']['winner'])})
out['meanRho'] = round(sum(rhos) / len(rhos), 4) if rhos else None
# the branch rows, live
ROWC = ('chooseSourceGuardRows', 'chooseSourceGuard', 'retargetedRows', 'retargetedOnRows', 'modesDrawnRows', 'modesDrawnOnRows',
        'targetCountTrimmedRows', 'targetCountTrimmedOnRows', 'costTargetAvoidedRows', 'costTargetAvoidedOnRows')
for f in sorted(glob.glob(D + '/' + G + '/phaseB/branches.jsonl')):
    name = os.path.basename(os.path.dirname(os.path.dirname(f)))
    sp = out['bySpine'].setdefault(name, {})
    n = t = 0
    e = dict({'errored': 0, 'unavailable': 0, 'restarted': 0, 'capped': 0, 'effectSourceNull': 0, 'exileLinksLost': 0, 'errorsByKind': {}}, **dict.fromkeys(ROWC, 0))
    for line in open(f):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        n += 1
        if r.get('timedOut'):
            t += 1
            out['branchTimeoutsInStep'] += 1 if r.get('engineError') else 0
        if r.get('unavailable'):
            e['unavailable'] += 1
            kk = re.sub(r'\d+', '#', r['unavailable'])[:160]
            out['unavailableByReason'][kk] = out['unavailableByReason'].get(kk, 0) + 1
        if r.get('error'):
            e['errored'] += 1
            kk = kind_of(r['error'])
            out['errorsByKind'][kk] = out['errorsByKind'].get(kk, 0) + 1
            e['errorsByKind'][kk] = e['errorsByKind'].get(kk, 0) + 1
        e['restarted'] += 1 if (r.get('restarts') or 0) > 0 else 0
        e['capped'] += 1 if r.get('capped') else 0
        if (r.get('effectSourceNull') or 0) > 0:
            e['effectSourceNull'] += 1
            out['effectSourceNullCards'] += r['effectSourceNull']
        if (r.get('exileLinksLost') or 0) > 0:
            e['exileLinksLost'] += 1
            out['exileLinksLostLinks'] += r['exileLinksLost']
        # D484: the ChooseSource guard's counter on the branch row (a count, or true)
        v = r.get('chooseSourceGuard')
        if v is not None:
            out['chooseSourceGuardKeyRows'] += 1
        if isinstance(v, (int, float)) and v > 0:
            e['chooseSourceGuardRows'] += 1
            e['chooseSourceGuard'] += v
        # D485: plays cast after their stale targets were replaced; D486: with modes the seat drew; D488: with their target count cut to a
        # payable one, and with targets drawn away from what their own cost takes (each written when > 0)
        for key in ('retargeted', 'modesDrawn', 'targetCountTrimmed', 'costTargetAvoided'):
            v = r.get(key)
            if isinstance(v, (int, float)) and v > 0:
                e[key + 'Rows'] += 1
                e[key + 'OnRows'] += v
    sp.update({'rows': n, 'timeouts': t, **e})
    out['branchRows'] += n
    out['branchTimeouts'] += t
    out['branchErrored'] += e['errored']
    out['branchUnavailable'] += e['unavailable']
    out['branchRestarted'] += e['restarted']
    out['branchCapped'] += e['capped']
    out['effectSourceNullBranches'] += e['effectSourceNull']
    out['exileLinksLostBranches'] += e['exileLinksLost']
    for key in ROWC:
        out[key] += e[key]
    out['trimmedSpines'] += 1 if e['targetCountTrimmedRows'] else 0
    out['avoidedSpines'] += 1 if e['costTargetAvoidedRows'] else 0
if out['branchRows']:
    out['timeoutShare'] = round(out['branchTimeouts'] / out['branchRows'], 5)
# the worker logs: Forge's refused payments by card, the payment failures, D488's errored-branch stacks
for dd in sorted(glob.glob(D + '/' + G)):
    lfs = sorted(glob.glob(dd + '/phaseB/logs/*.log'))
    if not lfs:
        continue
    name = os.path.basename(dd)
    ftp = pay = stk = 0
    byc = {}
    for lf in lfs:
        with open(lf, errors='replace') as fh:
            for l in fh:
                if 'AI failed to play' in l:
                    ftp += 1
                    mm = FTP.search(l)
                    nm = mm.group(1) if mm else '?'
                    byc[nm] = byc.get(nm, 0) + 1
                if "Didn't find what to pay for" in l:
                    pay += 1
                if 'branch error, stack:' in l:
                    stk += 1
    out['bySpine'].setdefault(name, {}).update({'failedToPlay': ftp, 'failedToPlayByCard': byc, 'payFail': pay, 'branchErrorStacks': stk})
    out['failedToPlay'] += ftp
    out['payFail'] += pay
    out['branchErrorStacks'] += stk
    for nm, v in byc.items():
        out['failedToPlayByCard'][nm] = out['failedToPlayByCard'].get(nm, 0) + v
# the refused and lost casts and D486-D488's counters, from metrics.py --scan's v5 caches (a cache of another atlas.json or scan is not read)
for f in sorted(glob.glob(D + '/' + G + '/atlas.json')):
    name = os.path.basename(os.path.dirname(f))
    try:
        c = json.load(open(CD + '/' + name + '.json'))
    except (OSError, ValueError):
        continue
    if c.get('atlasMtime') != int(os.path.getmtime(f)) or c.get('scan') != SCAN_V:
        continue
    sp = out['bySpine'].setdefault(name, {})
    sp.update({k: c.get(k, 0) for k in SCAN_KEYS})
    sp.update({'cardTargetShare': c.get('cardTargetShare'), 'refusedCastShare': c.get('refusedCastShare'), 'castsRefusedShare': c.get('castsRefusedShare'),
               'completeShare': c.get('completeShare'), 'lostCastOptions': len(c['lostCastOptions']), 'refusedCastOptions': len(c['refusedCastOptions']),
               'lostCastCards': c.get('byName') or {}, 'lostPutBackCards': c.get('byNamePutBack') or {}, 'refusedCastCards': c.get('byNameRefused') or {},
               'scanLogs': c['logs']})
    out['lostCastScanned'] += 1
    out['scanLogs'] += c['logs']
    for k in SCAN_KEYS:
        out[k] += c.get(k, 0)
    out['cardTargetSpines'] += 1 if c.get('cardTargetOffered', 0) > 0 else 0
    out['lostCastOptions'] += len(c['lostCastOptions'])
    out['lostCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['lostCastOptions']]
    out['refusedCastOptions'] += len(c['refusedCastOptions'])
    out['refusedCastOptionList'] += ['%s %s' % (key_of(name), x) for x in c['refusedCastOptions']]
    for src, dst in (('byName', 'lostCastCards'), ('byNamePutBack', 'lostPutBackCards'), ('byNameRefused', 'refusedCastCards')):
        for nm, v in (c.get(src) or {}).items():
            out[dst][nm] = out[dst].get(nm, 0) + v
out['legacyNullTargetRecords'] = out['legacyNullTargets']
out['cardTargetShare'] = round(out['cardTargetOffered'] / out['randomisedPriority'], 4) if out['randomisedPriority'] else None
out['refusedCastShare'] = round(out['refusedCast'] / out['casts'], 5) if out['casts'] else None
out['castsRefusedShare'] = round(out['castsRefused'] / out['casts'], 5) if out['casts'] else None
out['completeShare'] = round(out['targetRecordsComplete'] / out['targetRecords'], 4) if out['targetRecords'] else None
# the validation draw: 13 folders of 2 decks, the sha256 the pilot recorded, and no spine folder of its own
vd = sorted(glob.glob(D + '/validation/v*'))
out['validationFolders'] = len(vd)
h = hashlib.sha256()
try:
    for v in vd:
        h.update(open(os.path.join(v, 'decks.jsonl'), 'rb').read())
        for x in sorted(glob.glob(os.path.join(v, 'decks', '*.dck'))):
            h.update(os.path.basename(x).encode() + b'\0' + open(x, 'rb').read())
            out['validationDecks'] += 1
    out['validationShaOk'] = 1 if VALIDATION_SHA and h.hexdigest() == VALIDATION_SHA else 0
except OSError:
    pass
out['validationBranched'] += len(glob.glob(D + '/validation/*/plan.json')) + len(glob.glob(D + '/validation/*/phaseB'))
try:
    r = json.load(open(D + '/report/reads.json'))
    out['reads'] = 1 if len(r['spines']) == 13 and r['forgeSpines'] == ['s01', 's07', 's13'] and len(r['iv_bySpine']) == 3 else 0
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    lb = json.load(open(D + '/report/labels.json'))
    sha = open(L + '/sha.txt').read().strip()
    out.update({'labels': lb['labels'], 'confident': lb['confident'], 'rowsUnmatched': lb['rowsUnmatched'], 'voidLabels': lb['voidLabels'],
                'branchedRows': lb['branched'], 'trainingRows': lb['trainingRows'], 'lostCastVoid': lb['lostCastVoid'], 'refusedCastVoid': lb['refusedCastVoid'],
                'confidentPer7Worker10hNight': lb['c_sizing7']['asRun']['confidentPer7Worker10hNight'],
                'confidentPer7Poisson95': lb['c_sizingRead'].get('poisson95'), 'partialLabels': lb['partialLabels'], 'confidentPartial': lb['confidentPartial'],
                'futilityControls': lb['futilityControls'], 'confidentPerWorkerHour': lb['c_sizingRead'].get('confidentPerWorkerHour')})
    # each spine's rows carry its band's D508 pool, its seeds, D483's listing, D508's population, the pin, and a v5 scan
    out['poolOk'] = sum(1 for n, m in lb['bySpine'].items() if n in SPINES and m['pool'] == 'random-%s-d508' % SPINES[n][0]
                        and m['deckSeed'] == SPINES[n][1] and m['gameSeed'] == SPINES[n][2] and m['forgeMap'] == (SPINES[n][3] > 0)
                        and m['listing'] == 'D483' and m['randomSeat'] == 'D508' and m['sha'] == sha and m['lostScanned'] is True and m['scanV5'] is True)
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    nc = json.load(open(D + '/report/ncurve.json'))
    out['ncurve'] = 1 if len(nc['bySpine']) == 13 and nc['complete'] == out['labels'] and sorted(nc['atN']) == ['100', '150', '50'] else 0
except (OSError, ValueError, KeyError, TypeError):
    pass
try:
    cp = json.load(open(D + '/report/compare-j191.json'))
    out['compare'] = 1 if len(cp['bySpine']) == 13 and all(v['this'].get('labels') is not None for v in cp['bySpine'].values()) else 0
except (OSError, ValueError, KeyError, TypeError, AttributeError):
    pass
print(json.dumps(out))

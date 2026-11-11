#!/usr/bin/env python3
# mtg-table — tools/atlas: the label probe's agreement read -- how often each player picks the judged label.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The label probe's agreement read (D538): for each ladder player, the share of the labelled atlas decisions at which
it picks the label, beside the share at which it picks option 0 (Forge's own move), with 95% bootstrap intervals
clustered by spine; and for each pair of players the paired difference in agreement.

    python3 -I tools/atlas/agreement.py --labels LABELS.jsonl [--players a,b,...] [--pairs A:B,A:C,...]
        [--split FIELD=VALUE] [--off-atlas miss|drop] [--rule d538] [--boot 2000] [--seed 1] [--json OUT.json]
        ROWS.jsonl ...

READS the labels (one JSON object a line: `key` <night>/<spine>/d<d>, `kind` p/a/b, `label` the option both judges
chose or null, `night`, `spine`) and the probe's rows (tools/label-probe.sh: `key`, `player`, `seat`, `hash`,
`repeat`, `status`, `option`). WRITES the read as text to stdout (four decimals) and, with --json, as one JSON
object to that file (unrounded: a rule is read from these numbers, never from the text; a file that exists and is
not an earlier read is not overwritten). Standard library only; no engine.

Definitions, fixed before any probe data:
  labelled      a labels row whose `label` is not null; nothing else is read from the labels.
  a row         the last row of (player, key, repeat) whose status is not `error` (an error is retried by a rerun of
                the probe and appended after); a (player, key, repeat) with errors only is an error.
  answered      a repeat whose status is `ok` (a pick: its `option`) or `off-atlas` (a pick that is no option: never
                the label, never option 0). `ambiguous` (a pick whose token names two options), `mismatch` (the replay
                was not the baseline's position) and `unsupported` are no answer, and are counted.
  a decision    counts once, by its mean over its answered repeats: agreement = the share of them that picked the
                label, option-0 share = the share that picked option 0. A decision with no answered repeat is left
                out of every share and counted.
  subsets       all; by kind (p, a, b); `label!=forge` (the label is not option 0) and `label=forge` (it is); and,
                with --split FIELD=VALUE, `FIELD=VALUE` and `FIELD!=VALUE` by that field of the labels row (D538 reads
                `source!=round2`, the rows nobody selected).
  interval      95% percentile bootstrap over spines (night/spine): --boot resamples of the spines with replacement,
                one fixed draw (--seed) shared by every statistic, so two players' intervals and their pair's come
                from the same resamples; a resample with no decision in a subset is skipped for it.
  pair A - B    over the labelled decisions both players answered: the mean of (A's agreement - B's), its interval
                the same bootstrap; on every subset. --pairs names the pairs and their direction (A:B is A - B);
                without it, every pair of the players read, the earlier-named minus the later.
  departures    a player's answered picks that are not option 0 (off-atlas among them). Departure precision = the
                share of them that are the label: the sum over decisions of (the share of picks that are the label,
                where the label is not option 0) over the sum of (the share of picks that are not option 0); its
                interval the same bootstrap, of that ratio. It decides nothing in D538.
  --off-atlas   `miss` (the default): as above. `drop`: an off-atlas repeat is no answer.
  mixed         an answered decision one of whose repeats is no answer (its mean is over the answered ones only).
  otherIdentity an answered repeat whose picked option shares the pick's token but not its play identity.
A player whose rows carry two seat configs is refused (two experiments under one name).

--rule d538 prints D538's stops and word (point 6 and point 7) from the same numbers. It refuses (exit 2) anything
but D538's own read: its three pairs, --split source=round2, --off-atlas miss, --boot 4000, --seed 538, and the
labels file D538 names (515 labelled decisions, by its sha256). Its stops look at every player in the rows, whatever
--players names. And it refuses rows that are not one run of the probe under --seed 538 (D538 point 4): a row with
no player or key, a key the labels file does not hold, a repeat that is not 0, 1, 2, ... below the player's repeats,
a status that is not one of the six, an `ok` row whose option is not one of the label row's `k` options or whose `k`
is another, a `searched` that is not true, false or null, a `seed` that is not the probe's own for (538, key,
repeat), two rows of one (player, key, repeat) that are not errors or more rows of one than the probe's two tries
write, and a player whose rows carry a config hash that is not the registered seat's. Two runs that share a (player,
key, repeat), or one made under another seed, are refused by these and never merged; two runs over disjoint repeats
under the one seed read as one resumed run (the probe resumes its --out the same way), so a smoke run writes an --out
of its own and that file is not handed to the read. And the run must be whole: each of the five registered seats has
a row, an error row among them, at every (decision, repeat) of the labels file, labelled or not, or the read is NOT
READ (a probe that stopped part-way, a seat left out, rows deleted or lost to a torn line).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys

ANSWERED = ('ok', 'off-atlas')
NO_ANSWER = ('ambiguous', 'mismatch', 'unsupported', 'error')
# AtlasProbe.ERROR_TRIES: the rows one (player, key, repeat) can have in one --out (an error is tried once more)
ERROR_TRIES = 2
# what audit() counts, each a row (or, for the last two, a (player, key, repeat)) one run of the probe never writes
AUDIT = ('unkeyed', 'unknownKey', 'badRepeat', 'unknownStatus', 'badOption', 'badSearched', 'seedMismatch',
         'duplicates', 'overTries')
M64 = (1 << 64) - 1
SUBSETS = ('all', 'p', 'a', 'b', 'label!=forge', 'label=forge')


def read_jsonl(path):
    """Every JSON object a line of a file; a line that does not parse (a torn last line) or is no object is
    skipped. (--rule d538 notices a lost row: every (decision, repeat) of a registered seat must have one.)"""
    out = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if isinstance(row, dict):
                out.append(row)
    return out


def cluster_of(row):
    """The spine a key belongs to: night/spine, from the row's fields or its key."""
    if row.get('night') and row.get('spine'):
        return '%s/%s' % (row['night'], row['spine'])
    return '/'.join(str(row['key']).split('/')[:2])


def parse_split(text):
    """'FIELD=VALUE' -> (FIELD, VALUE)."""
    field, eq, value = text.partition('=')
    if not eq or not field or not value:
        raise ValueError('--split wants FIELD=VALUE, got %r' % text)
    return field, value


def load_labels(rows, split=None):
    """key -> {kind, label, cluster, split} for every labelled row (label not null); `split` is whether the row's
    field is the value (None without a split)."""
    out = {}
    for r in rows:
        if r.get('label') is None:
            continue
        out[r['key']] = {'kind': r.get('kind'), 'label': int(r['label']), 'cluster': cluster_of(r),
                         'split': None if split is None else str(r.get(split[0])) == split[1]}
    return out


def subsets_of(split):
    if split is None:
        return SUBSETS
    return SUBSETS + ('%s=%s' % split, '%s!=%s' % split)


def _mix(z):
    """ExploreMath.mix, on an unsigned 64-bit value."""
    z = ((z ^ (z >> 30)) * 0xbf58476d1ce4e5b9) & M64
    z = ((z ^ (z >> 27)) * 0x94d049bb133111eb) & M64
    return z ^ (z >> 31)


def repeat_seed(seed, key, repeat):
    """LabelProbe.repeatSeed: the seed the probe gives repeat `repeat` of decision `key` under --seed `seed`, the
    `seed` of that row. The Java walks the key's UTF-16 units; so does this."""
    h = _mix(0x9E3779B97F4A7C15 ^ 0x50524F4245)
    h = _mix(h ^ (seed & M64))
    units = key.encode('utf-16-le')
    for i in range(0, len(units), 2):
        h = _mix(h ^ (units[i] | units[i + 1] << 8))
    h = _mix(h ^ ((repeat + 11) & M64)) & 0x7FFFFFFFFFFF
    return h or 1


def audit(probe_rows, label_rows, probe_seed=None):
    """The rows as the files hold them, before collect() keeps one row of each (player, key, repeat): the counts of
    AUDIT, the first offending row of each (`first`), every player's highest repeat (`repeatMax`) and the config
    hashes its rows carry (`hashes`, '' for a row with none), the labels file's keys (`keys`) and for every player
    the (key, repeat)s of them it has a row at (`cells`). `seedMismatch` is counted only under a probe_seed and is
    None without one (no seed was looked at). Nothing here stops a read; --rule d538 refuses a read whose counts
    are not all 0 and does not read one whose registered seats lack a cell."""
    ks = {r['key']: r.get('k') for r in label_rows if isinstance(r.get('key'), str)}
    counts = dict.fromkeys(AUDIT, 0)
    if probe_seed is None:
        counts['seedMismatch'] = None
    first = {}
    cells = {}
    seen = {}
    rep_max = {}
    hashes = {}

    def bad(what, r, said=None):
        counts[what] += 1
        first.setdefault(what, said or '%s %s repeat %s status %s option %s' % (
            r.get('player'), r.get('key'), r.get('repeat'), r.get('status'), r.get('option')))

    for r in probe_rows:
        p, key, rep, st = r.get('player'), r.get('key'), r.get('repeat'), r.get('status')
        if not isinstance(p, str) or not isinstance(key, str):
            bad('unkeyed', r)
            continue
        h = r.get('hash') or ''
        hashes.setdefault(p, set()).add(h if isinstance(h, str) else repr(h))
        if key not in ks:
            bad('unknownKey', r)
        if type(rep) is not int or rep < 0:
            bad('badRepeat', r)
        else:
            rep_max[p] = max(rep_max.get(p, -1), rep)
            if key in ks:
                cells.setdefault(p, set()).add((key, rep))
            if probe_seed is not None and r.get('seed') != repeat_seed(probe_seed, key, rep):
                bad('seedMismatch', r)
        if st not in ANSWERED + NO_ANSWER:
            bad('unknownStatus', r)
        if st == 'ok':
            o, k = r.get('option'), ks.get(key)
            if type(o) is not int or o < 0 or (type(k) is int and (o >= k or r.get('k') != k)):
                bad('badOption', r)
        if r.get('searched') is not None and type(r.get('searched')) is not bool:
            bad('badSearched', r)
        n = seen.setdefault((p, key, rep if type(rep) is int else repr(rep)), [0, 0])
        n[0] += 1
        n[1] += 0 if st == 'error' else 1
    for (p, key, rep), (rows, settled) in seen.items():
        said = '%s %s repeat %s: %d rows, %d not errors' % (p, key, rep, rows, settled)
        if settled > 1:
            bad('duplicates', None, said)
        if rows > ERROR_TRIES:
            bad('overTries', None, said)
    return {'probeSeed': probe_seed, 'counts': counts, 'first': first, 'keys': len(ks),
            'cells': {p: len(c) for p, c in sorted(cells.items())},
            'repeatMax': dict(sorted(rep_max.items())), 'hashes': {p: sorted(h) for p, h in sorted(hashes.items())}}


def collect(rows):
    """player -> {'seats': set, 'hash': str|None, 'reps': {(key, repeat): row}}: the last non-error row of each
    (player, key, repeat), else its last error row."""
    players = {}
    for r in rows:
        p, rep = r.get('player'), r.get('repeat')
        if not isinstance(p, str) or not isinstance(r.get('key'), str):
            continue
        e = players.setdefault(p, {'seats': set(), 'hash': None, 'reps': {}})
        if r.get('seat') is not None:
            e['seats'].add(r['seat'] if isinstance(r['seat'], str) else repr(r['seat']))
        if r.get('hash'):
            e['hash'] = r['hash']
        k = (r['key'], rep if rep is None or type(rep) in (int, str, float, bool) else repr(rep))
        old = e['reps'].get(k)
        if old is None or r.get('status') != 'error' or old.get('status') == 'error':
            e['reps'][k] = r
    return players


def decisions(reps, labels, answered=ANSWERED):
    """key -> {'agree', 'zero', 'n'} over a player's answered repeats of labelled decisions, and the counts of what
    was not answered (decisions, by their repeats' statuses); repeatsMin and repeatsMax are the fewest and the most
    rows a probed labelled decision has, answered or not."""
    by_key = {}
    for (key, _rep), r in reps.items():
        if key in labels:
            by_key.setdefault(key, []).append(r)
    vals = {}
    counts = {'labelled': len(labels), 'probed': len(by_key), 'answered': 0, 'repeats': 0, 'offAtlas': 0,
              'searched': 0, 'stable': 0, 'mixed': 0, 'otherIdentity': 0, 'off-atlas': 0, 'other': 0,
              'repeatsMin': min((len(rs) for rs in by_key.values()), default=0),
              'repeatsMax': max((len(rs) for rs in by_key.values()), default=0)}
    for s in NO_ANSWER:
        counts[s] = 0
    for key, rs in by_key.items():
        lab = labels[key]['label']
        ans = [r for r in rs if r.get('status') in answered]
        if not ans:
            # the decision's status: the first of the no-answer statuses its repeats carry, in NO_ANSWER's order
            # (then off-atlas, which is no answer under --off-atlas drop)
            st = [r.get('status') for r in rs]
            for s in NO_ANSWER + ('off-atlas',):
                if s in st:
                    counts[s] += 1
                    break
            else:
                counts['other'] += 1    # a status this read does not know
            continue
        picks = [r.get('option') if r.get('status') == 'ok' else None for r in ans]
        vals[key] = {'agree': sum(1 for o in picks if o == lab) / len(picks),
                     'zero': sum(1 for o in picks if o == 0) / len(picks), 'n': len(picks)}
        counts['answered'] += 1
        counts['repeats'] += len(picks)
        counts['offAtlas'] += 1 if any(o is None for o in picks) else 0
        counts['searched'] += sum(1 for r in ans if r.get('searched') is True)
        counts['stable'] += 1 if len(set(picks)) == 1 else 0
        counts['mixed'] += 1 if len(ans) < len(rs) else 0
        counts['otherIdentity'] += sum(1 for r in ans if r.get('sameIdentity') is False)
    return vals, counts


def row_counts(reps):
    """Over every row of a player, labelled or not: rows, ok rows, ok rows on option 0, off-atlas rows, rows whose
    search ran."""
    rs = list(reps.values())
    ok = [r for r in rs if r.get('status') == 'ok']
    return {'rows': len(rs), 'ok': len(ok), 'okOption0': sum(1 for r in ok if r.get('option') == 0),
            'offAtlas': sum(1 for r in rs if r.get('status') == 'off-atlas'),
            'searched': sum(1 for r in rs if r.get('searched') is True)}


def in_subset(lab, subset):
    if subset == 'all':
        return True
    if subset in ('p', 'a', 'b'):
        return lab['kind'] == subset
    if subset == 'label!=forge':
        return lab['label'] != 0
    if subset == 'label=forge':
        return lab['label'] == 0
    if lab.get('split') is not None and '=' in subset:
        return lab['split'] != ('!=' in subset)
    raise ValueError(subset)


def resamples(clusters, boot, seed):
    """boot resamples of the cluster indices, with replacement, from one seeded draw."""
    rng = random.Random(seed)
    m = len(clusters)
    return [[rng.randrange(m) for _ in range(m)] for _ in range(boot)] if m else []


def percentile(xs, q):
    """The q-quantile of sorted xs, linearly interpolated."""
    if not xs:
        return None
    pos = q * (len(xs) - 1)
    i = int(pos)
    if i + 1 >= len(xs):
        return xs[-1]
    return xs[i] + (xs[i + 1] - xs[i]) * (pos - i)


def ratio_ci(values, clusters, draws):
    """values: [(cluster, num, den)]; sum(num) / sum(den), and its 95% percentile interval over the resampled
    clusters (a resample whose den sums to 0 is skipped). n is the number of values whose den is not 0."""
    den_all = sum(d for _, _, d in values)
    n_all = sum(1 for _, _, d in values if d)
    if not den_all:
        return {'n': n_all, 'mean': None, 'lo': None, 'hi': None}
    index = {c: i for i, c in enumerate(clusters)}
    s = [0.0] * len(clusters)
    n = [0.0] * len(clusters)
    for c, x, d in values:
        s[index[c]] += x
        n[index[c]] += d
    reps = []
    for draw in draws:
        ts = 0.0
        tn = 0.0
        for i in draw:
            ts += s[i]
            tn += n[i]
        if tn:
            reps.append(ts / tn)
    reps.sort()
    return {'n': n_all, 'mean': sum(x for _, x, _ in values) / den_all,
            'lo': percentile(reps, 0.025), 'hi': percentile(reps, 0.975)}


def mean_ci(values, clusters, draws):
    """values: [(cluster, x)]; the mean, and its 95% percentile interval over the resampled clusters."""
    return ratio_ci([(c, x, 1) for c, x in values], clusters, draws)


def summarize(label_rows, probe_rows, players=None, boot=2000, seed=1, pairs=None, split=None, off_atlas='miss',
              probe_seed=None, labels_sha=None):
    """The whole read as one dict (what --json writes). pairs: [(a, b)] for a - b, in that direction; None for
    every pair of the players read. split: (field, value) of the labels rows. off_atlas: 'miss' or 'drop'.
    probe_seed: the probe's --seed, for audit()'s seed check; labels_sha: the labels file's sha256, carried."""
    if off_atlas not in ('miss', 'drop'):
        raise ValueError('--off-atlas is miss or drop, not %r' % off_atlas)
    labels = load_labels(label_rows, split)
    subs = subsets_of(split)
    clusters = sorted({v['cluster'] for v in labels.values()})
    draws = resamples(clusters, boot, seed)
    got = collect(probe_rows)
    for p, e in got.items():
        if len(e['seats']) > 1:
            raise ValueError('player %s has rows made with %d seat configs: %s' % (p, len(e['seats']), sorted(e['seats'])))
    names = list(players) if players else sorted(got)
    for a, b in pairs or []:
        if a == b:
            raise ValueError('a pair of %s with itself' % a)
        for p in (a, b):
            if p not in names:
                names.append(p)
    out = {'v': 3, 'decision': 'D538',
           'labels': {'labelled': len(labels), 'spines': len(clusters), 'sha256': labels_sha},
           'audit': audit(probe_rows, label_rows, probe_seed),
           'boot': boot, 'seed': seed, 'offAtlas': off_atlas, 'split': '%s=%s' % split if split else None,
           'subsets': list(subs), 'players': {}, 'pairs': [],
           # every player in the rows, read or not: a rule's stops must not depend on --players
           'allRows': {p: row_counts(e['reps']) for p, e in sorted(got.items())}}
    per = {}
    for p in names:
        e = got.get(p, {'seats': set(), 'hash': None, 'reps': {}})
        vals, counts = decisions(e['reps'], labels, ANSWERED if off_atlas == 'miss' else ('ok',))
        per[p] = vals
        stats = {}
        for sub in subs:
            keys = [k for k in vals if in_subset(labels[k], sub)]
            stats[sub] = {'n': len(keys),
                          'label': mean_ci([(labels[k]['cluster'], vals[k]['agree']) for k in keys], clusters, draws),
                          'zero': mean_ci([(labels[k]['cluster'], vals[k]['zero']) for k in keys], clusters, draws)}
        dep = ratio_ci([(labels[k]['cluster'], v['agree'] if labels[k]['label'] != 0 else 0.0, 1.0 - v['zero'])
                        for k, v in vals.items()], clusters, draws)
        dep['departures'] = sum(1.0 - v['zero'] for v in vals.values())
        out['players'][p] = {'hash': e['hash'], 'seat': next(iter(e['seats'])) if e['seats'] else None,
                             'counts': counts, 'rows': row_counts(e['reps']), 'stats': stats, 'departure': dep}
    if pairs is None:
        pairs = [(a, b) for i, a in enumerate(names) for b in names[i + 1:]]
    for a, b in pairs:
        both = sorted(set(per[a]) & set(per[b]))
        by_sub = {}
        for sub in subs:
            keys = [k for k in both if in_subset(labels[k], sub)]
            by_sub[sub] = mean_ci([(labels[k]['cluster'], per[a][k]['agree'] - per[b][k]['agree']) for k in keys],
                                  clusters, draws)
        out['pairs'].append(dict(by_sub['all'], a=a, b=b, subsets=by_sub))
    return out


# D538 point 7's three pairs, A - B, and the subset its unselected rows are (--split source=round2)
D538_PAIRS = (('search-v1-anytime', 'forge-default'), ('search-v1-anytime', 'search-v2-rrandom'),
              ('search-v1-anytime', 'search-v2-rrandom4'))
D538_SPLIT = ('source', 'round2')
D538_UNSELECTED = 'source!=round2'
D538_PLAYERS = ('search-v1-anytime', 'forge-default', 'search-v2-rrandom', 'search-v2-rrandom4')
D538_UNSEARCHED = ('forge-default', 'policy-outlet')
D538_ANSWERED = 0.95
# point 7's run: the bootstrap, the probe's --seed, labels-judged-v1.jsonl (its labelled decisions and its sha256),
# the look this is (point 9 allows two), the repeats a decision, and the registered seats' config hashes
# (`ai-ladder.sh cfg NAME`; a player not named here is probed under whatever hash its rows carry, one hash a player).
# Point 9's second reading is over another labels file: the decision that buys wave 2 writes that file's count and
# sha256 here and makes `look` 2, and nothing else.
D538_RUN = {'boot': 4000, 'seed': 538, 'probeSeed': 538, 'labelled': 515, 'look': 1,
            'labelsSha256': 'bbdcd021ef93447f9158bff1f7f2a3c236f91ea98367374b3fc213a654ecd9bb',
            'repeats': {'search-v1-anytime': 3, 'forge-default': 1, 'search-v2-rrandom': 3, 'search-v2-rrandom4': 3,
                        'policy-outlet': 1},
            'hashes': {'search-v1-anytime': 'cdd55e02a89c', 'forge-default': '3ed453ffef1c',
                       'search-v2-rrandom': 'fb8ae32c014d', 'search-v2-rrandom4': '646d59a008f6',
                       'policy-outlet': 'e350d94649a4'}}


def d538(s, run=None):
    """D538's reading of a summary: {'word', 'stops': [..], 'why': [..], ...}. A read that is not point 7's own (its
    split, its pairs, off-atlas a miss, and `run`: the bootstrap's draws and seed, the labels file by count and
    sha256) is refused with ValueError, and so are rows that are not one run of the probe under `run`'s probeSeed
    (audit()'s counts, a repeat at or past a player's repeats, a config hash that is not the registered seat's).
    Then point 6's stops, each a stop (VOID: forge-default has an ok row off option 0 or an off-atlas row; NOT
    READ: a player that must not search did, one of the four answered under 95% of the labels, does not have its
    repeats at every probed decision or answered under 95% of its repeats, one of the run's five seats lacks a row
    at a (decision, repeat) of the labels file, or a pair of the rule has no decision or no interval); then point
    7's word, from the unrounded numbers with strict inequalities, DOES NOT TRACK tested
    before TRACKS. `run` is D538_RUN but for the unit tests."""
    run = D538_RUN if run is None else run
    if s.get('split') != '%s=%s' % D538_SPLIT or s.get('offAtlas') != 'miss':
        raise ValueError('--rule d538 reads --split %s=%s and --off-atlas miss' % D538_SPLIT)
    if (s.get('boot'), s.get('seed')) != (run['boot'], run['seed']):
        raise ValueError('--rule d538 reads --boot %d --seed %d, not --boot %s --seed %s'
                         % (run['boot'], run['seed'], s.get('boot'), s.get('seed')))
    if s['labels']['labelled'] != run['labelled']:
        raise ValueError('--rule d538 reads %d labelled decisions; these labels have %d'
                         % (run['labelled'], s['labels']['labelled']))
    if s['labels'].get('sha256') != run['labelsSha256']:
        raise ValueError('--rule d538 reads the labels file whose sha256 is %s; this one is %s'
                         % (run['labelsSha256'], s['labels'].get('sha256')))
    au = s.get('audit') or {}
    if au.get('probeSeed') != run['probeSeed']:
        raise ValueError("--rule d538 checks every row's seed against the probe's --seed %d; this read checked %s"
                         % (run['probeSeed'], au.get('probeSeed')))
    wrong = ['%d %s (first: %s)' % (n, what, au['first'].get(what)) for what, n in au['counts'].items() if n]
    if au['counts'].get('seedMismatch') is None:
        wrong.append('seeds that were not checked')
    if wrong:
        raise ValueError('--rule d538 reads the rows of one run of the probe under --seed %d; these hold %s'
                         % (run['probeSeed'], '; '.join(wrong)))
    for p, want in run['repeats'].items():
        if au['repeatMax'].get(p, -1) >= want:
            raise ValueError('--rule d538 reads %d repeat(s) of %s; these rows hold its repeat %d'
                             % (want, p, au['repeatMax'][p]))
    for p, want in run['hashes'].items():
        if p in au['hashes'] and au['hashes'][p] != [want]:
            raise ValueError("--rule d538 reads %s under the config hash %s; these rows carry %s"
                             % (p, want, ', '.join(h or 'none' for h in au['hashes'][p])))
    found = {(d['a'], d['b']): d for d in s['pairs']}
    for ab in D538_PAIRS:
        if ab not in found:
            raise ValueError('--rule d538 needs the pair %s:%s' % ab)
    stops = []
    every = s['allRows']
    fd = every.get('forge-default', {'ok': 0, 'okOption0': 0, 'offAtlas': 0})
    if fd['okOption0'] != fd['ok'] or fd['offAtlas']:
        stops.append('VOID: forge-default is off option 0 at %d of its %d ok rows and off the atlas at %d rows'
                     % (fd['ok'] - fd['okOption0'], fd['ok'], fd['offAtlas']))
    for p in D538_UNSEARCHED:
        if p in every and every[p]['searched']:
            stops.append('NOT READ: %s searched at %d rows' % (p, every[p]['searched']))
    for p in D538_PLAYERS:
        c = s['players'][p]['counts']
        if not c['labelled'] or c['answered'] < D538_ANSWERED * c['labelled']:
            stops.append('NOT READ: %s answered %d of %d labelled decisions, under %.0f%%'
                         % (p, c['answered'], c['labelled'], 100 * D538_ANSWERED))
        want = run['repeats'][p]
        if c['probed'] and (c['repeatsMin'], c['repeatsMax']) != (want, want):
            stops.append('NOT READ: %s has %d to %d rows a labelled decision, not %d'
                         % (p, c['repeatsMin'], c['repeatsMax'], want))
        if c['repeats'] < D538_ANSWERED * want * c['labelled']:
            stops.append('NOT READ: %s answered %d of its %d repeats of the labelled decisions, under %.0f%%'
                         % (p, c['repeats'], want * c['labelled'], 100 * D538_ANSWERED))
    # the run is whole: every (decision, repeat) of the labels file, labelled or not, has a row of each of the five
    # seats (an error row is a row). Unknown keys and repeats past a seat's were refused above, so the count says it.
    for p, want in run['repeats'].items():
        have, full = au['cells'].get(p, 0), want * au['keys']
        if have != full:
            stops.append('NOT READ: %s has a row at %d of the %d (decision, repeat)s of the run (%d decisions, %d '
                         'repeat(s)): the probe is not finished or its rows are not all here'
                         % (p, have, full, au['keys'], want))
    p1, p2, p3 = (found[ab] for ab in D538_PAIRS)
    p1u = p1['subsets'][D538_UNSELECTED]
    why = ['P1 %s' % ci(p1, True), 'P1 on %s %s (n %d)' % (D538_UNSELECTED, ci(p1u, True), p1u['n']),
           'P2 %s' % ci(p2, True), 'P3 %s' % ci(p3, True)]
    if stops:
        word = 'VOID' if any(x.startswith('VOID') for x in stops) else 'NOT READ'
    elif any(d['mean'] is None for d in (p1, p2, p3, p1u)):
        word = 'NOT READ'
        stops.append('NOT READ: a pair of the rule (P1 on %s among them) has no decision both players answered'
                     % D538_UNSELECTED)
    elif any(d['hi'] is None or d['lo'] is None for d in (p1, p2, p3, p1u)):
        word = 'NOT READ'
        stops.append('NOT READ: a pair of the rule (P1 on %s among them) has no interval (no resample held a '
                     'decision of it)' % D538_UNSELECTED)
    elif any(d['hi'] < 0 for d in (p1, p2, p3)):
        word = 'AGREEMENT DOES NOT TRACK ELO'
    elif (p1['lo'] > 0 and p1u['mean'] > 0 and p2['mean'] > 0 and p3['mean'] > 0
          and (p2['lo'] > 0 or p3['lo'] > 0)):
        word = 'AGREEMENT TRACKS ELO'
    else:
        word = 'INCONCLUSIVE'
    above = p1['mean'] is not None and p1['mean'] > 0
    above_u = p1u['mean'] is not None and p1u['mean'] > 0
    above_23 = any(d['mean'] is not None and d['mean'] > 0 for d in (p2, p3))
    # point 9: wave 2 is bought on the first look only -- on TRACKS, and on an INCONCLUSIVE whose P1 point is above
    # 0 on all the labels and on the unselected ones and whose P2 or P3 point is above 0. The second look (on wave
    # 2's labels) is final and buys nothing.
    return {'word': word, 'stops': stops, 'why': why, 'look': run['look'], 'p1PointAboveZero': above,
            'p1UnselectedPointAboveZero': above_u, 'p2OrP3PointAboveZero': above_23,
            'wave2': run['look'] == 1 and (word == 'AGREEMENT TRACKS ELO'
                                           or (word == 'INCONCLUSIVE' and above and above_u and above_23))}


def fmt(x, signed=False):
    if x is None:
        return '  n/a'
    return ('%+.4f' if signed else '%.4f') % x


def ci(m, signed=False):
    return '%s [%s, %s]' % (fmt(m['mean'], signed), fmt(m['lo'], signed), fmt(m['hi'], signed))


def text(s):
    """The read as text."""
    lines = ['labels: %d labelled decisions over %d spines; bootstrap %d by spine, seed %d; off-atlas is %s'
             % (s['labels']['labelled'], s['labels']['spines'], s['boot'], s['seed'],
                'a miss' if s['offAtlas'] == 'miss' else 'no answer')]
    for p, e in s['players'].items():
        c = e['counts']
        lines.append('')
        lines.append('%s%s: %d of %d answered (%d probed); not answered: %d mismatch, %d unsupported, %d ambiguous, '
                     '%d error%s; %d off-atlas; %.2f repeats a decision; searched %s of answers; repeats agree on %s; '
                     '%d mixed; %d other identity'
                     % (p, ' (%s)' % e['hash'] if e['hash'] else '', c['answered'], c['labelled'], c['probed'],
                        c['mismatch'], c['unsupported'], c['ambiguous'], c['error'],
                        ', %d off-atlas only' % c['off-atlas'] if c['off-atlas'] else '', c['offAtlas'],
                        c['repeats'] / c['answered'] if c['answered'] else 0,
                        '%.1f%%' % (100 * c['searched'] / c['repeats']) if c['repeats'] else 'n/a',
                        '%.1f%%' % (100 * c['stable'] / c['answered']) if c['answered'] else 'n/a',
                        c['mixed'], c['otherIdentity']))
        lines.append('  %-16s %5s   %-28s %-28s' % ('', 'n', 'picks the label', 'picks option 0'))
        for sub in s['subsets']:
            st = e['stats'][sub]
            lines.append('  %-16s %5d   %-28s %-28s' % (sub, st['n'], ci(st['label']), ci(st['zero'])))
        d = e['departure']
        lines.append('  departures: %.1f picks that are not option 0 at %d decisions; the label at %s of them'
                     % (d['departures'], d['n'], ci(d)))
    if s['pairs']:
        lines.append('')
        lines.append('pairs: agreement with the label, A - B, over the decisions both answered')
        for d in s['pairs']:
            lines.append('  %s - %s: n %d, %s' % (d['a'], d['b'], d['n'], ci(d, signed=True)))
            for sub in s['subsets'][1:]:
                m = d['subsets'][sub]
                lines.append('      %-16s n %4d, %s' % (sub, m['n'], ci(m, signed=True)))
    if 'rule' in s:
        r = s['rule']
        lines.append('')
        for x in r['stops']:
            lines.append('D538 stop: %s' % x)
        lines.append('D538: %s' % '; '.join(r['why']))
        lines.append('D538 verdict: %s' % r['word'])
        lines.append('D538 wave 2 (point 9): %s' % ('bought' if r['wave2'] else 'not bought' if r['look'] == 1
                                                    else 'the second look, final: nothing is bought'))
    return '\n'.join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description="the label probe's agreement read (D538)")
    ap.add_argument('--labels', required=True, help='the labels (JSONL: key, kind, label, night, spine)')
    ap.add_argument('--players', help='these players, in this order (default: every player in the rows, sorted)')
    ap.add_argument('--pairs', help='these pairs, A:B for A - B, comma-separated (default: every pair of the players)')
    ap.add_argument('--split', help='FIELD=VALUE of the labels rows: adds the subsets FIELD=VALUE and FIELD!=VALUE')
    ap.add_argument('--off-atlas', default='miss', choices=('miss', 'drop'),
                    help='an off-atlas pick is a miss (default) or no answer')
    ap.add_argument('--rule', choices=('d538',), help="print D538's stops and word from this read")
    ap.add_argument('--boot', type=int, default=2000, help='bootstrap resamples of the spines (default 2000)')
    ap.add_argument('--seed', type=int, default=1, help="the bootstrap's seed (default 1)")
    ap.add_argument('--json', help='also write the read as one JSON object here')
    ap.add_argument('rows', nargs='+', help="the probe's rows (tools/label-probe.sh --out)")
    a = ap.parse_args(argv)
    if a.boot < 1:
        ap.error('--boot must be at least 1')
    if a.json and os.path.isdir(a.json):
        ap.error('--json %s is a directory' % a.json)
    if a.json and os.path.exists(a.json) and os.path.getsize(a.json):
        # `--json ROWS...` with the output's name left out would write the read over the first rows file
        try:
            with open(a.json, encoding='utf-8') as f:
                old = json.load(f)
            ok = isinstance(old, dict) and 'players' in old and 'pairs' in old
        except ValueError:
            ok = False
        if not ok:
            ap.error('--json %s exists and is not an earlier read of this tool: it is not overwritten' % a.json)
    rows = []
    for f in a.rows:
        rows.extend(read_jsonl(f))
    try:
        pairs = None
        if a.pairs:
            pairs = []
            for x in a.pairs.split(','):
                left, colon, right = x.partition(':')
                if not colon or not left or not right:
                    raise ValueError('--pairs wants A:B, got %r' % x)
                pairs.append((left, right))
        with open(a.labels, 'rb') as f:
            sha = hashlib.sha256(f.read()).hexdigest()
        s = summarize(read_jsonl(a.labels), rows, a.players.split(',') if a.players else None, a.boot, a.seed,
                      pairs=pairs, split=parse_split(a.split) if a.split else None, off_atlas=a.off_atlas,
                      probe_seed=D538_RUN['probeSeed'] if a.rule else None, labels_sha=sha)
        if a.rule:
            s['rule'] = d538(s)
    except ValueError as e:
        print('agreement: %s' % e, file=sys.stderr)
        return 2
    print(text(s))
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            f.write(json.dumps(s, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())

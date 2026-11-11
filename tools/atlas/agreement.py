#!/usr/bin/env python3
# mtg-table — tools/atlas: the label probe's agreement read -- how often each player picks the judged label.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The label probe's agreement read (D538): for each ladder player, the share of the labelled atlas decisions at which
it picks the label, beside the share at which it picks option 0 (Forge's own move), with 95% bootstrap intervals
clustered by spine; and for each pair of players the paired difference in agreement.

    python3 -I tools/atlas/agreement.py --labels LABELS.jsonl [--players a,b,...] [--boot 2000] [--seed 1]
        [--json OUT.json] ROWS.jsonl ...

READS the labels (one JSON object a line: `key` <night>/<spine>/d<d>, `kind` p/a/b, `label` the option both judges
chose or null, `night`, `spine`) and the probe's rows (tools/label-probe.sh: `key`, `player`, `seat`, `hash`,
`repeat`, `status`, `option`). WRITES the read as text to stdout and, with --json, as one JSON object to that file.
Standard library only; no engine.

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
  subsets       all; by kind (p, a, b); `label!=forge` (the label is not option 0) and `label=forge` (it is).
  interval      95% percentile bootstrap over spines (night/spine): --boot resamples of the spines with replacement,
                one fixed draw (--seed) shared by every statistic, so two players' intervals and their pair's come
                from the same resamples; a resample with no decision in a subset is skipped for it.
  pair A - B    over the labelled decisions both players answered: the mean of (A's agreement - B's), its interval
                the same bootstrap.
A player whose rows carry two seat configs is refused (two experiments under one name).
"""
from __future__ import annotations

import argparse
import json
import random
import sys

ANSWERED = ('ok', 'off-atlas')
NO_ANSWER = ('ambiguous', 'mismatch', 'unsupported', 'error')
SUBSETS = ('all', 'p', 'a', 'b', 'label!=forge', 'label=forge')


def read_jsonl(path):
    """Every complete JSON line of a file; a line that does not parse (a torn last line) is skipped."""
    out = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    return out


def cluster_of(row):
    """The spine a key belongs to: night/spine, from the row's fields or its key."""
    if row.get('night') and row.get('spine'):
        return '%s/%s' % (row['night'], row['spine'])
    return '/'.join(str(row['key']).split('/')[:2])


def load_labels(rows):
    """key -> {kind, label, cluster} for every labelled row (label not null)."""
    out = {}
    for r in rows:
        if r.get('label') is None:
            continue
        out[r['key']] = {'kind': r.get('kind'), 'label': int(r['label']), 'cluster': cluster_of(r)}
    return out


def collect(rows):
    """player -> {'seats': set, 'hash': str|None, 'reps': {(key, repeat): row}}: the last non-error row of each
    (player, key, repeat), else its last error row."""
    players = {}
    for r in rows:
        p = r.get('player')
        if p is None or r.get('key') is None:
            continue
        e = players.setdefault(p, {'seats': set(), 'hash': None, 'reps': {}})
        if r.get('seat') is not None:
            e['seats'].add(r['seat'])
        if r.get('hash'):
            e['hash'] = r['hash']
        k = (r['key'], r.get('repeat'))
        old = e['reps'].get(k)
        if old is None or r.get('status') != 'error' or old.get('status') == 'error':
            e['reps'][k] = r
    return players


def decisions(reps, labels):
    """key -> {'agree', 'zero', 'n'} over a player's answered repeats of labelled decisions, and the counts of what
    was not answered (decisions, by their repeats' statuses)."""
    by_key = {}
    for (key, _rep), r in reps.items():
        if key in labels:
            by_key.setdefault(key, []).append(r)
    vals = {}
    counts = {'labelled': len(labels), 'probed': len(by_key), 'answered': 0, 'repeats': 0, 'offAtlas': 0,
              'searched': 0, 'stable': 0}
    for s in NO_ANSWER:
        counts[s] = 0
    for key, rs in by_key.items():
        lab = labels[key]['label']
        ans = [r for r in rs if r.get('status') in ANSWERED]
        if not ans:
            # the decision's status: the first of the no-answer statuses its repeats carry, in NO_ANSWER's order
            st = [r.get('status') for r in rs]
            for s in NO_ANSWER:
                if s in st:
                    counts[s] += 1
                    break
            continue
        picks = [r.get('option') if r.get('status') == 'ok' else None for r in ans]
        vals[key] = {'agree': sum(1 for o in picks if o == lab) / len(picks),
                     'zero': sum(1 for o in picks if o == 0) / len(picks), 'n': len(picks)}
        counts['answered'] += 1
        counts['repeats'] += len(picks)
        counts['offAtlas'] += 1 if any(o is None for o in picks) else 0
        counts['searched'] += sum(1 for r in ans if r.get('searched') is True)
        counts['stable'] += 1 if len(set(picks)) == 1 else 0
    return vals, counts


def in_subset(lab, subset):
    if subset == 'all':
        return True
    if subset in ('p', 'a', 'b'):
        return lab['kind'] == subset
    if subset == 'label!=forge':
        return lab['label'] != 0
    if subset == 'label=forge':
        return lab['label'] == 0
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


def mean_ci(values, clusters, draws):
    """values: [(cluster, x)]; the mean, and its 95% percentile interval over the resampled clusters."""
    if not values:
        return {'n': 0, 'mean': None, 'lo': None, 'hi': None}
    index = {c: i for i, c in enumerate(clusters)}
    s = [0.0] * len(clusters)
    n = [0] * len(clusters)
    for c, x in values:
        s[index[c]] += x
        n[index[c]] += 1
    reps = []
    for draw in draws:
        ts = 0.0
        tn = 0
        for i in draw:
            ts += s[i]
            tn += n[i]
        if tn:
            reps.append(ts / tn)
    reps.sort()
    return {'n': len(values), 'mean': sum(x for _, x in values) / len(values),
            'lo': percentile(reps, 0.025), 'hi': percentile(reps, 0.975)}


def summarize(label_rows, probe_rows, players=None, boot=2000, seed=1):
    """The whole read as one dict (what --json writes)."""
    labels = load_labels(label_rows)
    clusters = sorted({v['cluster'] for v in labels.values()})
    draws = resamples(clusters, boot, seed)
    got = collect(probe_rows)
    for p, e in got.items():
        if len(e['seats']) > 1:
            raise ValueError('player %s has rows made with %d seat configs: %s' % (p, len(e['seats']), sorted(e['seats'])))
    names = players if players else sorted(got)
    out = {'v': 1, 'decision': 'D538', 'labels': {'labelled': len(labels), 'spines': len(clusters)},
           'boot': boot, 'seed': seed, 'players': {}, 'pairs': []}
    per = {}
    for p in names:
        e = got.get(p, {'seats': set(), 'hash': None, 'reps': {}})
        vals, counts = decisions(e['reps'], labels)
        per[p] = vals
        stats = {}
        for sub in SUBSETS:
            keys = [k for k in vals if in_subset(labels[k], sub)]
            stats[sub] = {'n': len(keys),
                          'label': mean_ci([(labels[k]['cluster'], vals[k]['agree']) for k in keys], clusters, draws),
                          'zero': mean_ci([(labels[k]['cluster'], vals[k]['zero']) for k in keys], clusters, draws)}
        out['players'][p] = {'hash': e['hash'], 'seat': next(iter(e['seats'])) if e['seats'] else None,
                             'counts': counts, 'stats': stats}
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            both = sorted(set(per[a]) & set(per[b]))
            diff = mean_ci([(labels[k]['cluster'], per[a][k]['agree'] - per[b][k]['agree']) for k in both], clusters, draws)
            out['pairs'].append(dict(diff, a=a, b=b))
    return out


def fmt(x, signed=False):
    if x is None:
        return '  n/a'
    return ('%+.3f' if signed else '%.3f') % x


def ci(m, signed=False):
    return '%s [%s, %s]' % (fmt(m['mean'], signed), fmt(m['lo'], signed), fmt(m['hi'], signed))


def text(s):
    """The read as text."""
    lines = ['labels: %d labelled decisions over %d spines; bootstrap %d by spine, seed %d'
             % (s['labels']['labelled'], s['labels']['spines'], s['boot'], s['seed'])]
    for p, e in s['players'].items():
        c = e['counts']
        lines.append('')
        lines.append('%s%s: %d of %d answered (%d probed); not answered: %d mismatch, %d unsupported, %d ambiguous, '
                     '%d error; %d off-atlas; %.2f repeats a decision; searched %s of answers; repeats agree on %s'
                     % (p, ' (%s)' % e['hash'] if e['hash'] else '', c['answered'], c['labelled'], c['probed'],
                        c['mismatch'], c['unsupported'], c['ambiguous'], c['error'], c['offAtlas'],
                        c['repeats'] / c['answered'] if c['answered'] else 0,
                        '%.1f%%' % (100 * c['searched'] / c['repeats']) if c['repeats'] else 'n/a',
                        '%.1f%%' % (100 * c['stable'] / c['answered']) if c['answered'] else 'n/a'))
        lines.append('  %-12s %5s   %-24s %-24s' % ('', 'n', 'picks the label', 'picks option 0'))
        for sub in SUBSETS:
            st = e['stats'][sub]
            lines.append('  %-12s %5d   %-24s %-24s' % (sub, st['n'], ci(st['label']), ci(st['zero'])))
    if s['pairs']:
        lines.append('')
        lines.append('pairs: agreement with the label, A - B, over the decisions both answered')
        for d in s['pairs']:
            lines.append('  %s - %s: n %d, %s' % (d['a'], d['b'], d['n'], ci(d, signed=True)))
    return '\n'.join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description="the label probe's agreement read (D538)")
    ap.add_argument('--labels', required=True, help='the labels (JSONL: key, kind, label, night, spine)')
    ap.add_argument('--players', help='these players, in this order (default: every player in the rows, sorted)')
    ap.add_argument('--boot', type=int, default=2000, help='bootstrap resamples of the spines (default 2000)')
    ap.add_argument('--seed', type=int, default=1, help="the bootstrap's seed (default 1)")
    ap.add_argument('--json', help='also write the read as one JSON object here')
    ap.add_argument('rows', nargs='+', help="the probe's rows (tools/label-probe.sh --out)")
    a = ap.parse_args(argv)
    if a.boot < 1:
        ap.error('--boot must be at least 1')
    rows = []
    for f in a.rows:
        rows.extend(read_jsonl(f))
    try:
        s = summarize(read_jsonl(a.labels), rows, a.players.split(',') if a.players else None, a.boot, a.seed)
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

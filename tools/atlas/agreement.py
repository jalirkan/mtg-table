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
object to that file (unrounded: a rule is read from these numbers, never from the text). Standard library only; no
engine.

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

--rule d538 prints D538's stops and word (point 6 and point 7) from the same numbers; it needs D538's three pairs
and --split source=round2, and refuses without them.
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


def decisions(reps, labels, answered=ANSWERED):
    """key -> {'agree', 'zero', 'n'} over a player's answered repeats of labelled decisions, and the counts of what
    was not answered (decisions, by their repeats' statuses)."""
    by_key = {}
    for (key, _rep), r in reps.items():
        if key in labels:
            by_key.setdefault(key, []).append(r)
    vals = {}
    counts = {'labelled': len(labels), 'probed': len(by_key), 'answered': 0, 'repeats': 0, 'offAtlas': 0,
              'searched': 0, 'stable': 0, 'mixed': 0, 'otherIdentity': 0, 'off-atlas': 0}
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
    """Over every row of a player, labelled or not: rows, ok rows, ok rows on option 0, rows whose search ran."""
    rs = list(reps.values())
    ok = [r for r in rs if r.get('status') == 'ok']
    return {'rows': len(rs), 'ok': len(ok), 'okOption0': sum(1 for r in ok if r.get('option') == 0),
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


def summarize(label_rows, probe_rows, players=None, boot=2000, seed=1, pairs=None, split=None, off_atlas='miss'):
    """The whole read as one dict (what --json writes). pairs: [(a, b)] for a - b, in that direction; None for
    every pair of the players read. split: (field, value) of the labels rows. off_atlas: 'miss' or 'drop'."""
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
    out = {'v': 2, 'decision': 'D538', 'labels': {'labelled': len(labels), 'spines': len(clusters)},
           'boot': boot, 'seed': seed, 'offAtlas': off_atlas, 'split': '%s=%s' % split if split else None,
           'subsets': list(subs), 'players': {}, 'pairs': []}
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


def d538(s):
    """D538's reading of a summary: {'word', 'stops': [..], 'why': [..]}. Point 6's stops first, each a stop (VOID:
    forge-default's ok rows are not all option 0; NOT READ: a player that must not search did, or one of the four
    answered under 95% of the labels); then point 7's word, from the unrounded numbers with strict inequalities."""
    if s.get('split') != '%s=%s' % D538_SPLIT or s.get('offAtlas') != 'miss':
        raise ValueError('--rule d538 reads --split %s=%s and --off-atlas miss' % D538_SPLIT)
    found = {(d['a'], d['b']): d for d in s['pairs']}
    for ab in D538_PAIRS:
        if ab not in found:
            raise ValueError('--rule d538 needs the pair %s:%s' % ab)
    stops = []
    fd = s['players']['forge-default']['rows']
    if fd['okOption0'] != fd['ok']:
        stops.append('VOID: forge-default picks another option than 0 at %d of its %d ok rows'
                     % (fd['ok'] - fd['okOption0'], fd['ok']))
    for p in D538_UNSEARCHED:
        if p in s['players'] and s['players'][p]['rows']['searched']:
            stops.append('NOT READ: %s searched at %d rows' % (p, s['players'][p]['rows']['searched']))
    for p in D538_PLAYERS:
        c = s['players'][p]['counts']
        if not c['labelled'] or c['answered'] < D538_ANSWERED * c['labelled']:
            stops.append('NOT READ: %s answered %d of %d labelled decisions, under %.0f%%'
                         % (p, c['answered'], c['labelled'], 100 * D538_ANSWERED))
    p1, p2, p3 = (found[ab] for ab in D538_PAIRS)
    p1u = p1['subsets'][D538_UNSELECTED]
    why = ['P1 %s' % ci(p1, True), 'P1 on %s %s (n %d)' % (D538_UNSELECTED, ci(p1u, True), p1u['n']),
           'P2 %s' % ci(p2, True), 'P3 %s' % ci(p3, True)]
    if stops:
        word = 'VOID' if any(x.startswith('VOID') for x in stops) else 'NOT READ'
    elif any(d['hi'] is None for d in (p1, p2, p3)) or p1u['mean'] is None:
        word = 'NOT READ'
        stops.append('NOT READ: a pair has no decision both players answered')
    elif any(d['hi'] < 0 for d in (p1, p2, p3)):
        word = 'AGREEMENT DOES NOT TRACK ELO'
    elif (p1['lo'] > 0 and p1u['mean'] > 0 and p2['mean'] > 0 and p3['mean'] > 0
          and (p2['lo'] > 0 or p3['lo'] > 0)):
        word = 'AGREEMENT TRACKS ELO'
    else:
        word = 'INCONCLUSIVE'
    return {'word': word, 'stops': stops, 'why': why, 'p1PointAboveZero': p1['mean'] is not None and p1['mean'] > 0}


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
        s = summarize(read_jsonl(a.labels), rows, a.players.split(',') if a.players else None, a.boot, a.seed,
                      pairs=pairs, split=parse_split(a.split) if a.split else None, off_atlas=a.off_atlas)
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

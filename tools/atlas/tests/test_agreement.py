# mtg-table — tools/atlas tests: the label probe's agreement read (D538).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""agreement.py over hand-made labels and probe rows: a decision counts by its mean over repeats, the last row of a
repeat that is not an error is the one read, what is not an answer is counted and left out, off-atlas is an answer
that is neither the label nor option 0, the subsets, the interval clustered by spine (a statistic whose spines all
carry the same sum shows no width), the paired difference over the decisions both players answered, a player with
two seat configs refused, the pairs named by --pairs in the direction given and on every subset, the --split
subsets, departure precision, off-atlas dropped, the mixed and other-identity counts, D538's stops and words from
the unrounded numbers, and the command line end to end. No engine, no lab data, standard library only.

    python3 -m unittest discover -s tools/atlas/tests
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
T = os.path.join(ROOT, 'tools', 'atlas')
sys.path.insert(0, T)
import agreement as A  # noqa: E402

LABELS = [
    {'key': 'J1/s01/d0', 'night': 'J1', 'spine': 's01', 'kind': 'p', 'label': 0},
    {'key': 'J1/s01/d1', 'night': 'J1', 'spine': 's01', 'kind': 'p', 'label': 2},
    {'key': 'J1/s02/d0', 'night': 'J1', 'spine': 's02', 'kind': 'a', 'label': 1},
    {'key': 'J1/s02/d1', 'night': 'J1', 'spine': 's02', 'kind': 'b', 'label': 0},
    {'key': 'J1/s03/d0', 'night': 'J1', 'spine': 's03', 'kind': 'p', 'label': None},
]


def row(player, key, repeat, status, option=None, seat='Default+search:ms=1500', searched=True):
    return {'player': player, 'key': key, 'repeat': repeat, 'status': status,
            'option': option if status == 'ok' else None, 'seat': seat, 'hash': 'h-' + player, 'searched': searched}


def answers(player, picks):
    """One ok row a (key, option) pair, repeat 0."""
    return [row(player, k, 0, 'ok', o) for k, o in picks]


# X: the label at s01/d0 and s02/d0, not at s01/d1 and s02/d1; option 0 at s01/d0 only
X = answers('X', [('J1/s01/d0', 0), ('J1/s01/d1', 1), ('J1/s02/d0', 1), ('J1/s02/d1', 3)])


class Agreement(unittest.TestCase):

    def stats(self, rows, player, **kw):
        s = A.summarize(LABELS, rows, boot=kw.pop('boot', 200), seed=kw.pop('seed', 1), **kw)
        return s, s['players'][player]

    def test_mean_over_repeats(self):
        rows = [row('X', 'J1/s01/d1', 0, 'ok', 2), row('X', 'J1/s01/d1', 1, 'ok', 2), row('X', 'J1/s01/d1', 2, 'ok', 0)]
        _, p = self.stats(rows, 'X')
        self.assertEqual(p['stats']['all']['n'], 1)
        self.assertAlmostEqual(p['stats']['all']['label']['mean'], 2 / 3)
        self.assertAlmostEqual(p['stats']['all']['zero']['mean'], 1 / 3)
        self.assertEqual(p['counts']['repeats'], 3)
        self.assertEqual(p['counts']['stable'], 0)

    def test_last_row_that_is_not_an_error_wins(self):
        rows = [row('X', 'J1/s01/d0', 0, 'error'), row('X', 'J1/s01/d0', 0, 'ok', 0),
                row('X', 'J1/s01/d1', 0, 'ok', 2), row('X', 'J1/s01/d1', 0, 'error')]
        reps = A.collect(rows)['X']['reps']
        self.assertEqual(reps[('J1/s01/d0', 0)]['status'], 'ok')
        self.assertEqual(reps[('J1/s01/d1', 0)]['status'], 'ok')
        _, p = self.stats(rows, 'X')
        self.assertEqual(p['counts']['answered'], 2)
        self.assertEqual(p['counts']['error'], 0)
        self.assertEqual(p['stats']['all']['label']['mean'], 1.0)

    def test_what_is_no_answer_is_counted_and_left_out(self):
        rows = [row('X', 'J1/s01/d0', 0, 'mismatch'), row('X', 'J1/s01/d1', 0, 'ambiguous'),
                row('X', 'J1/s02/d0', 0, 'unsupported'), row('X', 'J1/s02/d1', 0, 'error'),
                row('X', 'J1/s02/d1', 1, 'mismatch')]
        _, p = self.stats(rows, 'X')
        c = p['counts']
        self.assertEqual((c['labelled'], c['probed'], c['answered']), (4, 4, 0))
        self.assertEqual((c['mismatch'], c['ambiguous'], c['unsupported'], c['error']), (2, 1, 1, 0))
        self.assertEqual(p['stats']['all']['n'], 0)
        self.assertIsNone(p['stats']['all']['label']['mean'])

    def test_off_atlas_is_an_answer_neither_the_label_nor_option_0(self):
        rows = [row('X', 'J1/s01/d0', 0, 'off-atlas'), row('X', 'J1/s01/d0', 1, 'ok', 0)]
        _, p = self.stats(rows, 'X')
        self.assertEqual((p['counts']['answered'], p['counts']['offAtlas']), (1, 1))
        self.assertAlmostEqual(p['stats']['all']['label']['mean'], 0.5)
        self.assertAlmostEqual(p['stats']['all']['zero']['mean'], 0.5)

    def test_subsets(self):
        rows = X + [row('X', 'J1/s03/d0', 0, 'ok', 0)]   # an unlabelled decision: never read
        _, p = self.stats(rows, 'X')
        st = p['stats']
        self.assertEqual(p['counts']['probed'], 4)
        want = {'all': (4, 0.5, 0.25), 'p': (2, 0.5, 0.5), 'a': (1, 1.0, 0.0), 'b': (1, 0.0, 0.0),
                'label!=forge': (2, 0.5, 0.0), 'label=forge': (2, 0.5, 0.5)}
        for sub, (n, lab, zero) in want.items():
            self.assertEqual(st[sub]['n'], n, sub)
            self.assertAlmostEqual(st[sub]['label']['mean'], lab, msg=sub)
            self.assertAlmostEqual(st[sub]['zero']['mean'], zero, msg=sub)

    def test_interval_is_clustered_by_spine(self):
        s, p = self.stats(X, 'X')
        # agreement: each spine holds one agreeing decision of two, so every resample of spines is exactly 1/2
        lab = p['stats']['all']['label']
        self.assertEqual((lab['lo'], lab['hi']), (0.5, 0.5))
        # option 0: s01 holds 1 of 2, s02 none of 2; resamples run from 0 to 1/2
        zero = p['stats']['all']['zero']
        self.assertTrue(0.0 <= zero['lo'] <= 0.25 <= zero['hi'] <= 0.5, zero)
        self.assertEqual(s['labels'], {'labelled': 4, 'spines': 2})
        # one seeded draw: the same read twice
        self.assertEqual(A.summarize(LABELS, X, boot=200, seed=1), A.summarize(LABELS, X, boot=200, seed=1))

    def test_pairs_over_the_decisions_both_answered(self):
        y = answers('Y', [('J1/s01/d0', 0), ('J1/s01/d1', 2)])
        s = A.summarize(LABELS, X + y, boot=200, seed=1)
        self.assertEqual(len(s['pairs']), 1)
        d = s['pairs'][0]
        self.assertEqual((d['a'], d['b'], d['n']), ('X', 'Y', 2))
        # X - Y: 1 - 1 at s01/d0, 0 - 1 at s01/d1; only s01 carries them, so every resample that holds it is -1/2
        self.assertAlmostEqual(d['mean'], -0.5)
        self.assertEqual((d['lo'], d['hi']), (-0.5, -0.5))
        s2 = A.summarize(LABELS, X + y, players=['Y', 'X'], boot=200, seed=1)
        self.assertEqual((s2['pairs'][0]['a'], s2['pairs'][0]['b']), ('Y', 'X'))
        self.assertAlmostEqual(s2['pairs'][0]['mean'], 0.5)

    def test_two_seat_configs_refused(self):
        rows = [row('X', 'J1/s01/d0', 0, 'ok', 0, seat='Default+search:ms=1500'),
                row('X', 'J1/s01/d1', 0, 'ok', 2, seat='Default+search:ms=3000')]
        with self.assertRaises(ValueError):
            A.summarize(LABELS, rows, boot=10, seed=1)

    def test_command_line(self):
        with tempfile.TemporaryDirectory() as d:
            lab = os.path.join(d, 'labels.jsonl')
            rows = os.path.join(d, 'rows.jsonl')
            out = os.path.join(d, 'read.json')
            with open(lab, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in LABELS))
            with open(rows, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in X) + '{"player": "X", "key"')   # a torn last line
            p = subprocess.run([sys.executable, '-I', os.path.join(T, 'agreement.py'), '--labels', lab, '--boot', '50',
                                '--json', out, rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn('X (h-X): 4 of 4 answered', p.stdout)
            with open(out) as f:
                s = json.load(f)
            self.assertEqual(s['players']['X']['stats']['all']['n'], 4)
            self.assertEqual(s['boot'], 50)
            bad = os.path.join(d, 'two.jsonl')
            with open(bad, 'w') as f:
                f.write(json.dumps(row('X', 'J1/s01/d0', 0, 'ok', 0, seat='a')) + '\n'
                        + json.dumps(row('X', 'J1/s01/d1', 0, 'ok', 2, seat='b')) + '\n')
            p = subprocess.run([sys.executable, '-I', os.path.join(T, 'agreement.py'), '--labels', lab, bad],
                               cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)

# D538's shape: six spines of two labelled decisions (d0's label is option 0, d1's is option 1), `round2` spines
# and unselected ones
S, F, R, R4 = 'search-v1-anytime', 'forge-default', 'search-v2-rrandom', 'search-v2-rrandom4'
PAIRS = [(S, F), (S, R), (S, R4)]


def rule_labels(round2):
    """Six spines s1..s6; the first `round2` of them carry source round2, the rest wave1."""
    out = []
    for i in range(1, 7):
        src = 'round2' if i <= round2 else 'wave1'
        out.append({'key': 'J2/s%d/d0' % i, 'night': 'J2', 'spine': 's%d' % i, 'kind': 'p', 'label': 0, 'source': src})
        out.append({'key': 'J2/s%d/d1' % i, 'night': 'J2', 'spine': 's%d' % i, 'kind': 'a', 'label': 1, 'source': src})
    return out


def rule_rows(search_d1, search_d0=0, forge_d1=0, forge_searched=False, drop=None):
    """forge-default and both random seats pick 0 at d0; at d1 forge picks forge_d1, the random seats option 2 and
    the search search_d1(spine number), search_d0 at d0; `drop` is a (player, key) made a mismatch."""
    rows = []
    for i in range(1, 7):
        d0, d1 = 'J2/s%d/d0' % i, 'J2/s%d/d1' % i
        rows += [row(F, d0, 0, 'ok', 0, searched=forge_searched), row(F, d1, 0, 'ok', forge_d1, searched=False)]
        for p in (R, R4):
            rows += [row(p, d0, 0, 'ok', 0), row(p, d1, 0, 'ok', 2)]
        rows += [row(S, d0, 0, 'ok', search_d0), row(S, d1, 0, 'ok', search_d1(i))]
    if drop:
        rows = [dict(r, status='mismatch', option=None) if (r['player'], r['key']) == drop else r for r in rows]
    return rows


class Rule(unittest.TestCase):

    def read(self, rows, round2=2):
        s = A.summarize(rule_labels(round2), rows, boot=200, seed=1, pairs=PAIRS, split=('source', 'round2'))
        return s, A.d538(s)

    def test_pairs_in_the_direction_given_on_every_subset(self):
        s, _ = self.read(rule_rows(lambda i: 1))
        self.assertEqual([(d['a'], d['b']) for d in s['pairs']], PAIRS)   # not sorted: forge-default sorts first
        p1 = s['pairs'][0]
        self.assertAlmostEqual(p1['mean'], 0.5)                           # search 1.0, forge 0.5
        self.assertEqual((p1['lo'], p1['hi']), (0.5, 0.5))
        self.assertEqual(set(p1['subsets']), set(s['subsets']))
        self.assertAlmostEqual(p1['subsets']['a']['mean'], 1.0)
        self.assertAlmostEqual(p1['subsets']['p']['mean'], 0.0)
        self.assertEqual(p1['subsets']['b'], {'n': 0, 'mean': None, 'lo': None, 'hi': None})
        self.assertEqual((p1['subsets']['source=round2']['n'], p1['subsets']['source!=round2']['n']), (4, 8))
        self.assertEqual(s['players'][S]['stats']['source!=round2']['n'], 8)
        with self.assertRaises(ValueError):
            A.summarize(rule_labels(2), rule_rows(lambda i: 1), boot=10, pairs=[(S, S)])

    def test_departure_precision(self):
        # the search leaves option 0 at every d1 and lands on the label at spines 1..3 only: 3 of 6
        s, _ = self.read(rule_rows(lambda i: 1 if i <= 3 else 3))
        d = s['players'][S]['departure']
        self.assertEqual((d['n'], d['departures']), (6, 6.0))
        self.assertAlmostEqual(d['mean'], 0.5)
        self.assertTrue(0.0 <= d['lo'] <= 0.5 <= d['hi'] <= 1.0)
        f = s['players'][F]['departure']                                  # forge never leaves: nothing to divide
        self.assertEqual((f['n'], f['departures'], f['mean']), (0, 0.0, None))
        # a departure where the label is option 0 is a miss, not left out
        rows = rule_rows(lambda i: 1) + [row(S, 'J2/s1/d0', 1, 'ok', 4), row(S, 'J2/s1/d0', 0, 'ok', 4)]
        d = A.summarize(rule_labels(2), rows, boot=50)['players'][S]['departure']
        self.assertAlmostEqual(d['mean'], 6 / 7)

    def test_off_atlas_dropped_and_the_counts(self):
        rows = [row('X', 'J1/s01/d0', 0, 'off-atlas'), row('X', 'J1/s01/d0', 1, 'ok', 0),
                row('X', 'J1/s01/d1', 0, 'off-atlas'),
                row('X', 'J1/s02/d0', 0, 'mismatch'), dict(row('X', 'J1/s02/d0', 1, 'ok', 1), sameIdentity=False)]
        miss = A.summarize(LABELS, rows, boot=50)['players']['X']
        self.assertEqual((miss['counts']['answered'], miss['counts']['mixed'], miss['counts']['otherIdentity']), (3, 1, 1))
        self.assertAlmostEqual(miss['stats']['all']['label']['mean'], (0.5 + 0 + 1) / 3)
        self.assertEqual(miss['rows'], {'rows': 5, 'ok': 2, 'okOption0': 1, 'searched': 5})
        drop = A.summarize(LABELS, rows, boot=50, off_atlas='drop')['players']['X']
        self.assertEqual((drop['counts']['answered'], drop['counts']['off-atlas'], drop['counts']['mixed']), (2, 1, 2))
        self.assertAlmostEqual(drop['stats']['all']['label']['mean'], 1.0)

    def test_words(self):
        _, r = self.read(rule_rows(lambda i: 1))
        self.assertEqual((r['word'], r['stops'], r['p1PointAboveZero']), ('AGREEMENT TRACKS ELO', [], True))
        _, r = self.read(rule_rows(lambda i: 3, search_d0=3))             # the search agrees less than Forge
        self.assertEqual(r['word'], 'AGREEMENT DOES NOT TRACK ELO')
        _, r = self.read(rule_rows(lambda i: 0))                          # P1 is exactly 0: not above it
        self.assertEqual((r['word'], r['p1PointAboveZero']), ('INCONCLUSIVE', False))
        _, r = self.read(rule_rows(lambda i: 2))                          # P1 0, P2 and P3 0: nothing shown
        self.assertEqual(r['word'], 'INCONCLUSIVE')

    def test_the_unselected_rows_must_carry_p1(self):
        # five round2 spines where the search finds the label, one unselected spine where it plays Forge's move:
        # P1's interval is above 0 on the selected rows alone, and the word is not TRACKS
        s, r = self.read(rule_rows(lambda i: 1 if i <= 5 else 0), round2=5)
        p1 = s['pairs'][0]
        self.assertGreater(p1['lo'], 0)
        self.assertEqual(p1['subsets']['source!=round2']['mean'], 0.0)
        self.assertEqual((r['word'], r['p1PointAboveZero']), ('INCONCLUSIVE', True))
        _, r = self.read(rule_rows(lambda i: 1), round2=5)
        self.assertEqual(r['word'], 'AGREEMENT TRACKS ELO')

    def test_stops(self):
        rows = rule_rows(lambda i: 1)
        rows[1] = row(F, 'J2/s1/d1', 0, 'ok', 1, searched=False)          # forge-default off option 0: the mapping
        _, r = self.read(rows)
        self.assertEqual(r['word'], 'VOID')
        self.assertIn('1 of its 12 ok rows', r['stops'][0])
        _, r = self.read(rule_rows(lambda i: 1, forge_searched=True))
        self.assertEqual(r['word'], 'NOT READ')
        _, r = self.read(rule_rows(lambda i: 1, drop=(S, 'J2/s4/d0')))    # 11 of 12 answered: under 95%
        self.assertEqual(r['word'], 'NOT READ')
        self.assertIn('answered 11 of 12', r['stops'][0])
        s = A.summarize(rule_labels(2), rule_rows(lambda i: 1), boot=50, pairs=PAIRS[:2], split=('source', 'round2'))
        with self.assertRaises(ValueError):
            A.d538(s)                                                     # a pair of the rule is missing
        with self.assertRaises(ValueError):
            A.d538(A.summarize(rule_labels(2), rule_rows(lambda i: 1), boot=50, pairs=PAIRS))   # no split

    def test_command_line_rule(self):
        with tempfile.TemporaryDirectory() as d:
            lab, rows, out = (os.path.join(d, n) for n in ('labels.jsonl', 'rows.jsonl', 'read.json'))
            with open(lab, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in rule_labels(2)))
            with open(rows, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in rule_rows(lambda i: 1)))
            cmd = [sys.executable, '-I', os.path.join(T, 'agreement.py'), '--labels', lab, '--boot', '50',
                   '--pairs', ','.join('%s:%s' % ab for ab in PAIRS), '--split', 'source=round2']
            p = subprocess.run(cmd + ['--rule', 'd538', '--json', out, rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn('search-v1-anytime - forge-default: n 12, +0.5000 [+0.5000, +0.5000]', p.stdout)
            self.assertIn('D538 verdict: AGREEMENT TRACKS ELO', p.stdout)
            with open(out) as f:
                s = json.load(f)
            self.assertEqual(s['rule']['word'], 'AGREEMENT TRACKS ELO')
            self.assertEqual(s['pairs'][0]['subsets']['source!=round2']['n'], 8)
            p = subprocess.run(cmd[:-2] + ['--rule', 'd538', rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)                             # the rule without its split
            p = subprocess.run(cmd + ['--pairs', 'a-b', rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)


if __name__ == '__main__':
    unittest.main()

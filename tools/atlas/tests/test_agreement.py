# mtg-table — tools/atlas tests: the label probe's agreement read (D538).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""agreement.py over hand-made labels and probe rows: a decision counts by its mean over repeats, the last row of a
repeat that is not an error is the one read, what is not an answer is counted and left out, off-atlas is an answer
that is neither the label nor option 0, the subsets, the interval clustered by spine (a statistic whose spines all
carry the same sum shows no width), the paired difference over the decisions both players answered, a player with
two seat configs refused, and the command line end to end. No engine, no lab data, standard library only.

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


if __name__ == '__main__':
    unittest.main()

# mtg-table — tools/atlas tests: the label probe's agreement read (D538).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""agreement.py over hand-made labels and probe rows: a decision counts by its mean over repeats, the last row of a
repeat that is not an error is the one read, what is not an answer is counted and left out, off-atlas is an answer
that is neither the label nor option 0, the subsets, the interval clustered by spine (a statistic whose spines all
carry the same sum shows no width), the paired difference over the decisions both players answered, a player with
two seat configs refused, the pairs named by --pairs in the direction given and on every subset, the --split
subsets, departure precision, off-atlas dropped, the mixed and other-identity counts, D538's stops and words from
the unrounded numbers, its refusal of any read but its own run (the labels file by sha256 among it), its refusal of
rows that are not one run of the probe (two runs' rows in one read, another --seed, a row the probe never writes,
another seat's hash), the port of the probe's seed, point 9's wave-2 answer on the first look only, --json never
written over a rows file, and the command line end to end. No engine, no lab data, standard library only.

    python3 -m unittest discover -s tools/atlas/tests
"""
from __future__ import annotations

import hashlib
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
        self.assertEqual(s['labels'], {'labelled': 4, 'spines': 2, 'sha256': None})
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


K = 5   # every decision of the rule's labels lists five options


def rule_labels(round2):
    """Six spines s1..s6; the first `round2` of them carry source round2, the rest wave1."""
    out = []
    for i in range(1, 7):
        src = 'round2' if i <= round2 else 'wave1'
        out.append({'key': 'J2/s%d/d0' % i, 'night': 'J2', 'spine': 's%d' % i, 'kind': 'p', 'k': K, 'label': 0,
                    'source': src})
        out.append({'key': 'J2/s%d/d1' % i, 'night': 'J2', 'spine': 's%d' % i, 'kind': 'a', 'k': K, 'label': 1,
                    'source': src})
    return out


def rule_rows(search_d1, search_d0=0, forge_d1=0, forge_searched=False, drop=None, random_d1=lambda i: 2):
    """forge-default and both random seats pick 0 at d0; at d1 forge picks forge_d1, the random seats
    random_d1(spine number) and the search search_d1(spine number), search_d0 at d0; `drop` is a (player, key) made
    a mismatch."""
    rows = []
    for i in range(1, 7):
        d0, d1 = 'J2/s%d/d0' % i, 'J2/s%d/d1' % i
        rows += [row(F, d0, 0, 'ok', 0, searched=forge_searched), row(F, d1, 0, 'ok', forge_d1, searched=False)]
        for p in (R, R4):
            rows += [row(p, d0, 0, 'ok', 0), row(p, d1, 0, 'ok', random_d1(i))]
        rows += [row(S, d0, 0, 'ok', search_d0), row(S, d1, 0, 'ok', search_d1(i))]
    if drop:
        rows = [dict(r, status='mismatch', option=None) if (r['player'], r['key']) == drop else r for r in rows]
    return rows


# the unit tests' run: 200 draws, 12 labelled decisions, one row a decision, the probe's seed 7, the first look
RUN = {'boot': 200, 'seed': 1, 'probeSeed': 7, 'labelled': 12, 'look': 1, 'labelsSha256': 'the-test-labels',
       'repeats': {S: 1, F: 1, R: 1, R4: 1, 'policy-outlet': 1},
       'hashes': {p: 'h-' + p for p in (S, F, R, R4, 'policy-outlet')}}


def stamp(rows, probe_seed=None):
    """The probe's own `seed` and the labels' `k` on every row that carries no `seed` (a test plants its own)."""
    seed = RUN['probeSeed'] if probe_seed is None else probe_seed
    return [r if 'seed' in r else dict(r, seed=A.repeat_seed(seed, r['key'], r['repeat']), k=K) for r in rows]


class Rule(unittest.TestCase):

    def summary(self, rows, round2=2, players=None, run=None, pairs=PAIRS, split=('source', 'round2')):
        run = RUN if run is None else run
        return A.summarize(rule_labels(round2), stamp(rows), players, boot=run['boot'], seed=run['seed'], pairs=pairs,
                           split=split, probe_seed=RUN['probeSeed'], labels_sha=RUN['labelsSha256'])

    def read(self, rows, round2=2, players=None, run=None):
        s = self.summary(rows, round2, players, run)
        return s, A.d538(s, RUN if run is None else run)

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
        self.assertEqual(miss['rows'], {'rows': 5, 'ok': 2, 'okOption0': 1, 'offAtlas': 2, 'searched': 5})
        drop = A.summarize(LABELS, rows, boot=50, off_atlas='drop')['players']['X']
        self.assertEqual((drop['counts']['answered'], drop['counts']['off-atlas'], drop['counts']['mixed']), (2, 1, 2))
        self.assertAlmostEqual(drop['stats']['all']['label']['mean'], 1.0)

    def test_words(self):
        _, r = self.read(rule_rows(lambda i: 1))
        self.assertEqual((r['word'], r['stops'], r['p1PointAboveZero']), ('AGREEMENT TRACKS ELO', [], True))
        self.assertTrue(r['wave2'])
        _, r = self.read(rule_rows(lambda i: 3, search_d0=3))             # the search agrees less than Forge
        self.assertEqual(r['word'], 'AGREEMENT DOES NOT TRACK ELO')
        _, r = self.read(rule_rows(lambda i: 0))                          # P1 is exactly 0: not above it
        self.assertEqual((r['word'], r['p1PointAboveZero'], r['wave2']), ('INCONCLUSIVE', False, False))
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
        # point 9: an INCONCLUSIVE whose P1 is not above 0 on the unselected rows does not buy wave 2
        self.assertEqual((r['p1UnselectedPointAboveZero'], r['wave2']), (False, False))
        _, r = self.read(rule_rows(lambda i: 1), round2=5)
        self.assertEqual(r['word'], 'AGREEMENT TRACKS ELO')
        # the search finds the label at one unselected spine and one round2 spine: P1's point is above 0 on both,
        # its interval reaches 0, and the INCONCLUSIVE buys wave 2 once
        _, r = self.read(rule_rows(lambda i: 1 if i in (1, 6) else 0), round2=3)
        self.assertEqual((r['word'], r['wave2']), ('INCONCLUSIVE', True))

    def test_stops(self):
        rows = rule_rows(lambda i: 1)
        rows[1] = row(F, 'J2/s1/d1', 0, 'ok', 1, searched=False)          # forge-default off option 0: the mapping
        _, r = self.read(rows)
        self.assertEqual(r['word'], 'VOID')
        self.assertIn('1 of its 12 ok rows', r['stops'][0])
        # forge-default off the atlas where the label is Forge's move: its agreement falls, P1 rises, and it is the
        # mapping again, not a finding
        rows = rule_rows(lambda i: 0)
        rows[0] = dict(row(F, 'J2/s1/d0', 0, 'off-atlas', searched=False))
        s, r = self.read(rows)
        self.assertGreater(s['pairs'][0]['mean'], 0)
        self.assertEqual(r['word'], 'VOID')
        self.assertIn('off the atlas at 1 rows', r['stops'][0])
        _, r = self.read(rule_rows(lambda i: 1, forge_searched=True))
        self.assertEqual(r['word'], 'NOT READ')
        # policy-outlet's rows stop the read whatever --players names
        outlet = [row('policy-outlet', 'J2/s1/d0', 0, 'ok', 0, searched=True)]
        _, r = self.read(rule_rows(lambda i: 1) + outlet, players=[S, F, R, R4])
        self.assertEqual((r['word'], r['stops']), ('NOT READ', ['NOT READ: policy-outlet searched at 1 rows']))
        _, r = self.read(rule_rows(lambda i: 1) + [row('policy-outlet', 'J2/s1/d0', 0, 'ok', 0, searched=False)])
        self.assertEqual(r['word'], 'AGREEMENT TRACKS ELO')
        # the search is to have two rows a decision and has its second at one only: the repeats are not the run's
        two = dict(RUN, repeats=dict(RUN['repeats'], **{S: 2}))
        _, r = self.read(rule_rows(lambda i: 1) + [row(S, 'J2/s2/d1', 1, 'ok', 1)], run=two)
        self.assertEqual(r['word'], 'NOT READ')
        self.assertIn('has 1 to 2 rows a labelled decision, not 2', r['stops'][0])
        # it has both rows everywhere and the second is no answer at two decisions: every decision is answered,
        # every decision has its rows, and 22 of its 24 repeats are answers -- under 95% of them
        second = [row(S, 'J2/s%d/d%d' % (i, d), 1, 'mismatch' if (i, d) in ((1, 0), (2, 1)) else 'ok', d)
                  for i in range(1, 7) for d in (0, 1)]
        _, r = self.read(rule_rows(lambda i: 1) + second, run=two)
        self.assertEqual((r['word'], r['stops']),
                         ('NOT READ', ['NOT READ: %s answered 22 of its 24 repeats of the labelled decisions, under 95%%' % S]))
        _, r = self.read(rule_rows(lambda i: 1) + [dict(x, status='ok', option=x['key'][-1] == '1' and 1 or 0)
                                                   for x in second], run=two)
        self.assertEqual(r['word'], 'AGREEMENT TRACKS ELO')
        _, r = self.read(rule_rows(lambda i: 1, drop=(S, 'J2/s4/d0')))    # 11 of 12 answered: under 95%
        self.assertEqual(r['word'], 'NOT READ')
        self.assertIn('answered 11 of 12', r['stops'][0])
        with self.assertRaisesRegex(ValueError, 'needs the pair'):
            A.d538(self.summary(rule_rows(lambda i: 1), pairs=PAIRS[:2]), RUN)   # a pair of the rule is missing
        with self.assertRaisesRegex(ValueError, '--split source=round2'):
            A.d538(self.summary(rule_rows(lambda i: 1), split=None), RUN)        # no split

    def test_no_interval_on_the_unselected_rows(self):
        # one draw of the bootstrap, and a seed whose draw holds no unselected spine (five of six are round2): P1
        # has a point there and no interval, and that is NOT READ, as point 6 says
        for seed in range(1, 200):
            run = dict(RUN, boot=1, seed=seed)
            s = self.summary(rule_rows(lambda i: 1), round2=5, run=run)
            if s['pairs'][0]['subsets']['source!=round2']['lo'] is None:
                break
        else:
            self.fail('no seed under 200 leaves the unselected spine out of one draw')
        self.assertIsNotNone(s['pairs'][0]['subsets']['source!=round2']['mean'])
        self.assertIsNotNone(s['pairs'][0]['lo'])
        r = A.d538(s, run)
        self.assertEqual(r['word'], 'NOT READ')
        self.assertIn('has no interval', r['stops'][0])

    def test_the_seed_port(self):
        # LabelProbe.repeatSeed in Python. The two constants are this port's; DecisionSelfTest checks the Java
        # against the same two, so the lane's first build is what proves the port (D538, unverified as written)
        self.assertEqual(A.repeat_seed(538, 'J186/s01/d9', 0), 100225255197839)
        self.assertEqual(A.repeat_seed(538, 'J186/s01/d9', 1), 134260492138398)
        seeds = {A.repeat_seed(1, 'J186/s01/d%d' % i, r) for i in range(50) for r in range(3)}
        self.assertEqual(len(seeds), 150)
        self.assertTrue(all(0 < x < 1 << 47 for x in seeds))
        self.assertNotEqual(A.repeat_seed(1, 'J186/s01/d9', 2), A.repeat_seed(2, 'J186/s01/d9', 2))

    def refused(self, rows, what, **kw):
        with self.assertRaisesRegex(ValueError, what):
            self.read(rows, **kw)

    def test_the_rows_of_two_runs_are_not_merged(self):
        good = rule_rows(lambda i: 1)
        self.assertEqual(self.read(good)[1]['word'], 'AGREEMENT TRACKS ELO')
        # forge-default off the atlas in one run and on option 0 in a later one: the last row would hide the VOID
        rows = [row(F, 'J2/s1/d0', 0, 'off-atlas', searched=False)] + good
        self.refused(rows, '1 duplicates .first: forge-default J2/s1/d0 repeat 0: 2 rows, 2 not errors.')
        # a second set of a random seat's rows, all on option 0, appended: it would move P2
        self.refused(good + [row(R, 'J2/s%d/d1' % i, 0, 'ok', 0) for i in range(1, 7)], '6 duplicates')
        # the same rows made under another --seed, alone and beside the run's own
        other = stamp(good, probe_seed=1)
        self.refused(other, '%d seedMismatch' % len(good))
        self.refused(good[:-1] + other[-1:], '1 seedMismatch')
        self.refused([dict(r, seed=None) for r in stamp(good)], 'seedMismatch')
        # a repeat the run does not have (a rerun with more --repeats), for a rule player and for policy-outlet
        self.refused(good + [row(S, 'J2/s2/d1', 1, 'ok', 1)], 'reads 1 repeat.s. of %s; these rows hold its repeat 1' % S)
        self.refused(good + [row('policy-outlet', 'J2/s1/d0', 1, 'ok', 0, searched=False)], 'of policy-outlet')
        # an error tried again is one run: error then ok is read, error twice is an error, three rows are not
        err = row(S, 'J2/s3/d1', 0, 'error')
        self.assertEqual(self.read([err] + good)[1]['word'], 'AGREEMENT TRACKS ELO')
        self.refused([err, err] + good, '1 overTries')
        s, r = self.read([r for r in good if (r['player'], r['key']) != (S, 'J2/s3/d1')] + [err, err])
        self.assertEqual((s['players'][S]['counts']['error'], r['word']), (1, 'NOT READ'))
        # a player the rule does not name is held to one run too
        self.refused(good + [row('X', 'J2/s1/d0', 0, 'ok', 0), row('X', 'J2/s1/d0', 0, 'ok', 1)], '1 duplicates')

    def test_rows_the_probe_never_writes(self):
        good = rule_rows(lambda i: 1)
        x = stamp([row(S, 'J2/s3/d1', 0, 'ok', 1)])[0]
        rest = [r for r in good if (r['player'], r['key']) != (S, 'J2/s3/d1')]
        self.assertEqual(self.read(rest + [x])[1]['word'], 'AGREEMENT TRACKS ELO')
        for what, bad in (('unknownStatus', dict(x, status='okay')), ('unknownStatus', dict(x, status=None)),
                          ('badOption', dict(x, option=None)), ('badOption', dict(x, option=K)),
                          ('badOption', dict(x, option=-1)), ('badOption', dict(x, option='1')),
                          ('badOption', dict(x, option=True)), ('badOption', dict(x, k=K + 1)),
                          ('badOption', dict(x, k=None)), ('badSearched', dict(x, searched='true')),
                          ('badSearched', dict(x, searched=1)), ('unkeyed', dict(x, key=None)),
                          ('unkeyed', dict(x, player=None)), ('unknownKey', dict(x, key='J2/s9/d1')),
                          ('badRepeat', dict(x, repeat=None)), ('badRepeat', dict(x, repeat=-1)),
                          ('badRepeat', dict(x, repeat='0')), ('badRepeat', dict(x, repeat=False))):
            with self.subTest(what=what, bad=bad):
                self.refused(rest + [bad], '1 %s' % what)
        # a miss that is not an ok row carries no option and no searched, and is read
        self.assertEqual(self.read(rest + [dict(x, status='off-atlas', option=None, searched=None)])[1]['word'],
                         'AGREEMENT TRACKS ELO')
        # the registered seat's hash, on every row of it; a player the run names no hash for is not held to one
        self.refused(rest + [dict(x, hash='h-other')], 'under the config hash h-%s; these rows carry h-other, h-%s' % (S, S))
        self.refused([dict(r, hash=None) for r in stamp(good)], 'these rows carry none')
        self.assertEqual(self.read(good + [dict(row('X', 'J2/s1/d0', 0, 'ok', 0), hash='anything')])[1]['word'],
                         'AGREEMENT TRACKS ELO')

    def test_the_audit(self):
        rows = stamp(rule_rows(lambda i: 1))
        a = A.audit(rows, rule_labels(2), RUN['probeSeed'])
        self.assertEqual(set(a['counts']), set(A.AUDIT))
        self.assertEqual((sum(a['counts'].values()), a['first'], a['probeSeed']), (0, {}, 7))
        self.assertEqual((a['repeatMax'], a['hashes'][S]), ({F: 0, R: 0, R4: 0, S: 0}, ['h-' + S]))
        # without a probe seed the seeds are not looked at; the labels' k is the option count of an unlabelled row too
        self.assertEqual(A.audit([dict(r, seed=5) for r in rows], rule_labels(2))['counts']['seedMismatch'], 0)
        unl = [dict(rule_labels(2)[0], label=None)] + rule_labels(2)[1:]
        self.assertEqual(A.audit([dict(rows[0], option=K)], unl)['counts']['badOption'], 1)
        # summarize carries it and stops nothing
        s = A.summarize(rule_labels(2), rows + rows, boot=10)
        self.assertEqual((s['audit']['counts']['duplicates'], s['audit']['probeSeed'], s['v']), (len(rows), None, 3))

    def test_only_d538s_own_read(self):
        s, r = self.read(rule_rows(lambda i: 1))
        self.assertEqual(r['word'], 'AGREEMENT TRACKS ELO')
        for run in (dict(RUN, boot=4000), dict(RUN, seed=538), dict(RUN, labelled=515), dict(RUN, probeSeed=538),
                    dict(RUN, labelsSha256='another-file')):
            with self.assertRaises(ValueError):
                A.d538(s, run)
        with self.assertRaisesRegex(ValueError, 'sha256 is another-file; this one is the-test-labels'):
            A.d538(s, dict(RUN, labelsSha256='another-file'))
        with self.assertRaisesRegex(ValueError, 'this read checked None'):
            A.d538(A.summarize(rule_labels(2), stamp(rule_rows(lambda i: 1)), boot=200, pairs=PAIRS,
                               split=('source', 'round2'), labels_sha=RUN['labelsSha256']), RUN)
        with self.assertRaises(ValueError):
            A.d538(s)                                                     # the run D538 fixed: 4000, 538, 515 labels
        self.assertEqual((A.D538_RUN['boot'], A.D538_RUN['seed'], A.D538_RUN['labelled']), (4000, 538, 515))
        self.assertEqual((A.D538_RUN['probeSeed'], A.D538_RUN['look']), (538, 1))
        self.assertEqual(set(A.D538_RUN['hashes']), set(A.D538_PLAYERS + A.D538_UNSEARCHED))
        self.assertEqual(set(A.D538_RUN['repeats']), set(A.D538_RUN['hashes']))
        # the labels file D538 names is the one in the repo
        with open(os.path.join(ROOT, 'fixtures', 'atlas', 'judged', 'labels-judged-v1.jsonl'), 'rb') as f:
            self.assertEqual(hashlib.sha256(f.read()).hexdigest(), A.D538_RUN['labelsSha256'])

    def test_wave_2_is_bought_on_the_first_look_only(self):
        _, r = self.read(rule_rows(lambda i: 1))
        self.assertEqual((r['word'], r['look'], r['wave2']), ('AGREEMENT TRACKS ELO', 1, True))
        s, r = self.read(rule_rows(lambda i: 1), run=dict(RUN, look=2))
        self.assertEqual((r['word'], r['look'], r['wave2']), ('AGREEMENT TRACKS ELO', 2, False))
        self.assertIn('D538 wave 2 (point 9): the second look, final: nothing is bought', A.text(dict(s, rule=r)))
        # INCONCLUSIVE with P1's point above 0 on all the labels and on the unselected ones: bought on look 1 ...
        some = lambda i: 1 if i in (1, 6) else 0   # noqa: E731
        _, r = self.read(rule_rows(some), round2=3)
        self.assertEqual((r['word'], r['p2OrP3PointAboveZero'], r['wave2']), ('INCONCLUSIVE', True, True))
        _, r = self.read(rule_rows(some), round2=3, run=dict(RUN, look=2))
        self.assertEqual((r['word'], r['wave2']), ('INCONCLUSIVE', False))
        # ... and not where neither P2's nor P3's point is above 0 (the random seats pick what the search picks)
        _, r = self.read(rule_rows(some, random_d1=some), round2=3)
        self.assertEqual((r['word'], r['p1PointAboveZero'], r['p1UnselectedPointAboveZero']), ('INCONCLUSIVE', True, True))
        self.assertEqual((r['p2OrP3PointAboveZero'], r['wave2']), (False, False))

    def test_command_line_rule(self):
        with tempfile.TemporaryDirectory() as d:
            lab, rows, out = (os.path.join(d, n) for n in ('labels.jsonl', 'rows.jsonl', 'read.json'))
            with open(lab, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in rule_labels(2)))
            with open(rows, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in stamp(rule_rows(lambda i: 1))))
            with open(lab, 'rb') as f:
                this = dict(RUN, labelsSha256=hashlib.sha256(f.read()).hexdigest())
            script = os.path.join(T, 'agreement.py')
            cmd = [sys.executable, '-I', script, '--labels', lab, '--boot', '200',
                   '--pairs', ','.join('%s:%s' % ab for ab in PAIRS), '--split', 'source=round2']
            # the command line reads D538's own run only: twelve labels at 200 draws are refused, and nothing is
            # written
            p = subprocess.run(cmd + ['--rule', 'd538', '--json', out, rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            self.assertIn('--boot 4000 --seed 538', p.stderr)
            self.assertFalse(os.path.exists(out))
            p = subprocess.run(cmd[:5] + ['--boot', '4000', '--seed', '538'] + cmd[7:] + ['--rule', 'd538', rows],
                               cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            self.assertIn('515 labelled decisions; these labels have 12', p.stderr)
            # the same read with the rule's run set to this file's, through main()
            code = ('import sys; sys.path.insert(0, %r); import agreement as A; A.D538_RUN = %r; '
                    'sys.exit(A.main(sys.argv[1:]))' % (T, this))
            run = [sys.executable, '-I', '-c', code] + cmd[3:]
            p = subprocess.run(run + ['--rule', 'd538', '--json', out, rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn('search-v1-anytime - forge-default: n 12, +0.5000 [+0.5000, +0.5000]', p.stdout)
            self.assertIn('D538 verdict: AGREEMENT TRACKS ELO', p.stdout)
            self.assertIn('D538 wave 2 (point 9): bought', p.stdout)
            with open(out) as f:
                s = json.load(f)
            self.assertEqual(s['rule']['word'], 'AGREEMENT TRACKS ELO')
            self.assertEqual(s['pairs'][0]['subsets']['source!=round2']['n'], 8)
            self.assertEqual((s['labels']['sha256'], s['audit']['probeSeed']), (this['labelsSha256'], 7))
            self.assertEqual(sum(s['audit']['counts'].values()), 0)
            # the rows of a second run appended to the file (every row twice): refused, and the read is not rewritten
            before = os.path.getmtime(out), os.path.getsize(out)
            with open(rows) as f:
                once = f.read()
            both = os.path.join(d, 'both.jsonl')
            with open(both, 'w') as f:
                f.write(once + once)
            p = subprocess.run(run + ['--rule', 'd538', '--json', out, both], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            self.assertIn('one run of the probe under --seed 7; these hold 48 duplicates', p.stderr)
            self.assertEqual((os.path.getmtime(out), os.path.getsize(out)), before)
            # another labels file of twelve labelled decisions
            with open(lab, 'a') as f:
                f.write('\n')
            p = subprocess.run(run + ['--rule', 'd538', rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            self.assertIn('reads the labels file whose sha256 is', p.stderr)
            # --json to a directory is a usage error, not a traceback
            p = subprocess.run(run + ['--json', d, rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            self.assertIn('is a directory', p.stderr)
            p = subprocess.run(run[:-2] + ['--rule', 'd538', rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)                             # the rule without its split
            p = subprocess.run(cmd + ['--pairs', 'a-b', rows], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)

    def test_the_json_is_not_a_rows_file(self):
        # `--json ROWS` with no output name takes the first rows file as the output: refused before it is read
        with tempfile.TemporaryDirectory() as d:
            lab, rows, rows2 = (os.path.join(d, n) for n in ('labels.jsonl', 'rows.jsonl', 'rows2.jsonl'))
            with open(lab, 'w') as f:
                f.write(''.join(json.dumps(r) + '\n' for r in LABELS))
            for name in (rows, rows2):
                with open(name, 'w') as f:
                    f.write(''.join(json.dumps(r) + '\n' for r in X))
            with open(rows) as f:
                before = f.read()
            p = subprocess.run([sys.executable, '-I', os.path.join(T, 'agreement.py'), '--labels', lab, '--boot', '50',
                                '--json', rows, rows2], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(p.returncode, 2)
            with open(rows) as f:
                self.assertEqual(f.read(), before)


if __name__ == '__main__':
    unittest.main()

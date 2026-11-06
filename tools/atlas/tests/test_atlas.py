# mtg-table — tools/atlas tests: the label pipeline and the release's scrub over the committed fixture (D515).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""labels.py and compare.py over fixtures/atlas/night (J193's s07, trimmed by make_fixture.py) give their golden
counts; a release built from it is clean and deterministic; and the scrub check fails on each thing it exists to
catch, planted one at a time. No engine, no lab data, standard library only, a few seconds.

    python3 -m unittest discover -s tools/atlas/tests

The goldens are the fixture's own: regenerate the fixture with make_fixture.py and write the new counts here in the
same change, with the diff read, never one without the other."""
from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
T = os.path.join(ROOT, 'tools', 'atlas')
NIGHT = os.path.join(ROOT, 'fixtures', 'atlas', 'night')
SPINE = 'b-s07-legacy-3791'
sys.path.insert(0, T)
import release as R  # noqa: E402

LABELS_GOLDEN = {'branched': 13, 'labels': 8, 'confident': 6, 'confidentForge': 0, 'partialLabels': 2,
                 'futilityControls': 0, 'rowsUnmatched': 0, 'trainingRows': 13, 'branchedInFullRows': 0,
                 'voidLabels': 0, 'screenedRows': 3}
COMPARE_GOLDEN = {'spines': 1, 'labels': 8, 'confident': 6, 'branchGames': 234, 'wallSec': 7141,
                  'decisionsBranched': 10, 'partial': 2, 'listedPerTurn': 1.62, 'optionsPerFull': 4.3,
                  'cappedShare': 0.0, 'regretMean': 0.1129, 'workerHours': 11.9, 'confidentPerWorkerHour': 0.5041}


def slurp(p, mode='r'):
    with open(p, mode) as f:
        return f.read()


def lines(p):
    return [json.loads(x) for x in slurp(p).splitlines() if x.strip()]


def write(p, text):
    with open(p, 'w') as f:
        f.write(text)


def run(*args, env=None):
    p = subprocess.run([sys.executable, '-I'] + list(args), cwd=ROOT, capture_output=True, text=True,
                       env=dict(os.environ, **(env or {})))
    return p


class Pipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='atlas-test-')
        cls.rows = os.path.join(cls.tmp, 'labels.jsonl')
        p = run(os.path.join(T, 'labels.py'), 's07:random-legacy-d508:3691:3791:1d0d18f3:' + os.path.join(NIGHT, SPINE),
                '--out=' + cls.rows, '--training=1', '--times=' + os.path.join(NIGHT, 'spine-times.txt'))
        if p.returncode != 0:
            raise AssertionError('labels.py failed: ' + p.stderr)
        cls.labels_json = os.path.join(cls.tmp, 'labels.json')
        write(cls.labels_json, p.stdout)
        cls.labels = json.loads(p.stdout)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def build(self, out, *extra):
        return run(os.path.join(T, 'release.py'), '--out', out, '--night', 'J193=' + NIGHT, '--labels', 'J193=' + self.rows,
                   '--source-commit', 'fixture', *extra)

    def test_labels_golden(self):
        self.assertEqual({k: self.labels[k] for k in LABELS_GOLDEN}, LABELS_GOLDEN)
        a = self.labels['a_confidentShare']
        self.assertEqual((a['point'], a['interval']), (0.75, [0.375, 1.0]))
        z = self.labels['c_sizing7']['asRun']
        self.assertEqual((z['workerHours'], z['confidentPerWorkerHour']), (11.9, 0.5041))
        rows = lines(self.rows)
        self.assertEqual(len(rows), 13)
        self.assertEqual(sum(r['confident'] for r in rows), 6)

    def test_compare_golden(self):
        p = run(os.path.join(T, 'compare.py'), NIGHT, self.labels_json)
        self.assertEqual(p.returncode, 0, p.stderr)
        night = json.loads(p.stdout)['night']['this']
        self.assertEqual({k: night[k] for k in COMPARE_GOLDEN}, COMPARE_GOLDEN)

    def test_every_key_in_the_guide(self):
        s = slurp(os.path.join(ROOT, R.GUIDE))
        block = s[s.index('<!-- fields -->'):s.index('<!-- /fields -->')]
        keys = set(re.findall(r'^\| `([^`]+)` \|', block, re.M))
        for r in lines(self.rows):
            self.assertLessEqual(set(r), keys, 'a row key the guide does not list')
            for o in r['options']:
                self.assertLessEqual({'options[].' + k for k in o}, keys)
        self.assertIn('night', keys)

    def test_fixture_is_clean(self):
        for dp, _, fs in os.walk(os.path.join(ROOT, 'fixtures', 'atlas')):
            for f in fs:
                data = slurp(os.path.join(dp, f), 'rb')
                for b in R.banned():
                    self.assertIsNone(b.search(data), '%s holds %s' % (f, b.pattern))
        base = json.loads(slurp(os.path.join(NIGHT, SPINE, 'phaseB', 'baseline.json')))
        for x in base['decisions']:
            for idt in x.get('identities') or []:
                self.assertFalse(R.identity_has_text(idt), idt)

    def test_release_is_clean_and_deterministic(self):
        out1, out2 = os.path.join(self.tmp, 'r1', 'move-atlas-test'), os.path.join(self.tmp, 'r2', 'move-atlas-test')
        p = self.build(out1)
        self.assertEqual(p.returncode, 0, p.stderr)
        c = json.loads(p.stdout)['counts']
        self.assertEqual({k: c[k] for k in ('rows', 'labels', 'confident', 'spines', 'decks', 'branchRows')},
                         {'rows': 13, 'labels': 8, 'confident': 6, 'spines': 1, 'decks': 2, 'branchRows': 234})
        self.assertEqual(R.check(out1), [])
        self.assertEqual(self.build(out2).returncode, 0)
        self.assertEqual(slurp(out1 + '.zip', 'rb'), slurp(out2 + '.zip', 'rb'), 'the zip is not deterministic')
        rows = lines(os.path.join(out1, 'labels.jsonl'))
        self.assertEqual({r['night'] for r in rows}, {'J193'})
        self.assertTrue(all(r['deckA'].startswith('decks/J193/s07-legacy-3691/') for r in rows))
        self.assertTrue(all(r['branchesFile'] == 'branches/J193/%s.branches.jsonl' % SPINE for r in rows))
        acts = [o for r in rows for o in r['options'] if o['token'].startswith('activate')]
        self.assertTrue(acts, 'the fixture has no activate option to scrub')
        for o in acts:
            self.assertEqual(o['label'], o['identity'].split('|')[0])
        man = json.loads(slurp(os.path.join(out1, 'MANIFEST.json')))
        self.assertEqual(set(man['files']), {os.path.relpath(os.path.join(dp, f), out1).replace(os.sep, '/')
                                             for dp, _, fs in os.walk(out1) for f in fs} - {'MANIFEST.json'})
        self.assertIn(R.ATTRIBUTION, slurp(os.path.join(out1, 'README.md')))

    def test_check_catches_each_plant(self):
        out = os.path.join(self.tmp, 'plant', 'move-atlas-test')
        self.assertEqual(self.build(out, '--no-zip').returncode, 0)
        lj = os.path.join(out, 'labels.jsonl')
        bj = os.path.join(out, 'branches', 'J193', SPINE + '.branches.jsonl')
        clean_rows, clean_branches = slurp(lj), slurp(bj)

        def plant_row(f):
            rows = [json.loads(x) for x in clean_rows.splitlines()]
            f(rows)
            write(lj, ''.join(R.dumps_line(r) for r in rows))

        def expect(pattern):
            problems = R.check(out)
            self.assertTrue(any(re.search(pattern, p) for p in problems), (pattern, problems))
            write(lj, clean_rows)
            write(bj, clean_branches)
            self.assertEqual(R.check(out), [])

        def text_identity(rows):
            o = next(o for r in rows for o in r['options'] if '|' in str(o['identity']))
            o['identity'] += '|Kicker1|Draw a card.'   # a ninth field: the rules text
        plant_row(text_identity)
        expect(r'rules-text field')

        def raw_label(rows):
            o = next(o for r in rows for o in r['options'] if o['token'].startswith('activate'))
            o['label'] += ': {T}: Add one mana'
        plant_row(raw_label)
        expect(r'activate label')

        def field(key, value):
            def f(rows):
                rows[0][key] = value
            return f
        # an absolute path of each shape a machine's paths take, a Windows drive, a mail address, a mana symbol
        for value, pattern in (('/home/someone/lab/x.gz', r"holds '\"/home/'"), ('/mnt/e/forgecoach-archive', r"holds '\"/mnt/'"),
                               ('see /tmp/x', r"holds ' /tmp/'"), ('(/var/lib/x)', r"holds '\(/var/'"),
                               ('/Users/someone/x', r"holds '\"/Users/'"), ('/root/x', r"holds '\"/root/'"),
                               ('/media/usb/x', r"holds '\"/media/'"), ('/srv/lab/x', r"holds '\"/srv/'"),
                               ('C:\\Users\\x', r"holds 'C:"), ('someone@gmail.com', r"holds '@gmail\.'"),
                               ('Justin', r"holds 'Justin'"), ('pay {2}{W}', r"holds '\{2\}'"), ('{T}: add', r"holds '\{T\}'")):
            plant_row(field('frameLog', value))
            expect(pattern)
        host = socket.gethostname()
        if len(host) >= 6 and host.lower() != 'localhost':
            plant_row(field('pool', 'built on ' + host))
            expect(r'holds ' + re.escape(repr(host)))

        b = [json.loads(x) for x in clean_branches.splitlines()]
        x = next(r for r in b if r['token'].startswith('activate'))
        x['label'] += ': {2}, Sacrifice CARDNAME: Draw a card'
        write(bj, ''.join(R.dumps_line(r) for r in b))
        expect(r"holds 'CARDNAME'")
        x['label'] = x['label'].replace('CARDNAME', 'this')
        write(bj, ''.join(R.dumps_line(r) for r in b))
        expect(r"is not the atlas option's")

        def deck(rows):
            rows[0]['deckA'] = 'decks/J193/nowhere.dck'
        plant_row(deck)
        expect(r'is not in the release')

    def test_relative_refuses_a_foreign_absolute_path(self):
        self.assertEqual(R.relative('/data/night/b-s01/x.gz', '/data/night'), 'b-s01/x.gz')
        self.assertEqual(R.relative('b-s01/x.gz', '/data/night'), 'b-s01/x.gz')
        for p in ('/mnt/e/forgecoach-archive', '/data/nightly/x', 'C:\\lab\\x', 'D:/lab/x'):
            with self.assertRaises(ValueError):
                R.relative(p, '/data/night')

    def test_scrub_identity(self):
        self.assertEqual(R.scrub_identity('Thieving Skydiver|spell|Original|-|-|-|-|Kicker1|Thieving Skydiver - Creature 2 / 1'),
                         'Thieving Skydiver|spell|Original|-|-|-|-|Kicker1')
        self.assertEqual(R.scrub_identity('Holy Light|spell|Original|-|-|-|-||Nonwhite creatures get -1/-1 until end of turn.'),
                         'Holy Light|spell|Original|-|-|-|-|')
        for s in ('pass', 'attack:137,138', 'block:11>53', 'Holy Light|spell|Original|-|-|-|-|'):
            self.assertEqual(R.scrub_identity(s), s)
            self.assertFalse(R.identity_has_text(s))
        self.assertEqual(R.scrub_label('activate:23#0', 'Circle of Protection: Black: {1}: The next time a bla',
                                       'Circle of Protection: Black|ability|Original|-|-|-|-|'), 'Circle of Protection: Black')
        with self.assertRaises(ValueError):
            R.scrub_label('activate:23#0', 'Something else: {T}', 'Circle of Protection: Black|ability|Original|-|-|-|-|')


if __name__ == '__main__':
    unittest.main()

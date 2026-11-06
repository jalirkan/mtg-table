#!/usr/bin/env python3
# mtg-table — tools/atlas: derive the committed atlas fixture (fixtures/atlas/) from one finished spine, scrubbed.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The atlas fixture (D515): one finished spine folder, trimmed and scrubbed, small enough to commit, so that
labels.py, compare.py and release.py's scrub check run in the gate with no lab data and no engine.

    python3 -I tools/atlas/make_fixture.py --spine <night data folder>/<b-sNN-...> --out fixtures/atlas/night \\
        [--branches 3] [--night J193]

READS the spine's plan.json, atlas.json, phaseB/baseline.json, phaseB/baseline/rows/*.jsonl and
phaseB/branches.jsonl, its night's spine-times.txt and the two decks plan.json names.
WRITES, under --out (which must not exist):
    spine-times.txt                     the spine's own lines
    decks/<deck folder>/decks/*.dck     the two decks, as the draw wrote them
    <spine>/plan.json                   deckA/deckB relative to --out
    <spine>/atlas.json                  as release.py scrubs it (paths relative, activate labels the card's name,
                                        each option's identity), deckA/deckB as plan.json's
    <spine>/phaseB/baseline.json        each identity without its rules-text field, each activate label the name
    <spine>/phaseB/baseline/rows/rows-0.jsonl   the begin row's two seats and each decision row's seat, kind, turn
                                        and tokens: all labels.py reads (the state vectors, the policy's numbers
                                        and the deck paths are dropped)
    <spine>/phaseB/branches.jsonl       the first --branches branch rows (i < N) of every decision, map and option
So the fixture's atlas.json is the spine's as it ran while its branches are a handful: labels.py's counts that come
from atlas.json are the night's, and those from the branch rows (fullN, branchedInFull, the D486-D488 sums) the
trimmed file's. tools/atlas/tests/test_atlas.py holds the goldens; regenerate both together, never by hand.
Standard library only; no engine.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import release as R  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description='derive fixtures/atlas from one spine (D515)')
    ap.add_argument('--spine', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--branches', type=int, default=3)
    ap.add_argument('--night', default='J193')
    a = ap.parse_args()
    spine = os.path.abspath(a.spine)
    root, folder = os.path.dirname(spine), os.path.basename(spine)
    out = os.path.abspath(a.out)
    if os.path.exists(out):
        sys.exit('make_fixture.py: %s exists; remove it first' % out)
    sp = R.Spine(a.night, root, folder)
    o_sp = os.path.join(out, folder)
    os.makedirs(os.path.join(o_sp, 'phaseB', 'baseline', 'rows'))

    def deck_rel(p):
        parts = p.replace('\\', '/').split('/')
        return '/'.join(['decks', parts[-3], 'decks', parts[-1]])

    plan = dict(sp.plan)
    for k in ('deckA', 'deckB'):
        src = sp.plan[k]
        plan[k] = deck_rel(src)
        dst = os.path.join(out, plan[k])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
    write_json(os.path.join(o_sp, 'plan.json'), plan, indent=2)

    doc = R.scrub_atlas(sp, json.load(open(os.path.join(spine, 'atlas.json'))))
    doc['plan']['deckA'], doc['plan']['deckB'] = plan['deckA'], plan['deckB']
    write_json(os.path.join(o_sp, 'atlas.json'), doc, indent=1)

    base = json.load(open(os.path.join(spine, 'phaseB', 'baseline.json')))
    for x in base['decisions']:
        x['labels'] = [sp.label(x['d'], o, t, lab) for o, (t, lab) in enumerate(zip(x['tokens'], x['labels']))]
        if x.get('identities'):
            x['identities'] = [R.scrub_identity(s) for s in x['identities']]
    write_json(os.path.join(o_sp, 'phaseB', 'baseline.json'), base)

    rows = []
    for f in sorted(glob.glob(os.path.join(spine, 'phaseB', 'baseline', 'rows', '*.jsonl'))):
        for line in open(f):
            r = json.loads(line)
            if r.get('type') == 'begin':
                rows.append({'type': 'begin', 'seat0': r.get('seat0'), 'seat1': r.get('seat1')})
            elif r.get('type') == 'row':
                rows.append({'type': 'row', 'seat': r['seat'], 'kind': r['kind'], 'turn': r['turn'], 'tokens': r['tokens']})
        break
    with open(os.path.join(o_sp, 'phaseB', 'baseline', 'rows', 'rows-0.jsonl'), 'w') as f:
        for r in rows:
            f.write(R.dumps_line(r))

    with open(os.path.join(o_sp, 'phaseB', 'branches.jsonl'), 'w') as f:
        for line in open(os.path.join(spine, 'phaseB', 'branches.jsonl')):
            if not line.strip():
                continue
            b = json.loads(line)
            if b['i'] < a.branches:
                b['label'] = sp.label(b['d'], b['o'], b['token'], b['label'])
                f.write(R.dumps_line(b))

    with open(os.path.join(out, 'spine-times.txt'), 'w') as f:
        for line in open(os.path.join(root, 'spine-times.txt')):
            if line.split()[:1] == [folder]:
                f.write(line)
    print('make_fixture.py: %s -> %s' % (folder, out))


def write_json(p, x, indent=None):
    with open(p, 'w') as f:
        json.dump(x, f, indent=indent, ensure_ascii=False)
        f.write('\n')


if __name__ == '__main__':
    main()

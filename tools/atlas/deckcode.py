#!/usr/bin/env python3
# mtg-table — tools/atlas: the pilot's check that the deck draw's code is the registered one.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The pilot's `deck_code` check: the deck draw's code (tools/cubelab/deckcensus.ts and engine-unplayable.json) is
J171's pin's plus exactly D490, D492, D494 and D506.

    python3 -I tools/atlas/deckcode.py <blob of deckcensus.ts> <blob of engine-unplayable.json>

READS $ATLAS_LOCAL/{deckcensus.diff, unplayable-j171.json, unplayable-j176.json} (ATLAS_LOCAL defaults to
var/lab-j193-local; the pilot writes them with git) and tools/cubelab/engine-unplayable.json; WRITES one line to
stdout and exits 0 when all three checks hold. The registered constants are J193's pin's. Standard library only.

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the job folder, now
$ATLAS_LOCAL. The comment block below is the job's.
"""
# J193: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j193-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j193.py from the
# pin 1d0d18f3 with git, never typed, and is J186's, J187's, J188's, J190's and J191's. Exits 0 when all three hold:
#   census  deckcensus.ts: 4 lines out and 6 in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's (c6e8da43 last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, os, sys
L = os.environ.get('ATLAS_LOCAL', 'var/lab-j193-local') + '/'
DC_BLOB, UP_BLOB = '1355d638dc0896877706997f782fc1eca9ad7e7a', 'd206ab43d77204c097ae51a3339744cb23027cb0'
OUT_N, IN_N = 4, 6
OUT_SHA = 'c33d99f15cbf25d271a17013ed342e7d5199a66ba0b22fa740e37a826ab262eb'
IN_SHA = '4bad5bc95b6af2be837483efda4d0212c251dca6a2334d3c6be9075ad6a1d87b'
NEW = ['Emeritus of Abundance', 'Elite Interceptor', 'Emeritus of Ideation', 'Studious First-Year', 'Ob Nixilis, the Adversary']
NEW506 = ['Old Man of the Sea', 'Rubinia Soulsinger']
try:
    d = open(L + 'deckcensus.diff').read().splitlines()
    out = [x[1:] for x in d if x.startswith('-') and not x.startswith('---')]
    inn = [x[1:] for x in d if x.startswith('+') and not x.startswith('+++')]
    a = json.load(open(L + 'unplayable-j171.json'))['cards']
    c = json.load(open(L + 'unplayable-j176.json'))['cards']
    t = json.load(open('tools/cubelab/engine-unplayable.json'))
except (OSError, ValueError, KeyError) as e:
    sys.exit('J193 deck code: %s' % e)


def h(xs):
    return hashlib.sha256('\n'.join(xs).encode()).hexdigest()


def pre(x):
    return x.split('throw new Error(', 1)[0]


thr_out, thr_in = [pre(x) for x in out if 'throw new Error(' in x], [pre(x) for x in inn if 'throw new Error(' in x]
census = ((len(out), len(inn)) == (OUT_N, IN_N) and h(out) == OUT_SHA and h(inn) == IN_SHA and len(thr_out) == 1 and thr_out == thr_in
          and all(x.strip().startswith(('//', '/**')) or 'throw new Error(' in x for x in out + inn))
b = t.get('cards') or {}
lst = (t.get('decision') == 'D482' and list(b) == list(a) + ['Chain of Smog'] + NEW + NEW506 and all(b[k] == a[k] for k in a)
       and list(c) == list(a) + ['Chain of Smog'] and b['Chain of Smog'] == c['Chain of Smog'] and b['Chain of Smog'].get('since') == 'J173'
       and all(b[k].get('since') == 'J176' and str(b[k].get('why', '')).strip() != '' and str(b[k].get('evidence', '')).strip() != '' for k in NEW)
       and all(b[k].get('since') == 'J183' and str(b[k].get('why', '')).strip() != '' and str(b[k].get('evidence', '')).strip() != '' for k in NEW506))
blobs = sys.argv[1:3] == [DC_BLOB, UP_BLOB]
print("J193 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)

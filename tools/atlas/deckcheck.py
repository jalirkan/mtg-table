#!/usr/bin/env python3
# mtg-table — tools/atlas: a spine's check that its decks are the draw the pilot recorded.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""A spine block's check of its own decks: the folder's draw and both decks are the sha256s the pilot recorded.

    python3 -I tools/atlas/deckcheck.py NAME FOLDER DECK1 DECK2

READS the draw folder, the two .dck files and $ATLAS_LOCAL/draws-pilot.json (ATLAS_LOCAL defaults to
var/lab-j193-local); exits 0 when they agree. Standard library only.

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the record's folder, now
$ATLAS_LOCAL. The comment block below is the job's.
"""
# J193: J177's deckcheck.py, unchanged but for the record's path (var/lab-j193-local/draws-pilot.json).
# J177: a spine block's check of its own decks: the folder's draw and both decks are the sha256s the pilot recorded (draws-pilot.json).
# Usage: deckcheck.py NAME FOLDER DECK1 DECK2 ; exits 0 when they are, else 1. Standard library only.
import glob, hashlib, json, os, sys
name, k0, a, b = sys.argv[1:5]


def drawsha(d):
    h, n = hashlib.sha256(), 0
    h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
    for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
        h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
        n += 1
    return '%s %d' % (h.hexdigest(), n)


try:
    want = json.load(open(os.environ.get('ATLAS_LOCAL', 'var/lab-j193-local') + '/draws-pilot.json'))['spines'][name]
    got = [drawsha(k0), hashlib.sha256(open(a, 'rb').read()).hexdigest(), hashlib.sha256(open(b, 'rb').read()).hexdigest()]
except (OSError, ValueError, KeyError) as e:
    sys.exit('J193: %s: %s' % (name, e))
sys.exit(0 if got == want and got[0].endswith(' 2') else 'J193: %s: the decks under %s are not the draw the pilot recorded' % (name, k0))

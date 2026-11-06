#!/usr/bin/env python3
# mtg-table — tools/atlas: the sha256 of a set of deck draws.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The sha256 of a set of deck draws: each folder's decks.jsonl, then its decks/*.dck by name.

    python3 -I tools/atlas/drawsha.py DIR ...

READS the named draw folders; WRITES the hex digest and the deck count to stdout. Standard library only.

Moved into the repository from the lab's J193 job file, byte for byte (D515); the comment block below is the job's.
"""
# J193 (drafts/J193-atlas-4b-night-fifteen.md): J177's drawsha.py, unchanged.
# J177: J171's drawsha.py, unchanged (J170's, J169's, J168's, J167's, J166's).
# The sha256 of a set of deck draws, in the order named: each folder's decks.jsonl, then its decks/*.dck by name.
# Usage: drawsha.py DIR... ; prints the hex digest and the deck count. Standard library only.
import glob, hashlib, os, sys
h, n = hashlib.sha256(), 0
for d in sys.argv[1:]:
    h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
    for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
        h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
        n += 1
print(h.hexdigest(), n)

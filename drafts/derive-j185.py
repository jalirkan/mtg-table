#!/usr/bin/env python3
"""J185 is J184 posted again: the same job file, the same pin (0a6cf5c1) and the same seed block, after J184 failed in 14 s at its
prepare step with `fatal: Needed a single revision` -- the pin was not on origin/main yet (pushed 2026-11-02 20:5x EST; the runner's
clone fetches from GitHub). J184 drew nothing and wrote nothing (lab-j184 was empty and is removed). Only the job's own name moves
(J184 -> J185, lab-j184 -> lab-j185 and the local folders), and two sentences say why. Run: python3 derive-j185.py"""
import re, sys
SRC = '/home/justin-a/code/pc-results/drafts/J184-atlas-4b-night-nine.md'
DST = '/home/justin-a/code/pc-results/drafts/J185-atlas-4b-night-nine.md'
t = open(SRC).read()
n184 = t.count('J184') + t.count('j184')
t = t.replace('J184', 'J185').replace('j184', 'j185')
assert 'J184' not in t and 'j184' not in t
# the derivation note: this script, not derive-j184.py, wrote the file
t = t.replace('drafts/derive-j185.py', 'drafts/derive-j184.py (then drafts/derive-j185.py, the rename)')
old = '4. **J183 has ended**'
assert t.count(old) == 1
t = t.replace(old, """4. **J184 was this file, posted at 20:20 EST and failed at 20:21 in its prepare step** (`fatal: Needed a single revision`: the pin
   0a6cf5c1 was gated and merged on the PC but not yet pushed to origin/main, which the runner's clone fetches; pushed before this
   post). It drew nothing and wrote nothing -- `lab-j184` stayed empty and is removed -- so J185 is J184 posted again: the same pin,
   the same design, the same seed block (2427-2439 and its companions, which J184 never used), the same registered strings; only the
   job's own name and its folders move (`drafts/derive-j185.py`, the rename). A failed job is never reopened; this is a new one.
5. **J183 has ended**""", 1)
# renumber the items after the inserted one, inside the Before posting list only
head, sep, tail = t.partition("5. **J183 has ended**")
tail2 = tail.replace("\n5. **`--decisions` stays 10.**", "\n6. **`--decisions` stays 10.**", 1).replace("\n6. **Nothing else to make, move or clean.**", "\n7. **Nothing else to make, move or clean.**", 1)
assert tail2 != tail
t = head + sep + tail2
# the seeds sentence: say the block is J184's, unused
old = "**The seeds are new** (checked by derive-j185"
assert t.count(old) == 1, 'seeds sentence'
t = t.replace(old, "**The seeds are new** (J184 reserved this block and never drew from it -- its prepare step failed before any draw, *Before posting* 4; checked by derive-j184", 1)
open(DST, 'w').write(t)
print('J184/j184 occurrences renamed:', n184, '; wrote', DST, len(t.splitlines()), 'lines')

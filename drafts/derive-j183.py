#!/usr/bin/env python3
"""Derive J183's job file from J182's, by the three-trap rule:
(1) rename only the job's own name (J182 -> J183), then move the comparison night (J181 -> J182) on what is left;
(2) shift the four seed ranges inclusive of their bases, [2400, 2413] and its three companions, +13, skipping any number touching a
letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints every change);
(3) change registered strings only on purpose, each one named here.
J183 is the SAME population as J182 (D498's, `random-<band>-d498`): the only change since J182's pin (ac07876b) is the redaction
checker and docs (D502-D504; `git diff --name-only ac07876b 3275af30 -- bridge/src` is empty), so the pool spelling does not move, the
`seat_code` lists stay J182's and gain a since-ac07876b-empty test, and every history paragraph is rewritten, not shifted.
Every hand edit is STASHED before the rename and the shift (a placeholder holds its final text), so neither can touch it; whatever is
not stashed is renamed and shifted mechanically, and the script prints every J181 left before the comparison move."""
import re, sys

SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J182-atlas-4b-night-seven.md'
DST = '/home/justin-a/code/pc-results/drafts/J183-atlas-4b-night-eight.md'
PIN = '3275af30498e91c03d652d021685d9847b62d95f'   # the merge of pc/d502-checker-shapes on main, gated (its line in the message)
PREV = 'ac07876b97e052b3e0ddd530a1930173e998133c'  # J182's pin
t = open(SRC).read()
n0 = len(t.splitlines())
FAIL = []
STASH = {}


def key():
    return '\x00S%d\x00' % len(STASH)


def put(old, new, count=1):
    """Replace `old` (J182's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
    global t
    c = t.count(old)
    if (count and c != count) or (not count and c == 0):
        FAIL.append('expected %s of %r, found %d' % (count or 'some', old[:140], c)); return
    k = key(); STASH[k] = (new, c)
    t = t.replace(old, k)


def span(start, end, new):
    """Replace t[start .. end) (end exclusive) by a placeholder holding `new`."""
    global t
    try:
        i = t.index(start); j = t.index(end, i)
    except ValueError:
        FAIL.append('span %r .. %r not found' % (start[:80], end[:80])); return
    k = key(); STASH[k] = (new, 1)
    t = t[:i] + k + t[j:]


def must(old, new, count=1):
    """A plain replacement on the renamed and shifted text (used after the shift only)."""
    global t
    c = t.count(old)
    if (count and c != count) or (not count and c == 0):
        FAIL.append('expected %s of %r, found %d' % (count or 'some', old[:140], c)); return
    t = t.replace(old, new)


# ======================================================================================================================================
# 0. the history paragraphs, rewritten (J182's night)
# ======================================================================================================================================
span('**Why J182.**', '**Before posting -- the coordinator', '''**Why J183.** J182 (rung 4b, night seven, the first of D498's population; posted 2026-11-01 21:41 EST, started 21:42, finished
2026-11-02 07:34 EST) played all 13 spines and its Report: 198 branched decisions, 89 labels, 26 confident, 34 partial, 6 controls (0
of them confident at the full n), 0.451 confident labels a worker-hour (31.6 a 7-worker night [20.6, 46.3]; J181's 0.464), all 13
spines at 6 workers, 34,576 s of walls (9.6 h; 11.8 to 85.5 min a spine), 57.6 worker-hours, 60,855 branch games, 14 branch timeouts
(J181: 12). **One check failed: `atlas.problems == 0`, on 3 problems** (s04, s06 and s10): eleven branch logs failed
`tools/check-redaction.mjs` in three shapes, each of them legitimate engine behaviour the checker had not met, and each admitted by a
decision merged since J182's pin (ac07876b) -- in the checker alone, its fixtures and docs; the bridge is unchanged:
- **s06** (peasant, 2406/2506; five logs, A9): the opponent's Watcher for Tomorrow hid a card of its library with Hideaway; the
  opponent's Burglar's Plot then exchanged control of the Watcher with seat 0's creature, so seat 0 controlled the permanent that hid
  the card, and Forge's hideaway look (`MayLookAt$ EffectSourceController`, CR 702.75a) showed seat 0 the card's face -- the look the
  rules give. **D502** admits that look, tied to the host's hideaway trigger and only while the viewer holds the host.
- **s10** (peasant, 2410/2510; five logs, M55): seat 0 cast Eye for an Eye while the opponent sacrificed its Goat Token to Woe
  Strider (a token in a graveyard ceases to exist); Eye for an Eye's "choose a source" then offered the token by last known
  information. **D503** accepts another seat's token that a state listed on its own battlefield and that ceased to exist.
- **s04** (powered, 2404/2504; one log, M55): the opponent cast Kormus Bell from its hand and seat 0 countered it with Force of
  Negation inside a held batch, so both decisions named the last state written, where the Bell was still a stub in the opponent's hand.
  **D504** accepts an opponent's spell cast from its hand between frames, with its `cast` event.
- **D497-D500's field signals held**: `damageLkiLost` 0 on every spine, no abandoned or superseded play (no unit re-ran), no
  `paperCard` and no `getDamageLKI` in any errored branch's stack, no A6 failure, and no bare exception in any worker log. One branch
  errored with a full stack: an engine `IndexOutOfBoundsException` in Forge's `PumpEffect.resolve` (`FCollection.get` on an empty list,
  `PumpEffect.java:299`, the site this file already names as known) in one branch of s11 (d10, o2, b32) -- under the 50-error bar, not
  a problem; this night counts that stack across its worker logs (`pump_effect_ioobe`, information).
- The refused payments rose: `refusedCastShare` 0.92% for the night (J181's 0.15%), from s04 (4.6%), s06 (3.3%) and s10 (2.2%);
  `refusedCastOptions == 0` held. Read beside, not a fault.

J183 is J182's night carried forward onto that main: the same design, the same pilot, the same reads and checks, 13 new spines at the
next seeds in a new folder, `lab-j183`. J182's own outputs stay in `lab-j182/` and are read only, for the J182 columns. **J183 is the
SAME population as J182** (D498's): nothing since J182's pin changed what a branch plays -- `git diff --name-only ac07876b <pin> --
bridge/src` is empty; D502-D504 read a branch's log after it is played -- so J183's labels pool with J182's under the same pool names,
`random-<band>-d498`, and J182's numbers are read beside, by position, and added in where a read pools (the futility read).

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', '''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j183` does not exist yet (2026-11-02, when this was drafted): the owner
   makes it, empty, before posting (`mkdir`, then `ls -A` prints nothing). The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j183/`,
   from an earlier J183 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `3275af30498e91c03d652d021685d9847b62d95f`, the merge of `pc/d502-checker-shapes` on origin/main (2026-11-02,
   gated once on the merged tree from a deleted `bridge/out`; the line is in the merge commit's message; the same tree as the gate
   worktree's 57d94fc3, its message amended with that line). Written by this draft from `git rev-parse 3275af30`; no
   placeholder pin is left in this file.
3. **The names this file reads were checked against the pin itself** (this draft, 2026-11-02, by hand in a throwaway worktree at
   3275af30): the three decision files D502-D504 and the names each `has_d502`/`has_d503`/`has_d504` grep reads (the pilot's lines),
   `seat_code` (`bridge/src` unchanged since J182's pin; the 480c837d, 6e87e5d4 and 7a984963 lists J182's) and `deck_code` (nothing under
   `fixtures/cubelab/seat-identity.json`, `tools/cubelab/deckcensus.ts`, `cubes/library/` or `tools/cubelab/engine-unplayable.json` since
   ac07876b) all print 1. **If the pin moves, run them again** and re-derive any guard from the new diff, writing here what it now
   accepts -- never loosen it to pass. D497-D501's names are checked unchanged by their own greps.
4. **J182 has ended** (failed on `atlas.problems == 0` alone, 3 problems: eleven branch logs in three checker shapes, D502-D504; its
   Report written: `lab-j182/report/labels.json`, `reads.json`, `compare-j181.json` and the rest). J183 reads lab-j182 read-only, for its
   J182 columns and the pooled futility read's first input; nothing waits on another job, so there is **no `after:` line**. J182's job
   file needs nothing.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J183 compares with J182 position by position and
   pools with it, and a change of design beside the new decks would split the population's two nights.
6. **Nothing else to make, move or clean.** J183 reads lab-j170 (J171's night), lab-j182 (J182's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, and J182's from `lab-j182/report/draws.json`, read by this draft on 2026-11-02), so it reads
   no `var/lab-j1xx-local/` folder but its own. Post nothing that writes lab-j182 or lab-j183 beside J183.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare across nights', '''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough"; the
  count D498's population holds is J182's 6 before tonight (0 confident); with tonight's ~6-14 it is the first pooled read of two
  nights, still too few to read on its own (D497's holds J181's 13, D493's J177's 12 and J180's 14, 0 of 39 confident, read beside);
  0.25 holds until this population's pooled count can carry the read.
''')

span("**So J182 is D498's population's first night, on new spines**", '**The seeds are new', '''**So J183 is D498's population's second night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's, the
copier's carry D497's, the redeal D498's and the copier's damage history D500's, all as J182's; only the redaction checker changed
(D502-D504), and it reads a played branch's log, so J183's labels pool with J182's -- `pool: random-<band>-d498`, contract v6.
**Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's, so s01 is pauper and s13 pauper again), into
a new folder. **J182's numbers are a comparison by position, never a baseline**: s01 beside s01 is the same band, the same population
and the same branching design, but other decks and other seeds -- every difference is a candidate. J181's, J180's, J177's, J173's and
J171's nights stay other populations and appear only in the readers' self-tests, their registered expectations and J177's sizing
paragraph.

''')

span('**The seeds are new', '## The decks', '''**The seeds are new** (checked by this draft, 2026-11-02): J182's block plus 13 -- deck seeds **2414-2426** (`$((2413 + K))`), game
seeds **2514-2526** (the deck seed + 100), validation deck seeds **2614-2626** (`$((2613 + K))`) with game seeds **2714-2726**
reserved. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -w -E
'241[4-9]|242[0-6]|251[4-9]|252[0-6]|261[4-9]|262[0-6]|271[4-9]|272[0-6]' 6ccbf5b5 -- jobs/` (pc-jobs at 6ccbf5b5, J182's post) finds
nothing, nor does the same grep over `/home/justin-a/code/pc-results/drafts/*.md`; the block after this one
(`'242[7-9]|243[0-9]|252[7-9]|253[0-9]|262[7-9]|263[0-9]|272[7-9]|273[0-9]'`) finds only the decimal `0.2635`, a colour share in
J167's registered makeup, no seed; every computed seed in a job or draft is an earlier block's (`$((2000 + K))` to J181's
`$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391, with the older blocks' small ones below 1700) or
J182's `$((2400 + K))` and `$((2600 + K))` (2401-2413, 2501-2513, 2601-2613, 2701-2713, lab-j182's); and no folder under
`/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. The game seeds stay in the 25?? hundreds, so every
`lab-j183` glob keeps `b-s??-*-25??`, and the comparison's `lab-j182` globs read `25??` where J182's read lab-j181's `21??`. Bases and
literals were moved together by one inclusive shift of J182's block ([2400, 2413] and its three companions, +13), skipping any number
touching a letter, a dot or a hex digit, and every changed four-digit token was read in context: three registered self-test values fell
in the deck range and were restored by name -- metrics.py's count 2400 of `play not rebuilt on the copy (D472, D476)` on J162's night
and the `retargeted` 2401 of J171's night in labels.py's and metrics.py's self-tests. The smoke keeps J166's pair (deck seed 2099) at
game seed 2199, in a new folder, as every pilot since J167; that pair holds none of the six cards D490-D494 list, so its draw on the
list is J166's registered sha256.

''')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J183's own name, J182 as the comparison)
# ======================================================================================================================================
# the decks section: the registered draws now include J180's to J182's
put("""and no spine draw may be one of J171's, J173's or J177's 13
registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are registered from J177's own
`draws-pilot.json`).""",
    """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's or
J182's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are registered from
J177's own `draws-pilot.json`, J180's to J182's from their `report/draws.json`).""")
# the decks table: J182's column (the rows themselves are replaced after the shift)
put("| J181 at this position (the same seat policy and design, the fork changed: D498, D500; other decks): decisions branched, confident labels, wall |",
    "| J182 at this position (the same population, seat policy and design; other decks): decisions branched, confident labels, wall |")
put("(J181's numbers from `lab-j181/report/labels.json`'s `bySpine`, `tool.json` and `spine-times.txt`, read only on 2026-11-01; all 13 at 6\nworkers.",
    "(J182's numbers from `lab-j182/report/labels.json`'s `bySpine` (`rows`, `confident`) and `spine-times.txt`, read only on 2026-11-02; all\n13 at 6 workers.")
# the design: the fork under the seat
put("unchanged since J173's pin; the fork under them is D493's.",
    "unchanged since J173's pin; the fork under them is D493's\ncopier with D497's carry and D500's damage history, and D498's redeal (J182's).")
# sizing: J182's walls beside J177's
span("**Sizing: J177's, unchanged; J181's walls beside it.**", "measured the design:",
     """**Sizing: J177's, unchanged; J182's walls beside it.** J182's 13 spines, all at 6 workers, took 34,576 s of walls (9.6 h; 11.8 to 85.5
min a spine, s11 the longest), 57.6 worker-hours, 60,855 branch rows, 198 decisions branched (15.2 a spine; J181's 153, 11.8; J180's
105, 8.08). J177
""")
# the label set
put("| `pool` | **`random-<band>-d498`**: D498's population, never J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |",
    "| `pool` | **`random-<band>-d498`**: D498's population, J182's and this night's; never J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |")
put("| `randomSeat` | **`\"D493\"`** on every row: the decision that opened the population (labels.py's `--seat` default, now D493; J177's rows say \"D488\"). The seat's policy is D488's |",
    "| `randomSeat` | **`\"D498\"`** on every row: the decision that opened the population (labels.py's `--seat` default, D498 as J182's; J181's rows say \"D497\"). The seat's policy is D488's |")
put("""**Never
  pooled with J177's v6 rows, J173's v5 rows, or v1-v4** (D493, *Comparability*; `decides:`): a model that reads several nights splits
  on `pool` (or `randomSeat`, or `sha`).""",
    """**Pooled
  with J182's v6 rows** (one population: the same `pool`, `randomSeat` and fork; the `sha` differs by the redaction checker alone) **and
  never with J181's, J180's or J177's v6 rows, J173's v5 rows, or v1-v4** (D493, *Comparability*; `decides:`): a model that reads
  several nights splits on `pool` (or `randomSeat`), never on J182's and J183's `sha` alone.""")
# the pre-registered reads (c), (f), (xvii)
put("""Beside it, **as information: J181's** (read from `lab-j181/report/labels.json` at the Report, `--j181=`;
  ANOTHER POPULATION -- the fork before D498 -- the same design, other decks: 0.464 a worker-hour on 49.6 worker-hours; J180's 0.551, J177's 0.563) and **the""",
    """Beside it, **as information: J182's** (read from `lab-j182/report/labels.json` at the Report, `--j182=`;
  THE SAME POPULATION's first night, the same design, other decks: 0.451 a worker-hour on 57.6 worker-hours; as other populations
  J181's 0.464, J180's 0.551, J177's 0.563) and **the""")
put("""**This night's numbers are the FIRST contribution
  to D498's population's pooled read** (`pooledInputs`); J181's 0 of 13 (D497's population), J177's 0 of 12 and J180's 0 of 14
  (D493's) are read beside, as information, never added.""",
    """**This night's numbers are the SECOND contribution
  to D498's population's pooled read** (`pooledInputs`): J182's 0 of 6 (the first; `c_sizingRead.j182.futilityRead`, read at the
  Report) is added to them at the morning read; J181's 0 of 13 (D497's population), J177's 0 of 12 and J180's 0 of 14 (D493's) are
  read beside, as information, never added.""")
put("""- **(xvii) J182 beside J181, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED (D498, D500)** (compare.py,
  `report/compare-j181.json`; J181's column computed from its folders and report with the same code)""",
    """- **(xvii) J183 beside J182, BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, SEAT POLICY AND DESIGN (D498's)** (compare.py,
  `report/compare-j182.json`; J182's column computed from its folders and report with the same code)""")
put("""**A candidate, never a verdict**: the decks differ at every position, so no difference is D498's by
  itself, and J181's s07 carries the redeal gap D498 closes.""",
    """**A candidate, never a verdict**: the decks differ at every position (one population, two nights),
  so no difference is anything's but the draw's until a fresh draw shows it.""")
# the pilot's prose: D497-D504 and the seat code
put("line), the commits that added D481-D496's decision files",
    "line), **D497-D504** (`has_d497` to `has_d504`: each decision's file and the names its lane added, as the\npilot's lines list them; D502-D504's checked against the pin), the commits that added D481-D504's decision files")
put("J173's plus D493's and D496's** (`seat_code`:", "J173's plus D493's, D496's, D497's, D498's and D500's, and nothing since J182's pin** (`seat_code`:")
# the guards: D502-D504's greps, the loop, the seat code since J182's pin
G502 = ("# D502-D504 (the redaction checker admits J182's three shapes; the names this file reads, checked against the pin 3275af30 by hand)\n"
        "ls docs/decisions/D502-*.md >/dev/null 2>&1 && grep -q 'EffectSourceController' docs/decisions/D502-*.md && grep -q 'hideawayGrants' tools/check-redaction.mjs && grep -q 'altByControl' tools/check-redaction.mjs && test -f fixtures/negative/redaction/a9-hideaway-control-taken.jsonl && grep -q \"'a9-hideaway-control-taken.jsonl', 'pass'\" tools/check-redaction-selftest.mjs && grep -q \"'a9-hideaway-no-control-change.jsonl', 'fail'\" tools/check-redaction-selftest.mjs && echo 1 > var/lab-j183-local/has-d502.txt || echo 0 > var/lab-j183-local/has-d502.txt\n"
        "ls docs/decisions/D503-*.md >/dev/null 2>&1 && grep -q 'last known information' docs/decisions/D503-*.md && grep -q \"M55 decision ids that ceased to exist, another seat's token=\" tools/check-redaction.mjs && grep -q 'ceasedOthersToken' tools/check-redaction.mjs && test -f fixtures/negative/redaction/ceased-opponent-token-source-choice.jsonl && grep -q \"'ceased-opponent-token-source-choice.jsonl', 'pass'\" tools/check-redaction-selftest.mjs && grep -q \"'ceased-opponent-token-never-listed.jsonl', 'fail'\" tools/check-redaction-selftest.mjs && echo 1 > var/lab-j183-local/has-d503.txt || echo 0 > var/lab-j183-local/has-d503.txt\n"
        "ls docs/decisions/D504-*.md >/dev/null 2>&1 && grep -q 'between frames' docs/decisions/D504-*.md && grep -q \"M55 decision ids entered between frames, an opponent's cast=\" tools/check-redaction.mjs && grep -q 'castFromOthersHand' tools/check-redaction.mjs && test -f fixtures/negative/redaction/m55-option-cast-from-the-opponent-hand-held.jsonl && grep -q \"'m55-option-cast-from-the-opponent-hand-held.jsonl', 'pass'\" tools/check-redaction-selftest.mjs && grep -q \"'m55-option-opponent-hand-to-stack-no-cast.jsonl', 'fail'\" tools/check-redaction-selftest.mjs && echo 1 > var/lab-j183-local/has-d504.txt || echo 0 > var/lab-j183-local/has-d504.txt\n")
ANCH = "# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's (`decides:`):\n"
put(ANCH, G502 + ANCH)
put("# none out)\nsc=0\n", "# none out); since J182's pin (ac07876b, D498-D501's merge) bridge/src has not changed at all (D502-D504: the redaction checker, its\n# fixtures and docs only)\nsc=0\n")
put('" = "bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/SearchPolicy.java " && sc=1',
    '" = "bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/SearchPolicy.java " && test -z "$(git diff --name-only %s HEAD -- bridge/src)" && sc=1' % PREV)
put("echo \"J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's (bridge/src since 7a984963: Atlas, Determinizer, LenientGameCopier, SearchPolicy): $sc\"",
    "echo \"J183: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's (bridge/src since 7a984963: Atlas, Determinizer, LenientGameCopier, SearchPolicy; since J182's pin ac07876b: nothing): $sc\"")
put('D497 D498 D499 D500 D501; do', 'D497 D498 D499 D500 D501 D502 D503 D504; do')
put('has-d481-d501-commits', 'has-d481-d504-commits', 2)
put('d481_d501_commits', 'd481_d504_commits', 2)
put('metrics: has_d501 = sh: cat var/lab-j182-local/has-d501.txt 2>/dev/null || echo 0\n',
    'metrics: has_d501 = sh: cat var/lab-j183-local/has-d501.txt 2>/dev/null || echo 0\n'
    'metrics: has_d502 = sh: cat var/lab-j183-local/has-d502.txt 2>/dev/null || echo 0\n'
    'metrics: has_d503 = sh: cat var/lab-j183-local/has-d503.txt 2>/dev/null || echo 0\n'
    'metrics: has_d504 = sh: cat var/lab-j183-local/has-d504.txt 2>/dev/null || echo 0\n')
put('check: has_d501 == 1\n', 'check: has_d501 == 1\ncheck: has_d502 == 1\ncheck: has_d503 == 1\ncheck: has_d504 == 1\n')
# J182's one engine stack, counted across the worker logs (information; the morning read reads it)
PUMP = 'metrics: branch_error_stacks = count /home/justin-a/code/lab/data/lab-j182/b-s??-*-25??/phaseB/logs/*.log "branch error, stack:"\n'
put(PUMP, PUMP.replace('lab-j182', 'lab-j183') +
    'metrics: pump_effect_ioobe = count /home/justin-a/code/lab/data/lab-j183/b-s??-*-25??/phaseB/logs/*.log "at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)"\n')
# draws.py: J182's draws registered beside the others (lab-j182/report/draws.json's `asRun`, equal to its `recorded`, read 2026-11-02)
put("""# var/lab-j177-local/draws-pilot.json), J180's beside them (J180_DRAWS, J180_VALIDATION, from lab-j180/report/draws.json, read
# on 2026-11-01) and J181's (J181_DRAWS, J181_VALIDATION, from lab-j181/report/draws.json, read
# var/lab-j177-local/draws-pilot.json in the lab clone, read by this draft on 2026-10-31): none may come back here.""",
    """# var/lab-j177-local/draws-pilot.json in the lab clone, read on 2026-10-31), J180's and J181's beside them (J180_DRAWS, J180_VALIDATION,
# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01) and J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read by this draft on 2026-11-02): none may come back here.""")
J181BLOCK_END = "J181_VALIDATION = '16cb39e8444faedf49f38e68758a3f37e47862037247cefa8b40989b78386a40'\n"
i = t.index("# J181's 13 spine draws and its validation draw (lab-j181/report/draws.json's `asRun`")
j = t.index(J181BLOCK_END) + len(J181BLOCK_END)
J181BLOCK = t[i:j]
span(J181BLOCK[:60], J181BLOCK_END, J181BLOCK[:-len(J181BLOCK_END)])  # the J181 block verbatim (kept J181 through the comparison move)
put(J181BLOCK_END, J181BLOCK_END +
    "# J182's 13 spine draws and its validation draw (lab-j182/report/draws.json's `asRun`, equal to its `recorded`, read by this draft on\n"
    "# 2026-11-02): none may come back here either\n"
    "J182_DRAWS = {'e187593bab46727e2680eb448619e4f6167b8c809afde10d46a41a55cac60b0e', 'bb1e163818ca148a86449ecbfd7f2fa890f27a1e85eff9ec2b7f958bfd4e57fa',\n"
    "              '62dbba0133ccff2aaa25012e78bfcfce8b2033ccdb8de9ebb8f13af78da206fa', '789be12e7e2caf26c505f06f82273c213eca48f98ca8b21fcbf05b43d0cf4ea1',\n"
    "              'cbbad5a90f92cc096467e1a4b398dc32f0aefe08eb54bc09d59e28d0c0227969', '72319dd938da84dbcd81938abd453526f5e49ff123c2f1027d5720ef6f3da9e4',\n"
    "              'c3041197893399af7d67de773b199068475bcfce8ba3603f62ecc6af23e752d0', 'f7fa57e80da173972ede8aa2881d586790fbea16c757ff9850c9c758aa1bd804',\n"
    "              'f66b943bd1545ab3e2921ccb66cc8c65e88cc1cf9de5511f49a412611dd4864e', '7d97e0ebe981e5c408edb9eb90fb812dd46cd5696074d36ee9c596fd7e8acedf',\n"
    "              '559f60c33fa20176b87d9af13041b6466a05ea9c1948ec62478358b5fc70802c', '9fec8825211657c02f180ef177a7e17d4f5bac64283f5a32bc16d3706784f8b7',\n"
    "              '6034ec2cdea2b0e45f5b8f3b4ea47c6b95b3f7e113731a629bc9a17355ad79b5'}\n"
    "J182_VALIDATION = '6f6599c3a74b209bfc4c44de51a3a022d4d9aadcfe5fe37559154d86ac19fda2'\n")
put('J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS)', 'J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS)')
put('(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION)',
    '(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION)')
# labels.py: its header, the expectation and the beside-column's population
span("# J182 (drafts/J182-atlas-4b-night-seven.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J183 (drafts/J183-atlas-4b-night-eight.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J183 data. What changes: nothing in the rows. J183 is D498's population's SECOND night (nothing since J182's pin changed
# what a branch plays: D502-D504 are the redaction checker's), so its rows POOL with J182's v6 rows and with nothing before them (D493,
# Comparability): --seat= defaults to "D498", as J182's (the self-test on J171's night still passes --seat=D486), the Report names the
# pools `random-<band>-d498`; and the sizing read's beside-column is J182's (--j182= LABELS_JSON: its c_sizingRead, per-worker-hour
# yield and futilityRead, THE SAME POPULATION's first night, as information and as the pooled futility read's first input; null when
# absent). Every field, read and definition otherwise J177's, unchanged; the scan stamp `J183 v5`.
""")
put(r"""'expectation': 'as information, no verdict: J181 (ANOTHER POPULATION: D488\'s seat policy on D497\'s copier, before D498; the same design, other decks) below as its own report read it; J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations too; the review ~46 [41, 51]'}""",
    r"""'expectation': 'as information, no verdict: J182 (THE SAME POPULATION\'s first night: D488\'s seat policy on D498\'s determinizer; the same design, other decks) below as its own report read it; J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations; the review ~46 [41, 51]'}""")
put("'population': 'D497 (the determinizer before D498): never pooled with this night (D498, Comparability)'}",
    "'population': 'D498 (the same population, its first night): pooled with this night under the same pool names; its futilityRead is the pooled futility read\\'s first input (D498, Comparability)'}")
# metrics.py's header: the population poolOk reads
put("(poolOk: D493's population)", "(poolOk: D498's population)")
# compare.py: its header, its glob's comment and its note
span("# J182 (drafts/J182-atlas-4b-night-seven.md): each spine's numbers beside J181's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     """# J183 (drafts/J183-atlas-4b-night-eight.md): each spine's numbers beside J182's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J183 data. DIFFERENT DECKS (J182: deck seeds 2401-2413, game seeds 2501-2513; J183: 2414-2426, 2514-2526; the same band at
# each position), THE SAME SEAT POLICY (D488's), THE SAME FORK (D498's redeal, D500's damage history) AND THE SAME BRANCHING DESIGN (150
# random branches, the futility stop, 10 decisions): J182 and J183 are one population's two nights. A difference is a candidate, never a
# verdict, and no position is a pair (the decks differ everywhere). J177's compare.py, unchanged but for its note: `this` is J183,
# `before` J182, read from lab-j182 at the Report (read only).
""")
put("# J182's folders end in 25??, J181's in 21??: one glob reads both", "# J183's folders end in 2514-2526, J182's in 2501-2513: one glob reads both")
put(r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED: J181 (D497\'s population, its first night; deck seeds 2079-2091, 150 branches, the futility stop, 10 decisions) beside J182 (D498\'s population, its first night, on D498\'s determinizer and D500\'s copier; deck seeds 2401-2413, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D498\'s by itself: the decks differ at every position',""",
    r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, SEAT POLICY AND DESIGN: J182 (D498\'s population, its first night; deck seeds 2401-2413, 150 branches, the futility stop, 10 decisions) beside J183 (D498\'s population, its second night, the same fork; deck seeds 2414-2426, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict: the decks differ at every position',""")
# the pilot's information block on the comparison night: lab-j182, whose folders end in 25??
put("""# J181's night, read only, as information (it ended 2026-11-01, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (ANOTHER POPULATION's first night: beside, never pooled)
python3 -I -c "import glob, json, os; D = '/home/justin-a/code/lab/data/lab-j181'; r = {'atlases': len(glob.glob(D + '/b-s??-*-21??/atlas.json')),""",
    """# J182's night, read only, as information (it ended 2026-11-02, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (THE SAME POPULATION's first night: beside, and the pooled futility read's first input)
python3 -I -c "import glob, json, os; D = '/home/justin-a/code/lab/data/lab-j182'; r = {'atlases': len(glob.glob(D + '/b-s??-*-25??/atlas.json')),""")
# the Report block
put("""# J181's night, read only, for the J181 columns (compare.py) and J181's sizing read (labels.py --j181): ANOTHER POPULATION, read beside,
# never pooled; absent files read as null""",
    """# J182's night, read only, for the J182 columns (compare.py) and J182's sizing read (labels.py --j182): THE SAME POPULATION's first
# night, read beside, its futility counts the pooled read's first input; absent files read as null""")
put("'the 4b night-four validation draw, made by the J182 pilot", "'the 4b night-eight validation draw, made by the J183 pilot")
put("D498s population, NEW; never pooled with J181 (D497)", "D498s population, its second night, pooled with J182 (its first); never with J181 (D497)")
# the abort paragraph
put("D487, D488, D495 and D496 amended; it is the check J177 failed, on the cascade gap D496 closes (and J176 on four gaps D492-D495 close).",
    "D487, D488, D495, D496 and D501-D504 amended; it is the check J182 failed, on the three shapes D502-D504 admit (J181 on two faults\nD498 and D499 close, J177 on the cascade gap D496 closes, J176 on four gaps D492-D495 close).")
put("(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known)",
    "(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, counted here as `pump_effect_ioobe`)")
# the summary
span('- **The population, first line:**', '- **The run:**', """- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's and
  D494's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck seeds
  2414-2426, game seeds 2514-2526) branched by J183 at the pin, by D488's random seat policy forking on D498's determinizer, the SECOND
  night of D498's population**: `training: true`, `pool: random-<band>-d498`, `randomSeat: "D498"`, contract v6 with `branchRandom: 150`
  and the partial rows marked; **pooled with J182's rows** (the same pool names; nothing since J182's pin changed what a branch plays:
  D502-D504 are the redaction checker's) **and with nothing before: not J181's rows (D497's population: the fork before D498), not
  J177's and J180's (D493's), not J173's nor anything older** (D493, Comparability, quoted: "search-v2 results and atlas maps from
  before and after D493 are not pooled"; D489's "A future change to the seat or to what it offers does", quoted -- a checker that reads
  a played branch's log changes neither).
""")
span('- **The run:**', '- **The yield, the number to read**', """- **The run:** exits, walls per spine and for the night (against J182's, and the ~9.6 h at 6 workers *Sizing* expected), rows, timeouts,
  unit errors, engine errors (with any errored row's stack from the worker logs), capped, D479's and D477's counters, disk. **Whether
  J182's three checker shapes and J181's three gaps stayed closed**: no branch log failed the checker on an opponent's hideaway card
  after its host's control was taken, on another seat's ceased token or on an opponent's cast between frames (D502-D504; their three
  stats-line counts per spine, as information), no A6 failure on a card the seat may look at (D498), no id problem from a killed
  attempt's rows and `abandonedPlays` said when a unit was re-run (D499), no `getDamageLKI` and no `paperCard` in any errored branch's
  stack, `damageLkiLost` 0, and no bare exception in any worker log (D500, D497), no checker failure on a cascade's "cast it?" inside a
  held frame (D496), no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or
  Foretold cast, no checker failure on a spell copy on the stack. **J182's engine stack, counted**: `pump_effect_ioobe`, the lines
  `at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker logs (Forge's `IndexOutOfBoundsException`,
  `FCollection.get` on an empty list; J182: 1, in s11's d10), per spine, each with its branch and its exception line -- information,
  an engine fault and never a verdict on a card.
""")
put("""beside it **J181's** (0.464 a worker-hour, 32.5 a 7-worker night [20.6, 48.7]; another population: the fork before D498, other
  decks), **J180's** (0.551), **J177's** (0.563) and **the review's ~46 [41, 51]**.""",
    """beside it **J182's** (0.451 a worker-hour, 31.6 a 7-worker night [20.6, 46.3]; the same population's first night, other decks)
  and **the two nights pooled** (their confident labels over their worker-hours, by hand), then, as other populations, **J181's**
  (0.464), **J180's** (0.551), **J177's** (0.563) and **the review's ~46 [41, 51]**.""")
put("""**Say that this
  is the first night of D498's population's pooled read** (`pooledInputs`), that J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14
  are other populations' and are not added in, and that ~10-14 controls cannot tell .04 from .2.""",
    """**Say that this
  is the second night of D498's population's pooled read**: add J182's `pooledInputs` (0 of 6 controls confident, 34 stopped, 123
  read; `labels.json` `c_sizingRead.j182.futilityRead`) to this night's and give the pooled share with its exact 95% interval beside
  this night's own; that J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and that
  ~10-20 controls cannot tell .04 from .2.""")
put("beside the review's 54%, 68% and 87% and J181's, J180's and J177's own (their `ncurve.json`);",
    "beside the review's 54%, 68% and 87% and J182's, J181's, J180's and J177's own (their `ncurve.json`);")
put("against J181's 11.8, J180's 8.08 and J177's 9.31**.", "against J182's 15.2, J181's 11.8, J180's 8.08 and J177's 9.31**.")
# J182's file said J181's refused share was 0.02%: lab-j181/report/tool.json's refusedCastShare is 0.00153, 0.15% (corrected here)
put("and for the night beside J181's (0.02%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)",
    "and for the night beside J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)")
put("""with J181's values at the same positions beside
  (another population, other decks);""", """with J182's values at the same positions beside
  (the same population, other decks);""")
put("- **J182 beside J181, by position** (`compare-j181.json`):", "- **J183 beside J182, by position** (`compare-j182.json`):")
put("""**labelled: different decks, the same seat policy and
  design, the fork changed (D498, D500), J181's s07 carrying the redeal gap; a candidate, never a verdict** -- no difference is D498's by
  itself.""", """**labelled: different decks, the same population, seat
  policy and design; a candidate, never a verdict** -- the decks differ at every position.""")
# the rule line: D501-D504 named
put("D498 (the determinizer keeps what the seat may look at in place: the population J182 opens), D499 (a killed attempt's rows are abandoned) and D500 (the fork carries the damage-this-turn history); D447",
    "D498 (the determinizer keeps what the seat may look at in place: the population J182 opened and J183 continues), D499 (a killed attempt's rows are abandoned), D500 (the fork carries the damage-this-turn history), D501 (the checker's empty-hand proof admits A3's revealed top card) and D502-D504 (the checker admits an opponent's hideaway card after its host's control is taken, another seat's ceased token named by last known information, and an opponent's cast from its hand between frames); D447")

# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
t = t.replace('J182', 'J183').replace('j182', 'j183')
t = t.replace('drafts/J183-atlas-4b-night-seven.md', 'drafts/J183-atlas-4b-night-eight.md')
left = [(m.start(), t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#')) for m in re.finditer(r'[Jj]181', t)]
print('J181 left before the comparison move (each becomes J182):', len(left))
for _, ctx in left:
    print('   ', ctx)
t = t.replace('J181', 'J182').replace('j181', 'j182')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, +13
# ======================================================================================================================================
RANGES = [(2400, 2413), (2500, 2513), (2600, 2613), (2700, 2713)]
AUDIT = []


def shift(m):
    v = int(m.group(0))
    for a, b in RANGES:
        if a <= v <= b:
            s = m.string
            AUDIT.append((v, v + 13, s[max(0, m.start() - 60):m.end() + 40].replace('\n', ' ').replace('\x00', '#')))
            return str(v + 13)
    return m.group(0)


t = re.sub(r'(?<![0-9A-Za-z.])\d{4}(?![0-9A-Za-z.])', shift, t)
# registered self-test values that fell in the deck range, restored BY NAME
must("== (4, 10, 55680, 2413, 32626, 0)", "== (4, 10, 55680, 2400, 32626, 0)")       # metrics.py on J162's night: the D472/D476 count
must("'retargeted': 2414, 'rowsWithModesDrawn': 14}", "'retargeted': 2401, 'rowsWithModesDrawn': 14}")  # labels.py on J171's night
must(", 1564, 2414, 1125, 1125, ", ", 1564, 2401, 1125, 1125, ")                  # metrics.py on J171's night: retargetedRows

# ======================================================================================================================================
# 4. the decks table: J182's column (after the shift, so its seeds stay J182's)
# ======================================================================================================================================
ROWS = {
    's01': '2401 / 2501: 14, 2, 54.7 min', 's02': '2402 / 2502: 24, 3, 15.6 min', 's03': '2403 / 2503: 12, 6, 36.0 min',
    's04': '2404 / 2504: 16, 3, 81.2 min (one log failed the checker, D504)', 's05': '2405 / 2505: 11, 4, 41.0 min',
    's06': '2406 / 2506: 13, 1, 46.4 min (five logs failed the checker, D502)', 's07': '2407 / 2507: 15, 2, 33.6 min',
    's08': '2408 / 2508: 19, 1, 40.2 min', 's09': '2409 / 2509: 11, 1, 43.8 min',
    's10': '2410 / 2510: 19, 0, 26.2 min (five logs failed the checker, D503)',
    's11': '2411 / 2511: 13, 1, 85.5 min (one branch errored in Forge\'s PumpEffect)', 's12': '2412 / 2512: 18, 1, 11.8 min',
    's13': '2413 / 2513: 13, 1, 60.4 min'}
lines = t.split('\n')
done = 0
for k, row in enumerate(lines):
    m = re.match(r'^\| (s\d\d) \| (\w+) \| (\d{4}) \| (\d{4}) \| ([^|]+) \| (\d{4} / \d{4}) \| .*\|$', row)
    if m and m.group(1) in ROWS:
        lines[k] = '| %s | %s | %s | %s | %s | %s | %s |' % (m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6), ROWS[m.group(1)])
        done += 1
if done != 13:
    FAIL.append('decks table: %d rows replaced, not 13' % done)
t = '\n'.join(lines)

# ======================================================================================================================================
# 5. the stash back
# ======================================================================================================================================
for k, (v, c) in STASH.items():
    if t.count(k) != c:
        FAIL.append('placeholder %r found %d times, not %d' % (k, t.count(k), c))
    t = t.replace(k, v)

# ======================================================================================================================================
# 6. the header lines
# ======================================================================================================================================
lines = t.split('\n')


def setline(prefix, value):
    for k, row in enumerate(lines):
        if row.startswith(prefix):
            lines[k] = prefix + value
            return
    FAIL.append('no line starts with %r' % prefix)


setline('id: ', 'J183')
setline('title: ', "The move atlas, rung 4b, night eight -- J182's night carried onto the new main (D502-D504: the redaction checker admits the three legitimate engine shapes that failed J182's s06, s10 and s04 -- an opponent's hideaway card shown to the seat that took control of the permanent that hid it, another seat's token that ceased to exist named by last known information, an opponent's spell cast from its hand inside a held batch; the bridge, the seat and the fork unchanged) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j183, at deck seeds 2414-2426 (D447 with D482's list as D490, D492 and D494 leave it, the bands cycled as J166's) and game seeds 2514-2526; a validation draw made fresh at deck seeds 2614-2626 (game seeds 2714-2726 reserved); THE SECOND NIGHT OF D498'S POPULATION, pooled with J182's; J182's night read beside, by position, as information")
setline('public_title: ', 'Move atlas 4b night eight: 13 new spines, D502-D504 checker fixes, the D498 population night two')
setline('public_est: ', '~9 h to 12 h')
setline('public_decides: ', 'None by itself; second night of the D498 population, pooled with J182')
setline('repos: ', "mtg-table@%s (origin/main: the merge of pc/d502-checker-shapes (D502-D504, the redaction checker, its fixtures and docs) on ac07876b (J182's pin, the merge of D498-D501), gated, its line in the merge commit's message; merged == 1, the commits that added D481-D504's decision files, D493's, D495's to D504's names, the seat's code and the deck code exactly as this file states them, checked by the pilot)" % PIN)
setline('decides: ', "nothing by itself. Rung 4b's eighth night, the sixth on D489's futility stop with the review's 150 cap, and **the SECOND of D498's population**. **What changed under the seat since J182:** nothing. The random seat's POLICY is D488's, the recorder D496's, the copier's paper-card carry D497's, the redeal D498's and the copier's damage history D500's, all as J182's; `git diff ac07876b <pin> -- bridge/src` is empty (a pilot check, `seat_code`, beside J182's lists), and what changed is the redaction checker alone (D502-D504: it now admits an opponent's hideaway card shown to the seat that took control of the permanent that hid it, another seat's token that ceased to exist named by last known information, and an opponent's spell cast from its hand between frames -- the three legitimate shapes that failed J182's s06, s10 and s04 -- with its fixtures and docs), which reads a branch's log after the branch is played and changes nothing it plays. `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (`identity == 1` stays the real check). **Comparability, the rule this night follows:** D489 pools nights across a change to HOW MANY branches a decision gets and opens a population only on \"A future change to the seat or to what it offers\"; D493, D497 and D498 opened populations when the fork changed what a branch plays, and nothing since D498 has. So **J183's labels and reads are D498's population's second night: pooled with J182's -- the same `pool`, `random-<band>-d498`, the same `randomSeat: \"D498\"`; never with J181's v6 rows (D497's population), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- this night's counts the second input to this population's pooled read, J182's 0 of 6 the first, with J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside as other populations, and the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J182's 0.451 and the two nights pooled, and, as other populations, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J182's at the same position (other decks, the same population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D502-D504 (no checker failure of J182's three shapes; their stats-line counts per spine, as information), of D497-D500 as on J182 (no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`)")
setline('hypothesis: ', "none to confirm about the maps. Registered expectations, as information: **the shapes that failed J182 pass the checker now, J181's classes stayed closed on J182, and J180's, J177's and J176's stay away** -- an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500; `damageLkiLost` 0 on all of J182's spines); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log; a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); no deck holds a Prepare card or Ob Nixilis, the Adversary (D492, D494; `deck_code`); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes (D495) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as it failed J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J182: 123 read, 34 stopped, 6 controls, 0 partial rows confident; J181: 153, 35, 13, 0; J180: 105, 29, 14, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J182's and J181's (read beside, not predicted; J182's refused share 0.92%, J181's 0.15%); J182's yield, 26 confident of 89 labels, 0.451 confident labels a worker-hour on 57.6 worker-hours, is this population's first night's, read beside and pooled, never predicted; J181's 0.464, J180's 0.551 and J177's 0.563 are other populations'; the walls ~9.6 h at 6 workers for all 13 at J182's pace (34,576 s of walls; *Sizing*)")
setline('est: ', "~10.5 h at 6 workers (range 7-12 h; sizing below): pilot ~10-40 min (J182's ran 10 min from its start to its first spine; J173's ~35 with the readers' self-tests); the 13 spines ~9.6 h at J182's pace (13 x ~44 min; J182's ran 11.8 to 85.5 min); the scan ~6 min; the report ~5 min. Disk ~11-15 GB on the lab data folder /home/justin-a/code/lab/data (J182's 13 spines: 11.0 GB)")
t = '\n'.join(lines)

# ======================================================================================================================================
# 7. the audits
# ======================================================================================================================================
if FAIL:
    print('\n'.join(FAIL)); sys.exit(1)
print('\nAUDIT: every four-digit token the shift changed, with its context (the three restored afterwards are marked by the must() lines):')
from collections import Counter
for v, w, ctx in AUDIT:
    print('  %d -> %d | %s' % (v, w, ctx))
print('changed tokens by value:', dict(sorted(Counter(v for v, _, _ in AUDIT).items())))
print('\nquoted J17x/J18x strings in the output (registered strings must keep their night):')
for m in sorted(set(re.findall(r"['\"]J1[78]\d[^'\"]{0,30}['\"]", t))):
    print('   ', m)
print('\nold population tokens (d497/d493/d488) left -- history and the never-pooled lists only:')
for m in re.finditer(r'random-[^ ]{1,8}-d4(97|93|88)', t):
    print('   ', t[max(0, m.start() - 50):m.end() + 10].replace('\n', ' '))
print('\nlab-j181 / lab-j182 / 21?? left:')
for m in re.finditer(r'lab-j18[12]\b|21\?\?', t):
    print('   ', t[max(0, m.start() - 70):m.end() + 30].replace('\n', ' '))
print('\nac07876b mentions:', t.count('ac07876b'), ' 3275af30:', t.count('3275af30'), ' 57d94fc3:', t.count('57d94fc3'), ' PIN_SHA:', t.count('PIN_SHA'))
print('J182 lines (comparison/history):', sum(1 for x in t.split('\n') if 'J182' in x), '  j182:', t.count('j182'))
assert '\x00' not in t
open(DST, 'w').write(t)
print('\nwrote', DST, 'lines', n0, '->', len(t.splitlines()))

#!/usr/bin/env python3
"""Derive J182's job file from J181's, by the three-trap rule:
(1) rename only the job's own name; (2) shift the four seed ranges inclusive of their bases, skipping any
number touching a letter, digit or hex neighbour, after the history paragraphs are rewritten; (3) change
registered strings only on purpose, each one named here. The pin is PIN_SHA_D498 until the merge lands.
Lesson of J181 (its poolOk check compared `'random-%s-d493'` and could not pass): the population regex
now covers the `%s` form, and the script greps the output for every old population token at the end."""
import re, sys

SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J181-atlas-4b-night-six.md'
DST = '/home/justin-a/code/pc-results/drafts/J182-atlas-4b-night-seven.md'
PIN = 'PIN_SHA_D498'
# filled after the merge (the lanes' exact names); the script refuses to write while any is a placeholder
FILL = {
    '@@D498_NAMES@@': None,   # the has_d498 grep line
    '@@D499_NAMES@@': None,   # the has_d499 grep line
    '@@D500_NAMES@@': None,   # the has_d500 grep line
    '@@BRIDGE_DIFF@@': None,  # `git diff --name-only 7a984963 HEAD -- bridge/src | sort | tr '\n' ' '` on the merged tree
    '@@MERGE_LINE@@': None,   # one line naming the merge(s) for the repos: line
    '@@FOLDER_TIME@@': None,  # when lab-j182 was made empty by hand
}
t = open(SRC).read()
n0 = len(t.splitlines())
FAIL = []


def must(old, new, count=1):
    global t
    c = t.count(old)
    if (count and c != count) or (not count and c == 0):
        FAIL.append('expected %s of %r, found %d' % (count or 'some', old[:120], c)); return
    t = t.replace(old, new)


def between(start, end):
    try:
        i = t.index(start); j = t.index(end, i)
    except ValueError:
        FAIL.append('between %r .. %r not found' % (start[:80], end[:80])); return 0, 0
    return i, j


# ---------- 0. the history paragraphs BEFORE the shift ----------
i, j = between('**Why J181.**', '**Before posting -- the coordinator')
WHY = '''**Why J182.** J181 (rung 4b, night six, the first of D497's population; posted 2026-11-01 11:40 EST, finished 20:02 EST after
30,589 s) played all 13 spines and its Report: 153 branched decisions, 80 labels, 23 confident, 35 partial, 13 controls (0 of them
confident at the full n), 0.464 confident labels a worker-hour [20.6, 48.7 a 7-worker night], all 13 spines at 6 workers, 29,764 s of
walls (8.3 h). **Two checks failed**, and each is a lab fault repaired by a decision merged since J181's pin (60177314):
- **`atlas.problems == 0` failed on 9 problems, two faults.** (a) **s07** (legacy, 2085/2185): the opponent cast Oracle of Mul Daya at
  turn 11, so card 44 sat revealed on top of its library (the seat's log lists it there, A3); every branch forked after that redealt
  card 44 with the hidden pool, and in 48 of decision 14's 150 branches it landed in the opponent's HAND, still marked lookable, so the
  branch log's first frame showed a full named card in a hand with no reveal record and `tools/check-redaction.mjs` failed 51 logs (A6).
  Not a new leak -- the seat had seen the card -- but a determinization that contradicts what the seat knows (the card is on top of the
  library, not in the hand) and a log that breaks the checker's law. **D498** repairs the Determinizer: a card the searching seat may look
  at stays where it is; only what it cannot see is redealt. (b) **s13** (pauper, 2091/2191): unit `d28-forge-25` hung on its first
  attempt (Forge's AI evaluation looped; the unit watchdog killed it after 1800 s), D465's re-run replayed branch b39 on another worker,
  and the killed attempt's 57 rows (a `begin` with no `end`, naming a card id only that play had) stayed in its rows file; the id audit
  merged both plays' rows and reported 8 problems against the re-run's log. **D499** repairs the rows readers: a game's rows are the rows
  between a `begin` and its `end` in one file, and a killed attempt's are abandoned and counted, never audited.
- **`atlas.poolOk == 13` failed with 0**: a derivation fault of J181's own file, not the night's -- its `poolOk` metric still compared
  `'random-%s-d493'` after the population moved to d497 (the regex that moved every other spelling missed the `%s` form), so the check
  could not pass. This file's derivation covers that form and greps itself for every old population token before it is written.
- **3 branches errored in s06** (peasant, 2084/2184, decision 19), with full stacks (D497's flag): `Game.getDamageLKI` returned null in a
  `DamagedBy` property during a replacement check on a forked board -- Forge's `GameCopier` copies each entity's damage-this-turn pairs but
  not the game's identity-keyed LKI map behind them. Under the 50-error bar, not a problem; **D500** repairs the copier for it.
- D497's two field signals held: no branch errored with `paperCard` in its stack, and no bare exception in any worker log.

J182 is J181's night carried forward onto that main: the same design, the same pilot, the same reads and checks, 13 new spines at the
next seeds in a new folder, `lab-j182`. J181's own outputs stay in `lab-j181/` and are read only, for the J181 columns. **J182 opens a
NEW population** (D498 changes what a branch plays wherever the seat may look at an opponent's card: the redealt world now keeps that
card in place; D493's and D497's precedent applies), so nothing of J182's is pooled with J181's or earlier; they are read beside, by
position, as information.

'''
t = t[:i] + '@@WHY@@\n\n' + t[j:]

i, j = between('**The seeds are new**', '## The decks')
SEEDS = '''**The seeds are new, and the block jumped** (checked by this draft, 2026-11-01). J181's block plus 13 would have been 2092-2104 with
game seeds 2192-2204 and validation 2292-2304: deck seeds 2101-2104 and game seeds 2201-2204 are numbers J166-J170 drew as game and
validation seeds (folders `lab-j166/b-s04-powered-2104`, `lab-j170/b-s01-pauper-2101` ... `lab-j170/validation/v04-powered-2204` end
in them), so the "no folder ends in one of this block's" rule fails there, and the block jumps by 322 instead of 13 to the first block
clean on every count: deck seeds **2401-2413** (`$((2400 + K))`), game seeds **2501-2513** (the deck seed + 100), validation deck seeds
**2601-2613** (`$((2600 + K))`) with game seeds **2701-2713** reserved. `git -C /home/justin-a/code/mtg-table grep -n -w -E
'241[4-9]|242[0-6]|251[4-9]|252[0-6]|261[4-9]|262[0-6]|271[4-9]|272[0-6]' origin/pc-jobs -- jobs/` (origin/pc-jobs at a0d24c92, J181's
post) finds no seed of the block after this one, and this draft's own block appears in no job file and no draft as a seed (`2400` is a
game count in J052-J181's files, `2500` a deck count in J140's and J144's, and 2401 and 2708 sit in J170-J177's registered reads of
J168's and J171's nights as counts; none is drawn as a seed: K starts at 1); every computed seed in a
job or draft is `$((2000 + K))`, `$((2200 + K))` (2001-2013, 2201-2213), J173's `$((2013 + K))`, `$((2213 + K))` (2014-2026, 2214-2226),
J174-J177's `$((2026 + K))`, `$((2226 + K))` (2040-2052, 2240-2252), J178-J180's `$((2052 + K))` and `$((2065 + K))` (2053-2065 drawn
and never branched; 2066-2078 lab-j180's) or J181's `$((2078 + K))` (2079-2091, lab-j181's), with the older blocks' small ones below
1700; and no folder under `/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. Bases and literals were moved
together by one inclusive shift of J181's block ([2078, 2091] and its three companions, +322), skipping any number touching a letter or
hex digit, and every changed four-digit token was read in context (J171's registered `wallSec` 2282 fell in the validation range and was
restored by name): deck seeds `$((2400 + K))`, validation `$((2600 + K))`, game seeds the deck seed + 100. The smoke keeps J166's pair
(deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167; that pair holds none of the six cards D490-D494 list, so
its draw on the list is J166's registered sha256.

'''
t = t[:i] + '@@SEEDS@@\n\n' + t[j:]

# ---------- 1. the job's own name ----------
t = t.replace('J181', 'J182').replace('j181', 'j182')
must('drafts/J182-atlas-4b-night-six.md', 'drafts/J182-atlas-4b-night-seven.md', 0)

# ---------- 2. the seed shift ----------
RANGES = [(2078, 2091), (2178, 2191), (2278, 2291), (2378, 2391)]
shifted = {}


def shift(m):
    v = int(m.group(0))
    for a, b in RANGES:
        if a <= v <= b:
            shifted[v] = shifted.get(v, 0) + 1
            return str(v + 322)
    return m.group(0)


t = re.sub(r'(?<![0-9A-Za-z.])\d{4}(?![0-9A-Za-z.])', shift, t)
# registered numbers that fall inside the shifted range are restored BY NAME here, after the context audit names them
# (J181's derivation found J171's 2075 and 2077 in its range; this block's range [2078, 2091] holds J181's own numbers only -- the
# audit below prints every changed token with its context, and any that is not a seed is restored here)
# the inclusive shift moves J180's last seeds (2078, 2178, 2278, 2378) wherever history names them; restore them by name
must('deck seeds 2066-2400, 150 branches', 'deck seeds 2066-2078, 150 branches')
must('J180: deck seeds 2066-2400, game seeds 2166-2500', 'J180: deck seeds 2066-2078, game seeds 2166-2178')
# J171's registered wall (the audit of 2026-11-01 found it in the range)
must("'wallSec': 2604, 'branchGames': 4550}", "'wallSec': 2282, 'branchGames': 4550}")
must('@@WHY@@\n\n', WHY)
must('@@SEEDS@@\n\n', SEEDS)

# ---------- 3. the population: D498's, new ----------
t = re.sub(r'(random-(?:\$b|\$\{b\}|<band>|%s|[a-z]+)-)d497', r'\1d498', t)
must("SEAT = opt.get('seat') or 'D497'", "SEAT = opt.get('seat') or 'D498'")
must("m['randomSeat'] == 'D497'", "m['randomSeat'] == 'D498'")
must('randomSeat: "D497"', 'randomSeat: "D498"', 0)
must('the seat "D497"', 'the seat "D498"', 0)
must("its band's D497 pool", "its band's D498 pool", 0)
must("D498 pool (D497's population)", "D498 pool (D498's population)", 0)
must("D483's listing, D497's population, the pin", "D483's listing, D498's population, the pin")
# J181's derivation fault: its poolOk still compared d493 (the `%s` spelling); the regex above covers `%s` now, and this names it
must("m['pool'] == 'random-%s-d493' % SPINES[n][0]", "m['pool'] == 'random-%s-d498' % SPINES[n][0]")
must("sizing read (labels.py --j180)", "sizing read (labels.py --j181)")

# ---------- 4. the comparison night is J181 ----------
must('--j180=', '--j181=', 0)
must("opt.get('j180')", "opt.get('j181')")
must("opt['j180']", "opt['j181']", 0)
must("out['c_sizingRead']['j180'] = J180", "out['c_sizingRead']['j181'] = J181")
must('J180 = None', 'J181 = None', 0)
must("J180 = {'labels'", "J181 = {'labels'")
must("'population': 'D493 (the copier before D497): never pooled with this night (D497, Comparability)'",
     "'population': 'D497 (the determinizer before D498): never pooled with this night (D498, Comparability)'")
must("J180 (ANOTHER POPULATION: D488\\'s seat policy on D493\\'s copier, before D497; the same design, other decks)",
     "J181 (ANOTHER POPULATION: D488\\'s seat policy on D497\\'s copier, before D498; the same design, other decks)")
must('compare-j180.json', 'compare-j181.json', 0)
must('j180.json', 'j181.json', 0)
must('metrics: j180 =', 'metrics: j181 =')
must('J6=/home/justin-a/code/lab/data/lab-j180', 'J6=/home/justin-a/code/lab/data/lab-j181')
must("D = '/home/justin-a/code/lab/data/lab-j180'", "D = '/home/justin-a/code/lab/data/lab-j181'")
# draws.py: register J181's draws beside J180's
must("J180_VALIDATION = '39eb160cd3c862914b8c263837678e12f3f47cd83a364e1c4a493d15306192bc'",
     "J180_VALIDATION = '39eb160cd3c862914b8c263837678e12f3f47cd83a364e1c4a493d15306192bc'\n"
     "# J181's 13 spine draws and its validation draw (lab-j181/report/draws.json's `asRun`, read by this draft on 2026-11-01): none may\n"
     "# come back here either\n"
     "J181_DRAWS = {'670dd90b817d7dfddc1e57b02d1f81da091f2cc6cf1e8f7da134186f7bc6ed2d', 'e151788b468ca9b8dffe9fb4492c82b45e6197c6c816b204064119d68f82b123',\n"
     "              '275f71739cf43909b87eb88e8c095b8bc5eb02a467b948338fadf8e1ec1793ab', 'f025c63a3bbaa4b0497eff78517c63622b5067bc45fec4c999898905e288425b',\n"
     "              '7b2a8b638866a605cd6a9dbbe7830a9076e6d4ea6ce22899ca282c7e9324bedb', 'a2e3e46b5db0826aa0925da5feea3fa4659c9c5419664664151b1f73c515193b',\n"
     "              '3a2202e6883bf4968f3ff887ca7f89d216f4439cc8b926ad0f884dce39da1dfa', 'f0330e5e87a0e6518f47acca3d30dd40baa6923832a3063b1e0cb82d3f45044a',\n"
     "              '33d0b5deb46dabcbcf7ddeb4233465a8e155f667f42b1fa1da8a09dc745061f9', 'c87048e84d7e7a14f21b6f8d697d4586ddc1f5825ebb941a7ca160fc427d56de',\n"
     "              '9a9297c3936e57053716a38fb614af6918f25f7752681ab4ab6729201c810bce', 'c75c6407d2bfcd9a5ab9bc6173131ee4b5abe1b4e1f76429610d3adc27c2846e',\n"
     "              '7c6e319abef8bd288115b3d783e5a6496bb2855aa8ae9d14e3c3857a70df13f1'}\n"
     "J181_VALIDATION = '16cb39e8444faedf49f38e68758a3f37e47862037247cefa8b40989b78386a40'")
must('J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS', 'J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS')
must('(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION)',
     '(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION)')
must("# var/lab-j177-local/draws-pilot.json), and J180's beside them (J180_DRAWS, J180_VALIDATION, from lab-j180/report/draws.json, read",
     "# var/lab-j177-local/draws-pilot.json), J180's beside them (J180_DRAWS, J180_VALIDATION, from lab-j180/report/draws.json, read\n"
     "# on 2026-11-01) and J181's (J181_DRAWS, J181_VALIDATION, from lab-j181/report/draws.json, read")
# compare.py's note and header
must("BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE COPIER CHANGED: J180 (D493 population, its second night; deck seeds 2066-2078, 150 branches, the futility stop, 10 decisions) beside J182 (D497\\'s population, its first night, on D497\\'s copier; deck seeds 2401-2413, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D497\\'s by itself: the decks differ at every position",
     "BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED: J181 (D497\\'s population, its first night; deck seeds 2079-2091, 150 branches, the futility stop, 10 decisions) beside J182 (D498\\'s population, its first night, on D498\\'s determinizer and D500\\'s copier; deck seeds 2401-2413, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D498\\'s by itself: the decks differ at every position")
must("(xvii) J182 beside J180, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE COPIER CHANGED (D497)",
     "(xvii) J182 beside J181, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE FORK CHANGED (D498, D500)")
must("`report/compare-j181.json`; J180's column computed from its folders and report with the same code)",
     "`report/compare-j181.json`; J181's column computed from its folders and report with the same code)")
must("branch games and the wall. **A candidate, never a verdict**: the decks differ at every position, so no difference is D497's by\n  itself, and J180's s11 carries the fork gap D497 closes.",
     "branch games and the wall. **A candidate, never a verdict**: the decks differ at every position, so no difference is D498's by\n  itself, and J181's s07 carries the redeal gap D498 closes.")
must("by D488s random seat policy on D497s copier, on new decks", "by D488s random seat policy on D498s determinizer, on new decks")
must("10 decisions): D497s population, NEW; never pooled with J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats)",
     "10 decisions): D498s population, NEW; never pooled with J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats)")
must("| `pool` | **`random-<band>-d498`**: D497's population, never J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |",
     "| `pool` | **`random-<band>-d498`**: D498's population, never J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |")
must("the pools are `random-<band>-d498` on J182's night (D497's population).", "the pools are `random-<band>-d498` on J182's night (D498's population).")

# ---------- 5. the decks table: J181's column ----------
ROWS = {
    's01': '2079 / 2179: 17, 0, 77.6 min', 's02': '2080 / 2180: 8, 0, 15.0 min', 's03': '2081 / 2181: 12, 4, 28.7 min',
    's04': '2082 / 2182: 11, 1, 15.9 min', 's05': '2083 / 2183: 13, 1, 41.2 min', 's06': '2084 / 2184: 14, 3, 25.3 min (3 branches errored, D500)',
    's07': '2085 / 2185: 11, 5, 21.8 min (51 logs failed the checker, D498)', 's08': '2086 / 2186: 14, 2, 54.2 min', 's09': '2087 / 2187: 12, 3, 51.1 min',
    's10': '2088 / 2188: 15, 0, 23.9 min', 's11': '2089 / 2189: 5, 0, 5.8 min',
    's12': '2090 / 2190: 10, 1, 38.7 min', 's13': '2091 / 2191: 11, 3, 97.0 min (a hung unit re-run, D499)'}
must('| J180 at this position (the same seat policy and design, the copier changed: D497; other decks): decisions branched, confident labels, wall |',
     '| J181 at this position (the same seat policy and design, the fork changed: D498, D500; other decks): decisions branched, confident labels, wall |')
lines = t.split('\n')
for k, row in enumerate(lines):
    m = re.match(r'^\| (s\d\d) \| (\w+) \| (\d{4}) \| (\d{4}) \| ([^|]+) \| (\d{4} / \d{4}) \| .*\|$', row)
    if m and m.group(1) in ROWS:
        lines[k] = '| %s | %s | %s | %s | %s | %s | %s |' % (m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6), ROWS[m.group(1)])
t = '\n'.join(lines)
must("(J180's numbers from `lab-j180/report/compare-j177.json`'s `this` column and `tool.json`, read only on 2026-11-01; all 13 at 6\nworkers. compare.py reads all 13 again at the Report.)",
     "(J181's numbers from `lab-j181/report/labels.json`'s `bySpine`, `tool.json` and `spine-times.txt`, read only on 2026-11-01; all 13 at 6\nworkers. compare.py reads all 13 again at the Report.)")

# ---------- 6. the guards (the lanes' names: filled after the merge) ----------
must('for x in D481 D482 D483 D484 D485 D486 D487 D488 D489 D490 D491 D492 D493 D494 D495 D496 D497; do',
     'for x in D481 D482 D483 D484 D485 D486 D487 D488 D489 D490 D491 D492 D493 D494 D495 D496 D497 D498 D499 D500; do')
must('has-d481-d497-commits', 'has-d481-d500-commits', 0)
must('d481_d497_commits', 'd481_d500_commits', 0)
k = t.index('\n# the random seat\'s POLICY is J173\'s and J177\'s')
t = t[:k] + '\n@@D498_NAMES@@\n@@D499_NAMES@@\n@@D500_NAMES@@' + t[k:]
must('metrics: has_d497 = sh: cat var/lab-j182-local/has-d497.txt 2>/dev/null || echo 0',
     'metrics: has_d497 = sh: cat var/lab-j182-local/has-d497.txt 2>/dev/null || echo 0\n'
     'metrics: has_d498 = sh: cat var/lab-j182-local/has-d498.txt 2>/dev/null || echo 0\n'
     'metrics: has_d499 = sh: cat var/lab-j182-local/has-d499.txt 2>/dev/null || echo 0\n'
     'metrics: has_d500 = sh: cat var/lab-j182-local/has-d500.txt 2>/dev/null || echo 0')
must('check: has_d497 == 1', 'check: has_d497 == 1\ncheck: has_d498 == 1\ncheck: has_d499 == 1\ncheck: has_d500 == 1')
must('test "$(git diff --name-only 7a984963e61cdfe98cadfcc45fa7690a61dc37f6 HEAD -- bridge/src | LC_ALL=C sort | tr \'\\n\' \' \')" = "bridge/src/mtgtable/ai/LenientGameCopier.java " && sc=1',
     'test "$(git diff --name-only 7a984963e61cdfe98cadfcc45fa7690a61dc37f6 HEAD -- bridge/src | LC_ALL=C sort | tr \'\\n\' \' \')" = "@@BRIDGE_DIFF@@" && sc=1')
must("echo \"J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's (D493's plus the paper-card carry): $sc\"",
     "echo \"J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's: $sc\"")

# ---------- 6b. the game-seed hundreds in the globs: J182's folders end in 25??, J181's in 21?? ----------
must('lab-j182/b-s??-*-21??', 'lab-j182/b-s??-*-25??', 0)
must("every glob is under lab-j182's `b-s??-*-21??`", "every glob is under lab-j182's `b-s??-*-25??`")
must("G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-21??'", "G = sys.argv[2] if len(sys.argv) > 2 else 'b-s??-*-25??'")
must("for d in $D/b-s??-*-21??; do", "for d in $D/b-s??-*-25??; do", 0)
must("# the night's 13 spines: b-s??-*-21?? matches no pilot folder", "# the night's 13 spines: b-s??-*-25?? matches no pilot folder")
must("for d in sorted(glob.glob(D + '/b-s??-*-21??'))]; print(json.dumps({'note': 'all 13 spines branched by J182", "for d in sorted(glob.glob(D + '/b-s??-*-25??'))]; print(json.dumps({'note': 'all 13 spines branched by J182")
must("    for sp in sorted(glob.glob(D + '/b-s??-*-21??')):", "    for sp in sorted(glob.glob(D + '/b-s??-*-2???')):   # J182's folders end in 25??, J181's in 21??: one glob reads both")

# ---------- 7. the header lines ----------
lines = t.split('\n')


def setline(prefix, value):
    for k, row in enumerate(lines):
        if row.startswith(prefix):
            lines[k] = prefix + value
            return
    sys.exit('no line starts with %r' % prefix)


setline('id: ', 'J182')
setline('title: ', "The move atlas, rung 4b, night seven -- J181's night carried onto the new main (D498: the determinizer keeps every card the seat may look at where it is and redeals only what it cannot see -- the shape that failed J181's s07; D499: a killed attempt's rows are abandoned, never audited -- J181's s13; D500: the fork carries the damage-this-turn history -- J181's s06) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j182, at deck seeds 2401-2413 (D447 with D482's list as D490, D492 and D494 leave it, the bands cycled as J166's) and game seeds 2501-2513; a validation draw made fresh at deck seeds 2601-2613 (game seeds 2701-2713 reserved); THE FIRST NIGHT OF D498'S POPULATION, pooled with nothing before it; J181's night read beside, by position, as information")
setline('public_title: ', 'Move atlas 4b night seven: 13 new spines, D498-D500 lab fixes, a new population')
setline('public_decides: ', 'None by itself; first night on the D498 determinizer, a new population')
setline('public_est: ', '~8 h to 12 h')
setline('repos: ', 'mtg-table@%s (origin/main: @@MERGE_LINE@@; the coordinator writes that merge\'s full sha here before posting; merged == 1, the commits that added D481-D500\'s decision files, D493\'s, D495\'s, D496\'s, D497\'s, D498\'s, D499\'s and D500\'s names, the seat\'s code and the deck code exactly as this file states them, checked by the pilot)' % PIN)
t = '\n'.join(lines)
must("D496 (the seat's log records what the engine revealed to it; the checker accepts an option revealed in the step) and D497 (the fork's copy gives a re-made token its original's paper card: the population J182 opens; every lab worker keeps a hot exception's stack); D447 (the deck draw). Pre-registered here, before any J182 data: J177's label contract v6",
     "D496 (the seat's log records what the engine revealed to it; the checker accepts an option revealed in the step), D497 (the fork's copy gives a re-made token its original's paper card; every lab worker keeps a hot exception's stack), D498 (the determinizer keeps what the seat may look at in place: the population J182 opens), D499 (a killed attempt's rows are abandoned) and D500 (the fork carries the damage-this-turn history); D447 (the deck draw). Pre-registered here, before any J182 data: J177's label contract v6")
must("the comparison with J180 by compare.py, all exactly as written in the pilot", "the comparison with J181 by compare.py, all exactly as written in the pilot")

# ---------- 7b. decides / hypothesis / est ----------
lines = t.split('\n')
setline('decides: ', "nothing by itself. Rung 4b's seventh night, the fifth on D489's futility stop with the review's 150 cap, and **the FIRST of D498's population**. **What changed under the seat since J181:** the fork, in two places, and a reader. The random seat's POLICY is D488's, as J173's, J177's, J180's and J181's, the recorder is D496's and the copier's paper-card carry D497's, as J181's; **what changed is the redeal and the damage history on the fork** (D498, D500): `Determinizer` keeps every card the searching seat may look at where it is (a card revealed on top of the opponent's library stays on top; a revealed hand card stays in the hand) and redeals only what the seat cannot see, where before it pooled the opponent's whole hand and library and could deal a known top card into the hand, still marked lookable -- so a branch's redealt world now agrees with the seat's own log (J181's s07: 48 of decision 14's 150 branches showed a named card in a hand with no reveal record, and the checker failed 51 logs); and `LenientGameCopier` carries the game's damage-this-turn history onto the copy, so a `DamagedBy` property on a forked board reads it instead of dereferencing a null (J181's s06: 3 branches). D499 changes no play: a killed attempt's rows (a `begin` with no `end` whose key another worker played to its end) are abandoned and counted, never audited or read (J181's s13). `git diff 7a984963 <pin> -- bridge/src` is exactly the files `seat_code` lists, and `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (a pilot check, `seat_code`; `identity == 1` stays the real check). **Comparability, the rule this night follows:** D489 pools nights across a change to HOW MANY branches a decision gets, and says \"A future change to the seat or to what it offers does\" open a new population; D493 and D497 opened populations when the copier changed what a branch plays, and D498 changes the redealt world a branch plays in wherever the seat may look at an opponent's card. So **J182's labels and reads are D498's population's first night: pooled with nothing -- a new `pool`, `random-<band>-d498`, a new `randomSeat: \"D498\"`; never with J181's v6 rows (D497's population), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- the first read of this population, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside it as information, with the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46 as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J181's at the same position (other decks, the same seat policy, the same branching design, the fork changed): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D497 (no `paperCard` in any errored branch's stack, no bare exception in any worker log), D498 (no A6 failure of the checker on any branch log: the morning read's redaction sweep), D499 (`abandonedPlays` named in `atlas.json` if any unit was re-run, and no id problem from a killed attempt's rows) and D500 (no `getDamageLKI` in any errored branch's stack)")
setline('hypothesis: ', "none to confirm about the maps. Registered expectations, as information: **the problem classes that failed J181 do not recur, J180's and J177's did not recur on J181, and J176's four stay away** -- a card the seat may look at stays where the seat knows it is on every fork and no branch log shows a full card in a hidden zone without a reveal record (D498: the determinizer's bench scenario fails on main's and passes on the pin's); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500: the copier's bench scenario); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log; a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); no deck holds a Prepare card or Ob Nixilis, the Adversary (D492, D494; `deck_code`); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes (D495) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap no atlas has met (the check fails the night then, as it failed J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J181: 153 read, 35 stopped, 13 controls, 0 partial rows confident; J180: 105, 29, 14, 0; J177: 121, 29, 12, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J181's and J180's (read beside, not predicted); J181's yield, 23 confident of 80 labels, 0.464 confident labels a worker-hour on 49.6 worker-hours, J180's 0.551 on 43.6 and J177's 0.563 on 53.3 are other populations' and are read beside, never predicted; the walls ~8.5 h at 6 workers for all 13 at J181's pace (29,764 s of walls, 29,817 s from its first spine's start to its last's end; *Sizing*)")
setline('est: ', "~9.5 h at 6 workers (range 6-12 h; sizing below): pilot ~40 min (J173's ~35 plus the readers' self-tests, the cap read on J171's night ~1 min); the 13 spines ~8.3 h at J181's pace (13 x ~38 min; J181's ran 5.8 to 97.0 min); the scan ~6 min; the report ~5 min. Disk ~11-15 GB on the lab data folder /home/justin-a/code/lab/data (J171's 13 spines: 12.4 GB)")
t = '\n'.join(lines)

# ---------- 8. the "Before posting" items and the pooling prose ----------
must("1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j182` already exists (made 2026-11-01 11:20 EST, empty when this was\n   drafted).",
     "1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j182` already exists (made @@FOLDER_TIME@@ EST, empty when this was\n   drafted).")
i, j = between('2. **The pin is written:**', '3. **If D497')
t = t[:i] + "2. **The pin is written:** `%s`, the merge of `pc/d498`, `pc/d499` and `pc/d500` on origin/main (2026-11-01, gated once on the merged\n   tree from a deleted `bridge/out`; the line is in the merge commit's message). `runner.sh check` would not catch a placeholder here; it\n   is written by hand from `git rev-parse` of the pushed merge, and `grep -c PIN_SHA` on this file must print 0 before posting.\n" % PIN + t[j:]
i, j = between('3. **If D497', '4. **J180 has ended**')
t = t[:i] + """3. **If the merge of D498, D499 and D500 renamed or changed anything this file reads, correct it before posting** (drafted against the
   lanes' commits in `/home/justin-a/code/mtg-table-d498`, `-d499` and `-d500`, on main's 60177314): the three decision files, the
   names each `has_d49x`/`has_d500` grep reads (the pilot's lines), and **the merge changes `bridge/src` in exactly the files `seat_code`
   lists and nothing under `fixtures/cubelab/seat-identity.json`, `tools/cubelab/deckcensus.ts`, `cubes/library/` or
   `tools/cubelab/engine-unplayable.json`** (`git diff 60177314 <pin> --stat`); if the merge differs, re-derive the guard from the new
   diff and write here what it now accepts -- never loosen it to pass. D497's and D496's names (their item 3 on J181 and J180) are
   checked unchanged by `has_d497` and `has_d496`.
""" + t[j:]
i, j = between('4. **J180 has ended**', '5. **`--decisions` stays 10.**')
t = t[:i] + """4. **J181 has ended** (failed on `atlas.problems == 0`, 9 problems across two faults, and on `atlas.poolOk == 13`, its own derivation
   fault; its Report written: `lab-j181/report/labels.json`, `reads.json`, `compare-j180.json` and the rest). J182 reads lab-j181
   read-only, for its J181 columns; nothing waits on another job, so there is **no `after:` line**. J181's job file needs nothing.
""" + t[j:]
must("5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J182 compares with J180 position by position, and a\n   second change beside the new decks and the new copier would make every difference ambiguous among the three.",
     "5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J182 compares with J181 position by position, and a\n   second change beside the new decks and the new fork would make every difference ambiguous among the three.")
must("6. **Nothing else to make, move or clean.** J182 reads lab-j170 (J171's night), lab-j180 (J180's), lab-j162 and lab-j158 for its",
     "6. **Nothing else to make, move or clean.** J182 reads lab-j170 (J171's night), lab-j181 (J181's), lab-j162 and lab-j158 for its")
must("constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, and J180's from\n   `lab-j180/report/draws.json`, read by this draft on 2026-11-01), so it reads no `var/lab-j1xx-local/` folder but its own. Post nothing\n   that writes lab-j180 or lab-j182 beside J182.",
     "constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's from\n   `lab-j180/report/draws.json` and J181's from `lab-j181/report/draws.json`, read by this draft on 2026-11-01), so it reads no\n   `var/lab-j1xx-local/` folder but its own. Post nothing that writes lab-j181 or lab-j182 beside J182.")
must("count D497's population holds is 0 before tonight (D493's holds J177's 12 and J180's 14, 0 of 26 confident, read beside); ~10-14\n  controls a night is too few to read on its own; 0.25 holds until this population's pooled count can carry the read.",
     "count D498's population holds is 0 before tonight (D497's holds J181's 13, D493's J177's 12 and J180's 14, 0 of 39 confident, read\n  beside); ~10-14 controls a night is too few to read on its own; 0.25 holds until this population's pooled count can carry the read.")
i, j = between("**So J182 is D497's population's first night, on new spines**", '**The seeds are new')
t = t[:i] + """**So J182 is D498's population's first night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's and the
copier's carry D497's, as J181's; the fork changed (D498's redeal, D500's damage history), so J182's labels pool with nothing before them
-- `pool: random-<band>-d498`, contract v6. **Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's,
so s01 is pauper and s13 pauper again), into a new folder. **J181's numbers are a comparison by position, never a baseline**: s01 beside
s01 is the same band, the same seat policy and the same branching design, but other decks, other seeds and the fork before D498 -- every
difference is a candidate, and none can be put on D498 by itself. J180's, J177's, J173's and J171's nights stay other populations and
appear only in the readers' self-tests, their registered expectations and J177's sizing paragraph.

""" + t[j:]
must("**Sizing: J177's, unchanged; J180's walls beside it.** J180's 13 spines, all at 6 workers, took 26,149 s of walls (7.3 h; 4.4 to 113.1\nmin a spine, s13 the longest), 43.6 worker-hours, 53,570 branch rows, 105 decisions branched (8.08 a spine). J177 measured the design:",
     "**Sizing: J177's, unchanged; J181's walls beside it.** J181's 13 spines, all at 6 workers, took 29,764 s of walls (8.3 h; 5.8 to 97.0\nmin a spine, s13 the longest), 49.6 worker-hours, 53,300 branch rows, 153 decisions branched (11.8 a spine; J180's 105, 8.08). J177\nmeasured the design:")
must("**This night's numbers are the FIRST contribution\n  to D497's population's pooled read** (`pooledInputs`); J177's 0 of 12 and J180's 0 of 14 (D493's population) are read beside, as\n  information, never added.",
     "**This night's numbers are the FIRST contribution\n  to D498's population's pooled read** (`pooledInputs`); J181's 0 of 13 (D497's population), J177's 0 of 12 and J180's 0 of 14\n  (D493's) are read beside, as information, never added.")
must("ANOTHER POPULATION -- the copier before D497 -- the same design, other decks: 0.551 a worker-hour on 43.6 worker-hours; J177's 0.563)",
     "ANOTHER POPULATION -- the fork before D498 -- the same design, other decks: 0.464 a worker-hour on 49.6 worker-hours; J180's 0.551, J177's 0.563)")
must("as information: J180's** (read from `lab-j180/report/labels.json` at the Report, `--j181=`;",
     "as information: J181's** (read from `lab-j181/report/labels.json` at the Report, `--j181=`;")
i, j = between("# J182 (drafts/J182-atlas-4b-night-seven.md): J177's labels.py (contract v6", "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py")
t = t[:i] + """# J182 (drafts/J182-atlas-4b-night-seven.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J182 data. What changes: nothing in the rows. J182 is D498's population's first night (D498 changed the determinizer, and
# with it the redealt world a branch plays in), so its rows pool with NOTHING before them (D493, Comparability): --seat= defaults to
# "D498" (the self-test on J171's night still passes --seat=D486), the Report names the pools `random-<band>-d498`; and the sizing read's
# beside-column is J181's (--j181= LABELS_JSON: its c_sizingRead and per-worker-hour yield, ANOTHER POPULATION's first night, as
# information; null when absent). Every field, read and definition otherwise J177's, unchanged; the scan stamp `J182 v5`.
""" + t[j:]
i, j = between("# J182 (drafts/J182-atlas-4b-night-seven.md): each spine's numbers beside J180's AT THE SAME POSITION", "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's")
t = t[:i] + """# J182 (drafts/J182-atlas-4b-night-seven.md): each spine's numbers beside J181's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J182 data. DIFFERENT DECKS (J181: deck seeds 2079-2091, game seeds 2179-2191; J182: 2401-2413, 2501-2513; the same band at
# each position), THE SAME SEAT POLICY (D488's) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions),
# and ANOTHER FORK (D498's redeal, D500's damage history): J181 and J182 are two populations. A difference is a candidate, never a
# verdict, no position is a pair, and no difference is D498's by itself (the decks differ everywhere; J181's s07 carries the redeal gap
# D498 closes). J177's compare.py, unchanged but for its note: `this` is J182, `before` J181, read from lab-j181 at the Report (read only).
""" + t[j:]
must("# J180's night, read only, as information (it ended 2026-11-01, its report written): what compare.py and labels.py's c_sizingRead will\n# read at the Report (ANOTHER POPULATION's second night: beside, never pooled)",
     "# J181's night, read only, as information (it ended 2026-11-01, its report written): what compare.py and labels.py's c_sizingRead will\n# read at the Report (ANOTHER POPULATION's first night: beside, never pooled)")
must("# J180's night, read only, for the J180 columns (compare.py) and J180's sizing read (labels.py --j181): ANOTHER POPULATION, read beside,",
     "# J181's night, read only, for the J181 columns (compare.py) and J181's sizing read (labels.py --j181): ANOTHER POPULATION, read beside,")
must("2401-2413, game seeds 2501-2513) branched by J182 at the pin, by D488's random seat policy forking on D497's copier, the FIRST\n  night of D497's population**: `training: true`, `pool: random-<band>-d498`, `randomSeat: \"D498\"`, contract v6 with `branchRandom: 150`\n  and the partial rows marked; **pooled with nothing before: not J177's and J180's rows (D493's population: the copier before D497), not\n  J173's nor anything older** (D493, Comparability, quoted: \"search-v2 results and atlas maps from before and after D493 are not\n  pooled\"; D489's \"A future change to the seat or to what it offers does\", quoted -- a copier that changes what a branch plays does).",
     "2401-2413, game seeds 2501-2513) branched by J182 at the pin, by D488's random seat policy forking on D498's determinizer, the FIRST\n  night of D498's population**: `training: true`, `pool: random-<band>-d498`, `randomSeat: \"D498\"`, contract v6 with `branchRandom: 150`\n  and the partial rows marked; **pooled with nothing before: not J181's rows (D497's population: the fork before D498), not J177's and\n  J180's (D493's), not J173's nor anything older** (D493, Comparability, quoted: \"search-v2 results and atlas maps from before and after\n  D493 are not pooled\"; D489's \"A future change to the seat or to what it offers does\", quoted -- a redeal that changes the world a branch\n  plays in does).")
must("J180's gap and J177's stayed closed**: no branch errored with `paperCard` in its stack and no bare exception in any worker log\n  (D497), no checker failure on a cascade's \"cast it?\" inside a held frame (D496; the stats line's `revealed to the seat` count, per\n  spine, as information), no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or\n  Foretold cast, no checker failure on a spell copy on the stack.",
     "J181's three gaps, J180's and J177's stayed closed**: no branch log failed the checker's A6 on a card the seat may look at (D498;\n  the sweep's count per spine, as information), no id problem from a killed attempt's rows and `abandonedPlays` said when a unit was\n  re-run (D499), no `getDamageLKI` and no `paperCard` in any errored branch's stack and no bare exception in any worker log (D500,\n  D497), no checker failure on a cascade's \"cast it?\" inside a held frame (D496), no Prepare card and no Ob Nixilis, the Adversary in\n  any deck, no `no ... on the copy's` error on a Plotted or Foretold cast, no checker failure on a spell copy on the stack.")
must("beside it **J180's** (0.551 a worker-hour, 38.5 a 7-worker night; another population: the copier before D497, other decks) and\n  **J177's** (0.563) and **the review's ~46 [41, 51]**.",
     "beside it **J181's** (0.464 a worker-hour, 32.5 a 7-worker night [20.6, 48.7]; another population: the fork before D498, other\n  decks), **J180's** (0.551), **J177's** (0.563) and **the review's ~46 [41, 51]**.")
must("**Say that this\n  is the first night of D497's population's pooled read** (`pooledInputs`), that J177's 0 of 12 and J180's 0 of 14 are D493's\n  population's and are not added in, and that ~10-14 controls cannot tell .04 from .2.",
     "**Say that this\n  is the first night of D498's population's pooled read** (`pooledInputs`), that J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14\n  are other populations' and are not added in, and that ~10-14 controls cannot tell .04 from .2.")
must("beside the review's 54%, 68% and 87% and J180's and J177's own (their `ncurve.json`);", "beside the review's 54%, 68% and 87% and J181's, J180's and J177's own (their `ncurve.json`);")
must("spine (10 asked; branched, branched in full, partial) against J180's 8.08 and J177's 9.31**.", "spine (10 asked; branched, branched in full, partial) against J181's 11.8, J180's 8.08 and J177's 9.31**.")
must("and for the night beside J180's (0.10%), J177's (0.35%) and J171's (0.53%)", "and for the night beside J181's (0.02%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)")
must("with J180's values at the same positions beside\n  (another population, other decks);", "with J181's values at the same positions beside\n  (another population, other decks);")
must("- **J182 beside J180, by position** (`compare-j181.json`):", "- **J182 beside J181, by position** (`compare-j181.json`):")
must("the confident share, mean regret at Forge's choice, capped share and wall; **labelled: different decks, the same seat policy and\n  design, the copier changed (D497), J180's s11 carrying the fork gap; a candidate, never a verdict** -- no difference is D497's by\n  itself.",
     "the confident share, mean regret at Forge's choice, capped share and wall; **labelled: different decks, the same seat policy and\n  design, the fork changed (D498, D500), J181's s07 carrying the redeal gap; a candidate, never a verdict** -- no difference is D498's by\n  itself.")
must("(against J180's, and the ~7.5 h at 6 workers *Sizing* expected)", "(against J181's, and the ~8.3 h at 6 workers *Sizing* expected)")

# ---------- 9. the merged tree's names (filled 2026-11-01 21:30 EST from pc/merge-d498-d501 = c6870381; the pin after the push) ----------
BRIDGE = "bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/SearchPolicy.java "
TEN = "bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/Determinizer.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java bridge/src/mtgtable/ai/SearchPolicy.java "
must('@@BRIDGE_DIFF@@', BRIDGE)
must('@@MERGE_LINE@@', "the merge of pc/d498, pc/d499, pc/d500 and pc/d501 (D498-D501) on 60177314 (D497's merge, on 7a984963, D496's)")
must('D496_FILES="bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java "',
     'D496_FILES="' + TEN + '"')
must('= "bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java bridge/src/mtgtable/ai/SearchPolicy.java " && test "$(git diff --numstat 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr \'\\t\' \' \')" = "5 0"',
     '= "' + TEN + '" && test "$(git diff --numstat 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr \'\\t\' \' \')" = "8 0"')
must("# D495's merge (480c837d, J177's pin) is an ancestor of the pin, and since it bridge/src changed in exactly D496's six files (five of the\n# lane plus GameLog.java's javadoc from the review, comments only) and the\n# seat-identity golden not at all; since J173's pin (6e87e5d4, D488's merge) the golden is unchanged and bridge/src changed in exactly\n# D493's two files (LenientGameCopier.java, the carry pass; SearchPolicy.java, a self-test accessor, 5 lines in, none out) plus those six",
     "# D495's merge (480c837d, J177's pin) is an ancestor of the pin, and since it bridge/src changed in exactly ten files: D496's six (five of\n# the lane plus GameLog.java's javadoc from the review, comments only), D497's LenientGameCopier.java (also D500's damage pass), D498's\n# Determinizer.java and Atlas.java (the no-leak check redeals the same way) and D500's SearchPolicy.java (a counter into the search sink,\n# `search.damageLkiLost`, 3 lines in, none out) and the seat-identity golden not at all; since J173's pin (6e87e5d4, D488's merge) the\n# golden is unchanged and bridge/src changed in exactly those ten (SearchPolicy.java: D493's self-test accessor 5 lines plus D500's 3, 8 in,\n# none out)")
must("echo \"J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's: $sc\"",
     "echo \"J182: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's (bridge/src since 7a984963: Atlas, Determinizer, LenientGameCopier, SearchPolicy): $sc\"")
HAS = {
 '@@D498_NAMES@@': "# D498 (the determinizer keeps what the seat may look at; the names this file reads, checked against the merge c6870381)\nls docs/decisions/D498-*.md >/dev/null 2>&1 && grep -q 'mayPlayerLook' docs/decisions/D498-*.md && grep -q 'redealHidden(' bridge/src/mtgtable/ai/Determinizer.java && grep -q 'mayPlayerLook' bridge/src/mtgtable/ai/Determinizer.java && grep -q 'Determinizer.redealHidden' bridge/src/mtgtable/ai/Atlas.java && grep -q 'determinize-revealed' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/determinize-revealed.dck && echo 1 > var/lab-j182-local/has-d498.txt || echo 0 > var/lab-j182-local/has-d498.txt",
 '@@D499_NAMES@@': "# D499 (a game's rows are one play; a killed attempt's are abandoned)\nls docs/decisions/D499-*.md >/dev/null 2>&1 && grep -q 'abandoned' docs/decisions/D499-*.md && grep -q 'abandonedPlays' tools/cubelab/atlas.ts && grep -q 'supersededPlays' tools/cubelab/atlas.ts && grep -q 'playedTwice' tools/cubelab/rowscheck.ts && grep -q 'orphanRows' tools/cubelab/rowscheck.ts && test -f web/test/cubelab-record-cake.test.ts && echo 1 > var/lab-j182-local/has-d499.txt || echo 0 > var/lab-j182-local/has-d499.txt",
 '@@D500_NAMES@@': "# D500 (the fork carries the damage-this-turn history) and D501 (the checker's empty-hand proof admits A3's revealed top card)\nls docs/decisions/D500-*.md >/dev/null 2>&1 && grep -q 'addGlobalDamageHistory' docs/decisions/D500-*.md && grep -q 'addGlobalDamageHistory' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'damageLkiLost()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'search.damageLkiLost' bridge/src/mtgtable/ai/SearchPolicy.java && grep -q 'damageLkiLost' tools/cubelab/atlas.ts && grep -q 'fork-damage-lki' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/fork-damage-lki.dck && echo 1 > var/lab-j182-local/has-d500.txt || echo 0 > var/lab-j182-local/has-d500.txt\nls docs/decisions/D501-*.md >/dev/null 2>&1 && grep -q 'revealedTopCard' docs/decisions/D501-*.md && grep -q 'revealedTopCard' tools/check-redaction.mjs && grep -q 'revealed top card (A3)' tools/check-redaction.mjs && echo 1 > var/lab-j182-local/has-d501.txt || echo 0 > var/lab-j182-local/has-d501.txt",
}
for k, v in HAS.items(): must(k, v)
must('metrics: has_d500 = sh: cat var/lab-j182-local/has-d500.txt 2>/dev/null || echo 0',
     'metrics: has_d500 = sh: cat var/lab-j182-local/has-d500.txt 2>/dev/null || echo 0\nmetrics: has_d501 = sh: cat var/lab-j182-local/has-d501.txt 2>/dev/null || echo 0')
must('check: has_d500 == 1', 'check: has_d500 == 1\ncheck: has_d501 == 1')
must('D497 D498 D499 D500; do', 'D497 D498 D499 D500 D501; do')
must('has-d481-d500-commits', 'has-d481-d501-commits', 0)
must('d481_d500_commits', 'd481_d501_commits', 0)
must('D481-D500', 'D481-D501', 0)
must("D497's, D498's, D499's and D500's names", "D497's, D498's, D499's, D500's and D501's names")
must('@@FOLDER_TIME@@', '2026-11-01 21:28')

if FAIL:
    print('\n'.join(FAIL)); sys.exit(1)
# the old population must be gone from every code and prose spelling but the history (the WHY paragraph and the pool table's "never" list)
left = [m.start() for m in re.finditer(r'random-[^ ]{1,8}-d497', t)]
print('old population tokens left (should be the history mentions only):', len(left))
for p in left:
    print('   ', t[max(0, p - 60):p + 40].replace('\n', ' '))
missing = [k for k, v in FILL.items() if v is None and k in t]
if missing:
    print('placeholders still unfilled:', missing)
open(DST, 'w').write(t)
print('shifted', dict(sorted(shifted.items())))
print('lines', n0, '->', len(t.splitlines()))
print('PIN placeholders', t.count(PIN))

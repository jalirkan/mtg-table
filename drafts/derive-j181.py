#!/usr/bin/env python3
"""Derive J181's job file from J180's, by the three-trap rule:
(1) rename only the job's own name; (2) shift the four seed ranges inclusive of their bases, skipping any
number touching a letter, digit or hex neighbour, after the history paragraphs are rewritten; (3) change
registered strings only on purpose, each one named here. The pin is PIN_SHA_D497 until the merge lands."""
import re, sys

SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J180-atlas-4b-night-five-repost2.md'
DST = '/home/justin-a/code/pc-results/drafts/J181-atlas-4b-night-six.md'
PIN = 'PIN_SHA_D497'
t = open(SRC).read()
n0 = len(t.splitlines())


FAIL = []


def must(old, new, count=1):
    """Replace a string that must occur exactly `count` times (0 = at least once)."""
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


# ---------- 0. rewrite the history paragraphs BEFORE the shift (they hold old-block numbers) ----------
i, j = between('**Why J180.**', '**Before posting -- the coordinator')
WHY = '''**Why J181.** J180 (rung 4b, night five, the second of D493's population; posted 2026-11-01 02:45 EST as the second repost of
J178, finished 09:54 EST after 26,970 s) played all 13 spines and its Report: 105 branched decisions, 76 labels, 24 confident, 29
partial, 14 controls (0 of them confident at the full n), 0.551 confident labels a worker-hour on 43.6 worker-hours, capped share 0.048;
all 13 spines at 6 workers, 26,149 s of walls (7.3 h). Every check passed but one -- **`atlas.problems == 0` failed on 1 problem**
(J177: 1, J176: 22), one tool gap, now closed by a decision merged since J180's pin (7a984963):
- **s11** (legacy, 2076/2176, Fable of the Mirror-Breaker in both decks): **77 of 4,875 branch games errored**, all at d18 and d19
  (one game, turns 15 and 16, every option), and option `attack:12,26` at d18 had 16 of 150, over the 10% bar. 13 rows carried a stack:
  `CopyPermanentEffect.getProtoType` -> `CardFactory.getCard(original.getPaperCard() == null)` -> `readCard` NullPointerException; the
  other 64 were HotSpot's bare fast-throw of the same site (messaged first, bare after, in every worker log -- D494's pattern). The cause
  is the fork, not the game: `GameCopier.createCardCopy` re-makes every token with `new TokenInfo(c).makeOneToken` -> `new Card(id, game)`,
  no paper card, and `Card.paperCard` is private final; a live token from a token script carries its `PaperToken`, so Reflection of
  Kiki-Jiki copying a Goblin Shaman token works in a game and died in every branch. Not Fable's alone: any `CopyPermanent` whose original
  is a token on a forked board (seven pool cards can choose one). **D497** repairs the fork: `LenientGameCopier`'s carry pass gives each
  re-made token its original's paper card, field to field (a reflective write, the lint's `forge-field-write` budget of one, with a
  self-test case each way), a real-engine `fork-token-copy` scenario in `tools/ai-bench.sh --selftest` that fails on main's copier and
  passes with it, and `-XX:-OmitStackTraceInFastThrow` on every lab worker JVM so the next field crash keeps its stack in every row.
  Nothing listed on `engine-unplayable.json`: the fault was ours, and a repair was reachable (D497's rejected alternatives).
- **D496 on its first field night**: every J180 log carries `reveal` lines (85,454 over 107,140 logs), the cascade shape appeared in s10
  alone (178 lines, 128 logs), all 128 pass the checker, and none needed D496's rule (`revealedThenSeen` 0: every option was vouched by a
  state frame). J177's exact shape -- the "cast it?" choice inside a held frame -- did not recur; the cube lab's follow-up 10 stays open.
- s08 and s10 branched 2 and 1 decisions: their baseline games lasted 12 and 17 turns and listed few decisions with three or more
  options. Not a fault; the night's branched count (105 of 130 asked) is read beside J177's 121.

J181 is J180's night carried forward onto that main: the same design, the same pilot, the same reads and checks, 13 new spines at the
next seeds in a new folder, `lab-j181`. J180's own outputs stay in `lab-j180/` and are read only, for the J180 columns. **J181 opens a
NEW population** (D497 changes what a branch plays: a forked token now answers `getRules()` with its script's rules where it answered
null, and Forge's AI reads those; D493's precedent -- a copier change opened J177's population -- applies), so nothing of J181's is
pooled with J177's or J180's; they are read beside, by position, as information.

'''
t = t[:i] + '@@WHY@@\n\n' + t[j:]

# the seeds paragraph (holds "2053-2065", the old block's history): rewrite
i, j = between('**The seeds are new**', '## The decks')
SEEDS = '''**The seeds are new** (checked by this draft, 2026-11-01): `git -C /home/justin-a/code/mtg-table grep -n -w -E
'20(9[2-9])|210[0-4]|21(9[2-9])|220[0-4]|22(9[2-9])|230[0-4]|23(9[2-9])|240[0-4]' origin/pc-jobs -- jobs/` (origin/pc-jobs at 6c65aad7,
J180's post) finds no seed of the block after this one -- only `2400` game counts (J052, J055, J058, J102, J115) and the decimal
`0.2181` in J166-J168's registered reads -- and this draft's own block, 2079-2091, 2179-2191, 2279-2291 and 2379-2391, appears in no job
file but J180's, as "the block after J180's" (its seeds-new grep); the same over `/home/justin-a/code/pc-results/drafts/*.md` (J150's and
J157's `--rollouts 2400`);
every computed seed in a job or draft is `$((2000 + K))`, `$((2200 + K))` (2001-2013, 2201-2213), J173's `$((2013 + K))`, `$((2213 + K))`
(2014-2026, 2214-2226), J174-J177's `$((2026 + K))`, `$((2226 + K))` (2040-2052, 2240-2252) or J178-J180's `$((2052 + K))` and
`$((2065 + K))` (J178's and J179's pilots drew 2053-2065 into lab-j178 and lab-j179 and never branched them; J180's 2066-2078 are
lab-j180's), with the older blocks' small ones below 1700; and no folder under `/home/justin-a/code/lab/data` (three levels deep) ends in
one of this block's. Bases and literals were moved together by one inclusive shift of J180's block ([2065, 2078] and its three
companions, +13), skipping any number touching a letter or hex digit, and every changed four-digit token was read in context: deck seeds
`$((2078 + K))`, validation `$((2278 + K))`, game seeds the deck seed + 100. The smoke keeps J166's pair (deck seed 2099) at game seed
2199, in a new folder, as every pilot since J167; that pair holds none of the six cards D490-D494 list, so its draw on the list is
J166's registered sha256.

'''
t = t[:i] + '@@SEEDS@@\n\n' + t[j:]

# ---------- 1. the job's own name ----------
t = t.replace('J180', 'J181').replace('j180', 'j181')
must('drafts/J181-atlas-4b-night-four.md', 'drafts/J181-atlas-4b-night-six.md', 0)
must('J181-atlas-4b-night-five-repost2', 'J181-atlas-4b-night-six', 0) if 'J181-atlas-4b-night-five-repost2' in t else None

# ---------- 2. the seed shift: four inclusive ranges, +13, hex/letter-safe ----------
RANGES = [(2065, 2078), (2165, 2178), (2265, 2278), (2365, 2378)]
shifted = {}


def shift(m):
    v = int(m.group(0))
    for a, b in RANGES:
        if a <= v <= b:
            shifted[v] = shifted.get(v, 0) + 1
            return str(v + 13)
    return m.group(0)


t = re.sub(r'(?<![0-9A-Za-z.])\d{4}(?![0-9A-Za-z.])', shift, t)

# J171's registered numbers that fell inside the shifted range (the third trap): restore them
must("'wallSec': 1946, 'branchGames': 2088}", "'wallSec': 1946, 'branchGames': 2075}")
must("4451, 4474, 2090, 1514, 859", "4451, 4474, 2077, 1514, 859")
must('@@WHY@@\n\n', WHY)
must('@@SEEDS@@\n\n', SEEDS)

# ---------- 3. the population: D497's, new ----------
t = re.sub(r'(random-(?:\$b|\$\{b\}|<band>|[a-z]+)-)d493', r'\1d497', t)
must("SEAT = opt.get('seat') or 'D493'", "SEAT = opt.get('seat') or 'D497'")
must("m['randomSeat'] == 'D493'", "m['randomSeat'] == 'D497'")
must('randomSeat: "D493"', 'randomSeat: "D497"', 0)
must('the seat "D493"', 'the seat "D497"', 0)
must("its band's D493 pool", "its band's D497 pool", 0)
must("D497 pool (D493's population)", "D497 pool (D497's population)", 0)
must("D483's listing, D493's population, the pin", "D483's listing, D497's population, the pin")
must("sizing read (labels.py --j177)", "sizing read (labels.py --j180)")

# ---------- 4. the comparison night is J180 ----------
# code tokens
must('--j177=', '--j180=', 0)
must("opt.get('j177')", "opt.get('j180')")
must("opt['j177']", "opt['j180']", 0)
must("out['c_sizingRead']['j177'] = J177", "out['c_sizingRead']['j180'] = J180")
must('J177 = None', 'J180 = None', 0)
must("J177 = {'labels'", "J180 = {'labels'")
must("'population': 'D488 (the copier before D493): never pooled with this night (D493, Comparability)'",
     "'population': 'D493 (the copier before D497): never pooled with this night (D497, Comparability)'")
must("J177 (ANOTHER POPULATION: D488\\'s seat policy on the copier before D493; the same design, other decks; s03 and s10 lost to crashes)",
     "J180 (ANOTHER POPULATION: D488\\'s seat policy on D493\\'s copier, before D497; the same design, other decks)")
must('compare-j177.json', 'compare-j180.json', 0)
must('j177.json', 'j180.json', 0)
must('metrics: j177 =', 'metrics: j180 =')
must('J6=/home/justin-a/code/lab/data/lab-j177', 'J6=/home/justin-a/code/lab/data/lab-j180')
must("D = '/home/justin-a/code/lab/data/lab-j177'", "D = '/home/justin-a/code/lab/data/lab-j180'")
# draws.py: register J180's draws beside J177's
must("J177_VALIDATION = 'a892900b017e630a517fee6f98e455da36136c30ebd35690d71b1177410d8238'",
     "J177_VALIDATION = 'a892900b017e630a517fee6f98e455da36136c30ebd35690d71b1177410d8238'\n"
     "# J180's 13 spine draws and its validation draw (lab-j180/report/draws.json's `recorded`, read by this draft on 2026-11-01): none may\n"
     "# come back here either\n"
     "J180_DRAWS = {'bc0921398ede73fec554271ccd54e7b1f6a801a4b7c407e454db8920ef64cb6f', '0fbfbc5e817ee0b5b56426078bb3b3c03468c510c824576654d975c43cdfea44',\n"
     "              '302e3cc3389ee1d11b8d23fd173353d70b381ffb4d2b3c0aca9e59056b2b3b4c', 'ff1de9c3f8e0479070c9f0d50e828625648cdf2e57996649251d86d1720c534f',\n"
     "              '7ffffda6fb658c10acdaa99154a4caae3d951f48206a111e4d304b9f7f8832a5', 'f1e9a5ccd84a7728d94b88a9c309fa398e0404692344b6ec5986e454d44e7cfc',\n"
     "              '3e6b25e220b7edeb91f41b32529497750fbf58c596fc69e64b1e33953e2d842d', 'b6773207b60dec3ae6b3177d3a416260598319819f82e813cf81c6a8025a7de0',\n"
     "              'f93ad6ee71ed52cb19ce07683288361dde93db552e50feba7f7e233b65965512', 'f3c093f82e8448cfc9490f51345121a84a4197bb712e13054775450bc39579d1',\n"
     "              '5058cef2f48aa118e5a7963fe26573b2221d3c2afcff057d241c17a2d3ab130a', 'bebbe76188cfbb6768b1c9ecb0b009c65d709a7d42a0b9e415af4bebe02fabc2',\n"
     "              '56cce468cfdf43d309f70aa4004e5c303a578e2b2fabee9b61c673893b9f8b24'}\n"
     "J180_VALIDATION = '39eb160cd3c862914b8c263837678e12f3f47cd83a364e1c4a493d15306192bc'")
must('J171_DRAWS | J173_DRAWS | J177_DRAWS', 'J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS')
must('(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION)', '(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION)')
must("spine draws and its validation draw are registered beside J171's and J173's (J177_DRAWS, J177_VALIDATION, from J177's own",
     "spine draws and its validation draw are registered beside J171's and J173's (J177_DRAWS, J177_VALIDATION, from J177's own\n"
     "# var/lab-j177-local/draws-pilot.json), and J180's beside them (J180_DRAWS, J180_VALIDATION, from lab-j180/report/draws.json, read")
# compare.py's note and header
must("BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY, DESIGN AND COPIER, THE RECORDER ALONE CHANGED: J177 (D493 population, its first night; deck seeds 2040-2052, 150 branches, the futility stop, 10 decisions) beside J181 (the same population, its second night, on D496\\'s recorder; deck seeds 2079-2091, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D496\\'s",
     "BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE COPIER CHANGED: J180 (D493 population, its second night; deck seeds 2066-2078, 150 branches, the futility stop, 10 decisions) beside J181 (D497\\'s population, its first night, on D497\\'s copier; deck seeds 2079-2091, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D497\\'s by itself: the decks differ at every position")
must("(xvii) J181 beside J177, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY, DESIGN AND COPIER, THE RECORDER ALONE CHANGED (D496)",
     "(xvii) J181 beside J180, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE COPIER CHANGED (D497)")
must("`report/compare-j180.json`; J177's column computed from its folders and report with the same code)",
     "`report/compare-j180.json`; J180's column computed from its folders and report with the same code)")
must("branch games and the wall. **A candidate, never a verdict**: the decks differ at every position, so no difference is D496's, and\n  J177's s02 carries the cascade gap D496 closes.",
     "branch games and the wall. **A candidate, never a verdict**: the decks differ at every position, so no difference is D497's by\n  itself, and J180's s11 carries the fork gap D497 closes.")

must("by D488s random seat policy on D493s copier, on new decks", "by D488s random seat policy on D497s copier, on new decks")
must("10 decisions): D493s population, NEW; never pooled with J177 or J173 (D488) nor J166-J172 (D486 or earlier seats)", "10 decisions): D497s population, NEW; never pooled with J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats)")

must("| `pool` | **`random-<band>-d497`**: D493's population, never J177's or J173's `random-<band>-d488` (`decides:`) |",
     "| `pool` | **`random-<band>-d497`**: D497's population, never J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |")
must("the pools are `random-<band>-d497` on J181's night (D493's population).", "the pools are `random-<band>-d497` on J181's night (D497's population).")

# ---------- 5. the decks table: J180's column ----------
ROWS = {
    's01': '2066 / 2166: 10, 1, 19.7 min', 's02': '2067 / 2167: 10, 3, 47.4 min', 's03': '2068 / 2168: 10, 1, 32.2 min',
    's04': '2069 / 2169: 5, 0, 11.2 min', 's05': '2070 / 2170: 10, 3, 38.0 min', 's06': '2071 / 2171: 7, 2, 21.4 min',
    's07': '2072 / 2172: 10, 4, 42.8 min', 's08': '2073 / 2173: 2, 0, 10.1 min', 's09': '2074 / 2174: 10, 0, 32.0 min',
    's10': '2075 / 2175: 1, 0, 4.4 min', 's11': '2076 / 2176: 10, 4, 38.9 min (77 branches errored, D497)',
    's12': '2077 / 2177: 10, 3, 24.7 min', 's13': '2078 / 2178: 10, 3, 113.1 min'}
must('| J177 at this position (the same seat policy, design and copier, other decks): decisions branched, confident labels, wall |',
     '| J180 at this position (the same seat policy and design, the copier changed: D497; other decks): decisions branched, confident labels, wall |')
lines = t.split('\n')
for k, row in enumerate(lines):
    m = re.match(r'^\| (s\d\d) \| (\w+) \| (\d{4}) \| (\d{4}) \| ([^|]+) \| (\d{4} / \d{4}) \| .*\|$', row)
    if m and m.group(1) in ROWS:
        lines[k] = '| %s | %s | %s | %s | %s | %s | %s |' % (m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6), ROWS[m.group(1)])
t = '\n'.join(lines)
must("(J177's numbers from `lab-j177/report/compare-j173.json`'s `this` column and `tool.json`, read only on 2026-10-31; s01-s05 ran at 6\nworkers, s06-s13 at 4 after the PC's reboot. compare.py reads all 13 again at the Report.)",
     "(J180's numbers from `lab-j180/report/compare-j177.json`'s `this` column and `tool.json`, read only on 2026-11-01; all 13 at 6\nworkers. compare.py reads all 13 again at the Report.)")

# ---------- 6. the guards ----------
must('D496_FILES="bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/PolicyControllerAi.java "',
     'D496_FILES="bridge/src/mtgtable/GameLog.java bridge/src/mtgtable/SeatRecorder.java bridge/src/mtgtable/ai/DecisionClock.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/DecisionSink.java bridge/src/mtgtable/ai/LenientGameCopier.java bridge/src/mtgtable/ai/PolicyControllerAi.java "')
must('test "$(git diff --numstat 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr \'\\t\' \' \')" = "5 0" && sc=1',
     'test "$(git diff --numstat 6e87e5d4a50e28649c9baa013f485da80a88aafd HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr \'\\t\' \' \')" = "5 0" && test "$(git diff --name-only 7a984963e61cdfe98cadfcc45fa7690a61dc37f6 HEAD -- bridge/src | LC_ALL=C sort | tr \'\\n\' \' \')" = "bridge/src/mtgtable/ai/LenientGameCopier.java " && sc=1')
must("echo \"J181: seat code: the policy J173's and J177's, the copier D493's, the recorder D496's: $sc\"",
     "echo \"J181: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's (D493's plus the paper-card carry): $sc\"")
must('for x in D481 D482 D483 D484 D485 D486 D487 D488 D489 D490 D491 D492 D493 D494 D495 D496; do',
     'for x in D481 D482 D483 D484 D485 D486 D487 D488 D489 D490 D491 D492 D493 D494 D495 D496 D497; do')
must('has-d481-d496-commits', 'has-d481-d497-commits', 0)
must('d481_d496_commits', 'd481_d497_commits', 0)
# has_d497, after has_d496's block
k = t.index('\n# the random seat\'s POLICY is J173\'s and J177\'s')
HAS497 = '''
# D497 (the names this file reads: the decision file, the lint's rule and its tag, the copier's carry and its counter, the ai-bench
# scenario and its deck, the worker flag; checked against the lane's b0cecfee; the coordinator corrects them if the merge renamed any)
ls docs/decisions/D497-*.md >/dev/null 2>&1 && grep -q 'paperCard' docs/decisions/D497-*.md && grep -q 'forge-field-write' tools/lint-bridge.sh && grep -q 'forge-field-write' tools/lint-bridge-selftest.sh && grep -q '// ALLOW paperCard write: D497' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'private void carryPaperCard(' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'public int paperCardsCarried()' bridge/src/mtgtable/ai/LenientGameCopier.java && grep -q 'fork-token-copy' tools/ai-bench/AiBench.java && test -f tools/ai-bench/decks/fork-token-copy.dck && grep -q -- '-XX:-OmitStackTraceInFastThrow' tools/cubelab/engine.ts && echo 1 > var/lab-j181-local/has-d497.txt || echo 0 > var/lab-j181-local/has-d497.txt'''
t = t[:k] + HAS497 + t[k:]
must('metrics: has_d496 = sh: cat var/lab-j181-local/has-d496.txt 2>/dev/null || echo 0',
     'metrics: has_d496 = sh: cat var/lab-j181-local/has-d496.txt 2>/dev/null || echo 0\nmetrics: has_d497 = sh: cat var/lab-j181-local/has-d497.txt 2>/dev/null || echo 0')
must('check: has_d496 == 1', 'check: has_d496 == 1\ncheck: has_d497 == 1')

# ---------- 7. the header lines ----------
lines = t.split('\n')


def setline(prefix, value):
    for k, row in enumerate(lines):
        if row.startswith(prefix):
            lines[k] = prefix + value
            return
    sys.exit('no line starts with %r' % prefix)


setline('id: ', 'J181')
setline('title: ', "The move atlas, rung 4b, night six -- J180's night carried onto the new main (D497: the fork's copy gives a re-made token its original's paper card, so a copy of a token can be made on a fork -- the shape that failed J180's s11; every lab worker keeps a hot exception's stack) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j181, at deck seeds 2079-2091 (D447 with D482's list as D490, D492 and D494 leave it, the bands cycled as J166's) and game seeds 2179-2191; a validation draw made fresh at deck seeds 2279-2291 (game seeds 2379-2391 reserved); THE FIRST NIGHT OF D497'S POPULATION, pooled with nothing before it; J180's night read beside, by position, as information")
setline('public_title: ', 'Move atlas 4b night six: 13 new spines, D497 fork fix, a new population')
setline('public_decides: ', 'None by itself; first night on the D497 copier, a new population of 13 spines')
setline('public_est: ', '~8 h to 12 h')
setline('repos: ', 'mtg-table@%s (origin/main: the merge of pc/d497-fork-token-papercard, D497, on 7a984963 (D496\'s merge, on D495\'s, D493\'s, D494\'s and D492\'s); the coordinator writes that merge\'s full sha here before posting; merged == 1, the commits that added D481-D497\'s decision files, D493\'s, D495\'s, D496\'s and D497\'s names, the seat\'s code and the deck code exactly as this file states them, checked by the pilot)' % PIN)
setline('decides: ', "nothing by itself. Rung 4b's sixth night, the fourth on D489's futility stop with the review's 150 cap, and **the FIRST of D497's population**. **What changed under the seat since J180:** the copier every branch forks on. The random seat's POLICY is D488's, as J173's, J177's and J180's, and the recorder is D496's, as J180's; **what changed is the fork** (D497): `LenientGameCopier`'s carry pass gives every token `GameCopier` re-made from its `TokenInfo` its original's paper card (a `PaperToken` for a token from a token script), field to field, before anything else it carries -- so a `CopyPermanent` effect whose original is such a token (Reflection of Kiki-Jiki, populate, Esika's Chariot and the rest) resolves on a fork as it does in the live game, where it threw NullPointerException in `CardFactory.readCard` and errored the branch (J180's s11, 77 of 4,875). A forked token now answers `getRules()` with its script's rules where it answered null, and Forge's AI reads those, so a branch's play after a token appears may differ from the same seed's play before D497 -- toward the live game's. `git diff 7a984963 <pin> -- bridge/src` is exactly `LenientGameCopier.java`, and `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (a pilot check, `seat_code`; `identity == 1` stays the real check). **Comparability, the rule this night follows:** D489 pools nights across a change to HOW MANY branches a decision gets, and says \"A future change to the seat or to what it offers does\" open a new population; D493 opened J177's population when the copier changed what a branch plays, and D497 changes it again. So **J181's labels and reads are D497's population's first night: pooled with nothing -- a new `pool`, `random-<band>-d497`, a new `randomSeat: \"D497\"`; never with J177's and J180's v6 rows (D493's population) nor J173's v5 rows (D488's) nor anything before them**; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- the first read of this population, J177's 0 of 12 and J180's 0 of 14 beside it as information, with the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46 as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J180's at the same position (other decks, the same seat policy, the same branching design, the copier changed): a candidate, never a verdict**; and, by hand at the morning read, D497's two field signals -- no branch errored with `paperCard` in its stack, and no bare exception (a `branch error, stack:` line followed by nothing) in any worker log, which the new flag makes impossible")
setline('hypothesis: ', "none to confirm about the maps. Registered expectations, as information: **the problem class that failed J180 does not recur, J177's did not recur on J180, and J176's four stay away** -- a `CopyPermanent` effect choosing a token on a forked board resolves (D497: the carry gives the re-made token its paper card; the `fork-token-copy` scenario fails on main's copier and passes on the pin's), and every errored branch, if any, names its site in the worker log (D497's `-XX:-OmitStackTraceInFastThrow`); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496; J180 met no such decision, J177's two logs pass); no deck holds a Prepare card or Ob Nixilis, the Adversary (D492, D494; `deck_code`); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes (D495) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap no atlas has met (the check fails the night then, as it failed J180's and J177's on one problem each and J176's on 22); the rule reads ~105-120 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J180: 105 read, 29 stopped, 14 controls, 0 partial rows confident; J177: 121, 29, 12, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J180's and J177's (read beside, not predicted); J180's yield, 24 confident of 76 labels, 0.551 confident labels a worker-hour on 43.6 worker-hours, and J177's 0.563 on 53.3 are another population's and are read beside, never predicted; the walls ~7.5 h at 6 workers for all 13 at J180's pace (26,149 s of walls, 26,206 s from its first spine's start to its last's end; *Sizing*)")
setline('est: ', "~9 h at 6 workers (range 6-12 h; sizing below): pilot ~40 min (J173's ~35 plus the readers' self-tests, the cap read on J171's night ~1 min); the 13 spines ~7.5 h at J180's pace (13 x ~34 min; J180's ran 4.4 to 113.1 min); the scan ~6 min; the report ~5 min. Disk ~11-15 GB on the lab data folder /home/justin-a/code/lab/data (J171's 13 spines: 12.4 GB)")
t = '\n'.join(lines)
# the rule line: add D497
must("and D496 (the seat's log records what the engine revealed to it; the checker accepts an option revealed in the step); D447 (the deck draw). Pre-registered here, before any J181 data: J177's label contract v6",
     "D496 (the seat's log records what the engine revealed to it; the checker accepts an option revealed in the step) and D497 (the fork's copy gives a re-made token its original's paper card: the population J181 opens; every lab worker keeps a hot exception's stack); D447 (the deck draw). Pre-registered here, before any J181 data: J177's label contract v6")
must("the comparison with J177 by compare.py, all exactly as written in the pilot", "the comparison with J180 by compare.py, all exactly as written in the pilot")

# ---------- 8. the "Before posting" items and the pooling prose ----------
must("1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j181` already exists (made 2026-11-01 02:30 EST, empty when this was\n   drafted).",
     "1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j181` already exists (made 2026-11-01 11:20 EST, empty when this was\n   drafted).")
i, j = between('2. **The pin is written:**', '3. **If D496')
t = t[:i] + "2. **The pin is written:** `%s`, the merge of `pc/d497-fork-token-papercard` on origin/main (2026-11-01, gated on the merged\n   tree from a deleted `bridge/out`; the line is in the merge commit's message). `runner.sh check` would not catch a placeholder here; it\n   is written by hand from `git rev-parse` of the pushed merge, and `grep -c PIN_SHA` on this file must print 0 before posting.\n" % PIN + t[j:]
i, j = between('3. **If D496', '4. **J177 has ended**')
t = t[:i] + '''3. **If D497's merge renamed or changed anything this file reads, correct it before posting** (drafted against the lane's b0cecfee in
   `/home/justin-a/code/mtg-table-d497`, on main's 7a984963): the decision file `docs/decisions/D497-fork-token-paper-card.md`, the lint
   rule `forge-field-write` in `tools/lint-bridge.sh` and its cases in `tools/lint-bridge-selftest.sh`, the tagged line
   `// ALLOW paperCard write: D497`, `carryPaperCard(` and `paperCardsCarried()` in `LenientGameCopier.java`, the `fork-token-copy`
   scenario in `tools/ai-bench/AiBench.java` with `tools/ai-bench/decks/fork-token-copy.dck`, and `-XX:-OmitStackTraceInFastThrow` in
   `tools/cubelab/engine.ts` (the pilot's `has_d497` grep). **The merge changes `bridge/src` in exactly `LenientGameCopier.java` and nothing
   under `fixtures/cubelab/seat-identity.json`, `tools/cubelab/deckcensus.ts`, `cubes/library/` or `tools/cubelab/engine-unplayable.json`**
   (`git diff 7a984963 <pin> --stat`), and `seat_code` below accepts exactly that; if the merge differs, re-derive the guard from the new
   diff and write here what it now accepts -- never loosen it to pass. D496's names (its item 3 on J180) are checked unchanged by `has_d496`.
''' + t[j:]
i, j = between('4. **J177 has ended**', '5. **`--decisions` stays 10.**')
t = t[:i] + '''4. **J180 has ended** (failed on `atlas.problems == 0` alone, 1 problem, its Report written: `lab-j180/report/labels.json`, `reads.json`,
   `compare-j177.json` and the rest). J181 reads lab-j180 read-only, for its J180 columns; nothing waits on another job, so there is
   **no `after:` line**. J180's job file needs nothing.
''' + t[j:]
must("5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J181 compares with J177 position by position, and a\n   second change beside the new decks would make every difference ambiguous between the two.",
     "5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J181 compares with J180 position by position, and a\n   second change beside the new decks and the new copier would make every difference ambiguous among the three.")
must("6. **Nothing else to make, move or clean.** J181 reads lab-j170 (J171's night), lab-j177 (J177's), lab-j162 and lab-j158 for its",
     "6. **Nothing else to make, move or clean.** J181 reads lab-j170 (J171's night), lab-j180 (J180's), lab-j162 and lab-j158 for its")
must("constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read by this draft on 2026-10-31), so it reads no\n   `var/lab-j17x-local/` folder but its own. Post nothing that writes lab-j177 or lab-j181 beside J181.",
     "constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, and J180's from\n   `lab-j180/report/draws.json`, read by this draft on 2026-11-01), so it reads no `var/lab-j1xx-local/` folder but its own. Post nothing\n   that writes lab-j180 or lab-j181 beside J181.")
# the control-share choice and the "So J181 is" paragraph
must("count D493's population holds is J177's 12 before tonight; with tonight's ~10-12 it is the first pooled read of two nights, still\n  too few to read on its own; 0.25 holds until the pooled count can carry the read.",
     "count D497's population holds is 0 before tonight (D493's holds J177's 12 and J180's 14, 0 of 26 confident, read beside); ~10-14\n  controls a night is too few to read on its own; 0.25 holds until this population's pooled count can carry the read.")
i, j = between('**So J181 is D493\'s population\'s second night, on new spines**', '**The seeds are new**')
t = t[:i] + '''**So J181 is D497's population's first night, on new spines** (`decides:`): the seat's policy is D488's and the recorder D496's, as
J180's; the copier changed (D497), so J181's labels pool with nothing before them -- `pool: random-<band>-d497`, contract v6. **Breadth
over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's, so s01 is pauper and s13 pauper again), into a new
folder. **J180's numbers are a comparison by position, never a baseline**: s01 beside s01 is the same band, the same seat policy and the
same branching design, but other decks, other seeds and the copier before D497 -- every difference is a candidate, and none can be put on
D497 by itself. J177's, J173's and J171's nights stay other populations and appear only in the readers' self-tests, their registered
expectations and J177's sizing paragraph.

''' + t[j:]
must("**Sizing: J177's, unchanged.** J177 measured the design:",
     "**Sizing: J177's, unchanged; J180's walls beside it.** J180's 13 spines, all at 6 workers, took 26,149 s of walls (7.3 h; 4.4 to 113.1\nmin a spine, s13 the longest), 43.6 worker-hours, 53,570 branch rows, 105 decisions branched (8.08 a spine). J177 measured the design:")
# the futility read's pooled inputs
must("**This night's numbers are the FIRST contribution\n  to D493's population's pooled read** (`pooledInputs`); J177's 1 of 6 (D488's population) is read beside, as information, never added.",
     "**This night's numbers are the FIRST contribution\n  to D497's population's pooled read** (`pooledInputs`); J177's 0 of 12 and J180's 0 of 14 (D493's population) are read beside, as\n  information, never added.")
must("ANOTHER POPULATION -- the copier before D493 -- the same design, other decks: 0.85 a worker-hour, 59.6 a 7-worker night)",
     "ANOTHER POPULATION -- the copier before D497 -- the same design, other decks: 0.551 a worker-hour on 43.6 worker-hours; J177's 0.563)")
must("as information: J177's** (read from `lab-j177/report/labels.json` at the Report, `--j180=`;",
     "as information: J180's** (read from `lab-j180/report/labels.json` at the Report, `--j180=`;")
# labels.py's header comment
i, j = between("# J181 (drafts/J181-atlas-4b-night-six.md): J177's labels.py (contract v6", "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py")
t = t[:i] + '''# J181 (drafts/J181-atlas-4b-night-six.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J181 data. What changes: nothing in the rows. J181 is D497's population's first night (D497 changed the copier, and with it
# what a branch plays), so its rows pool with NOTHING before them (D493, Comparability): --seat= defaults to "D497" (the self-test on
# J171's night still passes --seat=D486), the Report names the pools `random-<band>-d497`; and the sizing read's beside-column is J180's
# (--j180= LABELS_JSON: its c_sizingRead and per-worker-hour yield, ANOTHER POPULATION's second night, as information; null when absent).
# Every field, read and definition otherwise J177's, unchanged; the scan stamp `J181 v5`.
''' + t[j:]
# compare.py's header comment
i, j = between("# J181 (drafts/J181-atlas-4b-night-six.md): each spine's numbers beside J177's AT THE SAME POSITION", "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's")
t = t[:i] + '''# J181 (drafts/J181-atlas-4b-night-six.md): each spine's numbers beside J180's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J181 data. DIFFERENT DECKS (J180: deck seeds 2066-2078, game seeds 2166-2178; J181: 2079-2091, 2179-2191; the same band at
# each position), THE SAME SEAT POLICY (D488's) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions),
# and ANOTHER COPIER (D497's: the re-made token's paper card): J180 and J181 are two populations. A difference is a candidate, never a
# verdict, no position is a pair, and no difference is D497's by itself (the decks differ everywhere; J180's s11 carries the fork gap
# D497 closes). J177's compare.py, unchanged but for its note: `this` is J181, `before` J180, read from lab-j180 at the Report (read only).
''' + t[j:]
# the j180 information metric's comment
must("# J177's night, read only, as information (it ended 2026-10-31, its report written): what compare.py and labels.py's c_sizingRead will\n# read at the Report (THE SAME POPULATION's first night: pooled)",
     "# J180's night, read only, as information (it ended 2026-11-01, its report written): what compare.py and labels.py's c_sizingRead will\n# read at the Report (ANOTHER POPULATION's second night: beside, never pooled)")
must("# J177's night, read only, for the J177 columns (compare.py) and J177's sizing read (labels.py --j180): ANOTHER POPULATION, read beside,",
     "# J180's night, read only, for the J180 columns (compare.py) and J180's sizing read (labels.py --j180): ANOTHER POPULATION, read beside,")
# the Report's summary prose
must("2079-2091, game seeds 2179-2191) branched by J181 at the pin, by D488's random seat policy forking on D493's copier, the SECOND\n  night of D493's population**: `training: true`, `pool: random-<band>-d497`, `randomSeat: \"D497\"`, contract v6 with `branchRandom: 150`\n  and the partial rows marked; **pooled with J177's rows (the same pool and randomSeat; D496 changed the recorder, not a decision), never\n  with J173's rows nor anything before** (D493, Comparability, quoted: \"search-v2 results and atlas maps from before and after D493 are\n  not pooled\"; D489's \"A future change to the seat or to what it offers does\", quoted -- a log line does neither).",
     "2079-2091, game seeds 2179-2191) branched by J181 at the pin, by D488's random seat policy forking on D497's copier, the FIRST\n  night of D497's population**: `training: true`, `pool: random-<band>-d497`, `randomSeat: \"D497\"`, contract v6 with `branchRandom: 150`\n  and the partial rows marked; **pooled with nothing before: not J177's and J180's rows (D493's population: the copier before D497), not\n  J173's nor anything older** (D493, Comparability, quoted: \"search-v2 results and atlas maps from before and after D493 are not\n  pooled\"; D489's \"A future change to the seat or to what it offers does\", quoted -- a copier that changes what a branch plays does).")
must("J177's four gaps stayed closed**: no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a\n  Plotted or Foretold cast, no checker failure on a spell copy on the stack (the stats line's `spell copies on the stack=` count, per\n  spine, as information).",
     "J180's gap and J177's stayed closed**: no branch errored with `paperCard` in its stack and no bare exception in any worker log\n  (D497), no checker failure on a cascade's \"cast it?\" inside a held frame (D496; the stats line's `revealed to the seat` count, per\n  spine, as information), no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or\n  Foretold cast, no checker failure on a spell copy on the stack.")
must("beside it **J177's** (0.85 a worker-hour, 59.6\n  [40.2, 85.1] a 7-worker night; another population: the copier before D493, other decks, two spines lost to crashes) and **the review's\n  ~46 [41, 51]**.",
     "beside it **J180's** (0.551 a worker-hour, 38.5 a 7-worker night; another population: the copier before D497, other decks) and\n  **J177's** (0.563) and **the review's ~46 [41, 51]**.")
must("**Say that this\n  is the first night of D493's population's pooled read** (`pooledInputs`), that J177's 1 of 6 is D488's population's and is not added\n  in, and that ~10 controls cannot tell .04 from .2.",
     "**Say that this\n  is the first night of D497's population's pooled read** (`pooledInputs`), that J177's 0 of 12 and J180's 0 of 14 are D493's\n  population's and are not added in, and that ~10-14 controls cannot tell .04 from .2.")
must("beside the review's 54%, 68% and 87% and J177's own (its `ncurve.json`);", "beside the review's 54%, 68% and 87% and J180's and J177's own (their `ncurve.json`);")
must("spine (10 asked; branched, branched in full, partial) against J177's 8.46**.", "spine (10 asked; branched, branched in full, partial) against J180's 8.08 and J177's 9.31**.")
must("and for the night beside J177's (0.35%; and J171's 0.53%)", "and for the night beside J180's (0.10%), J177's (0.35%) and J171's (0.53%)")
must("with J177's values at the same positions beside\n  (another population, other decks);", "with J180's values at the same positions beside\n  (another population, other decks);")
must("- **J181 beside J177, by position** (`compare-j180.json`):", "- **J181 beside J180, by position** (`compare-j180.json`):")
must("the confident share, mean regret at Forge's choice, capped share and wall; **labelled: different decks, the same seat policy and\n  design and copier, the recorder alone changed (D496), J177's s02 carrying the cascade gap; a candidate, never a verdict** -- no\n  difference is D496's.",
     "the confident share, mean regret at Forge's choice, capped share and wall; **labelled: different decks, the same seat policy and\n  design, the copier changed (D497), J180's s11 carrying the fork gap; a candidate, never a verdict** -- no difference is D497's by\n  itself.")
must("(against J177's, and the ~7 h at 6 workers *Sizing* expected)", "(against J180's, and the ~7.5 h at 6 workers *Sizing* expected)")
must("the spine folders kept for rung 4).", "the spine folders kept for rung 4).")

if FAIL:
    print('\n'.join(FAIL)); sys.exit(1)
open(DST, 'w').write(t)
print('shifted', dict(sorted(shifted.items())))
print('lines', n0, '->', len(t.splitlines()))
print('PIN placeholders', t.count(PIN))

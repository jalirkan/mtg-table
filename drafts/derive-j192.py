#!/usr/bin/env python3
"""Derive J192's job file from J191's, by derive-j183.py's three-trap rule (derive-j191.py's shape, one step on, and the pin moved by one
checker merge):
(1) rename only the job's own name (J191 -> J192), then move the comparison night (J190 -> J191) on what is left -- J190 stays J190
wherever it names D508's population's FOURTH night (pooled, not compared), and J188, J187 and J186 stay theirs everywhere (the third,
second and first nights, history since J191, J190 and J188): every J190-as-history sentence is a hand edit, stashed before the renames;
(2) shift the four seed ranges INCLUSIVE OF THEIR BASES, [2900, 2913], [3000, 3013], [3100, 3113] and [3200, 3213], by BASE - 2900 (+703
at the default base 3603: J191's block to J192's; every base from 2913 to 3602 holds a value already used in some role -- a four-digit
run that is not part of a longer digit run, decimals and hex fragments counted -- in pc-jobs' jobs/, the drafts' *.md and *.py (this
script and its output excepted) or the data folder's names, and 3603 is the first that holds none; section E scans them all), skipping
any number touching a letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints
every change). THE BASES ARE SEEDS TOO: J191's file builds its seeds as `2900 + k`, `3000 + k`, `3100 + k` (Python's SP, VA and SPINES)
and `$((2900 + K))`, `$((3100 + K))` (the pilot's draw loop), so a range that starts at the first seed leaves every computed seed J191's --
J189 posted exactly that and failed at its pilot on `draws.newDraws13 = 0`. A hard guard after the assembly (section 6b) greps the file
for every token of J188's, J189's, J190's and J191's four families, [2465, 2491], [2565, 2591], [2665, 2691], [2765, 2791], [2816, 2829],
[2916, 2929], [3016, 3029], [3116, 3129], [2900, 2913], [3000, 3013], [3100, 3113] and [3200, 3213], and fails unless each line holding
one is on the explicit allow list (history, the comparison column, the seeds paragraph); and it asserts that the pilot's SP, VA and
SPINES and every `--seed $((` carry the new bases;
(3) change registered strings only on purpose, each one named here. THE GLOBS: J192's game seeds are 37xx, so every lab-j192 glob still
reads `b-s??-*-3???` (J191's, but its folder); the pilot's read of lab-j191 (J191's game seeds 3001-3013) reads `b-s??-*-30??`; and
compare.py's one glob over both nights reads `b-s??-*-3???` (both nights' game seeds are 3xxx, so J191's `[23]???` goes). NO NEW METRIC
LINE: D479's `exileLinksLost`, non-zero for the first time in this population on J191 (s01 5,880 branch rows, s03 350), is already
counted by metrics.py (`atlas.exileLinksLostBranches`, `atlas.exileLinksLostLinks`); J192 names it as information per spine in `decides:`
(the morning read's by-hand list), `hypothesis:` and the summary -- never a check, never a seat-queue row.
THE PIN MOVES, BY ONE CHECKER MERGE: J192's pin is main's head 1d0d18f3, the merge of D513 (A3's revealed top card is the zone's player's,
not the controller field's: J191's s08 failure, a checker misread). The pin given must be main's head, on origin/main, a descendant of
J191's registered pin fe063f94, and `git diff fe063f94 <pin>` must name ONLY D513's files (ALLOW513 below: the checker, its self-test, the
fixture generator, its fixtures, its decision file, the cube-lab evidence, PLAN.md and tools/CLAUDE.md) -- checker, fixtures and docs,
free under D509 point 1, as D512 was -- so D509's frozen set, the deck code, the seat, its record, the replay and the determinizer are
J191's byte for byte, and every pin-decided line of J191's pilot (the `seat_code` test, the `deck_code` values, the D505-D512 name checks,
the D481-D512 commit check) is recomputed at the new pin exactly as derive-j188.py to derive-j191.py computed it and asserted EQUAL to
J191's line, and to J190's, byte for byte (but its folder and stamp). The pilot gains no line: D513's names are checked here, at the pin
(its decision file and commit, its four controls with their self-test verdicts, `revealedTopsOf` in the checker), the checker at the pin
is run on J191's two s08 logs (both must pass) and its self-test is run on the pin's tree (it must pass); J192's own pilot runs that
self-test again (`redaction_self`).
J192 is D508's population's SIXTH night (`random-<band>-d508`, `randomSeat: "D508"`, unchanged), its labels pooled with J186's twelve
finished spines and J187's, J188's, J190's and J191's thirteen each. J191 FAILED its last check, `atlas.problems == 0` (got 1: s08's two
logs), on a checker misread and not on a leak (D513, which says its thirteen spines stand), so J191 is POOLED; its STATUS is asserted as
what it is (`failed`, the one FAIL line), never as `done`. J191's night is read beside, by position (compare-j191.json). J189 failed at
its pilot and is never a night to pool or compare; its block is spent.
EVERYTHING THE PIN DECIDES IS COMPUTED FROM THE PIN WITH GIT, never typed, and the derivation then RUNS the pilot's own has_*, seat_code,
commit, golden and deck_code lines against the pin (a `git archive` of it in the scratchpad, `git -C` on the main checkout read-only, HEAD
read as the pin) and requires every one to print 1.
J191's night is read only (lab-j191, results/J191); so are J190's report (lab-j190, results/J190: history now, and the pool), J188's
(lab-j188), J187's (lab-j187), J186's by-hand report and its --times rerun (the scratchpad), and J187's posted job file (J187's seat_code
line, recomputed at J187's pin).

  python3 derive-j192.py <pin>     writes drafts/J192-atlas-4b-night-fifteen.md, prints the audit, runs the runner's check
Exit 0: written, every expectation of the final pin met, the checker clean. Exit 3: written, but the pin misses an expectation: NOT
POSTABLE. Exit 1: nothing written (a stash or a computation failed). Exit 2: written, the checker not clean."""
import fnmatch, glob, hashlib, json, math, os, re, shutil, subprocess, sys
from collections import Counter
from datetime import datetime

REPO = '/home/justin-a/code/mtg-table'
JOBS = '/home/justin-a/code/mtg-table-pcjobs/jobs/'
SRC = JOBS + 'J191-atlas-4b-night-fourteen.md'
SRC190 = JOBS + 'J190-atlas-4b-night-thirteen.md'              # read only: J190's pin-decided lines, which J191's equal
SRC187 = JOBS + 'J187-atlas-4b-night-eleven.md'                # read only: J187's seat_code line, recomputed at J187's pin
DST = '/home/justin-a/code/pc-results/drafts/J192-atlas-4b-night-fifteen.md'
RUNNER = '/home/justin-a/code/mtg-table/tools/runner.sh'      # the main checkout's (the brief: never run anything under ~/code/lab)
L191 = '/home/justin-a/code/lab/data/lab-j191'                # read only: J191's night, the comparison
R191 = '/home/justin-a/code/pc-results/results/J191'          # read only
L190 = '/home/justin-a/code/lab/data/lab-j190'                # read only: J190's report, history now (the pool's fourth night)
R190 = '/home/justin-a/code/pc-results/results/J190'          # read only
L188 = '/home/justin-a/code/lab/data/lab-j188'                # read only: J188's report, history
R188 = '/home/justin-a/code/pc-results/results/J188'          # read only
L187 = '/home/justin-a/code/lab/data/lab-j187'                # read only: J187's report, history
SCR = '/tmp/claude-1000/-home-justin-a-code-mtg-table/8723af12-0157-421e-988a-473182e5a3f1/scratchpad'
BYHAND186 = SCR + '/j186/report/labels.json'                  # the coordinator's by-hand report of J186 (derive-j187.py's)
TIMES186 = SCR + '/j187/times/labels.json'                    # labels.py with --times on lab-j186 (derive-j187.py's rate)
SCRJ = SCR + '/j192'                                          # this derivation's scratch: the pin's tree and the pilot's lines run on it
PREV = 'e557dedfa7cf67803ba0ba362655a2120ea8f83a'   # J186's pin: D508's merge, the population's opening pin (the frozen set's base)
PREV187 = '43043fe59a1c0d51d7628a0212d34af2a11e0445'  # J187's pin: D509's merge (docs only)
PREV2 = '0a6cf5c1ec05f03ca27d34af1b529a5e72646cea'  # J185's pin (the merge of D505-D507)
PREV3 = '3275af30498e91c03d652d021685d9847b62d95f'  # J183's pin (the merge of D502-D504)
J182PIN = 'ac07876b97e052b3e0ddd530a1930173e998133c'
FROZEN509 = 'bridge/src tools/cubelab/CubeLab.java fixtures/cubelab/seat-identity.json forge-home/'   # D509 point 1, by path (J187's test)
FROZEN = 'bridge/src tools/cubelab fixtures/cubelab/seat-identity.json forge-home/'                  # what J188's to J191's test reads, wider
# THE CONTRACT (derive-j188.py's to derive-j191.py's, unchanged): what the frozen set may have changed by since J186's pin, file by file,
# (added, deleted, the decision). Typed on purpose: a pin whose diff is anything else fails the derivation and the job's own seat_code line.
ADMIT = {'bridge/src/mtgtable/SelectionSelfTest.java': ('2', '1', 'D510'), 'bridge/src/mtgtable/ai/Decision.java': ('4', '4', 'D510'),
         'bridge/src/mtgtable/ai/DecisionSelfTest.java': ('64', '13', 'D510'), 'bridge/src/mtgtable/ai/Decisions.java': ('47', '12', 'D510'),
         'tools/cubelab/CubeLab.java': ('68', '1', 'D511'), 'tools/cubelab/atlas.ts': ('49', '1', 'D511')}
ADMIT_BRIDGE = sorted(f for f in ADMIT if f.startswith('bridge/src/'))
ADMIT_STR = ''.join(x.replace('\t', ' ') + ' ' for x in sorted('%s\t%s\t%s' % (v[0], v[1], k) for k, v in ADMIT.items()))   # LC_ALL=C sort's order
# THE PIN'S MOVE (D513): every path `git diff <J191's pin> <pin>` may name, as an exact path or a glob. Typed on purpose: a pin whose diff
# names anything else is not J191's seat with D513's checker, and the derivation stops.
ALLOW513 = ['tools/check-redaction.mjs', 'tools/check-redaction-selftest.mjs', 'tools/make-negative-fixtures.mjs', 'fixtures/negative/redaction/*',
            'docs/decisions/D513-*.md', 'docs/evidence/cube-lab.md', 'PLAN.md', 'tools/CLAUDE.md']
D513FIX = [('a3-revealed-top-during-a-control-exchange.jsonl', 'pass'), ('a3-two-cards-during-a-control-exchange.jsonl', 'fail'),
           ('a3-revealed-top-the-frame-after-the-exchange.jsonl', 'fail'), ('a3-revealer-in-the-viewer-zone-controlled-by-the-opponent.jsonl', 'fail')]


def git(*a, ok=False):
    r = subprocess.run(['git', '-C', REPO] + list(a), capture_output=True, text=True)
    if r.returncode and not ok:
        sys.exit('git %s: %s' % (' '.join(a), r.stderr.strip()))
    return r.stdout if not ok else (r.returncode, r.stdout)


if len(sys.argv) < 2 or not re.fullmatch(r'[0-9a-f]{7,40}', sys.argv[1]):
    sys.exit('usage: derive-j192.py <pin> [--base N] [--dst FILE]   (a sha of mtg-table, short or full)')
# the deck-seed BASE: the block is deck seeds BASE+1..BASE+13, game seeds +100, validation deck seeds +200, reserved validation game
# seeds +300 -- J191's file's own four families (2900 + k, 3000 + k, 3100 + k, and 3201-3213 reserved). The default, 3603, is the first
# base past J191's whose 52 values are all unused in any role in pc-jobs' jobs/ (HEAD), the drafts' *.md and *.py (this script and its
# output excepted) and the data folder's names -- a value counts as used wherever it stands as a four-digit run that is not part of a
# longer digit run, decimals and hex fragments included. Section E rescans every base from 2913 to BASE and requires BASE to be the first
# clean one. --base exists so the block can be moved without editing this file (and then section E says whether the moved block is clean).
BASE = int(sys.argv[sys.argv.index('--base') + 1]) if '--base' in sys.argv else 3603

if '--dst' in sys.argv:
    DST = sys.argv[sys.argv.index('--dst') + 1]
J191B = 2900                                                        # J191's base: used (lab-j191)
SHIFT = BASE - J191B
J190B = 2816                                                        # J190's base: used (lab-j190)
J189B = 2478                                                        # J189's posted base: spent (pc-jobs 005d0e25)
J188B = 2465                                                        # J188's base: used (lab-j188)
assert SHIFT >= 13, 'the block must be past J191\'s'


def rng(lo, hi):
    return '%d-%d' % (lo, hi)


DECK_R, GAME_R, VAL_R, RES_R = (rng(BASE + o + 1, BASE + o + 13) for o in (0, 100, 200, 300))
D191_R, G191_R, V191_R, X191_R = (rng(J191B + o + 1, J191B + o + 13) for o in (0, 100, 200, 300))
D190_R, G190_R, V190_R, X190_R = (rng(J190B + o + 1, J190B + o + 13) for o in (0, 100, 200, 300))
BLOCK = [BASE + o + k for o in (0, 100, 200, 300) for k in range(1, 14)]
PIN = git('rev-parse', '--verify', sys.argv[1] + '^{commit}').strip()
P8 = PIN[:8]
SRC_T = open(SRC).read()
SRC190_T = open(SRC190).read()
SRC187_T = open(SRC187).read()
m = re.search(r'^repos: mtg-table@([0-9a-f]{40}) ', SRC_T, re.M)
if not m:
    sys.exit('derive-j192: no pin in J191\'s repos: line')
J191PIN = m.group(1)
J191P8 = J191PIN[:8]
m = re.search(r'^repos: mtg-table@([0-9a-f]{40}) ', SRC190_T, re.M)
J190PIN = m.group(1) if m else None
if PIN == J191PIN:
    sys.exit('derive-j192: the pin %s is J191\'s: J192 is J191\'s night on D513\'s merge, which J191\'s pin lacks' % P8)
for base, who in ((PREV, "J186's"), (PREV187, "J187's"), (J191PIN, "J191's")):
    if git('merge-base', '--is-ancestor', base, PIN, ok=True)[0] != 0:
        sys.exit('derive-j192: %s pin %s is not an ancestor of %s' % (who, base[:8], P8))
EXPECT = []    # (what the final pin must show, met?)
SOFT = []      # reported, never failed


def expect(what, ok):
    EXPECT.append((what, bool(ok)))


MAIN = git('rev-parse', 'main').strip()
MOVED = sorted(x for x in git('diff', '--name-only', J191PIN, PIN).splitlines() if x)
MOVED_OUT = [f for f in MOVED if not any(fnmatch.fnmatch(f, p) for p in ALLOW513)]
MOVED_COMMITS = [x for x in git('log', '--no-merges', '--format=%h %s', J191PIN + '..' + PIN).splitlines() if x]
MOVED_MERGES = [x for x in git('log', '--merges', '--format=%h %s', J191PIN + '..' + PIN).splitlines() if x]
expect('J191\'s pin %s is J190\'s too (%s): the pin J192 moves from' % (J191P8, (J190PIN or 'none')[:8]), J191PIN == J190PIN)
expect('main\'s head is the pin (main %s): D513\'s merge, nothing after it' % MAIN[:8], MAIN == PIN)
expect('`git diff %s %s` names ONLY D513\'s files, the checker, its fixtures and docs (%d files%s)'
       % (J191P8, P8, len(MOVED), '' if not MOVED_OUT else '; OUTSIDE THE LIST: ' + ', '.join(MOVED_OUT)), MOVED and not MOVED_OUT)
expect('every non-merge commit since %s is D513\'s (%d: %s), and the one merge is D513\'s (%s)'
       % (J191P8, len(MOVED_COMMITS), ', '.join(x.split()[0] for x in MOVED_COMMITS), ', '.join(x.split()[0] for x in MOVED_MERGES)),
       MOVED_COMMITS and all(re.match(r'[0-9a-f]+ D513[:,]', x) for x in MOVED_COMMITS) and len(MOVED_MERGES) == 1 and 'D513' in MOVED_MERGES[0])
expect('the frozen set (%s) and the deck code are byte for byte J191\'s pin\'s at the pin' % FROZEN,
       git('diff', '--quiet', J191PIN, PIN, '--', *FROZEN.split(), 'tools/cubelab/deckcensus.ts', 'tools/cubelab/engine-unplayable.json', 'cubes/library/', ok=True)[0] == 0)

# ======================================================================================================================================
# A. computed from the pin: the seat code (D509's frozen set since J186's pin: exactly D510's and D511's admitted changes; J191's line =
# J190's = J188's)
# ======================================================================================================================================
def names(base, path='bridge/src', at=None):
    return sorted(x for x in git('diff', '--name-only', base, at or PIN, '--', *path.split()).splitlines() if x)


def numstat(base, path='bridge/src', at=None):
    return ''.join(l.replace('\t', ' ') + ' ' for l in sorted(x for x in git('diff', '--numstat', base, at or PIN, '--', *path.split()).splitlines() if x))


def numrows(s):      # 'a d path a d path ' -> {path: 'a d'}
    w = s.split()
    return {w[k + 2]: '%s %s' % (w[k], w[k + 1]) for k in range(0, len(w), 3)}


def shlist(xs):      # what `... | LC_ALL=C sort | tr '\n' ' '` prints
    return ''.join(x + ' ' for x in sorted(xs))


B480, B6E8, B7A9 = '480c837d7783d2fbe1a727143dc6069344dc9bf4', '6e87e5d4a50e28649c9baa013f485da80a88aafd', '7a984963e61cdfe98cadfcc45fa7690a61dc37f6'
PUSHED = git('merge-base', '--is-ancestor', PIN, 'origin/main', ok=True)[0] == 0
expect('the pin is on origin/main (pushed: the runner\'s clone fetches from GitHub)', PUSHED)
NUM_FROZEN = git('diff', '--numstat', PREV, PIN, '--', *FROZEN.split())
GOT = {l.split('\t')[2]: (l.split('\t')[0], l.split('\t')[1]) for l in NUM_FROZEN.splitlines() if l}
WANT = {k: v[:2] for k, v in ADMIT.items()}
DIFF_ADMIT = sorted(set(GOT.items()) ^ set(WANT.items()))
expect('the frozen set (%s) since J186\'s pin e557dedf is EXACTLY D510\'s four files and D511\'s two at their registered numstat%s'
       % (FROZEN, '' if not DIFF_ADMIT else ': differs in ' + '; '.join('%s %s/%s' % (f, a, d) for f, (a, d) in DIFF_ADMIT)), not DIFF_ADMIT)
expect('the job\'s own numstat string, from git at the pin, is the registered one', numstat(PREV, FROZEN) == ADMIT_STR)
expect('fixtures/cubelab/seat-identity.json and forge-home/ are unchanged since e557dedf',
       git('diff', '--quiet', PREV, PIN, '--', 'fixtures/cubelab/seat-identity.json', 'forge-home/', ok=True)[0] == 0)
FROZEN_COMMITS = [x for x in git('log', '--no-merges', '--format=%h %s', PREV + '..' + PIN, '--', *FROZEN.split()).splitlines() if x]
expect('every non-merge commit that touched the frozen set since e557dedf is D510\'s or D511\'s (%d: %s)'
       % (len(FROZEN_COMMITS), ', '.join(x.split()[0] + ' ' + x.split()[1] for x in FROZEN_COMMITS)),
       FROZEN_COMMITS and all(re.match(r'[0-9a-f]+ D51[01][:,]', x) for x in FROZEN_COMMITS))
for f, (_, _, dn) in ADMIT.items():
    cs = [x for x in git('log', '--no-merges', '--format=%s', PREV + '..' + PIN, '--', f).splitlines() if x]
    expect('%s since e557dedf: changed by %s\'s commits only (%d)' % (f, dn, len(cs)), cs and all(x.startswith(dn) for x in cs))
LAB_SINCE = names(PREV, 'tools/cubelab fixtures/cubelab')
LAB_WANT = ['fixtures/cubelab/atlas-replay/pauper-2452-A.dck', 'fixtures/cubelab/atlas-replay/pauper-2452-B.dck', 'tools/cubelab/CubeLab.java', 'tools/cubelab/atlas.ts']
expect('tools/cubelab and fixtures/cubelab since e557dedf are D511\'s four files (CubeLab.java, atlas.ts and the replay leg\'s two decks)', LAB_SINCE == LAB_WANT)
expect('J187\'s pin had D509\'s frozen set unchanged since e557dedf (J187\'s own test, again)',
       git('diff', '--quiet', PREV, PREV187, '--', *FROZEN509.split(), ok=True)[0] == 0)


def seat_test(at):
    s480, s6e8, s7a9, sac0, s327, s0a6 = (names(b, at=at) for b in (B480, B6E8, B7A9, J182PIN, PREV3, PREV2))
    num327, num0a6 = numstat(PREV3, at=at), numstat(PREV2, at=at)
    spnum = ' '.join(git('diff', '--numstat', B6E8, at, '--', 'bridge/src/mtgtable/ai/SearchPolicy.java').split('\t')[:2]).strip()
    line = 'SEAT_480="%s"' % shlist(s480)
    test = (f'''  test "$(git diff --name-only {B480} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "$SEAT_480" && test "$(git diff --name-only {B6E8} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s6e8)}" && test "$(git diff --numstat {B6E8} HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr '\\t' ' ')" = "{spnum}" && test "$(git diff --name-only {B7A9} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s7a9)}" && test "$(git diff --name-only {J182PIN} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(sac0)}" && test "$(git diff --name-only {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s327)}" && test "$(git diff --numstat {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{num327}" && test "$(git diff --name-only {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s0a6)}" && test "$(git diff --numstat {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{num0a6}"''')
    return dict(s480=s480, s6e8=s6e8, s7a9=s7a9, sac0=sac0, s327=s327, s0a6=s0a6, num327=num327, num0a6=num0a6, spnum=spnum, line=line, test=test)


# J187's lists at J187's pin are J187's posted test line byte for byte (derive-j188.py's check, against J187's own file)
T187 = seat_test(PREV187)
TEST187_LINE = T187['test'] + f' && git diff --quiet {PREV} HEAD -- {FROZEN509} && sc=1'
expect('seat_code: every list and numstat recomputed at J187\'s pin 43043fe5 is J187\'s posted line, byte for byte (SEAT_480 and the test line)',
       T187['line'] in SRC187_T.splitlines() and TEST187_LINE in SRC187_T.splitlines())
T = seat_test(PIN)
for k in ('s480', 's6e8', 's7a9', 'sac0', 's327', 's0a6'):
    expect('bridge/src list %s at the pin is J187\'s plus D510\'s four files, nothing else' % k, T[k] == sorted(set(T187[k]) | set(ADMIT_BRIDGE)))
for k in ('num327', 'num0a6'):
    a, b = numrows(T187[k]), numrows(T[k])
    expect('bridge/src numstat %s at the pin: every row outside D510\'s files is J187\'s' % k,
           {f: v for f, v in a.items() if f not in ADMIT} == {f: v for f, v in b.items() if f not in ADMIT} and set(b) == set(a) | set(ADMIT_BRIDGE))
expect('SearchPolicy.java since 6e87e5d4 is J183\'s "8 0"', T['spnum'] == '8 0')
GOLD480 = git('diff', '--quiet', B480, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
GOLD6E8 = git('diff', '--quiet', B6E8, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
ANC480 = git('merge-base', '--is-ancestor', B480, PIN, ok=True)[0] == 0
expect('the seat-identity golden is unchanged since 480c837d and 6e87e5d4, and 480c837d is an ancestor', GOLD480 and GOLD6E8 and ANC480)
TEST191 = T['test'] + f' && test "$(git diff --numstat {PREV} HEAD -- {FROZEN} | LC_ALL=C sort | tr \'\\t\\n\' \'  \')" = "{ADMIT_STR}" && sc=1'
expect('seat_code: SEAT_480 and the test line recomputed at the new pin are J191\'s, byte for byte, and J190\'s',
       T['line'] in SRC_T.splitlines() and TEST191 in SRC_T.splitlines() and T['line'] in SRC190_T.splitlines() and TEST191 in SRC190_T.splitlines())


def short(xs):
    return ', '.join(x.replace('bridge/src/mtgtable/', '') for x in xs) if xs else 'nothing'


# ======================================================================================================================================
# B. computed from the pin: the deck code (J191's values = J190's = J188's, unchanged: D513 touches no deck file)
# ======================================================================================================================================
F2B, CC7 = 'f2b4e9c26227ef135e5df1102384e026cbf2f195', 'cc7467f6e340f177fc9763086470a94efcaf457f'
LIB_SAME = git('diff', '--quiet', F2B, PIN, '--', 'cubes/library/', ok=True)[0] == 0
dd = git('diff', '--no-color', '--no-ext-diff', '-U0', F2B, PIN, '--', 'tools/cubelab/deckcensus.ts').splitlines()
D_OUT = [x[1:] for x in dd if x.startswith('-') and not x.startswith('---')]
D_IN = [x[1:] for x in dd if x.startswith('+') and not x.startswith('+++')]


def h(xs):
    return hashlib.sha256('\n'.join(xs).encode()).hexdigest()


def pre(x):
    return x.split('throw new Error(', 1)[0]


OUT_SHA, IN_SHA = h(D_OUT), h(D_IN)
thr_o, thr_i = [pre(x) for x in D_OUT if 'throw new Error(' in x], [pre(x) for x in D_IN if 'throw new Error(' in x]
CENSUS_SHAPE = (len(thr_o) == 1 and thr_o == thr_i and all(x.strip().startswith(('//', '/**')) or 'throw new Error(' in x for x in D_OUT + D_IN))
DC_BLOB = git('rev-parse', PIN + ':tools/cubelab/deckcensus.ts').strip()
UP_BLOB = git('rev-parse', PIN + ':tools/cubelab/engine-unplayable.json').strip()
DC_LAST = git('log', '-1', '--format=%h', PIN, '--', 'tools/cubelab/deckcensus.ts').strip()
UP_LAST = git('log', '-1', '--format=%h', PIN, '--', 'tools/cubelab/engine-unplayable.json').strip()
LASTS = DC_LAST if DC_LAST == UP_LAST else '%s and %s' % (DC_LAST, UP_LAST)
U171 = json.loads(git('show', F2B + ':tools/cubelab/engine-unplayable.json'))['cards']
U176 = json.loads(git('show', CC7 + ':tools/cubelab/engine-unplayable.json'))['cards']
UPIN = json.loads(git('show', PIN + ':tools/cubelab/engine-unplayable.json'))
NEW492 = ['Emeritus of Abundance', 'Elite Interceptor', 'Emeritus of Ideation', 'Studious First-Year', 'Ob Nixilis, the Adversary']
NEW506 = ['Old Man of the Sea', 'Rubinia Soulsinger']
b = UPIN.get('cards') or {}
LIST_OK = (UPIN.get('decision') == 'D482' and list(b) == list(U171) + ['Chain of Smog'] + NEW492 + NEW506 and all(b[k] == U171[k] for k in U171)
           and list(U176) == list(U171) + ['Chain of Smog'] and b.get('Chain of Smog') == U176.get('Chain of Smog') and b['Chain of Smog'].get('since') == 'J173'
           and all(b[k].get('since') == 'J176' and str(b[k].get('why', '')).strip() and str(b[k].get('evidence', '')).strip() for k in NEW492)
           and all(b[k].get('since') == 'J183' and str(b[k].get('why', '')).strip() and str(b[k].get('evidence', '')).strip() for k in NEW506))
DECK_SAME = git('diff', '--quiet', PREV, PIN, '--', 'tools/cubelab/deckcensus.ts', 'tools/cubelab/engine-unplayable.json', 'cubes/library/', ok=True)[0] == 0


def reg(pat, text=None):
    m = re.search(pat, text or SRC_T)
    return m.group(1) if m else None


DECK_PATS = (('DC_BLOB', r"DC_BLOB, UP_BLOB = '([0-9a-f]{40})'"), ('UP_BLOB', r"DC_BLOB, UP_BLOB = '[0-9a-f]{40}', '([0-9a-f]{40})'"),
             ('OUT_SHA', r"OUT_SHA = '([0-9a-f]{64})'"), ('IN_SHA', r"IN_SHA = '([0-9a-f]{64})'"), ('N', r'OUT_N, IN_N = (\d+, \d+)'))
J191_DECK = {k: reg(p) for k, p in DECK_PATS}
J190_DECK = {k: reg(p, SRC190_T) for k, p in DECK_PATS}
expect('cubes/library/ unchanged since J171\'s pin f2b4e9c2', LIB_SAME)
expect('deckcensus.ts differs from f2b4e9c2\'s in comment lines and the one throw\'s message only (%d out, %d in)' % (len(D_OUT), len(D_IN)), CENSUS_SHAPE)
expect('engine-unplayable.json is the nine cards in order (D482, D490, D492, D494, D506)', LIST_OK)
expect('the deck code is unchanged since J186\'s pin e557dedf (D509-D513 touch no deck file)', DECK_SAME)
expect('deck_code: both blobs, both sha256s and the line counts recomputed at the new pin are J191\'s registered values (and J190\'s)',
       J190_DECK == J191_DECK == {'DC_BLOB': DC_BLOB, 'UP_BLOB': UP_BLOB, 'OUT_SHA': OUT_SHA, 'IN_SHA': IN_SHA, 'N': '%d, %d' % (len(D_OUT), len(D_IN))})

# ======================================================================================================================================
# C. D505-D512's names (J191's lines = J190's = J188's, recomputed at the new pin as derive-j188.py to derive-j191.py computed them),
# D509-D513's commits, and D513's own names at the pin (checked here; the pilot gains no line)
# ======================================================================================================================================
def bre(s):
    return re.sub(r'([\[\]*\\^$])', r'\\\1', s)


def q(s):
    return "'%s'" % s if "'" not in s else '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')


DERIVED = 'derive-j190.py, derive-j191.py and derive-j192.py'
SPEC = {
    'D505': ('# D505 (hideaway\'s look kept while the card stays in exile, the dig tied by its trigger\'s resolution; amends D502; the names this file\n'
             '# reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py, derive-j188.py, derive-j190.py,\n'
             '# derive-j191.py and derive-j192.py)',
             [('dec', 'D505'), ('grep', 'docs/decisions/D505-*.md', 'mayLookFaceDownExile'), ('grep', 'tools/check-redaction.mjs', 'const RESOLVE_WITHIN = [10, 3];'),
              ('file', 'fixtures/negative/redaction/a9-hideaway-alt-kept-after-the-host-leaves.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'")]),
    'D506': ('# D506 (Old Man of the Sea and Rubinia Soulsinger on the engine-unplayable list; D482\'s rule admits an overflow or hang inside one\n'
             '# step; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py,\n'
             '# derive-j188.py, ' + DERIVED + ')',
             [('dec', 'D506'), ('grep', 'docs/decisions/D506-*.md', 'controllerChangeZoneCorrection'), ('grep', 'tools/cubelab/engine-unplayable.json', '"Old Man of the Sea"'),
              ('grep', 'tools/cubelab/engine-unplayable.json', '"Rubinia Soulsinger"'), ('grep', 'tools/cubelab/engine-unplayable.json', 'measured overflow or hang'),
              ('grep', 'tools/cubelab/deckcensus.ts', 'D506'), ('grep', 'web/test/cubelab-deck-census.test.ts', "'Old Man of the Sea', 'Rubinia Soulsinger'")]),
    'D507': ('# D507 (the seat\'s gate sees a Stack-zone card only with a stack instance or as a spell copy; the worker log\'s [ghost] line; protocol\n'
             '# M79; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py,\n'
             '# derive-j188.py, ' + DERIVED + '; D508 keeps the Stack rule over the card the game holds)',
             [('dec', 'D507'), ('grep', 'docs/decisions/D507-*.md', 'random-<band>-d507'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean onStack('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'now.isCopiedSpell() || onStack(now)'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String ghostLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[ghost] card "'), ('grep', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'ghostLine(49)'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void ghosts()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void copies()'), ('grepline', 'docs/protocol.md', '| M79 |')]),
    'D508': ('# D508 (the seat\'s gate judges a candidate where the game holds the card now, never by a last-known copy\'s zone; the worker log\'s\n'
             '# [lki] line; protocol M80; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by\n'
             '# derive-j187.py, derive-j188.py, ' + DERIVED + ')',
             [('dec', 'D508'), ('grep', 'docs/decisions/D508-*.md', 'random-<band>-d508'), ('grep', 'docs/decisions/D508-*.md', 'getCardState'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static Card current('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'g.getCardState(c, null)'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static boolean lastKnown('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String lastKnownLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[lki] card "'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'return visibleAt(current(c), ai);'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean visibleAt('),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void lastKnown()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'g.copyLastState();'), ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'an ability whose host object is now in seat 0'), ('grepline', 'docs/protocol.md', '| M80 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 12. J185\'s checker failure (D508')]),
    'D510': ('# D510 (a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly; protocol M81;\n'
             '# record-only under D509 point 2: the names this file reads, computed against the pin by derive-j188.py, and again, unchanged,\n'
             '# by ' + DERIVED + ')',
             [('dec', 'D510'), ('grep', 'docs/decisions/D510-*.md', 'Record-only, under D509'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static void targetAnswer('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'private static boolean among('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static final String HIDDEN = "option:hidden";'),
              ('file', 'fixtures/negative/redaction/m81-target-option-hidden.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'m81-target-option-hidden.jsonl', 'pass'"), ('grepline', 'docs/protocol.md', '| M81 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 13. J186\'s empty target records (D510')]),
    'D511': ('# D511 (an atlas unit\'s replay records into a sink that writes nothing, so it plays the recorded baseline\'s game; CubeLab.java only,\n'
             '# between landings under D509 point 1; the atlas-selftest\'s replay leg: the names this file reads, computed against the pin by\n'
             '# derive-j188.py, and again, unchanged, by ' + DERIVED + ')',
             [('dec', 'D511'), ('grep', 'docs/decisions/D511-*.md', 'ReplaySink'), ('grep', 'tools/cubelab/CubeLab.java', 'static final class ReplaySink implements mtgtable.ai.DecisionSink'),
              ('grep', 'tools/cubelab/CubeLab.java', 'ReplaySink.attach(game);'), ('file', 'fixtures/cubelab/atlas-replay/pauper-2452-A.dck'),
              ('file', 'fixtures/cubelab/atlas-replay/pauper-2452-B.dck'), ('grep', 'tools/cubelab/atlas.ts', 'async function atlasSelftestReplay('),
              ('grep', 'tools/cubelab/atlas.ts', 'export const SELFTEST_REPLAY_SPLIT_TURN = 14;'),
              ('grep', 'docs/evidence/cube-lab.md', '## 14. J186\'s replay divergence (D511')]),
}


def shell_of(d, items, local):
    out = []
    for it in items:
        if it[0] == 'dec':
            out.append('ls docs/decisions/%s-*.md >/dev/null 2>&1' % it[1])
        elif it[0] == 'file':
            out.append('test -f %s' % it[1])
        elif it[0] == 'grep':
            out.append('grep -q %s %s' % (q(bre(it[2])), it[1]))
        elif it[0] == 'grepline':
            out.append('grep -q %s %s' % (q('^' + bre(it[2])), it[1]))
    v = 'var/%s/has-%s.txt' % (local, d.lower())
    return ' && '.join(out) + ' && echo 1 > %s || echo 0 > %s' % (v, v)


def files_at(path):
    d, pat = os.path.split(path)
    ls = [x for x in git('ls-tree', '--name-only', PIN, d + '/').splitlines() if x]
    return {x: git('show', '%s:%s' % (PIN, x)) for x in ls if fnmatch.fnmatch(os.path.basename(x), pat)}


def evaluate(items, get):
    miss = []
    for it in items:
        if it[0] == 'dec':
            if not get('docs/decisions/%s-*.md' % it[1]):
                miss.append('no %s decision file' % it[1])
        elif it[0] == 'file':
            if not get(it[1]):
                miss.append('no %s' % it[1])
        else:
            fs = get(it[1])
            hit = any((it[2] in t) if it[0] == 'grep' else any(l.startswith(it[2]) for l in t.splitlines()) for t in fs.values())
            if not hit:
                miss.append('%r not in %s' % (it[2], it[1]))
    return miss


# D512, exactly as derive-j188.py found it: its decision file by glob, and the fixtures under fixtures/negative/redaction/ that name hideaway
# and the viewer's own permanent, new or re-verdicted since J187's pin, each with its row in the checker's self-test (D513's four new
# fixtures name A3, not hideaway, so the set is unchanged)
D512F = sorted(x for x in git('ls-tree', '-r', '--name-only', PIN, 'docs/decisions/').splitlines() if x.startswith('docs/decisions/D512-'))
NEWFIX = [x for x in git('diff', '--name-only', '--diff-filter=A', PREV187, PIN, '--', 'fixtures/negative/redaction/').splitlines() if x]
ALLFIX = [x for x in git('ls-tree', '--name-only', PIN, 'fixtures/negative/redaction/').splitlines() if x]
SELFTEST_AT = git('show', PIN + ':tools/check-redaction-selftest.mjs')
SELFTEST_187 = git('show', PREV187 + ':tools/check-redaction-selftest.mjs')


def verdict(n, text):
    m = re.search(r"'%s', '(pass|fail)'" % re.escape(n), text)
    return m.group(1) if m else None


def viewer_own(n):    # names hideaway and the viewer's own permanent
    return 'hideaway' in n and ('own-permanent' in n or 'viewer' in n)


D512FIX = sorted(x for x in ALLFIX if viewer_own(os.path.basename(x))
                 and (x in NEWFIX or verdict(os.path.basename(x), SELFTEST_AT) != verdict(os.path.basename(x), SELFTEST_187)))
OTHER_HIDEAWAY_NEW = sorted(os.path.basename(x) for x in NEWFIX if 'hideaway' in x and x not in D512FIX)
SPEC_D512 = [('dec', 'D512')]
if D512F and 'hideaway' in git('show', '%s:%s' % (PIN, D512F[0])):
    SPEC_D512.append(('grep', 'docs/decisions/D512-*.md', 'hideaway'))
else:
    SOFT.append('D512\'s decision file missing or not naming hideaway')
if OTHER_HIDEAWAY_NEW:
    SOFT.append('%d other hideaway fixtures new since 43043fe5, not read by has_d512: %s' % (len(OTHER_HIDEAWAY_NEW), ', '.join(OTHER_HIDEAWAY_NEW)))
for x in D512FIX:
    n = os.path.basename(x)
    SPEC_D512.append(('file', x))
    v = verdict(n, SELFTEST_AT)
    if v:
        SPEC_D512.append(('grep', 'tools/check-redaction-selftest.mjs', "'%s', '%s'" % (n, v)))
    else:
        SOFT.append('%s has no row in tools/check-redaction-selftest.mjs' % n)
expect('D512\'s controls at the pin: four fixtures naming hideaway and the viewer\'s own permanent, each with its self-test row (%d)' % len(D512FIX), len(D512FIX) == 4)
SPEC['D512'] = ('# D512 (the redaction checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back: J187\'s s06;\n'
                '# the checker, its fixtures and docs only; the names this file reads, computed against the pin by derive-j188.py, and again,\n'
                '# unchanged, by ' + DERIVED + ': the decision file by glob, and its controls under fixtures/negative/redaction/\n'
                '# naming hideaway'
                ' and the viewer\'s own permanent, new or re-verdicted since J187\'s pin, each with its row in the checker\'s self-test)',
                SPEC_D512)

HAS = {}
for d, (_, items) in SPEC.items():
    HAS[d] = evaluate(items, files_at)
    expect('%s\'s names at the new pin%s' % (d, '' if not HAS[d] else ': missing ' + '; '.join(HAS[d])), not HAS[d])
    expect('%s\'s shell line is J191\'s and J190\'s, byte for byte (but its folder)' % d,
           shell_of(d, items, 'lab-j191-local') in SRC_T.splitlines() and shell_of(d, items, 'lab-j190-local') in SRC190_T.splitlines())
DEC = {}
for d in ('D509', 'D510', 'D511', 'D512', 'D513'):
    fs = [x for x in git('ls-tree', '-r', '--name-only', PIN, 'docs/decisions/').splitlines() if x.startswith('docs/decisions/%s-' % d)]
    c = git('log', '--diff-filter=A', '--format=%H', '-n', '1', PIN, '--', fs[0]).strip() if fs else ''
    anc = bool(c) and git('merge-base', '--is-ancestor', c, PIN, ok=True)[0] == 0
    DEC[d] = (fs, c)
    expect('%s\'s decision file is at the pin (%s), added by %s, an ancestor of the pin' % (d, fs[0] if fs else 'none', c[:8] or 'no commit'), len(fs) == 1 and anc)
expect('D509-D513\'s files are the ones J188\'s to J191\'s derivations read, and D513\'s the merge\'s', [DEC[d][0] for d in ('D509', 'D510', 'D511', 'D512', 'D513')] == [
    ['docs/decisions/D509-seat-frozen-between-landings.md'], ['docs/decisions/D510-all-hidden-target-record.md'], ['docs/decisions/D511-atlas-replay-is-the-recorded-game.md'],
    ['docs/decisions/D512-hideaway-host-taken-from-the-digger.md'], ['docs/decisions/D513-revealed-top-during-control-exchange.md']])
D512C = DEC['D512'][1][:8]
D513C = DEC['D513'][1][:8]
expect('D512\'s commit is the one J190\'s and J191\'s files name (added by %s)' % D512C,
       all(('added by %s), each as J188\'s *Why J188* states it' % D512C) in x for x in (SRC_T, SRC190_T)))
expect('D513\'s decision file was added on its lane, between J191\'s pin and this one (%s)' % D513C,
       D513C and git('merge-base', '--is-ancestor', J191PIN, DEC['D513'][1], ok=True)[0] == 0)
# D513's own names at the pin: its four controls with their self-test verdicts, `revealedTopsOf` in the checker, and its decision naming J191
CHECKER_AT = git('show', PIN + ':tools/check-redaction.mjs')
D513TXT = git('show', '%s:%s' % (PIN, DEC['D513'][0][0])) if DEC['D513'][0] else ''
D513_MISS = ['no %s' % n for n, _ in D513FIX if ('fixtures/negative/redaction/' + n) not in ALLFIX]
D513_MISS += ['%s not %s in the self-test' % (n, v) for n, v in D513FIX if verdict(n, SELFTEST_AT) != v]
D513_MISS += [] if 'revealedTopsOf' in CHECKER_AT else ['no revealedTopsOf in the checker']
D513_MISS += [w for w in ('b-s08-powered-3008', 'd7-random-o1-b121-seat0', 'd7-random-o1-b5-seat0', 'D509') if w not in D513TXT]
expect('D513\'s names at the pin: its four controls with their self-test verdicts (%s), `revealedTopsOf` in the checker, and its decision naming J191\'s s08 and its two logs%s'
       % (', '.join('%s %s' % (n.replace('.jsonl', ''), v) for n, v in D513FIX), '' if not D513_MISS else ': MISSING ' + '; '.join(D513_MISS)), not D513_MISS)
D513_NEWFIX = sorted(os.path.basename(x) for x in MOVED if x.startswith('fixtures/negative/redaction/') and x.endswith('.jsonl'))
expect('the fixtures D513 added are exactly its four controls (%s)' % ', '.join(D513_NEWFIX), D513_NEWFIX == sorted(n for n, _ in D513FIX))

# ======================================================================================================================================
# D. J191's night, read only: its report, its data folder, the runner's results (a FAILED STATUS, asserted as it is); J190's report
# (history now, the pool's fourth night); J188's (the third); J187's (the second); J186's by-hand numbers (the first)
# ======================================================================================================================================
lb = json.load(open(L191 + '/report/labels.json'))
fr = lb['f_futilityRead']
c7 = lb['c_sizing7']['asRun']
assert (lb['labels'], lb['confident'], lb['branched'], lb['partialLabels'], lb['futilityControls'], lb['confidentPartial']) == (88, 25, 171, 33, 13, 0), 'J191 labels'
assert (fr['read'], fr['stopped'], fr['controls'], fr['controlsConfident'], fr['futile']) == (121, 33, 13, 0, 46), fr
assert not [x for x in fr['controlList'] if x.endswith('-> confident')] and fr['controlConfidentShare95'] == [0.0, 0.2471], fr['controlConfidentShare95']
assert (c7['wallSec'], c7['workerHours'], c7['confidentPerWorkerHour'], c7['confidentPerWorkerHourPoisson95'], c7['confidentPer7Worker10hNight'],
        c7['confidentPer7Poisson95']) == (38219, 63.7, 0.3925, [0.254, 0.5794], 27.5, [17.8, 40.6]), c7
CSR = lb['c_sizingRead']
assert (CSR['confidentPerWorkerHour'], CSR['confidentPerWorkerHourPoisson95'], CSR['confidentPer7Worker10hNight'], CSR['poisson95']) == (0.3925, [0.254, 0.5794], 27.5, [17.8, 40.6]), CSR
assert CSR['j190']['confident'] == 17 and CSR['j190']['futilityRead'] == {'controls': 14, 'controlsConfident': 1, 'stopped': 38, 'read': 124}, CSR['j190']
assert sorted(lb['pools']) == sorted('random-%s-d508' % x for x in ('pauper', 'peasant', 'legacy', 'powered'))
assert (lb['refusedCastVoid'], lb['lostCastVoid'], lb['voidLabels']) == (0, 0, 0)
SPINES13 = ['s%02d' % k for k in range(1, 14)]
assert sorted(lb['bySpine']) == SPINES13 and all(lb['bySpine'][s]['sha'] == J191P8 and lb['bySpine'][s]['randomSeat'] == 'D508' for s in SPINES13)
# THE STATUS IS J191's OWN, FAILED: one final check failed, `atlas.problems == 0`, on s08's two logs the checker misread (D513)
STATUS = open(R191 + '/STATUS').read()
assert STATUS.startswith('failed\nreason: check: atlas.problems == 0 (atlas.problems = 1)\n'), STATUS[:200]
assert 'started: 2026-11-04T22:27:41-05:00' in STATUS and 'finished: 2026-11-05T09:20:18-05:00' in STATUS, STATUS[:300]
assert ('mtg-table: %s' % J191PIN[:7]) in STATUS and 'workers: 6 ' in STATUS and 'peak_worker_rss_gb: 1.15' in STATUS
BLOCKS = re.findall(r'(run\d+) exit (\d+) at', STATUS)
assert len(BLOCKS) == 15 and all(x[1] == '0' for x in BLOCKS), BLOCKS
PRESSURE = re.findall(r'pressure-\d+: (\S+) (drop|raise) to (\d) worker', STATUS)
assert [(x[1], x[2]) for x in PRESSURE] == [('drop', '5'), ('raise', '6')] * 6, PRESSURE
EPI, k0 = [], None
for k, x in enumerate(PRESSURE):
    if x[1] == 'drop' and k0 is None:
        k0 = k
    if x[1] == 'raise' and x[2] == '6':
        EPI.append(round((datetime.fromisoformat(x[0]) - datetime.fromisoformat(PRESSURE[k0][0])).total_seconds() / 60)); k0 = None
assert len(EPI) == 6 and len(PRESSURE) == 12, EPI
CHECKS = open(R191 + '/checks.txt').read().splitlines()
FAILS = [x for x in CHECKS if not x.startswith('PASS')]
assert len(CHECKS) == 50 and FAILS == ['FAIL  atlas.problems == 0   [atlas.problems = 1]'], FAILS
PILOTC = open(R191 + '/pilot-checks.txt').read()
assert all(('PASS  %s == 1' % k) in PILOTC for k in ('has_d510', 'has_d511', 'has_d512', 'seat_code', 'deck_code', 'redaction_self', 'selftest', 'identity'))
assert 'PASS  draws.newDraws13 == 13' in PILOTC and 'PASS  draws.newValidation == 1' in PILOTC and 'FAIL' not in PILOTC
MET = json.load(open(R191 + '/metrics.json'))
assert (MET['unit_errors'], MET['replay_diverged'], MET['ghost_candidates'], MET['lki_candidates'], MET['stack_overflows'], MET['pump_effect_ioobe'],
        MET['atlas_hook_ioobe'], MET['atlas_mapsa_ise'], MET['branch_error_stacks'], MET['branches'], MET['branch_timeouts'], MET['engine_errors'],
        MET['pressure_events']) == (0, 0, 0, 11, 0, 81, 0, 0, 81, 57275, 1, 1, 12), MET
assert (MET['atlas.problems'], MET['atlas.refusedCastOptions'], MET['atlas.lostCastOptions'], MET['atlas.refusedCastVoid'], MET['atlas.lostCastVoid'],
        MET['atlas.branchTimeoutsInStep'], MET['atlas.timeoutShare'], MET['peak_worker_rss_gb'], MET['armed'], MET['atlas.branchErrored'],
        MET['atlas.lostStranded'], MET['atlas.refusedCastShare'], MET['atlas.cardTargetShare'], MET['atlas.branchErrorStacks'],
        MET['atlas.errorsByKind.IndexOutOfBoundsException'], MET['atlas.scanLogs']) == (1, 0, 0, 0, 0, 1, 2e-05, 1.15, 0, 82, 3, 0.00461, 0.1751, 81, 81, 114550), MET
# D479's counter, the first non-zero in this population: the night's numbers, from the atlas json the runner's metrics.py read
assert (MET['atlas.exileLinksLostBranches'], MET['atlas.exileLinksLostLinks']) == (6230, 6230), MET
WALL, starts = {}, []
for line in open(L191 + '/spine-times.txt'):
    f = line.split()
    s = f[0].split('-')[1]
    WALL[s] = (WALL.get(s, (0,))[0] + int(f[2]) - int(f[1]), f[3])
    starts.append(int(f[1]))
assert sorted(WALL) == SPINES13 and all(v[1] == '6' for v in WALL.values())
wall_s = sum(v[0] for v in WALL.values())
assert wall_s == 38219
mins = {k: round(v[0] / 60, 1) for k, v in WALL.items()}
SMAX = max(mins, key=lambda k: mins[k])
SMIN = min(mins, key=lambda k: mins[k])
assert (SMAX, mins[SMAX], SMIN, mins[SMIN]) == ('s07', 147.7, 's10', 7.4), (SMAX, SMIN, mins)
J191_START = int(datetime.fromisoformat('2026-11-04T22:27:41-05:00').timestamp())    # results/J191/STATUS `started`
PILOT_MIN = round((min(starts) - J191_START) / 60)
CMP = json.load(open(L191 + '/report/compare-j190.json'))
assert {s: (v['this'] or {}).get('wallSec') for s, v in CMP['bySpine'].items()} == {s: v[0] for s, v in WALL.items()}, 'compare-j190.json "this" walls are spine-times\''
assert (CMP['night']['before']['confidentPerWorkerHour'], CMP['night']['this']['confidentPerWorkerHour']) == (0.2732, 0.3925)
assert (CMP['night']['before']['decisionsBranched'], CMP['night']['this']['decisionsBranched']) == (124, 121)
DECB = CMP['night']['this']['decisionsBranched']
NC = json.load(open(L191 + '/report/ncurve.json'))
assert (NC['final'], NC['atN']['50']['kept'], NC['atN']['50']['keptShare'], NC['atN']['100']['kept'], NC['atN']['100']['keptShare']) == (25, 17.4, 0.696, 22.4, 0.896), NC['atN']
RD = json.load(open(L191 + '/report/reads.json'))
SB, C1 = RD['i_sameBest'], RD['iv_pooledForgeSpines']['C1_castNow']
assert (SB['n'], SB['point'], SB['interval']) == (21, 0.4286, [0.16, 0.6875]) and RD['iv_pooledForgeSpines']['C1_castNow']['verdict'] is None, SB
assert (C1['random']['point'], C1['random']['interval'], C1['forgeMap']['point'], C1['forgeMap']['interval']) == (0.0091, [-0.0151, 0.0314], 0.042, [-0.0027, 0.1033]), C1


def lines_in(p, text=None):
    try:
        return sum(1 for x in open(p, errors='replace') if text is None or text in x)
    except OSError:
        return 0


def one(pat):
    g = glob.glob(pat)
    assert len(g) == 1, pat
    return g[0]


def logcount(s, text, L=L191):
    return sum(lines_in(f, text) for f in glob.glob(L + '/b-%s-*/phaseB/logs/*.log' % s))


HOOK_TEXT = 'at forge.game.ability.effects.PlayEffect.resolve(PlayEffect.java:90)'
MAPSA_TEXT = 'at mtgtable.ai.SearchPolicy.mapSa(SearchPolicy.java:924)'
PUMP_TEXT = 'at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)'
ROWS_G = {s: lines_in(one(L191 + '/b-%s-*/phaseB/branches.jsonl' % s)) for s in SPINES13}
REPLAY = {s: lines_in(one(L191 + '/b-%s-*/phaseB/units.jsonl' % s), 'replay diverged') for s in SPINES13}
PUMP = {s: logcount(s, PUMP_TEXT) for s in SPINES13}
HOOK = {s: logcount(s, HOOK_TEXT) for s in SPINES13}
MAPSA = {s: logcount(s, MAPSA_TEXT) for s in SPINES13}
BES = {s: logcount(s, 'branch error, stack:') for s in SPINES13}
GHOST = {s: logcount(s, '[ghost]') for s in SPINES13}
LKI = {s: logcount(s, '[lki]') for s in SPINES13}
TEX = {s: logcount(s, 'TimeoutException') for s in SPINES13}
NPE = sum(logcount(s, 'NullPointerException') for s in SPINES13)
SO = sum(lines_in(f, 'StackOverflowError') for f in glob.glob(L191 + '/b-s??-*-3???/phaseB/branches.jsonl'))
TOUT = {s: lines_in(one(L191 + '/b-%s-*/phaseB/branches.jsonl' % s), '"timedOut":true') for s in SPINES13}
EERR = {s: lines_in(one(L191 + '/b-%s-*/phaseB/branches.jsonl' % s), '"engineError":true') for s in SPINES13}
EXITS = dict(l.split() for l in open(L191 + '/exits.txt') if l.strip())
ATLJ = {s: json.load(open(one(L191 + '/b-%s-*/atlas.json' % s))) for s in SPINES13}
ATL = {s: ATLJ[s]['checks'] for s in SPINES13}
assert not any(HOOK.values()) and not any(MAPSA.values()) and not any(GHOST.values()) and SO == 0 and NPE == 0 and not any(REPLAY.values()), (HOOK, MAPSA)
assert {s: v for s, v in PUMP.items() if v} == {'s12': 81} == {s: v for s, v in BES.items() if v}, (PUMP, BES)
assert {s: v for s, v in LKI.items() if v} == {'s13': 11}, LKI
assert {s: v for s, v in TEX.items() if v} == {'s07': 5}, TEX
assert {s: v for s, v in TOUT.items() if v} == {'s07': 1} == {s: v for s, v in EERR.items() if v}, (TOUT, EERR)
assert sum(ROWS_G.values()) == 57275 and len(EXITS) == 13
EXIT_BAD = {k.split('-')[1]: v for k, v in EXITS.items() if v != '0'}
assert EXIT_BAD == {'s08': '3'}, EXITS          # the spine whose atlas reported the checker's two failures exits 3, as every problem spine
FAILED_LOGS = {s: ATL[s]['frameLogsFailed'] for s in SPINES13 if ATL[s]['frameLogsFailed']}
assert FAILED_LOGS == {'s08': 2} and all(ATL[s]['forkProblems'] == 0 for s in SPINES13), FAILED_LOGS
assert [s for s in SPINES13 if ATL[s]['problems']] == ['s08'] and ATL['s08']['problems'] == [
    '2 frame log(s) failed tools/check-redaction.mjs: d7-random-o1-b121-seat0.jsonl.gz, d7-random-o1-b5-seat0.jsonl.gz'], ATL['s08']['problems']
S08_LOGS = [L191 + '/' + os.path.basename(one(L191 + '/b-s08-*')) + '/phaseB/frames/' + x for x in ('d7-random-o1-b121-seat0.jsonl.gz', 'd7-random-o1-b5-seat0.jsonl.gz')]
assert all(os.path.exists(x) for x in S08_LOGS), S08_LOGS
FRAMELOGS = sum(ATL[s]['frameLogs'] for s in SPINES13)
FORKS = sum(ATL[s]['forks'] for s in SPINES13)
assert FRAMELOGS == 114576 and MET['atlas.scanLogs'] == 114550 == 2 * FORKS and FORKS == 57275 and ATL['s08']['frameLogs'] == 6802   # branch logs plus 2 baseline logs a spine
WARN = {s: len(ATL[s]['warnings']) for s in SPINES13 if ATL[s]['warnings']}
assert WARN == {'s01': 24, 's07': 1, 's13': 2} and sum(WARN.values()) == MET['atlas.warnings'] == 27, WARN
# D479's exile links per spine (atlas.json's phaseB.exileLinksLost): s01 every branch row from d10 on, s03 every row of d19-d22
EXL = {s: ATLJ[s]['phaseB']['exileLinksLost'] for s in SPINES13}
EXLB = {s: v['branches'] for s, v in EXL.items() if v['branches']}
assert EXLB == {'s01': 5880, 's03': 350} and all(v['branches'] == v['links'] for v in EXL.values()), EXL
EXD = {}
for s in ('s01', 's03'):
    lost, tot = Counter(), Counter()
    for l in open(one(L191 + '/b-%s-*/phaseB/branches.jsonl' % s)):
        r = json.loads(l)
        tot[r['d']] += 1
        lost[r['d']] += 1 if (r.get('exileLinksLost') or 0) > 0 else 0
    EXD[s] = (sorted(d for d in lost if lost[d]), all(lost[d] in (0, tot[d]) for d in tot), tot)
assert EXD['s01'][0][0] == 10 and EXD['s01'][1] and all(d in EXD['s01'][0] for d in EXD['s01'][2] if d >= 10) and sum(EXD['s01'][2].values()) == ROWS_G['s01'] == 6030, EXD['s01'][:2]
assert EXD['s03'][0] == [19, 20, 21, 22] and EXD['s03'][1], EXD['s03'][:2]
EXL_S01_ROWS = ROWS_G['s01']
# s12's errored branches: Forge's PumpEffect.java:299 IndexOutOfBoundsException, every one, over nine decisions
S12E, S12D = Counter(), set()
for f in sorted(glob.glob(L191 + '/b-s12-*/phaseB/logs/*.log')):
    ls = open(f, errors='replace').read().splitlines()
    for i, x in enumerate(ls):
        if 'branch error, stack:' in x:
            S12E[ls[i + 1].strip()] += 1
            mm = re.search(r'atlas:d(\d+):random:o\d+', x)
            S12D.add(int(mm.group(1)) if mm else -1)
assert S12E == Counter({'java.lang.IndexOutOfBoundsException: Index 0 out of bounds for length 0': 81}) and sorted(S12D) == [1, 5, 6, 8, 11, 12, 13, 15, 16], (S12E, S12D)
# s13's [lki] lines: one card, d21
LKIL = Counter()
for f in sorted(glob.glob(L191 + '/b-s13-*/phaseB/logs/*.log')):
    for x in open(f, errors='replace'):
        if '[lki]' in x:
            LKIL[x.strip()[:24]] += 1
assert LKIL == Counter({'[lki] card 5 offered as ': 11}), LKIL
TOOL = json.load(open(L191 + '/report/tool.json'))
assert TOOL['refusedCastOptionList'] == [] == TOOL['lostCastOptionList'] and 'Lively Dirge' not in TOOL['refusedCastCards'] and 'Lively Dirge' not in TOOL['lostCastCards']
assert TOOL['refusedCastShare'] == 0.00461 and TOOL['lostStranded'] == 3 and TOOL['cardTargetShare'] == 0.1751
REFSHARE = round(100 * TOOL['refusedCastShare'], 2)
assert REFSHARE == 0.46
GB = round(sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(L191) for x in fs) / 1e9, 1)
N = {'branched': lb['branched'], 'decb': DECB, 'labels': lb['labels'], 'confident': lb['confident'], 'partial': lb['partialLabels'], 'controls': lb['futilityControls'],
     'ctlConf': fr['controlsConfident'], 'read': fr['read'], 'stopped': fr['stopped'], 'futile': fr['futile'], 'cpwh': '%.3f' % c7['confidentPerWorkerHour'],
     'cpwh95': [round(x, 3) for x in c7['confidentPerWorkerHourPoisson95']], 'c7': c7['confidentPer7Worker10hNight'], 'p95': c7['confidentPer7Poisson95'],
     'wall': wall_s, 'wallh': round(wall_s / 3600, 1), 'wh': round(c7['workerHours'], 1), 'minmin': min(mins.values()), 'smin': SMIN,
     'maxmin': max(mins.values()), 'smax': SMAX, 'games': sum(ROWS_G.values()), 'perSpine': round(lb['branched'] / 13, 1), 'gb': GB, 'hook': sum(HOOK.values()),
     'pump': sum(PUMP.values()), 'ghost': sum(GHOST.values()), 'lki': sum(LKI.values()), 'errs': MET['branch_error_stacks'], 'tex': sum(TEX.values()), 'mapsa': sum(MAPSA.values()),
     'ctlShare95': fr['controlConfidentShare95'], 'kept50': NC['atN']['50']['kept'], 'kept50s': '%.1f' % (100 * NC['atN']['50']['keptShare']),
     'kept100': NC['atN']['100']['kept'], 'kept100s': '%.1f' % (100 * NC['atN']['100']['keptShare']), 'exl': MET['atlas.exileLinksLostBranches']}
# 0.3925 is printed to three places as '%.3f' prints it (0.393 -- a binary 0.3925 lies just above the half); the heartbeat's 0.392 truncated
assert (N['cpwh'], N['cpwh95'], N['wh'], N['wallh'], N['perSpine'], N['tex'], N['kept50s'], N['kept100s']) == ('0.393', [0.254, 0.579], 63.7, 10.6, 13.2, 5, '69.6', '89.6'), N
NOTE = {'s01': ' (D479\'s `exileLinksLost` on %s of its %s branch rows, every row from d10 on; %d options capped past the warning bar, a warning)' % (format(EXLB['s01'], ','), format(EXL_S01_ROWS, ','), WARN['s01']),
        's03': ' (D479\'s `exileLinksLost` on %d branch rows, every row of d19-d22)' % EXLB['s03'],
        's07': ' (the longest; the night\'s 1 branch timeout; %d Forge AI-eval `TimeoutException` lines; 1 option capped past the warning bar)' % TEX['s07'],
        's08': ' (exit 3: 2 of its %s branch frame logs failed the checker, d7\'s b121 and b5 -- the opponent\'s Oracle of Mul Daya taken with Oko\'s -5, A3 read during the exchange; a checker misread, D513, which this pin carries)' % format(ATL['s08']['frameLogs'], ','),
        's10': ' (the shortest)',
        's12': ' (81 errored branches over nine decisions, all Forge\'s `PumpEffect.java:299` IndexOutOfBoundsException, `pump_effect_ioobe`)',
        's13': ' (11 `[lki]` lines at d21, card 5, a last-known copy left out by D508\'s gate; 2 options capped past the warning bar)'}
ROWS = {}
for k in range(1, 14):
    s = 's%02d' % k
    mm = lb['bySpine'][s]
    ROWS[s] = '%d / %d: %d, %d, %.1f min%s' % (J191B + k, J191B + 100 + k, mm['rows'], mm['confident'], mins[s], NOTE.get(s, ''))

# J190's numbers, the population's fourth night (history now): its own report, as derive-j191.py read it, unchanged
l90 = json.load(open(L190 + '/report/labels.json'))
f90 = l90['f_futilityRead']
a90 = l90['c_sizing7']['asRun']
assert (l90['labels'], l90['confident'], l90['branched'], l90['partialLabels'], l90['futilityControls']) == (86, 17, 176, 38, 14), 'J190 labels'
assert (f90['read'], f90['stopped'], f90['controls'], f90['controlsConfident']) == (124, 38, 14, 1), f90
assert (a90['wallSec'], a90['workerHours'], a90['confidentPerWorkerHour'], a90['confidentPerWorkerHourPoisson95'], a90['confidentPer7Worker10hNight'],
        a90['confidentPer7Poisson95']) == (37331, 62.22, 0.2732, [0.1592, 0.4375], 19.1, [11.1, 30.6]), a90
CTL90 = [x for x in f90['controlList'] if x.endswith('-> confident')]
assert CTL90 == ['s11 d16 k5 gap 0 -> confident'], CTL90
W90 = {}
for line in open(L190 + '/spine-times.txt'):
    f = line.split()
    W90[f[0].split('-')[1]] = W90.get(f[0].split('-')[1], 0) + int(f[2]) - int(f[1])
assert sum(W90.values()) == 37331 and len(W90) == 13
m90 = {k: round(v / 60, 1) for k, v in W90.items()}
ATL90 = {s: json.load(open(one(L190 + '/b-%s-*/atlas.json' % s)))['checks'] for s in SPINES13}
TOOL90 = json.load(open(L190 + '/report/tool.json'))
MET90 = json.load(open(R190 + '/metrics.json'))
NC90 = json.load(open(L190 + '/report/ncurve.json'))
MAPSA90 = sum(lines_in(f, MAPSA_TEXT) for f in glob.glob(L190 + '/b-s??-*/phaseB/logs/*.log'))
TEX90 = {s: logcount(s, 'TimeoutException', L190) for s in SPINES13}
N90 = {'cpwh': '%.3f' % a90['confidentPerWorkerHour'], 'cpwh95': [round(x, 3) for x in a90['confidentPerWorkerHourPoisson95']], 'c7': a90['confidentPer7Worker10hNight'],
       'p95': a90['confidentPer7Poisson95'], 'wh': round(a90['workerHours'], 1), 'wall': a90['wallSec'], 'wallh': round(a90['wallSec'] / 3600, 1),
       'minmin': min(m90.values()), 'maxmin': max(m90.values()), 'smax': max(m90, key=lambda k: m90[k]), 'perSpine': round(l90['branched'] / 13, 1),
       'forks': sum(ATL90[s]['forks'] for s in SPINES13), 'framelogs': sum(ATL90[s]['frameLogs'] for s in SPINES13), 'hook': MET90['atlas_hook_ioobe'],
       'pump': MET90['pump_effect_ioobe'], 'refshare': round(100 * TOOL90['refusedCastShare'], 2), 'mapsa': MAPSA90,
       'kept50s': round(100 * NC90['atN']['50']['keptShare']), 'kept100s': round(100 * NC90['atN']['100']['keptShare']),
       'tex': ', '.join('%s %d' % (s, v) for s, v in TEX90.items() if v), 'dirgeR': TOOL90['refusedCastCards']['Lively Dirge'], 'dirgeL': TOOL90['lostCastCards']['Lively Dirge']}
assert (N90['cpwh'], N90['perSpine'], N90['minmin'], N90['maxmin'], N90['smax'], N90['forks'], N90['framelogs'], N90['hook'], N90['pump'], N90['refshare'], N90['mapsa'],
        N90['kept50s'], N90['kept100s'], N90['tex'], N90['dirgeR'], N90['dirgeL']) == (
    '0.273', 13.5, 15.7, 96.3, 's03', 61450, 122926, 0, 0, 0.74, 1, 48, 64, 's01 195, s06 13, s07 7', 461, 192), N90
# J188's numbers, the population's third night (history): its own report, as derive-j190.py and derive-j191.py read it, unchanged
lb8 = json.load(open(L188 + '/report/labels.json'))
fr8 = lb8['f_futilityRead']
c78 = lb8['c_sizing7']['asRun']
assert (lb8['labels'], lb8['confident'], lb8['branched'], lb8['partialLabels'], lb8['futilityControls']) == (85, 24, 168, 40, 10), 'J188 labels'
assert (fr8['read'], fr8['stopped'], fr8['controls'], fr8['controlsConfident']) == (125, 40, 10, 0), fr8
assert (c78['wallSec'], c78['workerHours'], c78['confidentPerWorkerHour'], c78['confidentPerWorkerHourPoisson95'], c78['confidentPer7Worker10hNight'],
        c78['confidentPer7Poisson95']) == (26057, 43.43, 0.5526, [0.3541, 0.8223], 38.7, [24.8, 57.6]), c78
W8 = {}
for line in open(L188 + '/spine-times.txt'):
    f = line.split()
    W8[f[0].split('-')[1]] = W8.get(f[0].split('-')[1], 0) + int(f[2]) - int(f[1])
assert sum(W8.values()) == 26057 and len(W8) == 13
m8 = {k: round(v / 60, 1) for k, v in W8.items()}
ATL8 = {s: json.load(open(one(L188 + '/b-%s-*/atlas.json' % s)))['checks'] for s in SPINES13}
TOOL8 = json.load(open(L188 + '/report/tool.json'))
MET8 = json.load(open(R188 + '/metrics.json'))
N8 = {'cpwh': '%.3f' % c78['confidentPerWorkerHour'], 'cpwh95': [round(x, 3) for x in c78['confidentPerWorkerHourPoisson95']], 'c7': c78['confidentPer7Worker10hNight'],
      'p95': c78['confidentPer7Poisson95'], 'wh': round(c78['workerHours'], 1), 'wall': c78['wallSec'], 'wallh': round(c78['wallSec'] / 3600, 1),
      'minmin': min(m8.values()), 'maxmin': max(m8.values()), 'smax': max(m8, key=lambda k: m8[k]), 'perSpine': round(lb8['branched'] / 13, 1),
      'forks': sum(ATL8[s]['forks'] for s in SPINES13), 'framelogs': sum(ATL8[s]['frameLogs'] for s in SPINES13), 'hook': MET8['atlas_hook_ioobe'],
      'pump': MET8['pump_effect_ioobe'], 'refshare': round(100 * TOOL8['refusedCastShare'], 2)}
assert (N8['cpwh'], N8['perSpine'], N8['minmin'], N8['maxmin'], N8['smax'], N8['forks'], N8['framelogs'], N8['hook'], N8['pump'], N8['refshare']) == (
    '0.553', 12.9, 12.2, 72.8, 's01', 53435, 106896, 3, 1, 0.13), N8
# J187's numbers, the population's second night (history): its own report, as derive-j188.py to derive-j191.py read it, unchanged
l7 = json.load(open(L187 + '/report/labels.json'))
f7 = l7['f_futilityRead']
a7 = l7['c_sizing7']['asRun']
assert (l7['labels'], l7['confident'], l7['branched'], l7['partialLabels'], l7['futilityControls']) == (83, 28, 163, 47, 10), 'J187 labels'
assert (f7['read'], f7['stopped'], f7['controls'], f7['controlsConfident']) == (130, 47, 10, 0), f7
assert (a7['wallSec'], a7['workerHours'], a7['confidentPerWorkerHour'], a7['confidentPerWorkerHourPoisson95'], a7['confidentPer7Worker10hNight'],
        a7['confidentPer7Poisson95']) == (31071, 51.79, 0.5407, [0.3593, 0.7815], 37.8, [25.2, 54.7]), a7
W7 = {}
for line in open(L187 + '/spine-times.txt'):
    f = line.split()
    W7[f[0].split('-')[1]] = W7.get(f[0].split('-')[1], 0) + int(f[2]) - int(f[1])
assert sum(W7.values()) == 31071 and len(W7) == 13
m7 = {k: round(v / 60, 1) for k, v in W7.items()}
N7 = {'cpwh': '%.3f' % a7['confidentPerWorkerHour'], 'cpwh95': [round(x, 3) for x in a7['confidentPerWorkerHourPoisson95']], 'c7': a7['confidentPer7Worker10hNight'],
      'p95': a7['confidentPer7Poisson95'], 'wh': round(a7['workerHours'], 1), 'wall': a7['wallSec'], 'wallh': round(a7['wallSec'] / 3600, 1),
      'minmin': min(m7.values()), 'maxmin': max(m7.values()), 'smax': max(m7, key=lambda k: m7[k]), 'perSpine': round(l7['branched'] / 13, 1)}
assert N7['cpwh'] == '0.541' and N7['perSpine'] == 12.5 and (N7['minmin'], N7['maxmin'], N7['smax']) == (17.1, 76.1, 's03')
# J186's numbers, the population's first night: the by-hand report and labels.py's --times rerun (derive-j187.py's, registered in J187)
l6 = json.load(open(BYHAND186))
r6 = json.load(open(TIMES186))['c_sizing7']['asRun']
f6 = l6['f_futilityRead']
assert (l6['labels'], l6['confident'], l6['branched'], f6['read'], f6['stopped'], f6['controls'], f6['controlsConfident']) == (81, 21, 153, 115, 34, 13, 0)
assert (r6['workerHours'], r6['confidentPerWorkerHour'], r6['confidentPerWorkerHourPoisson95'], r6['confidentPer7Worker10hNight'], r6['confidentPer7Poisson95'],
        r6['wallSec']) == (60.2, 0.3488, [0.2159, 0.5332], 24.4, [15.1, 37.3], 36121), r6


def poisson95(k):     # labels.py's own (Garwood, by bisection)
    def cdf(n, mu):
        return sum(math.exp(i * math.log(mu) - mu - math.lgamma(i + 1)) for i in range(n + 1)) if mu > 0 else 1.0

    def solve(fn, lo, hi):
        for _ in range(200):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if fn(mid) > 0 else (lo, mid)
        return (lo + hi) / 2
    top = 10.0 * (k + 10)
    lower = 0.0 if k == 0 else solve(lambda mu: cdf(k - 1, mu) - 0.975, 0.0, top)
    upper = solve(lambda mu: cdf(k, mu) - 0.025, 0.0, top)
    return lower, upper


def clopper95(k, n):     # the exact (Clopper-Pearson) 95% interval of k of n, by bisection on the binomial tail
    def tail_ge(p):      # P(X >= k)
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))

    def tail_le(p):      # P(X <= k)
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(0, k + 1))

    def solve(fn, target, rising):
        lo, hi = 0.0, 1.0
        for _ in range(200):
            mid = (lo + hi) / 2
            if (fn(mid) < target) == rising:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2
    lower = 0.0 if k == 0 else solve(tail_ge, 0.025, True)
    upper = 1.0 if k == n else solve(tail_le, 0.025, False)
    return lower, upper


def clopper_hi0(n):     # the exact 95% upper bound of 0 of n
    return 1 - 0.025 ** (1 / n)


assert abs(clopper95(0, 13)[1] - clopper_hi0(13)) < 1e-9 and round(clopper_hi0(13), 4) == fr['controlConfidentShare95'][1], clopper_hi0(13)


def pool(parts):    # [(confident, worker-hours, labels, controls, controlsConfident, stopped, read)]
    pc, pwh = sum(x[0] for x in parts), sum(x[1] for x in parts)
    plo, phi = poisson95(pc)
    p = {'confident': pc, 'labels': sum(x[2] for x in parts), 'wh': round(pwh, 1), 'cpwh': '%.3f' % (pc / pwh), 'cpwh95': ['%.3f' % (plo / pwh), '%.3f' % (phi / pwh)],
         'c7': round(70 * pc / pwh, 1), 'p95': [round(70 * plo / pwh, 1), round(70 * phi / pwh, 1)], 'controls': sum(x[3] for x in parts),
         'ctlConf': sum(x[4] for x in parts), 'stopped': sum(x[5] for x in parts), 'read': sum(x[6] for x in parts)}
    lo, hi = clopper95(p['ctlConf'], p['controls'])
    p['ctlLo'], p['ctlHi'] = round(lo, 3), round(hi, 3)
    p['ctl95'] = '[0, %.3f]' % hi if p['ctlConf'] == 0 else '[%.3f, %.3f]' % (lo, hi)
    return p


P6 = (l6['confident'], r6['workerHours'], l6['labels'], f6['controls'], f6['controlsConfident'], f6['stopped'], f6['read'])
P7 = (l7['confident'], a7['workerHours'], l7['labels'], f7['controls'], f7['controlsConfident'], f7['stopped'], f7['read'])
P8N = (lb8['confident'], c78['workerHours'], lb8['labels'], fr8['controls'], fr8['controlsConfident'], fr8['stopped'], fr8['read'])
P10 = (l90['confident'], a90['workerHours'], l90['labels'], f90['controls'], f90['controlsConfident'], f90['stopped'], f90['read'])
P11 = (lb['confident'], c7['workerHours'], lb['labels'], fr['controls'], fr['controlsConfident'], fr['stopped'], fr['read'])
POOL4 = pool([P6, P7, P8N, P10])    # J186, J187, J188 and J190: J191's registered pool, recomputed
POOL = pool([P6, P7, P8N, P10, P11])    # J186, J187, J188, J190 and J191: the five nights before tonight
assert (POOL4['confident'], POOL4['wh'], POOL4['cpwh'], POOL4['cpwh95'], POOL4['ctlConf'], POOL4['controls'], POOL4['ctl95']) == (90, 217.6, '0.414', ['0.333', '0.508'], 1, 47, '[0.001, 0.113]'), POOL4
assert ("J186's, J187's, J188's and J190's together: %d confident on %.1f worker-hours, %s [%s, %s]" % (90, 217.6, POOL4['cpwh'], POOL4['cpwh95'][0], POOL4['cpwh95'][1])) in SRC_T
assert "1 of 47, exact 95% [0.001, 0.113]" in SRC_T
assert (POOL['confident'], POOL['wh'], POOL['cpwh'], POOL['cpwh95'], POOL['ctlConf'], POOL['controls']) == (115, 281.3, '0.409', ['0.337', '0.491'], 1, 60), POOL   # labels.py's Garwood interval (the 09:50 heartbeat wrote 0.338)
assert abs(round(70 * lb['confident'] / c7['workerHours'], 1) - c7['confidentPer7Worker10hNight']) <= 0.1   # the 7-worker scale is 70 x per worker-hour
N6 = {'cpwh': '%.3f' % r6['confidentPerWorkerHour'], 'cpwh95': [round(x, 3) for x in r6['confidentPerWorkerHourPoisson95']], 'c7': r6['confidentPer7Worker10hNight'],
      'p95': r6['confidentPer7Poisson95'], 'wh': round(r6['workerHours'], 1)}
assert N6['cpwh'] == '0.349'


# J191's draws: lab-j191/report/draws.json's asRun (equal to its recorded), and recomputed from the data folder (draws.py's own drawsha)
def drawsha(dirs):
    hh, n = hashlib.sha256(), 0
    for d in dirs:
        hh.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            hh.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (hh.hexdigest(), n)


DRW = json.load(open(L191 + '/report/draws.json'))
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP191 = ['s%02d-%s-%d' % (k, BANDS[k - 1], J191B + k) for k in range(1, 14)]
VA191 = ['v%02d-%s-%d' % (k, BANDS[k - 1], J191B + 200 + k) for k in range(1, 14)]
assert sorted(DRW['asRun']['spines']) == sorted(SP191) and all(DRW['recorded'][k] == DRW['asRun'][k] for k in DRW['asRun'])
assert all(DRW['asRun']['spines'][x][0] == drawsha([L191 + '/decks/' + x]) for x in SP191) and DRW['asRun']['validation'] == drawsha([L191 + '/validation/' + x for x in VA191])
J191_DRAWS = sorted({DRW['asRun']['spines'][x][0].split()[0] for x in SP191})
J191_VAL = DRW['asRun']['validation'].split()[0]
assert len(J191_DRAWS) == 13
REG_SRC = set(re.findall(r"'([0-9a-f]{64})'", SRC_T))
assert len(REG_SRC & set(re.findall(r"J190_DRAWS = \{([^}]*)\}", SRC_T)[0].replace("'", '').replace(',', ' ').split())) == 13   # J190's are among them
expect('J191\'s 13 spine draws and its validation draw are none of J171-J190\'s registered ones', not (set(J191_DRAWS) | {J191_VAL}) & REG_SRC)

# ======================================================================================================================================
# E. the seeds: J192's block is unused (pc-jobs' jobs/ at its HEAD, the drafts' *.md and *.py, the data folder), and it is the first clean
# block past J191's by the rule that counts every four-digit run not inside a longer digit run (decimals and hex fragments included)
# ======================================================================================================================================
def compact(lo, hi):     # a -w -E alternation for lo..hi, by decade
    out, v = [], lo
    while v <= hi:
        top = min(hi, v // 10 * 10 + 9)
        out.append(str(v) if v == top else '%d[%d-%d]' % (v // 10, v % 10, top % 10))
        v = top + 1
    return out


PCJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'rev-parse', '--short=8', 'HEAD'], capture_output=True, text=True).stdout.strip()
PAT = '|'.join(x for o in (0, 100, 200, 300) for x in compact(BASE + o + 1, BASE + o + 13))
PAT189 = '|'.join(x for o in (0, 100, 200, 300) for x in compact(J189B + o + 1, J189B + o + 13))
PAT191 = '|'.join(x for o in (0, 100, 200, 300) for x in compact(J191B + o + 1, J191B + o + 13))
J189_T = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'show', 'HEAD:jobs/J189-atlas-4b-night-thirteen.md'], capture_output=True, text=True).stdout
J189_USED = sorted({int(x) for x in re.findall(r'(?<![0-9A-Za-z.])(%s)(?![0-9A-Za-z.])' % PAT189, J189_T)})
expect('J189\'s posted file (pc-jobs HEAD) uses its block, which is therefore spent (%d of its 52 seeds named there)' % len(J189_USED), J189_T and len(J189_USED) >= 4)
J191_USED = sorted({int(x) for x in re.findall(r'(?<![0-9A-Za-z.])(%s)(?![0-9A-Za-z.])' % PAT191, SRC_T)})
expect('J191\'s file uses its block (%d of its 52 seeds named there) and lab-j191 holds its 13 spines at game seeds %s' % (len(J191_USED), G191_R),
       len(J191_USED) >= 39 and sorted(os.path.basename(x) for x in glob.glob(L191 + '/b-s??-*')) == ['b-s%02d-%s-%d' % (k, BANDS[k - 1], J191B + 100 + k) for k in range(1, 14)])
expect('J192\'s block lies past J191\'s (deck seeds %s; J191\'s %s and J190\'s %s used, J189\'s %d-%d spent)' % (DECK_R, D191_R, D190_R, J189B + 1, J189B + 13), BASE >= J191B + 13)
# THE SCAN (the rule this file states): every four-digit run not inside a longer digit run, in every job at pc-jobs HEAD, every draft
# (*.md and *.py) but this script and its output, and every folder name under the lab data folder (three levels) ending in -<four digits>
SELF = os.path.basename(os.path.abspath(__file__))
SCAN_TEXT = {}
for f in subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'ls-tree', '--name-only', 'HEAD', 'jobs/'], capture_output=True, text=True).stdout.split():
    SCAN_TEXT['HEAD:' + f] = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'show', 'HEAD:' + f], capture_output=True, text=True).stdout
for f in glob.glob('/home/justin-a/code/pc-results/drafts/*.md') + glob.glob('/home/justin-a/code/pc-results/drafts/*.py'):
    if os.path.basename(f) not in (os.path.basename(DST), SELF):
        SCAN_TEXT[f] = open(f, errors='replace').read()
RUN4 = re.compile(r'(?<![0-9])(\d{4})(?![0-9])')
USED_AT = {}
for f, x in SCAN_TEXT.items():
    for v in set(int(y) for y in RUN4.findall(x)):
        USED_AT.setdefault(v, set()).add(os.path.basename(f.replace('HEAD:', '')))
DATA_NAMES = glob.glob('/home/justin-a/code/lab/data/*/*') + glob.glob('/home/justin-a/code/lab/data/*/*/*')
for p_ in DATA_NAMES:
    m_ = re.search(r'-(\d{4})$', p_)
    if m_:
        USED_AT.setdefault(int(m_.group(1)), set()).add('data:' + p_.replace('/home/justin-a/code/lab/data/', ''))
SCAN = {}
for b_ in range(J191B + 13, BASE + 1):
    SCAN[b_] = sorted(v for v in (b_ + o + k for o in (0, 100, 200, 300) for k in range(1, 14)) if v in USED_AT)
FIRST_CLEAN = min([b_ for b_, v in SCAN.items() if not v] or [None])
BLOCKERS = sorted({v for b_, vs in SCAN.items() if b_ < BASE for v in vs})
NDRAFTS = sum(1 for f in SCAN_TEXT if not f.startswith('HEAD:'))
expect('the scan: every base from %d to %d holds a used value (%d distinct values block them) and %d is the first base whose 52 values are all unused (pc-jobs %s jobs/, %d drafts *.md and *.py, the data folder\'s names)'
       % (J191B + 13, BASE - 1, len(BLOCKERS), BASE, PCJ, NDRAFTS), FIRST_CLEAN == BASE)
# the blockers by where they stand, for the record (the heartbeat note says which bases were skipped and why)
BY_SRC = Counter()
for v in BLOCKERS:
    for f in USED_AT[v]:
        BY_SRC['data' if f.startswith('data:') else ('draft' if f.endswith('.py') or f.startswith(('derive-',)) else 'job/draft md')] += 1
hits = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'grep', '-n', '-E', '(^|[^0-9])(%s)([^0-9]|$)' % PAT, 'HEAD', '--', 'jobs/'], capture_output=True, text=True).stdout.splitlines()
hits += subprocess.run('grep -n -E %s /home/justin-a/code/pc-results/drafts/*.md /home/justin-a/code/pc-results/drafts/*.py' % q('(^|[^0-9])(%s)([^0-9]|$)' % PAT), shell=True, capture_output=True, text=True).stdout.splitlines()
hits = [x for x in hits if os.path.basename(DST) not in x and SELF not in x]
odd = hits      # no exemption: a decimal's digits and a hex fragment count
expect('the seed block %s is unused in pc-jobs %s jobs/ and the drafts (*.md, *.py), decimals and hex fragments counted%s'
       % (PAT, PCJ, '' if not odd else ': %d line(s) name a block value' % len(odd)), not odd)
DATA_HIT = [p_ for p_ in DATA_NAMES if re.search(r'-(%s)$' % PAT, p_)]
expect('no folder under the lab data folder (three levels) ends in one of the block\'s seeds%s' % ('' if not DATA_HIT else ': ' + ', '.join(DATA_HIT)), not DATA_HIT)
LAB192 = '/home/justin-a/code/lab/data/lab-j192'
expect('lab-j192 is absent or empty (made empty before posting; nothing in it)', not os.path.exists(LAB192) or (os.path.isdir(LAB192) and not os.listdir(LAB192)))
PJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'log', '-1', '--format=%h %s', 'HEAD', '--', 'jobs/J191-atlas-4b-night-fourteen.md'],
                    capture_output=True, text=True).stdout.strip()
expect('J191\'s job file at pc-jobs HEAD is the one posted (%s), and SRC is it byte for byte' % PJ[:8],
       PJ and subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'show', 'HEAD:jobs/J191-atlas-4b-night-fourteen.md'], capture_output=True, text=True).stdout == SRC_T)
J191_COMMIT = PJ[:8]
PJ90 = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'log', '-1', '--format=%h', 'HEAD', '--', 'jobs/J190-atlas-4b-night-thirteen.md'],
                      capture_output=True, text=True).stdout.strip()
J190_COMMIT = PJ90[:8]
assert J190_COMMIT == '6d5214d0' and J191_COMMIT == 'd9c95fcd', (J190_COMMIT, J191_COMMIT)
R189 = '/home/justin-a/code/pc-results/results/J189'
ST189 = open(R189 + '/STATUS').read()
assert ST189.startswith('failed') and 'draws.newDraws13 == 13 (draws.newDraws13 = 0)' in ST189 and 'draws.newValidation == 1 (draws.newValidation = 0)' in ST189, ST189[:300]
assert 'finished: 2026-11-04T11:13:06-05:00' in ST189 and ('mtg-table: %s' % J191PIN[:7]) in ST189
J189_LOG = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'log', '-1', '--format=%h %ci', 'HEAD', '--', 'jobs/J189-atlas-4b-night-thirteen.md'],
                          capture_output=True, text=True).stdout.split()
J189_COMMIT, J189_POSTED = J189_LOG[0], J189_LOG[2][:5]
assert J189_COMMIT == '005d0e25' and J189_LOG[1] == '2026-11-04', J189_LOG
assert re.search(r"SP = \['s%02d-%s-%d' % \(k, BANDS\[k - 1\], 2465 \+ k\)", J189_T)     # the bug, in the posted file
assert re.search(r"SP = \['s%02d-%s-%d' % \(k, BANDS\[k - 1\], 2816 \+ k\)", SRC190_T)   # J190's own base
assert re.search(r"SP = \['s%02d-%s-%d' % \(k, BANDS\[k - 1\], 2900 \+ k\)", SRC_T)      # J191's own base, which this shift moves
PIN_SUBJ = git('log', '-1', '--format=%s', PIN).strip()
SUBJ = PIN_SUBJ if len(PIN_SUBJ) <= 150 else PIN_SUBJ[:150].rsplit(' ', 1)[0] + ' ...'
SUBJ191_FULL = git('log', '-1', '--format=%s', J191PIN).strip()
SUBJ191 = SUBJ191_FULL if len(SUBJ191_FULL) <= 150 else SUBJ191_FULL[:150].rsplit(' ', 1)[0] + ' ...'
expect('J191\'s file quotes its own pin\'s subject (%s)' % J191P8, ('(%s: "%s")' % (J191P8, SUBJ191)) in SRC_T)
D510C, D511C = DEC['D510'][1][:8], DEC['D511'][1][:8]
NUMS = '; '.join('%s %s/%s (%s)' % (f.replace('bridge/src/mtgtable/', '').replace('tools/cubelab/', ''), a, d, dn) for f, (a, d, dn) in sorted(ADMIT.items()))
MOVED_PROSE = ', '.join('`%s`' % f for f in MOVED if not f.startswith('fixtures/negative/redaction/')) + ' and %d files under `fixtures/negative/redaction/` (D513\'s four controls and the manifest)' % sum(1 for f in MOVED if f.startswith('fixtures/negative/redaction/'))
TODAY = datetime.now().strftime('%Y-%m-%d')

# ======================================================================================================================================
# the stash machinery (derive-j183's)
# ======================================================================================================================================
t = SRC_T
n0 = len(t.splitlines())
FAIL = []
STASH = {}


def key():
    return '\x00S%d\x00' % len(STASH)


def put(old, new, count=1):
    """Replace `old` (J191's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
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


ADMIT_PROSE = ', '.join('`%s` %s/%s' % (f.replace('bridge/src/mtgtable/', ''), a, d) for f, (a, d, _) in sorted(ADMIT.items()))
TEXS = ', '.join('%s %d' % (s, v) for s, v in TEX.items() if v)
TOUTS = ', '.join('%s %d' % (s, v) for s, v in TOUT.items() if v)
WARNS = ', '.join('%s %d' % (s, v) for s, v in WARN.items())
NDROP, NRAISE = sum(1 for x in PRESSURE if x[1] == 'drop'), sum(1 for x in PRESSURE if x[1] == 'raise')
POOLED_BEFORE = (f"J186's, J187's, J188's, J190's and J191's together: {POOL['confident']} confident on {POOL['wh']} worker-hours, {POOL['cpwh']} "
                 f"[{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}]")
S08 = ("s08's atlas (its exit 3) sent 2 of its %s branch frame logs through `tools/check-redaction.mjs` and saw them fail "
       "(`d7-random-o1-b121-seat0`, line 501, and `d7-random-o1-b5-seat0`, line 261)" % format(ATL['s08']['frameLogs'], ','))

# ======================================================================================================================================
# 0. the history paragraphs, rewritten (J191's night; the pin moved by D513's merge)
# ======================================================================================================================================
span('**Why J191.**', '**Before posting -- the coordinator', f'''**Why J192.** J191 (rung 4b, night fourteen, the fifth of D508's population, pin {J191P8}) ran 2026-11-04 22:27 to 2026-11-05 09:20
EST, all 13 spines, its scan and its Report, all {len(BLOCKS)} blocks exit 0, and **failed one of the runner's {len(CHECKS)} final checks on a
checker misread, not on a leak**: `atlas.problems == 0` read 1, because {S08}. In both, seat 0 activated Oko, Thief of Crowns' -5
to exchange a permanent of its own for the opponent's Oracle of Mul Daya, and the snapshot was cut inside the exchange: the Oracle still
listed under the opponent's battlefield with its `controller` field already the viewer's, the opponent's public top card still listed;
rule A3 vouched for the `controller` field, so it refused the one card the frame before had accepted. Nothing hidden was shown, and the
viewer learned nothing. **D513** (checker, fixtures and docs only, free under D509 point 1; added by {D513C}, merged as {P8}) makes a
revealer vouch for the top card of the player whose battlefield lists it: the pin's checker passes both logs (J191's pin's fails them;
derive-j192.py runs both), and, by D513's census, all {MET['atlas.scanLogs']:,} of J191's branch frame logs. **J191's thirteen spines stand and are pooled**
(D513 says so: the night's one failed check was the checker's own misread). Its STATUS stays what the runner wrote, `failed` ({len(CHECKS) - 1} of
{len(CHECKS)} checks PASS, the one FAIL that check); its Report had already written `lab-j191/report/`, so the read is complete:
{N['branched']} branched decision rows ({N['decb']} decisions), {N['labels']} labels, {N['confident']} confident, {N['partial']} partial, {N['controls']} controls ({N['ctlConf']} of them confident at the full
n), **{N['cpwh']} confident labels a worker-hour** [{N['cpwh95'][0]}, {N['cpwh95'][1]}] ({N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; J190's {N90['cpwh']}, J188's {N8['cpwh']},
J187's {N7['cpwh']}, J186's {N6['cpwh']}), at 6 workers sized, {N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest), {N['wh']}
worker-hours, {N['games']:,} branch games, {MET['branch_timeouts']} branch timeout ({TOUTS}; `timeoutShare` 0.00002), peak RSS {MET['peak_worker_rss_gb']} GB a worker, {N['gb']} GB on the
data folder. **It too ran beside GPU rounds** on the same machine: its STATUS records {len(PRESSURE)} memory-pressure events -- {NDROP} drops to 5
workers and {NRAISE} raises, each episode back at 6 workers within {min(EPI)} to {max(EPI)} minutes -- so, like J190's, its worker-hours are not a
clean pace (*Sizing*). What it showed, each read in its folder:
- **D511 held again**: every one of the night's {FORKS:,} branch forks was the baseline's position (atlas.json's fork check, 0 not the
  position on all 13 spines), and `replay_diverged` is 0 (J186: 31; J187, J188 and J190: 0).
- **The checker**: {FRAMELOGS:,} frame logs, 2 failed, both s08's and both the shape D513 admits; no failure of J187's s06 shape (D512),
  of J186's all-hidden target record (D510) or of any other.
- **The seat queue's rows 6, 7 and 8 did not recur**: `refusedCastOptions` 0 and `lostCastOptions` 0 (no option over either bar; the
  night's refused share {REFSHARE}%, J190's {N90['refshare']}%; Lively Dirge not dealt), `atlas_hook_ioobe` 0 (J190: 0, J188: {N8['hook']}, J187: 58) and
  `atlas_mapsa_ise` 0 (J190: {N90['mapsa']}).
- **J182's engine stack, the most of any night**: `pump_effect_ioobe` {N['pump']}, all s12's, = `branch_error_stacks` {N['errs']} -- {N['errs']} errored
  branches over nine of its decisions, every one Forge's `PumpEffect.java:299` `IndexOutOfBoundsException` (J190: 0, J188: {N8['pump']}, J187:
  60); an engine fault, information, never a verdict on a card.
- **D508's gate left a last-known copy out, the first time in this population**: `lki_candidates` {N['lki']} (J186, J187, J188 and J190: 0),
  all s13's, at d21, card 5 -- the `[lki]` line D508 prints when a record leaves such a copy out; no checker failure came with it.
  Information.
- **D479's exile-link counter, non-zero for the first time in this population**: `exileLinksLost` {N['exl']:,} branch rows (= links) --
  s01 {EXLB['s01']:,} of its {EXL_S01_ROWS:,} rows (every branch row from d10 on; its decks hold the Landscape cycle) and s03 {EXLB['s03']} (every row
  of d19-d22): the fork's copy could not carry a card's "exiled with" link, and the branches played on. Not a check and not a
  seat-queue row (D509); J192 reads it per spine, as information.
- **The futility read**: {N['read']} read, {N['futile']} futile, {N['stopped']} stopped, {N['controls']} controls, {N['ctlConf']} of them confident at the full n (this night's
  exact 95% [0, {fr['controlConfidentShare95'][1]}]); pooled over the five nights, {POOL['ctlConf']} of {POOL['controls']}, exact 95% {POOL['ctl95']}.
- **The cap read**: of the final {N['confident']} confident, {N['kept50']} ({N['kept50s']}%) were expected confident at 50 branches and {N['kept100']} ({N['kept100s']}%) at
  100 (`ncurve.json`; J190's 48% and 64%).
- **Agreement on the three Forge-map spines, NOT SHOWN, as every night**: same best {SB['point']:.2f} [{SB['interval'][0]:.2f}, {SB['interval'][1]:.2f}] (n {SB['n']}); C1
  cast-now {C1['random']['point']:.3f} [{C1['random']['interval'][0]:.3f}, {C1['random']['interval'][1]:.3f}] on the random map and {C1['forgeMap']['point']:.3f} [{C1['forgeMap']['interval'][0]:.3f}, {C1['forgeMap']['interval'][1]:.3f}] on Forge's.
J191's other signals: 0 `[ghost]` lines, 0 `StackOverflowError`s, 0 Forge NPEs, and {N['tex']} `TimeoutException` lines in the worker
logs ({TEXS}), none a branch error; {sum(WARN.values())} options capped past the warning bar ({WARNS}; warnings, never a check). By
position against J190: {N['confident']} confident against {l90['confident']}, {N['cpwh']} a worker-hour against {N90['cpwh']} -- a candidate, never a verdict (other decks).

**J189's block stays spent.** J189 (posted 2026-11-04 at {J189_POSTED} EST, pc-jobs {J189_COMMIT}) failed at its pilot on J188's unshifted
seed bases; J190 (pc-jobs {J190_COMMIT}) was that night again, on the next block, and J191 (pc-jobs {J191_COMMIT}) the night after it. A
failed job is never reopened: nothing reads lab-j189, and J189 is no night of this population, pooled or compared. **J191 is not that
case**: it ran to its Report, failed only on the checker's misread, and its data stands (D513).

**The pin: {P8}, D513's merge.** Exactly one lane merged into mtg-table since J191 was posted: D513, on J191's pin {J191P8}.
`git diff {J191P8} {P8}` names {MOVED_PROSE}: the checker, its self-test, the fixture generator, its fixtures and docs, free
under D509 point 1 as D512 was, and nothing in D509's frozen set or the deck code. So the seat, its record, the replay and the
determinizer are J191's byte for byte -- D510 (the target record writes a target the seat cannot see as `option:hidden`: record-only,
D509 point 2; added by {D510C}), D511 (an atlas unit's replay records into a sink that writes nothing: `CubeLab.java` between landings,
D509 point 1; added by {D511C}) and D512 (the redaction checker admits J187's s06 hideaway shape: a checker admission; added by {D512C}), each as J188's *Why J188* states it --
and only the checker the atlas runs over every frame log has moved: **D513** (A3's revealed top card is the zone's player's, not the
`controller` field's; added by {D513C}). The frozen set's numstat since J186's pin is J191's, J190's and J188's
(`git diff --numstat e557dedf <pin> -- {FROZEN}`: {ADMIT_PROSE}), and every pin-decided line of this pilot is J191's, recomputed at the new pin and equal byte for byte.
**The seat queue** (`/home/justin-a/code/pc-results/study/seat-queue.md`, D509 point 3) holds rows 1-8, none landed and none fixed tonight:
1-4 the cube lab's follow-ups 27, 28, 30 and 31 (D509's), 5 Forge's AI memory left unrestored by `Decisions.quiet` (D511's diagnosis),
6 J187's Lively Dirge (a mode-cost spell the gate offers on its base cost; J188's and J190's s02 under the bar, not dealt
on J191), 7 J187's s04 `PlayEffect.java:90` errors (J188's s11: {N8['hook']}; J190 and J191: 0) and 8 J190's s12 d16 `SearchPolicy.mapSa`
IllegalStateException, a Mystic Forge may-play cast not found on the fork's copy (J191: 0). D513 is no row: it fixed the checker, not the
seat.

J192 is J191's night carried onto D513's merge: the same seat, the same design, the same pilot, the same reads and checks, 13 new spines
at the next seeds in a new folder, `lab-j192`. J191's own outputs stay in `lab-j191/` and are read only, for the J191 columns. **J192 is
D508's population's SIXTH night**: what the seat plays and offers is J186's, J187's, J188's, J190's and J191's (D509; D510 changed the
record, D511 the replay, both before J188's pin; D513 the checker only), so J192's labels pool with J186's twelve finished spines,
J187's thirteen, J188's thirteen, J190's thirteen and J191's thirteen under the same pool names, `random-<band>-d508`, and J185's numbers
(D507's population, one night) are read beside, as information, never added. A reader pooling the six nights leaves out the rows of units
whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16; D509 point 4), J187's s03 decisions whose forks were not
the position, and tonight's if any (J188, J190 and J191 had none: J191's two s08 logs were the checker's misread, D513); no mechanism
drops them today.

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', f'''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j192` was made, empty, by the drafting session on {TODAY} (`mkdir`, and
   nothing else); the owner checks before posting that `ls -A` prints nothing. The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j192/`,
   from an earlier J192 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `{PIN}` ({P8}: "{SUBJ}"), written by
   `drafts/derive-j192.py` from its one argument, which must be main's head, on origin/main (J184 failed at its prepare step on a pin
   that was merged but not pushed), a descendant of J191's pin {J191P8} and apart from it by D513's files alone; no placeholder pin is
   left in this file. **It is D513's merge on J191's pin**: `git diff {J191P8} <pin>` names only the checker, its self-test, the fixture
   generator, its fixtures and docs (derive-j192.py checks every path and every commit), so D509's frozen set is J191's, and `seat_code`
   admits exactly D510's and D511's numstat since J186's pin e557dedf, nothing else -- J191's line, which is J190's and J188's. **If
   main moves before posting, the pin stays {P8}** unless the owner says otherwise: a pin with anything merged since is a new derivation
   (a frozen-set diff other than D510's and D511's is NOT POSTABLE inside D508's population; D509: a landing has a decision and a
   population of its own).
3. **The names this file reads were computed against the pin itself** (derive-j192.py, from `git show`/`git diff` at {P8}, exactly as
   derive-j188.py to derive-j191.py computed them): the decision files D505-D508 and D510-D512 and the names each `has_d505` to
   `has_d508` and `has_d510` to `has_d512` line reads, `seat_code` (bridge/src since 0a6cf5c1, 3275af30, ac07876b, 7a984963, 6e87e5d4 and
   480c837d, the golden, SearchPolicy.java's numstat: J187's lists plus D510's four files; then the frozen set's numstat since e557dedf,
   exactly D510's and D511's), `deck_code` (the blobs and sha256s) and the commits that added D481-D512's decision files -- **every one
   J191's line, byte for byte, and J190's** (but its folder and stamp), which derive-j192.py checks. It then runs this file's own pilot
   lines for all of them against the pin (a `git archive` of it, HEAD read as the pin) and requires each to print 1. **D513 adds no
   pilot line**: derive-j192.py checks its names at the pin (its decision file and commit, its four controls with their self-test
   verdicts, `revealedTopsOf` in the checker), runs the pin's checker on J191's two s08 logs (both pass; J191's pin's fails both) and the
   pin's checker self-test (it passes), and this pilot's `redaction_self` runs that self-test again, D513's controls among it. The
   script says when a pin misses one and is then NOT POSTABLE -- a guard is never loosened to pass. D466-D504's greps are J183's,
   unchanged.
4. **J191 has ended** (2026-11-05 09:20; {len(CHECKS) - 1} of its {len(CHECKS)} final checks passed and `atlas.problems == 0` failed on s08's two logs, the
   checker's misread D513 admits; its Report written, `lab-j191/report/`). J192 reads lab-j191 read-only, for its J191 columns; nothing
   waits on another job, so there is **no `after:` line**. J191's job file needs nothing. J189 (failed at its pilot) is not reopened, and
   nothing reads lab-j189.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J192 pools with J186, J187, J188, J190 and J191 and
   compares with J191 position by position, and a change of design would split the population's nights.
6. **Nothing else to make, move or clean.** J192 reads lab-j170 (J171's night), lab-j191 (J191's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, J182's and J183's from their `report/draws.json`, read on 2026-11-02, J185's from
   `lab-j185/report/draws.json`, read on 2026-11-03, J186's from its pilot's `var/lab-j186-local/draws-pilot.json` in the lab clone,
   equal to lab-j186's draw as derive-j187.py recomputed it, read on 2026-11-03, J187's from `lab-j187/report/draws.json`'s `asRun`,
   equal to its `recorded` and to its data folder's draw as derive-j188.py recomputed it, read on 2026-11-04, J188's from
   `lab-j188/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as derive-j190.py recomputed it, read on
   2026-11-04, J190's from `lab-j190/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as
   derive-j191.py recomputed it, read on 2026-11-04, and J191's from `lab-j191/report/draws.json`'s `asRun`, equal to its `recorded` and
   to its data folder's draw as derive-j192.py recomputed it, read on {TODAY}), so it reads no `var/lab-j1xx-local/` folder but its own.
   Post nothing that writes lab-j191 or lab-j192 beside J192.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare', f'''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough";
  D508's population holds J186's {f6['controls']}, J187's {f7['controls']}, J188's {fr8['controls']}, J190's {f90['controls']} and J191's {fr['controls']} controls before tonight ({POOL['ctlConf']} of {POOL['controls']} confident,
  exact 95% {POOL['ctl95']}: J190's s11 d16 the one), and tonight's ~6-14 are its sixth input (D507's holds J185's 13, D498's J182's 6
  and J183's 11, D497's J181's 13, D493's J177's 12 and J180's 14: 0 of 69 confident, all read beside); 0.25 holds until this
  population's pooled count can carry the read.
''')

span("**So J191 is D508's population's fifth night, on new spines**", '**The seeds are new', '''**So J192 is D508's population's sixth night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's (D510's
target record shape), the copier's carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's
(`Decisions.visible`: a candidate judged where the game holds the card now, never by a last-known copy's own zone; D507's Stack rule kept
over that card), what it plays and offers J186's, J187's, J188's, J190's and J191's (D509) -- so `pool: random-<band>-d508`, `randomSeat:
"D508"`, contract v6, **pooled with J186's, J187's, J188's, J190's and J191's rows**. **Breadth over depth:** 13 new pairs at the next 13
deck seeds (the bands cycled as J166's, so s01 is pauper and s13 pauper again), into a new folder. **J191's numbers are a comparison by
position and, with J186's, J187's, J188's and J190's, the pooled read's inputs, never a baseline**: s01 beside s01 is the same band, the
same seat and the same branching design, but other decks and other seeds -- every difference is a candidate. J185's, J183's, J182's,
J181's, J180's, J177's, J173's and J171's nights stay other populations and appear only in the readers' self-tests, their registered
expectations and J177's sizing paragraph.

''')

SAMPLE_BASES = (J191B + 13, 3300, BASE - 1)
BLOCK_SAMPLE = ', '.join('%d (%s)' % (b_, ', '.join(str(v) for v in SCAN[b_][:2])) for b_ in SAMPLE_BASES)
SEEDS_P = f'''**The seeds are new** (checked by derive-j192.py, {TODAY}): a new block -- deck seeds **{DECK_R}** (`$(({BASE} + K))`), game
seeds **{GAME_R}** (the deck seed + 100), validation deck seeds **{VAL_R}** (`$(({BASE + 200} + K))`) with game seeds **{RES_R}**
reserved. **J191's block is used** (deck seeds {D191_R}, game seeds {G191_R}, validation deck seeds {V191_R}, reserved game seeds
{X191_R}: lab-j191's), **J190's block is used** (deck seeds {D190_R}, game seeds {G190_R}, validation deck seeds {V190_R}, reserved
game seeds {X190_R}: lab-j190's), and **J189's block is spent**: J189 was posted (pc-jobs 005d0e25) with deck seeds {J189B + 1}-{J189B + 13}, game seeds
{J189B + 101}-{J189B + 113}, validation deck seeds {J189B + 201}-{J189B + 213} and reserved game seeds {J189B + 301}-{J189B + 313}, and failed at its pilot (its computed bases
were J188's, so it drew J188's decks and none of its own); a posted job's seeds are spent, run or not. **The block is the first past
J191's whose 52 values are all unused in any role**: derive-j192.py reads every four-digit run that is not part of a longer digit run --
a decimal's digits and a hex fragment counted -- in every job at pc-jobs {PCJ} (`jobs/`, J191's post), in the drafts' `*.md` and `*.py`
(derive-j192.py and this file excepted) and in the folder names under `/home/justin-a/code/lab/data` (three levels deep), and every base
from {J191B + 13} (the block right after J191's) to {BASE - 1} holds at least one used value ({len(BLOCKERS)} distinct values block them; for example {BLOCK_SAMPLE}),
while {BASE} holds none. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -E '(^|[^0-9])({PAT})([^0-9]|$)' {PCJ} -- jobs/`
and the same grep over `/home/justin-a/code/pc-results/drafts/*.md` and `*.py` find {len(odd)} line(s) naming a value of this block, and no
folder under the lab data folder ends in one -- {'none' if not odd and not DATA_HIT else 'SEE derive-j192.py: NOT POSTABLE until the block is moved'}; every computed seed in a job or draft
is an earlier block's (`$((2000 + K))` to J181's `$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391,
with the older blocks' small ones below 1700), J182's, J183's, J185's, J186's, J187's and J188's `$((2400 + K))`, `$((2413 + K))`,
`$((2426 + K))`, `$((2439 + K))`, `$((2452 + K))`, `$((2465 + K))` and their companions (2401-2478, 2501-2578, 2601-2678, 2701-2778,
lab-j182's to lab-j188's; J184 reserved J185's block and never drew; J186's, J187's and J188's validation game seeds 2740-2778 stay
reserved for the job that branches them), J189's spent `$(({J189B} + K))`, J190's `$(({J190B} + K))` and `$(({J190B + 200} + K))` ({D190_R},
{G190_R}, {V190_R}; {X190_R} reserved), or J191's `$(({J191B} + K))` and `$(({J191B + 200} + K))` ({D191_R}, {G191_R}, {V191_R};
{X191_R} reserved). **The game seeds stay in the 3xxx range** ({GAME_R}), so every `lab-j192` glob reads `b-s??-*-3???`, as J191's
read lab-j191's (the runner's `lines`/`count` globs know only `*` and `?`, and lab-j192 holds no other `b-s` folder: the smoke's is
`pilot-smoke-j192`), the pilot's read of the comparison's `lab-j191` reads `b-s??-*-30??`, and compare.py's one glob over both nights
reads `b-s??-*-3???` (Python's glob). Bases and literals were moved together by one inclusive shift of J191's block, **the bases
included** ([{J191B}, {J191B + 13}], [{J191B + 100}, {J191B + 113}], [{J191B + 200}, {J191B + 213}] and [{J191B + 300}, {J191B + 313}], +{SHIFT}: J191's file builds its seeds as
`{J191B} + k` and `$(({J191B} + K))`; J189's shift, which left the bases J188's, is the trap this guards), skipping any number touching a
letter, a dot or a hex digit; every changed four-digit token was read in context (derive-j192.py's audit), and a guard fails the
derivation if any line outside its explicit list of history lines names a seed or base of J188's, J189's, J190's or J191's
four families: RESTORED_SENTENCE The smoke keeps J166's pair (deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167;
that pair holds none of the nine cards D482-D506 list, and its redraw on the nine-card list (at aab15d29, D506's merge) gave J166's
registered sha256 back (`edfdc861...`, 0 skips), so its draw on the list is J166's.

'''
span('**The seeds are new', '## The decks', '\x00SEEDS\x00')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J192's own name, J191 as the comparison, J190, J188, J187 and J186 kept as
# the pool's)
# ======================================================================================================================================
span("and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,", "**The deck code is J171's pin's", """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's, J185's, J186's, J187's, J188's, J190's or J191's 13 registered draws, and the validation draw none of theirs (a guard
against an unshifted seed; J177's are registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`,
J186's from its pilot's `draws-pilot.json` in the lab clone -- J186's Report never ran -- equal to its data folder's draw as
derive-j187.py recomputed it, J187's from `lab-j187/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw
as derive-j188.py recomputed it, J188's from `lab-j188/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's
draw as derive-j190.py recomputed it, J190's from `lab-j190/report/draws.json`'s `asRun`, equal to its `recorded` and to its data
folder's draw as derive-j191.py recomputed it, and J191's from `lab-j191/report/draws.json`'s `asRun`, equal to its `recorded` and to
its data folder's draw as derive-j192.py recomputed it).

""")
span("**The deck code is J171's pin's plus exactly D490, D492, D494 and D506**", "**The sha256s are recorded, not registered.**", f'''**The deck code is J171's pin's plus exactly D490, D492, D494 and D506** (`deck_code`, the pilot; every value computed from the pin by
derive-j192.py and equal to J186's, J187's, J188's, J190's and J191's, unchanged since J185's pin 0a6cf5c1: D508-D513 touch no deck
file): `cubes/library/` untouched since J171's pin f2b4e9c2; `tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in {len(D_OUT)} lines out and
{len(D_IN)} in and nothing else -- the header comment of its point 5 (the list's cards and decisions named, D506's wording: what lists a card is
the file's own `about`) and the doc comment and the error message of `parseEngineUnplayable`, the throw's condition unchanged -- the
changed lines' sha256s registered; and `tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made nine, in this order:
Scute Swarm unchanged, Chain of Smog as at J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus
of Ideation, Studious First-Year (D492) and Ob Nixilis, the Adversary (D494), each `since: "J176"`, then Old Man of the Sea and Rubinia
Soulsinger (D506), each `since: "J183"`; and both files' blobs are the pin's, byte for byte (last changed by {LASTS}, the `about` line's
D506 sentence included). J185's, J186's, J187's, J188's, J190's and J191's guards accepted the same nine, and so does this one, nothing
else, so **the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger**.

''')
put("| J190 at this position (the same population, D508's fourth night; the same seat and design; other decks): decisions branched, confident labels, wall |",
    "| J191 at this position (the same population, D508's fifth night; the same seat and design; other decks): decisions branched, confident labels, wall |")
span("(J190's numbers from `lab-j190/report/labels.json`'s `bySpine`", "Folders: `lab-j191/decks/", f'''(J191's numbers from `lab-j191/report/labels.json`'s `bySpine` (`rows`, `confident`) and `lab-j191/spine-times.txt`, read only on
{TODAY}; all thirteen at 6 workers. compare.py reads J191's column again at the Report from the same files, with the same code as
this night's.)

''')
span("**Sizing: J177's, unchanged; J190's, J188's and J187's walls beside it.**", "measured the design:",
     f"""**Sizing: J177's, unchanged; J191's, J190's, J188's and J187's walls beside it.** J191's thirteen spines, all at 6 workers, took
{N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest, inside `timeout: 3h` by {round(180 - N['maxmin'])} min), {N['wh']} worker-hours,
{N['games']:,} branch rows, {N['branched']} decisions branched ({N['perSpine']} a spine; J190's {l90['branched']}, {N90['perSpine']}; J188's 168, {N8['perSpine']}; J187's 163, {N7['perSpine']}; J186's 153 on
twelve spines, 12.8; J185's 187, 14.4; J183's 161, 12.4; J182's 198, 15.2; J181's 153, 11.8; J180's 105, 8.08). **J191's walls, like
J190's, are not a clean pace**: it ran beside GPU rounds on the same machine, with {len(PRESSURE)} memory-pressure events in its STATUS (worker
drops and raises, each episode back at 6 workers within {min(EPI)} to {max(EPI)} minutes), and J190's thirteen took {N90['wall']:,} s ({N90['wallh']} h; {N90['minmin']} to
{N90['maxmin']} min, {N90['smax']} the longest) beside another, so **J188's and J187's walls remain the sizing reference**: J188's thirteen took
{N8['wall']:,} s ({N8['wallh']} h; {N8['minmin']} to {N8['maxmin']} min, {N8['smax']} the longest), J187's {N7['wall']:,} s ({N7['wallh']} h; {N7['minmin']} to {N7['maxmin']} min, {N7['smax']} the longest) and
J186's twelve 36,121 s (10.0 h; 14.0 to 150.0 min, s04 the longest). J191's s07, {N['maxmin']} min, is the population's longest spine but
J186's s04. J177
""")
put("| `pool` | **`random-<band>-d508`**: D508's population, J186's, J187's, J188's, J190's and this night's; never",
    "| `pool` | **`random-<band>-d508`**: D508's population, J186's, J187's, J188's, J190's, J191's and this night's; never")
put("(labels.py's `--seat` default, D508 as J186's, J187's, J188's and J190's; their rows say \"D508\" too, J185's \"D507\"",
    "(labels.py's `--seat` default, D508 as J186's, J187's, J188's, J190's and J191's; their rows say \"D508\" too, J185's \"D507\"")
put("""**Pooled
  with J186's, J187's, J188's and J190's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's
  docs (e557dedf, 43043fe5) and by D510's record and D511's replay (fe063f94, J188's, J190's and this night's), neither a change to what the
  seat plays or offers) **and never with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows,
  J173's v5 rows, or v1-v4** (D489, D508, D509, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or
  `randomSeat`), never on the five nights' `sha` alone, and leaves out the rows of units whose logs failed the checker on a
  hidden-information fault (J186's s11 d13-d16; D509 point 4) and J187's s03 decisions whose forks were not the position (J188's *Why
  J188*); J188 and J190 had neither.""",
    f"""**Pooled
  with J186's, J187's, J188's, J190's and J191's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by
  D509's docs (e557dedf, 43043fe5), by D510's record and D511's replay ({J191P8}, J188's, J190's and J191's) and by D513's checker ({P8},
  this night's), none a change to what the seat plays or offers) **and never with J185's v6 rows (D507's population), J183's or J182's
  (D498's), J181's, J180's or J177's v6 rows, J173's v5 rows, or v1-v4** (D489, D508, D509, *Comparability*; `decides:`): a model that
  reads several nights splits on `pool` (or `randomSeat`), never on the six nights' `sha` alone, and leaves out the rows of units whose
  logs failed the checker on a hidden-information fault (J186's s11 d13-d16; D509 point 4) and J187's s03 decisions whose forks were not
  the position (J188's *Why J188*); J188, J190 and J191 had neither (J191's two s08 logs failed on the checker's misread, D513, not on a
  hidden-information fault).""")
span("Beside it, **J190's** (THE SAME POPULATION's fourth night", "review's ~46 [41, 51] a 7-worker night**", f"""Beside it, **J191's** (THE SAME POPULATION's fifth night, read from `lab-j191/report/labels.json` at
  the Report, `--j191=`: {N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}] on {N['wh']} worker-hours, thirteen spines, beside GPU rounds: not a clean pace),
  **J190's** (its fourth night, registered here from `lab-j190/report/labels.json`: {N90['cpwh']} [{N90['cpwh95'][0]}, {N90['cpwh95'][1]}] on {N90['wh']} worker-hours, thirteen
  spines, beside a GPU round), **J188's** (its third night, registered here from `lab-j188/report/labels.json`: {N8['cpwh']} [{N8['cpwh95'][0]}, {N8['cpwh95'][1]}] on
  {N8['wh']} worker-hours, thirteen spines), **J187's** (its second night, registered here from `lab-j187/report/labels.json`: {N7['cpwh']} [{N7['cpwh95'][0]}, {N7['cpwh95'][1]}]
  on {N7['wh']} worker-hours, thirteen spines), **J186's** (its first night, registered here from the coordinator's by-hand report, J186 having
  been aborted before its Report: {N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}] on {N6['wh']} worker-hours, twelve spines) and **the six nights pooled** (their
  confident labels over their worker-hours, by hand at the morning read; {POOLED_BEFORE}), then, **as
  information**, J185's 0.376 (D507's one night), J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563, other
  populations, and **the
  """)
span("**This night's numbers are the FIFTH contribution", "- **(g) the cap read**", f"""**This night's numbers are the SIXTH contribution
  to D508's population's pooled read** (`pooledInputs`): J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']} stopped, {f6['read']} read; the
  by-hand report's `f_futilityRead`, registered here), J187's {f7['controlsConfident']} of {f7['controls']} ({f7['stopped']} stopped, {f7['read']} read; its report's `f_futilityRead`,
  registered here), J188's {fr8['controlsConfident']} of {fr8['controls']} ({fr8['stopped']} stopped, {fr8['read']} read; its report's `f_futilityRead`, registered here), J190's
  {f90['controlsConfident']} of {f90['controls']} ({f90['stopped']} stopped, {f90['read']} read; its report's `f_futilityRead`, registered here; its s11 d16 the population's first
  confident control) and J191's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read; `c_sizingRead.j191.futilityRead`) are the first five --
  {POOL['ctlConf']} of {POOL['controls']}, exact 95% {POOL['ctl95']} -- and the six are added by hand at the morning read; J185's 0 of 13 (D507's), J183's 0 of 11
  and J182's 0 of 6 (D498's), J181's 0 of 13 (D497's), J177's 0 of 12 and J180's 0 of 14 (D493's) are read beside, as information,
  never added.
""")
span("- **(xvii) J191 beside J190, BY POSITION", "- **(xi)** the draws", """- **(xvii) J192 beside J191, BY POSITION, DIFFERENT DECKS, THE SAME POPULATION (D508's), THE SAME SEAT AND DESIGN**
  (compare.py, `report/compare-j191.json`; J191's column computed from its folders and report with the same code): per spine position
  and for the night, decisions listed per baseline turn, decisions branched, branched in full, partial labels, options per decision
  branched, labels, confident labels, the confident share, **confident labels per worker-hour**, the mean regret at Forge's choice, the
  capped share, the branch games and the wall. **A candidate, never a verdict**: the decks differ at every position and the seat does
  not, so no difference is the seat's; J191's walls ran beside GPU rounds (not a clean pace), its s12 carries 81 of J182's engine stack
  (`pump_effect_ioobe`), its s01 and s03 lost an exile link on every branch row past a decision (D479's `exileLinksLost`) and its s08
  two frame logs the checker misread (D513).
""")
put("""unchanged, by derive-j187.py, derive-j188.py, derive-j190.py and derive-j191.py, D510-D512's by derive-j188.py and again,
unchanged, by derive-j190.py and derive-j191.py), the commits that added D481-D512's decision files (D509 a policy, no code: its commit
alone)""",
    """unchanged, by derive-j187.py, derive-j188.py, derive-j190.py, derive-j191.py and derive-j192.py, D510-D512's by derive-j188.py
and again, unchanged, by derive-j190.py, derive-j191.py and derive-j192.py), the commits that added D481-D512's decision files (D509 a
policy, no code: its commit alone)""")
put("(`seat_code`, its lists computed from the pin, J190's line byte for byte, which is J188's -- J187's lists plus D510's four files:",
    "(`seat_code`, its lists computed from the pin, J191's line byte for byte, which is J190's and J188's -- J187's lists plus D510's four files:")
# the guards: D505-D512's lines from the spec (J191's and J190's, checked above), the seat block with the admitted numstat (J191's line)
G508 = ''.join(SPEC[d][0] + '\n' + shell_of(d, SPEC[d][1], 'lab-j192-local') + '\n' for d in ('D505', 'D506', 'D507', 'D508', 'D510', 'D511', 'D512'))
SEAT_BLOCK = f'''# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's (D510's target
# record); the gate in front of what it sees and offers is D508's (`decides:`), all as J186's, J187's, J188's, J190's and J191's: D509
# freezes the seat between landings, and D510 (record-only, point 2) and D511 (the replay, CubeLab.java, point 1) landed between them,
# before J188's pin, with their written arguments; this pin is D513's merge on J188's, J190's and J191's pin {J191P8}, and D513 touched
# the checker, its fixtures and docs, nothing below. Every list below was computed from the pin {P8} by derive-j192.py, never typed, and
# is J191's line byte for byte, which is J190's and J188's (derive-j188.py's to derive-j191.py's): J187's (derive-j187.py's at 43043fe5)
# plus D510's four files and nothing else. D495's merge (480c837d, J177's pin) is an ancestor of the pin, and the
# seat-identity golden is unchanged since it and since J173's pin (6e87e5d4); bridge/src since 480c837d and since 6e87e5d4 is J183's ten
# files (D496's six with GameLog.java's comment-only javadoc, D497's and D500's LenientGameCopier.java, D498's Determinizer.java and
# Atlas.java, D500's SearchPolicy.java) and what later pins gained since; SearchPolicy.java since 6e87e5d4 is {T['spnum']!r} (D493's self-test
# accessor 5 lines plus D500's 3); since 7a984963 J183's four and the same; since J182's pin (ac07876b) and since J183's pin (3275af30,
# D502-D504's merge) bridge/src changed in exactly: {short(T['s327'])} (numstat {T['num327'].strip() or 'none'}); since J185's pin
# (0a6cf5c1, D505-D507's merge) in exactly: {short(T['s0a6'])} (numstat {T['num0a6'].strip() or 'none'}); and since J186's pin (e557dedf,
# D508's merge, the population's opening pin) the frozen set, {FROZEN}, changed in exactly D510's four
# files and D511's two, at the numstat registered in derive-j188.py's to derive-j192.py's ADMIT ({NUMS}): D509 point
# 1's test with the two landings between landings admitted by name and by line count, so any other change fails it
sc=0
{T['line']}
if git merge-base --is-ancestor {B480} HEAD && git diff --quiet {B480} HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet {B6E8} HEAD -- fixtures/cubelab/seat-identity.json; then
{TEST191}
fi
echo $sc > var/lab-j192-local/seat-code.txt
echo "J192: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's, the gate D507's and D508's (bridge/src since J185's pin 0a6cf5c1: {short(T['s0a6'])}; the frozen set since J186's pin e557dedf: exactly D510's and D511's admitted numstat): $sc"
'''
span("# D505 (hideaway's look kept while the card stays in exile, the dig tied by its trigger's resolution; amends D502; the names this file\n",
     "# D481-D496 by decision id:", G508 + SEAT_BLOCK)
# the deck code: deckcode.py and its block, every value from the pin (J191's and J190's, checked above)
DECK_BLOCK = f'''# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506, and nothing else (deckcode.py's
# header): nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's, D494's and D506's comment and
# message lines only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492), Ob
# Nixilis, the Adversary (D494), and Old Man of the Sea and Rubinia Soulsinger (D506); both files the pin's blobs (computed by
# derive-j192.py from {P8}, equal to J186's, J187's, J188's, J190's and J191's; unchanged since J185's pin 0a6cf5c1)
cat > var/lab-j192-local/bin/deckcode.py <<'PY'
# J192: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j192-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j192.py from the
# pin {P8} with git, never typed, and is J186's, J187's, J188's, J190's and J191's. Exits 0 when all three hold:
#   census  deckcensus.ts: {len(D_OUT)} lines out and {len(D_IN)} in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's ({LASTS} last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j192-local/'
DC_BLOB, UP_BLOB = '{DC_BLOB}', '{UP_BLOB}'
OUT_N, IN_N = {len(D_OUT)}, {len(D_IN)}
OUT_SHA = '{OUT_SHA}'
IN_SHA = '{IN_SHA}'
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
    sys.exit('J192 deck code: %s' % e)


def h(xs):
    return hashlib.sha256('\\n'.join(xs).encode()).hexdigest()


def pre(x):
    return x.split('throw new Error(', 1)[0]


thr_out, thr_in = [pre(x) for x in out if 'throw new Error(' in x], [pre(x) for x in inn if 'throw new Error(' in x]
census = ((len(out), len(inn)) == (OUT_N, IN_N) and h(out) == OUT_SHA and h(inn) == IN_SHA and len(thr_out) == 1 and thr_out == thr_in
          and all(x.strip().startswith(('//', '/**')) or 'throw new Error(' in x for x in out + inn))
b = t.get('cards') or {{}}
lst = (t.get('decision') == 'D482' and list(b) == list(a) + ['Chain of Smog'] + NEW + NEW506 and all(b[k] == a[k] for k in a)
       and list(c) == list(a) + ['Chain of Smog'] and b['Chain of Smog'] == c['Chain of Smog'] and b['Chain of Smog'].get('since') == 'J173'
       and all(b[k].get('since') == 'J176' and str(b[k].get('why', '')).strip() != '' and str(b[k].get('evidence', '')).strip() != '' for k in NEW)
       and all(b[k].get('since') == 'J183' and str(b[k].get('why', '')).strip() != '' and str(b[k].get('evidence', '')).strip() != '' for k in NEW506))
blobs = sys.argv[1:3] == [DC_BLOB, UP_BLOB]
print("J192 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet {F2B} HEAD -- cubes/library/; then
  git diff --no-color --no-ext-diff -U0 {F2B} HEAD -- tools/cubelab/deckcensus.ts > var/lab-j192-local/deckcensus.diff
  git show {F2B}:tools/cubelab/engine-unplayable.json > var/lab-j192-local/unplayable-j171.json
  git show {CC7}:tools/cubelab/engine-unplayable.json > var/lab-j192-local/unplayable-j176.json
  python3 -I var/lab-j192-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j192-local/deck-code.txt
echo "J192: deck code: J171's pin's plus exactly D490, D492, D494 and D506 -- the draw deals no Prepare card, no Ob Nixilis, the Adversary, no Old Man of the Sea and no Rubinia Soulsinger: $dc"
'''
span("# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506", 'test -z "${CUBELAB_WORKER_XMX:-}"', DECK_BLOCK)
# draws.py: J191's draws registered beside the others
put("""# J188_VALIDATION, from lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw as derive-j190.py recomputed
# it, read on 2026-11-04) and J190's (J190_DRAWS, J190_VALIDATION, from lab-j190/report/draws.json's `asRun`, equal to its `recorded` and
# to lab-j190's draw as derive-j191.py recomputed it, read on 2026-11-04): none may come back here.""",
    f"""# J188_VALIDATION, from lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw as derive-j190.py recomputed
# it, read on 2026-11-04), J190's (J190_DRAWS, J190_VALIDATION, from lab-j190/report/draws.json's `asRun`, equal to its `recorded` and
# to lab-j190's draw as derive-j191.py recomputed it, read on 2026-11-04) and J191's (J191_DRAWS, J191_VALIDATION, from
# lab-j191/report/draws.json's `asRun`, equal to its `recorded` and to lab-j191's draw as derive-j192.py recomputed it, read on
# {TODAY}): none may come back here.""")
m190 = re.search(r"J190_VALIDATION = '[0-9a-f]{64}'\n", t)
J190BLOCK_END = m190.group(0) if m190 else 'J190_VALIDATION = MISSING\n'
i = t.index("# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`")
j = t.index(J190BLOCK_END) + len(J190BLOCK_END)
J185190 = t[i:j]
pairs = ['%r, %r' % (J191_DRAWS[k], J191_DRAWS[k + 1]) if k + 1 < 13 else '%r' % J191_DRAWS[k] for k in range(0, 13, 2)]
J191BLOCK = ("# J191's 13 spine draws and its validation draw (lab-j191/report/draws.json's `asRun`, equal to its `recorded` and to lab-j191's draw\n"
             "# as derive-j192.py recomputed it on %s): none may come back here either\n" % TODAY +
             "J191_DRAWS = {" + (',\n              '.join(pairs)) + "}\n"
             "J191_VALIDATION = %r\n" % J191_VAL)
span(J185190[:60], J190BLOCK_END, J185190 + J191BLOCK)   # J185's to J190's blocks verbatim (kept through the comparison move), J191's after
t = t.replace(J190BLOCK_END, '', 1)
put('J185_DRAWS | J186_DRAWS | J187_DRAWS | J188_DRAWS | J190_DRAWS)', 'J185_DRAWS | J186_DRAWS | J187_DRAWS | J188_DRAWS | J190_DRAWS | J191_DRAWS)')
put('J185_VALIDATION, J186_VALIDATION, J187_VALIDATION, J188_VALIDATION, J190_VALIDATION)', 'J185_VALIDATION, J186_VALIDATION, J187_VALIDATION, J188_VALIDATION, J190_VALIDATION, J191_VALIDATION)')
# labels.py: its header, the expectation and the beside-column's population
span("# J191 (drafts/J191-atlas-4b-night-fourteen.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J192 (drafts/J192-atlas-4b-night-fifteen.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J192 data. What changes: nothing in the rows. J192 is D508's population's SIXTH night (D509: the seat frozen since J186's
# pin e557dedf; D510 changed the record and D511 the replay, between landings, before J188's pin, and D513 the checker after J191's;
# none changed what the seat plays or offers), so its rows pool with J186's, J187's, J188's, J190's and J191's under the same pool names
# (D489, D508, D509, Comparability): --seat= defaults to "D508", as theirs (the self-test on J171's night still passes --seat=D486), the
# Report names the pools `random-<band>-d508`; and the sizing read's beside-column is J191's (--j191= LABELS_JSON: its c_sizingRead,
# per-worker-hour yield and futilityRead, THE SAME POPULATION's fifth night, as information and as the pooled futility read's fifth
# input; null when absent). J190's, the fourth, J188's, the third, J187's, the second, and J186's, the first (J186 was aborted before its
# Report), are registered in the job file. Every field, read and definition otherwise J177's, unchanged; the scan stamp `J192 v5`.
""")
put(r"""'expectation': 'as information, no verdict: J190 (THE SAME POPULATION: D508\'s fourth night, the same seat and design, other decks) below as its own report read it; J188 (its third night), J187 (its second) and J186 (its first, aborted before its Report) in the job file; J185 (D507),""",
    r"""'expectation': 'as information, no verdict: J191 (THE SAME POPULATION: D508\'s fifth night, the same seat and design, other decks) below as its own report read it; J190 (its fourth night), J188 (its third), J187 (its second) and J186 (its first, aborted before its Report) in the job file; J185 (D507),""")
put("'population': 'D508 (the same population, its fourth night): pooled with this night, J186, J187 and J188 under the same pool names; its futilityRead is the pooled futility read\\'s fourth input, J186\\'s by-hand one, J187\\'s and J188\\'s the first three (D508, D509, Comparability)'}",
    "'population': 'D508 (the same population, its fifth night): pooled with this night, J186, J187, J188 and J190 under the same pool names; its futilityRead is the pooled futility read\\'s fifth input, J186\\'s by-hand one, J187\\'s, J188\\'s and J190\\'s the first four (D508, D509, Comparability)'}")
# metrics.py's header
span("# J191's metrics (drafts/J191-atlas-4b-night-fourteen.md)", "# J177's header, unchanged below:\n# J177's metrics", f"""# J192's metrics (drafts/J192-atlas-4b-night-fifteen.md): J177's metrics.py for a NEW data folder, lab-j192, where all 13 spines are
# J192's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J192 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J192's (deck seeds {DECK_R}, game
# seeds {GAME_R}, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population,
# J186's, J187's, J188's, J190's, J191's and this night's); (c) compare-j191.json for the `compare` key; (d) the scan stamp `J192 v5` and
# the defaults lab-j192, var/lab-j192-local. D479's `exileLinksLostBranches` and `exileLinksLostLinks` are J177's keys, read per spine at
# the morning read (J191's s01 and s03 the population's first non-zero).
""")
# compare.py: its header, its glob and its note
span("# J191 (drafts/J191-atlas-4b-night-fourteen.md): each spine's numbers beside J190's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     f"""# J192 (drafts/J192-atlas-4b-night-fifteen.md): each spine's numbers beside J191's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J192 data. DIFFERENT DECKS (J191: deck seeds {D191_R}, game seeds {G191_R}; J192: {DECK_R}, {GAME_R}; the same band at
# each position), THE SAME SEAT (D488's policy, D498's redeal, D500's damage history, D508's gate: frozen since J186's pin, D509; D510
# and D511 changed the record and the replay, not the seat, before J188's pin, which is J190's and J191's too; D513 the checker only,
# before J192's) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions): J191 and J192 are D508's
# population's fifth and sixth nights. A difference is a candidate, never a verdict, and no position is a pair (the decks differ
# everywhere). J177's compare.py, unchanged but for its note and its glob: `this` is J192, `before` J191, read from lab-j191 at the
# Report (read only), its report/labels.json written by J191's own Report; the spine glob reads both nights' game seeds, J192's and
# J191's, all 3xxx.
""")
put("    for sp in sorted(glob.glob(D + '/b-s??-*-[23]???')):   # J191's folders end in 3001-3013, J190's in 2917-2929: one glob reads both",
    f"    for sp in sorted(glob.glob(D + '/b-s??-*-3???')):   # J192's folders end in {GAME_R}, J191's in {G191_R}: one glob reads both")
span("out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J190 (D508", "\n       'bySpine': {s: {'before': before.get(s)",
     r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J191 (D508\'s population, its fifth night; deck seeds """ + D191_R + r""", 150 branches, the futility stop, 10 decisions) beside J192 (D508\'s population, its sixth night, the seat frozen since J186\'s pin, D509, on D513\'s merge on J191\'s pin; deck seeds """ + DECK_R + r""", the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is the seat\'s: the decks differ at every position and the seat does not',""")
# the pilot's read of the comparison night
put("""# J190's night, read only, as information (ended 2026-11-04 at 22:01, its Report written: `report` reads 1 and `atlases` 13): what
# compare.py and labels.py's c_sizingRead will read at the Report (THE SAME POPULATION, D508's fourth night; J188's, the third, J187's,
# the second, and J186's, the first, are registered in the job file)
""", """# J191's night, read only, as information (ended 2026-11-05 at 09:20, its Report written: `report` reads 1 and `atlases` 13; its one
# failed check the checker's misread, D513): what compare.py and labels.py's c_sizingRead will read at the Report (THE SAME POPULATION,
# D508's fifth night; J190's, the fourth, J188's, the third, J187's, the second, and J186's, the first, are registered in the job file)
""")
# the Report block
put("""# J190's night, read only, for the J190 columns (compare.py) and J190's sizing read (labels.py --j190): THE SAME POPULATION (D508's
# fourth night), read beside and pooled by hand with J188's, J187's and J186's (its third, second and first, whose numbers are
# registered in the job file); absent files read as null""",
    """# J191's night, read only, for the J191 columns (compare.py) and J191's sizing read (labels.py --j191): THE SAME POPULATION (D508's
# fifth night), read beside and pooled by hand with J190's, J188's, J187's and J186's (its fourth, third, second and first, whose numbers
# are registered in the job file); absent files read as null""")
put("'the 4b night-fourteen validation draw, made by the J191 pilot into lab-j191 at deck seeds 3101-3113",
    "'the 4b night-fifteen validation draw, made by the J192 pilot into lab-j192 at deck seeds %s" % VAL_R)
put("by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509; D510s record and D511s replay landed between landings, before J188s pin, which is J190s and this nights), on new decks (deck seeds 2901-2913, game seeds 3001-3013), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its fifth night, pooled with J186 (its first, twelve spines), J187 (its second, thirteen), J188 (its third, thirteen) and J190 (its fourth, thirteen); never with",
    "by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509; D510s record and D511s replay landed between landings, before J188s pin, which is J190s and J191s; D513s checker merged after J191), on new decks (deck seeds %s, game seeds %s), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its sixth night, pooled with J186 (its first, twelve spines), J187 (its second, thirteen), J188 (its third, thirteen), J190 (its fourth, thirteen) and J191 (its fifth, thirteen); never with" % (DECK_R, GAME_R))
# the abort paragraph
put("""met the same divergence without a listing change, 975 forks not the position, which `atlas.problems` caught; J188 and J190, with D511:
0, and every one of their 53,435 and 61,450 forks the position). **`atlas_hook_ioobe`** counts the seat queue's row 7 (information;
J187: 58, all s04's; J188: 3, all s11's; J190: 0; each an errored branch; queued, so it may recur at either scale), and
**`atlas_mapsa_ise`** row 8's candidate (information; J190: 1, s12's d16, the `SearchPolicy.mapSa` IllegalStateException under the hook's
leak check; none in J186-J188; queued, not fixed, so it may recur).""",
    f"""met the same divergence without a listing change, 975 forks not the position, which `atlas.problems` caught; J188, J190 and J191,
with D511: 0, and every one of their {N8['forks']:,}, {N90['forks']:,} and {FORKS:,} forks the position). **`atlas_hook_ioobe`** counts the seat queue's row 7
(information; J187: 58, all s04's; J188: {N8['hook']}, all s11's; J190 and J191: 0; each an errored branch; queued, so it may recur at either
scale), and **`atlas_mapsa_ise`** its row 8 (information; J190: {N90['mapsa']}, s12's d16, the `SearchPolicy.mapSa` IllegalStateException under the
hook's leak check; J191: 0; none in J186-J188; queued, not fixed, so it may recur).""")
put("""D487, D488, D495, D496, D501-D505 and D512 amended. **J188 and J190 passed it** on this pin: 0 problems, 106,896 and 122,926
frame logs through the checker and 0 failed, every fork the position.""",
    f"""D487, D488, D495, D496, D501-D505, D512 and D513 amended. **J188 and J190 passed it** on J191's pin {J191P8}: 0 problems, {N8['framelogs']:,} and
{N90['framelogs']:,} frame logs through the checker and 0 failed, every fork the position. **J191 failed it on 1**, on that pin: s08's 2 of its
{format(ATL['s08']['frameLogs'], ',')} frame logs (of the night's {FRAMELOGS:,}), the opponent's Oracle of Mul Daya taken with Oko's -5 and A3 read while the exchange
resolved -- a checker misread, nothing hidden shown; **D513 in this pin admits it** (a revealer vouches for the top card of the player
whose battlefield lists it), and the pin's checker passes both logs.""")
put("which the checker admits). **None of the three may recur**", "which the checker admits); and J191's s08 shape is D513's, above. **None of the four may recur**")
put("""what the seat offers; J188's s02 dealt Lively Dirge again (227 casts refused, 37 lost across its rows), and J190's s02 again
(461 refused, 192 lost), each under every option's bar, and both checks passed.""",
    """what the seat offers; J188's s02 dealt Lively Dirge again (227 casts refused, 37 lost across its rows), and J190's s02 again
(461 refused, 192 lost), each under every option's bar, and both checks passed; J191 did not deal it.""")
span("s12, 11 of J186's s11, 60 of J187's s04 and 1 of J188's s07, none of J190's, counted here as `pump_effect_ioobe`;",
     ". A fork crash that kills", f"""s12, 11 of J186's s11, 60 of J187's s04, 1 of J188's s07, none of J190's and {N['pump']} of J191's s12 (over nine of its decisions, the most
of any night), counted here as `pump_effect_ioobe`; J187's other 58 errored branches, all s04's, and J188's other 3, all s11's, threw
from `FCollection.get` in Forge's `PlayEffect.java:90` inside our `Atlas$Hook.decision` -- the seat queue's row 7, queued, counted here
as `atlas_hook_ioobe`; J190's one, s12's d16, threw an `IllegalStateException` from our `SearchPolicy.mapSa` under the hook's leak check
(a Mystic Forge may-play cast not found on the fork's copy) -- row 8, queued, counted here as `atlas_mapsa_ise` -- and their other
exception lines were `TimeoutException`s from Forge's own AI eval thread (D465's shape; J186's s01 had 113, J187's s03 and s07 one each,
J188's s01 14, s11 5, s12 1, J190's {N90['tex']}, J191's {TEXS}), caught by the engine and no branch error (J186's s11 also had 176 Forge AI
`NullPointerException`s, J187, J188, J190 and J191 none); a `StackOverflowError` in a branch row is counted here as `stack_overflows`)""")
# the summary
span('- **The population, first line:**', '- **The run:**', f"""- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's,
  D494's and D506's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck
  seeds {DECK_R}, game seeds {GAME_R}) branched by J192 at the pin, D513's merge on J191's, by D488's random seat policy forking on
  D498's determinizer behind D508's gate, the seat frozen since J186's pin (D509; D510's record and D511's replay landed between
  landings, before J188's pin; D513 changed the checker only), the SIXTH night of D508's population**: `training: true`, `pool:
  random-<band>-d508`, `randomSeat: "D508"`, contract v6 with `branchRandom: 150` and the partial rows marked; **pooled with J186's
  twelve finished spines, J187's thirteen, J188's thirteen, J190's thirteen and J191's thirteen** (the same pool names; what the seat
  plays and offers unchanged since J186's pin) **and with nothing else: not J185's rows (D507's population: the gate before D508), not
  J183's and J182's (D498's), not J181's (D497's), not J177's and J180's (D493's), not J173's nor anything older** (D489, D509); the
  units whose logs failed the checker on a hidden-information fault, and J187's s03 decisions whose forks were not the position, are
  named, so a reader pooling leaves their rows out (D509 point 4).
""")
span('- **The run:**', '- **The yield, the number to read**', f"""- **The run:** exits, walls per spine and for the night (against J191's thirteen, {N['wall']:,} s beside GPU rounds, J190's thirteen,
  {N90['wall']:,} s beside another, J188's thirteen, {N8['wall']:,} s, J187's thirteen, {N7['wall']:,} s, J186's twelve, 36,121 s, and the ~7-9 h at 6 workers
  *Sizing* expects at J188's and J187's pace), rows, timeouts, unit errors, engine errors (with any errored row's stack from the worker
  logs), capped, D479's and D477's counters -- **D479's `exileLinksLost` per spine, branch rows and links, with the decision where it
  starts** (information, never a check: J191's s01 {EXLB['s01']:,} and s03 {EXLB['s03']}, the first non-zero in this population; J186-J190: 0) --
  disk, and any memory-pressure event in the STATUS. **Whether J191's checker misread stayed closed** (D513 in this pin): no checker
  failure on an opponent's revealed top card while a control exchange resolves (J191's s08: 2 logs). **Whether J187's two problems
  stayed closed** (D511 and D512 in this pin; J188, J190 and J191: both closed): no fork that was not the position (J187's s03: 975, the
  replay divergence; J188: 0 of {N8['forks']:,}; J190: 0 of {N90['forks']:,}; J191: 0 of {FORKS:,}), and **`replay_diverged`**, the units.jsonl lines naming
  a replay divergence (expected 0; J186: 31, J187, J188, J190 and J191: 0), per spine with the decision where any; no checker failure on
  a hideaway host owned by the viewer, reanimated by the opponent and taken back (J187's s06: 2 logs; J188, J190 and J191: none).
  **Whether J186's all-hidden target record stayed closed** (D510 in this pin): no checker failure on a target record with no option and
  a hidden candidate, and the records that now carry `option:hidden` on the target path counted where the scan or the logs show them,
  as information. **The seat queue's open rows that can recur tonight** (D509; none fixed): any refused or lost cast option on a Spree
  or other mode-cost spell (row 6; J187's s06 d21, Lively Dirge; J188's and J190's s02 dealt it under the bar, 227 refused and 37 lost,
  then {N90['dirgeR']} and {N90['dirgeL']}; J191 did not deal it), named with its card and counts -- a queued seat fault, not a night fault, if
  `refusedCastOptions` or `lostCastOptions` fails on it -- **`atlas_hook_ioobe`**, the `PlayEffect.java:90` errored branches under our
  hook (row 7; J187: 58, all s04's; J188: {N8['hook']}, all s11's; J190 and J191: 0), and **`atlas_mapsa_ise`**, the `SearchPolicy.mapSa`
  IllegalStateExceptions (row 8; J190: {N90['mapsa']}, s12's d16, a Mystic Forge may-play cast not found on the fork's copy; J191: 0), each per
  spine with the card where traced. **Whether J185's fault stayed closed**: no branch log failed the checker on a record naming a
  last-known copy of a card in the other hand, and **`lki_candidates`**, the worker logs' `[lki]` lines (D508; J186, J187, J188 and
  J190: 0; J191: {N['lki']}, all s13's d21, card 5), per spine -- information, the places D508's gate changed a list. **Whether J183's three
  faults stayed closed**: no branch log failed the checker on an opponent's hideaway card whose look was kept while the card stayed in
  exile, or whose dig came frames after its host entered (D505; the D502 stats-line count per spine, as information); no target record
  named a card in the Stack zone with no stack instance, and **`ghost_candidates`**, the worker logs' `[ghost]` lines (D507; J186: 12,
  s11's card 63; J187: 7, s01's cards 55 and 46; J188, J190 and J191: 0), per spine; no deck held Old Man of the Sea or Rubinia
  Soulsinger, **`stack_overflows`**, the branch rows naming a `StackOverflowError` (J183: 70, all s11's; J185, J186, J187, J188, J190 and
  J191: 0), per spine, and no unit hung (D506).
  **Whether J182's three checker shapes and J181's three gaps stayed closed**: no branch log failed the checker on an opponent's hideaway
  card after its host's control was taken, on another seat's ceased token or on an opponent's cast between frames (D502-D504; their three
  stats-line counts per spine, as information), no A6 failure on a card the seat may look at (D498), no id problem from a killed
  attempt's rows and `abandonedPlays` said when a unit was re-run (D499; J183: one, s11's; J185: none), no `getDamageLKI` and no
  `paperCard` in any errored branch's stack, `damageLkiLost` 0, and no bare exception in any worker log (D500, D497), no checker failure
  on a cascade's "cast it?" inside a held frame (D496), no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the
  copy's` error on a Plotted or Foretold cast (and, row 8's, none on a may-play cast from the library's top), no checker failure on a
  spell copy on the stack (and every spell copy still listed under D507's and D508's gate). **J182's engine stack, counted**:
  `pump_effect_ioobe`, the lines `at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker logs (Forge's
  `IndexOutOfBoundsException`, `FCollection.get` on an empty list; J182: 1, in s11's d10; J183: 0; J185: 5, all s12's; J186: 11, all
  s11's; J187: 60, all s04's; J188: {N8['pump']}, s07's; J190: 0; J191: {N['pump']}, all s12's, over nine decisions), per spine, each with its branch and its
  exception line -- information, an engine fault and never a verdict on a card; and Forge's own AI-eval `TimeoutException`s and AI
  `NullPointerException`s per spine (J186: s01 113, s04 2, s11 176 NPEs; J187: s03 1, s07 1, no NPE; J188: s01 14, s11 5, s12 1, no NPE;
  J190: {N90['tex']}, no NPE; J191: {TEXS}, no NPE), as information.
""")
span("beside it **J190's** (0.273 a worker-hour", ", then **J185's** (0.376", f"""beside it **J191's** ({N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}], {N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}], on {N['wh']}
  worker-hours over thirteen spines, beside GPU rounds: this population's fifth night, `c_sizingRead.j191`), **J190's** ({N90['cpwh']} [{N90['cpwh95'][0]}, {N90['cpwh95'][1]}],
  {N90['c7']} [{N90['p95'][0]}, {N90['p95'][1]}], on {N90['wh']} worker-hours over thirteen, beside a GPU round: its fourth, from this file's numbers), **J188's**
  ({N8['cpwh']} [{N8['cpwh95'][0]}, {N8['cpwh95'][1]}], {N8['c7']} [{N8['p95'][0]}, {N8['p95'][1]}], on {N8['wh']} worker-hours over thirteen: its third, from this file's numbers), **J187's**
  ({N7['cpwh']} [{N7['cpwh95'][0]}, {N7['cpwh95'][1]}], {N7['c7']} [{N7['p95'][0]}, {N7['p95'][1]}], on {N7['wh']} worker-hours over thirteen: its second, from this file's numbers),
  **J186's** ({N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}], {N6['c7']} [{N6['p95'][0]}, {N6['p95'][1]}], on {N6['wh']} worker-hours over twelve: its first, from this file's by-hand
  numbers) and **the six nights pooled** (confident labels over worker-hours, by hand; J186, J187, J188, J190 and J191 together
  {POOL['confident']} on {POOL['wh']}, {POOL['cpwh']} [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}], {POOL['c7']} a 7-worker night [{POOL['p95'][0]}, {POOL['p95'][1]}])""")
span("**Say that this\n  is the fifth night of D508's population's pooled read**", "\n- **(g) The cap read**", f"""**Say that this
  is the sixth night of D508's population's pooled read** (`pooledInputs`): add J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']}
  stopped, {f6['read']} read; this file's by-hand numbers), J187's {f7['controlsConfident']} of {f7['controls']} ({f7['stopped']} stopped, {f7['read']} read; this file's numbers), J188's
  {fr8['controlsConfident']} of {fr8['controls']} ({fr8['stopped']} stopped, {fr8['read']} read; this file's numbers), J190's {f90['controlsConfident']} of {f90['controls']} ({f90['stopped']} stopped, {f90['read']} read; this
  file's numbers; s11 d16 the population's first confident control) and J191's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read;
  `c_sizingRead.j191.futilityRead`) to this night's and give the pooled share with its exact 95% interval beside this night's own (the
  five before tonight: {POOL['ctlConf']} of {POOL['controls']}, {POOL['ctl95']}); that J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's
  0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and whether the pooled ~70 controls can yet
  tell .04 from .2.""")
put("and J190's, J188's and J187's (the same population's), J185's, J183's,", "and J191's, J190's, J188's and J187's (the same population's), J185's, J183's,")
put("against J190's 13.5, J188's 12.9, J187's 12.5, J186's 12.8 (twelve spines), J185's 14.4,",
    f"against J191's {N['perSpine']}, J190's {N90['perSpine']}, J188's {N8['perSpine']}, J187's {N7['perSpine']}, J186's 12.8 (twelve spines), J185's 14.4,")
put("and for the night beside J190's (0.74%, s02's Lively Dirge among it), J188's (0.13%, s02's Lively Dirge among it), J187's (0.33%, s06's Lively Dirge among it), J185's (0.16%)",
    f"and for the night beside J191's ({REFSHARE}%), J190's ({N90['refshare']}%, s02's Lively Dirge among it), J188's ({N8['refshare']}%, s02's Lively Dirge among it), J187's (0.33%, s06's Lively Dirge among it), J185's (0.16%)")
# the header's rule line: the population's nights, and D513
put("the population J186 opened, J187, J188, J190 and J191 continue)", "the population J186 opened, J187, J188, J190, J191 and J192 continue)")
put("`CubeLab.java` between landings, D509 point 1) and D512 (the redaction checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back: a checker admission); D447 (the deck draw)",
    "`CubeLab.java` between landings, D509 point 1), D512 (the redaction checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back: a checker admission) and D513 (the redaction checker's A3 reads a revealed top card as the zone's player's, not the `controller` field's, which leads the battlefield listing by a frame while a control exchange resolves: a checker admission); D447 (the deck draw)")
# the est: line is J191's, kept byte for byte (J188's and J187's walls stay the sizing reference)
EST191 = [l for l in SRC_T.split('\n') if l.startswith('est: ')]
assert len(EST191) == 1
put(EST191[0] + '\n', EST191[0] + '\n')

# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
hist = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'J191', t)
        if not re.match(r'J191(:| v5| deck| draws| scan| pilot|-atlas)', t[m.start():m.start() + 12]) and 'homes-J191' not in t[m.start() - 6:m.start() + 4]]
print('J191 mentions before the job-name move, outside echo/print prefixes (each must be this job\'s own):', len(hist))
for ctx in hist:
    print('   ', ctx)
t = t.replace('J191', 'J192').replace('j191', 'j192')
t = t.replace('drafts/J192-atlas-4b-night-fourteen.md', 'drafts/J192-atlas-4b-night-fifteen.md')
left = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'[Jj]190', t)]
print('J190 left before the comparison move (each becomes J191):', len(left))
for ctx in left:
    print('   ', ctx)
t = t.replace('J190', 'J191').replace('j190', 'j191')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, BASES INCLUDED, +SHIFT (J191's block to J192's)
# ======================================================================================================================================
RANGES = [(J191B + o, J191B + o + 13) for o in (0, 100, 200, 300)]   # each INCLUDES its base (2900 + k is a seed); +SHIFT = BASE - 2900
AUDIT = []


def shift(m):
    v = int(m.group(0))
    for a, b_ in RANGES:
        if a <= v <= b_:
            s = m.string
            AUDIT.append((v, v + SHIFT, s[max(0, m.start() - 60):m.end() + 40].replace('\n', ' ').replace('\x00', '#')))
            return str(v + SHIFT)
    return m.group(0)


t = re.sub(r'(?<![0-9A-Za-z.])\d{4}(?![0-9A-Za-z.])', shift, t)
RESTORED = []      # (wrong, right, why): filled from the audit below -- none (every token in the ranges is a seed or a base: the audit)
for wrong, right, why in RESTORED:
    if t.count(wrong) != 1:
        FAIL.append('restore %r: found %d' % (wrong, t.count(wrong)))
    t = t.replace(wrong, right)
for base in (J191B, J191B + 100, J191B + 200):
    if not any(v == base for v, _, _ in AUDIT):
        FAIL.append('the base %d was not shifted' % base)


# 3b. the globs: J192's game seeds stay in the 3??? thousands, so every glob over lab-j192's spine folders reads b-s??-*-3??? (J191's, but
# its folder); the pilot's read of lab-j191 (J191's game seeds 3001-3013) reads b-s??-*-30??; compare.py's one glob over both nights was
# written by hand above (b-s??-*-3???, Python's glob)
def gput(old, new, count):
    global t
    c = t.count(old)
    if c != count:
        FAIL.append('glob %r: found %d, not %d' % (old, c, count)); return
    t = t.replace(old, new)


GLOBS = [("D = '/home/justin-a/code/lab/data/lab-j191'; r = {'atlases': len(glob.glob(D + '/b-s??-*-29??/atlas.json'))",
          "D = '/home/justin-a/code/lab/data/lab-j191'; r = {'atlases': len(glob.glob(D + '/b-s??-*-30??/atlas.json'))", 1)]
for old, new, c in GLOBS:
    gput(old, new, c)

# ======================================================================================================================================
# 4. the decks table: J191's column (after the shift, so its seeds stay J191's)
# ======================================================================================================================================
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
RS = ('none fell in the shifted ranges but the seeds and their bases themselves (the audit reads every one in context), so nothing was'
      ' restored' if not RESTORED else 'restored by name: ' + '; '.join(w for _, _, w in RESTORED)) + '.'
t = t.replace('\x00SEEDS\x00', SEEDS_P.replace('RESTORED_SENTENCE', RS))
# no glob of the old forms is left anywhere (stashed text included)
for g_ in ('2???', '25??', '29??', '[23]???'):
    if g_ in t:
        FAIL.append('a %r glob is left: %s' % (g_, [l[:120] for l in t.split('\n') if g_ in l]))

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


D513_SIG = ("**D513** (merged as %s on J191's pin %s; checker, fixtures and docs only, free under D509 point 1): the redaction checker's A3 reads "
            "a revealed top card as the zone's player's, not the `controller` field's, which leads the battlefield listing by a frame while a "
            "control exchange resolves -- J191's s08 failure, 2 of its frame logs (the opponent's Oracle of Mul Daya taken with Oko's -5), a "
            "checker misread with nothing hidden shown; J191's thirteen spines stand and are pooled" % (P8, J191P8))
EXL_SIG = ("`exileLinksLost`, the branch rows whose fork could not carry a card's \"exiled with\" link, per spine, with the decision "
           "where it starts (J191's s01 %s of its %s rows, every one from d10 on, and s03 %d, d19-d22: the first non-zero in this "
           "population; information, never a check and never a seat-queue row)" % (format(EXLB['s01'], ','), format(EXL_S01_ROWS, ','), EXLB['s03']))
PUBLIC_TITLE = 'Move atlas 4b night fifteen: 13 new spines, D508 population night six'
setline('id: ', 'J192')
setline('title: ', f"The move atlas, rung 4b, night fifteen -- J191's night carried onto D513's merge (D509: the atlas seat frozen between landings; the pin {P8} is D513's merge on J188's, J190's and J191's pin {J191P8}, and D513 changed the redaction checker, its fixtures and docs only, so the seat, its record (D510's `option:hidden`), its replay (D511's sink that writes nothing) and its determinizer are J191's byte for byte, and `seat_code` admits exactly D510's and D511's numstat since J186's pin, J191's line byte for byte) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j192, at deck seeds {DECK_R} (D447 with D482's list as D490, D492, D494 and D506 leave it, the bands cycled as J166's) and game seeds {GAME_R}; a validation draw made fresh at deck seeds {VAL_R} (game seeds {RES_R} reserved); THE SIXTH NIGHT OF D508'S POPULATION, pooled with J186's twelve finished spines, J187's thirteen, J188's thirteen, J190's thirteen and J191's thirteen (J191 failed its last check on the checker's misread, which D513 admits; its data stands); J191's night read beside, by position; D479's `exileLinksLost`, first non-zero on J191, read per spine as information")
setline('public_title: ', PUBLIC_TITLE)
setline('public_decides: ', 'None by itself; D508 population night six, pooled with J186-J188, J190 and J191')
setline('repos: ', "mtg-table@%s (origin/main: D513's merge on J188's, J190's and J191's pin %s -- the redaction checker's A3 reads a revealed top card as the zone's player's; `git diff %s <pin>` names only D513's checker, self-test, fixture generator, fixtures and docs, nothing in D509's frozen set or the deck code; pushed; written by derive-j192.py from its argument; merged == 1, the commits that added D481-D512's decision files, D493's, D495's to D508's and D510's to D512's names, the seat's code exactly as this file states it -- J191's line byte for byte, which is J190's and J188's: J187's lists plus D510's four files, and the frozen set since J186's pin e557dedf exactly D510's and D511's numstat -- and the deck code (J191's, J190's and J188's), every pin-decided value computed from the pin, checked by the pilot; D513's names, its four controls and its checker on J191's two s08 logs, checked at the pin by derive-j192.py)" % (PIN, J191P8, J191P8))
setline('decides: ', f"nothing by itself. Rung 4b's fifteenth night, the thirteenth on D489's futility stop with the review's 150 cap, and **the SIXTH of D508's population**. **What changed under the seat since J191:** nothing -- the pin is D513's merge ({P8}) on J191's pin {J191P8}, and {D513_SIG}; so what the seat plays and offers, its record, the replay and the determinizer are J191's. **D509** (2026-11-03) freezes the atlas seat between landings; between J187's pin 43043fe5 and J188's pin two lanes changed its frozen set with their written arguments, and `seat_code` admits exactly their numstat since J186's pin e557dedf ({NUMS}) and nothing else: **D510** (record-only, D509 point 2: a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly, protocol M81; `Decisions.targetAnswer`, `targets0` and `among` are reached only after Forge or the explorer has answered, into the sink, and no gate, candidate list or listing changes) and **D511** (`tools/cubelab/CubeLab.java` between landings, D509 point 1: an atlas unit's replay records into a sink that writes nothing, so it plays the recorded baseline's game; its `atlas.ts` change is the atlas-selftest's replay leg); **D512** admits J187's s06 hideaway shape in the redaction checker, and D513 J191's s08 shape. J188 and J190 ran on J191's pin with every final check passed, 0 forks not the position, `replay_diverged` 0 and 0 checker failures; J191 too but for its s08's two logs, the checker's misread. So the random seat's POLICY is D488's, the recorder D496's (with D510's target record), the copier's paper-card carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's (D507's Stack rule kept over the card the game holds), all as J186's, J187's, J188's, J190's and J191's; `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (`identity == 1` stays the real check). The seat queue (D509) holds rows 1-8 and none is fixed tonight; three of its faults can recur: a Spree or mode-cost spell's refused and lost cast option (row 6, J187's s06 d21 Lively Dirge; J188's and J190's s02 dealt it again under the bar; J191 did not deal it), the errored branches from `PlayEffect.java:90` under our hook (row 7, J187's s04: 58; J188's s11: {N8['hook']}; J190 and J191: 0), and the `SearchPolicy.mapSa` IllegalStateException under the hook's leak check (row 8, J190's s12 d16, a Mystic Forge may-play cast not found on the fork's copy; J191: 0). **Comparability, the rule this night follows:** D489 pools nights on one seat and opens a population on \"A future change to the seat or to what it offers\"; D509 keeps the seat unchanged between landings and lands a queue as one population boundary; D513 changed the checker only. So **J192's labels and reads are D508's population's sixth night: pooled with J186's twelve finished spines, J187's thirteen, J188's thirteen, J190's thirteen and J191's thirteen -- the same `pool`, `random-<band>-d508`, the same `randomSeat: \"D508\"`; never with J185's v6 rows (D507's population), J183's and J182's (D498's), J181's (D497's), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16, and tonight's if any) and J187's s03 decisions whose forks were not the position are named so that a reader pooling leaves their rows out (D509 point 4; J191's two s08 logs were the checker's misread, not such a fault); J189 (failed at its pilot) is no night of the population; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- this night's counts the sixth input to this population's pooled read, J186's {f6['controlsConfident']} of {f6['controls']}, J187's {f7['controlsConfident']} of {f7['controls']}, J188's {fr8['controlsConfident']} of {fr8['controls']}, J190's {f90['controlsConfident']} of {f90['controls']} (its s11 d16 the population's first confident control) and J191's {fr['controlsConfident']} of {fr['controls']} the first five, {POOL['ctlConf']} of {POOL['controls']} pooled, with J185's 0 of 13, J183's 0 of 11, J182's 0 of 6, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside as other populations, and the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches; J191's {N['kept50s']}% and {N['kept100s']}%, J190's {N90['kept50s']}% and {N90['kept100s']}%); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J191's {N['cpwh']} and J190's {N90['cpwh']} (each beside GPU rounds, not a clean pace), J188's {N8['cpwh']}, J187's {N7['cpwh']}, J186's {N6['cpwh']} and the six nights pooled (the five before tonight: {POOL['cpwh']}), and, as other populations, J185's 0.376, J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J191's at the same position (other decks, the same population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D513 (no checker failure of J191's s08 shape: an opponent's revealed top card while a control exchange resolves), of D510-D512 (no checker failure of J186's all-hidden target record or of J187's s06 hideaway shape; no fork that is not the position, and `replay_diverged`, the units.jsonl lines naming a replay divergence, expected 0 -- J188, J190 and J191: neither checker failure, 0 forks not the position and `replay_diverged` 0), of D479 ({EXL_SIG}), of the seat queue's rows 6, 7 and 8 (any mode-cost cast option refused or lost, named; `atlas_hook_ioobe`, the `PlayEffect.java:90` errored branches, per spine; `atlas_mapsa_ise`, the `SearchPolicy.mapSa` IllegalStateExceptions, per spine), of D508 (no checker failure of J185's shape; `lki_candidates`, the worker logs' `[lki]` lines, per spine -- J191: {N['lki']}, all s13's d21, the population's first), of D505-D507 as on J186-J191 (no checker failure of J183's hideaway shape, its D502 stats-line count per spine; `ghost_candidates`, the worker logs' `[ghost]` lines, per spine; `stack_overflows`, the branch rows naming a `StackOverflowError`, and no hung unit), of D502-D504 and D497-D500 as on J183 (no checker failure of J182's three shapes; no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`; J183: 0; J185: 5; J186: 11; J187: 60; J188: {N8['pump']}; J190: 0; J191: {N['pump']}, all s12's)")
setline('hypothesis: ', f"none to confirm about the maps. Registered expectations, as information: **J191's checker misread, J187's two problems and J186's all-hidden record stay away** -- with D513 in the pin the checker reads an opponent's revealed top card as the zone's player's while a control exchange resolves (J191's s08: 2 logs, which the pin's checker passes); with D511 a unit's replay is the recorded baseline's game, so no fork is not the position (J187's s03: 975; J188: 0 of {N8['forks']:,}; J190: 0 of {N90['forks']:,}; J191: 0 of {FORKS:,}) and `replay_diverged` is 0 (information; J186: 31, J187, J188, J190 and J191: 0); with D512 the checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back (J187's s06: 2 logs); with D510 a target the seat cannot see is `option:hidden`, never `options: []` with `chosen: null` (J186's s11: 12 logs) -- so `atlas.problems == 0` is expected (J188: 0, {N8['framelogs']:,} frame logs, 0 failed; J190: 0, {N90['framelogs']:,}, 0 failed; J191: 1, {FRAMELOGS:,}, 2 failed, the shape D513 admits), though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as it failed J191's on 1, J187's on 2, J186's would have on 1 had it not been aborted first, J185's on 1, J183's on 3 across three faults, J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); **the seat queue's rows 6, 7 and 8 are open and may recur** -- a Spree or other mode-cost spell whose base cost the seat's gate judges payable can have its forced cast refused and lost in most of its rows (J187's s06 d21 option 3, Lively Dirge: refused 680, lost 340; J188's and J190's s02 dealt it again and stayed under the bar, 227 refused and 37 lost, then {N90['dirgeR']} and {N90['dirgeL']}; J191 did not deal it), so `refusedCastOptions == 0` and `lostCastOptions == 0` (J173's checks, kept) may fail on it, which is a queued seat fault and not a night fault: the option is recorded and the night's data stands (D509); an errored branch can throw from `FCollection.get` in Forge's `PlayEffect.java:90` inside our hook (`atlas_hook_ioobe`, information; J187: 58, all s04's; J188: {N8['hook']}, all s11's; J190 and J191: 0) or from our `SearchPolicy.mapSa` under the hook's leak check, a may-play cast not found on the fork's copy (`atlas_mapsa_ise`, information; J190: {N90['mapsa']}, s12's d16; J191: 0); **D479's exile links may be lost again** -- a fork's copy that cannot carry a card's \"exiled with\" link counts the branch row in `exileLinksLost` and plays on (J191: s01 {EXLB['s01']:,} of its {EXL_S01_ROWS:,} rows from d10 on, s03 {EXLB['s03']} of d19-d22; J186-J190: 0), information per spine, never predicted and never a check; **the shapes D505-D508 closed stay away** -- no entity or target record names a last-known copy of a card in the other hand (D508: the record counts it in `hidden` and the worker log prints `[lki]`; `lki_candidates` counts those lines, information; J186, J187, J188 and J190: 0; J191: {N['lki']}, all s13's d21, card 5, with no checker failure), while a copy of a card now in a public zone or the seat's own hand is still listed; an opponent's hideaway card whose look is kept while it stays in exile, after its host's control went back or the host left the battlefield, or whose dig came frames after its host entered, passes A9 (D505), counted on D502's stats line; no target record names a card in the Stack zone with no stack instance (D507; `ghost_candidates`, information; J186: 12, J187: 7, J188, J190 and J191: 0, each a candidate left out); no deck holds a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger (D492, D494, D506; `deck_code`), so no branch row names a `StackOverflowError` (`stack_overflows`, information; J183: 70, J185, J186, J187, J188, J190 and J191: 0) and no unit hangs on that recursion; an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log (`pump_effect_ioobe` stays counted: J182 1, J183 0, J185 5, J186 11, J187 60, J188 {N8['pump']}, J190 0, J191 {N['pump']}, all s12's); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes, and stays listed under D507's and D508's gate (D495, D507, D508); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J191: {N['read']} read, {N['stopped']} stopped, {N['controls']} controls, {N['ctlConf']} of them confident, 0 partial rows confident; J190: {f90['read']}, {f90['stopped']}, {f90['controls']}, {f90['controlsConfident']}; J188: {fr8['read']}, {fr8['stopped']}, {fr8['controls']}, 0; J187: 130, 47, 10, 0; J186: 115, 34, 13, 0, on twelve spines; J185: 122, 34, 13, 0); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J191's (read beside, not predicted; J191's refused share {REFSHARE}% and `cardTargetShare` {TOOL['cardTargetShare']}, J190's {N90['refshare']}%, J188's {N8['refshare']}%, J187's 0.33%, J185's 0.16%, J183's 0.60%, J182's 0.92%; J186's never computed); J191's yield, {N['confident']} confident of {N['labels']} labels over thirteen spines, {N['cpwh']} confident labels a worker-hour on {N['wh']} worker-hours (beside GPU rounds, not a clean pace), J190's, {l90['confident']} of {l90['labels']}, {N90['cpwh']} on {N90['wh']} (beside a GPU round), J188's, {lb8['confident']} of {lb8['labels']}, {N8['cpwh']} on {N8['wh']}, J187's, {l7['confident']} of {l7['labels']}, {N7['cpwh']} on {N7['wh']}, and J186's, {l6['confident']} of {l6['labels']} over twelve, {N6['cpwh']} on {N6['wh']} -- {POOL['cpwh']} pooled [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}], {POOL['confident']} on {POOL['wh']} -- are this population's first five nights', read beside and pooled by hand, never predicted; J185's 20 of 88, 0.376 on 53.2 worker-hours, and J183's 0.483 are other populations'; the walls ~7-9 h at 6 workers for all 13 at J188's and J187's pace ({N8['wall']:,} s and {N7['wall']:,} s of walls for thirteen; J191's {N['wall']:,} s and J190's {N90['wall']:,} s ran beside GPU rounds with {len(PRESSURE)} memory-pressure events each, not a clean pace; *Sizing*)")
t = '\n'.join(lines)

# 6b. THE GUARD: no line names a seed or a base of J188's, J189's, J190's or J191's four families outside the explicit list of history
# lines below. Each entry is (a substring that names exactly one line of the output, why the old seeds may stand there).
OLD = (set(range(J188B, J189B + 14)) | set(range(J188B + 100, J189B + 114)) | set(range(J188B + 200, J189B + 214)) | set(range(J188B + 300, J189B + 314))
       | set(range(J190B, J190B + 14)) | set(range(J190B + 100, J190B + 114)) | set(range(J190B + 200, J190B + 214)) | set(range(J190B + 300, J190B + 314))
       | set(range(J191B, J191B + 14)) | set(range(J191B + 100, J191B + 114)) | set(range(J191B + 200, J191B + 214)) | set(range(J191B + 300, J191B + 314)))
TOK = re.compile(r'(?<![0-9A-Za-z.])(\d{4})(?![0-9A-Za-z.])')
ALLOW = [
    ("reserved. **J191's block is used** (deck seeds %s" % D191_R, 'the seeds paragraph: J191\'s block, used'),
    ('%s: lab-j191\'s), **J190\'s block is used** (deck seeds %s' % (X191_R, D190_R), 'the seeds paragraph: J191\'s reserved seeds and J190\'s block'),
    ("game seeds %s: lab-j190's), and **J189's block is spent**: J189 was posted (pc-jobs 005d0e25)" % X190_R, 'the seeds paragraph: J190\'s reserved seeds and J189\'s block'),
    ('validation deck seeds %d-%d and reserved game seeds %d-%d, and failed at its pilot' % (J189B + 201, J189B + 213, J189B + 301, J189B + 313), 'the seeds paragraph: J189\'s block'),
    ('from %d (the block right after J191\'s) to %d holds at least one used value' % (J191B + 13, BASE - 1), 'the seeds paragraph: the scan\'s first base and its sample'),
    ('`$((2465 + K))` and their companions (2401-2478, 2501-2578, 2601-2678, 2701-2778,', 'the seeds paragraph: earlier blocks, J188\'s among them'),
    ('validation game seeds 2740-2778 stay', 'the seeds paragraph: J186-J188\'s reserved validation game seeds'),
    ("J189's spent `$((%d + K))`, J190's `$((%d + K))`" % (J189B, J190B), 'the seeds paragraph: J189\'s and J190\'s bases'),
    ('%s, %s; %s reserved), or J191\'s `$((%d + K))`' % (G190_R, V190_R, X190_R, J191B), 'the seeds paragraph: J190\'s seeds and J191\'s bases'),
    ('%s reserved). **The game seeds stay in the 3xxx range**' % X191_R, 'the seeds paragraph: J191\'s reserved seeds'),
    ('included** ([%d, %d], [%d, %d]' % (J191B, J191B + 13, J191B + 100, J191B + 113), 'the seeds paragraph: the shift\'s ranges'),
    ("`%d + k` and `$((%d + K))`; J189's shift" % (J191B, J191B), 'the seeds paragraph: J191\'s bases'),
    ('# before any J192 data. DIFFERENT DECKS (J191: deck seeds %s, game seeds %s;' % (D191_R, G191_R), 'compare.py: J191\'s seeds, the comparison'),
    ("J191's in %s: one glob reads both" % G191_R, 'compare.py: J191\'s folders'),
    ("out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J191 (D508\\'s population, its fifth night; deck seeds %s," % D191_R, 'compare.py: J191\'s seeds'),
] + [('| s%02d | %s | %d | %d |' % (k, BANDS[k - 1], BASE + k, BASE + 100 + k), 'the decks table: J191\'s column (%d / %d)' % (J191B + k, J191B + 100 + k)) for k in range(1, 14)]
GL = t.split('\n')
# the NEW bases are the one exception, by exact expression: BASE + k, BASE + 100 + k and BASE + 200 + k; they are asserted below, line by line
NEWBASE = re.compile(r'(?<![0-9A-Za-z.])(%d|%d|%d) \+ [kK]\b' % (BASE, BASE + 100, BASE + 200))
HIT = {i: sorted({int(x) for x in TOK.findall(NEWBASE.sub('', l))} & OLD) for i, l in enumerate(GL)}
HIT = {i: v for i, v in HIT.items() if v}
ALLOWED_AT = {}
for sub, why in ALLOW:
    at = [i for i, l in enumerate(GL) if sub in l]
    if len(at) != 1:
        FAIL.append('guard: the allow-list entry %r names %d lines, not 1' % (sub[:90], len(at)))
    else:
        ALLOWED_AT[at[0]] = why
BAD = {i: v for i, v in HIT.items() if i not in ALLOWED_AT}
UNUSED_ALLOW = [ALLOWED_AT[i] for i in ALLOWED_AT if i not in HIT]
if BAD:
    FAIL += ['guard: line %d names %s outside the allowed history: %s' % (i + 1, v, GL[i][:160]) for i, v in sorted(BAD.items())]
if UNUSED_ALLOW:
    FAIL.append('guard: allowed lines that name no old seed (stale entries): %s' % UNUSED_ALLOW)
# J191's own tokens, by a substring grep (2900, 2901, 2913, 3001, 3013, 3101, 3113, 3201, 3213): every line holding one
GREP191 = [(i + 1, l) for i, l in enumerate(GL) if re.search(r'2900|2901|2913|3001|3013|3100|3101|3113|3201|3213', l)]
# and the pilot's computed seeds carry the new bases, nothing else
SPL = [l for l in GL if l.startswith('SP = [')]
VAL_ = [l for l in GL if l.startswith('VA = [')]
SPN = [l for l in GL if l.startswith('SPINES = {')]
SEEDX = [l for l in GL if '--seed $((' in l]
SEEDN = [l for l in GL if re.search(r'--seed \d{4} ', l)]
if not (len(SPL) == 1 and ('BANDS[k - 1], %d + k)' % BASE) in SPL[0]):
    FAIL.append('pilot: SP does not carry the base %d: %s' % (BASE, SPL))
if not (len(VAL_) == 1 and ('BANDS[k - 1], %d + k)' % (BASE + 200)) in VAL_[0]):
    FAIL.append('pilot: VA does not carry the base %d: %s' % (BASE + 200, VAL_))
if not (len(SPN) == 1 and ('BANDS[k - 1], %d + k, %d + k,' % (BASE, BASE + 100)) in SPN[0]):
    FAIL.append('pilot: SPINES does not carry the bases %d, %d: %s' % (BASE, BASE + 100, SPN))
XB = sorted({int(x) for l in SEEDX for x in re.findall(r'\$\(\((\d+) \+ K\)\)', l)})
if len(SEEDX) != 4 or XB != [BASE, BASE + 200]:
    FAIL.append('pilot: the --seed $((...)) lines carry %s, not [%d, %d] (%d lines)' % (XB, BASE, BASE + 200, len(SEEDX)))
GS = sorted(int(re.search(r'--seed (\d{4}) ', l).group(1)) for l in SEEDN if 'branch-random' in l)
if 2199 in GS:
    GS.remove(2199)    # the smoke: J166's pair at game seed 2199, every pilot's since J167, unchanged
if GS != [BASE + 100 + k for k in range(1, 14)]:
    FAIL.append('the spine blocks\' --seed literals are %s, not %d-%d' % (GS, BASE + 101, BASE + 113))
# the globs: no `2???`, `25??`, `29??` or `[23]???`; every `3???` a lab-j192 glob (or compare.py's, or the seeds paragraph's); `30??`
# only in the read of lab-j191
G3 = [l for l in GL if '3???' in l]
G30 = [l for l in GL if '30??' in l]
if not all('lab-j192' in l or "'b-s??-*-3???'" in l or '$D/b-s??-*-3???' in l or "D + '/b-s??-*-3???'" in l or "b-s??-*-3??? matches" in l
           or '`b-s??-*-3???`' in l for l in G3):
    FAIL.append('a 3??? line is not a lab-j192 glob: %s' % [l[:120] for l in G3 if 'lab-j192' not in l])
if not (len(G30) == 2 and all("lab-j191" in l for l in G30)):
    FAIL.append('the 30?? lines are not the read of lab-j191 and its sentence: %s' % [l[:120] for l in G30])
if len([l for l in GL if l.startswith('metrics: atlas_mapsa_ise = count /home/justin-a/code/lab/data/lab-j192/b-s??-*-3???/phaseB/logs/*.log "at mtgtable.ai.SearchPolicy.mapSa(SearchPolicy.java:924)"')]) != 1:
    FAIL.append('the atlas_mapsa_ise metric line is not there exactly once')
# every key-like line (`word: `) the runner might read is J191's set of keys, no new one from the prose's wrapping
KEYS191 = Counter(re.match(r'^([a-z_]+):', l).group(1) for l in SRC_T.split('\n') if re.match(r'^[a-z_]+: ', l))
KEYS191.pop('tonight', None)   # J191's one prose line that wrapped onto `tonight:` (the seat queue's sentence), rewrapped here
KEYS192 = Counter(re.match(r'^([a-z_]+):', l).group(1) for l in GL if re.match(r'^[a-z_]+: ', l))
if KEYS192 != KEYS191:
    FAIL.append('the key-like lines differ from J191\'s: %s' % sorted((KEYS192 - KEYS191).items()) + ' / ' + str(sorted((KEYS191 - KEYS192).items())))

# ======================================================================================================================================
# 7. write, then the audits
# ======================================================================================================================================
if FAIL:
    print('\n'.join(FAIL)); sys.exit(1)
assert '\x00' not in t
open(DST, 'w').write(t)
print('\nAUDIT: every four-digit token the shift changed, with its context:')
for v, w, ctx in AUDIT:
    print('  %d -> %d | %s' % (v, w, ctx))
print('changed tokens by value:', dict(sorted(Counter(v for v, _, _ in AUDIT).items())))
print('\nquoted J17x/J18x/J19x strings in the output (registered strings must keep their night):')
for m in sorted(set(re.findall(r"['\"]J1[789]\d[^'\"]{0,30}['\"]", t))):
    print('   ', m)
print('\nold population tokens (d507/d498/d497/d493/d488) left -- history and the never-pooled lists only:')
for m in re.finditer(r'random-[^ ]{1,8}-d(507|498|497|493|488)|[\'"]D507[\'"]', t):
    print('   ', t[max(0, m.start() - 60):m.end() + 10].replace('\n', ' '))
print('\nleft-over night words (night-fourteen / night fourteen / fourteenth / FIFTH night / fifth night of / five nights / J191 v5):')
for m in re.finditer(r'night-fourteen|night fourteen|fourteenth|FIFTH night|FIFTH contribution|[Ff]ifth night of|five nights|J191 v5|J191 \(drafts', t):
    print('   ', t[max(0, m.start() - 70):m.end() + 40].replace('\n', ' '))
print('\nlab-j186 .. lab-j192 mentions:', {x: t.count(x) for x in ('lab-j186', 'lab-j187', 'lab-j188', 'lab-j189', 'lab-j190', 'lab-j191', 'lab-j192')})
print('pin %s mentions: %d; J191\'s %s: %d; 43043fe5: %d; e557dedf: %d; 0a6cf5c1: %d; derive-j190: %d; derive-j191: %d; derive-j192: %d'
      % (P8, t.count(P8), J191P8, t.count(J191P8), t.count('43043fe5'), t.count('e557dedf'), t.count('0a6cf5c1'), t.count('derive-j190'), t.count('derive-j191'), t.count('derive-j192')))
print('J191 lines (comparison):', sum(1 for x in t.split('\n') if 'J191' in x), '  j191:', t.count('j191'), '  J190 lines (history):', sum(1 for x in t.split('\n') if 'J190' in x),
      '  j190:', t.count('j190'), '  J188 lines:', sum(1 for x in t.split('\n') if 'J188' in x), '  J187 lines:', sum(1 for x in t.split('\n') if 'J187' in x))
print('\nCOMPUTED FROM THE PIN %s (%s):' % (PIN, PIN_SUBJ[:100]))
print('  J191\'s registered pin %s; J190\'s %s; main %s' % (J191PIN, J190PIN, MAIN))
print('  git diff %s %s: %s' % (J191P8, P8, MOVED))
print('  commits since %s: %s | merges: %s' % (J191P8, MOVED_COMMITS, MOVED_MERGES))
print('  the frozen set since e557dedf (numstat):', NUM_FROZEN.strip().replace('\n', '; ').replace('\t', ' ') or 'nothing')
print('  commits on it since e557dedf:', FROZEN_COMMITS)
print('  bridge/src since 0a6cf5c1:', short(T['s0a6']), '| numstat:', T['num0a6'].strip() or 'none')
print('  since 480c837d:', short(T['s480']))
print('  deckcensus.ts: %d out, %d in, shape %s; blobs %s (%s), %s (%s); list nine %s; deck files unchanged since e557dedf %s'
      % (len(D_OUT), len(D_IN), CENSUS_SHAPE, DC_BLOB[:12], DC_LAST, UP_BLOB[:12], UP_LAST, LIST_OK, DECK_SAME))
for d in SPEC:
    print('  has_%s at the pin: %s' % (d.lower(), 'all names present' if not HAS[d] else 'MISSING ' + '; '.join(HAS[d])))
print('  D512\'s controls:', D512FIX)
print('  D513: %s added by %s; its fixtures %s; missing %s' % (DEC['D513'][0], D513C, D513_NEWFIX, D513_MISS or 'nothing'))
for x in SOFT:
    print('  SOFT (reported, not failed): ' + x)
print('  pin on origin/main:', PUSHED)
print('\nJ191 READ (lab-j191 and results/J191, read only):', N, 'pilot min', PILOT_MIN)
print('  per spine walls (min):', mins)
print('  frame logs %d (failed %s), forks %d (0 not the position), warnings %s' % (FRAMELOGS, FAILED_LOGS, FORKS, WARN))
print('  pressure: %d events; episodes back at 6 workers after %s min' % (len(PRESSURE), EPI))
print('  pump %s, s12 decisions %s, lki %s, exile links %s, timeouts %s, TimeoutException %s' % ({s: v for s, v in PUMP.items() if v}, sorted(S12D), {s: v for s, v in LKI.items() if v}, EXLB,
      {s: v for s, v in TOUT.items() if v}, {s: v for s, v in TEX.items() if v}))
print('  ncurve: final %d, at 50 kept %s (%s%%), at 100 kept %s (%s%%)' % (N['confident'], N['kept50'], N['kept50s'], N['kept100'], N['kept100s']))
print('  J190 (its report, history):', N90)
print('  J188:', N8, '| J187:', N7, '| J186 (by hand):', N6)
print('  pooled J186-J190 (J191\'s registered):', POOL4)
print('  pooled J186-J191:', POOL)
print('J191 draws registered: %d spine draws (%s ...), validation %s' % (len(J191_DRAWS), ', '.join(x[:12] for x in J191_DRAWS[:3]), J191_VAL[:12]))
print('THE SCAN: first clean base %s; blockers of %d..%d: %d values (by source %s); per base (first 3 values):'
      % (FIRST_CLEAN, J191B + 13, BASE - 1, len(BLOCKERS), dict(BY_SRC)))
for b_ in sorted(SCAN):
    if b_ < BASE and (b_ - J191B) % 50 == 13:
        print('  %d: %s  (%s)' % (b_, SCAN[b_][:3], '; '.join('%d in %s' % (v, ', '.join(sorted(USED_AT[v])[:2])) for v in SCAN[b_][:1])))
print('seed grep (%s at pc-jobs %s + drafts *.md and *.py, decimals and hex counted): %d hit(s); data folders: %s' % (PAT, PCJ, len(odd), DATA_HIT or 'none'))

# ======================================================================================================================================
# 8. the pilot's own lines: equal to J191's (but folder and stamp), then run against the pin: has_*, seat_code, commits, golden, deck_code;
# and D513's checker at the pin on J191's two s08 logs and on its own self-test
# ======================================================================================================================================
A0, A1 = "# D466-D486: J171's greps, unchanged", 'test -z "${CUBELAB_WORKER_XMX:-}"'
blk = t[t.index(A0):t.index(A1)]
blk_src = SRC_T[SRC_T.index(A0):SRC_T.index(A1)]


def code(s):
    return [x for x in s.split('\n') if not x.lstrip().startswith('#')]


back = code(blk.replace('lab-j192', 'lab-j191').replace('J192', 'J191'))
diffl = [x for x in back if x not in code(blk_src)] + [x for x in code(blk_src) if x not in back]
expect('every shell and Python line of the pilot\'s pin-decided block (has_*, seat_code, the commits, the golden, deck_code) is J191\'s, byte for byte, '
       'but its folder and stamp (%d lines; %d differ)' % (len(back), len(diffl)), back == code(blk_src))
TREE = SCRJ + '/tree'
shutil.rmtree(TREE, ignore_errors=True)
os.makedirs(TREE + '/var/lab-j192-local/bin')
subprocess.run('git -C %s archive %s -- bridge/src tools docs fixtures web/test cubes/library | tar -x -C %s' % (REPO, PIN, TREE),
               shell=True, check=True)
run = re.sub(r'\bgit ', 'git -C %s ' % REPO, blk).replace('HEAD', PIN)
open(SCRJ + '/pilot-lines.sh', 'w').write('set -u\n' + run)
pr = subprocess.run(['bash', SCRJ + '/pilot-lines.sh'], cwd=TREE, capture_output=True, text=True)
open(SCRJ + '/pilot-lines.out', 'w').write(pr.stdout + pr.stderr)
V = TREE + '/var/lab-j192-local/'
OUTS = sorted(os.path.basename(f) for f in glob.glob(V + 'has-*.txt') + [V + x for x in ('seat-code.txt', 'deck-code.txt', 'golden.json') if os.path.exists(V + x)])
print('\nTHE PILOT\'S OWN LINES ON THE PIN (git archive into %s, `git -C` on the main checkout, HEAD read as %s; %s):' % (TREE, P8, SCRJ + '/pilot-lines.out'))
for f in OUTS:
    v = open(V + f).read().strip()
    ok = (json.loads(v) == {'descends': 1, 'changed': 1, 'note': 1, 'digestsJ170': 1}) if f == 'golden.json' else v == '1'
    print('  %-28s %s' % (f, v))
    expect('the pilot line writing %s prints 1 on the pin' % f, ok)
expect('the pilot\'s lines wrote every has_*, seat-code, commits, golden and deck-code file (%d)' % len(OUTS),
       {'seat-code.txt', 'deck-code.txt', 'golden.json', 'has-d481-d512-commits.txt', 'has-d510.txt', 'has-d511.txt', 'has-d512.txt', 'has-d508.txt'} <= set(OUTS))
for x in pr.stdout.splitlines():
    if x.startswith(('J192: seat code', 'J192: deck code', 'J192 deck code', 'J192: seat-identity', 'J192: D51')):
        print('  | ' + x)
# D513 at the pin: its checker passes J191's two s08 logs (the atlas's own flag for a branch log, --empty-hand-ok), J191's pin's checker
# fails them (the contrast: the misread is what moved), and the pin's checker self-test passes (D513's four controls among it)
OLDTREE = SCRJ + '/tree191'
shutil.rmtree(OLDTREE, ignore_errors=True)
os.makedirs(OLDTREE)
subprocess.run('git -C %s archive %s -- tools/check-redaction.mjs tools/adversary | tar -x -C %s' % (REPO, J191PIN, OLDTREE), shell=True, check=True)
CHK = {}
for lg in S08_LOGS:
    CHK[os.path.basename(lg)] = tuple(subprocess.run(['node', 'tools/check-redaction.mjs', '--empty-hand-ok', lg], cwd=tr, capture_output=True, text=True).returncode
                                      for tr in (TREE, OLDTREE))
expect('the pin\'s checker passes J191\'s two s08 logs under --empty-hand-ok, and J191\'s pin\'s checker fails both (%s)'
       % ', '.join('%s: pin %d, %s %d' % (k.replace('.jsonl.gz', ''), v[0], J191P8, v[1]) for k, v in CHK.items()), all(v == (0, 1) for v in CHK.values()) and len(CHK) == 2)
STR = subprocess.run(['node', 'tools/check-redaction-selftest.mjs'], cwd=TREE, capture_output=True, text=True)
open(SCRJ + '/redaction-selftest.out', 'w').write(STR.stdout + STR.stderr)
expect('the pin\'s checker self-test passes on the pin\'s tree (D513\'s four controls among it: %s)'
       % ', '.join(n.replace('.jsonl', '') for n, _ in D513FIX), STR.returncode == 0 and 'check-redaction self-test OK' in STR.stdout
       and all(n in STR.stdout for n, _ in D513FIX))

print('\nTHE GUARD: %d line(s) name a seed or base of J188\'s, J189\'s, J190\'s or J191\'s families, every one on the allow list:' % len(HIT))
for i in sorted(HIT):
    print('  %4d %s  [%s]' % (i + 1, HIT[i], ALLOWED_AT[i]))
print('\nA SUBSTRING GREP for J191\'s tokens (2900|2901|2913|3001|3013|3100|3101|3113|3201|3213): %d line(s)' % len(GREP191))
for i, l in GREP191:
    print('  %4d %s' % (i, l[:200]))
print('\nTHE GLOBS: %d line(s) hold 3???, %d hold 30??; 2???, 25??, 29?? and [23]???: none' % (len(G3), len(G30)))
for i, l in enumerate(GL):
    if '3???' in l or '30??' in l:
        print('  %4d %s' % (i + 1, l[:200]))
print('\nTHE SEED LINES OF %s (SP, VA, SPINES, --seed):' % DST)
for i, l in enumerate(GL):
    if l.startswith(('SP = [', 'VA = [', 'SPINES = {')) or '--seed $((' in l or re.search(r'--seed \d{4} ', l):
        print('  %4d %s' % (i + 1, l[:230]))
print('\nEVERY LINE HOLDING A 28xx-39xx NUMBER:')
for i, l in enumerate(GL):
    v = [int(x) for x in TOK.findall(l) if 2800 <= int(x) <= 3999]
    if v:
        print('  %4d %s | %s' % (i + 1, sorted(set(v)), l[:200]))

print('\nEXPECTATIONS OF THE FINAL PIN:')
for what, ok in EXPECT:
    print('  %s  %s' % ('ok  ' if ok else 'FAIL', what))
print('\n%d expectations, %d met' % (len(EXPECT), sum(1 for _, ok in EXPECT if ok)))
print('\nwrote', DST, 'lines', n0, '->', len(t.splitlines()), '; public_title %r, %d chars' % (PUBLIC_TITLE, len(PUBLIC_TITLE)))
print('\nTHE RUNNER\'S CHECK (%s check):' % RUNNER)
r = subprocess.run([RUNNER, 'check', DST], capture_output=True, text=True, cwd=REPO)
outl = (r.stdout + r.stderr).splitlines()
print('  exit %d' % r.returncode)
for x in outl:
    if not x.startswith(('decides:', 'hypothesis:', 'rule:')):
        print('  | ' + x[:300])
bad = [w for w, ok in EXPECT if not ok]
if bad:
    print('\nNOT POSTABLE: this pin misses %d expectation(s) of the final pin (above); the draft is written for reading only.' % len(bad))
    sys.exit(3)
sys.exit(0 if r.returncode == 0 else 2)

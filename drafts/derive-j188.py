#!/usr/bin/env python3
"""Derive J188's job file from J187's, by derive-j183.py's three-trap rule (derive-j187.py's shape):
(1) rename only the job's own name (J187 -> J188), then move the comparison night (J186 -> J187) on what is left -- J186 stays J186 wherever
it names D508's population's FIRST night (pooled, not compared): every such sentence is a hand edit, stashed before the renames;
(2) shift the four seed ranges inclusive of their bases, [2452, 2465] and its three companions, +13, skipping any number touching a
letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints every change);
(3) change registered strings only on purpose, each one named here.
J188 is D508's population's THIRD night (`random-<band>-d508`, `randomSeat: "D508"`, unchanged), its labels pooled with J186's twelve
finished spines and J187's thirteen. Between J187's pin (43043fe5, D509's merge) and this pin three lanes merged: D510 (the target record
writes a target the seat cannot see as `option:hidden`; record-only under D509 point 2), D511 (an atlas unit's replay records into a sink
that writes nothing, so it is the recorded baseline's game; `tools/cubelab/CubeLab.java` between landings under D509 point 1, and the
atlas-selftest's replay leg in `tools/cubelab/atlas.ts`) and D512 (the redaction checker admits J187's s06 hideaway shape; the checker,
its fixtures and docs only). So the `seat_code` test no longer demands D509's frozen set byte-identical to J186's pin: it ADMITS EXACTLY
D510's four `bridge/src` files and D511's two `tools/cubelab` files, at their registered numstat (ADMIT, below: the contract), and
nothing else -- `git diff --numstat e557dedf <pin> -- bridge/src tools/cubelab fixtures/cubelab/seat-identity.json forge-home/` must be
that list, here and in the job's own pilot line, so a pin whose diff is larger fails both.
EVERYTHING THE PIN DECIDES IS COMPUTED FROM THE PIN WITH GIT, never typed: the `seat_code` lists (J187's lists recomputed at J187's pin
must be J187's test line byte for byte, and at this pin they must be J187's plus D510's four files and nothing else), the `deck_code`
values (J187's, unchanged), whether D505-D508's names are there (J187's lines, byte for byte) and D510-D512's (D512's fixture names are a
SOFT grep: reported, never failed, since the final pin lands after this script was written), and the commits that added D481-D512's
decision files. The derivation then RUNS the pilot's own has_*, seat_code, commit, golden and deck_code lines against the pin (a
`git archive` of it in the scratchpad, `git -C` on the main checkout read-only, HEAD read as the pin) and requires every one to print 1.
J187's night is read only (lab-j187, results/J187), and so are J186's by-hand report and its --times rerun (the scratchpad).

  python3 derive-j188.py <pin>     writes drafts/J188-atlas-4b-night-twelve.md, prints the audit, runs the runner's check
Exit 0: written, every expectation of the final pin met, the checker clean. Exit 3: written, but the pin misses an expectation: NOT
POSTABLE. Exit 1: nothing written (a stash or a computation failed). Exit 2: written, the checker not clean."""
import fnmatch, glob, hashlib, json, math, os, re, shutil, subprocess, sys
from collections import Counter
from datetime import datetime

REPO = '/home/justin-a/code/mtg-table'
SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J187-atlas-4b-night-eleven.md'
DST = '/home/justin-a/code/pc-results/drafts/J188-atlas-4b-night-twelve.md'
RUNNER = '/home/justin-a/code/mtg-table/tools/runner.sh'      # the main checkout's (the brief: never run anything under ~/code/lab)
L187 = '/home/justin-a/code/lab/data/lab-j187'                # read only
R187 = '/home/justin-a/code/pc-results/results/J187'          # read only
SCR = '/tmp/claude-1000/-home-justin-a-code-mtg-table/8723af12-0157-421e-988a-473182e5a3f1/scratchpad'
BYHAND186 = SCR + '/j186/report/labels.json'                  # the coordinator's by-hand report of J186 (derive-j187.py's)
TIMES186 = SCR + '/j187/times/labels.json'                    # labels.py with --times on lab-j186 (derive-j187.py's rate)
SCRJ = SCR + '/j188'                                          # this derivation's scratch: the pin's tree and the pilot's lines run on it
PREV = 'e557dedfa7cf67803ba0ba362655a2120ea8f83a'   # J186's pin: D508's merge, the population's opening pin (the frozen set's base)
PREV187 = '43043fe59a1c0d51d7628a0212d34af2a11e0445'  # J187's pin: D509's merge (docs only)
PREV2 = '0a6cf5c1ec05f03ca27d34af1b529a5e72646cea'  # J185's pin (the merge of D505-D507)
PREV3 = '3275af30498e91c03d652d021685d9847b62d95f'  # J183's pin (the merge of D502-D504)
J182PIN = 'ac07876b97e052b3e0ddd530a1930173e998133c'
FROZEN509 = 'bridge/src tools/cubelab/CubeLab.java fixtures/cubelab/seat-identity.json forge-home/'   # D509 point 1, by path (J187's test)
FROZEN = 'bridge/src tools/cubelab fixtures/cubelab/seat-identity.json forge-home/'                  # what J188's test reads, wider
# THE CONTRACT: what the frozen set may have changed by since J186's pin, file by file, (added, deleted, the decision). Typed on purpose:
# a pin whose diff is anything else fails the derivation and the job's own seat_code line.
ADMIT = {'bridge/src/mtgtable/SelectionSelfTest.java': ('2', '1', 'D510'), 'bridge/src/mtgtable/ai/Decision.java': ('4', '4', 'D510'),
         'bridge/src/mtgtable/ai/DecisionSelfTest.java': ('64', '13', 'D510'), 'bridge/src/mtgtable/ai/Decisions.java': ('47', '12', 'D510'),
         'tools/cubelab/CubeLab.java': ('68', '1', 'D511'), 'tools/cubelab/atlas.ts': ('49', '1', 'D511')}
ADMIT_BRIDGE = sorted(f for f in ADMIT if f.startswith('bridge/src/'))
ADMIT_STR = ''.join(x.replace('\t', ' ') + ' ' for x in sorted('%s\t%s\t%s' % (v[0], v[1], k) for k, v in ADMIT.items()))   # LC_ALL=C sort's order


def git(*a, ok=False):
    r = subprocess.run(['git', '-C', REPO] + list(a), capture_output=True, text=True)
    if r.returncode and not ok:
        sys.exit('git %s: %s' % (' '.join(a), r.stderr.strip()))
    return r.stdout if not ok else (r.returncode, r.stdout)


if len(sys.argv) < 2 or not re.fullmatch(r'[0-9a-f]{7,40}', sys.argv[1]):
    sys.exit('usage: derive-j188.py <pin>   (a sha of mtg-table, short or full)')
PIN = git('rev-parse', '--verify', sys.argv[1] + '^{commit}').strip()
P8 = PIN[:8]
for base, who in ((PREV, "J186's"), (PREV187, "J187's")):
    if git('merge-base', '--is-ancestor', base, PIN, ok=True)[0] != 0:
        sys.exit('derive-j188: %s pin %s is not an ancestor of %s' % (who, base[:8], P8))
SRC_T = open(SRC).read()
EXPECT = []    # (what the final pin must show, met?)
SOFT = []      # reported, never failed (D512's fixture names)


def expect(what, ok):
    EXPECT.append((what, bool(ok)))


# ======================================================================================================================================
# A. computed from the pin: the seat code (D509's frozen set since J186's pin: exactly D510's and D511's admitted changes)
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
# the frozen set since J186's pin: exactly ADMIT, file by file and line count by line count
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

# the history lists: recomputed at J187's pin they must be J187's test line byte for byte; at this pin, J187's plus D510's files
SEAT_LINE = None


def seat_test(at):
    s480, s6e8, s7a9, sac0, s327, s0a6 = (names(b, at=at) for b in (B480, B6E8, B7A9, J182PIN, PREV3, PREV2))
    num327, num0a6 = numstat(PREV3, at=at), numstat(PREV2, at=at)
    spnum = ' '.join(git('diff', '--numstat', B6E8, at, '--', 'bridge/src/mtgtable/ai/SearchPolicy.java').split('\t')[:2]).strip()
    line = 'SEAT_480="%s"' % shlist(s480)
    test = (f'''  test "$(git diff --name-only {B480} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "$SEAT_480" && test "$(git diff --name-only {B6E8} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s6e8)}" && test "$(git diff --numstat {B6E8} HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr '\\t' ' ')" = "{spnum}" && test "$(git diff --name-only {B7A9} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s7a9)}" && test "$(git diff --name-only {J182PIN} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(sac0)}" && test "$(git diff --name-only {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s327)}" && test "$(git diff --numstat {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{num327}" && test "$(git diff --name-only {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(s0a6)}" && test "$(git diff --numstat {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{num0a6}"''')
    return dict(s480=s480, s6e8=s6e8, s7a9=s7a9, sac0=sac0, s327=s327, s0a6=s0a6, num327=num327, num0a6=num0a6, spnum=spnum, line=line, test=test)


T187 = seat_test(PREV187)
TEST187_LINE = T187['test'] + f' && git diff --quiet {PREV} HEAD -- {FROZEN509} && sc=1'
expect('seat_code: every list and numstat recomputed at J187\'s pin 43043fe5 is J187\'s, byte for byte (SEAT_480 and the test line: this script\'s template is J187\'s)',
       T187['line'] in SRC_T.splitlines() and TEST187_LINE in SRC_T.splitlines())
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
TEST188 = T['test'] + f' && test "$(git diff --numstat {PREV} HEAD -- {FROZEN} | LC_ALL=C sort | tr \'\\t\\n\' \'  \')" = "{ADMIT_STR}" && sc=1'


def short(xs):
    return ', '.join(x.replace('bridge/src/mtgtable/', '') for x in xs) if xs else 'nothing'


# ======================================================================================================================================
# B. computed from the pin: the deck code (J187's values, unchanged: D510-D512 touch no deck file)
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


def reg(pat):
    m = re.search(pat, SRC_T)
    return m.group(1) if m else None


J187_DECK = {'DC_BLOB': reg(r"DC_BLOB, UP_BLOB = '([0-9a-f]{40})'"), 'UP_BLOB': reg(r"DC_BLOB, UP_BLOB = '[0-9a-f]{40}', '([0-9a-f]{40})'"),
             'OUT_SHA': reg(r"OUT_SHA = '([0-9a-f]{64})'"), 'IN_SHA': reg(r"IN_SHA = '([0-9a-f]{64})'"), 'N': reg(r'OUT_N, IN_N = (\d+, \d+)')}
expect('cubes/library/ unchanged since J171\'s pin f2b4e9c2', LIB_SAME)
expect('deckcensus.ts differs from f2b4e9c2\'s in comment lines and the one throw\'s message only (%d out, %d in)' % (len(D_OUT), len(D_IN)), CENSUS_SHAPE)
expect('engine-unplayable.json is the nine cards in order (D482, D490, D492, D494, D506)', LIST_OK)
expect('the deck code is unchanged since J186\'s pin e557dedf (D509-D512 touch no deck file)', DECK_SAME)
expect('deck_code: both blobs, both sha256s and the line counts recomputed at the pin are J187\'s registered values',
       J187_DECK == {'DC_BLOB': DC_BLOB, 'UP_BLOB': UP_BLOB, 'OUT_SHA': OUT_SHA, 'IN_SHA': IN_SHA, 'N': '%d, %d' % (len(D_OUT), len(D_IN))})

# ======================================================================================================================================
# C. D505-D508's names (J187's lines, evaluated at this pin), D510-D512's names, and D509-D512's commits
# ======================================================================================================================================
def bre(s):
    return re.sub(r'([\[\]*\\^$])', r'\\\1', s)


def q(s):
    return "'%s'" % s if "'" not in s else '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')


AGAIN = 'derive-j186.py, and again, unchanged, by derive-j187.py'
AGAIN8 = 'derive-j186.py, and again, unchanged, by derive-j187.py and derive-j188.py'
SPEC = {
    'D505': ('# D505 (hideaway\'s look kept while the card stays in exile, the dig tied by its trigger\'s resolution; amends D502; the names this file\n'
             '# reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py and derive-j188.py)',
             [('dec', 'D505'), ('grep', 'docs/decisions/D505-*.md', 'mayLookFaceDownExile'), ('grep', 'tools/check-redaction.mjs', 'const RESOLVE_WITHIN = [10, 3];'),
              ('file', 'fixtures/negative/redaction/a9-hideaway-alt-kept-after-the-host-leaves.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'")]),
    'D506': ('# D506 (Old Man of the Sea and Rubinia Soulsinger on the engine-unplayable list; D482\'s rule admits an overflow or hang inside one\n'
             '# step; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py and\n'
             '# derive-j188.py)',
             [('dec', 'D506'), ('grep', 'docs/decisions/D506-*.md', 'controllerChangeZoneCorrection'), ('grep', 'tools/cubelab/engine-unplayable.json', '"Old Man of the Sea"'),
              ('grep', 'tools/cubelab/engine-unplayable.json', '"Rubinia Soulsinger"'), ('grep', 'tools/cubelab/engine-unplayable.json', 'measured overflow or hang'),
              ('grep', 'tools/cubelab/deckcensus.ts', 'D506'), ('grep', 'web/test/cubelab-deck-census.test.ts', "'Old Man of the Sea', 'Rubinia Soulsinger'")]),
    'D507': ('# D507 (the seat\'s gate sees a Stack-zone card only with a stack instance or as a spell copy; the worker log\'s [ghost] line; protocol\n'
             '# M79; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py and\n'
             '# derive-j188.py; D508 keeps the Stack rule over the card the game holds)',
             [('dec', 'D507'), ('grep', 'docs/decisions/D507-*.md', 'random-<band>-d507'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean onStack('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'now.isCopiedSpell() || onStack(now)'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String ghostLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[ghost] card "'), ('grep', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'ghostLine(49)'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void ghosts()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void copies()'), ('grepline', 'docs/protocol.md', '| M79 |')]),
    'D508': ('# D508 (the seat\'s gate judges a candidate where the game holds the card now, never by a last-known copy\'s zone; the worker log\'s\n'
             '# [lki] line; protocol M80; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by\n'
             '# derive-j187.py and derive-j188.py)',
             [('dec', 'D508'), ('grep', 'docs/decisions/D508-*.md', 'random-<band>-d508'), ('grep', 'docs/decisions/D508-*.md', 'getCardState'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static Card current('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'g.getCardState(c, null)'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static boolean lastKnown('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String lastKnownLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[lki] card "'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'return visibleAt(current(c), ai);'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean visibleAt('),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void lastKnown()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'g.copyLastState();'), ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'an ability whose host object is now in seat 0'), ('grepline', 'docs/protocol.md', '| M80 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 12. J185\'s checker failure (D508')]),
    'D510': ('# D510 (a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly; protocol M81;\n'
             '# record-only under D509 point 2: the names this file reads, computed against the pin by derive-j188.py)',
             [('dec', 'D510'), ('grep', 'docs/decisions/D510-*.md', 'Record-only, under D509'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static void targetAnswer('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'private static boolean among('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static final String HIDDEN = "option:hidden";'),
              ('file', 'fixtures/negative/redaction/m81-target-option-hidden.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'m81-target-option-hidden.jsonl', 'pass'"), ('grepline', 'docs/protocol.md', '| M81 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 13. J186\'s empty target records (D510')]),
    'D511': ('# D511 (an atlas unit\'s replay records into a sink that writes nothing, so it plays the recorded baseline\'s game; CubeLab.java only,\n'
             '# between landings under D509 point 1; the atlas-selftest\'s replay leg: the names this file reads, computed against the pin by\n'
             '# derive-j188.py)',
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


# D512 (in flight while this script was written): its decision file by glob, and the fixtures its lane adds under
# fixtures/negative/redaction/ that name hideaway, each with its row in the checker's self-test -- a SOFT grep: what is found goes into
# has_d512's line, what is missing is reported, never failed (the decision file alone is hard)
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


# D512's controls: a fixture naming hideaway and the viewer's own permanent that is new since J187's pin, or whose verdict row changed
D512FIX = sorted(x for x in ALLFIX if viewer_own(os.path.basename(x))
                 and (x in NEWFIX or verdict(os.path.basename(x), SELFTEST_AT) != verdict(os.path.basename(x), SELFTEST_187)))
OTHER_HIDEAWAY_NEW = sorted(os.path.basename(x) for x in NEWFIX if 'hideaway' in x and x not in D512FIX)
SPEC_D512 = [('dec', 'D512')]
if D512F:
    t512 = git('show', '%s:%s' % (PIN, D512F[0]))
    if 'hideaway' in t512:
        SPEC_D512.append(('grep', 'docs/decisions/D512-*.md', 'hideaway'))
    else:
        SOFT.append('D512\'s decision file does not name hideaway')
else:
    SOFT.append('no D512 decision file at the pin, so none of its names could be read')
if not D512FIX:
    SOFT.append('no fixture under fixtures/negative/redaction/ naming hideaway and the viewer\'s own permanent is new or re-verdicted since 43043fe5 (D512\'s controls not found)')
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
SPEC['D512'] = ('# D512 (the redaction checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back: J187\'s s06;\n'
                '# the checker, its fixtures and docs only; the names this file reads, computed against the pin by derive-j188.py: the\n'
                '# decision file by glob, and its controls under fixtures/negative/redaction/ naming hideaway and the viewer\'s own permanent,\n'
                '# new or re-verdicted since J187\'s pin, each with its row in the checker\'s self-test)',
                SPEC_D512)

HAS = {}
for d, (_, items) in SPEC.items():
    HAS[d] = evaluate(items, files_at)
    expect('%s\'s names at the pin%s' % (d, '' if not HAS[d] else ': missing ' + '; '.join(HAS[d])), not HAS[d])
    if d in ('D505', 'D506', 'D507', 'D508'):
        expect('%s\'s shell line is J187\'s, byte for byte (but its folder)' % d, shell_of(d, items, 'lab-j187-local') in SRC_T.splitlines())
DEC = {}
for d in ('D509', 'D510', 'D511', 'D512'):
    fs = [x for x in git('ls-tree', '-r', '--name-only', PIN, 'docs/decisions/').splitlines() if x.startswith('docs/decisions/%s-' % d)]
    c = git('log', '--diff-filter=A', '--format=%H', '-n', '1', PIN, '--', fs[0]).strip() if fs else ''
    anc = bool(c) and git('merge-base', '--is-ancestor', c, PIN, ok=True)[0] == 0
    DEC[d] = (fs, c)
    expect('%s\'s decision file is at the pin (%s), added by %s, an ancestor of the pin' % (d, fs[0] if fs else 'none', c[:8] or 'no commit'), len(fs) == 1 and anc)
expect('D509-D511\'s files are the ones this derivation read', [DEC[d][0] for d in ('D509', 'D510', 'D511')] == [
    ['docs/decisions/D509-seat-frozen-between-landings.md'], ['docs/decisions/D510-all-hidden-target-record.md'], ['docs/decisions/D511-atlas-replay-is-the-recorded-game.md']])

# ======================================================================================================================================
# D. J187's night, read only: its report, its data folder, the runner's results; J186's by-hand numbers (derive-j187.py's)
# ======================================================================================================================================
lb = json.load(open(L187 + '/report/labels.json'))
fr = lb['f_futilityRead']
c7 = lb['c_sizing7']['asRun']
assert (lb['labels'], lb['confident'], lb['branched'], lb['partialLabels'], lb['futilityControls']) == (83, 28, 163, 47, 10), 'J187 labels'
assert (fr['read'], fr['stopped'], fr['controls'], fr['controlsConfident']) == (130, 47, 10, 0), fr
assert (c7['wallSec'], c7['workerHours'], c7['confidentPerWorkerHour'], c7['confidentPerWorkerHourPoisson95'], c7['confidentPer7Worker10hNight'],
        c7['confidentPer7Poisson95']) == (31071, 51.79, 0.5407, [0.3593, 0.7815], 37.8, [25.2, 54.7]), c7
assert lb['c_sizingRead'].get('j186') is None and sorted(lb['pools']) == sorted('random-%s-d508' % x for x in ('pauper', 'peasant', 'legacy', 'powered'))
SPINES13 = ['s%02d' % k for k in range(1, 14)]
assert sorted(lb['bySpine']) == SPINES13
STATUS = open(R187 + '/STATUS').read()
assert STATUS.startswith('failed') and 'atlas.problems = 2' in STATUS and 'atlas.refusedCastOptions = 1' in STATUS and 'atlas.lostCastOptions = 1' in STATUS
CHECKS = open(R187 + '/checks.txt').read().splitlines()
FAILED = [x for x in CHECKS if x.startswith('FAIL')]
assert len(FAILED) == 3 and len(CHECKS) == 50, (FAILED, len(CHECKS))
MET = json.load(open(R187 + '/metrics.json'))
assert (MET['unit_errors'], MET['replay_diverged'], MET['ghost_candidates'], MET['lki_candidates'], MET['stack_overflows'], MET['pump_effect_ioobe'],
        MET['branch_error_stacks'], MET['branches'], MET['branch_timeouts'], MET['engine_errors']) == (0, 0, 7, 0, 0, 60, 118, 55210, 0, 0), MET
assert MET['atlas.refusedCastOptions'] == 1 and MET['atlas.lostCastOptions'] == 1 and MET['peak_worker_rss_gb'] == 1.64
WALL, starts = {}, []
for line in open(L187 + '/spine-times.txt'):
    f = line.split()
    s = f[0].split('-')[1]
    WALL[s] = (WALL.get(s, (0,))[0] + int(f[2]) - int(f[1]), f[3])
    starts.append(int(f[1]))
assert sorted(WALL) == SPINES13 and all(v[1] == '6' for v in WALL.values())
wall_s = sum(v[0] for v in WALL.values())
assert wall_s == 31071
mins = {k: round(v[0] / 60, 1) for k, v in WALL.items()}
SMAX = max(mins, key=lambda k: mins[k])
J187_START = int(datetime.fromisoformat('2026-11-03T17:10:07-05:00').timestamp())    # results/J187/STATUS `started`
assert 'started: 2026-11-03T17:10:07-05:00' in STATUS and 'finished: 2026-11-04T02:15:39-05:00' in STATUS
PILOT_MIN = round((min(starts) - J187_START) / 60)


def lines_in(p, text=None):
    try:
        return sum(1 for x in open(p, errors='replace') if text is None or text in x)
    except OSError:
        return 0


def one(pat):
    g = glob.glob(pat)
    assert len(g) == 1, pat
    return g[0]


def logcount(s, text):
    return sum(lines_in(f, text) for f in glob.glob(L187 + '/b-%s-*/phaseB/logs/*.log' % s))


ROWS_G = {s: lines_in(one(L187 + '/b-%s-*/phaseB/branches.jsonl' % s)) for s in SPINES13}
REPLAY = {s: lines_in(one(L187 + '/b-%s-*/phaseB/units.jsonl' % s), 'replay diverged') for s in SPINES13}
PUMP = {s: logcount(s, 'at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)') for s in SPINES13}
HOOK_TEXT = 'at forge.game.ability.effects.PlayEffect.resolve(PlayEffect.java:90)'
HOOK = {s: logcount(s, HOOK_TEXT) for s in SPINES13}
HOOKLIT = {s: logcount(s, 'Atlas$Hook.decision') for s in SPINES13}
GHOST = {s: logcount(s, '[ghost]') for s in SPINES13}
GHOSTCARDS = Counter(m.group(1) for f in glob.glob(L187 + '/b-s01-*/phaseB/logs/*.log') for x in open(f, errors='replace')
                     for m in [re.search(r'\[ghost\] card (\d+) ', x)] if m)
LKI = {s: logcount(s, '[lki]') for s in SPINES13}
TEX = {s: logcount(s, 'TimeoutException') for s in SPINES13}
NPE = sum(logcount(s, 'NullPointerException') for s in SPINES13)
SO = sum(lines_in(f, 'StackOverflowError') for f in glob.glob(L187 + '/b-s??-*-25??/phaseB/branches.jsonl'))
EXITS = dict(l.split() for l in open(L187 + '/exits.txt') if l.strip())
PROB = {s: json.load(open(one(L187 + '/b-%s-*/atlas.json' % s)))['checks']['problems'] for s in SPINES13}
assert {s: v for s, v in PUMP.items() if v} == {'s04': 60} and {s: v for s, v in HOOK.items() if v} == {'s04': 58}, (PUMP, HOOK)
assert sum(HOOKLIT.values()) == 120 and {s: v for s, v in TEX.items() if v} == {'s03': 1, 's07': 1} and NPE == 0, (HOOKLIT, TEX, NPE)
assert {s: v for s, v in GHOST.items() if v} == {'s01': 7} and GHOSTCARDS == Counter({'55': 5, '46': 2}) and not any(LKI.values()) and SO == 0
assert not any(REPLAY.values()) and sum(ROWS_G.values()) == 55210
assert {k: v for k, v in EXITS.items() if v != '0'} == {'b-s03-legacy-2555': '3', 'b-s06-peasant-2558': '3'} and len(EXITS) == 13
assert {s: len(v) for s, v in PROB.items() if v} == {'s03': 1, 's06': 1}
assert PROB['s03'][0].startswith('975 branch fork(s) were not the position: atlas:d23:random:o0:b0:')
assert PROB['s06'][0] == '2 frame log(s) failed tools/check-redaction.mjs: d14-random-o0-b48-seat1.jsonl.gz, d21-random-o1-b58-seat1.jsonl.gz'
S03F = json.load(open(one(L187 + '/b-s03-*/atlas.json')))['checks']
assert (S03F['forks'], S03F['forkProblems']) == (6600, 975)
TOOL = json.load(open(L187 + '/report/tool.json'))
assert TOOL['refusedCastOptionList'] == ['s06 d21/random/o3'] == TOOL['lostCastOptionList'] and TOOL['refusedCastCards']['Lively Dirge'] == 680 and TOOL['lostCastCards']['Lively Dirge'] == 340
REFSHARE = round(100 * TOOL['refusedCastShare'], 2)
assert REFSHARE == 0.33
GB = round(sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(L187) for x in fs) / 1e9, 1)
CMP = json.load(open(L187 + '/report/compare-j186.json'))
assert CMP['night']['before'] is None and CMP['night']['this']['decisionsBranched'] == 130
PERSPINE = round(CMP['night']['this']['decisionsBranched'] / 13, 1)
N = {'branched': lb['branched'], 'labels': lb['labels'], 'confident': lb['confident'], 'partial': lb['partialLabels'], 'controls': lb['futilityControls'],
     'ctlConf': fr['controlsConfident'], 'read': fr['read'], 'stopped': fr['stopped'], 'cpwh': round(c7['confidentPerWorkerHour'], 3),
     'cpwh95': [round(x, 3) for x in c7['confidentPerWorkerHourPoisson95']], 'c7': c7['confidentPer7Worker10hNight'], 'p95': c7['confidentPer7Poisson95'],
     'wall': wall_s, 'wallh': round(wall_s / 3600, 1), 'wh': round(c7['workerHours'], 1), 'whx': c7['workerHours'], 'minmin': min(mins.values()),
     'maxmin': max(mins.values()), 'smax': SMAX, 'games': sum(ROWS_G.values()), 'perSpine': round(lb['branched'] / 13, 1), 'perSpineCmp': PERSPINE, 'gb': GB, 'hook': sum(HOOK.values()),
     'pump': sum(PUMP.values()), 'ghost': sum(GHOST.values()), 'errs': MET['branch_error_stacks']}
NOTE = {'s01': ' (7 `[ghost]` lines, cards 55 and 46: D507\'s gate, as designed)',
        's03': ' (exit 3: 975 of 6,600 forks not the position -- the replay divergence, D511, in this pin; 1 Forge AI-eval timeout)',
        's04': ' (118 branch errors: 60 PumpEffect IOOBEs, 58 PlayEffect IOOBEs under the hook, seat-queue row 7)',
        's06': ' (exit 3: 2 logs failed the checker, the viewer-owned hideaway host, D512, in this pin; d21 option 3 Lively Dirge refused and lost, seat-queue row 6)',
        's07': ' (1 Forge AI-eval timeout)'}
ROWS = {}
for k in range(1, 14):
    s = 's%02d' % k
    m = lb['bySpine'][s]
    ROWS[s] = '%d / %d: %d, %d, %.1f min%s' % (2452 + k, 2552 + k, m['rows'], m['confident'], mins[s], NOTE.get(s, ''))
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


def clopper_hi0(n):     # the exact 95% upper bound of 0 of n
    return 1 - 0.025 ** (1 / n)


PC = l6['confident'] + lb['confident']
PWH = r6['workerHours'] + c7['workerHours']
plo, phi = poisson95(PC)
POOL = {'confident': PC, 'labels': l6['labels'] + lb['labels'], 'wh': round(PWH, 1), 'cpwh': round(PC / PWH, 3), 'cpwh95': [round(plo / PWH, 3), round(phi / PWH, 3)],
        'c7': round(70 * PC / PWH, 1), 'p95': [round(70 * plo / PWH, 1), round(70 * phi / PWH, 1)], 'controls': f6['controls'] + fr['controls'],
        'ctlConf': f6['controlsConfident'] + fr['controlsConfident'], 'stopped': f6['stopped'] + fr['stopped'], 'read': f6['read'] + fr['read']}
POOL['ctlHi'] = round(clopper_hi0(POOL['controls']), 3) if POOL['ctlConf'] == 0 else None
assert abs(round(70 * lb['confident'] / c7['workerHours'], 1) - c7['confidentPer7Worker10hNight']) <= 0.1   # the 7-worker scale is 70 x per worker-hour
N6 = {'cpwh': round(r6['confidentPerWorkerHour'], 3), 'cpwh95': [round(x, 3) for x in r6['confidentPerWorkerHourPoisson95']], 'c7': r6['confidentPer7Worker10hNight'],
      'p95': r6['confidentPer7Poisson95'], 'wh': round(r6['workerHours'], 1)}


# J187's draws: lab-j187/report/draws.json's asRun (equal to its recorded), and recomputed from the data folder (draws.py's own drawsha)
def drawsha(dirs):
    hh, n = hashlib.sha256(), 0
    for d in dirs:
        hh.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            hh.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (hh.hexdigest(), n)


DRW = json.load(open(L187 + '/report/draws.json'))
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP187 = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2452 + k) for k in range(1, 14)]
VA187 = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2652 + k) for k in range(1, 14)]
assert sorted(DRW['asRun']['spines']) == sorted(SP187) and all(DRW['recorded'][k] == DRW['asRun'][k] for k in DRW['asRun'])
assert all(DRW['asRun']['spines'][x][0] == drawsha([L187 + '/decks/' + x]) for x in SP187) and DRW['asRun']['validation'] == drawsha([L187 + '/validation/' + x for x in VA187])
J187_DRAWS = sorted({DRW['asRun']['spines'][x][0].split()[0] for x in SP187})
J187_VAL = DRW['asRun']['validation'].split()[0]
assert len(J187_DRAWS) == 13
REG_SRC = set(re.findall(r"'([0-9a-f]{64})'", SRC_T))
expect('J187\'s 13 spine draws and its validation draw are none of J171-J186\'s registered ones', not (set(J187_DRAWS) | {J187_VAL}) & REG_SRC)

# ======================================================================================================================================
# E. the seeds: J188's block is unused (pc-jobs' jobs/ at its HEAD, the drafts, the data folder)
# ======================================================================================================================================
PAT = '246[6-9]|247[0-8]|256[6-9]|257[0-8]|266[6-9]|267[0-8]|276[6-9]|277[0-8]'
PCJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'rev-parse', '--short=8', 'HEAD'], capture_output=True, text=True).stdout.strip()
hits = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'grep', '-n', '-w', '-E', PAT, 'HEAD', '--', 'jobs/'], capture_output=True, text=True).stdout.splitlines()
hits += subprocess.run('grep -n -w -E %s /home/justin-a/code/pc-results/drafts/*.md' % q(PAT), shell=True, capture_output=True, text=True).stdout.splitlines()
hits = [x for x in hits if 'J188-atlas-4b-night-twelve.md' not in x]
# a hit is a seed's only if one of its block tokens is neither a decimal's digits (0.2772: J171's registered confident share, in every
# reader self-test since J173) nor J168's s05 wall in J170's and J171's compare tables ('wallSec': 2772); a job's own grep line is its own
NOTSEED = re.compile(r"\.(%s)\b|'wallSec': (2772)\b" % PAT)
odd = [x for x in hits if PAT not in x and re.search(r'(?<![0-9A-Za-z.])(%s)(?![0-9A-Za-z.])' % PAT, NOTSEED.sub('', re.sub(r'^(HEAD:)?[^:]+:\d+:', '', x)))]   # the grep's file:line: prefix is not the line
NOTSEED_N = sum(1 for x in hits if PAT not in x and x not in odd)
expect('the seed block %s is unused in pc-jobs %s jobs/ and the drafts (only a job\'s own grep line; %d line(s) hold 0.2772 or J168\'s wall 2772, no seed)' % (PAT, PCJ, NOTSEED_N), not odd)
DATA_HIT = [p for p in glob.glob('/home/justin-a/code/lab/data/*/*') + glob.glob('/home/justin-a/code/lab/data/*/*/*') if re.search(r'-(%s)$' % PAT, p)]
expect('no folder under the lab data folder (three levels) ends in one of the block\'s seeds', not DATA_HIT)
expect('lab-j188 does not exist yet (the owner makes it, empty, before posting)', not os.path.exists('/home/justin-a/code/lab/data/lab-j188'))
PIN_SUBJ = git('log', '-1', '--format=%s', PIN).strip()
SUBJ = PIN_SUBJ if len(PIN_SUBJ) <= 150 else PIN_SUBJ[:150].rsplit(' ', 1)[0] + ' ...'
ALL_SINCE = names(PREV187, '.')
AVG_MIN = round(wall_s / 13 / 60)
D510C, D511C = DEC['D510'][1][:8], DEC['D511'][1][:8]
D512C = DEC['D512'][1][:8] or 'not yet merged'
NUMS = '; '.join('%s %s/%s (%s)' % (f.replace('bridge/src/mtgtable/', '').replace('tools/cubelab/', ''), a, d, dn) for f, (a, d, dn) in sorted(ADMIT.items()))

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
    """Replace `old` (J187's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
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
D512_PROSE = ('D512 (added by %s)' % D512C if DEC['D512'][0] else 'D512 (in flight as this is drafted)')

# ======================================================================================================================================
# 0. the history paragraphs, rewritten (J187's night, D510-D512)
# ======================================================================================================================================
span('**Why J187.**', '**Before posting -- the coordinator', f'''**Why J188.** J187 (rung 4b, night eleven, the second of D508's population, pin 43043fe5) ran 2026-11-03 17:10 to 2026-11-04
02:15 EST, all 13 spines, its scan and its Report, and **FAILED the runner's final checks on three** (`atlas.problems = 2`,
`atlas.refusedCastOptions = 1`, `atlas.lostCastOptions = 1`; the other 47 passed, `unit_errors` 0). Its report is the job's own,
`lab-j187/report/`: {N['branched']} branched decisions, {N['labels']} labels, {N['confident']} confident, {N['partial']} partial, {N['controls']} controls ({N['ctlConf']} of them confident at the
full n), **{N['cpwh']} confident labels a worker-hour** [{N['cpwh95'][0]}, {N['cpwh95'][1]}] ({N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; J186's {N6['cpwh']}), at 6
workers sized (memory-pressure drops in the pilot, to 1 worker from 17:16 to 17:31, and to 3-5 workers at times inside the spines, each
raised back; `spine-times.txt` records 6, and the rate counts 6), {N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest),
{N['wh']} worker-hours, {N['games']:,} branch games, 0 branch timeouts, peak RSS 1.64 GB a worker. **Its data stands** (D509: the seat was frozen;
a failed check is read and recorded, and the night's rows are kept). Four things it found, each read in its folder:
- **s03, 975 forks not the position** (legacy, 2455/2555; exit 3; one of the two problems): 975 of s03's 6,600 branch forks were not the
  baseline's position (the first at d23, random o0 b0: the two seats' life, zones and hands not the baseline's). That is **D511's replay
  divergence**: a unit's replay was the unrecorded game, which can leave the recorded baseline without changing its listing at d, so the
  unit's own check passed and the fork check caught it (D511: "A unit can also pass the check from a game that has parted invisibly").
  J187's pin predates D511; **D511 is in this pin**, so a unit's replay records into a sink that writes nothing and is the baseline's
  game. It must not recur: `atlas.problems == 0` stays the check, and `replay_diverged` (J187: 0) is expected 0. A reader pooling leaves
  out s03's rows of the decisions whose forks were not the position (atlas.json counts them; the first is d23), as D509 point 4 leaves
  out a checker failure's units.
- **s06, two frame logs failed the checker** (peasant, 2458/2558; exit 3; the other problem): `d14-random-o0-b48-seat1` and
  `d21-random-o1-b58-seat1`, a hideaway host owned by the viewer, reanimated by the opponent and taken back, which rule A9 did not admit.
  The seat's record named nothing it may not see: the shape is the checker's, and **{D512_PROSE}** admits it -- a checker admission,
  which lands between landings (D509 point 2; D502-D505's precedent). Its rows stand.
- **s06 d21 option 3, the refused and lost cast** (`refusedCastOptions = 1`, `lostCastOptions = 1`): `cast:31`, **Lively Dirge**, a Spree
  spell (`K:Spree`, `ModeCost$`): the seat's payability gate judges the base cost and offers the cast, Forge's AI then chooses modes
  whose costs it cannot pay, and the forced cast is put back in hand in more than half of the option's rows (refused 680, lost 340; the
  frames' put-backs, D466). **The seat queue's row 6**, queued under D509 (a fix changes what the seat offers): not fixed tonight, and a
  Spree or other mode-cost spell can fail both checks again (*Abort if*).
- **s04, {N['errs']} branch errors** (`branch_error_stacks`), all `IndexOutOfBoundsException`s from `FCollection.get`: {N['pump']} in Forge's
  `PumpEffect.java:299` (the known shape; J186: 11, J185: 5) and {N['hook']} in Forge's `PlayEffect.resolve` (`PlayEffect.java:90`), each in a
  branch played inside our `Atlas$Hook.decision` while a PlayEffect resolved (Headliner Scarlett failing to target just before) -- **the
  seat queue's row 7**, queued (each is an errored branch, so a fix changes which branches play), so it can recur.
  **`atlas_hook_ioobe`**, new tonight (information), counts that frame in the worker logs (J187: {N['hook']}, all s04's); the literal
  `Atlas$Hook.decision` is in the stack of everything thrown inside a branch, since the hook plays it (J187: {sum(HOOKLIT.values())} lines, its
  118 errored branches' and two Forge AI-eval timeouts'), so it cannot count this fault.
J187's other signals: {N['ghost']} `[ghost]` lines, all s01's (cards 55 and 46: D507's gate leaving them out, as designed; information); 0
`[lki]` lines, 0 `StackOverflowError`s, 0 replay divergences in units.jsonl, 0 Forge NPEs, and 2 Forge AI-eval `TimeoutException`s (s03,
s07), caught, no branch error.

**D510-D512 since J187's pin.** Three lanes merged on 43043fe5, each with its written argument under D509 that the seat's plays and
listings are unchanged; the frozen set changed by exactly two of them (`git diff --numstat e557dedf <pin> -- {FROZEN}`:
{ADMIT_PROSE}), and `seat_code` admits exactly that numstat and nothing else:
- **D510** (added by {D510C}, merged a7b6bc6a; cd9895a8 its `SelectionSelfTest` expectation): a target the seat cannot see is written
  `option:hidden`, listed and answered, as the entity record writes one, and `hidden` counts it exactly (protocol M81) -- J186's s11 shape,
  `options: []`, `hidden: 1`, `chosen: null`, now `options: ["option:hidden"]`, `chosen: "option:hidden"`. **Record-only, D509 point 2**:
  `Decisions.targetAnswer` is called from `targets0` alone (with its new `Decisions.among`), reached through `Decisions.targets` and
  `castTargets` only behind `decisions != null`, after Forge or the explorer has already answered, into the sink; `Explorer`,
  `SearchPolicy`, `Atlas` and `AtlasController` call none of them, and the atlas's listing reads `SearchPolicy.Cand`s, never a record.
  `Decision.forced()` answers as before (a grown `hidden` comes only beside an unseen answer, which makes the record incomplete), and D484's
  repeat-cap key moves only in narrow cases no night since J180 has met. What it does not change, in its own words: no gate, no candidate
  list, no listing -- `entityToken`, `visible`, D507's Stack rule and D508's current-card rule are as they were; the seat-identity golden,
  the bench (320 checks) and `atlas-selftest` are unchanged.
- **D511** (added by {D511C}, merged 42e7a87f): an atlas unit's replay hands every seat of ours a `CubeLab.ReplaySink`, a `DecisionSink`
  that writes nothing, so the controllers build every record the baseline built, by the same calls in the same order, and the replay is
  the recorded baseline's game. **`CubeLab.java` only, between landings under D509 point 1's written argument**: not a line under
  `bridge/src`; a branch after d is untouched (fresh controllers, its own recorders, `MyRandom` reseeded); a succeeded unit's replay was
  already the baseline's position at d. Measured on J186 itself: all 618 branches of its 156 decisions have the night's result, turns,
  steps, error and cap, and 577 of the 594 whose rows were compared have the night's rows field for field -- the other 17 (s04's d37, d41,
  d42) differ only in created-object ids, as `main`'s own classes do from one run to the next (follow-up 34); the units it changes were
  unit errors. Its `tools/cubelab/atlas.ts` change is the atlas-selftest's replay leg (`atlasSelftestReplay` on J186's s13 pair,
  `fixtures/cubelab/atlas-replay/`), which this pilot's `selftest` now runs.
- **{D512_PROSE}**: the redaction checker admits J187's s06 shape -- `tools/check-redaction.mjs`, its fixtures and docs, nothing under
  `bridge/src` or `tools/cubelab` (a checker admission, D509 point 2).
**The seat queue** (`/home/justin-a/code/pc-results/study/seat-queue.md`, D509 point 3) holds rows 1-7, none landed and none fixed
tonight: 1-4 the cube lab's follow-ups 27, 28, 30 and 31 (D509's), 5 Forge's AI memory left unrestored by `Decisions.quiet` (D511's
diagnosis), 6 J187's Lively Dirge (a mode-cost spell the gate offers on its base cost) and 7 J187's s04 `PlayEffect.java:90` errors.

J188 is J187's night carried onto that main: the same seat, the same design, the same pilot, the same reads and checks, 13 new spines at
the next seeds in a new folder, `lab-j188`. J187's own outputs stay in `lab-j187/` and are read only, for the J187 columns. **J188 is
D508's population's THIRD night**: what the seat plays and offers is J186's and J187's (D509; D510 changed the record, D511 the replay),
so J188's labels pool with J186's twelve finished spines and J187's thirteen under the same pool names, `random-<band>-d508`, and J185's
numbers (D507's population, one night) are read beside, as information, never added. A reader pooling the three nights leaves out the
rows of units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16; D509 point 4), J187's s03 decisions whose
forks were not the position, and tonight's if any; no mechanism drops them today.

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', f'''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j188` does not exist yet (2026-11-04, when this was drafted): the owner
   makes it, empty, before posting (`mkdir`, then `ls -A` prints nothing). The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j188/`,
   from an earlier J188 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `{PIN}` ({P8}: "{SUBJ}"), written by
   `drafts/derive-j188.py` from its one argument; no placeholder pin is left in this file. It is main's head, D510, D511 and D512 merged
   on J187's pin 43043fe5, **on origin/main** (derive-j188.py checks it; J184 failed at its prepare step on a pin that was merged but not
   pushed). D510 and D511 change D509's frozen set, each by its written argument (*Why J188*), and `seat_code` admits exactly their
   numstat since J186's pin e557dedf, nothing else. **If the pin moves, run `python3 drafts/derive-j188.py <the new pin>` again**: every
   value below that the pin decides is computed from it with git, and a pin whose frozen-set diff is anything but D510's and D511's is NOT
   POSTABLE inside D508's population (D509: a landing has a decision and a population of its own).
3. **The names this file reads were computed against the pin itself** (derive-j188.py, from `git show`/`git diff` at {P8}): the four
   decision files D505-D508 and the names each `has_d505`/`has_d506`/`has_d507`/`has_d508` line reads (J187's lines, byte for byte),
   D510's, D511's and D512's (`has_d510`/`has_d511`/`has_d512`: each decision's file and the names its lane added; D512's fixtures found
   by a grep for the hideaway controls its lane added, reported where missing), `seat_code` (bridge/src since 0a6cf5c1, 3275af30,
   ac07876b, 7a984963, 6e87e5d4 and 480c837d, the golden, SearchPolicy.java's numstat: J187's lists plus D510's four files, every other
   row J187's; then the frozen set's numstat since e557dedf, exactly D510's and D511's), `deck_code` (J187's blobs and sha256s), and the
   commits that added D481-D512's decision files. derive-j188.py then runs this file's own pilot lines for all of them against the pin
   (a `git archive` of it, HEAD read as the pin) and requires each to print 1. The script says when a pin misses one and is then NOT
   POSTABLE -- a guard is never loosened to pass. D466-D504's greps are J183's, unchanged.
4. **J187 has ended** (2026-11-04 02:15, failed on three final checks, its data standing under D509; its Report written,
   `lab-j187/report/`). J188 reads lab-j187 read-only, for its J187 columns; nothing waits on another job, so there is **no `after:`
   line**. J187's job file needs nothing.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J188 pools with J186 and J187 and compares with J187
   position by position, and a change of design would split the population's nights.
6. **Nothing else to make, move or clean.** J188 reads lab-j170 (J171's night), lab-j187 (J187's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, J182's and J183's from their `report/draws.json`, read on 2026-11-02, J185's from
   `lab-j185/report/draws.json`, read on 2026-11-03, J186's from its pilot's `var/lab-j186-local/draws-pilot.json` in the lab clone,
   equal to lab-j186's draw as derive-j187.py recomputed it, read on 2026-11-03, and J187's from `lab-j187/report/draws.json`'s `asRun`,
   equal to its `recorded` and to its data folder's draw as derive-j188.py recomputed it, read on 2026-11-04), so it reads no
   `var/lab-j1xx-local/` folder but its own. Post nothing that writes lab-j187 or lab-j188 beside J188.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare across nights', f'''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough";
  D508's population holds J186's {f6['controls']} and J187's {fr['controls']} controls before tonight ({POOL['ctlConf']} of {POOL['controls']} confident, exact 95% [0, {POOL['ctlHi']}]), and tonight's
  ~6-14 are its third input (D507's holds J185's 13, D498's J182's 6 and J183's 11, D497's J181's 13, D493's J177's 12 and J180's 14: 0
  of 69 confident, all read beside); 0.25 holds until this population's pooled count can carry the read.
''')

span("**So J187 is D508's population's second night, on new spines**", '**The seeds are new', '''**So J188 is D508's population's third night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's (D510's
target record shape), the copier's carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's
(`Decisions.visible`: a candidate judged where the game holds the card now, never by a last-known copy's own zone; D507's Stack rule kept
over that card), what it plays and offers J186's and J187's (D509) -- so `pool: random-<band>-d508`, `randomSeat: "D508"`, contract v6,
**pooled with J186's and J187's rows**. **Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's, so
s01 is pauper and s13 pauper again), into a new folder. **J187's numbers are a comparison by position and, with J186's, the pooled
read's inputs, never a baseline**: s01 beside s01 is the same band, the same seat and the same branching design, but other decks and
other seeds -- every difference is a candidate. J185's, J183's, J182's, J181's, J180's, J177's, J173's and J171's nights stay other
populations and appear only in the readers' self-tests, their registered expectations and J177's sizing paragraph.

''')

SEEDS_P = f'''**The seeds are new** (checked by derive-j188.py, 2026-11-04): J187's block plus 13 -- deck seeds **2466-2478** (`$((2465 + K))`), game
seeds **2566-2578** (the deck seed + 100), validation deck seeds **2666-2678** (`$((2665 + K))`) with game seeds **2766-2778**
reserved. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -w -E
'{PAT}' {PCJ} -- jobs/` (pc-jobs at {PCJ}, J187's post) finds only a job's own
grep line and no seed, and so does the same grep over `/home/justin-a/code/pc-results/drafts/*.md` -- beside {NOTSEED_N} lines that hold
0.2772 (J171's registered confident share, in every reader self-test since J173) or J168's s05 wall (`'wallSec': 2772`, in J170's and
J171's compare tables), neither a seed and neither touched by the shift; every computed seed in a job or draft is an earlier block's
(`$((2000 + K))` to J181's `$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391, with the older blocks'
small ones below 1700) or J182's, J183's, J185's, J186's and J187's `$((2400 + K))`, `$((2413 + K))`, `$((2426 + K))`, `$((2439 + K))`,
`$((2452 + K))` and their companions (2401-2465, 2501-2565, 2601-2665, 2701-2765, lab-j182's, lab-j183's, lab-j185's, lab-j186's and
lab-j187's; J184 reserved J185's block and never drew; J186's and J187's validation game seeds 2740-2765 stay reserved for the job that
branches them); and no folder under `/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. The game seeds stay
in the 25?? hundreds, so every `lab-j188` glob keeps `b-s??-*-25??`, and the comparison's `lab-j187` globs read `25??` as J187's read
lab-j186's. Bases and literals were moved together by one inclusive shift of J187's block ([2452, 2465] and its three companions, +13),
skipping any number touching a letter, a dot or a hex digit, and every changed four-digit token was read in context (derive-j188.py's
audit): RESTORED_SENTENCE The smoke keeps J166's pair (deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167;
that pair holds none of the nine cards D482-D506 list, and its redraw on the nine-card list (at aab15d29, D506's merge) gave J166's
registered sha256 back (`edfdc861...`, 0 skips), so its draw on the list is J166's.

'''
span('**The seeds are new', '## The decks', '\x00SEEDS\x00')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J188's own name, J187 as the comparison, J186 kept where it is the pool's)
# ======================================================================================================================================
put("""and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's, J185's or J186's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's
are registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`, J186's from its pilot's
`draws-pilot.json` in the lab clone -- J186's Report never ran -- equal to its data folder's draw as derive-j187.py recomputed it).""",
    """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's, J185's, J186's or J187's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed;
J177's are registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`, J186's from its pilot's
`draws-pilot.json` in the lab clone -- J186's Report never ran -- equal to its data folder's draw as derive-j187.py recomputed it, and
J187's from `lab-j187/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as derive-j188.py recomputed it).""")
span("**The deck code is J171's pin's plus exactly D490, D492, D494 and D506**", "**The sha256s are recorded, not registered.**", f'''**The deck code is J171's pin's plus exactly D490, D492, D494 and D506** (`deck_code`, the pilot; every value computed from the pin by
derive-j188.py and equal to J186's and J187's, unchanged since J185's pin 0a6cf5c1: D508-D512 touch no deck file): `cubes/library/`
untouched since J171's pin f2b4e9c2; `tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in {len(D_OUT)} lines out and {len(D_IN)} in and nothing else --
the header comment of its point 5 (the list's cards and decisions named, D506's wording: what lists a card is the file's own `about`) and
the doc comment and the error message of `parseEngineUnplayable`, the throw's condition unchanged -- the changed lines' sha256s
registered; and `tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made nine, in this order: Scute Swarm unchanged,
Chain of Smog as at J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus of Ideation, Studious
First-Year (D492) and Ob Nixilis, the Adversary (D494), each `since: "J176"`, then Old Man of the Sea and Rubinia Soulsinger (D506),
each `since: "J183"`; and both files' blobs are the pin's, byte for byte (last changed by {LASTS}, the `about` line's D506 sentence
included). J185's, J186's and J187's guards accepted the same nine, and so does this one, nothing else, so **the draw never deals a
Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger**.

''')
put("| J186 at this position (the same population, D508's first night; the same seat and design; other decks): decisions branched, confident labels, wall |",
    "| J187 at this position (the same population, D508's second night; the same seat and design; other decks): decisions branched, confident labels, wall |")
span("(J186's numbers from the coordinator's by-hand report", "Folders: `lab-j187/decks/", '''(J187's numbers from `lab-j187/report/labels.json`'s `bySpine` (`rows`, `confident`) and `lab-j187/spine-times.txt`, read only on
2026-11-04; all thirteen at 6 workers. compare.py reads J187's column again at the Report from the same files, with the same code as
this night's.)

''')
span("**Sizing: J177's, unchanged; J186's walls beside it.**", "measured the design:",
     f"""**Sizing: J177's, unchanged; J187's walls beside it.** J187's thirteen spines, all at 6 workers, took {N['wall']:,} s of walls ({N['wallh']}
h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest, inside `timeout: 3h` by {round(180 - N['maxmin'])} min), {N['wh']} worker-hours, {N['games']:,} branch rows,
{N['branched']} decisions branched ({N['perSpine']} a spine; J186's 153 on twelve spines, 12.8; J185's 187, 14.4; J183's 161, 12.4; J182's 198, 15.2;
J181's 153, 11.8; J180's 105, 8.08); J186's twelve took 36,121 s (10.0 h; 14.0 to 150.0 min, s04 the longest). J177
""")
put("| `pool` | **`random-<band>-d508`**: D508's population, J186's and this night's; never",
    "| `pool` | **`random-<band>-d508`**: D508's population, J186's, J187's and this night's; never")
put("(labels.py's `--seat` default, D508 as J186's; J186's rows say \"D508\" too, J185's \"D507\"",
    "(labels.py's `--seat` default, D508 as J186's and J187's; their rows say \"D508\" too, J185's \"D507\"")
put("""**Pooled
  with J186's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's docs alone, e557dedf and
  43043fe5) **and never with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5
  rows, or v1-v4** (D489, D508, D509, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or
  `randomSeat`), never on J186's and J187's `sha` alone, and leaves out the rows of units whose logs failed the checker (J186's s11
  d13-d16; D509 point 4).""",
    f"""**Pooled
  with J186's and J187's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's docs (e557dedf,
  43043fe5) and by D510's record and D511's replay ({P8}), neither a change to what the seat plays or offers) **and never with J185's v6
  rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5 rows, or v1-v4** (D489, D508, D509,
  *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`), never on the three nights' `sha`
  alone, and leaves out the rows of units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16; D509 point 4)
  and J187's s03 decisions whose forks were not the position (*Why J188*).""")
span("Beside it, **J186's** (THE SAME POPULATION's first night", "review's ~46 [41, 51] a 7-worker night**", f"""Beside it, **J187's** (THE SAME POPULATION's second night, read from `lab-j187/report/labels.json` at
  the Report, `--j187=`: {N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}] on {N['wh']} worker-hours, thirteen spines), **J186's** (its first night,
  registered here from the coordinator's by-hand report, J186 having been aborted before its Report: {N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}] on {N6['wh']}
  worker-hours, twelve spines) and **the three nights pooled** (their confident labels over their worker-hours, by hand at the morning
  read; J186's and J187's together: {POOL['confident']} confident on {POOL['wh']} worker-hours, {POOL['cpwh']} [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}]), then, **as
  information**, J185's 0.376 (D507's one night), J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563, other
  populations, and **the
  """)
span("**This night's numbers are the SECOND contribution", "- **(g) the cap read**", f"""**This night's numbers are the THIRD contribution
  to D508's population's pooled read** (`pooledInputs`): J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']} stopped, {f6['read']} read; the
  by-hand report's `f_futilityRead`, registered here) and J187's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read;
  `c_sizingRead.j187.futilityRead`) are the first two -- {POOL['ctlConf']} of {POOL['controls']}, exact 95% [0, {POOL['ctlHi']}] -- and the three are added by hand at the
  morning read; J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13 (D497's), J177's 0 of 12 and J180's
  0 of 14 (D493's) are read beside, as information, never added.
""")
span("- **(xvii) J187 beside J186", "- **(xi)** the draws", """- **(xvii) J188 beside J187, BY POSITION, DIFFERENT DECKS, THE SAME POPULATION (D508's), THE SAME SEAT AND DESIGN**
  (compare.py, `report/compare-j187.json`; J187's column computed from its folders and report with the same code): per spine position
  and for the night, decisions listed per baseline turn, decisions branched, branched in full, partial labels, options per decision
  branched, labels, confident labels, the confident share, **confident labels per worker-hour**, the mean regret at Forge's choice, the
  capped share, the branch games and the wall. **A candidate, never a verdict**: the decks differ at every position and the seat does
  not, so no difference is the seat's; J187's s03 and s06 carry the faults D511 and D512 answer, both in this pin, and its s06 d21
  option (row 6) and s04's errored branches (row 7) carry two the seat queue holds.
""")
put("""**D497-D508** (`has_d497` to `has_d508`: each decision's file and the names its lane added, as the
pilot's lines list them; D505-D508's computed against the pin by derive-j186.py and again, unchanged, by derive-j187.py), the commits
that added D481-D509's decision files (D509 a policy, no code: its commit alone)""",
    """**D497-D508 and D510-D512** (`has_d497` to `has_d508` and `has_d510` to `has_d512`: each decision's file
and the names its lane added, as the pilot's lines list them; D505-D508's computed against the pin by derive-j186.py and again,
unchanged, by derive-j187.py and derive-j188.py, D510-D512's by derive-j188.py), the commits that added D481-D512's decision files (D509 a
policy, no code: its commit alone)""")
put("J173's plus D493's, D496's, D497's, D498's and D500's, D507's since J183's pin 3275af30 and D508's since J185's pin 0a6cf5c1, and D509's frozen set unchanged since J186's pin e557dedf** (`seat_code`, its lists computed from the pin, J186's byte for byte:",
    "J173's plus D493's, D496's, D497's, D498's and D500's, D507's since J183's pin 3275af30 and D508's since J185's pin 0a6cf5c1, and D509's frozen set changed since J186's pin e557dedf by exactly D510's record-only and D511's replay-only numstat** (`seat_code`, its lists computed from the pin, J187's plus D510's four files:")
put("(`atlas-selftest` with its futility control and futile stop; `seat-identity`",
    "(`atlas-selftest` with its futility control and futile stop and D511's replay leg on J186's s13 pair; `seat-identity`")
put("# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs, then seat-identity",
    "# the engine self-tests: atlas-selftest with its G5, G6, cuts and D483 legs and D511's replay leg (J186's s13 pair), then seat-identity")
# the guards: D505-D508's lines from the spec (J187's, checked above), D510-D512's, the seat block with the admitted numstat
G508 = ''.join(SPEC[d][0] + '\n' + shell_of(d, SPEC[d][1], 'lab-j188-local') + '\n' for d in ('D505', 'D506', 'D507', 'D508', 'D510', 'D511', 'D512'))
SEAT_BLOCK = f'''# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's (D510's target
# record); the gate in front of what it sees and offers is D508's (`decides:`), all as J186's and J187's: D509 freezes the seat between
# landings, and D510 (record-only, point 2) and D511 (the replay, CubeLab.java, point 1) landed between them with their written arguments.
# Every list below was computed from the pin {P8} by derive-j188.py, never typed: J187's (derive-j187.py's at 43043fe5, recomputed there
# byte for byte) plus D510's four files and nothing else. D495's merge (480c837d, J177's pin) is an ancestor of the pin, and the
# seat-identity golden is unchanged since it and since J173's pin (6e87e5d4); bridge/src since 480c837d and since 6e87e5d4 is J183's ten
# files (D496's six with GameLog.java's comment-only javadoc, D497's and D500's LenientGameCopier.java, D498's Determinizer.java and
# Atlas.java, D500's SearchPolicy.java) and what later pins gained since; SearchPolicy.java since 6e87e5d4 is {T['spnum']!r} (D493's self-test
# accessor 5 lines plus D500's 3); since 7a984963 J183's four and the same; since J182's pin (ac07876b) and since J183's pin (3275af30,
# D502-D504's merge) bridge/src changed in exactly: {short(T['s327'])} (numstat {T['num327'].strip() or 'none'}); since J185's pin
# (0a6cf5c1, D505-D507's merge) in exactly: {short(T['s0a6'])} (numstat {T['num0a6'].strip() or 'none'}); and since J186's pin (e557dedf,
# D508's merge, the population's opening pin) the frozen set, {FROZEN}, changed in exactly D510's four
# files and D511's two, at the numstat registered in derive-j188.py's ADMIT ({NUMS}): D509 point 1's test with
# the two landings between landings admitted by name and by line count, so any other change fails it
sc=0
{T['line']}
if git merge-base --is-ancestor {B480} HEAD && git diff --quiet {B480} HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet {B6E8} HEAD -- fixtures/cubelab/seat-identity.json; then
{TEST188}
fi
echo $sc > var/lab-j188-local/seat-code.txt
echo "J188: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's, the gate D507's and D508's (bridge/src since J185's pin 0a6cf5c1: {short(T['s0a6'])}; the frozen set since J186's pin e557dedf: exactly D510's and D511's admitted numstat): $sc"
'''
span("# D505 (hideaway's look kept while the card stays in exile, the dig tied by its trigger's resolution; amends D502; the names this file\n",
     "# D481-D496 by decision id:", G508 + SEAT_BLOCK)
put('D507 D508 D509; do', 'D507 D508 D509 D510 D511 D512; do')
put('has-d481-d509-commits', 'has-d481-d512-commits', 2)
put('d481_d509_commits', 'd481_d512_commits', 2)
put('metrics: has_d508 = sh: cat var/lab-j187-local/has-d508.txt 2>/dev/null || echo 0\n',
    ''.join('metrics: has_%s = sh: cat var/lab-j188-local/has-%s.txt 2>/dev/null || echo 0\n' % (d, d) for d in ('d508', 'd510', 'd511', 'd512')))
put('check: has_d508 == 1\n', ''.join('check: has_%s == 1\n' % d for d in ('d508', 'd510', 'd511', 'd512')))
# the deck code: deckcode.py and its block, every value from the pin (J187's, checked above)
DECK_BLOCK = f'''# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506, and nothing else (deckcode.py's
# header): nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's, D494's and D506's comment and
# message lines only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492), Ob
# Nixilis, the Adversary (D494), and Old Man of the Sea and Rubinia Soulsinger (D506); both files the pin's blobs (computed by
# derive-j188.py from {P8}, equal to J186's and J187's; unchanged since J185's pin 0a6cf5c1)
cat > var/lab-j188-local/bin/deckcode.py <<'PY'
# J188: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j188-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j188.py from the
# pin {P8} with git, never typed, and is J186's and J187's. Exits 0 when all three hold:
#   census  deckcensus.ts: {len(D_OUT)} lines out and {len(D_IN)} in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's ({LASTS} last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j188-local/'
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
    sys.exit('J188 deck code: %s' % e)


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
print("J188 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet {F2B} HEAD -- cubes/library/; then
  git diff --no-color --no-ext-diff -U0 {F2B} HEAD -- tools/cubelab/deckcensus.ts > var/lab-j188-local/deckcensus.diff
  git show {F2B}:tools/cubelab/engine-unplayable.json > var/lab-j188-local/unplayable-j171.json
  git show {CC7}:tools/cubelab/engine-unplayable.json > var/lab-j188-local/unplayable-j176.json
  python3 -I var/lab-j188-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j188-local/deck-code.txt
echo "J188: deck code: J171's pin's plus exactly D490, D492, D494 and D506 -- the draw deals no Prepare card, no Ob Nixilis, the Adversary, no Old Man of the Sea and no Rubinia Soulsinger: $dc"
'''
span("# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506", 'test -z "${CUBELAB_WORKER_XMX:-}"', DECK_BLOCK)
# the counted lines: D511 in the pin (replay_diverged expected 0), and the seat queue's row 7 (atlas_hook_ioobe)
RD = 'metrics: replay_diverged = count /home/justin-a/code/lab/data/lab-j187/b-s??-*-25??/phaseB/units.jsonl "replay diverged"\n'
put(RD, RD.replace('lab-j187', 'lab-j188') +
    'metrics: atlas_hook_ioobe = count /home/justin-a/code/lab/data/lab-j188/b-s??-*-25??/phaseB/logs/*.log "%s"\n' % HOOK_TEXT)
# draws.py: J187's draws registered beside the others
put("""# 2026-11-02), J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read on 2026-11-03) and J186's (J186_DRAWS,
# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran): none may come back here.""",
    """# 2026-11-02), J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read on 2026-11-03), J186's (J186_DRAWS,
# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran) and J187's (J187_DRAWS, J187_VALIDATION, from lab-j187/report/draws.json's
# `asRun`, equal to its `recorded` and to lab-j187's draw as derive-j188.py recomputed it, read on 2026-11-04): none may come back here.""")
J186BLOCK_END = "J186_VALIDATION = 'b1e9f113c3bf425a06d64435cb3a2b65dd99101ca3601679b2fd04ab9eaa50e6'\n"
i = t.index("# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`")
j = t.index(J186BLOCK_END) + len(J186BLOCK_END)
J185186 = t[i:j]
pairs = ['%r, %r' % (J187_DRAWS[k], J187_DRAWS[k + 1]) if k + 1 < 13 else '%r' % J187_DRAWS[k] for k in range(0, 13, 2)]
J187BLOCK = ("# J187's 13 spine draws and its validation draw (lab-j187/report/draws.json's `asRun`, equal to its `recorded` and to lab-j187's draw\n"
             "# as derive-j188.py recomputed it on 2026-11-04): none may come back here either\n"
             "J187_DRAWS = {" + (',\n              '.join(pairs)) + "}\n"
             "J187_VALIDATION = %r\n" % J187_VAL)
span(J185186[:60], J186BLOCK_END, J185186 + J187BLOCK)   # J185's and J186's blocks verbatim (kept through the comparison move), J187's after
t = t.replace(J186BLOCK_END, '', 1)
put('J183_DRAWS | J185_DRAWS | J186_DRAWS)', 'J183_DRAWS | J185_DRAWS | J186_DRAWS | J187_DRAWS)')
put('J183_VALIDATION, J185_VALIDATION, J186_VALIDATION)', 'J183_VALIDATION, J185_VALIDATION, J186_VALIDATION, J187_VALIDATION)')
# labels.py: its header, the expectation and the beside-column's population
span("# J187 (drafts/J187-atlas-4b-night-eleven.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J188 (drafts/J188-atlas-4b-night-twelve.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J188 data. What changes: nothing in the rows. J188 is D508's population's THIRD night (D509: the seat frozen since J186's
# pin e557dedf; D510 changed the record and D511 the replay, between landings, neither what the seat plays or offers), so its rows pool
# with J186's and J187's under the same pool names (D489, D508, D509, Comparability): --seat= defaults to "D508", as theirs (the self-test
# on J171's night still passes --seat=D486), the Report names the pools `random-<band>-d508`; and the sizing read's beside-column is
# J187's (--j187= LABELS_JSON: its c_sizingRead, per-worker-hour yield and futilityRead, THE SAME POPULATION's second night, as
# information and as the pooled futility read's second input; null when absent). J186's, the first, has no labels.json (J186 was
# aborted before its Report): its numbers are registered in the job file from the coordinator's by-hand report. Every field, read and
# definition otherwise J177's, unchanged; the scan stamp `J188 v5`.
""")
put(r"""'expectation': 'as information, no verdict: J186 (THE SAME POPULATION: D508\'s first night, the same seat and design, other decks) below as its own report read it -- null: J186 was aborted before its Report, and its by-hand numbers are in the job file; J185 (D507),""",
    r"""'expectation': 'as information, no verdict: J187 (THE SAME POPULATION: D508\'s second night, the same seat and design, other decks) below as its own report read it; J186 (its first night, aborted before its Report) by hand in the job file; J185 (D507),""")
put("'population': 'D508 (the same population, its first night): pooled with this night under the same pool names; its futilityRead is the pooled futility read\\'s first input (D508, D509, Comparability)'}",
    "'population': 'D508 (the same population, its second night): pooled with this night and J186 under the same pool names; its futilityRead is the pooled futility read\\'s second input, J186\\'s by-hand one the first (D508, D509, Comparability)'}")
# metrics.py's header
span("# J187's metrics (drafts/J187-atlas-4b-night-eleven.md)", "# J177's header, unchanged below:\n# J177's metrics", """# J188's metrics (drafts/J188-atlas-4b-night-twelve.md): J177's metrics.py for a NEW data folder, lab-j188, where all 13 spines are
# J188's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J188 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J188's (deck seeds 2466-2478, game
# seeds 2566-2578, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population,
# J186's, J187's and this night's); (c) compare-j187.json for the `compare` key; (d) the scan stamp `J188 v5` and the defaults lab-j188,
# var/lab-j188-local.
""")
# compare.py: its header, its glob's comment and its note
span("# J187 (drafts/J187-atlas-4b-night-eleven.md): each spine's numbers beside J186's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     """# J188 (drafts/J188-atlas-4b-night-twelve.md): each spine's numbers beside J187's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J188 data. DIFFERENT DECKS (J187: deck seeds 2453-2465, game seeds 2553-2565; J188: 2466-2478, 2566-2578; the same band at
# each position), THE SAME SEAT (D488's policy, D498's redeal, D500's damage history, D508's gate: frozen since J186's pin, D509; D510
# and D511 changed the record and the replay, not the seat) AND THE SAME BRANCHING DESIGN (150 random branches, the futility stop, 10
# decisions): J187 and J188 are D508's population's second and third nights. A difference is a candidate, never a verdict, and no
# position is a pair (the decks differ everywhere). J177's compare.py, unchanged but for its note: `this` is J188, `before` J187, read
# from lab-j187 at the Report (read only), its report/labels.json written by J187's own Report.
""")
put("# J187's folders end in 2553-2565, J186's in 2540-2552: one glob reads both", "# J188's folders end in 2566-2578, J187's in 2553-2565: one glob reads both")
span("out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J186 (D508", "\n       'bySpine': {s: {'before': before.get(s)",
     r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J187 (D508\'s population, its second night; deck seeds 2453-2465, 150 branches, the futility stop, 10 decisions) beside J188 (D508\'s population, its third night, the seat frozen since J186\'s pin, D509, D510 and D511 between landings; deck seeds 2466-2478, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is the seat\'s: the decks differ at every position and the seat does not',""")
# the pilot's read of the comparison night
put("""# J186's night, read only, as information (aborted 2026-11-03 at 16:37 by its own unit_errors abort, its Report never run: `report`
# reads 0 and `atlases` 12): what compare.py and labels.py's c_sizingRead will read at the Report -- nothing, so they read null (THE
# SAME POPULATION, D508's first night; its by-hand numbers are in the job file)
""", """# J187's night, read only, as information (ended 2026-11-04 at 02:15, its Report written: `report` reads 1 and `atlases` 13): what
# compare.py and labels.py's c_sizingRead will read at the Report (THE SAME POPULATION, D508's second night; J186's, the first, is by hand
# in the job file)
""")
# the Report block
put("""# J186's night, read only, for the J186 columns (compare.py) and J186's sizing read (labels.py --j186): THE SAME POPULATION (D508's
# first night), read beside and pooled by hand; J186 was aborted before its Report, so lab-j186/report/ does not exist and absent files
# read as null (J186's numbers are the coordinator's by-hand report, registered in the job file)""",
    """# J187's night, read only, for the J187 columns (compare.py) and J187's sizing read (labels.py --j187): THE SAME POPULATION (D508's
# second night), read beside and pooled by hand with J186's (its first, whose by-hand numbers are registered in the job file); absent
# files read as null""")
put("'the 4b night-eleven validation draw, made by the J187 pilot into lab-j187 at deck seeds 2653-2665",
    "'the 4b night-twelve validation draw, made by the J188 pilot into lab-j188 at deck seeds 2666-2678")
put("by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509), on new decks (deck seeds 2453-2465, game seeds 2553-2565), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its second night, pooled with J186 (its first, twelve spines); never with",
    "by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509; D510s record and D511s replay landed between landings), on new decks (deck seeds 2466-2478, game seeds 2566-2578), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its third night, pooled with J186 (its first, twelve spines) and J187 (its second, thirteen); never with")
# the abort paragraph
put("""`unit_errors == 0` means every unit of the 13 spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169. **`unit_errors >
20` aborted J186** at 16:37 on s13's 29 failed units (every branch unit from d23 on failed twice, "the replay diverged at decision
23": the baseline's d20 lists `cast:35` twice, Dog Walker's face-up and disguise casts; D511 is its lane, not landed); it stays, and
**`replay_diverged`** counts the units.jsonl lines naming a divergence (information; J186: 31, 29 of them s13's failed units and 2
s04's units that replayed on their second attempt).""",
    """`unit_errors == 0` means every unit of the 13 spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169. **`unit_errors >
20` aborted J186** at 16:37 on s13's 29 failed units (every branch unit from d23 on failed twice, "the replay diverged"); it stays,
unchanged. **D511 is in this pin**: a unit's replay records into a sink that writes nothing, so it plays the recorded baseline's game,
and **`replay_diverged`**, the units.jsonl lines naming a divergence, is information **expected 0** (J186: 31; J187: 0 -- but J187's s03
met the same divergence without a listing change, 975 forks not the position, which `atlas.problems` caught). **`atlas_hook_ioobe`**
counts the seat queue's row 7 (information; J187: 58, all s04's, each an errored branch; queued, so it may recur at that scale).""")
put("""D487, D488, D495, D496 and D501-D505 amended. J186 never reached it (aborted before its final checks), but would have failed it on 1
problem -- s11's 12 logs whose target record listed no option and hid its one candidate (`options: []`, `hidden: 1`, `chosen: null`:
Batroc the Leaper, a ghost in the Stack zone after a refused Multikicker payment). **That shape is known and not fixed tonight** (D510
is its lane, not landed; D509 queues it): a unit that meets it fails the check again, the summary names it as this shape, and the
checker never admits it (D507). J185 failed""",
    """D487, D488, D495, D496, D501-D505 and D512 amended. **J187 failed it on 2 problems**: s03's 975 forks that were not the position
(D511's replay divergence; D511 in this pin) and s06's 2 logs whose hideaway host, owned by the viewer, was reanimated by the opponent
and taken back (a checker shape; D512 in this pin admits it). J186 never reached it but would have failed it on 1, s11's all-hidden
target record (D510 in this pin writes it `option:hidden`, listed and answered, which the checker admits). **None of the three may
recur**: a unit that fails the check tonight is a new shape, named by the summary with its spine, its log and its record, and the checker
never admits a hidden-information fault in the seat's record (D507; D509 point 4). J185 failed""")
put("""**`atlas.lostCastOptions == 0`** if one lost its forced cast outright; the summary
names the spine, the option and the card.""",
    """**`atlas.lostCastOptions == 0`** if one lost its forced cast outright; the summary
names the spine, the option and the card. **Registered: both may fail again on a Spree or other mode-cost spell.** J187 failed both on
s06 d21 option 3 (`cast:31`, Lively Dirge, `K:Spree`: the seat's gate judges the base cost and offers the cast, Forge's AI chooses modes
it cannot pay; refused 680 and lost 340 times in the option's rows) -- the seat queue's row 6, queued under D509 because the fix changes
what the seat offers. Such a failure is a queued seat fault, not a night fault: the checks stay (J173's), the summary records the option,
its card and its counts, and the night's data stands (D509: the seat is frozen, a failed check is read and recorded; the aborts are
unchanged, `armed == 1 and unit_errors > 20` among them).""")
put("""(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, five of J185's
s12 and 11 of J186's s11, counted here as `pump_effect_ioobe`; J186's other exception lines were s01's 113 and s04's 2
`TimeoutException`s from Forge's own AI eval thread at its timeout (D465's shape; J185's s12 had 21), caught by the engine and no
branch error, and s11's 176 `NullPointerException`s in `AiController.chooseSpellAbilityToPlayFromList` after "No AI assigned for API:
null" (Forge's AI meeting an ability stranded by a refused payment); a `StackOverflowError` in a branch row is counted here as
`stack_overflows`)""",
    f"""(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, five of J185's
s12, 11 of J186's s11 and {N['pump']} of J187's s04, counted here as `pump_effect_ioobe`; J187's other {N['hook']} errored branches, all s04's, threw from
`FCollection.get` in Forge's `PlayEffect.java:90` inside our `Atlas$Hook.decision` -- the seat queue's row 7, queued, counted here as
`atlas_hook_ioobe` -- and its other exception lines were s03's and s07's one `TimeoutException` each from Forge's own AI eval thread
(D465's shape; J186's s01 had 113), caught by the engine and no branch error (J186's s11 also had 176 Forge AI `NullPointerException`s,
J187 none); a `StackOverflowError` in a branch row is counted here as `stack_overflows`)""")
# the summary
span('- **The population, first line:**', '- **The run:**', """- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's,
  D494's and D506's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck
  seeds 2466-2478, game seeds 2566-2578) branched by J188 at the pin, by D488's random seat policy forking on D498's determinizer behind
  D508's gate, the seat frozen since J186's pin (D509; D510's record and D511's replay landed between landings), the THIRD night of D508's
  population**: `training: true`, `pool: random-<band>-d508`, `randomSeat: "D508"`, contract v6 with `branchRandom: 150` and the partial
  rows marked; **pooled with J186's twelve finished spines and J187's thirteen** (the same pool names; what the seat plays and offers
  unchanged since J186's pin) **and with nothing else: not J185's rows (D507's population: the gate before D508), not J183's and J182's
  (D498's), not J181's (D497's), not J177's and J180's (D493's), not J173's nor anything older** (D489, D509); the units whose logs
  failed the checker on a hidden-information fault, and J187's s03 decisions whose forks were not the position, are named, so a reader
  pooling leaves their rows out (D509 point 4).
""")
span('- **The run:**', '- **The yield, the number to read**', f"""- **The run:** exits, walls per spine and for the night (against J187's thirteen, {N['wall']:,} s, J186's twelve, 36,121 s, and the ~9-10 h at 6
  workers *Sizing* now expects), rows, timeouts, unit errors, engine errors (with any errored row's stack from the worker logs), capped,
  D479's and D477's counters, disk. **Whether J187's two problems stayed closed** (D511 and D512 in this pin): no fork that was not the
  position (J187's s03: 975, the replay divergence), and **`replay_diverged`**, the units.jsonl lines naming a replay divergence
  (expected 0; J186: 31, J187: 0), per spine with the decision where any; no checker failure on a hideaway host owned by the viewer,
  reanimated by the opponent and taken back (J187's s06: 2 logs). **Whether J186's all-hidden target record stayed closed** (D510 in this
  pin): no checker failure on a target record with no option and a hidden candidate, and the records that now carry `option:hidden` on
  the target path counted where the scan or the logs show them, as information. **The seat queue's two open rows that can recur
  tonight** (D509; neither fixed): any refused or lost cast option on a Spree or other mode-cost spell (row 6; J187's s06 d21, Lively
  Dirge), named with its card and counts -- a queued seat fault, not a night fault, if `refusedCastOptions` or `lostCastOptions` fails on
  it -- and **`atlas_hook_ioobe`**, the `PlayEffect.java:90` errored branches under our hook (row 7; J187: {N['hook']}, all s04's), per spine
  with the card where traced. **Whether J185's fault stayed closed**: no branch log failed the checker on a record naming a last-known
  copy of a card in the other hand, and **`lki_candidates`**, the worker logs' `[lki]` lines (D508; J186 and J187: 0), per spine --
  information, the places D508's gate changed a list. **Whether J183's three faults stayed closed**: no branch log failed the checker on
  an opponent's hideaway card whose look was kept while the card stayed in exile, or whose dig came frames after its host entered (D505;
  the D502 stats-line count per spine, as information); no target record named a card in the Stack zone with no stack instance, and
  **`ghost_candidates`**, the worker logs' `[ghost]` lines (D507; J186: 12, s11's card 63; J187: {N['ghost']}, s01's cards 55 and 46), per spine;
  no deck held Old Man of the Sea or Rubinia Soulsinger, **`stack_overflows`**, the branch rows naming a `StackOverflowError` (J183: 70,
  all s11's; J185, J186 and J187: 0), per spine, and no unit hung (D506). **Whether J182's three checker shapes and J181's three gaps
  stayed closed**: no branch log failed the checker on an opponent's hideaway card after its host's control was taken, on another seat's
  ceased token or on an opponent's cast between frames (D502-D504; their three stats-line counts per spine, as information), no A6
  failure on a card the seat may look at (D498), no id problem from a killed attempt's rows and `abandonedPlays` said when a unit was
  re-run (D499; J183: one, s11's; J185: none), no `getDamageLKI` and no `paperCard` in any errored branch's stack, `damageLkiLost` 0,
  and no bare exception in any worker log (D500, D497), no checker failure on a cascade's "cast it?" inside a held frame (D496), no
  Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or Foretold cast, no checker
  failure on a spell copy on the stack (and every spell copy still listed under D507's and D508's gate). **J182's engine stack,
  counted**: `pump_effect_ioobe`, the lines `at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker
  logs (Forge's `IndexOutOfBoundsException`, `FCollection.get` on an empty list; J182: 1, in s11's d10; J183: 0; J185: 5, all s12's;
  J186: 11, all s11's; J187: {N['pump']}, all s04's), per spine, each with its branch and its exception line -- information, an engine fault and
  never a verdict on a card; and Forge's own AI-eval `TimeoutException`s and AI `NullPointerException`s per spine (J186: s01 113, s04 2,
  s11 176 NPEs; J187: s03 1, s07 1, no NPE), as information.
""")
put("""beside it **J186's** (0.349 a worker-hour [0.216, 0.533], 24.4 a 7-worker night [15.1, 37.3], on 60.2
  worker-hours over twelve spines: this population's first night, from the by-hand report, since `c_sizingRead.j186` reads null) and
  **the two nights pooled** (confident labels over worker-hours, by hand), then""",
    f"""beside it **J187's** ({N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}], {N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}], on {N['wh']}
  worker-hours over thirteen spines: this population's second night, `c_sizingRead.j187`), **J186's** ({N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}], {N6['c7']}
  [{N6['p95'][0]}, {N6['p95'][1]}], on {N6['wh']} worker-hours over twelve: its first, from this file's by-hand numbers) and **the three nights pooled**
  (confident labels over worker-hours, by hand; J186 and J187 together {POOL['confident']} on {POOL['wh']}, {POOL['cpwh']} [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}], {POOL['c7']} a 7-worker
  night [{POOL['p95'][0]}, {POOL['p95'][1]}]), then""")
put("""**Say that this
  is the second night of D508's population's pooled read** (`pooledInputs`): add J186's 0 of 13 controls confident (34
  stopped, 115 read; this file's by-hand numbers, since `c_sizingRead.j186.futilityRead` reads null) to this night's and give the
  pooled share with its exact 95% interval beside this night's own; that J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6
  (D498's), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and whether the pooled
  ~20-30 controls can yet tell .04 from .2.""",
    f"""**Say that this
  is the third night of D508's population's pooled read** (`pooledInputs`): add J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']}
  stopped, {f6['read']} read; this file's by-hand numbers) and J187's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read;
  `c_sizingRead.j187.futilityRead`) to this night's and give the pooled share with its exact 95% interval beside this night's own (the
  two before tonight: {POOL['ctlConf']} of {POOL['controls']}, [0, {POOL['ctlHi']}]); that J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's
  0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and whether the pooled ~30-40 controls can
  yet tell .04 from .2.""")
put("""beside the review's 54%, 68% and 87% and J185's, J183's, J182's, J181's, J180's and J177's own (their `ncurve.json`; J186 has
  none, its Report never ran);""", """beside the review's 54%, 68% and 87% and J187's (the same population's), J185's, J183's, J182's, J181's, J180's and J177's own
  (their `ncurve.json`; J186 has none, its Report never ran);""")
put("against J186's 12.8 (twelve spines), J185's 14.4,", f"against J187's {N['perSpine']}, J186's 12.8 (twelve spines), J185's 14.4,")
put("""and for the night beside J185's (0.16%), J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%) (J186's
  was never computed: its scan block never ran)""",
    f"""and for the night beside J187's ({REFSHARE}%, s06's Lively Dirge among it), J185's (0.16%), J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's
  (0.10%), J177's (0.35%) and J171's (0.53%) (J186's was never computed: its scan block never ran)""")
put("""with J186's values at the same positions beside
  where its atlas.json gives them (the same population; other decks; s13 has none, killed by the abort; J186 has no reads.json);""",
    """with J187's values at the same positions beside
  (its `reads.json`; the same population; other decks);""")
put("""- **J187 beside J186, by position** (`compare-j186.json`, whose J186 column is null -- J186's report was never written -- so the J186
  side comes from this file's decks table and *Why J187*):""", """- **J188 beside J187, by position** (`compare-j187.json`, both columns computed from their folders and reports by the same
  code):""")
# the header's rule line: D509 kept, D510-D512 named
put(", D508 (the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's zone: the population J186 opened and J187 continues) and D509 (the atlas seat frozen between landings: J187 runs on J186's seat, its pin adding D509's docs only; a seat fault waits in the seat queue); D447 (the deck draw)",
    ", D508 (the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's zone: the population J186 opened, J187 and J188 continue), D509 (the atlas seat frozen between landings; a seat fault waits in the seat queue), D510 (a target the seat cannot see is written `option:hidden`, listed and answered: record-only, D509 point 2), D511 (an atlas unit's replay records into a sink that writes nothing, so it plays the recorded baseline's game: `CubeLab.java` between landings, D509 point 1) and D512 (the redaction checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back: a checker admission); D447 (the deck draw)")

# (J185's draws, "read by derive-j186.py", sit inside the draws span above, so the comparison move cannot touch them)

# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
hist = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'J187', t)
        if not re.match(r'J187(:| v5| deck| draws| scan| pilot|-atlas)', t[m.start():m.start() + 12]) and 'homes-J187' not in t[m.start() - 6:m.start() + 4]]
print('J187 mentions before the job-name move, outside echo/print prefixes (each must be this job\'s own):', len(hist))
for ctx in hist:
    print('   ', ctx)
t = t.replace('J187', 'J188').replace('j187', 'j188')
t = t.replace('drafts/J188-atlas-4b-night-eleven.md', 'drafts/J188-atlas-4b-night-twelve.md')
left = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'[Jj]186', t)]
print('J186 left before the comparison move (each becomes J187):', len(left))
for ctx in left:
    print('   ', ctx)
t = t.replace('J186', 'J187').replace('j186', 'j187')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, +13
# ======================================================================================================================================
RANGES = [(2452, 2465), (2552, 2565), (2652, 2665), (2752, 2765)]
AUDIT = []


def shift(m):
    v = int(m.group(0))
    for a, b_ in RANGES:
        if a <= v <= b_:
            s = m.string
            AUDIT.append((v, v + 13, s[max(0, m.start() - 60):m.end() + 40].replace('\n', ' ').replace('\x00', '#')))
            return str(v + 13)
    return m.group(0)


t = re.sub(r'(?<![0-9A-Za-z.])\d{4}(?![0-9A-Za-z.])', shift, t)
RESTORED = []      # (wrong, right, why): filled from the audit below
for wrong, right, why in RESTORED:
    if t.count(wrong) != 1:
        FAIL.append('restore %r: found %d' % (wrong, t.count(wrong)))
    t = t.replace(wrong, right)

# ======================================================================================================================================
# 4. the decks table: J187's column (after the shift, so its seeds stay J187's)
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
RS = ('none fell in the shifted ranges but the seeds themselves (no registered self-test value lies in [2452, 2465] or its companions)'
      if not RESTORED else 'restored by name: ' + '; '.join(w for _, _, w in RESTORED)) + '.'
t = t.replace('\x00SEEDS\x00', SEEDS_P.replace('RESTORED_SENTENCE', RS))

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


PUBLIC_TITLE = 'Move atlas 4b night twelve: 13 new spines, D508 population night three'
setline('id: ', 'J188')
setline('title: ', f"The move atlas, rung 4b, night twelve -- J187's night carried onto the same seat (D509: the atlas seat frozen between landings; the pin {P8} adds to J187's 43043fe5 D510 (the target record writes a target the seat cannot see as `option:hidden`: record-only), D511 (an atlas unit's replay records into a sink that writes nothing, so it is the recorded baseline's game: CubeLab.java only) and D512 (the redaction checker admits J187's s06 hideaway shape), `seat_code` admitting exactly D510's and D511's numstat since J186's pin) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j188, at deck seeds 2466-2478 (D447 with D482's list as D490, D492, D494 and D506 leave it, the bands cycled as J166's) and game seeds 2566-2578; a validation draw made fresh at deck seeds 2666-2678 (game seeds 2766-2778 reserved); THE THIRD NIGHT OF D508'S POPULATION, pooled with J186's twelve finished spines and J187's thirteen; J187's night read beside, by position")
setline('public_title: ', PUBLIC_TITLE)
setline('public_est: ', '~9 h to 13 h')
setline('public_decides: ', 'None by itself; third night of the D508 population, pooled with J186 and J187')
setline('repos: ', "mtg-table@%s (origin/main: the merges of D510, D511 and D512 on 43043fe5 (J187's pin, D509's merge), pushed; written by derive-j188.py from its argument; merged == 1, the commits that added D481-D512's decision files, D493's, D495's to D508's and D510's to D512's names, the seat's code exactly as this file states it -- J187's lists plus D510's four files, and the frozen set since J186's pin e557dedf exactly D510's and D511's numstat -- and the deck code (J187's), every pin-decided value computed from the pin, checked by the pilot)" % PIN)
setline('decides: ', f"nothing by itself. Rung 4b's twelfth night, the tenth on D489's futility stop with the review's 150 cap, and **the THIRD of D508's population**. **What changed under the seat since J187:** what it plays and offers, nothing. **D509** (2026-11-03) freezes the atlas seat between landings; between J187's pin 43043fe5 and this pin two lanes changed its frozen set with their written arguments, and `seat_code` admits exactly their numstat since J186's pin e557dedf ({NUMS}) and nothing else: **D510** (record-only, D509 point 2: a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly, protocol M81; `Decisions.targetAnswer`, `targets0` and `among` are reached only after Forge or the explorer has answered, into the sink, and no gate, candidate list or listing changes) and **D511** (`tools/cubelab/CubeLab.java` between landings, D509 point 1: an atlas unit's replay records into a sink that writes nothing, so it plays the recorded baseline's game; measured on J186, all 618 branches of 156 decisions the night's result, 577 of 594 compared rows identical, the 17 others differing only in created-object ids; its `atlas.ts` change is the atlas-selftest's replay leg); **D512** admits J187's s06 hideaway shape in the redaction checker. So the random seat's POLICY is D488's, the recorder D496's (with D510's target record), the copier's paper-card carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's (D507's Stack rule kept over the card the game holds), all as J186's and J187's; `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (`identity == 1` stays the real check). The seat queue (D509) holds rows 1-7 and none is fixed tonight; two can recur: a Spree or mode-cost spell's refused and lost cast option (row 6, J187's s06 d21 Lively Dirge) and the errored branches from `PlayEffect.java:90` under our hook (row 7, J187's s04: 58). **Comparability, the rule this night follows:** D489 pools nights on one seat and opens a population on \"A future change to the seat or to what it offers\"; D509 keeps the seat unchanged between landings and lands a queue as one population boundary. So **J188's labels and reads are D508's population's third night: pooled with J186's twelve finished spines and J187's thirteen -- the same `pool`, `random-<band>-d508`, the same `randomSeat: \"D508\"`; never with J185's v6 rows (D507's population), J183's and J182's (D498's), J181's (D497's), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16, and tonight's if any) and J187's s03 decisions whose forks were not the position are named so that a reader pooling leaves their rows out (D509 point 4); the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- this night's counts the third input to this population's pooled read, J186's {f6['controlsConfident']} of {f6['controls']} and J187's {fr['controlsConfident']} of {fr['controls']} the first two, with J185's 0 of 13, J183's 0 of 11, J182's 0 of 6, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside as other populations, and the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J187's {N['cpwh']}, J186's {N6['cpwh']} and the three nights pooled, and, as other populations, J185's 0.376, J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J187's at the same position (other decks, the same population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D510-D512 (no checker failure of J186's all-hidden target record or of J187's s06 hideaway shape; no fork that is not the position, and `replay_diverged`, the units.jsonl lines naming a replay divergence, expected 0), of the seat queue's rows 6 and 7 (any mode-cost cast option refused or lost, named; `atlas_hook_ioobe`, the `PlayEffect.java:90` errored branches, per spine), of D508 (no checker failure of J185's shape; `lki_candidates`, the worker logs' `[lki]` lines, per spine), of D505-D507 as on J186 and J187 (no checker failure of J183's hideaway shape, its D502 stats-line count per spine; `ghost_candidates`, the worker logs' `[ghost]` lines, per spine; `stack_overflows`, the branch rows naming a `StackOverflowError`, and no hung unit), of D502-D504 and D497-D500 as on J183 (no checker failure of J182's three shapes; no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`; J183: 0; J185: 5; J186: 11; J187: {N['pump']})")
setline('hypothesis: ', f"none to confirm about the maps. Registered expectations, as information: **J187's two problems and J186's all-hidden record do not come back** -- with D511 in the pin a unit's replay is the recorded baseline's game, so no fork is not the position (J187's s03: 975) and `replay_diverged` is 0 (information; J186: 31, J187: 0); with D512 the checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back (J187's s06: 2 logs); with D510 a target the seat cannot see is `option:hidden`, never `options: []` with `chosen: null` (J186's s11: 12 logs) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as it failed J187's on 2, J186's would have on 1 had it not been aborted first, J185's on 1, J183's on 3 across three faults, J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); **the seat queue's rows 6 and 7 are open and may recur** -- a Spree or other mode-cost spell whose base cost the seat's gate judges payable can have its forced cast refused and lost in most of its rows (J187's s06 d21 option 3, Lively Dirge: refused 680, lost 340), so `refusedCastOptions == 0` and `lostCastOptions == 0` (J173's checks, kept) may fail on it, which is a queued seat fault and not a night fault: the option is recorded and the night's data stands (D509); and an errored branch can throw from `FCollection.get` in Forge's `PlayEffect.java:90` inside our hook (`atlas_hook_ioobe`, information; J187: {N['hook']}, all s04's); **the shapes D505-D508 closed stay away** -- no entity or target record names a last-known copy of a card in the other hand (D508: the record counts it in `hidden` and the worker log prints `[lki]`; `lki_candidates` counts those lines, information; J186 and J187: 0), while a copy of a card now in a public zone or the seat's own hand is still listed; an opponent's hideaway card whose look is kept while it stays in exile, after its host's control went back or the host left the battlefield, or whose dig came frames after its host entered, passes A9 (D505), counted on D502's stats line; no target record names a card in the Stack zone with no stack instance (D507; `ghost_candidates`, information; J186: 12, J187: {N['ghost']}, each a candidate left out); no deck holds a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger (D492, D494, D506; `deck_code`), so no branch row names a `StackOverflowError` (`stack_overflows`, information; J183: 70, J185, J186 and J187: 0) and no unit hangs on that recursion; an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log (`pump_effect_ioobe` stays counted: J182 1, J183 0, J185 5, J186 11, J187 {N['pump']}); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes, and stays listed under D507's and D508's gate (D495, D507, D508); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J187: {N['read']} read, {N['stopped']} stopped, {N['controls']} controls, 0 partial rows confident; J186: 115, 34, 13, 0, on twelve spines; J185: 122, 34, 13, 0; J183: 129, 43, 11, 0); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J187's (read beside, not predicted; J187's refused share {REFSHARE}%, J185's 0.16%, J183's 0.60%, J182's 0.92%; J186's never computed); J187's yield, {N['confident']} confident of {N['labels']} labels over thirteen spines, {N['cpwh']} confident labels a worker-hour on {N['wh']} worker-hours, and J186's, {l6['confident']} of {l6['labels']} over twelve, {N6['cpwh']} on {N6['wh']} -- {POOL['cpwh']} pooled -- are this population's first two nights', read beside and pooled by hand, never predicted; J185's 20 of 88, 0.376 on 53.2 worker-hours, and J183's 0.483 are other populations'; the walls ~9-10 h at 6 workers for all 13 at J187's pace ({N['wall']:,} s of walls for thirteen, {N['smax']}'s {N['maxmin']} min the longest; *Sizing*)")
setline('est: ', f"~10 h at 6 workers (range 8-13 h; sizing below): pilot ~20-40 min (J187's ran {PILOT_MIN} min from its start to its first spine, slowed by memory pressure; J173's ~35 with the readers' self-tests); the 13 spines ~9 h at J187's pace (13 x ~{AVG_MIN} min; J187's thirteen ran {N['minmin']} to {N['maxmin']} min); the scan ~6 min; the report ~5 min. Disk ~10-15 GB on the lab data folder /home/justin-a/code/lab/data (J187's thirteen spines: {N['gb']} GB)")
t = '\n'.join(lines)

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
print('\nquoted J17x/J18x strings in the output (registered strings must keep their night):')
for m in sorted(set(re.findall(r"['\"]J1[78]\d[^'\"]{0,30}['\"]", t))):
    print('   ', m)
print('\nold population tokens (d507/d498/d497/d493/d488) left -- history and the never-pooled lists only:')
for m in re.finditer(r'random-[^ ]{1,8}-d(507|498|497|493|488)|[\'"]D507[\'"]', t):
    print('   ', t[max(0, m.start() - 60):m.end() + 10].replace('\n', ' '))
print('\nleft-over night words (night-eleven / night eleven / eleventh / SECOND night / second night / two nights / derive-j187 / J186\'s pin of a frozen set):')
for m in re.finditer(r'night-eleven|night eleven|eleventh|SECOND night|[Ss]econd night|two nights|derive-j187|by-hand', t):
    print('   ', t[max(0, m.start() - 70):m.end() + 40].replace('\n', ' '))
print('\nlab-j186 / lab-j187 / lab-j188 mentions:', {x: t.count(x) for x in ('lab-j186', 'lab-j187', 'lab-j188')})
print('pin %s mentions: %d; 43043fe5: %d; e557dedf: %d; 0a6cf5c1: %d; 3275af30: %d; ac07876b: %d; derive-j186: %d; derive-j187: %d; derive-j188: %d'
      % (P8, t.count(P8), t.count('43043fe5'), t.count('e557dedf'), t.count('0a6cf5c1'), t.count('3275af30'), t.count('ac07876b'), t.count('derive-j186'), t.count('derive-j187'), t.count('derive-j188')))
print('J187 lines (comparison/history):', sum(1 for x in t.split('\n') if 'J187' in x), '  j187:', t.count('j187'), '  J186 lines:', sum(1 for x in t.split('\n') if 'J186' in x))
print('\nCOMPUTED FROM THE PIN %s (%s):' % (PIN, PIN_SUBJ[:100]))
print('  everything since 43043fe5:', ALL_SINCE)
print('  the frozen set since e557dedf (numstat):', NUM_FROZEN.strip().replace('\n', '; ').replace('\t', ' ') or 'nothing')
print('  commits on it since e557dedf:', FROZEN_COMMITS)
print('  tools/cubelab + fixtures/cubelab since e557dedf:', LAB_SINCE)
print('  bridge/src since 0a6cf5c1:', short(T['s0a6']), '| numstat:', T['num0a6'].strip() or 'none')
print('  bridge/src since 3275af30:', short(T['s327']), '| numstat:', T['num327'].strip() or 'none')
print('  since ac07876b:', short(T['sac0']), '| since 7a984963:', short(T['s7a9']))
print('  since 480c837d:', short(T['s480']))
print('  since 6e87e5d4:', short(T['s6e8']), '| SearchPolicy numstat:', T['spnum'], '| golden unchanged:', GOLD480 and GOLD6E8, '| 480c837d ancestor:', ANC480)
print('  deckcensus.ts: %d out, %d in, out %s, in %s, shape %s; blobs %s (%s), %s (%s); cubes/library unchanged %s; list nine %s; deck files unchanged since e557dedf %s'
      % (len(D_OUT), len(D_IN), OUT_SHA[:12], IN_SHA[:12], CENSUS_SHAPE, DC_BLOB[:12], DC_LAST, UP_BLOB[:12], UP_LAST, LIB_SAME, LIST_OK, DECK_SAME))
print('  J187\'s registered deck values:', {k: (v[:12] if v else v) for k, v in J187_DECK.items()})
for d in SPEC:
    print('  has_%s at the pin: %s' % (d.lower(), 'all names present' if not HAS[d] else 'MISSING ' + '; '.join(HAS[d])))
print('  D512\'s names found (soft): file %s, its viewer-own hideaway fixtures (new or re-verdicted since 43043fe5): %s' % (DEC['D512'][0] or 'none', D512FIX or 'none'))
for x in SOFT:
    print('  SOFT (reported, not failed): ' + x)
for d in DEC:
    print('  %s: %s added by %s' % (d, DEC[d][0] or 'no file', DEC[d][1][:8] or 'no commit'))
print('  pin on origin/main:', PUSHED)
print('\nJ187 READ (lab-j187 and results/J187, read only):', N, 'pilot min', PILOT_MIN)
print('  per spine walls (min):', mins)
print('  exits 3:', {k: v for k, v in EXITS.items() if v != '0'}, '| problems:', {s: v for s, v in PROB.items() if v})
print('  pump:', {s: v for s, v in PUMP.items() if v}, '| PlayEffect.java:90:', {s: v for s, v in HOOK.items() if v}, '| literal Atlas$Hook.decision lines:',
      {s: v for s, v in HOOKLIT.items() if v}, '| ghost:', {s: v for s, v in GHOST.items() if v}, dict(GHOSTCARDS), '| TimeoutException:', {s: v for s, v in TEX.items() if v})
print('  refused/lost option:', TOOL['refusedCastOptionList'], TOOL['refusedCastCards']['Lively Dirge'], TOOL['lostCastCards']['Lively Dirge'], '| refusedCastShare %', REFSHARE)
print('  J186 (by hand):', N6, '| pooled J186+J187:', POOL)
print('J187 draws registered: %d spine draws (%s ...), validation %s' % (len(J187_DRAWS), ', '.join(x[:12] for x in J187_DRAWS[:3]), J187_VAL[:12]))
print('seed grep (%s at pc-jobs %s + drafts): %d hit(s), %d of them 0.2772 or the 2772 wall, unexpected: %s; data folders: %s' % (PAT, PCJ, len(hits), NOTSEED_N, odd or 'none', DATA_HIT or 'none'))

# ======================================================================================================================================
# 8. the pilot's own lines, run against the pin: has_*, seat_code, the commits, the golden, deck_code
# ======================================================================================================================================
blk = t[t.index("# D466-D486: J171's greps, unchanged"):t.index('test -z "${CUBELAB_WORKER_XMX:-}"')]
TREE = SCRJ + '/tree'
shutil.rmtree(TREE, ignore_errors=True)
os.makedirs(TREE + '/var/lab-j188-local/bin')
subprocess.run('git -C %s archive %s -- bridge/src tools docs fixtures/negative fixtures/cubelab web/test cubes/library | tar -x -C %s' % (REPO, PIN, TREE),
               shell=True, check=True)
run = re.sub(r'\bgit ', 'git -C %s ' % REPO, blk).replace('HEAD', PIN)
open(SCRJ + '/pilot-lines.sh', 'w').write('set -u\n' + run)
pr = subprocess.run(['bash', SCRJ + '/pilot-lines.sh'], cwd=TREE, capture_output=True, text=True)
open(SCRJ + '/pilot-lines.out', 'w').write(pr.stdout + pr.stderr)
V = TREE + '/var/lab-j188-local/'
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
    if x.startswith(('J188: seat code', 'J188: deck code', 'J188 deck code', 'J188: seat-identity', 'J188: D51')):
        print('  | ' + x)

print('\nEXPECTATIONS OF THE FINAL PIN:')
for what, ok in EXPECT:
    print('  %s  %s' % ('ok  ' if ok else 'FAIL', what))
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

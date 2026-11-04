#!/usr/bin/env python3
"""Derive J189's job file from J188's, by derive-j183.py's three-trap rule (derive-j188.py's shape, one step on):
(1) rename only the job's own name (J188 -> J189), then move the comparison night (J187 -> J188) on what is left -- J187 stays J187 wherever
it names D508's population's SECOND night (pooled, not compared), and J186 stays J186 everywhere (the first night, history since J188):
every J187-as-history sentence is a hand edit, stashed before the renames;
(2) shift the four seed ranges inclusive of their bases, [2466, 2478] and its three companions, +13, skipping any number touching a
letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints every change) -- one
registered number does fall in them: J168's s05 wall, `'wallSec': 2772`, in [2766, 2778], whose only mention in J188's file is the seeds
paragraph, written here by hand (stashed), so it is never shifted;
(3) change registered strings only on purpose, each one named here.
J189 is D508's population's FOURTH night (`random-<band>-d508`, `randomSeat: "D508"`, unchanged), its labels pooled with J186's twelve
finished spines, J187's thirteen and J188's thirteen. THE PIN IS J188'S: nothing has merged into mtg-table since J188 was posted, so the
pin given must equal the pin J188's job file registers (its `repos:` line), and every pin-decided line of J188's pilot -- the `seat_code`
test, the `deck_code` values, the D505-D512 name checks and the D481-D512 commit check -- is recomputed at the pin exactly as
derive-j188.py computed it and asserted EQUAL to J188's line, byte for byte (but its folder and stamp). The ADMIT contract is J188's
unchanged: since J186's pin e557dedf the frozen set changed by exactly D510's four `bridge/src` files and D511's two `tools/cubelab` files.
EVERYTHING THE PIN DECIDES IS COMPUTED FROM THE PIN WITH GIT, never typed, and the derivation then RUNS the pilot's own has_*, seat_code,
commit, golden and deck_code lines against the pin (a `git archive` of it in the scratchpad, `git -C` on the main checkout read-only, HEAD
read as the pin) and requires every one to print 1.
J188's night is read only (lab-j188, results/J188); so are J187's report (lab-j187, for its numbers as history and the pool), J186's by-hand
report and its --times rerun (the scratchpad), and J187's posted job file (J187's seat_code line, recomputed at J187's pin).

  python3 derive-j189.py <pin>     writes drafts/J189-atlas-4b-night-thirteen.md, prints the audit, runs the runner's check
Exit 0: written, every expectation of the final pin met, the checker clean. Exit 3: written, but the pin misses an expectation: NOT
POSTABLE. Exit 1: nothing written (a stash or a computation failed). Exit 2: written, the checker not clean."""
import fnmatch, glob, hashlib, json, math, os, re, shutil, subprocess, sys
from collections import Counter
from datetime import datetime

REPO = '/home/justin-a/code/mtg-table'
JOBS = '/home/justin-a/code/mtg-table-pcjobs/jobs/'
SRC = JOBS + 'J188-atlas-4b-night-twelve.md'
SRC187 = JOBS + 'J187-atlas-4b-night-eleven.md'                # read only: J187's seat_code line, recomputed at J187's pin
DST = '/home/justin-a/code/pc-results/drafts/J189-atlas-4b-night-thirteen.md'
RUNNER = '/home/justin-a/code/mtg-table/tools/runner.sh'      # the main checkout's (the brief: never run anything under ~/code/lab)
L188 = '/home/justin-a/code/lab/data/lab-j188'                # read only
R188 = '/home/justin-a/code/pc-results/results/J188'          # read only
L187 = '/home/justin-a/code/lab/data/lab-j187'                # read only: J187's report, history now
SCR = '/tmp/claude-1000/-home-justin-a-code-mtg-table/8723af12-0157-421e-988a-473182e5a3f1/scratchpad'
BYHAND186 = SCR + '/j186/report/labels.json'                  # the coordinator's by-hand report of J186 (derive-j187.py's)
TIMES186 = SCR + '/j187/times/labels.json'                    # labels.py with --times on lab-j186 (derive-j187.py's rate)
SCRJ = SCR + '/j189'                                          # this derivation's scratch: the pin's tree and the pilot's lines run on it
PREV = 'e557dedfa7cf67803ba0ba362655a2120ea8f83a'   # J186's pin: D508's merge, the population's opening pin (the frozen set's base)
PREV187 = '43043fe59a1c0d51d7628a0212d34af2a11e0445'  # J187's pin: D509's merge (docs only)
PREV2 = '0a6cf5c1ec05f03ca27d34af1b529a5e72646cea'  # J185's pin (the merge of D505-D507)
PREV3 = '3275af30498e91c03d652d021685d9847b62d95f'  # J183's pin (the merge of D502-D504)
J182PIN = 'ac07876b97e052b3e0ddd530a1930173e998133c'
FROZEN509 = 'bridge/src tools/cubelab/CubeLab.java fixtures/cubelab/seat-identity.json forge-home/'   # D509 point 1, by path (J187's test)
FROZEN = 'bridge/src tools/cubelab fixtures/cubelab/seat-identity.json forge-home/'                  # what J188's test reads, wider
# THE CONTRACT (derive-j188.py's, unchanged): what the frozen set may have changed by since J186's pin, file by file, (added, deleted, the
# decision). Typed on purpose: a pin whose diff is anything else fails the derivation and the job's own seat_code line.
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
    sys.exit('usage: derive-j189.py <pin>   (a sha of mtg-table, short or full)')
PIN = git('rev-parse', '--verify', sys.argv[1] + '^{commit}').strip()
P8 = PIN[:8]
SRC_T = open(SRC).read()
SRC187_T = open(SRC187).read()
m = re.search(r'^repos: mtg-table@([0-9a-f]{40}) ', SRC_T, re.M)
if not m:
    sys.exit('derive-j189: no pin in J188\'s repos: line')
J188PIN = m.group(1)
if PIN != J188PIN:
    sys.exit('derive-j189: the pin %s is not J188\'s %s: J189 is J188\'s night on J188\'s pin (nothing merged since); a moved pin is a new derivation' % (P8, J188PIN[:8]))
for base, who in ((PREV, "J186's"), (PREV187, "J187's")):
    if git('merge-base', '--is-ancestor', base, PIN, ok=True)[0] != 0:
        sys.exit('derive-j189: %s pin %s is not an ancestor of %s' % (who, base[:8], P8))
EXPECT = []    # (what the final pin must show, met?)
SOFT = []      # reported, never failed


def expect(what, ok):
    EXPECT.append((what, bool(ok)))


MAIN = git('rev-parse', 'main').strip()
expect('the pin is J188\'s, as J188\'s `repos:` line registers it (%s)' % J188PIN[:8], PIN == J188PIN)
expect('main\'s head is the pin: nothing has merged into mtg-table since J188 was posted (main %s)' % MAIN[:8], MAIN == PIN)

# ======================================================================================================================================
# A. computed from the pin: the seat code (D509's frozen set since J186's pin: exactly D510's and D511's admitted changes; J188's line)
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


# J187's lists at J187's pin are J187's posted test line byte for byte (derive-j188.py's check, against J187's own file now)
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
TEST188 = T['test'] + f' && test "$(git diff --numstat {PREV} HEAD -- {FROZEN} | LC_ALL=C sort | tr \'\\t\\n\' \'  \')" = "{ADMIT_STR}" && sc=1'
expect('seat_code: SEAT_480 and the test line recomputed at the pin are J188\'s, byte for byte',
       T['line'] in SRC_T.splitlines() and TEST188 in SRC_T.splitlines())


def short(xs):
    return ', '.join(x.replace('bridge/src/mtgtable/', '') for x in xs) if xs else 'nothing'


# ======================================================================================================================================
# B. computed from the pin: the deck code (J188's values, unchanged: nothing merged)
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


J188_DECK = {'DC_BLOB': reg(r"DC_BLOB, UP_BLOB = '([0-9a-f]{40})'"), 'UP_BLOB': reg(r"DC_BLOB, UP_BLOB = '[0-9a-f]{40}', '([0-9a-f]{40})'"),
             'OUT_SHA': reg(r"OUT_SHA = '([0-9a-f]{64})'"), 'IN_SHA': reg(r"IN_SHA = '([0-9a-f]{64})'"), 'N': reg(r'OUT_N, IN_N = (\d+, \d+)')}
expect('cubes/library/ unchanged since J171\'s pin f2b4e9c2', LIB_SAME)
expect('deckcensus.ts differs from f2b4e9c2\'s in comment lines and the one throw\'s message only (%d out, %d in)' % (len(D_OUT), len(D_IN)), CENSUS_SHAPE)
expect('engine-unplayable.json is the nine cards in order (D482, D490, D492, D494, D506)', LIST_OK)
expect('the deck code is unchanged since J186\'s pin e557dedf (D509-D512 touch no deck file)', DECK_SAME)
expect('deck_code: both blobs, both sha256s and the line counts recomputed at the pin are J188\'s registered values',
       J188_DECK == {'DC_BLOB': DC_BLOB, 'UP_BLOB': UP_BLOB, 'OUT_SHA': OUT_SHA, 'IN_SHA': IN_SHA, 'N': '%d, %d' % (len(D_OUT), len(D_IN))})

# ======================================================================================================================================
# C. D505-D512's names (J188's lines, recomputed at this pin as derive-j188.py computed them) and D509-D512's commits
# ======================================================================================================================================
def bre(s):
    return re.sub(r'([\[\]*\\^$])', r'\\\1', s)


def q(s):
    return "'%s'" % s if "'" not in s else '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')


SPEC = {
    'D505': ('# D505 (hideaway\'s look kept while the card stays in exile, the dig tied by its trigger\'s resolution; amends D502; the names this file\n'
             '# reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py, derive-j188.py and derive-j189.py)',
             [('dec', 'D505'), ('grep', 'docs/decisions/D505-*.md', 'mayLookFaceDownExile'), ('grep', 'tools/check-redaction.mjs', 'const RESOLVE_WITHIN = [10, 3];'),
              ('file', 'fixtures/negative/redaction/a9-hideaway-alt-kept-after-the-host-leaves.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'")]),
    'D506': ('# D506 (Old Man of the Sea and Rubinia Soulsinger on the engine-unplayable list; D482\'s rule admits an overflow or hang inside one\n'
             '# step; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py,\n'
             '# derive-j188.py and derive-j189.py)',
             [('dec', 'D506'), ('grep', 'docs/decisions/D506-*.md', 'controllerChangeZoneCorrection'), ('grep', 'tools/cubelab/engine-unplayable.json', '"Old Man of the Sea"'),
              ('grep', 'tools/cubelab/engine-unplayable.json', '"Rubinia Soulsinger"'), ('grep', 'tools/cubelab/engine-unplayable.json', 'measured overflow or hang'),
              ('grep', 'tools/cubelab/deckcensus.ts', 'D506'), ('grep', 'web/test/cubelab-deck-census.test.ts', "'Old Man of the Sea', 'Rubinia Soulsinger'")]),
    'D507': ('# D507 (the seat\'s gate sees a Stack-zone card only with a stack instance or as a spell copy; the worker log\'s [ghost] line; protocol\n'
             '# M79; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py,\n'
             '# derive-j188.py and derive-j189.py; D508 keeps the Stack rule over the card the game holds)',
             [('dec', 'D507'), ('grep', 'docs/decisions/D507-*.md', 'random-<band>-d507'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean onStack('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'now.isCopiedSpell() || onStack(now)'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String ghostLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[ghost] card "'), ('grep', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'ghostLine(49)'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void ghosts()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void copies()'), ('grepline', 'docs/protocol.md', '| M79 |')]),
    'D508': ('# D508 (the seat\'s gate judges a candidate where the game holds the card now, never by a last-known copy\'s zone; the worker log\'s\n'
             '# [lki] line; protocol M80; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by\n'
             '# derive-j187.py, derive-j188.py and derive-j189.py)',
             [('dec', 'D508'), ('grep', 'docs/decisions/D508-*.md', 'random-<band>-d508'), ('grep', 'docs/decisions/D508-*.md', 'getCardState'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static Card current('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'g.getCardState(c, null)'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static boolean lastKnown('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String lastKnownLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[lki] card "'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'return visibleAt(current(c), ai);'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean visibleAt('),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void lastKnown()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'g.copyLastState();'), ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'an ability whose host object is now in seat 0'), ('grepline', 'docs/protocol.md', '| M80 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 12. J185\'s checker failure (D508')]),
    'D510': ('# D510 (a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly; protocol M81;\n'
             '# record-only under D509 point 2: the names this file reads, computed against the pin by derive-j188.py, and again, unchanged,\n'
             '# by derive-j189.py)',
             [('dec', 'D510'), ('grep', 'docs/decisions/D510-*.md', 'Record-only, under D509'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static void targetAnswer('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'private static boolean among('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static final String HIDDEN = "option:hidden";'),
              ('file', 'fixtures/negative/redaction/m81-target-option-hidden.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'m81-target-option-hidden.jsonl', 'pass'"), ('grepline', 'docs/protocol.md', '| M81 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 13. J186\'s empty target records (D510')]),
    'D511': ('# D511 (an atlas unit\'s replay records into a sink that writes nothing, so it plays the recorded baseline\'s game; CubeLab.java only,\n'
             '# between landings under D509 point 1; the atlas-selftest\'s replay leg: the names this file reads, computed against the pin by\n'
             '# derive-j188.py, and again, unchanged, by derive-j189.py)',
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
# and the viewer's own permanent, new or re-verdicted since J187's pin, each with its row in the checker's self-test
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
                '# unchanged, by derive-j189.py: the decision file by glob, and its controls under fixtures/negative/redaction/ naming hideaway\n'
                '# and the viewer\'s own permanent, new or re-verdicted since J187\'s pin, each with its row in the checker\'s self-test)',
                SPEC_D512)

HAS = {}
for d, (_, items) in SPEC.items():
    HAS[d] = evaluate(items, files_at)
    expect('%s\'s names at the pin%s' % (d, '' if not HAS[d] else ': missing ' + '; '.join(HAS[d])), not HAS[d])
    expect('%s\'s shell line is J188\'s, byte for byte (but its folder)' % d, shell_of(d, items, 'lab-j188-local') in SRC_T.splitlines())
DEC = {}
for d in ('D509', 'D510', 'D511', 'D512'):
    fs = [x for x in git('ls-tree', '-r', '--name-only', PIN, 'docs/decisions/').splitlines() if x.startswith('docs/decisions/%s-' % d)]
    c = git('log', '--diff-filter=A', '--format=%H', '-n', '1', PIN, '--', fs[0]).strip() if fs else ''
    anc = bool(c) and git('merge-base', '--is-ancestor', c, PIN, ok=True)[0] == 0
    DEC[d] = (fs, c)
    expect('%s\'s decision file is at the pin (%s), added by %s, an ancestor of the pin' % (d, fs[0] if fs else 'none', c[:8] or 'no commit'), len(fs) == 1 and anc)
expect('D509-D512\'s files are the ones J188\'s derivation read', [DEC[d][0] for d in ('D509', 'D510', 'D511', 'D512')] == [
    ['docs/decisions/D509-seat-frozen-between-landings.md'], ['docs/decisions/D510-all-hidden-target-record.md'], ['docs/decisions/D511-atlas-replay-is-the-recorded-game.md'],
    ['docs/decisions/D512-hideaway-host-taken-from-the-digger.md']])
D512C = DEC['D512'][1][:8]
expect('D512\'s commit is the one J188\'s file names (added by %s)' % D512C, ('**D512 (added by %s)**' % D512C) in SRC_T)

# ======================================================================================================================================
# D. J188's night, read only: its report, its data folder, the runner's results; J187's report (history now); J186's by-hand numbers
# ======================================================================================================================================
lb = json.load(open(L188 + '/report/labels.json'))
fr = lb['f_futilityRead']
c7 = lb['c_sizing7']['asRun']
assert (lb['labels'], lb['confident'], lb['branched'], lb['partialLabels'], lb['futilityControls']) == (85, 24, 168, 40, 10), 'J188 labels'
assert (fr['read'], fr['stopped'], fr['controls'], fr['controlsConfident']) == (125, 40, 10, 0), fr
assert (c7['wallSec'], c7['workerHours'], c7['confidentPerWorkerHour'], c7['confidentPerWorkerHourPoisson95'], c7['confidentPer7Worker10hNight'],
        c7['confidentPer7Poisson95']) == (26057, 43.43, 0.5526, [0.3541, 0.8223], 38.7, [24.8, 57.6]), c7
CSR = lb['c_sizingRead']
assert (CSR['confidentPerWorkerHour'], CSR['confidentPerWorkerHourPoisson95'], CSR['confidentPer7Worker10hNight'], CSR['poisson95']) == (0.5526, [0.3541, 0.8223], 38.7, [24.8, 57.6]), CSR
assert CSR['j187']['confident'] == 28 and CSR['j187']['futilityRead'] == {'controls': 10, 'controlsConfident': 0, 'stopped': 47, 'read': 130}, CSR['j187']
assert sorted(lb['pools']) == sorted('random-%s-d508' % x for x in ('pauper', 'peasant', 'legacy', 'powered'))
assert (lb['refusedCastVoid'], lb['lostCastVoid'], lb['voidLabels']) == (0, 0, 0)
SPINES13 = ['s%02d' % k for k in range(1, 14)]
assert sorted(lb['bySpine']) == SPINES13 and all(lb['bySpine'][s]['sha'] == P8 and lb['bySpine'][s]['randomSeat'] == 'D508' for s in SPINES13)
STATUS = open(R188 + '/STATUS').read()
assert STATUS.startswith('done') and 'started: 2026-11-04T03:16:31-05:00' in STATUS and 'finished: 2026-11-04T10:45:30-05:00' in STATUS, STATUS[:200]
assert ('mtg-table: %s' % PIN[:7]) in STATUS and 'workers: 6 ' in STATUS and 'peak_worker_rss_gb: 1.13' in STATUS
PRESSURE = re.findall(r'pressure-\d: (\S+) (drop|raise) to (\d) worker', STATUS)
assert [(x[1], x[2]) for x in PRESSURE] == [('drop', '5'), ('raise', '6')] * 3, PRESSURE
DROPMIN = [round((datetime.fromisoformat(PRESSURE[k + 1][0]) - datetime.fromisoformat(PRESSURE[k][0])).total_seconds() / 60) for k in (0, 2, 4)]
CHECKS = open(R188 + '/checks.txt').read().splitlines()
assert len(CHECKS) == 50 and all(x.startswith('PASS') for x in CHECKS), CHECKS
PILOTC = open(R188 + '/pilot-checks.txt').read()
assert all(('PASS  %s == 1' % k) in PILOTC for k in ('has_d510', 'has_d511', 'has_d512', 'seat_code', 'deck_code', 'redaction_self', 'selftest', 'identity'))
MET = json.load(open(R188 + '/metrics.json'))
assert (MET['unit_errors'], MET['replay_diverged'], MET['ghost_candidates'], MET['lki_candidates'], MET['stack_overflows'], MET['pump_effect_ioobe'],
        MET['atlas_hook_ioobe'], MET['branch_error_stacks'], MET['branches'], MET['branch_timeouts'], MET['engine_errors']) == (0, 0, 0, 0, 0, 1, 3, 4, 53435, 5, 5), MET
assert (MET['atlas.problems'], MET['atlas.refusedCastOptions'], MET['atlas.lostCastOptions'], MET['atlas.refusedCastVoid'], MET['atlas.lostCastVoid'],
        MET['atlas.branchTimeoutsInStep'], MET['atlas.timeoutShare'], MET['peak_worker_rss_gb'], MET['armed']) == (0, 0, 0, 0, 0, 5, 9e-05, 1.13, 0), MET
WALL, starts = {}, []
for line in open(L188 + '/spine-times.txt'):
    f = line.split()
    s = f[0].split('-')[1]
    WALL[s] = (WALL.get(s, (0,))[0] + int(f[2]) - int(f[1]), f[3])
    starts.append(int(f[1]))
assert sorted(WALL) == SPINES13 and all(v[1] == '6' for v in WALL.values())
wall_s = sum(v[0] for v in WALL.values())
assert wall_s == 26057
mins = {k: round(v[0] / 60, 1) for k, v in WALL.items()}
SMAX = max(mins, key=lambda k: mins[k])
SMIN = min(mins, key=lambda k: mins[k])
J188_START = int(datetime.fromisoformat('2026-11-04T03:16:31-05:00').timestamp())    # results/J188/STATUS `started`
PILOT_MIN = round((min(starts) - J188_START) / 60)


def lines_in(p, text=None):
    try:
        return sum(1 for x in open(p, errors='replace') if text is None or text in x)
    except OSError:
        return 0


def one(pat):
    g = glob.glob(pat)
    assert len(g) == 1, pat
    return g[0]


def logcount(s, text, L=L188):
    return sum(lines_in(f, text) for f in glob.glob(L + '/b-%s-*/phaseB/logs/*.log' % s))


HOOK_TEXT = 'at forge.game.ability.effects.PlayEffect.resolve(PlayEffect.java:90)'
ROWS_G = {s: lines_in(one(L188 + '/b-%s-*/phaseB/branches.jsonl' % s)) for s in SPINES13}
REPLAY = {s: lines_in(one(L188 + '/b-%s-*/phaseB/units.jsonl' % s), 'replay diverged') for s in SPINES13}
PUMP = {s: logcount(s, 'at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)') for s in SPINES13}
HOOK = {s: logcount(s, HOOK_TEXT) for s in SPINES13}
BES = {s: logcount(s, 'branch error, stack:') for s in SPINES13}
GHOST = {s: logcount(s, '[ghost]') for s in SPINES13}
LKI = {s: logcount(s, '[lki]') for s in SPINES13}
TEX = {s: logcount(s, 'TimeoutException') for s in SPINES13}
NPE = sum(logcount(s, 'NullPointerException') for s in SPINES13)
SO = sum(lines_in(f, 'StackOverflowError') for f in glob.glob(L188 + '/b-s??-*-25??/phaseB/branches.jsonl'))
EXITS = dict(l.split() for l in open(L188 + '/exits.txt') if l.strip())
ATL = {s: json.load(open(one(L188 + '/b-%s-*/atlas.json' % s)))['checks'] for s in SPINES13}
assert {s: v for s, v in PUMP.items() if v} == {'s07': 1} and {s: v for s, v in HOOK.items() if v} == {'s11': 3}, (PUMP, HOOK)
assert {s: v for s, v in BES.items() if v} == {'s07': 1, 's11': 3}, BES
assert {s: v for s, v in TEX.items() if v} == {'s01': 14, 's11': 5, 's12': 1} and NPE == 0, (TEX, NPE)
assert not any(GHOST.values()) and not any(LKI.values()) and SO == 0 and not any(REPLAY.values()) and sum(ROWS_G.values()) == 53435
assert all(v == '0' for v in EXITS.values()) and len(EXITS) == 13
assert all(not ATL[s]['problems'] and ATL[s]['forkProblems'] == 0 and ATL[s]['frameLogsFailed'] == 0 for s in SPINES13)
FRAMELOGS = sum(ATL[s]['frameLogs'] for s in SPINES13)
FORKS = sum(ATL[s]['forks'] for s in SPINES13)
WARN = {s: len(ATL[s]['warnings']) for s in SPINES13 if ATL[s]['warnings']}
assert WARN == {'s13': 3}, WARN
# the three s11 PlayEffect.java:90 errors: each stack runs through our Atlas$Hook.decision (row 7's shape), at these decisions
HOOKSITES = []
for f in sorted(glob.glob(L188 + '/b-s11-*/phaseB/logs/*.log')):
    ls = open(f, errors='replace').read().splitlines()
    for i, x in enumerate(ls):
        if 'branch error, stack:' in x:
            blk = ls[i:i + 60]
            if any(HOOK_TEXT in y for y in blk):
                assert any('Atlas$Hook.decision' in y for y in blk), (f, i)
                HOOKSITES.append(re.search(r'atlas:(d\d+):random:(o\d+):b\d+', x).group(1, 2))
assert sorted(HOOKSITES) == [('d11', 'o2'), ('d11', 'o2'), ('d12', 'o1')], HOOKSITES
TOOL = json.load(open(L188 + '/report/tool.json'))
assert TOOL['refusedCastOptionList'] == [] == TOOL['lostCastOptionList'] and TOOL['refusedCastCards']['Lively Dirge'] == 227 and TOOL['lostCastCards']['Lively Dirge'] == 37
LD = json.load(open(one(L188 + '/report/lost-b-s02-*.json')))
assert LD['byNameRefused']['Lively Dirge'] == 227 and LD['byName']['Lively Dirge'] == 37
assert not [f for f in glob.glob(L188 + '/report/lost-*.json') if 'Lively Dirge' in open(f).read() and '-s02-' not in f]
REFSHARE = round(100 * TOOL['refusedCastShare'], 2)
assert REFSHARE == 0.13
GB = round(sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(L188) for x in fs) / 1e9, 1)
CMP = json.load(open(L188 + '/report/compare-j187.json'))
assert CMP['night']['before']['decisionsBranched'] == 130 and CMP['night']['this']['decisionsBranched'] == 125
assert (CMP['night']['before']['confidentPerWorkerHour'], CMP['night']['this']['confidentPerWorkerHour']) == (0.5407, 0.5526)
N = {'branched': lb['branched'], 'labels': lb['labels'], 'confident': lb['confident'], 'partial': lb['partialLabels'], 'controls': lb['futilityControls'],
     'ctlConf': fr['controlsConfident'], 'read': fr['read'], 'stopped': fr['stopped'], 'cpwh': round(c7['confidentPerWorkerHour'], 3),
     'cpwh95': [round(x, 3) for x in c7['confidentPerWorkerHourPoisson95']], 'c7': c7['confidentPer7Worker10hNight'], 'p95': c7['confidentPer7Poisson95'],
     'wall': wall_s, 'wallh': round(wall_s / 3600, 1), 'wh': round(c7['workerHours'], 1), 'minmin': min(mins.values()), 'smin': SMIN,
     'maxmin': max(mins.values()), 'smax': SMAX, 'games': sum(ROWS_G.values()), 'perSpine': round(lb['branched'] / 13, 1), 'gb': GB, 'hook': sum(HOOK.values()),
     'pump': sum(PUMP.values()), 'ghost': sum(GHOST.values()), 'errs': MET['branch_error_stacks'], 'tex': sum(TEX.values())}
NOTE = {'s01': ' (14 Forge AI-eval `TimeoutException` lines)',
        's02': ' (Lively Dirge, seat-queue row 6\'s card, dealt again: 227 casts refused and 37 lost, no option over the bar)',
        's07': ' (1 PumpEffect IOOBE)',
        's11': ' (3 PlayEffect IOOBEs under the hook, d11 o2 twice and d12 o1, seat-queue row 7; 5 Forge AI-eval timeouts)',
        's12': ' (1 Forge AI-eval timeout)',
        's13': ' (3 options capped past the warning bar, a warning)'}
ROWS = {}
for k in range(1, 14):
    s = 's%02d' % k
    mm = lb['bySpine'][s]
    ROWS[s] = '%d / %d: %d, %d, %.1f min%s' % (2465 + k, 2565 + k, mm['rows'], mm['confident'], mins[s], NOTE.get(s, ''))
# J187's numbers, the population's second night (history now): its own report, as derive-j188.py read it, unchanged
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
N7 = {'cpwh': round(a7['confidentPerWorkerHour'], 3), 'cpwh95': [round(x, 3) for x in a7['confidentPerWorkerHourPoisson95']], 'c7': a7['confidentPer7Worker10hNight'],
      'p95': a7['confidentPer7Poisson95'], 'wh': round(a7['workerHours'], 1), 'wall': a7['wallSec'], 'wallh': round(a7['wallSec'] / 3600, 1),
      'minmin': min(m7.values()), 'maxmin': max(m7.values()), 'smax': max(m7, key=lambda k: m7[k]), 'perSpine': round(l7['branched'] / 13, 1)}
assert N7['cpwh'] == 0.541 and N7['perSpine'] == 12.5 and (N7['minmin'], N7['maxmin'], N7['smax']) == (17.1, 76.1, 's03')
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


def pool(parts):    # [(confident, worker-hours, labels, controls, controlsConfident, stopped, read)]
    pc, pwh = sum(x[0] for x in parts), sum(x[1] for x in parts)
    plo, phi = poisson95(pc)
    p = {'confident': pc, 'labels': sum(x[2] for x in parts), 'wh': round(pwh, 1), 'cpwh': '%.3f' % (pc / pwh), 'cpwh95': ['%.3f' % (plo / pwh), '%.3f' % (phi / pwh)],
         'c7': round(70 * pc / pwh, 1), 'p95': [round(70 * plo / pwh, 1), round(70 * phi / pwh, 1)], 'controls': sum(x[3] for x in parts),
         'ctlConf': sum(x[4] for x in parts), 'stopped': sum(x[5] for x in parts), 'read': sum(x[6] for x in parts)}
    p['ctlHi'] = round(clopper_hi0(p['controls']), 3) if p['ctlConf'] == 0 else None
    return p


P6 = (l6['confident'], r6['workerHours'], l6['labels'], f6['controls'], f6['controlsConfident'], f6['stopped'], f6['read'])
P7 = (l7['confident'], a7['workerHours'], l7['labels'], f7['controls'], f7['controlsConfident'], f7['stopped'], f7['read'])
P8N = (lb['confident'], c7['workerHours'], lb['labels'], fr['controls'], fr['controlsConfident'], fr['stopped'], fr['read'])
POOL2 = pool([P6, P7])    # J186 and J187: J188's registered pool, recomputed
POOL = pool([P6, P7, P8N])    # J186, J187 and J188: the three nights before tonight
assert (POOL2['confident'], POOL2['wh'], POOL2['cpwh'], POOL2['cpwh95']) == (49, 112.0, '0.438', ['0.324', '0.578']), POOL2
assert ("J186's and J187's together: %d confident on %.1f worker-hours, %s [%s, %s]" % (49, 112.0, POOL2['cpwh'], POOL2['cpwh95'][0], POOL2['cpwh95'][1])) in SRC_T
assert abs(round(70 * lb['confident'] / c7['workerHours'], 1) - c7['confidentPer7Worker10hNight']) <= 0.1   # the 7-worker scale is 70 x per worker-hour
N6 = {'cpwh': round(r6['confidentPerWorkerHour'], 3), 'cpwh95': [round(x, 3) for x in r6['confidentPerWorkerHourPoisson95']], 'c7': r6['confidentPer7Worker10hNight'],
      'p95': r6['confidentPer7Poisson95'], 'wh': round(r6['workerHours'], 1)}


# J188's draws: lab-j188/report/draws.json's asRun (equal to its recorded), and recomputed from the data folder (draws.py's own drawsha)
def drawsha(dirs):
    hh, n = hashlib.sha256(), 0
    for d in dirs:
        hh.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            hh.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (hh.hexdigest(), n)


DRW = json.load(open(L188 + '/report/draws.json'))
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP188 = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2465 + k) for k in range(1, 14)]
VA188 = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2665 + k) for k in range(1, 14)]
assert sorted(DRW['asRun']['spines']) == sorted(SP188) and all(DRW['recorded'][k] == DRW['asRun'][k] for k in DRW['asRun'])
assert all(DRW['asRun']['spines'][x][0] == drawsha([L188 + '/decks/' + x]) for x in SP188) and DRW['asRun']['validation'] == drawsha([L188 + '/validation/' + x for x in VA188])
J188_DRAWS = sorted({DRW['asRun']['spines'][x][0].split()[0] for x in SP188})
J188_VAL = DRW['asRun']['validation'].split()[0]
assert len(J188_DRAWS) == 13
REG_SRC = set(re.findall(r"'([0-9a-f]{64})'", SRC_T))
assert len(REG_SRC & set(re.findall(r"J187_DRAWS = \{([^}]*)\}", SRC_T)[0].replace("'", '').replace(',', ' ').split())) == 13   # J187's are among them
expect('J188\'s 13 spine draws and its validation draw are none of J171-J187\'s registered ones', not (set(J188_DRAWS) | {J188_VAL}) & REG_SRC)

# ======================================================================================================================================
# E. the seeds: J189's block is unused (pc-jobs' jobs/ at its HEAD, the drafts, the data folder)
# ======================================================================================================================================
PAT = '2479|248[0-9]|249[01]|2579|258[0-9]|259[01]|2679|268[0-9]|269[01]|2779|278[0-9]|279[01]'
PCJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'rev-parse', '--short=8', 'HEAD'], capture_output=True, text=True).stdout.strip()
hits = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'grep', '-n', '-w', '-E', PAT, 'HEAD', '--', 'jobs/'], capture_output=True, text=True).stdout.splitlines()
hits += subprocess.run('grep -n -w -E %s /home/justin-a/code/pc-results/drafts/*.md' % q(PAT), shell=True, capture_output=True, text=True).stdout.splitlines()
hits = [x for x in hits if 'J189-atlas-4b-night-thirteen.md' not in x]
# a hit is a seed's only if one of its block tokens is not a decimal's digits (0.2784: J168's registered confident share, in J169's,
# J170's and J171's files); a job's own grep line is its own
NOTSEED = re.compile(r"\.(%s)\b" % PAT)
odd = [x for x in hits if PAT not in x and re.search(r'(?<![0-9A-Za-z.])(%s)(?![0-9A-Za-z.])' % PAT, NOTSEED.sub('', re.sub(r'^(HEAD:)?[^:]+:\d+:', '', x)))]   # the grep's file:line: prefix is not the line
NOTSEED_N = sum(1 for x in hits if PAT not in x and x not in odd)
expect('the seed block %s is unused in pc-jobs %s jobs/ and the drafts (only a job\'s own grep line; %d line(s) hold 0.2784, no seed)' % (PAT, PCJ, NOTSEED_N), not odd)
DATA_HIT = [p for p in glob.glob('/home/justin-a/code/lab/data/*/*') + glob.glob('/home/justin-a/code/lab/data/*/*/*') if re.search(r'-(%s)$' % PAT, p)]
expect('no folder under the lab data folder (three levels) ends in one of the block\'s seeds', not DATA_HIT)
expect('lab-j189 does not exist yet (the owner makes it, empty, before posting)', not os.path.exists('/home/justin-a/code/lab/data/lab-j189'))
PJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'log', '-1', '--format=%h %s', 'HEAD', '--', 'jobs/J188-atlas-4b-night-twelve.md'],
                    capture_output=True, text=True).stdout.strip()
expect('J188\'s job file at pc-jobs HEAD is the one posted (%s), and SRC is it byte for byte' % PJ[:8],
       PJ and subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'show', 'HEAD:jobs/J188-atlas-4b-night-twelve.md'], capture_output=True, text=True).stdout == SRC_T)
PIN_SUBJ = git('log', '-1', '--format=%s', PIN).strip()
SUBJ = PIN_SUBJ if len(PIN_SUBJ) <= 150 else PIN_SUBJ[:150].rsplit(' ', 1)[0] + ' ...'
expect('J188\'s file quotes the same pin subject', ('(%s: "%s")' % (P8, SUBJ)) in SRC_T)
AVG_MIN = round(wall_s / 13 / 60)
D510C, D511C = DEC['D510'][1][:8], DEC['D511'][1][:8]
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
    """Replace `old` (J188's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
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
HS = ', '.join('%s %s%s' % (x[0], x[1], ' twice' if c == 2 else '') for x, c in sorted(Counter(HOOKSITES).items()))   # d11 o2 twice, d12 o1
TEXS = ', '.join('%s %d' % (s, v) for s, v in TEX.items() if v)
POOLED_BEFORE = f"J186's, J187's and J188's together: {POOL['confident']} confident on {POOL['wh']} worker-hours, {POOL['cpwh']} [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}]"

# ======================================================================================================================================
# 0. the history paragraphs, rewritten (J188's night; the pin unchanged)
# ======================================================================================================================================
span('**Why J188.**', '**Before posting -- the coordinator', f'''**Why J189.** J188 (rung 4b, night twelve, the third of D508's population, pin {P8}) ran 2026-11-04 03:16 to 10:45 EST, all 13
spines, its scan and its Report, every spine exit 0, and **passed all 50 of the runner's final checks** (`atlas.problems = 0`,
`atlas.refusedCastOptions = 0`, `atlas.lostCastOptions = 0`, `unit_errors` 0). Its report is the job's own, `lab-j188/report/`:
{N['branched']} branched decisions, {N['labels']} labels, {N['confident']} confident, {N['partial']} partial, {N['controls']} controls ({N['ctlConf']} of them confident at the full n), **{N['cpwh']} confident
labels a worker-hour** [{N['cpwh95'][0]}, {N['cpwh95'][1]}] ({N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; J187's {N7['cpwh']}, J186's {N6['cpwh']}), at 6 workers sized (three
memory-pressure drops to 5 workers inside the spines, each raised back within {min(DROPMIN)} to {max(DROPMIN)} minutes; `spine-times.txt` records 6, and the rate
counts 6), {N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest), {N['wh']} worker-hours, {N['games']:,} branch games, {MET['branch_timeouts']} branch
timeouts (`timeoutShare` 0.0001), peak RSS {MET['peak_worker_rss_gb']} GB a worker, {N['gb']} GB on the data folder. What it showed, each read in its folder:
- **D511 held**: every one of the night's {FORKS:,} branch forks was the baseline's position (atlas.json's fork check, 0 not the position on
  all 13 spines; J187's s03: 975 of 6,600), and `replay_diverged` is 0 (J186: 31, J187: 0).
- **The checker passed every frame log**: {FRAMELOGS:,} frame logs through `tools/check-redaction.mjs`, 0 failed on any spine, so no failure
  of J187's s06 shape (D512) or of J186's all-hidden target record (D510), and no other; the pilot's redaction self-test, D512's four
  controls among its rows, passed. The results do not count whether a hideaway host owned by the viewer was met tonight.
- **The seat queue's row 7 recurred, small**: `atlas_hook_ioobe` {N['hook']} (J187: 58), all s11's ({HS}), each an
  `IndexOutOfBoundsException` from `FCollection.get` in Forge's `PlayEffect.java:90` with our `Atlas$Hook.decision` in its stack; with
  s07's one `PumpEffect.java:299` (`pump_effect_ioobe` {N['pump']}; J187: 60) they are the night's {N['errs']} branch errors (`branch_error_stacks`).
- **Row 6 failed no check**: no option had its forced cast refused or lost in more than half its rows (`refusedCastOptions` 0,
  `lostCastOptions` 0; `refusedCastVoid` and `lostCastVoid` 0). Lively Dirge, J187's Spree card, was dealt again (s02, peasant): 227 of
  its casts refused and 37 lost across the spine's branch rows (`lost-b-s02-*.json`, `tool.json`'s by-card counts), under every option's
  bar; the night's refused share {REFSHARE}% (J187's 0.33%).
J188's other signals: 0 `[ghost]` lines, 0 `[lki]` lines, 0 `StackOverflowError`s, 0 Forge NPEs, and {N['tex']} `TimeoutException` lines in
the worker logs ({TEXS}), none a branch error; s13 warned of 3 options capped past the warning bar (a warning, never a check).

**The pin: J188's, unchanged.** Nothing has merged into mtg-table since J188 was posted: main is {P8}, J188's pin, so the seat, its
record, the replay and the checker are J188's -- D510 (the target record writes a target the seat cannot see as `option:hidden`:
record-only, D509 point 2; added by {D510C}), D511 (an atlas unit's replay records into a sink that writes nothing: `CubeLab.java`
between landings, D509 point 1; added by {D511C}) and D512 (the redaction checker admits J187's s06 hideaway shape: a checker admission;
added by {D512C}), each as J188's *Why J188* states it. The frozen set's numstat since J186's pin is J188's (`git diff --numstat e557dedf
<pin> -- {FROZEN}`: {ADMIT_PROSE}), and every pin-decided line of this pilot is J188's, recomputed at the pin and equal byte for byte.
**The seat queue** (`/home/justin-a/code/pc-results/study/seat-queue.md`, D509 point 3) holds rows 1-7, none landed and none fixed
tonight: 1-4 the cube lab's follow-ups 27, 28, 30 and 31 (D509's), 5 Forge's AI memory left unrestored by `Decisions.quiet` (D511's
diagnosis), 6 J187's Lively Dirge (a mode-cost spell the gate offers on its base cost) and 7 J187's s04 `PlayEffect.java:90` errors
(J188's s11: 3).

J189 is J188's night carried onto the same main: the same seat, the same design, the same pilot, the same reads and checks, 13 new spines
at the next seeds in a new folder, `lab-j189`. J188's own outputs stay in `lab-j188/` and are read only, for the J188 columns. **J189 is
D508's population's FOURTH night**: what the seat plays and offers is J186's, J187's and J188's (D509; D510 changed the record, D511 the
replay, both before J188's pin), so J189's labels pool with J186's twelve finished spines, J187's thirteen and J188's thirteen under the
same pool names, `random-<band>-d508`, and J185's numbers (D507's population, one night) are read beside, as information, never added.
A reader pooling the four nights leaves out the rows of units whose logs failed the checker on a hidden-information fault (J186's s11
d13-d16; D509 point 4), J187's s03 decisions whose forks were not the position, and tonight's if any (J188 had none); no mechanism drops
them today.

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', f'''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j189` does not exist yet (2026-11-04, when this was drafted): the owner
   makes it, empty, before posting (`mkdir`, then `ls -A` prints nothing). The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j189/`,
   from an earlier J189 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `{PIN}` ({P8}: "{SUBJ}"), written by
   `drafts/derive-j189.py` from its one argument, which must be J188's registered pin; no placeholder pin is left in this file. It is
   **J188's pin, unchanged**, still main's head (nothing has merged into mtg-table since J188 was posted) and **on origin/main**
   (derive-j189.py checks all three; J184 failed at its prepare step on a pin that was merged but not pushed). D510 and D511 changed
   D509's frozen set before J188's pin, each by its written argument (J188's *Why J188*), and `seat_code` admits exactly their numstat
   since J186's pin e557dedf, nothing else -- J188's line. **If main moves before posting, the pin stays J188's** unless the owner says
   otherwise: a pin with anything merged since is a new derivation (a frozen-set diff other than D510's and D511's is NOT POSTABLE inside
   D508's population; D509: a landing has a decision and a population of its own).
3. **The names this file reads were computed against the pin itself** (derive-j189.py, from `git show`/`git diff` at {P8}, exactly as
   derive-j188.py computed them): the decision files D505-D508 and D510-D512 and the names each `has_d505` to `has_d508` and `has_d510` to
   `has_d512` line reads, `seat_code` (bridge/src since 0a6cf5c1, 3275af30, ac07876b, 7a984963, 6e87e5d4 and 480c837d, the golden,
   SearchPolicy.java's numstat: J187's lists plus D510's four files; then the frozen set's numstat since e557dedf, exactly D510's and
   D511's), `deck_code` (the blobs and sha256s) and the commits that added D481-D512's decision files -- **every one J188's line, byte for
   byte** (but its folder and stamp), which derive-j189.py checks. It then runs this file's own pilot lines for all of them against the
   pin (a `git archive` of it, HEAD read as the pin) and requires each to print 1. The script says when a pin misses one and is then NOT
   POSTABLE -- a guard is never loosened to pass. D466-D504's greps are J183's, unchanged.
4. **J188 has ended** (2026-11-04 10:45, all 50 final checks passed; its Report written, `lab-j188/report/`). J189 reads lab-j188
   read-only, for its J188 columns; nothing waits on another job, so there is **no `after:` line**. J188's job file needs nothing.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J189 pools with J186, J187 and J188 and compares with
   J188 position by position, and a change of design would split the population's nights.
6. **Nothing else to make, move or clean.** J189 reads lab-j170 (J171's night), lab-j188 (J188's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, J182's and J183's from their `report/draws.json`, read on 2026-11-02, J185's from
   `lab-j185/report/draws.json`, read on 2026-11-03, J186's from its pilot's `var/lab-j186-local/draws-pilot.json` in the lab clone,
   equal to lab-j186's draw as derive-j187.py recomputed it, read on 2026-11-03, J187's from `lab-j187/report/draws.json`'s `asRun`,
   equal to its `recorded` and to its data folder's draw as derive-j188.py recomputed it, read on 2026-11-04, and J188's from
   `lab-j188/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as derive-j189.py recomputed it, read on
   2026-11-04), so it reads no `var/lab-j1xx-local/` folder but its own. Post nothing that writes lab-j188 or lab-j189 beside J189.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare across nights', f'''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough";
  D508's population holds J186's {f6['controls']}, J187's {f7['controls']} and J188's {fr['controls']} controls before tonight ({POOL['ctlConf']} of {POOL['controls']} confident, exact 95% [0, {POOL['ctlHi']}]), and
  tonight's ~6-14 are its fourth input (D507's holds J185's 13, D498's J182's 6 and J183's 11, D497's J181's 13, D493's J177's 12 and
  J180's 14: 0 of 69 confident, all read beside); 0.25 holds until this population's pooled count can carry the read.
''')

span("**So J188 is D508's population's third night, on new spines**", '**The seeds are new', '''**So J189 is D508's population's fourth night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's (D510's
target record shape), the copier's carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's
(`Decisions.visible`: a candidate judged where the game holds the card now, never by a last-known copy's own zone; D507's Stack rule kept
over that card), what it plays and offers J186's, J187's and J188's (D509) -- so `pool: random-<band>-d508`, `randomSeat: "D508"`,
contract v6, **pooled with J186's, J187's and J188's rows**. **Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands
cycled as J166's, so s01 is pauper and s13 pauper again), into a new folder. **J188's numbers are a comparison by position and, with
J186's and J187's, the pooled read's inputs, never a baseline**: s01 beside s01 is the same band, the same seat and the same branching
design, but other decks and other seeds -- every difference is a candidate. J185's, J183's, J182's, J181's, J180's, J177's, J173's and
J171's nights stay other populations and appear only in the readers' self-tests, their registered expectations and J177's sizing
paragraph.

''')

SEEDS_P = f'''**The seeds are new** (checked by derive-j189.py, 2026-11-04): J188's block plus 13 -- deck seeds **2479-2491** (`$((2478 + K))`), game
seeds **2579-2591** (the deck seed + 100), validation deck seeds **2679-2691** (`$((2678 + K))`) with game seeds **2779-2791**
reserved. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -w -E
'{PAT}' {PCJ} -- jobs/` (pc-jobs at {PCJ}, J188's post) finds only a job's own grep line and no seed, and so does the same
grep over `/home/justin-a/code/pc-results/drafts/*.md` -- beside {NOTSEED_N} lines that hold 0.2784 (J168's registered confident share, in J169's,
J170's and J171's files), a decimal, never a seed and never touched by the shift; every computed seed in a job or draft is an earlier
block's (`$((2000 + K))` to J181's `$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391, with the older
blocks' small ones below 1700) or J182's, J183's, J185's, J186's, J187's and J188's `$((2400 + K))`, `$((2413 + K))`, `$((2426 + K))`,
`$((2439 + K))`, `$((2452 + K))`, `$((2465 + K))` and their companions (2401-2478, 2501-2578, 2601-2678, 2701-2778, lab-j182's,
lab-j183's, lab-j185's, lab-j186's, lab-j187's and lab-j188's; J184 reserved J185's block and never drew; J186's, J187's and J188's
validation game seeds 2740-2778 stay reserved for the job that branches them); and no folder under `/home/justin-a/code/lab/data`
(three levels deep) ends in one of this block's. The game seeds stay in the 25?? hundreds, so every `lab-j189` glob keeps `b-s??-*-25??`,
and the comparison's `lab-j188` globs read `25??` as J188's read lab-j187's. Bases and literals were moved together by one inclusive
shift of J188's block ([2466, 2478] and its three companions, +13), skipping any number touching a letter, a dot or a hex digit, and
every changed four-digit token was read in context (derive-j189.py's audit): RESTORED_SENTENCE The smoke keeps J166's pair (deck seed
2099) at game seed 2199, in a new folder, as every pilot since J167; that pair holds none of the nine cards D482-D506 list, and its
redraw on the nine-card list (at aab15d29, D506's merge) gave J166's registered sha256 back (`edfdc861...`, 0 skips), so its draw on the
list is J166's.

'''
span('**The seeds are new', '## The decks', '\x00SEEDS\x00')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J189's own name, J188 as the comparison, J187 and J186 kept as the pool's)
# ======================================================================================================================================
span("and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,", "**The deck code is J171's pin's", """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's, J185's, J186's, J187's or J188's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted
seed; J177's are registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`, J186's from its pilot's
`draws-pilot.json` in the lab clone -- J186's Report never ran -- equal to its data folder's draw as derive-j187.py recomputed it,
J187's from `lab-j187/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as derive-j188.py recomputed it,
and J188's from `lab-j188/report/draws.json`'s `asRun`, equal to its `recorded` and to its data folder's draw as derive-j189.py
recomputed it).

""")
span("**The deck code is J171's pin's plus exactly D490, D492, D494 and D506**", "**The sha256s are recorded, not registered.**", f'''**The deck code is J171's pin's plus exactly D490, D492, D494 and D506** (`deck_code`, the pilot; every value computed from the pin by
derive-j189.py and equal to J186's, J187's and J188's, unchanged since J185's pin 0a6cf5c1: D508-D512 touch no deck file): `cubes/library/`
untouched since J171's pin f2b4e9c2; `tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in {len(D_OUT)} lines out and {len(D_IN)} in and nothing else --
the header comment of its point 5 (the list's cards and decisions named, D506's wording: what lists a card is the file's own `about`) and
the doc comment and the error message of `parseEngineUnplayable`, the throw's condition unchanged -- the changed lines' sha256s
registered; and `tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made nine, in this order: Scute Swarm unchanged,
Chain of Smog as at J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus of Ideation, Studious
First-Year (D492) and Ob Nixilis, the Adversary (D494), each `since: "J176"`, then Old Man of the Sea and Rubinia Soulsinger (D506),
each `since: "J183"`; and both files' blobs are the pin's, byte for byte (last changed by {LASTS}, the `about` line's D506 sentence
included). J185's, J186's, J187's and J188's guards accepted the same nine, and so does this one, nothing else, so **the draw never deals
a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger**.

''')
put("| J187 at this position (the same population, D508's second night; the same seat and design; other decks): decisions branched, confident labels, wall |",
    "| J188 at this position (the same population, D508's third night; the same seat and design; other decks): decisions branched, confident labels, wall |")
span("(J187's numbers from `lab-j187/report/labels.json`'s `bySpine`", "Folders: `lab-j188/decks/", '''(J188's numbers from `lab-j188/report/labels.json`'s `bySpine` (`rows`, `confident`) and `lab-j188/spine-times.txt`, read only on
2026-11-04; all thirteen at 6 workers. compare.py reads J188's column again at the Report from the same files, with the same code as
this night's.)

''')
span("**Sizing: J177's, unchanged; J187's walls beside it.**", "measured the design:",
     f"""**Sizing: J177's, unchanged; J188's walls beside it.** J188's thirteen spines, all at 6 workers, took {N['wall']:,} s of walls ({N['wallh']}
h; {N['minmin']} to {N['maxmin']} min a spine, {N['smax']} the longest, inside `timeout: 3h` by {round(180 - N['maxmin'])} min), {N['wh']} worker-hours, {N['games']:,} branch rows,
{N['branched']} decisions branched ({N['perSpine']} a spine; J187's 163, {N7['perSpine']}; J186's 153 on twelve spines, 12.8; J185's 187, 14.4; J183's 161, 12.4;
J182's 198, 15.2; J181's 153, 11.8; J180's 105, 8.08); J187's thirteen took {N7['wall']:,} s ({N7['wallh']} h; {N7['minmin']} to {N7['maxmin']} min, {N7['smax']} the longest) and
J186's twelve 36,121 s (10.0 h; 14.0 to 150.0 min, s04 the longest). J177
""")
put("| `pool` | **`random-<band>-d508`**: D508's population, J186's, J187's and this night's; never",
    "| `pool` | **`random-<band>-d508`**: D508's population, J186's, J187's, J188's and this night's; never")
put("(labels.py's `--seat` default, D508 as J186's and J187's; their rows say \"D508\" too, J185's \"D507\"",
    "(labels.py's `--seat` default, D508 as J186's, J187's and J188's; their rows say \"D508\" too, J185's \"D507\"")
put("""**Pooled
  with J186's and J187's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's docs (e557dedf,
  43043fe5) and by D510's record and D511's replay (fe063f94), neither a change to what the seat plays or offers) **and never with J185's v6
  rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5 rows, or v1-v4** (D489, D508, D509,
  *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`), never on the three nights' `sha`
  alone, and leaves out the rows of units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16; D509 point 4)
  and J187's s03 decisions whose forks were not the position (*Why J188*).""",
    f"""**Pooled
  with J186's, J187's and J188's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's docs
  (e557dedf, 43043fe5) and by D510's record and D511's replay ({P8}, J188's and this night's), neither a change to what the seat plays or
  offers) **and never with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5
  rows, or v1-v4** (D489, D508, D509, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`),
  never on the four nights' `sha` alone, and leaves out the rows of units whose logs failed the checker on a hidden-information fault
  (J186's s11 d13-d16; D509 point 4) and J187's s03 decisions whose forks were not the position (J188's *Why J188*); J188 had neither.""")
span("Beside it, **J187's** (THE SAME POPULATION's second night", "review's ~46 [41, 51] a 7-worker night**", f"""Beside it, **J188's** (THE SAME POPULATION's third night, read from `lab-j188/report/labels.json` at
  the Report, `--j188=`: {N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}] on {N['wh']} worker-hours, thirteen spines), **J187's** (its second night, registered
  here from `lab-j187/report/labels.json`: {N7['cpwh']} [{N7['cpwh95'][0]}, {N7['cpwh95'][1]}] on {N7['wh']} worker-hours, thirteen spines), **J186's** (its first night,
  registered here from the coordinator's by-hand report, J186 having been aborted before its Report: {N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}] on {N6['wh']}
  worker-hours, twelve spines) and **the four nights pooled** (their confident labels over their worker-hours, by hand at the morning
  read; {POOLED_BEFORE}), then, **as
  information**, J185's 0.376 (D507's one night), J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563, other
  populations, and **the
  """)
span("**This night's numbers are the THIRD contribution", "- **(g) the cap read**", f"""**This night's numbers are the FOURTH contribution
  to D508's population's pooled read** (`pooledInputs`): J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']} stopped, {f6['read']} read; the
  by-hand report's `f_futilityRead`, registered here), J187's {f7['controlsConfident']} of {f7['controls']} ({f7['stopped']} stopped, {f7['read']} read; its report's `f_futilityRead`,
  registered here) and J188's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read; `c_sizingRead.j188.futilityRead`) are the first three --
  {POOL['ctlConf']} of {POOL['controls']}, exact 95% [0, {POOL['ctlHi']}] -- and the four are added by hand at the morning read; J185's 0 of 13 (D507's), J183's 0 of
  11 and J182's 0 of 6 (D498's), J181's 0 of 13 (D497's), J177's 0 of 12 and J180's 0 of 14 (D493's) are read beside, as information,
  never added.
""")
span("- **(xvii) J188 beside J187, BY POSITION", "- **(xi)** the draws", """- **(xvii) J189 beside J188, BY POSITION, DIFFERENT DECKS, THE SAME POPULATION (D508's), THE SAME SEAT AND DESIGN**
  (compare.py, `report/compare-j188.json`; J188's column computed from its folders and report with the same code): per spine position
  and for the night, decisions listed per baseline turn, decisions branched, branched in full, partial labels, options per decision
  branched, labels, confident labels, the confident share, **confident labels per worker-hour**, the mean regret at Forge's choice, the
  capped share, the branch games and the wall. **A candidate, never a verdict**: the decks differ at every position and the seat does
  not, so no difference is the seat's; J188's s11 carries the seat queue's row 7 (three errored branches) and its s02 dealt row 6's
  Lively Dirge under the bar.
""")
put("""unchanged, by derive-j187.py and derive-j188.py, D510-D512's by derive-j188.py), the commits that added D481-D512's decision files (D509 a
policy, no code: its commit alone)""",
    """unchanged, by derive-j187.py, derive-j188.py and derive-j189.py, D510-D512's by derive-j188.py and again, unchanged, by
derive-j189.py), the commits that added D481-D512's decision files (D509 a policy, no code: its commit alone)""")
put("(`seat_code`, its lists computed from the pin, J187's plus D510's four files:",
    "(`seat_code`, its lists computed from the pin, J188's line byte for byte -- J187's lists plus D510's four files:")
# the guards: D505-D512's lines from the spec (J188's, checked above), the seat block with the admitted numstat (J188's line)
G508 = ''.join(SPEC[d][0] + '\n' + shell_of(d, SPEC[d][1], 'lab-j189-local') + '\n' for d in ('D505', 'D506', 'D507', 'D508', 'D510', 'D511', 'D512'))
SEAT_BLOCK = f'''# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's (D510's target
# record); the gate in front of what it sees and offers is D508's (`decides:`), all as J186's, J187's and J188's: D509 freezes the seat
# between landings, and D510 (record-only, point 2) and D511 (the replay, CubeLab.java, point 1) landed between them, before J188's pin,
# with their written arguments; this pin is J188's, and nothing has merged since. Every list below was computed from the pin {P8} by
# derive-j189.py, never typed, and is J188's line byte for byte (derive-j188.py's at the same pin): J187's (derive-j187.py's at 43043fe5)
# plus D510's four files and nothing else. D495's merge (480c837d, J177's pin) is an ancestor of the pin, and the
# seat-identity golden is unchanged since it and since J173's pin (6e87e5d4); bridge/src since 480c837d and since 6e87e5d4 is J183's ten
# files (D496's six with GameLog.java's comment-only javadoc, D497's and D500's LenientGameCopier.java, D498's Determinizer.java and
# Atlas.java, D500's SearchPolicy.java) and what later pins gained since; SearchPolicy.java since 6e87e5d4 is {T['spnum']!r} (D493's self-test
# accessor 5 lines plus D500's 3); since 7a984963 J183's four and the same; since J182's pin (ac07876b) and since J183's pin (3275af30,
# D502-D504's merge) bridge/src changed in exactly: {short(T['s327'])} (numstat {T['num327'].strip() or 'none'}); since J185's pin
# (0a6cf5c1, D505-D507's merge) in exactly: {short(T['s0a6'])} (numstat {T['num0a6'].strip() or 'none'}); and since J186's pin (e557dedf,
# D508's merge, the population's opening pin) the frozen set, {FROZEN}, changed in exactly D510's four
# files and D511's two, at the numstat registered in derive-j188.py's and derive-j189.py's ADMIT ({NUMS}): D509 point 1's test with
# the two landings between landings admitted by name and by line count, so any other change fails it
sc=0
{T['line']}
if git merge-base --is-ancestor {B480} HEAD && git diff --quiet {B480} HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet {B6E8} HEAD -- fixtures/cubelab/seat-identity.json; then
{TEST188}
fi
echo $sc > var/lab-j189-local/seat-code.txt
echo "J189: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's, the gate D507's and D508's (bridge/src since J185's pin 0a6cf5c1: {short(T['s0a6'])}; the frozen set since J186's pin e557dedf: exactly D510's and D511's admitted numstat): $sc"
'''
span("# D505 (hideaway's look kept while the card stays in exile, the dig tied by its trigger's resolution; amends D502; the names this file\n",
     "# D481-D496 by decision id:", G508 + SEAT_BLOCK)
# the deck code: deckcode.py and its block, every value from the pin (J188's, checked above)
DECK_BLOCK = f'''# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506, and nothing else (deckcode.py's
# header): nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's, D494's and D506's comment and
# message lines only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492), Ob
# Nixilis, the Adversary (D494), and Old Man of the Sea and Rubinia Soulsinger (D506); both files the pin's blobs (computed by
# derive-j189.py from {P8}, equal to J186's, J187's and J188's; unchanged since J185's pin 0a6cf5c1)
cat > var/lab-j189-local/bin/deckcode.py <<'PY'
# J189: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j189-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j189.py from the
# pin {P8} with git, never typed, and is J186's, J187's and J188's. Exits 0 when all three hold:
#   census  deckcensus.ts: {len(D_OUT)} lines out and {len(D_IN)} in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's ({LASTS} last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j189-local/'
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
    sys.exit('J189 deck code: %s' % e)


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
print("J189 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet {F2B} HEAD -- cubes/library/; then
  git diff --no-color --no-ext-diff -U0 {F2B} HEAD -- tools/cubelab/deckcensus.ts > var/lab-j189-local/deckcensus.diff
  git show {F2B}:tools/cubelab/engine-unplayable.json > var/lab-j189-local/unplayable-j171.json
  git show {CC7}:tools/cubelab/engine-unplayable.json > var/lab-j189-local/unplayable-j176.json
  python3 -I var/lab-j189-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j189-local/deck-code.txt
echo "J189: deck code: J171's pin's plus exactly D490, D492, D494 and D506 -- the draw deals no Prepare card, no Ob Nixilis, the Adversary, no Old Man of the Sea and no Rubinia Soulsinger: $dc"
'''
span("# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506", 'test -z "${CUBELAB_WORKER_XMX:-}"', DECK_BLOCK)
# draws.py: J188's draws registered beside the others
put("""# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran) and J187's (J187_DRAWS, J187_VALIDATION, from lab-j187/report/draws.json's
# `asRun`, equal to its `recorded` and to lab-j187's draw as derive-j188.py recomputed it, read on 2026-11-04): none may come back here.""",
    """# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran), J187's (J187_DRAWS, J187_VALIDATION, from lab-j187/report/draws.json's
# `asRun`, equal to its `recorded` and to lab-j187's draw as derive-j188.py recomputed it, read on 2026-11-04) and J188's (J188_DRAWS,
# J188_VALIDATION, from lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw as derive-j189.py recomputed
# it, read on 2026-11-04): none may come back here.""")
m187 = re.search(r"J187_VALIDATION = '[0-9a-f]{64}'\n", t)
J187BLOCK_END = m187.group(0) if m187 else 'J187_VALIDATION = MISSING\n'
i = t.index("# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`")
j = t.index(J187BLOCK_END) + len(J187BLOCK_END)
J185187 = t[i:j]
pairs = ['%r, %r' % (J188_DRAWS[k], J188_DRAWS[k + 1]) if k + 1 < 13 else '%r' % J188_DRAWS[k] for k in range(0, 13, 2)]
J188BLOCK = ("# J188's 13 spine draws and its validation draw (lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw\n"
             "# as derive-j189.py recomputed it on 2026-11-04): none may come back here either\n"
             "J188_DRAWS = {" + (',\n              '.join(pairs)) + "}\n"
             "J188_VALIDATION = %r\n" % J188_VAL)
span(J185187[:60], J187BLOCK_END, J185187 + J188BLOCK)   # J185's, J186's and J187's blocks verbatim (kept through the comparison move), J188's after
t = t.replace(J187BLOCK_END, '', 1)
put('J183_DRAWS | J185_DRAWS | J186_DRAWS | J187_DRAWS)', 'J183_DRAWS | J185_DRAWS | J186_DRAWS | J187_DRAWS | J188_DRAWS)')
put('J183_VALIDATION, J185_VALIDATION, J186_VALIDATION, J187_VALIDATION)', 'J183_VALIDATION, J185_VALIDATION, J186_VALIDATION, J187_VALIDATION, J188_VALIDATION)')
# labels.py: its header, the expectation and the beside-column's population
span("# J188 (drafts/J188-atlas-4b-night-twelve.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J189 (drafts/J189-atlas-4b-night-thirteen.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J189 data. What changes: nothing in the rows. J189 is D508's population's FOURTH night (D509: the seat frozen since J186's
# pin e557dedf; D510 changed the record and D511 the replay, between landings, before J188's pin, which is this night's too; neither
# changed what the seat plays or offers), so its rows pool with J186's, J187's and J188's under the same pool names (D489, D508, D509,
# Comparability): --seat= defaults to "D508", as theirs (the self-test on J171's night still passes --seat=D486), the Report names the
# pools `random-<band>-d508`; and the sizing read's beside-column is J188's (--j188= LABELS_JSON: its c_sizingRead, per-worker-hour
# yield and futilityRead, THE SAME POPULATION's third night, as information and as the pooled futility read's third input; null when
# absent). J187's, the second, and J186's, the first (J186 was aborted before its Report), are registered in the job file. Every field,
# read and definition otherwise J177's, unchanged; the scan stamp `J189 v5`.
""")
put(r"""'expectation': 'as information, no verdict: J187 (THE SAME POPULATION: D508\'s second night, the same seat and design, other decks) below as its own report read it; J186 (its first night, aborted before its Report) by hand in the job file; J185 (D507),""",
    r"""'expectation': 'as information, no verdict: J188 (THE SAME POPULATION: D508\'s third night, the same seat and design, other decks) below as its own report read it; J187 (its second night) and J186 (its first, aborted before its Report) in the job file; J185 (D507),""")
put("'population': 'D508 (the same population, its second night): pooled with this night and J186 under the same pool names; its futilityRead is the pooled futility read\\'s second input, J186\\'s by-hand one the first (D508, D509, Comparability)'}",
    "'population': 'D508 (the same population, its third night): pooled with this night, J186 and J187 under the same pool names; its futilityRead is the pooled futility read\\'s third input, J186\\'s by-hand one and J187\\'s the first two (D508, D509, Comparability)'}")
# metrics.py's header
span("# J188's metrics (drafts/J188-atlas-4b-night-twelve.md)", "# J177's header, unchanged below:\n# J177's metrics", """# J189's metrics (drafts/J189-atlas-4b-night-thirteen.md): J177's metrics.py for a NEW data folder, lab-j189, where all 13 spines are
# J189's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J189 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J189's (deck seeds 2479-2491, game
# seeds 2579-2591, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population,
# J186's, J187's, J188's and this night's); (c) compare-j188.json for the `compare` key; (d) the scan stamp `J189 v5` and the defaults
# lab-j189, var/lab-j189-local.
""")
# compare.py: its header, its glob's comment and its note
span("# J188 (drafts/J188-atlas-4b-night-twelve.md): each spine's numbers beside J187's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     """# J189 (drafts/J189-atlas-4b-night-thirteen.md): each spine's numbers beside J188's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J189 data. DIFFERENT DECKS (J188: deck seeds 2466-2478, game seeds 2566-2578; J189: 2479-2491, 2579-2591; the same band at
# each position), THE SAME SEAT (D488's policy, D498's redeal, D500's damage history, D508's gate: frozen since J186's pin, D509; D510
# and D511 changed the record and the replay, not the seat, before J188's pin, which is J189's too) AND THE SAME BRANCHING DESIGN (150
# random branches, the futility stop, 10 decisions): J188 and J189 are D508's population's third and fourth nights. A difference is a
# candidate, never a verdict, and no position is a pair (the decks differ everywhere). J177's compare.py, unchanged but for its note:
# `this` is J189, `before` J188, read from lab-j188 at the Report (read only), its report/labels.json written by J188's own Report.
""")
put("# J188's folders end in 2566-2578, J187's in 2553-2565: one glob reads both", "# J189's folders end in 2579-2591, J188's in 2566-2578: one glob reads both")
span("out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J187 (D508", "\n       'bySpine': {s: {'before': before.get(s)",
     r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J188 (D508\'s population, its third night; deck seeds 2466-2478, 150 branches, the futility stop, 10 decisions) beside J189 (D508\'s population, its fourth night, the seat frozen since J186\'s pin, D509, on J188\'s pin; deck seeds 2479-2491, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is the seat\'s: the decks differ at every position and the seat does not',""")
# the pilot's read of the comparison night
put("""# J187's night, read only, as information (ended 2026-11-04 at 02:15, its Report written: `report` reads 1 and `atlases` 13): what
# compare.py and labels.py's c_sizingRead will read at the Report (THE SAME POPULATION, D508's second night; J186's, the first, is by hand
# in the job file)
""", """# J188's night, read only, as information (ended 2026-11-04 at 10:45, its Report written: `report` reads 1 and `atlases` 13): what
# compare.py and labels.py's c_sizingRead will read at the Report (THE SAME POPULATION, D508's third night; J187's, the second, and J186's,
# the first, are registered in the job file)
""")
# the Report block
put("""# J187's night, read only, for the J187 columns (compare.py) and J187's sizing read (labels.py --j187): THE SAME POPULATION (D508's
# second night), read beside and pooled by hand with J186's (its first, whose by-hand numbers are registered in the job file); absent
# files read as null""",
    """# J188's night, read only, for the J188 columns (compare.py) and J188's sizing read (labels.py --j188): THE SAME POPULATION (D508's
# third night), read beside and pooled by hand with J187's and J186's (its second and first, whose numbers are registered in the job
# file); absent files read as null""")
put("'the 4b night-twelve validation draw, made by the J188 pilot into lab-j188 at deck seeds 2666-2678",
    "'the 4b night-thirteen validation draw, made by the J189 pilot into lab-j189 at deck seeds 2679-2691")
put("by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509; D510s record and D511s replay landed between landings), on new decks (deck seeds 2466-2478, game seeds 2566-2578), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its third night, pooled with J186 (its first, twelve spines) and J187 (its second, thirteen); never with",
    "by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509; D510s record and D511s replay landed between landings, before J188s pin, which is this nights), on new decks (deck seeds 2479-2491, game seeds 2579-2591), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its fourth night, pooled with J186 (its first, twelve spines), J187 (its second, thirteen) and J188 (its third, thirteen); never with")
# the abort paragraph
put("""and **`replay_diverged`**, the units.jsonl lines naming a divergence, is information **expected 0** (J186: 31; J187: 0 -- but J187's s03
met the same divergence without a listing change, 975 forks not the position, which `atlas.problems` caught). **`atlas_hook_ioobe`**
counts the seat queue's row 7 (information; J187: 58, all s04's, each an errored branch; queued, so it may recur at that scale).""",
    f"""and **`replay_diverged`**, the units.jsonl lines naming a divergence, is information **expected 0** (J186: 31; J187: 0 -- but J187's s03
met the same divergence without a listing change, 975 forks not the position, which `atlas.problems` caught; J188, with D511: 0, and
every one of its {FORKS:,} forks the position). **`atlas_hook_ioobe`** counts the seat queue's row 7 (information; J187: 58, all s04's;
J188: {N['hook']}, all s11's; each an errored branch; queued, so it may recur at either scale).""")
put("""D487, D488, D495, D496, D501-D505 and D512 amended. **J187 failed it on 2 problems**: s03's 975 forks that were not the position
(D511's replay divergence; D511 in this pin) and s06's 2 logs whose hideaway host, owned by the viewer, was reanimated by the opponent
and taken back (a checker shape; D512 in this pin admits it). J186 never reached it but would have failed it on 1, s11's all-hidden
target record (D510 in this pin writes it `option:hidden`, listed and answered, which the checker admits). **None of the three may
recur**:""",
    f"""D487, D488, D495, D496, D501-D505 and D512 amended. **J188 passed it** on this pin: 0 problems, {FRAMELOGS:,} frame logs through the
checker and 0 failed, every fork the position. J187 failed it on 2 problems: s03's 975 forks that were not the position (D511's replay
divergence; D511 in this pin) and s06's 2 logs whose hideaway host, owned by the viewer, was reanimated by the opponent and taken back (a
checker shape; D512 in this pin admits it). J186 never reached it but would have failed it on 1, s11's all-hidden target record (D510 in
this pin writes it `option:hidden`, listed and answered, which the checker admits). **None of the three may recur**:""")
put("""J187 failed both on
s06 d21 option 3 (`cast:31`, Lively Dirge, `K:Spree`: the seat's gate judges the base cost and offers the cast, Forge's AI chooses modes
it cannot pay; refused 680 and lost 340 times in the option's rows) -- the seat queue's row 6, queued under D509 because the fix changes
what the seat offers.""",
    """J187 failed both on
s06 d21 option 3 (`cast:31`, Lively Dirge, `K:Spree`: the seat's gate judges the base cost and offers the cast, Forge's AI chooses modes
it cannot pay; refused 680 and lost 340 times in the option's rows) -- the seat queue's row 6, queued under D509 because the fix changes
what the seat offers; J188's s02 dealt Lively Dirge again (227 casts refused, 37 lost across its rows), under every option's bar, and
both checks passed.""")
put("""s12, 11 of J186's s11 and 60 of J187's s04, counted here as `pump_effect_ioobe`; J187's other 58 errored branches, all s04's, threw from
`FCollection.get` in Forge's `PlayEffect.java:90` inside our `Atlas$Hook.decision` -- the seat queue's row 7, queued, counted here as
`atlas_hook_ioobe` -- and its other exception lines were s03's and s07's one `TimeoutException` each from Forge's own AI eval thread
(D465's shape; J186's s01 had 113), caught by the engine and no branch error (J186's s11 also had 176 Forge AI `NullPointerException`s,
J187 none); a `StackOverflowError` in a branch row is counted here as `stack_overflows`)""",
    f"""s12, 11 of J186's s11, 60 of J187's s04 and {N['pump']} of J188's s07, counted here as `pump_effect_ioobe`; J187's other 58 errored branches, all
s04's, and J188's other {N['hook']}, all s11's, threw from `FCollection.get` in Forge's `PlayEffect.java:90` inside our `Atlas$Hook.decision` --
the seat queue's row 7, queued, counted here as `atlas_hook_ioobe` -- and their other exception lines were `TimeoutException`s from
Forge's own AI eval thread (D465's shape; J186's s01 had 113, J187's s03 and s07 one each, J188's {TEXS}), caught by the engine and no
branch error (J186's s11 also had 176 Forge AI `NullPointerException`s, J187 and J188 none); a `StackOverflowError` in a branch row is
counted here as `stack_overflows`)""")
# the summary
span('- **The population, first line:**', '- **The run:**', """- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's,
  D494's and D506's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck
  seeds 2479-2491, game seeds 2579-2591) branched by J189 at the pin, J188's, by D488's random seat policy forking on D498's determinizer
  behind D508's gate, the seat frozen since J186's pin (D509; D510's record and D511's replay landed between landings, before J188's
  pin), the FOURTH night of D508's population**: `training: true`, `pool: random-<band>-d508`, `randomSeat: "D508"`, contract v6 with
  `branchRandom: 150` and the partial rows marked; **pooled with J186's twelve finished spines, J187's thirteen and J188's thirteen**
  (the same pool names; what the seat plays and offers unchanged since J186's pin) **and with nothing else: not J185's rows (D507's
  population: the gate before D508), not J183's and J182's (D498's), not J181's (D497's), not J177's and J180's (D493's), not J173's nor
  anything older** (D489, D509); the units whose logs failed the checker on a hidden-information fault, and J187's s03 decisions whose
  forks were not the position, are named, so a reader pooling leaves their rows out (D509 point 4).
""")
span('- **The run:**', '- **The yield, the number to read**', f"""- **The run:** exits, walls per spine and for the night (against J188's thirteen, {N['wall']:,} s, J187's thirteen, {N7['wall']:,} s, J186's twelve,
  36,121 s, and the ~7-9 h at 6 workers *Sizing* now expects), rows, timeouts, unit errors, engine errors (with any errored row's stack
  from the worker logs), capped, D479's and D477's counters, disk. **Whether J187's two problems stayed closed** (D511 and D512 in this
  pin; J188: both closed): no fork that was not the position (J187's s03: 975, the replay divergence; J188: 0 of {FORKS:,}), and
  **`replay_diverged`**, the units.jsonl lines naming a replay divergence (expected 0; J186: 31, J187: 0, J188: 0), per spine with the
  decision where any; no checker failure on a hideaway host owned by the viewer, reanimated by the opponent and taken back (J187's s06: 2
  logs; J188: no frame log failed). **Whether J186's all-hidden target record stayed closed** (D510 in this pin): no checker failure on a
  target record with no option and a hidden candidate, and the records that now carry `option:hidden` on the target path counted where the
  scan or the logs show them, as information. **The seat queue's two open rows that can recur tonight** (D509; neither fixed): any
  refused or lost cast option on a Spree or other mode-cost spell (row 6; J187's s06 d21, Lively Dirge; J188's s02 dealt it under the
  bar, 227 refused and 37 lost), named with its card and counts -- a queued seat fault, not a night fault, if `refusedCastOptions` or
  `lostCastOptions` fails on it -- and **`atlas_hook_ioobe`**, the `PlayEffect.java:90` errored branches under our hook (row 7; J187: 58,
  all s04's; J188: {N['hook']}, all s11's), per spine with the card where traced. **Whether J185's fault stayed closed**: no branch log failed the
  checker on a record naming a last-known copy of a card in the other hand, and **`lki_candidates`**, the worker logs' `[lki]` lines (D508;
  J186, J187 and J188: 0), per spine -- information, the places D508's gate changed a list. **Whether J183's three faults stayed
  closed**: no branch log failed the checker on an opponent's hideaway card whose look was kept while the card stayed in exile, or whose
  dig came frames after its host entered (D505; the D502 stats-line count per spine, as information); no target record named a card in
  the Stack zone with no stack instance, and **`ghost_candidates`**, the worker logs' `[ghost]` lines (D507; J186: 12, s11's card 63;
  J187: 7, s01's cards 55 and 46; J188: {N['ghost']}), per spine; no deck held Old Man of the Sea or Rubinia Soulsinger, **`stack_overflows`**, the
  branch rows naming a `StackOverflowError` (J183: 70, all s11's; J185, J186, J187 and J188: 0), per spine, and no unit hung (D506).
  **Whether J182's three checker shapes and J181's three gaps stayed closed**: no branch log failed the checker on an opponent's hideaway
  card after its host's control was taken, on another seat's ceased token or on an opponent's cast between frames (D502-D504; their three
  stats-line counts per spine, as information), no A6 failure on a card the seat may look at (D498), no id problem from a killed
  attempt's rows and `abandonedPlays` said when a unit was re-run (D499; J183: one, s11's; J185: none), no `getDamageLKI` and no
  `paperCard` in any errored branch's stack, `damageLkiLost` 0, and no bare exception in any worker log (D500, D497), no checker failure
  on a cascade's "cast it?" inside a held frame (D496), no Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the
  copy's` error on a Plotted or Foretold cast, no checker failure on a spell copy on the stack (and every spell copy still listed under
  D507's and D508's gate). **J182's engine stack, counted**: `pump_effect_ioobe`, the lines `at
  forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker logs (Forge's `IndexOutOfBoundsException`,
  `FCollection.get` on an empty list; J182: 1, in s11's d10; J183: 0; J185: 5, all s12's; J186: 11, all s11's; J187: 60, all s04's;
  J188: {N['pump']}, s07's), per spine, each with its branch and its exception line -- information, an engine fault and never a verdict on a card;
  and Forge's own AI-eval `TimeoutException`s and AI `NullPointerException`s per spine (J186: s01 113, s04 2, s11 176 NPEs; J187: s03 1,
  s07 1, no NPE; J188: {TEXS}, no NPE), as information.
""")
put("""beside it **J187's** (0.541 a worker-hour [0.359, 0.781], 37.8 a 7-worker night [25.2, 54.7], on 51.8
  worker-hours over thirteen spines: this population's second night, `c_sizingRead.j187`), **J186's** (0.349 [0.216, 0.533], 24.4
  [15.1, 37.3], on 60.2 worker-hours over twelve: its first, from this file's by-hand numbers) and **the three nights pooled**
  (confident labels over worker-hours, by hand; J186 and J187 together 49 on 112.0, 0.438 [0.324, 0.578], 30.6 a 7-worker
  night [22.7, 40.5]), then""",
    f"""beside it **J188's** ({N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}], {N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}], on {N['wh']}
  worker-hours over thirteen spines: this population's third night, `c_sizingRead.j188`), **J187's** ({N7['cpwh']} [{N7['cpwh95'][0]}, {N7['cpwh95'][1]}], {N7['c7']}
  [{N7['p95'][0]}, {N7['p95'][1]}], on {N7['wh']} worker-hours over thirteen: its second, from this file's numbers), **J186's** ({N6['cpwh']} [{N6['cpwh95'][0]}, {N6['cpwh95'][1]}],
  {N6['c7']} [{N6['p95'][0]}, {N6['p95'][1]}], on {N6['wh']} worker-hours over twelve: its first, from this file's by-hand numbers) and **the four nights pooled**
  (confident labels over worker-hours, by hand; J186, J187 and J188 together {POOL['confident']} on {POOL['wh']}, {POOL['cpwh']} [{POOL['cpwh95'][0]}, {POOL['cpwh95'][1]}], {POOL['c7']} a
  7-worker night [{POOL['p95'][0]}, {POOL['p95'][1]}]), then""")
put("""**Say that this
  is the third night of D508's population's pooled read** (`pooledInputs`): add J186's 0 of 13 controls confident (34
  stopped, 115 read; this file's by-hand numbers) and J187's 0 of 10 (47 stopped, 130 read;
  `c_sizingRead.j187.futilityRead`) to this night's and give the pooled share with its exact 95% interval beside this night's own (the
  two before tonight: 0 of 23, [0, 0.148]); that J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's
  0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and whether the pooled ~30-40 controls can
  yet tell .04 from .2.""",
    f"""**Say that this
  is the fourth night of D508's population's pooled read** (`pooledInputs`): add J186's {f6['controlsConfident']} of {f6['controls']} controls confident ({f6['stopped']}
  stopped, {f6['read']} read; this file's by-hand numbers), J187's {f7['controlsConfident']} of {f7['controls']} ({f7['stopped']} stopped, {f7['read']} read; this file's numbers) and
  J188's {fr['controlsConfident']} of {fr['controls']} ({fr['stopped']} stopped, {fr['read']} read; `c_sizingRead.j188.futilityRead`) to this night's and give the pooled share
  with its exact 95% interval beside this night's own (the three before tonight: {POOL['ctlConf']} of {POOL['controls']}, [0, {POOL['ctlHi']}]); that J185's 0 of 13 (D507's),
  J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added
  in; and whether the pooled ~40-50 controls can yet tell .04 from .2.""")
put("and J187's (the same population's), J185's, J183's,", "and J188's and J187's (the same population's), J185's, J183's,")
put("against J187's 12.5, J186's 12.8 (twelve spines), J185's 14.4,", f"against J188's {N['perSpine']}, J187's {N7['perSpine']}, J186's 12.8 (twelve spines), J185's 14.4,")
put("and for the night beside J187's (0.33%, s06's Lively Dirge among it), J185's (0.16%)",
    f"and for the night beside J188's ({REFSHARE}%, s02's Lively Dirge among it), J187's (0.33%, s06's Lively Dirge among it), J185's (0.16%)")
# the header's rule line: the population's nights
put("the population J186 opened, J187 and J188 continue)", "the population J186 opened, J187, J188 and J189 continue)")

# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
hist = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'J188', t)
        if not re.match(r'J188(:| v5| deck| draws| scan| pilot|-atlas)', t[m.start():m.start() + 12]) and 'homes-J188' not in t[m.start() - 6:m.start() + 4]]
print('J188 mentions before the job-name move, outside echo/print prefixes (each must be this job\'s own):', len(hist))
for ctx in hist:
    print('   ', ctx)
t = t.replace('J188', 'J189').replace('j188', 'j189')
t = t.replace('drafts/J189-atlas-4b-night-twelve.md', 'drafts/J189-atlas-4b-night-thirteen.md')
left = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'[Jj]187', t)]
print('J187 left before the comparison move (each becomes J188):', len(left))
for ctx in left:
    print('   ', ctx)
t = t.replace('J187', 'J188').replace('j187', 'j188')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, +13
# ======================================================================================================================================
RANGES = [(2466, 2478), (2566, 2578), (2666, 2678), (2766, 2778)]
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
RESTORED = []      # (wrong, right, why): filled from the audit below -- none (J168's wall 2772 sits in the stashed seeds paragraph only)
for wrong, right, why in RESTORED:
    if t.count(wrong) != 1:
        FAIL.append('restore %r: found %d' % (wrong, t.count(wrong)))
    t = t.replace(wrong, right)
if any(v == 2772 and 'wallSec' in ctx for v, _, ctx in AUDIT):
    FAIL.append("J168's wall 'wallSec': 2772 was shifted")

# ======================================================================================================================================
# 4. the decks table: J188's column (after the shift, so its seeds stay J188's)
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
RS = ('none fell in the shifted ranges but the seeds themselves, and one registered number that does lies in them -- J168\'s s05 wall,'
      ' `\'wallSec\': 2772`, in the reserved game seeds [2766, 2778] -- is named only in this paragraph, written by hand, never shifted'
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


PUBLIC_TITLE = 'Move atlas 4b night thirteen: 13 new spines, D508 population night four'
setline('id: ', 'J189')
setline('title: ', f"The move atlas, rung 4b, night thirteen -- J188's night carried onto the same seat and the same pin (D509: the atlas seat frozen between landings; the pin {P8} is J188's, nothing merged since, so D510's target record (`option:hidden`: record-only), D511's replay (a sink that writes nothing: CubeLab.java only) and D512's checker admission are J188's, and `seat_code` admits exactly D510's and D511's numstat since J186's pin, J188's line byte for byte) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j189, at deck seeds 2479-2491 (D447 with D482's list as D490, D492, D494 and D506 leave it, the bands cycled as J166's) and game seeds 2579-2591; a validation draw made fresh at deck seeds 2679-2691 (game seeds 2779-2791 reserved); THE FOURTH NIGHT OF D508'S POPULATION, pooled with J186's twelve finished spines, J187's thirteen and J188's thirteen; J188's night read beside, by position")
setline('public_title: ', PUBLIC_TITLE)
setline('public_est: ', '~8 h to 13 h')
setline('public_decides: ', 'None by itself; fourth night of the D508 population, pooled with J186-J188')
setline('repos: ', "mtg-table@%s (origin/main: J188's pin, unchanged -- the merges of D510, D511 and D512 on 43043fe5 (J187's pin, D509's merge), pushed, and nothing merged since J188 was posted; written by derive-j189.py from its argument; merged == 1, the commits that added D481-D512's decision files, D493's, D495's to D508's and D510's to D512's names, the seat's code exactly as this file states it -- J188's line byte for byte: J187's lists plus D510's four files, and the frozen set since J186's pin e557dedf exactly D510's and D511's numstat -- and the deck code (J188's), every pin-decided value computed from the pin, checked by the pilot)" % PIN)
setline('decides: ', f"nothing by itself. Rung 4b's thirteenth night, the eleventh on D489's futility stop with the review's 150 cap, and **the FOURTH of D508's population**. **What changed under the seat since J188:** nothing -- the pin is J188's ({P8}; nothing has merged into mtg-table since J188 was posted), so what the seat plays and offers, its record, the replay and the checker are J188's. **D509** (2026-11-03) freezes the atlas seat between landings; between J187's pin 43043fe5 and this pin two lanes changed its frozen set with their written arguments, and `seat_code` admits exactly their numstat since J186's pin e557dedf ({NUMS}) and nothing else: **D510** (record-only, D509 point 2: a target the seat cannot see is written `option:hidden`, listed and answered, `hidden` counting it exactly, protocol M81; `Decisions.targetAnswer`, `targets0` and `among` are reached only after Forge or the explorer has answered, into the sink, and no gate, candidate list or listing changes) and **D511** (`tools/cubelab/CubeLab.java` between landings, D509 point 1: an atlas unit's replay records into a sink that writes nothing, so it plays the recorded baseline's game; its `atlas.ts` change is the atlas-selftest's replay leg); **D512** admits J187's s06 hideaway shape in the redaction checker. J188 ran on this pin with every final check passed, 0 forks not the position, `replay_diverged` 0 and 0 checker failures. So the random seat's POLICY is D488's, the recorder D496's (with D510's target record), the copier's paper-card carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's (D507's Stack rule kept over the card the game holds), all as J186's, J187's and J188's; `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (`identity == 1` stays the real check). The seat queue (D509) holds rows 1-7 and none is fixed tonight; two can recur: a Spree or mode-cost spell's refused and lost cast option (row 6, J187's s06 d21 Lively Dirge; J188's s02 dealt it again under the bar) and the errored branches from `PlayEffect.java:90` under our hook (row 7, J187's s04: 58; J188's s11: {N['hook']}). **Comparability, the rule this night follows:** D489 pools nights on one seat and opens a population on \"A future change to the seat or to what it offers\"; D509 keeps the seat unchanged between landings and lands a queue as one population boundary. So **J189's labels and reads are D508's population's fourth night: pooled with J186's twelve finished spines, J187's thirteen and J188's thirteen -- the same `pool`, `random-<band>-d508`, the same `randomSeat: \"D508\"`; never with J185's v6 rows (D507's population), J183's and J182's (D498's), J181's (D497's), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the units whose logs failed the checker on a hidden-information fault (J186's s11 d13-d16, and tonight's if any) and J187's s03 decisions whose forks were not the position are named so that a reader pooling leaves their rows out (D509 point 4); the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- this night's counts the fourth input to this population's pooled read, J186's {f6['controlsConfident']} of {f6['controls']}, J187's {f7['controlsConfident']} of {f7['controls']} and J188's {fr['controlsConfident']} of {fr['controls']} the first three, with J185's 0 of 13, J183's 0 of 11, J182's 0 of 6, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside as other populations, and the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J188's {N['cpwh']}, J187's {N7['cpwh']}, J186's {N6['cpwh']} and the four nights pooled, and, as other populations, J185's 0.376, J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J188's at the same position (other decks, the same population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D510-D512 (no checker failure of J186's all-hidden target record or of J187's s06 hideaway shape; no fork that is not the position, and `replay_diverged`, the units.jsonl lines naming a replay divergence, expected 0 -- J188: none, 0 and 0), of the seat queue's rows 6 and 7 (any mode-cost cast option refused or lost, named; `atlas_hook_ioobe`, the `PlayEffect.java:90` errored branches, per spine), of D508 (no checker failure of J185's shape; `lki_candidates`, the worker logs' `[lki]` lines, per spine), of D505-D507 as on J186-J188 (no checker failure of J183's hideaway shape, its D502 stats-line count per spine; `ghost_candidates`, the worker logs' `[ghost]` lines, per spine; `stack_overflows`, the branch rows naming a `StackOverflowError`, and no hung unit), of D502-D504 and D497-D500 as on J183 (no checker failure of J182's three shapes; no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`; J183: 0; J185: 5; J186: 11; J187: 60; J188: {N['pump']})")
setline('hypothesis: ', f"none to confirm about the maps. Registered expectations, as information: **J187's two problems and J186's all-hidden record stay away, as on J188** -- with D511 in the pin a unit's replay is the recorded baseline's game, so no fork is not the position (J187's s03: 975; J188: 0 of {FORKS:,}) and `replay_diverged` is 0 (information; J186: 31, J187: 0, J188: 0); with D512 the checker admits a hideaway host owned by the viewer, reanimated by the opponent and taken back (J187's s06: 2 logs); with D510 a target the seat cannot see is `option:hidden`, never `options: []` with `chosen: null` (J186's s11: 12 logs) -- so `atlas.problems == 0` is expected (J188: 0, {FRAMELOGS:,} frame logs, 0 failed), though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as it failed J187's on 2, J186's would have on 1 had it not been aborted first, J185's on 1, J183's on 3 across three faults, J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); **the seat queue's rows 6 and 7 are open and may recur** -- a Spree or other mode-cost spell whose base cost the seat's gate judges payable can have its forced cast refused and lost in most of its rows (J187's s06 d21 option 3, Lively Dirge: refused 680, lost 340; J188's s02 dealt it again and stayed under the bar, 227 refused and 37 lost across the spine), so `refusedCastOptions == 0` and `lostCastOptions == 0` (J173's checks, kept) may fail on it, which is a queued seat fault and not a night fault: the option is recorded and the night's data stands (D509); and an errored branch can throw from `FCollection.get` in Forge's `PlayEffect.java:90` inside our hook (`atlas_hook_ioobe`, information; J187: 58, all s04's; J188: {N['hook']}, all s11's); **the shapes D505-D508 closed stay away** -- no entity or target record names a last-known copy of a card in the other hand (D508: the record counts it in `hidden` and the worker log prints `[lki]`; `lki_candidates` counts those lines, information; J186, J187 and J188: 0), while a copy of a card now in a public zone or the seat's own hand is still listed; an opponent's hideaway card whose look is kept while it stays in exile, after its host's control went back or the host left the battlefield, or whose dig came frames after its host entered, passes A9 (D505), counted on D502's stats line; no target record names a card in the Stack zone with no stack instance (D507; `ghost_candidates`, information; J186: 12, J187: 7, J188: {N['ghost']}, each a candidate left out); no deck holds a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger (D492, D494, D506; `deck_code`), so no branch row names a `StackOverflowError` (`stack_overflows`, information; J183: 70, J185, J186, J187 and J188: 0) and no unit hangs on that recursion; an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log (`pump_effect_ioobe` stays counted: J182 1, J183 0, J185 5, J186 11, J187 60, J188 {N['pump']}); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes, and stays listed under D507's and D508's gate (D495, D507, D508); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J188: {N['read']} read, {N['stopped']} stopped, {N['controls']} controls, 0 partial rows confident; J187: 130, 47, 10, 0; J186: 115, 34, 13, 0, on twelve spines; J185: 122, 34, 13, 0); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J188's (read beside, not predicted; J188's refused share {REFSHARE}%, J187's 0.33%, J185's 0.16%, J183's 0.60%, J182's 0.92%; J186's never computed); J188's yield, {N['confident']} confident of {N['labels']} labels over thirteen spines, {N['cpwh']} confident labels a worker-hour on {N['wh']} worker-hours, J187's, {l7['confident']} of {l7['labels']}, {N7['cpwh']} on {N7['wh']}, and J186's, {l6['confident']} of {l6['labels']} over twelve, {N6['cpwh']} on {N6['wh']} -- {POOL['cpwh']} pooled -- are this population's first three nights', read beside and pooled by hand, never predicted; J185's 20 of 88, 0.376 on 53.2 worker-hours, and J183's 0.483 are other populations'; the walls ~7-9 h at 6 workers for all 13 at J188's and J187's pace ({N['wall']:,} s and {N7['wall']:,} s of walls for thirteen; J188's {N['smax']} {N['maxmin']} min the longest; *Sizing*)")
setline('est: ', f"~9 h at 6 workers (range 7-13 h; sizing below): pilot ~10-40 min (J188's ran {PILOT_MIN} min from its start to its first spine; J173's ~35 with the readers' self-tests); the 13 spines ~7-9 h at J188's and J187's pace (13 x ~{AVG_MIN} min; J188's thirteen ran {N['minmin']} to {N['maxmin']} min, J187's {N7['minmin']} to {N7['maxmin']}); the scan ~6 min; the report ~5 min. Disk ~10-15 GB on the lab data folder /home/justin-a/code/lab/data (J188's thirteen spines: {N['gb']} GB)")
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
print('\nleft-over night words (night-twelve / night twelve / twelfth / THIRD night / third night / three nights / J188 v5):')
for m in re.finditer(r'night-twelve|night twelve|twelfth|THIRD night|THIRD contribution|[Tt]hird night of|three nights|J188 v5|J188 \(drafts', t):
    print('   ', t[max(0, m.start() - 70):m.end() + 40].replace('\n', ' '))
print('\nlab-j186 / lab-j187 / lab-j188 / lab-j189 mentions:', {x: t.count(x) for x in ('lab-j186', 'lab-j187', 'lab-j188', 'lab-j189')})
print('pin %s mentions: %d; 43043fe5: %d; e557dedf: %d; 0a6cf5c1: %d; 3275af30: %d; ac07876b: %d; derive-j186: %d; derive-j187: %d; derive-j188: %d; derive-j189: %d'
      % (P8, t.count(P8), t.count('43043fe5'), t.count('e557dedf'), t.count('0a6cf5c1'), t.count('3275af30'), t.count('ac07876b'), t.count('derive-j186'),
         t.count('derive-j187'), t.count('derive-j188'), t.count('derive-j189')))
print('J188 lines (comparison):', sum(1 for x in t.split('\n') if 'J188' in x), '  j188:', t.count('j188'), '  J187 lines (history):', sum(1 for x in t.split('\n') if 'J187' in x),
      '  j187:', t.count('j187'), '  J186 lines:', sum(1 for x in t.split('\n') if 'J186' in x))
print('\nCOMPUTED FROM THE PIN %s (%s):' % (PIN, PIN_SUBJ[:100]))
print('  J188\'s registered pin %s; main %s' % (J188PIN, MAIN))
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
print('  J188\'s registered deck values:', {k: (v[:12] if v else v) for k, v in J188_DECK.items()})
for d in SPEC:
    print('  has_%s at the pin: %s' % (d.lower(), 'all names present' if not HAS[d] else 'MISSING ' + '; '.join(HAS[d])))
print('  D512\'s controls (viewer-own hideaway fixtures new or re-verdicted since 43043fe5):', D512FIX)
for x in SOFT:
    print('  SOFT (reported, not failed): ' + x)
for d in DEC:
    print('  %s: %s added by %s' % (d, DEC[d][0] or 'no file', DEC[d][1][:8] or 'no commit'))
print('  pin on origin/main:', PUSHED)
print('\nJ188 READ (lab-j188 and results/J188, read only):', N, 'pilot min', PILOT_MIN)
print('  per spine walls (min):', mins)
print('  frame logs %d (0 failed), forks %d (0 not the position), warnings %s, pressure %s' % (FRAMELOGS, FORKS, WARN, PRESSURE))
print('  pump:', {s: v for s, v in PUMP.items() if v}, '| PlayEffect.java:90:', {s: v for s, v in HOOK.items() if v}, HOOKSITES, '| branch errors:',
      {s: v for s, v in BES.items() if v}, '| TimeoutException:', {s: v for s, v in TEX.items() if v})
print('  Lively Dirge (s02): refused', TOOL['refusedCastCards']['Lively Dirge'], 'lost', TOOL['lostCastCards']['Lively Dirge'], '| refusedCastShare %', REFSHARE)
print('  J187 (its report):', N7, '| J186 (by hand):', N6)
print('  pooled J186+J187 (J188\'s registered):', POOL2)
print('  pooled J186+J187+J188:', POOL)
print('J188 draws registered: %d spine draws (%s ...), validation %s' % (len(J188_DRAWS), ', '.join(x[:12] for x in J188_DRAWS[:3]), J188_VAL[:12]))
print('seed grep (%s at pc-jobs %s + drafts): %d hit(s), %d of them 0.2784, unexpected: %s; data folders: %s' % (PAT, PCJ, len(hits), NOTSEED_N, odd or 'none', DATA_HIT or 'none'))

# ======================================================================================================================================
# 8. the pilot's own lines: equal to J188's (but folder and stamp), then run against the pin: has_*, seat_code, commits, golden, deck_code
# ======================================================================================================================================
A0, A1 = "# D466-D486: J171's greps, unchanged", 'test -z "${CUBELAB_WORKER_XMX:-}"'
blk = t[t.index(A0):t.index(A1)]
blk_src = SRC_T[SRC_T.index(A0):SRC_T.index(A1)]


def code(s):
    return [x for x in s.split('\n') if not x.lstrip().startswith('#')]


back = code(blk.replace('lab-j189', 'lab-j188').replace('J189', 'J188'))
diffl = [x for x in back if x not in code(blk_src)] + [x for x in code(blk_src) if x not in back]
expect('every shell and Python line of the pilot\'s pin-decided block (has_*, seat_code, the commits, the golden, deck_code) is J188\'s, byte for byte, '
       'but its folder and stamp (%d lines; %d differ)' % (len(back), len(diffl)), back == code(blk_src))
TREE = SCRJ + '/tree'
shutil.rmtree(TREE, ignore_errors=True)
os.makedirs(TREE + '/var/lab-j189-local/bin')
subprocess.run('git -C %s archive %s -- bridge/src tools docs fixtures/negative fixtures/cubelab web/test cubes/library | tar -x -C %s' % (REPO, PIN, TREE),
               shell=True, check=True)
run = re.sub(r'\bgit ', 'git -C %s ' % REPO, blk).replace('HEAD', PIN)
open(SCRJ + '/pilot-lines.sh', 'w').write('set -u\n' + run)
pr = subprocess.run(['bash', SCRJ + '/pilot-lines.sh'], cwd=TREE, capture_output=True, text=True)
open(SCRJ + '/pilot-lines.out', 'w').write(pr.stdout + pr.stderr)
V = TREE + '/var/lab-j189-local/'
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
    if x.startswith(('J189: seat code', 'J189: deck code', 'J189 deck code', 'J189: seat-identity', 'J189: D51')):
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

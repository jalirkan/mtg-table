#!/usr/bin/env python3
"""Derive J187's job file from J186's, by derive-j183.py's three-trap rule (derive-j186.py's shape):
(1) rename only the job's own name (J186 -> J187), then move the comparison night (J185 -> J186) on what is left;
(2) shift the four seed ranges inclusive of their bases, [2439, 2452] and its three companions, +13, skipping any number touching a
letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints every change);
(3) change registered strings only on purpose, each one named here.
J187 is D508's population's SECOND night (`random-<band>-d508`, `randomSeat: "D508"`, unchanged): D509 (the atlas seat frozen between
landings) merged on J186's pin e557dedf as docs only, so `bridge/src` and the rest of D509's frozen set are byte-identical at the pin,
and J187's labels pool with J186's twelve finished spines. J186 was ABORTED by its own `unit_errors > 20` before its scan and its Report:
`lab-j186/report/` does not exist, so the night's compare.py and labels.py read J186's report as absent (null), and J186's numbers are
registered here from the coordinator's by-hand report (labels.py, draws.py, compare.py from the runner clone's own bin, into the
scratchpad) and from labels.py run again with `--times` for the rate.
EVERYTHING THE PIN DECIDES IS COMPUTED FROM THE PIN WITH GIT, never typed: the `seat_code` lists, the `deck_code` values and whether
D505-D508's names are there -- and each is checked EQUAL to J186's registered value (D509: the seat is frozen, so they must pass
unchanged), plus D509's frozen-set test against J186's pin and D509's commit. The derivation says so loudly when a pin does not meet it
-- it never bends a test to pass. Every hand edit is STASHED before the rename and the shift (a placeholder holds its final text).

  python3 derive-j187.py <pin>     writes drafts/J187-atlas-4b-night-eleven.md, prints the audit, runs the runner's check
Exit 0: written, every expectation of the final pin met, the checker clean. Exit 3: written, but the pin misses an expectation: NOT
POSTABLE. Exit 1: nothing written (a stash or a computation failed). Exit 2: written, the checker not clean."""
import fnmatch, glob, hashlib, json, math, os, re, subprocess, sys
from collections import Counter
from datetime import datetime

REPO = '/home/justin-a/code/mtg-table'
SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J186-atlas-4b-night-ten.md'
DST = '/home/justin-a/code/pc-results/drafts/J187-atlas-4b-night-eleven.md'
RUNNER = '/home/justin-a/code/mtg-table/tools/runner.sh'      # the main checkout's (the brief: never run anything under ~/code/lab)
L186 = '/home/justin-a/code/lab/data/lab-j186'                # read only
L185 = '/home/justin-a/code/lab/data/lab-j185'                # read only
CLONE186 = '/home/justin-a/code/lab/mtg-table/var/lab-j186-local'   # read only: J186's pilot record of its draws
SCR = '/tmp/claude-1000/-home-justin-a-code-mtg-table/8723af12-0157-421e-988a-473182e5a3f1/scratchpad'
BYHAND = SCR + '/j186/report'                                 # the coordinator's by-hand report of J186
TIMES = SCR + '/j187/times/labels.json'                       # labels.py run again with --times (the rate), if present
PREV = 'e557dedfa7cf67803ba0ba362655a2120ea8f83a'   # J186's pin: D508's merge, the population's opening pin (D509's frozen-set base)
PREV2 = '0a6cf5c1ec05f03ca27d34af1b529a5e72646cea'  # J185's pin (the merge of D505-D507)
PREV3 = '3275af30498e91c03d652d021685d9847b62d95f'  # J183's pin (the merge of D502-D504)
J182PIN = 'ac07876b97e052b3e0ddd530a1930173e998133c'
FROZEN = 'bridge/src tools/cubelab/CubeLab.java fixtures/cubelab/seat-identity.json forge-home/'   # D509 point 1, by path


def git(*a, ok=False):
    r = subprocess.run(['git', '-C', REPO] + list(a), capture_output=True, text=True)
    if r.returncode and not ok:
        sys.exit('git %s: %s' % (' '.join(a), r.stderr.strip()))
    return r.stdout if not ok else (r.returncode, r.stdout)


if len(sys.argv) < 2 or not re.fullmatch(r'[0-9a-f]{7,40}', sys.argv[1]):
    sys.exit('usage: derive-j187.py <pin>   (a sha of mtg-table, short or full)')
PIN = git('rev-parse', '--verify', sys.argv[1] + '^{commit}').strip()
P8 = PIN[:8]
if git('merge-base', '--is-ancestor', PREV, PIN, ok=True)[0] != 0:
    sys.exit('derive-j187: J186\'s pin %s is not an ancestor of %s' % (PREV[:8], P8))
SRC_T = open(SRC).read()
EXPECT = []    # (what the final pin must show, met?)


def expect(what, ok):
    EXPECT.append((what, bool(ok)))


# ======================================================================================================================================
# A. computed from the pin: the seat code (D509: frozen since J186's pin; every list must equal J186's)
# ======================================================================================================================================
def names(base, path='bridge/src'):
    return sorted(x for x in git('diff', '--name-only', base, PIN, '--', *path.split()).splitlines() if x)


def shlist(xs):      # what `... | LC_ALL=C sort | tr '\n' ' '` prints
    return ''.join(x + ' ' for x in sorted(xs))


B480, B6E8, B7A9 = '480c837d7783d2fbe1a727143dc6069344dc9bf4', '6e87e5d4a50e28649c9baa013f485da80a88aafd', '7a984963e61cdfe98cadfcc45fa7690a61dc37f6'
D508_FILES = ['bridge/src/mtgtable/SelectionSelfTest.java', 'bridge/src/mtgtable/ai/Decision.java', 'bridge/src/mtgtable/ai/Decisions.java']
SE55 = names(PREV)                       # bridge/src since J186's pin: D509 says empty
FROZEN_SINCE = names(PREV, FROZEN)       # D509's frozen set since J186's pin: empty
LAB_SINCE = names(PREV, 'tools/cubelab fixtures/cubelab')
S0A6 = names(PREV2)
S327 = names(PREV3)
S480, S6E8, S7A9, SAC0 = names(B480), names(B6E8), names(B7A9), names(J182PIN)
NUM0A6 = ''.join(l.replace('\t', ' ') + ' ' for l in sorted(x for x in git('diff', '--numstat', PREV2, PIN, '--', 'bridge/src').splitlines() if x))
NUM327 = ''.join(l.replace('\t', ' ') + ' ' for l in sorted(x for x in git('diff', '--numstat', PREV3, PIN, '--', 'bridge/src').splitlines() if x))
SPNUM = ' '.join(git('diff', '--numstat', B6E8, PIN, '--', 'bridge/src/mtgtable/ai/SearchPolicy.java').split('\t')[:2]).strip()
GOLD480 = git('diff', '--quiet', B480, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
GOLD6E8 = git('diff', '--quiet', B6E8, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
ANC480 = git('merge-base', '--is-ancestor', B480, PIN, ok=True)[0] == 0
PUSHED = git('merge-base', '--is-ancestor', PIN, 'origin/main', ok=True)[0] == 0
expect('the pin is on origin/main (pushed: the runner\'s clone fetches from GitHub)', PUSHED)
expect('bridge/src since J186\'s pin e557dedf is empty (D509: the seat frozen between landings)', not SE55)
expect('D509\'s frozen set (%s) since e557dedf is empty' % FROZEN, not FROZEN_SINCE)
expect('tools/cubelab and fixtures/cubelab since e557dedf are empty (the brief\'s diff --stat)', not LAB_SINCE)
expect('bridge/src since J185\'s pin 0a6cf5c1 is D508\'s three files, as J186\'s', S0A6 == D508_FILES)
expect('SearchPolicy.java since 6e87e5d4 is J183\'s "8 0"', SPNUM == '8 0')
expect('the seat-identity golden is unchanged since 480c837d and 6e87e5d4, and 480c837d is an ancestor', GOLD480 and GOLD6E8 and ANC480)


def short(xs):
    return ', '.join(x.replace('bridge/src/mtgtable/', '') for x in xs) if xs else 'nothing'


# the seat_code test line exactly as derive-j186.py wrote it, recomputed at this pin: it must be J186's, byte for byte
SEAT480_LINE = 'SEAT_480="%s"' % shlist(S480)
TEST186 = (f'''  test "$(git diff --name-only {B480} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "$SEAT_480" && test "$(git diff --name-only {B6E8} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S6E8)}" && test "$(git diff --numstat {B6E8} HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr '\\t' ' ')" = "{SPNUM}" && test "$(git diff --name-only {B7A9} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S7A9)}" && test "$(git diff --name-only {J182PIN} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(SAC0)}" && test "$(git diff --name-only {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S327)}" && test "$(git diff --numstat {PREV3} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{NUM327}" && test "$(git diff --name-only {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S0A6)}" && test "$(git diff --numstat {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{NUM0A6}" && sc=1''')
expect('seat_code: every list and numstat recomputed at the pin is J186\'s, byte for byte (SEAT_480 and the test line)',
       SEAT480_LINE in SRC_T.splitlines() and TEST186 in SRC_T.splitlines())
TEST187 = TEST186[:-len(' && sc=1')] + f' && git diff --quiet {PREV} HEAD -- {FROZEN} && sc=1'

# ======================================================================================================================================
# B. computed from the pin: the deck code (J186's values, unchanged: D509 touches no deck file)
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


J186_DECK = {'DC_BLOB': reg(r"DC_BLOB, UP_BLOB = '([0-9a-f]{40})'"), 'UP_BLOB': reg(r"DC_BLOB, UP_BLOB = '[0-9a-f]{40}', '([0-9a-f]{40})'"),
             'OUT_SHA': reg(r"OUT_SHA = '([0-9a-f]{64})'"), 'IN_SHA': reg(r"IN_SHA = '([0-9a-f]{64})'"), 'N': reg(r'OUT_N, IN_N = (\d+, \d+)')}
expect('cubes/library/ unchanged since J171\'s pin f2b4e9c2', LIB_SAME)
expect('deckcensus.ts differs from f2b4e9c2\'s in comment lines and the one throw\'s message only (%d out, %d in)' % (len(D_OUT), len(D_IN)), CENSUS_SHAPE)
expect('engine-unplayable.json is the nine cards in order (D482, D490, D492, D494, D506)', LIST_OK)
expect('the deck code is unchanged since J186\'s pin e557dedf (D509 touches no deck file)', DECK_SAME)
expect('deck_code: both blobs, both sha256s and the line counts recomputed at the pin are J186\'s registered values',
       J186_DECK == {'DC_BLOB': DC_BLOB, 'UP_BLOB': UP_BLOB, 'OUT_SHA': OUT_SHA, 'IN_SHA': IN_SHA, 'N': '%d, %d' % (len(D_OUT), len(D_IN))})

# ======================================================================================================================================
# C. D505-D508's names (derive-j186.py's spec, evaluated at this pin) and D509's commit
# ======================================================================================================================================
def bre(s):
    return re.sub(r'([\[\]*\\^$])', r'\\\1', s)


def q(s):
    return "'%s'" % s if "'" not in s else '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')


SPEC = {
    'D505': ('# D505 (hideaway\'s look kept while the card stays in exile, the dig tied by its trigger\'s resolution; amends D502; the names this file\n'
             '# reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py)',
             [('dec', 'D505'), ('grep', 'docs/decisions/D505-*.md', 'mayLookFaceDownExile'), ('grep', 'tools/check-redaction.mjs', 'const RESOLVE_WITHIN = [10, 3];'),
              ('file', 'fixtures/negative/redaction/a9-hideaway-alt-kept-after-the-host-leaves.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'")]),
    'D506': ('# D506 (Old Man of the Sea and Rubinia Soulsinger on the engine-unplayable list; D482\'s rule admits an overflow or hang inside one\n'
             '# step; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py)',
             [('dec', 'D506'), ('grep', 'docs/decisions/D506-*.md', 'controllerChangeZoneCorrection'), ('grep', 'tools/cubelab/engine-unplayable.json', '"Old Man of the Sea"'),
              ('grep', 'tools/cubelab/engine-unplayable.json', '"Rubinia Soulsinger"'), ('grep', 'tools/cubelab/engine-unplayable.json', 'measured overflow or hang'),
              ('grep', 'tools/cubelab/deckcensus.ts', 'D506'), ('grep', 'web/test/cubelab-deck-census.test.ts', "'Old Man of the Sea', 'Rubinia Soulsinger'")]),
    'D507': ('# D507 (the seat\'s gate sees a Stack-zone card only with a stack instance or as a spell copy; the worker log\'s [ghost] line; protocol\n'
             '# M79; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by derive-j187.py; D508 keeps the\n'
             '# Stack rule over the card the game holds)',
             [('dec', 'D507'), ('grep', 'docs/decisions/D507-*.md', 'random-<band>-d507'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean onStack('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'now.isCopiedSpell() || onStack(now)'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String ghostLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[ghost] card "'), ('grep', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'ghostLine(49)'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void ghosts()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void copies()'), ('grepline', 'docs/protocol.md', '| M79 |')]),
    'D508': ('# D508 (the seat\'s gate judges a candidate where the game holds the card now, never by a last-known copy\'s zone; the worker log\'s\n'
             '# [lki] line; protocol M80; the names this file reads, computed against the pin by derive-j186.py, and again, unchanged, by\n'
             '# derive-j187.py)',
             [('dec', 'D508'), ('grep', 'docs/decisions/D508-*.md', 'random-<band>-d508'), ('grep', 'docs/decisions/D508-*.md', 'getCardState'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static Card current('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'g.getCardState(c, null)'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static boolean lastKnown('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String lastKnownLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[lki] card "'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'return visibleAt(current(c), ai);'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean visibleAt('),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void lastKnown()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'g.copyLastState();'), ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'an ability whose host object is now in seat 0'), ('grepline', 'docs/protocol.md', '| M80 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 12. J185\'s checker failure (D508')]),
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


HAS = {}
for d, (_, items) in SPEC.items():
    HAS[d] = evaluate(items, files_at)
    expect('%s\'s names at the pin%s' % (d, '' if not HAS[d] else ': missing ' + '; '.join(HAS[d])), not HAS[d])
    expect('%s\'s shell line is J186\'s, byte for byte (but its folder)' % d, shell_of(d, items, 'lab-j186-local') in SRC_T.splitlines())
D509F = [x for x in git('ls-tree', '-r', '--name-only', PIN, 'docs/decisions/').splitlines() if x.startswith('docs/decisions/D509-')]
D509C = git('log', '--diff-filter=A', '--format=%H', '-n', '1', PIN, '--', D509F[0]).strip() if D509F else ''
D509ANC = bool(D509C) and git('merge-base', '--is-ancestor', D509C, PIN, ok=True)[0] == 0
expect('D509\'s decision file is at the pin (%s), added by %s, an ancestor of the pin' % (D509F[0] if D509F else 'none', D509C[:8] or 'no commit'), D509F and D509ANC)
expect('D509\'s file is the one this derivation read (docs/decisions/D509-seat-frozen-between-landings.md)', D509F == ['docs/decisions/D509-seat-frozen-between-landings.md'])

# ======================================================================================================================================
# D. J186's night, read only: the data folder, the runner's results, the coordinator's by-hand report, labels.py's --times rerun
# ======================================================================================================================================
lb = json.load(open(BYHAND + '/labels.json'))
assert (lb['labels'], lb['confident'], lb['branched'], lb['partialLabels'], lb['futilityControls']) == (81, 21, 153, 34, 13), 'J186 by-hand labels'
fr = lb['f_futilityRead']
SPINES12 = ['s%02d' % k for k in range(1, 13)]
assert sorted(lb['bySpine']) == SPINES12, sorted(lb['bySpine'])
WALL = {}
starts = []
for line in open(L186 + '/spine-times.txt'):
    f = line.split()
    s = f[0].split('-')[1]
    WALL[s] = (WALL.get(s, (0,))[0] + int(f[2]) - int(f[1]), f[3])
    starts.append(int(f[1]))
assert sorted(WALL) == SPINES12 and all(v[1] == '6' for v in WALL.values())
wall_s = sum(v[0] for v in WALL.values())
wh = sum(v[0] * int(v[1]) for v in WALL.values()) / 3600
wh7 = sum(v[0] * int(v[1]) / 7 for v in WALL.values()) / 3600


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


lo, hi = poisson95(lb['confident'])
RATE = {'workerHours': round(wh, 2), 'confidentPerWorkerHour': round(lb['confident'] / wh, 4), 'cpwh95': [round(lo / wh, 4), round(hi / wh, 4)],
        'c7': round(10 * lb['confident'] / wh7, 1), 'c7p95': [round(10 * lo / wh7, 1), round(10 * hi / wh7, 1)]}
RERUN = None
if os.path.exists(TIMES):     # labels.py itself, run with --times on lab-j186 (the same arguments as the Report, into the scratchpad)
    RERUN = json.load(open(TIMES))['c_sizing7']['asRun']
    assert (RERUN['workerHours'], RERUN['confidentPerWorkerHour'], RERUN['confidentPerWorkerHourPoisson95'], RERUN['confidentPer7Worker10hNight'],
            RERUN['confidentPer7Poisson95']) == (RATE['workerHours'], RATE['confidentPerWorkerHour'], RATE['cpwh95'], RATE['c7'], RATE['c7p95']), (RERUN, RATE)
mins = {k: round(v[0] / 60, 1) for k, v in WALL.items()}
J186_START = int(datetime.fromisoformat('2026-11-03T06:19:03-05:00').timestamp())    # results/J186/STATUS `started`
PILOT_MIN = round((min(starts) - J186_START) / 60)


def lines_in(p, text=None):
    try:
        return sum(1 for x in open(p, errors='replace') if text is None or text in x)
    except OSError:
        return 0


ROWS_G = {s: lines_in(glob.glob(L186 + '/b-%s-*/phaseB/branches.jsonl' % s)[0]) for s in SPINES12 + ['s13']}
TOUT = sum(lines_in(f, '"timedOut":true') for f in glob.glob(L186 + '/b-s??-*-25??/phaseB/branches.jsonl'))
UNITERR = {s: lines_in(glob.glob(L186 + '/b-%s-*/phaseB/units.jsonl' % s)[0], '"ok":false') for s in SPINES12 + ['s13']}
REPLAY = {s: lines_in(glob.glob(L186 + '/b-%s-*/phaseB/units.jsonl' % s)[0], 'replay diverged') for s in SPINES12 + ['s13']}


def logcount(s, text):
    return sum(lines_in(f, text) for f in glob.glob(L186 + '/b-%s-*/phaseB/logs/*.log' % s))


PUMP = {s: logcount(s, 'at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)') for s in SPINES12 + ['s13']}
GHOST = {s: logcount(s, '[ghost]') for s in SPINES12 + ['s13']}
LKI = {s: logcount(s, '[lki]') for s in SPINES12 + ['s13']}
TEX = {s: logcount(s, 'TimeoutException') for s in SPINES12 + ['s13']}
NPE = logcount('s11', 'Cannot invoke "Object.getClass()" because "key" is null')
SO = sum(lines_in(f, 'StackOverflowError') for f in glob.glob(L186 + '/b-s??-*-25??/phaseB/branches.jsonl'))
EXITS = dict(l.split() for l in open(L186 + '/exits.txt') if l.strip())
PROB11 = json.load(open(glob.glob(L186 + '/b-s11-*/atlas.json')[0]))['checks']['problems']
assert sum(UNITERR.values()) == 29 == UNITERR['s13'] == REPLAY['s13'], (UNITERR, REPLAY)
assert {s: v for s, v in REPLAY.items() if v} == {'s04': 2, 's13': 29}, REPLAY
assert {s: v for s, v in PUMP.items() if v} == {'s11': 11} and {s: v for s, v in GHOST.items() if v} == {'s11': 12} and not any(LKI.values()) and SO == 0
assert {s: v for s, v in TEX.items() if v} == {'s01': 113, 's04': 2} and NPE == 176, (TEX, NPE)
assert EXITS.get('b-s11-legacy-2550') == '3' and len(EXITS) == 12 and len(PROB11) == 1 and PROB11[0].startswith('12 frame log(s) failed')
assert not os.path.exists(L186 + '/report'), 'lab-j186/report exists: J186\'s Report ran after all'
GAMES12 = sum(ROWS_G[s] for s in SPINES12)
GB = round(sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(L186) for x in fs) / 1e9, 1)
N = {'branched': lb['branched'], 'labels': lb['labels'], 'confident': lb['confident'], 'partial': lb['partialLabels'], 'controls': lb['futilityControls'],
     'ctlConf': fr['controlsConfident'], 'read': fr['read'], 'stopped': fr['stopped'], 'cpwh': round(RATE['confidentPerWorkerHour'], 3),
     'cpwh95': [round(x, 3) for x in RATE['cpwh95']], 'c7': RATE['c7'], 'p95': RATE['c7p95'], 'wall': wall_s, 'wallh': round(wall_s / 3600, 1),
     'wh': round(wh, 1), 'minmin': min(mins.values()), 'maxmin': max(mins.values()), 'games': GAMES12, 'g13': ROWS_G['s13'], 'timeouts': TOUT,
     'perSpine': round(lb['branched'] / 12, 1), 'gb': GB, 'replay': sum(REPLAY.values())}
assert mins['s04'] == N['maxmin'] and N['games'] == 56575 and N['g13'] == 244 and N['timeouts'] == 20, N
NOTE = {'s01': ' (113 Forge AI-eval timeouts: the engine\'s own)',
        's04': ' (2 AI-eval timeouts; 2 units replayed on a second attempt)',
        's11': ' (12 logs failed the checker: the all-hidden target record, D510 pending; 11 PumpEffect IOOBEs, 176 Forge AI NPEs)'}
ROWS = {}
for k in range(1, 14):
    s = 's%02d' % k
    if s == 's13':
        ROWS[s] = '%d / %d: no atlas -- killed by the abort at 16:37 after 29 failed units, the replay divergence (D511 pending)' % (2439 + k, 2539 + k)
        continue
    m = lb['bySpine'][s]
    ROWS[s] = '%d / %d: %d, %d, %.1f min%s' % (2439 + k, 2539 + k, m['rows'], m['confident'], mins[s], NOTE.get(s, ''))
# J186's draws: the pilot's record in the runner clone (read only), and the data folder's draw recomputed here (draws.py's own drawsha)


def drawsha(dirs):
    hh, n = hashlib.sha256(), 0
    for d in dirs:
        hh.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            hh.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (hh.hexdigest(), n)


REC186 = json.load(open(CLONE186 + '/draws-pilot.json'))
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP186 = ['s%02d-%s-%d' % (k, BANDS[k - 1], 2439 + k) for k in range(1, 14)]
VA186 = ['v%02d-%s-%d' % (k, BANDS[k - 1], 2639 + k) for k in range(1, 14)]
ASRUN = {x: drawsha([L186 + '/decks/' + x]) for x in SP186}
VAL_ASRUN = drawsha([L186 + '/validation/' + x for x in VA186])
assert all(REC186['spines'][x][0] == ASRUN[x] for x in SP186) and REC186['validation'] == VAL_ASRUN, 'J186 draws: recorded != the data folder'
J186_DRAWS = sorted({ASRUN[x].split()[0] for x in SP186})
J186_VAL = VAL_ASRUN.split()[0]
assert len(J186_DRAWS) == 13
REG_SRC = set(re.findall(r"'([0-9a-f]{64})'", SRC_T))
expect('J186\'s 13 spine draws and its validation draw are none of J171-J185\'s registered ones', not (set(J186_DRAWS) | {J186_VAL}) & REG_SRC)

# ======================================================================================================================================
# E. the seeds: J187's block is unused (pc-jobs' jobs/ at its HEAD, the drafts, the data folder)
# ======================================================================================================================================
PAT = '245[3-9]|246[0-5]|255[3-9]|256[0-5]|265[3-9]|266[0-5]|275[3-9]|276[0-5]'
PCJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'rev-parse', '--short=8', 'HEAD'], capture_output=True, text=True).stdout.strip()
hits = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'grep', '-n', '-w', '-E', PAT, 'HEAD', '--', 'jobs/'], capture_output=True, text=True).stdout.splitlines()
hits += subprocess.run('grep -n -w -E %s /home/justin-a/code/pc-results/drafts/*.md' % q(PAT), shell=True, capture_output=True, text=True).stdout.splitlines()
hits = [x for x in hits if 'J187-atlas-4b-night-eleven.md' not in x]
odd = [x for x in hits if PAT not in x]
expect('the seed block %s is unused in pc-jobs %s jobs/ and the drafts (only a job\'s own grep line)' % (PAT, PCJ), not odd)
DATA_HIT = [p for p in glob.glob('/home/justin-a/code/lab/data/*/*') + glob.glob('/home/justin-a/code/lab/data/*/*/*') if re.search(r'-(%s)$' % PAT, p)]
expect('no folder under the lab data folder (three levels) ends in one of the block\'s seeds', not DATA_HIT)
expect('lab-j187 does not exist yet (the owner makes it, empty, before posting)', not os.path.exists('/home/justin-a/code/lab/data/lab-j187'))
PIN_SUBJ = git('log', '-1', '--format=%s', PIN).strip()
SUBJ = PIN_SUBJ if len(PIN_SUBJ) <= 150 else PIN_SUBJ[:150].rsplit(' ', 1)[0] + ' ...'
ALL_SINCE = names(PREV, '.')
S13_MIN = round((int(datetime.fromisoformat('2026-11-03T16:37:17-05:00').timestamp()) - max(int(l.split()[2]) for l in open(L186 + '/spine-times.txt'))) / 60)
AVG_MIN = round(wall_s / 12 / 60)

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
    """Replace `old` (J186's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
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


# ======================================================================================================================================
# 0. the history paragraphs, rewritten (J186's night, D509)
# ======================================================================================================================================
span('**Why J186.**', '**Before posting -- the coordinator', f'''**Why J187.** J186 (rung 4b, night ten, the first of D508's population, pin e557dedf) ran 2026-11-03 06:19 to 16:37 EST and was
**aborted by its own `abort: armed == 1 and unit_errors > 20`** (29 unit errors, all s13's) before its scan block and its Report:
twelve spines (s01-s12) finished with an atlas, s13 was killed {S13_MIN} minutes in, and `lab-j186/report/` was never written. **J186's
report is the coordinator's by-hand one**: the job's own `labels.py`, `draws.py` and `compare.py`, run from the runner clone's
`var/lab-j186-local/bin/` with the Report's arguments over the twelve atlases, into a scratch folder, and `labels.py` once more with
`--times=lab-j186/spine-times.txt` for the rate (derive-j187.py recomputes it and requires the two to agree): {N['branched']} branched
decisions, {N['labels']} labels, {N['confident']} confident, {N['partial']} partial, {N['controls']} controls ({N['ctlConf']} of them confident at the full n), **{N['cpwh']}
confident labels a worker-hour** [{N['cpwh95'][0]}, {N['cpwh95'][1]}] ({N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; J185's 0.376), the twelve
finished spines at 6 workers (one memory-pressure drop to 5 workers at 10:37, inside s04, raised back at 10:42; `spine-times.txt`
records 6, and the rate counts 6), {N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, s04 the longest), {N['wh']}
worker-hours, {N['games']:,} branch games on the twelve ({N['g13']} more on s13 before the abort), {N['timeouts']} branch timeouts (all s01's), peak RSS
1.29 GB a worker. Its scan block never ran, so its refused-payment share and D484-D488's counters were never computed. Three faults;
the two in the seat wait (D509):
- **s13, the replay divergence** (pauper, 2452/2552): every branch unit at d23, d28, d33, d40, d49 and d55 failed twice with "the
  replay diverged at decision <d>" (d2, d13 and d17 replayed fine): 29 unit errors, the abort. The lead: the baseline's d20 (turn 15)
  lists the token `cast:35` twice (Dog Walker's face-up cast and its disguise cast share one token), and d21 is `activate:35`. A lane
  is diagnosing it as **D511**, not landed: J187 runs without it, so a deck that meets the same shape can fail its units again.
  **`replay_diverged`**, new tonight (information), counts the units.jsonl lines naming a divergence (J186: {N['replay']} -- 29 on s13's
  failed units and 2 on s04's units that replayed on their second attempt); `unit_errors > 20` did its job and stays.
- **s11, the all-hidden target record** (legacy, 2550; exit 3; 12 of 12,652 frame logs failed `check-redaction` on one record each, in
  d13-d16): a target record with `options: []`, `hidden: 1` and `chosen: null`. The one candidate was Batroc the Leaper (63), a ghost
  in the Stack zone after the random seat's refused Multikicker payment (PLAN's cube-lab follow-up 27, queued under D509); Forge chose
  it, and `Decisions.targetAnswer` writes no `option:hidden` token on the targets path. A lane fixes the record's shape as **D510**, not
  landed: J187 runs without it, so the same shape can fail a unit's check again. The checker never admits it (D507; D509 point 4: a
  hidden-information fault in the seat's record is corrupting, not excluding): `atlas.problems == 0` stays the check, and the shape is
  named here as known and excluded. s11 also printed {GHOST['s11']} `[ghost]` lines (card 63: D507's gate leaving it out, information),
  {PUMP['s11']} `PumpEffect.java:299` IOOBEs (the known shape; J185: 5, all s12's) and {NPE} Forge NPEs, `Cannot invoke "Object.getClass()"
  because "key" is null`, in `AiController.chooseSpellAbilityToPlayFromList` after "No AI assigned for API: null" (Forge's AI meeting
  the stranded abilities of Phoenix 52 and Batroc 63; information).
- **s01, Forge's AI eval timeouts** (pauper, 2540): {TEX['s01']} `java.util.concurrent.TimeoutException`s from Forge's own AI eval thread at
  its timeout (D465's and D499's shape; J185's s12 had 21), and {TEX['s04']} on s04: the engine's own, caught, no branch error. J185's fault
  stayed closed: 0 `[lki]` lines and no record naming a last-known copy (D508); 0 `StackOverflowError`s, no hung unit.

**D509 since J186's pin.** The owner chose, on 2026-11-03, to let a population run: **D509** freezes the atlas seat between landings
(`bridge/src`, `tools/cubelab/CubeLab.java`, the seat-identity golden, `forge-home/` and the engine), queues a fault that would change
what the seat plays or offers (the cube lab's follow-ups 27, 28, 30 and 31 at the decision; D510's and D511's lanes beside them) and
lands the queue as one population boundary under a decision of its own. It is docs only (`git diff --name-only e557dedf {P8}`:
{', '.join('`%s`' % x for x in ALL_SINCE)}), so J187 runs on J186's seat, byte for byte.

J187 is J186's night carried onto that main: the same seat, the same design, the same pilot, the same reads and checks, 13 new spines at
the next seeds in a new folder, `lab-j187`. J186's own outputs stay in `lab-j186/` and are read only, for the J186 columns. **J187 is
D508's population's SECOND night**: nothing under the seat changed (`git diff --name-only e557dedf <pin> -- {FROZEN}` is
empty, `seat_code`), so J187's labels pool with J186's twelve finished spines under the same pool names, `random-<band>-d508`, and J185's
numbers (D507's population, one night) are read beside, as information, never added. A reader pooling the two nights leaves out the
rows of units whose logs failed the checker -- J186's s11 d13-d16, and tonight's if any (D509 point 4: no mechanism drops them today).

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', f'''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j187` does not exist yet (2026-11-03, when this was drafted): the owner
   makes it, empty, before posting (`mkdir`, then `ls -A` prints nothing). The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j187/`,
   from an earlier J187 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `{PIN}` ({P8}: "{SUBJ}"), written by
   `drafts/derive-j187.py` from its one argument; no placeholder pin is left in this file. It is main's head, D509 merged on J186's pin
   e557dedf, **on origin/main** (derive-j187.py checks it; J184 failed at its prepare step on a pin that was merged but not pushed).
   D509 is docs only, so `bridge/src` and D509's frozen set are byte-identical to J186's pin (`seat_code`). **If the pin moves, run
   `python3 drafts/derive-j187.py <the new pin>` again**: every value below that the pin decides is computed from it with git, and a pin
   that changes the frozen set is NOT POSTABLE inside D508's population (D509: a landing has a decision and a population of its own).
3. **The names this file reads were computed against the pin itself, and each equals J186's** (derive-j187.py, from `git show`/`git diff`
   at {P8}): the four decision files D505-D508 and the names each `has_d505`/`has_d506`/`has_d507`/`has_d508` line reads (J186's lines,
   byte for byte), `seat_code` (bridge/src since 0a6cf5c1, 3275af30, ac07876b, 7a984963, 6e87e5d4 and 480c837d, the golden,
   SearchPolicy.java's numstat: J186's test line byte for byte) plus D509's test (its frozen set unchanged since e557dedf), `deck_code`
   (J186's blobs and sha256s), and the commits that added D481-D509's decision files (D509's added by {D509C[:8]}, an ancestor of the
   pin). The script says when a pin misses one and is then NOT POSTABLE -- a guard is never loosened to pass. D466-D504's greps are
   J183's, unchanged.
4. **J186 has ended, aborted** (2026-11-03 16:37, `armed == 1 and unit_errors > 20`: s13's 29 units, the replay divergence; no scan, no
   Report, no `lab-j186/report/`). Its numbers in this file are the coordinator's by-hand report (*Why J187*). J187 reads lab-j186
   read-only, for its J186 columns; nothing waits on another job, so there is **no `after:` line**. J186's job file needs nothing, and
   its s13 is never resumed.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J187 pools with J186 and compares with it position by
   position, and a change of design would split the population's two nights.
6. **Nothing else to make, move or clean.** J187 reads lab-j170 (J171's night), lab-j186 (J186's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, J182's and J183's from their `report/draws.json`, read on 2026-11-02, J185's from
   `lab-j185/report/draws.json`, read on 2026-11-03, and J186's from its pilot's `var/lab-j186-local/draws-pilot.json` in the lab clone,
   equal to lab-j186's draw as derive-j187.py recomputed it, read on 2026-11-03), so it reads no `var/lab-j1xx-local/` folder but its
   own. Post nothing that writes lab-j186 or lab-j187 beside J187.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare across nights', f'''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough";
  D508's population holds J186's {N['controls']} controls before tonight ({N['ctlConf']} confident), and tonight's ~6-14 are its second input (D507's holds
  J185's 13, D498's J182's 6 and J183's 11, D497's J181's 13, D493's J177's 12 and J180's 14: 0 of 69 confident, all read beside); 0.25
  holds until this population's pooled count can carry the read.
''')

span("**So J186 is D508's population's first night, on new spines**", '**The seeds are new', '''**So J187 is D508's population's second night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's, the
copier's carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's (`Decisions.visible`: a candidate judged
where the game holds the card now, never by a last-known copy's own zone; D507's Stack rule kept over that card), all as J186's, byte
for byte (D509) -- so `pool: random-<band>-d508`, `randomSeat: "D508"`, contract v6, **pooled with J186's rows**. **Breadth over
depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's, so s01 is pauper and s13 pauper again), into a new folder.
**J186's numbers are a comparison by position and the pooled read's first input, never a baseline**: s01 beside s01 is the same band,
the same seat and the same branching design, but other decks and other seeds -- every difference is a candidate. J185's, J183's,
J182's, J181's, J180's, J177's, J173's and J171's nights stay other populations and appear only in the readers' self-tests, their
registered expectations and J177's sizing paragraph.

''')

SEEDS_P = f'''**The seeds are new** (checked by derive-j187.py, 2026-11-03): J186's block plus 13 -- deck seeds **2453-2465** (`$((2452 + K))`), game
seeds **2553-2565** (the deck seed + 100), validation deck seeds **2653-2665** (`$((2652 + K))`) with game seeds **2753-2765**
reserved. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -w -E
'{PAT}' {PCJ} -- jobs/` (pc-jobs at {PCJ}, J186's post) finds only a job's own
grep line, no seed, and so does the same grep over `/home/justin-a/code/pc-results/drafts/*.md`; every computed seed in a job or draft
is an earlier block's (`$((2000 + K))` to J181's `$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391, with
the older blocks' small ones below 1700) or J182's, J183's, J185's and J186's `$((2400 + K))`, `$((2413 + K))`, `$((2426 + K))`,
`$((2439 + K))` and their companions (2401-2452, 2501-2552, 2601-2652, 2701-2752, lab-j182's, lab-j183's, lab-j185's and lab-j186's;
J184 reserved J185's block and never drew; J186's validation game seeds 2740-2752 stay reserved for the job that branches them); and no
folder under `/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. The game seeds stay in the 25?? hundreds,
so every `lab-j187` glob keeps `b-s??-*-25??`, and the comparison's `lab-j186` globs read `25??` as J186's read lab-j185's. Bases and
literals were moved together by one inclusive shift of J186's block ([2439, 2452] and its three companions, +13), skipping any number
touching a letter, a dot or a hex digit, and every changed four-digit token was read in context (derive-j187.py's audit):
RESTORED_SENTENCE The smoke keeps J166's pair (deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167; that pair
holds none of the nine cards D482-D506 list, and its redraw on the nine-card list (at aab15d29, D506's merge) gave J166's registered
sha256 back (`edfdc861...`, 0 skips), so its draw on the list is J166's.

'''
span('**The seeds are new', '## The decks', '\x00SEEDS\x00')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J187's own name, J186 as the comparison)
# ======================================================================================================================================
# the decks: a registered string corrected on purpose (J186's rename turned D506's night, J183, into J186), and the registered draws
put("and Rubinia Soulsinger (J186, D506).", "and Rubinia Soulsinger (J183, D506).")
put("""and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's or J185's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are
registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`).""",
    """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's, J185's or J186's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's
are registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`, J186's from its pilot's
`draws-pilot.json` in the lab clone -- J186's Report never ran -- equal to its data folder's draw as derive-j187.py recomputed it).""")
span("**The deck code is J171's pin's plus exactly D490, D492, D494 and D506**", "**The sha256s are recorded, not registered.**", f'''**The deck code is J171's pin's plus exactly D490, D492, D494 and D506** (`deck_code`, the pilot; every value computed from the pin by
derive-j187.py and equal to J186's, unchanged since J185's pin 0a6cf5c1: D508 and D509 touch no deck file): `cubes/library/` untouched
since J171's pin f2b4e9c2; `tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in {len(D_OUT)} lines out and {len(D_IN)} in and nothing else -- the
header comment of its point 5 (the list's cards and decisions named, D506's wording: what lists a card is the file's own `about`) and
the doc comment and the error message of `parseEngineUnplayable`, the throw's condition unchanged -- the changed lines' sha256s
registered; and `tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made nine, in this order: Scute Swarm unchanged,
Chain of Smog as at J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus of Ideation, Studious
First-Year (D492) and Ob Nixilis, the Adversary (D494), each `since: "J176"`, then Old Man of the Sea and Rubinia Soulsinger (D506),
each `since: "J183"`; and both files' blobs are the pin's, byte for byte (last changed by {LASTS}, the `about` line's D506 sentence
included). J185's and J186's guards accepted the same nine, and so does this one, nothing else, so **the draw never deals a Prepare
card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger**.

''')
# the decks table: J186's column (the rows themselves are replaced after the shift)
put("| J185 at this position (another population, D507's; the same seat policy and design; other decks): decisions branched, confident labels, wall |",
    "| J186 at this position (the same population, D508's first night; the same seat and design; other decks): decisions branched, confident labels, wall |")
span("(J185's numbers from `lab-j185/report/labels.json`", "Folders: `lab-j186/decks/", '''(J186's numbers from the coordinator's by-hand report -- labels.py over lab-j186's twelve atlases, its `bySpine` (`rows`,
`confident`) -- and `lab-j186/spine-times.txt`, read only on 2026-11-03; all twelve at 6 workers; s13 has none. compare.py reads J186's
column again at the Report, from `lab-j186/report/labels.json`, which J186 never wrote: there the column reads null, and these stand in.)

''')
# sizing: J186's walls beside J177's
span("**Sizing: J177's, unchanged; J185's walls beside it.**", "measured the design:",
     f"""**Sizing: J177's, unchanged; J186's walls beside it.** J186's twelve finished spines, all at 6 workers, took {N['wall']:,} s of walls ({N['wallh']}
h; {N['minmin']} to {N['maxmin']} min a spine, s04 the longest, inside `timeout: 3h` by {round(180 - N['maxmin'])} min), {N['wh']} worker-hours, {N['games']:,} branch rows,
{N['branched']} decisions branched ({N['perSpine']} a spine; J185's 187, 14.4; J183's 161, 12.4; J182's 198, 15.2; J181's 153, 11.8; J180's 105, 8.08);
s13 ran {S13_MIN} minutes before the abort ({N['g13']} branch rows). J177
""")
# the label set
put("| `pool` | **`random-<band>-d508`**: D508's population, NEW with this night; never J185's `random-<band>-d507`, J183's and J182's `random-<band>-d498`, J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |",
    "| `pool` | **`random-<band>-d508`**: D508's population, J186's and this night's; never J185's `random-<band>-d507`, J183's and J182's `random-<band>-d498`, J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |")
put("| `randomSeat` | **`\"D508\"`** on every row: the decision that opened the population (labels.py's `--seat` default, now D508; J185's rows say \"D507\", J183's and J182's \"D498\"). The seat's policy is D488's |",
    "| `randomSeat` | **`\"D508\"`** on every row: the decision that opened the population (labels.py's `--seat` default, D508 as J186's; J186's rows say \"D508\" too, J185's \"D507\", J183's and J182's \"D498\"). The seat's policy is D488's |")
put("""**Never
  pooled with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5 rows, or
  v1-v4** (D489, D508, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`), never on
  `sha` alone.""",
    f"""**Pooled
  with J186's v6 rows** (one population: the same `pool`, `randomSeat` and seat; the `sha` differs by D509's docs alone, e557dedf and
  {P8}) **and never with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5
  rows, or v1-v4** (D489, D508, D509, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or
  `randomSeat`), never on J186's and J187's `sha` alone, and leaves out the rows of units whose logs failed the checker (J186's s11
  d13-d16; D509 point 4).""")
# the pre-registered reads (c), (f), (xvii)
span("Beside it, **as information: J185's**", "review's ~46 [41, 51] a 7-worker night**", f"""Beside it, **J186's** (THE SAME POPULATION's first night, read from `lab-j186/report/labels.json` at
  the Report, `--j186=`: that file does not exist -- J186 was aborted before its Report -- so `c_sizingRead.j186` reads null, and
  J186's yield is registered here from the coordinator's by-hand report: {N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}] on {N['wh']}
  worker-hours, twelve spines) and **the two nights pooled** (their confident labels over their worker-hours, by hand at the morning
  read), then, **as information**, J185's 0.376 (D507's one night), J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's
  0.563, other populations, and **the
  """)
span("**This night's numbers are the FIRST contribution", "- **(g) the cap read**", f"""**This night's numbers are the SECOND contribution
  to D508's population's pooled read** (`pooledInputs`): J186's {N['ctlConf']} of {N['controls']} controls confident ({N['stopped']} stopped, {N['read']} read; the
  by-hand report's `f_futilityRead`, registered here because `c_sizingRead.j186.futilityRead` reads null) is the first, and the two are
  added by hand at the morning read; J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13 (D497's),
  J177's 0 of 12 and J180's 0 of 14 (D493's) are read beside, as information, never added.
""")
span("- **(xvii) J186 beside J185", "- **(xi)** the draws", """- **(xvii) J187 beside J186, BY POSITION, DIFFERENT DECKS, THE SAME POPULATION (D508's), THE SAME SEAT AND DESIGN**
  (compare.py, `report/compare-j186.json`; J186's column computed from its folders and report with the same code -- J186's
  `report/labels.json` does not exist, so that column reads null at every position, and the decks table's by-hand numbers stand in):
  per spine position and for the night, decisions listed per baseline turn, decisions branched, branched in full, partial labels,
  options per decision branched, labels, confident labels, the confident share, **confident labels per worker-hour**, the mean regret
  at Forge's choice, the capped share, the branch games and the wall. **A candidate, never a verdict**: the decks differ at every
  position and the seat does not, so no difference is the seat's; J186's s11 and s13 carry the two faults D510 and D511 answer,
  neither landed.
""")
# the pilot's prose: D497-D509 and the seat code
put("""**D497-D508** (`has_d497` to `has_d508`: each decision's file and the names its lane added, as the
pilot's lines list them; D505-D508's computed against the pin by derive-j186.py), the commits that added D481-D508's decision files""",
    """**D497-D508** (`has_d497` to `has_d508`: each decision's file and the names its lane added, as the
pilot's lines list them; D505-D508's computed against the pin by derive-j186.py and again, unchanged, by derive-j187.py), the commits
that added D481-D509's decision files (D509 a policy, no code: its commit alone)""")
put("J173's plus D493's, D496's, D497's, D498's and D500's, D507's since J183's pin 3275af30 and D508's since J185's pin 0a6cf5c1** (`seat_code`, its lists computed from the pin:",
    "J173's plus D493's, D496's, D497's, D498's and D500's, D507's since J183's pin 3275af30 and D508's since J185's pin 0a6cf5c1, and D509's frozen set unchanged since J186's pin e557dedf** (`seat_code`, its lists computed from the pin, J186's byte for byte:")
# the guards: D505-D508's lines from the spec (J186's, checked above), the seat block with D509's test
G508 = ''.join(SPEC[d][0] + '\n' + shell_of(d, SPEC[d][1], 'lab-j187-local') + '\n' for d in ('D505', 'D506', 'D507', 'D508'))
SEAT_BLOCK = f'''# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's; the gate in
# front of what it sees and offers is D508's (`decides:`), all as J186's: D509 freezes the seat between landings. Every list below was
# computed from the pin {P8} by derive-j187.py, never typed, and is J186's (derive-j186.py's at e557dedf), byte for byte:
# D495's merge (480c837d, J177's pin) is an ancestor of the pin, and the seat-identity golden is unchanged since it and since J173's pin
# (6e87e5d4); bridge/src since 480c837d and since 6e87e5d4 is J183's ten files (D496's six with GameLog.java's comment-only javadoc,
# D497's and D500's LenientGameCopier.java, D498's Determinizer.java and Atlas.java, D500's SearchPolicy.java) and what J183's pin
# gained since; SearchPolicy.java since 6e87e5d4 is {SPNUM!r} (D493's self-test accessor 5 lines plus D500's 3); since 7a984963 J183's
# four and the same; since J182's pin (ac07876b) and since J183's pin (3275af30, D502-D504's merge) bridge/src changed in exactly:
# {short(S327)} (numstat {NUM327.strip() or 'none'}); since J185's pin (0a6cf5c1, D505-D507's merge) in exactly: {short(S0A6)}
# (numstat {NUM0A6.strip() or 'none'}); and since J186's pin (e557dedf, D508's merge, the population's opening pin) D509's frozen set,
# {FROZEN}, changed in nothing (D509 point 1: the test every night inside the population passes)
sc=0
{SEAT480_LINE}
if git merge-base --is-ancestor {B480} HEAD && git diff --quiet {B480} HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet {B6E8} HEAD -- fixtures/cubelab/seat-identity.json; then
{TEST187}
fi
echo $sc > var/lab-j187-local/seat-code.txt
echo "J187: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's, the gate D507's and D508's (bridge/src since J185's pin 0a6cf5c1: {short(S0A6)}; D509's frozen set unchanged since J186's pin e557dedf): $sc"
'''
span("# D505 (hideaway's look kept while the card stays in exile, the dig tied by its trigger's resolution; amends D502; the names this file\n",
     "# D481-D496 by decision id:", G508 + SEAT_BLOCK)
put('D497 D498 D499 D500 D501 D502 D503 D504 D505 D506 D507 D508; do', 'D497 D498 D499 D500 D501 D502 D503 D504 D505 D506 D507 D508 D509; do')
put('has-d481-d508-commits', 'has-d481-d509-commits', 2)
put('d481_d508_commits', 'd481_d509_commits', 2)
# the deck code: deckcode.py and its block, every value from the pin (J186's, checked above)
DECK_BLOCK = f'''# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506, and nothing else (deckcode.py's
# header): nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's, D494's and D506's comment and
# message lines only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492), Ob
# Nixilis, the Adversary (D494), and Old Man of the Sea and Rubinia Soulsinger (D506); both files the pin's blobs (computed by
# derive-j187.py from {P8}, equal to J186's; unchanged since J185's pin 0a6cf5c1)
cat > var/lab-j187-local/bin/deckcode.py <<'PY'
# J187: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j187-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j187.py from the
# pin {P8} with git, never typed, and is J186's. Exits 0 when all three hold:
#   census  deckcensus.ts: {len(D_OUT)} lines out and {len(D_IN)} in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's ({LASTS} last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j187-local/'
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
    sys.exit('J187 deck code: %s' % e)


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
print("J187 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet {F2B} HEAD -- cubes/library/; then
  git diff --no-color --no-ext-diff -U0 {F2B} HEAD -- tools/cubelab/deckcensus.ts > var/lab-j187-local/deckcensus.diff
  git show {F2B}:tools/cubelab/engine-unplayable.json > var/lab-j187-local/unplayable-j171.json
  git show {CC7}:tools/cubelab/engine-unplayable.json > var/lab-j187-local/unplayable-j176.json
  python3 -I var/lab-j187-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j187-local/deck-code.txt
echo "J187: deck code: J171's pin's plus exactly D490, D492, D494 and D506 -- the draw deals no Prepare card, no Ob Nixilis, the Adversary, no Old Man of the Sea and no Rubinia Soulsinger: $dc"
'''
span("# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506", 'test -z "${CUBELAB_WORKER_XMX:-}"', DECK_BLOCK)
# the counted lines: J186's replay divergence beside D508's [lki]
LKI = 'metrics: lki_candidates = count /home/justin-a/code/lab/data/lab-j186/b-s??-*-25??/phaseB/logs/*.log "[lki]"\n'
put(LKI, LKI.replace('lab-j186', 'lab-j187') +
    'metrics: replay_diverged = count /home/justin-a/code/lab/data/lab-j187/b-s??-*-25??/phaseB/units.jsonl "replay diverged"\n')
# draws.py: J186's draws registered beside the others
put("""# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01), J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read on 2026-11-02), J183's (J183_DRAWS, J183_VALIDATION, from lab-j183/report/draws.json, read on
# 2026-11-02) and J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read by derive-j186.py on 2026-11-03): none may
# come back here.""",
    """# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01), J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read on 2026-11-02), J183's (J183_DRAWS, J183_VALIDATION, from lab-j183/report/draws.json, read on
# 2026-11-02), J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read on 2026-11-03) and J186's (J186_DRAWS,
# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran): none may come back here.""")
J185BLOCK_END = "J185_VALIDATION = '85358de6d18896ae622062228cf623bd49c97beb5551096b7927124983ea0a87'\n"
i = t.index("# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`")
j = t.index(J185BLOCK_END) + len(J185BLOCK_END)
J185BLOCK = t[i:j]
pairs = ['%r, %r' % (J186_DRAWS[k], J186_DRAWS[k + 1]) if k + 1 < 13 else '%r' % J186_DRAWS[k] for k in range(0, 13, 2)]
J186BLOCK = ("# J186's 13 spine draws and its validation draw (J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw\n"
             "# as derive-j187.py recomputed it on 2026-11-03; J186's Report never ran, so there is no lab-j186/report/draws.json): none may come\n"
             "# back here either\n"
             "J186_DRAWS = {" + (',\n              '.join(pairs)) + "}\n"
             "J186_VALIDATION = %r\n" % J186_VAL)
span(J185BLOCK[:60], J185BLOCK_END, J185BLOCK + J186BLOCK)   # J185's block verbatim (kept J185 through the comparison move), J186's after it
t = t.replace(J185BLOCK_END, '', 1)
put('J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS | J183_DRAWS | J185_DRAWS)', 'J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS | J183_DRAWS | J185_DRAWS | J186_DRAWS)')
put('(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION, J183_VALIDATION, J185_VALIDATION)',
    '(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION, J183_VALIDATION, J185_VALIDATION, J186_VALIDATION)')
# labels.py: its header, the expectation and the beside-column's population
span("# J186 (drafts/J186-atlas-4b-night-ten.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J187 (drafts/J187-atlas-4b-night-eleven.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J187 data. What changes: nothing in the rows. J187 is D508's population's SECOND night (D509: the seat frozen since J186's
# pin e557dedf), so its rows pool with J186's under the same pool names (D489, D508, D509, Comparability): --seat= defaults to "D508", as
# J186's (the self-test on J171's night still passes --seat=D486), the Report names the pools `random-<band>-d508`; and the sizing read's
# beside-column is J186's (--j186= LABELS_JSON: its c_sizingRead, per-worker-hour yield and futilityRead, THE SAME POPULATION's first
# night, as information and as the pooled futility read's first input; null when absent -- and J186's lab-j186/report/labels.json IS
# absent: J186 was aborted before its Report, so its numbers are registered in the job file from the coordinator's by-hand report). Every
# field, read and definition otherwise J177's, unchanged; the scan stamp `J187 v5`.
""")
put(r"""'expectation': 'as information, no verdict: J185 (ANOTHER POPULATION: D507\'s one night, D488\'s seat policy on D498\'s determinizer behind D507\'s target gate, before D508\'s; the same design, other decks) below as its own report read it; J183 and J182 (D498), J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations too; the review ~46 [41, 51]'}""",
    r"""'expectation': 'as information, no verdict: J186 (THE SAME POPULATION: D508\'s first night, the same seat and design, other decks) below as its own report read it -- null: J186 was aborted before its Report, and its by-hand numbers are in the job file; J185 (D507), J183 and J182 (D498), J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations; the review ~46 [41, 51]'}""")
put("'population': 'D507 (its one night, before D508\\'s gate): never pooled with this night (D508, Comparability)'}",
    "'population': 'D508 (the same population, its first night): pooled with this night under the same pool names; its futilityRead is the pooled futility read\\'s first input (D508, D509, Comparability)'}")
# metrics.py's header
span("# J186's metrics (drafts/J186-atlas-4b-night-ten.md)", "# J177's header, unchanged below:\n# J177's metrics", """# J187's metrics (drafts/J187-atlas-4b-night-eleven.md): J177's metrics.py for a NEW data folder, lab-j187, where all 13 spines are
# J187's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J187 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J187's (deck seeds 2453-2465, game
# seeds 2553-2565, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population,
# J186's and this night's); (c) compare-j186.json for the `compare` key; (d) the scan stamp `J187 v5` and the defaults lab-j187,
# var/lab-j187-local.
""")
# compare.py: its header, its glob's comment and its note
span("# J186 (drafts/J186-atlas-4b-night-ten.md): each spine's numbers beside J185's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     """# J187 (drafts/J187-atlas-4b-night-eleven.md): each spine's numbers beside J186's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J187 data. DIFFERENT DECKS (J186: deck seeds 2440-2452, game seeds 2540-2552; J187: 2453-2465, 2553-2565; the same band at
# each position), THE SAME SEAT (D488's policy, D498's redeal, D500's damage history, D508's gate: frozen since J186's pin, D509) AND THE
# SAME BRANCHING DESIGN (150 random branches, the futility stop, 10 decisions): J186 and J187 are D508's population's two nights. A
# difference is a candidate, never a verdict, and no position is a pair (the decks differ everywhere). J177's compare.py, unchanged but
# for its note: `this` is J187, `before` J186, read from lab-j186 at the Report (read only) -- J186's report/labels.json does not exist
# (J186 was aborted before its Report), so `before` reads empty at every position and null for the night (side()'s absent-file rule).
""")
put("# J186's folders end in 2540-2552, J185's in 2527-2539: one glob reads both", "# J187's folders end in 2553-2565, J186's in 2540-2552: one glob reads both")
span("out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE SEAT\\'S GATE CHANGED:", "\n       'bySpine': {s: {'before': before.get(s)",
     r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME POPULATION, THE SAME SEAT AND DESIGN: J186 (D508\'s population, its first night; deck seeds 2440-2452, 150 branches, the futility stop, 10 decisions; aborted before its Report, so its column reads null here) beside J187 (D508\'s population, its second night, the seat frozen since J186\'s pin, D509; deck seeds 2453-2465, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is the seat\'s: the decks differ at every position and the seat does not',""")
# the pilot's read of the comparison night
put("""# J185's night, read only, as information (it ended 2026-11-03, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (ANOTHER POPULATION, D507's one night: beside, never pooled)
""", """# J186's night, read only, as information (aborted 2026-11-03 at 16:37 by its own unit_errors abort, its Report never run: `report`
# reads 0 and `atlases` 12): what compare.py and labels.py's c_sizingRead will read at the Report -- nothing, so they read null (THE
# SAME POPULATION, D508's first night; its by-hand numbers are in the job file)
""")
# the Report block
put("""# J185's night, read only, for the J185 columns (compare.py) and J185's sizing read (labels.py --j185): ANOTHER POPULATION (D507's
# one night), read beside, never pooled; absent files read as null""",
    """# J186's night, read only, for the J186 columns (compare.py) and J186's sizing read (labels.py --j186): THE SAME POPULATION (D508's
# first night), read beside and pooled by hand; J186 was aborted before its Report, so lab-j186/report/ does not exist and absent files
# read as null (J186's numbers are the coordinator's by-hand report, registered in the job file)""")
put("'the 4b night-ten validation draw, made by the J186 pilot into lab-j186 at deck seeds 2640-2652",
    "'the 4b night-eleven validation draw, made by the J187 pilot into lab-j187 at deck seeds 2653-2665")
put("by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), on new decks (deck seeds 2440-2452, game seeds 2540-2552), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its first night, pooled with nothing; never with J185 (D507), J183 or J182 (D498), J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats); split by pool or randomSeat, never by sha alone",
    "by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), the seat frozen since J186s pin (D509), on new decks (deck seeds 2453-2465, game seeds 2553-2565), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its second night, pooled with J186 (its first, twelve spines); never with J185 (D507), J183 or J182 (D498), J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats); split by pool or randomSeat, never by sha alone")
# the abort paragraph
put("""D487, D488, D495, D496 and D501-D505 amended; it is a check J185 failed, on 1 problem -- s13's one log whose source choice named a
last-known copy of a card in the other hand, which D508 hides -- as J183 failed it on 3 (s11's hideaway logs, s11's hung unit and s09's
ghost: D505-D507), J182 on the three shapes D502-D504 admit, J181 on two faults D498 and D499 close, J177 on the cascade gap D496 closes
and J176 on four gaps D492-D495 close.""",
    """D487, D488, D495, D496 and D501-D505 amended. J186 never reached it (aborted before its final checks), but would have failed it on 1
problem -- s11's 12 logs whose target record listed no option and hid its one candidate (`options: []`, `hidden: 1`, `chosen: null`:
Batroc the Leaper, a ghost in the Stack zone after a refused Multikicker payment). **That shape is known and not fixed tonight** (D510
is its lane, not landed; D509 queues it): a unit that meets it fails the check again, the summary names it as this shape, and the
checker never admits it (D507). J185 failed the check on 1 problem (a last-known copy, which D508 hides), J183 on 3 (s11's hideaway
logs, s11's hung unit and s09's ghost: D505-D507), J182 on the three shapes D502-D504 admit, J181 on two faults D498 and D499 close,
J177 on the cascade gap D496 closes and J176 on four gaps D492-D495 close.""")
put("""(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, five of J185's
s12, counted here as `pump_effect_ioobe`; J185's other exception lines were s12's 21 `TimeoutException`s from Forge's own AI eval thread
at its timeout (D465's shape), caught by the engine and no branch error; a `StackOverflowError` in a branch row is counted here as
`stack_overflows`)""",
    f"""(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, five of J185's
s12 and {PUMP['s11']} of J186's s11, counted here as `pump_effect_ioobe`; J186's other exception lines were s01's {TEX['s01']} and s04's {TEX['s04']}
`TimeoutException`s from Forge's own AI eval thread at its timeout (D465's shape; J185's s12 had 21), caught by the engine and no
branch error, and s11's {NPE} `NullPointerException`s in `AiController.chooseSpellAbilityToPlayFromList` after "No AI assigned for API:
null" (Forge's AI meeting an ability stranded by a refused payment); a `StackOverflowError` in a branch row is counted here as
`stack_overflows`)""")
put("`unit_errors == 0` means every unit of the 13 spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169.",
    f"""`unit_errors == 0` means every unit of the 13 spines finished; `atlas.unitsShort` and `atlas.fullShort` as J169. **`unit_errors >
20` aborted J186** at 16:37 on s13's 29 failed units (every branch unit from d23 on failed twice, "the replay diverged at decision
23": the baseline's d20 lists `cast:35` twice, Dog Walker's face-up and disguise casts; D511 is its lane, not landed); it stays, and
**`replay_diverged`** counts the units.jsonl lines naming a divergence (information; J186: {N['replay']}, 29 of them s13's failed units and 2
s04's units that replayed on their second attempt).""")
# the summary
span('- **The population, first line:**', '- **The run:**', """- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's,
  D494's and D506's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck
  seeds 2453-2465, game seeds 2553-2565) branched by J187 at the pin, by D488's random seat policy forking on D498's determinizer behind
  D508's gate, the seat frozen since J186's pin (D509), the SECOND night of D508's population**: `training: true`, `pool:
  random-<band>-d508`, `randomSeat: "D508"`, contract v6 with `branchRandom: 150` and the partial rows marked; **pooled with J186's
  twelve finished spines** (the same pool names; nothing under the seat changed since J186's pin) **and with nothing else: not J185's
  rows (D507's population: the gate before D508), not J183's and J182's (D498's), not J181's (D497's), not J177's and J180's (D493's),
  not J173's nor anything older** (D489, D509); the units whose logs failed the checker are named, so a reader pooling leaves their
  rows out (D509 point 4).
""")
span('- **The run:**', '- **The yield, the number to read**', f"""- **The run:** exits, walls per spine and for the night (against J186's twelve, {N['wall']:,} s, and the ~11 h at 6 workers *Sizing* now
  expects), rows, timeouts, unit errors, engine errors (with any errored row's stack from the worker logs), capped, D479's and D477's
  counters, disk. **Whether J186's two open faults came back** (D509 queues both; neither is fixed tonight): **`replay_diverged`**, the
  units.jsonl lines naming a replay divergence (J186: {N['replay']}; D511 pending), per spine with the decision, the baseline's token and the
  card where traced, and whether a unit failed on it (`unit_errors`; the abort at 20); and any checker failure on **the all-hidden
  target record** (`options: []`, `hidden: 1`, `chosen: null`; J186's s11: 12 logs; D510 pending), per spine with the card -- a known
  shape, named as such and excluded, never admitted, its units named for a reader pooling (D509 point 4). **Whether J185's fault stayed
  closed**: no branch log failed the checker on a record naming a last-known copy of a card in the other hand, and
  **`lki_candidates`**, the worker logs' `[lki]` lines (D508: one a record a last-known copy was left out of; J186: 0), per spine with
  the card where traced -- information, the places D508's gate changed a list. **Whether J183's three faults stayed closed**: no branch
  log failed the checker on an opponent's hideaway card whose look was kept while the card stayed in exile, or whose dig came frames
  after its host entered (D505; the D502 stats-line count per spine, as information); no target record named a card in the Stack zone
  with no stack instance, and **`ghost_candidates`**, the worker logs' `[ghost]` lines (D507; J186: {GHOST['s11']}, all s11's, card 63), per
  spine; no deck held Old Man of the Sea or Rubinia Soulsinger, **`stack_overflows`**, the branch rows naming a `StackOverflowError`
  (J183: 70, all s11's; J185 and J186: 0), per spine, and no unit hung (D506). **Whether J182's three checker shapes and J181's three
  gaps stayed closed**: no branch log failed the checker on an opponent's hideaway card after its host's control was taken, on another
  seat's ceased token or on an opponent's cast between frames (D502-D504; their three stats-line counts per spine, as information), no
  A6 failure on a card the seat may look at (D498), no id problem from a killed attempt's rows and `abandonedPlays` said when a unit was
  re-run (D499; J183: one, s11's; J185: none), no `getDamageLKI` and no `paperCard` in any errored branch's stack, `damageLkiLost` 0,
  and no bare exception in any worker log (D500, D497), no checker failure on a cascade's "cast it?" inside a held frame (D496), no
  Prepare card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or Foretold cast, no checker
  failure on a spell copy on the stack (and every spell copy still listed under D507's and D508's gate). **J182's engine stack,
  counted**: `pump_effect_ioobe`, the lines `at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker
  logs (Forge's `IndexOutOfBoundsException`, `FCollection.get` on an empty list; J182: 1, in s11's d10; J183: 0; J185: 5, all s12's;
  J186: {PUMP['s11']}, all s11's), per spine, each with its branch and its exception line -- information, an engine fault and never a verdict
  on a card; and Forge's own AI-eval `TimeoutException`s and AI `NullPointerException`s per spine (J186: s01 {TEX['s01']}, s04 {TEX['s04']}; s11 {NPE}
  NPEs), as information.
""")
put("""beside it **J185's** (0.376 a worker-hour, 26.3 a 7-worker night [16.1, 40.7]; another population, D507's one night,
  other decks), **J183's** (0.483, D498's second), **J182's** (0.451, D498's first), **J181's** (0.464), **J180's** (0.551), **J177's**
  (0.563) and **the review's ~46 [41, 51]**, all as other populations.""",
    f"""beside it **J186's** ({N['cpwh']} a worker-hour [{N['cpwh95'][0]}, {N['cpwh95'][1]}], {N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}], on {N['wh']}
  worker-hours over twelve spines: this population's first night, from the by-hand report, since `c_sizingRead.j186` reads null) and
  **the two nights pooled** (confident labels over worker-hours, by hand), then **J185's** (0.376, 26.3 [16.1, 40.7]; D507's one
  night), **J183's** (0.483, D498's second), **J182's** (0.451, D498's first), **J181's** (0.464), **J180's** (0.551), **J177's**
  (0.563) and **the review's ~46 [41, 51]**, all as other populations.""")
put("""**Say that this
  is the first night of D508's population's pooled read** (`pooledInputs`); that J185's 0 of 13 (D507's; in `labels.json`
  `c_sizingRead.j185.futilityRead`), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are
  other populations' and are not added in; and that ~10-14 controls cannot tell .04 from .2.""",
    f"""**Say that this
  is the second night of D508's population's pooled read** (`pooledInputs`): add J186's {N['ctlConf']} of {N['controls']} controls confident ({N['stopped']}
  stopped, {N['read']} read; this file's by-hand numbers, since `c_sizingRead.j186.futilityRead` reads null) to this night's and give the
  pooled share with its exact 95% interval beside this night's own; that J185's 0 of 13 (D507's), J183's 0 of 11 and J182's 0 of 6
  (D498's), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not added in; and whether the pooled
  ~20-30 controls can yet tell .04 from .2.""")
put("beside the review's 54%, 68% and 87% and J185's, J183's, J182's, J181's, J180's and J177's own (their `ncurve.json`);",
    "beside the review's 54%, 68% and 87% and J185's, J183's, J182's, J181's, J180's and J177's own (their `ncurve.json`; J186 has\n  none, its Report never ran);")
put("against J185's 14.4, J183's 12.4, J182's 15.2, J181's 11.8, J180's 8.08 and J177's 9.31**.",
    f"against J186's {N['perSpine']} (twelve spines), J185's 14.4, J183's 12.4, J182's 15.2, J181's 11.8, J180's 8.08 and J177's 9.31**.")
put("and for the night beside J185's (0.16%), J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)",
    "and for the night beside J185's (0.16%), J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%) (J186's\n  was never computed: its scan block never ran)")
put("""with J185's values at the same positions beside
  (another population, D507's; other decks);""", """with J186's values at the same positions beside
  where its atlas.json gives them (the same population; other decks; s13 has none, killed by the abort; J186 has no reads.json);""")
put("- **J186 beside J185, by position** (`compare-j185.json`): **a table, one row a position and a night row**:",
    "- **J187 beside J186, by position** (`compare-j186.json`, whose J186 column is null -- J186's report was never written -- so the J186\n  side comes from this file's decks table and *Why J187*): **a table, one row a position and a night row**:")
put("""**labelled: different decks, the same seat policy and
  design, the seat's gate changed (D508); a candidate, never a verdict** -- no difference is D508's by itself.""",
    """**labelled: different decks, the same population and
  seat (D508's, frozen by D509); a candidate, never a verdict** -- no difference is the seat's.""")
# the header's rule line: D509 named
put(" and D508 (the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's zone: the population J186 opens); D447 (the deck draw)",
    ", D508 (the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's zone: the population J186 opened and J187 continues) and D509 (the atlas seat frozen between landings: J187 runs on J186's seat, its pin adding D509's docs only; a seat fault waits in the seat queue); D447 (the deck draw)")

# registered history the comparison move must not touch (found by the first run's audit): D507 opened J185's population, and J183's
# draws were registered by derive-j185.py
put("the population J185 opened)", "the population J185 opened)", 0)
put("read by derive-j185.py", "read by derive-j185.py", 0)

# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
hist = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'J186', t)
        if not re.match(r'J186(:| v5| deck| draws| scan| pilot|-atlas)', t[m.start():m.start() + 12]) and 'homes-J186' not in t[m.start() - 6:m.start() + 4]]
print('J186 mentions before the job-name move, outside echo/print prefixes (each must be this job\'s own):', len(hist))
for ctx in hist:
    print('   ', ctx)
t = t.replace('J186', 'J187').replace('j186', 'j187')
t = t.replace('drafts/J187-atlas-4b-night-ten.md', 'drafts/J187-atlas-4b-night-eleven.md')
left = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'[Jj]185', t)]
print('J185 left before the comparison move (each becomes J186):', len(left))
for ctx in left:
    print('   ', ctx)
t = t.replace('J185', 'J186').replace('j185', 'j186')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, +13
# ======================================================================================================================================
RANGES = [(2439, 2452), (2539, 2552), (2639, 2652), (2739, 2752)]
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
# 4. the decks table: J186's column (after the shift, so its seeds stay J186's)
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
RS = ('none fell in the shifted ranges but the seeds themselves (no registered self-test value lies in [2439, 2452] or its companions)'
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


PUBLIC_TITLE = 'Move atlas 4b night eleven: 13 new spines, D508 population night two'
setline('id: ', 'J187')
setline('title: ', f"The move atlas, rung 4b, night eleven -- J186's night carried onto the same seat (D509: the atlas seat frozen between landings; the pin {P8} adds D509's docs to J186's e557dedf, `bridge/src` byte-identical; J186's two seat faults, the all-hidden target record and the replay divergence, wait in D509's queue as D510 and D511) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j187, at deck seeds 2453-2465 (D447 with D482's list as D490, D492, D494 and D506 leave it, the bands cycled as J166's) and game seeds 2553-2565; a validation draw made fresh at deck seeds 2653-2665 (game seeds 2753-2765 reserved); THE SECOND NIGHT OF D508'S POPULATION, pooled with J186's twelve finished spines; J186's night read beside, by position")
setline('public_title: ', PUBLIC_TITLE)
setline('public_est: ', '~9 h to 13 h')
setline('public_decides: ', 'None by itself; second night of the D508 population, pooled with J186')
setline('repos: ', "mtg-table@%s (origin/main: the merge of D509 on e557dedf (J186's pin, the merge of D508), docs only, pushed; written by derive-j187.py from its argument; merged == 1, the commits that added D481-D509's decision files, D493's, D495's to D508's names, the seat's code and the deck code exactly as this file states them -- J186's, byte for byte, plus D509's frozen-set test -- every pin-decided value computed from the pin, checked by the pilot)" % PIN)
setline('decides: ', f"nothing by itself. Rung 4b's eleventh night, the ninth on D489's futility stop with the review's 150 cap, and **the SECOND of D508's population**. **What changed under the seat since J186:** nothing. **D509** (merged on J186's pin as docs only, 2026-11-03) freezes the atlas seat between landings: `git diff e557dedf <pin> -- {FROZEN}` is empty (a pilot check, `seat_code`, beside J186's lists, which come back byte for byte), so the random seat's POLICY is D488's, the recorder D496's, the copier's paper-card carry D497's, the redeal D498's, the copier's damage history D500's and the gate D508's (D507's Stack rule kept over the card the game holds), all as J186's; `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (`identity == 1` stays the real check). J186's two seat faults wait in D509's queue and are NOT fixed tonight: the all-hidden target record (J186's s11: a target record with no option and its one candidate hidden; D510's lane) and the replay divergence (J186's s13: a baseline listing one token twice; D511's lane). **Comparability, the rule this night follows:** D489 pools nights on one seat and opens a population on \"A future change to the seat or to what it offers\"; D509 keeps the seat unchanged between landings and lands a queue as one population boundary. So **J187's labels and reads are D508's population's second night: pooled with J186's twelve finished spines -- the same `pool`, `random-<band>-d508`, the same `randomSeat: \"D508\"`; never with J185's v6 rows (D507's population), J183's and J182's (D498's), J181's (D497's), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the units whose logs failed the checker (J186's s11 d13-d16, and tonight's if any) are named so that a reader pooling leaves their rows out (D509 point 4); the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- this night's counts the second input to this population's pooled read, J186's {N['ctlConf']} of {N['controls']} the first, with J185's 0 of 13, J183's 0 of 11, J182's 0 of 6, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside as other populations, and the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J186's {N['cpwh']} and the two nights pooled, and, as other populations, J185's 0.376, J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J186's at the same position (other decks, the same population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of J186's two open faults (`replay_diverged`, the units.jsonl lines naming a replay divergence, per spine; any checker failure of the all-hidden target record, per spine, named as that shape), of D508 (no checker failure of J185's shape; `lki_candidates`, the worker logs' `[lki]` lines, per spine), of D505-D507 as on J186 (no checker failure of J183's hideaway shape, its D502 stats-line count per spine; `ghost_candidates`, the worker logs' `[ghost]` lines, per spine; `stack_overflows`, the branch rows naming a `StackOverflowError`, and no hung unit), of D502-D504 and D497-D500 as on J183 (no checker failure of J182's three shapes; no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`; J183: 0; J185: 5; J186: {PUMP['s11']})")
setline('hypothesis: ', f"none to confirm about the maps. Registered expectations, as information: **J186's two open faults are known and may come back** -- the all-hidden target record (`options: []`, `hidden: 1`, `chosen: null`: the one candidate a ghost the seat may not see, chosen by Forge, with no `option:hidden` token on the targets path; J186's s11, 12 logs) fails its unit's check until D510 lands -- excluded, never admitted by the checker, so `atlas.problems == 0` fails the night if a deck meets it; the replay divergence (a baseline listing one token twice: J186's s13, Dog Walker's face-up and disguise casts as one `cast:35`) fails its units until D511 lands -- `replay_diverged` counts it (information; expected 0, J186: {N['replay']}, 29 of them s13's failed units and 2 s04's units that replayed on a second attempt) and `unit_errors > 20` aborts the night if it comes back at J186's scale; **the shapes D505-D508 closed stay away** -- no entity or target record names a last-known copy of a card in the other hand (D508: the record counts it in `hidden` and the worker log prints `[lki]`; `lki_candidates` counts those lines, information; J186: 0), while a copy of a card now in a public zone or the seat's own hand is still listed; an opponent's hideaway card whose look is kept while it stays in exile, after its host's control went back or the host left the battlefield, or whose dig came frames after its host entered, passes A9 (D505), counted on D502's stats line; no target record names a card in the Stack zone with no stack instance (D507; `ghost_candidates`, information; J186: {GHOST['s11']}, all s11's card 63, each a candidate left out); no deck holds a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger (D492, D494, D506; `deck_code`), so no branch row names a `StackOverflowError` (`stack_overflows`, information; J183: 70, J185 and J186: 0) and no unit hangs on that recursion; an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log (`pump_effect_ioobe` stays counted: J182 1, J183 0, J185 5, J186 {PUMP['s11']}); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes, and stays listed under D507's and D508's gate (D495, D507, D508) -- so `atlas.problems == 0` is expected but for the all-hidden record's known shape, though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as J186's would have on 1 -- the all-hidden record -- had it not been aborted first, and as it failed J185's on 1, J183's on 3 across three faults, J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J186: {N['read']} read, {N['stopped']} stopped, {N['controls']} controls, 0 partial rows confident, on twelve spines; J185: 122, 34, 13, 0; J183: 129, 43, 11, 0; J182: 123, 34, 6, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J185's and J183's (read beside, not predicted; J186's were never computed, its scan never ran; J185's refused share 0.16%, J183's 0.60%, J182's 0.92%); J186's yield, {N['confident']} confident of {N['labels']} labels over twelve spines, {N['cpwh']} confident labels a worker-hour on {N['wh']} worker-hours, is this population's first night's, read beside and pooled by hand, never predicted; J185's 20 of 88, 0.376 on 53.2 worker-hours, and J183's 0.483 are other populations'; the walls ~11 h at 6 workers for all 13 at J186's pace ({N['wall']:,} s of walls for twelve, s04's {N['maxmin']} min the longest; *Sizing*)")
setline('est: ', f"~11 h at 6 workers (range 8-13 h; sizing below): pilot ~10-40 min (J186's ran {PILOT_MIN} min from its start to its first spine; J173's ~35 with the readers' self-tests); the 13 spines ~11 h at J186's pace (13 x ~{AVG_MIN} min; J186's twelve ran {N['minmin']} to {N['maxmin']} min); the scan ~6 min; the report ~5 min. Disk ~10-15 GB on the lab data folder /home/justin-a/code/lab/data (J186's twelve spines and s13's start: {N['gb']} GB)")
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
print('\nleft-over night words (night-ten / night ten / tenth / eighth / first night / pooled with nothing / NEW with this night):')
for m in re.finditer(r'night-ten|night ten|tenth|eighth|[Ff]irst night|FIRST night|pooled with nothing|NEW with this night|opens D508|derive-j186', t):
    print('   ', t[max(0, m.start() - 70):m.end() + 40].replace('\n', ' '))
print('\nlab-j185 / lab-j186 / lab-j187 mentions:', {x: t.count(x) for x in ('lab-j185', 'lab-j186', 'lab-j187')})
print('pin %s mentions: %d; e557dedf: %d; 0a6cf5c1: %d; 3275af30: %d; ac07876b: %d; J184: %d; derive-j186: %d; derive-j187: %d'
      % (P8, t.count(P8), t.count('e557dedf'), t.count('0a6cf5c1'), t.count('3275af30'), t.count('ac07876b'), t.count('J184'), t.count('derive-j186'), t.count('derive-j187')))
print('J186 lines (comparison/history):', sum(1 for x in t.split('\n') if 'J186' in x), '  j186:', t.count('j186'), '  J185 lines:', sum(1 for x in t.split('\n') if 'J185' in x))
print('\nCOMPUTED FROM THE PIN %s (%s):' % (PIN, PIN_SUBJ[:100]))
print('  everything since e557dedf:', ALL_SINCE)
print('  bridge/src since e557dedf:', SE55 or 'nothing', '| frozen set since e557dedf:', FROZEN_SINCE or 'nothing', '| tools/cubelab + fixtures/cubelab:', LAB_SINCE or 'nothing')
print('  bridge/src since 0a6cf5c1:', S0A6 or 'nothing', '| numstat:', NUM0A6.strip() or 'none')
print('  bridge/src since 3275af30:', S327 or 'nothing', '| numstat:', NUM327.strip() or 'none')
print('  since ac07876b:', short(SAC0), '| since 7a984963:', short(S7A9))
print('  since 480c837d:', short(S480))
print('  since 6e87e5d4:', short(S6E8), '| SearchPolicy numstat:', SPNUM, '| golden unchanged:', GOLD480 and GOLD6E8, '| 480c837d ancestor:', ANC480)
print('  deckcensus.ts: %d out, %d in, out %s, in %s, shape %s; blobs %s (%s), %s (%s); cubes/library unchanged %s; list nine %s; deck files unchanged since e557dedf %s'
      % (len(D_OUT), len(D_IN), OUT_SHA[:12], IN_SHA[:12], CENSUS_SHAPE, DC_BLOB[:12], DC_LAST, UP_BLOB[:12], UP_LAST, LIB_SAME, LIST_OK, DECK_SAME))
print('  J186\'s registered deck values:', {k: (v[:12] if v else v) for k, v in J186_DECK.items()})
for d in SPEC:
    print('  has_%s at the pin: %s' % (d.lower(), 'all names present' if not HAS[d] else 'MISSING ' + '; '.join(HAS[d])))
print('  D509: %s added by %s (ancestor of the pin: %s); pin on origin/main: %s' % (D509F, D509C, D509ANC, PUSHED))
print('\nJ186 READ (by-hand report + lab-j186, read only):', {k: N[k] for k in N}, 'pilot min', PILOT_MIN, 's13 min', S13_MIN)
print('  rate, computed here:', RATE, '| labels.py --times rerun:', 'agrees' if RERUN else 'not present')
print('  replay_diverged lines:', {s: v for s, v in REPLAY.items() if v}, '| unit errors:', {s: v for s, v in UNITERR.items() if v},
      '| pump:', {s: v for s, v in PUMP.items() if v}, '| ghost:', {s: v for s, v in GHOST.items() if v}, '| TimeoutException:', {s: v for s, v in TEX.items() if v}, '| NPE s11:', NPE)
print('J186 draws registered: %d spine draws (%s ...), validation %s' % (len(J186_DRAWS), ', '.join(x[:12] for x in J186_DRAWS[:3]), J186_VAL[:12]))
print('seed grep (%s at pc-jobs %s + drafts): %d hit(s), unexpected: %s; data folders: %s' % (PAT, PCJ, len(hits), odd or 'none', DATA_HIT or 'none'))
print('\nEXPECTATIONS OF THE FINAL PIN:')
for what, ok in EXPECT:
    print('  %s  %s' % ('ok  ' if ok else 'FAIL', what))
print('\nwrote', DST, 'lines', n0, '->', len(t.splitlines()), '; public_title %r, %d chars' % (PUBLIC_TITLE, len(PUBLIC_TITLE)))
print('\nTHE RUNNER\'S CHECK (%s check):' % RUNNER)
r = subprocess.run([RUNNER, 'check', DST], capture_output=True, text=True, cwd=REPO)
outl = (r.stdout + r.stderr).splitlines()
print('  exit %d' % r.returncode)
for x in outl[-25:]:
    print('  | ' + x)
bad = [w for w, ok in EXPECT if not ok]
if bad:
    print('\nNOT POSTABLE: this pin misses %d expectation(s) of the final pin (above); the draft is written for reading only.' % len(bad))
    sys.exit(3)
sys.exit(0 if r.returncode == 0 else 2)

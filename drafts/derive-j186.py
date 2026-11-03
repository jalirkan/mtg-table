#!/usr/bin/env python3
"""Derive J186's job file from J185's, by derive-j183.py's three-trap rule (derive-j184.py's shape):
(1) rename only the job's own name (J185 -> J186), then move the comparison night (J183 -> J185) on what is left;
(2) shift the four seed ranges inclusive of their bases, [2426, 2439] and its three companions, +13, skipping any number touching a
letter, digit, dot or hex neighbour, and restore the registered numbers that fall in them BY NAME (the audit prints every change);
(3) change registered strings only on purpose, each one named here.
J186 OPENS A NEW POPULATION, D508's (`random-<band>-d508`, `randomSeat: "D508"`): D508's gate in front of what the seat sees and offers
changed under the seat since J185's pin (0a6cf5c1). J185's numbers are another population's (D507's one night), read beside by position.
EVERYTHING THE PIN DECIDES IS COMPUTED FROM THE PIN WITH GIT, never typed: the `seat_code` lists (bridge/src since each base), the
`deck_code` values (deckcensus.ts's changed lines and their sha256s, both files' blobs, the list's nine cards), and whether D505-D508's
names are there. The derivation states what it EXPECTS of the final pin (D508's files under bridge/src since 0a6cf5c1, the older lists
equal to J185's plus those files, the nine cards) and says so loudly when a pin does not meet it -- it never bends a test to pass.
Every hand edit is STASHED before the rename and the shift (a placeholder holds its final text), so neither can touch it; whatever is
not stashed is renamed and shifted mechanically, and the script prints every J183 left before the comparison move.

  python3 derive-j186.py <40-hex pin>            writes drafts/J186-atlas-4b-night-ten.md, prints the audit, runs the runner's check
Exit 0: written, every expectation of the final pin met, the checker clean. Exit 3: written, but the pin misses an expectation (a
stand-in pin): NOT POSTABLE. Exit 1: nothing written (a stash or a computation failed)."""
import fnmatch, glob, hashlib, json, os, re, subprocess, sys
from collections import Counter
from datetime import datetime

REPO = '/home/justin-a/code/mtg-table'
SRC = '/home/justin-a/code/mtg-table-pcjobs/jobs/J185-atlas-4b-night-nine.md'
DST = '/home/justin-a/code/pc-results/drafts/J186-atlas-4b-night-ten.md'
RUNNER = '/home/justin-a/code/lab/runner/tools/runner.sh'
L185 = '/home/justin-a/code/lab/data/lab-j185'      # read only
L183 = '/home/justin-a/code/lab/data/lab-j183'      # read only
LANE508 = '/home/justin-a/code/mtg-table-d508'      # read only: the D508 lane's working tree, for the names' second opinion
PREV = '0a6cf5c1ec05f03ca27d34af1b529a5e72646cea'   # J185's pin (the merge of D505-D507)
PREV2 = '3275af30498e91c03d652d021685d9847b62d95f'  # J183's pin (the merge of D502-D504)
J182PIN = 'ac07876b97e052b3e0ddd530a1930173e998133c'
if len(sys.argv) < 2 or not re.fullmatch(r'[0-9a-f]{40}', sys.argv[1]):
    sys.exit('usage: derive-j186.py <40-hex pin>   (a full sha of mtg-table, e.g. `git -C %s rev-parse <ref>`)' % REPO)
PIN = sys.argv[1]
P8 = PIN[:8]


def git(*a, ok=False):
    r = subprocess.run(['git', '-C', REPO] + list(a), capture_output=True, text=True)
    if r.returncode and not ok:
        sys.exit('git %s: %s' % (' '.join(a), r.stderr.strip()))
    return r.stdout if not ok else (r.returncode, r.stdout)


if git('rev-parse', '--verify', PIN + '^{commit}').strip() != PIN:
    sys.exit('derive-j186: %s is not a commit of %s' % (PIN, REPO))
if git('merge-base', '--is-ancestor', PREV, PIN, ok=True)[0] != 0:
    sys.exit('derive-j186: J185\'s pin %s is not an ancestor of %s' % (PREV[:8], P8))
EXPECT = []    # (what the final pin must show, met?)


def expect(what, ok):
    EXPECT.append((what, bool(ok)))


# ======================================================================================================================================
# A. computed from the pin: the seat code
# ======================================================================================================================================
def names(base, path='bridge/src'):
    return sorted(x for x in git('diff', '--name-only', base, PIN, '--', path).splitlines() if x)


def shlist(xs):      # what `... | LC_ALL=C sort | tr '\n' ' '` prints
    return ''.join(x + ' ' for x in sorted(xs))


B480, B6E8, B7A9 = '480c837d7783d2fbe1a727143dc6069344dc9bf4', '6e87e5d4a50e28649c9baa013f485da80a88aafd', '7a984963e61cdfe98cadfcc45fa7690a61dc37f6'
J183_TEN = ['bridge/src/mtgtable/GameLog.java', 'bridge/src/mtgtable/SeatRecorder.java', 'bridge/src/mtgtable/ai/Atlas.java',
            'bridge/src/mtgtable/ai/DecisionClock.java', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/DecisionSink.java',
            'bridge/src/mtgtable/ai/Determinizer.java', 'bridge/src/mtgtable/ai/LenientGameCopier.java', 'bridge/src/mtgtable/ai/PolicyControllerAi.java',
            'bridge/src/mtgtable/ai/SearchPolicy.java']
J183_7A9 = ['bridge/src/mtgtable/ai/Atlas.java', 'bridge/src/mtgtable/ai/Determinizer.java', 'bridge/src/mtgtable/ai/LenientGameCopier.java',
            'bridge/src/mtgtable/ai/SearchPolicy.java']
D507_FILES = {'bridge/src/mtgtable/ai/Decisions.java', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/SelectionSelfTest.java'}
D508_FILES = {'bridge/src/mtgtable/ai/Decisions.java', 'bridge/src/mtgtable/ai/Decision.java', 'bridge/src/mtgtable/SelectionSelfTest.java'}
S0A6 = names(PREV)
S327 = names(PREV2)
S480, S6E8, S7A9, SAC0 = names(B480), names(B6E8), names(B7A9), names(J182PIN)
NUM0A6 = ''.join(l.replace('\t', ' ') + ' ' for l in sorted(x for x in git('diff', '--numstat', PREV, PIN, '--', 'bridge/src').splitlines() if x))
NUM327 = ''.join(l.replace('\t', ' ') + ' ' for l in sorted(x for x in git('diff', '--numstat', PREV2, PIN, '--', 'bridge/src').splitlines() if x))
SPNUM = ' '.join(git('diff', '--numstat', B6E8, PIN, '--', 'bridge/src/mtgtable/ai/SearchPolicy.java').split('\t')[:2]).strip()
GOLD480 = git('diff', '--quiet', B480, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
GOLD6E8 = git('diff', '--quiet', B6E8, PIN, '--', 'fixtures/cubelab/seat-identity.json', ok=True)[0] == 0
ANC480 = git('merge-base', '--is-ancestor', B480, PIN, ok=True)[0] == 0
expect('bridge/src since J185\'s pin 0a6cf5c1 is D508\'s files only, Decisions.java among them (the lane: %s)' % ', '.join(sorted(os.path.basename(x) for x in D508_FILES)),
       S0A6 and 'bridge/src/mtgtable/ai/Decisions.java' in S0A6 and set(S0A6) <= D508_FILES)
expect('bridge/src since J183\'s pin 3275af30 is D507\'s files plus exactly those since 0a6cf5c1', S327 == sorted(D507_FILES | set(S0A6)))
expect('bridge/src since 480c837d and since 6e87e5d4 is J183\'s ten files plus exactly those since 3275af30', S480 == sorted(set(J183_TEN) | set(S327)) == S6E8)
expect('bridge/src since 7a984963 is J183\'s four plus exactly those since 3275af30', S7A9 == sorted(set(J183_7A9) | set(S327)))
expect('bridge/src since J182\'s pin ac07876b is exactly those since 3275af30 (J183\'s pin changed none)', SAC0 == S327)
expect('SearchPolicy.java since 6e87e5d4 is J183\'s "8 0" (D507 and D508 do not touch it)', SPNUM == '8 0')
expect('the seat-identity golden is unchanged since 480c837d and 6e87e5d4, and 480c837d is an ancestor', GOLD480 and GOLD6E8 and ANC480)


def short(xs):
    return ', '.join(x.replace('bridge/src/mtgtable/', '') for x in xs) if xs else 'nothing'


# ======================================================================================================================================
# B. computed from the pin: the deck code (J184's expectations, unchanged: D508 touches no deck file)
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
expect('cubes/library/ unchanged since J171\'s pin f2b4e9c2', LIB_SAME)
expect('deckcensus.ts differs from f2b4e9c2\'s in comment lines and the one throw\'s message only (%d out, %d in)' % (len(D_OUT), len(D_IN)), CENSUS_SHAPE)
expect('engine-unplayable.json is the nine cards in order (D482, D490, D492, D494, D506), Old Man and Rubinia since J183', LIST_OK)
expect('the deck code is unchanged since J185\'s pin 0a6cf5c1 (D508 touches no deck file)', DECK_SAME)


# ======================================================================================================================================
# C. D505-D508's names: one spec, written into the pilot as shell and evaluated here at the pin (and D508's at its lane's tree)
# ======================================================================================================================================
def bre(s):
    return re.sub(r'([\[\]*\\^$])', r'\\\1', s)


def q(s):
    return "'%s'" % s if "'" not in s else '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')


SPEC = {
    'D505': ('# D505 (hideaway\'s look kept while the card stays in exile, the dig tied by its trigger\'s resolution; amends D502; the names this file\n'
             '# reads, computed against the pin by derive-j186.py)',
             [('dec', 'D505'), ('grep', 'docs/decisions/D505-*.md', 'mayLookFaceDownExile'), ('grep', 'tools/check-redaction.mjs', 'const RESOLVE_WITHIN = [10, 3];'),
              ('file', 'fixtures/negative/redaction/a9-hideaway-alt-kept-after-the-host-leaves.jsonl'),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-kept-after-the-host-leaves.jsonl', 'pass'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-alt-back-after-a-gap-without-a-retake.jsonl', 'fail'"),
              ('grep', 'tools/check-redaction-selftest.mjs', "'a9-hideaway-countered-trigger-then-an-activation.jsonl', 'fail'")]),
    'D506': ('# D506 (Old Man of the Sea and Rubinia Soulsinger on the engine-unplayable list; D482\'s rule admits an overflow or hang inside one\n'
             '# step; the names this file reads, computed against the pin by derive-j186.py)',
             [('dec', 'D506'), ('grep', 'docs/decisions/D506-*.md', 'controllerChangeZoneCorrection'), ('grep', 'tools/cubelab/engine-unplayable.json', '"Old Man of the Sea"'),
              ('grep', 'tools/cubelab/engine-unplayable.json', '"Rubinia Soulsinger"'), ('grep', 'tools/cubelab/engine-unplayable.json', 'measured overflow or hang'),
              ('grep', 'tools/cubelab/deckcensus.ts', 'D506'), ('grep', 'web/test/cubelab-deck-census.test.ts', "'Old Man of the Sea', 'Rubinia Soulsinger'")]),
    'D507': ('# D507 (the seat\'s gate sees a Stack-zone card only with a stack instance or as a spell copy; the worker log\'s [ghost] line; protocol\n'
             '# M79; the names this file reads, computed against the pin by derive-j186.py; D508 keeps the Stack rule over the card the game holds)',
             [('dec', 'D507'), ('grep', 'docs/decisions/D507-*.md', 'random-<band>-d507'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean onStack('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'now.isCopiedSpell() || onStack(now)'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String ghostLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[ghost] card "'), ('grep', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'ghostLine(49)'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void ghosts()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void copies()'), ('grepline', 'docs/protocol.md', '| M79 |')]),
    'D508': ('# D508 (the seat\'s gate judges a candidate where the game holds the card now, never by a last-known copy\'s zone; the worker log\'s\n'
             '# [lki] line; protocol M80; the names this file reads, computed against the pin by derive-j186.py)',
             [('dec', 'D508'), ('grep', 'docs/decisions/D508-*.md', 'random-<band>-d508'), ('grep', 'docs/decisions/D508-*.md', 'getCardState'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static Card current('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'g.getCardState(c, null)'),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'public static boolean lastKnown('), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static String lastKnownLine('),
              ('grep', 'bridge/src/mtgtable/ai/Decisions.java', '"[lki] card "'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'return visibleAt(current(c), ai);'), ('grep', 'bridge/src/mtgtable/ai/Decisions.java', 'static boolean visibleAt('),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'private static void lastKnown()'),
              ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'g.copyLastState();'), ('grep', 'bridge/src/mtgtable/SelectionSelfTest.java', 'an ability whose host object is now in seat 0'), ('grepline', 'docs/protocol.md', '| M80 |'),
              ('grep', 'docs/evidence/cube-lab.md', '## 12. J185\'s checker failure (D508')]),
}


def shell_of(d, items):
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
    v = 'var/lab-j186-local/has-%s.txt' % d.lower()
    return ' && '.join(out) + ' && echo 1 > %s || echo 0 > %s' % (v, v)


def files_at(path):
    """{name: text} of the pin's files matching path (a glob on the last part)"""
    d, pat = os.path.split(path)
    ls = [x for x in git('ls-tree', '--name-only', PIN, d + '/').splitlines() if x]
    return {x: git('show', '%s:%s' % (PIN, x)) for x in ls if fnmatch.fnmatch(os.path.basename(x), pat)}


def files_in(root, path):
    return {x: open(x, errors='replace').read() for x in glob.glob(os.path.join(root, path))}


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
LANE = evaluate(SPEC['D508'][1], lambda p: files_in(LANE508, p)) if os.path.isdir(LANE508) else ['no lane tree']

# ======================================================================================================================================
# D. J185's night, read only (the history paragraphs, the J185 column, the registered draws)
# ======================================================================================================================================
lb = json.load(open(L185 + '/report/labels.json'))
cu = json.load(open(L185 + '/report/cuts.json'))['night']
tool = json.load(open(L185 + '/report/tool.json'))
dr = json.load(open(L185 + '/report/draws.json'))
assert all(dr['asRun'][k] == dr['recorded'][k] for k in ('spines', 'validationBySet', 'all13', 'validation', 'smoke')), 'J185 draws: asRun != recorded'
J185_DRAWS = sorted({v[0].split()[0] for v in dr['asRun']['spines'].values()})
J185_VAL = dr['asRun']['validation'].split()[0]
assert len(J185_DRAWS) == 13
dr2 = json.load(open(L183 + '/report/draws.json'))           # the method, proven on J183's registered values
assert J185_VAL != dr2['asRun']['validation'].split()[0] and dr2['asRun']['validation'].split()[0] == '6184c7e83711bc3c1b772542447f80c085d7a06f85fda5747f146e339b2d9fec'
WALL = {}
starts = []
for line in open(L185 + '/spine-times.txt'):
    f = line.split()
    WALL[f[0].split('-')[1]] = (WALL.get(f[0].split('-')[1], (0,))[0] + int(f[2]) - int(f[1]), f[3])
    starts.append(int(f[1]))
wall_s = sum(v[0] for v in WALL.values())
wh = sum(v[0] * int(v[1]) for v in WALL.values()) / 3600
mins = {k: round(v[0] / 60, 1) for k, v in WALL.items()}
J185_START = int(datetime.fromisoformat('2026-11-02T20:23:28-05:00').timestamp())
PILOT_MIN = round((min(starts) - J185_START) / 60)
c7 = lb['c_sizing7']['asRun']
fr = lb['f_futilityRead']
NOTE = {'s12': ' (five PumpEffect IOOBEs, 21 AI-eval timeouts: the engine\'s own)', 's13': ' (1 log failed the checker, D508)'}
ROWS = {}
for k in range(1, 14):
    s = 's%02d' % k
    m = lb['bySpine'][s]
    ROWS[s] = '%d / %d: %d, %d, %.1f min%s' % (2426 + k, 2526 + k, m['rows'], m['confident'], mins[s], NOTE.get(s, ''))
N = {'branched': lb['branched'], 'labels': lb['labels'], 'confident': lb['confident'], 'partial': lb['partialLabels'], 'controls': lb['futilityControls'],
     'cpwh': round(c7['confidentPerWorkerHour'], 3), 'c7': c7['confidentPer7Worker10hNight'], 'p95': c7['confidentPer7Poisson95'], 'wall': wall_s,
     'wallh': round(wall_s / 3600, 1), 'wh': round(wh, 1), 'minmin': min(mins.values()), 'maxmin': max(mins.values()),
     'games': tool['branchRows'], 'timeouts': tool['branchTimeouts'], 'perSpine': round(lb['branched'] / 13, 1), 'refused': '%.2f' % (100 * tool['refusedCastShare']),
     'read': fr['read'], 'stopped': fr['stopped'], 'ctlConf': fr['controlsConfident'], 'gb': round(sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(L185) for x in fs) / 1e9, 1)}
assert (N['games'], N['labels'], N['confident'], N['branched']) == (61355, 88, 20, 187), N
assert mins['s05'] == N['maxmin']

# ======================================================================================================================================
# E. the seeds: J186's block is unused (pc-jobs' jobs/ at its HEAD, the drafts, the data folder)
# ======================================================================================================================================
PAT = '244[0-9]|245[0-2]|254[0-9]|255[0-2]|264[0-9]|265[0-2]|274[0-9]|275[0-2]'
PCJ = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'rev-parse', '--short=8', 'HEAD'], capture_output=True, text=True).stdout.strip()
hits = subprocess.run(['git', '-C', '/home/justin-a/code/mtg-table-pcjobs', 'grep', '-n', '-w', '-E', PAT, 'HEAD', '--', 'jobs/'], capture_output=True, text=True).stdout.splitlines()
hits += subprocess.run('grep -n -w -E %s /home/justin-a/code/pc-results/drafts/*.md' % q(PAT), shell=True, capture_output=True, text=True).stdout.splitlines()
hits = [x for x in hits if 'J186-atlas-4b-night-ten.md' not in x]
odd = [x for x in hits if PAT not in x]
expect('the seed block %s is unused in pc-jobs %s jobs/ and the drafts (only a job\'s own grep line)' % (PAT, PCJ), not odd)
DATA_HIT = [p for p in glob.glob('/home/justin-a/code/lab/data/*/*') + glob.glob('/home/justin-a/code/lab/data/*/*/*') if re.search(r'-(%s)$' % PAT, p)]
expect('no folder under the lab data folder (three levels) ends in one of the block\'s seeds', not DATA_HIT)
expect('lab-j186 does not exist yet (the owner makes it, empty, before posting)', not os.path.exists('/home/justin-a/code/lab/data/lab-j186'))
PIN_SUBJ = git('log', '-1', '--format=%s', PIN).strip()
SUBJ = PIN_SUBJ if len(PIN_SUBJ) <= 150 else PIN_SUBJ[:150].rsplit(' ', 1)[0] + ' ...'

# ======================================================================================================================================
# the stash machinery (derive-j183's)
# ======================================================================================================================================
t = open(SRC).read()
n0 = len(t.splitlines())
FAIL = []
STASH = {}


def key():
    return '\x00S%d\x00' % len(STASH)


def put(old, new, count=1):
    """Replace `old` (J185's text, verbatim; `count` times, 0 = at least once) by a placeholder holding `new` (final text)."""
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
# 0. the history paragraphs, rewritten (J185's night)
# ======================================================================================================================================
span('**Why J185.**', '**Before posting -- the coordinator', f'''**Why J186.** J185 (rung 4b, night nine, the first of D507's population, pin 0a6cf5c1) ran 2026-11-02 20:23 to 2026-11-03 05:29 EST,
played all 13 spines and its Report: {N['branched']} branched decisions, {N['labels']} labels, {N['confident']} confident, {N['partial']} partial, {N['controls']} controls ({N['ctlConf']} of them confident at the full
n), {N['cpwh']} confident labels a worker-hour ({N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; J183's 0.483), all 13 spines at 6 workers, {N['wall']:,} s of walls
({N['wallh']} h; {N['minmin']} to {N['maxmin']} min a spine, s05 the longest), {N['wh']} worker-hours, {N['games']:,} branch games, {N['timeouts']} branch timeouts (J183: 1). **One check
failed:** `atlas.problems == 0` (1). Twelve spines had no problem (s12's five `PumpEffect` IOOBEs and its 21 AI-eval timeouts are the
engine's own, inside their bars). One fault, one decision merged since J185's pin:
- **s13, the last-known copy** (pauper, 2439/2539; 1 seat-1 log of 11,402, M55): seat 1's Circle of Protection: Blue source choice named
  `option:37`, seat 0's Cavern Harpy, one frame after the Harpy's own enters trigger had returned it to seat 0's hand (the stub), while
  Luminous Phantom's leaves-the-battlefield trigger on it sat on the stack. `ChooseSourceEffect` lists the trigger's card under "objects
  referred to on the stack", and for a trigger from the battlefield that card is the last-known copy; Forge's last-state snapshot stamps
  every such copy with a Battlefield zone (`Zone.getLKICopy` → `setCards` → `setZone`), and `Decisions.visible` read the copy's zone.
  **D508** makes the gate judge the card the game holds under the id (`Game.getCardState`; `Decisions.current`), so a copy of a card in
  the other hand counts in `hidden`, never listed or answered, and prints `[lki] card <id> offered as a last-known copy of a card in a
  zone the seat cannot see, left out of a record (D508)` to the worker log; a copy of a card now in a public zone, or in the seat's own
  hand, is listed as that card. The gate stands in front of every record and every list the explorer and the search draw from, so it is
  a change to what the seat offers: **J186 opens a new population** (D489, D508). `SelectionSelfTest` holds it both ways (59 checks, 12 of them this case).
- **J185's data:** s13's unit is failed; the twelve clean spines' labels are D507's population's one night, pooled with nothing. J183's
  three shapes stayed closed: 0 `[ghost]` lines, 0 `StackOverflowError`s, 0 hung units, 0 A9 failures (D505-D507); J182's three and
  J181's stayed closed too. `pump_effect_ioobe` was 5, all s12's (J183: 0; J182: 1), the night's five `branch error, stack:` lines; s12's
  21 `TimeoutException`s are Forge's own AI eval thread at its timeout (D465's shape), caught by the engine, no branch error. The refused
  payments: `refusedCastShare` {N['refused']}% for the night (J183's 0.60%), `refusedCastOptions == 0` held.

J186 is J185's night carried onto that main: the same design, the same pilot, the same reads and checks, 13 new spines at the next
seeds in a new folder, `lab-j186`. J185's own outputs stay in `lab-j185/` and are read only, for the J185 columns. **J186 is a NEW
population, D508's**: the gate in front of what the seat sees and offers changed (`git diff --name-only 0a6cf5c1 <pin> -- bridge/src` is
D508's files, `seat_code`), so J186's labels pool with nothing before them, under new pool names, `random-<band>-d508`, and J185's
numbers (D507's population, one night) are read beside, by position, as information, never added.

''')

span('**Before posting -- the coordinator', '**J177\'s design, unchanged, and its three choices', f'''**Before posting -- the coordinator, by hand (nothing in this file does them).**
1. **The data folder, empty:** `/home/justin-a/code/lab/data/lab-j186` does not exist yet (2026-11-03, when this was drafted): the owner
   makes it, empty, before posting (`mkdir`, then `ls -A` prints nothing). The pilot stops at its first lines if it is missing, and
   records once (`state`) that it holds nothing (or only this job's own pilot outputs, `decks/`, `validation/` and `pilot-smoke-j186/`,
   from an earlier J186 pilot); it draws only a folder that is absent and never creates, moves, cleans or deletes anything there; no
   block of this job has a `clean:` line.
2. **The pin is written:** `{PIN}` ({P8}: "{SUBJ}"), written by
   `drafts/derive-j186.py` from its one argument; no placeholder pin is left in this file. It must be the merge of D508 on main, gated
   once on the merged tree from a deleted `bridge/out`, the line in the merge commit's message, **and pushed to origin/main before the
   post** (J184 failed in 14 s at its prepare step on a pin that was merged but not pushed; the runner's clone fetches from GitHub).
   **If the pin moves, run `python3 drafts/derive-j186.py <the new 40-hex pin>` again**: every list below that the pin decides is
   computed from it with git.
3. **The names this file reads were computed against the pin itself** (derive-j186.py, from `git show`/`git diff` at {P8}): the four
   decision files D505-D508 and the names each `has_d505`/`has_d506`/`has_d507`/`has_d508` line reads, `seat_code` (bridge/src since
   0a6cf5c1, 3275af30, ac07876b, 7a984963, 6e87e5d4 and 480c837d, the golden, SearchPolicy.java's numstat) and `deck_code`
   (deckcensus.ts's changed lines and their sha256s, both files' blobs, the nine cards; unchanged since 0a6cf5c1). The script says when a
   pin misses what this night expects of it (D508's files under bridge/src, the nine cards, D505-D508's names) and is then NOT POSTABLE --
   a guard is never loosened to pass. D466-D504's greps are J183's, unchanged.
4. **J185 has ended** (failed on one check, `atlas.problems == 0` (1): s13's one log whose source choice named a last-known copy, D508;
   its Report written: `lab-j185/report/labels.json`, `reads.json`, `compare-j183.json` and the rest). J186 reads lab-j185 read-only,
   for its J185 columns, as information; nothing waits on another job, so there is **no `after:` line**. J185's job file needs nothing.
5. **`--decisions` stays 10.** J177's optional re-size (its item 5) is not carried: J186 compares with J185 position by position, and a
   change of design beside the new gate and the new decks would leave no position comparable at all.
6. **Nothing else to make, move or clean.** J186 reads lab-j170 (J171's night), lab-j185 (J185's), lab-j162 and lab-j158 for its
   readers' self-tests and comparisons and writes none of them; J177's 13 spine draws and its validation draw are registered below as
   constants (from J177's `var/lab-j177-local/draws-pilot.json` in the lab clone, read on 2026-10-31, J180's and J181's from their
   `report/draws.json`, read on 2026-11-01, J182's and J183's from their `report/draws.json`, read on 2026-11-02, and J185's from
   `lab-j185/report/draws.json`, read by this draft on 2026-11-03), so it reads no `var/lab-j1xx-local/` folder but its own. Post nothing
   that writes lab-j185 or lab-j186 beside J186.

''')

span('- **The control share stays 0.25**', '- **The yield number to compare across nights', '''- **The control share stays 0.25**, not D489's default 0.1. J177 planned to drop to 0.1 "once the pooled control count is enough";
  D508's population holds no control before tonight, and tonight's ~6-14 are its first (D507's holds J185's 13, D498's J182's 6 and
  J183's 11, D497's J181's 13, D493's J177's 12 and J180's 14: 0 of 69 confident, all read beside); 0.25 holds until this population's
  pooled count can carry the read.
''')

span("**So J185 is D507's population's first night, on new spines**", '**The seeds are new', '''**So J186 is D508's population's first night, on new spines** (`decides:`): the seat's policy is D488's, the recorder D496's, the
copier's carry D497's, the redeal D498's and the copier's damage history D500's, all as J185's; **the gate in front of what the seat
sees and offers is D508's** (`Decisions.visible`: a candidate judged where the game holds the card now, never by a last-known copy's own
zone; D507's Stack rule kept over that card), shared by the entity and target records, the explorer's candidate lists, `staleTargets`'
fill and the search's target alternatives -- a change to what the seat offers, so `pool: random-<band>-d508`, `randomSeat: "D508"`,
contract v6, pooled with nothing. **Breadth over depth:** 13 new pairs at the next 13 deck seeds (the bands cycled as J166's, so s01 is
pauper and s13 pauper again), into a new folder. **J185's numbers are a comparison by position, never a baseline**: s01 beside s01 is
the same band and the same branching design, but another population, other decks and other seeds -- every difference is a candidate.
J183's, J182's, J181's, J180's, J177's, J173's and J171's nights stay other populations and appear only in the readers' self-tests,
their registered expectations and J177's sizing paragraph.

''')

SEEDS_P = f'''**The seeds are new** (checked by derive-j186.py, 2026-11-03): J185's block plus 13 -- deck seeds **2440-2452** (`$((2439 + K))`), game
seeds **2540-2552** (the deck seed + 100), validation deck seeds **2640-2652** (`$((2639 + K))`) with game seeds **2740-2752**
reserved. `git -C /home/justin-a/code/mtg-table-pcjobs grep -n -w -E
'{PAT}' {PCJ} -- jobs/` (pc-jobs at {PCJ}, J185's post) finds only a job's own
grep line, no seed, and so does the same grep over `/home/justin-a/code/pc-results/drafts/*.md`; every computed seed in a job or draft
is an earlier block's (`$((2000 + K))` to J181's `$((2078 + K))` and their game and validation companions, 2001-2091 and 2101-2391, with
the older blocks' small ones below 1700) or J182's, J183's and J185's `$((2400 + K))`, `$((2413 + K))`, `$((2426 + K))` and their
companions (2401-2439, 2501-2539, 2601-2639, 2701-2739, lab-j182's, lab-j183's and lab-j185's; J184 reserved J185's block and never
drew); and no folder under `/home/justin-a/code/lab/data` (three levels deep) ends in one of this block's. The game seeds stay in the
25?? hundreds, so every `lab-j186` glob keeps `b-s??-*-25??`, and the comparison's `lab-j185` globs read `25??` as J185's read
lab-j183's. Bases and literals were moved together by one inclusive shift of J185's block ([2426, 2439] and its three companions, +13),
skipping any number touching a letter, a dot or a hex digit, and every changed four-digit token was read in context (derive-j186.py's
audit): RESTORED_SENTENCE The smoke keeps J166's pair (deck seed 2099) at game seed 2199, in a new folder, as every pilot since J167;
that pair holds none of the nine cards D482-D506 list, and its redraw on the nine-card list (at aab15d29, D506's merge) gave J166's
registered sha256 back (`edfdc861...`, 0 skips), so its draw on the list is J166's.

'''
span('**The seeds are new', '## The decks', '\x00SEEDS\x00')

# ======================================================================================================================================
# 1. hand edits in the body, stashed with their final text (J186's own name, J185 as the comparison)
# ======================================================================================================================================
# the decks: nine cards, the registered draws
put("""and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's or J183's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are registered
from J177's own `draws-pilot.json`, J180's to J183's from their `report/draws.json`).""",
    """and no spine draw may be one of J171's, J173's, J177's, J180's, J181's,
J182's, J183's or J185's 13 registered draws, and the validation draw none of theirs (a guard against an unshifted seed; J177's are
registered from J177's own `draws-pilot.json`, J180's to J185's from their `report/draws.json`).""")
span("**The deck code is J171's pin's plus exactly D490, D492, D494 and D506**", "**The sha256s are recorded, not registered.**", f'''**The deck code is J171's pin's plus exactly D490, D492, D494 and D506** (`deck_code`, the pilot; every value computed from the pin by
derive-j186.py, unchanged since J185's pin 0a6cf5c1: D508 touches no deck file): `cubes/library/` untouched since J171's pin f2b4e9c2;
`tools/cubelab/deckcensus.ts` differs from f2b4e9c2's in {len(D_OUT)} lines out and {len(D_IN)} in and nothing else -- the header comment of its point 5
(the list's cards and decisions named, D506's wording: what lists a card is the file's own `about`) and the doc comment and the error
message of `parseEngineUnplayable`, the throw's condition unchanged -- the changed lines' sha256s registered; and
`tools/cubelab/engine-unplayable.json` is J171's pin's two-key list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at
J177's pin (`since: "J173"`, D490), then Emeritus of Abundance, Elite Interceptor, Emeritus of Ideation, Studious First-Year (D492) and
Ob Nixilis, the Adversary (D494), each `since: "J176"`, then Old Man of the Sea and Rubinia Soulsinger (D506), each `since: "J183"`; and
both files' blobs are the pin's, byte for byte (last changed by {LASTS}, the `about` line's D506 sentence included). J185's guard
accepted the same nine, and so does this one, nothing else, so **the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old
Man of the Sea or Rubinia Soulsinger**.

''')
# the decks table: J185's column (the rows themselves are replaced after the shift)
put("| J183 at this position (another population, D498's; the same seat policy and design; other decks): decisions branched, confident labels, wall |",
    "| J185 at this position (another population, D507's; the same seat policy and design; other decks): decisions branched, confident labels, wall |")
put("(J183's numbers from `lab-j183/report/labels.json`'s `bySpine` (`rows`, `confident`) and `spine-times.txt`, read only on 2026-11-02; all\n13 at 6 workers.",
    "(J185's numbers from `lab-j185/report/labels.json`'s `bySpine` (`rows`, `confident`) and `spine-times.txt`, read only on 2026-11-03; all\n13 at 6 workers.")
# the design: the gate under the seat
put("copier with D497's carry and D500's damage history, and D498's redeal (J183's); the gate in front of what the seat sees and offers is\nD507's (`Decisions.visible`: a Stack-zone card only with a stack instance, or a spell copy).",
    "copier with D497's carry and D500's damage history, and D498's redeal (J185's); the gate in front of what the seat sees and offers is\nD508's (`Decisions.visible`: a candidate judged where the game holds the card now, never by a last-known copy's zone; D507's Stack rule\nkept over that card).")
# sizing: J185's walls beside J177's
span("**Sizing: J177's, unchanged; J183's walls beside it.**", "measured the design:",
     f"""**Sizing: J177's, unchanged; J185's walls beside it.** J185's 13 spines, all at 6 workers, took {N['wall']:,} s of walls ({N['wallh']} h; {N['minmin']} to
{N['maxmin']} min a spine, s05 the longest), {N['wh']} worker-hours, {N['games']:,} branch rows, {N['branched']} decisions branched ({N['perSpine']} a spine; J183's 161,
12.4; J182's 198, 15.2; J181's 153, 11.8; J180's 105, 8.08). J177
""")
# the label set
put("| `pool` | **`random-<band>-d507`**: D507's population, NEW with this night; never J183's and J182's `random-<band>-d498`, J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |",
    "| `pool` | **`random-<band>-d508`**: D508's population, NEW with this night; never J185's `random-<band>-d507`, J183's and J182's `random-<band>-d498`, J181's `random-<band>-d497`, J177's and J180's `random-<band>-d493` nor J173's `random-<band>-d488` (`decides:`) |")
put("| `randomSeat` | **`\"D507\"`** on every row: the decision that opened the population (labels.py's `--seat` default, now D507; J183's and J182's rows say \"D498\"). The seat's policy is D488's |",
    "| `randomSeat` | **`\"D508\"`** on every row: the decision that opened the population (labels.py's `--seat` default, now D508; J185's rows say \"D507\", J183's and J182's \"D498\"). The seat's policy is D488's |")
put("""**Never
  pooled with J183's or J182's v6 rows (D498's population), J181's, J180's or J177's v6 rows, J173's v5 rows, or v1-v4** (D489, D507,
  *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`), never on `sha` alone.""",
    """**Never
  pooled with J185's v6 rows (D507's population), J183's or J182's (D498's), J181's, J180's or J177's v6 rows, J173's v5 rows, or
  v1-v4** (D489, D508, *Comparability*; `decides:`): a model that reads several nights splits on `pool` (or `randomSeat`), never on
  `sha` alone.""")
# the pre-registered reads (c), (f), (xvii)
put("""Beside it, **as information: J183's** (read from `lab-j183/report/labels.json` at the Report, `--j183=`;
  ANOTHER POPULATION -- D498's second night, before D507's gate -- the same design, other decks: 0.483 a worker-hour on 62.2
  worker-hours; J182's 0.451, J181's 0.464, J180's 0.551, J177's 0.563, other populations too) and **the""",
    f"""Beside it, **as information: J185's** (read from `lab-j185/report/labels.json` at the Report, `--j185=`;
  ANOTHER POPULATION -- D507's one night, before D508's gate -- the same design, other decks: {N['cpwh']} a worker-hour on {N['wh']}
  worker-hours; J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551, J177's 0.563, other populations too) and **the""")
put("""**This night's numbers are the FIRST contribution
  to D507's population's pooled read** (`pooledInputs`); J183's 0 of 11 and J182's 0 of 6 (D498's population; J183's in
  `c_sizingRead.j183.futilityRead`, read at the Report), J181's 0 of 13 (D497's), J177's 0 of 12 and J180's 0 of 14 (D493's) are read
  beside, as information, never added.""",
    f"""**This night's numbers are the FIRST contribution
  to D508's population's pooled read** (`pooledInputs`); J185's {N['ctlConf']} of {N['controls']} (D507's population; in
  `c_sizingRead.j185.futilityRead`, read at the Report), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13 (D497's), J177's 0 of
  12 and J180's 0 of 14 (D493's) are read beside, as information, never added.""")
put("""- **(xvii) J185 beside J183, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE SEAT'S TARGET GATE CHANGED (D507)**
  (compare.py, `report/compare-j183.json`; J183's column computed from its folders and report with the same code)""",
    """- **(xvii) J186 beside J185, BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE SEAT'S GATE CHANGED (D508)**
  (compare.py, `report/compare-j185.json`; J185's column computed from its folders and report with the same code)""")
put("""**A candidate, never a verdict**: the decks differ at every position, so no difference is D507's by
  itself, and J183's s09 and s11 carry the faults D507 and D506 answer.""",
    """**A candidate, never a verdict**: the decks differ at every position, so no difference is D508's by
  itself, and J185's s13 carries the fault D508 answers.""")
# the pilot's prose: D497-D508 and the seat code
put("""**D497-D507** (`has_d497` to `has_d507`: each decision's file and the names its lane added, as the
pilot's lines list them; D505-D507's computed against the pin by derive-j185.py), the commits that added D481-D507's decision files""",
    """**D497-D508** (`has_d497` to `has_d508`: each decision's file and the names its lane added, as the
pilot's lines list them; D505-D508's computed against the pin by derive-j186.py), the commits that added D481-D508's decision files""")
put("J173's plus D493's, D496's, D497's, D498's and D500's, and D507's since J183's pin** (`seat_code`, its lists computed from the pin:",
    "J173's plus D493's, D496's, D497's, D498's and D500's, D507's since J183's pin 3275af30 and D508's since J185's pin 0a6cf5c1** (`seat_code`, its lists computed from the pin:")
# the guards: D502-D504's comment keeps its history; D505-D508's lines from the spec
put("# D502-D504 (the redaction checker admits J182's three shapes; the names this file reads, checked against J183's pin 3275af30 by hand,\n# and present at this pin: D505 amends D502's rule and keeps them)\n",
    "# D502-D504 (the redaction checker admits J182's three shapes; the names this file reads, checked against J183's pin 3275af30 by hand,\n# and present at this pin: D505 amends D502's rule and keeps them)\n")
G508 = ''.join(SPEC[d][0] + '\n' + shell_of(d, SPEC[d][1]) + '\n' for d in ('D505', 'D506', 'D507', 'D508'))
SEAT_BLOCK = f'''# the random seat's POLICY is J173's and J177's (D488's); the copier it forks on is D493's, as J177's; the recorder is D496's; the gate in
# front of what it sees and offers is D508's (`decides:`). Every list below was computed from the pin {P8} by derive-j186.py, never typed:
# D495's merge (480c837d, J177's pin) is an ancestor of the pin, and the seat-identity golden is unchanged since it and since J173's pin
# (6e87e5d4); bridge/src since 480c837d and since 6e87e5d4 is J183's ten files (D496's six with GameLog.java's comment-only javadoc,
# D497's and D500's LenientGameCopier.java, D498's Determinizer.java and Atlas.java, D500's SearchPolicy.java) and what J183's pin
# gained since; SearchPolicy.java since 6e87e5d4 is {SPNUM!r} (D493's self-test accessor 5 lines plus D500's 3); since 7a984963 J183's
# four and the same; since J182's pin (ac07876b) and since J183's pin (3275af30, D502-D504's merge) bridge/src changed in exactly:
# {short(S327)} (numstat {NUM327.strip() or 'none'}); since J185's pin (0a6cf5c1, D505-D507's merge) in exactly: {short(S0A6)}
# (numstat {NUM0A6.strip() or 'none'})
sc=0
SEAT_480="{shlist(S480)}"
if git merge-base --is-ancestor {B480} HEAD && git diff --quiet {B480} HEAD -- fixtures/cubelab/seat-identity.json && git diff --quiet {B6E8} HEAD -- fixtures/cubelab/seat-identity.json; then
  test "$(git diff --name-only {B480} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "$SEAT_480" && test "$(git diff --name-only {B6E8} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S6E8)}" && test "$(git diff --numstat {B6E8} HEAD -- bridge/src/mtgtable/ai/SearchPolicy.java | cut -f1,2 | tr '\\t' ' ')" = "{SPNUM}" && test "$(git diff --name-only {B7A9} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S7A9)}" && test "$(git diff --name-only {J182PIN} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(SAC0)}" && test "$(git diff --name-only {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S327)}" && test "$(git diff --numstat {PREV2} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{NUM327}" && test "$(git diff --name-only {PREV} HEAD -- bridge/src | LC_ALL=C sort | tr '\\n' ' ')" = "{shlist(S0A6)}" && test "$(git diff --numstat {PREV} HEAD -- bridge/src | LC_ALL=C sort | tr '\\t\\n' '  ')" = "{NUM0A6}" && sc=1
fi
echo $sc > var/lab-j186-local/seat-code.txt
echo "J186: seat code: the policy J173's and J177's, the recorder D496's, the copier D497's and D500's, the determinizer D498's, the gate D507's and D508's (bridge/src since J185's pin 0a6cf5c1: {short(S0A6)}): $sc"
'''
span("# D505 (hideaway's look kept while the card stays in exile, the dig tied by its trigger's resolution; amends D502; the names this file\n",
     "# D481-D496 by decision id:", G508 + SEAT_BLOCK)
put('D497 D498 D499 D500 D501 D502 D503 D504 D505 D506 D507; do', 'D497 D498 D499 D500 D501 D502 D503 D504 D505 D506 D507 D508; do')
put('has-d481-d507-commits', 'has-d481-d508-commits', 2)
put('d481_d507_commits', 'd481_d508_commits', 2)
put('metrics: has_d507 = sh: cat var/lab-j185-local/has-d507.txt 2>/dev/null || echo 0\n',
    'metrics: has_d507 = sh: cat var/lab-j186-local/has-d507.txt 2>/dev/null || echo 0\n'
    'metrics: has_d508 = sh: cat var/lab-j186-local/has-d508.txt 2>/dev/null || echo 0\n')
put('check: has_d507 == 1\n', 'check: has_d507 == 1\ncheck: has_d508 == 1\n')
# the deck code: deckcode.py and its block, every value from the pin
DECK_BLOCK = f'''# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506, and nothing else (deckcode.py's
# header): nothing since f2b4e9c2 touched cubes/library/; deckcensus.ts differs from f2b4e9c2's in D492's, D494's and D506's comment and
# message lines only; engine-unplayable.json is J171's list plus Chain of Smog (D490, as at J177's pin), the four Prepare cards (D492), Ob
# Nixilis, the Adversary (D494), and Old Man of the Sea and Rubinia Soulsinger (D506); both files the pin's blobs (computed by
# derive-j186.py from {P8}; unchanged since J185's pin 0a6cf5c1)
cat > var/lab-j186-local/bin/deckcode.py <<'PY'
# J186: the deck draw's code is J171's pin's (f2b4e9c2) plus exactly D490, D492, D494 and D506, and nothing else (`deck_code`). Reads
# var/lab-j186-local/deckcensus.diff (`git diff -U0 f2b4e9c2 HEAD -- tools/cubelab/deckcensus.ts`), unplayable-j171.json and
# unplayable-j176.json (the list at J171's pin and at J176's, cc7467f6) and the tree's own list; argv[1] and argv[2] are the pin's blobs of
# deckcensus.ts and engine-unplayable.json (`git rev-parse HEAD:<file>`). Every constant below was computed by derive-j186.py from the
# pin {P8} with git, never typed. Exits 0 when all three hold:
#   census  deckcensus.ts: {len(D_OUT)} lines out and {len(D_IN)} in, the changed lines' sha256s registered below (point 5's header comment, the doc comment and
#           the error message of parseEngineUnplayable: D492's, D494's and D506's wording), every changed line a comment or the one
#           `throw new Error(` line, whose code before the message is the same out and in (the message only);
#   list    J171's one-entry list made nine, in this order: Scute Swarm unchanged, Chain of Smog as at J177's pin (D490, since J173), the
#           four Prepare cards (D492) and Ob Nixilis, the Adversary (D494), each since J176, and Old Man of the Sea and Rubinia Soulsinger
#           (D506), each since J183, every one with a why and an evidence; `decision` D482;
#   blobs   both files byte for byte the pin's ({LASTS} last changed them), the `about` line's D506 sentence included.
# So the draw never deals a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger. Standard library only; prints one line.
import hashlib, json, sys
L = 'var/lab-j186-local/'
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
    sys.exit('J186 deck code: %s' % e)


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
print("J186 deck code: deckcensus.ts comments and the message only %d, the list J171's plus D490's, D492's, D494's and D506's %d, both blobs the pin's %d" % (census, lst, blobs))
sys.exit(0 if census and lst and blobs else 1)
PY
dc=0
if git diff --quiet {F2B} HEAD -- cubes/library/; then
  git diff --no-color --no-ext-diff -U0 {F2B} HEAD -- tools/cubelab/deckcensus.ts > var/lab-j186-local/deckcensus.diff
  git show {F2B}:tools/cubelab/engine-unplayable.json > var/lab-j186-local/unplayable-j171.json
  git show {CC7}:tools/cubelab/engine-unplayable.json > var/lab-j186-local/unplayable-j176.json
  python3 -I var/lab-j186-local/bin/deckcode.py "$(git rev-parse HEAD:tools/cubelab/deckcensus.ts)" "$(git rev-parse HEAD:tools/cubelab/engine-unplayable.json)" && dc=1
fi
echo $dc > var/lab-j186-local/deck-code.txt
echo "J186: deck code: J171's pin's plus exactly D490, D492, D494 and D506 -- the draw deals no Prepare card, no Ob Nixilis, the Adversary, no Old Man of the Sea and no Rubinia Soulsinger: $dc"
'''
span("# the deck draw's code is J171's pin's (D447 with D482's list) plus exactly D490, D492, D494 and D506", 'test -z "${CUBELAB_WORKER_XMX:-}"', DECK_BLOCK)
# the counted lines: D508's [lki] beside D507's [ghost]
GHOST = 'metrics: ghost_candidates = count /home/justin-a/code/lab/data/lab-j185/b-s??-*-25??/phaseB/logs/*.log "[ghost]"\n'
put(GHOST, GHOST.replace('lab-j185', 'lab-j186') +
    'metrics: lki_candidates = count /home/justin-a/code/lab/data/lab-j186/b-s??-*-25??/phaseB/logs/*.log "[lki]"\n')
# draws.py: J185's draws registered beside the others (lab-j185/report/draws.json's `asRun`, equal to its `recorded`, read 2026-11-03)
put("""# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01), J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read on 2026-11-02) and J183's (J183_DRAWS, J183_VALIDATION, from lab-j183/report/draws.json, read by
# derive-j185.py on 2026-11-02): none may come back here.""",
    """# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01), J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read on 2026-11-02), J183's (J183_DRAWS, J183_VALIDATION, from lab-j183/report/draws.json, read on
# 2026-11-02) and J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read by derive-j186.py on 2026-11-03): none may
# come back here.""")
J183BLOCK_END = "J183_VALIDATION = '6184c7e83711bc3c1b772542447f80c085d7a06f85fda5747f146e339b2d9fec'\n"
i = t.index("# J183's 13 spine draws and its validation draw (lab-j183/report/draws.json's `asRun`")
j = t.index(J183BLOCK_END) + len(J183BLOCK_END)
J183BLOCK = t[i:j]
pairs = ['%r, %r' % (J185_DRAWS[k], J185_DRAWS[k + 1]) if k + 1 < 13 else '%r' % J185_DRAWS[k] for k in range(0, 13, 2)]
J185BLOCK = ("# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`, equal to its `recorded`, read by derive-j186.py\n"
             "# on 2026-11-03): none may come back here either\n"
             "J185_DRAWS = {" + (',\n              '.join(pairs)) + "}\n"
             "J185_VALIDATION = %r\n" % J185_VAL)
span(J183BLOCK[:60], J183BLOCK_END, J183BLOCK + J185BLOCK)   # J183's block verbatim (kept J183 through the comparison move), J185's after it
t = t.replace(J183BLOCK_END, '', 1)
put('J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS | J183_DRAWS)', 'J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS | J183_DRAWS | J185_DRAWS)')
put('(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION, J183_VALIDATION)',
    '(J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION, J183_VALIDATION, J185_VALIDATION)')
# the J182 block's identifiers stay J182's (verbatim, as J184 kept them); J183's identifiers elsewhere, if any, stay J183's
put('J182_DRAWS', 'J182_DRAWS', 0)
put('J182_VALIDATION', 'J182_VALIDATION', 0)
# labels.py: its header, the seat, the expectation and the beside-column's population
span("# J185 (drafts/J185-atlas-4b-night-nine.md): J177's labels.py (contract v6",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): J173's labels.py",
     """# J186 (drafts/J186-atlas-4b-night-ten.md): J177's labels.py (contract v6, its string J177's: the fields are J177's), registered
# before any J186 data. What changes: nothing in the rows. J186 OPENS D508's population (D508's gate changed what the seat offers), so its
# rows pool with NOTHING before them (D489, D508, Comparability): --seat= defaults to "D508" (the self-test on J171's night still passes
# --seat=D486), the Report names the pools `random-<band>-d508`; and the sizing read's beside-column is J185's (--j185= LABELS_JSON: its
# c_sizingRead, per-worker-hour yield and futilityRead, ANOTHER POPULATION -- D507's one night -- as information, never added; null when
# absent). Every field, read and definition otherwise J177's, unchanged; the scan stamp `J186 v5`.
""")
put("SEAT = opt.get('seat') or 'D507'", "SEAT = opt.get('seat') or 'D508'")
put(r"""'expectation': 'as information, no verdict: J183 (ANOTHER POPULATION: D498\'s second night, D488\'s seat policy on D498\'s determinizer before D507\'s target gate; the same design, other decks) below as its own report read it; J182 (D498), J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations too; the review ~46 [41, 51]'}""",
    r"""'expectation': 'as information, no verdict: J185 (ANOTHER POPULATION: D507\'s one night, D488\'s seat policy on D498\'s determinizer behind D507\'s target gate, before D508\'s; the same design, other decks) below as its own report read it; J183 and J182 (D498), J181 (D497), J173 (D488, 200 branches) and J171 (D486, 28.9 [19.2, 41.8]) other populations too; the review ~46 [41, 51]'}""")
put("'population': 'D498 (its second night, before D507\\'s target gate): never pooled with this night (D507, Comparability)'}",
    "'population': 'D507 (its one night, before D508\\'s gate): never pooled with this night (D508, Comparability)'}")
# reads.py's and metrics.py's headers, metrics.py's population
put("# J185: J177's reads.py, unchanged; the pools are `random-<band>-d507` on J185's night (D507's population).",
    "# J186: J177's reads.py, unchanged; the pools are `random-<band>-d508` on J186's night (D508's population).")
span("# J185's metrics (drafts/J185-atlas-4b-night-nine.md)", "# J177's header, unchanged below:\n# J177's metrics", """# J186's metrics (drafts/J186-atlas-4b-night-ten.md): J177's metrics.py for a NEW data folder, lab-j186, where all 13 spines are
# J186's, branched at the pin by D488's random seat policy on D493's copier behind D508's gate, on J177's design; registered before
# any J186 data. What changed from J177's (every J177 key and definition kept): (a) the spine table is J186's (deck seeds 2440-2452, game
# seeds 2540-2552, the bands cycled as J166's); (b) the pools are `random-<band>-d508` and the seat "D508" (poolOk: D508's population);
# (c) compare-j185.json for the `compare` key; (d) the scan stamp `J186 v5` and the defaults lab-j186, var/lab-j186-local.
""")
put("    # each spine's rows carry its band's D507 pool, its seeds, D483's listing, D507's population, the pin, and a v5 scan\n",
    "    # each spine's rows carry its band's D508 pool, its seeds, D483's listing, D508's population, the pin, and a v5 scan\n")
put("m['pool'] == 'random-%s-d507' % SPINES[n][0]", "m['pool'] == 'random-%s-d508' % SPINES[n][0]")
put("m['randomSeat'] == 'D507'", "m['randomSeat'] == 'D508'")
# compare.py: its header, its glob's comment and its note
span("# J185 (drafts/J185-atlas-4b-night-nine.md): each spine's numbers beside J183's AT THE SAME POSITION",
     "# J177's header, unchanged below:\n# J177 (drafts/J177-atlas-4b-night-three.md): each spine's numbers beside J173's",
     """# J186 (drafts/J186-atlas-4b-night-ten.md): each spine's numbers beside J185's AT THE SAME POSITION (s01 beside s01, ...), registered
# before any J186 data. DIFFERENT DECKS (J185: deck seeds 2427-2439, game seeds 2527-2539; J186: 2440-2452, 2540-2552; the same band at
# each position), THE SAME SEAT POLICY (D488's), THE SAME FORK (D498's redeal, D500's damage history) AND THE SAME BRANCHING DESIGN (150
# random branches, the futility stop, 10 decisions), THE SEAT'S GATE CHANGED (D508): J185 is D507's population, J186 opens D508's.
# A difference is a candidate, never a verdict, and no position is a pair (the decks differ everywhere). J177's compare.py, unchanged but
# for its note: `this` is J186, `before` J185, read from lab-j185 at the Report (read only).
""")
put("# J185's folders end in 2527-2539, J183's in 2514-2526: one glob reads both", "# J186's folders end in 2540-2552, J185's in 2527-2539: one glob reads both")
put(r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE SEAT\'S TARGET GATE CHANGED: J183 (D498\'s population, its second night; deck seeds 2414-2426, 150 branches, the futility stop, 10 decisions) beside J185 (D507\'s population, its first night, behind D507\'s target gate; deck seeds 2427-2439, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D507\'s by itself: the decks differ at every position',""",
    r"""out = {'note': 'BY POSITION, DIFFERENT DECKS, THE SAME SEAT POLICY AND DESIGN, THE SEAT\'S GATE CHANGED: J185 (D507\'s population, its one night; deck seeds 2427-2439, 150 branches, the futility stop, 10 decisions) beside J186 (D508\'s population, its first night, behind D508\'s gate; deck seeds 2440-2452, the same design), the same band at each position; read confidentPerWorkerHour, not confidentShare; a difference is a candidate, never a verdict, and none is D508\'s by itself: the decks differ at every position',""")
# the pilot's smoke reads and the information block on the comparison night
put("smoke:random-powered-d507:", "smoke:random-powered-d508:", 2)
put("""# J183's night, read only, as information (it ended 2026-11-02, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (ANOTHER POPULATION, D498's second night: beside, never pooled)
""", """# J185's night, read only, as information (it ended 2026-11-03, its report written): what compare.py and labels.py's c_sizingRead will
# read at the Report (ANOTHER POPULATION, D507's one night: beside, never pooled)
""")
# the Report block
put("""# J183's night, read only, for the J183 columns (compare.py) and J183's sizing read (labels.py --j183): ANOTHER POPULATION (D498's
# second night), read beside, never pooled; absent files read as null""",
    """# J185's night, read only, for the J185 columns (compare.py) and J185's sizing read (labels.py --j185): ANOTHER POPULATION (D507's
# one night), read beside, never pooled; absent files read as null""")
put("# the night's 13 spines: b-s??-*-25?? matches no pilot folder; every row names the pin and its band's D507 pool (D507's population)",
    "# the night's 13 spines: b-s??-*-25?? matches no pilot folder; every row names the pin and its band's D508 pool (D508's population)")
put('largs="$largs $s:random-$b-d507:$((g - 100)):$g:$SHA:$d"; args="$args $s:random-$b-d507:$d/atlas.json"',
    'largs="$largs $s:random-$b-d508:$((g - 100)):$g:$SHA:$d"; args="$args $s:random-$b-d508:$d/atlas.json"')
put("'the 4b night-nine validation draw, made by the J185 pilot into lab-j185 at deck seeds 2627-2639",
    "'the 4b night-ten validation draw, made by the J186 pilot into lab-j186 at deck seeds 2640-2652")
put("by D488s random seat policy on D498s determinizer behind D507s target gate, on new decks (deck seeds 2427-2439, game seeds 2527-2539), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D507s population, its first night, pooled with nothing; never with J183 or J182 (D498), J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats); split by pool or randomSeat, never by sha alone",
    "by D488s random seat policy on D498s determinizer behind D508s gate (a candidate judged where the game holds the card), on new decks (deck seeds 2440-2452, game seeds 2540-2552), on J177s design (150 random branches, the futility stop at 50 with a 0.25 control share, 10 decisions): D508s population, its first night, pooled with nothing; never with J185 (D507), J183 or J182 (D498), J181 (D497), J177 or J180 (D493), J173 (D488) nor J166-J172 (D486 or earlier seats); split by pool or randomSeat, never by sha alone")
# the abort paragraph
put("""D487, D488, D495, D496 and D501-D505 amended; it is a check J183 failed, on 3 problems -- s11's 17 hideaway logs D505 admits, s11's
unit that Old Man of the Sea's recursion hung (D506) and s09's 463 logs that listed the ghost D507 hides -- as J182 failed it on the three
shapes D502-D504 admit, J181 on two faults D498 and D499 close, J177 on the cascade gap D496 closes and J176 on four gaps D492-D495 close.""",
    """D487, D488, D495, D496 and D501-D505 amended; it is a check J185 failed, on 1 problem -- s13's one log whose source choice named a
last-known copy of a card in the other hand, which D508 hides -- as J183 failed it on 3 (s11's hideaway logs, s11's hung unit and s09's
ghost: D505-D507), J182 on the three shapes D502-D504 admit, J181 on two faults D498 and D499 close, J177 on the cascade gap D496 closes
and J176 on four gaps D492-D495 close.""")
put("""(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, counted here as
`pump_effect_ioobe`; J183's one stack was s11's NullPointerException under Old Man of the Sea's recursion, D506, and a `StackOverflowError` in a
branch row is counted here as `stack_overflows`)""",
    """(D488's `branch error, stack:`; Forge 2.0.14's `PumpEffect.java:299` is known: one branch of J182's s11, none of J183's, five of J185's
s12, counted here as `pump_effect_ioobe`; J185's other exception lines were s12's 21 `TimeoutException`s from Forge's own AI eval thread
at its timeout (D465's shape), caught by the engine and no branch error; a `StackOverflowError` in a branch row is counted here as
`stack_overflows`)""")
# the summary
span('- **The population, first line:**', '- **The run:**', """- **The population, first line:** random library decks by band, drawn as the census draws them (D447, D482 with D490's, D492's,
  D494's and D506's cards never dealt), on J177's design (**D489's futility stop and the 150 cap**, 10 decisions); **13 NEW spines (deck
  seeds 2440-2452, game seeds 2540-2552) branched by J186 at the pin, by D488's random seat policy forking on D498's determinizer behind
  D508's gate, the FIRST night of D508's population**: `training: true`, `pool: random-<band>-d508`, `randomSeat: "D508"`, contract v6
  with `branchRandom: 150` and the partial rows marked; **pooled with nothing before: not J185's rows (D507's population: the gate before
  D508), not J183's and J182's (D498's), not J181's (D497's), not J177's and J180's (D493's), not J173's nor anything older** (D489,
  quoted: "A future change to the seat or to what it offers does" open one; D508's gate stands in front of what the seat offers).
""")
span('- **The run:**', '- **The yield, the number to read**', f"""- **The run:** exits, walls per spine and for the night (against J185's, and the ~9 h at 6 workers *Sizing* expected), rows, timeouts,
  unit errors, engine errors (with any errored row's stack from the worker logs), capped, D479's and D477's counters, disk. **Whether
  J185's fault stayed closed**: no branch log failed the checker on a record naming a last-known copy of a card in the other hand, and
  **`lki_candidates`**, the worker logs' `[lki]` lines (D508: one a record a last-known copy was left out of; J185's s13 would have
  printed 1), per spine with the card where traced -- information, the places D508's gate changed a list. **Whether J183's three faults
  stayed closed**: no branch log failed the checker on an opponent's hideaway card whose look was kept while the card stayed in exile,
  or whose dig came frames after its host entered (D505; the D502 stats-line count per spine, as information); no target record named a
  card in the Stack zone with no stack instance, and **`ghost_candidates`**, the worker logs' `[ghost]` lines (D507; J185: 0), per
  spine; no deck held Old Man of the Sea or Rubinia Soulsinger, **`stack_overflows`**, the branch rows naming a `StackOverflowError`
  (J183: 70, all s11's; J185: 0), per spine, and no unit hung (D506). **Whether J182's three checker shapes and J181's three gaps
  stayed closed**: no branch log failed the checker on an opponent's hideaway card after its host's control was taken, on another seat's
  ceased token or on an opponent's cast between frames (D502-D504; their three stats-line counts per spine, as information), no A6
  failure on a card the seat may look at (D498), no id problem from a killed attempt's rows and `abandonedPlays` said when a unit was
  re-run (D499; J183: one, s11's; J185: none), no `getDamageLKI` and no `paperCard` in any errored branch's stack, `damageLkiLost` 0, and
  no bare exception in any worker log (D500, D497), no checker failure on a cascade's "cast it?" inside a held frame (D496), no Prepare
  card and no Ob Nixilis, the Adversary in any deck, no `no ... on the copy's` error on a Plotted or Foretold cast, no checker failure on
  a spell copy on the stack (and every spell copy still listed under D507's and D508's gate). **J182's engine stack, counted**:
  `pump_effect_ioobe`, the lines `at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)` across the worker logs
  (Forge's `IndexOutOfBoundsException`, `FCollection.get` on an empty list; J182: 1, in s11's d10; J183: 0; J185: 5, all s12's), per
  spine, each with its branch and its exception line -- information, an engine fault and never a verdict on a card.
""")
put("""beside it **J183's** (0.483 a worker-hour, 33.8 a 7-worker night [22.8, 48.2]; another population, D498's second night,
  other decks), **J182's** (0.451, D498's first), **J181's** (0.464), **J180's** (0.551), **J177's** (0.563) and **the review's ~46 [41,
  51]**, all as other populations.""",
    f"""beside it **J185's** ({N['cpwh']} a worker-hour, {N['c7']} a 7-worker night [{N['p95'][0]}, {N['p95'][1]}]; another population, D507's one night,
  other decks), **J183's** (0.483, D498's second), **J182's** (0.451, D498's first), **J181's** (0.464), **J180's** (0.551), **J177's**
  (0.563) and **the review's ~46 [41, 51]**, all as other populations.""")
put("""**Say that this
  is the first night of D507's population's pooled read** (`pooledInputs`); that J183's 0 of 11 and J182's 0 of 6 (D498's; J183's in
  `labels.json` `c_sizingRead.j183.futilityRead`), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are other populations' and are not
  added in; and that ~10-14 controls cannot tell .04 from .2.""",
    f"""**Say that this
  is the first night of D508's population's pooled read** (`pooledInputs`); that J185's {N['ctlConf']} of {N['controls']} (D507's; in `labels.json`
  `c_sizingRead.j185.futilityRead`), J183's 0 of 11 and J182's 0 of 6 (D498's), J181's 0 of 13, J177's 0 of 12 and J180's 0 of 14 are
  other populations' and are not added in; and that ~10-14 controls cannot tell .04 from .2.""")
put("beside the review's 54%, 68% and 87% and J183's, J182's, J181's, J180's and J177's own (their `ncurve.json`);",
    "beside the review's 54%, 68% and 87% and J185's, J183's, J182's, J181's, J180's and J177's own (their `ncurve.json`);")
put("against J183's 12.4, J182's 15.2, J181's 11.8, J180's 8.08 and J177's 9.31**.", f"against J185's {N['perSpine']}, J183's 12.4, J182's 15.2, J181's 11.8, J180's 8.08 and J177's 9.31**.")
put("and for the night beside J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)",
    f"and for the night beside J185's ({N['refused']}%), J183's (0.60%), J182's (0.92%), J181's (0.15%), J180's (0.10%), J177's (0.35%) and J171's (0.53%)")
put("""with J183's values at the same positions beside
  (another population, D498's; other decks);""", """with J185's values at the same positions beside
  (another population, D507's; other decks);""")
put("""**labelled: different decks, the same seat policy and
  design, the seat's target gate changed (D507); a candidate, never a verdict** -- no difference is D507's by itself.""",
    """**labelled: different decks, the same seat policy and
  design, the seat's gate changed (D508); a candidate, never a verdict** -- no difference is D508's by itself.""")
# the header's rule line: D508 named
put("and D507 (the seat's target gate sees a Stack-zone card only with a stack instance or as a spell copy: the population J185 opens); D447 (the deck draw)",
    ", D507 (the seat's target gate sees a Stack-zone card only with a stack instance or as a spell copy: the population J185 opened) and D508 (the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's zone: the population J186 opens); D447 (the deck draw)")
put("D498 (the determinizer keeps what the seat may look at in place: the population J182 opened and J183 continued)",
    "D498 (the determinizer keeps what the seat may look at in place: the population J182 opened and J183 continued)")
put("# D498 (the determinizer keeps what the seat may look at; the names this file reads, checked against the merge ac07876b)",
    "# D498 (the determinizer keeps what the seat may look at; the names this file reads, checked against the merge ac07876b)")
# the derivation note of J185's own item 2 is inside the Before-posting span (rewritten); nothing of 'derive-j184' may be left
# ======================================================================================================================================
# 2. the job's own name, then the comparison night on what is left
# ======================================================================================================================================
t = t.replace('J185', 'J186').replace('j185', 'j186')
t = t.replace('drafts/J186-atlas-4b-night-nine.md', 'drafts/J186-atlas-4b-night-ten.md')
left = [t[max(0, m.start() - 70):m.start() + 50].replace('\n', ' ').replace('\x00', '#') for m in re.finditer(r'[Jj]183', t)]
print('J183 left before the comparison move (each becomes J185):', len(left))
for ctx in left:
    print('   ', ctx)
t = t.replace('J183', 'J185').replace('j183', 'j185')

# ======================================================================================================================================
# 3. the seed shift: one inclusive range a block, +13
# ======================================================================================================================================
RANGES = [(2426, 2439), (2526, 2539), (2626, 2639), (2726, 2739)]
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
RESTORED = []      # (wrong, right, why): none found in J185's text on the first run; the audit below is read for more
for wrong, right, why in RESTORED:
    if t.count(wrong) != 1:
        FAIL.append('restore %r: found %d' % (wrong, t.count(wrong)))
    t = t.replace(wrong, right)

# ======================================================================================================================================
# 4. the decks table: J185's column (after the shift, so its seeds stay J185's)
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
RS = ('none fell in the shifted ranges but the seeds themselves (no registered self-test value lies in [2426, 2439] or its companions)'
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


setline('id: ', 'J186')
setline('title: ', "The move atlas, rung 4b, night ten -- J185's night carried onto the new main (D508: the seat's gate judges a candidate where the game holds the card now, never by a last-known copy's own zone -- J185's s13, one log: a Circle of Protection source choice named the opponent's bounced Cavern Harpy by its last-known copy -- a change to what the seat offers) on J177's design, unchanged (D489's futility stop at the 50-branch checkpoint with a 0.25 control share, `--futility 0 --futility-tie 0 --futility-sample 0.25`; the 150 cap, `--branch-random 150 --early-stop 50,100`; `--decisions 10`; the Forge map on s01, s07 and s13; chunk 25); 13 NEW spines (breadth over depth) drawn by the pilot into a NEW data folder, lab-j186, at deck seeds 2440-2452 (D447 with D482's list as D490, D492, D494 and D506 leave it, the bands cycled as J166's) and game seeds 2540-2552; a validation draw made fresh at deck seeds 2640-2652 (game seeds 2740-2752 reserved); THE FIRST NIGHT OF D508'S POPULATION, pooled with nothing before it; J185's night read beside, by position, as information")
setline('public_title: ', 'Move atlas 4b night ten: 13 new spines, D508 population night one')
setline('public_est: ', '~8 h to 12 h')
setline('public_decides: ', 'None by itself; first night of the D508 population, pooled with nothing')
setline('repos: ', "mtg-table@%s (origin/main: the merge of D508 on 0a6cf5c1 (J185's pin, the merge of D505-D507), gated, its line in the merge commit's message, pushed; written by derive-j186.py from its argument; merged == 1, the commits that added D481-D508's decision files, D493's, D495's to D508's names, the seat's code and the deck code exactly as this file states them, every pin-decided value computed from the pin, checked by the pilot)" % PIN)
setline('decides: ', f"nothing by itself. Rung 4b's tenth night, the eighth on D489's futility stop with the review's 150 cap, and **the FIRST of D508's population**. **What changed under the seat since J185:** the gate in front of what it sees and offers, again. The random seat's POLICY is D488's, the recorder D496's, the copier's paper-card carry D497's, the redeal D498's, the copier's damage history D500's and the Stack rule D507's, all as J185's; **what changed is `Decisions.visible`** (D508): a candidate is judged where the game holds the card under its id (`Game.getCardState`), never by the zone the object handed in carries, so a last-known copy of a card that left the battlefield for the other hand (J185's s13: Luminous Phantom's trigger on the bounced Cavern Harpy, which `ChooseSourceEffect` listed under \"objects referred to on the stack\" with a Battlefield zone stamped by the last-state snapshot) is counted in the record's `hidden`, never listed or answered, and an `[lki]` line goes to the worker log; a copy of a card now in a public zone, or in the seat's own hand, is listed as that card. The same gate stands in front of the explorer's candidate lists, `staleTargets`' fill and the search's target alternatives, so where a last-known copy of a hidden card could reach a list it changes what the seat offers. `git diff 0a6cf5c1 <pin> -- bridge/src` is exactly the files `seat_code` lists, computed from the pin, and `fixtures/cubelab/seat-identity.json` is unchanged since D486's regeneration (a pilot check, `seat_code`; `identity == 1` stays the real check). The checker and the deck draw are unchanged since J185's pin. **Comparability, the rule this night follows:** D489 pools nights across a change to HOW MANY branches a decision gets and opens a population on \"A future change to the seat or to what it offers\"; D493, D497 and D498 opened populations when the fork changed what a branch plays, D507 when the gate changed, and D508 changes the gate again (D497 and D507 rejected the argument that the boards met none of it, and J185 meeting it once does not say what the next decks meet). So **J186's labels and reads are D508's population's first night: pooled with nothing -- a new `pool`, `random-<band>-d508`, a new `randomSeat: \"D508\"`; never with J185's v6 rows (D507's population), J183's and J182's (D498's), J181's (D497's), J177's and J180's (D493's), J173's v5 rows (D488's) nor anything before them**; the contract stays v6 (J177's fields, unchanged). It measures, on J177's design: labels, confident labels and partial labels per spine and per night; the futility read (the controls: how many of the decisions the rule would have stopped end confident at the full n -- the first read of this population, J185's {N['ctlConf']} of {N['controls']}, J183's 0 of 11, J182's 0 of 6, J181's 0 of 13, J180's 0 of 14 and J177's 0 of 12 beside it as other populations, with the review's 3 of 77); the cap read (the share of the final confident set already confident at 50 and 100 branches); the sizing read (confident labels per worker-hour and per 7-worker 10-h night with its Poisson interval, beside J185's {N['cpwh']}, J183's 0.483, J182's 0.451, J181's 0.464, J180's 0.551 and J177's 0.563 [their intervals in their `reads.json`] and the review's ~46, as information); the decisions branched a spine; the cuts' savings, the checks' share, the refused payments and D484-D488's counters as J173 reads them; C1 and agreement on the three Forge-map spines; **each spine beside J185's at the same position (other decks, another population, the same branching design): a candidate, never a verdict**; and, by hand at the morning read, the field signals of D508 (no checker failure of J185's shape; `lki_candidates`, the worker logs' `[lki]` lines, per spine), of D505-D507 as on J185 (no checker failure of J183's hideaway shape, its D502 stats-line count per spine; `ghost_candidates`, the worker logs' `[ghost]` lines, per spine; `stack_overflows`, the branch rows naming a `StackOverflowError`, and no hung unit), of D502-D504 and D497-D500 as on J183 (no checker failure of J182's three shapes; no `paperCard` or `getDamageLKI` in any errored branch's stack, no bare exception in any worker log, no A6 failure, `abandonedPlays` named if a unit re-ran, `damageLkiLost` 0), and the count of J182's one engine stack, Forge's `PumpEffect.resolve` `IndexOutOfBoundsException` (`pump_effect_ioobe`; J183: 0; J185: 5)")
setline('hypothesis: ', f"none to confirm about the maps. Registered expectations, as information: **the shape that failed J185 does not come back, J183's, J182's, J181's, J180's, J177's and J176's stay away** -- no entity or target record names a last-known copy of a card in the other hand (D508: the record counts it in `hidden` and the worker log prints `[lki]`; `lki_candidates` counts those lines, information -- J185's s13 would have printed 1 -- and `atlas.problems == 0` holds the records), while a copy of a card now in a public zone or the seat's own hand is still listed; an opponent's hideaway card whose look is kept while it stays in exile, after its host's control went back or the host left the battlefield, or whose dig came frames after its host entered, passes A9 (D505), counted on D502's stats line; no target record names a card in the Stack zone with no stack instance (D507; `ghost_candidates`, information; J185: 0); no deck holds a Prepare card, Ob Nixilis, the Adversary, Old Man of the Sea or Rubinia Soulsinger (D492, D494, D506; `deck_code`), so no branch row names a `StackOverflowError` (`stack_overflows`, information; J183: 70, J185: 0) and no unit hangs on that recursion; an opponent's hideaway card shown to the seat that took control of its host passes A9 (D502), another seat's ceased token named by last known information passes M55 (D503) and an opponent's cast from its hand between frames passes M55 (D504), each counted on its own stats line; a card the seat may look at stays where the seat knows it is on every fork (D498); a killed attempt's rows are abandoned and no id audit reads them (D499); a `DamagedBy` property on a forked board resolves (D500); a `CopyPermanent` effect choosing a token on a forked board resolves (D497), and every errored branch, if any, names its site in the worker log (`pump_effect_ioobe` stays counted: J182 1, J183 0, J185 5); a cascade's \"cast it?\" choice inside a held frame carries the engine's own `reveal` line and the checker accepts it (D496); a forced Plotted or Foretold cast from exile maps on the fork (D493); a target naming a spell copy on the stack passes, and stays listed under D507's and D508's gate (D495, D507, D508) -- so `atlas.problems == 0` is expected, though a random library deck can meet a tool gap or an engine shape no atlas has met (the check fails the night then, as it failed J185's on 1, J183's on 3 across three faults, J182's on 3 across three checker shapes, J181's on 9 across two faults, J180's and J177's on one each and J176's on 22); the rule reads ~105-155 decisions at 50 and stops about a quarter, a quarter of the futile ones played on as controls (J185: {N['read']} read, {N['stopped']} stopped, {N['controls']} controls, 0 partial rows confident; J183: 129, 43, 11, 0; J182: 123, 34, 6, 0; J181: 153, 35, 13, 0); no option has its own forced cast refused in most of its branches and no lost-cast option (checks, J173's); 0 legacy null target records (a check); refused payments, `cardTargetShare` and the target records' complete share near J185's and J183's (read beside, not predicted; J185's refused share {N['refused']}%, J183's 0.60%, J182's 0.92%); J185's yield, {N['confident']} confident of {N['labels']} labels, {N['cpwh']} confident labels a worker-hour on {N['wh']} worker-hours, and J183's 0.483 are other populations', read beside, never predicted; the walls ~9 h at 6 workers for all 13 at J185's pace ({N['wall']:,} s of walls, s05's {N['maxmin']} min the longest; *Sizing*)")
setline('est: ', f"~9 h at 6 workers (range 7-12 h; sizing below): pilot ~10-40 min (J185's ran {PILOT_MIN} min from its start to its first spine; J173's ~35 with the readers' self-tests); the 13 spines ~9 h at J185's pace (13 x ~41 min; J185's ran {N['minmin']} to {N['maxmin']} min); the scan ~6 min; the report ~5 min. Disk ~10-15 GB on the lab data folder /home/justin-a/code/lab/data (J185's 13 spines: {N['gb']} GB)")
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
print('\nlab-j183 / lab-j185 / lab-j186 mentions:', {x: t.count(x) for x in ('lab-j183', 'lab-j185', 'lab-j186')})
print('pin %s mentions: %d; 0a6cf5c1: %d; 3275af30: %d; ac07876b: %d; J184: %d; derive-j184/5: %d' % (P8, t.count(P8), t.count('0a6cf5c1'), t.count('3275af30'), t.count('ac07876b'), t.count('J184'), t.count('derive-j184') + t.count('derive-j185')))
print("lines holding 3275af30 (each must be about J183's pin, not J185's):")
for x in t.split('\n'):
    if '3275af30' in x:
        print('   ', x[:170])
print('J185 lines (comparison/history):', sum(1 for x in t.split('\n') if 'J185' in x), '  j185:', t.count('j185'), '  J183 lines:', sum(1 for x in t.split('\n') if 'J183' in x))
print('\nCOMPUTED FROM THE PIN %s (%s):' % (PIN, PIN_SUBJ[:100]))
print('  bridge/src since 0a6cf5c1:', S0A6 or 'nothing', '| numstat:', NUM0A6.strip() or 'none')
print('  bridge/src since 3275af30:', S327 or 'nothing', '| numstat:', NUM327.strip() or 'none')
print('  since ac07876b:', short(SAC0), '| since 7a984963:', short(S7A9))
print('  since 480c837d:', short(S480))
print('  since 6e87e5d4:', short(S6E8), '| SearchPolicy numstat:', SPNUM, '| golden unchanged:', GOLD480 and GOLD6E8, '| 480c837d ancestor:', ANC480)
print('  deckcensus.ts: %d out, %d in, out %s, in %s, shape %s; blobs %s (%s), %s (%s); cubes/library unchanged %s; list nine %s; deck files unchanged since 0a6cf5c1 %s'
      % (len(D_OUT), len(D_IN), OUT_SHA[:12], IN_SHA[:12], CENSUS_SHAPE, DC_BLOB[:12], DC_LAST, UP_BLOB[:12], UP_LAST, LIB_SAME, LIST_OK, DECK_SAME))
for d in SPEC:
    print('  has_%s at the pin: %s' % (d.lower(), 'all names present' if not HAS[d] else 'MISSING ' + '; '.join(HAS[d])))
print('  has_d508 at the D508 lane\'s working tree (%s): %s' % (LANE508, 'all names present' if not LANE else 'MISSING ' + '; '.join(LANE)))
print('\nJ185 READ (lab-j185, read only):', {k: N[k] for k in ('branched', 'labels', 'confident', 'partial', 'controls', 'cpwh', 'c7', 'p95', 'wall', 'wh', 'games', 'refused', 'gb')}, 'pilot min', PILOT_MIN)
print('J185 draws registered: %d spine draws, validation %s' % (len(J185_DRAWS), J185_VAL[:12]))
print('seed grep (%s at pc-jobs %s + drafts): %d hit(s), unexpected: %s; data folders: %s' % (PAT, PCJ, len(hits), odd or 'none', DATA_HIT or 'none'))
print('\nEXPECTATIONS OF THE FINAL PIN:')
for what, ok in EXPECT:
    print('  %s  %s' % ('ok  ' if ok else 'FAIL', what))
print('\nwrote', DST, 'lines', n0, '->', len(t.splitlines()), '; public_title', len('Move atlas 4b night ten: 13 new spines, D508 population night one'), 'chars')
print('\nTHE RUNNER\'S CHECK (%s check):' % RUNNER)
r = subprocess.run([RUNNER, 'check', DST], capture_output=True, text=True)
outl = (r.stdout + r.stderr).splitlines()
print('  exit %d; %s' % (r.returncode, ' | '.join(x for x in outl if x.startswith(('pilot:', 'machine-checked', 'lint', 'error', 'ERROR')) or 'error' in x.lower()[:40])))
bad = [w for w, ok in EXPECT if not ok]
if bad:
    print('\nNOT POSTABLE: this pin misses %d expectation(s) of the final pin (above); the draft is written for reading only.' % len(bad))
    sys.exit(3)
sys.exit(0 if r.returncode == 0 else 2)

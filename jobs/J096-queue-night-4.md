id: J096
title: Overnight queue, night 4: recorded drafts with D375's AI profile mix, play exploration at 0.15, bridge share 0.2 (card-level allocation from J062 power.tsv)
public_title: Queue night 4
public_est: ~11 h
public_cubes: yes
cpu: heavy
repos: mtg-table@ef7e73f (main: D375 --profile-mix, D371's face-down checker, D365 recordEvery in the plan)
after: J091
decides: whether night 5 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-4 and the evaluator
hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
rule: written 2026-10-05 before the run, read on this night's own numbers (night-4.json below, not the runner's cumulative totals). Profile mix: keep it for night 5 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 5 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share for night 5 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
followup: matchup-read-nights-1-4, design-verify
est: ~8.5-10 h of drafts (38000 drafts: 8.5 h at night 3's measured 4,490 drafts/h, exploration kept), then ~1 h of redaction checks (resumable)
resumable: yes
max_workers: 7
pilot_cores: 3
mem_per_worker_gb: 2
progress: cubelab-queue var/cubelab/queue night 4
metrics: night = cubelab-queue var/cubelab/queue night 4
metrics: base = sh: cat var/cubelab/queue-night-4-stats/base.json 2>/dev/null || echo '{"written":0}'
metrics: seeds = sh: cat var/cubelab/queue-night-4-stats/seeds.json 2>/dev/null || echo '{"written":0}'
metrics: ns = sh: cat var/cubelab/queue-night-4-stats/after/night-4.json 2>/dev/null || echo '{"written":0}'
metrics: free_gb = sh: df -BG --output=avail var/cubelab | tail -1 | tr -dc 0-9
metrics: quarantined = sh: cat var/cubelab/queue-quarantine-n4/failed.txt 2>/dev/null | wc -l
headline: night.night_drafts_done, night.planned_drafts, night.bridge_share, ns.engine_error_rate, ns.mixed_time_ratio, quarantined

The fourth pooled night. Same root as nights 1-3 (`var/cubelab/queue`), so `queue.json` hands out fresh
seeds and no draft repeats an earlier night's. What is new against night 3:

- **AI profile mix (D375).** Each draft's two seats are drawn by its seed from Default 0.5, Reckless 0.25,
  Cautious 0.25 (D347's mix), so the ratings and the evaluator are no longer one pilot's habits (methods
  review 2026-10-04, recommendation 5). Every `drafts.jsonl` row carries `profiles`.
- **Exploration** (D358) at share 0.15, epsilon 0.05, close call 0.02, openings untouched:
  J061's keep/stop rule chose the share. J061 read with the readings fixed before it ran: 20,000 drafts in
  about 4.45 h (about 4,490/h, 7% under the uncontended 4,850/h, so above the 3,640/h halving line), recorded
  bytes per game about 166.5 kB (limit 420 kB), engine and recording errors far under their limits: **keep 0.15**.
- **Allocation:** card-level allocation from J062 power.tsv (J062's read chose it), passed as
  `--power var/ml/matchup/nights-1-2/power.tsv`, the path J062 wrote on the PC (it reads the `sdPost`
  column). J062: M0 tau = 0.06 logits per card copy (>= 0.05: card level, plus one design verification),
  and M0 beats the coin (held-out test log-loss minus coin -0.0401 [-0.0456, -0.0342]). J062's folder is
  named nights-1-2, but it ran right after J061 and read the plain (non-exploring) games of nights 1-3:
  56,900 games, 3,084 exploring games left out.
- **Bridge share** 0.2: J062 could not measure J029's third question (no fit without bridge games), so the
  status quo stands.

**Re-posted as J096 (2026-10-06): J093 failed in run1 on `timeout 10h30m` (GNU timeout takes one unit; now 37800 s, the same 10.5 h). Before that, re-posted as J093 (the cloud session).** J082 stopped in its pilot on `rq3.newKinds = 3`, as written. A person has looked (J091's `messages.md`):
- `other` and `shape` are J071's own `recheck.jsonl`, read as if it were a recording. rq3 now reads `recheck.jsonl` itself and counts only `.jsonl.gz` recordings.
- The one **M55** is `bridge/modern-era+omega/games/354/g1-seat1`: "decision 58 names card 99 (land:99), which its state frame does not show seat 1". A decision record is private to the seat that decided (M55), so this cannot reach the other seat. The likely cause is a land played from the top of the library (D352's family). The recording stays quarantined.

rq3 therefore accepts **at most one** M55 and no other new kind. Any second M55 in night 3, or any other new kind, still stops this job. Night 4's own redaction pass quarantines any new M55 recordings, and they are then counted.

**What this waits on, and when it likely runs.** `after: J071`: night 3's quarantine re-checked with the
D371 checker (J071 itself waits on J061, done, and J074). Night 4 is not run if J071 leaves still-failing
recordings of a kind other than D352's A3 and "own hand card has no name" (`own-hand-no-name`): that may be
a real leak in exploring or mixed games. The pilot reads J071's `var/requarantine/n3/report.json` and fails
on any other still-failing kind (check `rq3` below); a person looks before anything is re-run. The runner
takes open jobs in id order, so J067 (evaluator v2, about 10-13 h, after J061) will most likely run before
this job: night 4 likely starts after J067.

**Follow-up.** `matchup-read-nights-1-4` and `design-verify` (tau >= 0.05; D344's 8,000 drafts x 2 arms,
seeds 830,000,000+). The design verification is held if J072's colour-pair dispersion between
nothing-changed batches (`c.pairs_dispersion`) is above 1.5, until that is explained: D344 assumes
archetype rates are stable across arms on one seed block.

**Code version.** The mix and the code tree change every key folder's lab version, so the run uses
`--allow-version-change` (D341, logged; readers split by `ver`).

**Seeds.** The night's seeds are each key's next seeds in `queue.json` (after night 3's), in the lab range
(D340), so no queue night repeats another's. The pilot checks the plan against every seed a posted job
drafted a queue cube at: `normal/omega` must stay under 20,001 (J004/J009's Omega evolve, 20,001+) and every
other key under 700,000 (synergy at 710,001+ in J005, 730,001+ in J019/J027/J048; the filler at 900,001+).
The pilot plays in its own root from seed 7,400,001 on every key (7,400,001-7,400,999 is this job's; no
posted job uses 7,000,001-7,999,999), so it never re-drafts a night-1 seed.

**Night-only numbers.** The runner's `cubelab-queue ... night 4` reports this night's planned and done
drafts, but its errors, games and bytes are totals over every night in the key folders. The pilot writes
`base.json` (those totals before night 4) and the aborts subtract it; the last block writes the night's own
numbers (`after/night-4.json`), which the checks and the rule read.

## Pilot
About 15 minutes: J071's still-failing kinds, the checker, the real plan (written nowhere), a 60-draft
pilot in its own root, and the night-only reader on nights 1-3.
```bash
# the redaction checker is D371's (A9 face-down rule) and its negative control passes
grep -q 'A9 / D371' tools/check-redaction.mjs
mkdir -p var/cubelab
node tools/check-redaction-selftest.mjs > var/cubelab/queue-night-4-redaction-selftest.txt
# J071's re-check of night 3's quarantine: the still-failing kinds, for the stop row (check rq3) and the summary
python3 - > var/cubelab/queue-night-4-n3-stillfail.txt <<'PY' || true
import json
d = json.load(open('var/requarantine/n3/report.json'))
kinds = {}
for e in d['byKind'].values():
    for k, n in e.get('stillFailKinds', {}).items():
        kinds[k] = kinds.get(k, 0) + n
print(f"night 3 quarantine (J071): {d['recordings']} recordings, {d['nowPass']} now pass, {d['stillFail']} still fail")
for k, n in sorted(kinds.items()):
    print(f"{k}\t{n}\t{'known' if k in ('A3', 'own-hand-no-name') else 'NEW: night 4 waits'}")
PY
cat var/cubelab/queue-night-4-n3-stillfail.txt
# J062's card power (sdPost) for --power: written by J062 on this machine
grep -m1 -v '^#' var/ml/matchup/nights-1-2/power.tsv | grep -q $'^name\t.*\tsdPost\t'
# the night-only reader: per-night numbers, the extractor's base before night 4, the night's seed span
cat > var/cubelab/queue-nightstats.py <<'PY'
import glob, json, os, re, sys
# nightstats.py ROOT OUTDIR NIGHT [PLAN_TXT]: one pass over the queue's drafts.jsonl files.
#   OUTDIR/night-<n>.json  each planned night's OWN numbers (lines whose seed is in that night's chunks)
#   OUTDIR/base.json       what the runner's `cubelab-queue ROOT night NIGHT` extractor counts BEFORE night
#                          NIGHT: every line of NIGHT's key files except NIGHT's own seeds (its totals are cumulative)
#   OUTDIR/seeds.json      NIGHT's seed span: from night-NIGHT.json, else queue.json's nextSeed + PLAN_TXT's drafts
root, out, night = sys.argv[1], sys.argv[2], int(sys.argv[3])
plan_txt = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(out, exist_ok=True)
plans = {int(re.search(r'night-(\d+)\.json$', f).group(1)): json.load(open(f)) for f in glob.glob(os.path.join(root, 'night-*.json'))}
spans = {}
for n, p in plans.items():
    for c in p.get('chunks', []):
        spans.setdefault(c['key'], []).append((c['seed'], c['seed'] + c['drafts'] - 1, n))
if night in plans:
    mine = [(c['key'], c['seed'], c['seed'] + c['drafts'] - 1) for c in plans[night]['chunks']]
else:
    led = json.load(open(os.path.join(root, 'queue.json')))
    mine = []
    for line in open(plan_txt):
        m = re.match(r'^((?:normal|bridge)/\S+)\s+-?[\d.]+\s+(\d+)\s*$', line)
        if m and int(m.group(2)) > 0:
            s = led['nextSeed'].get(m.group(1), 1)
            mine.append((m.group(1), s, s + int(m.group(2)) - 1))
mykeys = {}
for k, lo, hi in mine:
    mykeys.setdefault(k, []).append((lo, hi))

def blank():
    return dict(drafts=0, explore_drafts=0, games=0, engine_errors=0, engine_error_drafts=0, timeouts=0, draws=0,
                recorded_games=0, recorded_errors=0, rec_bytes=0, rec_games_explore=0, rec_bytes_explore=0,
                ms=0, ms_explore=0, games_explore=0, turns=0, seat={})

def add(S, r):
    S['drafts'] += 1
    x = bool(r.get('playExplore'))
    S['explore_drafts'] += x
    m = r.get('match') or {}
    if m.get('engineError'):
        S['engine_error_drafts'] += 1
        S['engine_errors'] += 1
    prof = r.get('profiles') or ['Default', 'Default']
    groups = {'DD'} if prof == ['Default', 'Default'] else {'mixed'} | {p.split('+')[0] for p in prof if p.split('+')[0] != 'Default'}
    for g in m.get('games') or []:
        ms, t = g.get('ms') or 0, g.get('turns') or 0
        S['games'] += 1; S['ms'] += ms; S['turns'] += t
        if x: S['games_explore'] += 1; S['ms_explore'] += ms
        td = bool(g.get('timeout')) or g.get('winner') == 'draw'
        if g.get('error'): S['engine_errors'] += 1
        if g.get('timeout'): S['timeouts'] += 1
        if g.get('winner') == 'draw': S['draws'] += 1
        for k in groups:
            P = S['seat'].setdefault(k, [0, 0, 0])
            P[0] += 1; P[1] += td; P[2] += ms
        rec = g.get('recorded')
        if rec:
            b = rec.get('bytes') or 0
            S['recorded_games'] += 1; S['recorded_errors'] += rec.get('errors') or 0; S['rec_bytes'] += b
            if x: S['rec_games_explore'] += 1; S['rec_bytes_explore'] += b

def flat(S):
    d = lambda a, b: round(a / b, 6) if b else 0
    o = {k: v for k, v in S.items() if k != 'seat'}
    o.update(written=1,
             engine_error_rate=d(S['engine_error_drafts'], S['drafts']),
             recorded_error_rate=d(S['recorded_errors'], S['recorded_games']),
             timeout_draw_rate=d(S['timeouts'] + S['draws'], S['games']),
             mean_game_s=d(S['ms'] / 1000, S['games']),
             mean_turns=d(S['turns'], S['games']),
             rec_bytes_per_game=d(S['rec_bytes'], S['recorded_games']),
             rec_bytes_per_game_explore=d(S['rec_bytes_explore'], S['rec_games_explore']),
             rec_bytes_per_game_plain=d(S['rec_bytes'] - S['rec_bytes_explore'], S['recorded_games'] - S['rec_games_explore']),
             mean_game_s_explore=d(S['ms_explore'] / 1000, S['games_explore']),
             mean_game_s_plain=d((S['ms'] - S['ms_explore']) / 1000, S['games'] - S['games_explore']),
             explore_share=d(S['explore_drafts'], S['drafts']))
    o['bytes_ratio_explore_plain'] = d(o['rec_bytes_per_game_explore'], o['rec_bytes_per_game_plain'])
    o['time_ratio_explore_plain'] = d(o['mean_game_s_explore'], o['mean_game_s_plain'])
    for k, (g, td, ms) in S['seat'].items():
        o[f'seat_{k}_games'] = g
        o[f'seat_{k}_td_rate'] = d(td, g)
        o[f'seat_{k}_mean_game_s'] = d(ms / 1000, g)
    dd = o.get('seat_DD_mean_game_s', 0)
    o['mixed_time_ratio'] = d(o.get('seat_mixed_mean_game_s', 0), dd)
    o['seat_nondefault_td_rate_max'] = max([o[f'seat_{k}_td_rate'] for k in S['seat'] if k not in ('DD', 'mixed')] or [0])
    return o

per = {n: blank() for n in plans}
base = blank()
for k in sorted(set(spans) | set(mykeys)):
    f = os.path.join(root, k, 'drafts.jsonl')
    if not os.path.exists(f):
        continue
    with open(f, encoding='utf-8') as fh:
        for line in fh:
            if not line.endswith('\n'):
                break                                   # a line still being written
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if not isinstance(r, dict) or not isinstance(r.get('seed'), int):
                continue
            s = r['seed']
            for lo, hi, n in spans.get(k, []):
                if lo <= s <= hi:
                    add(per[n], r)
                    break
            if k in mykeys and not any(lo <= s <= hi for lo, hi in mykeys[k]):
                add(base, r)
for n, S in per.items():
    json.dump(flat(S), open(os.path.join(out, f'night-{n}.json'), 'w'), indent=1)
json.dump(flat(base), open(os.path.join(out, 'base.json'), 'w'), indent=1)
json.dump({'written': 1, 'keys': len(mykeys), 'drafts': sum(hi - lo + 1 for _, lo, hi in mine),
           'seedmin': min((lo for _, lo, _ in mine), default=0), 'seedmax': max((hi for _, _, hi in mine), default=0),
           'omega_seedmax': max((hi for k, _, hi in mine if k == 'normal/omega'), default=0),
           'other_seedmax': max((hi for k, _, hi in mine if k != 'normal/omega'), default=0)},
          open(os.path.join(out, 'seeds.json'), 'w'), indent=1)
print(f'nightstats: nights {sorted(per)}, night {night}: {len(mykeys)} keys -> {out}')
PY
# night 4's plan on the real root, with the night's own flags: plan mode writes neither the plan nor queue.json
tools/cubelab.sh queue plan --night 4 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change > var/cubelab/queue-night-4-plan.pilot.txt
python3 var/cubelab/queue-nightstats.py var/cubelab/queue var/cubelab/queue-night-4-stats 4 var/cubelab/queue-night-4-plan.pilot.txt
```
```bash
# the pilot plays in its own root, its ledger starting every key at seed 7,400,001 (this job's block)
P=var/cubelab/queue-pilot-n4
mkdir -p "$P"
[ -e "$P/queue.json" ] || python3 - "$P" <<'PY'
import glob, itertools, json, os, re, sys
ids = sorted(re.sub(r'-cube(-\d+)?$', '', os.path.basename(f)[:-3]) for f in glob.glob('cubes/*-cube-180.md'))
keys = [f'normal/{i}' for i in ids] + [f'bridge/{a}+{b}' for a, b in itertools.permutations(ids, 2)]
json.dump({'v': 1, 'games': 1, 'format': 'grid', 'nextSeed': {k: 7400001 for k in keys}, 'nights': []},
          open(os.path.join(sys.argv[1], 'queue.json'), 'w'), indent=1)
PY
tools/cubelab.sh queue run --night 4 --drafts 60 --bridge-share 0.2 --chunk 3 --jobs {workers} --record-every 1 --root "$P" \
  --play-explore share=0.5,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 --power var/ml/matchup/nights-1-2/power.tsv
python3 var/cubelab/queue-nightstats.py "$P" var/cubelab/queue-pilot-n4-stats 4
python3 tools/ml/matchup_data.py "$P" --out var/ml/matchup-pilot-n4/games.jsonl --check
node tools/check-redaction.mjs $(ls "$P"/*/*/games/*/g1-seat*.jsonl.gz | head -6) || echo "redaction FAIL in the pilot sample (quarantined in the full run, not a pilot failure)"
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot-n4
metrics: pn = sh: cat var/cubelab/queue-pilot-n4-stats/night-4.json 2>/dev/null || echo '{"written":0}'
metrics: pseeds = sh: cat var/cubelab/queue-pilot-n4-stats/seeds.json 2>/dev/null || echo '{"written":0}'
metrics: n3 = sh: cat var/cubelab/queue-night-4-stats/night-3.json 2>/dev/null || echo '{"written":0}'
metrics: rq3 = sh: python3 -c "import json; rows=[json.loads(l) for l in open('var/cubelab/queue-quarantine-n3/recheck.jsonl') if l.strip()]; rows=[r for r in rows if str(r.get('rel','')).endswith('.jsonl.gz')]; k={s for r in rows for s in r.get('kinds',[])} - {'A3', 'own-hand-no-name', 'M55'}; m=sum(1 for r in rows if 'M55' in r.get('kinds',[])); print(json.dumps({'written': 1, 'recordings': len(rows), 'm55': m, 'newKinds': len(k)}))" 2>/dev/null || echo '{"written":0}'
check: rq3.written == 1 and rq3.newKinds == 0 and rq3.m55 <= 1
check: pilot.drafts >= 50
check: pilot.engine_error_rate <= 2%
check: pilot.recorded_games >= 50
check: pilot.recorded_errors <= 0.01 * pilot.recorded_games
check: pilot.mean_game_s <= 9
check: pn.seat_mixed_games >= 1 and pn.explore_drafts >= 1
check: pseeds.seedmin >= 7400001 and pseeds.seedmax <= 7400999
check: seeds.written == 1 and seeds.drafts == 38000
check: seeds.seedmin >= 1 and seeds.omega_seedmax < 20001 and seeds.other_seedmax < 700000
check: base.written == 1 and base.drafts >= 40000
check: n3.written == 1 and n3.drafts >= 1000

Checks, in words: J071's report was read and every recording still failing in night 3's quarantine fails
only on A3 or `own-hand-no-name` (any other kind, or no report, stops night 4 here: the night-4 plan's
stop row, written 2026-10-05 before J061 ran; `queue-night-4-n3-stillfail.txt` names the kinds); the pilot plays, records and explores with the mix on; its seeds stay in this job's block;
the real plan has exactly 38000 drafts, Omega's under seed 20,001 and the rest under 700,000; the base
and night 3 were read. The
pilot's mean game time (night 2's pilot: 5.5 s) is the "is the mix broken" check, not the rule.
Record the pilot's drafts per hour.

## Commands
```bash
# -newer marker for the redaction pass: made once, so a resumed night still checks what it wrote before the stop
[ -e var/cubelab/queue-night-4.started ] || touch var/cubelab/queue-night-4.started
tools/cubelab.sh queue plan --night 4 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change > var/cubelab/queue-night-4-plan.txt
echo "start $(date +%s)" >> var/cubelab/queue-night-4-times.txt
timeout -s TERM 37800 tools/cubelab.sh queue run --night 4 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change || [ $? -eq 124 ]
echo "end $(date +%s)" >> var/cubelab/queue-night-4-times.txt
```
```bash
mkdir -p var/cubelab/queue-quarantine-n4
find var/cubelab/queue -path '*/games/*' -newer var/cubelab/queue-night-4.started -name '*.jsonl.gz' -print0 \
  | xargs -0 -r -n 200 -P {workers} node tools/check-redaction.mjs 2>&1 \
  | awk '$1 == "FAIL" {print $2}' > var/cubelab/queue-quarantine-n4/failed.txt || true
while read -r f; do
  [ -f "$f" ] || continue
  d="var/cubelab/queue-quarantine-n4/${f#var/cubelab/queue/}"; mkdir -p "$(dirname "$d")"; mv "$f" "$d"
done < var/cubelab/queue-quarantine-n4/failed.txt
echo "quarantined $(wc -l < var/cubelab/queue-quarantine-n4/failed.txt) recordings"
```
cores: 1
```bash
python3 var/cubelab/queue-nightstats.py var/cubelab/queue var/cubelab/queue-night-4-stats/after 4
cat var/cubelab/queue-night-4-stats/after/night-4.json
```
check: night.night_drafts_done >= 0.9 * night.planned_drafts
check: night.planned_drafts == 38000
check: ns.written == 1
check: ns.engine_error_rate <= 2%
check: ns.recorded_errors <= 0.01 * ns.recorded_games
check: ns.recorded_games >= 0.95 * ns.games
check: ns.explore_share between 0.15 - 0.02 and 0.15 + 0.02
check: ns.seat_mixed_games >= 0.6 * ns.games
check: quarantined <= 0.01 * ns.recorded_games

38000 is sized for about 8.5 h at night 3's measured rate, so the mix's unknown cost has room before the
10 h 30 min stop (`timeout`, exit 124 is fine: the queue is resumable, and a re-run of this job's commands
plays only the missing drafts). A night under 90% done fails its first check on purpose: a person decides
whether to finish it before night 5, because the cold archive refuses an unfinished night.

**Recordings.** Every recording this night wrote (newer than the marker) goes through main's
`check-redaction.mjs`, which has D371's face-down rule, so Gonti- and Thief-of-Sanity-style looks no longer
quarantine. Failures move to `var/cubelab/queue-quarantine-n4/` (same relative path; quarantined, never
deleted). The last check fails the job above 0.5% of recordings (1% of games): that is a finding, not a
reason to delete anything.

## Abort if
abort: night.drafts - base.drafts >= 500 and night.engine_errors - base.engine_errors > 0.02 * (night.drafts - base.drafts)
abort: night.recorded_games - base.recorded_games >= 500 and night.recorded_errors - base.recorded_errors > 0.01 * (night.recorded_games - base.recorded_games)
abort: night.games - base.games >= 500 and night.timeouts + night.draws - base.timeouts - base.draws > 0.05 * (night.games - base.games)
abort: free_gb < 20
- Any "recording" warning, or "SAVED Forge preferences".
- Two consecutive "chunk N FAILED" lines.
- A version refusal ("was written by lab version"): the pin or the flags are wrong; nothing is lost.

## Report
collect: var/cubelab/queue-night-4-plan.txt
collect: var/cubelab/queue-night-4-times.txt
collect: var/cubelab/queue/night-4.json
collect: var/cubelab/queue/queue.json
collect: var/cubelab/queue-night-4-stats/base.json
collect: var/cubelab/queue-night-4-stats/night-2.json
collect: var/cubelab/queue-night-4-stats/night-3.json
collect: var/cubelab/queue-night-4-stats/after/night-4.json
collect: var/cubelab/queue-quarantine-n4/failed.txt
collect: var/cubelab/queue-night-4-n3-stillfail.txt

summary.md, plainly:
- the plan header (drafts, share, mix, allocation, bridge share) and the drafts per hour: night drafts over
  the hours in `queue-night-4-times.txt`, minus any hold for Justin's play (STATUS shows them);
- from `after/night-4.json`: engine errors, recording errors, timeouts and draws, mean game time; per
  seat group (DD, mixed, Reckless, Cautious) the games, the timeout + draw rate and the mean game time;
  exploring vs plain games' mean game time and recorded bytes per game; the explore share;
- the pre-registered reading (the `rule:` header), each number beside its limit, and the verdicts for night 5:
  mix kept or dropped, exploration share kept or halved;
- `du -sh var/cubelab/queue`, free disk, and the quarantine count with its share of the recordings; for any
  quarantined recording, the checker's FAIL line kinds (one example each);
- the per-cube and bridge done/planned counts;
- night 3's quarantine as the pilot read it from J071 (`queue-night-4-n3-stillfail.txt`).
The morning read (the matchup model on nights 1-4, profile-stratified where it can be) is the follow-up.

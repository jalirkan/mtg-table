id: J104
title: Overnight queue, night 5: night 4's design and settings as J099's rule chose them (D375's AI profile mix kept, play exploration kept at 0.15), bridge share 0.2 (card-level allocation from J062 power.tsv)
public_title: Queue night 5
public_est: ~11 h
public_cubes: yes
cpu: heavy
repos: mtg-table@74c1360 (night 4's pin, J099, so nights 4 and 5 are one lab version: D394's version rule and `queue check`, D375 --profile-mix, D371's face-down checker, D365 recordEvery in the plan)
decides: whether night 6 keeps D375's profile mix and this night's exploration share (D358); its drafts and recordings feed the matchup read of nights 1-5 and the evaluator
hypothesis: with the mix (Default 0.5, Reckless 0.25, Cautious 0.25) the night keeps engine errors <= 2% and recording errors <= 1%; games with a Reckless or Cautious seat take <= 1.5x the time of Default-vs-Default games and end in a timeout or draw <= 5% of the time; the D371 checker quarantines <= 0.5% of recordings
rule: written 2026-10-07 before the run, read on this night's own numbers (night-5.json below, not the runner's cumulative totals). Profile mix: keep it for night 6 if the games with a non-Default seat have timeouts + draws <= 5% for each profile, mean game time <= 1.5x the same night's Default-vs-Default games, and the night's engine errors <= 2% and recording errors <= 1%; otherwise night 6 plays Default vs Default and the cause is written up as a decision. Exploration: keep this night's share (0.15) for night 6 if share x (exploring / plain mean game time - 1) <= 0.25, the night's mean recorded bytes per game <= 2.5x its plain games', and the same error limits hold; otherwise halve it. Both are measured inside this night, where the mix and exploration are each assigned by seed, so neither confounds the other
followup: matchup-read-nights-1-5, design-verify
est: ~8.5-10 h of drafts (38000 drafts: 8.5 h at night 3's measured 4,490 drafts/h, exploration kept), then ~1 h of redaction checks (resumable)
resumable: yes
max_workers: 7
pilot_cores: 3
mem_per_worker_gb: 2
timeout: 13h
clean: var/cubelab/queue-pilot-n5b var/cubelab/queue-pilot-n5b-stats
progress: cubelab-queue var/cubelab/queue night 5
metrics: night = cubelab-queue var/cubelab/queue night 5
metrics: base = sh: cat var/cubelab/queue-night-5-stats/base.json 2>/dev/null || echo '{"written":0}'
metrics: seeds = sh: cat var/cubelab/queue-night-5-stats/seeds.json 2>/dev/null || echo '{"written":0}'
metrics: ns = sh: cat var/cubelab/queue-night-5-stats/after/night-5.json 2>/dev/null || echo '{"written":0}'
metrics: free_gb = sh: df -BG --output=avail var/cubelab | tail -1 | tr -dc 0-9
metrics: quarantined = sh: cat var/cubelab/queue-quarantine-n5/failed.txt 2>/dev/null | wc -l
headline: night.night_drafts_done, night.planned_drafts, night.bridge_share, ns.engine_error_rate, ns.mixed_time_ratio, quarantined

**Re-posted from J103 (2026-10-07, the cloud session).** J103's pilot stopped on `pn.explore_drafts >= 1` (0 of 60).
Nothing was wrong with the night: a draft explores when `rng(seed, 'play-explore') < share`, and the pilot
used only seeds 7,420,001-7,420,010, none of which explores at 0.15 (checked with 74c1360's `draftExplores`;
about a 1-in-5 chance for 10 seeds). This pilot's block, 7,430,001+, has two exploring seeds in its first ten
(7,430,002 and 7,430,005). Nothing else changes; J103 wrote nothing to the real root (its pilot runs first); this pilot uses fresh folders (`*-pilot-n5b*`), since a new job does not move J103's `queue-pilot-n5` aside.

**Night 5 repeats night 4's design with the settings its rule chose: the profile mix kept, the exploration
share kept at 0.15.** J099's `rule:` read on its own `night-4.json` (38,000 drafts, 37,994 games): timeouts +
draws 0 of 16,462 games with a Reckless seat and 5 of 16,741 (0.03%) with a Cautious seat (limit 5% each);
non-Default games 4.019 s against Default-vs-Default's 4.201 s, ratio 0.96 (limit 1.5); engine errors 6 of
38,000 drafts (0.016%, limit 2%); recording errors 0 of 37,994 (limit 1%). Exploration: 0.15 x (4.037 s /
4.069 s - 1) = 0.15 x -0.0080 = -0.0012 (limit 0.25); recorded bytes per game 161.3 kB against plain games'
160.9 kB, ratio 1.003 (limit 2.5). Same pin, same flags, same 38,000 drafts, same checks and commands as
J099; only the night number, the paths, the pilot's seed block and the key-folder expectation (below) change.

**What the pilot proves, on the real folders.**
- `queue check` with the night's exact flags runs on the real root `var/cubelab/queue`. Every key
  folder of the night's plan must answer `ok` with **`same version`**: night 4 appended night 4's lab
  version (74c1360's code tree, the mix, share 0.15) to every folder, and this job runs the same pin
  and flags, so nothing should differ. A "version change allowed" line on any folder (a different
  Forge jar, ratings file, cube file or uncommitted diff on the PC) stops the job before it plays:
  nights 4 and 5 would not be one version. There must be no `REFUSED` line.
- The 60-draft pilot plays in a fresh root (`queue-pilot-n5b`) whose key folders hold **copies of the
  real folders' `run.json`** (their identity and version history, no drafts). Its chunks therefore
  resume through the same identity and version checks as the night does (each answering `same
  version`), and then draft, play, record and explore with the night's own flags.

The fifth pooled night. Same root as nights 1-4 (`var/cubelab/queue`), so `queue.json` hands out fresh
seeds and no draft repeats an earlier night's. The settings, all as night 4's:

- **AI profile mix (D375).** Each draft's two seats are drawn by its seed from Default 0.5, Reckless 0.25,
  Cautious 0.25 (D347's mix), so the ratings and the evaluator are no longer one pilot's habits (methods
  review 2026-10-04, recommendation 5). Every `drafts.jsonl` row carries `profiles`. Kept by J099's rule.
- **Exploration** (D358) at share 0.15, epsilon 0.05, close call 0.02, openings untouched: J061's keep/stop
  rule chose the share for night 4 and J099's rule keeps it (numbers above).
- **Allocation:** card-level allocation from J062 power.tsv (J062's read chose it), passed as
  `--power var/ml/matchup/nights-1-2/power.tsv`, the path J062 wrote on the PC (it reads the `sdPost`
  column). J062: M0 tau = 0.06 logits per card copy (>= 0.05: card level, plus one design verification),
  and M0 beats the coin (held-out test log-loss minus coin -0.0401 [-0.0456, -0.0342]).
- **Bridge share** 0.2: J062 could not measure J029's third question (no fit without bridge games), so the
  status quo stands.

**Night 3's quarantine (check rq3).** The pilot still reads J071's re-check of night 3's quarantine, as
J099's did, and stops on any still-failing kind other than A3 and `own-hand-no-name`, or on more than one
M55 (the one is `bridge/modern-era+omega/games/354/g1-seat1`, explained by J095 as a snapshot flicker of
a revealed library top and fixed in the bridge by D399, after this pin). J099's pilot passed it on the
same files. Night 4's own 82 quarantined recordings (0.22%) stay in `var/cubelab/queue-quarantine-n4/`.

**Follow-up.** `matchup-read-nights-1-5` and `design-verify` (tau >= 0.05; D344's 8,000 drafts x 2 arms,
seeds 830,000,000+). The design verification is held if J072's colour-pair dispersion between
nothing-changed batches (`c.pairs_dispersion`) is above 1.5, until that is explained: D344 assumes
archetype rates are stable across arms on one seed block.

**Code version.** Night 4's pin, so every key folder should already be at this lab version. The run keeps
night 4's `--allow-version-change` (same flags), but the pilot's `kc` check fails on any version change.

**Seeds.** The night's seeds are each key's next seeds in `queue.json` (after night 4's), in the lab range
(D340), so no queue night repeats another's. The pilot checks the plan against every seed a posted job
drafted a queue cube at: `normal/omega` must stay under 20,001 (J004/J009's Omega evolve, 20,001+) and every
other key under 700,000 (synergy at 710,001+ in J005, 730,001+ in J019/J027/J048; the filler at 900,001+).
The pilot plays in its own root from seed 7,430,001 on every key (7,430,001-7,430,999 is this job's; J103's
pilot used 7,420,001+, J099's
pilot used 7,410,001+ in `queue-pilot-n4b`, J082/J093/J096's 7,400,001+ in `queue-pilot-n4`, and no other
posted job uses 7,000,001-7,999,999), so it never re-drafts a night-1 seed.

**Night-only numbers.** The runner's `cubelab-queue ... night 5` reports this night's planned and done
drafts, but its errors, games and bytes are totals over every night in the key folders. The pilot writes
`base.json` (those totals before night 5) and the aborts subtract it; the last block writes the night's own
numbers (`after/night-5.json`), which the checks and the rule read.

## Pilot
About 15 minutes: J071's still-failing kinds, the checker, the real plan (written nowhere), D394's
`queue check` on the real root (written nowhere), a 60-draft pilot in a fresh root seeded with copies of
the real key folders' `run.json`, and the night-only reader on nights 1-4.
```bash
# the redaction checker is D371's (A9 face-down rule) and its negative control passes
grep -q 'A9 / D371' tools/check-redaction.mjs
mkdir -p var/cubelab
node tools/check-redaction-selftest.mjs > var/cubelab/queue-night-5-redaction-selftest.txt
# J071's re-check of night 3's quarantine: the still-failing kinds, for the stop row (check rq3) and the summary
python3 - > var/cubelab/queue-night-5-n3-stillfail.txt <<'PY' || true
import json
d = json.load(open('var/requarantine/n3/report.json'))
kinds = {}
for e in d['byKind'].values():
    for k, n in e.get('stillFailKinds', {}).items():
        kinds[k] = kinds.get(k, 0) + n
print(f"night 3 quarantine (J071): {d['recordings']} recordings, {d['nowPass']} now pass, {d['stillFail']} still fail")
for k, n in sorted(kinds.items()):
    print(f"{k}\t{n}\t{'known' if k in ('A3', 'own-hand-no-name') else 'NEW: night 5 waits'}")
PY
cat var/cubelab/queue-night-5-n3-stillfail.txt
# J062's card power (sdPost) for --power: written by J062 on this machine
grep -m1 -v '^#' var/ml/matchup/nights-1-2/power.tsv | grep -q $'^name\t.*\tsdPost\t'
# the night-only reader: per-night numbers, the extractor's base before night 5, the night's seed span
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
# night 5's plan on the real root, with the night's own flags: plan mode writes neither the plan nor queue.json
tools/cubelab.sh queue plan --night 5 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change > var/cubelab/queue-night-5-plan.pilot.txt
python3 var/cubelab/queue-nightstats.py var/cubelab/queue var/cubelab/queue-night-5-stats 5 var/cubelab/queue-night-5-plan.pilot.txt
# D394: every key folder of the real root, checked exactly as the night's first chunk of it will be; writes nothing.
# A refusal exits 1: kept in the file for the checks below (kc), so the pilot fails on a named check, not a bare exit.
tools/cubelab.sh queue check --night 5 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change > var/cubelab/queue-night-5-keycheck.txt 2>&1 || true
grep -E '^  (ok|REFUSED) ' var/cubelab/queue-night-5-keycheck.txt || true
```
```bash
# the pilot plays in its own fresh root, its ledger starting every key at seed 7,430,001 (this job's block),
# and its key folders holding COPIES of the real folders' run.json (identity + version history, no drafts),
# so its chunks resume through the same checks the night's chunks will (D394)
P=var/cubelab/queue-pilot-n5b
mkdir -p "$P"
find var/cubelab/queue -mindepth 3 -maxdepth 3 -name run.json -path 'var/cubelab/queue/*/*/run.json' | sort > var/cubelab/queue-pilot-n5b-runjson.txt
while read -r f; do
  k=${f#var/cubelab/queue/}; mkdir -p "$P/$(dirname "$k")"; [ -e "$P/$k" ] || cp "$f" "$P/$k"
done < var/cubelab/queue-pilot-n5b-runjson.txt
echo "copied $(wc -l < var/cubelab/queue-pilot-n5b-runjson.txt) run.json files into $P"
[ -e "$P/queue.json" ] || python3 - "$P" <<'PY'
import glob, itertools, json, os, re, sys
ids = sorted(re.sub(r'-cube(-\d+)?$', '', os.path.basename(f)[:-3]) for f in glob.glob('cubes/*-cube-180.md'))
keys = [f'normal/{i}' for i in ids] + [f'bridge/{a}+{b}' for a, b in itertools.permutations(ids, 2)]
json.dump({'v': 1, 'games': 1, 'format': 'grid', 'nextSeed': {k: 7430001 for k in keys}, 'nights': []},
          open(os.path.join(sys.argv[1], 'queue.json'), 'w'), indent=1)
PY
# the night's own flags, --allow-version-change included; --min-drafts 1 so most keys (normal and bridge) get a chunk
tools/cubelab.sh queue run --night 5 --drafts 60 --min-drafts 1 --bridge-share 0.2 --chunk 3 --jobs {workers} --record-every 1 --root "$P" \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change 2>&1 | tee var/cubelab/queue-pilot-n5b-run.txt
python3 var/cubelab/queue-nightstats.py "$P" var/cubelab/queue-pilot-n5b-stats 5
python3 tools/ml/matchup_data.py "$P" --out var/ml/matchup-pilot-n5b/games.jsonl --check
find "$P" -path '*/games/*' -name 'g1-seat*.jsonl.gz' | sort | head -6 > var/cubelab/queue-pilot-n5b-sample.txt
xargs -r node tools/check-redaction.mjs < var/cubelab/queue-pilot-n5b-sample.txt || echo "redaction FAIL in the pilot sample (quarantined in the full run, not a pilot failure)"
```
metrics: pilot = cubelab-queue var/cubelab/queue-pilot-n5b
metrics: pn = sh: cat var/cubelab/queue-pilot-n5b-stats/night-5.json 2>/dev/null || echo '{"written":0}'
metrics: pseeds = sh: cat var/cubelab/queue-pilot-n5b-stats/seeds.json 2>/dev/null || echo '{"written":0}'
metrics: kc = sh: python3 -c "import json, re, sys; L=open(sys.argv[1]).read().splitlines(); ok=[l for l in L if l.startswith('  ok ')]; ch=[re.search(r'version change allowed \(([^)]*)\)', l) for l in ok]; print(json.dumps({'written': 1, 'ok': len(ok), 'refused': sum(1 for l in L if l.startswith('  REFUSED ')), 'vchange': sum(1 for m in ch if m), 'newFolders': sum(1 for l in ok if ': new folder' in l), 'same': sum(1 for l in ok if ': same version' in l), 'unexpected': sum(1 for m in ch if m and set(m.group(1).split(', ')) - {'codeTree', 'weightsSha'}), 'accepts': 1 if any('every key folder accepts this run' in l for l in L) else 0}))" var/cubelab/queue-night-5-keycheck.txt 2>/dev/null || echo '{"written":0}'
metrics: pk = sh: python3 -c "import json, sys; L=open(sys.argv[1]).read().splitlines(); print(json.dumps({'written': 1, 'ok': sum(1 for l in L if l.startswith('  ok ')), 'vchange': sum(1 for l in L if l.startswith('  ok ') and 'version change allowed' in l), 'same': sum(1 for l in L if l.startswith('  ok ') and ': same version' in l), 'refused': sum(1 for l in L if l.startswith('  REFUSED ')), 'failedChunks': sum(1 for l in L if ' FAILED, carrying on' in l)}))" var/cubelab/queue-pilot-n5b-run.txt 2>/dev/null || echo '{"written":0}'
metrics: copied = sh: wc -l < var/cubelab/queue-pilot-n5b-runjson.txt 2>/dev/null || echo 0
metrics: n4 = sh: cat var/cubelab/queue-night-5-stats/night-4.json 2>/dev/null || echo '{"written":0}'
metrics: rq3 = sh: python3 -c "import json; rows=[json.loads(l) for l in open('var/cubelab/queue-quarantine-n3/recheck.jsonl') if l.strip()]; rows=[r for r in rows if str(r.get('rel','')).endswith('.jsonl.gz')]; k={s for r in rows for s in r.get('kinds',[])} - {'A3', 'own-hand-no-name', 'M55'}; m=sum(1 for r in rows if 'M55' in r.get('kinds',[])); print(json.dumps({'written': 1, 'recordings': len(rows), 'm55': m, 'newKinds': len(k)}))" 2>/dev/null || echo '{"written":0}'
check: rq3.written == 1 and rq3.newKinds == 0 and rq3.m55 <= 1
check: pilot.drafts >= 50
check: pilot.engine_error_rate <= 2%
check: pilot.recorded_games >= 50
check: pilot.recorded_errors <= 0.01 * pilot.recorded_games
check: pilot.mean_game_s <= 9
check: pn.seat_mixed_games >= 1 and pn.explore_drafts >= 1
check: pseeds.seedmin >= 7430001 and pseeds.seedmax <= 7430999
check: seeds.written == 1 and seeds.drafts == 38000
check: seeds.seedmin >= 1 and seeds.omega_seedmax < 20001 and seeds.other_seedmax < 700000
check: base.written == 1 and base.drafts >= 90000
check: n4.written == 1 and n4.drafts == 38000
check: kc.written == 1 and kc.refused == 0 and kc.accepts == 1
check: kc.ok == seeds.keys
check: kc.same == seeds.keys and kc.vchange == 0 and kc.newFolders == 0
check: copied >= 20
check: pk.written == 1 and pk.refused == 0 and pk.failedChunks == 0
check: pk.same >= 10 and pk.vchange == 0

Checks, in words: J071's report was read and every recording still failing in night 3's quarantine fails
only on A3 or `own-hand-no-name`, with at most one M55 (any other kind, or no report, stops night 5 here, as it
stopped night 4; `queue-night-5-n3-stillfail.txt` names the kinds); the pilot plays, records and explores with the mix on; its seeds stay in this job's block;
the real plan has exactly 38000 drafts, Omega's under seed 20,001 and the rest under 700,000; the base
(nights 1-4 in the night's key folders, 98,000 drafts after J099) and night 4 (38,000 drafts) were read.
**D394, on the real folders:** `queue check` answers `ok` for every key the night's plan names
(`seeds.keys`, 26 for night 4), with no refusal, and every folder answers `same version`: no version
change of any field (no code tree, mix, jar, ratings, cube or uncommitted-diff change since night 4). The
pilot root's chunks resumed copied `run.json` files as the same version (at least 10 keys, no version
change) with no refused folder and no failed chunk. The
pilot's mean game time (night 2's pilot: 5.5 s) is the "is the mix broken" check, not the rule.
Record the pilot's drafts per hour.

## Commands
```bash
# -newer marker for the redaction pass: made once, so a resumed night still checks what it wrote before the stop
[ -e var/cubelab/queue-night-5.started ] || touch var/cubelab/queue-night-5.started
tools/cubelab.sh queue plan --night 5 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change > var/cubelab/queue-night-5-plan.txt
echo "start $(date +%s)" >> var/cubelab/queue-night-5-times.txt
timeout -s TERM 37800 tools/cubelab.sh queue run --night 5 --drafts 38000 --bridge-share 0.2 --jobs {workers} --record-every 1 \
  --play-explore share=0.15,epsilon=0.05,closecall=0.02 --profile-mix Default:0.5,Reckless:0.25,Cautious:0.25 \
  --power var/ml/matchup/nights-1-2/power.tsv --allow-version-change || [ $? -eq 124 ]
echo "end $(date +%s)" >> var/cubelab/queue-night-5-times.txt
```
```bash
mkdir -p var/cubelab/queue-quarantine-n5
find var/cubelab/queue -path '*/games/*' -newer var/cubelab/queue-night-5.started -name '*.jsonl.gz' -print0 \
  | xargs -0 -r -n 200 -P {workers} node tools/check-redaction.mjs 2>&1 \
  | awk '$1 == "FAIL" {print $2}' > var/cubelab/queue-quarantine-n5/failed.txt || true
while read -r f; do
  [ -f "$f" ] || continue
  d="var/cubelab/queue-quarantine-n5/${f#var/cubelab/queue/}"; mkdir -p "$(dirname "$d")"; mv "$f" "$d"
done < var/cubelab/queue-quarantine-n5/failed.txt
echo "quarantined $(wc -l < var/cubelab/queue-quarantine-n5/failed.txt) recordings"
```
cores: 1
```bash
python3 var/cubelab/queue-nightstats.py var/cubelab/queue var/cubelab/queue-night-5-stats/after 5
cat var/cubelab/queue-night-5-stats/after/night-5.json
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

38000 is sized for about 8.5 h at night 3's measured rate (night 4, with the mix and exploration, ran
it in about 8.0 h: about 4,730 drafts/h), so there is room before the 10 h 30 min stop (`timeout`, exit 124 is fine: the queue is resumable, and a re-run of this job's commands
plays only the missing drafts). A night under 90% done fails its first check on purpose: a person decides
whether to finish it before night 6, because the cold archive refuses an unfinished night.

**Recordings.** Every recording this night wrote (newer than the marker) goes through main's
`check-redaction.mjs`, which has D371's face-down rule, so Gonti- and Thief-of-Sanity-style looks no longer
quarantine. Failures move to `var/cubelab/queue-quarantine-n5/` (same relative path; quarantined, never
deleted). The last check fails the job above 0.5% of recordings (1% of games): that is a finding, not a
reason to delete anything.

## Abort if
abort: night.drafts - base.drafts >= 500 and night.engine_errors - base.engine_errors > 0.02 * (night.drafts - base.drafts)
abort: night.recorded_games - base.recorded_games >= 500 and night.recorded_errors - base.recorded_errors > 0.01 * (night.recorded_games - base.recorded_games)
abort: night.games - base.games >= 500 and night.timeouts + night.draws - base.timeouts - base.draws > 0.05 * (night.games - base.games)
abort: free_gb < 20
- Any "recording" warning, or "SAVED Forge preferences".
- Two consecutive "chunk N FAILED" lines.
- A version refusal ("was written by lab version") or an identity refusal ("holds a run with a different"):
  the pin or the flags are wrong; since D394 the night stops before it plays, and nothing is lost.

## Report
collect: var/cubelab/queue-night-5-plan.txt
collect: var/cubelab/queue-night-5-times.txt
collect: var/cubelab/queue/night-5.json
collect: var/cubelab/queue/queue.json
collect: var/cubelab/queue-night-5-stats/base.json
collect: var/cubelab/queue-night-5-stats/night-3.json
collect: var/cubelab/queue-night-5-stats/night-4.json
collect: var/cubelab/queue-night-5-stats/after/night-5.json
collect: var/cubelab/queue-quarantine-n5/failed.txt
collect: var/cubelab/queue-night-5-n3-stillfail.txt
collect: var/cubelab/queue-night-5-keycheck.txt

summary.md, plainly:
- the plan header (drafts, share, mix, allocation, bridge share) and the drafts per hour: night drafts over
  the hours in `queue-night-5-times.txt`, minus any hold for Justin's play (STATUS shows them);
- from `after/night-5.json`: engine errors, recording errors, timeouts and draws, mean game time; per
  seat group (DD, mixed, Reckless, Cautious) the games, the timeout + draw rate and the mean game time;
  exploring vs plain games' mean game time and recorded bytes per game; the explore share;
- the pre-registered reading (the `rule:` header), each number beside its limit, and the verdicts for night 6:
  mix kept or dropped, exploration share kept or halved;
- `du -sh var/cubelab/queue`, free disk, and the quarantine count with its share of the recordings; for any
  quarantined recording, the checker's FAIL line kinds (one example each);
- the per-cube and bridge done/planned counts;
- night 3's quarantine as the pilot read it from J071 (`queue-night-5-n3-stillfail.txt`);
- the key-folder check (`queue-night-5-keycheck.txt`): how many folders, and that every one answered
  `same version` (night 5 appended to night 4's lab version).
The morning read (the matchup model on nights 1-5, profile-stratified where it can be) is the follow-up.

id: J108
title: Move queue nights 1 and 2 to the cold drive (succeeds J070): one verified tar.zst a key folder plus each night's quarantine folder on /mnt/e/forgecoach-archive, an independent SHA-256 pass over every archive, and only then the hot copies deleted (D378); night 1's hold lifted
public_title: Archive nights 1 and 2
public_est: ~2 h
public_decides: Housekeeping: free the lab disk (no lab decision)
cpu: heavy
cores: 4
max_workers: 4
mem_per_worker_gb: 1
repos: mtg-table@503c602 (the PC's newest pin, J107; tools/lab/archive.py cold and cold.py are D378 as J070 had them, with --release-hold, plus 3e836ed's archive-holds.json)
decides: housekeeping, no lab decision: free about 6-7 GB on / by moving the finished nights 1-2 recordings to the cold tier (D378), the runway for night 6
hypothesis: every unit verifies by SHA-256 on the drive and the archives come out ~5x smaller than the hot gzip (J070's dry run: 4.92x on night 1)
rule: housekeeping, no pre-registered rule: D378's refusals, the independent verify block and the checks below; any mismatch stops the job before anything hot is deleted
est: ~1-3 h. About 40,000 recordings and 3.3 GB of gzip a night (J070's pilot: night 1 is 27 units, 40,003 files, 3.302 GB hot, 0.097 CPU s a file) packed at zstd 19 on 4 threads and read back, an independent SHA-256 pass over ~1.4 GB of archives, a second read-back before the deletes, then the warehouse ingest
resumable: yes
timeout: 8h
metrics: dry1 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-1.dryrun.json')); e=d.get('estimate') or {}; print(json.dumps({'written':1,'qunit':sum(u['files'] for u in d['units'] if u['kind']=='quarantine'),'refused':len(d['refused']),'skipped':0 if d['skipped'] is None else 1,'units':sum(1 for u in d['units'] if u['files']>0),'files':d['files'],'hot':d['hotBytes'],'expected':e.get('expectedArchiveBytes') or 0,'ratio':e.get('ratio') or 0,'free':d.get('driveFreeBytes') or 0}))" 2>/dev/null || echo '{"written":0}'
metrics: dry2 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-2.dryrun.json')); e=d.get('estimate') or {}; print(json.dumps({'written':1,'qunit':sum(u['files'] for u in d['units'] if u['kind']=='quarantine'),'refused':len(d['refused']),'skipped':0 if d['skipped'] is None else 1,'units':sum(1 for u in d['units'] if u['files']>0),'files':d['files'],'hot':d['hotBytes'],'expected':e.get('expectedArchiveBytes') or 0,'ratio':e.get('ratio') or 0,'free':d.get('driveFreeBytes') or 0}))" 2>/dev/null || echo '{"written":0}'
metrics: n1 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-1.json')); t=d['totals']; print(json.dumps({'written':1,'units':d['verifiedUnits'],'failed':len(d['failed']),'members':t['members'],'hot':t['hotBytes'],'archive':t['archiveBytes'],'deleted':t['deletedHot'],'changed':t['changedHot'],'otherSkipped':len([s for s in d['skippedChecks'] if not s.startswith('holds released:')])}))" 2>/dev/null || echo '{"written":0}'
metrics: n2 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-2.json')); t=d['totals']; print(json.dumps({'written':1,'units':d['verifiedUnits'],'failed':len(d['failed']),'members':t['members'],'hot':t['hotBytes'],'archive':t['archiveBytes'],'deleted':t['deletedHot'],'changed':t['changedHot'],'otherSkipped':len([s for s in d['skippedChecks'] if not s.startswith('holds released:')])}))" 2>/dev/null || echo '{"written":0}'
metrics: before = sh: cat var/lab-j108/before.json 2>/dev/null || echo '{"written":0}'
metrics: after = sh: cat var/lab-j108/after.json 2>/dev/null || echo '{"written":0}'
metrics: ver = sh: cat var/lab-j108/verify.json 2>/dev/null || echo '{"written":0}'
metrics: root_free_gb = sh: df -BG --output=avail var/cubelab | tail -1 | tr -dc 0-9
metrics: efree_gb = sh: df -BG --output=avail /mnt/e | tail -1 | tr -dc 0-9
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
headline: n1.members, n2.members, n1.hot, n1.archive, n2.hot, n2.archive, before.rootFreeGb, after.rootFreeGb

**Why now.** The PC asked twice on 2026-10-07 (HEARTBEAT 08:15 and 14:45): `/` was down to 31 GB free and
is at ~46 GB, with five queue nights hot (~26 GB) and night 6 to come. J070 was this job. It refused, and
correctly: its pilot's dry run hit the hold "night 1 is held hot until J052", and J052 (gate 3) failed by
design, so that hold can never clear by itself. The cloud session lifts it now. The evaluator-as-leaf track
is stopped for good (J100: no within-decision edge; no rollout-label nights, no gate 3), so nothing needs
nights 1-2 hot: the hold "until evaluator v3 is decided or disk < 20 GB" is settled.

**Holds released, and why each.** `tools/lab/archive-holds.json` (at 503c602) holds nights 1-2 until J052,
J062, J063, J064, J067, J074 and J076-J080. J062, J063, J064 and J074 are `done` on pc-results and pass on
their own. The rest never will, and each is released on the command line (`--release-hold`), which the
manifests record as `holds released: J…`:
- **J052** (gate 3): failed by design after gate 2 failed (J052/J081); the leaf track is stopped (J100).
- **J067** (evaluator v2's encode of nights 1-3): failed; J092 built the same `var/ml/data/nights-1-3`
  and v2 from it, and the `encoded` check still requires that dataset to hold >= 90% of each night.
- **J076-J080** (rollout labels over nights 1-3): never posted, and won't be (2026-10-06 08:00 note).
No other check is waived: `redaction`, `warehouse` and `encoded` run as in J070, and a check other than
the released holds being skipped fails the job (`otherSkipped`).

**What moves (J070's method, D378).** Nights are not folders: each queue night is a plan,
`var/cubelab/queue/night-N.json`, whose chunks name a key folder and a seed range. A night's recordings are
`var/cubelab/queue/<key>/games/<seed>/` for those seeds, beside the other nights' seeds in the same key
folders. `archive.py cold --night N` packs, per key folder, only the finished seeds of night N (a seed
with a `drafts.jsonl` line) into `night-N/<key>.tar.zst`, and the night's redaction-pass folder into
`night-N/quarantine.tar.zst`, byte for byte (evidence):
- night 1: the seed folders of `night-1.json` and `var/cubelab/queue-quarantine/` (no `-n1` suffix,
  J020/J029; named with `--quarantine`);
- night 2: the seed folders of `night-2.json` and `var/cubelab/queue-quarantine-n2/` (J059).

**What stays on `/`.** Everything else: `queue.json` (the queue's ledger), every `night-N.json` plan, each
key folder's `run.json` and `drafts.jsonl` (all nights' lines), nights 3-5's seed folders, the hot copies
of the manifests and members lists (`var/cubelab/queue/archive/cold-night-N.json` and
`cold-night-N/`, a few MB), the warehouse, the datasets and the models. The matchup readers
(`tools/ml/matchup_data.py`, `matchup_verify.py`, the matchup reads of nights 1-4/1-5) read only
`run.json` + `drafts.jsonl` and skip `games/`, so they find nights 1-2 as before: no symlink is needed.
The warehouse ingest at the end records where each recording now lives (table `cold_archives`, view
`recording_location`). A later job that needs the recordings themselves runs
`python3 tools/lab/archive.py restore-night --night N` first; it writes them back where they lived and
checks each one's SHA-256.

**Safety: nothing is deleted until it is verified on the drive three times.**
1. *Archive, keep hot* (`--keep-hot`): each unit is written as `.tmp` on /mnt/e, fsynced, renamed, then
   read back from the drive, every member's name, size and SHA-256 matched against the source files,
   none missing and none extra. The manifests (`/mnt/e/forgecoach-archive/manifest.jsonl`,
   `night-N/manifest.json`, and the hot copy) are written. Nothing hot is deleted in this block.
2. *Independent check*: a separate script hashes every `.tar.zst` on /mnt/e and matches its size and
   SHA-256 against the hot manifest, and the cold `night-N/manifest.json` against the hot one, unit by
   unit. Any mismatch exits 1: the job fails here with every hot file still in place.
3. *Delete*: `archive.py cold` again, without `--keep-hot`. It re-verifies each archived unit's members
   from the drive (a unit that fails is listed in `failed` and its hot copy kept), then deletes a source
   file only if its size and mtime are still the ones archived (a changed file is kept and counted).
`archive.py` refuses (exit 3, nothing written) a night that is not closed (a live `queue run --night N`,
a file written in the last 30 minutes, a planned draft unfinished), not redaction-checked, not fully
ingested by the warehouse or under-encoded; it skips (exit 4) when /mnt/e is not mounted, is read-only
(Windows hibernated) or is on the hot disk's filesystem; either way the step fails and a person looks.
A stop anywhere is resumed by re-running (a lock keeps two runs apart; verified units are re-verified, not
re-packed).

**Never beside a queue night writing to the same root.** Nothing is queued now. Night 6 will be posted
later with `after: J108` if it lands while this runs. As a second guard, the pilot requires no `cubelab …
queue run` process on the machine, and the job aborts (TERM; resumable, nothing unverified is deleted) if
one starts. The final checks also require nights 3-5's seed folders to hold exactly the files they held
before.

## Pilot
metrics: deps = sh: python3 -c "import zstandard; print(1)" 2>/dev/null || echo 0
metrics: mounted = sh: python3 -c "import os; print(1 if os.stat('/mnt/e').st_dev != os.stat('.').st_dev else 0)" 2>/dev/null || echo 0
metrics: qrec1 = sh: find var/cubelab/queue-quarantine \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f 2>/dev/null | wc -l
metrics: qrec2 = sh: find var/cubelab/queue-quarantine-n2 \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f 2>/dev/null | wc -l
check: deps == 1
check: mounted == 1
check: qwriters == 0
check: efree_gb >= 50
check: before.written == 1 and before.plan1 == 1 and before.plan2 == 1 and before.ledger == 1
check: before.n1Files > 0 and before.n2Files > 0
check: before.q1Files > 0 and before.q2Files > 0
check: dry1.qunit >= qrec1 and dry2.qunit >= qrec2
check: dry1.written == 1 and dry2.written == 1
check: dry1.refused == 0 and dry2.refused == 0
check: dry1.skipped == 0 and dry2.skipped == 0
check: dry1.files > 0 and dry2.files > 0
check: dry1.expected < dry1.hot and dry2.expected < dry2.hot
check: dry1.expected + dry2.expected < 0.5 * dry1.free
```bash
mkdir -p var/lab-j108
# the census: free space, each night's recordings (from its plan), and what must stay (ledger, plans, run.json, drafts.jsonl)
cat > var/lab-j108/census.py <<'EOF'
import json, os, sys
root = "var/cubelab/queue"
def free_gb(p):
    s = os.statvfs(p)
    return round(s.f_bavail * s.f_frsize / 1e9, 2)
def walk_count(d):
    n = b = 0
    for dp, _dn, fn in os.walk(d):
        for f in fn:
            n += 1
            b += os.path.getsize(os.path.join(dp, f))
    return n, b
out = {"written": 1, "rootFreeGb": free_gb(root),
       "eFreeGb": free_gb("/mnt/e/forgecoach-archive") if os.path.isdir("/mnt/e/forgecoach-archive") else -1}
keys = set()
later_f = later_b = 0
for n in range(1, 6):
    pf = os.path.join(root, f"night-{n}.json")
    out[f"plan{n}"] = 1 if os.path.isfile(pf) else 0
    files = size = 0
    if out[f"plan{n}"]:
        with open(pf, encoding="utf-8") as f:
            plan = json.load(f)
        for c in plan.get("chunks") or []:
            keys.add(c["key"])
            for s in range(int(c["seed"]), int(c["seed"]) + int(c["drafts"])):
                d = os.path.join(root, c["key"], "games", str(s))
                if os.path.isdir(d):
                    k, b = walk_count(d)
                    files += k
                    size += b
    out[f"n{n}Files"], out[f"n{n}Bytes"] = files, size
    if n >= 3:
        later_f += files
        later_b += size
out["laterFiles"], out["laterBytes"] = later_f, later_b
out["keys"] = len(keys)
out["runJson"] = sum(1 for k in keys if os.path.isfile(os.path.join(root, k, "run.json")))
out["draftsJsonl"] = sum(1 for k in keys if os.path.isfile(os.path.join(root, k, "drafts.jsonl")))
out["ledger"] = 1 if os.path.isfile(os.path.join(root, "queue.json")) else 0
out["q1Files"] = walk_count("var/cubelab/queue-quarantine")[0]
out["q2Files"] = walk_count("var/cubelab/queue-quarantine-n2")[0]
tmp = sys.argv[1] + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(out, f, sort_keys=True)
os.replace(tmp, sys.argv[1])
print(json.dumps(out, sort_keys=True))
EOF
# the independent check: every archive on the drive hashed against the hot manifest, and the cold manifest against the hot one
cat > var/lab-j108/verify.py <<'EOF'
import hashlib, json, os, sys
units = ok = 0
bad = []
for n in (1, 2):
    with open(f"var/cubelab/queue/archive/cold-night-{n}.json", encoding="utf-8") as f:
        hot = json.load(f)
    cold_p = os.path.join(hot["archiveRoot"], f"night-{n}", "manifest.json")
    try:
        with open(cold_p, encoding="utf-8") as f:
            cold = json.load(f)
        if [(u["name"], u["sha256"], u["members"]) for u in cold["units"]] != \
           [(u["name"], u["sha256"], u["members"]) for u in hot["units"]]:
            bad.append(f"night {n}: {cold_p} disagrees with the hot manifest")
    except (OSError, ValueError, KeyError) as e:
        bad.append(f"night {n}: {cold_p}: {e}")
    for u in hot["units"]:
        units += 1
        h = hashlib.sha256()
        try:
            with open(u["file"], "rb") as f:
                for blk in iter(lambda: f.read(1 << 20), b""):
                    h.update(blk)
            size = os.path.getsize(u["file"])
        except OSError as e:
            bad.append(f"night {n} {u['name']}: {e}")
            continue
        if size != u["archiveBytes"] or h.hexdigest() != u["sha256"]:
            bad.append(f"night {n} {u['name']}: {size} bytes sha256 {h.hexdigest()}, manifest {u['archiveBytes']} {u['sha256']}")
        else:
            ok += 1
out = {"written": 1, "units": units, "ok": ok, "bad": len(bad)}
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(out, f, sort_keys=True)
print(json.dumps(out, sort_keys=True))
for line in bad:
    print("MISMATCH: " + line)
sys.exit(1 if bad else 0)
EOF
python3 -c "import zstandard; print('zstandard', zstandard.__version__)"
df -h / /mnt/e
du -sh var/cubelab/queue var/cubelab/queue-quarantine var/cubelab/queue-quarantine-n2 2>/dev/null || true
python3 var/lab-j108/census.py var/lab-j108/before.json
# the quarantined recordings, walked (failed.txt is not a reliable list: night 1's was overwritten by J029)
find var/cubelab/queue-quarantine var/cubelab/queue-quarantine-n2 \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f | cut -d/ -f3 | sort | uniq -c
# every check (holds released as the job's notes say), the drive, an estimate from 200 files a night; writes only archive/cold-night-N.dryrun.json
python3 tools/lab/archive.py cold --night 1 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers} --dry-run
python3 tools/lab/archive.py cold --night 2 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine-n2 --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers} --dry-run
```

## Commands
```bash
# 1. archive and read back; delete nothing
test -f var/lab-j108/census.py && test -f var/lab-j108/verify.py && test -f var/lab-j108/before.json
df -h / /mnt/e
python3 tools/lab/archive.py cold --night 1 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers} --keep-hot
python3 tools/lab/archive.py cold --night 2 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine-n2 --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers} --keep-hot
```
```bash
# 2. the independent check: exits 1 on any mismatch, with every hot file still in place
python3 var/lab-j108/verify.py var/lab-j108/verify.json
```
```bash
# 3. re-verify each unit from the drive, then delete the hot sources whose size and mtime are unchanged
python3 tools/lab/archive.py cold --night 1 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers}
python3 tools/lab/archive.py cold --night 2 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine-n2 --dataset var/ml/data/nights-1-3 --release-hold J052 --release-hold J067 --release-hold J076 --release-hold J077 --release-hold J078 --release-hold J079 --release-hold J080 --jobs {workers}
df -h / /mnt/e
```
cores: 1
```bash
# 4. what is left, and the warehouse learns where nights 1 and 2 now live (table cold_archives, view recording_location)
python3 var/lab-j108/census.py var/lab-j108/after.json
python3 tools/lab/warehouse.py ingest --out var/warehouse
```
check: n1.written == 1 and n2.written == 1
check: n1.units == dry1.units and n2.units == dry2.units
check: n1.failed == 0 and n2.failed == 0
check: n1.members == dry1.files and n2.members == dry2.files
check: n1.deleted == n1.members and n2.deleted == n2.members
check: n1.changed == 0 and n2.changed == 0
check: n1.archive < n1.hot and n2.archive < n2.hot
check: n1.otherSkipped == 0 and n2.otherSkipped == 0
check: ver.written == 1 and ver.bad == 0 and ver.ok == n1.units + n2.units
check: after.written == 1 and after.n1Files == 0 and after.n2Files == 0
check: after.laterFiles == before.laterFiles and after.laterBytes == before.laterBytes
check: after.ledger == 1 and after.plan1 == 1 and after.plan2 == 1
check: after.keys == before.keys and after.runJson == before.runJson and after.draftsJsonl == before.draftsJsonl
check: after.rootFreeGb - before.rootFreeGb >= 0.5 * (n1.hot + n2.hot) / 1000000000

## Abort if
abort: efree_gb < 20
abort: qwriters > 0
(The drive filling up, or a queue night starting to write in the same root, stops the job. It resumes
safely: verified units are re-verified, nothing unverified is ever deleted.)

## Report
collect: var/cubelab/queue/archive/cold-night-1.dryrun.json
collect: var/cubelab/queue/archive/cold-night-2.dryrun.json
collect: var/cubelab/queue/archive/cold-night-1.json
collect: var/cubelab/queue/archive/cold-night-2.json
collect: var/lab-j108/before.json
collect: var/lab-j108/after.json
collect: var/lab-j108/verify.json

summary.md: for each night, list:
- the units and their members, and the holds released (from the manifest's `skippedChecks`);
- bytes on `/` before and on `/mnt/e` after, with the ratio against the dry run's estimate;
- the hot files deleted, and any kept because they changed;
- the independent check's line (units hashed, mismatches);
- free GB on `/` and `/mnt/e` before and after (`before.json`, `after.json`), and the time each block took.

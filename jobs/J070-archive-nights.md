id: J070
title: Move queue nights 1 and 2 to the cold drive: one verified tar.zst a key folder plus each night's quarantine folder, on /mnt/e/forgecoach-archive, then free the hot disk (D378)
public_title: Archive nights 1 and 2
public_est: ~6 h
cpu: heavy
after: J062, J063, J064, J073, J074, J081, J087
repos: mtg-table@061af76 (main with the cold archive tier D378 and its --quarantine fix, PR #66 and #68)
decides: whether nights 1-2 move to the cold tier on /mnt/e (D378), freeing ~7.7 GB on the system drive
hypothesis: every member verifies by SHA-256 before deletion and the archives are ~5x smaller than gzip
rule: D378's refusals and the job's checks; any verify mismatch stops the job with nothing deleted
est: ~2-4 h a night on 4 cores (about 40,000 recordings and 4 GB of gzip a night, decompressed and packed with zstd level 19 and a 128 MB window; the dry run measures the CPU per file), plus reading every archive back to verify it
resumable: yes
max_workers: 4
cores: 4
mem_per_worker_gb: 1
timeout: 12h
metrics: dry1 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-1.dryrun.json')); e=d.get('estimate') or {}; print(json.dumps({'written':1,'qunit':sum(u['files'] for u in d['units'] if u['kind']=='quarantine'),'refused':len(d['refused']),'skipped':0 if d['skipped'] is None else 1,'units':len(d['units']),'files':d['files'],'hot':d['hotBytes'],'expected':e.get('expectedArchiveBytes') or 0,'ratio':e.get('ratio') or 0,'free':d.get('driveFreeBytes') or 0}))" 2>/dev/null || echo '{"written":0}'
metrics: dry2 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-2.dryrun.json')); e=d.get('estimate') or {}; print(json.dumps({'written':1,'qunit':sum(u['files'] for u in d['units'] if u['kind']=='quarantine'),'refused':len(d['refused']),'skipped':0 if d['skipped'] is None else 1,'units':len(d['units']),'files':d['files'],'hot':d['hotBytes'],'expected':e.get('expectedArchiveBytes') or 0,'ratio':e.get('ratio') or 0,'free':d.get('driveFreeBytes') or 0}))" 2>/dev/null || echo '{"written":0}'
metrics: n1 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-1.json')); t=d['totals']; print(json.dumps({'written':1,'units':d['verifiedUnits'],'failed':len(d['failed']),'members':t['members'],'hot':t['hotBytes'],'archive':t['archiveBytes'],'deleted':t['deletedHot'],'changed':t['changedHot'],'skippedChecks':len(d['skippedChecks'])}))" 2>/dev/null || echo '{"written":0}'
metrics: n2 = sh: python3 -c "import json; d=json.load(open('var/cubelab/queue/archive/cold-night-2.json')); t=d['totals']; print(json.dumps({'written':1,'units':d['verifiedUnits'],'failed':len(d['failed']),'members':t['members'],'hot':t['hotBytes'],'archive':t['archiveBytes'],'deleted':t['deletedHot'],'changed':t['changedHot'],'skippedChecks':len(d['skippedChecks'])}))" 2>/dev/null || echo '{"written":0}'
headline: n1.members, n1.archive, n2.members, n2.archive

Justin asked for a hot/cold split (2026-10-04). The `/` disk has about 53 GB free, and each queue night adds
about 4 GB in about 40,000 small `.jsonl.gz` files. `/mnt/e` (a Samsung 860 EVO, NTFS through ntfs3 with
`windows_names`, 534 GB free) takes the finished nights. This job moves nights 1 and 2 there with
`tools/lab/archive.py cold` (D378). Each key folder's recordings of the night become one
`night-N/<key>.tar.zst`, and the night's quarantine folder becomes `night-N/quarantine.tar.zst` (kept as
evidence). The quarantine folders are night 1's `var/cubelab/queue-quarantine/` (no `-n1` suffix,
J020/J029) and night 2's `var/cubelab/queue-quarantine-n2/` (J059), named with `--quarantine`. Night 1's
`failed.txt` was overwritten by J029, so nothing here trusts either list: the readiness check and the
quarantine archive walk the folders, as `tools/requarantine.mjs` (D371) does. The archive root is `config.json`'s `labArchiveRoot`, `/mnt/e/forgecoach-archive`. The
`drafts.jsonl` files, the warehouse, the datasets and the models stay on `/`.

**Order (`after:`).** Nights 1 and 2 stay hot until every job that reads them is done:
- J052: gate 3.
- J062, J063, J064: the morning reads of nights 1–2, the outside exam and the Omega ratings check.
- J067: the evaluator v2 dataset over nights 1–3.
- J073: the warehouse build.
- J074: the quarantine re-check, which moves recordings back into the queue.

`tools/lab/archive-holds.json` holds the same list. The archiver refuses a held night by itself unless
each named job's pc-results STATUS says `done`. Any later job that needs these recordings runs
`archive.py restore-night --night N` first.

**Refused (exit 3, nothing written) unless:**
- the night is closed;
- its redaction pass ran: its quarantine folder exists (`--quarantine`), counted by walking it;
- the warehouse ingested every one of its `drafts.jsonl` lines (`var/warehouse/_state.json`);
- `var/ml/data/nights-1-3` (J067's dataset) holds at least 90% of its recordings.

**Skipped (exit 4, a warning, nothing written)** if `/mnt/e` is not mounted, or is read-only (Windows
hibernated). Either way the job then fails here, which is the point: a person looks at the drive.

**Safe.** No hot file is deleted until its archive has been written to the drive and read back from it,
with every member's name, size and SHA-256 matched against the source files. The manifests
(`/mnt/e/forgecoach-archive/manifest.jsonl`, `night-N/manifest.json`, and the hot copy
`var/cubelab/queue/archive/cold-night-N.json`) are written before anything is deleted. A source file is
deleted only if its size and mtime are still the ones archived. Re-running the job resumes it.

## Pilot
metrics: deps = sh: python3 -c "import zstandard; print(1)" 2>/dev/null || echo 0
metrics: qdir1 = sh: test -d var/cubelab/queue-quarantine && echo 1 || echo 0
metrics: qdir2 = sh: test -d var/cubelab/queue-quarantine-n2 && echo 1 || echo 0
metrics: qrec1 = sh: find var/cubelab/queue-quarantine \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f 2>/dev/null | wc -l
metrics: qrec2 = sh: find var/cubelab/queue-quarantine-n2 \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f 2>/dev/null | wc -l
metrics: mounted = sh: python3 -c "import os; print(1 if os.stat('/mnt/e').st_dev != os.stat('.').st_dev else 0)" 2>/dev/null || echo 0
check: deps == 1
check: mounted == 1
check: qdir1 == 1 and qdir2 == 1
check: dry1.qunit >= qrec1 and dry2.qunit >= qrec2
check: dry1.written == 1 and dry2.written == 1
check: dry1.refused == 0 and dry2.refused == 0
check: dry1.skipped == 0 and dry2.skipped == 0
check: dry1.files > 0 and dry2.files > 0
check: dry1.expected < dry1.hot and dry2.expected < dry2.hot
check: dry1.expected + dry2.expected < 0.5 * dry1.free
```bash
python3 -c "import zstandard; print('zstandard', zstandard.__version__)"
df -h / /mnt/e
du -sh var/cubelab/queue var/cubelab/queue-quarantine var/cubelab/queue-quarantine-n2 2>/dev/null || true
# the quarantined recordings, walked (failed.txt is not a reliable list: night 1's was overwritten by J029)
find var/cubelab/queue-quarantine var/cubelab/queue-quarantine-n2 \( -name '*.jsonl.gz' -o -name '*.jsonl.zst' \) -type f | cut -d/ -f3 | sort | uniq -c
# every check, the drive, and an estimate from 200 files a night packed in memory; writes only archive/cold-night-N.dryrun.json
python3 tools/lab/archive.py cold --night 1 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --jobs {workers} --dry-run
python3 tools/lab/archive.py cold --night 2 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine-n2 --dataset var/ml/data/nights-1-3 --jobs {workers} --dry-run
```

## Commands
```bash
df -h / /mnt/e
python3 tools/lab/archive.py cold --night 1 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine --dataset var/ml/data/nights-1-3 --jobs {workers}
python3 tools/lab/archive.py cold --night 2 --root var/cubelab/queue --quarantine var/cubelab/queue-quarantine-n2 --dataset var/ml/data/nights-1-3 --jobs {workers}
df -h / /mnt/e
# the warehouse learns where nights 1 and 2 now live (table cold_archives, view recording_location)
python3 tools/lab/warehouse.py ingest --out var/warehouse
```
check: n1.written == 1 and n2.written == 1
check: n1.units == dry1.units and n2.units == dry2.units
check: n1.failed == 0 and n2.failed == 0
check: n1.members == dry1.files and n2.members == dry2.files
check: n1.deleted == n1.members and n2.deleted == n2.members
check: n1.changed == 0 and n2.changed == 0
check: n1.archive < n1.hot and n2.archive < n2.hot
check: n1.skippedChecks == 0 and n2.skippedChecks == 0

## Abort if
abort: elapsed_s > 43200

## Report
collect: var/cubelab/queue/archive/cold-night-1.dryrun.json
collect: var/cubelab/queue/archive/cold-night-2.dryrun.json
collect: var/cubelab/queue/archive/cold-night-1.json
collect: var/cubelab/queue/archive/cold-night-2.json

summary.md: for each night, list:
- the units and their members;
- bytes on `/` before, and on `/mnt/e` after, with the ratio against the dry run's estimate;
- the time;
- the hot files deleted;
- `df` for `/` and `/mnt/e` before and after;
- the checks' lines from the manifest.

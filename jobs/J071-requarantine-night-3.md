id: J071
title: Re-check night 3's quarantined recordings with the fixed redaction checker (D371) and restore only the ones that now pass every check
public_title: Quarantine re-check, night 3
public_est: ~30 min
cpu: heavy
cores: 2
after: J061, J074
repos: mtg-table@a2480d7 (the same commit as J074: tools/requarantine.mjs and the D371 checker)
decides: which of night 3's quarantined recordings are false positives, so J061's keep/stop rule and night 4 read quarantines with the D371 checker (J061's rule says so)
hypothesis: night 3 ran on c09ddfa (before D371), so most of its quarantine is the Gonti / Thief of Sanity false positive and now passes; D352's A3 leak and "own hand card has no name" are the only kinds expected to stay
rule: none for a verdict: night 4 is not posted if a still-failing kind other than those two appears (night-4 plan, written 2026-10-05 before J061 ran)
est: ~30 min on 2 cores
resumable: no
max_workers: 2
mem_per_worker_gb: 1
timeout: 3h
clean: var/requarantine/pilot-n3
metrics: pilot3 = sh: python3 -c "import json; d=json.load(open('var/requarantine/pilot-n3/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass']}))" 2>/dev/null || echo '{"written":0,"recordings":0,"nowPass":0}'
metrics: pilotmoves = sh: test -e var/requarantine/pilot-n3/manifest.jsonl && echo 1 || echo 0
metrics: noverdict = sh: cat var/requarantine/pilot-n3/results.jsonl var/requarantine/n3/results.jsonl 2>/dev/null | grep -c 'printed no verdict' || true
metrics: n3 = sh: python3 -c "import json; d=json.load(open('var/requarantine/n3/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass'],'stillFail':d['stillFail']}))" 2>/dev/null || echo '{"written":0}'
metrics: restored = sh: cat var/requarantine/n3/manifest.jsonl 2>/dev/null | wc -l
metrics: left3 = sh: find var/cubelab/queue-quarantine-n3 -name '*.jsonl.gz' | wc -l
headline: n3.recordings, n3.nowPass, restored

J074 for night 3. Night 3 (J061) ran its redaction pass on c09ddfa, before D371 fixed the checker's
A9 rule (Gonti, Lord of Luxury and Thief of Sanity let their controller look at a face-down exiled
card), so its quarantine likely holds the same false positive as nights 1 and 2. This re-checks
`var/cubelab/queue-quarantine-n3` with the fixed checker (night 3's own, c09ddfa's, for the "before"
kinds) and restores only recordings that now pass every check, exactly as J074 does; see J074 for
`check`, `restore` and `undo`. `after: J074` keeps the two re-checks from running at once.

If the quarantine folder is empty or missing (night 3 quarantined nothing), the pilot fails its
`written` check and nothing moves; say so in summary.md.

## Pilot
A dry run on 20 recordings: `check --limit 20`, then `restore --dry-run`. Nothing moves.
```bash
mkdir -p var/requarantine
git show c09ddfa:tools/check-redaction.mjs > var/requarantine/check-redaction-n3.mjs || rm -f var/requarantine/check-redaction-n3.mjs
node tools/requarantine-selftest.mjs
old=""; [ -s var/requarantine/check-redaction-n3.mjs ] && old="--old-checker var/requarantine/check-redaction-n3.mjs"
node tools/requarantine.mjs check --night 3 --quarantine var/cubelab/queue-quarantine-n3 --queue var/cubelab/queue \
  --out var/requarantine/pilot-n3 --limit 20 --jobs 2 $old
node tools/requarantine.mjs restore --night 3 --quarantine var/cubelab/queue-quarantine-n3 --queue var/cubelab/queue \
  --out var/requarantine/pilot-n3 --dry-run
```
check: pilot3.written == 1
check: pilot3.recordings >= 1
check: pilotmoves == 0
check: noverdict == 0

## Commands
```bash
old=""; [ -s var/requarantine/check-redaction-n3.mjs ] && old="--old-checker var/requarantine/check-redaction-n3.mjs"
rm -rf var/requarantine/n3
node tools/requarantine.mjs check --night 3 --quarantine var/cubelab/queue-quarantine-n3 --queue var/cubelab/queue \
  --out var/requarantine/n3 --jobs 2 $old
```
check: n3.written == 1
check: noverdict == 0
check: n3.recordings >= 1

```bash
node tools/requarantine.mjs restore --night 3 --quarantine var/cubelab/queue-quarantine-n3 --queue var/cubelab/queue \
  --out var/requarantine/n3 | tee var/requarantine/n3/restore.json
```
check: restored == n3.nowPass
check: left3 == n3.stillFail

## Abort if
abort: elapsed_s > 10800
abort: noverdict > 0

## Report
collect: var/requarantine/n3/report.md
collect: var/requarantine/n3/report.json
collect: var/requarantine/n3/manifest.jsonl
collect: var/requarantine/n3/restore.json
collect: var/cubelab/queue-quarantine-n3/recheck.jsonl

summary.md, plainly:
- the report table: by the old failure kind, how many recordings, how many now pass, and what the
  rest still fail on;
- how many were restored, and any `skipped` line from `restore.json` with its reason;
- the still-failing kinds, with one message of each from `recheck.jsonl`; flag any kind other than
  A3 (D352) and "own hand card has no name" at the top: night 4 waits on it;
- whether c09ddfa's checker could be read, or the kinds are the new checker's;
- the undo command: `node tools/requarantine.mjs undo --manifest var/requarantine/n3/manifest.jsonl`.

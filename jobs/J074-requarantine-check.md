id: J074
title: Re-check nights 1 and 2's quarantined recordings with the fixed redaction checker (D371) and restore only the ones that now pass every check
public_title: Quarantine re-check
public_est: ~1 h
cpu: heavy
cores: 2
after: J050
repos: mtg-table@a2480d7 (main with the face-down checker fix and tools/requarantine.mjs, PR #61, D371)
est: ~30-60 min on 2 cores (about 1,500 recordings; the checker reads one gzipped log in about a second; the old checker runs too, for the "before" kinds)
resumable: no
max_workers: 2
mem_per_worker_gb: 1
timeout: 3h
clean: var/requarantine/pilot-n1 var/requarantine/pilot-n2
metrics: pilot1 = sh: python3 -c "import json; d=json.load(open('var/requarantine/pilot-n1/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass']}))" 2>/dev/null || echo '{"written":0,"recordings":0,"nowPass":0}'
metrics: pilot2 = sh: python3 -c "import json; d=json.load(open('var/requarantine/pilot-n2/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass']}))" 2>/dev/null || echo '{"written":0,"recordings":0,"nowPass":0}'
metrics: pilotmoves = sh: test -e var/requarantine/pilot-n1/manifest.jsonl -o -e var/requarantine/pilot-n2/manifest.jsonl && echo 1 || echo 0
metrics: noverdict = sh: cat var/requarantine/*/results.jsonl 2>/dev/null | grep -c 'printed no verdict' || true
metrics: n1 = sh: python3 -c "import json; d=json.load(open('var/requarantine/n1/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass'],'stillFail':d['stillFail']}))" 2>/dev/null || echo '{"written":0}'
metrics: n2 = sh: python3 -c "import json; d=json.load(open('var/requarantine/n2/report.json')); print(json.dumps({'written':1,'recordings':d['recordings'],'nowPass':d['nowPass'],'stillFail':d['stillFail']}))" 2>/dev/null || echo '{"written":0}'
metrics: restored = sh: cat var/requarantine/n1/manifest.jsonl var/requarantine/n2/manifest.jsonl 2>/dev/null | wc -l
metrics: left1 = sh: find var/cubelab/queue-quarantine -name '*.jsonl.gz' | wc -l
metrics: left2 = sh: find var/cubelab/queue-quarantine-n2 -name '*.jsonl.gz' | wc -l
headline: n1.nowPass, n2.nowPass, restored

Nights 1 and 2 quarantined 822 (J020 + J029, on bf3dca7) and 684 (J059, on d68f5ec) recordings that
failed `tools/check-redaction.mjs`. D371 found that about 90 % of night 2's failures were the checker's
A9 rule misreading Forge: Gonti, Lord of Luxury (peasant) and Thief of Sanity (modern-era) exile an
opponent's card face down and let their controller look at it, so that card's `alt` in that seat's log
is correct. The rule is fixed on this commit. Night 1 most likely holds the same false positive, beside
D352's revealed-library-top leak, which is real and still fails.

This job re-checks every quarantined recording of the two nights with the fixed checker, reports per
night and per failure kind how many now pass, and moves back **only** the recordings that now pass
**every** check, to the same path under `var/cubelab/queue/` they were quarantined from. It uses
`tools/requarantine.mjs` (D371, with its self-test):

- `check` moves nothing. It writes `results.jsonl` (one line per recording: sha256, the old checker's
  failure kinds, the new verdict, the new kinds and messages), `report.json` and `report.md`.
- `restore` moves a recording only if its new verdict is PASS, its bytes still match the sha256 that
  `check` recorded, and the queue has no file at that path. Each move is one line of `manifest.jsonl`.
  `failed.txt` is copied to `failed.before-restore.txt` and then rewritten without the restored paths.
  Recordings that still fail stay quarantined, and their new messages, which now say which shape a
  card was and where it was last seen, go to `<quarantine>/recheck.jsonl`.
- `node tools/requarantine.mjs undo --manifest var/requarantine/n<N>/manifest.jsonl` reverses the
  restore exactly. It moves only files whose hash is unchanged and puts `failed.txt` back.

**"Before" kinds.** `failed.txt` stores paths, not reasons, and night 1's `failed.txt` was rewritten
by J029, so `check` walks the quarantine folders and re-runs each night's own checker (`git show
<that night's commit>:tools/check-redaction.mjs`) for the old kinds. If that `git show` fails, the
report falls back to the new checker's kinds, and summary.md says so.

**Safe beside a queue night.** It touches only the two quarantine folders and the paths it restores.
A rename keeps the file's mtime, so a later night's redaction pass (`-newer` its plan) does not
re-check what this job restored. Night 3's quarantine (`-n3`, J061 on c09ddfa) is left alone: its
own job's pass already ran the old A9, and it can get its own re-check once this one is read.

`after: J050` keeps it behind the regret gate's truth tables, as J061 and J062 are.

## Pilot
A dry run on 20 recordings of each night: `check --limit 20`, then `restore --dry-run`. Nothing moves.
```bash
mkdir -p var/requarantine
git show bf3dca7:tools/check-redaction.mjs > var/requarantine/check-redaction-n1.mjs || rm -f var/requarantine/check-redaction-n1.mjs
git show d68f5ec:tools/check-redaction.mjs > var/requarantine/check-redaction-n2.mjs || rm -f var/requarantine/check-redaction-n2.mjs
node tools/requarantine-selftest.mjs
for n in 1 2; do
  q=var/cubelab/queue-quarantine; [ "$n" = 1 ] || q=var/cubelab/queue-quarantine-n$n
  old=""; [ -s var/requarantine/check-redaction-n$n.mjs ] && old="--old-checker var/requarantine/check-redaction-n$n.mjs"
  node tools/requarantine.mjs check --night $n --quarantine $q --queue var/cubelab/queue \
    --out var/requarantine/pilot-n$n --limit 20 --jobs 2 $old
  node tools/requarantine.mjs restore --night $n --quarantine $q --queue var/cubelab/queue \
    --out var/requarantine/pilot-n$n --dry-run
done
```
check: pilot1.written == 1
check: pilot2.written == 1
check: pilot1.recordings == 20
check: pilot2.recordings == 20
check: pilotmoves == 0
check: noverdict == 0

## Commands
```bash
for n in 1 2; do
  q=var/cubelab/queue-quarantine; [ "$n" = 1 ] || q=var/cubelab/queue-quarantine-n$n
  old=""; [ -s var/requarantine/check-redaction-n$n.mjs ] && old="--old-checker var/requarantine/check-redaction-n$n.mjs"
  rm -rf var/requarantine/n$n
  node tools/requarantine.mjs check --night $n --quarantine $q --queue var/cubelab/queue \
    --out var/requarantine/n$n --jobs 2 $old
done
```
check: n1.written == 1
check: n2.written == 1
check: noverdict == 0
check: n1.recordings >= 1
check: n2.recordings >= 1

```bash
for n in 1 2; do
  q=var/cubelab/queue-quarantine; [ "$n" = 1 ] || q=var/cubelab/queue-quarantine-n$n
  node tools/requarantine.mjs restore --night $n --quarantine $q --queue var/cubelab/queue \
    --out var/requarantine/n$n | tee var/requarantine/n$n/restore.json
done
```
check: restored == n1.nowPass + n2.nowPass
check: left1 == n1.stillFail
check: left2 == n2.stillFail

## Abort if
abort: elapsed_s > 10800
abort: noverdict > 0

## Report
collect: var/requarantine/n1/report.md
collect: var/requarantine/n2/report.md
collect: var/requarantine/n1/report.json
collect: var/requarantine/n2/report.json
collect: var/requarantine/n1/manifest.jsonl
collect: var/requarantine/n2/manifest.jsonl
collect: var/requarantine/n1/restore.json
collect: var/requarantine/n2/restore.json
collect: var/cubelab/queue-quarantine/recheck.jsonl
collect: var/cubelab/queue-quarantine-n2/recheck.jsonl

summary.md, plainly:
- per night, the two report tables: by the old failure kind, how many recordings, how many now pass,
  and what the rest still fail on;
- how many were restored per night, and any `skipped` line from `restore.json` with its reason;
- the still-failing kinds, with one message of each from `recheck.jsonl`. These are real findings:
  A3 (D352's leak on night 1) is expected, and an "own hand card has no name" message now says the
  stub's controller and where the card was last seen, which is what D371 needs to root-cause it;
- whether the old checker could be read for each night, or the kinds are the new checker's;
- the undo command, for the record:
  `node tools/requarantine.mjs undo --manifest var/requarantine/n<N>/manifest.jsonl`.

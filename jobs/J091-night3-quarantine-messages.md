id: J091
title: Collect the messages of night 3's still-quarantined recordings (the one M55 failure and the stray non-recording file), so a person can judge night 4's stop row
public_title: Night 3 quarantine messages
public_est: ~2 min
cpu: heavy
cores: 1
repos: mtg-table@a2480d7 (the same commit as J074 and J084; nothing here runs mtg-table code beyond python3 and find)
est: ~2 min
resumable: no
max_workers: 1
mem_per_worker_gb: 1
timeout: 30m
clean: var/diag-n3
metrics: pfiles = sh: test -s var/diag-n3-where.txt && echo 1 || echo 0
metrics: written = sh: test -s var/diag-n3/messages.md && echo 1 || echo 0
metrics: gz = sh: find var/cubelab -path '*quarantine*n3*' -name '*.jsonl.gz' | wc -l
headline: gz

J084 (night 3's re-check, re-posted J071) failed only on `left3 == n3.stillFail` (44 against 45): J071 had
already restored 660 recordings at 10:55 before the pause, and J084 re-checked what was left. The 45th
"recording" is probably not a game (J071's own `recheck.jsonl` beside the quarantined logs, which the
checker then read and called `other`/`shape`). The other kinds: 43 `own-hand-no-name` (known) and one
**M55** (an AI seat's private decision record), which J082's pre-registered stop row (`rq3`) says a person
must look at before night 4 runs. This job moves nothing; it only writes what is there.

## Pilot
J088's pilot (`test -d var/cubelab/queue-quarantine-n3`) failed, so this one only records where things are.
```bash
{ echo "pwd: $(pwd)"; ls -ld var var/cubelab 2>&1; ls -d var/cubelab/queue-quarantine* 2>&1; ls -d var/requarantine/* 2>&1; } > var/diag-n3-where.txt || true
cat var/diag-n3-where.txt
```
check: pfiles == 1

## Commands
```bash
Q=var/cubelab/queue-quarantine-n3
[ -d "$Q" ] || Q=$(ls -d var/cubelab/queue-quarantine*n3* 2>/dev/null | head -1)
D=var/diag-n3
rm -rf "$D"; mkdir -p "$D"; cp var/diag-n3-where.txt "$D/where.txt"; echo "quarantine: $Q" >> "$D/where.txt"
find "$Q" -type f ! -name '*.jsonl.gz' -printf '%P\t%s bytes\n' | sort > "$D/non-recordings.txt"
cp var/requarantine/n3/report.md "$D/report-J084.md" 2>/dev/null || true
python3 - "$Q" > "$D/messages.md" <<'PY'
import json, os, sys, collections
q = sys.argv[1]
path = os.path.join(q, 'recheck.jsonl')
print('# Night 3 quarantine: still-failing messages\n')
if not os.path.exists(path):
    print('no recheck.jsonl'); sys.exit(0)
rows = [json.loads(l) for l in open(path) if l.strip()]
print(f'{len(rows)} lines in recheck.jsonl\n')
by = collections.Counter()
for r in rows:
    s = json.dumps(r)
    kind = 'M55' if 'M55' in s else ('own-hand-no-name' if 'no name' in s else 'other')
    by[kind] += 1
    if kind != 'own-hand-no-name' or by[kind] <= 2:
        print(f'## {kind}\n```json\n{json.dumps(r, indent=1)[:6000]}\n```\n')
print('counts:', dict(by))
PY
```
check: written == 1

## Report
collect: var/diag-n3/messages.md
collect: var/diag-n3/where.txt
collect: var/diag-n3/non-recordings.txt
collect: var/diag-n3/report-J084.md

summary.md: the counts line from messages.md, the non-recordings list, and the M55 message verbatim.

id: J094
title: Extract the one M55 failure (night 3, modern-era+omega game 354 g1 seat 1, decision 58 names land:99) so its cause can be found
public_title: M55 root-cause extract
public_est: ~2 min
cpu: heavy
cores: 1
repos: mtg-table@a2480d7 (J091's commit; nothing here runs mtg-table code beyond python3)
est: ~2 min
resumable: no
max_workers: 1
mem_per_worker_gb: 1
timeout: 30m
clean: var/diag-m55
metrics: found = sh: test -s var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz && echo 1 || echo 0
metrics: written = sh: test -s var/diag-m55/extract.md && echo 1 || echo 0
headline: written

J091 showed the only M55 in night 3's quarantine: "decision 58 names card 99 (land:99), which its state frame
does not show seat 1". This job reads that one recording, which stays quarantined; it moves nothing. It
writes the session header, decision 58's record, the state frame it points to (`frame` index) with every
mention of id 99 in it, and every line between the previous state frame and the next that mentions id 99,
so the bridge's recorder or Forge rule behind the option can be found (a land played from the top of the
library: Oracle of Mul Daya, Courser of Kruphix, Future Sight, ...).

## Pilot
```bash
test -s var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz
```
check: found == 1

## Commands
```bash
mkdir -p var/diag-m55
python3 - var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz > var/diag-m55/extract.md <<'PY'
import gzip, json, re, sys
lines = [l for l in gzip.open(sys.argv[1], 'rt') if l.strip()]
recs = [json.loads(l) for l in lines]
def has99(o):
    return re.search(r'(?<![0-9])99(?![0-9])', json.dumps(o)) is not None
print('# M55 extract\n')
print(f'{len(recs)} lines\n\n## header\n```json\n{json.dumps(recs[0], indent=1)[:4000]}\n```\n')
dec = [ (i, r) for i, r in enumerate(recs) if r.get('dir') == 'ai' and (r.get('msg') or r).get('type', r.get('kind')) == 'decision' ]
target = None
for i, r in dec:
    body = r.get('msg') or r
    if body.get('n') == 58 or (has99(body) and 'land:99' in json.dumps(body)):
        target = (i, r)
        if body.get('n') == 58: break
if not target:
    print('decision 58 not found; decisions:', len(dec)); sys.exit(0)
i, r = target
body = r.get('msg') or r
print(f'## decision (line {i})\n```json\n{json.dumps(r, indent=1)[:8000]}\n```\n')
fi = body.get('frame')
# frames[] = every line after the header
if isinstance(fi, int) and 0 <= fi + 1 < len(recs):
    sf = recs[fi + 1]
    print(f'## state frame (frames[{fi}] = line {fi+1})\n```json\n{json.dumps(sf, indent=1)[:20000]}\n```\n')
lo = max(1, (fi or i) - 40); hi = min(len(recs), i + 10)
print(f'## lines {lo}..{hi} that mention id 99\n')
for k in range(lo, hi):
    if has99(recs[k]):
        print(f'### line {k}\n```json\n{json.dumps(recs[k], indent=1)[:6000]}\n```\n')
PY
```
check: written == 1

## Report
collect: var/diag-m55/extract.md

summary.md: the decision's kind, options and chosen; whether card 99 appears in the state frame and in which
zone; the event that first shows id 99 to seat 1, if any.

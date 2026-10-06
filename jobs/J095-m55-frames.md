id: J095
title: The M55 recording's frames in full: where card 99 is (or is not) in the state frames of decisions 55, 58, 60 and 63
public_title: M55 frames
public_est: ~2 min
cpu: heavy
cores: 1
repos: mtg-table@a2480d7 (J094's commit; nothing here runs mtg-table code beyond python3)
est: ~2 min
resumable: no
max_workers: 1
mem_per_worker_gb: 1
timeout: 30m
clean: var/diag-m55b
metrics: found = sh: test -s var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz && echo 1 || echo 0
metrics: written = sh: test -s var/diag-m55b/frames.md && echo 1 || echo 0
headline: written

J094 cut each state frame at 6,000 characters, before seat 1's zones. In that file, seat 1's decisions 55, 58,
60 and 63 (turn 20, MAIN1, frames 431, 436, 442, 448) all offer `land:99`, and only 58 was flagged; 58 was
an exploring decision (`explore.rule = random`). This job prints, for each of those frames and the lines
between them, every object with id 99 (zone, controller, revealed or not, its full entry), seat 1's
library entry (count, any listed cards), every battlefield card's name, and every non-state line (events).
It moves nothing; the recording stays quarantined.

## Pilot
```bash
test -s var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz
```
check: found == 1

## Commands
```bash
mkdir -p var/diag-m55b
python3 - var/cubelab/queue-quarantine-n3/bridge/modern-era+omega/games/354/g1-seat1.jsonl.gz > var/diag-m55b/frames.md <<'PY'
import gzip, json, sys
recs = [json.loads(l) for l in gzip.open(sys.argv[1], 'rt') if l.strip()]
def walk(o, path=''):
    if isinstance(o, dict):
        yield path, o
        for k, v in o.items():
            yield from walk(v, f'{path}/{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f'{path}[{i}]')
print('# M55 frames (recording line = frames[] index + 1)\n')
for ln in range(425, min(len(recs), 452)):
    r = recs[ln]; b = r.get('body') or {}
    print(f'## line {ln} (frames[{ln-1}]): dir {r.get("dir")} type {r.get("type")} seq {r.get("seq")}')
    if r.get('type') != 'state':
        print('```json\n' + json.dumps(r)[:3000] + '\n```\n'); continue
    for path, o in walk(b):
        if o.get('id') == 99:
            print(f'- id 99 at `{path}`: `{json.dumps(o)[:800]}`')
    for p in b.get('players', []):
        z = p.get('zones', {})
        lib = z.get('library', {})
        print(f'- player {p.get("id")}: library count {lib.get("count")}, listed {json.dumps(lib.get("cards", []))[:600]}')
        bf = [c.get('name') or ('?' if c.get('hidden') else c.get('id')) for c in z.get('battlefield', {}).get('cards', [])]
        print(f'  battlefield: {bf}')
        for zn in ('hand', 'graveyard', 'exile'):
            cs = z.get(zn, {}).get('cards', [])
            print(f'  {zn}: ' + ', '.join(f'{c.get("id")}:{c.get("name", "hidden" if c.get("hidden") else "?")}' for c in cs))
    print()
PY
```
check: written == 1

## Report
collect: var/diag-m55b/frames.md

summary.md: for each of frames 431, 436, 442, 448 whether id 99 is present and where; what changed between 431 and 436.

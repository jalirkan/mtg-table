id: J005
title: Recording overhead on the 9700X (wall clock), recording on vs off
cpu: heavy
after: J003
repos: mtg-table@main (a43dea2 or later; this adds --record-all)
est: ~25 min

Afterwards J004 (the Omega evolve) runs with `--record-all`. This job checks first that
recording doesn't slow the lab down much.

## Pilot
```bash
cd /home/justin-a/code/mtg-table && git checkout main && git pull && ./bridge/build.sh
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 4 --games 1 --jobs 2 --seed 9001 --record-all --out var/cubelab/runs/pilot-rec
find var/cubelab/runs/pilot-rec/games -name '*.gz' | wc -l
node tools/check-redaction.mjs var/cubelab/runs/pilot-rec/games/*/*.gz
python3 tools/ml/encode.py --run-dir var/cubelab/runs/pilot-rec --out /dev/null
```
Checks:
- `find` prints 8.
- The redaction checker exits 0.
- `encode.py` reports rows from 8 games.
- There are no `ENGINE ERROR` lines.

## Commands
Run these one after the other, never at the same time:
```bash
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 150 --games 1 --jobs 7 --seed 9101 --out var/cubelab/runs/ovh-off
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --drafts 150 --games 1 --jobs 7 --seed 9101 --record-all --out var/cubelab/runs/ovh-on
python3 -c "import json;[print(a,*(lambda G:(len(G),round(sum(g['ms'] for g in G)/len(G)),round(sum(g['ms'] for g in G)/sum(g['turns'] for g in G)),round(sum(g['cpuMs'] for g in G)/sum(g['turns'] for g in G)),sum(g.get('recorded',{}).get('bytes',0) for g in G)//max(1,len(G))))([g for l in open(f'var/cubelab/runs/ovh-{a}/drafts.jsonl') for g in json.loads(l)['match']['games']])) for a in ('off','on')]"
```

## Abort if
- Justin starts playing.
- There are more than 2 `ENGINE ERROR` lines.
- Any `recorded` entry has `errors > 0`.

## Report
- The `matches:` and `recorded:` lines from both runs.
- The python output line for each arm: games, mean ms per game, ms per turn, CPU ms per
  turn, and bytes per game.
- The `uptime` load during the runs.
- The wall time of each run.

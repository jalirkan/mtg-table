"""Census of the atlas's branch frame logs on disk: per night, how many branch games were played under the random
continuation and under the Forge continuation (the Forge map), from each spine's atlas.json `timing` and the file
names under phaseB/frames, and their bytes. Read-only. Usage: python3 branch_census.py > ../tables/branch-census.md"""
import os, glob, json, re, collections

DATA = '/home/justin-a/code/lab/data'
pat = re.compile(r'^d\d+-(random|forge)-o\d+-b\d+-seat\d\.jsonl\.(gz|zst)$')
print('# Branch frame logs on disk, by continuation\n')
print('| night | spines | branch games (atlas.json) | random logs | random GB | Forge-map logs | Forge-map GB | other GB |')
print('|---|---|---|---|---|---|---|---|')
T = collections.Counter()
for night in sorted(glob.glob(f'{DATA}/lab-j*')):
    c = collections.Counter(); b = collections.Counter(); games = 0; spines = 0
    for sp in sorted(glob.glob(f'{night}/b-s*')):
        spines += 1
        aj = glob.glob(f'{night}/report/{os.path.basename(sp)}.atlas.json') or glob.glob(f'{sp}/atlas.json')
        if aj:
            try:
                games += json.load(open(aj[0]))['timing']['phaseB']['branchGames']
            except Exception:
                pass
        for root, _, files in os.walk(sp):
            for f in files:
                p = os.path.join(root, f)
                try:
                    s = os.path.getsize(p)
                except OSError:
                    continue
                m = pat.match(f)
                k = m.group(1) if m else 'other'
                c[k] += 1; b[k] += s
    if spines == 0:
        continue
    for k in ('random', 'forge', 'other'):
        T[k + 'n'] += c[k]; T[k + 'b'] += b[k]
    T['games'] += games
    print(f"| {os.path.basename(night)} | {spines} | {games} | {c['random']} | {b['random']/1e9:.1f} | {c['forge']} | {b['forge']/1e9:.2f} | {b['other']/1e9:.1f} |")
print(f"| all | | {T['games']} | {T['randomn']} | {T['randomb']/1e9:.1f} | {T['forgen']} | {T['forgeb']/1e9:.2f} | {T['otherb']/1e9:.1f} |")
print('\nA branch game writes one log per seat it records (seat0/seat1 in the name); the Forge map is played on the spines '
      'the plan names (three of thirteen since D480).')

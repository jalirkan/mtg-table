"""Every atlas night's label file in one table: contract, seat, branched rows, labels, confident, partial,
worker-hours, disk. Read-only over /home/justin-a/code/lab/data. Usage: python3 atlas_nights.py > ../tables/atlas-nights.md"""
import json, os, glob, subprocess

DATA = '/home/justin-a/code/lab/data'
rows = []
for d in sorted(glob.glob(f'{DATA}/lab-j*')):
    lp = f'{d}/report/labels.json'
    try:
        size = int(subprocess.run(['du', '-sb', d], capture_output=True, text=True).stdout.split()[0])
    except Exception:
        size = 0
    if not os.path.exists(lp):
        rows.append(dict(night=os.path.basename(d), size=size))
        continue
    L = json.load(open(lp))
    seat = ','.join((L.get('byRandomSeat') or {}).keys()) or '?'
    sz = L.get('c_sizingReadUnbiased') or L.get('c_sizingRead') or {}
    wh = sz.get('workerHours')
    if wh is None and isinstance(L.get('c_sizing7'), dict):
        wh = sum((v or {}).get('workerHours', 0) for v in (L['c_sizing7'].get('bySpine') or {}).values()) or None
    spines = len(L.get('bySpine') or {})
    rows.append(dict(night=os.path.basename(d), contract=L.get('contract'), training=L.get('training'), seat=seat,
                     spines=spines, branched=L.get('branched'), labels=L.get('labels'), confident=L.get('confident'),
                     confidentForge=L.get('confidentForge'), partial=L.get('partialLabels'),
                     screened=L.get('screenedRows'), wh=wh, size=size,
                     share=(L.get('a_confidentShare') or {}).get('point'),
                     regret=(L.get('b_regretMean') or {}).get('point')))

print('# The atlas nights: one row per label file (`report/labels.json`), plus the folders without one\n')
print('| night | contract | seat | spines | branched | labels | confident | confident by Forge map | partial | worker-h (branch) | confident / worker-h | disk GB |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
tot = dict(labels=0, confident=0, wh=0.0, size=0, branched=0, partial=0, cf=0)
d508 = dict(labels=0, confident=0, wh=0.0)
for r in rows:
    tot['size'] += r['size']
    if 'labels' not in r:
        print(f"| {r['night']} | (no label file) | | | | | | | | | | {r['size']/1e9:.1f} |")
        continue
    wh = r['wh']; c = r['confident'] or 0
    tot['labels'] += r['labels'] or 0; tot['confident'] += c; tot['branched'] += r['branched'] or 0
    tot['partial'] += r['partial'] or 0; tot['cf'] += r['confidentForge'] or 0
    if wh: tot['wh'] += wh
    if 'D508' in r['seat']:
        d508['labels'] += r['labels'] or 0; d508['confident'] += c; d508['wh'] += wh or 0
    print(f"| {r['night']} | {r['contract']} | {r['seat']} | {r['spines']} | {r['branched']} | {r['labels']} | {c} | "
          f"{r['confidentForge']} | {r['partial']} | {wh if wh is None else round(wh,1)} | "
          f"{'' if not wh else round(c/wh,3)} | {r['size']/1e9:.1f} |")
print(f"\nTotals over label files: {tot['branched']} branched rows, {tot['labels']} complete labels, {tot['confident']} confident "
      f"(of them {tot['cf']} confident on the Forge map), {tot['partial']} partial labels, {tot['wh']:.1f} branch worker-hours where the "
      f"file states them. Disk over every lab-j* folder: {tot['size']/1e9:.1f} GB.")
print(f"D508 seat only: {d508['labels']} labels, {d508['confident']} confident, {d508['wh']:.1f} worker-hours "
      f"({d508['confident']/d508['wh'] if d508['wh'] else float('nan'):.3f} confident a worker-hour).")
print('\nConfident labels are NOT distinct decisions across nights: nights on one seat replay the same 13 deck seeds only when '
      'the job says so (D508 population: fresh deck seeds each night, J186-J191). Nights on different seats are never pooled for '
      'training (D486, D488).')

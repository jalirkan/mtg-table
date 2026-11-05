"""The random map against the Forge map, every night with a reads.json: same best option, rank correlation, and the
regret of Forge's own option (o0) under each map; plus the futility and cap reads from labels.json.
Read-only. Usage: python3 atlas_agreement.py > ../tables/atlas-agreement.md"""
import json, glob, os

DATA = '/home/justin-a/code/lab/data'
print('# Random map vs Forge map, per night (reads.json), and the futility controls (labels.json)\n')
print('| night | seat | same best (n, share [95%]) | rank rho (n, point [95%]) | o0 regret, priority: random map | o0 regret, priority: Forge map | futility controls confident |')
print('|---|---|---|---|---|---|---|')
agg = dict(n=0, same=0.0, rn=0, rsum=0.0)
for night in sorted(glob.glob(f'{DATA}/lab-j*')):
    rp, lp = f'{night}/report/reads.json', f'{night}/report/labels.json'
    if not os.path.exists(rp):
        continue
    R = json.load(open(rp)); L = json.load(open(lp)) if os.path.exists(lp) else {}
    sb = R.get('i_sameBest') or {}; rh = R.get('ii_rho') or {}
    rg = (R.get('iii_regret') or {}).get('p') or {}
    seat = ','.join((L.get('byRandomSeat') or {}).keys()) or '?'
    fr = L.get('f_futilityRead') or {}
    def f(x):
        if not x or x.get('point') is None: return '–'
        iv = x.get('interval') or [None, None]
        return f"{x.get('n')}, {x['point']:.2f} [{iv[0] if iv[0] is None else round(iv[0],2)}, {iv[1] if iv[1] is None else round(iv[1],2)}]"
    if sb.get('n'):
        agg['n'] += sb['n']; agg['same'] += sb['point'] * sb['n']
    if rh.get('n'):
        agg['rn'] += rh['n']; agg['rsum'] += rh['point'] * rh['n']
    fc = f"{fr.get('controlsConfident')} of {fr.get('controlsComplete')}" if fr else '–'
    print(f"| {os.path.basename(night)} | {seat} | {f(sb)} | {f(rh)} | {f(rg.get('random'))} | {f(rg.get('forge'))} | {fc} |")
if agg['n']:
    print(f"\nPooled over the nights above (decision-weighted means, populations mixed, a description not an estimate): same best "
          f"{agg['same']/agg['n']:.2f} over {agg['n']} decisions; rank rho {agg['rsum']/agg['rn']:.2f} over {agg['rn']} decisions.")

import json,gzip
D='/home/justin-a/code/lab/data/lab-j166/'
def decs(p):
    out=[]
    for l in gzip.open(p,'rt'):
        if '"dir":"ai"' in l and '"type":"decision"' in l:
            b=json.loads(l)['body']; out.append(b)
    return out
for f in ['b-s06-peasant-2106','b-s10-peasant-2110']:
    load=lambda p:{(r['d'],r['c'],r['o'],r['i']):r for r in map(json.loads,open(p))}
    old=load(D+f+'.j168-stale/phaseB/branches.jsonl'); new=load(D+f+'/phaseB/branches.jsonl')
    diff=[k for k in old if k in new and not new[k].get('retargeted') and (old[k]['turns'],old[k]['steps'])!=(new[k]['turns'],new[k]['steps'])]
    print(f,len(diff))
    import collections; why=collections.Counter()
    for k in diff[:40]:
        res=None
        for s in (0,1):
            n='d%d-%s-o%d-b%d-seat%d.jsonl.gz'%(k[0],k[1],k[2],k[3],s)
            a=decs(D+f+'.j168-stale/phaseB/frames/'+n); b=decs(D+f+'/phaseB/frames/'+n)
            for x,y in zip(a,b):
                kx={kk:x.get(kk) for kk in ('kind','options','chosen','turn')}; ky={kk:y.get(kk) for kk in ('kind','options','chosen','turn')}
                if kx!=ky:
                    res=(s,x.get('turn'),x.get('kind'),'opts' if x.get('options')!=y.get('options') else 'chosen', x.get('chosen'),y.get('chosen'),x.get('why'),y.get('why'), [o for o in (x.get('options') or []) if o not in (y.get('options') or [])][:3], [o for o in (y.get('options') or []) if o not in (x.get('options') or [])][:3]); break
            if res: break
        why[(res[3],res[6],res[7]) if res else None]+=1
        if len(why)<12 and res: print('  ',k,res)
    print(' ',dict(why))

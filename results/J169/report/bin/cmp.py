import json,sys
D='/home/justin-a/code/lab/data/lab-j166/'
def load(p):
    a=json.load(open(p)); out={}
    for x in a['phaseB']['decisions']:
        r=x['random']; 
        opts={o['o']:(o['token'],o['label'][:40],o['random']['n'],o['random']['mean']) for o in x['options']}
        out[x['d']]=dict(kind=x['kind'],k=x['k'],complete=x['complete'],screened=x['screened'],best=r['best'],reg=r['regret'],lo=r['regretLo'],hi=r['regretHi'],branches=r['branches'],opts=opts,screenMean=x.get('screenMean'),why=x.get('why'))
    return out,a
for sp,f in [('s06','b-s06-peasant-2106'),('s10','b-s10-peasant-2110')]:
    old,ao=load(D+f+'.j168-stale/atlas.j168.json'); new,an=load(D+f+'/atlas.json')
    print('==',sp,'J168 games',ao['phaseB']['branchGames'],'J169 games',an['phaseB']['branchGames'], 'capped', ao['phaseB']['cappedRandom'], an['phaseB']['cappedRandom'])
    for d in sorted(set(old)|set(new)):
        o=old.get(d); n=new.get(d)
        def s(x):
            if not x: return '-'
            lab = x['complete'] and not x['screened']
            tag='SCR' if x['screened'] else ('conf' if lab and x['lo'] is not None and x['lo']>0 else ('lab' if lab else 'inc'))
            bt=x['opts'].get(x['best'],('?','?'))[1] if x['best'] is not None else ''
            return f"{tag} o{x['best']}({bt}) {x['reg']} [{x['lo']},{x['hi']}] n{x['branches']} k{x['k']} {x['kind']}"
        print(f" d{d}: J168 {s(o)}  ||  J169 {s(n)}")
        if o and n and o['opts']!=n['opts']:
            for oo in sorted(set(o['opts'])|set(n['opts'])):
                print('     o%s'%oo, o['opts'].get(oo), '->', n['opts'].get(oo))

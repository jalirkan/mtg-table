import json,collections
D='/home/justin-a/code/lab/data/lab-j166/'
res={}
for f in ['b-s06-peasant-2106','b-s10-peasant-2110']:
    def load(p):
        return {(r['d'],r['c'],r['o'],r['i']):r for r in map(json.loads,open(p))}
    old=load(D+f+'.j168-stale/phaseB/branches.jsonl'); new=load(D+f+'/phaseB/branches.jsonl')
    both=set(old)&set(new)
    agg=collections.defaultdict(lambda: collections.Counter())
    for k in both:
        o,n=old[k],new[k]; rt=bool(n.get('retargeted'))
        same = o['score']==n['score']; sameTurns = o['turns']==n['turns'] and o['steps']==n['steps']
        a=agg['d%d'%k[0]]; a['both']+=1; a['sameScore']+=same; a['sameGame']+=sameTurns
        a['rt']+=rt; a['rtSameScore']+=rt and same; a['rtSameGame']+=rt and sameTurns
        a['nonRtSameGame']+= (not rt) and sameTurns; a['nonRt']+= not rt
        a['rtScoreUp']+= rt and n['score']>o['score']; a['rtScoreDown']+= rt and n['score']<o['score']
    tot=collections.Counter()
    for v in agg.values(): tot.update(v)
    res[f]=dict(onlyOld=len(set(old)-set(new)),onlyNew=len(set(new)-set(old)),total=dict(tot),byDecision={k:dict(v) for k,v in sorted(agg.items(),key=lambda x:int(x[0][1:]))})
print(json.dumps(res,indent=1))

# J169 read: s06 and s10, J168 (atlas.j168.json in the .j168-stale folders) against J169 (the re-branched atlas.json), per decision,
# with the retargeted rows and the paired rows from paired-rows.json. Read only; standard library.
import json,sys,os
D='/home/justin-a/code/lab/data/lab-j166/'
P=json.load(open(os.path.join(os.path.dirname(__file__),'..','paired-rows.json')))
RT=json.load(open(os.path.join(os.path.dirname(__file__),'..','retargeted.json')))
J168READ={'s06':{6:'loses beyond chance'},'s10':{28:'loses beyond chance',2:'marginal',10:'marginal (best o1->o2)',15:'marginal'}}
def load(p):
    a=json.load(open(p)); out={}
    for x in a['phaseB']['decisions']:
        r=x['random']; out[x['d']]=dict(x=x,r=r,lab=x['complete'] and not x['screened'])
    return out
def fmt(e):
    x,r=e['x'],e['r']
    if x['screened']: return 'screened'
    lbl=next((o['label'] for o in x['options'] if o['o']==r['best']),'?')[:28]
    c=' **conf**' if r['regretLo'] and r['regretLo']>0 else ''
    return f"o{r['best']} {lbl}: {100*r['regret']:.1f} [{100*r['regretLo']:.1f}, {100*r['regretHi']:.1f}]{c}"
print('| spine d | kind k | J168 (26a8db00) | J169 (D485) | rows J169 (J168) | retargeted rows (J169, all) | paired rows: same game / same score | J168 read predicted |')
print('|---|---|---|---|---|---|---|---|')
for sp,f in [('s06','b-s06-peasant-2106'),('s10','b-s10-peasant-2110')]:
    o=load(D+f+'.j168-stale/atlas.j168.json'); n=load(D+f+'/atlas.json')
    rows={}
    for l in open(D+f+'/phaseB/branches.jsonl'):
        r=json.loads(l); rows[r['d']]=rows.get(r['d'],0)+1
    orows={}
    for l in open(D+f+'.j168-stale/phaseB/branches.jsonl'):
        r=json.loads(l); orows[r['d']]=orows.get(r['d'],0)+1
    for d in sorted(n):
        pb=P[f]['byDecision'].get('d%d'%d,{})
        print(f"| {sp} d{d} | {n[d]['x']['kind']} {n[d]['x']['k']} | {fmt(o[d])} | {fmt(n[d])} | {rows[d]} ({orows[d]}) | {RT[f]['byDecision'].get('d%d'%d,0)} | {pb.get('sameGame',0)} / {pb.get('sameScore',0)} of {pb.get('both',0)} | {J168READ.get(sp,{}).get(d,'')} |")

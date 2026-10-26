import json,gzip,sys,collections,re
D='/home/justin-a/code/lab/data/lab-j166/'
out={}
for f in ['b-s06-peasant-2106','b-s10-peasant-2110']:
    rows=[json.loads(l) for l in open(D+f+'/phaseB/branches.jsonl')]
    rt=[r for r in rows if r.get('retargeted')]
    bydec=collections.Counter('d%d'%r['d'] for r in rt)
    byopt=collections.Counter('d%d/o%d'%(r['d'],r['o']) for r in rt)
    tot=sum(r['retargeted'] for r in rt)
    chosen=collections.Counter(); names={}; tgtrec=0; logs=0
    for r in rt:
        for s in (0,1):
            p=D+f+'/phaseB/frames/d%d-%s-o%d-b%d-seat%d.jsonl.gz'%(r['d'],r['c'],r['o'],r['i'],s)
            try: fh=gzip.open(p,'rt')
            except Exception: continue
            logs+=1
            for l in fh:
                if '"STALE_TARGETS"' in l:
                    b=json.loads(l)['body']
                    if b['kind']=='target': tgtrec+=1
                    else: chosen[(b['seat'],b['kind'],b['chosen'])]+=1
                elif '"cast"' in l and '"cardId"' in l and len(names)<400:
                    for m in re.finditer(r'"kind":"cast","stackId":-?\d+,"cardId":(\d+)[^}]*?"name":"([^"]*)"',l):
                        names[int(m.group(1))]=m.group(2)
    out[f]=dict(rows=len(rows),retargetedRows=len(rt),retargetedSum=tot,byDecision=dict(sorted(bydec.items(),key=lambda x:int(x[0][1:]))),byOption=dict(byopt),logsScanned=logs,targetRecords=tgtrec,
        staleChosen=[dict(seat=k[0],kind=k[1],chosen=k[2],n=v,name=names.get(int(k[2].split(':')[1].split('#')[0])) if ':' in k[2] else None) for k,v in chosen.most_common()])
print(json.dumps(out,indent=1))

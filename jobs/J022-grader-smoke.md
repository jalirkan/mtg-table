id: J022
title: (retry of J015, after night 1 has recordings) Grader smoke at live budgets: the refitted leaf scale, interval widths and racing drops (D348-D351)
cpu: heavy
after: J020
repos: mtg-table@main (main once it merges)
est: ~15 min (one JVM: a scale fit over the lab's recordings, then 12 decisions at 1.5 s and 3 s)
resumable: no
max_workers: 1
timeout: 1h
metrics: fit = sh: cat var/coach-grade/leaf-scale.json
metrics: b1500 = sh: node var/coach-grade/j022/summ.js var/coach-grade/j022/answers-1500.jsonl
metrics: b3000 = sh: node var/coach-grade/j022/summ.js var/coach-grade/j022/answers-3000.jsonl
headline: fit.scale, fit.scaleLo, fit.scaleHi, fit.games, b1500.median_halfwidth, b3000.median_halfwidth, b1500.retired, b3000.retired, b3000.p90_wall_s
clean: var/coach-grade/j022

The engine review (2026-10-03) found the live analysis's numbers were not what they said:
a leaf score through an unfitted logistic (scale 400), and intervals floored at 1/n so wide
(±0.25 to ±1.0 at live round counts) that racing never dropped an option and every answer
was "low information". `main` fits the scale on recorded games (`fit-scale`),
gives leaf scores a t interval on their own sd, and races from round 4. This job refits the
scale on the PC's lab recordings (far more than the container had: it fitted 500 on 24
games) and measures interval widths and racing drops at live budgets on 12 decisions of
the committed fixture games. One JVM; nothing else of the machine is needed, but don't run
it beside another heavy job (it measures latency).

The fit writes `var/coach-grade/leaf-scale.json`, which `analyse` and `serve` then use
by default: that is intended (the live coach gets the refitted scale).

## Pilot
About 3 minutes: build, the engine smoke, and two decisions.
```bash
./bridge/build.sh
./tools/coach-grade.sh selftest
mkdir -p var/coach-grade/j022
cat > var/coach-grade/j022/summ.js <<'JS'
const L=require("fs").readFileSync(process.argv.at(-1),"utf8").trim().split("\n").map(JSON.parse).filter(x=>!x.ready);const ok=L.filter(x=>x.status==="ok");const q=(a,p)=>{a=a.filter(v=>v!=null).sort((x,y)=>x-y);return a.length?a[Math.floor(p*(a.length-1))]:null};console.log(JSON.stringify({answers:L.length,ok:ok.length,refused:L.filter(x=>x.status==="refused").length,failed:L.filter(x=>x.status==="error"||x.status==="unsupported").length,median_rounds:q(ok.map(x=>x.rounds),0.5),median_halfwidth:q(ok.map(x=>x.noise),0.5),max_halfwidth:q(ok.map(x=>x.noise),1),retired:ok.reduce((s,x)=>s+(x.retired||0),0),decisions_with_drop:ok.filter(x=>x.retired>0).length,p90_wall_s:q(L.map(x=>x.wallMs),0.9)/1000}))
JS
awk '/^\[/{m=(tolower($0)=="[main]");next} m && /^[0-9]+ /{sub(/^[0-9]+ +/,"");sub(/\|.*/,"");print "1 "$0}' decks/*.dck | sort -u > var/coach-grade/j022/pool.txt
printf '%s\n' \
 '{"id":"p1","log":"fixtures/games/human-trample-7.jsonl","frame":497,"type":"attack","oppPool":"var/coach-grade/j022/pool.txt","budgetMs":3000}' \
 '{"id":"p2","log":"fixtures/games/human-trample-7.jsonl","frame":216,"type":"spell","oppPool":"var/coach-grade/j022/pool.txt","budgetMs":3000}' \
 | ./tools/coach-grade.sh serve > var/coach-grade/j022/pilot.jsonl
```
metrics: pilot = sh: node var/coach-grade/j022/summ.js var/coach-grade/j022/pilot.jsonl
check: pilot.answers == 2
check: pilot.ok == 2
check: pilot.median_rounds >= 2
check: pilot.p90_wall_s < 60

Broad sanity only: both answers came back `ok` with at least the minimum two rounds, and
neither took a minute. No width or racing bound here: those are what the job measures.

## Commands
```bash
./tools/coach-grade.sh fit-scale --logs var/cubelab/queue,fixtures/cubelab/recorded --out var/coach-grade/leaf-scale.json --max-logs 600
P=var/coach-grade/j022/pool.txt
for B in 1500 3000; do
  for m in human-amount-7.jsonl:216:spell human-auto-2026.jsonl:131:spell human-scry-7.jsonl:171:spell \
           human-search-7.jsonl:169:spell human-trample-7.jsonl:216:spell human-yield-13.jsonl:126:spell \
           human-ability-42.jsonl:1091:attack human-auto-42.jsonl:1084:attack human-yield-13.jsonl:465:attack \
           human-trample-7.jsonl:497:attack human-sideboard-7.jsonl:423:block human-trample-7.jsonl:756:block; do
    IFS=: read -r f fr t <<< "$m"
    printf '{"id":"%s","log":"fixtures/games/%s","frame":%s,"type":"%s","oppPool":"%s","budgetMs":%s}\n' "$m" "$f" "$fr" "$t" "$P" "$B"
  done | ./tools/coach-grade.sh serve > var/coach-grade/j022/answers-$B.jsonl
done
```
check: fit.rows >= 100
check: fit.scale between 50 and 5000
check: b1500.answers == 12 and b3000.answers == 12
check: b1500.failed + b3000.failed <= 2
check: b3000.median_halfwidth < 0.5

Broad sanity: the fit saw at least 100 positions and gave a scale within an order of
magnitude of the container's 500; every request was answered and at most two failed to
rebuild; and the median regret half-width at 3 s is under ±0.5 (the old floor alone made
it ±0.33 at six rounds, so a value near that means the fix is not in the build).

## Abort if
abort: elapsed_s > 3000

## Report
collect: var/coach-grade/leaf-scale.json
collect: var/coach-grade/j022/answers-1500.jsonl
collect: var/coach-grade/j022/answers-3000.jsonl
collect: var/coach-grade/j022/pilot.jsonl

summary.md: the fitted scale with its interval, games and positions, and the log-loss at the
fit against 400 (from leaf-scale.json, with its reliability table); then per budget the
median and largest regret half-width, the median rounds, how many options racing retired
and in how many decisions, and the p90 latency. Say whether the median half-width at 3 s is
under ForgeCoach's ±0.08 "low information" line, and list any decision that failed.

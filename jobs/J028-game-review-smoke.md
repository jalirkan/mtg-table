id: J028
title: Post-game review smoke on 3 recorded games
cpu: heavy
repos: mtg-table@main, ForgeCoach@main
est: ~15 min on the 9700X
resumable: no
max_workers: 7
mem_per_worker_gb: 2.5
timeout: 1h
progress: files var/coach-grade/review/pc-*/report.json of 3
clean: var/coach-grade/review/pc-human-auto-42 var/coach-grade/review/pc-human-trample-7 var/coach-grade/review/pc-human-comfort-13
headline: reports, timing.max_total_s
public_title: Game review smoke
public_est: ~15 min

## Pilot
```bash
./bridge/build.sh
./tools/coach-grade.sh review-smoke --jobs 3
```
metrics: pilot_ok = count {logs} "review-smoke: 11 check(s), 0 failure(s)"
metrics: pilot_fail = count {logs} "REVIEW FAILED"
check: pilot_ok == 1
check: pilot_fail == 0

## Commands
```bash
for g in human-auto-42 human-trample-7 human-comfort-13; do
  ./tools/coach-grade.sh review --log fixtures/games/$g.jsonl --seat 0 --jobs {workers} \
    --triage-s 15 --deep-s 150 --deep-k 6 --run pc-$g
done
```
metrics: reports = files var/coach-grade/review/pc-*/report.json
metrics: done = count {logs} "REVIEW DONE"
metrics: failed = count {logs} "REVIEW FAILED"
metrics: timing = sh: node -e 'const fs=require("fs");const rs=["human-auto-42","human-trample-7","human-comfort-13"].map(g=>"var/coach-grade/review/pc-"+g+"/report.json").filter(f=>fs.existsSync(f)).map(f=>JSON.parse(fs.readFileSync(f,"utf8")));const mx=k=>Math.max(0,...rs.map(r=>r.timing[k]||0))/1000;const bad=rs.reduce((n,r)=>n+r.decisions.filter(d=>d.status==="error"||d.status==="refused").length,0);const ok=rs.every(r=>r.kind==="game-review"&&r.decisions.length===r.summary.decisions&&r.decisions.every(d=>d.clear===(d.verdict==="mistake")));console.log(JSON.stringify({max_total_s:mx("totalMs"),max_triage_wall_s:mx("triageWallMs"),max_triage_grade_s:mx("triageGradeMs"),max_deep_wall_s:mx("deepWallMs"),errors:bad,shape_ok:ok?1:0,decisions:rs.reduce((n,r)=>n+r.summary.decisions,0)}))'
check: reports == 3
check: done == 3
check: failed == 0
check: timing.shape_ok == 1
check: timing.decisions > 0
check: timing.max_total_s < 1800

## Abort if
abort: failed >= 1

## Report
collect: var/coach-grade/review/pc-*/report.json
Broad "is it broken" checks only. Per game: timing (triage, deepen, total) against ~15 s triage and
~2.5 min deepen at 7 JVMs; summary counts; decisions with status unsupported/error/refused and their
texts; any "REVIEW WARN" lines or shard failures. Spot-check one key moment per game: played and best
look like legal plays. No pool is given, so the opponent model is "basic-lands": don't judge win rates.

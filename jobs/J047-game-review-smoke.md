id: J047
title: Post-game review smoke on 3 recorded games, re-run of J028 with the shard fix (D353 amended)
cpu: heavy
repos: mtg-table@main
est: ~15 min on the 9700X
resumable: no
max_workers: 7
mem_per_worker_gb: 2.5
timeout: 1h
progress: files var/coach-grade/review/j047-*/report.json of 3
clean: var/coach-grade/j047 var/coach-grade/review/j047-human-auto-42 var/coach-grade/review/j047-human-trample-7 var/coach-grade/review/j047-human-comfort-13
headline: reports, done, timing.min_triage_graded, timing.errors, timing.decisions, timing.max_total_s
public_title: Game review smoke (re-run)
public_est: ~15 min

Why J028 failed: the clone's `var/coach-grade/leaf-scale.json` held a scale of -10325, written
by J015's `fit-scale` when its recordings folder was empty (it fitted the one fixture game).
The review hands that file to every triage JVM, and each one claimed a decision, refused the
scale and died, so all 77 decisions came out as errors. The pilot's smoke read the same file
and failed the same way, but none of its checks needed a graded decision, and the review
still printed `REVIEW DONE`. The branch now refuses an unusable scale up front
(`REVIEW FAILED plan`), fails a triage that grades nothing (`REVIEW FAILED triage`), counts
errors on the DONE line, and prints the smoke's lines as `REVIEW-SMOKE ...`.

This job moves an unusable `leaf-scale.json` aside (renamed, never deleted, inside the clone's
`var/`). Without that file, `analyse`, `serve` and `review` use the default scale of 400, as
they did before J015. A usable file is left alone. To get a fitted scale back, re-run the
J026 refit once the lab has recordings.

## Pilot
```bash
./bridge/build.sh
mkdir -p var/coach-grade/j047
node -e '
  const fs = require("fs"), f = "var/coach-grade/leaf-scale.json";
  const o = { present: 0, usable_before: 1, scale: null, games: null, moved_to: null, usable_now: 1 };
  if (fs.existsSync(f)) {
    o.present = 1;
    let j = null;
    try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { j = null; }
    o.scale = j && typeof j.scale === "number" ? j.scale : null;
    o.games = j && typeof j.games === "number" ? j.games : null;
    const ok = j !== null && Number.isFinite(o.scale) && o.scale > 0 && (j.fitted !== true || (o.games ?? 0) >= 10);
    o.usable_before = ok ? 1 : 0;
    if (!ok) { o.moved_to = f + ".unusable-" + new Date().toISOString().replace(/[:.]/g, "-"); fs.renameSync(f, o.moved_to); }
  }
  fs.writeFileSync("var/coach-grade/j047/scale.json", JSON.stringify(o) + "\n");
  console.log("J047 leaf scale: " + JSON.stringify(o));
'
./tools/coach-grade.sh review-smoke --jobs 3
```
metrics: pilot_ok = count {logs} "review-smoke: 13 check(s), 0 failure(s)"
metrics: pilot_fail = count {logs} "REVIEW-SMOKE FAILED"
metrics: scale = sh: cat var/coach-grade/j047/scale.json
check: pilot_ok == 1
check: pilot_fail == 0
check: scale.usable_now == 1

The smoke now has 13 checks. One of them needs at least one decision graded `ok`, and
another needs errors to be at most a quarter of the decisions. So a triage that died, as
J028's did, fails the pilot. `scale.usable_before == 0` with a `moved_to` path means the
J015 file was found and moved aside. Report that.

## Commands
```bash
mkdir -p var/coach-grade/j047
for g in human-auto-42 human-trample-7 human-comfort-13; do
  rc=0
  ./tools/coach-grade.sh review --log fixtures/games/$g.jsonl --seat 0 --jobs {workers} \
    --triage-s 15 --deep-s 150 --deep-k 6 --run j047-$g > var/coach-grade/j047/$g.log 2>&1 || rc=$?
  cat var/coach-grade/j047/$g.log
  echo "J047 review $g exit $rc"
done
```
metrics: reports = files var/coach-grade/review/j047-*/report.json
metrics: done = count var/coach-grade/j047/human-*.log "REVIEW DONE var/coach-grade/review/j047-"
metrics: failed = count var/coach-grade/j047/human-*.log "REVIEW FAILED"
metrics: warned = count var/coach-grade/j047/human-*.log "REVIEW WARN"
metrics: timing = sh: node -e 'const fs=require("fs");const gs=["human-auto-42","human-trample-7","human-comfort-13"];const dir=g=>"var/coach-grade/review/j047-"+g;const rs=gs.map(g=>dir(g)+"/report.json").filter(f=>fs.existsSync(f)).map(f=>JSON.parse(fs.readFileSync(f,"utf8")));const lines=f=>fs.existsSync(f)?fs.readFileSync(f,"utf8").split("\n").filter(l=>l.trim()).length:0;const tri=gs.map(g=>lines(dir(g)+"/triage.jsonl"));const mx=k=>Math.max(0,...rs.map(r=>r.timing[k]||0))/1000;const errOf=r=>r.decisions.filter(d=>d.status==="error"||d.status==="refused").length;const okOf=r=>r.decisions.filter(d=>d.status==="ok").length;const shape=rs.length>0&&rs.every(r=>r.kind==="game-review"&&r.decisions.length===r.summary.decisions&&r.decisions.every(d=>d.clear===(d.verdict==="mistake")));console.log(JSON.stringify({games:rs.length,min_triage_graded:Math.min(...tri),min_ok:rs.length?Math.min(...rs.map(okOf)):0,errors:rs.reduce((n,r)=>n+errOf(r),0),max_error_share:Math.max(0,...rs.map(r=>errOf(r)/Math.max(1,r.decisions.length))),decisions:rs.reduce((n,r)=>n+r.summary.decisions,0),graded:rs.reduce((n,r)=>n+r.summary.graded,0),deepened:rs.reduce((n,r)=>n+r.summary.deepened,0),shape_ok:shape?1:0,max_total_s:mx("totalMs"),max_triage_wall_s:mx("triageWallMs"),max_triage_grade_s:mx("triageGradeMs"),max_deep_wall_s:mx("deepWallMs")}))'
check: reports == 3
check: done == 3
check: failed == 0
check: timing.games == 3
check: timing.min_triage_graded > 0
check: timing.min_ok > 0
check: timing.decisions > 0
check: timing.errors <= timing.decisions * 0.1
check: timing.max_error_share <= 0.25
check: timing.shape_ok == 1
check: timing.max_total_s < 1800

`done` counts only the reviews' own DONE lines: it reads this job's per-game logs, not the
step logs, and matches the run's report path. The smoke prints `REVIEW-SMOKE DONE`, so it
could not be counted even in the step logs. `min_triage_graded` is the smallest number of
triage lines any one game produced, so a single game whose triage died fails the job.
`errors` (decisions with status `error` or `refused`, across all three games) must stay at
or under a tenth of `decisions`. The fixtures had none here, and J028 had 77 of 77.

## Abort if
abort: failed >= 1

## Report
collect: var/coach-grade/j047/scale.json var/coach-grade/j047/human-auto-42.log var/coach-grade/j047/human-trample-7.log var/coach-grade/j047/human-comfort-13.log var/coach-grade/review/j047-*/report.json var/coach-grade/review/j047-*/triage.jsonl.shard-0.log
Per game: the DONE line's counts (decisions, graded, errors, deepened), and timing (triage
wall and grade, deepen wall, total) against about 15 s of triage and about 2.5 min of
deepening at 7 JVMs. Copy any `REVIEW WARN` line verbatim, with its reason. Say whether
the leaf-scale file was moved aside (`scale.json`). Spot-check one key moment per game:
the played and best options should look like legal plays. No pool is given, so the
opponent model is "basic-lands": don't judge the win rates. If a review FAILED, quote its
FAILED line and the first `COACH-GRADE FAILED` line of its shard logs.

id: J011
title: (second retry of J006, after J011) New coach baseline with the queueing helper (the prompt now asks for Rule and Confidence)
cpu: light
repos: mtg-table@main (e54aa16 or later), ForgeCoach@main (8cc33bd or later: launcher tests no longer probe the live engine, #32)
est: ~30 min (84 calls at ~11 s, plus setup)

This is a light job: it may run beside a heavy job. It needs `play.sh` restarted on new
mtg-table main so the coach helper is the queueing one. Restarting the helper doesn't touch
ai-bench or cube-lab runs. Don't restart it while Justin has a seat; mark the job `waiting`.

Check out mtg-table main in a way that doesn't disturb a running heavy job. If J003 is
running on a detached ee4d127 checkout, don't switch that checkout. Instead use a second
worktree, then run play.sh from that worktree:
`git -C /home/justin-a/code/mtg-table worktree add ~/code/mtg-table-main origin/main`

J008 failed its pilot only on a 5 s latency floor that was too tight; that floor is now 1 s.
Before that, J006 failed its pilot only because `npm test` saw the live engine on 8642. ForgeCoach #32
fixed that. Every other J006 check passed, so this is a straight retry.

## Pilot
```bash
cd <mtg-table checkout on main> && node tools/coach-helper-selftest.mjs
# restart ./scripts/play.sh --engine-only from that checkout, the way it normally runs
curl -s http://127.0.0.1:8643/health
mkdir -p /tmp/J011
for i in 1 2; do curl -sN -X POST http://127.0.0.1:8643/coach -H 'Content-Type: application/json' -d '{"system":"Answer in one word.","user":"Say OK.","model":"haiku"}' > /tmp/J011/q$i.ndjson & done; wait
grep -c '"type":"queued"' /tmp/J011/q1.ndjson /tmp/J011/q2.ndjson
tail -n1 /tmp/J011/q1.ndjson /tmp/J011/q2.ndjson
cd /home/justin-a/code/ForgeCoach && git checkout main && git pull && npm ci
npm run typecheck && npm test && npm run bench:coach -- --dry-run
npm run bench:coach -- --repeat 1 --type spell --label J011-pilot; echo "exit $?"
```
Checks:
- The selftest prints "coach-helper-selftest OK (67 checks)".
- `/health` contains "concurrency":1 and "queue":{"max":4.
- Exactly one of q1/q2 has a `queued` line, and both end with {"type":"done",...}.
- Typecheck, the tests and the dry run all pass.
- The pilot bench exits 0, its report shows 0 transport errors, there is at most 1 format
  failure, and every answer takes 1–30 s (the old 5 s floor was too tight: correct answers came in at 4.8 s).
- At least 4 of the 5 answers state a confidence.

## Commands
```bash
cd /home/justin-a/code/ForgeCoach
npm run bench:coach -- --repeat 3 --label J011-classic-r3; echo "exit $?"
npm run bench:coach -- --compare bench/coach/results/<…>-after-fixes-r3c.json bench/coach/results/<…>-J011-classic-r3.json
```
The first file is J002's.

## Abort if
- Any "TRANSPORT ERROR", or exit code 3: the data is invalid.
- More than 3 retry lines (↻): something else is using the helper (auto-coach in a game?).
  Stop and mark the job `waiting`.
- More than 10% format failures by the half-way mark.
- The median answer is over 30 s in the first 20 answers.

## Report
- The full J011-classic-r3 .md report: the per-type table with latency and model, the
  calibration table, and prompt size by section.
- The `--compare` output. Note that A→B includes the prompt change.
- Copy the pilot and full .json files to results/J011/.
- Counts: transport errors, retries, format failures, and answers that stated a confidence.

id: J014
title: Light coach check: Sonnet vs Haiku with thinking off (and low) on the 28 bench cases, one answer each
cpu: light
after: J013
repos: mtg-table@main (e3d74dd or later), ForgeCoach@main (360ea3f or later)
est: ~15 min (3 × 28 calls, plus a 4 + 4 call pilot)

J013 found why Haiku was slow through the helper: it thinks before every answer (1.2k–3.5k
thinking tokens, 79–94% of its output, first text at 15–38 s), while Sonnet barely thinks.
mtg-table D346 lets the helper cap thinking per question (`"thinking": "off" | "low" |
"default"` on `/coach`, set through Claude Code's documented `MAX_THINKING_TOKENS` and
`CLAUDE_CODE_EFFORT_LEVEL`), and the bench now has `--thinking`. This re-runs J012's
comparison with Haiku's thinking capped. Same question as J012: is Haiku good enough, and
how much faster is it now? A rough read: 28 cases, one answer each.

This job starts its OWN helper from the branch, on port 8653, so it never touches a
`play.sh` that may be running (its helper stays on 8643). Don't change code or settings.

**Don't touch a checkout a heavy job is using.** If J003 (or any heavy job) runs in
`/home/justin-a/code/mtg-table`, do this job's mtg-table steps in the separate main
worktree (`~/code/mtg-table-main`, which J008 used: `git -C ~/code/mtg-table-main pull`),
not in the checkout J003 is running from. The same applies to the final `git checkout main`
lines.

## Pilot
```bash
cd /home/justin-a/code/mtg-table && git fetch && git checkout main && git pull
claude --version
node tools/coach-helper.mjs --port 8653 > var/J014-helper.log 2>&1 &
echo $! > var/J014-helper.pid; sleep 3
curl -s http://127.0.0.1:8653/health; echo
cd /home/justin-a/code/ForgeCoach && git fetch && git checkout main && git pull && npm ci
H="--source helper --helper-url http://127.0.0.1:8653 --repeat 1"
npm run bench:coach -- $H --type mulligan --model sonnet --label J014-pilot-sonnet; echo "exit $?"
npm run bench:coach -- $H --type mulligan --model haiku --thinking off --label J014-pilot-haiku-off; echo "exit $?"
node -e 'for (const f of process.argv.slice(1)) { const r = JSON.parse(require("fs").readFileSync(f, "utf8")); console.log(f.split("/").pop(), "median ms", r.summary.latencyMs.median, "errors", r.summary.errors, "of", r.summary.calls, "thinking", r.thinking ?? "-"); }' bench/coach/results/*-J014-pilot-*.json
```
Checks:
- The `/health` line contains `"thinking":["off","low","default"]`.
- Both runs exit 0 with 0 transport errors (`errors 0` on both lines).
- The Haiku-off run prints no "does not offer \"thinking\"" note, and its JSON has `thinking off`.
- Haiku-off's median latency is below Sonnet's.

## Commands
```bash
cd /home/justin-a/code/ForgeCoach
H="--source helper --helper-url http://127.0.0.1:8653 --repeat 1"
npm run bench:coach -- $H --model sonnet --label J014-sonnet; echo "exit $?"
npm run bench:coach -- $H --model haiku --thinking off --label J014-haiku-off; echo "exit $?"
npm run bench:coach -- $H --model haiku --thinking low --label J014-haiku-low; echo "exit $?"
npm run bench:coach -- --compare bench/coach/results/<…>-J014-sonnet.json bench/coach/results/<…>-J014-haiku-off.json
npm run bench:coach -- --compare bench/coach/results/<…>-J014-sonnet.json bench/coach/results/<…>-J014-haiku-low.json
kill "$(cat /home/justin-a/code/mtg-table/var/J014-helper.pid)"
cd /home/justin-a/code/mtg-table && git checkout main
cd /home/justin-a/code/ForgeCoach && git checkout main
```

## Abort if
- Any "TRANSPORT ERROR", or exit code 3.
- More than 3 retry lines in one run.
- Any Haiku-off answer takes over 30 s (the cap is not reaching the CLI; report it with
  `var/J014-helper.log`).
- More than 20% format failures in either Haiku run (Haiku isn't following the answer
  format with less thinking; report it, since that is itself the finding).

## Report
- The `claude --version` output and the pilot's `/health` line.
- A per-type table (the 8 types plus the total): score, median latency and format failures
  for Sonnet, Haiku-off and Haiku-low, side by side.
- Both `--compare` outputs.
- A one-line verdict: is Haiku with thinking off (or low) good enough for routine types, or
  for all types, and how much faster than Sonnet is it?
- Copy the three .json files and `var/J014-helper.log` to results/J014/.

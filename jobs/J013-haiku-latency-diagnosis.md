id: J013
title: Why is Haiku 6× slower than Sonnet through the coach helper? (timing diagnosis)
cpu: light
repos: mtg-table@main (the helper worktree), ForgeCoach@main
est: ~10 min

J012's pilot found that Haiku took a median 45 s an answer through the helper, while Sonnet
took about 7 s on the same path. Haiku should be faster, so something in the path is off: a
thinking setting, a slow start, a retry or fallback inside the CLI, or much longer output.
This job only measures. Don't change any code or settings.

## Pilot
```bash
mkdir -p /tmp/J013 && cd /tmp/J013
claude --version
for m in sonnet haiku; do /usr/bin/time -f "$m wall %e s" claude -p --model $m --output-format json "Say OK." > $m-ok.json 2> $m-ok.time; cat $m-ok.time; done
```
Checks:
- Both calls exit 0.
- Each JSON has a `result` field.

## Commands
1. Time the CLI directly. Use the J012 pilot's mulligan case prompt, with the system and user
   text taken from the bench's dry run (`npm run bench:coach -- --dry-run --show
   mulligan-number7-four-lands`, or whatever flag prints a case's prompt; check `--help`).
   Run it 3 times each with `--model sonnet` and `--model haiku`, using the same flags the
   helper uses (see `tools/coach-helper.mjs` around line 317). Record for each run:
   - wall time;
   - time to the first streamed text, if you use stream-json;
   - output length in characters;
   - any thinking characters;
   - `usage` and `duration_api_ms` from the JSON result;
   - `modelUsage` (which model actually answered).
2. Repeat 2 calls each through the helper, `POST /coach` with model `haiku` and `sonnet`,
   recording the same fields from the NDJSON stream (`thinking` lines, text length, `done`).

## Abort if
- Any call takes over 120 s: stop and report what you have.

## Report
- A table: path (CLI or helper) × model × run, with wall time, API ms, output characters,
  thinking characters, input and output tokens, and the model that answered.
- Your read of where the extra time goes, as a single sentence.
- The `claude --version` output.
- Copy the JSON outputs to results/J013/. They contain no secrets, but check for tokens
  before you copy.

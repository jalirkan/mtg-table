# J013: why Haiku is slower than Sonnet through the coach helper

Status: **done**. Run 2026-10-03 on Justin's PC, light, beside the heavy `forgecoach-j003`
(not touched). Helper: unit `forgecoach-engine` from `/home/justin-a/code/mtg-table-main` at
`e54aa16`, http://127.0.0.1:8643, idle and queue empty before the run (not restarted).
ForgeCoach `2bf68d4`.

`claude --version`: **2.1.288 (Claude Code)**

## Pilot

| model | exit | wall | `result` field | answered by |
|---|---|---|---|---|
| sonnet | 0 | 3.68 s | yes ("OK.") | claude-sonnet-5-5 |
| haiku | 0 | 5.52 s | yes | claude-haiku-4-5-20251001 |

Both checks passed.

## Method

- Prompt: the bench case `mulligan-number7-four-lands`, from
  `npm run bench:coach -- --dry-run --show mulligan-number7-four-lands` in ForgeCoach. It was split
  at `promptAsText`'s `\n\n---\n\n` into `system.txt` (4,057 chars) and `user.txt` (1,468 chars).
- CLI path (`outputs/cli-run.mjs`): spawns `claude` the way `tools/coach-helper.mjs`'s
  `claudeArgs` (e54aa16, line 353) does. The flags are `-p --output-format stream-json
  --include-partial-messages --verbose --model <m> --system-prompt <system> --tools ""
  --strict-mcp-config --no-session-persistence --permission-mode dontAsk --max-turns 1
  --safe-mode --disable-slash-commands`. Both optional flags are present in 2.1.288's
  `--help`. It runs from an empty temp cwd, detached, with the user text on stdin. Runs were
  interleaved sonnet/haiku.
- Helper path (`outputs/helper-run.mjs`): `POST /coach` `{system, user, model}`, timing the
  NDJSON lines.
- Time to first text is measured from spawn (CLI) or request (helper) to the first non-empty
  text. "Thinking chars" counts the characters in `thinking_delta` events (CLI) or in
  `thinking` NDJSON lines (helper). Thinking tokens come from
  `usage.output_tokens_details.thinking_tokens`.
- No call went over 120 s, so the abort rule did not trigger.

## Measurements

| path | model | run | wall s | first text s | API ms | output chars | thinking chars | thinking tokens | input tok (+cache) | output tok | answered by |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CLI | sonnet | 1 | 8.4 | 1.3 | 6,041 | 1,804 | 0 | 0 | 2 (+1,411 read, 1,173 written) | 646 | claude-sonnet-5-5 |
| CLI | sonnet | 2 | 10.3 | 1.4 | 7,571 | 2,008 | 0 | 0 | 2 (+1,411 read, 1,175 written) | 734 | claude-sonnet-5-5 |
| CLI | sonnet | 3 | 10.0 | 5.0 | 7,955 | 1,129 | 0 | 476 | 2 (+1,411 read, 1,174 written) | 894 | claude-sonnet-5-5 |
| CLI | haiku | 1 | 36.9 | 31.2 | 34,929 | 1,419 | 0 | **2,731** | 1,969 (no cache) | 3,096 | claude-haiku-4-5-20251001 |
| CLI | haiku | 2 | 41.7 | 38.1 | 39,279 | 875 | 0 | **3,541** | 1,968 (no cache) | 3,784 | claude-haiku-4-5-20251001 |
| CLI | haiku | 3 | 21.0 | 15.5 | 19,110 | 1,169 | 0 | **1,226** | 1,968 (no cache) | 1,542 | claude-haiku-4-5-20251001 |
| helper | sonnet | 1 | 6.9 | 1.2 | n/a | 1,800 | 0 | n/a | n/a | n/a | claude-sonnet-5-5 |
| helper | sonnet | 2 | 6.8 | 1.1 | n/a | 1,878 | 0 | n/a | n/a | n/a | claude-sonnet-5-5 |
| helper | haiku | 1 | 20.1 | 15.1 | n/a | 1,452 | 0 | n/a | n/a | n/a | claude-haiku-4-5-20251001 |
| helper | haiku | 2 | 49.2 | 46.2 | n/a | 1,307 | 0 | n/a | n/a | n/a | claude-haiku-4-5-20251001 |

The helper's NDJSON carries no usage or API time, only `text`, `done` (stop reason and model)
and `thinking` lines, and no `thinking` line was emitted. The helper's own log gave 7,383 /
20,360 / 7,348 / 49,389 ms for the four calls, in the order above. Every call stopped with
`end_turn`.

Medians: CLI sonnet 10.0 s against CLI haiku 36.9 s. Helper sonnet 6.9 s against helper haiku
20.1 s and 49.2 s (two runs).

Other fields, from the CLI's result line and init event:

- **Overhead outside the API is about 1.5–2.5 s on every run** (wall minus `duration_api_ms`).
  `time_to_request_ms` is about 35 ms. Start-up is not the problem.
- **No retry and no fallback.** Each stream has exactly one `message_start`, one
  `rate_limit_event` with `status: allowed`, and `num_turns` 1. `modelUsage` names only the
  requested model, so the haiku alias did answer with Haiku 4.5.
- **Thinking is on for both models, but configured differently.** The init event has
  `per_turn_effort_active: true` for Sonnet and **`false` for Haiku**. Sonnet thought 0, 0 and
  476 tokens. Haiku thought 1,226–3,541 tokens on every run, which is 79–94 % of its output
  tokens.
- **The thinking text is hidden.** Every `thinking_delta` carries an empty string, and the
  CLI's thinking block holds only a signature (about 14 KB on haiku-1). So the thinking
  characters are 0 on both paths and the helper emits no `thinking` lines. The client sees
  nothing at all for the 15–46 s before Haiku's first text.
- **Throughput is about the same.** Output tokens per API second were 81–96 for Haiku and
  97–112 for Sonnet. Haiku is not streaming faster here, so it cannot make up for the extra
  tokens.
- **Haiku got no prompt cache** (`cache_read_input_tokens` 0, about 1,968 input tokens each
  time). Sonnet read 1,411 from cache. At this size the effect on time is small.
- The visible answers are similar in length: Haiku 875–1,452 chars, Sonnet 1,129–2,008 chars.

## Reading (interpretation, not measurement)

In one sentence: the extra time goes to Haiku's hidden extended thinking, 1.2k–3.5k tokens
on every answer at roughly Sonnet's token rate, and none of it to start-up, retries, fallbacks
or longer visible answers.

The CLI turns Haiku 4.5's thinking on with no effort control (`per_turn_effort_active: false`),
so it thinks at length on every question. Sonnet 5.5 runs under per-turn effort and usually
skips thinking on this prompt. That thinking arrives as empty, signature-only blocks, so the
helper has nothing to forward, and the coach screen stays silent until the first visible text,
15–46 s in. Time to first text accounts for nearly all of Haiku's wall time, and the thinking
token count rises and falls with it (1,226 tok → 15 s, 2,731 → 31 s, 3,541 → 38 s).

## Files

`outputs/` (about 480 KB in total, scanned for tokens: none; `apiKeySource` is `none`; the
only long blobs are the opaque thinking signatures):

- `{sonnet,haiku}-ok.json` and `.time`: the pilot.
- `system.txt`, `user.txt`: the prompt used.
- `cli-run.mjs`, `helper-run.mjs`: the measuring scripts. Scratch copies are in `/tmp/J013`.
- `cli-<model>-<n>.stream.jsonl`: the raw CLI stream. `cli-<model>-<n>.row.json`: the
  extracted fields.
- `helper-<model>-<n>.ndjson`: the raw helper stream. `helper-<model>-<n>.row.json`: the
  extracted fields.

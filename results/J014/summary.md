# J014 — pilot failed (check 4: Haiku-off not faster than Sonnet)

Status: **failed**, reason `pilot`. The full job (3 × 28 calls) was **not** run.

- mtg-table: `e3d74dd` (helper run from the detached worktree `~/code/mtg-table-main`, because
  heavy job J003 runs from `~/code/mtg-table`; that checkout was not touched)
- ForgeCoach: `360ea3f` (main), `npm ci` ok
- `claude --version`: `2.1.288 (Claude Code)`
- Pilot `/health` line (helper on 8653):

```
{"ok":true,"helper":1,"claude":"2.1.288 (Claude Code)","models":["opus","sonnet","haiku"],"thinking":["off","low","default"],"concurrency":1,"queue":{"max":4,"length":0},"running":0,"supersedes":1,"match":0}
```

## Pilot checks

| # | check | result |
|---|---|---|
| 1 | `/health` contains `"thinking":["off","low","default"]` | pass |
| 2 | both runs exit 0, `errors 0` on both lines | pass (exit 0, 0 of 4 errors each) |
| 3 | Haiku-off prints no "does not offer \"thinking\"" note; JSON `thinking off` | pass |
| 4 | Haiku-off median latency below Sonnet's | **FAIL**: 7212 ms vs 6597 ms |

The pilot's summary lines:

```
2026-10-03T16-35-35Z-J014-pilot-sonnet.json median ms 6597 errors 0 of 4 thinking -
2026-10-03T16-36-03Z-J014-pilot-haiku-off.json median ms 7212 errors 0 of 4 thinking off
```

## Pilot results (mulligan, 4 cases, 1 answer each)

| run | score (95%) | acceptable | blunder | format fail | transport err | median | p90 | model |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Sonnet | 1.00 [1.00, 1.00] | 100% | 0% | 0 of 4 | 0 | 6.6 s | 8.4 s | claude-sonnet-5-5 |
| Haiku, thinking off | 1.00 [1.00, 1.00] | 100% | 0% | 0 of 4 | 0 | 7.2 s | 7.6 s | claude-haiku-4-5-20251001 |

Per-answer latencies (bench): Sonnet 6.6 / 8.4 / 5.9 / 6.4 s; Haiku-off 7.6 / 7.2 / 6.0 / 6.4 s.
Helper wall times (`J014-helper.log`): Sonnet 7090 / 8972 / 6398 / 6880 ms; Haiku-off 8119 / 7739 / 6527 / 6936 ms.

## Observations (not acted on)

- The cap does seem to reach the CLI: J013 saw Haiku's first text at 15–38 s with 1.2k–3.5k
  thinking tokens; here every Haiku-off answer finished in 6.0–7.6 s and the helper log tags
  each call `thinking off`. Haiku is now roughly as fast as Sonnet, but not faster, on these
  4 mulligan cases. No abort condition would have fired (no answer over 30 s, no retries,
  no transport errors, no format failures).
- With both models near 6–8 s, a fixed per-call overhead (CLI start-up, the ~4 k-char system
  prompt) may dominate. That is a guess; the bench JSON carries no per-call token or
  time-to-first-text detail to confirm it.
- 4 cases is small; the medians differ by 0.6 s. Whether check 4 is the right gate, or the full
  job should still run, is for the cloud session to decide.
- Machine during the pilot: J003 (`forgecoach-j003`) and `forgecoach-engine` both active;
  load average about 1.3 at the start.

## Files in results/J014/

- `STATUS`, `summary.md`
- `2026-10-03T16-35-35Z-J014-pilot-sonnet.json` / `.md`
- `2026-10-03T16-36-03Z-J014-pilot-haiku-off.json` / `.md`
- `pilot-sonnet-output.txt`, `pilot-haiku-off-output.txt` (full console output of the two runs)
- `J014-helper.log` (copied from `~/code/mtg-table-main/var/J014-helper.log`)

The helper on 8653 (pid 3588241, from `var/J014-helper.pid`) was stopped with `kill` after the
pilot; port 8653 is free. J003 and `forgecoach-engine` were left running and untouched.

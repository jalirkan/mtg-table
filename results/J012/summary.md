# J012 — failed at its pilot (Haiku latency)

Pilot: `npm run bench:coach -- --repeat 1 --type mulligan --model claude-haiku-4-5 --label J012-pilot`, exit 0.

| check | result |
|---|---|
| exit 0, 0 transport errors | pass (0 transport, 0 retries) |
| the model column shows Haiku | pass (claude-haiku-4-5-20251001) |
| at most 1 format failure | pass (0) |
| every answer takes 1-30 s | **FAIL**: mean 38.4 s, median 45.5 s, p90 and max 56.9 s |

Also seen: score 0.50 [-0.50, 1.00] on the 4 mulligan cases, 3 acceptable and 1 BLUNDER
(mulligan-number7-four-lands: Haiku answered `mulligan` on a four-land hand).

The surprise is the direction: through the same helper, Sonnet answered these case types in
5-12 s today (J006/J008 pilots: median 7 s), and Haiku took 45 s. Load average was 6.5 of 16
threads (J003 running at nice 10). No queue wait is counted in these latencies. So on this
path Haiku is not faster; it is about four to six times slower. Worth a look before any
conclusion about Haiku: how the helper invokes `claude` for the haiku alias (thinking, a cold
model start, a fallback), which the PC session can time on request.

Mistake by the PC session: the full run was started before the pilot's latency line had been
read; it was stopped after its first few seconds (unit forgecoach-j012), with no result file
written. Nothing from it is reported.

Files: 2026-10-03T15-48-19Z-J012-pilot.json and .md.

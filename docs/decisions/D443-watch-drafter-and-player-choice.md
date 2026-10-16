## D443 — Watch two bots takes who drafts and who plays each side by id from lists on /health; an `llm:` drafter runs under a per-watch cap and the fallback stop; match.json says what a watch is from its first write, and what it cost

*Branch `pc/watch-choices`, the cloud's note of 2026-10-16 (pc-jobs `README.md`, *NOTES TO THE PC*:
"watch-bots goes live; please add drafter choice and a Sonnet player to POST /watch"). Amends
**D440**; uses **D442**'s budget. `tools/watch-runner.mjs`, `tools/coach-helper.mjs`, `config.json`
(`coach.watchMaxUsd`, `coach.watchMaxCalls`), `tools/cubelab/watch.ts`, `tools/cubelab/cli.ts`,
`tools/watch-runner-selftest.mjs`, `web/test/cubelab-watch.test.ts`, `docs/watch-bots.md`,
`docs/security/endpoints.md`, `docs/guides/cube-lab.md`.*

**2026-10-16**

**Context.** Justin wants to pick who drafts (Forge ranks, the lab drafter, Sonnet) and who plays
(the Forge profiles, Search AI, Sonnet) when he watches two bots. ForgeCoach #172 has a hook for
the field names the cloud proposed. `POST /watch` took neither, and it refuses unknown fields. A
killed watch's `match.json` lacked its cube, players and times.

**Decision.**

1. **`/health` lists the choices**:
   - `watchDrafters: [{id, label, costNote?}]` holds `lab`, `forge-ranks`, `llm:haiku` and
     `llm:sonnet` (D439's names). The `costNote` is on the `llm:` entries only: the price a draft,
     the cap, the fallback stop, and "asks for a confirm".
   - `watchPlayers: [{id, label}]` holds each `forge-home/res/ai/*.ai` profile and `search-v2`.
   - `watchLlmCap: {maxUsd, maxCalls, maxFallbackRate}`.
   The cloud's field names are kept as proposed.
2. **`POST /watch` takes `drafterA`, `drafterB`, `playerA` and `playerB` by id.**
   - Drafters must match exactly. Players match in any case, and the older `search` means
     `search-v2`.
   - Any other value is a 400 whose message lists the known ids.
   - Defaults: `lab`, and `Default`.
   - **One side at most is not `lab`.** A non-lab drafter is measured against the lab's (D416,
     D439), and `runLab` seats one such drafter. Two non-lab drafters is a 400 that says so.
3. **No Claude player.** The games are recorded by `mtgtable.RecordMatch`, whose seats are Forge
   AIs (`--policy plain|search`). The LLM seat (D418, D419) is a `/ws` client of `MtgTable`, not a
   RecordMatch player. `watchPlayers` lists none, and a Claude id is a 400.
4. **Spending.** An `llm:` drafter runs under a D442 budget for the whole watch.
   - The defaults come from `config.json` (`coach.watchMaxUsd` 1, `coach.watchMaxCalls` 40, i.e.
     18 picks with two attempts each and a little room) plus the 25% fallback stop. The helper
     passes them to `cubelab.sh watch` as `--llm-max-usd`, `--llm-max-calls` and
     `--llm-fallback-rate`.
   - A stop ends the watch `error`: `drafter <side> (<id>) stopped the watch -- <the stop in
     words>`. It never goes on lab against lab.
   - `match.cost` is the real spend (calls, failed calls, decisions, retries, fallbacks, the four
     token counts, dollars at list price, the stop and why). It moves while the draft runs and is
     final when the draft is written or the watch stops.
   - A stop of the watch also stops the budget, which kills the CLI calls in flight. They run in
     process groups of their own, which the group SIGTERM does not reach.
   - `llm:opus` is not listed (about five times Sonnet's price, past the default cap in one draft).
     `llm:fake` and `human-picks:` are the CLI's only.
5. **`match.json` from the first write.** The helper writes it before it answers 202, and the
   watch's own first write repeats it. It holds the cube (title from the document's heading, and
   file), the seed, the best of, `need`, the pace, the players, the drafters, `startedAt` and
   `cost: null`. The watch no longer deletes it when it clears its folder. A watch killed at any
   point keeps all of that, and the helper's `settle` adds the status and the reason.

**Alternatives rejected.**
- *A per-request cap in the body*: the page would set the owner's spend. The cap is the
  machine's (its config), and the page is told it (`watchLlmCap`).
- *Two non-lab drafters (Sonnet against Forge ranks)*: wanted, but it needs `runLab` to seat two
  drafters, with identity and version for both. It is a follow-up, not a route change.
- *A Claude player through `MtgTable --transport ws` and the LLM seat*: a second recorder path per
  game. Its frame log is the seat's client log, the watch's pacing and redaction would be redone
  for it, and it costs about 150 calls a game (J119). It is out of scope for a route change.

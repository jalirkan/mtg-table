## D412 — The live search seat is search-v2: D388's anytime loop by default, adopted on J102's pre-registered rule

*Branch `c/anytime-default`.* Amends D314 (the game's `--ai-policy search` seat) and D388
(the anytime search, off by default until a measurement said otherwise). Reads J102
(`jobs/J102-anytime-fixed-match.md` on `pc-jobs`; `results/J102/` on `pc-results`), the fixed
match D398 built for this question.

**2026-10-07**

**The rule, as pre-registered** (J102's job file, written 2026-10-06 before the run, read from
`var/ai-ladder/match-J102.json`). *Decides:* whether the anytime search (D388, `anytime=1`)
becomes search-v1's default loop in the next search version. ADOPT `anytime=1` as the default
loop if all three hold:

- (a) the match is complete (all 2,400 games);
- (b) the 95% interval on search-v1-anytime's score against search-v1 has its lower end above
  0.5 (above 0 Elo);
- (c) the budget-fallback rate falls: search-v1-anytime's 95% upper end is below search-v1's
  95% lower end (both clustered by game).

Otherwise NO VERDICT, and D312's loop stays the default.

**The sides.** The job's command is `ai-ladder.sh match search-v1-anytime search-v1`, and
`match-J102.json` says `"a": "search-v1-anytime"` (config hash `cdd55e02a89c`),
`"b": "search-v1"` (`81058679773e`), so "a" is the anytime search and every "a" number below
is search-v1-anytime's.

**J102's numbers** (mtg-table `c9ae213`, the PC, 7 workers, 2026-10-07 02:14–07:44 UTC,
the confirm set `tools/ai-bench/pairs-confirm.txt`):

| | search-v1-anytime (a) | search-v1 (b) |
|---|---|---|
| games | 2,400 of 2,400 (1,200 mirrored pairs), `complete: true` | |
| draws / errors / timeouts | 0 / 0 / 1 | |
| score (a's, over pairs) | **0.5133 [0.5036, 0.5230]** | |
| Elo (a over b) | **+9.3 [+2.5, +16.0]** | |
| decisions searched | 55,603 | 55,717 |
| answers changed from Forge's | 10,113 | 9,348 |
| fallbacks: budget / rollout errors / unmappable | 397 / 106 / 80 | 3,128 / 321 / 74 |
| budget-fallback rate | **0.00714 [0.00579, 0.00849]** | **0.0561 [0.0514, 0.0609]** |

The job's own checks passed (`complete`, `played == 2400`, errors + timeouts ≤ played / 20).
Two pressure events (Justin at the table for 40 minutes) paused new games for both sides alike;
the deals are mirrored.

**Reading under the rule.** (a) holds: 2,400 of 2,400, complete. (b) holds: the lower end
0.5036 is above 0.5 (+2.5 Elo above 0). (c) holds: anytime's upper end 0.00849 is below
search-v1's lower end 0.0514. **Verdict: ADOPT.** The size is small, as the outside review
expected (about +9 Elo, the interval +2.5 to +16); the rule asked whether it is above zero,
and it is. The fallback rate falls by a factor of about eight, on the machine the live seat
runs on.

**Decision.**

1. **A new search version, `search-v2` = search-v1 + `anytime=1`.** `SearchConfig` gains
   `LIVE_VERSION = "search-v2"` and `LIVE_DEFAULTS = "anytime=1"`. `SearchConfig.parseLive`
   (the one parse `MtgTable --ai-policy search` / `--ai-search` uses) parses
   `LIVE_DEFAULTS` before the caller's keys, so a key the caller names wins:
   `--ai-search anytime=0` is search-v1's loop again, live.
2. **`SearchConfig.parse` is unchanged** (`anytime` defaults to off). The bench
   (`tools/ai-bench`), the cube lab's seats (`SeatSpec`) and every ladder player's seat
   config are parsed by it, so `search-v1`, `search-v1-fixed3` and the rest keep meaning
   exactly what their games were played under (D318: a ladder name is permanent; the test
   pins `search-v1` at `81058679773e`).
3. **The ladder needs no new player.** search-v2's config is `search-v1-anytime`'s exactly
   (`Default+outlets+search:…,seed=0,anytime=1`, hash `cdd55e02a89c`), and the registry
   holds one name per config (`no two players share a config`; results are rated by hash).
   So the ladder keeps rating the live seat as `search-v1-anytime`, with J102's 2,400 games
   already on it; its note and `search-v1`'s say so. Registering `search-v2` beside it would
   split one AI into two names.
4. **The opponent picker and Play vs Forge need no change.** They offer the policy
   `search` (M56's `aiPolicy`, D333's `aiSearchMs` → `--ai-search ms=N`), and every path
   into the live seat goes through `parseLive`, so a picked budget keeps the anytime loop.
   The engine's start line names the version (`ai policy = search (…,anytime=1; search-v2,
   D412)`), and `play.sh --ai-search`'s help says so.
5. **Tests.** `DecisionSelfTest` (the build's self-test): the live default is search-v1's
   config plus `,anytime=1` and names search-v2; a picker budget keeps it; `anytime=0` gives
   search-v1 back; `parse("")` stays off. `web/test/ai-ladder.test.ts`: `search-v1-anytime`
   is `search-v1`'s seat config plus `,anytime=1` and nothing else, both keep J102's hashes,
   and `LIVE_DEFAULTS` is exactly the switch that separates them.

**Not decided here.** Whether D389 (`rank=prior`) or D390 (`rollout=outlets`) join a later
version; each has its own SPRT entrant. The fixed-rollout benchmark mode
(`search-v1-fixed3`) stays D312's loop: with no budget, the anytime loop's pruning and
racing are a different search, and a fixed3 variant with `anytime=1` would be its own
ladder name.

**Takes effect** when the engine restarts: a running `play.sh` keeps the build it started
with. The owner restarts `./scripts/play.sh` (with `--ai-search`, or picks the search AI in
ForgeCoach's opponent picker) to play search-v2.

# J121 — deckbuilder choices: lands 16/17/18, splash cut, lab and Forge builders vs ForgeCoach's (B2)

Written by the cloud session, 2026-10-10 08:15 EDT, from `metrics.json` (the read in the job's inline
`variants.ts`). Job 01:04 → 07:49 EDT (6 h 45 m, pilot included), 7 workers, every check PASS.
**Complete.** 1,600 lab drafts (800 Vintage 180, 800 Evan's cube), 3,188 focus pools.
Forge arm 32,444 games (1.95 s mean; 3 errors, 3 timeouts, 3 draws); search-v2 arm 2,948 games
(33 s mean; 1 error, 2 timeouts; budget fallback 0.6%).

Differences are the variant's win rate minus the reference's, paired by pool, clustered by draft;
the rule reads the Forge arm at 99% (five primary contrasts), the land and splash ones also need
search-v2's estimate on the same side.

## Primary contrasts (Forge arm, 99% interval; search-v2 estimate)

| Contrast | Pools | Estimate | 99% | search-v2 | Reading |
|---|---|---|---|---|---|
| 16 minus 17 lands | 2,955 | −1.5 pts | [−3.8, +0.8] | −2.6 | NOT SHOWN |
| 18 minus 17 lands | 3,185 | −1.8 pts | [−3.9, +0.4] | −1.2 | NOT SHOWN |
| splash cut minus ForgeCoach | 518 | −2.5 pts | [−8.3, +3.2] | +11.3 | NOT SHOWN (arms disagree) |
| lab builder minus ForgeCoach | 3,188 | −5.4 pts | [−7.6, −3.1] | — | **SHOWN: ForgeCoach's builds win more** |
| Forge's builder minus ForgeCoach | 3,188 | −3.5 pts | [−5.8, −1.3] | — | **SHOWN: ForgeCoach's builds win more** |

## Secondary (decide nothing)

- Where ForgeCoach chose 16 lands (760 pools): its 16-land deck minus the same deck on 17 =
  −3.9 pts, 95% [−7.5, −0.3], 99% [−8.7, +0.9]; search-v2 −5.2. A hint against the low-curve
  16-land rule; not shown at the pre-registered 99%.
- Where ForgeCoach chose 17 (2,153 pools): 16 minus 17 = −0.9 [−3.7, +1.9] (99%). 18 minus 17 = −2.1 [−4.7, +0.6].

## Reading under the rule

- **Land count: NOT SHOWN** either way; ForgeCoach keeps its land rule. **18 lands: not shown**
  (would only have been reported to Justin).
- **Splash: NOT SHOWN**; the two arms point opposite ways on few pools (518 Forge, 83 search).
- **Builders:** ForgeCoach's deck assistant beats both the lab's builder (+5.4 pts) and Forge's
  own builder (+3.5 pts) on the same pools. Per the rule this changes nothing by itself.
- "Not shown" is never "no effect": small land effects (~1-2 points) remain possible.

Caveats: AI-drafted pools and Forge-piloted games; Mutavault/Ephemerate not tested (not in these
cubes / AI-flagged). The 16-land hint is the natural candidate for a narrower follow-up
(low-curve pools only) if Justin wants one.

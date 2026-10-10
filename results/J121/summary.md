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

---

## The PC session's reading (2026-10-10 08:55 EDT)

**Primary contrasts, Forge arm (points = variant win rate minus reference, paired by pool):**
- **16 minus 17 lands:** −1.5 pts, 95% [−3.3, +0.3], 99% [−3.8, +0.8]; 2,955 pools / 1,596 drafts;
  search-v2 arm −2.6 (441 pools). **Not shown.**
- **18 minus 17 lands:** −1.8 pts, 95% [−3.4, −0.1], 99% [−3.9, +0.4]; 3,185 pools / 1,600 drafts;
  search-v2 −1.2 (474 pools). **Not shown** at the pre-registered 99% (it would be at 95%); so no note of
  "18 shown" goes to Justin.
- **Splash cut minus ForgeCoach's build:** −2.5 pts, 95% [−6.9, +1.9], 99% [−8.3, +3.2]; 518 pools / 468
  drafts; search-v2 **+11.3** [−0.3, +22.9] on 83 pools. **Not shown, and search-v2 disagrees.**
- **Lab builder minus ForgeCoach's:** −5.4 pts, 95% [−7.1, −3.6], 99% [−7.6, −3.1]; 3,188 pools / 1,600
  drafts. **Reference better: ForgeCoach's deck assistant builds the stronger deck.**
- **Forge's builder minus ForgeCoach's:** −3.5 pts, 95% [−5.2, −1.8], 99% [−5.8, −1.3]; 3,188 pools.
  **Reference better** again.

**What changes in ForgeCoach:** nothing, as the rule says. The land count and the splash cut stay as they
are; the two builder contrasts are a validation of the deck assistant (it beats both the lab's builder and
Forge's own by 3–5 points on identical pools), not a change.

**Descriptive only.** ForgeCoach chose 16 lands in 24% of pools, 17 in 68%, 18 in 8%, and splashed in 16%
(518 of 3,188). Where it chose 16 (760 pools) the same deck on 17 did better by 3.9 pts at 95% [−7.5, −0.3]
but not at 99%: a hint against the low-curve 16-land rule, the natural narrow follow-up. Where it chose 17,
16 and 18 were both a little worse (−0.9, −2.1; intervals include 0). Per-cube tables are in the job's
`summary.md` above.

**Cost:** Forge arm 32,444 games at 1.95 s (≈17.6 game-hours over 7 workers), search-v2 arm 2,948 games at
33 s (≈27 game-hours); wall 6 h 45 m, 01:04 → 07:49 EDT. **The PC was not in other use** while it ran
(Justin was asleep; the Endstep study and the board build started after 07:00 and used a browser and one
JVM, not the lab's cores).

# J124 — 16 or 17 lands where ForgeCoach's deck assistant picks 16 (B2 follow-up)

Written by the PC session, 2026-10-14, from `metrics.json` (the runner's metrics, which carry the read's `jr.*`
keys), `variants.json`, `checks.txt`, STATUS and the step logs. Job 01:07 → 05:45 EDT (4 h 37 m, pilot included),
7 workers, every pilot check and every final check PASS. Pinned mtg-table@37c6ae6, ForgeCoach@3972058.

## The rule and its verdict

**Pre-registered (job file, 2026-10-14, before any draft or game):** over every pool where ForgeCoach's builder
picks 16 lands, the 16-land deck's score minus the same deck on 17 lands, paired by pool and clustered by draft.
SHOWN if the Forge Default arm's 99% interval lies entirely below 0 **and** search-v2's estimate is below 0; then the
cloud changes ForgeCoach's low-curve rule to 17. Otherwise NOT SHOWN, and the rule stays.

**Verdict: NOT SHOWN. The rule stays.** The Forge arm's 99% interval is [−2.5, +1.3] points, which includes 0.
search-v2's estimate (−1.1) has the same sign, but the rule needs both conditions. The runner's last check
recomputed the rule from the read's own numbers and agreed (`jr.shown = 0`, `jr.f_hi99 = +0.0133`).

| Arm | Pools | Drafts | 16 − 17 (points) | 95% | 99% |
|---|---|---|---|---|---|
| **Forge Default (carries the rule)** | 2,019 | 1,707 | **−0.6** | [−2.1, +0.9] | **[−2.5, +1.3]** |
| **search-v2 (the sign check)** | 300 | 252 | **−1.1** | [−6.7, +4.5] | [−8.5, +6.3] |

A point is one percentage point of game score: −0.6 means the 16-land deck scored 0.6 points less than its
17-land twin against the same opponent deck.

## The job's own table

The job wrote `var/lab-j124/out/summary.md` and `metrics.json`, but the runner reserves those two names in
`results/<id>/` and skipped collecting them (`collect-skipped.txt`). Its table is printed in `run4.log`, copied here
unchanged. Rows marked "description" decide nothing.

# J124: 16 or 17 lands where ForgeCoach's builder picks 16 (paired by pool, clustered by draft)

Points = the 16-land deck's game score minus the same deck on 17 lands, on the same pool against the same opponent deck (+1.0 = 16 lands wins 1 point more).

**Rule (pre-registered): NOT SHOWN: the rule stays.** SHOWN needs the Forge arm's 99% interval entirely below 0 and search-v2's estimate below 0.

| read | pilot | pools | drafts | points | 95% | 99% |
|---|---|---|---|---|---|---|
| all 16-land pools (the rule) | Forge Default | 2019 | 1707 | -0.6 | [-2.1, +0.9] | [-2.5, +1.3] |
| search subsample (the rule's sign) | search-v2 | 300 | 252 | -1.1 | [-6.7, +4.5] | [-8.5, +6.3] |
| cube vintage (description) | Forge Default | 1185 | 952 | -0.2 | [-2.2, +1.7] | [-2.8, +2.4] |
| cube synergy (description) | Forge Default | 735 | 656 | -1.3 | [-3.6, +1.0] | [-4.4, +1.8] |
| cube evybaby (description) | Forge Default | 99 | 99 | +0.4 | [-6.4, +7.3] | [-8.6, +9.4] |
| source lowcurve (description) | Forge Default | 774 | 729 | -0.6 | [-2.9, +1.7] | [-3.7, +2.4] |
| source meta (description) | Forge Default | 1245 | 1074 | -0.5 | [-2.4, +1.5] | [-3.0, +2.1] |
| source other (description) | Forge Default | 0 | 0 | - | - | - |

## Where the 16s came from (pools kept; information only)

4,200 lab drafts (1,400 per cube, seeds 813,000,001–813,001,400) gave 8,400 pools. The builder picked 16 lands in
2,019 (24.0%), 17 in 6,246, 18 in 116, and found no legal build in 19. Every 16-land pool had a legal 17-land twin
(`no_l17` 0), every pool card was known to ForgeCoach's builder (`unknown_cards_all` 0), and every 16 had a known
source (`src_other` 0).

| Cube | Pools | Builder picked 16 | Low-curve rule | Meta land table | In search subsample |
|---|---|---|---|---|---|
| Vintage 180 | 2,800 | 1,185 (42.3%) | 168 (14%) | 1,017 (86%) | 165 |
| Synergy (v2) | 2,800 | 735 (26.3%) | 589 (80%) | 146 (20%) | 125 |
| Evan's cube | 2,800 | 99 (3.5%) | 17 (17%) | 82 (83%) | 10 |
| **All** | 8,400 | **2,019** | **774 (38%)** | **1,245 (62%)** | 300 |

These match the measurement in the job file (Vintage 46.5%, 88% meta table; Synergy 28%, 79% low-curve).
**The pre-registered rule covers all 2,019 pools.** Most of them (62%) took 16 from the meta's land table, not from
the low-curve rule the brief named. The cloud was told this in HEARTBEAT before the verdict (01:10).

**Per-source reads. Information only; they decide nothing:**

| Source | Arm | Pools | 16 − 17 | 95% | 99% |
|---|---|---|---|---|---|
| Low-curve rule | Forge Default | 774 | −0.6 | [−2.9, +1.7] | [−3.7, +2.4] |
| Meta land table | Forge Default | 1,245 | −0.5 | [−2.4, +1.5] | [−3.0, +2.1] |
| Low-curve rule | search-v2 | 122 | −4.6 | [−12.8, +3.6] | [−15.3, +6.2] |
| Meta land table | search-v2 | 178 | +0.2 | [−7.4, +7.8] | [−9.8, +10.1] |

Both sources point the same small way under Forge (about half a point). The low-curve rule's search-v2 read of
−4.6 rests on 122 pools, and its interval is ±8 points wide.

## What it means against J121's −3.9 hint

J121's after-the-fact secondary read (760 pools where the builder picked 16, mostly Vintage meta-table pools; 2
games a deck) was −3.9, 95% [−7.5, −0.3]. On 2,019 fresh pools at 4 games a deck, J124 measures −0.6, 95%
[−2.1, +0.9]. Its SE was 0.75 points, against the 0.9–1.0 planned.

- The hint did not replicate at its size. J124's whole 95% interval lies above J121's point estimate, and J124's
  estimate sits at the top edge of J121's 95% interval. That is the usual pattern for a read picked after looking
  among several: J121's −3.9 was mostly luck, plus at most a small real effect.
- This rules out large effects on these pools, under Forge's pilot. At 99%, 17 lands beat 16 by at most 2.5 points,
  and 16 beats 17 by at most 1.3. An effect of about 1 point either way is still possible. "Not shown" is not "no
  effect".
- So 16 lands where the builder picks 16 is not shown to cost games. Keeping the low-curve rule and the meta land
  tables as they are is consistent with the evidence. Neither arm suggests 16 is better, either.
- Synergy, where the low-curve rule does most of the work, reads −1.3 [−3.6, +1.0] (95%, description). If anyone
  wants a further look, that is the place. Under the pre-registered rule nothing changes.

## Played, rate, errors, time

| Step | When (EDT) | What | Errors |
|---|---|---|---|
| Pilot | 01:07 → 01:14 | 18 drafts, 7 pools kept, 56 Forge games (4.2 s mean), 8 search-v2 games (35 s mean, 338 searched decisions) | 0 |
| Drafts and variants (run1) | 01:14 → 01:20 | 4,200 drafts, `--games 0`: 50 s Vintage, 51 s Evan's, 76 s Synergy on 7 workers; variants in about 2 min | 0 drafting errors |
| Forge arm (run2) | 01:20 → 03:41 (2 h 21 m) | 16,152 games = 2,019 pools × 2 decks × 4; 3.28 s mean, 1.56 s median; 0.52 s a game wall-clock | 2 engine errors, 9 timeouts (0.07%), 2 draws |
| search-v2 arm (run3) | 03:41 → 05:44 (2 h 04 m) | 1,200 games = 300 pools × 2 decks × 2; 36.4 s mean, 29.7 s median; 52,940 searched decisions, budget fallback 0.9% | 0 errors, 1 timeout |
| Read (run4) | 05:44 → 05:45 | the table above | |

- **Totals:** about 14.7 game-hours on the Forge arm and 12.1 on search-v2, 4 h 37 m wall-clock.
- **Memory:** two pressure events, at 01:17 (dropped to 6 workers) and 01:22 (back to 7). Peak worker RSS was 1.65 GB.
- **Speed:** the Forge arm ran at 0.52 s a game wall-clock, against J121's 0.29 s, and at 3.28 s a game against
  1.95 s. That is why it took 2 h 21 m instead of the planned ~1.4 h.
- **Other use of the PC:** yes. A GPU scenery lane ran during the job, and from about 05:45 J125 was queued behind
  it. Justin was not playing; the runner never held the job.
- **Win rate against the opponent:** the focus decks won 52.8% of Forge games and 56.0% of search-v2 games against
  the other seat's lab deck. This is information only, and in line with J121's finding that the deck assistant's
  builds beat the lab builder's.

## Caveats

- AI-drafted pools, AI-piloted games.
- Synergy is ForgeCoach's v2 document (Yawgmoth, Reanimate, Murderous Redcap in), drafted on Forge's ranks.
- The 17-land twin is J121's `stepLands`: one spell out, chosen by the builder's own score.
- Collect: in future job files, name the read's outputs something other than `summary.md` or `metrics.json` so the
  runner collects them.

## For the cloud

HEARTBEAT.md has `FOLLOW-UP READY [J124@2026-10-14T05:45:07-04:00]` (template morning-read), addressed to the cloud
session. The PC left it in place. Nothing in STATUS needed an `approved:` edit: the job ran its pilot checks
mechanically and finished `done`.

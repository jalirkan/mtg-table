# J136 summary: four candidate 180s from the whole library, compared before and after evolve

Written by the PC session on 2026-10-17. Sources are the J136 result files: `baseline.json/.md`, `final.json/.md`, `swaps.json/.md`, `notes-check.json`, the four evolve changelogs and `evolve-*.json`, `checks.txt`, `metrics.json`, STATUS and the step logs. Nothing was re-run.

- **Timing:** 12:34:12 → 14:47:37 EDT on 2026-10-16 (2 h 13 m). That is well under the job file's 5–7 h estimate.
- **Pins:** mtg-table@0c9bab7 (PRs #146 and #147 merged) and ForgeCoach@3e3b007.
- **Checks:** all 37 pilot checks and all 35 final checks pass.

## Measurement job, no verdict rule

D441's eleven measures were fixed before any draft, and no `--rule` was passed. This summary therefore reports estimates and intervals and calls no cube "best".

**Populations.** All four were drafted as grid drafts, best of three, Default vs Default, with the lab builder, on Forge's ranks, unrecorded.
- `omega` is `cubes/omega-cube-180.md`.
- `hits` is `cubes/library/hits-180.md`: the greatest hits by pooled lab win rate, cards with 80+ lab games, laid out on Omega's skeleton.
- `random` is `cubes/library/random-180.md`: a seeded random draw from the supported library on the same skeleton, as a control.
- `synergy` is ForgeCoach's Synergy v2, sha256 checked (`synergy-source.txt`).

**Stages.**
1. **Baseline:** 400 drafts per population on one seed block, 836,000,001–400.
2. **Evolve:** each population evolved for 2 generations × 200 drafts from the 1,592-card `library-pool.tsv`, with exploration on.
   - Omega used its own notes file.
   - hits, random and synergy used per-population notes. The 11 Power cards (Power Nine, Sol Ring, Library of Alexandria) were cut wherever present. Omega's other 43 exclusions were marked never-add, for the cards each input cube lacked.
3. **Final:** 400 drafts per population on a fresh block, 836,100,001–400.

**Intervals.** All are 95%, from 1,000 draft-clustered bootstrap replicates with the seeds resampled jointly, so each difference within one table is paired. Colour pairs count when they have 30+ decisive games. Each table holds 66 difference intervals (11 measures × 6 pairs), so about 3 would exclude 0 by chance alone.

## The five measures, before → after evolve (estimate [95% interval])

| measure | omega | hits | random | synergy v2 |
|---|---|---|---|---|
| **1. card flatness** (true SD, pts) | 0.00 [0.00, 0.00] → 0.00 [0.00, 3.29] | 0.00 [0.00, 3.41] → 0.00 [0.00, 3.51] | 0.00 [0.00, 3.64] → 2.17 [0.00, 4.70] | **8.06** [6.27, 9.61] → **7.84** [5.95, 9.69] |
| **2a. pair spread** (pts) | 8.2 [0.0, 21.0] → 23.7 [13.4, 34.3] | 15.9 [5.5, 29.7] → 23.7 [11.2, 41.5] | 11.0 [0.0, 28.7] → 23.9 [10.6, 39.5] | **45.0** [36.1, 54.7] → **44.9** [34.9, 57.7] |
| 2b. pairs within ±5 of 50% | 80% [40, 100] → 50% [30, 70] | 78% [30, 89] → 67% [30, 88] | 71% [29, 88] → 38% [25, 75] | 20% [0, 30] → 20% [0, 50] |
| 2c. pairs counted (30+ games) | 10 → 10 | 9 → 9 | 7 → 8 | 10 → 10 |
| **3a. draws** (incl. timeouts) | 0 → 0 | 0 → 0 | 0 → 0 | 0.21% [0.00, 0.52] → 0.21% [0.00, 0.52] |
| 3b. game length, turns | 18.94 → 18.73 | **16.13 → 16.23** | 19.75 → 19.42 | 19.42 → 19.58 |
| **4a. lands** | 16.99 → 16.99 | 16.99 → 16.99 | 17.00 → 17.00 | 16.42 → 16.39 |
| 4b. colours (main + splash) | 2.13 → 2.11 | 2.38 → 2.43 | 2.77 → 2.75 | 2.19 → 2.18 |
| 4c. exactly two main colours | 100% → 100% | 100% → 100% | 100% → 99.9% | 100% → 99.9% |
| 4d. splash | 13.4% → 10.9% | 37.5% → 42.6% | **76.5% → 75.4%** | 19.1% → 17.8% |
| **5. first-pick top-10 share** | 11.5% → 11.7% | 13.0% → 13.2% | 13.3% → 13.5% | 12.6% → 12.7% |

**Reading the flatness row:**
- ForgeCoach's own chi-square reading of flatness agrees with the bootstrap.
- Omega, hits and random read "flat" or "unclear" in both tables: they cannot be told apart from a cube whose cards all win alike. Their upper bounds sit at 3.3–4.7 pts.
- Synergy reads "uneven" in both: 8.06 [6.94, 9.80] at baseline and 7.84 [6.73, 9.59] at the end.
- Each table read 151–165 cards with 10+ decisive games per population.
- An estimate of 0.00 means the observed spread is no bigger than the noise. It does not mean the cards are identical.

## Pairwise differences whose interval excludes zero

**Baseline:**
- **Synergy is less balanced than each of the other three, on every balance measure:**
  - Flatness: omega − synergy −8.06 [−9.61, −6.22]; hits −8.06 [−9.47, −4.27]; random −8.06 [−9.51, −3.54].
  - Pair spread: omega − synergy −36.8 [−49.4, −21.7]; hits −29.1 [−43.6, −12.5]; random −34.0 [−49.0, −14.4].
  - Pairs within ±5: omega − synergy +60 [+20, +89]; hits +58 [+10, +79]; random +51 [+8, +80].
- **Omega, hits and random do not differ from each other on any balance measure.** All nine of their flatness, spread and within-5 differences contain 0, for example omega − hits spread −7.7 [−24.1, +8.8].
- **Deck shape separates all four:**
  - Splash (all six pairs): omega 13% < synergy 19% < hits 38% < random 77%. For example, hits − random −39.0 [−43.1, −35.0].
  - Colours: all six pairs differ, in the same order.
  - Lands: each of the other three runs about +0.58 lands over synergy.
  - Game length: hits is the shortest. Omega − hits +2.81 [+2.39, +3.23]; hits − random −3.62; hits − synergy −3.29. Omega − random −0.81 [−1.25, −0.35].
  - First-pick concentration (all six pairs): Omega lowest (11.5%), random highest (13.3%). The spread is only about 2 points.

**Final:**
- **Synergy is still less balanced on flatness and pair spread:**
  - Flatness: omega − synergy −7.84 [−9.49, −4.28]; hits −7.84 [−9.57, −4.28]; random −5.68 [−9.12, −2.45].
  - Pair spread: omega −21.2 [−36.5, −6.9]; hits −21.3 [−38.7, −0.7]; random −21.1 [−37.7, −3.0].
  - Pairs within ±5: no difference excludes 0 any more.
- **Omega, hits and random still do not differ from each other on any balance measure.**
- **Deck shape:** the same pattern as baseline.
  - Splash, all six pairs: omega − hits −31.8 [−36.0, −27.9], hits − random −32.8.
  - Colours: all six pairs again.
  - Lands: each of the other three still runs about +0.60 over synergy.
  - First-pick concentration: all six pairs again.
  - Game length: omega − hits +2.50, hits − random −3.19, hits − synergy −3.35, omega − random −0.69, and omega − synergy −0.85 [−1.35, −0.35] is newly shown.

## What each evolve did

| population | swaps | what | AI-evidence cuts |
|---|---|---|---|
| omega | 0 | — | none confirmed. Gen 1 had 12 leads and gen 2 had 9, all "insufficient data". The changelog estimates about 1,500–1,800 drafts per generation would find half of them. |
| hits | 4, all POWER note-cuts in gen 1 | Ancestral Recall → Miscalculation; Mox Emerald → Chrome Mox; Mox Jet → Grim Monolith; Time Walk → Chart a Course | One discovery candidate: Retrofitter Foundry, dominant by first pick (157 of 179 grids). It was **not confirmed** on 47 fresh drafts (Holm p 0.082). |
| random | 1, a POWER note-cut in gen 1 | Mox Jet → Chrome Mox | One discovery candidate: Kitchen Finks, flagged dead (1 of 29 on-colour pools). It was **not confirmed** on 125 fresh drafts (Holm p 0.347). |
| synergy | 0 | — | none confirmed. Gen 1 had 8 leads, gen 2 had 13, all insufficient data. |

- **The POWER cuts worked as written.**
  - `notes-check.json` reports `power_found 0` and `never_added 0` across all four evolved cubes, so no never-add card entered any cube.
  - `never_kept 6`: the six excluded cards that were already in their input cubes stayed, as designed. These are Minsc & Boo (hits); Flash, Archon of Cruelty and Nadu (random); and Archon of Cruelty and Faithless Looting (Synergy).
- **The Power cards' own numbers before the cut:**
  - They were near-universal first picks: first line in 137–152 of about 180 grids.
  - Every deck that could play them did.
  - They did not win more: Ancestral Recall 0.47, Time Walk 0.51, Mox Emerald 0.53, Mox Jet 0.51–0.52.
  - In random, Mox Jet was already a dominant-pick discovery (p 3.0e-4) when the note removed it.
- **Two of the replacements are fast mana that Omega's exclusions don't list:** Chrome Mox (in hits and random) and Grim Monolith (in hits). That's a list question for Justin, not something the run got wrong.
- **Exploration** (D356, about 31% of discovery drafts) judged almost nothing:
  - hits: Hanweir Garrison "holds its own when played".
  - random: Strixhaven Skycoach "weak when played".
  - Everything else was undecided or had too few forced decks: 65, 86, 62 and 66 cards respectively for omega, hits, random and synergy.
- **Two 200-draft generations cannot find dead or dominant cards here.** With D331's two looks they confirmed nothing on AI evidence in any population, so evolve contributed only the note-cuts.

## Did two generations move any population measurably?

**No, and this design cannot show it.** The two tables are on different seed blocks and, for hits and random, different card lists. As the job file pre-registered, before and after can only be read as two intervals side by side. No paired before/after test exists in this data.

**Omega and Synergy are a built-in noise check.** Their card lists did not change: 0 swaps. Only the iteration-log line changed their sha. So their before → after movement is pure seed-block noise at 400 drafts:
- **Omega's pair spread went 8.2 → 23.7.** That is +15.5 pts on an identical cube. A rough unpaired normal-approximation interval, [+0.7, +30.3], even excludes 0.
- Omega's pairs within ±5 went 80% → 50% on the same identical cube.
- Synergy's spread was 45.0 → 44.9.

That puts the noise floor for pair spread at 400 drafts at least as wide as J135's ±6–10 points at 300 drafts, and Omega's +15.5 shows it can be larger. Pair spread is a max − min over 7–10 pairs, so it jumps when a single pair moves.

**hits and random, which did change:**
- Pair spread: hits +7.8 (approx. [−11.6, +27.2]), random +12.8 (approx. [−7.5, +33.2]). Both moved less than unchanged Omega did, so neither is evidence of an effect.
- Flatness: random 0.00 → 2.17 [0.00, 4.70], within noise.
- **hits' splash rose 37.5% → 42.6%** (approx. +5.1 [+0.6, +9.7]) and its colours 2.38 → 2.43. This fits Chrome Mox and Grim Monolith replacing the Moxen. But it is unpaired and one of about 40 such comparisons, so treat it as a hint only.

## Where hits-180 and random-180 landed, and what that says about "best 180 from the whole library"

- **On the AI's balance measures, all three 180s on Omega's skeleton are indistinguishable** (Omega, the lab's greatest hits, and a random draw):
  - Flatness: all three are at 0 with upper bounds of 3.3–4.7 pts.
  - Pair spread: 8–16 pts at baseline and about 24 at the end, with every difference containing 0.
  - All three are clearly more balanced than Synergy v2, in both tables.
- **The skeleton, not the selection, carries the balance here.** The skeleton is 24 cards per colour, 2 gold cards per pair, 18 colourless, 2 fixing lands per pair, and Omega's curve. A random library cube that nobody chose card by card is about as balanced, for Forge's AI, as Omega's hand design or a greatest-hits list chosen by win rate.
- **The selections differ in deck shape, not balance:**
  - Splash: random decks splash in about 76% of decks (2.76 colours), hits 38–43%, Omega 11–13%.
  - Game length: hits plays the shortest games (16.1–16.2 turns against 18.7–19.8).
  - First-pick concentration: Omega spreads first picks a little more evenly (11.5% against 13.0–13.5%). The differences are real but small.
- **For "the best 180" question:** no population is shown to be the best. Picking by lab rating (hits) buys nothing measurable over a random draw on the same skeleton, at 400 drafts and for the AI. Synergy's imbalance (an 8-pt card SD, a 45-pt pair spread) comes from its design, as the J135 design study found, not from its card pool.
- **Choosing among Omega, hits and a skeleton-random cube** is a question for a human: what games and decks you want, such as fewer splashes (Omega) or faster games (hits). Balance does not decide it.

## Caveats

- **The lab frames all of this.** The drafter picks by Forge's ranks and the lab builder builds the decks. Every played deck had exactly two main colours (99.9–100%), which is what the builder does.
  - This is cube-balance evidence for Forge's AI under this drafter and builder. It is not a census of what decks a cube allows, and not a human-play verdict.
  - Random's high splash rate is what the builder makes of thin colour depth, not a choice a player made.
- **Flatness at 0 is "can't tell from flat" at 400 drafts** (about 155 cards with 10+ games each). It is not a proof of equal cards. Upper bounds near 3–5 pts leave room for real spread.
- **Pair spread at 400 drafts is coarse:** 7–10 pairs, with random reaching only 7–8 pairs at 30+ games, and it moves ±15 pts on an unchanged cube. Fewer counted pairs also tend to give a smaller max − min.
- **Before and after are not paired** (above). Any "evolve effect" claim needs a same-seed design.
- **Evolve at 200 drafts per generation is underpowered.** It confirmed no AI-evidence swap anywhere, so this run tests the starting lists plus the Power cuts, not what evolve could do with more drafts.
- **The Power cuts change hits and random between tables.** The baseline hits still holds Ancestral Recall, Time Walk and two Moxen; the baseline random holds Mox Jet.
- **All populations used Forge's ranks.** A ratings file would change the drafting.

## Run health

- **Drafts:** 4,972 in total. That is 3,200 compare drafts, 1,600 evolve discovery drafts, and 172 confirmation drafts (hits 47, random 125). They produced 12,271 games.
- **Engine errors:** 7 (0.14%). All were "a game thread would not stop after its timeout; the worker was restarted", and **all 7 were Synergy matches**, 6 of them involving a UG deck.
- **Timeouts and draws:** 7 timeouts, all Synergy, and 9 draws. Synergy's games average about 7.3 s against 2.3–2.9 s for the others.
- **Resources:** 7 workers, peak 1.36 GB per worker, no memory pressure events.
- **Steps:** baseline 12:39–13:21, evolve 13:21–14:10, final 14:10–14:47. Each population's evolve made 400 discovery drafts across 2 generations.
- **Checks:** `notes-check.json` shows 0 Power cards and 0 never-add cards in the evolved cubes. Both compare files passed the strict-JSON check, the same-seeds check, and the flatness-readable check for every population.

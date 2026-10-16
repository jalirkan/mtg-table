# J134 — Which drafter drafts best? Forge's ranks, the human-pick model and (skipped) Sonnet, each against the cube lab's own drafter

Written by the PC session, 2026-10-17, from `drafters.json`, `report.md`, `checks.txt`, `pilot-checks.txt`,
`metrics.json`, STATUS and the step logs. Job 11:21:34 → 12:34:25 EDT on 2026-10-16 (1 h 13 m, pilot included),
7 workers, **every pilot check and every final check PASS**. Pinned mtg-table@0c9bab7. It carries PR #144's
merge (`d850f72c`: `--drafter forge-ranks`, `--drafter llm:<model>`, D439), and the pilot's `merged == 1` passed.
ForgeCoach@2f05b15 supplied Evan's Twobert (sha256 54d9c89e… checked). The human-pick files are mtg-table's
`fixtures/human-picks/` copies, J114's exact files (sha256 checked).

## The rule, written before any game

Each arm pits one challenger drafter against the lab drafter on the same seeds twice. In folder `<arm>A` the
challenger drafts seat A; in `<arm>B` it drafts seat B. Both seats build with the lab builder and the cube's
ratings (Twobert has no ratings file, so both seats rate it by Forge's ranks). Both decks are piloted by Forge
Default, best of three.

- **Outcome:** the challenger's match win rate, pooled over both folders. A won match counts 1, a lost match 0,
  a drawn match 0.5. Matches with an engine error are left out and counted.
- **Interval:** 95%, cluster bootstrap over seeds (a seed's two matches resampled together), 10,000 resamples,
  `default_rng(20261015)`, percentile.
- **Rule:** a drafter BEATS another when its 95% interval lies entirely above 0.5.
  - The challenger BEATS the lab drafter: interval above 0.5 (code 1).
  - The lab drafter BEATS the challenger: interval below 0.5 (code −1).
  - Otherwise NOT SHOWN (code 0), never "no difference".
  - An arm missing planned seeds is INCOMPLETE (code 8); the LLM arm not run is SKIPPED (code 9).

## Verdicts

| arm | cube | challenger's match win rate [95%] | W-L-D | matches (seeds) | verdict (code) | as seat A / B | game win rate [95%] | engine errors left out |
|---|---|---|---|---|---|---|---|---|
| FL — Forge's ranks | Vintage 180 | **53.8% [49.8, 57.7]** | 322-277-0 | 599 (300) | **NOT SHOWN (0)** | 55.9% / 51.7% | 52.4% [50.0, 54.9] | 1 |
| FL — Forge's ranks | Synergy | **52.8% [49.1, 56.4]** | 316-283-1 | 600 (300) | **NOT SHOWN (0)** | 49.3% / 56.2% | 51.9% [49.4, 54.4] | 0 |
| FL — Forge's ranks | Evan's Twobert | **49.5% [45.7, 53.2]** | 297-303-0 | 600 (300) | **NOT SHOWN (0)** | 53.0% / 46.0% | 49.9% [47.5, 52.3] | 0 |
| HL — human-pick model | Vintage 180 | **51.3% [45.7, 57.0]** | 154-146-0 | 300 (150) | **NOT SHOWN (0)** | 48.7% / 54.0% | 50.7% [46.9, 54.4] | 0 |
| HL — human-pick model | Synergy | **54.2% [48.7, 59.4]** | 162-137-0 | 299 (150) | **NOT SHOWN (0)** | 55.7% / 52.7% | 52.9% [49.2, 56.7] | 1 |
| LL — Sonnet | Vintage 180 | — | — | — | **SKIPPED (9)** | — | — | — |

**No drafter was shown to beat another on any cube.** Every interval that was measured includes 50%. The
mirrored seats cancel the seat effects in the pooled rate; these effects are large on Synergy (FL 49.3% as A
against 56.2% as B) and on Twobert (53.0% against 46.0%).

## What it says

**Does the lab drafter's lean and synergy beat Forge's raw ranks? Not shown, on any cube.**
- The two drafters start from the same numbers where the cube has no edited ratings. Vintage's ratings file is
  Forge's ranks for 179 of 180 cards, and Twobert has no ratings file.
- What separates them is the lab's theme-synergy term, its colour lean and its late commitment (a third of its
  picks, against forge-ranks' commit after the first line).
- The hypothesis, written before any game, expected the lab drafter to win slightly where synergy has themes to
  count (Vintage, Synergy) and to be close on Twobert, where only the lean and the commit differ.
- Twobert came out level: 49.5% [45.7, 53.2].
- On Vintage and Synergy the point estimates lean the other way: **Forge's ranks 53.8% and 52.8%**. Vintage's
  lower end is 49.8%, and its game rate's lower end is 50.0%.
- That is a lean, not a result. No pooled test across cubes was registered, so none is read here.
- The forge-ranks seat is D439's approximation of Forge's pick function in the lab's terms, not Forge's code.

**Did the human-pick model's J114 loss replicate? Not as a verdict.**
- J114 found the human-pick drafter losing on Vintage at 47.8% [45.7, 49.9] over 2,000 matches.
- J134's replication used the same files and design on fresh seeds, at about a seventh of the size (300 matches a
  cube). It reads **51.3% [45.7, 57.0]**: NOT SHOWN, with its point on the other side of 50%.
- The two intervals overlap widely, and J134's ±5.7-point half-width could never have resolved J114's
  2.2-point effect. The power section said so before the run: HL could confirm J114 only if the edge were larger
  than J114 measured.
- So J114 stands as the better-powered measurement; J134 neither confirms it nor contradicts it.
- Synergy: 54.2% [48.7, 59.4], against J114's 50.7% [47.6, 53.8]. Both NOT SHOWN.

**Secondary, description only.**
- **Colour shares (main colours).**
  - FL: the two drafters' colour mixes are close.
    - Vintage: forge-ranks W 53.1 / U 61.1 / B 30.0 / R 33.6 / G 22.2%, against the lab's
      48.8 / 59.8 / 31.1 / 38.7 / 21.7%.
    - Twobert: both about 80% blue.
  - HL repeats J114's pattern: the human-pick model drafts more black and less green and blue than the lab
    drafter.
    - Synergy: B 44.5% against 18.7%; G 28.4% against 57.9%; U 54.2% against 63.5%.
    - Vintage: B 37.7% against 28.0%.
- **Lab deck score.** This is the lab drafter's own currency (the cube's ratings), not a measure of strength.
  - Forge's ranks scored nearly the lab's (Vintage 140.8 against 141.1; Synergy 132.7 against 134.2; Twobert
    107.9 against 108.9).
  - The human-pick model scored lower (Vintage 134.6 against 142.1; Synergy 123.1 against 136.9), as in J114.
  - Neither difference showed up in the games.
- **Forge-built decks:** 0 in every arm. Every pool reached a lab build.

**Evan's Twobert.** Forge 2.0.14 lacks 4 of its 180 cards, all from Reality Fracture: Flickering Hound, Null
Summoner, Twinned Vision and Primal Witchstalker. The lab drafts without them (`twobert_missing == 4`, checked in
the pilot and at the end), so each grid draft dealt 162 of the other 176. Twobert's verdict is about that
176-card cube.

**The Sonnet arm (LL): SKIPPED, by design.**
- `run3` printed "LAB_LLM_SPEND_OK is not 1" and exited 0 in 14 s. No API call was made in the run, and the
  pilot's LL folders ran on `llm:fake` (72 calls, 0 tokens).
- The job's estimate stands, from PR #144's one Haiku smoke (57,971 input and 6,610 output tokens a draft) at
  Sonnet 5.5's list price: **about $0.30 a draft, about $30 for the arm's 100 drafts**, with a $40 budget stop.
- At 100 matches the arm can only show a difference of about 10 points.
- Running it is Justin's call.

## Run health

| block | what | wall | notes |
|---|---|---|---|
| prepare + pilot | build, tests, `j134.py` self-test, 2 seeds of every folder (recorded), plain drafts, the read | 11:21:34 → 11:26:16 (4 m 42 s) | all 21 pilot checks PASS. Mean pilot game 4.3 s; 22 of 24 challenger pools differ from the plain draft |
| run1 | FL: 1,800 drafts and matches | 11:26:16 → 12:13:37 (47 m) | Vintage 400 s + 274 s, Synergy 711 s + 739 s, Twobert 374 s + 340 s |
| run2 | HL: 600 drafts and matches | 12:13:37 → 12:33:57 (20 m) | Vintage 156 s + 177 s, Synergy 516 s + 366 s |
| run3 | LL | 14 s | SKIPPED (spend not approved) |
| run4 | the read | 14 s | `drafters.json`, `report.md` |

- **Totals:** 2,400 drafts, every planned seed in both seats, 0 unpaired. 5,866 games, mean 4.15 s (median 1.87 s),
  18.3 turns.
- **Engine errors:** 2 matches (0.08%), each "a game thread would not stop after its timeout; the worker was
  restarted". One was in FA-Vintage (seed 815,000,053), one in HA-Synergy (seed 815,400,019). Both are left out
  of their arm and counted.
- **Timeouts:** 2 games, both in FB-Synergy, counted as draws; one of them drew a match.
- **Resources:** 7 workers throughout. Peak worker RSS 1.25 GB against 2.5 GB declared, 0 pressure events.
- **Against the estimate:** about 1 h 8 m of run blocks against the estimated ~51 min (37 + 14), mostly because
  Synergy games ran at 6.4–7.9 s against J112's 6.1 s.

## Read with Justin's 2026-10-17 amendment (context, not a verdict)

Every drafter compared here is a fixed procedure that decides which decks exist before a game is played.
- The lab drafter and its forge-ranks variant are hand-written weights and commit rules.
- The human-pick model is a model of what humans pick, not of what wins, wrapped in a hand-chosen line rule and
  fallback.
- The LLM seat is a prompt.

J134 says the differences among these rules move the match win rate by less than these sizes can see (about ±4
points a cube for FL, ±6 for HL). It does not say which cards win together. Justin's amended census (HEARTBEAT,
2026-10-17 01:30) builds decks directly from a band's pool at random colour makeups and plays them deck against
deck, with no drafter. That will produce deck-level game data across the whole colour spectrum. A drafter could
later be *learned* from that data: card value in the context of the deck it joins and the deck it faces. It
would not be one more hand rule to compare. This is context for the plan, not a reading of J134's numbers.

## Collected

`drafters.json`, `report.md`, `metrics.json`, `checks.txt`, `pilot-checks.txt`, `pilot-metrics.json`, STATUS, the
step logs, and `run.json`. The collected `run.json` is HA-Vintage's: the human-pick drafter at seat A, 152 of 180
cards covered, the fallback line −3.785 + 0.0587·rating, r 0.53, identical to J114's.

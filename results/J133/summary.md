# J133 — Cube populations compared for balance: Synergy v2, Synergy v1, Omega, Fair Fight, Synergy v2 on 17 lands

Written by the PC session, 2026-10-16, from `compare.json`, `compare.md`, `checks.txt`, `metrics.json`,
`events.jsonl`, STATUS and the step logs. The colour-pair table at the end was read from the run folders
(`var/lab-j133/compare/runs/*/drafts.jsonl`, no engine). Job 09:36:51 → 11:21:34 EDT (1 h 45 m, pilot included),
7 workers (6 for two short spells), **every pilot check and every final check PASS**. Pinned mtg-table@0c9bab7
(PR #147 merged: `tools/cubelab.sh compare`, D441) and ForgeCoach@3e3b007 (Synergy v2, sha256 checked).

## Measurement job, no verdict rule

D441 fixed eleven measures before any draft. No `--rule` was given, so this summary ranks and reports intervals. It
calls no population "better". Each population drew 600 grid drafts on **the same seeds** (833,000,001–600, asserted).
Every game was best of three, Default vs Default, using the lab builder.

- **Populations:**
  - `synergy` is ForgeCoach's v2 document on Forge's ranks.
  - `synergy_v1` is mtg-table's `cubes/synergy-cube-180.md` with its ratings file. That file is v1's Forge ranks
    unedited, so the two versions are rated alike.
  - `omega` is on Forge's ranks.
  - `fair_fight` uses its ratings file.
  - `synergy_17` is v2 with `sixteenLandsAt=0`. It has the same deals and picks as `synergy`; only the decks differ.
- **Intervals:** 95%, 1,000 draft-clustered bootstrap replicates. The seeds are resampled jointly across
  populations, so each difference is paired.
- **Multiplicity:** there are 110 difference intervals (11 measures × 10 pairs). About 5 would exclude 0 by chance
  if nothing differed at all. A lone small difference resting on a handful of events should be read with that in
  mind.

### The five measures per population (estimate [95% interval])

| measure | omega | fair_fight | synergy (v2) | synergy_v1 | synergy_17 |
|---|---|---|---|---|---|
| **1. card flatness**, true SD, pts | **0.00** [0.00, 3.01] | 3.59 [1.51, 5.03] | 7.83 [6.37, 9.35] | 7.50 [5.99, 8.87] | 8.39 [6.86, 9.95] |
| **2a. pair spread**, max − min, pts | **13.7** [6.3, 22.2] | 24.0 [17.2, 31.9] | 41.6 [32.9, 51.9] | 43.4 [34.6, 52.7] | 42.3 [32.9, 53.3] |
| 2b. pairs within ±5 of 50% | **80%** [50, 90] | 40% [20, 60] | 10% [0, 30] | 0% [0, 30] | 20% [0, 30] |
| **3a. draws** (timeouts incl.), % of games | 0.00 | 0.00 | 0.28 [0.07, 0.56] | 0.07 [0.00, 0.21] | 0.14 [0.00, 0.35] |
| 3b. timeouts, % of games | 0.00 | 0.00 | 0.28 [0.07, 0.56] | 0.00 | 0.14 [0.00, 0.35] |
| 3c. game length, turns | **18.39** [18.11, 18.67] | 21.74 [21.40, 22.10] | 19.30 [18.99, 19.59] | 19.29 [19.01, 19.58] | 19.36 [19.06, 19.64] |
| **4a. lands** | 16.984 | 16.867 | 16.391 | 16.352 | 17.000 |
| 4b. colours (main + splash) | 2.136 | **2.696** | 2.162 | 2.142 | 2.133 |
| 4c. two main colours | 100% | 100% | 100% | 100% | 100% |
| 4d. splash | 13.6% [11.6, 15.4] | **69.6%** [67.0, 71.8] | 16.2% [14.3, 18.3] | 14.2% [12.4, 16.1] | 13.3% [11.5, 15.3] |
| **5. first-pick top-10 share** | **11.7%** [11.5, 11.9] | 12.6% [12.4, 12.8] | 12.8% [12.6, 13.0] | 12.8% [12.6, 13.0] | 12.8% [12.6, 13.0] |

ForgeCoach's own chi-square reading of card flatness agrees:
- Omega 0.00 [0.00, 3.22] and Fair Fight 3.59 [2.59, 5.33] read "unclear" (cannot be told from flat).
- All three Synergy populations read "uneven" (7.5–8.4, intervals wholly above 3).
- The cards with 10+ decisive games numbered 155 to 165 per population.

## The differences whose interval excludes zero

**Flatness (card true SD):**
- **Omega is flatter than each Synergy population** by 7.5–8.4 points:
  - vs synergy −7.83 [−9.08, −4.27]
  - vs synergy_v1 −7.50 [−8.71, −4.08]
  - vs synergy_17 −8.39 [−9.78, −4.85]
- **Fair Fight is flatter than each Synergy population** by 3.9–4.8 points:
  - vs synergy −4.24 [−6.77, −2.12]
  - vs synergy_v1 −3.91 [−6.47, −1.65]
  - vs synergy_17 −4.80 [−7.54, −2.58]
- Omega vs Fair Fight is not shown: −3.59 [−4.83, +0.23].
- No two Synergy populations differ.

**Colour-pair spread:**
- **Omega's is narrower than each Synergy's by 28–30 points** (e.g. −27.9 [−41.8, −14.8] vs synergy).
- **Fair Fight's is narrower by 18–20** (e.g. −17.6 [−30.0, −6.2] vs synergy).
- Omega vs Fair Fight is not shown: −10.2 [−21.2, +0.7].
- **Pairs within ±5 of 50%:** only Omega's lead over the three Synergy populations is shown (+60 to +80 points).
  Fair Fight's +20 to +40 is not shown.

**Draws and timeouts:**
- Synergy v2 drew more often than Omega and Fair Fight (+0.28 points, 4 timeouts in 1,440 games against 0).
- Synergy v2 also timed out more often than v1 (+0.28 [+0.07, +0.56]).
- All of these rest on four events.

**Game length:** every difference except those among the three Synergy populations is shown.
- Omega is shortest: 0.9 turns shorter than Synergy and 3.35 shorter than Fair Fight.
- Fair Fight is longest: 2.4 turns longer than Synergy.

**Deck build:**
- **Lands:** every difference is shown. They are set by the builder: Synergy builds more 16-land decks because its
  curve is low.
- **Colours and splash:** Fair Fight's decks splash far more than any other: +53 to +56 points, 2.70 colours against
  2.13–2.16. Synergy v2 splashes 2.8 points more than synergy_17 [+1.3, +4.5].
- **Two main colours:** no population built a three-colour deck.

**First-pick concentration:**
- Omega's is lower than every other population's by 0.9–1.1 points.
- The rest do not differ.
- synergy and synergy_17 read exactly 0.0 [0.0, 0.0] apart, as they must with the same drafts. This is a
  consistency check that passed.

## Synergy v2 against v1 (the six swapped cards)

v2 has Yawgmoth, Reanimate and Murderous Redcap. v1 has Ledger Shredder, Man-o'-War and Skullclamp instead.
**None of the balance measures tells them apart:**

| measure | v2 − v1 |
|---|---|
| card flatness | +0.33 [−1.60, +2.40] |
| pair spread | −1.8 [−15.7, +11.8] |
| pairs within ±5 | +10 [−20, +20] |
| game length | +0.01 turns |
| first-pick concentration | 0.0 |

Two differences are shown, and both are small:
- **Lands:** +0.039 [+0.006, +0.071], slightly more 17-land builds.
- **Timeouts:** +0.28 points (4 against 0).

This is what the hypothesis expected from three swaps in 180 cards. It agrees with J135, where two 300-draft batches
of the same v2 list differed by more than this.

## Did forcing 17 lands change anything?

- **Lands:** they went to exactly 17.000, 0.61 more than v2 [+0.585, +0.636], by construction.
- **Balance measures:** nothing moved.

| measure | synergy − synergy_17 |
|---|---|
| card flatness | −0.56 [−2.30, +1.26] |
| pair spread | −0.7 [−12.3, +10.2] |
| pairs within ±5 | −10 [−20, +20] |
| game length | −0.05 turns |

- **Side effect:** the only other shown change is a slightly smaller splash share, −2.8 points, colours −0.03. With
  23 spells instead of 24, the builder splashes a little less.
- **Consistent with J121/J124:** J124's 16-minus-17 contrast was −0.6 points [−2.1, +0.9]. The land count, at least
  between 16 and 17, is not what makes this cube balanced or unbalanced.

## Where Omega and Fair Fight sit

**Omega** (powered) is the flattest by every balance measure here:
- card spread indistinguishable from noise (0.00, interval to 3.0)
- the narrowest pair spread (13.7)
- 8 of 10 pairs within 5 points of 50%
- the lowest first-pick concentration
- the shortest games

**Fair Fight** sits between Omega and Synergy on flatness (3.6) and pair spread (24.0), and is told apart from
Synergy on both but not from Omega. Its games are the longest (21.7 turns). Its decks splash in 70% of builds, which
no other cube comes near. That is a fact about how the lab builder reads this cube's ratings and fixing; whether it
says anything about the cube itself is not settled here.

**Synergy**, in all three forms, is "uneven" on cards (7.5–8.4 true SD). Its colour pairs spread over 42–43 points.

| population | colour pairs, decisive-game win rate (games), descriptive only |
|---|---|
| omega | WB 58.0 (243) … UG 44.3 (210); eight pairs between 47 and 52 |
| fair_fight | WG 67.4 (132), WR 62.8, RG 60.8 … UB 45.2 (504), UR 43.4 (534) |
| synergy (v2) | WR 70.6 (136), WB 69.8 (288), WG 63.7, WU 59.4 … UG 34.7 (594), RG 29.3 (58), UR 29.0 (245) |
| synergy_v1 | WR 73.8 (122), WB 66.5, WG 65.2, WU 64.1 … UR 38.2 (293), UG 30.3 (702) |
| synergy_17 | WB 71.3 (300), WR 70.6, WG 65.9, WU 56.7 … UG 33.9, UR 30.5, RG 29.0 (62) |

In every Synergy population the four white pairs lead (57–74%) and blue's UB, UR and UG trail (29–43%). J135 found
the same: the imbalance is in the colours. It survived the v2 swaps and the land change unchanged.

## What this says about "balance", as these measures define it

Balance here has three parts:
- the cards' win rates spread little beyond what noise gives (flatness);
- the colour pairs land near 50% (pair spread and the within-5 share);
- the drafters do not converge on the same few first picks (concentration).

By all three, the cubes order the same way: **Omega, then Fair Fight, then the three Synergy populations**. The
Omega and Fair Fight gaps to Synergy are well outside noise. The gap between Omega and Fair Fight is inside it.

Within Synergy, neither the v2 card swaps nor forcing 17 lands moved any balance number. What separates Synergy from
the others is its colours: white pairs win about two games in three, and blue pairs about one in three. A Synergy v3
aimed at balance would have to move that colour gap. Single-card swaps and land counts have not.

Two cautions:
- **The AI is the player.** This is balance as Forge's Default AI, drafting with the lab's drafter, experiences it.
  A cube whose power is in hard-to-pilot cards could read flat here and play otherwise for people.
- **Flatness is not quality.** Omega reading flattest says its strong cards are spread evenly across colours, not
  that its games are better.

## Run health

| | |
|---|---|
| drafts | 3,000 (600 × 5), seeds 833,000,001–600 in every population |
| games | 7,299; 7,292 decisive, 7 draws, 6 timeouts (synergy 4, synergy_17 2) |
| engine errors | 4 (rate 0.001; compare.md counts 3 drafts with an error: synergy 2, synergy_17 1) |
| game time | mean 5.26 s, median 1.95 s, 19.6 turns, 268 ms a turn |
| workers | 7, peak 2.30 GB a worker; four pressure events 09:48–10:02, twice dropping to 6 and back within 5 min |

Wall time per population (each run in turn, 7 workers; 6,025 s of runs in all, about 1,790 drafts an hour overall):

| population | matches | wall per draft | drafts per hour |
|---|---|---|---|
| omega | 586 s | 1.0 s | 3,690 |
| fair_fight | 816 s | 1.4 s | 2,640 |
| synergy | 1,641 s | 2.7 s | 1,315 |
| synergy_v1 | 1,477 s | 2.5 s | 1,460 |
| synergy_17 | 1,495 s | 2.5 s | 1,440 |

The job took 1 h 45 m with the pilot, against an estimate of 2–2.5 h. The pilot ran 6 drafts a population on 3
workers and passed every check, `merged == 1` included. Outputs are `compare.json` (strict, numbers only) and
`compare.md`, both collected. The run folders stay in the lab clone under `var/lab-j133/compare/runs/`.

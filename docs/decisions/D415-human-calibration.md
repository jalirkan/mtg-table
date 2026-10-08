## D415 — The win chance recalibrated on human games: a Platt fit to the frozen r17 evaluator on 17Lands' dev half, judged on the test half by a rule written before its run, with the human/Forge ratio a coach would need

*Branch `c/human-calibration`. PC job J113 (B3).*

**2026-10-08**

**Context.** The outside exam (D359, J063) passed: on 17Lands' Powered Cube human games the
reduced `r17` evaluator beats the best simple rule by +0.0302 log-loss [+0.0268, +0.0336].
Its reliability table was too extreme, though. A line of observed against predicted log-odds
had a slope of about 0.82, so human games are less decided than the model says. That slope
came from J063's test-half table, so the idea of a correction came from the same data. It also
mixed two things:

- **the tracker users' edge:** they won 54% of the games;
- **r17's own over-confidence:** on Forge's own held-out games, its "0.957" came true 0.895
  of the time.

v1 and v2, the models the coach serves, are calibrated on Forge's games (gate 1: ECE 0.006).

**Decision.**

1. **The model is r17, frozen** (J063's `r17-vintage-n1.json`). The job records its sha256.
   v2 cannot be fed honestly from 17Lands. The table below lists v2's inputs against what a
   replay row holds:

| v2 input (D305 schema, 243 board + 731 x 17 card cells) | From 17Lands | How |
|---|---|---|
| turn, round, whose turn, viewer priority | yes | half-turn order from `on_play`; priority 1 by construction |
| phase one-hot | no | the snapshot is end of turn; v2 learned main and combat states only |
| stack (4), combat (9) | no | 0 would be right in a second main phase, but this is not one |
| life (2), hand size (2) | yes | `eot_*_life`, `eot_*_cards_in_hand` |
| library (2) | guessed | 40 − 7 − mulligans − cards drawn; the opponent's deck size is unknown |
| graveyard (2) | guessed | from cast instants and sorceries, creatures killed, discards; misses sacrifices, counters, mill |
| exile, command, poison, player counters, mana pool (6 each) | no | |
| lands (2) | yes | `eot_*_lands_in_play` |
| untapped lands and their colours (14) | guessed | lands − mana spent; colours from the type line |
| land drop, lands and spells this turn (6) | yes | per-half-turn `lands_played`, `*_cast` |
| abilities and game totals (live-unsafe, not read by v2) | — | |
| creatures, artifacts, enchantments, planeswalkers, tokens (10) | yes | `cards.csv` types, rarity `token` |
| power, toughness, max power, untapped power, token power (10) | no | `cards.csv` has no P/T |
| untapped creatures (2) | guessed | creatures − attackers this turn, ignoring vigilance |
| damage, +1/+1, −1/−1, other counters, loyalty, attached, face-down (14) | no | |
| twelve keywords per side (24) | no | |
| types block: battlefield (20), my hand (10) | yes | the user's hand cards are listed; mana value and types from `cards.csv` |
| types block: graveyards, exile, stack (60) | no or guessed | |
| cards: my hand, battlefield | partly | tapped vs untapped unknown; sick = cast this turn |
| cards: graveyard, exile, stack, attacking, blocking | no or guessed | |
| off-cube cards | lossy | 309 of the Powered Cube's 545 cards (its `deck_` columns) are outside the 731-card vocabulary and fall in `<other>`, a column constant in v2's training |

   Of v2's 243 board inputs, about 56 (23%) can be read exactly, 40 (16%) guessed, and the
   other ~147 (60%) are missing. The missing ones include P/T and keywords, which v2 leans on. D359 already
   rejected scoring a full model on masked inputs. A calibration fitted to them would
   correct the mask, not the number the coach shows on a live board. So the job uses r17.
2. **The population.** PremierDraft's file, turn ≥ 3, the final half-turn dropped,
   vocabulary share ≥ 0.5 (D359's filters), and **both perspectives**: each position appears
   from either side with opposite labels. The users' 54% then cancels, and the intercept says
   only how far the model is from symmetric. D359's hashed halves are used again: the fit is
   on `dev`, the verdict on `test`.
3. **The transform.** p' = sigmoid(a + b·logit(p)). The primary fit is global (two numbers).
   A per-turn-band fit (3–4, 5–8, 9–12, 13–16, 17+, protocol turns) and a slope-only
   temperature are reported beside it.
4. **Relative to Forge.** The same fit is made on our r17 dataset's validation split (never
   its test split). The **relative transform** is slope b_h/b_f and intercept
   a_h − b_h·a_f/b_f. It is what a model calibrated on Forge's games would need on human
   games, and applied after Forge's fit it gives the absolute transform exactly. Its interval
   comes from independent bootstraps: 17Lands games for the human fit, our deck pairs for
   Forge's.

**The rule, written before its run** (`CALIB_RULE` in `tools/ml/human_calib.py`; no flag
changes it):

- **PASS** when log-loss(uncalibrated) − log-loss(global Platt) > 0 on the test half and the
  lower end of its 95% percentile interval is above 0. The interval comes from 2,000
  resamples over test games, seed 20261008. The test half needs at least 2,000 games and
  10,000 rows; with fewer, the verdict is FAIL (underpowered). A partial download, a
  `--max-games` sample, another file, rows from one perspective or a stricter filter give
  NO VERDICT.
- **Form:** per-band is recommended only when log-loss(global) − log-loss(bands) has its
  interval above 0. Otherwise the global fit is.
- **Coach use:** the params file recommends the relative transform for v1/v2 only when all
  of these hold:
  - the verdict is PASS;
  - the Forge-side fit has at least 2,000 rows and 20 deck pairs;
  - both slopes are positive;
  - the relative slope's 95% interval excludes 1.

  Otherwise it says `none`, with the reason.
- **Reported, no verdict:**
  - ECE with its interval;
  - Brier;
  - accuracy and log-loss by turn band for the uncalibrated, Platt and per-band
    predictions, the prior, and logistic rules on the life, hand-size and non-land permanent
    differences, alone and together (fitted on the same `dev` half);
  - the user's rows with their own fit (its intercept is the skill shift);
  - TradDraft's file, all games, with PremierDraft's fit applied.

**What the coach may take from it.** The params JSON (`mtgtable-winchance-calibration`,
version 1) holds the absolute fits for r17, the relative fits, the recommended form and the
coach-use line. Wiring it into ForgeCoach is a later change, and only for games against a
human or the search AI. Two caveats go with it:

- the positions are end-of-half-turn snapshots, not the decision states the coach shows;
- the human effect is measured through r17. A v2 check on people's own games needs D369's
  human test set to reach about 30 games.

**Rejected.**

- *Calibrating v2 on masked 17Lands inputs* (point 1).
- *Fitting on the user's rows only.* The skill shift would enter the intercept and pull
  every number toward the tracker users.
- *Retraining r17 for this.* The question is the frozen model's calibration. A new model
  would also need a new outside exam.
- *Isotonic regression.* It has more freedom than 150,000 correlated rows from about 50,000
  games pin down, and it is harder to carry into the coach than two numbers.

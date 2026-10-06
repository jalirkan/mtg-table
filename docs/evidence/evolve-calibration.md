# Evolve's discovery test and J039's regression to 0.50 (D376)

*Branch `c/review-fixes`, 2026-10-04. The independent methods review (§2.7, §4 item 1) found
J039's discovery p-values "incompatible" with its confirmation outcomes. This file is the
read-only investigation the review asked for. Sources: `pc-results` `results/J039/`
(`changelog.md`, `run1.log`, `stats.json`), `tools/cubelab/evolve.ts`, `evolve-run.ts`,
`explore.ts`, `evolve-stats.ts`. The simulation is `docs/evidence/evolve-calibration-sim.py`.*

## Verdict

**Not an accounting bug, and not a miscalibrated p-value. It is the winner's curse on a
confounded null: `dominant-win` tests a card against the batch's mean card win rate (about
0.50), not against the colour its decks play, so in a cube where red decks win 54% it
flags red cards as a class.** The eight generation-3 candidates (six red, one white, one
colourless artifact) are one correlated event, not eight: they share the same red decks,
in discovery and again in confirmation. Their confirmation batch (c3) happened to have
red at 0.488, its lowest value in the run. Against their own colour, the candidates were
never much above chance: +0.4 to +5.7 points, z 0.3 to 2.5. The p-values mean what they
say for the null they test. That null is the wrong question for a cut.

Consequence: until the null is colour-adjusted, `dominant-win` cuts measure a colour's
strength, not a card's. In this setting about 7% of colour-driven candidates confirm, and
about 0.2 such cuts happen per generation. J039's one cut, Fable of the Mirror-Breaker in
generation 4, is consistent with that: 0.566 in its confirmation batch, against red's
0.547 there. The review's recommendation 8 stands: hold evolve cuts and D360's raises.
The fix is a rule change and needs its own pre-registered decision. It is not made here.

## 1. Do discovery and confirmation count a card's games the same way?

Yes. Both go through one function, `evolve-run.ts` `readBatch` → `evolve.ts`
`batchStats` → `cardStats(buildMeta(...))`, with these properties:

- **Played decks.** A card's games are the decisive games of the played decks that hold
  it. These are the lab builder's decks (`played: 'lab'`), the same in both batches.
- **Seats and mirror pairs.** Each draft is one best-of-three match between its two
  drafters (seats A and B). Every decisive game counts once for the winner's cards and
  once for the loser's. There are no mirror pairs in evolve. `deckGamesOf` reads the two
  decks of every draft the same way in both batches.
- **Exploration (D356).** Discovery explores (J039 `--explore on`). Its game numbers
  read the plain drafts only, 1,342–1,423 of 2,000, a coin-chosen subset. Confirmation
  never explores (`labRun(..., false)`), so all its drafts are plain. A coin-chosen
  subset is not biased.
- **AI-limited cards and lands.** These are excluded from the family in both batches by
  the same `evolveCards` / `discover` code.
- **Bridges.** Evolve plays no bridge drafts.
- **Null and design effect.** Each batch's null boundary is its own
  `metaDoc.sample.shrinkage.mean`. Each batch's design effect is its own `batchDeff`.
  The size filter `rate ≥ mean + dominantMargin` is the same.

The one asymmetry is size. A confirmation batch is 300 drafts against discovery's 1,400
plain ones, so its card counts are about a fifth as large. That is by design, and it
lowers power, not calibration.

## 2. Is the batch-to-batch variation larger than the binomial?

No. The test used is a χ² across J039's four 2,000-draft discovery batches (d1–d4, all
drafts) and its two confirmation batches (c3, c4), parsed from `run1.log`:

| grouping | between-batch χ² (cluster variance) | binomial χ² | df | p |
|---|---|---|---|---|
| colour (W U B R G) | 11.1 | 11.3 | 15 | 0.75 |
| colour pair (10) | 32.6 | 32.5 | 30 | 0.34 |
| confirmation (c3+c4) vs discovery pooled, by colour | 2.6 | | 5 | 0.76 |
| the same, by pair | 8.4 | | 10 | 0.59 |

The deck-level design effect per batch is 1.014–1.026 in discovery, 1.021 in c4 and
1.071 in c3. Archetype win rates do not drift between batches beyond binomial noise.
"Batch-level archetype correlation" is ruled out as the cause, and so is an
engine-load effect large enough to move colours. Per-game load was not logged in J039,
so a smaller per-game effect cannot be ruled out (see J072 in §6). The colours
themselves are not balanced: red wins 0.528–0.547 in every discovery batch, green
0.481–0.495 and blue 0.476–0.490.

## 3. The candidates against their own colour

The baseline is the candidate's colour (or pair, for a two-colour card) in the same
batch, over all of that batch's drafts. The excess is the card's rate minus that
baseline. z is the excess over √(0.25/n).

| gen | card | colour | discovery | colour in d | excess (z) | confirmation | colour in c | excess |
|---|---|---|---|---|---|---|---|---|
| 3 | Fable of the Mirror-Breaker | R | 757/1,341 = 0.565 | 0.547 | +0.018 (1.3) | 140/296 = 0.473 | 0.488 | −0.015 |
| 3 | Fury | R | 0.551 | 0.547 | +0.004 (0.3) | 0.504 | 0.488 | +0.015 |
| 3 | Goblin Rabblemaster | R | 0.574 | 0.547 | +0.027 (1.6) | 0.503 | 0.488 | +0.014 |
| 3 | Goldspan Dragon | R | 0.563 | 0.547 | +0.017 (1.0) | 0.456 | 0.488 | −0.033 |
| 3 | Hellrider | R | 0.604 | 0.547 | +0.057 (1.9) | 0.540 | 0.488 | +0.051 |
| 3 | Ragavan, Nimble Pilferer | R | 0.554 | 0.547 | +0.007 (0.5) | 0.508 | 0.488 | +0.019 |
| 3 | Baneslayer Angel | W | 0.561 | 0.508 | +0.053 (2.5) | 0.514 | 0.533 | −0.019 |
| 3 | Sword of Fire and Ice | — | 0.554 | (artifact, mostly in red decks) | | 0.484 | | |
| 4 | Fable of the Mirror-Breaker | R | 0.551 | 0.540 | +0.011 (0.8) | 179/316 = 0.566 | 0.547 | +0.020 |
| 4 | Seasoned Pyromancer | UR | 0.559 | 0.524 | +0.035 (1.9) | 0.511 | 0.581 | −0.071 |
| 4 | Young Pyromancer | UR | 0.639 | 0.524 | +0.115 (2.5) | 0.500 | 0.581 | −0.081 |

- Against their colour, no candidate stands out. The two largest excesses are 2.5 SE
  (Baneslayer Angel, Young Pyromancer), and these eleven were picked as the top of about
  394 tests.
- In confirmation the candidates track their colour's rate in that batch, within noise.
- **The review's "pooled ≈ 0.496 over ~1,650 games, 4–5 SE from 0.55"** counts each
  candidate's games as independent. They are not: the six red candidates' 1,266
  confirmation card-games come from the same red decks of c3. Red had 428 decisive
  games there. Against red's discovery rate (0.547) and that effective size, c3's 0.488
  is about 2.4 SE low. Against red's rate pooled over the whole run (0.537), it is
  about 2.0 SE low. That is one unlucky draw that every red candidate shares.
- **"Eight p ≤ 2e-3 results out of 394 tests is a 1e-8 event under the null."** That
  holds only if the cards have no effect relative to 0.50. The red cards do: their
  decks win 54%. Under the test's own H0 (card rate ≤ batch mean), these rejections
  are correct.

## 4. Simulation: the discovery rule under no card effect

`docs/evidence/evolve-calibration-sim.py` replays `dominant-win` discovery and
confirmation on simulated generations:

- **Discovery:** an exact binomial on counts divided by the design effect, against the
  batch mean; Benjamini–Hochberg at q 0.1 over a family of 394; the size filter mean +
  0.05.
- **Confirmation:** 300 fresh drafts, Holm at 0.05, the same size filter.

The matches are J039's own: who drafted which colour pair against whom. A card joins a
deck of an eligible pair at its generation-1 inclusion rate. A deck has a random
strength of sd 0.25 logits, which gives J039's design effect of about 1.03. **No card
has an effect of its own.** 1,000 generations, seed 7, 1,400 plain drafts each:

| scenario | design effect | tests at p ≤ 0.002 / gen | candidates / gen | P(≥ 8 candidates) | candidates' discovery rate | their confirmation rate | confirmed |
|---|---|---|---|---|---|---|---|
| **null**: every pair equally strong | 1.026 | 0.26 | 0.04 | 0.000 | 0.591 | 0.494 | 0 of 42 |
| **colour**: pairs as strong as J039 says (BR 0.58 … UG 0.45) | 1.030 | 4.38 | 3.09 | 0.150 | 0.571 | 0.535 | 207 of 3,090 (7%) |

In the colour scenario, 2,766 of the 3,090 candidates are mono-red cards; most of the rest
are red or white golds.

*(D377 note.)* The script now draws each deck's cards before its games, so a planted card
can change its deck's strength. That moves the random stream. The same command now prints
3.27 candidates a generation, 0.163 at 8 or more, a discovery rate of 0.571 and 248
confirmed for the colour scenario's mean rule (§7). The numbers above are from the D376
version of the script, and they agree within simulation noise.

- **Under a true null the test is calibrated, even conservative.** At the deck level,
  BH and the size filter give about one false candidate per 25 generations, and
  confirmation catches it.
- **With J039's colour strengths and no card effect at all**, the rule finds about 3
  candidates a generation, nearly all red, and 8 or more in 15% of generations. J039's
  generation 3 had 8, generation 4 had 3. The candidates' discovery rate is 0.57; J039's
  were 0.55–0.60. In confirmation they fall to their colour's rate, 0.535, and 7%
  confirm. J039's c3 then drew red low: 0.488 against a simulated per-batch sd of about
  0.011.
- **The test's false-positive rate depends on what counts as a false positive.**
  - For "the card wins more than the average card", the per-test rate at p ≤ 0.002 is
    about 4.4/394 ≈ 1.1%. All of those are true positives for that null.
  - For "the card is better than its colour", every one of them is false: 17 times the
    null scenario's 0.26 a generation, and 77 times its candidates (3.09 against 0.04).
    About 0.2 colour-driven cuts a generation follow (3.09 × 0.07).

## 5. Winner's curse

Selection on the maximum explains the rest of the gap. Among about 394 tests, the
candidates are the cards whose sample rate came out highest, so their discovery rates
overstate even their colour-inclusive truth. In the colour scenario that truth is 0.535
and the selected rate is 0.571: about 3.5 points of curse. In J039 the curse is about
1–3 points over the colour baseline for most candidates (§3), and 5–11 points for the
small-sample ones (Hellrider 278 games, Young Pyromancer 119). Neither the design effect
(1.0–1.03, correctly estimated, §2) nor BH can remove this. BH controls the false
discovery rate under the stated null, and the stated null is false here.

## 6. What follows (recommendations; nothing in the cut rule changes in this branch)

1. **Colour-adjust the dominant-win null.** p0 for a card should be the expected rate
   of the decks that played it: the mean, over its decks' games, of their colour pair's
   win rate in the same batch, with the card's own games left out. An alternative is a
   paired A/B with the card swapped on common seeds, which J064 already does for
   ratings. This is a rule change, so it needs a pre-registered decision before any run
   uses it.
2. **Hold evolve cuts and D360's raises** until (1) lands (review rec. 8). J039's
   generation-4 swap (Fable out, Gut in) is a colour cut, not a card verdict.
3. **J072** (`scratchpad/J072-evolve-calibration.md`, not pushed to `pc-jobs`): two
   disjoint-seed Omega batches with nothing changed. Its reader measures directly what
   §2 and §4 estimate: the between-batch SD of card and pair win rates against the
   binomial, the realised design effect, and how many cards pass discovery by chance.
   With the D376 stamps it also gives the first per-game AI timeout and worker-load
   numbers.

## 7. The colour-adjusted null (D377)

*Branch `c/colour-null`, 2026-10-04.* §6's first recommendation, built and simulated before
any run uses it. The rule is `tools/cubelab/colour-null.ts`; the simulation is the same
script, rule `colour`, on the same J039 extract.

**The rule.** A card's null `p0` is the games-weighted mean, over its decks, of the deck's
colour pair's win rate in the same batch. Each pair's rate:

- leaves out **both decks of every match the card played**. Leaving out only the card's own
  decks was tried first, and it is not enough. In a mirror match the opponent's games are in
  the baseline and anticorrelated with the card's. The null z's sd came out at 1.06, and the
  share at p ≤ 0.002 at 1.7× nominal (0.0035 against 0.002). Leaving out the whole matches
  brings the sd to 0.98 and the share to 0.0022;
- is shrunk toward the batch's deck mean by 20 pseudo-games (`SHRINK_K`, as in meta.ts).

The test is one-sided normal on `(rate − p0 − 0.5·deff/n) / sqrt(p0(1−p0)·deff/n + se0²)`.
`se0` is the baseline's own standard error, and the half win is a continuity correction (the
exact binomial the old rule uses counts the point mass). The size filter is
`rate ≥ p0 + dominantMargin`. Confirmation runs the same rule on its own batch. D357's
pooling sums the attempts' effective excesses and both variances.

**Simulation** (1,000 generations, seed 7, 1,400 plain drafts a generation, J039's matches,
deck sd 0.25; `planted` is the colour scenario plus 12 cards that raise their deck's win
probability by +0.05, +0.10 or +0.15, four each, drawn once with seed 2026 from the cards
played often enough to test):

| scenario | rule | share of no-effect tests at p ≤ 0.05 / 0.01 / 0.002 | z sd | false candidates / gen | P(≥ 1 false) | false cuts in 1,000 gens |
|---|---|---|---|---|---|---|
| null | mean (D331) | 0.045 / 0.009 / 0.0016 | 1.00 | 0.022 | 0.019 | 1 |
| null | colour (D377) | 0.040 / 0.007 / 0.0014 | 0.97 | 0.034 | 0.032 | 1 |
| **colour** | mean (D331) | 0.137 / 0.065 / 0.031 | 1.44 | **3.27** | 0.61 | **248** |
| **colour** | **colour (D377)** | **0.050 / 0.010 / 0.0022** | **0.98** | **0.053** | **0.048** | **2** |
| planted | mean (D331) | 0.268 / 0.193 / 0.153 | 3.47 | 23.1 | 1.00 | 6,106 |
| planted | colour (D377) | 0.059 / 0.014 / 0.0037 | 1.04 | 0.65 | 0.46 | 2 |

- **Under "colours matter, cards don't", the colour null is at nominal.** At each level the
  per-test share is the level itself. False candidates fall from 3.27 a generation to 0.05.
  P(any false candidate) is 0.048, under BH's q of 0.1. Two false cuts happen in 1,000
  generations, against D331's 248. The remaining false candidates are spread over the
  colours, not concentrated in red.
- **Under a true null it is as calibrated as the old rule**, slightly conservative.
- **With planted effects**, the colour null's false candidates rise to 0.65 a generation.
  That is BH doing what it promises: with about 8.8 true discoveries a generation, its bar
  rises, and the false share of candidates is 0.65 / 9.5 ≈ 7%, under q. The mean rule's
  23 false candidates are the strong colours again, inflated by the planted cards' decks.
  The no-effect z sd of 1.04 in this scenario is the planted cards' decks (they raise the
  deck-level design effect to 1.14); it is not the rule.

Planted cards, discovered / cut (fraction of generations):

| planted | mean (D331) | colour (D377) |
|---|---|---|
| +0.05 (4 cards) | 0.15 / 0.01 | 0.47 / 0.05 |
| +0.10 (4 cards) | 0.70 / 0.30 | 0.74 / 0.22 |
| +0.15 (4 cards) | 1.00 / 0.68 | 0.99 / 0.55 |
| blue planted cards (Morphling +0.05, Consecrated Sphinx +0.05, Jace +0.10) | 0.00 / 0.00 each | 0.74 / 0.09, 0.70 / 0.09, 1.00 / 0.52 |

- **It still finds planted effects.** Discovery power is equal or higher at every size, and
  much higher for a good card in a weak colour, which the mean rule cannot see (blue pairs
  win 0.45–0.49).
- **Confirmation is weaker.** The cut rate at +0.10 is 0.22 against 0.30, and at +0.15 0.55
  against 0.68. A 300-draft confirmation batch must estimate the card's pair as well as the
  card, and the colour null asks for 5 points over the card's colour rather than over 0.50.
  The mean rule's higher cut rate comes from white cards in strong pairs: its +0.15 white
  cards are cut every generation, and its blue cards never.
  `confirmPlan` now sizes for the baseline's variance (`baselineInflation`), but the batch
  stays capped at `confirmMaxDrafts` (300). Raising the cap is a separate knob decision, not
  made here.

A TypeScript version of the same check runs in the web suite
(`web/test/cubelab-colour-null.test.ts`). It uses a synthetic five-pair cube with strong red
pairs, through the real `colourBaselines`, `discover` and `confirmCandidates`. Over twelve
batches the mean null flags red cards in every batch, and the colour null flags at most
three no-effect cards in all twelve. A planted blue card is found, then confirmed.

## Reproduce

```bash
git fetch origin pc-results
git show origin/pc-results:results/J039/run1.log > run1.log
python3 docs/evidence/evolve-calibration-sim.py extract run1.log matches.json
# evolve-calibration-cards.json (committed): J039 generation 1's stats.json cards (name, inDecks)
#   with the Omega cube's colours and land flag
python3 docs/evidence/evolve-calibration-sim.py run matches.json docs/evidence/evolve-calibration-cards.json --gens 1000 --seed 7
#   rules mean (D331) and colour (D377), scenarios null, colour, planted (§4 and §7); about 50 s
python3 docs/evidence/evolve-calibration-sim.py hetero matches.json   # §2's table
```

## D473 — a library-wide card model fitted to the recorded census, and a cube generator that balances predicted payoff

*Branch `pc/balance-model`. D473 (`node tools/decisions.mjs next` gave D472, which open PR #194 already holds, so this lane took the next free number before merging, D200). Builds on **D377** (the colour-adjusted
null), **D445**–**D447** and **D450** (the library census, its bands, the deck census and its recording), and
**D469** (evolve's balance mode, which this does not replace: it is the Omega swap rule; this is the library
loop Justin asked for on 2026-10-24).*

**2026-10-24**

**Context.** Justin, 2026-10-24 01:15–01:25: one swap a generation, each re-measured on a 1.6-hour night, is
far too slow, and Omega is a hand-designed prior he does not want to lean on. His question: out of the
whole library, which cards make the most balanced cube — every colour and every pair winning evenly when
drafted (the lab drafter's drafts as the proxy) and played; how evenly each colour is drafted is reported,
not optimised. The data to answer it is on disk: J144/J149's deck census (80,000 recorded Bo1 games between
random decks drawn from each band of the library, 2,500 decks a band) and J145's Omega night (6,400 games
between drafted decks, 8,000 between random Omega decks).

**Decision.**

1. **The card model** (`tools/cubelab/balance-model.ts`): a ridge-regularised linear-probability model of a
   decisive game, P(a wins) − ½ = Σ β_c (x_ac − x_bc) + Σ γ_m (z_am − z_bm) + π·play, over nonland card
   indicators and the deck's makeup group, the two decks antisymmetric so the opponent is controlled as the
   deck is. Two groupings: **makeup** (colour count × main-colour pip share, D447's structure, no colour
   identity: card values absolute within the band, what a generator must add up) and **colour** (D377's
   colours-with-3+-spells: a card against its colour's peers). The two give the same card values to
   r .987 on the legacy band. Linear rather than logistic because census rates sit in .35–.65 and a deck's
   predicted payoff must be the sum of its cards'. Card penalty by 5-fold held-out Brier score with folds
   by game; the makeup groups shrunk 20 pseudo-games (D377's shrinkage); every decisive game once. **The
   same CV by deck is reported beside it** (decks — or J145-B's drafts — to folds; a game is scored only
   when both its decks were held out, and trained on only when neither was): a game fold leaves a deck's
   other games in the fit that scores it. By deck the census's held-out skill is 3.6–4.6% (makeup
   groups) against 5.1–7.2% by game, and pauper and peasant prefer λ 800 where the game folds chose 400;
   the fit keeps the by-game λ (the values and the cubes are unchanged by this), and the by-deck numbers
   are what to quote for skill on new decks.
2. **Intervals: a deck bootstrap with each game carried by one of its decks** (alternately a's and b's
   cluster). The product-weight (pigeonhole) bootstrap inflated the game-noise part ~1.6x on J144's legacy
   band (median card SD .0109 against .0069 for a game bootstrap and for this one). **Repeatability by
   split halves BY DECK is the headline** — the clusters split at random, each half fitted on the games
   inside it, Spearman–Brown stepped up by k = full games / a half's games (4.0 in the census, whose
   cross-half games are in neither half; 2.0 in J145-B, whose games stay inside a draft) — with the
   by-game split (even against odd games, k 2) beside it; not by bootstrap variance, which a shrunk
   estimator understates. By deck: legacy + powered .75 (by game .73), pauper .70 (.75), peasant .65
   (.74), legacy .65 (.65), powered .62 (.63), J145-B .63 (.61), J145-C .50 (.55). The disattenuated
   agreement between J145's two arms stays above 1 by deck (1.071; 1.038 by game), so deck leakage is not
   what put it there: it is a ratio of three noisy correlations on 133 cards (the Pearson alone carries
   ±.05), and reads as "the arms agree as well as their noise allows", not as a number.
3. **The generator** fills sample.ts's `two-colour` plan, which is **`OMEGA_SKELETON`** (skeleton.ts):
   Omega's own counts and curve — 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others,
   every count exact — without Omega's list. That structure is a designed prior, kept on purpose: the
   question is which cards balance a cube of a fixed, playable shape, and Omega's shape is the one J145
   measured; the cards, not the shape, are what the census frees from Omega. It is filled by skeleton.ts's
   min-cost flow at cost |value − level| + sd (an unmeasured card costs as
   if 6 points off, a card outside the cube's band(s) 4 points more, a land from outside only where no band
   land fits), with at least 10 creatures a colour, then like-for-like swaps (same colour class and mana
   value, within 3 points of the level) that minimise max |colour − .5| + max |pair − .5| of the predicted
   payoff **and stop once that gap is at most `--search-tol`, default .008** (`BALANCE_TOL`, about one
   card's census SD: below it the search would be choosing between cards on their noise). Each cube
   document and `model.json` print the gap after the flow alone beside the searched one, and say the cube is
   even to within about the model's own uncertainty (each colour cell's model interval is ±.03 legacy,
   ±.05 pauper), not to the third decimal. **Predicted payoff** = ½ + S_P − mean S_Q over the other pairs, S a pair deck's expected card
   value: J145's lab decks give the deck mix (9.1 cards a colour, 0.45 gold, 4.2 colourless) and the play
   weight of a card by its Forge rating (the builder plays by rating). Lands are not in the model; they go
   by the plan, the band and Forge's rating.
4. **What is validated, and what is not.** The census model's CARD VALUES are validated: summed over the
   decks J145 actually played (`predictNight`), they predict J145's measured colour and pair payoffs with
   correlation .84 (lab-drafted, RMSE .027) and .78 (random Omega decks, RMSE .023). The candidates' tables
   are a different calculation (`predictPayoffs`: class means × an assumed deck mix × a rating play
   curve), and **no measurement has tested that step yet — the first night on a generated cube is that
   test.** The residuals left after the read's noise and the prediction's, sqrt(max(0, RMSE² − read
   variance − prediction variance)), came out 0 on both arms; with 15 cells that is non-identifiability, a
   lower bound on the census-to-drafted transfer error and not a measurement of it. The programme is
   therefore simulated at a **transfer error of .015 as the base case** (no-off rule, 4–8 candidates a
   night: median 4 nights (3–4), 80th percentile 5–6) and **.03 as the pessimistic case** (median 6–8,
   80th percentile 8–10), with the 0 row kept as the lower bound only. It is a prediction about the lab
   drafter and Forge's AI; human pull is not in any data.
5. **`tools/cubelab.sh balance-model --census <J144 dir> [--omega <J145 dir>] --facts <facts.json> --out
   <dir> [--cubes-out <dir>] [--search-tol .008] [--exclude <file> [--suffix <text>]]`**, no engine,
   deterministic (rng.ts), about 50 s on one core. `--exclude` keeps a list of cards (one a line, `#`
   comments, every name a library card) out of every generated cube, and records the file, its sha256 and
   how many of its cards the pool held in each cube document and in `model.json`. The first night measures
   each cube with and without power, so **`cubes/library/powered-exclude.txt` is the census's powered band**
   — `POWERED` in `tools/cubelab/census.ts` (D445), 41 cards: the Power Nine, the ten original duals, the
   ten the programme named, twelve restricted-style Vintage-cube cards; the test holds the two equal. Oko,
   Thief of Crowns is not on it (the census bands it legacy, rarity M) and stays in
   `-legacy-even-high-nopower`. Five cubes are committed under `cubes/library/balanced/`, generated with the
   inputs below, seed 1 and 200 replicates: `balanced-legacy-even-high`, `-legacy-even-mid`,
   `-pauper-even`, and `-legacy-even-high-nopower` and `-legacy-even-mid-nopower` (`--exclude
   cubes/library/powered-exclude.txt --suffix -nopower`). The pauper cube is the same 180 cards with and
   without the list (none of its candidates were powered), so it has no `-nopower` file. Colour + pair gap
   after the flow alone → after the search: legacy-even-high .114 → .007 (12 swaps), legacy-even-mid .030 →
   .006 (4), pauper-even .163 → .008 (13), legacy-even-high-nopower .148 → .024 (19: no like-for-like swap
   narrows it further, blue is .488), legacy-even-mid-nopower .032 → .007 (3). They are candidates to
   measure head to head; nothing in the game, the bridge or evolve reads them.

   **Inputs** (each sha256 also in `model.json`): J144's `out/census-decks.jsonl.gz`
   `b167bf1d5c1f159d79f7064607a17450fa570190199f3166e8a2c607d44dcf55` and `out/census-games.jsonl.gz`
   `d55c0d22c6a5d219f15b6a9b75468c0a63b31e0dbe47d0aef9271d53c79e1510`; J145's `out/drafted-decks.jsonl.gz`
   `49fda34e6d2411c00c2158533b6781e085339ba38b0628f917d6d05721490c8d`, `out/games.jsonl.gz`
   `38ce348ff403408a3b13766451ceff14dc84bcd35a64b9e85ebf23300a727d39` and `out/balance.json`
   `6832c663614632e8e9be04c33149f9fd6fa233de39fb4cdead2e180706248d2d`; and **the facts file**, the cube
   lab's cached engine facts for the library's 1,592 cards (Forge's ranks, the ratings the drafter picks
   by), `var/cubelab/facts/32653ed2fcd7d8d2.json` in the lab checkout, sha256
   `9b0b65014b87a9f8a62b303bc9513771497f43f641c35ac34acff901a4eaea38`. A different facts file changes the
   ratings, the play curve and so the cubes.

**Rejected.** Fitting on J145 alone (158 Omega cards, the prior Justin does not want); a logistic model (the
sum of card values is the generator's currency); swapping one card a night (D469's rule) as the way to
search the library; optimising pull (Justin, 2026-10-24: report it).

**Not decided here.** Which candidate a night measures, the night's shape and the stop rule — the lab's
pre-registration (`pc-results/study/omega-swap-rule-v2.md`).

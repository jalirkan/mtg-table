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
   predicted payoff must be the sum of its cards'. Card penalty by 5-fold held-out Brier score; the makeup
   groups shrunk 20 pseudo-games (D377's shrinkage); every decisive game once.
2. **Intervals: a deck bootstrap with each game carried by one of its decks** (alternately a's and b's
   cluster). The product-weight (pigeonhole) bootstrap inflated the game-noise part ~1.6x on J144's legacy
   band (median card SD .0109 against .0069 for a game bootstrap and for this one). **Reliability by split
   halves** (even against odd games, Spearman–Brown), not by bootstrap variance, which a shrunk estimator
   understates.
3. **The generator** fills sample.ts's `two-colour` plan (Omega's skeleton without its list: 24 a colour,
   2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact — structure,
   not archetypes) by skeleton.ts's min-cost flow at cost |value − level| + sd (an unmeasured card costs as
   if 6 points off, a card outside the cube's band(s) 4 points more, a land from outside only where no band
   land fits), with at least 10 creatures a colour, then like-for-like swaps (same colour class and mana
   value, within 3 points of the level) that minimise max |colour − .5| + max |pair − .5| of the predicted
   payoff. **Predicted payoff** = ½ + S_P − mean S_Q over the other pairs, S a pair deck's expected card
   value: J145's lab decks give the deck mix (9.1 cards a colour, 0.45 gold, 4.2 colourless) and the play
   weight of a card by its Forge rating (the builder plays by rating). Lands are not in the model; they go
   by the plan, the band and Forge's rating.
4. **Validated before use:** the census model alone, applied to the decks J145 actually played, predicts
   J145's measured colour and pair payoffs with correlation .84 (lab-drafted, RMSE .027) and .78 (random
   Omega decks, RMSE .023), and residuals no larger than the two sides' noise. It is a prediction about the
   lab drafter and Forge's AI; human pull is not in any data.
5. **`tools/cubelab.sh balance-model --census <J144 dir> [--omega <J145 dir>] --facts <facts.json> --out
   <dir> [--cubes-out <dir>]`**, no engine, deterministic (rng.ts), about 40 s on one core. The three cubes
   it wrote are committed under `cubes/library/balanced/` as candidates to measure head to head; nothing
   in the game, the bridge or evolve reads them.

**Rejected.** Fitting on J145 alone (158 Omega cards, the prior Justin does not want); a logistic model (the
sum of card values is the generator's currency); swapping one card a night (D469's rule) as the way to
search the library; optimising pull (Justin, 2026-10-24: report it).

**Not decided here.** Which candidate a night measures, the night's shape and the stop rule — the lab's
pre-registration (`pc-results/study/omega-swap-rule-v2.md`).

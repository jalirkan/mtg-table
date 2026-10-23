# The Omega swap rule: a decision for Justin (draft, 2026-10-23)

J145's report said the swap rule is written after the report and before any evolve night. This is that
rule, for your yes or no. It uses only J145's numbers (`results/J145/summary.md`, `balance.json`), the job's
registered `rule:`, the evolve section of `docs/guides/cube-lab.md`, `cubes/omega-cube-180.md` and its seed
pool, and D447 point 9. Every payoff below is Forge's play.

## In plain language

**What the report allows.** On Forge's play, Omega is balanced at colour level on payoff: no colour is OFF
(W .495, U .480, B .519, R .527, G .468 UNCLEAR). So **colour payoff must not drive any swap**. There is
nothing at colour level to fix.

**The one thing it points at is UG.** UG decks win .423 (.382–.465, 544 deck-games) when drafted, and .424
(.388–.465) as random decks drawn from the pool. It is the only drafted pair whose interval sits below .5.
If the J145 band were applied to pairs, UG is the only one it would call OFF: its point is outside
[.45, .55] and its interval excludes .5. WR (.545) is high but inside the band. The registered A-vs-C reading
is that low in both arms points at "the cards", not the drafter. But a pair is still a candidate, and D447
point 9 says a candidate holds only on fresh seeds. **So UG gets confirmed first, and then gets acted on.**

**One fact from the night's own deck file matters here.** UG's two gold signposts are rated under evolve's
`deadMinRating` of 60: Uro 54.2 and Mystic Snake 44. In the 272 lab-drafted two-colour UG decks, Uro was played
in 116 and Mystic Snake in **0**. Evolve's dead rule can never cut either card (`rating-limited`). And the slot
Mystic Snake holds adds nothing to drafted UG decks today.

**Pull may not drive swaps yet.** Every bot over-drafts blue (lab .598) and under-drafts red (.294) and green
(.242). The bots disagree on black, and the human-pick model covers 105 of the 180 cards. The registered rule
judges pull only at 30+ real Omega drafts, and the ledger holds 3. **The PC recommends no pull-driven swaps
before then.** Pull is a story about bots until people draft.

**What the swaps would be.** UG gold for UG gold: one of the two signposts out, a UG gold card from the seed
pool in. Only those two cards land on UG decks alone. Any mono-blue or mono-green swap also moves WU, UB, UR,
WG, BG, RG and the colour level, which is EVEN and has to stay EVEN. A like-for-like swap also keeps the cube's
"two gold cards per pair" (design principle 5).

## The registered rule

**Objective.** Over the pairs with at least **400 drafted deck-games** in arm B (lab vs lab), minimise
max |pair payoff − .5|.
- **Why 400:** it is the smallest n at which a pair's interval could sit inside the [.45, .55] band at all
  (1.96·√(.25/n) ≤ .05 gives n ≥ 384).
- **Today:** seven pairs qualify (WU, WB, WR, WG, UB, UR, UG). Their maximum is UG's .077, and WR's .045 is
  next. BR (238), RG (350) and BG (382) fall below 400.

**Constraints.** Every swap must keep all of these:
- **Colour level:** no colour goes OFF on arm-B payoff (J145's band, unchanged).
- **Pairs:** no qualifying pair goes OFF under the same band.
- **Evolve's five constraints, unchanged:**
  - the cube's size, singleton;
  - each colour's nonland count within `colourSlack` of the start;
  - the land count exact;
  - fixers at least as many as the start;
  - every pair keeps `minSignposts` (2) gold cards.
- **The cube's archetype plan:** UG's place is deck 7 in the cube doc, "Green ramp & lands" (G + U, with
  signposts Uro and Mystic Snake).

**The candidate set.** At most 2 cuts and at most 5 additions.
- **Cuts:** Uro, Titan of Nature's Wrath and Mystic Snake. They are UG's only gold cards, and a swap
  replaces one with another UG gold card, so the pair never falls below `minSignposts`. A balance swap is a
  separate rule from `dead`, so a rating under 60 does not shield a card from it.
- **Additions:** the seed pool's UG gold cards that are not lands and that evolve's own eligibility admits:
  - Forge supports it;
  - not `AI:RemoveDeck:All`;
  - no note says `cut`;
  - rated at least 60, so the builder plays it, which is the reason Mystic Snake's slot is empty today.
- **Before the rating filter, the additions are:** Lonis, Cryptozoologist; Risen Reef; Talisman of
  Curiosity; Tamiyo, Inquisitive Student; Wistfulness.
- **Already excluded:** Oko and Nadu (notes say `cut`), Tamiyo, Collector of Tales (`AI:RemoveDeck:All`),
  and the GU lands (`builder-limited`).
- **Who chooses:** evolve's existing fit chooses the addition. Your notes file wins over it as always: a
  `keep` on Uro or a `try` on any addition binds.

**Swap budget.** At most **1 swap a generation** (the PC's proposal; the most the set allows is 2).
- **Why 1:** with one swap, a move in UG's payoff can be attributed. With two, a kept pair of swaps could
  carry a harmful one.

**Confirmation gate.** A swap is kept only if a fresh-seed re-measure of the swapped cube shows all three of
these, on the same method and read as J145:
- UG's arm-B interval includes .5;
- no colour is OFF;
- no qualifying pair is OFF.

The re-measure is J145-shaped: new draft seeds, new game seeds and new census seeds (D447 point 9).
Otherwise the swap is reverted and the cube goes back to the version before it. Pull is reported and not
judged.

**Not touched, and why:**
- **Red and green pull:** pull is not judged until 30 real drafts.
- **Blue:** its pool weakness (.445, OFF in C only) fires none of the registered A-vs-C readings ("report,
  don't act"), and drafted blue is EVEN.
- **Green:** UNCLEAR, not OFF.
- **BR:** 238 deck-games, with an interval that includes .5. Its .031 draft share is pull.
- **The triples:** no drafted triple reaches 40 decks, and UBR .409 and URG .416 are random-deck numbers
  from arm C only.
- **WR:** .545 is inside the band.

**Stopping rule.**
- **Stop on success:** UG is confirmed EVEN or its interval includes .5, with no colour OFF.
- **Stop after two generations in a row without a confirmed improvement.**
- **Stop when the candidate set is used up.**
- **No widening:** the rule never widens the set by itself. A new candidate needs a new report and a new
  rule.

## What it costs, and the order of nights

- **The cost of a measurement:** J145 ran 14,400 games in 1 h 38 min on 6 workers, against ~2.5 h
  estimated. Plan ~2.5 h for each J145-shaped measurement.
- **The cost of the swap itself:** picking it by fit plays no games.
- **The code it needs first:** evolve has no balance objective today (`fitBalance` is a fit weight). So
  there is a PR before the first generation: a mode that takes its cut and addition from this rule's
  candidate set, under these constraints.

The nights:
1. **Night 0 (if you choose to re-measure first):** J145 again on fresh seeds, with the cube unchanged.
   - **UG is confirmed** if its arm-B interval again sits below .5.
   - **If not, stop.** There is nothing to swap.
2. **Night 1:** generation 1. One swap, then the fresh-seed re-measure. Keep or revert.
3. **Night 2:** generation 2, only if night 1 kept nothing or UG is still below .5.
4. **Stop by the rule above.** The cube document's iteration log records each swap and its evidence, and you
   copy the cube over `cubes/omega-cube-180.md` only when you agree.

## Your four questions (yes or no each)

1. **Re-measure UG on fresh seeds before any swap** (night 0, ~2.5 h)?
   - **The PC recommends yes.** UG is one night's candidate, and D447 point 9 asks for fresh seeds.
2. **Allow pull-driven swaps before 30 real Omega drafts?**
   - **The PC recommends no.** It is a bot story, and the registered rule does not judge pull yet.
3. **A budget of 1 swap a generation** (instead of 2, the whole candidate set)?
   - **The PC recommends yes.**
4. **Stop after two generations without a confirmed improvement?**
   - **The PC recommends yes.**

## Justin's answers (2026-10-23, in chat: "Let's go with your recommendations")

1. Re-measure UG on fresh seeds before any swap: **yes** (night 0, J159).
2. Pull-driven swaps before 30 real Omega drafts: **no**.
3. A budget of 1 swap a generation: **yes**.
4. Stop after two generations without a confirmed improvement: **yes**.

The rule above is therefore registered as written, before night 0's first game. Night 0 is a J145-shaped
job on fresh draft, game and census seeds with the cube unchanged; the balance-objective PR is written
beside it and is needed only for night 1.

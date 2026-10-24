## D469 — evolve gets a balance mode: the registered Omega swap rule, one gold-for-gold swap in the colour pair furthest from even

*Branch `pc/evolve-balance`. `node tools/decisions.mjs next` gave D468, which open PR #187
(`pc/search-step-clock`) already carries, so this lane takes D469. Builds on **D299**–**D300** (evolve),
**D331** (discovery, then confirmation) and **D447** point 9 (a candidate holds only on fresh seeds).*

**2026-10-23**

**Context.** J145 (2026-10-22) measured Omega's colour balance on Forge's play and found it BALANCED ON
PAYOFF at colour level: no colour OFF on arm B, the lab-drafted decks played against each other. Its one
pointer is a pair: UG decks win .423 (.382–.465, 544 deck-games) when drafted, the only drafted pair whose
interval sits below .5. The PC wrote the swap rule that report called for, `study/omega-swap-rule.md` in
pc-results, and Justin accepted it on 2026-10-23 ("Let's go with your recommendations"): **1** re-measure UG
on fresh seeds before any swap, yes (night 0, J159); **2** pull-driven swaps before 30 real Omega drafts,
no; **3** a budget of one swap a generation, yes; **4** stop after two generations without a confirmed
improvement, yes. The rule needs code before its first generation: evolve has no balance objective
(`fitBalance` only weights the fit of an addition).

**Decision.**

1. **`tools/cubelab.sh evolve … --balance <balance.json>`** turns on balance mode
   (`tools/cubelab/evolve-balance.ts`). It reads a J145-shaped balance read on the arm its
   `verdict.judgedPayoff` names. A path flag rather than `--evolve balance=1`, because the mode needs the
   read and `--evolve` takes numbers only; the presence of the read is the switch, as `--explore` is for
   D356. Its knobs are `--evolve` knobs like every other: `balanceMinGames` 400, `balanceSwaps` 1,
   `balanceBand` 0.05, in `EVOLVE_DEFAULTS`.
2. **The objective** is the registered one: over the pairs with at least `balanceMinGames` drafted
   deck-games, minimise max |pair payoff − .5|. The pair furthest from .5 is the target. Only payoff is
   read; pull never drives a swap (answer 2).
3. **It refuses**, with the reason written into the decision, the changelog and the iteration log, when a
   colour is OFF on that arm (the rule is written for a cube balanced at colour level: colour payoff must not
   drive a swap, and the lab's gate could not pass), when no pair has `balanceMinGames` deck-games, when the
   target's interval includes .5 (nothing to fix), or when a label the read carries disagrees with the
   classifier at `balanceBand`.
4. **The classifier is J145's**, transcribed once as `payoffLabel`: OFF when the 95% interval excludes the
   target and the point is at least the band from it; EVEN when the interval sits inside the band; else
   UNCLEAR. J145's own copy is Python inside its job script in pc-results, not in this repository, so this is
   the repository's only copy, and the test holds it to all 35 labels J145's read printed (payoff at ±.05 of
   .5, pull at ±.08 of .4), so it cannot drift from the read it judges.
5. **The candidate set.** Cuts: the cube's gold cards of the target pair (nonland, exactly its two printed
   colours, as evolve counts a pair's signposts). Additions: the pool's gold cards of the same pair that
   evolve's own add rules admit (`addRules`, factored out of `selectSwaps` unchanged: Forge supports it, no
   `cut` note, not cut before, not AI:RemoveDeck:All and rated at least `deadMinRating` unless a note says
   `try`). Gold for gold in one pair, so `minSignposts` and every colour count stay put, and the swap must
   still keep evolve's five constraints (`violations`). **A rating under `deadMinRating` does not shield a
   cut**: `rating-limited` is the `dead` rule's guard, because the dead rule's evidence is a play rate the
   drafters' ratings decide; a pair's payoff is not that evidence. The notes file wins as everywhere: `keep`
   (or `try`, on a card already in) takes a cut out of the set, `cut` keeps an addition out, `try` admits one
   and adds `fitTry`. An AI-limited cube card is not a balance cut unless a note says `cut`: evolve never
   cuts one on AI evidence, and a pair's payoff is AI evidence.
6. **The choice.** Cuts are tried in order of the generation's own evidence that the slot adds least to the
   pair's decks: the lowest on-colour play rate first (a card never on colour this generation last), then
   the lowest rating, then the name. For each, evolve's existing fit ranks the additions and the first that
   keeps every constraint is the swap. The registered rule names the cut set but not which of its cards goes
   first; this order follows its stated reason ("the slot Mystic Snake holds adds nothing to drafted UG decks
   today": 0 of 272 lab-drafted UG decks played it). Ranking (cut, addition) pairs by fit alone was
   rejected: the fit measures how alike two cards are, so it would cut the card most like the addition — Uro
   for Risen Reef, since both are LND — rather than the slot the decks do not use.
7. **One swap a generation, and no other rule swaps.** In balance mode every rule is still assessed and
   reported, but a cut it supports (a note's `cut` too) is held, listed with the reason, so a move in the
   pair's payoff can be attributed to the one swap (answer 3). No confirmation batch is played (nothing it
   could confirm would be cut). `--generations` must be 1: the read measured the cube going in, and a second
   generation would act on a read of a cube that no longer exists.
8. **What it records:** each balance swap carries `why: balance` and a `balance` block — the read's job and
   arm, the pair, its payoff, interval and deck-games, its distance from .5, how many pairs qualified, the
   band, the cut and the addition — in `evolve.json` (with the read's path, sha, job and arm as `balance`),
   `stats.json`, the changelog (a paragraph and a table of every pair) and the cube's iteration log. The
   decision also records the whole candidate set with the reason each card left it, and the confirmation
   gate in words.
9. **Confirmation and stopping stay the lab's.** A fresh-seed, J145-shaped re-measure keeps the swap only if
   the pair's interval then includes .5, no colour is OFF and no qualifying pair is OFF; else the cube
   reverts. The rule stops on success, after two generations without a confirmed improvement (answer 4), or
   when the candidate set is used up; the code never widens the set.
10. **Off is the old evolve, byte for byte.** Without `--balance`, `selectSwaps`, the log entry, the
    changelog and the page are unchanged (a test holds their digest, taken before this change), and
    `evolve.json` records the 30 knobs it recorded before (`recordedKnobs` leaves the three balance knobs
    out), so a folder started before D469 resumes as it did. A balance knob without `--balance` is refused.

**What it finds on J145.** Seven pairs have 400+ deck-games (WU, WB, WR, WG, UB, UR, UG); UG is the worst at
.077 from .5 (WR next at .045), and the band would call UG alone OFF. The cuts are Mystic Snake (rated 44)
and Uro (54.2). Under evolve's colour model, with the engine's printed colours and Forge's ranks, the pool's
UG gold cards are Lonis, Cryptozoologist (38.8), Risen Reef (88.4) and Wistfulness (44.9) before the rating
filter; after it, **Risen Reef alone**. The study's list of five also named Talisman of Curiosity and Tamiyo,
Inquisitive Student, by the seed pool's colour identity: the engine prints the Talisman colourless and Tamiyo
blue, so a swap to either would take a gold card from UG and break `minSignposts`. With the generation's play
rates even, the swap is **Mystic Snake → Risen Reef**.

**Rejected.**

- **A mono-colour swap** (a blue or a green card for another): it moves the seven other pairs that share the
  colour, and the colour level, which is EVEN and must stay so. Gold for gold in the pair moves only the pair.
- **Widening the candidate set** (colour identity instead of printed colours, the pair's lands, cards from
  neighbouring pairs, or dropping the rating floor for additions): the identity-only cards and the lands break
  the signposts or the land count, and a card under `deadMinRating` is the one the builder will not play,
  which is why Mystic Snake's slot is empty today. A wider set needs a new report and a new rule (the
  registered "no widening").
- **Acting on pull** (blue over-drafted, red and green under-drafted by every bot): the registered rule does
  not judge pull before 30 real Omega drafts, and the ledger holds 3 (answer 2).
- **Letting the dead rule's `rating-limited` guard cover balance cuts**: it would shield both UG signposts
  (Uro 54.2, Mystic Snake 44), so the rule could never act on the pair it was written for.
- **Running balance swaps beside the other rules' swaps**: two kinds of swap in one generation could not be
  told apart in the re-measure.
- **Several generations on one read**: after the first swap the read describes a cube that is gone; each
  generation is a new read (the lab's re-measure).

**Addendum, 2026-10-23 (the cloud's review of #189, LOW).** On resume the knobs are merged as
`{...o.knobs, ...state.knobs}`: a folder started before a later knob existed gets that knob's CLI or default
value instead of `undefined`. The reviewer called this probably a fix, and it is: before it an old folder's
missing knob read `undefined` through every comparison. A folder's recorded knobs still win where they
exist, so no resumed run changes its course.

## D380 — meta.json counts a nonbasic land's decks and games like a spell's; a card picked often and never built is the deckbuilder's rating, not a lost name

*Branch `c/meta-fixes`.* Amends D297.

**2026-10-04**

**Context.** ForgeCoach read the four shipped `public/cubes/<cube>.meta.json`
and found two things that looked wrong:

- every nonbasic land read `inDecks: 0, games: 0`;
- nonland cards picked more than ten times with `inDecks: 0` — 21 in the
  synergy cube (Prized Amalgam, Unsummon, Delver of Secrets, Reflector Mage,
  Mayhem Devil…), 4 in pauper, 3 in vintage (Fatal Push, Liliana of the Veil,
  Psychic Frog). It suspected a name mismatch (`A // B`, punctuation, Unicode)
  or a partial deck list.

**Lands.** `buildMeta` built each played deck's `names` without lands, and
counted `inDecks`, `games` and `wins` over those names only. D297 gave no
reason for it as far as per-card numbers go: the exclusion is right for pairs,
key cards and curves (every deck plays lands, so a land in a pair or a
key-card list says nothing), and was carried into the per-card counts with
them. Evolve (D299, `cardStats`) already worked around it by recounting lands
from the full lists. A land the builder played is data a consumer wants
(which duals got played, and how often).

**Decision.**

- **A nonbasic land is counted in `cards` like a spell**: `inDecks`,
  `inclusionRate`, `games`, `wins`, `winRate`, `winRateShrunk`, `ci`, over
  the played decks whose main list holds it. Basics are not cube cards and
  still have no entry.
- **Pairs, archetype key cards and curves stay nonland**, as before.
- **The shrinkage mean `m` stays the nonland mean**, so no spell's number
  moves: the mini fixture's golden changes in Mist Fountain's entry alone.
  A land is shrunk toward the same `m`.
- **Evolve's recount is gone**: `cardStats` reads lands from `meta.json`
  like any card (its numbers were the same; the win rate now carries meta's
  four decimals).
- Schema stays 1: no key is added, renamed or removed; a field that was a
  wrong zero now holds the count. The guide's *meta.json* section says that a
  land's win rate measures its pair more than the land (the builder plays a
  dual only in its pair's decks, as evolve's `builder-limited` says).

**The picked-but-never-built cards are real.** Checked against the shipped
metas and the committed fixtures, not a name problem and not a partial list:

- No `cards` key in any of the four metas is outside the cube's 180 names,
  and `buildMeta` adds every name it counts from a deck to `cards` — a deck
  name that failed to match would be an extra key. None is.
- Σ `inDecks` over all cards ÷ decks is 23.05–23.68 in the four metas: the
  played decks' spells, all of them (23, or 24 on 16 lands). Every
  `sampleDecks` list is 40 cards.
- The zeros sit at the bottom of the run's ratings TSV
  (`cubes/<cube>.ratings.tsv`): the synergy cube's 21 are between its 2nd and
  31st rating percentile (Village Rites 14.7 … Beast Within 48.9), and its
  bottom rating quartile is built 6% of the times it is picked against 42–66%
  for the other three. The deckbuilder (D294) chooses spells by rating, and a
  grid pick takes a whole row or column, so a low-rated card rides along in
  picks and is never built — evolve's `rating-limited` status (D299) is the
  same fact. Vintage's three are black: no UB deck was built in its 40, and
  black in 10 of them; Psychic Frog (rated 98.7) is UB.

So the zeros are the lab's builder, and the remedy is ratings
(`tools/cubelab.sh ratings init`, edit, run with `--ratings`), not this file.
`web/test/cubelab.test.ts` now holds the two invariants above (no key outside
the cube; Σ `inDecks` = the played decks' distinct nonbasic cards) on the mini
fixture with plain names and with `A // B`, apostrophe, comma and `Æ` names,
and the land counts by arithmetic.

**Rejected.**

- *Keep lands out and mark them `landsExcluded: true`.* The zeros were never
  a reasoned choice for per-card numbers, and the count is cheap and real.
- *Recompute `m` over lands too.* It would move every spell's shrunk rate for
  no reason that is the spell's.
- *Count passengers apart (`picked` only for a card the drafter wanted).* A
  grid take has no per-card choice to record; `avgPickIndex` and the rating
  already say it.

**Regenerating the shipped metas** needs the PC's lab data; the PR carries
a pc-jobs draft for it.

## D445 — The library census, Phase 0: `census.tsv` (one row a library card, a provisional band by a written rule) and `cubelab.sh sample` (stratified cubes by band × structure)

*Branch `pc/census-population`. `node tools/decisions.mjs next` gave D442 on 2026-10-16; D442 and
D443 are taken by `pc/review-followups` (#148) and `pc/watch-choices` (#149), and D444 by
`pc/custom-cubes`, so this is D445.*

**2026-10-16**

**Context.** Justin's library census (the cloud's note of 2026-10-16 in `pc-jobs`' README, *NOTES
TO THE PC*, with the PC's six corrections, all accepted, and J140's design in
`pc-results/HEARTBEAT.md`, 2026-10-16 19:00): treat the whole library as one population, one copy
of each card, and learn each card's value in context — power band, colour structure, archetype.
Phase 0 is the population and a sampler. Two of the corrections shape it: uniform random 180s
from the whole library measure band mismatch, not card value, so cubes are drawn **within a band**
with a 10% cross-band slice for the offsets; and band labels from membership alone are circular
(1,103 of the 1,592 cards are in exactly one list), so the starting label is **rarity history**,
with membership only as a tiebreak and every label provisional. The library is
`cubes/library/library-pool.tsv` (#146): 1,592 cards, 1,568 supported by Forge 2.0.14.

**Decision.**

1. **`cubes/library/census.tsv`**, written by `tools/cubelab.sh census build --fc <ForgeCoach>`
   (`tools/cubelab/census.ts`): one row a pool card with `name`, `sources`, `forge_supported`,
   `forge_ai_flag`, `colour_identity`, `type`, `mana_value` (the pool's engine facts, copied),
   `lowest_rarity` and `lowest_rarity_set` (over every printing section of every file in Forge's
   `res/editions`, `[tokens]` excepted; C < U < R < M < S; Forge's `L`, a booster's land slot, read
   as C; the set named is a paper set's own edition before an Online one before a promo or
   collector product, then the earliest date), `lab_games` and `lab_wr_shrunk` (ForgeCoach's metas,
   games summed and `winRateShrunk` games-weighted, the rate blank under 80 games),
   `member_vintage` (vintage180, mtgovc), `member_legacy` (any other list), `member_peasant`,
   `member_pauper`, and `band`, `band_source`, `provisional` (1 on every row). No engine: the edition
   files and the metas are read as files. Deterministic; the header carries the sha256 of the pool,
   the editions and each meta, and `--check` rebuilds the file, compares the bytes and exits 1
   naming the input that moved.
2. **The band rule**, the first that applies:
   - **powered**: the card is on the powered list (point 3);
   - **pauper**: ever printed at common (`rarity:C`);
   - **peasant**: ever printed at uncommon and never at common (`rarity:U`);
   - **legacy**: everything else that has a printing (`rarity:R`, `rarity:M`, `rarity:S`);
   - **no printing** (a card no edition file prints, which today is exactly the 24 cards Forge
     2.0.14 lacks): a Pauper cube lists it → pauper, else a Peasant cube → peasant, else legacy
     (`membership:pauper`, `membership:peasant`, `membership:other`).

   `band_source` records which rule fired. Every label is provisional until the census's first
   round; its re-labelling rule (the lab's pooled shrunk win rate where a card has 80+ games, the
   band edges a soft feature) is written before that round runs, as its own decision.
3. **The powered list**, fixed, 41 cards, every one a library card (the test holds it):
   - *the Power Nine*: Black Lotus, Ancestral Recall, Time Walk, Timetwister, Mox Pearl, Mox
     Sapphire, Mox Jet, Mox Ruby, Mox Emerald;
   - *the original dual lands*: Tundra, Underground Sea, Badlands, Taiga, Savannah, Scrubland,
     Volcanic Island, Bayou, Plateau, Tropical Island;
   - *named by the programme*: Library of Alexandria, Bazaar of Baghdad, Mishra's Workshop,
     Candelabra of Tawnos, Sol Ring, Mana Crypt, Mana Vault, Time Vault, Tolarian Academy, Strip
     Mine;
   - *the Vintage cubes' restricted-style cards*: the cards on Vintage's restricted list that a
     Vintage cube list here plays (vintage180 or mtgovc) and that were never printed at common —
     Balance, Demonic Tutor, Imperial Seal, Lion's Eye Diamond, Memory Jar, Mystic Forge, Mystical
     Tutor, Narset, Parter of Veils, Tinker, Vampiric Tutor, Wheel of Fortune, Yawgmoth's Will.

   Left to the rarity rule, and said so in the header: Brainstorm, Gitaxian Probe, Gush, Lotus Petal
   and Treasure Cruise (restricted, in a Vintage cube list, but printed at common; the Pauper cube
   plays Brainstorm and Treasure Cruise). Not on the list: Channel (restricted, but only the Old
   School list has it; peasant), and the unrestricted power a vintage cube also plays (Mana Drain,
   Mox Diamond, Chrome Mox, Grim Monolith, Urza's Saga, Flash), which rarity bands. Changing the
   list is a new decision.
4. **`tools/cubelab.sh sample --band <pauper|peasant|legacy|powered|all> --structure
   <mono-heavy|two-colour|three-colour|good-stuff> --seed S --count N --out <dir> [--cross-band
   0.10] [--allow-ai-flagged]`** (`tools/cubelab/sample.ts`) writes N cube documents of 180 cards in
   the lab's format, and a manifest `<band>-<structure>-<seed>.tsv`. The structures, each with
   Omega's nonland curve scaled to its nonland count and every count exact:
   - `two-colour`: Omega's skeleton — 24 a colour, 2 gold a pair, 18 colourless; 2 lands a pair and 2 others;
   - `mono-heavy`: a main colour 60, the other four 18, 1 gold a pair, 22 colourless; 1 land a pair and 6 others (light fixing). The main colour rotates W, U, B, R, G across a run's cubes from a seeded start;
   - `three-colour`: 20 a colour, 3 gold a pair, 20 colourless; 3 lands a pair (30);
   - `good-stuff`: 24 a colour, 20 gold of any two or more colours (five-colour allowed), 18 colourless; 20 fixers (any land of two or more colours) and 2 lands of fewer.

   A pair's land slot takes a land of exactly that pair, or, a tier down, one of three or more
   colours that includes it.
5. **The draw.** Every eligible card (supported, not a basic land, not AI:RemoveDeck:All unless
   `--allow-ai-flagged`) has one uniform 32-bit key from `rng(S, 'census-sample/<band>/<structure>/<i>')`
   for cube *i*, and one min-cost flow fills the plan (`skeleton.ts`'s `selectSlots`: a card may
   offer several slots and is taken once) at the least cost, tiers first and keys second. In-band
   slots take the band's cards, and only where the band cannot fill a slot the nearest band that
   can (FILL: pauper → peasant, legacy, powered; peasant → pauper, legacy, powered; legacy →
   peasant, pauper, powered; powered → legacy, peasant, pauper). The cross-band slice is
   round(share × 180) slots spread by a seeded draw over the slot groups the neighbouring bands
   (pauper–peasant–legacy–powered) have cards for, filled from those neighbours (CROSS). `--band
   all` draws from every band alike, with no slice and no fill. Each document's header records the
   band, structure, seed, index, main colour, the census's and the pool's sha256, the eligible pool
   and its in-band and neighbour sizes, the plan, the CROSS and FILL cards with their bands, and the
   composition by band.
6. **The shared module.** Omega's skeleton, `skeletonErrors`, the selections and the document
   writer move from `library-candidates.ts` to `tools/cubelab/skeleton.ts`, re-exported unchanged;
   `library-candidates`' committed documents re-render to the same bytes.

**What it gives, today** (seed 1, 20 cubes a band and structure): legacy cubes are 90.0% in-band
and 10.0% cross, no fill; pauper 87.5–89.8% in-band, 9.6–10.0% cross, 0.4–2.7% fill (a curve or
gold slot, or good-stuff's two non-fixing lands); peasant 75.5–84.8% in-band, 10.0% cross,
5.2–14.5% fill, almost all of it pair lands from pauper (the peasant band has no land of exactly a
pair); powered 15.6–17.5% in-band (some 29 of its 37 eligible cards a cube), 10.0% cross, 72.5–74.4%
fill from legacy. The cross-band share over 20 cubes is within 2 points of 10% in every band and
structure; the test checks two.

**Rejected.**

- *Labels from membership* (vintage cube → powered/legacy, pauper cube → pauper): circular for the
  1,103 cards in one list, and the Vintage cube lists play Lightning Bolt and Swords to Plowshares.
  Membership is the tiebreak only.
- *Nested bands* (a peasant cube from pauper ∪ peasant, a legacy cube from everything unpowered):
  the familiar formats, but then a common is measured in every band and an uncommon is never
  measured apart from the commons beside it; the census wants within-band ratings first and the
  offsets from the slice. The fill makes the formats' practical shape (common lands in a peasant
  cube, legacy in a vintage cube) without making it the rule.
- *A band's cards only, no fill*: impossible today. Peasant has no land of exactly a pair; pauper
  has one for Orzhov and one for Simic and no non-fixing land; powered has 41 cards. The fill is
  listed card by card, so a reader can see what each cube borrowed.
- *A quota of three-or-more-colour cards in three-colour*: the library has eleven supported such cards (ten
  legacy, one peasant, none pauper), so a quota would be legacy fill in every pauper cube. Three-colour
  is more gold *pairs* and more fixing; good-stuff's gold quota admits three- to five-colour cards.
- *Running `cubelab.sh check` in the test*: it boots Forge for the facts lookup, and the census needs
  no engine. The test asserts what `check` fails on (a name Forge's database lacks — every card is a
  supported pool row, the pool's support being the engine's own facts) plus no parse warning.

**Consequences.**

- Old uncommons land in peasant by rule: Force of Will, Mana Drain, Wasteland, City of Brass,
  Swords to Plowshares, Ancient Tomb. That is the rarity rule doing what it says; the first round's
  re-labelling rule is where the lab's numbers can move them.
- `sample` writes documents only; the drafter and builder shape variants that make a mono or a
  three-colour cube play as one are Phase 1 (`pc/census-shapes`), and J140 is written after it.
- `census build` needs a ForgeCoach checkout for the metas, as `library-candidates` does; CI does not
  run `--check`. A new meta, a new pool or a new Forge's editions is a rebuild and a commit.

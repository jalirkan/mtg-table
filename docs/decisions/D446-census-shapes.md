## D446 — The library census, Phase 1: deck shapes (mono, two-colour, three-colour, good-stuff) for the lab drafter and builder, a shape exploration share, and the shape measures

*Branch `pc/census-shapes`. `node tools/decisions.mjs next` gave D446 on 2026-10-16 (D442–D445 are
taken).*

**2026-10-16**, written before any test of the rules below was run.

**Context.** The census (D445; the cloud's notes of 2026-10-16 in `pc-jobs`' README, *NOTES TO THE
PC*, and J140's design in `pc-results/HEARTBEAT.md`, 2026-10-16 19:00, with the cloud's answers to
its three questions) learns card value in context, and colour structure is one of the contexts.
The lab drafter leans to two colours and commits to its heaviest pair after a third of its picks
(D294); the builder plays two colours and a splash of at most three one-pip cards on 16 or 17
lands, and three colours or 18 lands only for a pool too thin for a pair (D298). So mono decks
and decks of three or more colours are never measured fairly: they appear only as accidents of a
thin pool. Phase 1 gives a seat a **shape** to draft and build to, an exploration share that
forces shapes at random so every shape gets games, and the measures that read them. The
accepted corrections fix the frame: pre-registered land rules and lean rules per shape, no D416
drafter, a shape spread and `pair_within5` per shape, "viable" meaning the 95% interval overlaps
0.5, and card flow as a bias feature from the start. ForgeCoach's deck assistant keeps its
two-colour rule; this is the lab's.

**Decision.** Every number below is a named field of `SHAPE_RULES` in `tools/cubelab/shapes.ts`
(rule 4 of `tools/CLAUDE.md`'s cube-lab section), recorded in `run.json` when shapes are on.

1. **The shapes.** `--shape-a` and `--shape-b` (`run`, `compare`, which passes them to every
   population's run, and `watch`) take `auto`, `two-colour`, `mono`, `three-colour` or
   `good-stuff`; the default is `auto`. **`auto` is today's drafter and builder, exactly**: with
   both seats `auto` and no `--shape-explore`, `run` takes the code path it took before this
   decision, and its `drafts.jsonl`, decks, `run.json`, `cards.json` and lab version are byte for
   byte what they were (the test holds the picks and decks of ten drafts, twenty pools, on three
   census cubes against a golden made from `main` before the change). **`two-colour` is `auto`
   under a name**: the same picks and the same deck, so a forced two-colour seat is the
   randomised control arm of the exploration below.

2. **The drafter's lean rules** (`scoreCard`'s colour, synergy and fixing terms; the rating,
   `remAIDeck` and learned-pair terms are today's for every shape):
   - **two-colour**: today's (lean `lean` 10 before `commitAt` 1/3 of the expected picks, then the
     two heaviest colours re-read every pick, `offColour` 40, `splash` 15, `fixing` 12).
   - **mono**: decisions 1 and 2 lean as today's drafter does before it commits. From the 3rd
     decision that takes cards (`monoCommitPick` 3) the drafter is committed to ONE colour, fixed
     there for the rest of the draft: the heaviest colour by colour mass (pick.ts's `colourMass`:
     rating mass, a gold card's split over its colours; ties in WUBRG order) of the picks made
     before it; if those picks carry no colour mass, it keeps leaning and fixes the colour at the
     first later decision whose earlier picks do. Committed, a nonland card castable in that
     colour (colourless included) scores colour 0 and any other nonland card −`offColour` (40):
     no splash discount ("the best on-colour or colourless card"). Synergy counts the committed
     picks castable in the colour. Fixing: a land making the colour scores 0, a land that does not
     −`fixing` (12), a nonland fixer only its colour term.
   - **three-colour**: leans as today's before `commitAt`; committed, to the three heaviest
     colours by colour mass (WUBRG ties), re-read every pick as today's pair is. A card castable in
     the three scores 0, any other nonland card −`offColour` (no splash: the builder plays none).
     Fixers weighted up: a land or nonland fixer making two or more of the three scores
     +`fixing` × `threeFixingMult` (2) = +24, one making one of them and producing two or more
     colours +`fixing` / 2 × 2 = +12, a land making none of them −`fixing`. Synergy counts the
     committed picks castable in the three.
   - **good-stuff**: no colour lean and no commitment: the colour term is 0 at every pick, and so
     is the synergy term (the highest-rated card, `goodSynergy` 0). Fixers, colour-blind: a land
     or nonland fixer producing two or more colours scores +`fixing` (12) at every pick; any
     other land 0 (rated × `landScale` only). The builder decides the colours.

3. **The builder's land and colour rules** (deck.ts's `buildOne` chooses the spells, the
   nonbasic lands and the basics exactly as today for the colours it is given; the shape decides
   which colours are tried, how many lands, and what the score leaves out):
   - **two-colour**: today's (`buildDeck`: 16 lands and 24 spells when the spells average
     `sixteenLandsAt` 2.5 or less, else 17 and 23; a splash of at most `maxSplash` 3 one-pip cards;
     the second pass for a thin pool). J121 and J124 did not show 16 against 17 lands, so the
     two-colour rule is left as it is.
   - **mono**: one main colour, each of the five tried, with no splash or a splash of one other
     colour of at most `monoMaxSplash` (2) cards each needing at most one pip of it (and today's
     `splashDeckSources` 3 sources, at most two of them basics). **16 lands and 24 spells, or 17
     and 23 when the 24 spells chosen for 16 lands average a mana value of `monoSeventeenAt`
     (3.0) or more.** Basics of the main colour; nonbasic lands only for the splash (today's rule
     with the colour as the "pair": a land making two of the deck's colours or the splash colour).
   - **three-colour**: exactly three main colours, each of the ten triples tried, no splash.
     **17 lands and 23 spells when the pool holds at least `threeFixers` (3) fixers for the
     triple, else 18 and 22**; a fixer for a colour set is a land or a nonland fixer producing at
     least two of its colours. Nonbasic lands as today's three-colour build: those making at least
     two of the three, at most lands − 7. A triple is built only when each of its colours is
     needed by at least `threeMinPerColour` (3) of the spells and every colour but the two
     with the most pips has a source (a land or fixer making it) — so a pair with one card of a
     third colour is not a three-colour deck.
   - **good-stuff**: three, four or five main colours, no splash, **18 lands and 22 spells**,
     with the fixers. A colour set of k colours is *supported* when the pool holds at least
     `goodFixersPerColour` (3) × (k − 2) fixers for it (3 for three colours, 6 for four, 9 for
     five); the builder takes the largest k for which a supported set has a build, and the best
     scoring set of that size. Nonbasic lands: every pool land making at least two of the set's
     colours, at most 18 − 7 = 11. Each colour is needed by at least `goodMinPerColour` (2)
     spells, and every colour but the two with the most pips has a source.
   - **The score** is today's (mean rating, playables, theme density, curve, creatures, splash)
     for every shape, without the two parts that choose a land count or a colour count the shape
     has already fixed: the three-colour and good-stuff builds drop `deckThreeColour` and
     `deckEighteenLands`.
   - **No build.** When a shape's builder finds no legal build (a pool without 23 spells in any
     colour, or without the fixers a good-stuff set needs), the seat plays today's builder's deck,
     and its line says `shapeFallback: true`. Such a deck counts by its colours in every colour-
     count measure and is left out of the by-shape table (point 6), whose rows are decks built to
     their shape; each shape's fallback rate is reported beside it.
   - **The deck rules** (`checkShapedDeck`): 40 cards, nothing the pool lacks; mono one main
     colour, at most 2 splash cards, 16–17 lands; three-colour three main colours, no splash, 17–18
     lands; good-stuff three to five, no splash, 18 lands. A shaped deck that fails its rules is a
     bug: the draft throws.

4. **The exploration share.** `--shape-explore share=<x>` (or `on`, share 0.25) on `run` (and
   `compare`): each draft draws, from its own stream `rng(seed, 'shape-explore')` — so nothing
   else about the draft moves, any `--jobs`, a resumed run — u_A, k_A (one of four), u_B, k_B3
   (one of three) and k_B4 (one of four), always all five. An `auto` seat is **forced** when its
   u < share. Seat A's forced shape is the k_A-th of (mono, two-colour, three-colour,
   good-stuff); seat B's is the k_B4-th, except when seat A was forced too, when it is the
   k_B3-th of the three shapes A did not get. So each seat is forced with probability `share`,
   its forced shape is uniform over the four (for B: s·(3/4)·(1/3) + (1 − s)·(1/4) = 1/4 for each),
   and two forced seats never share a shape: the exploration makes no mirrors. A seat with a
   non-`auto` `--shape-a/-b` keeps it and is never forced. Each drafter's line carries `shape`
   (`auto` or the shape it drafted and built to) and `shapeForced` (true or false) whenever shapes
   are on, and `shapeFallback` when point 3's fallback played; `run.json` carries
   `shapes: {A, B, explore, rules}`; the shape settings are part of the folder's identity (D394)
   and of its lab version when on.

5. **Card flow** (the Synergy v3 study's bias feature, `pc-results/study/synergy-v3-design.md`
   §1: 17 cards that "draw or filter without adding to the board", each −2.9 points [−3.7, −2.1]
   of win share). Generalised to a rule on the engine's own facts (`tools/cubelab/cardflow.ts`'s
   `isCardFlow`): a card is **card flow** when it is not a land or a planeswalker, it is not a
   creature unless it has evoke, its text draws at least one card, and every sentence of its rules
   text (reminder text removed, the card's name read as `~`, a trigger of the card's own entering
   or dying and an activation cost of mana, `{T}`, sacrificing it, life or a discard stripped
   first) is, clause by clause (split at ", then" and "and"), one of: a draw (`draw(s) N
   card(s)`, at once or at the next upkeep); card selection (scry, surveil, mill, look at the top
   cards of a library or at a hand, reveal the top cards, put them back, shuffle, put one into the
   hand and the rest on the bottom or into the graveyard, discard, put cards from the hand on top);
   an additional or alternative cost; a Treasure, Clue or Food token; "add one mana of any color";
   gaining or losing life; a flashback, evoke, delve, buyback, retrace, jump-start or cycling
   line; and, on an evoke creature, a line of evergreen keywords. The study's 17 cards are card
   flow by this rule and the test holds them, with controls that are not (a counterspell that
   draws, a creature that draws, an enchantment that draws every turn, a burn spell). When shapes
   are on, `cards.json` marks each card-flow card `flow: true`, and the measures count a played
   deck's card-flow cards.

6. **The measures** (`tools/cubelab/shape-measures.ts`), in `compare` (each population, with the
   paired draft-clustered bootstrap D441 uses, 1,000 replicates, boot seed 1) and in `report`
   (one population, the same bootstrap, a *Shapes* section, only when the run has shapes on), and
   aggregated over many run folders by `tools/cubelab.sh shapes <run-dir>... --out <dir>`:
   - **`shape_spread`**: the played decks' match win rate (matches won over decisive matches; a
     drawn match left out) by the deck's **colour count** — its main colours, a splash not counted:
     1, 2, 3, 4+ (a Forge-built deck by its colours) — for all decks, the forced seats' and the
     unforced seats', each with its 95% interval; and the scalar spread, max − min over the
     colour counts with at least `--min-pair-games` (30) decisive matches among all decks,
     recentred as D441 recentres `pair_spread`.
   - **`pair_within5` per colour count**: the share of colour combinations (the deck's main
     colours: W, WU, WUB …) with 30+ decisive games whose game win rate is within 5 points of 50%,
     one share for each colour count (for two colours it is D441's `pair_within5`).
   - **`card_flow`**: the mean card-flow count of a played deck by colour count (all decks) and by
     shape, with intervals; present only for runs with shapes on.
   - **By shape** (the table J140's rule reads): for each shape, the decks of seats **forced** to
     it and **built to it** (no fallback), their match win rate over decisive matches with its 95%
     interval, a match between two seats of the same non-`auto` shape left out (point 4 makes none;
     a fixed `--shape-a` beside an explored B can), and the shape's fallback rate.
   - `compare.json` keeps numbers only: `pop.<name>.shape.<key>.{est,lo,hi,valid,n}` with the keys
     `cc1|cc2|cc3|cc4p` × `_all|_forced|_unforced`, `spread`, `pw5_cc1..cc4p`, `flow_cc1..cc4p`,
     `flow_<shape>` and `label_<shape>` (`two_colour`, `three_colour`, `good_stuff`, `mono`,
     `auto`), and `fallback_<shape>`.

7. **`tools/cubelab.sh shapes`** reads many run folders (no engine) and groups them by the census
   band in each cube document's first line (a non-census cube is the group `all`), pooling each
   group's drafts as one population with a draft-clustered bootstrap over (folder, seed), and writes
   `shapes.json` (numbers only), `shapes.md` and `ratings-rough.tsv`. With `--viable 0.5
   --dominant 0.55 --not-viable 0.45` (J140's labels, the cloud's answer 2) each shape row of each
   group is labelled from its interval alone: VIABLE iff the interval contains 0.5, DOMINANT iff it
   lies wholly above 0.55, NOT VIABLE iff wholly below 0.45 (a row can be none, or DOMINANT and not
   VIABLE). Reported beside, deciding nothing: the **band offsets** from the cross-band slice (in
   each band's cubes, the pooled win rate of the played cards from each other census band minus
   that of the in-band cards, deck-games as the unit, with a draft-clustered interval); card flow
   by shape; and the **rough per-card ratings** within band (`ratings-rough.tsv`: every card's
   games, wins, raw rate with Wilson's 95% interval, and the shrunk rate (wins + 20m)/(games + 20),
   m the group's nonland card-game mean), report only: J141 stratifies on them, and its rule is
   written before they are read.

**Rejected.**

- *A D416-style drafter per shape* (17Lands' human picks): the accepted correction says no; the
  shapes are the lab drafter with other colour rules, so a shape's result is about the shape.
- *Mono committing when the lab drafter commits* (a third of the picks): by then a two-colour pool
  is a two-colour pool, and the mono deck would be the builder's accident again. Pick 3 is the
  programme's wording.
- *Splash discounts for the shaped drafters*: mono's builder may splash two cards, but a drafter
  that took splash cards would drift toward a two-colour pool; mono takes only on-colour or
  colourless cards, so any splash is what the grid's lines brought along.
- *Counting a fallback deck as its shape* (intention to treat): a mono seat whose pool cannot make
  a mono deck plays a two-colour deck, and counting it as mono would read two-colour games as
  mono's. The by-shape rows are decks built to their shape, the fallback rate beside them; the
  colour-count measures count every deck by what it is.
- *Independent shape draws for the two seats*: about one forced pair in four would be a mirror,
  whose result is one win and one loss whatever the shape; drawing B's shape from the three A did
  not get keeps each seat's draw uniform and makes none.
- *Card flow as a list*: the study's 17 are one cube's cards; the census has 1,592. The rule is
  written once, and the study's list is its test.
- *The card-flow tag on census.tsv*: the rule reads oracle text, which the census does not carry
  and only the engine's facts do; the run has the facts, so the tag is written beside the cards the
  run saw.

**Consequences.**

- A run with shapes off is the run it was: same bytes, same version id, same identity. A folder
  never mixes shape settings (identity, D394).
- Forced shapes change the decks, not the games: Forge's AI plays every deck as it plays any other.
  The win-rate readers (`report`, `meta`, `learn`, `compare`'s D441 measures) read forced drafts as
  ordinary drafts; filter by `shapeForced` to leave them out.
- J140 (shapes per band) runs on this, with the share computed from measured build rates.

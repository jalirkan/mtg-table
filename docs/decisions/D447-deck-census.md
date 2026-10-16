## D447 — The deck census: decks drawn straight from a band's pool at random colour makeups, played deck against deck (`cubelab.sh decks`, `census-play`, `census-read`); no drafter, no shape

*Branch `pc/deck-census`. `node tools/decisions.mjs next` gave D446 on 2026-10-16, which PR #153
(`pc/census-shapes`, open) holds; D442–D446 are taken, so this is D447.*

**2026-10-16** (written before the first census game; the engine smoke below is the only play)

**Context.** Justin's amendment of 2026-10-17 01:30 (`pc-results/HEARTBEAT.md`, the last section):
the census is there to learn how cards play with each other, so that better decks and cubes can be
built. Hand-written shapes, lean rules and land tables are biases with no truth about the game in
them, and the drafter is a middleman that decides which decks exist before a game is played (J133:
100% two-main-colour decks). He asked why the lab was not simply building data. So Phase 1–2 is
amended: decks are drawn straight from a band's pool at random colour makeups over the whole
spectrum and played deck against deck. "Mono", "two-colour" and "mostly red with a little white" are
read off the realised profiles afterwards, as continuous variables, binned only for intervals. The
old J140 (PR #153's shapes, D446) is withdrawn unposted. #153 stays for the cube-balance side, where
drafting is the question.

**Decision.** Three commands under `tools/cubelab.sh`, and the method, pre-registered here. The
only rules are mechanical: the prior, the draw, one land formula, castability and the pairing. The
code is `tools/cubelab/deckcensus.ts`, `censusplay.ts` and `censusread.ts`, and each file's header
repeats its rules.

1. **The prior over colour makeups.** k, the number of colours, is uniform over 1–5. The k colours
   are a uniformly random k-subset of WUBRG. Their shares are a flat Dirichlet(1, …, 1): k unit
   exponentials, normalised. So a two-colour makeup's main share is uniform on [0.5, 1], and 100/0,
   85/15 and 50/50 are equally likely; 40/30/30 and five-colour piles occur. Over 1,000 legacy
   decks each k is 150–250, every colour sits in about 3/5 of makeups, and the realised main share
   reaches every bin from < 0.4 to 1.0 (the test).
2. **The draw.** A card is *eligible* for a makeup when all of these hold:
   - it is drawable (supported by Forge, not a basic land) and not AI:RemoveDeck:All;
   - every printed colour is a makeup colour (colourless always passes);
   - every coloured symbol of its cost can be paid: a plain symbol by its colour, a hybrid by
     either colour, a Phyrexian or {2/C} symbol always.

   The costs are Forge's own scripts, read from the zip beside the jar; no engine is booted.
   25 spells are drawn one at a time without replacement, since the library holds one of each card:
   - A draw is colourless with probability q, the band pool's own share of colourless cards among
     its eligible nonland cards (a card with no printed colour and no coloured pip): pauper 8.4%,
     peasant 10.3%, legacy 11.4%, powered with legacy 12.9%. That is a property of the pool and the same for every deck of the band. Otherwise the
     draw picks a colour by the makeup's shares and takes a uniform eligible card of that colour.
     A gold card is in each of its colours' lists.
   - A draw is cross-band with probability `--cross-band` (0.10). It then draws from the
     neighbouring bands (D445's `NEIGHBOURS`), for the band offsets.
   - An empty list falls back: to the band, then to D445's `FILL_ORDER` bands nearest first (FILL),
     then to the other colours by share.

   The draw reads no rating, no curve, no synergy and no theme.
3. **The land formula, one for every deck.**
   - **Land count.** L = clamp(17 + round(2 × (m − 3)), 15, 18), where m is the mean mana value of
     the first 23 spells drawn. The deck keeps its first 40 − L spells. In words: the common
     17-land baseline at mean mana value 3, one land per half mana value, 15 to 18.
   - **Fixers.** From the kept spells' pips: a plain pip counts 1 to its colour, a hybrid ½ to each
     colour, a Phyrexian or {2/C} pip 1 to its colour. s_max is the largest colour's share. When
     the pips name two or more colours, the deck takes F = min(supply, round(L × (1 − s_max)))
     fixers. A fixer is a land that makes at least two of those colours, drawn uniformly: the
     band's own first, then `FILL_ORDER`'s (D445's peasant has one such land of its own, so a
     peasant deck's fixers are mostly pauper's, as a peasant cube's are). A fixer counts as a
     source of every colour it makes.
   - **Basics.** The other L − F lands are basics. First, each colour gets the sources its most
     demanding spell needs: that spell's plain pips of the colour, at least 1, less what the fixers
     give. Then the basics go one at a time to the colour furthest below its pip share of the
     basics, ties in WUBRG order.
   - Mono-coloured utility lands are never drawn. Nonland mana sources are not counted.
4. **Castability.** A spell is castable when, for each colour, the deck's sources of it number at
   least the spell's plain pips of it, and each hybrid symbol has a source of one of its colours.
   Every spell of a deck must be castable. A deck that fails is rejected and redrawn with the same
   makeup on a new stream: when its minimums exceed L − F, or when a list ran dry. After 50
   rejections the makeup itself is redrawn. Every rejection and every new makeup is counted in
   the deck's row and in `decks.json`.
5. **The bands** are census.tsv's (D445), exclusive, as `sample` draws them. The powered band has
   41 cards, 37 of them eligible, too few for a deck. So a band with fewer than 200 eligible nonland
   cards is united with its `FILL_ORDER` bands, nearest first, until it has 200, and the union is
   drawn as one uniform pool. For powered that is powered + legacy. The cross-band slice then comes
   from the union's other neighbour, peasant. A powered deck therefore carries about 5% powered
   cards, 1.5 a deck over 300 decks, as a uniform draw from that union gives. A heavier dose would be a weight, and the
   amendment forbids one.
6. **The pairing.** Within one band's folder, the decks are laid out as a run of seeded permutations
   (`rng(S, 'census-play/pairs/<r>')`), and game g is the g-th consecutive pair. A pair of one deck
   against itself takes the next deck instead. After M games every deck has played within one game
   of 2M / N; when 2M / N is a whole number, exactly that many. Game g's seed is S × 1,000,000 + g.
   It seeds Forge's `MyRandom`, and it puts side a on the play exactly when it is even. Each game is
   Bo1 between Forge's Default AI and Forge's Default AI, numbers only, with no recording.
7. **The pilots** (an addition from Justin, 2026-10-16, for J141's pilot slice). `--policy-a` and
   `--policy-b` take `plain` (the default: Forge's AI through `Bootstrap.createAiPlayer`) or
   `search`, the live search seat as `RecordMatch --policy search` builds it. That seat has the
   outlet policy on and `SearchConfig.parseLive(null)`: search-v2 at the 1.5 s budget. A search
   seat's row carries its searched and changed decisions, its mean ms per decision (search.{p,a,b},
   as the ladder's match file counts them) and its raw `search.*` counters. `--replay
   <games.jsonl>` plays exactly the listed games: the same game numbers, deck ids on the same sides
   and the same seeds, so the same first player. A slice can then be replayed under another pilot
   and compared pair for pair.
8. **The read.** Per band, on the realised profiles and never on a label:
   - the win rate by the number of colours with at least 3 spells, by the prior's k, and by
     main-colour pip share in bins < 0.4, 0.4–0.5, …, 0.9–< 1.0 and 1.0;
   - each cell with Wilson's interval (unclustered, too narrow) and the interval to read: a
     deck-clustered percentile bootstrap, 1,000 replicates;
   - per card: deck-games, wins, the win rate when in the deck, that rate shrunk toward 0.5 at
     strength 20 (meta.ts's rule), and the mean deck-profile and opponent context the Phase 3
     model will use;
   - strict JSON and markdown, with no verdict and no label beyond the bins.
9. **The confirmation rule** (the only pre-registration of an outcome, and it is a method): any
   difference the census reports — a bin, a card, a combination — is **a candidate until it holds
   on fresh seeds**: a fresh deck seed and a fresh game seed, same method, read on the same
   interval. Nothing is promoted, removed, re-banded or suggested on one census run.

**The engine smoke** (2026-10-16, beside J136 on its 7 workers, 2 JVMs, about 6 minutes in all):
- **Decks.** 40 legacy decks at seed 447 (k = 7 / 10 / 7 / 10 / 6), with 0 rejections. Over 300
  decks a band at seed 2 there were 0 rejections in every band, and about 2.2–2.3 cross-band spells
  a deck.
- **Games.** 200 plain-vs-plain games on 2 workers in 291 s, which is **2,472 games an hour**.
  There were 200 decisive games, no draw, no timeout and no engine error. Mean 16.2 turns; the first
  player won 0.525.
- **CPU.** The workers used 441 CPU-seconds, about 2.2 s a game. On 7 unloaded cores that is about
  11,000 games an hour; at the loaded rate it would be about 8,700 an hour.
- **Replay.** The first five games replayed plain vs plain gave the same winner, the same first
  player and the same turn count in all five. Two replayed with search on side a recorded 8 and 19
  searched decisions, 4 and 5 changed, at 1,340 and 1,006 ms a decision.

**Alternatives rejected.**
- *D446's shapes and lean rules* (PR #153): they are what the amendment withdraws.
- *Colourless cards in every colour's list.* Colourless would then be a third of every deck, and
  the q above would be decided by list sizes.
- *A plain uniform draw from the makeup's eligible pool.* The colourless share would then fall
  with k, so mono decks would carry four times the artifacts of five-colour ones, which confounds
  the spectrum.
- *Nested bands*, where a peasant deck could draw pauper cards too. D445's bands are exclusive and
  J140 measures within them. Nesting is a question for the band re-labelling round, not for this
  generator.
- *Every land slot drawn uniformly from the band's lands*: that is a land table by another name.
- *A castability rule from Karsten's source counts*: that is a rule about how good a mana base is,
  not whether the deck can be played.

**Consequences.**
- J140 is rewritten as the deck census, night 1: four bands × 2,500 decks × 16 games each =
  80,000 Bo1 games.
- `cube-lab.md` has a *Deck census* section in place of Phase 1's shapes text.
- `web/test/cubelab-deck-census.test.ts` holds the rules.
- `CubeLab.java` gains three things: a census match skips Forge's builder (no pool), `policyA` /
  `policyB` seat the live search seat, and a search seat's per-game counters.
- Card flow is counted by the Synergy v3 study's 17-card list (`CARD_FLOW_STUDY`) until #153's
  rule merges.

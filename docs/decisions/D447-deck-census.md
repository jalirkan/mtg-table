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
old J140 (D446's shapes) was withdrawn unposted. #153 is merged: its shapes are an option for cube
balance, compares and "does this cube draft well", where drafting is the question, and the census uses
none of them.

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

   The costs are Forge's own scripts, read from the zip beside the jar; no engine is booted. They are
   read in Forge's own tokens, which carry no slash: `W` a plain pip, `GW` a hybrid, `BP`, `GWP` and
   `PRG` Phyrexian, `2W` a two-brid, `CW` (colourless-hybrid) counted as a plain pip of its colour, `X`
   counted for the X-spell count. A **split** card's two faces must both be payable (Fire // Ice needs
   an Island and a Mountain); an adventure's, a modal double-faced or a transforming card's other face is
   an option, so only the front counts. **A plain {C} and snow {S} are not counted**: no library card
   has either, so the gap is latent, and the first card with one needs a rule here before it is drawn.
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

   **Beyond colour, the draw is pure.** A deck's type mix and curve are not chosen: within the colour
   (or colourlessness) a draw picks, the card is uniform over that colour's eligible cards of the
   pool, so a deck's creature count, its curve, its X spells and its card flow are those of a pure
   draw from the band's pool conditioned only on its colours. Only the land count looks at the curve
   (point 3), and only the castability rule (point 4) can reject a draw. Each deck records those
   outcomes as variables (point 8), so the model can separate "this card is good" from "this deck
   happened to cohere".
3. **The land formula, one for every deck.**
   - **Land count.** L = clamp(17 + round(2 × (m − 3)), 15, 18), where m is the mean mana value of
     the first 23 spells drawn. The deck keeps its first 40 − L spells. In words: the common
     17-land baseline at mean mana value 3, one land per half mana value, 15 to 18.
   - **Fixers.** From the kept spells' pips: a plain pip counts 1 to its colour, a hybrid ½ to each
     colour, a Phyrexian or {2/C} pip 1 to its colour. s_max is the largest colour's share. When
     the pips name two or more colours, the deck takes F = min(supply, round(L × (1 − s_max)))
     fixers. A fixer is a land that makes at least two of those colours, drawn uniformly: the
     band's own first, then `FILL_ORDER`'s (D445's peasant has one such land of its own, so a
     peasant deck's fixers are mostly pauper's, as a peasant cube's are). A fixer is chosen by
     what it *can* make, directly or by what it can fetch.
   - **Sources.** A basic is a source of its colour, and a nonbasic of what it taps for (its `Add`
     clauses, "any color", its basic land types, a Pathway's two faces). A **fetcher or cycler**
     (a fetchland, a Landscape, Evolving Wilds, Fabled Passage, Ash Barrens' basic landcycling) is a
     source only of the colours of the deck's lands it can find: a basic of a type it searches for,
     or, when it is not basics-only, a typed nonbasic of the deck (Flooded Strand finding a Tundra).
     So a "two-colour fixer" that reaches one colour of its deck counts as one, and each deck records
     how many of its fixers reach two of its colours (`fixersReal`).
   - **Basics.** The other L − F lands are basics. First, one at a time, a basic goes to the first
     colour (WUBRG order) with fewer sources than its most demanding spell needs: that spell's plain
     pips of the colour, at least 1, sources counted as above, so a splash behind fetchers gets the
     basic they find. Then the basics go one at a time to the colour furthest below its pip share of
     the basics, ties in WUBRG order.
   - Mono-coloured utility lands are never drawn, so **the census has no data on utility lands**: a
     known hole, not a silent one, which a later night can fill by a written rule. Nonland mana
     sources are not counted.
4. **Castability.** A spell is castable when, for each colour, the deck's sources of it (point 3)
   number at least the spell's plain pips of it, and each hybrid symbol has a source of one of its
   colours. The test checks every deck with a checker of its own that shares no code with the
   generator (a land's colours from its script's ability lines, a spell's from its raw cost tokens).
   Every spell of a deck must be castable. A deck that fails is rejected and redrawn with the same
   makeup on a new stream: when its minimums exceed L − F, or when a list ran dry. After 50
   rejections the makeup itself is redrawn. Every rejection and every new makeup is counted in
   the deck's row and in `decks.json`. **They are the weak-deck tail.** Since every deck that plays
   is castable, the decks that could not cast their spells (pips against lands) are the rejected
   draws, and they are recorded, never dropped silently: per deck (`rejections`, `makeupRedraws`),
   per band in `decks.json` and in census-read's `redraws` (rejected draws, new makeups, decks that
   came after one, the rejected share of all draws), on a line of `spectrum.md` per band, as the
   `redraws` context column of `cards.tsv`, and in every census report.
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
   It seeds Forge's `MyRandom`, and it puts side a on the play exactly when it is even. **The play
   and the draw are not balanced per deck**: each side is on the play in half the games of a run, but
   a deck's own split is what its pairings give, so `first` is recorded on every row and a reader that
   wants it controls for it. Each game is Bo1 between Forge's Default AI and Forge's Default AI,
   numbers only, with no recording. A game that hits an engine error is retried once, on fresh workers
   after the run's other games; its row is the retry's, marked `retried`, and a second error stays on
   the row and leaves the game out of the read. The pairing is prefix-stable (game g's pair does not
   depend on M), so a run's `--pairs` can be raised on resume; a smaller one is refused.
   **This is the one frozen pairing rule**: random within a band by the seeded permutations above,
   with the 10% cross-band slice inside each deck (point 2), and nothing else. A job fixes the
   night's seeds in its text before it runs (J140: deck seeds and game seeds 1401–1404, one a band;
   its pilot's games 1491–1494).
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
     strength 20 (meta.ts's rule), and the means of the deck variables and opponent context the
     Phase 3 model will use (below);
   - each deck once and each game once per pilot pair (keyed by seed, g and the two pilots), the rows
     one pilot pair unless `--mixed-pilots`.

   **The deck variables**, on every deck's row of `decks.jsonl` and carried into `cards.tsv` as
   context columns, so the model can tell a card's value from a deck that happened to cohere: the
   colour shares (each colour's share of the pips), the number of colours, colours with 3+ spells, the
   prior's k, the land count, the fixer count and how many reach two colours, the mean mana value and
   the mana-value histogram (0, 1, 2, 3, 4, 5, 6+), the creature count, the X-spell count and the
   card-flow count.
   - strict JSON and markdown, with no verdict and no label beyond the bins.
9. **The confirmation rule** (the only pre-registration of an outcome, and it is a method): any
   difference the census reports — a bin, a card, a combination — is **a candidate until it holds
   on fresh seeds**: a fresh deck seed and a fresh game seed, same method, read on the same
   interval. Nothing is promoted, removed, re-banded or suggested on one census run.
10. **What a rate means.** Random decks are mostly weaker than drafted or built ones, so every win
   rate and every card's value the census reports is **"in a random deck of this makeup"**, as
   Forge's AI plays it. `spectrum.md` says so in its header, and every census report says it.

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
- Card flow is counted by #153's oracle-text rule (`cardflow.ts`'s `isCardFlow`, D446 point 5), read
  off each card's script: 40 library cards, the same 40 the engine's facts give on the 880 they cover.
  The Synergy v3 study's 17 cards (`CARD_FLOW_STUDY`) are kept as the test's check that the rule still
  covers them.

**Amended 2026-10-16, after the cloud's review of #154 and before any census game** (`pc-jobs`
README, *#154 review*). The points above carry the amended rules; what changed and what it measured:
- *Fetchers and cyclers* (point 3, *Sources*). `produces` had counted Evolving Wilds, Fabled Passage
  and Ash Barrens as WUBRG and a Landscape as its three colours, so 12 of 1,600 decks at seed 77
  (pauper-77-00047: Qasali Pridemage and no Forest) held a spell with no real source. Now 0 of 1,600
  at seed 77 and 0 of 1,600 at seed 2, by an independent checker.
- *Cost tokens* (point 2). Forge's `GW`, `BP`, `2W` and `CW` were read as plain pips, which skewed pip
  shares and asked for sources no rule needs; 42 library spells change cost. Split cards need both
  faces.
- *The test's castability check* is a checker of its own (point 4), over 400 decks a band, and the
  suite fails without Forge's card scripts rather than fall back to printed colours.
- *census-read* de-duplicates decks and games and refuses mixed pilots unless asked (point 8).
- *Low items*: card flow by #153's rule; the deck variables; {C} and snow noted as latent (point 2);
  the play/draw note, the engine-error retry and the extendable `--pairs` (point 6).
- *Method, from the confirmed amendment's three items*: the draw beyond colour (point 2), the
  weak-deck tail (point 4), the one frozen pairing rule and the night's seeds in the job (point 6),
  what a rate means (point 10), and the utility-land hole (point 3).

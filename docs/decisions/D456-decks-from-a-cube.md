## D456 — A deck census from one cube's pool: `cubelab.sh decks --cube <cube.md>` draws D447's decks from the cube's own list, k on 1–3, with a repeat cap at k = 1 and every card's deck-share reported

*Branch `pc/decks-cube`. `node tools/decisions.mjs next` gave D454 on 2026-10-20, which PR #168
(`pc/hint-subchoices`) holds, and D455 is PR #169's (`pc/draft-deck-ledger`); D452 stays unused
(D453's note), so this is D456.*

Extends **D447** (the deck census) to a cube's pool. D447 itself is unchanged: a band's decks are
the same bytes as before this decision (checked: 300 pauper and 300 powered decks at seed 1401 against
`origin/main`'s code, `decks.jsonl` and `decks.json` identical).

**2026-10-20**

**Context.** The cloud's design for cube colour balance, Omega first (pc-jobs README, NOTES TO THE PC,
2026-10-19 23:55 UTC): arm C is "a census on Omega's pool, k in {1,2,3} only, same land/castability
rules", giving the pool's intrinsic payoff by colour, beside the drafted decks' (arm B). It asked for
`decks --cube <file>` as a small PR: the pool is the cube document's cards, Forge-supported only, the
same eligibility and land rules as D447, a test that a 180-card pool yields castable 1–3-colour decks at
every k; and, since "180 cards at k=1 per colour may repeat cards heavily", each card's deck-share
reported and the repeat capped.

**Decision.**

1. **The pool** (`cubePool`) is the cube document's cards as `tools/cubelab/cube.ts` parses them, each
   once, joined to the census's population (`library-pool.tsv` + `census.tsv` + the costs, lands and card
   flow from Forge's scripts, exactly as D447 builds it). A card is drawn when it is in the library,
   Forge supports it, it is not a basic land and it is not `AI:RemoveDeck:All` — D447's `eligibleFor`.
   Every card left out is named in `decks.json` by reason (`notInLibrary`, `unsupported`, `aiRemoved`,
   `basicsListed`). Omega: 180 of 180 drawable.
2. **The draw** is D447's rules 1–4 on that pool (`drawDeck`, the band path's own function): the makeup's
   k uniform on `--k` (default **1, 2, 3**; 4- and 5-colour decks are not what a two-player 180-card cube
   plays, and the balance read excludes them), its colours a uniform k-subset, Dirichlet(1, …, 1) shares;
   25 spells without replacement, colourless with the **cube's own** colourless share q (Omega 0.114),
   else a colour by the shares and a uniform eligible card of it; one land formula; fixers from the cube's
   own lands that make 2+ of the pip colours; basics as needed (a cube lists none, and every cube deck
   takes basics freely); every spell castable from the deck's own sources, or the draw is rejected and
   redrawn, counted. **No cross-band slice and nothing to fill from**: a cube is one pool, so a list that
   runs dry falls back to the other colours by share and otherwise rejects the draw (D447's last
   fallback). Mono-coloured utility lands are never drawn, as in D447 (Omega's Mishra's Factory and
   Mutavault: never drawn). The streams are `deck-census/cube:<name>/<i>/…`; the deck id is
   `<name>-<seed>-<i>`; the deck's `band` field is `cube:<name>`, which census-read reports as a group of
   its own beside the bands (it read only the four bands before, and would have dropped a cube's games
   silently).
3. **The repeat cap: a card is in at most max(10, floor(0.25 × N1)) of the run's N1 k = 1 decks**
   (`--max-share-k1`, default 0.25). A card that reached it is out of every later k = 1 deck's pool; a
   k = 1 deck that cannot then be drawn is rejected and redrawn as D447 says (its makeup too, after 50),
   counted. Because a removed k = 1 deck lowers N1, the run is drawn again with the cap its own N1 gives
   until the two agree (`drawCubeRun`), so the bound holds on the run as written. Until a card reaches the
   cap the decks are the uncapped draw's, deck for deck.

   *Why 0.25 of the k = 1 decks, and why not lower.* Measured on Omega, 2,000 decks at seed 1601
   (670 / 666 / 664 at k = 1 / 2 / 3):
   - **Within its colour the repeat is structural.** A mono deck keeps about 23 spells from its colour's
     24 cards and the 18 colourless ones, so a coloured card is in a median 0.80 (up to 0.91, Dark
     Confidant) of its colour's mono decks: Omega supports about one mono list a colour. No per-card cap
     can go below that floor without making mono decks impossible: a cap of 0.5 of a colour's mono decks
     leaves each mono deck about 12 eligible cards of its colour for 21 slots, so every one would be
     rejected and k = 1 would vanish, which the design forbids. So the within-colour repeat is
     **reported, not capped**: `card-shares.tsv` gives every card's share of the decks of each k whose
     makeup admits it, and a reader treats a colour's k = 1 decks as one list played many times.
   - **Across the k = 1 decks a coloured card's ceiling is about a fifth**: its colour's mono decks are a
     fifth of them. Omega's largest is 0.194 (Bonecrusher Giant), median 0.157; a colourless card's is
     about 25 / (the pool's nonland cards), 0.16 here. 0.25 sits five standard deviations of a colour's
     mono share above that ceiling at N1 = 670, so on Omega at J145's size **the cap never binds** and the
     decks are D447's draw exactly (the test holds all 2,000 equal).
   - **Where it binds** is the case the cap is for: a pool whose mono decks pile onto fewer colours than
     five, so the same cards fill most of the k = 1 decks. A mono-heavy test cube (60 white cards, 15 of
     each other colour, 12 colourless) can only draw mono decks in white: uncapped, 197 of 2,000 decks
     are k = 1 and one white card is in 88 of them (0.45); capped, the run keeps 30 k = 1 decks (the
     floor of 10 uses binds), no card is in more than 10, and the rest of the k = 1 makeups were redrawn
     (964 new makeups, all counted). That is "size k = 1 to what the pool supports": the pool cannot
     give many distinct mono decks, so the census draws few.
   - *The floor of 10* keeps a short run (a pilot, a test) from being starved: at 400 decks a colour's
     share of ~130 mono decks has an SD of 0.035, and a cap of floor(0.25 × N1) alone would bind by
     chance there.
4. **The report.** `decks.json` (decision D456) carries the cube, its sha256, the pool's counts and every
   card left out, q, k's counts, colours with 3+ spells, the main-share bins, the variables' means, the
   rejections and new makeups (the weak-deck tail), the repeat cap (share, floor, N1, the per-card count,
   the cards that reached it, the k = 1 decks drawn while one was out, the largest k = 1 share, the rounds),
   and the card shares' summary (overall, and per k of that k's decks and of the admitting decks: max,
   median, top ten) beside `card-shares.tsv`, a row a card: colours, mana value, land, decks and share,
   and per k its decks, share, admitting decks and share of those. A fixer is "admitted" by a makeup when
   it can make two of its colours.

**Rejected.**
- *A per-card cap on a card's share of its colour's mono decks* (the literal "a card in at most some share
  of the k = 1 decks", read within a colour): below the structural floor (0.8 on Omega) it removes mono
  decks, at or above it it caps nothing. Reported instead.
- *Mono decks that fall back to colourless when their colour runs dry*: it would change what a mono deck
  is (half artifacts under a binding cap) and bias the colour's payoff.
- *A cap from the planned N1 alone* (the decks whose first makeup is k = 1): when the cap removes k = 1
  decks the run has fewer than planned, and the bound then fails on the run as written (the mono-heavy
  cube: 0.45 of its actual mono decks). Hence the rounds.
- *A running cap* (the j-th k = 1 deck capped at floor(0.25 × j)): it binds on early-run noise (18
  Omega cards and 28 decks at 2,000 decks), changing decks on a balanced cube for nothing.
- *The cross-band slice for a cube*: a cube is a fixed list and the census measures that list.
- *A new deck generator for cubes*: the band path's own `drawDeck` with a different context is one
  implementation of D447's rules, not two.

**Consequences.**
- `tools/cubelab/deckcensus.ts`: `drawDeck` (the band path's former body, with an optional per-k card
  block), `makeupOf(r, ks)`, `cubePool`, `cubeCtx`, `drawCubeRun`, `cardShares`, `cubeDecksCommand`;
  `DeckRecord.band` is a band or `cube:<name>`. `decks --cube` refuses `--band` and `--cross-band`, and a
  band run refuses `--k` and `--max-share-k1`.
- `tools/cubelab/censusread.ts` reads every group its decks name: the four bands, then each cube.
- `census-play` needs nothing new: it reads `decks.jsonl`'s ids and files.
- `web/test/cubelab-deck-census.test.ts`: Omega's decks at every k castable by the independent checker
  and drawn from the cube alone, a mono deck of every colour; the command's bytes twice, its report and
  refusals; the cap equal to the uncapped draw on Omega and holding where it binds; census-read's cube
  group.
- J145 (balance-Omega, pc-results `drafts/`) is the first user: arm C, 2,000 decks × 8 games.

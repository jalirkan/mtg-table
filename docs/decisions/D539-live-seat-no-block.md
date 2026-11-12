## D539 — The live search seat is search-v3: search-v2 with its block search taken out (`what=pa`), adopted on J211's pre-registered rule and the owner's yes

*Branch `pc/live-seat-no-block`, off main `31daf3ec` (D538's merge). Amends D412 (the live seat's version and
defaults) and reads J211 (`results/J211/` on `pc-results`), the head-to-head D536 pre-registered. Code:
`SearchConfig`'s two live constants and the comments that name the live version, the self-tests, the ladder's two
notes, the watch bots' player id, protocol amendment M82 and the docs that say which search the game plays.
**Written as text while J212 and J213 held the machine alone: no line of this lane was compiled or run when it was
written**; what the build, the self-tests and the gate showed is the *Verification* paragraph, filled in after.*

**2026-11-11**

**Context.**

- **J210 named the candidate** (D536). Of D535's eight corners against `forge-default`, the one searching priority
  plays and attacks but not blocks, `search-v2-no-b` (`what=pa`, hash `59505e241363`), was the only partial arm
  within D535's 0.014 of the full search: 0.6242 [0.6034, 0.6450] against `search-v1-anytime`'s 0.6258 [0.6048,
  0.6468], the block search taken last +0.0017 [−0.0148, +0.0182] by deal (D536 point 2).
- **D536 pre-registered the head-to-head and what a HOLDS leads to.** One fixed 4,800-game match on the confirm set,
  `search-v2-no-b` (A) against `search-v1-anytime` (B, the live seat's config, `cdd55e02a89c`), on blocks
  931,900,000–931,900,599, deals no match had played; NO-BLOCK SEAT HOLDS when the Elo interval's lower end is above
  −10 (point 7). Point 9: a HOLDS makes the arm a live-seat candidate, and the owner says yes or no in one word.
- **J211 played it and read HOLDS** (2026-11-11 02:53 to 11:34, mtg-table `d1d6b20f`, alone, 7 workers;
  `report.md`, `verdict.json`, `summary.md`). Complete and valid: 4,800 of 4,800 games, 2,400 mirrored pairs, 0
  draws, 0 errors, 1 timeout, the names, hashes and blocks D536 point 7 checks, A searching no block decision.

  | | score [95%] | Elo [95%] | search s a game | searched decisions (p / a / b) | ms a searched decision |
  |---|---|---|---|---|---|
  | `search-v2-no-b` (A) | 0.4969 [0.4893, 0.5045] | **−2.2 [−7.4, +3.1]** | 19.345 | 77,732 / 24,816 / 0 | 905.5 |
  | `search-v1-anytime` (B) | | | 21.554 | 78,521 / 24,775 / 9,674 | 915.8 |

  The lower end, −7.4, is above −10: **HOLDS**. The interval holds 0, so the two are indistinguishable; searching
  blocks buys +2.2 Elo [−3.1, +7.4] head to head. D519's reading of the same line, as information: NOT SHOWN. The
  saving is 2.209 search seconds a game, ×0.8975 (10%); B's 9,674 searched block decisions, about two a game at
  967 ms each, are most of it, and where B searched a block it changed Forge's block 23.8% of the time (2,299 of
  9,674) for nothing measurable. The kinds both sides search were searched alike (priority changed 19.2% against
  19.5%, attacks 14.9% against 14.7%; budget fallbacks 0.5% each).
- **The owner's word**: "yes", 2026-11-11, to moving the live seat to the no-block search.

**Decision.**

1. **A new search version, `search-v3` = search-v2 + `what=pa`.** `SearchConfig.LIVE_VERSION` becomes
   `"search-v3"` and `SearchConfig.LIVE_DEFAULTS` becomes `"what=pa,anytime=1"`. `parseLive` is unchanged: it
   parses `LIVE_DEFAULTS` before the caller's keys, so a key the caller names wins. The live seat prints as
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1`, search-v2's string with `what=pab`
   made `what=pa` and nothing else.
2. **Where it takes effect: every path through `parseLive`.** `MtgTable --ai-policy search` / `--ai-search` (so a
   bare `./scripts/play.sh`, the match launcher's search AI, Play vs Forge and the opponent picker, D333's
   `--ai-search ms=N` budget included: a picked budget keeps `what=pa`); `RecordMatch --policy search` (D440: the
   watch bots' search player, and any recording run with that flag); and `CubeLab.liveSearchSeat`, which seats `census-play`'s
   `--policy-a/-b search` pilots (D447). It takes effect when the engine restarts.
3. **What a player sees.** The AI answers a block declaration at Forge's own speed, with no thinking pause where
   search-v2 thought about a second; its main-phase plays and attacks are searched exactly as before. It plays the
   same strength as search-v2 within J211's interval (−7.4 to +3.1 Elo), and spends about 10% less thinking time a
   game on this machine.
4. **What does not change.** `SearchConfig.parse` and `defaults()` — `what=pab` and `anytime` off — so the bench,
   the cube lab's seat specs, the move atlas's seats, the label probe and every ladder player keep meaning what
   their games were played under. The ladder names and hashes: `search-v2-no-b` keeps `59505e241363` and is how
   the ladder rates search-v3 (no `search-v3` alias is registered: one name per config, as D412 point 3 kept
   `search-v1-anytime` for search-v2), `search-v1-anytime` keeps `cdd55e02a89c`; both notes say what they are now.
   The wire's shape: `hello_ok` is unchanged, and the session header's `ai` (M62) keeps its four keys —
   amendment **M82** says only that `version` names `"search-v3"` when the seat runs the live default. A log
   written before D539 says `"search-v2"`, which is what that game played; `tools/ml/human_collect.py` carries any
   `search-v<n>` as written. `--ai-search` with knobs of its own names no version (`null`), as since D414.
5. **How to get search-v2 back:** `--ai-search what=pab` (`./scripts/play.sh -- --ai-search what=pab`), whose
   config is `search-v1-anytime`'s exactly; `--ai-search anytime=0,what=pab` is search-v1.
6. **The watch bots' player id** (`tools/watch-runner.mjs`, `tools/cubelab/watch.ts`, `docs/watch-bots.md`)
   becomes `search-v3`, labelled so, because the seat it starts is the live one. `search` and `search-v2` stay
   accepted as aliases of it, so a request ForgeCoach stored before D539 still starts; they answer as
   `search-v3`. `watch.ts`'s `seatSpecOf`, which spells the live seat by hand for `run.json`'s `profiles` (a seat
   spec is parsed by `parse`, not `parseLive`), becomes `<profile>+outlets+search:what=pa,anytime=1`.

**Under D509: the atlas's seat is unchanged.** D509 point 1 freezes `bridge/src` for the atlas's population, and a
lane that changes it between landings writes the argument that the seat's plays and listings are unchanged. This
lane changes, under `bridge/src`, two string constants in `SearchConfig.java`, comments in `SearchConfig.java`,
`SearchPolicy.java`, `MtgTable.java` and `RecordMatch.java`, and checks in `DecisionSelfTest.java`. The argument:

- **The constants are read only by `parseLive`** (and by `MtgTable`'s start line and session header, and
  `RecordMatch`'s start line, which print them). `parse()` and `defaults()` are untouched, byte for byte; the
  coordinator checks that `git diff main -- bridge/src/mtgtable/ai/SearchConfig.java` touches javadoc and the two
  constants only.
- **No atlas seat goes through `parseLive`.** The atlas's units are seated in `tools/cubelab/CubeLab.java`, which
  this lane does not touch: the random seat by `ExploreMath`'s settings, the observing seat by
  `SearchConfig.parse("observe=1,cands=" + …)` (`CubeLab.java:486`), the plain seats by `SeatSpec.parse` →
  `SearchConfig.parse` (`SeatSpec.java:52`). An atlas unit's pilots are `random` and `plain`
  (`tools/cubelab/atlas.ts:432`, `:444`), never `search`, so `liveSearchSeat` (`CubeLab.java:703`) is never reached
  from a unit. D538's label probe seats each ladder player by its seat config through `SeatSpec.parse`
  (`tools/cubelab/AtlasProbe.java:115`, `:383`).
- **The seat-identity golden is untouched and is not expected to move.** Its search game is an explicit seat spec,
  `Default+search:ms=60000,cands=4,rounds=2,maxrounds=2,seed=1` (`tools/cubelab/seatidentity.ts:47`), through
  `parse`; `fixtures/cubelab/seat-identity.json` is not edited.
- **The evidence the coordinator runs:** gate step 12m (`cubelab.sh seat-identity`, every decision record of the
  four golden games identical), the decision self-test (`DecisionSelfTest`, which holds `parse("")` at `what=pab`
  with `anytime` off and the live seat at search-v2's every field but `blocks`, by reflection), and the full gate.
  A derivation whose `seat_code` check diffs `bridge/src` will see this diff; this paragraph is its admission, as
  D511's was for its `CubeLab.java` diff.

One lab consequence that is not the atlas's: `census-play --policy-a/-b search` seats the live seat by definition
(D447), so a census folder whose games straddle D539 holds search-v2 and search-v3 under one pilot name, `search`.
Its rows do not say which; a reader splits such a folder by the games' dates, or does not pool across D539.

**Rejected.**

- **Keeping the name `search-v2` for the new seat.** The seat plays differently (it never searches a block), and
  the version is a record: the session header's `ai.version` (M62) labels the owner's games in the human test set
  (D414), and the engine's start line names it. A game against search-v3 labelled search-v2 would pool two AIs as
  one.
- **Changing `parse()`'s default to `what=pa`.** Every ladder player's config, the bench's scenarios, the cube
  lab's seat specs, the atlas's seats and seat-identity's golden are parsed by it; their hashes and their games
  would silently change meaning (D318, D412 point 2). The live default is `parseLive`'s alone, as D412 made it.
- **Removing the block search code.** `what=pab` stays a measured, registered config (`search-v1-anytime`, and the
  bench, the label probe and every ladder arm with `b` in `what`), `--ai-search what=pab` gives it back live, and
  J211 bounds the block search's worth at about +7 Elo, not at zero: a later seat may want it.
- **Registering `search-v3` as a ladder name.** It would be a second name for `59505e241363`; the ladder rates by
  hash and seeds batches by name, so a match of the alias would replay the same few seeds (D535's test says why).
- **Renaming the watch bots' id without the old one as an alias.** A stored `playerB: "search-v2"` from ForgeCoach
  would then be a 400 for a seat that still exists under another name.

**What is unverified.**

- One opponent and one deck set: J211 played search-v2 itself on the confirm set's 30 deck pairs, as every search
  number since D398. Against a person, on other decks, the block search's worth is not measured.
- The seconds are this machine's (D388): 19.3 against 21.6 a game on 7 workers.
- The block search may be worth up to about 7 Elo (J211's upper end for what searching blocks buys, +7.4); the
  adoption accepts that for 10% of the thinking time, as D536's −10 bar was written to.
- Whether the owner notices the faster blocks or misses better ones: nothing here measures play against a person.
- D537's and D538's pre-registered reads name `search-v1-anytime` by name and hash as "search-v2" and "the live
  search"; they stand as written, and a sentence of theirs about the live seat is about search-v2 after D539.

**Verification (filled in by the coordinator after the build and gate):**

*(placeholder — the build, `DecisionSelfTest`'s count and failures, the web tests, `test_human.py`, the
watch-runner and match-launcher self-tests, gate step 12m and the full gate's line go here)*

**Follow-up.** The seat-queue row for `search-v2-no-b` (D509, `~/code/pc-results/study/seat-queue.md`, in
pc-results, which this lane does not write) is marked landed by D539 at the merge. The cube lab's follow-up 54 is
closed by this decision; it adds none.

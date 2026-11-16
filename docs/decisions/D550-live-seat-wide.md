## D550 — The live search seat is search-v5: search-v4 with D544's `stackwin=1`, `passwin=1` and `dactiv=1`, adopted on J217's and J221's matches, D548's STANDS and the owner's yes

*Branch `pc/live-seat-wide`, off main `6fd2e726d` (D549's merge, J222's pin). Amends D412, D539 and D546 (the live
seat's version and defaults) and reads J217 (D544) and J221 (D548) (`results/J217/` and `results/J221/` on
`pc-results`: `summary.md`, `verdict.json`). Code: `SearchConfig`'s two live constants and the comments that name the
live version, the decision self-test, the ladder's two notes, the watch bots' player id, protocol amendment M85 and
the docs that say which search the game plays — the same places D546 changed, and no other. Written as text while
J222 (`alone: yes`) held the machine, with no Java, build, game or test run: the *Verification* section is what is
owed after J222 ends, and nothing in this file claims a run that did not happen.*

**2026-11-16**

**Context.**

- **J217 read D544's player on the confirm set: SMALL GAIN** (2026-11-14 05:00 to 14:23, mtg-table `9fb702f`, alone,
  7 workers). `search-v3-wide` (`b95340935592`: search-v4's config plus `stackwin=1`, `passwin=1`, `dactiv=1`) against
  `search-v3-declined-instant` (`af6771947a25`, the live seat since D546, search-v4), one fixed 4,800-game match,
  blocks 725,900,000–725,900,599: 0 draws, 0 engine errors, 1 timeout, all 25 checks passed; 2,448 wins, score 0.510
  [0.5021, 0.5179], **+6.9 Elo [+1.5, +12.4]**. Under D544 point 15 a live-seat candidate for the owner, as the
  increment on the live seat. D548 replicated it before asking.
- **J221 read the same two players on the dev deck set: NOT SHOWN alone; the pooled line STANDS** (2026-11-15 01:31
  to 11:02, mtg-table `afe4f3e`, alone, 7 workers, 5 to 7 under memory pressure). The same hashes and code on
  `tools/ai-bench/pairs-dev.txt`, blocks 199,900,000–199,900,599: 3 draws, 3 engine errors, 0 timeouts (the cap is
  240), 30 deck pairs at 160 games each; 2,423 wins of 4,797 decisive games, score 0.5052 [0.4981, 0.5123], **+3.6 Elo
  [−1.3, +8.6]**, indistinguishable. D548 point 8's pooled line, 4,799 pairs over the two sets: score 0.5076 [0.5023,
  0.5129], **+5.3 Elo [+1.6, +9.0]**. Under D548 point 9 the recommendation to adopt `search-v3-wide` **STANDS**,
  carried by the pooled line and not by J221 alone (`recByPooled` 1, `recByAlone` 0): J221 is not a measured loss and
  the pooled lower end is above 0.5.

  | | Elo [95%] | A s a game | B s a game | ratio | A / B searched decisions | ms a searched decision (A / B) | union changed a game |
  |---|---|---|---|---|---|---|---|
  | J217, confirm set | +6.9 [+1.5, +12.4] | 23.5 | 21.6 | ×1.0855 | 124,282 / 113,705 | 907 / 913 | 0.279 |
  | J221, dev set | +3.6 [−1.3, +8.6] | 23.4 | 21.3 | ×1.095 | 125,130 / 114,453 | 897 / 895 | 0.303 |
  | pooled, 4,799 pairs | +5.3 [+1.6, +9.0] | | | | | | |

  Every key fired above D544 point 13's floor on both sets. A game, J217 / J221: `stackwin` 1.293 / 1.541 windows and
  0.150 / 0.179 changed decisions; `passwin` 0.415 / 0.418 and 0.040 / 0.032; `dactiv` 1.705 / 1.769 and 0.090 /
  0.093. Stack windows refused (the carry could not rebuild the stack faithfully, so Forge answered unsearched): 598
  (a share of 0.088) and 551 (0.069). Retries (a widened pick that did not happen), all `dactiv`: 7 and 5 in 4,800
  games each. The cost is more decisions searched (about 2.2 more a game), not slower ones. The seconds are this
  machine's (D388).
- **What the size means.** About +5 Elo, at most about +9, a small gain: J217 read above D544's registered expectation
  (about +3), J221 below J217, and the two sets agree within their widths. The pooled line holds the match that
  triggered the replication and leans upward by that selection (D548 point 8 said so before any J221 game).
- **The owner's word**: yes, 2026-11-16 11:20 EST, to adopting `search-v3-wide` as the live seat.
- **J222 is running** (D549; posted 2026-11-16 11:09, pinned to `6fd2e726d`, `alone: yes`): `search-v3-wide-t1-x2`
  (`709c83cc4d48`) against `search-v3-declined-instant` (`af6771947a25`) by their ladder names. See point 7.

**Decision.**

1. **A new search version, `search-v5` = search-v4 + `stackwin=1,passwin=1,dactiv=1`.** `SearchConfig.LIVE_VERSION`
   becomes `"search-v5"` and `SearchConfig.LIVE_DEFAULTS` becomes
   `"what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1"`; `lands` stays off, the clock stays
   1,500 ms with 12 rounds, the horizon stays `turns=0` with `aturns` unset. `parseLive` is unchanged: it parses
   `LIVE_DEFAULTS` before the caller's keys, so a key the caller names wins. The live line, `SearchConfig.toString`
   of the live parse, which prints no `seed`, goes from
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1` to
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`:
   search-v4's string with `,stackwin=1,passwin=1,dactiv=1` appended and nothing else — exactly `search-v3-wide`'s
   seat config without its `Default+outlets+search:` prefix and its `seed=0` (`toString` prints the three after D540's
   keys, in D544's order, so the strings match character for character). `MtgTable`'s start line names it
   `search-v5, D412, D539, D546, D550`.
2. **Where it takes effect: every path through `parseLive`**, as D539 point 2 and D546 point 2 listed them.
   `MtgTable --ai-policy search` / `--ai-search` (a bare `./scripts/play.sh`, the match launcher's search AI, Play vs
   Forge and the opponent picker; D333's `--ai-search ms=N` budget keeps all three keys); `RecordMatch --policy search`
   (D440: the watch bots' and `scripts/spectate.sh`'s search player); `CubeLab.liveSearchSeat`, which seats
   `census-play`'s `--policy-a/-b search` pilots (D447); and `tools/llm-seat/run-match.mjs --ai-policy search`. It
   takes effect when the engine restarts.
3. **What a player sees.** Three more kinds of moment where the AI may think before it answers, each at the same
   budget as before (about 1.5 s at most a decision; D546's played session's longest was 1,931 ms):
   - **When the player's spell or ability is on top of the stack** (`stackwin`, D544 point 3), on either turn and in
     any step, and the AI holds a castable aimed play or Forge itself wants to respond: Forge's answer, passing and
     the AI's aimed plays (counter-magic among them) are rolled out with the stack carried onto every copy. Where
     search-v4 answered a player's spell at Forge's speed, search-v5 may pause and then respond, or pass. A stack the
     carry cannot rebuild faithfully (a face-down spell among others) is answered by Forge at once, as before.
   - **In the player's declare-attackers step (attackers declared), the player's end step, and the AI's own
     declare-blockers step with attackers in it** (`passwin`, D544 point 4), on an empty stack, where Forge passes and
     the AI holds an aimed play it could cast: the play is rolled out against passing.
   - **In the AI's own main phases, the equip and loyalty abilities Forge's AI declines** (`dactiv`, D544 point 5)
     are candidates: the AI may now equip, or use a planeswalker ability, that Forge would have left, and where it
     had nothing else to weigh it may now pause before passing. One widened activation per source a turn; an equip
     aimed at the creature it is already on is dropped.
   - Its main-phase plays, attacks, declined spells and instant-speed windows are searched as in search-v4; its
     block declarations are still Forge's, with no pause (D539).
   - **Thinking time**: 8.5 to 9.5% more search time a game on this machine (23.5 against 21.6 s in J217, 23.4
     against 21.3 in J221), about 2 s more over a whole game, from about 2.2 more searched decisions a game at the same
     time each. Head to head against search-v4 it measured +6.9 and +3.6 Elo on two disjoint sets of 30 deck pairs,
     +5.3 [+1.6, +9.0] pooled: a small gain, under D519's +15 line.
4. **What does not change.** `SearchConfig.parse` and `defaults()` — `what=pab`, `anytime` off, D540's and D544's keys
   off — so the bench, the cube lab's seat specs, the move atlas's seats, the label probe and every ladder player keep
   meaning what their games were played under. The ladder's names, params and hashes: `search-v3-wide` keeps
   `b95340935592` and is how the ladder rates search-v5 (no `search-v5` alias is registered: one name per config, as
   D546 point 4 kept `search-v3-declined-instant` for search-v4), `search-v3-declined-instant` keeps `af6771947a25`;
   both notes say what they are now, and the notes are the only lines of `tools/ai-ladder/players.json` that change.
   The ladder hashes a player by `kind` and its resolved `params` (`configHash`, `tools/ai-ladder/registry.ts`), so a
   note is outside every hash; the lane checked that every player's every field but the two notes is unchanged
   (*Verification*). The wire's shape: `hello_ok` is unchanged, and the session header's `ai` (M62) keeps its four
   keys — amendment **M85** says only that `version` names `"search-v5"` when the seat runs the live default. A log
   written before D550 says `"search-v4"` (or `"search-v3"`, `"search-v2"`), which is what that game played;
   `tools/ml/human_collect.py` carries any `search-v<n>` as written, and `tools/check-redaction.mjs` already accepts
   `^search-v\d+$` and any `config` starting `ms=<n>,`. `--ai-search` with knobs of its own names no version
   (`null`), as since D414.
5. **How to get search-v4 back:** `--ai-search stackwin=0,passwin=0,dactiv=0` (`./scripts/play.sh -- --ai-search
   stackwin=0,passwin=0,dactiv=0`), whose config is `search-v3-declined-instant`'s exactly (the key spellings are
   `SearchConfig.parse`'s `case "stackwin"`, `case "passwin"`, `case "dactiv"`, each `0` or `1`). Each key alone can be
   named off. `--ai-search declined=0,instant=0,stackwin=0,passwin=0,dactiv=0` is search-v3, and with `what=pab` and
   then `anytime=0` before them search-v2 and search-v1. The session header names no version for any of them (M85).
6. **The watch bots' player id** (`tools/watch-runner.mjs`, `tools/cubelab/watch.ts`, `docs/watch-bots.md`) becomes
   `search-v5`, labelled so, because the seat it starts is the live one. `search`, `search-v2`, `search-v3` and
   `search-v4` stay accepted as aliases of it, so a request ForgeCoach stored before D550 still starts; they answer
   as `search-v5`. `watch.ts`'s `seatSpecOf`, which spells the live seat by hand for `run.json`'s `profiles`, becomes
   `<profile>+outlets+search:what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`. ForgeCoach needs
   nothing first: its watch page reads any `search-v<n>` id (`SEARCH_ID`, ForgeCoach#217) and its pickers send the
   policy `search`. Its words go staler — the cube lab's 63, widened.
7. **J222 is untouched, and what it reads after this.** J222 plays two players by ladder name and hash on the code of
   its pin `6fd2e726d`, which this lane does not move; neither player goes through `parseLive`, and no registered
   name, param or hash changes here, so nothing J222 plays, checks or reads changes. Its premise changes the way
   D548 point 9's last bullet described: J222's B, `search-v3-declined-instant`, is no longer the live seat, so a
   SHOWN or SMALL GAIN names `search-v3-wide-t1-x2` a candidate (D549 point 7) as an increment over search-v4 and
   over neither of its parts; the increment over search-v5 (the deeper horizon at a 3 s clock on top of the wide
   windows) is what a later match against `search-v3-wide` would measure. D549's readings stand as registered;
   this decision does not amend them.
8. **A `census-play` folder begun before D550 with a `search` pilot is never resumed or extended** (D539's rule as
   D546 extended it): `plan.json` binds the pilot as the string `search`, so a folder whose games straddle D550 would
   hold search-v4 and search-v5 under one name. A run after D550 starts a folder of its own; no reading pools the two.

**Under D509: the atlas's seat is unchanged.** D509 point 1 freezes `bridge/src` for the atlas's population, and a lane
that changes it between landings writes the argument that the seat's plays and listings are unchanged. This lane
changes, under `bridge/src`, the same five files D546 did: two string constants and javadoc in `ai/SearchConfig.java`,
a comment in `ai/SearchPolicy.java`, comments and the start line's words in `MtgTable.java`, a comment in
`RecordMatch.java`, and checks in `ai/DecisionSelfTest.java`. The argument is D546's, re-read on this lane's tree:

- **The constants are read only by `parseLive`** (and by `MtgTable`'s start line and session header, and
  `RecordMatch`'s start line, which print them). `parse()` and `defaults()` are untouched; `git diff main --
  bridge/src/mtgtable/ai/SearchConfig.java` changes javadoc and the two constants only (on this lane, the four `-`/`+`
  lines that are not comments are the two constants before and after).
- **No atlas seat goes through `parseLive`.** The atlas's units are seated in `tools/cubelab/CubeLab.java`, which this
  lane does not touch: the observing seat by `SearchConfig.parse("observe=1,cands=" + …)` (`CubeLab.java:486`), the
  plain seats by `SeatSpec.parse` → `SearchConfig.parse` (`SeatSpec.java:52`). An atlas job carries no
  `policyA`/`policyB` key (`baseJob`, `tools/cubelab/atlas.ts:406-408`; the `random` and `plain` at `:432` and `:444`
  are the rows file's labels), and `CubeLab` reads the pilot from that key (`CubeLab.java:478`), so `liveSearchSeat`
  (`CubeLab.java:703`) is never reached from a unit. The bench seats its specs through `SearchConfig.parse`
  (`tools/ai-bench/AiBench.java:188`); D538's label probe seats each ladder player through `SeatSpec.parse`
  (`tools/cubelab/AtlasProbe.java:115`, `:383`). Under `tools/`, `parseLive` appears only at `CubeLab.java:705`
  (`liveSearchSeat`) and in a comment at `:139`.
- **The seat-identity golden is untouched and is not expected to move.** Its search game is an explicit seat spec,
  `Default+search:ms=60000,cands=4,rounds=2,maxrounds=2,seed=1` (`tools/cubelab/seatidentity.ts:47`), through
  `parse`, with none of the five widening keys; `fixtures/cubelab/seat-identity.json` is not edited and must not need
  to be.
- **The evidence owed** (*Verification*): gate step 12m (`cubelab.sh seat-identity`), the decision self-test (which
  holds `parse("")` with the three keys off and the live seat at search-v4's every field but the three, by
  reflection), and the full gate. The next atlas night's derivation diffs `bridge/src` in its `seat_code` check and
  must admit exactly these five files there (`ai/SearchConfig.java`, `ai/SearchPolicy.java`,
  `ai/DecisionSelfTest.java`, `MtgTable.java`, `RecordMatch.java`: two constants, comments, a start line's words and
  self-test checks), beside D544's and D546's, and nothing else under the frozen paths, or that night is not posted
  under D509 point 1; this paragraph is the admission.

**Hidden information (hard rule 8) and threads (hard rule 3).** Nothing new on the wire: no frame, field, `Snap` call,
`CardView` or engine string is added, and the session header's `config` string gains three key names, no card. The
question that is new is whether a seat that plays a *person* may run the three keys, since D544 wrote its paragraph
for a ladder seat whose opponent is another search. Key by key, as read on this lane:

- **`stackwin`** carries the stack onto every rollout copy (`LenientGameCopier.carryStack`, asked only by
  `SearchPolicy.playout` under `WIDE_STACK`, `SearchPolicy.java:3884`). The stack is a public zone; its items' sources,
  targets, X, modes, kicker and cast-from zone are public once cast, and the cards paid for an item are public once
  paid. The carry refuses, and Forge then answers unsearched: **every face-down item** (`faceDown`: `GameCopier`
  would rebuild a Stack-zone card face up from its paper card, so a rollout would see a face the seat cannot); **every
  item with a triggering object that is a card the seat may not see** (`hidden`, by the determinizer's own rule: in a
  library, or in another player's hand, and not `mayPlayerLook(seat)` — a draw trigger's drawn card in the person's
  hand); and the other reasons of D544 point 2. Against a person these refusals are what keep the person's hidden
  cards out of a carried item, exactly as they keep the ladder opponent's out. A refusal's detail is ids and reason
  words only (D544's skeptic, finding 4b), and at a live seat it reaches nothing a person sees: `PolicyControllerAi`
  keeps the search's event lines in memory, read only by `tools/ai-bench/AiBench.java:593`; `MtgTable` reads neither
  the events nor the counters; `RecordMatch` prints the counters (key names with reason words, and integers) to its
  own stdout, never to a frame.
- **`passwin`** adds no listing of its own: in three more steps it lists D540's aimed declined spells — the seat's own
  castable spells, aimed by Forge's targeting among legal targets — which the live seat has listed in its main phases
  since D546. Whether the step is a pass window reads the phase, the combat's attackers and an empty stack, all
  public.
- **`dactiv`** lists the seat's own activated abilities on its own permanents that Forge declines, aimed by Forge's
  forced targeting; the AI memory it saves and puts back is the seat's own.
- **The opponent's conditional pass** (D544 point 6) is given only inside rollouts, and whether the opponent "has
  passed" is read from the stack's instance ids and the seat's own record of its previous priority decision (public;
  `SearchPolicy.notePriority`, kept per game: each game gets a new `PolicyControllerAi` and so a new `SearchPolicy`,
  `PolicyLobbyPlayerAi.createIngamePlayer`).
- **Every rollout redeals what the seat cannot see** (`Determinizer`), unchanged; the Stack zone is not redealt,
  because it is public.

What reading cannot establish, stated plainly:

- **A card paid face down.** The carry holds a paid card to "the copy's card of the same id that reads the same"
  (name, power, toughness, mana value). If an item's paid cards can include a card exiled face down as a cost, that
  comparison reads it on the live game and the copy's card keeps its real identity — the determinizer's own known
  limit for every face-down card on the battlefield or in exile, live in every search seat since D312 and not widened
  by the carry except as one more place the copy's real card can be played. I could not establish from the source
  whether Forge's `getPaidHash` ever holds a face-down card, or what `getName` returns on one. Nothing of it reaches
  the wire either way.
- **A hidden choice carried on a spell.** The carry copies an item's chosen modes, X, optional costs and targets; I
  could not establish that no card in Forge's pool records, at cast time, a choice the seat may not see in a field
  the carry copies. D544's checks cover face-down items and hidden triggering objects only.
- **What Forge's own AI reads when it aims.** `passwin` and `stackwin` aim through the same Forge AI paths D540's
  `declined` uses at the live seat since D546, and `dactiv` through Forge's forced attach and targeting paths; this
  lane adds no path that reads a hidden zone, and did not audit every Forge AI path those calls reach.

Threads: every call runs inside `chooseSpellAbilityToPlay` on the game thread; `WIDE` is a thread-local of that
thread; no thread and no `invokeInGameThread` is added, so `HOP_ALLOW` stays three. The lint is untouched and needs
no new rule or self-test case.

**What a person can now read off the clock, which is not the wire's.** D546 wrote down that a pause at instant speed
that ends in a pass says the AI holds an instant-speed play Forge wanted to make. search-v5 widens it twice. **A pause
after the player's own spell or ability goes on the stack** says the AI holds a castable aimed play there (or Forge
wanted to respond) — a refused stack, a face-down spell among others, is answered at once, and a stack window with
nothing to choose between is not searched — so a pause that ends in a pass says the AI is holding something it could
have cast in response (J217 / J221: 1.29 / 1.54 stack windows a game). **A pause in the player's declare-attackers or
end step** says the AI holds an aimed play it could cast and chose not to (about 0.42 pass windows a game). It names
no card and nothing is sent, so hard rule 8 is untouched; it is written down because a person, unlike the ladder's
other seat, can time it.

**Rejected.**

- **Keeping the name `search-v4` for the new seat.** The seat plays differently (it searches stack and pass windows
  search-v4 never looked at, and activates what search-v4 never offered), and the version is a record: the session
  header's `ai.version` labels the owner's games in the human test set (D414), and the engine's start line names it.
- **Changing `parse()`'s defaults to turn the keys on.** Every ladder player's config, the bench's scenarios, the cube
  lab's seat specs, the atlas's seats and seat-identity's golden are parsed by it; their hashes and games would
  silently change meaning (D318, D412 point 2). The live default is `parseLive`'s alone.
- **Adopting one or two of the three keys.** Nothing measured a key alone at a size that reads it (D544 point 16); the
  4,800-game reads are of the union, and the owner's yes is to `search-v3-wide`.
- **Adopting `search-v3-declined-instant-t1-x2` (J220, +14.2 at ×2.48) or waiting for J222.** The owner's yes names
  the wide player; the deeper horizon doubles the clock, which a person feels at every searched decision, and J222's
  combination is unread. Nothing here closes either: they stay candidates under their own decisions.
- **Registering `search-v5` as a ladder name.** It would be a second name for `b95340935592`; the ladder rates by hash
  and seeds batches by name.
- **Renaming the watch bots' id without the old ones as aliases.** A stored `playerB: "search-v4"` from ForgeCoach
  would then be a 400 for a seat that still exists under another name.

**What is unverified.**

- **Everything this lane would run.** No Java was compiled, no self-test, test suite or game was run (J222 held the
  machine, `alone: yes`). The decision self-test's new count is computed by hand: 514 on main plus `liveSeatWide`'s
  12 checks is **526**; every rewritten check in `liveSeatDeclinedInstant`, `liveSeatNoBlock`, `searchWeek3`,
  `searchCandidates` and `wideWindows` keeps its count. The watch runner's self-test gains one check (search-v5 by
  name; search-v6 refused), `ai-ladder.test.ts` one test (D550's), `test_human.py` one game id inside an existing
  test. All of it is *Verification*'s, owed.
- **Against a person.** Every number is the search against search-v4, on 60 deck pairs drafted from six cubes; how
  the three keys play against the owner, on Pacho SHIELD or Doom Legion, is not measured — and the stack carry was
  measured against an opponent whose spells are a cube's, not the owner's MSH and MSC cards. The refusal share (0.069
  to 0.088) is the cube decks'; Pacho SHIELD's and Doom Legion's is unknown.
- **The silent-fidelity risk of the carry** (D544's first unverified point): an accepted stack the carry rebuilt
  subtly wrong resolves differently on the copy without an error. At a live seat that is a worse pick, never a leak.
- **Which key carried the gain**: nothing ablates them at 4,800 games.
- **A refused widened activation** (`dactiv`'s retries, 7 and 5 in 4,800 games): what the board shows when one
  happens is not seen here. D540 point 10's stranded-card note was for a declined spell; whether a refused activation
  leaves anything behind is not established by reading.
- **The pause after a player's spell.** A 1.5 s pause before the AI answers a spell the person just cast is new on the
  board; whether it reads as thinking or as a hang is not asked here.
- **The listing's cost in a stack window** has no time limit (D544); measured only as the search seconds above.
- The seconds are this machine's (D388), on 7 workers.

**Verification (owed, after J222 ends and the lab prints idle; one JVM at a time, in this lane's worktree).** In
order, each with what it must show:

1. `./tools/check-forge.sh` — the pinned jar `3c0a7c38…8e5dd9`.
2. `./bridge/build.sh` from a deleted `bridge/out` — `build OK`; the lint and its self-test unchanged (no new rule);
   **`decision selftest: 526 check(s), 0 failure(s)`** (514 on main plus `liveSeatWide`'s 12; if the count differs,
   find why before going on); every other self-test at 0 failures.
3. `git diff main -- bridge/src/mtgtable/ai/SearchConfig.java` — javadoc and the two constants only.
4. `./tools/cubelab.sh seat-identity` (gate step 12m) — all 4 games the golden's; no fixture edited.
5. `./tools/ai-ladder.sh list` on the lane and on main — identical line for line (only notes changed;
   `search-v3-wide` `b95340935592`, `search-v3-declined-instant` `af6771947a25`).
6. The single test files the change touches: `node --test web/test/ai-ladder.test.ts` (D550's new test among them),
   `node --test web/test/cubelab-watch.test.ts`, `node --test web/test/claude-md.test.ts`, `node
   tools/watch-runner-selftest.mjs`, `node tools/match-launcher-selftest.mjs`, `MTG_TABLE_ML_NO_DEFAULT_HUMAN=1 python3
   -m unittest discover -s tools/ml/tests -p 'test_human.py'`, `node tools/decisions.mjs check`,
   `./tools/public-check.sh`, `npm --prefix web run build`.
7. **The live seat, read off a real session** (no gate step plays a `parseLive` seat): `./bridge/run.sh
   mtgtable.MtgTable --transport auto --ai-policy search --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck
   --games 3 --seed 64775`, with `MTGTABLE_DISTILL_ROWS` on — the start line `ai policy = search
   (ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1;
   search-v5, D412, D539, D546, D550)`; every session header's `ai` `{policy: search, version: search-v5, budgetMs:
   1500, config: …,stackwin=1,passwin=1,dactiv=1}`; three games to the end, `MTGTABLE OK`, `emit errors 0`, `REVEAL
   count 0`; `node tools/check-redaction.mjs` passing on all three frame logs; the longest searched decision.
8. **The exact counters**: `./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --ai-deck
   decks/doom-legion.dck --ai-policy search --seed <s> --out var/d550/rec-<s>.jsonl` for `<s>` in 64775, 64776,
   64777 (the watch bots' path through the same `parseLive(null)`, seat 0 plain Forge) — `RECORD OK`, the redaction
   check passing,
   the start line `search = search-v5, D440`, and the counters `search.p.stackwin.windows`, `.refused` (with reasons),
   `search.p.passwin.windows`, `search.p.dactiv.windows` and every key's `.retry`, reported as read.
9. An independent review of the lane's diff, then the full gate on the merged tree (the coordinator's).

**Follow-up.** The cube lab's 63 widens: ForgeCoach's words for the live seat should say search-v5 and what it does
(stack and pass windows, declined activations), not search-v3; nothing breaks meanwhile. The seat queue
(`~/code/pc-results/study/seat-queue.md`, which this lane does not write) gets a row for `search-v3-wide` marked
landed by D550 at the merge, as row 10 was for D546. Any job draft whose pilot checks the decision self-test's count
(`dst.checks == 514`, D547's and D548's bars) names the merged count from step 2 from this lane's merge on. Two notes
in `tools/ai-ladder/players.json`, `search-v3-declined-instant-a1`'s and `search-v3-declined-instant-t1-x2`'s, say
their base is "the live seat search-v4 since D546"; true when written, left as written, as D546 left D540's notes.

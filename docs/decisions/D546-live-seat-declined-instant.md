## D546 — The live search seat is search-v4: search-v3 with D540's `declined=1` and `instant=1`, adopted on J215's and J216's matches, D543's STANDS and the owner's yes

*Branch `pc/live-seat-declined-instant`, off main `97122947c` (D543's merge, J216's pin). Amends D412 and D539 (the
live seat's version and defaults) and reads J215 (D541) and J216 (D543) (`results/J215/` and `results/J216/` on
`pc-results`: `summary.md`, `verdict.json`). The number is D546 although `node tools/decisions.mjs next` on main
prints an earlier one: D544 and D545 are reserved by unmerged lanes. Code: `SearchConfig`'s two live constants and
the comments that name the live version, the self-tests, the ladder's two notes, the watch bots' player id,
protocol amendment M84 and the docs that say which search the game plays — the same places D539 changed, and no
other. Written as text first, while another run held the machine; what the build, the self-tests and a played
session showed is the *Verification* paragraph, filled in after.*

**2026-11-13**

**Context.**

- **J215 read D541's pair: SMALL GAIN** (2026-11-12 12:34 to 21:09, mtg-table `1eaa00d3`, alone, 7 workers).
  `search-v3-declined-instant` (`af6771947a25`: search-v3 with `declined=1` and `instant=1`, `lands` off) against
  the live seat `search-v2-no-b` (`59505e241363`, search-v3), one fixed 4,800-game match on the confirm set, blocks
  519,900,000–519,900,599: 0 draws, 0 errors, 0 timeouts, every completeness part held; 2,448 wins, score 0.510
  [0.502, 0.518], **+6.9 Elo [+1.4, +12.5]**. Under D541 point 6 a live-seat candidate for the owner, seat-queue
  row 10 (D509).
- **J216 read the same pair on the dev deck set: SMALL GAIN** (2026-11-12 22:50 to 2026-11-13 07:27, mtg-table
  `97122947`, alone, 7 workers). The same players, hashes and code on `tools/ai-bench/pairs-dev.txt`, the other 30
  drafts of the same six cubes, never played with either key, blocks 622,900,000–622,900,599: 1 draw, 1 engine
  error (the bar is 240), 0 timeouts, every check passed; 2,456 wins of 4,799 decisive games, score 0.512 [0.503,
  0.520], **+8.3 Elo [+2.4, +14.1]**. The pooled line D543 registered, J215 + J216, 9,600 games: score 0.5109
  [0.5051, 0.5168], **+7.6 Elo [+3.5, +11.7]**. D543 point 6's recommendation to adopt **STANDS**, carried by J216
  alone (`recByAlone` 1, `recByPooled` 0).

  | | Elo [95%] | A s a game | B s a game | ratio | A / B searched decisions | ms a searched decision (A / B) |
  |---|---|---|---|---|---|---|
  | J215, confirm set | +6.9 [+1.4, +12.5] | 21.89 | 19.17 | ×1.14 | 115,641 / 101,684 | 909 / 905 |
  | J216, dev set | +8.3 [+2.4, +14.1] | 22.21 | 18.935 | ×1.173 | 115,231 / 100,534 | 925 / 904 |
  | pooled, 9,600 games | +7.6 [+3.5, +11.7] | | | | | |

  Both keys fired far above D540's 0.25-a-game floor on both sets. J216, a game: `declined` 3.51 windows, 1.15
  candidates a window, **0.423 decisions changed**; `instant` 1.89 windows, 2.26 candidates a window, **0.256
  changed** — about 0.68 changed decisions a game together (J215: 0.382 and 0.234). Retries (a widened pick that
  did not happen): 2 in J215's 4,800 games, 0 in J216's. The cost is more decisions searched, not slower ones (the
  ms a searched decision moved by 4 and 21). The seconds are this machine's (D388).
- **The owner's word**: "Yes", 2026-11-13, to adopting `search-v3-declined-instant` as the live seat.

**Decision.**

1. **A new search version, `search-v4` = search-v3 + `declined=1,instant=1`.** `SearchConfig.LIVE_VERSION`
   becomes `"search-v4"` and `SearchConfig.LIVE_DEFAULTS` becomes `"what=pa,anytime=1,declined=1,instant=1"`;
   `lands` stays off (J214 read it NOT SHOWN). `parseLive` is unchanged: it parses `LIVE_DEFAULTS` before the
   caller's keys, so a key the caller names wins. The live line, `SearchConfig.toString` of the live parse, which
   prints no `seed` (the ladder's seat configs carry `seed=0`; this string never has), goes from
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1` to
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1`: search-v3's
   string with `,declined=1,instant=1` appended and nothing else — exactly `search-v3-declined-instant`'s seat
   config without its `seed=0`. `MtgTable`'s start line names it `search-v4, D412, D539, D546`.
2. **Where it takes effect: every path through `parseLive`**, as D539 point 2 listed them. `MtgTable --ai-policy
   search` / `--ai-search` (so a bare `./scripts/play.sh`, the match launcher's search AI, Play vs Forge and the
   opponent picker; D333's `--ai-search ms=N` budget keeps both keys); `RecordMatch --policy search` (D440: the
   watch bots' search player); `CubeLab.liveSearchSeat`, which seats `census-play`'s `--policy-a/-b search`
   pilots (D447); and `tools/llm-seat/run-match.mjs --ai-policy search`, whose earlier results against "search"
   were against search-v3 or search-v2. It takes effect when the engine restarts.
3. **What a player sees.** Two new places where the AI thinks, each at the same budget as before (about 1.5 s at
   most a decision):
   - **In its own main phases it also weighs the spells Forge's own judgement chose not to cast** (`declined`,
     D540 point 2): a spell it can cast and pay for that Forge's per-card AI declines is aimed with Forge's own
     targeting and offered after Forge's usual choices, and dropped when it has no legal target. So the AI may now
     cast a removal spell, a pump or a creature Forge would have held, when the look-ahead says it is better, and
     where it used to pass at once with nothing it wanted to cast it may now pause before playing or passing.
   - **Outside its own main phases, on an empty stack, on either player's turn, where Forge wants to make a play**
     (an instant, a flash creature, an activated ability; never a land or a mana ability) **the AI now thinks
     before it plays** (`instant`, D540 point 3): Forge's play is rolled out against holding it and the other
     options. So at the player's end step, in combat or in its own upkeep, a pause of up to about two
     seconds (1,931 ms the longest in the played session) can come before an AI instant, where Forge used to answer at once; with the stack non-empty — a response
     to the player's spell — it is still Forge's own answer, at Forge's speed.
   - Its main-phase plays and attacks are searched as before; its block declarations are still Forge's, with no
     pause (D539).
   - **Thinking time**: 14 to 17% more search time a game on this machine (22.2 against 18.9 s in J216, 21.9
     against 19.2 in J215), about 3 s more over a whole game, from about 15% more searched decisions at the same
     time each. Head to head against search-v3 it measured +6.9 and +8.3 Elo on two disjoint sets of 30 deck pairs,
     +7.6 [+3.5, +11.7] pooled: a small gain, under D519's +15 line.
4. **What does not change.** `SearchConfig.parse` and `defaults()` — `what=pab`, `anytime` off, D540's keys off —
   so the bench, the cube lab's seat specs, the move atlas's seats, the label probe and every ladder player keep
   meaning what their games were played under. The ladder's names and hashes: `search-v3-declined-instant` keeps
   `af6771947a25` and is how the ladder rates search-v4 (no `search-v4` alias is registered: one name per config,
   as D539 point 4 kept `search-v2-no-b` for search-v3), `search-v2-no-b` keeps `59505e241363`; both notes say
   what they are now, and the notes are the only lines of `tools/ai-ladder/players.json` that change. The wire's
   shape: `hello_ok` is unchanged, and the session header's `ai` (M62) keeps its four keys — amendment **M84** (M83 is the number D542's unmerged text and saved patch carry, so it stays theirs) says
   only that `version` names `"search-v4"` when the seat runs the live default. A log written before D546 says
   `"search-v3"` (or `"search-v2"` before D539), which is what that game played; `tools/ml/human_collect.py`
   carries any `search-v<n>` as written, and `tools/check-redaction.mjs` already accepts `^search-v\d+$`.
   `--ai-search` with knobs of its own names no version (`null`), as since D414.
5. **How to get search-v3 back:** `--ai-search declined=0,instant=0` (`./scripts/play.sh -- --ai-search
   declined=0,instant=0`), whose config is `search-v2-no-b`'s exactly; `--ai-search
   what=pab,declined=0,instant=0` is search-v2 and `--ai-search anytime=0,what=pab,declined=0,instant=0` search-v1.
   Either key alone can be named off (`declined=0` or `instant=0`).
6. **The watch bots' player id** (`tools/watch-runner.mjs`, `tools/cubelab/watch.ts`, `docs/watch-bots.md`)
   becomes `search-v4`, labelled so, because the seat it starts is the live one. `search`, `search-v2` and
   `search-v3` stay accepted as aliases of it, so a request ForgeCoach stored before D546 still starts; they answer
   as `search-v4`. `watch.ts`'s `seatSpecOf`, which spells the live seat by hand for `run.json`'s `profiles` (a seat
   spec is parsed by `parse`, not `parseLive`), becomes `<profile>+outlets+search:what=pa,anytime=1,declined=1,instant=1`.
   **ForgeCoach needs nothing first**, unlike D539: its watch page reads the listed id with
   `SEARCH_ID = /^search(-v\d+)?$/i` since ForgeCoach#217, so a helper listing `search-v4` is offered as the search
   seat, and its pickers send the policy `search`, never a version. Its words do go stale — the watch page's and the
   opponent picker's blurbs say search-v3 and describe it — which is the cube lab's follow-up 63.

**Under D509: the atlas's seat is unchanged.** D509 point 1 freezes `bridge/src` for the atlas's population, and a
lane that changes it between landings writes the argument that the seat's plays and listings are unchanged. This
lane changes, under `bridge/src`, the same five files D539 did: two string constants and javadoc in
`ai/SearchConfig.java`, a comment in `ai/SearchPolicy.java`, comments and the start line's words in `MtgTable.java`,
a comment in `RecordMatch.java`, and checks in `ai/DecisionSelfTest.java`. The argument is D539's, unchanged:

- **The constants are read only by `parseLive`** (and by `MtgTable`'s start line and session header, and
  `RecordMatch`'s start line, which print them). `parse()` and `defaults()` are untouched, byte for byte; `git diff
  main -- bridge/src/mtgtable/ai/SearchConfig.java` touches javadoc and the two constants only.
- **No atlas seat goes through `parseLive`.** The atlas's units are seated in `tools/cubelab/CubeLab.java`, which
  this lane does not touch: the observing seat by `SearchConfig.parse("observe=1,cands=" + …)`
  (`CubeLab.java:486`), the plain seats by `SeatSpec.parse` → `SearchConfig.parse` (`SeatSpec.java:52`). An atlas
  job carries no `policyA`/`policyB` key (`baseJob`, `tools/cubelab/atlas.ts:406-408`; the `random` and `plain` at
  `:432` and `:444` are the rows file's labels), and `CubeLab` reads the pilot from that key (`CubeLab.java:478`),
  so `liveSearchSeat` (`CubeLab.java:703`) is never reached from a unit. The bench seats its specs through
  `SearchConfig.parse` (`tools/ai-bench/AiBench.java:188`); D538's label probe seats each ladder player through
  `SeatSpec.parse` (`tools/cubelab/AtlasProbe.java:115`, `:383`).
- **The seat-identity golden is untouched and is not expected to move.** Its search game is an explicit seat spec,
  `Default+search:ms=60000,cands=4,rounds=2,maxrounds=2,seed=1` (`tools/cubelab/seatidentity.ts:47`), through
  `parse`, with neither key; `fixtures/cubelab/seat-identity.json` is not edited.
- **The evidence the coordinator runs:** gate step 12m (`cubelab.sh seat-identity`), the decision self-test (which
  holds `parse("")` with both keys off and the live seat at search-v3's every field but `declined` and `instant`,
  by reflection), and the full gate. The next atlas night's derivation diffs `bridge/src` in its `seat_code` check
  and must admit exactly this lane's five files there (`ai/SearchConfig.java`, `ai/SearchPolicy.java`,
  `ai/DecisionSelfTest.java`, `MtgTable.java`, `RecordMatch.java`: two constants, comments, a start line's words
  and self-test checks), beside D539's and D540's, and nothing else under the frozen paths, or that night is not
  posted under D509 point 1; this paragraph is the admission.

**Hidden information (hard rule 8) and threads (hard rule 3).** Nothing new on the wire: D540's paragraph holds for
the live seat as it held for the ladder's. `declined` lists the seat's own castable spells and aims them through Forge's
targeting among objects the spell may target; `instant` adds no listing, only more windows for today's search;
every rollout redeals what the seat cannot see (`Determinizer`). Nothing touches the wire, `Snap` or a `CardView`,
every call runs on the game thread inside `chooseSpellAbilityToPlay`, and `HOP_ALLOW` stays three.

**One thing a person can now read off the clock, which is not the wire's.** The seat searches an empty-stack
instant-speed window only when Forge itself wants to play something there, so a pause in the player's end step or
combat that ends in a pass says the AI holds an instant-speed play it could pay for and chose not to make (J216:
1.89 such windows and 0.256 changed decisions a game); `declined` does the same in the AI's own main phases, where a
pause now comes before some passes. search-v3 already paused only where it had a play to weigh, in its own main
phases; this widens that tell to the player's turn. It names no card and nothing is sent, so hard rule 8 is
untouched; it is written down because a person, unlike the ladder's other seat, can time it.

One lab consequence that is not the atlas's: `census-play --policy-a/-b search` seats the live seat by definition
(D447), and `plan.json` still binds the pilot as the string `search` (`tools/cubelab/censusplay.ts`'s plan keys),
so a census folder whose games straddle D546 would hold search-v3 and search-v4 under one pilot name, and a resume
or a larger `--pairs` would be admitted. D539's rule therefore still applies and is extended: **a `census-play`
folder begun before D546 with a `search` pilot is never resumed or extended**; a run after D546 starts a folder of
its own, and no reading pools the two.

**Rejected.**

- **Keeping the name `search-v3` for the new seat.** The seat plays differently (it searches windows search-v3
  never looked at, and can cast what search-v3 never offered), and the version is a record: the session header's
  `ai.version` (M62) labels the owner's games in the human test set (D414), and the engine's start line names it.
- **Changing `parse()`'s defaults to turn the keys on.** Every ladder player's config, the bench's scenarios, the
  cube lab's seat specs, the atlas's seats and seat-identity's golden are parsed by it; their hashes and their games
  would silently change meaning (D318, D412 point 2). The live default is `parseLive`'s alone.
- **Adopting one key alone.** Nothing measured one key at the size that reads it: J214's one-key arms were 1,200
  games each and INCONCLUSIVE (`declined` +5.8 [−4.6, +16.2], `instant` +10.4 [−0.7, +21.5]); the 4,800-game reads
  are of the pair. The owner's yes is to the pair.
- **Turning `lands` on too.** J214 read `search-v3-lands` NOT SHOWN (+1.2 [−9.6, +11.9]); it stays a measured
  config and off.
- **Registering `search-v4` as a ladder name.** It would be a second name for `af6771947a25`; the ladder rates by
  hash and seeds batches by name (D535's test says why).
- **Renaming the watch bots' id without the old ones as aliases.** A stored `playerB: "search-v3"` from ForgeCoach
  would then be a 400 for a seat that still exists under another name.

**What is unverified.**

- **Against a person.** Every number is the search against itself, on 60 deck pairs drafted from six cubes; how
  either key plays against the owner, on Pacho SHIELD or Doom Legion, is not measured.
- **Which key carried the gain.** Nothing ablates them at 4,800 games (J214's one-key arms are the only reads).
- **A widened pick that fails to cast strands the card** (D540 point 10): a payment the seat refuses after picking
  a `declined` spell can leave the card in its stack zone, and the live seat, like the ladder's, has no `putBack`;
  the retry guard then turns the key off for the rest of the step (D540 point 1). Measured: 2 retries in J215's
  4,800 games and 0 in J216's, so about one game in 4,800; what the board shows for one is not seen here.
- **The pause at instant speed.** On the board a 1.5 s pause in the player's own end step or combat is new;
  whether it reads as the AI thinking or as the game hanging is not asked here.
- **An aimed declined spell the search does not pick keeps the targets and the AI memory the aim wrote** (D540
  point 2 and its unverified list); measured only through J215's and J216's results.
- The seconds are this machine's (D388), on 7 workers.
- D544's and D545's lanes (unmerged) were built on `search-v3-declined-instant` as D543 point 6 asked; nothing here
  changes what they measure against.
- **D544 merges before this lane and rewrites the path these two keys run** (`alternatives` becomes a widened
  listing, the retry guard compares a stack key, the playout takes a flag). With D544's three keys off it argues,
  and its bench scenarios hold, that behaviour is J215's and J216's; but this lane's played session ran on
  `97122947c`'s code, and no gate step plays a `parseLive` seat (seat-identity's search game is an explicit
  `parse()` spec). So the played session and the redaction check are run again on the merged tree, and the merge
  commit records them.

**Verification (the lane, 2026-11-13, on `ba5f1c04f` once the D544 exposure run had ended with `rc 0` and the lab
printed `idle [] []`; one JVM at a time, beside another lane's pilot).**

- **The engine and the build**: `./tools/check-forge.sh`, the pinned jar `3c0a7c38…8e5dd9`. `./bridge/build.sh` in
  the lane's worktree, which had no `bridge/out`, `build OK`: the lint's self-test (33 rules, 79 firing cases) and
  the lint (97 files under `bridge/src`, 4 under `tools/`), javac, every self-test; **the decision self-test 482
  checks, 0 failures** (472 on main; the ten are `liveSeatDeclinedInstant`'s, and D539's and D540's live-seat checks
  pass as rewritten), `TableSelfTest` 114 and 0, `StalledGameSelfTest` 156 and 0, the eval self-test 8,039 checks,
  the grade self-test 132 and 0, the distill self-test 38 and 0. `git diff 97122947c --
  bridge/src/mtgtable/ai/SearchConfig.java` changes the two constants and javadoc and nothing else.
- **Gate step 12m**: `cubelab.sh seat-identity`, the forge, search, explore and plain seats, "all 4 games are the
  golden's" (the search seat's 92 lines, digest `c68c2a849b7b0d54`, the golden's): no decision record of an atlas
  seat moved.
- **The ladder**: `./tools/ai-ladder.sh list` on the lane and on main (`97122947c`), 56 lines each, **identical**:
  `search-v3-declined-instant` `af6771947a25` (`…,what=pa,seed=0,anytime=1,declined=1,instant=1`) and
  `search-v2-no-b` `59505e241363` among them; only the notes changed.
- **The tests the change touches**: `web/test/ai-ladder.test.ts` 57 pass (56 on main, plus the D546 case),
  `cubelab-watch.test.ts` 13 and `claude-md.test.ts` 5, 0 failures; the watch runner's self-test 159 checks, 0
  failures (157 before, plus `search-v4` and `search-v5`); the match launcher's 238 checks; `test_human.py` 15
  tests OK (ws-6, `search-v4`, inside the M62 test); `node tools/decisions.mjs check` OK, 458 decisions;
  `tools/public-check.sh` OK; `npm --prefix web run build` (`tsc --noEmit`, then vite) clean.
- **The live seat, read off a real session**: `MtgTable --transport auto --ai-policy search --deck
  decks/pacho-shield.dck --ai-deck decks/doom-legion.dck --games 3 --seed 64775` (the automated seat playing Pacho
  SHIELD, the search AI Doom Legion), with `MTGTABLE_DISTILL_ROWS` on for the AI's searched decisions. The start
  line is `ai policy = search (ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1;
  search-v4, D412, D539, D546)`, and every one of the three games' session headers carries `ai` = `{policy: search,
  version: search-v4, budgetMs: 1500, config: …,what=pa,anytime=1,declined=1,instant=1}`. The match played all
  three games to the end with no stall or engine error (`MTGTABLE OK`, `emit errors 0`, `REVEAL count 0`): the AI
  won game 1 on turn 14, game 2 on turn 16 (the match over) and game 3, after the restart, on turn 16, each by
  AllOpponentsLost; `tools/check-redaction.mjs` passes all three frame logs. The AI's searched decisions over the
  three games: **49** (32 priority, 17 attacks, **0 blocks**), 10 of them overriding Forge (7 priority, 3 attacks),
  45.1 s of search in all; **2 searched priority decisions outside the AI's own main phases**, both instant-speed
  windows of `instant=1` that search-v3 never searches (its own draw step on turn 16 of game 2, 3 candidates,
  1,544 ms, and its upkeep on turn 8 of game 3, 2 candidates, 1,088 ms; Forge's play kept both times); **the longest
  searched decision 1,931 ms** (a priority decision, turn 12 of game 1), the median 1,088 ms. The rows carry no
  `declined` field, so that key's count is the second run's.
- **The second run, for the exact counters** (`RecordMatch --ai-policy search`, the watch bots' path through the
  same `parseLive(null)`, the same decks, seat 0 plain Forge, seeds 64775–64777, one game each, `RECORD OK` and the
  redaction check passing on all three): the start line says `search = search-v4, D440`; the search seat won two
  (14 and 18 turns) and lost one (17). Its counters, summed: **`search.p.instant.windows` 3** (1 a game, 2
  candidates each) and **`search.p.declined.windows` 4** (all in the 64776 game, 4 aimed spells listed, 4
  candidates), 0 `noTarget`, **0 retries** for either key, neither key's pick changing a decision in these three
  games, 0 searched blocks; 36 priority and 18 attack decisions considered.
- **Not run on the lane**: the full gate (the coordinator's, on the merged tree after D545 and D544).

**Follow-up.** The seat-queue row for `search-v3-declined-instant` (D509, row 10 of
`~/code/pc-results/study/seat-queue.md`, in pc-results, which this lane does not write) is marked landed by D546 at
the merge. The cube lab's 59 was J216's read, closed with it (D545 records the read; this decision is the owner's yes it led
to); this decision adds the cube lab's 63: ForgeCoach's words for the
live seat, which still say search-v3.

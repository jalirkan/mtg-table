## D540 — what the search considers: three widenings of the priority search as config keys off by default (`declined=1` castable spells Forge declines, aimed by Forge's own targeting; `instant=1` the empty-stack instant-speed windows where Forge plays; `lands=1` the land drop against each other-named land), each one fixed 1,200-game match against the live seat under D519's four readings (J214)

*Branch `pc/search-candidates`, off `pc/live-seat-no-block` `57283de35` (D539's lane, which merges to main first:
the live seat this file names is search-v3, `what=pa,anytime=1`, the ladder's `search-v2-no-b`). Code: three
`SearchConfig` keys, the search's candidate generator and windows (`SearchPolicy`), one call in `PolicyControllerAi`
and one in `Explorer`, a `DecisionSelfTest` case, engine scenarios in the ai-bench self-test, three ladder players,
the ladder's params and test, two guides' key lists and PLAN's rows. **Written as text while J213 held the machine
alone: no line of this lane was compiled or run when it was written**; what the build, the self-tests and the gate
showed is the *Verification* paragraph, filled in after. The three hashes were computed by a Python re-implementation
of the ladder's `configHash` (`tools/ai-ladder/registry.ts`), checked on three registered hashes (`cdd55e02a89c`,
`59505e241363`, `63c35e9f7d5b`); the registry test holds them.*

**Status: registered; built and self-tested on the lane (*Verification*); the full gate and the merge pending; unplayed. J214 plays it.**

**2026-11-11**

**Context.**

- **The knobs are tapped out.** More clock at search-v2's horizon bought nothing (J194, J195, J198); searching blocks
  buys about +2 Elo head to head (J211, D539); a rollout one turn deeper buys nothing at the same clock and +9.8
  [−1.7, +21.4] at 2.7 times it (J212: `search-v2-t1` −1.7 [−14.6, +11.2] NOT SHOWN, `search-v2-a1` +5.2 [−5.7, +16.2]
  and `search-v2-t1-x3` +9.8 [−1.7, +21.4] INCONCLUSIVE AT 1,200; `results/J212/report.md`); random rollouts lost
  (D534). D537 point 8 said the next lane turns to what the search considers. PLAN's *Search AI follow-ups* item 2
  (D312: "instant-speed decisions are still Forge's") named the same thing in October.
- **What the search considers today.** It is reached from one place, `PolicyControllerAi.choose0`: the outlet
  policy first, then Forge's answer, then the search if `SearchPolicy.wantsPriority` holds — the seat's own turn, a
  main phase, an empty stack — and `choosePriority` returns Forge's land drop unsearched (`search.p.skipLand`). D312
  (DECISIONS.md, its Rejected) left "a search on every priority (instant-speed responses stay Forge's and the outlet
  policy's — a later step)", and its candidates are Forge's answer, pass, every play `AiController.canPlaySa`
  answers `WillPlay`, then untargeted spells it answers `CantPlayAi` (`SearchPolicy.alternatives`). A land drop is
  answered by Forge's AI before it looks at spells, and the seat is asked again (D462), so the spell decision is the
  next window, which the search does see; the land itself was never a candidate.
- **J212's recording counts the windows the search never searches** (720 games, search-v2 against Forge Default,
  the search seat's own decision records, `results/J212/report.md` and its `records-full.json`; broken down for this
  decision by a single-threaded reader of `var/ai-bench/j212-rec/games` that reproduces the report's totals exactly):

  | window | windows | a game (p10 / median / p90) | Forge played (not pass) |
  |---|---|---|---|
  | own main, empty stack, Forge played a land | 5,384 | 7.48 (5 / 7 / 10) | 5,384 lands |
  | own main, empty stack, no land, unsearched | 4,122 | 5.73 (1 / 5 / 12) | 33 (the outlet policy's) |
  | own main, a stack | 4,970 | 6.90 (0 / 5 / 16) | 49 |
  | own turn, other steps | 26,377 | 36.6 (6 / 35 / 69) | 922 (1.28 a game) |
  | the opponent's turn | 22,962 | 31.9 (0 / 25 / 71) | 893 (1.24 a game) |
  | searched priority decisions | 11,939 | 16.6 (8 / 15 / 26) | — |

  With an empty stack, outside the seat's own main phases, Forge played in 1,430 windows (1.99 a game): in the
  opponent's turn at its end step 222, declare attackers 156, declare blockers 51; in the seat's own upkeep 319,
  draw 168, beginning of combat 132. Its plays there: activations (Retrofitter Foundry, Scavenging Ooze, Umezawa's
  Jitte, Goblin Bombardment, Walking Ballista) and instants (Lightning Bolt, Burst Lightning, Swords to Plowshares;
  Counterspell and Mana Leak on a stack). A land of another *name* than Forge's was legal in 2,630 of the 5,384 land
  windows (3.65 a game; the report's "another land", 3,506, counts two Forests as two), and in 2,592 of those it
  differs from Forge's land in basic land type or has none; Forge played a basic in 4,882 (90.7%). In the searched
  windows, 8,145 of 11,939 decisions (68%) had a legal option outside the candidates: 10,696 activations, 2,955
  instants (mostly counter-magic with nothing to counter, inferred), 962 sorceries, 897 creatures, 257 enchantments,
  1,055 lands.
- **Two of the report's sentences read differently than they look.** (1) "With a legal non-mana play: 100%" holds by
  construction: a window is recorded only with two or more options (a forced pass is counted, never recorded), no
  land is legal outside the seat's own main phase, and "legal" is `canPlay` and `canPayCost` with no target check
  (`Decisions.playable`), so a Counterspell on an empty stack is "legal". (2) The 70% zeros are the standard deviation
  of the paired difference, σ_d = seDiff·√n over alternatives with n ≥ 2 (14,459 of 20,560), not the difference: the
  paired mean difference itself is exactly 0 in 5,373 of 21,666 priority comparisons (24.8%), 33.6% in MAIN1 and 9.9%
  in MAIN2. A zero σ_d is a comparison every round answered alike: within this turn the redeal of the opponent's
  hidden cards rarely matters, which is why more rounds and more clock bought nothing. A zero difference is mostly a
  transposition: where Forge passed in MAIN1 and casting Y scored exactly the same, the real game cast Y later that
  turn in 1,818 of 2,472 (73.5%), against 1,858 of 3,837 (48.4%) where the difference was not zero.
- **Where the search's overrides land** (the recording's searched priority decisions):

  | candidates | decisions | ms | complete rounds | overrode | timed out |
  |---|---|---|---|---|---|
  | 2 | 5,983 | 598 | 7.07 | 8.9% | 17.1% |
  | 3 | 3,422 | 893 | 7.53 | 22.3% | 31.6% |
  | 4 | 1,620 | 1,106 | 7.00 | 33.4% | 47.4% |
  | 5 | 591 | 1,268 | 6.60 | 49.7% | 59.6% |
  | 6 | 323 | 1,363 | 5.60 | 59.8% | 70.3% |

  By the kind of candidate that won: a cast 1,688 of 12,856 offered (13.1%), pass 572 of 7,554 (7.6%), an activation
  64 of 1,256 (5.1%). 50.1% of searched decisions had exactly one alternative. The rate rising with the candidate
  count is partly more real options and partly the best of more noisy alternatives clearing a fixed margin (inferred;
  the records cannot separate them).
- **The judged labels that are not Forge's move** (D538's `fixtures/atlas/judged/labels-judged-v1.jsonl`, 515 agreed
  labels; each joined to its spine's `atlas.json` options and to the baseline rows' phase one-hot): priority 179 of
  334, attacks 36 of 142, blocks 11 of 39. Every labelled decision is inside the search's own windows (the atlas's
  options are the observing search's candidates, `Atlas.java`'s header), so the labels say nothing about land choice
  or instant speed.

  | kind | the move the judges chose over Forge's | n | phase |
  |---|---|---|---|
  | p | a cast where Forge passed (creature 75, artifact 9, enchantment 7, sorcery 5, instant 5, planeswalker 3) | 104 | MAIN1 103, MAIN2 1 |
  | p | another play (creature for creature 17; a cast for Forge's activation 15, 11 of them fetch or landscape cracks) | 62 | MAIN1 36, MAIN2 26 |
  | p | pass where Forge played | 13 | MAIN1 8, MAIN2 5 |
  | a | attack where Forge did not 15, more attackers 12, fewer 7, none 2 | 36 | — |
  | b | block where Forge did not 5, no block 3, more 2, fewer 1 | 11 | — |

  The strongest class, a permanent cast in MAIN1 where Forge passed, is a candidate the search already has; what
  stops it is the transposition above, not the candidate list. No label favours an activation Forge skipped (none
  was offered), and 15 say a Forge activation was worse than a cast.

**Decision.**

1. **Three `SearchConfig` keys, each off by default** in `parse` (so in `parseLive` and `LIVE_DEFAULTS`), each a field
   of its own (`declined`, `instant`, `lands`), set through `withCandidates` after every other switch, carried by
   every other copy, and printed by `toString` only when on, after `observe` in that order. A config without them
   prints and hashes as before; `DecisionSelfTest.searchCandidates` holds that by reflection (each arm differs from
   search-v3 in its one field), by text and round trip, and that neither the live parse nor `parse("")` turns one on.
   A live seat may name them (`--ai-search lands=1`); none is measurement-only in the way a random rollout is,
   because none reads anything the seat may not see.
   **A retry guard, common to the three.** Forge's main loop asks an AI seat again after a play it could not make
   (up to 999 times, `PhaseHandler.mainLoopStep`), and a ladder seat has no pay cap (D465's is the atlas seat's).
   So when the search has picked a widened play (an aimed declined spell, any play in an instant-speed window, a
   land of another name) and the seat is asked again in the same turn and step with an empty stack and nothing it
   plays has moved since (spells cast this turn, lands played this turn and that play's activations this turn, all
   unchanged), that key is off for the rest of the step — today's path only — and the ask is counted,
   `search.p.<key>.retry`. With every key off the guard's state is never read and nothing is counted.
2. **`declined=1`: castable spells Forge declines, aimed by Forge's own targeting.** In `SearchPolicy.alternatives`,
   a spell that is castable and affordable and that `canPlaySa` answers with anything but `WillPlay`, and that is not
   D312's untargeted `CantPlayAi` spell, is set aside in the loop and aimed in a second pass after it (`aimDeclined`):
   the targets `canPlaySa` left on it if every one is still legal — a valid count, and each target among the part's
   candidates (`getAllCandidates(part, false)`) that `canTarget` accepts, over every part (`Explorer.castParts`),
   Explorer's staleness test (D485), because many refusals return before Forge touches the targets and what is there
   can be an earlier evaluation's, ours included — else, the stale parts cleared, Forge's FORCED-trigger path
   (`doTriggerNoCostWithSubs(seat, sa, true)`, the coach grader's second step, `Grader.aim`). It is listed after
   today's plays; one with no legal aim even then (a Counterspell on an empty stack) is dropped and counted. The
   aiming runs inside `Decisions.quiet`, so Forge's random stream is not moved by it, and after the loop because the
   AI paths it reaches can write the seat's AI memory (`ChangeZoneAi` remembers a bounce, `BounceOnce` reads it):
   aimed in the loop, a spell judged later could be judged differently. So today's candidates are the head of the
   widened list and the cut at `cands` keeps every candidate search-v3 had; but Forge's *later* answers in the real
   game can still differ after an aim, because the memory an aim wrote persists. A window Forge passed in with
   nothing else to consider (the 4,122) is searched when such a spell exists. Activations stay as they are (Rejected). Counters: `search.p.declined.listed` (aimed spells
   listed), `.noTarget` (dropped), `.windows` and `.cands` (windows where one became a candidate, and how many),
   `.changed` (the search picked one).
3. **`instant=1`: the instant-speed windows where Forge plays.** `wantsPriority(seat, forge)` is today's test, or,
   with the key on: outside the seat's own main phases, on an empty stack, on either turn, Forge's answer one play
   that is not a land ability and not a mana ability. The window is searched as a main-phase one is: Forge's play,
   pass and the alternatives, rolled out to the end of that turn. The listing's engine calls there (`alternatives`,
   its `canPlaySa` calls) run inside `Decisions.quiet`: B searches nothing in those windows and draws nothing from the
   real game's random stream there, so the arm may not either. Today's main-phase calls are not wrapped, so the
   keys-off path is unchanged. Counters: `search.p.instant.windows`, `.cands`, `.changed`, `.retry`. The stack windows
   wait (Rejected).
4. **`lands=1`: the land drop.** Where Forge's answer is one land and a land of another name is legal
   (`Decisions.landPlays`, D466's one listing, read inside `Decisions.quiet`), Forge's land is rolled out against the
   first land of each other name and face (a land's name with the face it is played as, `getCardStateName`, so a
   two-faced land offers both faces), up to `cands`; no pass, no holding the land. With no other name it is Forge's drop, unsearched, as before.
   Counters: `search.p.lands.windows`, `.cands`, `.changed`, `.retry`; such a window also counts
   `search.p.considered`, and its override `search.p.changed.toOther`.
5. **What the install does at an instant-speed step, read and tested.** A priority candidate is installed with
   `PhaseHandler.setPriority(seat)` and `onStackResolved()` (D312). In Forge's source at the `forge-2.0.14` tag
   (`~/code/forge-src`, read with `git show`; `PhaseHandler.java:138-141`, `:1040-1147`, `:1257-1259`, the same
   lines as the 2.0.15 checkout's), `setPriority` sets both the
   player with priority and the first player to have it, and `onStackResolved` sets `givePriorityToPlayer`, so the
   next `mainLoopStep` asks the seat at whatever step the copy is in, its play gives it priority again (117.3c), and
   when every player has passed in turn the step ends. One difference follows for the opponent's turn: in the real
   game the active opponent had priority first and passed it to the seat, so the seat's pass ends the step; on the
   copy the seat is the first to have had it, so after a forced pass the opponent is asked once more before the step
   ends. Every candidate but pass gives the seat priority again and is unaffected; the pass candidate's rollout gives
   the opponent one window the real game would not. **Which way that leans, and the sentence J214's report must
   carry for the instant arm:** the extra window can only help the opponent after a pass, so it leans against
   passing, toward keeping Forge's play; a NOT SHOWN `instant` reading is therefore weaker evidence than the other
   two arms', and a SHOWN one is not inflated by it. The ai-bench self-test (`searchCandidatesScenarios`) installs a
   forced Bolt and a forced pass on a copy at the opponent's end step, the seat's upkeep and its beginning of combat,
   and its messages say what the copy showed after the install and at the leaf. On the pinned jar it showed, at all
   three steps, the seat holding priority at that step after the install, the forced Bolt resolving (the Bears dead,
   the Bolt in the graveyard) and the copy reaching the next turn's untap; after a forced pass at the opponent's end
   step the Bolt stayed in hand and the turn ended; after a forced pass in the seat's own upkeep or beginning of
   combat Forge cast the Bolt later in the turn itself, as expected. (The opponent's extra priority after a pass is
   read from the source; the leaf does not show it.)
6. **J214: three fixed 1,200-game matches** (D398: 600 mirrored pairs, no stopping rule) on the confirm set,
   `alone: yes`, in this order: `search-v3-declined` (`795daea97aaa`), `search-v3-instant` (`25ee7e76b741`),
   `search-v3-lands` (`e0b09eb7b014`), each A against B = `search-v2-no-b` (`59505e241363`, search-v3, the live seat
   since D539). A's seat config is B's,
   `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`, plus
   `,declined=1`, `,instant=1` or `,lands=1`.
7. **The deals: `--host j214`, each match in a ladder folder of its own, `var/j214-<arm>`, emptied by its own block.**
   D537's arms took the host's own base because none had played; D536 took a host of its own for a candidate chosen
   on the host's deals. These arms were designed from J212's recording, which played bench deals on the confirm set's
   deck pairs, not the ladder's blocks; a host of its own takes both arguments off the table. `hostBase('j214')` is
   416,000,000 (FNV-1a as `schedule.ts` computes it), so each match takes **416,900,000–416,900,149**, on a first
   run and on a retry; no row of the 80,530 ladder rows under the lab checkout's `var/` (read 2026-11-11) is on base
   416. All three arms play the same 600 deals.
8. **The readings, written before any game: D519's four, at 1,200 games, as D537 point 6 wrote them, with only the
   names, the blocks, B and the kinds searched changed, and one exposure condition added.** A match is
   **complete** when its line names the arm and `search-v2-no-b` in that order at their hashes, says
   `complete: true`, played all 1,200 games with errors plus timeouts at most 60, carries `score`, `lo`, `elo`,
   `eloLo` and `eloHi`, was played on exactly blocks 416,900,000–416,900,149 with no other match's game in its
   folder, every batch line carried the two seat configs of point 6 exactly, both sides searched priority and attack
   decisions and neither searched a block, and **the arm's key fired often enough**: A's batch counters show
   `search.p.<key>.windows` summed over the match's games at least 0.25 a game played (300 at 1,200 games; for
   `declined`, `search.p.declined.windows`), and B's show no `search.p.declined.`, `search.p.instant.` or
   `search.p.lands.` counter above 0. A match under that rate is **NOT READ**: the report gives the rate, the match
   gets no reading, and the arm is not played again without a new decision. A match incomplete for any other reason
   gets no reading and is reposted alone under a new job id after its cause is found. Exactly one reading of a complete match, in this precedence, compared
   as the line carries them (`lo` in integer ten-thousandths, Elo in integer tenths):
   - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
   - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
   - **INCONCLUSIVE AT 1,200**: `lo` at most 0.5 and `eloHi` at least +15;
   - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
   Beside each reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly
   below), a measured gain (wholly above). Each arm is read on its own match; the three are never pooled and no arm
   is read against another.
9. **What a reading earns.** A SHOWN or SMALL GAIN arm is a **candidate** for one 4,800-game confirmation against the
   live seat on deals no match has played (a host name of its own), under D519's readings, as its own job under its
   own decision, before any live-seat question goes to the owner; nothing is adopted from 1,200 games. An
   INCONCLUSIVE AT 1,200 is information and is not confirmed by this decision. A NOT SHOWN arm is not played again.
   No reading changes the live seat (D509): a confirmed arm becomes a seat-queue row with its point, interval and
   seconds a game, and the owner's word.
10. **Beside each reading, as description only.** Each side's searched decisions by kind and ms a searched decision;
    search seconds a game; the arm's exposure, a game: its windows, its candidates a window, and its changes (and for
    `declined`, the aimed spells listed and dropped); priority overrides by direction a priority decision; the land
    windows left to Forge a game.
11. **The pilot, before the matches** (the *unverified* list below, measured): the build, the decision self-test
    and the ai-bench self-test with D540's scenarios passing; the three players at their hashes and seat configs;
    a 4-game ladder match per arm against `search-v2-no-b` in pilot folders under another host (both sides search
    priority and attacks and no block, the names, hashes and seat configs exact, B's D540 counters absent); and a
    4-game recorded run per arm against Forge Default (`ai-bench.sh play --record-all`), whose decision records give
    each arm's ms by candidate count and its searched windows by kind, printed with the counters. **An arm is played
    that night only if its pilot passes**: A's `search.p.<key>.windows` summed over its 4 ladder games and its 4
    recorded games above 0, none of its 8 games an error or a timeout, and `search.p.<key>.retry` at most 2 a game.
    An arm that fails is not played that night and the report says which condition it failed; a key that fired in
    B, or in A under the wrong window, stops the night.
12. **Time** (D537 point 11's fit: a 1,200-game match against search-v2's family on this host at 7 workers, alone,
    takes about 0.47 h + 0.0436 h × both sides' search seconds a game; residual sd 0.15 h). B searches about 19.3 s a
    game (J211). Estimated, from the recording's ms by candidate count: `declined` about 21.8 s (+0.2 candidates a
    searched decision at about 300 ms, and about 2.5 more windows a game at about 0.6 s), about 2.3 h; `instant`
    about 20.5 s (about 2 windows a game at about 0.6 s), about 2.2 h; `lands` about 21.7 s (about 3.65 windows a
    game at about 0.65 s), about 2.3 h. With the pilot (about 0.75 h), about 7.5 h, 8.8 h if memory pressure holds
    the night at 6 workers. Each match stops itself at `--hours 3.5`, so the night is at most about 11.25 h with the
    pilot; the job's timeout is 12 h.
13. **What each outcome leads to** (consequences, read from the three readings together; not rules):
    - `declined` a candidate: the search was missing plays, not values; its confirmation first, and a seat with the
      declined casts and today's activations Forge declines is a later arm under a later decision.
    - `instant` a candidate: the instant-speed windows pay; the stack windows (counter-magic, responses) and the
      windows Forge passes in are the next arm, after a self-test of the install on a non-empty stack.
    - `lands` a candidate: the land choice pays even at a horizon that cannot see a colour's next turn; a land arm at
      `turns=1` for land windows only is the next question.
    - All three NOT SHOWN: what the search considers is not the limit at this leaf and horizon; the next lane is the
      value side (the MAIN1 transposition the labels point at, or the leaf).
    - Every arm INCONCLUSIVE AT 1,200 or NOT SHOWN with a point near 0: no direction from this night.

**Under D509: the atlas's seat is unchanged.** This lane changes five files under `bridge/src`:
`ai/SearchConfig.java` (three fields, a copy constructor, `withCandidates`, three parse cases and three `toString`
lines), `ai/SearchPolicy.java` (`wantsPriority(seat, forge)`, `choosePriority`'s two branches and counters,
`chooseLand`, `alternatives`' fifth argument and its one new branch, `aimDeclined`, `targetsValid`, a test hook),
`ai/PolicyControllerAi.java` (one call: `wantsPriority(player, forge)`), `ai/Explorer.java` (one call:
`alternatives(…, null)`, with its comment) and `ai/DecisionSelfTest.java` (a check method). The argument that the
seat's plays and listings are unchanged:

- **Every atlas seat and every registered config parses with the keys off.** The observing seat is
  `SearchConfig.parse("observe=1,cands=" + …)` (`tools/cubelab/CubeLab.java`, untouched), plain seats go through
  `SeatSpec.parse` → `SearchConfig.parse`, the bench through `parse`; none names `declined`, `instant` or `lands`.
- **With the keys off no engine call is added or removed.** `wantsPriority(seat, forge)` returns
  `wantsPriority(seat)` and then reads `cfg.instant`; `choosePriority` reads `cfg.lands` before the unchanged
  `skipLand`; `alternatives` with a null fifth argument runs today's loop, whose one new branch is an `else if
  (aimed != null …)` after the two old ones, so it is never entered; the D540 counters are added only under a key.
  The counters' names are new, so no existing counter moves.
- **Play exploration's listing passes the widening off by name** (`Explorer.java`'s call, `null`): the random seat
  and the explorer draw from the same list as before.
- **The evidence the coordinator runs:** gate step 12m (`cubelab.sh seat-identity`, the four golden games' decision
  records identical; `fixtures/cubelab/seat-identity.json` is not edited), the atlas self-test with no `--write`,
  the decision self-test, the ai-bench self-test's `d540-*-off` scenarios (no D540 counter with the keys off), and
  the full gate. The next atlas night's derivation diffs `bridge/src` in its `seat_code` check and must admit
  exactly these five files (`ai/SearchConfig.java`, `ai/SearchPolicy.java`, `ai/PolicyControllerAi.java`,
  `ai/Explorer.java`, `ai/DecisionSelfTest.java`) beside D539's, and nothing else under the frozen paths; this
  paragraph is the admission. `tools/ai-bench/AiBench.java` gains self-test scenarios only.

**Hidden information (hard rule 8) and threads (hard rule 3).** No arm reads anything hidden. `declined` lists the
seat's own castable spells (`ComputerUtilAbility.getAvailableCards` for the seat, as today) and aims each one with
the targets `canPlaySa` left on it where they are still legal, else with Forge's forced-trigger path
(`doTriggerNoCostWithSubs` with `mandatory` true). That path is not the choice Forge's chooser makes at a priority:
it is what Forge answers for a trigger it must put on the stack, chosen per effect (for a harmful one an opponent's
object first, then an ally's, then the seat's own, as the review read Forge's AI), so a harmful spell can come back
aimed at our own side (the rollout scores it, and it
costs one of the six candidate slots). Both choose among the objects the spell may target, through Forge's own
targeting rules, and the targets go nowhere but onto the play. `instant` adds no listing at all: it lets today's search run in
more windows. `lands` lists the seat's own playable lands (its hand, or a zone a may-play permission opens to it,
D466). Every rollout redeals what the seat cannot see exactly as today (`Determinizer`), in the opponent's turn as
in a block search. Nothing touches the wire, `Snap` or a `CardView`. Every new call runs inside
`chooseSpellAbilityToPlay` on the game thread; no thread and no `invokeInGameThread` is added, so `HOP_ALLOW` stays
three.

**Rejected.**

- **Activations Forge declines** (the biggest pool: 10,696 left-out options in searched windows, 2,159 own-main
  windows with activations only). When the search is offered an activation it picks it least (5.1% against 13.1% for
  a cast), and at a leaf scored at this turn's end a mana-sink activation (a Clue in MAIN2: +40 a card) looks free
  while the mana it spends at instant speed is invisible; it would teach the seat to tap out.
- **Every opponent-turn window.** 31.9 a game at 0.6–0.8 s is about 20–25 s a game, doubling the search's time, for
  windows Forge passes in 96.1% of the time and whose options are mostly activations (14,649 of 22,962 offer only
  activations) and counter-magic with nothing to counter.
- **The stack windows now** (responses: 385 where Forge acted with a stack, 0.53 a game, and 4,970 in the seat's own
  main phase where it acted in 49). Responding is where counter-magic lives, but the install on a non-empty stack is
  not yet tested; it is `instant`'s follow-up.
- **A spell before the land drop, and holding the land.** Forge, asked again in the rollout, plays its land next (or
  in MAIN2): the transposition that makes 33.6% of MAIN1 comparisons exactly 0. Only landfall-type orderings differ.
- **`cands` above 6.** The override rate already climbs sixfold from 2 to 6 candidates; more candidates at the same
  clock thin the rounds and feed the best-of-many noise.
- **Taking the candidates from the random seat's listing** (`Explorer.randomOptions`: every payable play, targets
  drawn at random). Random targets are not Forge's aim, and that code is D509's frozen seat.

**What is unverified.**

- **Everything in this lane is uncompiled and untested** (J213 held the machine): the three keys, the search's
  branches, the retry guard, `DecisionSelfTest.searchCandidates` (29 checks), the ai-bench scenarios (each of which
  first asserts that its board gives Forge the answer the arm needs, then requires the arm to fire: a board that
  does not is a failure to fix, not a pass), the ladder test and the hashes.
- **The retry guard** has no self-test of its own: no board here makes a widened pick fail to cast. The pilot's
  `search.p.<key>.retry` a game is its measure (point 11).
- **The costs** (point 12): interpolated from the recording when written; the lane's pilot (*Verification*) put
  each arm at 1.18 to 1.29 times search-v3's search time on its 4 ladder games, and a land window at the full 1.5 s
  budget, more than point 12 assumed; J214's own pilot and matches measure it.
- **That `mapSa` puts an aimed declined spell's targets on the copy** for every kind of target; the self-test holds
  one (Giant Growth on the seat's own Bears).
- **That Forge's forced-trigger targeting behaves on the real game inside `chooseSpellAbilityToPlay`** as it does on
  the grader's rebuilt position, and how far an aim moves Forge's later answers: the targets it leaves on a declined
  spell the search does not pick are checked for staleness before they are trusted again (point 2), but the AI
  memory an aim writes is not undone.
- **Which refusal kept each left-out cast out** (`CantPlayAi` targeted, another `AiPlayDecision`, or the `cands` cut):
  the records do not carry `canPlaySa`'s answer; the pilot's counters say how many aimed spells the arm lists.
- **The install at an instant-speed step on the pinned jar**: point 5 is read from the `forge-2.0.14` tag's source,
  not the jar's bytecode; the self-test runs on the jar and says what it saw.
- **That `mapSa` maps a land ability** onto a copy (the land drop is a `LandAbility`, matched by description and
  kind); the self-test holds two lands.
- **The labels' 103 MAIN1 casts**: whether they were candidates by `WillPlay` or as D312's declined spells,
  `atlas.json` does not say.
- One opponent and one deck set: the confirm set's 30 deck pairs, as every search number since D398.

**Verification (the lane, 2026-11-12, after J213 ended; on `bf9fe5f17`, D539's merge, with this lane on top):**

- `./tools/check-forge.sh`: the pinned jar, `3c0a7c38…8e5dd9`. `./bridge/build.sh` built at the first attempt: the
  lint and its self-test (33 rules, 79 firing cases), javac, every build self-test; **decision self-test 472 checks, 0
  failures** (443 before this lane, D539's Verification, plus `searchCandidates`' 29).
- `./tools/cubelab.sh seat-identity`: **all 4 games are the golden's** (forge, search, explore, plain), so the keys-off
  path plays as before.
- `./tools/ai-bench.sh --selftest`: **352 checks, 0 failures.** Two of D540's scenarios failed at the first run and
  were fixed in the test, not in the search: (1) the install at the seat's own beginning of combat threw a
  `NullPointerException` (`Combat.initConstraints`) because `GameState` sets the step without the `Combat` object a
  real game holds there; the scenario now gives the game one, as the attack scenarios do; (2) the first instant
  board (Think Twice in hand at the opponent's end step) was `CantPlayAi` for Forge, so the board did not hold the
  answer the arm needs, and the scenario said so; it is now Scavenging Ooze with green open and creatures in the
  opponent's graveyard, the commonest empty-stack end-step play Forge made in J212's recording (67 times in 720
  games). Every D540 scenario now shows its board first (Forge declines Giant Growth, `CantPlayAi`; Forge activates
  the Ooze at the end step; Forge plays a land with two land names in hand) and then the arm firing
  (`search.p.declined.windows` 1 with the Counterspell dropped, `search.p.instant.windows` 1 with 2 candidates,
  `search.p.lands.windows` 1 with 2 candidates), and each key-off scenario counts nothing of D540's.
- `node --test web/test/ai-ladder.test.ts` 55 of 55, `web/test/claude-md.test.ts` 5 of 5, `node tools/decisions.mjs
  check` OK (next D541). `./tools/ai-ladder.sh list` resolves the three players at the hashes the Python
  re-implementation gave: `search-v3-declined` 795daea97aaa, `search-v3-instant` 25ee7e76b741, `search-v3-lands`
  e0b09eb7b014, each seat config search-v3's plus its key.
- **The arm gate (point 11), on the lane:** per arm a 4-game ladder match against `search-v2-no-b` (`--host
  j214-pilot`, one batch pair, 4 workers) and a 4-game recorded run against Forge Default (the confirm set's first
  pair, seed 214000001, 4 workers):

  | arm | windows, ladder / recorded (a game) | errors + timeouts | retry | B's D540 counters | searched outside the arm's window | A / B search s (ladder) |
  |---|---|---|---|---|---|---|
  | `declined` | 29 / 5 (7.25 / 1.25) | 0 | 0 | none | none (all 59 recorded in own main) | 50.4 / 42.6 (×1.18) |
  | `instant` | 12 / 17 (3.0 / 4.25) | 0 | 0 | none | none on a stack (17 instant-speed, 55 own main) | 63.0 / 49.8 (×1.26) |
  | `lands` | 10 / 11 (2.5 / 2.75) | 0 | 0 | none | none (11 land windows, 40 own main) | 53.6 / 41.7 (×1.29) |

  All three pass. `declined` aimed 40 spells and dropped 64 with no legal aim over the 8 games, and changed Forge's
  answer to an aimed spell 6 times; `instant` changed 8 of its 29 windows; `lands` 3 of 21. Both sides searched
  priority and attacks and no block in every ladder pilot. A land window took the whole 1.5 s budget (all 11 recorded,
  1,514 ms on average), and the recorded runs' ms by candidate count ran about 1 s at 2 candidates (4 workers) against
  J212's 598 ms (7 workers on other decks), so point 12's seconds are low: scaled by the pilot's ratios to J211's
  19.3 s, the arms are about 22.8, 24.4 and 24.8 s a game, about 2.3, 2.4 and 2.4 h a match by point 12's fit.
- Not run on the lane: the full gate (the coordinator's, at the merge) and the atlas self-test.

**Follow-up.** J214 plays the three matches at this lane's merge; its `report.md` carries each arm's reading, its
exposure and its cost, and `summary.md` (the PC session) words them. A candidate's confirmation is its own job
under its own decision. Its row in PLAN is the cube lab's 57.

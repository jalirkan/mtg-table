## D477 — A fork whose game Karn Liberated restarts plays the new game on: the copy starts it as Forge's `startGame` loop would, and the branch or rollout is scored on it (amends D451, D312)

*Branch `pc/fork-karn-restart`. `node tools/decisions.mjs next` gave D477 (D476 is #201's). Amends **D451** (what a
branch plays) and **D312** (what a rollout plays). Touches every fork step loop: `Atlas.play` and
`SearchPolicy.playout`.*

**2026-10-24**

**Context.** J162's modern7 spine (`lab-j162/b-modern7-466`, phase B) has 62 branch games that errored with
`NullPointerException` at `ComputerUtilAbility.getAvailableLandsToPlay:39`. That is 0.55% of the 11,200 random branches.
After the first few the JVM drops the message, so 46 of the rows read `NullPointerException` and nothing else. All 62
are random continuations, at 15 decisions. Each row says `turns: 0, steps: 0`, but that is only how an errored row is
written.

**What it was.** I replayed `d0` random branch 191 (options 0 and 2) and `d1` random branch 6 (option 1). The stack
starts at `PhaseHandler.mainLoopStep:1056` → `AtlasController.chooseSpellAbilityToPlay` → Forge's
`getAvailableLandsToPlay`, which reads `PhaseHandler.getPhase().isMain()` and finds the phase null. The frame logs show
why. Seat B's random seat had raised Karn Liberated to 14 loyalty and activated **−14, "restart the game"**. At the
`forge-2.0.14` tag:

1. `RestartGameEffect.resolve` puts every card in the battlefield, library, graveyard, hand and exile back into its
   owner's library. The exception is the non-Aura permanents exiled with Karn: they stay in exile, and the sub-ability
   puts them onto the battlefield under the activator's control. The effect also resets life, counters and the
   players' per-game state, calls `PhaseHandler.restart()` (turn 0), sets the age to `GameStage.RestartedByKarn`, and
   sets the activator as the player whose turn it is.
2. In the same `mainLoopStep`, `PhaseHandler.java:1150` sees that age, sets the phase to **null**, fires
   `GameEventGameRestarted`, and returns.
3. **Only `GameAction.startGame`'s do-while starts the new game** (`GameAction.java:2326-2381`). Its `mainGameLoop`
   returns on that age. The loop then deals the opening hands, runs the mulligans, the opening-hand actions and the
   `NewGame` triggers, and calls `startFirstTurn` with the activator, with no coin toss.

A fork does not run in that loop. `Atlas.play` and `SearchPolicy.playout` call `mainLoopStep` themselves, so they went
on stepping a game with no phase, no hands, and turn 0. The next priority threw.
- **In the atlas**, the branch errored, and the option's value dropped it (D466).
- **In the search**, the rollout errored (`search.rolloutErrors`) and was dropped or fallen back from, like any engine
  error.

**Decision: (a), continue faithfully.**

1. **`ForkRestart.begin` starts the new game on the copy** as `startGame`'s loop body would. It runs from the point
   where Forge's loop takes up a restart:
   - the first player is the one whose turn the effect set;
   - it fires `GameEventGameStarted`;
   - it runs the pre-opening-hand actions (Emissary's Ploy, Cryptic Spires);
   - it sets the age to `Mulligan` and draws each starting hand (Backup Plan's extra hands too);
   - it runs `new MulliganService(first).perform()`, sets the age to `Play` (and Planechase's plane, never in our
     games), and runs the opening-hand actions (a Leyline, Gemstone Caverns, `BecomeStartingPlayer`);
   - it calls `checkStateEffects(true)`, runs the `NewGame` trigger, calls `setStartingPlayer`, and finally
     `PhaseHandler.setupFirstTurn(first, null)`.

   The fork's own loop then plays the new game. The two opening-hand helpers are private in the pinned jar, so their
   bodies are written after Forge's (hard rule 7 allows this; every call is javap-checked against 2.0.14). Filtered
   starting hands are another private draw. They are off here, and they are refused with an error rather than
   imitated.
2. **Both loops call it** when `GameStage.RestartedByKarn` is seen after a step (`ForkRestart.pending`).
   - **Turns are counted across the restart.** The loop adds the turn on which the restart resolved to the new game's
     turn numbers. A branch still runs to D451's turn cap (40, counted over both games), and a rollout still runs to
     its horizon (end of this turn plus `turns`).
   - **The branch row's `turns` is the total**, and the branch's `GameLedger` enters the new game's turns after the
     old ones (`turnOffset`) instead of overwriting them.
   - The atlas row says **`restarts: n`**, and phase B counts them as `branchRestarted` (in `atlas.md` too). The search
     counts **`search.restarts`** (`search.prior.restarts` for the ranking's playouts).
3. **A restarted branch is a played branch.** Its result is the restarted game's result, from seat A's side, and it
   counts in its option's value like any other. It is not an error, not a new class, and not left out.
4. **One exception: the forced answer was never given.** If the seat's forced first answer is still armed at the
   restart (`RolloutForcing.unanswered()`), the option was never played in that copy. The fork throws D470's
   `OptionUnavailable`. That has not been seen: −14 is sorcery-speed, and every forced answer is given at the fork's
   own priority or combat, before any main phase in which someone could activate it.

**Why (a).** The restart is the honest consequence of a move both continuations can make. The random seat picks it
uniformly, and Forge's AI plays an ultimate when it can. A branch's value is meant to be the game that follows the
option, and that game includes the restart.
- **(b), "restarted" as its own excluded class**, would drop the branches where Karn's controller reached 14 loyalty.
  Those are branches where that player was doing well, so it would bias the option's value against seat B's good
  games.
- **(c), a fixed value (½, or the random map's base)**, would put a number on a game nobody played.

The copy can restart cleanly:
- **It is a full game.** `GameCopier` copies all seven zones, both libraries included, and the restart gathers only
  copied zones.
- **Its hidden cards are already redealt from seat A's knowledge.** The copy's seat-B hand and library are the
  `Determinizer`'s redeal of the multiset (D451 point 5, D312). Re-dealing them after a restart uses nothing seat A
  could not know.
- **The redaction checker passes** on the restarted branches' frame logs (below).

The cost is one more game in about 1 branch in 200 of a Karn deck's random continuations, bounded by the same cap.

**Not fixed here, found on the way.**
- **A card exiled with Karn before the fork is not "exiled with" Karn in the copy.** `GameCopier.addCard` has
  `// TODO ExiledWith` (`GameCopier.java:351`), so the copy loses that link. If Karn exiled cards in the real game
  before the fork and −14 is played in the copy, those cards go to their owners' libraries instead of onto the
  battlefield under the activator's control. Cards Karn exiles inside the copy keep the link, as the three J162
  branches show (Elder Gargaroth and Polukranos came back under seat B). Copying `ExiledWith` is a general copier-fidelity
  change: it also decides `Card.isOnAdventure`, which is D476's ground. So it is left as its own follow-up, beside
  D476's open effect-source item.
- **A capped branch is scored as seat A's win, not a draw.** `Atlas.play` ends a game that reaches the cap, the step
  cap or the deadline between steps with `setGameOver(GameEndReason.Draw)`. `Player.onGameOver` gives every player
  still without an outcome `PlayerOutcome.win()`, so `SearchPolicy.resultOf` returns +1. In J162's modern7 spine all 4
  capped branches have `result: 1`. Phase A has a check for this (`cappedNotDrawn`) and phase B does not. A restarted
  branch plays longer, so it reaches the cap a little more often, and when it does it is scored as every capped branch
  is. This is a pre-existing scoring error with its own comparability note, so it is left as a follow-up. *(2026-10-24: fixed by **D478**: such a branch is `result 0`, `score .5`, and the atlas checks it.)*

**What it rests on.** No new thread, and no hop onto the game thread (hard rule 3): the new game is started on the
game thread, inside the fork's loop, between two steps. No reflection (lint rule 8). Every Forge call is in the pinned
jar (javap):
- `GameEventGameStarted(GameType, Player, Iterable)`, `MulliganService(Player).perform()`, `BackupPlanService`;
- `GameAction.checkStateEffects(boolean)`, `TriggerHandler.runTrigger`, `AbilityKey.newMap()`;
- `Game.setStartingPlayer`, `Game.setAge`, `PhaseHandler.setupFirstTurn(Player, Runnable)`;
- `StaticData.getFilteredHandsEnabled()`, `PlayerController.chooseSaToActivateFromOpeningHand` and
  `playSpellAbilityNoStack`.

The real game is never touched: it restarts through Forge's own loop.

**Comparability.**
- **The atlas: maps change only where a branch reached a restart.** Those branches errored before and now play, so
  they enter their option's value. In J162 these are the 62 modern7 branches. A grep of every `branches.jsonl` under
  `/home/justin-a/code/lab/data` finds the phase-null message in that spine only (a message-less NPE there is the same
  fault once the JVM drops the text). Every other branch is unchanged: the replays' other options match J162's rows to
  the step.
- **The search:** a rollout that reaches a Karn restart used to error and now plays, so search answers can change in
  games with Karn Liberated in a deck. Search-v2 results from before and after this change are two engines where that
  card is played. Do not pool them; split them by the experiment log's git sha, as D466 and D470 ask.

**Measured.**
- **The three J162 branches, replayed** (one unit each, one worker, built from J162's own `plan.json` and
  `phaseB/baseline.json`). Each now plays through the restart:

  | branch | J162 | now | restart |
  |---|---|---|---|
  | `d0` o0 b191 | NPE | 31 turns, 941 steps, seat A lost | turn 24, seat B's Karn |
  | `d0` o2 b191 | NPE | 38 turns, 1,092 steps, seat A won | turn 20 |
  | `d1` o1 b6 | NPE | 35 turns, 978 steps, seat A lost | turn 20 |

  - In each, the frame log shows the −14 resolving, then turn 1 of the new game with seat B active, both seats at 20
    life with 7 cards in hand, and the cards Karn had exiled on seat B's battlefield.
  - The branches' ledgers run on without a gap (`t` 3–31 for `d0` o0).
  - `tools/check-redaction.mjs` passes on all 14 frame logs of the two units.
  - The other four branches of the units match J162's rows in result, turns and steps: `d0` o1, and `d1` o0, o2 and o3.
- **`tools/ai-bench.sh --selftest`: 134 checks, 0 failures**, 4 of them new (`karn-restart-fork`). The plant: Karn
  Liberated at 14 loyalty on the seat's turn 5, both libraries of 16 cards, the −14 forced as the seat's answer.
  - An atlas branch (Forge's continuation, cap 8) plays through `restarts 1` to the cap at turn 9 (5 + 4), with no
    error and nothing unavailable.
  - A search playout (horizon 3) counts `search.restarts` 1 and reaches turn 4 of the new game. At its leaf the age is
    `Play`, the seat went first, both players have 20 life, and every one of each player's 20 cards is in a zone.
  - The real game is untouched: turn 5, Karn at 14.

  With `ForkRestart.pending` forced false, the atlas check fails with J162's exact
  `NullPointerException: Cannot invoke "forge.game.phase.PhaseType.isMain()" ...`, and the playout throws it.
- **`DecisionSelfTest.forcedUnanswered`** (in `bridge/build.sh`) checks the exception's predicate: a forced answer
  armed and not given is unanswered, and nothing forced is not.
- **`web/test/cubelab-atlas.test.ts`: 23 of 23**, one of them new.
  - A streamed branch keeps `restarts`.
  - A restarted branch counts in its option's value.
  - `phaseB.branchRestarted` counts it, `atlas.md` says so, and no problem is raised.

  `tsc --noEmit` is clean.
- **`bridge/build.sh`: OK.** **`tools/cubelab.sh atlas-selftest --jobs 1`: OK** (16 forks, 8 no-leak checks, 38 frame
  logs, 538 rows), in 2 min 27 s.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on `1f682de2` (rebased onto `0f9275b4`, #201's merge): **OK, 59 of 59 jobs**, 518.2 s wall (load average up to 16.9).

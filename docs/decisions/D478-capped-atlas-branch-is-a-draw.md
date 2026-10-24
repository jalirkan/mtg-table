## D478 — A capped atlas branch is a draw: `result 0`, `score .5`, and the atlas checks it as it checks phase A (amends D451; D477's follow-up)

*Branch `pc/atlas-capped-draw`, on origin/main `fb3f21f5` (#202, D477, merged). `node tools/decisions.mjs next` gave
D478. Amends **D451** point 7 (a branch scores 1 / ½ / 0 from seat A's side) and closes the follow-up D477 wrote, "A
capped branch is scored as seat A's win, not a draw".*

**2026-10-24**

**Context.** `Atlas.play` ends a branch that is still running at D451's turn cap, at the step cap or at the deadline
between steps with `Game.setGameOver(GameEndReason.Draw)`. Then it read the result with `SearchPolicy.resultOf`. Forge's
`setGameOver` calls `Player.onGameOver` on every player, and that gives a player with no outcome a **win**
(`PlayerOutcome.win()`, javap on the pinned jar). So both seats had "won", `resultOf` read seat A's `hasWon()`, and the
row said `result: 1`, `score: 1`. A capped branch went into its option's mean as seat A's win. Phase A does not have this
fault: `CubeLab` reads `GameOutcome.isDraw()` and the `TurnCap` flag, and `atlas.ts` fails a capped phase A game that is
not a draw (`cappedNotDrawn`). Phase B had no such check.

**Exposure.** Measured read-only from every atlas folder's `phaseB/branches.jsonl`. **Every capped branch in every
folder has `result: 1`.** There are no other results among them.

| spine | branch rows | capped (random + Forge) | share | decisions with a capped branch | largest shift of one option's mean |
|---|---|---|---|---|---|
| J150 ff5-452 | 16,080 | 408 (370 + 38) | 2.5% | 13 of 16 | 6.25 points (d20 o3, Forge, n 40) |
| J150 ff5-453 | 12,480 | 103 (87 + 16) | 0.8% | 16 of 16 | 5.0 points (d23 o1, Forge, n 40) |
| J150 ff5-454 | 14,160 | 228 (209 + 19) | 1.6% | 15 of 16 | 2.75 points |
| J150 peasant7-455 / 456 / 457 | 12,240 / 15,360 / 9,600 | 0 / 1 / 1 | ≤ 0.01% | 0 / 1 / 1 | ≤ 1.25 points |
| J150 vintage7-458 / 459 / 460 | 16,990 / 10,080 / 6,480 | 4 / 23 / 15 | 0.02–0.23% | 2 / 9 / 5 | ≤ 1.25 points |
| J157 vintage7-458 / 459 / 460 | the same counts as J150's | 4 / 23 / 15 | | 2 / 9 / 5 | ≤ 1.25 points |
| J158 ff5-461 | 14,160 | 43 (35 + 8) | 0.30% | 11 of 16 | 1.5 points |
| J158 pauper5-464 (partial) | 6,065 | 29 (26 + 3) | 0.48% | 7 of 9 | 2.5 points |
| J158 peasant7-463 | 17,280 | 2 (2 + 0) | 0.01% | 1 of 16 | 0.5 points |
| J162 ff5-462 | 14,880 | 69 (67 + 2) | 0.46% | 7 of 16 | 2.5 points |
| J162 modern7-466 | 13,440 | 4 (2 + 2) | 0.03% | 3 of 16 | 1.25 points |
| J162 pauper5-464 | 14,400 | 71 (64 + 7) | 0.49% | 15 of 16 | 2.5 points |
| J162 synergy9-465 | 12,960 | 1 (0 + 1) | 0.01% | 1 of 16 | 1.25 points |

The pilots (J150, J157 ×2, J158, J161, J162) have no capped branch. A branch that timed out between steps (`timedOut`,
no engine error) went through the same path: 4 rows in all (J150/J157 vintage7-458 one each, J158 pauper5-464 two), all
`result: 1`. No branch reached the step cap (the most steps in any row is 45,448, against 400,000). This confirms the
#202 reviewer's counts (ff5-461 43 of 14,160, ff5-462 69 of 14,880, pauper5 71 of 14,400, modern7 4, peasant7 2,
synergy9 1). One correction: the largest shift of an option's mean in J158 and J162 is **2.5 points**, not 2. That is 10
capped of 200 random branches (ff5-462 d8 o1), or 2 of 40 Forge branches (pauper5-464 d2 o0). On J150's ff5 spines it
reaches **6.25 points**.

**The labels, recomputed** (read-only; nothing in the lab folders is rewritten). I rebuilt each labelled decision's two
maps from `branches.jsonl` with this branch's `decisionAtlas`, using the atlas's own bootstrap seed (`plan.seed + d ×
7919`, 1,000 resamples). The script ran twice:

- **As written.** All 96 labels came back exactly: J158's 32 rows and J162's 64 rows (59 of them complete). That covers
  regret, interval, `confident` and `confidentForge`.
- **With every capped or loop-timed-out played branch scored a draw.** The results:

| label set | labels with a capped branch | any value or interval moved | random regret (the label) moved | Forge regret moved | best option changed | `confident` changed | `confidentForge` changed | largest regret shift |
|---|---|---|---|---|---|---|---|---|
| J158 (`lab-j158/report/labels.jsonl`) | 12 of 32 | 6 | 5 (d6 .065 → .0575, d8 .06 → .0625, d18 .115 → .1175, d24 0 → .0025; peasant7 d1 .015 → .01) | 2 (d6 .2 → .1875, d18 0 → .0125) | 2 (d18 Forge 0 → 3, d24 random 0 → 2) | **0 of 6** | **0** | .0125 |
| J162 (`lab-j162/report/labels.jsonl`) | 26 of 64 | 16 | 4 (ff5 d8 .005 → 0; pauper5 d2 .07 → .0725, d10 .135 → .14, d23 .035 → .025) | 3 (pauper5 d2 .05 → .075, d29 .025 → .0375; synergy9 d20 .125 → .1125) | 1 (ff5 d8 random 2 → 0) | **0 of 7** | **0 of 5** | .025 |

In this table, a best option that changed is one whose regret moved by at most .0125 in either direction, between options
that are tied within their intervals. **No existing label changes whether it is confident.** The values do move, by up to
2.5 points, so **labels from before this decision are not pooled with labels from after it** as one set unless their
values are recomputed. The recomputation above is the method: capped → `result 0`, `score .5`, the same bootstrap seed. J150's ff5
spines carry no labels, but they are the most exposed, and their atlas values are not comparable with a post-D478
atlas.

**Decision.**

1. **A branch the loop ended is a draw.** In `Atlas.play`, a game that is not over when the step loop stops has
   `result = 0`. That covers the cap, the step cap and the deadline between steps. The game is still ended with
   `setGameOver(Draw)`, so the recorders' last frames and the ledger's snapshot are unchanged. A game the engine ended
   still reads `SearchPolicy.resultOf`. The row's `score` is `scoreOf(0)` = .5. The rows file's `winner` is `draw`, because
   `DistillRows.endGame` reads `result`. `SearchPolicy.playout` (the search's rollouts) is not this path. It never ends
   a cut game, and it scores a game that is not over by its leaf, so the search is unchanged. Phase A is not this path
   either: `CubeLab` was already right.
2. **The atlas checks it, as it checks phase A.** `writeAtlas` adds a problem (exit 3) for a capped or loop-timed-out
   branch that is played and has a `result` other than 0, counted as `checks.branchCapped.notDrawn`. Re-checking any atlas
   folder written before this decision therefore reports its capped branches as a problem, which is the truth about them.
3. **An option capped past `--branch-error-max` is a problem.** `cappedBranches` uses the same tally as D466's errors and
   D470's unavailable options. It writes `checks.branchCapped`: by option and continuation, and the options over the bar,
   each a problem line "N of M branch game(s) were capped". A capped branch stays in the option's value at ½, but it says
   only that the game ran long, not what the option did. atlas.md gets a section, *Branch games the turn cap ended*. At
   the default bar (one in ten), no option in any lab folder reaches it: the most is 7.1% (J150 ff5-452), and 4.2% in
   J158 and J162 (ff5-462).

**Rejected.**

- **Leaving capped branches out of the option's value, as an error is.** A long game is a result of the position, and
  dropping it would bias the option toward its short games. D451 already says a draw by the cap counts half.
- **Reading `GameOutcome.isDraw()` in `Atlas.play`.** "We ended it" is the fact, and it is known without asking Forge.
  `isDraw` reads the players' ratings, a second definition of the same thing.
- **Rewriting the lab folders' rows.** They are evidence of what was run. The recomputation is written here instead.

**Not changed, noted.** When both players lose at once, Forge ends the game as a draw with both players' outcomes losses.
`resultOf` returns −1 for seat A in that case (`hasLost` first), in the atlas and in the search alike. That is a separate
question with no measured case, and it is left as it is.

**Tests.**

- `./tools/ai-bench.sh --selftest`, *a capped atlas branch is a draw (D478, engine)*. A quiet board (lands only, both
  seats at 20) is played as an atlas branch to a cap one turn on. It comes back `capped`, at turn 7, with `result 0`, and
  the real game is not over. In the control, a Lightning Bolt is forced at a seat on 2 life: the branch ends at turn 5,
  not capped, with `result 1`. Without the fix the first check fails with `result 1`.
- `web/test/cubelab-atlas.test.ts`, *a capped branch is a draw*. Capped branches are counted by option and over the bar.
  A capped branch stays in the map at a half. Rows as J162 wrote them (`result 1`) are a problem. A played loop timeout
  is held to the same rule.
- `./bridge/build.sh` (the lint, its self-test and the eight self-tests), `node --test test/cubelab-atlas.test.ts` (24
  pass) and `tsc --noEmit`: clean. `tools/cubelab.sh atlas-selftest --jobs 1`: **OK** (16 forks, 8 no-leak checks, 38
  frame logs, 538 rows), in 2 min 23 s.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on `13ac20d1` (this branch's code;
  only this line differs): **OK, 59 of 59 jobs**, 517.8 s wall (load average up to 15.1).

## Addendum, 2026-10-24 — a capped option is a warning, and an engine-ended draw is a draw (#203's review)

*Branch `pc/atlas-capped-warn-engine-draw`, on origin/main `fbca6235` (#203, this decision, merged). Two follow-ups from
#203's review. Amends point 3 above and closes the "Not changed, noted" paragraph.*

**1. An option capped past the bar is a warning, never a problem.** Point 3 made an option whose branch games were capped
more than `--branch-error-max` of the time a problem: exit 3, and `atlas.problems == 0` fails. But a capped branch is a
long position, scored ½ and kept in the value, not a fault in the tool. A pauper or ff5 night at the 40-turn cap could
fail on it for nothing wrong: J150's ff5-452 reached 7.1% on one option, under the bar only by luck of the cube.
- `cappedBranches` keeps its tally and `checks.branchCapped` keeps its counts by option and continuation.
- Its bar is now a flag of its own, **`--branch-capped-warn`** (default **0.25**, `BRANCH_CAPPED_WARN_DEFAULT`; in the
  plan as `branchCappedWarn`). `--branch-error-max` no longer moves it.
- An option over that bar is a line in **`checks.warnings`**, printed as `atlas warning:` and listed in atlas.md's
  *Branch games the turn cap ended* as "a warning". It never adds a problem and never makes the atlas exit 3.
- **`notDrawn` stays a problem**: a capped or loop-timed-out branch written with a result other than 0 is a fault in
  the tool, and still exits 3.
- One in four says the option's value is mostly long games. No lab folder through J162 comes near it (7.1% at most).

**2. `resultOf` reads an engine-declared draw as a draw.** `SearchPolicy.resultOf` tested `ai.hasLost()` first, then
`hasWon()`. Forge ends a game drawn in two ways, and javap and the `forge-2.0.14` source agree on both:
- **Every player loses at once.** An example is one effect putting both seats to 0 life, or one seat at 0 life while
  the other draws from an empty library. `checkGameOverCondition` gives each a loss outcome, finds no player left, and
  sets `GameEndReason.Draw`.
- **An effect makes the game a draw.** Examples are `GameDrawEffect` (Divine Intervention, Celestial Convergence) and
  `MagicStack.add` past 999 items. Both call `Player.intentionalDraw()` on every player. That outcome's `lossState` is
  `IntentionalDraw`, so `hasLost()` is true of both seats as well.

Both read **−1** for seat A. One correction to the review's note: Forge's own `Draw` reason does not give every player
`win()`. Only `setGameOver(Draw)` on a game with no outcome yet does that, through `Player.onGameOver`. That is our
call: the atlas's cap, which point 1 already bypasses, and the watchdogs. It read **+1**.

**The fix.** `resultOf` is now **0 whenever every player carries an outcome of the same kind**: all lost, or all
"won". Otherwise it is unchanged: −1 if the seat lost, +1 if it won or an opponent lost, 0 while the game goes on. It is
public and the one place a fork's result is read:
- the atlas's branches (`Atlas.play`, a game the engine ended);
- the search's rollouts (`Playout.result`, so `winOf` gives .5);
- `SearchPolicy.leaf`'s decided cases. The leaf had its own copy of the same tests, and an engine-drawn rollout's leaf
  was −`WIN` + 100 × turn. It now calls `resultOf`, so that leaf is 0, the draw's value that was already there.
`LeafRows` and `CoachGrade` call the same leaf on replayed positions. They differ only on a position where the game
has already ended drawn.

**Tests.** `./tools/ai-bench.sh --selftest`, *a game the engine ends drawn is a draw (D478 addendum, engine)*:
- **Both seats lose at once.** A Flame Rift is forced with both seats on 2 life. The atlas branch is not capped, ends
  at turn 5 and has `result 0`. The search playout is over with `result 0`, win .5 and leaf 0.
- **Without an outcome.** On the same scenario's own game, `setGameOver(Draw)` gives both seats `win()`, and
  `resultOf` reads 0.
- **Control.** The same Flame Rift with only the seat on 2 life is still `result −1`.
- **An effect makes it a draw.** Divine Intervention with its last intervention counter, removed at the seat's upkeep
  on turn 7. The atlas branch is not capped, ends at turn 7 and has `result 0`. The playout gives `result 0`, win .5 and
  leaf 0.
  - The scenario sets its game's age to `Play` and resets the active triggers. A scenario's game never leaves
    `BeforeMulligan`, and `checkStateEffects` activates triggers only in `Play`, so without that no upkeep trigger
    fires. Real and lab games are in `Play`.

With `resultOf` as it was, five of these checks fail: −1, −1 with leaf −99,500, +1, −1, and −1 with leaf −99,300. The
control passes.

The rest:
- `web/test/cubelab-atlas.test.ts`: a capped option is a warning and exits 0, at the default bar and at
  `--branch-error-max 0.01`, and with every branch of the option capped. Under `--branch-capped-warn 0.5` there is no
  warning. Rows written `result 1` and a played loop timeout are still problems, exit 3.
- `./bridge/build.sh` (the lint, its self-test and the eight self-tests); `./tools/ai-bench.sh --selftest`, 145 checks,
  0 failures; `node --test test/cubelab-atlas.test.ts` (24 pass) and `tsc --noEmit`: clean.
- `tools/cubelab.sh atlas-selftest --jobs 1`: **OK** (16 forks, 8 no-leak checks, 38 frame logs, 538 rows).
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on `d6212c40` (this branch's
  code; only this line differs): **OK, 59 of 59 jobs**, 519.0 s wall (load average up to 15.1).

**Engine draws in the lab data** (read-only). I read the `over` frame of every branch's seat-0 log in every atlas folder
under `lab/data`: 237,025 logs for 245,566 branch rows. Every played branch has one. A `reason` of `Draw` on a branch that the loop did not end (not capped,
not timed out, no error) is an engine-ended draw:
- **2 distinct branches, in 3 rows**, all on the vintage7-458 spine, all random continuations, all written `result −1`,
  `score 0`.
  - `d9-random-o0-b130` is in J150 and J157. It ended at turn 33.
  - `d10-random-o3-b116` is in J157 only. It ended at turn 25. J150's copy of it errored before D472.
- In both, the ledger's last turn has seat A at 0 cards in library and seat B at −1 life. Both lost at the same check.
- **Every other folder has none.** That is J150's ff5 and peasant7 spines, J158, J162 and the pilots. The `Draw`
  reasons there are exactly the capped and loop-timed-out branches, for example 408 of 408 on ff5-452 and 31 = 29 + 2
  on J158 pauper5-464.
- Phase A: none in 14,772 games (`TurnCap` 287). `CubeLab` read `isDraw()` there anyway.

**What the maps do.** I recomputed with `decisionAtlas` and the atlas's bootstrap seed.
- **J150/J157 d9.** Option 0's random mean goes back to .9492 from D478's .9463. D478 had moved one capped win to ½;
  this moves one engine draw from 0 to ½. The best option (2) stays, and regret is .0056 [0, .0452], as written.
- **J157 d10.** Option 3 was tied with option 0 at .9476. It goes to .9503 and becomes the random map's best, so
  regret goes from 0 to .0026 [0, .0445]. Inside the interval, it is a tie broken by half a game.
- J150's d10 has no played random branch.
- **No label is touched.** The labels are J158's and J162's, and neither has an engine draw.
- **Atlas maps from before and after this addendum differ only on engine-drawn branches.** Recompute those as `result 0`,
  `score .5` before pooling.

**Not pooled: the search.** Search-v2's rollouts score through the same `resultOf`, and its leaf through the same tests.
A rollout the engine ended drawn was a loss before this change (win 0, leaf −`WIN`) and is a draw after it (.5, leaf 0).
**Search-v2 results from before and after this addendum are not pooled.** Split them by the experiment log's git sha,
as D466, D470 and D476 ask. Engine draws are rare (3 rows of 245,566 branch rows here), but the rule does not
depend on the rate.

**Rejected.**
- **Reading `GameOutcome.isDraw()`.** It is true when no player `hasWon()`, so it calls a both-`win()` game *not* a draw.
  That is the wrong answer for exactly the case our own `setGameOver(Draw)` makes. Reading the players' outcomes is the
  one definition that is right both ways.
- **Testing `GameEndReason.Draw`.** It would also be right in these cases. But `resultOf` reads a game that is still
  going, too, and the outcomes are what the players carry in every state. One test serves both.

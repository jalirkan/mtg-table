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

## D506 — Old Man of the Sea and Rubinia Soulsinger join the engine-unplayable list: a self-targeted lose-control command recurses until the stack overflows, and the units hang (amends D482's rule)

*Branch `pc/d506-old-man-of-the-sea`, on main `3275af30` (D502–D504's merge). D506 was reserved for this lane; D505 is
another lane's, in flight, so `node tools/decisions.mjs next` prints D505 until that one merges. Applies **D482**'s rule (a
card goes on the list with a measured stall, the card on the board) and **D492**'s class rule (a mechanic's own code path
lists every pool card with it) to a third engine fault, and amends the list's rule sentence (its `about`) to name that
fault's kind of measurement.*

**2026-11-02**

**Context.** J183 (lab night, mtg-table `3275af30`), spine s11 (legacy, spine seed 2524, deck folder `s11-legacy-2424`):
seat A's deck `legacy-2424-00001` holds **Old Man of the Sea**; seat B's, `legacy-2424-00002`, holds **Preacher** and
**Oko, Thief of Crowns**. Every branch of the spine is the random seat (D451; 0 Forge branches). Measured:

- **71 of its 4,175 branch games errored**, each with `turns: 0`: 51 *StackOverflowError*, 19 *StackOverflowError:
  Delayed StackOverflowError due to ReservedStackAccess annotated method* and 1 *NullPointerException: Cannot invoke
  "forge.game.player.Player.getOpponents()" because "cc" is null*. No branch timed out (`timedOut` is false in every row).
  By decision: d0 9 of 300, d5 11 of 450, d6 23 of 600, d7 5 of 150, d11 11 of 700, d12 1 of 150, d13 11 of 750; d9, d14,
  d15 and d16 had none. No option had more than 10% of its branch games errored (the plan's `branchErrorMax`), so the atlas kept every value.
- **Old Man of the Sea was on the battlefield at the last state frame of seat 0's log in 69 of the 71** (34 alone, 34
  beside Preacher, 1 beside Tamiyo, Inquisitive Student). One (`d0-random-o1-b36`) shows Preacher and not Old Man, though
  seat 1 had targeted Old Man at turns 24 and 28 of it; the NullPointerException's (`d13-random-o4-b43`) shows neither.
- **The six worker logs hold 210,644 lines `Correcting zone for Old Man of the Sea (4)`** (next: Phyrexian Dragon Engine
  7,246, Flitterwing Nuisance 1,550, Tishana's Tidebinder 1,326: seat A's creatures, which Old Man's activations and seat B's steals move). 66 of them are
  unbroken runs of 1,210 to 11,744 lines; the lengths cluster at about 1,222 and about 5,860 (the longest, 11,744, is about two of the
  longer ones back to back), which is the depth a thread's stack reaches before it overflows, at one line a level.
- **Nine units hung, in ten attempts** (`phaseB/units.jsonl`, `attemptErrors: ["no answer in 1800 s (hung)"]`) and were re-run from a fresh
  worker: d0-random-50, d0-random-75, d5-random-50, d5-random-75, d6-random-50, d6-random-125, d11-random-50,
  d15-random-75 (twice, so it never finished: `atlas.unitsShort` 1) and d15-random-100. Worker 1's log, which ran
  d11-random-50, ends in an unbroken run of 4,185 of those lines up to the restart (`==== worker 1 started
  2026-11-02T20:22:38`). The other units' hangs are not traced: the logs interleave and the hung attempts left no frames.
  d15 is past Old Man's death in the baseline (it died at turn 13), but it returned to the battlefield in 19 of d15's 625
  finished branches.
- The night's checks: `engine_errors - atlas.branchTimeoutsInStep <= 50` failed (71 and 1), `unit_errors == 0` failed (1),
  `atlas.unitsShort == 0` failed (1). No other night's `atlas.md` under `/home/justin-a/code/lab/data/` names a
  StackOverflowError. Old Man of the Sea was dealt into two earlier spines, J176 s08 (4,350 branches, 0 errors) and J180
  s08 (6 errors, none an overflow), whose logs hold 181 and 265 of its correction lines and no run.

Evidence: `/home/justin-a/code/lab/data/lab-j183/b-s11-legacy-2524/` (`atlas.md`; `phaseB/branches.jsonl`,
`phaseB/units.jsonl`, `phaseB/logs/worker-*.log`, `phaseB/frames/`), `/home/justin-a/code/pc-results/results/J183/`
(`run11.log`, `checks.txt`, `STATUS`), and the decks
`/home/justin-a/code/lab/data/lab-j183/decks/s11-legacy-2424/decks/legacy-2424-00001.dck` and `-00002.dck`.

**The scripts** (`cardsfolder.zip`): Old Man of the Sea's is
`A:AB$ GainControl | Cost$ T | ValidTgts$ Creature.powerLEX | LoseControl$ Untap,LeavesPlay,LoseControl,StaticCommandCheck |
StaticCommandCheckSVar$ Y | StaticCommandSVarCompare$ GTX` with `SVar:X:Count$CardPower` (Old Man's power) and
`SVar:Y:Count$CardPower` whose host is the controlled card. Preacher's is `AB$ GainControl | Cost$ T | ValidTgts$ Creature |
TargetingPlayer$ Player.Opponent | TargetingPlayerControls$ True | LoseControl$ Untap,LeavesPlay`.

**The mechanism** (the pinned jar, `javap -c -p -l`; the 2.0.15 source checkout reads the same, at other line numbers):

1. `ValidTgts$ Creature.powerLEX` admits **Old Man of the Sea itself**: its power is not more than its own. Forge's AI
   never picks it; the atlas's random seat does, and when Old Man is the only creature with power at most its own it is
   the only legal target. In 69 of the 71 errored branches, one seat's log shows Old Man targeting itself earlier in the
   game (a `target:4` choice, or an activation with no target choice logged while it was the only legal target). A
   self-target alone does not overflow: 1,127 of the branches that finished cleanly have one too.
2. `ControlGainEffect.resolve` builds one lose-control command per target and hangs it on the **source**: line 186 adds it
   to the source's leaves-play commands only when the source is not the target (`source != tgtC`, the one guard), but
   lines 192–193 add it to the source's **change-controller** commands with no such guard. A self-target therefore puts,
   on Old Man's own change-controller list, a command whose subject is Old Man. Untapping runs the untap list, not that
   one, so the command stays as long as Old Man's controller does not change.
3. When Old Man's controller does change — in `d7-random-o2-b47` (`frames/…-seat0.jsonl.gz` and `-seat1.jsonl.gz`) Old
   Man's only legal target at turn 9 is itself, it untaps at turn 11, and at turn 14 seat 1's Oko, Thief of Crowns −5
   exchanges a Golem token for it, and the engine stops; in `d5-random-o1-b64` seat 1 takes Old Man with Oko, Old Man
   targets itself, and Oko's next exchange stops it — `GameAction.controllerChangeZoneCorrection` (lines 995–1041) prints
   `Correcting zone for Old Man of the Sea (4)` and, since the battlefield it sits in is not its controller's, runs
   `Card.runChangeControllerCommands` **before** moving it (line 1023).
4. The self-targeted command (`ControlGainEffect.doLoseControl`, lines 90–100) removes its own temporary controller — not
   the one that made the controller differ — and calls `controllerChangeZoneCorrection` on the same card (line 97). The
   card has not moved, its controller still differs, so that call runs the change-controller commands again, and
   `Card.runChangeControllerCommands` (lines 3668–3671) iterates the list and clears it **only after** the loop: the same
   command runs again, and again. Nothing ends the recursion; each level prints one line, and the thread's stack runs out
   (StackOverflowError, or the *Delayed* one when the overflow lands inside `PrintStream`'s reserved-stack region, which
   the worker logs' 19 *Potentially dangerous stack overflow in ReservedStackAccess annotated method* warnings show, one per
   *Delayed* error).

What this does not establish: whether the other hung units met this recursion, and why a recursion hung instead of
overflowing (worker 1's ended mid-recursion and never printed again; a lock or a frozen tracker left held by the overflow
is a guess, not a finding); and the
NullPointerException, whose stack is `AbilityUtils.getCardListForXCount(3750)` ← `xCount(2863)` ← `calculateAmount(446,
365)` ← `GameAction.checkStaticAbilities(1190, 1074, 1071)` ← `MagicStack.resolveStack(630)`. In the jar, line 1190 is
the static-command check's right-hand side: `calculateAmount(card, "X", null)` on the card that holds the list, the
`X` of Old Man's `GTX`. With no trait, `xCount` has no player (`cc` is null by construction), and the NullPointerException
needs that count to fall through to the generic zone count at line 2863 instead of Old Man's own `Count$CardPower`,
that is, a holder whose `X` no longer reads as Old Man's. Old Man's script is the only `StaticCommandCheck` in either
deck, so the entry is its; what changed the holder (a copy, or a text or ability change) is not traced, and the branch's
last frame shows neither Old Man nor Preacher. The measurement does not need either.

**Decision.**

1. **Old Man of the Sea goes on `tools/cubelab/engine-unplayable.json`**, `since: "J183"`, with the measurement and the
   mechanism above as its `why` and the paths as its `evidence`. It is the measurement point 2 names: D482's stall in its unit form — units that gave no answer
   for 1,800 s, the form Scute Swarm's 14 unit kills took, seven of the nine at the decisions whose branches overflowed
   and one of them ending inside the recursion — and the same recursion's other end, 70 branch games whose engine step
   overflowed with the card on the battlefield. The recursion is inside one engine step: the branch deadline (D467/D484)
   is read between steps and on events, and no branch row records it firing.
2. **The list's rule names this kind of measurement** (amends D482 point 2 and D492 point 1). The `about` of
   `tools/cubelab/engine-unplayable.json` admitted a measured stall (branches timed out inside one engine step) or a
   measured fork crash; J183's fault is neither literally — no branch row timed out, 70 overflowed inside the step and
   nine units hung. It now reads: *… or a measured overflow or hang of the engine inside one step with the card's effect
   on the board (D506: Old Man of the Sea's recursion) …*. The rule stays written once, in that `about`;
   `deckcensus.ts`'s parse error and its doc comment, and `docs/guides/cube-lab.md`'s list paragraph, name the three
   kinds and point at it.
3. **The code path is the mechanic, so D492's class rule lists Rubinia Soulsinger on Old Man's measurement.** The
   recursion does not need `StaticCommandCheck`: it needs `LoseControl` in a `GainControl`'s `LoseControl$` (the
   change-controller command left on the source) and a target that may be the source itself. Of the 33,617 files in
   `cardsfolder.zip`, 26 carry that `LoseControl`; four are in the pool's 1,592 cards (`cubes/library/library-pool.tsv`):
   Aladdin, Old Man of the Sea, Rubinia Soulsinger and Willow Satyr. **Rubinia Soulsinger** (`A:AB$ GainControl | Cost$
   T | ValidTgts$ Creature | LoseControl$ Untap,LeavesPlay,LoseControl`, and it too may choose not to untap) can target
   itself as printed, so a self-target followed by a change of its controller runs the same recursion: it goes on the
   list, `since: "J183"`, its `why` naming the measurement as Old Man's. It played four earlier atlas spines (J176 s12,
   J181 s03, J182 s07 and s08: 2,725 to 4,800 branches each, 0 errors, 119 to 266 of its correction lines and no run), as
   Old Man of the Sea played J176 s08 and J180 s08 cleanly before J183: the fault needs the self-target and the later
   change of controller in one game, which a clean spine does not rule out. (Of the two scripts in all of Forge that
   carry `StaticCommandCheck` with `GainControl`, Old Man of the Sea and Rootwater Matriarch, only Old Man is in the pool;
   Rootwater Matriarch's `LoseControl$` is `StaticCommandCheck` alone, with no change-controller command.)
4. **Watched, not listed.** **Willow Satyr** (`ValidTgts$ Creature.Legendary`; it is not legendary) and **Aladdin**
   (`ValidTgts$ Artifact`; it is a creature) carry the same `LoseControl` but cannot target themselves as printed, only
   after a change of type in a game; neither is listed without a measurement of its own. **Preacher** is
   not listed: its `LoseControl$` is `Untap,LeavesPlay`, with no change-controller command, and it targets a creature its
   opponent controls; it was measured only beside Old Man (it sat beside it in 34 of the 69 branches, and may be one of the cards that
   moved it), and one errored branch's last frame shows it without Old Man. Oko, Thief of Crowns, which moved Old Man in the two traced branches,
   is a trigger of the fault, not its owner. None of these is a judgement of the card, and none is a bias toward or
   against anyone's decks or cubes.

**Rejected: a repair of ours.** The recursion is inside `ControlGainEffect` and `GameAction`, run from the engine's own
resolution (`MagicStack.resolveStack`) and its static check, in the live branch game and not in our copier; nothing of ours
runs between the command and its re-entry. Keeping the random seat from targeting Old Man with itself would be a rule of
play written for one card, and would leave the human seat and Forge's AI on another path. As in D492 and D494, the list is
the lighter, measured fix; an official Forge release that guards the self-target or clears the list before running it
takes the card off only with a measured clean spine.

**The draw, measured** (as D490, D492 and D494). J183's 13 spine pairs and 13 validation pairs redrawn from their seeds
(`tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10`) on this list (all nine cards): **51 of the 52 decks
byte-identical** to the decks J183 played (no J183 deck held Rubinia Soulsinger, and no pick landed on it: 0 skips in
every folder); the one that held Old Man of the Sea, `s11-legacy-2424` deck 1 (its eleventh
spell pick), is redrawn from that pick on: 34 lines of the `.dck` differ (17 out, 17 in), 15 of its 40 cards by copies.
The draw's summary line names both: `Old Man of the Sea (1 skip(s)), Rubinia Soulsinger (0 skip(s))`, and the deck's `decks.jsonl` row carries
`engineSkips: {"Emeritus of Ideation": 2, "Old Man of the Sea": 1}`.

**What it changes.** The band census's draw alone (D482 point 3): the next job's decks. J183's decks are drawn and stay;
`decks --cube`, the drafts, the evolve loop and the board never read the list, and a deck that already holds the card
plays as it always did. The list's `about` gains its third admitted measurement (point 2). **What it does not change:** the night's other spines, the atlas, the branch deadline, the
seats' policies, and the 17 frame logs J183's s11 failed `tools/check-redaction.mjs` on, which are another question.

**Tests.** `web/test/cubelab-deck-census.test.ts`: the committed list is exactly the nine, in the file's order, every one a
library card, `since` as recorded; `decks` reports each with its skips. `docs/guides/cube-lab.md` and `deckcensus.ts`'s
header name the two new cards; `docs/evidence/cube-lab.md` §9 is the measurement in a table; PLAN.md's cube lab
follow-ups 23 (Rubinia Soulsinger listed on this measurement, Willow Satyr and Aladdin watched) and 24 (the untraced hangs and the NullPointerException) are what is left.

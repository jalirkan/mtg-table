## D493 — The fork's copy carries a card's plotted flag and, in a public zone, the turn it entered that zone: what Forge's copier drops that a cast from exile reads (amends D479)

*Branch `pc/d493-plot`, on origin/main `9c4737e9` (#220, D492's merge). D493 was reserved for this lane, and `node
tools/decisions.mjs next` gave it. Amends **D479** (the carry pass in `LenientGameCopier`). Touches every fork that
copier makes: the atlas's branches (**D451**), the search's rollouts (**D312**) and the coach helper's grade copies.
Lists nothing on `tools/cubelab/engine-unplayable.json`. The gap is in our copier, not in the engine, unlike D492.*

**2026-10-31**

**Context.** J176 (atlas night three), spine s10 (`b-s10-peasant-2136`, seed 2136). Decision **d7** (turn 15, a priority
decision, Forge's answer `cast:12`, Slickshot Lockpicker) had **150 of 150** branch games of option 0 erroring, all in
the random continuation. The error was
`IllegalStateException: no Slickshot Lockpicker - Creature 2 / 3 (without paying its mana cost) [Plotted] on the copy's
Slickshot Lockpicker (12)`, and every stack in `phaseB/logs/worker-*.log` was the same:
`SearchPolicy.mapSa(SearchPolicy.java:919)` ← `SearchPolicy$PriorityCand.install(631)` ← `Atlas.play(778)` ←
`Atlas.play(734)` ← `Atlas$Hook.play(510)` ← … ← `CubeLab.playGame`. The atlas report has the row as its one problem.
The same spine had the card's Plot activation (`activate:12`) as an option at earlier decisions. So the real game's
Lockpicker was plotted on an earlier turn, and at d7 Forge cast it from exile for free. That is the "(Plotted)"
alternative cost. On the fork's copy, `mapSa` found no such play on the card and threw. The throw is the alarm D472
put there, and it is kept.

**The exact cause: two things the copier drops, verified.** `GameActionUtil.getAlternativeCosts` builds the plotted
cast only when `activator.canCastSorcery() && source.isPlotted() && source.isInZone(Exile) && activator == owner &&
!source.enteredThisTurn()`. The jar's bytecode reads `isPlotted()` once and `enteredThisTurn()` four times in that
method. The four are the foretold casts (two), the plotted cast and Mayhem. On a copy, both flags are wrong:

1. **The plotted flag is not copied.** The jar's `forge.ai.simulation.GameCopier` was disassembled with `javap -c -p`
   and every `Card` method it calls was listed. The setters are `setCameUnderControlSinceLastUpkeep`, `setChosenColors`,
   `setChosenPlayer`, `setChosenType`, `setCloaked`, `setCloneOrigin`, `setCommander`, `setController`,
   `setCopiedPermanent`, `setCounters`, `setCrewedByThisTurn`, `setDamage`, `setDamageReceivedThisTurn`,
   `setEffectSource`, `setEntityAttachedTo`, `setFlipped`, **`setForetold`, `setForetoldCostByEffect`**,
   `setGamePieceType`, `setGameTimestamp`, `setHaunting`, `setLayerTimestamp`, `setManifested`, `setMonstrous`,
   `setName`, `setNamedCards`, `setOwner`, `setPairedWith`, `setProtectingPlayer`, `setPTBoost`,
   `setPTCharacterDefiningTable`, `setPTTable`, `setRenowned`, `setSaddled`, `setSaddledByThisTurn`, `setSickness`,
   `setSolved`, `setSprocket`, `setState`, `setSuspected`, `setSVars`, `setTapped` and `setType`, plus
   `turnFaceDown(NoUpdate)`. **There is no `setPlotted`.** This is the cause the brief named, and it is confirmed.
2. **The turn a card entered its zone is the copy's own turn.** This half the brief did not name; the self-test found
   it. `GameCopier.makeCopy` calls `PhaseHandler.devModeSet(phase, player, turn)` before `copyGameState`. Then
   `addCard` puts each card in with `Zone.add`, and that call does `c.setTurnInZone(game.getPhaseHandler().getTurn())`
   for any card arriving from another zone, which a fresh copy always is. `GameCopier` never calls `setTurnInZone`.
   So **on Forge's copy every card "entered this turn"**. Measured: Forge's own copy of a card plotted at turn 3 at
   turn 5 reads plotted `false`, turn in exile `5`, `enteredThisTurn()` `true`. **Carrying the plotted flag alone does
   not fix the fault.** With the flag carried and the turn left, the self-test still throws J176's exact error (point
   *Measured*, ablation B).

So on the copy the Lockpicker was neither plotted nor "on a later turn". `copyCandidates` (D472) got no "(Plotted)"
play from `getAlternativeCosts`, and `mapSa` threw. The foretold casts share the second half: `GameCopier` does copy
`isForetold()`, but a card foretold on an earlier turn also "entered this turn" on a copy. So a forced Foretold cast
would throw the same way. No spine has measured that yet. The pool's one foretell card, Delayed Blast Fireball, is in
the self-test.

**Decision.** D479's carry pass (`LenientGameCopier.carry`, run after Forge's copy on every copied card and its
original) also carries what a cast from exile reads (`carryCastability`):

1. **The plotted flag**, where the copy's differs from the original's. `Card.setPlotted(true)` runs the copy's
   `BecomesPlotted` triggers (`runTrigger(BecomesPlotted, …, false)`, in the jar's bytecode). The plot happened in the
   original game, so the copy's trigger handler holds that one mode while the flag is set (`suppressMode` /
   `clearSuppression`, only if it was not held already). Without the hold, Longhorn Sharpshooter's "deals 2 damage
   when it becomes plotted" waits to go on the copy's stack (ablation C).
2. **The turn the card entered its zone** (`setTurnInZone(o.getTurnInZone())`), for a card in a **public zone** only:
   battlefield, graveyard, exile, stack or command.
   - A card in a hand or a library keeps the copy's turn, the same for all of them. Those are the zones the
     Determinizer redeals (`setCards`, which keeps each card object's own fields). A real turn there would mark which
     redealt card came from the real hand.
   - No alternative cost is read in a hand or a library: Plotted and Foretold read exile, Mayhem the graveyard.
   - A mirror (D479 point 5) takes its old object's turn, as it takes its timestamps.
3. **Counters**: `plottedCarried()` and `zoneTurnsCarried()`, for the self-test. They are not atlas row fields. Such
   a fork is not a problem: it is the real game's position.
4. **Then the statics are applied again**, as after a carried trait or link (D479 point 6). Forge's copy applied
   them with the copy's turn, and 278 scripts in the 2.0.14 cardsfolder read `ThisTurnEntered`. One of them is in the
   jar's own code: Warp's "you may cast it from exile on a later turn" is a may-play static with
   `Affected$ Card.IsRemembered+nonLand+!ThisTurnEntered` (`ChangeZoneEffect`, its constant in the jar). On Forge's
   copy that static applied to nothing, so a warped card had no cast from exile. Since nearly every fork moves some
   card's turn, this re-run now happens on nearly every copy. That is one `checkStaticAbilities()` more per copy,
   where the playout that follows runs one at every state check.

**What else the copier drops, checked flag by flag.** Each candidate was checked against what reads it in the
alternative-cost and optional-cost paths. The reads were taken from the jar's bytecode of
`getAlternativeCosts`, `getOptionalCostValues`, `addOptionalCosts`, `getAdditionalCostSpell`,
`getGraveyardSpellByKeyword` and `getMayPlaySpellOptions`, with the 2.0.15 source read as prose. Each was then checked
against the pool: every script of `cubes/library/library-pool.tsv` in the jar's `res/cardsfolder/cardsfolder.zip`,
1,568 of 1,592 rows found (the 24 others are the pool's own `forge_supported = no`).

| flag (reader) | the copier | pool cards | here |
|---|---|---|---|
| `isPlotted` (Plotted) | dropped | 4 with `K:Plot`: Pillage the Bog, Slickshot Lockpicker, Slickshot Show-Off, Spinewoods Paladin; 0 that plot another card | **carried** |
| `turnInZone` → `enteredThisTurn` (Plotted, Foretold, Mayhem) | reset to the copy's turn | the 4 above, Delayed Blast Fireball (`K:Foretell`); also read by the `ThisTurnEntered` property of 8 (Barrin, Tolarian Archmage; Cult Conscript; Khabál Ghoul; Moon-Circuit Hacker; Night Nurse, Healer of Heroes; Ocelot Pride; Phelia, Exuberant Shepherd; The Wandering Emperor) | **carried**, public zones only |
| `isForetold`, `isForetoldCostByEffect` (Foretold) | copied | 1 (Delayed Blast Fireball); 0 foretold by an effect | already right |
| `wasDiscarded` (Mayhem) | dropped (no `setDiscarded`) | 0 with `K:Mayhem` | **not carried**: no pool card reads it on this path |
| `getTurnInController` (`EnteredUnder`, `CostRevealChosen`) | the copy's zone's player | 0 with `EnteredUnder` | **not carried**: not on a cast path, and no pool card |
| `exiledSA` → `isWarped` (the `warped` property) | dropped (D479) | 4 with `K:Warp` | **not carried**: Warp's later cast is a may-play static, not a `getAlternativeCosts` branch, and it reads the carried turn (point 4); D479 lists `exiledSA` |
| Escape, Flashback, Harmonize | read the zone only (`isInZone(Graveyard)`) | 5 Escape, 18 Flashback, 0 Harmonize | nothing to carry |
| the optional-cost paths (D466) | read keywords, statics and the zone | — | nothing to carry |

No pool card has a `BecomesPlotted` trigger. Aloe Alchemist and Longhorn Sharpshooter carry one in 2.0.14; the hold in
point 1 is for them and for any card that gets one later.

**Rejected.**
- **List the four Plot cards on `engine-unplayable.json`** (D492's way). The gap is in our copier, not in the engine:
  Forge's AI plays the plotted cast in the real game, as J176's baseline did at d7. And carrying the flag and the turn
  fixes every Plot card, and the foretold casts with them. A list would deal four playable cards out of every draw to
  hide a copier defect.
- **Carry the plotted flag only (the brief's fix as written).** Measured: the cast is still absent, and the same error
  is thrown (ablation B).
- **Carry the turn in every zone.** It is the real value, but the Determinizer redeals hands and libraries by moving
  card objects. A real turn left on them would tell a rollout which card came from the hand. That is hidden
  information (hard rule 8's spirit for the search). No alternative cost is read there.
- **Catch the throw in `mapSa`, or let a missing alternative fall back to another play.** The throw found this; a
  fallback would play a different card than the option names.
- **Patch the jar or copy `GameCopier`'s source.** Not needed: the pass runs after the copy and uses public setters
  in the pinned jar (`Card.setPlotted(boolean)`, `setTurnInZone(int)`, `getTurnInZone()`,
  `TriggerHandler.suppressMode/clearSuppression/isTriggerSuppressed`, `TriggerType.BecomesPlotted`; javap).

**What it rests on.** No thread and no hop (hard rule 3): the pass runs inside `makeCopy`, on the copying thread.
There is no reflection (lint rule 8). The real game is only read.

**Measured.**
- **The self-test** is `tools/ai-bench.sh --selftest`. That is where D472's and D479's copier scenarios live; it is not
  one of `bridge/build.sh`'s self-tests. Its new scenario is `copy-plotted` (`plottedScenarios`), with 12 checks.
  - **The setup.** The real game plots Slickshot Lockpicker and foretells Delayed Blast Fireball, both from the hand,
    by their own special actions at turn 5. Their turn in exile is then set back to 3: that is the one planted thing,
    because the cast comes on a later turn. Longhorn Sharpshooter is plotted directly in exile, before the triggers go
    live. Forge offers both casts in the real game.
  - **The control.** Forge's own `GameCopier` gives the Lockpicker plotted `false` and both cards turn 5 in exile.
    `copyCandidates` lists neither cast.
  - **This copy**: the Lockpicker and the Sharpshooter are plotted, both cards are in exile since turn 3, and nothing
    is on or waiting for the copy's stack. A library card at turn 1 and a hand card at turn 2 keep the copy's turn 5.
    `copyCandidates` lists both casts, with the real plays' match keys, and `mapSa` maps both. **An atlas branch
    forcing the Plotted cast plays** (24 steps, no error); that is the production path that failed 150 of 150. The
    real game is untouched.
  - **Ablation A** (D493's carry taken out, which is the parent's copier): 2 checks fail. The scenario then throws
    **`no Slickshot Lockpicker - Creature 2 / 3 (without paying its mana cost) [Plotted] on the copy's Slickshot
    Lockpicker (7)`**, J176's error word for word but the id.
  - **Ablation B** (the plotted flag carried, the turn not): the same 2 fail, and the same throw. Both halves are
    needed.
  - **Ablation C** (the trigger hold taken out): 1 fails, with the Sharpshooter's trigger waiting to go on the copy's
    stack.
  - The whole self-test: **272 checks, 0 failures**, 25 s. D479's `copy-plain-timestamps` still finds its 12 branch
    pairs identical.
- **The recorded position, not replayed.** The atlas has no command that re-branches one decision of a spine.
  `tools/cubelab.sh --help` and `tools/cubelab/atlas.ts` offer a whole atlas run (`--phase a|b|both|report`) and
  nothing per decision. Re-running s10 would also need its decks, under the lab and outside this lane. The self-test
  stands in for it: it reproduces the error on the parent's copier and the forced plotted cast's branch on this one.
  The next spine with a plotted card at a decision is the field measurement (PLAN.md, *Search AI follow-ups*).
- `tools/cubelab.sh atlas-selftest --jobs 1`: **OK** (16 forks, 8 no-leak checks, 38 frame logs, 558 rows; the cut
  variants clean), in 14 min 50 s at a load average near 30 (two other lanes were gating).
- `bridge/build.sh`: OK. `npm --prefix web test`: OK (the node suites 1,855 passed, 0 failed; then vitest 161 of
  161). `node tools/decisions.mjs check`: OK.
- One ai-bench run under that load failed a timing bound unrelated to the copier: *an evaluator leaf costs … (in the
  search 1080.0 us)*, against 1,000 µs. The next run passed 272 of 272.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=3` (`WSPORT=9800`) from a deleted `bridge/out`, on `87f63a56`
  (this branch's code; only these lines differ): **OK, 60 of 60 jobs**, 1,026.8 s wall (job seconds 2,888.4; load
  average up to 41.75, two other lanes gating beside it).

**Comparability.** The carried turn changes `enteredThisTurn()` on almost every copied card in a public zone. Before
this decision every such card read as entered this turn. That reaches every fork:
- the casts above;
- the 8 pool cards' `ThisTurnEntered` reads;
- any AI heuristic that asks `enteredThisTurn()`.

These are the real game's readings, not new errors. As with D479's timestamps, **search-v2 results and atlas maps
from before and after D493 are not pooled**. Split them by git sha (`docs/guides/ai-ladder.md`'s *A code change is
not a config change*).

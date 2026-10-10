## D421 — `yieldTo {kind: "endStepOrOpponent"}`: pass until an opponent acts or the end step (M64)

*Branch `claude/protocol-yield-chosen-players`.* Amendment **M64**. A fourth
kind for the existing `yieldTo` act and for `state.yield.kind`; no new act, no
new frame. Asked for by the PC session's Endstep study (2026-10-10) for
ForgeCoach's rebuilt play board, approved by the owner the same day. Siblings:
**D422** (M65), **D423** (M66).

**2026-10-10**

**Context.** The board rebuild studied another client's pass control, "pass
until an opponent acts or the end step": the player who has nothing to do on
the opponent's turn hands it over, and is woken the moment the opponent does
something worth answering, or at the opponent's end step, where instant-speed
play usually happens. mtg-table's three yields (M37/M34) do not say that:
`endOfTurn` passes through the end step; `marker` stops at a step but not at an
opponent's action; `stack` is for one stack. Forge does end every yield on an
opponent's spell and on an attack on the seat — but through two *preferences*
(`YIELD_INTERRUPT_ON_OPPONENT_SPELL`, `_ON_ATTACKERS`, `FControlGameEventHandler`
calling `YieldController.onSpellAbilityCast` / `onAttackersDeclared`), which a
user's `forge.preferences` can turn off, so "until an opponent acts" was a
default, not a meaning. The study's HOLD PRIORITY stays out (§10.4: Forge has
none).

**Decision.**

- **The kind**: `yieldTo {kind: "endStepOrOpponent"}`. The passing is Forge's
  own marker yield at the turn player's `END_OF_TURN`
  (`YieldUpdate.SetMarker`, the mechanism of `kind:"marker"`), so Forge's prompt
  ("Yielding until *X*'s End step"), its Cancel and its other yield rules hold
  unchanged.
- **"An opponent acts", exactly**: (a) an item an opponent controls goes on the
  stack — every `MagicStack.add` fires `GameEventSpellAbilityCast`, for a spell,
  an activated ability and a trigger alike, and the item's activating player is
  its controller; (b) an opponent declares attackers attacking the seat or a
  permanent it controls (`GameEventAttackersDeclared`, then the game's `Combat`:
  a defender that is the seat, or a card it controls, with an attacker). An
  `EndStepWatcher` subscribed to the game's event bus ends the yield at the
  event, on the game thread, before the seat is offered priority again — with
  `YieldController.clearActiveYieldAndDispatch()`, the very call Forge's own
  interrupts make from the same thread. **No hop** (hard rule 3): the
  subscriber runs where Guava dispatches it, as `OutcomeWatcher` does, and reads
  only a stack item's activating `PlayerView` (a game-thread read) and the
  game's `Combat` (model objects).
- **The end step**: `GameEventTurnPhase(END_OF_TURN)` of the yield's turn ends
  it, and the seat is stopped there for that one step even when its phase stops
  skip it (`isUiSetToSkipPhase` answers false once; the next step clears that).
  Without this a seat whose stops skip the opponent's end step would pass it —
  Forge's marker clears itself at the step and then the stop rule passes on.
- **What clears it**: Cancel, any other `yieldTo`, a later turn beginning (an
  effect ended the turn before its end step — Forge's marker would otherwise
  wait a whole round), the end of the game. The yield is "running" exactly while
  Forge's marker at that end step is, so Cancel and Forge's own interrupts need
  no bookkeeping of ours: the watcher sees the marker gone and forgets.
- **Refused in the end step and the cleanup step** (`notice {title:"yieldTo"}`,
  nothing changed): "the current turn's end step" has begun; the next one is a
  whole turn away and passing through the seat's own turn is not what a player
  pressing this means.
- **`state.yield`** reports the kind while it runs, `{kind:
  "endStepOrOpponent", playerId: <turn player>, phase: "END_OF_TURN"}`, read
  as the marker kind is, plus the watcher's record of which end step it is.
- **Clients**: `YIELD_KINDS` in `web/src/protocol.ts` gains the kind; the
  board's yield line says "until an opponent acts or the end step".

**Rejected.**

- *Rely on Forge's interrupt preferences.* The meaning would change with a
  user's settings file; the probe ran both ways and the bridge's rule gives the
  same stops either way.
- *Stack items only, not attacks.* The study's words were "puts something on
  the stack"; Forge's default ends every yield on an attack too, so leaving
  attacks out would need a preference override that changes the other three
  kinds. And a declared attack is the opponent acting: the seat gets priority in
  the declare-attackers step, before its own blocks, where an instant matters.
- *A bridge-side priority loop* (pass on every priority until the condition).
  It would duplicate Forge's yield machinery — the prompt, Cancel, the attack
  skip — and race it.
- *At the end step, target the next turn's end step.* It would pass through the
  seat's whole turn — its draw, its land drop, its main phases.

**Evidence.** `tools/ws-select-probe.mjs` on the real engine
(`docs/evidence/select-probe.md`): seed 11, three games, 29 yields sent at the
opponent's upkeep — 22 ended by the opponent's stack item, 4 by an attack, 3 at
the end step; 35 `state` frames carried the kind mid-yield; 3 sends in the end
step refused. The same seed with Forge's two interrupt preferences off: the
bridge's own watcher ended 12 on a stack item, 6 on an attack, 2 at the end
step, and no stop was anything else. Real frames in
`fixtures/select-probe/m64-m66-frames.json` (`yieldEndStep`, `yieldOpponent`),
read by `web/test/selection.test.ts`.

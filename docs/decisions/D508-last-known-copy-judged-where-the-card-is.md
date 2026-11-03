## D508 — A last-known copy of a card is judged where the game holds the card now (amends D347's `Decisions.visible`; protocol M80)

*Branch `pc/d508-last-known-copy`, off main `0a6cf5c1` (D505–D507's merges). `node tools/decisions.mjs next` printed
D508. Amends **D347**'s visibility gate, `Decisions.visible`, for every zone: the object handed in is resolved to the
card the game holds under its id before its zone is read. D507's Stack rule is unchanged. The checker is unchanged.*

**2026-11-03**

**Context.** Lab night J185 (2026-11-03, mtg-table at `0a6cf5c1`, D507's population's first night) failed
`atlas.problems == 0` on exactly one frame log of 11,402 in unit `b-s13-pauper-2539` (pauper band, spine seed 2539):

    d1-random-o0-b78-seat1.jsonl.gz:409: decision 73 names card 37 (option:37), which its state frame does not show
    seat 1 -- a stub's id, a library card or another seat's hidden card is never an option (M55, D347)

Evidence, read only: `/home/justin-a/code/lab/data/lab-j185/b-s13-pauper-2539/` (`atlas.json`'s `checks`;
`phaseB/frames/`, `phaseB/logs/`). Every other check of the night passed: no engine error, no branch timeout, no
`[ghost]` line, no `StackOverflowError`, no hung unit, the five known `PumpEffect` `IndexOutOfBoundsException`s.

- **The record** (line 409, `seq` 78): seat 1, `kind: choice`, `source: entity`, `by: forge`, turn 24 MAIN1, state
  `seq` 330; options `["option:37", "option:hidden"]`, `hidden` 1, chosen `option:37`. An entity choice is
  `PlayerControllerAi.chooseSingleEntityForEffect`, recorded by `Decisions.entities`.
- **Card 37 is Cavern Harpy, seat 0's.** Its state is in seat 0's hand, the five-key stub, in every frame of turns
  17–23 and in the frame the record points at. Seat 1 had seen it by name on the battlefield at turns 16, 20 and 24
  (and again at 28, 30 and 38): seat 0 cast it six times, and each time its enters trigger ("return a blue or black
  creature you control to its owner's hand"; the AI's `NeverBounceItself` logic has no other blue or black creature)
  returned it to hand at once. Each return carries an M78 `reveal` line to seat 1 (`seq` 54, 76, 97, 120, 175): the
  trigger's `ChangeZone` is `Hidden$ True`, and `changeHiddenOriginResolve` reveals the moved cards to everyone
  (forge-src `ChangeZoneEffect.java:1519`). A reveal is a moment; the state keeps the stub, as M78 says.
- **The ask.** Seat 1 holds Circle of Protection: Blue (74): `{1}: The next time a blue source of your choice would
  deal damage to you this turn, prevent that damage` — `AB$ ChooseSource | Choices$ Card.BlueSource`. At turn 24
  MAIN1 seat 1 activated it three times (`seq` 322, 325, 330). The third was activated while the stack held
  Luminous Phantom's trigger (item 51910, source card 1, text `""`: "Whenever another creature you control leaves the
  battlefield without dying, you gain 1 life"), which had fired on the Harpy's return to hand one frame earlier
  (`seq` 329: `zone` 37 battlefield → hand, `cast` 51910). The first two asks, with no trigger on the stack, listed
  nothing of the Harpy: their records are clean.

**The cause.** The 2.0.15 source checkout read as prose; the jar confirmed with `javap` (`-c -p` on
`forge.game.GameAction.changeZone`, `forge.game.zone.Zone.getLKICopy` and `setCards`, and the signatures of
`forge.game.Game.copyLastState`, `getLastStateBattlefield` and `getCardState`, all present on 2.0.14).

1. **`ChooseSourceEffect.resolve`** lists four groups under divider cards (`new Card(-1..-4, game)`, in no zone —
   D484): the permanents, the stack items' source cards, **"--OBJECTS REFERRED TO ON THE STACK:--"** — every `Card`
   among each stack instance's `getTriggeringObjects().values()`, its target card and its replacing objects — and
   the face-up command-zone cards; `Choices$` filters each group (`CardLists.getValidCards`).
2. **`TriggerChangesZone.setTriggeringObjects`**: when the trigger's `Origin$` is `Battlefield`, the triggering
   `Card` is the run parameters' **`CardLKI`** — the last-known copy — and the moved card is `NewCard`.
3. **`GameAction.changeZone`**, for a card leaving the battlefield: `lastKnownInfo` is the entry of
   `game.getLastStateBattlefield()` with the card's id when there is one (`indexOf`, by id), else
   `CardCopyService.getLKICopy(c)`. That snapshot is `Game.copyLastState` → `Zone.getLKICopy`: a bare
   `new Zone(Battlefield, game)` whose `setCards(getLKICopyList(...))` calls **`c.setZone(this)` on every copy**.
   So the copy's own `getZone()` is a Battlefield zone (with no player: a `Zone`, not a `PlayerZone`), and so is its
   `getLastKnownZone()`, for as long as the copy lives — here, while the Phantom's trigger sat on the stack.
4. **`Decisions.visible`** switched on `c.getZone()`: Battlefield → public → `option:37`. The record's one hidden
   entry is the divider. `NewCard`, the in-hand instance, was added to the same `CardCollection` after the copy and
   refused as a duplicate (`FCollection.add` keeps one per id), so the list named the card once, by the copy.

The seat was asked a legal question (CR 609.7b: a source referred to by an object on the stack may be chosen, by
last known information) and recorded a legal answer. What it must not do is name, by id, a card its state frame
shows as a stub: on the board the same ask would reach the human as `Snap.card` over the copy's view, and the
protocol's rule for a card in another seat's hand is the stub, whatever the engine calls the object.

**Decision.** `Decisions.visible(c, ai)` judges **the card the game holds now**, never the object handed in:

- **`Decisions.current(c)`** is `Game.getCardState(c, null)` — a walk of every zone (the Stack zone included, so
  D507's ghost resolves to itself) for the id — or `c` itself when no zone holds the id: a token that ceased to
  exist (D503's shape, listed as before), or a spell copy the Stack zone does not list (D507's copies, as before).
- The switch is unchanged, over `current(c)`'s zone: Stack by D507's rule, Battlefield / Graveyard / Command public,
  Hand its owner's, Exile face up or the seat's own, every other zone hidden.
- **`Decisions.lastKnown(e)`** is "a `Card` whose current instance is another object", and the entity and the target
  record paths print one worker-log line per such hidden candidate, beside D507's `[ghost]` line:

      [lki] card <id> offered as a last-known copy of a card in a zone the seat cannot see, left out of a record (D508)

  An id, never a name. The night counts the lines as **`lki_candidates`**. A last-known copy of a card now in a
  public zone, or in the seat's own hand, is listed under the card's current zone and prints nothing.
- Both callers are unchanged: `entityToken` (a `Card`, or a `SpellAbility`'s host) and
  `SearchPolicy.targetVisible`.

**Held by `mtgtable.SelectionSelfTest`** (step 12l; 55 checks, 10 of them this case, one engine boot shared with
D507's). The negative control first: `Game.copyLastState()`'s copy of seat 0's Cavern Harpy keeps the Harpy's id
and a Battlefield zone after `moveToHand` puts the card in seat 0's hand, and `getCardState` finds the hand card
— the fault is live on this engine. Then seat 1's entity record over the divider, Grizzly Bears, the copy and the
hand card lists `option:<bears>` and `option:hidden`, `hidden` 3, one `[lki]` line; a copy of Elvish Visionary now
in the graveyard and a copy of seat 1's own Savannah Lions now in seat 1's hand are both listed, `hidden` 0; and
from seat 0 the Harpy's copy is listed and the Lions' hidden.

**What it changes: the record, and what the seat offers — so J186 opens a new population.**
- **The record.** An entity or target candidate that is a last-known copy of a card in a hidden zone counts in
  `hidden`. J185's s13 had one such record in 11,402 logs; every other night's logs passed the M55 audit, so none
  of their records named one.
- **The play paths.** Forge's target candidates (`getAllCandidates`, `getValidCardsToTarget`) are drawn from the
  zones' own cards, never from last-known copies, so the explorer's target redraw, `staleTargets`' fill and the
  search's target alternatives see the same lists as before. The explorer's entity close call (`Explorer.entity`)
  does not consult the gate: its rival must be a creature `isInZone(Battlefield)`, which a last-known copy answers
  from its saved zone. So no J185 draw or pick would have come out differently, and the only place a future night
  could differ is a close-call swap onto a last-known copy, whose record now answers `option:hidden` (follow-up 30).
- **Comparability.** The gate in front of what the seat records and offers changed; **D489** opens a population on
  "a future change to the seat or to what it offers", and D497 and D507 rejected "the boards met none of it". So
  **J186 opens `random-<band>-d508`**, with `randomSeat: "D508"` on its rows; **J185 is D507's population's one
  night**, read on its own and pooled with nothing. The label contract stays v6.

**The board (the human game).** Unchanged in this lane: follow-up 29. The same ask reaches a human seat through
`WireGuiGame`'s `chooseSingleEntityForEffect` → an `ask` whose options go through `Snap.card(o, cv, viewer)` with
`cv.getZone()` as the zone hint, and the copy's `CardView` says Battlefield (`Card.setZone` → `view.updateZone`),
so the option would carry the Harpy's name while the state shows the stub. `Snap` works on views and cannot call
`getCardState`; the fix belongs in `WireGuiGame`, which holds the game, before the view reaches `Snap`.

**Alternatives rejected.**
- *A checker allowance for an object referred to on the stack.* The board shows the human a stub for the same card;
  the seat would then record what a human at the same seat cannot see, and M55's audit is the one proof that the
  record is the seat's own information.
- *Hiding every last-known copy.* A copy of a card now in the graveyard, or in the seat's own hand, is the seat's
  information; D503's ceased tokens are named by last known information on purpose. The zone decides, not the copy.
- *Reading `getLastKnownZone()`.* It is the snapshot's zone again (`setLastKnownZone` on the copy), the very thing
  that misled the gate.
- *Repairing the list in `chooseSingleEntityForEffect`* (mapping each option to its current card before Forge sees
  the answer). Forge expects the object it listed back; answering with the hand card would be a different object
  to `ChooseSourceEffect`, and the gate is the one place the rule is written.

**Cost.** `getCardState` walks the game's cards once per candidate (about 150 cards a game; J185 offered 1.16 M card
targets over 61,355 branch games). Not measured on a night yet; J186's walls beside J185's are the read.

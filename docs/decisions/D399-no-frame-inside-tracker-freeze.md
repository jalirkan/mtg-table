## D399 — No state frame inside a view-tracker freeze: a revealed library top no longer flickers out

*Branch `c/library-top-reveal`.* Amends D352 (`MidMove`), the other side of the same window.
The checker's M55 rule is unchanged.

**2026-10-06**

**Context.** Night 3's game 354 g1, seat 1, which controls Oracle of Mul Daya ("play with the
top card of your library revealed"). Its library top, card 99 (a Forest), is in
`players[1].zones.library.cards` in most state frames, but frames 428, 436, 438, 441 and 447
list `library.cards: []` (pc-results `results/J095/frames.md`). Each of them comes right after a
spell or ability was cast or resolved, and the next frame lists the card again. Decision 58
pointed at frame 436 and offered `land:99`, so the redaction checker's M55 rule ("a decision
names a card its state frame does not show its seat") failed the recording: a false positive.

**Root cause, measured.** A probe in `RecordMatch.SpectatorGui.snapshot` printed the Java stack
of every frame built while a seat with an Oracle had its own top card hidden (a deck of Forests,
Oracles, Llanowar Elves and Giant Growth, 4 recorded `ai-bench` games, both seats recorded).
Every such frame was built **inside `GameAction.checkStaticAbilities`**:

1. `checkStaticAbilities` freezes the view tracker and calls `StaticEffects.clearStaticEffects`.
   That reaches `Card.removeMayLookAt` and `CardView.setPlayerMayLook`. `PlayerMayLook` is a
   property that ignores the freeze (`FreezeMode.IgnoresFreeze`, javap on the pinned 2.0.14
   jar), so the top card is hidden in the view at once.
2. It then re-applies the statics layer by layer. The Oracle's **first** static,
   `AdjustLandPlays$ 1`, calls `Player.addMaxLandPlays`, which fires
   `GameEventPlayerStatsChanged`. It does so before the Oracle's second static (`MayLookAt$
   Player` on `Card.TopLibrary+YouCtrl`) puts the reveal back.
3. `GameEventForwarder.receiveGameEvent` flushes at 50 pending events or after 500 ms
   (javap), so a flush can land on that event. The frame is then built in the middle of
   the re-check.

Forge runs `checkStaticAbilities` on every zone change and every state-based check, and the AI's
own look-ahead runs it too (`AiController.chooseBestLandToPlay` →
`ReplacementHandler.getReplacementList`). Each run fires one or two such events per Oracle, so
the 50-event batch fills on one of them often. The probe deck had 40–221 such frames per log.
The same window exists for any static whose layer fires an event before a `MayLookAt` static is
re-applied. The tracker freeze is what marks all of them.

**Decision.**

1. **`MidMove.hold` also holds a flush while the game's view tracker is frozen**
   (`MidMove.midUpdate`: `game.getTracker().isFrozen()`). Forge freezes the tracker in
   `checkStaticAbilities`, `checkStateEffects` and a few effect bodies. While it is frozen, the
   properties that respect the freeze are still the old ones and the others are new. A frame
   built then is no position. The held events go out with the next flush outside a freeze (a
   phase boundary, a decision record's flush), as D352's held flushes do. Both snapshot hooks
   already ask `MidMove` (`RecordMatch.SpectatorGui`, which `SeatRecorder` uses, and
   `WireGuiGame`), so recordings and the live seat are fixed together.
2. **Its own valve.** D352's valve gives up after 8 held flushes in a row. Most of a busy
   turn's events are fired from inside freezes, so a frozen run can be longer: the probe deck's
   longest was 35. Frozen holds count against `MAX_HELD_FROZEN = 256` (about 12,800 events),
   and the valve still says so on stderr when it gives up.
3. **What it does not change.** An `ask` on the live seat builds its frame at once
   (`WireGuiGame.ask` → `flushState`). A decision record taken while the tracker is frozen
   points at the last frame built before the freeze, which is the last consistent position.
   `Snap`, the checker and its M55 rule are untouched.

**Evidence.**
- `MidMoveSelfTest` part 5 (step 12i): seat 1 controls the Oracle and is the viewer, Forge
  re-runs its statics, and the forwarder is flushed on the first event fired while the tracker
  is frozen. Control: a bare `Snap.state` at that cut has the Oracle in play and seat 1's top
  card missing from `library.cards`. With the fix the flush is held and every frame of the log
  lists exactly the top card: 20 checks, 0 failures. With the freeze check switched off, the
  same test fails 2 checks: frame 1 has `library.cards []` and nothing was held.
- The probe deck, 4 games, both seats, `--seed 7`. Before: 40–221 frames per log with the
  Oracle in play and the seat's own top card missing. After: **0 in all 8 logs**, the same
  games (same turns, 20,618 vs 20,628 events, 1,420 vs 1,418 decision records), 6,532 frames
  instead of 10,957. `tools/check-redaction.mjs` passes all 8 logs.
- Ordinary cube games: 3 confirm-set pairs, 4 games each, both seats recorded, with and
  without the freeze check. The 24 logs have the same turns, 29,752 events and 3,190 decision
  records either way, and 9,231 frames instead of 9,260 (−0.3%). The checker passes both sets.

**Rejected.**
- *Hiding the symptom in `Snap.library`*, for example listing a top card whose `MayLookAt`
  effect is "about to return". The frame would still be half updated in every other property,
  and Snap walks views, never the game (hard rule 3).
- *Relaxing M55* for library tops. The checker was right that the frame did not show the card.
- *Raising D352's valve for both causes.* A stale reveal is rare and short, and its small valve
  keeps a mistake cheap.

**Addendum, 2026-10-24 (gate step 12i was a coin toss; the control's cut is pinned).** The
self-test's part 5 control (`D399 control: at the cut a bare Snap.state leaves seat 1's own
revealed top card out of library.cards`) failed on unchanged `main` in some JVMs and passed in
others: 7 of 10 failed back to back on one tree, while the checks of the behaviour itself
(every frame lists the top card, the flush is held) passed in all 10. What varied was not timing
but **which event the cut landed on**. The test flushed on the *first* event fired inside the
freeze, and in this position that event is not the one *Root cause* step 2 describes. It is
`Player.removeMaxLandPlays`, fired from inside `StaticEffects.clearStaticEffects` (step 1), which
walks `staticEffects.values()` of a `HashMap<StaticAbility, StaticEffect>`. `StaticAbility.hashCode`
is `Objects.hash(StaticAbility.class, getId())` (javap on the pinned 2.0.14 jar), and
`Class.hashCode` is the class object's identity hash, so it changes from one JVM to the next. When
the Oracle's `MayLookAt` effect comes first in that map, its reveal is already cleared when the
`AdjustLandPlays` effect's removal fires the event, and the bare frame is wrong, as the control
expected. When `AdjustLandPlays` comes first, the reveal is still in the view and the bare frame
is right. A probe printed every event of `checkStaticAbilities` (all on `Game-0`, inside the
subscriber, so there was no hop and no race between threads): three events in every run. (1)
`PlayerStatsChanged` from the clear, with the registry in hash order: `[AdjustLandPlays
MayLookAt]` showed the top card, `[MayLookAt AdjustLandPlays]` hid it. (2) `PlayerStatsChanged`
from `addMaxLandPlays` during the re-application. The registry then holds `[AdjustLandPlays]`
alone, and the top card is hidden in **every** run. (3) `CardStatsChanged`, with both effects back
and the card shown.

So the window D399 describes is real and deterministic, but the test's trigger was not aimed at
it. Neither decision 1, 2 nor 3 changes, and this needs no new number. The self-test now cuts at
the first event inside the freeze **with no `MayLookAt` static effect registered**: the reveal
cleared and not yet put back, which is event 2 in every JVM. The control is asserted there. It
still flushes at the first frozen event too, both flushes must be held, and what a bare frame
showed at that first event is printed as a `note`, never checked. Proof: 10 runs in a row, 10
passed (8 in one hash order, 2 in the other). With `MidMove.hold`'s freeze check switched off,
the test fails 2 checks in every run (`every flush made inside the freeze was held (0 of 2)`, and
a frame without the top card). The old trigger missed that frame in the
`[AdjustLandPlays MayLookAt]` order, because its only cut landed on a frame that happened to be
right.

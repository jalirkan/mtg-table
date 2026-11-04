## D512 — A9's hideaway look follows the take from the digger, whoever owns the host, and may lead the listed take by one frame (amends D502's rejected list)

*Branch `pc/d512-hideaway-host-owned-by-viewer`, off main `42e7a87f` (D509–D511). D512 was reserved for this lane
(`node tools/decisions.mjs next` gave D512). Amends **D502** (its rule after, point 5, and its rejected list's "a change
of control of the viewer's own permanent (taken back)") and **D505**'s admission, in rule A9 of
`tools/check-redaction.mjs`. The bridge, the wire and the protocol are unchanged. A checker admission, so it lands
between landings (**D509**, point 1).*

**2026-11-04**

**Context.** Lab night J187 (spine `b-s06-peasant-2558`, population `random-<band>-d508`'s second night) ran its branch
frame logs through the checker, and two failed rule A9's hideaway shape, both seat 1:
`/home/justin-a/code/lab/data/lab-j187/b-s06-peasant-2558/phaseB/frames/d14-random-o0-b48-seat1.jsonl.gz` (from line
121) and `.../d21-random-o1-b58-seat1.jsonl.gz` (from line 468). Every complaint is card 29:

    face-down card 29 in exile is owned and controlled by player 0, not the viewing seat 1, yet carries an "alt" block
    naming it "Bog Wraith" -- ... (hideaway, D502, D505) (A9, D371)

**What the engine did** (`d14`, viewing seat 1, line by line):
- Card 42, Watcher for Tomorrow, is **seat 1's own**. It sits in seat 1's graveyard.
- Line 87: player 0's Reanimate (stack, `Return Watcher...`). Line 88 (seq 74): the zone event 42
  `{graveyard, 1}` → `{battlefield, 0}` (event 2), the hideaway trigger's `cast` naming 42 with `controller: 0` (event
  12), the dig 29 `{library, 0}` → `{exile, 0}` (event 17) and `resolved` 42 (event 32). Hideaway digs "your library":
  the trigger is player 0's, so the dig is from **player 0's** library. Card 29 is the five-key stub.
- Line 120: seat 1's Control Magic (card 56) on the stack, targeting 42.
- Line 121 (seq 102): `attach` 56 → 42, the Watcher listed under seat 1 (`owner 1, controller 1`), and card 29 with
  its alt. It keeps it to the log's end, in exile, no zone event naming it.

`d21` is the same game shape at turn 36, with one more wrinkle. Line 366: 42 `{graveyard, 1}` → `{battlefield, 0}` and
the hideaway `cast` (controller 0); line 367: the dig 29 `{library, 0}` → `{exile, 0}`, then `resolved` 42. Line 468
(seq 402): Control Magic is cast **in this frame** (zone 56 hand → stack, `cast` 56), its stack item
`{sourceCardId: 56, controller: 1, targetCardIds: [42]}` is still listed, the frame's last event is
`{"kind":"attach","cardId":56,"to":{"kind":"card","id":42}}`, and the Control Magic card in `stackCards` already reads
`attachedToId: 42`. The Watcher is still listed under player 0, **and card 29 already carries its alt**. Line 469 (seq
403): 56 stack → battlefield (seat 1), `resolved` 56, `unstacked` 56, and the Watcher listed under seat 1. The snapshot
was cut inside the aura's resolution: Forge had attached it and re-applied the statics (the control effect, and with it
the hideaway look, which goes to the Watcher's current controller), but the battlefield listing had not moved yet. It is
the mirror of `b76`'s lag (D502), where the alt came a frame after the take.

**Not a leak.** Forge's hideaway static is `MayLookAt$ EffectSourceController` (D502, D505): the look goes to whoever
controls the Watcher, and CR 702.75a's "any player who has controlled the permanent" says the same. Seat 1 controls it.
The bridge's gate, `Snap.card`'s `canFaceDownBeShownTo`, served the face because `mayPlayerLook(seat 1)` is true. Who
**owns** the Watcher plays no part in the rule or in Forge.

**Why the checker refused.** D502's point 5 read "W is owned by P, and its controller changed from P to the viewing
seat": `takenAt` recorded a take only when the host's owner was not the viewer and the host was taken from its owner,
and `hideawayHost` required the host to be owned by the dug card's owner. Its rejected list carried "A change of control
of the viewer's own permanent (taken back)", and the negative fixture `a9-hideaway-viewer-own-permanent-taken-back`
encoded it as a FAIL with "it grants no look at the opponent's card". That was a theory with no engine evidence behind
it. J187's two logs are engine evidence against it.

**The rule after.** Rule A9 admits an alt on a face-down card in exile owned and controlled by player P (not the viewer)
when it can name the permanent W whose hideaway look it is:
1. **The dig** (unchanged): the card's latest move into exile is a zone event `{library, P}` → `{exile, P}`.
2. **W's entry, its trigger, the trigger's resolution, one dig per entry** (D505, unchanged), with one tie added: the
   trigger's `cast` carries `controller: P`. Hideaway digs its controller's library, so the trigger whose resolution
   vouches for P's dig must be P's. This replaces D502's "W is owned by P" as the tie between the host and P: the owner
   said nothing about whose library was dug; the trigger's controller says exactly that.
3. **The take, from P**: W's listed `controller` changed from P (previous state frame) to the viewer, **whoever owns
   W** — the viewer's own permanent taken back included — in the frame the alt arrives or the frame before it (`b76`).
   The viewer controls W in the frame the alt arrives.
4. **Or one frame of lead** (`d21`): the alt arrives in frame N, where W is still listed under P, when frame N's events
   carry an `attach` of card X onto W, and X is the `sourceCardId` of a stack item of the viewer's still listed on frame
   N's stack. That is not an admission. The complaint for frame N is held one state frame (`leadPending`), and dropped
   only when frame N+1 lists the viewer's take of **that** W from P (`takenAt` at N+1) and admits the card under W by
   point 3. Otherwise it is written at frame N's line. A log whose last state frame is N fails it; under `--partial`
   a prefix ending there holds it undecided until a later state frame or the game's end is in the prefix (D440's
   rule for a tail a later line could cure).
5. **Kept while in exile** (D505, unchanged): whoever controls W afterwards, whether or not it is still on the
   battlefield, until a zone event names the card or a frame drops its alt.

The stats line is unchanged: each admission counts once, in the frame it arrives (for a lead, frame N+1), under *an
opponent's hideaway card, its exiling permanent's control taken by the viewer, D502*.

**Why the lead's evidence is the attach, and why it is deferred.** The narrowest evidence `d21` offers is the aura's
own resolution: an `attach` onto the host of a card whose stack item, the viewer's, is still on the stack. It names the
host, it is the viewer's effect, and it is the effect that takes control. "The take is listed in the next state frame"
alone would admit an alt a frame early before any take of the right permanent; the attach alone would admit an alt
ahead of a take that never comes (the aura countered after the snapshot, say). Neither half is proof without the other,
so both are required, and the second can only be read in the next frame: hence the deferral. A take by an effect that
attaches nothing (a Threaten, an exchange) cut by a snapshot the same way would fail, and needs its own decision if a
night shows one. The listing check at frame N ("W still listed under P") is not written separately: the take from P at
N+1 already implies it.

**Probes that flipped, and why** (`tools/make-negative-fixtures.mjs`, `tools/check-redaction-selftest.mjs`):
- `a9-hideaway-viewer-own-permanent-taken-back` — **FAIL → PASS**, by design, counted. Its shape is `d14`'s: the
  viewer's own Watcher, entered under the opponent, its trigger the opponent's, its dig from the opponent's library, and
  the viewer takes it back. Its rationale is rewritten. The file is byte-identical; only its level changed.
- No other existing control changed its verdict or a byte. Every other probe that the owner check used to reject
  still fails for another reason: `-third-party-permanent` (host owned by and taken from player 2, the dig the
  opponent's) fails point 3, because the take is from 2, not from the card's owner. In a two-player game, the only
  kind the bridge plays, the take is always from the opponent, so the owner check had nothing left to refuse there
  except the viewer's own permanent. The added `by` tie in point 2 changed no control either: every committed
  hideaway fixture's trigger is cast by the digging player, as Forge writes it.

**New controls.**
- PASS, counted (with `-viewer-own-permanent-taken-back`, four new entries in the self-test's `COUNTED`):
  - `-own-permanent-reanimated-by-the-opponent-taken-back` (`d14`: the reanimation from the viewer's graveyard, then
    the aura resolving and the take in one frame);
  - `-alt-a-frame-before-the-take-while-the-aura-resolves` (`d21`);
  - `-alt-a-frame-before-the-opponent-own-watcher-taken` (the same lead on D502's own shape).
- FAIL:
  - `-own-permanent-taken-back-from-a-third-party`: the take is from player 2, not the card's owner;
  - `-own-permanent-unrelated-dig-beside-the-viewer-trigger`: the viewer's own Watcher entered under the viewer, its
    trigger (the viewer's) resolved right after a dig of the opponent's library, then the opponent took it and the
    viewer took it back. This is the hole that dropping the owner check alone would open; point 2's `by` tie closes it;
  - `-alt-two-frames-before-the-take`: alt a frame before the attach's frame;
  - `-alt-before-a-take-that-never-comes`: the aura attaches, the next frame lists no take;
  - `-alt-before-a-take-the-log-ends-first`: the attach's frame is the log's last state;
  - `-alt-ahead-of-the-take-with-no-attach`: the viewer's spell on the stack, the take next frame, no `attach`;
  - `-alt-ahead-of-the-take-the-opponent-aura`: the attaching aura's stack item is the opponent's;
  - `-alt-ahead-of-the-take-aura-onto-another-permanent`: the attach is onto another creature;
  - `-alt-ahead-of-the-take-another-host-taken`: two hosts each tied to the one dig; the aura attaches to one and
    the other is taken next frame. The lead is decided by the take of the permanent attached to.
- The selftest's `--partial` block gains one check: `-alt-a-frame-before-the-take-while-the-aura-resolves` cut at
  the attach's frame is undecided (`decided=` stops before that line, and a whole check of the same prefix fails it);
  with the take's frame it passes; `-alt-before-a-take-that-never-comes` cut a frame later fails at the attach's line.

**Mutants** (each applied to the checker in place, the whole self-test run, then restored). Each failed the self-test:
- the trigger's controller not checked (`r.by === owner` dropped): the unrelated-dig probe passes;
- the take's `from` not checked: both third-party probes pass;
- the attaching card's stack item not required to be the viewer's: the opponent-aura probe passes;
- any tied permanent taken for the lead's host, no attach needed: the no-attach and other-permanent probes pass;
- the lead admitted at once, no deferral: the never-comes, log-ends-first and another-host probes pass, the two
  lead controls lose their count, and the `--partial` check fails;
- the lead switched off: the two lead controls fail, and the `--partial` check fails;
- a held lead never written when the next frame does not cure it: the another-host probe passes and the `--partial`
  check fails (the never-comes probe still fails on its next frame, which carries no attach);
- a held lead never written at the log's end: `-alt-before-a-take-the-log-ends-first` passes;
- the lead cured by the card's admission under any host, at any take: the another-host probe passes.

Two narrower mutants survive, each because the other half of the cure implies it: the cure without "the take at
N+1" (an admission under W at N+1 needs a take of W at N or N+1, and one at N would have admitted the card at N), and
the cure without "under W" (a take of W at N+1 tied to the card admits it under W). Both halves are kept as written.

**What was rejected.**
- **Keeping the owner check and admitting the viewer's own permanent as a special case.** It is the same rule stated
  twice, and it would still say something Forge does not: ownership plays no part in the look.
- **Dropping the owner check with no tie in its place.** The `-own-permanent-unrelated-dig-beside-the-viewer-trigger`
  probe passes then: a dig of the opponent's library beside the viewer's own trigger would be vouched for by a
  permanent that never dug it.
- **Reading the host's listed controller at the dig instead of the trigger's `controller`.** The listing can lag a
  frame (this decision's own `d21`); the `cast` event names the trigger's controller directly (its `controller`, in
  docs/protocol.md's event table).
- **The lead on "the take is listed next frame" alone, or on the attach alone** (above).
- **Admitting the lead in frame N on the attach, and failing frame N+1 if the take does not come.** Frame N's alt
  would then pass with nothing having proven it; a held grant would also keep it at N+1. The complaint belongs to
  frame N's line, decided by N+1.
- **A deferral of two frames, or any window.** The log shows one, and D502's rule for the lag at the other end is one.
- **Changing the bridge.** It is right, and `bridge/src` is frozen (D509).

**What is still admitted that the log cannot rule out.** D502's and D505's residuals, unchanged. In a two-player game
the owner no longer being checked admits one shape more, the one this decision is for: a host the viewer owns, whose
entry's trigger was the opponent's and dug the opponent's library, taken back from the opponent. The take is from the
opponent, the dig the opponent's and the trigger the opponent's in every admitted case.

**docs/protocol.md** needs no change: the wire shape is unchanged, and its *Face-down cards and `alt`* section says
only that hideaway is a look permission like Gonti's, for the seat's own card.

**Measured.** See `docs/evidence/cube-lab.md` §15.

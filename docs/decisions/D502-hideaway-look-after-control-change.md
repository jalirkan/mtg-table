## D502 — A9 admits an opponent's hideaway card shown to the seat that took control of the permanent that hid it (amends D371's A9)

*Branch `pc/d502-checker-shapes`, off main `ac07876b` (#226, D498–D501). D502, D503 and D504 were reserved for this lane
(`node tools/decisions.mjs next` gave D502). Amends **D371**'s rule A9 in `tools/check-redaction.mjs`. The bridge, the
wire and the protocol are unchanged.*

**2026-11-02**

**Context.** J182 (the lab's atlas night, 2026-11-01) ran its branch frame logs through `tools/check-redaction.mjs`, and
11 logs failed, in three shapes (this decision, **D503** and **D504**). This decision covers five of them, all in spine
`b-s06-peasant-2506`, under `/home/justin-a/code/lab/data/lab-j182/b-s06-peasant-2506/phaseB/frames/`:
`d1-random-o0-b148`, `d1-random-o0-b47`, `d1-random-o0-b76`, `d1-random-o1-b148` and `d2-random-o3-b20` (each
`-seat0.jsonl.gz`). Each failed A9 on every state frame from one line on, with this message:

    face-down card 57 in exile is owned and controlled by player 1, not the viewing seat 0, yet carries an "alt" block
    naming it "Stock Up" -- outside play only a look permission (mayPlayerLook) shows a face-down card, and the only
    shape a log can show for one is a card exiled from a library, alt and all, while the viewing seat's effect
    resolves (Gonti, Thief of Sanity), kept while it stays in exile (A9, D371)

The card differs by log: 57 (Stock Up) in both `b148` logs, 46 (Deep Spawn) in `b47`, 78 (Amnesia) in `b76`, and 45
(Eddymurk Crab) in `b20`. The mechanism is the same in all five.

- **The hideaway.** Player 1 (the opponent) controls Watcher for Tomorrow (card 47). When it entered, its Hideaway 4
  trigger exiled a card of player 1's library face down. In `b47`, seq 275 (line 330) carries the trigger's `cast` and
  the zone event 46 `{library, 1}` → `{exile, 1}`. No alt is shown to seat 0 at that point.
- **The exchange.** Player 1 then cast Burglar's Plot (card 52, the adventure half of Bilbo, Luckwearer). Its `cast`
  text reads "Watcher for Tomorrow (47) exchanges controller with Sourbread Auntie (13)" in `b76` and `b20`. In `b47`,
  the other creature is Phantom Monster (18). In the state where it resolves, card 47's `controller` on the battlefield
  turns from 1 to 0, and seat 0's creature turns from 0 to 1.
- **The alt appears.** In four logs it appears in that same state frame (`b47`: seq 328, line 406). In `b76` it
  appears one state frame later: the controller changes at seq 191 (line 216), a snapshot cut mid-resolution right
  after Burglar's Plot's `resolved`, and the alt appears at seq 192 (line 217), the next snapshot. After that the alt
  stays on the card while it stays in exile. Each log ends that run when the Watcher leaves the battlefield and its
  trigger returns the card to player 1's hand (`b47` seq 457), where it is a stub again.

**The rules and the engine.** Forge 2.0.14 builds hideaway with a continuous static on an Effect
(`forge-game/.../card/CardFactoryUtil.java:1301` at the `forge-2.0.14` tag of `~/code/forge-src`; line 1287 on the daily
checkout): `MayLookAt$ EffectSourceController | AffectedZone$ Exile`, described as "Any player who has controlled the
permanent that exiled this card may look at this card in the exile zone". That is CR 702.75a. `AbilityUtils`'
`EffectSource` resolves to the Effect's root source card, the Watcher, so the look goes to the Watcher's **current**
controller. Once seat 0 controls the Watcher, `CardView.mayPlayerLook(seat 0)` is true, and `canFaceDownBeShownTo` opens
with it (D371). `Snap.card`'s `alt` gate is that predicate, so the bridge served the face to the seat that the rules let
look. The one-frame lag in `b76` is the static being re-applied after the snapshot that moved control.

**The rule before.** Outside play, A9 admitted an `alt` on a card that the seat neither owns nor controls in exactly
one shape: the card arrives in exile from a library, alt and all, in a frame where a stack item that the viewing seat
controls is on the stack, in that frame or the previous state frame (Gonti, Thief of Sanity). It then keeps the alt
while it stays in exile (`lookGrants`). Hideaway's look reaches a seat that was not the digger, so no frame of these
logs has that shape.

**The rule after.** The rule also admits an alt on a face-down card in **exile** when all of the following hold:
- the card is owned and controlled by player P, who is not the viewer;
- P is the **owner** of a battlefield permanent whose `controller` changed from P (in the previous state frame) to
  the viewing seat (in this one);
- that change happened in the frame where the alt appears, or in the state frame before it. The previous frame is
  allowed for the `b76` shape, and it mirrors D371's own "this frame or the previous one" for the stack item.

From then on, the card keeps the alt while it stays in exile in consecutive state frames, through the existing
`nextGrants` / `stayed` mechanism, exactly as a Gonti card does. The stats line counts each admission once, in the
frame it arrives: `alt blocks=N (k an opponent's hideaway card, its exiling permanent's control taken by the viewer,
D502)`. That count is never a WARN.

The log cannot tie the exiled card to the permanent that exiled it: nothing in a frame says which Watcher hid which
card, and a branch log forked late may hold neither the hideaway trigger nor the exile. So the evidence is the
narrowest that every one of the five logs shows. The face appears in the frame where the viewer takes control of a
permanent of that card's owner, or the frame after.

**The authority.** The bridge's own gate is `Snap.card`'s `canFaceDownBeShownTo`, the one serialisation function (hard
rule 8), and it is unchanged. For a decision that names such a card, the gate at decision time is `Decisions.visible`
(**D347**), which names a card in exile when it is face up or under the seat's control. That is unchanged too. A9 is the
after-the-fact audit of that gate. It accepts this shape because the frames show its cause, not because the bridge
needs its permission.

**What is still rejected.**
- An alt with no change of control: the Watcher stays the opponent's.
- An alt where the viewer controlled the permanent from the start of the log and no change appears. A look granted
  before the log began leaves no evidence in it.
- A change of control of a permanent the viewer owns (one taken back from the opponent), or of a permanent of a third
  owner. Neither is the exiled card's owner.
- An alt that first appears two or more state frames after the change.
- A face-down card outside exile (a graveyard, say). Hideaway's look is "in the exile zone".
- An alt in play on a card the viewer does not control. That is A9's in-play half, unchanged.
- D371's own probes, all unchanged.

**Rejected alternatives.**
- **Requiring the alt in the same frame as the change.** This was the brief's first form. It fails `b76`, whose
  snapshot was cut between the control change and the static's re-application.
- **"Ever controlled" anywhere in the log.** That is wider than any log needs. It would let an alt arrive turns
  after the change with nothing to tie the two together.
- **Tying the card to the hideaway trigger's `cast` and the library-to-exile event.** That would be tighter, but a
  late branch log need not hold the exile, and none of the five needs it to be read correctly.
- **Changing the bridge.** The bridge is right. Hiding the face would contradict Forge's `mayPlayerLook` and the rules.

**Tests.** The selftest (`tools/check-redaction-selftest.mjs`) has new controls generated by
`tools/make-negative-fixtures.mjs`, all listed in `REQUIRED`. Every older control regenerated byte-identical.
- **PASS:**
  - `a9-hideaway-control-taken`: the Watcher moves from the opponent's battlefield to the viewer's in state 1, with the
    card's alt from state 1;
  - `a9-hideaway-alt-a-state-after-control-taken`: the `b76` shape.
  - Both must show the D502 count on the stats line (the selftest's new `COUNTED` list).
- **FAIL:**
  - `a9-hideaway-no-control-change`;
  - `a9-hideaway-viewer-controlled-from-the-start`;
  - `a9-hideaway-viewer-own-permanent-taken-back`;
  - `a9-hideaway-third-party-permanent` (owner 2);
  - `a9-hideaway-alt-in-a-graveyard`;
  - `a9-hideaway-alt-two-states-after-control-taken`.

**Mutants.** Each mutant ran in a scratch copy of the checker against the whole selftest. Every one of these failed the
selftest:
- the previous-frame allowance removed (`a9-hideaway-alt-a-state-after-control-taken` fails);
- the previous controller check removed (`-viewer-controlled-from-the-start` and `-alt-two-states-after-...` pass);
- any owner's permanent accepted (`-third-party-permanent` passes);
- exile not required (`-alt-in-a-graveyard` passes);
- the rule off (both PASS controls fail).

Three guards survive their mutants, because in a two-seat game another guard already implies each of them. All three
are kept as defence in depth:
- **The permanent's owner is not the viewer.** The previous controller must be that owner, and the new one must be the
  viewer.
- **The new controller is the viewer, rather than merely not the owner.** With two seats, the only other seat is the
  viewer.
- **The exiled card's controller is its owner.** A card the viewer controls is "mine", and this path is never reached.

**Measured.** See *Evidence* in **D504**, which covers all three decisions' runs over the J182 logs.

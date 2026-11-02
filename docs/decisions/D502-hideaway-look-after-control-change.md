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

**The rule after** (as tightened by two reviews, of `f3a3091b` and of `c12f8418`; see *The reviews* below). The rule
also admits an alt on a face-down card in **exile**, owned and controlled by player P (not the viewer), when it can
name the permanent W whose hideaway look it is. All of the following must hold:
1. **The card was dug from its owner's library.** The card's latest move into exile is a zone event from
   `{library, P}` to `{exile, P}`. Any later zone event of the card clears it: a card returned to a hand and exiled
   again (foretold), say.
2. **The dig is beside W's entry.** The dig sits in the state frame where W entered the battlefield, or in the next
   one. W's entry is either a zone event onto a battlefield, or its first listing on one after a state without it.
   The log's **first** state frame records no listing entry: a branch log forks mid-game, and what its first frame
   lists was there before the log began.
3. **W's own hideaway trigger is beside the dig.** A `cast` event names W, the trigger on the stack, in the dig's
   frame or the one before.
4. **W vouches for one card only.** No other card whose latest move into exile is from P's library is tied to W by
   points 2 and 3. A hideaway trigger exiles one card. Two cards tied to one W are ambiguous, so neither is admitted.
   That covers two hosts entering and digging in one frame, and another dig landing beside W's trigger.
5. **The viewer took W from P.** W is owned by P, and its `controller` changed from P (previous state frame) to the
   viewing seat in the frame where the alt appears, or in the frame before it (`b76`).
6. **The viewer still controls W** on the battlefield in that frame.

All five logs show points 1 to 3. The Watcher's entry is a zone event and its hideaway trigger a `cast` naming card 47
("Hideaway 4 ..."):

| log | Watcher enters (zone event) | hideaway `cast` | card dug |
|---|---|---|---|
| `b47` | seq 275 | seq 275 | seq 275 |
| both `b148` | seq 91 | seq 91 | seq 92 |
| `b76` | seq 162 | seq 162 | seq 163 |
| `b20` | seq 183 | seq 183 | seq 184 |

**The grant ends.** After that, the card keeps the alt only while it stays in exile in consecutive state frames and the
viewer still controls **that** W. One frame of grace follows the frame where the viewer stops controlling W, or W
leaves the battlefield. A second frame ends the grant. Forge's look is the current controller's, so the real bridge
drops the alt once control returns. The grace frame is the same snapshot lag as at the start: in `b76` the Watcher
dies at seq 245 (line 278) and the alt is still on card 78 in that snapshot, gone with the card to its owner's hand at
seq 246.

These grants live in their own map (`hideawayGrants`, card → {W, held this frame}), not in D371's `lookGrants`, which
keeps an alt for as long as the card stays in exile. The stats line counts each admission once, in the frame it
arrives: `alt blocks=N (k an opponent's hideaway card, its exiling permanent's control taken by the viewer, D502)`.
That count is never a WARN.

**The authority.** The bridge's own gate is `Snap.card`'s `canFaceDownBeShownTo`, the one serialisation function (hard
rule 8), and it is unchanged. For a decision that names such a card, the gate at decision time is `Decisions.visible`
(**D347**), which names a card in exile when it is face up or under the seat's control. That is unchanged too. A9 is the
after-the-fact audit of that gate. It accepts this shape because the frames show its cause, not because the bridge
needs its permission.

**What is still rejected.**
- No change of control: the Watcher stays the opponent's. Also control held from the start of the log, with no change
  in it.
- A change of control of the viewer's own permanent (taken back), or of a third owner's.
- An alt that first appears two or more state frames after the change, or after the viewer has already given the
  permanent back.
- A face-down card outside exile.
- **A card whose latest move into exile did not come from its owner's library.** This covers:
  - a foretold card (hand → exile face down) under an unrelated stolen Grizzly Bears;
  - a hand card exiled face down carrying its alt in the very frame of the steal;
  - a dug card that went back to a hand and was exiled again;
  - a dig from another seat's library, or into another seat's exile.

  The first two are the leaking logs the review of `f3a3091b` built, which passed on the first form of this rule and fail on `main`.
- A card dug beside another permanent's entry (the opponent's Mosswort Bridge) while the Watcher is the one stolen.
- A dig with no `cast` event naming its host beside it, whether or not the host entered in that frame.
- A dig in the log's first state frame, tied to a permanent the log first lists there. Stealing that permanent later
  admits nothing. That holds even when the steal comes in the lag frame of a real grant.
- A second dig beside one host's trigger, and two hosts entering and digging in one frame. Neither card is admitted.
- The alt still on the card two frames after the Watcher went back to the opponent, or after it left.
- An alt in play on a card the viewer does not control (A9's in-play half), and D371's own probes, unchanged.

**What is still admitted that the log cannot rule out.** A hideaway host whose own trigger digs nothing (an empty
library) while some other effect digs exactly one card of its owner's beside its entry and its trigger. Then that one
card is tied to the host. No J182 log comes near it.

**What the rule cannot see.** If a branch log was forked after the Watcher entered, the entry, its trigger and the dig
are not in it, and the alt fails. That needs its own decision if a night meets it (PLAN.md's cube lab follow-up 19).

**Rejected alternatives.**
- **The first form of this rule** (`f3a3091b`): any owner's permanent taken, with no link to the exiled card, and the
  grant kept for as long as the card stayed in exile. The review showed it admits a foretold card's face under any
  steal, and keeps it after control returns.
- **Requiring the alt in the same frame as the change.** It fails `b76`, whose snapshot was cut between the control
  change and the static's re-application.
- **Ending the grant in the very frame control is lost.** It fails `b76` at the Watcher's death. The grace is one
  frame, never two.
- **Tying the card to the hideaway trigger's `cast` event.** The trigger's text is an engine string. Its `cardId` is the
  Watcher's, already tied by the entry.
- **Changing the bridge.** The bridge is right. Hiding the face would contradict Forge's `mayPlayerLook` and the rules.

**The reviews.**
- **The review of `f3a3091b`.** As first committed, the rule admitted an alt on any face-down exiled card of the
  opponent's whenever the viewer took any of the opponent's permanents. `stayed` then kept the alt for as long as the
  card stayed in exile. The two leaking logs the review built pass on `f3a3091b` and fail on `main`:
  - a foretold Doomskar under a Threatened Grizzly Bears, which keeps its alt after the Bears go back;
  - a hand stub exiled face down with its alt in the frame of a steal.

  `c12f8418` added points 1, 2, 5 and 6 and the end of the grant.
- **The review of `c12f8418`** found two more holes:
  - the log's first frame counted every permanent already on the battlefield as entered, so a dig in frame 0 or 1 was
    tied to any of them. This also let a steal in a grant's lag frame carry the alt on;
  - an unrelated dig in the frame after a host's entry was taken for the host's.

  This form adds the first-frame rule (point 2), the host's trigger (point 3) and, beyond what the review asked,
  one card per host (point 4). Point 4 also closes the review's "two hosts entering in one frame", which it expected
  to stay admitted.

**Tests.** The selftest (`tools/check-redaction-selftest.mjs`) has 26 controls for this rule, generated by
`tools/make-negative-fixtures.mjs` and all listed in `REQUIRED`. Every control outside this rule regenerated
byte-identical.
- **PASS, each holding the D502 count on its stats line** (the selftest's `COUNTED` list):
  - `a9-hideaway-control-taken`: the entry, the trigger's cast and the dig in one frame, then the steal and the alt;
  - `-alt-a-state-after-control-taken`: the cast at the entry and the dig a frame later (`b148`), and the alt a frame
    after the steal (`b76`);
  - `-alt-a-state-after-the-host-leaves`: `b76`'s grace frame;
  - `-retaken-the-frame-after-a-return`: taken, returned with the alt in the lag frame, taken again (the review's
    `n8`);
  - `-alt-dropped-while-returned`: the same with the alt gone in between (the review's `p4`).
- **FAIL:**
  - `-no-control-change`;
  - `-viewer-controlled-from-the-start`;
  - `-viewer-own-permanent-taken-back`;
  - `-third-party-permanent`;
  - `-alt-in-a-graveyard`;
  - `-alt-two-states-after-control-taken`;
  - `-foretold-card-under-a-stolen-creature`;
  - `-hand-card-exiled-with-its-alt-at-the-steal`;
  - `-alt-kept-after-control-returns`;
  - `-alt-after-control-already-returned`;
  - `-card-re-exiled-from-a-hand`;
  - `-dug-from-another-library`;
  - `-dug-into-another-exile`;
  - `-card-of-an-unrelated-host`;
  - `-dig-with-no-host-trigger`;
  - `-dig-beside-the-log-start` (the review's `n5`);
  - `-lag-frame-then-an-unrelated-steal` (`n3`);
  - `-lag-frame-then-a-steal-of-an-earlier-entry` (`n3b`);
  - `-unrelated-dig-after-an-entry-with-no-trigger` (`n1b`);
  - `-second-dig-beside-the-host-trigger`;
  - `-two-hosts-enter-together` (`n1`).

**Mutants.** I ran 19 mutants of this form, each in a scratch copy against the whole selftest and the five s06 logs.
These 18 each failed the selftest:
- a move into exile from anywhere;
- the dig's same-player check removed;
- no entry link;
- the entry link the same frame only;
- the entry read from its first listing only;
- the log's first frame counted as an entry;
- no host trigger needed;
- the host trigger in the dig's frame only (this also fails four J182 logs);
- no one-card limit;
- the take this frame only;
- the take at any time;
- the host's owner unchecked;
- the host not held at admission;
- the dig's owner unchecked;
- the grant kept forever;
- no grace after loss;
- another zone event not clearing the dig;
- the rule off.

One survives: the entry read from its zone event only. That is a narrowing. No log or control needs the listing
spelling once the first frame is excluded, and the listing is kept because it is the same fact.

**Measured.** The five J182 s06 logs pass with the D502 count (1 each). The table is in *Evidence* in **D504**.

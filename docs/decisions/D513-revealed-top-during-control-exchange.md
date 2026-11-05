## D513 — A3's revealed top card is the zone's player's: a revealer vouches for the top of the player whose battlefield lists it, not of its `controller` field, which leads the listing by a frame while a control exchange resolves (amends D315's rule A3 and D501's predicate)

*Branch `pc/d513-revealed-top-during-control-exchange`, off main `fe063f94` (D512's merge). D513 was reserved for this
lane (`node tools/decisions.mjs next` gave D513). Amends rule A3 of `tools/check-redaction.mjs` (D315's
`REVEALS_OWN_TOP`, read by `revealedTopsOf`) and with it **D501**'s `revealedTopCard`, whose form is unchanged. The
bridge, the wire and the protocol are unchanged. A checker admission, so it lands between landings (**D509**, point 1).*

**2026-11-05**

**Context.** Lab night J191 (spine `b-s08-powered-3008`, population `random-<band>-d508`'s fifth night) failed its
`atlas.problems == 0` check on two branch frame logs, both seat 0, both under the atlas's `--empty-hand-ok`:
`/home/justin-a/code/lab/data/lab-j191/b-s08-powered-3008/phaseB/frames/d7-random-o1-b121-seat0.jsonl.gz` (line 501)
and `.../d7-random-o1-b5-seat0.jsonl.gz` (line 261). The spine's other 6,798 branch logs and its two baseline logs
passed. Both complaints read:

    players[1] (id 1, NOT the viewing seat 0) has 1 full card(s) in library.cards. Legal ONLY while a canBeShownTo-true
    effect is running on THEIR library (Opposition Agent, Bribery, Gonti); ... (A3)

**What the engine did** (`b121`, viewing seat 0, line by line):
- Line 498 (seq 423, turn 29, main 1, seat 0's priority): player 1 controls Oracle of Mul Daya (card 80, "play with the
  top card of your library revealed"), listed under `players[1].battlefield` with `owner 1, controller 1`, and the
  state lists player 1's top card in `players[1].zones.library.cards`: card 45, Thundertrap Trainer, one card, which A3
  accepts.
- Lines 499–500: seat 0's decisions, `activate:3#2` (Oko, Thief of Crowns' −5) and `target:80`.
- Line 501 (seq 424): the ability's stack item is still listed (`sourceCardId 3`, controller 0, text "... Oracle of Mul
  Daya (80) exchanges controller with Ulvenwald Oddity (9)"), and the frame's events end with its `cast` and then
  `{"kind":"resolved","cardId":3}`. The Oracle is **still listed under `players[1].battlefield`**, but its
  `controller` reads **0**; the Oddity is still under `players[0]` with `controller 1`. `players[1].library.cards` still
  lists card 45, the same public top card as the frame before, and the viewer's own `library.cards` is `[]`: the
  reveal has not reached the new controller's top.
- Line 502 (seq 425): `unstacked` 3, the stack empty, the Oracle under `players[0].battlefield` (controller 0), the
  Oddity under `players[1]`, `players[1].library.cards` `[]`, and the viewer's own top card (33, an Island) listed in
  `players[0].library.cards`.

`b5` is the same shape at turn 19: line 258 (seq 223) lists the Oracle (80) under player 1 and player 1's top card (43,
Morphling); lines 259–260 are `activate:3#2` and `target:30`; line 261 (seq 224) lists the stack item ("Oracle of Mul
Daya (80) exchanges controller with Island (30)"), its `cast` and `resolved`, the Oracle under `players[1]` with
`controller 0`, and card 43 still listed; line 262 (seq 225) lists `unstacked` 3, the Oracle under `players[0]`, player
1's library `[]` and the viewer's top (14).

So the snapshot was cut after the exchange set both controllers and before the cards changed battlefields. Forge's
order (the `forge-2.0.14` tag of `~/code/forge-src`; the 2.0.15 source checkout at `579d0a84c` reads the same at other
line numbers; the order of the calls confirmed on the pinned jar with `javap -c`):
1. `MagicStack.resolveStack` resolves the ability; `ControlExchangeEffect.resolve` calls `Card.addTempController` on
   both cards (`ControlExchangeEffect.java:95-96`), and `addTempController` calls `view.updateController(this)` at
   once (`Card.java:3757-3760`): the view's `controller` moves now.
2. `resolveStack` fires `GameEventSpellResolved` (`MagicStack.java:628`) -- the wire's `resolved`, the cut frame's last
   event -- and only then calls `game.getAction().checkStaticAbilities()` (`:630`) and `finishResolving` (`:632`,
   the `unstacked` of line 502).
3. `checkStaticAbilities` freezes the tracker (`GameAction.java:1083`), clears every static effect (`:1088`; the
   Oracle's `MayLookAt` on player 1's top goes), re-applies the statics layer by layer -- the Oracle's
   `Affected$ Card.TopLibrary+YouCtrl | MayLookAt$ Player` now reads `YouCtrl` against its new controller, player 0 --
   and at the end of the same pass calls `controllerChangeZoneCorrection(c)` for every battlefield card whose
   controller is not its zone's player (`:1206`), which removes it from the old battlefield and adds it to the new one
   (`:1027-1028`).

On the pinned jar, `resolveStack`'s bytecode constructs `GameEventSpellResolved` and then invokes
`GameAction.checkStaticAbilities()` and `finishResolving`, in that order; the three-argument `checkStaticAbilities`
invokes `Tracker.freeze`, `StaticEffects.clearStaticEffects`, the layers, `controllerChangeZoneCorrection` and
`Tracker.unfreeze`, in that order; `ControlExchangeEffect.resolve` invokes `addTempController` twice; and
`addTempController` invokes `CardView.updateController`. The frame itself says it was cut before the freeze: card 45 is
still listed, and `PlayerMayLook` ignores the freeze (D399), so a frame cut after `clearStaticEffects` would have lost it.

**Not a leak.** In the cut frame the engine's permission on card 45 is still the one the Oracle granted while player 1
controlled it: the statics were last computed before the exchange, and are recomputed together with the zone correction.
The bridge's gate, `canBeShownTo`, served card 45 because the engine said every player may see it. It was public the
frame before, it is the same card, and the viewer learned nothing; the next frame drops it, as the recomputed static
moved the reveal to the viewer's own top.

**Why the checker refused.** `revealedTopsOf` added, for each `REVEALS_OWN_TOP` permanent, the card's `controller` field
(the zone's player only when the field was missing). In the cut frame the field reads 0, the viewer, so A3 vouched for
the viewer's top (which needs no voucher) and not player 1's, and player 1's one listed card fell to A3's failure. D501's
`revealedTopCard` reads the same set, so the `--empty-hand-ok` proof would have refused it too.

**Decision.** A `REVEALS_OWN_TOP` permanent listed in player q's battlefield vouches for **q's** top card: the zone's
player, whatever the card's `controller` field says. `REVEALS_EVERY_TOP` is unchanged (every player's top, whoever
controls it). D501's `revealedTopCard` is unchanged in form -- `p` not the viewer, exactly one card, `revealedTopsOf`
holds `p` -- and so is the `--empty-hand-ok` proof; both now read the zone's player through `revealedTopsOf`. A3's
message, its census and its stats line are unchanged.

**Why the zone's player.** Forge recomputes the "top card revealed" grant and moves a permanent between battlefields in
the same `checkStaticAbilities` pass, inside one tracker freeze, and D399 holds every flush inside a freeze. So in every
frame the bridge writes, the grant was computed against the controller the permanent had when it was last placed in its
zone. A one-shot change of control (an exchange's `addTempController`) moves the `controller` field at once and the
grant and the zone together later: between the two, the zone's player is the player whose top the engine is revealing,
and the field names a player whose top is not revealed yet.

**Rejected.**
- **Either the zone's player or the controller.** In the only frame where the two differ, the controller's top is not
  revealed: the grant still rests on the zone's player. "Either" would vouch for one card of the controller's library in
  that frame, which is exactly the one-card dump A3 exists to catch. The control
  `a3-revealer-in-the-viewer-zone-controlled-by-the-opponent` pins it: the viewer's own Oracle, still listed on the
  viewer's battlefield as the opponent's exchange resolves, its field already the opponent's, and the opponent's
  library listing a card. An engine cut there lists nothing of the opponent's library (the grant is still on the
  viewer's top), so a listed card is a leak, and only the zone reading fails it.
- **The controller field alone (as before).** It refused J191's two frames, which are public.
- **Admitting the lag frame by its evidence** (an exchange's stack item and `resolved` in the frame, the field ahead of
  the zone), D512-style. The zone reading needs no window, no evidence and no deferral, and it is right outside the lag
  too: wherever the two agree, nothing changes.
- **Changing the bridge** (holding a flush between a control change and its `checkStaticAbilities`, as D399 holds one
  inside the freeze). The frame is consistent about what it shows, `bridge/src` is frozen between landings (D509), and
  the checker is the one that misread it.

**Evidence** (`docs/evidence/cube-lab.md` §16).
- Both J191 logs, `zcat <log> | node tools/check-redaction.mjs --empty-hand-ok /dev/stdin`: FAIL on `main`, PASS here
  (`b121`: 97 states with an opponent's top card A3 vouches for; `b5`: 95).
- s08's 6,800 branch logs under `--empty-hand-ok`: `main` fails exactly the two, this branch none; its two baseline
  logs, without the flag, pass. The `atlas.json`'s 6,802 frame logs are those 6,800 and the two baselines.
- A census of s08's state frames: a top-revealing permanent is listed in 74,223 of them (1,030 logs), and its
  `controller` field names another player than its zone's in exactly two, the two above; in both, the zone's player's
  library lists one card and the controller's none.
- D512's three corpora (J187 s06, J183 s11, J182 s06; 26,950 logs) under `--empty-hand-ok`: 0 failures on either
  checker. None lists a top-revealing permanent, so they re-check only that nothing else moved.
- `fixtures/games/` and `fixtures/synthetic/` (23 files): every one PASS, and each prints byte-for-byte what `main`'s
  checker prints.
- Controls (`tools/make-negative-fixtures.mjs`; 245 before, 249 after; every existing file byte-identical):
  - PASS, counted (`(2 an opponent's top card revealed by a permanent, A3)`): `a3-revealed-top-during-a-control-exchange`
    -- before (the Oracle under the opponent, one top card), the cut frame (the Oracle under the opponent, controller
    the viewer, the same one top card, the exchange on the stack with its `cast` and `resolved`), after (the Oracle under
    the viewer, the opponent's library `[]`, the viewer's own top listed).
  - FAIL: `a3-two-cards-during-a-control-exchange` (the cut frame listing two cards); `a3-revealed-top-the-frame-after-the-exchange`
    (the Oracle already under the viewer while the opponent's library still lists a card -- D501's viewer-revealer shape,
    kept); `a3-revealer-in-the-viewer-zone-controlled-by-the-opponent` (the mirror above; it fails at the cut frame only,
    and its next frame, the Oracle under the opponent with the opponent's top listed, passes).
  - The self-test's D501 block gains the s07 shape with its last state cut inside the exchange (the Oracle on the
    opponent's battlefield, its field the viewer's): a pass under `--empty-hand-ok` with the TOP warning and A3 counting
    the top card in every state; and the same cut with two cards, still a failure for its reason. Every existing D501
    control keeps its verdict.
- Mutants (each applied to the checker in place, the whole self-test run, then restored):
  - the controller field again (the rule as it was): 9 failures -- control 1 fails at the cut frame (and loses its
    count, and fails `--partial` and `--empty-hand-ok`), control 4 passes, and the s07 cut variant fails;
  - "either" (the zone's player and the controller field): 3 failures -- control 4 passes, under every flag.

**What is still admitted, or still refused, that the log cannot settle.**
- **A gain-control effect moves the zone in the effect, not in the pass.** `ControlGainEffect` (a Threaten, an Act of
  Treason, Control Magic's one-shot cousins) calls `controllerChangeZoneCorrection` itself (`ControlGainEffect.java:236`
  at the tag), before `resolveStack` re-applies the statics. A snapshot cut on that `resolved` would list the taken
  Oracle under its new controller's battlefield with the old controller's top card still public. If the viewer takes
  the opponent's Oracle that way, that frame fails A3 under either reading: the frame-after control's shape, which is
  refused here as it was. If the opponent takes the viewer's Oracle that way, the zone reading vouches for the
  opponent's top in a frame where the engine has not revealed it yet: a one-card window the log cannot rule out, of the
  same kind as A3's every vouch (the checker cannot see the engine's permission). Neither has been seen; each needs its
  own decision if a night shows one.
- **What flushed at the `resolved` event is not established.** In both logs 19 ms of wall time and eight events separate
  the cut frame from the one before it (neither of the forwarder's thresholds, 50 events or 500 ms), and no decision
  record lies between the cut frame and the next. The reading does not depend on it: the frame was cut before the freeze
  (card 45 is listed) and after the field moved.

**J191's night.** The check failed on the checker, not on a leak: s08's data stands, and so do the other twelve spines',
so J192 pools J191's thirteen spines.

**docs/protocol.md** needs no change: the wire shape is unchanged.

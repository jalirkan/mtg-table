## D505 — A9 keeps a hideaway card's look while the card stays in exile, whoever controls its permanent now (amends D502's end rule)

*Branch `pc/d505-hideaway-look`, off main `3275af30` (D502–D504). D505 was reserved for this lane (`node tools/decisions.mjs
next` gave D505). Amends **D502**'s "the grant ends" in rule A9 of `tools/check-redaction.mjs`. The bridge, the wire and
the protocol are unchanged.*

**2026-11-02**

**Context.** Lab night J183 ran its branch frame logs through the checker at `3275af30`. Seventeen seat-1 logs of unit
`b-s11-legacy-2524` failed rule A9, all with D502's message:

    face-down card N in exile is owned and controlled by player 0, not the viewing seat 1, yet carries an "alt" block
    naming it ... (hideaway, D502) (A9, D371)

Every one is the card under a Watcher for Tomorrow (card 2, player 0's). Its text: "Hideaway 4. When Watcher for
Tomorrow leaves the battlefield, put the exiled card into its owner's hand." Seat 1 took the Watcher from player 0, and
the alt appeared in that frame, as D502 admits. What failed in 13 of the 17 is D502's end rule. That rule kept the
grant only while the viewer still controlled THAT permanent, plus one frame of lag. In these logs the alt stays after
control goes back to the owner, and after the Watcher leaves the battlefield, until the card moves.

The logs are under `/home/justin-a/code/lab/data/lab-j183/b-s11-legacy-2524/phaseB/frames/`. Each timeline below lists
state seq → the card's zone and alt, and the Watcher's controller:

- **`d0-random-o0-b67-seat1`** (card 13, Tishana's Tidebinder):
  - 68: the dig (library → exile), with the trigger's cast; the card is a hidden stub, Watcher controlled by 0.
  - 113: the alt appears; the Watcher is now seat 1's (taken).
  - 239: the alt is kept with the Watcher back under 0. `main` flags lines 273–275, the second frame after the return and later.
  - 243: seat 1 takes the Watcher again.
  - 516: the log ends with the card still in exile. The only zone event naming card 13 is the dig.
- **`d11-random-o3-b100-seat1`** (card 37, Echo of Eons):
  - 238: the dig.
  - 258: the alt appears; seat 1 controls the Watcher.
  - 304: the alt is kept with the Watcher gone from the battlefield. `main` flags line 436.
  - 306: the Watcher's leave trigger moves the card exile → hand, and it is a hidden hand stub.
- **`d13-random-o0-b148-seat1`** (card 19, Agatha's Soul Cauldron):
  - 189: the dig.
  - 252: the alt appears; seat 1 controls the Watcher.
  - 352: the Watcher dies under seat 1 (battlefield → graveyard), and the alt is kept.
  - 411: the log ends with the card still in exile. No leave trigger was cast. `main` flags lines 440–449.
- **`d11-random-o3-b31-seat1`** (card 3, Exhibition Tidecaller):
  - 258: the dig.
  - 276: the alt appears; seat 1 controls the Watcher.
  - 369: the alt is kept with the Watcher gone.
  - 372: the card moves exile → hand.
- **The owner's view agrees** (`d0-random-o0-b67-seat0`, card 13). The owner sees the alt from the dig at seq 73, while
  seat 1 holds the Watcher (116–238), and after it.

So, in Forge, a player who has controlled the host keeps the look until the card leaves exile. It does not matter who
controls the host now, or whether it is still on the battlefield.

**The rules and the engine.** CR 702.75a, hideaway: the exiled card gains "Any player who has controlled the permanent
that exiled this card may look at this card in the exile zone." The pinned jar carries the same sentence. It is the
Description of the hideaway static, among the strings of `forge/game/card/CardFactoryUtil.class`:

    Mode$ Continuous | Affected$ Card.IsRemembered | MayLookAt$ EffectSourceController | EffectZone$ Command |
    AffectedZone$ Exile | Description$ Any player who has controlled the permanent that exiled this card may look at
    this card in the exile zone.

The Effect that carries the static is `DB$ Effect | StaticAbilities$ STHideawayEffectLookAtCard | ForgetOnMoved$ Exile |
RememberObjects$ Remembered | Duration$ Permanent`.

D502 read `EffectSourceController` alone, as "the current controller", and that part is right: each time the static
applies, it grants the look to the host's current controller. The "has controlled" half lives on the card.
`Card.addMayLookAt` (at the `forge-2.0.14` tag of `~/code/forge-src`, `Card.java:3801`) adds every player it is given
to `mayLookFaceDownExile` whenever the card is face down in exile. Nothing in the class removes a player from that
set. `updateMayLook` puts the set into `CardView`'s may-look players every time. `javap -p` on the pinned jar shows
the field (`private final PlayerCollection mayLookFaceDownExile`) and `addMayLookFaceDownExile`. The look ends when
the card moves. Every J183 log shows that: the card goes exile → hand, and in the next frame it is a hidden stub.

**Why D502 ended it.** D502 wrote its end rule from J182's `d1-random-o0-b76`. There the Watcher died under seat 0
(seq 245), and the alt was gone one frame later (seq 246). The alt went because the Watcher's leave trigger moved the
card to its owner's hand (`ForgetOnMoved`), not because control ended. That log could not tell the two apart. J183's
`d13-random-o0-b148` can: there the Watcher dies, no leave trigger moves the card, and the alt stays to the end of the
log.

**The rule after.** D502's admission is unchanged. A grant needs all of these:
- the dig from the owner's library into the owner's exile, in the host's entry frame or the next (never the log's first frame);
- the host's trigger `cast`, in the dig's frame or the one before;
- one dig per host, counted over every dig of the log;
- the viewer's take of the host from its owner, in the alt's frame or the one before;
- the viewer controlling the host in the frame the alt arrives.

D505 changes only how long the grant lasts. Once made, it is **kept while the card stays in exile, in consecutive state
frames that carry its alt, with no zone event naming it**. The grant no longer ends when control goes back to the
owner, passes to anyone else, or the host leaves the battlefield. Only a zone event naming the card ends it, or a
frame in which the card is not in exile with its alt. The one-frame lag at the start stays (`b76`'s take).

In the code, the held branch was `held !== undefined && !movedNow.has(c.id) && (viewerHolds(held.host) ||
held.holds)`. It is now `held !== undefined && !movedNow.has(c.id)`. `hideawayGrants` maps a card to its host alone;
the `holds` flag, which carried the one frame of grace, is gone. The failure message's last clause now reads "from
the frame the viewing seat took that permanent, kept while it stays in exile (hideaway, D502, D505)". The stats label
is unchanged: *an opponent's hideaway card, its exiling permanent's control taken by the viewer, D502*. It counts
each admission once, in the frame it arrives.

**What is still a failure.**
- Every admission failure of D502, unchanged. That covers: no take ever, a take of the viewer's own or a third
  owner's permanent, the alt two frames after the take, a card from a hand, a dig with no host trigger or beside
  another entry or the log's start, a host tied to two digs, and a card outside exile.
- An alt that first appears after the viewer has already given the permanent back
  (`a9-hideaway-alt-after-control-already-returned`). The viewer must hold the host in the frame the alt arrives.
- A card that moved, by any zone event naming it, whether the grant is held or kept. A card that comes back to exile
  carries no grant (`-held-grant-card-re-dug-in-one-frame`, `-held-grant-card-through-a-hand`, and the new
  `-kept-grant-card-through-a-hand` and `-alt-again-after-the-card-moved`).
- An alt back after a frame without it, with no new take (the new `-alt-back-after-a-gap-without-a-retake`). Forge
  never drops a look it keeps, so a gap means the grant is over.
- An alt after the host left the battlefield, with no take ever (the new `-alt-after-the-host-left-never-taken`).

**What J183 also shows, and D505 does not admit.** Four of the 17 logs still fail after this change. They fail D502's
*admission*, not its end, so the J183 triage's "D502's start conditions all hold" is true of 13 logs, not 17. Each needs its
own decision if it is to be admitted, and none is widened here:
- **`d5-random-o0-b119-seat1`** (card 37, Echo of Eons). The Watcher enters with its hideaway trigger's `cast` at seq
  140. The dig lands at seq 143, three state frames later, after the AI's choices. That is outside both D502 windows:
  the dig in the entry frame or the next, and the trigger's cast in the dig's frame or the one before. The alt
  appears at the take (seq 214), so its first frame fails (line 273).
- **`d6-random-o0-b33-seat1`** (card 9, Archmage's Charm). Entry at seq 546, the trigger's `cast` at 547, the dig at
  548: two frames after the entry. Point 2 fails.
- **`d6-random-o0-b20-seat1`** (card 17) and **`d6-random-o1-b147-seat1`** (card 37). The Watcher is flickered
  (battlefield → exile → battlefield, same id 2, in one frame). Its leave trigger and a fresh hideaway trigger dig a
  second card. The log's id 2 is then tied to two digs (three in `b20`), so D502's one-dig-per-host rule refuses
  both.

This lane counts these four, and the cube lab's follow-up 23 records them.

**Rejected alternatives.**
- **Ending the grant when the host leaves the battlefield, keeping it through a change of control.** This fails
  `d13-random-o0-b148` and `d11-random-o3-b100`, and Forge does not do it: `mayLookFaceDownExile` does not look at
  the host.
- **Keeping the grant across a frame without the alt.** Forge never drops the alt while the card stays in exile, so
  a gap followed by the alt again has no source the log shows. The mutant that keeps grants across gaps fails three
  controls.
- **Widening the admission windows in the same decision.** The four start-shape logs need different arguments (a
  hideaway that resolves over several snapshots, and a host re-entering as a new object under the same id). This lane
  was scoped to the end rule.

**Tests.** `tools/check-redaction-selftest.mjs`, generated by `tools/make-negative-fixtures.mjs`, now has 211 controls
(205 before). All are listed in `REQUIRED`, and every new PASS control is in `COUNTED`.
- **Changed level:** `a9-hideaway-alt-kept-after-control-returns` is now PASS, where it was a FAIL. Its fixture bytes
  are unchanged.
- **Rebuilt so they still probe what they were written for:** `-lag-frame-then-an-unrelated-steal` (`n3`) and
  `-lag-frame-then-a-steal-of-an-earlier-entry` (`n3b`). The alt drops in the frame the Watcher leaves, so the
  Watcher's grant is over before the unrelated steal brings the alt back. Without the drop, D505 would keep the
  Watcher's grant, and the control would pass for the wrong reason.
- **New PASS:**
  - `-alt-kept-while-returned-then-retaken` (`d0-…-b67`);
  - `-alt-kept-after-the-host-leaves` (`d13-…-b148`, `d11-…-b100`).
- **New FAIL:**
  - `-alt-again-after-the-card-moved`;
  - `-kept-grant-card-through-a-hand`;
  - `-alt-after-the-host-left-never-taken`;
  - `-alt-back-after-a-gap-without-a-retake`.
- **Byte-identical:** every other control regenerated byte-identical.

**Mutants.** Four mutants, each in place against the whole selftest. Each failed it:
- a held grant surviving a move (three controls);
- grants kept across a frame without the alt (three);
- D502's "only while the viewer holds it", with no grace (the PASS controls that keep a grant past a return or a death lose their count);
- any face-down exiled card of the opponent's admitted as kept (the counted PASS controls lose their count).

**Measured.** See *Evidence* below.

## Evidence

All logs were read in place, through `--empty-hand-ok` (the atlas's flag), by `main`'s checker (`3275af30`) and this
branch's, with `xargs -P 6`.

| logs | count | `main` (`3275af30`) | this branch |
|---|---:|---|---|
| J183 `b-s11-legacy-2524`, every seat-1 log | 4,175 | 17 FAIL (all this A9 message) | 4 FAIL (the four above, each at the alt's first frame) |
| J183 `b-s11-legacy-2524`, every seat-0 log | 4,175 | 0 FAIL | 0 FAIL |
| J183 `b-s06-peasant-2519`, 200 logs of both seats (`shuf -n 200`, a fixed random source) | 200 | 0 FAIL | 0 FAIL |
| J182 `b-s06-peasant-2506`, 200 logs of both seats, sampled the same way | 200 | 0 FAIL | 0 FAIL |
| J182's five D502 logs (`d1-random-o0-b148`, `-b47`, `-b76`, `d1-random-o1-b148`, `d2-random-o3-b20`, seat 0) | 5 | PASS | PASS, `1 an opponent's hideaway card` each |

The 13 J183 logs that now pass each show `1 an opponent's hideaway card` on the stats line. They are:
- `d0-random-o0-b67`, `d11-random-o3-b100`, `d11-random-o3-b31` and `d13-random-o0-b148`;
- `d5-random-o1-b106` and `d5-random-o1-b26`;
- `d6-random-o2-b17`, `d6-random-o2-b21`, `d6-random-o3-b17` and `d6-random-o3-b21`;
- `d7-random-o0-b26`, `d7-random-o2-b37` and `d9-random-o2-b36`.

`fixtures/games/*.jsonl` and `fixtures/synthetic/*.jsonl` (23 files, all PASS) print byte-for-byte what `main`'s checker
prints.

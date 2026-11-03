## D505 — Hideaway's look: kept while exiled, and tied by the trigger's resolution (amends D502)

*Branch `pc/d505-hideaway-look`, off main `3275af30` (D502–D504). D505 was reserved for this lane (`node tools/decisions.mjs
next` gave D505). Amends **D502** in rule A9 of `tools/check-redaction.mjs` in two parts: **part one**, the grant's end
(it lasts while the card stays in exile); **part two**, the grant's start (the dig is tied to its host by the hideaway
trigger's resolution and counted per entry of the host, not timed from the entry and counted per id). The bridge, the
wire and the protocol are unchanged.*

**2026-11-02**

**Context.** Lab night J183 ran its branch frame logs through the checker at `3275af30`. Seventeen seat-1 logs of unit
`b-s11-legacy-2524` failed rule A9, all with D502's message:

    face-down card N in exile is owned and controlled by player 0, not the viewing seat 1, yet carries an "alt" block
    naming it ... (hideaway, D502) (A9, D371)

Every one is the card under a Watcher for Tomorrow (card 2, player 0's). Its text: "Hideaway 4. When Watcher for
Tomorrow leaves the battlefield, put the exiled card into its owner's hand." Seat 1 took the Watcher from player 0, and
the alt appeared in that frame. What failed in 13 of the 17 is D502's end rule (part one); the other 4 fail D502's
admission (part two, below). That rule kept the
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

**Part one: the rule after.** A grant is made as part two says. Once made, it is **kept while the card stays in exile, in consecutive state
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

## Part two: the dig tied by its trigger's resolution, one dig per entry

**Context.** Part one, as first committed (`e4a3ddaf`), passed 13 of the 17. The other 4 failed at the alt's first
frame, because D502's tie from card to Watcher did not hold. The timelines, by state seq:
- **`d5-random-o0-b119-seat1`** (card 37, Echo of Eons):
  - 140: the Watcher enters, its spell `resolved`, and its hideaway trigger's `cast` (stack id 20761). Wan Shi Tong is
    cast on top of it.
  - 141–142: Wan Shi Tong and its trigger resolve.
  - 143: the dig 37 library → exile, then `resolved` naming card 2.
  - 214: seat 1 takes the Watcher, and the alt appears (line 273, `main`'s first complaint).
  - 265: the Watcher is back under player 0, alt kept. 382: it is gone. 384: 37 exile → hand.

  The dig is three state frames after the entry, outside D502's "entry frame or the next". The trigger's cast is
  three frames before the dig, outside D502's "dig's frame or the one before".
- **`d6-random-o0-b33-seat1`** (card 9, Archmage's Charm):
  - 546: the Watcher's spell cast, its entry and `resolved`.
  - 547: the hideaway trigger's `cast`.
  - 548: the dig, then `resolved` naming card 2.
  - 564: seat 1 takes it and the alt appears (line 704). The dig is two frames after the entry.
- **`d6-random-o1-b147-seat1`** (card 37, Echo of Eons):
  - 267: the Watcher enters with its trigger cast. 268: the dig of card 13, then `resolved`.
  - 276: the Watcher is flickered (battlefield → exile → battlefield, the same id 2, in one frame). Its leave trigger
    and a new hideaway trigger are cast, the dig of 37, then `resolved` 2. Later in the frame, 13 goes exile → hand and
    the leave trigger's `resolved` 2.
  - 288: seat 1 takes the Watcher and 37's alt appears (line 341).
  - 333: the Watcher is gone. 334: 37 exile → hand.

  Id 2 is tied to two digs (13 and 37), and D502's one-dig-per-host refused both.
- **`d6-random-o0-b20-seat1`** (cards 17 and 9):
  - 301–302: the Watcher enters and digs 37.
  - 311–315: it is flickered and digs 10. Its leave trigger returns 37.
  - 414: it is flickered again and digs 17 (`resolved` after the dig). At 416 its leave trigger returns 10.
  - 473: seat 1 takes it, and 17's alt appears (line 587).
  - 556: Phelia exiles the Watcher under seat 1, and 17 keeps its alt (part one).
  - 564: it returns under player 0, a new entry, with its hideaway `cast`. 565: the dig of 9, then `resolved` 2.
  - 595: seat 1 takes it again (Oko), and 9's alt appears beside 17's.
  - 646: the Watcher dies. 647: its leave trigger returns 9, and 17 stays in exile with its alt to the end.

  This one log shows both parts. Id 2 has five entries and five digs here.

**What the logs show of a hideaway's resolution.** A survey script, kept outside the repo, read every hideaway trigger
`cast` (its text begins "Hideaway") in the 8,350 logs of J183's `b-s11-legacy-2524` and the 8,750 of J182's
`b-s06-peasant-2506`. It found 2,373 and 3,148 hideaway casts, and for each it measured three things.
- **Entry to cast.** The trigger is cast in its host's entry frame or the next, every time (0 or 1 frame).
- **Cast to resolution.** A trigger cast in its host's entry frame resolves 0 to 10 state frames later (10 once, in
  J182 s06; 7 at most in s11). Other spells and triggers stack on top, and the AI's hideaway choice takes snapshots.
  A trigger cast in the frame after the entry resolves 0 to 3 frames later (3 three times, in s11; 2 at most in
  s06). No window from the entry alone can be both safe and tight.
- **Where the dig sits.** The survey paired each `resolved` with its host's newest open trigger cast, as the checker
  does: an `unstacked` with no `resolved` before it closes a countered cast. The dig landed in its `resolved`'s
  frame, before it in event order, in 2,147 of s11's 2,373 and 2,701 of s06's 3,148. It landed one state frame
  before, when the snapshot was cut between the two, in 209 and 437. No dig was near in 11 and 10: the trigger dug
  nothing. Six of s11's hideaway triggers were countered (`unstacked` alone).

  Before the review, a naive pairing (the first `resolved` naming the host after the cast) showed 7 apparent
  exceptions. These were hosts whose leave trigger resolved before their hideaway trigger (`d15-random-o1-b58`,
  `d0-random-o0-b21`, `d7-random-o1-b40`). With the stack's pairing they are ordinary.

Stack items carry an `id` equal to the cast's `stackId`, but they leave the listed stack a frame after `unstacked`.
So the `resolved` event, not the stack, is the evidence used.

**The rule after** (part two). A dig, the card's latest move from its owner P's library into P's exile, is the work of
one **entry** E of a permanent W owned by P when all of these hold:
1. **A trigger of E.** A `cast` event names W. W entered earlier in that frame's event order, or W is listed on the
   battlefield in the previous state frame (the third review's definition, unchanged). W's latest entry is that frame
   or the previous one. An entry is a zone event onto the battlefield, a flicker included, or W's first listing after a
   state without it, never in the log's first state frame. A creature spell's own `cast` comes before its entry, so
   it never counts. A `cast` naming a permanent that entered earlier than the frame before is never counted: an
   activation, a later trigger. A `cast` in the entry's frame or the next does count, whatever it is, even an
   activation. Only its `cast` text tells them apart, so point 2's bound is what limits it.
2. **That trigger's resolution.** A `resolved` event naming W closes W's newest open trigger cast (the stack resolves
   the newest first). It is that trigger's resolution when it is not `fizzled` (a fizzled trigger dug nothing) and
   comes within **RESOLVE_WITHIN** of the cast. That bound is 10 state frames for a cast in the entry's frame and 3
   for one in the next, the survey's longest.
   - A `resolved` with no cast open is nothing: a spell's own, or a late activation's.
   - An `unstacked` naming W with no `resolved` of W before it closes W's newest open cast with no resolution. The
     bridge writes `resolved N | unstacked N` for a resolution, and `unstacked` alone for a countered item. The pair
     may straddle a snapshot.
3. **The dig between them.** The trigger was cast before the dig (by frame, then event order). Its `resolved` follows
   the dig in event order in the dig's frame, or comes in the next state frame.
4. **One dig per entry.** Counted over every dig of the log, a card that has since left exile included, exactly one
   dig is tied to E. Ties are counted per entry (W and E's frame), not per id. A flicker is a new object with a new
   hideaway, so `d6-random-o0-b20`'s five entries vouch for one card each. Two digs tied to one entry (another dig just
   before the trigger's resolution) vouch for neither. Two hosts entering together are decided by the order of their
   resolutions:
   - **Both digs before both `resolved`s:** each entry is tied to both digs, and neither is admitted.
   - **In real stack order** (dig, `resolved` B, dig, `resolved` W): B, which resolved first, is tied to its own dig
     only, so B is admitted with its card (`-two-hosts-the-first-resolver-taken`). W's `resolved` follows both digs
     in its frame, so W is tied to two and refused. That refusal is conservative.

The rest of D502's admission is unchanged: the viewer's take of W from P in the alt's frame or the one before, and the
viewer controlling W in the frame the alt arrives. Part one's end rule is unchanged.

**What part two closes.** D502's admitted residual, "a host whose trigger digs nothing, and another dig the next
frame", now fails when the other dig comes after the trigger's `resolved`. That was its shape in the selftest
(`-dig-after-the-resolution`, and `-dig-after-the-resolution-in-one-frame` for the same frame). It stays admitted
only when the other dig lands just before the `resolved`, in its frame or the one before. The selftest keeps that
shape as `-residual-trigger-digs-nothing-another-dig-next`, a PASS control.

**Still admitted that the log cannot rule out.**
- The residual above.
- An activation of a permanent, cast in its entry's frame or the next, resolving within the bound right after an
  unrelated dig of its owner's library, when that permanent is then stolen. Before the review the window was
  unbounded (`x7`). The bound leaves this narrow case, and only the `cast` text could close it.
- Another enters-the-battlefield trigger of a permanent (not hideaway) resolving right after an unrelated dig of its
  owner's library, when that permanent is then stolen. The two triggers differ only in their `cast` text, an engine
  string the checker does not read (D502's and D504's reason).

**Refused, conservatively** (a false failure, recorded in PLAN.md's cube lab follow-up 23). These are a host's own
card that the checker cannot tell from another dig beside its trigger's resolution:
- **The second of two hosts that resolve in one frame** (the review's `x3b`).
- **A Watcher whose trigger resolves just after another permanent's trigger dug a card in that frame** (`x6`).

No J182 or J183 log meets either.

**The review of part two** (`f5fcf747`) found one admission hole and five smaller things, all fixed here.
- **A countered trigger stayed open.** The checker ignored `unstacked`. So a countered hideaway trigger's `cast`
  stayed open forever, and any later `resolved` of its host paired with it: an activation, the leave trigger, a
  reanimated spell's own. The unrelated dig just before that `resolved` became the entry's one dig. The review's
  `x1`, `x1b`, `x2` and `x8` passed on `f5fcf747` and fail on `main`; they fail again now.
- **An activation cast the frame after an entry counted, with no bound** (`x7`). It is now bounded, and point 1
  says so.
- **The two-hosts sentence was wrong** (`x3a`, `x3b`, `x6`), as corrected above.
- **The survey's 203 and 434 in the fixture generator** are now 209 and 437, the figures this file uses.
- **`tools/CLAUDE.md`'s "named again after a frame without its alt"** now says "with no new take". A new take
  re-admits (`-alt-dropped-while-returned`).
- **A fizzled `resolved` paired a dig.** It is ignored now (`-fizzled-trigger`).

**Rejected alternatives.**
- **Ending the grant when the host leaves the battlefield, keeping it through a change of control.** This fails
  `d13-random-o0-b148` and `d11-random-o3-b100`, and Forge does not do it: `mayLookFaceDownExile` does not look at
  the host.
- **Keeping the grant across a frame without the alt.** Forge never drops the alt while the card stays in exile, so
  a gap followed by the alt again has no source the log shows. The mutant that keeps grants across gaps fails three
  controls.
- **A wider window from the entry** (part two). The trigger resolves up to ten frames after its cast, so any window
  wide enough would tie by timing alone. The resolution is evidence that names the host; a window is not.
- **The trigger's stack item leaving the stack** as the evidence (part two). It leaves the listed stack a frame after
  `unstacked`, after the dig and the `resolved`, so it would need a window of its own. The `resolved` is direct.
- **Reading the `cast` text for "Hideaway"** (part two). It is an engine string. The checker does not read engine
  strings to admit a shape (D502, D504).
- **Ties per id** (part two). These fail every flicker: `d6-random-o0-b20` and `d6-random-o1-b147`, and the mutant
  run below.

**Tests.** `tools/check-redaction-selftest.mjs`, generated by `tools/make-negative-fixtures.mjs`, now has 232 controls
(205 on `main`). All are listed in `REQUIRED`, and every new PASS control is in `COUNTED`.
- **Every hideaway fixture regenerated with a `resolved`** after its dig. That covers `withHideaway`'s and the spec
  controls' trigger, and the host's own `resolved` where a probe has no trigger, so a probe still fails for its own
  reason, not for a missing resolution. No control outside hideaway changed a byte.
- **Part one.**
  - `a9-hideaway-alt-kept-after-control-returns` is now PASS, where it was a FAIL.
  - `-lag-frame-then-an-unrelated-steal` (`n3`) and `-lag-frame-then-a-steal-of-an-earlier-entry` (`n3b`) drop the
    alt when the Watcher leaves. So the Watcher's grant is over before the unrelated steal brings the alt back.
  - New PASS: `-alt-kept-while-returned-then-retaken` (`d0-…-b67`) and `-alt-kept-after-the-host-leaves`
    (`d13-…-b148`, `d11-…-b100`).
  - New FAIL: `-alt-again-after-the-card-moved`, `-kept-grant-card-through-a-hand`,
    `-alt-after-the-host-left-never-taken` and `-alt-back-after-a-gap-without-a-retake`.
- **Part two.**
  - Reshaped, verdict kept:
    - `-second-dig-beside-the-host-trigger` (FAIL): the second dig lands just before the trigger's `resolved`, so
      both digs tie to the one entry.
    - `-real-card-played-then-steal` (FAIL): the same, so its ties are still two.
    - `-residual-trigger-digs-nothing-another-dig-next` (PASS): the other dig lands just before the `resolved`. That
      is the residual's only remaining shape.
  - New PASS:
    - `-dig-two-frames-after-the-entry` (`d6-…-b33`);
    - `-dig-three-frames-after-the-entry` (`d5-…-b119`);
    - `-dig-a-frame-before-its-resolution` (the snapshot cut);
    - `-flickered-host-two-cards` (`d6-…-b20`; counted twice).
  - New FAIL:
    - `-dig-with-no-resolution` (timing alone);
    - `-two-digs-tied-to-one-entry`;
    - `-dig-after-the-resolution` (D502's residual shape, now closed);
    - `-dig-after-the-resolution-in-one-frame`;
    - `-dig-before-the-trigger-cast`.
- **The review of part two.**
  - New FAIL, the review's own fixtures, byte-identical to them:
    - `-countered-trigger-then-an-activation` (`x1`);
    - `-countered-trigger-take-much-later` (`x1b`);
    - `-countered-first-entry-then-a-flicker` (`x2`);
    - `-countered-trigger-host-dies-and-returns` (`x8`);
    - `-activation-the-frame-after-the-entry-resolved-late` (`x7`).
  - New FAIL, beside them: `-resolution-eleven-frames-after-the-cast` and `-fizzled-trigger`.
  - New PASS:
    - `-countered-first-entry-flicker-card-only` (`x2c`);
    - `-two-hosts-the-first-resolver-taken` (`x3a`);
    - `-resolution-ten-frames-after-the-cast`;
    - `-cast-the-frame-after-the-entry-resolved-three-later`;
    - `-resolved-and-unstacked-straddle-a-snapshot`.

    In the straddle control, the newer trigger's `unstacked` lands a snapshot after its `resolved`, and must not
    close the hideaway trigger beneath it.

**Mutants.** Each was applied in place against the whole selftest, then restored.
- **Part one:** four mutants, each failing the selftest:
  - a held grant surviving a move;
  - grants kept across a frame without the alt;
  - D502's "only while the viewer holds it";
  - any face-down exiled card of the opponent's admitted as kept.
- **Part two:** eight mutants. Each failed the selftest:
  - ties per id, not per entry (`-flickered-host-two-cards` loses its count);
  - a trigger's cast counted as its own resolution (`-dig-with-no-resolution` passes);
  - no next-frame resolution (`-dig-a-frame-before-its-resolution` fails);
  - a resolution a frame before the dig accepted too (`-dig-after-the-resolution` passes, and the flicker control
    loses its count);
  - the cast-before-the-dig condition dropped (`-dig-before-the-trigger-cast` passes);
  - the trigger cast's entry bound dropped (`-dig-beside-a-later-trigger-of-the-host` passes);
  - any `resolved` of the host taken as a resolution (four probes pass);
  - the `resolved` after the dig in event order no longer required, within one frame.

  The last one survived the first run. `-dig-after-the-resolution-in-one-frame` was added for it, and it now fails.
- **The review's fixes:** seven mutants. Each failed the selftest:
  - `unstacked` ignored again (`x1`, `x1b`, `x2`, `x8` pass);
  - every `unstacked` closing a cast, even one paired with a `resolved` (the straddle control loses its count);
  - a fizzled `resolved` counted (`-fizzled-trigger` passes);
  - no bound (`x7` and the eleven-frames probe pass);
  - one bound of 10 for both placings (`x7` passes);
  - a bound of 9 (the ten-frames control fails);
  - a bound of 2 for a cast the frame after the entry. This survived until `-cast-the-frame-after-the-entry-resolved-three-later` was added, and that control now fails under it.

**Measured.** See *Evidence* below.

## Evidence

All logs were read in place, through `--empty-hand-ok` (the atlas's flag), by `main`'s checker (`3275af30`) and this
branch's, with `xargs -P 6`.

| logs | count | `main` (`3275af30`) | part one (`e4a3ddaf`) | this branch (both parts) |
|---|---:|---|---|---|
| J183 `b-s11-legacy-2524`, every seat-1 log | 4,175 | 17 FAIL (all this A9 message) | 4 FAIL | 0 FAIL |
| J183 `b-s11-legacy-2524`, every seat-0 log | 4,175 | 0 FAIL | 0 FAIL | 0 FAIL |
| J183 `b-s06-peasant-2519`, 200 logs of both seats (`shuf -n 200`, a fixed random source) | 200 | 0 FAIL | 0 FAIL | 0 FAIL |
| J182 `b-s06-peasant-2506`, 200 logs of both seats, sampled the same way | 200 | 0 FAIL | 0 FAIL | 0 FAIL |
| J182's five D502 logs (`d1-random-o0-b148`, `-b47`, `-b76`, `d1-random-o1-b148`, `d2-random-o3-b20`, seat 0) | 5 | PASS | PASS | PASS, `1 an opponent's hideaway card` each |

All 17 J183 logs show the D502 count on their stats line. Sixteen show `1 an opponent's hideaway card`, and
`d6-random-o0-b20` shows `2` (cards 17 and 9, two entries).

`fixtures/games/*.jsonl` and `fixtures/synthetic/*.jsonl` (23 files, all PASS) print byte-for-byte what `main`'s checker
prints.

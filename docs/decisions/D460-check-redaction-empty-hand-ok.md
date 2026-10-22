## D460 — `check-redaction.mjs --empty-hand-ok`: "nothing was redacted" is a WARN only where the file proves the hand empty; the atlas passes it for branch logs

*Branch `pc/check-redaction-empty-hand`. `node tools/decisions.mjs next` gave D457 on 2026-10-22,
which PR #174 holds; D458 is left for the atlas lane working alongside this one, and D459 is PR #176's
(`pc/cubelab-watchdog-monotonic`), so this is D460.*

Amends **D451** (the move atlas's check step) and adds one flag to `tools/check-redaction.mjs`. The
checker's default behaviour is unchanged.

**2026-10-22**

**Context.** J148's summary, *The two problems*, (a): 24 of the atlas's branch frame logs failed the
checker. 16 seat-0 logs failed "not one card was redacted -- either the opponent never held a card, or
canBeShownTo is not being consulted", and the 8 seat-1 logs of the d40/d41 games failed its twin, "the
viewer never saw a named card in their own hand". Every one is a short branch played from a fork late in
the game. In those branches seat B's hand count is 0 in every state, its library ships `count` with
`cards: []`, and no seat-B card in hand or library appears in any frame of any type. In
`d23-forge-o0-b15` the one card B drew went library → hand → stack between two frames. There was
nothing to redact.

The two assertions are coverage checks, not leak checks. They guard a green run over a recording with
no hidden information in it. A blanket excuse on the atlas's side would check nothing. A broken
`canBeShownTo` would ship non-zero hand counts with full cards, and the file can show the difference.

**Decision.**

1. **`--empty-hand-ok` makes each assertion a WARN only when the file proves there was nothing to
   conceal.** It is the third exception after `--partial`'s skip and the pre-game WARN.
   - "Not one card was redacted": every state body shows every non-viewer seat's hand at `count: 0`
     with no cards, and every non-viewer `library.cards` as `[]` (absent does not count). No frame of
     any type, `ai` lines included, lists a card (an object with a numeric `id`) whose `zone` is `hand`
     or `library` and whose owner (`owner`, else `controller`) is not the viewer.
   - "The viewer never saw a named card": every state body shows the viewer's own hand at `count: 0`
     with no cards.
   - Each proof also needs at least one state and a numeric `seat` in the header.
   - Where the proof fails under the flag, the failure stays and says why, for example "--empty-hand-ok
     does not apply: another seat's hand is not empty at line 7".
2. **Every leak rule is untouched.** A full opponent card at count 1 still fails twice: on A4/A6, and on
   the coverage check, whose proof it spoils. A non-zero count with no stub fails on the
   count/`cards.length` rule and on the proof. An opponent `library.cards` entry fails on A3 and on the
   proof.
3. **The atlas passes the flag for `phaseB/frames/` (the branches) and for nothing else.**
   `censusplay.ts`'s `redactionCheck` gains a `flags` argument. Phase A's games and the baseline are
   checked exactly as before, and so is every other caller (census-play, census-replay, the gate). The
   flag is not in `check-all.sh`.

**Measured.** Over J148's d23, d25, d26, d40 and d41 branch logs (9,600 files, the folder
`var/lab-j142/atlas/phaseB/frames/` on the PC):
- 24 fail without the flag, exactly the summary's 24;
- under the flag all 24 pass with the D460 WARN, and none of the other 9,576 changes.

**Tests.** `tools/check-redaction-selftest.mjs` (gate step 12, CI) gains a section for the flag:
- each of the 85 corpus controls keeps its verdict and reason under the flag;
- variants of the baseline, built in memory, cover:
  - an opponent hand emptied in every state: a failure by default, a WARN under the flag;
  - the viewer-side twin of that case, with the same result;
  - and four negative controls that still fail under the flag, each naming why the proof does not
    hold: a full opponent card at count 1, a count of 1 with no stub, a listed opponent library card,
    and the viewer's hand at count 1 served as a stub.

`web/test/cubelab-atlas-redaction.test.ts` checks that `redactionCheck` passes the flag through, and
that a planted full card still fails.

**Not changed, and a follow-up: the fork's `turn: 0`.** 2,365 branch logs pass only as the checker's
pre-game WARN, because every state of theirs reads `turn: 0` (`d23-forge-o0-b15-seat0` opens with five
`0/MAIN2` states). The cause is in the bridge, not the checker:
- `Snap` writes `GameView.getTurn()`.
- The copy's view learns its turn only from `Game.updateTurnForView()`, which `PhaseHandler` calls when
  a turn begins (`advanceToNextPhase`, javap on the pinned jar).
- `GameCopier` sets the copy's turn through `PhaseHandler.devModeSet`, which does not.

So a copy's view says 0 until its first new turn, and a branch that ends inside the fork's turn never
leaves 0. The likely fix is one line in `bridge/src/mtgtable/ai/Atlas.java`'s `play`: call
`copy.updateTurnForView()` (public on 2.0.14) before the `SeatRecorder`s attach, on the game thread.
It is bridge Java, near hard rule 8's recorder, and it can only be shown on the engine, which this lane
did not run. So it is left for a lane that can run `atlas-selftest`. `Snap.java` is not the place.

**Rejected.**
- *Excuse every atlas branch log* (a blanket flag that skips the two checks): it would pass a branch
  whose emitter dropped the opponent's hand, the failure the checks exist for.
- *Excuse by hand count alone*: an opponent `library.cards` dumped as full cards must spoil the proof
  too, even though A3 fails it on its own.
- *Fix it in the atlas* by playing branches until seat B holds a card: that changes the measurement to
  satisfy a checker.

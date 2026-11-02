## D501 — `--empty-hand-ok`'s proof accepts the one library top card A3 vouches for; the hand side stays as strict as it was (amends D460)

*Branch `pc/d501`, off main `60177314` (#225, D497's merge). D501 was reserved for this lane by its parent session;
D498–D500 are parallel lanes. Amends **D460**'s proof (and keeps **D463**'s every-seat rule as it is) in
`tools/check-redaction.mjs`. The checker's default, without the flag, is unchanged.*

**2026-11-01**

**Context.** J181 (the lab's atlas night), spine `b-s07-legacy-2185`: three branch logs,
`phaseB/frames/d13-{random-o0,random-o1,random-o2}-b7-seat0.jsonl.gz`, failed the checker under the atlas's
`--empty-hand-ok` (the spine's `atlas.json` lists them first among its 51 failed frame logs):

```
! not one card was redacted -- either the opponent never held a card, or canBeShownTo is not being consulted
  (--empty-hand-ok does not apply: a card of another seat's hand or library is listed at line 3)
```

Nothing hidden was shown. Seat 1 (the opponent) has an empty hand in every state: it cast Force of Vigor by exiling
its other card, Garruk Wildspeaker, and the first frame shows Force of Vigor already on the stack. It controls Oracle of Mul Daya, which plays with the top card of its
library revealed. So every state lists that one top card in seat 1's `library.cards` (a Forest at line 3). Rule A3
(D315) already accepts that listing: the checker's own stats line reads
`library cards revealed=22 (22 an opponent's top card revealed by a permanent, A3)`, one per state. But D460's proof
was written before any revealer met an empty hand. It refuses any non-viewer `library.cards` that is not `[]`, and any
frame that lists a card in a hand or library the viewer does not own. That happens in two places:
- the per-state check;
- `listsOthersHiddenCard`'s scan of every frame.

So the proof refused a card that A3 had just called public.

**Decision.**

1. **A3's one exemption is one predicate, `revealedTopCard(p, isViewer, revealedTops)`.** It returns the single card of
   `p`'s `library.cards` that a top-revealing permanent vouches for, or null. The conditions: `p` is not the viewer,
   the list is exactly one card, and `revealedTopsOf` (D315's `REVEALS_OWN_TOP` / `REVEALS_EVERY_TOP`, the same
   state) holds `p`. A3's census now asks it, where it used to spell the condition inline, and so does the proof.
   The proof therefore cannot accept a library listing that A3 would not.
2. **The proof accepts exactly that card, and no other card.**
   - The per-state check counts a vouched library as a revealed top, not as a listing.
   - The every-frame scan skips that card **object** inside its own state frame. It skips the object itself, not its
     id, so the same card named anywhere else still spoils the proof: in an `ask` body, an `ai` line, or another
     state's hand.
   - When the proof holds and at least one state listed a vouched top card, the WARN says so: "the opponent's hand was
     empty in every state and its library listed only its revealed top card (A3)". It also counts those states
     (D501).
3. **The hand side is unchanged, on purpose.** Every non-viewer hand must be at `count: 0` with no cards in every
   state. The top card that a revealer showed buys no hand exemption. A3 gives it no A6 exemption either (D315).
   - If the opponent draws that top card and the bridge serves it full, the file fails A4/A6 and the proof.
   - If the drawn card is served as a stub, there is a redacted card, and the coverage assertion never fires.

   An empty hand is the whole claim of "nothing to conceal". A revealed top card is public, and widening the hand
   side would turn "public" into "probably fine".
4. **Nothing else moves.** Each of these still spoils the proof, with D460's own reason text:
   - a library card with no revealer;
   - a revealer controlled by the viewer;
   - two cards under a revealer.

   A3 fails each one on its own, as before. A file checked without `--empty-hand-ok` is checked exactly as before:
   A3's verdicts did not change, only its condition moved into the helper.

**Rejected.**

- **Relaxing A6, or giving the revealed top card a standing exemption.** The proof failed, not a leak rule. D315
  deliberately left the top card out of `everRevealed`, because it is public only while it is on top. Widening A6 would
  excuse that card after it leaves the top (drawn into the hand, for one), which is exactly the leak A6 exists to catch.
- **Teaching the atlas to skip the check for such logs**, or to drop `--empty-hand-ok`'s failures for a spine. That is
  D460's rejected "blanket excuse" again. The checker is the one that knows what A3 vouches for, so the fix belongs in
  the checker.
- **Accepting any one-card opponent library in the proof.** Without the revealer, one card is the smallest possible
  library dump, and A3 fails it. The proof must not be laxer than the rule it summarises.

**Measured.**

- The three J181 logs, `zcat <log> | node tools/check-redaction.mjs --empty-hand-ok /dev/stdin`:
  - on `main`, each FAILS with the reason above, exit 1;
  - on this branch, each PASSES with the D501 WARN (22, 24 and 21 states, each with the top card listed), exit 0;
  - without the flag, each still FAILS "not one card was redacted", exit 1.
- Every branch log of the night's 13 spines (106,600 files under `lab-j181/b-*/phaseB/frames/`), each checked under
  `--empty-hand-ok` by `main`'s checker and by this branch's:
  - 51 fail on `main` and 48 here;
  - exactly three verdicts change, the three logs above;
  - the other 48 are all in s07 and all fail A6 the same way on both checkers ("a FULL card … "Currency Converter" in
    their hand, and nothing earlier in this log ever revealed" it). That is a separate shape, and this decision leaves it
    alone.

**Tests.** `tools/check-redaction-selftest.mjs`'s `--empty-hand-ok` section builds variants of the baseline in memory,
as D460's do. The new variants are the s07 shape: the opponent's hand empty in every state, Oracle of Mul Daya on
their battlefield, and one top card in their `library.cards`.
- The s07 shape itself fails by default. Under the flag it is a WARN, with the D501 text and A3 counting the top card
  in every state.
- Four controls still fail under the flag, each for its reason:
  - a full card in their hand at count 1 (the last top card, drawn and served full), which also fails the leak rule;
  - the same library card with no revealer;
  - the same library card with the revealer on the viewer's side;
  - two cards under their revealer.

Each control also fails A3's own "full card(s) in library.cards", or for the hand case the "not marked hidden" leak.
Every corpus control keeps its verdict under the flag, and every committed recording cut at every line still passes
`--partial`. Two mutations of the checker were each caught:
- accepting any non-viewer library listing, in both the per-state check and the frame scan (three controls fail);
- dropping the frame scan's skip (the s07 shape fails under the flag at line 3, as on `main`).

**What it does not do.** The vouched top card named in a frame other than its own state's library still refuses the
proof (point 2). No log has met that shape, and an `ask` that offers an opponent's library top is a reveal, not an
empty hand. D498's re-run reported seven logs of this shape on its own deal. That is a parallel lane, and its logs
were not run here.

## D504 — The M55 audit accepts an opponent's spell cast from its hand between frames, which a decision targets on the stack (amends D481's rule, and D347's audit as D481–D503 amended it)

*Branch `pc/d502-checker-shapes`, off main `ac07876b` (#226). Reserved for this lane with D502 and D503. Amends **D481**'s
second shape ("a card moved from the viewer's own hand onto the stack") in `tools/check-redaction.mjs`. The bridge is
unchanged.*

**2026-11-02**

**Context.** The eleventh of J182's failing branch logs (see **D502**) is
`/home/justin-a/code/lab/data/lab-j182/b-s04-powered-2504/phaseB/frames/d0-random-o1-b3-seat0.jsonl.gz`. It failed with:

    decision 93 names card 48 (target:48), which its state frame does not show seat 0 -- a stub's id, a library card
    or another seat's hidden card is never an option (M55, D347)

What the log shows:
- **The decision's state.** State seq 415 (line 511) is turn 26's MAIN2, player 1's turn. Card 48 is a five-key stub
  in player 1's hand, and seat 0's hand holds Force of Negation (13).
- **Two decisions name seq 415.** Priority decision 92 (line 512) is `pass` or `cast:13`, and the answer is `cast:13`.
  Decision 93 (line 513) is its target record: `kind: target`, `parent: 92`, `source: targets`, `complete: false`.
  Its only option and its answer are `target:48`.
- **The first state after the decision.** Seq 416 (line 514) carries, in order:
  - zone 48 `{hand, 1}` → `{stack, null}`;
  - player 1's mana taps;
  - `cast` {cardId 48, controller 1, "Kormus Bell"};
  - zone 13 `{hand, 0}` → `{stack, null}`;
  - the pitched card's exile;
  - `cast` {cardId 13, controller 0, "Force of Negation (13) - Counter target noncreature spell. ..."}.
- **The counter resolves.** Seq 417 moves 48 from the stack into player 1's exile, face up and listed by name.

**The cause.** Player 1 cast Kormus Bell. Seat 0 got priority with the Bell on the stack and countered it. But the
recorder held the batch that moved the Bell (`MidMove.hold`, as D481 and D496 describe), so both decisions name the
last state written, from before the cast. In that state, the card the seat targets is still the opponent's hidden
hand card. A cast spell is public: it is on the stack, face up, and the `cast` event is the bridge's public record of
it. Nothing leaked.

**The rule before (D481).** A card id that no state the decision can use lists was accepted when its latest zone move in
the window (the state frames up to and including the first one after the decision) took it from the **viewer's own**
hand onto the stack. Another seat's hand was refused, because "it can be cast face down". That is the control
`m55-option-cast-from-the-opponent-hand`: a fresh id, moved from the opponent's hand onto the stack, with no cast event.

**The rule after.** After every older rule has declined an id, it is also accepted when ALL of these hold:
1. **The decision's own state frame lists the id as a stub in another seat's hand** (seat H, not the viewer). That is
   where it was when the batch was held.
2. **Its latest move moved it from that hand onto the stack, in the window.** The move skips a `to: null` and runs
   from `{hand, H}` onto the stack. It sits in a state after the decision's state frame, and no later than the first
   state after the decision.
3. **A `cast` event names it as its `cardId`,** by a player of the game, in that same state or a later one up to the
   first state after the decision. The cast is what makes the card public. A morph cast face down is public as a
   face-down spell, with its id and no name, which is what `Snap.card` already serves.
4. **Neither the state after the decision's state nor the first state after the decision lists it as a stub.**

The stats line counts such ids: `M55 decision ids entered between frames, an opponent's cast=<n> (D504: ...)`. That
count is never a WARN. D481's own shape, and its counter, are unchanged.

**The authority.** The bridge's own gate at decision time is `Decisions.visible` (**D347**), which names a stack card,
and it is unchanged. The log cannot order the ask against the engine's moves inside a held batch. That the Bell was on
the stack when seat 0 was asked rests on that gate, exactly as for D481, D485, D495, D496 and D503.

**What is still rejected.**
- A hand card moved:
  - into a library, or into exile, with no cast;
  - into exile even with a cast event naming it. A `cast` event also names an ability's source card, written ungated
    (D495).
- A move onto the stack:
  - with no cast event;
  - from another zone (a graveyard), even with a cast;
  - whose cast comes a state after the window;
  - and cast, both a state too late.
- A cast whose card the state after the decision still lists as a stub.
- An id the decision's state never listed as that hand's stub, even though it was moved onto the stack and cast. This
  is not this shape's evidence.
- D481's `m55-option-cast-from-the-opponent-hand` (no stub, no cast), unchanged.

**Rejected alternatives.**
- **Accepting any id with a `cast` event in the window.** That is D495's ground for a copy, and D495's guards exist
  precisely because a cast event can name a hidden card (an ability activated from a hand). The stub in the hand plus
  the hand → stack move is what ties this cast to a spell.
- **Flushing a frame before the decision.** That would mean a bridge change and a new frame in every recording. D481
  rejected it for the same reason: the hold exists so that no frame is cut mid-update.
- **Reading the `cast` text ("Kormus Bell").** An engine string is not evidence the checker can use, and D3 never reads
  one.

**Tests.** These are new controls from `tools/make-negative-fixtures.mjs`, all in `REQUIRED`. The decision is a target
record at the first state naming the opponent's first hand stub, and the later states no longer list the stub.
- **PASS:** `m55-option-cast-from-the-opponent-hand-held` (the J182 shape: the move and the cast in the first state
  after the decision), with the D504 count on its stats line.
- **FAIL:**
  - `m55-option-opponent-hand-to-library-no-cast`;
  - `-hand-to-exile-no-cast`;
  - `-hand-to-exile-with-a-cast`;
  - `-hand-to-stack-no-cast`;
  - `-cast-from-another-zone`;
  - `-cast-never-a-stub`;
  - `-cast-still-a-stub-after`;
  - `-cast-event-a-state-too-late`;
  - `-cast-a-state-too-late`.

**Mutants.** Each mutant ran in a scratch copy against the whole selftest, and each of these failed it:
- the stub-after check removed;
- the destination not required to be the stack;
- the from zone not required to be that hand;
- no cast needed;
- the cast at any time;
- the rule off.

Some guards are each implied by another, so they survive when removed alone:
- **The stub requirement is enforced twice:** by its own line, and by "from the hand the stub was in". Removing both
  passes `-cast-never-a-stub`.
- **The viewer's hand excluded** (its cards are never stubs).
- **The move after the decision's state**, implied by the stub in that state.
- **The move window's upper bound**, implied by the cast window, which must start at the move.

## Evidence (D502, D503 and D504)

**The 11 J182 logs.** Each was decompressed into the session scratchpad and never modified. Each was checked by `main`'s
checker (`ac07876b`) and by this branch's, with the atlas's `--empty-hand-ok`:

| spine | logs | shape | `main` | this branch | the stats line's new count |
|---|---:|---|---|---|---|
| `b-s04-powered-2504` | 1 | D504 | FAIL (decision 93, card 48) | PASS | `entered between frames, an opponent's cast=2` |
| `b-s06-peasant-2506` | 5 | D502 | FAIL (A9 on every state frame the alt is on: 16, 129, 54, 89 and 102 complaints) | PASS | `alt blocks=… (1 an opponent's hideaway card, …, D502)` in each |
| `b-s10-peasant-2510` | 5 | D503 | FAIL (one decision each, card 103) | PASS | `ceased to exist, another seat's token=2` in three, `=1` in two |
| **all** | **11** | | **11 FAIL** | **11 PASS** | |

- **What the counts mean.** D503's and D504's counts are per token. An id that is both an option and the answer is
  counted twice, as D481 counts it. `d12-random-o0-b5` and `d12-random-o1-b5` chose another option.
- **Without `--empty-hand-ok`** the 11 also pass, exit 0.
- **No WARN.** No line of any of the 11 outputs is a WARN.

**The committed recordings.** `node tools/check-redaction.mjs fixtures/games/*.jsonl fixtures/synthetic/*.jsonl` (23
files, all PASS) prints byte-for-byte what `main`'s checker prints.

**The selftest.** `node tools/check-redaction-selftest.mjs`: OK, **198 controls** (149 on `main`, plus 49 new: D502
26, D503 13, D504 10). The
`--partial` and `--empty-hand-ok` sections hold every control to the same verdict.
- **Every existing control regenerated byte-identical.** One manifest entry changed level: `stale-token-of-the-opponent`,
  FAIL to PASS (D503).
- **The new `COUNTED` list** requires every new PASS control to show its own rule's count.

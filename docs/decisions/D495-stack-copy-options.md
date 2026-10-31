## D495 — The M55 audit accepts a spell copy on the stack: a `cast` event vouches for an object no zone ever holds (amends D347's audit, D481 and D485; cites D491)

*Branch `pc/d495-spell-copies`, on origin/main `9c4737e9` (#220, D492). D495 was reserved for this lane (D493 and D494 are
two other lanes'). Amends the M55 / **D347** decision audit in `tools/check-redaction.mjs` ("a stub's id, a library card or
another seat's hidden card is never an option") as **D481** and **D485** amended it. **D491** is the precedent: an object
born and gone inside one engine step is in no state frame, and the checks accept the viewer's own such object without
weakening the leak rule.*

**2026-10-31**

**Context.** J176 (the atlas, night three), spine s09 (pauper, spine seed 2135, `b-s09-pauper-2135`), ended its checks with
one problem: **48 of its 5,700 branch frame logs failed `tools/check-redaction.mjs`**, every one on the same message and
nothing else, 60 flagged options in all. The first, `phaseB/frames/d1-random-o0-b6-seat1.jsonl.gz` line 405:

    decision 65 names card 96 (target:96), which its state frame does not show seat 1 -- a stub's id, a library card or
    another seat's hidden card is never an option (M55, D347)

What happened, read from that log. Seat 1 cast Lose Focus (card 48) with replicate; state seq 337 carries its zone event
`{hand, 1}` → `{stack, null}`, `cast` {stackId 3306, cardId 48} and `cast` {stackId 3307, cardId 48, "Copy Lose Focus for
each time you paid its replicate cost."}. The replicate trigger made two copies, cards 96 and 97, and each chooses its own
targets **before** it is put on the stack: decision 64 (state 337) is copy 96's target, `target:15` (Frantic Search) or
`target:48`; decision 65 (state 338, whose `events` is empty) is copy 97's, `target:15`, `target:48` or `target:96`. The next
state frame, seq 339, carries `cast` {stackId 3309, cardId 97, controller 1, "Lose Focus (97) - Counter Frantic Search (15)
unless ..."}, `cast` {stackId 3308, cardId 96, controller 1, text ""} and `resolved` {cardId 96}. **No state frame of the
log ever names 96 or 97 as a card**: a copy is made on the stack, not moved there, so no zone list, no `stackCards` entry and
no zone event ever holds it. Nothing leaked: 96 is the viewer's own copy of the viewer's own spell, on the stack, which is
public. The audit failed it because its only vouching sources were the state frames' cards (D3), D481's zone events and
D485's own-token listings, and a copy is in none of them.

**All 48 are this shape** (a script over the 60 flagged options, reading the logs only): in every one the flagged id is
named by a `cast` event whose controller is the viewing seat (seat 1 in all 48), in the first state after the decision that
records any event; no zone event in the whole log names it; no state frame lists it in any zone, as a stub, or in
`stackCards`. Every one is a target decision of a copy naming another copy, and in all 60 the spell replicated is Lose
Focus, its original among the options. In 8 of the 60 the copy's `cast` is not in the first state after the decision but the
second: with three copies, the recorder flushes a state before each copy's decision and those states record no event
(J176's `d10-random-o2-b36-seat1`: copies 135, 136, 137; decisions at seqs 302 and 303, both empty; the casts at 304).

**Decision.** A decision option's card id that D3, D481 and D485 do not vouch for is also accepted, and counted (the stats
line's new `M55 decision ids that are spell copies on the stack=<n>`), when it is a **spell copy on the stack**:

1. a `cast` event names it as `cardId`, by a player of the game, in a state frame from the first one to `copyEnd` -- **the
   first state after the decision's line that records any event**, i.e. the engine's next step. A state the recorder
   flushed with `events: []` is not a step, so the window passes over it; this is wider than D481's window (the first state
   after the decision) only across empty states;
2. over the **whole log**, no state frame lists it as a stub;
3. no state frame **before the one carrying its cast** lists it at all (it was a card in a zone, not a copy);
4. every zone event naming it, anywhere in the log, goes from and to only the stack, a battlefield, a graveyard or nowhere
   (`null`) -- a copy of a permanent spell resolves into a token, `{stack}` → `{battlefield}`, and that stays public;
5. no `unstacked` event took it off the stack in or before the decision's own state frame (a copy already gone is not a
   target).

**Either seat's cast vouches.** The rule is about hidden cards, and a copy on the stack is never hidden: the stack is a
public zone (Forge's `canBeShownTo` is true for it unconditionally, hard rule 8), a copy has no face-down state and came
from no hand or library, and the `cast` event is the bridge's own public record that the item is on the stack for both
seats. So `target:<the opponent's copy>` -- a counterspell aimed at a copy of the opponent's spell -- is a legal option the
viewer can see, and the audit accepts it. Guards 2-4 are what keep the opponent's half tight, because the `cast` event's
`cardId` is not itself gated (`Snap.event`: an id that resolves against no zone is a card the viewer may not see): an
ability whose source is a card in the opponent's hand (ninjutsu's shape) names a stub (guard 2); a card cast from a hand
or a library has a zone event from that zone (guard 4).

**What stays rejected.** An id with no `cast` event (as today); a `cast` only after the window; an id any state lists as a
stub; an id listed in a zone before its cast; an id any zone event moves from or into a hand, a library, exile or the
command zone (so an id with a cast and a later move into the opponent's hand fails); a copy taken off the stack before the
decision. The bridge's own gate at decision time (`Decisions.visible`) is unchanged; this is the post-game checker learning
one more public object, like D481 and D485.

**`--partial`.** A served prefix may end after the decision's empty states and before the copy's cast, so the failure is
curable (undecided under `--partial`) while `copyEnd` is not in the prefix, as it already was while the next state frame was
not.

**The rows check (D480, D491) needs no change.** `tools/cubelab/rowscheck.ts`'s rows are priority, attack and block
decisions only (its token grammar, `TOKEN`, has no `target:`; J176 s09's rows are 64,906 `p`, 31,844 `a` and 13,390 `b`),
and a copy is never castable, activatable, an attacker or a blocker, so no row can name one; the atlas's rows check passed
s09 (107,332 rows). Mirroring the acceptance there would be a rule nothing can exercise.

**Tests.** The checker's controls, as D481's and D485's are: nine new files in `fixtures/negative/redaction/`, built by
`tools/make-negative-fixtures.mjs` and named in `tools/check-redaction-selftest.mjs`'s `REQUIRED` (gate step 12, CI):

- pass: `stack-copy-cast-by-the-viewer` (the s09 shape, a target decision naming the viewer's copy, cast in the next
  state); `stack-copy-cast-by-the-opponent` (the same, the opponent's copy); `stack-copy-cast-after-empty-states` (the
  three-copy shape: the first state after the decision is empty, the cast in the second); `stack-copy-resolves-into-a-token`;
- fail: `stack-copy-cast-a-step-too-late` (the first state after the decision records an event, the cast is in the
  second); `stack-copy-then-into-the-opponent-hand`; `stack-copy-is-an-opponent-hand-stub` (the opponent's cast naming
  its own concealed hand card); `stack-copy-is-a-card-from-a-library`; `stack-copy-already-off-the-stack`. The same id with
  no `cast` event is the existing `m55-option-never-shown`, which still fails.

Each guard was removed in turn in a scratch copy of the checker and its control flipped to PASS (the window widened to the
whole log, guard 2-3, guard 4, guard 5), and narrowing the window to D481's flipped the three-copy control to FAIL.

**Measured.** Both checkers, `main`'s (`9c4737e9`) and this branch's, over every branch frame log of J176's thirteen
spines (`/home/justin-a/code/lab/data/lab-j176/b-s*/phaseB/frames/*.jsonl.gz`, read only), with the atlas's own
`--empty-hand-ok` (D460), 91,590 logs in all:

| spine | logs | `main` fails | this branch fails | spell copies accepted (logs) |
|---|---:|---:|---:|---:|
| s01 pauper | 15,320 | 0 | 0 | 0 |
| s02 peasant | 7,200 | 0 | 0 | 0 |
| s03 legacy | 200 | 0 | 0 | 0 |
| s04 powered | 5,400 | 0 | 0 | 0 |
| s05 pauper | 7,550 | 0 | 0 | 0 |
| s06 peasant | 4,000 | 0 | 0 | 0 |
| s07 legacy | 9,490 | 0 | 0 | 0 |
| s08 powered | 8,700 | 0 | 0 | 0 |
| **s09 pauper** | 5,700 | **48** | **0** | **60 (48)** |
| s10 peasant | 3,100 | 0 | 0 | 0 |
| s11 legacy | 5,700 | 0 | 0 | 0 |
| s12 powered | 5,450 | 0 | 0 | 0 |
| s13 pauper | 13,780 | 0 | 0 | 0 |

On every spine every other line of the two outputs is identical (the per-file stats, sorted, with the failing lines and the
new count line set aside), so the rule changed nothing but the 60 options it was written for, and it accepted nothing
anywhere else. `node tools/check-redaction.mjs fixtures/games/*.jsonl` passes its 22 recordings, and the self-test passes
its 135 controls.

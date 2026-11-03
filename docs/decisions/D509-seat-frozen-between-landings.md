## D509 — The atlas seat is frozen between landings: a fault that would change what the seat plays waits in a queue, and the queue lands as one population boundary (amends D489's *Comparability*)

*Branch `pc/d509-seat-freeze`, off main `e557dedf` (D508's merge). `node tools/decisions.mjs next` printed D509. A
policy, not code: nothing under `bridge/src`, `tools/` or `web/` changes, so J186's population
(`random-<band>-d508`) continues under it.*

**2026-11-03**

**Context.** D489's *Comparability* rule: a night's labels pool only with nights on the same seat, and "a change to
the seat or to what it offers" opens a new population. The rule is right — a label is a statement about the plays
one seat offered and how it ranked them — but every morning since it was written has applied it. The atlas's nine
nights under contract v6 split five ways: D488 (J176: 147 rows, 30 confident), D493 (J177 and J180: 344 / 54),
D497 (J181: 153 / 23), D498 (J182 and J183: 359 / 56) and D507 (J185: 187 / 20), each opened by a fix to the seat's
gate, its copier or its determinizer that the previous night's read had found. The largest pool is 56 confident
labels; no population has lasted more than two nights; at 20–30 confident labels a night, a pool of a thousand is
twenty to forty nights of one unchanged seat. The owner, asked on 2026-11-03 whether to keep fixing every seat
fault the morning it appears or to let a population run, chose to let it run ("feel free to make the modest
change").

**Decision.**

1. **The seat is frozen while a population runs.** From J186 on, a night is derived from the previous night on the
   same pin unless the queue (point 3) lands. `bridge/src/mtgtable/ai/`, `tools/cubelab/` and
   `fixtures/cubelab/seat-identity.json` do not change on `main` between landings; a lane that would change them
   waits on its branch, reviewed, with its night's evidence, until the landing.
2. **What may still change between landings** is anything that leaves the seat's plays and its listings as they are,
   and D489 already names it: the cut design, the recorder, the night's metrics and checks, and the checker
   (`tools/check-redaction.mjs`), whose admitted shapes read a recording and offer nothing to the seat (D502–D505's
   precedent: the checker is not the seat or the fork). A fault that only excludes a unit is excluded by the checker,
   as it is now, and the unit's labels are left out of the pool; the seat is not changed for it. A fault that would
   change the seat's plays broadly — a listing, a target gate, the copier, the determinizer, a visibility rule — is
   queued.
3. **The queue** is `pc-results/study/seat-queue.md`: one row a fault, with its night, its unit, the lane that holds
   its fix (branch and commit, reviewed by a skeptic as any lane is) and what it changes. The queue lands when the
   owner and the PC session decide, together, that it should — every few weeks as the rule of thumb, sooner when a
   queued fault is corrupting labels rather than excluding them, and never on a night's read alone. A landing is one
   merge, one gate, one push and one new population; the next night's derivation renames the pool and resets
   `randomSeat`, as D493's and D507's did.
4. **What this does not change.** D489's rule is unchanged: the pools stay split by seat and nothing is ever pooled
   across a landing. The nightly read is unchanged: every fault is still diagnosed the morning it appears, written up
   in the night's evidence and fixed on a lane; only the merge waits. The decks are unchanged: a population is a seat
   version, never a card set — the random library draws keep covering every band, and no subset of cards or decks is
   introduced by this decision.

**The queue at this decision.** One entry: the cube lab's follow-up 30 (`Explorer.entity`'s `scorable` reads a
last-known copy's saved zone; a change to what the seat offers). Follow-ups 29 and 31 are the board's and the frame's,
not the seat's, and may land between landings.

**Rejected.** *A smaller card set to measure sooner* — a population is defined by the seat, not the cards; narrowing
the decks would make the labels a statement about that subset without making the pools any larger per night.
*Fixing every fault as now* — correct per fault, and the cause of the five populations above. *A fixed landing
calendar* — a date would land a queue of nothing, or hold a corrupting fault past when it should land; the owner's
call, with the rule of thumb, is the better clock.

## D509 — The atlas seat is frozen between landings: a fault that would change what the seat plays or offers waits in a queue, and the queue lands as one population boundary (amends when a population opens; D489's pooling rule is unchanged)

*Branch `pc/d509-seat-freeze`, off main `e557dedf` (D508's merge). `node tools/decisions.mjs next` printed D509. A
policy, not code: nothing under `bridge/src`, `tools/` or `web/` changes, so J186's population
(`random-<band>-d508`) continues under it. Reviewed by a skeptic before the merge; findings 1–12 of that review
are in this text.*

**2026-11-03**

**Context.** D489's *Comparability* rule: a night's labels pool only with nights on the same seat, and "a change to
the seat or to what it offers" opens a new population. The rule is right — a label is a statement about the plays
one seat offered and how it ranked them — but every read since it was written has applied it. The atlas's seven
labelled nights under contract v6 (J178, J179 and J184 produced no labels) split five ways: D488 (J176: 147 rows, 30
confident), D493 (J177 and J180: 344 / 54), D497 (J181: 153 / 23), D498 (J182 and J183: 359 / 56) and D507 (J185:
187 / 20), each opened by a fix to the seat's gate, its copier or its determinizer that the previous night's read
had found (the rows and the confident counts are each night's `report/labels.jsonl`, `complete` and `regretLo > 0`).
The largest pool is 56 confident labels; no population has lasted more than two nights; at 20–30 confident labels a
night, a pool of a thousand is thirty-three to fifty nights of one unchanged seat. The owner, asked on 2026-11-03
whether to keep fixing every seat fault the morning it appears or to let a population run, chose to let it run
("feel free to make the modest change").

**Decision.**

1. **The seat is frozen while a population runs.** Between landings each night's pin is `main`'s head, as now, and
   `git diff <the population's opening pin> <the pin> -- <the frozen paths>` is empty; the derivation's `seat_code`
   check (`derive-j186.py`'s pattern) is what enforces it, and a night whose pin fails it is not posted. The frozen
   paths are **`bridge/src`** (any file — a lane that changes one and would land between landings writes the
   argument that the seat's plays and listings are unchanged, with `fixtures/cubelab/seat-identity.json` and the
   bench unchanged as its evidence; D496's recorder and D499's rows are the precedents, J180 stayed in D493's
   population), **`tools/cubelab/CubeLab.java`** (it builds the seats and the atlas units),
   **`fixtures/cubelab/seat-identity.json`**, **`forge-home/`** and the engine (D109). A lane that would change
   them waits on its branch, reviewed by a skeptic as any lane is, with the evidence from the night that found the
   fault and its bench or self-test, until the landing.
2. **What still lands between landings** is anything that leaves the seat's plays and its listings as they are.
   D489 names the cut design (`tools/cubelab/atlascuts.ts`); the precedents name the rest: the recorder (D496, J180
   stayed in its population), the checker (`tools/check-redaction.mjs`; D502–D504, J183 stayed in its population),
   and the night's checks, metrics and report (`atlaschecks.ts`, `atlaschecks-worker.ts`, `rowscheck.ts`, the
   report). A listing on `tools/cubelab/engine-unplayable.json` (D482 and D492's rule) changes the draw, not the
   seat, and lands between landings (J176 ran on D490's listing inside D488's population); D506's hang shape is why
   it must not wait weeks. A fault that only excludes a unit is excluded by the checker, as it is now, and the seat
   is not changed for it. A fault that would change the seat's plays or what it offers — a listing, a target gate,
   the copier, the determinizer, a visibility rule, the record the seat's gate mirrors — is queued.
3. **The queue** is `~/code/pc-results/study/seat-queue.md` (committed in pc-results): one row a fault, with its
   night, its unit, what it changes, its lane (branch and commit once one exists; `not started` until then) and its
   status. The queue lands when the owner and the PC session decide, together, that it should — every few weeks as
   the rule of thumb, sooner when a queued fault is corrupting labels rather than excluding them, and never on a
   night's read alone. **A landing has a decision of its own**: one merge, one gate, one push and one new
   population named after that decision, `random-<band>-d<n>` with `randomSeat` `D<n>`; the queued lanes' decisions
   defer to it, where D493's and D507's each named a pool after themselves.
4. **A hidden-information fault in the seat's record** (D507's and D508's shape: the record names a card the seat
   may not see) is corrupting, not excluding: the checker never admits it (D507) and the night fails
   `atlas.problems` on the unit it hits until a landing. The derivation carries it as a known failure, named in the
   job file, and **no mechanism drops a failing unit's rows from a pool today** — a reader pooling labels leaves out
   the units whose night failed `atlas.problems` on them, by the job files' names — so such a fault is the first
   reason to land sooner.
5. **What this does not change.** D489's pooling rule is unchanged: the pools stay split by seat and nothing is ever
   pooled across a landing. The nightly read is unchanged: every fault is still diagnosed the morning it appears,
   written up in the night's evidence and fixed on a lane; only the merge waits. The decks are unchanged: a
   population is a seat version, never a card set — the random library draws keep covering every band, and no subset
   of cards or decks is introduced by this decision.

**The queue at this decision.** The cube lab's follow-ups **27** (D466's put-back misses a refusal paid on a copy;
changes plays), **28** (a ghost stays out of its owner's game; it touches a Forge seat's play and is the owner's call,
so it is queued as *awaiting the owner's call*), **30** (`Explorer.entity`'s `scorable` reads a last-known copy's saved
zone; a change to what the seat offers) and **31** (`stackCards` names a card the frame stubs in a hand: the seat's
`Decisions.entityToken` mirrors that frame on purpose, D508, so a fix that stubs the host would leave the frozen seat
recording an id the frame no longer lists and fail the checker every night; it lands only with a matching change to
`Decisions`, which is a seat change). Follow-up **29** is `WireGuiGame`'s human ask, which `SeatRecorder` never
uses, and may land between landings.

**Rejected.** *A smaller card set to measure sooner* — a population is defined by the seat, not the cards; narrowing
the decks would make the labels a statement about that subset without making the pools any larger per night.
*Fixing every fault as now* — correct per fault, and the cause of the five populations above. *A fixed landing
calendar* — a date would land a queue of nothing, or hold a corrupting fault past when it should land; the owner's
call, with the rule of thumb, is the better clock. *Freezing `bridge/src/mtgtable/ai/` and `tools/cubelab/` as
directories* (this text's first draft) — the recorder, the cut design and the checks live there and D489 lets them
change; the frozen set is the seat, named by what it does.

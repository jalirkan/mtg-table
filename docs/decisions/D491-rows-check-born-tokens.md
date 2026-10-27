## D491 — The rows' id check accepts the viewer's own token born between frames, as the redaction checker has since D481 (amends D480's id check)

*Branch `pc/d490-chain-of-smog`, on origin/main `8e6a3a1e`. `node tools/decisions.mjs next` gave D490 for the list; this is
D491. Amends the id check of **D480** (`tools/cubelab/rowscheck.ts`, `checkGameIds`: every id a row names is one the deciding
seat's own log shows).*

**2026-10-27**

**Context.** J173's spine s04 (powered, deck seed 2117) ended its checks with one problem, `atlas:d10:random:o4:b67: seat
Drafter B's row names id 96 (activate:96), which its own log never shows it`, and exit 3. Card 96 is a Food Token. Seat B's
own log (`frames/d10-random-o4-b67-seat1.jsonl.gz`) shows what happened: the decision at state 28 offered `activate:60#0`,
`activate:96`, `activate:97` and `pass`; state 29's zone events carry 96 `from: null` onto B's battlefield, then `battlefield
(1)` → `graveyard (1)` after a `sacrificed` event, then the cast *Food Token (96) - Drafter B gains 3 life* and its
resolution; no state frame lists 96 in any zone. The token was made and sacrificed inside one engine step, between two
snapshots. That is exactly D481's first shape, which `tools/check-redaction.mjs` accepts for the decision frames (and did: the
spine's 15,052 logs passed it). The rows check, written under D480 before D481, still read only the cards the state frames
list, so the same object failed there. Nothing was leaked: the id is the viewer's own token in its own public zones.

**Decision.** `visibleIds(logText, seat?)` in `tools/cubelab/rowscheck.ts` takes the viewer's seat and adds D481's born tokens:
an id whose state-frame zone events show a birth (`from: null`) onto that seat's battlefield and whose latest zone event's
`to` is that seat's battlefield or graveyard. `checkGameIds` passes the seat it is checking. Only that shape, and only from
the seat's own log; a birth onto the other seat's battlefield, a latest move into exile, a hand, a library or another seat's
zone, or an object that came from a hand rather than being born, vouch for nothing, as in D481. The window is the whole log
rather than D481's "up to the first state after the decision": the rows check is a game's check, not a decision's, and the
id is the viewer's own public object whenever it exists. D481's second shape (a spell cast from the viewer's own hand with no
stack instance) needs no rule here: a hand card is listed in the viewer's hand frames and so already counts as shown.

**Not a loosening of the gate.** The bridge's gate at decision time is unchanged (`Decisions.visible`); this is the
post-spine check learning what the checker already knows, so a seat acting on its own fresh token is not mistaken for a
leak. An id no frame and no event ever names still fails.

**Tests.** `web/test/cubelab-record-cake.test.ts`: a log whose events alone show id 12 born onto seat 0's battlefield and
ending in its graveyard passes the id check with the seat, and not without; the same id ending in exile, coming from a hand,
or ending in the other seat's graveyard still fails.

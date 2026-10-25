## D481 — A decision may name the viewer's own object that no state frame lists: a token born onto the viewer's battlefield and last there or in its graveyard, or a card moved from the viewer's own hand onto the stack, as the zone events show it by the first state frame after the decision (amends D347's audit, rule D3)

*Branch `pc/d481-decision-token`, on origin/main `49c0308e` (#208). `node tools/decisions.mjs next` gave D481. Amends the
M55 / **D347** audit in `tools/check-redaction.mjs` (its rule D3: every card id a decision names is a card its state frame,
or the next one, shows the viewer).*

**2026-10-25**

**Context.** The lab job J166 (move atlas 4a on random library decks) failed `check-redaction.mjs` on 1,395 of the legacy
spine's 12,000 branch frame logs (`lab-j166/b-s03-legacy-2103/phaseB/frames/`) and on one of the peasant spine's 5,000
(`b-s02-peasant-2102`). Every complaint was D3's: *decision n names card N, which its state frame does not show seat 0*.
I measured all 17,000 logs, first with a Python pass beside the checker and then with the checker itself. They show two
shapes. In both, the id is the viewer's own object in a public zone, and no state frame lists it.

1. **A token made and gone inside one resolution (s03: 1,891 ids in 1,395 logs).** Every one is a `choice` / `entity`
   decision whose other option is a legendary permanent the state frame does show. That is Boo in 1,701 cases: Minsc &
   Boo, Timeless Heroes makes a new Boo token each upkeep. It is Zirda, the Dawnwaker in 190: Springheart Nantuko's
   landfall makes a token copy. In each case the legend rule asks which one to keep.
   - Every flagged id is **fresh** (greater than every card id an earlier state frame showed). The decision always
     **kept the other one**, and **no state frame ever lists the id**.
   - The first state frame after the decision carries the id's two zone events: `from: null` → `{battlefield, player 0}`,
     then `{battlefield, 0}` → `{graveyard, 0}`.
   - Examples: `d0-random-o0-b123-seat0.jsonl.gz` line 781, decision 171, `option:156`, whose events are in state seq 609;
     decision 183 at line 832, id 163; `d0-random-o0-b142-seat0.jsonl.gz`, Zirda, id 82.
   - The token went to the viewer's own graveyard and, being a token, ceased to exist before the forwarder's next
     boundary.
2. **A spell with no stack instance (s02: 1 log).** This is `d2-random-o1-b21-seat0.jsonl.gz` line 414, decision 88,
   `target:17` for Take It Back (67). Card 17 is Tear Asunder, the viewer's own card:
   - seq 322 shows it in the viewer's hand;
   - seq 323's zone event moves it `{hand, 0}` → `{stack, null}`;
   - no state frame from 323 to 325 lists it, in a zone or in `stackCards`, and `stack[]` holds no instance for it. The
     random seat was mid-cast: decision 87 is `complete:false`;
   - seq 325 names it only as Take It Back's `targetCardIds`, and seq 326 shows it back in the viewer's hand.

So D3's mechanical form ("the state frame, or the next one, lists it") is what failed. The two objects were where no
snapshot listed them, but the frames' own zone events say where they were.

**Why the checker, not the bridge.** `SeatRecorder.mark()` already flushes the forwarder before a decision is written,
whenever events are pending. Here none were pending, because Forge had not yet fired the zone change when it asked.

Forcing a snapshot at that moment would emit an extra state frame to every seat at a point the stream has never had
one. It would change every recording that meets such a choice, the wire-drift and same-game comparisons included. And
the snapshot would still not list a token that is already gone, or a spell with no stack instance.

Nothing reaches a client unseen. The decision record is the recording seat's own training row (D347), written by
`PolicyControllerAi` for a Forge AI seat. A human seat meets the legend-rule choice as a `choose_entities` ask
(`WireGuiGame.chooseSingleEntityForEffect`), and every option of that ask goes through `Snap.card` / `Snap.label`. The
human client is therefore sent the gated card in the ask body itself. The bridge is never asked to choose a card the
human client was not sent.

For the AI seat's own record, the gate at decision time is `Decisions.visible`
(`bridge/src/mtgtable/ai/Decisions.java:104`). An option's card is written as its id only when the seat sees it where it
is now: on the battlefield, in a graveyard, on the stack or in the command zone; in its own hand; or in exile, face up
or under its own control. Every other card is written as `option:hidden`. `Snap.card` / `Snap.label` play the same part
for the wire. What came up short was the audit's after-the-fact stand-in for that gate ("a state frame shows it").

**Decision.** This **loosens** a mechanical rule. D3 said "a state frame lists it", and D481 accepts ids no state frame
lists, on the strength of the frames' zone events. The audit accepts a card id that neither the decision's state frame
nor the next one lists, if the zone events in the **window** show one of these two shapes. The window is the state frames
up to and including the first one after the decision (the first with a greater seq).

- **A token of the viewer's own.**
  - A birth event in the window: `from: null`, onto the viewer's own battlefield.
  - The id's latest move in the window left it on the viewer's own battlefield or in its own graveyard (`to.player` is
    the viewer's seat).
- **A spell from the viewer's own hand.** The id's latest move in the window took it from the viewer's own **hand**
  (`from: {zone: hand, player: <viewer>}`) onto the stack.
  - The from side names the zone the card left, so it says whose hand it was, that is, who owns the card. It does not
    say who cast it. In s02 the viewer casts Take It Back from `{exile, player 1}`, a card it does not own.
  - A stack zone event names no player.
  - A card moved to the stack from the viewer's own library, or from a face-down exile, is **not** accepted. The viewer
    could not see it there when the option was offered.

Such an id is counted and named on the file's report (`M55 decision ids entered between frames=<n>`), never a problem.
Everything else fails exactly as before. Exile is never accepted, because a card can go there face down. Nor is a card
whose birth, or latest move, belongs to another seat.

**How the window is read.**
- **It walks back to the first state frame.** It does not start at the decision's own frame, because s02's vouching event
  (hand → stack, seq 323) comes one frame before the decision's state (seq 324).
- **Walking back is sound.** Every real zone change fires `GameEventCardChangeZone`, which Snap writes as a zone event.
  The changes that fire none leave the card public or end it (a token ceasing to exist). So the latest move is where the
  card is.
- **A `to: null` event is skipped.** Snap may write one for a token that ceases to exist. The token is then judged by
  the zone it was last in, and still passes; the control `m55-option-entered-then-ceased-to-exist.jsonl` holds that.
- **Two different "next" states.** D3's `allowed` uses the state after the frame the decision names, while the window
  ends at the first state after the decision's own line. These are the same frame whenever the decision names the
  latest state before it, which the recorder always does.

`--partial` is unchanged: a decision with no later state frame written yet stays undecided, as D3's next-frame
allowance already made it.

**The selftest's controls.**
- **PASS (4):**
  - `m55-option-entered-between-frames.jsonl`, the Boo shape;
  - `m55-option-entered-then-ceased-to-exist.jsonl`;
  - `m55-option-cast-between-frames.jsonl`, the spell's event in the decision's own state frame;
  - `m55-option-cast-a-frame-before-the-decision.jsonl`, s02's real shape, its event one frame earlier.
- **FAIL (11):**
  - an id that no state frame lists and no event moves (`m55-option-never-shown.jsonl`);
  - one dealt into the opponent's hand (`-entered-the-opponent-hand`);
  - one cast from the opponent's hand (`-cast-from-the-opponent-hand`), or from the viewer's own library
    (`-cast-from-the-viewer-library`);
  - a token born onto the opponent's battlefield (`-born-on-the-opponent-battlefield`), or born there and then taken by
    the viewer (`-born-on-the-opponent-then-taken`);
  - a token born onto the viewer's battlefield and then taken by the opponent (`-born-then-taken-by-the-opponent`), or
    exiled (`-entered-the-viewer-exile`);
  - a card moved into the viewer's graveyard with no birth (`-not-born-in-the-graveyard`);
  - a token whose latest move is into the opponent's hand (`-entered-then-went-to-the-opponent-hand`);
  - an id whose events come one state frame too late (`-entered-a-state-too-late`).

All fifteen are in the selftest's REQUIRED list. Ten mutants of the rule each fail the selftest:
- each of the five conditions removed in turn (the viewer's seat on the latest move, on the birth and on the hand; the
  birth itself; the from-hand zone);
- exile added to the accepted zones;
- the window starting at the decision's own frame;
- the window not ending at the first state after the decision;
- the `to: null` fallback removed;
- the rule switched off.

**Proof.**
- `node tools/check-redaction.mjs --empty-hand-ok` (the atlas's invocation, 100 logs a call) over both spines' 17,000
  branch logs: **17,000 PASS, 0 FAIL**, at six calls at once. That is 123 s for the first rule, and the tightened rule
  gives the same result. Their 4 baseline logs, checked without the flag,
  pass too, for 17,004 in all.
- The counted cases: **1,893 ids in 1,396 logs**. That is the 1,891 legacy ids the classification found, plus decision
  88's `target:17`, counted twice because it is both an option and the answer.
- Over `fixtures/games/` and `fixtures/synthetic/`, the checker's output is byte-for-byte the same as origin/main's, because
  no committed recording carries a decision record.

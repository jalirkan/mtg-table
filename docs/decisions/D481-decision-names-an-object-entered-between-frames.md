## D481 — A decision may name the viewer's own object that no state frame lists, when its latest zone event, as of the first state frame after the decision, put it on the viewer's battlefield, in its graveyard, or on the stack from its own zone (amends D347's audit, rule D3)

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
human client was not sent; what came up short was the audit's stand-in for that ("a state frame shows it").

**Decision.** The M55 / D347 audit accepts a card id that neither the decision's state frame nor the next one lists, **if
the id's latest zone event**, in the state frames up to and including the first one after the decision (the first with
a greater seq), **does one of these:**
- moves it **onto the viewer's own battlefield or into the viewer's own graveyard** (`to.player` is the viewer's seat);
- moves it **onto the stack from a zone of the viewer's own** (`from.player` is the viewer's seat). A stack zone event
  names no player, so the from side is what says whose spell it is.

Such an id is counted and named on the file's report (`M55 decision ids entered between frames=<n>`), never a problem.
Everything else fails exactly as before. The selftest's controls each hold one case:
- an id that no state frame lists and no event moves (`m55-option-never-shown.jsonl`);
- an id the events deal into another seat's hand (`m55-option-entered-the-opponent-hand.jsonl`);
- a card moved to the stack from another seat's hand, which could be cast face down
  (`m55-option-cast-from-the-opponent-hand.jsonl`);
- a token whose latest move takes it off the viewer's battlefield into another seat's hand
  (`m55-option-entered-then-went-to-the-opponent-hand.jsonl`);
- an id whose only events are in a later state frame than the first after the decision
  (`m55-option-entered-a-state-too-late.jsonl`).

The PASS controls are `m55-option-entered-between-frames.jsonl` (the Boo shape) and `m55-option-cast-between-frames.jsonl`
(the Tear Asunder shape, with its event in the decision's own state frame, as in s02). All seven are in the selftest's
REQUIRED list.

Exile is left out on purpose, because a card can go there face down. `--partial` is unchanged: a decision with no later
state frame written yet stays undecided, as D3's next-frame allowance already made it.

**Proof.**
- `node tools/check-redaction.mjs --empty-hand-ok` (the atlas's invocation, 100 logs a call) over both spines' 17,000
  branch logs: **17,000 PASS, 0 FAIL**, in 123 s at six calls at once. Their 4 baseline logs, checked without the flag,
  pass too, for 17,004 in all.
- The counted cases: **1,893 ids in 1,396 logs**. That is the 1,891 legacy ids the classification found, plus decision
  88's `target:17`, counted twice because it is both an option and the answer.
- Over `fixtures/games/` and `fixtures/synthetic/`, the checker's output is byte-for-byte the same as origin/main's, because
  no committed recording carries a decision record.

## D496 — The seat's frame log records what the engine revealed to it, and the M55 audit accepts an option the engine revealed in the same step (protocol M78; amends D347's audit as D481, D485 and D495 did)

*Branch `pc/d496-reveal-records`, on origin/main `480c837d` (#223, D495's merge). `node tools/decisions.mjs next` gave
D496. Amends the M55 / **D347** decision audit in `tools/check-redaction.mjs` ("a stub's id, a library card or another
seat's hidden card is never an option"), as **D481**, **D485** and **D495** amended it, and adds protocol amendment
**M78**: a third `dir:"ai"` line type, written by `mtgtable.SeatRecorder`. Unlike those three, this one changes the
bridge: the log now carries the engine's own evidence instead of the checker inferring it.*

**2026-11-01**

**Context.** J177 (the lab's atlas night four, 13 spines, mtg-table at `480c837d`) failed one check, `atlas.problems == 0`,
with 1: in spine `b-s02-peasant-2141`, **two of 7,750 branch frame logs failed `tools/check-redaction.mjs`**, each on one
message:

- `/home/justin-a/code/lab/data/lab-j177/b-s02-peasant-2141/phaseB/frames/d9-random-o2-b94-seat1.jsonl.gz` line 74:
  `decision 15 names card 59 (option:59), which its state frame does not show seat 1 -- a stub's id, a library card or
  another seat's hidden card is never an option (M55, D347)`
- `/home/justin-a/code/lab/data/lab-j177/b-s02-peasant-2141/phaseB/frames/d0-random-o0-b24-seat1.jsonl.gz` line 528: the
  same, decision 88, card 59.

Both are a **cascade**. In the first: state seq 57 (line 72, turn 15 MAIN1) lists seat 1's hand as card 56, Bloodbraid Elf,
its library count 26, and card 59 nowhere. Decision 14 (line 73) is the priority decision `cast:56`. Decision 15 (line 74)
is `{"kind":"choice","frame":70,"stateSeq":57,"options":["pass","option:59"],"chosen":"pass","by":"forge","source":"entity"}`,
the cascade's "cast it without paying?" (Forge builds Cascade as a `DigUntil` that exiles and imprints the found card,
then an optional `Play` of the imprinted card). Card 59 is Spicy Oatmeal Pizza, seat 1's own library card. The next state,
seq 58 (line 75), carries in order: zone 56 hand → stack, `cast` 56, `cast` 56 (the Cascade trigger), **zone 59
`{library,1}` → `{exile,1}`**, **zone 59 `{exile,1}` → `{library,1}`** (declined, to the bottom), and the Elf's
resolution. No state frame of either log ever lists card 59. The second log is the same game position (turn 25, decision
88 at frame 524, state seq 438). Nothing leaked: cascade exiles face up, and Forge revealed the card to both players.

**Why the decision names a stale frame.** `SeatRecorder.mark()` flushes the forwarder before each written decision, so the
record names the position decided in -- but `RecordMatch.SpectatorGui.handleGameEvents` keeps a batch back when
`MidMove.hold(game)` says the cut would fall mid-update (**D352**'s stale "may look" static, **D399**'s tracker freeze),
and nothing else in that method writes no frame. The ask comes inside the trigger's resolution, the batch was held, and
the decision names seq 57. (The log does not say which of `MidMove`'s two tests fired; either way the frame the decision
names is from before the reveal.) That is by design, and the audit's vouching rules exist for exactly this. But **D481**
refuses exile ("a card can go there face down"; control `m55-option-entered-the-viewer-exile`) and a library ("the viewer
could not see it when the option was offered"; `m55-option-cast-from-the-viewer-library`), and **D495**'s guard 4 refuses
any move through a library or exile. In the other eight logs of that spine whose decisions name `option:59`, a state frame
happened to be cut while 59 sat in exile, so D3 vouched and they passed; the difference is the recorder's clock, not the
game. The race is rare: **3,218 cascade logs, 2 failures** -- 3,218 of that spine's 7,750 branch frame logs
(`/home/justin-a/code/lab/data/lab-j177/b-s02-peasant-2141/phaseB/frames/`) carry a cascade trigger (a `cast` event
whose text starts `Cascade - `), no other J177 spine has any, and no `Discover N - ` cast appears anywhere (counted by
the coordinator from the data, read only). In the other 3,216 the recorder's clock happened to cut a frame while the
card sat in exile (so D3 vouched for it), or no decision named a card no frame showed.

**Decision.** Make the log carry the engine's own evidence: what Forge revealed to the seat.

1. **The bridge.** Forge's `GameAction.reveal(cards, zt, owner, dontRevealToOwner, msg, suffix)` calls
   `p.getController().reveal(cards, zt, owner, msg, suffix)` for every player of the game (all but the owner when
   `dontRevealToOwner`), and `GameAction.revealTo(cards, players, msg, suffix)` calls the same overload for the players it
   names; a cascade's `DigUntilEffect.resolve` calls `reveal(revealed, p, false)` before it moves the first dug card
   (javap on the pinned 2.0.14 jar, `-c`: the `GameAction.reveal` at offset 697, the first `GameAction.moveTo` at 1094;
   `GameAction.reveal`'s six-argument body loops `game.getPlayers()` into `PlayerController.reveal`). `forge.ai.PlayerControllerAi`
   implements that overload (it stores the cards in `AiCardMemory`, nothing else). **`PolicyControllerAi` now overrides it**:
   `super`, then, with a sink attached, the cards' ids, the zone as the protocol spells one (`ZoneType.name()` lowercased,
   as `Snap.zoneRef` writes it) and the owner's player id go to `DecisionSink.reveal(int[], String, Integer)`. The message
   prefix -- an engine string that can name a card -- is never read. An empty collection writes nothing (`RevealHandEffect`
   can reveal an empty hand). A failure to record is counted through `DecisionSink.error`, never thrown into the game.
   `DecisionClock.capping` passes the call through uncounted (a reveal is not a decision, so it is no part of D484's
   repeat cap). **`SeatRecorder.reveal` writes one `dir:"ai"` line of type `reveal`, `{seat, cardIds, zone, owner}`, in
   order, with no flush** -- `mark()` is not called, so the line sits after the state frame the next decision names and
   before that decision. The `decisions` summary is unchanged (no `reveals` key: `SUMMARY_KEYS`, ForgeCoach's reader and
   the warehouse stay as they are; the lines are countable as lines, and `SeatRecorder.reveals()` counts them in process).
   Every call is on the game thread, inside the effect's resolution, like the decision lines (hard rule 3); no hop.
2. **The overload not overridden.** `PlayerController.reveal(List<CardView>, ZoneType, PlayerView, String, boolean)` is
   reached only from the final `PlayerController.reveal(DelayedReveal)` (javap), i.e. a search's reveal shown with the
   choice it goes with, whose options M55 already records as `option:hidden` where the seat cannot see them. Overriding
   it would name `CardView` in `PolicyControllerAi`, which lint rule 5 forbids outside the serialiser; it is left alone.
3. **The protocol (M78).** `docs/protocol.md`'s amendments table and §8.2: the third `ai` type, `reveal` -- the ids the
   engine revealed to the viewing seat, the zone they were revealed from, their owner; private to the seat's own log like
   `decision`; no names and no strings; readers that feed `s2c` frames skip it as they skip `decision`.
4. **The checker.** (a) The `ai` line audit accepts type `reveal` with exactly the keys `{seat, cardIds, zone, owner}`:
   `seat` the log's (the existing check for every `ai` line), `cardIds` a non-empty list of non-negative integers, `zone`
   one of `ZoneType`'s nineteen constants lowercased (the pinned jar) or `null`, `owner` a player of the game or `null`
   (Forge passes both on every path read; the vouching reads neither, so a null is not worth failing a night over). Any
   other key fails, as does any other type ("only `decision`, `decisions` and `reveal` exist"). (b) In `auditDecisions`,
   an option's card id that D3, D481, D485 and D495 do not vouch for is accepted, and counted (the stats line
   `M55 decision ids revealed to the seat in the step=<n>`), when **a well-formed `reveal` line of this seat, strictly after
   the decision's state frame (`b.frame`) and strictly before the decision's own line, names the id**: the engine showed
   the card to the seat in the very step the decision was taken in. A reveal before the state frame does not vouch (a card
   still public then would be in that state), nor one after the decision. A second stats line counts the well-formed
   reveal lines (`M78 reveal lines=<n>`).

**What stays rejected.** Everything D481, D485 and D495 reject, unless a reveal of the seat in that window names the id: a
reveal before the decision's state frame, a reveal after the decision, a reveal of another id, another seat's reveal line
(itself a failure: a seat's reveals are its own), a reveal with a fifth key (a card name, say) or no ids (themselves
failures, and they vouch for nothing). The bridge's own gate at decision time, `Decisions.visible` (**D347**), is
unchanged.

**What the rule cannot see.** The log does not order the ask against the engine's moves inside a held batch, so it cannot
tell whether the card was still revealed when the seat was asked -- a revealed card can go back to a library or a hand in
the same resolution, before the question. That remains the bridge's own gate, `Decisions.visible`, exactly as for D481,
D485 and D495. Nor does it see a reveal Forge makes through the other overload (a search's `DelayedReveal`, point 2), or a
reveal to a seat whose controller is not ours (Forge's plain AI seat, `Bootstrap.createAiPlayer`): neither writes a line,
so neither vouches.

**`--partial`.** The reveal precedes the decision, so a prefix that holds the decision holds its reveal: the decision is
decided at once, with no later state in the prefix. The existing curable rule is unchanged (an id nothing vouches for
stays undecided while the next state, or D495's eventful one, is not in the prefix). The self-test's partial block holds
both halves: `reveal-vouches-the-option` cut right after its decision passes, and `reveal-after-the-decision` cut after its
late reveal is undecided and fails once the next state is in.

**Readers of `dir:"ai"` lines** (every one in the repo, read for this): `tools/check-redaction.mjs` learns the type.
`tools/cubelab/atlaschecks.ts` (`guardrailCheck`, `forgePayCapOf`) and `tools/cubelab/seatidentity.ts` (`decisionLines`:
the seat-identity golden of gate step 12m compares decision lines, the last state and `over` only) select lines by the
substring `"type":"decision"` / `"type":"decisions"`, which a `reveal` line does not contain. `tools/cubelab/censusreplay.ts`
(`framesFace`) normalises every line and compares two recordings of one game, both written by the same bridge.
`tools/cubelab/rowscheck.ts` (`visibleIds`) walks every line for objects with `id`, `zone` and `name`; a reveal body has
none of them. `tools/ml/policy_data.py` and `tools/ml/tests/test_play_explore.py` select by `type`; `tools/ml/encode.py`
keeps `s2c` only; `tools/check-seat-pair.mjs` keeps `s2c` only; `tools/same-game.mjs` keeps everything but `c2s` (it reads
`RecordMatch` logs, which carry no `ai` line); `tools/llm-seat/lib/positions.mjs` acts on `state`, `input` and `ask` only;
`tools/fixture-multiset-diff.mjs` counts per `dir`; `tools/watch-runner.mjs` looks for `state` and `over`;
`web/src/story/caption.ts` and `web/src/story/narrate.ts` skip anything not `s2c`; `web/test/cubelab-record.test.ts` selects
by `type`. One reader does not skip: **the board's replay transport** (`web/src/transport/replay.ts`'s
`LogReplayTransport.stepForward`) feeds every frame to `reduce()`, which throws on an unknown type -- so a lab log stops at
its first `ai` line, `decision` or `reveal` alike (measured: `fixtures/negative/redaction/m55-decisions-present.jsonl`
applies 2 of its 7 frames). That is M55's, not this decision's, and is written down (PLAN.md, the cube lab's follow-up 11)
rather than fixed here; follow-up 10 is this decision's own field confirmation. ForgeCoach's `log.ts` is outside this repository; it counts every line after the header as a frame, and a `reveal`
line is one, as a `decision` line is.

**A log from this bridge fails an older checker.** Before M78 the audit fails any `ai` type but `decision` and
`decisions`, so a night recorded on this branch must be checked with the checker of the commit that recorded it -- which
the atlas does, running `tools/check-redaction.mjs` from its own checkout (`tools/cubelab/atlas.ts`).

**Tests.**

- **The checker's controls**: seven new files in `fixtures/negative/redaction/`, built by `tools/make-negative-fixtures.mjs`
  and named in `tools/check-redaction-selftest.mjs`'s `REQUIRED` (gate step 12, CI) -- pass: `reveal-vouches-the-option`
  (the J177 shape: a `choice` / `entity` decision offering `pass` or a card no state lists, and a reveal line of the seat
  between the decision's state frame and the decision naming it); fail: `reveal-before-the-decision-state`,
  `reveal-after-the-decision`, `reveal-names-another-id`, `reveal-of-another-seat`, `reveal-with-an-unexpected-key` (a
  `name`), `reveal-empty-card-ids` (beside a decision that needs no vouching, so the empty list is the one defect). The
  self-test passes its 144 controls (137 before) and its new partial case.
- **Each guard removed in turn**, in a scratch copy of the checker, flipped its own control to PASS and no other: the
  window's lower bound (`reveal-before-the-decision-state`), its upper bound (`reveal-after-the-decision`; the reveal lines
  are collected before the decisions are audited, so the bound is the only thing that refuses a later line), the id match
  (`reveal-names-another-id`), the key set (`reveal-with-an-unexpected-key`), the non-empty list (`reveal-empty-card-ids`).
  The seat has two guards -- the line's own seat check, shared with every `ai` line, and the window's seat filter -- and
  removing either alone leaves `reveal-of-another-seat` failing; removing both flips it.
- **The bridge**: `DecisionSelfTest` (a `bridge/build.sh` self-test) asserts that the capping sink hands every reveal to
  its recorder unchanged and counts none against the repeat cap (2,000 reveals, no decision written).
- **The real engine**: `tools/ai-bench.sh --selftest`'s new `cascade-reveal` scenario (`revealScenarios`, 6 checks; the
  self-test 279 checks, 0 failures, ~15 s). On a `GameState` board the seat -- `PolicyControllerAi`, as every lab and
  bench seat is -- casts Bloodbraid Elf over a library of Forest, Forest, Lightning Bolt, with a `SeatRecorder` attached
  (its header's deck is `tools/ai-bench/decks/cascade-reveal.dck`). It asserts the log carries
  `{"seat":1,"cardIds":[10,11,12],"zone":"library","owner":1}` -- the three dug cards, top first, no name -- written before
  the state frame that moves the Bolt to exile and before the cascade's first decision, and that
  `tools/check-redaction.mjs` passes the log. Whether the recorder holds the frame is the forwarder's clock, so the
  scenario does not assert the stale shape (in its run the frame was cut after the exile, and D3 vouched); the controls
  hold the rule. With the override's write taken out (a hand edit, reverted), 4 of the 6 fail.

**Measured.**

- **The two failing J177 logs, with the line the new bridge would have written** inserted by hand in scratch copies
  (`{"dir":"ai","type":"reveal","body":{"seat":1,"cardIds":[59],"zone":"library","owner":1}}` between the priority decision
  and the cascade's, the later `ai` seqs and frame indices renumbered as the bridge would have numbered them), with the
  atlas's `--empty-hand-ok`:

  | log | `main`'s checker, as recorded | this branch, as recorded | `main`'s, with the line | this branch, with the line |
  |---|---|---|---|---|
  | `d9-random-o2-b94-seat1` | FAIL (decision 15, card 59) | FAIL (the same) | FAIL (2: the unknown `reveal` type, and card 59) | **PASS** (revealed in the step = 1) |
  | `d0-random-o0-b24-seat1` | FAIL (decision 88, card 59) | FAIL (the same) | FAIL (2: the same) | **PASS** (revealed in the step = 1) |

  As recorded, the new checker fails them exactly as `main`'s does: no field log carries a reveal line yet, so the rule
  accepts nothing on an old log.

- **Every J177 branch log, both checkers** (`main`'s at `480c837d` and this branch's, frozen copies, over
  `/home/justin-a/code/lab/data/lab-j177/b-s*/phaseB/frames/*.jsonl.gz`, read only, with `--empty-hand-ok`):

| spine | logs | `main` fails | this branch fails | chunk outputs that differ | ids revealed in the step | reveal lines |
|---|---:|---:|---:|---:|---:|---:|
| s01 pauper | 17,710 | 0 | 0 | 0 | 0 | 0 |
| s02 peasant | 7,750 | 2 | 2 | 0 | 0 | 0 |
| s03 legacy | 3,000 | 0 | 0 | 0 | 0 | 0 |
| s04 powered | 8,400 | 0 | 0 | 0 | 0 | 0 |
| s05 pauper | 10,350 | 0 | 0 | 0 | 0 | 0 |
| s06 peasant | 10,200 | 0 | 0 | 0 | 0 | 0 |
| s07 legacy | 7,400 | 0 | 0 | 0 | 0 | 0 |
| s08 powered | 9,100 | 0 | 0 | 0 | 0 | 0 |
| s09 pauper | 9,350 | 0 | 0 | 0 | 0 | 0 |
| s10 peasant | 8,600 | 0 | 0 | 0 | 0 | 0 |
| s11 legacy | 11,000 | 0 | 0 | 0 | 0 | 0 |
| s12 powered | 10,550 | 0 | 0 | 0 | 0 | 0 |
| s13 pauper | 9,660 | 0 | 0 | 0 | 0 | 0 |
| **all 13** | **123,070** | **2** | **2** | **0** | **0** | **0** |

  The two checkers' outputs are byte-identical on every one of the 123,070 logs (compared per chunk of 250 files, whole
  output: every per-file stats line, every message); the only failures are the two J177 logs above, failed the same way
  by both, and no log carries a reveal line, so the new rule accepted nothing. It changes nothing on an old log -- it
  needs a line only this bridge writes.

`node tools/check-redaction.mjs fixtures/games/*.jsonl` passes its 22 recordings.

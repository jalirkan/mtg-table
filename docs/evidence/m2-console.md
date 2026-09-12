# M2 evidence — a full game against the AI, from one seat

What was actually run, on 2026-09-11, with real numbers. Milestone M2 of
[`PLAN.md`](../../PLAN.md), implemented against
[`docs/research/07-wireguigame-spec.md`](../research/07-wireguigame-spec.md)
(the 37 members, the five threads, the eleven ask kinds),
[`06-hidden-information-audit.md`](../research/06-hidden-information-audit.md)
(`Snap.label`, `DelayedReveal`, the `REVEAL` log) and
[`11-engine-comfort-features.md`](../research/11-engine-comfort-features.md)
(phase stops from our own map; the button labels are the engine's).

Jar: `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`,
sha256 `3c0a7c385b9207e593fe149255e00d1cd7e5568…` (from the session headers),
`BuildInfo.getVersionString()` = `2.0.14-SNAPSHOT-08.08`.

---

## 0. What shipped

| File | What it is |
|---|---|
| `bridge/src/mtgtable/Transport.java` | the interface plus the three thread asserts (report 07 §6.2) |
| `bridge/src/mtgtable/ReplyPool.java` | `askId -> CompletableFuture<String>`, per-ask timeout, duplicate-answer drop, `cancelAll()`, the 30 s `ASK PENDING` watchdog |
| `bridge/src/mtgtable/WireGuiGame.java` | all **37** abstract members, the input path, the ask path, the act map |
| `bridge/src/mtgtable/AutoTransport.java` | the scripted "dumb human" |
| `bridge/src/mtgtable/NullTransport.java` | every ask answered `null`; **subclasses `AutoTransport` for the input path only** (§2) |
| `bridge/src/mtgtable/ConsoleTransport.java` | the line protocol of report 07 §8 |
| `bridge/src/mtgtable/MtgTable.java` | `--transport null\|auto\|console`, `--deck`, `--deck2`, `--seed`, `--seat 0`, `--ai-name`, `--game-id` |
| `bridge/src/mtgtable/Snap.java` | **edited**: the M2 entry points (`card(o,cv,viewer)`, `label`, `concealed`, `lethal`, `cardIndex`, `playerList`), the `REVEAL` log, and the non-null `zone` fallback |
| `bridge/src/mtgtable/Json.java` | **edited**: `JsonOut.raw()`, for splicing a card serialised earlier on the game thread into an `input` frame assembled on the EDT |
| `tools/lint-bridge.sh` | **edited**: one ALLOW entry, `WireGuiGame.java`, with its justification |
| `fixtures/games/human-auto-{42,7,2026}.jsonl` | three complete human-seat games |

---

## 1. Build and lint (deliverable a)

```
$ ./bridge/build.sh
bridge lint OK (16 file(s))
compiling 16 file(s) -> /home/justin-a/code/mtg-table/bridge/out
JsonSelfTest: 38 check(s), 0 failure(s)
build OK
```

The class compiles as a **concrete** class, which is the mechanical proof that
all 37 abstract members are present: 36 from `IGuiGame` (the `comm -23` recipe in
`CLAUDE.md` yields 41 names, five of which — `isLibgdxPort`, `handleGameEvents`,
`refreshYieldUi`, `updateCardsNetSafe`, `updateDrawOffer` — are `default`
methods) plus `AbstractGuiGame`'s own `protected void updateCurrentPlayer`.

`tools/lint-bridge.sh` gained exactly one line: `WireGuiGame.java` may name
`CardView`, because its `IGuiGame` signatures take one. It never reads a field
off a card — pushes take `getId()` and nothing else, and every card and every
option label goes through `Snap.card` / `Snap.label`.

The whole repo gate passes on top of these changes:

```
$ ./tools/check-all.sh
...
check-all OK
```

which includes step 5's fresh `RecordMatch` re-record and its byte-diff against
`fixtures/games/g1.jsonl`: **`Snap.java`'s edits changed no byte of the M1 wire**,
and `web/`'s 181 node tests plus its React render tests pass over the enlarged
corpus, the three new human-seat logs included.

`--seat 1` is rejected with a reason rather than accepted and ignored:
`HostedMatch.startMatch` sorts `LobbyPlayerHuman` seats to the front before it
builds the `Match`, so the human is player 0 whatever we pass, and a `--seat 1`
run would write a session header that lied about which seat the log was redacted
for.

---

## 2. `--transport null`: a whole game on the documented defaults (deliverable b)

```
$ ./bridge/run.sh mtgtable.MtgTable --transport null --seed 42
== summary ==
finished       = true
winner         = Forge AI, reason = AllOpponentsLost
player turns   = 22 (round 11)
frames         = 226 state, 1602 log line(s) including the session header
ask kinds      = [choose_list, order]
UNIMPL members = none
members fired  = 19 of 37 [updateCurrentPlayer, openView, handleGameEvents,
                 updateButtons, showPromptMessage, showCombat, clearWeaklySelectable,
                 alertUser, getAbilityToPlay, getChoices, openZones, setSelectables,
                 setHighlighted, setCard, clearSelectables, restoreOldZones, message,
                 order, finishGame]
REVEAL count   = 0
deferred events= 46 (handleGameEvents off the game thread -- expected, not a bug)
events dropped = 0
unzoned cards  = 0
emit errors    = 0
game wall time = 30105 ms
```

No throw, no wedge, `UNIMPL` empty, exit 0. **Eight asks were raised and not one
`answer` frame was written** — `grep -c '"type":"answer"'` on that log is `0`,
against 226 `act` frames — so every value-returning member returned the
documented default of protocol section 5.4 and the game still finished. That is
the whole point of this transport, and it is the same 22-turn game the `auto`
run below plays with real answers (1602 log lines against 1610; the difference
is the eight answers and two acts).

**The one place report 07's checklist is wrong, and it is the milestone's own
central finding.** Section 10 step 3 says a `NullTransport` that answers every
ask with `null` should run a `HostedMatch` to completion. It does not, and the
reason is section 0.8: with `isLibgdxPort() == false` **a human seat is driven
by the input path, not by asks**. The very first decision of the very first game
is:

```
== input == "Human, you have won the coin toss.\n\nWould you like to play or draw?"
  [ok]     Play   (enabled)
  [cancel] Draw   (enabled)
  selectable 0..0 of: -
```

-- an `InputConfirm`, with `Play` / `Draw` as the *engine's* button labels and no
`IGuiGame.confirm` anywhere in it. A transport that answers only asks parks
there forever, having proved nothing; the first build of this class did exactly
that and its log ends after five frames. So `NullTransport` extends
`AutoTransport` and overrides only the answer half. The distinction that
survives is the one worth testing:

- **null** -- every ask resolves to `null`, i.e. Forge's documented default, and
  no `answer` frame is ever written;
- **auto** -- every ask is answered with a real, minimal, legal value.

The 46 **deferred events** confirm report 07 section 0.4 as measured fact:
`handleGameEvents` really does fire off the game thread (via
`InputQueue.removeInput` from `InputSyncronizedBase.stop()`, on the click
thread), and the batch is buffered instead of snapshotted. Across the runs below
the count ranged 4-67.

---

## 3. `--transport auto`: three seeds, three finished games (deliverable c)

```
$ ./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42   # and 7, and 2026
```

| seed | turns | state frames | log lines | bytes | ask kinds | UNIMPL | game wall |
|---|---|---|---|---|---|---|---|
| 42 | 22 (round 11) | 226 | 1610 | 2,651,820 | `choose_list`, `order` | none | 30.3 s |
| 7 | 13 (round 7) | 165 | 1216 | 1,554,430 | `order`, `choose_list` | none | 22.6 s |
| 2026 | 14 (round 7) | 133 | 929 | 1,252,169 | `choose_list`, `order` | none | 18.4 s |

All three: `finished = true`, `winner = Forge AI, reason = AllOpponentsLost`,
`events dropped = 0`, `unzoned cards = 0`, `emit errors = 0`, exit 0. The dumb
human loses every time, which is the expected result of a policy that clicks the
first legal thing.

`over` carries the real result, not a placeholder:

```json
{"type":"over","body":{"winner":1,"reason":"AllOpponentsLost","matchOver":true}}
```

### 3.1 Redaction — the first real test with a human seat

```
$ node tools/check-redaction.mjs fixtures/games/human-auto-*.jsonl
PASS  fixtures/games/human-auto-2026.jsonl
      frames=928 (state=133, other=795)  bytes=1252169  events=874
      cards checked=2711  redacted=531  face-down=0  stack cards=25  opponent-hand cards=531  viewer-hand named=476
      shape-checked state bodies=133 (exact key set + runtime type of every key, docs/protocol.md section 3)
      engine strings=46 (stack[].text + events[].cast.text), concealed=0, none joinable to a card concealed in the same frame
      A6 ever-revealed ids=28  library cards revealed=0  alt blocks=0  tokens=66  asks=11  prompts scanned=551
      A12 answers=11 (kinds: choose_list, order), value shape checked against the matching ask.kind, unanswered asks=0
PASS  fixtures/games/human-auto-42.jsonl
      frames=1611 (state=226, other=1385)  bytes=2651820  events=1393
      cards checked=5575  redacted=430  face-down=0  stack cards=41  opponent-hand cards=430  viewer-hand named=883
      A6 ever-revealed ids=42  library cards revealed=0  alt blocks=0  tokens=638  asks=8  prompts scanned=1005
      A12 answers=8 (kinds: choose_list, order), value shape checked against the matching ask.kind, unanswered asks=0
PASS  fixtures/games/human-auto-7.jsonl
      frames=1215 (state=165, other=1050)  bytes=1554430  events=595
      cards checked=3358  redacted=676  face-down=0  stack cards=25  opponent-hand cards=676  viewer-hand named=810
      A6 ever-revealed ids=31  library cards revealed=0  alt blocks=0  tokens=61  asks=5  prompts scanned=770
      A12 answers=5 (kinds: choose_list, order), value shape checked against the matching ask.kind, unanswered asks=0
```

Exit 0, **no warnings** — the A10 prompt scan (1,005 prompts in seed 42 alone)
found no engine prompt naming a card this seat could not see. 1,637 opponent
hand cards across the three files, every one of them the five-key stub; 2,169
of the viewer's own cards named, which is what makes the assertion mean
something. No emitter change was needed for the checker: the `ask` bodies, the
`answer` shapes and the `input.focusCard` cards all passed as written.

`web/` was not touched, and its suite still passes over the enlarged corpus —
181 node tests plus the React render tests, which picked up the three new
fixtures automatically and render **every frame** of them without throwing.

### 3.2 Which of the 37 fired, and which ask kinds

**22 of 37 members** fired across the four runs (null, auto, console-play,
console-quit):

```
alertUser  chooseSingleEntityForEffect  clearSelectables  clearWeaklySelectable
finishGame  getAbilityToPlay  getChoices  handleGameEvents  hideZones  message
openView  openZones  order  restoreOldZones  setCard  setHighlighted
setSelectables  showCombat  showPromptMessage  tempShowZones  updateButtons
updateCurrentPlayer
```

**Three of the eleven ask kinds** fired: `choose_list` (the Teamwork optional
cost on Quantum Reduction, and the Thriving lands' colour choice),
`order` (simultaneous triggers), `choose_entities`
(`chooseSingleEntityForEffect` — A.I.M. Scientists' `TypeCycling` library
search, with its `DelayedReveal`). `getAbilityToPlay` fired but answered
*locally* every time: with one playable ability and a null `ITriggerEvent`,
Forge's own desktop client returns it without a menu
(`CMatchUI.java:1016-1035`), and so do we, or every land drop would be a
one-option dialog.

The eight kinds not yet seen in a real game — `confirm`, `options`, `text`,
`assign_damage`, `assign_amount`, `manipulate_list`, `sideboard`, and
`ability_menu` proper — are implemented and shape-checked against the
hand-written fixture, but **no engine evidence exists for them yet**. `confirm`
is expected to stay rare for the reason in §2 (`InputConfirm`, not
`IGuiGame.confirm`); `sideboard` cannot fire at `setGamesPerMatch(1)` with a
sideboard-less deck; `assign_damage` needs two blockers on one attacker, which
a policy that attacks with everything and a deck with no trample rarely
produces.

### 3.3 Phase stops, seeded from the prefs (report 11 section 3.3)

`isUiSetToSkipPhase` is answered from `WireGuiGame`'s own `EnumMap`, seeded once
per game from `FPref.PHASES_HUMAN` / `PHASES_AI` and never from
`YieldController` (which `PlayerControllerHuman` consults only
`if (isRemoteClient())`, and the constructor asserts we are not one). The
console game's prompts land exactly where the jar's defaults say they should --
counted over the whole session:

| whose turn | phases that produced a prompt | pref default |
|---|---|---|
| ours | `Main phase, precombat` (110), `Main phase, postcombat` (16) | `PHASE_HUMAN_MAIN1`, `PHASE_HUMAN_MAIN2` = **true** |
| the AI's | `Beginning of Combat Step` (20), `Declare Attackers Step` (16), `End step` (16) | `PHASE_AI_BEGINCOMBAT`, `PHASE_AI_DECLAREATTACKERS`, `PHASE_AI_EOT` = **true** |

No upkeep, no draw step, no cleanup prompt on either turn -- those prefs default
to false and the map skips them. The AI's postcombat main also produced prompts
(40) despite `PHASE_AI_MAIN2` being false, which is correct and not a bug:
`skipsPromptForStackOrPhase` only consults the phase map when the **stack is
empty**, and the AI's second main is where it casts.

`REVEAL count = 0` in every run: the `DelayedReveal` in the console game was the
**viewer's own** library, and report 06 W6 logs a reveal only for a hidden zone
the viewer does not own.

---

## 4. The console (deliverable d)

### 4.1 The scripted quit

```
$ printf "\n\n\n\nq\n" | ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
mtg-table console.  Type ? for help.
-- hello_ok -- game console-quit-42, you are player 0, seed 42

== state == turn 0 (round 0)  null  active:null  priority:null
  p0 Human  life 20   hand 0  lib 40  gy 0  exile 0   mana -
  p1 Forge AI  life 20   hand 0  lib 40  gy 0  exile 0   mana -

== input == ""
  focus: -
  [ok]     Play   (enabled)
  [cancel] Draw   (enabled)
  selectable 0..0 of: -

== input == "Human, you have won the coin toss.\n\nWould you like to play or draw?"
  focus: -
  [ok]     Play   (enabled)
  [cancel] Draw   (enabled)
  selectable 0..0 of: -
-- conceding

== state == turn 0 (round 0)  null  active:null  priority:null
  p0 Human  life 20   hand 0  lib 40  gy 0  exile 0   mana -
  p1 Forge AI  life 20   hand 0  lib 40  gy 0  exile 0   mana -
  GAME OVER winner=1 reason=AllOpponentsLost

== input == ""
  [ok]        (disabled)
  [cancel]    (disabled)
-- over  winner=1  reason=AllOpponentsLost  matchOver=true

== summary ==
finished       = true
winner         = Forge AI, reason = AllOpponentsLost
...
MTGTABLE OK
```

Exit 0. Two bugs had to be fixed to get there, and both are worth recording:

1. **Do not read stdin before the board exists.** A pipe delivers every line the
   instant the reader thread starts — long before `Match.startGame` has dealt a
   card. The concede that resulted removed a player while
   `Match.prepareAllZones` was still iterating the player list, and Forge died
   inside its own setup:

   ```
   java.lang.IndexOutOfBoundsException: Index 1 out of bounds for length 1
       at forge.util.collect.FCollection.get(FCollection.java:447)
       at forge.game.Match.prepareAllZones(Match.java:251)
       at forge.game.Match.startGame(Match.java:81)
   ```

   `ConsoleTransport` now blocks its reader until the **first `input` frame** —
   not `hello_ok`, which is pushed from `openView` and is therefore too early —
   and `WireGuiGame` independently drops any act that arrives before the engine
   has asked this seat for anything. That second guard protects M3's browser
   from the same crash.

2. **The outcome is not always published from the game thread.** An
   `act: concede` is dispatched on our virtual EDT (report 07 §2.4), it runs
   `PlayerControllerHuman.concede` → `checkGameOverCondition`, and Guava then
   delivers `GameEventGameOutcome` synchronously **on that EDT**.
   `Snap.over`'s thread assert caught it exactly as designed:

   ```
   OUTCOME CAPTURE FAILED: java.lang.IllegalStateException: Snap.over must run on
   the Forge game thread (...); this is "mtg-table-EDT".
   ```

   The capture now hops onto Forge's own game pool
   (`ThreadUtil.invokeInGameThread`, whose threads are named `Game-n`) and
   `finishGame` waits up to a second for it. Before the fix every `over` frame
   in every run carried the `{winner: null, reason: null}` fallback; after it,
   all of them carry the real result.

### 4.2 A scripted session that plays

Driven by a small out-of-repo script that reads the printed board and types ids
(`/tmp/.../console-drive.py`; not committed — the console is the interface being
tested, not the script). Nine player turns, then `q`.

```
== state == turn 1 (round 1)  MAIN1  active:0  priority:0
  p0 Human  life 20   hand 6  lib 33  gy 0  exile 0   mana -
   hand 5 Quantum Reduction
   hand 37 Island
   hand 27 Web Up
   hand 35 Island
   hand 6 Pym Particles
   hand 39 Robotics Mastery
     bf 38 Island
  p1 Forge AI  life 20   hand 5  lib 35  gy 0  exile 0   mana -
   hand 60 ??
   hand 80 ??
   hand 76 ??
   hand 67 ??
   hand 44 ??

== ask a1  choose_list  "Choose optional costs"
   0) Teamwork – Tap any number of untapped creatures you control other than CARDNAME with total power 2 or greater
  answer: <index>[,<index>...]  (min 0, max 1), empty line = none, . = default
<<< ''       (ask choose_list -> none)
```

**Redaction is visible in the terminal**: the viewer's hand is named, the AI's
is five `??` lines with their ids.

What the session did, read back out of `var/games/console-play-42/frames.jsonl`:

```
plays by seat 0: land 38 (Island), land 37 (Island), land 35 (Island),
                 cast "Quantum Reduction (5) - Attach to Peggy Carter, S…"
final battlefield (seat 0): Island, Island, Island, Quantum Reduction
```

Three lands played by typing their ids and one spell cast — clicks work through
the console. Also exercised on the way: the mana-payment input
(`== input == "Web Up\n\nPay Mana Cost: {2}{W}"`, `[ok] Auto (disabled)`,
`[cancel] Cancel (enabled)`) answered with `cancel`; the "not selectable"
notice for a card with no playable ability; and `chooseSingleEntityForEffect`
for A.I.M. Scientists' library search.

Summary: 9 player turns, 135 state frames, 591 log lines, ask kinds
`[choose_list, choose_entities]`, `UNIMPL` none, 19 of 37 members, 0 emit
errors.

### 4.3 The Teamwork case to try by hand

`decks/pacho-shield.dck`'s two `K:Teamwork:2` cards — **Quantum Reduction** and
**Helicarrier Strike** — are protocol §4.2's canonical case: accept the optional
cost at the `choose_list` above (type `0`) with two or more creatures on the
battlefield, and Forge puts up an `InputSelectCardsFromList` whose **OK stays
disabled until the tapped creatures' total power reaches 2**. The console prints
the selectable ids and, the first three times OK is disabled with a non-empty
selectable list, the reminder:

```
  (OK is disabled and cards are selectable: the engine wants a CARD CLICK. Type one of those ids.)
```

It was **not** reached in these runs: the scripted policies decline the optional
cost, and by the time a creature was on the board the games were over. It is the
first thing to try in a real sitting.

---

## 5. `Snap.card`'s zone fallback (deliverable e)

`PLAN.md` "M1 follow-ups": the redacted stub's `zone` was nullable in
`docs/protocol.md` and non-null in `protocol.ts` and in the checker. Picked the
non-null spelling, in the one function:

```java
final String zone = zt != null ? lower(zt.name())
        : zoneHint != null ? zoneHint : "unknown";
```

`zone` is now non-null by construction for every card, redacted or not. No
frame in the three new fixtures carries `"zone":null` (0 occurrences in
5.4 MB), and the committed M1 fixtures are byte-identical — the fallback only
fires for a card with **no** `ZoneType` **and** no caller hint, which is exactly
the ask-option path M2 introduced.

---

## 6. Nothing was written outside the repo (deliverable f)

Window: 2026-09-11T20:46:41Z to the end of the runs. `~/.forge` and `~/forge`
compared by `find -printf '%T@ %p' | sort | sha1sum` before and after:

```
before: 623069ab09002e8e379de41a0a4a4a24b1f87d4e  (~/.forge)
        31dee7cff78667dc13f52c0cf3aa8c13b9ac05dc  (~/forge, depth 2)
after:  623069ab09002e8e379de41a0a4a4a24b1f87d4e
        31dee7cff78667dc13f52c0cf3aa8c13b9ac05dc
$ find /home/justin-a/.forge /home/justin-a/forge -newermt "2026-09-11 20:46:41"
(no output)
```

Forge's profile stayed redirected into `var/`; `FModel.getPreferences().save()`
is never called — `MtgTable` sets `FPref.PLAYER_NAME` in memory when it is
blank, precisely so `HostedMatch` does not reach
`GamePlayerUtil.setPlayerName()`, which opens a dialog **and** saves.

---

## 7. Findings a later reader should not have to rediscover

1. **The input path is the game.** Coin toss, mulligan, "return a card to the
   bottom", discard-to-hand-size, targeting, mana payment, attackers, blockers
   — all `input`, none `ask`. Three ask kinds fired in four complete games.
   Report 07 §0.8 was right and it is the single biggest scheduling fact.
2. **`handleGameEvents` off the game thread is real**, 4–67 times per game. The
   buffer is load-bearing, not defensive.
3. **`GameEventGameOutcome` can be posted from the EDT** (§4.1 item 2). Report
   07 §4.3 assumed the game thread. The thread assert is what found it.
4. **An act before the first input can crash Forge's setup** (§4.1 item 1).
   Not a hypothetical: it reproduced every time with a piped stdin.
5. **`AbstractGuiGame.awaitNextInput()` re-pushes prompt and buttons on a
   250 ms timer** for as long as the engine is thinking, so "the board has
   settled" cannot mean "no frames arrived". `AutoTransport` treats an input
   frame identical to the previous one as *not* activity. Before that fix the
   policy made one decision every 2 s and a game took ten minutes.
6. **`InputAttack`'s prompt does not say "declare attackers"** — it says
   "Select creatures to attack Forge AI or select player/card you wish to
   attack" — and its Cancel only redraws the same prompt. A policy that
   fell back to Cancel there produced **13,898 input frames in one combat
   step**. The fallback is OK, and only OK, unless OK is disabled.
7. **One act per settled board, not one per frame.** `showPromptMessage` and
   `updateButtons` are two EDT calls and therefore two `input` frames; acting on
   each of them fires three clicks for one decision and queues them all on the
   EDT.
8. **`selectCard` returns false for a card with no playable ability**
   (`InputPassPriority.onCardSelected` → `getAllPossibleAbilities(player, true)`),
   which is the engine's own answer to "that click did nothing" and is
   surfaced as `notice{warn}`. Forge does **not** put priority-time plays in
   `setSelectables`: during `InputPassPriority` any card is clickable, so an
   empty `selectable` list does not mean "nothing to do".

---

## 8. What M2 does not do

- **Three of the eleven ask kinds have ever been dispatched by the engine.**
  Counted across **eleven recordings** — the five committed human-seat fixtures
  plus six independent runs at seeds 42 / 7 / 2026 / 11 / 99 (the verification
  pass, 2026-09-11) — the only kinds Forge has ever asked for are `choose_list`,
  `order` and `assign_damage`; the third needed a deck built for it (§9.3), and
  `choose_entities` has been reached exactly once, by hand, in a scripted console
  session. The remaining eight — `confirm`, `options`, `text`, `ability_menu` as
  a real menu, `choose_entities`, `assign_amount`, `manipulate_list`, `sideboard`
  — are implemented against report 07 §7, `mtgtable.AskSelfTest` and the
  hand-written fixture, **not against a game**.
  This is the bound on `PLAN.md` M3's "the protocol is now proven against every
  question the engine actually asks": it is proven against three of eleven by the
  engine, and against eleven of eleven by a self-test whose input we wrote.
  Closing it is M5 work, and it is the same move that produced the two probes
  already committed: add a deck that **forces** the question. Two are worth
  building first, because they are the largest reveal surfaces —
  one that forces `choose_entities` with a `delayedReveal` (a library search) and
  one that forces `manipulate_list`.
- **`abilities[]` on a card is still `[]`** — in **every** frame of **every one
  of the eleven recordings**, so `state.abilities[]` and the `clickAbility` act
  have zero engine evidence, exactly like the eight ask kinds above. Filling it
  needs `Card.getAllPossibleAbilities`, which takes a `Card` and not a `CardView`
  (report 06 S10). `clickAbility` therefore resolves only against the last
  `ability_menu` ask, which is the only place a `SpellAbilityView` currently
  reaches the client.
- **`input.focusCard` is serialised only when `setCard` arrives on the game
  thread.** That is where the cards *not in the snapshot* come from (surveil,
  `willPutCardOnTop`); an EDT focus is always a card the client already has, and
  it travels as `focusCardId` alone. R1 forbids serialising there. For
  `pacho-shield` the split is **0 / 49** — the feature is legal and unexercised,
  which the run summary now prints — and `decks/scry-probe.dck` is the deck that
  moves it (§9.3).
- **`setYield` and the yield marker are M6**; `setPhaseStop` is wired to the
  `EnumMap` seeded from `FPref.PHASES_HUMAN` / `PHASES_AI` (report 11 §3.3) but
  nothing sends the act yet, and `players[].phaseStops` is not on the wire.
- **No `state_patch`, no delta.** Snapshots, as in M1: 1.2–2.6 MB per game.

---

## 9. The review pass (2026-09-11, after M2 first shipped)

A reviewer read the first human-seat recordings and found ten things. What
follows is what was run to close them, with the numbers.

### 9.1 `notice` was the third ungated string path (major)

`IGuiGame.message(message, title)` wrote both arguments verbatim, and
`PlayerControllerHuman.notifyOfValue` passes
`CardView.get(sa.getHostCard()).toString()` — Forge's `name (id)` — as the
*title*. Reproduced in five independent logs; in `human-auto-42.jsonl` the frame
read

```json
{"type":"notice","body":{"level":"info","title":"Thriving Isle (49)","text":"Forge AI picked White"}}
```

one frame before card 49 was legitimately revealed, while the last snapshot still
held 49 as a five-key stub in the opponent's hand.

`Snap.sweepText(raw, concealedIds)` is §3.6 rule 1's sweep on its own;
`WireGuiGame` caches each frame's concealed-id set on the game thread beside
`cardIndex` / `playerIndex` and sweeps both notice strings. Re-recorded at the
same seeds, the title is now `""`:

```
seed 42   notices swept = 2      seed 7   notices swept = 1     seed 2026  notices swept = 0
{"type":"notice","body":{"level":"info","title":"","text":"Forge AI picked White"}}
```

`tools/check-redaction.mjs` now shape-checks `notice` and `over` bodies and scans
`notice.title` / `notice.text` as a **failure** (it is our gate, not Forge's
phrasing). Run against the *old* committed fixtures it fails them, which is the
proof the assertion has content:

```
FAIL  fixtures/games/human-auto-42.jsonl:627: notice.title names card #49 …
FAIL  fixtures/games/human-auto-7.jsonl:659:  notice.title names card #49 …
```

### 9.2 `over` was emitted only from `finishGame` (major)

`printf "\n\n\n\nq\n" | ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42`,
four runs, before: **2 of 4** wrote no `over` frame at all, skipped the summary,
and exited 0. After making the outcome capture the emitter:

```
run 1: exit=0 over_frames=1 mtgtable_ok=1      run 3: exit=0 over_frames=1 mtgtable_ok=1
run 2: exit=0 over_frames=1 mtgtable_ok=1      run 4: exit=0 over_frames=1 mtgtable_ok=1
```

and the last line of every log is the `over` frame, directly after the `state`
that carries the same body as `gameOver`. The masking is gone too:
`ConsoleTransport.quit()` halts with **2**, not 0, when there is still no `over`.
Proved by mutation — `emitOver` stubbed to return immediately:

```
MUTANT exit=2
-- the game never reported `over` after a concede; exiting 2 (protocol section 7: …)
```

### 9.3 Nine of eleven ask kinds had never been dispatched (major)

Two answers, in order.

**(a) A Java self-test.** The answer marshalling moved to `mtgtable.Ask` — no
`forge.*` imports, generic over `T` — and `mtgtable.AskSelfTest` drives every
kind of it from real JSON through `Json.parse`, in `bridge/build.sh`:

```
JsonSelfTest: 38 check(s), 0 failure(s)
AskSelfTest: 62 check(s), 0 failure(s)
```

It fails on the mutation §5.3 warns about — `blockers.get(i - 1)` → `blockers.get(i)`:

```
FAIL assign_damage: index 0 is the defending player, as the null key   expected: 2  actual: null
FAIL assign_damage: index 1 is the FIRST blocker                       expected: 3  actual: null
build exit=1
```

**(b) Two probe decks, and the games they reach.**

| deck | what it forces | recording |
|---|---|---|
| `decks/trample-probe.dck` (18 Forest + 22 Garruk's Companion, 3/2 trample) | `assign_damage` — `PlayerControllerHuman.java:289` asks the GUI only for a trampler or a double block | `fixtures/games/human-trample-7.jsonl` |
| `decks/scry-probe.dck` (24 Island + 16 Opt) | `input.focusCard` — scry 1 with **D13**'s pref off routes to `willPutCardOnTop`, which pushes `setCard` on the game thread with a *library* card | `fixtures/games/human-scry-7.jsonl` |

**The re-record recipe, in full — `--deck2` is load-bearing.** Both probe
recordings are `pacho-shield`'s *opponent* replaced as well, and leaving
`--deck2` off changes what the engine asks: six re-records of
`human-trample-7` without it produced **no `assign_damage` ask at all**, which
would silently destroy the only engine evidence for that kind. The five
committed seat fixtures are exactly:

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 42   --game-id human-auto-42
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7    --game-id human-auto-7
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 2026 --game-id human-auto-2026
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 --game-id human-trample-7 \
    --deck decks/trample-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --seed 7 --game-id human-scry-7 \
    --deck decks/scry-probe.dck    --deck2 decks/morph-probe.dck
# then, for each:  cp var/games/<id>/frames.jsonl fixtures/games/<id>.jsonl
```

The `--game-id` is not cosmetic either: it is written into the session header and
into every `state.gameId`, so a fixture recorded under a different id differs from
the committed one on every line.

**Re-recorded 2026-09-11** for amendment **M14** (the asynchronous
`ability_menu`). `human-auto-42` went from 1,611 to 1,588 lines and from two ask
kinds to four — `choose_list`, `order`, **`ability_menu`** (7) and
**`assign_damage`** (1, from the primary deck, which had never reached it).
`human-auto-7` gained one `ability_menu`; `human-auto-2026`, `human-trample-7`
and `human-scry-7` are unchanged in shape (their policies never clicked a
multi-ability card), and the two probe properties this section exists for survive
intact: 24 `input.focusCard` pushes in `human-scry-7`, one `assign_damage` ask in
`human-trample-7`. All five PASS `check-redaction.mjs`.

The `assign_damage` ask, from the engine, first try:

```json
{"kind":"assign_damage","attackerId":28,"total":3,"overrideOrder":true,"maySkip":false,
 "targets":[{"id":0,"defender":true,"label":"Forge AI","kind":"player","playerId":1,"lethal":null},
            {"id":1,"defender":false,"label":"Face-down card","kind":"card","cardId":55,"lethal":2,
             "card":{"id":55,"name":"","setCode":"???",…,"faceDown":true,"alt":null,…}}]}
```

— the defender at index 0, a **face-down** blocker at index 1 with its remaining
toughness, and the option label gated to `Face-down card` rather than the card's
name. Answered `{"1":3}`.

The scry probe: **24** `input` frames carry a serialised `focusCard`, **12** of
them a card no frame of that log contains (`"zone":"library"`) — amendment H's
entire reason, exercised end to end for the first time. `web/test/human-seat.test.ts`
asserts both, by fixture name.

### 9.4 The seven minors

| finding | what changed |
|---|---|
| `Snap.card(o,cv,viewer)` / `Snap.label` were fail-open for a null `ZoneType` | gate 0 (`concealedByZoneHint`) now conceals a zoneless card whose owner is not the viewer; a **null owner** stays visible, which is what keeps `chooseCardsPile`'s synthetic pile headers renderable (§3.3). `reveal()` counts an unzoned full card instead of returning early |
| `input.focusCard` was null in 100% of frames | counted and printed: `focus pushes = 0 on the game thread …, 49 elsewhere` for `pacho-shield`; **12 / 32** for the scry probe |
| three ask fields had an undeclared null path | `ability_menu` is skipped when `host == null`; `text.initial` defaults to `""`; `assign_damage.attackerId` is declared `number \| null` at both ends. `check-redaction.mjs` now asserts the exact key set and declared type of every ask body, per kind (`ASK_SHAPES`), and three new negative controls prove it |
| `NullTransport` wrote no `answer` frames | it answers through `Inbound.onAnswer` on the io thread like any client: `A12 answers=8 … unanswered asks=0` where it used to say `answers=0, unanswered asks=8`. The session header gained `transport`, which is how the checker tells "answered null on purpose" from a bridge that wedges Forge |
| `Transport.Inbound`'s thread comment was false | it now says what the asserts enforce, names the watchdog and quit-thread exceptions, and `onDisconnect` asserts like its siblings |
| the docs did not describe the delivered state | `PLAN.md` M2 is **done**, the six M1 follow-ups are marked closed with how each was proved, `docs/protocol.md` gained amendments **M1–M7** plus §8.4/§8.5 entries for human-seat recordings, and `CLAUDE.md` documents `--opponent-library-ok`, vitest and the second self-test |
| (found in passing) `blockers` events map an unblocked attacker to itself | Forge's own payload (`PhaseHandler.java:728-736`); documented as amendment M7 rather than silently reshaped |

### 9.5 The gate

`tools/check-all.sh` grew a step: a fresh `--transport null` game, asserted to
print `MTGTABLE OK`, to write **exactly one** `over`, and to have that `over` as
its last line — then run through `check-redaction.mjs`, which is the only place
the gate sees an `ask`, an `answer`, a `notice` or a `c2s` line from a live
emitter. The negative-control corpus is twelve probes, three of them new.

---

## 10. The verification pass (2026-09-11, an independent replay of §1–§9)

A verifier rebuilt from scratch, ran six games at five seeds, re-derived the
member count and the thread inventory, and hand-audited the redaction claim
(3,594 opponent-hand entries, all five-key stubs). The gate passed; no leak was
found. Seven findings came back. What follows is what was run to close them.

### 10.1 `GameLog.close()` self-deadlocked against its own appender (major)

`close()` was `synchronized` and held this object's monitor across its own
`thread.join(30_000)`, while `drain()` took that same monitor for
`synchronized (this) { lines++; }` after every written line. A line in flight
when `close()` took the monitor could never reach the `POISON`, so the join
**always** timed out — and `MtgTable.main` / `RecordMatch` call `System.exit`
immediately afterwards, which kills the daemon appender mid-file.

Reproduced with a standalone probe (`mtgtable.Probe`, scratch only) against the
committed `GameLog` and against the fixed one, same JVM flags, same jar:

| queued lines | HEAD `close()` | HEAD `lines()` | fixed `close()` | fixed `lines()` |
|---|---|---|---|---|
| 1 | **30,000 ms** | 1 (want 2) | **0 ms** | 2 |
| 5 | **30,000 ms** | 0 (want 6) | **0 ms** | 6 |
| 20,000 | **30,000 ms** | 4,662 (want 20,001) | **13 ms** | 20,001 |

The fix: `lines` is an `AtomicLong`, the appender takes **no** lock, and
`close()` holds the monitor only to set `closed` and queue the `POISON` — the
`POISON` goes in *inside* that block, under the same monitor every `enqueue`
holds, so no frame can be queued behind it and lost. The join is outside, and a
join that still times out now **throws** an `IOException` naming the file and the
line count, because a silently truncated log is worse than a failure.

`mtgtable.GameLogSelfTest` (35 checks) is the regression test, run by
`bridge/build.sh` beside `JsonSelfTest` and `AskSelfTest`. Mutation discipline,
proved: re-introducing the two halves of the defect (`synchronized void close()`
plus `synchronized (this) { lines.incrementAndGet(); }`) in a scratch copy makes
it exit 1 with

```
java.io.IOException: the frame-log appender (mtg-table-log) did not finish within
30000 ms: …/bulk.jsonl is INCOMPLETE (5952 line(s) written, 14049 still queued)
```

Visible in real runs: the verifier measured `total wall` exceeding `game wall` by
exactly 30 s in 2 of 6 games. After the fix, over four fresh games the gap is
2.1–2.2 s (auto seed 42: game 30,126 ms / total 32,258 ms; auto seed 11: 20,642 /
22,750), and `./tools/check-all.sh` runs **two more games than before in less
wall time** (1 m 21 s vs the verifier's 1 m 27 s).

### 10.2 `selectable` was not what §4 said it was (major) — amendment M8

See `docs/protocol.md` amendment **M8**, §4, §4.1 and §4.2. Measured over the
committed corpus by `web/test/human-seat.test.ts`:

| recording | `clickCard` acts | outside the preceding `selectable.cardIds` | while `mode === "none"` | rejected by the engine |
|---|---|---|---|---|
| `human-auto-42` | 86 | **78** | 78 | 5 |
| `human-auto-7` | 63 | 57 | 57 | 2 |
| `human-auto-2026` | 51 | 48 | 48 | 21 |
| `human-scry-7` | 96 | 96 | 96 | 69 |
| `human-trample-7` | 49 | 49 | 49 | 6 |
| **corpus** | **345** | **328** | **328** | 103 |

Every out-of-set click arrived while `mode === "none"` — there is no third case —
and far more of them were accepted than rejected, which is the half that makes
`selectable` demonstrably *not* the clickable set. `InputPassPriority` never
calls `setSelectables`, so this is simply what having priority looks like.

The test is a mutation test, not a tautology: rewriting a copy of
`human-auto-42.jsonl` so that every `input.selectable.cardIds` contains the id
clicked next — i.e. making the old spec true — fails it with
`0 clickCard acts named an id outside input.selectable.cardIds`.

Mirrored in `docs/research/10-board-ui-spec.md` (§0.0 item 6, the §5.1 affordance
table, §18.3) and in `web/src/render/Board.tsx`, where the outline stays and the
comment no longer tells M3 to gate a click on it.

### 10.3 The five other findings

| finding | what changed | how it was proved |
|---|---|---|
| `onResync()` armed `inputSeen` through `mutateInput`, disarming `applyAct`'s pre-input guard — M3's browser autoconnects, sends `resync`, then may send `concede` straight into `Match.prepareAllZones` | `engineInput()` (Forge-driven: prompt, buttons, selectables, highlight, weak, focus, zone hints) is the only thing that arms it; `onResync` uses the plain `mutateInput` | the flag is now written in exactly one place, named in its javadoc; the transport test is listed on M3's doorstep in `PLAN.md` |
| the class-init assert "no thread name we create starts with `Game`" covered 2 of the 7 names M2 ended up with | all seven are constants; `HeadlessGuiBase`'s static block checks the whole set against the stronger `mtg-table-` prefix (`javap -c` confirms all seven are `ldc` string constants, so **no class is loaded** and hard rule 1 is untouched); `tools/lint-bridge.sh` **section 6** greps every `new Thread(` for a name that resolves to one | three negative controls, each reverted afterwards: `new Thread(this::drain)` (no name), `new Thread(this::drain, "GameLog-appender")` (the `Game` prefix), `new Thread(this::drain, BAD_NAME)` (an undeclared constant) — all three make the lint exit 1 |
| the gate never ran the console or auto transports | `check-all.sh` steps 8 and 9: the documented `printf "\n\n\n\nq\n"` console smoke (exit 0, exactly one `over`, `over` last) and `--transport auto --seed 11` (a seed no fixture uses; `finished = true`, `UNIMPL members = none`, `emit errors = 0`, one `over`, `over` last). Both logs go through `check-redaction.mjs` | the console session writes 12 lines, one `over`, terminal; the auto session 14 player turns, `[choose_list]`, no UNIMPL, no emit errors |
| the documented console smoke produced an artifact the repo's own gate **rejected** ("not one card was redacted") | `check-redaction.mjs` downgrades its two *proves-nothing* assertions to warnings when every `state` in the file is `turn: 0` — a pre-game session has nothing to conceal. They stay failures for any file that reached turn 1 | `node tools/check-redaction.mjs var/games/check-all-console/frames.jsonl` → `PASS` with the two warnings spelled out; the twelve negative controls still fail as before |
| two emitter defects: `seq: 0` for a frame emitted before `openView`, and `String.valueOf(t)` as an option label in `assignGenericAmount`'s fallback arm | amendment **M9** (`GameLog` numbers a pre-header frame and holds it, bounded, until line 0 exists) and `t.getClass().getSimpleName()`, matching the sibling arm in `assignCombatDamage` | `GameLogSelfTest` asserts the held frames come back as seq 1, 2, 3 in order after the header, that no frame is numbered 0, and that a header which never arrives still closes promptly and leaves an empty file rather than a headerless one |

### 10.4 The fixes are wire-neutral, and one thing they did not fix

`check-all.sh` step 6 (normalise `t` / `startedAt` / `gameId`, then diff a fresh
`RecordMatch` against `fixtures/games/g1.jsonl`) is **byte-identical, 377
lines**, so `Snap`'s output is unchanged. For the human-seat path, the same seed
was run on a build with this pass's three `WireGuiGame` edits reverted and on the
shipped build: **both produce 1,610 lines / 226 `state` frames**, identical
counts and the same terminal `over`.

Worth recording because it is a real difference and it is **not** ours: the
committed `fixtures/games/human-auto-42.jsonl` has **1,611** lines and **227**
`state` frames — one extra snapshot, the final one carrying
`gameOver`, immediately before `over` — and two frames near the opening are
interleaved differently. Today's emitter reaches `over` through
`captureOutcome()` rather than through a last `flushState`, so that final
snapshot is not emitted. The reverted build produces the same 1,610, so this
drift predates this pass; it is the interleaving §8.7 warns about plus one
genuine missing frame, and it is the first thing to look at if a reader wonders
why `over` sometimes has no `gameOver` state in front of it. The fixtures were
**not** regenerated: no wire shape changed in this pass, and the redaction
contract, the ask/answer pairing and the M8 counts all hold over them as
committed.

---

## 11. Status (2026-09-11, after the docs pass)

Where M2 stands as of the last commit-ready working tree, written for whoever
opens this file next and wants the one-screen answer.

### 11.1 The gate, run once, today

```
$ ./tools/check-all.sh
...
check-all OK
ELAPSED 86.36 s
EXIT=0
```

**Exit 0 in 86 s**, twelve steps, nothing skipped. What each step actually
printed, so a future reader can diff against it rather than re-derive it:

| step | what it ran | what it said |
|---|---|---|
| 1–3 | `check-forge.sh`, `lint-bridge.sh`, `bridge/build.sh` | clean; the build's three self-tests (`JsonSelfTest`, `AskSelfTest`, `GameLogSelfTest`) all pass |
| 4 | `Smoke` | `cards in DB = 95126 printings, 33137 unique`, `SMOKE OK` |
| 5 | a fresh `RecordMatch` at seed 42 | `frames = 374 state + 2 other = 376`, `UNIMPL members = none` |
| 6 | the value-level drift diff | `OK: 377 normalised lines identical to fixtures/games/g1.jsonl` |
| 7 | `MtgTable --transport null --seed 42` | `finished = true`, `ask kinds = [choose_list, order]`, `UNIMPL members = none`, `emit errors = 0`, **`notices swept = 2`** — the M1-amendment gate firing on a real run |
| 8 | the scripted console smoke | exit 0, exactly one `over`, `over` last |
| 9 | `MtgTable --transport auto --seed 11` | `finished = true`, `winner = Forge AI, reason = AllOpponentsLost`, `player turns = 14 (round 7)`, `ask kinds = [choose_list]`, `UNIMPL members = none`, `emit errors = 0` |
| 10 | `check-redaction.mjs` | **16 files PASS**: eleven committed fixtures, one synthetic, and all four of this run's fresh recordings |
| 11 | `check-redaction-selftest.mjs` | the twelve one-defect probes are still rejected |
| 12 | `npm run build && npm test` | 222 `node --test` assertions, then 17 vitest render tests — `<Board/>` mounts over all five human-seat fixtures |

New in this pass: **every JVM step runs under `timeout`** (`GAME_TIMEOUT`,
default 300 s, `--kill-after=15s`), and a run that hits the cap dies with a
message naming the cap rather than hanging the gate. The slowest single game in
this run was well inside it; the cap exists because a wedged game thread is the
defect class M2's threading model is most exposed to, and the `GameLog.close()`
self-deadlock §10.1 found had already burned a silent 30 s per run without
failing anything.

### 11.2 Redaction, counted over the committed corpus

Recomputed directly from the five committed human-seat fixtures, not quoted from
an earlier run:

| fixture | opponent hand cards | shapes other than the five-key stub |
|---|---|---|
| `human-auto-42.jsonl` | 431 | 0 |
| `human-auto-7.jsonl` | 676 | 0 |
| `human-auto-2026.jsonl` | 531 | 0 |
| `human-trample-7.jsonl` | 798 | 0 |
| `human-scry-7.jsonl` | 728 | 0 |
| **total** | **3,164** | **0** |

Exactly one key set occurs across all 3,164: `{controller, hidden, id, owner,
zone}`. That is hard rule 8's "only concealed shape", measured rather than
asserted.

### 11.3 The ask-kind count, reconciled

Three numbers have been quoted in three places and they are not in conflict once
the corpus is named:

- **three** ask kinds appear in the **committed** fixtures — `choose_list`,
  `order`, `assign_damage` (grep the `"type":"ask"` lines; the other `kind`
  values on those lines are *option* kinds, not ask kinds);
- **four** have been dispatched by the engine **ever**, adding `choose_entities`
  from the scripted console session of §4.2, which is not committed;
- **seven** have no engine evidence at all: `confirm`, `options`, `text`,
  `assign_amount`, `manipulate_list`, `sideboard`, and `ability_menu` as a real
  multi-option menu.

§8's "three of eleven" is the committed-corpus number and stands. The bound it
puts on M3's deliverable is unchanged.

### 11.4 What is open

Eight follow-ups, listed in full under **"M2 follow-ups — open"** in `PLAN.md`
and not duplicated here. In one line each: the missing final `gameOver` `state`
before `over` (amendment M4 vs. `captureOutcome`, a decision plus a re-record);
the seven unevidenced ask kinds; gate 0's `"unknown"` arm, never observed at
runtime; amendment M9's pre-header path, self-test-only; whether the `transport`
session-header key becomes mandatory; report 07 §10 step 3, still wrong;
`emitOver`'s retained wait loop; and the two transport tests that belong to M3.

**None of them is a known leak.** The redaction gate is closed, tested by
twelve negative controls, and measured over 3,164 concealed cards above.

### 11.5 Where M2 is written down

| Document | What it now carries |
|---|---|
| `DECISIONS.md` | **D15–D19**, the five decisions this milestone made: the ask timeout as a transport policy; `AutoTransport` as the automated human with `NullTransport` overriding only its answer half; acts on the virtual EDT and answers on `mtg-table-io`; `isLibgdxPort()` staying `false`; phase stops in `WireGuiGame`'s own map |
| `CLAUDE.md` | the lint's `CardView` ALLOW list spelled out (`Snap`, `RecordMatch`, and M2's `WireGuiGame`, each with its justification), the three `--transport` commands, and the console's full key table |
| `README.md` | *Playing the console game* — the same key table for a reader who is not Claude — plus the twelve-step description of the gate and the human-seat fixtures in the repo layout |
| `PLAN.md` | M2 marked done with what the evidence shows, the eight open follow-ups, and three more items handed to M3 with the socket |
| `docs/protocol.md` | amendments **M1–M9**. No M2 body required a new shape; every amendment is a correction the two review passes forced |

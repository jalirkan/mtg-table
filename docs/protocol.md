# mtg-table wire protocol — v1

**Status: living spec.** This file is the contract between the Java emitter in
`bridge/` and the TypeScript reducer in `web/src/`. Both ends are hand-written
against it (decision D4 — no codegen). **Change this file first, then both ends.**

Derived from `docs/research/05-architecture-synthesis.md` §3 and §4, and amended
by the audits listed below.

Transport: JSON text frames over `ws://127.0.0.1:8642/ws`, one message per frame.
Loopback bind only, no auth (an explicit non-goal). The same frames, in the same
shapes, are what `var/games/<id>/frames.jsonl` contains (§8), so a log replays
through exactly the reducer a live socket feeds.

Message *shapes* are adapted from `forge.gamemodes.net.ProtocolMethod` (45
server→client, 15 client→server), which is a battle-tested enumeration of every
question a Magic engine asks a UI. **None of its encoding is reused** —
`DeltaPacket` carries `Map<TrackableProperty,Object>` with `ColorSet`, `ManaCost`,
`EnumSet`, `CounterMap` and serialized lambdas over LZ4'd Java serialization with
`IdRef` substitution, and its entire saving assumes both ends are Forge instances.
A browser is not one.

---

## Amendments

### 2026-09-11 — M2 verification pass

Applied after an independent verifier replayed the M2 recordings and found the
spec disagreeing with them. Neither row bumps `v`; the first changes no bytes at
all and every byte of the second is one nobody has ever seen.

| # | Section | Change | Source |
|---|---|---|---|
| M8 | §4, §4.1, §4.2 | **`selectable` is the explicit selection set, not the set of clickable cards.** §4 called `selectable.cardIds` "the ids the engine will accept a click on" and §4.1 said "a card is clickable iff its id is in `state.input.selectable.cardIds`" — and **every human-seat recording falsifies it**. `InputPassPriority` never calls `setSelectables`, so the commonest interaction in Magic — clicking a card in your own hand at your own main phase — happens while `selectable` is `{"cardIds":[],"min":0,"max":0,"mode":"none"}`. Measured over the committed corpus: **78 of 86** `clickCard` acts in `human-auto-42.jsonl` name an id that is absent from the preceding `input.selectable.cardIds` (57/63 at seed 7, 48/51 at seed 2026, 96/96 and 49/49 in the two probes), all of them while `mode === "none"`, and they work — card 38 is clicked at a `Main phase, precombat` prompt with an empty `selectable` and is on the battlefield as `Island` four frames later. Reproduced by hand through the console. A board written to the old rule cannot play a land or cast a spell. `setSelectables` populates `selectable` for the *explicit* choices — targeting, discard, declare blockers, `InputSelectEntities` — and **Forge is the judge of every other click**: send the `clickCard` act and a rejected one comes back as `notice {level:"warn", title:"Not selectable"}` (5 of 152 notices at seed 42). Pinned by a test over the fixtures (`web/test/human-seat.test.ts`), because the next reader would otherwise re-derive the wrong rule from the spec. | M2 verification |
| M9 | §1, §8.1 | **A frame produced before the session header still gets a real `seq`.** `WireGuiGame.emit` wrote `seq: 0` for any frame emitted before `openView` — reachable through `applyAct`'s pre-`ready` `notice("warn","Not yet",…)` and through the `over` of a concede during the pre-game prompts — while §1 declares `seq` "monotonic, per direction, starting at 1" and says a gap means a dropped frame, so a client saw `0` and then `1`. `GameLog` now numbers such a frame, holds it (bounded), and writes it immediately after line 0 when the header arrives; a header that never arrives leaves the file empty and says so on stderr. No committed recording contains a `seq: 0`. | M2 verification |

### 2026-09-11 — M2 review pass

Applied after `WireGuiGame` shipped and a reviewer read the first human-seat
recordings. Every row is a rule the emitter could break and nothing was
watching; none of them bumps `v`.

| # | Section | Change | Source |
|---|---|---|---|
| M1 | §6 | **Both `notice` strings are gated.** They are Forge's own — `IGuiGame.message` / `showErrorDialog` — and `PlayerControllerHuman.notifyOfValue` passes `CardView.get(sa.getHostCard()).toString()`, i.e. `name (id)`, as the *title*. Measured in five independent recordings: `{"level":"info","title":"Thriving Isle (49)","text":"Forge AI picked White"}` one frame before card 49 was legitimately revealed, while the client's model held 49 as a hidden stub in the opponent's hand. Each string now goes through `Snap.sweepText` — §3.6 rule 1's sweep, in its third channel — and is `""` when it named a concealed id. `check-redaction.mjs` scans both and **fails**, not warns: it is our gate now, not Forge's phrasing. | M2 review |
| M2 | §5.2 | **Three declared nullabilities, one per end.** `assign_damage.attackerId` is `number \| null` (Forge's signature allows a null attacker and the emitter has a live path to it). `ability_menu.cardId` stays `number` — with no host card there is nothing to attach a menu to, so the bridge **skips the ask** instead of emitting a null. `text.initial` is always a string, `""` when Forge has none. The checker now asserts the exact key set and the declared type of every `ask` body, per kind. | M2 review |
| M3 | §8.1 | The session header gains **`transport`** (`"null" \| "auto" \| "console" \| "ws"`), **absent from an AI-vs-AI recording**, which has none. `--transport null` answers every ask with a literal `null` on purpose, and without this key a null-transport log is indistinguishable on disk from a wedge (A12). | M2 review |
| M4 | §7, §8.4 | **`over` is emitted by the outcome capture, not by `finishGame`.** Forge calls neither `finishGame` nor `afterGameEnd` reliably after a concede during the pre-game prompts: two of four identical console runs ended with a final `state` carrying `gameOver` and **no `over` frame at all**, and still exited 0. The frame is now emitted the instant the result exists, after the `state` that carries it, and the console's quit path exits non-zero when there is still no `over`. | M2 review |
| M5 | §3.2 | `abilities` is **`[]` in every recording to date, human-seat ones included**, and the milestone that fills it is **M5**, not M2. Report 06 §S10's route needs `Card.getAllPossibleAbilities`, which takes a `Card` and not a `CardView`, so `getAbilityToPlay`'s menu — the one place the array could come from today — only ever fires for the one-ability shortcut, which never reaches an ask. | M2 review |
| M6 | §8.4, §8.5 | **Human-seat recordings are described and listed.** §8.4 said `input` / `ask` / `notice` / `c2s` lines are absent from `fixtures/games/`; five of its files now carry them. | M2 review |
| M7 | §3.6 | The `blockers` event's **unblocked attackers map to themselves**. `PhaseHandler.java:728-736` builds the payload as `putAll(att, blockers.isEmpty() ? List.of(att) : blockers)`, so an unblocked attacker arrives as `{attackerId: n, blockerIds: [n]}`. That is Forge's encoding, faithfully relayed; a reader must not render it as "blocked by itself". `state.combat` is the authority on who blocked what. | M2 review |

### 2026-09-11 — M1 hardening pass

Applied from `docs/research/06-hidden-information-audit.md` (the reveal-path
audit), `07-wireguigame-spec.md` (the M2 implementation spec),
`08-deck-card-coverage.md` (the deck review), `10-board-ui-spec.md` (M4) and
`11-engine-comfort-features.md` (M6). Every row changes a wire shape or a rule;
none of them bumps `v`, because all growth is inside a `body` (§1).

| # | Section | Change | Source |
|---|---|---|---|
| A | §3.3 | The redacted stub gains **`owner`**: exactly five keys `{id, zone, owner, controller, hidden}`. `canBeShownTo`'s `case Hand` compares *controllers* while the zone arrays are keyed by the zone's player, so without `owner` the client cannot say whose card it is when the two differ. | 06 §6.1 |
| B | §3.4 | **`library` becomes `{count, cards}`.** `cards` holds **only** library cards for which `canBeShownTo(viewer)` is true (a continuous `MayLookAt` static — Future Sight, Bolas's Citadel, Experimental Frenzy), never a redacted stub; `count` is the full library size. Without it those cards are invisible forever, because no blocking call ever fires for them. | 06 §0.4, §6.3 |
| C | §3.2 | A `Card` gains **`alt`** — `{name, manaCost, types, power, toughness}` read from `CardView.getAlternateState()`, emitted **only** when `cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)`, and `null` otherwise. Everything else on every card is read from `getCurrentState()` only. Power/toughness are `null` and `types` is `""` for a face-down card outside `battlefield`/`stack`. **This supersedes M1's eleven-key `faceDownHidden` shape:** a face-down card takes the ordinary full branch with Forge's own `name: ""` / `setCode: "???"`, so there is now **one** concealed shape, not two (§3.3, §9 invariant 4). `protocol.ts` still *reads* the old object; nothing writes one, and `check-redaction.mjs` fails a file that carries one. | 06 §1.3, §1.4, §6.2 |
| D | §3.6 | **Events:** rule 4's parenthetical was wrong — `GameEventZone` is *not* payload-less in 2.0.14 (it carries `card()` and `sa()`); it is dropped anyway. `GameEventAddLog`, `GameEventRandomLog`, `GameEventSubgameStart`/`End` and `GameEventAnteCardsSelected` join the drop list; `targetDescription()`, `stackDescription()`, `outcomeStrings()` and `matchSummary()` are banned at field level. Four kinds added: `scry`, `surveil`, `phased`, `foretold`. | 06 §5.3, §5.4 |
| E | §9 | **New invariant 10: a `hidden` card *replaces* the client's card object for that id — it never merges.** Forge card ids are stable across zone changes (`GameAction.java:207` → `CardCopyService.java:53-55`), so a reducer that merges by id keeps a name it learned during a legitimate reveal and renders it forever after. The worst remaining leak was in `reduce.ts`, not in `Snap.java`. | 06 §0.6, §6.10 |
| F | §4.3, §5 | **The `open_zones` ask kind is deleted.** `openZones`/`tempShowZones`/`hideZones`/`restoreOldZones` reveal nothing (`PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)`); they are EDT-side "open a floating zone panel" notifications. They become the non-blocking hint `input.openZones` and are answered locally. **Eleven ask kinds remain.** | 06 §3; 07 §0.2, §0.3 |
| G | §5 | The `ask` bodies are rewritten to report 07's amendments A1–A8: every option is `{id (ask-local index), label, kind, cardId?, playerId?, abilityId?, card?}`; `order`'s body is `{source, dest, min, max, …}` and its answer `{ordered, remember}` (Forge's `OrderResult` is `(List, boolean)`, not top/bottom) and is **never** `null`; `assign_damage`'s defender is option index 0; `assign_amount` keys may be colours; `choose_list` carries `reveal: true` when Forge's `min < 0`; `confirm`/`options` carry an optional `card`; `choose_entities.delayedReveal` has a shape. | 07 §1, §7 |
| H | §4 | `input` gains **`weak`** (`setWeaklySelectable`, needed for the M5 auto-tap preview) and **`focusCard`** — `setCard`/`setPanelSelection` are frequently pushed with a card that is *not in the snapshot* (surveil, `willPutCardOnTop`), so a bare `focusCardId` renders blank. | 06 §6.9; 07 A8 |
| I | §3.2 | A `Card` gains **`token`** (`CardView.isToken()` **[jar]**). There is no other way to know, and guessing from `setCode` would be a guess. | 10 §16.1 |
| J | §10 | New section: **planned additions (M3/M6), not yet emitted** — phase stops, the yield marker, undo depth, the stack's yield fields, `input.buttons.focus`, `input.selectable.playerIds`, and the `passPriority` / `yieldTo` / `newGame` / `setYield` acts. Also: **there is no `autoPay` act.** Undo, End Turn and Auto Pay arrive as the engine's own button *labels*. | 10 §16.1; 11 §0.1, §10 |
| K | §5.3 | `FModel.getPreferences().setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false")` at bootstrap (decision **D13**) is a *protocol-relevant* deviation: with the pref on, a scry 1 from Spy Kit routes the player's **entire library** into `manipulate_list`, and library searches are routed to a board-click input for cards that are not in the snapshot. | 08 §5; 06 §0.3 |
| L | all | §10's "notes from the M1 implementation" appendix has been folded into the sections it annotates (§3.1, §3.2, §3.3, §3.5, §3.6, §8). Nothing was dropped. | — |

---

## 1. Envelope

Every frame, both directions, is exactly this object:

```json
{ "v": 1, "seq": 128, "t": 1757600000123, "type": "state", "body": {} }
```

| Field | Type | Meaning |
|---|---|---|
| `v` | int | Protocol **major** version. The reducer **throws** on a mismatch. |
| `seq` | int | Monotonic counter, **per direction**, starting at 1. Gaps mean a dropped frame. |
| `t` | int | Epoch milliseconds when the frame was produced. |
| `type` | string | One of the ten types in §2. The reducer **throws** on an unknown value. |
| `body` | object | Type-specific. Always an object, never a scalar or array, never absent. |

All growth happens **inside `body`**, so an old frame log stays parseable by a
newer reducer. Adding a field to a `body` is not a `v` bump; removing one,
renaming one, or changing a type is.

**Unknown-frame policy.** The client never silently ignores a frame it does not
understand. An unknown `type`, an unknown `ask.kind`, or a `v` major mismatch
raises in `reduce()` and renders a loud red banner naming the dropped frame. Silent
ignores are how the two hand-written ends drift apart without anyone noticing.

---

## 2. Message types — 6 server→client, 4 client→server

| `type` | dir | blocks the game thread | emitted from | summary |
|---|---|---|---|---|
| `hello_ok` | s→c | no | any | handshake reply; sent once per **game** (§2.1) |
| `state` | s→c | no | **game thread** | full redacted snapshot (§3) |
| `input` | s→c | no | **EDT** | prompt / buttons / selectables / hints (§4) |
| `ask` | s→c | **YES** | game thread | a blocking question (§5) |
| `notice` | s→c | no | any | a message to show the user (§6) |
| `over` | s→c | no | any | the game ended (§7) |
| `act` | c→s | — | — | an unsolicited user action |
| `answer` | c→s | — | — | exactly one per `ask` |
| `resync` | c→s | — | — | request a fresh `state` + `input` |
| `ping` / `pong` | both | no | — | keepalive |

**Design rule, copied verbatim from Forge (`ProtocolMethod.java:84-86`):
client→server messages never expect a reply.** All blocking is one-directional:
only the server ever waits, and only on an `ask`.

`state` replaces Forge's `setGameView` and every `update*` / `showCombat` call.
There is no separate "card updated" or "zone updated" message.

### 2.1 `hello_ok` (s→c)

Sent once, immediately after the socket opens, before the first `state`.

```json
{ "v": 1, "seq": 1, "t": 1757600000000, "type": "hello_ok",
  "body": {
    "gameId": "g1",
    "you": 0,
    "seed": 42,
    "forgeVersion": "2.0.14",
    "forgeJarSha256": "3f6c…",
    "unsupportedCards": [],
    "players": [
      { "id": 0, "name": "Pacho",    "isAi": false },
      { "id": 1, "name": "Opponent", "isAi": true  }
    ]
  }}
```

`you` is the viewing player's `id` — the seat every redaction decision in this
stream was made against. `unsupportedCards` is whatever
`Match.prepareAllZones` → `revealUnsupported` complained about **for the viewing
seat's own deck**; an empty array is the happy case, and a non-empty one should
be shown to the user, not swallowed. It is the viewer's deck alone because each
entry is a literal card name: the union over both decks would put names from a
decklist this seat has never seen into the first frame the client reads.

**A match emits one `hello_ok` per game, not one per connection.**
`HostedMatch.endCurrentGame()` nulls the `Game`, clears the human controllers and
replaces every `PlayerView`, so **every id the client cached is invalid the moment
a new `hello_ok` arrives** (`HostedMatch.java:369-407`, report 11 §8.3). The
reducer resets its card map on `hello_ok`; it does not merge across games.

### 2.2 `act` (c→s)

An action the user took without being asked. Never expects a reply; its effect
arrives as the next `state` / `input`.

```json
{ "v": 1, "seq": 7, "t": 1757600000500, "type": "act",
  "body": { "action": "clickCard", "cardId": 41 } }
```

| `action` | extra body fields | maps to | from |
|---|---|---|---|
| `clickCard` | `cardId` | `IGameController.selectCard(cv, null, null)` — returns `boolean`; `false` → a `notice` | M2 |
| `clickPlayer` | `playerId` | `selectPlayer(pv, null)` | M2 |
| `clickAbility` | `cardId`, `abilityId` | `selectAbility(SpellAbilityView)` | M2 |
| `buttonOk` | — | `selectButtonOk()` | M2 |
| `buttonCancel` | — | `selectButtonCancel()` | M2 |
| `passPriority` | — | `IGameController.passPriority()` **[jar]** — genuinely distinct from `buttonOk`, and what "pass until something happens" needs (§10.3) | M6 |
| `concede` | — | `getOriginalGameControllers().forEach(IGameController::concede)` — **never** `AbstractGuiGame.concede()`, which runs a nested confirm dialog off the game thread | M2 |
| `nextGame` | — | `nextGameDecision(NextGameDecision.CONTINUE)` | M3 |
| `undo` | — | `undoLastAction()`, gated on `canUndoLastAction` | M6 |
| `alphaStrike` | — | `alphaStrike()` — only meaningful during `InputAttack` | M5 |
| `useMana` | `color` | `useMana(byte)`, `byte = MagicColor.fromName(...)`. **A `cardId` is a `clickCard`, not a `useMana`.** | M5 |
| `setPhaseStop` | `playerId`, `phase`, `stop` | `WireGuiGame`'s own stop map (§10) — *not* `FPref`, and *not* `YieldController` | M6 |
| `setYield` | `yieldKey`, `mode` | `setShouldAutoYield(key, …)`; `yieldKey` is the **bridge-minted handle** from `state.stack[]`, never Forge's own key (§10) | M6 |

The server must tolerate any `act` arriving at any time, including one that is now
meaningless (a click on a card that just left the battlefield). The response to a
meaningless `act` is to drop it — optionally with a `notice` — never to crash and
never to block.

**There is no `autoPay` act, and there is no `endTurn` act.** Forge's own
`InputPassPriority` labels the *Cancel* button `Undo (n)` or `End Turn`, and
`InputPayMana` labels the *OK* button `Auto`
(`InputPassPriority.java:162-178`, `InputPayMana.java:376-395`; report 11 §0.1).
The client renders `input.buttons.*.label` **verbatim** and sends `buttonOk` /
`buttonCancel`. Inventing a parallel action for a button the engine already sends
is the "the board threw the engine's answer away" failure mode.

### 2.3 `answer` (c→s)

```json
{ "v": 1, "seq": 8, "t": 1757600001200, "type": "answer",
  "body": { "askId": "a17", "value": [0, 3] } }
```

Exactly one `answer` per `ask`. The shape of `value` is per-kind (§5.2, with the traps in §5.3). A second
`answer` for an already-completed `askId` is dropped with a `notice`; it is never
applied. **Answer values that reference options are ask-local indices** (§5.2),
not Forge ids.

### 2.4 `resync` (c→s)

```json
{ "v": 1, "seq": 9, "t": 1757600001300, "type": "resync", "body": {} }
```

The server replies with a fresh full `state` followed by the current `input`, and
re-sends any `ask` still outstanding. Used after a reconnect. Because `state` is a
full snapshot, resync is cheap and always correct.

### 2.5 `ping` / `pong`

`{"v":1,"seq":n,"t":…,"type":"ping","body":{}}` in either direction; the peer
replies `pong` with the same body. Keepalive only — it carries no game meaning and
the reducer ignores it.

---

## 3. The `state` body

A **full** redacted snapshot of the game as the viewing player is allowed to see
it. Built on the game thread only (`Snap.state()` opens with
`if (!ThreadUtil.isGameThread()) throw new IllegalStateException(...)`), emitted
from `handleGameEvents` and from inside value-returning `IGuiGame` methods.

```jsonc
{
  "gameId": "g1",
  "turn": 17,
  "round": 9,
  "phase": "COMBAT_DECLARE_BLOCKERS",
  "activePlayer": 0,
  "priority": 1,
  "gameOver": null,
  "players": [
    {
      "id": 0,
      "name": "Pacho",
      "isAi": false,
      "life": 17,
      "poison": 0,
      "counters": {},
      "manaPool": { "W": 1, "U": 0, "B": 0, "R": 0, "G": 0, "C": 0 },
      "zones": {
        "hand":        { "count": 5, "cards": [ /* Card */ ] },
        "battlefield": { "count": 4, "cards": [ /* Card */ ] },
        "graveyard":   { "count": 2, "cards": [ /* Card */ ] },
        "exile":       { "count": 0, "cards": [] },
        "command":     { "count": 0, "cards": [] },
        "library":     { "count": 21, "cards": [ /* Card — §3.4 */ ] }
      }
    }
  ],
  "stack": [
    { "id": 88, "sourceCardId": 41, "controller": 0, "text": "…",
      "targetCardIds": [17], "targetPlayerIds": [] }
  ],
  "stackCards": [ /* Card — the card behind each stack item, §3.3 */ ],
  "combat": {
    "bands": [
      { "attackerIds": [12],
        "defender": { "kind": "player", "id": 1 },
        "blockerIds": [31],
        "damageOrder": [31] }
    ]
  },
  "events": [ /* Event — §3.6 */ ]
}
```

### 3.1 Field notes

- **`turn` counts player turns, not rounds.** Report 04 measured 17
  `GameEventTurnBegan` events at turns 1..17 for a game whose log calls it "Turn
  9". Both are emitted: `round = ceil(turn / 2)`. **Label the UI accordingly** —
  showing `turn` where the player expects `round` is a bug report waiting to
  happen.
- `activePlayer` and `priority` are player `id`s, not array indices. They happen to
  coincide in a two-player game; do not rely on it.
- `phase` is the Forge phase name verbatim (`UPKEEP`, `MAIN1`,
  `COMBAT_DECLARE_ATTACKERS`, `COMBAT_DECLARE_BLOCKERS`, `MAIN2`, `END_OF_TURN`,
  `CLEANUP`, …), written with `PhaseType.name()`. The client maps it to a label;
  it never parses meaning out of it.
- **The first frames of a game have `turn: 0`, `round: 0` and `phase`,
  `activePlayer`, `priority` all `null`.** Two `state` frames are emitted before
  the first turn begins. `render(state)` must be total over that — a reducer that
  assumes a phase string crashes on frame 1 of every fixture.
- `gameOver` is `null` while the game is live. When it is set it mirrors the `over`
  body (§7), so a replay scrubbed to its last frame still renders the result.
- `counters` on a player is a map of counter name → int, keyed by
  `CounterType.getName()` (`P1P1`, `ENERGY`, …), and **excludes poison**;
  `players[].poison` carries that, because the UI always shows it. On a `Card`,
  `counters` carries every type with no exclusion.
- `manaPool` always has all six keys, zeros included, so the renderer never
  branches on absence.
- Zone keys are exactly `hand`, `battlefield`, `graveyard`, `exile`, `command`,
  `library`. **Every zone object has `count` and `cards`**; `count` is
  authoritative and may exceed `cards.length` only for `library` (§3.4). There is
  no `flashback` zone: `PlayerView.getFlashback()` is a derived collection whose
  members keep their real zone and are already in `library` / `graveyard` /
  `exile` (report 06 §P6).
- `combat.bands` is `[]` outside combat, and `combat` is `null` outside a combat
  phase.
- `defender.kind` is `"player"` or `"card"` (planeswalkers, battles); `id` is a
  player id or a card id accordingly.
- `stack` is ordered **bottom first**; the last element is the top of the stack,
  the one that resolves next.
- **`stack[].id` is a different id space from card ids.** It is Forge's
  `StackItemView` id, an independent counter, and **they collide**: fixture
  `g1.jsonl` has a hidden card with `id: 56` in a hand and a stack item with
  `id: 56` on the stack in the same frame. Never put both in one map keyed by
  `id`, and never resolve a `stack[].id` against `players[].zones`.
- `stack[].sourceCardId` resolves against **`stackCards`** first and the player
  zones second: a spell on the stack is in `ZoneType.Stack`, which is not one of
  the six zones a player carries. In the committed fixtures, 7 of g1's 19 stack
  items pointed at an id that existed nowhere else in the same frame. See §3.3.
- **Every `defender` on the wire is nullable** — `combat.bands[].defender` and
  `events[].bands[].defender` both. A band whose defender the engine could not
  give us is still a band; dropping it would misreport the board. Guard it.
- `stack[].sourceCardId` and `stack[].controller` are likewise nullable for the
  same reason: a stack item is never dropped, so the reader guards instead. Every
  **event** field is the opposite — see the nullability rule in §3.6.
- `stack[].text` is **`""` when the viewer may not have it** (§3.6 rule 1). It is
  a string, never null; the client labels the absence and never prints an empty
  line.

### 3.2 The `Card` shape

```jsonc
{
  "id": 41,
  "name": "Agent Phil Coulson",
  "setCode": "MSH",
  "manaCost": "{1}{W}",
  "types": "Legendary Creature - Human Spy Hero",
  "power": "2",
  "toughness": "2",
  "loyalty": null,
  "damage": 0,
  "counters": { "P1P1": 1 },
  "tapped": false,
  "sick": false,
  "attacking": false,
  "blocking": false,
  "faceDown": false,
  "token": false,
  "alt": null,
  "attachedToId": null,
  "attachmentIds": [],
  "controller": 0,
  "owner": 0,
  "zone": "battlefield",
  "abilities": [
    { "id": 7, "text": "{T}: …", "canPlay": true, "isSpell": false }
  ]
}
```

- `id` is Forge's `CardView` id and is **stable for the life of the game** — and
  across zone changes and face-down transitions (`GameAction.java:207` →
  `CardCopyService.java:53-55`). It is the only identity the client has; it is the
  key for React lists, for `act` bodies, and for `input.selectable.cardIds`. Its
  stability is exactly why invariant 10 (§9) exists.
- **`manaCost` is `null` for a card with no mana cost** — every land, every
  token. Never `""`, and never Forge's `ManaCost.NO_COST.toString()`, which is
  the literal string `"no cost"`: that is a label for a Swing table cell, not a
  value for a wire format. The bridge tests `ManaCost.isNoCost()`. A renderer
  that also accepts `""` or `"no cost"` is carrying a second source of truth;
  don't.
- `name` and `types` are always strings and never `null` (`""` if Forge has
  nothing), so a renderer never branches on their absence. `types` is Forge's
  `CardType.toString()` verbatim, which uses a plain **hyphen**:
  `"Legendary Creature - Human Hero"`. Do not expect an em dash and do not
  rewrite it.
- `power` / `toughness` / `loyalty` are **strings** (`"*"`, `"1+*"` are real
  values) or `null`. `loyalty` is `null` unless the card is a planeswalker —
  `CardStateView.getLoyalty()` returns the string `"0"` for everything else,
  which is noise. `power` / `toughness` are `null` unless the card is a creature
  or has a printed P/T.
- `sick` is summoning sickness.
- `token` is `CardView.isToken()` **[jar]**. A token has no `art.json` entry and
  no collector number; the renderer draws its generated frame and says so.
- `abilities[].canPlay` is the engine's answer and the **only** basis for showing
  an ability as available. The client does **not** predict mana payability — Forge
  itself does no payability prediction for humans.
- `abilities[].id` is what `act: clickAbility` sends back. The client echoes the
  id; it never reconstructs an ability.
- **`abilities` is `[]` in every recording, human-seat ones included, and that
  is the true answer,** not a stub. The playable-ability list is not a property
  of `CardView`; Forge asks the GUI for it through `IGuiGame.getAbilityToPlay`,
  which fires only for a human seat **and only at the moment of a click** — and
  M2 measured it firing only as the one-ability shortcut, which is answered
  locally and never reaches an ask. **M5 is the milestone that fills the array**
  (amendment M5): report 06 §S10's route is `Card.getAllPossibleAbilities`,
  which takes a `Card` and not a `CardView`, so it needs a game-thread hop that
  does not exist yet. Until then, `act: clickAbility` is resolvable only against
  the `abilityId`s the last `ability_menu` filled, and a client must not expect
  a card object to carry its own playable list.
- `setCode` is a string, or **`null` when Forge has no current state for the
  card** (`CardView.getCurrentState()` is a plain property read; the bridge
  writes `null` rather than inventing a set code). `setCode` plus `name` is what
  `art.ts` keys on. There is **no collector number** in the engine's view, so
  per-print art cannot be selected at runtime.
- `controller` and `owner` are numbers for every card in a player zone, where
  the bridge's fallback hint is that zone's own player and cannot be missing.
  **They may be `null` on `state.stackCards` and only there**, because the hint
  for a stack card is `StackItemView.getActivatingPlayer()` — the same nullable
  accessor that makes `stack[].controller` nullable. Never observed in nine
  recordings; declared because the emitter has a live path to it. (A redacted
  stub may also carry nulls — §3.3.)

#### Face-down cards and `alt`

The snapshot reads **`CardView.getCurrentState()` and nothing else**, with one
exception:

```jsonc
"alt": { "name": "Ashcloud Phoenix", "manaCost": "{2}{R}{R}",
         "types": "Creature - Phoenix", "power": "2", "toughness": "2" }
```

`alt` is read from `CardView.getAlternateState()` and is emitted **only** when
`cv.isFaceDown() && cv.canFaceDownBeShownTo(viewer)` — i.e. the viewer's own
morph / manifest / cloak / disguise, and a face-down card someone gave them
permission to look at. It is `null` in every other case, and the key is always
present. This is the single sanctioned use of `getAlternateState()` in the whole
bridge; `tools/lint-bridge.sh` rejects the identifier anywhere else, because for
an opponent's face-down permanent that accessor is the **real card** — name, mana
cost, type line, P/T and oracle text (`CardView.java:1104-1109`).

Two further rules for any card with `faceDown: true`:

- **Outside `battlefield` and `stack`, `power` and `toughness` are `null` and
  `types` is `""`.** The 2/2 Creature is `CardUtil.getFaceDownCharacteristic`'s
  artifact, not a rules fact; `CardStateView.getType()` already returns
  `CardType.EMPTY` there, `getPower()`/`getToughness()` do not, and Forge's own
  detail panel shows neither (`CardDetailUtil.java:156-180`).
- **A face-down card the viewer *controls* comes through with `name: ""` and
  `setCode: "???"`** — Forge's face-down characteristic verbatim
  (`CardUtil.getFaceDownCharacteristic`: no name, `CardEdition.UNKNOWN_CODE`, a
  2/2 Creature), not a missing value. Do not look art up for an empty name
  (`art.ts` already handles the miss) and do not print `"???"` as an edition.
  When `alt` is present, render that instead — before this amendment the viewer's
  own morph rendered as an unnamed 2/2 even though the rules let them see it.

### 3.3 One concealed shape, one concealed *face*, and `stackCards`

There is **one** card-serialisation function and it opens with **three** gates,
all of them Forge's own predicates or the caller's own knowledge. Gate 0 uses the
zone the caller already knows; gate 1 asks *may the viewer see this card at all*;
gate 2 asks *may the viewer see **which card** it is*.

Gates 0 and 1 produce the one concealed **shape**, the five-key stub. Gate 2
produces no shape at all: it decides whether the full branch may add the `alt`
block of §3.2. A face-down card the viewer may not identify is therefore an
ordinary `Card` whose *face* is missing — `name: ""`, `setCode: "???"`,
`alt: null` — which is exactly what every player at the table can see.

```java
static void card(JsonOut o, CardView cv, PlayerView me, String zoneHint, PlayerView ownerHint) {
    if (concealedByZoneHint(cv, me, zoneHint, ownerHint)         // gate 0
            || !cv.canBeShownTo(me)) {                            // gate 1
        /* {id, zone, owner, controller, hidden:true} -- the ONLY concealed shape */ return;
    }
    final boolean faceVisible =                                   // gate 2
            cv.isFaceDown() && cv.canFaceDownBeShownTo(me);
    /* full fields, always read from getCurrentState();
       "alt": faceVisible ? getAlternateState() : null            */
}
```

**Gate 0 — the zone the caller already knows.** `canBeShownTo` opens with
`ZoneType zone = getZone(); if (zone == null) { return true; } //cards outside
any zone are visible to all` (`CardView.java:625-626`). But the bridge does not
need to ask: `Snap` found the card by iterating `p.getHand()` /
`p.getBattlefield()` / `p.getLibrary()` / …, so it knows both the zone and whose
it is, and **it uses that `zoneHint` rather than `cv.getZone()`**. Without gate 0,
a `CardView` sitting in an opponent's hand whose `ZoneType` property happened to
be unset would take the **full-fields** branch and be emitted with its name beside
`zone: "hand"` from the hint. Never observed — the property is set in practice —
but a redaction decision must not depend on which property Forge happened to
populate. So: a card with no `ZoneType`, found in a **hand** or **library** that
is not the viewer's, takes the hidden branch unconditionally.

A `CardView` with no zone at all is also *logged* — `UNZONED <id>`, once per game
— because `CardView.java:626` is fail-open and every card the snapshot walks
should belong to a zone. LKI copies, `Card.getCardForUi(...)` views and the
synthetic pile headers of `chooseCardsPile`
(`new CardView(Integer.MIN_VALUE, null, "-- Pile 1 (3 cards) --")`) have a null
zone **and** a null controller, so the redacted branch tolerates a null
`zone`, `owner` and `controller` rather than dereferencing them.

**Gate 1 — `hidden`.** A card the viewer may not see at all is serialised as
**exactly this and nothing else**:

```json
{ "id": 42, "zone": "hand", "owner": 1, "controller": 1, "hidden": true }
```

No `name`, no `manaCost`, no `types`, no `power`, no `abilities`. **Five keys** —
`owner` joined the set in this amendment (report 06 §6.1) because
`canBeShownTo`'s `case Hand` compares `getController()` while the zone arrays are
keyed by the zone's player; when a control-change effect makes them differ, the
client would otherwise be guessing whose card it is looking at. Any sixth key on
a `hidden` object is a leak, and `tools/check-redaction.mjs` asserts the key set
exactly.

`canBeShownTo` encodes the whole rules answer, including `PlayerMayLook`
temporary reveals; report 04 verified it works from a pure event-bus path with no
human seat (viewer hand 3/3 visible, opponent hand 0/2). The bridge calls it with
the engine's own `PlayerView` for the viewing seat and **never** calls
`canBeShownToAny`, which returns `true` for an empty viewer set
(`CardView.java:616-620`), nor `AbstractGuiGame.mayView`, which has three
fail-open branches — one of them, `!hasLocalPlayers()`, is exactly the AI-vs-AI
recorder (`AbstractGuiGame.java:273-283`). `Snap.state()` **throws** when the
viewer is null rather than letting `canBeShownTo(null) == false` silently redact
the viewer's own hand into an unplayable game.

**Gate 2 — the face, not the object.** Gate 1 is not sufficient, and this is the
trap:
`CardView.canBeShownTo` returns `true` **unconditionally** for `Battlefield`,
`Stack`, `Graveyard` and `Command` — face down or not
(`CardView.java:629-638`) — because for a face-down permanent the *object* is
public and only its *face* is secret. A face-down permanent therefore sails
through gate 1. Forge's actual identity gate is the separate
`canFaceDownBeShownTo` (`CardView.java:688-704`), which its own
`AbstractGuiGame.mayFlip` and `AiBlockController` use, and which ends
`isInZone(Battlefield, Stack, Sideboard) && getController().equals(viewer)` —
the controller of a face-down permanent may see its face and nobody else may.
Without gate 2, whether a face-down permanent's identity leaks depends on which
`CardState` Forge happens to have selected rather than on a gate, and the
inconsistency is visible in one switch: a face-down card in **exile** is
correctly redacted by gate 1 while a face-down card on the **battlefield** is
not.

(`case Exile` is not simply "redacted", and the difference matters for foretell:
it falls through to `mayPlayerLook(viewer)`, which `Card.addMayLookFaceDownExile`
makes true for the card's own controller. So **your own foretold card passes gate
1 and fails gate 2** — a full card with `name: ""`, `types: ""`, null P/T and
`alt: null`, because `canFaceDownBeShownTo` ends
`isInZone(Battlefield, Stack, Sideboard)` and exile is not on that list. It is
the one card in the game you are allowed to look at and the protocol cannot name;
closing that is an M3 item, not a leak.)

A face-down permanent's *state* is public even though its identity is not —
everyone at the table can see that it is tapped, that it is attacking, that it
has a +1/+1 counter. **Failing gate 2 therefore does not produce a separate
object.** The card takes the full branch of §3.2, and what the gate withholds is
the face:

```json
{ "id": 213, "name": "", "setCode": "???", "manaCost": null, "types": "Creature",
  "power": "2", "toughness": "2", "loyalty": null, "damage": 0, "counters": {},
  "tapped": false, "sick": true, "attacking": false, "blocking": true,
  "faceDown": true, "token": false, "alt": null, "attachedToId": null,
  "attachmentIds": [], "controller": 1, "owner": 1, "zone": "battlefield",
  "abilities": [] }
```

`name` is `""` and `setCode` is `"???"` because that is Forge's face-down
characteristic verbatim (`CardUtil.getFaceDownCharacteristic`: no name,
`CardEdition.UNKNOWN_CODE`, a 2/2 Creature) — **not** a value the bridge blanked
out. `alt` is `null`, and that is the whole of gate 2's effect: the real card sits
one accessor away on `getAlternateState()` and nothing but the gate puts it on the
wire. Outside `battlefield`/`stack` the same card carries `types: ""` and null
`power`/`toughness`, for the reason given in §3.2 — a face-down card in exile has
no public body either.

A card whose identity is concealed therefore carries `hidden: true` (the stub) or
`faceDown: true` with `alt: null`. `protocol.ts`'s `isHidden` answers the first,
`altFace(card)` the second, and anything that must not leak an identity — an art
lookup, a name in a label — asks one of the two and cannot pick the wrong gate.
An empty `name` is never a card to look art up for.

**Superseded: the eleven-key `faceDownHidden` object (M1).** Before amendment P3
this section specified a *second* concealed shape for exactly this case:

```jsonc
// M1, SUPERSEDED by amendment P3. No emitter writes this; check-redaction.mjs
// fails any file that carries one; protocol.ts still reads one, so a stored
// pre-amendment log stays renderable.
{"id":47,"zone":"battlefield","controller":1,"faceDownHidden":true,"tapped":false,
 "attacking":false,"blocking":false,"damage":0,"counters":{},"power":"2","toughness":"2"}
```

It was dropped because it solved a problem Forge does not have while creating one
it does. What the pre-gate code actually put on the wire, measured on the same
seed, was this:

```jsonc
// pre-gate-2: the full-fields branch, because canBeShownTo is unconditionally
// true on the battlefield -- and note that it does NOT name the card
{"id":47,"name":"","setCode":"???","manaCost":null,"types":"Creature","power":"2",
 "toughness":"2","loyalty":null,"damage":0,"counters":{},"tapped":false,"sick":true,
 "attacking":false,"blocking":false,"faceDown":true,"attachedToId":null,
 "attachmentIds":[],"controller":1,"owner":1,"zone":"battlefield","abilities":[]}
```

In Forge 2.0.14 the old path did **not** leak a name: `getCurrentState()` of a
face-down permanent is already the face-down characteristic. What was wrong is
that this was an **accident of which `CardState` Forge happened to select**, not a
decision. P3 keeps the shape and adds the decision: the emitter reads
`getCurrentState()` *and nothing else*, and the single `getAlternateState()` call
in the whole bridge sits behind `isFaceDown() && canFaceDownBeShownTo(viewer)`
(`tools/lint-bridge.sh` enforces the "nothing else" half mechanically). A third
shape would have bought only a second thing for every renderer, every test and
every reader of this file to be total over.

**`state.stackCards`.** `ZoneType.Stack` is not one of the six zones a player
carries, so a spell on the stack is in no zone of the snapshot and
`stack[].sourceCardId` would resolve against nothing — leaving the renderer with
only `text` for the card that is *currently resolving*, the one moment in a game
a player most needs to see it. `stackCards` is the source card of every stack
item, through the same single gate:

- distinct card ids only, in stack order;
- a **spell**'s card has `zone: "stack"` and appears **only** here;
- an **activated ability**'s source is usually still on the battlefield and
  appears both here and in that zone — resolve by id and take the first hit;
- `[]` whenever the stack is empty, which is most frames.

There is deliberately no second path that could forget: `players[].zones`,
`stackCards` and every card inside an `ask` or `input` body (§4, §5) are all
callers of the one function.

**Forge does not redact on the wire.** `DeltaSyncManager.collectDeltas` ships
opponent hands and libraries and hides them client-side. The bridge sees
everything, so the default failure mode of any new serialisation code is leaking
it. Route every card through the one function.

**The open gap is closed.** Earlier revisions of this section carried an "open
gap, to close before M3 ships: enumerate every place `DelayedReveal` /
`tempShowZones` / `openZones` legitimately reveals library cards".
`docs/research/06-hidden-information-audit.md` §2 is that enumeration: **twelve
reveal paths**, each with its wire channel and its leak signature, and §1.2's
exhaustive grep of the three `mayLook` sets — `addMayLookAt`,
`addMayLookFaceDownExile`, `addMayLookTemp` — which is the complete dynamic-reveal
surface. Nothing else can turn a hidden card visible. The protocol consequences
are §3.4 (`library.cards`), §4.3 (`openZones` is not a question) and §5.3
(`delayedReveal`).

### 3.4 The library carries a count and the cards the viewer may see

```jsonc
"library": { "count": 21, "cards": [ /* only canBeShownTo(viewer) === true */ ] }
```

- `count` is the **full** library size, always.
- `cards` contains **only** library cards for which `cv.canBeShownTo(viewer)` is
  true, each serialised by the one function. It is **never** a redacted stub, and
  `cards.length <= count`. In an ordinary game it is `[]`.
- It is non-empty when a continuous `MayLookAt` static is running — Future Sight,
  Bolas's Citadel, Experimental Frenzy, Oracle of Mul Daya, Hidden Agenda
  (`StaticAbilityContinuous.java:925-926`, `CardFactoryUtil.java:182`). **None of
  those effects blocks**, so there is no `ask` for such a card to ride on, and
  under the old "library is always a count" rule it was invisible forever
  (report 06 §0.4, §P6).
- The emitter walks `PlayerView.getLibrary()` and discards the ~99% that fail the
  predicate. That is cheap and it is the only correct way to catch this path; do
  not shortcut it with "only the top card", which is not what the effects say.
- A library **search** (`DelayedReveal`, `tempShowCards`) delivers its cards
  through the `ask` body (§5), not through `state` — though a `state` emitted
  while the game thread is parked inside that call legitimately shows them too,
  because `tempShowCards` made `canBeShownTo` true. The frame after
  `endTempShowCards()` re-redacts them, which is why invariant 10 exists.

### 3.5 Snapshot, not delta

v1 sends full coalesced snapshots. Measured on the committed fixtures: **~9.8 KB
per frame**, 223–374 frames per game, 1.7–3.7 MB per recording. (The pre-M1
estimate of ~1.5 KB/frame was a minimal projection and was wrong by 6×; the real
number is accepted for v1 — these files gzip to 30–60 KB and only the test suite
reads them all.)

Coalescing is mandatory and comes free: `GameEventForwarder` flushes at 50 events
/ 500 ms / **whenever the `InputQueue` changes, i.e. immediately before the game
thread blocks for input** — exactly when the browser needs state. A measured 3,388
raw `GameEvent`s collapse to 605 observable states (1,528 of them `GameEventZone`);
naive per-event snapshots produced 5.3 MB.

**The `InputQueue` trigger does not exist in an AI-vs-AI game** — that observer is
registered only for a `PlayerControllerHuman` — which leaves the size and time
thresholds and collapses whole turns into single frames. `RecordMatch` therefore
registers a second subscriber that flushes the forwarder on `GameEventTurnPhase`,
`GameEventTurnBegan` and `GameEventGameOutcome`: the same boundaries a human's
input queue would have created. The result is roughly one frame per step.

If a large board ever feels slow, the upgrade is to diff **our own JSON tree** (RFC
7386 merge patch, ~80 lines in `Snap`) and add a `state_patch` type — a server-side
change only, because the reducer already applies snapshot and patch through one
path. It is explicitly **not** to couple to Forge's `TrackableProperty` dirty bits.

### 3.6 `events` — the transitions this snapshot reflects

*Added 2026-09-11 for the arena renderer (M7, `docs/ideas/arena-mode.md`). Ships in M1.*

Every `state` body carries an `events` array: the engine events whose effects this
snapshot **already reflects**, in engine order. One `state` frame is emitted per
`GameEventForwarder` flush (`IGuiGame.handleGameEvents(List<GameEvent>)`), and
`events` is that batch, mapped. It exists so a renderer can animate *transitions* —
a spell being cast, an attack, damage, a death — instead of diffing two snapshots.
The M1 text board shows it as a running log; the arena is its real consumer.

**Rules.**

1. **Events carry ids only — never card names, never oracle text.** The client
   resolves ids against `players[].zones` and `stack` of the *same frame*. An id
   that does not resolve is, by construction, a card the viewer may not see (it
   moved into a library or into the opponent's hand). That is correct, not a bug.

   The only string an event may carry is `cast.text`, the stack item's
   description — the same string as `stack[].text`, from the same
   `StackItemView`. **That string was once described here as "the stack item's
   public description". It is not public, and asserting that it was is how this
   spec shipped a false guarantee.** Forge redacts the *cast* of a morph
   (`"Morph - Creature 2/2"`) but not a *trigger* of one: a face-down creature's
   death trigger arrived as

   ```
   When Ashcloud Phoenix dies, return it to the battlefield face down under
   your control. [Zone Changer: Ashcloud Phoenix (75)]
   ```

   in the very frame in which card 75's identity was concealed from this seat — the name
   twice, and the id to join the two. So both strings go through **one**
   function, `Snap.stackText`, which applies three rules in order:

   1. **Gate.** If the source card's identity is concealed from this viewer —
      the same predicate `card()` uses (§3.3, all three gates) — the text is
      `""`.
   2. **Sweep.** If the raw text mentions `(<id>)` for *any* id this same frame
      concealed, the text is `""`. The gate alone is not sufficient: a trigger's
      `getSourceCard()` can be a last-known-information view of the card as it
      was when the trigger fired — face up, in the graveyard — while the live
      card of that id is already back on the battlefield face down, and that LKI
      view passes both of Forge's own gates. The id is what makes a concealed
      card identifiable, so the id is what is tested. **The sweep runs before the
      strip, on the raw text**, because stripping first would remove the id and
      hide the join.
   3. **Strip.** Forge appends an engine-debug annotation,
      `WrappedAbility.getStackDescription` →
      `" [" + Trigger.getImportantStackObjects(sa) + "]"`, whose payload is
      `Card.toString()`, i.e. `name (id)` — `[Zone Changer: …]`,
      `[Attacker: …]`, `[Card: …, Activator: …, SpellAbility: …]`. Nothing in the
      client consumes it, so it is removed from whatever survived the first two
      rules.

   **`text` is therefore `""` whenever the viewer may not have it.** It is
   always a string, never null; the client labels the absence
   (`stackTextLabel` → `(hidden)`) and renders the card itself from
   `stackCards`, which carries the concealed card's public half. In
   `fixtures/games/disjoint.jsonl` 10 of 41 engine strings are concealed this
   way.

   Three decisions behind that rule, recorded because each cost something:
   **a concealed text is `""`, not a synthesised description** (Forge's own
   `"Morph - Creature 2/2"` was the alternative and was legitimately public;
   `stackCards` already hands the renderer a better basis for a label than any
   string the bridge could invent, and the alternative is a second place that
   decides what may be shown); **the sweep tests ids, not names** (names are
   unbounded and localisable, and the guarantee then survives a Forge version
   that phrases the annotation differently); and **the checkers read text
   content** — `tools/check-redaction.mjs` and `web/test/fixtures.test.ts` had
   only ever asserted key sets, which is how a green suite shipped the leak.
   Re-running them against the pre-fix recording fails 2 id-joins and 13
   surviving annotations in one game.
2. Player references are player ids; card references are card ids. Where a target
   may be either, it is an entity ref: `{"kind":"player","id":1}` or
   `{"kind":"card","id":17}`.
3. **Unknown event kinds are ignored by the reducer** (logged, not thrown). Events
   are informational and never drive input, so this is the one place the
   unknown-frame policy of §1 does not apply. Adding a kind is not a `v` bump.
4. **Forge events not listed below are dropped, not emitted**, and four accessors
   are banned at field level.

   | dropped event | why |
   |---|---|
   | `GameEventZone` | a "a zone changed" ping. **It is not payload-less in 2.0.14** — **[jar]** shows `zoneType()`, `player()`, `mode()`, `card()`, `sa()` — but it is still dropped: `GameEventCardChangeZone` covers real movements, and `GameEventZone` also fires from `Player.updateFlashbackForView`, which would broadcast that a *library* card became activatable. |
   | `GameEventCombatChanged` / `GameEventCombatUpdate` | payload-less; `state.combat` carries the board. |
   | `GameEventManaPool`, `GameEventPlayerPriority` | `state` carries both. |
   | `GameEventAddLog`, `GameEventRandomLog` | free-form engine text built from `CardView.toString()` — `"X discards <card>"`, `CostReveal`, `ChangeZoneEffect`. Never redacted by Forge. **Do not build a game-log pane out of these.** |
   | `GameEventSubgameStart` / `GameEventSubgameEnd` | carry a whole `Game` object. |
   | `GameEventAnteCardsSelected` | ante is off; it names cards. |
   | `GameEventGameStarted` / `GameEventGameFinished` | `hello_ok` and `over` carry both. |
   | `GameEventCardDestroyed`, `GameEventTokenCreated`, `GameEventFlipCoin`, `GameEventRollDie`, `GameEventTurnEnded` | genuinely payload-less **[jar]**: a destroyed creature is visible as a `zone` event battlefield→graveyard, a new token as a `zone` event into battlefield with a previously unseen id. |

   **Banned accessors, never emitted from any event:**
   `GameEventSpellAbilityCast.targetDescription()` (joins `TargetChoices.toString()`
   and names targets, including library cards — `stack[].targetCardIds` carries
   the same information as ids), `GameEventSpellResolved.stackDescription()` (the
   ungated form of `stack[].text`), and
   `GameEventGameOutcome.outcomeStrings()` / `.matchSummary()` (free text). The
   bridge carries a `// not emitted:` comment beside each so a later reader does
   not "improve" the mapping.

5. **Missing ids drop the event; they never become `null`.** An event whose
   subject the engine could not give us — a `zone` with no card, a `cast` with no
   stack item, a `land` with no player — is **not emitted at all**, because an
   event with no card is of no use to a renderer and a `null` wearing a
   non-nullable type is how a renderer crashes three milestones later. The bridge
   counts every drop and `RecordMatch` prints the total (`events dropped`); the
   expected value is 0. Consequently **every `cardId` / `player` / `controller` /
   `defendingPlayer` / `target` / `counter` / `phase` in an event is non-null**,
   and the only nullable fields are nullable *by design*:

   | field | why it can be `null` |
   |---|---|
   | `zone.from` | a token created directly onto the battlefield came from nowhere |
   | `zone.to` | a token that ceases to exist goes nowhere |
   | `<zoneRef>.player` | a shared zone (the stack) has no owner |
   | `attackers.bands[].defender` | §3.1: every `defender` on the wire is nullable |
   | `attach.to` | `null` **is** the unattach event |
   | `damage.damageType` | player damage has no type enum in Forge 2.0.14 — only `GameEventCardDamaged` has one. The key is **always written**, as `null` for player damage, so the shape of a `damage` event does not depend on its target |
   | `poison.sourcePlayer` | poison from an effect with no player source |
   | `outcome.winner` | `null` is a draw |

   Anything else arriving as `null` is drift. `tools/check-redaction.mjs` asserts
   the exact key set and the runtime type of every key of every event against
   this table, so that class of drift fails in CI instead of in a browser tab.

**Implementation note (Java).** In the 2.0.14 jar the `GameEvent` classes are
records whose accessors already return *views* (`CardView`, `PlayerView`,
`ZoneView`, `StackItemView`, `GameEntityView`), e.g.
`GameEventCardChangeZone.card()/from()/to()`,
`GameEventPlayerDamaged.target()/source()/amount()/combat()/infect()`,
`GameEventAttackersDeclared.player()/attackersMap()`,
`GameEventBlockersDeclared.defendingPlayer()/blockers()`. Map them with an
`instanceof` chain on the game thread inside `handleGameEvents`; do not implement
`IGameEventVisitor` (sixty methods). Confirm each accessor with `javap` before use.
Every enum goes on the wire as `.name()`, never `toString()`.

```jsonc
"events": [
  { "kind": "cast",      "stackId": 88, "cardId": 41, "controller": 0, "text": "Quake, Agent of S.H.I.E.L.D. — …" },
  { "kind": "zone",      "cardId": 41, "from": { "zone": "hand", "player": 0 }, "to": { "zone": "stack", "player": null } },
  { "kind": "attackers", "player": 0, "bands": [ { "defender": { "kind": "player", "id": 1 }, "attackerIds": [12, 14] } ] },
  { "kind": "damage",    "target": { "kind": "player", "id": 1 }, "sourceCardId": 12, "amount": 3, "combat": true, "damageType": null },
  { "kind": "life",      "player": 1, "from": 20, "to": 17 }
]
```

| `kind` | Forge event | body (besides `kind`) |
|---|---|---|
| `zone` | `GameEventCardChangeZone` | `cardId`, `from:{zone,player}` **or `null`**, `to:{zone,player}` **or `null`** — `zone` is the `ZoneType` name lowercased (`hand`, `library`, `battlefield`, `graveyard`, `exile`, `stack`, `command`, …); `player` is the zone owner's id, `null` for shared zones. **`from` is `null` when the card did not come from a zone** (a token created directly onto the battlefield) and **`to` is `null` when it went to no zone** (a token ceasing to exist). Both occur in every recorded fixture — g1 has 8 such events, g2 4, g3 6 — so a reader that dereferences `from.zone` unguarded crashes on the primary fixture. |
| `cast` | `GameEventSpellAbilityCast` | `stackId`, `cardId`, `controller`, `text` — the same gated string as `stack[].text`, `""` when concealed (rule 1). **`targetDescription()` is never emitted.** |
| `resolved` | `GameEventSpellResolved` | `cardId`, `fizzled`. **`stackDescription()` is never emitted.** |
| `unstacked` | `GameEventSpellRemovedFromStack` | `cardId` — left the stack without resolving (countered, etc.) |
| `attackers` | `GameEventAttackersDeclared` | `player`, `bands:[{defender:{kind,id}` or `null`, `attackerIds:[]}]` |
| `blockers` | `GameEventBlockersDeclared` | `defendingPlayer`, `blocks:[{attackerId, blockerIds:[]}]`. **An unblocked attacker maps to itself** — `{attackerId: 12, blockerIds: [12]}` — because that is how Forge builds the payload (`PhaseHandler.java:728-736`: `putAll(att, blockers.isEmpty() ? List.of(att) : blockers)`). It is relayed verbatim rather than second-guessed; render it as "unblocked", never as "blocked by itself", and take `state.combat` as the authority on who blocked what (amendment M7). |
| `damage` | `GameEventPlayerDamaged`, `GameEventCardDamaged` | `target:{kind,id}`, `sourceCardId`, `amount`, `combat` (players: `combat()`; cards: `true` iff `type().name()` contains `Combat`), `damageType` (the enum name for cards, `null` for players) |
| `life` | `GameEventPlayerLivesChanged` | `player`, `from`, `to` |
| `poison` | `GameEventPlayerPoisoned` | `player`, `sourcePlayer`, `from`, `amount` |
| `tap` | `GameEventCardTapped` | `cardId`, `tapped` |
| `counters` | `GameEventCardCounters` | `cardId`, `counter` (the `CounterType` name, e.g. `P1P1`), `from`, `to` |
| `attach` | `GameEventCardAttachment` | `cardId`, `to:{kind,id}` or `null` when unattached |
| `sacrificed` | `GameEventCardSacrificed` | `cardId` |
| `land` | `GameEventLandPlayed` | `player`, `cardId` |
| `stats` | `GameEventCardStatsChanged` | `cardIds:[]`, `transform` |
| `turn` | `GameEventTurnBegan` | `player`, `turn` (player-turn number, see §3.1) |
| `phase` | `GameEventTurnPhase` | `player`, `phase` (the `PhaseType` name, same vocabulary as `state.phase`) |
| `combat_end` | `GameEventCombatEnded` | `attackerIds:[]`, `blockerIds:[]` |
| `shuffle` | `GameEventShuffle` | `player` |
| `mulligan` | `GameEventMulligan` | `player` |
| `scry` | `GameEventScry` | `player`, `toTop`, `toBottom` — **counts only**, genuinely public. `javap`: `GameEventScry(PlayerView, int, int)` with `player()`, `toTop()`, `toBottom()` |
| `surveil` | `GameEventSurveil` | `player`, `toLibrary`, `toGraveyard` — same. `javap`: `GameEventSurveil(PlayerView, int, int)` |
| `phased` | `GameEventCardPhased` | `cardId`, `phasedOut` (the record's `phaseState()`) — battlefield-public, and phasing is otherwise invisible in `state` |
| `foretold` | `GameEventCardForetold` | `player` — **the event carries no card at all** (`javap`: `GameEventCardForetold(PlayerView)`, accessor `activatingPlayer()`), which makes it safe by construction. It is the only cue that a foretell happened; the face-down card itself appears in `exile` as a stub |
| `outcome` | `GameEventGameOutcome` | `winner` (player id, or `null` for a draw — map `winningPlayerName()` to an id by name), `lastTurn`. **`outcomeStrings()` and `matchSummary()` are never emitted.** |

`GameEventTurnPhase` and `GameEventTurnBegan` fire on every step, so `events` is
rarely empty; a frame with only `phase` events is normal and animates nothing.

---

## 4. The `input` body

What the engine currently wants from the player. Assembled from Forge's
`showPromptMessage` + `updateButtons` + `setSelectables` / `setHighlighted` /
`setWeaklySelectable` / `setCard` / `tempShowZones`, and therefore emitted **from
the EDT**, not the game thread.

```json
{ "v": 1, "seq": 129, "t": 1757600000200, "type": "input",
  "body": {
    "prompt": "Declare blockers",
    "focusCardId": null,
    "focusCard": null,
    "buttons": {
      "ok":     { "label": "OK",     "enabled": true  },
      "cancel": { "label": "Cancel", "enabled": false }
    },
    "selectable": { "cardIds": [31, 32], "min": 0, "max": 2, "mode": "cards" },
    "highlighted": [],
    "weak": [],
    "openZones": []
  }}
```

| Field | Meaning |
|---|---|
| `prompt` | The engine's own prompt text. Rendered verbatim; never rewritten. |
| `focusCardId` | Card id the prompt is about, or `null`. |
| `focusCard` | **The serialised card** for `focusCardId`, or `null`. `IGuiGame.setCard` / `setPanelSelection` are frequently pushed with a card that is **not in the snapshot** — a library card during surveil or `willPutCardOnTop` — so an id alone renders blank. Produced by the one serialising function (§3.3). |
| `buttons.ok` / `.cancel` | Label and enabled flag, straight from `updateButtons`. **Render the label verbatim**: `Undo (2)`, `End Turn` and `Auto` are engine labels, not client features (§2.2). |
| `selectable.cardIds` | **The explicit selection set** — the ids `setSelectables` named for a *choice*: targeting, discard, declare blockers, `InputSelectEntities`. It is **not** the set of cards the engine will accept a click on (amendment M8): `InputPassPriority` never calls `setSelectables`, so at your own main phase this is `[]` and your hand is still clickable. May contain an id that is **not** in this frame's `state` (a library card that is a legal target): render nothing for it, never throw. |
| `selectable.min` / `.max` | How many, for that explicit choice. Both `0` when there is none. |
| `selectable.mode` | `"cards"` \| `"players"` \| `"none"`. `"none"` means *no explicit selection is outstanding* — not "nothing is clickable". |
| `highlighted` | Card ids to emphasise without making clickable. |
| `weak` | Card ids from `setWeaklySelectable` — Forge's "this would be tapped by Auto" hint. It is a multiset on Forge's side (a count of 2 means *Auto would tap it*); the wire carries the distinct ids. `[]` until M5. |
| `openZones` | Zone panels the engine asked the client to open: `[{playerId, zones:["graveyard","exile"]}]`. A **hint**, not a question — see §4.3. `[]` most of the time. |

### 4.1 `input` is a separate frame but not separate client state

A client that correlates a prompt frame against a board frame is where "the board
threw the engine's answer away" bugs live. But prompt and buttons arrive on the
EDT while the snapshot must be built on the game thread, so they cannot share one
frame without fighting the thread model.

Resolution: **two frames on the wire, one object in the client.** `reduce()` merges
`input` into the single `GameState`, so `render(state)` is total and the view never
sees two streams. A button is enabled iff the engine said so. **The client computes
legality for nothing** — not mana payability, not targeting, not stops.

**What is clickable (amendment M8).** This paragraph used to say "a card is
clickable iff its id is in `state.input.selectable.cardIds`", and the recordings
say otherwise:

- when `selectable.mode !== "none"` the engine is asking for an **explicit
  selection** and `cardIds` is that set: outline those cards, and count the
  clicks against `min`/`max`;
- when `selectable.mode === "none"` and no `ask` is outstanding, the seat has
  **priority** and the viewer's own cards are clickable anyway — that is
  `InputPassPriority`, which sets a prompt and two buttons and never calls
  `setSelectables`. 78 of the 86 `clickCard` acts in `human-auto-42.jsonl` are
  this case.

**Forge is the judge.** The client does not decide which of its own cards may be
clicked (that would be rules logic, invariant 8); it sends `act: clickCard` and
Forge answers. A click the engine will not take comes back as
`notice {level:"warn", title:"Not selectable", text:"card <id> cannot be selected
now"}` — `IGameController.selectCard` returning `false` — and nothing else
happens. A board that greys out everything outside `selectable.cardIds` cannot
play a land.

### 4.2 Invariant: disabled OK means "click a card"

**`updateButtons` with `ok.enabled === false` means the engine wants a card click,
not a button press.** Confirmed live in report 02 §4.7 — this is exactly what
stalls a button-only client at the discard step.

A UI that only renders buttons will appear to hang with no error. Whenever
`selectable.cardIds` is non-empty, the cards are the interaction.

**The converse does not hold** (amendment M8). An empty `selectable.cardIds` does
*not* mean the buttons are the only interaction: it is also the ordinary state of
having priority, where OK is enabled (`OK`, `End Turn`, `Auto` — the engine's own
labels) *and* every card in your hand is clickable. The diagnostic that matters is
narrower: **OK disabled, `selectable` empty, no outstanding `ask`, game not over**
is the signature of a wedged game thread and must be rendered loudly
(`docs/research/10-board-ui-spec.md` §5.2).

### 4.3 `openZones` is a hint, and was never a question

`openZones`, `tempShowZones`, `hideZones` and `restoreOldZones` **reveal
nothing**. `PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)` **[jar]** — there
is no card accessor of any kind on it — and the desktop implementation only opens
and closes floating zone panels (`CMatchUI.java:584-625, 1362-1386`), each of
which then renders its cards through Forge's own `mayView`. Every actual reveal
goes through `PlayerControllerHuman.tempShow*` → `Card.addMayLookTemp` →
`TrackableProperty.PlayerMayLook` → `canBeShownTo`, i.e. through `state` (§3.3).

They are also called **on the EDT**
(`InputSelectEntitiesFromList.java:65-68`, `PlayerControllerHuman.java:955-959`),
where blocking is forbidden: a value-returning method that parks the EDT stalls
every prompt with no error. So the bridge answers them locally and immediately —
`tempShowZones` echoes its argument (that value is only the token `hideZones`
will be handed back), `openZones` builds the same list `CMatchUI` builds, minus
Battlefield / Hand / Stack — and pushes `input.openZones` as a non-blocking hint.

**The `open_zones` ask kind is deleted** (report 06 §3, report 07 §0.2). Eleven
kinds remain.

---

## 5. The `ask` body — the blocking calls

**An `ask` blocks the Forge game thread until an `answer` arrives.** This is the
only place the server waits.

```json
{ "v": 1, "seq": 130, "t": 1757600000300, "type": "ask",
  "body": { "askId": "a17", "kind": "choose_list", "timeoutMs": 120000,
            "prompt": "Choose a card to discard",
            "options": [ { "id": 0, "label": "Agent Phil Coulson", "kind": "card",
                           "cardId": 41, "card": { /* Card */ } },
                         { "id": 1, "label": "Quantum Reduction", "kind": "card",
                           "cardId": 42, "card": { /* Card */ } } ],
            "min": 1, "max": 1, "reveal": false } }
```

`askId` is unique for the life of the connection. `timeoutMs` is advisory for the
client and enforced by the server.

**Every card inside an `ask` (or `input`) body is produced by the one serialising
function of §3.3**, including `delayedReveal.cards`, `manipulate_list.cards`,
`assign_damage.targets` and every option's `card`. The label leak — not the card
object — is the one that will actually happen otherwise: `String.valueOf(cardView)`
prints the real name for a card in any zone, so a `CardView` option's `label` is
`"???"` whenever its card is concealed.

### 5.1 The option object

Forge's choice methods are generic. `T` is frequently **not** a view object: it is
`MagicColor.Color` for choose-a-colour, `SpellAbilityView` for modal spells,
`Integer` / `String` for `getInteger`, and also `PaperCard`, `CostPart`,
`CardRules`, `ReplacementEffectView`. There is no usable Forge id across that set,
and `Integer 3` and `CardView 3` would collide. So:

```jsonc
{ "id": 0,                 // ask-local index into the server-side option array
  "label": "Agent Phil Coulson",
  "kind": "card",          // "card" | "player" | "ability" | "color" | "number" | "text" | "other"
  "cardId": 41,            // present iff the option is a CardView
  "playerId": null,        // present iff the option is a PlayerView
  "abilityId": null,       // present iff the option is a SpellAbilityView
  "card": { /* Card */ } } // present iff a card can be shown for this option
```

- **`id` is the ask-local index, not a Forge id.** Answers address options by
  index; the bridge keeps the `askId → Object[]` map (`pendingOpts`) and it is
  the only identity mapping in the ask path. The client only ever echoes an
  index.
- **One ask, one option array.** A kind that carries *two* lists —
  `order`'s `dest` / `source`, `sideboard`'s `main` / `side` — is presenting one
  server-side array in two halves, and the ids run across both in the order the
  §5.2 table names them (`dest ++ source`, `main ++ side`). So an option's `id`
  is unique within the ask and is never "index into the list it appears in";
  that is exactly why `order`'s answer addresses `dest ++ source` as one thing
  (§5.3).
- `kind` says how to render. The client never parses `label`.
- `card` exists because a bare label throws away the art, P/T and cost the M4/M5
  UI needs — and because building a second string for a card is how a second,
  non-redacting stringifier comes into existence.

### 5.2 The eleven kinds

Eleven kinds cover the twelve blocking `IGuiGame` methods that remain after
`openZones` / `tempShowZones` moved to `input` (§4.3).

| `kind` | `IGuiGame` method(s) | extra body | `answer.value` |
|---|---|---|---|
| `ability_menu` | `getAbilityToPlay` | `cardId` (**never null** — with no host card the bridge skips the ask), `options:[opt]` (each with `abilityId`, `label` from `SpellAbilityView.getDescription()`, `canPlay`, `isSpell`) | option index, or `null` |
| `confirm` | `confirm(CardView,…)`, `showConfirmDialog` | `prompt`, `title`, `yesLabel`, `noLabel`, `defaultYes`, **`card`** (`Card` or `null`) | `true` \| `false` \| `null` |
| `options` | `showOptionDialog` | `prompt`, `title`, `options:[opt]`, `defaultIndex`, **`card`** (`Card` or `null`) | option index, or `null` |
| `text` | `showInputDialog` | `prompt`, `title`, `initial` (**a string, `""` when Forge has none**), `suggestions:[string]`, `numeric` | string, or `null` |
| `choose_list` | `getChoices` — and everything `AbstractGuiGame` builds on it: `one` / `oneOrNone` / `many` / `reveal` / `getInteger` / `insertInList` | `prompt`, `options:[opt]`, `preselected:[index]`, `min`, `max`, **`reveal`** | `[index…]` (length in `[min,max]`), or `null` |
| `order` | `order` → `OrderResult` | `prompt`, `destLabel`, `source:[opt]`, `dest:[opt]`, `min`, `max`, `referenceCardId`, `sideboardMode`, `showRemember` | `{ "ordered": [index…], "remember": bool }` — **never `null`** |
| `choose_entities` | `chooseSingleEntityForEffect` (min=max=1, or min=0 when optional), `chooseEntitiesForEffect` | `prompt`, `options:[opt]`, `min`, `max`, **`delayedReveal`** | `[index…]`, or `null` |
| `assign_damage` | `assignCombatDamage` | `attackerId` (**or `null`**: Forge's signature allows a null attacker), `total`, `overrideOrder`, `maySkip`, `targets:[opt]` — **the defender is index 0** | `{ "<index>": n, … }`, or `null` |
| `assign_amount` | `assignGenericAmount` | `sourceCardId`, `total`, `atLeastOne`, `label`, `targets:[opt]` | `{ "<index>": n, … }`, or `null` |
| `manipulate_list` | `manipulateCardList` (surveil, scry-likes) | `prompt`, `cards:[opt]` (full list, in order), `manipulable:[index]`, `toTop`, `toBottom`, `toAnywhere` | `[index…]` — the full list in its new order |
| `sideboard` | `sideboard` | `prompt`, `main:[opt]`, `side:[opt]` | `[index…]` = the new main deck, or `null` |

### 5.3 Per-kind notes that a reader will otherwise get wrong

- **`order` is not top/bottom.** Forge's `OrderResult` is
  `(List<T> ordered, boolean rememberDecision)` **[jar]**, and `ordered()` is the
  *destination* list. The answer is `{ordered, remember}` and **must never be
  `null`**: `IGuiGame.java:229,232` and `PlayerControllerHuman.java:2317` all call
  `.ordered()` unguarded, so a null answer wedges or NPEs the game thread. On
  timeout the bridge computes a non-null default (report 07 §6.7).
  `min` / `max` are Forge's `remainingMin` / `remainingMax` — they constrain how
  many options may be **left in `source`**, and `-1` means unconstrained.
  **Answer indices address `dest ++ source` as one array, in that order.**
- **`choose_list` with `reveal: true` is "acknowledge only".** Forge's
  `AbstractGuiGame.reveal` is `getChoices(message, -1, -1, items)`; a negative
  `min` means *show these, select nothing*. The client renders a reveal with one
  OK button and answers `[]`. Without this flag it renders as an impossible "pick
  −1 cards". `getChoices` must also never return `null`
  (`AbstractGuiGame.java:767, 780-781` dereference it).
- **`assign_damage`'s defender is option index 0**, carrying `"defender": true`
  plus `playerId` or `cardId`; the blockers follow, each with `cardId` and
  `lethal` (remaining toughness, computed on the game thread). The bridge
  marshals index 0 back to the map key `null`, which is what
  `PlayerControllerHuman.java:305-311` accepts for "the defending player", and
  index `i` back to `blockers.get(i - 1)`. A `null` answer is legal here and
  means "let Forge assign" (`PCH:302-304`).
  **A one-off error in that marshalling is invisible on the wire** — both
  spellings are a well-formed `{"<index>": n}` object — so it is not left to a
  recording to catch: `mtgtable.Ask` holds the marshalling for all eleven kinds
  with no Forge types in it, and `mtgtable.AskSelfTest` drives each one from real
  JSON in `bridge/build.sh`, beside the `Json` self-test. Forge dispatched only
  `choose_list` and `order` in the games recorded for M2 and
  `assign_damage` in the trample probe, so for the remaining eight kinds that
  self-test and `fixtures/synthetic/sample-handwritten.jsonl` are the whole of
  the contract.
- **`assign_amount` keys may be colours.** `assignGenericAmount` takes a
  `Map<Object,Integer>` whose keys are `GameEntityView` **or** `MagicColor.Color`
  ("mana of any combination of colours"), so each target carries
  `kind: "entity" | "color"` and an optional per-key `max`. Answers stay indices.
- **`choose_entities.delayedReveal`** is `null` or

  ```jsonc
  { "owner": 1, "zones": ["library","hand"], "messagePrefix": "Searching: ",
    "cards": [ /* Card — each through the one function */ ] }
  ```

  `DelayedReveal` lives in `forge.game.player` (**not** `forge.game.card`) and its
  accessors are jar-verified: `getCards()`, `getZone()`, `getOwner()`,
  `getMessagePrefix()`. It is the *context* ("here is what you are looking at")
  while `options` is the *choice*; the two overlap only partially. Its three
  construction sites are all library or opponent-hand searches, so this is the
  single largest legitimate reveal on the wire.
- **`manipulate_list` is where the whole library can arrive.** With
  `FPref.UI_SELECT_FROM_CARD_DISPLAYS` on (Forge's default), a scry 1 routes the
  player's **entire ordered library** into this call. Decision **D13** turns that
  pref off at bootstrap, which reroutes scry to `confirm` / `choose_list` over
  the top N only. The redaction checker asserts that no `manipulate_list` or
  `choose_list` body carries a card that is in an opponent's hand or library
  unless it arrived via `delayedReveal`.
- **`sideboard` options are `PaperCard`s, not `CardView`s** — your own pool, no
  redaction question. Never emit the opponent's pool; Forge never gives it to us.

The reducer **throws** on an unknown `kind` rather than ignoring it, so a new
blocking method added on the Java side surfaces immediately as a red banner rather
than as a hang.

### 5.4 Invariant: every `ask` must be answerable with `null`

On disconnect or timeout, complete the future with `null` and return Forge's
documented default for that method — otherwise **the game thread wedges forever
with no error**, which looks exactly like a hung app. **Three kinds have no usable
null default and must synthesise one**: `order` (§5.3), `choose_list`
(`AbstractGuiGame` dereferences the result), and `manipulate_list` — whose result
`PlayerControllerHuman.java:986` indexes directly, so its default is the input
list in its original order.

The machinery, all of which must exist before the first `ask` is emitted:

- `ReplyPool` mapping `askId` → `CompletableFuture`, with `cancelAll()` on
  disconnect.
- A per-`ask` timeout, completing with `null`.
- Forge's documented null-defaults per method (`RemoteClientGuiGame.java:436,442,453`;
  `assignCombatDamage`'s null case is handled at `PlayerControllerHuman.java:302`).
- A second `answer` for a completed `askId` dropped with a `notice`, never applied.
- A malformed answer (wrong JSON shape) treated as `null`, never thrown on the
  game thread.
- **Concede reachable from every UI state**, so a wedge is always escapable.

---

## 6. The `notice` body

```json
{ "v": 1, "seq": 131, "t": 1757600000400, "type": "notice",
  "body": { "level": "warn", "title": "Illegal action",
            "text": "That creature cannot block." } }
```

`level` is `"info"` | `"warn"` | `"error"`. Carries Forge's `message`,
`showErrorDialog`, `alertUser` and `flashIncorrectAction`. Never blocks — a
`notice` is a toast, not a question. Anything the user must answer is an `ask`.

**Both strings are gated** (amendment M1). They are the engine's, and one of
them is routinely a card: `PlayerControllerHuman.notifyOfValue` calls
`message(value, CardView.get(sa.getHostCard()).toString())`, and
`CardView.toString()` is `name (id)`. So `title` and `text` each pass through
`Snap.sweepText` — rule 2 of §3.6's gate/sweep/strip, applied on its own — and
arrive as `""` when the string named an id the current snapshot conceals. Both
are always present and always strings; a client renders them verbatim and must
be total over an empty one.

This is invariant 4's second half stated as a rule rather than as a call site:
**`Snap.stackText` and `Snap.sweepText` are the same sweep**, and nothing else in
the bridge may put an engine string on the wire ungated.
`tools/check-redaction.mjs` scans `notice.title` and `notice.text` and **fails**
on a hit — unlike `ask.prompt` and `input.prompt`, which only warn, because those
are strings Forge builds and we do not (report 06 §10, residual risk 3).

`UNIMPL <name>` conditions (an unimplemented `IGuiGame` member firing) are emitted
as a `notice` at `level: "error"` **and** logged server-side, so they are visible
in the browser and greppable in `var/*.log`. Zero `UNIMPL` lines over ten
consecutive games is the M5 exit criterion.

---

## 7. The `over` body

```json
{ "v": 1, "seq": 605, "t": 1757600120000, "type": "over",
  "body": { "winner": 0, "reason": "AllOpponentsLost",
            "matchOver": false } }
```

**From the outcome, not from `finishGame`** (amendment M4). `winner` is a player
`id`, or `null` for a draw. `matchOver` distinguishes the end of a game from the
end of the match; when it is `false` the client may send `act: nextGame` — and the
next game opens with a **new `hello_ok`** that invalidates every cached id (§2.1).

The emitter's trigger is `GameEventGameOutcome`, read on the game thread and
shipped immediately after the `state` frame that carries the same body as
`gameOver`. It used to be `IGuiGame.finishGame` / `afterGameEnd`, and **Forge
does not reliably call either**: two of four identical console runs (four button
presses, then a concede during the pre-game prompts) ended with a final `state`
carrying `gameOver: {winner: 1, reason: "AllOpponentsLost"}`, no `over` frame at
all, and exit 0. `finishGame` and `afterGameEnd` remain as late triggers, and the
emission is idempotent, so whichever comes first wins. A session that cannot end
is not a cosmetic problem: it is a client that waits forever.

**`reason` is a string, or `null` when the engine had not published a win
condition yet.** `Snap.state()` writes this body the instant `Game.isGameOver()`
is true, while `GameView.getOutcome()` is `getMatch().getOutcomeById(getId())` —
a lookup in the `Match`'s outcome map, which is not populated at the same
instant. A snapshot landing in that window genuinely has no reason to report,
and `""` would misreport it as a known empty one. `reason: string | null` is the
declared type in `protocol.ts`, in `tools/check-redaction.mjs` and here.
Unobserved in the committed fixtures (all of them say `AllOpponentsLost`); a draw
or a concede is the likeliest way to reach it.

The same object appears as `state.gameOver` in subsequent snapshots, so a scrubbed
replay renders the result without special-casing the final frame.

---

## 8. The frame log

`var/games/<gameId>/frames.jsonl`, written by the `mtg-table-log` thread, **flushed
per line** so a killed JVM still leaves a complete, parseable file.

### 8.1 Line 0 — the session header

Line 0 is **not** a frame. It is the session header, distinguished by
`"kind":"session"`:

```json
{"v":1,"kind":"session","gameId":"g1","startedAt":"2026-09-11T20:14:03Z","seed":42,
 "forgeVersion":"2.0.14","forgeJarSha256":"3f6c…","seat":0,
 "decks":[{"player":0,"path":"decks/pacho-shield.dck","sha256":"9ab1…","cards":40},
          {"player":1,"path":null,"sha256":null,"cards":40}]}
```

| Field | Meaning |
|---|---|
| `v` | Protocol major, matching the frames that follow. |
| `kind` | Always `"session"`. Its presence is how a reader tells the header from a frame. |
| `gameId` | Matches `state.gameId` and the containing directory. |
| `startedAt` | ISO-8601 UTC. |
| `seed` | The value passed to `MyRandom.setRandom(new Random(seed))`, or `null`. |
| `forgeVersion`, `forgeJarSha256` | Exactly which engine produced this log. |
| `seat` | **The player id this log was redacted for** (§8.3). In a two-player game ids and `players[]` indices coincide, but readers should use ids. |
| `transport` | Which client played this seat: `"null"` \| `"auto"` \| `"console"` \| `"ws"`. **Absent from an AI-vs-AI recording**, which has no transport and nobody at the keyboard. It is not decoration: `--transport null` answers every ask with a literal `null` so that §5.4's documented defaults get exercised, and without this key that log is indistinguishable on disk from a wedged session (§8.3, A12). |
| `decks` | One entry per seat: `{player, path, sha256, cards}`. **`path` and `sha256` are the viewing seat's alone and are `null` for every other seat** — see below. `cards` is the main deck's card count and is public for every seat. |

**A frame produced before the header is held, not dropped** (amendment M9). The
emitter can reach a `notice` or an `over` before the seat exists — an act typed
ahead of the game, or a concede during the pre-game prompts — and those frames
go on the wire with a real `seq` (§1: monotonic per direction, starting at 1).
`GameLog` buffers them, bounded, and writes them immediately after line 0. If
the header never arrives at all, the file is left **empty** rather than
headerless, and the close says so on stderr: a reader identifies line 0 by
position, so a file that begins with a frame is worse than no file.

**Why the opponent's deck is not named.** A path plus a sha256 identifies a
decklist exactly, and §8.3 promises the log contains only what *this* player was
allowed to see. With two AI seats that is harmless; the moment a human sits down
in M2/M3 it is the opponent's entire deck, handed to the player in the file the
client reads. The same reasoning scopes `hello_ok.unsupportedCards` to the
viewing seat's deck (§2.1), because each of its entries is a literal card name.
`tools/check-redaction.mjs` asserts both.

### 8.2 Every later line — a frame plus `dir`

Each subsequent line is a §1 envelope with **one added field, `dir`**:

```json
{"v":1,"seq":1,"t":1757600000000,"dir":"s2c","type":"hello_ok","body":{"gameId":"g1","you":0}}
{"v":1,"seq":7,"t":1757600000500,"dir":"c2s","type":"act","body":{"action":"clickCard","cardId":41}}
```

(the `hello_ok` body is abridged here; on disk it carries every field from §2.1)

`dir` is `"s2c"` or `"c2s"`. `seq` is per direction, so the two interleaved series
each count independently; `t` gives the true ordering. A replay transport reads the
file in file order and feeds only `s2c` frames to the reducer, using `c2s` lines to
show what the player did.

### 8.3 The log is per seat

**A log contains exactly what one player was allowed to see.** Redaction happens in
the bridge before the frame is written, not in a viewer — so an opponent's hand
card appears in the file as the five-key redacted shape (§3.3) and nowhere in that
file does its name exist.

Three consequences:

1. A log is **safe to paste into a bug report**. A bug is a file, not a story.
   (Your own log. Not an opponent's.)
2. It is **the same stream the client consumed**, so a replay is exact, not an
   approximation.
3. The M1 redaction test is a checker over a recorded log asserting that no
   opponent hand card ever carries a `name`.

**A same-deck recording cannot evidence any of this.** If both seats play
`decks/pacho-shield.dck`, every card name the opponent could leak is also a name
the viewer legitimately holds, so every name-based assertion is satisfied by
coincidence and the claim above — "nowhere in that file does its name exist" —
is untestable on the corpus that is supposed to prove it. That is exactly how
`cast.text` naming a concealed face-down card (§3.6 rule 1) passed every test in
the repo. `fixtures/games/disjoint.jsonl` is recorded with **different decks on the
two seats** for this reason:

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
    --deck2 decks/morph-probe.dck --seed 99 --out fixtures/games/disjoint.jsonl
```

`web/test/fixtures.test.ts` fails if the corpus ever loses its two-deck
recording, and on any two-deck log it asserts that a name only the opponent's
deck holds is never printed in a frame that does not also show the viewer a card
carrying it.

### 8.4 What an AI-vs-AI recording contains

Line 0 is the session header; then exactly one `hello_ok`, then a run of `state`,
then exactly one `over`. There is no `input`, no `ask`, no `notice` and no `c2s`
line, because nobody is playing. **A replay transport must not wait for an
`input` frame before rendering.** The header carries no `transport` key (§8.1).

**A human-seat recording** (`fixtures/games/human-*.jsonl`, written by
`mtgtable.MtgTable`, M2) is the same envelope stream with the interactive half
present: line 0 carries `transport`, and between the `state` frames come `input`
frames (one per EDT push — a prompt and a button update are two), `ask` /
`answer` pairs, `notice` toasts, and `c2s` `act` lines for every click the seat
made. `seq` counts per direction, so the two series interleave. It still ends
with **exactly one `over`**, and that frame is now emitted from the outcome
capture rather than from `finishGame` (§7), which is what makes "exactly one"
true of a conceded game as well as of a played-out one.

`abilities` is `[]` on every card of every recording, human-seat ones included —
**M5** is the milestone that fills it (§3.2, amendment M5).

### 8.5 The fixture corpus, and why it is split

`fixtures/games/` holds **engine-produced** recordings and nothing else; they are
the drift contract between `Snap.java` and `protocol.ts`, and
`web/test/fixtures.test.ts` globs exactly that directory. Each file is there for
a reason:

| file | why it exists |
|---|---|
| `g1` / `g2` / `g3` | the primary deck at seeds 42 / 7 / 2026 |
| `morph.jsonl` | `decks/morph-probe.dck` (18 Mountain + 22 morph creatures) — the only recording that produces a **face-down card** at all (`faceDown: true`, `name: ""`, and an `alt` block on the 121 the viewing seat controls), because `pacho-shield.dck` has no morph, manifest, disguise or cloak card |
| `disjoint.jsonl` | the first recording whose two seats play **different** decks, which is the only way a name-based redaction assertion can tell a leak from a coincidence (§8.3). `pacho-shield` vs `morph-probe`, seed 99 |
| `future-sight.jsonl` | `decks/future-sight-probe.dck` (22 Island + 18 Future Sight) vs `morph-probe` — the only recording in which **`library.cards` is non-empty**. No card in `pacho-shield` or `morph-probe` runs a continuous `MayLookAt` static, so before it, §3.4's amendment was proved only by the shape of an empty array. 98 frames carry a revealed top card; it is a two-deck recording as well |
| `human-auto-{42,7,2026}.jsonl` | **the first recordings with a seat in them** (M2): `pacho-shield` played by `AutoTransport`'s scripted policy against the AI, at seeds 42 / 7 / 2026. They are where `input`, `ask`, `answer`, `act` and `notice` stop being hand-written (§8.4). Ask kinds actually dispatched: `choose_list` and `order` |
| `human-trample-7.jsonl` | `decks/trample-probe.dck` (18 Forest + 22 Garruk's Companion, a 3/2 **trampler**) vs `morph-probe`, seed 7 — the only recording that reaches **`assign_damage`**, the kind §5.3 calls the worst trap of the eleven. `PlayerControllerHuman.java:289` only asks the GUI when the attacker has trample or is blocked by more than one creature, and neither deck above can produce either. Its one ask carries the defender at index 0 with `lethal: null` and a **face-down** blocker at index 1 with `lethal: 2` — so it is evidence for the option gate as well |
| `human-scry-7.jsonl` | `decks/scry-probe.dck` (24 Island + 16 Opt) vs `morph-probe`, seed 7 — the only recording in which **`input.focusCard` is non-null**. Scry 1 with `UI_SELECT_FROM_CARD_DISPLAYS` off (decision **D13**) routes to `willPutCardOnTop`, which pushes `setCard` on the **game thread** with a card that is in the viewer's *library* and therefore not in the snapshot (amendment H's whole reason). 24 such pushes, 12 of them naming a card no frame of the log contains |

`fixtures/synthetic/sample-handwritten.jsonl` is hand-built by
`tools/make-sample-fixture.mjs` and lives **apart** because it was written from
the same reading of this document as `protocol.ts` — it cannot detect drift
between the two ends, so counting it as a contract fixture inflates the number of
recordings that can actually fail. Its job is the shapes an AI-vs-AI game never
emits,
and it carries one of each: an `input` whose `focusCard` is **not** in the
snapshot plus a non-empty `weak` and `openZones`, **all eleven `ask` kinds** with
the `answer` that closes each, a face-down card in three positions (an opponent's
morph with no `alt`, the viewer's own manifest with one, and a foretold card in
exile with no public body at all), a library with a card revealed in it, the
`surveil` / `phased` / `foretold` events no recording fires, and `zone` events
with a null `from` and a null `to`. It is held to the **same** `check-redaction`
standard as an engine recording — `check-all.sh` step 6 runs over
`fixtures/synthetic/*.jsonl` too.

`fixtures/negative/` holds logs that must **fail**: an unknown frame type, a `v`
mismatch, and one the reducer accepts but the renderer cannot draw.
`fixtures/negative/redaction/` is the **checker's own** negative control — a
clean slice of `g1` plus nine copies of it carrying exactly one defect each (a
stub without `owner`, a card without `token` or `alt`, a library without `cards`,
a revived `faceDownHidden` object, a stub with a `name`, a named opponent hand
card, and two opponent-library reveals). `tools/check-redaction-selftest.mjs`
asserts the baseline passes and every probe is rejected, because a checker that
cannot fail proves nothing about the emitter it is watching.

### 8.6 What the log buys

- **Front-end development with no JVM running.** `web/` has a `ReplayTransport`
  that reads a `.jsonl` and exposes play / step / scrub behind the same `Transport`
  interface as the WebSocket. The board component cannot tell them apart.
- **Committed golden fixtures** under `fixtures/games/`, so the renderer has real
  input from day one and every later front-end evening runs without the engine.

### 8.7 Seeding, honestly

`MyRandom.setRandom(new Random(seed))` (verified present in 2.0.14;
`SimulateMatch.java:89` uses it) makes engine-level re-runs plausible. **Do not
promise byte-identical replay** — thread interleaving is not deterministic. The log
is the record of what happened; the seed is a hint for reproducing something like
it.

---

## 9. Summary of invariants

1. Client→server messages never expect a reply. Only `ask` blocks, and only the
   server waits.
2. `state` is built on the **game thread**; `input` comes from the **EDT**; answers
   are delivered from the **netty thread** and from nowhere else.
3. `state` is always a **full** snapshot. There are no deltas in v1.
4. Exactly **one** card-serialisation function, gated on the caller's own zone
   knowledge *and* `canBeShownTo` *and* `canFaceDownBeShownTo`. It has exactly
   **one** concealed shape, the five-key `hidden` card; a face-down card whose
   identity is concealed is an ordinary `Card` with `name: ""` and `alt: null`
   (§3.3, amendment P3 — the eleven-key `faceDownHidden` object is superseded and
   no longer emitted). **Every** card on the wire goes through it — `players[].zones`,
   `stackCards`, `library.cards`, `input.focusCard`, every ask option's `card`,
   `delayedReveal.cards`. **Libraries carry a count plus only the cards
   `canBeShownTo` allows** (§3.4). And exactly **one sweep** for every
   engine *string* that reaches the wire: `Snap.stackText` (`stack[].text` and
   `events[].cast.text`, §3.6 rule 1) and `Snap.sweepText` (`notice.title` and
   `notice.text`, §6) are the same rule, tested on the same ids, because the
   string path was the second leak and the notice path was the third.
5. **`ok.enabled === false` means the engine wants a card click**, not a button.
6. **Every `ask` must be answerable with `null`**, and Concede must be reachable
   from every UI state. The two kinds with no null default (`order`,
   `choose_list`) synthesise one.
7. The reducer **throws** on an unknown `type`, an unknown `ask.kind`, or a `v`
   mismatch. It never silently ignores a frame.
8. The client computes no rules answers. Ever.
9. `state.events` carries **ids only**, plus `cast.text` — which is *not*
   assumed public: it is gated, swept for concealed ids and stripped of Forge's
   engine annotation, and is `""` whenever the viewer may not have it (§3.6
   rule 1). Unknown event kinds are ignored, not thrown — the one deliberate
   exception to invariant 7.
10. **A `hidden` card REPLACES the client's card object for that id. It never
    merges** — and the same holds for a face-down card arriving with `name: ""`
    and `alt: null`, which is the P3 spelling of the same concealment. Forge card
    ids are stable across zone changes and across face-down transitions, so a
    reducer that keeps a `name` learned during a legitimate reveal goes on
    rendering it after the card returns to a hidden zone. That is a leak in `reduce.ts` that no amount of care in `Snap.java` can
    prevent, and it is the one the log checker structurally cannot see — it is
    tested directly against `reduce()` (report 06 §0.6, §9.A8). The same rule
    applies across games: a new `hello_ok` resets the map (§2.1).
11. An **event** with a missing id is dropped, never emitted with a `null` under
    a non-nullable type; a **card**, **stack item** or **combat band** is never
    dropped, so the handful of fields the engine cannot guarantee are declared
    nullable and every reader guards them (§3.1, §3.6 rule 5). The renderer is
    total over every shape this document allows, and
    `tools/check-redaction.mjs` proves both halves over the committed fixtures.

---

## 10. Planned additions (M3/M6) — **not yet emitted**

Everything in this section is specified but **not on the wire today**. It is
written down now, while M3 is being built, because each item is an added field
inside a `body` — not a `v` bump — and adding them later means touching a frozen
reducer and invalidating every fixture. A client may read these fields
defensively; it must not require them.

Naming is reconciled across `docs/research/10-board-ui-spec.md` §16.1 and
`docs/research/11-engine-comfort-features.md` §10; where the two overlapped,
report 11's names are the ones used here.

### 10.1 `state` additions

| field | shape | meaning | source |
|---|---|---|---|
| `players[].phaseStops` | `string[]` of `PhaseType` names | the phases at which **this player's turn** stops for the viewer. Server-owned; the client never derives it. Answered from `WireGuiGame`'s own map, seeded once from `FPref.PHASES_HUMAN` / `PHASES_AI`, **never saved** — which is exactly what Forge's desktop does (`CMatchUI.java:1389-1441`). `PlayerControllerHuman.isUiSetToSkipPhase` only consults `YieldController` `if (isRemoteClient())`, and we are not one, so the `YieldController` skip map is dead code for us. | 11 §3 |
| `state.yield` | `{playerId, phase} \| null` | the active pass-to target — the marker Forge draws on its own phase strip. From `YieldController.getAutoPassUntilMarker()` → `YieldMarker(PlayerView, PhaseType)`. Report 11 §10 also proposed a `kind: "endOfTurn"\|"stack"\|"marker"` discriminator and a sibling `autoPassNoActions` boolean (from `autoPassUntilEndOfTurn()` / `autoPassUntilStackEmpty()`); they are **not** in this shape today, and adding either is a one-line amendment when M6 needs to tell the three cases apart. | 11 §4, §10; 10 §16.1 |
| `state.undo` | `{can, depth}` | `canUndoLastAction()` + `MagicStack.getUndoStackSize()`, both game-thread reads. Undo only ever holds *mana abilities* and is cleared on every phase change — do not build UI that promises more. | 11 §7 |
| `stack[].yieldKey` | opaque string \| `null` | a **bridge-minted handle**. Forge's own `StackItemView.getKey()` is `CardView.toString() + ": " + …`, i.e. *the card name and id* — never put it on the wire, and never render this handle. | 11 §5.2 |
| `attachedToPlayerId` (on `Card`) | `number \| null` | the player an Aura is attached to, when `attachedToId` is `null` because the attachment target is a **player** (Curse of Death's Hold, Eldrazi Conscription's cousins, any "enchant player" Aura). Today such an Aura serialises with `attachedToId: null` and is indistinguishable from an unattached one. The emitter writes `attachedToId` from `CardView.getAttachedTo()`, which returns a **`CardView`** **[jar]** and is therefore `null` for a player attachment — the information is not missing, it is on the *other* accessor, `CardView.getEntityAttachedTo()` → `GameEntityView` **[jar]**, whose runtime type is a `PlayerView` or a `CardView`. So this field is an `instanceof` branch on that second accessor, not a cast on the first. | 06 §6; builders' notes |
| `stack[].isAbility`, `stack[].isOptionalTrigger`, `stack[].yielded` | bool | from `StackItemView.isAbility()` / `isOptionalTrigger()` **[jar]** and `shouldAutoYield(rawKey)`; the always-yes / always-no affordance. | 11 §5 |

### 10.2 `input` additions

| field | shape | meaning |
|---|---|---|
| `buttons.focus` | `"ok" \| "cancel" \| null` | `updateButtons(owner, label1, label2, enable1, enable2, **focus1**)` **[jar]** already carries it. Space activates the focused button; that is how the desktop behaves, and it is why "space = OK" is not a Forge shortcut. |
| `selectable.playerIds` | `number[]` | which seats are clickable. **Player ids never travel in `cardIds`.** Today §4's `mode: "players"` leaves the reader to guess. |
| `weak` | `number[]` | already specified in §4; `[]` until M5 fills it. |

### 10.3 `act` additions

| action | body | maps to |
|---|---|---|
| `passPriority` | — | listed in §2.2's table (`from: M6`), because the server must tolerate any `act` at any time and the two ends must agree on the spelling; `IGameController.passPriority()` **[jar]**. |
| `yieldTo` | `{kind: "endOfTurn" \| "stack" \| "marker", playerId?, phase?}` | one act for all three engine mechanisms: `SetAutoPassUntilEndOfTurn`, `StackYield`, `SetMarker`, all through `sendYieldUpdate(YieldUpdate)`. All three are cancelled by the same `buttonCancel`. |
| `newGame` | `{mode: "continue" \| "new" \| "quit"}` | `nextGameDecision(NextGameDecision…)`. Supersedes the bare `nextGame` of §2.2, or redefines it to take a mode. |
| `setYield` | `{yieldKey, mode}` | `setShouldAutoYield(key, …)`, keyed by the bridge-minted handle above — **a `cardId` cannot express it**. |
| `useMana` | `{color}` | already narrowed in §2.2: a `cardId` is a `clickCard`. |

**And one that does not exist:** there is **no `autoPay` act**. Auto Pay is
`InputPayMana`'s own label on the OK button, exactly as Undo and End Turn are
`InputPassPriority`'s labels on Cancel. Render `buttons.*.label` verbatim and send
`buttonOk` / `buttonCancel` (§2.2, report 11 §0.1, §6.1).

### 10.4 Deliberately not planned

- `state_patch` / merge-patch deltas (§3.5) — a documented future server-side
  change, not a v1 feature.
- A "hold priority" flag. **Forge has no such feature**: it always returns
  priority to a human after they cast (report 10 §0). Rendering a toggle with no
  engine behind it would be client-side rules logic.
- Anything derived. If the client would have to compute it, the field belongs in
  `state`, computed by the engine, or it does not belong at all.

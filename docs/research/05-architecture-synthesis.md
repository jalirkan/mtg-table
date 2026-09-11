# mtg-table — architecture synthesis

Status: recommended plan, 2026-09-11. Supersedes the three competing proposals.
Basis: `docs/research/01-forge-engine-seam.md`, `02-forge-build-and-headless.md`,
`03-scryfall-card-library.md`, `04-prior-art-and-licensing.md`.

**Winner: "Straight Wire"**, with four grafts from the other two proposals
(frame log + replay transport, `input`-inside-state, the AI-vs-AI recorder as a
first-class milestone, and `check-forge.sh`). Everything below is the merged plan.

---

## 0. Claims re-verified in this session

Re-run against `/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`
(39,383,858 bytes), so the plan does not rest on a report alone:

| Claim | Result |
|---|---|
| `io.netty.handler.codec.http.websocketx` bundled | **YES — 117 classes.** WebSocket server costs zero new deps. |
| gson bundled | **NO — 0 classes.** Do not `import com.google.gson`. |
| `org.eclipse.jetty.util.ajax.JSON` bundled | **YES — `JSON.class`, 25,544 bytes.** Usable parser. |
| `forge.deck.DeckUrlLoader$JsonParser` present | **YES — 6,179 bytes.** Fallback parser, copyable (we are GPL). |
| `forge.gui.control.GameEventForwarder(IGuiGame)` public ctor | **YES** — `javap` shows `public GameEventForwarder(forge.gui.interfaces.IGuiGame)`, plus `receiveGameEvent`, `flush`, `hasPendingEvents`, `update`. |
| `forge.util.MyRandom` present | **YES** (seeded determinism available). |
| Abstract surface left by `AbstractGuiGame` | **36 method names** (mechanically diffed with `javap`, list below). |
| `javap` usable with no JDK | **YES** — `java -m jdk.jdeps/com.sun.tools.javap.Main` works on the JRE. |
| Toolchain | OpenJDK **21.0.12 JRE only**, Node **v24.20.0**, no `javac`/`javap`/`mvn`/`gradle` binaries. |
| Repo state | `/home/justin-a/code/mtg-table` — **zero commits**, `decks/pacho-shield.dck` + `.txt` present. |

The 36 unimplemented members (name-level; some are overloads):

```
alertUser assignCombatDamage assignGenericAmount chooseEntitiesForEffect
chooseSingleEntityForEffect confirm disableOverlay enableOverlay finishGame
flashIncorrectAction getAbilityToPlay getChoices getGamestate hideManaPool
hideZones isUiSetToSkipPhase manipulateCardList message openView openZones
order restoreOldZones setCard setPanelSelection setPlayerAvatar showCombat
showConfirmDialog showErrorDialog showInputDialog showManaPool showOptionDialog
showPromptMessage sideboard tempShowZones updateButtons updateShards
```

Regenerate this list at any time with:

```bash
J=/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar
jp(){ java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$J" "$1" \
      | grep ';' | sed -E 's/^\s+//;s/.*\b([a-zA-Z0-9_]+)\(.*/\1/' | sort -u; }
comm -23 <(jp forge.gui.interfaces.IGuiGame) <(jp forge.gamemodes.match.AbstractGuiGame)
```

---

## 1. Decision summary

1. **Reuse Forge's own seam.** Subclass `forge.gamemodes.match.AbstractGuiGame`
   (36 members) and reuse `PlayerControllerHuman` verbatim. Never write a
   `PlayerController`; never touch Forge's Netty/Java-serialization wire.
2. **Compile against the installed 2.0.14 fat jar** with the JRE's `jdk.compiler`
   module. No Maven, no Gradle, no JDK install, no source build, no vendoring.
3. **One JSON WebSocket on loopback**, message shapes copied from
   `forge.gamemodes.net.ProtocolMethod`, encoding discarded.
4. **Every frame is appended to `var/games/<id>/frames.jsonl`**, and the browser has
   two transports behind one interface: WebSocket and log-replay. The UI is
   `render(reduce(frames))` and can be developed with no JVM running.
5. **An AI-vs-AI recorder ships before any human seat**, so the view→JSON codec and
   redaction are finished and visually debugged before anything can block a thread.
6. **`input` (prompt/buttons/selectables) is merged into the client's single
   `GameState` by the reducer**, so `render(state)` is total and the client has no
   correlation state machine.
7. **GPL-3.0-or-later, whole repo. No code copied from manabrew (AGPL).**
8. **v1 card art is a one-shot `art.json`**, not a SQLite card library.

---

## 2. Architecture

### 2.1 Components

| Path | Language | Role |
|---|---|---|
| `bridge/` | Java 21, GPL-3.0-or-later | The only Java. Links Forge: hosts the engine, implements `IGuiBase` + `AbstractGuiGame`, redacts, serializes, logs, serves `/ws`. ~7 files, ~1400 lines. |
| `web/` | TypeScript + React + Vite | The SPA. Pure function of the frame stream. Two transports. |
| `tools/fetch-art.ts` | TypeScript, run by bare `node` (Node 24 strips types) | Deck file → `web/public/art.json`. This *is* the v1 card library. |
| `forge-home/` | config + symlink | `res -> /home/justin-a/forge/res` plus `forge.profile.properties` redirecting Forge's `userDir`/`cacheDir` into `var/`. |

No npm runtime dependencies outside `web/` (React, Vite). The Java side has **zero**
dependencies beyond the jar already on disk.

### 2.2 Java classes, in build order

```
bridge/src/mtgtable/
  HeadlessGuiBase.java  IGuiBase, headless. 44 members. Owns the virtual EDT.   [M0]
  Smoke.java            AI-vs-AI, no GUI. Proves boot + deck + card coverage.   [M0]
  Json.java             JsonOut writer (hand-written) + parse via Jetty's JSON.  [M1]
  Snap.java             GameView/PlayerView/CardView -> JSON. Game thread only.  [M1]
  GameLog.java          JSONL appender on its own single thread, flush per line. [M1]
  RecordMatch.java      Two AI seats -> fixtures/games/<id>.jsonl.               [M1]
  WireGuiGame.java      extends AbstractGuiGame. THE BRIDGE. Transport-agnostic. [M2]
  ReplyPool.java        askId -> CompletableFuture, timeout, cancelAll().        [M2]
  Transport.java        interface { push(String); ask(String) -> String; }       [M2]
  ConsoleTransport.java stdin/stdout implementation of Transport.                [M2]
  WsTransport.java      netty websocketx implementation of Transport.            [M3]
  MtgTable.java         main(): config, bootstrap, HostedMatch, park.            [M3]
```

### 2.3 Threads — get this right on day one

| Thread | Created by | Runs |
|---|---|---|
| `main` | JVM | bootstrap, then `park()` |
| `mtg-table-EDT` | us, single-thread executor | every `IGuiGame` push Forge dispatches via `FThreads.invokeInEdtLater` (prompts, buttons, selectables) |
| `Game…` | Forge's pool (`ThreadUtil.isGameThread()` string-matches the name) | the rules. Blocks on a `CountDownLatch` or inside our value-returning methods. **The only thread allowed to walk the view graph.** |
| `mtg-table-log` | us | JSONL appender |
| netty `nioEventLoop` | us | reads browser frames, calls `IGameController`, completes `ask` futures |

Three hard rules, each with a verified failure behind it (report 02 §4.2):

1. `GuiBase.setInterface(...)` is the **first** Forge call in the process —
   `ForgeConstants`' static initializer calls `GuiBase.getInterface().getAssetsDir()`
   (`forge-gui/src/main/java/forge/localinstance/properties/ForgeConstants.java:37,232-240`).
2. `IGuiBase.isGuiThread()` must be
   `"mtg-table-EDT".equals(Thread.currentThread().getName())`. A constant `true`
   throws `IllegalStateException` at the mulligan from `FThreads.assertExecutedByEdt`
   (`forge-gui/src/main/java/forge/gui/FThreads.java:15-24`, guarding
   `forge-gui/src/main/java/forge/gamemodes/match/input/InputSyncronizedBase.java:22`).
3. Answers come from the netty thread only — never the game thread (parked), never
   the EDT (delivering). `Snap.state()` opens with
   `if (!ThreadUtil.isGameThread()) throw new IllegalStateException(...)`;
   `Transport.deliver()` asserts it is on neither.

`Tracker`'s javadoc (`forge-game/src/main/java/forge/trackable/Tracker.java:26-32`)
says the view graph is game-thread-only and not thread-safe. Violating rule 3
corrupts it **silently**, which is worse than a crash — hence the asserts.

### 2.4 The snapshot hook (a correction to reports 01/02)

Reports 01/02 suggest snapshotting in `updateCards`/`updateZones`. Those arrive on
the **EDT**. `HostedMatch.java:227-233` only registers the game-thread-safe
`GameEventForwarder` when the GUI is a `RemoteClientGuiGame`; a plain
`AbstractGuiGame` gets `FControlGameEventHandler`, which hops to the EDT.

Register the forwarder by hand instead (all signatures `javap`-confirmed above):

```java
// in WireGuiGame.openView(...), after super.openView(...)
GameEventForwarder fwd = new GameEventForwarder(this);
hosted.getGame().subscribeToEvents(fwd);
for (PlayerControllerHuman hc : hosted.getHumanControllers())
    hc.getInputQueue().addObserver(fwd);

@Override public void handleGameEvents(List<GameEvent> batch) {
    transport.push(Snap.state(this));   // game thread — correct
}
```

`GameEventForwarder` flushes at 50 events / 500 ms / **whenever the InputQueue
changes, i.e. immediately before the game thread blocks for input** — exactly when
the browser needs state. This is also free coalescing: report 04's probe measured
3,388 raw `GameEvent`s collapsing to 605 observable states in a 9-round game
(1,528 of them `GameEventZone`). Naive per-event snapshots produced 5.3 MB;
coalescing is mandatory, and Forge's own forwarder already does it.

Leave `updateCards`/`updateZones` as the inherited no-ops.

### 2.5 Hidden information

Forge does **not** redact on the wire — `DeltaSyncManager.collectDeltas` ships
opponent hands and libraries and hides client-side. We redact in the bridge, in
exactly one function, so there is no second path that could forget:

```java
static void card(JsonOut o, CardView cv, PlayerView me) {
    if (!cv.canBeShownTo(me)) {
        o.obj().n("id", cv.getId()).n("zone", cv.getZone())
               .n("controller", ...).n("hidden", true).end();
        return;
    }
    /* full fields */
}
```

`CardView.canBeShownTo` (`forge-game/src/main/java/forge/game/card/CardView.java:622`)
encodes the whole rules answer including `PlayerMayLook` temporary reveals. Report 04
verified this predicate works from a pure event-bus path with no human seat
(viewer hand 3/3 visible, opponent hand 0/2). **Library is always a count.**

~~Known gap, to close before M3 ships: the full set of places `DelayedReveal` /
`tempShowZones` / `openZones` legitimately reveal library cards was never
enumerated.~~

**Amendment 2026-09-11 — the gap is closed, and the single gate above is not
sufficient.** `docs/research/06-hidden-information-audit.md` enumerates all twelve
reveal paths and the complete `mayLook` surface. Four corrections to this section:

1. **`canBeShownTo` returns `true` unconditionally for `Battlefield` and `Stack`,
   face-down cards included** (`CardView.java:629-638`). A morph therefore sails
   through the gate shown above; its identity is one accessor away on
   `getAlternateState()` / `getBackup()`. The second predicate Forge itself uses is
   `CardView.canFaceDownBeShownTo(viewer)` **[jar]**, and it is now gate 2.
2. **The redacted stub is five keys, not four** — `{id, zone, owner, controller,
   hidden}`. `canBeShownTo`'s `case Hand` compares *controllers* while the zone
   arrays are keyed by the zone's player.
3. **"Library is always a count" was too strong.** A continuous `MayLookAt` static
   (Future Sight, Bolas's Citadel) reveals a library card with **no blocking call
   to ride on**, so `library` is now `{count, cards}` where `cards` holds only the
   cards `canBeShownTo` allows — never a stub.
4. **The card channel was not the only one.** `Snap.stackText` gates, sweeps and
   strips the one engine *string* that reaches the wire; and
   `AbstractGuiGame.mayView`, `canBeShownToAny` and `CardView.getText()` are
   banned outright by `tools/lint-bridge.sh` because each is fail-open.

Current contract: `docs/protocol.md` §3.3, §3.4, §3.6 rule 1.

---

## 3. Wire protocol

JSON text frames over `ws://127.0.0.1:8642/ws`. One message per frame. Loopback bind
only, no auth (explicit non-goal). Shapes copied from
`forge-gui/src/main/java/forge/gamemodes/net/ProtocolMethod.java` (45 server→client,
15 client→server) — that enum is a battle-tested list of every question a Magic
engine asks a UI. **None of its encoding** is reused: `DeltaPacket` carries
`Map<TrackableProperty,Object>` with `ColorSet`, `ManaCost`, `EnumSet`, `CounterMap`
and serialized lambdas over LZ4'd Java serialization with `IdRef` substitution, whose
entire saving depends on both ends being Forge instances. A browser is not.

### 3.1 Envelope

```jsonc
{ "v": 1, "seq": 128, "t": 1757600000123, "type": "state", "body": { } }
```

`v` = protocol major (reducer throws on mismatch). `seq` = monotonic per direction.
`t` = epoch ms. All growth happens inside `body`, so an old log stays parseable.

### 3.2 Message types — 6 server→client, 4 client→server

| `type` | dir | blocks game thread | body |
|---|---|---|---|
| `hello_ok` | s→c | no | `{gameId, you, seed, forgeVersion, forgeJarSha256, unsupportedCards:[], players:[{id,name,isAi}]}` |
| `state` | s→c | no | full redacted snapshot (§3.3). Emitted on `handleGameEvents` and inside value-returning methods. Replaces `setGameView` and every `update*`/`showCombat`. |
| `input` | s→c | no | `{prompt, focusCardId, buttons:{ok:{label,enabled},cancel:{label,enabled}}, selectable:{cardIds,min,max,mode}, highlighted:[]}` — from `showPromptMessage` + `updateButtons` + `setSelectables`/`setHighlighted`. Emitted from the **EDT**. |
| `ask` | s→c | **yes** | `{askId, kind, timeoutMs, ...}` (§3.4) |
| `notice` | s→c | no | `{level:"info"\|"warn"\|"error", title, text}` — `message`, `showErrorDialog`, `alertUser`, `flashIncorrectAction` |
| `over` | s→c | no | `{winner, reason, matchOver}` — `finishGame` |
| `act` | c→s | — | `{action, ...}` — `clickCard` \| `clickPlayer` \| `clickAbility` \| `buttonOk` \| `buttonCancel` \| `useMana` \| `undo` \| `alphaStrike` \| `concede` \| `nextGame` \| `setPhaseStop` \| `setYield` |
| `answer` | c→s | — | `{askId, value}` — exactly one per `ask` |
| `resync` | c→s | — | `{}` → server replies with a fresh full `state` + `input` |
| `ping`/`pong` | both | no | keepalive |

**Design rule copied verbatim from Forge (`ProtocolMethod.java:84-86`): client→server
messages never expect a reply.** All blocking is one-directional.

**Why `input` is a separate frame but not separate client state.** Glass Table is
right that a client which correlates a prompt frame against a board frame is where
"the board threw the engine's answer away" bugs live (Endstep's own documented
failure mode). But prompt/buttons arrive on the EDT while the snapshot must be built
on the game thread, so they cannot share one frame without fighting the thread model.
Resolution: they stay two frames on the wire, and **`reduce()` merges `input` into the
single `GameState` object**. The view never sees two streams; a button is enabled iff
the engine said so, a card is clickable iff its id is in `state.input.selectable.cardIds`.
The client computes legality for nothing — not mana payability (Forge does no
payability prediction for humans, per manabrew's `AGENTS.md`), not targeting, not stops.

### 3.3 `state` body

```jsonc
{
  "gameId": "g1", "turn": 17, "round": 9, "phase": "COMBAT_DECLARE_BLOCKERS",
  "activePlayer": 0, "priority": 1, "gameOver": null,
  "players": [{
    "id": 0, "name": "Pacho", "isAi": false, "life": 17, "poison": 0,
    "counters": {}, "manaPool": {"W":1,"U":0,"B":0,"R":0,"G":0,"C":0},
    "zones": {
      "hand":        {"count": 5, "cards": [/*Card*/]},
      "battlefield": {"count": 4, "cards": [/*Card*/]},
      "graveyard":   {"count": 2, "cards": [/*Card*/]},
      "exile":       {"count": 0, "cards": []},
      "command":     {"count": 0, "cards": []},
      "library":     {"count": 21}
    }}],
  "stack":  [{"id":88,"sourceCardId":41,"controller":0,"text":"…",
              "targetCardIds":[17],"targetPlayerIds":[]}],
  "combat": {"bands":[{"attackerIds":[12],"defender":{"kind":"player","id":1},
                       "blockerIds":[31],"damageOrder":[31]}]}
}
```

`Card`:

```jsonc
{"id":41,"name":"Agent Phil Coulson","setCode":"MSH","manaCost":"{1}{W}",
 "types":"Legendary Creature — Human Spy Hero","power":"2","toughness":"2",
 "loyalty":null,"damage":0,"counters":{"P1P1":1},"tapped":false,"sick":false,
 "attacking":false,"blocking":false,"faceDown":false,"attachedToId":null,
 "attachmentIds":[],"controller":0,"owner":0,"zone":"battlefield",
 "abilities":[{"id":7,"text":"{T}: …","canPlay":true,"isSpell":false}]}
```

Redacted card: `{"id":42,"zone":"hand","controller":1,"hidden":true}` and nothing else.

**Amendment 2026-09-11 — still two card shapes, and the library carries cards.**
The redacted stub gained `owner` (five keys); a face-down card whose identity is
concealed is **not** a third shape — it takes the ordinary full branch, whose
`name` is `""` and `setCode` `"???"` because that is Forge's own face-down
characteristic, and its `alt` is `null`. (An intermediate M1 revision did invent
an eleven-key `faceDownHidden` object; `docs/protocol.md` §3.3 records it as
superseded, no emitter writes one, and `tools/check-redaction.mjs` fails any file
that carries one.) A `Card` gained `token`, `alt` (the
face-up half, only when `canFaceDownBeShownTo`) and, on the stack, nullable
`controller`/`owner`; `state` gained `stackCards`, since a spell on the stack is
in no player zone; and `zones.library` is now `{count, cards}`. `docs/protocol.md`
§3.2–§3.4 is the contract; `docs/research/06-hidden-information-audit.md` §6 is
the reasoning.

**`turn` counts player turns, not rounds** — report 04 measured 17
`GameEventTurnBegan` at turns 1..17 for a game the log calls "Turn 9". Emit both
`turn` and `round = ceil(turn/2)`; label the UI accordingly.

**Amendment 2026-09-11 — `events`.** Every `state` body also carries an `events`
array: the `GameEvent` batch that the `GameEventForwarder` just flushed, mapped to
small id-only objects (`zone`, `cast`, `resolved`, `attackers`, `blockers`, `damage`,
`life`, `tap`, `counters`, `attach`, `turn`, `phase`, `outcome`, …). It is the hook
for animating transitions in the arena renderer (`docs/ideas/arena-mode.md`, M7)
and ships in M1 because it is nearly free inside `handleGameEvents` and painful to
retrofit. Spec: `docs/protocol.md` §3.6. Events never carry names; unknown event
kinds are ignored by the reducer.

### 3.4 `ask` kinds — the blocking calls, enumerated

`{askId, kind, timeoutMs, ...}`, `kind` ∈

| kind | `IGuiGame` methods |
|---|---|
| `ability_menu` | `getAbilityToPlay` |
| `confirm` | `confirm`, `showConfirmDialog` |
| `options` | `showOptionDialog` |
| `text` | `showInputDialog` |
| `choose_list` | `getChoices` (and everything `AbstractGuiGame` builds on it: `one`/`oneOrNone`/`many`/`reveal`/`getInteger`/`insertInList`) |
| `order` | `order` → `OrderResult` |
| `choose_entities` | `chooseSingleEntityForEffect` (min=max=1), `chooseEntitiesForEffect` |
| `assign_damage` | `assignCombatDamage` — key `-1`/`null` means the defender (`PlayerControllerHuman.java:308-310`) |
| `assign_amount` | `assignGenericAmount` |
| `manipulate_list` | `manipulateCardList` |
| `open_zones` | `openZones`, `tempShowZones` |
| `sideboard` | `sideboard` |

Twelve kinds cover all fifteen blocking methods.

**Amendment 2026-09-11 — eleven kinds.** `open_zones` is **deleted**.
`openZones` / `tempShowZones` / `hideZones` / `restoreOldZones` reveal nothing
(`PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)` **[jar]** — no card accessor
at all); they open floating zone panels, they are called **on the EDT** where
blocking stalls every prompt, and they are answered locally. They become the
non-blocking hint `input.openZones`. Three more shapes in this table are wrong as
written and are corrected in `docs/protocol.md` §5: `order` answers
`{ordered, remember}` (Forge's `OrderResult` is `(List, boolean)`, not
top/bottom) and may never be `null`; every option is addressed by an **ask-local
index**, because Forge's `T` is frequently a colour, an integer or a cost rather
than a view object; and `choose_list` carries `reveal: true` for Forge's
`min = max = -1` "show these, select nothing" call. Sources:
`docs/research/07-wireguigame-spec.md` §1 (amendments A1–A8) and
`06-hidden-information-audit.md` §3.

**Two invariants worth tattooing.**

- **`updateButtons` with `ok.enabled === false` means the engine wants a card click,
  not a button.** Confirmed live in report 02 §4.7 — this is what stalls a
  button-only client at the discard step.
- **Every blocking `ask` must be answerable with `null`.** On disconnect or timeout,
  complete the future with `null` and return Forge's documented default
  (`RemoteClientGuiGame.java:436,442,453`; `assignCombatDamage` null is handled at
  `PlayerControllerHuman.java:302`), or the game thread wedges forever with no error.
  `ReplyPool.cancelAll()` on disconnect (`forge-gui/src/main/java/forge/gamemodes/net/ReplyPool.java:9-44`)
  plus a per-ask timeout. Concede must be reachable from every UI state.

### 3.5 Snapshot, not delta

v1 sends full coalesced snapshots. Report 04 measured a minimal projection at
~1.5 KB/frame × 605 frames ≈ 1 MB for a whole game over loopback. If a large board
ever feels slow, the upgrade is to diff **our own JSON tree** (RFC 7386 merge patch,
~80 lines in `Snap`) and add a `state_patch` type — a server-side change only,
because the reducer already applies snapshot and patch through one path. It is
explicitly **not** to couple to Forge's `TrackableProperty` dirty bits.

---

## 4. The frame log

`var/games/<gameId>/frames.jsonl`, written by the `mtg-table-log` thread, flushed per
line so a killed JVM still leaves a complete file. Line 0 is a session header:

```jsonc
{"v":1,"kind":"session","gameId":"g1","startedAt":"2026-09-11T20:14:03Z","seed":42,
 "forgeVersion":"2.0.14","forgeJarSha256":"…","seat":0,
 "decks":[{"player":0,"path":"decks/pacho-shield.dck","sha256":"…"}]}
```

Every later line is a frame with `"dir":"s2c"|"c2s"`. The log is **per seat** — it
contains exactly what this player was allowed to see, so it is safe to paste into a
bug report and it is the same stream the client consumed.

This buys three things for perhaps 100 lines of code:

1. **Front-end development with no JVM.** `web/` has a `ReplayTransport` that reads a
   `.jsonl` and exposes play/step/scrub. M4 and M5's UI work never waits on the engine.
2. **A bug is a file, not a story.**
3. **Committed golden fixtures** under `fixtures/games/` so the renderer has real
   input from day one.

Seeding: `MyRandom.setRandom(new Random(seed))` (verified present in 2.0.14;
`SimulateMatch.java:89` uses it) makes engine-level re-runs plausible. Do not promise
byte-identical replay — thread interleaving is not deterministic.

---

## 5. Repo layout

```
mtg-table/
  LICENSE                    GPL-3.0-or-later, whole repo
  NOTICE                     Forge (GPLv3), Scryfall, WotC Fan Content Policy
  README.md                  run instructions + an explicit NON-GOALS list
  .gitignore                 bridge/out/ var/ web/node_modules/ web/dist/
                             web/public/art.json *.jar
  config.json                { forgeJar, forgeHome, deck, wsPort, webPort }
  decks/pacho-shield.dck     already present
  docs/protocol.md           the living spec of §3
  docs/research/*.md         the five reports

  bridge/
    build.sh  run.sh
    src/mtgtable/*.java      (the 12 classes of §2.2)
    out/                     gitignored

  web/
    index.html vite.config.ts tsconfig.json package.json
    src/
      protocol.ts            hand-written types, mirrors docs/protocol.md
      reduce.ts              (GameState, Frame) => GameState — pure, no DOM, no io
      transport/transport.ts interface Transport { onFrame(cb); send(f) }
      transport/ws.ts        WebSocketTransport
      transport/replay.ts    LogReplayTransport (fetch a .jsonl; play/step/scrub)
      art.ts                 art.json lookup + text-card fallback
      render/                Board.tsx Zone.tsx CardTile.tsx Stack.tsx
                             AskModal.tsx PhaseStrip.tsx
      main.tsx
    public/art.json          generated, gitignored

  tools/
    check-forge.sh           assert jar + every class we depend on; print sha256
    make-forge-home.sh       symlink + profile properties
    fetch-art.ts             deck -> web/public/art.json

  fixtures/games/*.jsonl     committed recorded AI-vs-AI games

  forge-home/
    res -> /home/justin-a/forge/res
    forge.profile.properties   userDir=<abs>/var/forge  cacheDir=<abs>/var/cache

  var/                       gitignored (Forge writes 24 profile dirs, prefs, logs;
                             plus var/games/<id>/frames.jsonl)
  scripts/play.sh
```

---

## 6. How the Forge dependency is obtained

**It is not obtained. It is already installed and we compile against it.**

There is **no Maven coordinate for Forge anywhere**: `distributionManagement` points
at a local `file://` URL, there are no `<repositories>`, no JitPack, no `mvnw`. A
coordinate like `forge:forge-game:2.0.14` will never resolve. Do not try.

The jar is a complete compile-time *and* runtime dependency: `forge.game` (899
classes), `forge.ai` (264), `forge.gui` (189), `forge.player` (23),
`forge.gamemodes.net` (94), plus netty 4.1.115 **including websocketx**, jetty 9.4.57
**including `util.ajax.JSON`**, guava 33.3.1, xstream, jgrapht, tinylog, sentry.
Class-file major version 61 (Java 17).

Never vendor it into git (39 MB, GPL redistribution obligations). `.gitignore` `*.jar`
and read the path from `config.json` / `$FORGE_JAR`.

```bash
# tools/check-forge.sh — runs before every build
FORGE_JAR=${FORGE_JAR:-/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar}
[ -f "$FORGE_JAR" ] || { echo "FORGE_JAR not found: $FORGE_JAR"; exit 1; }
sha256sum "$FORGE_JAR"
for c in forge.gui.interfaces.IGuiGame \
         forge.gui.interfaces.IGuiBase \
         forge.gamemodes.match.AbstractGuiGame \
         forge.gamemodes.match.HostedMatch \
         forge.gui.control.GameEventForwarder \
         forge.util.MyRandom \
         org.eclipse.jetty.util.ajax.JSON \
         io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler; do
  java -m jdk.jdeps/com.sun.tools.javap.Main -cp "$FORGE_JAR" "$c" >/dev/null 2>&1 \
    || { echo "MISSING CLASS: $c"; exit 1; }
done
echo "forge jar OK"
```

```bash
# bridge/build.sh — this machine has NO javac binary; the JRE ships the compiler module
java -m jdk.compiler/com.sun.tools.javac.Main -cp "$FORGE_JAR" -d bridge/out \
     $(find bridge/src -name '*.java')
# NOTE: --release is unusable here (no ct.sym in the JRE image). Plain javac emits
# Java 21 bytecode and runs fine on Java 21. Do not add --release.
```

```bash
# bridge/run.sh
env -u DISPLAY java -Xmx4096m -Djava.awt.headless=true \
    -Dio.netty.tryReflectionSetAccessible=true -Dfile.encoding=UTF-8 \
    -Dsentry.uncaught.handler.enabled=false \
    -cp "bridge/out:$FORGE_JAR" "$@"
```

`-Dsentry.uncaught.handler.enabled=false` is **load-bearing during development**:
Sentry installs an uncaught-exception handler that turns startup crashes into a
silent `exit 1`.

```bash
# the one command the user types
./scripts/play.sh     # check-forge -> build -> boot JVM -> vite dev --open
```

### Bootstrap order (verified end-to-end in report 02 §4.6)

```java
GuiBase.setInterface(new HeadlessGuiBase(forgeHome));   // FIRST. Never construct
FModel.initialize(null, null);                          // forge.GuiDesktop — its static
                                                        // init throws HeadlessException
                                                        // (GuiDesktop.java:353/359).
Deck deck = DeckSerializer.fromFile(new File("decks/pacho-shield.dck"));
GameRules rules = new GameRules(GameType.Constructed);
rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
rules.setGamesPerMatch(1);
RegisteredPlayer me = new RegisteredPlayer(deck); me.setPlayer(GamePlayerUtil.getGuiPlayer());
RegisteredPlayer ai = new RegisteredPlayer(deck); ai.setPlayer(GamePlayerUtil.createAiPlayer("Opponent", 1));
hosted.startMatch(rules, EnumSet.of(GameType.Constructed), List.of(me, ai), me, wireGuiGame);
```

Measured: `FModel.initialize` 2,033 ms, 95,126 printings, AI-vs-AI game 3.6–4.1 s.
**Do not call `game.setNoGUIUser()`** — it exists in the 2.0.15 source checkout and
`SimulateMatch.java:210` calls it, but it does **not** exist in the 2.0.14 jar.

### Forge's own files are never written

`forge-home/res` is a symlink to `/home/justin-a/forge/res`;
`forge-home/forge.profile.properties` sets `userDir`/`cacheDir` under `var/`. Decks are
loaded with `DeckSerializer.fromFile` and **never** through
`FModel.getDecks().getConstructed()` — that path runs `DeckStorage.adjustFileLocation`
(`forge-core/src/main/java/forge/deck/io/DeckStorage.java:94-103`), which renames a
`.dck` to its `Name=` metadata and moves it up one directory, and deletes unparseable
ones. It would relocate the user's `~/.forge/decks/constructed/Pacho SHIELD.dck` to
`~/.forge/decks/Pacho SHIELD (Marvel Super Heroes).dck`. Add a grep-based lint banning
`getDecks()` under `bridge/`.

---

## 7. Card art without a card library

The engine's view carries `Name` + `SetCode` and an `ImageKey` like
`c:MSH/Agent Phil Coulson.full` (`forge-core/src/main/java/forge/util/ImageUtil.java:101-155`)
— **no collector number**, so per-print Scryfall URLs cannot be built at runtime.
For one known 28-card deck that does not matter.

`tools/fetch-art.ts` reads the `.dck`, resolves each distinct name once via
`GET https://api.scryfall.com/cards/named?exact=<name>&set=msh`, falling back to
`&set=msc`, then bare exact, then fuzzy — and writes
`{name: {front, back, artist, setCode, collectorNumber}}` of `cards.scryfall.io`
`normal` URLs to `web/public/art.json`. ~15 s, cached forever, misses written to a
visible list.

Non-obvious facts this encodes (report 03, verified live):

- **The deck spans two sets.** 18 of 28 distinct cards are in `msh`, 10 in `msc`
  (Marvel Super Heroes Commander, `parent_set_code: "msh"`). The ten lines in
  `Pacho SHIELD.dck` written **without** a `|MSH` suffix are exactly those ten.
- **`Peggy Carter, Secret Agent` does not exist in `msh` at all** —
  `/cards/named?exact=…&set=msh` returns HTTP 404; `msc` #523 is its only printing.
- Name alone is not a key: `Agent Phil Coulson` is msh #4 *and* msh #402 (extended
  art), and MSH has six different `Plains` prints. v1 accepts arbitrary Plains art.
- Multi-face rule is **prefer top-level `image_uris`, fall back to `card_faces`** —
  transform cards have no top-level `image_uris`, split and adventure cards do.
- Both `User-Agent` and `Accept: application/json` are **mandatory**; 2 req/s on
  `/cards/search|named|collection|random`, 10/s elsewhere, `*.scryfall.io` unlimited;
  honour `Retry-After` on 429. Credit artist + copyright wherever `art_crop` is shown.

A missing image renders a generated text card frame (name, cost, type, P/T all
already in the snapshot) and never blocks a click.

Deferred to a later project, not v1: the `node:sqlite` + FTS5 card library, the
`oracle_cards` bulk stream (note for then: the field is **`jsonl_download_uri`**,
gzipped JSONL — `download_uri` no longer exists), the image cache, and a `/api/images`
proxy. Report 03 is the spec when we want it.

---

## 8. Licensing

**GPL-3.0-or-later for the whole repo, from the first commit.** The Java bridge
implements Forge interfaces on the same classpath in the same JVM — unambiguously a
derivative. The TypeScript SPA talking JSON over a socket is arguably an arm's-length
separate work and could be licensed freely, but splitting licences buys nothing for a
personal project and costs an argument. GPLv3 has no network clause, which is why both
closed-source competitors (endstep.cc, forgeweb.app) are legitimate.

**Do not copy code from `witchesofthehill/manabrew`.** Its `forge-harness/` is exactly
the module we are writing and is actively maintained — which makes copying tempting —
but it is **AGPL-3.0-or-later**, and lifting any of it relicenses mtg-table to AGPL.
Read `forge-harness/src/main/java/forge/harness/AGENTS.md` as **prose guidance only**;
its three findings are worth days:

1. Forge does no mana-payability prediction for humans.
2. Feasibility probes must be silenced or they round-trip to the UI.
3. The protocol drives; the client only echoes action ids.

Never commit: the Forge jar, Forge's `res/` tree, card images, Scryfall bulk dumps.

---

## 9. Milestones

Each has one runnable command and a deliverable you can look at.

### M0 — The engine runs our code (1 evening)

`./tools/check-forge.sh && ./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke`
prints `FModel.initialize` timing, `cards in DB = 95126`, `deck = … (40 cards)`, and an
AI-vs-AI match result in under 10 seconds — with `~/.forge` and `~/forge` provably
untouched (sha1sum the trees before and after).

Deliverable: first commit. LICENSE, NOTICE, README with NON-GOALS, `.gitignore`,
`config.json`, `forge-home/`, `HeadlessGuiBase.java`, `Smoke.java`.

### M1 — Record a game and scrub through it in the browser (2 evenings)

`./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 --out fixtures/games/g1.jsonl`
runs two AI seats to completion and writes the frame log. Then
`npm run dev:replay -- fixtures/games/g1.jsonl` opens a browser page showing a text
board — turn/round, phase, both life totals, each zone as a list, hands as backs,
library counts, the stack, combat bands — with prev / next / play / speed.

This is the keystone graft. It builds `Json`, `Snap`, redaction, `GameLog`,
`protocol.ts`, `reduce.ts`, the `Transport` interface and the whole board renderer
**with no socket, no blocking input, and no possible deadlock**, and it leaves
committed fixtures so every later front-end evening runs without a JVM. It also tells
us whether all 40 MSH/MSC cards are supported (`Match.prepareAllZones` →
`revealUnsupported`) and whether the recurring
`SVar 'Any' not found in ability, fallback to Card (Quantum Reduction)` warning bites
— that card is in the user's deck.

> **Amendment 2026-09-11.** The `SVar 'Any' not found in ability` warning is benign and informational: the string is a hard-coded sentinel in `CostTeamwork` and fires for both Teamwork cards (Quantum Reduction and Helicarrier Strike) only when the AI evaluates the cost. See `docs/research/08-deck-card-coverage.md` §3 and PLAN.md M0.

Add the redaction test here: feed `g1.jsonl` to a checker asserting no opponent hand
card ever carries a `name`.

### M2 — A full game against the AI, in the terminal (2 evenings)

`./bridge/run.sh mtgtable.MtgTable --transport console` — the user beats (or loses to)
the Forge AI with their own deck without a browser.

`WireGuiGame` with all 36 members present behind `Transport`, plus `ReplyPool` and
`ConsoleTransport`. This de-risks the entire threading model — virtual EDT,
latch-blocking vs value-returning, answering from a third thread — with no WebSocket,
no DOM. **Every unimplemented member logs `UNIMPL <name>` and returns a safe default
rather than throwing**, so a game degrades instead of dead-ending, and the log tells
you which of the 36 actually fire for a W/U deck.

### M3 — The same game, in a browser tab (2 evenings)

`./scripts/play.sh` → play the S.H.I.E.L.D. deck against the AI to a win or a loss in
Chrome, clicking card names in lists and text buttons.

`WsTransport` (netty `HttpServerCodec → HttpObjectAggregator(1MB) → ChunkedWriteHandler
→ WebSocketServerProtocolHandler("/ws")`), `hello_ok`, reconnect via `resync`,
`cancelAll()` on disconnect, per-ask timeout. `web/` swaps `ReplayTransport` for
`WsTransport` — **the board component is unchanged**. Every session is logged and
replayable.

Ugly, complete, and the protocol is now proven against every question the engine
actually asks. **This is the "it works" moment**; everything after is polish.

### M4 — A board that looks like Magic (3 evenings)

`node tools/fetch-art.ts` → `art.json`; then real layout: opponent permanents row,
middle table, own permanents, hand at the bottom, left rail (life, zone counts,
decision panel), right rail (phase strip), floating stack panel. Real card images, tap
= 90° rotate, summoning-sick tint, `input.selectable` outlines clickable cards.

Deliverable: a screenshot the user would show someone.

### M5 — Nothing dead-ends (3 evenings)

Every `ask` kind gets real UI: mana payment (tap lands + the engine's own Auto button,
which runs `ComputerUtilMana.payManaCost` inside `InputPayMana`), targeting from
`selectable` min/max, attacker and blocker declaration, `assign_damage`,
`choose_list` / `choose_entities` / `order` / `assign_amount` modals, click-to-open
graveyard and exile browsers, SVG targeting arrows from `stack[].targetCardIds` and
`combat.bands` (perfect-arrows, MIT, ~150 lines).

Exit criterion: ten consecutive games with **zero `UNIMPL` lines** in `var/*.log` and
no state where the board is stuck waiting on something the browser cannot express.

### M6 — Comfort (2 evenings)

New Game without restarting the JVM (`HostedMatch.restartMatch`), Undo
(`IGameController.undoLastAction`, gated on `canUndoLastAction`), Concede, phase stops
backed by `FPref.PHASE_HUMAN_*`/`PHASE_AI_*` and queried via
`IGuiGame.isUiSetToSkipPhase`, Pass-To via `YieldController`'s per-(player, phase)
markers, always-yes/no via `AutoYieldStore`, keyboard shortcuts mirroring Forge's own
`SHORTCUT_*` keycodes (Y/N/P, space = OK/pass, Esc = cancel), mana-font pips, error
toasts. **Every one of these is an engine feature rendered, not a client state machine.**

Deliverable: three games back to back having typed one command.

### Deferred — explicitly out of scope until M6 ships

Second deck + deck picker + AI profile selector; the SQLite/FTS5 card library and card
browser; a deck builder; `state_patch` deltas; multiplayer; accounts; packaging;
engine-level seeded replay; bug-report zips.

**Total: ~13 evenings, first browser game at evening 7.**

---

## 10. Next working session — concrete task list

1. **Commit the skeleton.** Create `/home/justin-a/code/mtg-table/LICENSE`
   (GPL-3.0-or-later full text), `/home/justin-a/code/mtg-table/NOTICE` (Card-Forge/forge
   GPLv3 + link, Scryfall, WotC Fan Content Policy disclaimer),
   `/home/justin-a/code/mtg-table/.gitignore` (`bridge/out/`, `var/`, `web/node_modules/`,
   `web/dist/`, `web/public/art.json`, `*.jar`), and
   `/home/justin-a/code/mtg-table/README.md` whose **second section is a hard NON-GOALS
   list**: no multiplayer, no deck builder, no card-library package, no accounts, no
   packaging, no deltas, localhost only. Then `git add -A && git commit` — the repo has
   zero commits today.

2. **`/home/justin-a/code/mtg-table/config.json`**:
   `{"forgeJar":"/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar",
   "forgeHome":"forge-home","deck":"decks/pacho-shield.dck","wsPort":8642,"webPort":5173,
   "scryfallUserAgent":"mtg-table/0.1 (+https://github.com/<you>/mtg-table)"}`.
   Never hardcode the jar path anywhere else.

3. **`/home/justin-a/code/mtg-table/tools/check-forge.sh`** exactly as in §6 (the
   eight-class assertion list; all eight verified present today). Make it executable
   and run it — `forge jar OK` is the gate for everything below.

4. **`/home/justin-a/code/mtg-table/tools/make-forge-home.sh`** (idempotent):
   `mkdir -p forge-home var/forge var/cache`,
   `ln -sfn /home/justin-a/forge/res forge-home/res`, and write
   `forge-home/forge.profile.properties` with **absolute**
   `userDir=/home/justin-a/code/mtg-table/var/forge/` and
   `cacheDir=/home/justin-a/code/mtg-table/var/cache/`. It must never write inside
   `/home/justin-a/forge` or `/home/justin-a/.forge`. Run it.

5. **`bridge/build.sh` and `bridge/run.sh`** exactly as in §6 — compile with
   `java -m jdk.compiler/com.sun.tools.javac.Main`, **never** `--release`; run with
   `env -u DISPLAY`, `-Djava.awt.headless=true`,
   `-Dio.netty.tryReflectionSetAccessible=true`,
   `-Dsentry.uncaught.handler.enabled=false`.

6. **`bridge/src/mtgtable/HeadlessGuiBase.java`** implementing
   `forge.gui.interfaces.IGuiBase`. Copy the body shape from
   `forge-gui/tools/java/ForgeMatrixWriter.java:150-201` in the forge-src checkout, with
   **one mandatory change**: a single-thread executor whose thread is named
   `mtg-table-EDT`; `invokeInEdtLater` → `edt.execute`; `invokeInEdtAndWait` →
   `edt.submit(r).get()` (run inline if already on it); `isGuiThread()` →
   `"mtg-table-EDT".equals(Thread.currentThread().getName())`. Everything else returns
   null / no-op / identity; `getAssetsDir()` returns the absolute `forge-home` path
   **ending in `File.separator`**. Import traps found by compiling: `ISkinImage` is
   `forge.localinstance.skin.ISkinImage` (not `forge.assets`), `FSerializableFunction`
   is `forge.util.FSerializableFunction`, `IHasIcon` is `forge.game.player.IHasIcon`,
   `GameState` is `forge.game.GameState`.

7. **`bridge/src/mtgtable/Smoke.java`**: `GuiBase.setInterface(new HeadlessGuiBase(forgeHome))`
   **first**, then `FModel.initialize(null, null)`, then
   `DeckSerializer.fromFile(new File("decks/pacho-shield.dck"))`, two AI seats via
   `GamePlayerUtil.createAiPlayer`, `new Match(rules, players, "mtg-table")`,
   `match.startGame(game)`. **Do not call `game.setNoGUIUser()`** — absent in 2.0.14.

8. **Run M0 and record the evidence.**
   `./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke 2>&1 | tee var/smoke.log`, then
   log four things: `FModel.initialize` time, card count (expect 95126), that the deck
   loaded as 40 cards, and the full stderr — specifically whether
   `Match.prepareAllZones` emits any `revealUnsupported` complaint for an MSH/MSC card,
   and whether `SVar 'Any' not found in ability, fallback to Card (Quantum Reduction)`
   still appears. Also `sha1sum -c` the `~/.forge/decks/constructed/` tree before and
   after to prove nothing moved.

9. **`git commit -m "M0: headless Forge smoke test, GPLv3 skeleton"`.**

Stretch, only if M0 lands early: start `bridge/src/mtgtable/Json.java` — a `JsonOut`
StringBuilder writer (`obj()/arr()/n(key,value)/end()`, correct string escaping) for
the hot outbound path, with inbound parsing delegated to
`org.eclipse.jetty.util.ajax.JSON.parse` (bundled, verified; numbers arrive as `Long`,
arrays as `Object[]`). `forge.deck.DeckUrlLoader$JsonParser` (also bundled) is the
fallback if Jetty's parser proves awkward. Either way: **no gson, no downloads.**

---

## 11. Risks and mitigations

**Thread discipline is the whole project.** A constant `isGuiThread()` throws at the
mulligan; walking the view graph off the game thread corrupts the `Tracker` silently,
which is far worse. Mitigation: the named-thread `isGuiThread()`; `Snap.state()` opens
with a game-thread assert; `Transport.deliver()` asserts it is on neither the game
thread nor the EDT. Three asserts written in the first hour turn the worst class of bug
into an immediate stack trace. Ordering also helps: M1 proves the whole serialisation
half with zero blocking calls before M2 introduces any.

**A wedged game thread looks identical to a hung app.** Any blocking `ask` that never
gets a reply parks the game thread forever with no error. Mitigation: `ReplyPool` with
`cancelAll()` on disconnect, a per-ask timeout, Forge's documented null-defaults for
every kind, a second answer for a completed `askId` dropped with a `notice`, and Concede
reachable from every UI state.

**The 36 methods hide surprises that only fire on specific cards.**
`manipulateCardList` (surveil), `order` (multiple triggers), `assignGenericAmount`
(divided damage), `openZones` (library search) will not appear until a card causes them.
Mitigation: `UNIMPL <name>` logging plus a visible browser toast, safe defaults instead
of throws, and `grep UNIMPL var/*.log` as the M5 exit criterion.

**Hidden-information leak.** The bridge sees the opponent's entire hand and library —
Forge does no server-side redaction — so the default failure mode is shipping it.
Mitigation: exactly one card-serialization function, gated on `canBeShownTo`; libraries
as counts; the M1 redaction test. Open gap: enumerate `DelayedReveal` / `tempShowZones`
/ `openZones` reveal sites before M3.

**Forge mutating the user's real files.** `FModel.initialize` creates 24 profile
directories; `getDecks().getConstructed()` renames and moves `.dck` files and deletes
unparseable ones. Mitigation: `forge.profile.properties` redirecting into `var/`,
`DeckSerializer.fromFile` from our own copy, a lint banning `getDecks()` in `bridge/`,
and the M0 checksum check.

**Version drift between the 2.0.14 jar and the 2.0.15 source checkout.** Code copied
verbatim from forge-src will sometimes not compile (`Game.setNoGUIUser()` is the known
case; gson is a 2.0.15 dependency absent from the jar; `forge.view.Main sim` cannot run
headless at all in 2.0.14). Note the jar's manifest says `2.0.14-SNAPSHOT-08.08`, i.e.
much closer to master than the version number suggests — `GameEventForwarder`,
`DeltaSyncManager` and `IGuiGame.handleGameEvents` are all present in it. Mitigation:
treat forge-src as prose, never copy-paste; confirm every signature with `javap` before
using it; `check-forge.sh`; `forgeJar` stays one config value so a 2.0.15 swap is one
line plus a rebuild. `IGuiBase` and `IGuiGame` are byte-identical across the two
versions, which is why this seam is a safe place to stand.

**Protocol drift between the Java emitter and the TS reducer.** We deliberately skipped
codegen (§12, decision 4), so the two ends are hand-maintained. Mitigation: `reduce()`
throws on an unknown `type`, an unknown `ask.kind`, or a `v` major mismatch — in the
browser that renders a loud red banner naming the dropped frame rather than silently
ignoring it. Plus committed fixture logs replayed by `node --test`, so a Java-side change
that breaks the contract fails a TypeScript test. If drift becomes a real annoyance,
Glass Table's `schema.ts` → codegen is the documented upgrade and is additive.

**Art resolution is name-keyed and the deck spans two sets.** No collector number in the
view, `Peggy Carter` 404s on `msh`, six Plains prints, and mid-game tokens have no deck
entry. Mitigation: the msh → msc → exact → fuzzy ladder, a visible miss list, and a
generated text card frame so a missing image is cosmetic and never blocks a click.

**Underestimating the board UI.** M4/M5 are six of ~13 evenings and have no verified
prior run behind them. Mitigation: M3 ships a hideous but *complete* client first, so the
user is playing before the pretty work starts, and the M1 fixtures mean board iteration
never waits on a JVM.

**Scope creep back into the research reports.** All four describe a much larger system.
Mitigation: the NON-GOALS list is written in the first session, before any code;
anything not on the line from `IGuiGame` to a DOM node is a GitHub issue, not a file.

---

## 12. Decisions recorded

See the structured decision list accompanying this document (`DECISIONS.md`, which
has grown since this report was written — fourteen entries as of 2026-09-11). The
load-bearing ones at the time of writing were: the `AbstractGuiGame` seam, the fat jar over a source build, WebSocket JSON
over Forge's own protocol, hand-written types over schema codegen, `GameEventForwarder`
over `updateCards`, the frame log + replay transport, the AI-vs-AI recorder before any
human seat, `input` merged in the reducer, React with plain hooks, `art.json` over a
SQLite card library, and GPL-3.0-or-later with no manabrew code.

## 13. Only the user can decide

1. **Licence: GPL-3.0-or-later (recommended) vs AGPL-3.0-or-later to fork manabrew's
   `forge-harness`.** The plan assumes GPL and no manabrew code.
2. **Is the +2-evening M1 recorder worth it**, or should we go straight for the browser
   seat (first game at evening 5 instead of 7, at the cost of no replay, no fixtures,
   and JVM-coupled UI work)?
3. **React (recommended) vs vanilla TS** for `web/`.
4. **Should `mtg-cards resolve --write` ever rewrite `~/.forge/.../Pacho SHIELD.dck`**
   in place to add the missing `|MSC` suffixes? Default: write a copy, never mutate.
5. **Card images hot-linked from `cards.scryfall.io` (v1 default) vs proxied through our
   own origin** with a 302, the way Endstep does.
6. **A JDK.** Not needed for this plan — but if the user ever wants `jar`, `jshell`, a
   debugger or Maven, unpack a Temurin 21 tarball into `tools/jdk/` (no sudo) or install
   `openjdk-21-jdk` with sudo. Which?
7. **GitHub: public repo or private?** Affects whether the NOTICE/attribution and the
   WotC Fan Content disclaimer need to be publication-quality on day one.
8. **Is losing to the Forge AI acceptable in v1**, or does the AI profile/difficulty
   picker need to come forward from the deferred list?

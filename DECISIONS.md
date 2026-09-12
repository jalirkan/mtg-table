# mtg-table — decisions

The load-bearing decisions, each dated, with the reasoning that produced it and the
alternatives that were rejected. Rationale is condensed from
[`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
§1 and §12; the citations live there and in the four research reports.

Reversing one of these is a redesign, not a refactor. If you are about to
contradict an entry, add a new dated entry superseding it rather than editing the
old one.

---

## D1 — Reuse Forge's own GUI seam: subclass `AbstractGuiGame`

**2026-09-11**

**Decision.** The bridge subclasses `forge.gamemodes.match.AbstractGuiGame` (36
remaining abstract members, mechanically diffed with `javap`) and reuses
`PlayerControllerHuman` verbatim. We never write a `PlayerController`, and we
never touch Forge's Netty / Java-serialization wire.

**Rationale.** `IGuiGame` is the seam Forge's own network client stands on, so
every question the engine can ask a UI is already enumerated there and already
battle-tested. `IGuiBase` and `IGuiGame` are byte-identical between the 2.0.14 jar
and the 2.0.15 source checkout — the most version-stable place to stand.

**Rejected.** Writing our own `PlayerController` (re-implements decision logic
Forge already has, and diverges on every card that surprises us). Driving Forge's
`RemoteClient` protocol (see D3).

## D2 — Compile against the installed fat jar; no source build

**2026-09-11**

**Decision.** Compile and run against
`~/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar` using the JRE's
`jdk.compiler` module. No Maven, no Gradle, no JDK install, no Forge source build,
no vendoring. The path is one config value (`config.json` / `$FORGE_JAR`).

**Rationale.** The jar is a complete compile-time *and* runtime dependency: 899
`forge.game` classes, 264 `forge.ai`, plus Netty 4.1.115 (with `websocketx`) and
Jetty 9.4.57 (with `util.ajax.JSON`). **There is no Maven coordinate for Forge
anywhere** — `distributionManagement` points at a local `file://` URL, no
repositories, no JitPack. `forge:forge-game:2.0.14` will never resolve.

**Rejected.** Building Forge from source (hours, needs Maven we are not
installing). Vendoring the 39 MB jar into git (GPL redistribution obligations, and
`*.jar` is gitignored for that reason).

## D3 — One JSON WebSocket on loopback, not Forge's own protocol

**2026-09-11**

**Decision.** JSON text frames over `ws://127.0.0.1:8642/ws`. Message *shapes* are
copied from `forge.gamemodes.net.ProtocolMethod` (45 server→client, 15
client→server); **none of its encoding** is reused.

**Rationale.** That enum is a tested list of every question a Magic engine asks a
UI, and collapses cleanly to 6 + 4 message types. But `DeltaPacket` carries
`Map<TrackableProperty,Object>` with `ColorSet`, `ManaCost`, `EnumSet`,
`CounterMap` and serialized lambdas over LZ4'd Java serialization with `IdRef`
substitution — its entire saving depends on both ends being Forge instances. A
browser is not one. Netty's `websocketx` is already in the jar, so the socket
costs zero new dependencies.

**Rejected.** Speaking Forge's `DeltaSyncManager` protocol from JavaScript
(intractable). HTTP polling (no server-initiated `ask`).

## D4 — Hand-written types on both ends, not schema codegen

**2026-09-11**

**Decision.** `docs/protocol.md` is the spec; `web/src/protocol.ts` and the Java
emitter are both written against it by hand. No shared schema, no code generator.

**Rationale.** The protocol is 6 + 4 message types and one `Card` shape. A
generator is more machinery than the thing it generates. Drift is caught instead:
`reduce()` throws on an unknown `type`, an unknown `ask.kind`, or a `v` major
mismatch — a loud red banner naming the dropped frame, never a silent ignore —
plus committed fixture logs replayed by `node --test`, so a Java change that
breaks the contract fails a TypeScript test.

**Rejected.** A `schema.ts` → codegen pipeline. It stays the documented, additive
upgrade if drift ever becomes a real annoyance.

## D5 — Snapshot on `GameEventForwarder`, never in `updateCards`/`updateZones`

**2026-09-11**

**Decision.** Register `forge.gui.control.GameEventForwarder` by hand in
`openView` (`game.subscribeToEvents(fwd)`, plus `addObserver(fwd)` on each human
controller's `InputQueue`) and build snapshots in `handleGameEvents`. Leave
`updateCards` / `updateZones` as inherited no-ops.

**Rationale.** This corrects reports 01/02. Those callbacks arrive on the **EDT**,
and the `Tracker`-backed view graph is game-thread-only, not thread-safe: walking
it off-thread corrupts it *silently*, which is worse than a crash.
`HostedMatch` only auto-registers the forwarder for a `RemoteClientGuiGame`, so we
do it ourselves. The forwarder also coalesces (50 events / 500 ms / every
`InputQueue` change, i.e. exactly before the game thread blocks for input): a
measured 3,388 raw events collapse to 605 states; naive per-event snapshots
produced 5.3 MB.

**Rejected.** Snapshotting per `GameEvent`. Snapshotting on the EDT.

## D6 — Every frame is logged to JSONL, and replay is a first-class transport

**2026-09-11**

**Decision.** Append every frame to `var/games/<id>/frames.jsonl` (own thread,
flushed per line, session header on line 0, `dir` on every frame). The browser has
two transports behind one interface: WebSocket and log replay.

**Rationale.** ~100 lines buys three things. Front-end work with no JVM running
(M4 and M5 never wait on the engine). A bug becomes a file, not a story. And
committed golden fixtures under `fixtures/games/` give the renderer real input
from day one. The log is **per seat** — exactly what that player was allowed to
see — so it is safe to paste into a bug report.

**Rejected.** Logging only on error. Byte-identical engine replay: `MyRandom`
seeding makes re-runs plausible, but thread interleaving is not deterministic.

## D7 — The AI-vs-AI recorder ships before any human seat

**2026-09-11**

**Decision.** M1 (`RecordMatch`, two AI seats, frame log, browser scrubber) lands
before M2 introduces a single blocking call.

**Rationale.** It finishes and visually debugs the whole serialisation half — the
view→JSON codec, redaction, the reducer, the board renderer — **with no socket, no
blocking input and no possible deadlock**. Thread discipline is the entire risk
here; this ordering means it is faced once, alone, in M2. M1 also reports whether
all 40 MSH/MSC cards are supported, and hosts the redaction test.

**Rejected.** Going straight for the browser seat: first game at evening 5 instead
of 7, at the cost of no replay, no fixtures, and every UI evening coupled to a
JVM. Open question #2 in `PLAN.md`.

## D8 — `input` is its own frame but not its own client state

**2026-09-11**

**Decision.** Prompt / buttons / selectables travel as a separate `input` frame,
and `reduce()` merges it into the single client `GameState`. The view never sees
two streams.

**Rationale.** A client that correlates a prompt frame against a board frame is
where "the board threw the engine's answer away" bugs live (Endstep's own
documented failure mode). But prompts arrive on the EDT while snapshots are built
on the game thread, so one frame would fight the thread model. Merging in the
reducer gets both: `render(state)` is total, a button is enabled iff the engine
said so, a card is clickable iff its id is in `state.input.selectable.cardIds`.

**Rejected.** One combined frame (fights the threads). Two client state machines.

## D9 — React with plain hooks for `web/`

**2026-09-11**

**Decision.** React + Vite + TypeScript, plain `useState`/`useReducer`. No Redux,
no state-management library, no component framework.

**Rationale.** The client is `render(reduce(frames))`. That is React's exact
shape, and the reducer is already a pure `(GameState, Frame) => GameState` with no
DOM and no IO — so the only library-shaped problem is already solved without a
library. Keeping React's dependency surface to React and Vite keeps the GPL story
and the build simple.

**Rejected.** Vanilla TS (hand-rolled DOM diffing for a board this dynamic is the
worse trade; open question #3 in `PLAN.md` if the user disagrees). Redux, signals,
or any extra state library.

## D10 — v1 card art is a generated `art.json`, not a card library

**2026-09-11**

**Decision.** `tools/fetch-art.ts` resolves each distinct deck card name once
through Scryfall (`msh` → `msc` → bare exact → fuzzy) and writes
`web/public/art.json`. No SQLite, no FTS5, no bulk dump.

**Rationale.** The engine's view carries `Name` + `SetCode` but **no collector
number**, so per-print URLs cannot be built at runtime anyway. For one known
28-distinct-card deck that does not matter: ~15 s, cached forever, misses written
to a visible list. A missing image renders a generated text card frame (name,
cost, type, P/T are all already in the snapshot) and never blocks a click.

**Rejected.** The `node:sqlite` + FTS5 card library and image cache — deferred, not
dismissed; report 03 is its spec.

## D11 — GPL-3.0-or-later for the whole repo, and no manabrew code

**2026-09-11**

**Decision.** GPL-3.0-or-later, whole repository, from the first commit. No code
is copied from `witchesofthehill/manabrew`.

**Rationale.** The bridge implements Forge interfaces on the same classpath in the
same JVM — unambiguously a derivative work. The TypeScript SPA talking JSON over a
socket is arguably arm's-length and could be licensed freely, but splitting
licences buys a personal project nothing and costs an argument. GPLv3 has no
network clause, which is why both closed-source competitors are legitimate.
manabrew's `forge-harness` is exactly the module we are writing — tempting to copy
— but it is **AGPL-3.0-or-later**, and lifting any of it relicenses mtg-table to
AGPL. Prose only.

**Rejected.** A split GPL/MIT licence. AGPL-3.0-or-later to permit forking
`forge-harness` (open question #1 in `PLAN.md`).


## D12 — `state` frames carry an id-only `events` list

**2026-09-11**

**Decision.** Every `state` body includes `events`: the `GameEvent` batch the
`GameEventForwarder` just flushed, mapped to small objects that carry ids only
(`docs/protocol.md` §3.6). Ships in M1. Unknown event kinds are ignored by the
reducer rather than thrown.

**Rationale.** The user wants an eventual cinematic "arena" renderer (M7) in the
style of the Yu-Gi-Oh anime. Animations key off transitions — cast, attack,
damage, death — and a snapshot protocol forces a renderer to diff frames and guess.
The batch is already in hand inside `handleGameEvents` on the game thread, so
emitting it costs ~100 lines now and would be a protocol migration later. Ids only
keeps redaction trivially correct: an unresolvable id is a card the viewer may not
see.

**Rejected.** A separate `event` frame type (doubles frame count and re-creates
the correlation problem D8 avoids). Names or oracle text in events (a second
redaction path). Deferring to M7 (retrofit cost).

## D13 — `UI_SELECT_FROM_CARD_DISPLAYS` is off, in every process, before the first game

**2026-09-11**

**Decision.** The shared bootstrap (`Smoke`, `RecordMatch`, and `MtgTable` from M2
on — factor it into one `Bootstrap.java`) runs, immediately after
`FModel.initialize`:

```java
FModel.getPreferences().setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false");
```

in memory only — **never `prefs.save()`**, which would write into `var/forge/` and
make the behaviour depend on run order. The same bootstrap asserts
`FPref.LOAD_CARD_SCRIPTS_LAZILY` is `"false"` (its default), because D14's card
overlay depends on the eager load order. `IGuiBase.isLibgdxPort()` stays `false`.

The bootstrap touches a **third** preference,
`ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`, and it is **not** part of this
decision: it exists for D14's card overlay, it is set **before**
`FModel.initialize` rather than after, and its cost is recorded there. This one
is the only pref D13 owns.

**Rationale.** The pref defaults to `"true"` (`ForgePreferences.java:157`) and that
default makes this client unplayable in two places, both measured in
`docs/research/08-deck-card-coverage.md` §5 and `06-hidden-information-audit.md`
§0.3, §P4, §P5:

- **A scry 1 ships the whole library.** `arrangeForScry` with the pref on calls
  `manipulateCardList(title, player.getCardsIn(Library), topN, …)` — the player's
  *entire ordered library* as the `cards` argument. Spy Kit is in the deck and
  attacks-alone is the deck's theme, so this fires on a routine combat trigger,
  not in a corner case. With the pref off, scry 1 becomes a two-option `confirm`
  and scry N a `choose_list` over the top N.
- **Library search becomes a board click on cards that are not on the board.**
  `useSelectCardsInput` with the pref on routes library / graveyard / exile /
  command / sideboard choices to `InputSelectEntitiesFromList`, i.e. to
  `input.selectable.cardIds` — while `state.players[].zones.library` carries only
  `count` plus whatever `canBeShownTo` allows (`docs/protocol.md` §3.4). The user
  would be asked to click cards the client was never sent.

Everything then arrives as an `ask` carrying its own cards, which is what
`docs/protocol.md` §5 already models. It is a deliberate deviation from stock
Forge desktop that trades fidelity for a client we can finish, and it closes a
leak.

**Rejected.** Leaving the default and truncating `manipulate_list.cards` to the
`manipulable` subset (keeps a whole-library code path alive and leaks the library
*order*, which is itself information). Setting the pref and saving it (makes
correctness depend on a file in `var/`). Making the client render a selectable id
it has no card for (invents rules logic in the browser).

## D14 — Ship one corrected card script as a user overlay: A.I.M. Scientists

**2026-09-11**

**Decision.** `forge-home/custom-cards/a_i_m_scientists.txt` is a committed copy of
Forge's stock script with the single line `K:Trample` deleted and a provenance
comment at the top. `tools/make-forge-home.sh` creates `var/forge/custom/cards/`
(`ForgeConstants.USER_CUSTOM_CARDS_DIR` — Forge does not create it, and
`CardStorageReader` throws if it is missing, which `FModel` swallows into
`customReader = null`) and copies the file there. `Smoke` proves the override took
by printing the loaded card's keywords from `StaticData` after `initialize`, and
by confirming deck legality still passes.

**The third preference, and it belongs to this decision, not D13.** The same
bootstrap sets, **before** `FModel.initialize` and not after it:

```java
prefs.setPref(FPref.ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE, "true");
```

- **Why it must precede `initialize`.** `FModel`'s `StaticData` supplier is a
  `Suppliers.memoize(...)` that reads this pref as a constructor argument
  (`FModel.java:83-90`, the `getPrefBoolean(FPref.ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE)`
  row). Once the database is built the value is frozen; setting it afterwards, as
  D13's pref is set, would do nothing at all.
- **What it buys.** `StaticData.loadCustomCards()` calls `CardRules.setCustom()`
  on every script read from the user overlay (`StaticData.java:153`), so the
  A.I.M. Scientists above is flagged custom, and `DeckFormat.java:449` then
  rejects **any** deck containing a custom card
  (`"contains a Custom Card: … Please Enable Custom Cards in Forge Preferences"`).
  Without the pref, shipping the fix makes `decks/pacho-shield.dck` — the user's
  own deck — illegal, and `Smoke`'s conformance check fails.
- **Accepted cost.** The pref is not scoped to our one script: deck conformance
  stops rejecting **any** custom card, in every process. That is acceptable only
  while `forge-home/custom-cards/` holds exactly the one file this repo ships. A
  second overlay script is a decision to re-open here, not a file to drop in.

Also set, in memory and never saved, is D13's
`UI_SELECT_FROM_CARD_DISPLAYS = "false"` — *after* `initialize` — and
`LOAD_CARD_SCRIPTS_LAZILY` is *asserted* `"false"` before it. Three preferences,
three different moments; `Bootstrap.initializeModel` is the only place any of
them is touched.

**Rationale.** Forge's `a/a_i_m_scientists.txt` gives the card **trample, which the
printed card does not have** — verified three ways in
`docs/research/08-deck-card-coverage.md` §2: Scryfall's `keywords` and
`oracle_text` for both `msh/44` and the named lookup have no trample; Forge's own
`Oracle:` line in the same file contradicts its own `K:` line, which is the
signature of a scripting slip; and the line is still present in Forge master
today, so waiting for an upgrade fixes nothing. A 3/3 trampler in a 40-card deck
changes blocks and races — this is precisely the divergence that makes the
on-screen game disagree with the cards in the user's hand.

The override directory is **not** `forge-home/res/cardsfolder`:
`ForgeConstants.CARD_DATA_DIR` points into the user's real install, which hard
rule "never write outside this repo" forbids touching. Forge's user overlay is a
*second* reader (`FModel.java:214-222`) whose contents `StaticData.loadCustomCards`
puts into the **same** map after the main tree, so a custom file with the same
`Name:` silently wins. `USER_DIR` is redirected by
`forge-home/forge.profile.properties`, so the effective path is under `var/`,
which is gitignored — hence the committed source of truth plus a copy step.

**Rejected.** Editing Forge's own `cardsfolder` (forbidden, and it is the user's
install). Living with the divergence (it changes games, silently). Adding
`SVar:Any:0` to Quantum Reduction and Helicarrier Strike while we are in there —
see D13's neighbour finding: that warning is benign
(`docs/research/08-deck-card-coverage.md` §3; the string `"Any"` is a hard-coded
sentinel in `CostTeamwork`, not in any card file, the computed amount is 0 either
way, and all three rules paths skip it), so the card scripts stay honest and the
warning is classified **informational** in `Smoke` / `RecordMatch` rather than
treated as a finding.

## D15 — The ask timeout is a transport policy, not a protocol constant

**2026-09-11**

**Decision.** `Transport.askTimeoutMs(kind)` is asked once per `ask`, and the
game thread parks in `ReplyPool.await(askId, timeoutMs)` for exactly that long.
Each transport answers for itself, and the three shipped answers are
deliberately different:

| transport | `askTimeoutMs` | why |
|---|---|---|
| `console` | **`0` — wait forever** | a human at a terminal is allowed to think, and there is no disconnect to recover from: the only exits are a typed answer, `concede`, or EOF |
| `auto` | **30,000 ms** (`AutoTransport.ASK_TIMEOUT_MS`) | a policy that has not answered in 30 s is a bug in the policy, and a test suite should fail rather than hang |
| `null` | inherits `auto`'s 30 s | it answers on the next worker tick; the cap is the wedge detector, not the schedule |

A timeout is **not** an error. It resolves to Java `null`, which is the same
value a disconnect, a `cancelAll()` and a literal JSON `null` produce, and
`docs/protocol.md` §5.4 already defines what every kind does with it.
`ReplyPool` prints `ASK TIMEOUT <askId> after <n>ms -> null` so the event is
visible in the log without being fatal, and a separate 30 s `ASK PENDING`
watchdog names an ask that is still outstanding, which is how an infinite
console timeout stays debuggable.

**Rationale.** The alternative — one constant in the protocol — is wrong in both
directions at once. Any finite value is a bug for the console (the engine gives
up while the user reads their hand, and Forge takes the default *silently*,
which is worse than a hang because the game continues wrongly). Any infinite
value is a bug for `auto` and `null`, whose whole job in `check-all.sh` is to
fail fast. The value is genuinely a property of *who is answering*, so it lives
on the transport. M3's `WsTransport` inherits the question and will need its own
answer, tied to the socket's liveness rather than to a clock.

**Rejected.** One `ASK_TIMEOUT_MS` constant for every transport. A per-kind
table (`confirm` is fast, `manipulate_list` is slow) — the *kind* argument is
there so a transport can do this if it ever needs to, but none does: the seat,
not the question, is what makes an answer slow. Throwing on timeout (there is no
caller that can handle it; §5.4's defaults exist precisely so there does not
need to be).

## D16 — `AutoTransport` is the automated human, and `NullTransport` overrides only its answer half

**2026-09-11**

**Decision.** `AutoTransport` is a full seat driven by a minimal policy: on an
`input` frame it presses the enabled button (OK when OK is enabled, Cancel
otherwise) and clicks the first selectable card when the engine demands a click;
on an `ask` frame it answers with the minimal legal value for the kind. It
carries two watchdogs — `STUCK_MS = 60 s` with no frame at all concedes, and
`STEP_CAP_MS = 2 s` bounds any single decision — and a `SETTLE_MS = 120 ms`
quiet period so it acts on a board that has stopped moving. `NullTransport`
**extends** it and overrides exactly one method, `onAsk`, to answer the literal
`null`.

**Rationale.** Report 07 §10's build order says step 3 is a null transport that
answers every ask with `null` and plays a game out on Forge's documented
defaults. **Measured, that does not finish a game, and the reason is the finding
the whole milestone turns on:** with `isLibgdxPort() == false` (D18) a human seat
is driven by the *input* path, not by asks. The very first decision of the very
first game — "you have won the coin toss, play or draw?" — is an `InputConfirm`:
a prompt and two buttons, with no `IGuiGame.confirm` anywhere in it. The first
build parked there after five frames, having proved nothing. So the input policy
had to exist anyway, and the honest factoring is one policy class with the
answer half swapped. What remains is the distinction actually worth testing:
`null` proves every value-returning member survives Forge's own default, `auto`
proves it survives a real value.

`auto` plays **badly on purpose**. Clicking the first selectable card is not a
strategy; it is a way to reach as many engine code paths as a real seat does —
the mulligan, the Teamwork cost, blockers, damage assignment — without modelling
any of them. It produced five of the committed human-seat fixtures and it is
step 9 of `check-all.sh`.

A null answer also travels the ordinary inbound path (`Inbound.onAnswer`, on
`mtg-table-io`) rather than completing the future inside `ask`. Before that, a
`null`-transport log held N asks and **zero** `answer` frames — on disk
indistinguishable from a wedged session, which contradicts protocol §8.3 ("it is
the same stream the client consumed") and would have made a real wedge
unnoticeable.

One decision per **settled board**, not one per frame, and that is not a
detail. A single engine decision produces several frames —
`showPromptMessage` and `updateButtons` are two EDT calls and therefore two
`input` frames, with a `state` usually landing between them — so a policy that
acts on every frame fires three clicks for one decision and queues them all on
the EDT; measured, the first version of this class burned its whole plan during
the mulligan that way. "Settled" cannot mean "no frames at all" either, because
`AbstractGuiGame.awaitNextInput()` re-pushes the same prompt on a 250 ms timer
while the engine thinks. So **an `input` frame identical to the last one is not
activity**; only a changed input, a new `state` or a `notice` is.

**Rejected.** Report 07 §10 step 3 as written (an asks-only null transport;
report 07 is wrong here and has not been corrected — it is on the M2 follow-ups
list in `PLAN.md`). Two unrelated policy classes (the input half is identical and
would have drifted). A cleverer `auto` that tries to win (it would stop being a
coverage tool the moment it started making choices for a reason). Acting once per
frame (three clicks per decision, all queued on the EDT).

## D17 — Acts run on the virtual EDT; answers arrive on `mtg-table-io`

**2026-09-11**

**Decision.** `Transport.Inbound` has two methods and they go to two different
places. Both open with the same pair of asserts —
`Transport.assertNotGameThread` and `Transport.assertNotEdt` — so the contract
is mechanical and not a comment:

- **`onAct`** logs the c2s frame, then dispatches the mutation through
  `FThreads.invokeInEdtNowOrLater` — so every act reaches Forge on
  `mtg-table-EDT`, and `IGameController` is only ever called from there.
- **`onAnswer`** completes the `ReplyPool` future *on the calling thread*. The
  parked game thread wakes up inside `ReplyPool.await` and hands the value back
  to Forge itself.

The calling thread is **`mtg-table-io`**, the reader thread every transport
starts, with two named one-shot exceptions that are asserted like anybody else:
`AutoTransport`'s progress watchdog concedes via `onAct` when no frame has
arrived for a minute (it cannot go through the reader — the reader is what is
not moving), and `ConsoleTransport`'s quit thread calls `onDisconnect` after a
concede (the reader has already stopped, which is what quitting means). The
contract written down is therefore the one the asserts enforce, **never a game
thread and never the EDT**, because M3's `WsTransport` is being written against
it.

An act that throws is caught, logged, and turned into a `notice` — never a
crash and never a block, because protocol §2.2 says the server tolerates **any**
act at any time, including one that has become meaningless.

**Rationale.** Desktop Forge is safe by accident of being single-threaded in the
right place: `InputBase.finished` is a plain non-volatile field written by
`stop()` via `invokeInEdtNowOrLater` and read by `selectCard` /
`selectButtonOk`, and that is only correct because both ends are the EDT.
Dispatching acts anywhere else reproduces a data race Forge has never had to
think about. Routing them through the virtual EDT also serialises clicks against
prompt rendering for free.

Answers cannot take the same route, because the thread that must receive them is
already parked in `await` — an EDT hop would deadlock a call whose entire
purpose is to block the game thread. Pinning them to the io thread instead makes
"who may complete a future" a one-line assert rather than a convention.

**Rejected.** Completing the reply future from whatever thread the transport
happened to be on (unassertable, and the console's reader thread and the
policy's worker thread are different threads). Dispatching acts on the game
thread (it is parked; that is the whole design). Letting an act exception
propagate (it kills the io thread and takes the session with it).

## D18 — `isLibgdxPort()` stays `false`, so the input path is the primary path

**2026-09-11**

**Decision.** `HeadlessGuiBase.isLibgdxPort()` returns `false`, permanently, and
M2 was built **input path first, ask path second** as a consequence.

**Rationale.** This one boolean reroutes most of the engine. Nearly every
yes/no in Forge has two implementations, and every direct
`getGui().confirm(...)` call site is guarded by
`if (getGui().isLibgdxPort())` — so with the flag false, prompts arrive as
`InputConfirm`: a prompt string plus two buttons whose **labels are the
engine's**, not `IGuiGame.confirm`. A client that implements only the blocking
value-returning members sits forever at a prompt it never receives. That is the
single biggest scheduling fact in report 07's spec (§0.8), it is why
`NullTransport` had to grow an input policy (D16), and it is why
`docs/protocol.md` §4 requires `buttons.*.label` to be rendered verbatim rather
than replaced with "Yes"/"No".

Returning `true` would be claiming to be the libGDX mobile port, whose desktop
assumptions (touch input, its own screen stack, a different assets layout) we do
not satisfy anywhere else. The flag is a statement about which Forge front-end
we *are*, not a switch to be tuned.

**Rejected.** `true`, to collapse confirmations onto the ask path and write less
input code. It would trade a well-specified prompt-and-buttons frame we already
render for a mobile code path we do not otherwise implement, and it would throw
away the engine's own button labels — which are half of M6's comfort features
(`Undo (n)`, `End Turn`, `Auto`) arriving for free
(`docs/research/11-engine-comfort-features.md`).

## D19 — Phase stops live in `WireGuiGame`'s own map, seeded from the prefs and never saved

**2026-09-11**

**Decision.** `isUiSetToSkipPhase(PlayerView turn, PhaseType phase)` is answered
from `WireGuiGame`'s own `ConcurrentHashMap<Integer, EnumSet<PhaseType>>` —
**player id → the phases to skip** — seeded once per game from
`FPref.PHASES_HUMAN` / `PHASES_AI`, mutated by `act: setPhaseStop`, and
discarded when the game ends. `prefs.save()` is never called.

**Rationale.** Report 11 §3.3: `PlayerControllerHuman.isUiSetToSkipPhase`
consults `YieldController` **only** `if (isRemoteClient())`, and we are not one,
so that map is dead code for us — a client that wrote its phase stops there
would watch them have no effect. Forge's own desktop does exactly what we do:
`CMatchUI.actuateMatchPreferences` seeds the phase strip from those prefs once
per match and holds the state in the GUI object.

Three details that are each a bug if missed. **The polarity is stop, not skip**:
a pref that is `true` means *stop here*, so the set we store is the phases whose
pref is `false` — which is also why `act: setPhaseStop {stop}` is named for the
stop. **Which array applies is chosen by whose turn it is**, not by who is
setting the stop: "stop at MAIN1 on my turn" and "stop at MAIN1 on the AI's
turn" are separate switches, which is why there are two prefs. And the map is
keyed by **id, never by `PlayerView`**: `endCurrentGame()` replaces every
`PlayerView`, so a map keyed by the object would go silently stale exactly when
M6's New Game ships.

Not saving is the same reasoning as D13: a preference written to `var/forge/`
makes behaviour depend on run order, and Forge's desktop only writes these back
at teardown.

**Rejected.** Reading `FPref` live on every call (it is a file-backed store read
from the game thread, and it cannot represent a mid-game change). Writing
through `YieldController` (dead code for a non-remote client). Computing phase
stops in the browser — `README.md`'s NON-GOALS forbids it, and the engine is the
only thing that knows when a phase is actually reached.

## D20 — A multi-ability card opens an **asynchronous** `ability_menu`, applied through `selectAbility`

**2026-09-11**

**Decision.** When `IGuiGame.getAbilityToPlay` is reached off the game thread —
which is every click, because Forge asks it from inside
`InputPassPriority.onCardSelected` and our acts run on the virtual EDT (**D17**)
— the bridge returns `null` to Forge *and* pushes an ordinary `ability_menu`
`ask` that **no game thread is parked on**. The answer arrives through the
normal `Transport.Inbound.onAnswer` path and is applied with
`IGameController.selectAbility(SpellAbilityView)`, which is the same call
`act: clickAbility` makes. The ask is not registered with `ReplyPool`; it lives
in `WireGuiGame.asyncAsks` until answered, and only the newest one is live.
The body is built on **Forge's own game pool** (`ThreadUtil.invokeInGameThread`,
threads named `Game-n`), because an ask body carries option labels read off
`SpellAbilityView` and `CardView` and hard rule 3 allows that walk nowhere else.
Protocol amendment **M14**.

**Rationale.** The `null` on its own was a **silent** dead end: `selectCard`
still returns `true`, so no `notice` fired either, and a card with two or more
playable abilities could not be played from any client — measured in Chrome on
A.I.M. Scientists (`{3}{U}` cast + `K:TypeCycling:Basic:2` landcycling), where
`act clickCard 2` was the last line of the frame log and zero frames came back.
The same hole was in the console seat from M2, and it is why `ability_menu` had
never been dispatched in any recording.

Blocking was not available: R2 forbids parking the EDT (it is a single-thread
executor, and everything queued behind it — every prompt — would stall), and
Forge's own desktop client gets away with it only because Swing's EDT pumps
events inside a modal popup. Forge's network client (`RemoteClientGuiGame`)
blocks its caller for the same call, which is the shape we cannot copy.

The asynchronous path is not a workaround but Forge's own second entry point:
`InputPassPriority.selectAbility(sa)` sets `chosenSa` and calls `stop()` —
byte for byte what a non-null return from `getAbilityToPlay` causes —
and `PlayerControllerHuman.selectAbility` resolves the view through the
`spellViewCache` that `getAbilityToPlay` itself populated a moment earlier.
`InputPayMana.selectAbility` does the mana-ability half.

**Three properties a reader must not assume away.** It is **not re-delivered by
`resync`** (nothing to unpark, so `WsTransport.resend` does not know it): Forge's
input is still the one that asked, so a client that lost the menu clicks the card
again. Answering `null` is **"never mind"** — legal by §5.4, and the game simply
does not advance. And the modal's banner had to stop saying *"the game thread is
blocked on this"*, because for this kind it is usually false and the client
cannot tell.

**Evidence.** Re-recording the seat corpus produced **7** `ability_menu` asks in
`fixtures/games/human-auto-42.jsonl` and 1 at seed 7, each answered, each
followed by Forge's own `Pay Mana Cost` prompt — and, because the scripted policy
can now cast a creature at all, `pacho-shield` reaches **`assign_damage`** for the
first time without a probe deck. Driven end to end in Chrome: menu → answer `1` →
`Pay Mana Cost: {2}` → tap → Cancel → back at priority, no dead end.

**Rejected.** Returning `null` and firing a `notice` only (honest, but the card
is still unplayable — it is the minimum, not the fix). Blocking the EDT (R2, and
it stalls every prompt). Picking an ability locally by policy — that is rules
logic in the bridge, and `README.md`'s NON-GOALS puts the choice with the player.
Building the ask body on the EDT (hard rule 3: an off-game-thread view walk
corrupts the `Tracker` silently, and an ask body is nothing but view reads).

## D21 — `GET /health` reports the **session's** readiness, not the port's

**2026-09-11**

**Decision.** `WsTransport`'s health endpoint answers **503 `starting`** until
`hello_ok` exists and **200 `ok`** afterwards; a WebSocket that completes its
handshake before that is handed **nothing**, and `MtgTable` prints
`WS LISTENING` after `HostedMatch.startMatch` rather than after `bind`.
Protocol amendment **M15**.

**Rationale.** The port is listening about **1.2 s** before `openView` runs, and
in that window the server had no handshake frame to send. `resend(ch, true)`
found `lastHello == null`, sent nothing, and then called `onResync()`, which
emitted an `input` at `seq: 1` — so a client that retried the connect every 20 ms
saw `input@1`, `notice@2`, `notice@3`, `hello_ok@4`. That is §2.1 ("sent once,
immediately after the socket opens, before the first `state`") and contract (b)
both inverted, and it was silent: `tools/ws-auto-play.mjs` handles the window by
writing an **empty** `--log` on purpose, so a recording made there was simply
lost.

A readiness signal that says ready while it is not is worse than one that makes
the caller wait — `scripts/play.sh` polls this endpoint and then opens a browser
on the strength of it. Gating on `lastHello != null` makes "listening", "ready"
and "the handshake exists" one statement; skipping the resend closes the other
half, because `openView`'s own `hello_ok` + `state` + `input` reach a
connected client in order anyway.

**Corrected 2026-09-11 (D23, protocol amendment M20).** As shipped, this decision
closed **the connect path only**, and the sentence above ("skipping the resend
closes the other half") was wrong about what the other half was. A c2s frame that
*arrived* in the window was still dispatched and still answered, so an `act` came
back as `notice@1` then `hello_ok@2`, and a `resync` came back as `input@1` then
`hello_ok@2` — the same inversion, through the same `onResync` call, reached from
the door instead of from the handshake. Both are reproducible against a booting
server, and both are on disk as well as on the wire. See **D23** for the fix; the
`/health` half of this decision stands unchanged.

**Rejected.** A second port for health (two things to wait for, and
`scripts/play.sh` would have to get both right). Queuing the early connection's
frames until the session exists (the cache already does exactly that, one layer
down — the fix is to not send *before* it). Leaving `/health` as a liveness probe
and documenting the race (the race is what a reader would then have to know, and
nothing would be enforcing it).

---

## D22 — An asynchronous `ability_menu` is stamped with the input generation it was raised for

**2026-09-11**

**Decision.** `WireGuiGame` keeps an `inputGen` counter, bumped inside
`mutateInput` — so by every `input` re-emission, engine-driven or resync-driven.
`asyncAbilityMenu` reads it on the EDT, inside the click that is asking, and
`emitAbilityMenu` **returns without touching a single view** if the counter has
moved by the time Forge's pool runs it (and drops the built frame if it moves
during the build). Protocol amendment **M14** is otherwise unchanged.

**Rationale.** D20 hands the menu body to `ThreadUtil.invokeInGameThread`, whose
javadoc here claimed the walk was safe because "the real game thread is parked
inside `InputSyncronizedBase.showAndWait`". That is true at *submit* time and was
not enforced at *run* time, and the pool is
`Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))`
(`forge-core/src/main/java/forge/util/ThreadUtil.java`), with `Game-0` occupied
running the match — so the body is built on a **second** `Game-n` thread.
Measured: sampling `/proc/<pid>/task/*/comm` once a second through a
`--transport auto --seed 23` game with 17 `ability_menu` asks shows `Game-0` and
`Game-1` both live throughout. Hard rule 3's mechanical check
(`getName().startsWith("Game")`) passes for both, so the rule's *property* —
never walk the view graph while the game mutates it — had nothing enforcing it on
a hot per-click path. A second act (a double click; `AutoTransport` and
`ws-auto-play` decide on a 120 ms settle) finishes the input, `stop()`s it and
resumes `Game-0` while `Game-1` is still reading views. The failure mode is the
silent `Tracker` corruption CLAUDE.md rule 3 names: no assert, no lint and no
fixture would catch it.

The generation check is sound rather than incidental because of the order inside
Forge: the only thing that frees `Game-0` is the input being stopped, and
`InputSyncronizedBase.stop()` runs `onStop()` **before** `cdlDone.countDown()` —
`InputPassPriority.onStop` → `PlayerControllerHuman.clearActionableCards` →
`IGuiGame.clearWeaklySelectable`, which is one of our `engineInput` calls. The
generation has therefore already moved by the time the game thread can resume, so
a build that still sees the old generation is a build the parked thread is still
parked for.

**Cost, and why it is the right one.** A menu can now be dropped: the click
becomes a no-op the player repeats, exactly as it was for every card before M14.
Measured by re-recording all five committed human-seat fixtures with the check in
place: **zero** `ABILITY MENU STALE` lines, and the same ask counts as the
committed corpus (7 `ability_menu` in `human-auto-42`, 6 in `human-auto-7`). The
stderr line is how a run says it happened.

**Rejected.** Building the body on the EDT (hard rule 3 forbids the walk).
Blocking the EDT until `Game-n` finishes (R2, and it re-creates the deadlock D20
exists to avoid). A lock of our own around the walk (the mutating side is Forge's
code and would never take it, so the lock would document an exclusion rather than
enforce one). Leaving the javadoc's claim in place (it is the claim that made the
race invisible).

---

## D23 — The whole inbound path is gated on the session existing, not just the connect-time resend

**2026-09-11**

**Decision.** While `lastHello == null`, `WsTransport` drops **every** c2s frame
at the door with **no reply**, counts it, and names it on stderr
(`WS PRE-SESSION c2s frame dropped`); `resend()` carries the same guard at its own
top so the invariant does not depend on `handshake()` being its only caller. The
run summary prints `N read before the session existed`. Protocol amendment
**M20**; it corrects the scope claimed by **D21**.

**Rationale.** D21 closed the window from the connect side and the file went on
to state the closure as a guarantee. It was not one: M15 suppressed only the
connect-time `resend`, and a frame that arrived in the window still produced an
s2c frame ahead of the handshake — `act` → `notice@seq1`, `hello_ok@seq2`;
`resync` → `input@seq1`, `hello_ok@seq2`, which is the exact inversion M15's own
row quotes as the bug. Reproduced twice from scratch by retrying the connect every
20 ms against a booting server, and visible on disk (the s2c frame on line 2 of
`frames.jsonl`, `hello_ok` on line 3). It is reachable from the repo's own
documented commands: both `tools/ws-auto-play.mjs` and `tools/ws-smoke.mjs` send
`resync` from their `open` handler, and only the `/health` poll inside
`tools/check-all.sh` and `scripts/play.sh` kept the gate from ever seeing it. A
false guarantee is worse than a documented race, because the next reader builds on
it.

**Why no reply.** M18's rule is "a dropped frame comes back as a `notice` rather
than as silence", and here that notice would itself be the pre-handshake frame the
rule exists to prevent — the `act` case above *is* M18's notice. §2.1's ordering
outranks it, and nothing is actually lost: `openView`'s own `hello_ok` + `state` +
`input` reach the channel in order, which is everything a `resync` in the window
could have asked for.

**Rejected.** Buffering the frames and replaying them after `hello_ok` (it makes
the ordering depend on a second queue draining at the right moment, and the only
frame anyone sends in the window — `resync` — asks for what the handshake is
already about to send). Answering with a `notice` that carries `seq: 0` (a
handshake-less client cannot tell a seq-0 notice from the session's own stream
before it has a session; and it is still a frame arriving before `hello_ok`).
Leaving it and documenting the race (D21 already tried documenting; the
documentation was what turned out to be wrong).

---

## D24 — The socket's ask timeout is the connection's liveness, not a clock

**2026-09-11**

**Decision.** `WsTransport.askTimeoutMs(kind)` returns **`0` — park forever —
while a client is connected**, and `NO_CLIENT_ASK_TIMEOUT_MS` (**120 s**) while
none is. The thing that actually ends a wait is
`Transport.Inbound.onDisconnect()` → `ReplyPool.cancelAll()`, called from
`WsHandler.channelInactive` on netty's event loop; the pool is then **reopened
immediately**, so an ask raised while nobody is connected parks up to the cap and
is **re-delivered** to whoever comes back (amendment **M19**) rather than being
spent on a §5.4 default. The deadline is **recomputed at the point of parking**,
not trusted from the caller: `WireGuiGame.ask` reads `askTimeoutMs` and then
serialises the whole ask body — every option, with a full card each — and a
disconnect inside that gap could otherwise park a game thread with no peer and no
clock. `resend` re-sends any ask the pool still wants (§2.4). This is **D15
extended**, not replaced: the timeout stays a transport policy.

**Rationale.** D15's own closing sentence said M3 "will need its own answer, tied
to the socket's liveness rather than to a clock", and copying either existing
number is the bug it warned about. The console's `0` alone is wrong for a socket:
a peer that vanishes leaves a game thread parked against nobody, which is the one
failure a socket must not have. `auto`'s 30 s is wrong in the other direction: a
human reading their hand over a websocket is not a stalled test, and Forge takes
the §5.4 default **silently**, so the game continues wrongly rather than
visibly. Liveness answers both — while the peer is there the player may think as
long as they like; the instant it is gone the wait is over, by an event rather
than by a timer.

The 120 s cap is the residual case, and it is deliberately generous: it exists
only so that a server nobody ever connects to cannot hold a thread forever. It is
**still unmeasured** — see PLAN.md's M3 follow-up 1 — because reaching it needs an
engine that asks a blocking question during a window with no client; the gate
(step 10d) proves the number reaches the wire (`timeoutMs: 120000`), not that it
fires.

**Rejected.** A single finite cap for the socket (any value is either a wedge
detector that fires on a thinking human or a liveness check that outlives the
peer — this is the same "wrong in both directions" D15 rejected). Latching the
reply pool shut after a disconnect (measured: every ask raised between the drop
and the reconnect resolved to its default *instantly*, spending the player's
decisions during a browser refresh, and making the cap unreachable after the
first disconnect). A heartbeat-driven timeout of our own (netty already tells us
`channelInactive`; a second liveness mechanism would only disagree with it).

---

## D25 — One client at a time, refused with a `notice` and close code 4001

**2026-09-11**

**Decision.** The seat belongs to one socket. A second WebSocket that completes
its handshake while a client is connected — or any socket after the server has
closed — receives **one `notice`** (`{level:"error", title:"Connection refused"}`,
`seq: 0` per amendment M10) and is then closed with WebSocket close code
**4001**; `REFUSED_CLOSE_CODE` and the refusal counter are named in the run
summary (`ws connections = N accepted, M refused`). The refusal is decided inside
the handshake handler, on netty's event loop, which serialises it. The client
treats **any** code ≥ 4000 as the server saying no: status `refused`, no
automatic retry, and a manual **Reconnect** button. Protocol amendment **M13**.

**Rationale.** Two boards answering the same prompt is not a state this bridge can
make coherent: there is one `ReplyPool`, one `inputSeen` guard and one seat, and
an interleaved second answer would be indistinguishable from the first player
changing their mind. The honest failure is to say so. 4001 is in the
application-defined range (≥ 4000) **precisely so a browser can tell "the server
said no" from "the network broke"** and stop reconnecting — a client that treated
it as a transport error would reconnect-loop forever against a server doing
exactly what it was told. The `notice` before the close is what makes the reason
readable in the refused tab rather than only in the server log.

This is not authentication. The socket is loopback and trusts whatever connects
(README's NON-GOALS); "one client" is a coherence rule, not a security boundary.

**Rejected.** Handing the seat to the newest connection (a stray second tab would
silently steal a live game). Accepting both and broadcasting (two answers, one
pool). A generic 1008 policy-violation close (a browser cannot distinguish it
from the ordinary ones and would retry). Refusing silently (the refused tab would
show a closed socket with no reason, and the first thing anyone would do is
reconnect).

---

## D26 — The `transport` session-header key stays optional

**2026-09-11**

**Decision.** `transport` in the §8.1 session header remains **optional**.
`RecordMatch` (AI-vs-AI, no seat) does not write it and is not changed; the six
AI-vs-AI fixtures are **not** regenerated. A ws session writes `transport: "ws"`
like every other seat log. This settles M2 follow-up 5, which asked whether M3
was the moment to make it mandatory.

**Rationale.** An absent key is *information* — "an engine recording with no
seat" — rather than a gap, and every log that has a seat has the key. Making it
mandatory would buy exactly one thing: `check-redaction.mjs`'s A12 rule could
fail instead of warn on a `null` answer to `order` or `choose_list` without
special-casing `transport: "null"`. The price is regenerating six fixtures that
nothing else is asking anyone to touch, on an emitter now measured as
non-deterministic in byte order (`docs/evidence/m3-ws.md` §7.1 — the same seed
re-records with the same frames in a different `seq` assignment), to sharpen a
rule that already catches its case through the header it already has. Adding
`"ws"` to the key's domain made that trade worse, not better.

**Rejected.** Mandatory plus a regeneration of every fixture (see above).
Inferring the transport from the frames (a recording with `input`/`ask` frames
has a seat, but *which* seat is what the key says, and the checker's rule is
about the answering policy). A second key (`hasSeat`) that says the same thing
less directly.

---

## D27 — A `resync` re-delivers cached frames verbatim, and re-emits the input for real

**2026-09-11**

**Decision.** `seq` is **per session, not per connection**, and re-delivery keeps
the number and the timestamp the frame was born with. On a connect, `resend` sends
the cached `hello_ok`, then the cached last `state`, then **calls
`Transport.Inbound.onResync()`** — a real re-emission of the current `input`, with
a fresh `seq`, written to the frame log — and then re-sends **verbatim** any ask
the `ReplyPool` still wants. A client `resync` frame does the same without the
`hello_ok`. The client `resync` line is itself logged (amendment **M16**), and the
run summary counts what was re-delivered. Protocol amendments **M10** and **M16**;
the pre-session case is **D23**.

**Rationale.** Contract (b) says a connecting client gets `hello_ok`, a full
`state` and the current `input`; contract (c) says a reconnecting one gets all
three again. Re-numbering the cached frames on the way out would make `seq` a
property of the connection instead of the session, and then two clients — or one
client across a reconnect — would disagree about what frame 340 was; keeping the
original `seq` and `t` makes a re-delivered frame *identifiable as* a
re-delivery instead of forging a new one.

The `input` half is the exception **because of a defect this repo already
had**: `onResync()` is the call whose guard the M3 doorstep test exists to keep
fixed — a resync must not arm `inputSeen`, or a browser that autoconnects and
then concedes removes a player while `Match.prepareAllZones` is still iterating
them, which throws inside Forge's own setup. Routing the input through the live
path rather than replaying a cached string is what keeps that guard on the code
path a real client exercises.

**The cost, stated rather than discovered later.** A mid-stream `resync` hands
back a `state` whose `seq` is **lower** than the frame before it, and a client
connecting mid-game starts at a `seq` far above 1 with a gap behind it. Neither is
a dropped frame. The reducer therefore does not check `seq` monotonicity at all —
it reads `v`, `type` and `body` — and `tools/check-redaction.mjs` needs its
`--client-log` mode (amendment **M17**, auto-detected from `recordedBy`) to tell
the two apart: in a **server-side** `var/games/` log the same shape *is* a dropped
frame and still fails.

**Rejected.** Re-numbering on re-delivery (see above; and it would put two
different frames on disk with the same `seq` across a reconnect). Replaying a
cached `input` string instead of calling `onResync()` (it would take the guard off
the path every real client uses). Making the client validate `seq` continuity (it
would have to know which frames were re-delivered, which is exactly what the
verbatim rule refuses to encode on the wire). A per-connection `seq` (contract (c)
asks for one session across many connections, which is the thing that would stop
being true).

---

## D28 — Card images are three Scryfall variants derived from the id, hot-linked, with a generated text frame underneath

**2026-09-12**

**Decision.** `web/public/art.json` stores an `scryfallId` per card name, and the
renderer *derives* the image URL rather than storing one per size:
`https://cards.scryfall.io/{size}/{side}/{id[0]}/{id[1]}/{id}.{ext}`
(`web/src/art.ts`, `imageUrl(entry, size, side)`). Exactly **three** variants are
used, one per job:

| where | tile size | variant | bytes |
|---|---|---|---|
| battlefield, lands, hand | 60–136 px | `grid` 488×680 WEBP | ~37 kB |
| stack panel, log drawer, decision-panel thumbnails | 39–44 px | `thumb` 146×204 WEBP | ~8 kB |
| hover / focus zoom and `Z` | 196–420 px | `display` 672×936 WEBP | ~50 kB |

Images are **hot-linked from `cards.scryfall.io`** — open question 5's default,
unchanged — and `preloadArt()` warms the `grid` set once per session. Under every
image is the same generated text frame (name, `mana-font` pips, the type line
verbatim, P/T), which is what renders when `art.json` is absent, when a name does
not resolve, and for every token. **A missing image never blocks a click.**

**Rationale.** `grid` rather than `display` on the board is a decode-memory
decision, not a bandwidth one: 672×936×4 B across 28 distinct cards is ≈ 70 MB of
decoded bitmap against ≈ 37 MB for `grid`, on a board that can hold thirty tiles.
Deriving the URL from the id keeps `art.json` a name→id map instead of a
name→six-URLs map, so adding a fourth variant is a renderer change and not a
regenerate. Storing one URL per size would also have frozen Scryfall's path
layout into a generated file that is gitignored and therefore never reviewed.

The text frame is not a fallback bolted on afterwards — it is the *bottom layer* of
every tile, and the art is drawn over it. That is why `?replay=games/morph.jsonl`
(a deck with no `art.json` entry at all) renders a complete, playable-looking
board: report 10 §6's exit check without deleting a generated file.

**Rejected.** A local image cache or an `/api/images` proxy (deferred list; it is
a second origin, a cache-invalidation problem and a packaging problem for a
localhost-only app). `art_crop` on the tile (it is the illustration only — no
name, no cost, no P/T — so every tile would need its own frame drawn around it,
and the Scryfall terms' "never crop the artist credit" rule gets harder, not
easier). `normal`/`large` JPEG on the board (2–3× the bytes of `grid` WEBP for
pixels the tile throws away). Per-print art selection: the engine's view carries
`Name` + `SetCode` and **no collector number**, so v1 takes whatever print the
fetch ladder landed on (`art.ts`'s own header rule 2).

---

## D29 — `mana-font` is a bundled dependency, and its `@font-face` is overridden rather than forked

**2026-09-12**

**Decision.** `mana-font@1.18.0` (MIT for the CSS, OFL-1.1 for the glyphs) is the
web client's one runtime style dependency, as report 10 §13 allows. `main.tsx`
imports `mana-font/css/mana.css` **before** `styles.css`, and `styles.css`
redeclares `@font-face` for family `Mana` pointing at the **woff2** the package
ships (187 kB) instead of the woff its own CSS lists (408 kB); a later
`@font-face` wins, so the loaded face is ours. NOTICE section 5 records the two
licences and the Wizards-owned symbols. No mana symbol is drawn by hand and no
font file is committed.

**Rationale.** The symbols are a solved problem with a permissive licence, they
are a real accessibility win over `{3}{U}` as text (the pips carry `aria-label`s
and the cost is still in the tile's accessible name), and every other MTG client
uses the same font, so they read as mana to anyone who has seen a card. Bundling
is what the OFL and MIT both permit; hot-linking a font from a CDN would add a
second origin to a localhost-only app.

**The cost, stated rather than discovered later.** Importing the package's CSS
wholesale makes Vite emit the faces nothing fetches. Measured on the M4
documentation run: nine font files totalling **3.72 MB**, of which only the
187.40 kB `mana-*.woff2` is ever requested — `mana.woff` (408.28), `mana.eot`
(408.36), `mana.ttf` (408.20), `mana.svg` (1,907.69) and four `mplantin.*`
(400.24 together), i.e. **~3.5 MB** of `web/dist/assets/` that no browser fetches.
Report 10 §13 predicted the MPlantin half.
`web/dist/` is a gitignored build directory for a local app, so the fix — forking
`mana.css` into the repo and carrying its MIT header forward — buys nothing today
and costs a file that must be re-diffed on every upgrade. It is recorded in
`docs/evidence/m4-board.md` §5 and as **M4 follow-up 1**, and it becomes worth
doing the moment anything is packaged or served over a network.

**Rejected.** Hand-drawn SVG pips (twenty-odd symbols, hybrid and Phyrexian
included, and they would drift from the printed ones). Unicode circles with
letters in them (unreadable at 10 px, wrong for hybrid, and no `{T}`). Forking
`mana.css` now (see above). Hot-linking the font from a CDN (a second origin).

---

## D30 — Arrows are hand-rolled SVG geometry over a namespaced rect registry, with no dependency

**2026-09-12**

**Decision.** Targeting and combat arrows are drawn by our own code:
`web/src/render/rects.ts` is a registry of measured rectangles keyed
`c:<cardId>` / `p:<playerId>` / `s:<stackId>`, and `web/src/render/arrows.ts` is
pure geometry (`edgePoint`, `arcBetween`, `buildArrows`) that turns the registry
plus a `state` frame into a list of quadratic arcs. `ArrowsOverlay.tsx` is ~20
lines of `aria-hidden` SVG over it. Report 10 §9.2's documented fallback,
`perfect-arrows@0.3.7`, was **not** taken.

**Three properties the registry must have**, each of which is a defect that was
actually hit:

- **The key spaces are namespaced**, because they collide: `web/test/arrows.test.ts`
  counts **40 frames** in the committed corpus where a `stack[].id` is also a
  battlefield `Card.id`. An un-namespaced registry draws an arrow to the wrong
  element on those frames and looks right on every other one.
- **A key maps to a set of elements, not one**, and a `null` ref callback removes
  nothing. The same card can be mounted more than once (the row tile, the stack
  thumbnail, the zoom overlay); when the zoom closed, its callback deleted the
  shared key and **every arrow touching that card vanished** — measured live at
  four arrows before `Z` and one after. The sweep prunes what has left the
  document and measures the first element still in it, so the row tile wins by
  registration order. `anchor={false}` on the secondary copies says which tile
  *is* the card; the registry no longer depends on nobody getting that wrong.
- **One `ResizeObserver`, on the board root**, plus a sweep after every render
  that bumps a version only when a rect actually moved — not an observer per tile
  and not a measurement inside render.

**Rationale.** The geometry is 60 lines including the three bow scales, and being
ours makes it *pure*, so `node --test` builds arrows for all **2,473** committed
`state` frames without a DOM. A dependency would have moved the same 60 lines
behind an API and still left the registry — which is where all three real defects
lived — for us to write.

**The arrows are decoration and carry no information of their own.** The SVG is
`aria-hidden`, `focusable="false"` and `pointer-events: none`, and every fact it
draws is also text: the stack panel's target chips, the tiles' `→ defender` /
`blocks …` notes, and the log drawer's band list. The three classes differ in
curvature, colour **and** dash pattern, so colour is never the only cue.

**Rejected.** `perfect-arrows` (see above). Measuring in render (layout thrash and
a render that reads the DOM it is about to write). An observer per tile (thirty
observers on a full board). Canvas (it would need its own hit-testing and its own
accessibility story for facts that are already text).

---

## D31 — The phase strip ships as a read-only preview of Forge's own defaults until M6 puts `phaseStops` on the wire

**2026-09-12**

**Decision.** The right rail's thirteen-row phase strip renders, and both dot
columns render, but **every dot is a `disabled` button** whose tooltip names the
act (`setPhaseStop`), the missing read field (`players[].phaseStops`) and the
milestone (M6). The values shown are Forge's own documented defaults, verbatim
from `ForgePreferences.java:239-264` — `MAIN1`, `COMBAT_DECLARE_BLOCKERS`,
`MAIN2` for you; `COMBAT_BEGIN`, `COMBAT_DECLARE_ATTACKERS`,
`COMBAT_DECLARE_BLOCKERS`, `END_OF_TURN` for the opponent — and the legend under
the strip says *"Forge defaults, read-only until M6"*. `UNTAP` prints `·` in both
columns because there is no `PHASE_*_UNTAP` preference to toggle. Hold priority
is disabled the same way, with a tooltip naming `YieldController.setDisableAutoYields`.

**Rationale.** `act: setPhaseStop` **is** in `docs/protocol.md` §2.2, but its row
says M6 and `WireGuiGame` does not implement it; the read side (§10) is not on the
wire at all. A live toggle would therefore have to remember its own state in the
browser — and a client that remembers which phases it stops on has put phase-stop
logic in the client, which `CLAUDE.md` §Scope forbids outright and **D19** already
decided belongs in `WireGuiGame`'s own map. Drawing the strip with the engine's
real defaults, and saying out loud that it is read-only, is honest about both
halves: the layout is finished, the behaviour is not.

When `players[].phaseStops` ships, **the markup does not change** — only `onClick`
and the data source.

**Rejected.** Omitting the strip until M6 (the right rail is a layout column; a
strip that appears later changes every measured number in report 10 §2.2, and the
turn/phase readout is useful on its own). A live toggle with client-side state
(see above). An enabled dot that sends `setPhaseStop` into a bridge that ignores
it (a control that does nothing when pressed is worse than one that says why it
is disabled).

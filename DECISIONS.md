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

**2026-09-12** — **the "overridden rather than forked" clause is superseded by
D32 (2026-09-12).** The bundling decision, the licence accounting and the cost
measured below all stand; what changed is that the fork was taken, and the
3.5 MB this entry predicted is the reason.

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

---

## D32 — `mana-font`'s stylesheet is FORKED after all, and D29's "overridden rather than forked" clause is superseded

**2026-09-12**

**Decision.** The web client no longer imports `mana-font/css/mana.css`. It
imports `web/src/mana.css`, a **filtered extract** of that file (MIT for the CSS,
the glyphs SIL OFL 1.1, the symbols © Wizards of the Coast — NOTICE §5/§6) with
the package's two `@font-face` blocks replaced by **one** naming the woff2 the
package ships. This **supersedes the "overridden rather than forked" half of
D29**, and only that half: D29's decision to bundle `mana-font` rather than draw
pips by hand or hot-link a CDN stands unchanged, as does its licence accounting.

D29 is left as it was written, per this file's own rule. Read the two together.

**Rationale — the number D29 stated as a cost and this closes.** Importing the
package stylesheet makes Vite resolve every `url()` in it into the build:
**nine font files, 3.72 MB** in `web/dist/assets/`, of which the browser fetches
exactly one — the 187.40 kB `mana.woff2` that `styles.css` overrode the rest
with. `mana.svg` alone is 1.9 MB, and **MPlantin** (four files) is a font this
project never names. An override wins the `@font-face` race at *run* time and
does nothing at *build* time, which is where the bytes are.

**Measured after the fork**, `npm --prefix web run build`: `web/dist/assets/` is
**4 files, 1,432,461 B**, with **one** font — `mana-D0absDf6.woff2`, 187,400 B —
and 922,040 B of that total is the JS source map. The eight faces totalling
3,532,778 B are gone.

**What the fork keeps, and why it is not a curated subset.** Every rule whose
selector is composed only of classes this client can produce, including **all 612**
`.ms-<symbol>` content rules. `manaSymbolClass()` turns whatever is inside a pair
of braces into a class name, and the deck in play is not the only deck the
opponent can be holding; a curated subset renders a blank pip for the first
unexpected symbol. The derivation is a one-off script, kept in
`docs/evidence/m5-board.md` §7.1 so the fork can be re-derived on an upgrade
rather than hand-merged.

**Rejected.** Keeping the override and living with 3.5 MB of dead assets (it is a
localhost app, so nobody downloads them — but `dist/` is what a reader measures
to see whether the client is small, and 3.72 MB of fonts for one 187 kB face is
a number that invites the wrong conclusion). Curating the symbol list (above).
Patching the package in `node_modules` or via a postinstall step (invisible,
and it does not survive `npm ci`). Vendoring the whole `mana.css` unfiltered (the
MPlantin block would come with it).

---

## D33 — A question is answered on the board iff EVERY option is already drawn there

**2026-09-12**

**Decision.** `web/src/render/picker.ts` holds one rule, pure and testable:

> An `ask` is board-shaped **iff every one of its options is a card the board is
> already drawing a tile for, or a player it is drawing a rail for.**

Such an ask is answered with clicks on the board itself plus `AskPicker` in the
decision panel (candidates, running count, Answer / Default / Cancel / Reset).
Every other ask stays the M3 modal, unchanged. Two shapes are **never** pickers
even when their options are cards: a `choose_list` with `reveal: true`
(`min = max = -1`, acknowledge only) and a `choose_entities` with a
`delayedReveal`. And the picker **marshals nothing** — the answer is built by
`AskModal`'s own `answerFromDraft` / `defaultDraft` from the same `AskDraft`, so
the two surfaces cannot disagree about what an answer looks like.

**Rationale — each clause is load-bearing.**

- **Every, not most.** A picker that can express four of five options is a dead
  end for the fifth, and "nothing dead-ends" is the whole milestone. One option
  outside the board sends the whole ask to the modal.
- **Already drawing, not "the id resolves".** `drawnEntities()` is written
  against what `Board.tsx` mounts, not against `resolve.findCard`. The two are
  different sets on purpose: another seat's hand is in the snapshot as five-key
  stubs and is **never** drawn, and an unrevealed library card has no tile. A
  rule written against the snapshot would have offered a click on a card the
  player cannot see — hard rule 8's failure mode, arriving through the picker.
  `stackCards` are excluded too, because `S` can collapse the stack panel.
- **A reveal is not a choice made on the board.** The engine handing you cards
  out of a hidden zone has no tiles to point at; drawing them is the modal's job,
  and it now draws them as real `CardTile`s.
- **`assign_damage` is the same question about a different answer shape**: it is
  board-shaped when every *blocker* has a tile, because that is where the number
  inputs go. The defending player is option 0 and keeps its panel row; the index
  is never renumbered.

**What it actually reaches, so nobody oversells it.** Over the 15 engine
recordings in `fixtures/games/` — 108 asks — the rule accepts **3**, all
`assign_damage`. The `choose_list` branch is exercised only by
`fixtures/synthetic/sample-handwritten.jsonl`. That is a fact about what Forge
asks, not a gap in the rule: the other card-optioned asks in the corpus are 22
reveals and 7 delayed reveals, modal *by* the clause above, and the rest have no
board entity at all (`ability`, `color`, `other`, `number`). `options` would be
the last candidate and has no call site in the jar (**M22**).
`web/test/picker.test.ts` prints the census on every run and asserts both columns
non-empty, so the number moves visibly the day a card picker appears.

**Rejected.** A per-kind allow-list ("`choose_list` and `choose_entities` are
pickers") — it says nothing about whether *this* ask's options are on screen, and
it is how the fifth option becomes a dead end. A partial picker with a "the rest
are in the dialog" link (two surfaces for one question, and a count that has to
be reconciled between them). Resolving option ids against the snapshot instead of
against the mounted board (above — it offers clicks on concealed cards).
Marshalling the answer in the picker (a second place for §5.3's index and key
rules to be got wrong, and a recording cannot catch a divergence between them).

---

## D34 — The mana-pool pips ARE the `useMana` control, and they are live whenever the pool is non-empty

**2026-09-12**

**Decision.** `ManaPoolPips` takes an `onSpend`. On **your own** rail, a colour
the engine's published pool actually holds renders as
`<button data-act="useMana" data-mana="U">`; everywhere else (a replay, the
opponent's rail, while an ask is outstanding) the six pips stay the M4 read-only
badges. `W U B R G C` do the same from the keyboard, as a **pre-pass** in
`planKey` so that with an empty pool `C` is still Forge's combat-arrow key and
`B` is still M6's pass-to. The act body is exactly `{action, color}` and the
colour is the **single letter** `protocol.ts` has typed since M1. The pips are
offered whenever the pool is non-empty and no ask is open — **not** only during a
mana payment.

**Rationale.** This is the one real dead end M4 handed over: the console seat has
`m W|U|B|R|G|C` and the board had nothing, so a state in which Forge expects
floating mana to be spent could not be resolved from the browser at all. Two
sub-decisions:

- **The single letter is safe, and it was checked rather than assumed.**
  `MagicColor.fromName` tests `length == 2` on the raw string **first** (that
  branch parses a colour *pair*) and only then lowercases and switches on
  `w u b r g c`. A one-character `ManaColor` can never reach the pair branch, so
  `"U"` arrives as blue. The other two transports send `"blue"`; both work
  (**M26**, corrected by **M30**).
- **Conditioning the control on "a payment is in progress" would mean reading
  engine prose.** The only signal on the wire for that state is the *text* of a
  button label (`Auto`), and deciding what a control does by matching an engine
  string is exactly what `CLAUDE.md` §Scope forbids — the labels are Forge's, we
  render them verbatim, and they are not a protocol. A pip pressed outside a
  payment is a *meaningless act*, which §2.2 says the server drops: no exception,
  no notice, no state change. Measured live, and the board neither hung nor
  guessed. The honest fix is a typed field on `input`, which is an M6 protocol
  row, not a board one.

**Guarded end to end, not only as a pure mapping.** `tools/ten-games.sh`
assertion 8 asserts both that seed 4 sends the act **and** that the seat's
`manaPool` is strictly smaller in the `state` after it than in the `state`
before — the half that would catch a bridge which accepted the act and dropped
it. Until that assertion existed, `useMana` had no end-to-end coverage anywhere
while `check-all.sh` said it did.

**Rejected.** A separate "spend mana" panel or a modal (the pool is already drawn
in exactly one place, and a second one is a second truth). Matching the `Auto`
label to enable the pips (above). Sending a `cardId` with the act — "a `cardId`
is a `clickCard`, not a `useMana`", and `web/test/pool.test.ts` asserts the body
has exactly two keys. Making the six letters ordinary `KEYMAP` rows (a
first-match lookup would have taken `C` and `B` away from the panels they already
open); the row is last in the table and the pre-pass runs before it.

---

## D35 — Two ask kinds are documented CEILINGS, not gaps; and the probe policy is a flag, never a default

**2026-09-12**

**Decision.** `options` and `manipulate_list` are recorded as **unreachable in
this configuration**, with the proof in the 2.0.14 jar's bytecode rather than in
a search that came up empty: `IGuiGame.showOptionDialog` has **zero** call sites
anywhere (**M22**), and `IGuiGame.manipulateCardList` has exactly one caller,
gated on `UI_SELECT_FROM_CARD_DISPLAYS`, which `Bootstrap` sets to `"false"` in
every process (**D13**, **M23**). Both kinds stay implemented, `AskSelfTest`-
driven and shape-pinned by `ASK_SHAPES` and `fixtures/synthetic/`. Separately,
everything that makes a probe recording reach further is a **flag**:
`--probe` (`AutoTransport`'s four policy decisions taken the other way) and
`--mana-lost-prompt` (`FPref.UI_MANA_LOST_PROMPT`, in memory, never `save()`d),
both recorded in the session header as `policy` / `prefs` (**M31**).

**Rationale.** "We never saw it" and "it cannot happen" are different claims, and
only the second one lets a later reader stop looking. Writing the second one down
costs a bytecode scan and buys a permanent answer — including the fact that
turning D13's preference on is not a missing feature but the library leak §5.3
warns about.

The flags are flags because **the default policy is what the exit criterion and
every M2/M3 fixture were recorded with**. A policy that reaches further also
loses more games and takes longer to do it; conflating the two would mean the ten
games no longer measure the game the user actually plays. 9b's multiset diff of
`human-auto-42` is the proof that the default did not move.

`confirm` is the same shape of answer with the opposite sign: it **is** reachable,
from exactly one call site (`InputPassPriority`'s floating-mana warning), and only
with a preference whose Forge default is off (**M24**). So it has a recording and
is still invisible in an ordinary game — whether to turn it on for the user is an
M6 comfort decision, deliberately left open.

**Rejected.** Deleting the two unreachable kinds from the eleven (they are on the
interface, `RemoteClientGuiGame` implements them, and a later Forge may use them;
`ASK_SHAPES` and the synthetic fixture are their contract). Turning
`UI_SELECT_FROM_CARD_DISPLAYS` on to get a `manipulate_list` recording (it ships
the whole library to the client — the exact thing D13 exists to prevent, and a
recording bought that way would be evidence of the leak, not of the kind).
Making `--probe` the default for the automated seat (above). Writing
`--mana-lost-prompt` to the preferences file (we never `save()`; it is the user's
Forge profile).

---

## D36 — The combat-band strip is an OVERLAY, not a row of the middle grid

**2026-09-12**

**Decision.** `.bands` leaves the flow the way `.stackpanel` already had:
`position: absolute`, anchored to the bottom-left of `.table__middle`,
shrink-to-fit with `max-inline-size: calc(100% - var(--stack-w) - 10px)`, and
`z-index: 55` — above any card tile (a tile's z-index is its `--i`) and
**below the 60 the zone-row caption buttons carry**.

**Rationale.** Mounted in the flow it was an implicit **third** row of a
`grid-template-rows: 1fr 1fr` box, and an auto row is sized to its content before
the `1fr` rows are given anything. At 1600 × 900 — where the middle is already on
its 120 px floor — both zone rows measured **0 px**
(`gridTemplateRows: "0px 0px 112px"`), the 62 px strip tiles overflowed, and the
two absolutely-positioned caption buttons landed 9 px apart, leaving **4 px** of
the opponent's zone control hittable. There is no in-flow answer at that
viewport: two 62 px rows plus the gap want 128 px of a 120 px box. After the fix
the same frame measures `58px 58px` — exactly what it measures with the strip
removed altogether — at 1600 × 900, 1440 × 900, 1366 × 768 and 1920 × 1080.

**The trade, stated.** While the strip is tall it **covers** part of the
graveyard / exile strips behind it. That is deliberate and it is mitigated rather
than hidden: the strip shrink-wraps (453 px of a 910 px middle on the measured
frame, so the right-hand part of the rows stays visible), and `z-index: 55` keeps
both caption buttons clickable *through* it — so the escape hatch for a card the
strip covers is the zone browser, whose tiles take the ordinary `clickCard`.
Verified live by clicking a covered caption and then a card inside the panel.

**Rejected.** Giving `.table__middle` a third explicit row (it takes height from
the two zone rows at exactly the viewport where they have none to give).
Growing `--middle-min` (it steals from the battlefield rows, which is where the
game is). Putting the bands in the stack panel's column (they are per-band rows
of cards, not a list, and the stack panel is already the narrow column).
Rendering the bands only during combat (the "nothing declared yet" strip is 22 px
and is how you learn the strip exists — and even at 22 px the in-flow version
took its bite out of both rows, so hiding it would have hidden the defect, not
fixed it). A higher `z-index` than the captions (it would have made the fix
un-escapable: the cards under the strip would have had no click path at all).

---

## D37 — The phase strip is LIVE, and D31's "read-only until M6" clause is superseded

**2026-09-12**

**Supersedes D31** (the read-only preview) on its behaviour clause only. D31's
*layout* decision — thirteen rows, two dot columns, `UNTAP` printing `·` in both
because there is no `PHASE_*_UNTAP` preference — stands unchanged, and so does its
promise that "when `players[].phaseStops` ships, the markup does not change, only
`onClick` and the data source". That is exactly what happened.

**Decision.** Every dot is an enabled button whenever the stream carries
`players[].phaseStops` (protocol §3.3, amendment **M32**) and there is no open
ask and no game over. A click is `act: setPhaseStop {phase, turn, stop}`; the
next `state` says what happened. `web/src/render/PhaseStrip.tsx` keeps **no stop
state of its own** — the whole of D31's rationale — and `phaseStopsOf` is the one
place a stream *with* the field is told apart from one without.

**A stream without the field still draws Forge's defaults, disabled**, with the
legend saying so. That is not a leftover: it is every recording made before
2026-09-12, and `render.test.tsx` replays all of them.

**D31's third paragraph is now wrong in one more place, and it is retracted
here:** it also disabled a **"hold priority"** toggle with a tooltip naming
`YieldController.setDisableAutoYields`. **There is no hold-priority feature in
Forge** (`docs/research/11-engine-comfort-features.md`, PLAN.md §M6), so the
control was removed rather than enabled — a toggle with no engine behind it is
the one thing M6 was told not to render. `setDisableAutoYields` is a different
feature (it suppresses *auto-yields*, not priority) and is not on the wire.

**Rejected.** Editing D31 in place (CLAUDE.md §"Where the docs live" forbids it,
and D31's layout half is still the reason the strip looks the way it does).
Leaving D31 uncontradicted while the browser disproved it — which is what the
M6 verification pass found and is the reason this entry exists.

---

## D38 — Phase stops are reseeded from Forge's defaults for every game of a match, not carried across it

**2026-09-12**

**Decision.** `WireGuiGame.resetForGame(n)` calls `seedPhaseStops()` for every
game, including games 2 and 3 of a `--games N` match. A stop the player set in
game 1 is **gone** in game 2; the map comes back as `FPref.PHASES_HUMAN` /
`PHASES_AI` (`MAIN1`, `COMBAT_DECLARE_BLOCKERS`, `MAIN2` for the seat;
`COMBAT_BEGIN`, `COMBAT_DECLARE_ATTACKERS`, `COMBAT_DECLARE_BLOCKERS`,
`END_OF_TURN` for the AI). Measured in the browser: a DRAW stop set in game 1 and
an UPKEEP-on-the-opponent's-turn stop were both absent from the `hello_ok` of
game 2.

**Rationale.** `openView` is the only reset hook Forge gives us and it is the
hook that rebuilds **everything else** — the card, player and ability indexes,
the `ReplyPool`, the frame log, the yield-handle table — because
`endCurrentGame()` has by then nulled the `Game`, emptied
`getHumanControllers()` and replaced every `PlayerView` (report 11 §8.3). The
phase-stop map is keyed by `PlayerView` id, and those ids are among the things
that are replaced. Carrying the map across would mean one cache surviving a reset
that every neighbouring cache does not, keyed by ids that no longer mean what
they meant — which is a bug waiting for the first game where the seat comes back
as a different id. Seeding is one call and cannot be stale.

This was an **accident of implementation before it was a decision**, and report
11 §13 open question 6 asked in as many words that it be one. It is now one.

**The cost, stated.** Forge's desktop does *not* do this: it seeds the map once
per match, from the same preferences, and a stop you set in game 1 survives into
game 2. So a player who sets a Draw-step stop in game 1 of a best-of-three has to
set it again in game 2. That is a comfort regression against Forge and it is the
price of not carrying a `PlayerView`-keyed cache across a `PlayerView`
replacement.

**Rejected.** Seeding once per match and re-keying the map onto the new
`PlayerView` ids in `openView` (it is the same amount of code as seeding, buys
one convenience, and adds the only cache in the process with a lifetime longer
than the game — the exact shape of the bug M38's per-game reset exists to
prevent). Persisting stops to `FPref` (we never `save()` — D13, and it is the
user's real Forge profile). Keeping it undecided and writing it only into
`docs/evidence/m6-engine.md` §9, which is where it was.

---

## D39 — The M6 refresh hop may walk the view graph only while the engine is parked

**2026-09-12**

**Decision.** `WireGuiGame.refreshState()` — the push that makes `setPhaseStop`,
`yieldTo`, `setYield` and `undo` visible in the next `state`, since none of the
four produces a game event — still hops to Forge's game pool, but the queued
runnable (`refreshSnapshot`) now returns **without touching a view** unless
**both** of these hold:

1. `inputGen` has not moved since the act was applied on the EDT (**D22**'s guard,
   verbatim); and
2. `enginePausedForSeat()` is true — `ReplyPool.pending() > 0` (the game thread is
   parked inside our own `ask()`) or `PlayerControllerHuman.getInputQueue()
   .getInput() != null` (an `InputSynchronized` is on the input stack, so a
   thread is sitting in `InputSyncronizedBase.awaitLatchRelease()` for it).

A skipped refresh is **counted** (`refreshesSkipped()`, printed by the run
summary) and nothing else: the act was already applied to the engine, and its
effect reaches the board on the next engine-driven flush.

**Rationale.** `ThreadUtil.invokeInGameThread` is
`Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))`, so the runnable
lands on a **second** `Game-n` worker while `Game-0` runs the match. Both pass
`ThreadUtil.isGameThread()` — a bare `getName().startsWith("Game")` — so
`Snap.assertGameThread` cannot tell them apart, and hard rule 3's property
("never walk while the game mutates") has to be arranged by hand. `captureOutcome`
arranges it by only hopping at game end; `asyncAbilityMenu` arranges it with D22's
generation stamp, which is sound there because that method is only ever reached
from a click *inside* a live input.

**The first cut of `refreshState()` arranged nothing**, and the four acts that
call it are sendable from the browser at any time — the phase-strip dots, Undo,
Pass-To and the yield toggles are enabled whenever there is no open ask and no
game over, i.e. right through the AI's turn. So D22's stamp alone is not enough
here: during the AI's turn the generation is stable for up to 250 ms at a time
(`awaitNextInput`'s re-push is what moves it), and `Game-0` is mutating the graph
the whole while. Condition 2 is what turns "probably parked" into "parked": both
predicates are read from the engine, neither walks a view, and
`InputQueue.getInput()` is a `BlockingDeque.isEmpty()` then `peek()` and nothing
else (javap-confirmed).

**Measured.** Three games over one socket at seed 13 with all five comfort acts:
**2 refreshes skipped**, and every one of the five effects still observed in a
later `state`. The cost of a skip is at most one flush of latency; the cost of
not skipping is a silently corrupted `Tracker`, which is what hard rule 3 means
by *silently* and why ~25 clean games are not evidence.

**Rejected.** Keeping the unguarded hop and arguing the race is acceptable
(nothing observed broke, which is exactly what "silently" predicts). Dropping the
hop entirely for a `snapshotDirty` flag consumed by the next game-thread flush
(sound, but while the engine is parked there IS no next flush — the four acts
would show nothing until the player clicked something else, which is the whole
defect `refreshState` exists to fix). Taking a lock around `flushState` (it would
serialise two *walks* without stopping `Game-0` *mutating*, and `emitOver`'s wait
for `captureInFlight` inside a held lock is a deadlock).

---

## D40 — The wait for `act: newGame` obeys the socket's timeout rule, not a wall clock

**2026-09-12** (M6 verification fix)

**Decision.** `MtgTable`'s two post-`over` waits — `NEXT_GAME_GRACE_MS` between
games of a `--games N` match, and `KEEP_OPEN_MS` after the last one — are
**unbounded while a `WsTransport` reports a connected client**, and the 30 s
values apply only while none is. `MtgTable.awaitNextGame` is the one place that
rule lives; `WsTransport.keepOpen(long)` is **deleted**, and a comment stands
where it was saying why.

Three exits, and the middle one is the reason the gate did not get slower:

1. the next game started — keep playing;
2. a client that **was** connected has gone — return at once, which is exactly
   what `keepOpen()` used to do and is why every scripted client in
   `tools/check-all.sh` still pays nothing for this;
3. `graceMs` elapsed with nobody ever attached — return.

A non-`ws` transport has no notion of a connection and keeps the flat grace it
always had: `--transport auto` drives itself, `--transport null` answers nothing.

**Why.** This is the rule **D24** already applies to the ask timeout (0 —
infinite — while a client is connected, finite only while none is), and the
argument is the same one: a person at a keyboard is allowed to think. It was not
applied here, and the cost was M6's own headline flow. Measured twice by the
verification pass: `--games 2 --keep-open` with one client connected the whole
time closed the socket at ~30 s and the client never got game 2; and in the
browser, 36 s after the final `over` the JVM had exited while the **New Game**
row was still enabled on screen, so the click produced only a toast. Since
`./scripts/play.sh` defaults to `--games 3`, a human had 30 seconds after each
game to press the button or the session was gone.

**Measured after the fix.** `--transport ws --games 2 --keep-open`, one client
connected throughout, silent for **40,046 ms** after game 1's `over`
(`ws-auto-play --new-game-delay-ms 40000`, itself added for this): the server
printed *"a client is connected, so there is no deadline"*, game 2 began 39 ms
after the act, `games = 2 played of 2`, `MTGTABLE OK`. After the last game the
client disconnected and the server printed *"the client disconnected — the
session ends here"* and exited immediately.

**The board's half.** `DecisionPanel`'s `NewGameRow` takes `Board`'s new
`connected` prop and, when the socket is not `open`, **disables both buttons and
says why**. A socket can still go away for reasons the bridge does not control
(the JVM was stopped, the machine slept), and a control that cannot do what it
says is a dead end whoever closed it. Nothing else on the board reads
`connected`: a click that cannot be sent is already reported by the transport's
own notice, and greying the table out on a blip would be the client
second-guessing the engine.

**Rejected.** Raising the two constants to a bigger number (a longer fuse is
still a fuse, and the number a person needs is "as long as I am looking at it").
Dropping the finite fallback entirely (a `--keep-open` session nobody ever
connected to would hold the JVM open forever, and `tools/check-all.sh` starts
seven of them). Giving `WsTransport.keepOpen` a stop predicate so the logic
stayed in the transport (the predicate is "has the next game begun", which is
`WireGuiGame`'s clock and not the socket's — the transport would have had to be
handed the gui to answer a question that is not about the wire).

---

## D41 — `players[].phaseStops` is ONE map per seat, `{own, opp}`, and the act is keyed by the TURN

**2026-09-12** (M6, written into `docs/protocol.md` §3.3 **before** either half of
M6 was built — amendments **M32** and **M33**)

**Decision.** Every seat carries one field,
`phaseStops: {"own": [PhaseType…], "opp": [PhaseType…]}` — `own` is where the
game stops while **this** player is the turn player, `opp` while any other is —
and the act is `setPhaseStop {phase, turn, stop}` with `turn` = `"own"` /
`"opp"`, relative to the viewing seat. There is no `playerId` in the act: a seat
may only change its own stops. In a two-player game `players[0].phaseStops.opp`
and `players[1].phaseStops.own` are the same list, which is redundant **and
deliberate** — a client renders one strip per seat and reads one field.

**Rationale.** A phase stop in Forge is a per-(turn player, phase) bit:
`FPref.PHASES_HUMAN` and `FPref.PHASES_AI` are two lists, and the desktop's strip
has two dot columns for exactly that reason (report 11 §3.2). A flat array of
`PhaseType` cannot say *whose turn*, so it cannot express the strip M4 already
drew. Naming the **turn** rather than the player in the act is what makes `own` /
`opp` one word across `state` and `act`: the same token the client read is the
token it sends back, with no id arithmetic in between.

This was also a **contract between two agents building at once**, which is why
the shape went into `docs/protocol.md` first and the code second. Both halves
landed against it without a round trip.

**Rejected.** A flat `phaseStops: [PhaseType…]` (cannot express the opponent's
column, which is half of Forge's own feature). Two fields, `phaseStops` and
`phaseStopsOpp` (two fields that must always be read together are one field, and
a client that read only the first would silently draw half a strip). Keying the
act by `playerId` (the M3-era spelling: it makes the act's vocabulary differ from
`state`'s for no gain, and invites a client to try to set the *opponent's* stops.
The bridge still accepts it, because the server tolerates any act; nothing sends
it). Answering the field from `FPref` or from `YieldController` (both are wrong
for us — the prefs are the user's real Forge profile and
`PlayerControllerHuman.isUiSetToSkipPhase` consults `YieldController` only
`if (isRemoteClient())`; **D19**'s map in `WireGuiGame` is the source).

---

## D42 — A `yieldKey` on the wire is an opaque bridge-minted handle, never Forge's key

**2026-09-12** (M6, amendment **M36**)

**Decision.** `state.stack[].yieldKey` is `"y1"`, `"y2"`, … — minted by
`WireGuiGame.handleFor()`, interned in a pair of maps for the life of **one
game**, and resolved back to Forge's real key when `act: setYield {yieldKey,
mode}` arrives. `rawYieldKey()` holds **the** call to
`StackItemView.getKey()` in the bridge, tagged `// ALLOW getKey:`. The client
passes the handle back and **never renders it**.

Two mechanical guards, because "nobody will call that method" is not a property:
`tools/lint-bridge.sh` **rule 4b** fails a build in which `getKey()` is called on
any identifier *declared* `StackItemView` anywhere under `bridge/src` except that
one tagged line — it derives the receivers from the declarations rather than
matching the name `si`, precisely so that renaming the variable to `top` does not
turn the rule off (it did, and the rule passed silently) — and
`tools/check-redaction.mjs` fails any log whose `yieldKey` contains a space or a
`(`.

**Rationale.** `StackItemView.getKey()` is
`CardView.toString() + ": " + the ability's text`: a card name, its id and its
rules text (report 11 §5.2). That is report 06 §4's text channel and hard rule
8's "the label is the leak that will actually happen" — on the stack, where a
face-down creature's trigger is exactly the card whose identity is concealed. A
handle is also *better* for the client than the key would be: it is stable while
the item is on the stack, addressable, and obviously not something to print.

**Rejected.** Shipping the real key gated through `Snap.label` (it would put a
card name on the wire whenever the gate happens to allow it, making the leak
conditional on a predicate instead of impossible — and a client would render a
string that looks like a caption). Hashing the key (still derived from the name,
still stable, and a hash is not *obviously* not-a-name to the next reader, who
would be the one to log it). Addressing a yield by stack index (the index moves
under the item, and a standing yield has to survive the item leaving and coming
back — which is the whole feature).

---

## D43 — Forge's floating-mana prompt is ON by default, in memory

**2026-09-12** (M6, amendment **M40**; answers PLAN.md's open question 9 and M5
follow-up 2)

**Decision.** `config.json` carries `"manaLostPrompt": true`; `MtgTable` sets
`FPref.UI_MANA_LOST_PROMPT` from it **in memory and never `save()`s it**;
`--mana-lost-prompt` / `--no-mana-lost-prompt` override either way, and the
session header records it as `prefs: ["UI_MANA_LOST_PROMPT"]` (**M31**). So
passing priority with mana that would be lost raises a `confirm` in **ordinary**
games, not only under `--probe`.

**Rationale.** The user is a hobbyist learning Magic, and mana lost from an empty
pool is invisible on a board that draws six pips. Forge already wrote the
warning; turning it on is rendering a feature rather than building one. It also
moves `confirm` out of probe-only territory: `InputPassPriority` is its **one
reachable call site** (**M24**), so with the pref off the kind occurs in no real
game at all. Measured: the same seed plays the same game — 1,587 log lines and
one fewer `buttonCancel`, which is a frame that swings both ways on its own
(M5 follow-up 6).

**Rejected.** Leaving it off, as stock Forge does (an ask kind that only exists
under a probe flag, and a player who loses mana silently — the two halves of the
same argument). `save()`ing the pref (D13's rule and CLAUDE.md's "never write
outside this repo": `~/.forge` is the user's real profile). Making it a control
on the board (it is a per-session engine preference read at bootstrap; a toggle
in the browser would be a setting the engine does not learn about until the next
process, i.e. a client state machine with a config file behind it).

---

## D44 — One `hello_ok` and one frame log per GAME, not per session

**2026-09-12** (M6, amendment **M38**)

**Decision.** A `--games N` session emits **N** handshakes and writes **N**
files. Game 1 keeps the session's `gameId`; game *n* is `<gameId>-g<n>` and
writes `var/games/<gameId>-g<n>/frames.jsonl`, line 0 its own session header.
`WireGuiGame.openView` is the single reset hook: the card / player / ability
indexes, the concealed-id set, the yield-handle table, the phase-stop map, the
`input` struct, the over-latch and the `ReplyPool` are rebuilt there, and
`askSeq` and `FModel` deliberately survive.

**Rationale.** `HostedMatch.endCurrentGame()` empties `getHumanControllers()` and
replaces every `PlayerView`, so **every id the client cached is invalid** — and
the protocol already had the signal for that: a `hello_ok` means "drop your card
map" (§2.1, invariant 10). Reusing it costs the client nothing and needs no new
frame type. One file per game keeps "a frame log is a replayable game" true:
`?replay=<file>`, the scrubber, `check-redaction.mjs`'s monotonic-`seq` rule and
the frame counters all assume one header per file, and each header is then honest
about *its* seed, policy, prefs and decks.

**Rejected.** One file for the whole session with a second session header inside
it (three tools would have needed a new mode, to buy a reader a convenience
nobody asked for). Appending game 2 into game 1's file with no new header (the
same, plus the header's `decks` / `policy` line becomes a claim about a game it
did not describe). Keeping one `hello_ok` and patching the client's ids across
the reset (the ids are Forge's and it does not offer a mapping; inventing one is
the client second-guessing the engine, and it is unobservable until the first
game where a seat comes back as a different id).

---

## D45 — `Space` activates the FOCUSED button, and sends nothing when the browser already will

**2026-09-12** (M6, amendment **M39**)

**Decision.** `input.buttons.focus` (`"ok"` / `"cancel"` / `null`) is
`updateButtons`' sixth argument `focus1`, which the emitter had been dropping.
The board draws the focus ring on that button and gives it the DOM focus;
`planKey` binds `Space` to `buttonOk` or `buttonCancel` **per that field**, and
returns **no plan at all** while a real button, link or `summary` has the focus,
because the browser is already going to activate it. With `focus: null` — and in
every recording made before 2026-09-12 — `Space` is OK, which is M4's behaviour.

**Rationale.** *"Space = OK"* is not a Forge shortcut and never was: Forge's
desktop has no global binding, `FLabel` activates the **focused** Swing label,
and `focus1` is what decides which (report 11 §11). So the client had a rule
where the engine had a field. The second half is a defect that has already
happened twice in this repo: a key handler that also sends `buttonOk` for a
focused button **answers the engine twice for one press**, and M3's attempt to
avoid it dropped the *whole* keyboard for a focused element, so clicking a card
turned `Escape` off. Hence: a focused button keeps `Space` and nothing else.

**Rejected.** Keeping `Space = OK` unconditionally (a client rule standing in for
a typed field — amendment **M30**'s rule in miniature). Binding `Space` to
`passPriority` when `focus` is `null`, which protocol §4 offers as an option
(pass priority is a different act with different consequences, and the player
pressed a key that means "press the button"; `P` is the pass key and it is a row
of its own). Rendering our own idea of which button *ought* to be focused (it is
`updateButtons`' argument, and guessing it is how a board and an engine come to
disagree about what `Space` does).

---

## D46 — A counter type on the wire is Forge's DISPLAY name, and the doc was wrong rather than the bridge

**2026-09-13** (M7 verification, amendment **M43**)

**Decision.** `counters` — the map on a `PlayerState` and on a `Card`, and the
`counter` field of the §3.6 `counters` event — carries
`CounterType.getName()`, i.e. Forge's **printed** name: `+1/+1`, `-1/-1`,
`Spore`, `Energy`. **The bridge does not change.** `docs/protocol.md` §3.1, §3.2
and §3.6 are corrected to say so, and the key is now declared an **opaque display
string**: a consumer that wants an identifier-shaped token normalises one itself.

**Rationale.** The spec named the wrong accessor's output and had done since M1.
`Snap.java` has always called `getName()` (three call sites), and **all 1,316
counter values in the committed corpus are `+1/+1` or `Spore`** — there is not
one `P1P1` anywhere in `fixtures/`. So `P1P1` was never a wire fact, and
changing the bridge to emit `CounterType.name()` would invalidate fourteen
recordings, require a compatibility shim for them, and replace the string Forge
itself shows a player with one it does not. It would also be a change made to
suit one consumer's selector grammar, which is the tail wagging the dog.

That it went unnoticed for six milestones is the interesting part, and it is the
cost this entry is really recording. The arena's §7.3 selector grammar spells the
counter `P1P1`, written from this file, so `counters:P1P1+` — the selector behind
Agent Phil Coulson's badge cue and the `creature/W` archetype — **matched nothing
at all** until `counterToken()` normalised the wire's spelling into it. That is
the failure mode CLAUDE.md's *"change the doc first, then both ends"* exists to
prevent: a second consumer written from the doc repeats the dead lookup.

**Known cost, not fixed here.** `COUNTER_LABELS` in `web/src/render/labels.ts` is
keyed by the same enum-constant spelling (`P1P1`, `M1M1`, `LOYALTY`, …), so on
the 2D board `counterLabel('+1/+1')` never hits the table and falls through to
its own default. The result is *correct text* — the default prints the raw name,
which is already `+1/+1` — with the generic `ctr--other` class and no
`mana-font` glyph. It is cosmetic, it is on the board rather than in the arena,
and it is a separate change with its own board-render evidence; it is written
down here so the next reader does not rediscover it as a new bug.

**Rejected.** Emitting `CounterType.name()` from the bridge (breaks the corpus,
demotes `counterToken()` from a translator to a permanent shim for the fourteen
pre-change fixtures, and throws away Forge's own display string). Widening the
arena's selector grammar to accept `counters:+1/+1+` (the `+` and `-` direction
qualifiers collide with the name itself, and `validate.ts` would have to parse
its way out). Leaving the doc alone because the client works around it (the
workaround *is* the evidence that the doc misleads a reader who trusts it).

---

## D47 — The arena stays on the React-18 3D line; the app does not move to React 19

**2026-09-12** (M7, E1 — report 09 §1.2's go/no-go)

**Decision.** The arena runs on **`@react-three/fiber` 8.18.0 + `@react-three/drei`
9.122.0 against `react` 18.3.1**, which is the frozen React-18 line. The rest of
the app is untouched: no React 19, no `react-dom/client` change, no migration of
the 2D board, and no second React in the bundle.

**Rationale.** Report 09 §1 budgeted 45 minutes for a spike that could have ended
three ways — the frozen v8 line, `three@0.173.0` under it, or moving the whole
app to React 19 + fiber 9 + drei 10 — and the first one worked, so the budget was
never spent. `npm i -E three@0.186.0 @react-three/fiber@8.18.0
@react-three/drei@9.122.0` resolved with **no peer conflict**, `tsc --noEmit`
exits 0, `vite build` succeeds, and it renders a real WebGL scene with real
Scryfall textures. The alternative was a React major upgrade that would have had
to re-green **every existing test and the whole 2D board** to buy a renderer
nobody had written yet — a migration taken on spec, to remove a risk that had not
materialised.

**Known cost, and it is the trip-wire.** Fiber 8.18.0's loop calls a deprecated
`three` API, so every `<Canvas>` mount prints `THREE.Clock: This module has been
deprecated. Please use THREE.Timer instead.` once. It is a warning and the loop
runs, so §1.2's named trip-wire (*"the frozen line stops working against a
current `three`"*) has **not** fired — but it is the first visible crack, the
line has no maintenance branch (frozen 2025-02-19), and the next `three` minor
could turn it into a break. **The day it does, the answer is the React 19 move,
not a patch**: it is written up in report 09 §1.2 and §13, and this entry is what
tells the next reader the spike was already run once.

**Rejected.** Moving the app to React 19 + fiber 9 + drei 10 pre-emptively (a
React major upgrade to the working half of the app, bought before the risk was
real). Pinning `three@0.173.0` under fiber 8 (0.186.0 works; a deliberately old
`three` costs the texture and colour-space fixes for nothing). Two React copies,
one per renderer (two reconcilers, two hook registries, and the `V` switch stops
being one component tree).

---

## D48 — `three`, `fiber` and `drei` are pinned EXACTLY, with no caret

**2026-09-12** (M7, E1)

**Decision.** `web/package.json` carries `"three": "0.186.0"`,
`"@react-three/fiber": "8.18.0"`, `"@react-three/drei": "9.122.0"` and
`"@types/three": "0.185.4"` — **no `^`, no `~`** — against every other dependency
in the file, which floats on a caret. `NOTICE` section 6 records the versions,
their MIT licences and this reason.

**Rationale.** Fiber 8's `three` peer range is `">=0.133"` with **no upper
bound**, and the React-18 line is frozen with no maintenance branch. A caret
would therefore let `npm install` pull, at some arbitrary future moment, a
`three` the frozen line cannot be fixed for — and the failure would land on
whoever ran `npm ci` next, not on whoever changed something. An exact pin makes
that a deliberate edit with a diff, which is where **D47**'s trip-wire can
actually be read.

`@types/three` is a `devDependency` (three ships no types of its own) and is
pinned for the same reason from the other side: the types must describe the
runtime we installed, and 0.185.4 against 0.186.0 is the pairing that
type-checks.

**Rejected.** Carets like the rest of the file (consistency, bought with the one
failure mode this dependency set actually has). A lockfile alone (it pins for
`npm ci` and says nothing about intent — the next person to run `npm update` or
`npm i three` gets no warning). Vendoring `three` into the repo (a 1.2 MB blob
under GPL review for a dependency that is not moving).

---

## D49 — The arena is ONE lazily-imported chunk, and the 2D board pays ~1 kB for its existence

**2026-09-12** (M7, E1/E2)

**Decision.** `web/src/main.tsx` reaches the arena through
`lazy(() => import('./arena/Arena.tsx'))` behind a `<Suspense>`, in both the live
and the replay trees. Nothing under `web/src/arena/` may be imported statically
from the 2D path, and `web/src/useView.ts` (the `#arena` / `#/arena` /
`?view=arena` reader) is deliberately a **110-line module with no router
dependency and no persistence**.

**Rationale.** The 2D board is the thing that works; it must not get slower
because a second renderer exists. Measured, before and after, on the same machine:
the entry chunk went **83.99 → 85.62 kB gzip (+1.63 kB)** across the whole
milestone and the arena is **996 kB / 274 kB gzip in a chunk of its own**, fetched
on the first `#arena` and never before — `dist/index.html` carries one module
script, no `modulepreload` for it, and exactly one `import("./Arena-….js")` in the
entry. That +1.63 kB is `useView`, the view toggle, the `Suspense` boundary, two
keymap rows, the `?arena=off` / `?dpr=` parses and the arena's CSS. **Not one byte
of `three` is on the 2D path**, and `npm run build`'s own output is how that is
checked — no bundle-analysis tooling was added to assert it.

A router would have been the ordinary answer to "two views, one app" and is a
dependency, a URL scheme and a history model bought for one boolean. A fragment
fires `hashchange` without touching the transport, which is precisely why `V` can
switch renderer mid-game without dropping a frame.

**Rejected.** A static import guarded by a flag (the bundler still puts `three` in
the entry chunk; the flag saves render time and no bytes). A separate HTML entry
point for the arena (two apps, two sockets, and the `V` switch becomes a
navigation that reconnects). `react-router` (see above). Persisting the chosen
view in `localStorage` (a player who hits a WebGL failure would then reopen into
it; `?arena=off` is the escape hatch and it is per-URL on purpose).

---

## D50 — `layout(state)` is authoritative and a cue only contributes an offset that decays to identity

**2026-09-13** (M7, E3 — report 09 §5.1)

**Decision.** Every card's transform in the arena is

```
finalTransform(card) = layout(state)[card.id]  ⊕  offsets[card.id]
```

`layout.ts` is a **pure function of the `ClientState`** — no three, no React, no
time — and is the only thing in the codebase that knows a coordinate. A cue may
**never** write a card's position; it contributes a transient `Offset` that
**starts at identity and returns to identity**, composed per frame by the one
`useFrame` in `CueRunner.tsx`. A cue that wants a card to *stay* somewhere asks
`layout.ts` for it instead — the Helicarrier's hover is `presence`, a **layout**
rule, which is why it survives `skip all`.

**Rationale.** This is the property that makes a 3D renderer safe to point at a
scrubbable frame log. Because the resting pose is a function of the state and the
animation is a decaying delta on top of it, **skip, scrub backwards, `resync` and
a new `gameId` are all the same call** — `flushAndSnap()` — and none of them needs
a rewind path, an inverse animation or a tween cancellation graph. The arena never
has to ask "where was this card mid-cue"; it asks the engine's own snapshot where
the card *is*. `replay-cues.test.ts` asserts it mechanically rather than in a
comment: after every one of the **3,293 non-empty batches across all eighteen
committed recordings**, the offset map is **empty**.

The same rule is what keeps hard rule 8's renderer half mechanical in 3D: a
concealed card is placed as a **back** by `layout.ts` before any cue runs and
before `CardPlane` asks for a face, so no animation can put a face on screen that
the frame concealed.

**Rejected.** Animating the scene graph directly (the usual approach, and the one
that makes a scrub backwards into a rewind problem — every in-flight tween becomes
state the reducer does not own). Keeping a shadow "animated state" beside
`ClientState` (a second source of truth for where a card is, which is the defect
this entry exists to prevent). Letting a cue write `layout`'s output for
"permanent" effects (the Helicarrier proves it is unnecessary: `presence` is one
field on the resting pose and it composes with everything).

---

## D51 — Cues are ONE validated data file, keyed by card name, resolved through a three-rung ladder

**2026-09-13** (M7, E3/E5 — report 09 §7)

**Decision.** `web/src/arena/cues/cues.json` is the whole cue table: a `version`,
an `archetypes` map (`creature/W`, `land/*`, `equipment/*`, …) and a `cards` map
keyed by the card's **name**, whose values name a cue in `registry.ts` and tune it
with `ms` and `params`. Any key beginning with `_` is a comment; every other key
is validated against a **closed** set, so an unknown field is an *error* rather
than something that silently does nothing. Resolution is a three-rung ladder:
**per-card → archetype (primary type + colour) → the §6 default for the event
kind**, and the default table is a `Record<EventKind, CueSpec>` so it is
exhaustive *by type* — a new kind on the wire does not compile until it has one.

A bad entry is dropped by `validate.ts` and falls through the ladder; **the file
can never stop the arena**. `cues-exhaustive.test.ts` fails on any error in it,
which is where a typo is cheap.

**Rationale.** `docs/ideas/arena-mode.md` proposed either `<card-name>.json` per
card or one file, and one file wins on four counts measured against this deck:
one fetch, one parse, one validation pass, one diff in review — and **no
filename-escaping problem** for `A.I.M. Scientists`, `S.H.I.E.L.D. Spy Kit` and
`Quake, Agent of S.H.I.E.L.D.`. Keying by name rather than by Scryfall id or
Forge id keeps the file readable and editable by the person who knows the source
material, and the name is already on the wire for any card the viewer may see.

**The rule this file lives by, and it is a hard rule.** *A cue keys off an event
that is about **that card**.* The ladder resolves an event through the card the
event **names**, so a beat that belongs to another card cannot be keyed on its
author: §3.6's `counters` event carries the card, the type and the two values and
**no source**, so *"Coulson points and every Hero flashes"* is not expressible and
must not be invented — the badge is keyed to the card that *received* the counter.
Inventing that link would be rules logic in a renderer (CLAUDE.md §Scope).

**Rejected.** One file per card (filename escaping, N fetches, N parses, and a
review diff that hides a table-wide change). Keying by Forge card id (ids are
per-game and a new `hello_ok` invalidates them — invariant 10). Keying by Scryfall
id (stable, but nobody writing a cue knows one by sight, and `art.json` is
gitignored). Open key sets with unknown fields ignored (a misspelled `ms` is then
a cue that silently plays at its default duration, which is exactly the class of
bug a data file makes easy and cheap to prevent).

---

## D52 — The arena's card texture is Scryfall `normal`, with ONE shared rounded-corner alpha map

**2026-09-12** (M7, E2 — report 09 §4.2, §9.2 rule 1)

**Decision.** `CardPlane` requests `imageUrl(entry, 'normal')` — the 488×680 JPEG
— for every card face in the 3D scene, and rounds the corners with **one**
256×256 rounded-rect alpha texture generated at startup and used as the `alphaMap`
of every card in the game. The cache is keyed by **URL, never by card id**, so
seven `Plains` share one texture and one upload. D28's three board variants
(`thumb` / `grid` / `display`) are unchanged; the arena simply adds a fourth use
of the same `art.json`.

**Rationale.** Three numbers decided it, all measured. **`large` costs ~90 MiB of
VRAM including mip chains against ~47 MiB for `normal`** across the deck's 28
distinct faces, and a card is ~136 px tall on screen — there is nothing to see for
the other 43 MiB. The **`png` variant has a real rounded-corner alpha and is
605,487 bytes against 73,417** — 8.2× the bytes and ~2× the VRAM per card, to buy
a silhouette one shared 256×256 mask provides for every card at once. And 488×680
needs **no resize and no filter hack**: three 0.186 is WebGL 2 only, which does
NPOT mipmaps, so the file uploads as it arrives.

Four lines around it are not obvious and each is verified against the installed
`three`: `colorSpace` must be set to `SRGBColorSpace` **by hand** (the `Texture`
constructor defaults to `NoColorSpace` and `TextureLoader` never touches it, so a
card left alone renders washed out); anisotropy is off by default and is **the
single biggest visual win here**, because a table camera views cards at ~50° from
their normal, which is exactly the case trilinear filtering blurs;
`gl.initTexture()` uploads immediately rather than at first draw; and CORS is fine
— `cards.scryfall.io` answers `access-control-allow-origin: *`, without which the
texture would fail to upload to WebGL entirely rather than merely taint a canvas.

**Known cost.** The *first* GPU upload of each face is tens of milliseconds under
a software rasteriser, which is the `max ≤ 50 ms` breach on a cold table in report
09 §9.4's gate (M7 follow-up 1). It is per face, once, and never again.

**Rejected.** `large` (2× the VRAM for pixels no camera angle resolves). The `png`
variant for its alpha (8.2× the bytes per card to replace one shared 256×256
mask). `grid` — the board's own WEBP at the same 488×680 — which would share the
board's warm HTTP cache and is genuinely tempting; `normal` is the interoperable
baseline `art.json` already stores and the one variant guaranteed present for
every face, and the saving is HTTP bytes rather than VRAM, which is not what this
scene is short of. Revisit it if a cold arena load ever needs to be faster.
Per-card rounded-corner geometry (more triangles and a second geometry, against
§9.1's one-geometry budget, for a silhouette an alpha map already gives).

---

## D53 — Tier 2's figures are stylised low-poly CC0 meshes under ONE unlit holographic material

**2026-09-13** (M7 Tier 2 — user decision 1, given before T0; the material is
T2's. Recorded 2026-09-27)

**Decision.** Creatures on the battlefield are manifested by **stylised low-poly
figures** — Kenney's *Mini Characters* for every humanoid (agents, heroes,
scientists, the Soldier and Hero tokens), Quaternius's *Robot Enemy Flying* for
the drone (Aerial Doombot, the Robot token) and Quaternius's *Bee Enemy* for the
insect (the two ants) — and every figure is drawn with **one holographic
`ShaderMaterial`** (`web/src/arena/scene/holoMaterial.ts`): unlit, tinted by the
card's colour identity through a uniform, a fresnel rim computed in **view
space**, and scanlines that are a function of the model's own Y rather than of a
clock. The scene still has **no lights** and no shadow maps, and the card planes
are never lit.

**Rationale.** The user's art direction, and report 13 §13 question 1's option
(b) layered on option (a): the holographic treatment *forgives* model quality,
keeps the scene unlit (report 13 §8.3 rule 2's option (a), for free), and lets one
humanoid serve several archetypes with only a tint — which is what lets three
CC0 packs give a model to every creature of `decks/pacho-shield.dck` the corpus
has seen on a battlefield, tokens included, except the Helicarrier (T10). Measured (`docs/evidence/m7-tier2.md`
§3.4): at `g1.jsonl` frame 355, **11 figures are 11 material instances of one
program**, and the whole scene has 9 programs. Nothing in the material reads a
clock, so nothing in it can wake `frameloop='demand'`.

Two lines in it are not obvious and each was a defect first: the rim is a
view-space dot product (a view-space normal against a world-space view vector is
the classic fresnel bug — the rim swims as the camera orbits), and the shader ends
with `#include <colorspace_fragment>`, without which every tint is wrong in the
same direction the card textures were before `useCardTexture.ts` set `colorSpace`
by hand. And the pipeline must keep `NORMAL`: `gltf-transform unlit` declares the
material uses no normals, the default `prune` then strips them, and a fresnel of
`normalize(vec3(0))` drew every figure as a **solid black silhouette** in a file
that still validated (`tools/build-figures.mjs` runs `prune --keep-attributes
true`).

**Known cost.** *Hero* and *scientist* are the agent mesh in a gold and a
lab-green tint until T8; the Helicarrier has no mesh (T10) and draws its disc.
The Kenney character is a chibi (bounding box 0.767 × 0.671) and the drone is
mostly wingspan, which is why **D55**'s width clamp exists.

**Rejected.** Likeness (report 13 §13 option (c): Tier 3 in all but name, and the
option with the licence problem — see **D54**). Lit figures with a hemisphere and
a directional light (a second renderer budget, and the "one light" that turns
into a lighting rewrite — report 13 §12). Plain stylised figures without the
hologram (reads as a boardgame and shows every seam in a free model).

---

## D54 — Only CC0 assets are used at all, each with a written provenance; no Mixamo, and no model is ever made from card art

**2026-09-13** (M7 Tier 2 — user decisions 1, 3 and 4 and the brief's CC0-only
rule, given before T0; the manifest split is T2's. Recorded 2026-09-27)

**Decision.** A third-party model, texture or clip enters the arena **only if
its source page badged it CC0 on the day it was downloaded**, and that fact is
recorded, per pack, in **`tools/assets-manifest.json`** — hand-written: creator,
pack version, page URL, download URL, byte count, **sha256**, download date,
licence, licence URL and **the licence badge text verbatim**. Anything not CC0
is not used at all, not even locally. **Mixamo is not used** (user decision 4);
where a humanoid needs clips its own pack lacks, the source is Quaternius's CC0
*Universal Animation Library* (not yet downloaded: slice 1's packs carry the
clips T2–T7 needed). **No model is generated from card art** by any image-to-3D
tool, hosted or local (user decision 3).

`web/src/arena/figures/models.json` is the **other**, measured half: written by
`tools/build-figures.mjs` from the file it just built (node names, heights, bone
and triangle counts, the clip names that really exist), and never edited by
hand. The downloaded archives live under `var/assets/figures/` (gitignored); the
built library is one file, `web/public/models/figures.glb` (126,404 bytes, sha256
`c870a533…58fa`). The arena loads it with three's own `GLTFLoader` and
`MeshoptDecoder`, from `web/public/models/` and nowhere else.

**Rationale.** A figure library is committed binary art in a public GPL
repository, so the licence has to be provable *after the page changes* — and the
pages do change: Quaternius published a non-redistributable **Quaternius Asset
License** on 2026-08-28 and has begun moving packs onto it, and that licence's §7
says the version in force when you obtained an asset governs (report 12 §0.2).
The badge text and the date are the only evidence that survives. Mixamo's terms
allow use but forbid distributing the raw character and animation files, which
puts its output in the same "local only" bucket as the Scryfall art; a CC0 clip
library that retargets onto a Mixamo-shaped rig removes the reason to want it. A
mesh generated from a Marvel card image is a derivative of art licensed to
Wizards, and the Fan Content Policy's line is *"If you don't have the rights to
use another person's stuff in your Fan Content—don't"*.

`@gltf-transform/cli` became a **`web/` dev dependency**, where reports 12 and 13
§9.3 said "nothing new enters `web/package.json`": pinning it there is what makes
`tools/build-figures.mjs` reproducible offline rather than dependent on whatever
`npx` resolves on the day. It ships nothing (193 lockfile entries, none imported
by the app; NOTICE §7).

**This supersedes report 13 §9.1's default** that the models directory is
gitignored: a CC0 file *may* be committed. Whether `figures.glb` *is* committed,
or regenerated like `web/public/art.json`, is still the user's call, and nothing
in the code depends on the answer — a missing file draws every creature as its
disc (evidence §4.3).

**Known cost.** `build-figures.mjs` prints the manifest's sha256 when a source is
missing but never *verifies* one, and nothing records or checks the built file's
own hash except this entry and NOTICE §7. The liveness clause that guards "no
CDN" is a **hostname denylist** (`gstatic`, `unpkg`, `jsdelivr`, `cdnjs`, `cdn.`,
`googleapis`): the verification pass pointed the loader's fallback at
`https://example.com/…` in a scratch copy and the clause stayed green. Both are
Tier 2 follow-ups in PLAN.md.

**Rejected.** Mixamo clips kept local (usable, but a second "never commit" bucket
for the thing a CC0 library already provides). QAL-licensed Quaternius packs
(usable, not redistributable — a public repo is arguably exactly the
"repackaging" §3(a) forbids). Image-to-3D from card art, even paid-tier and
private (report 13 §13 question 2; the user said no). drei's `useGLTF` (suspends
inside the canvas and defaults its DRACO decoder to
`https://www.gstatic.com/draco/…`). Draco and KTX2 (a second decoder to host for a
126 kB library; meshopt's decoder is 29 kB inside the installed `three`).

---

## D55 — A figure stands at its card's front edge, the card plane stays, and its width is clamped to the rank slot

**2026-09-13** (M7 Tier 2 — user decision 2, given before T0; the disc is T1's,
the width clamp T7's. Recorded 2026-09-27)

**Decision.** Every battlefield creature keeps its card plane exactly where
`layout.ts` puts it, and gains a figure at

```
standPointOf(p) = [ p.x, p.y, p.z − seatSign(p.seat) × 0.52 × (1 − 0.45 × p.row) ]
```

— `FIGURE_STANDOFF = 0.52` toward the table centre, the spec's number, falling off
on a wrapped rank's second row; facing the other seat; `FIGURE_HEIGHT = 0.85`,
then scaled so no figure is wider than **`FIGURE_MAX_WIDTH`** (the rank pitch less
a gutter, 0.72) unless that would make it shorter than **`FIGURE_MIN_FIT`** (0.55
of its nominal height). A **stand disc** — tinted by colour identity, sized by P/T — is
drawn under **every** creature as one `InstancedMesh`; when no model resolves it
is the whole figure. `figurePose` never gives more than `MAX_FIGURES = 12`
figures a model; the surplus draw their discs. All of it is in `layout.ts`'s units
(`standPointOf`, `Placement.row`) — no coordinate moved into `figures/`.

The user's words were *"figures stand ON their card (0.52 units toward the table
centre per the spec), the card plane stays"*. A card is one unit long, so a stand
point 0.52 from its centre is its **front edge**: the figure's feet are at the
edge of its own card and the card face behind it stays readable from the rest
camera. That is report 13 §3.1's geometry, taken as given.

**Rationale.** Report 13 §3.1's three reasons: the card stays readable from the
steep rest camera; the figure stands where it will fight (the lunge is a short
step toward the combat lane, not a leap over its own card); and it inherits
`presence` for free — both Aerial Doombots stand at `y = 0.24` on their existing
hover with no line of new code (evidence §4.2). The disc is always on because it
is also the footprint that ties a figure 0.52 away back to its card, and it costs
**one** draw call for the whole table — it is not an `Effect`, so 21 of them do
not starve `MAX_LIVE_EFFECTS = 8`.

The width clamp is correction (b) of T2's finding: normalising the Kenney chibi
by *height* made it 0.97 units wide against a 0.796 pitch, so a crowded rank read
as a row of shoulders. Measured over 12,029 poses (evidence §19.7): the agent and
the insect now fit their slot exactly.

**Known cost.** The drone does **not** fit, by the floor's own choice (a strict
clamp would make it about a quarter of a unit tall beside a 0.63-unit agent):
worst overlap 0.634 units, every
overlapping pair has a drone in it — T9's narrower drone. And the row falloff is
the spec's formula, which the verification pass found still puts a wrapped
rank's **second-row figures inside the first row's cards**
(`human-sideboard-7`, whose crowded ranks are discs). Both are Tier 2 follow-ups.

**Rejected.** A figure centred *on* the card (it occludes the art from exactly
the camera angle the table is read from). A figure that turns with its tapped
card (it would lie down sideways; a tap is a *stance*, **D56**). A label over the
figure (the card plane is the identity; a figure never carries a name, and never
takes a click — `raycast` is cleared on every clone and `HitProxy` stays the only
thing the raycaster sees). A smaller `FIGURE_HEIGHT` instead of the clamp (shrinks
every figure to fix the widest).

---

## D56 — If the snapshot says it, it is a POSE; if only the event says it, it is a CUE

**2026-09-13** (M7 Tier 2 — report 13 §1.3, applied in T1–T6. Recorded
2026-09-27)

**Decision.** **D50** generalised to everything Tier 2 draws. A manifestation is
a **pose** — a pure function of the frame on screen, correct after `skip all`, a
backwards scrub, a `resync` and a new `gameId` with no history — whenever the
snapshot carries the fact; it is a **cue** — a transient that decays to identity —
only when nothing but the event does.

| pose (a pure function of the snapshot) | cue (a transition) |
|---|---|
| a creature has a figure at all | summon |
| stance: `attacking` → `blocking` → `sick` → `crouch` (tapped) → `ready`, in that precedence | the attack lunge, the block interpose |
| who blocks whom — from `state.combat`, never from the `blockers` event | damage `hit` |
| an aura or equipment on its host, from `attachedToId`, including Quantum Reduction's 0.45× | the snap-on (`attach.snap`, with `params.hostClip`) |
| a land's tile, its kind and its tapped dimming | the tap ripple, the untap ring, the rise |
| the standing mana pool (`manaPool`) | a mote's flight (**D60**) |
| a spell form at its caster's casting anchor, the ghosted creature spell | cast, strike, fizzle, shatter |
| a tether from a stack item to its target | the strike along it (**D63**) |
| the combat freeze: a stack during a combat phase holds the battlefield's clips (never the spell form, never the HUD, never a click) | — |

**Rationale.** Two measurements, both in the evidence. **28 `attach` events
against 985 frames showing an attachment**: an aura built as a cue is invisible
97% of the time it should be on screen (§17.1: all 985 frames show it). And
**`manaPool` is non-zero in 47 of 3,679 frames**: a mote built as a pose would
almost never appear (§11.5). The rule decides both, the opposite way round, from
the same question.

**The case that proves the rule is a rule.** The `die` clip is requested and
**never plays**: the snapshot that carries a `zone → graveyard` event already has
the creature in the graveyard (2 of 45 leave-the-battlefield events arrive with
the creature still on a battlefield, both face-down), so `figurePose` correctly
gives it no figure. It was **not** worked around. Keeping a figure alive past the
frame that says it is gone would be the renderer remembering something the engine
did not say; the death is carried by `damage.lethal → hit` on a live body (19 of
44 card-damage events) and the card's own dissolve. A real death collapse needs
the engine to say "this creature is dying" one frame earlier than it does.

**Rejected.** Auras as a cue (above). A figure that outlives its frame for the
`die` clip (above). Blocking read from the `blockers` event (amendment **M7**: an
unblocked attacker arrives as `{attackerId: n, blockerIds: [n]}`, and
`state.combat` is the authority). A tapped figure that rotates with its card.

---

## D57 — The clip lane: the cue drives `action.time`, and every mixer tick in the arena is a literal zero

**2026-09-26** (M7 Tier 2, T3 — report 13 §3.3–§3.6)

**Decision.** Skinned animation is a **fifth transient on the `Stage`**:
`setClip(cardId, {clip, t, weight, alias, key})` / `clearClip(cardId)`, decaying
exactly like an `Offset`. `CueRunner`'s frame loop writes
`action.time = t × duration`, sets the weight and calls **`mixer.update(0)`** —
which, because `AnimationAction._updateTime` returns `this.time` untouched on a
zero delta in `three@0.186.0`, is a deterministic *scrub*, not an advance. The
lane is driven by the shared `cue()` builder, keyed by **cue id** through
`figures/clips.ts`'s `CLIP_FOR` (23 of the registry's 57 cues), so `cues.json`'s
existing 28 cards and 7 archetypes light up figures with no edit; a per-card
override is `params.clip`, resolved alias → generic clip → *nothing* (a missing
clip removes only what the model would have added). Clips **arbitrate** rather
than compose: one request per card, chosen by a total order (`die > hit > block >
attack > summon > shrink > grow > channel > crouch > idle`, ties by weight, then
name) in **one** function, `clipBeats`, that `SceneStage` and `NullStage` both
call; a request with the **same `key`** replaces its own. The resting stance is
`REST_CLIP_FOR[stance]`. Under `prefers-reduced-motion` no clip is written at all.

**Rationale.** The queue's clock is virtual, and pause, 0.5×–4×, step, skip,
`flushAndSnap`, the three live budgets and reduced motion are all properties of
it. A mixer on its own clock keeps none of them: a skipped cue would leave a
creature frozen mid-lunge and a 4× replay would play its cues fast and its
animations at 1×. Driving `action.time` from `t` means **the clip is the cue**.
Mechanical, not remembered: `liveness.test.ts` asserts every `mixer.update(…)`
under `web/src/arena/` has the literal argument `0` and lives in exactly
`scene/CueRunner.tsx` and `scene/FigureLayer.tsx` (negative-controlled: `update(dt)`
turns it red and nothing else notices), and that only the frame loop writes
`action.time`. `replay-cues.test.ts` asserts `stage.clips` is **empty** after
every one of the corpus's 3,293 batches, and `clips.test.ts` that a cue's clip
weight is already 0 at `t = 1`, so a skipped cue lands on the stance.

The `key` exists because the test double found a defect the real stage hid:
"highest priority wins" let a cue's own request at `t = 0.5` refuse the same cue
at `t = 1`, freezing the figure at the first weight it saw — invisible in
`SceneStage`, which empties the map every frame.

**Known cost.** In the human's own combat the transient clips mostly **do not
play live**: Forge hands the human priority with each combat batch, the 250 ms
awaiting-human budget applies, the batch would need compressing below
`MIN_COMPRESSION` (0.25), and a snapped cue is applied at `t = 1`, where the clip
weight is 0. What carries combat live is the pose (**D56**). Loosening that is a
Tier 1 queue-policy change and a PLAN follow-up, not part of this decision.

**Rejected.** drei's `useAnimations` (it *is* `useFrame((_, dt) =>
mixer.update(dt))`, one per creature, and a wall clock per mixer). Clips composed
by blending like offsets (a figure cannot be 30% dying and 70% attacking). Root
motion (a clip that moves the root fights `figurePose ⊕ offset`, which owns
position; the build's validator refuses one). Keying clips by event kind (Ant-Man's
`attack.shrink` and Peggy's `attack.aegis` answer the same event differently).

---

## D58 — Idle breathing runs only while something else is animating

**2026-09-13** (M7 Tier 2 — user decision 7, given before T0; built in T3.
Recorded 2026-09-27)

**Decision.** A resting figure's idle clip (`rig.restTime`) advances **only while
the cue queue is not idle** — `CueRunner` passes that as `awake` — and only for
the `ready` and `sick` stances (`BREATHING_STANCES`); `restTime` is *held*, not
reset, when the queue drains, so a figure never snaps back to frame 0 of its
idle. `frameloop='demand'` is unchanged.

**Rationale.** Report 13 §1.5 and §8.3 rule 1: the correct number of frames while
the AI thinks is **zero**, and one always-on motion costs the whole idle budget.
The loop is already awake whenever a cue plays, so breathing then costs nothing,
and the table still breathes during every animated moment. Verified by the
verification pass: **0 renders in 5 s** on `human-comfort-13` frame 1262 (7
figures), with bloom on and off.

**Known cost.** Tier 1's `presence` **bob** (the Doombot, the Helicarrier,
Wasp) already keeps the loop at `always` while such a card is on the table, and
since Tier 2 every pose layer is bound on each of those frames too — so the idle
cost of a table with a bobber rose, though the idle cost of a table without one
did not. A PLAN follow-up.

**Rejected.** Always-on breathing (a permanent 60 fps loop on a laptop that is
otherwise at zero). No breathing at all (report 13's default; the user chose the
middle path).

---

## D59 — Lands are procedural extruded rounded-rect slabs: three instanced kinds and one water shader

**2026-09-26** (M7 Tier 2, T4 — user decision 5 gave the shape; the three kinds
are T4's)

**Decision.** A land on the battlefield draws a **tile under its card**: an
`ExtrudeGeometry` rounded rectangle, bevelled, generated in code, one
`InstancedMesh` per **kind** — `plateau` (Plains, Thriving Heath), `water`
(Island, Thriving Isle; the one new shader, a `MeshBasicMaterial` patched with
`onBeforeCompile` and one constant program cache key) and `slab` (anything else,
tinted by colour identity) — plus one **rim** instance for a two-tone Thriving
land. The ladder is per-name → land subtype → default, per-name first because
both Thriving lands have the bare type line `Land`. The footprint is the rank
pitch less a 0.005-unit gutter, so a row of lands reads as a paved strip; the top face
is a constant `TILE_TOP_Y` measured from the table (terrain does not stack).
**Tapped is a pose** (the tile dims to 0.42, from `card.tapped`); the ripple and
the untap ring are cues (`land.tap`, `land.untap`, which replace `fx.ripple` on
the five land entries of `cues.json`).

**Rationale.** The user chose slabs over hex tiles. A kind is a geometry-and-
material family; a crag and a grove are **tints**, which are per-instance and
free, so report 13 §5.2's five kinds collapse to three and the probe decks'
Mountains and Forests cost no draw call of their own. Measured: **20 lands of one
kind are one draw call**, `g1.jsonl`'s 17 lands of two kinds with three duals are
**three**, and the worst case is four. `tiles.test.ts` asserts, for every one of
29,389 tile-instances, that a tile and its card agree about being tapped.

**Known cost.** Two geometry defects were invisible to every test and found by
looking (tiles under the table; `ExtrudeGeometry`'s bevel extends *beyond*
`depth`, so the tiles drew over the cards) — the fix asks the bounding box rather
than computing it. The land's *rise* was never photographed live (the live
budget snaps it; **D57**'s known cost).

**Rejected.** Hex tiles (the user). Five kinds (two draw calls for two lands not
in this deck). Reflections, render targets or a second camera for the water (the
arena has never rendered the scene twice).

---

## D60 — Mana is a mote from the tapped land to its controller's casting anchor, and `mote` is a seventh `Effect` kind with its own cap

**2026-09-26** (M7 Tier 2, T4 — user decision 9 gave the reading; the effect
kind and its budget are T4's)

**Decision.** `land.tap` emits a **mote** that rises from the tapped tile and
travels to **that land's controller's** casting anchor
(`{kind:'casting', player}`, resolved by `layout.ts` to `{x: 1.9, y: 0.75, z:
±3.6}`); `cast.rise` closes an inward ring at the caster's own anchor — the
"consumed" beat. The mana standing in a pool is a **pose** read from
`PlayerState.manaPool`. No land is ever linked to a spell. `mote` is a **seventh
`Effect` kind**, and it has its own budget, `MAX_LIVE_MOTES = 12`, beside
`MAX_LIVE_EFFECTS = 8`; `scene/effects.ts`'s fixed pool grows from 26 meshes to
**38**. The `TapEvent` carries no player, so `cues/resolve.ts` reads the
controller off the **snapshot subject** (`card.controller`, protocol §3.3).

**Rationale.** Every step is a fact the engine stated: this land tapped, it
belongs to this player, this player cast a spell. The reading — "the mana this
player made went into the spell this player cast" — is true of the game even when
a mote count is not exact, and no renderer claims a link the engine did not make.
The flight is a cue rather than a pose because **`manaPool` is non-zero in 47 of
3,679 board frames and never holds more than 2** — Forge's AI taps and spends
inside one engine step (**D56**). The mote needs its own cap because a five-land
mana ability emits five ripples *and* five motes in one step, which is 10 of 8.

**This supersedes** report 09 §12.1's "six `Effect` kinds and no others" and the
"fixed pool of 26 meshes" in CLAUDE.md's M7 convention 5 (updated with this
entry). The pool is still fixed and still allocation-free.

**Rejected.** Report 13 §5.4's literal land→spell beam as a declared heuristic
(only **234 of 414** casts share a batch with a land tap, so 43.5% of spells would
show nothing at all). Reading a mana *delta* by diffing consecutive `manaPool`s
(the thing `events` exists to avoid). Sharing the eight-slot blended cap (the
feature would have capped itself out on the day it shipped).

---

## D61 — Bloom is ON by default, lazily loaded, with a checkbox, `?bloom=0|1`, and a governor rung below the floor

**2026-09-27** (M7 Tier 2, T7 — user decision 6: "default ON if the bench stays
within budget on this machine, else default off with a toggle")

**Decision.** One full-screen bloom pass (`@react-three/postprocessing` 2.19.1 +
`postprocessing` 6.39.5, pinned exactly; threshold 0.62, above the table and the
card paint) in `scene/Post.tsx`, which is **lazily imported** — the `Post-*.js`
chunk (67.78 kB / 16.54 kB gzip) is fetched only when bloom is first on, and a
negative-controlled liveness clause keeps it that way and keeps it the only post
pass. `arena/perf.ts`'s **`BLOOM_DEFAULT` is `true`**. The toggle is a checkbox in
the cue controls (no new layer widget, no keymap row); `?bloom=0` / `?bloom=1`
set where it starts. And the DPR governor gained **a rung below its floor**: when
it wants to step down and is already at `DPR_FLOOR` (0.6), `onFloor` turns bloom
off, once per cooldown, with one `console.info`.

**Rationale.** The condition was measured, not assumed. T7 found that headless
Chromium reaches this machine's **GeForce GTX 1080** (`--use-angle=gl`;
`tools/arena-bench.mjs --gpu gl`), and on it, at `g1.jsonl` index 316 with 11
figures at render dpr 1: bloom off **p95 0.4 ms**, bloom on **p95 1.1 ms, max
18.1–19.3 ms** over four warm runs and p95 1.0 ms, max 18.2 ms cold (the
verification pass re-measured p95 0.7–0.8 ms, max ~18 ms, warm and cold) — inside
report 09 §9.4's gate (p95 ≤ 20 ms, max ≤ 50 ms). The max passed only
after `EffectPool.prime()` and the fields' `prime()` moved a lazy shader compile
from mid-game to mount (bloom's render target needs its own variant of every
material; before the fix, one frame per run landed at 52–62 ms).

The rung below the floor is because the default is wrong for a weak GPU: under
**SwiftShader** bloom is **p95 82.3 ms** at the floor, four times over the gate.
With the default on there, the governor walks down, 39–41 frames exceed 50 ms
(the last at frame 46), bloom goes off (programs 25 → 22), and a 15-second sample
containing that transition reads p95 32.4 ms because the ladder then oscillates
between 0.6 and 0.75.

**Known cost.** The GPU number is **headless Chromium on the GTX 1080 through
ANGLE-on-GL**, not a headed browser on the user's desktop compositor and not the
integrated GPU report 13 §8 was sized for; the iGPU is still unmeasured. The
**default SwiftShader bench run fails** until the governor intervenes. Bloom
raises the scene to **25 programs** against report 13 §8.2's ≤ 14 (11 with bloom
off; the difference is the composer's passes and render-target variants, paid
once at mount). And with bloom on `gl.info.render` counts only the composer's
last pass (`calls: 1`), so draw calls are read with it off.

**This amends** the M7 governor's contract (DPR only): the ladder now has one
rung that is not a resolution.

**Rejected.** Default off (the user's condition was met on the named machine).
A URL-only toggle (decision 6 asks for a toggle; the interrupted attempt had
only the flag). Bloom in the arena chunk statically (16.5 kB gzip paid by every
arena load that never turns it on). Leaving bloom on at the floor on a machine
that is still late ("degrade, don't stutter", report 09 §9.2 rule 9).

---

## D62 — The duelists are two billboard silhouette busts at the HUD anchors; rigged avatars are deferred

**2026-09-13** (M7 Tier 2 — user decision 8, given before T0; built in T7.
Recorded 2026-09-27)

**Decision.** Each seat gets a dark, unlit, billboarded **silhouette bust** at
its existing `playerAnchorFor(seat)` HUD anchor — both drawn by **one**
`InstancedMesh` from a canvas-generated texture (one draw call, where report 13
§7 budgeted two). A bust **reacts**: `bustReactionInto` reads the live effects
anchored at that player, so on `damage:player` or `life.tick` it recoils, grows
7% and takes the hit's colour for exactly as long as the cue; a `vigour` term
dims a worn-down seat, from `PlayerState.life`. The busts are **never** in the
camera solver's required set.

**Rationale.** Report 13 §7: rigged avatars stand at the table ends, which is
exactly where the frame would have to grow to include them, and they carry no
rule, no event and no piece of information; the camera already bent once
(`HAND_BAND`) to keep the viewer's hand framed. A silhouette gives
`damage:player` and `life.tick` a body to play on for zero rigs and zero clips.
The number the player reads is still the HUD's.

**Known cost.** At 1600 × 1000 the opponent's bust sits under the top-left
decision panel and cue strip and is mostly hidden, and the viewer's takes the
bottom-left corner (the verification pass, seen live and in replay). A PLAN
follow-up.

**Rejected.** Two rigged duelist avatars (Tier 2.5 at the earliest, and only
after a play-test says anyone missed them). Putting the busts in the framing
solver's required set (decoration may leave frame; the hand and the battlefield
may not).

---

## D63 — The strike reads ONE frame of look-behind: the planner is handed the previous board

**2026-09-27** (M7 Tier 2, T6)

**Decision.** `Arena.tsx`'s intake keeps the last board it saw and passes it to
`queue.enqueueBatch`; the planner's `resolved` case reads the **last** stack entry
with that source card *in the previous frame* (the stack is bottom-first,
protocol §3.3) and hands the cue its first target as numbers —
`params.strikeCard` / `strikePlayer`, plus `strikeFoe`. The spell form then
travels its tether and bursts at the target, and the target's figure takes a
`hit` or `channel` clip. A flush passes no previous frame, so it has no aim, which
is the snap a flush already is. Nothing outlives the cue built from it.

**Rationale.** `ResolvedEvent` is `{cardId, fizzled}` — no stack id, no targets —
and the item has left `state.stack` by the frame that carries the event. But an
event batch **is** the transition from the previous frame to this one, and the
previous frame said, in ids, "this spell is on top of the stack and it targets
that". Measured over the corpus: of **412** resolutions, **333** have their item
on the previous frame's stack (31 on the same frame), and **41** of those carry a
target (**7** on the same frame); the 79 with no previous item are triggers that
went on and off inside one engine step and discharge into their own card. That is
not report 13 §5.4's refused 56.5%-coverage heuristic: an untargeted spell has
nothing to strike. The targets are ids, which the redaction net passes because a
number cannot be a name.

**Known cost.** Engine order puts `attach` before `resolved` in an Aura's batch,
so the Aura snaps onto its host and *then* the bolt flies; the planner never
sorts, so this is reported rather than reordered.

**Rejected.** Aiming from the current frame (7 of 412). Discharging at the
caster's anchor only (the interrupted draft: the strike never reached a target).
Remembering targets for longer than one frame (a shadow history of the stack is a
second source of truth, **D50**'s defect).

---

## D64 — A creature that dies is SEEN dying: its body is drawn from the snapshot it dies in until its death cue ends

**2026-09-27** (M7 Tier 2, slice 2 — T8's figure track, then the slice-2
verification fix. **Supersedes D56's "was not worked around" clause** and Tier 2
follow-up 2's "not to be worked around")

**Decision.** When a figure with a model leaves the table between two frames,
`FigureLayer` builds its body at COMMIT time from the previous frame's pose
(`departedFigures`) and `DepartureField` holds it in a fixed array of
`MAX_DEPARTURES = 8` slots. On the body's first frame its fate is decided **once**
from the queue: `CueQueue.deathPending(cardId)` — a cue that `CLIP_FOR` maps to
`die` (`zone.dissolve`, `sacrifice.crush`, `zone.exile`, `isDeathCue`) targets the
card and is scheduled and not finished. A dying body is then drawn on **every**
frame until that cue has ended (`figures/clips.ts`'s `stepDeparture`, the one rule
the renderer and `clips.test.ts`'s corpus timeline both call): at its last stance
while the batch's earlier cues play, taking its own `hit` on that cue's `t`; then
the die clip takes over from whatever it was doing (the transient is held and
faded with the stance, never snapped back) and never hands back; it fades over the
death cue's last 40% and drains toward grey. It is drawn one `DEPARTURE_STEP`
(0.85) toward the table's centre line when a figure of the new frame would stand
in it (`departureStand`), because the rank closes up in the same snapshot. A
departure with no death cue — bounced, flickered, turned face down — is never
drawn. `Arena.tsx`'s batch intake is a **`useLayoutEffect`**, so the batch is in
the queue before the body's first frame.

**Rationale.** D56 said a figure outliving its frame would be "the renderer
remembering something the engine did not say". The engine does say it: the
`zone battlefield → graveyard` event is about that card, its cue already writes a
`die` request for that id, and Tier 1's own card plane is drawn by its dissolve
offset *at the battlefield* in the frame whose snapshot already has it in the
graveyard. The body is the same shape — its identity, what it decays to, is
absence — and the one thing it remembers is the previous frame's pose, the same
one frame of look-behind as **D63**. Skip, flush, a backwards scrub and a new
`gameId` end the death cue, so they end the body in the same frame with no
bookkeeping of their own; reduced motion writes no clip and stamps no cue as a
death, so the figure snaps like its stance.

**The first version blinked, and the fix is why this entry names the queue.** T8
first drew the body only while its `die` REQUEST was on the stage. The death cue
plays after the batch's damage cues, so every creature vanished when the blow
landed, took its own `hit` with no body, and popped back to fall — the
verification pass sampled 1.32 s, 0.77 s and 0.51 s of nothing on `g1.jsonl`'s
three deaths of a modelled creature, and every photograph had been taken inside
the die cue. With the queue deciding: 0 frames without a body on every rendered
frame of all three (headless Chromium on the GTX 1080, sampled after each
`gl.render`), and the corpus test walks the queue's timeline over every death:
all 17 drawn without a gap with each batch drained, and at the replay's 1× pace
15 drawn without a gap and 2 snapped by a §5.2 flush before their first frame. The
slice-2 rule, put back as a negative control, fails it on the first tick of the
first death it meets (`g1.jsonl`'s Soldier Token) and on every one after.

**Why the intake became a layout effect.** `<Canvas>` is a second React root
with its own reconciler **and its own scheduler** (react-reconciler 0.27 ships
scheduler 0.21 beside react-dom's 0.23), so a passive effect in the DOM root and
the canvas root's commit are two queues whose order is not guaranteed. A layout
effect runs inside the DOM root's commit, before anything the canvas root can do.
Nothing else in the intake cares which kind of effect it is.

**Known cost.** A body steps out of its rank the moment its neighbours close up —
the whole rank moves at once, as Tier 1's cards always have. A death snapped by a
§5.2 flush (two in the corpus at the 1× replay pace) has no body at all, exactly as
a snapped cue has no clip.

**Rejected.** Keeping the living figure one frame longer (a figure pose that is
not a function of the frame on screen). Drawing only while the `die` request is on
the stage (the blink). Holding the dying creature's slot in `layout()` (a layout
that remembers; the rank's cards would disagree with its figures). Deciding the
fate in `FigureLayer` from `state.events` (the figure layer may not import the cue
engine, and it would be a second definition of which events are deaths). A timer
for the body's life (a second clock, **D57**).

---

## D65 — The width clamp is strict for every archetype: `FIGURE_MIN_FIT` and the drone's overflow are retired

**2026-09-27** (M7 Tier 2, slice 2 — T8. **Supersedes D55's floor clause and its
"Known cost"**; closes Tier 2 follow-up 11 and the build half of 18)

**Decision.** `fitHeight(nominal, ratio) = min(nominal, FIGURE_MAX_WIDTH / ratio)`
for every model — no floor, no exemption — and `figure-pose.test.ts`'s overlap
test fails on any overlap at all. A model's width is the widest RESTING stance
(`REST_CLIP_FOR`'s `ready` and `crouch` at `REST_PHASE_FOR`, read from
`figures/clips.ts`) along the axis that becomes x after the facing turn, measured
on the skinned mesh by `tools/build-figures.mjs` in three itself.

**Rationale.** D55's floor existed because the drone measured 2.97× wider than
tall. That was the build's number, not the drone's: `getBounds()` applied the
skinned mesh's own node transform (a ×100 scale and a turn), which glTF ignores,
and slice 1's skin-aware join had carried the body's arms onto the eye's skin, so
they were drawn detached. Rebuilt, the drone is 1.66×, and the strict clamp costs
it 0.03 units of height against the old floor. Over the corpus: 7,331 neighbouring
pairs, worst overlap 0.000.

**Known cost.** The Giant-Sized Flying Ant's `scale: 1.35` is clamped to the same
0.49 as any insect — it was under the floor too.

**Rejected.** Keeping the floor for a narrower drone later (T9's task, made moot
by measuring the drone correctly). A per-archetype exemption list.

---

## D66 — A wrapped rank's back row stands ON its own card, and its disc is drawn after the cards

**2026-09-27** (M7 Tier 2, slice 2 — T8, then the verification fix for the disc.
**Supersedes report 13 §3.1's row falloff** as D55 quoted it; closes Tier 2
follow-up 3)

**Decision.** `layout.ts`'s `placeStands`: a front-row figure stands
`FIGURE_STANDOFF` off its card's front edge as before; a back-row figure stands on
its own card's centre, in the strip the front row leaves uncovered, stepping back
from the centre line by 0.05 at a time (at most six) while a front-row host's
Aura or Equipment covers the point. `Placement.stand` carries it and
`standPointOf` reads it. `FigurePose.onCard` marks a stand point inside its own
card's footprint, and `DiscField` draws those discs in a **second instanced pass
at `ON_CARD_DISC_ORDER` (70)** — above every battlefield rank's `renderOrder`
(`row × 20 + i`, `+20` hovering) and below the hand fan's 100 — sharing the first
pass's material, so it costs one draw call on a frame that wraps a rank and none
on any other.

**Rationale.** `0.52 × (1 − 0.45 × row)` put a back-row figure on the FRONT row's
cards: 216 stand points inside another card, in g3, human-auto-2026 and
human-sideboard-7 (every fixture that wraps). Now 0 — 189 on their card's centre,
11 stepped back 0.10 beside an attachment. The disc: additive, transparent,
`depthWrite: false` and drawn at `renderOrder` 5, it was painted over by its own
back-row card (`20 + i`) — at human-sideboard-7 @1181 and @1195 five discs a seat
were invisible. `figure-pose.test.ts` asserts over the corpus that every disc on a
card is flagged and ordered after every card it lies on (200 of them); the
browser shows all ten.

**Rejected.** A per-instance `renderOrder` (an `InstancedMesh` has one). Raising
the whole disc pass above the cards (the front row's discs would glow over the
edges of cards they do not stand on). The falloff with a smaller factor (any
falloff lands somewhere on the front row).

---

## D67 — The figure library carries no texture, and the build verifies its sources and records its output

**2026-09-27** (M7 Tier 2, slice 2 — T8. Closes Tier 2 follow-up 9's code half)

**Decision.** Every primitive in `figures.glb` gets one plain unlit material and
the file carries **no image and no texture** (asserted by the build); slice 1's
`palette` texture is gone. `tools/build-figures.mjs` checks every source
archive's byte count and sha256 against `tools/assets-manifest.json` before it
builds anything (a tampered file fails with both hashes and the download URL),
reads zip members itself (central directory → `inflateRawSync`, CRC-32 checked)
rather than through `unzip`, and writes the built file's bytes and sha256 into
`models.json` (`"library"`); `figures.test.ts` fails when
`web/public/models/figures.glb` is not that file (a checkout with none is still
the supported disc fallback).

**Rationale.** The runtime replaces every figure material with the holographic
`ShaderMaterial` (**D53**), which reads no texture and no UV, so a texture in the
file was bytes nobody drew. And a provenance record (**D54**) is only worth the
check that reads it: slice 1 printed hashes when a file was missing and verified
nothing. Two builds from the same four sources are byte-identical (143,920 B,
sha256 `c09ac552…`).

**Rejected.** Keeping the palette "for a future lit look" (the scene is unlit by
decision, **D53**). `unzip -p` (`[` and `]` in `…[Standard].zip` are wildcards to
it). Trusting the manifest without reading the file.

---

## D68 — One clip set for every humanoid: the pack's own clips, with the Universal Animation Library's `hit` and `die` retargeted in

**2026-09-27** (M7 Tier 2, slice 2 — T8, report 13 §9.5's experiment. Within
**D54**: CC0 only, never Mixamo)

**Decision.** The agent, the hero (`character-female-b`) and the scientist
(`character-male-e`) share Kenney's one 7-joint rig and one clip set (the build
asserts the skin). Its `hit` is the UAL's `Hit_Chest` and its `die` the UAL's
`Death01`, retargeted **offline by the build** with three's
`SkeletonUtils.retargetClip` (world-space rotation deltas from the T-pose; the
chibi's feet-level root takes the pelvis's translation only, scaled by hip height);
every other clip is the pack's own. `models.json` records which clips were
retargeted and the library's provenance (`clipLibraries.ual`, CC0), and
`clips.test.ts` pins the remaining borrowings (`block = crouch = shrink`) and
asserts `hit` and `die` share their clip with nothing.

**Rationale.** Measured, not assumed: a recoil and a death read on a head-heavy
chibi; a human idle, a punch, a landing and a crouch do not (the head block
pitches forward into a face-plant). Kenney's hand-made clips beat the library at
every one of those. The all-retargeted set is still buildable
(`--clip-source experiment`, +24 kB) so the comparison can be re-run. Clips cost no
draw calls; the price was bytes.

**Rejected.** Retargeting every clip (above). Mixamo (**D54**). Retargeting in the
browser (it would ship the library's 7.6 MB source). The library's root-motion
variant (root motion is refused, **D57**).

---

## D69 — Five camera views; the two that lose the hand are SPECTATOR-only; a seat's view must keep its own ranks uncovered by its hand

**2026-09-27** (M7 Tier 2, slice 2 — T8's camera track, then the verification
fix. Extends report 09 §8 rule 6; the evidence is
`docs/evidence/m7-tier2-slice2.md`)

**Decision.** `camera.ts`'s `VIEWS` — table, shoulder, opponent's shoulder,
side-on, low — keys `1`–`5`; the chosen view **is** `CameraDirector.home`, so a
cue's swoop leaves from it and returns to it. A view is usable at a live seat
iff `keepsSeat`: inside `ORBIT_CLAMPS`, the hand and battlefield anchors framed
(`framesSeat`), **and** (the verification fix) no point of the seat's own land
and creature rank lines, drawn `SIGHTLINE_MARGIN` (0.15) toward the seat, covered
by any card of a seven-card fan (`ranksUncovered`, conservative: a point that
projects inside a card counts as covered) — at every aspect in `LIVE_ASPECTS`.
`ViewSpec.seatSafe` is a literal that `camera.test.ts` recomputes. Table, shoulder
and low pass; the opponent's shoulder and side-on are **spectator-only**, greyed
with the reason at a live seat. **Spectator mode** (`O`: the whole azimuth, polar
6°–86°, 0.45×–1.9× distance, slower cue moves, no hand band) is on by itself in a
replay **and the moment a live game ends** (the verification fix: it used to wait
for `O`), never while a seat is live, and the flip is forgotten when the next game
starts.

**Rationale.** Rule 6 is about the player being able to act, and a view the
player chose stays on screen the whole game, so the rule is a property of the
pose, not only of a move. The first shoulder and low poses passed `framesSeat` at
every aspect while the fan covered most of the land rank: a raycast grid over a
Plains hit it 20 times in 103 from the shoulder and 8 in 109 from low (81 of 92 at
the table). With the occlusion term they were re-tuned (shoulder polar 66° → 55°,
low 74° → 59°): 41 of 96 and 34 of 86, the far two-thirds of the card; hand clicks
still reach the engine from both. A larger margin buys the rest of the card only
by lifting both views most of the way back to the table.

**The poses, as they stand** (position → target; the orbit numbers are
`orbitFromPose` of it; the change from the camera builder's first cut is the
verification fix):

| key | view | position → target | azimuth · polar · distance | live seat |
|---|---|---|---|---|
| 1 | table | report 09 §3.5's `REST_POSE`, unchanged | 0° · 38.9° · 11.95 | yes |
| 2 | shoulder | `[0.9, 5.35, 9.5] → [−0.4, 0, 2]` | 9.8° · 54.9° · 9.30 (was 10° · 66° · 10.5) | yes |
| 3 | opponent's shoulder | `[−0.9, 5.35, −9.5] → [0.4, 0, −2]`, the shoulder mirrored through the table centre | −170.2° · 54.9° · 9.30 | spectator only |
| 4 | side-on | `[−7.4, 2.05, 0.6] → [0, 0.4, 0.2]` — the graveyard end, lens a little above figure height | −86.9° · 77.4° · 7.59 | spectator only |
| 5 | low | `[3.35, 5.8, 10.1] → [0, 0.4, 1.75]` | 21.9° · 59.0° · 10.49 (was 22° · 74° · 10.5) | yes |

A view change is an ease — `VIEW_EASE_MS` 650 ms at a seat, 1,400 ms for a
spectator — and a **cut** under `prefers-reduced-motion` and on page load. A drag
is remembered per view (and per clamp box); pressing the key of the view on
screen drops it and returns to the canonical pose.

**Known cost.** "Low" is a corner now rather than a crouch — the rule costs it 15°
of polar. From the opponent's shoulder your hand is at the top of the frame, facing
away: that view was never going to be a seat's.

**Rejected.** A DOM hand strip so every view is usable live (a second card
renderer beside `CardPlane`, M7 convention 2, and a second place to click the same
card). Tilting or lowering the hand fan per view (`layout()` would take the camera
as an input, and the hit proxies would move with it). The centre lines with no
margin (a pose tuned against it cleared the land line by 0.002 of the frame and
showed half a card).

---

## D70 — The auto director: a pure `directShot`, three numbers, and combat and the outcome exempt from the cooldown

**2026-09-27** (M7 Tier 2, slice 2 — T8's camera track)

**Decision.** `6`/`0` selects the director, spectators only. `beatsOf(events,
lookup)` turns a batch into beats reading only player ids, a card's public
`controller` and the previous frame's `stack[].target*Ids` — never a name; a
combat beat cuts to side-on, a cast (or a resolution with no target) to the
caster's shoulder, a strike to the target's side, a new turn and the outcome to
the table. `directShot(beats, shot, now)` is pure, and the director is fed the
same batch the queue is, at the same moment. **The three numbers**
(`DIRECTOR`): a shot lasts at least **2,400 ms**, a view is not re-entered within
**4,800 ms** (no A → B → A), and a beat held back by either is kept **1,600 ms**
before it is dropped as stale. **Combat and the outcome are exempt from the
cooldown** (`COOLDOWN_EXEMPT`), never from the minimum shot. Cuts are cuts. Within
`userOverrideMs` (5 s) of the user's last drag — counted from when the camera stops
moving under their hand — nothing cuts and nothing waits to.

**Rationale.** The first run exempted only the outcome, and the second combat of
a turn was shot entirely from the caster's shoulder because side-on had been left
2.4 s before: the cooldown protected the viewer from the one shot they came for.
Over all 19 recordings at two paces the corpus test finds no shot under 2.4 s and
no cooldown violation in 596 cuts; with the two numbers at 0 it finds 632 and 309,
so the assertion has teeth.

**Rejected.** Easing between director shots (a cut reads as editing; an ease reads
as a camera that cannot decide). Cutting on every beat (no minimum shot). Reading
a card name to choose a shot (hard rule 8's renderer half).

---

## D71 — Rule 5 is about a live SEAT; `OrbitControls`' `change` counts only under the user's hand; the chosen view persists in this browser

**2026-09-27** (M7 Tier 2, slice 2 — T8's camera track, found while building it)

**Decision.** Three rules the camera track changed, each a behaviour a user could
see. (1) **Report 09 §8 rule 5** — the camera does not move while the engine is
waiting on the human — is applied only in live mode: `CueRunner` hands the
director `awaitingHuman` only when `mode === 'live'`, as the queue's `budgetFor`
already did. (2) **`OrbitControls`' `change` is the user's only between `start`
and `end` plus `USER_TAIL_MS` (1.5 s) of damping tail**, and never while the
director holds the camera. (3) **The camera choice is kept in `localStorage`**
under `mtg-table.arena.camera`, every access inside `try`, the table view when
nothing valid is stored; a stored spectator-only view shows the table at a live
seat and comes back when the seat is not live.

**Rationale.** (1) In a replay nobody is waiting to click; the recording's `input`
is history, and reading it dropped every camera cue on any frame whose recorded OK
was enabled. (2) `OrbitControls` fires one `change` on its first update after the
director hands the camera back (its `lastPosition` is from before the move), so
every finished move and view change registered as a drag: home re-set to itself
and cue moves dropped for five seconds — fatal for the director, which would have
held every shot for five seconds after every cut. (3) The view is a per-viewer
convenience, exactly what browser storage is for; nothing about the game is in it.

**Rejected.** Treating a replay's recorded `input` as a seat (above). Filtering
`change` by comparing poses (a real drag can move less than any threshold).
Storing the spectator toggle too (it is derived from whether a seat is live).

---

## D72 — The cue clock runs only while there is film; a late frame adds at most 100 ms; `<Canvas frameloop>` is the runner's ref, never a literal

**2026-09-27** (M7 Tier 2, slice 2 — the second verification pass's fixes; both
defects are Tier 1's, found by measuring D64's promise)

**Decision.** (1) **`CueQueue.tick(now)` does not run the virtual clock while the
queue is idle, and a batch that lands on an idle queue starts its own clock**: the
first tick after it is that batch's `t = 0`. While cues ARE running, one tick adds
at most `MAX_TICK_MS` = 100 ms of film, so a late frame resumes the film instead of
swallowing it. (2) **`<Canvas>` is rendered with `frameloop={loopRef.current}`**, a
ref `Arena.tsx` owns and `CueRunner`'s queue sync writes in the same statement
pair as `setFrameloop`; no `frameloop` prop anywhere in the arena is a literal, and
nothing but that sync calls `setFrameloop` (`liveness.test.ts` holds all three).

**Rationale.** (1) `frameloop="demand"` parks the loop whenever the queue drains
and nothing hovers, so the next tick arrives after the whole idle gap — and `tick`
added that gap to the cue clock, so the next batch's first frame jumped past its
own start: the damage `hit`, the death cue and D64's departing body were consumed
before a frame was drawn. Measured in headless Chromium on the GTX 1080:
`human-auto-7` 794→795 stepped after a 3 s pause drew its two dying bodies on
**0** frames with the old clock and on **86 of 89** with this one — the same as
after a 30 ms pause. D64's "a creature that dies is seen dying" had been true only
on tables that keep rendering (something hovering). (2) fiber 8.18's `configure`
runs on every render of `<Canvas>` and does `if (state.frameloop !== frameloop)
state.setFrameloop(frameloop)` against the PROP, so the literal reverted the
runner's `always` whenever a hint, a same-view key press or a greyed switcher click
re-rendered `Arena` mid-batch: `human-auto-42`@717 with `1` pressed 120 ms into the
batch drew 11 frames in 3.5 s with six cues still queued; with the ref, 88 — the
same as with no press.

**Rejected.** *The clamp alone* (the verifier's second option): after every pause
it would still eat the first 100 ms of the next batch — at the live budget that is
a whole compressed `tap` and most of a `hit`. *The loop mode as React state in
`Arena`*: a re-render of the whole scene graph on every drain, set from the frame
loop (§9.2 rule 7). *A dependency-free layout effect in `CueRunner` re-asserting the
mode*: it works only if the canvas root re-renders after every `configure`, which
is an ordering across two reconcilers with two schedulers — exactly the kind of
ordering D64's intake had to make mechanical rather than trust.

---

## D73 — The hero is Kenney's `character-female-b` and the scientist `character-male-e`, chosen by silhouette, because the hologram keeps only geometry

**2026-09-27** (M7 Tier 2, slice 2 — T8's figure track; recorded by the slice's
documentation pass. Replaces slice 1's "hero and scientist are the agent mesh in
gold and lab-green"; within **D53** and **D54**, and the rig and clips are **D68**'s)

**Decision.** Three humanoid bodies from the one CC0 kit, *Mini Characters* 1.0:
the **agent** stays `character-male-a`; the **hero** (`creature/subtype:hero` —
Wasp; the Hero token and Ant-Man by their per-card entries in `figures.json`) is
**`character-female-b`**; the **scientist** (`creature/subtype:scientist` — Bold
Biochemist, A.I.M. Scientists) is **`character-male-e`**. The Soldier token keeps
the agent body in its token grey; the Hero token takes the hero body in a paler
token gold, so a token and Wasp read as the same kind of thing and not the same
card. The rungs are unchanged — subtype before colour — and the census
`figures.test.ts` prints every run carries both as models of their own (hero 722
frame-instances, scientist 717).

**Rationale.** The holographic material throws texture and vertex colour away
(**D53**; the library carries none at all since **D67**), so **only geometry can
tell two bodies apart** — and the table camera sees the viewer's own figures from
behind and the opponent's from the front, so the outline of the head is what
reads. All twelve bodies of the kit were rendered side by side under the shader,
from the front, from behind, from the side and from the table's angle
(`var/shots-t8/kenney-*.png`, local): `female-b`'s two round buns are the most
distinct outline in the kit **from every side**, and `male-e`'s round glasses and
shirt-and-tie front are the one body that reads as a scientist face-on. All
twelve share one rig exactly (joint names and bind transforms, measured), which
is what lets the three share one clip set, and the build asserts the skin. Cost:
742 and 710 triangles against the agent's 723, one draw call each; the library is
143,920 bytes for five models.

**Known cost.** **From behind, the scientist has the agent's outline** — on the
viewer's own side the braces and the lab tint tell them apart, not the shape;
face-on, the glasses do. `g1.jsonl` never has a scientist on the battlefield, so
the three bodies together were photographed at `g2.jsonl` @200, not at T7's bench
frame.

**Rejected.** Three tints of one body (slice 1's stand-in: one outline in three
colours, which the hologram reduces to one colour ramp). Choosing by face or
costume detail (the shader discards it). The kit's other ten bodies (rendered and
compared; none has an outline as distinct as the buns, and none other reads as a
scientist). A body used by exactly one card (Tier 3's seam, report 13 §12).

---

## D74 — The camera keys are three rows of the one keymap; on the board they are `inert`, with a reason

**2026-09-27** (M7 Tier 2, slice 2 — T8's camera track; recorded by the slice's
documentation pass. Extends M4 convention 4 and **D49**)

**Decision.** `web/src/keys.ts` grows from twenty rows to **twenty-three**:
`cameraView` (`1 2 3 4 5`), `cameraDirector` (`6` or `0`) and `toggleSpectator` (`O`),
so the `?`/`H` overlay lists them from the same table the handler reads. Their
plans (`camera`, `spectator`) are local and send nothing, so they plan in the
arena on a replay and behind an open `ask`; a focused text field keeps its
digits (an ask that takes a number types into one), and `Ctrl`/`Alt` + digit are left
to the browser (`Ctrl+1` is its first tab). `keys.ts` is on the 2D
path and may not import `arena/` (**D49**), so it spells the view ids out as
`CAMERA_KEYS`, and `keys.test.ts` asserts the two maps agree key for key and that
`keys.ts` imports nothing from `arena/`. The arena opts in with
`KeyContext.arena`; **on the board every camera row plans an `inert`** whose
reason names `V` ("picks the 3D arena's camera — the board has no camera; press
V"). Whether a view is usable at a live seat is `camera.ts`'s to say
(`seatSafe`, **D69**), and the overlay's "3 and 4 are for spectating" sentence is
held to it by a test.

**Rationale.** Adding a key is a row, never a branch in a handler (M4 convention
4). `Board.tsx`'s view switch ends in a silent `default:` after
`preventDefault()`, so a camera key planned as a `view` on the board would be
swallowed with no feedback — M4 convention 4's swallowed-key defect exactly. And
a camera key answers nothing, so there is no reason to gate it behind an `ask`
the way an act is gated.

**Known cost.** The board's inert flash is drawn by `DecisionPanel` only inside
its `input !== null` branch, so on a recording with no `input` frame (`g1.jsonl`)
**no** inert key flashes at all — pre-existing, and not a keymap defect; on
`human-auto-42` the camera keys' flash shows.

**Rejected.** A digit handler of the arena's own (a second keymap). Importing
`VIEWS` into `keys.ts` (it would pull `arena/` into the 2D entry chunk, **D49**).
Leaving the rows unbound on the board (a key the overlay lists that does
nothing and says nothing).

---

## D75 — Identity is DATA: a per-card traits file and a shared kit of procedural props, one draw call per KIND

**2026-09-27** (M7 Tier 2, slice 3 — T9/T10's identity track; recorded by the
slice's verification-fix and documentation pass. Within **D53**, **D54** and **D56**)

**Decision.** What makes a card read as ITSELF — size, hover, colour, what it
carries — is `web/src/arena/figures/traits.json`, validated by
`figures/validate.ts`'s `validateTraits` exactly as `cues.json` is (closed keys,
ranges, a bad row dropped and the ladder falling through), beside `figures.json`,
which still says only which BODY a card stands in. The ladder is `default ⊕ every
matching subtype rung, least specific first ⊕ the card's row`; scalars take the
most specific rung, `props` is replaced, never appended. A row names props from
`figures/props.ts`'s **closed kit** — seventeen nameable kinds since the
verification pass (`wings`, `helmet`, `hood`, `jetpack`, `exhaust`, `laserEye`,
`pistol`, `muzzle`, `coat`, `eyepatch`, `badge`, `tie`, `gauntlets`, `shield`,
`hat`, `rider`, `labBench`) and three derived ones (`squad`, `swarmBee`,
`carrier`) — each a **procedural primitive**, anchored per body family on a
joint's base name (the Kenney rig's seven), `root` or `stand`, in figure space.
`scene/props.ts` draws **one `InstancedMesh` per kind**, all one shader program,
so the field's cost is the number of kinds on the table, never the number of
figures. Every kind is open to every row: Bold Biochemist's white lab coat is
Fury's `coat` kind in another colour. A trait is a pose (the snapshot says the
card is face up on the battlefield), so it survives `skip all`, a scrub and a
`resync`; a card drawn as a back never reaches the file (hard rule 8).

**Rationale.** The user's verdict on slice 2 was "everything still looks very
generic": five bodies in a colour. Per-card MODELS are Tier 3 (report 13 §12), and
a model per card is the seam Tier 2 must not cross; a small kit of shared props,
chosen by data, gives every deck card a silhouette of its own at a cost the budget
can carry — measured at `g1`@355, bloom off: 77 calls, 27,474 triangles, 12
programs, of which the prop field is 8 kinds and 3,062 triangles (report 13 §8.2's
≤ 90 and ≤ 30,000). No asset was added: nothing in `tools/assets-manifest.json`,
`NOTICE` or `figures.glb` moved.

**Known cost.** Readability at the table view is a matter of SIZE, and slice 3's
first props were measured too small by the verification pass (Agent 13's pistol
invisible, Coulson's badge a 1–2 px glint, Fury's patch a dot, Peggy's roundel
hidden side-on): the fix enlarged them and added `muzzle`, `tie` and `hat`. Your
own figures face you (**D81**), so front props read on your side and back props
(the coat, the jetpack) on the other.

**Rejected.** A model per card (Tier 3). A glTF prop pack merged into
`figures.glb` (no prop needed a mesh the kit could not build, and a pack is a new
provenance to carry). Props keyed off events (a pose that vanishes on a skip).
Appending `props` down the ladder (a rung could then never take a prop away).

---

## D76 — The giant is giant because it flies side-on: D65 stays strict

**2026-09-27** (M7 Tier 2, slice 3 — T9; closes slice 2 follow-up 3. Within **D65**)

**Decision.** `traits.json` flies the Giant-Sized Flying Ant turned 90° (`turn`),
and declares its turned footprint (`turnedRatio` 0.83), so the strict width clamp
measures its body's LENGTH along the rank rather than its wingspan: at
`scale: 1.35` it clamps to **0.867** tall against 0.490 facing, inside the same
0.720 slot. `traits.test.ts` loads the committed `figures.glb` in Node, poses the
insect in its resting stances as `build-figures.mjs` measures width, and fails if
the declaration is below the measured 0.783 or more than 0.1 above it. A swarm is
clamped by its whole ring (`swarmSpan`) and a squad by its whole rank.

**Rationale.** D65 rejected exemptions for a reason — the overlap sweep's 0.000 is
what keeps a rank readable — and a different ORIENTATION is not an exemption: the
clamp still holds the drawn footprint to one slot.

**Rejected.** An exemption from the clamp, or a wider slot for one card (a
`layout.ts` rule keyed to a name).

---

## D77 — A Vehicle is a carrier SILHOUETTE overhead, crewed or not, flying high enough to cover no figure from the table view

**2026-09-27** (M7 Tier 2, slice 3 — T10; the altitude and length from its
verification pass. Closes the manifest's `_deferred.carrier`)

**Decision.** The `subtype:vehicle` trait rung (an ARCHETYPE, so no model belongs
to one card) draws a Vehicle as a procedural carrier — hull, flight deck with
runway lights, island, four rotor pods, 456 triangles, one draw call — posed at
its stand point lifted by the rung's `hover` (1.25) on top of the card's own
`presence` hover, never below `layout.ts`'s **`SILHOUETTE_ALTITUDE` (2.05)**, and
`CARRIER_LENGTH` **1.5** long. It is posed **crewed or not**: 613 of the corpus's
728 Helicarrier frame-instances are an uncrewed `Artifact - Vehicle`, and the
snapshot says it is on the battlefield either way — so figures are no longer only
creatures and ghosts (`vehicle: true`, `modelId: null`, no disc, no props; 599
such poses). No stand disc under a silhouette.

**Rationale.** A CC0 vehicle mesh was never chosen, and a primitive carrier reads
as the Helicarrier at table distance. The verification pass found the first
numbers (1.65, 1.85 long) put its rotor pods on the heads of the figures below it
from the table view (`g1`@323: on Wasp; 352 of 799 own-seat pairs overlapped on
screen by more than 5%). A grid of altitude, inboard shift and scale was measured
through every view's camera: raising it 0.4 and shortening it 20% takes the
table-view overlap to **0.000 on both seats**, and `figure-pose.test.ts` now
projects every carrier and figure through the table camera and asserts it
(negative-controlled with the old numbers: 0.569).

**Known cost.** From the two over-the-shoulder views a carrier over YOUR rank still
projects onto the FAR rank (342 of 621 pairs in the shoulder view, as before the
fix): an aircraft between you and the far side of a table does that in
perspective, and no single position satisfies the table view and the shoulder
views at once (moving it inboard fixes the shoulder and breaks the table). The
hull is translucent.

**Rejected.** A seat-dependent inboard shift (it moves the conflict to the other
view). A card-row silhouette for the Helicarrier alone (a model per card). Drawing
it only while crewed (the snapshot says it is there either way).

---

## D78 — The prop field is bound through `DiscField.bind`, committed once per snapshot, and rides the dying bodies too

**2026-09-27** (M7 Tier 2, slice 3 — the identity track's frame-loop seam; the
departing bodies and the reduced-motion subscription from its verification pass.
Within **D57**, **D58** and **D64**)

**Decision.** `scene/props.ts`'s `PropField` is built and installed by
`FigureLayer` only, **committed** there in a layout effect once per snapshot
(after every `<Figure>` below has registered its rig, and after the departures'
effect has added this snapshot's dying bodies), and **bound** from
`DiscField.bind` — the seam **D64**'s bodies already use, after `applyFigures` has
posed every rig — so from `CueRunner`'s one `useFrame`, without touching it. The
frame-loop body walks a fixed array of 192 preallocated bindings by index and
allocates nothing (liveness reads it, junk lines spliced in). A joint prop is
re-expressed in its joint's bind frame at load, so it follows whatever the clip
lane does to that joint; a `root` prop follows `pose ⊕ offset`; a `stand` prop
ignores the offset. **A dying figure keeps its props**: `DepartureField.bodies()`
is a second input to `commit`, its joint props ride the body's own joints, its
other props its root, all fading with its material and drawn only while the body
is. The field **follows** `prefers-reduced-motion` (a `matchMedia` change
listener, dropped in `dispose`), rather than reading it once at construction.

**Rationale.** One frame loop (M7 convention 5). A slice-3 field that read the
reduced-motion query once kept the wing flutter and the ring's turn for a user who
turned it on mid-game, and a Doombot fell without its eye because the departing
body was a clone the field never bound (both the verification pass).

**Rejected.** A `useFrame` of the field's own. Mixers for the baked kinds (the
rider and squad followers are sampled track by track at load, because the arena's
mixers are ticked in exactly two files).

---

## D79 — T11's beats are drawn ON the body (the `figure` anchor), their params are a closed table, and one card's cast and resolved play once

**2026-09-27** (M7 Tier 2, slice 3 — T11's cue track; recorded by the slice's
verification-fix and documentation pass. Within **D50** and **D51**)

**Decision.** Three rules. **The `figure` anchor** (`cues/stage.ts`):
`{kind: 'figure', id, at, fwd?, side?}`, a point on a card's BODY in figure
heights, resolved only by the effect binding (`scene/effects.ts`'s
`#figurePoint`) against the frame's poses, each card's live offset and the
presence bob, and through `layout.ts`'s `figurePointInto` since the verification
pass (**D81**); `layout.ts`'s `anchorPosition` answers `null` for it, so the camera
can never be handed one; a creature that died in the snapshot resolves to its
departing body's stand. **Every cue param is closed, typed and ranged**
(`cues/validate.ts`'s `PARAM_SPECS`): a name outside the table is an error, and so
is an event fact (`beamTo`, `strikeCard`, `defenderId`, `foe`) — a cue file that
set one would be inventing an aim. The verification pass added one param,
`attack.jet`'s `eye` (default `true`): Wasp and the giant ant fly on the jet's
lunge without the Doombot's robot eye. **Suppression rule 7** (`cues/queue.ts`): a
card whose `cast` and `resolved` name the same cue in one batch plays it once — the
aimed one, else the first (`g1.jsonl` frame 139 otherwise lifted Web Up twice). The
effect pool grew once, **38 → 45** slots (glow 8, ring 8, beam 5, particles 3,
text 6, plate 3, mote 12); `MAX_LIVE_EFFECTS` did not move.

**Rationale.** Every Tier 1 effect sat at a card's REST position, which stays
behind while the lunge carries the body into the lane. A param that is only
type-checked as a primitive passes a typo and looks like it worked — the
unknown-FIELD rule one level down.

**Rejected.** Resolving the figure anchor in `layout.ts` (it has no offsets and no
poses; the director would then frame a body mid-lunge). An open param bag.

---

## D80 — T12's looks are poses; the deck's three attachment rows are committed; a station stands in its own rank slot

**2026-09-27** (M7 Tier 2, slice 3 — T12; the rows and the stations' placement
from its verification pass. Within **D56**)

**Decision.** `figures.json`'s `attachments` block carries per-name rows for every
attachment the deck plays: Quantum Reduction `shrink` (T5), and — committed by the
verification pass — **Super Suit `shell`**, **S.H.I.E.L.D. Spy Kit `glints`**,
**Robotics Mastery `circuit`**. `scene/overlays.ts` draws each look as one
instanced mesh per KIND, keeps the halo ring at the host's feet, and gives an
anonymous host the ring and nothing else. Over the corpus: **944 shrink · 409
shell · 362 glints · 315 circuit**, nothing of this deck on the halo.
`subtype:aura` / `subtype:equipment` stay the halo for any other card. The
**stations** (`cues.json`'s per-card `station`, `figures/attach.ts`'s
`stationsOf`) — Strategic Intervention's ops console, Web Up's cocoon — are a pose
of the card being face up on the battlefield, and since the verification pass each
**stands in its own rank slot**: at the slot's stand point (where a creature's
figure would stand), figure-sized (`STATION_SIZE`, never wider than
`FIGURE_MAX_WIDTH`), `STATION_LIFT` 0.3 / 0.4.

**Rationale.** Slice 3's cue track built the looks but could not commit the rows
(they live in the identity track's file, and its test pinned the old rungs), so
real games drew the plain halo. The first stations hung 1.1 wide, 0.85 above the
CARD, and from the table view's steep camera the console covered the figures
standing in front of the neighbouring cards (`g2`@224: your Ant-Man).
`attach.test.ts` now projects every station and figure through the table camera and
asserts a cover under 5% (measured 0.004; 0.564 with the old placement).

**Rejected.** A cocoon on the exile pile (the wire never relates Web Up to what it
exiled, measured over the whole corpus). A DOM widget for the console (it would
be a click target and a second renderer). Keeping the rows out of `figures.json`
and laying them over in a test (the test passed while the game drew the halo).

---

## D81 — One definition of a figure's FRONT; your figures face you, and that is the user's call

**2026-09-27** (M7 Tier 2, slice 3 — its verification pass's major finding.
Supersedes the "it faces the other seat" comments of report 13 §3.1 and slice 1)

**Decision.** Figure space's front is **+Z** — `layout.ts`'s `FIGURE_FRONT_Z`,
because `scene/models.ts` turns every model's face to +Z and `figures/props.ts`
writes every anchor in that space (measured on `figures.glb`: 69 of the agent's
127 eye-band vertices sit within 0.03 of z = +0.25, 8 near the back). The pose
turns a body by `facingY`; `layout.ts`'s `seatFacingY` is the one statement of it
(`0` for you, `π` for the opponent), and `figurePointInto` / `figureAnchorOf` are
the one resolution of a beat's `fwd` / `side` (right = front × up, −X for a figure
facing +Z). The effect binding's `figure` anchor had resolved `fwd` along
−(sin, cos): every beat meant for a body's front landed behind it — the Doombot's
exhaust streamed out of its face while its flame prop burned behind it (`g1`@231→232,
photographed from both sides). Agent 13's muzzle flash is now placed ON her
pistol's lit tip through `figureAnchorOf(PISTOL_MUZZLE)`. `web/test/facing.test.ts`
resolves the jet's eye and exhaust, the muzzle and the badge flash against the
props they are about, for both seats, and carries its own negative control (the
old resolution fails every case).

**Not changed, and why.** With fronts at +Z and `seatFacingY('you') === 0`, **your
figures face YOUR camera and the opponent's face away** — both sides face outward,
away from the combat lanes. That is why a badge, an eyepatch, a pistol and a laser
eye read on your side and a coat or a jetpack on the other; it is also why an
attacking figure lunges toward the opponent BACK first (the Doombot's exhaust leads
its lunge and its laser leaves its eye on the far side and crosses its own body),
and Agent 13's `pistolDraw` aims at you. Turning every figure to face the other seat
is one line (`seatFacingY`), and every prop and every T11 anchor follows it through
the definitions above — but it changes what the whole table looks like, so it is
**question 13** in PLAN.md's *Only the user can decide*, not a fix.

**Rejected.** Flipping the prop kit's anchors to match the cue track (the cue track
was the one that did not match the models). A second, local "front" in either file.

---

## D82 — An attack turns its attacker to FACE its defender: `dRotY`, the figure's own vocabulary, asked of `layout.ts`

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass. Within **D50**
and **D81**; question 13 stays open)

**Decision.** `Offset` gains **`dRotY`**, a turn about y added to a FIGURE's facing
(`CueRunner.applyFigures`, the prop field's root props, the effect binding's
`figure` anchor) — the figure's vocabulary exactly as `dRotZ` is the card's: a card
ignores it, a figure ignores `dRotZ`. `Stage` gains a second geometry query,
**`yawTo(cardId, anchor)`**: the turn that brings the card's figure, standing at
its stand point and facing the way its seat's figures stand, round to face the
anchor (`layout.ts`'s `figureYawTo` / `yawToward`, the short way, in (−π, π]); a
`NullStage` answers 0. Every lunging attack — `attack.lunge`, `attack.jet`,
`attack.aegis`, `attack.shrink` and Fury's `fx.agents` with `lunge` — writes
`dRotY = yawTo(id, defender) × k`, where the defender is the `attackers` band's
own `defenderKind` / `defenderId` (else the attacker's own combat lane), and `k` is
the lunge's envelope: 0 at the start and the end, so the turn decays to identity
(D50). A trait's `turn` (the side-on giant ant) is not taken out: a side-on flier
stays side-on to its target.

**Rationale.** Slice 3's front-anchored beats — Agent 13's muzzle flash, the
Doombot's eye and laser — shipped firing out of the far side of the body, because
both seats' figures rest facing OUTWARD (D81). Question 13 (which way figures rest)
is the user's; which way an attacker faces while it attacks is not a question, it
is what the beat says. `facing.test.ts` runs the real cues against a `SceneStage`
over a two-seat board, for both seats: at the flash and the laser peak the beat's
point is on the defender's side of the lunged body and the body's front is within
10° of the line to its defender (6° measured, from the lunged position); the turn
is 0 at t = 0 and t = 1; and the negative control — no turn — faces every attacker
away from its defender.

**Rejected.** Flipping `seatFacingY` (question 13, the user's). A cue computing a
yaw from coordinates it was never given (D50, report 09 §8 rule 3). A turn keyed
off a card name.

---

## D83 — Identity reads from BOTH seats and from above, and that is a number: `traits.test.ts` rasterises every deck card's props

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass. Extends **D75**)

**Decision.** `web/test/prop-raster.ts` (test support, not a test) is a small
software rasteriser over the REAL figure pipeline: `figures.glb` parsed by three's
`GLTFLoader` in Node and indexed by `scene/models.ts`'s own `indexLibrary` (now
exported), the bodies in their resting clip, the props read back out of a real
`PropField`, every triangle projected through the table view's camera into a depth
buffer at 1600 × 1000. `traits.test.ts` poses every deck card alone and at the end
of a five-card rank, standing and kneeling, on BOTH seats, and requires every
identity prop to put **≥ 48 px** (about 7 × 7) on screen — except the three that
sit on one side of a body by nature (`tie`, `laserEye`, `exhaust`), which must
show on their own side at half the bar while a named partner (`badge`, `visor`)
carries the card at the full bar on the other. The negative control: Coulson's
chest badge alone, from the opponent's seat, is 0 px.

To pass it: the **badge** kind has a second anchor, a larger emblem between the
shoulder blades, and the chest badge sits lower, out from under the chibi's chin;
the **pistol** moved from the chest to her right hip, out beside the body and 49°
out from straight ahead (0.32), so it shows in silhouette from the front, the back
and side-on; a new shared kind, **`visor`** — a robot's eye as a lit band round its
head — gives the Doombot (and the Robot token, through the robot rung) its red from
behind; **Nick Fury** is a slate body (`#566076`) in a nearly opaque black coat
(`#15181e`, a new `CLOTH` look lit only at its silhouette) flared wider than his
head, with trim ×30 of the coat's colour down its front, round a stand-up collar
and its hem, and a big black patch with a thin pale rim and a black strap running
DIAGONALLY up across his forehead (a level strap read as sunglasses); the **tie**
runs to the belt, tilted to the camera.

**Rationale.** Both earlier passes judged the props on the viewer's own figures,
and the opponent's figures show the table view their backs (D81): on half the
table Coulson and Agent 13 were a colour. A photograph cannot be a regression
test; a raster of the real meshes can. Fury is slate and not black because a
hologram is translucent (`holoMaterial`'s core alpha 0.38) — a black body over a
bright card reads grey, and the black patch and strap need a head to be darker
than.

**Rejected.** A second figure per seat facing the camera. Props on the back only
(the viewer's own figures face the camera). An absolute contrast test (the raster
counts pixels, not contrast; the evidence still photographs at 1×).

---

## D84 — The Agents are a WEDGE clamped into one slot, and "three heads side by side" is the test

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass. Within **D65**)

**Decision.** A `squad` formation stands its followers one each side and a step
back — `SQUAD_OFFSET_X` **0.46**, `SQUAD_OFFSET_Z` **−0.2**, at **0.78** of the
leader — and the strict width clamp shrinks the whole squad to fit its one rank
slot (0.396 tall against a lone agent's 0.626). The squad wears a steel blue of its
own (`#6c86c0`). `traits.test.ts` rasterises the three heads from the table view on
both seats, standing and kneeling, centre and edge: each head shows ≥ 150 px, and
every pair of head centres is ≥ 15 px apart ACROSS the screen and further across
than up it (two heads one above the other are one agent with a doubled outline from
that camera). Measured: 18.4–22.9 px; slice 3's first formation (0.16 aside, 0.32
behind, 0.8) fails in all 8 cases — its followers projected just above or below
the leader.

**Rejected.** An exemption from the clamp so the squad could be full size. A
shoulder-to-shoulder row (the heads overlap more, and the wedge's depth separates
them on screen).

---

## D85 — The OPPONENT's carrier flies over the centre line, low and a fifth smaller; the HUD is a keep-out band

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass. Amends **D77**
for the opponent's seat; yours is unchanged)

**Decision.** `layout.ts`'s `silhouettePlacementOf` places a vehicle's silhouette:
YOUR carrier over your own rank at least `SILHOUETTE_ALTITUDE` (2.05) up, as D77;
the OPPONENT's at its card's x over the table's centre line (`OPP_SILHOUETTE_Z`
0.25) at `OPP_SILHOUETTE_ALTITUDE` **0.8**, `OPP_SILHOUETTE_SCALE` **0.8**. The
arena's chrome over the top of the canvas — the decision bar, the cue and camera
strips, the credit line and the opponent's seat card — is `HUD_TOP_PX` **128**
CSS pixels, fixed, measured at five window sizes; `figure-pose.test.ts` holds every
carrier's projected top under that band at every live aspect on a 745 px and a
946 px canvas (measured: NDC 0.353 against a band from 0.656), with the old
placement as the control (1.058 — above the canvas top).

**Rationale.** From the table view the opponent's whole side is packed between the
chrome and the middle of the screen — its land rank starts about 15 px under the
credit line at 1600 × 1000 — so a carrier over the opponent's rank is either under
the HUD (as it was, "half hidden behind the camera strip and the attribution
line") or over the opponent's own figures. A grid of altitude, inboard shift and
scale over the corpus found no place over that half satisfying both; the middle
band does, with no cover of any figure from the table view (5,103 pairs, 0.000).

**Known cost.** From the two over-the-shoulder views (2, 5) the centre-line carrier
projects onto the far rank (the cost D77 already accepted for your own carrier
there), and where BOTH seats have a carrier at overlapping x (mirror games — g1@316)
the two hulls overlap on screen like a formation. PLAN.md's slice-3 follow-ups carry
both.

**Rejected.** Lowering and moving it inboard over the opponent's half (it covers
the opponent's figures). A carrier that depends on the camera view (a pose is a
function of the snapshot). Shrinking the HUD (the strips are the controls).

---

## D86 — An attachment lies UNDER its host: the click order is the drawing order

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass; a Tier 1
layout defect found live. Amendment **M8** unchanged)

**Decision.** `layout.ts`'s `ATTACH_DY` is **−0.002** (it was +0.002). An Aura or
Equipment was drawn behind its host by `renderOrder` but lay 2 mm ABOVE it, so its
click proxy — 10% larger than the card — was the nearer hit over most of the host:
live, seed 11, view 2, a click on Peggy Carter under the opponent's Quantum
Reduction answered "Not selectable: card 45", and she could be declared an attacker
only through Alpha Strike. `attach.test.ts` builds `HitProxy`'s exact planes for
every eighth corpus frame and raycasts with three's own `Raycaster` from the three
seat-safe views: **765 of 765** host-centre clicks hit the host (with the old
height, 765 of 765 missed), and 761 of 765 attachments keep a strip of their own —
the other 4 lie wholly under their host and a wrapped rank's back row in one
crowded `g3` board, where they are not drawn either. In the browser, raycasting the
real scene's proxies at every host's centre at `g1`@250, @355 and `g3`@200 in views
1, 2 and 5 hits the host every time.

**Rejected.** Routing a click on an attachment the engine did not name to its host
— that is gating a click on `selectable` (M8). A larger fan offset for the second
attachment on a host (measured: it moved the second one under a neighbour instead).

---

## D87 — Four quiet beats made to read at table distance, and the camera kept out of the one that tried it

**2026-09-27** (M7 Tier 2, slice 3 — its second verification pass. Within **D79**)

**Decision.** Peggy's `attack.aegis` takes two new closed params, **`rim`** and
**`rim2`** (colours, `PARAM_SPECS`): her bubble is her shield's blue and the rings
at her feet its red and white, because a white-gold bubble merged with the white
armour shell Super Suit leaves on her as a pose (`g1`@142). Helicarrier Strike's
resolution beam is twice as thick (0.10–0.18) and a star flashes on the body as it
lands (`g3`@116: the thin beam came down behind the giant ant unseen). The Air
Force's sweep cloud is 60% wider and carries a bright `mote` core along its arc
(`g2`@219: a faint dust), which costs the mote bucket, not the eight-slot cap. The
Power-up's cards are card-sized lights that appear over the scientist's head and
hold there for a beat before they fly toward a hand that is off the top of the
table view for the opponent (`g2`@163) — a light leaving the figure's chest starts
inside the body, which hides it.

**Rejected.** A camera excursion on the strike: tried, and taken out — the struck
card is usually in the graveyard by the snapshot the resolution arrives in, and a
camera frames CARDS, so it swung away to the graveyard. Hard-coding the aegis's
red, white and blue in the registry (colours are data).

---

## D88 — A swarm is its members and a squad is its followers: instanced copies of ONE kind round one rig, clamped as a whole

**2026-09-27** (M7 Tier 2, slice 3 — T9's swarm and the Agents' squad, as built by
the identity track and reshaped by the second verification pass; written up by the
slice's documentation pass. Within **D65**, **D75** and **D84**)

**Decision.** A card that is several bodies is still ONE figure pose — one rig, one
stand point, one clip lane — plus members the prop field draws as instances of a
single derived kind, so a swarm costs one draw call whatever its count.
`traits.json`'s `swarm` is the member count and `formation` their arrangement:

- **`ring`** (Ant-Man's Air Force, `swarm: 5`): five small **procedural** bees
  (`swarmBee`, built to exactly `SWARM_BEE_RATIO` 1.4 wide) evenly round the stand
  point at `RING_RADIUS` 0.42, stepped in height so they read as a cloud, the ring
  turning slowly only while frames are drawn and never under reduced motion. The
  card's insect rig **still stands at the centre and is not drawn**
  (`FigureLayer` hides its meshes), so the clip lane, the `figure` anchor and the
  director have the one body they already know how to address.
- **`squad`** (Agents of S.H.I.E.L.D., `swarm: 2`): the leader is the card's own
  rig; the followers are the `squad` kind — the same humanoid body **baked once at
  load** from `figures.glb`, frozen in its idle — in **D84**'s wedge, riding the
  leader's root, so the squad steps forward together on the leader's lunge and
  falls with it.

The width clamp (**D65**, strict) measures the WHOLE formation (`swarmSpan`): the
Air Force stands 0.504 tall, each bee 0.21; the squad 0.396 against a lone agent's
0.626. `swarmMembers` / `swarmSpan` are pure (`figures/props.ts`, `[NO three]`), so
`traits.test.ts` holds the procedural bee to its declared ratio and the clamp to
the corpus without a browser. An anonymous (face-down) card never has a swarm
(hard rule 8, asserted over 1,179 corpus instances).

**Rationale.** The user asked for the Air Force as a swarm of bees rather than one,
and the Agents as a squad. Slice 2's hand-over had pencilled the swarm in as "a
small swarm of the insect" — copies of the model; slice 3 drew procedural bees round
one hidden rig instead, and the cost is why that stands: five copies of the insect
would be five skinned rigs, five mixers for the one frame loop to tick, five draw
calls and five of `MAX_FIGURES`' twelve modelled creatures spent on one card — and
five bodies for the cue layer to choose between, when the engine only ever names
one card. Members as
instances of one kind keep the prop field's rule: cost bounded by the number of
KINDS on the table, never the number of figures (**D75**). Baking the followers
rather than animating them follows **D78**: the arena's mixers are ticked in
exactly two files.

**Known cost.** The members do not play clips: a squad follower is frozen in its
idle while its leader shoots or kneels, and the bees only ring-turn and ride the
lunge. **A dying Air Force is not seen dying**: its body is never drawn, so
`FigureLayer` collects no departing body for a ring swarm and the prop field binds
no bees to one — it leaves the table with its snapshot, the one exception to
**D64** (a beat aimed at it, such as Helicarrier Strike's beam at `g3`@116, still
lands where it stood, through the `figure` anchor's departure stand). A squad's
followers do fall with their leader.

**Rejected.** One figure per member (above). An exemption from the clamp for a
formation (**D65**, **D84**).

---

## D89 — Quake's shockwave is keyed off her trigger RESOLVING, aimed only by the stack; no tap is ever paired to her

**2026-09-27** (M7 Tier 2, slice 3 — T11's cue track; written up by the slice's
documentation pass. Supersedes Tier 1's `tap:on` substitute in
`docs/ideas/arena-mode.md`'s *Which rows Tier 1 implements*. Within **D51** and
**D63**)

**Decision.** `cues.json`'s Quake row moved from her own `tap:on` to **`resolved`**
— the event that IS her trigger going off. `fx.shockwave` leaves two cyan rings
from HER feet; with `fissure`, a crack runs across the table to what the trigger
was aimed at, read from the **previous frame's stack** (T6's `strikeCard`, **D63**'s
one frame of look-behind), a ring bursts at the target's feet and it plays `hit`;
the bounded camera shake frames both cards. When the trigger went on and off the
stack inside one snapshot there is no aim on the wire, and the shockwave is hers
alone. The census prints it every run: **13 resolutions, 4 aimed**.

**Rationale.** The idea table's beat is "a shockwave when her trigger taps a
creature or land". Tier 1 could only centre it on her own tap, which fired on
every tap of hers and on none of the taps her trigger caused. The heuristic that
would have closed the gap — pairing the batch's `tap` events with her trigger,
because they arrive together — **was considered and not taken**: the engine never
says which card caused another card's tap, and a renderer that joins a cause to an
effect the wire did not state is rules logic in a renderer (M7 convention 4: a cue
keys off an event that is about THAT card). Her resolution is about her, and the
stack is the wire's own statement of what it targeted.

**Known cost.** 9 of the corpus's 13 resolutions are unaimed — the AI casts and
resolves most triggers inside one snapshot — so most of the time the shockwave
reaches no one; a live game where the trigger waits on the stack aims it
(PLAN.md's slice-3 follow-up 3).

**Rejected.** Pairing the batch's taps to her (above). Keeping Tier 1's `tap:on`
(a beat about the wrong event).

---

## D90 — A local card library and a card browser, as dev-server tools: README's card-library NON-GOAL is lifted in part

**2026-09-27** (the user's request, outside the milestone plan. **Supersedes, in
part, README.md's NON-GOALS line** *"No card-library package. No SQLite, no
FTS5, no bulk Scryfall dump, no card search, no card browser."* Brings PLAN.md's
deferred item *"the SQLite + FTS5 card library, the `oracle_cards` bulk stream, a
local image cache and an `/api/images` proxy"* forward, without the proxy.
Report 03 §4 is the spec; `docs/evidence/card-library.md` is what was measured)

**Decision.** The user asked to "expedite some of these" — PLAN.md's deferred
list — and for "a card viewer … to see models and how they act", to help
workshop the deck while the project continues. This entry covers the card-data
half of that request (the models half is a separate change). Two things now
exist:

- **`tools/card-library/`** — a local index of every Magic card (Scryfall's
  `oracle_cards` bulk file, one gzipped JSONL download) plus every print of the
  two sets the deck is built from (MSH, MSC), in one SQLite file with FTS5
  through Node 24's built-in `node:sqlite` (no npm dependency), a disk cache of
  card images keyed by Scryfall id + size, and a JSON-on-stdout query CLI.
  Everything it writes is under `var/cards/` (gitignored).
- **The card browser, `#cards`** (`web/src/cards/`), a third view beside the board
  and the arena: search by name, type or rules text; filter by set, colour, type
  and deck; a detail panel with pips, rules text, artist, copyright, deck counts,
  prints and legalities. It reads the index through `/cards/api/*` and
  `/cards/img/*`, a route mounted **only in the Vite dev server**
  (`configureServer`; never `vite preview`, never the build), on 127.0.0.1. The
  route **never talks to Scryfall**: a search is local FTS5, and an image miss is
  a 404 after which the page loads Scryfall's CDN URL itself — so it is not a
  proxy. The chunk is lazy, like the arena's (**D49**).

**What stays a NON-GOAL.** No *package*: nothing is published, there is no
`package.json` under `tools/card-library/`, and the engine, the bridge and the
board do not depend on it — the board still draws from `art.json`
(`tools/fetch-art.ts`), untouched. No production route and no `/api/images`
proxy. No deck builder: the browser copies a `.dck` line, it never writes a deck.
No network in search. No rules logic: legality is Scryfall's data as shipped,
displayed, never computed. Hard rule 8 is the engine wire's and does not apply to
public card data — but the browser still draws its own cards (`CardView`) and
never imports `render/CardTile.tsx`, whose importer list stays closed at ten.

**The committed fixture — the user's call, defaulted conservatively.**
`fixtures/cards/` (the library's offline test slice: 172 `oracle_cards` lines, 84
MSH/MSC print lines, 6 sets, no images) is **reduced to the fields the library
reads** (`model.ts` `SCRY_CARD_FIELDS`, held to the `ScryCard` interface at compile
time; ~0.7 MB where the verbatim lines were 1.3 MB), and regenerated, never
hand-edited, by `make-fixture.ts`. The index built from it has the same content
digest as one built from the verbatim lines, so nothing the tests exercise was
lost. The repo already keeps Scryfall-derived data out of git on purpose
(`web/public/art.json`), and Scryfall's terms forbid simply republishing its
data; a field-reduced test slice is the smallest thing that keeps the tests
offline and hermetic. **If the user wants no Scryfall data in git at all**, the
alternative is to gitignore `fixtures/cards/` and have `cards-lib`, `cards-api`
and six `cards-ui` tests skip when it is absent — at the price of a suite whose
result depends on what is lying around on the machine, which the repo has been
bitten by once (`MTGTABLE_WS_LOGS`).

**Rejected.** An `/api/images` production proxy (report 03's shape): a proxy of
Scryfall's images is exactly what its terms warn against, and the dev route
serving the user's own cache to the user's own browser does the job. Hotlinking
only, with no cache (every browse re-fetches the same images). Building the index
into the web bundle (55 MB). Search in the browser over a shipped JSON (the whole
point of FTS5 is not shipping 38,690 cards to the page). Rows in `web/src/keys.ts`
for the browser's keys: that table is the board's and the arena's, and
`keys.test.ts` requires every chord in it to appear in the board's `?` overlay —
so the browser has its own table (`cards/keys.ts`), one per surface.

**Known cost.** `config.json`'s `scryfallUserAgent` still carries a placeholder
contact (`github.com/<user>/mtg-table`), and Scryfall asks for an accurate one:
the user must supply it. Report 03 §4.5's re-fetch on a newer `image_updated_at`
and its dated retry for a `missing` / `placeholder` image are not implemented
(`tools/card-library/README.md`, *Not done*). The `.dck` line carries `|SET` only
for MSH and MSC, the two sets whose Scryfall code is checked against Forge's.

---

## D91 — The card library is `node:sqlite` + FTS5 with no npm dependency, and a build writes a fresh file

**2026-09-27** (the card library, **D90**; written up by its documentation pass.
Report 03 §4.1 and §4.4 are the spec — *"Runtime deps: none required"* — and
`docs/evidence/card-library.md` is what was measured. Departs from §4.1's
`packages/card-library/` layout on purpose: D90 says why there is no package)

**Decision.** The index is one SQLite file, `var/cards/cards.sqlite`, written and
read through Node 24's built-in `node:sqlite` (`DatabaseSync`; SQLite 3.53.4 on
Node v24.20.0), with a real FTS5 table: `cards_fts`, **external content** over
`cards`' normalised name, type line and Oracle text, tokenizer
`porter unicode61 remove_diacritics 2`, ranked by `bm25` with the name weighted
10, the type line 3 and the text 1. The library adds **no npm dependency and no
`package.json`**: `fetch`, `node:zlib` (the gzipped JSONL), `node:readline`,
`node:crypto` and `node:test` are all Node's own, and the `.ts` files run by type
stripping with no build step, exactly like `tools/fetch-art.ts`. `web/tsconfig.json`
already includes `../tools`, so `npm run build`'s `tsc --noEmit` type-checks the
library with the client. `query.ts` — the read side the dev route imports — is
synchronous, read-only and has no network in it.

A build **never edits the index in place.** It writes a fresh database at
`cards.sqlite.building`, bulk-loads the FTS table after the rows, records `meta`
(`schema_version`, `built_at`, `oracle_bulk_updated_at`, the row counts, the
measured request rates, and a `content_sha256` over every card, name, print, face
and set row) and `rename()`s it over the old file. A failed build leaves the old
index where it was, a reader never sees half a file, and two builds from the same
data carry the same digest — which is how "idempotent" was checked rather than
assumed (an online rebuild and an offline re-index agreed on `d39f2487…6a30`).

**Rationale.** Report 03 §4.4 verified `node:sqlite` and FTS5 on this machine
before a line was written, and this build verified it again. A native module
(`better-sqlite3`) means `node-gyp` or prebuilt-binary roulette on a machine with
no sudo, and a dependency tree for a tool the game does not even use. A JSON index
means parsing all 38,690 oracle cards on every process start, and a search library
over it (MiniSearch, Fuse, lunr) is a dependency with a ranking of its own to
explain. SQLite answers a name lookup in ~21 µs and a ranked search in 80 µs to
5.4 ms, warm (the evidence's *The queries*), and the dev route opens it with no
warm-up. Storing the rules text once (FTS reads `cards` as external content) and
packing each print's eleven `image_uris` down to a size list plus one version —
after checking every one of the 461,956 URLs against Scryfall's pattern, so a
print that deviated would keep its URIs verbatim (none did) — took the file from
149.7 MiB to ~55 MiB.

**Known cost.** `node:sqlite` is younger than the rest of Node's standard library
and its API may still move; a Node upgrade is the trip-wire and
`web/test/cards-lib.test.ts` (offline: a fake Scryfall on a fake clock) is the
check. The index is ~55 MB under `var/cards/` and is rebuilt, never migrated: a
`schema_version` change means running `build.ts --offline` again.

**Rejected.** `better-sqlite3` (a native build and an npm dependency). A JSON
index with an in-memory search library (the start-up cost, a dependency, a second
ranking). Shelling out to the `sqlite3` CLI (a subprocess per query, and a binary
the repo does not otherwise assume). An in-place incremental build (a failed run
could leave a half-updated index; report 03's `/cards/manifest` incremental
refresh stays on the *Not done* list). Report 03 §4.1's package with its own
`package.json` (**D90**: a tool, not a package).

---

## D92 — The card browser reads a same-origin route in the Vite DEV server, and that route never fetches

**2026-09-27** (the card browser, **D90**; written up by its documentation pass.
Answers report 03 §1.8 and §4.5 — *cache to disk and serve from our own origin;
never proxy an image request per page view*. PLAN.md's question 5, *hot-link or
proxy*, is unchanged for the board)

**Decision.** `web/vite.config.ts`'s `cardsPlugin()` mounts
`web/src/cards/devApi.ts` in **`configureServer` and nowhere else** — not
`vite preview`, not the build — on the dev server's `127.0.0.1`:

    GET /cards/api/status | search?q=&set=&color=&type=&deck= | card/<scryfallId> | decks
    GET /cards/img/<scryfallId>/<size>[?face=back]

The page and its data share one loopback origin. The image route accepts only a
Scryfall UUID and one of Scryfall's eleven sizes, serves the file the library
already cached (`Cache-Control: public, max-age=86400`, because a file never
changes under its name — **D93**), and **on a miss answers 404 and fetches
nothing.** The tile's `<img>` then falls back to the CDN URL the search result
already carries (`cards.scryfall.io`, the way the board hot-links today), and with
neither it draws a generated text frame, never a broken image. Only
`tools/card-library/images.ts` fills the cache, and only when asked: `--deck` /
`--all-decks` (41 images, 3.8 MB for the ten decks), or every MSH + MSC print with
`--all-prints --yes` (~104 MiB; without `--yes` it prints the estimate and stops).
`query.ts` is loaded with a runtime `import()`, so the dev server starts on a
checkout with no index and the page says how to build one; a production build or
`vite preview` shows the same empty state, naming `npm --prefix web run dev`.
`MTG_TABLE_CARDS_DB=<path>` points the route at another index. Because
`scripts/play.sh` launches the same dev server (`web/node_modules/.bin/vite`),
`#cards` should be there during a live game too, one link away from the board —
read off the launcher, not measured: the evidence took the detour from replays
and from the arena, never from a live socket.

**Rationale.** Same-origin because the page wants the user's own disk cache and a
browser cannot read `var/`; a *named* route can refuse anything that is not an id
and a size, which a static mount cannot. Dev-only because the whole project runs
from the checkout (README's NON-GOALS: no packaging, localhost only) and the dev
server is already the process that serves `fixtures/`; a production route would
need a Node server of its own. **Never fetching** is the line between serving the
user's cache to the user's browser and proxying Scryfall: a route that fetched on
a miss would put Scryfall behind our origin on every page view — the shape its
terms warn against (report 03 §1.8), and the `/api/images` proxy PLAN.md deferred.
Hot-linking on a miss keeps all 38,690 cards browsable without downloading them.

**Known cost.** Browsing outside the decks hot-links: of `agent`'s first twelve
tiles, one came from the cache and eleven from the CDN. `--all-prints --yes` is how
MSH and MSC stop doing that, and it has not been run. And the browser does not
exist in a built `dist/` at all.

**Rejected.** An `/api/images` route that fetches and caches on a miss (a proxy —
report 03 §4's original shape). Serving `var/cards/images` through Vite's `/@fs/`
path (no validation, and a filesystem path in every URL) or copying it into
`publicDir` (the cache would land in `dist/`, which is republishing). A second
Node HTTP server on a port of its own (a second process and port for
`scripts/play.sh` to manage, and a cross-origin request per image). Hot-linking
only, with no cache (every browse re-fetches the same images).

---

## D93 — The image cache is keyed by Scryfall id + size + face, one directory per print

**2026-09-27** (the card library, **D90**; written up by its documentation pass.
Report 03 §4.5 is the spec for the key; the directory shape departs from it)

**Decision.** `tools/card-library/store.ts`'s `imagePathFor(imagesDir, id, size,
face)` is THE cache path, and nothing else computes one:

    var/cards/images/<scryfallId>/<size>.<ext>        the front, or the only side
    var/cards/images/<scryfallId>/<size>.back.<ext>   the back of a two-sided card

`<ext>` is the size's own type (`model.ts`'s `IMAGE_EXT`: `jpg` for the five JPEG
sizes, `png`, `webp` for the five WEBP variants). Which image a print has on which
side is the multi-face rule, in one function, `model.ts`'s `imageSides`: the
top-level `image_uris` when present, the faces' only when it is absent (report 03
§2.3; putting the faces first is a negative control in `cards-lib` and fails
three tests). `imagePathFor` throws on anything that is not a Scryfall UUID, so no
id can walk the tree. A file is streamed to `<path>.<pid>.part`, checked (an
`image/*` type, non-empty, exactly `Content-Length` bytes when one was sent) and
`rename()`d into place; a present, non-empty file is never fetched again; two
requests for one file share one download. Scryfall's `?<version>` cache-buster is
dropped from the name — it is the print's `image_updated_at` as a Unix timestamp,
which the index keeps.

**Rationale.** A Scryfall id is immutable and names exactly one print; the size
and the side then name exactly one image. A card *name* names neither: Plains has
hundreds of prints, `Pym Particles` and `Agents of S.H.I.E.L.D.` share their names
with `front_card` theme cards in today's bulk file, and a two-sided card has two
images under one name — which is what is wrong with Forge's own name-keyed picture
cache (report 03 §3.6). Because the path is a pure function of `(id, size, face)`,
`query.ts`'s `imagePath` and the dev route find a file with one `stat` and no
index lookup, and **D92**'s route can promise a day of `Cache-Control`. One
directory per print, rather than report 03's `{size}/{id[0]}{id[1]}/` fan-out,
keeps every size and side of a print together; nothing caches more than MSH + MSC
(~1,340 prints), so the fan-out would buy nothing.

**Known cost.** Dropping the version from the name is what makes a better scan
invisible: report 03 §4.5's re-fetch when `image_updated_at` advances, and its
dated retry for a `missing` / `placeholder` image, are not implemented
(`tools/card-library/README.md`, *Not done*). Today a stale file is deleted by
hand, and a print with no image is skipped and listed.

**Rejected.** Keying by name (above). Keying by set + collector number (stable
too, but not what the CDN, the API or a print row is addressed by, and it still
needs the side). Keeping `?<version>` in the file name (every rescan would orphan
the old file, and the path could no longer be computed without the index).
Report 03's size-first two-character fan-out (it scatters one print's sizes
across eleven trees, for a scale this cache is never used at).

---

## D94 — The card browser draws its own cards: `CardView` is not `CardTile`, and `#cards` is a view of its own

**2026-09-27** (the card browser, **D90**; written up by its documentation pass.
Within CLAUDE.md's M4 conventions 1, 2, 3 and 4, and **D49**)

**Decision.** `web/src/cards/CardView.tsx` is the card browser's card renderer. It
draws a `LibraryCard` (`cards/model.ts`: public Scryfall data, read through
**D92**'s route) and nothing from a game, and it **never imports
`render/CardTile.tsx`**, whose importer list stays closed at ten. The dependency
runs one way and is held mechanically by `web/test/cards-ui.test.ts`: no file under
`cards/` imports `CardTile` or anything from `render/` or `arena/`, or a
stylesheet; `Board.tsx`, `CardTile.tsx` and `Arena.tsx` do not reach into
`cards/`; `main.tsx` reaches the browser only through
`lazy(() => import('./cards/CardBrowser.tsx'))`, never statically; and
`devApi.ts` is imported by `vite.config.ts` and by no browser module. Around the
renderer, the browser keeps the web client's rules *per surface* rather than
sharing the board's instances: one keymap table of its own (`cards/keys.ts`,
`CARDS_KEYMAP` + `planCardsKey`, which the handler and the help line both read),
its CSS appended to `styles.css`, its logic in pure `.ts` that `node --test`
reaches (`search.ts`, `decks.ts`, `text.ts`, `keys.ts`, `model.ts`), and its
components in `hooks-order.test.ts`'s scan (which now walks 33 files and 86
components across `render/`, `arena/` and `cards/`). `#cards`
(also `#/cards`, `?view=cards`; its own state rides after a `?` in the hash) is
chosen in `App` **above** both modes and **unmounts** the mode app: no transport
is created for it, a live game's page-scoped socket survives the detour, a replay
resumes at the frame it was left on (`replayCursors`), and the back link returns
to the renderer you came from.

**Rationale.** `CardTile` is the renderer's half of hard rule 8. Its input is the
wire's `Card` — redacted five-key stubs and face-down faces included — and every
surface that draws a card from a *game* goes through it so that
`render.test.tsx`'s per-frame `data-card-name` check covers all of them. A library
card is a different type from a different source with nothing concealed; feeding
it to `CardTile` would mean inventing a wire-shaped `Card` for a card that was
never in a game, and an eleventh importer of a list that is meant to stay closed.
Keeping the dependency one-way lets either side change without the other, and
keeps the browser out of the 2D entry chunk (the **D49** rule, for the same
reason: most sessions never open it). The keymap is separate because
`keys.test.ts` requires every chord in `web/src/keys.ts` to appear in the board's
`?` overlay, where `/` and `Enter` would advertise keys the board does not
handle. And the mode app is unmounted rather than hidden because a hidden board's
`window` keydown listeners are still live: `Space`, `Enter` or `Esc` typed into the
browser would press OK or Cancel in a live game.

**Known cost.** Two card renderers in the 2D client, so a change to how a card
*looks* is made twice if both should follow it. The live-socket half of the
detour is true by construction (`liveTransport` is page-scoped) and has not yet
been exercised by a live game; the replay and arena halves were measured. The
detour loses the mode app's own UI state — an open panel, a zoomed card, a camera dragged by hand (the chosen
camera view persists through **D71**'s `localStorage`). The entry chunk grew
0.23 kB gzip (the `lazy()` import, the `view === 'cards'` branch, the replay
cursor map, the link); the browser is a lazy chunk of 9.67 kB gzip.

**Rejected.** Reusing `CardTile` through an adapter (a fake wire `Card`, an
eleventh importer). A "library mode" prop on `CardTile` (the board's
hidden-information renderer growing a branch that is not about the board). Rows
in `web/src/keys.ts` (above). Keeping the mode app mounted and hidden under the
browser (above). A per-component stylesheet for the browser (M4 convention 1:
neither test runner can load one).

---

*A note on numbering. **D90–D94 are `main`'s**: the local card library and the
`#cards` browser, commit `754f504` (2026-09-27), which landed on `main` while
slice 4's branch (`tier2-slice4`, cut from `0368a90`) was being built; the branch
was rebased onto it the same day. Slice 4's decisions start at **D95** so the
merge kept both sets without renumbering either.*

---

## D95 — The humanoid bodies are Quaternius's *Universal Base Characters*: proportioned people on the animation library's own rig, every clip the library's; the chibis stay as fallbacks

**2026-09-27** (M7 Tier 2, slice 4 — the bodies track; written up by the slice's
documentation pass. **Supersedes D73** — the three Kenney bodies chosen by
silhouette — and, for the proportioned bodies, **D68**'s "the pack's own clips
with two retargeted in"; the chibi fallbacks keep D68's set unchanged. Within
**D53**, **D54**, **D57** and **D67**)

**Decision.** Every humanoid card stands in a proportioned body from
Quaternius's *Universal Base Characters* [Standard] — CC0, its badge read and
recorded verbatim on the download day, 2026-09-27 (`tools/assets-manifest.json`'s
`quaternius-universal-base-characters`, NOTICE §7). The **man** (`Superhero_Male`
with the `Hair_SimpleParted` hairstyle) is the model `agent`, and `scientist` is
the same node; the **woman** (`Superhero_Female` with `Hair_Long`) is `hero`.
Both are on the Universal Animation Library's own 65-joint rig — the same author
and the same joint names, and the build asserts the joint list against the
library mannequin's skin — so **every** clip they play is the library's,
retargeted by the build by **world-space delta** over 22 major joints (parents
first; the fingers and `root` hold their bind; the pelvis translated by the
source's hip delta scaled by the hip heights). The two rigs share names but not
rest orientations (up to 23° apart at the neck, measured), so local rotations are
not copied. The clip map is the manifest's `rigs.ubc.clips`: `idle` Idle_Loop,
`summon` Jump_Land, `attack` Punch_Cross, `block` Sword_Idle, `hit` Hit_Chest,
`die` Death01, `grow` Spell_Simple_Enter, `channel` Spell_Simple_Shoot, `shrink`
Crouch_Idle_Loop, `pistolDraw` Pistol_Shoot, `radioCall` Idle_Talking_Loop — and
`crouch`, the tapped kneel, **composed** (`ual:Fixing_Kneeling+Idle_Loop`: the
kneeling clip's legs and hips, their turn about the vertical removed by
swing-twist and their pitch kept, under the idle's torso held upright), because
the library has no kneel with an upright chest.

The build also drops the eyes and eyebrows (a head is about 12 px tall at the
table view), grafts the hairstyle onto the body's skin (joints remapped by name,
the bind asserted equal), and scales the head **×1.3** about its joint, weighted
by each vertex's head weight so the neck blends. `figures.json` picks the body per
card where the subtype rung would pick the wrong one: Peggy Carter, Agent 13 and
Quake stand in the woman's body, Ant-Man in the man's. The three Kenney bodies
stay in the library as `agent-chibi`, `hero-chibi` and `scientist-chibi`
(**D98**).

**Every clone starts at its idle's first frame** (`scene/models.ts`'s
`instantiateFigure`, `pose: 'rest'`, the default; the skin's bind is untouched;
`PropField` asks for `pose: 'bind'`, which its anchors are written in). Three's
mixer blends every bone toward the pose it found when an action first played
whenever the weights sum below 1. A proportioned body's bind pose is a T-pose, so
Agent 13 flashed into it at the end of her attack (`g2` 156 → 157); a chibi's
stubby A-pose had hidden the same thing for three slices.

**Rationale.** The user's verdict on slice 3 was *"the avatars are still pretty
generic"*. On a chibi (the head half the figure, 1.07–1.15× as wide as tall)
identity could only be a tint and what the figure carried. A proportioned body
has a head, shoulders, a waist and legs, which is what a costume (**D97**) is
painted on. Report 12 §2 had already listed this pack as the humanoid candidate:
CC0, glTF, *"rigged with a Humanoid rig allowing easy retargeting"*. D68's
face-plants were the library's clips on a 7-joint chibi whose head is half its
height. On the library's own rig, lab renders of all twelve clips at four phases,
front and side, on both bodies, show natural poses. The ×1.3 head is the heroic-miniature
convention: a superhero body is 8.6 heads tall, and at 60–100 px its head was a
7-px dot that no hat, helmet or eyepatch could sit on. The strict width clamp
(**D65**, unchanged) no longer bites: the woman is 0.33 and the man 0.37 as wide
as tall at rest, so every humanoid stands its full `FIGURE_HEIGHT` 0.85 where the
chibi was clamped to 0.63 (7,216 neighbouring pairs, worst overlap 0.000; **D66**
unchanged).

**Known cost.** The free Standard zip holds **only the Superhero** male and
female of the kit's six bodies. The Regular and Teen proportions are in the paid
Source zip ($19.99, not used), so Coulson and the scientists are broad-shouldered.
The composed kneel is a build-side invention, and two compositions failed before
this one: on the kneeling clip's own hips the body turned edge-on to the table
camera (Coulson's tie 1 px, Peggy's shield 6 px, measured by the raster test), and
on the idle's hips it stood on one bent leg. `CueRunner.driveClips` still returns
early when a stance's rest action IS the transient, leaving the weights below 1
for the ramp. Starting every clone at its idle hides the bind pose rather than
fixing the weights, so a model with no `idle` would still flash its bind. The
sources were downloaded by the builder on the workflow's instruction — the new
128,968,391-byte zip, and the four earlier sources again — not on the user's
approval in chat (PLAN.md's slice-4 follow-ups).

**Rejected.** The paid Regular bodies (the user's call, not a builder's).
Quaternius's *Man in Suit* and KayKit's adventurers, the brief's named fallbacks
(not needed once the badge read CC0; *Man in Suit* is one body with seven
materials and a rig of its own, report 12). Keeping the chibis as the default
(the verdict). Copying the library's local rotations onto the body (the rest
orientations differ). Mixamo (**D54**). A body per card (Tier 3, report 13 §12).

---

## D96 — A body is 1,400 triangles, the drone 1,900 and the bee 1,700, simplified WITH the costume slots by the meshoptimizer the CLI already carries

**2026-09-27** (M7 Tier 2, slice 4 — the bodies track. Within report 13 §8.2's
budget and **D67**)

**Decision.** `tools/build-figures.mjs` decimates each proportioned body from
about 12,600–12,800 triangles to **1,400** (the manifest's `models.<id>.triangles`)
with meshoptimizer's `simplifyWithAttributes`, each vertex's costume slot (**D97**)
riding along as a one-hot attribute so the slot borders survive, and the shirt's
and belt's vertices **locked**. The drone (4,544 → **1,900**) and the bee (3,040 →
**1,700**) are simplified too, plainly. The simplifier is **meshoptimizer 1.2.0,
the copy nested under `@gltf-transform/cli`**, resolved through the CLI's own
`package.json`, so a body is exactly what `gltf-transform simplify` would make of
it; meshopt's simplifier is deterministic, and two builds from the verified
sources are byte-identical (`cmp`). The result is `figures.glb` **373,236 bytes**
(sha256 `fe13b02c…f7aae90`), 8,573 triangles and 63 clips, inside report 13 §8.2's
≤ 400 kB, recorded in `models.json` and held to it by `figures.test.ts`.

**Rationale.** Measured, not assumed. The brief suggested 2,500–3,500 triangles a
body, which assumed twelve humans and nothing else. `g1`@355, the budget frame,
has seven humans, three drones, an insect, a rider, sixteen props and, since
**D99**, two full duelist bodies. With the first cut (1,700-triangle bodies, the
drone at 2,300, the bee at 2,000) that frame read **31,909** triangles, over the
30,000 line. At these targets it reads **27,416** triangles, 79 draw calls and 12
programs with bloom off (GTX 1080, headless Chromium). At table distance a
1,400-triangle body draws the same silhouette. A plain simplify kept 6 of the
shirt's 58 vertices and the white shirt was a smear, which is why the slots ride
along and the two small bands are locked.

**Known cost.** The headroom is thin on three lines at once. About 2,600 triangles
remain at `g1`@355, and under 1,000 in a frame at `MAX_FIGURES` (12) with both
duelists. The file is 27 kB under 400 kB, and the humans' clips are most of it.
Eleven draw calls are left. **Byte reproducibility now rides a transitive
dependency**: the build imports whatever meshoptimizer `@gltf-transform/cli`
nested, and the CLI still floats on `^4.5.0` in `web/package.json` (Tier 2
follow-up 17). `figures.test.ts` catches a changed file, but only after the fact.

**Rejected.** The brief's 2,500–3,500 (over budget, above). Leaving the drone and
the bee alone (their triangles were the cheapest to give back). A plain simplify
(the shirt). The older meshoptimizer at `web/`'s top level (not what
`gltf-transform simplify` runs, so a body would differ from the CLI's own output).

---

## D97 — The hologram paints a COSTUME: a slot per vertex, a palette per figure written at commit, the rim still the card's tint, still one program

**2026-09-27** (M7 Tier 2, slice 4 — the bodies track. **Amends D53**'s treatment
and retires **D73**'s premise that "the hologram keeps only geometry": it now
keeps geometry and eight colours. Within **D56**, **D67** (no texture) and **D75**
(identity is data))

**Decision.** Every humanoid vertex carries a **costume slot**, one unsigned byte
indexing `figures/props.ts`'s `COSTUME_SLOTS` — `skin`, `hair`, `top`, `shirt`,
`legs`, `shoes`, `gloves`, `belt`, in that order, and **the order is the
contract**: the build imports the array, the shader indexes by it, and
`traits.test.ts` holds the two together. The build writes the slot as the glTF
custom attribute `_REGION`, and `scene/models.ts` renames it once, at load, to
`costumeRegion`. Slots come from the joint that moves the vertex: the head and
neck are `skin`; the spine, clavicles and arms are `top`; the hands and fingers
`gloves`; the pelvis, thighs and calves `legs`; the feet `shoes`; the whole
hairstyle `hair`. **Two bands** are measured on the bodies' own bind positions:

- **The shirt**: a V down the chest front, from the collar (neck + 2 cm,
  half-width 0.1 m) to a point 9 cm under the chest joint (`spine_03`),
  front-facing vertices only.
- **The belt**: the base body's own waistband, the band 25–85% of the way from
  the pelvis to `spine_01`.

The chibi fallbacks get slots too; their face is the front of the head below the
brow.

**The palette is per FIGURE, not per vertex and not per instance**: each figure's
own `HoloMaterial` carries a `uCostume[8]` uniform array plus `uCostumeOn`. The
vertex shader looks the vertex's slot up in it. The fragment shader draws the
body in its palette and rims the silhouette in the card's **tint**, so the
hologram still glows in the card's colour. A costumed body is also more solid
(core alpha 0.74 against 0.38) and its scanlines softer (0.12 against 0.35),
counted in the figure's own height (`uUnitScale`). `applyCostume` writes the
palette **at commit**, from `FigureLayer`'s layout effect, keyed so the strings
are parsed once a game. A frozen pose is washed grey there. A dying body's fade is
a number, `uDrain` toward `uDrainTo`, which its frame loop writes and which
reaches every slot. A figure with no palette (the drone, the bee, an anonymous
figure) is drawn exactly as slices 1–3 drew it.

**The data** is `traits.json`'s `costume`: slot → `#rrggbb`, or `tint` for the
figure's own tint, **merged slot by slot** down the ladder (a card row that names
only its hair keeps its rung's suit). `figures/pose.ts`'s `costumeOf` fills the
rest. Skin is `#d6a57f` for everyone, hair and shoes have neutral defaults, the
shirt follows the top, legs are the top darkened, gloves are the skin, and the
belt is the legs darkened. So a card with no costume at all wears a bodysuit of
its own colour. The rungs are spy (a dark suit and white shirt), hero (blue below
and a gold belt), soldier (tactical grey, black gloves) and scientist (a white lab
coat over grey), and ten deck cards have rows of their own (README's *Tier 2,
slice 4*).

**Rationale.** The user named Peggy — *a blue jacket and a red hat* — and slice 3
could not give her two colours: its shader carried one tint. A texture per card
would be a model per card by another name, and **D67** keeps the library
texture-free. Figures are not instanced — each is its own `SkinnedMesh` clone
with its own material, sharing one geometry and one program — so a per-material
uniform array is the channel the figure already has. Eight slots cost eight
uniforms and no texture unit. It is still one program: 12 with bloom off at
`g1`@355, as in slice 3, measured.

**Known cost.** Skin is one tone for every card, deliberately: a costume is
identity data and a complexion is not, and nothing here is drawn from a likeness
(Tier 3). The squad's followers are baked bodies (**D88**) and carry a shade per
slot, not their card's palette. The coat prop is rigid, so a kneeling
Biochemist's lab coat is a white box to the floor.

**Rejected.** A texture per card (above; **D67**). Vertex colours baked into the
library per card (one body per card, Tier 3's seam). A per-card skin tone (a
likeness by degrees). Writing the palette in the frame loop (a liveness clause
forbids any `applyCostume` or `uCostume` write in `CueRunner.tsx`,
`DiscField.bind`, `DepartureField.bind` or `PropField.bind`).

---

## D98 — The chibi is a FLAG, not a default; props are fitted per body FAMILY; the eyepatch joins the one-sided details

**2026-09-27** (M7 Tier 2, slice 4 — the bodies track. Within **D75**, **D81**,
**D83** and **D84**; amends D83's one-sided list and D84's heads test)

**Decision.** `traits.json` gains **`body`**: `human` (the default — **D95**'s
proportioned bodies) or `chibi`. A row with `"body": "chibi"` stands its card in
`<model>-chibi` — slices 1–3's Kenney body — when the library has that model, and
in its ordinary body when it does not. **No row asks for it today.**
`figures.test.ts` requires every `-chibi` model to be a declared fallback of a
body the ladder reaches, and prints the list. `clips.test.ts` holds the three
chibis to one rig and one clip set (T8's), and holds the proportioned bodies to
the library's clips joint for joint, **borrowing none** (the chibis still borrow
`crouch` for `block` and `shrink`; the proportioned bodies have a clip each).

**A prop is fitted per body FAMILY.** `familyOf` reads the manifest's rig:
`ubc` → **`human`**, `kenney-mini` → **`humanoid`** (the chibi), and the drone and
the insect are families of their own. Every kind in `PROP_KIT` carries anchors per
family, written in that family's figure space: one unit tall, feet at y = 0,
facing +Z (**D81**). A family with no row draws nothing of that kind. The `human`
anchors are written in the body's BIND pose on its own joints (`Head`, `spine_03`,
`hand_r`/`hand_l`, `lowerarm_l`, …), against landmarks measured on the
committed `figures.glb` (`figures/props.ts` prints them), with one exception:
**`PropAnchor.pose`** writes an anchor in a POSE of a clip. Agent 13's pistol and
its muzzle are anchored to `hand_r` in her `pistolDraw` aim at phase 0.45, so the
pistol is in her hands while she attacks and hangs at her side at rest.
`PISTOL_MUZZLE` moved with it, and the cue's flash lands on it with no cue edit
(`facing.test.ts` green). The coat is re-cut for a person (0.15 → 0.25 flare over
0.56, a collar at the jaw). The eyepatch is written in unit-head space, with a
slate edge instead of a pale ring (on a person's face the ringed disc read as a
monocle). The squad's wedge is 0.34 aside (0.46 was a chibi's width). The rider
is the woman, hunched, ×0.46. The kit's `baseName` no longer turns `spine_03`
into `spine`.

**Two thresholds moved, each with its measurement.** The **eyepatch joins
D83's one-sided details**, with the coat as its partner: on a head 12 px tall it
cannot show 48 px from both seats without being a mask, and it measures 56 px
from the front and 42 from behind. **D84's heads test** is recalibrated for
proportioned heads: ≥ 60 px each (a lone agent's head measures 126–142, a
follower's 79–87) and ≥ 20 px apart across the screen, where it was 150 and 15. It
finds the heads by their costume slots (skin and hair) rather than by height, so a
KNEELING leader's head is still a head. Slice 3's first formation, the control,
still fails it 8 of 8.

**Rationale.** Nothing was lost: slices 1–3's bodies are still in the file, one
data key away, and each is held to a body the ladder reaches, so a fallback
cannot rot unnoticed. Fitting per family is what let the kit move to a new body
without touching a single `traits.json` row.

**Known cost.** The chibi's pistol uses the proportioned body's numbers (so the
flash stays on it) and sits in front of the chibi's face. A family's anchors move
whenever the build refits a body, and so does the villain's look (**D99**), which
stretches the kit's hood.

**Rejected.** Deleting the chibis (they cost 2,175 triangles of file and nothing
on the table). A second anchor table per card (props stay a shared kit, **D75**).
Lowering the 48 px bar for the eyepatch alone (the one-sided list is the
mechanism D83 built for exactly this).

---

## D99 — The duelists are FULL figures: a seat, not a player; a director and a villain; props baked into one mesh; the busts are the fallback

**2026-09-27** (M7 Tier 2, slice 4 — **T13**, the duelist track; written up by
the slice's documentation pass. **Supersedes D62** — "two billboard silhouette
busts at the HUD anchors; rigged avatars are deferred", which was user decision 8
— on the workflow's reading of the user's verdict on slice 3, *"the avatars are
still pretty generic"*, as covering the duelists as well as the creatures. The
user's words do not say which; the busts remain, and a seat with no valid look
draws one. Within **D53**, **D56**, **D57** and hard rule 8)

**Decision.** Each seat has **one full figure**, drawn through the same library,
loader (`scene/models.ts`), holographic material and program as every creature,
at **1.6 × `FIGURE_HEIGHT` = 1.36** (a creature is 0.85). **Who stands for a seat
is data**: `figures/duelists.json`, validated by `figures/duelists.ts`'s
`validateDuelists` like `cues.json` and `traits.json` (unknown keys are errors;
a bad look drops its seat to the bust). **A seat, never a player**: seat `you`
is the **director**, seat `opp` the **villain**, and nothing reads
`PlayerState.name`.

- **The director** is the man's body in a navy suit, a white shirt V and black
  gloves. He wears the kit's long `coat` in the suit's colour with its trim in
  gold (lapels, collar, hem), and the kit's `badge`, gold with a dark roundel, on
  his chest with its emblem on his back. His hologram edge is steel-blue mixed 45%
  with your seat's teal (`seatMix`).
- **The villain** is the same body in iron-grey armour with an iron mask (the
  `skin` slot) and a green tunic. He wears the kit's `coat` as a green cloak
  trimmed in gold, and the kit's `hood` as an iron great helm, stretched
  `[1.1, 0.8, 1.08]` (a look may stretch a kit anchor within [0.4, 1.8]), whose
  visor slit wears the dark `shade` slot. His edge is green.

A look is a body ladder (`agent`, `hero`, `scientist`, `agent-chibi`; the first
the library holds wins), a scale within [1.2, 2.2], a tint and its `seatMix`, a
costume in **D97**'s slots, props from the shared kit each worn in a slot, and
the slots a prop's `trim` and `shade` parts wear. The kit's own vertex tones
choose which: a part lit ≥ 4× wears `trim` and one ≤ 0.3 wears `shade`.

**Props are BAKED, not instanced.** `scene/DuelistLayer.tsx` builds each body at
commit: `instantiateFigure`, the costume through `applyCostume`, then each kit
anchor's unit geometry (`buildKindGeometry`, `anchorsOf`) rigidly skinned to its
joint and appended to the body's geometry. So a duelist is **one `SkinnedMesh`,
one draw call and no new program** (1,728 triangles each on the current
`figures.glb`), and the badge rides the chest through every clip.
`DuelistField.bind` poses both bodies once a frame: position and facing, the
breathing idle, the stance entry, a transient gesture (**D101**), aimed bones, a
lean, the tint, and then `mixer.update(0)`. It is reached **only** through
`BustField.bind`, which `CueRunner` already called once a frame, and which draws
a bust only for a seat with no figure. Build and disposal are **one layout
effect**, so cleanup and setup always pair; a Vite hot update once brought the
busts back mid-game when disposal sat in a passive effect.

**The stance is a POSE** (**D56**): `duelistPoses` gives each seat `ready`, `won`
or `lost` from `board.gameOver` **alone**, so a skip, a scrub, a `resync` and a
new `gameId` need no history. The winner holds `grow` at 0.85 with the right arm
**aimed** straight up (the library has no raised fist, so `aim` turns a joint
until the line to its child points along a figure-space direction, after
`mixer.update(0)` and before the next one rewrites it). The loser holds `crouch`
at 0.8, head aimed down, slumped 0.3 rad and drained 50% toward grey. Breathing
reads the cue queue's virtual clock (`queue.now`), which runs only while the
queue has film, so **an idle table still renders nothing** (**D58**).

**Rationale.** A proportioned body in a costume (**D95**, **D97**) is what made a
duelist affordable: D62's objection was "the most art-direction-expensive thing
in the tier", and after slice 4 a duelist is a costume row and two kit props on a
body the library already carries. Report 13 §7's other objection — "the camera
cannot afford them" — held, and it is **D100**'s subject. Baking the props keeps
a duelist one mesh, one draw call and one program, and leaves the prop field what
**D78** made it: committed only by `FigureLayer`, from the creatures' poses, with
no second source. Measured, the two cost **2 draw calls** where the busts cost 1, no
program (program #9 draws 13 objects: 11 figures and 2 duelists) and **3,456
triangles**. `g1`@355 is 79 / 27,416 / 12, `g1`@316 73 / 24,316 / 12, and with
`figures.glb` blocked the fallback reads 59 / 3,078 / 10.

**Known cost.** The verifier found both read as costumed figures but only weakly
as a *director* and a *villain*, each with a visible artifact. From the default
table view the director is seen from above and behind in the bottom-left corner,
mostly coat. The coat is rigid on `spine_03`, so its lapel strip shows a seam
when the win clip twists the torso. The villain's helm is A.I.M.'s bucket
stretched, and moves whenever the bodies are refitted. The "fist" is an open hand
(the fingers keep the clip's pose). The triangle headroom is the bodies'
(**D96**).

**Rejected.** Two busts, kept as the design (the verdict). Instanced duelist
props (above). A player's name or deck choosing the look (hard rule 8's renderer
half — the HUD plate carries the name). A duelist in the camera solver's
required set (**D100**).

---

## D100 — Where the duelists stand: yours beside your hand, the opponent's at the table's right beside its creature rank, because the far end is under the chrome

**2026-09-27** (M7 Tier 2, slice 4 — T13. Closes Tier 2 follow-up 10 — the busts'
placement — for the duelists, and moves the busts with them. Within report 13
§7's rule and **D85**'s keep-out band)

**Decision.** Both stand points are pure layout arithmetic in
`figures/duelists.ts` (`duelistStand`), taken off `layout.ts`'s anchors:

| seat | stand (world) | from | faces |
|---|---|---|---|
| you | (−3.95, 0, 4.65) | your HUD anchor (`playerAnchorFor`), **0.4 outboard and 0.4 back** (`YOU_STAND_DX`, `YOU_STAND_DZ`) | the other duelist: three-quarters **away** from your camera |
| opp | (4.2, 0, −2.2) | the opponent's creature-rank anchor + (`OPP_STAND_X` 4.2, `OPP_STAND_DZ` 0.1): **0.66 past the end of a full nine-card rank**, level with it, clear of the stack column (x 4.8) and the library (z −4.55) | the other duelist: three-quarters **toward** your camera |

They face each other diagonally across the table (`duelistFacing`, `yawToward`
from `FIGURE_FRONT_Z`, **D81**). The busts, which a seat with no figure still
draws, stand at the same points. The duelists are **never** in the camera
solver's required set: no view, clamp or solver rule changed, and `keepsSeat` is
recomputed unchanged for every view. `camera.ts` gained three pure checks the
duelists need and nothing else: `keepOutTop` (the chrome band's lower edge in
NDC), `clearOfHand` (a body's projected hull against every card of a seven-card
fan, by SAT) and `visibleShare` (a 7 × 11 sample grid over the body inside the
frame and below the chrome). `camera.test.ts` asserts that yours never overlaps a
hand card in any seat-safe view at any live aspect and covers none of your ranks.
It asserts that the opponent's is ≥ 90% visible on a 1600 × 1000 window, ≥ 70% on
1280 × 800 at 16:10 and wider and at 4:3, and covers none of the opponent's ranks
from the table view. **Slice 1's two bust anchors are the negative controls**:
behind the hand at 6 of 18 (view, aspect) pairs, and 0% visible.

**Rationale.** The brief asked for both at the existing bust anchors. Measured,
the opponent's cannot be there: from every seat-safe view the far end of the
table lies under the arena's chrome (`HUD_TOP_PX`, 128 CSS px). A 1.36-tall body
anywhere behind the opponent's hand is **0% visible from the table view** at
1600 × 1000, because the whole far end projects above NDC 0.73; slice 1's bust
there was 37–89% covered. A grid over the opponent's half (every seat-safe view ×
every live aspect × both canvas heights) found the well-seen places only toward
the table's centre or at its right side. Your own bust's point put a standing
body's legs over the fan's leftmost card from the low view; 0.4 outboard and 0.4
back is the nearest point from which no card of the widest fan is ever behind it.

**Known cost.** It is **not** the Yu-Gi-Oh composition — one duelist at each end —
that `docs/ideas/arena-mode.md` reaches for. Putting the opponent's at the far end
is a camera, layout or HUD decision (the chrome band, the table view's pose or the
table's depth), not a duelist one. **View 4 (side-on) does not show yours** (it
stands 49.6° off that view's axis against a 33° half-width at 16:9). View 3 shows
it at 31%, partly under the chrome. A square (1:1) window cuts the opponent's off
in the shoulder and low views (0%; printed, not asserted). `visibleShare` models
only the top chrome band, **not the player plates**: the verifier found the
top-right AI plate reaching y ≈ 180 at 1600 × 1000 and covering the villain's helm
in the shoulder view at 1024 × 768. The damage number still rises from
`playerAnchorFor`, which is at your duelist's feet but not at the opponent's.

**Rejected.** The bust anchors (measured above). Adding the duelists to the
solver's required set (report 13 §7: decoration may leave frame, the hand and the
battlefield may not). Moving the chrome, the table view or the table's depth
inside a duelist track (a decision with its own blast radius, left to the user).

---

## D101 — A duelist's gestures are a `gesture` PARAM on the existing cues, played on reserved clip-lane ids; one flinch per player per batch

**2026-09-27** (M7 Tier 2, slice 4 — T13. Within **D51**, **D57**, **D79**'s closed
param table and the pose/cue rule, **D56**; no cue id added)

**Decision.** A duelist answers four things, and each is a **cue that decays to
identity**, played by the cue that is already playing the event:

| gesture | written on | lane request | the body |
|---|---|---|---|
| **cast** | any cue on a `cast` for `players[0]` (`cast.rise`, Wasp's `fx.scaleBeam`, Helicarrier Strike's `fx.strike`, …) | `channel`, alias `cast`, weight `clipEnvelope(t)` | the body's `channel` clip (Spell_Simple_Shoot): a hand raised toward the table, and back |
| **flinch** | `damage` to a player; `life` with `to < from` | `hit`, alias `flinch` | `hit` (Hit_Chest), a lean back of 0.2 rad, the whole body drained toward red (0.62 × weight, through `uDrain`) |
| **win** | `outcome.finish`, for the winner | `grow`, alias `win` | the entry into **D99**'s won stance, with a gold lift in the edge |
| **lose** | `outcome.finish`, for every other seat | `die`, alias `lose` | the entry into the lost stance |

The cue ladder writes the `gesture` **fact** on the four events a duelist answers
(`cues/resolve.ts`). `cues/validate.ts` knows the param — `cast`, `flinch`,
`outcome` or `none` — and a data row may override it like `colour`. The shared
`cue()` builder plays it (`cues/registry.ts`'s `playGesture`) on
**`duelistLane(player)` = −1,000,000 − player**, an id no card can have (Forge's
ids are non-negative and every "no card" sentinel in the cue engine is −1). On
`end()` the builder releases **only its own request**, through `Stage.clipOf`, one
new OPTIONAL query that `SceneStage` already had. So `replay-cues.test.ts`'s
"`stage.clips` is empty after every batch" covers the duelists with no line
added. `cues/queue.ts` gains two suppression rules and one query:

- **Rule 5b.** A `cast` that rule 5 absorbs into its arrival hands its gesture to
  the arrival (`gesture: "cast"`, `gesturePlayer` = the caster). Otherwise the
  AI, which casts and resolves inside one snapshot, would never raise a hand.
- **Rule 8.** One flinch per player per batch: the `damage` keeps it, and the
  `life` loss it caused gives it up (`gesture: "none"`).
- **`gesturePending(gesture)`** is an indexed, allocation-free query.
  `stanceEntry` uses it so the end does not blink. The snapshot that ends the game
  already says who won, so while the outcome cue is **queued** behind the batch's
  blows the loser is still standing and flinching (entry 0). While it **runs**,
  the entry is its `t` over the first 70%. Once it has played or been skipped, the
  stance is held (1).

A draw moves nobody. Under reduced motion no lane request is written: the stance
is held until the outcome cue ends, then snapped.

**Rationale.** D79's rule, restated for a body at the table's edge: a beat is a
param on a cue that already exists, never a new cue id, so the ladder, the
queue's policy, pause, speed, skip and the live budgets hold for it with nothing
added. A reserved lane id reuses the whole clip lane — scrubbed by the cue's own
`t`, arbitrated by `clipBeats`, emptied by `beginFrame` — rather than building a
second channel. Rules 5b and 8 are the queue's own vocabulary: rule 5 already
dropped a `cast` whose card lands in the same batch, and without 5b the most
common AI play would never gesture. The corpus census (`duelists.test.ts`, printed
every run) is 3,293 batches: opp cast 207 · flinch 22 · lose 2 · win 16; you cast
178 · flinch 90 · lose 16 · win 2. No duelist lane holds a request after any batch
drains.

**Known cost.** **The most common live case is not seen live.** When the human
takes damage, the batch arrives while the engine is waiting on the human, and the
250 ms awaiting-human budget snaps it, so the flinch plays at `t = 1`, where its
weight is 0 (Tier 2 follow-up 1, question 12). The verifier's 5 ms sampler over
the AI's combat-damage batches in two live games (seeds 5 and 11) never saw the
flinch. The live concession's outcome entry did not visibly play either: the
stances appeared at once. The gestures are evidenced in replay (stepped,
photographed) and by the corpus test.

**Rejected.** New cue ids for the gestures (D79: a per-card variant is a param,
never a new cue id). A clock of the duelists' own (**D58**, **D72**).

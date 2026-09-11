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

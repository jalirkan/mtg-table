# mtg-table — decisions

The load-bearing decisions, each dated, with the reasoning that produced it and the
alternatives that were rejected. Rationale is condensed from
[`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
§1 and §12; the citations live there and in the four research reports.

Reversing one of these is a redesign, not a refactor. If you are about to
contradict an entry, add a new dated entry superseding it rather than editing the
old one.

**Numbers are final** (**D200**, 2026-09-28). A decision keeps the number it was
written with. A lane reserves a block of numbers before it starts and keeps it
when it merges; gaps between blocks are allowed, and nothing — this file
included — states how many decisions there are. The *written as … renumbered at
merge* notes on older entries are history from before the rule, and stay.

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

---

## D102 — The workshop is a lazy page OUTSIDE `arena/`: it draws with the arena's own scene, reaches it only through a listed set of exports, and unmounts the mode app

**2026-09-27** (the workshop, PLAN.md's *The workshop*; written up by its
documentation pass. Within **D49**, **D94** and CLAUDE.md's M4 conventions 1, 2
and 4. **Numbered after Tier 2 slice 4's D95–D101**, which were on their own
branch when this was written and are in this tree since the workshop was rebased
onto `main`'s `23e26b3` the same day. The `match-setup` branch numbers its own
decisions D102–D105; whichever of the two lands second renumbers its own. They
are cited only from this file, PLAN.md, README.md and CLAUDE.md, and nowhere in
code.)

**Decision.** The card viewer the user asked for on 2026-09-27, *"a card viewer
that allows the user to see models and how they act"*, to help workshop the
identity work, is `web/src/workshop/`. It is a fourth view beside the board, the
arena and `#cards`:

- **A page, not a renderer, and lazy.** `#workshop` (also `#/workshop`, `!workshop`;
  `?view=workshop` takes the bare word) is chosen in `App` above both modes,
  exactly as `#cards` is (**D94**). It is reached only through
  `lazy(() => import('./workshop/Workshop.tsx'))` (**D49**). It **mounts no
  transport** and **unmounts the mode app**. A live socket already open survives
  on `window`, and a replay resumes at its frame (`replayCursors`). While a live
  game waits on the player, the header carries a chip: `useLiveGameWaiting` reads
  a socket that is *already* open and never opens one. The chip shows an `ask` as
  a flag and an `input` by its own prompt, verbatim (M5 convention 4).
- **Downstream of the arena, never inside it.** The workshop's code edits nothing
  under `arena/`, and nothing under `arena/` imports it. (The two arena defects
  it found were fixed on the arena's desk, in the reconciliation commit, each
  held by a test of the arena's own: *Reconciled onto slice 4*, below.) The pedestal draws with
  the arena's own `CardPlane`, `FigureLayer`, pose fields, `EffectPool`,
  `CueRunner` and `SceneStage`. `SceneStage` is subclassed only to take the
  facing preview's turn out of `yawTo` (`workshop/facing.ts`). The page consumes
  the arena's pure modules (`layout`, `figurePose`, the figure / trait / tile /
  attach ladders, the validators, `CueQueue`, `REGISTRY`, `cues/resolve.ts`,
  `camera.ts`). **Every arena export it uses is named in `Workshop.tsx`'s header
  comment**, with what it is used for, and `workshop.test.ts` fails when a
  workshop file imports an arena export that list does not name. That list is
  the rebase checklist.
- **The arena's rules hold on the pedestal because they are the arena's code.**
  The workshop has one `useFrame` of its own, `Pedestal.tsx`'s renderer at
  priority 1, after `CueRunner` has posed the frame. It renders the scene once,
  or into two halves for "both seats", and allocates nothing. Every
  `mixer.update` is `0`. The workshop has no `fetch`, socket, timer or URL except
  the Scryfall credit. There is no `HitProxy`, so the pedestal takes no click
  and there is no `onAct` to reach. The director is `PedestalDirector`, a
  `CameraDirector` that takes no move: camera cues are dropped, and the camera
  belongs to the orbit controls and `workshop/framing.ts`.
- **Its keys are a table of its own** (`workshop/keys.ts`, each row carrying its
  action; `Workshop.tsx` maps actions with a `Record`, and a test rejects any
  `case '<key>'`). **`W` is one row of `web/src/keys.ts`** (`openWorkshop`, placed
  before `useMana`). It is live in the arena and `inert` on the board with its
  reason. `main.tsx` dispatches it in the capture phase, and only while the arena
  is really mounted (never under `?arena=off`).
- **The list's thumbnail is the workshop's one card image outside `CardPlane`.**
  It is exempt from `CardTile` for **D94**'s reason: the list is deck cards,
  tokens and archetypes, all public card data. A concealed entry never looks its
  art up (`workshop.test.ts` holds it at one `imageUrl(`, every `lookupArt(`
  guarded by `concealed === null`).
- The rest is the per-surface rule of **D94**. Its CSS is appended to `styles.css`,
  its logic is in pure `.ts` for `node --test` (everything except `Workshop.tsx`,
  `Pedestal.tsx`, `legibility.ts` and `data.ts` imports no three and no React),
  and its components are in `hooks-order.test.ts`'s scan. The build names the
  chunk the two lazy pages share `arena-scene-*.js` (`vite.config.ts`'s
  `chunkFileNames`), because Rollup would otherwise name it after whichever
  module it picked (`tiles-*.js`).

**Rationale.** The only faithful way to show how the arena draws a card is to
draw it *with the arena*. A viewer with figure code of its own would show
something the game does not, and it would drift the first time the arena changed —
which is today, because Tier 2 slice 4 is rewriting `FigureLayer`, `figureRigs`,
`props` and the duelists and adding a costume palette to `holoMaterial` on
another branch. So the workshop lives outside `arena/`, and its coupling is
narrow, written down and held by a test: the slice-4 rebase becomes a checklist
rather than a search. It is downstream only, because the arena is a renderer of
the frame stream (M7 convention 1). A workshop branch inside `Arena.tsx` would be
a non-game mode in the renderer. It is lazy for **D49**'s reason (it is `three`
and the arena's scene). It unmounts the mode app for **D94**'s reason: a hidden
board's `window` keydown listeners stay live, and the workshop's own keys (`Space`,
`.`, `K`, `V`, the arrows) would press OK, pass priority or switch the renderer
in a live game. Its keys are its own for the same reason as **D94**'s:
`keys.test.ts` requires every chord of `web/src/keys.ts` in the board's `?`
overlay. `W` is dispatched by `main.tsx` because the view belongs to `App` and
`Arena.tsx` is slice 4's desk. Capture phase means the arena's handler never sees
a key it has no branch for. Under `?arena=off`, `W` is the board's floating white
mana (M5), and the WebGL escape hatch must not lead to another WebGL page. It
**supersedes report 09 §10.7's never-built `/#/arena?cue=<id>` dev loop**. It
keeps the same loop (one cue on a card against a neutral table) and adds the
card's clips, its traits and a legibility number, without a route inside the
arena.

**Known cost.** Every export in the coupling list is a rebase item. The ones slice
4 rewrote — `FigureLayer`, `FigureRig` / `FigureRigMap`, `PropField`, `BustField`
/ `DuelistBust`, `instantiateFigure` / `ModelLibrary` — were re-checked on the
rebase and kept their shapes (below). The tuning panel's field list is written
out, and needed the costume's row.
The 2D entry chunk grew **0.89 kB gzip** (86.47 → 87.36 kB: the link, the `W`
dispatcher, the lazy stub and the keymap row's text; none of it is `three`). The
workshop is **24.07 kB** on top of the shared `arena-scene` chunk (339.87 kB),
the arena's own download is the same bytes plus about 1 kB of chunk overhead, and
the one stylesheet grew 1.36 kB. Camera cues are not previewed (the Helicarrier's
fly-in), and bloom works in single view only (the composer takes over rendering).
The detour loses the mode app's UI state, as **D94**'s does. Nothing in the
workshop needs the dev server, but it has been opened only there, not from a
built `dist/`.

**Reconciled onto Tier 2 slice 4 (2026-09-27).** The branch was rebased onto
`main`'s `23e26b3` (slice 4: the proportioned bodies, the costume palette, the
props fitted per body family, the duelists) and reconciled in one commit of its
own:

- **The coupling list, re-checked.** Every export it named kept its shape (a
  clean `tsc`), and the list gained the names the costume and the meter need:
  `BODY_STYLES`, `COSTUME_SLOTS`, `CostumeSlot` and `familyOf` (`props.ts`),
  `FigurePose` (`pose.ts`) and `COSTUME_ATTRIBUTE` (`holoMaterial.ts`). The
  costume reaches the pedestal with no workshop code: the pose carries it and
  `FigureLayer` writes it at commit (**D97**). The legibility meter finds a body's
  head as `prop-raster.ts` now does, by its skin and hair slots and the family's
  chin height, and still equals the test pixel for pixel. **The duelists stay off
  the pedestal** — a seat's, not a card's (**D99**): `CueRunner` is handed no
  busts and no `DuelistLayer` is mounted, and a test holds both.
- **The arena's `<Canvas frameloop>` had the pedestal's defect, and has its
  fix.** Reproduced in the arena before the change, headless on the GTX 1080 at
  `g1`@100: a viewport resize 80 ms into a batch froze it (0 frames in 700 ms,
  two steps stuck at 503 ms), and a resize after a batch had drained kept an idle
  table drawing (756 frames in 700 ms). `Arena.tsx`'s `loopRef` is now backed by
  state, as the pedestal's is: every mode `CueRunner` writes re-renders `Arena`
  once, and `<Canvas>` re-applies the current mode on renders of its own. **D72**
  holds as written — the prop is still the runner's ref, never a literal — and
  `liveness.test.ts`'s clause gained a fourth part: the ref is not a plain
  `useRef`, and its setter sets state (negative-controlled both ways).
- **The fizzle is fixed in the data** (**D104**'s known cost): `cues.json`, below.
- **`#cards` and `#workshop` link to each other** (the user's request). The card
  browser's detail panel has *View in 3D* → `#workshop?card=<exact name>`, live
  only for a card the catalog can show — a creature or a Vehicle, or another card
  with its own `cues.json` entry — and greyed, with the reason as its tooltip,
  otherwise. The workshop's header has *card text* → `#cards?open=<scryfall id>`
  when `art.json` has the id (no request is made to ask the library). The
  workshop reads `card=` from the hash's query first, as the browser reads its
  own, and keeps `#workshop?card=…` in step with the list. **`workshop/links.ts`
  is the one workshop module `cards/` may import, and it imports only the
  generated `catalog.json`**: the browser's chunk carries the catalog's names and
  nothing that draws, and `cards/` still reaches no arena (**D94**). So the answer
  is precomputed — `catalog.json`'s `threeD`, which the catalog tool writes from
  the card names `cues.json` has an entry for — rather than the browser importing
  the cue file. Its cost: a new per-card `cues.json` entry for a deck card is a
  reason to re-run `node tools/build-workshop-catalog.ts`, and the drift test says
  so.
- **The build**, against `main` @ `23e26b3`: the 2D entry chunk **87.40 kB** gzip
  (86.47, **+0.93**); `Workshop-*.js` 23.30 kB; `links-*.js` 2.69 kB, shared by the
  card browser and the workshop; `CardBrowser-*.js` 9.91 kB (9.67); the arena's
  download `Arena-*.js` 14.34 + `arena-scene-*.js` 347.96 = 362.30 kB against
  slice 4's single 359.81 kB chunk (+2.49: the shared chunk's split, and the
  state-backed `loopRef`).

**Rejected.** Report 09 §10.7's `?cue=` route inside the arena: a mode in the
renderer, on slice 4's desk, and one cue rather than a card. A `workshop` flag in
`Arena.tsx`, for the same reasons. Scene code of the workshop's own that poses a
rig directly: a second renderer, with coordinates outside `layout.ts`, the only
module that may know one. Keeping the mode app mounted and hidden (above). The
workshop's own keys as rows of `web/src/keys.ts` (above). A `W` branch in
`Arena.tsx`'s handler (slice 4's desk). A static import (**D49**).

---

## D103 — Tuning is browser-local: overrides live in `localStorage`, pass the arena's own validators, and leave the page only as a copy of the committed text

**2026-09-27** (the workshop, **D102**; written up by its documentation pass.
Within CLAUDE.md's *The user commits* and Tier 2 slice 3's convention 1)

**Decision.** The workshop's tuning panel edits two things for the card on the
pedestal. One is its **`traits.json` row**: every field `validateTraits` accepts
(`scale`, `hover`, `idle`, `tint`, `accent`, `shade`, `turn` + `turnedRatio`,
`props`, `swarm` + `formation`, `silhouette`, `shrink`, and since the
reconciliation onto Tier 2 slice 4 its `body` flag and its **`costume`**: a row
per slot of `COSTUME_SLOTS`, each a colour or `tint`, with the swatch drawn in
the pose's palette and a label saying whether the slot is this card's, inherited
down the ladder, or filled by `costumeOf`). The other is the
**`params` of its `cues.json` entry's selectors**.

- **Overrides live in this browser, never in the repo.** They are stored in
  `localStorage` under `mtg-table.workshop.overrides`, with every access inside
  `try`: a storage that throws keeps them for this page only, and a malformed
  value is no override. **Only the workshop reads them.** The arena and the board
  draw the committed files and nothing else. The card last looked at is
  remembered under `mtg-table.workshop.card`, as a convenience.
- **Applied the only way the arena would see a change** (`workshop/tuning.ts`).
  The committed file is copied, the card's row (or the selector's `params`) is
  replaced, and the copy goes through the arena's own validator:
  `validateTraits`, or `validateCues` with the registry's ids as `Arena.tsx`'s
  `useCueData` does (`workshop/validated.ts`). A refused row is dropped and the
  ladder falls through exactly as it would in the arena. The panel prints the
  validator's own message.
- **The page's output is two copy buttons.** "Copy as traits.json row" and "copy
  as cues.json entry" each print the card's **raw committed** row or entry with
  only the edited values replaced:
  - every key stays in its original order, with the comment keys (`_note`,
    `_t11`, `_station`, …) kept, and for `cues.json` `presence` and `station`
    kept too;
  - a field added by the override goes after the row's last data key;
  - the text is in the files' own style: the name at four spaces and one key
    per line at six — for `cues.json` each value inline, for `traits.json`
    (re-written by slice 4 as `JSON.stringify(…, null, 2)`) arrays and the
    `costume` block opened out one item per line.

  So an unedited copy is the committed text byte for byte, and a paste changes
  only the edited lines. **Both buttons are disabled while the validator names
  the card.** When the clipboard is unavailable, the text appears in a read-only
  box to copy by hand.
- A concealed entry has no tuning (hard rule 8: it is anonymous by rule). An
  attachment's look and a land's tile are `figures.json`'s tables, not traits,
  and the panel says so. `turnedRatio` reads **"required, not set"** for a turned
  row without one, rather than showing an inherited number the validator would
  not accept.

**Rationale.** The user commits their own work. A page that writes the repo would
be a browser write path that nothing else here has, and it would skip the check
a row must pass. `npm --prefix web test` runs `traits.test.ts`'s validation, its
census and its both-seat raster (**D83**). The paste-then-test loop keeps that
test in the path. The overrides go through the validator so the pedestal never
shows a look the arena would drop. They are workshop-only because a renderer
that draws something other than the frame and the committed data is *a renderer
that remembers*, the defect Tier 2 convention 1 names: a tint tuned last week
appearing in a live game is a state nobody committed. The copy is the committed
text because the first pass built it from the params panel's selector list,
which leaves out `presence`, `station` and every comment. Pasting the Doombot's
export dropped its hover, and pasting Web Up's dropped its cocoon
(`docs/evidence/workshop.md`, the fix pass). A paste replaces the whole row, so
the row's reason, its `_note`, has to come with it.

**Known cost.** **An override masks the committed row in this browser until it is
reset.** Right after a paste the two are equal, but a later change to the file is
hidden while the override stays, so press *reset* once the row is in the file.
Overrides are per browser profile, shared with no one, and seen by no test. The
field list is written out in `Workshop.tsx` rather than derived from the
validator, so a new trait key needs a row there — slice 4's `costume` and `body`
were the first, added on the reconciliation, and `workshop.test.ts` now fails
when `validate.ts`'s `TRAIT_KEYS` names a key the panel does not write. Only a
card's own `cards` row and its existing selectors' `params` are tunable. `cue`,
`ms`, a new selector, the archetype rungs, `figures.json` and the `cues.json`
archetypes are edited in the files. Cue params are raw JSON per selector, and
half-typed JSON waits.

**Rejected.** A dev-server route that writes `traits.json` / `cues.json`, a
writing cousin of **D92**'s: above. A download of the whole patched file: a
stale tab would carry every other row's old text with it, where the clipboard
carries one row. Overrides applied raw, without the validator. A key the arena
reads too, so a tuned look shows in a game: above. The copy built from the
parsed selectors: the first pass's defect, above.

---

## D104 — The pedestal's boards are SYNTHETIC FRAMES from one pure builder, folded through the real reducer; card facts come from the corpus, and what only the engine could choose is labelled as the workshop's

**2026-09-27** (the workshop, **D102**; written up by its documentation pass.
Within M7 convention 1, **D50**, **D56**, **D63** and the *Scope* rule)

**Decision.** `web/src/workshop/synthetic.ts` is **the one place the workshop
makes a `ClientState`**, and the only workshop module that imports the reducer as
a value (`workshop.test.ts`).

- **The resting board** (`pedestalState`). The builder writes the frame a game
  would have sent — the card on its seat, and its copy on the other seat in
  "both seats" mode — and folds it through `reduce`. The card stands in a stance
  (`ready`, `tapped`, `sick`, `attacking`, `blocking`), with a Soldier-token host,
  wingman or target dummy where the card needs one. Card ids and stack ids stay
  in separate spaces, as on the wire.
- **A rehearsal** (`rehearse`) is an event batch and the two boards it joins.
  The `before` board is the one a `resolved` aims from (**D63**'s one frame of
  look-behind) and the `after` board is the one the batch is enqueued against.
  Both are handed to the real `CueQueue.enqueueBatch`, as the arena's intake
  does. There are **24 kinds**, from *enters* to *crewed, blocks*, offered per
  card by what it is on the table (creature, Vehicle, other permanent,
  attachment, land, spell) and by concealment. The events are the shapes the
  corpus shows Forge sending:
  - an attack is one `attackers` event naming the band's defender;
  - a death in combat is a `damage` event, then a `zone` move to the graveyard;
  - a trigger is a `cast` whose card is the permanent itself;
  - a Vehicle is crewed (`Artifact Creature - Vehicle`, Forge's own rewrite)
    before it attacks or blocks.
- **What the ladder did, read back** (`cueRows.ts`). Each rehearsal's batch goes
  through `selectorsFor` / `resolve` / `cuesFor`, and the panel shows:
  - which rung answered (card, archetype or default), the cue id, its length and
    the clip it plays;
  - when the rung order outranked a *more specific* selector on a rung below;
  - `unreachedSelectors`, any selector of the card's own entry that no rehearsal
    reaches.
- **A clip on its own is a cue.** `workshop.clip` is added to a **copy** of
  `REGISTRY` (`workshopRegistry`), and a synthetic `stats` event is resolved to it
  by a one-row cue-data override. It writes a `ClipRequest` with the registry's
  envelope, scratch object and reduced-motion rule, and writes no offset and no
  effect. The queue's pause, step, skip, speed and reduced motion therefore apply
  to it exactly as in a game (report 13 §3.4). `REGISTRY` itself is untouched.
- **Card facts come from the corpus.** `workshop/catalog.json` is generated by
  `node tools/build-workshop-catalog.ts` from `decks/*.dck` and every `state`
  frame of `fixtures/games/*.jsonl` (`catalogBuild.ts` is the pure half) — and,
  since the reconciliation, the card names `cues.json` has an entry for, which
  decide its `threeD` (the card browser's *View in 3D*, **D102**):
  - the modal type line, cost and P/T are taken over **off-battlefield**
    sightings, which is the printing — Peggy's battlefield power is −3 under
    Quantum Reduction, her printing 2/1 — with the battlefield's as the fallback;
  - only face-up, named cards are read.

  `workshop.test.ts` rebuilds the file and fails on drift, and `--check` does the
  same from a terminal. The list is the ten decks' **41** cards, the **5** tokens
  the corpus saw, **11** generic archetypes and the **two concealed shapes**: a
  face-down creature (the full branch with an empty face) and the five-key stub.
  A deck card the corpus never showed face up (`Giant Growth`) is listed and
  previewed as a generic card of no type.
- **What only the engine could choose is labelled as the workshop's.** The
  engine says what a spell or a trigger TARGETS, what a blocker blocks and who
  crews a Vehicle. On the pedestal the workshop says it: the dummy, the other
  seat's copy, an Aura's host, a Soldier token. Each rehearsal carries a
  `fiction` line, and its ▶ button shows that line as a tooltip.

**Rationale.** The arena is a renderer over a frame stream (M7 convention 1). The
honest way to show "a card as it appears on the table" is to produce the frame.
`layout`, `figurePose`, `FigureLayer` and `CueRunner` cannot tell it was not
Forge's, so every arena rule holds on the pedestal with no workshop code saying
so: the anonymous disc, the stub with no figure, the stances as poses (**D56**),
the death drawn until its cue ends (**D64**), the attacker facing its defender
(**D82**). The tests *assert* it rather than assume it. Every rehearsal of every
card, single-seat and both seats, plays through the real queue and decays to
identity: 1,376 batches and 2,432 cues in `docs/evidence/workshop.md`. The
builder is pure so `node --test` drives it and prints the census every run.

The facts come from the corpus because the ladders key off the **wire's**
spelling (the type line's subtype words), which is Forge's. `art.json` carries no
facts. The card library (**D90**) is dev-only, needs a network build, spells type
lines as Scryfall does, and nothing may depend on it. The facts are taken off the
battlefield because continuous effects make the battlefield's P/T the game's,
not the card's.

This is not rules logic in the client (*Scope*). Nothing is sent to an engine and
nothing decides legality. The frames are a display fiction on a page with no
transport, and their shapes are copied from what Forge sent.

**Known cost.** The rehearsals are only as good as the corpus shapes they copy: a
transition Forge would send differently would be wrong silently, and the
engine's choices (aim, blocks, crew) are invented, though labelled. A synthetic board is one card's world, so a crowded rank, a wrapped
back row or the width clamp under pressure show only in "whole table" with the
card and its dummy. `catalog.json` is generated and committed, so it drifts when
a deck or a fixture changes; the test says so, and the tool is re-run. The
workshop surfaced one data question and left it with the cue data's owner:
§7.3's rung order lets a card's bare `resolved` beat the defaults' more specific
`resolved:fizzled`, so a fizzled Helicarrier Strike plays its full strike. That
fix is a `cues.json` edit, not the workshop's — **made on the reconciliation**
(2026-09-27): the three deck spells with a bare `resolved`, Helicarrier Strike,
Pym Particles and Depower, carry their own `resolved:fizzled` → `resolved.fizzle`,
and `workshop.test.ts` asserts every deck spell's fizzle plays the fizzle
(negative-controlled by taking the three rows out). A *trigger* that fizzles is
not rehearsed, so the per-card `resolved` of a permanent (Quake's shockwave,
Wasp's beam, Web Up's cocoon) would still outrank one: PLAN.md's workshop
follow-up 15.

**Rejected.** Scrubbing a recorded fixture to a frame where the card is on the
battlefield, which is slice 3's *"look at it"* step. It is still how a card is
checked in a real game, but it cannot isolate one card, choose its stance, or
replay a transition the corpus never recorded for it. A scripted Forge session
per card: a JVM for a picture, and the bridge's job is games. Posing a rig
directly, bypassing `layout` and `figurePose`: a second renderer (**D102**).
Facts from `art.json` or from the card library (above). Modal facts over every
sighting (Peggy at −3). `workshop.clip` added to `REGISTRY` itself: an arena
edit, and a cue id in the game's registry that exists only for a dev page.

---

*Match setup's four decisions are numbered **D105–D108**: while its branch
(`match-setup`, off `0368a90`) was open, `main` committed **D90–D94** (the card
library), Tier 2 slice 4 wrote **D95–D101** and the workshop wrote **D102–D104**,
all above. The branch was rebased onto `main`'s `23e26b3` (2026-09-27) with
these four as D102–D105, and then onto `bf0392b` the same day, where the
workshop had landed first; as the workshop's own D102 says, the side that lands
second renumbers, so they moved up three. The branch's fix pass first wrote
D105 and D106 as D90 and D91.*

## D105 — The AI's deck NAME is public on the wire; its list, its path and its hash never are

**2026-09-27** (match setup, protocol amendment **M44**; a new surface under
hard rule 8, beside **§8.1**'s nulled header entry)

**Decision.** `hello_ok.match.aiDeck` is exactly `{name, cards}`: the `.dck`
file's own `[metadata] Name=` (its base name when it has none) and its main-deck
card count. Never a `path`, a `sha256` or a list. The board prints the name on
the AI's rail. `tools/check-redaction.mjs` holds the object to those two keys and
cross-checks the count against the session header, and the hold is
negative-controlled: `fixtures/negative/redaction/m44-*` is a well-formed block
(the control, which must pass) and three one-defect probes — `aiDeck.path`,
`aiDeck.cards` as a list of names, a `yourDeck.path` the header contradicts —
which `tools/check-redaction-selftest.mjs` requires by name, so a regenerated
manifest cannot drop one quietly.

**Rationale.** It is what a real table says out loud. A player sitting down
against a stranger asks "what are you on?", and the answer is a name; a hobbyist
learning the game against the Doom Legion is better off knowing that is what
they face, and the rail was the one place the match could say so. The count is
already public (every seat's `library.count`, hand count and zones are on the
wire). The list is not, and it stays where §8.1 put it: the session header nulls
the other seat's `path` and `sha256` because a path plus a hash identifies a
decklist exactly, and a path alone names a file anyone can open.

**Known cost.** `Name=` is free text from a file, and the bridge does not gate it —
a string on the wire that never passes through `Snap`. **A deck named after a card announces
that card**, exactly as saying the name at a table would; the rule is the table's
rule, and no sanitiser could tell a theme from a list. The bridge does not
second-guess what a deck file calls itself.

**Rejected.** Leaving the AI's deck off the wire (the rail could not say what
you are playing against, which is the one thing match setup exists to choose).
A bridge-minted label ("deck 2"): no information, and the player chose the deck
by its file anyway. The path, or the path and hash: §8.1.

---

## D106 — Only `scripts/play.sh` reads `config.json`'s `match` block; the bridge and the gate keep their own defaults

**2026-09-27** (match setup, protocol amendment **M44**)

**Decision.** `config.json` gains `match: {deck, aiDeck, aiProfile, games}` —
shipped as your `decks/pacho-shield.dck` against **`decks/doom-legion.dck`**
under `Default`, three games — and **`scripts/play.sh` is its only reader**:
a bare `./scripts/play.sh` plays the Doom Legion, and a flag wins over the block.
`mtgtable.MtgTable` does not read it (it still reads the top-level `deck` and
`manaLostPrompt`, as before): with no `--ai-deck` the AI plays a mirror of your
deck under `Default`. `tools/check-all.sh` and `tools/ten-games.sh` pass every
deck and profile they mean on the command line, and the villain deck the gate
plays is named once, in `tools/villain-deck.sh`, not read from the block.

**Rationale.** The gate must play the same games whatever the player last chose.
`config.json` is committed and is also where a player expresses a preference; if
the bridge read the block, editing it to try Reckless would move step 6's
value-level diff, 9b's drift check and every seeded gate row, and a green gate
would mean "green for this afternoon's config". `play.sh` is the human's
command, so the human's defaults belong to it.

**Known cost.** Two defaults for one question: `./bridge/run.sh mtgtable.MtgTable`
with no flags plays a mirror, `./scripts/play.sh` plays the villains. Both say
which on their first lines (`deck (ai) = … (a mirror: no --ai-deck)`; play.sh's
`== match` block), and README, the play.sh header and `decks/README.md` say it.

**Rejected.** The bridge reading the block (above). Every gate JVM line pinning
`--mirror --ai-profile Default` so that the bridge could read it: a flag on
every JVM line in the gate to neutralise a file the gate should never have read.

---

## D107 — The AI's profile is always an explicit `profileOverride`, named from the `.ai` files, through one seam — and it is not a difficulty

**2026-09-27** (match setup, protocol amendment **M44**; report 11 §9 is the
spec, `docs/evidence/match-setup.md` §B and §P the measurements)

**Decision.** `--ai-profile <name>`, on `mtgtable.MtgTable` and on
`scripts/play.sh`, names one of the `.ai` files in `forge-home/res/ai/` —
`Default`, `Cautious`, `Reckless` and `Experimental` in 2.0.14. It is matched
case-insensitively and returned in the file's own spelling by
`Bootstrap.resolveAiProfile`, which runs **before** `FModel.initialize`, so a name
that is not a file exits in about a second with the list of the ones that are.
Every AI seat in every process — `MtgTable`, `RecordMatch` and `Smoke` — is
seated by **`Bootstrap.createAiPlayer(name, avatar, profile)`**, which refuses an
empty profile, asserts that `AiProfileUtil.getAvailableProfiles()` loaded it, and
calls the three-argument `GamePlayerUtil.createAiPlayer(String, int, String)`
**[jar]**. With no flag the profile is `Default`, passed explicitly.
`tools/lint-bridge.sh` §1 allows `GamePlayerUtil.createAiPlayer` in
`Bootstrap.java` alone, and bans the method reference and a static wildcard
import of `GamePlayerUtil`, the two spellings a grep for the call would miss.
The four files are the whole offer: no "Random" entry, no simulation
`AIOption`, no `FPref.MATCH_AI_TIMEOUT`. The profile is fixed for a session:
the bridge creates the AI's `LobbyPlayerAi` once, before the match starts, so a
New Game keeps it. The gate (`tools/ten-games.sh` rows 11–14, one per profile,
and `check-all.sh` step 9e) holds that the profile **reaches** the engine —
`PLAY_AGGRO` and `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS`, read back from the in-game
AI player through `AiProfileUtil.getProperty(Player, AiProps)`, must equal the
`.ai` file's — and that no preferences file moved. Nothing asserts that one
profile plays differently from another.

**Rationale.**

- **The call it replaced could save the preferences file.** Every entry point
  used to call `createAiPlayer(name, avatar)`, which delegates with
  `profileOverride = ""`. In the five-argument overload an empty override takes
  the branch at bytecode offsets 28–83 (javap, 2.0.14 jar): it reads
  `FPref.UI_CURRENT_AI_PROFILE`, and when that value is not in
  `AiProfileUtil.getProfilesDisplayList()` it prints a line, sets `"Default"` and
  calls **`ForgePreferences.save()`** — which writes every in-memory decision
  `Bootstrap` makes (**D13**, **D14**, **D43**'s mana-lost prompt) to disk, the
  persistent edit CLAUDE.md forbids. A non-empty override jumps straight to
  offset 120. The branch had never fired here only because no preferences file
  had ever held another value; in a scratch forge home a negative control made
  it write an 8,045-byte `forge.preferences` with D13 and D14 in it (evidence
  §B.2). "The file happened to be absent" is not a rule. One seam and a lint are.
- **The three-argument overload rather than the five** because it is the path
  the old call took, sleeve index and all (`HeadlessGuiBase.getSleevesCount()` is
  0, so neither draws from `MyRandom`). A seeded `Default` game is the game it
  was: gate step 6's value-level diff of a fresh `RecordMatch` against
  `fixtures/games/g1.jsonl` stayed empty.
- **The load assertion and the read-back** because
  `AiProfileUtil.getAIProp` silently returns each property's built-in default
  for a profile it holds no map for. A file that failed to load would play the
  game on defaults while every line of output named the profile. "The name went
  in" and "the numbers came out" are two claims, and the gate checks the second.
  `CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS` is the key read because it differs in all
  four files (90 / 25 / 75 / 100).
- **Validated before the boot** so that a typo costs a second, not an engine
  start.
- **Not a difficulty.** Forge has none, and the flag is named for what it is.
  Each file is 121 heuristic values; Cautious and Reckless differ in 63 of them.
  Their measured effect is situational. The automated seat attacks with
  everything every turn, so it rarely leaves a blocker up, and in same-seed
  pairs against it Cautious and Reckless were not measurably different. Against
  a seat that leaves untapped 2/2s, all 10 pairs parted on an AI choice, and in 6
  the first was a trade Reckless took and Cautious declined
  (`PLAY_AGGRO` / `CHANCE_TO_ATTACK_INTO_TRADE`, `true`/`100` against
  `false`/`0`; evidence §P). README, `scripts/play.sh`'s header and
  `decks/README.md` say so.

**Known cost.** A player who wants "harder" has no dial. The profiles are not
ordered, and the knobs report 11 §9 names as stronger — the simulating AI
(`AIOption.USE_HYBRID_SIMULATION` / `USE_FULL_SIMULATION`) and
`FPref.MATCH_AI_TIMEOUT` — are not exposed. Changing the profile means a new
session.

**Rejected.**

- Keeping the two-argument call: safe by accident (above).
- Setting `UI_CURRENT_AI_PROFILE` in memory and leaving the override empty. That
  steers a branch whose other arm saves by mutating a second pref; the override
  is the parameter Forge provides for exactly this.
- The five-argument overload: a different call path, and its `AIOption` set is a
  different knob from this one.
- Forge's "Random (Every Match)" and "Random (Every Game)". Both draw from
  `MyRandom`, which would make a seeded run's profile a function of the shuffle,
  and neither is a file. A picker that wants them resolves one itself (report 11
  §9 says how).
- A difficulty scale ("Easy / Normal / Hard") mapped onto the profiles. Forge
  has none, and nothing measured here orders the profiles, so the label would
  promise what no measurement supports.
- A gate assertion that Reckless attacks more than Cautious. It would be flaky by
  construction — a same-seed pair can split first on the seat's own wall-clock
  re-push (evidence §P.4, seed 31) — and an attack total was never the measure.

---

## D108 — The AI's own deck is Doom Legion: blue-black villains from the user's two sets, and a card stays only if the AI casts it and the redaction gate passes

**2026-09-27** (match setup; `decks/README.md` is what the deck is, report 08
§8 its card-by-card fidelity, `docs/evidence/match-setup.md` §D what was run)

**Decision.** The deck the AI plays is `decks/doom-legion.dck`, *Doom Legion
(Marvel Super Heroes villains)*: 40 cards, 17 lands and 23 spells, blue-black.
Its 17 creatures are all Villains — Doctor Doom and his Doombots, HYDRA, three
of Kang's identities, Loki and Crossbones — and it carries four removal spells
(Doom Blade, Dark Deed, Hour of Defeat, Frozen in Ice). It uses MSH (33 cards)
and MSC (7) only, every line carries its set code, nothing has more than two
copies and the seven legendaries are singletons; the curve is `1:2 2:7 3:6 4:6
5:1 6:1`. **Four rules decide what may be in it**, checked in this order:

1. Forge 2.0.14 has a script for the card, the card is not unsupported, and the
   deck is Limited-legal (`tools/check-deck.mjs`'s engine pass).
2. The card has no `AI:RemoveDeck:All`, Forge's own flag that its AI cannot play
   it.
3. The Forge AI actually **casts** it, counted over `--transport auto` games.
4. A game in which the AI plays it passes `tools/check-redaction.mjs` with no
   flags.

The gate plays the deck: `tools/villain-deck.sh` names it once, for
`tools/ten-games.sh` rows 11–14 and `check-all.sh` step 9e, so a change to the
list is a gated change. `scripts/play.sh` seats it against you by default
(**D106**); the bridge on its own still plays a mirror.

**Rationale.**

- **The same two sets as the user's deck.** The user is learning Magic with
  Marvel Super Heroes. An opponent from the same sets shows the same mechanics —
  power-up, connive, Hero and Villain typing, Plans — from the other side of the
  table, and everything already built for those sets applies unchanged: the art
  ladder (`msh → msc`), report 08's fidelity method, the arena's archetype rungs.
- **Blue-black, because that is where MSH's villains are.** Doom and HYDRA are
  black; Kang, Loki and the Doombots are blue; Kang, Temporal Tyrant is the gold
  card between them. Super Villain Lockup is white — a hero's card — and the
  three-colour Dooms and Lokis are out.
- **Built against Pacho's plan.** Pacho wants to attack alone. Doom Legion goes
  wide, and its menace tokens each need two blockers, so a lone attacker meets a
  board. It has four answers for Pacho's key pieces, and Doom Blade always has a
  target because every creature and token Pacho makes is nonblack. Fliers meet
  fliers.
- **Villain is the engine here, not decoration** (report 08 §8.2). Five cards
  key off the type — Baron Strucker, Doom Reigns Supreme, Crossbones, Visions of
  Villainy and Villainous Hideout — and both token kinds are Villains for all of
  them, so the deck exercises the subtype that Pacho's deck carries only as text.
- **40 cards and 17 lands:** the size, and the Limited conformance, of Pacho's
  deck, and a land count for a curve that tops out at six.
- **Rules 3 and 4 were learned by cutting a card each.** **Kang Prime** is
  scripted correctly, but its `DigUntil` reveals the AI's library cards while they
  are still in the library, and the gate's A3 cannot tell that reveal from the
  largest leak there is: 2 of 10 recordings failed. The deck changed and the gate
  did not — `--opponent-library-ok` is never passed to make a recording green —
  and Pharaoh Rama-Tut, another Kang, took the slot. **Trickster's Stratagem** is
  scripted correctly and the AI never casts it: no AI cast in 21 games, and none
  from 14 copies over 61 turns in a probe. That made the deck 39 live cards, so
  Crossbones took the slot. After both swaps, **all 20 nonland cards reached the
  stack from the AI's side** in 38 games.

**Known cost.**

- Dark Deed was cast once in those 38 games; the AI holds it. It is the next
  swap if a later census shows it never leaving the hand.
- Two paths no recording has reached: Kang the Conqueror's power-up (an extra
  turn, which no recording in the repo contains) and Castle Doom's Doombot
  ability.
- Rule 4 keeps out every card whose script reveals the top of a library the
  viewer does not own, until A3 learns `GameAction.reveal`'s window (report 08
  §8.3; a question for report 06 and `check-redaction.mjs`).
- The arena has identity rows only for Aerial Doombot, which is in Pacho's deck
  too. The other villains stand on the subtype and archetype rungs until
  `figures/traits.json`, `figures.json` and `cues/cues.json` rows are added — a
  follow-up owed after the arena branches merge (PLAN.md, *Match setup*).
- It is tuned neither to win nor to lose, and nothing here measures how hard it
  is: the AI won every game against the automated seat, which is a policy, not a
  player.

**Rejected.**

- A mirror of your own deck as the default opponent. It stays the bridge's
  default, for the gate's sake (**D106**), but it teaches nothing about an
  opponent that is not you.
- Cards from outside MSH and MSC: the user's two sets are the point (above).
- Kang Prime, and loosening A3 to keep it. Trickster's Stratagem. Baron Helmut
  Zemo (`AI:RemoveDeck:All`). Super Villain Lockup (white). Loki, the Deceiver
  and Doctor Doom, King of Latveria (three colours). Lady Loki, Loki's Scepter
  and Loki Laufeyson (red). Report 08 §8.4 has the table.

---

*The engine-upgrade decisions are numbered **D109–D112**, on the `engine-upgrade`
branch (cut from `754f504`). While it was open, `main` committed Tier 2 slice 4's
**D95–D101**, the workshop's **D102–D104** and match setup's **D105–D108**, all
above; the branch was rebased onto `main`'s `a092d3a` (2026-09-27), where those
fourteen numbers were already taken, so these four kept the numbers they were
written with. The `hardening` branch also numbered its own decisions from
**D109**; whichever of the two lands second renumbers its own, and `hardening`
landed second, as **D113–D115** (below). They are cited from
this file, PLAN.md's *Engine and sets*, README.md, CLAUDE.md, NOTICE,
`decks/README.md` and one usage comment in `tools/check-deck.mjs`, and nowhere
else in code.*

## D109 — The engine stays Forge 2.0.14 until an OFFICIAL Forge release ships Reality Fracture: no daily snapshot, no merged port, no card-script overlay

**2026-09-27** (branch `engine-upgrade`. Report 14,
[`docs/research/14-engine-upgrade.md`](docs/research/14-engine-upgrade.md), is the
long form and the plan for the day; `docs/evidence/engine-upgrade.md` is what was
measured. Builds on **D2**, which it does not change.)

**Decision.** mtg-table keeps running Forge 2.0.14 at `~/forge` — the jar
`config.json` names today — and does nothing to make Reality Fracture (Scryfall
`fra`, released 2026-10-02; Forge edition code `FRA`) playable before an official
Forge release ships the set. Concretely: no port of the bridge to Forge's daily
snapshot is merged or wired into `config.json`; no card script, hand-written or
Forge's own, goes into `forge-home/custom-cards/` (**D111**); no committed fixture
is re-recorded; and the user's deck is not edited to dodge what the old engine
lacks. What the tree gains is **preparation that nothing at runtime reads**: the
user's pool as `decks/fra-rw-aggro.dck` (and `.txt`), a draft opponent
(**D112**), `tools/audit-deck.mjs` (per card: ok, missing or broken, on any jar),
`tools/javap-seam-diff.sh` (the bridge's seam between two jars), and the bridge
port to the snapshot as a **patch file** with the seam diff it answers to
(`docs/research/patches/`). The switch, when it comes, is report 14 §0's
checklist, under **D110**'s pin policy.

**Rationale.** The user's own words, stated after the spikes had begun: *"Let's
not break anything to force in the latest cards. I'm sure things will be available
through official channels soon enough, so no need to create unnecessary friction
and work for ourselves."* The measurements reach the same place on their own:

- **2.0.14 alone** builds 19 of the deck's 50 copies (40 main + 10 sideboard): the
  17 basics, Woodwork Prodigy and Austere Command. The other 31 do not exist in
  that engine, and Forge drops a missing card from the library silently
  (`Match.prepareAllZones`).
- **2.0.14 plus the snapshot's 249 FRA scripts as a user overlay** was the only
  candidate that kept the engine, and it fails. All 249 parse, but three of the
  user's cards — No Admittance (main), Hexhaven Battalion and Way of the Pyromancer
  (sideboard) — use `ApiType.Empower`, which 2.0.14 does not have.
  `CardFactory.getCard` throws at zone preparation, the sideboard is built too, and
  the exact deck played **0 turns** at seeds 7, 8 and 9. With those three removed,
  2.0.14's AI threw 17 swallowed `NullPointerException`s in 10 games on the set's
  new haste statics, and a script parameter the old engine does not read is
  ignored without a word — "builds" is not a rules review.
- **The daily snapshot `2.0.15-SNAPSHOT-09.27`** builds all 50 and played 29
  games with 0 exceptions. But it is a daily build; the bridge does not compile
  against it unchanged (`IGuiGame`'s abstract set went from 37 members to 28, and
  `IGameController.passPriority()` is gone); on it a latent race in the bridge's
  M6 next-game lifecycle killed a game at birth in 2 of 6 three-game sessions (0
  of 5 on 2.0.14); and it orders `stats.cardIds` differently, which fails gate
  step 6 on any machine and would force a re-record of `g1`.

So the one path that avoids a development build does not play the deck, and the
path that plays the deck is a development build. Waiting costs only time: the day
a release ships the set, the switch is a short, rehearsed list rather than a
project.

**Rejected.** The overlay (above, and **D111**). Porting to the daily snapshot now
(a development build, a race, a forced re-record). Running two engines side by
side (two configurations to keep green, and every fixture's engine ambiguous).
Editing the user's deck to remove the three Empower cards (it is the pool as the
user built it, and swapping the main-deck card alone was measured not to be
enough: the sideboard's Empower cards crash the game the same way). Hand-writing
the 31 missing cards (**D111**).

**Known cost.** The user cannot play the pool in mtg-table until Forge releases
it. `decks/fra-rw-aggro.dck` sits in `decks/` and does not play (its `.txt` says
so, and `node tools/audit-deck.mjs decks/fra-rw-aggro.dck` reports 19 ok, 31
missing and exits 1); it also shows in the dev card browser, unresolved until the
card library syncs `fra`. The bridge and gate defects the spikes found are latent
on 2.0.14 and are PLAN's *Engine and sets* follow-ups, not part of this decision —
except that the next-game race must be fixed **before** any engine switch.

## D110 — The engine pin: official Forge releases only, one engine at a time, identified by its bytes and sha256, never installed over `~/forge`

**2026-09-27** (with **D109**. Extends **D2**. The mechanism for the day —
`tools/forge-engine.json`, `tools/get-forge.sh`, a relative `forgeJar`, a
`check-forge.sh` assertion — is report 14 §5.2, **specified and not built**.)

**Decision.**

1. **What may be the engine.** Only an asset of a **tagged Card-Forge/forge
   release** — never the rolling `daily-snapshots` build, never a source build
   (D2). A daily build may be *measured* — in the session scratchpad or a
   throwaway Forge home under `var/`, through `FORGE_JAR=` — but it is never named
   in `config.json`, never the target of a merged bridge change, and never the
   engine of a committed recording.
2. **What pins it today.** `config.json`'s `forgeJar` (an absolute path;
   `FORGE_JAR` in the environment overrides it) and the identity the file must
   have: `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, **39,383,858
   bytes, sha256 `3c0a7c385b9207e593fe149255e00d1cd7e556809f138568d07e3828b78e5dd9`**,
   manifest `Implementation-Version: 2.0.14-SNAPSHOT-08.08`, `build.txt`
   `2026-08-08 22:49:26`. `tools/check-forge.sh` prints the sha256 and every
   recording's session header carries it as `forgeJarSha256` — all 18 committed
   `fixtures/games/` recordings name this one. Nothing *asserts* it yet; that is
   part of the day's change.
3. **One engine at a time.** The previous engine survives only as an untouched
   install and a `git revert` of `config.json` (and of the bridge port) away — never
   as a second supported configuration.
4. **Never over `~/forge`.** A new release is unpacked beside, under the repo's
   gitignored `var/forge-engine/<version>/` (report 14 §5.2's layout); `~/forge` and
   `~/.forge` are never written, before or after a switch.
5. **A version change is a hand-written, reviewed change** that records where the
   bytes came from — URL, archive and jar bytes and sha256, date, licence, as
   `tools/assets-manifest.json` does for models — never an auto-update and never a
   "latest" URL. The switch is its own commit; re-recording a fixture is a separate
   commit and a separate decision (report 14 §5.4).

**Rationale.** The committed fixtures, the ten-games turn counts and every
evidence file are measurements of one engine build, and a sha256 is the only
identity that survives a retag or a renamed file. The version string is not one:
2.0.14's own manifest reads `-SNAPSHOT-08.08` and its
`BuildInfo.isDevelopmentVersion()` is true (spike A), so *"is this an official
release?"* is answered by where the archive came from, and *"does this engine load
the set?"* by `tools/audit-deck.mjs` — which is also the check for the trap report
14 §5.1 names: `CardStorageReader.collectCardFiles` skips `upcoming/` outside a
development build, and 249 of FRA's scripts live there in the snapshot. Keeping
`~/forge` untouched makes rollback a one-line revert and keeps the user's own Forge
working whatever this repo does.

**Rejected.** Tracking the daily build (**D109**). Pinning by version string alone
(above). Installing a release over `~/forge` (it is the user's install, and it is
the rollback). Committing the jar (D2: GPL redistribution obligations; `*.jar`
stays gitignored). **Deferred rather than rejected:** writing `get-forge.sh`,
`forge-engine.json` and the `check-forge.sh` pin assertion now — they would name a
release that does not exist yet, and moving the pin into the repo is the user's
call on the day (PLAN, *Only the user can decide*).

## D111 — No hand-written card scripts, and no overlay of a newer engine's scripts: a card the pinned engine lacks is absent until a release ships it

**2026-09-27** (with **D109**. Applies **D14**'s last clause — *"A second overlay
script is a decision to re-open here, not a file to drop in"* — to new sets, and
answers it for them.)

**Decision.** Nothing goes into `forge-home/custom-cards/` to make a card exist
that the pinned engine does not ship: neither a script written by hand in Forge's
card DSL nor a copy of Forge's own script taken from a newer build.
`forge-home/custom-cards/` keeps exactly one file, D14's corrected A.I.M.
Scientists, and with it the only justification hard rule 11 gives for
`ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`. A deck may name cards the engine lacks;
it then does not play, and `tools/audit-deck.mjs` says so card by card instead of
Forge dropping them silently. A draft script, if one is ever wanted for review,
lives under `docs/drafts/` and is never loaded. **None was needed for Reality
Fracture:** all 285 of the set's names, and all 26 in the user's deck and
sideboard, have Forge's own scripts in the 09-27 snapshot, so there is nothing to
draft.

**Rationale.** A hand-written script is a second, unreviewed rules implementation
of a card Forge will ship its own version of within weeks — the "unnecessary
work" the user ruled out, and a silent divergence of exactly the kind D14 exists to
remove. An overlay of Forge's newer scripts is worse than it looks. Measured on
2.0.14, 36 of the 249 new FRA scripts cannot be built (34 on `Empower`, two on new
`StaticAbilityMode`s); one unbuildable card takes the game down before turn 1,
even from the sideboard; and a parameter the old engine does not read is ignored
without a word, which no build check can see. It would also force a user edition
file replacing stock FRA with a `CUSTOM_SET`, and relax deck conformance for ~250
custom cards instead of one. The premise that three of the deck's cards were
unscripted upstream was a lookup-by-file-name artefact (249 scripts live under
`upcoming/`, and 22 prepared cards' files carry both faces' names), so there was
never a gap to fill.

**The door that stays open.** A correction to Forge's own script for a card the
engine already ships and gets wrong — D14's case — is still possible, as a new
decision naming the card and carrying the three-way evidence D14 used, never as a
file dropped in.

**Rejected.** Hand-scripting the 31 missing copies. Overlaying the snapshot's 249
scripts (**D109**'s overlay spike). Overlaying only the 213 that build (the
user's deck still does not start, and "builds" is not "correct").

## D112 — The FRA AI opponent is the user's own green-black "leftovers" list, finished with basics only, and a draft until the user accepts it

**2026-09-27** (with **D109**. It reaches the AI's seat through `--ai-deck`
(`--deck2`) on the bridge or on `scripts/play.sh`, or through `config.json`'s
`match.aiDeck`, which only `play.sh` reads (match setup, **D106**).)

**Decision.** The deck the AI plays against `decks/fra-rw-aggro.dck` is
`docs/drafts/decks/fra-gb-leftovers.dck`: the green-black midrange list the user's
own pool notes propose as *"a second deck from the leftovers (for the coworker to
play)"* — 22 named cards copied exactly (names normalised to Forge's commas) —
finished to 40 with the mana only: 8 Forest, 8 Swamp and 2 Plains, because the
notes say Bloombrute *"needs a Plains or two"*. It is a **draft**: it lives under
`docs/drafts/`, its `Name=` says "draft AI opponent", and it moves into `decks/`
only when the user accepts it, changes it or replaces it. Like the user's deck it
does not play on 2.0.14 (20 ok, 20 missing).

**Rationale.** Which cards the AI plays is the user's call, and the user's notes
had already named a second deck from the same pool — written for a coworker to
play, which makes it the closest thing to the user's own choice of opponent;
inventing a list would decide it for them. Measured on the 09-27 snapshot, never
merged: 40 of 40 build as Forge's own scripts; in 40 AI-vs-AI games against the
red-white deck, each deck on each seat, green-black won 25 and red-white 15, over
11–44 player turns, with 0 exceptions and every one of its 16 nonland names cast;
6 `RecordMatch` and 3 `MtgTable --transport auto` games through the saved bridge
port all reached `over` with `UNIMPL members = none`, and all 9 frame logs PASS
`check-redaction.mjs`. It is a playable opponent, somewhat stronger when the Forge
AI pilots both decks, which says little about a human at the red-white seat. It
stays out of `decks/` because the dev card browser lists every `decks/*.dck`,
where a draft would look like a reviewed deck — and since match setup and the
workshop, so do `tools/fetch-art.ts` and the workshop's catalog. (Written on
`754f504`, this also said `web/test/cards-lib.test.ts` parsed every entry there: a
`decks/drafts/` directory threw `EISDIR` and a `decks/README.md` parsed as a deck
with skipped lines, measured. Match setup made the test read only `.dck` and
`.txt`, so that reason is gone.)

**Rejected.** A blue-black list built from the set's commons and uncommons
(measured first: 16–4 against the red-white deck, then 29–11 and 24–16 in two
toned-down versions; dropped when the user's notes turned out to propose an
opponent). The mirror match the spikes used (a test, not a game). An MSH deck
(`decks/pacho-shield.dck`, or match setup's `decks/doom-legion.dck`) — nothing stops
`--deck2 decks/pacho-shield.dck`, but a cross-set opponent is not what the notes
describe.

---

## D113 — Gate step 6 compares what a busy machine cannot move: the non-state frames, the event stream, the phase walk, the final board, every board cut at a phase boundary, and the stack; byte for byte is `STRICT_G1=1`

**2026-09-27** (the hardening pass, PLAN.md slice-4 follow-up 13(b);
`docs/evidence/hardening.md` §1. *Written as D109 on the `hardening`
branch, which was open at `bf0392b` while match setup's D105–D108 landed and was
rebased onto `main`'s `a092d3a` on 2026-09-27 with nothing renumbered. On its
rebase onto `main`'s `aead79d` (2026-09-28) the engine and sets' D109–D112 had
landed first, so, as the note above D109 asks, this branch renumbered its own:
D109–D111 became D113–D115, in every file that cites them. **Amended
2026-09-28** by the branch's first verification round: questions 5 and 6 below
were added because the first four never compared the stack, `stackCards`,
`priority` or mid-game combat — see *Known cost*.*)

**Decision.** Step 6 of `tools/check-all.sh` no longer diffs the fresh seed-42
`RecordMatch` recording against `fixtures/games/g1.jsonl` byte for byte. It
runs `tools/wire-drift.mjs`, which normalises the per-run values as before (`t`,
`startedAt`, `gameId`) and then requires six things to be identical:

1. every **non-state frame** (session header, `hello_ok`, `over`), in order,
   apart from its `seq`;
2. the **event stream**: every `state.events[]` entry, concatenated in frame
   order;
3. the **phase walk**: the (turn, phase, active player) sequence the frames pass
   through, consecutive repeats collapsed;
4. the **final `state`**, events aside;
5. every **boundary board**, events aside and in order: a `state` whose last
   event is a `turn`, `phase` or `outcome`. Snap writes those three kinds only
   for `GameEventTurnBegan`, `GameEventTurnPhase` and `GameEventGameOutcome`, and
   `RecordMatch.BoundaryFlusher` flushes synchronously AT each of them, so such a
   frame is cut at an engine event, never by the clock: 347 boards in g1, where
   `priority`, every public zone and mid-game combat are compared;
6. the **stack**, wherever both recordings caught the same items on it: for every
   set of stack ids that appears in both files, `stack` and `stackCards`, order
   included, are the same JSON; and at least one committed id-set must appear in
   the fresh file.

`tools/wire-drift-selftest.mjs` runs first, in the same step, and proves the
comparison still rejects drift. It builds eighteen one-edit copies of g1: an
identical copy, five re-partitions that the default must accept and `--strict`
must reject (two of them move a stack snapshot: one the fresh file lacks, one
the committed file never caught), and twelve drifts both must reject (a dropped
or changed event, lowercased phase names, `power` as a number, a different
winner, a changed `hello_ok`, no states; and the verifier's four — the stack
reversed, a stack-item key renamed, `priority` nulled and combat's `blockerIds`
renamed in every state but the last — plus a stack never written). `STRICT_G1=1` puts the old byte-for-byte comparison
back. The step now prints its own verdict and exits 1 on a difference. The
old `diff | head -20` under `set -o pipefail` exited 141 with no message.

**Rationale.** A recording's `state` frames are flushes, and where a flush cuts
the event stream depends on timing. The forwarder flushes at 500 ms, at 50
events, and when a batch posted off the game thread joins the next game-thread
flush. So on a busy machine the same game comes back cut differently. This was
measured, not assumed. Seed 42 was re-recorded with the JVM pinned to one core
shared with 2, 4 and 8 busy loops. Against g1's 377 lines the runs gave 383, 387
and 395 lines. In all three the six questions above held: 1,651 events, 322
phase-walk steps, the same final board, the same three non-state frames, the
same 347 boundary boards, and the same stack on every id-set both caught (17, 17
and 14 of g1's 17, the three-item stack of turn 14's attack among them every
time). So did two more, recorded after the verification round with its bridge at 4
and 8 loops (386 and 395 lines). An unloaded run was byte-identical.

The task asked whether step 6 should become 9b's multiset comparison. It should
not. The multiset fails the same three loaded runs, with 7/13, 13/23 and 26/44
frames only in the fixture / only in the fresh file. A re-partitioned batch is a
different frame, not a reordered one. Even the set of distinct card objects
moved (4 and 10 cards at 2 and 8 loops), because an intermediate board catches a
card mid-change or it does not. So that set is not a question either. Each of
the six questions is invariant by construction:

- the non-state frames are not flushes;
- a flush moves events between frames but never drops or reorders one;
- the recorder flushes on every `GameEventTurnPhase`;
- the final state is flushed after `Match.startGame` returns;
- a boundary board is cut at an engine event, so the game fixes it;
- a stack's order is its push order, so one set of items has one order, and an
  item does not change while it waits (measured: one serialisation per id-set in
  all five recordings, g1 and the four re-recordings).

**Known cost.** As first written (four questions) the known cost was stated as
"the board snapshots between phase boundaries". That understated it, and the
branch's first verifier measured by how much: **the whole stack serialisation
was outside the check.** A phase boundary never has anything on the stack (a
step ends only once it is empty) and g1's final board has an empty stack, so the
stack reversed top-first, a stack-item key renamed, `priority` nulled in every
state but the last and combat's `blockerIds` renamed in every state but the last
were each accepted — while step 6's own comment still said it caught "a stack
ordered top-first". Questions 5 and 6 answer them, and each is in the selftest.

What the default still gives up: a board field that differs only in a snapshot
taken BETWEEN two phase boundaries, is in no event, is not on the stack, and has
changed back by the next boundary (a creature tapped and untapped within one
step, say). And the stack's ORDER is checked only on an id-set of two or more
items that both files caught; g1 has one, the three-item stack of turn 14's
declare-attackers step, and every loaded re-recording caught it, but a load
heavy enough to miss it would leave order unchecked for that run. The strict
mode is one variable away for a change to `Snap.java`, and it is worth running on
an idle machine when you make one.

**Rejected.** Keeping the byte diff and re-running until green. That teaches
everyone to ignore the gate, which is the argument 9b's header already makes.
9b's multiset, measured above. Making step 6 advisory, as the engine-upgrade
lane did for its own runs: an advisory drift step is a step nobody reads.
Comparing the set of distinct card objects, also measured above.

---

## D114 — An early `act: newGame` is QUEUED until Forge has finished the game it follows, and released from that game's own `GameEventGameFinished`

**2026-09-27** (the hardening pass, PLAN.md slice-4 follow-up 13(c); protocol
amendment **M45**; `docs/evidence/hardening.md` §2. *Numbered after the
engine and sets' D109–D112; see D113's note.*)

**Decision.** `WireGuiGame.newGame` applies the next-game decision at once only
when Forge has finished the current game. It does not start game n+1 until
Forge has finished game n. A `newGame` that arrives earlier waits, and only one
waits: a second is dropped, with a line on stderr. `FinishWatcher` releases the
waiting act. It is a subscriber registered **last** on game n's own event bus
and keyed by n, and it sees `GameEventGameFinished` on game n's own thread,
after every earlier subscriber. It then queues the release on the EDT, behind
the wind-down Forge queued there a moment earlier. The release applies the act
exactly as before (`continueMatch()` / `restartMatch()` inline, ending in the
next `hello_ok`). Stderr shows `NEW GAME QUEUED`, then `NEW GAME RELEASED`, then
the old `NEW GAME REQUESTED`.

The pre-input concede (amendment M11) never reaches Forge's game-over, so after
*its* `over` a `newGame` is applied at once, as it always was. `MtgTable`'s
post-game wait gives a queued act up to 10 s to run when the client that sent it
has already disconnected.

Two things are for tests only. `MTGTABLE_HOLD_GAME_END_MS` holds the game
thread that many ms after `over`, so the window is wide open. Gate step 10g
sets it to 2000 and asserts that the acts were queued and released, that no
game ended with `OVER WITHOUT A gameOver STATE`, and that every game's log
carries a `gameOver` state. `tools/ws-auto-play.mjs` also exits **8** on an
`over` with no `gameOver` state in front of it in the same game.

**Rationale.** The race was found by reading Forge's bytecode, not guessed.
`over` is emitted at the outcome (M4), but Forge is not done with the game then.
`Match.startGame` still runs `executeOwnershipChanges`, `clearCaches`, fires
`GameEventGameFinished` and calls `System.gc()`. `FControlGameEventHandler`
answers that event with `invokeInEdtLater(processEvents)`, which ends in
`showPromptMessage`, `updateButtons` and `IGuiGame.finishGame()` on **this**
object.

A client that answers `over` at once can get its act onto the EDT first. Then
the restart runs, `openView(n+1)` re-arms the terminal-frame latch
(`overEmitted = false`), and game n's late `finishGame()` emits game n+1's
`over` — `OVER WITHOUT A gameOver STATE`, the four-frame game 3 of
`var/check-all-t2s4-rebase-pre1`. Game n's old forwarder could also have
flushed on game n's thread into game n+1's view, which is hard rule 3's silent
corruption.

With the hold and the queue check disabled (a negative-control build), the
three-game session failed every time: game 2 ended at once and the client
exited 8. With the fix, both acts queue and release and all three games play in
full.

**Known cost.** The next game starts a few milliseconds later, and up to the
hold under the test hook. Game n's thread still has `HostedMatch`'s tail to run
after `GameEventGameFinished`: the `endGameHook` (null here), a loop over
`humanControllers` that only flushes a `RemoteClientGuiGame`'s forwarder, and
`isMatchOver = match.isMatchOver()`. The EDT's restart can overlap that loop.
The worst case is a `ConcurrentModificationException` on a thread that has
nothing left to do, which `EngineCrash` prints as `THREAD DIED (not the game
loop)`. Desktop Forge has the same window when a person clicks instantly.

**Rejected.**
- **Answering an early `newGame` with a `notice`.** Between games `emit` drops
  every non-`over` frame (§8.4), so there is no channel, and "try again later"
  asks the client to guess Forge's timing.
- **Ignoring a late `finishGame()` that arrives while the new game is not
  over.** That would silence the symptom but not game n's other late pushes, the
  empty `input` of `showPromptMessage` / `updateButtons`, or the forwarder
  flush.
- **Releasing on `HostedMatch.setEndGameHook`.** It runs even later on the same
  thread, but it cannot say which game it belongs to.
- **A client-side delay.** The bridge would still be wrong for every client
  that does not have one, AutoTransport included.

---

## D115 — An exception out of Forge's game loop fails the run: an error `notice` and a null `over` close the log, and the process exits non-zero with the cause

**2026-09-27** (the hardening pass; the engine-upgrade lane's note; protocol
amendment **M46**; `docs/evidence/hardening.md` §3. *Numbered after the
engine and sets' D109–D112; see D113's note.*)

**Decision.** `MtgTable` installs `EngineCrash` as the JVM's default
uncaught-exception handler before the match starts. It still prints every trace
exactly as before, and first. When a `Game-n` thread dies with `forge.game.Match.startGame`
on the stack, the game loop itself has died, and `WireGuiGame.engineCrashed`
runs:

- an error `notice` titled `Engine error`, in the bridge's own words;
- amendment M11's null `over`;
- the session plays no further game;
- the run summary prints `engine crash   = <cause chain>`;
- the process exits 1 with `MTGTABLE FAILED: … the engine crashed (D115): …`.

`RecordMatch` already caught the game runnable's throwable and exited 1. It now
also writes the same two frames and closes its log before exiting, so its file
ends in `over` rather than stopping at `hello_ok`.

`tools/check-engine-crash.sh` reproduces the crash in a scratch Forge home under
`var/crash-probe/`: its own config (`bridge/run.sh` now honours
`MTG_TABLE_CONFIG`) and an overlay whose Depower script uses the 2.0.15 ApiType
`Empower`. It asserts all of this for both mains, in about 8 s. It is not in the
gate. **Amended on the rebase onto `a092d3a` (2026-09-27):** it is now gate step
**12c**, beside the other self-checks, as decided when the pass was reviewed
(PLAN.md's hardening follow-up 2, closed). The step requires all twenty of its
assertions, and it needs no `node_modules`, so it runs under `SKIP_WEB=1` and
`SKIP_TEN=1` too. **Amended on the rebase onto `aead79d` (2026-09-28):**
`check-all.sh` and `scripts/play.sh` unset `MTG_TABLE_CONFIG`, and
`bridge/run.sh` names any config other than the repo's on stderr, so only the
crash check's own runs can use another one (the first verification round).

The probe's Depower script is not a card script in the sense of the engine and
sets' **D111**. It never enters `forge-home/custom-cards/`, it is written into a
scratch home under `var/` and deleted with it, and it is built to fail. It
reproduces D111's own measurement, that one unbuildable card takes the game down
before turn 1, and makes that failure a gate assertion.

**Rationale.** Nothing in Forge catches what the game runnable throws, because
`ThreadUtil.invokeInGameThread` is a plain `ExecutorService.execute`. The failure
was reproduced before it was fixed. A card the engine cannot build threw out of
`Match.prepareAllZones` before turn 1. `MtgTable --transport null` produced no
frame for 60 s. Then `AutoTransport`'s stuck watchdog conceded, the pre-start
concede ended the session through M11's exception path, and the run printed
`MTGTABLE OK` and exited **0**, in 65 s, with `player turns = 0`. Over a socket
or the console there is no watchdog, and the session never ended. The fixed run
exits 1 in 4 s.

The trigger is a class and a method on the stack, not a message, so it survives
an engine that rewords its exceptions. It is limited to the game loop so that a
throw from some other pool thread does not end a playable game.

The notice never carries the engine's message. That message names the card
("check card script of Depower"), and the card can be the opponent's, so
putting it on the wire would breach hard rule 8. The self-check asserts the card
name is not in the frame log.

**Known cost.** A default handler is process-global. It chains to the previous
one, so nothing that was printed stops being printed, but it is one more thing
installed at boot, next to Bootstrap's three (hard rule 11). An exception that
kills a non-loop `Game-n` thread is still only printed: it could leave a game
stuck, which then ends by timeout as before. The self-check was gate-free
because the scratch home costs a second `FModel.initialize` per main (about 8 s
in all), and whether it joined `check-all.sh` was left open — it did, on the
rebase (the amendment above).

**Rejected.**
- **Catching around `hosted.startMatch`.** The game runs on another thread, so
  there is nothing to catch there.
- **Wrapping Forge's game runnable.** It is `HostedMatch`'s private lambda.
- **Detecting "0 player turns" at the end.** That is the symptom, it takes 60 s
  of watchdog to reach, and it never arrives over a socket.
- **Relying on RecordMatch's existing catch for MtgTable.** HostedMatch owns
  that runnable.

---

*Numbered **D116–D117**. Written as **D109–D110** on branch `more-villains` (off
`main`'s `a092d3a`, 2026-09-28), when other branches cut the same day also
numbered from D109 and whichever landed second was to renumber its own, as the
workshop and match setup did (D102, D105). On its rebase onto the `hardening`
branch's `4d26637` (2026-09-28) the engine and sets' D109–D112 and hardening's
D113–D115 had landed first, so these two became **D116–D117**, in every file that
cites them. They are cited only from this file, `decks/README.md`,
`docs/evidence/more-villains.md`, PLAN.md, README.md and CLAUDE.md, in
`tools/deck-smoke.sh`'s header and in one comment in `web/test/workshop.test.ts`.*

## D116 — Three more AI decks — Masters of Evil, Hulk Family, Wakanda — each written from a spec, never typed; D108's four rules plus a fifth: no card whose print carries a flavour name

**2026-09-28** (branch `more-villains`; the user's request of 2026-09-27, *"I'd
also like to watch AIs vs each other with my deck vs different decks so I can see
how they play it"*. `decks/README.md` is what each deck is and how the AI plays
it; `docs/evidence/more-villains.md` what was run. Within **D106**: none of this
changes `config.json`'s `match.aiDeck`, which is still Doom Legion.)

**Decision.** Three more 40-card decks the AI can be seated behind, each a
different colour pair and archetype from Doom Legion's blue-black tempo and from
each other, each named for a Marvel team or faction its cards depict, from MSH
and MSC only, 17 lands, two colours, creature-forward:

| deck | colours | archetype | creatures |
|---|---|---|---|
| `masters-of-evil.dck` | black-red | villain aggro: cheap flying, hasty, deathtouch Villains, a little burn, the team card as lord | 19 |
| `hulk-family.dck` | red-green (red a splash) | stompy: gamma tramplers growing each other with +1/+1 counters | 22 |
| `wakanda.dck` | green-white | go-wide: 2-drops, tokens, lifelink, counters | 21 |

**Every AI deck is a spec.** `decks/specs/<deck>.json` is the list in `.dck`
order with a one-line reason per card; `tools/build-deck.ts` — the sibling of
`tools/villain-deck.sh`, which still names ONE deck for the gate — resolves each
name against the local card library (D90) and writes the `.dck`. It refuses a
non-exact name, a card not printed in MSH or MSC, a mana symbol the two colours
cannot pay (a hybrid needs one half), a third copy or a second legendary, and a
list off the spec's size, land count or creature floor; the set code is `MSH`
when MSH prints the card, else `MSC`. Doom Legion got a spec too and the tool
rebuilds it **byte for byte**, which is the test that the convention was read
right. `--check` diffs every `.dck` against its spec, `--pool` lists what two
colours can cast, and `web/test/deck-specs.test.ts` holds the hermetic half (each
`.dck` is its spec line for line, and every non-probe deck other than the user's
has a spec).

**The rules a card passes**, D108's four in order and one learned here:

1. a script, not unsupported, Limited-legal (`tools/check-deck.mjs`, engine pass);
2. no `AI:RemoveDeck:All`;
3. the AI **casts** it — counted over `tools/deck-smoke.sh`'s games, and for a
   card that did not show up there, a probe deck of copies of it;
4. a game with the AI on it passes `check-redaction.mjs` with no flags — so no
   script that reveals cards while they are still in the AI's library
   (`DigUntil`, `PeekAndReveal`, a `Dig` with `Reveal$ True`): Wakanda Forever!
   stays out for Kang Prime's reason;
5. **new:** no card Forge would name by a flavour name. MSC prints Fleecemane
   Lion only as *Wakandan War Panther*; Forge picked that print, the wire carried
   the flavour name, and the deck's own name — the key `art.json`, the workshop
   catalog and the smoke's census use — no longer matched. `check-deck.mjs` warns
   on both 4 and 5 now (warnings, because both are harmless in the SEAT's deck).

**Why.**

- **Specs, because D108's deck was typed once and its reasons lived in prose.** A
  spec carries the reason next to the card, so a swap is a one-line diff with its
  why, and the builder makes "MSH or MSC, the right colours, the right counts" a
  check instead of a review.
- **The AI casts about one spell a turn and taps out for the biggest**, casting
  creatures in its second main phase (measured: `docs/evidence/more-villains.md`
  §3). So the decks are cheap and proactive: a removal spell or a trick in hand
  against a seat that keeps no creature is a card that never reaches the stack,
  and a deck of them is a deck that stalls. Every deck has at most four
  noncreature spells.
- **Colours are a real constraint on the AI.** The first Hulk list (red and green
  both double-pipped) had the AI miss whole turns holding a full hand on five
  lands. The shipped list keeps every double pip green and red a splash.
- **Named factions, from the cards.** The Masters of Evil (the team card and members from the
  comics, three of them later Thunderbolts), the Hulk family (the gamma
  cards and the people around them — Rick Jones, Brawn, Hercules, Hellcat,
  Wolverine) and Wakanda (the Black Panthers, Shuri, Okoye, the Dora Milaje).
  The generic reprints are named as such in `decks/README.md`: Birds of
  Paradise and Gallant Citizen (Hulk Family), Gallant Citizen and Swords to
  Plowshares (Wakanda), Lightning Bolt, Shock and Night's Whisper (Masters of
  Evil), and a check-land in each.

**Known cost.**

- Nothing measures how hard any deck is: the AI won all 40 smoke games against
  the automated seat, which is a policy, not a player.
- The ability lines were diffed mechanically (`check-deck.mjs --scryfall`: mana,
  type, P/T, keywords, Oracle text), not read by hand as report 08 §1 and §8 did.
- The arena has identity rows for none of the new cards; they stand on the
  subtype and archetype rungs, as Doom Legion's did.
- `fixtures/cards/` (the card library's committed test slice) does not carry the
  new decks' cards; nothing reads them from there today.

**Rejected.**

- More rows in `tools/ten-games.sh` or a gate step: the gate is already 15–20
  minutes, and what these games measure is the decks, which change less often
  than the code. `tools/deck-smoke.sh` is the check, run by hand.
- Changing `config.json`'s default AI deck (D106, and the brief).
- Deadly Dispute (the AI never casts it), She-Hulk, Jennifer Walters (the AI
  sacrifices its own lands to her), World War Hulk (its chapter I is a may-play
  from the library, a path the gate has never seen), Wakanda Forever! (library
  reveal), Fleecemane Lion (flavour name), Baron Helmut Zemo (`AI:RemoveDeck:All`).

## D117 — `tools/deck-smoke.sh` asserts the brief's 8 spells as a RATE: `min(8, AI turns − 3)`, with the flat 8 behind `DECK_SMOKE_STRICT=1`

**2026-09-28** (branch `more-villains`; `docs/evidence/more-villains.md` §3 has
every number below)

**Decision.** The lane's brief asked for each smoke game to show the AI seat
"having CAST at least 8 spells and ATTACKED at least once", and said that a deck
which fails should change, not the assertion. The attack half is asserted as
written. The spell half is asserted as **at least `min(8, T − 3)` spells, where T
is the number of turns the AI took**: 8 whenever the game lasts eleven AI turns,
and otherwise one spell for every AI turn but its first, its last and one more.
`DECK_SMOKE_STRICT=1` asserts the flat 8, and the table prints the per-game counts
either way. A spell is a `cast` event whose `controller` is the AI and whose
stack item has `isAbility: false`.

**Why the flat 8 cannot be met by changing the deck.** Against the automated
seat — which attacks with everything, rarely blocks and rarely keeps a creature —
the AI wins in **five to eleven of its own turns**, eight or fewer in 35 of 40
games (it won all 40), and it casts
about **one spell a turn**: 0.68–0.83 per AI turn across the four decks, because
it taps out for the biggest castable card and casts creatures after combat, so
its first turn (no one-drop in hand) and its winning turn (the game ends in
combat) are usually empty. Measured: of 40 games, **5** reached 8 spells; Doom
Legion, the gate's own villain, reached it in 3 of 10. A greedy "cast everything"
simulation of a 17-land deck with sixteen one- and two-drops (four of them
drawing a card), five threes and two fours reaches 8 by the AI's sixth turn
**41%** of the time and by its fifth **6%**; the decks here cannot beat an ideal caster. Every lever that would raise
the count against this seat makes the deck worse to watch — fewer lands than the
brief's 17, a pile of cantrips, or creatures too small to end the game — or
changes the seat, which is the gate's and not this lane's.

**Why T − 3 and not T − 2.** T − 2 is the ideal curve-out (a spell every turn
but the first and the last); as a floor it failed 0–3 of 10 seeds per deck on
the shipped lists (Doom Legion 3, Hulk Family 2, Wakanda 1) on ordinary
land-light draws, which is a flaky smoke. T − 3 fails one of those forty: Doom
Legion at seed 6 (4 spells in 8 turns), outside the default seeds 1–5. T − 3 allows one more miss
and still has teeth: the red-heavy Hulk list failed it in 4 of 10 games (the AI
sat on five lands with a full hand), and the negative control — 17 Islands and
23 Trickster's Stratagem, which the AI never casts — fails it at 0 spells and 0
attacks. The advisory "never cast" list is the per-card half (the Stratagem
check), and it is what caught Deadly Dispute.

**Known cost.** A deck the AI plays one spell short of its curve in every game
passes. The rate is a floor for "the AI is playing this deck", not a measure of
how well.

**Rejected.** Counting `cast` events of abilities as spells (it would pass more
games and is not what "spells" means; the table prints abilities separately);
lowering the 8 itself (the brief's number stays the cap, and strict mode keeps
it); a seat that blocks, or an AI-versus-AI run (a different transport, and the
gate's seat policy is not this lane's to change).

---

*Numbered **D118–D122**. Written as **D109–D113** on branch `spectate` (off
`main`'s `a092d3a`, 2026-09-28), with its protocol amendment as **M45**, when
other branches cut the same day also numbered from D109 and M45 and whichever
landed second was to renumber its own. On its rebase onto the `more-villains`
branch's `90b97bb` (2026-09-28) the engine and sets' D109–D112, the hardening
pass's D113–D115 (with amendments M45–M46) and more villains' D116–D117 had
landed first, so these five became **D118–D122** and the amendment **M47**, in
every file that cites them: this file, CLAUDE.md, PLAN.md, README.md,
`docs/protocol.md`, `docs/evidence/spectate.md`, and comments in `RecordMatch`,
`scripts/spectate.sh`, the gate, `tools/same-game.mjs`, `tools/wire-drift.mjs`
and the web client (the negative fixtures `m45-*` became `m47-*`). D121 met the
hardening pass's D113 on the rebase: step 6 had become `tools/wire-drift.mjs`,
and the sort moved into its normalisation (D121, *Rebased*).*

---

## D118 — Spectating is a PACED recording the page FOLLOWS, not an observer on the socket; and it is one seat's eyes, never an omniscient view

**2026-09-28** (spectating, protocol amendment **M47**; `docs/evidence/spectate.md`)

**Decision.** `./scripts/spectate.sh` watches two Forge AIs play by recording the
game with `mtgtable.RecordMatch` — both seats AI, each on its own deck and profile —
into `var/spectate/<deckA>-vs-<deckB>-<seed>[-seat1].jsonl`, and opening the arena's
replay of that file with `&follow=1`. The recorder runs in the background at a
watchable pace (**D120**); the page polls the growing file from the TRANSPORT layer
(`web/src/transport/follow.ts`, `LogFollower`) and appends the new frames to a
follow-mode `LogReplayTransport`, which plays them on the recorder's clock. An
`over` frame ends following, and the transport is an ordinary replay from then on
— scrub, step, speed, cameras. `--no-follow` records the game first (about seven
seconds) and opens it as a plain replay. The recording is **one seat's view**:
`--seat 0` (the default) is the user's deck's chair and the other hand is the
five-key stub it is at the table; `--seat 1` records the same seed from the other
chair, which is the same game (**D119**, measured). There is no omniscient viewer.

**Rationale.** Everything this needs already existed and is already gated: an
AI-vs-AI recorder with the game-thread snapshot discipline (hard rule 3), a redaction
function that runs per viewer (hard rule 8), a reducer that folds a log, an arena
that renders any `ClientState` and puts itself in spectator mode when no seat is
live. Following a file adds a poller and an `append` to the replay transport and
nothing to the bridge's threading, the wire or the arena. The arena decides nothing
(M7 convention 1): it is handed a `ClientState` and one word (`following`,
`stalled`, `finished`) as a prop, imports no transport and polls nothing —
`liveness.test.ts` holds both. One seat's eyes because that is what a log is (§8.3):
an omniscient log would be a new redaction mode, a second shape of every frame that
`check-redaction.mjs` would have to learn to allow, for a view no player ever has.

**Known cost.** A spectated game is watched 0.6 s behind the recorder by design
(**D120**, measured: evidence §F), not live. A page that joins a recording late
jumps to the live edge and leaves the earlier turns to the scrubber. Nothing on the
page can pause the ENGINE, only the playback.

**Rejected.** **An observer socket** — a second, read-only client on
`WsTransport` receiving the seated game's frames live. It would be truly live, but
`WsTransport` is one client at a time by decision (**D25**), the observer would need
its own viewer and therefore its own `Snap` pass per frame (a second serialisation
of every snapshot on the game thread), and `MtgTable` seats a HUMAN — an AI-vs-AI
session over the socket does not exist. PLAN.md's *Spectating* keeps it as a
follow-up. **Server-sent events or a websocket from the dev server** tailing the
file: a push channel for what a 500 ms poll already does on loopback, and a second
kind of dev-server route to keep dev-only. **An omniscient viewer**: above.

---

## D119 — `RecordMatch` says what match it recorded only when asked; the viewer's own profile is `yourProfile`; each profile belongs to its DECK, not to `--seat`

**2026-09-28** (protocol amendment **M47**)

**Decision.** `RecordMatch` takes `--profile <p>` (seat 0, the `--deck` seat) and
`--ai-profile <p>` (alias `--profile2`; seat 1, the `--deck2`/`--ai-deck` seat),
both resolved by `Bootstrap.resolveAiProfile` **before** `FModel.initialize` and
seated through `Bootstrap.createAiPlayer` (**D107**'s one seam), `Default` when
absent. With `--match`, or either profile flag, `hello_ok` carries M44's `match`
block read from the VIEWING seat — `yourDeck` is the `--seat` seat's deck with the
path the session header already names, `aiDeck` the other's `{name, cards}` and
nothing else (**D105**), `aiProfile` the other's profile, `games` 1 — plus one key,
last: **`yourProfile`**, the viewing seat's own profile. `check-redaction.mjs` fails
`yourProfile` on a stream whose `players[]` marks the viewer human, and holds it to a
profile name; `fixtures/negative/redaction/m47-*` is the control and three probes.
The client's one reader, `seatMatchOf()`, gives an AI viewer its `yourProfile`;
`matchupOf()` composes it per seat for the arena's "watching" line. A deck's public
name is `Bootstrap.deckName`, shared by both emitters.

**Rationale.** A spectator wants to know which deck is which and how each AI is set
to play, and both are facts about the match that nothing else on the wire says.
M44's shape already said them for one AI; the second AI is the viewing seat, and a
profile is a fact about an AI, so the viewer's gets its own key rather than a
renamed block (every M44 reader keeps working). **Opt-in** because the gate's step
6 compares a bare seed-42 recording with `fixtures/games/g1.jsonl` value by value:
the M41 precedent is an optional key omitted when nobody asked, so a recording made
without a match setup is what it always was. Profiles follow the deck because the
viewpoint is a redaction choice and must not change who plays what — that is what
makes `--seat 1` the same game from the other chair.

**Known cost.** `RecordMatch` names its players `AI-Seat0` and `AI-Seat1` (they
appear on the plates and in the outcome), which says nothing a watcher cares about;
renaming them would change every committed fixture's handshake, so the deck names
on the plates and the watching line carry the identity instead. The outcome cue
says Victory or Defeat from the VIEWING seat's side.

**Rejected.** A new key per seat (`seats: [{deck, profile}]`): a second shape for
the same facts, and a second reader. Writing `match` always: step 6 (above).
`--profile` meaning the viewing seat's profile: then `--seat 1` would swap which
AI plays which deck, and two recordings of one seed would be two different games.

---

## D120 — `--pace` dwells BEFORE the boundary flush, a quarter of it after a bare phase change; the page plays each frame 600 ms after the recorder wrote it

**2026-09-28** (spectating; `docs/evidence/spectate.md` §B and §F)

**Decision.** `RecordMatch --pace <ms>` (spectate.sh's default in follow mode is
**600**) sleeps on the game thread inside `BoundaryFlusher.receive`, **before** it
flushes a phase, turn or outcome boundary, and only when a frame is about to be
written: the full pace after a frame in which something happened, **a quarter** of
it after a frame whose events were only phase, turn, priority or recomputed stats.
An unpaced run executes none of it. The session header says `paceMs` (M47).

In the page, a follow-mode `LogReplayTransport` plays on the recorder's clock in
one of two ways. **Live** (the normal case): the frame the recorder wrote at `t`
plays at `t + FOLLOW_LIVE_DELAY_MS` (**600 ms**) on this machine's clock — one poll
interval and a margin — or on arrival if its slot has passed; every frame then
keeps its exact recorder gap from the one before, and the lag cannot grow.
**Behind** (after the viewer pauses, or at a speed below 1×): each frame is due its
recorder gap, over the speed, from an anchor at the cursor, never more than
`FOLLOW_MAX_GAP_MS` (5 s) after the frame before; at 1× or faster the cursor returns
to the live schedule as soon as it is within `FOLLOW_SNAP_MS` (1 s) of it. A page
that **joins** a game already under way — it loaded late, or was reopened — folds
every frame more than a second stale at once (the arena reads that as a scrub and
snaps) and plays from the live edge; it does so only until the viewer first
pauses, scrubs or changes speed, after which the cursor is theirs. Frames are
never less than `FOLLOW_MIN_GAP_MS` (50) apart, so each gets a React commit of its
own. Once the log has ended and its last frame has played, the transport is an
ordinary replay at 400 ms a frame.

**Rationale.** **Unpaced, an AI-vs-AI game is over in 1.7–3.7 s of wall time**
(measured at seeds 5, 7 and 11 against the villain deck; M1 measured 1.4–3.5 s
for the mirror), so there is nothing to follow; the pace is
what makes "watch the AIs play as it happens" mean anything. The dwell goes
before the flush because `GameEventForwarder` also flushes on a 500 ms clock whose
stamp `flush()` sets BEFORE calling `handleGameEvents` (javap, 2.0.14): a sleep after
the flush would leave that stamp one dwell stale and cut the next batch after one
event, moving every frame boundary after it. Asleep before the flush, the boundary
event is already in the batch and the flush re-stamps the clock — measured, a paced
and an unpaced recording of seed 7 are the same frames as a multiset (the header's
`paceMs` the only difference). The quarter dwell halves the dead time of a game
(about two minutes at 600 ms instead of three) without shortening the frames where
the arena's cues have something to play. The fixed live delay is the third cut,
and the two before it were measured wrong (evidence §F): pacing each frame by its
gap after the last one PLAYED let lateness add up — the lag crept from 0.3 to
0.6 s over one game — and pacing from one fixed anchor froze the lag at whatever
the first poll's was — 0.83 s, and 2.2 s on a page that loaded slowly. Measured
with the live delay: p50 600 ms, p95 638 ms over a whole game. The join jump is
what "follow" means: a page reopened a minute into a game belongs at the live edge,
and the scrubber still has everything before it.

**Known cost.** A paced game ties up a JVM for about two minutes. Follow mode
compares the page's clock with the bridge's `t`, which is sound only on one
machine — the only place the dev route exists; a slot further off than 5 s is
treated as a disagreeing clock and paced from the anchor instead. The dwells are
wall-clock sleeps, so a paced recording's `t` gaps are the pace, not the engine's
thinking time — which is what `paceMs` in the header warns a reader about. At
600 ms the arena's cue queue can run a few steps (about two seconds) behind the
frames in a busy turn; its own budget compresses them.

**Rejected.** Pacing in the browser alone (replay the finished file at the
replay's own 400 ms): that is `--no-follow`, and it is kept, but it is a replay of
a finished game, not watching one. A uniform dwell: every upkeep and draw step would
cost as much as a combat. Pacing the log WRITER (drip-feeding a finished game to
disk): the file would lie about when the engine did things. Catching a late joiner
up by fast playback: every cue of the backlog at four times speed is noise, and the
scrubber already offers the backlog at any pace.

---

## D121 — Gate step 6 compares the ids inside a `stats` event as a set

**2026-09-28** (spectating; `docs/evidence/spectate.md` §D)

**Decision.** `tools/check-all.sh` step 6 — the value-level diff of a fresh
seed-42 `RecordMatch` recording against `fixtures/games/g1.jsonl` — sorts the
`cardIds` array of every `stats` event in both files before comparing, in addition
to normalising `t`, `startedAt` and `gameId`. Nothing else is canonicalised, and the
set of ids is still compared. `tools/same-game.mjs` does the same.

**Rationale.** Adding a few summary `println`s to `RecordMatch`'s main thread,
before `FModel.initialize`, reordered the ids inside `stats` events in 11 of 14
seed-42 recordings — the same ids, the same frames, the same events, the same game
— while the build before them was byte-identical to `g1` in 15 of 15. A bisect put
it on work done on the main thread before the engine boots (the new lines: three
runs of three; the profile validation alone: one of three; everything else in the
branch: none of three). The order is a hash-set iteration inside Forge over objects
hashed by IDENTITY, so it follows HotSpot's identity-hash sequence, which moves
with code that is not a wire change. A gate that fails on it fails on the wrong
thing — and fails flakily, which teaches re-running until green. The ids are a set
on the wire: protocol §3.6 gives `stats` a `cardIds` list and no meaning to its
order.

**Known cost.** A change to Snap that REORDERED `stats` ids on purpose would pass
step 6. No reader depends on that order.

**Rejected.** Keeping the new pre-boot code free of lambdas and string
concatenation until the order came back: it made the gate hostage to whatever the
next change prints before boot. Re-recording `g1`: the fixture is evidence of
what the wire was, and nothing about the wire changed.

**Rebased (2026-09-28, onto more villains' `90b97bb`).** The hardening pass had
meanwhile replaced step 6's byte diff with `tools/wire-drift.mjs` (**D113**), whose
second question compares every `state.events[]` entry as JSON, in order — so a
reordered `stats` event failed it exactly as it failed the byte diff. Both
decisions stand: the sort is now part of wire-drift's own normalisation, beside
the per-run values, so it applies to the six questions and to `--strict`
(`STRICT_G1=1`) alike, and the step's inline normaliser is gone with the rest of
the byte diff. `tools/wire-drift-selftest.mjs` holds both halves — every `stats`
event's ids reversed must be accepted by both modes, one id dropped must be
rejected by both — and with the sort taken out, the reversed copy is `DIFFERENT`.
Measured on the rebased gate's own run (`var/check-all-spectate-train.log`): its
fresh seed-42 recording is `SAME` as `g1`, and compared without the sort it
differs in the event stream at event #1026, a `stats` event's id order — the
move is what kept step 6 green, not a formality.

---

## D122 — Recordings are served from `var/spectate/` by the dev server alone, in complete lines from a byte offset; `spectate.sh` is the second reader of `config.json`'s `match` block

**2026-09-28** (spectating; **D92**'s pattern, **D106** amended)

**Decision.** `web/vite.config.ts`'s `spectatePlugin` mounts
`web/src/spectate/devRoute.ts` in `configureServer` and nowhere else — not
`vite preview`, not the build. `GET /spectate/<name>.jsonl` answers every COMPLETE
line of `var/spectate/<name>.jsonl`; `?from=<byte>` answers the complete lines
written since that offset (at most 4 MiB), with `X-Log-Next` (where the next poll
starts) and `X-Log-Size`; 404 means not written yet, 416 means the file shrank
under the reader (re-recorded). The name is one path segment of `[A-Za-z0-9._-]`
ending in `.jsonl`; the route reads one directory and never fetches. The page maps
`?replay=spectate/<name>` to that route and every other path to `/fixtures/`
(`logUrlFor`); `fixtures/` has no `spectate/` directory and must not grow one.
`./scripts/spectate.sh` reads `config.json`'s `match` block (`deck`, `aiDeck`,
`aiProfile`) for its defaults, as `play.sh` does; the gate passes every deck and
profile it means on the command line and gives its recordings their own `--name`.

**Rationale.** `var/` is never committed and never built, so a route to it belongs
only where a developer's own Node process is running — D92's argument for the card
browser, word for word. Complete lines only, cut at the last `\n`, because the
recorder is writing the file while the page reads it: a half-written line must not
be parsed, and a `\n` byte cannot occur inside a UTF-8 sequence, so the cut is
always a character boundary. **D106** said only `play.sh` reads the `match` block
because the gate must play the same games whatever the player last chose; the rule
it protects is "the human's commands read it, the gate does not", and `spectate.sh`
is a human's command.

**Known cost.** Following needs the dev server; a built page can replay a finished
recording only if it is copied under `fixtures/` (and a recording in `fixtures/`
is a committed file, which is its own decision). Polling costs one small request
every 500 ms while a page follows.

**Rejected.** Serving `var/spectate/` through the fixtures middleware, which also
runs under `vite preview`. HTTP `Range` requests against a static file server:
sirv would answer them, but it cannot cut at a line boundary, so the page would
have to reassemble half-lines — and it would serve `var/` from `preview` too.

---

## D123 — The narrator tells a frame log only as its seat saw it: every name from the event's own frame or the one before, never remembered, and the latest view for everything but a zone move

*Branch `narrate` (worktree `mtg-table-t2q`, off `main`'s `a092d3a`). Written as
**D109**, when other branches cut the same day also numbered from D109 and
whichever landed second was to renumber its own. On its rebase onto the
`spectate` branch's `a5c8e39` (2026-09-28) the engine and sets' D109–D112, the
hardening pass's D113–D115, more villains' D116–D117 and spectating's D118–D122
had landed first, so this one became **D123**, in every file that cites it: this
file, CLAUDE.md, PLAN.md, README.md, `docs/evidence/narrate.md` and the gate; and
the gate's sub-step, lettered 12b on the branch, became **12d**, after the
hardening pass's 12b (the workshop catalog) and 12c (the engine crash).*

**2026-09-28** (the frame-log narrator; `docs/evidence/narrate.md` is what was
measured, PLAN.md *The narrator* the status and follow-ups)

**Decision.** `tools/narrate.mjs` turns one per-seat frame log into a
turn-by-turn story for a beginner, and it is built on five rules:

1. **A tool, not a page, and not a package.** Plain Node, one file, `node:fs` and
   `node:path` and nothing else; no engine, no network, no `config.json`. Nothing
   in `web/` imports it. A `#story` page is the next step and is not built.
2. **The events say what happened; the snapshots say what each id is.** Order,
   phase and turn come from `state.events` (the `turn` and `phase` events inside a
   batch place each thing in its step); names, costs, types and P/T are read off
   card objects. A diff of consecutive battlefields adds only what no event says
   — turned face up, a change of control — and, across a gap in a client log,
   what appeared or vanished while the client was away.
3. **One face reader.** `faceOf()` returns nothing for a five-key stub whatever
   else is on it, "a face-down card" for a face-down card with no `alt`, and the
   `alt` name only where the bridge wrote one (the seat's own face-down cards).
4. **No memory, and the latest view.** A name comes from the event's own frame or
   the frame before it — never from anything older. A zone move reads the card in
   its source zone in the frame before and its destination in this one, so a
   public card that goes into hiding is named from where it was public. **Every
   other fact takes the latest view**: if this frame holds the card at all, this
   frame's face is the answer, concealed or not.
5. **A client log is judged against itself.** A frame whose `seq` this game has
   already produced is a verbatim re-delivery (amendment M10) and is skipped; a
   gap is judged against every seq the file holds, and is narrated only when the
   battlefield visibly changed across it.

**Rationale.**

- **Rule 2 because the snapshots alone miss most of the game.** In an AI-vs-AI
  recording a spell is cast and resolves inside one flush: g1's S.H.I.E.L.D. Spy
  Kit is never on any snapshot's stack. The events are ids only (§3.6 rule 1), so
  they cannot leak a name; the snapshots are the one place a name can come from,
  which is what makes rules 3 and 4 enforceable.
- **Rule 4 is protocol invariant 10 applied to a story, and a real case made it
  a rule.** In `disjoint.jsonl` turn 14, Ashcloud Phoenix blocks face up, dies,
  and returns face down inside one flush; its trigger's text is `""` in that frame
  because the bridge refused to join the name to the concealed id (§3.6 rule 1).
  The first version resolved the trigger's source from the frame before and
  printed *"Ashcloud Phoenix's ability goes on the stack"* — the join the bridge
  had refused. The latest-view rule prints *"A face-down card's ability goes on the
  stack"*, and `web/src/render/LogDrawer.tsx` already resolves ids against the
  frame on screen for the same reason. A zone move keeps the frame before because
  a move out of public view is itself public: *"AI-Seat1's Ashcloud Phoenix
  dies"* was seen by everyone at the table.
- **Rule 5 because a client log is neither contiguous nor monotonic.** Judged
  against "the last seq seen", every client log announced a gap for the `input`s
  sent before it connected, and another for an ask that arrived after later
  frames with its original seq.
- **Test it with an oracle written apart from the narrator, and with the decks
  as ground truth.** Two checks can only be stated from outside the log: that an
  id concealed in every appearance is never named (by ids), and that no card name
  in `decks/*.dck` the log never shows is ever printed (by names). Both are
  negative-controlled by injecting a name into such an id's stub.

**Known cost.**

- Coalescing makes the latest view lossy: when a creature is damaged, dies and
  returns face down in one flush, the damage it dealt and took is told as "a
  face-down card"'s, though a player at the table could have followed it.
- A same-deck recording gives the by-names check nothing to catch (every name
  the opponent could leak is one the seat holds), exactly as §8.3 says of the
  redaction checker; `disjoint.jsonl` and the probe-deck recordings are where it
  has content, and no committed recording plays Doom Legion.
- Ability text is quoted as Forge wrote it, stripped of ids and reminder text: it
  is rules text, not an explanation, and the wording chooses only the verb
  (*triggers* for "When…/Whenever…/At…", *uses* otherwise).
- It says what happened and never why: the log carries no AI reasoning, and
  inventing one would be rules logic.

**Rejected.**

- **A name map built across the whole log** — the simplest narrator, and the one
  that prints a card's name after it has gone back into hiding (invariant 10).
- **Diffing snapshots alone** — misses every spell cast and resolved inside one
  flush.
- **Mining `stack[].text` for names or targets** — the string is gated, and it
  is quoted (tidied of ids and reminder text) as the ability's words; but a story
  that took its facts from engine prose would be a second place deciding what may
  be shown. A spell's targets come from `stack[].targetCardIds`, resolved like any
  other id.
- **A web page in this lane** — the narrator's pure functions are what a
  `#story` page would call; building both at once would have been two surfaces
  to hold to hard rule 8 before either had been read by a person.

---

## D124 — The narrator is ONE pure TypeScript module, `web/src/story/narrate.ts`; `tools/narrate.mjs` is a shell over it and prints the same bytes

*Branch `story` (worktree `mtg-table-t2r`, off `main`'s `4408283`). Written as
**D150–D154** in the lane's reserved range D150–D159, while other lanes cut
the same day numbered their own, and renumbered contiguously at merge onto
`main`'s `4408283`, after the narrator's D123: these five are **D124–D128**, in
every file that cites them — this file, CLAUDE.md, PLAN.md, README.md,
`docs/evidence/story.md`, `docs/evidence/narrate.md`, and comments in
`scripts/spectate.sh`, `tools/narrate.mjs`, `tools/story-shot.mjs` and the web
client.*

**2026-09-28** (the `#story` page; `docs/evidence/story.md` is what was measured,
PLAN.md *The story page* the status and follow-ups)

**Decision.** The narration that **D123** built as `tools/narrate.mjs` moves, whole,
into `web/src/story/narrate.ts` — the one face reader, the no-memory and
latest-view rules, the client-log dedupe, every sentence, `renderStory`,
`renderSummary`, `toJson` — and the CLI keeps only what a page cannot have: the
file read (`node:fs`) and the flags. Node 24 imports the `.ts` by type stripping,
so the module is written in erasable TypeScript and imports nothing at all. Every
fact gains `frameIndex` (the index of the frame whose processing produced it),
which the page needs to put a moment on the replay cursor; `toJson` leaves it
out, so `--json` is byte for byte what it was. This supersedes **D123**'s rule 1
("a tool, not a page … nothing in `web/` imports it") and nothing else of it.

**Rationale.** A story told two ways by two implementations is two things to hold
to hard rule 8, and the second one would be the page — the surface a person
actually reads. One module means the CLI's gate (`tools/narrate-selftest.mjs`,
12d, its five negative controls and its goldens) is the page's gate too, and a
change to a sentence is a change to both readers. The byte-identity was measured,
not assumed: every committed log × seven modes (story, `--summary`, `--seat`,
`--json`, three `--turn` ranges) and eight error paths, stdout, stderr and exit
code, before and after — 133 + 8 outputs, no difference — and the selftest's 79
checks and two goldens pass unchanged.

**Rejected.**
- **A second narrator in the page** (or a port that "follows" the CLI) — two
  implementations drift, and the drift would be in hard rule 8's territory.
- **A build step for the CLI** (compile `narrate.ts` to `.mjs`) — Node 24 runs the
  `.ts` as it is; a generated file is a file that goes stale.
- **`frameIndex` on the `--json` output** — nothing reads `--json` yet (the
  narrator's follow-up 6: it is unversioned), and "the CLI's output must not
  change by one byte" was the lane's rule.

---

## D125 — `#story` is a PAGE over the replay, not a renderer and not a drawer: lazy, the mode app unmounted, handed frames and a cursor, importing no transport

*Branch `story`: written as D151 in the lane's reserved range D150–D159,
and **D125** since the merge (see D124).*

**2026-09-28**

**Decision.** `#story` (or `?view=story`) mounts `web/src/story/Story.tsx` —
through `lazy()`, like `#cards` and `#workshop` — **instead of** the mode app. It
reads the replay the page already has: `main.tsx`'s `StoryReplay` loads the same
`?replay=` log through the same `useReplayLoad` hook the replay app uses (the
fetch cache, the follow-mode poller, the cursor maps), draws the same replay bar,
and hands the page the frames the transport holds, the cursor, the state folded
to it, the follow word and four callbacks. The page:

- tells the story as a column of moments grouped by turn, one margin word per
  phase, the moment on screen (the latest moment whose frame has happened)
  highlighted and kept in view, and what comes after the cursor dimmed;
- carries `--summary` as a card at its head (title, decks, whose view, the result
  and how, the per-seat table), and a panel for the frame on screen (turn, phase,
  life and card counts from the snapshot, the moment, and the Scryfall images of
  the face-up cards it names);
- moves the SAME cursor: a click on a moment scrubs to it; `←`/`→` are the
  moments, `↑`/`↓` the turns, `,`/`.` a frame, Space plays (its own keymap,
  `story/keys.ts`); `▣ arena` / `V` and `▤ board` / `B` leave for the renderers
  at the frame on screen, and the replay bar's `☰ story` link comes back.

It imports no transport, never fetches, starts no timer and imports nothing from
`render/`, `arena/`, `cards/` or `workshop/`; `web/test/story.test.ts` holds each
of those by source scan, and `hooks-order.test.ts` scans its components.

**Rationale.** The arena and the board are renderers of one `ClientState`; a
story is a different reading of the frame log — it needs every frame, not the
state at the cursor — so it is a page with the log in hand, not a third renderer.
Unmounting the mode app is `#cards`'s and `#workshop`'s reason again: a hidden
board or arena would keep its `window` keydown listeners live under the story's
own Space and arrows. Sharing `useReplayLoad` rather than writing a loader of its
own is what makes "in step with the replay" true: one fetch cache, one poller
shape, one cursor map, so the story opens on the arena's frame and the arena comes
back on the story's.

**Rejected.**
- **A drawer on the board or a panel in the arena, now** — the arena is three
  visual lanes' desk this week, and a panel there needs its own mount point,
  pointer-events opt-in and keymap row (PLAN.md's story follow-up 1 names them).
- **Keeping the mode app mounted and hidden** — the key-listener defect D94 found.
- **The page owning a transport** — a second poller, a second fetch and a second
  cursor, and the arena's rule (M7 convention 1: a renderer imports no
  transport) is a good rule for a page too.

---

## D126 — The page re-tells the whole held log whenever it grows; with the future hidden, it tells only the frames the cursor has played

*Branch `story`: written as D152 in the lane's reserved range D150–D159,
and **D126** since the merge (see D124).*

**2026-09-28**

**Decision.** `Story.tsx` calls `narrate()` over the frames the transport holds,
memoised on how many there are: a finished replay is narrated once; a followed
log is narrated again each time the poller appends (at most twice a second).
**What comes after the cursor** has two settings (`S`): *dimmed* — the whole
held log, every later moment marked — the default for a finished replay; and
*hidden* — the page narrates `frames.slice(0, cursor)`, so nothing after the
cursor is on the page at all, the summary card is the game so far, and the
winner is not printed before the game has reached it — the default while a log
is still being recorded.

**Rationale.** Narration is cheap: g1's 376 frames take about 4 ms in Node
(`story.test.ts` prints it every run; the bound it asserts is 250 ms, so a busy
gate machine does not flake). A second, incremental narrator — tried first on
this branch and correct over the corpus — would have needed its own rule for
"the seqs the file holds" (a client log's gaps are judged against the whole file)
and would have been a second thing to keep equal to the CLI. Re-telling keeps the
story of a log still being written, frame for frame, the story the CLI tells of
the same bytes. Hiding by narrating a prefix is exact, not approximate:
`story.test.ts` cuts every committed bridge log at five places and asserts the
prefix's story is the full story's facts before the cut, frame for frame.

**Rejected.**
- **The incremental narrator** — above; kept as the closure structure of
  `narrate.ts` (push each frame, ask once), not as an API.
- **Hiding by filtering the full story** — a turn whose heading exists but whose
  moments are all ahead would read "(nothing but passes)", and the summary would
  still name the winner.
- **Spoilers always on** — a person following a live game would see the summary
  card say who won the moment the recorder wrote `over`, before the page played it.

---

## D127 — Hard rule 8 on the page is held by rendering it over the corpus: no name the log does not show, by ids, by backing and by the decks, with a negative control

*Branch `story`: written as D153 in the lane's reserved range D150–D159,
and **D127** since the merge (see D124).*

**2026-09-28**

**Decision.** The page prints only the narrator's sentences and marks only the
names the narrator's facts carry (`segmentText` cuts a sentence at the names of
the refs `faceOf` resolved; a ref with no name has nothing to find), and its card
images are looked up by those names alone, face-up refs only. An unseen card
stays the narrator's "a card" / "an unknown card", a face-down one "a face-down
card". `web/test/story-render.test.tsx` renders `<Story/>` with
`renderToStaticMarkup` over every committed fixture, at seven cursors each, dimmed
and hidden (266 renderings, 16,225 marked names), against an oracle written apart
from the narrator: an id concealed in every appearance is never marked with a
name; every marked (id, name) pair is a name that id carries somewhere in the
log; no `decks/*.dck` name the log never shows appears anywhere in the markup,
attributes included; hidden means no moment after the cursor, dimmed means every
such moment marked. Its negative control injects a real deck card's name that
the log never shows (*Borough Backup*, from `decks/pacho-shield.dck`) into an
always-hidden stub of `disjoint.jsonl` with the `hidden` flag dropped — the page
prints it and both the by-ids and the by-names checks catch it, the second from
the decks alone — and with the flag kept — the page prints nothing.

**Rationale.** The narrator's own gate holds its text; the page adds markup —
attributes, an image's `alt`, a summary card, a panel — and "the page only
prints the narrator's text" is a claim that needs the same kind of test the
board has (`render.test.tsx`), not a comment. The card image is M4 convention 2's
third exemption (after `#cards`' `CardView` and the workshop's list thumbnail):
public card art for a name the log showed this seat, never a game-state renderer,
and written down in CLAUDE.md, which `story.test.ts` checks.

**Rejected.**
- **Marking cards by id with a name looked up elsewhere** (the art index, an
  earlier frame) — the memory D123 forbids, arriving through the markup.
- **Images for face-down refs the seat may name** (`alt`) — legitimate, but not
  worth a second rule on a page whose images are an aid, not the story.

---

## D128 — A followed log keeps its cursor across the page's own views when the viewer had PAUSED; a viewer watching live rejoins the live edge

*Branch `story`: written as D154 in the lane's reserved range D150–D159,
and **D128** since the merge (see D124).*

**2026-09-28**

**Decision.** `main.tsx` keeps a page-lifetime `followCursors` map beside
`replayCursors`: every state change of a follow-mode transport records its cursor
and whether it was playing. When a view that reads the replay mounts again
(`#story` ⇄ `#arena` ⇄ the board, and back from `#cards` or `#workshop`), a cursor
recorded while PAUSED is restored — the follower starts with `autoplay: false`
and the new transport is scrubbed to it — and a cursor recorded while playing is
not: the transport joins the live edge exactly as a fresh page does. A reload
still starts at the live edge (the map lives as long as the page).
`./scripts/spectate.sh --story` opens `/?replay=spectate/<name>.jsonl&follow=1#story`.

**Rationale.** "The story links back to the arena at the same frame" has to hold
while a game is being followed, and spectating's follow-up 8 (switching views
restarts following at the live edge) broke it for exactly the viewer who had
stopped to read. Watching live, the live edge IS the frame the viewer was on, so
restoring nothing is right; paused, the frame they chose is.

**Rejected.**
- **Restoring every cursor** — a viewer watching live who switched views would
  come back paused behind the game, the opposite of what follow mode is for.
- **One transport kept alive across views** — the mode app is unmounted on
  purpose (D125), and a transport outliving its page is the socket's exception
  (`liveTransport`), not a pattern to copy.

---

## D129 — The gate runs its steps CONCURRENTLY: GATE_JOBS jobs at a time, from a job table with dependencies; GATE_JOBS=1 is the serial gate

*Branch `gate-speed` (worktree `mtg-table-t2s`, off `main`'s `4408283`, rebased
onto the story page's `0af97a9`). Written as **D160–D166** in the lane's
reserved range D160–D169, while other lanes cut the same day numbered their
own, and renumbered contiguously at merge, after the story page's D124–D128:
these seven are **D129–D135**, in every file that cites them — this file,
CLAUDE.md, PLAN.md, README.md, `docs/evidence/gate-speed.md`, and comments in
`tools/check-all.sh` and `tools/ten-games.sh`.*

**2026-09-28** (the gate-speed lane; `docs/evidence/gate-speed.md` is what was
measured)

**Decision.** `tools/check-all.sh` is a table of JOBS — shell functions, each
run in a subshell of its own with `set -e`, its step number for `die`, and its
stdout and stderr in its own log — and a scheduler that keeps `GATE_JOBS` of
them running. `GATE_JOBS` defaults to `min(4, nproc/4)`, at least 1 (4 on this
16-thread box). A job starts when every job it depends on has PASSED, in a fixed
priority order: the cheap checks with no JVM first (step 6's comparison, the
committed fixtures' redaction, the checker's selftest, the catalog), then
longest-first with what feeds a dependency first (10g and vitest, because
`node --test` waits for step 10; Smoke, because 9c and 9e wait for it).

- **The dependencies are the ordering rules, written down:** everything waits for
  check-forge → lint → build; step 6 for step 5; 6b's comparison for its two
  recordings; 9c's report for its fourteen rows; 9c's rows and 9e for Smoke;
  `node --test` for 10a, 10b, 10c, 10d, 10f and 10g (the logs
  `MTGTABLE_WS_LOGS` names); step 11's fresh half and 12d for every job that
  records a frame log. 12b and 12c depend on the build alone.
- **Split where the halves are independent, never where an assertion would
  move:** 6b is three jobs (paced, seat 1, the comparison); 9c is fourteen rows
  (`tools/ten-games.sh --run-row N`) and a report (`--report`); step 10 is seven
  (10a..10g, **D131**); step 11 is the committed fixtures and the fresh
  recordings; step 13 is `npm run build`, `vitest run` and `node --test`
  (**D131**). Every assertion is where it was, in the job that owns its files.
- **`tools/ten-games.sh --jobs N`** is the same thing standalone, on
  `tools/deck-smoke.sh`'s pattern: each row a background subshell writing its
  block to `$TEN_GAMES_DIR/ten-<seed>.out`, a line per finished row, the blocks
  in row order, then the sweep and the summary; the first failure starts no new
  row. `--jobs 1` is the old loop byte for byte. Every row keeps its eleven
  assertions: its own `--game-id`, frame log, server log and redaction file mean
  nothing a row asserts can be satisfied by another row's files.
- **`GATE_JOBS=1` is the gate as it was**: the jobs in the serial order, each
  one's output streamed to the console as well as to its log, so the console
  carries the old log's lines in the old order — then the timing table
  (**D130**). *(Corrected at merge: this said "byte for byte". It is not: every
  job runs under `2>&1 | tee`, so `die`'s stderr arrives on stdout; 10g prints
  three new `was played` lines (**D134**); and the table follows `check-all OK`.
  Evidence §6 lists the differences.)*

**Rationale.** The gate had grown to 900–990 s, and a gate that long is run less
often than it should be. Every JVM step is a separate process with its own
`--game-id`, its own `var/` paths and (after **D131**) its own port, so almost
nothing in it was ordered by anything but the file's line order. *(Corrected at
merge: every JVM shared one Forge `userDir`, `var/forge/`, until the amendment
below gave each job a home of its own.)* Measured on this
box from a deleted `bridge/out`, with other worktrees' gates running beside it:
**253.4, 253.5 and 253.6 s** at `GATE_JOBS=4`, three runs back to back, and
**151.0 s** at `GATE_JOBS=8`, against **921 s** for `main`'s serial script and **933 s** at `GATE_JOBS=1`; the final run took **274.4 s** at a load average of 6–18 (evidence §2, §6). The makespan
is the pool's: the jobs' seconds sum to ~985 s, so four slots finish in ~250 s,
and 10g's three games (~134 s) are the longest single job — the whole critical
path at eight. *(At merge, after the last edit to the script and with every job
in a Forge home of its own: 242.3, 258.4 and 246.6 s at four, 151.2 s at eight,
906.9 s serially; evidence §10.)*

**Known cost.** Concurrency adds load the gate makes itself, and can move any
wall-clock race it has always had — which is why **D135** reports every flake
instead of retrying (none in six parallel runs; evidence §3). ~~All the
JVMs share one Forge `userDir` (`var/forge/`), as every serial gate's did one
after another and `tools/deck-smoke.sh --jobs` has since D117.~~ *(Until the
amendment below.)* The one file in it
that more than one game writes is `achievements/constructed.xml`, which Forge
saves at a human seat's game end by a truncate and a write; a JVM that exits
between the two leaves it empty — serially too, measured — and the next reader
prints a `SAXParseException` its own `load()` catches (`javap`-confirmed). No
assertion reads it; evidence §3.2 and PLAN.md's gate-speed follow-up 1 have
the rest.

**Rejected.**

- ~~**A per-job Forge home** (a scratch config through `MTG_TABLE_CONFIG`, as
  12c's crash check builds one): 24 profile directories per job, the redirect of
  every userDir path, and the gate's preferences fingerprint (9c rows 11–14 and
  9e) would then fingerprint a directory no other job shares — weaker, not
  stronger. The one shared file that games write is not the gate's to fix
  (above).~~ **Adopted at merge** — see the amendment below, which says why the
  fingerprint argument was wrong.
- **A make-style jobserver** shared with `ten-games.sh` through a FIFO: one pool
  across two scripts, but a lost token deadlocks the gate, and 9c's output would
  still need assembling. The row jobs in the gate's own pool balance as well.
- **`ten-games.sh --jobs N` as ONE gate job holding N slots**: the rows' tail
  would idle slots other games could use.
- **Retrying a failed job**: see **D135**.

**Amended at merge (2026-09-28, the rebase onto the story page's `0af97a9`).**
The verifier found this entry's rationale and README's gate paragraph claiming
"its own `var/` paths" for every JVM while every JVM of a parallel gate booted
in the one `var/forge/` — and writing `achievements/{constructed,challenges}.xml`
there, where one JVM's exit mid-save leaves an empty file the next one reads.
This decision had not landed, so it is amended here rather than superseded:
**every job boots Forge in a home of its own.**

- `tools/check-all.sh`'s `job_home` runs in each job's subshell before its
  function and builds `var/check-all/<run>/<job>/` with `tools/config.sh`'s
  `forge_home_make`: `forge-home/res` linked to the `res/` beside the jar (as
  `tools/make-forge-home.sh` derives it), a `forge.profile.properties` naming
  the job's own `forge/` and `cache/`, D14's overlay copied into
  `forge/custom/cards/` (the committed `forge-home/custom-cards/` still holds its
  one file, hard rule 11), and a `config.json` — `config.json` itself with
  `forgeHome` pointed there and `repoRoot` added — exported as
  `MTG_TABLE_CONFIG`, which `bridge/run.sh` already honoured (D115). The jar
  still comes from `forgeJar` or `$FORGE_JAR` (hard rule 9), and Bootstrap's
  three preferences are set in memory exactly as before (hard rule 11).
- **`repoRoot` is the one bridge change.** `Config.root()` was the config
  file's own directory, and the bridge resolves `var/games/<id>/`, `--deck`,
  `--out` and the session header's deck `path` against it; a config beside its
  home under `var/` would have moved every frame log and changed every header.
  With `repoRoot` (an absolute directory; a relative one or a missing one is an
  error) the root is the checkout and nothing on the wire or on disk moves.
  Only `forge_home_make` writes the key.
- **`tools/ten-games.sh` gives each ROW its own home**
  (`$TEN_GAMES_DIR/home-<seed>/`), serially and under `--jobs` alike, so the
  serial gate's fourteen rows do not share one either. **`scripts/spectate.sh`
  keeps a gate job's config** (a path under `var/check-all/<run>/<job>/`) where
  it unsets every other, so 6b's two recordings get theirs. Step 12c keeps its
  own scratch home.
- **The preferences check got stronger, not weaker.** The rejection above
  argued that per-job fingerprints would each watch "a directory no other job
  shares". That was the point it missed: the shared fingerprint held only the
  JVMs that happened to be running during 9c's rows and 9e — and could blame a
  row for another job's write. Now every home starts with no preferences file,
  and `job_prefs_check` fails any job one of whose JVMs saved one: every JVM the
  gate runs is checked. 9c's rows and 9e still fingerprint `~/.forge/preferences/`
  and `var/forge/preferences/`, plus their own home's.
- **What it costs:** a `node` call and a few `mkdir`s per job (tens of
  milliseconds), and disk: a home a JVM booted in is ~140 KB (the 24 profile
  directories), an unused one ~36 KB, 4.1–4.2 MB a run under
  `var/check-all/<run>/` (PLAN.md's gate-speed follow-up 4).
- **What it does not fix:** Forge's truncate-then-write save itself. A JVM that
  exits mid-save can still leave an empty achievements file in its own home,
  and no JVM boots in that home afterwards: the one job that starts a second
  JVM in its home is 9e, whose refusal run exits before the engine boots (12c's
  two share its own scratch home and crash before a game can end). Measured in
  evidence §10: once in the merge's runs, in a ten-games row's home, read by
  nothing.

---

## D130 — Every job logs to its own file; the console gets a start and an end line per job and a TIMING TABLE; `gate.log` is the serial log; a failed job always says so

*Branch `gate-speed`: written as D161 in the lane's reserved range D160–D169,
and **D130** since the merge (see D129).*

**2026-09-28** (the gate-speed lane)

**Decision.** Each run writes `var/check-all/<YYYYmmdd-HHMMSS>-<pid>/`: one
`<job>.log` per job (its whole stdout and stderr — what the serial gate printed
for that step), `timing.txt` and `gate.log`, every job's log concatenated in the
SERIAL order (9c's rows through the report's copy of their blocks), i.e. the log
`GATE_JOBS=1` prints. The console shows, in parallel mode, one line when a job
starts and one when it ends (`ok`/`FAILED`, its seconds, the 1-minute load
average), then the TABLE: step, job, start and end in seconds since the gate
began, seconds, status (`ok`, `FAILED`, `killed`, `not run`), the load at its
end, and a footer with the wall time, the sum of the jobs' seconds and the load
average at the start, at its highest and at the end. The step's JVM logs
(`var/check-all-smoke.log` and the rest) keep their names.

**On a failure**, in either mode: no new job starts; every running job is
stopped (SIGSTOP, then SIGTERM to its whole process tree — found through
`ps --ppid`, so only processes this gate started — then SIGKILL after 5 s for
anything left); the failed job's log tail (60 lines) is printed, then the table,
then — if the job's own `die` did not already print one — `check-all FAILED at
step N: job <id> exited <rc> without a message`; exit 1. Ctrl-C does the same
and exits 130.

**Rationale.** Seven JVMs interleaving their output on one console is
unreadable, and the old console log is what every doc and evidence file quotes,
so it is kept as a file rather than given up. The table is the measurement the
lane was asked for, and it makes the next slow step visible to whoever adds it.
The unconditional FAILED line is D113's lesson generalised: step 6 once died of
`set -e` with exit 141 and no message; now no job can.

**Rejected.** Prefixing every line with its job (`[10g] ...`) on the console: it
is still interleaved, and the per-job file is what anyone reading a failure
opens.

---

## D131 — Step 10's seven servers each get a port (WSPORT+0 .. WSPORT+6); step 13 splits into build, vitest and `node --test`, and only `node --test` waits for step 10

*Branch `gate-speed`: written as D162 in the lane's reserved range D160–D169,
and **D131** since the merge (see D129).*

**2026-09-28** (the gate-speed lane)

**Decision.** With `GATE_JOBS > 1`, 10a..10g listen on `WSPORT+0` ..
`WSPORT+6` (10a on `WSPORT`, 10g on `WSPORT+6`), so all seven servers can be up
at once; each job sets its own `WSPORT`, `WS_PID` and EXIT trap in its own
subshell, and `ws_start`/`ws_finish` are unchanged. `GATE_JOBS=1` keeps the one
`WSPORT` for all seven. `WS_LOGS` — step 13's `MTGTABLE_WS_LOGS` — is now a
constant built at the top of the file in the order the serial gate accumulated
it, instead of a variable steps 10c, 10f and 10g appended to. In parallel mode
step 13 is `npm run build`, `npm run test:render` (`vitest run`) and
`npm run test:node` (`node --test test/*.test.ts` with `MTGTABLE_WS_LOGS`) —
the two halves of `web/package.json`'s own `test` script, the same commands; the
serial gate still runs `npm run build && npm test`.

**Rationale.** `web/test/ws-log.test.ts` is the only reader of
`MTGTABLE_WS_LOGS`, and it is in the `node --test` half (~7–9 s). The vitest half
is `render.test.tsx`'s ~55 s on one thread over committed fixtures only; waiting
for step 10 would have put it on the critical path.

**Rejected.** Waiting for all of step 10 before any of step 13: ~60 s on the
end of every run for no dependency.

---

## D132 — No `| head`, no `| tail`, and no early-exiting reader in a pipeline the gate judges under `pipefail`

*Branch `gate-speed`: written as D163 in the lane's reserved range D160–D169,
and **D132** since the merge (see D129).*

**2026-09-28** (the gate-speed lane; PLAN.md's engine-and-sets follow-up 2)

**Decision.** In `tools/check-all.sh` and `tools/ten-games.sh`: the first match
of a key in a file is `sed -n '/^KEY=/{s///p;q}'` (sed's own quit, no reader to
cut it off); a frame log's last line is `last_is_over`, a `$(tail -n 1 file)` and
a pattern; "an UNIMPL line other than the summary's" is two `grep -c` counts
compared, not `grep | grep -qv`; a failure path's excerpt is `sed -n '1,5p'`,
which reads its whole input; the console smoke's five lines arrive as a
here-string, not `printf | jvm`. `grep -nE '\| *(head|tail)'` over both files
now matches comments only.

**Rationale.** Under `set -o pipefail` a pipeline's status is its last non-zero
member's, and a reader that exits early (`head`, `grep -q`) SIGPIPEs a writer
still writing: 141. D113 removed the one that bit (`diff | head -20`, step 6's
silent exit). Two more were latent: 9e's and ten-games' `if grep -n UNIMPL log |
grep -qv '…none$'` would have turned **false** — no failure — on a log whose
UNIMPL lines outran the pipe buffer, i.e. exactly when there were most of them;
and ten-games' failure-path `grep | sort -u | head -5` would have ended the
script with 141 before its own message.

---

## D133 — The preferences fingerprint is of FILES: a directory with none prints the same line whether it exists or not

*Branch `gate-speed`: written as D164 in the lane's reserved range D160–D169,
and **D133** since the merge (see D129).*

**2026-09-28** (the gate-speed lane)

**Decision.** `tools/ten-games.sh`'s `prefs_fingerprint` (rows 11–14's
assertion 10, now every row's) and `tools/check-all.sh`'s `ms_prefs` (9e) print
`<dir>: no files` for a directory that is missing OR empty, and every file's
sha256, mtime and size otherwise.

**Rationale.** The first `./tools/ten-games.sh --jobs 4` in this fresh worktree
failed all four of its first rows: `var/forge/preferences: absent` before, an
empty `var/forge/preferences/` after — FModel.initialize creates the directory
on a checkout's first engine boot. No preferences file was written; it would
have failed row 1 SERIALLY too, on any fresh checkout, and only the gate's own
steps 4–9 booting the engine first had ever hidden it. The assertion is about a
`ForgePreferences.save()`, which writes a file; a file still changes the print.

---

## D134 — Step 10g asserts that each of its three games was PLAYED: a `state` frame at turn 1 or later

*Branch `gate-speed`: written as D165 in the lane's reserved range D160–D169,
and **D134** since the merge (see D129).*

**2026-09-28** (the gate-speed lane; PLAN.md's engine-and-sets follow-up 3)

**Decision.** For each of 10g's three frame logs the gate counts the `state`
frames and their highest `turn`, and fails the step unless there is at least one
and the highest is 1 or more; it prints `OK: <gameId> was played: N state frames,
up to turn T`.

**Rationale.** 10g asserted one `over`, `over` last, one `hello_ok`, its own
`gameId`, a `gameOver` state (D114) and redaction — every one of which a game
that dies at birth, or whose engine throws at the deal (D115's `over`), can
satisfy. "OK: three games" once printed over a game that died at birth, and only
`web/test/ws-log.test.ts` caught it, at step 13. Measured: 118/167/258 state
frames up to turns 13/16/22 on the first parallel run.

---

## D135 — Nothing in the gate is retried: a step that fails under concurrent load and never serially is a finding

*Branch `gate-speed`: written as D166 in the lane's reserved range D160–D169,
and **D135** since the merge (see D129).*

**2026-09-28** (the gate-speed lane)

**Decision.** The parallel gate has no retry, no "flaky" list and no longer
timeout than the serial one (`GAME_TIMEOUT` is still per JVM). A failure is
reported with its job, its log and the load average, and `GATE_JOBS=1` is the
reproduction.

**Rationale.** A retried gate is one that teaches re-running until green — D113's
and D114's races were each "one failure in a few runs under load" before they
were found and fixed at their causes. Concurrency is load the gate makes itself,
so it is the cheapest place those races will ever show again. What the lane's own
runs found is in `docs/evidence/gate-speed.md` §3. *(At merge:* it has found
one since — step 8's scripted concede racing Forge's game thread through
`runPreOpeningHandActions` into a `ConcurrentModificationException`, once in the
verifier's serial run and once in the merge's second parallel run, both at a
load average of 9–13. Each failed its run with the cause, as D115 says a crash
must; neither was retried by the gate; the lane recorded both with their logs
(evidence §3.3, PLAN.md's gate-speed follow-up 8) and started the failed run
again as a new one.)

## D136 — `undo` and `useMana` are applied only while the engine is quiet on this seat, otherwise `notice {title:"Not now"}`; a `concede` from a running engine is deferred to the engine's own check; no fourth hop

*Branch `undo-race` (worktree `mtg-table-t2t`, off `main`'s `4408283`, rebased
onto the gate-speed lane's `6b35054`). Written as **D170** on the lane's
instruction, while `main` ended at D123 and the story page and the gate-speed
lane took D124–D135 the same day, and **D136** since the merge, in every file
that cites it — this file, CLAUDE.md, PLAN.md, README.md, `docs/protocol.md`,
report 11, `docs/evidence/undo-race.md`, `tools/`, and comments in `bridge/src`.
Its protocol amendment kept its number, **M48**: nothing landed after spectating's
M47 in between.*

**2026-09-28** (`docs/evidence/undo-race.md` is what was measured; PLAN.md *The
undo race* is the status and the follow-ups)

**Decision.**

1. **Two of `applyAct`'s cases write engine state from `mtg-table-EDT` outside
   Forge's input protocol and are refused when the engine is not quiet** (a
   third, `concede`, is item 4). `undo` is
   `PlayerControllerHuman.undoLastAction()` → `MagicStack.undo()`, which pops
   the undo stack, untaps and refunds, and consults no input at all. `useMana`
   is `InputPayMana.useManaFromPool` → `ManaPool.tryPayCostWithColor`, which
   checks neither the input's `finished` flag nor its `locked` one. Each is
   applied only when `ActGuard.whyNotNow` finds the engine **quiet on this
   seat**, read on the EDT immediately before the write, in this order:
   1. the game is live (the engine has asked this seat something; not over);
   2. no ask is outstanding (`ReplyPool.pending() == 0`);
   3. an input is up (`InputQueue.getInput() != null`) — **D39**'s positive
      predicate;
   4. the input generation is the one the act **arrived** under, read in
      `onAct` on the transport thread — **D22**'s stamp;
   5. the input is not an `InputPayMana` that `isActivatingManaAbility()`;
   6. no OK / pass this EDT gave an `InputPassPriority` is still with the
      engine (the same input up, the generation and the engine's ask count
      unmoved since the press);
   7. none of our own view-walking hops is between its submission and its end;
   8. no game thread that has entered the bridge is running
      (`Thread.getState()` RUNNABLE, BLOCKED or NEW).
2. **A refused act is dropped with `notice {level:"warn", title:"Not now"}`**,
   the reason on stderr (`NOT NOW: undo refused … — <reason>`), and a count in
   the run summary (`acts not now = undo N, useMana M`). Nothing is queued. The
   summary's M6 `undo` count is now the undos **applied**.
3. **No fourth hop.** The write stays on the EDT, where desktop Forge makes it
   (its Ctrl+Z and its mana-pool click). Hard rule 3's three hops are unchanged.
4. **`concede` is the third act that writes the engine from the EDT, and it is
   never refused.** `PlayerControllerHuman.concede()` is `Player.concede()` —
   one field, `PlayerStatistics.outcome` — and then
   `GameAction.checkGameOverCondition()` **on the calling thread**, which walks
   `Game.getPlayers()` and edits it (`onPlayerLost`). When the engine is quiet
   (the conditions above, the act's own generation aside — a concede is not a
   decision about a board) it is applied whole, as before. Otherwise only the
   outcome is written; the game ends where every game ends, at `Game-0`'s next
   state-based check (`checkStateEffects` → `checkGameOverCondition` →
   `Player.checkLoseCondition`), on its own thread; any ask a game thread is
   parked in is answered with its §5.4 default so it can get there
   (`ReplyPool.resolveAll`, which leaves the pool open), and the seat is asked
   nothing more (`ask()` answers null at once). If the engine parks on this seat
   first, the rest of the concede is applied there — posted by the next engine
   `input` and polled every 25 ms through Forge's own `FThreads.delayInEDT`, so
   no thread of ours waits. Stderr says `CONCEDE DEFERRED`, and the summary
   `concedes = N at once, M deferred`.
5. **Every other act is left to Forge's input protocol**, and why is recorded
   per act in `docs/evidence/undo-race.md` §3: `clickCard`, `clickPlayer`,
   `clickAbility`, `buttonOk`, `buttonCancel`, `passPriority` and `alphaStrike`
   go through `InputProxy`, which resolves the current input at call time, into
   `InputBase`, which ignores a finished input, and `InputPayMana` ignores a
   click while it is activating; `setPhaseStop`, `yieldTo` and `setYield` write
   the bridge's stop map and Forge's `YieldController` exactly as desktop Forge
   does from its EDT; `newGame` is M45's; `resync` touches only the bridge.
6. **Two test hooks, both read once from the environment and off by default.**
   `MTGTABLE_HOLD_UNDO_WINDOW_MS` holds the game thread, spinning, at the first
   state of a game that offers an undo while no input is up (the reproduction
   below). `MTGTABLE_TEST_UNGUARDED_ACTS=1` turns the guard off — `undo`,
   `useMana` and `concede` applied at once, as before — the negative control,
   announced on stderr. `tools/undo-race-repro.sh` runs both halves; gate step
   10g runs the first and asserts the refusal every run.

**Rationale.**

- **The defect.** `MagicStack`'s undo stack is a plain `java.util.Stack`.
  `Game-0` walks it in `recordUndoableActions` → `clearUndoStack`, a
  `lastIndexOf` and then a `remove(int)` per entry, every time it adds a
  non-undoable spell to the stack. The story branch's first gate run
  (2026-09-28, step 10g) sent `undo` on the `state` a Thallid's `{G}` payment
  flushed, the EDT popped the stack between `Game-0`'s `lastIndexOf` and its
  `remove`, and `Vector.remove` threw `ArrayIndexOutOfBoundsException: Array
  index out of range: 0` inside `PhaseHandler.mainGameLoop` — an engine crash,
  which **D115** turned into an error `notice`, a null `over` and a failed run.
  M6's evidence §4.3 had seen the same race throw out of `undoLastAction()` on
  the EDT, where `applyAct` caught it. The M6 row "the undo race is Forge's own
  and is caught, not fixed" was half right: the race is between Forge's stack
  and **our** act, and on `Game-0` nothing of ours catches it.
- **Where the window is, from the jar.** `InputPayMana.onOk` (the policy's
  `Auto`) sets `locked` on the EDT and hands the payment to a `Game-n` worker
  (`GameAction.invoke` → `ThreadUtil.invokeInGameThread`). The worker taps the
  land, records the mana ability on the undo stack, and calls `stop()`, which
  runs `onStop`, **removes the input**, flushes our forwarder (an
  `InputQueue` observer — the `state` that offers the undo, depth 1) and only
  then counts the latch down, releasing `Game-0` into `MagicStack.add`. So the
  one `state` in the game that offers this undo is emitted while no input is up
  and the engine is about to walk the stack: condition 3 is exactly the fix,
  and `Game-0` resumes into `clearUndoStack` whatever the EDT is doing.
- **Why D39's two conditions need more for a WRITE.** D39 wrote "parked" for a
  READ on a second worker, where a stale answer costs a skipped refresh (and
  counted an outstanding ask as parked). For a write, "an input is up" has to
  mean "nothing else is touching the engine", and the jar has six ways it does
  not: an ask's answer wakes its
  game thread from the transport thread, which the EDT does not serialise with
  (2); a re-render or a `stop()` can land between the act's arrival and its turn
  on the EDT — every `stop()` moves the generation first, through `onStop` →
  `clearActionableCards` → our `clearWeaklySelectable` (4); `InputPayMana`'s
  activation worker taps lands and records the undo stack with the input still
  up (5 — M6's §4.3 failure); `InputPassPriority.passPriority(Runnable)` hands a
  pass to a worker whenever mana would be lost (the mana-lost confirm, D43), and
  that worker is invisible until it reaches our `showConfirmDialog` (6); our own
  refresh and ability-menu hops walk the graph (7); and `Game-0` itself pushes
  the input **before** it flushes our forwarder and parks (`setInput` is
  `push`, `syncPoint`, `updateObservers`), so for the length of that flush an
  input is up and `Game-0` is walking (8). Each condition is exact for its path:
  5 is Forge's own flag, written on the EDT before the hop and cleared on the EDT
  by `updateMessage` after it; 6 marks only an OK/pass on an
  `InputPassPriority`, whose `onOk` either stops the input, re-renders it, or
  hops — and the hop always asks; 7 counts from submission, so a hop the pool has
  accepted but not yet scheduled is in flight.
- **Why the thread-state reading is sound as a filter.** `Thread.getState()` is
  documented for monitoring, and it is used only to refuse. Its dangerous
  direction — a thread reported waiting while it runs engine code — cannot
  happen: a thread writes its own wait state as it enters the wait. The reverse
  lag (woken, not yet scheduled, still reported waiting) needs a waker, and
  every waker that is not the EDT (busy running the check) is an earlier
  condition: the transport by 2 (the woken thread removes its own
  `ReplyPool` entry), a worker's `stop()` by 3 (it removes the input before it
  counts the latch down), a hop by 7, `InputPayMana`'s worker by 5, the pass
  worker by 6. `ActGuardSelfTest` holds the reading on real threads.
- **Why the concede, and why it is deferred rather than refused.** It was not
  on the list this lane started from; the natural-timing sweep found it (§5 of
  the evidence). `ws-auto-play --undo-race` concedes the moment the bridge
  refuses its undo — while the engine is still running towards the stack — and
  in 2 of 30 guarded runs `Game-0` threw `ConcurrentModificationException`
  walking the player list (`Game.copyLastState`,
  `GameAction.checkGameOverCondition`) under the EDT's own
  `checkGameOverCondition`; a third ended in an `over` with no `gameOver` state.
  Refusing a concede would leave a player who wants out at the table, so it is
  split at the one line where it becomes a walk: the outcome is a field Forge's
  own loop reads, and the walk is left to the loop.
- **Why no fourth hop — its exclusion argument would have been empty.** A hop
  lands the runnable on a **second** `Game-n` worker, never on `Game-0`, which
  is parked in a latch and runs nothing it is handed. That worker would race
  `Game-0` over the same unlocked `Stack` exactly as the EDT does, and it would
  pass `ThreadUtil.isGameThread()`, so the write would look legal to hard rule
  3's assert while being no safer. What was missing was never the thread; it was
  the check that the engine is actually parked, which desktop Forge leaves to the
  speed of a human hand and an automated client does not.

**Measured** (`docs/evidence/undo-race.md`). The reproduction runs the same way
every run: guarded, the undo sent into the held window is refused, the undo
stack is untouched across the hold, and the concede sent after it is deferred;
with the guard off, no notice, the undo stack goes 1 → 0 **while the engine
thread is held inside the engine**, and the concede is applied at once. At
natural timing, with no hold, thirty seeds each: the unguarded late undo landed
where the guard would have said "no input is up" in 30 of 30 and crashed
nothing on this machine (the `ArrayIndexOutOfBoundsException` needs the EDT's
`remove` to fall between `Game-0`'s `lastIndexOf` and its `remove`; the story
run met it at gate load); the concede race crashed `Game-0` twice (and ended a
third game in an `over` with no `gameOver` state) in the thirty guarded runs
made before the concede was guarded, and in none of the thirty after. Gate step
10g holds the window, requires the refusal
(`--require-late-undo`), and proves `undo`'s effect with a second undo that
floats a land's mana at priority and undoes it while the engine is parked.

**Known cost.**

- **A legitimate undo can be refused once.** After a land is tapped at priority,
  `Game-0` flushes the `state` that offers the undo *before* it parks (condition
  8), so an undo sent the instant that state arrives can draw "Not now". Sending
  it again succeeds; `tools/ws-auto-play.mjs` retries after 150 ms, and a person
  pressing Undo twice is the whole cost.
- **One residual path, bounded and open.** `setPhaseStop`, `yieldTo` and
  `setYield` can press OK through Forge's own `tryAutoPassNow()`, and so can
  start the mana-lost worker; condition 6 does not mark them, because there it
  cannot tell a press from no press without refusing legitimate undos until the
  next re-render. In the microseconds before that worker enters the bridge it
  reads `Localizer` and `ManaPool.hasBurn()` and nothing else; once it enters,
  condition 8 sees it. An undo that begins in that gap can overlap the worker's
  first walk (a read). PLAN.md's follow-up names it.
- **The clicks are not guarded against our own walks.** An EDT click that makes
  Forge write input-owned state on the EDT (declaring an attacker, a target) can
  still overlap a refresh walk D39 started a moment earlier. That is D39's own
  hazard, not this defect's, and it is recorded as a follow-up rather than
  widened into here.

**Rejected.**

- **A fourth `invokeInGameThread` hop** — above.
- **A lock around the EDT's write and every `flushState` walk.** The undo
  untaps and refunds, which fires game events; Guava delivers them to
  `GameEventForwarder.receiveGameEvent` — `@Subscribe` without
  `@AllowConcurrentEvents`, so under the subscriber's monitor — and a game thread
  holding that monitor while it waits for our lock deadlocks against the EDT
  holding our lock while it waits for the monitor. D39 rejected a lock for a
  sibling reason.
- **Queuing the act until the engine parks.** An undo or a pool pip is a
  decision about the board the player saw; applying it to a later board is the
  defect, moved. (A concede is not such a decision, which is why it alone is
  carried forward.)
- **Refusing a concede with "Not now" like the other two.** The player wants
  out, and the board's Concede would then need a retry loop of its own; the
  outcome field is the part that cannot wait and the one that is safe to write.
- **Catching the exception and carrying on** (M6's state). On `Game-0` there is
  nothing of ours to catch it, and D115 is right to call an escaped engine
  exception a failed run.
- **Deciding by the prompt** (`Pay Mana Cost`, a button labelled `Auto`) — M5
  convention 4: never decide what a control does, or when, by matching an
  engine string.

---

*Lane LOOK's ten decisions — the first of report 15's three art-direction lanes
(`docs/research/15-art-direction.md` §9) to land. Branch `look` (worktree
`mtg-table-t2l`), cut from the art-direction report's `c81f674` on `main`'s
`a092d3a`, and rebased onto the undo race's `f6bad35`. Written as **D120–D129**
in the lane's reserved range D120–D129 while `main` took D113–D136 the same two
days — spectating's D118–D122, the narrator's D123, the story page's D124–D128,
the gate-speed lane's D129–D135 and the undo race's D136 among them, so every
one of the lane's numbers was taken — and renumbered contiguously at merge:
these ten are **D137–D146**, in the order they were written, in every file that
cites them — this file, CLAUDE.md, PLAN.md, README.md, `docs/evidence/look.md`,
and comments and test names under `web/src/arena/`, `web/src/workshop/` and
`web/test/`. Each keeps its branch note with both numbers. Lanes MOTION and
BODIES number theirs after D146 when they merge.*

## D137 — The arena's figures are drawn in the COMIC look by default; D53's hologram is kept behind `?look=holo`, as one number on one program

**2026-09-28** (Lane LOOK, branch `look` — *written as D120, the first of the lane's
reserved range D120–D129, and **D137** since the art-direction lanes were
renumbered contiguously at merge*. The user's decision on report 15, given in chat after judging the
spike's pictures beside their card art: "the direction is approved".
**Supersedes D53's "unlit"** — not its "no lights": see below.)

**Decision.** Every creature, every dying body, both duelists and every painted
prop kind are drawn in the **comic look** (`docs/research/15-art-direction.md`
§2–§3): the D97 costume palette PAINTED — saturation ×1.25, "black is blue"
below 4.5 % luminance — in **three flat bands** from one key light (**D138**),
the core shadow cooled (×(0.46, 0.44, 0.66)) and screened with a 45° halftone of
5 CSS-px cells, a specular dot on the lit band, and the card's own colour as a
rim on the silhouette's shadow side; opaque. With it come the ink line
(**D139**), the contact shadow (**D140**) and the stage (**D141**).

- **One program, one number.** The figure material
  (`scene/figureMaterial.ts`, `holoMaterial.ts` until this lane; a re-export is
  left for one release) carries both looks, mixed by `uLook` 0…1. The comic
  block is shared GLSL with the prop material (`scene/propMaterial.ts`), and its
  numbers are ONE set of uniform value objects (`COMIC_UNIFORMS`) spread into
  every material, written at commit by `applyComicGlobals`. `look.ts`'s `COMIC`
  holds every number; none is a literal in GLSL.
- **The switch.** `perf.ts`'s `LOOK_DEFAULT` is `'comic'`; `?look=holo` restores
  D53's table exactly (the felt, no ink, no shadow, no halftone). `?ink=none`,
  `?halftone=0`, `?key=world`, `?stage=felt` and `?shadow=0` switch one part
  each. `main.tsx` keeps them as a query string (it imports nothing under
  `arena/`, **D49**) and `Arena.tsx` parses it once. The workshop's toolbar
  switches every one live.
- **Written at commit, never in the frame loop.** `uLook` is written only by
  `applyLook` and `applyPropLook`, from layout effects and the fields' commit-time
  methods; `liveness.test.ts` asserts no frame-loop body names it
  (negative-controlled). Lane MOTION's hologram-to-ink summon writes
  `uMaterialize` instead — identity 1, multiplied into the look in the shader —
  so the look itself never needs a frame-loop write.

**Rationale.** Report 15 §1: the figures read "dull and bare" beside the card art
because they are its opposite — a view-angle glow over flat colour, no light
direction, no line, no ground contact, on a felt of L* 7–13. The art's STYLE
(ink, flat saturated colour, two or three value bands) is free, carries no
provenance, and applies to every CC0 body (**D54** untouched). Measured
(`docs/evidence/look.md`): at `g1.jsonl`@355 with bloom off the comic look draws
**82 calls and 27,541 triangles** against the hologram's 79 / 27,416, and one
program for every figure still.

**What "unlit" means now.** The scene still has **no lights**: no
`DirectionalLight`, no shadow map, and the cards are never shaded
(report 13 §8.3 rule 2). Figures and painted props are shaded from a light
direction held in a uniform. That is the sense in which D53's "unlit" is
superseded, and the only one.

**Rejected.** Keeping the hologram as the default with the comic look behind a
flag (the user approved the direction; the flag is the other way round now).
A second material or program for the comic look (the program count is the
budget line D53 defended). A 1-D ramp texture (a texture unit, and D67's
question, for no read the analytic bands lack). Lights in the scene.

## D138 — The comic look's key light belongs to the LENS: one view-space uniform, no scene light

**2026-09-28** (Lane LOOK, branch `look`; *written as D121 in the lane's reserved range
D120–D129, and **D138** since the merge.*
Report 15 §3.1.)

**Decision.** The key light is `COMIC.key = (−0.45, 0.72, 0.52)` in VIEW space —
upper left and a little toward the lens, the comic-panel convention — as a
uniform (`uKey`) against the same view-space normal the hologram's fresnel
already used. A world-fixed key (`COMIC.keyWorld`, turned into view space per
vertex) is the workshop's `world key` toggle and `?key=world`, not the default.
The contact shadow reads the same key, put on the table through the camera's
quaternion once a frame (**D140**), so the bands and the ground agree about
where the light is.

**Rationale.** The light belongs to the panel, not the world: both seats' visible
sides read the same — your figures' backs and the opponent's fronts since
**D143** — and there is no light uniform to keep in sync with anything. A
world-fixed key is physically consistent as the camera orbits, but it shadows
whichever seat's visible side faces away from it.

**Rejected.** A world key as the default (above). A `DirectionalLight` (a lit
scene is how 40 draw calls stop being 40; report 13 §8.3 rule 2).

## D139 — The ink line is a depth-edge EFFECT on bloom's composer; the inverted hull is deleted; the floor rung sheds the ink with bloom

**2026-09-28** (Lane LOOK, branch `look`; *written as D122 in the lane's reserved range
D120–D129, and **D139** since the merge.*
Report 15 §3.4's recommendation, measured again here. *Amended the same day by
the lane's verification pass, **D146**: the ink inks only where something
PAINTED is among its samples, and it is drawn only on bloom's composer — the
"with bloom off it is the composer plus one full-screen pass" configuration
below is gone, and so is the "Rejected: inking figures only" line.*)

**Decision.** The comic look's line is `scene/Post.tsx`'s `InkEffect`: a
`postprocessing` `Effect` with `EffectAttribute.DEPTH` that inks every pixel
where the Laplacian of 1/z, relative to 1/z, exceeds `COMIC.inkThreshold`
(0.012). It samples depth `COMIC.inkCssPx` (1.6) CSS pixels apart — times the
render dpr, written when the dpr changes — so the line's weight and the
threshold hold at every rung of the DPR ladder. `postprocessing` merges it into
bloom's own `EffectPass`: with bloom on (**D61**'s default) it costs **+0 draw
calls and +0 triangles**. With bloom off it is the composer plus one full-screen
pass (+1 call). `perf.ts`'s `INK_DEFAULT` is `'post'`, `?ink=none` turns it off,
and the governor's rung below the DPR floor now drops **bloom and the ink
together** (`perf.ts`'s `postOnFloor`): the bands, the rim and the shadow still
read without a line.

- **The inverted hull is deleted** — the figures', the props' and its material.
  Report 15 measured it at +16 draw calls and +20,000 triangles at `g1`@355
  (96 / 47,472, over both of report 13 §8.2's lines), and the weaker line: only
  the silhouette, cracked on hard-edged props, and one more mesh to keep in step
  with every new body. Nothing here measured otherwise.
- **The composer's children are memoised, and `Post` is `memo`** — found by this
  lane's bench. `@react-three/postprocessing`'s `EffectComposer` rebuilds every
  pass whenever its `children` change identity, and `Post` re-rendered with the
  arena on every snapshot and every loop-mode change: with the ink's depth read
  that relinked a program mid-game and put the GTX 1080's p95 at 35.5–39.1 ms
  against the hologram's 8.5–10.3 in three interleaved runs (33 → 34 programs
  in every comic run; a CPU profile of 5 s of 4× playback spent 274 ms in
  `getProgramInfoLog`, which a warm table never calls). Memoised, no program
  links during playback.
- **Mount-time primes compile for the target the frames are drawn into**
  (`scene/prime.ts`'s `compileFor`, handed `bloom || ink`): three compiles a
  program per output colour space, and the composer draws the scene into a
  render target, so a canvas-only prime left the combat burst's variant to the
  first combat. The first fix compiled both variants at every prime, which
  closed the link but cached every primed program twice (16 → 29 programs at
  `g1`@316 with no composer mounted); the primes now re-run when the composer
  comes or goes, and `FigureLayer`, `Table` and `DuelistLayer` prime through
  `compileFor` and never through a bare `gl.compile` (a liveness clause).

**Rationale.** By the lines the project gates on — draw calls and triangles,
with bloom on by default — the post pass is the cheaper line and the better one
(it inks every prop, the carrier and every crease the depth buffer sees).

The frame times were measured on this lane's quiet series: `g1`@316, the GTX 1080
idle, production builds, before and after alternating. With bloom on, the p95 is
within noise of the hologram: 5.25 against 5.5 ms. With bloom off it is **+1.65
ms**, 3.65 against 2.0, just over report 15 §9.1's +1.5. That is the composer's
own cost on this headless path, not the ink's: any composer halves the
unthrottled frame rate. At SwiftShader's 0.6 floor the ink costs about +9 ms p50,
which is why the floor rung takes it (`docs/evidence/look.md`; PLAN's Lane LOOK
follow-up 9).

**Rejected.** The hull (above). A normal pass (a second render of the scene,
report 09 §9.2 rule 3). Inking figures only — it would need a mask target; cards
and the tilted hand get a line today, which report 15 §11 question 3 left to the
user (PLAN.md, *Lane LOOK* follow-ups).

## D140 — The contact shadow is a POSE layer in the disc field: one instanced call, bound from the frame loop, leaning away from the key

**2026-09-28** (Lane LOOK, branch `look`; *written as D123 in the lane's reserved range
D120–D129, and **D140** since the merge.*
Report 15 §3.5.)

**Decision.** Under the comic look every PAINTED figure (`look.ts`'s
`paintsFigure`: not anonymous, not a ghost, with a model) stands on a flat dark
ellipse — `DiscField.shadowMesh`, one `InstancedMesh` for all of them, no
texture (the falloff is the quad's UV), its strength on `instanceColor.r`. It is
written in `DiscField.bind` from the pose and the live offset (a lunging figure's
shadow lunges), smaller and fainter the higher the figure flies
(`1 / (1 + 2.5 · height)`), and it leans away from the key light by
`COMIC.shadowLean` of its radius, the ellipse's long axis turned along the lean
— the key's direction put on the table through the camera's quaternion, once a
frame, with module scratch (the allocation scan reads the body). A painted
figure's glowing stand disc steps back to 30 % of itself. The shadow's program
is compiled at mount, for the target the frames are drawn into. It is drawn before the cards
(`renderOrder` 4) and writes no depth, so where a figure's feet touch its card
the card covers it: no shadow ever darkens a card's name bar.

**Rationale.** The hologram's additive disc lights the table, so every figure
floated (report 15 §1.3 cause 6). One call for every shadow, and a pose, so skip,
scrub and `resync` need nothing.

**Rejected.** drei's `ContactShadows` (a second render of the scene into a
target). Shadows over the cards (they would darken the name bar the figure
stands behind). A shadow for a hologram (an anonymous figure or a ghost casts
none, **D142**).

## D141 — The comic STAGE: a mid-value ground in each seat's SHOWN colours, a backdrop, and a combat burst — paint once, pose the rest

**2026-09-28** (Lane LOOK, branch `look`; *written as D124 in the lane's reserved range
D120–D129, and **D141** since the merge.*
Report 15 §4.)

**Decision.** Under the comic look the table is a stage (`scene/Table.tsx`):

- **The ground** is L* 28–35 instead of the felt's 7–13 — the ink and the bands
  vanish on the felt. Its light (a warm centre falling off to the rim, and a
  Ben-Day dot vignette) is ONE canvas painted once per page; the seats' colours
  are the ground quad's vertex colours, written at commit, which the light
  multiplies. Each half's colour is `look.ts`'s `stageToneOf`: the mean of the
  `COMIC.stageTones` of the WUBRG letters that seat has SHOWN — face-up cards on
  its battlefield, in its graveyard and in exile, never a redacted stub and never
  a face-down card (hard rule 8: a concealed card contributes nothing, not even a
  colour) — leaned 25 % toward the seat's default (teal, plum), so two decks of
  one colour still split the table. A seat that has shown nothing is its
  default.
- **The backdrop** is one open cylinder round the table, turned inside out so it
  shares the ground's program: a night sky, a Ben-Day screen and a skyline of ink
  blocks with lit windows, procedural and painted once per page (not an asset).
  +1 draw call, 96 triangles; it writes no depth, so the ink sees the table's own
  edge against it and nothing on it.
- **The combat burst**: radial action lines at the table's centre while
  `state.combat` has a band — a pose (`combatStageOf`), right after a skip, a
  scrub and a `resync`. *Amended by the verification pass (2026-09-28):* it is
  painted into a SECOND copy of the ground's light and swapped in as the ground's
  `map` on the pose — **+0 draw calls** (as its own mesh it was +1, three over the
  hologram during combat against report 15 §9.1's +2, and §4.2 had specified a
  swapped canvas), the same program (both maps are `USE_MAP`), both textures
  uploaded when the stage mounts (`gl.initTexture`), so `Table.tsx` primes
  nothing. The rim's Ben-Day screen went from 10 px to 7 at the same time: the
  verifier found the dots nearest the lens in views 3 and 5 coarse and busy.

**Rationale.** A mid value is the one change that makes the ink visible (report
15 §4.1). Colours in vertex colours mean a seat's first coloured card costs ten
numbers at commit rather than a repaint and a 4 MB upload (measured 4–20 ms and
1–19 ms on the GTX 1080 page).

**Rejected.** A photographic HDRI sky, real-time shadows and SSAO (report 15
§4.2). A deck's colours from anything but what it has shown (the list is not on
the wire, **D105**). The gold multicolour hex for a two-colour seat (every
multicolour deck would stand on the same gold).

## D142 — Under the comic look the HOLOGRAM keeps two jobs, and half a third: the anonymous figure, the ghosted spell, and a summoning-sick figure at half; the summon's hologram-to-ink is MOTION's

**2026-09-28** (Lane LOOK, branch `look`; *written as D125 in the lane's reserved range
D120–D129, and **D142** since the merge.*
Report 15 §2.3, as far as the lane's brief carries it.)

**Decision.** `look.ts`'s `figureLookOf(pose, table)` — the one place a figure's
look is decided, a pure function of the pose — gives the hologram (`uLook` 0, no
shadow) to:

- **an anonymous figure** (a face-down creature): it is already the disc with no
  model, no traits and no costume, and "a thing whose identity is withheld" is
  what a hologram says (hard rule 8's renderer half);
- **a ghost** (T6's creature spell on the stack, report 13 §6.2): the spell is not
  a creature until it resolves.

Everything else takes the table's look. `look.test.ts` sweeps every figure pose of
the committed corpus: 6,781 painted, 1,179 anonymous and 87 ghosts, none of the
last two painted. The **summon** — the hologram resolving into ink as a creature
arrives — is Lane MOTION's, through `uMaterialize`.

*Amended by the verification pass (2026-09-28):* **a summoning-sick figure is
HALF hologram** — `stance` `sick` (sick and not in combat, `figurePose`'s
precedence) draws `uLook` × `COMIC.sickLook` (0.5), report 15 §2.3's row and
§9.1 work item 8, which the first round had left as a question in error (the
brief assigns it to this lane). It is still a painted body: it casts a shadow
and takes the ink. A pose, so the snapshot that says it is no longer sick paints
it whole, after any skip. The corpus sweep: 1,487 of the 6,781 painted instances
are sick.

## D143 — A seat's own figures FACE THE OPPONENT

**2026-09-28** (Lane LOOK, branch `look`; *written as D126 in the lane's reserved range
D120–D129, and **D143** since the merge.*
**The user's answer to PLAN question 13**, given today. Supersedes **D81**'s
"your figures face you, and that is the user's call".)

**Decision.** `layout.ts`'s `seatFacingY` is **π for `you` and 0 for the
opponent**: two armies across a table. From the table view you see your figures'
backs and the opponent's fronts. D81's one line; everything that reads a
figure's facing — the rig, the prop field, the departing bodies, the `figure`
anchor, the attack turn (`figureYawTo`) — follows it through the one definition
of a front. An attack's turn toward its defender (**D82**) is now a small one.

**What was re-checked** (report 15 §9.1's raster, `traits.test.ts`, both seats,
standing and kneeling, centre and edge): every identity prop still reaches the
screen from both seats at ≥ 48 px **except the Doombot's jetpack**, which is on
its back by nature: 206 px from your seat (behind), **26 px** from the far seat
(in front). It joins the one-sided details with the `visor` band as its front
partner (97 / 117 px). The eyepatch reads 65 px from behind your figures (its
strap) and 43 px from the far seat's front, carried there by the coat (781 px).
Coulson's chest badge alone, seen from behind — the negative control, now your
seat — is 4 px. `facing.test.ts`'s negative control is the outward facing D143
replaced: with no turn it fires every beat out of the far side of the body.

**The workshop.** Its facing toggle's default is the arena's new facing (turn 0);
*faces its player* previews the facing before D143. *Amended by the verification
pass (2026-09-28):* the pedestal **opens on `1× front`** — `framing.ts`'s
`frontPose`, the close-up's distance and view 1's elevation from the side the
figure faces — because the judging tool opened on every figure from behind
(Fury a navy bell, Coulson's back emblem, Quake a silhouette). `1× from your
seat` is the old close-up; *both seats* still puts the opponent's copy, front
on, beside yours (without the composer, so without the ink).

**Rejected.** Keeping D81's outward facing (the user's decision).

## D144 — The figure material has a PAINT INPUT PATH: vertex colours and a texture map, both behind defines

**2026-09-28** (Lane LOOK, branch `look`; *written as D127 in the lane's reserved range
D120–D129, and **D144** since the merge.*
Report 15 §2.3 and §8.3. **Supersedes D67's "no texture" as far as the figure
material's input path** — the committed library still carries no texture.)

**Decision.** `makeFigureMaterial(tint, unitScale, { vertexColors?, map? })`
multiplies the palette by a geometry's `color` attribute (three's `USE_COLOR`)
and by a texture sampled at its `uv` (`USE_PAINT_MAP`), BEFORE the bands, the
halftone, the rim and the ink — and under the hologram too. Both are defines, so
today's bodies, which carry neither, stay one program; a model that brings one
compiles its own variant. Checked in the browser on the GTX 1080: all four
variants compile, and a green 1×1 map and grey vertex colours each multiply the
palette.

**Rationale.** Report 15's one sentence "for the record, because it decides
Tier 3": without a colour input a personal texture-baked model draws as a tinted
silhouette. Tier 3 is still undecided (PLAN question 14) and still personal-only
(**D54**); this only makes it drawable.

**Rejected.** A texture on the committed bodies (D67 stands for the library).

## D145 — The look is written when a SNAPSHOT or the look changes, never per frame — and the frame loop's one look number is `uMaterialize`

**2026-09-28** (Lane LOOK, branch `look`; *written as D128 in the lane's reserved range
D120–D129, and **D145** since the merge.*
Report 15 §9.1's liveness clause.)

**Decision.** Every look value reaches the GPU at commit: `uLook` per material
(`applyLook`, `applyPropLook`), the comic block's shared uniforms
(`applyComicGlobals`: the halftone, the key's frame, the dot size at this dpr),
the disc field's shadow switch and camera (`DiscField.setLook`), the ink's width
(`InkEffect.setDpr`), the stage's vertex colours. `liveness.test.ts`'s Lane LOOK
clause asserts: `look.ts` is pure (it imports `colour.ts` and `perf.ts` only);
`uLook` has exactly two writers and the shared uniforms one; `CueRunner.tsx`,
`DiscField.bind`, `DepartureField.bind`, `PropField.bind`, `DuelistField.bind`
and `BustField.bind` name none of it (eight junk lines spliced into each are
caught — six at first, the painted mark's two since D146); the callers are layout effects and commit-time methods; the hull is
gone; `holoMaterial.ts` is a re-export; `prime.ts` is called at mount only.

**Rationale.** A look the frame loop owned would be a renderer that remembers,
and a per-frame uniform write is the cost D58 and D72 keep the idle table free
of. The summon's animated hologram-to-ink is a real need (report 15 §5.3), so the
material gives MOTION a number of its own to write — `uMaterialize`, identity 1,
a decaying offset like `uOpacity` — rather than an exception to this rule.

## D146 — The ink marks what is PAINTED and rides bloom only: a figure writes alpha 0, no card edge is inked, and bloom off draws no composer

**2026-09-28** (Lane LOOK, branch `look`; *written as D129 in the lane's reserved range
D120–D129, and **D146** since the merge.*
The lane's verification pass, round 1. Amends **D139**.)

**Decision.** Four changes to the ink line, each answering a finding:

- **The painted mark.** A painted figure, painted prop kind and duelist writes
  **alpha 0** into the frame it is drawn into — `figureMaterial.ts`'s
  `markPainted`: `CustomBlending` with the colour factors of `NormalBlending`
  (`SRC_ALPHA`, `ONE_MINUS_SRC_ALPHA`) and the alpha factors `ZERO`, `ZERO` —
  set at commit by `applyLook` (any `uLook` > 0) and `applyPropLook` (a painted
  kind in the comic look). It is blend state, so it adds no define and no
  program. Everything else — the stage, the cards, the tiles, the backdrop, the
  effects — leaves the clear's alpha 1. `InkEffect` draws only where one of its
  five samples is marked, then writes alpha 1 back; it stays **first** in the
  composer's list (it reads the scene's own alpha) and is **not**
  `EffectAttribute.CONVOLUTION` (R3F's composer gives a convolution effect a pass
  of its own: measured 99 against 98 calls at `g1`@355). Both canvases are opaque
  (`alpha: false`), so a frame drawn without a composer never shows the mark.
  **No card's edge is inked**: measured on still (reduced-motion) screenshots of
  both production builds, ink pixels on the two hand cards 349 and 406 → 0, the
  Helicarrier's lifted card 354 → 0, your hovering Doombot and Wasp cards
  182 → 0, the workshop's Doombot pedestal card 1,508 → 0; every figure keeps its
  line inside and outside its silhouette. A hologram (`uLook` 0: the anonymous
  figure, the ghost) is not marked and takes no line.
- **Bloom only.** `wantsInkPass(look, bloom)`: the ink is drawn on bloom's
  composer, +0 draw calls, and with bloom off the arena mounts no composer and
  draws no line. `?ink=always` still draws it (a composer of its own) for
  measurement. The first round's bloom-off ink cost the GTX 1080 +2.4 ms p95 over
  the hologram in the verifier's quiet series (report 15 §9.1's line is +1.5) and
  SwiftShader +10 ms p50 at the 0.6 floor. With bloom off the comic look now
  measures 0.6 ms p95 against the hologram's 0.6 (three quiet rounds) and 19.0 ms
  p50 against 17.0 at the floor (`docs/evidence/look.md`).
- **One pixel inside.** The line's outer half — on the table or a card —
  samples `COMIC.inkCssPx` (1.6 CSS px) away; its inner half, on the figure's own
  paint and its creases, `COMIC.inkInnerCssPx` (1.0). The silhouette keeps its
  weight (a uniformly thinner line lost the ink at table distance, tried and
  photographed) while a small prop loses one pixel of paint at its edge, not two.
- **A light burns through the line.** Where an additive light has lifted the
  frame past paper white (the composer's buffer is half-float; paint is capped
  at 1), the ink steps back — a visor, a muzzle flash, an exhaust, a cue's flash
  — as a colourist paints a glow over the line art.

**What it measures.** `traits.test.ts`'s both-seats raster now counts only the
identity-prop pixels that still show their PAINT under the ink
(`prop-raster.ts`'s `comicVisibility`: the ink's rule over the raster's depth,
and the halftone's dots counted and printed). Of 93,399 visible identity pixels,
11,601 are under the ink and 4,868 on a halftone dot. Every prop keeps its bar
but one, recorded in the test's `SHORTFALL` table with its floor: **Coulson's
chest badge from the front, 46 px** (52 before any ink) — a size Lane BODIES
owns (`figures/props.ts`'s `badge.anchors.human[0].size`, PLAN.md). Under the
first round's ink (1.6 px on both sides, lights inked) eleven rows failed.

**Rejected.** A world-height band (the verifier's first suggestion): the hand
fan, the stack and every hovering flier's card stand well above the table, and
they are the cards that were inked. Planarity from depth alone: at table
distance a figure's own curvature over 1.6 px is below the threshold, so a
figure and a card look alike. A mask target or a second scene render (report 09
§9.2 rule 3). The ink without bloom by default (the measured cost above). A
1-px line on both sides (the silhouette vanished at table distance).

---

*Lane MOTION's nine decisions — the second of report 15's three art-direction
lanes (`docs/research/15-art-direction.md` §9) to land. Branch `motion` (worktree
`mtg-table-t2m`), cut from the art-direction report's `c81f674` on `main`'s
`a092d3a`, and rebased onto Lane LOOK's merged tip `4c76785` (`main`'s `f6bad35`,
report 15 and LOOK's four commits). Written as **D130–D138** in the lane's
reserved range D130–D139 while `main` took D113–D136 and Lane LOOK, landing
first, renumbered its own ten to D137–D146 — so every one of the lane's numbers
was taken — and renumbered contiguously at merge: these nine are **D147–D155**,
in the order they were written, on every line the lane's two commits wrote — this
file, CLAUDE.md, PLAN.md, README.md, `docs/evidence/motion.md`, `cues.json`'s
notes, and comments and test names under `web/src/arena/`, `web/src/workshop/`
and `web/test/` (a code comment's "on branch `motion`" went with its old number).
Each keeps its branch note with both numbers. D147 and D148 carry the merge's
dated amendments. Lane BODIES numbers its decisions after D155.*

## D147 — Comic VFX are three INK shapes on the fixed pool and one `streak` kind; ink is blended normally, per slot; the pool goes 45 → 49

**2026-09-28** (*the comic motion lane, branch `motion` — written as D130, the
first
of the lane's reserved range D130–D139, and **D147** since the art-direction lanes
were renumbered contiguously at merge.* Within **D50**,
**D56**, **D60** and **D79**; the brief is
[`docs/research/15-art-direction.md`](docs/research/15-art-direction.md) §5 and
§9.2.)

**Decision.** A comic's motion vocabulary is graphic shape, not soft light, so
the effect kit gains:

- **three shapes** on the slots that already exist — `burst` (a jagged
  twelve-point impact star with an ink outline and a halftone band, optionally
  lettered, **D150**), `splat` (an ink splash with droplets, flat on the table:
  the dying card's colour as its body, ink as its outline) and `dots` (a Ben-Day
  dot burst). A `ring` takes `splat` and `dots`, a `plate` takes `dots`, a `glow`
  takes `burst`. They cost no slot and no draw call a glow would not;
- **one kind**, `streak` — speed lines: a quad that trails from the body back
  along the motion's own vector (`from → to`, the vector the cue's offset
  travels), turned about its length to face the camera, its lines scrolled by
  the cue's own `t` on the slot's own clone of one canvas. **Four** slots, counted
  against `MAX_LIVE_EFFECTS`, so the pool is **49** and the eight-slot cap did not
  move;
- **ink is painted, light is added**: a slot drawing an ink shape is switched to
  `NormalBlending` at bind and back to additive for the next soft glow. Blending
  is render state in three 0.186, not part of the program key, so no program is
  added (measured: 15 programs in a classic and a comic frame alike).

Where each fires by default, under comic FX (**D152**): a star on every struck
body (lettered POW on lethal damage), on a block's contact and on a strike's
target; a splat under every creature that dies from the battlefield (a discard
or a spell resolving into the graveyard is not a death); a halftone plate behind
a struck player's life; speed lines on every dash (the lunges, the jet, the
aegis, the shrink, Fury's charge, a block, the Helicarrier's descent).

**Why.** Report 15 §1.3's cause 9: every effect the arena had was an additive
radial gradient. The shapes are canvases drawn once per page like T11's; the
kind is the one thing a shape on a billboard could not draw (lines ALONG a
motion). The pool was grown by exactly the brief's budget.

**Two renderer fixes the shapes exposed.** A star is drawn in front of the body
it names (pulled toward the lens by half its size — the figure cut its lettering
in the first cut), and a ring at a *departing* flier's `figure` anchor is now on
the ground under it (`#groundOf`, `#fitOf` read the departing body): the first
splat under `g1`@359's Giant-Sized Flying Ant hung inside its falling body.

**Rejected.** Sprite sheets from a CC0 pack (the canvases are enough, and a pack
is a download and a provenance row); a second pool for the ink shapes; more
`streak` slots than the brief budgeted (a fifth attacker's lines degrade, as the
pool always has); additive speed lines (they wash out on a light stage).

*Amended at the merge with LOOK (2026-09-28):* **speed lines stream BESIDE the
body, never across its card.** A card moves with its figure's lunge — it is the
same offset — so the one place straight behind a dashing body is always its own
card, and the lines drawn there read as scratches on the art (the lane's skeptic).
The canvas now draws the lines in two bands down the quad's long edges
(`STREAK_CLEAR`, 0.7 of its width, is left empty between them); the quad's front
is `STREAK_LEAD` (0.35 of the body's height) ahead of the chest, so the lines
start level with the body and run past its flanks; and the pool sizes and places
the lane between the bands (`EffectPool.#streakClear`, `#widen`) so that the
body's axis, feet to head with its half-width either side, and the card's four
live corners, each carried along its own view ray onto the quad's plane (where the
lines are drawn), lie inside it with `STREAK_GAP` (0.06) to spare. The lane is the
narrowest that does, so on a diagonal dash one band runs beside the body and the
other beyond the card. `EffectPool.setFigures` takes the frame's layout for it
(`CueRunner` passes `stage.layout`), the card is found by an indexed walk
(`#cardOf` — `placementOf`'s key string would allocate), and the three bodies are
in the lane's allocation scan. `motion.test.ts` drives the real `attack.lunge`
into the real pool over every figure of `g1`@355 and @359 from all five views at
three instants of the dash (345 dashes): no band overlaps the card's projected
rectangle or covers the body's axis, and the lane's first geometry crossed the
card in 272 of them. The pool, the cap, the words and the switch are unchanged.
*Rejected:* stopping the lines short of the card (the card moves with the lunge,
so seen from the front they vanished); a width measured along `across` in world
units (a shoulder view's perspective put a near corner in a band: 38 of 690
bands); a lane centred on the body (a diagonal dash's card is off to one side, so
both bands stood a card-length away); two quads a streak (it halves the four
slots).

## D148 — The hologram-to-ink summon is `Offset.materialize`; the frame loop writes it into LOOK's `uMaterialize` as a number (on the spike's material, `uLook × materialize`)

**2026-09-28** (*the comic motion lane, branch `motion` — written as D131 in the
lane's reserved range D130–D139, and **D148** since the lanes were renumbered at
merge.*
Report 15 §2.3 and §5.3; within **D50** and **D97**'s "a number the frame loop
writes".)

**Decision.** `Offset` gains `materialize` (identity **1**, composed by product
like `scale`). The cue builder ramps it `0 → 1` on every cue an ARRIVAL resolves
to — read off the zone event's own `toZone: battlefield` with a `fromZone` that is
not the battlefield — so `zone.enters`, the Helicarrier's fly-in, Fury's agents,
a scientist's bench and a land's rise all summon; `inkFrom` (0…1) is where the ramp
starts. `CueRunner.applyFigures` hands it to the figure's material through
`applyMaterialize`:

- **the handle is `uMaterialize`**, the uniform Lane LOOK's figure material binds
  for exactly this (branch `look`, `7d91dcd`: `figureMaterial.ts` declares
  `uMaterialize: { value: 1 }`, shades by `uLook * uMaterialize`, and its liveness
  clause keeps `uLook` out of `CueRunner.tsx`). When the material carries it, the
  loop writes the offset's number there and nothing else, and only when it changes;
- **on this branch's base** — the spike's `holoMaterial.ts` (`c81f674`), which has
  no such uniform — a fallback shows the summon anyway: the loop **holds** the
  value the commit wrote (`FigureRig.lookHeld`), writes `uLook = held ×
  materialize` while the ramp runs and puts the held value back on the frame it is
  over; a commit that lands mid-summon (the workshop's holo · comic switch) is seen
  because the uniform no longer holds the loop's last write (the product is floored
  at 0.001, so it never equals a look a commit writes). A rig no summon touches is
  never written. **The fallback is deleted at the merge with LOOK** (PLAN, the
  lane's follow-up 2): it is dead code once every figure material has the handle,
  and it is the only `uLook` in `CueRunner.tsx`.

`zone.dissolve` from the battlefield ramps it back `1 → 0` (report 15's reverse
summon) — but the departing BODY is `FigureLayer`'s `DepartureField`, which is
LOOK's, so the cue half is written and the render half is a follow-up (PLAN).

**Why.** The brief names the offset and the uniform, and LOOK bound the uniform in
parallel. Under the hologram (`uLook` 0) the product is 0 whatever the ramp says,
so the summon is invisible there by construction, which is the brief's intent;
because it is an offset, `replay-cues.test.ts`'s "the offset map is empty after
every batch" covers it with no line of its own. Under reduced motion no ramp is
written — the figure simply is what its pose says (report 15 §9.2's "snaps to 1").
The fallback exists so the summon can be judged in this branch's workshop
(`?look=comic`) before the lanes merge.

**Rejected.** Adding `uMaterialize` to the spike's `holoMaterial.ts` here: that file
is LOOK's (report 15 §9.4), and LOOK has already added it to the material that
replaces it. Writing only `uMaterialize` with no fallback: correct after the merge,
but the summon would be invisible on this branch, and the workshop is the judging
tool. Writing `uLook` from a layout effect: a summon is a transition, and a
transition is the frame loop's.

*Amended at the merge with LOOK (2026-09-28):* **the fallback is gone, and the
reverse summon is drawn.** LOOK's figure material binds `uMaterialize` on every
figure, so `applyMaterialize` writes that handle and nothing else
(`FigureRig.lookHeld` / `lookWritten` and `MATERIALIZE_FLOOR` are deleted, and
`CueRunner.tsx` names no `uLook`, which LOOK's liveness clause requires).
`DepartureField.bind` — the falling body's frame loop, in LOOK's
`FigureLayer.tsx` — writes the dying card's `Offset.materialize` into the body's
`uMaterialize` the same way, so `zone.dissolve`'s 1 → 0 drains the ink back to
hologram over the first half of the fall before `uDrain` greys it (the lane's
follow-up 1, LOOK's follow-up 2). Both writes are numbers in the frame loop, like
`uOpacity` and `uDrain` — **D145**'s one look number — and the liveness clause
holds the two writers and nothing else naming `uMaterialize`. **What a summon
shows now:** every arrival is summoning-sick, which LOOK draws half hologram
(**D142**), and the product is the shader's (`uLook × uMaterialize`), so an
arrival resolves from hologram to HALF ink over its cue, and the snapshot that says
it is no longer sick paints it whole — as LOOK's follow-up 5 expected. A full
hologram-to-ink swing for a sick arrival would need the ramp to overshoot identity
(up to 2, the shader clamping the product at 1) and then settle; that is the
user's call (PLAN, the lane's follow-up 13), not a merge's.

## D149 — On twos is a quantisation of each cue's own progress: twelve drawings a second of screen time, at least four per cue, off under reduced motion, a switch

**2026-09-28** (*the comic motion lane, branch `motion` — written as D132 in the
lane's reserved range D130–D139, and **D149** since the lanes were renumbered at
merge.*
Report 15 §3.7; within **D57** and **D72**.)

**Decision.** `cues/motion.ts`'s `onTwos(t, ms, stepMs)` floors a cue's linear
progress to the start of its drawing, `t = 1` exactly at the end, with
`steps = max(4, round(ms / stepMs))`. The queue hands every cue its progress
through it (`#drive`), with `stepMs = 1000/12 × speed`, so a 4× replay is still
twelve drawings a second of screen time; whether a cue has ENDED is still read off
the real progress, so stepping can never hold a cue past its length. It is **on
by default**, off whatever the setting says under `prefers-reduced-motion`, and a
switch: `?twos=0|1`, the arena's cue strip and the workshop's queue bar
(`CueQueue.setOnTwos`, `twosActive`).

**Why.** The brief puts it in `driveClips` as a quantised `action.time`; stepping
the cue's progress instead steps everything the cue drives — the offset, the
clip, the effects, the lines' scroll — in one place, and it is still a pure
function of `t` that pauses, scrubs, skips and compresses with the cue (no clock,
D72). The four-drawing floor is measured: a 180 ms tap under the 250 ms live
budget is 60 ms long and at 83 ms a drawing it would show only its first frame.

**Rejected.** Quantising only the clip lane (offsets would glide while bodies
step); a 12 fps timer (a second clock); stepping the camera or the idle breathing
(Spider-Verse keeps its camera on ones, and neither is a cue).

## D150 — The onomatopoeia is a CLOSED list of five words, lettered ON the burst — one effect, never a `text`

**2026-09-28** (*the comic motion lane, branch `motion` — written as D133 in the
lane's reserved range D130–D139, and **D150** since the lanes were renumbered at
merge.*
Report 15 §5.1.)

**Decision.** `COMIC_WORDS` is `POW`, `BLAM`, `KRAK`, `ZZAK`, `WHOOSH`, in
`cues/stage.ts`, and nothing else. A cue file names one through the `burst`
param (`none | star | pow | blam | krak | zzak | whoosh`); the word reaches the
renderer as `Effect.word` on a `glow` with `shape: 'burst'`, and `effects.ts`
letters it across the star (one canvas per word, drawn the first time a game uses
it). `replay-cues.test.ts`'s net asserts every lettered burst in the corpus carries
a list word and every `text` effect is a number or one of the fixed texts the
arena has always drawn (negative-controlled).

**Why.** The brief puts the word in a second `text` effect. One lettered star is
ONE of the eight blended slots instead of two, so when a crowded combat meets the
cap the damage NUMBER — the fact — is not the one refused, and the lettering reads
as comic lettering (heavy, leaning, ink-outlined) rather than the numbers' font.

**Rejected.** Free text (a word composed from anything is a name by another
route); words as `EffectShape`s (five more names in a closed list that is about
shapes).

## D151 — Impact shakes are shake-only requests at priority 0, one per cue; under comic FX a lethal blow jolts instead of pushing in

**2026-09-28** (*the comic motion lane, branch `motion` — written as D134 in the
lane's reserved range D130–D139, and **D151** since the lanes were renumbered at
merge.*
Report 09 §8 rule 7, **D69**–**D71**.)

**Decision.** A strike landing, a Helicarrier Strike's beam, a creature dying from
the battlefield and (under comic FX) lethal damage ask `camera.ts` for the shake
it already has: a request with nothing to frame, `shake ≤ 1` of `SHAKE`'s bound, at
**priority 0**, carrying the cue's key. So it never preempts a move (a swoop, a
view change, a director's cut), and the director drops it under reduced motion,
while the engine waits on the human and for five seconds after the user's own
drag — all rules it already had. `CameraRequest.key` is new, and read only for a
shake-only request: **one shake per cue** however long its impact window stays on
screen at a slow replay speed. `damage.lethal`'s old push-in framed the CARD, which
by the snapshot that says so is in the graveyard — the camera swung to the pile
while the star landed on the falling body (`g1`@359, measured) — so under comic FX
it is replaced by the jolt; classic keeps it (**D152**).

**Why.** "Using the shake that already exists", within the director's rules: the
only line `camera.ts` gained is the per-key dedupe. `camera.test.ts` runs the
auto director over the corpus with the shakes in play and holds its shot rules.

**Rejected.** A shake channel that rides any live move (a second camera state);
shaking on every hit (noise; a hit has its star).

## D152 — Comic FX is a switch stamped into each cue at enqueue; off is the film before the lane, op for op; on by default

**2026-09-28** (*the comic motion lane, branch `motion` — written as D135 in the
lane's reserved range D130–D139, and **D152** since the lanes were renumbered at
merge.*)

**Decision.** `CueContext.comic` is stamped at enqueue from the queue's setting
(`?fx=classic|comic`, the cue strip's *comic FX*, the workshop's queue bar), as
`reducedMotion` is, and every beat of the lane — bursts, lettering, splats, dots,
speed lines, the summon, the impact shakes, the lethal jolt — is behind it. A cue's
comic-only effect keys are declared apart (`CueDef.comic`), and `end()` releases
them only for a comic cue, so with comic FX off a cue's op log is exactly the one
it had before the lane: **measured over all 19 committed recordings, 310,369
`NullStage` ops, sha256 `3710d0b4…`, identical to `c81f674`'s engine** (a one-off
check against a `git archive` of the base; `motion.test.ts` holds the corpus to
"no comic op with comic FX off"). It is **on by default** — the lane's deliverable
— and reads over the hologram's dark felt as well as over report 15's comic stage.

**Why.** The workshop is the judging tool, and a judgement needs an honest A/B:
the before is not a memory of the old build but the same build with one switch.

**Rejected.** Tying comic FX to LOOK's `?look=comic` (the two are judged
separately, and the vocabulary reads over either look); a build-time flag.

## D153 — The per-card upgrades key off an event about THAT card; an attacker's word is its own flourish, never a hit on its defender

**2026-09-28** (*the comic motion lane, branch `motion` — written as D136 in the
lane's reserved range D130–D139, and **D153** since the lanes were renumbered at
merge.*
`cues.json`'s one rule; **D82**, **D89**.)

**Decision.** `cues.json` gives the deck's headline cards the new vocabulary, each
row's `_motion` note naming the event: Fury, Peggy and a lone Agents attacker a POW
in front of their own body at the top of the dash (with speed lines, the squad's
the densest); Agent 13's two shots lettered BLAM on her muzzle; Quake's resolution
KRAK where the fissure lands (the previous frame's stack aim, **D89**); Wasp's
sting ZZAK where her beam lands and her flight on lines; Ant-Man's thin lines and
a POW when a hit pops him back to size; Coulson's badge rings as dot bursts on the
card that got the counter; the Air Force's WHOOSH where its sweep arrives; the
Helicarrier's descent on lines under a WHOOSH; the Doombot's ZZAK where its laser
lands (the band's defender); Helicarrier Strike's BLAM and jolt as its beam lands.
Seven params are new in `PARAM_SPECS`, each ranged: `burst`, `burstColour`,
`streaks`, `streakColour`, `splat`, `dots`, `inkFrom`.

**Why.** The brief suggests the attack's burst "plays on the defender's figure
because the band names the defender". A star on the defender at the declaration
reads as a hit, and damage is its own later event with its own star — so the
attack's word is in front of the ATTACKER, a statement that it attacks. Where a
beat lands on a second card (a strike, a sting, a laser), it lands on the one the
wire named: the stack's target, the band's defender, the block's attacker.

**Rejected.** A word on every attack by default (the per-card rows carry the
identity; the default dash has lines only); words keyed to a tap or a counter's
source (not on the wire).

## D154 — A star never hides the body it is on: an attacker's flourish goes beside its head, a hit lands on its body's edge

**2026-09-28** (*the comic motion lane, branch `motion` — written as D137 in the
lane's reserved range D130–D139, and **D154** since the lanes were renumbered at
merge —
its verification pass, round 1. Amends **D147** and **D153**'s placement; the words,
the events and the switch are unchanged.*)

**Decision.** An impact star on a `figure` anchor is drawn BESIDE the body, never
over it. `Effect.aside` names a rest point (the card's own slot); the effect pool
pushes the billboard in SCREEN space along the camera's right by half the star's
width plus `clear` of the figure's height, toward the screen's centre as seen from
that rest point (a tie goes right), lifts it by `lift` of its own size, and then
pulls it toward the lens along its own view ray, shrunk by the same ratio — the
same footprint on the screen, but in front of the body (at the body's own depth a
wide body, the ant from the side, hid the star's inner half). An attacker's own flourish (`besideAttacker`: at 0.72
of its height, 0.52 of it wide, `clear` 0.2, `lift` 0.12) sits clear of the head,
the hat and the shield; a hit (`besideStruck`: `clear` 0.06) overlaps the struck
side and leaves the face in view — damage, lethal damage (0.82 → 0.72 wide), a
block's contact, a strike's, a sting's, Quake's fissure, the Air Force's
arrival. Quake's own stomp, unaimed, is beside her at her knees. The Helicarrier's
WHOOSH above its own silhouette and the Doombot's word on a PLAYER are not on a
figure and are unchanged.

**Why.** The verification pass photographed the headline beat of the headline
cards hiding the identity slices 3 and 4 built: at 250 and 420 ms of the attack,
Peggy's hat and shield were under her POW, and Fury was a black coat with a star
for a head; Coulson's lethal POW replaced his body outright in the close-up. A
comic letters its impacts beside the figures, not over their faces. The side is
fixed by the REST slot so a body whose dash crosses the screen's centre does not
flip its star mid-beat, and toward the centre so a body at an edge keeps its star
on screen. `motion.test.ts` drives the real cues into the real pool over every
figure of `g1`@355 and @359 from all five views (345 stars) and projects head and
quad: no attacker's star touches a head disc 9% of the body tall, no struck star
covers the head's centre, none leaves the screen — and the same stars centred
cover 345 of 345 heads (the control).

**Rejected.** Shrinking the star below the head (a POW the size of a head does not
read at table distance, and still covers it); placing it along the dash in WORLD
space (ahead of your own attacker is BEHIND it from your seat, and in front of the
opponent's is in front of its face); the plain lens pull (it makes the star bigger
on the screen, back over the head); a per-view side (the camera moves; the rest
slot does not).

## D155 — The ink splat is an INK body with a paper rim and a gloss, not a pale body with an ink rim

**2026-09-28** (*the comic motion lane, branch `motion` — written as D138 in the
lane's reserved range D130–D139, and **D155** since the lanes were renumbered at
merge —
its verification pass, round 1. Amends **D147**'s splat drawing.*)

**Decision.** `drawShape('splat')` paints the lobed blob, its arms and its drops
twice: first white, outset by a constant 9 canvas pixels (the RIM — constant, so a
thin arm and a small drop keep one), then in ink on top (the BODY), then a white
gloss crescent and a glint on the bigger drops. The material tints the white parts
only: `PAPER` (`#f3efe2`) by default, a card row's `colour` otherwise. The body is
ink whatever the tint.

**Why.** The first cut (an ink body with a thin tinted rim) vanished on the
hologram's felt; the second (a white body tinted grey, an ink rim) was read by the
verification pass as MILK — "a cream splash under the body", "a pale smudge" at
table distance. Ink on a dark stage reads by its edge and its shine; on LOOK's
lighter stage the body carries it.

**Rejected.** A coloured body (a red splash reads as blood; a colour-identity
splash reads as paint, not ink); an additive halo (ink is painted, **D147**).

---

*Lane BODIES' ten decisions — the third of report 15's three art-direction lanes
(`docs/research/15-art-direction.md` §9) to land. Branch `bodies` (worktree
`mtg-table-t2n`), cut from the art-direction report's `c81f674` on `main`'s
`a092d3a`, and rebased onto Lane MOTION's merged tip `e2aee03` (`main`'s
`f6bad35`, report 15, Lane LOOK's four commits and Lane MOTION's three). Written as
**D140–D149** in the lane's reserved range D140–D149 while `main` took D113–D136
and Lanes LOOK and MOTION, landing first, renumbered theirs to D137–D146 and
D147–D155 — so every one of the lane's numbers was taken, seven of them by the
other two lanes — and renumbered contiguously at merge: these ten are
**D156–D165**, in the order they were written, on every line the lane's three
commits wrote (and on no other: the renumbering read each line's commit, because
D140–D146 are Lane LOOK's and D147–D149 Lane MOTION's on every line those lanes
wrote) — this file, CLAUDE.md, PLAN.md, README.md, `docs/evidence/bodies.md`,
`traits.json`'s notes, `tools/assets-manifest.json` and `tools/build-figures.mjs`,
`web/src/styles.css`, and comments and test names under `web/src/arena/`,
`web/src/workshop/` and `web/test/`. Each keeps its branch note with both numbers.
D156, D157, D158, D160, D164 and D165 carry the merge's dated amendments; the
merge pass, which may edit the earlier lanes' files (report 15 §9.4's boundaries
no longer apply inside it), made the edits the lane had written out for Lane
LOOK's files.*

## D156 — A card RESTS in a signature pose: a closed table of poses made from the library's own clips, derived at load into a model variant, drawn as a pose

**2026-09-28** (lane BODIES of report 15, §6.2 and §9.3; *branch `bodies` —
written as D140, the first of the lane's reserved range D140–D149, and **D156**
since the art-direction lanes were renumbered contiguously at merge*.
`docs/evidence/bodies.md` is what was measured.)

**Decision.** A `traits.json` row may name `rest`, one of
`figures/rests.ts`'s closed table: `stand` (the body's own idle), `folded`,
`ready`, `aim`, `akimbo`, `clasped`, `braced`, `working`, `atEase`. Each entry is
**a frame of a library clip** (`from` at `phase`) on the joints it holds
(`hold`: none, the arms, the upper body, or all), **a handful of joint aims**
written as directions in figure space (+Z the front, +X the figure's left), and
**a clip the other joints keep breathing with**. `scene/models.ts`'s
`deriveRestClip` samples it once at load — no mixer is ticked — and the result
is the `idle` of a model **variant**, `<body>@<pose>` (`agent@folded`), which is
what `figurePose` names in `modelId`. The deck's people rest as the brief asked:
Fury `folded`, Peggy `ready`, Coulson `clasped`, Quake `braced`, Agent 13 `aim`,
the scientists `working`, heroes `akimbo`, spies and soldiers `atEase`.

**Rationale.**

- **It is the cheapest dynamism the art has** (report 15 §1.3, cause 8): every
  person stood in the stock `Idle_Loop`, and the card art never does. A pose
  chosen from the library's clips is data, open to every card like a prop kind.
- **It is a pose** (**D56**). The snapshot says "untapped, out of combat"; the
  row says which pose. A skip, a backwards scrub, a `resync` and a new `gameId`
  draw it with no history, and tapping still kneels (`REST_CLIP_FOR`).
- **A variant, not an alias of `idle`.** `FigureLayer` plays a body's `idle` at
  full weight the moment it mounts, and the clip lane only stops the rest action
  it started itself. An alias would have left the stock idle blended 50/50 under
  the pose for the figure's whole life. The same latent defect exists for a
  figure that mounts kneeling (PLAN.md, lane BODIES follow-up 1, a one-line fix
  in a file this lane does not own).
- **The breathing stays the clip lane's** (**D57**, **D58**): the non-held joints
  loop with `restTime`, which advances only while the queue is awake.

**Rejected.**

- A pose estimated from the card art — a derivative (report 15 §11, **D54**).
- A per-card `rest.clip` + `rest.phase` in `traits.json`, as the brief sketched:
  the library has no folded-arms or hands-clasped clip, so the aims are what
  make most of the table, and aims are rig knowledge that belongs in one file.
- A new cue id or a ticked clock for a rest: neither is a pose.

**Known cost.** Nine variants per proportioned body are derived at load (a few
milliseconds each, once). The Kenney chibis, the drone and the bee have no
resting poses, and an anonymous figure never has one (hard rule 8, asserted over
1,179 corpus instances).

*Amended at the lanes' merge (2026-09-28): the latent defect above is closed.* A
figure that MOUNTS in a held stance — tapped, attacking or blocking, as Fury's own
card puts itself onto the battlefield "tapped and attacking" — kept its signature
rest blended 50/50 into the stance for as long as it lived, because the rig
registered `rest: null` and the clip lane stops only the `rest` it knows. On the
hardening pass's two-action clip model (each clip's `restTwin`,
`FigureRig.restActions`) the fix is to register what the mount really started:
`FigureLayer`'s `mountRestLane` plays the rest lane's idle and returns it, and
`newFigureRig` hands it to the clip lane as `rest`, so the first pass stops it
and the stance plays alone — weights 0 and 1. `clip-lane.test.tsx`'s third case
mounts a figure tapped, attacking and blocking through those two functions and
asserts the weights and the bone, and its negative control re-registers the first
cut's `rest: null` and sees the half-and-half; a figure that mounts at rest keeps
the idle it mounted with, adopted and not replayed.

## D157 — Hair is a SHARED kind rigid on the head: the bodies are carved bald at load, the pack's two hairstyles become kinds, and four procedural shells stand in until the pack can be downloaded again

**2026-09-28** (lane BODIES; *branch `bodies` — written as D141 in the reserved
range D140–D149, **D157** since the lanes' merge*)

**Decision.** A `traits.json` row may name `hair`: `parted`, `long`, `crop`,
`bob`, `waves`, `bun` or `none`; with no row the body keeps the style it came
with (the man's `parted`, the woman's `long`, `BODY_HAIR`). Each style is a
**derived prop kind** (`hairParted` … `hairBun`) drawn by the prop field at
**one draw call per style on the table**, anchored to `Head` with no offset, in
the costume's `hair` colour (the kit's new `hair` colour role).

- `parted` and `long` are **the pack's own meshes**. `figures.glb` already
  carries them, joined into the two bodies in the costume's `hair` slot, and
  every vertex of each is weighted 100% to `Head` (**D95**). `scene/models.ts`'s
  `carveHair` splits those triangles off at load; the figure draws the **bald**
  body (the same attribute buffers, a smaller index) and `PropField` bakes the
  carved triangles into the kind.
- `crop`, `bob`, `waves` and `bun` are **procedural shells** round the measured
  head (`HEAD_SHAPE`), cut above a hairline, 288–483 triangles each.
- The duelists, the squad's followers and the rider are baked from the base body
  with its own hair.

**Rationale.** A hairstyle is rigid on the head bone in the pack itself, so it is
a prop by the kit's own definition (**D75**, **D98**), and a shared kind keeps
report 13 §12's seam: no mesh is used by exactly one card.

**What was not done, and why.** The brief's plan was to export the pack's other
hairstyles as static nodes in `figures.glb`. The Universal Base Characters zip
is not on this worktree, and downloading it again is a file download that needs
the **user's approval in chat** (report 15 §6.1, **D95**'s follow-up); an
approval relayed by a workflow script is not one. So this lane shipped the two
carved styles and four procedural ones, and PLAN.md's lane BODIES follow-up 2 is
the exact route once the user approves: verify the zip's bytes and sha256
against the manifest, read the badge on the day, list the hairstyles, and let
`tools/build-figures.mjs` write them as `hair:*` nodes that replace the shells.

**Rejected.** A body variant per hairstyle (a model used by exactly one card);
hair as a costume slot only (the pack's two meshes are the only shapes a slot
could colour).

*Amended at the lanes' merge (2026-09-28): a bald head has anchors of its own.* A
thing worn round the skull sits on whatever is outermost there, and the
eyepatch's strap was sized to clear a hairstyle, so on Fury — bald, as his card
draws him — its tilted ring stood a hair's thickness off his crown (the verifier's
third reading of the pictures). A kit anchor may now say `bald: true` or `false`
(`figures/props.ts`'s `PropAnchor.bald`), `anchorsOf(kind, family, bald)` picks the
set, and the prop field asks with the pose's own hair (`hair` null is bald); every
other anchor carries no condition. The eyepatch's bald anchor is the skull's
measured half-extents about its own centre (`HEAD_SHAPE`), and its strap is no
longer a cylinder: each vertex is pushed along its own ray onto the unit head,
1.035 of it (`onHeadSphere`), so the band lies ON the head's ellipsoid whichever
head it is on, and a patch and a band 0.3 of the unit head wide (from 0.36 and
0.26) keep the identity raster's one-sided detail over its half-bar from the
seat that sees its front (27 px either side after the ink).

## D158 — A procedural comic FACE, one kit kind on every face-up person, sized for the table view; `patched` leaves the eye under an eyepatch out

**2026-09-28** (lane BODIES; *branch `bodies` — written as D142 in the reserved
range D140–D149, **D158** since the lanes' merge*)

**Decision.** Every proportioned figure that is not anonymous wears the derived
kind `face`: two white eyes with ink pupils, two brows set low at the inner end,
and a mouth line, laid on the head's measured front (`HEAD_SHAPE`), at comic
scale (`FACE_SCALE` 1.15) and tipped 0.3 rad up toward a lens that looks down at
every figure. It is 88 triangles, carries its colours in its vertices (no
texture, **D67**), and is rigid on `Head`. A row may say `face: none` (A.I.M.'s
bucket hood) or `face: patched` — `facePatched`, the same face without HIS left
eye, which is Fury's: the eyepatch floats in front of the face, and from the
table view's height the eye under it showed above it.

**Rationale.** Report 15 §1.3, cause 5: the head was a skin ball under a hair
dome. The pack's eye and eyebrow meshes are dropped by the build and are not in
the committed library, and at 12 px a head's eyes are two pixels anyway. The
face is **not an identity** — it names no card — so `traits.test.ts` holds it to
its own bar from the views it is for: ≥ 4 px at the table view and ≥ 8 over the
shoulder, from the seat whose figures face the lens (measured 5–7 and 9–16), and
at most 2 px through the back of a head.

**Rejected.** A textured face (**D67**); per-card faces (likeness, **D54**); the
expressions report 15 §6.2 sketched (neutral, grit, pain) — a pose-driven grit
face is a second kind and a `hit` flip is a cue, both PLAN.md follow-ups.

*Amended at the lanes' merge (2026-09-28): the bars restated for **D143**.* The
bars above were measured when the seat that faced the lens was the NEAR one. Lane
LOOK turned each seat's figures toward the opponent, so every face the arena shows
is on the FAR seat — 2–10 px at the table view and over the shoulder alike — and
no arena view sees one close. The test now holds a face to what it is for: ≥ 4 px
at play distance (the table view and over the shoulder) on the seat whose figures
face that lens, a patched face read with its patch (the patch is the eye it
covers); ≥ 32 px in the workshop's `1× front` (Lane LOOK's default framing — view
1's distance and elevation from the side the figure faces — where expressions are
judged; 42–118 px measured); and still ≤ 2 px through the back of a head.

## D159 — The drape rule: a coat or a cloak is a CHAIN of rigid panels on the rig's spine and leg joints — no simulation, no clock

**2026-09-28** (lane BODIES; *branch `bodies` — written as D143 in the reserved
range D140–D149, **D159** since the lanes' merge*)

**Decision.** Cloth is built from one procedural panel — an 80° arc of a flared
cone, 24 triangles (`COAT_PANEL`) — placed by kit anchors on the joints under
it, so the clip lane's pose of those joints is the drape:

- `coat` is the **yoke**: shoulders to the chest on `spine_03`, with the collar
  and the lapels.
- `coatTails` is the coat's **body and skirt**: five panels on `spine_01` from
  the chest to the hip, then a two-link chain down each leg (`thigh_*` to the
  knee, `calf_*` to the calf, front and side) and one panel on the pelvis at the
  back — fourteen panels, open at the front.
- `cape` is a cloak down the back: two panels from the shoulders on `spine_03`
  and three from the hip on the legs and pelvis. Doom's cloak on the villain
  duelist.

Fury, the Bold Biochemist and the director duelist wear `coat` + `coatTails`.

**Rationale.** Report 15 §6.2 found no rigged CC0 coat, cape or trench coat. A
rigid shell from the shoulders to the knee was a white box to the floor under a
kneeling Biochemist (**D97**'s known cost), and — measured on this lane's first
cut — a rigid shell from the shoulders to the hip still swung out behind the
back like a barrel when the `working` pose bent the chest. A chain of panels on
the joints bends where the body bends, costs a draw call per kind rather than
per figure, and is a pure function of the pose.

**Rejected.** Cloth simulation or a spring chain (a clock, and state a skip
cannot reproduce); an angle driven by `d(offset)/dt` (a derivative of a cue is
history, and nothing here needs it once the legs carry the skirt); a skinned
coat mesh (no CC0 source, and a build step for one kit kind).

**Known cost.** Close up, the panels read as layered plates with small ledges
where one link overlaps the next; at the table view they read as a long coat.
The idle's wide stance swings the front calf links out diagonally. *(Fix pass:
the calf-riding chain is superseded by **D162** — the skirt hangs from the
pelvis, following the thigh part-way; the sliver, ribbons and flap it drew are
the reason.)*

## D160 — An art-derived palette is the LOWEST rung of the identity ladder: read from the card's own image at runtime, face up only, never committed

**2026-09-28** (lane BODIES, report 15 §7; *branch `bodies` — written as D144 in
the reserved range D140–D149, **D160** since the lanes' merge*)

**Decision.** `arena/art.ts` reads the Scryfall `normal` image `art.json`
already names, for every card the arena draws **face up** (the one entry point,
`paletteNamesOf`, skips every back and every redacted stub), draws it once into
a canvas at ¼ scale in an idle callback, and hands the art window's pixels to
`figures/palette.ts`, a pure, deterministic k-means (k = 6, seeded along the
luminance order, 12 iterations). The result is cached per card name for the life
of the page and reaches the poses as a map (`figurePose`'s and `tilePose`'s
`palettes`), recomputed at commit when a palette arrives. It supplies:

- the **accent** as a rung under every hand-written rung (`default ⊕ art ⊕
  subtypes ⊕ card`);
- the **tint** of a creature with no hand-written tint anywhere, when the art has
  a vivid cluster;
- a land tile's colour (the largest cluster that is neither near-black nor
  near-white) where no tile row gives one;
- an aura's colour where no attachment row gives one.

A row may say `palette: off`. The workshop's tuning panel shows the swatches.

**Rationale.** A card with no hand-written row — a new set's — still gets
colours of its own the day its art is fetched. Report 15 §7.1's finding shapes
it: a painting's dominant colour is its background, so the palette never paints
a costume. Measured in the page (GTX 1080 machine, Chromium): 0.2–15 ms to read
and 3–22 ms to cluster a card at ¼ scale, against 48–229 ms at full size.

**Hard rule 8.** A concealed card's art is never looked up, fetched or read, and
an anonymous figure never carries an art colour (`palette.test.ts` over 3,679
board frames: 15,019 placements drawn as a back, none looked up). *(Fix pass: the
corpus never gives a back a real name, so that count proved the wire's shape and
not the gates — the verifier removed each gate and the test stayed green. The
test now also runs a HOSTILE corpus — every back and every stub given a real
name, every third face-up creature, attachment, land and spell turned into a
named back — and fails with any one of `paletteFor`'s, `tilePose`'s or
`paletteNamesOf`'s gates removed; liveness scans the first two as it scanned the
third.)*

**Not switched on yet** *(fix pass; the second fix pass switched it on in **D164**, the third fix pass withdrew that switch, and the lanes' merge switched it on for good — see the amendment below)*. The first cut passed the palettes in from
`Arena.tsx` and `workshop/Pedestal.tsx`, which report 15 §9.1 gives to lane LOOK;
those hunks were reverted, and the edit is PLAN.md's lane BODIES follow-up 13,
written out for LOOK (or the merge) to apply. Until then every pose function
accepts `palettes` and no page passes it: the workshop's tuning panel shows the
swatches, and nothing is drawn from them.

*(Third fix pass, 2026-09-28: "the palette never paints a costume" was held by
the data, not the code — the verifier's third round found `costumeOf` filled the
suit from a tint the art rung could supply, and only every human archetype's
hand-written tint kept it off. `figurePose` now dresses the body in the tint
WITHOUT the art rung (a hand-written tint, else the colour identity), and a
`traits.test.ts` case holds it with a row-less person whose painting is vivid
red: the pose's tint is the painting's, and no slot of the costume is. It fails
with the old call restored.)*

**Rejected.** Committing palettes (derived from Marvel art: runtime only, report
12 §9); a Worker (four cards a second in an idle callback is invisible); letting
the art paint a costume.

*Amended at the lanes' merge (2026-09-28): the rung is drawn.* `Arena.tsx` and
`workshop/Pedestal.tsx` pass the palettes in (**D164**'s amendment), so every
face-up card's painting reaches the pose functions, off the hot path, once per
card name for the page. The hostile corpus is sharper: each of its categories is
stopped by exactly ONE gate — a named back only by `back`, a named stub in a
face-up slot only by `isHidden`, and a new category, a face-up card with the
face-down characteristic's empty name and no `back`, only by the empty-name test —
and the merge removed each of the nine gates in `paletteNamesOf`, `paletteFor` and
`tilePose` (with `isTileCard`'s) one at a time: every removal fails the hostile
corpus test. The one survivor was `figurePose`'s `anonymous ? null :` guard in
front of `paletteFor`, which is redundant by construction (`paletteFor`'s own back
test stands behind it). The test also carries its own control: the same detector,
over the same hostile layouts, with a lookup that keeps every gate but one, must
see that one category leak.

## D161 — `figures.glb`'s byte budget is 450 KiB, re-set by measurement, and the build reads it from the manifest

**2026-09-28** (lane BODIES, report 15 §9.3; *branch `bodies` — written as D145
in the reserved range D140–D149, **D161** since the lanes' merge*)

**Decision.** `tools/assets-manifest.json` carries a `budget` block —
`libraryBytes` 460,800 (450 KiB) and `triangles` 30,000 — with the measurement
behind it, and `tools/build-figures.mjs` fails a build over either number,
reading them from the manifest instead of typing 400 kB. `figures.test.ts` pins
both numbers and holds the committed library under them.

**Rationale.** Slice 4 left 27 kB under 400 kB (**D96**). Measured on the
committed `figures.glb` (373,236 B): two thirds of the file is its JSON chunk,
and a clip on the proportioned rig costs ~8.4 kB of JSON per body and under
1 kB of meshopt binary — so 27 kB held one new clip for both bodies. What this
lane's own plan adds once the pack is back (six hairstyles at ≤ 500 triangles,
the eye and eyebrow meshes, two more clips for resting poses) is ~69 kB, to
~442 kB; 450 KiB keeps ~18 kB over that. The library itself did not change in
this lane (the hair is carved at load), so the committed file is 87,564 B under
the new line.

**Rejected.** 400 kB unchanged (one clip of headroom); no budget at all. The
cheaper road to headroom — merging each body's clips into one long clip with
named ranges, halving the per-channel JSON — is PLAN.md's lane BODIES
follow-up 3.

## D162 — The drape rule, amended: a skirt link hangs from the PELVIS and follows its thigh part-way, the lower link hangs from the upper one toward the upright, and a kind's buffer holds 64

**2026-09-28** (lane BODIES' fix pass, after the verifier's first round;
*branch `bodies` — written as D146 in the reserved range D140–D149, **D162**
since the lanes' merge*). Amends **D159**.

**Decision.** A kit anchor may carry two new fields (`figures/props.ts`'s
`PropAnchor`), both read by the prop field and both joint anchors only:

- **`follow: {joint, weight}`** — the prop sits where `joint` puts it, turned
  `weight` of the way toward where `follow.joint` puts the same anchor: each
  joint's own skinning of it, the rotations slerped and the positions and scales
  lerped. A rigid panel skinned to two bones.
- **`hang`** — the panel's top is at the previous anchor's panel, `HANG_FROM`
  (0.88) of the way down it, and it is turned `hang` of the way from that panel's
  angle back to the figure's upright (the rig root's frame × the anchor).

The coat's skirt is now, per side, an upper link on the **pelvis** following its
thigh by `SKIRT_FOLLOW.front` 0.38 or `.side` 0.22, and a lower link hanging from
it by `.hang` 0.8; the back panel is the pelvis alone. The cape's two outer hip
panels follow their thighs by 0.22. `joint` is always the STEADY bone: the
duelists' baker (`DuelistLayer`, lane LOOK's file) reads neither field and keeps
every panel rigid on `joint`, so a duelist's skirt hangs from his pelvis whole.
`PROP_CAPACITY` goes from 32 to 64.

**Rationale.** The verifier found three artefacts of D159's calf-riding chain on
the lane's headline card: kneeling, Fury's lower link followed his flat calf
edge-on and drew a dashed ink sliver across his card; attacking, the links
curled into ribbons outside his silhouette; standing, the idle's wide stance swung
a calf link out as a flap — and the director duelist's tails flared to one side.
All three are a panel inheriting a leg's full angle. Following a fraction of it
from the pelvis, and letting the lower link fall back toward vertical, is still a
pure function of the pose (no clock, no history, correct after a skip), costs
nothing at commit and three decompositions a panel in the frame loop, and
allocates nothing (the liveness scan reads it). Measured by `traits.test.ts`'s
drape test over `idle`, `crouch`, `attack`, `block`, `hit` and `summon` at eleven
phases each, for Fury and the Bold Biochemist: the kit's lower links lean at most
6° from hanging straight down, the first cut's 87° (crouch); no hem reaches past
0.40 of a figure height from the pelvis's vertical. The capacity: the corpus
already puts two coats on the table at once (28 panels of one kind) and the
default mirror can put four (56), where 32 cut the last coat's skirt off.

**What was tried and dropped.** A hem trim on every coat panel, with every hem but
the last tucked under the link below it: from the table view the upper links'
bands still read as rings round the coat, blown white on the Biochemist's
(`var/bodies/fix1/coat-v3/`). The cape keeps its trim (its shoulder panels hang
inside its hip panels); a trimmed coat hem is PLAN.md's lane BODIES follow-up 14.

**Rejected.** Hiding the lower links while `tapped` (a pose-dependent prop list
is a second rule for one fact, and the lunge and the stance flaps remain); clamping
each panel's angle (a clamp is a discontinuity a blend does not have); a spring
(a clock).

## D163 — A coat is cut to the body it is on, and a cloth kind carries its LINING for a renderer that culls back faces

**2026-09-28** (lane BODIES' second fix pass, after the verifier's second round;
*branch `bodies` — written as D147 in the reserved range D140–D149, **D163**
since the lanes' merge*). Amends **D159** and **D162**'s numbers, not their rule.

**Decision.** Three changes to the coat and the cloak, all in the kit's data and
the kit's geometry (`figures/props.ts`, `scene/props.ts`):

- **The coat fits.** Its axis is the body's own (`COAT_WAIST` z −0.03, where
  D162's was 2 cm in front of it), the panel is `COAT_PANEL` {top 0.125, hem
  0.14, length 0.22} where it was {0.158, 0.2, 0.27}, and the links are sized to
  stand a finger's width off the hips and flare only to cover a stance's knees:
  the body link 0.113 → 0.126, the upper skirt link 0.13 → 0.146, the lower link
  0.145 → 0.162, the hem just below the knee (y ≈ 0.25) where it was mid-calf
  (0.16). The front panels turn to ±54° (`COAT_FRONT`), so the coat is worn open
  down the front. The cloak's panels follow: its shoulder pair 0.12 off the spine,
  its hip panels outside every coat's back panel.
- **A cloth kind has a LINING.** `buildKindGeometry(kind)` returns, for
  `coatTails` and `cape`, the sheet and a second sheet 0.0025 inside it, wound the
  other way and facing in, in the same vertex colour. The prop field, whose
  material is `DoubleSide`, asks for `{ lining: false }` and draws one sheet; the
  duelists' bake (`DuelistLayer`, lane LOOK's file, which calls
  `buildKindGeometry(kind)` and draws in the figures' `FrontSide` material) gets
  the lining with no change to its file.
- **A panel is 6 × 1 segments** (12 triangles) where it was 6 × 2: a cone's side
  is straight from top to hem, so the second ring bought no shape.

The duelists keep D159's draping coat and Doom's cloak (`duelists.json` is
unchanged): the abandoned first attempt at this pass — a one-shell `longCoat`
kind for both duelists, the cloak taken off the villain — is not taken
(`var/bodies/fix3/abandoned-d147.diff`).

**Rationale.** The verifier's second round, from the pictures: Fury's coat "a
wide bell that hides his legs", the Bold Biochemist's lab coat "a huge white bell
… [that] swallows the figure" with "stair-step ledges where the panels overlap",
and both duelists' coats "detached planks". Measured on the bodies (the waist is
0.08 wide and 0.13 deep round an axis at z −0.035; the knees of the idle's stance
0.12 out), D162's lower links stood 0.26 from the axis. `traits.test.ts`'s new fit
test puts every body and skirt panel's hem within **0.189** of a height of the
pelvis at rest (the bar is 0.2; the D162 bell, swapped into the kit for the run,
reads 0.262 and fails), with the front open **24°** (the idle turns the hips
about 15°; the bar is 16°). The drape test still passes with the new numbers:
lower links ≤ 6° from hanging, and the farthest hem through six clips at eleven
phases 0.28 of a height from the pelvis where it was 0.40. The planks were not
the drape: `DuelistLayer` bakes the panels into its `SkinnedMesh`, drawn
`FrontSide`, so from three-quarters behind the inside of the director's coat was
culled and the villain's cloak was a slab from the front (PLAN.md's lane BODIES
follow-up 17). A lining in the geometry fixes it without editing LOOK's file, and
costs the bake what one sheet cost before this pass (a panel's 12 triangles ×
2 = D162's 24), where giving the duelists' material `DoubleSide` would have been a
second program. `traits.test.ts` holds the lining (twice the triangles, each the
sheet's inset along its normal, wound the other way, facing in), that no other
kind grows one, and that the field's coat is one sheet.

**Rejected.** A one-shell `longCoat` for the duelists (the abandoned attempt: the
villain's cloak had to come off, and a rigid open shell drawn `FrontSide` is two
planks from the front — the verifier saw it); `DoubleSide` on the duelists'
material (LOOK's file, and +1 program); a per-card coat length (a second kind or
a new trait key for one card — the knee-length cut reads as a trench coat and a
lab coat both).

*(Third fix pass, 2026-09-28 — **the yoke is cut to the body too.** The
verifier's third round read "a stepped ledge at the shoulder" on Doom's cloak
and, on the Bold Biochemist bent over his bench, the coat's back "a separate grey
panel" with "a white arc beside his head". This decision cut the skirt and the
body link and left the YOKE flared to 0.165 at its hem, 5 cm off the chest and a
ledge over the body link's 0.116. Now `scene/props.ts`'s `YOKE_CUT` tapers it
from 0.15 at the shoulders to 0.128 at the hem, its depth and centre following the
torso (0.72 of its width round z −0.035 at the shoulders, round at the hem a
little forward of the body link's axis), and the body link's top rises from 0.675
to 0.70 (`COAT_CHEST`, lengthened to keep its hem at 0.51), because the chest rests
pitched and lifted the yoke's back hem above the old top — a gap at the shoulder
blades. A new `traits.test.ts` case measures the seam through the prop field's
own matrices at rest: Fury's yoke hem stands 0.001–0.012 of a height off the body
link and the Biochemist's −0.010–0.016, both under the body link's top (the bar:
≤ 0.025 out, ≥ −0.012 in, never above the top); D163's flared yoke reads 0.048
and 0.053 and fails it. The lean itself is **D165**'s amendment.)*

## D164 — The accent prefers the brighter of two vivid colours; the art rung's switch stays in lane LOOK's two files, written out and not made

**2026-09-28** (lane BODIES' second fix pass, **amended by the third, and at the
lanes' merge**; *branch `bodies` — written as D148 in the reserved range
D140–D149, **D164** since the lanes' merge*). Completes **D160**'s palette.

**Decision.**

- **The accent's score gains a brightness term**: `share × (0.3 + saturation) ×
  (0.4 + value)`. Fury's accent was the khaki round his explosion (`#867448`)
  rather than the explosion, because a large muted cluster beat a smaller bright
  one of the same saturation; `palette.test.ts` holds the pick with report 15
  §7.1's own clusters.
- **The art rung is not switched on in this lane.** The pass-through that turns
  it on — `paletteNamesOf(placed)` into `useArtPalettes`, the map into
  `figurePose` and `tilePose`, in the memos that already make the poses — belongs
  in `Arena.tsx` and `workshop/Pedestal.tsx`, which report 15 §9.1 and §9.4 give to
  lane LOOK. It is PLAN.md's lane BODIES follow-up 13, written out whole, for LOOK
  or the merge to apply; both files are byte-identical to the base `c81f674`. The
  workshop's tuning panel shows the card's swatches and a PREVIEW — the framed
  card's tint and accent with the rung, from `figurePose`, beside the ones drawn
  now — and says in words that nothing draws it yet. Liveness holds the hook's
  callers: the tuning panel today; `Arena.tsx` and `Pedestal.tsx` at most once
  each, and then only fed by `paletteNamesOf` (negative-controlled on the
  follow-up's own text); no other file.

**History.** The second fix pass applied the pass-through itself, answering the
verifier's second round ("Deliverable 5, the art palette, never reaches a
pixel") after its first round had called the same hunks a blocker; `git
merge-tree` showed no conflict with LOOK's branch in either file. The verifier's
third round called them a blocker again — ownership, not a merge break — and said
the two rounds asked opposite things, so the call belongs above the lane. This
decision takes the lane's own rule (a change needed in another lane's file is a
follow-up with the exact edit) and leaves the choice — apply follow-up 13 now as
a recorded cross-lane exception, or at LOOK's merge — to the user.

**What the rung does once applied** (measured with it on, docs/evidence/bodies.md
§8.4): a creature with no hand-written tint anywhere takes its painting's vivid
colour (the Giant-Sized Flying Ant is brown, its painting's, where the colour
identity made it blue); an aura with no attachment row takes its painting's
accent; a land's tile its painting's terrain. Every hand-written row still wins,
`palette: off` keeps a card's colour identity, and the costume is never the
art's (**D160**'s third-fix-pass note).

**Rejected.** Editing LOOK's files without the user's word (two verifier rounds
disagreed; the lane rule decides); moving the pass-through into a module the lane
owns (every pose is made in a memo in those two files, and a hook cannot be
called from `figurePose`); folding the palette into the workshop's trait
overrides so only the workshop drew it (the workshop must draw what the arena
draws, **D102**, and the art rung sits below the subtype rungs, which an override
row would outrank).

*Amended at the lanes' merge (2026-09-28): follow-up 13 is applied — option (a)
above, "whoever merges LOOK and BODIES applies it".* The merge pass may edit the
earlier lanes' files, so `Arena.tsx` and `workshop/Pedestal.tsx` carry the
pass-through as written — `paletteNamesOf(placed)` into `useArtPalettes`, the map
into `figurePose` and `tilePose`, in the memos that already make the poses — and
the rung is drawn in the arena and on the pedestal at once. The workshop's framing
poses take the card's own palette too, so the tuning panel's preview went: its
"drawn" tint and accent are the pedestal's. Liveness tightened with it: each of
the two files calls the hook EXACTLY once (it was "at most"), fed by
`paletteNamesOf`, and hands the map to both `figurePose` and `tilePose` —
negative-controlled on each hand-off.

## D165 — Faces and poses are judged from ABOVE: a face sets its jaw as a pose, the high ready, and a bob that is hair

**2026-09-28** (lane BODIES' second fix pass; *branch `bodies` — written as D149,
the last of the reserved range D140–D149, and **D165** since the lanes' merge*).
Extends **D156**, **D157** and **D158**.

**Decision.**

- **An expression is a pose.** `figures/props.ts`'s `expressionOf(stance)` is
  `grit` while the snapshot says the figure kneels (tapped), attacks or blocks,
  and `neutral` otherwise; `faceKindOf` picks `faceGrit` or `facePatchedGrit` for
  it — the same face with its brows pulled down into a V, its eyes narrowed, and
  its mouth a band of set teeth between two ink lines. Two derived kinds, rigid on
  `Head` like the face. Pain on a hit is a CUE and lane MOTION's.
- **`highReady`**, a tenth resting pose: the pistol held up beside the face, barrel
  to the sky, from the aim's own frame so the grip holds. Agent 13 rests in it;
  `aim` stays in the kit for any row.
- **The resting poses are aimed against a lens that looks down.** `atEase`'s upper
  arms hang almost straight (only the forearms fold behind the back);
  `clasped` meets above the belt with the elbows out; `braced` lifts its head.
- **The bob is re-cut as hair**: a fringe that stops high and sweeps to one side
  (`sweep`), the hairline raised at the temples, half D157's flare, and a band of
  lit locks across the crown (`sheen`, a vertex colour over 1, as the coat's trim
  is). Quake's hair is a dark brown the locks show on.

**Rationale.** The verifier's second round read the pictures: Agent 13's aim "keeps
the pistol low at her hip", Coulson's clasp "low at the groin", the Soldier tokens
"hands on head", and Quake's bob "like a helmet [that] hides her face from above".
Every one is the same fact: the table view and the workshop's 1× framing look DOWN
at a figure, so a barrel pointed at the lens shortens to a stub, anything in front
of the belly draws lower than it stands, and anything behind the back draws higher
— the at-ease elbows rose beside the head. A vertical pistol beside a head reads in
silhouette from every camera the table has. With the new bob Quake's face shows
8 px at the table view and 19 over the shoulder from the seat that faces the lens
(5 and 13 before), and her hair keeps its identity pixels (142 · 174). The face
cannot be seen at the workshop's steep 1× (it could not before either); at a lens
at head height the grit is plain (`var/bodies/fix3/it6/s3.png`). `traits.test.ts`
holds it over the corpus: 2,673 face-up faces neutral and 1,452 in grit, each
where its stance says, none on an anonymous figure. The census of kinds in one
frame rises from 16 to 17 (a face in grit beside a face at rest).

*(Third fix pass, 2026-09-28, from the verifier's third reading of the
pictures:*
- *`working` bends from the WAIST: `spine_01` and `spine_02` take a share of the
  lean, where it was all at `spine_03` and the neck. The coat's body link rides
  `spine_01`, so it stood upright while the chest leaned out of it, which from
  above read as "a separate grey panel fanning out"; a man bent over a bench
  bends at the lower back too. The left forearm reaches less far, so the hand
  rests on the bench rather than past its edge. `traits.test.ts`'s yoke-seam test
  (**D163**'s note) holds the coat round the new lean.*
- *The hair's lit locks are COOL (`SHEEN_COOL`, an inker's blue-white on black
  hair) and the bob's `sheen` 1.8, so Quake's bob is the near-black her painting
  draws (`#1c1a22`, from the dark brown the grey locks needed) and still shows
  its locks.*
- *The pistol (and Peggy's sidearm, the same geometry at 60%) gets a pistol's
  profile — a slide, a DARK grip raked back, a trigger guard, a hammer — where the
  verifier read "a grey brick": 90 triangles, from 64; the sidearm 51 / 21 px from
  your seat / the opponent's (56 / 20), still one-sided, the pistol 152 / 98.)*

*Amended at the lanes' merge (2026-09-28): the identity raster, on Lane LOOK's
seats and ink.* **D143** turned the seats round — the near seat sees your figures'
BACKS, the far seat the opponent's fronts — and **D146**'s ink takes a small
prop's edge, so three of this lane's props measured under the bar from one seat
each. Each is now a detail with a partner at the full bar (`traits.test.ts`'s
`ONE_SIDED`): Peggy's **shield**, held in front of her in her `ready` (1 px from
behind, 127 from the front; the red hat carries her); the **parted hair** of the
Agents' leader — the agent body's own (`BODY_HAIR`), naming no card — 40 px from
the far seat's front, where a hairstyle is its fringe (the squad's three heads
carry the card); and Wasp's **bob** on her half-height body, 17 px there (her wings
carry her). The **sidearm** is the pistol at 70%, from 60%: its side is the far
seat's now, and under the ink it fell to 22 px, under a one-sided detail's 24 (34
at 70%). Coulson's chest badge went 0.065 → 0.075 at the same merge (Lane LOOK's
follow-up 17: 46 px after the ink, 58 at 0.075), and `SHORTFALL` is empty.

**Rejected.** An expression as a uniform on one face kind (it is lane LOOK's
shader, and a per-instance switch in the prop shader would be a second program
key or a new attribute on every kind); pain as a pose (it is what an event says,
so it is a cue); reshaping the Soldier token into another pose entirely (atEase
reads as "arms at the sides" now, which is what a token standing easy is).

---

## D180 — Every rule of `tools/lint-bridge.sh` is proven to FIRE, on every build, by a self-test that reads the rule list from the lint

*Branch `guards` (worktree `mtg-table-t2w`, off `main`'s `b9af15d`). Numbered in
the lane's reserved range D180–D189 and kept there: since 2026-09-28 a lane keeps
the numbers it reserves, and gaps are allowed.*

**2026-09-28** (the structure review's guards finding; `docs/evidence/guards.md`
is what was run, PLAN.md *Guards* the status and the follow-ups)

**Decision.**

1. **A rule is declared by one of three lines** — `ban <id> <pattern> <why>`,
   `ban_except <id> <repo-relative path> <pattern> <why>` or `rule <id> <check
   function>` — and **fails only through `lint_fail`**, which prints `LINT FAIL
   [<id>]: …`. `tools/lint-bridge.sh --list-rules` prints the ids (31 today) and
   scans nothing; `--root <dir>` lints another tree.
2. **`tools/lint-bridge-selftest.sh` holds every rule to firing.** It reads
   `--list-rules`, checks it against the source's own `ban` / `ban_except` /
   `rule` lines (so a rule behind a condition is caught), requires the ids to be
   unique, and requires `LINT FAIL` to be printed and `fail=1` to be set in
   `lint_fail` alone — so no check can fail the lint without an id. Then, for
   every case, it copies `bridge/src`, `tools/**/*.java` and `DECISIONS.md` into
   a scratch tree under `var/lint-selftest/`, plants a minimal Java snippet (a
   new file, a method injected into `Snap.java` or `WireGuiGame.java`, or an edit
   to a real line), runs the lint with `--root`, and requires **exit 1 with that
   rule's id and no other**. Every rule id must have a case and every case must
   name a rule, so **a rule added without a case fails the build**. Five PASS
   cases hold the other direction (`HostedMatch.getGame()`, a `Map.Entry`'s
   `getKey()`, banned names in comments, a correctly named thread,
   `Bootstrap.createAiPlayer` in `tools/`), and the real tree and a pristine copy
   must pass. 60 firing cases over 31 rules, 73 checks, about a second — the
   cases run concurrently, `LINT_SELFTEST_JOBS` at a time.
3. **It runs in three places**: `bridge/build.sh`, before the lint and javac
   (`--quiet`: failures and the summary); gate step **2b** (`02b-lintself`,
   beside 2, which 3 waits for); CI's `bridge` job, before the lint.
4. **The two dead rules now work from the type, the way 4b does.**
   `GameView-getDeck` and `GameView-getGame` watch every identifier declared
   `GameView <name>` in either tree, plus `getGameView()`, `getView()` (Game's is
   the only `getView()` whose result has either method — javap), a cast to
   `GameView` (qualified or not) and the method references. No ALLOW: nothing
   calls either one. `HostedMatch.getGame()` stays legal (its receiver is not a
   `GameView`; a PASS case holds it).

**Rationale.** A lint rule that cannot fire prints the same `bridge lint OK` as a
rule nobody has broken. `GameView.getDeck` and `GameView.getGame` searched for
that literal class-qualified text, which no Java call contains — an instance call
reads `gameView.getDeck(p)` — so the whole-decklist and live-`Game` accessors
were unguarded from the first commit (M0 and M1, 2026-09-11) to this lane: `main`'s lint passed a file that called both
and compiled against the pinned jar (evidence §1). Nothing had ever asked a rule
to fail. The self-test asks every rule on every build, and it found a third gap
while being written: its first run caught the new cast pattern missing
`(forge.game.GameView) o`. Its own controls: the two rules put back to their old
literal patterns fail all eight GameView cases; a rule added with no case, a
`LINT FAIL` echoed outside `lint_fail`, and a rule declared behind an `if` each
fail it (evidence §2).

**Rejected.**

- **A fixture directory of committed probe `.java` files.** They would sit under
  a tree the lint scans, and every one would need an exemption that could leak
  into a real file; scratch copies under `var/` are made and removed per run.
- **Listing the cases' rule ids by hand in the self-test.** A rule added to the
  lint and forgotten here would go untested — the failure this exists to stop.
  The list comes from the lint.
- **Asserting only "the lint failed" per case.** A case that tripped the wrong
  rule, or several, would pass and prove nothing about its own rule.
- **Compiling each snippet.** The lint reads text; a javac per case would cost
  seconds each for no extra power. Evidence §1 compiles the finding's own snippet
  once, to show the text is real code.

---

## D181 — The three game-thread hops are counted by the lint: exactly `HOP_ALLOW`'s three, each tagged `// ALLOW hop: D<n> <method>`

*Branch `guards`; the lane's reserved range D180–D189.*

**2026-09-28** (hard rule 3; `docs/evidence/guards.md` §3)

**Decision.** `tools/lint-bridge.sh` rule `game-thread-hop` finds every
non-comment mention of `invokeInGameThread` under `bridge/src` and `tools/` — a
call with a lambda or a method reference, a method reference to it
(`ThreadUtil::invokeInGameThread`), a static import, a reflective lookup by name
— and fails unless:

1. each carries `// ALLOW hop: D<n> <method>` on its own line;
2. `<method>` is the nearest method declaration above it (a modifier, a name,
   `(`, no `=` or `;` between), so a tag cannot be copied onto a new hop;
3. `D<n>` is a heading in `DECISIONS.md`; and
4. the set of (file, method, decision) is **exactly** `HOP_ALLOW`:
   `WireGuiGame.captureOutcome` (D39's rationale: only at game end),
   `asyncAbilityMenu` (D22) and `refreshState` (D39).

A fourth hop, even tagged with a real decision, fails until `HOP_ALLOW`, a
written argument and hard rule 3 name it; a hop removed or moved fails until it
comes off the list. Two companions: `game-pool-reflection` bans
`WorkerThreadFactory`, `gameThreadPool` and `getGameThreadPool` outright, and
`thread-builder` bans `Thread.ofPlatform()` / `Thread.ofVirtual()`, whose name is
on a line section 6's thread-name rule does not read.

**Rationale.** Hard rule 3's three hops were a sentence: a fourth `invokeInGameThread`
compiled, passed every `isGameThread()` assert on its `Game-n` worker, and needed
only a reviewer who remembered the rule. javap settles what counts:
`ThreadUtil.invokeInGameThread(Runnable)` is the one public way onto the pool
whose threads are named `Game` (`newCachedThreadPool(new
WorkerThreadFactory("Game"))`); `delay` runs on `Delayed-n`, `getComputingPool` and
`executeWithTimeout` on default names, `getServicePool` / `limit` on a
work-stealing pool; `WorkerThreadFactory` is package-private and the pool field
private, so any other route is reflection, which the companion rule bans.
`FThreads.invokeInEdt*` and `invokeInBackgroundThread` are not hops onto the game
pool. There is no `GameThreadUtil` in the 2.0.14 jar. Forge's own classes hop
too (`GameAction`, `InputPassPriority`, `InputConfirmMulligan`, `InputBlock`,
`QuestTournamentController`, `AchievementCollection` reference the method); that
is the engine's input protocol, which D136 classifies act by act, and not ours to
count. Nine self-test cases hold the rule, among them a fourth tagged hop, a
removed hop, a tag naming the wrong method and a tag citing `D9999`.

**Rejected.** Counting by a number alone (a hop moved from `refreshState` into a
new method would keep the count and lose the argument). Matching the receiver
`ThreadUtil.` (misses the static import and the reflective name). Banning the
call outright with three per-file exemptions (all three live in one file, so a
per-file ALLOW would admit a fourth there).

---

## D182 — The lint scans `tools/**/*.java` with the bridge's rules, exemptions are repo-relative paths, and the audit helper seats its AIs through `Bootstrap.createAiPlayer`

*Branch `guards`; the lane's reserved range D180–D189.*

**2026-09-28** (`docs/evidence/guards.md` §4)

**Decision.**

1. **`tools/lint-bridge.sh` reads every `*.java` under `bridge/src` and under
   `tools/`**, with the same rules. Every exemption is a repo-relative path
   (`bridge/src/mtgtable/Bootstrap.java`, `…/Smoke.java`, `…/Snap.java`,
   `…/RecordMatch.java`, `…/WireGuiGame.java`), never a bare file name, so a
   `tools/probe/Bootstrap.java` inherits nothing (three self-test cases hold
   that). No `tools/` file is on any ALLOW list.
2. **`tools/audit-deck/AuditDeck.java` seats its two throwaway AIs with
   `Bootstrap.createAiPlayer(name, avatar, Bootstrap.DEFAULT_AI_PROFILE)`**
   (D107's seam), never `GamePlayerUtil.createAiPlayer(name, avatar)`.
3. **`tools/audit-deck.mjs` fingerprints the throwaway home's preferences files
   before and after the engine runs** (D133's shape) and exits 2 if one changed.

**Rationale.** The lint stopped at `bridge/src`, and `AuditDeck.java` — which
boots the same engine the same way through `Bootstrap` — called the two-argument
overload whose empty `profileOverride` reaches `ForgePreferences.save()` (javap:
offset 83 of the five-argument overload) when the preferences name an AI profile
that did not load. Measured with the audit's own throwaway home: a planted
`UI_CURRENT_AI_PROFILE=NoSuchProfile` turned a 36-byte file into 8,045 bytes
carrying D13's `UI_SELECT_FROM_CARD_DISPLAYS=false` and D14's
`ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE=true` as persistent edits; after the fix
the same file is untouched, and with no file planted no preferences file appears
in any of step 9e's three directories plus the audit home, before or after. The
old helper under the new guard exits 2 on the planted file. The audit's verdicts
did not move (`decks/pacho-shield.dck` 40 ok; `decks/fra-rw-aggro.dck` 19 ok, 31
missing, 0 broken).

**Rejected.** A separate, lighter lint for `tools/` (two rule sets drift; the
point is that the same accessors are dangerous wherever they are called). Moving
`AuditDeck.java` into `bridge/src` (it is not the bridge, emits no protocol and
compiles against a throwaway home's classes — its header says why it lives
outside). An ALLOW for the audit's call (the call's only effect worth having is
the one `Bootstrap.createAiPlayer` already provides).

---

## D183 — `node tools/build-deck.ts --check` is gate step 12e, a local job that needs the card index; it is not in CI

*Branch `guards`; the lane's reserved range D180–D189.*

**2026-09-28** (`docs/evidence/guards.md` §5)

**Decision.** Gate step **12e** (`12e-decks`, after the build, beside 12b and
12c) runs `node tools/build-deck.ts --check`: every `decks/specs/*.json`
re-resolved against the local card index and the `.dck` it would write compared
with the committed one, byte for byte (D116). It needs `var/cards/cards.sqlite`;
a checkout without it **fails** 12e with the command that builds it (`node
tools/card-library/build.ts`, which downloads Scryfall's bulk file), and
`SKIP_DECKS=1` skips the step and says so. CI does not run it; its header says
why, and the hermetic half, `web/test/deck-specs.test.ts`, is in CI's `web` job.

**Rationale.** The review asked for the check in CI, but the builder reads the
card index, which only the network build makes: `fixtures/cards/` is a test
slice holding one to three of each AI deck's 24–27 names, so an index built from it
cannot resolve the decks, and CI calling Scryfall is what the workflow's header
rules out. So it is a local job. It earns one: the hermetic test compares names,
counts and order, and passes a deck whose unpinned `Vibranium Energy
Daggers|MSH` line was switched to `|MSC`; `--check` fails it (`STALE:
decks/wakanda.dck differs from what decks/specs/wakanda.json builds`). It takes
about a tenth of a second. Failing without the index, rather than skipping,
follows `SKIP_WEB`'s precedent: a step that silently does not run is the defect
D180 is about.

**Rejected.** Running it in CI against an index built from `fixtures/cards/`
(it cannot resolve the decks). Fetching the bulk file in CI (a Scryfall download
on every push, which the card library's rules keep local, D90). Skipping 12e
without a word when the index is missing (a guard that does not run looks like
one that passed).

---

## D190 — The personal tier: a gitignored folder of models the user downloaded, dressing a card or a seat when present; never committed, published or sold; the repository tier stays CC0

*Branch `personal-tier` (worktree `mtg-table-t2x`, off `main`'s `a08c15f`). The
lane's reserved range is D190–D199; the numbers are kept, gaps allowed.*

**2026-09-28** (the user's decision of the day; `docs/guides/personal-tier.md`
is the manual, `docs/evidence/personal-tier.md` what was run, PLAN.md *The
personal tier* the status and phase 2)

**Decision.**

1. **Two tiers, and they never mix.** The repository tier is what D54 made it:
   CC0 assets with a written provenance, GPL-3.0-or-later code, publishable. The
   **personal tier** is `personal/models/<slug>/` on the user's own machine —
   rigged models of the actual Marvel characters that the USER downloaded, with
   their own account, under whatever personal-use licence the source grants
   (fan-made models; models taken from games are the user's call — the tooling
   does not care about provenance, and Claude never sources a model, creates an
   account or accepts a licence).
2. **The user's rule, in their words: "this can never ever ever be sold or
   published."** `.gitignore` ignores `/personal/` — ANCHORED, because an
   unanchored `personal/` also hides `tools/personal/`, the committed pipeline —
   and `web/test/personal-tier.test.ts` holds both halves with `git check-ignore`
   (a path under `personal/` is ignored; the pipeline, its guide and its test are
   not; git tracks nothing under `personal/`). Nothing under `web/src/` or
   `web/public/` reads it, so no build and no CI run can carry it; phase 2 serves
   it from the Vite dev server alone (D92's rule); a picture of a personal model
   stays in its folder.
3. **The folder**: the download untouched, `source/` (what `import.mjs`
   unpacked), `SOURCE.txt` (title, URL, author, licence as shown, date),
   `inspect.json`, an optional `bones.json`, `model.glb` (the prepared figure),
   `manifest.json` and `preview/`. The slug is the card's name lowercased, accents
   folded, everything but letters, digits, spaces and hyphens dropped, spaces to
   hyphens (`nick-fury-spymaster`, `doctor-doom`); a tool writes only inside its
   own slug's folder (`insideSlug`).
4. **The manifest (version 1) says what the model dresses** — `{card: "<exact
   name>"}` and/or `{seat: "you"|"opp"}` (the duelist seats of `duelists.json`) —
   and how it was made: the source's bytes and sha256, the credit line, the rig
   map and how every source bone was placed, triangle counts, the pose fix with
   the arm angle before and after, what was skinned by rule, the textures kept,
   what was dropped. `validateManifest` in `tools/personal/lib.mjs` is the schema;
   an unknown key is an error.
5. **Present, it dresses; absent, the repository figure stands.** A checkout
   without `personal/` plays exactly as before. **Hard rule 8 binds the tier:** a
   personal model is chosen by card name only where `figurePose` already places a
   named figure — never for a face-down or redacted card, which stays the
   anonymous disc. Phase 1 (this branch) draws nothing; phase 2's loader enforces
   it.

**Rationale.** The user's verdict on four slices of CC0 bodies was that they
stay generic beside the card art, and the likeness experiment (personal-only
image-to-3D) did not beat a relief standee at figure size. Fan-made rigged models
of the characters exist; they cannot be committed (a depiction of someone else's
property, whoever made the mesh — PLAN.md *Tier 3 — a note, not a plan* said so
first), but they can live on this machine, and the arena can wear them. Keeping
them in a separate, ignored folder with its own manifest keeps the public repo
exactly as publishable as it was, and makes "not there" the default rather than
the exception.

**Rejected.**

- **Recording personal models in `tools/assets-manifest.json` as
  `committable: false`** (the Tier 3 note's first idea). That manifest is the
  committed CC0 library's provenance; a personal entry in it would publish the
  fact of the file and blur the line D54 draws. The personal manifest lives in
  the personal folder.
- **A committed `personal.example/`.** The user did not want one: the guide
  documents the layout, and the test builds its own fixture.
- **Refusing files by provenance.** The tool flags name patterns games leave;
  what the user keeps privately is the user's decision.
- **Letting the arena read `personal/` in a production build.** A build is a
  thing that can be shared; the tier is served, in phase 2, by the dev server only.

---

## D191 — The personal pipeline: rebuild the skeleton on our 22 joints in our bind frames, turn an A-pose to our T and bake it, skin the unskinned by height, decimate with the pinned meshopt, keep base colour and normal ≤ 1024, meshopt last

*Branch `personal-tier`; the lane's reserved range D190–D199.*

**2026-09-28** (`docs/evidence/personal-tier.md`)

**Decision.** `tools/personal/prepare.mjs <slug>` turns `source/` into
`model.glb` by these rules, and writes nothing else but `manifest.json`:

1. **Strip** every rig control mesh (Auto-Rig Pro `cs_*` under `cs_grp`, Rigify
   `WGT-*`, `*_shape`, `ctrl`, `MCH-`, `ORG-`, by node, mesh, material or
   ancestor name) and every node that draws nothing; `--drop <regex>` removes a
   named render mesh too. The output is `<slug>` → { `<slug>-body` (ONE skinned
   mesh, a primitive per part — separate mesh nodes were each quantized with a
   transform of their own and got eight copies of the skin), `root` → our 22
   joints }: `figures.glb`'s `agent`, in shape.
2. **Rebuild the skeleton on OUR joints** — the 22 `tools/build-figures.mjs`
   drives (`rigs.ubc.retarget.joints`), plus `root` — rather than drive the
   source's own hierarchy: Auto-Rig Pro exports its deform bones hanging from the
   rig's root (Doom's `arm_stretch.l` is not under its shoulder), so turning a
   shoulder would move no arm. The map is automatic (Auto-Rig Pro, Mixamo,
   Unreal, VRM with its own `humanBones`, Character Creator: the convention that
   names the most of our joints), overridden joint by joint by
   `personal/models/<slug>/bones.json` or `--map <file>`. Every weighted source
   bone is merged into one of ours: its map list (the FIRST bone present is the
   joint — for Auto-Rig Pro the upper limbs' twist bone, the lower limbs' stretch
   bone, measured), else its nearest listed ancestor (the fingers into the hand),
   else the nearest of our segments by position; the manifest names every
   placement. Each joint takes the source bone's POSITION — the pelvis between the
   two thigh pivots, where our clips' hip is — and OUR bind ROTATION, read from
   `figures.glb`'s `agent`; so the build's world-space-delta retarget onto a
   prepared model is the identity on rotations. A spine, neck, clavicle or ball
   joint the source lacks is put between its neighbours; a missing pelvis, head,
   arm or leg joint stops the tool and asks for `bones.json`.
3. **Re-pose A → T** (`--pose t`, the default): each upper arm, then each
   forearm, is turned about its own joint onto the direction the `agent`'s bone
   has in its T bind pose; every vertex is baked through its (new) skin weights
   with the same linear blend the renderer does, and the inverse bind matrices
   are written from the new pose, so at rest the skin is the identity and the
   file draws the T-posed mesh. The upper arm's angle below the horizontal is
   measured from the bind matrices before (`import.mjs`) and after (read back
   from the written file). `--pose none` keeps the source's rest.
4. **Skin what has no skin** by a documented rule: above `spine_03`'s bind height
   all `spine_03`; between `spine_02` and `spine_03`, and between `pelvis` and
   `spine_02`, a linear blend; below the pelvis all `pelvis`. `--cloak-to <joint>`
   binds every unskinned mesh wholly to one joint, `--bind <regex>=<joint>` one
   named part (a pair of wings), and a mesh parented under a source joint is bound
   rigidly to that joint's segment.
5. **Normalise**: +Y up (a model whose head is not above its feet is stood up),
   facing +Z with the character's left at +x (D81), feet at y = 0, the pelvis over
   the origin, scaled to `--height` (default the `agent` body's own bind height,
   so the clips' hip translation needs no second scale).
6. **Decimate** to `--budget` (6,000 by default) with the meshoptimizer nested
   under `@gltf-transform/cli` (1.2.0, the one `build-figures.mjs` resolves, D96),
   each part simplified with its normals and UVs as attributes, collapsing onto
   existing vertices so every survivor keeps its skin weights and UVs exactly;
   parts under 300 triangles kept whole, the rest sharing what is left in
   proportion.
7. **Textures**: base colour and normal kept, byte-identical images deduplicated,
   anything over 1024 px downscaled with the `sharp` the CLI already carries;
   every other texture slot dropped and named in the manifest.
8. **meshopt last** (`gltf-transform meshopt`, nothing after it — Tier 2's trap).

`tools/personal/check.mjs` holds the result: its retarget
(`tools/personal/retarget.mjs`, the build's `humanClips` formula line for line)
must reproduce the build's own `hero` clips from `agent`'s (the delta composes);
then OUR clip set — idle, attack, hit, die and the kneel, from `figures.glb` —
carried onto the model must move every joint the `agent`'s moves, by the same
world-space delta, with the skin the identity at rest, no NaN, bounds within 1.5×
the rest's largest side, and a rule-skinned part following the spine.

**Rationale.** A downloaded rig arrives in someone else's conventions — names,
hierarchy, rest pose, units, facing, control shapes, a cloak nobody weighted —
and the arena's clips assume one rig in one pose. Rebuilding onto our joints in
our frames removes every one of those differences once, at prepare time, so the
phase-2 loader is a plain `GLTFLoader` of a file that already speaks our rig; and
the same world-space-delta arithmetic the build uses is the only retarget
anywhere. Baking the T-pose (rather than teaching the retarget a per-joint rest
offset) keeps the build's "both binds are T" assumption true for every model.
The retarget is copied rather than shared because the build is a script whose
import builds the library from CC0 downloads this checkout does not carry; the
copy is proven against the build's own output instead, and a mutant (the bind
offset dropped) fails that proof by 8.5°.

**Rejected.**

- **Driving the source hierarchy with a name map** (what the build does for the
  UBC bodies). It works for a clean hierarchy and moves nothing on Auto-Rig Pro's
  flat deform bones.
- **Fixing the A-pose in the retarget** (a per-joint rest offset). Every reader
  of a prepared model — check, the loader, the workshop — would need the offset;
  a baked T needs nothing.
- **Keeping the source's joints (339 for Doom) and the fingers.** Our clips drive
  22 joints; the rest is weight the loader would carry for nothing, and
  controllers left off their bind (Doom's `c_toes_track.l`, 2 units) poison
  bounds.
- **gltf-transform's `simplify`/`textureCompress` as black boxes.** The simplifier
  had to see normals and UVs as attributes and keep small parts whole, and the
  texture step must not re-encode images it does not resize.
- **Blender.** It would do the shoulders, the cloak and the twist bones better
  (evidence §9), and it is the user's to install; the pipeline does without it
  and says what a session would still improve.

## D192 — check.mjs judges the rig map by where the weight goes and where the joints stand, never by rotations; its preview browser writes nothing outside the slug and reaches nothing beyond the loopback

*Branch `personal-tier`, fix pass 1 (the launcher's writes named in fix pass 2); the lane's reserved range D190–D199.*

**2026-09-28** (`docs/evidence/personal-tier.md` §13)

**Decision.** Two rules for `tools/personal/check.mjs`, both from the verifier's
round-1 findings:

1. **A rig map is judged against the `agent` body, by weight, side, facing and
   shape** (`tools/personal/lib.mjs`'s `judgeBody`). D191 builds every skeleton
   in the `agent`'s bind rotations and check plays the `agent`'s clips on it, so
   "every joint turned, by the agent's world-space delta" holds for ANY map — the
   verifier's two wrong maps (the left hand on an unweighted controller; the arms
   named side for side) both read "moved yes, 21/22" and exit 0. The rotation
   columns stay as a sanity check of `retarget.mjs`, labelled as holding by
   construction. What fails the tool now:
   - a CORE joint (`CORE_JOINTS`) that the `agent`'s skin uses (≥ 0.1% of its
     weight, the agent's fingers and twists counted as their joint of ours) and
     that carries none on the model (< 0.01%), unless prepare synthesised it; a
     non-core joint in that state is a warning;
   - weighted source bones placed BY POSITION carrying more than 2% of the skin
     weight (`rig.placement` in the manifest; any at all is a warning);
   - an `_l` joint on the other side of its `_r` from the `agent`'s, or the
     vertices a sided joint dominates on the other side;
   - a foot whose vertices lie BEHIND its ankle where the `agent`'s lie in front:
     prepare infers the facing from the arms, so a map that swaps every side
     passes the side test after prepare turns the figure round, and only the feet
     (and the toes' segment) say so;
   - a segment of the skeleton (spine, neck, pelvis → thigh, spine → clavicle,
     thigh → calf → foot → ball) more than 60° from the `agent`'s. The arm
     segments are judged by side only: `--pose t` turns them onto the agent's by
     construction.
   A joint whose bone carries no weight in the source is a warning, not a
   failure (Auto-Rig Pro's `arm_twist` marks the shoulder and carries none).
2. **The preview browser leaves nothing outside `personal/models/<slug>/` and
   reaches nothing beyond 127.0.0.1.** The page is answered from memory; every
   answer is `no-store`; the profile is `personal/models/<slug>/.preview-profile/`
   for the run and is deleted after it (`--incognito`, disk cache sized to
   nothing); background services are off; and `--host-resolver-rules=MAP *
   ~NOTFOUND, EXCLUDE 127.0.0.1` answers every host name "not found" before any
   DNS query. Chromium's own net log is written into the profile and read back
   before it goes: the run FAILS on a TCP connection, a byte sent, a DNS query or
   an answered request beyond the loopback. The attempts Chromium still makes
   (signin's `ListAccounts`, a `www.google.com` call) are printed, not hidden, and
   so is the resolver's IPv6-reachability probe (a UDP `connect()` to
   2001:4860:4860::8888, which sends nothing).

   **The one write outside the slug's folder is the snap launcher's** (named in
   fix pass 2, from the verifier's round 2). Before Chromium itself starts, the
   snap package's launcher rewrites
   `~/snap/chromium/common/chromium/Crash Reports/settings.dat` (40 bytes, the
   crash reporter's own state) and re-creates the symbolic link
   `~/snap/chromium/<revision>/.config/ibus/bus` → `~/.config/ibus/bus` (the
   revision is `3520` on this machine). No flag reaches the launcher, any
   Chromium start does the same (`tools/arena-bench.mjs`, `tools/story-shot.mjs`),
   and neither path holds a byte of the model. Fix pass 1's run also touched two
   empty marker files under `~/snap/chromium/common/.cache/`
   (`mesa_shader_cache/marker`, `radv_builtin_shaders/marker`); fix pass 2's did
   not. "Writes nothing outside the slug" is the tool's rule and the browser
   profile's; these two are outside the tool's control, and the evidence names
   them rather than the rule hiding them.

**Rationale.** A check that cannot fail on the defect it exists for is not a
check; the discriminating facts of a map are the skin's and the bind positions',
and the agent body is the reference both are measured against. The preview
browser is a second writer and a second network client that the tool starts; the
never-publish rule (D190) and the lane's fetch-nothing rule apply to it as to
the tool, and a profile under `var/` had kept a 2.3 MB copy of `model.glb` in its
HTTP cache, with spellcheck and Google requests beside it.

**Rejected.**

- **Checking the map in prepare only.** Prepare is where the map is applied, but
  check is the tool that reads the result against the agent; prepare warns
  (unweighted primaries, placement by position) and check decides.
- **A per-vertex "moved" test.** It would pass the swapped arms too: every
  vertex moves, just on the wrong side.
- **Proving "no network" with a live negative control** (Chromium without the
  resolver rule). That run would reach Google, which this lane may not do; the
  net-log reader is held on a synthetic log instead (`personal-tier.test.ts`).

---

## D193 — check.mjs judges the LIMBS: each chain link's direction, each limb's proportion and where each limb joint's flesh lies, and the chain ends at attack t = 0.5; the preview browser's HTTP cache and profile are measured

*Branch `personal-tier`, fix pass 3 (the third skeptic round), rebased onto `main`'s `f2c934d`; the lane's reserved range D190–D199.*

**2026-09-28** (`docs/evidence/personal-tier.md` §15)

**Decision.** Two rules for `tools/personal/check.mjs`, and one amendment to
D192's shape check:

1. **A prepared body's limbs are judged against the `agent`'s**
   (`tools/personal/lib.mjs`'s `judgeLimbs`). A `bones.json` that swaps the
   forearm and the hand — on both sides, or on one — passed D192's check with
   exit 0: the rotations hold by construction, the weight still lands on 22
   joints, the sides are right, `--pose t` turns each arm link onto the agent's
   direction whatever it pointed at (a 177.5° turn for the swapped forearm), and
   the bounds test cannot see a fold because the arm gets SHORTER. Each LINK of a
   chain — the spine `pelvis → spine_01 → spine_02 → spine_03 → neck_01 → Head`,
   each arm `upperarm → lowerarm → hand`, each leg `thigh → calf → foot` — is now
   judged at rest:
   - **direction**: child joint − joint within **25°** of the agent's for the
     limbs and **45°** for the spine and the neck (whose joints each convention
     spaces and bends its own way: Doom's `neck_01 → Head` is 36.2°). A link with
     a synthesised end is not judged. The arm links pass by construction under
     `--pose t` and are measured under `--pose none`; the output says which;
   - **length**: a limb's second link over its first (the forearm over the upper
     arm, the calf over the thigh) within **1/1.6–1.6×** the agent's same
     proportion. A swap makes one link span two bones and the next run back over
     one: the forearm↔hand swap reads 0.52×. The spine is not judged by length —
     its spacing is a rig convention (Doom's neck is 2.06× the agent's
     proportion, Hulk's 0.49×);
   - **flesh**: where the vertices a limb joint dominates lie along its link,
     `s` = (their centroid − the joint) · link / |link|², 0 at the joint and 1 at
     the child; wherever the agent's is at least 0.1 (it is 0.32–0.60) the model's
     must be above 0. Prepare turns the flesh WITH its joint, so a fold carries it
     behind the joint whatever the skeleton says: −0.42 for the swapped forearm;
   - **the ends**: at t = 0.5 of the attack clip both hands, both feet and the
     head move into the agent's half-space (cosine > 0), wherever the agent's
     moved at least 2% of its height.
   `judgeBody`'s shape check (D192) keeps only the links `judgeLimbs` does not
   judge — pelvis → thigh, spine_03 → clavicle, foot → ball, at 60° — so a fold
   fails once, at the tighter limit. The closing OK line lists what was judged
   and nothing else (it had said "takes our clip set … nothing exploded").
   Prepare also WARNS when a forearm turns more than 120° onto the agent's.
2. **The preview browser's HTTP cache and profile are measured, not assumed.**
   Every entry the HTTP cache keyed (the net log's `SIMPLE_CACHE_ENTRY_SET_KEY`,
   `DISK_CACHE_ENTRY_IMPL` and `DISK_CACHE_MEM_ENTRY_IMPL`) must be for
   127.0.0.1, and the profile, read before it is deleted, must hold no copy of
   `model.glb` (three 64-byte cuts of its binary chunk). The omnibox's AI-mode
   eligibility request (`www.google.com/async/folae`) keyed a `www.google.com`
   entry even though the resolver refused it, with every background-network flag
   on; `--disable-features=…,AimServerRequestOnStartupEnabled` stops it (the one
   of three candidate features that did, measured). The profile stays
   `personal/models/<slug>/.preview-profile/`, fresh for each run (D192).

Merging this lane onto `main`'s `f2c934d` also settled a conflict between two
decisions of the same day: **D201**'s rule 6 said a personal-only asset is
recorded in `tools/assets-manifest.json` as `committable: false`, which **D190**
(written first, on this branch) had rejected. D190 governs; D201's rule 6, the
root `CLAUDE.md`'s bullet and README's NON-GOALS bullet each carry a dated note
saying so.

**Rationale.** The skeptic's maps were the right test of D192's claim that a
wrong map fails, and two of three passed. A fold changes three things the
skeleton's rotations cannot hide — a link's direction where prepare does not
turn it, a limb's proportions, and which side of a joint its flesh is on — and
each is a number the `agent` body has too. The thresholds were set by
measurement: on the hero body and on the user's own Doom, Hulk and Nick Fury
downloads (all three maps correct), the limb links point within 7.7° of the
agent's, the limb proportions are 0.71–1.20×, and every limb joint's flesh lies
at 0.16–0.70 of its link; the swaps read 0.48–0.52× (or 1.85–2.08×) and −0.08 to
−0.42. The ends at attack t = 0.5 caught neither arm swap (the clip carries a
folded arm's hand the agent's way) and are kept for the legs, where the thigh↔calf
and calf↔foot swaps move the foot against the agent's (cosines −0.75, −0.07).

**Rejected.**

- **Judging the arm directions from the manifest's turns** (`pose.turnsDeg`, the
  forearm's 177.5° is a direct measure). A posed model's bent elbow is a correct
  map with a large turn; the flesh and the proportion judge the arm without
  reading prepare's own report.
- **Length ratios along the spine.** The four correct maps measured 0.49–2.06×
  the agent's spacing (Hulk's neck, Doom's), so a band that passes them is 2.1×
  wide, and the skeptic's spine_02↔spine_03 swap (2.41×, 0.40×) would clear it
  by a hair. The spine's fold is its direction — 176° for that swap, 36.2° at
  most on a correct map.
- **25° for the spine and the neck.** Doom's correct neck is 36.2°.
- **The preview profile under `var/`**, as the third round's minor proposed.
  D192 moved it out of `var/` because a profile there kept a copy of the model;
  the slug's folder keeps any copy the browser makes beside the model, and the
  profile read now proves there is none.
- **Refusing the fold in prepare.** Prepare warns; check decides (D192's rule).

---

## D194 — The personal pipeline, phase 2: our clip set BAKED into the model, one primitive per paint (an atlas where the UVs allow), the joints and the vertices read in one pose, and the verdict written beside the model

*Branch `personal-tier-2` (worktree `mtg-table-t2p2`, off `main`'s `096c952`). The
lane's reserved range is D194–D199; the numbers are final (D200).*

**2026-09-28** (`docs/evidence/personal-tier.md` §16–§17; the manual is
`docs/guides/personal-tier.md`)

**Decision.** Five changes to `tools/personal/`, each measured on the user's
eight downloads:

1. **`prepare.mjs` bakes OUR clip set into `model.glb`** — every clip
   `models.json` gives the `agent` (the twelve: idle, summon, attack, block, hit,
   die, grow, shrink, channel, the kneel, pistolDraw, radioCall), carried onto
   the rebuilt skeleton with `retarget.mjs` at 24 fps and written as the file's
   own animations, named by key; the source's own takes are dropped (named in the
   manifest). The check the lane was asked to make first: a prepared skeleton
   has OUR names in the `agent`'s bind rotations (local rotations equal to
   0.03° on Doom), so `figures.glb`'s rotation tracks WOULD bind directly — but
   its pelvis track is absolute, the agent's hip (local 0.91 m, 8 cm forward)
   and not Doom's (1.01 m), so a figure bound to the agent's clips stands 10 cm
   into the table. Baking with the retarget's hip scaling fixes that once, and
   the arena needs no retarget path of its own. `check.mjs` step 2c holds the
   baked clips to the retarget it runs (worst joint 0.72°, pelvis 0.3 mm on
   Doom — meshopt's quantisation).
2. **One primitive per PAINT** (the "paint step", only when the model carries a
   base-colour texture). Parts are grouped by base-colour texture, factor and
   cutout; every group whose UVs sit inside one unit tile goes into ONE atlas
   (512 px tiles, an 8 px gutter of copied edge, a 1024–2048 px sheet, each factor
   multiplied in, an untextured part a swatch of its factor); a group whose UVs
   wrap keeps its own texture; each paint's parts are merged into one primitive
   `paint-<n>` with base colour only, their vertex ranges recorded
   (`manifest.paint`, which `check.mjs` follows a rule-skinned cloak through).
   A tile is one unit square give or take 1% (Coulson's suit reaches v 1.0005).
   Coulson's eighteen parts are ONE draw call (a twelve-tile atlas), Doom's eight
   two (his tunic's UVs wrap to 1.87 on a repeating texture), the others one.
   The normal maps and tangents go: the arena draws base colour only (D196). This
   amends D191's rule 7 ("base colour and normal kept").
3. **`--joints bind|rest`**: the joints AND the vertices are read in ONE pose —
   at the skin's bind (the default; every joint's `K` the reference one) or at the
   file's rest (its nodes as they stand). Phase 1 read the vertices at rest and
   the joints at bind, which is the same file when rest IS bind (Doom, spread
   3.1 × 10⁻⁵) and a mismatch when it is not: Peggy's backwards foot and the fan
   Wasp's folded forearms (evidence §15's calibration) were that, and pass with
   `--joints bind`; Coulson's Character Creator export reads right only at
   `--joints rest` (its bind matrices read back 88.8° / −75.6°).
4. **Two fallbacks the downloads needed**: a spec/gloss material (Character
   Creator) has its diffuse read as base colour; and a part the simplifier stops
   short on (a game export whose every triangle carries its own normals — Hulk's
   41,060 vertices for 12,292 positions) is WELDED on position and UV, its
   normals averaged, and simplified again.
5. **The verdict is written down.** `check.mjs` writes `check.json` beside the
   model — pass or fail, the failures, what was judged and the sha256 of the
   `model.glb` it judged — and the manifest is VERSION 2 (it names the baked
   clips). A manifest may carry `disabled` (true, or the reason as a sentence),
   and a seat may be named by its duelist look (`villain`, `director` — D99).

**Rationale.** Phase 2's loader should be a plain load of a file that already
speaks the arena's rig, clips and draw-call budget (D191's argument, carried to
the clips and the materials); every change is in the tool that runs once per
model, never in the game. The verdict file lets the dev route refuse a model
that failed, or changed since it passed, without re-running the check.

**Rejected.**

- **Binding `figures.glb`'s agent clips to a personal model directly.** The
  rotations match by construction; the hip does not (1 above).
- **A runtime retarget in the arena** (a second retarget path, per figure, per
  load). The build and `retarget.mjs` are the only retargets (D191).
- **An atlas for every paint.** A wrapping UV (a tiling tunic) cannot live in
  a tile; clamping it would stretch the texture.
- **Merging parts at runtime** (by map, at load). The draw-call cost would be the
  same, and the Node-side check would not see what the arena draws.
- **Keeping the normal maps.** Nothing reads them: the comic look shades from
  the vertex normals and a uniform key (D138).

---

## D195 — The loader: a dev-server index of the models that PASSED, THE lookup by face-up name where `figurePose` already places a named figure, a dressed pose, and a seat's duelist in its model — under a measured cap

*Branch `personal-tier-2`; the lane's reserved range D194–D199.*

**2026-09-28** (`docs/evidence/personal-tier.md` §17)

**Decision.**

1. **The route is the dev server's alone** (D92's rule, D190): `web/src/personal/
   devRoute.ts`, mounted in `vite.config.ts`'s `configureServer` and nowhere
   else, builds an INDEX once at start from every `personal/models/*/manifest.json`
   and serves it (`/personal/index.json`) and each ACTIVE model's `model.glb` and
   `manifest.json` — nothing else in the folder, every answer `no-store`. A model
   is active when its manifest is version 2, it is not `disabled`, and
   `check.json` says `check.mjs` passed the very `model.glb` on disk (its sha256);
   every other model is skipped with its reason, printed at start. When two active
   models dress one card or seat, the first slug keeps it and the other is
   "shadowed". `MTG_TABLE_PERSONAL=off` starts a dev server without it. The arena
   names the route only behind `import.meta.env.DEV`, so a build carries no
   address of it (`personal.test.ts` greps `dist`).
2. **One reader, one lookup, one dressing** (`web/src/arena/personal.ts`, pure).
   `personalOverlayOf` reads the index — opaque ids (`p0`, `p1`: never a slug),
   a same-origin relative `.glb` path or nothing, the caps. `personalChoicesOf` is
   THE lookup and hard rule 8's renderer half for this tier: a figure may wear a
   personal model only if `figurePose` placed a NAMED figure (a model, not the
   anonymous figure, not a swarm, not a silhouette) on a placement drawn face up
   that is not a redacted stub — all decided before the name is read — and then
   by its exact face-up name. Over the whole corpus made HOSTILE (every back and
   stub given a name, and the hostile placements under the plain poses), the
   overlay is asked about no concealed name; the same lookup with its gates
   removed is asked about 13,119, and removing either gate by hand fails the
   sweep (the negative controls).
   `dressPoses` makes a choice a pose once its model has LOADED: the opaque id, no
   props, no costume, no hair (the model brings its own; ours are not added), and
   the height refitted to the model's own widest resting width, so the width
   clamp stays strict (D65). Everything else is ours: the stand point, the
   stance, the kneel, the sick translucency, the departure, every offset.
3. **The scene**: `scene/personalModels.ts` loads the index and the wanted
   models through `scene/models.ts`'s `loadPersonalModel` — three's `GLTFLoader`
   and `MeshoptDecoder`, never drei — building the base and its resting-pose
   variants from the baked clips; `FigureLayer`'s one change is the model-source
   choice (`modelOf`: a dressed pose's personal model, else the CC0 library's), for
   the living figure and the departing body alike. `DuelistLayer` builds a seat's
   duelist from a model that dresses the seat (`opp` — the villain's look — or
   `you`): its own props in it, ours not baked in, the gestures on our clip lane
   from the baked clips, the stance rules unchanged. A load that fails, a 404 or
   a withheld model is the CC0 figure. `?personal=0` draws the CC0 figures (the
   A/B), and the workshop has a personal/repo toggle.
4. **The budget** (`arena/perf.ts`): a model over `PERSONAL_TRI_CAP` = 8,000
   triangles or `PERSONAL_CALL_CAP` = 2 paints is never loaded; at most
   `PERSONAL_MAX_FIGURES` = 4 creatures are dressed at once, in placement order,
   plus the two duelists. Measured at `g1`@316 with Doom as the villain and Peggy
   and the MCU Wasp dressed (+12,236 triangles, −5 draw calls: a dressed figure
   sheds its props): the GTX 1080's p95 is unchanged (0.6 ms bloom off, 1.5 ms on);
   SwiftShader's p50 rises about 2.6 ms (16.2–16.6 → 19.0) and its p95 by about 1 ms, the
   CC0 table already outside §9.4 there. The triangles pass report 13 §8.2's
   30,000 line with the first personal model — the table had no headroom — so the
   cap is the machine's (the tier runs on the user's own dev server, never in a
   build), and a floor rung that sheds personal models is a follow-up.
   *(Fix pass 1, 2026-09-29: the verifier measured that these caps allowed far
   more than was benched — up to six models at 8,000, about 66,000 triangles on
   the table. **D197** replaces "the cap is the machine's" with a numbered line,
   a SUM the lookup enforces, and benches its worst case.)*

**Rationale.** A personal model is a statement about what a card is (D190), so
the one decision about it is made in one pure function, gated like the art
palette (D160), before any name is read, and tested over the corpus with a
hostile overlay. Keeping the choice out of `figurePose` and the cue layer means
no id, slug or file name can reach an op log, a label or the wire: the cue layer
never sees a personal id, and a dressed pose carries only the opaque one.

**Rejected.**

- **Choosing the model in `figurePose`.** The pose would carry a model choice for
  a file that may never load; dressing only a LOADED model keeps a failure the
  CC0 figure with its props.
- **Keying the lookup by the card's id, or letting a face-down card's owner see
  it.** The wire's name, face up, is the only public fact that says who a card is.
- **Adding our props to a personal model.** The model is the character; a coat
  or a hair prop anchored at the agent's joints would float off it.
- **A `fetch` in the arena.** The index is loaded like a model (three's
  `FileLoader`), once a page, behind the DEV gate — never a poll.

---

## D196 — A personal model paints in its OWN colours (the hologram tints its values), its paints are one figure's materials; the workshop wears it, badges it, toggles it and INSPECTS it against its card's art; the catalog takes a never-seen card's facts from the engine's script

*Branch `personal-tier-2`; the lane's reserved range D194–D199.*

**2026-09-28** (`docs/evidence/personal-tier.md` §17)

**Decision.**

1. **Own colours** (amending D144 for the personal tier): `uPaintOwn` 1 makes
   the comic look paint a personal model's texture as it is — the card's colour
   stays in the rim, never multiplied into a face — and the hologram tint the
   texture's VALUES with the palette (`?look=holo` draws a tinted hologram of the
   model); `USE_PAINT_CUTOFF` discards a texel under 0.5 alpha (Coulson's hair
   cards). D144's palette × map is unchanged for any other map (`uPaintOwn` 0).
   *(Fix pass 1, 2026-09-29: "as it is" did not hold — the comic look's "black is
   blue" still mixed Doom's dark texels toward navy. **D198** is the fix.)*
2. **A model of two paints is one figure** (`dressFigureMeshes`): the first
   material is the figure's own — the one its rig holds and the frame loop writes
   — and each other paint a SIBLING whose uniforms are the first one's uniform
   OBJECTS but for its map, so every per-frame write reaches all of them;
   `applyLook` marks the siblings (D146) and disposing the first disposes them. A
   committed body (no map) still gets one material on every mesh.
3. **The workshop**: a *personal* badge in the list on a card an active model
   dresses (face up only), the pedestal dressed exactly as the arena dresses, a
   *personal / repo* toggle, and an **INSPECT** view — the card's art box enlarged
   as a backdrop behind the figure and its frame and text, the art box cut out, as
   a panel floating beside it, the camera framing all three (`framing.ts`'s
   `inspectLayout`). Flat: the depth relief of the painting is the follow-up. The
   inspect view is the workshop's SECOND card-image surface outside `CardPlane`
   (web/CLAUDE.md M4 convention 2): the same `normal` image `CardPlane` draws for
   the card (one texture), looked up face up only.
4. **Engine facts** (amending D104's corpus-only rule): a deck card the committed
   corpus never showed face up takes its facts from the ENGINE's own card script
   (`Types:`, `ManaCost:`, `PT:` in `res/cardsfolder/cardsfolder.zip`, formatted as
   the wire formats them) and is named in the catalog's `engine` list. Doctor
   Doom and the Hulks had never been face up in a recording, so the pedestal could
   not stand them; 94 deck cards gained facts, 24 (Reality Fracture cards the
   pinned engine lacks, D109) stay missing. The drift test uses the committed
   engine facts (hermetic, CI has no engine) and re-reads the scripts wherever
   the engine's resources are.

**Rationale.** A personal model's texture IS the character. D144's palette ×
map would multiply the card's colour identity into every texel — Doom is
{4}{B}{B}, so his green hood and steel would go to near-black — where the comic
look already carries the card's colour in its rim. Sharing uniform objects is how the comic block already reaches every figure
(D145), so the frame loop still writes one material per figure. The engine is
where the wire's facts come from; a script read offline is the same fact a
recording would have shown.

**Rejected.**

- **One material per paint, each written by the frame loop.** A second write per
  figure per frame, and a rig that holds a list.
- **The inspect art as a second `CardPlane`.** `CardPlane` is a card on the table;
  the backdrop is a crop of its image, drawn from the same texture.
- **Recording a game with Doom and the Hulks into `fixtures/games/`.** Every
  corpus-pinned number in the suite would move for four cards' facts.

---

## D197 — The personal tier has a triangle line of its own: at most 36,000 personal triangles on the table, a sum the lookup spends, the duelists first — benched at its worst case

*Branch `personal-tier-2`; the lane's reserved range D194–D199.*

**2026-09-29** (fix pass 1; `docs/evidence/personal-tier.md` §18)

**Decision.**

1. **Report 13 §8.2's 30,000 triangles stays the REPOSITORY tier's line** — the
   CC0 table, the build, what anyone else can run (`tools/assets-manifest.json`'s
   `budget.triangles`, D161). The personal tier never ships (D190, D195), so it
   has a line of its own ON TOP of it: `arena/perf.ts`'s
   **`PERSONAL_TABLE_TRIS` = 36,000**, the most personal triangles on the table at
   once — both duelists' models and every dressed creature's, summed.
2. **The line is a SUM, and the lookup spends it.** `personalChoicesOf` starts
   from `PERSONAL_TABLE_TRIS` less what the seats' models cost (`seatTriangles`:
   each seat draws its own instance), then walks the creatures in placement order:
   a creature whose model would cross what is left keeps its CC0 figure, and a
   smaller model later in the order may still fit. The per-model caps
   (`PERSONAL_TRI_CAP` 8,000, `PERSONAL_CALL_CAP` 2) and the count
   (`PERSONAL_MAX_FIGURES` 4) stay. So the worst case is the line itself — two
   duelists and four creatures at 6,000, or two and two at the 8,000 cap — never
   the product of the caps (six at 8,000, which the verifier put at ~66,000 on
   the table).
3. **The dev route applies the per-model caps too**, so the lines it prints at
   start are what the arena will draw: an over-cap model is listed as skipped,
   with why, and shadows no other model's card or seat.
4. **`tools/arena-bench.mjs` checks triangles** (it printed them and checked
   only draw calls): a frame over §8.2's 30,000 fails; `--personal` moves the line
   to 30,000 + `PERSONAL_TABLE_TRIS` for a page that draws personal models.
5. **The worst case, measured** at `g1`@316, bloom off, from the dev server with
   a scratch tier (`MTG_TABLE_PERSONAL_DIR`, gitignored and deleted after) of
   seven copies of Doom's model — 5,996 triangles and two paints each, the worst
   in triangles and in calls at once — six of them drawn: both seats and four
   face-up creatures, the fifth creature stopped by the count (35,976 of 36,000;
   12 painted meshes, counted in the scene): **GTX 1080: 90 calls, 50,225
   triangles, p50 0.4–0.5 ms, p95 0.6 ms, max 11.0–13.0 ms**, against the CC0
   table's 86 / 26,315 / 0.6 / 10.5–12.4 in the same session; **SwiftShader (the
   governor at dpr 0.6): 95 calls, 53,407 triangles, p50 20.5–20.7, p95
   27.2–27.6, max 50.6–53.4**, against 88 / 29,517 / 16.3–16.8 / 33.9–34.6 /
   35.7–82.7. The GPU does not notice; the software floor's median is about 4 ms
   slower, and it fails §9.4 with or without the tier. The worst case also passes
   §8.2's 90-call line by five on SwiftShader (a two-paint model is one call more
   than the body it replaces); §9.1's 120 holds.

**Rationale.** The phase-2 caps bounded each model and the count but not their
product, and the bench had measured three models of 6,000 — so "the table
affords it" was a claim about a case nobody had drawn. A sum is the one number
that bounds what reaches the GPU, and spending it in the lookup (the one place a
card is dressed) keeps "degrade, don't stutter" (report 09 §9.2 rule 9): past
the line a figure is simply the CC0 one. 36,000 is the user's "the two duelists
plus a handful of creatures" at the models they have (all six active ones are
5,993–7,992 triangles).

**Rejected.**

- **Fitting the personal tier under §8.2's 30,000.** The CC0 table at @316 is
  already 26,315 — no model would ever load.
- **Lowering the caps until their product fits.** It would refuse the models the
  user has (Coulson is 7,992) to guard a case that a sum guards exactly.
- **A floor rung that sheds personal models at runtime.** Still a follow-up: the
  GPU the tier runs on has headroom, and a sum is a guarantee a rung is not.

---

## D198 — A personal model's paint is EXPOSED by prepare and never blued by the comic look: one gain in linear light for a surface too dark to read unlit, and a dark own texel lifted with its hue kept

*Branch `personal-tier-2`; the lane's reserved range D194–D199.*

**2026-09-29** (fix pass 1; `docs/evidence/personal-tier.md` §18)

**Decision.**

1. **The comic look never blues a model's own paint** (amending D196 §1).
   `figureMaterial.ts`'s `comicPaintOwn` replaces `comicPaint` where `uPaintOwn`
   is 1: saturated and capped as the palette is, but a texel darker than
   `COMIC.blackAt` (0.045, linear luminance) is lifted in value from
   `COMIC.ownFloor` (0.02 — the black-is-blue paint's own value is 0.029) up to
   `blackAt`, in order, with ITS OWN HUE; a texel with no measurable hue lifts to a
   neutral. So Doom's dark-green tunic stays green and his near-black steel reads
   grey, where "black is blue" had made them navy and lavender. The bands, the
   halftone, the dark paint's lifted lit band (hue-kept already), the ink and the
   rim in the card's colour are unchanged; D137's rule for the CC0 palette is
   unchanged.
2. **`prepare.mjs` exposes the paint** (a new step before meshopt). The arena draws
   a personal model UNLIT, so its base colour is what the table shows, and a
   texture authored for a lit PBR renderer can be far too dark for that: Doom's
   surface is 85% under linear luminance 0.02 (p50 0.0066, p90 0.0267). prepare
   measures the painted surface — area-weighted, four samples a triangle, a
   cutout's discarded texels left out — and with `--exposure auto` (the default)
   multiplies every paint's texels by ONE gain in linear light when the 90th
   percentile is under 0.2 (`EXPOSURE_TARGET`), at most ×8 (`EXPOSURE_MAX`); a
   texel a channel of which would pass 1 is scaled down as a whole, so its hue
   holds. One gain for the model, so its paints keep their values relative to
   each other. `--exposure off` keeps the texture as it came; a number is the gain.
   The manifest records the surface's p10/p50/p90 before and after and the gain
   (`paint.exposure`), and the dev server prints each model's gain at start — and
   says "prepare it again" for a model prepared before this step.
3. On the eight downloads: Doom ×7.49 (p90 0.0267 → 0.2006), Peggy ×1.35, Doom v2
   ×1.72; the Hulk, Fury, Coulson and both Wasps are kept (p90 0.20–0.80). All
   eight pass `check.mjs` again on their new `model.glb`.

**Rationale.** D196 said a personal model paints "in its own colours", and the
verifier showed it did not: the black-is-blue mix and a texture far darker than
an unlit look can show both pushed Doom toward a blue knight with a green hood.
Two causes, two fixes, each where it belongs: the exposure is a fact about the
FILE (measured once, recorded, reproducible, no runtime cost, no new uniform),
and the hue-kept lift is a rule of the LOOK (a model's black is its own, not the
palette's navy). Lifting only the darks in the shader could not have fixed Doom —
with 85% of his surface under 0.02 the whole figure would have been compressed
into the lift's narrow band and lost its texture.

**Rejected.**

- **`blackAt` scaled down for own paints.** It shrinks the blue, it does not
  remove it, and Doom's surface is almost all below any usable threshold.
- **An exposure uniform per model, from the manifest through the index.** Four
  files of plumbing and a per-paint uniform for a number that never changes at
  runtime; baking it is the same arithmetic on the same 8-bit texels.
- **Auto-exposing to a mean or a median.** A black suit (Coulson's p50 is 0) would
  be pushed up to grey; the 90th percentile asks only whether the model's
  BRIGHTEST surfaces read, and leaves a dark costume dark.

---

## D200 — A decision's number is final: a lane keeps the block it reserves, gaps are allowed, and no document states a total

*Branch `docs-block`; the lane's reserved range D200–D204.*

**2026-09-28** (the owner's decision on the structure review of `main`; CLAUDE.md
*Decision numbers* is the rule in short)

**Decision.**

1. **A decision's number is final the moment it is written.** No merge, rebase or
   clean-up renumbers one.
2. **A lane reserves a block of numbers before it starts** — this lane's is
   D200–D204 — writes its decisions inside it, in order, and keeps them when it
   merges, whatever landed first. A number it does not use stays unused.
3. **Gaps between blocks are allowed.** `DECISIONS.md` is in number order, and a
   number says nothing about how many decisions there are.
4. **No document states a total.** `CLAUDE.md`, `README.md`, `PLAN.md` and this
   file point at `DECISIONS.md` and name the most recent block instead of
   counting.
5. The notes on older entries that say a decision was *written as* one number and
   renumbered at a merge stay, as history from before this rule.

**Rationale.** Eleven lanes renumbered their decisions at a merge: five because
another lane had landed the same numbers first (match setup's D102–D105, the
hardening pass's D109–D111, more villains' D109–D110, spectating's D109–D113 and
the narrator's D109), and six to close the gap in front of a reserved block
(D150–D154 → D124–D128, D160–D166 → D129–D135, D170 → D136, D120–D129 →
D137–D146, D130–D138 → D147–D155, D140–D149 → D156–D165). Each was a pass over
every file the lane had written; Lane BODIES' was 308 citations in 29 files,
chosen line by line with `git blame`, because Lanes LOOK and MOTION had used the
same numbers for different decisions on their own lines. A renumbering that misses
one citation leaves it pointing at someone else's decision, and nothing fails.
The total was restated, in words, in four files and changed
with every merge, so every pair of parallel lanes conflicted on it. The guards
lane already kept its block (D180–D183) with a gap after D165; this makes that the
rule.

**Rejected.** Renumbering contiguously at merge (the cost and the silent risk
above). One counter every lane takes numbers from as it writes (lanes in separate
worktrees cannot share one without the conflicts this removes). Naming decisions
by lane instead of by number (every citation in the repo is a number, and
`tools/lint-bridge.sh`'s hop tags need a `D<n>` heading, D181).

---

## D201 — Claude commits on branches and merges to `main` when the full gate is green; the user owns pushes beyond that, releases and anything public

*Branch `docs-block`; the lane's reserved range D200–D204.*

**2026-09-28** (the owner's wording; it replaces CLAUDE.md's *The user commits*,
which D103 cites as it then stood)

**Decision.** Claude commits on branches and merges to `main` when the full gate
is green; the user owns pushes beyond that, releases and anything public. The
standing rules that go with it:

1. **A branch per lane, in a worktree of its own.** The main checkout is touched
   only to add one.
2. **A skeptic before a merge** — an independent review of the lane's diff and its
   evidence, whose findings are fixed or written down as follow-ups before `main`
   moves.
3. **The full gate on every merge**: `./tools/check-all.sh`, green, from a deleted
   `bridge/out`, on the merged tree, with its line in the merge commit's message.
   A green CI run is a subset of that and never a substitute.
4. **Never push a lane.** Pushes, tags, releases, pull requests and anything public
   or shared are the user's.
5. **`~/forge` and `~/.forge` are never written** (D110.4).
6. **The personal tier is never committed**: Tier 3's likeness models and anything
   else that is personal-only stay local and gitignored, recorded in
   `tools/assets-manifest.json` as `committable: false` (none is yet). The
   rule is report 13 §13 question 2's, restated in PLAN.md's *Tier 3 — a note, not
   a plan*; D54 is the separate rule that every committed asset is CC0.
   *(2026-09-28, when the personal tier merged: the `committable: false` record
   is superseded by D190, which rejected it — a personal model's provenance lives
   in its own gitignored folder; see D193.)*

**Rationale.** *The user commits* had stopped describing the practice: every lane
since M7's slices committed on its own branch, with the session's co-author line,
and was merged by a session after a review and a green gate (`git log` from
`4f84613` on). A rule every lane was told to break is worse than one that says
what is done. The two things the old rule protected are kept: nothing leaves the
machine without the owner (the push is theirs), and nothing lands on `main`
unchecked (the gate is the merge's condition, and a skeptic reads the diff first).

**Rejected.** Keeping *The user commits* (it contradicted every recent lane).
Letting a lane push its branch as a backup (anything that leaves the machine is
the owner's call). Merging on a green CI run alone (CI runs the gate's
engine-free half; nothing there plays a game).

---

## D202 — CI downloads the pinned engine: the one exception to "this repo never downloads an engine"

*Branch `docs-block`; the lane's reserved range D200–D204. Supersedes one clause:
CLAUDE.md's Environment said "This repo never downloads, copies or commits an
engine (D2)". D2's decision itself — compile and run against the installed fat
jar, no source build, no vendoring — and D110's pin are unchanged.*

**2026-09-28** (records what `.github/workflows/checks.yml` has done since CI
landed in `249697e`)

**Decision.** Exactly one place downloads a Forge engine: CI's `bridge` job. It
fetches `forge-installer-2.0.14.tar.bz2` (301,832,993 bytes) from Forge's tagged
`forge-2.0.14` release — an official release, never `daily-snapshots` (D109,
D110.1) — checks it against the asset's sha256 written in the workflow (the digest
GitHub publishes for it), extracts the jar alone, fails unless the jar's sha256 is
the pin (`3c0a7c38…8e5dd9`, D110.2), and hands it to the scripts as `FORGE_JAR`
(hard rule 9; `config.json` untouched). Only the jar is cached, in the Actions
cache under a key naming the asset and both digests — never in git, never as a
build artifact. Everywhere else the rule stands: on a developer's machine the
engine is the user's own install, nothing in `tools/`, `scripts/`, `bridge/` or
`web/` downloads, copies or commits one, and `*.jar` stays gitignored. A new
engine is still D110's hand-written, reviewed change (report 14 §0); CI fetching
it would be one line of that change, never an update of its own.

**Rationale.** CI runs the build's engine-dependent half — javac against the jar
and the five self-tests — on a machine with no Forge install, so the jar has to
come from somewhere. The tagged release asset holds the same bytes the user
installed (the jar's sha256 is D110's pin), so CI checks exactly the engine the
repo is gated against, and fetching it by URL and digest with a sha256 assertion
is D110.5 ("records where the bytes came from") in executable form. The
Environment's clause predates CI and paraphrased D2, which rejects vendoring the
jar and building Forge from source, not a verified download; left as it was, it
said something false about the repo.

**Rejected.** Committing the jar, or attaching it to a release of this repo (D2:
GPL redistribution obligations and 39 MB in git). A source build in CI (D2).
Fetching the daily build or a "latest" URL (D109, D110). Running only the lint in
CI, without the jar (javac and the self-tests are the half of the build a Java
change is most likely to break). Extracting `res/` as well (none of the five
self-tests reads it; the workflow says to extract it the day one does).

---

## D210 — The status layer: a creature's keywords, bar, pips and marks as a POSE on both renderers, its keywords on the wire as `Keyword` constants (amendment M49)

*Branch `status-layer`; the lane's reserved range D210–D219.*

**2026-09-28** (the owner's idea, with a Final Fantasy XIII screenshot: watching
a game should read like a turn-based RPG)

**Decision.**

1. **Each creature carries a small status strip**: its keyword abilities as icons
   (the evergreen fourteen — flying, haste, vigilance, first strike, double
   strike, lifelink, deathtouch, trample, hexproof, indestructible, menace, reach,
   defender, flash — each with a glyph of its own, and every other keyword as one
   generic "ability" glyph, named in a tooltip on the board), a bar of what is left
   of its toughness (D211), a pip per counter and a mark per attachment. The board
   draws the icons and the bar on `CardTile`; the arena draws the whole strip above
   the figure (D212). The phase strip becomes a **turn-order bar** in the arena:
   the eleven phases a turn gives priority in, the active one lit in the turn
   player's colour, the seat's stops marked.
2. **Everything on it is a POSE** (report 13 §1.3): a function of one card on one
   frame, never remembered, so a skip, a scrub, a `resync` and a new `gameId` draw
   it with no history. There is no transition: the bar shows the snapshot's
   damage, and a drain that animated would be a cue with memory of the value
   before (a follow-up, not this lane).
3. **One table, two renderers.** `web/src/status.ts` — pure, no React, three or
   DOM — holds the glyph kit, the keyword mapping, the bar, the pips and the marks,
   and `cardStatus(card)` is the one decision both renderers draw from.
4. **Amendment M49 puts the keywords on the wire**: `Card.keywords: string[]`,
   written by `Snap.card`'s full branch from `CardStateView.getKeywords()` of the
   current state, **every entry a `forge.game.keyword.Keyword` constant's
   `name()`**, deduplicated, no parameter. `Keyword.UNDEFINED` is omitted: the
   census of fourteen recordings over every deck found one such keyword, engine
   script (`ETBReplacement:Other:ChooseColor`) with an empty `title()`, so no
   display string is ever emitted and hard rule 8's one-string-function rule is not
   touched. **`[]` on every face-down card**, in both branches of gate 2, like its
   name (433 face-down instances in the census exposed none; forced, not trusted);
   never on a stub.
5. **Hard rule 8, three locks.** The bridge writes `[]` / nothing; the one reader,
   `protocol.ts`'s `keywordsOf`, answers `[]` for a stub, a face-down card and an
   absent key alike; and `cardStatus` answers `null` for both concealed shapes, so
   a concealed card has no strip on either renderer. A hostile copy of the whole
   corpus with EVERY card handed keywords is the test (`status.test.ts`,
   `render.test.tsx`), and a layout with the gates removed is its negative control.
6. **Optional on the wire, all or none per file.** Every committed recording
   predates M49 and none is re-recorded for it. `tools/check-redaction.mjs` holds a
   file to "no full card carries the key, or every one does" (M6's all-or-nothing
   rule is about a block of seat-answered keys and does not apply to one key);
   `tools/wire-drift.mjs` and `tools/fixture-multiset-diff.mjs` compare a fresh
   recording against a committed file that predates the key with the key removed
   from the fresh side, and say so.
7. **The turn-order bar changes no behaviour.** It reads `state.phase`,
   `activePlayer` and, through `phaseStopsOf`, `players[].phaseStops` — what the
   board's strip reads — and a click on a stop sends the same `act: setPhaseStop`,
   live only at a seat with no question open and before `over`. `UNTAP` and
   `CLEANUP` are named in its header when the game is in one (the board's strip
   keeps all thirteen rows).

**Rationale.** The engine knows every keyword a creature has right now, anthems and
losses included; the client knew none of them, and the only way to show one was to
read card text, which is a rules computation the client may not make. A closed
vocabulary of enum constants is the smallest wire change that can carry them and
the only one a checker can hold mechanically: a card name cannot match
`^[A-Z][A-Z0-9_]*$`. The strip is the owner's reading of the table and adds no
decision: every glyph is a constant looked up, every bar two wire numbers.

**Rejected.** The keyword's display string (`Flying`, `Ward {2}`): an engine
string on the wire, through a second path. Parameters (Ward's cost, Protection's
quality): not needed for an icon, and a colour or a type in Protection's could one
day name something. Keywords read off the card's rules text in the client (a rules
computation). The face-down characteristic's own keywords (Ward from disguise) —
public in the rules, but a second shape for "face down" that a renderer would have
to tell apart; withheld like the name. Re-recording the committed fixtures to carry
the key (the brief forbids it, and the corpus's value as evidence is that it was
recorded when it was). A strip over the board's tile too: the tile already shows
counters and attachments; the board takes the icons and the bar only.

---

## D211 — The bar draws `toughness − damage`: a picture of two wire numbers, superseding report 10 §4.5's "never subtracted" for that one drawing

*Branch `status-layer`; the lane's reserved range D210–D219.*

**2026-09-28**

**Decision.** The status layer's bar is `max(0, toughness − damage) / toughness`,
drawn as a filled fraction with the damaged part beside it, on the board's tile and
above the arena's figure, for a face-up creature on the battlefield whose toughness
is a positive integer. Report 10 §4.5 said damage is "**never** subtracted from
`toughness` — that is a rules computation"; this draws the subtraction, with three
limits that keep it a drawing:

1. **It asserts nothing.** A bar at 0 is an empty bar, not "dead": an
   indestructible creature stands there, and the engine says when a creature dies.
   The fill's colour follows the fraction (green, amber, red) and nothing else.
2. **The numbers stay verbatim.** The P/T pill and the `−N` damage chip on the tile
   are unchanged (they step up to sit above the row), and the bar's title prints
   both numbers: `toughness 4 − damage 1 = 3`.
3. **No bar without integers.** A `*` or a `null` toughness draws none.

**Rationale.** The owner asked for an HP bar, and toughness minus marked damage is
what the engine itself hands a player as "lethal" (`Snap.lethal` →
`assign_damage.targets[].lethal` is `toughness − damage`, read on the game thread),
so the number is the engine's, not the client's. What report 10 forbade was a
client that DECIDED from the subtraction — which the bar does not do.

**Rejected.** Animating the drain (a cue that remembers the old value — a follow-up
through an offset that decays, measured against `motion.test.ts`'s pinned film).
Bars on non-creatures with printed P/T (an uncrewed Vehicle takes no damage).

---

## D212 — The arena's strip is ONE instanced mesh of pixel quads over a procedural glyph atlas: one draw call for the table, a billboard at a fixed size, above the head by measurement

*Branch `status-layer`; the lane's reserved range D210–D219.*

**2026-09-28**

**Decision.**

1. **One draw call for every strip on the table.** `scene/status.ts`'s
   `StatusField` is one `InstancedMesh` (384 quads), one `ShaderMaterial`, one
   texture: keyword icons, bars, pips and marks for both seats. Built, installed
   and committed by `FigureLayer` (once per snapshot, from `figures/status.ts`'s
   pure `statusLayout`), bound only from `DiscField.bind`, allocating nothing in
   the loop — the prop field's pattern (D78), held by the same liveness clauses.
2. **A billboard in screen pixels.** Each quad is CSS pixels from a world anchor;
   the vertex shader adds them in clip space against the viewport read as the mesh
   is drawn (`getCurrentViewport` over the pixel ratio: the canvas, the composer's
   target, or one half of the workshop's split view). An icon is 16 px from every
   view — the owner's floor is 14 at the table view, 1600 × 1000 — and four icons
   fit between two figures of the far rank (~78 px apart). It faces the lens, rides
   its card's cue offset and hover bob, and **stays upright when its figure
   kneels**, at the standing height's offset (a kneel only widens the gap).
3. **Above the head, by measurement.** The anchor is the pose's position up its
   standing height and `STATUS_LIFT` (0.07, `layout.ts`); the strip's lowest pixel
   is 8 px above that — at 4 a helmet, the flying ant's head and rider and a swarm's
   bees grazed it by up to 1.8 px; a carrier's strip goes over its island
   (`CARRIER_TOP`, 0.25 hull lengths), where on the hull's thickness it sat 12.8 px
   into the superstructure. `status.test.ts` rasterises every figure pose the corpus
   sample reaches through the table view's camera and the real `figures.glb`: the
   closest strip is 2.2 px above a head (Ant-Man's helmet); with no pixel lift it
   would be 5.8 px into one (the control).
4. **The glyphs are procedural**: 24 × 24 SVG path data in `web/src/status.ts`,
   drawn as inline SVG on the board and painted once per page into a 512 × 256
   canvas for the arena. Kenney's CC0 game-icon packs were the brief's intended
   source and were **not downloaded**: a download needs the owner's approval in
   chat and this lane ran without one. No third-party asset is in the layer;
   `tools/assets-manifest.json`'s `procedural` block records it.
5. **The measured cost, accepted.** Interleaved base/branch pairs
   (`tools/arena-bench.mjs`, bloom off, three pairs each, the counts identical
   within a side): `g1`@355 draws 87 → **88** calls on the GTX 1080 and 88 → **89**
   on SwiftShader, under the brief's 90; triangles +80 (26,539 → 26,619). At the
   bench frame `g1`@316 SwiftShader draws 90 → **91** calls — one over report 13
   §8.2's 90 line — and 29,521 → 29,613 triangles, under 30,000; frame times move
   within the pair spread (SwiftShader p95 33.5–34.6 ms base, 34.0–34.4 branch;
   the GTX 1080 0.6–0.7 both). One call is the least any status on the table can
   cost, and the line is a budget, not §9.1's cap (120); the next layer that wants
   a call at @316 needs a call given back first.

**Rationale.** A strip per figure, or per kind, would have cost 10–20 calls at the
bench frame, where the arena had none to spare. A fixed pixel size is how a status
HUD reads (the reference is an RPG's), and a world-sized icon would be 20 px at the
near rank and under 14 at the far one.

**Rejected.** drei's `<Html>` or DOM labels over the canvas (a DOM node per creature
reprojected every frame, report 09 §2.1). Troika text (an SDF re-tessellation per
change). A strip that kneels with its figure (it would dip into the figure's own
back row). Anchoring to the head JOINT each frame (reads every rig in the loop, and
a disc-only figure has none).

---

## D220 — A recording of the villain deck joins the corpus: `villain-doom-248`, chosen by census, and the three defects it found fixed rather than excused

*Branch `villain-identity`; the lane's reserved range D220–D224.*

**2026-09-29** (the brief: a bare `./scripts/play.sh` seats you against the Doom
Legion, and no committed recording played it)

**Decision.**

1. **`fixtures/games/villain-doom-248.jsonl` is committed**: `RecordMatch` (M1's
   recorder, default policy, no `--probe`, no `--match`), seat 0 =
   `decks/doom-legion.dck`, seat 1 = `decks/pacho-shield.dck`, seen from seat 0,
   seed 248, recorded on this tree — so it is the corpus's first recording on
   amendment M49's wire (every full card carries `keywords`). It passes
   `tools/check-redaction.mjs` with no flags.
2. **The seed was chosen by census**, over seeds 1–440 (440 games): as many of the
   deck's 27 names face up as possible, then as many of its fifteen identity
   subjects (fourteen creatures, the Doombot and Villain tokens) on the table.
   Seed 248 shows 26 of 27 face up (not Hidden Lair, a land) and puts twelve of
   the fifteen on the table — Doctor Doom and both his Doombots among them — ends
   with thirteen villains attacking at once, and plays Doom Reigns Supreme's
   payoff. No seed put all fifteen on the table; the five seeds with all 27 face
   up put at most ten there.
3. **It is a corpus member like any other**: every sweep that globs
   `fixtures/games/` reads it, and every number a test asserted over the corpus
   was moved to the new truth in the same change (`docs/evidence/villain-identity.md`
   §3). **Nothing compares a fresh recording to it**: steps 6 and 9b name
   `g1.jsonl` and `human-auto-42.jsonl`, both seed 42.
4. **The pinned classic film is split** (`motion.test.ts`): `PRE_LANE_FILM`
   holds the nineteen recordings it was measured over, and a recording committed
   after it carries a pin of its own (`POST_LANE_FILMS`) — the film this tree's
   engine plays over it with comic FX and on twos off, since no pre-lane engine
   ever played it.
5. **Three defects it found are fixed, not excused**:
   - **A land's two arrival events are one arrival** (the queue's rule 6): the
     `zone` event onto the battlefield and the `land` event resolved to the same
     `land.rise` for every land with no per-card row, under two selectors, and it
     rose twice as high — 138 times in eleven committed recordings (every probe
     deck's Forest, Mountain and Swamp), unnoticed because the one test that looks
     is scoped to cast-and-entered batches. `PRE_LANE_FILM` is re-derived for it
     (310,369 → 305,737 ops): the eight recordings with no doubled rise play the
     pre-lane film op for op, and the eleven with one differ, measured by playing
     both queues over every file.
   - **A wrapped rank's back row takes clicks at its card's own depth**
     (`layout.ts`'s `proxySizeOf`, read by `HitProxy`): at `PROXY_SCALE` 1.1 its
     target reached exactly the front card's centre line (`RANK_WRAP_Z` 0.55),
     and a click on the centre of a host took the card behind it.
   - **A back-row figure steps aside, a little, when every step back is covered**
     (±0.035, half the rank's gutter, so neighbours never overlap). Where even
     that finds no clear point — the host, its aura and a land cover the figure's
     whole centre column — the figure is *boxed in*, and `figure-pose.test.ts`
     tells that apart from standing on a card, prints it and holds it to its four
     frames; the layout fix is a follow-up.
6. **The crowded table's budget is its own** — **D222**. *(Corrected by the
   lane's fix pass, 2026-09-29: this item first named `@296`/`@304` as the busiest
   frames, at 114–117 calls against the base tree's 110–112. A sweep of every
   frame found the worst at `@392`/`@393`, 128–129 calls against the base tree's
   124 — over `tools/arena-bench.mjs`'s 120 as well as §8.2's 90 — and D222 is
   that measurement and what was done about it.)* `g1`'s bench frames are
   unchanged (89/88 at @355). `traits.test.ts` holds every other recording to 17
   prop kinds at once and this one to its own measured numbers.

**Rationale.** The arena's per-card data is judged against the corpus — a row is
real when a recording puts its card on the table — and the villains had no
recording. One recording, chosen by census rather than by the first seed that
finished, gives the most of the deck per file, and a game the AI actually won
with its deck's plan. A new oracle finds what the old ones could not see: all
three defects predate this lane, and two of them could show in any game against
the Doom Legion (every Swamp it played rose twice; a wide board wraps its rank).

**Rejected.** Two or more villain recordings (the brief asked for one; the
census found no seed that is all fifteen and the corpus's sweeps pay per file).
Seed 198, whose 27 of 27 face up costs five of the identity subjects on the table,
32 turns and 7.7 MB. Re-deriving `PRE_LANE_FILM` over all twenty files at once
(it would stop saying anything about the pre-lane engine). Widening the tests'
thresholds instead of fixing the three defects (each is a thing a player sees).
Moving the land rank behind a wrapped creature rank now (a layout change the
camera and duelist tests measure; this lane is identity).

---

## D221 — Villain identity is data on the shared kit: a villain rung, fifteen new rows, a MASK and a COWL added to the kit, and rows the corpus cannot reach read from their facts

*Branch `villain-identity`; the lane's reserved range D220–D224.*

**2026-09-29**

**Decision.**

1. **A Villain is a person.** `figures.json` gains `creature/subtype:villain`
   (the man's body): before it a black Human Villain had no rung at all and
   stood as a glow disc. `SUBTYPE_ORDER` still gives the Doombots the robot rung,
   Doctor Doom the scientist's and the HYDRA agents and troopers the spy's and
   the soldier's; Madame Hydra has a card row for the woman's body, and Kang the
   Conqueror and the HYDRA Troopers card rows alias `attack` to `pistolDraw`.
2. **Fifteen new `traits.json` rows** — with Aerial Doombot's, which is
   unchanged, every creature the Doom Legion names and the Doombot and Villain
   tokens — each a costume, a head, a rest pose and props from the shared kit
   (`docs/evidence/villain-identity.md` §5). Doctor Doom is the iron mask under a green hood, a green cloak
   and tunic over iron armour, hands on his hips; the drones are told apart by
   colour, eye and height; HYDRA is green and yellow.
3. **The kit grows by two shared kinds.** `mask` (a prop kind): a faceplate in the
   figure's TINT, so a row's accent stays free for its cloth and its glow —
   Doom's iron, the Kangs' blue, Crossbones' bone white. `cowl` (a hairstyle,
   drawn as `hairCowl` in the costume's hair slot): a smooth hood to the shoulders
   — Doom, the Kangs, Crossbones, the HYDRA agents, the Villain token. Neither is
   used by exactly one card. The mask is a front detail; the cowl carries its
   wearer from behind (`traits.test.ts`'s `ONE_SIDED`), and Doom's cloak and
   tunic are each other's partners.
4. **Seven `cues.json` rows**, each keyed off an event about that card: Doom's
   arrival (`fx.agents`, his beams to the `beside` anchors where the Doombots
   materialise, never to a token) and his attack; the Doombot's arrival and its
   eye's laser at the defender its attack band names; the Agents' squad lunge;
   the Troopers' and Kang the Conqueror's fire; Crossbones' charge and his own
   trigger's ring; Loki's draw trigger.
5. **A row the corpus cannot reach is named, and read off its facts.** HYDRA
   Troopers and Pharaoh Rama-Tut (milled in the villain recording) and the
   Villain token (never made) are `traits.test.ts`'s `OFF_THE_TABLE`, each with
   why; their identity is read off a pose built from the workshop catalog's facts
   (the Villain token's from Forge's token script), and the census fails the day a
   recording puts one on the table until the name leaves the list.
6. **The tests read the Doom Legion from its `.dck`**: the census's task list,
   the both-seats raster (every identity prop ≥ 48 px, one-sided details with a
   partner) and a villain costume-and-rest list; the cue file's name check reads
   both table decks and the corpus's tokens.
7. **The workshop lists the Doom Legion second**, after the deck in play, and its
   search matches every deck that names a card, so *doom legion* finds all 27.

**Rationale.** D75's rule — identity is data on shared kinds, never a model per
card — carries the villains as it carried S.H.I.E.L.D.: sixteen cards read as
themselves with two new kinds, each worn by four cards or more. The mask on the
tint and the cowl on the hair slot use colour roles the rows already have, so
Doom's iron face and green hood cost no new colour key. A villain rung in the body
ladder is the general answer (every Masters of Evil card is a Human Villain too);
the rows are the particular one.

**Amended by the fix pass (2026-09-29)**, after the verifier's reading of the
pictures and of the budget:

- **The Unliving Legionnaire wears the `mask` and the `cowl`** — a corpse-pale
  lavender face under a wine-black hood, on magenta wings, violet and crimson
  under them — where it had been a man with a crop in navy and a red sash: its
  card is a monster. Both kinds are ones the villains' table already draws for
  Doom, so the crowded table lost a kind (the crop) rather than gaining one
  (**D222**).
- **HYDRA Troopers wear the `cowl`** their note already described (a crop
  first), HYDRA's hood like the Agents'; the Troopers are one man, the Agents a
  squad.
- **Crossbones is in warm charcoal, at scale 1.14**: the comic look lifts a
  paint under its black threshold to navy (Lane LOOK, "black is blue"), and a
  navy Crossbones read as a S.H.I.E.L.D. agent; charcoal is over the threshold.
  **Madame Hydra's catsuit and cloak are charcoal**, as her card paints them —
  her hair is her green. The rest of the green (Doom, HYDRA, Loki, Strucker) is
  on their cards and stays; a first cut put Strucker in field grey, against his
  card's green coat, and was taken back.
- **The raster's one-sided cloak and tunic are Doom's alone** (`ONE_SIDED`'s
  `only`): the first rows exempted every wearer, so a future cowl-and-cloak row
  could have hidden its cloak with no reason of its own.
- The mask is now worn by five cards, the cowl by eight.

**Rejected.** A `horns` kind for Loki and a pharaoh's headdress for Rama-Tut
(each one card's; `hairLong` in gold is the headdress — the verifier asked for
Loki's horns again, and it is PLAN.md's villain-identity follow-up 8: a new kind
is a new draw call on the table D222 measures, and one card's until a second
wears it). The existing `hood` for Doom (a bucket helm over the whole face; the
villain duelist wears it, and there it is baked, not a prop kind on the table).
Doombots as humanoids in Doom's mask (the drone is the robot rung's body, and a
token that looked like Doom would read as a second Doom; the verifier read the
drones as machines, not Doom-shaped, and it stays PLAN.md's follow-up 10).
Leaving rows out for the three the corpus cannot reach (the brief is every
creature). Reusing `crop` as Doom's hood (a skullcap: the neck showed under the
cloak, and it read as hair).

---

## D222 — The villain recording's crowded table is over the bench's lines before any identity: measured at every frame, recorded with its numbers, and identity held to the fewest kinds its looks allow

*Branch `villain-identity`; the lane's reserved range D220–D224. Written by the
lane's fix pass.*

**2026-09-29** (the verifier: the lane's evidence named `villain-doom-248`@296
and @304 as its busiest frames, but the bench at `--index 388` — the frame of the
lane's own table picture — drew 128 calls and 37,264 triangles on the GTX 1080,
over `tools/arena-bench.mjs`'s hard 120 and report 13 §8.2's 30,000)

**Decision.**

1. **A recording's budget is measured at every frame, not at a guessed one.**
   The worst frame is found by a sweep of every transport index with bloom off:
   *static* (a descending scrub — every step back is a flush and snap, so each
   reading is that frame's pose with no cue running) and *played* (4× from the
   start, the worst reading per index, transients included). The bench is then
   run where the sweep says. **`arena-bench --index N` reads its counters at the
   END of its sample** — five seconds at 4× is fifty frames past N — so
   `--index 388` reads this recording's last frame, and `--index 296` reads about
   `@346`; the lane's `@296`/`@304` numbers were of those later frames, not of
   the frames they were named for.
2. **The numbers** (`docs/evidence/villain-identity.md` §6), bloom off, the base
   tree being `9dfdce4`'s web with this recording added:

   | | worst calls | worst triangles | frames over 120 calls |
   |---|---|---|---|
   | base tree, static sweep (GTX 1080 and SwiftShader) | 124 (`@392`, `@393`) | 33,149 (`@387`) | 10 |
   | the lane as verified (`1803dba`), static (GTX 1080) | 129 (`@392`, `@393`) | 37,288 | 24 |
   | this fix pass, static (GTX 1080 and SwiftShader) | 128 (`@392`, `@393`) | 37,546 | 16 |
   | this fix pass, played at 4× (GTX 1080) | 130 (`@396`, `@397`) | 37,548 | 27 |
   | base tree, played at 4× (GTX 1080) | 126 (`@396`, `@397`) | 33,151 | 12 |

   The bench itself, in interleaved pairs: `--index 388` 123 calls / 32,943
   triangles on the base tree against 127 / 37,522 (GTX 1080, twice) and 128 /
   37,524 (SwiftShader). `g1`'s frames are unchanged on both trees: 88 (GTX 1080)
   and 89 (SwiftShader) at `@355`, 91 on SwiftShader at `@316`.
3. **The breach is the table's, and it is accepted for this recording.** Its last
   turns put **49 cards on the two battlefields** (`@388`–`@392`) — the corpus's
   most crowded table; the next is `human-sideboard-7`'s 42, and `g1`'s is 35.
   With every villain a bare body it already draws 124 calls and 32,959 triangles
   at its worst frame: the bench's 120 and §8.2's 30,000 are crossed before any
   identity, by the cards, the twelve figures and the discs.
4. **Identity keeps to the fewest kinds its looks allow**, because every prop
   kind is one call on that table. The fix pass took one off: the Unliving
   Legionnaire wears the mask and the cowl the table already draws for Doom
   instead of a crop of its own (−1 call; +258 triangles, the cowl being heavier
   than the crop). What remains at the worst frame is +4 over the base tree — the
   cloak, the coat, the coat's skirt, the gauntlets, the wings, the long hair, the
   mask, the cowl and the HYDRA squad, in place of Peggy Carter's hat, shield,
   sidearm and waves and the parted hair (the dressed villains now take the
   twelve model slots, where the base tree gave four of them to Peggy, a second
   Doombot and the two Robot tokens) — and each of those carries a card on that
   table.
5. **Held by a test**: `traits.test.ts`'s `OVER_THE_LINE` holds the file to 22
   prop kinds at once (`@296`) and to **17 on its most crowded frames** (the most
   battlefield cards; the base tree has 13 there). The second number is the one
   the calls follow; negative-controlled, 16 fails it.

**Rationale.** The bench's 120 and §8.2's line were drawn for a table of the
size the corpus had: 35 battlefield cards at `g1`'s busiest. A recording whose
table is half as big again crosses both with no identity at all, so the only
honest measure of identity there is its increment over the base tree, and the
only honest place for the number is where the sweep finds it. Keeping identity's
kinds to what the look needs is the brief's rule ("prefer reusing existing
kinds"), and one kind was reusable with the look improved by it.

**Rejected.** Dropping the mask where the cowl carries the card (Doom's is his
face, and it is on the table whenever Kang's or Crossbones' is — no call saved);
dropping the squad (the Agents' identity; one call and about 2,800 triangles); the
existing `hood` for the cowl (A.I.M.'s bucket helm; not on this table, so a swap
of one kind for another); a coarser cowl (about 130 triangles an instance, a
faceted hood at the workshop's 1×, on a table over 30,000 before it); raising the
bench's 120 or §8.2's line for one recording; a crowded-table budget in the arena
now — props shed past a figure count, as `MAX_FIGURES` sheds models (PLAN.md's
villain-identity follow-up 4: an arena change, measured against every view);
taking the recording out of the corpus (it is the deck a bare `play.sh` plays).
## D225 — The relief cache: a depth map of every card's painting, made on this machine from card art, a personal-tier cache like `art.json` — gitignored, served by the dev route alone, never committed

*Branch `relief-window` (worktree `mtg-table-t2r2`, off `main`'s `9dfdce4`); the
lane's reserved range D225–D228.*

**2026-09-29** (the owner's idea: "inspect a card and the art box becomes a
window"; `docs/evidence/relief-window.md` is what was run, `docs/guides/personal-tier.md`'s
*The relief cache* the manual). *Point 2's map encoding is superseded by D227
(the same day's fix pass).*

**Decision.**

1. **A depth map per card, in the personal tier.** `tools/personal/relief.mjs`
   writes `personal/relief/<scryfall id>.png` for every card in
   `web/public/art.json` (and every card a personal model dresses) and an
   `index.json` (Scryfall id → file, size, model, device, date, the art box it
   was cut with, where the image came from, the time). It is **derived from card
   art**, so it is the personal tier's by D190's rule: `/personal/` is
   gitignored (the tier test holds the relief paths too), nothing under it is
   committed, and a picture of it stays in `var/`. It is a CACHE, like
   `art.json`: regenerated, never edited, and not needed — without it the inspect
   view is the flat picture D196 drew.
2. **The map.** Depth Anything V2 Small (`depth-anything/Depth-Anything-V2-Small-hf`)
   on the card's `normal` image cut to `framing.ts`'s `ART_BOX` — the exact
   pixels the inspect view draws, so depth and colour line up by construction —
   stored 8-bit greyscale at the crop's size (410 × 301), **near = 255**, each map
   normalised to its own 1st–99th percentile of the model's relative inverse depth
   and blurred 1.5 px (the browser's grid samples it every ~3.2 px). Eight bits
   because the browser decodes a PNG to 8-bit channels anyway and 256 steps over
   the relief are far under a pixel. **A flat image gives a flat map** (255, the
   window): the model invents a floor on a uniform grey with a painting's spread
   (raw 0.39–4.98 against Peggy's −0.48–6.51), so a crop whose luma standard
   deviation is under 2 levels is not asked.
3. **The image comes from what is already here, and a fetch is paced.** The card
   library's cache (`var/cards/images/<id>/normal.jpg`, read only) first, then the
   tool's own copy (`personal/relief/source/`), and only then one GET of
   `art.json`'s CDN URL through the card library's `ScryfallClient`
   (`config.json`'s User-Agent, logged), no more than 10 requests in any second,
   measured from the previous request's logged start with a 2 ms margin.
4. **The depth step runs in a Python venv the tool never changes.** `relief_depth.py`
   is run with a venv's own python (`--likeness <dir>`, default `var/likeness`, the
   likeness experiment's), with the hub OFFLINE (the weights must already be in
   its Hugging Face cache), bytecode off, and every other place a library could
   write — HOME, TMPDIR, the CUDA cache — pinned inside `personal/relief/.cache/`.
   The CLI writes only inside `personal/relief/` (`insideRelief`), and the step
   refuses any output not directly in its `--out-dir`.
5. **Served by the dev route alone** (D92's rule, D195's route):
   `/personal/relief/index.json`, read per request and cut down to what the page
   needs (per map its file, size and art box — never the card's name or where its
   image came from), and `/personal/relief/<id>.png` only when that index lists
   it. `source/` and `.cache/` are never served; a build names none of it.

**Rationale.** The owner wants the painting to have depth; a monocular depth
model gives a usable relief of a painting in ~35 ms (the likeness experiment's
route A measured the model on this machine), and the only honest place for
anything computed from card art is the tier that is never published. Cutting the
map from the very image the page draws is what makes the depth line up with no
registration step; keeping the map a cache keeps the repository's rule — nothing
from card art is committed — mechanical.

**Rejected.**

- **Scryfall's `art_crop` as the source.** Sharper, but a different crop of the
  painting from the one the inspect view draws (the `normal` image's art box), so
  the depth would need registering to it — or the page would need a second image
  from the CDN. The colour map stays D196's one texture; an `art_crop` colour map
  is a follow-up that would bring its own map.
- **16-bit maps.** The browser's decoder hands WebGL 8 bits.
- **Committing a map, or a picture of one, as a fixture.** The tests use a
  synthetic gradient and a flat grey they encode themselves.
- **Letting the tool download the model.** Downloads are the owner's; the tool
  says where it looked and stops.
- **The flat gate as a rescale** (e.g. multiplying the relief by the image's
  contrast). It would flatten a painting's quiet passages; the gate only stops
  the model being asked about an image that carries nothing.

---

## D226 — The inspect view's art box is a WINDOW: a 128 × 96 plane whose vertices recede along their rays from the camera's seat by the depth map, at most 0.3 of the backdrop's height, its nearest point where the flat picture stood

*Branch `relief-window`; the lane's reserved range D225–D228.*

**2026-09-29** (`docs/evidence/relief-window.md`; the pictures are in `var/relief/`).
*Points 1 (one plane) and 3 (the rubber sheet as the price) are superseded by
D227 (the same day's fix pass).*

**Decision.**

1. **One displaced plane per card, built at commit.** With the relief on and a map
   in the cache, `Pedestal.tsx`'s `InspectStage` draws the painting as ONE
   `PlaneGeometry(1, 1, 128, 96)` (`perf.ts`'s `RELIEF_GRID`: 24,576 triangles,
   one draw call — +24,574 triangles and +0 calls against the flat quad, measured
   with bloom off) with a `ShaderMaterial` built once per card when both textures
   have arrived (`useMemo`), the painting as its colour map through the art box's
   UV, the depth map fetched in the vertex shader. Nothing of it runs per frame:
   the orbit moves the camera and the parallax is the geometry's. Without a map,
   with the toolbar's *relief* off, in a build, or while the map loads, it is D196's
   flat picture.
2. **Along the RAY, not the normal — a window, not a bas-relief.** Every vertex
   starts on the flat picture's plane (the window) and goes back along its ray
   from the inspect camera's seat until it is `(1 − depth) × RELIEF_DEPTH ×
   backdrop height` behind that plane. Stated as the brief states it: the plane's
   base is pushed back by the relief and each vertex comes toward the camera by
   `depth × RELIEF_DEPTH`. From the seat the painting is the card's pixel for
   pixel and its box a rectangle; orbiting shows the depth. The first cut
   displaced along the normal, and its far content shrank toward the middle and
   the box's edge went ragged from the seat itself.
3. **`RELIEF_DEPTH` = 0.3 of the backdrop's height** (1.45 × the figure's): ~0.37
   world units for a body. At ±25° of orbit the painting's figure stands visibly
   off its background; the rubber-sheet stretch at a silhouette (Peggy's pistol,
   Fury's coat) is the price, softened by the map's 1.5 px blur.
4. **The window stands where the figure cannot reach** (`framing.ts`'s
   `INSPECT_WINDOW` = 0.8 of the figure's height behind its stand point; the flat
   backdrop's was 0.7). Measured by `workshop.test.ts` over all 66 figures the
   catalog stands: at rest the farthest anything reaches behind a stand point is
   0.598 of its height (the Air Force's swarm), in every clip but `die` 0.751 (a
   drone's attack wind-up — through the old 0.7). Since the relief only recedes
   from the window, nothing in it comes nearer the figure than the flat picture
   did; the personal models measured in the browser keep 0.26–0.53 world units
   clear. `die` falls through it (a body ~0.89 of its height backward, a drone
   ~1.46), as it fell through the flat picture — a follow-up.
5. **A flying hull is framed by its length** (`INSPECT_HULL` = 0.6): a Vehicle's
   silhouette has its thickness as its `height`, which framed the Helicarrier's
   inspect view at a quarter of its hull with the camera inside it; it is now a
   subject 0.6 hull lengths tall, its middle 0.45 of that above the floor.
6. **Unlit, no ink mark, no halftone.** The painting is drawn as it is (the flat
   picture's colour: sRGB sampled linear, three's `colorspace_fragment`). Marking
   it for the ink (D146) was measured: the interior gains almost nothing (the
   blurred map is too smooth for the depth-edge line), and what it does draw is
   the window's outer border and the creases the reconstruction makes at a
   silhouette — lines the painter never drew, tracing the relief's own artefacts,
   and at an oblique orbit the ragged profile of its edge. Halftone is a shading
   device for a lit form; the painting carries its own shading. The figure keeps
   its full ink line against the painting either way (its own mark).
7. **Hard rule 8.** `relief.ts`'s `inspectSourceOf` is the inspect view's one way
   to a card's image and so to its map: a concealed entry looks nothing up, and
   `inspectPlan` builds one backdrop for a face-up card with a figure and an image
   and none for anything else — swept over the catalog with a hostile copy (each
   concealed shape handed a name of its own) whose ids the relief index is never
   asked about, and an ungated source as the negative control.

**Rationale.** The brief is a window, and a window keeps its frame still while
what is behind it moves — which is exactly displacement along the viewing rays.
Measuring the figures' reach rather than guessing a margin is how the rest of the
arena places things (D55, D100); the old 0.7 was a guess, and a drone's wind-up
went through it.

**Rejected.**

- **Displacement along the plane's normal** (the brief's literal reading, and
  the first cut): a bas-relief whose outline changes from the seat — pictures in
  the evidence.
- **The comic ink over the painting** (point 6), and a halftone.
- **A per-frame uniform** (the eye following the orbiting camera): the painting
  would never show its depth, since every vertex would stay on its own pixel.
- **The same window on the arena's card zoom.** A follow-up, with its mount
  point in PLAN.md; the inspect view is this lane's deliverable.

---

## D227 — The relief window in two layers: the painting CUT at its silhouettes, what it hides filled in behind it, and both clipped to a window that stays still

*Branch `relief-window`; the lane's reserved range D225–D228. The fix pass after
the verifier's round 1, the same day as D225 and D226.*

**2026-09-29** (`docs/evidence/relief-window.md` §9–§12; the pictures are in
`var/relief/fix1/`)

**Supersedes in part** D226 point 1 (ONE displaced plane: now two, on one grid),
D226 point 3 (the rubber sheet at a silhouette as "the price": now cut) and D225
point 2's map encoding (8-bit greyscale, blurred 1.5 px: now 8-bit RGB with a
back image beside it, blurred 0.75 px). D225 and D226 otherwise stand.

**Decision.**

1. **Two layers on one grid** (`Pedestal.tsx`'s `InspectStage`, the one
   `PlaneGeometry(1, 1, 128, 96)` drawn twice, both materials built once per card
   at commit). The FRONT is the painting at its depth, as D226 drew it; the BACK
   stands behind it, larger by a margin, coloured by `personal/relief/<id>.back.jpg`,
   a hair further along the seat's rays (0.01 of the relief) with a polygon offset,
   so wherever the two coincide the front wins. Both use `relief.ts`'s
   `RELIEF_VERTEX` / `RELIEF_FRAGMENT`; `uLayer` picks the channel.
2. **The front is cut at a silhouette, twice.** A vertex whose depth and its four
   neighbours one grid cell away differ by more than `perf.ts`'s `RELIEF_CLIFF`
   (0.12 of the map's range) is not drawn — the triangles that stretched Fury's
   face and Peggy's pistol across the gap an orbit opens. And, pixel by pixel,
   wherever the map's red (the front's depth) stands over its blue (the
   painting's own) by more than the same number — the band the front was grown by
   (point 3). The back is never cut: it is what a cut shows.
3. **The map** (`<id>.png`, 8-bit RGB the crop's size, near = 255): **blue** the
   painting's own depth, blurred 0.75 px; **red** the front's — the near side of
   every silhouette grown 10 px past it (a grey dilation), only within 10 px of a
   STEEP jump (more than `RELIEF_CLIFF` within 2 px), so the cut cells hold the
   background's pixels and the subject keeps its edge, while a floor rising toward
   the viewer is left alone; **green** the back's — under every texel, the depth
   on the far side of its NEAREST cut (jump flooding over the cut cells), softened,
   never nearer than blue. Measured on the five picture cards: the subject's share
   of the cut cells is 32–37% ungrown, 11–21% at 6 px, 2–12% at 8–12 px, where it
   stops falling.
4. **The back image** (`<id>.back.jpg`, JPEG q95, no chroma subsampling): the
   crop, with every texel nearer than the far side of its nearest cut by more than
   `RELIEF_CLIFF` filled by push-pull from the painting's pixels just across the
   cuts (soft: what the subject hid reads as the background out of focus), except
   where the front is cut — the cells and the band keep the painting's own pixels,
   so from the seat the two layers are one picture (measured: 0.40–0.69% of the
   painting's pixels differ from the flat picture by more than 24 levels, seams
   along the cuts and the window's one-pixel outline) — and continued 0.25 of the
   crop's height past every edge by the same fill.
5. **The window clips both layers.** A fragment whose ray from the camera
   (three's `cameraPosition`) crosses the window's plane outside its rectangle is
   discarded: the rectangle stays on its plane at every orbit and the painting
   moves behind it; past an edge one sees the back layer's margin, as past a
   window's frame. (The verifier's "curled poster": the edge followed the depth
   and bowed.)
6. **A recipe, recorded per map.** `relief.mjs`'s `recipeOf` (version 2: dilation,
   blur, cliff, grid, margin) is written into every index entry; a map made with
   another — or before the back layer, or against another `RELIEF_GRID` /
   `RELIEF_CLIFF`, which the back is built to meet — is stale, the page's reader
   drops it and draws the painting flat, and the dev server's start line says how
   many. `--all` recomputes it.
7. **The cost.** +49,150 triangles and +1 draw call against the flat quad
   (D226's one layer: +24,574 and +0), measured with bloom off; the two layers
   are the inspect view's alone. 158 cards in 43.5 s on the GTX 1080 (the model
   ~30 ms a card, the back layer ~0.13 s of numpy); `personal/relief/` 30.45 MiB.
8. **`INSPECT_WINDOW` stays 0.8**, now measured densely: every distinct body,
   every clip but `die`, at 61 phases and every keyframe, every vertex (9,824
   clip phases) reaches 0.752 h at most, and `workshop.test.ts` holds the window
   0.02 clear of it.

**Rationale.** A displaced sheet has to span a silhouette with something; the
only thing that spans it without a smear is nothing, and a hole needs something
behind it. That is the layered depth image of 3D-photo work at its smallest —
two layers, a soft fill, no model beyond the depth one — and every piece of it is
measured against the flat picture from the seat, which is what the window must
never lose. Growing the near side before cutting it is what puts the cut on the
background's pixels; limiting the growth to steep jumps is what keeps a floor a
floor.

**Rejected.**

- **Growing the near side alone** (the verifier's second option): the face and
  pistol stay crisp, and the gap then streaks the background's pixels across it
  (`var/relief/fix1/fury-m25-before-vs-d6.png`, `fury-m40-before-vs-d6.png`).
- **Lowering `RELIEF_DEPTH` to 0.15–0.2** (the verifier's fallback): it shortens
  the smear by lowering the depth, which is the thing asked for.
- **A back depth of the farthest within a fixed radius** (64 px): it left the
  back layer's colour a beige average of every far pixel in the painting and put
  a tower beside a sky "behind" something (`viz-fury.png` against `viz3-*.png`).
- **Filling from every unhidden pixel**: the subject's own inner pixels (a body
  behind a fist) are unhidden, and the fill printed a dark shadow of the subject
  behind it (`L3` against `L4`, `fury-*`).
- **The per-vertex cut alone**: a jagged silhouette with a 10 px band of
  background riding on the subject (`fury-head-L3.png`, L2 against L3).
- **Growing wherever the map rises over 10 px**: a steep floor was grown and cut,
  and the back layer drew the gravel at the far side's depth — at yaw 0 Peggy's
  painting differed from the flat picture in 1.5% of its pixels, a grey smear on
  the ground (`peggy-only-diff-before-steep.png`); limited to steep jumps, 0.53%
  (`peggy-only-diff-after.png`).
- **The rim fade** (the verifier's suggestion for the edge: the depth faded to the
  window over the outer 3–5%): not built. It keeps the border on the plane, but
  the deep interior still folds past the rim at 40° and the ramp itself shows as
  a stretched reveal; the clip and the margin are a window's own behaviour.
- **OpenCV's inpainting** (it is in the likeness venv): not tried — a dependency
  the tool does not otherwise need, and push-pull's softness is what an
  out-of-focus background should look like.
- **A PNG back image**: exact, and about four times the bytes; JPEG q95 at 4:4:4
  costs seams of a few levels, which point 4 measured.

---

## D228 — The relief's back layer filled from what lies ACROSS each silhouette, mirrored; the front's cut decided per texel by the tool as a keep mask that keeps each subject's painted contour; the far side only within an orbit's reach

*Branch `relief-window`; the lane's reserved range D225–D228, its last number.
The fix pass after the verifier's round 2, the same day as D225–D227.*

**2026-09-29** (`docs/evidence/relief-window.md` §13–§16; the pictures are in
`var/relief/fix2/`)

**Supersedes in part** D227 point 2 (the pixel cut read off red against blue:
now a keep mask the tool writes), point 3 (blue the painting's own depth: now the
keep mask; green the far side everywhere: now only within reach) and point 4
(the fill by push-pull, the margin by push-pull; the cut cells kept as the
painting has them, subject pixels included). D227's two layers on one grid, its
window, its recipe and its cost stand.

**The verifier's round 2** (major): on Fury, the back layer's fill was visibly
the wrong colour at ±25° — a flat cream silhouette of his coat where it had
stood, seen through the floating frame's empty art window, and beige halos round
his painted head, pistol hand and coat edge where the painting is green and
orange; Peggy the same, milder; and at yaw 0 a thin dark seam outlining every
cut subject. (Minor: a pale band along one edge of the window at ±25° on every
card — the back layer's margin.) Push-pull averaged every pixel just across a
cut — sparks, green, the subject's own dark contour — into one soft mean, and the
cut cells kept the subject's painted edge on the BACK layer, which stayed behind
when the subject moved.

**Decision.**

1. **The front's cut is decided by the tool, texel for texel, and written as the
   map's blue: a KEEP MASK** (255 drawn, 0 cut). It is the cells the vertex test
   cuts (as D227) and the band the red was grown across, LESS the subject and its
   painted contour — every texel nearer than the far side of its nearest cut by
   more than `RELIEF_CLIFF`, grown `CONTOUR_PX` (3). The depth model's edge is
   soft over a few pixels and the painting's ink line lies in it; kept on the
   front, the line moves with the subject. The shader discards a front fragment
   where the blue, sampled linearly, is under one half (`uLayer` exempts the back),
   so the cut falls on a texel's edge.
2. **The back image keeps the painting exactly where the seat sees it** — the cut,
   grown `SEAM_PX` (1) for the texture filter's half texel — **and fills the rest
   of every subject**, contour included, so no copy of an edge stays behind.
3. **The fill is what lies across the silhouette, mirrored.** A texel to fill
   takes the painting MIRRORED across its nearest seed (the texel as far beyond
   the seed as the seed is beyond it; the seed itself where the mirror leaves the
   seeds), from seeds that stand clear of every subject by its contour and a
   guard (2 px) and — per bin of `RELIEF_CLIFF` of the texel's far-side depth —
   only seeds at that depth: behind a head the sky beside it, behind a fist the
   coat, never the subject's own interior and never a mean of every colour round
   it. Then a blur of the fill and its seeds alone (σ 1.5 px beside the
   silhouette to 4.5 px at 40 px from it) — never of a kept pixel of the subject,
   which hazed the fill beside Peggy's pistol.
4. **Only within an orbit's reach.** A subject moves over what is behind it by
   its depth over that far side × `RELIEF_DEPTH` × the crop's 301 px × the tangent
   of the orbit; `REACH_PX` (80) covers a whole range at 40° (75.8 px). Within
   that reach of a cut (plus the dilation and two cells) the back layer is the far
   side and the fill; past it, the painting at its own depth, eased over 12 px.
   Peggy's door runs off the painting's edge: past the window's frame it is now
   more door, where it was the fill of the sky behind its other edge.
5. **The margin is the painting mirrored**, from 2 px inside the edge (the art
   box's first row is the card frame's black line), blurred σ 1 px at the edge to
   4 px at the margin's end — no longer push-pull toward the painting's mean.
6. **The map's version is 3**, and the page reads no other. `perf.ts`'s
   `RELIEF_MAP_VERSION` is the page's copy and `relief.mjs`'s `RECIPE_VERSION`
   the tool's (a test holds them equal); the dev route serves a map of another
   version without its back layer, so a version-2 map — whose blue is a depth the
   shader would misread as a mask — is drawn flat until the tool runs again, and
   the dev server's start line counts them. The recipe records `contourPx`,
   `seamPx` and `reachPx`.
7. **The depth step uses scipy's exact distance transform** (in the likeness venv
   beside numpy; nothing installed): the nearest seed and the distance to a cut,
   where the jump flooding it replaces cost ~130 ms a call and the fill needs one
   per depth bin. The back layer is ~0.09 s a card; 158 cards in 40.6 s on the
   GTX 1080; `personal/relief/` 32.89 MiB.
8. **The figure and the window** (D226, D227 point 8): the window stands clear of
   every figure at rest and through every clip; DYING is the exception — the
   lethal rehearsal takes the body through the window, flat or relief (the
   verifier measured −0.137 world units for Fury). `workshop.test.ts`'s title
   says so; stepping the window back during a death is PLAN's relief follow-up 2.

**Rationale.** What an orbit uncovers behind a silhouette is a band as wide as
the parallax, right beside it, so the fill must be what lies right beside it —
continued, not averaged. Mirroring keeps the painting's own texture and colour at
the scale it was painted; the depth bins keep a subject's interior out of what it
hides; the keep mask puts the ink line with the thing it outlines. From the seat
nothing changed: the back holds the painting wherever the front is not drawn,
now to the texel.

**Rejected.**

- **OpenCV's Telea or Navier–Stokes inpainting** (the verifier's first option;
  cv2 is in the venv). Tried on Fury and Peggy with the same hole and the same
  clean rim (`personal/scratch/relief-fix2/fill-ab-mirror-telea-ns.png`, mirror |
  Telea | NS; 40–80 ms a card): both diffuse inward from EVERY known pixel round
  the hole and take no depth, so the subject's own kept interior bleeds in —
  Fury's coat spreads a dark blob into what it hides — and a large hole comes out
  one flat colour. The mirror keeps the fire's texture and the depth bins keep
  the coat out.
- **The nearest seed without a mirror**: streaks the rim's pixels straight out —
  a sparkle becomes a line.
- **The far side read off the painting's own depth** instead of the grown red
  (tried, `var/relief/fix2/c/`, `_fury-fist-abc.png`): a thin subject's cut then
  finds the background behind it (Peggy's pistol filled cleanly), but a fist
  over its own coat finds the sky too and opens a bright hole in the coat.
- **Feathering the per-pixel discard** (the verifier's second option for the
  seam): it blends the front's edge over a back layer that no longer holds the
  painting there, and a blend of two layers at different depths is a smear once
  the camera moves.
- **A smaller margin** (the verifier's second option for the band): it was the
  margin's fill that was wrong, not its width; 0.25 of the height is what 40°
  uncovers at the deepest (0.3 × 301 × tan 40° = 76 px).
- **The figures' halftone screened into the painting** — D226 rejected it by
  argument; now pictured (`var/relief/fix2/halftone/halftone-ab.png`): the dots
  grey a painting that carries its own tones (Fury's face), and a screen-space
  grid stands still while the painting slides behind it, a screen door in the
  window. The painting stays unlit and unmarked.

---

## D240 — A dressed figure is ONE draw call: prepare packs every paint into one atlas — a repeating paint laid out over the UV tiles it spans — and merges the model into one skinned primitive under one material; `PERSONAL_CALL_CAP` is 1

*Branch `arena-personal-polish` (worktree `mtg-table-t2q2`, off `main`'s
`9998ec5`). The lane's reserved range is D240–D244 (D200); it used two.*

**2026-09-29** (`docs/evidence/arena-personal-polish.md`; the manual is
`docs/guides/personal-tier.md`'s *The atlas*; PLAN.md's personal-tier follow-up
33, closed)

**Supersedes in part** D194 point 2 (one primitive per PAINT, an atlas only where
the UVs sit in one tile, a wrapping paint keeping its own texture) and D196 point
2 (a model of two paints as a primary material and a SIBLING); amends D195 point
4 and D197 (`PERSONAL_CALL_CAP` 2 → 1).

**Decision.**

1. **One primitive, one material, every model.** `tools/personal/prepare.mjs`'s
   paint step groups the parts by what they paint with (the base-colour texture,
   the factor, whether the alpha cuts) as before, and then: one group keeps its
   own texture (the factor baked into a copy; a repeating paint repeats as it
   came), untextured its factor alone; two or more are REGIONS of one atlas. Every
   part is then merged into ONE skinned primitive, `paint-0`, under ONE material
   (MASK if any region cuts — a region that does not cut has its alpha set
   opaque; double-sided if any part was), its parts' vertex ranges recorded as
   before. `model.glb` has exactly one mesh, one primitive and one material.
2. **A repeating paint is laid out over the tiles its UVs span** (`lib.mjs`'s
   `uvSpanOf`: the whole UV tiles a primitive covers, 1% either side not a wrap).
   Its region is the texture repeated that many times across and down (Doom's
   tunic, `u` to 1.87 on a repeating texture: twice side by side), each part's
   UVs are remapped from its own tile origin into the region, so the texel a
   vertex names is the one it named before — a triangle that crossed the tile
   edge crosses into the next copy, exactly as REPEAT sampling drew it. Its
   gutter is WRAPPED (`extendWith: 'repeat'`), a one-tile region's copied.
3. **The packer and the texture budget** (`lib.mjs`'s `packAtlas`, `ATLAS_MAX`
   2048, `ATLAS_GUTTER` 8). Regions at their natural size (the source texture,
   ≤ 1024 px since D191, times its span), skyline-packed bottom-left, tallest
   first; at scale 1 on the sheet of least area whose width and height are at
   most 2048 (widths in steps of 16), else every region scaled alike to the
   largest scale that fits 2048 wide — never a sheet over 2048² (16 MiB of RGBA8
   before mipmaps). What the models need: **Doom** 2048 × 2048 at ×0.984 (the
   hood 1008² and the tunic twice, 2015 × 1008 — the one sheet that needs the
   whole budget, and 1,024² of it empty, because the tunic is as wide as the
   sheet); **Coulson** 2048 × 1536 at ×0.484 (twelve 1024² paints at 496 px,
   D194's density); **the Hulks** their own 1024² (one paint, no atlas); Fury his
   own 512²; Peggy 1056 × 1568 and the MCU Wasp 1040 × 1568, both at ×1 — D194's
   fixed 512-px tiles had shrunk their 1024-px paints to 496. The manifest
   records the sheet (`paint.atlas`: size, budget, scale, gutter, and per region
   its source, factor, span, rectangle, parts and the exposure gain it carries);
   `validateManifest` refuses two primitives and a sheet over 2048.
4. **The exposure (D198) is unchanged and runs after the packing**, on the one
   texture, so its one gain reaches every source's region alike — recorded per
   region. The resample moved two measurements a little: Doom's p90 0.0267 →
   0.0258 (the atlas at ×0.984), gain ×7.491 → ×7.752; Peggy's ×1.347 → ×1.299
   (her 1024-px paint at its own size again).
5. **Every gate counts ONE.** `check.mjs` step 1 fails a `model.glb` that draws
   more than one call a figure (meshes, skinned meshes, materials and material
   groups all counted) and lists "one skinned primitive under one material" in
   what it judged; the dev route reads the primitives and materials out of the
   very `model.glb` it would serve (its glTF JSON chunk, `glbDrawsOf`) — not the
   manifest's word — and skips a model of more, or a file that is not a glTF
   binary, with "prepare it again"; `arena/perf.ts`'s `PERSONAL_CALL_CAP` is 1,
   which the dev route and `personal.ts`'s reader both hold the index to.
   `figureMaterial.ts`'s `dressFigureMeshes` is one material on every mesh — the
   SIBLING materials of D196 are gone with the second paint.
6. **Measured** (bloom off; the census reads `gl.info.render` at the exact frame
   and counts the dressed figures in the scene graph, `var/polish/census.mjs`):
   on the GTX 1080 and on SwiftShader alike, **every dressed figure costs exactly
   one call**, the villain duelist and Doom's card included. `villain-doom-248`'s
   worst frame (`@392`/`@393`, the static sweep of all 401 frames) with the tier
   on: **130 → 128 calls**, where the tier off is 128; over the whole sweep the
   tier on was over the tier off on 257 frames by up to 2 calls before, and on
   none after (equal on 259, fewer on 142 — a dressed figure sheds its props).
   `g1`@316 tier on 78 → 77 (off 83), @355 85 → 84 (off 89). The pedestal with
   Doom dressed: 13 → 12 calls.

**Rationale.** The personal tier's worst case crossed report 13 §8.2's 90-call
line by exactly its second paints (evidence §19), and the villain table — over
the bench's 120 before any identity (D222) — paid two more for Doom alone. A
figure's draw call is the one number the tier adds that no budget could spend
away: the triangles are a sum the lookup spends (D197), the calls were a product
of paints. Folding them in the tool that runs once per model keeps the arena's
loader a plain load (D194's argument): the check, the route and the reader each
count the file and refuse the rest. Repeating the wrapping texture into its
region is the only fold that draws exactly what REPEAT drew: the UV range is
kept, the image is laid out to match it.

**Rejected.**

- **Clamping or wrapping a wrapping part's UVs into one tile** (`u mod 1` per
  vertex). A triangle that crosses the tile edge would then sample the whole
  texture backwards across its face; splitting every such triangle changes the
  mesh the check judged.
- **Keeping D194's fixed 512-px tiles.** They made every paint the same size —
  Peggy's and the Wasp's 1024-px bodies drawn at 496 — and would have put Doom's
  tunic, which needs two tiles across, at a quarter of its density.
- **Merging the paints at runtime** (a canvas atlas at load). The Node-side check
  would not see what the arena draws (D194's rejected alternative), and the page
  would pay the packing on every load.
- **A texture array or a second UV set with an index** to keep each paint at its
  own texture. One draw call either way, but a program variant of its own, and
  the paint input path (D144, D196) reads one map.
- **Keeping the sibling materials "just in case".** With every gate counting one,
  the only path that could reach them is a model the route refuses; one material
  a figure is also what the frame loop writes.

---

## D241 — Inspect from the table: `I` — and a chip beside the art credit — opens the workshop's inspect view on the card under the pointer, face up and with a figure only; the workshop's arena link comes back to the same frame

*Branch `arena-personal-polish`; the lane's reserved range D240–D244.*

**2026-09-29** (`docs/evidence/arena-personal-polish.md` §5–§6)

**Decision.**

1. **A keymap row** (`web/src/keys.ts`, `inspectCard`, chord `I` — bound by no
   other row and by nothing in Forge): in the arena it plans `{ kind: 'inspect',
   href, name }` for the card the arena names in `KeyContext.inspect`, or an
   `inert` with the arena's reason; on the board it is `inert` and says "press V
   first", as the camera rows do. A picture key: navigation, legal on a replay and
   behind an open ask, and it sends nothing. `Arena.tsx`'s `case 'inspect'` sets
   `window.location.hash` to the href — nothing else.
2. **THE planner is `arena/inspect.ts`'s `inspectTargetOf(placement, pose)`**,
   pure, fed the card under the pointer, else the last one clicked, else the last
   one pointed at (so the pointer can travel from a card to the chip). Its gates,
   all before the name is read: something to inspect; the placement drawn face up
   and not a redacted stub (`Placement.back`, `isHidden` — hard rule 8's renderer
   half, the same order `personal.ts`'s lookup keeps); a NAMED figure (a model,
   not the anonymous disc — the inspect view is the figure in front of its
   painting; `W` opens the workshop on anything). A face-down, hidden or redacted
   card is `inert` with "a face-down or hidden card is never inspected", and is
   never named — not in the chip, not in the key's hint, not in the URL.
3. **The arena has no card zoom, so the button is on the hover surface**: an
   inspect chip under the art credit (`.arena__inspect`, in the layer's widget
   table with its `pointer-events: auto` rule) — a link, `⌕ inspect <name> · I`,
   for an inspectable card, and an inert chip with its reason otherwise.
4. **The URL is the workshop's own deep link with a view word**:
   `#workshop?card=<name>&view=inspect` (`workshop/links.ts`'s `workshopHref(name,
   'inspect')`, `workshopViewFromLocation`; spelled again in `arena/inspect.ts`
   because nothing under `arena/` imports `workshop/`, D102, and a test holds the
   two equal). The workshop opens its inspect camera when the location asks for
   it, keeps `view=inspect` in its URL while inspecting (a reload stays there),
   reads `?personal=0` as the arena does (so the pedestal is dressed exactly when
   the table was), and the look is the page's own `?look=` query, which a hash
   change leaves alone — the same look. A name the catalog has no exact entry for
   opens the nearest match and says so.
5. **The way back is the workshop's ▣ arena link**, and it returns to the same
   frame: the replay's cursor survives the unmount (`main.tsx`'s `replayCursors`,
   the mechanism the story page uses, D128); a live seat's socket is page-scoped
   and survives, and the workshop's header already says when the game is waiting.

**Rationale.** The inspect view is where the personal tier's models and the
relief window are seen best, and the only way to it was to leave the table and
find the card in the workshop's list. It is navigation from a picture to a page,
so it belongs in the one keymap as a picture key and nowhere near the engine; and
because it names a card, it is gated exactly as the other statement about what a
card is (the personal lookup, D195) is gated — before the name is read, swept
over the corpus made hostile with an ungated control that would leak.

**Rejected.**

- **Opening the inspect view INSIDE the arena** (an overlay on the canvas). A
  second scene with the inspect camera would duplicate the pedestal's; the
  workshop already is the arena pointed at one card (D102).
- **Selecting a card by clicking it for inspection alone.** A click on the table
  is `clickCard` to the engine (never gated, amendment M8); hover plus `I` asks
  nothing of the game, and the last click is only remembered.
- **Offering inspect for every face-up card.** A land or an instant has no figure
  to stand in front of its painting; the chip says so and points at `W`.
- **Importing the workshop's catalog into the arena** to know whether a card is
  listed. D102 keeps the arena free of `workshop/`; the workshop says when a name
  is not listed.

---

## D230 — The three other AI decks each join the corpus with a recording chosen by census, every asserted count moves to the new truth, and five things the new tables showed are fixed or held with their numbers

*Branch `more-villain-identity`; the lane's reserved range D230–D234.*

**2026-09-29** (the brief: the Masters of Evil, the Hulk family and Wakanda — the
three AI decks the more-villains lane added, D116 — had no committed recording, so
their 67 names had no facts in the workshop and nothing in the corpus to hold an
identity row to; villain identity's follow-up 1)

**Decision.**

1. **Three recordings are committed**, one per deck, each by `RecordMatch` (M1's
   recorder, default policy, no `--probe`, no `--match`) with seat 0 = the AI deck
   and seat 1 = `decks/pacho-shield.dck`, seen from seat 0, recorded alone on this
   tree (M49's wire: every full card carries `keywords`):
   `fixtures/games/villain-masters-of-evil-33.jsonl`,
   `villain-hulk-family-261.jsonl` and `villain-wakanda-232.jsonl`. Each passes
   `tools/check-redaction.mjs` with no flags.
2. **Each seed was chosen by census** over seeds 1–300 of its deck (900 games):
   the most of the deck's names face up first, then the most of its creatures on
   the table, then the smaller file and the smaller crowd. The Masters of Evil 22
   of 27 face up (no seed showed all 27) and 14 of 17 creatures on the table, the
   most of any seed; the Hulk family and Wakanda all 24 of 24 face up, with 13 of
   18 and 15 of 17 on the table (`docs/evidence/more-villain-identity.md` §1 has
   the runners-up and why they lost).
3. **They are corpus members like any other**: every sweep that globs
   `fixtures/games/` reads them, every count a test asserted moved to the new truth
   in the same change (evidence §3), and each carries a classic-film pin of its own
   in `motion.test.ts`'s `POST_LANE_FILMS` (`PRE_LANE_FILM` and
   `villain-doom-248`'s pin hold op for op). **Nothing compares a fresh recording
   to them**: steps 6 and 9b name the seed-42 files.
4. **What the new tables showed**, each measured on the recording that showed it:
   - **A squad over the figure budget is a disc, and no swarm** (`figures/pose.ts`):
     *The Masters of Evil*, the corpus's first squad past `MAX_FIGURES`, drew the
     disc with a squad's `swarm` and a disc's width.
   - **A card's arrival and another event's cue of the same id play once — the
     arrival** (the queue's rule 6b): Pacho's A.I.M. Scientists entered and
     connived in one snapshot, and two `fx.hologram`s composed into one twice as
     strong. No old film moved.
   - **A snapshot that runs ahead of its own zone event is held, not fixed**: Web
     Up exiling Moonstone — the frame holds her in exile and the trigger on the
     stack, and her `zone` event comes a batch later, so the departure (D64,
     decided once) never draws her dying. **It is a flush-timing race (the D113
     class), not the engine's order** — corrected by the fix pass: of six
     re-records of the same game (the verifier's three, then three more by the fix
     pass, all SAME GAME by `tools/same-game.mjs`), five put her snapshot a frame
     ahead of her zone event and one put the two in the same frame, where she is
     drawn dying. The first write-up's "recording the game again alone put it in
     the same place" was one re-record, and true of that one. So
     `clips.test.ts`'s count of one is ONE outcome of the race, pinned by the
     committed file, and a re-record can change it; the real fix is this lane's
     follow-up 1, the arena waiting a batch for a death.
   - **A token sacrificed for its own ability is backed by the frame before**
     (`fixtures.test.ts`'s `unbackedNames`): "Clue Token (86) - …" names a token
     that ceased to exist paying for it. A token name looks one frame back — the
     narrator's own look-behind (D123) — and no further, and every other card keeps
     the same-frame rule; four negative controls hold both halves.
   - **The stack's `orb` gains a second type line**: `''`, the Monarch's end-step
     draw (an effect in the command zone, with no type line), beside D220's land.
5. **The terrain's cap is raised from 24 to 32** (corrected by the fix pass: the
   lane first wrote "the tiles' busiest land frame is 24", which was the CAP, not
   the table). `villain-wakanda-232`'s last turns PLACE **25** lands on eight
   frames (`@525`–`@532`) — the corpus's first frames past the old cap of 24, set
   when report 13 §2 measured 21 — and the cap left one land of each without its
   terrain, on the frames the lane benched and pictured and the one README sends a
   player to (527). "Degrade, don't stutter" was not accepted for them: the terrain
   is instanced, so a land past 24 costs **no draw call** and **124 triangles** (a
   slab; a two-tone land one rim more), and on those eight frames the scene is not
   at its triangle worst (`@382` is). `MAX_TILES` and the instance buffers
   (`TILE_CAPACITY`, now `MAX_TILES` itself) are 32. `tiles.test.ts` counts the
   lands a frame PLACES apart from the tiles it LAYS — its old `maxInFrame` counted
   what was laid and so could never see past the cap — and holds 25 placed at those
   eight frames, every placed land laid, no frame capped, and the cap's own order
   past 32 with a synthetic table built from `@525`.

**Rationale.** D220's reasons, three times: a row is real when a recording puts its
card on the table, a census rather than the first seed gives the most of a deck per
file, and a new oracle finds what the old ones could not — five findings here,
none of them this lane's doing, three of them things a player sees. The held one
is held because its fix is the arena's departure rule, D64's, and changing when a
body is decided is a design change measured against every death in the corpus, not
an identity lane's.

**Rejected.** Seeds with a fuller table at the cost of size or crowd: the Hulk
family's 269 (14 of 18 on the table, 8.3 MB against 6.0) and 187 (16 of 18, but 22
of 24 face up); Wakanda's 284 (all 17 on the table, but 12.8 MB, 40 turns and a
62-card table against 8.6 MB and 48). Two or more recordings per deck (the corpus's
sweeps pay per file: the three add 21 MB to its 40). Re-recording until the late
zone event lands in the same frame (it is a race — one in six re-records lost it
that way — and a fixture chosen for winning a race is still a race; the arena
change fixes it for every draw). Keeping the terrain cap at 24 with the eight
frames' one missing land as "degrade, don't stutter" (a hole in the terrain at the
game's decisive turns, for 124 triangles and no call). Widening `clips.test.ts` for every late departure, or the unbacked-name
check for every card (each is narrowed to what was measured: one departure, and
tokens, one frame back). Re-deriving `PRE_LANE_FILM` over all twenty-three files.

---

## D231 — Three decks' identity is data on the shared kit: a human rung, fifty rows, one new kind with its measured cost, and reuse first — a skin painted only where the body is transformed

*Branch `more-villain-identity`; the lane's reserved range D230–D234.*

**2026-09-29**

**Decision.**

1. **A Human is a person.** `figures.json` gains `creature/subtype:human` (the
   man's body): `human` was always the last word of `SUBTYPE_ORDER` and no
   archetype answered it, so a green or red Human with no other recognised word
   stood as a glow disc. Nineteen body rows put the women the villain and human
   rungs would stand in the man's body in the woman's (Songbird, Yellowjacket,
   White Widow, Titania, Moonstone, the Dora Milaje) and the men the hero rung
   would stand in the woman's in the man's (the three Hulks, Hercules, Hulkling,
   Wolverine, T'Chaka, T'Challa, three Black Panthers); Klaw aliases `attack` to
   `pistolDraw`; Birds of Paradise stands on the insect, the library's one organic
   flier. Wakanda's Vibranium Energy Daggers wears the S.H.I.E.L.D. Spy Kit's
   `glints` (an attachment row), where the equipment rung gave it the plain halo.
2. **Fifty `traits.json` rows** — every creature the three decks name but the
   Wakandan Tusker (an armoured elephant has no body in the library; the art rung
   colours its disc) — each a costume, a head, a rest and props from the shared kit,
   and **twenty-four `cues.json` rows**, each keyed off an event about THAT card
   (`docs/evidence/more-villain-identity.md` §5 has every one). The Masters of Evil
   are distinct villains — Zemo's hood, mask and cloak leading the team as a squad,
   MACH-1's red lenses on a gunmetal helm, Yellowjacket's antennae helmet on Wasp's
   wings, Radioactive Man's green glow, Titania's size, Klaw's sound at his hands;
   the Hulk family are gamma bodies — green, red, grey-olive, up to 1.42 with the
   strict width clamp untouched (D65); Wakanda is the black suit under the
   panther's mask and cowl, the Dora Milaje's red and the spear.
3. **Reuse first, and a new kind carries its measurement.** The kit grows by ONE
   kind, the **`spear`** — planted upright at the right side on `root`, 68
   triangles, fixed vibranium silver — worn by five Wakandan names. Measured at
   Wakanda's worst frames it is exactly one draw call (120 → 121) and about 200
   triangles; with T'Chaka in a long robe (the coat and its skirt, two kinds) it
   would have put seven frames over the bench's 120, so **T'Chaka wears a cloak**,
   a kind the Wakandan table already draws for Storm and the Shield Guard, and the
   recording's worst is 119 — the base tree's own. Three more looks moved to kinds
   the tables already draw: Fixer's, Klaw's and Atlas's hair and the Warriors' are
   the man's own parted cut (the Masters of Evil's most kinds at once went 27 →
   26). `traits.test.ts`'s `OVER_THE_LINE` holds the Masters of Evil to 26 kinds at
   once and 12 on its most crowded frames, Wakanda to 20 and 15; the Hulk family
   keeps every other recording's 17.
4. **Two anchors on a person moved, each measured**: a person's `visor` stands
   outside the head's outermost shell (no person had worn one, and inside the hair
   it showed 2–24 px), and a person's `wings` hang from y 0.71 (0.76) so their tips
   stay under the status strip from your seat (Songbird's reached over it by 1.8
   px). Wasp and the Legionnaire still read from both seats.
5. **A skin is a costume only when the body is transformed.** Every person keeps
   the one skin tone (slice 4: a complexion is not identity data). A row paints
   `skin` only where the skin IS the costume — gamma green, red and grey-olive, a
   lava body, a radioactive glow, a mutant shark's hide, a cat-knight's fur, a
   Kree-Skrull's green — fifteen rows, and `traits.test.ts`'s `TRANSFORMED_SKIN`
   is that list, whole: a row that paints a skin and is not on it fails.
6. **The tests read the three decks from their `.dck` files**: the census's task
   list, the both-seats raster (every identity prop ≥ 48 px; the one-sided
   details with partners — the Masters' cloak from the front joins Doom's in
   `ONE_SIDED`'s cloak row, carried by the hood), a costume, rest and skin list,
   and the cue file's name check (all five table decks and their tokens). Ten rows
   the corpus cannot reach are `OFF_THE_TABLE`, each with why.

**Rationale.** D75 and D221's rule — identity is data on shared kinds, never a model
per card — dresses fifty more cards with one new kind, and that kind is worn by
five names. The spear is the Dora Milaje's first read, and Wakanda's go-wide table
is the one the budget bites; so the kind is admitted only with the call it costs
measured where it costs it, and paid for by a reuse on the same table rather than
by moving the line. The skin rule keeps slice 4's promise — no complexion is drawn
from a likeness — while letting a Hulk be green, which is his costume.

**Rejected.** A `staff` or `blade` kind for Boomerang's and Knight of Wundagore's
weapons (one card's each). A `horns` kind for Boomerang's helm (a second horned
card would make it shared — PLAN.md's villain-identity follow-up 8 — but it is a
call on the Masters of Evil's table, at 26 kinds, for a helm the cowl already
carries). Painting the Wakandans' or anyone's complexion (slice 4's rule, restated
above). The spear hand-held (an anchor per rest pose, as the pistol's aim is; on
`root` it holds in every rest and every kneel). Dropping the Masters of Evil's squad
(2,800 triangles at `@371`; the team's first read — the triangles are this lane's
follow-up 2 with D222's follow-up 4). The drone for Birds of Paradise (a robot's
body is a statement about what a card is; the insect is organic). Birds of
Paradise's extra wings (28 px from your seat at the size the status strip allows)
and the Warriors' crop (44 px from the front), both taken off the raster's bar.
A thinner spear: the first cut (a shaft 0.012 of a figure) showed 35 px on the
Warriors' smaller squad leader, and the kind was thickened for every wearer (0.017)
rather than exempted for one.

**Amended by D232 (the fix pass, 2026-09-29).** Nine rows were re-dressed after the
verifier's reading of the pictures, the raster's `mask` partner widened to the long
style, and the census now holds every row of the three decks to its own rung; D232
has each. Nothing above changed but the rows it names.

---

## D232 — The fix pass re-dresses what did not read at play distance, on kinds the tables already draw; holds every dressed row to its own rung and to its concealment; and leaves the skin tone to the owner

*Branch `more-villain-identity`; the lane's reserved range D230–D234. Written by the
lane's fix pass.*

**2026-09-29** (the verifier, reading the lane's pedestal, inspect and table
pictures: the three Hulks, Gamma Grotesque, Hulkling, Brawn and Abomination,
Terrifying Titan "the same slim rig in green with purple or dark trousers";
Birds of Paradise "a white blob with a face"; Boomerang and Common Crook "generic
hooded men"; Whiplash, Whirlwind and Radioactive Man "three green figures"; the
Knight of Wundagore "an orange-haired person, not a cat-knight"; the Masters of
Evil's squad "a purple gang more than Zemo leading the villains"; every Wakandan in
the one pale skin against art of a Black cast)

**Decision.**

1. **Re-dressed, each by data on a kind its table already draws** (every row's
   `_note` says what it was and why it moved; the card's own art decided each):
   - **The Masters of Evil**: a squad's followers wear the leader's costume `top`
     (`pose.ts`'s `squadColour`), so Zemo's tunic went dark — two figures in
     shadow behind his purple hood, mask and cloak, as the card paints a team in
     the dark. It was three purple bodies.
   - **Whiplash** a dark suit under a teal hood (dark green before, beside
     Whirlwind's green armour and Radioactive Man's glow). **Boomerang** his
     helm's silver faceguard (the `mask`, in the tint; the Masters' table already
     draws it) under a dark navy cowl (slate in slate before). **Common Crook**
     bare-headed with long dark hair, in rust-orange (a balaclava before; the long
     style is on that table too).
   - **The green bodies**: the three Hulks, Gamma Grotesque, Hulkling, Brawn and
     Abomination, Terrifying Titan now differ pairwise by at least 40 (RGB
     distance) in skin, top or trousers, and no two share a head and a rest: the
     Brutal Brawler green in purple with the man's own parted cut; Strongest There
     Is a deeper green in maroon-brown, cropped; Gamma Goliath a bright green, a
     shaggy mane (`long`), indigo; Gamma Grotesque teal-green, hunched forward
     (the `working` rest's lean, no bench), in black; Hulkling yellow-green in
     lavender with the olive-gold of his scale, a fist raised (`highReady`);
     Brawn a dark vest over white, charcoal trousers. `traits.test.ts` holds the
     pairwise distances and prints them. The body has no bulk variant, so "bulk"
     is still scale (villain identity's follow-up 11).
   - **Birds of Paradise** a flock of three small fliers in crane grey — a `ring`
     swarm, the Air Force's instanced kind, round the insect rig the clip lane
     keeps and nothing draws. It was the insect body at 0.38.
   - **The Knight of Wundagore** a lion's face (the `mask`, in his orange tint)
     under his mane. A lance (the `spear`) was tried beside it and taken off: the
     two put the Hulk family's table at **18 prop kinds at once** (`@323`), over
     the 17 every recording but the villain tables keeps.
   Not changed: Klaw (the card paints the man in a cream shirt, not the red
   suit), Whirlwind and Radioactive Man (green by nature, and apart once Whiplash
   was not), and every Wakandan (item 4).
2. **One raster rule widened**: `ONE_SIDED`'s `mask` partner is the cowl OR the
   long style, because the Knight's face is under a mane, which carries him from
   behind (283 px from your seat, 101 from the far one) as a hood carries Doom.
3. **Every row of the three decks reads its own rung.** The census's task list
   asserts, for each name D231 dressed, that its pose read the `card` rung, and the
   thin predicates each carry a costume check (the census rows now carry the
   costume): Hellcat's yellow and red, the Knight's orange and blue, Boomerang's
   steel and mask, Brawn's green, white and charcoal, and the new looks. Before,
   Hellcat, the Knight, Boomerang and Brawn passed on what a rung supplied, and
   would have passed with their rows deleted.
4. **Concealment is controlled, not assumed.** The three recordings add no
   face-down and no redacted battlefield card (`figures.test.ts`'s 1,138 face-down
   instances and the 1,179 anonymous ones did not move), so the corpus sweeps say
   nothing about these rows. A new test turns each of the 50 dressed names face
   down — keeping its name (the hostile case) and with Forge's own empty face —
   and requires the anonymous disc with no body, prop, costume, hair, rung, swarm
   or lift, and a five-key stub in its place to stand nothing; the same card face
   up must read its row (the control). With `pose.ts`'s gate narrowed to redacted
   cards only, the test fails on its first name.
5. **The skin tone is the owner's question, not a row's.** Every Wakandan — every
   person — keeps slice 4's one tone (D231 item 5). Whether a person's tone should
   follow its card (an art-palette rung, or a per-deck default) is a change to that
   rule, and PLAN.md's owner question 31 asks it; the default stands until then.
6. **The kinds, recounted**: the Hulk family's table **17** at once (`@323`, from
   16) and **10** on its most crowded frames (from 8) — the 17 every other
   recording keeps; the Masters of Evil 26 and 12 and Wakanda 20 and 15,
   unchanged (`OVER_THE_LINE`).

**Rationale.** D231's looks were each read against the card alone, on the pedestal;
the verifier read them against each other, at the table's distance, and that is
where the user will see them. Every change is a colour, a head, a rest or a kind
the same table already draws, so none costs a call. The census checks were
written to what each look was FOR; a check that a deleted row would pass is not a
check of the row.

**Rejected.** New kinds for Boomerang's horns and blades or the Knight's sword
(follow-up 7: one card each, on tables at the kinds line). The spear on the Knight
(item 1). A second Hulk body with bulk (a library rebuild, villain identity's
follow-up 11). A bird body (the library has none; follow-up 4). Dropping the
Masters of Evil's squad for a lone Zemo (the card is the team, and the shadowed
squad is what its art paints). Painting any person's complexion before the owner
answers (item 5).

---

## D233 — Identity puts the Masters of Evil's and Wakanda's crowded tables over report 13 §8.2's 30,000 triangles: accepted per recording with its numbers, and the part identity owns held by a test so it cannot grow

*Branch `more-villain-identity`; the lane's reserved range D230–D234. Written by the
lane's fix pass.*

**2026-09-29** (the verifier: "identity alone pushes the tables over report 13
§8.2's 30,000-triangle line, and no decision accepts it" — Wakanda 0 frames over
on the bare tree against 198 dressed; the Masters of Evil 11 against 257; the
bench's own verdict FAILs on triangles at both busiest frames; D222's reason, "over
before any identity", does not cover Wakanda)

**Decision.**

1. **The line is not met on those tables, and that is accepted, per recording,
   with its numbers** — the static sweep of every transport index, bloom off,
   1920 × 1080, `vite preview` of each tree (`docs/evidence/more-villain-identity.md`
   §6 and §11; the GTX 1080 and SwiftShader read the same counts):

   | recording | bare tree (`c330942`'s rows): worst triangles · frames over 30,000 | dressed (this fix pass): worst · frames over | worst calls, dressed |
   |---|---|---|---|
   | Masters of Evil (`villain-masters-of-evil-33`) | 30,247 `@371` · 11 | **35,689** `@371` · **257** | 107 `@471` |
   | Wakanda (`villain-wakanda-232`) | 29,450 `@382` · 0 | **33,592** `@382` · **198** | 119 `@477`, `@527`–`@533` |
   | Hulk family (`villain-hulk-family-261`) | 25,794 · 0 | 27,318 `@368` · 0 | 107 `@427` |
   | Doom Legion (`villain-doom-248`, D222) | — | 37,546 · 97 (unchanged) | 128 |
   | `g1` | 29,609 `@355` · 0 | unchanged | 89 |

   No frame of any of them crosses the bench's 120 calls but the Doom Legion's
   (D222). The dressed Masters of Evil are +5,442 at their worst frame, Wakanda
   +4,142, and the part of it identity owns is props: the squads' followers (2,800
   a squad — at `@371` both the S.H.I.E.L.D. Agents' and the Masters'), the cowls
   (432 an instance, the parted hair 114), the gauntlets (120 a fist), the masks,
   cloaks and spears.
2. **Held by a test.** `traits.test.ts`'s `FIGURE_TRIS_HELD` holds the FIGURE
   LAYER — each modelled body's triangles (`models.json`) and each prop kind's
   geometry as the prop field builds it (procedural, or baked: a squad follower is
   its body, a carved hairstyle its mesh) times its instances — at each villain
   recording's measured worst: the Doom Legion **31,318** (`@393`), the Masters of
   Evil **31,449** (`@376`), Wakanda **28,710** (`@376`); and every other recording
   at the worst among them, `g1`'s **24,701** (`@342`). Each within 5% below, so a
   held number stays a measurement and a cut is recorded rather than left as
   slack. The figure layer is the part identity changes: the cards, tiles, discs
   and strips are the same with no row at all (the bare tree's figure layer at the
   same recordings is 25,285, 24,870 and `g1`'s 24,701).
3. **Why accepted, not cut.** The Masters of Evil's table is over the line bare
   (D222's reason). Wakanda's is at 98% of it bare — 29,450 at 46 battlefield cards,
   a table half as big again as the 35 the line was drawn for — so the room for all
   of identity there is 550 triangles, one Black Panther's cowl and mask. Measured
   by subtracting each candidate's figure-layer part from the sweep, frame by frame
   (`var/vf/cutsim.mts`, scratch): without the Warriors' squad (2,800) the table
   is still 30,792 at `@382` and 64 frames over; it meets the line only by ALSO
   taking every lit fist off the table (the gauntlets: 29,992, 8 under — Claws of
   Bast's claws, Most Dangerous's charge, Nakia's blades, Shuri's gauntlets,
   Storm's lightning) or every Panther's hood with nothing in its place (29,928 —
   which the raster forbids, a mask needs its hood). A mask or a cloak and spear
   in place of the gauntlets leaves 26 frames over. The Masters of Evil without
   their squad are 32,889 and 68 frames over. Each of those is a card's first
   read given up for a line the table was drawn smaller than. The cost is measured and small
   where it is paid: the GTX 1080's p95 at the busiest benches is 0.6–5.6 ms (the
   fix pass, at a load average of 7–9; the lane's own runs 2.7–3.9), and
   SwiftShader's lane and base sat within a millisecond in the lane's interleaved
   pairs (both over §9.4's 20 ms, `g1` included).
4. **The real fix stays open**: a crowded-table budget in the arena — props shed
   past a figure count, as `MAX_FIGURES` sheds models — villain identity's
   follow-up 4, measured against every view. When it lands, the held numbers move
   with their measurement.

**Rationale.** A line crossed silently is a line no one keeps. The verifier's point
is that the lane described the budget as watched when it was crossed; the honest
state is "not met, here is by how much, here is what holds it". The triangle line
is a whole-scene number the node tests cannot draw, but the part identity adds is
countable exactly, frame by frame, with the geometry the prop field itself builds,
so that part is what is held — tight, both ways.

**Rejected.** A coarser cowl (D222's reason: about 130 triangles an instance is a
faceted hood at the workshop's 1×, and the Doom Legion wears it too). Dropping the
Masters of Evil's or the Warriors' squad (each is its card's first read; D232 kept
the Masters' and dressed the two behind Zemo in shadow). A cheaper follower body (a
library rebuild). Raising §8.2's line, or the bench's, for these tables. Holding
the whole scene's triangles in a node test (it would re-implement the renderer's
count; the sweep is the measurement, the figure layer the guard).
## D250 — Sound is a cue PARAM under the visual rules: a closed clip list, a default per event kind, fired by the queue on real film, bound from the one frame loop, and a concealed card plays only its event's default

*Branch `sound-cues` (worktree `mtg-table-t2s2`, off `main`'s `24ba603`). The
lane's reserved range is D250–D254 (D200); it used three.*

**2026-09-29** (`docs/evidence/sound-cues.md`; `web/src/arena/CLAUDE.md`'s
*Sound*; PLAN.md's *Sound cues*)

**Decision.**

1. **A sound is three params on a cue, never a cue of its own.** `sound` (one of
   `cues/sound.ts`'s closed `SOUND_IDS` — `enter`, `lunge`, `hit`, `death`,
   `resolve`, `victory`, `defeat`, `comms`, `laser`, `rumble`, `sting` — or `none`),
   `soundAt` (where in the cue it starts, a fraction in [0, 1]) and `soundGain`
   ([0, 1.5]), three rows in `cues/validate.ts`'s `PARAM_SPECS` like every other
   param (D79): an unknown clip, a path, a URL or a card name is an error.
2. **The ladder is per key, and it falls through to a default.** `defaults.ts`'s
   `DEFAULT_SOUNDS` gives the small default set by selector — a card arriving
   (`zone:*>battlefield`, `land`), an attack (`attackers`), a hit (`damage`, its
   `lethal` and `player` qualifiers), a death (`zone:battlefield>graveyard`), a
   spell resolving (`resolved`, a fizzle silent) and the outcome — and a card's or
   an archetype's row may name another clip, move it or scale it; each key it
   leaves out falls through, so a row that retints an arrival keeps its sound.
   The outcome is keyed off three new qualifiers, `outcome:won`, `outcome:lost`
   and `outcome:draw`, from the viewer's seat — the seat the banner's "Victory"
   reads; no cue row resolves differently because of them.
3. **Hard rule 8's renderer half holds for a sound: a concealed card plays only
   its event's DEFAULT.** A per-card sound is a card's name by another spelling.
   `sound.ts`'s `soundFor` reads no row at all — not its clip, its moment or its
   gain — when the subject is a redacted stub or any face-down card
   (`isConcealed`, the flags, never the name), and `resolve.ts` writes that decided
   sound into the cue's params, overwriting whatever the row said.
   `replay-cues.test.ts` sweeps every recording made hostile (every concealed card
   handed a name with its own per-card row, every archetype a concealed card can
   reach given a per-card clip) through the ladder and through the real queue, with
   an ungated control the same sweep catches.
4. **The queue fires it, the frame loop plays it.** A cue implementation never
   touches sound: the queue stamps each cue's decided sound at enqueue and calls
   `Stage.playSound` once, when the cue's REAL progress crosses `soundAt` inside
   `#drive` — so it rides the virtual clock (pause, speed, the live budgets, D72's
   idle rule) with no timer. A snap is silent: `flushAndSnap` (skip all, a scrub, a
   `resync`, a new `gameId`, §5.2's cap), `skipCurrent`, `stepBatch` and a cue
   compressed to no length play nothing, and each of them — and a pause — calls
   `Stage.stopSounds`, so nothing rings on. One clip per card (or player) per batch:
   a land's two arrival events are one noise. `SceneStage` collects a frame's sounds
   in a fixed buffer (`PendingSounds`), and `CueRunner`'s one `useFrame` hands them
   to the audio module (`scene/audio.ts`'s `bind`) after the tick, panned by where
   the card rests on screen. `playSound` is not an op in `NullStage.ops`, so the
   film's pinned digest (D152) did not move.
5. **The S.H.I.E.L.D. headline cues sound as themselves**, each keyed off an event
   about THAT card: Nick Fury's attack is a radio call (`comms`), Helicarrier
   Strike resolving a laser at half its cue (where the beam comes down), Quake's
   Seismic Takedown a rumble, Wasp's trigger a sting. No villain row carries a
   sound (the more-villain-identity lane owns them).

**Rationale.** Report 15's thesis was that the table should feel like the card
art; a comic's motion lands with a sound. Everything that makes the arena's film
safe — cues as data, one clock, one loop, a snap that is identity, a concealed card
that is anyone — applies to a sound unchanged, so the cheapest safe design is to
make a sound one more thing a cue carries and let the existing machinery time it.

**Rejected.**

- **A `sound.*` cue kind, or sound effects played by each cue's `apply`.** Every
  cue would have to learn sound, the skip paths would each need a mute, and the
  pinned film would move; a param read once by the queue touches no cue.
- **A timer per sound, or a clip started on the React side.** A second clock:
  pause, speed and skip would stop at the film's edge and the sound would ring on.
- **Taking the default only when the cue itself came from the default rung.** Every
  S.H.I.E.L.D. card has rows, and all of them would have gone silent.
- **Letting a concealed card's archetype choose its sound.** Its archetype is not
  a name, but the rule is simpler and stronger: the event's default, full stop.

## D251 — Sound is MUTED by default: the context is built inside a user gesture, the choice is kept in this browser, an explicit ON is heard under reduced motion, and the voices are a fixed pool that drops rather than waits

*Branch `sound-cues`; D250–D254.*

**2026-09-29** (`docs/evidence/sound-cues.md` §3–§4)

**Decision.**

1. **Off until the viewer turns it on**, with the cue strip's *sound* checkbox or
   `M` (`web/src/keys.ts`'s `toggleSound` — a picture key like the camera rows:
   local, legal on a replay and behind an ask, `inert` on the board with "press V").
   `scene/audio.ts`'s `SOUND_DEFAULT` is `false`.
2. **No `AudioContext` before a gesture.** `ArenaAudio.unlock()` builds the graph —
   the context, a master gain, eight voices of gain → stereo panner, each holding one
   armed source — and starts loading the eleven clips, and the arena calls it only
   from inside a gesture's handler: the checkbox, `M`, or, when the viewer turned
   sound on in an earlier visit, the first pointer or key press on the page. A
   viewer who never turns sound on never gets a context.
3. **The choice is kept in this browser**, `localStorage` `mtg-table.arena.sound`
   (`on` / `off`), read and written in `Arena.tsx` inside `try` — D71's pattern,
   and liveness' "every localStorage access in the arena is Arena.tsx's". The
   workshop's rehearsal checkbox is page state and reads nothing stored.
4. **`prefers-reduced-motion`: an explicit choice wins.** `soundOn(choice,
   reducedMotion)`: `on` plays under reduced motion too (sound is not motion, and the
   viewer asked for it; the film is 30 % as long, the clip is not); with no choice,
   no default is ever ON under reduced motion. Today the default is off, so the
   arena is silent until the viewer says otherwise either way.
5. **One audio module for the page, a fixed pool, no allocation to play.**
   `sharedAudio` gives the arena and the workshop's pedestal the same instance (one
   context a page). `play` takes a free voice's ARMED source, sets its buffer, gain
   and pan and starts it — no node, no object; a voice re-arms when its source's
   `ended` event arrives or `stopAll` cuts it. With every voice busy a sound is
   DROPPED and counted, never queued and never stolen. Muting, unmounting, a flush, a
   skip and a pause cut every voice at once, and a cut voice is free the same frame.

**Rejected.**

- **On by default.** A sound the viewer did not ask for, in a tool opened beside
  other work; and a browser would refuse it until a gesture anyway.
- **Silence under reduced motion whatever the viewer chose.** Reduced motion asks
  for less motion; a viewer who ticked *sound* asked for sound.
- **Stealing the oldest voice.** A clipped sound mid-word is worse than a dropped
  one; the busiest batch in the corpus asks for sixteen over its length, and none
  of the 80 frames the probe stepped dropped one.
- **An `AudioBufferSourceNode` created per play.** It is what Web Audio expects, and
  it is a browser object per sound on the frame loop; arming it off the play path
  costs nothing and keeps the loop's claim true.

## D252 — The clips are the repository's own, synthesised by `tools/build-sounds.mjs` and encoded to Ogg Opus by headless Chromium's WebCodecs, because no pack was downloaded without the owner's approval

*Branch `sound-cues`; D250–D254.*

**2026-09-29** (`docs/evidence/sound-cues.md` §1–§2; `tools/assets-manifest.json`'s
`procedural.soundClips`)

**Decision.**

1. **No download.** The brief named a Kenney CC0 audio pack as the source. A
   download needs the owner's approval in chat, and this lane ran without one —
   the status layer's glyphs made the same call (`assets-manifest.json`'s
   `statusGlyphs._kenney`). The candidate is recorded, read and not fetched:
   Kenney's *Impact Sounds*, `kenney_impact-sounds.zip`, 800,850 bytes, the page's
   licence line "License: Creative Commons CC0".
2. **Eleven clips drawn by our own code**, sample by sample, from sine partials,
   filtered noise from a seeded generator and envelopes — no sample, nothing
   derived from or referring to card art — GPL-3.0-or-later like the repository,
   recorded as a `procedural` asset with every file's bytes and sha256.
3. **Ogg Opus, encoded with what the machine has.** There is no ffmpeg, sox,
   oggenc or opusenc here, and the repository installs none. Headless Chromium's
   WebCodecs `AudioEncoder` is libopus; the tool serves the PCM to a loopback page
   (a secure context), takes the packets back and writes the Ogg container itself
   (RFC 7845 over RFC 3533). 39,545 bytes for all eleven, 48 kHz mono, ~40 kb/s.
   Chromium 152 and Firefox 155 decode every one (`--firefox`), the same length as
   its source and lined up with it; two builds are byte-identical.
4. **The swap is a data change.** A pack's OGG clip at `web/public/audio/<id>.ogg`,
   with a `packs` entry of its own (URL, bytes, sha256, date, the badge verbatim)
   and its row removed from `procedural.soundClips` — the loader cannot tell, and
   `sound.test.ts` holds every file to its manifest row.

**Rejected.**

- **Downloading the pack on the brief's word.** An agent's brief is not the
  owner's approval.
- **WAV.** Every browser decodes it, and eleven clips at 16-bit 22 kHz were over
  the 100 kB budget before a single sound was worth hearing.
- **MP3.** No encoder on the machine, and Ogg Opus is decoded by both browsers
  here; a Safari viewer is not in this repository's scope (localhost, the owner's
  own browsers).
- **Synthesising at runtime in the page.** The same sounds with no files — but a
  pack clip could then never drop in, and the audio module would carry a synth.

---

## D255 — The arena's caption is the narrator's sentence for the frame on screen, run in `main.tsx` and handed to the arena as plain data; at a live seat the page records the game off the socket

*Branch `arena-story-caption`; the lane's reserved range D255–D259.*

**2026-09-29** (`docs/evidence/arena-story-caption.md`)

**Decision.**

1. **One narrator, one place it runs for the arena.** `web/src/story/caption.ts`
   (pure: `narrate.ts` and `page.ts`, nothing else) narrates a log's frames once
   — `captionIndexOf`, re-told whole as a followed log grows (D126) — and
   `captionAt(index, cursor)` picks the caption for a cursor. `main.tsx` loads it
   through `import()` (never statically: the narrator stays out of the 2D entry
   chunk, D49's rule) and hands `<Arena>` the result as `caption`, an
   `ArenaCaption` (`arena/caption.ts`) — plain data beside the follow word. The
   arena imports no narrator, nothing from `story/` and no transport, and
   `CaptionStrip` is a pure function of its prop (`liveness.test.ts`, with a
   spliced import as its negative control). `story.test.ts`'s "nothing but
   `main.tsx` imports `story/`" stands unrelaxed.
2. **What a caption is.** The frame on screen is the last server `state` the
   cursor has applied (none after a newer `hello_ok`: a new game's board is reset,
   D44). Its moments are every moment of the frames from that snapshot up to the
   cursor — so a prompt or a toast after it does not hide them, and a seat's own
   concede or sideboard answer after it is included — in the story page's order
   (`outlineGame`: a game's setup lines before its turns), at most four (past
   four, three and `+N more`); above them the one moment before (two, when the
   frame has one), dimmed. Every line carries its own turn, and the strip prints
   the story page's turn heading wherever the turn changes, so a line from the
   turn before is never read under the wrong player's turn (42% of the corpus's
   captions span two turns). No moment names the frame on screen: `null`, and the
   strip hides.
3. **The live seat: the page records the game in progress** (`web/src/liveLog.ts`,
   `LiveFrameLog`). The WebSocket transport keeps no frame list, so `main.tsx`'s
   `liveTransport` puts a recorder on the page's socket when it opens it
   (`onFrame`, every inbound frame, in the order the reducer sees it): one game,
   whole, restarted at a `hello_ok` whose `gameId` changed, re-deliveries kept
   (the narrator skips them by `seq`, as it does in a client log — which is what
   these frames are, M17), pings and `seq`-0 refusals dropped. The caption is
   `captionAt` at the log's end. It lives as long as the socket, so a trip to
   `#cards`, `#workshop` or `#story` loses nothing.
4. **Narrated only while someone reads it.** The arena reports its switch
   (`onCaptionShown`, D256), and `main.tsx` loads the narrator and narrates only
   while the arena is mounted with the strip on.

**Rationale.** The user learns the game by watching two AIs play; the narrator
tells the story on a page of its own, and at the table the moments scrolled past
unnamed. The arena decides nothing (M7 convention 1), and a narrator inside it
would be a second place a card's name is decided — so the arena is handed the
sentence, exactly as it is handed the follow word, and hard rule 8 on the strip is
the narrator's own (its one face reader) plus a rendering test over every cursor
of every fixture, replayed and live, against the oracle the story page answers to
(`arena-caption.test.tsx`, `test/hidden-oracle.ts`, a leaky stub as the control).
For the live seat, recording the whole game and not the last N frames or a single
frame is what makes the live caption the story: the narrator's text depends on
what came before (a trigger quoted once is "triggers again" the second time, the
kept hands and who goes first are told at turn 1, a cast and its payment can span
two flushes), and a single frame loses the frame before it, from which a zone
move's name comes. Measured: over every committed log fed frame by frame through
`LiveFrameLog` with its own resyncs re-delivered, the live caption equals the
replay's at 4,075 of 4,077 snapshots — the two others hold a sideboard answer, a
moment the narrator tells from the seat's own `c2s` frame, which a socket client
never hears back. The cost is the parsed frames of one game (what a replay's
transport already holds) and a re-narration per frame while the strip is on
(about 4 ms at g1's length, D126).

**Rejected.**

- **The panel follow-up 1 drew** — the whole story column in the arena, the
  panel importing `story/narrate.ts` and `story/page.ts` itself, which would have
  relaxed "nothing but `main.tsx` imports `story/`" for `arena/`. A caption is
  the moment on screen, not a column to read; the column is `#story`, one click
  away at the same frame, and the arena keeps importing no narrator.
- **Narrating a single frame from the reducer's state and its events** at a live
  seat. `ClientState` keeps the latest snapshot only, and the narrator names a
  zone move from the frame before it; the text would drift from the story's.
- **A ring of the last N frames.** Cheaper, and wrong in the same way at its
  start: a window re-quotes a trigger the story calls "triggers again" and tells
  a turn it did not see begin.
- **Keeping a frame list in `WebSocketTransport`.** The transport's contract is
  the fold; the recorder is the page's, beside the socket it hears.
- **Holding the caption up for a moment after its frame** (a caption that
  lingers). A hold is a timer, and the arena starts none; at 1× a frame is 400 ms
  in a replay and 600 ms in a paced spectate, and the replay bar pauses. PLAN.md's
  follow-up asks whether a hold is wanted, and where it would live if it is.

## D256 — The caption strip sits over the table's right edge above your seat plate, measured against the corpus; on while watching, off at a live seat; `N` is its key in the arena, where always-no has no control

*Branch `arena-story-caption`; the lane's reserved range D255–D259.*

**2026-09-29** (`docs/evidence/arena-story-caption.md` §3–§4)

**Decision.**

1. **Where.** `.arena__caption`, mounted in `.arena__layer` right after the art
   credit (the mount point the story page's follow-up 1 named), is absolutely
   placed at the canvas's right edge, 0.6rem in like the seat plates, growing
   upward from 7.4rem above the bottom (7.2 px over your plate's 111.2),
   `min(28rem, 19.5vw)` wide and at most 13rem tall, clipped from the top (the
   oldest line goes first). `arena/caption.ts`'s `CAPTION_BOX` and `captionRectOf`
   are those numbers as a keep-out, and `caption.test.ts` holds them to the
   stylesheet, as `camera.test.ts` holds the plates. Over every board frame of the
   committed corpus at the table view, at eight canvases from 1024 × 700 to
   2560 × 1340, it covers no hand card, no stack item, no graveyard or exile pile
   and neither duelist, and from 1280 px wide no battlefield card; at 1024 px the
   right end of a full land rank reaches under it in 0.26% of the things on the
   table. The width is what that rank leaves: its ninth card, tapped, reaches
   79.6% of a 1600-px canvas, and the first width tried (`min(22rem, 26vw)`)
   covered it in 126 frames at 1280, 1440 and 1600 px. The bottom centre, where a
   subtitle would go, is the test's negative control: the same box there covers a
   card of your hand 9,392 times over the corpus at 1600 × 944. **That is the table
   view's answer, and the low view's** (measured the same way, nothing covered);
   in the **shoulder** view, the other seat-safe one, the right end of your hand
   fan reaches under the strip in 2,208 of the 4,077 board frames, and in the two
   spectator-only views it covers battlefield cards (side-on, 2,343 frames) and
   the opponent's piles (their shoulder, 498). The strip does not move with the
   view: a view-by-view place is a pose of the view, to be measured as the plates
   were (PLAN.md's follow-up), and at a live seat — where a covered hand card is
   one you cannot click — the strip is off by default (2).
2. **When.** Two contexts, two defaults: **watching** (a replay, a followed
   spectate recording — the arena has no act to send) the strip is **on**; at a
   **live seat** it is **off** — the player is playing, not reading, and a strip
   over the table is a strip over the table. `N` (the arena) and the cue strip's
   **caption** checkbox flip it; the choice is stored per context under
   `localStorage` `mtg-table.arena.caption` (`{"watch":…,"seat":…}`), read and
   written by `Arena.tsx` alone and inside `try`, so turning it on at a seat does
   not turn it on for every replay, nor off for one. Garbage is the default.
3. **The key.** `N` is also Forge's `SHORTCUT_AUTOYIELD_ALWAYS_NO`, the `alwaysNo`
   row. The caption's row (`toggleCaption`) sits after it, so `bindingFor`'s first
   match stays Forge's, and `planKey` takes `N` for the caption in a pre-pass —
   the way floating mana takes its letter — in the arena, which draws no
   auto-yield control (it answered `N` with "a board control — press V"), and on
   a read-only board, where always-no could only say "read-only" (there it is
   `inert`: "toggles the 3D arena's caption strip … press V"). A live 2D board's
   `N` is Forge's, untouched.
4. **The cue strip's row.** The checkbox widened the cue strip, and at 1600 px
   the camera switcher then wrapped to a row of its own over the opponent's rank
   (728 + 672 px against the 1,360 the row has) — the defect slice 2's
   verification fix removed. The switcher's labels now collapse to their keys
   below 1800 px (1400 before); the names stay in the tooltips and the accessible
   names.

**Rationale.** A caption has to be readable without covering what it describes.
The top of the frame is chrome (`HUD_TOP_PX`) and the opponent's back rank, the
left edge is the turn-order bar and your piles, the bottom is your hand and your
duelist, the middle band is combat and the stack — and the right edge between the
plates is felt, which the story page's follow-up 1 had guessed and this measured.
The defaults follow the person: the one watching two AIs play is the one learning
from the words, the one playing reads the board.

**Rejected.**

- **A subtitle at the bottom centre.** Over your hand in every frame (the test's
  control).
- **In the layer's flow, under the art credit** (where the DOM order would put
  it). Over the opponent's back rank: a 560 × 110 px box there covered 5.5% of
  the cards on the table, in 42% of the frames, over five canvases (a scratch
  measurement made while choosing, not a test).
- **One stored choice for both contexts.** One toggle in a replay would change
  the live seat's default, and the other way round.
- **Another key.** `N` is what was asked for, it is free in the arena, and a
  pre-pass keeps Forge's meaning where it means something; any other letter is
  one more binding for a player to learn.
- **"CC" for the checkbox's label**, to save the cue strip ~33 px. A learner
  reads "caption"; collapsing the camera labels a little earlier cost less.

**Amended at the rebase onto `main`'s `2c7ed8e`** (2026-09-29; the sound cues,
D250–D252, and more villain identity, D230–D233; evidence §12). Point 4's
breakpoint moved from 1800 px to **1900 px**. The sound lane put its own
checkbox in the same cue strip, beside the caption's (main's first, as in the
docs), so the strip is 790 px idle and up to 882 px while cues play, and with
the switcher's labels (672 px) the row needs 1,560 px. The row is the strips'
container less its padding and the 15rem kept for the opponent's plate: 1,540 px
at a 1800-px viewport, so there the labelled switcher wrapped under the cue strip
in every sample taken while cues played (97 of 97, headless Chromium); from
1840 px it held. At 1900 px the row has 1,641 px and held in 94 of 94; at
1600 × 1000, labels collapsed, the two strips take 1,026 px idle and 1,118 at
most while cues play, of 1,341 — one row. At 1280 × 800 the row has 1,021 px and
the strips need 1,026 even idle, so there they are two rows, idle as well as
playing (PLAN.md's follow-up 3, widened; its numbers before were taken against
1280 − 240 px, not the measured row). Point 1's numbers were measured on the 20
recordings before the three villain logs joined the corpus; over the 23 since,
the strip still covers no hand card, stack item, pile or duelist at any of the
eight canvases and no battlefield card from 1280 px, the 1024-px figure is 644
of 153,501 things (0.42%, in 608 of 5,522 frames), and the bottom-centre control
covers a hand card 11,760 times at 1600 × 944. The view-by-view figures were not
re-measured. D255's live parity, over the same 23 logs, is 5,520 of 5,522
snapshots, the two others still the two sideboard answers.

---

## D260 — The portrait standee: a face-up creature no personal model dresses stands as its painting's near subjects, cut from the relief cache — the personal tier's second renderer path, dev server only

*Branch `standee` (worktree `mtg-table-t2st`, off `main`'s `e2c337c`); the lane's
reserved range is D260–D264 (D200).*

**2026-09-29** (`docs/evidence/standee.md` is what was measured, its pictures in
the gitignored `var/standee/`; `docs/guides/personal-tier.md`'s *The portrait
standee* the manual; report 15 §8 and §9.4's optional item, the likeness
experiment's §10)

**Decision.**

1. **What stands.** Under the personal tier (the Vite dev server, D190, D195), a
   face-up creature whose print the relief cache has cut (D225–D228) and that no
   personal model dresses is drawn as a STANDEE where its CC0 body would stand:
   its painting's near subjects, cut out, at the figure's stand point, at figure
   height. The order is **a personal model, then a standee, then the CC0 figure**
   — a card a personal model has taken (`personalChoicesOf`'s choice, loaded or
   loading) never stands, and a standee whose textures have not loaded (or
   failed) is the CC0 figure. `?standee=0` draws the CC0 figures with the models
   still on (the A/B), `?personal=0` turns the whole tier off, and a build — no
   route — stands none. A standee stands only where a CC0 BODY would: a named,
   modelled pose (`MAX_FIGURES` already caps those), never a disc over that cap,
   a swarm, a silhouette or an uncrewed Vehicle.
2. **The cut is measured, once per map, from the map** (`arena/standee.ts`'s
   `standeeCutOf`, called by the dev route in Node). The relief map's blue is
   D228's keep mask — the band the red was grown across, cut — not a subject's
   silhouette, so it cannot be the cut by itself (measured: `docs/evidence/
   standee.md` §1). A texel is an OCCLUDER where the front keeps it and it stands
   nearer than the far side it hides (red over green) by more than
   `RELIEF_CLIFF` — `relief_depth.py`'s own subject test, read back off the two
   layers it wrote. The occluders' 1st–99th-percentile box, padded by the painted
   contour (3 px) and never on the frame's line, is the standee's crop; the
   median of what the occluders hide, plus the cliff, is how NEAR a texel must be;
   the SUBJECT is a kept texel of the crop that is an occluder or that near.
   Under `STANDEE_MIN_SHARE` (3% of the art box) there is no standee. The dev
   route decodes the PNG itself (`web/src/personal/png.ts`, `node:zlib`, no
   dependency), caches the cut per file by its size and age, and serves it in the
   relief index beside the map (`standee: {box, near, share}` — numbers about a
   depth map, never a pixel); a map of an older recipe (no keep mask) stands
   none. Over the 158 maps: 158 cuts, their aspect 0.69–2.25 (median 1.37), the
   subject 21–80% of its box (median 51%).
3. **The page reads it through the one reader, moved to the arena.** The arena
   cannot import the workshop (D102), so `reliefIndexOf` and `ART_BOX` moved to
   `arena/relief.ts` (the workshop's `relief.ts` and `framing.ts` re-export them,
   so `relief.mjs` and every workshop caller find them where they did), and the
   route's one name (`RELIEF_BASE`, behind `import.meta.env.DEV`), the index
   loader and the inspect view's depth-map loader moved from `workshop/Pedestal.tsx`
   to `arena/scene/reliefCache.ts`, beside the standee loader (`useStandees`).
   The workshop is still downstream: its pedestal mounts the arena's standee path
   (`standeeChoicesOf`, `useStandees`, `dressStandees`, `FigureLayer`), not a
   copy.
4. **The renderer**: `FigureLayer` mounts a `Standee` for a pose `dressStandees`
   dressed (an opaque `pose.standee`), registered as a rig with no actions — the
   frame loop writes it as a figure (the stand point ⊕ the cue's offset, its
   height as the scale, `uTint`, `uOpacity`, `uMaterialize`) and the clip lane
   finds nothing to play. The painting is drawn unlit, as it is — no band, no
   halftone, no ink mark (D226's reasons hold at figure size). The departing
   body is a standee too (D262).

**Rationale.** The likeness experiment's one clear result was that a relief cut
from the card's own painting reads better at figure size than anything image-to-3D
made, and the relief cache already holds the two layers and the cut the inspect
window draws, for every card. Standing that cut on the table needs no new model,
no new asset and no rig — only a second place the painting is drawn, which is
why it lives in the personal tier with the cache it reads, and why its hard rule 8
argument is a decision of its own (D264). Measuring the cut in the dev route,
from the map, keeps the page free of pixel reads (`arena/art.ts` stays the
arena's one pixel reader) and needs no change to the tool or its recipe: every
map already on disk stands, in this checkout and the main one.

**Rejected.**

- **A subject mask written by `relief.mjs`** (a fourth channel, a new recipe).
  Every map would be stale until the tool runs again in the likeness venv, and
  the two layers already say where a subject stands in front of something.
- **The keep mask as the cut.** It is the grown band beside each silhouette; the
  painting outside it is kept on BOTH sides (§1's pictures).
- **The occluder test alone.** Past the back layer's reach (D228's 80 px) green
  eases back to the painting's own depth, so a large subject's interior reads as
  background: Peggy's torso and the Hulk's chest come out as rings.
- **A depth threshold alone.** A painting's floor is as near as its subject:
  Okoye and Moonstone stand on a slab of ground the width of the painting.
- **The whole art box standing** (a postcard). It is landscape (1.36), so the
  width clamp stands it at 0.53 of a figure with half of it background.
- **Reading the map's pixels on the page** (a canvas `getImageData` per card).
  `arena/art.ts` is the arena's one pixel reader (D160's liveness clause), and a
  cut measured in Node is measured once for every page.
- **A standee over `MAX_FIGURES`, in place of a disc.** The budget line for
  figures is `MAX_FIGURES`, and a standee is a figure's replacement, not an
  addition.

---

## D261 — A standee turns its painting to the camera about the vertical, on both seats — measured against D143's facing from the seat-safe views

*Branch `standee`; the lane's reserved range D260–D264.*

**2026-09-29** (`docs/evidence/standee.md` §2; the pictures `var/standee/facing/`)

**Decision.** A standee's front is turned toward the camera about the vertical,
in its vertex shader (`STANDEE_VERTEX`: the root's position, its scale as its
height, `cameraPosition`, the vertical kept), for every standee on both seats —
`perf.ts`'s `STANDEE_FACES_CAMERA`. It stays upright; the pose's `facingY` and
the cue's `dRotY` turn nothing on it (the lunge's translation and scale still
carry it). A `figure`-anchored beat lands on its centre line at its height
(`effects.ts`'s `#figurePoint`): `fwd` and `side` are a body's vocabulary, and a
painting turned to the lens has no front for a muzzle to sit on.

**Measured**, over a fifth of the corpus's board frames (`standee.test.ts`, the
seat-safe views — table, shoulder, low — at 1600 × 1000): under **D143**'s
facing (a seat's figures face the opponent) your own seat's standees show the
camera their painted side **0 times in 7,341** and the opponent's 4,005 of
4,005 — a painting has no back, so your side of the table would be cardboard.
Turned to the camera, every standee shows its painting: the least subject at 1×
from the table view is **403 px on your seat and 345 px on the opponent's**,
counted with the least subject fill (0.2) and the widest cut (2.25× its height)
the 158 maps measured — traits.test's bar for an identity detail is 48. (The
pictures from views 1 to 3 at `g1`@316 put the same answer on screen.)

**What it costs.** The relief is a bas-relief along the standee's own front, so
a drag round the table turns the standee with the camera and shows no parallax
sideways; the depth reads as the camera looks down on it (the near subjects
over what they hide, from above) and on a drag that raises or lowers the
camera. Recorded as the price and a follow-up (a partial turn).

**Rejected.**

- **D143's facing** (the opponent's standees facing you, yours showing their
  cardboard): the measurement above.
- **A billboard that also pitches to the camera.** An upright standee is a thing
  standing on the table; one that tilts back as the camera rises reads as a card
  held up, and its base leaves the table.
- **Turning each standee once toward the view's HOME camera** (so a drag would
  show the relief). A pose of the camera choice, re-committed on every view
  change and on the director's every cut — and from a drag's far end a painting
  seen edge on.

**Amended by the fix pass (2026-09-29): the legibility is a FLOOR, measured on
real frames, and the cut carries an ink RIM.** The verifier found standees that
did not read as their card at 1× from the table view — both Aerial Doombots at
`g1`@316 (a drone's 0.43 of a figure, a flight scene filling a third of its box:
a grey-green sliver on both seats) and, at the Masters of Evil's @209, the
opponent's sick Doombot and tapped Agent 13 standing over their own cards' faces
and melting into the painting behind them. The 403 / 345 px above counted subject
pixels at the nominal height against traits.test's 48-px bar for a PROP, which
every one of those passes, so they measured nothing about reading.

1. **The floor** (`arena/standee.ts`'s `standeeLegibilityAt` and `standeeReads`,
   `perf.ts`'s `STANDEE_MIN_PX` = 30): a standee stands only where its subject,
   KNEELING — the smallest stance a snapshot draws it in, so a card never changes
   body when it taps — covers at least a 30-px square's worth of pixels at 1× from
   the table view on the 1600 × 1000 canvas traits.test's raster uses, at its own
   stand point, posed as `STANDEE_VERTEX` poses it (the box's drawn area × the cut's
   fill). Under it, its CC0 body stands. `standeeChoicesOf` applies it last, after
   the relief (it reads the cut's numbers, never a name). Chosen from a contact
   sheet of every standee seven crowded frames put on the table, rendered at
   `?dpr=1` (`docs/evidence/standee.md` §9): every one measured 28 or less read as a
   sliver or a smudge — the Aerial Doombot on both seats (23–24), the Wakandan
   Drone Flock (20), Doom's Servo-Guards and Baron Strucker (25), the A.I.M. Bot
   (28) — and every one from 31 up read as its card (the Volcanic Villain at 31, the
   Masters of Evil's rank at 33–40). Over every board frame of the corpus with this
   checkout's 158 cuts it keeps 8,887 of 10,740 standee placements on your seat
   (83%) and 2,952 of 4,678 on the opponent's (63%); seven cards never stand (the
   three drone cards, the A.I.M. Bot, Yellowjacket, *Black Panther, Vanguard* — one
   card — and Wasp, whose personal model dresses her). A card changes body only when its
   stand point moves it across the floor — 10 times over the corpus, counted with
   no personal model taking a card (PLAN.md's personal-tier follow-up 42).
2. **The ink rim** (`STANDEE_FRAGMENT`): where the front is not the subject but a
   subject texel lies within the figures' own outer ink width — `COMIC.inkCssPx`
   (1.6 CSS px) × the render dpr, one uniform every standee shares, written at
   commit (`scene/reliefCache.ts`'s `applyStandeeRim`, `FigureLayer`'s look
   effect) — the front draws `COMIC.ink`: eight taps of the map, their reach from
   the pixel's own footprint (`fwidth`), every tap's coordinate computed before any
   branch so its implicit mip level is the pixel's own (a `textureGrad` form of the
   same cost SwiftShader about 9 ms more a frame for nine standees, `textureLod`
   about 3; this one is within the noise of the lane's shader without a rim —
   evidence §9.2). A figure's silhouette is inked by bloom's pass; a
   standee writes no painted mark (D226), so its edge is its own, and a painting
   standing over a painting — the far seat's standees over their own cards, seen
   from the table — now has one. The same call, no triangle; its cost is in D263's
   frame times.
3. **Held by a raster** (`standee.test.ts`): the standee rasterised through the
   table view at every stand point of `g1`@316 and the Masters of Evil's @209 and
   @371 on both seats — the drones on both seats are their CC0 bodies (each passed
   the first measure's 48 px: the control), the opponent's tapped portrait at @209
   reads, your seat's rank at @371 stands every one — and over an eleventh of the
   corpus's board frames × five cuts, 4,219 kept standees, the floor within 1.3% of
   the raster's count and none under it in any stance. The hard-rule-8 sweep's
   oracle carries the floor too, written apart from the lookup.

**Rejected** (the fix pass). A higher bar on the first measure (subject pixels at
the nominal height ignore the archetype's own height and the kneel). A floor on
the stance on screen (a card would change body when it taps). A floor measured on
the table's centre line rather than the stand point (6 body changes over the
corpus rather than 10, but it stood down the Volcanic Villain, which reads,
everywhere). No rim (the far seat's standees melt into the cards behind them).
Considered and not built: a paper-white border (a sticker's edge reads as a card
held up, and a white line over the far side's pale cards is no edge).

**Amended by fix pass 2 (2026-09-29): the floor measures on the canvas the page
DRAWS, and the rim's reads name their level.** The second verifier: the floor was
measured on a fixed 1600 × 1000 canvas (`STANDEE_LEGIBLE_CANVAS`), and the table
view's field of view is vertical and fixed, so a standee's size on screen is
proportional to the canvas's HEIGHT — at a 1280 × 800 canvas 9,177 of the 11,761
standee placements the floor keeps over `fixtures/games` (78%) measure under
30 px, the band the contact sheet judged unreadable, and a replay in a
1600 × 1000 window (a 1600 × 946 canvas, the replay bar is 54 px) leaves 243
under it. And the rim's eight taps were read with implicit levels inside a
branch — the "computed before any branch" of §2 above made their coordinates
uniform, not their reads, and an implicit level in non-uniform control flow, or
after a non-uniform `discard`, is undefined in GLSL ES 3.00.

1. **The canvas is a pose input** (`arena/standee.ts`'s
   `standeeReads(pose, aspect, fill, canvas)` and `StandeeOptions.canvas`, CSS
   pixels). The arena hands the lookup its own: `Arena.tsx`'s
   `CanvasSizeReport` reads fiber's measured `size` (the ResizeObserver
   `<Canvas>` already runs) and hands it over in an effect, so a resize re-runs
   the lookup at commit and never the frame loop; `null` until the canvas has a
   size, and then nothing stands and nothing is asked; while the answer is the
   same the same map goes on (`standeeChoicesKeyOf`), so a drag of the window's
   edge re-dresses no figure. CSS pixels, not device pixels: the DPR governor's
   rung never changes a card's body. The workshop has no table view to measure,
   so its pedestal and its list's badge ask the floor at `perf.ts`'s
   `STANDEE_REFERENCE_CANVAS` (1600 × 1000, the old constant renamed) — what an
   arena drawn that size would stand — and the badge's title says so.
2. **The floor stays 30 px.** It is a number about pixels on screen, chosen from
   pictures at dpr 1 (above), and nothing at a smaller canvas says otherwise.
   `standee.test.ts`'s raster now runs on three canvases — 1600 × 1000,
   1600 × 946 and 1280 × 800 — at `g1`@316 and the Masters of Evil's @209 and
   @371 on both seats, and a standee stands iff it rasters at 30 px kneeling on
   the canvas the lookup was handed: the drones are their CC0 bodies on all three
   (18–24 px); the far seat's tapped portrait at @209 stands on all three (47, 45
   and 38 px); your rank at @371 with the median cut stands at 1,000 and 946 px
   (34–36, 32–34) and is its CC0 bodies at 800 (27–28); a lookup handed the fixed
   canvas stands 11 standees on the smaller canvases that the raster draws under
   the floor (the control). Over an eleventh of the corpus × five cuts it keeps 4,219, 4,032 and
   1,872 standees on the three canvases, the floor within 1.3% of the raster on
   each and none under 30 px in any stance; what a smaller canvas keeps is a
   subset of what a larger one does. The pictures (`docs/evidence/standee.md`
   §10): in a 1280 × 800 window's replay (a 1280 × 746 canvas) the nine standees
   the fixed floor stood at the Masters of Evil's @371 are 23–30 px of painting,
   the smudges the contact sheet refused; the live floor stands their CC0 bodies.
3. **What a smaller window keeps** (every board frame of `fixtures/games` with
   this checkout's 158 cuts, a card counted once a frame as the lookup counts it,
   no personal model taking a card; fix pass 1's 8,887 and 2,952 counted a card's
   second placement too):

   | canvas | your seat | the opponent's | all | cards that ever stand |
   |---|---|---|---|---|
   | 1600 × 1000 (the reference) | 8,830 of 10,680 (83%) | 2,931 of 4,650 (63%) | 11,761 of 15,330 (77%) | 51 of 58 |
   | 1600 × 946 (a replay in a 1600 × 1000 window) | 8,587 (80%) | 2,931 (63%) | 11,518 (75%) | 48 |
   | 1280 × 800 | 2,139 (20%) | 445 (10%) | 2,584 (17%) | 27 |
   | 1280 × 746 (a replay in a 1280 × 800 window) | 430 (4%) | 441 (9%) | 871 (6%) | 10 |

   **Accepted, and put to the owner** (PLAN.md's question 32): a smaller window
   draws fewer standees rather than standees nobody can read. Lowering the floor
   for a small canvas would stand the 23–30 px paintings the contact sheet
   refused; a floor in device pixels would let the governor's rung change bodies.
   A card now also changes body when the window is resized across its floor —
   at commit, never mid-frame (PLAN.md's personal-tier follow-up 42).
4. **Every read names its level** (`STANDEE_FRAGMENT`, `STANDEE_VERTEX`): the
   UVs' derivatives are taken at the top of `main`, before the first branch and
   the first `discard`, and every read below — the depth map's centre and eight
   taps, the card image and the back image — is a `textureLod` at the level the
   GL's own isotropic formula gives (`lodOf`, from `uDepthSize`, `uMapSize` and
   `uBackSize`, the loaded images' own texel counts); the vertex fetch names
   level 0. Measured (`docs/evidence/standee.md` §10.3, micro.sh's A/B, nine
   standees at the Masters of Evil's @371 on SwiftShader): this form costs 7.1,
   8.1 and 7.0 ms against the implicit form's 7.7, 7.5, 6.7 and 6.9 in the same
   interleaved run (and one outlier of 27.0 under a load of 9.4); `textureGrad` on
   the card image — the GPU's anisotropic filtering kept — cost 11.1–14.6 against
   the implicit form's 7.1–10.7 in two more, so it is not the form. On the GTX 1080 the implicit and the final
   forms are the same picture at the table's distance (a mean difference of 1.1
   of 255 over your rank). GLSL ES 3.00's own `textureLod`, in both stages:
   three defines its `texture2DLodEXT` alias for the fragment stage only, and the
   first cut's vertex fetch spelled that way did not compile — every standee
   vanished from the first picture, while every node test stayed green.

**Rejected** (fix pass 2). The floor on the reference canvas (the major). The
floor scaled by the canvas (30 px × height / 1,000): the same slivers at a
smaller canvas. A floor that follows the window only when it grows (hysteresis:
a renderer that remembers). The rim's comment reworded to what the shader
guarantees, leaving the reads implicit: a defined form costs nothing measurable.
`textureGrad` on the card image (4 ms on SwiftShader for nothing on screen).

---

## D262 — A standee's height is its cut's, clamped by the rank slot; tapped, it kneels as a painting can — a quarter sunk and bowed toward the lens (amended: a fifth sunk, 6 degrees); sick is translucent; it falls on its back when it dies

*Branch `standee`; the lane's reserved range D260–D264.*

**2026-09-29** (`docs/evidence/standee.md` §3–§4; the pictures `var/standee/stances/`)

**Decision.**

1. **Height.** A standee is its cut's own aspect (the box in the map's pixels)
   wide per unit of height, and its height is `fitHeight(pose.height, aspect)` —
   the pose's own height (the archetype's, the card's and its attachments'
   scale) clamped so its width stays inside the rank slot, **D65 strict**: never
   grown, never wider than `FIGURE_MAX_WIDTH`. Over the 158 cuts the aspect is
   0.69–2.25 (median 1.37), so at the nominal 0.85 a standee stands 0.32–0.85
   (median 0.53). A figure-shaped cut (Moonstone's, 0.69) stands its full height;
   a crowd scene stands as a low frieze. Cropping narrower than the subject was
   refused (it cuts the subject at a straight edge). The status strip stands over
   the refitted height (`statusLayout` reads the dressed pose, D210–D212), as over
   a personal model's.
2. **The stances on a body with no rig** (`arena/standee.ts`'s
   `STANDEE_STANCES`, written at COMMIT by `applyStandeeStance`):
   - **tapped** — a quarter of its height sunk into the table (cut at the
     table's plane) and its top bowed 17° (0.3 rad) toward the lens: its
     silhouette drops as the CC0 body's kneel does and the face still reads.
     Measured from the table view (`standee.test.ts`): standing ÷ tapped ≥ 1.37
     at every stand point. **Leaning back was measured and refused**: the
     camera looks down, so a standee leaning back faces it squarely and reads
     TALLER — 1.67× — into its own status strip (standing ÷ leaning back 0.60);
     a deeper bow is a sliver; a sink alone reads as a picture cut in half.
   - **summoning-sick** — the pose's translucency, as a figure's (`opacity`
     0.72); the painting is not half hologram (the look is not the standee's).
   - **attacking** and **blocking** — upright: the attack is the lunge cue's
     offset and the combat bands and arrows, the block the bands and its tether.
   - **the combat freeze** — the painting washed toward the freeze's grey (the
     figures' §6.4 mix), written at commit.
3. **The summon** — `uMaterialize` (D148's number, written by the same two
   bodies of the frame loop): the painting resolves out of its card's colour as
   the arrival ramps 0 → 1.
4. **The death is D64's body** (`FigureLayer`'s `DepartureField.addStandee`): the
   previous frame's standee, built at commit, in the same slot array, drawn from
   the snapshot it dies in until its own death cue has ended — the queue's
   decision (`stepDeparture`, `deathPending`), never a renderer that remembers —
   stepped out of the rank that closed up (`departureStand`). Where a body plays
   `die`, a standee falls back on its base (`standeeFallOf`: flat, 1.45 rad, by
   0.7 of the cue, from its last stance's lean), fades and drains as a body does;
   the lean is a number the frame loop writes, like `uDrain`.

**Rationale.** Every stance is the snapshot's (D56) — tapped, sick, attacking,
blocking, frozen — so each is a pose written when the snapshot changes, and a
skip, a scrub and a `resync` draw it with no history. A painting cannot kneel,
so the question was only what reads as a kneel from where the player sits; the
table view looks down at about 40°, which decides it — anything that turns the
painting's face up makes it bigger, and anything that lowers its top reads as
down.

**Rejected.**

- **Turned 90° in its own plane** (a tapped card's gesture): legible as
  "tapped" to a Magic player, but the subject lies on its side, and its top then
  stands at its WIDTH (1.37× its height at the median) — through its status strip.
- **A lean back** (§2's measurement), **a deeper bow**, **a sink alone**.
- **A standee that leans toward its attacker or its defender.** Turned to the
  camera it has no side to lean to; the lunge, the arrows and the bands already
  say it.

**Amended by the fix pass (2026-09-29): tapped is a small sink and a small bow —
a fifth of its height sunk, its top bowed 0.1 rad (6°) toward the lens**
(`STANDEE_STANCES.crouch` = `{ lean: −0.1, sink: 0.2 }`). The first stance (a
quarter sunk, 0.3 rad) read from the table view at 0.39–0.59 of its standing
height and 0.33–0.53 of its area (`standee.test.ts`, six stand points from your
back row to the opponent's) — the sliver the verifier saw (MACH-1, and Agent 13
over her own card at the Masters of Evil's @209): the table view looks down 45–58°
on the ranks, so every radian of bow turns the painting further from it. Now it
reads 0.68–0.78 of its standing height and 0.65–0.73 of its area on both seats —
shorter, as the CC0 kneel is, with the face whole — and D261's floor is judged in
it. The measurement above ("standing ÷ tapped ≥ 1.37") counted the part sunk
below the table (the test's corners started at the base); the drawn box starts
at the table's plane (the fragment shader's `vAbove`), and the test now does too.
A falling standee still falls from its last stance's lean.

---

## D263 — A standee is ONE draw call: two sheets in one mesh, 1,920 triangles; its maps are uploaded at mount and disposed with their owner; its triangles are the CC0 table's, not the personal line's

*Branch `standee`; the lane's reserved range D260–D264.*

**2026-09-29** (`docs/evidence/standee.md` §5)

**Decision.**

1. **One mesh, one draw call a standee.** The FRONT and the BACK layers are two
   sheets of ONE buffer (`arena/standee.ts`'s `standeeSheets`: 32 × 24 and
   16 × 12, told apart per vertex by `aLayer`) under one material, the back first
   in the index so the front is drawn over it in the same call — **1,920
   triangles**, one program for every standee (`STANDEE_VERTEX`,
   `STANDEE_FRAGMENT`), a material of its own (its uniforms are the frame loop's
   numbers). The front's vertices take `max(depth, near)`, so a triangle across a
   silhouette never stretches back to the background and the vertex cut the
   window needs (D227's `RELIEF_CLIFF` by grid cell) is not needed: the keep mask
   and the subject test cut per texel. The geometry is the page's, shared by every
   standee and every falling body.
2. **The textures.** The colour is the card image `CardPlane` draws (the same URL,
   one texture — `loadCardTexture` gives a texture first asked for without a
   renderer the renderer's settings when a caller with one asks); the map
   (mipmapped: at figure size the painting is minified 4–10× and the cut must not
   shimmer) and the back image are the owner's own, loaded through the dev route
   only, once per print, uploaded when a standee MOUNTS and disposed when the arena
   or the workshop unmounts — about 1.7 MB of video memory a print.
3. **A standee's triangles are the CC0 table's**, not the personal tier's line.
   A standee replaces a CC0 body and its props one for one, only where one stands
   (`MAX_FIGURES` caps them), and was measured within −880 to +220 triangles of
   what it replaces; it spends nothing of `PERSONAL_TABLE_TRIS` (D197), which stays
   the models' sum, and `arena-bench --personal`'s line (§8.2's 30,000 + 36,000)
   holds the table with both.

**Measured** (`docs/evidence/standee.md` §5; one render of the exact frame, bloom
off, the table view, counted with `gl.info`): over eleven crowded frames of five
recordings, **every table draws 2 to 17 FEWER calls with standees** (a standee is
one call and wears none of the prop kinds) — the Doom Legion's worst frame 128 →
118, the Masters of Evil's `@235` 84 → 67 — and triangles move by −2,630 to
+2,363 (at most 48,701 on any frame, the Masters of Evil's `@371`, against the
tier's 66,000). On the GTX 1080 the standee is not measurable in the frame times;
on SwiftShader, on a machine another lane was loading, nine standees read +5 to
+9 ms at p50 at `MoE`@371 — the same order as the noise, and SwiftShader fails
§9.4 with the tier off as it did before (PLAN.md's personal-tier follow-up 39).
The 2D entry chunk is byte for byte what it was; the standee is in the arena's
lazy scene chunk (+2.98 kB gzip).

**Rationale.** The task asked for one call where the material allows, and it
does: both layers are one program's output, told apart per vertex rather than by
a uniform, so they need not be two meshes. Counting a standee against the
personal line would make a table of standees refuse the user's own models while
it draws fewer calls than the CC0 table it replaces; the line that already holds
it is the CC0 table's, whose worst frames D222 and D233 accepted with their
numbers.

**Rejected.**

- **Two meshes, one a layer** (the inspect window's way, D227): two calls a
  standee — twelve more on a crowded table — for nothing a vertex attribute
  cannot say.
- **A quad with relief mapping in the fragment shader** (a parallax march through
  the map): two triangles, but a loop per fragment that SwiftShader pays at every
  pixel, and no depth written where the relief stands proud.
- **The window's 128 × 96 grid**: 49,152 triangles a standee; at 40–110 px tall a
  32 × 24 front puts a vertex every 2–5 px.
- **Counting standees against `PERSONAL_TABLE_TRIS`** (the rationale above).

**Amended by the fix pass (2026-09-29): the CC0 table's share, stated and
accepted with its numbers; the part that grows, held by a test; the frame times
with their p95.** The verifier: "standee triangles count as the CC0 table's" was
recorded but neither met nor tested — with the personal models' own triangles
taken out (`&standee=0` minus `&personal=0`), the standees put the Masters of
Evil's table past the worst D233 accepted, and nothing held them.

1. **The share, after the fix pass's floor** (one render of the exact frame, bloom
   off, the table view, the dev server; `docs/evidence/standee.md` §9's census —
   the standees on, minus the models' own delta, against the tier off):

   | frame | standees | the CC0 table with its standees | the CC0 table alone | |
   |---|---|---|---|---|
   | `villain-masters-of-evil-33`@371 | 9 | **36,893** | 35,689 (D233's accepted worst) | **+1,204** |
   | `villain-masters-of-evil-33`@471 | 8 | 35,813 | 34,421 | +1,392 |
   | `villain-hulk-family-261`@368 | 11 | 29,681 | 27,318 | +2,363 |
   | `villain-hulk-family-261`@427 | 10 | 28,902 | 26,728 | +2,174 |
   | `villain-wakanda-232`@527 | 9 | 33,510 | 32,128 | +1,382 |
   | `villain-wakanda-232`@382 | 7 | 33,392 | 33,592 (D233's accepted worst) | −200 |
   | `villain-doom-248`@393 | 4 | 36,584 | 37,546 (D222's) | −962 |
   | `g1`@355 | 1 | 28,355 | 29,609 | −1,254 |

   So the standees raise the Masters of Evil's worst frame 1,204 triangles past what
   D233 accepted, 6,893 over report 13 §8.2's 30,000; they take the Hulk family's
   @368 to 29,681, 319 under the line; and they lower the Doom Legion's, Wakanda's
   worst and `g1`'s. **Accepted, with these numbers**: the standee is the personal
   tier's (the dev server only — a build stands none), every one of those tables
   draws 0–12 calls FEWER with it (a standee is one call and wears none of the prop
   kinds), and the whole scene's most is 48,701 (@371, the models included), under
   the tier's 66,000. Per standee the frames average −1,254 to +217 triangles
   against what it replaced (the lane's "−880 to +220" was the first census).
2. **Held** (`traits.test.ts`, beside D233's `FIGURE_TRIS_HELD`):
   `FIGURE_TRIS_STANDEES_HELD` is the figure layer with every figure a standee MAY
   replace (the lookup's own gates, `mayStand`, whatever the relief cache holds and
   whatever the floor keeps) counted at the dearer of its body and props or 1,920 —
   the most standees can make of each table, frame by frame over the corpus: the
   Masters of Evil 32,107 (`@376`, against the layer's 31,449 alone), the Doom
   Legion 31,438, Wakanda 29,556, the Hulk family 24,708, every other recording
   25,109 (`g1`@342) — each within 5% below, so a standee that grows, or a body that
   shrinks under one, moves a held number with its measurement.
3. **The frame times** (the verifier: the p95, not the p50, is the number that
   moved): at the Masters of Evil's @371 on SwiftShader the lane measured p95 68.8
   against `&standee=0`'s 34.3 ms and the verifier 68.2 against 39.4, with one max of
   774 ms. The fix pass's interleaved pairs (evidence §9.4, a load of 4–8): p50
   23.5–27.1 against 19.8–21.0 ms, p95 47.5–48.6 against 32.8–47.3 with the sample
   600 ms after the scrub, but 34.3 against 30.3 with it 3 s after, the maxima of
   144–251 ms falling to 51 — so the p95 excess is most likely the standees' first
   mount (two maps a print uploaded and mipmapped at commit), not their per-frame
   cost, which a microbenchmark of their own render puts at 6.3–7.6 ms for nine on
   SwiftShader, within the noise of the lane's shader without a rim. The GTX 1080
   shows no cost (p50 0.4 against 0.7, p95 0.9 against 7.9). Folded into PLAN.md's
   personal-tier follow-up 39.

The build line above ("byte for byte") was wrong: the 2D entry chunk is the same
size (300,425 B) and the same code apart from the lazy chunks' hashed names in its
import map (the verifier's diff of the two builds: 84 bytes). The fix pass's rim
and floor add 1.9 kB to the scene chunk (`arena-scene-*.js` 1,383,443 B, 397.08 kB
gzip).

**Amended by fix pass 2 (2026-09-29): the build's source maps carry no copy of
the sources.** The second verifier: `vite.config.ts` has built source maps since
before the lane, a map's `sourcesContent` is every module's text, and the scene's
and the workshop's named the personal tier's route (`personal/relief/`,
`personal/index.json`) in the comments and DEV branches the built code folds
away — while `personal.test.ts`'s build grep skipped `.map` files by a written
choice. Now `build.rollupOptions.output.sourcemapExcludeSources` is on and the
grep reads the maps like the code, failing a map that carries a source's text
(its control: the same tree built without the option is red). Nothing needed the
text — no tool opens a `.map`, a production build's stack trace still maps to a
file and a line, and the source is the repository — and the maps went from
8.7 MB to 2.3 MB. The scene chunk is 1,384,550 B (397.41 kB gzip, +1,107 B for
the canvas input and the named levels, D261); the 2D entry chunk is 300,425 B
(94.68 kB gzip), unchanged.

---

## D264 — Hard rule 8 for a second card-art surface on the table: a standee only for a face-up, named figure's own print, through CardPlane's lookup, after the gates — and a concealed card never looks its art up

*Branch `standee`; the lane's reserved range D260–D264.*

**2026-09-29** (`docs/evidence/standee.md` §6)

**Decision.** A standee draws a card's painting on the table beside `CardPlane`
(M7 convention 2: THE card renderer of the arena) — a second card-art surface in
the arena, as the inspect view is the workshop's (D196). It is allowed because a
standee is decided by ONE pure lookup that reads a card's name only after every
gate that would conceal it, and then only through the card's own art:

1. **The gates, before any name** (`arena/standee.ts`'s `mayStand`): the
   placement drawn face up (`Placement.back` false — `layout.ts` sets it for a
   redacted stub AND for every face-down card) and not a stub (`isHidden`); the
   pose a NAMED body (not the anonymous figure, not modelless), not a swarm (a
   member of the Air Force or a squad is never its own standee), not a
   silhouette or an uncrewed Vehicle (a vehicle's silhouette never gets one), and
   not dressed by a personal model.
2. **The art through `CardPlane`'s own lookup** — `art.ts`'s `artEntryFor`, the
   function behind `CardPlane`'s `placement.back` gate, itself gated on
   `isHidden` — so a standee's painting is exactly the image `CardPlane` draws on
   that card's face (the same URL, the same texture) and nothing a face-down
   card's owner could not already see on the table.
3. **The relief index, by the print that answered** — its Scryfall id, the one
   key it is asked about. A concealed card's art is never looked up, so no print
   id — and no map — is ever asked about for it.
4. **Nothing carries a name.** A choice carries the print id, the dev route's
   two addresses and the cut; a dressed pose only an opaque `s<n>`; the cue layer
   never sees either, and the frame loop reads numbers.

**Held by** `standee.test.ts`'s sweep of **every board frame of the 23 committed
recordings** (5,522 frames), three ways — as recorded, made HOSTILE (every back
and stub given a secret name, every third face-up creature turned face down with
one), and the hostile placements under the plain poses (a named pose on a back or
a stub, which only the placement gate stops: 9,241 cases) — with a spy art index
and a spy relief index that answer everything: the art is asked 33,921 times and
never about a concealed card, the relief never about a concealed card's print,
and the standees chosen are EXACTLY the face-up, named, un-dressed figures with a
relief (checked against an oracle written apart from the lookup); with the tier
off nothing is chosen and nothing is asked; the lookup with its gates taken out
asks the relief about 20,180 concealed prints (the negative control).
`liveness.test.ts` holds the one place a relief map is looked up
(`standeeChoicesOf`), its order — the gates, then the art, then the relief, with
three spliced controls — and every gate by name.


**Amended by the fix pass (2026-09-29).** The lookup's last step is now D261's
legibility floor (`standeeReads`), after the relief: it reads the cut's numbers
and the pose's stand point and height, never a name, so the order the liveness
clause holds is gates → art → relief → floor (a spliced copy with no floor is its
fourth control). And **the workshop list's *standee* badge asks the same lookup**
(`workshop/relief.ts`'s `standeeBadgesOf`: each creature entry's resting board,
laid out and posed as the pedestal poses it, the models the overlay dresses taken
first) — the badge had its own gates and its own `byId.get` in `Workshop.tsx`,
which no sweep covered (the verifier removed its swarm gate and every test stayed
green). `workshop.test.ts` sweeps the catalog with the concealed shapes handed real
names and a relief that cuts every print as a figure in a doorway, against an
oracle: 72 badges of 103 creature entries, no concealed entry, no swarm or squad, not the card a personal
model dresses, and 10 refused by the floor; the ungated control badges a concealed
entry and asks the relief about its print. The inspect view's plan is the
workshop's one relief lookup (a liveness clause).

**Fix pass 2 (2026-09-29)** changes no step of the order: the floor now reads the
canvas it is handed as well as the cut's numbers and the pose (a number, never a
name, D261), and a lookup handed no canvas yet asks nothing at all — the
hard-rule-8 sweep holds that on every board frame. And the sweep's `mayStand`
gates are all exercised on the corpus now: every uncrewed Vehicle (819) and
every silhouette (949) the recordings pose, handed a model id — the gate that
stopped all of them before — and left one gate alone to stop it, stands none
(`standee.test.ts`; with the vehicle gate, the silhouette gate or both taken out
it is red — before it, only the one-board case went red).

**Rationale.** A standee is a statement about what a card is, as a personal model
is (D190, D195) and as the palette is (D160): the rule and the test are theirs,
applied to a painting. Going through `artEntryFor` rather than a lookup of its own
is what makes the standee show nothing `CardPlane` does not already show on the
same card — the second surface adds no reveal path.

**Rejected.**

- **A standee for a face-down card from its owner's view** (the owner may look at
  it). The table draws the anonymous figure for a face-down card on every seat
  (D56, D142); a painting would be the one place its face showed.
- **Looking the relief up by card name.** The index is keyed by print, and a name
  in the relief route would be a second place a name is looked up.
- **A standee for the stack's ghost only when it resolves.** A creature spell on
  the stack is face up and named — the ghost stands as a translucent standee, as
  a personal model's ghost does.

---

## D270 — SwiftShader cannot meet §9.4's p95 at the arena's floor: its number is the software rasteriser's floor, reported and never gated, and §9.4 is graded on the real GPU

*Branch `gpu-pass`; the lane's reserved range D270–D274.*

**2026-09-29** (`docs/evidence/gpu-pass.md` §3, §6)

**Decision.**

1. **Where the floor is, named.** Report 09 §9.4's gate is p95 ≤ 20 ms. Under
   SwiftShader (headless Chromium, `ANGLE (Google, Vulkan 1.3.0 (SwiftShader
   Device (Subzero)))`) the arena's lowest rung — render dpr 0.6, bloom and the
   ink off, what the DPR governor settles on — reads **p50 15.7–19.4 ms and p95
   33.3–34.6 ms at the bench frame** (`g1`@316), and p95 31.7–53.0 ms at the
   villain tables (`villain-masters-of-evil-33`, `villain-wakanda-232`,
   `villain-doom-248` near their most crowded frames), on every run of the base
   tree and of this lane's. It fails §9.4 at every benched frame. It passes only
   below the floor: `g1`@316 at dpr 0.45 read p95 16.9 ms, and the villain tables
   did not pass even there. The same frames on the **GTX 1080** (ANGLE on OpenGL)
   read p95 0.6–8.7 ms, bloom on or off, at render dpr 1 — inside §9.4's p95 by a
   factor of two at worst. *(Corrected by the fix pass, D273: that sentence said
   "inside §9.4", and its max is not. Unthrottled, the GTX 1080's max is the WebGL
   command buffer draining — 35–53 ms bloom off and over 100 ms bloom on (104–164
   in the series since, and up to 293 on the portrait standee's tree; fix pass 2) at the
   bench frame and Wakanda's, in the base build as in this one, so the default
   page's max was never inside 50 there; at a browser's pacing, `--vsync`, both
   builds read p95 16.7–16.8 ms at all five frames, bloom on and off. §9.4 on a
   real GPU is read at that pacing.)*
2. **What the floor is made of**, so the next lane stops re-discovering it. The
   frame's WebGL work at the floor — 1152 × 563 drawing buffer, 4× MSAA, synced by
   a one-pixel `readPixels` — is **about 15 ms** (14.1–17.4 over eight runs), and
   the one full-table quad of the comic stage (its ground's painted light) is
   3.8–4.3 ms of it, the 39 card planes 2–3, the ten figures about 2.3; about 6 ms
   of it does not shrink with the resolution (the vertex work of ~26,000
   triangles and 83 draw calls), and the page's compositing adds 2–4 ms to the
   frame interval (§3.3's dpr sweep). None of it is the frame loop's JavaScript:
   the pass's CPU fixes (D271) moved SwiftShader's numbers by nothing measurable.
3. **Its p95 is a pacing statistic.** SwiftShader presents on a ~17 ms beat; a
   frame that misses it reads ~34 ms and the one after it ~0.5 ms, so p95 is the
   rate of missed beats, not the cost of a slow frame. At the floor 5–10% of
   frames miss, and p95 reads 34 ms whenever more than one in twenty does.
4. **No rung for it.** The DPR floor (0.6, §9.2 rule 9) is a legibility line —
   below it the card art is mush — and dropping resolution further to pass §9.4 on
   a software rasteriser would be lowering a line to pass. The governor keeps its
   ladder (1 → 0.75 → 0.6 → the composer off) and reaches the end of it sooner
   (D272). `tools/arena-bench.mjs` keeps printing SwiftShader's FAIL, and every
   performance claim names its rasteriser (Tier 2's rule); a SwiftShader FAIL at
   the floor is this decision, not a regression. A regression on SwiftShader is a
   higher p50 at the floor than §3's table, read in interleaved pairs.

**Rationale.** Report 09 took SwiftShader as "a hard lower bound and a fair proxy
for weak integrated graphics". Measured, it is a lower bound but not a proxy that
§9.4 can grade: its cost is fill and vertex work done on the CPU, its p95 is
quantised by its own present beat, and the tree's every frame has failed there
since the comic look (look, motion, bodies, the villain lanes and this pass all
measured it). The number the owner's machine will see is a real GPU's, and the
GTX 1080's p95 is two to thirty times inside the gate (its max: D273). An integrated GPU (report 13
§13 question 3; Lane LOOK follow-up 21) is the machine between the two and is
still unmeasured.

**Rejected.**

- **A rung below 0.6** (0.5 or 0.45) for a machine still late at the floor with
  the composer off: it passes §9.4 at `g1`@316 and not at the villain tables, and
  it is the art the floor exists to protect. If the owner wants the arena usable
  on a machine with no GPU acceleration at all, that is a question (PLAN.md), not a
  rung.
- **Dropping the comic stage's painted ground at the floor** (3.8 ms of the 15):
  it moved SwiftShader's p50 by 1–2 ms and its p95 by nothing (the missed beats
  remained) — and it is the look.
- **Changing §9.4's statistic** to one that folds a missed beat and its catch-up
  frame into two. The bench now prints a line of drawn frames only beside the
  old one (`tools/arena-bench.mjs`'s header, the evidence's §1); the gate's
  number stays what it was, so old numbers still compare.

---

## D271 — The frame loop pays for nothing it did not change: no colour string parsed, no rig refreshed twice, no bone walked to be skipped, no empty kind set up, no unchanged buffer re-sent

*Branch `gpu-pass`; the lane's reserved range D270–D274.*

**2026-09-29** (`docs/evidence/gpu-pass.md` §4)

**Decision.** Five costs the CPU profile and a per-frame census of the pumped
frame loop found, each removed without a pixel changing:

1. **No `Color.set('<string>')` in the frame loop.** `CueRunner`'s `applyOffsets`
   parsed every card's resting colour and `TileField.bind` every land's tint from
   a string every frame — two regular expressions a call, 57–99 calls a frame —
   against M7 convention 5's rule, in two bodies no scan read. Both use
   `parsedColour`. `liveness.test.ts` holds every frame-loop body it scans to "a
   colour arrives parsed", with spliced controls, and puts both bodies (and
   `applyRigOffset`, the `Map.forEach` walk that replaced a `for…of` iterator, and
   `TileField`'s own walk off a per-snapshot array) in the allocation scan.
   *(Fix pass 2, at the rebase onto the portrait standee: the colour clause now
   reads every body the Tier 2 allocation scan reads, the standee's own
   frame-loop body — a falling standee's lean, `standeeFallOf` — among them; a
   colour parse spliced there turns it red.)*
   *(Fix pass 3, 2026-09-29, after a third verifier: the claim was still false in
   one body no scan read — `EffectPool.#apply`'s text case wrote its white as
   `set('#ffffff')`, a `setStyle` parse on every frame a damage number, a turn
   banner or the outcome was live, and `EffectPool.bind`, called from the frame
   loop, walked `effects.keys()` with a `for…of` and its slots with two more. The
   white is `setRGB(1, 1, 1)`, `bind` collects its keys with a `Map.forEach` and a
   collector built once and walks by index, and both bodies are in the allocation
   scan and the colour clause — where the scan's object-literal pattern now lets a
   `case 'x': {` block through, which is what had kept an eight-case body out of
   it. A verifier of that fix then measured two more allocations on the same path
   the scan had just signed off — `bind`'s `keys.length = 0` and `keys.sort()`,
   and `textTexture`'s key string built on every call, hits included — so `bind`
   keeps a count and sorts in place, the text sprite's lookup builds its key on
   the miss path alone, and `.sort(` and `.length = 0` are scan patterns. Every
   splice is a negative control.)*
2. **The prop field refreshes only the joints it reads** (`scene/worldChain.ts`).
   It called `updateMatrixWorld(true)` on every rig a prop rides — about 68 nodes
   a body, recomputed again by the renderer's own pass moments later. It now
   refreshes the chains from each rig's root to the joints its bindings follow,
   parents first, in a list built at commit: 591 of 2,302 nodes over the
   library's 38 bodies, with `Object3D.updateMatrixWorld`'s own arithmetic, so
   every matrix a prop reads is the one it was (`gpu-pass.test.ts` compares them
   on every body, with a chain missing a link as the control).
3. **A figure's bone trees are hidden from the render walk** (`models.ts`'s
   `hideBoneTrees`, at instantiation). three's `projectObject` stops at an
   invisible object, and `visible` is a draw flag only — skinning reads
   `matrixWorld`, which `updateMatrixWorld` computes regardless — so 618 bones of
   871 objects at the bench frame left the walk. A tree with anything drawable
   under a bone stays walked (the control).
4. **An empty tile kind is not drawn.** `TileField` wrote `count` and never
   `visible`, so a kind with no land on the table (the slab at `g1`@316) was set
   up by the renderer every frame — program, uniforms, vertex array — to draw no
   instance. It is hidden, and primed at mount like every parked mesh, so its
   program still compiles there. (three issues no draw call for zero instances, so
   `gl.info` never counted it: this is setup, not a call.)
5. **A buffer is flagged for upload only when a value in it changed**
   (`scene/instanceWrite.ts`: `writeMatrixAt`, `writeColourAt`, `writeScalarAt` —
   the value as a 32-bit float, bit for bit what three's setters store — used by
   the tile field and the prop field; the status strip flags its anchors only
   when one moved). 70 `bufferSubData` a frame at the bench frame, about 40 of
   them the bytes the GPU already held, are now 31. *(The fix pass: its one
   measured cost is in a loop no browser runs. Unthrottled on the GTX 1080 the page
   fills the WebGL command buffer and waits for it to drain; with fewer commands a
   frame the buffer holds more frames — a drain every ~62 frames against ~56 in
   the traces — and each drain can be longer, so 14–25 of ~58 long frames a
   sample cross a third 17 ms beat and read 52–53 ms, where none of the base
   build's did (35–37); bloom on the max read 121–155 ms against 104–137. At a
   browser's pacing there is no drain in either build. Kept, and read at that
   pacing: D273. Each of the three fields is held to "flagged iff its array
   changed" in `gpu-pass.test.ts`, with a buffer flagged every frame and a write
   left unflagged as the controls, and each of seven source reverts turns it
   red.)* *(Fix pass 2, after the second verifier: the COLOUR half of this item
   had no test in the tile field. `TileField.bind` could write a land's colour and
   drop `writeColourAt`'s answer — the colour never flagged, the GPU drawing the
   old one — with every test still green, because the tile case only moved a land,
   and a tile's colour changes only when its land taps (the pose dims it) or a cue
   glows it. The case now taps a land (its plateau's and its rim's colour buffers
   flagged, and nothing else), glows every land (the plateau's and the slab's), and
   ends the glow and the tap, each frame held to "flagged iff its array changed"
   and followed by a still frame that flags nothing; the two source reverts — the
   bucket's colour flag dropped, the rim's dropped — each turn it red, where both
   left the fix pass's test green (`docs/evidence/gpu-pass.md` §12).)*

Measured on the pumped frame loop (DEV server, the GTX 1080, 240 frames of a
batch): `Object3D.updateMatrix` calls a frame 1,417 → 984 at `g1`@316, 2,020 →
1,337 at the Masters of Evil's combat, 1,955 → 1,327 at Wakanda's crowded table;
`Color.setStyle` 57–99 → 0; `bufferSubData` 70–78 → 20–32; draw calls, triangles,
programs and bone-texture uploads unchanged; `CueRunner`'s loop 19.2% → 12.7% of
the main thread over a death batch. Screenshots at the bench frame and four
others, before and after, are identical byte for byte on SwiftShader and with
bloom on; on the GTX 1080 with bloom off they differ by at most one level in 16–26
pixels between any two runs of one build, the GPU's own noise.

**Rationale.** Report 09 §9.1 gives the frame loop 2 ms of CPU and report 13 §8.2
3 ms; the table is well inside both on this machine, but every one of these was
work thrown away, and the laptop the arena is for has a slower CPU and a battery.
None of them could be seen in the GTX 1080's frame rate in a machine shared with
three other lanes' benches, so each is held by a count a test can read — the
census, the scan, the chain comparison, the bucket's `visible` — rather than by a
millisecond.

**Rejected.**

- **Skipping unchanged bone textures** (41% of the twelve uploads a frame were
  unchanged): three uploads a skeleton's texture from inside its render, and
  reaching it means patching three.
- **Figures in the opaque pass** (sorted by program, early depth): 84 of 90 draws
  are transparent and the switches follow depth order, but it changes the draw
  order of overlapping transparent things — pixels — and the ink's mark rides the
  figures' blend state.
- **`matrixAutoUpdate = false` on parked meshes and hit proxies.** fiber writes
  their transforms through props; turning the matrix off makes each one a place
  to forget an `updateMatrix`.

*(Amended by **D275**, 2026-09-29, GPU-pass follow-up 12. Item 1's fix pass 3 left
the scan's boundary at the scene's own bodies, and outside it the one call the
effect pool makes into `layout.ts` for every non-figure effect every frame:
`anchorPosition`, a closure and a tuple a call — 43 GC events per 5M calls for a
`table` or `player` anchor, 818 for an opponent's `zone`, `combat` or `casting`.
The resolver is now `anchorPositionInto`, writing into the stage's one scratch
tuple, and it and every helper it reaches are in the GPU pass's allocation scan:
the scans hold the scene bodies AND the resolver, 0 events per 5M on every kind.
The cue layer, which rebuilds its effect objects every frame by design, stays
outside. D275's fix pass found the compiled resolver still boxing a fractional
`above` height in one state — 3 events per 5M, every kind in turn — through a
feedback slot V8 shares among a function's `ref.id` reads; the two cases read
their ref through a name of their own, and every state measured reads 0.)*

---

## D272 — The DPR governor takes a decided verdict on the frame that decides it and counts its settle in time; its window is pure (`governor.ts`); the dormant `<AdaptiveDpr />` goes and the stats panel is lazy

*Branch `gpu-pass`; the lane's reserved range D270–D274.*

**2026-09-29** (`docs/evidence/gpu-pass.md` §5)

**Decision.**

1. **An early verdict.** The governor stepped when more than half of a
   16-frame window was late. Once more than eight frames are late, the window's
   answer at sixteen is "down" whatever the next frames are, so it now steps on
   that frame (`governor.ts`'s `governorFrame`). The verdict is the full window's
   — on bursts of 30, 80 and 150 ms uploads of every length from 1 to 24 frames on
   a fast machine it steps exactly when the full window steps, never later, and
   never on a burst the full window lets pass (`perf.test.ts`) — only sooner.
2. **The settle is counted in time as well.** Five frames are discarded after a
   step (the drawing buffer's reallocation); it now ends at five, or at two once
   they add up to 85 ms. At sixty frames a second that is the five, as before.
3. **Measured, SwiftShader at `g1`@316 with bloom on by default:** the ladder
   (1 → 0.75 → 0.6 → the composer off) took 7.6 and 9.2 s and 57 frames of
   100–200 ms from the scrub (and once was not done in 14 s) on the base tree, and
   **4.6–7.2 s and 29–32 frames** on this lane's, interleaved, at loads of 5–11;
   a model of the same machine (`perf.test.ts`) walks it in 3.9 s against 7.2.
   The bench's own default line (bloom on, governed) read p50 111–116 ms at all
   five benched frames on the base tree, still descending when its sample ended,
   and 15.7–19.7 ms on this lane's, settled — in a quiet window (load 2.5–6).
   *(The fix pass: under load the ladder does not always finish inside the
   five-second sample. The verifier's two series at loads of 6–28 read p50
   16.1–38 ms in 13 of 16 runs of this build at `g1`@316 and Wakanda @477, and
   104–164 ms in the other three, against 102–121 in every run of the base build;
   the fix pass's own interleaved series is `docs/evidence/gpu-pass.md` §10.6.)*
   Unthrottled on the GTX 1080 it never stepped (ten governed benches). *(At a
   browser's pacing three of 44 `--vsync` runs ended at 0.75 — one of this
   build's 22 and two of the base's — at the cold scrub, before the sample; the
   decision is the full window's in both builds (`perf.test.ts`), and at 60 Hz
   the governor cannot climb back: the GPU pass's follow-up 10.)* At the refresh
   rate no decision moves.
4. **The window is pure** — `arena/governor.ts`, a fixed ring written in place (in
   the allocation scan), driven by `Arena.tsx`'s `DprGovernor` — so a test can run
   the ladder against a machine's frame times. It lives apart from `perf.ts`
   because `perf.ts` rides the shared `arena-scene` chunk and only the arena
   governs.
5. **`<AdaptiveDpr />` is removed** (M7 follow-up 6): mounted, it never acted —
   `performance.current` moves only for drei's `<OrbitControls regress>`, which
   the arena does not pass — and its one live line wrote `current ×
   viewport.initialDpr`, the resolution the canvas started at. **`?stats=1`'s
   panel is lazy** (`arena/StatsOverlay.tsx`, reached through `lazy(() =>
   import(...))` as `Post.tsx` is): `stats.js` was in the arena chunk for every
   viewer.

**Rationale.** "Degrade, don't stutter" (§9.2 rule 9) was spending five to nine
seconds stuttering on the slowest machine before it degraded, because a window
counted in frames is a window counted in seconds when frames are slow. Taking
the decided verdict early changes no outcome anywhere, which is why it is the
change made; a window counted in time was the first cut, and it stepped a fast
machine down on four slow texture uploads (the tests keep it as the control — on
a vsync-locked display, where the governor cannot climb, that is for the rest of
the session). Items 4 and 5 keep the pass's own code off the arena's page: with
them the arena's two chunks together are 0.27 kB gzip smaller than before the
pass (§7).

**Rejected.**

- **A window counted in time** ("enough" after a quarter-second, or half a
  second, of late frames): faster on the slow machine, and it takes a burst of
  long uploads on a fast one for a slow machine — the measured first cut stepped
  the GTX 1080 to 0.75 at three of ten benches.
- **Dropping the composer first** (bloom is 95 of the 115 ms a SwiftShader frame
  costs at the floor with it on): the order of the rungs is the look's, and user
  decision 6 made bloom the default; the governor keeps the order and walks it
  faster.

---

## D273 — On a real GPU, §9.4 is read at a browser's pacing: unthrottled, the arena outruns the GPU and its longest frame is the WebGL command buffer draining

*Branch `gpu-pass`, the fix pass; the lane's reserved range D270–D274.*

**2026-09-29** (`docs/evidence/gpu-pass.md` §10)

**Decision.**

1. **What the unthrottled max is on the GTX 1080.** `tools/arena-bench.mjs` runs
   Chromium with `--disable-gpu-vsync --disable-frame-rate-limit`, so the page
   draws as fast as it can: about 740 frames a second at the bench frame. The GPU
   cannot execute them that fast — its driver held it at P5 (746 MHz) at 94–98%
   utilisation through a sampled run, on an idle machine — so the renderer's
   WebGL command buffer fills, and its main thread waits inside
   `requestAnimationFrame` in `CommandBufferHelper::WaitForAvailableEntries` (→
   `CommandBufferProxyImpl::WaitForGetOffset`) until the GPU process has drained
   it. Chromium traces of `g1`@316 bloom off and Wakanda @477 bloom on show the
   wait every ~56–62 frames (10–48 ms) and every ~41–45 (median 97–110 ms), in the
   base build and in this lane's; every frame over 30 ms bloom off holds one, and
   31–33 of 35 bloom on. Those waits are the max, quantised to the headless
   display's ~17 ms beat: 35–37 ms bloom off at the bench frame in the base build,
   52–53 in this one, and 104–155 ms bloom on in both *(over 100 ms: item 7)*.
2. **Why a build that does less reads worse there.** The waits add up to about
   the same — 3.32 and 3.37 s of five bloom on, 2.10 and 1.74 bloom off — but a
   frame with fewer commands in it (D271.5's forty fewer uploads) lets the buffer
   hold more frames, so at the bench frame the page waited less often (every ~62
   frames against ~56) and could wait longer, and a longer wait crosses a third
   beat.
   A change that sent more commands would read better. When the driver runs the
   GPU fast enough to keep up, there is no wait at all — the base matrix's 7–19 ms
   maxes at 09:26 — which is why the GTX max swung between runs and series.
3. **At a browser's pacing none of it happens.** With vsync and the frame-rate
   limit on (`--vsync`, new) the page draws one frame a beat, the trace shows no
   command-buffer wait in five seconds in either build, and the benches read p50
   and p95 16.7–16.8 ms at every frame, bloom on and off, in both builds (§10.4).
4. **So §9.4 on a real GPU is read at a browser's pacing.** `--vsync`'s p95 ≤ 20
   ms says fewer than one frame in twenty missed a beat, its max ≤ 50 that none
   missed three. The unthrottled line stays what it is good for — headroom: p50,
   p95, the `RENDERED` line and the counts — and its max on a real GPU is the
   drain: the bench still prints that FAIL (the line is not lowered), with a note
   naming this decision. SwiftShader stays unthrottled (D270): at its floor it
   cannot keep up at any pacing, and its number is the floor's own.
5. **D271.5 stays.** It sends forty fewer buffers a frame of bytes the GPU
   already held, and its only measured cost is a longer drain in a loop no browser
   runs; with it the GTX 1080's unthrottled p50 and p95 at the bench frame read
   0.4 and 2.7–2.8 ms against the base build's 0.5 and 3.3–3.4 on an idle
   machine (§10.5).

**Rationale.** §9.4 is about what a player sees: a frame that misses the
display. The unthrottled harness was chosen (T7's header) because at 60 Hz every
interval is 16.7 or 33.4 ms and p95 cannot tell a slow renderer from a hiccup —
true on SwiftShader, whose frames are 15–20 ms, and still the right reading of a
real GPU's headroom. But a real GPU's frames are a fraction of a millisecond, and
there the unthrottled loop measures the command buffer's size against the GPU's
throughput at whatever clock its driver chose: a property of the harness, which
grades a change that sends less work as a regression. At a browser's pacing a
real GPU's frame either makes the beat or does not, and that is the gate's own
question.

**Rejected.**

- **Dropping D271.5 to bring the unthrottled bloom-off max back under 50 ms.**
  The base build's default page (bloom on) already failed that max on the same
  line (104–137 ms), so it was never a pass; buying 17 ms back on one line by
  re-sending unchanged bytes would be tuning the code to the harness.
- **`--vsync` as the default for `--gpu gl`.** Every GTX number in the evidence
  is unthrottled and must still compare, and unthrottled p50/p95 are the only
  headroom reading a fast GPU gives. Both lines exist; this decision says which
  one the gate reads.
- **Flushing or finishing the WebGL context every frame** so the buffer never
  fills: it changes what the page does to suit the bench, and costs a real
  browser a synchronisation it does not need.

**Amended by fix pass 2** (2026-09-29, after a second verifier's re-measure;
`docs/evidence/gpu-pass.md` §11–§12, PLAN.md's GPU-pass follow-up 11):

6. **At a browser's pacing a real GPU's line is saturated, so a regression is read
   unthrottled.** Item 4 stands — §9.4 on a real GPU is graded at `--vsync` — but
   the GTX 1080 reads p50 and p95 16.7–16.8 ms there in every build at every frame
   (§10.4): the statistic is the display's beat, it grades the gate, and it cannot
   tell two builds apart until one misses a beat. **The regression signal on a
   real GPU is the unthrottled p50 and p95, read in interleaved pairs against the
   base build** (§10.5, §11); the unthrottled max stays the drain's. A line that is
   neither — a GPU timer over the frame, or a paced run long enough to count its
   missed beats — is owed (follow-up 11).
7. **What D271.5 costs there, with the numbers.** It lengthens the unthrottled
   drain: at `g1`@316 the second verifier read the max 35–39 → 52–53 ms bloom off
   and 121–122 → 140–164 bloom on, base against this build (§10.5's own:
   35.8–36.7 → 52.5–52.8 and 121.5–136.9 → 138.5–155.3); on the rebased tree, over the
   portrait standee (§11), the same shape: 36.0–39.5 → 52.5–52.7 ms bloom off at
   `g1`@316 with the personal tier off, and 71.9–72.9 → 71.4–123.5 with it on (the
   standees lengthen the drain in both builds). Item 1's
   "104–155 ms bloom on" is exceeded by the verifier's 163.5 and by the standee's
   tree (121–293 ms at `g1`@316 and the Masters of Evil @371, §11): bloom on, the
   drain is **over 100 ms**, in both builds.
8. **On the portrait standee** (the rebase onto `a46bd96`, D260–D264), interleaved
   on the DEV server against `a46bd96` itself, three runs a line, the tier (and so
   the standees) on and off (§11): this build's unthrottled p50 is equal or lower
   on all eight GTX lines and its p95 lower or overlapping; at `--vsync` every run
   of both builds reads p50 16.7, p95 16.7–16.8 and max 16.8 ms, standees on and
   off — §9.4 passes there, and the line tells the builds apart no more than item
   6 says — though at the Masters of Evil's @371 the governor had stepped the GTX
   1080 to 0.75 at the cold scrub in 14 of the 16 paced runs, both builds alike
   (follow-up 10). D271.5 stays.

---

## D265 — The chrome column over the canvas is three in-flow rows held under `HUD_TOP_PX`: the inspect chip beside the credit, a fixed-width cue status with a narrow form below 1400 px, and the switcher's labels from 1840 px

*Branch `play-distance-audit` (worktree `mtg-table-t2a`, off `main`'s `e2c337c`). The
lane's reserved range is D265–D269 (D200); it used three (D267 on its fix pass).*

**2026-09-29** (`docs/evidence/play-distance-audit.md`; the audit of the eight
lanes merged on 2026-09-28/29, seen together at play distance)

**Amends** D241 point 3 (the inspect chip sat on a row of its own *under* the art
credit) and D256 point 4 as amended at its rebase (the switcher's labels
collapsed below 1900 px). **Restores** D85's statement that the chrome over the
canvas top is `HUD_TOP_PX` (128 CSS px) — the band D85's carriers, D100's
duelists and the seat plates are measured against.

**Decision.**

1. **The layer's chrome column is three in-flow rows**: the decision bar (or,
   watching, the "watching" line), the cue strip beside the camera switcher, and
   the credit line beside the inspect chip. Every other widget the layer mounts is
   positioned out of the flow (the caption, the plates, the turn-order bar, the
   game-over row, the overlay). `web/src/arena/hud.ts` records the rows' heights
   as headless Chromium drew them and `hud.test.ts` holds the sum —
   **112 px at its worst**, a prompt at its two lines (measured 112.5) — under
   `HUD_TOP_PX`, the layer to those three rows (parsed from `Arena.tsx`), and the
   out-of-flow widgets to `position: absolute`/`fixed`. A fourth row fails the
   test with what to do. *(Corrected on the fix pass: this said "at its worst
   ordinary case, a live seat whose prompt wraps". It was not the worst — a
   longer engine prompt wrapped the bar to five lines and the column to 167 px,
   Quake's 250-character targeting prompt; 17 of the corpus's 350 distinct
   prompts took it past 128. **D267** holds the prompt at two lines, which makes
   112 px the worst case for any prompt.)*
2. **The inspect chip shares the credit's row** (`.arena__creditrow`, layout only,
   `pointer-events: none`, 15rem short of the right edge for the opponent's plate
   as the strips are). It gives way before the credit does, down to its own label
   (13ch): the credit is the attribution the art travels with. Its behaviour, its
   planner and its two faces are D241's. *(Corrected on the fix pass: the audit
   wrote `flex-shrink` 4 against the credit's 1, and a shrink factor is weighted
   by the item's own width, so both gave way at once — at 1280 px the credit was
   cut to 586 px, "© Wiza…", while the chip kept 429 of its 560. It is 1,000
   against 1, the pattern the seat plate's deck name already used: the credit
   keeps its whole width (648 of 648 px at `human-sideboard-7`@1195) until the
   chip is at its 86-px floor.)*
3. **The cue strip's status is a fixed width** — a box of 21 characters of the
   strip's mono face, which the longest status `hud.ts`'s `cueStatusOf` writes
   (`99+ steps · 99999+ ms`) fills — so the strip is as wide playing as idle, and
   a batch no longer wraps the switcher onto a row of its own. The strip's gaps are
   0.25rem (0.35 before). *(Fix pass: the status sits behind a 1-px rule —
   beside the caption checkbox with nothing between them it read as that
   checkbox's label, "caption idle", "caption 2.0 s" — which adds 5.8 px to each
   form; the numbers below are re-measured with it.)*
4. **Below 1400 px the strip takes its narrow form**: the word *speed* folds into
   the select's tooltip (the select shows its own `1×`) and the status is the
   seconds of film left (`4.2 s`, a 6-character box); the whole status is the
   box's tooltip at every width. From 1280 px the strip and the switcher then hold
   one row, idle and playing (993 px of a 1,021-px row at 1280 × 800 — 987 before
   the fix pass's rule; before the audit, 1,026 idle and up to 1,119 playing — two
   rows in all 192 of the audit's 1280 × 800 shots).
5. **The switcher's labels show from 1840 px** (1900 before): with the fixed
   status the labelled row needs 1,571 px (1,565 before the fix pass's rule),
   which a 1,831-px viewport gives, so 1840 keeps 10 px in hand.
   `hud.ts`'s `CUE_STRIP` carries the measured widths and the three breakpoints;
   `hud.test.ts` holds the stylesheet to them, the row arithmetic at 1280, 1399,
   1400 and 1840 px, the strip's markup to the controls that were measured (four
   buttons, the select, five checkboxes, the status; five views, the director and
   spectator), and the strip before the audit as its negative control.

**Rationale.** The column had grown past the band nothing held it to. D241's chip
added a fourth row (to 117 px watching, **137 px at a live seat** with a wrapped
prompt — the ordinary priority prompt wraps at the prompt's 46ch), and the sound
and caption checkboxes widened the cue strip until at 1280 × 800 the switcher took
a second row even idle (150 px watching; 171 px on a replayed human seat, where
the chip then sat on the turn-order bar's head). The band is what the carriers and
duelists are measured against, so a column past it hides what those tests say is
seen: against the live seat's 137 px the opponent's duelist in the shoulder view
at 1280 × 800 is **64%** visible, under the 70% `camera.test.ts` asserts against
the 128-px band (71%); and at 1280 × 800 the credit and the chip stood over the far
rank's creatures in every villain game seen from Pacho's chair. Measured over the corpus at the table
view, the far seat's status strips under the chrome at 1280 × 746 went from
**7.34% to 0.50%** (1,971 → 135 of 26,842), and over the audit's seat-1 recordings
of the villain decks from **21.5% to 6.5%**. The fixed width answers the one
defect a measurement cannot see in a still: the switcher jumping rows whenever a
batch started.

**Rejected.**
- **Raising `HUD_TOP_PX` to the column** (140): honest about the chrome, but it
  moves the band every far-end test measures against and takes the opponent's
  duelist in the shoulder view at 1280 × 800 to 61%, under camera.test's 70%;
  the chrome was what grew, so the chrome is what gives the row back.
- **Showing the chip only while a card is pointed at**: the column would grow a
  row whenever the pointer crossed a card — a layout shift under the hand that
  moves it — and D241's inert chip is how the key is discovered.
- **One-line prompts** (widening the prompt past 46ch): the prompt is the engine's
  text and any length; a longer one wraps again. (The fix pass widens it AND
  clamps it — **D267** — which is a different answer: the width shortens the
  common case, the clamp bounds the rest.)
- **Short labels for the checkboxes** ("FX", "cap"): D256 rejected "CC" for a
  learner who reads *caption*; folding the one word the select already shows was
  enough.
- **Collapsing the step and skip buttons to glyphs**: the same reason, and not
  needed.


**Amended by fix pass 2** (2026-09-29, after a second verifier; `docs/evidence/play-distance-audit.md`
§11). *Point 2 was still not true.* The fix pass wrote the credit `flex: 0 1 auto`
against the chip's `0 1000 auto` and said the credit kept "648 of 648 px"; a shrink
is weighted by each item's width, so the credit still took a share — 648.3 → 648.0
px at `human-sideboard-7`@1195, 1280 × 800 — and its ellipsis cut its last words,
"…© Wizards of the Coast · Unofficial Fan Conte…", the Fan Content Policy's
notice (on `e2c337c`, where the chip had a row of its own, the credit was whole).
No shrink factor ranks two items, so point 2 is now:

- **the credit does not shrink** (`flex: 0 0 auto`) and stops at the room the row
  leaves beside the chip's floor (`max-inline-size: min(980px, 100% −
  --inspect-floor − the gap)`); the chip (`flex: 0 1 auto`) gives way down to that
  floor. So the credit is drawn whole whenever it fits beside the floor — 648.3
  of 648.3 px there, measured in Chromium as rendered text (no ellipsis), the chip
  366.1;
- **a credit longer than that gives way in its artist list only**: `ArtCredit`
  draws two parts, `.arena__credit-lead` (Scryfall's name and the artists,
  ellipsised, the whole list in the tooltip) and `.arena__credit-notice` ("·
  © Wizards of the Coast · Unofficial Fan Content", `flex: none`), so the
  notice is whole at every width from 1280 px (at `human-ability-42`@1060,
  1280 × 800, a 960-px credit is drawn 905.3 px, its list cut by 55 px, its
  notice whole);
- **the chip's floor is its key, whole**: `--inspect-floor` is 14 characters of
  the mono face (0.6021em, DejaVu Sans Mono's advance as Chromium drew it) plus
  the chip's padding and border, 109.1 px — the 13ch floor had been a
  border-box, 69.7 px of content for an 86.1-px key, and one ellipsis over the
  whole chip then read "⌕ inspect · …" at the floor in every replay at 1280. The
  key ("⌕ inspect · I", or "⌕ inspect … · I" round a name) is a part that never
  shrinks; the name or the reason is cut, whole in the tooltip.

`hud.ts`'s `CREDIT_ROW`, `creditRowOf` and `flexSizes` (the CSS flexible-lengths
algorithm) and `hud.test.ts` hold it by the rendered width — the credit drawn
whole beside the chip at every width from 1280 to 1920 px for every credit that
fits, the model agreeing with Chromium at three measured layouts, the audit's
first cut (585.7 and 428.7 px) among them — with the first fix pass's row as the
control.

**Amended by fix pass 3** (2026-09-29, after a third verifier;
`docs/evidence/play-distance-audit.md` §12). *Point 1's "112 px at its worst" held
only with the director off, and point 2 still had an exception.*

- **Point 5, the switcher: the director's shot is a mark, not text.** Pressing
  `6` (the auto director, in a replay or while spectating) drew the current shot
  as text in the director's button — " · Table", " · Side-on", " · Shoulder",
  " · Opp. shoulder" — and grew the switcher from 230.1 px to 283.1–336.0 (672 to
  725–778 labelled). `CUE_STRIP.px.switcher` had been measured with the director
  off and the 384 shots with the default camera, so nothing saw it: the switcher
  wrapped under the cue strip at 1280, 1400, 1840 and — at the longest shot —
  1920 px, the strips row 67.5 px, the column **126.1 px**, 143.9 with `I` and
  **146.3** beside a two-line prompt (`human-ability-42`@1060), past
  `HUD_TOP_PX`, with the credit row over the far rank. The shot is always one of
  the five views and each has a button, so the director now MARKS it on that
  view's own button (`arena__view--shot`: the same 1-px border, dashed and in the
  accent — no width) and NAMES it in its own tooltip and accessible name; no text
  in the switcher depends on the shot. `CUE_STRIP.px.switcherDirector` (230.1)
  and `switcherDirectorLabelled` (672) are the switcher measured with the
  director on at each of its four shots, and `hud.test.ts`'s one-row check runs
  with them at 1280, 1399, 1400, 1839, 1840 and 1920 px — the shot as text,
  modelled from `camera.ts`'s own shot list (the longest, 16 characters, 106 px:
  a 336.1-px switcher against Chromium's 336.0), its control; `arena-hud.test.tsx`
  renders the switcher at every shot and holds its text to the director-off text.
- **Point 1: 112 px at its worst is true under every key.** Measured in headless
  Chromium from 1280 to 1920 px at four frames with the director on and cutting,
  `I`, the status at its widest, the caption and the sound each way, the cue
  clock paused, spectator off and every view — 448 measurements and 3,338
  samples while cues played — and at a live seat's `6`, `3`, `4`, `O`, `N`, `M`,
  `I` and `CTRL+Q`: one strips row every time, the column at most **112.5 px**.
  Two keys narrow the row (spectator off drops its ✓, 13.3 px; the paused
  clock's "▶ cues" is 3.4 px narrower than "⏸ cues") and none widens it, so
  `CUE_STRIP`'s widths are the widest the row draws.
- **Point 2: the credit has no cap of its own.** M7 Tier 1's `max-inline-size:
  980px`, written when the credit stood alone on its row (`min(980px, 92vw)`),
  survived inside the amended rule and stopped the credit sooner than the chip's
  floor: at `villain-masters-of-evil-33`@209 its 1,070.4-px table credit was drawn
  980 at every width from 1366 px — its artist list cut by 90 px beside a chip
  of 120–560 px (354.4 at 1600 × 1000). The row's own `calc(100% - 15rem)` keeps
  the credit off the opponent's plate, so the cap is dropped rather than named:
  the credit's room is the row less the chip's floor, and it is cut only when the
  chip is at its floor (whole from 1500 px there; 991.3 beside 109.1 at 1366).
  Where the row was full it covers the same span as before; where the capped
  row did not fill (from about 1,806 px: 980, the gap and the chip's 560) a long
  credit covers more of the band than the cap allowed — for this credit up to 90
  px, from 1,896 px. `hud.test.ts` holds that the credit is cut only with
  the chip at its floor, over credits of 200–2,000 px and every width from 1280
  to 1920, with the cap as the control.

*Rejected* (fix pass 3): **a fixed inline size for the shot**, sized to the longest
(" · Opp. shoulder", 106 px) — the row has 27.8 px in hand at 1280 (993.0 of
1,020.8), 12.2 at 1400 and 10.3 at 1840, so no width holds it in the row;
**the shot out of the flow** under its button — the band has 16 px under the
column, and below it is the far rank the band keeps clear (D267's amendment's
reason for the hint); **dropping the shot** — the cut is worth seeing, and the mark
costs nothing; and **naming the credit's cap** in the rule instead — a rule that
says the credit never gives way while the chip can, with an exception that cut
the artist list at the width the audit measures, is the defect.
---

## D266 — The figure budget is spent on the viewer's own seat first

*Branch `play-distance-audit`; the lane's reserved range D265–D269.*

**2026-09-29** (`docs/evidence/play-distance-audit.md` §F5)

**Decision.** `figures/pose.ts`'s `MAX_FIGURES` (12) budget — how many creatures
carry a model; the rest draw discs — is spent in `budgetOrderOf`'s order: the
viewer's own seat's placements first, then the other seat's, then the stack, each
in placement order. `personal.ts`'s lookup spends the personal tier's budget
(`PERSONAL_MAX_FIGURES`, `PERSONAL_TABLE_TRIS`) in the same order. For a stream
whose viewer is player 0 — every committed recording, and a live seat — the order
is the placement order unchanged, so no corpus count moves.

**Rationale.** `layout()` places the seats in the wire's player order, and the
budget followed it: seen from seat 1 (`./scripts/spectate.sh --seat 1`, which the
audit used to see each villain deck from Pacho's chair — the composition a bare
`./scripts/play.sh` gives the user), the villains' twelve took every model and the
viewer's OWN creatures stood as discs under floating status strips. A seat's
eyes are what the arena is drawn for (M47: one seat's eyes); the viewer's own
figures are the ones the viewer plays. `figure-pose.test.ts` sees the committed
corpus from its other chair (the same boards, the viewer swapped): the budget binds
on 602 of 5,520 board frames, and in placement order the viewer's creatures would
have gone without on **599** of them (the four villain recordings); with the
budget order, no creature of the other seat carries a model while one of the
viewer's stands as a disc for want of one. Reverting the order fails it at
`villain-doom-248@305`.

**Rejected.** Alternating the seats (fairness to both, but the viewer's side is
the one read closest and played); raising `MAX_FIGURES` (a budget, D222 and
D233's tables are already over the lines); nearest-to-the-camera first (a pose that
depends on the view, which D85 rejected for the carriers).

---

## D267 — The arena's engine prompt is at most two lines on screen; the whole of it stays in the DOM, in its tooltip and on hover

*Branch `play-distance-audit`, its fix pass; the lane's reserved range D265–D269.*

**2026-09-29** (`docs/evidence/play-distance-audit.md` §10; the verifier's first
major finding)

**Amends** D265 point 1 (its worst case) and M7 E6's decision strip, whose prompt
was a fixed `max-inline-size: 46ch`. **Keeps** M4's and M7's rule that the
engine's prompt is rendered verbatim (`render/DecisionPanel.tsx`'s rule 1): the
text node is `input.prompt`, whole.

**Decision.**

1. **`.arena__decision .prompt` is clamped at two lines** (`HUD_PROMPT.lines` in
   `arena/hud.ts`; `-webkit-line-clamp`, an ellipsis where it is cut). The whole
   prompt is still in the DOM — the `role="status"` region announces all of it —
   it is the element's `title`, and hovering the prompt opens it in place (the
   column grows while you read and gives the band back when the pointer leaves).
2. **It starts from nothing and grows** (`flex: 1 1 0`) into the room the bar has
   beside its buttons, the bar still at most `min(1100px, 100% - 15rem)`: a short
   prompt keeps its buttons on its line, a long one takes the bar's width rather
   than its height.
3. `hud.test.ts` holds the stylesheet to both (the clamp at `HUD_PROMPT.lines`,
   the zero basis, no width cap, the hover, the tooltip) and sweeps every distinct
   prompt of the committed corpus through a per-line model (46 characters a line,
   a floor), Quake's 250-character targeting prompt the red case: unclamped it
   takes the modelled column to 185 px (Chromium drew 167.1); clamped, no prompt
   passes `HUD_TOP_PX`.

**Measured** (headless Chromium, every one of the corpus's 350 distinct prompts at
1280 × 800 and 1600 × 1000, each on the frame it first appears): before, **17** took
the column past 128 px at both sizes (130.7–167.1); after, **none** — at most
112.5, and **322** of them are shorter (one line where there were two: the column
94.7 px), none taller. The clamp cuts **3** at 1280 px — Quake's trigger twice and
Web Up's, 224–250 characters — and **none** at 1600, where the bar's 1,100 px holds
them in two lines; a spell's payment prompt (143 characters, "…then shuffle. Pay
Mana Cost: {1}{G}") is whole in two lines from 1280. The prompt measured 605–671 px
wide at 1280 for every prompt over 100 characters (342 before, the 46ch).

**Rationale.** The bar is the chrome column's first row, and the column is the
band every far-end pose is measured against (D85, D100, D265). A prompt of any
length wrapped it a line at a time — and the prompts that wrapped furthest were
targeting prompts, whose credit row and inspect chip then stood over the far
rank the prompt was asking you to click. The engine writes the context first and
the question last ("…[Card: …]\n\nSelect target creature or land"), so the
width matters as much as the clamp: at the old 46ch a two-line clamp would have
cut "Pay Mana Cost" off every spell cast at a live seat.

**Rejected.**
- **The clamp at the old 46ch**: 143 characters are four lines there, so every
  spell's payment prompt would have lost its question.
- **A 46ch basis that grows** (`flex: 1 1 46ch`): measured, a short prompt then
  pushes its buttons onto a second line of the bar — 27 prompts at 1280 px, the
  bar 28 → 52 px — because a wrapping flex line is filled by each item's basis.
- **Keeping the question line** — cutting the context and showing the last
  paragraph whole — reads structure into an engine string (M5 convention 4's
  spirit); owner question 39 offers it.
- **Letting the column grow while a long prompt is up**, or moving the credit row
  out of the flow when the bar grows: the first is the defect; for the second CSS
  cannot see the bar's line count, and a second home for the credit is a redesign.

**Amended by fix pass 2** (2026-09-29, after a second verifier;
`docs/evidence/play-distance-audit.md` §11). *"No engine prompt can grow the column
past `HUD_TOP_PX`" was true of the prompt alone.* The bar wrapped its items, and the
prompt's zero basis let anything beside it squeeze it: at `human-ability-42`@1060
(Quake's targeting prompt), `I` pressed with no card under the pointer put the
hint — "no card under the pointer and none clicked — …", where D241's key says it
did nothing — and the "Your turn" notice on a second line under the two-line
prompt: the bar 70.5 px, the column **136.7 px** at 1280 × 800 and at 1600 × 1000,
past the band, the credit row over the far rank. So:

4. **The bar is one line of items** (`.arena__decision { flex-wrap: nowrap }`).
   Each item is either one line that keeps its width — the engine's two buttons
   and Concede (`flex: none`) — or at most two lines that give way, cut past them
   and whole in a tooltip: the prompt (point 2), the watching line, the
   outlined-cards line (down to 11em, where "click one of the 16 outlined cards"
   is whole in two lines), the hint (to nothing) and the notice (kept whole up to
   16em: an engine title is short). So the bar is never taller than the prompt's
   two lines — 46.4 px, the column 112.5 — whatever it carries.
5. **The prompt never gives way below 46ch** (`min-inline-size: min(46ch,
   100%)`, 342 px at its 12 px): the width it had before this decision, two lines
   of about ninety characters.
6. `hud.ts`'s `DECISION_BAR` and `decisionBarOf` lay the bar out with the CSS
   flexible-lengths algorithm from the widths Chromium measured, and `hud.test.ts`
   holds it at 1280 and 1600 px with the corpus's longest prompt (250
   characters), the longest hint the arena writes (136, of 29 it scans from
   `keys.ts`, `inspect.ts` and `Arena.tsx`) and the longest notice title the bridge
   names (20, of 35) at once — and again with a 400-character hint and notice,
   the widest button labels and Concede armed: the bar 46.4 px, the column 112.4,
   the prompt at its floor or wider. The model agrees with Chromium at the Quake
   frame (the hint 194.1 px at 1280, 273.3 at 1600); the wrapping bar (70.5 px)
   and a floorless prompt are the controls.

Measured in Chromium at the Quake frame with `I` pressed: **136.7 → 112.5 px** at
both sizes; the hint two lines of 194.1 px at 1280 (273.3 at 1600), the notice
whole on one line, the outlined-cards line whole in two. The hint is cut in the
worst the model can build at 1280 — beside a 20-character notice, the
outlined-cards line and a two-line prompt it keeps 121 px, about sixteen
characters a line — and whole in its tooltip.

**Rejected** (fix pass 2): **the hint and the notice out of the flow** (the
verifier's first suggestion) — positioned, they cover something: the band has 16
px left under the column, not a line, and below the band is the far rank the band
keeps clear; **onto the strips row** — it has 28 px to spare at 1280 × 800 (993 of
1,021); **onto the credit row** — full at 1280 whenever the credit is long (905
of 1,021 px beside the chip's floor). Inside the bar, beside the control it
answers, one line of items costs nothing but a cut hint's tail, and the hint is
where a key reports it did nothing.

*Fix pass 3* (evidence §12.4): point 4's "whole in their tooltips" is held for
the notice as well as the hint. The fix pass set the notice's tooltip to its
title and the engine's text, but `hud.test.ts` matched `title={` and nothing
more — the verifier's `title={notice.title}`, which drops "card 9 cannot be
selected now", stayed green. It now matches the whole expression, and
`arena-hud.test.tsx` renders a real notice and reads its tooltip.

---

## D275 — The frame loop's anchor resolver allocates nothing: `anchorPositionInto` writes into the stage's one scratch tuple, the opponent's anchors are built once, and the resolver is in the allocation scan; the cue layer stays outside

*Branch `anchor-scratch`; the lane's reserved range D275–D277, one used.*

**2026-09-29** (GPU-pass follow-up 12; `docs/evidence/anchor-scratch.md`)

**Decision.** `EffectPool.bind` hands every non-figure effect's anchor, every
frame, to `SceneStage.positionOf`, and that reached `layout.ts`'s
`anchorPosition`, which built a `seatOfPlayer` closure and a fresh tuple on every
call — the turn banner (a `table` anchor) and the life number (a `player` anchor)
paid it on every frame they were live. So:

1. **The resolver writes into a tuple it is handed.** `anchorPositionInto(out,
   placed, ref)` answers `out` or `null`; every case sets three numbers and `out`
   is written once, at the end (a computed number handed to a call the compiler
   did not inline is boxed, and a store into a tuple of numbers is not). The
   closure is gone: `seatOfPlayer(id)` was `seatOf(id, placed.viewerId)` exactly,
   because `seatOf`'s first line already maps `null` to `you`. A card's answer is
   a copy of its placement's position, never the placement's own tuple.
   `anchorPosition(placed, ref)` stays, as the allocating form — it hands
   `anchorPositionInto` a fresh tuple — for a caller that keeps its answer: the
   tests, and the cue layer's two queries in `layout.ts` (`anchorDelta` for
   `deltaTo`, `figureYawTo` for `yawTo`). Nothing outside `layout.ts` calls it.
2. **`SceneStage.positionOf` resolves into the stage's ONE scratch tuple** (`#at`),
   so its answer is overwritten by its next call. Every caller was traced first:
   the effect pool reads each answer before it resolves another (`#apply` copies
   `at` into locals before a beam's, mote's or cloud's far end; `#streak` copies
   `to` before `from`; `#beside` and `#figurePoint`'s card fallback read at once);
   the casting field's tethers read at once; and **the camera director KEPT every
   point it framed** (`points.push(point)`), so a two-anchor shot through the
   scratch would have framed its last anchor twice — the attack's swoop, `[card,
   combat lane]`, the lane twice and the attacker not at all — so it copies each point
   (`camera.ts`, the one change outside the resolver and the stage; its copy is
   the tuple the resolver used to allocate, on a cue's camera request, not the
   frame loop). The test-only callers (`stack`, `facing`, `liveness`) keep the
   allocating form.
3. **The opponent's anchors are built once.** `anchorsFor('opp')` built nine
   anchor objects and a closure on every call, and `playerAnchorFor('opp')` one
   object; both now answer module constants built by the same mirror at load
   (`-0` included: the command anchor's z). `anchorsFor('opp')` was the dearest
   thing the resolver reached — 818 GC events per 5M calls for an opponent's
   `zone`, `combat` or `casting` anchor, against 43 for a `table` — and it is also
   what `layout()`, the casting field's forms and motes, and the silhouettes call
   for every opponent's placement.
4. **`placementOf` is an indexed walk**, from the end for a `c:` placement of the
   card, then forward for any: exactly `byKey`'s answer, because `byKey` is
   written placement by placement (the LAST with a key wins) and a `c:` key is
   always `c:<its cardId>`. The `c:${id}` key string it built a call is gone.
5. **The resolver is in the allocation scan.** `anchorPositionInto`,
   `restPositionOf`, `placementOf`, `isCardKey`, `seatOf`, `playerAnchorFor`,
   `anchorsFor` and `zoneAnchor` are in the GPU pass's body list in
   `liveness.test.ts`, with its junk-line controls; a clause fails any call in
   those bodies to a function the list does not name (the control: a spliced
   `frontStand(`); `SceneStage.positionOf` is anchored to
   `anchorPositionInto(this.#at, …)`; the callers of `stage.positionOf` are a
   closed list (`CueRunner`'s three), so a new one is traced for the scratch
   before it lands; the director's copy is anchored; and `anchorPosition(` outside
   `layout.ts` fails.

**Measured** (`tools/anchor-gc-probe.ts`, new: Node v24.20.0, no flags, a fresh
process per case, `g1.jsonl`@316, 500,000 calls to warm then 5,000,000 counted by
a `PerformanceObserver`'s `gc` entries; two runs each, identical). Through
`stage.positionOf`, the frame loop's path, GC events per 5M calls before → after:
`card` 14 → **0**, `player` (yours) 43 → **0**, `player` (the opponent's) 114 →
**0**, `zone`/`combat`/`casting` (yours) 43 → **0**, (the opponent's) 818 → **0**,
`stack` 43 → **0**, `table` 43 → **0**, `above`/`beside` 57 → **0**, `figure` (it
resolves nothing here) 0 → 0, every kind in turn from the first call 269 → **0**
(in this probe's loop; a loop of another shape read 3 until the fix pass below);
the controls a fixed tuple 0 and a kept fresh tuple 43 in both trees. The base
tree's 43, 14 and 0 are §13's numbers exactly, read by a script of the same shape
(§13's was lost with its worktree). `EffectPool.bind` over a turn banner and a life
number, per 2M binds: 38 → **3** — and 0 for either alone, so the 3 is the
engine-level residue §13 found in `#apply` with more than one effect live, not
the anchor. The allocating form reads a tuple's 43 for every kind that resolves
after, by contract, and 19 for `figure` (a tuple for an answer of `null`). The
card path's walk costs about 10 ns a call more than the Map it replaced (33–34
against 23–26 ns at `g1`@316); a frame resolves a few dozen anchors at most.

Unchanged: every answer. `web/test/anchors.test.ts` keeps the resolver as it stood
at `0a93c9d` as a test-local reference and compares it, `Object.is` per number,
with `anchorPosition`, `anchorPositionInto` and `SceneStage.positionOf` over every
anchor kind of every board frame of the 23 committed recordings from four chairs
(16,001,784 answers, 0 differences), `placementOf` by identity and `anchorDelta` and
`figureYawTo` (3,534,795 each, 0), the effect pool bound through the scratch
against fresh tuples (4,820 binds of random effects of every kind, 0 slot values
different), and the director's shot through the scratch against fresh tuples
(equal; a director that kept the scratch frames a different shot, the control).
Eleven source splices each turn a test red (the evidence's §4; fifty after the fix
pass, §9).

**Rationale.** The resolver's cost was per live effect per frame and bought
nothing — a tuple read once and dropped — so it goes, and the module that knows a
coordinate stays pure (no state: the scratch is the caller's). **The cue layer
stays outside the scans, by design.** A cue is a pure function of its own `t`
that writes values (D50, M7 convention 3): each frame it builds its effect
objects, their anchor refs and their key strings, and asks `deltaTo` and `yawTo`
for tuples it composes. Its allocation is a few small objects per live cue, gone
in the next scavenge; pooling it would make an effect an object the stage owns
across frames and a cue a writer into it — a renderer that remembers, which is
the defect Tier 2's first convention names. The resolver is the line: what the
scene reads every frame is scanned, what a cue decides every frame is a value.

**Rejected.**

- **A scratch in `layout.ts`** — state in the pure module, shared by the stage
  and the cue layer's queries alike, so one could overwrite the other's answer.
- **Two alternating scratches, as `#figurePoint` has** — right for two answers
  and silently wrong at a third; the director frames every anchor a request
  names — two today, and nothing bounds it.
- **Answering a card with its placement's own tuple** — identical to before, but
  any caller could then write the layout through its answer; the copy is three
  stores.
- **A `byCard` map on `Layout`, built in `layout()`** — the tests' hostile layouts
  spread `...placed` over new placements and would carry a stale map; and a
  per-layout `WeakMap` index is module state whose build lands on the first frame
  after each snapshot.
- **Pooling the cue layer's effect objects** (above).

**The fix pass (2026-09-29, after a verifier).** *"Allocates nothing" was true of
the source and not of every compiled form of it.* The verifier's own probe — a
module-level loop calling `stage.positionOf` over every kind in turn and reading
the answer's first number — read **3** GC events per 5M calls on the first cut in
6 runs of 6, where `tools/anchor-gc-probe.ts`'s `mixed` read 0; and the evidence
had put the in-process mode's 2–4 for `above` down to the probe's own ref. Both
were the resolver's (`docs/evidence/anchor-scratch.md` §9):

1. **What boxed.** V8 gives every `ref.id` read in one function ONE feedback slot
   (the bytecode generator shares a named load's slot per variable and name), so
   the `card`, `above` and `beside` cases' reads recorded three shapes of ref
   between them. In the compiled states where the optimising compiler
   (Turbofan; with Maglev as the top tier the count was 0) still held those three
   maps for `ref` at `ref.height` — which states those were turned on the mix of
   shapes and on what was inlined and when, and could not be predicted from the
   source — it compiled the read as a polymorphic load that finds nothing on two of them,
   so its answer was `undefined` or the number, a tagged value, and a fractional
   height was boxed into a fresh 16-byte heap number on every `above` call
   (`--print-opt-code`: an `AllocateInYoungGeneration` of 0x10 and a
   `heap_number_map` store inside `anchorPositionInto`; a sampling heap profile
   put all 5.7 MB of the 5M calls there). A whole height took the small-integer
   path and boxed nothing; `beside`'s offset boxed the same way (a 1.5).
2. **The fix: the two cases read their ref through a name of their own**
   (`const above = ref;`, `const beside = ref;`). `above.id` then has a slot of
   its own that only ever sees an `above` ref, so the compiler knows the shape
   and reads the height as the double it is. No answer moved (the corpus sweep,
   16,001,784, 0). Chosen by a matrix — every kind and eleven subsets of kinds,
   each with fractional and whole numbers, a fresh process each — over two other
   forms: reading the number before `ref.id` (53 events over the matrix, where the
   first cut read 9: it boxed in the subsets instead), and destructuring
   `const { id, height } = ref` (24); the case-local name read 0 in every cell.
   esbuild keeps the name (`const a=t,o=Yb(e,a.id)` in the built chunk).
3. **Measured after**, Node v24.20.0, no flags, two interleaved runs a tree (every
   count within one event of its twin):
   the verifier's state (`tools/anchor-gc-direct.ts`, now committed, every kind,
   height 0.6) **3 → 0**; the probe's new `set` and `direct` cases, twelve sets of
   kinds × three pairs of numbers each, 0 on all 72 (the first cut 1–3 on eight,
   the base 35–335); the in-process mode, `above` 3 and `beside` 2 → 0; and on the
   pool's own path, `EffectPool.bind` over every anchor kind at once (a banner, a
   life number, a glow on a card, a strand from above a card, two glows beside
   one, a mote to a casting anchor), per 2M binds: 733 (base) → 72 (first cut) →
   **68**, where the same effects bound through each answer looked up once read 68
   in every tree — so the resolver's share on the pool's path is now 0, and the
   68 (and the banner-and-life 3) are the pool's own, §13's residue.
4. **Held.** `liveness.test.ts` fails a number read off `ref.` in the resolver
   other than its `kind`, `id`, `player`, `zone` and `ground`, and anchors both
   aliases. Three gaps the verifier found in the scans are closed with them: the
   purity clause for `layout.ts`, `camera.ts`, `colour.ts` and `governor.ts` now
   rejects a clock, a timer, the DOM, storage, `Math.random`, a module-level
   `let` or `var` and a module-level `new` not typed `Readonly…` (it checked
   imports only); the allocation patterns reject a string literal joined with `+`
   (`byKey.get("c:" + id)` passed); and the resolver's bodies may call no method
   but a string's `charCodeAt` and `Math`'s (a member call passed the helper
   clause). `anchors.test.ts` binds the casting field through the scratch and
   through fresh tuples over every board frame's stack and random tethers, 1,320
   binds and 3,111 tethers, 0 differences, with a resolver read late as the
   control — the one caller that had no test. 50 source splices (52 test runs),
   every one red.

*Allocation-free is a claim about the compiled states measured.* The scans hold
the source; a GC probe is the engine's and stays out of the gate; and the state
that boxed moved with as little as two more `import`s in the measuring script. So
the reproducer is kept as it ran, and the arena `CLAUDE.md`'s GPU rule 2 names the
trap: a fractional number read off a shape-shared name.

---

## D280 — A read-only observer socket, `/observe`, on the seat's port: the seat's own frames by reference, caught up from the transport's cache, and nothing an observer does reaches the seat

*Branch `c/observe-endpoint`; the lane's reserved range D280–D284, three used.*

**2026-10-01** (amendment **M50**; the owner's approval, for ForgeCoach)

**Decision.** `WsTransport` serves a second websocket path, `/observe`, beside
`/ws`. An observer is caught up on connect from the strings the transport
already caches for the seat — `hello_ok`, the last `state`, this game's `over`
or else its last `input`, every outstanding `ask` — and then handed every frame
`push()` is handed, the same string the seat gets, so the same bytes, `seq` and
redaction. It never counts as the seat: `connected()`, the ask timeout, the
4001 refusal, `onResync`, `onDisconnect`, `ReplyPool.reopen` and the frame log
see `/ws` only, and everything an observer sends is released unread. Catch-up
and fan-out run under one monitor in the transport, so an observer sees no gap
and no duplicate between them. `README.md`'s *no spectators* non-goal is lifted
in part to exactly this.

**Rationale.** ForgeCoach follows a game while it is played. Its only options
were the seat socket — which, admitted first or during a board reload, *took the
seat*: asks went to a client that never answers, the board was refused 4001 and
stopped retrying, and on its disconnect M19's `cancelAll` spent the parked asks
on §5.4's defaults, while M16 wrote its connect into the player's log as a
`resync` — or polling `frames.jsonl` through a file server the user starts by
hand. The transport already holds every string a follower needs and already
caches what a late joiner needs, all built on the game thread and gated by
`Snap`; a copy of those strings is a follower that cannot see more than the seat
and cannot walk a view (hard rule 3), and adds no fourth `CardView` exemption
(hard rule 10). The cached `input` is the seat's M42 rule read off the stream
(`hello_ok` clears it, only a push sets it), and `over` takes its place once a
game is over because nothing but `over` follows it on the seat's stream
(`OverRaceSelfTest`'s invariant) — the seat would never be sent that stale
`input` again, so an observer must not be either.

**Rejected.**

- **Letting a second `/ws` client in as read-only** — M13's refusal is how the
  board knows not to fight another board, and "the seat is whoever connected
  first" is exactly the hazard; a separate path makes read-only a property of the
  URL, not of a client's good behaviour.
- **Calling `onResync` for an observer's catch-up** — it re-emits a fresh,
  logged `input`, writes a `resync` line into the player's log (M16) and gives
  the seat a frame it did not ask for.
- **Re-delivering the seat's verbatim repeats and `seq: 0` frames to observers**
  — a repeat is one the observer already has, and each out-of-band frame answers
  something the seat's own connection did (its ping, its refused twin, its
  dropped frame).
- **An omniscient observer** — that is a new redaction mode (*Spectating*'s
  rule); an observer is the seat's eyes and no more.
- **A second port** — one more thing for `play.sh` and ForgeCoach to find, and
  the `/health` readiness rule would have to be stated twice.

## D281 — Both socket paths check `Origin` against `config.json`'s `wsAllowedOrigins`: no header is allowed, loopback on any port and ForgeCoach by default, and anything else is a 403 before the handshake

*Branch `c/observe-endpoint`; the lane's reserved range D280–D284.*

**2026-10-01** (amendment **M50**)

**Decision.** `WsTransport`'s `Door` handler, ahead of netty's handshake, reads
the upgrade request's `Origin` on `/ws` and on `/observe`. **No header** is
allowed. Otherwise the origin must equal an entry of `config.json`'s
`wsAllowedOrigins`, or match an entry ending `:*` with any port or none; the
default — also what a config without the key gets — is `http://127.0.0.1:*`,
`http://localhost:*` and `https://jalirkan.github.io`. Anything else is answered
**HTTP 403** with `Connection: close`: no socket, no `notice`, nothing counted as
a connection, one `WS ORIGIN REFUSED` stderr line and a count in the run summary.
Entries are validated and lower-cased at startup (`scheme://host`,
`scheme://host:port` or `scheme://host:*`, http or https), so a typo stops the
bridge rather than locking the board out; `[]` admits non-browser clients only.

**Rationale.** README's *the socket binds loopback and trusts whatever
connects* assumed loopback keeps strangers out. It keeps out other machines, and
nothing else: a websocket is not subject to CORS, so any web page the user has
open could open `ws://127.0.0.1:8642/ws` while the board was not connected and
send `act: concede`, or hold the seat and sit on every ask. A browser always
sends `Origin` on the upgrade and script cannot set it, so it is the one header
that tells the board's page from someone else's. A non-browser client sends
none — measured: Node's global `WebSocket` (`tools/ws-smoke.mjs`,
`tools/ws-auto-play.mjs`, `web/test/`) and the JDK's — and a local process could
forge any header anyway, so refusing a missing header would break every tool and
protect nothing. The board is served from the Vite dev server or `vite preview`
on a loopback port by either name, so the loopback entries take any port;
ForgeCoach is an https page whose origin carries no path.

**Rejected.**

- **A token in the URL** — the board would have to learn it from somewhere the
  attacker's page cannot read, which is a second channel to build; and every
  tool and recording command would change.
- **Checking `Host` instead** — that answers DNS rebinding, not a page on
  another origin connecting straight to `127.0.0.1`.
- **Exact ports for the board** — `webPort`, `vite preview`'s 4173 and a dev
  server that moved to a free port would each need a config edit.
- **Allowing `"null"`** — every `file:` page and sandboxed frame shares it.

## D282 — Fan-out to observers is bounded per observer: 8 MB handed and not yet flushed, and an observer past it is disconnected at once, never waited on

*Branch `c/observe-endpoint`; the lane's reserved range D280–D284.*

**2026-10-01** (amendment **M50**)

**Decision.** `push()` — called from the game thread, the EDT and the io and
netty threads — encodes a frame once and hands each observer a reference-counted
duplicate with `writeAndFlush`, which off the event loop is an enqueue. Each
observer counts the bytes it has been handed and not yet flushed (decremented by
the write's own completion); a frame that would take it past
`OBSERVER_BACKLOG_BYTES` (8 MB) removes it from the set and closes its channel
at once, with no close frame, so the client sees 1006 and may reconnect for a
fresh catch-up. The seat's own writes are unchanged.

**Rationale.** A follower is a page in a tab the user may background, or a
machine that sleeps with the socket open; netty buffers without limit, so an
observer that stops reading would grow the bridge's heap a full `state` at a
time, and anything that waited for it would stall the game. Counting our own
bytes needs no netty internals (water marks count differently on and off the
event loop) and makes the bound exact. 8 MB is about a hundred of the corpus's
largest `state` frames: a reader that is merely slow never nears it. A close
frame would queue behind the backlog that is the problem. Measured by
`WsObserveSelfTest`: an observer with a 4 KB receive buffer that never reads is
dropped while 384 frames of 64 KB (24 MB) are pushed past it, and the 384
pushes return in 95–122 ms (five runs, this sandbox's 4 cores) — under a third
of a millisecond each, with the encoding.

**Rejected.**

- **Dropping frames for a slow observer and keeping it** — a follower with a
  hole in its stream renders a board that never happened; disconnecting it and
  letting it catch up from the cache is honest.
- **Blocking `push()` on a full observer** — the game thread would wait on a
  browser tab.
- **A cap on the number of observers** — each is bounded, a loopback page is
  already Origin-checked, and the owner asked for any number.

## D285 — `./scripts/play.sh --engine-only` is the bridge alone, for ForgeCoach: `play.sh`'s steps 1–4 and then a wait, with the match flags and defaults unchanged

*Branch `c/engine-only`; outside the observer lane's reserved range D280–D284 (its D283 and D284 stay unused, D200).*

**2026-10-01** (the owner's approval, for ForgeCoach)

**Decision.** `scripts/play.sh` takes `--engine-only`. It runs check-forge, the
build, the bridge in the background (`var/play/server.log`) and the `/health` poll
exactly as a bare run does, skips the `web/node_modules` check, vite and the
browser, prints `Engine ready on ws://127.0.0.1:<wsPort>/ws — open
https://jalirkan.github.io/ForgeCoach/ and click Play`, and `wait`s on the JVM. It
ends on Ctrl-C or SIGTERM (a trap runs `stop()`, which TERMs the JVM, waits up to
3 s, KILLs what is left and reaps it, and the script exits 0) or when the JVM
exits on its own — the match over and the linger window closed — in which case it
prints the log's last lines and exits with the JVM's status. Every match flag
(`--deck`, `--ai-deck`/`--deck2`, `--ai-profile`, `--mirror`, `--seed`, `--games`,
`--port`, `--no-keep-open`, everything after `--`) and both defaults (`--games 3`,
`--keep-open`, D106's `config.json` `match` block) are the same code path as a
bare run, because it is the same script. `--arena`, `--web-port` and `--no-open`
are accepted and mean nothing.

**Rationale.** The owner now plays ordinary games from ForgeCoach, which connects
from his browser to the seat socket; the origin is already allowed (D281). He needs
the engine and nothing that competes for the seat: an open mtg-table board tab is a
`/ws` client, and the first one takes the seat while the second is refused 4001
(M13), so "start `play.sh` and ignore its tab" is not an option, and `--no-open`
alone still leaves vite running for nothing. `--keep-open` and three games stay the
default because the need is M6's own: ForgeCoach's New game / Next game, like the
board's row, appears at an `over` and needs a JVM that has not exited. A flag on
`play.sh` rather than a new script because steps 1–4 are 140 lines of match setup
— the `--deck`/`--ai-deck`/`--ai-profile` validation, which must fail in a second
and not after a build (M44), the `config.json` defaults, the games rule and the
`--` passthrough — plus the `/health` poll and the stop function; a second script
would copy them and drift, and the two would disagree about what "the match" is.
`spectate.sh` is a separate script for the opposite reason: it runs a different
class (`RecordMatch`) with different flags.

**Measured** with the pinned jar (sha256 `3c0a7c38…8e5dd9`), `--engine-only --seed 42
--games 1 --port 8672`: `/health` answered `ok`; a Node `WebSocket` to `/ws` with no
`Origin` received `hello_ok` (seq 1) and `state` (seq 2); `kill -INT` of the script
printed `signal received` and `stopping the bridge`, left no `play.sh` or JVM
process and no listener on 8672, and the script exited 0. It was not run through
the full gate (nothing under it reads `scripts/`).

**Rejected.**

- **`scripts/engine.sh`** — see the rationale; and it would be a third place that
  says what a match is.
- **`--no-open` plus telling the owner to close the tab** — vite still runs, and the
  failure (a refused seat, or worse a board that took it first) is silent from
  ForgeCoach's side.
- **Exiting 130 on Ctrl-C** — `play.sh` has always exited 0 when stopped, and the
  stop is the only way this mode ends in normal use.
- **Letting `--engine-only` default to `--games 1`** — ForgeCoach's New game / Next
  game would then find a closed socket, which is M6's dead end again.


## D286 — A human seat has no wall-clock limit on a game; an unattended `ws` session ends after an hour with no client, and `--game-timeout` / `--idle-timeout` say otherwise

*Branch `c/game-timeout`; outside every reserved range (D285 is the last number written; D200).*

**2026-10-01** (the owner's request: he plays real games from ForgeCoach, and a slow thinker must never lose one to a timer)

**Decision.** `MtgTable` no longer applies its flat 900 s wall clock to a seat a
person is playing.

- **The limit is per transport.** `--transport ws` and `--transport console` have
  **no** limit on a game by default; `--transport null` and `auto` keep 900 s,
  exactly as before. `--game-timeout <sec>` overrides either way (`0` is none), and
  the run prints `game limit = …` at the top of the park so a log says which rule
  it ran under. `RecordMatch`'s own 600 s is a different process and is untouched.
- **A `ws` game with no client attached has its own limit.** The engine parks on
  the seat's `input` with no deadline of any kind — only an `ask` has one, and
  only `NO_CLIENT_ASK_TIMEOUT_MS`'s 120 s while nobody is connected, after which it
  takes §5.4's default and the game parks again on the next `input` — so the
  wall clock was the only thing that ended a session nobody was attached to (a
  bridge started by `play.sh --engine-only` and never opened, or a tab closed
  mid-game). `NO_CLIENT_GAME_TIMEOUT_SEC` = **3600 s** replaces it: the clock runs
  only while no `/ws` client is connected, restarts each time one leaves, and
  never counts an `/observe` follower (`WsTransport.connected()` is `/ws` only, so
  ForgeCoach's read-only follow cannot keep a seatless JVM alive).
  `--idle-timeout <sec>` overrides it (`0` is off). On expiry the run prints
  `ABANDONED: no client connected for N s`, the summary says so in place of "the
  game thread is wedged", and it exits 1, as a timeout always did.
- **The gate and the tools need no edit.** Every JVM step already runs under the
  shell's `timeout` (`GAME_TIMEOUT`, 300 s; D129), which is the protection for
  an automated run over `ws`, and the transports they use with nobody at the
  keyboard (`null`, `auto`) keep the in-process 900 s unchanged.
- **No wire change, so no protocol amendment**: no frame, field or act moved; the
  only observable difference is how long the JVM lives.

**Why it existed.** `GAME_TIMEOUT_SEC = 900` was written at M0/M1 ("give up
rather than hang forever if the engine wedges") for the automated runs, when
every game was a machine's. It first cost something at M4, where a live game
driven one browser round-trip per click for thirteen turns hit it (PLAN.md, M4's
harness note: "a human plays faster than one tool call per click"), and it was
never revisited. Nothing in the history ties it to a leak guard; the leak it
incidentally prevented is the one above, which is why that case gets its own
limit rather than being dropped.

**Rejected.**

- **Raising the constant** (to two hours, say) — a long game is not a bounded
  quantity, and any number is a game some player loses to it.
- **Removing it everywhere** — an automated `null` / `auto` run that wedges would
  hang a hand-run script for ever; only the gate has the shell `timeout`.
- **Pausing the clock while an `input` or `ask` is outstanding** — the seat is
  almost always in one, so it is the same as no limit, with a more complicated way
  to get there.
- **A `config.json` key** — the only values anyone sets are for a test, and the
  flags are what the gate's and the tools' command lines already use; a key would
  be a third place that says what the limit is.
- **Letting the observer count as a client** — ForgeCoach follows read-only on
  `/observe` and could then hold a seatless JVM for ever; D280 already says an
  observer reaches nothing the seat's lifecycle reads.

**Measured** with the pinned jar (sha256 `3c0a7c38…8e5dd9`), port 8682, seed 42:
`--transport ws --idle-timeout 6`, no client: `ABANDONED` after 6 s, `finished =
false`, exit 1. `--idle-timeout 5` with a client connected for 20 s: the JVM was
alive at 21 s, long past the 5 s limit, and `ABANDONED` fired about 5 s after the
client left. `--transport ws --game-timeout 4`: `TIMED OUT after 4s`.
`--transport null`: `game limit = 900 s (the default for --transport null)`,
`MTGTABLE OK`. A bare `ws` run prints `game limit = none … ends after 3600 s with
no client connected`. `bridge/build.sh` (lint, its self-test, javac and the six
self-tests) and `web/test/claude-md.test.ts` pass. The full gate was not run.

## D287 — LAN play binds every interface behind a per-run pairing token: 128 random bits in the URL, required of every non-loopback request and never of a loopback one

*Branch `c/lan-play`; the lane's reserved range D287–D289, all three used.*

**2026-10-01** (amendment **M51**; the owner's approval: play from a phone on the same Wi-Fi)

**Decision.** `MtgTable --transport ws --lan` (and `scripts/play.sh --lan`, which
implies `--engine-only`) binds `0.0.0.0` instead of `127.0.0.1` and mints a token
per run — `SecureRandom`, 16 bytes, base64url without padding — printed only in
the phone URLs, one per non-loopback IPv4 address with the default route's source
address first. `WsTransport.LanGate`, the first handler after the HTTP codec on a
LAN server and absent otherwise, answers 403 to any request from a non-loopback
peer that does not present it: `?token=` on `/ws` and `/observe`; `?token=` or the
`mtgtable_token` cookie (`HttpOnly`, `SameSite=Strict`, set on an HTML response to
a request that carried the token in its query) on everything else, `/health`
included. Loopback peers pass untouched. The compare is SHA-256 of both sides
through `MessageDigest.isEqual`. A refusal logs the method, path and peer, never
the token; the token stays in `var/play/server.log` (gitignored), where `play.sh`
reads the URLs from.

**Rationale.** A phone can only reach the bridge over the network, and the seat
is the whole game: a stranger's connection could concede, sit on every ask, or
read the board. The Origin check (D281) does not help — a non-browser client
sends whatever header it likes — so something the stranger does not have is
needed, and on a home network with no accounts (README's NON-GOALS) a secret in
a URL the owner opens is the smallest such thing: no pairing screen, no store, a
new one on every run, and a QR code makes it one scan. 128 bits cannot be
guessed online at any rate a bridge can answer. The cookie exists because a
browser requests the page's assets without the page's query string and the
owner's page must load; it is never accepted on a socket, where the client
(ForgeCoach) sends the query itself, so a cross-site page cannot ride it to the
seat. Loopback keeps needing nothing because the desktop already trusts its own
processes (D281's reasoning) and the github.io flow must not change.

**Rejected.**

- **A token on loopback too** — github.io's ForgeCoach, `play.sh`'s poll and
  every tool would need it, and a local process could read the log anyway.
- **Static assets without the token** — they are public ForgeCoach files, but a
  server that answers anyone on the network is one more thing to reason about;
  with the cookie nothing is served to a peer that has not shown the token.
- **The token on the command line from `play.sh`** — visible in `ps` to every
  user of the machine; minted in the JVM, it appears in one file under `var/`.
- **TLS** — a self-signed certificate is a warning page on the phone and a
  public one needs a name; the token is for a network the owner trusts, and the
  docs say exactly that.
- **A cookie on the socket** — a cookie rides along with any request to the
  host, so it would make the Origin check the only defence again.

## D288 — On a LAN server the page the bridge served is its own Origin, for non-loopback peers only; and `--site-dir` serves a static directory at `/` with no way out of it

*Branch `c/lan-play`; the lane's reserved range D287–D289.*

**2026-10-01** (amendment **M51**)

**Decision.** (1) `Door` admits, in addition to M50's `wsAllowedOrigins`, an
`Origin` equal to `http://` + the request's `Host` (validated as a name or IPv4
address with an optional port), **only on a LAN server and only from a
non-loopback peer**. (2) `--site-dir <dir>` (with or without `--lan`) adds
`WsTransport.Site` between `Health` and `Door`: `GET`/`HEAD` only, `index.html`
for `/`, the path percent-decoded and refused (403) if it holds a NUL, a
backslash, a `.` or `..` segment or a doubled leading slash or normalises
outside the root, 404 unless it names a regular file (no directory listing),
403 if the file's real path leaves the root, content types by extension with
`.gz` as `application/octet-stream` and no `Content-Encoding` anywhere,
`Cache-Control: no-cache` and `Referrer-Policy: no-referrer` on HTML,
`nosniff` on everything. The file is read whole on the event loop (at most
64 MB; ForgeCoach's largest is about 1 MB). `/ws`, `/observe` and `/health`
pass through it. (3) `Door` strips a query from a socket path's URI before the
handshake.

**Rationale.** (1) The phone's page is served by the bridge at the address the
phone typed, so its origin is `http://<that address>:<port>` — a different value
for every network and every DHCP lease, which no allowlist can name. Matching it
against `Host` is the same-origin rule a browser itself applies; a page from
elsewhere has its own origin, which matches nothing. Restricting it to
non-loopback peers closes DNS rebinding: a hostile name rebound to 127.0.0.1
sends `Origin: http://evil:8642` with `Host: evil:8642`, which would match, and a
loopback peer needs no token — so for loopback, M50's list alone decides. A
rebinding attack on the LAN address still needs the token. (2) Serving a static
directory is the smallest thing that gets the page and the socket onto one
origin; netty is already in the jar, and the handler is one class. The site is
the attacker-reachable surface, so path handling is belt and braces: textual
refusal before the disk, `normalize` + `startsWith`, then the real path again,
each held by `WsLanSelfTest` (and a symlink out of the root by a planted link).
`.gz` must not be `Content-Encoding: gzip`, or the browser hands ForgeCoach the
inflated bytes and its own `DecompressionStream` fails on them. `index.html` is
`no-cache` so a refreshed site is picked up; the hashed assets may be cached.
(3) Netty's handshaker compares the URI exactly, and `/ws?token=` must
upgrade; stripping it also keeps the token out of anything later in the pipe.

**Rejected.**

- **Allowing every `http://` origin on a LAN server** — any plain-http page
  open in the desktop's browser, where no token is needed, could then take the
  seat, which is the hole D281 closed.
- **Listing the LAN address in `wsAllowedOrigins`** — it changes with the
  network; a config edit per Wi-Fi.
- **Serving the site from a second port or from vite** — a second origin is the
  mixed-content problem again, and vite is a dev server with a dependency tree.
- **A directory index or an SPA fallback** — ForgeCoach routes by hash, and a
  listing is a map of the disk for anyone on the network.

## D289 — `play.sh --lan` fetches ForgeCoach's built site as a zip from its Pages site, caches it a day under `var/forgecoach/`, and falls back to the cache offline

*Branch `c/lan-play`; the lane's reserved range D287–D289.*

**2026-10-01** (amendment **M51**)

**Decision.** Unless `--site-dir` names a local build, `play.sh --lan` downloads
`https://jalirkan.github.io/ForgeCoach/forgecoach-site.zip` (ForgeCoach's own
build with Vite's `base: './'`, files at the zip's root) with `curl` into
`var/forgecoach/forgecoach-site.zip` when there is no copy, the copy is older
than a day, or `--refresh-site` is given; a download is accepted only if it is a
complete zip (`unzip -t`). If the download fails, the cached copy is used and its
date printed; with neither, the script stops before the build with a message
naming the URL, the cache path and `--site-dir`. The zip is unpacked (`unzip`, or
Python's `zipfile`) into `var/forgecoach/site.new`, checked for `index.html` at
its root and swapped into `var/forgecoach/site`, whenever it is newer than the
last unpack. The bridge gets `--lan --site-dir var/forgecoach/site`. After
`/health`, the script reprints the bridge's `WS LAN PAGE` lines — the best guess
first, the rest as alternatives — and, if `qrencode` is installed, a terminal QR
code of the first; without it, nothing is said.

**Rationale.** The site belongs to ForgeCoach (its own repository, its own
release cadence); copying it into this repo would be a second copy to drift, and
building it here would need its toolchain. Its Pages site is already where the
owner gets ForgeCoach, so a zip beside it is the same trust and the same
version. A day is long enough that a game night needs no network and short
enough that a ForgeCoach fix arrives without a flag. `var/` is where this repo
keeps everything it downloads (hard rule: write only under the repo), and the
swap through `site.new` means a failed unpack never leaves a half site.

**Rejected.**

- **Vendoring the built site** — another project's build output in this repo's
  history, stale on every ForgeCoach change.
- **Downloading on every run** — the game would need the internet to start.
- **The bridge fetching it** — Java's HTTP client through the user's proxy
  settings, in the process that holds the seat; a shell `curl` is simpler and
  fails before anything is built.

**Measured** with the pinned jar (sha256 `3c0a7c38…8e5dd9`) in a container
whose one non-loopback address is `192.0.2.2`, `./scripts/play.sh --engine-only
--lan --port 8692 --site-dir <ForgeCoach built with --base ./> --seed 42`: it
printed `http://192.0.2.2:8692/?token=<22 characters>`. Through `192.0.2.2`: the
page 403 without the token and with a wrong one, 200 with it (`text/html;
charset=utf-8`, `no-cache`, the cookie set); the page's JS 403 without the
cookie, 200 with it (`text/javascript`); `samples/human-auto-42.jsonl.gz` 200,
`application/octet-stream`, no `Content-Encoding`, byte-identical to the file;
`/health` 403 without the token, 200 with it; upgrades to `/ws` and `/observe`
403 without the token and with the cookie alone, `/observe` 101 with the token
and `Origin: http://192.0.2.2:8692`, 403 with a foreign Origin; a Node
`WebSocket` to `ws://192.0.2.2:8692/ws?token=<T>` received `hello_ok` (seq 1).
Through `127.0.0.1`, no token: the page 200, `/health` 200, `/ws` `hello_ok`,
and `Origin: http://evil.example:8692` with `Host: evil.example:8692` 403.
`/../../../etc/passwd` (sent as is), `/%2e%2e/%2e%2e/etc/passwd` and
`/assets/..%2f..%2f..%2fconfig.json` 403; `/assets/` 404; `POST /` 405. Ctrl-C
left no process. The cache path: no cache and the zip not yet published (404) —
the script stopped before the build with the message above; a two-day-old cached
zip and a 404 — `could not download it; using the cached copy of …`, unpacked,
served. `bridge/build.sh` (the lint, its self-test, javac and the seven
self-tests) passes; `WsLanSelfTest` fails under each of five planted mutants
(the gate always admitting, the same-origin rule on loopback, no real-path
check, the cookie opening a socket, `.gz` as `application/gzip`). The full gate
was not run.


## D290 — The `blockers` event drops Forge's unblocked-attacker sentinel: an unblocked attacker is `blockerIds: []`, as `state.combat` says, and readers accept the old `[n]` from every recording made before

*Branch `c/blockers-event`; D290 alone (the test-gaps lane, working at the same time, has written none).*

**2026-10-01** (amendment **M52**, superseding **M7**; for ForgeCoach, whose
coach and post-game review read the event and told the owner an unblocked
attacker was "blocked by itself")

**Decision.** `Snap.block` writes each entry of the `blockers` event's `blocks`
with the attacker's own id dropped from its `blockerIds`, so an unblocked
attacker is `{attackerId: n, blockerIds: []}`. Every attacker keeps its entry.
The committed recordings are not re-recorded: they keep `[n]`, and every reader
— this repo's and ForgeCoach's — reads `[n]` with `n === attackerId` as `[]`.
Gate step 6 (`tools/wire-drift.mjs`) and 9b (`tools/fixture-multiset-diff.mjs`)
read both files' self-blocks as `[]` when the committed file carries one, and
say how many.

**Rationale.** `javap -c forge.game.phase.PhaseHandler` on the pinned jar shows
the payload: for every attacker of every defender the defending player controls,
`putAll(att, combat.getBlockers(att).isEmpty() ? List.of(att) : combat.getBlockers(att))`.
The attacker is a sentinel for "nobody blocked it", and Forge's own reader of the
event, `GameLogFormatter`, treats it as one (an empty list or a first value equal
to the key is "didn't block"). M7 (2026-09-11) chose to relay the sentinel and
document it, on the reasoning that the bridge should not second-guess Forge. But
the bridge already projects every event into the wire's own vocabulary, and a
sentinel whose meaning is fixed — a creature can never block itself — is
encoding, not information: dropping it loses nothing, and keeping it put a trap
in every reader. Two readers fell into it: this repo's `render/describe.ts`
(the board's event log printed "#12 blocked by #12") and ForgeCoach's coach,
which is the owner's main way of playing. `state.combat` never carried the
sentinel (none of the 1,365 bands in the 23 committed recordings names its own
attacker), so after this the event and the state agree, entry for entry.

`[]` rather than omitting the entry: the event's job is to say what the
defending player declared, and "this attacker went unblocked" is part of it; an
omitted entry would make "unblocked" and "the bridge dropped it" the same
picture, and every reader that walks `blocks` already handles `[]` (the
`combat_end` event and `state.combat` use it).

Not re-recording the fixtures: frame indices into them are cited across the
docs and tests (the same reason M44 and M49 gave), the old spelling is still
valid wire, and a reader must accept it anyway for any log a user recorded
before this. The gate's comparisons rewrite the old spelling only while the
committed file carries it, so they switch themselves off when g1 is re-recorded
on purpose; until then a regression to `[n]` is not visible to step 6, and
`JsonSelfTest`'s blockers cases — seven, run on every build — are what hold it
(with the filter removed from `Snap.block`, two of them fail and the build stops).

**Rejected.**

- **Keep relaying `[n]` (M7)** — see the rationale; the defect was real in two
  readers, one of them in this repo.
- **Omit unblocked attackers** — loses a fact the event carries today, and
  makes an empty `blocks` ambiguous.
- **Re-record every fixture** — churn across every cited frame index, for a
  change every reader must tolerate anyway.
- **Make `tools/check-redaction.mjs` fail `[n]`** — it runs over the committed
  corpus, which is all `[n]`; a file carries no stamp that says which side of
  M52 it was recorded on.

**Measured** with the pinned jar (sha256 `3c0a7c38…8e5dd9`): seed 42 through
`RecordMatch` (gate step 5's command) — 19 entries, 14 `[]` and 5 real blocks,
where `fixtures/games/g1.jsonl` has the same 5 and 14 self-blocks; `wire-drift`
against g1 SAME on every question with the rewrite (14 and 0 self-blocks read
as `[]`), and DIFFER on the event stream at event #431 without it; seed 42
through `--transport auto` (9b's command) and through `--transport ws --port
8712` with `tools/ws-auto-play.mjs` — 10 entries each, 9 `[]` and 1 real; in
all three, each of the 48 entries equals the attacker's `state.combat` band in
the same frame (g1: 5 of 19). 9b's multiset diff against `human-auto-42.jsonl`
reports no difference in any `blockers` event (its residue is the known input
re-pushes and one re-partitioned flush); `check-redaction.mjs` passes the three
fresh logs, the client log (`--client-log`) and the corpus; `narrate-selftest`
passes with both goldens byte-identical; `first-divergence.mjs` calls g1 and the
fresh recording IDENTICAL.

## D291 — The observer, the idle limit and Node 22 are held by the gate: 10c plays with two `/observe` followers, 10h runs `--idle-timeout` both ways, and the socket tools settle a connect on `error`

*Branch `c/test-gaps`; D291 alone (the blockers lane took D290 on `main` while this lane worked).*

**2026-10-01** (the follow-ups D280–D289 left: the observer socket's 1 and 2, the
game timeout's one, and 10e's Node 22 failure recorded under *The observer socket*)

**Decision.** Four gaps, closed in the gate rather than by hand:

- **10c is also the observer step.** `tools/ws-observe.mjs` (new) is started
  before 10c's server, retries until the port binds, and so joins `/observe`
  before the session exists; it writes every frame it is sent verbatim and exits
  at the `over`. After the game, `ws-observe --check` requires the stream to be
  exactly the transport's promise (M50): a catch-up from the cache at some
  admission moment — the last `hello_ok`, the last `state`, this game's `over`
  or else its last `input`, every ask still pending (pending: its frame is in
  the bridge's log and its `answer` is not yet) — and then every s2c frame of the
  bridge's log after that moment, same `seq`, same `type`, the same body bytes,
  no gap, no duplicate, no `seq: 0` frame; it searches every moment from "before
  the session" to the last frame, so a follower that happens to join late passes
  only with the right catch-up. The live part is compared with the log as a
  **set**, and its order with the **seat's**: a frame is numbered under the log's
  monitor and pushed after it, so two threads emitting at once reach the socket
  out of `seq` order — measured on this lane's fourth Node 24 run, the game
  thread's `input`s 3 and 4 and the resync's re-emitted `input` 5 reached the
  seat AND the observer as 5, 3, 4, which a first, sequence-ordered version of
  the check failed. With `--seat-log`, every s2c line of the seat's client log
  whose `seq` the observer was also sent must be the same frame, compared as
  parsed JSON (the client log re-encodes), and the frames the seat received once
  must have reached the observer in the same order. The server's summary must
  say `ws observers = 2 accepted, 0 dropped`.
- **The ask half of `admitObserver` is held by the seat.** `ws-auto-play
  --observe-at-ask` (10c's seat) takes its first real `ask` and does not answer
  it: the game thread stays parked in `ReplyPool.await`, the policy sends nothing,
  and a second socket joins `/observe`. Its catch-up must be the `hello_ok` this
  seat was sent, then this seat's last `state`, then (after the `input`) the ask —
  each the same string, so the same `seq` — with nothing but catch-up frames in
  front of the ask, within 10 s; then the seat answers and plays on. Anything
  else, or a game with no ask at all, exits **10**. Since the seat received every
  push, its last `hello_ok` and `state` ARE the transport's cache; this is what
  the self-test cannot reach, because `Transport.ask` asserts a game thread and
  `WsObserveSelfTest` may not name one (hard rules 3 and 10).
- **10h is the idle limit (D286), both ways.** A new job on `WSPORT+7`, two short
  sessions on one port: `--idle-timeout 3` with nobody in the seat and a
  `ws-observe --until close` follower attached — `ABANDONED: no client connected
  for 3 s`, `finished = false (ABANDONED …)`, exit 1, no `MTGTABLE OK`, one
  observer and no `/ws` client accepted, within 30 s of `/health`, and the
  follower closed by the server after its `hello_ok`; then `--idle-timeout 3`
  with `ws-smoke --hold 6`, a seat taken before the session exists (no `/health`
  wait, so it is on the socket before the idle clock starts) and held idle for
  twice the limit — the concede's `over`, `MTGTABLE OK`, no `ABANDONED`. Its
  held session's logs join `RECORDERS` and 12d's list; the abandoned one has no
  `over` by design and goes to neither.
- **The socket tools settle a connect on `error` as well as `close`.** Node 22's
  `WebSocket` fires `error` and no `close` on a refused connect; `ws-smoke`'s
  `Conn.#connect` waited for `close`, so `openEarly`'s first refused attempt
  never settled, nothing held the event loop (the whole-run timer was unref'd)
  and Node exited 13. Now the first of `error` / `close` settles it (`close`
  still overwrites the code, which is where a ≥ 4000 refusal shows), and the
  whole-run timer is held, so a pending wait can only end in a verdict.
  `ws-auto-play` fails a socket that errors before it opens (exit 5) — on Node
  22 it would otherwise have exited **0** with nothing done, every timer being
  unref'd — and `ws-observe` is written the same way.
- **`GATE_ONLY="<job> …"`** runs the named jobs alone, over an existing build
  (their dependencies are not run), validates the ids, and prints a `check-all
  OK (GATE_ONLY: … -- a partial run, not the gate)` line. It is how each step
  above was run on its own; it is never the gate.

**Rejected.**

- **A self-test case for the ask catch-up.** It needs `Transport.ask` on a game
  thread: naming a `Game*` thread or hopping onto Forge's pool is banned (hard
  rules 3 and 10), and relaxing the assert for a test is the kind of hole the
  lint exists to keep shut. A real engine raises the ask for free in 10c.
- **A separate step for the observer.** 10c already plays a whole seed-13 game,
  which raises asks from its first turns (`a1`, an `order`, about 1 s in); a new
  step would boot a JVM and play a game for nothing. The cost to 10c is the
  follower and one held answer, milliseconds.
- **Lifting `awaitGameEnd` into a class with a fake clock** (the game timeout's
  follow-up as written) — a unit test of the loop would not show that the real
  `WsTransport.connected()` ignores an observer, which 10h does with one attached.
- **`--idle-timeout 2` and a `/health`-polled client** — the poll is one second
  apart and a loaded machine adds more, so the client could arrive after the
  clock had already run out; the early connect removes the race instead.
- **Comparing the observer with the seat's client log alone** — the seat misses
  every frame emitted while it was away, re-receives verbatim ones, and its log
  re-encodes the JSON; the bridge's own log is the record of what was sent.

**Negative controls.** `ws-observe --check` rejects a dropped line (a gap), a
duplicated one, one changed body, two adjacent live frames swapped (with
`--seat-log`), a stream cut before the `over`, and a late
catch-up carrying an older `state`; it accepts a correct late catch-up built from
the log at seq 600. With `admitObserver`'s ask loop disabled (`if (false && …)`)
the build and all seven self-tests passed and 10c's seat exited 10 ("the
observer's catch-up never carried the open ask a1 within 10 s (got 3 frame(s):
hello_ok, state, input)").

**Measured** with the pinned jar (sha256 `3c0a7c38…8e5dd9`), each step run on its
own with `GATE_ONLY`, under Node v22.22.0 and v24.20.0: PLAN.md's *The test gaps*.
The full gate was not run.

## D292 — ForgeCoach coaches through the logged-in Claude Code CLI: `tools/coach-helper.mjs`, a loopback HTTP service on 8643 that runs `claude -p` with every tool off and streams NDJSON, started by `play.sh` beside the engine

*Branch `c/coach-helper`; D292 alone, the next number after D291.*

**2026-10-01** (the owner's approval, for ForgeCoach)

**Decision.** `tools/coach-helper.mjs` (plain Node 22+, no dependencies) answers
ForgeCoach's coaching prompts with the Claude Code CLI the owner is already
logged in to, so the coach needs no API key. Its header is the contract
ForgeCoach is built against:

- `GET /health` → 200 `{"ok":true,"helper":1,"claude":"<claude --version>","models":["opus","sonnet","haiku"]}`,
  or 200 `{"ok":false,"helper":1,"error":"<plain words>"}` when `claude` is not on
  PATH or `claude --version` fails. It does not prove a login (only a call can).
- `POST /coach` `{"system","user","model"?}` (model `opus`/`sonnet`/`haiku`,
  default `sonnet`; at most 512 KB, else **413**) → 200
  `application/x-ndjson`: `{"type":"text","text"}` deltas, `{"type":"thinking","text"}`
  when the CLI shows any (2.1.287 sends empty thinking deltas, which are
  dropped), then exactly one of `{"type":"done","stopReason","model"}` (the
  model that answered, from the stream's `message_start`) or
  `{"type":"error","message"}` in plain words — `not logged in — run \`claude\`
  once in a terminal to log in`, a usage limit with the CLI's own reset text, a
  model not available, a CLI too old for a flag, an overload. 400 / 403 / 404 /
  405 / 413 / 429 carry one `{"type":"error","message"}` body.
- **One question at a time:** a `/coach` that arrives while one runs waits up to
  5 s (`--busy-wait`) for it to finish or be cancelled, then is **429** with
  `Retry-After: 2`. A client that disconnects kills the child's whole process
  group (SIGTERM, SIGKILL after 2 s), and so does the 300 s timeout.
- **Who may call it** is M50's and M51's rule on this port: binds `127.0.0.1`;
  `--lan` binds `0.0.0.0` and a non-loopback request must carry the pairing
  token as `?token=` or `X-ForgeCoach-Token` (SHA-256 digests compared with
  `timingSafeEqual`, never logged; a logged path is cut at `?`), a loopback one
  never. Origin: `config.json`'s `wsAllowedOrigins`, read as the bridge reads it
  (`MTG_TABLE_CONFIG`, else the repo's `config.json`, else M50's three
  defaults), matched by a port of `WsTransport.originAllowed`; under `--lan`, a
  non-loopback peer is also allowed `http://<Host>` (M51 verbatim) **and
  `http://<Host's name>:<wsPort>`** — see below; no `Origin` is allowed from
  loopback only; anything else is 403. A preflight is 204 with the allowed
  Origin echoed, `GET, POST, OPTIONS`, `Content-Type, X-ForgeCoach-Token` and
  `Access-Control-Allow-Private-Network: true`, and needs no token (a browser
  cannot add one to a preflight).

**How it runs Claude**, each flag read off 2.1.287's `--help` and a real call:
`claude -p --output-format stream-json --include-partial-messages --verbose
--model <alias> --system-prompt <system> --tools "" --strict-mcp-config
--no-session-persistence --permission-mode dontAsk --max-turns 1`, plus
`--safe-mode` and `--disable-slash-commands` when that CLI's `--help` lists them;
the user text on **stdin**; the working directory a fresh empty
`$TMPDIR/forgecoach-coach-*`, removed afterwards; the child the leader of its own
process group (`detached`). A system prompt over 100 KB goes by
`--system-prompt-file` from a second temp directory, because Linux caps one argv
string at 128 KB (`MAX_ARG_STRLEN`). Why each: `--tools ""` is the CLI's own
"disable all tools" (its `init` event then lists `"tools":[]`);
`--strict-mcp-config` with no `--mcp-config` loads no MCP server (`"mcp_servers":[]`);
`--no-session-persistence` writes no transcript; `dontAsk` denies anything not
pre-approved rather than asking — nothing is approved, and there is no tool to
approve anyway — where the contract's draft said `default`, which 2.1.287 also
accepts but which in `-p` leaves a would-be prompt to the host; `--max-turns 1`
is accepted though `--help` does not list it; `--safe-mode` keeps the owner's
hooks, CLAUDE.md files, plugins and skills out of a coaching call, and
`--disable-slash-commands` its skills (`"slash_commands":[]`); `--bare` was
rejected because it reads `ANTHROPIC_API_KEY` only and never the OAuth login,
which is the whole point. **Never `--dangerously-skip-permissions`.** The
stream's shapes (measured): text arrives as `stream_event` /
`content_block_delta` / `text_delta`, the stop reason in `message_delta`, the
model in `message_start`, and the end as one `result` line; an API failure is
an `assistant` line with `"error":"<code>"` (`model_not_found`,
`authentication_failed`, `rate_limit`, …) and `is_api_error_message`, then a
`result` with `is_error: true` and `api_error_status`, and no text deltas at
all. A CLI that emits no partial messages still answers: the `result` text is
sent as one `text` line.

**`play.sh`** starts it in every mode (bare, `--engine-only`, `--lan`) once the
bridge's `/health` answers, on `config.json`'s new **`coachPort`** (8643), when
`claude` and `node` are on PATH, logging to `var/play/coach.log`, and stops it
first in `stop()`. It prints one line: `Coach: Claude Code on this PC (no API key
needed) — http://127.0.0.1:8643`, or `Coach: claude CLI not found — ForgeCoach
will ask for an API key or offer Copy prompt` (and `off (--no-coach)`, `node not
found`, `there but not working (<error>)`, `did not start (<log line>)` with the
same tail). A helper already answering `/health` on the port — a second `play.sh`
beside a running one — is used as it is. Under `--lan` it reads the token from the
bridge's own `WS LAN PAGE`/`WS LAN SEAT` line and hands it over as
`COACH_HELPER_TOKEN` (`--token` also works) so it never shows in `ps`, with
`--lan --ws-port <wsPort>`. `--no-coach` skips it.

**The gate's ports move from 8643 to 8644** (`WSPORT`, so 8644..8651 in
parallel): `check-all.sh`'s own reason for not using 8642 — "a developer with
`scripts/play.sh` running should be able to run the gate" — now covers 8643
too. **Gate step 12f** (`tools/coach-helper-selftest.mjs`, the 50th job, the
34th serially, about 4–7 s) and CI's `redaction` job run the helper against a
fake `claude`.

**Rationale.** The owner plays in ForgeCoach and has Claude Code logged in on the
same PC; an API key is a second bill and a secret in the browser's storage. A
static https page cannot run a CLI, so something local must, and this repo is
already what the owner starts before a game — `play.sh` is where the engine,
its port and its token live. A separate port rather than a path on the bridge's:
the bridge is Java with hard rules about its threads and its one serialiser,
and a process spawner in it would be a new thread family and a new door for
nothing; the helper is about 600 lines of Node beside it that the bridge never knows
about. Tools off, stdin and an empty folder because the coach needs to read and
answer, nothing else, and a call that cannot read the disk is no way around hard
rule 8.

**The two places this differs from the contract as first drafted**, both for it
to work, neither changing what ForgeCoach sends or reads:

- **The LAN page's origin.** M51's rule is `http://<request Host>`, and on the
  bridge that IS the page. Here the page comes from the bridge's port (8642) and
  the request goes to 8643, so `http://<Host>` alone would refuse every phone.
  The helper also admits `http://<Host's name>:<wsPort>` — same host name, the
  bridge's port, non-loopback peers with the token only.
- **The token is handed over in the environment** (`COACH_HELPER_TOKEN`), not as
  `--token <T>` on the command line, which every local user can read in `ps`.
  `--token` is still accepted.

**Measured** (Claude Code 2.1.287, Node v22.22.0, in the container): the CLI's
flags and event shapes above, by hand with tiny prompts — `"tools":[]`,
`"mcp_servers":[]`, `"slash_commands":[]`, `--system-prompt-file`, `--max-turns`
and `--permission-mode default` all accepted, an unknown flag `error: unknown
option`, `--model nosuchmodel` the `model_not_found` shape; one real call through
the helper with `curl` (haiku, a one-sentence question): ten `text` lines and
`{"type":"done","stopReason":"end_turn","model":"claude-haiku-4-5-20251001"}`,
about 5 s, the temp directory gone afterwards. `node tools/coach-helper-selftest.mjs`:
57 checks, about 7 s, including from the container's non-loopback address (the
LAN half); it failed, one or two checks each, under four planted mutants (the
group kill reduced to the leader, the LAN origin admitted from loopback, the
private-network header dropped, the token check removed). The gate runner ran
12f alone (`GATE_ONLY`, 4.2 s). `play.sh`'s coach block was run in a harness —
the found, off, not-found, `--lan` (403 without the token from the non-loopback
address, 200 with it; the token absent from `ps`) and already-running cases —
because this container has no Forge engine; `bash -n scripts/play.sh` passes.
The full gate was not run, and a logged-out CLI was not reproduced (this
container's CLI is authenticated by its host): the message for it is matched on
the `authentication_failed` code, a 401/403 status, or the CLI's `Not logged in
· Please run /login` text.

**Rejected.**

- **`--bare`** — the leanest mode, but it never reads the OAuth login.
- **`--permission-mode default`** (the draft's) — accepted, but `dontAsk` says
  what is meant: nothing is ever approved.
- **A path on the bridge's port** — see the rationale.
- **Queueing every concurrent question** — ForgeCoach asks again when the board
  moves on; a queue would answer stale questions in order. A short wait absorbs
  abort-then-ask, and 429 says the rest.
- **The real CLI in the gate or CI** — it costs the owner's usage, needs a login
  CI does not have, and its answers are not reproducible.

## D293 — The cube lab: a tool beside the game that drafts a two-player cube with two Forge AIs, builds their decks and plays them, on the owner's machine; it drafts with its own code because Forge 2.0.14 cannot run a two-player cube draft headless

*Branch `c/cube-lab`; the block D293–D296, the next numbers after D292.*

**2026-10-03** (the owner's request: design 2-player 180-card cubes, see how
decks come together under randomness and how cards perform, and make data on
his own machine — no tokens — for a later drafting AI and play AI)

**Decision.** `tools/cubelab.sh check | ratings init | run | report` over
`tools/cubelab/`: TypeScript run by Node's type stripping (no package, no
dependency, `tsc`-checked through `web/tsconfig.json`'s `../tools`) for
everything that is not the engine — parsing the cube markdown, ratings, both
drafts, deckbuilding, sharding, the report — and **one Java file,
`tools/cubelab/CubeLab.java`**, for the two things only Forge can answer: what a
listed name is in its card database (`facts`) and who wins when its AI plays
two decks (`play`, a worker reading a match per stdin line). The Java boots the
engine through `mtgtable.Bootstrap` like every process here (hard rules 1, 6 and
11, every AI seat through `Bootstrap.createAiPlayer`, decks through
`DeckSerializer.fromFile`), sits under `tools/` where the lint already scans
(D182), is compiled on demand into `var/cubelab/classes/` against `bridge/out`
(as `audit-deck.mjs` compiles its helper), and runs each worker in a Forge home of
its own built by `tools/config.sh`'s `forge_home_make` (D129's helper) under
`var/cubelab/homes/<k>/`. Justin's two cube files are committed as given under
`cubes/`, with a ratings TSV beside each.

**It lifts no NON-GOAL.** It is a tool beside the game in the sense D90 used for
the card library: nothing the engine, the bridge, the wire, the board or the
arena depends on, nothing it writes is read by them, and it starts no socket.
Its deckbuilder is an AI's, for a simulation; README's *no deck builder* is
about the client, and the client still edits no deck.

**Why the lab drafts itself.** Measured on the pinned 2.0.14 before this lane
(the prototype in the session scratchpad): Forge has no headless AI-vs-AI cube
draft for two players. Its Winston AI picks at random and
`LimitedPlayerAI.determineDeckColor` crashes on a Winston pool; there is no Grid
draft in the jar at all; and the booster draft is an eight-seat pack format.
What Forge does have, and the lab borrows, is its card evaluation: the draft
ranks (`CardRanker.getRawScore`, CubeCobra's cube list first) seed the ratings
(D294), and `BoosterDeckBuilder` builds a comparison deck for every pool.

**Rejected.**

- **Forge's own `BoosterDraft` with two seats** — an eight-pack format, and its
  AI's colour logic is the part that crashes.
- **Everything in Java** — the draft and deckbuilding logic needs no engine and
  is the part most likely to change; in TypeScript it is unit-tested in
  `node --test` (and so in the gate's step 13 and CI) with no JVM, and the Java
  stays a small worker the lint can read in one sitting.
- **Driving `RecordMatch` per game** — a JVM boot (6–19 s) per game is several
  times the game itself; a worker boots once and plays hundreds.
- **A ForgeCoach launcher subcommand** — ForgeCoach is untouched; the lab is one
  command here (`tools/README.md`, README).

## D294 — The lab's drafters and deckbuilder: Forge's ranks as editable ratings, a theme-synergy term, colours committed after a third of the picks with a splash for fixing, and decks scored by playables, curve and theme density; a draft and its decks are a pure function of the seed

**2026-10-03**

**Decision.** Pick value = **rating** (the cube's `<cube>.ratings.tsv`, seeded by
`ratings init` from Forge's raw draft score of the card's *best-ranked* printing,
because Forge's default printing is often a reprint with no rank file and an
unranked card scores −100 there; unranked starts at 40) + **synergy** ×
Σ over the card's themes of √min(cap, the drafter's on-colour picks sharing it)
+ a **colour** term + **fixing** for a land or fixer making the committed pair.
A drafter leans toward its colours until it has made `commitAt` (⅓) of its
expected picks, then commits to its two heaviest colours, re-derived at every
pick; after that an off-colour card costs `offColour` (40) unless it is a
splash — one colour off, one pip, rated ≥ 70, two sources of it already picked
— which costs `splash` (15). A grid line or pile is its best card plus 0.6 of
each other. Winston takes a pile when it beats the expected value of a blind
card (the mean over the cards the drafter has not seen) by a per-pile margin.

The deckbuilder tries every pair, with no splash and with each splash the pool
can support, picks 23 spells (24 with 16 lands when the average mana value is
≤ 2.5) greedily by rating plus synergy with the other candidates against a
curve target, adds the duals and fetches that make two deck colours (or the
splash) and basics by pips, and scores the build: mean rating + 2 per playable
+ 1.5 per spell of the best theme (half for the second) − distance from the
curve − creatures short of 13 − 3 per splash card. **Every lab deck is 40
cards with 16–17 lands, two colours and at most a 3-card splash**
(`checkDeck`, held over every deck of 30 drafts by the test). A pool where no
pair reaches 23 spells gets a second pass with up to 7 splash cards
(`stretched`), then Forge's `BoosterDeckBuilder`; 2 of 320 trial pools (40
seeds × both formats × both cubes × two drafters, before the real runs), both
Winston, needed Forge's. Every number is a named weight
(`tools/cubelab/weights.ts`; `--weights`, `--weight name=value`), recorded in
`run.json`, documented in `docs/guides/cube-lab.md`.

The draft's generator is sfc32 seeded per draft (`rng(seed, 'draft:<format>')`),
so the same seed gives the same picks and decks on any machine and any `--jobs`;
who opens is the seed's parity. Only the games vary between runs.

**Rationale.** The owner's brief named each piece: Forge's ranks as the start,
a synergy term from his theme tags, commitment "flexible longer than Forge's",
a splash with fixing, and a deck score that counts playables, curve and theme
density, "not just Forge's evaluator (which liked 11-spell decks)" — in the
prototype `LimitedDeckEvaluator` preferred an 11-spell, 29-land build of a thin
pool. The ratings are a file because the point of the lab is that its owner's
judgement replaces Forge's where they differ.

**Rejected.** Forge's `CardRanker.getScoresForPack` as the pick function (the
prototype's): it commits on the first strong pick, scores an unranked card at
−100, and has no notion of the cube's themes. Forge's evaluator as the deck
score (above). A fixed land count of 17 (aggressive pools ran out of spells for
nothing).

## D295 — A match is up to N one-game Forge `Match`es with the play alternating, forced at Forge's coin flip; a game past its deadline is a draw, and a worker that hangs or dies is replaced while the run goes on

**2026-10-03**

**Decision.** `CubeLab.java play` plays each game as its own one-game
`forge.game.Match` under `GameType.Draft` (a limited deck), so Forge's first-game
coin flip decides who plays first every game rather than the loser's choice
after game 1 — and the lab decides that flip: `GameAction.determineFirstTurnPlayer`
(private; javap) fires `GameEventFlipCoin` and then draws
`Aggregates.random(players)`, i.e. `MyRandom.getRandom().nextInt(2)`, so a
subscriber on the game's bus hands `MyRandom` a `Random` whose next bounded
`nextInt` names the seat due to play and which puts the seeded generator back at
that call; nothing else draws from the substitute. Game g has drafter A on the
play when `(seed + g)` is odd, so play alternates within a match and game 1
alternates across drafts. The first `GameEventTurnBegan`'s owner is read back
into each game's `onPlayVerified`, and gate step 12g fails when it disagrees.
Each game's `MyRandom` is seeded from the draft's seed and the game number.

The watchdog has two halves. The worker waits for each game with a deadline
(`--game-timeout`, 300 s); past it, `Game.setGameOver(GameEndReason.Draw)` ends
the game, which is recorded as a draw with `timeout: true`; a game thread that
has not returned 30 s later makes the worker print a `stuck` line and exit 3.
The runner (`engine.ts`) kills a worker whose match runs past
`games × (timeout + 40 s) + 120 s`, records any match a dead or killed worker
held as an engine error with the games it finished, starts a fresh worker for
the rest, and stops the run only when a worker cannot boot twice running.
Games start with `GameAction.invoke` from `main`, exactly as `RecordMatch`
starts its one game, so `main` starts `Game-n` rather than hopping beside it:
no new game-thread hop (hard rule 3, D181's list stays three), no thread, no
`CardView`.

`--record M` replays the first M drafts' decks once more through
`mtgtable.RecordMatch` (a JVM each, seat 0 = drafter A) into `<out>/frames/`,
frame logs ForgeCoach opens with **Load file**; a recorded game is a game of its
own, not one of the counted ones, because `RecordMatch` is one game per process
and its recorder is the only one that may serialise a card (hard rule 8).

**Rationale.** The owner asked for alternating play/draw; Forge's own rule
(loser chooses, the AI always chooses to play) would hand the play to whoever
lost the last game, which confounds a card's win rate with being behind. A
timeout is a draw because an AI-vs-AI stall (two boards that never attack) is a
real outcome of the cube, not a failure of the tool, and the report counts
them.

**Rejected.** One Bo3 `Match` (the loser plays first). Re-seeding until the flip
lands right (it depends on everything drawn before it). Reflection into
`determineFirstTurnPlayer` (private, and a hop onto engine internals for a coin).
A new recorder in the worker (a second serialiser).

## D296 — The lab's output is one JSONL line per draft, appended as each match lands and resumable; the report is one self-contained HTML page and a Markdown summary over decisive games with Wilson intervals; gate step 12g runs the lab at its smallest

**2026-10-03**

**Decision.** `<out>/drafts.jsonl` holds one line per draft — the seed, every
decision of both drafters with the cards on offer and what was taken, both
pools, both lab decks (colours, splash, list, curve, themes, score and its
parts, alternatives), Forge's builder's deck for the same pool, which deck
played, and per game who was on the play, the winner, turns, milliseconds,
timeout, Forge's win condition and any engine error — appended the moment the
match lands, so a stopped run keeps every finished draft, and `run` with the
same `--out` resumes past the seeds already there (refusing a folder whose cube,
format, games, profiles, builder or weights differ). `run.json` and `cards.json`
say what the run was. This is the data a drafting AI would train on: the options
and the choice, at every decision.

`report <out>` aggregates it (`aggregate()`, pure) into `report.html` — inline
CSS, a few lines of inline script to sort the card table, inline SVG, nothing
loaded from anywhere — and `report.md`: win rate by colour pair and by primary
theme (the theme ≥ 5 of a deck's spells carry), on the play, per card pick rate
(picked / dealt), deck rate (in a played deck / picked) and win rate in deck,
never-played cards, the average curve per pair, sample lists of the top pairs,
Forge's builder against the lab's, and the recorded games with how to open them
in ForgeCoach. A win rate is over **decisive** games with **Wilson's 95%
interval**, and draws are counted beside it.

**Gate step 12g** (`s12g_cubelab`, the 51st job, the 35th serially) runs two grid
drafts of the synergy cube at seed 7 with one game each on one worker and the
report, and asserts two lines, four legal lab decks, a Forge comparison for each,
a winner per game, turn 1 where it was forced and a page. About 30 s; its Forge
homes are under the job's own (`CUBELAB_HOME_ROOT`). The engine-free half —
parsing, the grid and Winston rules, deck legality, scoring, the ratings file and
the report against `fixtures/cubelab/mini/summary.golden.json` — is
`web/test/cubelab.test.ts` in step 13 and CI.

**Rejected.** A database (a file per draft line is what a later trainer reads,
and appending survives a kill). Win rates with draws as half a win (a timeout
says nothing about which deck was better). A charting library in the report (the
page must open from a folder with no network).

## D297 — The cube lab writes `meta.json`, schema 1, for ForgeCoach's draft and deck assistant: per-card, per-archetype, per-pair, per-land-count and splash statistics, with win rates shrunk toward the run's mean by a Beta prior of 20 games

**2026-10-03** (the coordinator's request, for ForgeCoach's new assistant; the
same block's lane, the next number after D296)

**Decision.** `tools/cubelab/meta.ts`'s `buildMeta` (pure) turns a run folder
into `<out>/meta.json`; `report` writes it and `tools/cubelab.sh meta <out>
[--cube <cube.md>]` writes it alone. The schema is ForgeCoach's, kept exactly
(`schema: 1`; `cube`, `sample`, `cards`, `archetypes`, `pairs`, `lands`,
`splash`; extra fields allowed — `sample.format` and `sample.shrinkage` are
two), and `docs/guides/cube-lab.md`'s *meta.json* and the module's header say
what every number means. The choices the schema left open:

- **Shrinkage**: `winRateShrunk = (wins + k·m) / (games + k)`, the posterior
  mean of a Beta(k·m, k·(1−m)) prior, k = 20 games, m = the run's mean over
  every card-game observation (Σ wins / Σ games over all cards). It is the
  number to rank by; `winRate` and Wilson's `ci` are there to see the raw.
- **Archetype** = the played deck's pair plus its primary theme (`BR-SAC`, or
  `BR` when no theme reaches 5 spells), so a cube without themes (Modern) has
  pairs for archetypes. **keyCards** = appearances × (shrunk win rate within the
  archetype − the archetype's rate), positive only, at most 12.
- **lift** = the pair's shrunk win rate together ÷ the mean of the two cards'
  shrunk rates; a pair needs `--min-pair-games` (6) decisive games together and
  the top `--max-pairs` (300) are kept.
- Every rate is over decisive games, like the report's.

`fixtures/cubelab/mini/meta.golden.json` holds the output over the mini
fixture, and `web/test/cubelab.test.ts` checks its keys and the shrinkage by
arithmetic; gate 12g checks that a real run writes a schema-1 file over 180
cards. `tools/CLAUDE.md`'s cube-lab rule 5 makes the schema a two-repository
contract, as D292's rule 1 does for the coach helper.

**Rejected.** Laplace smoothing (+1/+2: far too weak at 3–60 games a card);
an empirical-Bayes prior strength fitted per run (it moves between runs of the
same cube, so a card's shrunk rate would move for reasons that are not the
card's); lift as a difference (a ratio reads the same at any base rate).

## D298 — A thin pool may build three colours or play 18 lands: the deckbuilder's second pass scores a wide splash, 18 lands with 22 spells, and three full colours together

**Context.** Winston pools are often too thin for any pair to reach 23 castable
spells; D294's only answer was a splash of up to `maxSplashStretch` cards, which
cannot take a card with two pips of the third colour, and otherwise Forge's
builder played instead. The owner chose (2026-10-03): when the pool is thin, the
lab may play three colours or 18 lands.

**Decision.** The first pass is unchanged (two colours, at most `maxSplash`
splash cards, 16–17 lands). Only when it finds nothing, the second pass builds,
for every pair and splash, the wide-splash deck and an 18-land, 22-spell deck,
and for every three-colour set a 17- and an 18-land deck with no splash; the
best score plays and the deck says `stretched`. A three-colour build needs a
land or fixer making its least-used colour and a spell in every colour; it
loses `deckThreeColour` (1.5) per spell its best pair cannot cast, an 18-land
build loses `deckEighteenLands` (2). `checkDeck` allows 18 lands and three main
colours only for a `stretched` deck. In `meta.json` (D297, schema still 1) an
archetype's colours can now be three letters and a land count 18; ForgeCoach's
reader is told.

**Rejected.** Three colours or 18 lands on the first pass (they would win
some normal pools on raw card quality and teach the meta guidance to stretch
when it need not); falling back to Forge's builder (it is the 11-spell builder
D294 replaced).

## D299 — The cube lab's evolve loop: generations of drafts, and a swap only where a card's evidence passes a threshold; AI-limited cards are never cut on AI numbers, and Justin's notes win over every number

*Branch `c/omega-evolve`; the block D299–D300, given by the coordinator after D298.*

**2026-10-03** (the owner's approval: "Omega", a 180-card two-player
greatest-hits cube that evolves by simulation)

**Decision.** `tools/cubelab.sh evolve <cube.md> --pool <pool.tsv>
--generations G --drafts-per-gen N` runs the lab (`runLab`, unchanged) on the
cube going in, reads every card's numbers from `buildMeta` (D297) plus the share
of its grids in which it went in the first line taken, and assesses each card
(`tools/cubelab/evolve.ts`, pure). A card is cut only when its evidence passes a
threshold: **dead** (it sat at least 8 times in a pool whose played deck could
cast it, and the Wilson upper bound of the share of those decks that played it
is at most 0.35), **dominant by wins** (the Wilson
lower bound of its win rate at least the run's mean + 0.05, over at least 20
decisive games) or **dominant by picks** (the lower bound of its first-line
rate at least 0.75, and a shrunk win rate at least the mean); a lead short of
its threshold is reported as *insufficient data* with the drafts per
generation that would likely settle it. At most six swaps a generation; each
cut takes the best-fitting pool card rated at least `deadMinRating` (colour class, shared themes and roles,
mana value, rating — capped below the cut's when it was dominant — and how much
it helps the themes and colours winning least) that keeps every constraint of
the starting cube: its size, singleton, each colour's nonland count within 2,
the land count, the fixing count, two gold signposts per pair. A card cut
once is not re-added.

The owner's AI-limited policy is written into the assessment: a card Forge
marks `AI:RemoveDeck:All` or `:Random` is **never cut on AI numbers** — they are
reported apart, marked AI-limited, with what the numbers alone would have
said; an `AI:RemoveDeck:All` card is **never auto-added** (the AI cannot
evaluate it) and the ones that fit the weakest archetypes are listed as
human-test candidates. `cubes/<cube>-notes.tsv` (`keep` / `cut` / `try`, from
Justin's real games) overrides everything: `keep` is never cut, `cut` is cut
now and never added, `try` is added first when a cut makes room, AI:All or not.
Two more kinds of card are never cut on AI evidence, because the lab's own
choices explain it. A **land** (`builder-limited`, cut by a note only): the
deckbuilder plays a dual or a fetchland only in its own pair's decks and a
colourless land never, so a land's deck rate and win rate are its pair's. A card **rated under
`deadMinRating`** (60; `rating-limited`): the drafters pick by rating, so a
low-rated card nobody plays may be weak or only underrated, and the data cannot
tell which — the remedy is a rating, not a cut. Both were measured, not
supposed: the first selection over Omega v1's 30 drafts found 29 dead cards, of
which 25 were rated under 55 by Forge's ranks (Delver of Secrets 19.7,
Ephemerate 22.9, Reflector Mage 32.5 — the halved set-file scale of the cube
lab's follow-up 3), one was Kolaghan's Command (below) and 3 were the BR/WB fixing lands (Badlands, Bloodstained Mire,
Marsh Flats; no BR deck was built in 60), and it would have swapped Grave Titan,
Council's Judgment and Badlands for higher-rated cards — evolving the cube
toward Forge's ratings rather than toward better games.

Every threshold and fit weight is a named knob in `EVOLVE_DEFAULTS`
(`--evolve name=value`), in the guide's *The evolve knobs* table and recorded in
`<out>/evolve.json` — the cube-lab rule 4 of `tools/CLAUDE.md`, in a table of
its own: they decide the loop, not a draft, so they stay out of `weights.ts`
and `run.json` (adding them there would change every run's weights and refuse
every existing run folder's resume).

**Rationale.** Thirty drafts give a card about 27 deals and 10–25 decisive
games; at that size most differences are inside the interval, and a loop that
swapped on point estimates would chase noise and oscillate. Thresholds on the
interval's edge make a swap mean something and make "run more drafts" the
honest answer otherwise. "Dead" is measured where the card had its chance — in
a pool whose deck could cast it — because a deck rate per draft dealt mixes the
card with its colours' popularity: Kolaghan's Command, rated 67, was picked 18
times in Omega's 30 drafts and never played, because no BR deck was built; that
says something about BR, which the changelog reports, not about the card. An
added card must be rated at least `deadMinRating` for the same reason a
low-rated card is never cut: the drafters would pass it over and the next
generation would learn nothing (the first full selection swapped Kolaghan's
Command for Carnage Interpreter, which Forge has no rank for). The first-line rate
is the grid's version of "first pick": 3 of 9 cards go there at random.

**Rejected.** Cutting the lowest shrunk win rates each generation (a fixed
quota swaps noise when nothing is wrong); the lab's ratings as the add order
alone (they are Forge's draft ranks, D294 follow-up 3, and know nothing of
the cube's gaps); letting AI numbers cut an AI-limited card with a warning (the
owner's explicit wish is that they never do).

## D300 — An evolved cube is the same markdown document, written back line for line; each generation leaves its run, its stats, an HTML section and a changelog entry, and a finished generation is never re-run

**2026-10-03**

**Decision.** `parseCube` keeps, per card, the item as written, its source
line, the line's prefix (`WU: `, `Fetchlands (LND GY): `) and separator (an
optional `src` field), and `tools/cubelab/cubedoc.ts`'s `writeCubeDoc` puts an
edited list back: a cut card leaves its line, an added one joins its section (a
gold card its pair's line, a land a line of its own, anything else the
section's last line), the section headings, the format-counts table, the title's
`version N` are recounted, and one entry is appended to `## Iteration log`
listing each swap and its evidence. Every other line is copied. All five
committed cubes write back byte for byte, and parse → write → parse lists the
same cards with the same tags (`web/test/cubelab-evolve.test.ts`).

A generation writes `gen-NN/{input.md, run/, cube.md, stats.json,
section.html, result.json}`, and the out folder `evolve.json`, `changelog.md`,
`index.html` and the latest cube; `result.json` is written last, so a
generation that has one (made from the same input) is skipped on a re-run and
one without it resumes its run folder by seed. Generation g plays seeds
`S + (g−1)·N` onward, fresh drafts each time; when the generations just before
it drafted the same list (compared card by card, since a no-swap generation's
document still gains a log entry), their drafts are pooled with its own, so
repeated *insufficient data* accumulates evidence rather than starting over.
A lock file, `evolve.lock`, keeps a second process out of a folder in use.

Omega v1 (`cubes/omega-cube-180.md`) and its 938-card seed pool
(`cubes/omega-seed-pool.tsv`) are committed as given; `cubes/omega-notes.tsv`
starts with v1's own *Power choices* exclusions as `cut` lines (the Power
Nine, fast mana, Oko and the other draft-deciders, the cheat plans, the two-card
wins, Strip Mine and Wasteland), so the loop never adds a card the design
ruled out; Justin's game notes go below them.

**Rejected.** Regenerating the whole document from a template (the prose —
design principles, power choices, cards to watch — is the owner's and must
survive every generation; only the list and its counts are the loop's); a
separate machine-readable list beside the markdown (two sources of truth for
one cube; `check` and `run` already read the markdown).

## D301 — The cube lab learns card values and pair synergy from its own games: a regularised logistic model of who won from the two decks, the prior ratings as its baseline, AI-limited cards held at the prior

**Context.** The lab's drafters pick by Forge's draft ranks (D294's editable
ratings) plus a hand-weighted theme term. The owner approved (2026-10-03) a
drafting and deckbuilding AI learned on his own machine from the lab's
self-play, with no LLM.

**Decision.** `tools/cubelab.sh learn <run-dir...> --out <x.ratings.tsv>`
(`tools/cubelab/learn.ts`, pure TypeScript, no dependency, no engine) fits one
logistic model over every decisive game: logit P(A wins) = beta·play +
alpha·(Σz_A − Σz_B) + Σdelta_A − Σdelta_B + Σs_A − Σs_B, the opponent's deck
entering as negative features. z is the prior rating standardised; delta, a
card's deviation from its prior, and s, a pair's synergy, carry Gaussian priors
(L2 shrinkage, `tauCard` 0.25, `tauPair` 0.15 logits); pairs are only the most
frequent nonland ones (`minPairGames` 8, `maxPairs` 300). Newton's method on a
Cholesky factorisation gives the MAP fit and the posterior SDs and is
deterministic. It writes a ratings TSV the lab already reads (rating = prior +
K·delta, K the prior's own exchange rate rating-SD ÷ alpha when alpha is clearly
positive, else 150) with each card's effective sample and status, a synergy TSV
(`run --synergy`, `--deck-synergy on`), a Markdown summary and a JSON. Forge's
`AI:RemAIDeck` cards are kept at the prior and in no pair — their outcomes are a
fact about the AI — and every output marks them `ai-limited`. A five-fold
held-out check by draft compares the model's log loss with the prior-only
model's, with the interval of the difference, so a small sample says it is
noise. The learning options are a named table (`DEFAULT_LEARN`, the guide's
table, the TSV headers, `learn.json`) rather than `Weights`, so a run's
`weights` — and every existing run folder's resume check — are unchanged.

**Rejected.** Per-card win rates (D297's `winRateShrunk`): a card's rate is its
deck's rate, so a card that rides in the best archetype looks strong; the model
credits each card net of its deckmates and the opponent. A neural net or a
dependency: a few hundred parameters and a few thousand games need no more than
a logistic model, and the lab has no package. Learning the hand weights
themselves (synergy, lean, commitAt): a later step, once the card values are
signal.

## D302 — Self-play and the head-to-head: seat A drafts and builds with the learned values, seat B with the baseline, on the same seeds every iteration; A's win rate with Wilson's interval is the evidence

**Context.** A learned value that predicts held-out games is not yet a better
drafter: the question is whether drafting and building with it makes decks that
win, when Forge's AI plays both sides.

**Decision.** `tools/cubelab.sh selfplay <cube.md>` loops: self-play drafts with
the current values on both seats → `learn` from every game so far, always
against the original prior → a head-to-head where seat A uses the new ratings
and pairs (`runMixedDraft`: A's chooser sees each card as its learned twin, A's
deckbuilder builds with them, `--deck-synergy` adds the pairs) and seat B the
baseline. Head-to-head seeds are the same every iteration (common random
numbers) and their games are never learned from, so the deals stay held out
(the first real run did learn from them, and its second iteration's number is
reported as optimistic for that reason). Seats keep D294's alternation of who opens and D295's of who is on
the play, so A has no edge but its values; the summary reports A's decisive-game
win rate with Wilson's 95% interval, and `--deck-h2h` the deckbuilder alone.
Every phase is an ordinary run folder (`run.json` gains an additive `learned`
block naming the files and their sha256, part of the resume check). `run.ts`,
`lab.ts`, `pick.ts`, `draft.ts` and `deck.ts` take the pair table as an optional
argument; without one nothing changes.

**Rejected.** Judging the learned builder by its own deck score (circular: each
builder is best by its own measure — the summary prints both views only as a
distance). Iterating on learned-on-learned priors (compounding a small sample's
noise). Best-of-three for the evidence: `--games 1` buys more independent drafts
for the same games.

## D303 — The match launcher: the coach helper's `POST /match` takes two decklists from ForgeCoach, writes them under `var/match/`, and `play.sh` — which owns the engine — restarts the bridge on them

*Branch `c/match-launcher`; D303 alone (D298–D302 are other lanes').*

**2026-10-03** (the owner's request, for ForgeCoach's cube draft)

**Decision.** ForgeCoach drafts a cube in the browser against an AI drafter and
builds both 40-card decks there; **Play this match** must then play them
without a terminal. The coach helper (D292, `coachPort` 8643) gains
`GET /match` and `POST /match` (`tools/match-launcher.mjs`), and `/health`
gains `"match": 0|1`. `docs/match-launcher.md` is the contract ForgeCoach
copies; protocol amendment **M53** is the row.

- **The door is the helper's, not a new one.** `/match` sits behind exactly
  the gate `/coach` does — `wsAllowedOrigins`, M51's token off loopback, the
  private-network preflight — because it starts processes. 64 KB body limit.
- **play.sh owns the engine, so play.sh restarts it.** The helper writes
  `var/match/<id>/you.dck` and `ai.dck` (`id` = `m` + a millisecond clock, its
  own), then `var/match/request.json`, and sends `play.sh` **SIGUSR1** (the pid
  it was started with, `--supervisor`; trapped first thing in `play.sh`). `play.sh`
  reads the request back through `node`, re-checks every field (the two paths
  must be exactly `<match dir>/<id>/you.dck` and `ai.dck`, the profile
  `[A-Za-z0-9_-]`, games 1–9), stops the bridge (SIGTERM, SIGKILL after 3 s,
  reaped), **waits until the ws port stops answering `/health`** (and stops
  itself if it never does — never two engines), starts the bridge with the
  request's `--deck/--ai-deck/--ai-profile/--games`, `--game-id match-<id>` (with
  a `--seed` the bridge's default id would repeat, and §2.1 reads a repeated
  `gameId` as a reconnect — the real-engine smoke found it) and every other flag it had
  (`--keep-open`, `--site-dir`, `--lan`, the passthrough minus those four),
  waits for `/health` as at startup, and writes `var/match/status.json`
  (`ready`, with the names and counts read from the bridge's own `deck you =`
  / `deck ai =` lines) and `current.json`. The helper polls for its id and
  answers. A bridge that does not come up: `failed` with the log's last lines
  (any `token=` masked) and the **previous** match started again (`restored`);
  if that fails too, `play.sh` stops. The helper re-sends the signal every
  2 s until `play.sh` has taken the request up, because one can land while
  `play.sh` is between two commands of its previous restart; `play.sh` ignores
  an id it has handled. One restart at a time (409).
- **Nothing from the browser reaches a command line or a path.** A deck name
  is 1–80 of letters, digits, spaces and `' ’ , . ! ? & ( ) + : / _ -`, starting
  with a letter or digit; a card name is up to 141 of those plus `"`,
  optionally `|SET` (`[A-Z0-9]{2,8}`). No control character, `[`, `]`, `=`,
  `#`, `\`, `$`, `;`, `<`, `>`. They go into the `.dck` text only; the files'
  paths are the helper's own. The bridge then reads them with
  `DeckSerializer.fromFile` like any deck (hard rule 4).
- **Card names are checked against the engine's own scripts when they are
  there**: every `Name:` in `forge-home/res/cardsfolder/cardsfolder.zip` (and
  `forge-home/custom-cards/`), folded (case, accents), a multi-face script also
  as `A // B` — read once, lazily, by a 60-line zip reader (Node has none;
  33,617 entries in about 0.8 s measured here under load). An unknown name is a
  400 naming it. Without the zip (CI, a checkout with no Forge home) the engine
  reports: the reply's `cards` is the count the bridge loaded, and a shortfall
  is a plain-words `warnings` entry.
- **Hard rule 8 is untouched**: the AI's list is a file the bridge loads as it
  loads `decks/doom-legion.dck`; `hello_ok.match.aiDeck` stays `{name, cards}`
  (M44), and the helper's replies and `GET /match` carry the AI's deck as a name
  and a count too.
- **Forge preferences are untouched**: the profile is a `.ai` file's name,
  passed as `--ai-profile` (M44's never-empty override, D107).
- **A restarted `--lan` bridge keeps the first run's token.** M51 minted one
  per JVM; a restart would have broken the phone's link and the helper's copy.
  `play.sh` reads the first token from the bridge's `WS LAN PAGE` line and
  hands it to every restarted bridge as `MTGTABLE_LAN_TOKEN` (environment, never
  argv); `MtgTable.lanToken` takes it (16+ of `[A-Za-z0-9_-]`, else refused
  without echoing it) and mints a fresh one when it is unset, so the first run
  is what it was — `play.sh` unsets an inherited one. `WsLanSelfTest` holds it.
- **`play.sh` changes**: the helper now starts without `claude` on PATH too
  (its `/health` then says `ok: false` for the coach and `match: 1`); a
  `Match launcher:` line follows the `Coach:` line; `--no-match` keeps the
  helper without the launcher; `--coach-port` puts the helper elsewhere;
  `--no-coach` still starts no helper, so no launcher either. A helper already
  answering on the port belongs to another `play.sh`, whose engine its `/match`
  restarts, and this run says so. The previous log is kept as
  `var/play/server.prev.log` (a failed one as `server.failed.log`). Every
  existing launch path — bare, `--engine-only`, `--lan`, `--no-coach`,
  ForgeCoach's `forgecoach.sh` — starts exactly as before.

**Tests.** `tools/match-launcher-selftest.mjs` (gate step 12f beside the coach
helper's, CI's `redaction` job; about 25 s) runs the real `play.sh
--engine-only` against a **fake engine** — `MTGTABLE_TEST_FAKE_ENGINE`, a test
seam that skips check-forge and the build, with `MTGTABLE_TEST_VAR` keeping its
files under `var/match-launcher-selftest/` — that answers `/health`, holds a
seat socket, prints the bridge's deck lines, records its argv and token, and
takes 700 ms to die holding its port: 72 checks — the `.dck` text byte for
byte, the restart's argv, the seat dropped, the reply's `aiDeck` exactly
`{name, cards}`, seventeen malformed requests and an oversized one refused with
nothing written or restarted, another Origin 403, a deck the engine will not start on 502 with
the previous match back, the engine's count as a warning, 409, two back to
back, never two engines, `--lan` keeping its token, Ctrl-C taking it all down,
the card index over a built zip, and `/match` off without a supervisor. It
failed under each planted mutant: the restart not waiting for the old engine,
the LAN token not handed on, the card-name pattern removed.

**Measured on the real engine** (Forge 2.0.14, the pinned jar, in a container
at a load average of 20–170): `play.sh --engine-only --seed 7 -- --games 1`,
then `POST /match` from the github.io Origin with two 40-card decks of real
cards — an unknown card was refused 400 against the 33,617-entry card index
in about a second; the restart answered 200 in 25.3 s with both decks at 40,
`Cautious`, one game; a `/ws` client's `hello_ok.match` then named the new
decks with `aiDeck` exactly `{name, cards}` and `yourDeck.path`
`var/match/<id>/you.dck`. That run found the repeated `gameId` (`human-ws-7`
both times under `--seed 7`), hence `--game-id match-<id>`; the fix is held by
the self-test, not re-run on the engine. The full gate was not run.

**Rationale.** The helper already is the browser's door to this machine, with
its gate solved; the restart belongs to whoever started the engine, and that is
`play.sh` — its `stop()`, its Ctrl-C and its log all keep working because the
JVM stays its child. A signal plus three small files keeps the two processes'
contract inspectable on disk and needs no new socket.

**Rejected.**

- **The helper spawning the engine itself** — two owners of one JVM, and the
  helper does not run at all under `--no-coach`; `play.sh`'s lifecycle (stop,
  Ctrl-C, the log, the vite loop) would have needed a second copy in Node.
- **A restart endpoint on the bridge** — a JVM cannot replace itself, and a
  new match in the same JVM would mean re-registering players under Forge's
  `HostedMatch`, a seam nothing here has measured.
- **A shutdown hook to send close 1000 before the restart** — a ninth named
  thread in the bridge (hard rule 10's thread guard) for a courtesy: ForgeCoach
  started the restart and knows its socket will drop.
- **Deck names in file names** — a path built from browser text is exactly
  what the strict patterns exist to avoid needing.
- **Keeping `play.sh` alive after the match ends** so the launcher outlives
  it — a change to every existing launch path (D285, M6's linger, D286's idle
  limit). Left as a follow-up: a long draft with no seat connected can outlast
  the engine, and ForgeCoach sees `/health` fail.

## D305 — The ML dataset: `tools/ml/` encodes frame logs into fixed-size, viewer-side position rows for a cube's closed card pool, labelled with the eventual winner, split by game, and reads less hidden information than the log carries

*Branch `c/ml-dataset`; D305 (a block of D305–D307 reserved, D306–D307
unused). The cube lab's D293–D297 and the AI baseline's D300–D301 are on other
branches; the lead renumbers on merge if these collide.*

**2026-10-03** (the owner's approval of the plan: a stronger play AI for the
180-card cubes, trained on this machine from self-play, with no LLM — search
over Forge's engine guided by a small learned position evaluator)

**Decision.** The preparation step is a dataset pipeline in Python under
`tools/ml/` (`tools/ml/README.md` is its manual), and its shape is fixed here:

- **A row is a decision state from one seat's log**: a `state` in which the
  log's viewing seat holds `priority`, in a main phase or a combat step
  (configurable), the game not over; identical consecutive rows of one game are
  one. Every kind of frame log is read — AI-vs-AI (`RecordMatch`,
  `spectate.sh`, the cube lab's `--record`) and seat recordings, `.jsonl` and
  `.jsonl.gz`, a client log's re-deliveries once.
- **The vector is fixed-size for a CLOSED card pool** — the cube the decks were
  drafted from, read from its design file (the cube lab's format), a `.dck` or
  a plain list: the six basics, the pool in listed order, then `<other>`,
  `<token>` and `<facedown>`. 243 board-level features (turn, phase one-hot,
  stack, combat, life, zone counts, lands and untapped lands by colour, mana,
  this turn's land drop and spells, battlefield P/T, counters, keywords, and
  type and mana-value aggregates per zone, which keep what `<other>` loses)
  plus 17 counts per slot (my hand; battlefield untapped, tapped, sick,
  attacking, blocking, and graveyard, exile, stack — for each side): 3,456
  features for a 180-card cube. `features.json` is the layout, with a
  `schemaId` hashed from the names; a test holds a golden layout for a fixed
  vocabulary.
- **The label is the eventual winner from the viewer's side** (+1/−1, a draw
  0), with turns-to-end and rows-to-end; a game with no outcome, or an engine
  crash's null `over` (M46), gives no rows.
- **Hidden information: the encoder is stricter than the log.** The opponent's
  hand is its count and never a card of it, even a revealed one; both
  libraries are counts; a stub counts in its zone only; a face-down card is
  `<facedown>`, never its `alt`; no engine string but a card's `name`, `types`
  and `manaCost`. A test rewrites every hidden zone of every committed
  recording as if it had leaked and requires every feature unchanged, with a
  negative control on the viewer's own hand; a planted leak fails it.
- **The split is by game, by hash.** A row's split is a hash of its game's
  split group — one seed of one match, so the two chairs of a game are one
  group — so it is deterministic and stable as the corpus grows;
  `--group-by match` holds whole deck pairs out. Shards are int16 `.npz`
  (every feature is an integer).
- **Dependencies:** the encoder is standard library; the dataset and the
  logistic baseline need numpy; torch is optional and only in `train_mlp.py`,
  which exits 0 without it. Gate step **12h** runs the tests (about 30 s;
  numpy's half says whether it ran), and CI's redaction job runs the
  standard-library half.

**Why.** A fixed vocabulary is what a closed cube allows and an open format
would not: a card's identity becomes a column, so a small model can learn what
a Skullclamp on the battlefield is worth, while the aggregates carry everything
the vocabulary misses. The viewer's side is the only side a seat's log has, and
it is the side a search player stands on. Splitting by row would put positions
of one game on both sides of the split, and a game's positions are nearly
copies of each other — the score would measure memory. Reading less than the
log is cheap insurance: a reveal is rare and its value small, and a feature
built on it would be the first thing in this repo that a leak upstream could
silently turn into a cheating evaluator.

**Measured** (2026-10-03, a shared 4-core container at a load of 15 to 160).
`tools/ml/record-pairs.sh` recorded the ten synergy-cube deck pairs of the AI
baseline's bench (`tools/ai-bench/decks/synergy-*`, on its branch; copied into
`var/ml/decks/`, not committed) at seeds 1–4 from seat 0 and seed 1 from seat 1:
50 games, 48 finished, 2 seat-1 games killed by the 300 s `GAME_TIMEOUT` (their
seat-0 twins had finished — under load the same seed is not always the same
game's length) and skipped as unlabelled. `FModel.initialize` took 29 s of each
run. With `cubes/synergy-cube-180.md`'s list as the vocabulary (189 slots, 3,456
features): **4,671 rows from 48 games in 40 split groups** (the two chairs of
eight games share a group), 80/10/10 → 3,684 / 626 / 361 rows; games won/lost
from the viewer's side 21/27. Every one of the 48 recordings passed the
scrambler. The 22 committed fixtures give 2,561 rows. Grouped 5-fold
cross-validation of the logistic baseline (`--cv 5 --l2 1.0`, out-of-fold
log-loss, all rows / turn 17+): prior 0.678 / 0.620, life difference 0.637 /
0.518, the twelve-number core model **0.620 / 0.509** (accuracy 0.674 / 0.829),
every non-card feature 0.622 / 0.494, the full vector 0.675 / 0.676; at `--l2
0.01` the life difference alone is the best, 0.533, the core model 0.600 and
the wide models overfit to 1.05–1.09. The single 80/10/10 split (7 validation
games, 3 test) is too small to rank anything — test log-loss: life 0.304, core
0.274, full 2.79 — and the MLP (3,456 → 256 → 64, 30 epochs, CPU torch) kept
its epoch 2: validation 0.508, test 1.22. There is signal, it grows with the
turn, and at 40 games everything wider than a dozen numbers overfits: the card
block needs thousands of games before it pays.

**Rejected.**

- **Per-row or random splits** — leak game identity, above.
- **An open vocabulary (hashing every name)** — the cube is closed; hashing
  buys collisions and nothing else, and `<other>` with its aggregates covers a
  card outside the list.
- **Reading revealed opposing cards** (a revealed hand card, a Future Sight
  top) — rare, small, and the one way the encoder could ever learn from what a
  player may not know.
- **Torch as a hard dependency** — the dataset and the baseline must run on a
  bare `python3` + numpy, in the gate and CI, before any GPU is involved.
- **Features from `stack[].text` or `cast.text`** — engine strings that §3.6
  gates and sweeps; ids and public faces already say what is on the stack.


## D308 — With the match launcher on, the engine exiting does not end `play.sh`: it sleeps with no JVM, keeps the coach helper, and the next `POST /match` starts the bridge

*Branch `c/engine-stay-up`; D308 alone (D299–D307 are other lanes').*

**2026-10-03** (the owner's request: a cube draft in ForgeCoach takes 30–90 minutes)

**Problem.** ForgeCoach drafts, then calls the helper's `POST /match` (D303).
The engine `play.sh --engine-only` started ends in two ordinary ways — a match
over with nobody connected (M6's linger) and D286's hour with no `/ws` client —
and `play.sh` exited with it, taking the helper and the launcher along. After a
long draft, "Play this match" met a dead helper.

**Decision.** In `--engine-only` and `--lan` (ForgeCoach's modes), when this
`play.sh`'s helper serves `/match` (`MATCH_ON=1`) and the bridge exits for any
reason, `play.sh` does not stop:

- it prints the bridge's last lines and `engine asleep`, removes
  `var/match/current.json`, writes `var/match/engine.json`
  (`{"state":"idle","at","reason","exitsAt"}`), and waits in a one-second
  `sleep`/`wait` loop, so SIGUSR1, INT and TERM are taken at once. No JVM runs
  while asleep: D286's purpose (no hung JVM burning CPU or holding the seat) is
  kept, because the engine still exits exactly as before;
- the next `POST /match` (SIGUSR1, D303's whole mechanism, unchanged) takes the
  asleep branch of `restart_match`: nothing to stop, the same port-quiet check,
  the same flags and `--game-id`, `--lan` keeping its first token. A bridge that
  will not start on the new decks leaves `play.sh` asleep (status `failed`,
  `restored: false`) instead of "starting the previous match again" — the
  previous match was over — and instead of stopping;
- `GET /health` gains `"engine": "running" | "idle"` (with `idleSince` and
  `exitsAt`, ISO, when idle; only while `"match": 1`), read from `engine.json`
  by `tools/match-launcher.mjs`; `GET /match` says `"state": "idle"` and
  `"match": null`. `docs/match-launcher.md` is the copyable contract;
- `--idle-exit-after <minutes>` (default **240**, decimals allowed, `0` never):
  asleep that long with no match request, `play.sh` stops everything and exits 0.
  A draft is 30–90 minutes; four hours covers a long one and an evening's
  forgetting, and bounds the next item;
- Ctrl-C, SIGTERM and the launcher's Stop work asleep or not (`stop()` also
  removes `engine.json`).

**Unchanged on purpose.** A plain `./scripts/play.sh` (the vite board, which has
nothing to wake it), `--no-match`, `--no-coach`, and a helper that belongs to
another `play.sh` all keep the old exit with the bridge. An engine that dies
mid-game (a crash, not an exit 0) also goes to sleep rather than taking the
helper down; the next match request is the retry, and the log lines are printed.

**What ForgeCoach's launcher sees.** `public/forgecoach.sh` there holds a
`systemd-inhibit` sleep lock for as long as `play.sh` runs. `play.sh` is now
alive while the engine sleeps, so the lock stays held until the idle exit — up
to four hours after the last match by default. It matters only for power: the
machine cannot suspend meanwhile (a laptop in a bag is the case to mind), and
nothing is spinning. `--idle-exit-after` is the dial; the launcher can pass a
smaller one, or poll `engine` and drop the lock itself. That repository is not
changed here.

**Plain Play and a second launch (added before the PR).** A plain Play has no
decks to `POST /match`, and ForgeCoach's launcher runs `play.sh --engine-only`
again on every menu click, so two more doors:

- `POST /engine/start` (same gate; `/health` `"engine_start": 1`): wakes the
  sleeping engine on the last match setup — the last `/match`'s decks, else the
  startup decks — through the same `request.json` + SIGUSR1, as `{"wake":true}`;
  `play.sh` re-uses `BRIDGE_ARGS` with a fresh `--game-id` (a repeated gameId is
  a reconnect, §2.1). Reply: `POST /match`'s 200 plus `already:false`; the
  engine already running is 200 `already:true`. Shares `/match`'s busy flag.
- Before it checks, builds or binds anything, `play.sh --engine-only` probes its
  coach port. Today (before this) a second `play.sh` started its own bridge on
  the taken ws port and died with "the bridge exited before it was ready", or,
  with the sleeper's port free, started a second bridge beside the first's
  helper. Now, when `/health` says `match:1` and `engine:idle`, it `POST`s
  `/engine/start`, prints `Engine ready…` and exits 0; when the engine is
  running and the ws port answers it says so and exits 0. Not with `--port`,
  `--no-coach` or `--no-match`. A probe that finds nothing leaves the old
  start-up untouched.

**Tested.** `tools/match-launcher-selftest.mjs` (fake engine with the bridge's
own `--idle-timeout`): the engine exits on idle and `play.sh` stays up with
`/health` `engine: idle`, `GET /match` idle with no match, no port answering;
`POST /match` starts a fresh engine on the new decks, never two; it falls asleep
again; Ctrl-C while asleep removes everything; `--idle-exit-after` ends
`play.sh` by itself and a bad value is refused; `--no-match` keeps the exit with
the engine. The harness's HTTP helper now sets `agent: false` — Node 22's
keep-alive agent made the back-to-back-POST check fail with `socket hang up`
on an unmodified tree.

**Rejected.**

- **A `--keep-alive` flag instead of a default** — the helper is already the
  opt-in; a flag ForgeCoach's launcher must remember is the failure this fixes.
- **Restarting the previous match when the engine exits** — a JVM held for a
  match nobody is playing, which is what D286 ended.
- **Keeping the JVM up and raising `--idle-timeout`** — a hung engine would
  burn CPU for as long as the draft.

## D309 — An AI seat of our own in front of Forge's: `PolicyLobbyPlayerAi` makes a `PolicyControllerAi`, a subclass of Forge's `PlayerControllerAi`, through `Bootstrap.createAiSeat`; and `tools/ai-bench.sh` measures any change to it AI against AI

*Branch `c/ai-baseline`; D309–D311, the numbers the coordinator assigned at the
merge of `main` `1e31619` (written as D300–D302 before it; D298–D308 are the
thin-pool builds', cube evolve's, the match launcher's and the ML dataset's).*

**2026-10-03** (the owner's goal: a stronger Forge AI for his two 180-card
cubes, on his PC, no LLM; this is its first step)

**Decision.** The seam for every AI improvement is a controller subclass, not
a patch to Forge's jar and not a card script. `forge.ai.LobbyPlayerAi` is
public and its `createIngamePlayer` / `createMindSlaveController` are
overridable; its private `createControllerFor` is three lines and is
re-implemented in `mtgtable.ai.PolicyLobbyPlayerAi`, which hands each game a
`mtgtable.ai.PolicyControllerAi` — Forge's `PlayerControllerAi` with our code in
front of `chooseSpellAbilityToPlay()` (the priority callback) and
`playChosenSpellAbility()` (to steer a cost payment). Every other decision is
Forge's, unchanged. `Bootstrap.createAiSeat(name, avatar, profile, AIOption,
Outlets)` is the only constructor call: the same profile checks as
`createAiPlayer`, and it never reaches `GamePlayerUtil`, so D107's
preferences-saving branch does not exist on this path. Forge's simulation
option (`AIOption`, a lobby-player option, not an `.ai` key) rides on the same
call. **No game entry point uses it yet**: `MtgTable`, `RecordMatch` and every
gate step still seat Forge's plain AI, so every recording and the drift checks
are unchanged.

`tools/ai-bench.sh` (with `tools/ai-bench/AiBench.java`, compiled on demand like
`audit-deck`) plays seat configurations `<Profile>[+sim|+hybrid][+outlets|+shadow]`
against each other over fixed deck pairs (`tools/ai-bench/pairs-*.txt`,
`tools/ai-bench/decks/`): game g gives config A the pair's first deck when g is
even and seat 0 when g/2 is even; a game's seed is a function of `--seed`, the
pair and g, so two configurations on the same seed are **paired** (same deals),
which is what makes a small effect measurable (McNemar on the discordant
pairs). `--jobs K` runs K JVMs, each with its own Forge home
(`forge_home_make`, D129's rule). One JSON line per game; `report` gives Wilson
95% intervals, game times, Forge's AI-evaluation timeouts and the policy's
counters. `--selftest` (~15 s) checks the statistics and eleven board scenarios
built with Forge's own `GameState` loader, three of them controls. It is not
in the gate: it boots Forge, and the bench itself takes hours.

**The game-thread hop.** A bench game starts with `game.getAction().invoke(…)`,
exactly as `RecordMatch` starts its game: one game at a time per JVM, waited on
with a latch, so nothing else runs on Forge's `Game` pool; the self-test applies
each `GameState` the same way, one scenario at a time, with no match running.
No `invokeInGameThread` is written (the lint's `HOP_ALLOW` is unchanged).

**Rejected.** A patched or rebuilt Forge jar (D109/D110: the engine is the pinned
release); reflection onto `PlayerControllerAi.brains` to swap in an
`AiController` subclass (the controller seam reaches every decision without
it); custom `.ai` profiles (they load only from `res/ai/`, the user's install);
card-script overlays to change `AI:RemoveDeck` or `AILogic` (D111); a bench that
reuses `RecordMatch` (it writes a frame log and redacts for one seat — neither
is wanted for thousands of games).

## D310 — The sacrifice-outlet policy: answer removal, doomed combatants and expiring creatures with an outlet, go all in when the sacrifices are lethal, cast the outlets Forge's RemAIDeck filter hides, and pay Forge's own outlet activations with fodder

**2026-10-03**

**Decision.** `mtgtable.ai.OutletPolicy` handles every activated ability whose
cost sacrifices exactly one creature other than "this" (`creatureSacCost`):
Viscera Seer, Goblin Bombardment, Carrion Feeder, Woe Strider, and any cube's
equivalents, found from the cost, not by name. At each priority, before Forge
chooses, it plays an outlet when (1) **LETHAL** — every valid victim through
the best free, untapped outlet, plus the drains on the board (`DRAINS`, a
named table: Blood Artist, Zulaport Cutthroat, Mayhem Devil, …), reaches the
opponent's life; plain creatures go first, drainers last, damage at the face,
and once begun it is committed for that step; (2) **THREATENED** — Forge's own
`ComputerUtil.predictThreatenedObjects` says something on the stack kills one
of ours (a bounce does not count); (3) **COMBAT** — after blockers, a creature
of ours dies without killing anything and its removal lets no trampler
through; (4) **EXPIRING** — a creature with `EndOfTurnLeavePlay` in an end step.
After Forge chooses: (5) **CAST_OUTLET** — Forge chose nothing in its own main
phase and holds an outlet card it filtered as `AI:RemoveDeck:All` (Seer,
Bombardment); only outlet cards are let through; (6) **FODDER** — Forge chose an
outlet activation itself: pay with a creature Forge itself calls fodder
(threatened, `SacMe`, token, useless) rather than the worst creature on the
board. Targets come from Forge (`doTriggerNoCostWithSubs(ai, sa, true)`, its
mandatory-trigger targeting), except lethal damage, which goes to the face.
The victim is steered by setting `SacMe` 6 on it for that one payment and
lifting the outlet's own `AIPreference` meanwhile (Carrion Feeder's
`SacCost$Creature.Other` is read first and otherwise wins).

**Why.** Measured in Forge 2.0.14 (`docs/research/ai-architecture.md` §5,
`docs/evidence/ai-baseline.md` §4): `AiController.getSpellAbilityToPlay` drops
every RemAIDeck card's spells and abilities before evaluating, so a Seer or a
Bombardment in an AI deck is never cast (a self-test scenario, with an
unflagged control); Forge's deckbuilder never main-decks the ten flagged cube
cards (0 of 149 copies over 98 Forge-built cube decks); and nothing in Forge
uses an outlet when a creature is about to die. Carrion Feeder's
`AristocratCounters` logic decides on fodder and pays with the worst creature
(at least 849 non-token creatures fed to it in 400 games — Gravecrawler most,
but Blood Artist 23 times and Priest of Forgotten Gods 19; a self-test
scenario). Two Rakdos sacrifice decks
from the synergy cube against ten Forge-drafted opponents, 400 games each way,
the same seeds: **35.0% → 43.8%** for the sacrifice deck (+8.8 points, 95% CI
+2.0 to +15.5; paired, 51 games turned from loss to win and 16 the other way,
McNemar exact p < 0.0001) for the first version. FODDER and the opponent's
Blood Artist correction came after that run showed 13 failed all-ins (9 games
then lost) and 849 bad Carrion Feeder payments; on the first 200 of the same
deals the corrected policy wins 42.5% against plain Forge's 36.0% (21 deals
gained, 8 lost, p = 0.024) with no failed all-in, and is not distinguishable
from the first version at that size.

**Rejected.** Un-flagging the cards in a card overlay (D111, and the AI would
then only use them on Forge's terms); a policy that sacrifices on its own
estimate of value every turn (no evaluator yet — that is the search's job,
D311's roadmap); vetoing Forge's own outlet activations instead of steering
them (a veto passes priority, losing whatever else Forge would have done).

## D311 — Forge's AI, measured on the owner's cubes: profiles are knobs (Reckless the only measurable gain), Forge's simulation does not survive the cubes, and a stronger AI is a search we build behind D309's seam, measured with D309's bench

**2026-10-03**

**Decision.** The roadmap for a stronger AI (the owner's goal: his cubes, his
PC, no LLM) is `docs/research/ai-architecture.md` §7: keep cheap targeted
policies (D310) in front; add a determinized search at priority inside
`PolicyControllerAi` that copies the game, redeals the opponent's hidden cards,
plays each candidate and rolls forward with Default-AI controllers, budgeted by
wall clock and falling back to Forge's answer; then combat; then a learned
evaluator (D305's dataset). Every step lands with an `ai-bench.sh` run against
plain Default on `pairs-cube.txt`, paired by seed.

**Why — measured** (`docs/evidence/ai-baseline.md`):

- **"Experimental" is not simulation.** `res/ai/Experimental.ai` is `Default.ai`
  with 30 values changed; simulation is `AIOption`, a lobby-player option. AI
  against AI on ten Forge-drafted cube pairs, 100 games each, paired with a
  Default-vs-Default control on the same deals: Experimental 56% (15 deals
  gained, 7 lost, p = 0.13), **Reckless 60% (14 / 2, p = 0.004)**, Cautious 53%
  (13 / 8, p = 0.38). If the owner wants the strongest stock opponent today,
  it is `--ai-profile Reckless`.
- **Forge's simulation cannot be the base.** With `USE_FULL_SIMULATION` 15 of 20
  cube games, and with `USE_HYBRID_SIMULATION` 12 of 20, ended on turn 1–2 in
  `GameCopier`'s `Couldn't map <card>` (Grist, Anax, Hero of Light, Tarmogoyf:
  static abilities live in hidden zones). The five full-simulation games that
  finished were all won, at up to 24× the time of a default game. It also
  copies the opponent's hand and library order, i.e. it cheats.
- **The default AI is greedy and machine-dependent**: first acceptable play, no
  lookahead, a 5 s evaluation timeout that makes it pass on a busy machine
  (0.02–0.17 timeouts per game here, rising with load).

**Rejected.** Turning on Forge's simulation for the owner's games (it ends them);
tuning `.ai` knobs as the main road (one profile moved the needle ten points,
the rest nothing measurable — knobs inside a greedy player); an LLM opponent
(the owner's constraint); a learned policy before a search exists to use a
learned evaluator.

## D312 — The search AI: a determinized rollout search after Forge's own answer, at main-phase priority, attacks and blocks; Default AIs play both seats of each copy to the end of the next turn, and the AI never sees the opponent's hand or library order

*Branch `c/search-ai`, off `main`'s `e49800e`; D312–D314.*

**2026-10-03** (roadmap step 2 of D311; the owner's ask: an opponent for his
own games that plays combo, sacrifice and synergy cards well, on his PC, no LLM)

**Decision.** `mtgtable.ai.SearchPolicy`, behind D309's seam, reconsiders three
of Forge's answers in `PolicyControllerAi`: (p) what to play with priority in
our own main phase on an empty stack (pass included; not a land drop), (a) the
attack declaration, (b) the block declaration. Forge answers first (and keeps
its own 5 s limit); D310's outlet policy keeps every priority it claims; then
the search builds at most six candidates — Forge's answer first; pass, every
other play Forge's per-card judgment accepts (RemAIDeck cards included) and
affordable untargeted spells it declines; no attack, all-in, Forge's minus or
plus one creature; no block, Forge's minus one blocker or plus one legal block —
and scores each by rollouts. A rollout copies the game, redeals what the AI
cannot see, forces the candidate as the AI seat's first answer
(`RolloutController`), lets Forge's plain Default AI play **both** seats with
the copy's own game loop (`PhaseHandler.mainLoopStep`) to the end of the turn
(`turns=0`, the default) or the next (`turns=1`), and scores the leaf: win/loss first, then
life on a concave curve, cards in hand, poison, and every permanent through
Forge's `GameStateEvaluator.evalCard`. A round plays every candidate on one
determinization with one engine seed (common random numbers); rounds repeat
until the wall-clock budget (default 1.5 s) or twelve rounds; an alternative
replaces Forge's answer only when its mean beats Forge's by 20 points over at
least two complete rounds. Every failure — a copy that throws, Forge's
candidate unmappable onto the copy, a budget too short for two rounds — is
Forge's answer, counted (`search.fallback.*`). `SearchConfig` holds the knobs
(`ms, cands, turns, rounds, margin, maxrounds, what`).

**Measured** (`docs/evidence/search-ai.md`): on 200 new cube deals (ten
Forge-drafted pairs, seed 21), `Default+search` against Default won **113 of
200 (56.5%, 95% CI 49.6–63.2%)** where Default in the same chair won 94 (47.0%);
paired, **37 deals gained and 18 lost, exact McNemar p = 0.015**. 25 searched
decisions a game, 12.5% of them changed, 1.5 s each; 44 s a game against 7 s on
this machine. A quarter of the searched decisions ran out of budget before two
rounds and kept Forge's answer. On the sacrifice pairs, with D310's outlet policy on both seats,
adding the search to one seat: 42 of 80 against 32 of 80 on the same deals,
14 gained and 4 lost, p = 0.031 — the configuration `--ai-policy search` seats. The horizon was chosen on separate pilot deals:
to the end of this turn (`turns=0`) rather than the next, because a next-turn
rollout costs three times as much and at 1.5 s left half the decisions to Forge.

**What the AI may know** — the rule, in `Determinizer`'s header: everything
public, its own hand, its own decklist, and the opponent's decklist (the
owner's ruling for the cubes). Since the decklist minus the opponent's public
cards is the multiset of their hand plus library, each copy pools the
opponent's hand and library, orders them canonically (name, then id), shuffles
them with the search's own seed and deals the hand size back; the AI's own
library is shuffled too. The determinization is a function of that multiset,
the public hand size and the seed alone; the self-test requires two games that
differ only in the hidden split and order to determinize identically. Known
limit, counted: the opponent's face-down cards keep their identity in the copy.

**Randomness and threads.** Each rollout installs a seeded `MyRandom` and
restores the real one, so the search neither consumes nor perturbs the real
game's random stream (and a bench game's deal stays the deal). Everything runs
on the game thread inside Forge's own callback: no thread of ours, no
`invokeInGameThread` (the lint's `HOP_ALLOW` is unchanged), no view walked, no
wire touched — a copy's events go to the copy's own bus. While a copy is built
`PolicyLobbyPlayerAi.createIngamePlayer` seats a plain controller (a
thread-local flag), so a copy never searches and the bench's per-game counters
stay the real game's.

**Rejected.** Forge's `SpellAbilityPicker` / `GameSimulator` as they are (they
read the opponent's real hand and library, score with a second copy that
throws the same way, and search neither combat nor the opponent's reply);
Forge's own `GameStateEvaluator.getScoreForGameState` as the leaf (it copies the
game again to simulate combat, and weighs a life point at 2 against a 2/2's
~150); enumerating targets and modes (Forge's `canPlaySa` picks them; the
search ranks Forge's acceptable plays, which is where its greed loses);
reflection onto `PhaseHandler.givePriorityToPlayer` (the public
`onStackResolved` sets it); a search on every priority (instant-speed
responses stay Forge's and the outlet policy's — a later step).

## D313 — Forge's `Couldn't map` is the sideboard: an all-zones static ability affects a sideboard card the copier never copies; `LenientGameCopier` maps such cards to a zoneless stand-in while copying

**2026-10-03**

**Decision.** `mtgtable.ai.LenientGameCopier` extends Forge's `GameCopier` and
overrides `find` (public, virtual; the copier's private `IEntityMap` calls it)
only while `makeCopy` runs: a card in a zone `GameCopier` does not copy (its
seven are battlefield, hand, graveyard, library, exile, stack, command) or in no
zone maps to a stand-in `Card` of the copy that lives in no zone. Everything in
the seven zones still goes through Forge's strict lookup, and after the copy
every lookup is strict. Each stand-in is counted (`search.standInDecisions`,
`search.standInCards`).

**Why.** D311 measured the failure (15 of 20 cube games under Forge's full
simulation) but not its cause. The self-test now pins it: on a board with
Tarmogoyf and Grist, the Hunger Tide in the AI's sideboard, Forge's
`GameCopier.makeCopy()` throws `Couldn't map Grist, the Hunger Tide`, because
`StaticEffect.removeMapped` maps every card a live static affects, and a
characteristic-defining or all-zones static (Tarmogoyf's P/T, Grist's type
change, Anax, Hero of Light) also affects that card in the sideboard. A
Forge-built cube deck carries a sideboard, so most cube decisions hit it (the
pilot: 59% of searched decisions needed a stand-in). `removeMapped` only strips
the effect's layers from the mapped copies so that the copy's own
`checkStateEffects` can re-apply them; stripping a stand-in is a no-op, and the
copy is the game it would have been. Measured over 200 searched cube games
(`docs/evidence/search-ai.md` §4): 3,285 of 5,017 searched decisions (65.5%)
needed a stand-in, and 11 (0.22%) still failed — all one card, a Bird token in a
copied zone that the zone's listing did not return; since then any card the
strict lookup cannot map while copying gets a stand-in as well (marked `?`).

**Rejected.** Catching the exception and falling back (it would fall back on
most cube decisions); stripping the sideboard from the decks (changes the game
and Forge's wish/learn effects); copying through `GameSnapshot`
(`EXPERIMENTAL_RESTORE_SNAPSHOT` is a game-wide switch on the real game);
patching the jar (D309).

## D314 — The game's AI seat takes the search only when asked: `MtgTable --ai-policy plain|outlets|search` (default plain), `--ai-search <k=v,...>`, and `play.sh --ai-search`

**2026-10-03**

**Decision.** `MtgTable` seats `Bootstrap.createAiPlayer` (Forge's own AI,
byte-for-byte the old seat) unless `--ai-policy` says otherwise: `outlets` seats
`Bootstrap.createAiSeat` with D310's policy acting, `search` adds D312's search
behind it; `--ai-search ms=…,turns=…` sets the search's knobs (and implies
`search`), validated before the engine boots. `scripts/play.sh --ai-search`
(and `--ai-search-ms <n>`) pass them through as `PASSTHROUGH`, so a match
ForgeCoach restarts through the launcher (D303) keeps them. The startup banner
prints the policy; the wire does not change — `hello_ok.match` names the deck
and the profile as before (D105), and nothing of the search reaches a frame.
`RecordMatch`, the gate and every recording stay plain Forge.

**Rejected.** Making the search the default (a 1–2 s think at each searched
decision, and the gate's recordings must stay Forge's); a new profile name
(profiles are `.ai` files, D311); a ForgeCoach-side switch now (the launcher's
contract is D303's, changed in both repositories or not at all — a follow-up).

## D315 — The cube lab records the games it plays: `run --record-all` / `--record-every N` writes both chairs of every game, gzipped, from the worker JVM, through `RecordMatch`'s own recorder; `tools/ml` reads a run folder with `--run-dir`

*Branch `c/lab-record`; D315 (written as D313 and renumbered before merge: the
search AI holds D312–D314, the evaluator D316–D317).*

**2026-10-03** (the owner's goal: every one of a night's ~50,000 cube-lab games
becomes training data for the position evaluator of D305)

**Decision.** `tools/cubelab.sh run … --record-all` (or `--record-every N`: every
game of each draft whose seed is a multiple of N) makes the worker that plays a
game write that game's frame log while it plays, once per seat:
`<out>/games/<seed>/g<n>-seat0.jsonl.gz` (drafter A's view) and `-seat1`
(drafter B's), with the cube's markdown copied to `<out>/cube.md`. Off by
default; a run without the flags writes what it wrote before (its game rows
gain only `cpuMs` and `gameCpuMs`, the worker's CPU time).

- **One serialiser, reused, not a second one** (hard rule 8; the cube lab's
  follow-up 2). `mtgtable.SeatRecorder` (new, in the bridge, names no
  `CardView`) wraps `RecordMatch`'s `SpectatorGui`, a hand-registered
  `GameEventForwarder` and `RecordMatch`'s unpaced `BoundaryFlusher`, and
  writes `RecordMatch`'s session header and `hello_ok` with its match block.
  Two recorders on one game are two viewers; each forwarder is registered
  before its own flusher, which flushes only it. `CubeLab.java` attaches them
  before the game starts and finishes them inside the same `GameAction.invoke`
  body that runs `match.startGame` — the game thread, where `RecordMatch`
  finishes its own — so the lab still makes no hop and starts no thread
  (`GameLog`'s appender aside); the lint's `CardView` list stays three.
  `RecordMatch`'s `unsupported` and `sha256` became package-private; its
  behaviour is unchanged.
- **Gzip in `GameLog`** (`new GameLog(file, true)`): the deflater sits above
  the byte counter, so `bytes()` is the size on disk. No sync flush per line
  (it would cost most of the compression), so a killed worker leaves a gzip
  that ends early; `encode.py` reads it up to the cut, and with no `over` it
  gives no rows. `GameLogSelfTest` holds the round trip.
- **Metadata.** The header's `seed` is the game's seed; a `lab` block names
  `run`, `cube`, `cubeFile`, `cubeSha`, `format`, `match`, `draftSeed`, `game`,
  `gameSeed` and `onPlay`; `hello_ok.match` names the decks `cubelab <seed> A`
  / `B` (the other chair's by name and count only, as always), so D305's split
  keeps both chairs of a game in one group and `--group-by match` holds a
  draft's decks out. The other chair's deck path is never in a log.
- **`--run-dir`** on `encode.py` and `dataset.py`: the run's `games/` and
  `frames/`, the run's own `cube.md` as the vocabulary (else `run.json`'s
  `cubeFile`), refused when its sha256 is not the run's `cubeSha`; several run
  folders make one dataset only when they drafted one cube; `dataset.py`
  writes to `<run>/dataset/` unless `--out` says otherwise.
- **The redaction checker reads `.gz`, and A3 learned the revealed library
  top** (the cube lab's follow-up 1): while a player controls, face up, one of
  the twelve "play with the top card of your library revealed" permanents in
  the 2.0.14 jar (Courser of Kruphix is in the owner's cubes) or one of the
  three that reveal every player's, ONE card of their library is public and
  not a leak. Two cards still fail, and so does Experimental Frenzy, which
  Forge scripts `MayLookAt$ Player` but whose Oracle text is a private look.
  Three probes in `fixtures/negative/redaction/a3-revealed-top-*`.
- **Held by:** gate 12g now runs `--record-every 2` (seed 8 recorded, seed 7
  not), runs `check-redaction.mjs` over both chairs and `encode.py --run-dir`
  over the run; `web/test/cubelab-record.test.ts` runs the checker over the
  committed recording `fixtures/cubelab/recorded/` (one game, both chairs) with
  a planted-leak negative control; `tools/ml/tests/test_rundir.py` reads that
  run, scrambles its hidden zones (no feature moves), cuts a gzip short and
  builds a dataset from it.
- **Not done: the AI's chosen action** for a policy target. Forge's choices are
  made inside `PlayerControllerAi`; logging them needs D309's controller seam
  (`bridge/src/mtgtable/ai/`, the search AI's), so it is not cheap here. A
  seat's own casts, land drops, attacks and blocks are already in its log's
  `events` after each decision state, which is enough for a first policy
  target; passes and target choices are not.

**Measured** (this container: 4 shared cores at a load of 15–30, then 130;
synergy cube, grid, seeds 101–108, one game each, `--jobs 2`, two rounds of
each arm in turn). The recordings change no game: every seed played the same
number of turns in all four runs (153 turns over the 8 games each time). Wall
time could not be measured here — the arms differed by −37% and +117% per turn
with the load — so CPU time per turn is the number: the worker's, off 1,338 /
1,307 ms and on 1,307 / 1,654 ms (+12% over both rounds), the game thread's,
off 383 / 385 ms and on 373 / 441 ms (+6%); within the 30% budget, and the
wall-clock figure is the PC's to measure (`tools/ml/README.md`). Disk: 148 KiB
a game for both chairs gzipped (median 142, max 252; 672 state frames, 7.7
KiB a turn), so 50,000 games are about 7 GiB.

**Rejected.**

- **Replaying through `RecordMatch`** (`--record M`): a Forge boot a game, and a
  game that is not the counted one.
- **A recorder of the lab's own** — a second card serialiser (hard rule 8).
- **One omniscient log per game** — a new redaction mode, and the dataset is
  per viewer anyway.
- **Plain `.jsonl`** — about 6× the disk at night scale.
- **Recording a separate side file of every engine choice** — needs the AI
  seam above.

## D316 — The position evaluator: D305's rows -> P(the viewer wins) through pooled per-card embeddings, exported as versioned JSON, encoded and scored again in Java (`mtgtable.eval`) with golden parity on every build and a live parity check against `Snap`

*Branch `c/evaluator`; D316–D317 (D312–D314 are the search AI's, D315 lab-record's).*

**2026-10-03**

**Decision.**

- **The model** (`tools/ml/evalnet.py`, trained by `tools/ml/train_eval.py`):
  the board columns standardised; the card block -- vocab x 17 counts --
  **pooled through one learned embedding per card** (8 numbers by default),
  shared by all 17 card states and both sides (`pooled[state] = sum_c count[c,
  state] * E[c]`); then one 64-unit ReLU layer and a sigmoid. `E` starts at
  zero with its own L2 (`--card-l2`, 100x the weights' by default), so an
  unseen or rare card adds (nearly) nothing and D305's `types` block -- counts
  and mana values by type and zone -- carries it. Early stopping on validation
  log-loss; `--grid --time-budget` for an overnight search; numpy by default
  (hand-written gradients, finite-difference tested; measured faster than CPU
  torch on this narrow, sparse net), torch for a GPU.
- **What the model does not read**: nine **live-unsafe** features, which a live
  Forge game cannot reproduce as the log has them -- each side's
  `abilities_turn` (the log counts `cast` events, triggers included),
  `spells_cast_game`, `lands_played_game`, `mulligans` (no Forge counter), and
  `stack.abilities` (`stack[].isAbility` is a comfort field, M36, absent from
  every AI-vs-AI recording, so the training data reads 0) -- and every column
  constant in training. The export lists both; Java refuses a model that reads
  a live-unsafe feature for live use.
- **The export** is one JSON file, `formatVersion` 1: schema id and version,
  the vocabulary, board columns with mean and deviation, the embedding, the
  layers. Java's `FeatureSchema` rebuilds D305's layout name for name from the
  vocabulary and hashes it as Python does; a different schema id, feature count
  or card-block offset is refused, and `PositionEvaluator.load(model, cube)`
  refuses a model trained for another card list.
- **Java** (`bridge/src/mtgtable/eval/`, a new package beside `mtgtable.ai`):
  one `Position` (the subset of a `state` body the encoder reads), two
  builders -- `JsonPosition` from a recorded frame, `GamePosition` from a live
  `Game` -- one `FeatureEncoder` (encode.py's `encode_state`, statement for
  statement), `EvalModel` (the forward pass in double), and
  `PositionEvaluator.winProbability(game, viewer)` for the search's leaves.
  `GamePosition` reads only the viewer's knowledge: every other hand and every
  library is a size, a face-down card is its face-down body, a face-down exiled
  card is concealed unless the viewer controls it. It names no `CardView` (lint
  rule 5 unchanged); it reads engine objects, so it runs where the game is not
  moving (the game thread, or a private copy). Two view rules it reproduces:
  no combat at `COMBAT_BEGIN` (Forge's `CombatView` is refreshed at declare
  attackers), and a stack source in a hidden zone is concealed.
- **Parity, engine-free, on every build**: `mtgtable.eval.EvalSelfTest` (the
  build's eighth self-test) against `fixtures/eval/` (`tools/ml/eval_golden.py`:
  a small model and Python's rows for the 22 committed recordings): the same
  rows, identical integer features (a hash per row, every tenth in full), P(win)
  within 1e-9, Python's names for every cube and deck list, and D305's
  hidden-zone scrambler in Java with its negative control.
  `tools/ml/tests/test_eval.py` fails first when `encode.py` moves a feature.
- **Parity, live, by hand** (`tools/ml/eval-live-check.sh`, boots Forge): at
  every decision of both chairs it encodes `Snap.state` for that player and the
  live `Game`, compares, then redeals the opponent's hand and library (and
  shuffles the viewer's library) through `Zone.setCards`, requires the live
  vector not to move, and restores them.

**Why.** The card block is what overfit in D305; a weight per (card, state,
unit) needs data per state, an embedding per card needs data per card, and
what one state teaches transfers to the other sixteen. Hashing cards into
type/mana-value buckets with a per-card bias was the alternative: the `types`
block already is those buckets, and the embedding is the per-card residual in
vector form. One JSON file is enough at this size (tens of thousands of
numbers), readable with the Jetty parser the jar already ships, and diffable.
Two builders over one `Position` keep the meaning of a feature in one place:
the live path can only disagree about what the board is, and the live check
measures exactly that.

**Measured** (2026-10-03, the shared 4-core container at a load of 15 to 130;
28 finished synergy-cube games, both chairs, 3 deck pairs, 2,718 rows --
`record-pairs.sh` stopped at the coordinator's request; the rest are the owner's
PC's, `tools/ml/README.md`):

- Golden parity: 2,561 rows of 22 recordings, every feature identical, worst
  |P_java - P_python| = 2.2e-16; scrambler: 2,561 rows unchanged, negative
  control changes rows; a planted leak (the opponent's hand read in both
  `JsonPosition` and the encoder) fails it.
- Live parity, two games (seeds 11, 12 of `synergy-1003`): 341 and 467
  decisions, 97.7% and 99.1% identical on every model-read feature; the rest is
  the combat block only (the `CombatView` lags an attacker or blocker removed
  mid-step until its next refresh: at most 4 decisions of 467). Hidden-zone
  redeals: 808, features moved 0; the negative control changed 712 of 728.
  `EvalLiveCheck` tolerates the combat lag up to 3% of decisions and fails
  anything else.
- Speed: encode 22-69 us and predict 12-22 us per position for the 3,133-feature
  fixture model (`EvalSelfTest`, varying with load); the whole live call
  (`GamePosition` + encode + predict, 3,456 features, 64 hidden) median 117-125
  us, mean 0.4-0.7 ms, p99 12 ms (GC and load spikes).
- **Accuracy: at three deck pairs the evaluator does not generalise.**
  Leave-one-pair-out CV over the 28 games (log-loss, all rows): prior 0.692,
  life 0.841, core (D305's twelve numbers) **0.649**, evaluator 1.542 (by-game
  CV, D305's split: 0.658 / 1.049 / 0.731 -- by game flatters, D317). The
  single pair split (1 train pair, 1 val, 1 test): test prior 0.691, life
  0.561, core **0.516**, evaluator 0.695 (it kept epoch 1). Stronger
  regularisation (16 units, L2 1e-2, card L2 1.0, dropout 0.3: 0.924) and no
  hidden layer at all (0.839) do not fix it: the inner validation split cannot
  be by pair with two training pairs, so early stopping cannot see pair
  overfitting. With the 22 Marvel fixture games held out as a second card pool
  (`holdout:fixtures/games`, both pools in the vocabulary): prior 0.677, life
  **0.600**, core 0.809, evaluator 0.672. `train_eval.py` prints a verdict line
  and says when the evaluator loses to a baseline; until the owner's PC run
  says it wins, the search keeps its hand-written leaf.

**Rejected.** A weight per card-state cell (D305 measured the overfit); an
open, hashed vocabulary (the cube is closed, D305); a GPU-only trainer (the
owner's PC may have none); ONNX or a binary format (a dependency for a few
thousand floats); reading Forge's `CardView`s for the live encoder (a fourth
`CardView` file for lint rule 5, and a search copy's views are not maintained);
reproducing the four game-level tally counters by subscribing to the copy's
events (the search copies games mid-turn; a model that does not read them is
simpler and loses little).

## D317 — The ML split is by deck pair by default, and every evaluator report says how many test rows come from a deck seen in training

**2026-10-03** (the methodology review: a by-game split flatters, because the
bench replays the same deck pairs over many seeds)

**Decision.** `dataset.py --group-by match` is the default: every game of one
deck pair -- one draft, in the cube lab -- is one split group; a log with no
match block stays its own group; `--group-by game` keeps D305's split.
`games.jsonl` records each game's `match` and `game_group`. `train_eval.py
--split-by` re-splits a built dataset: `pair` (default; with fewer than 20
pairs, at least one each in validation and test), `game` (D305's, for
comparison), `holdout:REGEX` (every game whose deck names or log path match is
the test split -- a whole cube held out, given a vocabulary over both cubes),
and `dataset`. `--cv K` folds by pair (leave-one-pair-out when there are K
pairs or fewer); early stopping inside a fold uses held-out games of the
training pairs. Every report prints rows, games and pairs per split and the
number of test rows from a deck the training split holds (0 under `pair` and
`holdout`).

**Why.** Measured on the same 28 games (D316): the evaluator's out-of-fold
log-loss is 1.049 by game and 1.542 by pair, the core logistic's 0.731 and
0.649 -- the split changes the ranking. The search will meet decks it never
trained on every night; pairs are the unit of novelty.

**Rejected.** Splitting by single deck (a pair's two decks always play each
other in a bench, so a deck and its opponent would straddle splits); a random
row split (D305).

## D318 — The AI ladder: named AI configs rated on one Elo scale from ai-bench games on mirrored deals, forge-default fixed at 1500, every game one line of an append-only per-machine log

*Branch `c/ai-ladder`. D318–D321: D312–D314 are the search AI's, D315
lab-record's and D316–D317 the evaluator's; renumber at the merge if they
clash.*

**2026-10-03** (the owner's goal: an AI that beats stock Forge, then improves
against its own past versions)

**Decision.** `tools/ai-ladder.sh` (TypeScript under `tools/ai-ladder/`,
`docs/guides/ai-ladder.md`) rates **players** — a name for `{kind, params}` in
the committed `tools/ai-ladder/players.json` — against each other. A **kind**
is a row of `tools/ai-ladder/kinds.ts`: its parameters (int or enum, which is
what the tuner varies) and the ai-bench seat config the params become
(`forge` → `Reckless`, `policy` → `Default+outlets`, `search` →
`…+search:ms=…`). A kind this checkout cannot play — unknown, or its engine side
unmerged — is reported unavailable with its reason and never scheduled, never a
crash. Stock Forge profiles are **anchors**, always in the pool;
`forge-default` is fixed at 1500.

- **Every game is an ai-bench game** (D309): a batch is one `AiBench play`
  JVM, never a fork of it. The one hook the ladder added is `--mirror`
  (backward compatible: without it every seed is what it was, a self-test check
  says so): games 4k/4k+3 and 4k+1/4k+2 of a pair share a seed — the same deck in
  the same seat, the configs swapped — so each deal is played from both sides.
  The flag sits on its own lines in `play()`'s argument switch and a new
  `gameSeed()`, apart from the seat-config parser the search branch changes.
- **Identity is the config hash** (sha256 of the kind and the default-filled
  params): a game is credited to whichever registered player has that hash, so
  a later-registered tuner candidate keeps its games and an edited config does
  not silently merge two AIs (its old games are rated apart as `name@hash`).
  Tools only append to the registry.
- **Results** are one `GameRecord` line per game in
  `var/ai-ladder/results/<host>.jsonl`, append-only, one file per machine, ids
  unique across machines: a second PC's file is copied in beside the first.
- **Ratings**: Bradley–Terry on the logistic Elo scale, MAP under a normal
  prior centred on 1500 (sd 350; it only matters for few or one-sided games),
  Newton's method with the anchor's row removed; 95% intervals from the
  Hessian, or by bootstrap over mirror blocks (a deal's two games are one
  unit). Draws (timeouts, engine errors) are counted and not rated.
- **Seeds line up**: batch k of a matchup uses the host's base + k and a fixed
  set of deck pairs for k, so two players' batches against a common opponent
  are the same deals; each host has its own base.
- **`ladder.json` schema 1 is ForgeCoach's contract**, with D297's rule: add a
  field freely, rename or redefine one only as schema 2 with ForgeCoach in the
  same breath. The guide documents it; `web/test/ai-ladder.test.ts` pins its
  keys.

**Rejected.** A ladder that plays its own games (a second game loop beside
ai-bench to drift from D309's); Elo updated game by game (order-dependent, no
honest interval); one shared results file (two machines appending to it over a
network share is a corruption path; per-host files merge by copying);
identity by name (a re-tuned config under an old name would inherit games it
never played); YAML (no parser in the repo, and JSON one-line-per-player diffs
as cleanly).

**Revised the same day, after the methodology review** (the coordinator's
review of the AI and statistics lanes, findings H2, M1, M3, M5, M8):

- **Mirrored deals are the default for evaluations.** `ai-bench.sh play` now
  passes `--mirror` unless `--no-mirror` (which reproduces the pre-D318 seeds
  of D309–D314's runs), and `ai-bench report` prints A's score **against the
  known 50%** by deal — with deck and seat swapped, a tie is exactly 50% by
  symmetry — with its interval, p and Elo. No separate Default-vs-Default
  control run: a control's own luck (D312's 47%) no longer leaks into the
  effect, and the compute it cost is saved. The interval's variance is shrunk
  by one pseudo-deal toward ¼ so a handful of all-split deals cannot claim a
  zero-width interval.
- **Dev and confirm deck sets.** `tools/ai-bench/pairs-dev.txt` and
  `pairs-confirm.txt`, 30 pairs each, from cube-lab drafts across six cubes
  (`ai-ladder.sh decksets`: `cubelab.sh run --games 0`, which this decision
  allows — draft and build, play nothing), each cube's drafts dealt alternately
  by seed. `tune` plays dev and refuses confirm; `run`, `sprt`, `league`,
  `ratings` and `report` play and rate confirm. The old `pairs-cube.txt`
  stays for D309–D314's numbers.
- **Fixed-rollout benchmarks.** A wall-clock search measures the machine as
  much as the AI (a quarter of `search-v1`'s decisions fell back to Forge on
  the shared container). D312's loop already stops at `maxrounds`, so a
  fixed-count mode needs no search change: `search-v1-fixed3` is `rounds =
  maxRounds = 3`, the 60000 ms ceiling and a fixed determinization seed (the
  `search` kind gained the `seed` parameter). Benchmarks use it; live play
  keeps the clock. Each game line records the 1-minute load and Forge's own
  timeout count.
- **A committed experiment log**, `docs/evidence/experiments.jsonl`: every
  engine command appends a start line (git sha and dirty flag, deck set and
  hash, players and config hashes, seed base, purpose pilot | dev | confirm,
  the hypothesis) before its first game and an end line when it stops; a start
  with no end is an abandoned run and stays in the log.

## D319 — The ladder spends its games where they inform: new players first, a fixed share against the anchors, then the closest, most uncertain pair; an SPRT on mirror-pair scores decides "A beats B by ≥ elo1"

**2026-10-03**

**Decision.** `run --hours H --jobs J` keeps J workers busy with batches until
the budget is spent (a batch starts only if it is expected to finish in time).
The next matchup (`schedule.ts`, pure, deterministic): (1) a player with fewer
than 40 decisive games, against forge-default until that pair has 40, then its
nearest rating; (2) if fewer than 25% of this run's batches involved an anchor,
the most informative anchor pair; (3) otherwise the pair maximising
`p(1−p)·(se_A² + se_B²)` — a game's Fisher information about the rating
difference times what is still unknown — discounted by batches of that pair
already running.

`sprt A B --elo0 --elo1 [--alpha --beta]` runs the generalized SPRT on
**mirror-pair scores** (A's share of a pair's decisive games): the two games of
one deal are correlated, so the pair, not the game, is the independent unit —
the same reason Fishtest moved to pentanomial. `LLR = N((x̄−s0)² − (x̄−s1)²)/(2σ²)`,
Wald's bounds, no decision before 8 pairs (σ² is floored), inconclusive at
`--max-games`. Every test is a line in `sprt.jsonl` with the games it used.
Synthetic checks: +70 Elo accepts H1 in 20 of 20 runs, −30 accepts H0 in 20 of
20, and at Elo 0 against `elo1 20` H1 is accepted in at most 10% of 120 runs
(alpha 5%).

**Rejected.** Round-robin scheduling (most of its games are between players
whose order is already settled); a plain binomial SPRT over games (it treats a
deal played from both sides as two independent observations, overstating the
evidence); deciding on a fixed number of games (an obvious result wastes the
night, a close one is underpowered).

## D320 — The tuner races a config's parameters by successive halving on shared deals against a fixed pool, and writes its winner back under a new name

**2026-10-03**

**Decision.** `tune <base> --param k=v1,v2 …` varies any int or enum
parameter of the base's kind over the grid (or `--sample K` seeded points).
Round r: every surviving candidate plays `blocks·eta^r` batches against each
opponent in a fixed pool (default forge-default and forge-reckless), **all
candidates on the same deals** (one `--seed` per batch slot), so their
differences are paired; the score is the pooled win rate over all rounds; the
best `ceil(n/eta)` survive. The winner is appended to `players.json` as
`<base>-t<n>` (or `--name`, never over an entry; nothing is written when its
config is already registered), optionally as a league candidate. It was proven
on what existed before the search: the Forge profile and the outlet policy
on or off. Synthetic check: with one config 50 Elo above the next, it
wins 8 or more of 10 tunes.

**Rejected.** Bayesian optimisation (the parameters are few, discrete and
noisy; halving is robust, parallel and explains itself round by round); judging
candidates by their ladder rating (it mixes in whom they happened to play; a
fixed pool is a fixed yardstick); overwriting the base (results are keyed by
config, and a name is permanent).

**Revised the same day:** the tuner plays the **dev** set only and refuses
the confirm set; its winner's score is optimistic (it won a race on noisy
scores) and is never quoted as evidence — the winner is confirmed by an SPRT or
the league on the confirm set.

## D321 — League mode: the newest version plays a fixed share against its past versions and the anchors; a candidate is promoted only if an SPRT says it beats the current best AND a non-inferiority test shows it is not worse against forge-default

**2026-10-03**

**Decision.** `league --hours H` keeps `var/ai-ladder/league.json`: the current
best (forge-default before any promotion), the promoted versions, and each
decided candidate (a registry player marked `"candidate": true`). The pool is
the last N promoted versions plus the anchors. A fixed share (50%) of batches
is the best against the pool member it has played least — the self-play loop;
a pending candidate's tests cycle candidate-vs-best (the SPRT) twice,
candidate-vs-forge-default and best-vs-forge-default on the same deals; the
rest is the ordinary ladder. **Promotion needs both**: SPRT accepts H1 against
the best, and a **non-inferiority test** against forge-default passes: on the
same deals, each shared mirrored deal gives d = the candidate's pair score −
the best's, and a sequential test of "inferior by δ" (mean d = −δ, δ = 30 Elo ≈
0.043) against "equal" (mean d = 0) accepts "equal" — stated error rates: a
candidate truly 30 Elo worse passes 5% of the time (alpha), a truly equal one
90% (power). Simulated with correlated deals: 4.8% and 93.8%, about 650
shared deals on average. H0, an inconclusive SPRT, or an "inferior" or
inconclusive Forge test rejects it, and the reason is kept. All of it plays on
the confirm deck set. When the best is forge-default itself, the SPRT's games
are already the candidate against forge-default, and the Forge test reads them
(d = pair score − ½) instead of playing more.

*Revised the same day.* The first version compared the two point estimates
(≥ 80 decisive games each, margin 0): with an SE of about 39 Elo on the
difference it rejected about half of the candidates equal to the best and
about 30% of those 20 Elo better — a coin flip after a long SPRT (the
methodology review's M5).

**Why the second condition.** Self-play can climb by exploiting its own past
versions' habits; Forge is the opponent the owner actually plays and the
anchor of the scale, so a version that "beats itself, forgets Forge" is not an
improvement. The check is paired (same deals) so it costs little.

**Rejected.** Promoting on rating alone (the rating is pooled over many
opponents and lags); keeping only the latest version in the pool (cycles:
A beats B beats C beats A go unseen); generating candidates inside the league
(the generators are the tuner today and the evaluator's training later; the
league judges, it does not invent).

## D322 — Bridge drafts: a pool sampled afresh per draft from two or more cubes, each cube's share stratified by its sections, every card tagged with its source cube, the cubes' ratings put on one scale per draft

*Branch `c/matchup-model`; D322–D324 (the next free numbers after the search
AI's D312–D314, the lab recording's D315, the evaluator's D316–D317 and the
ladder's D318–D321 on their branches).*

**2026-10-03** (the owner's request: one model over every cube's cards, and
"bridge drafts" between cubes)

**Context.** Games inside one cube rank that cube's cards against each other
and nothing else; the cubes' card scales float apart. A game between a deck
drafted from cube A's cards and one from cube B's links the two scales, the
way games across pools anchor an Elo ladder.

**Decision.** `tools/cubelab.sh run --bridge a,b[,c]` (`tools/cubelab/bridge.ts`)
drafts from a pool sampled for each draft from its seed (rng stream `bridge`;
D294's rule, so a pool, its picks and its decks are a function of the seed):
each cube gives its share (`--bridge-ratio`, equal by default) of
`--bridge-size` (180) cards, apportioned over that cube's own sections by the
largest remainder, so each half keeps its cube's colour balance; a card two
cubes list is taken once and the next card of its section stands in. Every
draft line carries `bridge: {sources, shares, from}`, `run.json` a `bridge`
block and `cubeFile: bridge:<a>+<b>`; a run without `--bridge` writes what it
wrote before (one added optional field in each type, one added term in the
resume check). The cubes' ratings are on different scales, and drafters
comparing them take mostly the stronger cube's cards (measured: 17–50% of a
deck from Pauper in a Pauper + Vintage pool), so by default
(`--bridge-ratings even`) each draft rescales each cube's cards to the pool's
mean and SD — order within a cube kept, the halves weighed evenly (measured:
41–56%); `own` keeps the raw ratings.

**Rejected.** One pool per run (fewer contexts per night, and a run's
`cards.json` is then one arbitrary sample); deck composition forced (one deck
from each cube): it would test the cubes against each other, not mix them, and
the drafters would no longer draft; leaving the ratings raw: the weaker cube's
cards would seldom meet the stronger cube's, the link a bridge is for. The
matchup model reads only what was played, so how a deck came to be does not
bias it — it decides which cards meet.

## D323 — The overnight queue: one root folder of normal and bridge drafts over every cube, drafts allocated by card uncertainty pooled by name, bridge pairs chosen for information, each pool key's seeds handed out once across nights

**Decision.** `tools/cubelab.sh queue plan|run --night N --drafts D`
(`tools/cubelab/queue.ts`). `--bridge-share` (0.2) of the drafts go to bridge
pairs, the rest to the cubes' own drafts; in each half drafts follow weights.
A cube's is Σ var_c / m_c over its cards — var_c the card's uncertainty
(`--power`'s SD², else 1 / (16 + g_c/4) from its decisive games so far under
the root, pooled by name across cubes), m_c the number of cubes listing it —
so a card several cubes share is paid for once and a cube whose cards are
covered elsewhere gets fewer drafts. A pair's is novelty (1 − shared / the
smaller cube) × link (1.0 for adjacent power tiers, 0.7 for flat with powered,
0.4 within a tier) × its cards' mean uncertainty; a pair under 0.25 before
uncertainty is skipped (Omega + Vintage, 108 cards shared: 0.16; Fair Fight +
Pauper, 99: 0.18). Each pool key (`normal/<cube>`, `bridge/<a>+<b>` in one
order) has one run folder that nights append to; `queue.json` hands out its
seeds once, a plan is refused if it repeats one, a written plan is re-read on
a re-run, and `run` skips a seed already in `drafts.jsonl` — no deck pair is
drafted twice and a resumed night replays no finished draft. Chunks of every
key interleave, so a night cut short has some of everything; a failed chunk
is reported and the night goes on. One engine lookup covers all cubes' cards
(`engineFacts` now reuses a cached lookup that covers the names asked for).
`--record-every N` is passed to every run for D315's in-worker recording, and
the night stops if the lab does not record. The knobs are `QUEUE_DEFAULTS`
and `TIERS`, with a row each in the guide.

**Rejected.** Round-robin pairs (half the pairs re-draft nearly one pool);
a separate night per model (the evaluator and the matchup model read one
pooled recorded run); a per-cube rating pass (it rates a shared card again
in every cube).

## D324 — The matchup model: P(deck A beats deck B) over every cube's cards at once; the plain pooled Bradley-Terry first, bigger models only if they beat it on held-out drafts and cubes; priors and intervals by draft

**Decision.** `tools/ml/matchup_data.py` reads cube lab run folders — no new
lab output: `drafts.jsonl` already holds both played decks, the winner and the
verified play side — into one record per decisive game (v1: `id, draft, pool,
kind, cubes, seed, game, deckA, deckB, onPlay, winner, from?, run`), each game
once (pool, seed, game and both decks), cards by name. `tools/ml/matchup.py
train` fits a ladder: **M0**, a pooled Bradley-Terry on cards, logit P(A) =
Σ (n_A − n_B)·p_c + β·play with p_c = w·f_c + b_c — one power per card, the
card's features (mana value, colours, types, P/T, keywords, rules-text
patterns, Forge's rank, from the lab's cached engine facts) as the prior mean
so an unseen card gets a guess; **M1**, M0 + a per-cube deviation; **M2**, M0
+ embeddings, a deck term and an antisymmetric matchup term (torch, opt-in).
Baselines: a coin with the play, plain Bradley-Terry, and the per-cube shrunk
win rates as `meta.json` computes them. The prior widths are chosen by 5-fold
cross-validation **grouped by draft**, never by the Laplace evidence, which
counts a best of three's games as independent and picked too loose a prior
(τ = 0.035) on the first real data; the split is by draft, held-out intervals
bootstrap over drafts, a card's SD comes from refits on bootstrap resamples of
the training drafts. Held-out cubes are scored with every game touching the
cube removed. Outputs: `power.tsv` (one scale for every card, its SD, its
feature prior), `cube-dev.tsv`, `balance.json` and `report.md` (the balance
number: the SD across a cube's decks of their predicted win rate against the
cube's other decks; bridge composition; overlap), `model.json`. `design`
(`matchup_design.py`) is a prototype: in-class swaps under a swap budget,
candidates from cubes at or below the target's power tier, every output marked
PROPOSED BY MODEL, UNVERIFIED with the lab command that verifies it on fresh
seeds.

**Its place.** It is meant to become the one source of card value — to
replace `meta.json`'s per-card win rates (deck value, confounded) and
`learn.ts`'s per-cube fit (and its τ of 0.25, which implies 85/15 matchups
from cards alone) — not to sit beside them. The switch (`meta.json`
`value`/`valueSd`, then `evolve`'s cuts, ForgeCoach's `score.ts` and
flatness) waits for data that shows card signal.

**Measured** (`docs/evidence/matchup-model.md`): 285 decisive games, 143
drafts. Out-of-fold by draft no model beats the coin (0.6925): M0 +0.012
[−0.010, +0.037], M1 +0.014, the per-cube meta rates +0.086 [+0.002, +0.178],
M2 +0.080 [+0.022, +0.145]; cross-validation picks τ = 0.002. That is the
pipeline proven, not a card scale: the review's estimate is about 5,000 games
a cube, which the PC's nights provide.

**Rejected.** Starting with embeddings (they lost to M0 out-of-fold at this
size, as D305's wide evaluators did); the per-cube ratings as the value (the
confounding, and on these games they predict worse than a coin); a separate
model per cube (72% of card-games here are of cards two or more cubes list).

## D325 — The coach helper queues questions instead of refusing them: one runs, up to four wait (`--queue-max`), a queued one can be superseded by key, and `/health` says so

*Branch `c/helper-queue`; D325, the next number free of every lane's claim (D315–D324 are other lanes').*

**2026-10-03**

**Context.** D292's helper ran one question at a time and answered a second one
429 after a five-second wait. ForgeCoach's coach benchmark asks two questions at
once by default, so on the owner's PC 69–70% of its answers were that 429,
recorded as format failures: only 10 of 28 cases paired, and "unstable" cases
that were only the helper saying busy. Players met the same 429: auto-coach asks
at the main phase and again at attacks, and a manual *Ask* while one is running
errored out.

**Decision.** `/coach` still runs one `claude` at a time, and the others wait
in a first-in-first-out queue of at most `--queue-max` (default **4**; 0 is the
old refusal without the wait). Past the cap a question is still **429** with
`Retry-After: 2`. A queued question gets its 200 at once and the NDJSON line
`{"type":"queued","position":n}` (n questions ahead of it, sent again as it
moves up), then `{"type":"running"}` when its turn comes, then the stream as
before; a question that never waited gets neither line, so D292's stream is
unchanged for it, and an older ForgeCoach ignores both lines (they are not
`text`, `done` or `error`). A queued question whose client disconnects leaves
the queue without ever starting `claude`; a running one is cancelled as before,
its process group killed. The slot is released when the terminal line is
written, not when the process exits, so a client that asks again at once is not
queued behind a process that is only exiting.

**Superseding.** `/coach` takes an optional `"supersedes": "<key>"` (1–200
characters). A new question with a key ends every *queued* question with the
same key at once — its one terminal line is
`{"type":"error","code":"superseded","message":"superseded by a newer question"}` —
and joins the back of the queue. A running question is never superseded (the
client cancels it by disconnecting, which ForgeCoach does when the decision
moves on). ForgeCoach sends one key per tab for the live coach, so a stale
question that is still waiting is replaced, not answered.

**`/health`** also carries `"concurrency": 1`, `"queue": {"max", "length"}`
(waiting now), `"running": 0|1` and `"supersedes": 1`. All of it is additive: a
client that finds no `queue` is talking to a D292 helper and must expect a 429.
`--busy-wait` is still accepted and ignored, so an old command line still starts.

**Checked.** `tools/coach-helper-selftest.mjs` (gate 12f) holds the queued and
running lines and their positions, a full queue's 429, a bad `supersedes` (400),
superseding a queued question (one terminal line, `code: "superseded"`), a
queued client leaving (dropped, the next moves up, no `claude` started for
either), the running question untouched by a key, the queued one then
answering in full, `/health`'s queue before and after, and `--queue-max 0`.

**Rejected.** Running two `claude` processes at once (the owner's usage and the
CLI's own rate limits; one answer at a time is what the PC can give, and the
bench measures latency per answer); an unbounded queue (a stuck client would
pile up minutes of stale questions); superseding the running question by key (a
manual *Ask again* on the same decision would kill the answer that is nearly
done — cancelling is the client's call); a separate status endpoint for the
queue (the stream already reaches the asker).

## D331 — Evolve cuts in two stages: a Benjamini–Hochberg discovery on the generation's own drafts makes a candidate, and only a confirmation on a fresh, disjoint seed range cuts it; win rates count the deck's match as the unit; nothing is pooled across generations

*Branch `c/evolve-rigor`; D331 rather than D326, because D326–D330 may be held by
branches not yet pushed (main holds up to D325).*

**2026-10-03** (the methodology review's finding M2: "evolve's cuts are about
180 simultaneous 95% tests, re-checked as data accumulates")

**Decision.** D299's thresholds — a Wilson 95% bound per card, per rule — are
replaced by two looks (`tools/cubelab/evolve.ts`, arithmetic in
`evolve-stats.ts`, both pure):

- **The tests.** Each rule is a one-sided exact binomial test: *dead*, H0 "at
  least `deadPlayRateHi` of the on-colour decks play it"; *dominant-win*, H0
  "its win rate is at most the run's mean", which counts only when it also won
  `dominantMargin` (0.05) over the mean (`dominantLoMargin` is renamed, since it
  no longer bounds an interval); *dominant-pick*, H0 "first line at most
  `dominantFirstPickLo` of the time", counting only with a shrunk win rate at
  least the mean. The minimum samples (`minGames`, `minSeen`, `minOnColour`)
  still gate a test in discovery.
- **Discovery** reads the generation's own drafts and nothing else. The family
  is every test a cut could follow from — cards with no note, no AI flag, not a
  land, and (for *dead*) rated at least `deadMinRating`, chosen by attribute
  before any result is seen — about 400 tests on Omega. Benjamini–Hochberg at
  `fdrQ` = 0.10 decides; a discovery is a **candidate**. Cards outside the
  family are still reported with the signal they would have given.
- **Confirmation.** When there are candidates the generation plays a second
  batch on the same cube from seeds `S + confirmSeedOffset (10⁶) +
  (g−1)·confirmMaxDrafts` onward (`gen-NN/confirm/`), disjoint from every
  discovery batch and every other generation's confirmation, and tests each
  candidate's rule again on that batch alone, with Holm at `confirmAlpha` =
  0.05 across the candidates and the size filter again. Only a confirmed
  candidate is cut; a note-cut needs no confirmation. The batch is sized per
  candidate for power `confirmPower` = 0.8 at Holm's strictest level
  (`confirmAlpha` / candidates), at the effect that matters — not at the
  discovery estimate, which selection biased upward: a win rate `dominantEffect`
  = 0.10 over the mean, a first-line rate `pickEffect` = 0.9, an on-colour play
  rate `deadEffect` = 0.1 — using the observations per draft the card met in
  discovery; the largest need, within `confirmMinDrafts` 20 ..
  `confirmMaxDrafts` 300, is the batch (a candidate whose need is over the cap
  is reported under-powered and tested anyway).
- **Clumps.** A card's games are its decks' matches: one deck, one opponent,
  about 2.4 games. The generation's design effect D = Σ(wᵢ − p̄nᵢ)² /
  (p̄(1−p̄)Σnᵢ) over every played deck divides a card's games and wins before
  its test and its interval (`clusteredCi`). It is pooled over the batch's
  ~2N decks rather than computed per card (a sandwich over a card's 10–60
  decks is too noisy to test with). D is exactly 1 for independent games with
  best-of-three's stopping included (enumerated in the test), so it measures
  only how much decks differ; the lab's runs give 1.08 (pauper, 20 drafts),
  1.21 (synergy, 40) and 1.10 pooled. An ANOVA intra-class correlation was
  tried on paper and rejected: the stopping rule alone gives it about 0.11 with
  no real inflation. Play and first-line rates need no correction (one
  observation per card per pool or grid).
- **Recording.** `evolve --record-all` / `--record-every N` passes D315's
  `recordEvery` to both batches' runs; it changes no decision and is not part
  of `evolve.json`'s resume key.
- **Reporting.** The changelog and the page explain discovery and confirmation
  in plain words, list every candidate with its discovery numbers (p, BH q) and
  its confirmation numbers (p, Holm p), and a swap's evidence names both seed
  ranges; the iteration-log line names the confirmation batch.

**The repeated looks.** D300 pooled a generation's drafts with the earlier
generations that drafted the same list, so a card was re-tested on a growing
sample until it crossed — optional stopping. Now no data is read by two
decisions: each generation's discovery has fresh seeds, and each confirmation
has its own. So the chance that a generation cuts any card by chance is at
most `confirmAlpha` whatever discovery did (Holm on independent data), and
under a cube where nothing is wrong at most `fdrQ`·`confirmAlpha` = 0.5%; over
G generations at most G times that. Alpha-spending across pooled looks was the
alternative; it keeps pooling's power but needs the number of looks fixed in
advance (a resumable loop does not know it) and its bookkeeping in every
folder. The price of not pooling is that a weak lead does not accumulate: the
remedy is a bigger generation, and *watch* says how big.

**Measured** (`node tools/cubelab/evolve-sim.ts --sims 1000`: a simulated
180-card cube, best of three, deck spread set so D ≈ 1.15, about 0.6 decisive
games per card per draft as Omega's runs give, the real `discoveryStage` and
`confirmCandidates` on the simulated stats):

| null cube (no card better) | any false flag a generation |
|---|---|
| old rule, 30 drafts, one look | 43% |
| old rule, 30 drafts, three pooled looks | 90% (mean 2.6 cards) |
| D331, 30 / 100 / 200 / 400 drafts: any false candidate | 0.2% / 2.6% / 2.3% / 2.4% |
| D331, same: any false cut | 0.0% / 0.0% / 0.0% / 0.3% |

The review's own script gave 18% and 83% with independent games; deck spread
makes the old rule worse. Power, a single planted card (confirmed and cut;
extra confirmation drafts per generation on average, zero when nothing is
found): dead (played by 5% of the decks that could) 63% / 93% at 100 / 200 drafts; dominant
+0.15 on its deck's game-win chance 17% / 56% / 80% at 200 / 400 / 600 drafts
(60 / 172 / 245 confirmation drafts); dominant +0.10 2% / 9% / 21%. Under the
null, confirmation costs 0.5–7 drafts a generation on average, because it runs
only in the 2–3% of generations with a candidate. With a planted dominant card
the hitchhikers — cards that shared its decks — are cut by chance in under 1%
of generations: that is the confounding of the review's H1, which only a
deck-adjusted card value (`learn.ts`) removes.

**What it means for a run.** At 30 drafts a generation nothing is cut on AI
evidence; 200 finds the dead; a card dominant by wins needs 400–600 drafts a
generation, or a note. The guide says so. Old evolve folders are refused
(their knobs differ).

**Held by** `web/test/cubelab-evolve.test.ts` (no cut without a confirmation;
a candidate the fresh batch does not repeat stays; the confirmation counts are
the fresh batch's own; both batches in the evidence, the changelog and the
page) and `web/test/cubelab-evolve-sim.test.ts` (the arithmetic against hand
values; on the null cube the old rule's false-flag rate over 20% one look and
70% pooled, the new candidate rate at most 10% and the cut rate at most 5%;
a planted dead card confirmed at least 80% of the time at 200 drafts and a
planted +0.15 card at least 65% at 600).

**Rejected.**

- **BH alone, cutting on discovery** (the review's alternative): it bounds the
  share of wrong cuts, not the chance of one, and a 10% FDR may cut a wrong card
  in up to one generation in ten when the cube is fine.
- **Separate BH families per rule:** under a cube with nothing wrong the
  family-wise rate adds up across them.
- **A hierarchical Bayes screen** (shrink every card's effect toward the mean
  with a fitted spread): when nothing is wrong the fitted spread is near zero
  and it flags as little as BH, and it buys a model of card effects the next
  step (H1: `learn.ts`'s deck-adjusted values) will replace.
- **Sizing confirmation by the discovery estimate:** the winner's curse makes
  it too small.
- **A per-card cluster-robust variance:** too few decks per card to test with.

## D333 — The match launcher picks the opponent AI: `POST /match` takes `aiPolicy` (`plain`|`outlets`|`search`) and `aiSearchMs` (500–5000), `/health` advertises them, and `play.sh` passes them as `--ai-policy` / `--ai-search ms=<n>`

*Branch `c/match-ai-policy`; D333, past every number open lanes may hold (D326–D332).*

**2026-10-03** (D314's follow-up: "a ForgeCoach-side switch … changed in both
repositories or not at all")

**Decision.** `POST /match` (D303) gains two optional keys. `aiPolicy` is exactly
one of `plain`, `outlets`, `search` — D314's `--ai-policy` values, case-sensitive,
no aliases; `aiSearchMs` is a whole number 500–5000 and only goes with
`"aiPolicy": "search"` (`--ai-search ms=<n>`; absent, the bridge's default 1500).
Anything else is a 400 before a file is written, as for every other field.
`request.json` carries them only when sent; `play.sh` re-checks both in its node
reader (the same enum and range) and, when the request names a policy, drops the
startup's `--ai-policy` / `--ai-search` from the restart's argv and appends the
request's — so a `play.sh --ai-search` session can still be asked for plain
Forge. **No `aiPolicy` keeps today's behaviour**: the restart keeps whatever
`play.sh` was started with. A wake (`/engine/start`, D308) restarts the last
setup, policy included. The reply and `GET /match` gain `aiPolicy`, read from the
bridge's banner (`ai policy = …`; no line is `plain`). `/health`, when `"match":
1`, gains `"aiPolicies": ["plain","outlets","search"]` and `"aiSearchMs": {"min":
500, "max": 5000, "default": 1500}` — additive, so ForgeCoach shows its
"Opponent AI" choice only to a helper that lists them and sends no key to an
older one. The wire is unchanged: nothing of the policy or the search reaches a
frame or `hello_ok` (D314), and the AI's deck stays a name and a count (M44).

**Checked.** `tools/match-launcher-selftest.mjs`: `/health`'s two keys; no
`aiPolicy` adds no flag (plain, as started); `search` with 3000 reaches the
engine as `--ai-policy search --ai-search ms=3000` and `GET /match` says
`search`; `outlets` replaces it with exactly one `--ai-policy` and no
`--ai-search`; a later request without the key goes back to as started; a
`play.sh --ai-search-ms 2000` session keeps its search on a request without
`aiPolicy` and drops it for `"aiPolicy": "plain"`; refused with 400 and nothing
restarted: an unknown policy, the wrong case, a policy carrying a flag, a
budget under 500 or over 5000, a budget as a string (`"3000,turns=4"`), a budget
with `outlets` or with no policy.

**Rejected.** Exposing D312's other knobs (`turns`, `rounds`, candidates) to the
page (the budget is the one a player can feel; the rest are the lab's, and
every key added is one more thing to vet); a free-form `--ai-search` string
(only an enum and an integer may reach a command line); making a missing
`aiPolicy` mean `plain` (it would silently undo a `play.sh --ai-search` start
for every client that predates this); the search as the default (D314).

## D334 — The coach grader: a logged decision rebuilt from the viewer's redacted view, every option played out by Forge Default through the search AI's own rollout, on common random numbers with racing; regret is the best win rate minus the option's

*Branch `c/coach-grader`; D334–D336, the next numbers free on `main` at push
(D326–D330 may be other lanes'). ForgeCoach's half is its branch `c/coach-regret`.
D336 refocuses it on live analysis.*

**2026-10-03** (accepted from Justin's PC session's proposal: the coach bench's
headline metric becomes each answer's *regret*, estimated with engine playouts)

**Decision.** `tools/coach-grade.sh` (Java: `bridge/src/mtgtable/grade/`) grades
one decision of a recorded game — a ForgeCoach bench moment, `live` (everything
before frame N, `liveMoment`) or `review` (the state frame N, `extractDecisions`),
indexed exactly as ForgeCoach's `log.ts` — for the viewing seat:

- **The position** is rebuilt as a live Forge game with Forge's own `GameState`
  loader (`Rebuild`): life, poison and player counters, mana pool, land drops this
  turn (from the turn's `land` events), every visible card with its tapped,
  summoning-sick, damage, counter (display name → `CounterEnumType`), attachment,
  owner and attacking state, tokens by their token script, each card carrying
  `Id:<wire id>` so the loader's own targeting speaks wire ids, and the live cards
  are matched back to wire ids zone by zone.
- **What it may use is the search AI's rule (D312):** everything public, the
  viewer's own hand and deck list, and the opponent's deck list — or, when that is
  unknown, a plausible deck drawn from a pool (a cube's list: spells of the
  opponent's seen colours, basics for the rest of 17 in 40). Hidden hand, library
  and unknown face-down cards are that list minus every card seen; each playout
  then redeals them with its own seed (`Determinizer`). **The real hidden cards are
  never read** — the log does not carry them (hard rule 8), and nothing asks.
- **Fidelity is reported, not assumed.** `GameState` rebuilds cards, not history:
  until-end-of-turn effects, "this turn" memories other than land drops, hidden
  exile, emblems and most stack items are lost. Every loss the rebuild can see
  goes into the result's `fidelity` list, and the rebuilt battlefield's power and
  toughness are compared with the log's card by card. Two loader artefacts are
  undone: triggers it fires again while declaring the logged attackers are removed
  when the log's stack is empty, and the blocks its own advance into declare
  blockers asked of the viewer's Forge controller are cleared.
- **Options**, in the bench's tokens: `spell` — `pass` and `cast:<id>` for every
  spell the engine lets the viewer cast and pay for now, aimed as Forge's AI aims
  it (`canPlaySa`, else its mandatory targeting); with the land drop open, Forge's
  choice of land is played first in every option (`--lands` grades land drops as
  options instead), and copies of one card are one option listed under each token
  (`alias`). `attack` — every legal attack on the opponent by creature class
  (ForgeCoach's `classKey`: identical creatures are one choice), or above `--cap`
  a shortlist (none, all, Forge's, Forge's with one class more or less, each class
  alone, the case's own answers). `block` — every legal assignment by blocker
  class, deduplicated by class, or a shortlist likewise. `target` — every id the
  engine offered: for a spell or ability being cast, cast it with that target; for
  a trigger of a permanent, its `Execute` SVar put on the stack with that target
  above the logged spell(s) (`putonstack`). Forge Default's own choice is marked
  (`forge`), so every grade also says how Forge itself would have done.
- **Playouts reuse the search, not a fork of it.** `SearchPolicy`'s rollout became
  `SearchPolicy.playout` (public, static) and its candidates public factories
  (`priorityCand`, `attackCand`, `blockCand`); the search calls it with its old
  limits, so its behaviour is unchanged. A playout copies the rebuilt game
  (`LenientGameCopier`), forces the option as the viewer's first answer
  (`RolloutController`), redeals the hidden cards, and lets Forge's Default AI play
  both seats to the end of the game (or `--horizon T` turns and then
  `SearchPolicy.leaf` through a logistic, an option for cheap passes) under the
  round's seeded `MyRandom`. Won 1, lost 0, a draw or a 40-turn cap 0.5.
- **Common random numbers and racing** (`Racer`, `GradeMath`). Round r has one
  seed, a function of (run seed, decision, r) only; every option plays round r on
  that seed — the same determinization and the same engine stream at the start —
  so differences are paired. After `--initial` rounds (40) and every `--batch`
  (20), an option whose paired difference to the current best is above zero at
  99% stops; the rest play on to `--playouts` rounds (200), until one is left, or a
  budget runs out. An option that fails in a fifth of its rounds is retired and
  flagged.
- **The table.** Per option: n, the win rate with Wilson's 95% interval (a draw a
  half), and the regret — the best active option's mean minus this one's, as the
  mean of the paired differences over the rounds both played, with a normal 95%
  interval whose standard error is floored at 1/n, clipped to [0, 1]; the best's
  own interval runs from 0 to the most another option might beat it by. The
  table's `noise` is the median regret half-width. Honest numbers: at 200 playouts
  a win rate near 50% is ±7 points (Wilson), a paired difference between close
  options ±3–5.
- **Threads**: a grading is one task on Forge's game pool, started with
  `GameAction.invoke` on a scratch game and waited on with a latch, exactly as
  `AiBench` starts its games (D309) — one task at a time per JVM; no
  `invokeInGameThread`, no thread of ours, no `CardView`; the lint's lists are
  unchanged. `batch --jobs K` runs K JVMs, each with its own Forge home (D129).
- **Held by** `mtgtable.grade.GradeSelfTest` in `bridge/build.sh` (39 checks: CRN
  seeds, Wilson, paired differences, the regret table on synthetic options with
  known win rates — pairing narrows a close difference's interval below an
  unpaired one's — racing retires the clearly worse options and spends its budget
  on the close ones, budgets, failure retirement, enumeration by class, token
  spelling, the log reader's moments) and `coach-grade.sh selftest` (the engine
  smoke, ten playouts: the rebuild reproduces the log's life, hand size and every
  battlefield card, one seed one spec, one round seed gives every option's copy the
  same opponent library order and another seed another, a real grade).

**Measured** in this container (4 shared cores, under load from other lanes; one
JVM, never more than 20 playouts): a full-game playout from mid-game costs about
4–6.5 s (a turn-3 spell decision, 9 playouts: 6.4 s each; a turn-9 target, 12:
4.3 s), a playout to the end of the next turn 0.4–2 s. On the PC's 9700X with 6–7
JVMs, a 5-option decision at 200 rounds with racing (roughly 600 playouts) is
about 5–10 minutes per JVM; the PC jobs measure it.

**Rejected.** Replaying the real game from its seed (it reads the hidden cards and
library order, the cheat D312 forbids, and a human-seat game is not replayable);
Forge's own simulation (`GameSimulator`: copies the real hidden zones, D311);
writing a second rollout for the grader (two definitions of "play it out" would
drift; the search's is already tested); independent sampling per option (pairing
is what makes a few points measurable at a few hundred playouts); a learned
evaluator as the default leaf (D316's model is per cube and approximate; to the
end of the game is the yardstick, the horizon is a cheap-pass option); enumerating
every attacker subset (2^n, mostly duplicates of identical creatures).

## D335 — The coach bench's yardstick is "best against Forge Default"; every number carries its grading noise, everything is paired, about ten cases are held out, and a low-information table is reported as such

**2026-10-03**

**Decision.** A regret is measured against **Forge's Default AI playing both
seats** from the decision on, the hidden cards redealt from what the player could
know. Why that yardstick: it is the opponent ForgeCoach actually seats (the coach's
job is to beat it); it is fixed and reproducible (a perfect-play oracle does not
exist for Magic, and a stronger AI would itself move as it improves); and it is
cheap enough to grade a bench. Its known limits, stated wherever regret is
reported: it rewards lines that exploit Forge's weaknesses and can call a line
that is right against a strong human wrong; the player's own later play is
Forge's, not the player's; and the rebuild loses history (D334's fidelity list).

The methodology rules, from the reviews of this proposal:

- **Pair everything.** Options within a decision share each round's seed (D334);
  two coach runs are compared case by case on the same tables (ForgeCoach
  `--compare`: the paired bootstrap over cases, the headline once both runs carry
  regret).
- **Report grading noise next to every number.** A case's table carries its
  `noise`; every graded answer carries its regret interval; ForgeCoach's report
  prints the mean half-width beside mean regret, and its per-case table each
  case's.
- **Low information is said, not hidden.** An answer whose regret interval is
  wider than ±0.08 (ForgeCoach `LOW_INFO_HALF_WIDTH`) is counted as
  low-information; the report gives their number and the mean regret without
  them. A mined case whose table is that noisy, or whose rebuild lost something
  that changes the position, is written with `confidence: low` (run, not scored).
- **Hold out about ten cases.** `bench:coach -- import-graded --write --holdout 10`
  marks them (`holdout: true`), spread over decision types and chosen by a hash of
  the id, never by results; a plain run leaves them out (`--split dev`), and
  `--split holdout` runs them only to confirm a finished prompt change. The prompt
  is never tuned on what they show.
- **Format is not quality.** A missing, unparsable or illegal answer has no regret
  and stays a format failure; a legal answer the table has no option for is
  counted apart ("not in table").

**Rejected.** Regret against the best option by a stronger engine (no stable
reference, and the search AI is built on Forge Default anyway); scoring with the
acceptable/unacceptable lists alone (coarse, hand-written, and blind to how much
an answer costs); dropping noisy cases silently (the reader must see what was
thin).

## D336 — The grader's main use is a live engine analysis the coach explains: `coach-grade.sh serve` answers "analyse this decision" for the game in play inside a time budget; the bench's mining and large grading runs are dropped

**2026-10-03** (Justin, mid-lane: cloud LLMs change often and outside our
control, so heavy coach benchmarking is not worth the compute now)

**Decision.** D334's grader is kept whole — the rebuild from the redacted view,
the determinization, the options, the paired playouts on common random numbers,
the per-option intervals and the racing — and its main purpose becomes an
**engine analysis for live play**: for the decision in front of the player, the
engine estimates each option's win rate, and (in a follow-up) the coach's
prompt carries that table, so the model explains the engine's numbers instead
of working the position out — cheaper, steadier across model updates, and
within a small model's reach.

- **`coach-grade.sh analyse`** grades one decision with the live settings: a
  wall-clock budget (`--budget-ms`, default 3000) instead of a playout count,
  at least `--min-rounds` 2 rounds whatever the budget says (an answer with no
  numbers is no answer), playouts to the end of this turn (`--horizon 0`, the
  search's own choice for a 1.5 s think, D312) scored by `SearchPolicy.leaf`
  through a logistic — a pseudo win rate, marked `"measure": "leaf"` (a
  to-the-end grade says `"wins"`) — racing from round 6, options capped at 12.
  `--frame` defaults to the end of the log, so a live game's
  `var/games/<id>/frames.jsonl` is read as it stands (a half-written last line
  is skipped). A round the budget cuts short is dropped, so every option stays
  paired over the same seeds.
- **`coach-grade.sh serve`** keeps one booted engine (Forge's start costs ~10 s)
  and answers requests one at a time: one JSON object per stdin line,
  `{"id", "log", "type", "frame"?, "mode"?, "oppDeck"?, "oppPool"?, "deck"?,
  "budgetMs"?, "horizon"?, "seed"?, "only"?, "minRounds"?}`, answered by one
  JSON line on stdout (`{"ready":true}` first, Forge's own printing on stderr):
  the request's `id`, `status` (`ok`, `trivial`, `unsupported`, `error`),
  `measure`, `rounds`, `playouts`, `stop`, `best`, `forgeChoice`, `noise`,
  `fidelity`, `notes`, `options[]` (`token`, `label`, `n`, `winRate`, `winLo`,
  `winHi`, `regret`, `regretLo`, `regretHi`, `best`, `forge`, `alias`), `ms`,
  `wallMs`. The tokens are the coach bench's (`cast:<id>`, `attack:<ids>`,
  `block:<b>><a>`, `target:<id>`, `pass`) over the log's own card ids, so the
  board and the prompt can name them. Wiring it into the coach helper and the
  prompt is the follow-up; the helper owns the process, as `play.sh` owns the
  bridge.
- **Hidden information** is D334's rule unchanged: the request names the log
  (the viewer's redacted view) and, at most, deck lists the player may know; the
  engine never reads the bridge's live game.
- **Dropped:** the turning-point miner and the large PC grading jobs. Kept, as
  built: the bench's `Sample.regret` plumbing in ForgeCoach (cases may carry a
  regret table; `import-graded --write`, `regrade`, `--split`) and `grade` /
  `batch` here, for when a bench run is worth its compute again.

**Measured** here (4 shared cores at a load average near 20, so every figure is
several times the PC's): two decisions through one `serve` process, 3 s budget,
minimum two rounds — a 2-option block in 7.5 s (4 playouts), a 6-option spell
in 6.4 s (12 playouts); boot ~10 s once. The PC smoke job measures the real
latency.

**Rejected.** A JVM per question (a 10 s boot each time); full-game playouts
for live use (seconds per playout: a few rounds in a budget, all noise); asking
the bridge's live game for the analysis (it would read the real hidden cards,
and a second engine user on the seat's game thread is D309's exclusion argument
undone); a budget that may return no rounds (the coach would explain nothing).

# 01 — The Forge engine/UI seam, and how to drive it from a browser

Research note for **mtg-table**. Everything below was read out of the Forge source checkout at

```
/tmp/claude-1000/-home-justin-a--config-Claude-scratch-workspaces-889ad522-c1ff-402b-8b23-6ae666c9b9a2-dcfb1aed-ebb2-456c-9dd7-5ecedf00d397-scratch-2026-09-11-0947cb/8723af12-0157-421e-988a-473182e5a3f1/scratchpad/forge-src
```

referred to below as `$FORGE_SRC`. All `path:line` citations are relative to `$FORGE_SRC` and were
read directly; anything I am inferring rather than reading is marked **(inference)**.

---

## 0. Executive summary — where the seam is

Forge already has exactly the seam we want, and it is already serialized over a network. The
layering is:

```
forge-game (pure rules engine, no UI types)
    Game / Match / PhaseHandler  ── calls ──▶  PlayerController (abstract, forge-game)
                                                   │
                            ┌──────────────────────┴───────────────────────┐
                            ▼                                              ▼
              PlayerControllerAi (forge-ai)                  PlayerControllerHuman (forge-gui)
              decides in-process, never blocks                     │ turns every decision into
                                                                   │ an Input on a blocking queue
                                                                   ▼
                                                            IGuiGame (forge-gui)  ◀── THE SEAM
                                                                   │
                        ┌──────────────────────────────┬───────────┴────────────────┐
                        ▼                              ▼                            ▼
                 CMatchUI (Swing)          RemoteClientGuiGame (Netty)      **our WsGuiGame**
                                            = server-side proxy for a
                                              remote Forge client
```

Two independent facts make this tractable:

1. **`IGuiGame` is a pure-Java interface with no Swing/libGDX types in its signature.** Its arguments
   are `GameView`, `PlayerView`, `CardView`, `SpellAbilityView`, `GameEntityView`, `String`, `int`,
   `List`, `Map` — all view objects, all `Serializable`. `forge-gui/src/main/java/forge/gui/interfaces/IGuiGame.java:40`.
2. **Forge's own netplay is a mechanical serialization of that interface.** `ProtocolMethod` is an
   enum whose constants are *named after `IGuiGame` / `IGameController` methods* and are dispatched by
   Java reflection (`ProtocolMethod.getMethod()`, `forge-gui/src/main/java/forge/gamemodes/net/ProtocolMethod.java:130`).
   The server side, `RemoteClientGuiGame`, is ~650 lines of "turn this callback into a wire message"
   — precisely the class we want to write, only speaking JSON/WebSocket instead of LZ4'd Java
   serialization.

**The single most important structural fact:** the game runs on its own thread and *blocks* inside
`IGuiGame` calls that return a value. A human decision is a synchronous, blocking Java method call on
the game thread. Our bridge has to park that thread on a latch/future and wake it when the browser
replies. Forge does exactly this twice already (locally with `CountDownLatch`, remotely with a
`FutureTask` reply pool), so the pattern is proven.

**Blocking prerequisite found while checking the environment:** the machine has a JRE only, not a
JDK. `dpkg -l | grep jdk` shows only `openjdk-21-jre` and `openjdk-21-jre-headless`; there is no
`javac`, `jar`, or `javap` in `/usr/lib/jvm/java-21-openjdk-amd64/bin` (only `java`, `jpackage`,
`keytool`, `rmiregistry`). Any Java bridge — and any Maven build — needs a JDK first. Without sudo
the fix is to unpack a Temurin/Adoptium JDK 21 tarball into the project (or `~/.local`) and point
`JAVA_HOME` at it.

---

## 1. How a game is created and run

### 1.1 The object graph

| Class | File | Role |
|---|---|---|
| `Match` | `forge-game/src/main/java/forge/game/Match.java:32` | Owns the `GameRules`, the `List<RegisteredPlayer>`, the per-game outcomes, and a Guava `EventBus` for match-level events (`:38`, `:457`). Best-of-N lives here (`isMatchOver()`, `:125`). |
| `Game` | `forge-game/src/main/java/forge/game/Game.java` (1440 lines) | One game. Owns `PhaseHandler`, `MagicStack`, `GameAction`, the `Tracker`, and the `GameView`. |
| `GameRules` | `forge-game/src/main/java/forge/game/GameRules.java:6` | Plain mutable settings bag: `gameType`, `gamesPerMatch` (default 3, `:11`), `gamesToWinMatch` (2, `:12`), `playForAnte`, `manaBurn`, `appliedVariants`, `simTimeout` (120 s, `:20`). |
| `GameType` | `forge-game/src/main/java/forge/game/GameType.java:18` | Enum. `Constructed` is at `:33`; each constant carries a `DeckFormat`. For us: `GameType.Constructed`. |
| `RegisteredPlayer` | `forge-game/src/main/java/forge/game/player/RegisteredPlayer.java:17` | A deck + a `LobbyPlayer` + starting life (20, `:25`) / hand size (7, `:26`) / commanders / team. Constructor takes the `Deck` (`:43`); `setPlayer(LobbyPlayer)` attaches the identity. |
| `LobbyPlayer` → `LobbyPlayerHuman` / `LobbyPlayerAi` | `forge-gui/src/main/java/forge/player/LobbyPlayerHuman.java` | The factory that decides *which controller* a seat gets. `LobbyPlayerHuman.createIngamePlayer()` news up a `PlayerControllerHuman` and calls `player.setFirstController(...)`. This is the hook that decides human-vs-AI. |
| `PlayerController` | `forge-game/src/main/java/forge/game/player/PlayerController.java:50` | The abstract decision interface the engine calls. ~120 abstract methods. |

### 1.2 Creating and starting a game

`Match.createGame()` (`Match.java:72`) → `new Game(players, rules, this)`.
`Match.startGame(game, startGameHook)` (`Match.java:80`) then:

1. `prepareAllZones(game)` (`:220`) — sideboarding, deck validation, builds libraries from
   `PaperCard`s (`preparePlayerZone`, `:200`), shuffles.
2. `game.getAction().startGame(lastOutcome, startGameHook)` (`:92`).

`GameAction.startGame` (`forge-game/src/main/java/forge/game/GameAction.java:2322`) fires
`GameEventGameStarted`, draws opening hands, runs `MulliganService`, then calls
`game.getPhaseHandler().startFirstTurn(first, startGameHook)` at `GameAction.java:2373`.

The actual loop is in `PhaseHandler`:

```java
// forge-game/src/main/java/forge/game/phase/PhaseHandler.java:1032
public void mainGameLoop() {
    while (!game.isGameOver() && !(game.getAge() == GameStage.RestartedByKarn)) {
        mainLoopStep();
    }
}
```

`mainLoopStep()` (`PhaseHandler.java:1039`) is the priority loop. The critical two lines:

```java
// PhaseHandler.java:1056
chosenSa = pPlayerPriority.getController().chooseSpellAbilityToPlay();
...
// PhaseHandler.java:1079
if (pPlayerPriority.getController().playChosenSpellAbility(sa)) { ... }
```

`chooseSpellAbilityToPlay()` returning `null` means "I pass" (`PhaseHandler.java:1067`). Turn-based
actions call the controller directly too: `declareAttackersTurnBasedAction()` at `:534` and
`declareBlockersTurnBasedAction()` at `:656`.

### 1.3 What thread runs the loop

A dedicated pooled thread whose **name starts with `"Game"`**. That naming is load-bearing:

```java
// forge-core/src/main/java/forge/util/ThreadUtil.java:25
private final static ExecutorService gameThreadPool =
        Executors.newCachedThreadPool(new WorkerThreadFactory("Game"));
...
// ThreadUtil.java:43
public static void invokeInGameThread(Runnable toRun) { getGameThreadPool().execute(toRun); }
// ThreadUtil.java:51
public static boolean isGameThread() { return Thread.currentThread().getName().startsWith("Game"); }
```

`GameAction.invoke` is the entry point (`GameAction.java:2528`):

```java
public void invoke(final Runnable proc) {
    if (ThreadUtil.isGameThread()) { proc.run(); }
    else { ThreadUtil.invokeInGameThread(proc); }
}
```

and `HostedMatch.startGame()` uses it, with a comment that states the contract outright:

```java
// forge-gui/src/main/java/forge/gamemodes/match/HostedMatch.java:281
// It's important to run match in a different thread to allow GUI inputs to be invoked from inside game.
// Game is set on pause while gui player takes decisions
game.getAction().invoke(() -> { ... match.startGame(currentGame, startGameHook); ... });
```

Headless simulation bypasses this and runs the match on the calling thread:
`SimulateMatch.simulateSingleMatch` calls `g1.setNoGUIUser()` then `mc.startGame(g1)` inline
(`forge-gui-desktop/src/main/java/forge/view/SimulateMatch.java:141-148`).

### 1.4 How the game blocks for a human

Via `InputQueue` + a `CountDownLatch`. `PlayerControllerHuman` owns one `InputQueue` and one
`InputProxy` (`forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:121-131`).

```java
// forge-gui/src/main/java/forge/gamemodes/match/input/InputSyncronizedBase.java:37
public void showAndWait() {
    getController().getInputQueue().setInput(this);   // push onto stack, notify observers
    awaitLatchRelease();                              // game thread parks here
}
// :20
public void awaitLatchRelease() {
    FThreads.assertExecutedByEdt(false);              // must NOT be the UI thread
    cdlDone.await();
}
// :43
public final void stop() {
    onStop();
    FThreads.invokeInEdtNowOrLater(this::setFinished);
    getController().getInputQueue().removeInput(this);
    cdlDone.countDown();                              // game thread resumes
}
```

`InputQueue.setInput` (`forge-gui/src/main/java/forge/gamemodes/match/input/InputQueue.java:95`)
pushes onto a `LinkedBlockingDeque<InputSynchronized>` and calls `updateObservers()`, which fires
`InputProxy.update()` (`InputProxy.java:56`) → `current.showMessageInitial()` on the UI thread →
`Input.showMessage()` → `IGuiGame.showPromptMessage(...)` / `updateButtons(...)` / `setSelectables(...)`.

The reverse direction: browser click → `IGameController.selectCard/selectButtonOk/...` →
`PlayerControllerHuman.selectButtonOk()` (`PlayerControllerHuman.java:2720`) → `inputProxy.selectButtonOK()`
→ the top `Input`'s `onOk()` → typically `stop()` → latch released → game thread continues.

`InputQueue.onGameOver(boolean)` (`InputQueue.java:110`) releases latches so a concede doesn't
deadlock. `InputQueue.clearInputs()` (`:68`) stops everything.

**So there are two distinct blocking mechanisms in `PlayerControllerHuman`,** and our bridge must
handle both:

- **Input-based** (`showAndWait()`): priority, attacks, blocks, target selection, mana payment,
  confirms. The engine blocks on a latch; the GUI is driven by prompt/button/selectable *pushes* and
  answers with *fire-and-forget* `IGameController` calls.
- **Dialog-based** (direct `getGui().xxx(...)` returning a value): `getAbilityToPlay`,
  `assignCombatDamage`, `getChoices`, `order`, `chooseSingleEntityForEffect`, `showOptionDialog`,
  `confirm`. Here the engine blocks *inside the `IGuiGame` method itself* and the method must return
  the answer.

---

## 2. The two `PlayerController` implementations

### 2.1 `PlayerControllerAi`

`forge-ai/src/main/java/forge/ai/PlayerControllerAi.java:57`. Constructor builds an `AiController`
(`:65`); `isAI()` returns true (`:89`). Every decision method answers in-process with no blocking —
e.g. `getAbilityToPlay` just returns `abilities.get(0)` (`:77-82`). **We do not touch this class**;
the AI opponent is free. `Game.AI_TIMEOUT` / `AI_CAN_USE_TIMEOUT` are set from preferences in
`HostedMatch.startGame` (`HostedMatch.java:164-167`).

### 2.2 `PlayerControllerHuman` — the decision methods and how they reach `IGuiGame`

`forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:109`:

```java
public class PlayerControllerHuman extends PlayerController implements IGameController, IHasForgeLog
```

Note it implements **both** sides: `PlayerController` (engine → UI) and `IGameController` (UI →
engine). It holds `private IGuiGame gui` (`:117`) with `setGui()` at `:144`.

Mapping of the decision methods that matter (`PCH` = `PlayerControllerHuman.java`):

| `PlayerController` method | PCH line | Mechanism | Reaches the GUI as |
|---|---|---|---|
| `chooseSpellAbilityToPlay()` | 1650 | `new InputPassPriority(this)` (`:1710`) then `defaultInput.showAndWait()` (`:1711`) | `showPromptMessage` + `updateButtons(OK/EndTurn)` + `setWeaklySelectable`; answer via `selectCard`/`selectAbility`/`selectButtonOk`. `InputPassPriority.showNormalPrompt()` at `input/InputPassPriority.java:162` |
| `getAbilityToPlay(Card, List<SpellAbility>, ITriggerEvent)` | 214 | **direct, blocking** | `IGuiGame.getAbilityToPlay(CardView, List<SpellAbilityView>, ITriggerEvent)` → `SpellAbilityView`. PCH keeps a `spellViewCache` map back to real `SpellAbility` (`:216`, `:226`) |
| `playChosenSpellAbility(sa)` | 1717 | delegates to `PlaySpellAbility.playSpellAbility` | (drives cost payment / targeting below) |
| `declareAttackers(Player, Combat)` | 1508 | `new InputAttack(...).showAndWait()` (`:1521`) | `updateButtons` (`input/InputAttack.java:90`), `setHighlighted` (`:308-309`), `updateCards` (`:164`), `flashIncorrectAction` (`:173`), `showCombat` (`:361`) |
| `declareBlockers(Player, Combat)` | 1526 | `new InputBlock(...).showAndWait()` (`:1528`) | `updateButtons` (`input/InputBlock.java:77`), `showCombat` (`:90`), `setHighlighted` (`:192-196`), `message` on illegal block (`:109`) |
| `chooseTargetsFor(SpellAbility)` | 2407 | `new TargetSelection(this, sa).chooseTargets(...)` → `InputSelectTargets` (an `InputSyncronizedBase`) | `setSelectables` / `showPromptMessage` / `updateButtons`; divided-damage tail calls `getGui().assignGenericAmount(...)` at `:2466` |
| `chooseNewTargetsFor(...)` | 2487 | same | same |
| `payManaCost(ManaCost, CostPartMana, SpellAbility, String, matrix, effect)` | 2605 | `PlaySpellAbility.payManaCost(...)` → `InputPayMana` subclass `.showAndWait()` | `showManaPool`/`hideManaPool` (`input/InputPayMana.java:63`, `:76`), `updateButtons(Auto/Cancel)` (`:391`, `:405`), `showMessage(msg, saPaidFor.getView())` (`:410`); answers via `selectCard` (tap a land) and `IGameController.useMana(byte)` (`InputPayMana.java:197`) |
| `applyManaToCost(...)` | 2611 | `new InputPayManaOfCostPayment(...).showAndWait()` | same |
| `chooseCardsForCost(...)` | 2619 | `InputSelectCardsFromList.showAndWait()` | `setSelectables` |
| `chooseSingleEntityForEffect(...)` | 579 | **branches**: if `useSelectCardsInput(...)` (`:428`) → `InputSelectEntitiesFromList.showAndWait()` (`:605`); else **direct** `getGui().chooseSingleEntityForEffect(title, keys, delayedReveal, isOptional)` (`:611`) | either board selection or a modal list dialog |
| `chooseEntitiesForEffect(...)` | 623 | same branch; direct call at `:651` | `IGuiGame.chooseEntitiesForEffect` |
| `confirmAction(sa, mode, message, options, cardToShow, params)` | 745 | `InputConfirm.confirm(...)` (an `InputSyncronizedBase`) — but on libGDX it short-circuits to `getGui().confirm(...)` (`input/InputConfirm.java:69-78`) | `updateButtons(yes,no,...)` (`InputConfirm.java:108`) + `showPromptMessage` |
| `confirmTrigger(WrappedAbility)` | 787 | auto-yield store first, then `InputConfirm` | as above |
| `assignCombatDamage(attacker, blockers, remaining, dmg, defender, overrideOrder)` | 283 | **direct, blocking** | `IGuiGame.assignCombatDamage(CardView, List<CardView>, int, GameEntityView, boolean, boolean)` → `Map<CardView,Integer>` |
| `divideShield(...)` | 320 | **direct** | `IGuiGame.assignGenericAmount` |
| `mulliganKeepHand(Player, int)` | 1493 | `InputConfirmMulligan.showAndWait()` | prompt + buttons |
| `tuckCardsViaMulligan(...)` | 1501 | `InputLondonMulligan.showAndWait()` | selectables |
| `chooseCardsToDiscardToMaximumHandSize(int)` | 1722 | `InputSelectCardsFromList.showAndWait()` (or `getGui().many(...)` on libGDX, `:1735`) | selectables / list dialog |
| `chooseNumber(...)` | 664, 688 | `getGui().getInteger(...)` (implemented in `AbstractGuiGame` on top of `getChoices`/`showInputDialog`) | dialog |
| `orderSimultaneousSa(...)` | 2243 | `getGui().order(...)` | ordering dialog |
| `orderBlockers` / `orderBlocker` / `orderAttackers` | 855 / 899 / 912 | `getGui().order(...)` | ordering dialog |
| `arrangeForScry` / `arrangeForSurveil` | 998 / 1047 | `getGui().order(...)` / `manipulateCardList` | dialog |
| `chooseSingleSpellForEffect` | 694 | `getGui().one(...)` | dialog |
| `chooseModeForAbility` | 1895 | `getGui().getChoices(...)` | dialog |
| `chooseColor` / `chooseColors` | 1967 / 1962 | `getGui().one(...)` / `getChoices` | dialog |
| `chooseBinary` | 1812 | `InputConfirm` / `getGui().one` | dialog |
| `vote` | 1461 | `getGui().one(...)` | dialog |
| `reveal(...)` | 924 / 929 / 933 | `getGui().reveal(...)` → `getChoices(msg,-1,-1,items)` (`AbstractGuiGame.java:786`) | dialog |
| `sideboard(Deck, GameType, String)` | 235 | `getGui().sideboard(CardPool, CardPool, String)` | between-games dialog |
| `notifyOfValue` | 1870 | `getGui().message(...)` | toast |

The `IGameController` half (browser → engine) is at `PCH:2720` onward: `selectButtonOk` (2720),
`selectButtonCancel` (2725), `useMana` (2738), `selectPlayer` (2745), `selectCard` (2753),
`selectAbility` (2763), `alphaStrike` (2773), plus `concede`, `undoLastAction`, `nextGameDecision`,
`reorderHand`, `getActivateDescription` further down. All of them funnel through `InputProxy`
(`input/InputProxy.java:80-162`).

### 2.3 Minimum set for a playable game

You do **not** implement `PlayerControllerHuman` — you reuse it verbatim and implement `IGuiGame`.
`AbstractGuiGame` (`forge-gui/src/main/java/forge/gamemodes/match/AbstractGuiGame.java:39`) already
supplies 80-odd concrete methods (state-push no-ops, plus `one`/`oneOrNone`/`many`/`reveal`/
`getInteger`/`insertInList` composed from `getChoices`/`order`, plus the whole selectable/highlight
bookkeeping, the concede flow, the await-input timer and `mayView`).

**Exactly 37 members remain abstract for a subclass of `AbstractGuiGame`** (derived by diffing the
interface against the class; independently corroborated by the in-tree headless implementation
`forge-gui-desktop/src/test/java/forge/net/HeadlessNetworkGuiGame.java`, 209 lines, which implements
this same set):

*Void — state pushes / notifications, can start as no-ops (21):*
`openView`, `showCombat`, `showPromptMessage`, `updateButtons`, `flashIncorrectAction`, `alertUser`,
`enableOverlay`, `disableOverlay`, `finishGame`, `showManaPool`, `hideManaPool`, `hideZones`,
`setPanelSelection`, `setCard`, `setPlayerAvatar`, `updateShards`, `restoreOldZones`, `message`,
`showErrorDialog`, `getGamestate` (may return `null`), `updateCurrentPlayer` (protected abstract,
`AbstractGuiGame.java:103`).

*Return a value — these block the game thread (16):*
`getAbilityToPlay`, `assignCombatDamage`, `assignGenericAmount`, `showConfirmDialog`,
`showOptionDialog`, `showInputDialog`, `confirm`, `getChoices`, `order`, `sideboard`,
`chooseSingleEntityForEffect`, `chooseEntitiesForEffect`, `manipulateCardList`, `openZones`,
`tempShowZones`, `isUiSetToSkipPhase` (the last can just return `false`).

**Truly minimal for a first playable 1-v-AI game (inference, but well grounded):**

- Must be real: `openView`, `showPromptMessage`, `updateButtons`, `setSelectables`/`clearSelectables`
  (already in `AbstractGuiGame`, but we must *forward* them — override them and call `super`),
  `getAbilityToPlay`, `confirm`, `showConfirmDialog`, `showOptionDialog`, `getChoices`, `order`,
  `chooseSingleEntityForEffect`, `chooseEntitiesForEffect`, `assignCombatDamage`,
  `assignGenericAmount`, `message`, `showCombat`, `updateZones`/`updateCards`/`updateSingleCard`
  (override the `AbstractGuiGame` no-ops so the browser sees state), `finishGame`.
- Can be stubbed initially: `sideboard` (return `null`), `manipulateCardList` (return input order),
  `openZones`/`restoreOldZones`/`tempShowZones`/`hideZones` (library/graveyard browsing —
  return the requested updates unchanged), `setPlayerAvatar`, `updateShards`, `showInputDialog`,
  `getGamestate`, `isUiSetToSkipPhase` (return `false`), `enableOverlay`/`disableOverlay`,
  `flashIncorrectAction`, `alertUser`, `setPanelSelection`, `setCard`.

And on the reply side, the minimum `IGameController` calls the browser must be able to make:
`selectCard`, `selectAbility`, `selectPlayer`, `selectButtonOk`, `selectButtonCancel`, `useMana`,
`concede`, `nextGameDecision`. (`forge-gui/src/main/java/forge/interfaces/IGameController.java:16-51`.)

---

## 3. The view layer — what state exists, and hidden information

### 3.1 Trackable model

`TrackableObject` (`forge-game/src/main/java/forge/trackable/TrackableObject.java:30`) is the base
for every view object. It is an `int id` plus an `EnumMap<TrackableProperty, Object> props` (`:35`).
`get` (`:77`) falls back to the property's default; `set` (`:85`) writes, honours the tracker freeze,
and marks per-consumer dirty bits (`markDirtyForConsumers`, `:116`).

Subclasses:

| View | File | Notes |
|---|---|---|
| `GameView` | `forge-game/src/main/java/forge/game/GameView.java:33` | Turn, phase, playerTurn, stack, storm count, players collection, combat, game-over flags, revealed cards, title. Holds **transient** `Game` and `Match` back-refs (`:36-37`) that are `null` after network deserialization — `getDeck()` guards for this at `:256`. |
| `PlayerView` | `forge-game/src/main/java/forge/game/player/PlayerView.java` (577 lines) | Life, poison, counters, mana pool, opponents, commander damage, and **one `TrackableCollection<CardView>` per zone** (`Hand`, `Library`, `Graveyard`, `Battlefield`, `Exile`, `Command`, `Sideboard`, `Ante`, `Flashback`, `Junkyard`, …). |
| `CardView` + inner `CardStateView` | `forge-game/src/main/java/forge/game/card/CardView.java:33`-ish (1733 lines) | Zone, owner, controller, tapped/attacking/blocking/phased/sick, damage, counters, attachments, plus per-state name/colors/type/mana cost/P/T/loyalty/oracle+rules text/`ImageKey`/`SetCode`/`Rarity`. |
| `SpellAbilityView` | `forge-game/src/main/java/forge/game/spellability/SpellAbilityView.java:13` | `HostCard`, `Description` (= `sa.toUnsuppressedString()`, `:57`), `CanPlay`, `SA_IsSpell`. This is what a "what can I cast with this card" menu is built from. |
| `StackItemView` | `forge-game/src/main/java/forge/game/spellability/StackItemView.java` (185 lines) | `Key`, `SourceCard`, `ActivatingPlayer`, `TargetCards`, `TargetPlayers`, `SubInstance`, `Ability`, `OptionalTrigger`, `OptionalCosts`. |
| `CombatView` | `forge-game/src/main/java/forge/game/combat/CombatView.java` (191 lines) | Built fresh in `GameView.updateCombat` (`GameView.java:216-235`) from attacking bands → defender + blockers + planned blockers. |
| `GameEntityView` | `forge-game/src/main/java/forge/game/GameEntityView.java` | Common supertype of `CardView` and `PlayerView`; what "choose a target" dialogs traffic in. |

`TrackableProperty` (`forge-game/src/main/java/forge/trackable/TrackableProperty.java:13-260`) is the
complete schema — ~230 enum constants, each with a `TrackableType<?>` and a `FreezeMode`. This enum
**is our JSON schema**: a `CardView` serialized for the browser is a map from a subset of these names
to values. Notable groupings: card/card-state (`:15-157`), player (`:159-208`), spell ability
(`:210-215`), stack item (`:220-230`), combat (`:232-240`), game (`:241-259`).

`Tracker` (`forge-game/src/main/java/forge/trackable/Tracker.java:33`) is per-game. It holds the
`(type, id) → instance` lookup used to resolve references, and a **freeze/unfreeze** mechanism
(`:43`, `:62`) that batches a multi-step engine effect into one coherent post-effect snapshot. Its
javadoc states it is **game-thread only, not thread-safe** (`:26-32`). That is a hard constraint on
our bridge: never walk the view graph from the WebSocket thread.

### 3.2 How updates are pushed

Two paths, both ending at `IGuiGame`:

1. **Game events.** `game.subscribeToEvents(new FControlGameEventHandler(humanController))`
   (`HostedMatch.java:232`). `FControlGameEventHandler`
   (`forge-gui/src/main/java/forge/gui/control/FControlGameEventHandler.java`, 536 lines) is an
   `IGameEventVisitor` with ~40 `visit(GameEventXxx)` methods (`:197`-`:533`). It *coalesces*: each
   visit records what changed into accumulator sets and schedules a single `processEvents` runnable
   on the UI thread (`:161-163`). `processEvents` (`:54-120`) then calls, in order,
   `updateCards`, `updateLives`, `updateManaPool`, `updateTurn`, `updatePhase`, `showCombat`,
   `updateStack`, `updateZones`. This coalescing is why Forge's UI doesn't melt.
2. **Input-driven pushes.** Whatever `Input.showMessage()` does — `showPromptMessage`,
   `updateButtons`, `setSelectables`, `setHighlighted`, `showManaPool`.

For the network case there is a third wrapper, `GameEventForwarder`
(`forge-gui/src/main/java/forge/gui/control/GameEventForwarder.java`, 71 lines), registered instead of
`FControlGameEventHandler` when the GUI is a `RemoteClientGuiGame` (`HostedMatch.java:227-233`) and
also added as an observer on every human's `InputQueue` (`HostedMatch.java:249-258`) so that buffered
events are flushed *before* the game thread parks for input.

### 3.3 Hidden information — **important, and a real gotcha**

Forge does **not** filter hidden information server-side. The full `GameView` graph — including every
opponent's `Hand` and `Library` `CardView`s with real names and image keys — is shared, and *the
client decides what to render*:

```java
// forge-game/src/main/java/forge/game/card/CardView.java:622
public boolean canBeShownTo(final PlayerView viewer) {
    ZoneType zone = getZone();
    ...
    case Hand:    if (controller.equals(viewer)) return true; break;
    case Library: /* hidden to all unless specified */ break;
    ...
    if (mayPlayerLook(viewer)) return true;   // per-card temporary reveal, TrackableProperty.PlayerMayLook
    ...
}
```

and the GUI gate:

```java
// forge-gui/src/main/java/forge/gamemodes/match/AbstractGuiGame.java:273
public boolean mayView(final CardView c) {
    if (!hasLocalPlayers()) return true;
    if (getGameController().mayLookAtAllCards()) return true;
    return c.canBeShownToAny(getLocalPlayers());
}
```

Image keys are also gated only at read time: `CardStateView.getImageKey(viewers)` returns
`ImageKeys.HIDDEN_CARD` when `!canBeShownToAny(viewers)` (`CardView.java:1323-1333`).

I checked the netplay path specifically: `DeltaSyncManager.collectDeltas`
(`forge-gui/src/main/java/forge/gamemodes/net/server/DeltaSyncManager.java:111`) walks the whole
graph from the `GameView` and its players (`:295`), and `grep -rn "canBeShownTo\|mayView" forge-gui/.../net/`
returns only two comment hits. **There is no per-viewer redaction on the wire.** Forge's online play
is trust-the-client for hidden information.

**Implication for mtg-table:** since we control both ends, we should redact *in the bridge* —
serialize a `CardView` to JSON only if `cv.canBeShownTo(ourPlayerView)`, otherwise emit
`{id, zone, controller, faceDown:true}` and nothing else. Also send the `PlayerMayLook` set so
temporary reveals (scry, "look at the top card", search-library) work. `Library` should be sent as a
**count** plus ids, not contents. This is strictly better than upstream Forge and costs us little,
because `canBeShownTo` already encodes the entire rules answer.

---

## 4. The existing netplay layer — what it is, and whether we can reuse it

Location: `forge-gui/src/main/java/forge/gamemodes/net/` (63 files).

### 4.1 Architecture

```
HOST (runs the engine)                              CLIENT (a second Forge)
  PlayerControllerHuman(remote seat)
        │ getGui() ──▶ RemoteClientGuiGame            GameClientHandler ──▶ local IGuiGame (CMatchUI)
                           │ GameProtocolSender             ▲
                           ▼                                │
                     RemoteClient (IRemote)  ── Netty ──────┘
                           ▲                                │
  GameServerHandler ◀──────┴──────── Netty ◀──── NetGameController (IGameController)
        │
        └─▶ the host's PlayerControllerHuman for that seat
```

- `FServerManager` (`net/server/FServerManager.java:228` `startServer(int port)`) — Netty
  `ServerBootstrap`, default port **36743** (`forge-gui/src/main/java/forge/localinstance/properties/ForgeNetPreferences.java:28`).
  Pipeline at `:249-258`:
  `CompatibleObjectEncoder` → `CompatibleObjectDecoder(9766*1024, ClassResolvers.cacheDisabled(null))`
  → `IdleStateHandler` (heartbeat) → `MessageHandler` → `SaturationLoggingHandler` →
  `RegisterClientHandler` → `DeregisterClientHandler` → `GameServerHandler`.
- `FGameClient` (`net/client/FGameClient.java:30`, `connect()` at `:61`) — mirror pipeline at `:71-79`.
- `GameProtocolSender` (`net/GameProtocolSender.java:5`) — three verbs: `send` (fire),
  `write` (fire, no flush), `sendAndWait` (block for a reply, `:23`).
- `GameProtocolHandler` (`net/GameProtocolHandler.java:17`) — generic inbound dispatcher. It reads a
  `GuiGameEvent`, looks the `java.lang.reflect.Method` up from the `ProtocolMethod` enum constant
  (`:44`), invokes it on the local target (`:83` void / `:94` non-void), and for non-void methods
  sends a `ReplyEvent(event.getId(), reply)` back (`:109`). Dispatch is to the EDT or a background
  thread depending on `shouldDispatchToGuiThread` (`:117-121`).
- `ReplyPool` (`net/ReplyPool.java:9`) — `Map<Integer, FutureTask>`; `initialize(id)` before send,
  `get(id)` blocks (`:28`), `complete(id, value)` from the IO thread (`:22`), `cancelAll()` to unblock
  everyone on disconnect (`:44`).
- `RemoteClient.sendAndWait` (`net/server/RemoteClient.java:129`) — `replies.initialize(id)`;
  write; `return replies.get(id)`. **This is the blocking call that parks the game thread when a
  remote human must answer.**

### 4.2 The complete `ProtocolMethod` list

From `forge-gui/src/main/java/forge/gamemodes/net/ProtocolMethod.java:35-101`. The enum encodes
`(direction, returnType, argTypes...)`; `Mode.SERVER` methods are looked up on `IGuiGame`,
`Mode.CLIENT` on `IGameController` (`:103-111`).

**Server → Client (host → browser in our world) — 45 constants.** Blocking ones (non-`void` return)
are marked ⏸.

| # | Method | Returns | Args |
|---|---|---|---|
| 1 | `setGameView` | void | `GameView`, `long` (sequence) |
| 2 | `openView` | void | `TrackableCollection<PlayerView>` |
| 3 | `afterGameEnd` | void | — |
| 4 | `showCombat` | void | — |
| 5 | `showPromptMessage` | void | `PlayerView`, `String`, `CardView` |
| 6 | `updateDrawOffer` | void | `DrawOfferMessage.Status` |
| 7 | `updateButtons` | void | `PlayerView`, `String`, `String`, `boolean`, `boolean`, `boolean` |
| 8 | `flashIncorrectAction` | void | — |
| 9 | `alertUser` | void | — |
| 10 | `enableOverlay` | void | — |
| 11 | `disableOverlay` | void | — |
| 12 | `finishGame` | void | — |
| 13 | `showManaPool` | void | `PlayerView` |
| 14 | `hideManaPool` | void | `PlayerView` |
| 15 ⏸ | `tempShowZones` | `Iterable<PlayerZoneUpdate>` | `PlayerView`, `Iterable<PlayerZoneUpdate>` |
| 16 | `hideZones` | void | `PlayerView`, `Iterable<PlayerZoneUpdate>` |
| 17 | `setPanelSelection` | void | `CardView` |
| 18 ⏸ | `getAbilityToPlay` | `SpellAbilityView` | `CardView`, `List<SpellAbilityView>`, `ITriggerEvent` |
| 19 ⏸ | `assignCombatDamage` | `Map` | `CardView`, `List<CardView>`, `int`, `GameEntityView`, `boolean`, `boolean` |
| 20 ⏸ | `assignGenericAmount` | `Map` | `CardView`, `Map`, `int`, `boolean`, `String` |
| 21 | `message` | void | `String`, `String` |
| 22 | `showErrorDialog` | void | `String`, `String` |
| 23 ⏸ | `showConfirmDialog` | `boolean` | `String`, `String`, `String`, `String`, `boolean` |
| 24 ⏸ | `showOptionDialog` | `int` | `String`, `String`, `FSkinProp`, `List<String>`, `int` |
| 25 ⏸ | `showInputDialog` | `String` | `String`, `String`, `FSkinProp`, `String`, `List<String>`, `boolean` |
| 26 ⏸ | `confirm` | `boolean` | `CardView`, `String`, `boolean`, `List<String>` |
| 27 ⏸ | `getChoices` | `List` | `String`, `int`, `int`, `List`, `List`, `FSerializableFunction` |
| 28 ⏸ | `order` | `OrderResult` | `String`, `String`, `int`, `int`, `List`, `List`, `CardView`, `boolean`, `boolean` |
| 29 ⏸ | `sideboard` | `List` | `CardPool`, `CardPool`, `String` |
| 30 ⏸ | `chooseSingleEntityForEffect` | `GameEntityView` | `String`, `List`, `DelayedReveal`, `boolean` |
| 31 ⏸ | `chooseEntitiesForEffect` | `List` | `String`, `List`, `int`, `int`, `DelayedReveal` |
| 32 ⏸ | `manipulateCardList` | `List` | `String`, `Iterable`, `Iterable`, `boolean`, `boolean`, `boolean` |
| 33 | `setCard` | void | `CardView` |
| 34 | `setSelectables` | void | `Iterable<CardView>`, `int`, `int` |
| 35 | `clearSelectables` | void | — |
| 36 | `setHighlighted` | void | `Iterable<GameEntityView>`, `boolean` |
| 37 | `setWeaklySelectable` | void | `Iterable<CardView>` |
| 38 | `clearWeaklySelectable` | void | — |
| 39 ⏸ | `openZones` | `PlayerZoneUpdates` | `PlayerView`, `Collection<ZoneType>`, `Map<PlayerView,Object>`, `boolean` |
| 40 | `restoreOldZones` | void | `PlayerView`, `PlayerZoneUpdates` |
| 41 | `setRememberedActions` | void | — |
| 42 | `nextRememberedAction` | void | — |
| 43 | `showWaitingTimer` | void | `PlayerView`, `String` |
| 44 | `applyDelta` | void | `DeltaPacket` |
| 45 | `applyYieldUpdate` | void | `YieldUpdate` |

**Client → Server — 15 constants.** Note the explicit design rule in the source
(`ProtocolMethod.java:84-86`): *"these should all return void, to avoid awkward situations in which
client and server wait for one another's response and block the threads that're supposed to give that
response."* Only `getActivateDescription` violates it.

| # | Method | Returns | Args |
|---|---|---|---|
| 1 | `useMana` | void | `byte` |
| 2 | `undoLastAction` | void | — |
| 3 | `selectPlayer` | void | `PlayerView`, `ITriggerEvent` |
| 4 | `selectCard` | void | `CardView`, `List<CardView>`, `ITriggerEvent` |
| 5 | `selectButtonOk` | void | — |
| 6 | `selectButtonCancel` | void | — |
| 7 | `selectAbility` | void | `SpellAbilityView` |
| 8 | `nextGameDecision` | void | `NextGameDecision` |
| 9 ⏸ | `getActivateDescription` | `String` | `CardView` |
| 10 | `concede` | void | — |
| 11 | `drawOfferAction` | void | `DrawOfferMessage.Action` |
| 12 | `alphaStrike` | void | — |
| 13 | `reorderHand` | void | `CardView`, `int` |
| 14 | `requestResync` | void | — |
| 15 | `sendYieldUpdate` | void | `YieldUpdate` |

(The installed `forge-gui-desktop-2.0.14-jar-with-dependencies.jar` has the same constant list plus a
legacy `passPriority` client constant — verified by extracting `forge/gamemodes/net/ProtocolMethod.class`
and reading its constant-pool strings. So this source checkout is a faithful reference for the
installed build.)

### 4.3 What actually goes on the wire

**Java serialization, LZ4-compressed, length-prefixed.** Not JSON, not a custom binary schema:

```
// forge-gui/src/main/java/forge/gamemodes/net/CompatibleObjectEncoder.java:16-23 (javadoc)
The wire format for each message is a 4-byte big-endian length followed by an LZ4-compressed
Java serialization stream produced by CObjectOutputStream.
```

On top of plain Java serialization there are two compression tricks:

1. **Reference substitution.** `TrackableSerializer.replace(...)`
   (`net/TrackableSerializer.java:82`) swaps a `CardView`/`PlayerView` for a 5-byte
   `IdRef(typeTag, id)` record (`:39`) *when the receiver is known to already have it* — server-side
   gated on `trackable.hasConsumer(consumerId)` (`:92-97`), client-side on tracker presence.
   `resolve(...)` (`:120`) reverses it. Inside wrapped game events a richer
   `EventCardRef(id, name, imageKey, preserveSnapshot)` is used (`:44`).
2. **Delta sync.** `DeltaSyncManager.collectDeltas(gameView)`
   (`net/server/DeltaSyncManager.java:111`) walks the view graph and emits a `DeltaPacket`
   (`net/DeltaPacket.java:24`) containing `Map<Integer /*deltaKey*/, Map<TrackableProperty, Object>>`
   for changed objects and another for brand-new objects, plus a sequence number, a checksum, and a
   list of LZ4'd wrapped `GameEvent`s. The `deltaKey` packs a 4-bit type tag and a 28-bit id
   (`DeltaPacket.java:61-83`); types are `TYPE_CARD_VIEW=0, TYPE_PLAYER_VIEW=1, TYPE_STACK_ITEM_VIEW=2,
   TYPE_GAME_VIEW=3, TYPE_CSV=4` (`:34-38`). Per-consumer dirty bits live on `TrackableObject`
   itself (`registerConsumer` `:180`, `getAndClearDirtyProps` `:204`).
   Client side applies it in `NetworkGuiGame.applyDelta` (`net/NetworkGuiGame.java:35`), three-phase:
   create new objects, populate them (so cross-refs resolve), then apply deltas to existing objects,
   then unwrap and dispatch the events (`:170-175`).

The four dispatch helpers on the server side are worth internalising because we will need the same
four (`net/server/RemoteClientGuiGame.java:143-176`):

| helper | walks the graph first? | blocks? | when |
|---|---|---|---|
| `send` | no | no | payload is pure ids/strings/flags |
| `syncAndSend` | yes (game thread only) | no | payload references entities the client needs |
| `sendAndWait` | no | yes | plain-text dialogs |
| `syncAndSendAndWait` | yes (game thread only) | yes | entity-referencing prompts |

### 4.4 Honest judgement: reuse the protocol, or implement `IGuiGame` ourselves?

**Implement `IGuiGame` ourselves. Do not try to translate `ProtocolMethod` to JSON.** Reasons, in
order of weight:

1. **The payloads are not JSON-friendly.** `DeltaPacket` carries `Map<TrackableProperty, Object>`
   where `Object` is an arbitrary Java value: `ColorSet`, `ManaCost`, `CardTypeView`,
   `KeywordCollectionView`, `CounterMap`, `TrackableCollection`, `EnumSet`, plus
   `FSerializableFunction` (a **serialized lambda**, `ProtocolMethod.java:61`) and `ITriggerEvent`
   (a mouse event; Forge itself already passes `null` for it over the wire —
   `RemoteClientGuiGame.java:410` and `NetGameController.java:61,66` both send `null` with the
   comment *"someplatform don't have mousetriggerevent class"*). Writing a faithful JSON codec for
   ~230 `TrackableProperty` value types is *more* work than writing the ~37 `IGuiGame` methods.
2. **The protocol is symmetric between two Forge instances.** Its whole point is that both ends have
   the same `TrackableObject` classes and the same `Tracker`, so it can ship ids instead of values.
   A browser has neither. Every `IdRef` saving evaporates, and we'd have to send full objects anyway
   — at which point the delta machinery is pure overhead.
3. **Java-deserializing attacker-controlled bytes is a known hazard.** There is a `WireClassFilter`
   and `WireStreamLimits` in-tree precisely because of this. A JSON bridge sidesteps it entirely.
4. **But the *shape* is exactly right, and we should copy it wholesale.** The 45 + 15 method list
   above is a battle-tested enumeration of every question a Magic engine asks a UI. Our JSON message
   types should be one-to-one with it. And `RemoteClientGuiGame` is a working, debugged worked example
   of the four dispatch helpers, the "graph walk must happen on the game thread" rule, the pause /
   reconnect handling, and the flush-before-block dance. **Read it, mirror it, don't marshal it.**

One thing we *should* reuse conceptually: the **delta idea**, not the delta *code*. Sending the full
view graph on every change is fine for a 2-player local game at first (a `GameView` full-state
serialization is logged as a comparison baseline at `RemoteClientGuiGame.java:244-257`), and we can
add JSON deltas later keyed off the same `getAndClearDirtyProps` dirty bits if the browser feels slow.

---

## 5. Proposed minimal Java bridge

### 5.1 Shape

Four classes, one Maven module (`mtg-table-bridge`), depending on the Forge jars:

```java
// 1. Headless IGuiBase — satisfies GuiBase.getInterface() for the whole process.
public final class WsGuiBase implements IGuiBase { ... }

// 2. The seam. One instance per browser-backed seat.
public final class WsGuiGame extends AbstractGuiGame { ... }

// 3. The WebSocket endpoint + JSON codec + pending-reply registry.
public final class WsSession { ... }

// 4. Bootstrap: FModel.initialize, deck load, Match, HostedMatch.
public final class MtgTableServer { ... }
```

**`WsGuiBase`** — copy `forge-gui/tools/java/ForgeMatrixWriter.java:150-201`, which is an in-tree,
complete, GPL, Swing-free `IGuiBase`. One mandatory change: its
`isGuiThread() { return true; }` (`:164`) would blow up `InputSyncronizedBase.awaitLatchRelease`'s
`FThreads.assertExecutedByEdt(false)` check (`InputSyncronizedBase.java:22`;
`FThreads.assertExecutedByEdt` at `forge-gui/src/main/java/forge/gui/FThreads.java:15`). Implement it
as `return !ThreadUtil.isGameThread();` and run `invokeInEdtLater` on a **single-threaded executor**
that acts as our "UI thread" — this preserves Forge's two-thread model (game thread + UI thread)
without Swing. (`FThreads.assertExecutedByEdt` also short-circuits when `GuiBase.isNetPlay(null)` is
true (`FThreads.java:16`), which is the escape hatch the test harness uses — but a real UI dispatch
thread is cleaner. **(inference on the "cleaner" judgement; the mechanism is verified.)**)

**`WsGuiGame extends AbstractGuiGame`** implements the 37 abstract members, plus overrides of the
`AbstractGuiGame` no-op state pushes (`updateZones` `:943`, `updateCards` `:946`, `updateStack` `:931`,
`updatePhase` `:934`, `updateTurn` `:937`, `updateLives` `:952`, `updateManaPool` `:949`,
`setSelectables` `:347`, `setHighlighted` `:325` — always calling `super` first to keep the
bookkeeping) so the browser sees state.

Every method body is one of two one-liners:

```java
// fire-and-forget
@Override public void showCombat() { ws.push(snapshot()); }

// blocking question
@Override public SpellAbilityView getAbilityToPlay(CardView host, List<SpellAbilityView> abilities,
                                                   ITriggerEvent ev) {
    Integer id = ws.ask("ability_menu", J.abilityMenu(host, abilities), Integer.class);
    return id == null ? null : abilities.stream().filter(a -> a.getId() == id).findFirst().orElse(null);
}
```

`ws.ask(...)` is our `RemoteClient.sendAndWait` equivalent: allocate a request id, put a
`CompletableFuture` in a map, write the JSON frame, `future.get(timeout)`. Copy the `ReplyPool`
semantics including `cancelAll()` (`ReplyPool.java:44`) so a disconnect or concede unblocks the game
thread rather than wedging it.

### 5.2 Message types

`dir` = H→B (host to browser) or B→H. `blocks` = the game thread is parked until the reply arrives.

| Message `type` | dir | blocks | Payload (JSON) | Maps to |
|---|---|---|---|---|
| `hello` | B→H | — | `{seat, clientVersion}` | connection setup |
| `game_open` | H→B | no | `{gameId, you: playerId, players:[{id,name,isAi}]}` | `IGuiGame.openView` |
| `state` | H→B | no | full snapshot: `{turn, phase, playerTurn, priority, players:[{id,life,poison,counters,mana,zones:{hand:[card],battlefield:[card],graveyard:[card],exile:[card],library:{count}}}], stack:[stackItem], combat:{bands:[...]}, gameOver}` | any `update*` / `showCombat` / `setGameView` |
| `state_delta` | H→B | no | `{seq, changed:{"card:17":{Tapped:true,Damage:2}}, removed:[...]}` (phase 2) | `applyDelta` analogue |
| `prompt` | H→B | no | `{text, cardId?, buttons:{ok:{label,enabled},cancel:{label,enabled}}, focus}` | `showPromptMessage` + `updateButtons` |
| `selectable` | H→B | no | `{cards:[id], min, max, kind:"strong"\|"weak", highlighted:[id]}` | `setSelectables` / `setWeaklySelectable` / `setHighlighted` |
| `mana_pool` | H→B | no | `{playerId, pool:{W,U,B,R,G,C}, visible}` | `showManaPool` / `hideManaPool` |
| `toast` | H→B | no | `{level:"info"\|"error", title, text}` | `message` / `showErrorDialog` / `flashIncorrectAction` / `alertUser` |
| `game_over` | H→B | no | `{winner, reason, matchOver, gamesWon}` | `finishGame` / `afterGameEnd` |
| **`ask.ability_menu`** | H→B | **yes** | `{reqId, hostCard, abilities:[{id, description, canPlay}]}` → reply `{abilityId\|null}` | `getAbilityToPlay` |
| **`ask.confirm`** | H→B | **yes** | `{reqId, question, cardId?, options:[String], defaultYes}` → `{yes:bool}` or `{index:int}` | `confirm` / `showConfirmDialog` / `showOptionDialog` |
| **`ask.choose_entities`** | H→B | **yes** | `{reqId, title, options:[entityRef], min, max, optional, delayedReveal?}` → `{chosen:[entityRef]}` | `chooseSingleEntityForEffect` (min=max=1) / `chooseEntitiesForEffect` |
| **`ask.choose_list`** | H→B | **yes** | `{reqId, title, items:[{key,label}], min, max, preselected:[key]}` → `{chosen:[key]}` | `getChoices` (and via `AbstractGuiGame`: `one`, `oneOrNone`, `many`, `reveal`, `getInteger`) |
| **`ask.order`** | H→B | **yes** | `{reqId, title, top, source:[{key,label}], dest:[{key,label}], min, max, referenceCard?, rememberCheckbox}` → `{ordered:[key], remember:bool}` | `order` (→ `OrderResult`) |
| **`ask.assign_damage`** | H→B | **yes** | `{reqId, attacker, blockers:[card], damage, defender, overrideOrder, maySkip}` → `{assignment:{cardId:int}}` (`null`/`-1` key = defender, see `PlayerControllerHuman.java:308-310`) | `assignCombatDamage` |
| **`ask.assign_amount`** | H→B | **yes** | `{reqId, source, targets:[{ref,max}], amount, atLeastOne, label}` → `{assignment:{ref:int}}` | `assignGenericAmount` |
| **`ask.text`** | H→B | **yes** | `{reqId, message, title, initial, options:[String], numeric}` → `{text}` | `showInputDialog` |
| **`ask.manipulate_list`** | H→B | **yes** | `{reqId, title, cards:[card], manipulable:[id], toTop, toBottom, toAnywhere}` → `{ordered:[id]}` | `manipulateCardList` |
| **`ask.zones`** | H→B | **yes** | `{reqId, playerId, zones:[ZoneType], backup}` → `{opened:[{playerId, zones:[ZoneType]}]}` | `openZones` / `tempShowZones` |
| **`ask.sideboard`** | H→B | **yes** | `{reqId, main:[cardName], side:[cardName], message}` → `{main:[cardName]}` | `sideboard` (can answer `null` = keep) |
| `reply` | B→H | — | `{reqId, value}` — the answer to any `ask.*` | `ReplyEvent` |
| `click_card` | B→H | no | `{cardId, others:[cardId]}` | `IGameController.selectCard` |
| `click_player` | B→H | no | `{playerId}` | `selectPlayer` |
| `click_ability` | B→H | no | `{abilityId}` | `selectAbility` |
| `button` | B→H | no | `{which:"ok"\|"cancel"}` | `selectButtonOk` / `selectButtonCancel` |
| `use_mana` | B→H | no | `{color:byte}` | `useMana` |
| `undo` | B→H | no | — | `undoLastAction` |
| `alpha_strike` | B→H | no | — | `alphaStrike` |
| `concede` | B→H | no | — | `concede` |
| `next_game` | B→H | no | `{decision:"CONTINUE"\|"NEW"\|"QUIT"}` | `nextGameDecision` |
| `reorder_hand` | B→H | no | `{cardId, index}` | `reorderHand` |

Design rule to copy verbatim from Forge: **browser→host messages never expect a reply**
(`ProtocolMethod.java:84-86`). All blocking is one-directional, host→browser, and every blocking
message carries a `reqId` answered by exactly one `reply`.

### 5.3 The synchronous callbacks, enumerated

These block the game thread. Everything else is fire-and-forget.

**Direct-blocking `IGuiGame` calls** (game thread parks inside our method; we must return a value):
`getAbilityToPlay`, `assignCombatDamage`, `assignGenericAmount`, `confirm`, `showConfirmDialog`,
`showOptionDialog`, `showInputDialog`, `getChoices`, `order`, `chooseSingleEntityForEffect`,
`chooseEntitiesForEffect`, `manipulateCardList`, `openZones`, `tempShowZones`, `sideboard`.
(Plus everything `AbstractGuiGame` builds on top of `getChoices`/`order`: `one`, `oneOrNone`, `many`,
`reveal`, `getInteger`, `insertInList` — `AbstractGuiGame.java:762-896`.)

**Latch-blocking via `Input`** (game thread parks in `InputSyncronizedBase.awaitLatchRelease`; our
method returns immediately and the browser answers later via `IGameController`): priority
(`InputPassPriority`), attacks (`InputAttack`), blocks (`InputBlock`), target selection
(`InputSelectTargets`), card selection (`InputSelectCardsFromList` / `InputSelectEntitiesFromList`),
mana payment (`InputPayMana` / `InputPayManaOfCostPayment`), confirms (`InputConfirm`), mulligan
(`InputConfirmMulligan` / `InputLondonMulligan`), convoke (`InputSelectCardsForConvokeOrImprovise`).

**How `PlayerControllerHuman` handles this today, and what we must copy:**

1. The game thread is *never* the UI thread. `awaitLatchRelease` asserts it
   (`InputSyncronizedBase.java:22`) and `Tracker`'s javadoc requires the graph walk be on the game
   thread (`Tracker.java:26-32`). So: **serialize the view graph on the game thread, hand the
   finished JSON string to the WebSocket writer thread.** Never let Netty/Jetty touch a `CardView`.
2. `RemoteClientGuiGame` splits its helpers on exactly this axis (`:143-176`): `send` is
   thread-agnostic (ids/strings only); `syncAndSend` / `syncAndSendAndWait` are documented
   "Game-thread-only" because they call `updateGameView()` which walks the graph.
3. Flush pending events *before* parking. `HostedMatch` registers the `GameEventForwarder` as an
   observer on every human's `InputQueue` for this reason, with the comment "This ensures events are
   flushed on the game thread before it blocks for input" (`HostedMatch.java:246-258`).
   Our equivalent: push the state snapshot *before* the prompt, always.
4. Always be able to unblock. `InputQueue.onGameOver(boolean)` (`InputQueue.java:110`) releases
   latches; `ReplyPool.cancelAll()` (`ReplyPool.java:44`) completes pending futures with `null`.
   Add a timeout to `ws.ask` too — the host has an AFK timeout for exactly this
   (`FServerManager.armAfkTimeout`, used at `InputPassPriority.java:75-78`).
5. Return-value contracts to respect when a reply is `null` (disconnect/timeout): `getAbilityToPlay`
   → `null` is fine (cancel). `assignCombatDamage` → `null` is handled (`PlayerControllerHuman.java:302`).
   `showConfirmDialog`/`confirm`/`showOptionDialog` → `RemoteClientGuiGame` falls back to the
   default (`:436`, `:442`, `:453`); do the same.

### 5.4 Bootstrap sketch

```java
GuiBase.setInterface(new WsGuiBase(forgeResDir));        // before anything else
FModel.initialize(null, null);                           // SimulateMatch.java:40

Deck mine  = DeckSerializer.fromFile(new File("~/.forge/decks/constructed/shield.dck"));
Deck theirs = ...;

RegisteredPlayer me   = new RegisteredPlayer(mine);
me.setPlayer(new LobbyPlayerHuman("Justin"));            // LobbyPlayerHuman.java:14
RegisteredPlayer ai   = new RegisteredPlayer(theirs);
ai.setPlayer(GamePlayerUtil.createAiPlayer("AI", 0));    // GamePlayerUtil.java:49

GameRules rules = new GameRules(GameType.Constructed);
rules.setGamesPerMatch(1);

WsGuiGame gui = new WsGuiGame(wsSession);
HostedMatch hosted = new HostedMatch();                  // HostedMatch.java:68
hosted.startMatch(rules, null, List.of(me, ai), Map.of(me, gui), null);   // HostedMatch.java:112
```

`HostedMatch.startMatch` does the rest: it wires `humanController.setGui(gui)`,
`gui.setGameView(gameView)`, `gui.setOriginalGameController(playerView, humanController)`,
subscribes the event handler, calls `gui.openView(...)`, and finally
`game.getAction().invoke(() -> match.startGame(...))` on the game thread
(`HostedMatch.java:220-262`, `:283-297`).

Alternative, if `HostedMatch`'s dependencies on `FModel` preferences / `SoundSystem` /
`HapticEngine` prove annoying: drive `Match` directly the way `SimulateMatch` does
(`SimulateMatch.java:141-148`) and do the `setGui` / `openView` wiring ourselves. `HostedMatch` is
577 lines and most of it is multi-human / spectator / next-game plumbing we don't need.
**(inference — I have not tried to run it.)**

### 5.5 Build and licensing notes

- **JDK required** (see §0). JRE-only today.
- Forge is **GPLv3**. `forge-game`, `forge-ai`, and `forge-gui` are GPL, and our bridge links against
  them, so the bridge — and arguably the whole server — is a GPLv3 derivative. That's fine for a
  personal project; it just means mtg-table should ship as GPLv3 if it is ever published. The browser
  front-end talking JSON over a socket is a weaker coupling, but the Java side is unambiguous.
- Dependency: the simplest path is to put the three module jars (or the fat jar at
  `/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`) on the classpath as a
  system-scoped dependency and compile against them. The fat jar's `ProtocolMethod` and `IGuiGame`
  match this source checkout (verified in §4.2), so the source is a valid reference.
- Netty is already inside the fat jar (Forge's own netplay uses it), so a WebSocket endpoint can be
  built on `io.netty.handler.codec.http.websocketx` with **no new dependency**. **(inference — I
  confirmed Netty is used by `FServerManager`/`FGameClient`, not that the websocketx subpackage is
  bundled in the fat jar. Worth a 30-second check before committing to it.)**

---

## 6. Open risks, ranked

1. **No JDK on the machine.** Blocks everything Java. Fix first.
2. **`isGuiThread()` semantics.** Getting this wrong produces either an `IllegalStateException` from
   `assertExecutedByEdt` or silent `Tracker` corruption from off-thread graph walks. The single
   highest-value thing to get right on day one.
3. **Serialization must happen on the game thread.** Same root cause. Design the bridge so
   `WsGuiGame` builds a JSON `String` synchronously and enqueues it; the socket thread only writes
   bytes.
4. **Hidden-information redaction is ours to build.** Forge gives us the predicate
   (`CardView.canBeShownTo`) but does no filtering on the wire. Easy to get right, easy to forget.
5. **`ITriggerEvent` and `FSerializableFunction` in signatures.** Pass `null` for the former (Forge's
   own netplay does). For the latter — the display-name function in `getChoices` — call it
   *on the host* while building the JSON, and send plain labels.
6. **The 40-card MSH deck.** Nothing in this note depends on the deck, but `Match.prepareAllZones`
   runs `toCheck.getValid()` and `complainCardsCantPlayWell` (`Match.java:303`, `:328`) — if any MSH
   card is unsupported by the installed card scripts it surfaces there via
   `game.getAction().revealUnsupported(...)` (`Match.java:355`). Worth a quick sim run once a JDK
   exists.

---

## 7. Files worth reading next, in order

1. `forge-gui/src/main/java/forge/gui/interfaces/IGuiGame.java` — the seam itself (315 lines).
2. `forge-gui-desktop/src/test/java/forge/net/HeadlessNetworkGuiGame.java` — a complete, minimal,
   in-tree implementation of the same 37 members (209 lines). **Start here when writing `WsGuiGame`.**
3. `forge-gui/src/main/java/forge/gamemodes/net/server/RemoteClientGuiGame.java` — the real one,
   with all the threading discipline (659 lines).
4. `forge-gui/tools/java/ForgeMatrixWriter.java:150-201` — a complete headless `IGuiBase`.
5. `forge-gui/src/main/java/forge/gamemodes/match/AbstractGuiGame.java` — know what you get for free.
6. `forge-game/src/main/java/forge/trackable/TrackableProperty.java` — the JSON schema.
7. `forge-gui/src/main/java/forge/gamemodes/match/input/` — the nine `Input` classes that define what
   a prompt looks like.

# 11 — M6 engine comfort features

Status: implementation spec, 2026-09-11. Scope: every "comfort" feature in
`PLAN.md` M6 — phase stops, Pass-To, auto-yield, Auto Pay, Undo, Concede, New
Game, AI profiles, keyboard shortcuts — traced to the Forge call the bridge
makes, the `act` it maps to, and what the client renders.

Basis: [`docs/research/05-architecture-synthesis.md`](05-architecture-synthesis.md)
§9 (the spec), [`docs/protocol.md`](../protocol.md) (the wire contract),
[`docs/research/07-wireguigame-spec.md`](07-wireguigame-spec.md) (the M2 bridge
spec and its amendments A1–A8), [`docs/research/06-hidden-information-audit.md`](06-hidden-information-audit.md)
§4 (the text channels), `CLAUDE.md` (the nine hard rules).

**Evidence convention**, identical to report 07. `jar:` = `javap` against
`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar` —
authoritative, this is what we compile and run against. `src:` = the
2.0.15-SNAPSHOT source checkout at `<scratch>/forge-src/…`, cited `file:line`,
used **only** for call sites and intent (CLAUDE.md: "treat forge-src as prose").
Anything marked *inferred* is reasoning, not a measurement.

**PLAN.md M6's own sentence is the thesis of this document:** *"Every one of these
is an engine feature rendered, not a client state machine."* The research below
says that is truer than the plan assumed — four of the eight features need **no
new protocol at all**, because Forge already puts them in the prompt and the two
buttons we are obliged to render verbatim.

---

## 0. Executive summary — the nine things that change what we build

1. **Half of M6 needs no new wire.** Forge's own `InputPassPriority` renders the
   *Cancel* button as `Undo (n)` when an undo is available and `End Turn`
   otherwise (src:`…/input/InputPassPriority.java:162-178`), and `onCancel()` is
   literally "undo if possible, else pass priority and auto-pass to end of turn"
   (`:281-297`). `InputPayMana` renders the *OK* button as `Auto` and `onOk()`
   runs `ComputerUtilMana.payManaCost` (`:376-387`, `:389-395`). `InputLockUI`
   renders *Cancel* while a yield is running and `selectButtonCancel()` cancels
   the yield (`:93-95`). protocol.md §4 already requires us to render
   `buttons.ok.label` / `buttons.cancel.label` verbatim and to send `buttonOk` /
   `buttonCancel`. **So Undo, End Turn, Auto Pay and cancel-a-yield are already
   on the wire as of M3.** M6's job for them is to *stop hiding them* — label the
   buttons properly, bind keys to them, and not invent a parallel UI.
2. **Phase stops are not read from `FPref` when the engine asks.** The desktop
   answers `isUiSetToSkipPhase` from the **phase-indicator label state**
   (src:`…/screens/match/CMatchUI.java:1389-1399`), which is seeded from
   `FPref.PHASES_HUMAN` / `PHASES_AI` once per match in `actuateMatchPreferences`
   (`:1417-1441`) and written back to the prefs file only by
   `writeMatchPreferences` (`:1401-1415`). The per-game toggle the user asked for
   is therefore what Forge itself already does: **hold the state in the GUI
   object, seed it from the prefs, never call `save()`.** §1 and §3.
3. **Report 07 row 36 is wrong for our seat, and should be amended.**
   `PlayerControllerHuman.isUiSetToSkipPhase` consults `YieldController.isSkippingPhase`
   **only** `if (isRemoteClient())`; a local controller always calls
   `getGui().isUiSetToSkipPhase(...)` (src:`…/player/PlayerControllerHuman.java:3862-3867`,
   with `isRemoteClient()` at `:3791-3793` = `gui instanceof RemoteClientGuiGame`).
   Our `WireGuiGame` is not a `RemoteClientGuiGame`, so the `YieldController`'s
   skip-phase map is dead code for us. The answer must come out of
   `WireGuiGame.isUiSetToSkipPhase`. §3.
4. **The pref polarity is "stop", not "skip".** `label.setEnabled(prefs.getPrefBoolean(key))`
   and `isUiSetToSkipPhase` returns `!label.getEnabled()`
   (CMatchUI:`1430` and `1397-1398`). `PHASE_HUMAN_MAIN1` defaults to `"true"` =
   *stop at my Main 1*. protocol.md §2.2's `setPhaseStop {stop}` already has the
   right polarity; keep it and never rename it to `skip`. §3.
5. **"Pass to" is three different engine features.** End of turn is
   `YieldUpdate.SetAutoPassUntilEndOfTurn`; "until my next turn" and "before my
   turn" are the **per-(player, phase) yield marker** `YieldUpdate.SetMarker`;
   "let the stack resolve" is `YieldUpdate.StackYield`. All three go through one
   call, `IGameController.sendYieldUpdate(YieldUpdate)` (jar), and all three are
   cancelled by the same `buttonCancel`. One `act` with a `kind` covers the set.
   §4.
6. **A `yieldKey` is a card name.** `StackItemView.getKey()` (jar) is
   `SpellAbility.yieldKey()` (src:`…/spellability/SpellAbility.java:1034-1039`) =
   `CardView.toString() + ": " + toUnsuppressedString()`, and `CardView.toString()`
   is `"<zone> <translated name> (<id>)"` (src:`…/card/CardView.java:1215-1233`) —
   the exact text channel report 06 §4 catalogues. It is also explicitly *not*
   stable across versions (src:`…/player/PersistentAutoDecisionStore.java:24-26`).
   **Ship an opaque bridge-minted handle, not the key.** §5.
7. **Undo undoes mana abilities, not spells.** The undo stack only ever receives
   `SpellAbility`s for which `isUndoable()` holds
   (src:`…/zone/MagicStack.java:505-516`, `…/spellability/SpellAbility.java:1718-1728`)
   and is cleared on *every* phase change (src:`…/phase/PhaseHandler.java:154`)
   and whenever a non-undoable ability is activated. `GameSnapshot` is a
   *different*, experimental mechanism (`FPref.MATCH_EXPERIMENTAL_RESTORE`,
   default `"false"`) used for cost-payment rollback and **never wired to
   `undoLastAction`**. Do not build UI that promises more. §7.
8. **`endCurrentGame()` empties `getHumanControllers()`.** It nulls `game`, calls
   `clearAutoYields()`, `setGameSpeed(NORMAL)`, `afterGameEnd()` and then
   `humanControllers.clear()` (src:`…/match/HostedMatch.java:369-407`), and
   `restartMatch()` / `continueMatch()` run **on the EDT**
   (`:537-572` → `FThreads.invokeInEdtNowOrLater`). Every cached view id, the
   `ReplyPool`, the phase-stop map (keyed on `PlayerView` objects that are
   replaced) and the frame log must be rebuilt from `openView`. §8.
9. **There is no "difficulty" in Forge — there are four text files.**
   `res/ai/{Default,Cautious,Reckless,Experimental}.ai` (122 `AiProps` keys
   each), loaded by `FModel.initialize` → `AiProfileUtil.loadAllProfiles(ForgeConstants.AI_PROFILE_DIR)`
   (src:`…/model/FModel.java:273`). A picker sets one string. Pass it as
   `profileOverride` to `GamePlayerUtil.createAiPlayer(...)`, because the
   *no*-override branch writes and saves `FPref.UI_CURRENT_AI_PROFILE`
   (src:`…/player/GamePlayerUtil.java:78-89`). §9.

---

## 1. The one architectural fact behind all of it

Forge's live comfort state lives in **two** places, and neither of them is the
preferences file during play:

| state | lives in | seeded from | persisted by |
|---|---|---|---|
| phase stops (per turn-player, per phase) | the **GUI** object — desktop: `PhaseLabel.getEnabled()` | `FPref.PHASES_HUMAN` / `PHASES_AI` at match start | `CMatchUI.writeMatchPreferences()` only |
| yields, markers, auto-yield keys, yield prefs | the **controller** — `YieldController`, one per `PlayerControllerHuman` | `FModel` prefs read lazily through `getStringPref` | never (except the APINA toggle and INSTALL-tier keys) |

`AbstractPreferences.setPref` is a pure `EnumMap.put`
(src:`…/properties/AbstractPreferences.java:100-102`); the file is only touched
by `save()` (`:73-92`). So **"set a pref without writing `~/.forge`" is simply
`setPref` without `save`** — and in our case even `save()` would land in `var/`,
because `forge-home/forge.profile.properties` redirects `userDir` (CLAUDE.md).
We still never call it: a per-game toggle that silently rewrites the user's real
preferences is a surprise, and `var/` is `.gitignore`d scratch.

`YieldController` also ships a **per-controller pref override** for exactly this
purpose: `setPref(FPref, String)` writes an `EnumMap<FPref,String> prefOverrides`
and `getStringPref` reads "override first, `FModel` as fallback"
(src:`…/match/YieldController.java:90-98`, field at `:84`). Reached from the
outside as `IGameController.setYieldPref(FPref, String)` (jar). That is the right
home for the `YIELD_*` knobs if we ever expose them; it is **not** the right home
for phase stops (finding 3).

**Rule for the bridge, stated once:** M6 never calls
`FModel.getPreferences().save()`. It reads defaults at `openView` and keeps the
mutable copy next to the game.

---

## 2. `IGameController`, re-verified, with the M6 column

`javap forge.interfaces.IGameController` against the jar — **29 members**,
reproduced here because report 07 §9 lists 28 and predates this pass. The `M6`
column is what this document adds.

```
boolean mayLookAtAllCards()                     boolean canPlayUnlimitedLands()
void    concede()                               void    drawOfferAction(DrawOfferMessage$Action)
void    alphaStrike()                           void    useMana(byte)
void    selectButtonOk()                        void    selectButtonCancel()
void    selectPlayer(PlayerView, ITriggerEvent)
boolean selectCard(CardView, List<CardView>, ITriggerEvent)
void    selectAbility(SpellAbilityView)         void    undoLastAction()
IDevModeCheats cheat()                          IMacroSystem  macros()
void    nextGameDecision(NextGameDecision)      String  getActivateDescription(CardView)
void    reorderHand(CardView, int)              void    requestResync()
void    passPriority()
boolean shouldAutoYield(String)                          [default]
void    setShouldAutoYield(String, boolean, boolean)
void    setDisableAutoYields(boolean)
AutoYieldStore$TriggerDecision getTriggerDecision(String) [default]
void    setTriggerDecision(String, AutoYieldStore$TriggerDecision, boolean)
void    setDisableAutoTriggers(boolean)
void    applyYieldUpdate(YieldUpdate)
void    sendYieldUpdate(YieldUpdate)                     [default]
YieldController getYieldController()
void    setYieldPref(ForgePreferences$FPref, String)
```

| member | used by M6 | notes |
|---|---|---|
| `concede()` | §8 | over `getOriginalGameControllers()`, never `AbstractGuiGame.concede()` |
| `undoLastAction()` | §7 | gate on `PlayerControllerHuman.canUndoLastAction()` (jar, **not** on `IGameController`) |
| `nextGameDecision(NextGameDecision)` | §8 | jar enum `NEW` / `CONTINUE` / `QUIT` |
| `passPriority()` | §4 | **jar only** — absent from the 2.0.15 source checkout. Bytecode (`javap -c forge.player.PlayerControllerHuman`): `if (inputProxy.getInput() instanceof InputPassPriority) input.selectButtonOK();`. A *safe* pass: a no-op when the engine is asking something else, unlike `selectButtonOk()` |
| `sendYieldUpdate(YieldUpdate)` | §3, §4, §5 | `default { applyYieldUpdate(update); }` (src:`…/interfaces/IGameController.java:84-86`). The single entry point for every yield mutation |
| `setShouldAutoYield(String,boolean,boolean)` | §5 | key, on/off, `isAbilityScope` |
| `setTriggerDecision(String,TriggerDecision,boolean)` | §5 | `ASK` / `ACCEPT` / `DECLINE` (jar) |
| `getYieldController()` | §3–§5 | read-side for everything; `isAbilityScope()`, `isYieldActive()`, `getAutoPassUntilMarker()` |
| `setYieldPref(FPref,String)` | §4 (optional) | per-controller override, no file write |
| `useMana(byte)` | §6 | floating mana **only** — `InputPayMana.useManaFromPool(byte)` |
| `alphaStrike()`, `selectCard/Player/Ability`, `selectButtonOk/Cancel`, `requestResync` | M2/M3 | unchanged |
| `mayLookAtAllCards`, `canPlayUnlimitedLands`, `cheat`, `macros`, `reorderHand`, `getActivateDescription`, `drawOfferAction`, `applyYieldUpdate`, `setDisableAutoYields`, `setDisableAutoTriggers` | — | unused in v1 |

Obtain a controller with `AbstractGuiGame.getGameController()` /
`getGameController(PlayerView)` / `getOriginalGameControllers()` (jar, all
`final`, `…/match/AbstractGuiGame.java:170-184`).

---

## 3. Phase stops

### 3.1 What Forge actually does

`IGuiGame.isUiSetToSkipPhase(PlayerView playerTurn, PhaseType phase)` is
**abstract** (jar; `WireGuiGame` must implement it — report 07 row 36). Two
callers matter:

- **The priority loop.** `PlayerControllerHuman.chooseSpellAbilityToPlay()`
  (src:`…/player/PlayerControllerHuman.java:1650`) computes
  `nowMayAutoPass = mayAutoPass() || skipsPromptForStackOrPhase()` (`:1677-1679`);
  when true it sleeps the inter-phase delay, calls `getGui().awaitNextInput()`
  and **returns `null` — i.e. passes priority without ever building an input**
  (`:1681-1707`). `skipsPromptForStackOrPhase()` (`:3804-3812`) is: if something
  is on the stack, `top.isAbility() && shouldAutoYield(top.getKey())`; otherwise
  `isUiSetToSkipPhase(gameView.getPlayerTurn(), gameView.getPhase())`.
- **The delay.** `isUiSetToSkipPhase` is asked a second time at `:1688` purely to
  decide whether to insert `FControlGamePlayback.phasesDelay`.

It is **very hot** (every step, on the game thread). Report 07 row 36's warning
stands: no allocation, no logging in that method.

The desktop implementation is not a preference read:

```java
// src: forge-gui-desktop/src/main/java/forge/screens/match/CMatchUI.java:1389-1399
public boolean isUiSetToSkipPhase(final PlayerView playerTurn, final PhaseType phase) {
    PlayerView controlledPlayer = playerTurn.getMindSlaveMaster();
    boolean skippedPhase = true;
    if (controlledPlayer != null) { … }               // mind-slave AND-combine
    final PhaseLabel label = getFieldViewFor(playerTurn).getPhaseIndicator().getLabelFor(phase);
    return skippedPhase && label != null && !label.getEnabled();
}
```

and the labels are seeded from the prefs exactly once:

```java
// src: CMatchUI.java:1417-1441 (actuateMatchPreferences), called at match start
final FPref[] keys = isLocalPlayer(player) ? FPref.PHASES_HUMAN : FPref.PHASES_AI;
for (int p = 1; p < phases.length; p++) {             // p starts at 1: UNTAP has no pref
    label.setEnabled(prefs.getPrefBoolean(keys[p - 1]));
    label.setOnToggled(() -> pushSkipPhaseToControllers(player, phase));
    label.setOnRightClick(() -> handleYieldMarkerToggle(player, phase, …));
}
```

and written back only by `writeMatchPreferences()` (`:1401-1415`,
`prefs.setPref(...)` ×24 then `prefs.save()`), which is a *match-teardown* call.

**Therefore:** a per-(turn-player, phase) stop set, seeded from prefs, mutated
during play, discarded at the end, is not a departure from Forge — it *is*
Forge. The bridge does the same with an `EnumMap`.

### 3.2 The preference table (jar-verified defaults)

Defaults read out of the jar's `FPref` static initializer
(`javap -c 'forge.localinstance.properties.ForgePreferences$FPref'`), identical
to src:`…/properties/ForgePreferences.java:240-264`. `true` = **stop here**.

| `PhaseType` (index into `PhaseType.values()`) | human pref | dflt | AI pref | dflt |
|---|---|---|---|---|
| `UNTAP` (0) | — | — | — | — |
| `UPKEEP` (1) | `PHASE_HUMAN_UPKEEP` | false | `PHASE_AI_UPKEEP` | false |
| `DRAW` (2) | `PHASE_HUMAN_DRAW` | false | `PHASE_AI_DRAW` | false |
| `MAIN1` (3) | `PHASE_HUMAN_MAIN1` | **true** | `PHASE_AI_MAIN1` | false |
| `COMBAT_BEGIN` (4) | `PHASE_HUMAN_BEGINCOMBAT` | false | `PHASE_AI_BEGINCOMBAT` | **true** |
| `COMBAT_DECLARE_ATTACKERS` (5) | `PHASE_HUMAN_DECLAREATTACKERS` | false | `PHASE_AI_DECLAREATTACKERS` | **true** |
| `COMBAT_DECLARE_BLOCKERS` (6) | `PHASE_HUMAN_DECLAREBLOCKERS` | **true** | `PHASE_AI_DECLAREBLOCKERS` | **true** |
| `COMBAT_FIRST_STRIKE_DAMAGE` (7) | `PHASE_HUMAN_FIRSTSTRIKE` | false | `PHASE_AI_FIRSTSTRIKE` | false |
| `COMBAT_DAMAGE` (8) | `PHASE_HUMAN_COMBATDAMAGE` | false | `PHASE_AI_COMBATDAMAGE` | false |
| `COMBAT_END` (9) | `PHASE_HUMAN_ENDCOMBAT` | false | `PHASE_AI_ENDCOMBAT` | false |
| `MAIN2` (10) | `PHASE_HUMAN_MAIN2` | **true** | `PHASE_AI_MAIN2` | false |
| `END_OF_TURN` (11) | `PHASE_HUMAN_EOT` | false | `PHASE_AI_EOT` | **true** |
| `CLEANUP` (12) | `PHASE_HUMAN_CLEANUP` | false | `PHASE_AI_CLEANUP` | false |

`FPref.PHASES_HUMAN` and `FPref.PHASES_AI` are public 12-element arrays in that
order (jar: `public static FPref[] PHASES_HUMAN;`); index with `p - 1` for
`PhaseType.values()[p]`, `p ≥ 1`. `PhaseType` has 13 constants (jar) and carries
`nameForUi` as a public final field — use it for the phase-strip labels rather
than prettifying the enum name in TypeScript.

Note which array applies is chosen by **whose turn it is**, not by who is
setting the stop: `isLocalPlayer(player) ? PHASES_HUMAN : PHASES_AI`. In a
two-player game that is 24 booleans: "stop at MAIN1 on my turn" and "stop at
MAIN1 on the AI's turn" are separate switches. This is the whole reason the
desktop draws a phase strip per player field.

### 3.3 What the bridge does

```java
// WireGuiGame
private final Map<Integer, EnumSet<PhaseType>> stops = new HashMap<>();  // key: player id

/** openView(): seed from prefs, once per game, no save(). */
private void seedPhaseStops(Iterable<PlayerView> players) {
    final ForgePreferences prefs = FModel.getPreferences();
    final PhaseType[] phases = PhaseType.values();
    for (PlayerView pv : players) {
        FPref[] keys = isLocalPlayer(pv) ? FPref.PHASES_HUMAN : FPref.PHASES_AI;
        EnumSet<PhaseType> set = EnumSet.noneOf(PhaseType.class);
        for (int p = 1; p < phases.length; p++) {
            if (!prefs.getPrefBoolean(keys[p - 1])) set.add(phases[p]);   // NB: inverted — we store SKIPS
        }
        stops.put(pv.getId(), set);
    }
}

@Override public boolean isUiSetToSkipPhase(PlayerView turnPlayer, PhaseType phase) {
    EnumSet<PhaseType> set = stops.get(turnPlayer.getId());   // no allocation, no logging
    return set != null && set.contains(phase);
}
```

`isLocalPlayer(PlayerView)` is `public final` on `AbstractGuiGame` (jar), but it
answers from the controller map, so inside `openView` decide local-vs-AI from the
`TrackableCollection<PlayerView>` `openView` is handed (report 07 §4.1) and seed
the rest of the table from `getGameView().getPlayers()` on the first `state`.

Key by **player id**, not by `PlayerView` identity: §8 replaces every `PlayerView`
on New Game, and a `HashMap<PlayerView,…>` would silently go stale.
(`YieldController.skipPhases` is a `HashMap<PlayerView, EnumSet<PhaseType>>`,
src:`…/match/YieldController.java:81` — fine for it, because it is rebuilt with
its controller.)

`act: setPhaseStop {playerId, phase, stop}` flips one bit on the EDT. It does
**not** need to reach the controller at all for a local seat (finding 3); the
next priority pass reads the map. For symmetry with Forge — and because it costs
one line — also send `ctrl.sendYieldUpdate(new YieldUpdate.SkipPhase(pv, phase, skip))`
(jar record: `turnPlayer()/phase()/skip()`), which is what
`NetworkGuiGame.pushSkipPhaseToControllers` does
(src:`…/net/NetworkGuiGame.java:612-623`). Harmless, and it means a later
remote-ish path works unchanged.

**One trap.** Turning a stop *on* while the game is already parked mid-yield does
nothing until the next priority pass; turning one *off* likewise. Forge's own
toggle handler calls `pushSkipPhaseToControllers` which ends in
`PlayerControllerHuman.applyYieldUpdate → tryAutoPassNow()`
(src:`…/player/PlayerControllerHuman.java:3870-3897`, `:3910-3915`), i.e. "if we
are sitting on an `InputPassPriority` and the new setting says pass, press pass
now". Send the `SkipPhase` update and we inherit that behaviour for free.

### 3.4 Wire and UI

| piece | value |
|---|---|
| `act` | `setPhaseStop` — **already in protocol.md §2.2**, `{playerId, phase, stop}` |
| new `state` field | `players[].phaseStops: ["MAIN1", …]` — the phases this player's turn stops at (see §10 P1) |
| client renders | the M4 right-rail phase strip gains a second row per player; each cell is a toggle; the active phase is highlighted from `state.phase` as today |
| client computes | **nothing.** A cell's on/off comes from `state`; a click is an `act`; the next `state` says what happened |

---

## 4. Pass To — end of turn, my next turn, before my turn

### 4.1 The three engine mechanisms

All three live on `YieldController` (jar, 48 public members) and all three are
mutated through one envelope type, `YieldUpdate` (jar, an interface with ten
record implementations: `SkipPhase`, `SetMarker`, `ClearMarker`, `StackYield`,
`SetAutoPassUntilEndOfTurn`, `SetYieldPref`, `SeedFromClient`, `CardAutoYield`,
`TriggerDecision`, `SetDisableYields`, `SetDisableTriggers`, `ClearAbilityOrders`).

| user intent | envelope | controller state | ends when |
|---|---|---|---|
| **End turn** | `SetAutoPassUntilEndOfTurn(player, true)` | `autoPassUntilEOT` | the turn ends — `PlayerController.autoPassCancel()` fires from `PhaseHandler:412` ("autopass won't wrap to next turn") and from `GameAction:2377`; or an interrupt; or Cancel |
| **Pass to *my next turn*** | `SetMarker(me, UPKEEP, atOrPast)` | `autoPassUntilMarker` | priority reaches my Upkeep (`shouldAutoYield()` clears it, src:`…/match/YieldController.java:174-186`) |
| **Pass to *before my turn*** (= the opponent's End Step) | `SetMarker(opponent, END_OF_TURN, atOrPast)` | same | priority reaches that player's End Step |
| **Let the stack resolve** | `StackYield(player, true, respectsInterrupts)` | `autoPassUntilStackEmpty` | the stack empties (`:169-173`) |

`YieldController` enforces **one yield at a time**: each setter clears the other
two (`:127-158`). `isYieldActive()` is the OR (`:395-398`).

The two static helpers are the exact calls to copy:

```java
// src: …/match/YieldController.java:459-462
public static void endTurn(IGameController ctrl, PlayerView local) {
    if (ctrl == null || local == null) return;
    ctrl.sendYieldUpdate(new YieldUpdate.SetAutoPassUntilEndOfTurn(local, true));
}
```

`AbstractGuiGame.handleYieldMarkerToggle(PlayerView phaseOwner, PhaseType phase, Runnable)`
is `protected final` (jar; src:`…/match/AbstractGuiGame.java:728-746`) and does the
whole marker dance: same cell twice → `ClearMarker`; otherwise read
`YieldController.isPriorityAtOrPastMarker(gameView, phaseOwner, phase)` **before**
un-skipping the cell (the comment at `:740` says why: un-skipping can pass
priority and move the game on), run the caller's "make this phase a stop"
runnable, then `SetMarker`. **Call it; do not reimplement it.** Our runnable is
"turn the stop bit on in the §3.3 map and push a `SkipPhase`" — a marker on a
phase we skip could never fire.

Forge itself uses the marker for the "no actions available" suggestion, marking
`(me, UPKEEP)` and explaining the choice in a comment worth repeating:
*UNTAP has no priority pass, so a marker on UNTAP could never fire*
(src:`…/input/InputPassPriority.java:248-255`).

`docs/Advanced-Yield-Options.md` in the source checkout is the user-facing
description of all of this (markers are set by right-clicking a phase cell;
"Per-(player, phase) precision" at `:57`; interrupts at `:73-87`; the `P` hotkey
as both "auto-pass" and "stop everything" at `:31`). It matches the 2.0.14 jar:
every `FPref` and every class it names is present, and the installed
`res/languages/en-US.properties` carries the strings (`lblYieldingUntilEndOfTurn`
at `:1678`, `lblYieldingUntilPhaseFmt` at `:1679`,
`lblYieldingUntilStackClears` at `:1680`).

### 4.2 While a yield runs, the engine drives the prompt

`AbstractGuiGame.updateAutoPassPrompt()` is **`public final`** (jar) — we do not
implement it, we receive its effects:

```java
// src: …/match/AbstractGuiGame.java:702-711
String message = currentYieldMessage();          // "Yielding until end of turn.\nYou may cancel…"
if (message == null) return;
cancelAwaitNextInput();
showPromptMessage(getCurrentPlayer(), message);
updateButtons(getCurrentPlayer(), false, true, false);   // ok disabled, cancel enabled
```

so a yield arrives at the browser as an ordinary `input` frame with a prompt and
a live Cancel button — and `InputLockUI.selectButtonCancel()` is
`controller.getYieldController().clearActiveYieldAndDispatch()`
(src:`…/input/InputLockUI.java:93-95`). **Cancelling a yield therefore needs no
new `act`:** it is `buttonCancel`, which M3 already sends.

`currentYieldMessage()` (`:585-607`) picks the string from marker → stack → EOT,
so the prompt already tells the user *which* yield is running, in the engine's own
words. protocol.md §4 says prompts are rendered verbatim. Done.

### 4.3 `passPriority` vs `buttonOk`

Report 07's amendment A6 asks for a `passPriority` act. Confirmed and refined:
`IGameController.passPriority()` exists in the jar (absent from the 2.0.15 source
checkout — drift in the other direction from the usual), and
`PlayerControllerHuman.passPriority()` disassembles to

```
getfield inputProxy; invokevirtual InputProxy.getInput
instanceof InputPassPriority; ifeq → return
invokeinterface Input.selectButtonOK
```

i.e. **press OK only if the engine is currently asking for a priority pass.** That
is strictly safer than `selectButtonOk()` for a keyboard binding, which might
otherwise confirm a targeting prompt. Bind the space bar to `passPriority` when
`input.prompt` is a priority prompt — or simply always, since it is a no-op
otherwise.

Caveat: when a *yield suggestion* is on screen, `InputPassPriority.onOk()`
accepts the suggestion rather than passing (src:`:220-266`); the source's own
comment at `:268` flags the distinction. Suggestions are off by default
(`YIELD_DECLINE_SCOPE_*` default `"NEVER"`, and `:105-106` early-returns when
both are `NEVER`), so v1 never sees one. Leave them off; do not add a settings
panel for them in M6.

### 4.4 Wire and UI

| piece | value |
|---|---|
| new `act` | `yieldTo {kind: "endOfTurn" \| "stack" \| "phase", playerId?, phase?}` (§10 P4) |
| new `act` | `passPriority {}` (A6, §10 P4) |
| cancel | existing `buttonCancel` |
| new `state` field | `yield: {kind, playerId, phase} \| null` (§10 P2) so the strip can draw the fast-forward marker Forge draws |
| Forge call | `endOfTurn` → `YieldController.endTurn(ctrl, me)`; `stack` → `ctrl.sendYieldUpdate(new YieldUpdate.StackYield(me, true, true))`; `phase` → `handleYieldMarkerToggle(pv, phase, () -> { stops.get(id).remove(phase); ctrl.sendYieldUpdate(new SkipPhase(pv, phase, false)); })` |
| client renders | three buttons in the left rail — *End Turn*, *To my turn*, *To their end step* — plus a fast-forward glyph on the marked phase cell, plus the engine's yield prompt with its Cancel |

"End Turn" is also free without any of this, as the Cancel button of a normal
priority prompt (§0.1). Ship that first; the explicit buttons are the second
evening.

---

## 5. Auto-yield for triggered abilities ("always yes" / "always no")

### 5.1 The mechanism

Two orthogonal stores, both reached through the controller:

- **Auto-yield** — "stop asking me about this thing; just let it resolve".
  `shouldAutoYield(key)` is consulted in `skipsPromptForStackOrPhase()` for the
  *stack top* (`PlayerControllerHuman.java:3806-3808`), so an auto-yielded
  ability makes the priority loop pass without prompting.
- **Trigger decision** — `ASK` / `ACCEPT` / `DECLINE` (jar enum
  `AutoYieldStore$TriggerDecision`), consulted at the top of
  `confirmTrigger(WrappedAbility)` (`:787-790`): `ACCEPT` returns `true`,
  `DECLINE` returns `false`, `ASK` falls through to the normal
  `InputConfirm.confirm(...)` prompt.

`AutoYieldStore` (jar) holds both, keyed by string, in three tiers: `GAME`,
`MATCH`, `SESSION`. Which tier is live is decided by
`FPref.UI_AUTO_DECISION_MODE`, whose default is
`ForgeConstants.AUTO_DECISION_PER_ABILITY` = `"Per Ability (Each Match)"`
(src:`…/properties/ForgePreferences.java:147`, `…/properties/ForgeConstants.java:360-363`),
mapped by `YieldController.activeTier()` (`:245-251`) to `Tier.MATCH`. Two
consequences we must honour:

1. **`isAbilityScope()` is `true` by default** (`:210-213`: the mode is not
   `PER_CARD`). So the key we pass to `setShouldAutoYield` must be stripped by
   `AutoYieldStore.abilitySuffix(...)` — which `setShouldAutoYield` does for us
   (`:215-223`) **provided we pass `abilityScope = getYieldController().isAbilityScope()`**,
   exactly as the desktop shortcut does. Do not hardcode `false`.
2. **Never set the mode to `"Per Ability (Each Install)"`.** That branch routes
   to `PersistentAutoDecisionStore`, which reads and writes
   `<USER_DIR>/auto-yields.dat` (src:`…/player/PersistentAutoDecisionStore.java:45`).
   Our `USER_DIR` is `var/`, so it is not a `~/.forge` violation, but it is a
   file write we have no reason to make.

Lifetime: `YieldController.clearAutoYields()` is called from
`HostedMatch.endCurrentGame()`, and `AutoYieldStore.onGameEnd(matchOver)` clears
`GAME` always and `MATCH` only when the match is over (`…/player/AutoYieldStore.java:55-62`).
So an "always yes" survives to the next game of the same match, which is what a
player expects.

The desktop's Y / N shortcuts are the complete recipe (src:`…/control/KeyboardShortcuts.java:159-200`):

```java
StackItemView si = matchUI.getGameView().peekStack();
if (si != null && si.isAbility()) {
    boolean abilityScope = matchUI.getGameController().getYieldController().isAbilityScope();
    String key = si.getKey();
    if (si.isOptionalTrigger() && matchUI.isLocalPlayer(si.getActivatingPlayer()) && !key.isEmpty()) {
        matchUI.getGameController().setTriggerDecision(key, TriggerDecision.ACCEPT /* or DECLINE */, abilityScope);
    }
    matchUI.getGameController().setShouldAutoYield(key, true, abilityScope);
}
```

Note the guards: **only for `isAbility()` stack items, only `isOptionalTrigger()`
ones owned by the local player get a trigger decision, and an empty key is
ignored.** `PlayerControllerHuman.setTriggerDecision` additionally presses the
button *now* if the current input is the `InputConfirm` for that same key
(`:3844-3855`), so "Always Yes" answers the question in front of you as well as
future ones.

### 5.2 The `yieldKey`, and why it must not go on the wire raw

Report 07 A6 says a `yieldKey` must reach the client. It can — here is exactly
where it is readable and what it is.

**Where.** `StackItemView.getKey()` (jar) is the only view-side accessor.
Its value is set once per stack instance:
`set(TrackableProperty.Key, si.getSpellAbility().yieldKey())`
(src:`…/spellability/StackItemView.java:53-57`). There is **no** key on
`SpellAbilityView` (jar: `getHostCard`, `getDescription`, `canPlay`,
`promptIfOnlyPossibleAbility`, `isSpell`, `getCardView` — that is the whole
class). So an auto-yield can only be offered for something **on the stack**, not
for an ability in a card's menu. That matches the desktop, and it bounds the
feature usefully.

**What.**

```java
// src: …/spellability/SpellAbility.java:1034-1039
public String yieldKey() {
    if (getHostCard() != null) return getHostCard().toString() + ": " + toUnsuppressedString();
    return toUnsuppressedString();
}
// WrappedAbility (triggered abilities) overrides: host.toString() + ": " + getTrigger().toString()
//   src: …/trigger/WrappedAbility.java:152-161
```

and `Card.toString()` → `CardView.toString()` →
`"<zoneText> <translated name> (<id>)"` (src:`…/card/CardView.java:1215-1233`;
face-down cards render `"Face-down card (H<hiddenId>)"`). `AutoYieldStore.abilitySuffix`
confirms the shape by stripping everything up to the first `"): "`
(`…/player/AutoYieldStore.java:73-75`).

So a `yieldKey` is **a card name plus its id plus its rules text** — precisely
the `CardView.toString()` channel report 06 §4 opens with. For a stack item that
information is already public (`stack[].text` ships it), so shipping the key is
not a *new* leak today. But it is a second, un-gated string path into the client,
and CLAUDE.md rule 8 exists because second paths are how leaks happen.

**Is it stable?** Within a game, yes — same card instance, same ability, same
string, so "always yes" keeps matching. Across games it is stable only if the id
matches, which is why the ability-scope strip exists. Across Forge versions it is
explicitly **not**: *"Entries are keyed by SpellAbility.yieldKey() and are not
guaranteed stable across Forge versions or card text edits. Stale entries
silently fail to match"* (src:`…/player/PersistentAutoDecisionStore.java:24-26`).

**Decision.** Ship an **opaque handle**, not the key.

```java
// WireGuiGame, per game
private final Map<String,String> yieldHandleToKey = new HashMap<>();
private final Map<String,String> keyToYieldHandle = new HashMap<>();
String yieldHandle(String key) {                       // game thread, inside Snap
    if (key == null || key.isEmpty()) return null;
    return keyToYieldHandle.computeIfAbsent(key, k -> {
        String h = "y" + (yieldHandleToKey.size() + 1);
        yieldHandleToKey.put(h, k);
        return h;
    });
}
```

`state.stack[].yieldKey` is then `"y7"`, interned for the life of the game, and
the client treats it as opaque and **never renders it**. `act: setYield
{yieldKey:"y7", mode}` resolves it back on the EDT. Cost: twenty lines. Benefit:
the wire keeps its property that every string on it is either a prompt Forge
wrote for this player or a public stack description, and the M1 redaction checker
keeps meaning something.

### 5.3 Wire and UI

| piece | value |
|---|---|
| amended `act` | `setYield {yieldKey, mode}` — **replaces** protocol.md §2.2's `{cardId, mode}`, which cannot be built (A6). `mode` ∈ `"always"` (yield only), `"yes"` (trigger ACCEPT + yield), `"no"` (trigger DECLINE + yield), `"off"` (clear) |
| new `state` fields | `stack[].yieldKey`, `stack[].isAbility`, `stack[].isOptionalTrigger`, `stack[].yielded` (§10 P3). `yielded` is `IGameController.shouldAutoYield(rawKey)` (jar `default` → `getYieldController().shouldAutoYield`), read on the game thread with the rest of the snapshot |
| Forge call | `ctrl.setShouldAutoYield(key, on, ctrl.getYieldController().isAbilityScope())`, preceded by `ctrl.setTriggerDecision(key, ACCEPT\|DECLINE, sameScope)` when `isOptionalTrigger && activatingPlayer == me` |
| client renders | on the top stack item, when `isAbility`: a small **Always** control; when also `isOptionalTrigger` and mine: **Always Yes** / **Always No**. A `yielded` item gets a muted badge. Keys `Y` and `N` (§11) |
| client computes | nothing — `isAbility`, `isOptionalTrigger` and the owner all come from `StackItemView` (jar: `isAbility()`, `isOptionalTrigger()`, `getActivatingPlayer()`) |

---

## 6. Auto Pay

### 6.1 The Auto button *is* the OK button

```java
// src: …/input/InputPayMana.java:389-395
protected void updateButtons() {
    if (supportAutoPay()) {
        getGui().updateButtons(getOwner(), loc.getMessage("lblAuto"), loc.getMessage("lblCancel"),
                               false, !mandatory, false);
    } else { … }
}
// :397-412 updateMessage(): when ComputerUtilMana can pay, re-enable it
if (autoPayManaSources != null) {
    getGui().updateButtons(getOwner(), loc.getMessage("lblAuto"), loc.getMessage("lblCancel"),
                           true, !mandatory, true);
}
// :376-387 onOk()
if (supportAutoPay() && !locked) {
    locked = true;                                    // prevents a double-click handing the seat to the AI twice
    final Runnable proc = () -> ComputerUtilMana.payManaCost(manaCost, saPaidFor, player, effect);
    game.getAction().invoke(() -> { runAsAi(proc); onStateChanged(); });   // must run on the game thread
}
```

`lblAuto=Auto` (`res/languages/en-US.properties:503`). `runAsAi` is
`player.runWithController(proc, new PlayerControllerAi(...))` (`:371-373`) — the
human seat literally borrows the AI for one payment.

**So protocol.md §4 already carries Auto Pay**: `input.buttons.ok.label` arrives
as `"Auto"`, `enabled` flips to `true` exactly when
`ComputerUtilMana.getManaSourcesToPayCost` found a plan, and `act: buttonOk`
runs it. The M5 note in PLAN.md ("the engine's own Auto button") is satisfied by
*rendering the label we are already sent*. There is **no `autoPay` act and there
should not be one** — inventing one would mean a second path into `onOk`.

Two related pieces:

- **`act: useMana` is not Auto Pay.** `IGameController.useMana(byte)` disassembles
  to `if (inputQueue.getInput() instanceof InputPayMana p) p.useManaFromPool(color)`
  (`javap -c forge.player.PlayerControllerHuman`), i.e. spend *floating* mana
  already in the pool. Tapping a land is `clickCard`. protocol.md §2.2's
  `useMana {cardId | color}` should lose its `cardId` form (§10 P6).
- **The auto-tap preview.** `updateMessage` calls
  `pushActionableCards(true, getAutoTapPreviewViews())` (`:409`), whose views are
  the `autoPayManaSources` the AI would tap (`:454-465`), and which reach the GUI
  through `setWeaklySelectable`. That is report 07 amendment A8's
  `input.weak[]` — M6 renders it as a dotted outline meaning *"Auto would tap
  this"*. `FPref.UI_SHOW_AUTOTAP_PREVIEW` gates it in Forge; we can simply always
  render what we are sent.

### 6.2 Wire and UI

| piece | value |
|---|---|
| `act` | none new. `buttonOk` (= Auto), `clickCard` (tap a land), `useMana` (spend floating mana), `buttonCancel` (= Cancel, when not mandatory) |
| `state`/`input` | `input.weak[]` from A8; `players[].manaPool` already in §3 |
| client renders | the OK button with its engine label `Auto`, disabled until the engine enables it; mana pips from `manaPool`; weakly-selectable lands dotted |
| client computes | **nothing** — in particular no payability prediction (CLAUDE.md scope note: "Forge itself does no payability prediction for humans" — except through this button, which is the AI) |

---

## 7. Undo

### 7.1 What is undoable

```java
// src: …/player/PlayerControllerHuman.java:2684-2717
public boolean canUndoLastAction() {
    if (!getGame().stack.canUndo(player)) return false;
    final Player priorityPlayer = getGame().getPhaseHandler().getPriorityPlayer();
    return priorityPlayer != null && priorityPlayer == player;
}
public void undoLastAction()      { tryUndoLastAction(); }
public boolean tryUndoLastAction() {
    if (!canUndoLastAction()) return false;
    if (getGame().getStack().undo()) {
        if (inputQueue.getInput() instanceof InputPassPriority i) i.showMessageInitial();
        if (getGui().isNetGame()) inputQueue.updateObservers();
        return true;
    }
    return false;
}
```

(jar confirms all three: `canUndoLastAction()`, `undoLastAction()`,
`tryUndoLastAction()` on `PlayerControllerHuman`; only `undoLastAction()` is on
`IGameController`.)

`MagicStack.canUndo(player)` is `undoStackOwner == player` (`…/zone/MagicStack.java:193-195`).
The undo stack is fed by `recordUndoableActions` (`:505-516`): if
`sp.isUndoable()` push it (clearing first if the owner changed), **else clear the
whole stack**. `SpellAbility.isUndoable()` is
`undoable && payCosts.isUndoable() && getHostCard().isInPlay()`
(`…/spellability/SpellAbility.java:1718-1720`) and `undo()` refunds the mana and
the paid costs (`:1722-1728`). `MagicStack.undo()` pops one, refunds via
`ManaRefundService`, and on failure clears the stack and the paying abilities
(`:196-210`).

And `PhaseHandler:154` runs `game.getStack().clearUndoStack();` with the comment
*"can't undo action from previous phase"*.

**Plain statement for the UI:** Undo rolls back mana abilities you activated
during the current priority window — tapping lands, mana rocks — and stops at the
first thing that is not undoable, at any phase boundary, and the moment priority
leaves you. It does **not** un-cast a spell and it does **not** rewind a
resolution.

### 7.2 `GameSnapshot` is a different animal

`GameSnapshot` (jar: `makeCopy`, `restoreGameState`, `assignGameState`, `find`,
`reverseFind`) backs `Game.stashGameState()` / `restoreGameState()`
(src:`…/game/Game.java:203-215`), both guarded by
`Game.EXPERIMENTAL_RESTORE_SNAPSHOT`, which `HostedMatch.startGame()` sets from
`FPref.MATCH_EXPERIMENTAL_RESTORE` — default `"false"`
(`…/match/HostedMatch.java:163`, `…/properties/ForgePreferences.java:206`). Its
call sites are cost-payment rollback inside `PlaySpellAbility` (`:121`, `:693`),
`HumanCostDecision:735` and the assist-payment path
(`PlayerControllerHuman:564`), plus `GameCopier` for AI simulation. **Nothing
connects it to `undoLastAction`.** Do not turn the pref on to "get a better
undo": it changes rules-engine rollback behaviour globally and is labelled
experimental in its own preference name.

### 7.3 Wire and UI

| piece | value |
|---|---|
| `act` | `undo` — already in protocol.md §2.2 → `IGameController.undoLastAction()` |
| new `state` fields | `undo: {can: bool, depth: int}` from `canUndoLastAction()` and `MagicStack.getUndoStackSize()` (jar) — built on the game thread with the rest of `Snap.state()` (§10 P5) |
| client renders | a dedicated Undo button showing `Undo (depth)`, disabled when `!can` — **and** the Cancel button whenever the engine has already labelled it `Undo (n)`, which it does for us (`InputPassPriority:171`) |
| keyboard | `Ctrl+Z` (§11) |

The two paths agree because they ask the same question; if they ever disagree,
the engine's button label wins.

### 7.4 When the act may run — added 2026-09-28 (D136, amendment M48)

This section was written about *what* undo does, and said nothing about *when*
the bridge may call it; that silence was a defect. `undoLastAction()` →
`MagicStack.undo()` pops the undo stack, untaps and refunds, and consults no
input — and the bridge called it from `mtg-table-EDT` whenever the act arrived.
The undo stack is a plain `java.util.Stack` that `Game-0` walks in
`recordUndoableActions` → `clearUndoStack` each time it puts a non-undoable
spell on the stack, and the one `state` that offers the undo of a mana payment
is flushed by the payment's `stop()` after it has removed the input and just
before it releases `Game-0` into that walk. An undo sent on it raced `Game-0`:
`ArrayIndexOutOfBoundsException` in `PhaseHandler.mainGameLoop` in the story
branch's gate run, and out of `undoLastAction()` itself in M6's evidence §4.3.
Desktop Forge makes the same call from its EDT (Ctrl+Z) and is safe only because
a human hand is slower than the window.

So the act is applied only while the engine is **quiet on this seat** — parked
on an input (the §7.1 undo can only be meaningful there anyway: priority is
this seat's), no ask outstanding, the input the act arrived under, no mana
ability being activated on a worker, no pass still with the engine, none of the
bridge's hops walking, no engine thread running — and is otherwise refused with
`notice {title:"Not now"}`, touching nothing. `useMana` (§6.1) gets the same
guard for the same reason: `InputPayMana.useManaFromPool` spends the pool from
the EDT and checks neither `finished` nor `locked`. D136 has the conditions, the
jar path behind each, and why no fourth game-thread hop; `docs/evidence/
undo-race.md` has the reproduction.

| piece | value (M48) |
|---|---|
| `act: undo` / `act: useMana` | applied only while the engine is quiet on this seat |
| otherwise | `notice {level:"warn", title:"Not now", text:"undo: …"}` — no effect, nothing queued |
| client | may send it again when a later `state` still offers the undo |

---

## 8. Concede, and New Game without restarting the JVM

### 8.1 Concede

```java
// act: concede   →  EDT  →
for (IGameController c : getOriginalGameControllers()) c.concede();
```

`PlayerControllerHuman.concede()` (src:`…/player/PlayerControllerHuman.java:3647-3663`)
concedes the player, runs `checkGameOverCondition()`, and — if the game ended —
releases **every** human input queue with `getInputQueue().onGameOver(true)`. That
last loop is what makes concede work as the universal escape hatch protocol.md §5.2
invariant 6 demands: a game thread parked on an `ask` is freed.

**Do not call `AbstractGuiGame.concede()`** (src:`…/match/AbstractGuiGame.java:437-500`).
It runs a nested `showConfirmDialog` at `:460` — a blocking question issued from
whatever thread clicked — then dispatches `nextGameDecision(QUIT)` per local
player at `:485-489`. Report 07 §9 already flags this; the read above confirms
the reason and adds a second: `:456-459` refuses outright during a mulligan
(`gameView.isMulligan()`), showing an error dialog instead. Our own concede path
must work during a mulligan, so we want `IGameController.concede()` directly.

Confirmation, if we want one, is a browser dialog — not an engine question.

**Added 2026-09-28 (D136, amendment M48): not from a running engine.**
`checkGameOverCondition()` walks `Game.getPlayers()` and edits it
(`onPlayerLost`), and run from the EDT while `Game-0` was walking the same list
(`Game.copyLastState`, its own `checkGameOverCondition`) it threw
`ConcurrentModificationException` on `Game-0` — twice in thirty seeds of the
undo-race lane's sweep, whose client concedes the moment its undo is refused.
So the bridge applies the concede whole only while the engine is quiet on this
seat; otherwise it writes the outcome alone (`Player.concede()`, one field),
answers any parked ask with its default, asks the seat nothing more, and lets
`Game-0`'s own state-based check end the game — or finishes the concede when the
engine parks here first. The escape hatch still always opens; it opens on the
engine's thread.

### 8.2 New game / restart

```java
// src: …/match/HostedMatch.java:148-156
public void continueMatch() { endCurrentGame(); startGame(); }
public void restartMatch()  { endCurrentGame(); startMatch(match.getRules(), null, match.getPlayers(), this.guis, this.matchPlaylist); }
```

and the route from the client:

`act: nextGame` → `IGameController.nextGameDecision(CONTINUE)` →
`PlayerControllerHuman.nextGameDecision` fires
`UiEventNextGameDecision(this, decision)` on the match
(src:`…/player/PlayerControllerHuman.java:3683-3686`) →
`HostedMatch.addNextGameDecision` (`:537-572`) which, once every human controller
has voted, runs `continueMatch()` or `restartMatch()` **via
`FThreads.invokeInEdtNowOrLater`**, i.e. on our virtual EDT. `QUIT` short-circuits
to `endCurrentGame()` + `isMatchOver = true` + the `onMatchOver` hook.

Since we have exactly one human controller, one `nextGameDecision` decides. Two
distinct user actions map cleanly:

| user action | call | effect |
|---|---|---|
| **Next game** (after `over` with `matchOver:false`) | `nextGameDecision(CONTINUE)` | `continueMatch()` — next game of the same match, sideboard rules intact |
| **New match** | `nextGameDecision(NEW)` | `restartMatch()` — a fresh `Match` from the same rules and players |
| **Quit** | `nextGameDecision(QUIT)` | `endCurrentGame()`, `onMatchOver` hook → we shut the socket down cleanly |

PLAN.md's "three games back to back, one command typed" is the `CONTINUE` path
plus, at match end, `NEW`.

### 8.3 What `endCurrentGame` tears down — the bridge's reset list

From src:`…/match/HostedMatch.java:369-407`, in order: `game = null`; per human
controller, detach the `GameEventForwarder` for remote guis, `setGameSpeed(PlaybackSpeed.NORMAL)`,
`getYieldController().clearAutoYields()`, `getGui().afterGameEnd()`,
`updateDayTime(null)`; then **`humanControllers.clear()`**.

So after a game ends, `HostedMatch.getHumanControllers()` is empty and
`getGame()` is null. Anything the bridge cached must be rebuilt. `openView(...)`
(jar, abstract on `IGuiGame`; report 07 §4.1) runs again at the start of the next
game and is the natural reset hook.

**Reset checklist for `WireGuiGame` / `MtgTable`:**

| thing | why |
|---|---|
| `CardView` / `SpellAbilityView` / `PlayerView` id indexes (report 07 §9) | every view object is new; a stale index resolves an `act` to a dead card |
| the §3.3 phase-stop map | keyed by player id, but reseed from prefs so a per-game toggle really is per game (or deliberately carry it over — decide and write it down) |
| the §5.2 `yieldKey` handle tables | keys embed card ids from the finished game |
| `ReplyPool` — `cancelAll()` | any `ask` outstanding when the game ended must complete `null` (protocol §5.2) |
| `gameId`, both `seq` counters, the frame-log file | protocol §8: one `frames.jsonl` per game, line 0 a session header |
| the "game over" latch and the `over` body | `state.gameOver` must go back to `null` |
| the `GameEventForwarder` registration | we register it by hand (CLAUDE.md rule 3); re-register against the new `Game` |
| **not** the WebSocket, **not** `FModel`, **not** the card DB | the point of the feature is not paying `FModel.initialize` (~2,033 ms) again |

Emit a fresh `hello_ok` after the new `openView`: `gameId` changed, the players
are new objects, and the client's whole id space is invalid. (Alternative: a
`reset` frame. `hello_ok` already carries every field needed and the client
already handles it; prefer it — §10 P7.)

---

## 9. AI profiles and difficulty (the deferred item, specified)

PLAN.md keeps the AI difficulty picker deferred (open question 8, default "stays
deferred"). This section is so that the deferral is a decision rather than a
gap.

**There are four profiles, and they are text files.**
`/home/justin-a/forge/res/ai/{Cautious,Default,Experimental,Reckless}.ai`,
326–333 lines each, `KEY=VALUE` with comments — e.g. `MULLIGAN_THRESHOLD=4`,
`PLAY_AGGRO=false`, `CHANCE_TO_ATTACK_INTO_TRADE=0` in `Default.ai:1-20`.
122 keys are defined by the `AiProps` enum (jar).

**They are already loaded.** `FModel.initialize` calls
`AiProfileUtil.loadAllProfiles(ForgeConstants.AI_PROFILE_DIR)`
(src:`…/model/FModel.java:273`; `AI_PROFILE_DIR = RES_DIR + "ai" + PATH_SEPARATOR`,
`…/properties/ForgeConstants.java:99`). Our `forge-home/res` symlink means this
resolves into the user's real `res/` **read-only** — which is fine and is what
`check-forge.sh` already assumes.

**The picker's list** is `AiProfileUtil.getProfilesDisplayList()` (jar) =
`["Random (Every Match)", "Random (Every Game)"] + getAvailableProfiles()`
(src:`…/ai/AiProfileUtil.java:159-190`), where the latter is the `.ai` filenames
minus the extension.

**The call.**

```java
// jar: forge.player.GamePlayerUtil
public static LobbyPlayer createAiPlayer(String name, int avatarIndex, int sleeveIndex,
                                         Set<AIOption> options, String profileOverride);
```

**Always pass a non-empty `profileOverride`.** The else-branch
(src:`…/player/GamePlayerUtil.java:77-89`) reads `FPref.UI_CURRENT_AI_PROFILE`
(default `"Default"`), and if the value is not in the display list it *writes and
saves* the preferences file. Passing the override skips that entirely
(`:90-92`), then `player.setAiProfile(profile)` (`:96`). Handle the two "Random"
entries ourselves: `AI_PROFILE_RANDOM_DUEL` → `setRotateProfileEachGame(true)`,
`AI_PROFILE_RANDOM_MATCH` → resolve once with `AiProfileUtil.getRandomProfile()`
— i.e. copy `:85-88`.

**"Difficulty" is our word, not Forge's.** A picker would compose three knobs:

| knob | values | effect |
|---|---|---|
| profile | `Cautious` / `Default` / `Reckless` / `Experimental` | 122 heuristic constants |
| `Set<AIOption>` | `USE_HYBRID_SIMULATION`, `USE_FULL_SIMULATION` (jar, the whole enum) | turns on the simulating AI — much stronger, much slower |
| `FPref.MATCH_AI_TIMEOUT` | default `"5"` (seconds); read once into `game.AI_TIMEOUT` at `HostedMatch:164` | caps AI thinking |

If it ever ships, it belongs in `hello_ok`/config, not in a mid-game `act`:
`createAiPlayer` runs before `startMatch`, so changing it means a `restartMatch`
(§8.2). Record that as the reason it is *after* M6, not during.

---

## 10. Protocol additions M6 needs — the diff to apply **before M3 ships**

M6's wire needs are small, and every one of them is an added field inside a
`body`, which protocol.md §1 says is not a `v` bump. Adding them now — while M3
is being written — costs nothing; adding them later means touching a frozen
reducer and invalidating fixtures. **Recommendation: apply P1–P7 to
`docs/protocol.md` before M3, implement them in M6.**

| # | section | change | why |
|---|---|---|---|
| **P1** | §3 `state` | `players[].phaseStops: [PhaseType…]` — the phases at which *this player's turn* stops for the viewer | §3.4. Server-owned; the client never derives it |
| **P2** | §3 `state` | `yield: {kind:"endOfTurn"\|"stack"\|"marker", playerId, phase} \| null` and `autoPassNoActions: bool` | §4.4. From `YieldController.getAutoPassUntilMarker()` / `autoPassUntilEndOfTurn()` / `autoPassUntilStackEmpty()`, so the phase strip can draw the marker |
| **P3** | §3.1 `stack[]` | add `yieldKey` (opaque string or `null`), `isAbility`, `isOptionalTrigger`, `yielded` (from `shouldAutoYield(rawKey)`) | §5.3. `yieldKey` is a **bridge-minted handle**, never `SpellAbility.yieldKey()` itself; the client must not render it |
| **P4** | §2.2 `act` | add `passPriority {}`; add `yieldTo {kind, playerId?, phase?}`; add `newGame {mode:"continue"\|"new"\|"quit"}` alongside the existing `nextGame` (or redefine `nextGame` to take `mode`) | §4.3, §4.4, §8.2 |
| **P5** | §3 `state` | `undo: {can, depth}` | §7.3. `canUndoLastAction()` + `MagicStack.getUndoStackSize()`, both game-thread reads |
| **P6** | §2.2 `act` | **amend** `setYield` to `{yieldKey, mode}` (report 07 A6); **amend** `useMana` to `{color}` only — a `cardId` is a `clickCard` | §5.3, §6.2 |
| **P7** | §2.1 `hello_ok` | state that a **new `hello_ok` is emitted at the start of every game in a match**, and that receiving one invalidates all cached ids | §8.3 |

Also fold in, from report 07, the two amendments M6 depends on:
**A8** (`input.weak[]`, needed for the Auto-tap preview, §6.1) and
**A6** (`passPriority`, now confirmed present in the jar, §4.3).

And one clarification that is not a schema change: protocol.md §4's `buttons`
object should name the third flag the engine sends —
`updateButtons(owner, label1, label2, enable1, enable2, focus1)` (jar) — as
`buttons.focus: "ok"|"cancel"|null`. Report 07 §6.5 already carries `focus1`; the
protocol should say so, because §11's "space = the focused button" depends on it.

**Nothing here needs a `v` bump, and nothing here is a new message type.**

---

## 11. Forge's own keyboard shortcuts

All defaults read out of the jar (`javap -c 'forge…$FPref'`, identical to
src:`…/properties/ForgePreferences.java:330-349`). The values are AWT
`KeyEvent.VK_*` codes, space-separated, modifier first — `17` = Ctrl, `16` =
Shift. `KeyboardShortcuts.attachKeyboardShortcuts` binds them into the Swing
`InputMap` (src:`…/control/KeyboardShortcuts.java:62-296`); they are a *desktop*
binding, not an engine feature, so mirroring the defaults is about muscle memory,
nothing more.

| `FPref` | default | keys | action (src line) | our binding |
|---|---|---|---|---|
| `SHORTCUT_UNDO` | `17 90` | Ctrl+Z | `getGameController().undoLastAction()` (`:109-116`) | **yes** — §7 |
| `SHORTCUT_CONCEDE` | `17 81` | Ctrl+Q | `matchUI.concede()` (`:119-126`) | **yes**, but routed to `IGameController.concede()` (§8.1) |
| `SHORTCUT_ENDTURN` | `17 69` | Ctrl+E | `YieldController.endTurn(ctrl, currentPlayer)` (`:129-136`) | **yes** — §4 |
| `SHORTCUT_ALPHASTRIKE` | `17 65` | Ctrl+A | `getGameController().alphaStrike()` (`:139-146`) | **yes** (M5 already has the act) |
| `SHORTCUT_AUTOYIELD_ALWAYS_YES` | `89` | Y | trigger `ACCEPT` + `setShouldAutoYield` on the stack top (`:159-174`) | **yes** — §5 |
| `SHORTCUT_AUTOYIELD_ALWAYS_NO` | `78` | N | trigger `DECLINE` + `setShouldAutoYield` (`:177-192`) | **yes** — §5 |
| `SHORTCUT_YIELD_AUTO_PASS` | `80` | P | `YieldController.toggleAutoPassOrStopAll(ctrl)` (`:262-270`) | **optional** — it flips `FPref.YIELD_AUTO_PASS_NO_ACTIONS` **and saves** (`YieldController:431-439`). If we bind it, call `clearActiveYieldAndDispatch()` for the "stop everything" half only, or push the pref through `setYieldPref` instead of the static helper |
| `SHORTCUT_YIELD_OPTIONS` | `17 89` | Ctrl+Y | opens `VYieldSettings` | **no** — no settings dialog in v1 |
| `SHORTCUT_SHOWSTACK` / `SHOWCOMBAT` / `SHOWCONSOLE` | `83` / `67` / `76` | S / C / L | focus a docked tab | **no** — our board shows all three at once |
| `SHORTCUT_CARD_ZOOM` | `90` | Z | zoom the hovered card | **worth it in M4/M6** — pure client |
| `SHORTCUT_SHOWTARGETING` | `84` | T | toggle the targeting-arrow overlay | **worth it** — M5 already draws arrows |
| `SHORTCUT_SHOWHOTKEYS` | `72` | H | the hotkey dialog | **yes** — a static help overlay, cheap and it makes the rest discoverable |
| `SHORTCUT_SHOWDEV` `68`, `MACRO_*` `16 82` / `16 50` / `16 51`, `PANELTABS` `17 84`, `CARDOVERLAYS` `17 79` | | D, Shift+R/2/3, Ctrl+T, Ctrl+O | dev mode, macros, layout | **no** |

**Space and Escape are not Forge shortcuts.** PLAN.md M6 lists "space = OK/pass,
Esc = cancel"; on the desktop those come from Swing button focus —
`updateButtons(..., focus1)` decides which button has it. So: bind Space to the
focused button (P7's `buttons.focus`), falling back to `passPriority` (§4.3,
which is a no-op unless a priority prompt is up), and Escape to `buttonCancel`.
Document them as *our* conventions, consistent with Forge's behaviour rather than
copied from a pref.

The localized descriptions are in the installed
`res/languages/en-US.properties` (`lblSHORTCUT_UNDO` `:526` … `lblSHORTCUT_YIELD_AUTO_PASS`
`:1719`) — use them verbatim for the help overlay so the browser and the desktop
call the same key the same thing.

---

## 12. The M6 plan, evening by evening

Two evenings, as budgeted. The split is deliberate: **evening 1 ships everything
that needs no new protocol**, so if the evening runs out there is still a
strictly better game; **evening 2 adds the four `state` fields and two acts** from
§10 and the UI they feed.

### Evening 1 — render what the engine already sends

*No protocol changes, no reducer changes beyond labels.*

1. **Button labels, honestly.** Audit the M5 prompt panel: `buttons.ok.label` and
   `buttons.cancel.label` must be rendered verbatim, including `Auto`,
   `Undo (3)`, `End Turn`, `Accept`/`Decline`. If M5 hardcoded "OK"/"Cancel",
   this is the whole fix and it delivers Auto Pay (§6) and Undo/End-Turn (§7,
   §4) at once. *Checkpoint: cast a spell, see the button say `Auto`; tap a land
   in Main 1, see it say `Undo (1)`.*
2. **Concede, safely.** `act: concede` → EDT →
   `getOriginalGameControllers().forEach(IGameController::concede)`. Reachable
   from every UI state, including mid-`ask` (protocol §5.2 invariant 6) and
   during a mulligan. Browser confirm dialog, never an engine one.
   *Checkpoint: concede from the mulligan prompt; the game ends, no hang.*
3. **New Game / Next Game.** `act: nextGame {mode}` → `nextGameDecision(CONTINUE|NEW|QUIT)`.
   Implement the §8.3 reset list and a fresh `hello_ok` from `openView`.
   *Checkpoint — this is the M6 deliverable: `./scripts/play.sh`, then three
   games back to back without touching the terminal, `var/games/` holding three
   complete `frames.jsonl` files.*
4. **Keyboard map** for the subset that needs no new act: Ctrl+Z, Ctrl+Q, Ctrl+A,
   Space, Escape, H (help overlay), Z, T (§11).
5. **Error toasts.** `notice` is already specified (protocol §6); make sure
   `UNIMPL` and `flashIncorrectAction` actually surface as toasts rather than
   console lines. Mana pips (`players[].manaPool`) while in the area.

### Evening 2 — the toggles

*Apply §10 P1–P6 to `docs/protocol.md` first (ideally already done before M3),
then Java, then TypeScript — CLAUDE.md's order.*

6. **Phase stops.** `WireGuiGame.isUiSetToSkipPhase` over the §3.3 map, seeded in
   `openView`, mutated by `setPhaseStop`, mirrored to the controller with
   `YieldUpdate.SkipPhase`. `state.players[].phaseStops` (P1). Phase-strip cells
   become toggles. *Checkpoint: untick Declare Blockers on the AI's turn and the
   game stops asking; the defaults in §3.2 reproduce Forge's out-of-box feel.*
7. **Pass To.** `act: yieldTo` (P4) → `YieldController.endTurn` /
   `handleYieldMarkerToggle` / `StackYield`. `state.yield` (P2) draws the
   fast-forward glyph. Cancel is the existing `buttonCancel` — verify the
   "Yielding until …" prompt renders and its Cancel works before adding any
   buttons of our own. *Checkpoint: "pass to my next turn" from the AI's upkeep
   lands on our upkeep; clicking Cancel mid-yield hands priority straight back.*
8. **Auto-yield.** `stack[].yieldKey|isAbility|isOptionalTrigger|yielded` (P3),
   the handle table (§5.2), `act: setYield {yieldKey, mode}` (P6), Y/N bound.
   Test on the deck's repeating triggers. *Checkpoint: "Always Yes" on an
   attacks-alone trigger stops the prompt for the rest of the game and the
   ability still resolves.*
9. **Undo, explicitly.** `state.undo {can, depth}` (P5) and a real Undo button
   next to the engine-labelled Cancel.
10. **Regression.** Ten games (the M5 criterion) with every toggle exercised;
    `grep UNIMPL var/*.log` still empty; the M1 redaction checker still passes —
    and extend it with one line: **no `state.stack[].yieldKey` value may contain
    a space or a `(`**, which is a cheap proof that a raw `SpellAbility.yieldKey()`
    never reached the wire.

### Explicitly out of scope for M6

The Yield Settings dialog and its `YIELD_INTERRUPT_*` / `YIELD_DECLINE_SCOPE_*` /
`YIELD_SUPPRESS_*` prefs (a 15-pref settings screen for a single-player game);
yield *suggestions* (`SuggestionType`, `DeclineScope` — default `NEVER`, leave
them there); `setDisableAutoYields` / `setDisableAutoTriggers`; macros; the
`INSTALL`-tier persistent auto-decision store; the AI profile picker (§9,
deferred); `drawOfferAction`; `PlaybackSpeed` controls.

---

## 13. Verified vs inferred

**Verified against the 2.0.14 jar (`javap`).** `IGameController`'s 29 members
including `passPriority`; `PlayerControllerHuman.canUndoLastAction` /
`undoLastAction` / `tryUndoLastAction` / `passPriority` / `concede` /
`mayAutoPass` / `autoPassUntilEndOfTurn` / `autoPassCancel` / `setShouldAutoYield`
/ `setTriggerDecision` / `applyYieldUpdate` / `setYieldPref` / `getYieldController`;
`YieldController`'s full public surface (48 members including the constructor); `AutoYieldStore` + `Tier` + `TriggerDecision`;
all eleven `YieldUpdate` records (confirmed present as class entries in the jar);
`YieldMarker`, `DeclineScope`, `SuggestionType`, `NextGameDecision`;
`HostedMatch.restartMatch/continueMatch/startGame/endCurrentGame/getHumanControllers/getMatch/getGame`;
`MagicStack.canUndo/undo/getUndoStackSize/clearUndoStack`; `GameSnapshot`;
`StackItemView.getKey/isAbility/isOptionalTrigger/getActivatingPlayer`;
`SpellAbilityView`'s complete surface (no key); `SpellAbility.yieldKey`;
`GameView.peekStack/getPlayerTurn/getPhase/isMatchOver`;
`IGuiGame.isUiSetToSkipPhase` (abstract), `updateButtons` (both overloads),
`setWeaklySelectable`, `afterGameEnd`, `setGameSpeed`;
`AbstractGuiGame.getGameController(×2)/getOriginalGameControllers/updateAutoPassPrompt/handleYieldMarkerToggle`;
`AbstractPreferences.setPref/getPref/save`; `IPreferences.getPrefBoolean`;
`PhaseType`'s 13 constants and `nameForUi`; `GamePlayerUtil`'s nine
`createAiPlayer` overloads; `AiProfileUtil`; `AIOption`'s two constants;
`LobbyPlayerAi.setAiProfile/setRotateProfileEachGame`; **and every `FPref`
default quoted in §3.2 and §11**, read out of the enum's static initializer with
`javap -c`. The bytecode of `PlayerControllerHuman.passPriority()` and
`useMana(byte)` was disassembled directly.

**Verified against the installed 2.0.14 resources.** `res/ai/` contains exactly
four `.ai` files; `res/languages/en-US.properties` contains `lblAuto` (503),
`lblUndo` (456), `lblEndTurn` (458), the three `lblYieldingUntil*` strings
(1678-1680) and all twelve `lblSHORTCUT_*` descriptions — i.e. the whole
advanced-yield feature set ships in the version we run, not only in the newer
source.

**Read as prose from the 2.0.15 source checkout** (call sites and intent, never
copied): `CMatchUI.isUiSetToSkipPhase` / `actuateMatchPreferences` /
`writeMatchPreferences`; `NetworkGuiGame.pushSkipPhaseToControllers` /
`seedYieldStateOnHost`; `InputPassPriority.showNormalPrompt/onOk/onCancel`;
`InputPayMana.onOk/updateButtons/updateMessage/ensureAutoPayManaSources`;
`InputLockUI.selectButtonCancel`; `PlayerControllerHuman.chooseSpellAbilityToPlay`
/ `skipsPromptForStackOrPhase` / `confirmTrigger` / `tryAutoPassNow`;
`MagicStack.recordUndoableActions`; `PhaseHandler:154`; `HostedMatch.addNextGameDecision`;
`GamePlayerUtil.createAiPlayer`; `KeyboardShortcuts`; `docs/Advanced-Yield-Options.md`.
**Known drift observed in this pass:** `IGameController.passPriority()` is in the
jar and *not* in the checkout, so the checkout is a sibling branch, not simply a
later one — one more reason the jar is authoritative.

**Inferred, to confirm at M6 runtime.**

1. That `WireGuiGame` never satisfies `PlayerControllerHuman.isRemoteClient()`
   (it is `gui instanceof RemoteClientGuiGame`, and ours is not) — near-certain,
   but it is the premise of finding 3. Assert it once at startup.
2. That seeding the phase-stop map in `openView` is early enough. `openView` runs
   before the game thread exists (report 07 §4.1) and `isUiSetToSkipPhase` is
   first asked at the first priority pass; safe by construction, but log the seed.
3. That an interned `yieldKey` handle stays valid for a whole game — it must,
   since `StackItemView` keys are derived from a card id that is stable for the
   life of the game (protocol §3.2), but a token that stops matching would show
   up as an auto-yield that silently stops working.
4. The exact behaviour of a marker set on a phase that is *also* a stop. Forge's
   `handleYieldMarkerToggle` un-skips the cell first, which is why we must pass
   the "make it a stop" runnable; verify with the AI's end step.
5. That `nextGameDecision(CONTINUE)` alone drives `continueMatch()` with a single
   human controller (`nextGameDecisions.size() < humanControllers.size()` at
   `HostedMatch:550`). One human, one vote — but `humanControllers` has just been
   cleared by `endCurrentGame` in the `QUIT` path, so check the ordering live.
6. Whether phase stops should persist across games of one match. Forge's do (the
   labels live on the match UI). Our §8.3 list says reseed; pick one, write it in
   `DECISIONS.md`, and do not let it be an accident.

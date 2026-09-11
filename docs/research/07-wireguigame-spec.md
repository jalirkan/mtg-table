# 07 — `WireGuiGame` implementation spec (M2)

Status: implementation spec, 2026-09-11. Scope: everything needed to write
`bridge/src/mtgtable/WireGuiGame.java`, `ReplyPool.java`, `Transport.java` and
`ConsoleTransport.java` without further research.

Basis: `docs/research/05-architecture-synthesis.md` (the spec), `docs/protocol.md`
(the wire contract), `CLAUDE.md` (the nine hard rules).

**Evidence convention.** `jar:` = `javap` against
`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`
(authoritative — this is what we compile and run against). `src:` = the
2.0.15-SNAPSHOT source checkout at
`<scratch>/forge-src/…`, cited `file:line`, used **only** to learn call sites and
intent (CLAUDE.md: "treat forge-src as prose"). Everything marked *inferred* is
reasoning, not a measurement.

---

## 0. Executive summary — the eight things that change the plan

1. **There is a 37th abstract member.** `AbstractGuiGame` declares
   `protected abstract void updateCurrentPlayer(PlayerView)` (jar: `javap
   forge.gamemodes.match.AbstractGuiGame` → the only `abstract` line in the class).
   It is not in `IGuiGame`, so the name-level diff in synthesis §0 missed it. The
   class will not compile without it. §3 row 37.
2. **`openZones` and `tempShowZones` are not questions.** They mean "open a
   floating zone viewer and tell me which ones you opened so I can close them"
   (src: `forge-gui-desktop/src/main/java/forge/screens/match/CMatchUI.java:1362-1386`
   — `openZones` builds a list, calls `tempShowZones`, returns it;
   `restoreOldZones` is literally `hideZones`). `RemoteClientGuiGame` makes them
   blocking only because a *remote* client must do the opening. **Delete the
   `open_zones` ask kind** (protocol.md §5.1) — it is a `state`/`input` hint plus
   an identity return. That leaves **11 ask kinds covering 12 methods**, not 12
   covering 15.
3. **`tempShowZones` and `openZones` are called on the EDT.** `tempShowZones` at
   src:`forge-gui/src/main/java/forge/gamemodes/match/input/InputSelectEntitiesFromList.java:65-68`
   and src:`forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:956-959`
   are inside `FThreads.invokeInEdtNowOrLater`; `openZones` at
   src:`forge-gui/src/main/java/forge/gui/control/FControlGameEventHandler.java:127`
   runs inside the `processEvents` runnable that line 163 posts with
   `invokeInEdtLater`. **A value-returning method that blocks on the EDT stalls
   every prompt.** Hence the hard rule in §2.4: *only the game thread may block.*
4. **`handleGameEvents` can fire off the game thread.** We register our
   `GameEventForwarder` as an `InputQueue` observer; `InputQueue.updateObservers()`
   is called from `setInput` (game thread) **and** from `removeInput`/`clearInputs`
   (src:`…/input/InputQueue.java:65,79,101`), and `removeInput` is reached from
   `InputSyncronizedBase.stop()` (src:`…/input/InputSyncronizedBase.java:51-53`),
   which runs on whatever thread delivered the click. Forge's own comment
   ("all on the game thread", src:`forge-gui/src/main/java/forge/gui/control/GameEventForwarder.java:15`)
   is wrong for that path. `WireGuiGame.handleGameEvents` must therefore **buffer
   instead of snapshotting when `!ThreadUtil.isGameThread()`** (§4.2).
5. **`OrderResult` is `(List<T> ordered, boolean rememberDecision)`** (jar:
   `javap 'forge.gui.interfaces.IGuiGame$OrderResult'`), not top/bottom.
   protocol.md §5.1's `{top, bottom}` answer shape is wrong. And **`order` must
   never return `null`**: src:`forge-gui/src/main/java/forge/gui/interfaces/IGuiGame.java:229,232`
   and src:`…/player/PlayerControllerHuman.java:2317` all call `.ordered()`
   unguarded. §6.7 gives the exact non-null default.
6. **`getChoices` must never return `null`** either:
   src:`…/match/AbstractGuiGame.java:767` (`choice.isEmpty()`) and `:780-781`
   (`assert choice.size()==1; choice.get(0)`).
7. **`T` in `getChoices` / `order` is frequently *not* a view object** — it is
   `MagicColor.Color` for `chooseColors` (src:`…/PlayerControllerHuman.java:1963`),
   `SpellAbilityView` for modal spells (`:1936-1938`), `Integer`/`String` for
   `getInteger` (src:`AbstractGuiGame.java:805-834`), `PaperCard`, `CostPart`,
   `CardRules`, `ReplacementEffectView`. There is no usable Forge id. Ask options
   must therefore be addressed by **ask-local index** (§6.1, amendment A3).
8. **With `isLibgdxPort() == false`, almost every yes/no goes through `InputConfirm`
   (the `input` path), not `IGuiGame.confirm`.** Every direct `getGui().confirm(...)`
   call site is guarded by `if (getGui().isLibgdxPort())`
   (src:`…/PlayerControllerHuman.java:819, 1480, 1875, 2065`;
   `…/HumanCostDecision.java:1521`; `…/input/InputConfirm.java:69`). So **M2's
   console client must implement the `input` path first**; the `ask` path is
   secondary. This is the single biggest scheduling fact in this document.

---

## 1. Amendments to `docs/protocol.md` required before coding

I did not edit `docs/protocol.md` (another workflow owns it). These are the diffs.

| # | Section | Change | Why |
|---|---|---|---|
| **A1** | §5.1 | **Delete the `open_zones` row.** `openZones`/`tempShowZones` become no-op-ish pushes with a documented return. | §0.2 — they are not questions. |
| **A2** | §5.1 `order` | Extra body becomes `{prompt, destLabel, source:[opt], dest:[opt], remainingMin, remainingMax, referenceCardId, sideboardMode, showRemember}`; answer becomes `{"ordered":[i…], "remember":bool}`. | jar: `OrderResult(List,boolean)`. |
| **A3** | §5.1 (all kinds) | `options[].id` is the **0-based index into the server-side option array for that `askId`**, not a Forge id. Options additionally carry optional `cardId` / `playerId` / `abilityId` for board linking. | §0.7 — `T` is generic; `Integer 3` and `CardView 3` would collide. |
| **A4** | §5.1 `assign_damage` | `targets[].id` is the index; the *defender* is a synthetic option with `"defender": true` and `playerId`/`cardId`. Answer `{"<index>": n}`. Index → `null` key for the defender when marshalling back. | src:`PlayerControllerHuman.java:305-311` — key `null` or id `-1` means the defender. |
| **A5** | §5.1 `assign_amount` | Keys may be `GameEntityView` **or** `MagicColor.Color` (src:`IGuiGame.java:151-152` comment). Options carry `kind:"entity"\|"color"`; answers stay indices. | Generic `Map<Object,Integer>`. |
| **A6** | §2.2 | `setYield` cannot be expressed with a `cardId`: `IGameController.setShouldAutoYield(String key, boolean, boolean)` takes `SpellAbility.yieldKey()` (jar). Either add `yieldKey` to `state.stack[]` / `input`, or defer `setYield` to M6. Also add `passPriority` — `IGameController.passPriority()` exists and is **not** the same as `selectButtonOk`. | jar: `javap forge.interfaces.IGameController`. |
| **A7** | §5 | Add `reveal: true` to `choose_list` when `min < 0` (Forge's "just show this" call, src:`AbstractGuiGame.java:787` uses `getChoices(msg,-1,-1,items)`). The client shows an OK; the answer is ignored. | Otherwise a reveal renders as an impossible "pick −1 cards". |
| **A8** | §4 | `input` gains `weak: [cardIds]` (from `setWeaklySelectable`; jar/`AbstractGuiGame.java:385-406`: duplicates accumulate, count 2 = "Auto would tap it"). Optional for M2, needed for M5 mana payment. | — |

---

## 2. The thread model, corrected and made precise

### 2.1 The five threads

| Name | Created by | `ThreadUtil.isGameThread()` | `IGuiBase.isGuiThread()` |
|---|---|---|---|
| `main` | JVM | false | false |
| `Game-<n>` | Forge's `gameThreadPool` | **true** | false |
| `mtg-table-EDT` | us (single-thread executor) | false | **true** |
| `mtg-table-io` | us (console reader) / netty `nioEventLoop` | false | false |
| `mtg-table-log` | us | false | false |

`ThreadUtil.isGameThread()` is `Thread.currentThread().getName().startsWith("Game")`
(src:`forge-core/src/main/java/forge/util/ThreadUtil.java:51-53`; the pool factory
names threads `"Game-" + n` at `:19,25`). **Therefore no thread we create may have
a name beginning with `Game`** — `mtg-table-*` prefixes are mandatory, not
cosmetic. Note also `FThreads.invokeInBackgroundThread` deliberately names its
threads `"Game BT<n>"` (src:`forge-gui/src/main/java/forge/gui/FThreads.java:55-61`)
so they *count as* game threads.

`FThreads.assertExecutedByEdt` short-circuits when `GuiBase.isNetPlay(null)` is
true (src:`FThreads.java:15-24`), which resolves to `IGuiBase.hasNetGame()`. **Keep
`hasNetGame()` returning `false` and leave `isNetGame()` inherited-false**, so the
assert stays live — it is our best mulligan-time canary (CLAUDE.md rule 2).

### 2.2 Where the game thread comes from

`HostedMatch.startGame()` runs `openView` on **the caller's thread** (src:
`forge-gui/src/main/java/forge/gamemodes/match/HostedMatch.java:260-262`) and only
then hands the match to the game thread at `:283` (`game.getAction().invoke(...)`
→ `ThreadUtil.invokeInGameThread` when not already on one, src:
`forge-game/src/main/java/forge/game/GameAction.java:2528-2534`).

**Consequence: `openView` is neither the game thread nor the EDT.** Register
observers there; do **not** call `Snap.state()` there.

### 2.3 Where the EDT comes from

`InputQueue.setInput` (game thread) → `updateObservers()` → `InputProxy.update`
→ `FThreads.invokeInEdtLater(showMessage)` → `Input.showMessageInitial()` →
`Input.showMessage()` (src:`…/input/InputProxy.java:56-74`). Everything an
`Input.showMessage()` body touches — `showPromptMessage`, `updateButtons`,
`showCombat`, `setCard`, `alertUser` — is therefore **EDT**.

A second EDT source: `AbstractGuiGame.awaitNextInput()`'s 250 ms `Timer` →
`invokeInEdtLater` → `updatePromptForAwait` → `showPromptMessage` + `updateButtons`
(src:`AbstractGuiGame.java:534-583`). A third: `FControlGameEventHandler.processEvents`
(src:`…/control/FControlGameEventHandler.java:54-163`), which Forge registers for
us because our GUI is not a `RemoteClientGuiGame` (src:`HostedMatch.java:231-233`).
That handler is where `finishGame()`, `showCombat()`, `updateShards()` and the
end-of-game `showPromptMessage("")`/`updateButtons(…,false,false,false)` come from
(`:104, 145-149`). **Keep it** — it is the only source of `finishGame()`.

### 2.4 Where the *click* thread comes from — the correction

`IGameController.selectCard/selectPlayer/selectButtonOk/selectButtonCancel` are
called by **us**, from whatever thread we choose. They run straight into
`InputProxy` → `InputBase.onCardSelected/onOk/onCancel` → arbitrary Forge model
code and, via `stop()`, into `InputQueue.removeInput` → observers. So:

- `flashIncorrectAction()` (src:`…/input/InputAttack.java:173`, inside
  `onPlayerSelected`) is on **our click thread**, not the EDT.
- `showCombat()` (src:`InputAttack.java:361`) is reached both from `showMessage`
  (EDT) and from `onCardSelected` (click thread).
- `hideZones()` / `clearSelectables()` (src:`InputSelectEntitiesFromList.java:168-173`,
  inside `onStop`) are on the click thread.
- `showManaPool()` (src:`…/input/InputPayMana.java:63`, in the constructor) is on
  the **game thread**.

**Decision: dispatch every `act` on the virtual EDT** (`FThreads.invokeInEdtNowOrLater`),
matching desktop Forge exactly. Reasons: (a) `InputBase.finished` is a plain
non-volatile field written by `stop()` via `invokeInEdtNowOrLater(this::setFinished)`
and read by `selectCard`/`selectButtonOk` — desktop is safe only because both ends
are the EDT; (b) it serialises clicks against prompt rendering for free.
**Answers to an `ask` are still delivered on `mtg-table-io`**, never on the EDT
and never on the game thread — synthesis §2.3 rule 3 stands, because delivering an
answer only completes a future, while an `act` runs Forge rules code.

### 2.5 The three rules that fall out

> **R1 — Push methods may touch only `getId()` on a view.**
> `TrackableObject.getId()` is `public final int` reading a field (jar). Every
> other accessor (`getName`, `getZone`, `getCurrentState`, …) goes through
> `get(TrackableProperty)`, which the `Tracker` javadoc declares game-thread-only
> (`forge-game/src/main/java/forge/trackable/Tracker.java:26-32`). Push methods run
> on four different threads (§2.4), so **ids and the scalars Forge handed us are
> all they may serialise**. Everything else comes from `Snap.state()`.

> **R2 — Only the game thread may block.**
> Every value-returning override starts with
> `if (!ThreadUtil.isGameThread()) return <local default>;`. This is what stops
> `openZones`-on-the-EDT (§0.3) from freezing the prompt pipeline.

> **R3 — No thread we create may be named `Game*`.**
> `mtg-table-EDT`, `mtg-table-io`, `mtg-table-log`. See §2.1.

---

## 3. The 37 members — the implementation table

Columns: **Thread** = observed call sites; **Blocks** = does the game thread wait
on a value; **Frame** = `docs/protocol.md` mapping; **Null/timeout default** =
what to return when the reply pool yields `null`; **Fires?** for
`decks/pacho-shield.dck` (40 cards, W/U creatures + auras + one modal spell + two
"Thriving" lands + one landcycler; see §3.3 for the per-card evidence).

Signatures are exactly as `javap` prints them, abbreviated by dropping
`java.lang.`, `java.util.` and the `forge.…` package prefixes.

### 3.1 Fire-and-forget pushes (20)

| # | Signature | Thread | Frame | Default | Fires? |
|---|---|---|---|---|---|
| 1 | `void openView(TrackableCollection<PlayerView>)` | **caller of `startMatch`** (`HostedMatch.java:260-262`) | none — this is the wiring hook (§4.1) | n/a | **certain** (once) |
| 2 | `void showPromptMessage(PlayerView, String, CardView)` | EDT (`InputBase.java:126-128`, `InputLockUI.java:75`, `AbstractGuiGame.java:576,579,706`, `FControlGameEventHandler.java:145`) | `input.prompt`, `input.focusCardId = card==null?null:card.getId()` | n/a | **certain** |
| 3 | `void updateButtons(PlayerView, String, String, boolean, boolean, boolean)` | EDT (`InputLockUI.java:64`, `InputConfirm.java:108`, `InputSelectTargets.java:133-147`, `InputSelectManyBase.java:98`, `InputPassPriority.java:155,171,174`) | `input.buttons` (`label1/enable1` = ok, `label2/enable2` = cancel, `focus1` = focusOk) | n/a | **certain** |
| 4 | `void showCombat()` | **either** — EDT (`FControlGameEventHandler.java:104`, `InputBlock.java:90`) and click thread (`InputAttack.java:361`) | no-op (combat lives in `state.combat`) | n/a | **certain** |
| 5 | `void alertUser()` | EDT (`InputPassPriority.java:159,177`) | `notice{level:"info",title:"Your turn"}` or a console bell; may be suppressed | n/a | **certain** |
| 6 | `void flashIncorrectAction()` | **click thread** (`InputAttack.java:173`) | `notice{level:"warn",title:"Illegal action"}` | n/a | **likely** |
| 7 | `void message(String msg, String title)` | any (`HostedMatch.java:472,504`; `HumanCostDecision.java:1453`; `BasicMacroSystem.java:54…`) | `notice{level:"info",title,text}` | n/a | **likely** |
| 8 | `void showErrorDialog(String msg, String title)` | any (`PlayerControllerHuman.java:270,2919`; `AbstractGuiGame.java:457`) | `notice{level:"error"}` | n/a | rare |
| 9 | `void finishGame()` | EDT (`FControlGameEventHandler.java:149`) | `over{winner,reason,matchOver}` — read from `getGameView().getOutcome()`; **`getGameView()` walk is off the game thread, so cache the outcome from the `GameEventGameOutcome` event instead** (§4.3) | n/a | **certain** (once) |
| 10 | `void showManaPool(PlayerView)` | game thread (`InputPayMana.java:63`, ctor) | `input.manaPoolOpen = true` (cosmetic) | n/a | **likely** (Thriving lands float mana) |
| 11 | `void hideManaPool(PlayerView)` | **click thread** (`InputPayMana.java:76`, in `onStop`) | `input.manaPoolOpen = false` | n/a | **likely** |
| 12 | `void hideZones(PlayerView, Iterable<PlayerZoneUpdate>)` | **click thread** (`InputSelectEntitiesFromList.java:170`) and EDT (`PlayerControllerHuman.java:966`) | `input.openZones` shrinks. **Must tolerate a `null` second argument.** | n/a | **likely** |
| 13 | `void restoreOldZones(PlayerView, PlayerZoneUpdates)` | game thread (`TargetSelection.java:190`) | same as `hideZones`; tolerate `null` | n/a | rare |
| 14 | `void setCard(CardView)` | EDT (`InputSelectTargets.java:86`, `FControlGamePlayback.java:123,133`) and game thread (`PlayerControllerHuman.java:701,1057,1093,1413`) | `input.focusCardId = card.getId()` | n/a | **certain** |
| 15 | `void setPanelSelection(CardView)` | game thread (`PlayerControllerHuman.java:482,858,902,915`) | `input.focusCardId` (same channel as 14) | n/a | **likely** |
| 16 | `void enableOverlay()` | — | no-op + `UNIMPL` | n/a | **never** (only `QuestDraftUtils.java:271,313`) |
| 17 | `void disableOverlay()` | — | no-op + `UNIMPL` | n/a | **never** (`QuestDraftUtils.java:281,325,348`) |
| 18 | `void updateShards(Iterable<PlayerView>)` | EDT (`FControlGameEventHandler.java:79`) | no-op — `RemoteClientGuiGame.java:394-396` comments "mobile adventure local game only" | n/a | **never** (fires with an empty set only) |
| 19 | `void setPlayerAvatar(LobbyPlayer, IHasIcon)` | — | no-op. `RemoteClientGuiGame.java:519-521` is an empty TODO; `ProtocolMethod.java:73` is a commented-out TODO | n/a | **never** (`QuestUtil.java:607`, `ConquestChaosBattle.java:108` only) |
| 20 | `protected void updateCurrentPlayer(PlayerView)` **(the 37th member — from `AbstractGuiGame`, not `IGuiGame`)** | game thread (`InputProxy.java:63-66` calls `setCurrentPlayer`, which is `final` in `AbstractGuiGame:92-102` and delegates here) | no-op (or stash for the `input` seat check) | n/a | **certain** |

### 3.2 Value-returning (17) — 13 genuine `ask`s, 4 local answers

| # | Signature | Thread | Blocks | Frame | Null/timeout default | Fires? |
|---|---|---|---|---|---|---|
| 21 | `SpellAbilityView getAbilityToPlay(CardView, List<SpellAbilityView>, ITriggerEvent)` | game thread (`PlayerControllerHuman.java:224`) | **yes** | `ask kind:"ability_menu"` | `null` — caller handles it: `resultView == null ? null : cache.get(resultView)` (`PCH:226`). If a *choice* is needed anyway, `abilities.get(0)` is Forge's own headless pick (`HeadlessNetworkGuiGame.java:112`). **Use `null`.** | **certain** (any card with 2+ playable SAs, e.g. `Borough Backup` = cast or landcycle) |
| 22 | `boolean confirm(CardView, String, boolean defaultIsYes, List<String>)` | game thread (`InputConfirm.java:78`, `InputConfirmMulligan.java:119`, `HumanCostDecision.java:1532`, `PCH:826,1487,1882,2073`) | **yes** | `ask kind:"confirm"` | `defaultIsYes` — `RemoteClientGuiGame.java:451-454`: `result != null ? result : defaultIsYes` | **rare** — all but `InputConfirmMulligan.java:119` are behind `if (getGui().isLibgdxPort())` (§0.8) |
| 23 | `boolean showConfirmDialog(String, String, String yes, String no, boolean defaultYes)` | any — `InputPassPriority.java:318` (EDT), `AbstractGuiGame.java:460` (`concede()`, click thread), `PCH:2909` | **yes** | `ask kind:"confirm"` | `defaultYes` — `RemoteClientGuiGame.java:434-437` | **likely** (floating-mana warning when passing with unspent Thriving-land mana) |
| 24 | `int showOptionDialog(String, String, FSkinProp, List<String>, int defaultOption)` | game thread | **yes** | `ask kind:"options"` | `defaultOption` — `RemoteClientGuiGame.java:440-443` | rare |
| 25 | `String showInputDialog(String, String, FSkinProp, String initial, List<String>, boolean isNumeric)` | game thread (`AbstractGuiGame.java:853` in `getInteger`'s "Other…" path; `BasicMacroSystem.java:77`) | **yes** | `ask kind:"text"` | `null` — `RemoteClientGuiGame.java:446-448` returns raw; `AbstractGuiGame.java:854-856` treats `null` as cancel. (`HeadlessNetworkGuiGame.java:148` prefers `initial`; **use `null`** so cancel semantics survive.) | rare |
| 26 | `<T> List<T> getChoices(String, int min, int max, List<T> choices, List<T> selected, FSerializableFunction<T,String> display)` | game thread | **yes** | `ask kind:"choose_list"` (+ `reveal:true` when `min<0`, amendment A7) | **never `null`.** `min <= 0` → `List.of()`; else `choices.subList(0, min(min, choices.size()))`, and at least 1 element when `choices` is non-empty. Mirrors `HeadlessNetworkGuiGame.java:157-167`; required by `AbstractGuiGame.java:767,780-781` | **certain** — `Thriving Heath`/`Thriving Isle` ETB colour choice (`chooseColors` → `PCH:1963`), `Giant-Sized Flying Ant`'s Charm modes (`chooseModeForAbility` → `PCH:1936-1938`) |
| 27 | `<T> OrderResult<T> order(String title, String top, int remainingMin, int remainingMax, List<T> source, List<T> dest, CardView ref, boolean sideboardMode, boolean showRemember)` | game thread (`PCH:859,869,880,893,916,1036,1079,1134,2136,2309,2313`) | **yes** | `ask kind:"order"` (amendment A2) | **never `null`** (`IGuiGame.java:229,232`; `PCH:2317`). Exact rule in §6.7 | **certain** — the deck has four "whenever a creature attacks alone" triggers (`Peggy Carter`, `Agent 13`, `Nick Fury`, `Strategic Intervention`); two on the battlefield at once → `chooseOrderOfSimultaneousStackEntry` (`PCH:2309-2317`) |
| 28 | `GameEntityView chooseSingleEntityForEffect(String, List<? extends GameEntityView>, DelayedReveal, boolean isOptional)` | game thread (`PCH:612`) | **yes** | `ask kind:"choose_entities"` with `min=max=1` (or `min=0` when `isOptional`) | `null` — guarded at `PCH:616-618`. (`HeadlessNetworkGuiGame.java:184` returns `isOptional ? null : optionList.get(0)`; **`null` is safe** because the caller null-checks.) | **likely** — `Borough Backup` landcycling, `Nick Fury`'s optional put-from-hand |
| 29 | `List<GameEntityView> chooseEntitiesForEffect(String, List<? extends GameEntityView>, int min, int max, DelayedReveal)` | game thread (`PCH:652`) | **yes** | `ask kind:"choose_entities"` | `List.of()` — `PCH:656-658` null-checks, but an empty list is the honest answer; `HeadlessNetworkGuiGame.java:192-193` returns the first `min` | **likely** (usually pre-empted by `useSelectCardsInput`, `PCH:428-460`, which routes battlefield/hand choices to the `input` path instead) |
| 30 | `Map<CardView,Integer> assignCombatDamage(CardView attacker, List<CardView> blockers, int damage, GameEntityView defender, boolean overrideOrder, boolean maySkip)` | game thread (`PCH:300`) | **yes** | `ask kind:"assign_damage"` (amendment A4) | `null` — explicitly handled: `PCH:302-304` `if (result == null) return null;` | **likely** (two blockers on one attacker; no trample in this deck) |
| 31 | `Map<Object,Integer> assignGenericAmount(CardView, Map<Object,Integer>, int amount, boolean atLeastOne, String label)` | game thread (`PCH:326,355,2466`) | **yes** | `ask kind:"assign_amount"` (amendment A5) | `null` — `PCH:329,358` guard with `if (vResult != null)`. (`HeadlessNetworkGuiGame.java:126` echoes `target`; `null` is safer and produces an empty result map.) | rare |
| 32 | `List<CardView> manipulateCardList(String, Iterable<CardView> cards, Iterable<CardView> manipulable, boolean toTop, boolean toBottom, boolean toAnywhere)` | game thread (`PCH:978`) | **yes** | `ask kind:"manipulate_list"` | **never `null`** — `PCH:986` indexes `result.get(i)`. Return `cards` in the order given (`HeadlessNetworkGuiGame.java:197-205`) | rare (no scry/surveil in this deck) |
| 33 | `List<PaperCard> sideboard(CardPool sideboard, CardPool main, String message)` | game thread (`PCH:275`) | **yes** | `ask kind:"sideboard"` | `null` is tolerated (`PCH:276`: `Objects.requireNonNullElse(resp, main.toFlatList())`), but return `List.of()` to match `HeadlessNetworkGuiGame.java:176` and avoid the `conform` retry loop at `PCH:277` | **never** with `rules.setGamesPerMatch(1)` and a sideboard-less deck |
| 34 | `Iterable<PlayerZoneUpdate> tempShowZones(PlayerView, Iterable<PlayerZoneUpdate> zonesToUpdate)` | **EDT** (`InputSelectEntitiesFromList.java:65-68`, `PCH:956-959`) | **no ask** | push `input.openZones`; **return `zonesToUpdate` unchanged** (`HeadlessNetworkGuiGame.java:92-94`) | identity | **likely** |
| 35 | `PlayerZoneUpdates openZones(PlayerView, Collection<ZoneType>, Map<PlayerView,Object>, boolean backupLastZones)` | **EDT** (`FControlGameEventHandler.java:127`) and game thread (`TargetSelection.java:184`) | **no ask** | push `input.openZones`; return a `new PlayerZoneUpdates()` populated exactly like `CMatchUI.java:1362-1381` (**skip `Battlefield`, `Hand`, `Stack`**) so `restoreOldZones` closes what we opened | empty `PlayerZoneUpdates` (never `null` — `RemoteClientGuiGame`'s `null` would be handed straight to `restoreOldZones`) | rare (this deck targets battlefield permanents, which `openZones` skips) |
| 36 | `boolean isUiSetToSkipPhase(PlayerView, PhaseType)` | game thread, **every step** (`PCH:3862-3867`) and EDT (`FControlGamePlayback.java:77`) | **no** | no frame. M2: `return false`. M6: read `FPref.PHASE_HUMAN_*`/`PHASE_AI_*` via `YieldController.isSkippingPhase` (jar) | `false` — `RemoteClientGuiGame.java:534-537`, `HeadlessNetworkGuiGame.java:52-54` | **certain**, very hot — **must not allocate or log** |
| 37 | `GameState getGamestate()` | game thread (`PCH:2889-2890`, dev-mode "restore game state") | **no** | none | `null` — `RemoteClientGuiGame.java:404-406`. Note `GameState` is `forge.game.GameState` | **never** |

*(Rows 1–20 and 21–37 together are the 36 `IGuiGame` abstracts plus
`updateCurrentPlayer`; regenerate the list with the `comm -23` recipe in
CLAUDE.md — it yields exactly these 36 names, one overload each.)*

### 3.3 Non-abstract members we must nonetheless override

| Member | Why | Thread |
|---|---|---|
| `void handleGameEvents(List<GameEvent>)` (default in `IGuiGame.java:113-117`) | **The snapshot hook.** Without it the default loops into `handleGameEvent` → `FControlGameEventHandler` on the EDT. | game thread — *but see §0.4* |
| `void setSelectables(Iterable<CardView>, int, int)` | Feeds `input.selectable`. `super` first (it maintains `selectableCards`, `AbstractGuiGame.java:347-353`). | **game thread** (`InputSelectEntitiesFromList.java:57`, in the ctor) |
| `void clearSelectables()` | Clears `input.selectable`. `super` first. | click thread (`InputSelectEntitiesFromList.java:171`) |
| `void setHighlighted(Iterable<GameEntityView>, boolean)` | Feeds `input.highlighted`. `super` first. | EDT/game thread |
| `void setWeaklySelectable(Iterable<CardView>)` / `clearWeaklySelectable()` | Amendment A8; M5 mana payment. `super` first. | game thread |
| `void afterGameEnd()` | Flush the log, close the console loop. Call `super` (`AbstractGuiGame.java:955-960` cancels the await timer). | EDT |
| `void setGameView(GameView)` | Called twice with `null` then the view (`HostedMatch.java:223-224`). Stash it; call `super`. | caller thread |

**Do not override** `updateCards`, `updateZones`, `updateSingleCard`,
`updateManaPool`, `updateLives`, `updateStack`, `updatePhase`, `updateTurn`,
`refreshField`, `refreshCardDetails`, `updatePlayerControl`, `updateDependencies`,
`applyDelta`, `notifyStack*`, `handleLandPlayed` — the inherited no-ops are
correct (synthesis §2.4), and they all arrive on the EDT where R1 forbids a walk.

### 3.4 Deck-specific evidence for the "Fires?" column

Extracted from `/home/justin-a/forge/res/cardsfolder/cardsfolder.zip`:

- `t/thriving_heath.txt`, `t/thriving_isle.txt` — `K:ETBReplacement:Other:ChooseColor`
  → `PlayerController.chooseColor` → `PCH:1975 chooseColorCommon` →
  `getChoices` over `MagicColor.Color`. **Two lands in the deck; `choose_list` with
  a non-view `T` is guaranteed in game one.**
- `g/giant_sized_flying_ant.txt` — `SVar:TrigCharm:DB$ Charm | Choices$ DBTap,DBUntap`
  → `chooseModeForAbility` with `possible.size()==2`, `min==num==1`, so the
  early-return at `PCH:1897-1899` does **not** fire → `getGui().one(...)` →
  `getChoices` over `SpellAbilityView`.
- `b/borough_backup.txt` — `K:TypeCycling:Basic:2` → library search →
  `chooseSingleEntityForEffect` with a `DelayedReveal`.
- `n/nick_fury_spymaster.txt` — `DB$ ChangeZone | Origin$ Hand | Optional$ You`
  → a confirm (via `InputConfirm`) plus `chooseSingleEntityForEffect`.
- `p/peggy_carter_secret_agent.txt`, `a/agent_13_sharon_carter.txt`,
  `n/nick_fury_spymaster.txt`, `s/strategic_intervention.txt` — four
  `T:Mode$ Attacks | Alone$ True` triggers → simultaneous-trigger `order`.
- `w/web_up.txt`, `d/depower.txt`, `p/pym_particles.txt`, `s/super_suit.txt`,
  `q/quantum_reduction.txt`, `h/helicarrier_strike.txt`, `w/wasp_shrinking_savior.txt`,
  `a/ant_mans_air_force.txt` — all target **battlefield permanents** →
  `InputSelectTargets` (the `input` path), and `openZones` skips Battlefield
  (`CMatchUI.java:1366-1368`), which is why `open_zones` is rare here.
- `q/quantum_reduction.txt`, `h/helicarrier_strike.txt` — `K:Teamwork:2` is an
  additional cost ("tap any number of creatures with total power 2 or more") →
  `HumanCostDecision` → `InputSelectCardsFromList` (`input` path) with
  `updateButtons(ok=false)` until the tally is met. **This is the exact
  "disabled OK means click a card" case of protocol.md §4.2.**

---

## 4. `openView` — the exact wiring

### 4.1 The code

```java
// WireGuiGame.java
private GameEventForwarder fwd;          // ours; NOT the one HostedMatch makes
private HostedMatch hosted;              // injected by MtgTable before startMatch

@Override
public void openView(TrackableCollection<PlayerView> myPlayers) {
    super.openView(myPlayers);           // AbstractGuiGame has no openView; this
                                         // line is ILLEGAL — see the note below.
}
```

**Note:** `AbstractGuiGame` does **not** implement `openView` (it is one of our 36),
so there is no `super.openView` to call. The body is entirely ours:

```java
@Override
public void openView(final TrackableCollection<PlayerView> myPlayers) {
    // Runs on the thread that called HostedMatch.startMatch (HostedMatch.java:260-262)
    // -- NOT the game thread, NOT the EDT. Do not call Snap.state() here.
    this.localPlayers = myPlayers;                     // for the seat/redaction check
    this.seat = myPlayers.iterator().next().getId();

    // 1. Our forwarder on the game's event bus. Guava EventBus dispatches
    //    synchronously on the posting thread, i.e. the game thread.
    //    (@Subscribe on GameEventForwarder.receiveGameEvent verified in the
    //     2.0.14 jar with `javap -v`.)
    fwd = new GameEventForwarder(this);                // public ctor, jar-verified
    hosted.getGame().subscribeToEvents(fwd);           // Game.subscribeToEvents(Object), jar

    // 2. Flush-before-block: observe every human InputQueue.
    //    InputQueue extends java.util.Observable (jar); GameEventForwarder
    //    implements java.util.Observer (jar); PlayerControllerHuman.getInputQueue()
    //    is public final (jar); HostedMatch.getHumanControllers() is public (jar).
    for (PlayerControllerHuman hc : hosted.getHumanControllers()) {
        hc.getInputQueue().addObserver(fwd);
    }

    transport.push(Frames.helloOk(gameId, seat, seed, forgeVersion, jarSha, players));
}
```

This mirrors `HostedMatch.java:227-233` (bus registration) and `:246-258`
(InputQueue registration) verbatim in intent. Forge itself only does this for
`RemoteClientGuiGame`, which is why we must do it by hand (synthesis §2.4).

`HostedMatch` additionally registers `new FControlGameEventHandler(humanController)`
on the bus for us (`:231-233`). **Leave it.** It is the only source of
`finishGame()` and it costs one EDT hop over no-op methods.

### 4.2 `handleGameEvents` — with the off-thread guard

```java
private final List<GameEvent> deferred = new ArrayList<>();   // guarded by itself

@Override
public void handleGameEvents(final List<GameEvent> batch) {
    if (!ThreadUtil.isGameThread()) {
        // Reached via InputQueue.removeInput() from InputSyncronizedBase.stop()
        // on the click thread (see §0.4). Walking CardView here would corrupt the
        // Tracker silently. Keep the events; the next game-thread flush ships them.
        synchronized (deferred) { deferred.addAll(batch); }
        return;
    }
    List<GameEvent> all;
    synchronized (deferred) {
        if (deferred.isEmpty()) { all = batch; }
        else { all = new ArrayList<>(deferred); all.addAll(batch); deferred.clear(); }
    }
    transport.push(Snap.state(this, all));   // Snap asserts isGameThread()
}
```

The buffer is lossless: after `stop()` releases the latch the game thread resumes
immediately and the next `setInput`/50-event/500 ms flush is on the game thread.
*Inferred, not measured* — verify at M2 by logging the deferred count.

**Observer order.** `InputQueue` adds `InputProxy` in its constructor
(`InputQueue.java:43`); we add `fwd` later. `java.util.Observable.notifyObservers`
iterates its snapshot **backwards**, so the last-registered observer runs first —
meaning our `state` flush happens before `InputProxy` posts the prompt to the EDT.
That is the order we want, but it is a JDK implementation detail, not a
specification. **Do not depend on it**: the reducer merges `input` into `state`
(protocol.md §4.1) and must tolerate an `input.selectable.cardIds` entry that is
not yet in `state` (render nothing for it; never throw).

### 4.3 `finishGame` without a view walk

`finishGame()` arrives on the EDT (R1 forbids walking `GameView`). Capture the
outcome on the game thread instead: in `handleGameEvents`, when the batch contains
`GameEventGameOutcome`, record `{winner, reason, matchOver}` into a volatile
field (this is already required by protocol.md §3.6's `outcome` event). Then
`finishGame()` just pushes `over` from that field.

---

## 5. `ReplyPool`

Forge's own `ReplyPool` (src:`forge-gui/src/main/java/forge/gamemodes/net/ReplyPool.java:9-63`)
is `Map<Integer, FutureTask>` with `initialize/complete/get/cancelAll`, keyed by an
int, with **no timeout** (`future.get()` at `:34` blocks forever). Ours adds the
timeout, the string key, the duplicate-answer drop and a stable notice.

```java
package mtgtable;

import java.util.Map;
import java.util.concurrent.*;

/** askId -> pending answer. Completed from mtg-table-io only; awaited from the game thread only. */
final class ReplyPool {
    /** What a completed-but-unclaimed ask looks like, so a second answer is detectable. */
    private static final Object DONE = new Object();

    private final Map<String, CompletableFuture<Object>> pool = new ConcurrentHashMap<>();
    private final Map<String, Object>                    done = new ConcurrentHashMap<>();
    private volatile boolean closed;

    /** Game thread. Registers askId before the frame is pushed. */
    void register(String askId) {
        if (closed) throw new IllegalStateException("ReplyPool closed");
        pool.put(askId, new CompletableFuture<>());
    }

    /**
     * Game thread only. Returns the answer, or null on timeout / disconnect / cancel.
     * timeoutMs <= 0 means wait forever (console transport default).
     */
    Object await(String askId, long timeoutMs) {
        CompletableFuture<Object> f = pool.get(askId);
        if (f == null) return null;
        try {
            return timeoutMs > 0 ? f.get(timeoutMs, TimeUnit.MILLISECONDS) : f.get();
        } catch (TimeoutException e) {
            Log.warn("ASK TIMEOUT " + askId + " after " + timeoutMs + "ms -> null");
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException e) {
            Log.warn("ASK FAILED " + askId + ": " + e.getCause());
            return null;
        } finally {
            pool.remove(askId);
            done.put(askId, DONE);
        }
    }

    /**
     * mtg-table-io only. Returns false if askId is unknown or already answered;
     * the caller then pushes notice{level:"warn", title:"Late answer"} and drops it.
     */
    boolean complete(String askId, Object value) {
        CompletableFuture<Object> f = pool.get(askId);
        if (f == null) return false;          // unknown, or already resolved
        return f.complete(value);             // false if a racing answer already won
    }

    /** mtg-table-io, on disconnect / shutdown. Unblocks every parked game thread with null. */
    void cancelAll() {
        closed = true;
        for (Map.Entry<String, CompletableFuture<Object>> e : pool.entrySet()) {
            e.getValue().complete(null);
        }
    }

    boolean isPending(String askId) { return pool.containsKey(askId); }
    int pendingCount()              { return pool.size(); }
}
```

Rules:

- **Register before push.** Otherwise a fast answer races the registration.
- **One ask at a time per game thread**, by construction — the game thread is
  parked inside the ask. `pendingCount() > 1` means a second (spectator or
  second-seat) game thread; log it, do not assume it.
- **A second `answer` for a completed `askId`** → `complete()` returns `false` →
  the transport pushes `notice{level:"warn", title:"Late answer", text:"ask <id>
  was already answered"}` and drops it (protocol.md §2.3).
- **`cancelAll()` on disconnect** (WS) and on `afterGameEnd()`.
- **Timeout default**: `askTimeoutMs` from `config.json`; `600000` for
  `WsTransport`, `0` (infinite) for `ConsoleTransport` — a human at a terminal is
  allowed to think, and there is no disconnect to recover from.
- **Watchdog**: a daemon that logs `ASK PENDING <askId> <kind> <seconds>s` every
  30 s. A wedged game thread must never be silent (synthesis §11).

---

## 6. `Transport` and the ask machinery

### 6.1 The interface

```java
package mtgtable;

interface Transport {
    /** Called once, before HostedMatch.startMatch. Starts the reader thread. */
    void start(Inbound in);

    /** Any thread, never blocks, preserves order. Appends to the frame log. */
    void push(String frameJson);

    /**
     * GAME THREAD ONLY. Pushes the ask frame and parks until an answer,
     * a timeout, or cancelAll(). Returns the raw decoded `value`, or null.
     */
    Object ask(String askId, String frameJson, long timeoutMs);

    /** Idempotent. Calls ReplyPool.cancelAll(). */
    void close();

    /** Implemented by WireGuiGame. Called on mtg-table-io. */
    interface Inbound {
        void onAct(String action, Map<String,Object> body);   // -> dispatched to the EDT
        void onAnswer(String askId, Object value);            // -> ReplyPool.complete
        void onResync();                                      // -> fresh state + input
        void onDisconnect();                                  // -> ReplyPool.cancelAll
    }
}
```

`ReplyPool` is constructed by `WireGuiGame` and handed to the `Transport`
constructor, so both `ask()` and `onAnswer` see the same pool.

### 6.2 The thread asserts (write these in the first hour)

```java
static void assertGameThread(String what) {
    if (!ThreadUtil.isGameThread())
        throw new IllegalStateException(what + " must run on the game thread, not "
                + Thread.currentThread().getName());
}
static void assertNotGameThread(String what) {
    if (ThreadUtil.isGameThread())
        throw new IllegalStateException(what + " must not run on the game thread");
}
static void assertNotEdt(String what) {
    if (FThreads.isGuiThread())
        throw new IllegalStateException(what + " must not run on the EDT");
}
```

Placement:

| Site | Assert |
|---|---|
| `Snap.state(...)` first line | `assertGameThread("Snap.state")` |
| `Transport.ask(...)` first line | `assertGameThread("Transport.ask")` |
| `Transport.Inbound.onAnswer` | `assertNotGameThread` **and** `assertNotEdt` |
| `Transport.push(...)` | none — it is legal from all four threads |
| every push override in `WireGuiGame` | none, but **R1 applies**: `getId()` only |

### 6.3 The generic ask helper

```java
private final AtomicLong askSeq = new AtomicLong();

/**
 * Game thread only. opts is the ask-local option array: answer indices resolve
 * against it (amendment A3). Returns the decoded answer, or null.
 */
private Object ask(String kind, Object[] opts, JsonBody body) {
    Transport.assertGameThread("ask/" + kind);
    if (!hasTransport() || gameOver) return null;       // degrade, never wedge
    String askId = "a" + askSeq.incrementAndGet();
    pendingOpts.put(askId, opts);
    try {
        pool.register(askId);
        String frame = Frames.ask(askId, kind, askTimeoutMs, body);
        return transport.ask(askId, frame, askTimeoutMs);
    } finally {
        pendingOpts.remove(askId);
    }
}
```

`pendingOpts` is a `ConcurrentHashMap<String,Object[]>`; it is how an answered
index becomes a `CardView` / `MagicColor.Color` / `PaperCard` again. It is the
**only** identity mapping in the ask path, which is exactly the manabrew lesson
"the client only echoes action ids" (synthesis §8).

### 6.4 `UNIMPL` logging

```java
private void unimpl(String member) {
    Log.warn("UNIMPL " + member);                                     // grep target
    transport.push(Frames.notice("error", "Unimplemented", member));  // protocol.md §6
}
```

Applied to rows 16, 17, 18, 19, 37 and to any ask kind whose console handler is a
stub. `grep UNIMPL var/*.log` is the M5 exit criterion (PLAN.md M5).

### 6.5 Assembling the `input` frame from four threads

`input` is built from `showPromptMessage` (EDT), `updateButtons` (EDT),
`setSelectables` (game thread), `clearSelectables` (click thread),
`setHighlighted`, `setCard`/`setPanelSelection`, `showManaPool`/`hideManaPool`,
`tempShowZones`/`hideZones`. Keep one mutable struct behind one lock:

```java
private final Object inputLock = new Object();
private final InputState in = new InputState();   // plain fields, ids only (R1)

private void mutateInput(Consumer<InputState> f) {
    String frame;
    synchronized (inputLock) { f.accept(in); frame = Frames.input(in); }
    transport.push(frame);            // push outside the lock
}
```

Filter by seat: ignore `showPromptMessage`/`updateButtons` whose `PlayerView owner`
is not `isLocalPlayer(owner)` (`AbstractGuiGame` gives us `isLocalPlayer`, jar).

Coalescing is unnecessary for M2 (a handful of `input` frames per decision).
If it ever matters, mark dirty and flush on a 16 ms single-thread timer.

### 6.6 Answer decoding (Jetty `JSON.parse`, per CLAUDE.md rule 5)

`org.eclipse.jetty.util.ajax.JSON.parse` yields `Long` for numbers, `Object[]`
for arrays, `Map<String,Object>` for objects, `Boolean`, `String`, `null`.
Write one coercion layer:

```java
static Integer asInt(Object o)        { return o instanceof Number n ? n.intValue() : null; }
static int[]   asIntArray(Object o)   { /* Object[] of Number -> int[]; null -> null */ }
static Boolean asBool(Object o)       { return o instanceof Boolean b ? b : null; }
static Map<Integer,Integer> asIntMap(Object o) { /* Map<String,Number> -> keys parsed as int */ }
```

Any shape mismatch → treat as `null` → the documented default. A malformed answer
must never throw on the game thread.

### 6.7 The `order` default — exact

Semantics (src:`forge-gui-desktop/src/main/java/forge/gui/GuiChoose.java:239-272`
→ `DualListBox(remainingMin, remainingMax, sourceChoices, destChoices)`;
`OrderResult.ordered()` is the **destination** list): `remainingMin/Max` constrain
how many objects may be **left in the source box**; `-1` means unconstrained.

```java
static <T> IGuiGame.OrderResult<T> orderDefault(
        int remainingMin, int remainingMax, List<T> source, List<T> dest) {
    List<T> all = new ArrayList<>();
    if (dest   != null) all.addAll(dest);
    if (source != null) for (T t : source) if (!all.contains(t)) all.add(t);
    int total = all.size();
    int lo = remainingMax >= 0 ? total - remainingMax : 0;      // min items in dest
    int hi = remainingMin >= 0 ? total - remainingMin : total;  // max items in dest
    lo = Math.max(0, Math.min(lo, total));
    hi = Math.max(lo, Math.min(hi, total));
    int k = Math.max(lo, Math.min(dest == null ? 0 : dest.size(), hi));
    return new IGuiGame.OrderResult<>(new ArrayList<>(all.subList(0, k)), false);
}
```

Checks against the real call sites:

| Call site | args | `k` | result |
|---|---|---|---|
| `IGuiGame.java:229` `order(t,top,src,c)` → `(0,0,src,null)` | total=n | n | all of `source`, in order ✔ |
| `PCH:2313` simultaneous triggers, first time → `(0,0,SAVs,[])` | total=n | n | all triggers, engine order ✔ |
| `PCH:2309` re-order → `(0,0,[],orderedSAVs)` | total=n | n | the saved order ✔ (a naive `sourceChoices` default would return **nothing** and silently drop the triggers) |
| `PCH:2136` replacement effects → `(0,n-1,srcREVs,orderedREVs)` | lo=1, hi=n, dest=0 | 1 | first effect — matches Forge's own fallback at `PCH:2143` ✔ |
| `AbstractGuiGame.java:874` `many(...)` → `(size-max, size-min, src, dest)` | lo=min, hi=max | min | first `min` — matches the `getChoices` default ✔ |
| `GuiChoose.java:227` sideboard → `(-1,-1,side,deck)` | lo=0, hi=total | dest.size() | the deck unchanged ✔ |

---

## 7. The 11 `ask` kinds — JSON shapes and Java marshalling

Envelope is always protocol.md §1 with `type:"ask"` and
`body = {askId, kind, timeoutMs, …}`. Every option object is

```jsonc
{ "id": 0,            // ask-local index into pendingOpts[askId]  (amendment A3)
  "label": "Agent Phil Coulson",
  "cardId": 41,       // optional: present iff the option is a CardView
  "playerId": 1,      // optional: present iff the option is a PlayerView
  "abilityId": 7 }    // optional: present iff the option is a SpellAbilityView
```

`label` for a generic `T` is: `display.apply(t)` when the `FSerializableFunction`
argument is non-null, else `String.valueOf(t)` — which is what Forge's own dialogs
do. **`String.valueOf` on a `CardView` reveals the card name**, so for `CardView`
options always route through the one redaction gate (`CardView.canBeShownTo`,
protocol.md §3.3) and emit `"label": "Hidden card"` when it fails. This is the one
place outside `Snap.card` where a name can leak.

| kind | method(s) | `body` (beyond `askId/kind/timeoutMs`) | `answer.value` | marshal back |
|---|---|---|---|---|
| `ability_menu` | `getAbilityToPlay(CardView, List<SpellAbilityView>, ITriggerEvent)` | `cardId`, `options:[opt]` where each opt carries `abilityId`, `label` (`SpellAbilityView.getDescription()`), `canPlay` (`.canPlay()`), `isSpell` (`.isSpell()`) | index `int`, or `null` | `(SpellAbilityView) opts[i]`; `null` → `null` |
| `confirm` | `confirm(CardView,String,boolean,List<String>)`, `showConfirmDialog(String,String,String,String,boolean)` | `prompt`, `title`, `focusCardId`, `yesLabel`, `noLabel`, `defaultYes` | `true` \| `false` \| `null` | `Boolean`; `null` → `defaultIsYes` / `defaultYes` |
| `options` | `showOptionDialog(String,String,FSkinProp,List<String>,int)` | `prompt`, `title`, `options:[{id,label}]`, `defaultIndex` | index `int`, or `null` | `int`; `null` → `defaultOption`. **Ignore `FSkinProp`** (a desktop icon enum) |
| `text` | `showInputDialog(String,String,FSkinProp,String,List<String>,boolean)` | `prompt`, `title`, `initial`, `suggestions:[String]`, `numeric` | `String`, or `null` | as-is; `null` → `null` (cancel) |
| `choose_list` | `getChoices(String,int,int,List<T>,List<T>,FSerializableFunction<T,String>)` and everything `AbstractGuiGame` builds on it (`one`, `oneOrNone`, `many`, `reveal`, `getInteger`, `insertInList`) | `prompt`, `options:[opt]`, `preselected:[index]` (from the `selected` arg), `min`, `max`, `reveal` (true iff `min < 0`, amendment A7) | `[index…]`, or `null` | `List<T>` of `opts[i]`; **`null` → §3.2 row 26 default (never null)** |
| `order` | `order(...9 args)` | `prompt`, `destLabel` (= the `top` arg), `source:[opt]`, `dest:[opt]`, `remainingMin`, `remainingMax`, `referenceCardId`, `sideboardMode`, `showRemember` | `{"ordered":[index…], "remember":bool}`, or `null` | `new OrderResult<>(List<T>, remember)`; `null` → `orderDefault(...)` (§6.7). **Indices address `dest ++ source` as one array**, in that order |
| `choose_entities` | `chooseSingleEntityForEffect` (min=max=1, or min=0 when `isOptional`), `chooseEntitiesForEffect` | `prompt`, `options:[opt with cardId\|playerId + kind:"card"\|"player"]`, `min`, `max`, `delayedReveal:{zone, owner, prefix, cards:[Card]}` or `null` | `[index…]`, or `null` | `GameEntityView` / `List<GameEntityView>` from `opts`; `null` → `null` / `List.of()`. `DelayedReveal` accessors are jar-verified: `getCards()`, `getZone()`, `getOwner()`, `getMessagePrefix()` — **each revealed card goes through the redaction gate** |
| `assign_damage` | `assignCombatDamage(CardView,List<CardView>,int,GameEntityView,boolean,boolean)` | `attackerId`, `total` (= `damage`), `overrideOrder`, `maySkip`, `targets:[opt]` where the **defender is index 0** with `"defender":true` plus `playerId`/`cardId`, and blockers follow with `cardId` and `lethal` (their remaining toughness, from `Snap`, game thread) | `{"<index>": n, …}`, or `null` | `Map<CardView,Integer>`; index 0 (the defender) marshals to key `null` — `PCH:305-311` accepts `null` or a `CardView` whose `getId() == -1`. `null` answer → **return `null`** (`PCH:302-304`) |
| `assign_amount` | `assignGenericAmount(CardView,Map<Object,Integer>,int,boolean,String)` | `sourceCardId`, `total` (= `amount`), `atLeastOne`, `label` (= `amountLabel`), `targets:[opt + kind:"entity"\|"color" + max (the incoming per-key cap)]` | `{"<index>": n, …}`, or `null` | `Map<Object,Integer>` keyed by `opts[i]` (a `GameEntityView` **or** a `MagicColor.Color`, `IGuiGame.java:151-152`); `null` → `null` |
| `manipulate_list` | `manipulateCardList(String,Iterable<CardView>,Iterable<CardView>,boolean,boolean,boolean)` | `prompt`, `cards:[opt]` (the full list, in order), `manipulable:[index]`, `toTop`, `toBottom`, `toAnywhere` | `[index…]` — the **full list in its new order** | `List<CardView>`; `null` → the input order, **never null** (`PCH:986` indexes it) |
| `sideboard` | `sideboard(CardPool,CardPool,String)` | `prompt`, `side:[opt]`, `main:[opt]` (options from `CardPool.toFlatList()`, label = `PaperCard.getName()` + `" ("+getEdition()+")"`) | `[index…]` = the new main deck, or `null` | `List<PaperCard>`; `null` → `List.of()` |

**Deleted from protocol.md §5.1: `open_zones`** (amendment A1). `tempShowZones`
and `openZones` push an `input.openZones` hint and return without asking (§3.2
rows 34–35).

---

## 8. `ConsoleTransport` — a line protocol good enough to finish a game

One reader thread named `mtg-table-io` on `System.in`; all output on
`System.out`, one frame per block, prefixed so it is greppable. The console is
deliberately **not** JSON — M2 is about the threading model, not the codec
(`WsTransport` in M3 sends the same frames as JSON).

### 8.1 Output

```
── state ── turn 7 (round 4)  MAIN1  active:you  priority:you
  YOU   life 20   hand 4   lib 29   gy 1   exile 0   [W:1 U:0]
   bf  12 Agent Phil Coulson 2/2            (+1/+1 x1)
   bf  14 Plains [T]
   bf  15 Thriving Isle
  OPP   life 17   hand 2   lib 31   gy 3   exile 0
   bf  31 Aerial Doombot 1/1 flying
  stack (top last):
       88 <- 41 Quantum Reduction  targets: 31
  combat: 12 -> opp, blocked by 31

── input ── "Turn: 7 (You)\nPhase: Main1\nStack: empty"
  focus: -
  [ok] OK        (enabled)
  [no] End Turn  (enabled)
  selectable 0..1 of: 12 14 15 41 42
  highlighted: -

── notice(warn) Illegal action: That creature cannot block.

── ask a17  choose_list  "Choose a color other than white"  pick 1..1
   0) BLUE
   1) BLACK
   2) RED
   3) GREEN
  answer with: <index>[,<index>...]   or  .  for none/cancel

── over  winner=you  reason="Opponent has lost the game."  matchOver=false
```

Rules: cards are always printed as `<id> <name>` so **an id is always visible
next to the thing you click**; hidden cards print as `<id> ??`; the `selectable`
line is the authoritative click list; a disabled `[ok]` with a non-empty
`selectable` line is Forge asking for a **card click**, and the console prints a
one-line reminder the first three times it happens (protocol.md §4.2).

### 8.2 Input

While **no** ask is outstanding, a line is an `act`:

| Typed | `act.action` | `IGameController` call |
|---|---|---|
| `12` or `c 12` | `clickCard` | `selectCard(view(12), null, null)` |
| `p 1` | `clickPlayer` | `selectPlayer(pview(1), null)` |
| `a 12 7` | `clickAbility` | `selectAbility(saView(7))` |
| `ok` / `` (empty line) | `buttonOk` | `selectButtonOk()` |
| `no` / `x` | `buttonCancel` | `selectButtonCancel()` |
| `m W` | `useMana` | `useMana(MagicColor.fromName("white"))` |
| `u` | `undo` | `undoLastAction()` (gate on `canUndoLastAction`) |
| `!` | `alphaStrike` | `alphaStrike()` |
| `pass` | *(new, amendment A6)* | `passPriority()` |
| `concede` | `concede` | `getOriginalGameControllers().forEach(IGameController::concede)` |
| `next` / `quit` | `nextGame` | `nextGameDecision(NextGameDecision.CONTINUE / .QUIT)` |
| `s` | — | reprint the last `state` |
| `i` | — | reprint the last `input` |
| `?` | — | help |

While an ask **is** outstanding, **every** line goes to the ask (the game thread
is parked; an `act` would be meaningless) except `concede` and `?`:

| kind | accepted |
|---|---|
| `confirm` | `y` / `n` / `.` (null → the default) |
| `options`, `ability_menu` | `<index>` / `.` |
| `text` | the raw line; `.` → null |
| `choose_list`, `choose_entities` | `0,2,5` / `` (empty = none) / `.` |
| `order` | `2,0,1` = the new `ordered` list; append ` *` to set `remember`; `.` → the §6.7 default |
| `assign_damage`, `assign_amount` | `0=2,1=1` (index=amount); `.` → null. Index 0 is the defender |
| `manipulate_list` | `3,0,1,2` = the full new order; `.` → unchanged |
| `sideboard` | `0,1,2,…` = the new main; `.` → unchanged |

Implementation: one `BufferedReader` loop; a `volatile PendingAsk current` set by
`ask()` before `pool.await` and cleared after. `ask()` on the game thread does
`print(frame); pool.register(id); return pool.await(id, 0)`. The reader completes
the pool from `mtg-table-io` — `assertNotGameThread` + `assertNotEdt` both hold.
Acts hop to the EDT with `FThreads.invokeInEdtNowOrLater` (§2.4). EOF on stdin →
`onDisconnect()` → `pool.cancelAll()` → the game degrades to defaults and ends.

---

## 9. `IGameController` — the complete member list and the `act` map

`javap forge.interfaces.IGameController` (jar, 28 members):

```
boolean mayLookAtAllCards()                 boolean canPlayUnlimitedLands()
void    concede()                           void    drawOfferAction(DrawOfferMessage$Action)
void    alphaStrike()                       void    useMana(byte)
void    selectButtonOk()                    void    selectButtonCancel()
void    selectPlayer(PlayerView, ITriggerEvent)
boolean selectCard(CardView, List<CardView>, ITriggerEvent)
void    selectAbility(SpellAbilityView)     void    undoLastAction()
IDevModeCheats cheat()                      IMacroSystem  macros()
void    nextGameDecision(NextGameDecision)  String  getActivateDescription(CardView)
void    reorderHand(CardView, int)          void    requestResync()
void    passPriority()
boolean shouldAutoYield(String)             [default]
void    setShouldAutoYield(String, boolean, boolean)
void    setDisableAutoYields(boolean)
AutoYieldStore$TriggerDecision getTriggerDecision(String)   [default]
void    setTriggerDecision(String, AutoYieldStore$TriggerDecision, boolean)
void    setDisableAutoTriggers(boolean)
void    applyYieldUpdate(YieldUpdate)       void sendYieldUpdate(YieldUpdate) [default]
YieldController getYieldController()
void    setYieldPref(ForgePreferences$FPref, String)
```

Obtain it with `AbstractGuiGame.getGameController()` (final, jar) — it returns the
controller for the current player — or `getGameController(PlayerView)`.

| protocol.md §2.2 `action` | body | maps to | notes |
|---|---|---|---|
| `clickCard` | `cardId` | `selectCard(CardView, null, null)` | returns `boolean`; `false` → push `notice{warn}`. Resolve `cardId` → `CardView` from the last `Snap` index, **not** by walking the graph |
| `clickPlayer` | `playerId` | `selectPlayer(PlayerView, null)` | `ITriggerEvent` is a desktop mouse event; `null` is what `RemoteClientGuiGame` sends (`ProtocolMethod.java:410` passes `null` for exactly this reason) |
| `clickAbility` | `cardId`, `abilityId` | `selectAbility(SpellAbilityView)` | resolve from the `SpellAbilityView` index `Snap` builds per card |
| `buttonOk` | — | `selectButtonOk()` | |
| `buttonCancel` | — | `selectButtonCancel()` | |
| `useMana` | `color` \| `cardId` | `useMana(byte)` | `byte` = `MagicColor.fromName("white"\|"blue"\|…)` (jar: `MagicColor.fromName(String)` / `(char)`). A `cardId` (tap a land) is `clickCard`, not `useMana` |
| `undo` | — | `undoLastAction()` | gate on `PlayerControllerHuman.canUndoLastAction()`; Forge itself surfaces Undo as the Cancel button in `InputPassPriority.java:170-172` |
| `alphaStrike` | — | `alphaStrike()` | only meaningful during `InputAttack` (`InputProxy.java:157-162`) |
| `concede` | — | `getOriginalGameControllers().forEach(IGameController::concede)` | **Do not call `AbstractGuiGame.concede()`** — it runs a nested `showConfirmDialog` (`AbstractGuiGame.java:460`) from the click thread, which would violate R2 |
| `nextGame` | — | `nextGameDecision(NextGameDecision.CONTINUE)` | jar enum: `NEW`, `CONTINUE`, `QUIT` |
| `setPhaseStop` | `playerId`, `phase`, `stop` | `getYieldController().setSkipPhase(PlayerView, PhaseType, boolean)` | jar. M6 |
| `setYield` | `cardId`, `mode` | `setShouldAutoYield(String key, boolean, boolean isAbilityScope)` | **cannot be built from a `cardId`** — the key is `SpellAbility.yieldKey()`. See amendment A6. M6 |
| *(new)* `passPriority` | — | `passPriority()` | distinct from `buttonOk`; needed for a clean "pass until something happens" |
| *(new)* `resync` (protocol.md §2.4) | — | `requestResync()` **plus** our own fresh `state` + `input` | `requestResync` is Forge's delta-sync recovery and is a no-op for us; the real work is re-pushing the last `state`/`input`/outstanding `ask` |

Unused in v1: `mayLookAtAllCards`, `canPlayUnlimitedLands`, `cheat()`,
`macros()`, `reorderHand`, `getActivateDescription`, `drawOfferAction`,
`applyYieldUpdate`/`sendYieldUpdate`, `setYieldPref`, `setDisableAutoYields`,
`setDisableAutoTriggers`, `setTriggerDecision`.

---

## 10. Compile-order checklist for the M2 evening

1. `Transport.java` + the three asserts (§6.2). Compiles alone.
2. `ReplyPool.java` (§5). Compiles alone; unit-test the timeout and the
   double-answer drop with a plain `main`.
3. `WireGuiGame.java` skeleton: **all 37 members present**, every body either a
   no-op, a `unimpl()`, or the documented default from §3. It must compile and a
   `HostedMatch` must run to completion against it with `ConsoleTransport`
   replaced by a `NullTransport` (all asks → `null` → defaults). *This is the
   real de-risking step — a game that plays itself to the end on defaults proves
   no member throws and no thread wedges.*
4. Wire `openView` (§4.1) and `handleGameEvents` (§4.2). Now `state` frames flow.
5. `input` assembly (§6.5). Now the console shows prompts and buttons.
6. Acts → EDT → `IGameController` (§9). Now you can click.
7. Asks, in the order the deck will hit them: `choose_list` (Thriving lands, turn
   1–3), `ability_menu` (Borough Backup), `order` (two attacks-alone triggers),
   `confirm`, `assign_damage`, then the rest.

### Compile traps (2.0.14 jar, JRE-only toolchain)

- `GameState` is `forge.game.GameState` (not `forge.gamemodes.*`).
- `FSerializableFunction` is `forge.util.FSerializableFunction`.
- `IHasIcon` is `forge.game.player.IHasIcon`.
- `FSkinProp` is `forge.localinstance.skin.FSkinProp`.
- `OrderResult` is the nested `forge.gui.interfaces.IGuiGame.OrderResult` — refer
  to it as `IGuiGame.OrderResult<T>`.
- `updateCurrentPlayer` is `protected`, not `public`.
- No `--release` (CLAUDE.md); no gson; JSON in via
  `org.eclipse.jetty.util.ajax.JSON`.

### M2 exit criteria

- A full game finished from the terminal with the user's deck.
- `grep UNIMPL var/*.log` shows only rows 16–19 and 37 (the never-fire set), or
  nothing.
- No `IllegalStateException` from `FThreads.assertExecutedByEdt`, from
  `Snap.state`, or from `Transport.ask`.
- The deferred-events counter (§4.2) is logged; a non-zero value confirms finding
  §0.4 and is expected, not a bug.
- `var/games/<id>/frames.jsonl` replays through the M1 reducer unchanged.

---

## 11. What is verified vs inferred

**Verified against the 2.0.14 jar (`javap`):** the exact 36-member abstract
surface and their signatures; `updateCurrentPlayer` as the 37th; `OrderResult`'s
shape; `IGameController`'s 28 members; `InputQueue extends Observable`;
`GameEventForwarder implements Observer` with a `@Subscribe`-annotated
`receiveGameEvent` (`javap -v`); `Game.subscribeToEvents(Object)`;
`HostedMatch.getGame()`/`getHumanControllers()`;
`PlayerControllerHuman.getInputQueue()`; `PlayerZoneUpdate(s)`, `DelayedReveal`,
`GameEntityView`, `SpellAbilityView`, `TrackableObject.getId()`, `MagicColor`,
`NextGameDecision`, `YieldController.setSkipPhase`.

**Verified against the source checkout (call sites, treated as prose):** every
thread attribution in §3; the null-default table; `openView` running before the
game thread exists; `openZones`/`tempShowZones` not being questions; the
`isLibgdxPort()` gating of `confirm`.

**Inferred, to confirm at M2 runtime:** that `handleGameEvents` actually does fire
off the game thread in our configuration (§0.4 — the code path exists; log the
deferred count); that `Observable`'s reverse notification order puts our forwarder
ahead of `InputProxy` (§4.2 — do not depend on it); the per-card "Fires?" column
for anything marked *likely* or *rare*; that dispatching acts on the virtual EDT
(§2.4) is sufficient for `InputBase.finished` visibility (it is what desktop Forge
does, but desktop's EDT is Swing's, not ours).

**Not investigated (out of scope, flagged for M3):** the full enumeration of
`DelayedReveal` / `tempShowZones` / `openZones` sites that legitimately reveal
library cards — the open gap already recorded in protocol.md §3.3 and PLAN.md M3.
This spec routes every revealed card through the single redaction gate, which is
necessary but not a proof of sufficiency.

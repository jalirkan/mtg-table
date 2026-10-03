# 06 — hidden-information audit

Status: closes the gap named in `docs/research/05-architecture-synthesis.md` §2.5 and §11,
`docs/protocol.md` §3.3 ("Open gap, to close before M3 ships"), and the **M3 gate** in
`PLAN.md`. Dated 2026-09-11.

**Citations.** `forge-…/src/…:NNN` = the 2.0.15-SNAPSHOT source checkout in the session
scratchpad, read as prose. Everything load-bearing was re-confirmed against the installed
**2.0.14 jar** with `javap`; those confirmations are marked **[jar]**. Where the two could
differ I say so.

---

## 0. Executive summary — the six things that change

1. **`canBeShownTo` is necessary but not sufficient.** It returns **`true` unconditionally
   for `Battlefield` and `Stack`, face-down cards included**
   (`CardView.java:632-638`). A morph / manifest / cloak / disguise permanent therefore
   passes the single gate in `Snap.card()`. It does not leak *today* only because the
   current `Snap.java` reads `getCurrentState()`, whose name is `""` and type is `Creature`
   for the face-down state (`CardUtil.java:192-210`). The real identity is one accessor
   away, on `CardView.getAlternateState()` and `CardView.getBackup()`. The second predicate
   Forge uses for exactly this is **`CardView.canFaceDownBeShownTo(viewer)`**
   (`CardView.java:688-704`) **[jar]**, and it is currently absent from the plan.

2. **`openZones` / `tempShowZones` / `hideZones` / `restoreOldZones` reveal nothing.** They
   carry no cards at all — `PlayerZoneUpdate` is `(PlayerView, Set<ZoneType>)` **[jar]** —
   and the desktop implementation only opens/closes floating panels
   (`CMatchUI.java:584-625,1362-1386`). Every actual reveal goes through
   `PlayerControllerHuman.tempShow*` → `Card.addMayLookTemp` →
   `TrackableProperty.PlayerMayLook` → `canBeShownTo`. **Protocol §5.1's `open_zones` ask
   kind should be deleted**: neither method asks the user anything, `tempShowZones` is
   invoked *on the EDT* (`PlayerControllerHuman.java:955-959`,
   `InputSelectEntitiesFromList.java:65-68`) where blocking is forbidden, and both can be
   answered synchronously and locally.

3. **`FPref.UI_SELECT_FROM_CARD_DISPLAYS` defaults to `"true"`**
   (`ForgePreferences.java:157`) and that default makes a library search **unplayable** in
   our client. With it true, `useSelectCardsInput`
   (`PlayerControllerHuman.java:428-464`) routes library/graveyard/exile/command/sideboard
   choices to `InputSelectEntitiesFromList` — a *click a card on the board* input — while
   `state.players[].zones.library` is a bare count (protocol §3.4). The user would be asked
   to click cards that are not in the snapshot. **Set it to `false` in `MtgTable`/`Smoke`
   bootstrap before the first game.** Everything then arrives as an `ask` carrying the
   cards, which is what protocol §5 already models.

4. **A permanently-revealed library card has no `ask` to ride on.**
   `StaticAbilityContinuous.java:925-926` calls `Card.addMayLookAt` from a *continuous*
   static ability (Future Sight, Bolas's Citadel, Experimental Frenzy, Hidden Agenda via
   `CardFactoryUtil.java:182`). No blocking call ever fires, so protocol §3.4's
   "library is always a count" makes it invisible forever. Fix: `library` gains an optional
   `cards` array containing **only** those library cards for which `canBeShownTo(me)` is
   true — never a redacted stub, never a count-completing array.

5. **The text channels leak, not just the card channels.** `CardView.toString()` returns
   the real name for any card in any zone (`CardView.java:1215-1233`) and is what builds
   `input.prompt` (`InputSelectTargets.java:86-110`), the `GameEventAddLog` message
   (`Player.java:1426-1432`, `CostReveal.java:141-153`),
   `GameEventSpellAbilityCast.targetDescription()` **[jar]** and
   `GameEventSpellResolved.stackDescription()` **[jar]**. `CardView.getText()` additionally
   splices in `Remembered` (`CardView.java:871`), which can name cards in hidden zones.
   None of these may reach the wire unfiltered.

6. **The worst remaining leak is in `reduce.ts`, not in `Snap.java`.** Card ids are stable
   across zone changes — `GameAction.java:207` calls `new CardCopyService(c).copyCard(false)`
   and `CardCopyService.java:53-55` reuses `copyFrom.getId()`. A reducer that *merges* card
   objects by id keeps the `name` it learned during a legitimate reveal and keeps rendering
   it after the card returns to a hidden zone. **A redacted card must replace, never merge.**

---

## 1. The predicate, exactly

### 1.1 `CardView.canBeShownTo(PlayerView)` — `forge-game/src/main/java/forge/game/card/CardView.java:622-681` **[jar]**

```
622  public boolean canBeShownTo(final PlayerView viewer) {
623      if (viewer == null) { return false; }          // fail-CLOSED
625      ZoneType zone = getZone();
626      if (zone == null) { return true; }             // fail-OPEN
628      final PlayerView controller = getController();
629      switch (zone) {
630-638  Ante, Command, Battlefield, Graveyard, Flashback, Stack, Junkyard -> return true
639-645  Exile, Merged   -> if (!isFaceDown()) return true;  else fall through
646-650  Hand            -> if (controller.equals(viewer)) return true; else fall through
651-656  Sideboard       -> opponent && !mayPlayerLook ? fall through : return true
657-662  Library, PlanarDeck, AttractionDeck, ContraptionDeck -> fall through
663-665  SchemeDeck      -> return true
666-667  default         -> fall through          // ExtraHand, Subgame, None
668      }
671      if (mayPlayerLook(viewer)) return true;        // the ONLY dynamic reveal channel
676-679  mind-slave: if viewer controls the card's controller, ask again as that controller
680      return false;
681  }
```

Four things to take from this listing.

* **`Battlefield` and `Stack` return `true` before `isFaceDown()` is ever consulted.** This
  is the single most important correction in this report. `Exile` checks `isFaceDown()`;
  `Battlefield` and `Stack` do not, because for a face-down permanent the *object* is public
  — only its *face* is secret, and Forge splits that into a second predicate (§1.3).
* Line 626 (`zone == null → true`) and `canBeShownToAny(null|empty) → true`
  (`CardView.java:616-620`) are **fail-open**. `Snap` must never call `canBeShownToAny`, and
  must treat a `CardView` with a null zone as suspicious rather than public — LKI copies,
  `Card.getCardForUi(...)` views and the synthetic pile headers of
  `PlayerControllerHuman.java:2516-2530` all have `getZone() == null` *and*
  `getController() == null` (NPE risk in the redacted branch).
* `case Hand` compares against **`getController()`**, not `getOwner()`. In hidden zones they
  coincide today, but the redacted stub should carry `owner` too so the client is never
  guessing which player's array a card belongs to.
* `ExtraHand` (Backup Plan) falls into `default` and is therefore invisible **even to its
  owner**. Forge's own client has the same behaviour; note it, do not work around it.

### 1.2 `mayPlayerLook` / `TrackableProperty.PlayerMayLook`

`CardView.java:603-614` **[jar]**; the property is declared
`PlayerMayLook(TrackableTypes.PlayerViewCollectionType, FreezeMode.IgnoresFreeze)` at
`TrackableProperty.java:89` — *ignores freeze*, i.e. a reveal is visible to the view graph
immediately, not at the next tracker unfreeze. Good for us: a snapshot taken inside a
blocking call sees the reveal.

It is written from exactly one place, `Card.updateMayLook()`
(`forge-game/src/main/java/forge/game/card/Card.java:3779-3787`), which unions three sets:

| set | added by | removed by | meaning |
|---|---|---|---|
| `mayLook` (timestamped) | `Card.addMayLookAt` (`Card.java:3752-3757`) | `Card.removeMayLookAt` (`Card.java:3759-3763`) | continuous static effect ("play with the top card revealed") |
| `mayLookFaceDownExile` | `Card.addMayLookFaceDownExile` (`Card.java:3745-3748`) | never | permanent: "you may look at this face-down exiled card" |
| `mayLookTemp` | `Card.addMayLookTemp` (`Card.java:3765-3771`) | `Card.removeMayLookTemp` (`Card.java:3773-3777`) | for the duration of one GUI dialog |

Callers, exhaustively (grep over `forge-game` + `forge-gui` + `forge-ai`):

```
addMayLookAt            StaticAbilityContinuous.java:926     MayLookAt$ static ability
                        CardFactoryUtil.java:182             Hidden Agenda (face-down in Command)
removeMayLookAt         StaticEffect.java:315                that static ending
addMayLookFaceDownExile ChangeZoneEffect.java:768, :1442     WithMayLook$ / Foretold$
                        CardFactoryUtil.java:2996            Foretell (the keyword's own SA)
                        DigEffect.java:424                   WithMayLook$ on a dig
                        HeistEffect.java:53                  Heist
                        PlaySpellAbility.java:130            rollback of a failed face-down cast
                        GameState.java:1412                  dev-mode state loader ("Foretold")
addMayLookTemp          PlayerControllerHuman.java:187       tempShowCard  (the only GUI path)
removeMayLookTemp       PlayerControllerHuman.java:204       endTempShowCards
```

That is the complete dynamic-reveal surface. Nothing else can turn a hidden card visible.

### 1.3 `canFaceDownBeShownTo` — the predicate the plan is missing

`CardView.java:688-704` **[jar]**:

```
688  if (!isFaceDown()) return true;
694  if (mayPlayerLook(viewer)) return true;
698-701 mind-slave recursion
703  return isInZone({Battlefield, Stack, Sideboard}) && getController().equals(viewer);
```

Line 703 is the rule "you may look at face-down permanents *you control*". Forge's own UI
uses it through `AbstractGuiGame.mayFlip(CardView)`
(`forge-gui/src/main/java/forge/gamemodes/match/AbstractGuiGame.java:287-317`), whose
`case Original: if (cv.isFaceDown()) return cv.canFaceDownBeShownToAny(getLocalPlayers());`
is precisely the gate for "show the real card behind this morph".

What leaks if you ignore it (all **[jar]**-confirmed accessors on `CardView`):

| accessor | value for an opponent's face-down permanent |
|---|---|
| `getAlternateState()` | the **Original** `CardStateView` — real name, mana cost, type, P/T, oracle text. Set unconditionally at `CardView.java:1104-1109`, which deliberately forces the alternate of a face-down DFC/split to `CardStateName.Original`. |
| `getBackup()` | a `CardView` built from the stored `PaperCardBackup` — the real printing. Stored at `CardView.java:1019` while the card was still face up, and **never cleared when it turns face down**. |
| `getLeftSplitState()` / `getRightSplitState()` | real halves of a split card. |
| `getText()` | full rules text **plus** `Remembered` (`CardView.java:871`), `MergedCards`, `Cloner`. |
| `getOracleName()` | `""` for face-down (`CardView.updateName`, `:114-124`) — safe, but do not rely on it. |
| `getCurrentState().getImageKey(viewers)` | safe: `CardView.java:1323-1326` returns the generic face-down key, and `:1327-1333` is the only place in the whole class with a `canBeShownToAny` guard. |

Conversely, for cards the viewer *is* entitled to flip, `getAlternateState()` is the only
way to show them their own morph. So the rule is a gate, not a ban.

### 1.4 What Forge's own UI does with a "no" — the redaction shape to copy

`forge-gui/src/main/java/forge/gui/card/CardDetailUtil.java:156-180`:

```
156 formatCardName(card, canShow, forAltState) -> "???" when !canShow
162 formatCardType(state, canShow)             -> "" , except "Creature" for a FaceDown in play
168 formatPrimaryCharacteristic(state, canShow)-> "" unless state == FaceDown (then 2/2)
197 mana cost suppressed when !mayView
251 id label suppressed when !mayView
```

Our four-key stub is stricter than this and that is fine. The one thing worth importing: for
a **face-down card not on the battlefield or stack** Forge shows *no* type and *no* P/T
(`CardStateView.getType()`, `CardView.java:1348-1353`, returns `CardType.EMPTY`), because the
2/2 Creature of `CardUtil.getFaceDownCharacteristic` (`CardUtil.java:192-210`) is an artifact
of the face-down state object, not a rules fact. `Snap` must not emit `power`/`toughness` for
a face-down card outside Battlefield/Stack.

### 1.5 Do **not** use `AbstractGuiGame.mayView`

`AbstractGuiGame.java:273-283`:

```
273  if (!hasLocalPlayers())                          return true;   // AI-vs-AI recorder!
276  if (isLibgdxPort() && gameView.isGameOver())     return true;   // reveal-all after the match
279  if (getGameController().mayLookAtAllCards())     return true;   // dev-mode cheat
282  return c.canBeShownToAny(getLocalPlayers());
```

Three fail-open branches, one of which (`!hasLocalPlayers()`) is exactly the M1 `RecordMatch`
situation: two AI seats, `gameControllers` empty, **every card visible**. `mayLookAtAllCards`
is the dev cheat set at `PlayerControllerHuman.java:2855`. `Snap` must take an explicit
`PlayerView me` and call `cv.canBeShownTo(me)` directly — which the current
`bridge/src/mtgtable/Snap.java:333-343` already does. Keep it that way, and make
`Snap.state()` throw when `me == null` rather than letting line 623's fail-closed branch
silently redact the viewer's own hand.

`me` must be the engine's own `PlayerView` (`PlayerView.get(player)` or
`TrackableTypes.PlayerViewType.lookup`). `TrackableObject.equals` is id+class
(`TrackableObject.java:65-69`), so a look-alike with the right id works — but a
hand-constructed `PlayerView` with a wrong id blanks the viewer's own hand, which is the
failure to recognise.

---

## 2. Every reveal path, with its wire channel and its leak signature

Twelve paths. For each: what triggers it, the Forge call chain, **which protocol channel
must carry the visible cards**, and what a leak looks like in `frames.jsonl`.

### P1 — `tempShow*` around a GUI choice (the workhorse)

**Trigger.** Any effect that makes the human pick from a card list.
**Chain.** `PlayerControllerHuman.tempShow/tempShowCards/tempShowCard`
(`PlayerControllerHuman.java:171-196`: `tempShow` 171, `tempShowCard` 182, `tempShowCards` 191) → `Card.addMayLookTemp` → `PlayerMayLook` →
`canBeShownTo` true → `getGui().<choice method>` blocks → `endTempShowCards()`
(`:198-207`) removes it again.

All 21 call sites in `PlayerControllerHuman` (2.0.15 checkout line numbers):

| line | method | what is revealed | reaches the GUI via |
|---|---|---|---|
| 485 / 494 | `chooseCardsForEffect` | the whole source list | `InputSelectCardsFromList` **or** `many` |
| 514 | `chooseContraptionsToCrank` | the contraptions | `many` |
| 596-598 | `chooseSingleEntityForEffect` | option list **+ `delayedReveal.getCards()`** | `InputSelectEntitiesFromList` **or** `chooseSingleEntityForEffect` |
| 638-641 | `chooseEntitiesForEffect` | option list **+ delayedReveal** | `InputSelectEntitiesFromList` **or** `chooseEntitiesForEffect` |
| 749 | `confirmAction(…, cardToShow, …)` | one card | `confirm(CardView, …)` |
| 945 | `reveal(...)` | see P3 | `reveal` / floating hand |
| 998-1007 | `arrangeForScry` | top N | see P4 |
| 1047-1056 | `arrangeForSurveil` | top N | `many` + `order`, or `confirm(CardView,…)` |
| 1089-1092 | `willPutCardOnTop` | one library card | `confirm(CardView,…)` |
| 1126 | `orderMoveToZoneList` | the cards being ordered | `order` |
| 1180 | `chooseCardsToDiscardFrom(p != me, …)` | `visibleToChooser` (an opponent's hand) | `InputSelectCardsFromList` or `many` |
| 1726 | `chooseCardsToDiscardToMaximumHandSize` (libgdx only) | own hand | `many` |
| 2522-2529 | `chooseCardsPile` | the face-down pile | `one` |

**Channel.** Whichever `IGuiGame` method is called → the matching `ask` kind. The cards are
visible *only while the game thread is parked inside that call*, so the `ask` body must carry
them; a `state` frame emitted at the same moment will also show them, which is correct and
harmless.

**Leak signature.** An `ask` whose `options[].label` was built from `CardView.toString()` /
`getName()` **without** re-checking `canBeShownTo` — e.g. `TargetSelection.chooseCardFromList`
(`forge-gui/src/main/java/forge/player/TargetSelection.java:199-251`) hands
`getGui().one(...)` a `List<Object>` that mixes `"--CARDS IN LIBRARY:--"` header strings with
library `CardView`s **that were never `tempShow`n**. Route every option label through the
redacting function and those come out as `???`.

### P2 — `DelayedReveal`

**Class.** `forge.game.player.DelayedReveal` — note the package: **not**
`forge.game.card` as the task brief and synthesis §2.5 say. `forge-game/src/main/java/forge/game/player/DelayedReveal.java:15-55`, confirmed **[jar]**:

```
public forge.trackable.TrackableCollection<forge.game.card.CardView> getCards();
public java.util.Set<forge.game.zone.ZoneType> getZone();
public forge.game.player.PlayerView getOwner();
public java.lang.String getMessagePrefix();
public void remove(forge.game.card.CardView);
```

**Three construction sites, all of them a library or opponent-hand search:**

| site | contents |
|---|---|
| `ChangeZoneEffect.java:1042-1062` | the searched player's **entire library** (or top 4 under `LimitSearchLibrary`), plus their **whole hand** when `origin` includes Hand and they are an opponent |
| `DigEffect.java:206` | the top N just dug |
| `ChooseCardEffect.java:257` | a `QuasiLibrarySearch`'s library slice |

**How it reaches the GUI.** `PlayerControllerHuman` `tempShow`s `delayedReveal.getCards()`
(`:598`, `:638`) and then passes the object itself to
`IGuiGame.chooseSingleEntityForEffect(title, optionList, delayedReveal, isOptional)` /
`chooseEntitiesForEffect(title, optionList, min, max, delayedReveal)` **[jar]**. When the
option list is empty or forced, it calls `PlayerController.reveal(delayedReveal)` instead
(`:583-593`), i.e. falls through to P3.

**Channel.** Protocol §5.1 already reserves a `delayedReveal` field on `choose_entities`.
Make it `{ owner, zones:[…], messagePrefix, cards:[Card] }` where each `Card` is the output
of the one serialising function — the delayed-reveal set is the *context* (here is what you
are looking at) and `options` is the *choice*, and the two overlap only partially.

**Leak signature.** `delayedReveal.cards` serialised with a second, non-redacting writer;
or the whole library appearing in a `choose_entities` frame when the deck-search was
`LimitSearchLibrary`-capped.

### P3 — `PlayerController.reveal` / `GameAction.reveal` — the opponent shows you cards

**Trigger.** Any `Reveal$` effect, `CostReveal`, "reveal the top card", "reveal your hand".
**Chain.** `GameAction.reveal(...)` / `revealTo(...)`
(`forge-game/src/main/java/forge/game/GameAction.java:2185-2239`) fans out to every player's
controller. For the human: `PlayerControllerHuman.reveal`
(`PlayerControllerHuman.java:933-973`; the public overloads at `:924-931`), which
1. `tempShowCards(cards)` (`:945`),
2. then **one of two very different things** (`:947-968`):
   * **`useFloatingHandReveal`** — when the zone is `Hand`, the owner is not you, the pref
     `UI_SELECT_FROM_CARD_DISPLAYS` is on and this is not libgdx: it calls `updateZones` +
     **`tempShowZones`** on the EDT and then blocks on a plain `InputConfirm` with
     OK / "End Turn" buttons. **No card ever reaches an `IGuiGame` choice method.** The
     opponent's hand is visible *only in the state snapshot*, because `tempShowCards` made
     `canBeShownTo` true.
   * **otherwise** — `getGui().reveal(fm, collection)`, which
     `AbstractGuiGame.java:785-788` implements as `getChoices(message, -1, -1, items)`.
3. `getGui().updateRevealedCards(collection)` (`:970`) — **still inside the tempShow
   window** — then `endTempShowCards()` (`:971`).

**Channel.** With the pref off (§0.3) this is always `choose_list` with **`min = -1,
max = -1`**, meaning *acknowledge only, select nothing*. Protocol §5.1 currently says
"array of ids (length in `[min,max]`)", which is unsatisfiable for `-1/-1`. Specify:
`min === -1 && max === -1` ⇒ render as a reveal, answer `[]`.
`updateRevealedCards` is a separate non-blocking push (it accumulates into
`GameView.RevealedCardsCollection`, `AbstractGuiGame.java:253-260`); map it to a `notice`
or a `state` side-channel, but it is not required — the `ask` already carried the cards.

**Leak signature.** With the pref *on*, the `state` frame emitted during the `InputConfirm`
legitimately contains the opponent's hand with names; the frame *after* `endTempShowCards`
re-redacts them. A reducer that merges by id keeps the names forever. That is the §0.6 bug.

### P4 — scry / surveil / `manipulateCardList` — the whole-library exposure

`PlayerControllerHuman.arrangeForScry` (`:998-1043`) has two paths:

* **pref on** → `arrangeForMove(title, player.getCardsIn(ZoneType.Library), topN, true, true)`
  (`:982-996`, called at `:1010-1011`) → `manipulateCardList(title, cards, manipulable, …)` (`:975-980`) →
  `IGuiGame.manipulateCardList(title, cards, manipulable, toTop, toBottom, toAnywhere)`
  **[jar]**. `cards` is the player's **entire library in library order**; `manipulable` is
  the scried top N.
* **pref off** → `willPutCardOnTop` (1 card, a `confirm(CardView,…)`) or `many` + `order`
  over the top N only.

`arrangeForSurveil` (`:1047-1085`) never takes the whole-library path but does call
`getGui().setCard(view)` and `InputConfirm.confirm(this, view, …)` for the single-card case.

**Only `topN` is `tempShowCards`'d** (`:1007`, `:1049`). The rest of the library has no
`PlayerMayLook` entry, so routing `manipulate_list`'s `cards` through the one serialising
function turns them into redacted stubs automatically — the *order* of the library is
still exposed as a list of ids, which is itself information (it tells you the library is
shuffled the same way next turn). **Recommendation: turn the pref off and this path never
fires.** If you keep it, truncate `manipulate_list.cards` to the `manipulable` subset plus a
`beforeCount`/`afterCount`.

`GameEventScry(player, toTop, toBottom)` and `GameEventSurveil(player, toLibrary,
toGraveyard)` **[jar]** carry counts only and are genuinely public; see §5.

### P5 — library search through the board input (`UI_SELECT_FROM_CARD_DISPLAYS`)

`useSelectCardsInput` (`PlayerControllerHuman.java:428-464`):

```
430  if (sa != null && ApiType.Heist.equals(sa.getApi())) return false;   // "would reveal illegal zone information"
433  if (FThreads.isGuiThread()) return false;
453-458 pref ON  -> Battlefield, Hand, Library, Graveyard, Exile, Flashback, Command, Sideboard
        pref OFF -> only (Hand owned by this player) or Battlefield
```

With the pref on, `chooseSingleEntityForEffect`/`chooseEntitiesForEffect` build an
`InputSelectEntitiesFromList`, which calls `setSelectables(vCards, min, max)` and
`tempShowZones` (`InputSelectEntitiesFromList.java:51-68`) and `hideZones` on stop
(`:169-172`). The cards arrive **only** through `state` + `input.selectable.cardIds` — and
library cards are not in `state` at all. **This is the concrete reason the pref must be off
for v1.**

Note `InputSelectTargets` (`InputSelectTargets.java:68`) also calls `setSelectables` over
`choices` that were never `tempShow`n; a library card that is a legal target therefore lands
in `input.selectable.cardIds` with no resolvable card. The renderer must tolerate an
unresolvable selectable id (skip it, do not throw).

### P6 — continuous `MayLookAt` statics (the path with no `ask`)

`StaticAbilityContinuous.java:462-471` parses `MayLookAt$`, and `:925-926`:

```
925  if (mayLookAt != null && (!affectedCard.getOwner().getTopXCardsFromLibrary(1).contains(affectedCard)
                               || game.getTopLibForPlayer(...) == null || game.getTopLibForPlayer(...) == affectedCard)) {
926      affectedCard.addMayLookAt(se.getTimestamp(), mayLookAt);
```

removed at `StaticEffect.java:313-315`. Also `CardFactoryUtil.java:182` (Hidden Agenda:
face-down in the Command zone, owner may look). `:908-910` adds the `MayPlay` controller to
`mayLookAt` when `MayLookAt$ True` is a shorthand.

Effects in this class: Future Sight, Bolas's Citadel, Experimental Frenzy, Vizier of the
Menagerie, Oracle of Mul Daya, Melek. **None of them block.** There is no `ask`. The card is
a `Library` card with `canBeShownTo(me) == true` and it is currently unreachable because
protocol §3.4 forbids `library.cards`.

Also relevant: `PlayerView.Flashback` is a *derived* collection —
`Player.getCardsIn(ZoneType.Flashback)` → `getCardsActivatableInExternalZones`
(`Player.java:1325-1326, 1369-1378`) → `PlayerZone.OwnCardsActivationFilter`
(`PlayerZone.java:45-73`), whose first clause is `c.mayPlayerLook(c.getController())`. Its
members keep their **real** zone (`CardView.updateZone`, `CardView.java:152-154`), so
`canBeShownTo` is still correct for them — but it means `canBeShownTo`'s
`case Flashback: return true` is effectively unreachable for real cards. Do not emit a
`flashback` zone in `state`; the same cards are already in `library`/`graveyard`/`exile`.

### P7 — exile face-down, "you may look at it"

`Card.addMayLookFaceDownExile` (`Card.java:3745-3748`) is permanent (never removed) and is
also unioned into `mayLook` by `addMayLookAt`/`addMayLookTemp` when the card is already
face-down in exile (`Card.java:3752-3757`, `:3765-3771`).

Call sites: Foretell (`CardFactoryUtil.java:2996`; `ChangeZoneEffect.java:766-768`,
`:1440-1442` under `WithMayLook$`/`Foretold$`), Heist (`HeistEffect.java:53`), dig-to-exile
(`DigEffect.java:423-424`), failed-cast rollback (`PlaySpellAbility.java:126-131`), dev-mode
state load (`GameState.java:1412`).

`canBeShownTo` reaches it via `case Exile: if (!isFaceDown()) return true; break;`
(`CardView.java:639-645`) then line 671. `canFaceDownBeShownTo` agrees via line 694. Both
predicates therefore say yes for *your own* foretold card and no for the opponent's — and
the opponent's shows up in your `state` as a redacted stub inside their `exile` zone, which
is exactly right: you know a face-down card is exiled, you do not know which.

The face-down image key is the only thing that changes: `Card.getFacedownImageKey`
(`Card.java:6300-6312`) returns a generic HIDDEN/FORETELL/MANIFEST key, and for manifest it
embeds the manifesting ability's **set code**. That is not a card identity; ignore it.

### P8 — face-down permanents: morph / manifest / cloak / disguise

**This is the path `canBeShownTo` does not cover.** A face-down permanent is on the
`Battlefield`, so `canBeShownTo` returns `true` at `CardView.java:632-638` for *everyone*.

What makes it safe today: `Card.setState(CardStateName.FaceDown, …)`
(`Card.java:544-547, 586-620`) swaps `currentState` to
`CardUtil.getFaceDownCharacteristic(this)` (`CardUtil.java:192-210`), which is
`name = ""`, `type = Creature`, base P/T 2/2, image = HIDDEN_CARD. `CardView.updateState`
(`CardView.java:1006-1033`) then sets `TrackableProperty.Name` from
`Card.getDisplayName()` → `getName(currentState)` → `""` (`Card.java:964-987`). So
`cv.getName()` and `cv.getCurrentState().getName()` are both `""`. The current
`Snap.card()` (`bridge/src/mtgtable/Snap.java:347-368`) reads only those, so **there is no
leak in the code as it stands** — but it is one accessor away, and nothing in the code says
so.

What must never be emitted unless `cv.canFaceDownBeShownTo(me)`:
`getAlternateState()`, `getBackup()`, `getLeftSplitState()`, `getRightSplitState()`,
`getText()`, `getOracleName()`, `getCurrentState().getOracleText()/getRulesText()/
getAbilityText()`, and any ability list computed from
`Card.getAllPossibleAbilities(player, …)` (`Card.java:7417-7432` adds the turn-face-up /
manifest-up / cloak-up abilities, whose descriptions name the card).

`CardView.getHiddenId()` (`CardView.java:1141-1150`) is assigned a fresh
`game.nextHiddenCardId()` every time a card turns face down (`Card.java:614-617`) and is
used only for the display string `"Face-down card (H7)"`. The **`CardView` id does not
change**, and ids survive zone changes (§0.6). Accepted, documented residual: a client that
remembered a name for id 42 can identify a later face-down card 42. Forge's desktop client
is strictly worse (it holds the real `CardView`); our mitigation is the reducer rule.

`Card.toString()` → `getView().toString()` (`Card.java:5551-5557`) handles face-down
correctly (`CardView.java:1222-1231` → `"Face-down card (H…)"`), which is why the engine's
own prompt strings do not leak morphs. They *do* leak library and opponent-hand cards — §4.

### P9 — mind-slave and controlled-while-searching

`CardView.java:675-679` and `:697-701`: if the viewer is the `MindSlaveMaster` of the card's
controller, the predicate re-runs as that controller. `PlayerView.MindSlaveMaster` is written
by `Player.addController` (`Player.java:2532-2543`) / `removeController` (`:2552-2562`).

Two sources: Mindslaver-style effects, and **library searches you control**:
`ChangeZoneEffect.java:1069-1078` calls `player.addController(controlTimestamp,
searchControlPlayer.getValue())` from `Player.getControlledWhileSearching()`
(`Player.java:2569-2573`) — Opposition Agent and friends. For the duration, the searcher's
`canBeShownTo` inherits the searched player's permissions, including their **hand**.

**Channel.** `state`, correctly. A `state` emitted during that window legitimately shows the
searched player's hand to the searcher. Nothing to change; just do not be surprised by it,
and do not let the redaction checker call it a leak (see §7's "ever-revealed" rule).

### P10 — the dev-mode `mayLookAtAllCards` cheat

`PlayerControllerHuman.java:115, 165-167, 2853-2858`, consumed only at
`AbstractGuiGame.java:279`. We never call `IDevModeCheats`, and `Snap` never calls `mayView`,
so this is closed by construction. Keep it closed: add `mayView(` and `mayLookAtAllCards` to
the `bridge/` grep lint alongside the existing `getDecks()` ban.

### P11 — tokens and copies

* Tokens live on the battlefield → `canBeShownTo` true → no hidden-info question. They have
  ids but no `art.json` entry; that is an M4 art problem, not a redaction problem.
* Clones: `TrackableProperty.Cloner` is a **string** `"<real name> (<id>)"`
  (`CardView.java:1040`); `MergedCards` is a string of merged card names+ids
  (`:1044-1052`); `CloneOrigin` and `PaperCardBackup` are the source card. All are
  battlefield-public today, but `getBackup()` survives a later `turnFaceDown` (§1.3). Emit
  none of them.
* `CardView.getChosenCards()`, `getImprintedCards()`, `getExiledCards()`,
  `getEncodedCards()`, `getMergedCardsCollection()`, `getPairedWith()`,
  `getEntityAttachedTo()` **[jar]** are all `CardView` references that can point **into a
  hidden zone** (an imprinted card in exile face-down, a remembered library card). Emitting
  **ids only** is safe; emitting nested card objects is not. Protocol §3.2 already does the
  right thing with `attachedToId` / `attachmentIds`.

### P12 — cards the viewer owns but does not control

On a control change, `GameAction.controllerChangeZoneCorrection` (`GameAction.java:994-1011`)
**moves the card into the new controller's battlefield zone**, so it appears under
`players[controller].zones.battlefield` with `owner != controller`. Battlefield is public;
no redaction question. The point for the client: `owner` and `controller` genuinely differ,
and the array a card sits in is keyed by **controller**, not owner.

The opposite case — you own a card in an opponent-controlled *hidden* zone (Gonti, Thief of
Sanity exiling your card and letting them cast it) — is handled by `case Exile` + the
`WithMayLook$` mechanism of P7: they may look, you may not. Correct per the rules.

---

## 3. `openZones` / `tempShowZones` / `restoreOldZones` / `hideZones` — the correction

**None of these four methods reveals anything.** Evidence:

* `PlayerZoneUpdate` is `(PlayerView player, Set<ZoneType> zones)` and `PlayerZoneUpdates` is
  an `Iterable<PlayerZoneUpdate>` — **[jar]**, `javap forge.player.PlayerZoneUpdate` /
  `…PlayerZoneUpdates` show no card accessor of any kind.
* The desktop implementation only opens/closes `FloatingZone` windows:
  `CMatchUI.java:584-611` (`tempShowZones`), `:613-625` (`hideZones`), `:1362-1381`
  (`openZones`, which itself just builds a `PlayerZoneUpdates` excluding Battlefield, Hand
  and Stack and delegates to `tempShowZones`), `:1383-1386` (`restoreOldZones` = `hideZones`).
  The panel then renders each card through `mayView` → `canBeShownTo`.
* `AbstractGuiGame.updateZones` (`:943`) is an empty body.

**Callers (the two packages the brief asks about):**

| caller | thread | purpose |
|---|---|---|
| `TargetSelection.java:184` `openZones(...)`, `:190` `restoreOldZones(...)` | game thread | open the zone panels containing legal targets |
| `InputSelectEntitiesFromList.java:66-67` `updateZones` + `tempShowZones` | **EDT** (`FThreads.invokeInEdtNowOrLater`) | show the zones you may click in |
| `InputSelectEntitiesFromList.java:170` `hideZones` | EDT | close them |
| `InputSelectTargets.java:79` `updateZones` | EDT | refresh |
| `PlayerControllerHuman.java:957-958` `updateZones` + `tempShowZones`, `:966` `hideZones` | **EDT** | the floating opponent-hand reveal of P3 |

Forge's netplay does round-trip `tempShowZones` and `openZones`
(`RemoteClientGuiGame.java:384-386`, `:524-526` use `syncAndSendAndWait`) but only because
the **return value** is the token later handed to `hideZones`/`restoreOldZones`. It carries
no user decision.

### Protocol change

Delete `ask` kind **`open_zones`**. Replace with a field on the non-blocking `input` body:

```jsonc
"openZones": [ { "playerId": 1, "zones": ["graveyard", "exile"] } ]
```

and implement in `WireGuiGame`:

```java
@Override public Iterable<PlayerZoneUpdate> tempShowZones(PlayerView c, Iterable<PlayerZoneUpdate> z) {
    pushInputHint(z);          // non-blocking; may be called on the EDT
    return z;                  // echo: this is the token hideZones will get back
}
@Override public void hideZones(PlayerView c, Iterable<PlayerZoneUpdate> z) { clearInputHint(); }
@Override public PlayerZoneUpdates openZones(PlayerView c, Collection<ZoneType> zones,
                                             Map<PlayerView,Object> players, boolean backup) {
    PlayerZoneUpdates u = new PlayerZoneUpdates();
    for (PlayerView p : players.keySet())
        for (ZoneType z : zones)
            if (z != ZoneType.Battlefield && z != ZoneType.Hand && z != ZoneType.Stack)
                u.add(new PlayerZoneUpdate(p, z));
    tempShowZones(c, u);
    return u;
}
@Override public void restoreOldZones(PlayerView p, PlayerZoneUpdates u) { hideZones(p, u); }
```

That mirrors `CMatchUI` exactly, blocks nothing, and removes one of the twelve ask kinds.
**Eleven kinds, fifteen blocking methods.**

---

## 4. The text channels

`CardView.toString()` (`CardView.java:1215-1233`) returns
`"<zoneText> <translated name> (<id>)"` for any card in any zone, gated on nothing except
face-down-ness. `Card.toString()` delegates to it (`Card.java:5551-5557`). Everything below
is built from those.

| channel | source | risk | rule |
|---|---|---|---|
| `input.prompt` | `InputSelectTargets.showMessage` (`InputSelectTargets.java:85-112`) appends `sa.getHostCard().toString()` and each chosen target's `toString()` | names a targeted **library** card or an opponent-hand card | scan the prompt for `"(<id>)"` substrings whose id is a card the viewer may not see and replace with `???`, **or** accept the risk and document it. Targets are almost always public; this is a low-frequency, high-embarrassment leak. |
| `ask.prompt` | `willPutCardOnTop` / `orderAttackers` / `insertInList` build titles with `CardTranslation.getTranslatedName(view.getName())` (`PlayerControllerHuman.java:859, 903, 916, 1092`) | only names cards the viewer is being shown anyway | safe |
| `stack[].text` | `StackItemView.getText()` = `SpellAbilityStackInstance.getStackDescription()` (`StackItemView.java:120-125`) → `SpellAbility.getStackDescription` (`SpellAbility.java:1041-1050`) uses `getHostCard().getDisplayName()` | a face-down (morph) spell's host is a face-down LKI copy (`Spell.java:180-186` `turnFaceDownNoUpdate`), so the name is `""` | verify empirically at M5 with a morph; until then, when `sourceCard.isFaceDown() && !sourceCard.canFaceDownBeShownTo(me)`, emit `text: "Face-down creature spell"` |
| `events[].cast.text` | same string | same | same |
| `GameEventAddLog.message` **[jar]** | `Player.java:1426-1432` (`"X discards <card>"`), `CostReveal.java:141-153`, `ChangeZoneEffect.java:745-747`, `MagicStack.java:295,324`, `Combat.java:516`, `EncodeEffect.java:69`, `SetStateEffect.java:191-200`, `ClashEffect.java:149`, `CounterEffect.java:304`, `AlterAttributeEffect.java:128-131` | free-form, never redacted | **drop the event entirely**, as protocol §3.6 rule 4 already says. Do not build an M1 "game log" pane out of it. |
| `GameEventRandomLog.message` **[jar]** | free text | same | drop |
| `GameEventSpellAbilityCast.targetDescription()` **[jar]** | `computeTargetDescription` joins `TargetChoices.toString()` | names targets, including library cards | **never emit**; `stack[].targetCardIds` carries the same information as ids |
| `GameEventSpellResolved.stackDescription()` **[jar]** | `spell.getStackDescription()` | as `stack[].text` | never emit; the `resolved` event is `{cardId, fizzled}` |
| `GameEventCardModeChosen.cardName` **[jar]** | `ChooseGenericEffect.java:123,131` uses `host.getName()` — the host is on the stack or battlefield | public | safe, but if you ever add a `mode` event kind, emit `sourceCardId`, not `cardName` |
| `CardView.getText()` | `CardView.java:840-900` splices in `Remembered` (`:871`), `MergedCards`, `PairedWith`, `NamedCard` | `Remembered` is built by `sb.append(o)` over arbitrary remembered objects (`CardView.java:556-572`), which can be cards in hidden zones | **ban `getText()` in `bridge/` outright.** Protocol §3.2 has no card-text field; keep it that way. Ability text comes from `SpellAbilityView.getDescription()` (`SpellAbilityView.java:53-58`), and only for cards the viewer may see. |
| `GameView.getGameLog()`, `getDeck(pv)`, `getGame()` (`GameView.java:172-177, 255, 61`) | the whole unredacted log / full deck lists / the live `Game` | total | ban all three in `bridge/` |
| `GameEventSubgameStart/End(Game, String)` **[jar]** | carries a whole `Game` | total | drop |

---

## 5. Review of `docs/protocol.md` §3.6 `events`

### 5.1 Does any listed kind reveal a card identity?

No — with two caveats.

Every kind in the §3.6 table carries ids, ints, enums and booleans. All the accessors are
**[jar]**-confirmed as records with exactly the components §3.6's implementation note
claims. The only strings are:

* `cast.text` — see §4 (morph caveat).
* `phase` and `turn` — `PhaseType`/int, safe.
* `counters.counter` — a `CounterType` name, safe.
* `damage.damageType` — a `DamageType` enum name, safe.
* `outcome.winner` — §3.6 says "map `winningPlayerName()` to an id by name". Note
  `GameEventGameOutcome(int lastTurnNumber, List<String> outcomeStrings, String
  winningPlayerName, String matchSummary)` **[jar]** — emit the mapped id and **drop
  `outcomeStrings` and `matchSummary`**, which are free text.

### 5.2 Is a `zone` event itself a leak?

The brief's example — *"a `zone` event library→hand for the opponent reveals that a draw
happened"* — is public information (CR 121.4: everyone sees a draw). The interesting cases:

| movement | what the id tells you | verdict |
|---|---|---|
| opp. `library` → `hand` (draw, tutor) | a previously unseen id now exists in their hand | already implied by `hand.count` going up; the id is needed to render the card back. **Safe.** |
| opp. `hand` → `library` (bottom / shuffle-in) | that specific card object left their hand | you already saw the stub leave. **Safe.** |
| opp. `library` → `exile` face-down (foretell) | a new id in exile | you can see a foretold card exists. **Safe.** |
| any card → a zone where the viewer may not see it | the id persists (ids are stable, §0.6) | **Safe on the wire; dangerous in the reducer.** See §8.R1. |
| `battlefield` → `library` (e.g. "put on top of owner's library") | the id and the fact | public per the rules. **Safe.** |

So: ids alone leak nothing beyond zone counts — *provided* the client never retains a name
for an id whose latest serialisation is `hidden: true`.

### 5.3 Recommended additions

| new `kind` | Forge event **[jar]** | body | why |
|---|---|---|---|
| `scry` | `GameEventScry(player, toTop, toBottom)` | `player`, `toTop`, `toBottom` | counts only; genuinely public; currently invisible in our stream |
| `surveil` | `GameEventSurveil(player, toLibrary, toGraveyard)` | `player`, `toLibrary`, `toGraveyard` | same |
| `phased` | `GameEventCardPhased(card, phaseState)` | `cardId`, `phasedOut` | battlefield-public, and phasing is otherwise invisible in `state` |
| `foretold` | `GameEventCardForetold(activatingPlayer)` | `player` | carries no card at all — safe by construction, and the only cue that a foretell happened |

### 5.4 Recommended explicit bans (add to §3.6 rule 4)

`GameEventAddLog`, `GameEventRandomLog`, `GameEventSubgameStart`, `GameEventSubgameEnd`,
`GameEventAnteCardsSelected`, `GameEventZone`. And, as a field-level ban:
`GameEventSpellAbilityCast.targetDescription()`, `GameEventSpellResolved.stackDescription()`,
`GameEventGameOutcome.outcomeStrings()/matchSummary()`.

**Correction to §3.6 rule 4:** `GameEventZone` is *not* payload-less in 2.0.14 — **[jar]**
shows `zoneType()`, `player()`, `mode()`, `card()`, `sa()`. It is still right to drop it
(`GameEventCardChangeZone` covers real movements; `GameEventZone` also fires from
`Player.updateFlashbackForView`, `Player.java:309-311`, which would broadcast that a library
card became activatable). Fix the parenthetical. `GameEventCardDestroyed()`,
`GameEventCombatChanged()`, `GameEventTokenCreated()`, `GameEventFlipCoin()`,
`GameEventRollDie()`, `GameEventTurnEnded()` **are** genuinely payload-less **[jar]** — that
part of the note is right.

---

## 6. Protocol changes required before M3

1. **§3.3 — the redacted stub gains `owner`.** `{id, zone, owner, controller, hidden:true}`.
   `canBeShownTo`'s `case Hand` compares controllers (`CardView.java:646-650`) while zone
   arrays are keyed by the zone's player; without `owner` the client cannot tell whose card
   it is looking at when they diverge. Five keys, still nothing identity-bearing.
2. **§3.2 — a face-down card gets an explicit shape.** Add
   `"faceDown": true` (already present) and a nullable
   `"alt": {name, manaCost, types, power, toughness} | null`, populated **only** when
   `cv.isFaceDown() && cv.canFaceDownBeShownTo(me)`. Also: when `faceDown` is true and the
   zone is not `battlefield`/`stack`, `power`/`toughness`/`types` must be `null`, matching
   `CardStateView.getType()`'s own guard (`CardView.java:1348-1353`).
3. **§3.4 — libraries carry revealed cards.**
   `"library": { "count": 21, "cards": [ /* only canBeShownTo(me) === true */ ] }`.
   Invariant: `library.cards` never contains a `hidden: true` object, and
   `library.cards.length <= library.count`. This is the only way P6 is renderable.
4. **§5.1 — delete `open_zones`.** Move it to `input.openZones` (§3).
5. **§5.1 — `choose_list` documents `min === -1 && max === -1`** as "reveal; acknowledge
   only; answer `[]`". That is what `AbstractGuiGame.reveal` produces
   (`AbstractGuiGame.java:785-788`).
6. **§5.1 — `confirm` gains `cardId` and `card`.** `IGuiGame.confirm(CardView c, String
   question, boolean defaultIsYes, List<String> options)` **[jar]** is used for surveil's
   single-card case, `willPutCardOnTop`, and `confirmAction(..., cardToShow, ...)`. The card
   is usually a **library** card, so `cardId` alone is unresolvable — ship the serialised
   card. Same for `options` (it is the same Forge call with a non-empty `options` list).
7. **§5.1 — every option list gains an optional `card`.**
   `options: [{ id, label, kind, card? }]` for `choose_list` / `choose_entities` / `order` /
   `manipulate_list`. `label` alone throws away the art, P/T and cost the M4/M5 UI needs, and
   forces a second, non-redacting stringifier into existence. The `card` field is the output
   of the one function; `label` is derived from it (`"???"` when `hidden`).
8. **§5.1 — `choose_entities.delayedReveal` gets a shape:**
   `{ owner, zones: [...], messagePrefix, cards: [Card] }`.
9. **§4 — `input.focusCardId` becomes `input.focusCard: Card | null`** (or gains it
   alongside). `IGuiGame.setCard(CardView)` and `setPanelSelection(CardView)` **[jar]** are
   pushed with cards that are frequently *not in the snapshot* — see
   `PlayerControllerHuman.java:1049-1052` (surveil), `:1089-1093` (`willPutCardOnTop`),
   `:700` (`chooseSingleSpellAbility`).
10. **§9 — new invariant 10.** "A `hidden` card replaces; it never merges. A reducer that
    keeps fields from an earlier, un-redacted serialisation of the same id is a leak."

---

## 7. `Snap.java` — checklist (M1 hardening, M2/M3 completion)

The file at `bridge/src/mtgtable/Snap.java` is already correct on the main line
(`:333-343` gates on `canBeShownTo`; `:292-294` makes the library a bare count). These are
the deltas.

**S1. Add the second predicate.** In `card(...)`, after the `canBeShownTo` gate:

```java
final boolean fd  = cv.isFaceDown();
final boolean alt = fd && cv.canFaceDownBeShownTo(viewer);   // CardView.java:688-704
```

Emit `alt` fields from `cv.getAlternateState()` **only when `alt` is true**. Everywhere
else read `cv.getCurrentState()` exclusively.

**S2. Ban the identity accessors with a comment and a compile-time-visible list.** Put this
at the top of `card(...)`:

```java
// NEVER, for any card, without canFaceDownBeShownTo(viewer):
//   getAlternateState() getBackup() getLeftSplitState() getRightSplitState()
//   getText() getOracleName() getCurrentState().getOracleText()/getRulesText()/getAbilityText()
// NEVER, for any card, full stop:
//   toString() getCloner() getMergedCards() getRemembered() (via getText())
//   GameView.getGameLog() GameView.getDeck() GameView.getGame()
//   AbstractGuiGame.mayView() / mayFlip() / IGameController.mayLookAtAllCards()
```
and enforce it in `tools/check-forge.sh` (or a new `tools/lint-bridge.sh`) with a grep over
`bridge/src`, next to the existing `getDecks()` ban.

**S3. Suppress P/T and types for a face-down card outside Battlefield/Stack.** The 2/2
Creature comes from `CardUtil.getFaceDownCharacteristic` (`CardUtil.java:192-210`) and is a
Forge artifact; `CardStateView.getType()` already returns `CardType.EMPTY` there
(`CardView.java:1348-1353`) but `getPower()/getToughness()` do not.

**S4. Null-safety in the redacted branch.** `getController()` is `null` for zone-less views
(the synthetic pile headers of `PlayerControllerHuman.java:2516-2530` are
`new CardView(Integer.MIN_VALUE, null, "-- Pile 1 (3 cards) --")` — id negative, tracker
null, zone null, controller null). `Snap.java:339` already uses `nInt(...)` with a null
guard; extend the same care to `getOwner()` and to `getZone()`.

**S5. Treat `getZone() == null` as a warning.** `CardView.java:626` is fail-open. Any card
Snap serialises should belong to a zone; log `UNZONED <id>` once per game if not.

**S6. `Snap.state()` must throw on `viewer == null`,** not rely on
`canBeShownTo(null) == false` (`CardView.java:623`) — that turns a configuration bug into a
silently fully-redacted, unplayable game.

**S7. Never call `canBeShownToAny`.** `CardView.java:616-617` returns `true` for an empty
viewer set.

**S8. One function, two entry points.** Add a public-to-the-package
`static void card(JsonOut, CardView, PlayerView)` **and**
`static String label(CardView, PlayerView)` that returns `"???"` when
`!canBeShownTo(viewer)` and `"Face-down card"` when face-down-and-not-flippable. Every
`ask` option label in `WireGuiGame` goes through `label(...)`; nothing calls `getName()` or
`toString()` directly. This is the leak that will actually happen otherwise — the option
label, not the card object.

**S9. `library` gains the revealed subset** (protocol change 3):

```java
o.key("library").obj().n("count", p.getZoneSize(ZoneType.Library));
o.key("cards").arr();
for (CardView cv : p.getLibrary())          // PlayerView.getLibrary(), PlayerView.java:431
    if (cv.canBeShownTo(viewer)) card(o, cv, viewer);   // never a stub
o.end().end();
```
Walking the opponent's library and discarding 99% of it is cheap and is the *only* correct
way to catch P6; do not try to shortcut it with "only the top card".

**S10. Abilities.** When `WireGuiGame` fills `abilities[]` (the `// Always empty in M1`
comment at `Snap.java:405-411`), compute them from
`Card.getAllPossibleAbilities(mePlayer, true)` **only for cards where
`canBeShownTo(me)` is true**, and drop the turn-face-up / manifest-up / cloak-up abilities
(`Card.java:7417-7432`) unless `canFaceDownBeShownTo(me)`.

**S11. Do not emit a `flashback` zone.** `PlayerView.getFlashback()` (`PlayerView.java:419`)
is derived and contains library cards (§P6); its members are already in
`library`/`graveyard`/`exile` under their real zone.

**S12. Events: ids only, and drop the string components.** `Snap.java:565-680` already maps
by `e.card().getId()`. Add explicit `// not emitted:` comments for
`targetDescription()`, `stackDescription()`, `outcomeStrings()`, `matchSummary()` so a later
reader does not "improve" the mapping.

---

## 8. `WireGuiGame.java` — checklist (M2/M3)

**W0. Bootstrap, before the first game:**

```java
FModel.getPreferences().setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, false);  // §0.3, §P5
```
`setPref(T, boolean)` is a default method on `IPreferences` **[jar]**; `FPref
.UI_SELECT_FROM_CARD_DISPLAYS` is a public static field on `ForgePreferences$FPref`
**[jar]**. Do **not** call `prefs.save()` — in-memory is enough and saving writes to
`var/forge/`. Also leave `IGuiBase.isLibgdxPort()` returning `false`: setting it true
changes `mayView` to reveal everything after the game ends (`AbstractGuiGame.java:275-277`)
and reroutes half a dozen unrelated code paths.

**W1. Every card that crosses the wire goes through `Snap.card`/`Snap.label`.** That
includes every `ask` option list, `delayedReveal.getCards()`, `focusCard`, `assign_damage`
targets, `manipulate_list.cards`, and `sideboard`.

**W2. Per-method reveal contract.** For the fifteen blocking members plus the reveal-adjacent
pushes:

| `IGuiGame` member | reveals | ask kind | redaction note |
|---|---|---|---|
| `getAbilityToPlay(CardView, List<SpellAbilityView>, ITriggerEvent)` | one card you clicked | `ability_menu` | labels from `SpellAbilityView.getDescription()`; include `Snap.card` for the host |
| `confirm(CardView c, …)` | **`c`, often a library card** | `confirm` | ship `card` (protocol change 6) |
| `showConfirmDialog` / `showOptionDialog` / `showInputDialog` | nothing | `confirm`/`options`/`text` | — |
| `getChoices(msg, min, max, choices, selected, display)` | **anything**: `CardView`, `PlayerView`, `SpellAbilityView`, `CardStateView`, `CardFaceView`, `ReplacementEffectView`, `StaticAbilityView`, `CostPart`, `String`, `Integer`, `PaperCard` | `choose_list` | dispatch on type; for any `T implements IHasCardView` gate the label on `getCardView().canBeShownTo(me)`; **`min===-1 && max===-1` is the reveal case** |
| `one` / `oneOrNone` / `many` / `reveal` / `getInteger` / `insertInList` | via `getChoices`/`order` (`AbstractGuiGame.java:761-895`) | `choose_list` / `order` | note `many` with `max>1` delegates to `order` with **negative** `min`/`max` (`:868-875`) |
| `order(title, top, min, max, src, dest, ref, sideboarding, remember)` → `OrderResult` | the cards being ordered | `order` | answer must also carry `rememberDecision` — `OrderResult` is `record(List<T> ordered, boolean rememberDecision)` |
| `chooseSingleEntityForEffect(title, options, DelayedReveal, isOptional)` | options **+ delayedReveal** | `choose_entities` (min=max=1) | both lists through `Snap.card` |
| `chooseEntitiesForEffect(title, options, min, max, DelayedReveal)` | same | `choose_entities` | same |
| `manipulateCardList(title, cards, manipulable, toTop, toBottom, toAnywhere)` | **the whole library** when the pref is on | `manipulate_list` | with W0 this only fires for `arrangeForMove`; still route `cards` through `Snap.card` |
| `assignCombatDamage(attacker, blockers, dmg, defender, overrideOrder, maySkip)` | battlefield only | `assign_damage` | key `-1`/`null` = defender (`PlayerControllerHuman.java:302-310`) |
| `assignGenericAmount(effectSource, Map<Object,Integer>, amount, atLeastOne, label)` | battlefield/players; keys may be `Byte` for "mana of any combination" | `assign_amount` | handle the `Byte` key case |
| `sideboard(CardPool sideboard, CardPool main, String message)` | your own deck | `sideboard` | `PaperCard`, not `CardView`; no redaction needed, but never emit the *opponent's* pool (you are never given it) |
| `tempShowZones` / `openZones` | **nothing** | — | answer locally (§3) |
| `hideZones` / `restoreOldZones` | — | — | clear the hint |
| `setCard` / `setPanelSelection` | one card, possibly from a hidden zone | → `input.focusCard` | `Snap.card` |
| `updateRevealedCards(TrackableCollection<CardView>)` | the accumulated reveal set | → `notice` or ignore | called *inside* the tempShow window (`PlayerControllerHuman.java:970`), so the names are legitimately available |
| `showPromptMessage(PlayerView, String, CardView)` | text + a card | → `input.prompt` + `input.focusCard` | see §4 on prompt text |
| `setSelectables(Iterable<CardView>, min, max)` | ids only | → `input.selectable` | **`AbstractGuiGame.setSelectables` accumulates** (`:347-353`) and is only reset by `clearSelectables()` (`:355-359`); read the accumulated set after `super`, do not assume one call = one selection |
| `setHighlighted(Iterable<GameEntityView>, boolean)` | ids only | → `input.highlighted` | may contain players as well as cards |
| `setWeaklySelectable` | ids only | → optional | it is a `Multiset` with a strength count (`:387-406`) |

**W3. Answering `tempShowZones` on the EDT must not block.** It is called from
`FThreads.invokeInEdtNowOrLater` (`PlayerControllerHuman.java:955`,
`InputSelectEntitiesFromList.java:65`). If it goes through `ReplyPool`, the EDT parks and
the next `input` frame never ships → an apparent hang with no error. Return the argument.

**W4. Emit a `state` at the top of every blocking method,** before the `ask`. That is the
snapshot in which the temporarily-revealed cards are visible; after `endTempShowCards()` the
next `handleGameEvents` snapshot re-redacts them. Both are correct.

**W5. Do not override `mayView` or `mayFlip`.** Leave `AbstractGuiGame`'s implementations
alone and never call them; they exist for Forge's own renderers.

**W6. Log every legitimate reveal.** When `card(...)` emits a full card that lives in a zone
where `ZoneType.isHidden()` **[jar]** is true and whose controller is not the viewer, write
one line `REVEAL <id> <zone> <owner>` to `var/*.log`. Over ten games that log is the ground
truth for whether the reveal surface behaves as this document claims, and it is the input to
the checker's "ever-revealed" set (§9.A6).

---

## 9. `tools/check-redaction.mjs` — assertions

Input: one `fixtures/games/*.jsonl`. Line 0 is the session header; `seat` is the viewing
player id (protocol §8.1). Walk `s2c` frames in file order, maintaining state.

**Structural (stateless, per frame):**

* **A1.** For every card object anywhere in the frame, if `hidden === true` then its key set
  is exactly `{id, zone, owner, controller, hidden}` — no more, no less. A `hidden` object
  carrying any sixth key is a leak.
* **A2.** For every card object anywhere, `hidden !== true` ⇒ it has a `name` key. (Catches
  a half-redacted third shape sneaking in.)
* **A3.** `state.players[].zones.library.cards`, when present, contains **zero** objects with
  `hidden === true`, and `cards.length <= count`.
* **A4.** For every player `p !== seat`: every object in `p.zones.hand.cards` has
  `hidden === true`, **unless** its id is in the ever-revealed set (A6).
  `p.zones.hand.cards.length === p.zones.hand.count`.
* **A5.** No key named `name`, `oracleText`, `rulesText`, `abilityText`, `cardName`,
  `targetDescription`, `stackDescription`, `matchSummary` or `outcomeStrings` appears
  anywhere under `state.events`. (Protocol §3.6 rule 1, extended.)

**Temporal (the real test):**

* **A6. Name-before-reveal.** Maintain `everRevealed: Set<id>`, seeded empty. An id joins it
  when the id appears, in any frame, either (a) inside an `ask` body, or (b) in a public
  zone (`battlefield`, `graveyard`, `exile` with `faceDown !== true`, `command`, `stack`) of
  any player, or (c) in `seat`'s own `hand`, or (d) in a `library.cards` array, or (e) as
  `input.focusCard`. **Assert:** no `state` frame ever serialises a full (non-`hidden`) card
  belonging to a player other than `seat`, in a hidden zone (`hand`, `library`), whose id is
  not already in `everRevealed`. This is the assertion that would have caught every P1–P7
  regression.
* **A7. Monotonic redaction is allowed, silent un-redaction is not.** A card id may go
  `full → hidden` (tempShow ended) and `hidden → full` (a reveal started) freely — but a
  `hidden → full` transition for an opponent-owned card in a hidden zone must coincide with,
  or follow, an `ask` or a `REVEAL` in the same frame batch. Warn, do not fail, if it does
  not: P6 statics and P9 mind-slave legitimately produce it without an `ask`.
* **A8. Reducer contract (a `node --test` unit test, not a log check).** Feed `reduce()`
  a frame with card `{id:42, name:"Quantum Reduction", …}` then a frame with
  `{id:42, hidden:true, …}`. Assert the resulting `GameState` has **no** `name` for card 42.
  This is §0.6, and it is the one leak the log checker structurally cannot see.
* **A9. Face-down cards.** For every card with `faceDown === true` owned by a player other
  than `seat`: assert `alt === null || alt === undefined`, `name === "" || name === null`,
  and, when `zone !== "battlefield" && zone !== "stack"`, `power === null` and
  `toughness === null`.
* **A10. Prompt scan.** For every `input.prompt` and `ask.prompt`, extract every
  `(\d+)` id-in-parentheses and assert the referenced id is either unknown to the checker or
  in `everRevealed`. Report as a **warning** in M1–M3 (the engine builds these strings, we do
  not), escalate to a failure if §4's prompt filtering is implemented.
* **A11. Ask-kind coverage.** Assert every `ask.kind` seen is in the documented set and that
  no frame has `kind === "open_zones"` (deleted, §3).

**Cross-check:** run the checker over a `--seat 0` and a `--seat 1` recording of the *same*
seeded game and assert the two `everRevealed` sets differ. If they are identical, redaction
is not seat-dependent and something is wired to a constant viewer.

---

## 10. Residual risks, accepted

1. **Card ids are stable across zone changes and across face-down transitions.**
   (`GameAction.java:207` + `CardCopyService.java:53-55`; `Card.java:614-617` changes only
   the display-only `HiddenId`.) A client that remembers names by id can identify a morph it
   saw face-up. Mitigated by A8, not by `Snap`.
2. **Zone counts are information.** Library count, hand count and the id of a card moving
   into a hidden zone are all public in paper Magic. No mitigation needed.
3. **`input.prompt` may name a hidden card** (§4). Low frequency; documented; A10 warns.
4. **`stack[].text` for a morph is unverified.** §4 gives the defensive rule; confirm at M5.
5. **`ExtraHand` (Backup Plan) is invisible to its own owner** because `canBeShownTo` has no
   case for it (`CardView.java:666-667`). Forge's own client has the same hole. Out of scope.
6. **The frame log contains everything the seat legitimately saw**, including reveals that
   were momentary in the UI. That is intended (protocol §8.3) and is what makes a log safe to
   paste into a bug report — but it is *not* safe to paste an opponent's log, and
   `fixtures/games/*.jsonl` committed to git must be single-seat recordings.

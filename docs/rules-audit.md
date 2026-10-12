# The rules audit: where each answer's rule lives, and whether the bridge checks it

*Decision **D425**. Part 1 of the rules-integrity plan (`study/rules-integrity-plan.md`
on `pc-results`), written 2026-10-12 on the branch that closes its gaps
(`claude/rules-integrity-2`). The owner's words: "we are shipping a game that does
not follow the basic rules; fix the system, not the instance."*

**The question, for every ask kind (`docs/protocol.md` §5) and every input mode (§4):**
where does Forge 2.0.14 enforce the rule a player's answer must obey — the **engine**
(a game or input class that refuses a bad answer whatever the GUI is), a **desktop
dialog** (Swing code the wire replaced, so nothing enforces it for us), or
**nowhere** — and did the bridge re-check the client's answer before handing it to
Forge, as of `main` at `1f3cb22a` (M67 merged)?

**Method.** Forge's side: the `forge-2.0.14` tag's source read as prose, every
member named below confirmed with `javap -c -p` against the pinned jar
(`forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, sha256 `3c0a7c38…8e5dd9`).
Line numbers `PCH:n` are `forge-gui/…/player/PlayerControllerHuman.java`, `AGG:n`
`forge-gui/…/gamemodes/match/AbstractGuiGame.java`, at that tag. The bridge's side:
`bridge/src/mtgtable/WireGuiGame.java` (`WGG:n`) and `Ask.java` at `1f3cb22a`.

## Asks (protocol §5)

| ask | Forge's rule, and where it lives | bridge re-check at `1f3cb22a` | what an illegal answer did | verdict |
|---|---|---|---|---|
| `assign_damage` | **dialog**: `VAssignCombatDamage` (trample / divide-as-you-choose for the defender, lethal in order, exactly the total); `Combat.assignAttackersDamage` applies any map | `DamageRule` (M67, D424) | refused, re-asked with `reason` | **closed (M67)** |
| `assign_amount` | **dialog**: `VAssignGenericAmount` — OK enabled only at 0 left (`updateLabels`, `finish`), a target capped at its map value or the total (`assignAmountTo`: `at.max`), `atLeastOne` floors each target at 1. The engine checks only `getStillToDivide() > 0` (`PCH.chooseTargetsFor`, PCH:2484-2490): an **over-allocation passes**; a `null` result **NPEs** (`vResult.get`); a missing key unboxes `null` | none — `Ask.indexedAmounts` passes the map (WGG `assignGenericAmount`) | `{0:5,1:5}` on a divided 2 deals 10 | **GAP** |
| `choose_list` | **dialog**: `ListChooser` — OK only with `min ≤ selected ≤ max` (`SelListener.valueChanged`), a JList selection is a set of rows, so no duplicate and nothing outside the list; `min > 0` loops until OK (`show`). The engine trusts the list: `AGG.one` does `get(0)` (AGG:776-778) | `Ask.pick` drops out-of-range indices and keeps duplicates; no count check (WGG `getChoices`) | `[]` to a `one` throws `IndexOutOfBoundsException` on the game thread; `[0,0]` picks one option twice; `[99]` becomes "nothing" | **GAP** |
| `choose_entities` | **dialog**: single — `CMatchUI.chooseSingleEntityForEffect` → `one` / `oneOrNone` (a mandatory one cannot be skipped); many — `order(title, …, size−max, size−min, …)`, i.e. `DualListBox` (below) | single: first pick, extras ignored, `[]`/out-of-range → `null`; many: `Ask.pick` (WGG `chooseSingleEntityForEffect`, `chooseEntitiesForEffect`) | a mandatory search answered `[]` finds nothing; `[0,0]` takes one card twice; too many picks taken | **GAP** |
| `order` | **dialog**: `DualListBox` — items only move between the two lists (each once), OK only when the count left in `source` is in `[min, max]`, any count when `max < 0` (`_setButtonState`). The engine uses `ordered()` as given (PCH:1134-1158, 2327-2331) | `Ask.ordered` = `Ask.pick` (WGG `order`) | duplicates and short lists reach `orderMoveToZoneList` and the trigger order | **GAP** |
| `sideboard` | **dialog** for membership: `GuiChoose.sideboard` → `DualListBox(-1,-1)`, cards only move between main and side; **engine** for size: `PCH.sideboard` (PCH:235-279) re-asks while `|main| < min(|main|, format min)` or `|side| > format side max`, under `ENFORCE_DECK_LEGALITY` (default on), after an error dialog | `Ask.sideboardMain` = `Ask.pick`, duplicates kept (WGG `sideboard`) | `[0,0,0,…]` plays 40 copies of one card — the deck-size loop does not see it | **GAP** (membership); size re-asked with no reason on the wire |
| `text` (numeric) | **our superclass**: `AGG.getInteger` (AGG:820-864) loops until the string `isNumeric` and is in `[min, max]`; `null` is cancel | none, and the body carries no bounds | the same question again, with no reason and no bounds (M25, M29) | **partial** — never applied, never explained |
| `text` (free) | none needed: any string (2.0.14 has no reachable non-numeric caller, M25) | — | — | safe |
| `confirm` | any boolean; `null` is Forge's default (`RemoteClientGuiGame`) | a non-boolean is silently the default (WGG `confirm`) | a malformed answer plays the default | **malformed only** |
| `options` | index in range (`showOptionDialog`); no call site in 2.0.14 (M22) | out of range → `defaultOption` | the default played | **malformed only** (unreachable) |
| `ability_menu` | the **engine's** list: `InputPassPriority.onCardSelected` builds it with `getAllPossibleAbilities(player, true)` (unplayable ones removed when no mouse event, which the bridge never sends); `PCH.getAbilityToPlay` maps the view back through `spellViewCache` (PCH:214-227) | out of range → `null` = never mind (WGG `getAbilityToPlay`, `applyAsyncAbilityMenu`) | an id not offered is silently "never mind" | **malformed only** — and Part 2b's lone-ability shortcut (below) |
| `manipulate_list` | **dialog**: `ListCardArea` (unreachable while D13 holds, M23) | `Ask.reorder`: not a permutation → the input order; a card outside `manipulable` may still move | a fixed card moves | **GAP** (unreachable today) |

**Malformed answers.** Protocol §5.4 made "a malformed answer (wrong JSON shape)" the
same as `null`, so a client bug silently played Forge's default — for a mandatory
`choose_list` that is the first option, a choice the player never made. Every kind
above inherits that.

## Inputs (protocol §4) — every one is the engine's

Every act that answers an `input` reaches Forge through `IGameController`
(`PlayerControllerHuman` → `InputProxy` → the current `Input`), so the rule is the
input class's own and holds whatever the client sends. Each refusal comes back as
`notice{title:"Not selectable"}` (`selectCard` returning false, WGG `applyAct`).

| input / act | Forge's check (engine) | verdict |
|---|---|---|
| priority: `clickCard` / `clickAbility` (`InputPassPriority`) | `onCardSelected`: `getAllPossibleAbilities(player, true)`, each `canPlay()`; `selectAbility` resolves through the last menu's `spellViewCache` (PCH:2789-2796) | safe (engine) — but see Part 2b |
| declare attackers (`InputAttack`, `alphaStrike`) | `CombatUtil.canAttack` on every click (InputAttack:139-157, 238, 276); `PhaseHandler.declareAttackersTurnBasedAction` re-asks until `CombatUtil.validateAttackers` (javap: offsets 53/68) | safe (engine) |
| declare blockers (`InputBlock`) | `CombatUtil.canBlock` per click (InputBlock:62, 148, 183); `onOk` refuses while `CombatUtil.validateBlocks` reports an error (InputBlock:101-102) | safe (engine) |
| targets (`InputSelectTargets`) | `card.canBeTargetedBy(sa)`, the shared-type rules, `sa.canTarget(player)` (InputSelectTargets:171-200, 350) | safe (engine) |
| a choice from cards/entities (`InputSelectEntitiesFromList`, `InputSelectCardsFromList`) | `selectEntity` refuses anything outside `validChoices`; OK only with `hasEnoughTargets` | safe (engine) |
| convoke / improvise (`InputSelectCardsForConvokeOrImprovise`) | the input's own colour/creature checks | safe (engine) |
| mana payment (`InputPayMana*`, act `useMana`) | `ManaPool.tryPayCostWithColor`; the bridge holds the write behind `ActGuard` (D136) | safe (engine) |
| mulligans (`InputConfirmMulligan`, `InputLondonMulligan`, `InputChooseStartingHand`) | the London bottom count is the input's (`PCH.tuckCardsViaMulligan`) | safe (engine) |
| yes/no prompts (`InputConfirm`) | two buttons | safe (engine) |
| `undo` | `canUndoLastAction` (PCH:2698), `ActGuard` | safe (engine) |
| `setPhaseStop`, `yieldTo`, `setYield`, `concede`, `claimWin`, `newGame` | client affordances, not game rules (D19, D41, D42, D402) | n/a |

## Part 2b — a click that commits (not a rules gap, an affordance gap)

`WireGuiGame.getAbilityToPlay` (WGG:2925-2960) answers a **lone** ability itself, as
Forge's desktop does (`CMatchUI.getAbilityToPlay`: `abilities.size() == 1` →
`abilities.get(0)` when there is no mouse event): a click on Carrion Feeder
("Sacrifice a creature: put a +1/+1 counter") started the activation at once.
Forge's cost inputs never pick a sacrifice, discard or exile for the player
(`HumanCostDecision`: `CostSacrifice` / `CostDiscard` / `CostExile` raise an
`InputSelectCardsFromList`, with Cancel unless the cost is mandatory; a cost of the
card itself, and `CostPayLife`, ask a confirm), but a click that reaches the
input's `max` presses OK by itself (`InputSelectManyBase.refresh`), so the second
click of an exploration is a commitment. Closed in D427.

## The gaps, and where each is closed

| gap | closed by |
|---|---|
| `assign_amount`, `choose_list`, `choose_entities`, `order`, `sideboard`, `manipulate_list`, numeric `text`, and a malformed answer to any kind | **D426**, amendment **M68**: one checked-answer loop for every kind, each rule from the Forge code cited above |
| a lone ability activated on a click; a give-up cost a click commits | **D427**, amendment **M69** |
| proof that no illegal answer is ever applied | **D428**: `tools/adversary/`, in the gate |

## D424 — the bridge is the rules gate for combat damage (M67): Forge's dialog rule, checked on every `assign_damage` answer

*Branch `claude/assign-damage-gate`.* Amendment **M67**. Part 2 of the PC
session's rules-integrity plan (`study/rules-integrity-plan.md` on
`pc-results`), for the gap it proved; item 15 of `study/common-sense-pass.md`.

**2026-10-10**

**Context.** In the owner's game of 2026-10-10 (turn 23) Skyclave Apparition, a
2/2 with no trample, was blocked by Servo Token and Spirited Companion, and
ForgeCoach's "Assign 2 damage" dialog offered the defending player as a row; the
answer gave the player damage and Forge applied it ("Skyclave Apparition dealt 2
combat damage to Forge AI", 6 → 1). Forge's engine does not check a damage map:
`Combat.assignAttackersDamage` adds whatever `PlayerController.assignCombatDamage`
returns, and `PlayerControllerHuman.assignCombatDamage` returns what its GUI
returned. On the desktop the GUI is `forge.screens.match.VAssignCombatDamage`,
and **the rule lives in that dialog**: a click it does not allow is ignored, OK
is enabled only with every point assigned. The bridge replaced the dialog with
the wire's `ask: assign_damage` (protocol §5) and carried the ask, not the rule.
"No rules logic in the client" (README) was right; its other half — the bridge
is the rules gate, built from Forge's own rule code — was missing.

**The rule, as found** (javap `-c -p` on the pinned 2.0.14 jar,
`forge.screens.match.VAssignCombatDamage`, read beside Forge's `forge-2.0.14`
tag; nothing copied):

- the constructor: `attackerHasTrample = defender != null &&
  attacker.getCurrentState().hasTrample()`, `attackerHasDeathtouch =
  …hasDeathtouch()`, `attackerHasDivideDamage = …hasDivideDamage()`; the
  defender's row is added only when `attackerHasTrample ||
  (attackerHasDivideDamage && overrideCombatantOrder)`;
- `getDamageToKill(card)`: `max(0, card.getLethalDamage())` (Forge's
  `Card.getLethalDamage()`: toughness less damage and damage already assigned,
  0 once a deathtouch source assigned to it), a planeswalker's loyalty, and
  `min(lethal, 1)` when the attacker has deathtouch;
- `canAssignTo(card)`: walks the targets in order and refuses a target while an
  earlier one has less than lethal; `assignDamageTo` consults it for the
  defender always, and for a blocker only without `overrideOrder`; a divider
  skips it; it also refuses the first blocker less than lethal without
  `overrideOrder`;
- `checkDamageQueue()`: returns at once for a divider with `overrideOrder`;
  otherwise zeroes every later target (without `overrideOrder`) or the defender
  (with it) once a target is short of lethal;
- `finish()`: closes only when `getRemainingDamage() == 0` (or Skip, when
  `maySkip`); `initialAssignDamage(true)` is the Auto button.

Where the flags come from (`Combat.assignAttackersDamage`, same jar):
`overrideOrder = divideCombatDamageAsChoose || assigningPlayer !=
attackingPlayer || !legacyOrderCombatants` — true under today's rules (the
`LEGACY_ORDER_COMBATANTS` preference is off); "assign combat damage as though it
weren't blocked" (`StaticAbilityAssignCombatDamageAsUnblocked`) is a confirm
followed by the whole amount on the defender, before any dialog;
`"Trample:Planeswalker"` appends the planeswalker to the blockers and makes its
controller the defender. `PlayerControllerHuman.assignCombatDamage` asks the GUI
only for a trampler with a defender, two or more blockers, a divider with
`overrideOrder`, or trample over planeswalkers; a null map back makes `Combat`
re-queue the attacker ("assign another first") — for a lone attacker, the same
question again, forever; for a blocker's damage, a NullPointerException.

**Decision.**

- **`mtgtable.DamageRule`** is that rule with no Forge types: `of(total,
  lethal[], labels[], overrideOrder, trample, divide, hasDefender)`,
  `refusal(map)` (null when legal, else a sentence), `auto()`. A legal map:
  exactly `total`, no negative amount, no index outside the targets; a divider
  with `overrideOrder` splits freely; without `overrideOrder` a target takes
  damage only when every target before it has lethal; otherwise the blockers
  split freely and the defender takes damage only when every blocker has lethal.
  `defenderAllowed = hasDefender && (trample || (divide && overrideOrder))` —
  stricter than the dialog in one place: a divider's row with a null defender
  would put damage nowhere, so it is not allowed.
- **`WireGuiGame.assignCombatDamage`** reads the attacker's three keywords and
  each blocker's lethal through `Snap` (`assignerKeywords`, `lethal(cv,
  deathtouch)`), asks, checks, and **never applies a refused map**: it asks again
  under a new `askId` with `reason`, until the answer is legal or null. A null
  (the seat's own, a timeout, a disconnect, a malformed answer) is Forge's Skip
  when `maySkip`, once per attacker until an assignment is applied, and
  otherwise `auto()` — so a seat that answers null to everything still ends the
  step, and Forge never sees a null it would loop or crash on. When the game is
  over, closed or conceded mid-ask, a refused answer becomes `auto()`.
- **Wire (M67)**: `defenderAllowed: boolean`, `reason: string | null` (null on a
  first asking); `targets[].lethal` becomes the dialog's lethal damage
  (deathtouch, planeswalkers and damage already assigned included). `total`
  already existed.

**Alternatives rejected.**

- *Hide the defender in the client only* (ForgeCoach's half, shipped beside
  this): a client that does not hide it, or a scripted seat, could still cheat;
  the engine must not depend on the client being honest.
- *Clamp an illegal map into a legal one* (move the defender's share onto the
  last blocker): silently plays a different move than the player chose. A
  refusal with a reason lets the player choose again.
- *Re-ask under the same `askId`*: §5 makes an `askId` unique for the life of a
  connection and the reply pool completes each once; the M25 `text` loop
  already re-asks under new ids, and so does this.
- *Validate in `Ask.damageAssignment`*: that is the marshalling, tested on its
  own trap (index 0 vs `blockers.get(i - 1)`); the rule needs Forge reads.

**Evidence.** `AskSelfTest` (the rule's cases: the 2026-10-10 game itself,
trample, deathtouch, legacy order, divided as you choose, Auto);
`tools/ws-assign-probe.mjs` on the real engine (`docs/evidence/assign-probe.md`):
every illegal answer refused and re-asked with its reason, every legal one
applied exactly as answered; `tools/check-redaction.mjs` fails a log in which
an answer putting damage on the defender while `defenderAllowed` is false, or
not adding up to `total`, is followed by anything but a re-ask with a reason
(`fixtures/negative/redaction/m67-*`).

**Other asks whose rule may live only in a Forge dialog** (not fixed here; the
audit is Part 1 of the plan):

- `assign_amount` (`assignGenericAmount`: damage, counters, shields or mana
  divided among targets) — the jar has `forge.screens.match.VAssignGenericAmount`
  beside this dialog, so its total, `atLeastOne` and each target's `max` are
  enforced there; the bridge's `Ask.indexedAmounts` passes the map through
  unchecked.
- `choose_list` / `choose_entities` counts — `WireGuiGame.getChoices` sends
  `min`/`max` and `Ask.pick` drops out-of-range indices, but nothing checks the
  NUMBER of picks against `[min, max]` (Forge's list dialog does).
- `order`'s `min`/`max` (how many may stay in `source`) and `sideboard` (deck
  size between games) — enforced by Forge's dual-list dialog and deck editor,
  passed through by the bridge.
- Not a gap: the London mulligan's bottom count is an input
  (`PlayerControllerHuman.tuckCardsViaMulligan` → `InputLondonMulligan`), which
  the engine's input enforces.

## D413 — `state.playable`: the engine says what the seat may play from its graveyard, exile, hand and command zone (M61)

*Branch `c/zone-abilities`.* Amendment **M61**. It adds a key to the seat's `state`; no act, ask or input changes.

**2026-10-07**

**Context.** ForgeCoach's full-game playtest (its #101) found that a card in
the player's graveyard with an activated ability that is not a keyword could
not be used from the board: Cauldron Familiar ("Sacrifice a Food: return it to
the battlefield"), Seasoned Pyromancer and Unwilling Ingredient ("exile it from
your graveyard: …"). They are in the synergy, pauper and vintage cubes and came
up in most cube games. ForgeCoach #99 made the graveyard clickable for the
keywords M49 carries (flashback, unearth, escape…), but these abilities have no
keyword, and `Card.abilities` is `[]` on every card (M5). Forge itself would
take the click — `InputPassPriority.onCardSelected` plays any card the seat
clicks at priority — so the gap was knowing *which* card has something to play.

**Decision.**

- **Ask Forge the click's own question, and send the answer.** At the seat's
  priority, `Playables.of` walks the seat's own hand, graveyard, exile, command
  zone and the top card of its library and keeps each card for which
  `Card.getAllPossibleAbilities(player, true)` returns a non-mana spell or
  ability — the very list the click plays from: zone, timing, restrictions and
  non-mana costs checked by `canPlay`, alternative costs (flashback, escape,
  foretell, adventure) included, mana never predicted. Each entry is
  `{cardId, zone, abilities: [{abilityId, label, isSpell}]}`.
- **When.** Only at the seat's own priority: the rules engine's priority
  player, the frame's own `priority` naming the viewer (`Snap.state` checks
  the view it writes, so the two never disagree on the wire; Forge sets that
  view flag at the end of each `mainLoopStep`, before the next player is
  asked), the stack not resolving, and not the frame `ask` flushes before it
  goes out (`flushingForAsk`). Otherwise `null`. A seat writes the key on every frame;
  `RecordMatch` (no seat, comfort `null`) never does, so a file has it
  everywhere or nowhere and `check-redaction.mjs` holds that per file.
- **Where it is computed.** In `WireGuiGame`'s `Snap.Comfort` — the object that
  already answers the snapshot's seat-owned fields (M32–M36) — so it runs inside
  `Snap.state`, on the game thread, exactly where the snapshot is read. The
  refresh hop (D39) builds a `state` only while the engine is parked on this
  seat's input, so it reads the same thing; no new hop, and hard rule 3's list
  is unchanged. A failure is a `null` and a line on stderr, never a lost frame.
- **Hidden information.** The walk starts from the seat's own zones and keeps
  cards it owns. `Snap.state` gates every entry again — owner and controller
  are the viewer, the zone is one of the five, the card is not concealed and
  not in the frame's concealed set — and drops anything else with a
  `PLAYABLE DROPPED` line. The labels go through one function,
  `Snap.abilityLabel`, which the `ability_menu` options now share.
- **The act stays `clickCard`.** With more than one option Forge asks its own
  `ability_menu` (M14), as on the battlefield. `abilityId` is Forge's id in that
  frame — an alternative cost is a fresh copy each time — so it is not a handle
  for `clickAbility`, and the bridge does not register it.

**Rejected.**

- *Fill `Card.abilities`.* It is a per-card array the whole corpus has as `[]`,
  and M5 reserved it for every ability of every card, battlefield included; the
  question here is narrower (what a click on a card outside play would do now)
  and is only meaningful at the seat's priority.
- *Forge's "actionable highlights" (`PlayerControllerHuman.pushActionableCards`
  → `setWeaklySelectable`).* It exists in 2.0.14 behind
  `UI_SHOW_ACTIONABLE_HIGHLIGHTS`, but it rides on `input.weak` (whose meaning
  is "Auto would tap this"), mixes in the battlefield, and predicts mana through
  the AI (`AvailableActions.canAfford`), which a seat's click does not.
- *An oracle-text heuristic in the client.* ForgeCoach keeps one only as the
  fallback for an engine older than this.

**Consequences.** `docs/protocol.md` M61; `web/src/protocol.ts`
`PlayableCard` and its one reader `playableOf`; `tools/check-redaction.mjs`
(shape, per file, the seat's own full cards, only at its priority; five
`m61-*` controls); `tools/wire-drift.mjs` and `tools/fixture-multiset-diff.mjs`
treat the key as one a committed file may predate; gate step 12l,
`mtgtable.PlayableSelfTest`, on Forge's own scripts for the three cards of the
finding.

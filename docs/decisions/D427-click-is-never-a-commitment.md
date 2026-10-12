## D427 — a click is never a commitment (M69): a lone ability on the seat's permanent asks first; every give-up cost prompt has a Cancel that undoes the activation

*Branch `claude/rules-integrity-2`.* Amendment **M69**. Part 2b of the
rules-integrity plan (`study/rules-integrity-plan.md` on `pc-results`); item 17 of
`study/common-sense-pass.md`.

**2026-10-12**

**Context.** In the owner's game of 2026-10-10 a click on Carrion Feeder, meant to
see what it could do, activated "Sacrifice a creature: put a +1/+1 counter on
Carrion Feeder" at once, and the sacrifice was taken on the next click; the game
was lost on it. `WireGuiGame.getAbilityToPlay` answered a lone ability itself, as
Forge's desktop does (`CMatchUI.getAbilityToPlay`: one ability and no mouse event →
that ability), and Forge's cost input presses OK by itself when a click reaches its
`max` (`InputSelectManyBase.refresh`). The plan's requirements: a menu even for one
ability, with a cancel; no give-up cost chosen for the player; the cost prompt sent
with a Cancel that undoes the activation — verified per cost type on the real
engine, and a confirm BEFORE the activation for any cost that cannot be cancelled
once begun.

**Decision.**

- **The lone-ability shortcut keeps only what Forge can undo.** On the click's
  thread (the EDT, inside `act: clickCard`), a lone ability whose id is in
  `confirmFirstIds` raises the asynchronous `ability_menu` (M14) with one option
  instead of being returned; `null` is "never mind" and nothing is spent.
  `Playables.confirmFirst` writes the set on the game thread at the seat's
  priority (beside M63's `activatable`, the same walk): every ability
  `Card.getAllPossibleAbilities(me, true)` offers on a permanent the seat controls,
  except a mana ability `SpellAbility.isUndoable()` says Forge can undo — a land's
  tap. A Treasure's "{T}, Sacrifice: add one mana" is a mana ability Forge cannot
  undo, so it asks.
  The click thread reads integers only (hard rule 3). A card in the hand keeps the
  shortcut: a click casts it, and the cast's prompts carry a Cancel (measured:
  Bone Splinters).
- **What the cost prompts do, measured** (`tools/ws-cost-probe.mjs`,
  `decks/cost-probe.dck`, seed 3; `docs/evidence/cost-probe.md`): Forge chooses no
  give-up cost for the player, even with one legal option (Carrion Feeder alone on
  the battlefield: still a selection of one). Sacrifice a creature and discard a
  card are a card selection with OK disabled and Cancel enabled; sacrifice itself
  and pay N life are a Yes/No input; exile a card from the graveyard is an optional
  `choose_entities`. Cancel, No or `null` at ANY of them — including after the mana
  part was paid (Greed, Mind Stone) — undoes the whole activation: the board,
  life, mana and tapped state as before the click. **No cost type was found that
  cannot be cancelled once begun**, so no confirm before the activation is needed
  beyond the menu itself, which precedes every non-undoable activation on the
  battlefield. The pick, the Yes or the answer that completes the cost is the
  commitment, and it is the player's own explicit choice in a prompt that says
  what it costs.
- **No wire change**: the menu is M14's shape with one option. Readers that
  answer every menu (the board, the console, `AutoTransport`, `ws-auto-play`, the
  LLM seat — which clicks a permanent only for an activation it chose and answers
  the one-option menu with it) work unchanged.

**Alternatives rejected.** *Hold every click on a permanent behind a menu,
lands included*: tapping a land for mana is undoable and constant; a menu there
would be noise, and noise trains a player to click through menus. *A bridge-made
confirm on the cost input's committing click*: the click in a cost prompt is the
answer to a prompt that names the cost, and Cancel is beside it; intercepting it
would need a question Forge never asks, on the EDT. *Decide the shortcut from the
host card's zone on the click thread*: reading a view there breaks hard rule 3;
the snapshot's ids are already on hand.

**Evidence.** `PlayableSelfTest` (12l): Carrion Feeder's, Sakura-Tribe Elder's
and a Treasure's abilities ask first, a Forest's does not, the opponent's Feeder
is never the seat's. `ws-cost-probe` on the real engine: every lone ability on the
probe's permanents raised a one-option menu, `null` changed nothing, every cost
prompt offered Cancel and Cancel restored the board, a basic land still tapped at
once and `undo` gave it back (`fixtures/cost-probe/m69-frames.json` is cut from that
run).

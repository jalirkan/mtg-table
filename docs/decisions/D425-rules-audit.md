## D425 — the rules audit: every ask's rule found in Forge, and which ones the bridge must check

*Branch `claude/rules-integrity-2`.* Part 1 of the rules-integrity plan
(`study/rules-integrity-plan.md` on `pc-results`), approved by the owner: "we are
shipping a game that does not follow the basic rules; fix the system, not the
instance." The table itself is `docs/rules-audit.md`.

**2026-10-12**

**Context.** D424 (M67) closed one proven gap: Forge's engine applies whatever
combat-damage map the GUI returns, and the rule lived in a desktop dialog the wire
replaced. D424 listed the other asks whose rule might live only in a dialog. The
plan asked for the whole list, with evidence, before any more board work.

**Finding.** Read off the `forge-2.0.14` tag and confirmed with `javap` on the
pinned jar:

- **Every input mode is the engine's.** Acts reach the current `Input` through
  `IGameController`, and the input refuses what its rule forbids (`CombatUtil.canAttack`
  / `canBlock` / `validateBlocks`, `canBeTargetedBy`, `validChoices`, the mana pool).
  Nothing to add.
- **Six ask kinds keep their rule only in a Swing dialog**, and the bridge passed
  the answer through: `assign_amount` (`VAssignGenericAmount`; the engine even
  accepts an over-allocation of divided damage and NPEs on a null), `choose_list`
  (`ListChooser`; a `[]` to `AbstractGuiGame.one` throws on the game thread),
  `choose_entities` (`one` / `DualListBox`), `order` (`DualListBox`), `sideboard`'s
  membership (`DualListBox`: an index answered twice duplicates a card) and
  `manipulate_list` (`ListCardArea`, unreachable while D13 holds).
- **Numeric `text`** is enforced by our own superclass (`AbstractGuiGame.getInteger`
  loops), so an illegal number is never applied — but it is re-asked with neither a
  reason nor the bounds.
- **A malformed answer to any kind** was `null` (§5.4), which plays Forge's default
  — a choice the player never made.
- **Not a rules gap, an affordance gap**: a lone ability is activated on a click
  (`getAbilityToPlay`'s shortcut, Forge's desktop behaviour), and a cost input
  presses OK by itself when a click reaches its `max`.

**Decision.** The gaps are closed by D426 (M68: every ask kind's answer checked by
the rule above, refused and re-asked with a `reason`), D427 (M69: a click is never a
commitment) and D428 (the adversarial seat in the gate). The audit table is kept in
`docs/rules-audit.md` and is the place a new ask kind, or a new engine, is audited
first.

**Alternatives rejected.** *Audit by recordings alone* — nine of eleven kinds are
recorded, but a recording shows what a polite client sent, never what the bridge
would have accepted. *Trust the engine for kinds where it re-asks* — true for
`sideboard`'s size and numeric `text`, and both still reach the player as the same
question with no reason, so the wire carries the bounds and the reason too.

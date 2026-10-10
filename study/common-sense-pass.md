# ForgeCoach board — the common-sense pass (queued; Justin's items from live play, 2026-10-10)

Not started: Justin is credit-constrained. Each item is one bounded fix with the exact observation, so it can
be built without re-discovery. Order = what hurt most at the table.

1. **Stack item text is engine bookkeeping.** The float shows `March of Otherworldly Light (92) - Exile Cat
   Soldier Token (299). (Exiled=0)`: card ids in parentheses and internal state. Replace with the card's
   oracle text (already cached by `cards.ts`) for a spell — ideally just the sentence that is resolving when
   a mode is chosen — and, for an ability, the engine text with every `(n)` id and any `(Key=value)` tail
   stripped; targets as the existing "→ Cat Soldier Token" chip row only, never repeated in the text.
   File: `src/ui/StackPanel.tsx` / `stackModel.ts` (a `cleanStackText` helper, tested).
2. **Refused clicks say why.** "Not selectable — X cannot be selected now" is replaced by the reason in the
   engine's terms (summoning sick, can't block a flyer, not a legal block/attack for the named one). (In lane
   6, `pc/board-combat-lane`, in progress.)
3. **No candidate outline for a creature the engine marks summoning-sick** in declare-attackers, unless it
   has haste. (Lane 6.)
4. **Declare blockers: the instruction line** ("click an attacker, then your creature; click another attacker
   to switch; click a blocking creature again to take it off") back in the decision panel; blocks shown by
   placement; no "same number = who blocks whom". (Lane 6.)
5. **The combat text table and red dashed arrows go**; attack lane per the Endstep study. (Lane 6.)
6. **The panel names the opponent by what was picked** ("Search AI"), not the engine's seat label "Forge AI".
   Files: `play/aiName.ts` readers in `decisionModel.ts` / `PhaseStrip.tsx`.
7. **"Draft with a friend" is a small top-bar link** on the Draft vs Bot page and was missed; make it a card
   or a button beside "Begin the draft", and say what it needs (the engine started with the room on).
8. **Play vs Bot asks nothing**: it takes the engine's current decks. Add a deck choice at the table (your
   deck, the bot's deck, the opponent AI) the way Endstep's practice table does; the match launcher
   (`launchMatch`, POST /match) already exists.
9. **Tokens**: `pc/board-token-art` (#136) covers art + compact placeholder; the name-mismatch fallback
   (type-based search) remains.
10. **The summoning-sick "Zz" mark must not show during the opponent's combat.** (Lane 6.)
11. **The coach names duplicate cards by engine id** ("block Construct Token #297 with Phyrexian Myr Token")
    and the board never shows that id; the only visible numbers are the combat badges (1–8). Fix: when the
    coach's plan/steps name a card, render it with what the board shows — in combat the lane badge number
    ("Construct 7, the 4/4"), else the P/T or a position word — and highlight the named card on the board
    while the step is hovered; strip "#<id>" from the player-facing text everywhere (keep it in the data).
    Files: the coach step renderer (`PlanCoach.tsx` / `PlanView.tsx`, the cloud's area) + a board hook for
    "highlight card id". Observed turn 22, 2026-10-10.
12. **A trigger that resolves with nothing to choose says nothing.** Tidehollow Sculler entered against an
    opponent with 0 cards in hand; the reveal/choose resolved silently and Justin thought the effect failed.
    Fix: when an ask-bearing trigger or spell resolves with no legal choice (empty hand, no targets), the
    board shows a short toast and a log line in the player's words ("Search AI revealed an empty hand —
    nothing to exile"). Source: the engine's own events (reveal of 0 cards / the resolved stack item), never
    inferred. Turn 23, 2026-10-10.

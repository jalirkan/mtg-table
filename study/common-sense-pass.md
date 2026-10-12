# ForgeCoach board — the common-sense pass (queued; Justin's items from live play, 2026-10-10)

## Start here when the allowance is back (the order, agreed with Justin 2026-10-10 15:40)
1. Combat as the lane, blocking that explains itself — PR #137, merge and verify in a REAL game with blocks.
2. The stack shows the card's words, never engine ids (item 1 below).
3. Nothing on the board names a card by an id: coach steps (item 11), log lines, prompts, refusals.
4. Play vs Bot asks for your deck, the bot's deck and the opponent at the table (item 8).
5. Draft with a friend is an obvious button and says how the engine must be started (item 7).
6. The small ones: the search AI's real name (6), a line when a trigger resolves with nothing to choose
   (12), no Zz during blocks (10), back-face art (13 — PR in progress).
7. Then a real play session on the live site, blocks and all, with screenshots, before anyone says "done".
Rule from today: when one instance of a defect is reported, find and fix the class, do not list it.


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
13. **Transformed double-faced cards keep the front face's art.** Lunarch Veteran returned via disturb as
    Luminous Phantom and (per Justin) still showed the front art. The wire carries the current face (name,
    text, P/T; `alt` for the other face); the image lookup must fetch the matching Scryfall `card_faces[]`
    image for the face shown, not the card's front `image_uris`. Check `cards.ts` face handling and
    `CardTile` for transformed/flipped/meld states. Turn ~24, 2026-10-10.
14. **The coach's plan steps do not recognise a double-faced card cast as its back face.** Step "cast Lunarch
    Veteran" stayed unchecked after Justin cast it via disturb: what hit the stack and resolved was Luminous
    Phantom (the back face), and the step matcher compares the front name. Fix in the plan tracker
    (`src/livePlan/`, `planRun.ts` / `autoPlan.ts` — the cloud's area): match a step's card by card id when the
    plan names one, else by either face name (`alt`/faces), and treat a transformed/disturbed cast as the same
    card. Also the step text should use the face the player will actually cast ("cast Luminous Phantom
    (disturb)"). Turn 23, 2026-10-10.
15. **Combat damage assignment offers the defending player to a non-trampler.** Skyclave Apparition (2/2, no
    trample) blocked by Servo Token + Spirited Companion: the "Assign 2 damage" dialog listed "Forge AI ·
    Defending" as a row and accepted 1 on it ("All 2 assigned"). Illegal by the rules (only trample, or an
    "as though it weren't blocked" effect, may put excess on the player, and only after lethal to every
    blocker). Protocol fact: `assign_damage.targets` ALWAYS carries the defender at index 0 (`"defender":
    true`) with no flag saying whether the engine will let damage go there. Fix in two halves: (a) mtg-table
    bridge: emit `defenderAllowed` from Forge's own rule (what VAssignCombatDamage uses: trample / the
    "assign as though not blocked" keyword), and say whether the engine validates the returned map; (b)
    ForgeCoach `AskDialog` assign-damage body: hide the defender row unless `defenderAllowed`, and enforce
    "lethal in order" only through the engine's `overrideOrder`/`maySkip` flags, never by client arithmetic.
    Until (a) lands, the client should not show the defender row at all unless the attacker's wire
    `keywords` contain Trample (engine state, not a rules computation). Turn 23, 2026-10-10.
    **CONFIRMED APPLIED:** the log shows "Skyclave Apparition dealt 2 combat damage to Forge AI" while blocked
    by two creatures with no trample (Forge AI 6 → 1). The engine does not validate the map. RULES BUG, top of
    the list.
16. **Auto-coach (Steps) did not ask at the player's declare-blockers input.** Turn 24: ten attackers at the
    player's 5 life, the blockers input came and went with no plan; the panel still showed the turn-23
    advice. The Steps help promises "your blocks". Check `autoPlan.ts` / `livePlan` moment detection against
    the real input (mode 'block' with the engine's "Select creatures to block …" prompt), and that an
    in-flight answer survives the step moving on (show "Coach is thinking…" in the panel while it runs, and
    deliver the plan into the block decision, not after). Cloud's area. 2026-10-10.
17. **An exploratory click activated Carrion Feeder's only ability and sacrificed it.** See
    `rules-integrity-plan.md` Part 2b: lone abilities go through a menu with Cancel; sacrifice/discard costs
    are never auto-chosen; inspect ≠ act. Game lost on it, 2026-10-10.

## Real-game session, 2026-10-12 (PC, ForgeCoach main 346084e on the dev server, mtg-table 1f3cb22a, Search AI, Doom Legion)

Played by me in the browser pane, every click tried, after the Endstep combat study
(`study/endstep-combat-2026-10-12/COMBAT-STUDY.md`). Fixed today in ForgeCoach PR #146 (small-fixes lane):
the stuck hover preview (a card that leaves the DOM under the mouse left its big preview mid-screen for turns),
"Human, you have won the coin toss" / "Human, you are going first!" (the engine's seat name in prompts), and
the silent "Connecting to the engine…" hang when the page's origin is mistaken for the engine. Two combat
lanes (pc/board-combat-v2, pc/board-damage-bar) are rebuilding attackers/blockers/divide-damage to the study.

Still open, found today:
- **Engine ids in ask labels**: the replacement-effects order ask reads "Thriving Isle (9) - Thriving Isle
  enters tapped." — the "(9)" is the engine's card id (pass item 3, no ids anywhere).
- **Uncastable cards are lit in hand** and the engine lets the cast start: with one Plains, Agent Phil Coulson
  ({1}{W}) and Wasp ({2}{W}) were bright; clicking opens "Pay {1}{W}" with Auto disabled and the hint "tap a
  card first", which is wrong — Auto is off because it cannot pay. Endstep dims what you cannot cast. Needs an
  engine-side fact (does Forge expose "can pay now" to the GUI? the bridge would carry it), not client rules.
- **"Forge AI" everywhere but the panel**: the opponent panel says "Search AI" while the slot says "Forge AI's
  beginning of combat", the log "Forge AI played Swamp", "Forge AI cast HYDRA Troopers" (pass item 6).
- **Declare attackers has no Skip-combat button before a pick** (Esc = "Clear attackers" only after one);
  Endstep shows Skip combat [Esc] and Alpha strike [A] from the start. Combat-v2 lane.
- **Default stops**: the opponent's beginning of combat stops me every turn with "You can cast an instant or
  use an ability now; or pass" even with nothing castable; Endstep's defaults stop at ATK/BLK and END only.
- **Mulligan flow**: after one mulligan the engine asked "Return 1 card to the bottom" BEFORE "keep this
  6-card hand?" (Forge's order); the slot handled both; selection/deselection and the count work.
- Works as it should: land on one click with the biome; cast → pay → Auto [A]; Cancel [Esc] on a payment;
  colour choice with 1–4 hotkeys; attackers (count in the button, Call back, attack lane with a numbered
  badge and the "→ Search AI" chip); the stack panel for my own spell; the turn-grouped Game Log; a page
  reload mid-game ("Another window has your seat" → Reconnect) resumes the game with the coach's last answer.
- Setup note for the PC: a vite dev server on a port outside DEV_PORTS (5173/5174/4173) makes the page
  think the engine served it — run ForgeCoach's dev server on 5173.

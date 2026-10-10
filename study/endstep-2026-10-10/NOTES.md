# Endstep study session — 2026-10-10, guest account, Play vs bot (starter deck)

Purpose: observations for the cloud's ForgeCoach board rework. Human-driven session in the PC's browser pane
(Justin present); screenshots in this folder. No automation of play.

## Observations (chronological)
1. **Lobby → Practice table** (`01-practice-lobby.jpg`). "Play vs bot · starter deck" from the lobby lands on a
   Practice table: two seat cards (you: "Choose your deck"; "Auto-pilot: mirrors your deck, the bot plays it",
   already Ready), and a Table panel with Game/Format selects, Match Bo1/Bo3, Spectators on/off, **Rewind
   off/on**, **Cheats off/on**. Practice mode exposes rewind and cheats as table options; ForgeCoach's practice
   room could do the same (undo is already an engine feature for us). The bot defaults to mirroring the
   player's deck. Lobby header: online count and live game count, tabs Play / Decks / Tournaments /
   Metagame / Leaderboard / History. Find-a-match offers formats, length (Quick/Standard/Long), stakes
   (Casual/Ranked), opponent rating band.
2. **Deck chooser / builder** (`02-deck-builder-empty.jpg`). A guest's "starter deck" button does NOT hand you a
   deck: the chooser shows one "Untitled · No format · 0 cards" entry and "Build a new deck". The builder is a
   single page: name, "Set format" dropdown, one search box ("Add a card, e.g. 4 Lightning Bolt") with a Main /
   Sideboard toggle, view controls (Stacks, by mana value, a size slider), Import/Export, and for an empty deck
   two big affordances: "Paste a list" and "Import from a link". Auto-saves ("Saved" dot top right). Lesson for
   ForgeCoach's deck assistant: the card-name-with-count search box is the whole add-UI; no separate browser.
3. **Deck builder after a paste** (`03-deck-builder-imported.jpg`). "Paste a list" takes "N Card" lines, a
   "Sideboard" line splits the board; a toast confirms "60 cards imported from your list." The deck renders as
   mana-value stacks (1 / 2 / 3 / 5+ mana, Lands) of overlapping card images with a count beside each row, a
   header line "12 creatures · 26 spells · 22 lands · 34 pips", and an empty Sideboard column. Auto-saved; no
   explicit save. Test deck used: mono-red burn (22 Mountain, Bolt, Swiftspear, Goblin Guide, Lava Spike,
   Rift Bolt, Chain Lightning, Bonesplitter, Fireblast, Kiln Fiend, 2 Skewer the Critics).
4. **AI seat** (`04-ai-seat-and-deck.jpg`). The bot seat is "Forge AI" with a profile dropdown ("Balanced ▾";
   Endstep exposes Forge's AI profiles in the lobby) and its own "Choose the AI's deck" chooser; the default
   "Auto-pilot · mirrors your deck" is a shortcut for giving it your list. The host's start button reads
   "Begin with <deck> [Enter]" — a keyboard hint printed on the primary button. ForgeCoach: our match setup has
   the same two knobs (ai deck, ai profile); surfacing the profile name next to the seat the way Endstep does
   would make D106's "a profile is not a difficulty" visible rather than hidden.
5. **THE BOARD, first frame: coin toss** (`05-board-coin-toss.jpg`, pane 800 px wide, so this is Endstep's
   narrow-desktop layout; the phase strip still gets a full column). Three columns:
   - **Left column (~160 px):** opponent panel at the TOP (name "Forge AI", big "20 LIFE", library 60, hand 0,
     two small counters: poison/energy-style badges), then free space, then the **DECISION panel** sitting
     just above the auto-pass block: a red "DECISION" ribbon, a *Prompt* line ("You have won the coin toss …
     play or draw?") and the answers as buttons **with their hotkeys printed on them**: "Play first [1]",
     "Draw first [2]". Below it **AUTO-PASS** with three toggles, each with a hotkey: END OF TURN [E],
     BEFORE MY TURN [B], ACTION / END STEP [R], and a "skip ahead" link. Your own panel at the BOTTOM of the
     column (name, 20 LIFE, library 60, hand 0, badges). So: opponent top, you bottom, the prompt in between,
     always in the same place; the board centre never holds a dialog.
   - **Centre:** opponent battlefield (top band, blue-tinted, "The battlefield is empty."), a MENU button and a
     hamburger at its lower right, then YOUR battlefield (the big black area), then a thin dark-blue band at
     the bottom (the hand row, empty before the draw). A "Log" pill sits at bottom centre.
   - **Right column (~120 px): the PHASE STRIP, vertical.** Top: "OPP TURN TO" header with a "● PRIORITY"
     pill (who holds priority). Then one cell per step: UNTAP, UPKEEP, DRAW, MAIN 1, [combat] BEG., ATK, BLK,
     1ST, DMG, END C., [main] MAIN 2, [ending] END, CLEAN, with small italic group labels (combat / main /
     ending). **Each cell is split diagonally: gold left half = YOU, blue right half = OPP**, and a filled half
     means a phase stop is set for that player: defaults here MAIN 1 (you), ATK (both), BLK (both), MAIN 2
     (you), END (both). Legend "▮ YOU ▮ OPP" under the strip and a **HOLD PRIORITY** toggle at the bottom.
     That is M6's phase stops and pass-to, rendered as a clickable strip with per-player halves.
   - Fullscreen icon top right. No chat, no avatars; life totals are the biggest numbers on screen.
6. **Opening hand** (`06-opening-hand.jpg`). Same DECISION panel, now titled *Opening Hand*, "Keep this 7-card
   hand, or mulligan?", buttons "Keep 7 [1]" / "Mulligan [2]". The hand row at the bottom fills with seven
   full card images (not tiles): the whole printed card at about 75×105 px, overlapping slightly, P/T badge
   drawn over the corner (a "1/2" on Swiftspear). Both panels now read library 53 · hand 7. The decision
   panel's title changes per ask kind (Prompt → Opening Hand) while its position never moves: that is the
   pattern to copy — one fixed "decision" slot, hotkeys 1..n on the choices, E/B/R on the auto-pass toggles.
7. **Your turn, main 1, holding priority** (`07-your-turn-main1.jpg`). Three signals say "it's you, now":
   (a) the strip header flips to "YOUR TURN · T1" with the PRIORITY pill; (b) the **current phase cell grows
   to ~3× height** and gets a title plus a one-line instruction ("Main 1 — Cast or pass."); (c) YOUR
   battlefield gets a warm gold wash from the bottom up (the opponent's stays black). The decision panel
   reads "Your first main phase — Cast spells and activate abilities." with ONE button, "PASS PRIORITY
   [SPACE]". Opponent events arrive as dismissable toasts at the top right ("Forge AI: Mulligan to 6",
   "Forge AI: Kept 6"), stacked newest on top, each with a small replay/undo-looking icon. Hand stays 7 on the
   play (no draw) — the library counter (53 vs AI 54) is the only hint.
8. **Playing a land = one click** (`08-land-played-hover.jpg`). Clicking a Mountain in hand played it at once:
   no confirm, no menu. It landed in your battlefield's bottom row (lands sit at the bottom of your half, just
   above the hand). Hand 7 → 6. The decision panel grew an **UNDO [CTRL]+[Z]** row under PASS PRIORITY (engine
   undo surfaced the moment there is something to undo — our M6 undo, same idea). The strip header gained an
   "On the play" chip. Hovering a battlefield card shows a **large card preview (~260×360) floating over the
   board, anchored near the card**, not in a side panel: readable rules text at a glance.
9. **Casting = click the card; payment is a decision** (`09-cast-pay-prompt.jpg`). One click on Monastery
   Swiftspear in hand raises the card (it lifts ~15 px and brightens) and the decision panel becomes
   *Monastery Swiftspear* / "Pay {R} for Monastery Swiftspear" with **AUTO PAY [A]** and **CANCEL [ESC]**; the
   Mountain on the battlefield is lit as a manual payment source (click it to tap it yourself). So the pay
   step is the same "decision slot" as every other ask, with the engine's auto-pay as the primary and Escape
   as cancel. The hover preview adds **keyword chips above the card** ("Haste", "Prowess" with icons) and
   the full oracle text. Hand count already reads 5 (the card has left the hand while the payment is open).
10. **Battlefield rows after the cast** (`10-creature-and-tapped-land.jpg`). Your half is two rows separated by
    a faint dashed line: creatures above (Swiftspear, full card image ~105×150 with the P/T badge "1/2" in the
    corner and **keyword icons stacked on the card's right edge**, haste + prowess), lands below (the
    Mountain, **tapped = rotated 90°**, drawn as the whole card on its side). No stack panel appeared for the
    creature spell: the AI held no response and it resolved in the same frame. The decision panel is back to
    PASS PRIORITY [SPACE]; UNDO is gone once the cast resolved. The spell never visibly sat on a stack, which
    is a choice: a panel only when something is actually waiting.
11. **Declare attackers** (`11-declare-attackers.jpg`). One PASS PRIORITY from main 1 went straight to the
    attack step (the ATK stop is on by default). The strip's big cell is now "Atk — Declare attackers"; the
    decision panel reads "Click your creatures to attack", a "● CLICK TO SELECT" state line, then three
    buttons: **ALPHA STRIKE [A]**, **SKIP COMBAT [ESC]**, and a red primary that reads **"ELECTING AT
    [SPACE]"** — i.e. the primary's label is the running count ("attacking with…") and Space confirms. The
    eligible attacker gets a red outline on the board; the tapped land is dimmed to ~40% as irrelevant to
    the choice. Everything the engine offers (attack / alpha / skip) is a button with a key; selection is on
    the board.
12. **Attacker selected** (`12-attacker-selected.jpg`). Clicking the creature **tilts it about 10° toward the
    opponent** and the panel updates live: "● 1 SELECTED", first button becomes **CALL BACK** (deselect all),
    SKIP COMBAT [ESC] stays, and the red primary now reads "SELECTING … [SPACE]" (the label tracks the
    count). The hover preview still floats beside the card. No confirmation dialog; the primary IS the confirm.
13. **Attackers declared, priority back to you** (`13-attackers-declared.jpg`). After Space: the attacker is
    **tapped (rotated 90°) and lifted into a lighter "attack lane" band between the two halves**, its keyword
    icons kept. The panel reads *Declare attackers* / "Respond to declared attackers or pass." with PASS
    PRIORITY [SPACE]. **Hand cards you cannot afford are dimmed** (the two Bolts and Chain Lightning at ~40%
    while the mana is tapped; the Mountains stay bright). That dimming is the payability hint J119 wanted
    for the Sonnet seat, done visually for humans: the board tells you what you can do before you click.
14. **Blockers step, AI had none** (`14-declare-blockers-step.jpg`). Even with no blockers possible the BLK
    stop still fires for you: the strip's big cell says "Blk — Declare blockers", the panel "Declare blockers /
    Respond to declared blockers or pass." The attacker stays in the attack lane. Nothing says "no blocks
    were declared" beyond the empty opponent half. (Our board could skip this stop when the opponent has no
    creatures; Endstep does not.)
15. **Main 2 after damage** (`15-main2-after-damage.jpg`). The opponent's life ticks 20 → 19 in the top-left
    panel with no animation at this capture rate; the creature drops back to the creature row, still tapped;
    the strip's big cell is "Main 2 — Cast or pass." and the combat cells (ATK/BLK) show their stop halves
    greyed since they are past. Hand brightness: in the blockers frame the uncastable Bolts were dimmed, in
    Main 2 they read full brightness with the same tapped land, so the dimming is tied to the *decision*
    (what counts as an answer now), not to mana alone. Worth checking before copying it as a payability cue.
16. **End step stop** (`16-end-step.jpg`). The END stop (on for both players by default) halts your own end
    step too: big cell "End — End-of-turn triggers", panel "Your end step / End-of-turn abilities trigger."
    with PASS PRIORITY. Four passes so far for one turn (main 1 → attackers → blockers → main 2 → end): the
    default stops are generous; a player who wants fewer uses the AUTO-PASS toggles (E = to end of turn) or
    clicks the strip's halves off. The hand's uncastable Bolts are dimmed again here.
17. **THE STACK PANEL, opponent's turn** (`17-opp-turn-stack-panel.jpg`). The AI's T2: it played a Mountain
    (tapped, shown in ITS land row at the top of its half, lands nearest the centre line) and cast Goblin
    Guide. A floating panel titled **"⋮⋮ The Stack · 1"** appears at the TOP-LEFT, overlapping the opponent's
    life panel, holding the Goblin Guide card image at about hand size; it has a drag handle and a resize
    corner. The strip header reads "OPP TURN · T2 · Forge AI" with the PRIORITY pill under it (I hold
    priority to respond), the big cell is "Main 1 — Cast or pass." and the decision panel says "Opponent's
    first main phase / Cast spells and activate abilities." + PASS PRIORITY [SPACE]. So the stack is a
    separate floating panel that exists only while something is on it, placed over the least important
    corner, not in the board centre; the decision panel stays put. This frame is the one to show the board
    rework: priority during the opponent's main phase with a spell waiting is unmistakable (stack panel +
    "Opponent's first main phase" + the pill), and nothing modal blocks the board.
18. **Opponent attacks; a trigger on the stack with an ARROW to its source**
    (`18-opp-attack-trigger-arrow.jpg`, `17b-stack-panel-zoom.png`). Goblin Guide (haste) attacks. Its
    attack trigger sits in the stack panel as a compact item: card art strip, a blue "TRIGGERED ABILITY"
    label, the rules text scrolled ("Whenever Goblin Guide attacks, defending player…"), and a **numbered
    gold badge "1"**; the same "1" badge sits on the Goblin Guide card on the battlefield, and a **curved gold
    line is drawn from the stack item to that card**. The attacker is tapped and lifted into the opponent's
    attack lane (the lighter band just above the centre line, mirroring ours). Decision panel: "Declare
    attackers / Respond to declared attackers or pass." PASS PRIORITY [SPACE]. Hand: uncastable cards dimmed.
    This answers the rework's stack question in one picture: items are numbered, drawn once in a side panel,
    and tied to their source on the board by number and a line. (ForgeCoach's arrows between cards for
    targets could reuse the same line style.)
19. **A reveal** (`19-reveal-panel.jpg`). Goblin Guide's trigger revealed my top card (a Mountain, put in
    hand). Endstep shows it two ways: a **"REVEALS · 2" counter badge** at the very top of the phase strip,
    and a toast-like card at the top right: "guest… revealed Mountain · LIBRARY · TAKEN" with a thumbnail and
    a "+" (pin) button. Hand 5 → 6, library 53 → 52 in my panel. Priority returns in the same step ("Declare
    attackers / Respond … or pass"). Confirmed by zoom: tapped permanents really are drawn rotated 90° at
    every size (my attacker and my land stayed sideways through the opponent's turn, as the rules say).
20. **Their attack, my blockers step with no legal blocker** (`20-opp-attack-blockers-step.jpg`). My only
    creature is tapped, so the panel offers just "Declare blockers / Respond to declared blockers or pass."
    + PASS PRIORITY — the same wording as when blocks were possible. Nothing says "you have no blockers"; a
    small line would help a learner (our board could say it, since the engine's offer is empty).
21. **Their end step** (`21-opp-end-step-life18.jpg`). Damage landed (my life 20 → 18, big number bottom
    left), the attacker returned to its row tapped, and the next stop that fired was "Opponent's end step /
    End-of-turn abilities trigger." — their MAIN 2 did not stop me (that cell is YOU-only by default), their
    ATK and BLK did. The REVEALS·2 badge persists at the top of the strip as a history counter.
22. **My T3, main 1** (`22-my-t3-main1.jpg`). Untap and draw passed with no stop (UNTAP/UPKEEP/DRAW have no
    halves filled); hand 7, library 51. The header is "YOUR TURN · T3". The whole hand is at full brightness
    except Kiln Fiend ({1}{R} with one land), so the dimming IS payability after all when it is your main
    phase; in the opponent's combat it dimmed everything but instants I could not pay for either. Reading:
    dim = "not a legal answer right now", which covers both cases. The drawn card slides in at the right end
    of the hand (newest card rightmost).
23. Second land: one click again, no confirm; the land row now holds two Mountains side by side, and the
    UNDO [CTRL]+[Z] row reappears under PASS PRIORITY for as long as the land drop is undoable. (The cards in
    hand are images with no accessible names — a screen reader or a test harness gets nothing from the DOM;
    ForgeCoach's tiles carry names in the DOM, which the playtest monkey relies on. Keep that.)
24. **Targeting** (`24-target-prompt.jpg`). Clicking Chain Lightning in hand (card lifts, gold outline) turns
    the decision panel into *Chain Lightning* / "Select any target" with a live counter line "● 0/1 · NEED 1
    MORE", CANCEL [ESC], and a **disabled CONFIRM [SPACE]** until the count is met. **Every legal target gets
    a green outline on the board itself**: both player panels (the whole opponent panel top-left and my own
    panel bottom-left glow green = "you can target a player here"), Goblin Guide and my Swiftspear. Lands and
    anything illegal are dimmed. Note the land row: **identical untapped lands collapse into one stacked card
    with a "⟨⟩ 2" count badge** when a target prompt is up (and maybe always past some count). So targets are
    chosen on the board, never from a list; the list (our ask's option labels) becomes outlines. Target
    choice is confirmed by Space, cancel by Escape: the same two keys as everything else.
25. **Target chosen → straight to payment** (`25-target-chosen-pay.jpg`). One click on Goblin Guide satisfied
    "1/1" and the panel moved on to *Chain Lightning* / "Pay {R}" with AUTO PAY [A] / CANCEL [ESC] without a
    separate confirm (the Space-confirm is only needed when the count is still open or more than the minimum
    may be chosen). The non-target board dims; the hover preview keeps working mid-decision.
26. **Cancel during payment undoes the whole cast** (`26-cast-cancelled.jpg`). CANCEL at the pay step put
    Chain Lightning back in hand (hand 6 again, both copies visible), restored the main-phase panel with PASS
    PRIORITY + UNDO, and left the board as it was. Cancel at any step of cast → target → pay is total. Also:
    the land row keeps the "⟨⟩ 2" stacked-Mountain card in the main phase, so **identical untapped lands are
    always collapsed with a count** (space saver for the land row — relevant to the half-board scenery
    layout, which wants the land row small).
27. **My own spell on the stack, with a trigger on top** (`27-my-spell-on-stack-two-items.jpg`,
    `27b-stack-two-items-zoom.png`). After AUTO PAY the stack panel reads "The Stack · 2": Chain Lightning
    (full card image, badge "1") with a small row under it naming its target, "→ Goblin Guide"; and on top
    of it, overlapping like a fanned hand, the Swiftspear **prowess trigger** (art strip + "TRIGGERED
    ABILITY" + text, badge "2") with a gold line to the Swiftspear on the battlefield (its source); Goblin
    Guide on the board carries a numbered badge too (the target). Items are fanned newest-on-top in the same
    small panel, each with number, type label, text and its arrow or target row. I hold priority ("Your first
    main phase / PASS PRIORITY [SPACE]", plus UNDO still offered). The HOLD PRIORITY toggle at the bottom of
    the strip is how you keep priority after casting; by default Endstep passes it to the opponent per
    spell the way Forge does. Hand: the second Chain Lightning dims (no mana left).
28. **Stack item → its TARGET, drawn as a line** (`28-stack-target-arrow.jpg`). After the prowess trigger
    resolved (Swiftspear reads 2/3 now), Chain Lightning alone remains ("The Stack · 1") and the gold line
    now runs from its "1" badge to **Goblin Guide, the target**, which carries the matching "1". So the line
    means "this item points at that card", whether source (for a trigger) or target (for a spell), and the
    row under the stack card ("→ Goblin Guide") says the same in words. Priority came back to me after each
    resolution (one pass per item), exactly as Forge gives it.
29. **The game log** (`29-game-log.jpg`). "Log" (bottom-centre pill) opens a floating **Game Log** panel at
    the top right (pin, filter, more, close icons). Entries are **grouped by turn with a header row ("T2 ·
    OPPONENT'S TURN · FORGE AI", "T3 · YOUR TURN") and sub-headers per phase (MAIN PHASE, COMBAT)**; each
    line has a small type icon (▲ played, ✦ cast, ⚔ declared attacker, ★ triggered, ◐ look at / put into
    hand, ⚡ damage, ♥ life), card names in bold, targets as "cast Chain Lightning → Goblin Guide", life as
    "20 → 18", and trigger lines collapsible with a ▶. Nothing is a raw engine string. This is the model for
    ForgeCoach's narration/log: the per-turn, per-phase grouping is what makes it scannable.
30. **After resolution** (`30-after-resolution-graveyard-badges.jpg`). Goblin Guide is gone from the
    opponent's half with no death animation at this capture rate; the two small badges under each life total
    turn out to be **graveyard count (now "1" on both panels: their Guide, my Chain Lightning) and exile
    count ("0")** — zones you rarely browse are a number with an icon, not a pile on the board. The stack
    panel vanished the moment it emptied. UNDO disappeared once the spell resolved (nothing undoable
    remains). The board is back to the plain "Your first main phase / PASS PRIORITY" state.
31. **Phone layout, 375×812** (`31-phone-layout-375.jpg`). Everything re-flows into one column:
    - the phase strip becomes a **horizontal row of two-letter step codes across the top** (UP OR M1 BC DA DB
      FS CD EC M2 ET CL), the current step highlighted, stops shown as a gold underline under a code;
    - each player's panel collapses to **one line**: name, life, then hand / graveyard / exile / library as
      icon+number;
    - opponent battlefield, then yours (lands drawn large since there is room), then the hand as a strip of
      full cards (the current castable one bright), then your one-line panel;
    - a **bottom bar**: a "Resize" grip, a big **Pass priority** button, **TO EOT**, and a ▲ for more.
    - the Log is a vertical tab on the right edge.
    A **confirmation dialog** is used on the phone for pass-to-end-of-turn: "Pass priority until end of turn?
    You'll auto-pass through the rest of this turn. Cancel anytime with Esc." with Cancel / Confirm — so the
    one place a modal appears is an irreversible skip, and it says how to get out of it. (Our half-board
    scenery layout: the phone shows the two halves stacked with the hand under them, and the land row is
    nearly as tall as the creature row; the "middle 60%" crop assumption in spec 1.5 holds.)
32. MENU: a click on the MENU pill at the top of my half showed nothing in the capture; not studied.

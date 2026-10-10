# Endstep study session — what the board does, for ForgeCoach's board rework (PC, 2026-10-10)

Human-driven session in the PC's browser pane with Justin present: a guest account, a Practice table,
Forge AI ("Balanced") as the opponent with a mirrored mono-red list, three turns played by hand with a
screenshot at every decision. Pane width 800 px (Endstep's narrow-desktop layout) plus one 375 px phone
capture. No automation of play. 20 screenshots and the full chronological notes are beside this file
(`NOTES.md`, numbered 1–32 and matching the image names). Endstep is a Forge-engine client too, so every
prompt here is an engine ask we also receive.

## 1. The shape of the page (desktop) — `05-board-coin-toss.jpg`, `07-your-turn-main1.jpg`
Three columns. **Left (~160 px)**: opponent panel at the top (name, life as the biggest number on screen,
library / hand counts, graveyard + exile as icon+count badges), free space, then the **DECISION panel**,
then **AUTO-PASS** toggles, then your own panel at the bottom. **Centre**: opponent battlefield (top band),
MENU pill, your battlefield (big), your hand as a strip of full card images at the bottom, a "Log" pill.
**Right (~120 px)**: the **phase strip**, vertical, one cell per step, grouped combat / main / ending.

## 2. Nine things worth copying
1. **One fixed decision slot, hotkeys printed on the buttons.** Every ask (coin toss, mulligan, priority, pay,
   attackers, blockers, targets) renders in the same panel at the same place with a title (the ask kind), one
   line of instruction, and buttons whose keys are printed: `Keep 7 [1]`, `PASS PRIORITY [SPACE]`,
   `AUTO PAY [A]`, `CANCEL [ESC]`, `ALPHA STRIKE [A]`, `CONFIRM [SPACE]`. Nothing modal over the board.
   (`06`, `09`, `11`, `24`)
2. **The phase strip IS the phase-stop UI.** Each cell is split diagonally, gold half = you, blue half =
   opponent; a filled half is a stop. Defaults: MAIN 1 (you), ATK (both), BLK (both), MAIN 2 (you), END
   (both). The current step's cell grows ~3× with a title and a one-liner ("Main 1 — Cast or pass.", "Atk —
   Declare attackers"). Header flips YOUR TURN / OPP TURN with a PRIORITY pill and an "On the play" chip.
   HOLD PRIORITY is a toggle at the strip's foot. This is M6's stops and pass-to as one widget. (`05`, `07`)
3. **Whose turn / who may act is painted on the board**: your half gets a gold wash when it is your turn and
   you hold priority; the opponent's stays black. (`07`)
4. **Land = one click; cast = click then a pay decision.** Clicking a hand card raises it; a land is played
   at once (UNDO [CTRL]+[Z] appears while it is undoable); a spell goes to AUTO PAY / CANCEL with the lands
   lit as manual sources. Cancel at any step (target or pay) returns the card to hand. (`08`, `09`, `26`)
5. **Targets are chosen on the board, not from a list.** Legal targets get a green outline — including the
   whole player panels (target a player by clicking their panel); a counter line "0/1 · NEED 1 MORE" gates a
   disabled CONFIRM; everything illegal dims. When the count is met the panel moves straight to payment.
   (`24`, `25`)
6. **Combat**: eligible attackers outlined red; clicking one tilts it toward the opponent; the primary's
   label tracks the count and Space confirms; declared attackers tap (rotate 90°) and lift into a lighter
   **attack lane** between the halves; the same lane on the opponent's side when they attack. ALPHA STRIKE
   and SKIP COMBAT are buttons with keys. The blockers stop fires even with no legal blocker and says
   nothing about it (we could do better: an "no blockers available" line). (`11`, `12`, `13`, `20`)
7. **The stack is a small floating panel at the top-left that exists only while something is on it.**
   Items fan newest-on-top, each with a numbered gold badge, a type label ("TRIGGERED ABILITY"), the text,
   and either a "→ target" row or a **gold line drawn from the item to its source or target card on the
   board**, which carries the matching number. Priority returns per item, as Forge gives it. (`17`, `18`,
   `27`, `27b`, `28`)
8. **Opponent events are toasts, reveals are a counter + a card toast.** "Forge AI: Mulligan to 6" top-right;
   a reveal shows a REVEALS·n badge on the strip and a "revealed Mountain · LIBRARY · TAKEN" card with a pin.
   (`07`, `19`)
9. **The log is grouped by turn and phase** with a type icon per line, bold card names, "cast X → Y",
   "life 20 → 18", collapsible triggers. No raw engine strings. (`29`)

## 3. Smaller observations
- Hand cards that are not a legal answer right now are dimmed (unaffordable spells in your main phase;
  everything but instants you can pay for in the opponent's combat). That is the payability cue the Sonnet
  seat lacked (J119) done for humans. (`13`, `22`)
- Identical untapped lands collapse into one card with a "⟨⟩ 2" count badge — the land row stays small.
  Relevant to the half-board scenery layout. (`24`, `26`)
- Tapped permanents are rotated 90° at every size; keyword abilities are icons stacked on the card's right
  edge; P/T is a badge in the corner; hovering a card floats a large readable preview beside it with keyword
  chips above. (`08`, `09`, `10`)
- Graveyard and exile are counts on the player panel, not piles on the board. (`30`)
- Default stops make a turn 4–5 passes long; the AUTO-PASS toggles (E / B / R) and the strip halves are the
  escape. On the phone, pass-to-end-of-turn is the ONE confirmation dialog, and it names Esc as the way out.
  (`16`, `31`)
- Cards are images with no names in the DOM: a test harness or screen reader gets nothing. ForgeCoach's
  named tiles are better; keep them. (`23` in NOTES)
- Practice tables expose Rewind and Cheats toggles and the Forge AI profile by name in the lobby. (`01`, `04`)

## 4. Phone (375 px) — `31-phone-layout-375.jpg`
One column: the phase strip becomes a row of two-letter codes across the top (UP OR M1 BC DA DB FS CD EC M2
ET CL) with gold underlines for stops; each player panel is one line (name, life, hand/gy/exile/library as
icon+number); opponent half, your half, hand strip; a bottom bar with a big **Pass priority**, **TO EOT** and
a ▲ for more; the log is a tab on the right edge.

## 5. What I would take into the rework, in order
1. The fixed decision slot with printed hotkeys (every ask kind, same place, same two keys to confirm/cancel).
2. The phase strip with per-player stop halves and the enlarged current step.
3. On-board targeting with outlines and a count line; attack lane + tilt-on-select for combat.
4. The floating numbered stack panel with lines to source/target.
5. Dimming of non-answers in hand; collapsed identical lands; graveyard/exile as counts.
6. The turn/phase-grouped log.
Not worth copying: the blockers stop that fires with nothing to block; the DOM-less cards.

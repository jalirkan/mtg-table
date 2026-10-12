# Endstep combat, played for real — 2026-10-12

Human-driven game on https://endstep.cc (guest account), green creature mirror (a 60-card list pasted into the
deck builder, given to both seats) against Forge AI "Balanced", in the PC's browser pane at 1440×900. The point
was to press every combat button and write down what the client does, so ForgeCoach can copy the model instead
of guessing. Screenshots are numbered beside this file. Everything here is observed, not read from source.

## 0. The one-paragraph model

Combat is three screens that reuse the fixed DECISION slot plus the board itself. **Attackers:** click your
creatures (they tilt), the slot's primary reads the running count and Space confirms; Esc skips, A alphas, "Call
back" clears. **Blockers (defender's turn):** blocker first, then the attacker it blocks; each attacker gets a
numbered badge, every blocker assigned to it gets the same number and a curved line; clicking a blocker then
the attacker it already blocks removes that block; Esc = no blocks, Space = done. **Divide damage:** a bar
above the hand, one card per blocker with a −/+ stepper, lethal pips, "N left of M", Reset [R], Confirm
[Space]; the defending player is a row only with trample and is locked until every blocker has lethal, and
Confirm greys out while the split is illegal. The attack lane is a lighter band between the halves; attackers
sit in it tapped. Nothing is a modal; the board never moves.

## 1. Declare attackers (`01`, `02`)

- Slot: title *Declare attackers*, line "Click your creatures to attack", state line "● CLICK TO SELECT", buttons
  **ALPHA STRIKE [A]**, **SKIP COMBAT [ESC]**, red primary whose label tracks the count ("…SELECTING… [SPACE]"
  → after a pick "ONE SELECTED [SPACE]" / "2 ATTACKERS"); after the first pick the first button becomes
  **CALL BACK** (deselect all).
- Board: eligible attackers get a red outline; summoning-sick and tapped creatures are NOT outlined and not
  clickable (no gold glow on something you cannot use); lands dim to ~40% as irrelevant.
- A click tilts the creature ~10° toward the opponent and it brightens; a second click untilts it.
- Confirm = Space (no separate dialog). After confirmation the attackers are tapped (rotated 90°) and lifted
  into the attack lane — a lighter band between the two halves, on the attacker's side of the centre line.
- With nothing able to attack (first creature summoning sick) the ATK stop still fires but the slot goes
  straight to "Respond to declared attackers or pass" — no empty selection screen.
- The END-OF-TURN auto-pass does not skip the declare-attackers decision: a decision is still asked.

## 2. The AI blocks you (`03`)

- Each attacker gets a gold **numbered badge** (1, 2…). Each blocker assigned to it gets the same number and a
  curved blue line from the attacker to the blocker. A double block is two lines into one badge. Lines are
  drawn on the board between the real cards; no list, no table.

## 3. Divide damage, you are the attacker (`04`, `04b`, `04c`, `07`, `07b`)

- A **bar above the hand** (the hand is pushed up, the board shrinks): header "COMBAT · DIVIDE DAMAGE",
  sentence "Leatherback Baloth deals 4 damage — divide it among the blockers." Right side: **Reset [R]**,
  **Confirm [Space]**.
- Left: the attacker as a tile with "**0 left** of 4" (turns red "3 left" when damage is unassigned). Then one
  card per blocker, the first with a check mark (damage order), each with its name, **lethal pips** under it
  (green filled = lethal reached, red = short, "+1" when above lethal) and a **− N +** stepper. Default split
  is Forge's auto (2/2 here).
- Steppers cannot take total above the limit; to move a point you − one blocker then + the other.
- **Trample** (`07`): the sentence gains "assign lethal to each before it tramples over", an orange rule line
  "Trample · every blocker must be lethal to spill over", and a **Defending player** row (shield icon,
  "spillover"). Lowering a blocker below lethal (`07b`): the player row **locks** (lock icon, stepper disabled,
  value 0), "3 left" goes red, Confirm greys out and Space does nothing. The UI cannot produce the illegal map
  that our bridge used to accept — this is the client half of mtg-table M67/D424.
- Without trample there is **no player row at all** (`04`).
- After confirm the damage is applied; a blocker that survived shows a red damage badge ("1") on its card.

## 4. Declare blockers, you are the defender (`11`–`16`)

- Attackers arrive in THEIR attack lane (the lighter band on their side), red-outlined, with their keyword icons.
- Slot: title *Declare blockers*, line "**Click a creature, then click the attacker it blocks**", state line
  "● CLICK TO SELECT", buttons **NO BLOCKS [ESC]** and red primary **DONE BLOCKING [SPACE]**.
- Your creatures that can block are outlined blue.
- **Blocker first.** Click your creature: it lifts and brightens, the slot says "Selected blocker — now click an
  attacker to assign". Click an attacker: a numbered badge appears on the attacker and the same number on the
  blocker, a blue line joins them, the slot reads "● 1 SELECTED — 1 blocker(s) assigned — click more or
  confirm", the primary reads "ONE BLOCKING [SPACE]".
- Double block: click another creature, then the same attacker — a second line into the same badge.
- Several attackers: badges 1, 2, 3… in attack order; each blocker carries the number of the attacker it blocks
  (`14`).
- **Remove a block:** click the blocker (it re-selects), then click the attacker it already blocks — the block
  is removed, the count drops (`15`). **Move a block:** click the blocker, then a different attacker.
- **No blocks [Esc]** clears everything and confirms none. Space confirms what is drawn.
- An illegal block (the engine refuses) was not reached in this game; Vine Mare "can't be blocked by black
  creatures" never mattered in a mono-green mirror.
- After confirmation the lines stay drawn through the rest of combat ("Declare blockers — respond or pass").

## 5. Smaller things worth copying

- **Targeting** (`05`): "Select target creature — ● 0/1 NEED 1 MORE", Cancel [Esc], Confirm [Space] disabled
  until satisfied; every legal target on both sides gets a green outline; everything else dims. One click
  on the target fills the counter.
- **Payment** (`06`): "Pay {G} for Rancor" with AUTO PAY [A] / CANCEL [ESC]; the lit cards are the usable mana
  sources (untapped lands and the Elf), the rest of the board dims.
- **Auras** tuck behind the creature, rotated, with a small icon on the creature (`09`).
- **Lands stack** into one pile with "×N"; tapped ones rotate inside the pile.
- Opponent's summoning-sick creatures also carry the "Zz" mark.
- **Stack panel** top-left, "The Stack · N", a card image per item; a triggered ability is a compact card with
  a blue TRIGGERED ABILITY label and its text (`08`).
- **Board menu** (`10`): Card size slider, Show decklist, Auto-yields, Settings, Keyboard shortcuts, Report a
  problem, Reload, Record a macro, Concede.
- Endstep's own bug: the large hover preview sticks when the hovered card leaves the battlefield or hand (the
  Forest/Rancor previews sat in the middle of the board for several turns). Ours has the same bug (`91`); we
  fix ours.

## 6. What ForgeCoach should do (the spec for the lanes)

Wire facts that bound it (mtg-table `docs/protocol.md`): Forge's `InputBlock` is attacker-first on the wire
(click an attacker, then the blocker; re-click a blocking creature removes or moves the block); the lane-6
client already translates clicks into act sequences, so **the client may present blocker-first and send the
attacker first**. `assign_damage` carries `defenderAllowed`, `targets[].lethal` (M67) and `reason` on a re-ask;
the bridge refuses an illegal map, so the client's job is to never build one and to show `reason` when it
does.

1. **Attack lane**: a band between the halves; declared attackers (either side) tapped and lifted into it;
   the COMBAT text table is gone for good.
2. **Declare attackers slot** exactly as §1: count-tracking primary, Alpha [A], Skip [Esc], Call back; tilt on
   select; only legal attackers outlined.
3. **Declare blockers** exactly as §4: blocker-first, numbered badges + curved lines, remove by re-clicking
   blocker then its attacker, No blocks [Esc], Done blocking [Space], the slot's wording as quoted.
4. **Divide damage bar** exactly as §3: above the hand, steppers, lethal pips, "N left of M", Reset [R],
   Confirm [Space] disabled while illegal; player row only when `defenderAllowed`, locked until every blocker
   has `lethal`; `reason` from a re-ask shown in the bar's sentence line.
5. **Targeting and payment** as §5 (counter line, Cancel/Confirm, green outlines, sources lit).
6. Stuck hover preview: clear it when the hovered card id leaves the DOM or any pointer move happens outside
   a card.

## D423 — `input.selectable.playerIds`: which players a click is taken for (M66); the bridge's one Forge field read by name

*Branch `claude/protocol-yield-chosen-players`.* Amendment **M66**. A key inside
`input.selectable`, planned in §10.2 since M1 and never emitted. Asked for by
the PC session's Endstep study (2026-10-10), approved by the owner the same
day. Siblings: **D421** (M64), **D422** (M65).

**2026-10-10**

**Context.** Forge's `setSelectables` takes cards only, so "any target" came
over the wire as the creatures and nothing about the players; a client had to
guess from the prompt's words whether a player could be clicked. The LLM seat
did exactly that (`decision.mjs` `playerWords`: "any target", "target
opponent"… — and s20's Walking Ballista still pinged its own Ballista, the only
card listed). Forge itself does not tell its GUI either: the desktop lets a
player panel be clicked and `InputSelectTargets.onPlayerSelected` decides.

**Decision.**

- **`selectable.playerIds: number[] | null`**, ids ascending, written on every
  `input` a seat writes (per file, all or none). Forge's rule for each input,
  read by `InputPeek` beside M65:
  - `InputSelectTargets` — `onPlayerSelected`'s own tests, in its order: a
    player already targeted (the click takes it back), else not out of the
    game, attachable for an Aura spell, `sa.canTarget(player)`, not under a
    must-target filter that narrowed the choice to cards, and through the
    caller's filter;
  - `InputSelectEntitiesFromList` — the players among `getValidChoices()`;
  - `InputAttack` — the defending players (`Combat.getDefenders()`; a click
    makes one the next attacker's target);
  - `[]` for the inputs whose `onPlayerSelected` is `InputBase`'s empty method
    (priority, a block declaration, a confirm, the mulligans, convoke) — a fact;
  - `null` for no input, a mana payment (`InputPayManaOfCostPayment` takes a
    click on yourself as Phyrexian life) and any class `InputPeek` does not
    know — "cannot say".
- **`mode` is unchanged** (still from `cardIds`): a reader that switched on it
  keeps its behaviour, and `playerIds` is where a player-only choice shows.
- **The one Forge field read by name.** `InputSelectTargets` keeps its ability,
  its targets, its filter and its must-target flag in private fields with no
  getter in the pinned 2.0.14 jar (javap), and its player rule needs the
  ability. `InputPeek` looks the four fields up once, by reflection; on an
  engine where one is missing it prints one line and sends `null` for that
  input class — the same "cannot say" an absent field means. New lint rule
  **`forge-field-read`** (section 8 of `tools/lint-bridge.sh`, with its
  self-test cases): `getDeclaredField(` only in
  `bridge/src/mtgtable/InputPeek.java`; a second reader is a decision.
  `SelectionSelfTest` fails if the fields are gone, so an engine upgrade finds
  out at the gate.
- **The LLM seat** offers exactly the listed players when the frame carries the
  key (the prompt-word guess stays only for an older engine), and a player-only
  choice with `mode: "none"` is a selection when players are listed.
- **A quirk left as it is**: `input.highlighted` carries player ids (Forge
  highlights the targeted player and the current defender through the same
  call as cards; `highlighted: [1]` is in every committed human-seat recording,
  through the attack declaration) — and player ids collide with card ids (the
  probe's game 1 has a card 1, which `highlighted: [1]` then names by mistake).
  Taking them out changes every recording's re-record; the protocol now says to
  read players from `playerIds` / `chosen.playerIds`. A follow-up should
  separate them.

**Rejected.**

- *A controller subclass recording the ability being targeted.* Spells are
  targeted through `PlayerControllerHuman.chooseTargetsFor`, but the seat's
  controller is Forge's own (`GamePlayerUtil.getGuiPlayer()`); replacing it for
  every seat to learn one ability is a far larger seam than four fields.
- *Every player, always, and let Forge refuse.* That is the guess the field
  exists to end: Duress ("target opponent") would offer the seat itself, and a
  hexproof player would be offered to Lightning Bolt.
- *Emit `mode: "players"`.* Every reader of `mode` would change meaning.

**Evidence.** `SelectionSelfTest` (gate step 12l) on Forge's own cards: Lightning
Bolt both seats; Into the Void none; Duress the opponent alone; Curse of the
Pierced Heart both; with Leyline of Sanctity on the opponent's side, Bolt and
the Curse the seat alone and Duress nobody; a player already targeted listed;
the must-target and caller filters applied. Live (`tools/ws-select-probe.mjs`,
seed 11): Lightning Bolt's prompt `playerIds [0, 1]` (input 72), Into the
Void's `[]` with a creature offered (input 351), the attack declaration's `[1]`
(game 2, input 827); every other input `[]` or `null` as above; the seat's one
`clickPlayer` per game came from the list.

## D422 — `input.selectable.chosen`: what the input already holds (M65); the LLM seat's blocks become the engine's

*Branch `claude/protocol-yield-chosen-players`.* Amendment **M65**. A key inside
`input.selectable`; no act or ask changes. Asked for by the PC session's Endstep
study (2026-10-10), approved by the owner the same day. Amends the LLM seat of
**D418** / **D419**. Siblings: **D421** (M64), **D423** (M66).

**2026-10-10**

**Context.** A multi-select input — two targets, discard two, a block or an
attack declaration — keeps its selection inside Forge until it ends, and the
wire did not carry it. `input.highlighted` happened to mirror a targeting
input's chosen cards (Forge highlights them), but not its chosen players (they
arrived in the same card-id list, below), not a list's ticks in general, and not
a declaration at all: Forge writes blocks and attacks into the game's `Combat`
as each click is taken, but the clicks run on the EDT and the snapshot is built
on the game thread when it moves again, so `state.combat` shows nothing until
the declaration ends. The LLM seat found the blocks the hard way
(m20-search-p15, PR #130): a block refused half-way left the first block
declared, and every later try collided with it; the seat now keeps its own
record of its clicks (`seat-core.mjs` `blockDecl`) and takes back the ones the
engine refused. The study wants the board to say "2 of 3 chosen" and outline
them; both want the engine's word.

**Decision.**

- **`selectable.chosen: {cardIds, playerIds, blocks, attacks} | null`**, ids
  ascending, written on every `input` a seat writes (per file, all or none).
  `blocks: [{blockerId, attackerId}]` (one row per pair) in a block declaration,
  `attacks: [{attackerId, defender: {kind, id}}]` in an attack declaration, `[]`
  elsewhere; in a declaration `cardIds` are the blockers / attackers. `null`
  when no selection is up or the bridge cannot say.
- **Read off Forge's own input** by a new `InputPeek`, at the moment Forge
  pushes the prompt (`WireGuiGame.engineInput`, on the push's own thread),
  before the input lock is taken, and cached in the input struct so a `resync`
  repeats it and never reads Forge from the IO thread:
  `InputSelectManyBase.getSelected()` (public) for a list; the game's `Combat`
  for a declaration (`InputBlock` / `InputAttack` write into it); for
  `InputSelectTargets` its private `targets` set, by reflection (D423 is the
  argument and the lint rule). A targeting or list input's facts hold only
  while its `setSelectables` is in force: its own `onStop` calls
  `clearSelectables` while the object is still on the queue, and from that
  frame on the bridge says `null`.
- **Threads**: an input on the seat's queue means the game thread is parked in
  it, so the model under the read is not moving; the read is on the EDT (the
  thread whose click just changed the selection) or the game thread; only model
  objects are read, never a view. A read that throws is counted (`input peeks`
  in the run summary) and the frame goes out with `null`.
- **Hidden information**: ids only, and only of what the seat can already see —
  a chosen target or entry is in `selectable.cardIds` of the same input; a
  declared blocker or attacker is the seat's own creature on the battlefield.
  `tools/check-redaction.mjs` holds the shape, the per-file rule, and those two
  rules (five controls, `m65-*`).
- **The LLM seat** takes the engine's word when the frame carries it:
  `declaredBlocks()` is `chosen.blocks` (the seat's own record stays for an
  older engine); an attack decision's already-declared attackers are
  `chosen.attacks`; a multi-select choice does not click what the input already
  holds (that would take it back) and takes back what it holds but is not
  wanted.

**Rejected.**

- *Read `highlighted`.* It is a display hint with Forge's own uses — the current
  attacker being blocked, the current defender — and it mixes in player ids.
- *Put the declaration into `state.combat` early.* The snapshot belongs to the
  game thread; building one on the EDT would walk the view graph off it (hard
  rule 3), and the engine is parked, so there is nothing to flush.
- *Count only (`chosenCount`).* The board must outline which, and the seat must
  know which.

**Evidence.** `tools/ws-select-probe.mjs` on the real engine (seed 11):
`human-ws-11` state 615 shows two attackers and no blocker; after the seat
clicks Kang (69) and a Gray Ogre (28), input 625 carries `chosen.blocks
[{blockerId: 28, attackerId: 69}]` while the state still shows none, and only
state 630, after OK, does. Into the Void ("up to two target creatures"): input
351 `chosen.cardIds []`, input 353 after one click `[52]`; Careful Study's
"discard two" `[5]` after one; game 2's attack declaration `attacks [{20 →
player 1}]` at input 834. `SelectionSelfTest` reads one and two blocks, and
attacks at a player and at a planeswalker, off a real `Combat`. Every frame of
the run passes `check-redaction.mjs`.

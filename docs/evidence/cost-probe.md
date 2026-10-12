# A click is never a commitment — the cost probe on the real engine (M69, D427)

*2026-10-12, branch `claude/rules-integrity-2`.* Forge 2.0.14 (the pinned jar,
sha256 `3c0a7c38…8e5dd9`), `tools/ws-cost-probe.mjs` as the seat:

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8782 --seed 3 \
    --deck decks/cost-probe.dck --ai-deck decks/blockers-probe.dck
node tools/ws-cost-probe.mjs --port 8782 --report var/cost-probe.json --frames var/cost-probe.jsonl
```

`decks/cost-probe.dck` has one permanent per cost that gives something up, and
Bone Splinters (an additional cost: sacrifice a creature). The probe plays lands,
casts the permanents, and on its own main phase, for each permanent the state's
`activatable` (M63) lists:

- **look** — clicks it, expects an `ability_menu` (the click must not activate
  anything), answers `null` ("never mind") and compares the seat's board (life,
  hand, graveyard, exile, battlefield with tapped flags, stack, mana pool) with
  the board before the click;
- **cancel1** — clicks, chooses the ability, records the first cost prompt (after
  the engine has finished pushing it), presses Cancel (or No, or answers `null`)
  and compares the board;
- **cancel2** — answers the first cost prompt (mana with Auto, a Yes, a pick) and
  presses Cancel at the next one, if there is one: is the part already paid
  given back?

and once: a basic land clicked at priority (no menu expected: a tap for mana is
an undoable mana ability), and `undo` when the engine offers it.

## Result: 20 scenarios, 0 failures

`cost-probe: 20 scenario(s), 0 failure(s)` (frame seqs from the run's
`--frames`; `fixtures/cost-probe/m69-frames.json` is cut from it, one entry per
scenario).

| permanent | cost | scenario | menu seq | prompts (seq: what the input said; OK / Cancel) | result |
|---|---|---|---|---|---|
| Forest | `{T}`: add mana | landTap | — | — | no menu: tapped at once (pool 0 → 1); undo gave it back |
| Sakura-Tribe Elder | sacrifice itself | look | 187 | — | a 1-option menu; never mind changed nothing |
| | | cancel1 | 188 | 193 "Sacrifice Sakura-Tribe Elder?" Yes / **No** | No undid the activation |
| | | cancel2 | 200 | 205 the same | one prompt: Yes is the commitment |
| Woodwraith Strangler | exile a creature card from the graveyard | look | 283 | — | a 1-option menu; never mind changed nothing |
| | | cancel1 | 284 | 287 `ask: choose_entities` "Exile a creature card from your graveyard" (`min` 0) | `null` undid the activation |
| | | cancel2 | 294 | 297 the same | one prompt: the pick is the commitment |
| Carrion Feeder | sacrifice a creature | look | 515 | — | a 1-option menu; never mind changed nothing |
| | | cancel1 | 516 | 521 "Select creature to sacrifice (1 left)", OK off / **Cancel on**, 2 selectable | Cancel undid the activation |
| | | cancel2 | 531 | 536 the same | one prompt: the pick is the commitment |
| Wild Mongrel | discard a card | look | 1028 | — | a 1-option menu; never mind changed nothing |
| | | cancel1 | 1029 | 1034 "Discard a card…", OK off / **Cancel on**, 4 selectable | Cancel undid the activation |
| | | cancel2 | 1044 | 1049 the same | one prompt: the pick is the commitment |
| Greed | `{B}`, pay 2 life | look | 717 | — | a 1-option menu; never mind changed nothing |
| | | cancel1 | 718 | 724 "Pay Mana Cost: {B}", Auto / **Cancel** | Cancel undid the activation |
| | | cancel2 | 732 | 738 "Pay Mana Cost: {B}" → Auto; 743 "Do you want to pay 2 life?" Yes / **No** | No after the mana was paid: the mana given back, no life paid |
| Mind Stone | `{1}`, `{T}`, sacrifice itself (its 2nd ability) | look | 575 | — | a 2-option menu; never mind changed nothing |
| | | cancel1 | 576 | 583 "Pay Mana Cost: {1}", Auto / **Cancel** | Cancel undid the activation |
| | | cancel2 | 590 | 597 "Pay Mana Cost: {1}" → Auto; 601 "Sacrifice Mind Stone?" Yes / **No** | No after the mana was paid: the mana given back, Mind Stone untapped |
| Bone Splinters (cast) | `{B}`, sacrifice a creature (additional) | cancel1 | — | 347 "Select target creature", 4 selectable → a target; 357 "Pay Mana Cost: {B}" → Auto; 365 "…sacrifice a creature", OK off / **Cancel on**, 1 selectable | Cancel at the sacrifice, after the mana was paid: Bone Splinters back in the hand, the mana given back |

In an earlier run of the same seed (before the probe read the settled prompt),
Carrion Feeder's sacrifice prompt listed **one** selectable card — the Feeder
itself, the owner's position — and was still a prompt with Cancel, not a choice
made for the player.

## What it shows

1. **Before M69 a click activated a lone ability.** Every probe permanent with
   one ability now raises a one-option menu, and `null` changes nothing.
2. **No give-up cost is chosen for the player.** Sacrifice a creature and discard
   are card selections (OK disabled until a pick, Cancel enabled), sacrifice
   itself and pay life are a Yes/No, exile from the graveyard is an optional
   choice — even with one legal option.
3. **Every cost can be cancelled once begun.** Cancel, No or `null` at any
   prompt — after the mana part was paid included — puts the board back as it
   was before the click. No cost type needs a bridge-made confirm before the
   activation; the menu M69 adds precedes every non-undoable activation on the
   battlefield, and the pick or the Yes that completes a cost is the player's
   answer to a prompt that names what it costs.
4. **A land still taps on a click**, and `undo` gives the mana back.

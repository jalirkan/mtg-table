## D420 — `state.activatable`: the engine says what the seat may activate on the battlefield (M63); the LLM seat stops guessing from card text

*Branch `claude/engine-activatable`.* Amendment **M63**. It adds a key to the seat's `state`; no act, ask or input changes. Amends the LLM seat of **D418** / **D419**.

**2026-10-09**

**Context.** Nine shakedown games of the LLM seat with a real model (Sonnet,
plan mode) failed the same way again and again on the battlefield. M61 (D413)
tells a seat what it may play from hand, graveyard, exile, command zone and the
top of its library, in Forge's own words; it left the battlefield out, because a
board's permanents were always clickable. A board can click and let Forge
answer. A seat that must *tell a model* what it can do cannot: the LLM seat
guessed which permanents had an activated ability from their card text
(`oracle.mjs hasNonManaActivated`), and every guess missed a family — `Equip
{1}` written without a colon, a named equip (`Murasame — Equip {5}`), a
planeswalker's loyalty abilities (Jace, Elspeth and Teferi steps refused), and a
Clue token, which has no card text at all ("activate Clue Token" refused four
times). Each miss was patched with a wider regex, and the next game found the
next family. The guess never converges; the engine already knows.

Two smaller failures of the same games had the same shape — the seat working
something out that the engine had already said:

- **Two targets from two steps.** Ghostly Flicker asks one question that needs
  two targets; a plan that wrote them as two `target` steps failed the first
  step ("this question needs exactly 2 choices and you named 1").
- **Delve.** Treasure Cruise failed five times with "the engine could not pay".
  Measured on the wire (a fake-model game, `act-probe0`): Forge's
  `PlayerControllerHuman.chooseCardsToDelve` asks `choose_list` "Delve how many
  cards?" (options `"0"`..`k`, `k` = min(generic cost, graveyard)) and then
  `choose_list` "Exile which card(i/n)?" once per card (min 0, max 1, the
  graveyard's cards), where answering none clears the whole delve — and only
  then the mana input, `Pay Mana Cost: {7}{U}` reduced by what was delved. The
  seat sent the first question to the model as an ordinary choice; "0" (or a
  "none" later) left the full cost, and Auto could not pay it.

**Decision.**

- **`state.activatable` (M63)**, beside `state.playable` and under its rules:
  at the seat's own priority, `Playables.activatable` asks
  `Card.getAllPossibleAbilities(player, true)` of each permanent the seat
  **controls** and keeps the non-mana abilities `canPlay()` allows — the list a
  click on that permanent plays from. Each entry is M61's shape with `zone:
  "battlefield"` and `isSpell: false`. Null off the priority and in the frame an
  ask flushes; on every frame of a seat, never in an AI-vs-AI recording (per
  file, all or none); a card whose abilities throw is skipped and counted.
  One check beyond the click's own: an ability whose required targets have no
  candidate is left out (`TargetRestrictions.hasCandidates`, on the ability and
  its sub-abilities with a minimum above 0). Measured in a fake-model game on
  the Pauper pair: Ancestral Blade's equip was listed with no creature in play,
  the click went nowhere, and the step was cancelled twice. `playable` keeps
  M61's exact meaning and does not apply it.
  `Snap.state` gates every entry again (controller is the viewer, on the
  battlefield, shown in full) and drops anything else with an `ACTIVATABLE
  DROPPED` line; labels go through `Snap.abilityLabel`.
- **A separate key, not a sixth zone of `playable`.** ForgeCoach copies
  `protocol.ts` and outlines hand and graveyard cards by `playable`; a
  battlefield entry there would change what its readers draw, and the redaction
  checker's M61 rule ("never the battlefield") would have to be loosened. A new
  optional key leaves every reader of `playable`, and every committed recording,
  exactly as it was (`wire-drift.mjs` and `fixture-multiset-diff.mjs` treat it
  as a later key, as M49's `keywords` and M61's `playable`).
- **The seat offers activations exactly from the list** when the frame carries
  the key (even `null`): one option per ability with the engine's label, the
  click on the permanent, and the engine's `ability_menu`, if one follows,
  answered with the chosen `abilityId` (by label when the id differs). The
  card-text hint stays only for an engine or a recording without the key. The
  prompt's *WHAT THE ENGINE LETS YOU DO NOW* lists them one per line, permanent
  and label (`Jace, the Mind Sculptor: +2: Look at the top card…`), and a step
  names one of several as `activate <card>: <ability>` — its loyalty cost
  (`+2`, `-1`, `0`; `2` for `+2`) or words of its label; with none named the
  engine's menu is asked as a question. The system prompt gained one line for
  that. The end-step phase stop counts a permanent the engine listed with an
  ability that is not sorcery-speed by its kind (a loyalty ability, an equip),
  so a Clue earns the stop the card-text hint could not give it.
- **N choices from consecutive steps.** A question that needs N choices takes
  the `target` / `choose` steps that follow the step answering it, in order,
  until N are named; only a real shortfall is a correction, with the message
  it always had.
- **Delve is paid by the seat, through the engine's own prompts**, like the
  rest of the mana and never as a model question: "Delve how many cards?" is
  answered with what the untapped mana cannot cover (keeping mana for the
  plan's later `cast` steps), all of it when the mana is short anyway;
  "Exile which card(i/n)?" with a land first and never a card the engine last
  listed as playable from the graveyard while another will do — never "none".
  The mana words know delve too (`payProblem` reduces the generic cost by
  min(generic, graveyard) instead of giving up), and a payment that still
  fails says how many cards delve exiled.

**Rejected.**

- *A wider regex.* It is what failed: four patches, four new families, and a
  token with no text can never be read.
- *Battlefield entries inside `playable`.* Changes M61's meaning for its
  readers (above).
- *Fill `Card.abilities` (M5).* The same reason D413 gave: a per-card array the
  corpus has as `[]` everywhere, for every ability of every card; the question
  is narrower and only meaningful at the seat's priority.
- *Ask the model for delve.* It is payment, not a choice of play: the model
  already chose to cast the spell, and a "none" anywhere in the per-card
  questions silently undoes the whole delve.

**Evidence.** `mtgtable.PlayableSelfTest` (gate step 12l) on Forge's own cards:
Jace's +2, 0 and −1 listed and the −12 not at loyalty 3, not after a loyalty
ability this turn, not on the opponent's turn, its −1 not with no creature in play;
Samurai's Katana's named equip (not with no creature to equip);
a Clue token's sacrifice; Smuggler's Copter's crew; never an Island's mana
ability, a vanilla creature or the opponent's permanents; `Snap.state` drops a
hostile comfort's entries. The LLM seat's unit tests
(`tools/llm-seat/test/activatable.test.mjs`) and fake-model games against real
Forge (the PR's description) show loyalty, Clue and equip activations offered
from the engine's list and executed, two target steps filling Ghostly Flicker,
and Treasure Cruise cast with delve.

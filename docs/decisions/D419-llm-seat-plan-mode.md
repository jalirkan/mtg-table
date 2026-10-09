## D419 — The LLM seat's plan mode: the model is asked for a turn's plan in plain words, the code carries the steps out, and a step that cannot be done comes back with the reason

*Branch `claude/llm-seat-plan`.* Amends **D418** (the LLM seat). `tools/llm-seat/`
(`lib/plan-core.mjs`, `lib/plan.mjs`, `lib/plan-prompt.mjs`, `lib/mana.mjs`,
`plan-dry.mjs`), `docs/llm-seat.md` (*Plan mode*).

**2026-10-09**

**Context.** The first real run of D418's seat (J119: two games against Forge Default,
`fresh`) finished both games with no fallback, but at 150 and 110 model calls a game and
about 460k tokens a game; a third of the first replies had prose before `choice:`; half the
main-phase menus listed cards the seat could not afford; and each call saw one micro-step,
never the turn. Justin wants Sonnet to play the way a person uses an assistant: show it the
game plainly, ask what to do this turn, carry out the steps, and when a step is illegal or
unclear, tell it why and ask for corrected directions. A fake-model game on the real engine
then showed a loop in D418's seat: an optional cost it could not pay (Teamwork) chosen, the
cast cancelled, the same cast again — 1,900 times in a turn.

**Decision.**

1. **`--mode plan`, the default; `--mode decision` keeps D418's behaviour** (seat.mjs,
   run-match.mjs). Both share the socket, the frame log, the stops, decision.mjs's reading of
   the wire and the context arms.
2. **The system prompt opens with the exact reply format**: `PLAN:` (a sentence or two),
   `STEPS:` with numbered steps from eleven fixed verbs (`play land`, `cast`, `activate`,
   `attack with`, `block … with …`, `target`, `choose`, `keep`, `mulligan`, `pass`, `hold`),
   `END`; a worked example; and the plain statement that a reply not in this shape cannot be
   read and is sent back as invalid, costing a turn of conversation. Reasoning is allowed only
   before `PLAN:`. The parser is strict and every rejection names the exact fault.
3. **The game in plain words, no menus**: the turn and phase, life, counts, both sides'
   lands and permanents with their state, the hand with costs, the untapped mana and its
   colours, graveyards, exile, the stack, combat, the game log, what the engine lets the seat
   do now with the spells its untapped mana cannot pay for named as such, and the card text.
   The seat's redacted view only.
4. **A call only at a moment**: the start of its own turn when it could do something, the
   mulligan and play/draw, an opponent's spell or ability it could answer with something it
   can pay for, the block declaration, the opponent's end step when it could act, an engine
   question the plan did not answer, and a correction. Mana, empty priority, one-answer
   questions, its own spell resolving and a `cast` step's ability menu are code.
5. **The engine judges; the reason goes back in words.** Steps are matched by verb and card
   name (case, accents and punctuation ignored, `#id` for a choice among same-named cards)
   against what the wire offers. A step with no match, one the untapped mana cannot pay for,
   a refused click, a payment the engine could not make, or a cast that came back cancelled
   stops the plan; the model gets the reason, what was done and the plan, and gives
   corrected steps. **At most 2 corrections a moment** (an unreadable reply counts), then the
   safe default, counted as a fallback.
6. **The loop guard, in both modes**: an optional cost the seat cannot pay is never offered
   (Teamwork's total power, a number of creatures to tap, a mana cost; one it cannot read is
   offered); and a card whose play comes back cancelled twice in a turn is not offered or tried
   again that turn.

**Alternatives rejected.**
- *Keeping the numbered menu and asking per prompt, with more filtering*: it saves calls but
  still shows the model one micro-step at a time, which is what Justin asked to change.
- *A JSON reply*: as strict, but harder for the model to write reasoning-first and for a
  person to read in the log; the line format is just as machine-checkable.
- *Letting the model's steps run without a mana pre-check*: the engine would still refuse,
  but by a cancelled payment, and the reason the model gets would be vaguer; the pre-check is
  a hint only and steps aside for anything it cannot read.
- *Asking at every opponent spell*: a hand of unaffordable instants asked about every spell
  (12 of 34 calls in the first real-engine fake game); now only when something is payable.

**Measured** (fake model, no spend). Real engine, Forge 2.0.14, `pacho-shield` vs
`doom-legion`, seeds 1–2 mirrored, `fresh`: four games played to the end (14–16 turns), 16,
30, 30 and 31 calls, 3 corrections, 0 fallbacks, 0 refused clicks; mean user message 3.5 KB
plus the 2.3 KB system prompt, ≈ 40k tokens of prompt a game. The same decks in decision mode
now finish (14 turns, 94 calls) where the loop held the game. Fixture dry run
(`plan-dry.mjs`, pre-M61 recordings, over-counting): 26–63 calls, ≈ 40–115k tokens. Estimate
for Sonnet: 25–50 calls and 40–80k prompt tokens a game, ≈ 100–180k with Claude Code's
per-call overhead, against J119's 110–150 calls and ≈ 460k.

## D418 — The LLM seat: a Claude model plays the human seat against Forge, under three context arms, with the engine's own options, Forge's phase stops and a positions mode for paired grading

*Branch `claude/sonnet-seat`.* `tools/llm-seat/`, `docs/llm-seat.md` (the manual). Builds on
M61 (`state.playable`, D413), M32/M33 (phase stops), D292/D346 (how the coach helper runs
`claude -p`), D334/D353 (coach-grade and its moments), D398 (mirrored deals).

**2026-10-09**

**Context.** Justin wants to know whether Claude Sonnet plays worse as one chat gets longer.
The seat that answers that has to (1) play whole games against Forge with nothing but the
engine's legal moves, (2) spend model calls only where there is a decision, (3) carry its
context in three ways that differ in nothing else, and (4) produce evidence that can separate
the arms, which win rates over a few dozen games cannot (20 games an arm: ±22 points).

**Decision.**

1. **A seat client over `/ws`, not a new transport.** It is a client like
   `tools/ws-auto-play.mjs` (settled decisions, one move per settled input, a client frame log
   with `recordedBy: "client"`); the bridge is unchanged. It never uses `/observe`, never
   concedes on its own, and never sends `yieldTo` or `setYield`.
2. **The options are the engine's.** Priority: `state.playable` (M61) plus your permanents
   whose oracle text has a non-mana activated ability (the wire has no battlefield list,
   §3.2); asks: their own options; a selection: `input.selectable`. Attack candidates and
   block pairs are read off the board because Forge's attack and block inputs never name
   selectables (§4.1, M8) — the engine still judges every click, and a refusal makes the
   seat play the default on that input, then the buttons, so nothing loops.
3. **When to ask** (Justin's rule): every engine question goes to the model except one with
   exactly one legal answer; priority with nothing playable is passed with no call; mana is
   paid by the engine's Auto. Six rare ask kinds (`order`, `assign_damage`, `assign_amount`,
   `manipulate_list`, `sideboard`, `text`) get the bridge's own default and say so in the log.
4. **A strict reply** — `choice:` and an optional `next:` line, nothing else — validated
   against the decision; one retry with the reason, then the safe default, counted as a
   fallback.
5. **Forge's own phase stops** after each model decision: own MAIN1 and MAIN2; the opponent's
   declare-blockers step while the seat has a creature; the opponent's end step while it has an
   untapped land and an instant-speed option; plus the reply's `next:`. **Verified** that the
   stops cannot hide an opponent's spell: Forge consults the stop only with an empty stack
   (`PlayerControllerHuman.java:1677-1679`, `:3804-3812`, as report 11 quotes them), the
   bridge's `WireGuiGame.isUiSetToSkipPhase` (`:2282-2289`) is the stop map and nothing else,
   and 134 recorded priority prompts with the AI's spell on the stack arrived in phases that
   were not stops (`fixtures/games/human-auto-42.jsonl` line 134 the first). The attack
   declaration is not gated either (193 recorded attack inputs with no stop).
6. **Three arms, one system prompt, one decision block.** `fresh` (a new `claude -p` with the
   whole game log every call), `session:N` (`--session-id` then `--resume`; after the first
   message only what happened since the last decision; a new session with the history
   re-supplied every N calls), `game` (one session). The arms differ only in the context
   carried, which the golden prompt file holds.
7. **The positions mode is the experiment's main instrument.** `replay.mjs` poses every
   recorded position to every arm (a session arm walked as one real session in game order,
   told the move actually made when it differed — `chain`; or one call per position with the
   session as text — `transcript`) and writes coach-grade moments whose `extra` carries every
   arm's choice, so `coach-grade.sh batch` grades all of them on the same playouts and `join`
   gives each arm's regret and the **paired** difference between arms. Only the grader's four
   types (`spell`, `attack`, `block`, `target`) are graded; the others are logged ungraded and
   `docs/llm-seat.md` says what grading them would take.
8. **No spend here.** `--model fake` is the default; the tests use a fake bridge over a real
   socket and the recorded fixtures; the first real call is the owner's pilot on the PC.

**Alternatives rejected.**
- *Asking the model at every priority stop*: about three times the calls for decisions that
  have one legal answer; the stops and the auto-pass do the filtering Forge's own UI does.
- *A pass-to (`yieldTo endOfTurn`) instead of stops*: `mayAutoPass()` would skip the
  opponent's spells too (point 5).
- *Writing earlier positions into Claude Code's session files as assistant turns*: an internal
  file format; the `chain` walk gives the model real turns of its own instead.
- *Win rate as the comparison*: kept for the games' own sake, but the paired regret over the
  same positions is the number that can separate arms at this sample size.

**Measured** (dry run, fake model, `fixtures/games/human-auto-42.jsonl`, 22 turns, 117
positions): mean user message 4.9 KB (`fresh`), 2.8 KB (`session:5`), 2.5 KB (`session:10`),
2.3 KB (`game`); per game the model reads ≈190k, 320k, 470k and 3.5M tokens (bytes / 4; a
session re-reads its conversation each call, mostly from the cache). `docs/llm-seat.md` has
the method and two more fixtures.

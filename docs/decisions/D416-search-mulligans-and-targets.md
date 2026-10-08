## D416 — The search takes two more decisions, each behind its own switch: the opening hand (`mull=1`: keep or mulligan, and the London bottom) and the targets of its own priority play (`targets=1`); search-v2 is unchanged

*Branch `c/search-mull-targets`.* Extends D312 (the search's three decisions), D350 (the lcb
rule) and D388 (the anytime loop). Ladder players `search-v2-mull`, `search-v2-targets` and
`search-v2-mull-targets`; the fixed matches that decide them are J114 (`pc-jobs`).

**2026-10-08**

**Context.** Since D312 the search reconsiders three of Forge's answers: what to play with
priority in its own main phase, attacks and blocks. Every other question is Forge's rules
(`docs/research/ai-architecture.md` §2): among them the mulligan (`ComputerUtil.wantMulligan`,
a land-count score), the London bottom (`PlayerControllerAi.tuckCardsViaMulligan`: excess lands
first, then the highest mana value), and the targets of what it plays (each `SpellAbilityAi`'s
`canPlayAI` picks them, greedily). This change lets the search measure those too, each switch
off by default so it can be measured on its own (D398's fixed match) before any is adopted.

### 1. The opening hand: `mull=1`

**Where.** `PolicyControllerAi.mulliganKeepHand` (Forge answers first, then
`SearchPolicy.chooseMulligan`) and `PolicyControllerAi.tuckCardsViaMulligan`
(`SearchPolicy.chooseBottom`). Both are asked before turn 1, while the game has no phase.

**Candidates.**
- Keep or mulligan: Forge's answer and the other one.
- The London bottom (Forge 2.0.14 asks it right after the new seven are drawn, before the next
  keep question): Forge's cards, then every other single card when one goes to the bottom, or
  Forge's choice with one card swapped when several do; distinct by name. The cheap prior is
  Forge's own `ComputerUtil.scoreHand` of the hand each choice would keep; the best `cands - 1`
  are searched.

**One rollout.** The pre-game copy (`LenientGameCopier`; the copier sets turn 0 and no phase,
as the real game is) is determinized as usual (D312: the opponent's hand and library pooled
and redealt, the AI's own library shuffled), and only then does the candidate act
(`Cand.afterDeterminize`, new): a mulligan puts the hand into the redealt library, shuffles it
with the rollout's seeded random, draws seven and lets Forge's AI bottom the cards, as
`LondonMulligan` does without its 100 ms pause; a bottom choice moves its cards under the
redealt library. Then Forge's AI takes any further mulligans it wants on the hand it holds (to a
hand of three), the opponent keeps the hand it was dealt (whether it has already kept is not
public), and the copy's first turn starts (`PhaseHandler.setupFirstTurn` with the real first
player). Forge's Default AI plays both seats, as in every rollout.

**Never peeks.** The candidate draws only from the redealt library, so a mulligan's new hand is
a function of the public multiset and the seed. The self-test holds it: two games that differ
only in the opponent's hand/library split and order and in the AI's own library order give the
same new hand and the same opponent hand, seed for seed (12 seeds, 11 distinct hands).

**Horizon and budget, and why.**
- **Horizon: to the end of game turn 6** (`mullturns=3`: each seat has had three turns). A
  keep/mulligan choice shows in the first land drops and the first plays: a missed third land
  or a four-land, three-spell hand against a mulligan to six has played out by turn 6. Each
  further turn costs a full turn of Forge playing both seats, and adds draws that have nothing to
  do with the opening hand, so noise grows with the horizon while the signal does not. Measured
  in this container on the self-test's board: 13 rollouts to turn 6 in 3 s (about 0.23 s each);
  to turn 8 on a cube deal (the first smoke, `mullturns=4`, 4 s), fewer than three paired rounds
  in 4 s, so every verdict fell back to Forge.
- **Budget: 6 s a decision** (`mullms=6000`), not the 1.5 s of the other decisions. A seat is
  asked once a game, a second time after a mulligan, so it costs about 7 s a game where the
  other decisions cost about 25 × 1.2 s; and a 6-turn rollout costs several 1-turn ones. Two
  candidates at about 0.3–0.6 s a rollout give 5–10 paired rounds.
- **The rule: lcb, always.** The opening hand overrules Forge only when the lower bound of the
  paired per-round difference (z 1) clears the margin over at least 3 paired rounds (D350's
  rule; `lcbFor`). The rollouts are long and noisy, the rounds few, and a wrong mulligan costs a
  card; D312's margin on raw means would override on one lucky round. A search with fewer than
  3 rounds keeps Forge's answer and is counted (`search.m.fewRounds`, `search.k.fewRounds`).
- Copy errors, an unmappable candidate or no evidence: Forge's answer, counted as every
  fallback is (`search.fallback.*`).

**Known limits.** The opponent never mulligans in a rollout; a multiplayer or Brawl game
(where the first mulligan is free) is not searched; a Leyline-style opening-hand action is not
replayed in the copy (Forge's `runOpeningHandActions` is private). The London bottom is not a
D347 decision record (the record has no kind for it); it is counted.

### 2. Targets: `targets=1`

**Where Forge chooses them.** For the AI's own spells and abilities, inside `canPlaySa` (the
per-API `SpellAbilityAi`), before `chooseSpellAbilityToPlay` returns the play.
`chooseTargetsFor` is asked only when another player chooses the targets (`TargetingPlayer`) or
from inside a resolving effect, and `chooseSingleEntityForEffect` is a choice, not a target; a
copy cannot start there, because the copier does not carry the stack (`GameSimulator.COPY_STACK`
is false). So the target search runs where the targets are set: on the priority answer, after
it is chosen (Forge's, the outlet policy's excepted, or the priority search's), whenever the
stack is empty, in any phase of either turn. `chooseTargetsFor` stays Forge's and is counted
(`search.t.chooseTargetsFor`), so the job can say how often that path comes up.

**Candidates.** For each part of the play's chain with exactly one target (not divided, not
random, not `TargetingPlayer`): every other legal target the AI can see (`getAllCandidates`
with cards, `canTarget`, and D347's visibility: a player, or a card in a public zone). One
alternative changes one part; the others keep Forge's targets. The cheap prior: targets on the
side of Forge's own target first (Forge's choice says whether the play hurts or helps), then by
Forge's card value (`GameStateEvaluator.evalCard`; a player counts 1000). Forge's targets and
the best `cands - 1` others are rolled out like a priority candidate (the play forced first,
then Forge to the end of this turn), on the search's own rule and budget (search-v2: anytime,
margin 20, 1.5 s). A winner is set on the real play only if it is still a legal target
(`canTarget`, `isTargetNumberValid`); otherwise Forge's stays (`invalidAtEnd`).

**Not covered**, left to Forge: parts with several targets or divided amounts; triggered
abilities' targets (they are chosen while the trigger goes on the stack); targets on a
non-empty stack (counterspells, responses).

### 3. What does not change

- `SearchConfig.parse` and `parseLive` default both switches off and print them only when on,
  so search-v1, search-v2 and every ladder player keep their seat configs and hashes
  (`search-v1-anytime` stays `cdd55e02a89c`; `web/test/ai-ladder.test.ts`). The live seat does
  not take either.
- With both off no new code runs: `chooseMulligan`, `chooseBottom` and `chooseTargets` return at
  their first line, and the new counters (`search.m.*`, `search.k.*`, `search.t.*`) are never
  written. `search.rollouts` and the p/a/b counters are as they were.
- The match line (D398) gains `byKind` per side: searched and changed per decision kind
  (p, a, b, m, k, t) with the changed rate. Its `searched` and `changed` stay p + a + b, as J102
  counted them, so the budget-fallback rate means what it meant.

### 4. Tests

- `DecisionSelfTest` (the build's): the switches parse, print and round-trip; search-v2's
  config string is unchanged; refusals (`mull=2`, `targets=yes`, `mullms` out of 50..60000,
  `mullturns` out of 1..8).
- `ai-bench.sh --selftest` (engine), ten new scenarios: the mulligan search fires at
  `mulliganKeepHand`, stays inside its budget and leaves the real hands, library order and
  pre-game state as they were; both candidates play through turn 6; never peeks (above); a copy
  error keeps Forge's keep or mulligan; the London bottom is searched and returns one card of the
  hand; off, no mulligan search; Forge's Flame Slash is target-searched with only visible
  targets by id and stays legally targeted; a copy error keeps Forge's target; an untargeted play
  (Typhoid Rats) is never target-searched; off, no target search. All 72 checks pass.
- `web/test/ai-ladder.test.ts`: the three players are search-v1-anytime's config plus their
  switches and nothing else, four configs and four hashes; the kind's defaults match
  `SearchConfig`'s; `byKind` counts each kind and leaves `searched`/`changed` at p + a + b.

**Smoke** (this container, 4 games each against search-v1-anytime on the confirm set's first
deal, one worker; no engine errors, no timeouts, no fallbacks):
- search-v2-mull: 5 keep/mulligan searches (1.25 a game), 5.6 s and 9–23 rollouts each, none
  changed Forge's answer (one held by the lcb rule); 1 London bottom searched (29 rollouts in
  6 s), changed. 54 s a game on average over the 4 games (the target smoke: 54 s too).
- search-v2-targets: 8 target searches (2 a game), 1.5 s each, 2 changed Forge's target.
- Costs: about +7 s a game for the mulligan seat, +3 s for the target seat. The PR's comment
  has the full output.

**Found, not changed.** `Decisions.targets` (D347's records) lists a target decision's options
with `getAllCandidates(part, true)`, whose flag in 2.0.14 is `onlyNonCard`: card targets are
missing from the options (the chosen one is added and the record marked incomplete). The target
search uses `false`. Fixing the records changes what the lab records and is its own change.

**Rejected.** Searching every keep/mulligan on D312's margin rule (one noisy round would
decide); rollouts to turn 8 at 4 s (fewer than three rounds on cube decks here); letting the
opponent mulligan in the copy (it may already have kept, which the AI cannot know); a target
search inside `chooseTargetsFor` (no stack in the copy); generating multi-target combinations
(the candidates grow as a product; one part at a time covers the single-target removal and
pump spells that make up most of a cube's targeted plays).

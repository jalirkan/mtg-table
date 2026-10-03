# Forge 2.0.14's AI — how it decides, and where a stronger one plugs in

*2026-10-03, branch `c/ai-baseline` (D309–D311). Read from the pinned jar
(`3c0a7c38…8e5dd9`) with `javap` and a decompiler (CFR 0.152, read as prose —
nothing here is copied into the repo), and from `res/ai/*.ai`. Measurements are
in [`docs/evidence/ai-baseline.md`](../evidence/ai-baseline.md).*

The long-term goal (the owner's, 2026-10-03): a stronger Forge AI for his two
180-card two-player cubes, running on his PC, no LLM. This report is step one:
what Forge's AI is, what it measurably does, and the seams we can build on
**without patching Forge's jar**.

## 1. The shape in one paragraph

Forge's AI is a **rule-based, greedy, one-decision-at-a-time** player. The
engine asks a seat's `PlayerController` a question (about 114 of them:
"what do you play with this priority?", "who attacks?", "which card do you
discard?", "keep this hand?"), and `forge.ai.PlayerControllerAi` answers each
with hand-written heuristics: mostly in `AiController` (the "brains"), in the
`ComputerUtil*` helpers, and in one `SpellAbilityAi` subclass per effect type
(`forge.ai.ability.*`, 153 classes: `DamageDealAi`, `DestroyAi`, `PumpAi`,
`TokenAi`, …). Card scripts steer it with hints (`AILogic$`, `SVar:AIPreference`,
`SVar:SacMe`, `AI:RemoveDeck:All`). There is **no lookahead** in the default
mode. An optional **simulation** mode (`AIOption.USE_FULL_SIMULATION`) replaces
only the "what do I play now" question with a shallow search over copies of the
game; it is a lobby-player option, **not** an `.ai` profile, and no profile
turns it on.

## 2. The decision path (default, non-simulating)

| Question | Entry (PlayerController → …) | What decides |
|---|---|---|
| Priority: play something? | `PlayerControllerAi.chooseSpellAbilityToPlay()` → `AiController.chooseSpellAbilityToPlay()` | (1) a `PlayBeforeLandDrop` card; (2) a land: `getAvailableLandsToPlay` → `filterLandsToPlay` → `chooseBestLandToPlay`, unless `isSafeToHoldLandDropForMain2`; (3) `getSpellAbilityToPlay()` below. |
| | `AiController.getSpellAbilityToPlay()` (private) | With a stack: `chooseCounterSpell`, then ETB counters. Then **every** spell/ability from `ComputerUtilAbility.getSpellAbilities`, **minus every card flagged `AI:RemoveDeck:All`** (`saList.removeIf(… isCardRemAIDeck …)`), sorted by `ComputerUtilAbility.saEvaluator` (roughly: CMC, creature first, a few `AIPriorityModifier`s), then **the first one** for which `canPlayAndPayFor(sa) == AiPlayDecision.WillPlay`. Greedy: first acceptable, not best. |
| | `chooseSpellAbilityToPlayFromList` | Runs that loop on a thread named `Game AI Eval` with `game.getAITimeout()` seconds (`FPref.MATCH_AI_TIMEOUT`); on timeout it prints `AI eval thread at timeout` and plays **nothing** this priority. |
| | `AiController.canPlaySa(sa)` | Timing, restrictions, then `SpellApiToAi.Converter.get(sa).canPlayWithSubs(ai, sa)` — the per-API `SpellAbilityAi.canPlayAI` heuristics, which also choose targets — then `saSideEffects` (curses, ETB damage to self, `NeedsToPlay` SVars). Result: an `AiPlayDecision` (`WillPlay`, `CantPlayAi`, `CantAfford`, `WaitForMain2`, `AnotherTime`, …). |
| Attack | `declareAttackers` → `AiController.declareAttackers` → `new AiAttackController(ai).declareAttackers(combat)` | An aggression level 0–6 from a life-race estimate (`doAssault`, `notNeededAsBlockers`), then per attacker `shouldAttack`. Profile knobs (`AiProps.PLAY_AGGRO`, …) bias it. |
| Block | `declareBlockers` → `AiController.declareBlockersFor` → `AiBlockController.assignBlockersForCombat` | Fixed order: `makeGoodBlocks`, `makeChumpBlocks` (if life in danger), `makeTradeBlocks`, `makeGangBlocks`, `reinforceBlockersAgainstTrample`, `reinforceBlockersToKill`, clear and retry when lethal is coming. |
| Triggers, targets, choices | `doTrigger`, `chooseTargetsFor`, `chooseSingleEntityForEffect`, `chooseCardsForEffect`, `confirmAction`, `chooseNumber`, … | Mostly the same per-API `SpellAbilityAi` class (`doTriggerAI`, `chooseSingleCard`, `confirmAction`) or a `ComputerUtil*` helper. |
| Costs | `CostPayment` with `AiCostDecision` (one `visit` per cost type) | e.g. `visit(CostSacrifice)` → `AiController.chooseSacrificeType` → `SpellAbilityPicker.chooseSacrificeType` → `ComputerUtil.chooseSacrificeType` → `getCardPreference(…, "SacCost", …)`: the script's `AIPreference`, then cards with `SVar:SacMe` (priority 6…1, plus `shouldSacrificeThreatenedCard` at 1), then the profile's `SACRIFICE_DEFAULT_PREF_*`, then the worst card. |
| Mulligan, sideboard | `mulliganKeepHand`, `sideboard` | `ComputerUtil` land-count rules; `sideboard` only with `AISideboardingEnabled`. |

**Whether an outlet is worth using at all** is decided per effect, never
globally: a sacrifice cost is accepted only through
`ComputerUtilCost.checkSacrificeCost(ai, cost, source, sa, important)`, which
for "sacrifice another creature" requires a `SacMe` card or a token in the
valid list (and for "sacrifice this" a creature that will die anyway). No code
asks "is one of my creatures about to die, and do I have an outlet?". That
is the gap D310 fills (section 5).

## 3. Profiles (`res/ai/*.ai`) — knobs, not a stronger player

`AiProfileUtil.loadAllProfiles(res/ai)` reads four files of 121 `key=value`
lines each; `AiProfileUtil.getBoolProperty / getIntProperty(player, AiProps.X)`
reads them at decision time (`AiProps` has 114 keys). They are probabilities
and thresholds inside the heuristics above (`CHANCE_TO_HOLD_COMBAT_TRICKS…`,
`AI_IN_DANGER_THRESHOLD`, `TOKEN_GENERATION_ABILITY_CHANCE`, `MIN_SPELL_CMC_TO_COUNTER`, …).
**`Experimental.ai` differs from `Default.ai` in 30 values** (e.g.
`SACRIFICE_DEFAULT_PREF_ENABLE=true`, `MIN_SPELL_CMC_TO_COUNTER=2`,
`AI_IN_DANGER_MAX_THRESHOLD=12`, `TOKEN_GENERATION_ABILITY_CHANCE=100`) and
says in its own footer that it has no experimental toggles at the moment.
**It does not enable simulation.** `Reckless` and `Cautious` move aggression
and risk knobs. Measured AI against AI on ten Forge-drafted cube deck pairs
(evidence §2): Reckless beats Default 60–40 (paired p = 0.004), Experimental
56–44 and Cautious 53–47 are not distinguishable from it at 100 games.

## 4. Simulation (`forge.ai.simulation`) — what "Experimental" is not

`AIOption { USE_HYBRID_SIMULATION, USE_FULL_SIMULATION }` is passed to
`new LobbyPlayerAi(name, Set<AIOption>)`; `LobbyPlayerAi.createControllerFor`
calls `AiController.setUseSimulation(option)`. In Forge's desktop lobby it is a
per-slot option (`LobbySlot.aiOptions`); the two-argument
`GamePlayerUtil.createAiPlayer` we used to call passes none.

- **Full simulation** (`usesFullSimulation()`): `chooseSpellAbilityToPlay` returns
  `simPicker.chooseSpellAbilityToPlay(null)` and skips everything in section 2's
  first rows (lands included — the picker treats a land drop as one more
  candidate). `SpellAbilityPicker`:
  1. `getCandidateSpellsAndAbilities()` — every playable, affordable, fully
     targetable spell/ability. **No RemAIDeck filter here.**
  2. For each candidate, `evaluateSa`: a `GameSimulator` makes a full copy of the
     game with `GameCopier.makeCopy` — **including the opponent's hand and library
     order** (the simulator sees hidden information) — plays the ability on the
     copy, resolves the stack with the opponent passing, and scores the result with
     `GameStateEvaluator.getScoreForGameState`. `SpellAbilityChoicesIterator`
     enumerates the ability's own choices (targets, modes, X, cards) as separate
     simulations.
  3. Recursion: `SimulationController` (default `MAX_DEPTH` 3) lets the copy choose
     a follow-up play, producing a `Plan` (a sequence of `Plan.Decision`s) that is
     then executed decision by decision on later priorities; before blockers it
     also tries the instant-speed subset at `COMBAT_DECLARE_BLOCKERS` and waits if
     that scores at least as well.
  4. The evaluation: life ×2 each side, cards in hand (+5 own, −4 opponent's),
     the mana base (`evalManaBase`), and every permanent through
     `SimulationCreatureEvaluator` (Forge's `CreatureEvaluator`) or a flat value;
     summoning-sick creatures count zero "available" value before main 2;
     `simulateUpcomingCombatThisTurn` advances a copy to combat damage first, so a
     main-phase play is scored after this turn's combat as Forge's own attack/block
     controllers would fight it. Win/loss is ±`Integer.MAX_VALUE` minus a turn
     penalty.
  - **On the owner's cubes it does not run.** `GameCopier.makeCopy` throws
    `RuntimeException: Couldn't map <card>` (`GameCopier.find`, reached from
    `StaticEffect.removeMapped`) whenever a static ability is live on a card the
    copy did not map — a characteristic-defining or all-zones static such as
    Grist, the Hunger Tide's, Anax's or Hero of Light's — and the exception
    escapes the game loop: the game ends on turn 1 or 2. Measured in the
    evidence's §3.
  - What it does **not** search: attacks and blocks (still `AiAttackController` /
    `AiBlockController`), the opponent's responses or turn, and hidden information
    (it cheats instead). It is a one-sided, depth-3, full-information planner over
    the current turn's spells.
- **Hybrid** (`usesHybridSimulation()`): the default heuristics, except that
  `saSideEffects` is replaced by `OnePlaySafetyChecker.isAcceptable` and a free cast
  from an effect is checked by simulation. Small.

The evidence's section 3 measures both against the default AI.

## 5. The sacrifice-outlet finding

Forge marks cards it plays badly with `AI:RemoveDeck:All`. Two cubes carry 12
such cards (synergy: Beast Within, Chromatic Star, Faithless Looting, **Goblin
Bombardment**, Mishra's Bauble, Prismatic Ending, Prophetic Prism, **Viscera
Seer**; modern-era: Adanto Vanguard, Beast Within, Embercleave, Prismatic
Ending). The flag does two things:

1. **Deck building drops them.** `BoosterDeckBuilder` / `LimitedDeckBuilder` never
   main-deck one: across 98 decks Forge's AI drafted and built from the two cubes
   (the cube-lab prototype's runs plus six modern-era drafts for this report), the
   ten flagged cards appear **0 times in a main deck and 149 times in a
   sideboard** — every one a wasted pick, because the drafter (`CardRanker`) does
   not know the builder will drop it. (Carrion Feeder, unflagged: 1 main, 16
   sideboard; Priest of Forgotten Gods: 4 and 9.)
2. **Play ignores them.** `AiController.getSpellAbilityToPlay` removes every spell
   and ability of a flagged card before evaluating anything, so a Viscera Seer in
   hand is **never cast** and a Goblin Bombardment on the battlefield is never
   activated — the self-test pins it (`ai-bench.sh --selftest`, scenario 5, with an
   unflagged one-drop as its control). A deck *we* build for the AI (the cube lab's
   own builder, D294, or any hand-built deck) carries them as dead cards.

Outlets that are *not* flagged (Carrion Feeder, Priest of Forgotten Gods, Woe
Strider) are cast, but activated only on Forge's narrow terms (section 2's last
paragraph): the AI does not sacrifice a creature in response to removal, before
it dies in combat, or to finish the opponent. The evidence's section 4 counts
what Forge did with each, game by game.

## 6. Where a stronger AI plugs in, without patching the jar

| Seam | Visibility (javap, 2.0.14) | What it lets us do | Used by |
|---|---|---|---|
| **A `LobbyPlayerAi` subclass** | `createIngamePlayer(Game,int)` and `createMindSlaveController` public, non-final; `createControllerFor` private (re-implemented: three lines) | Choose the controller class for every game an AI seat plays | `mtgtable.ai.PolicyLobbyPlayerAi` (D309) |
| **A `PlayerControllerAi` subclass** | public, non-final; all 114 decision methods overridable; `getAi()` exposes the `AiController` | Intercept **any** decision — priority, attacks, blocks, targets, mulligan — and fall back to `super` | `mtgtable.ai.PolicyControllerAi` (priority only, so far) |
| `AiController`'s public pieces | `canPlaySa`, `chooseSpellAbilityToPlay`, `chooseSacrificeType`, `getSimulationPicker`, `setUseSimulation` public; the `brains` field `private final`, so the class itself cannot be swapped without reflection (not done) | Ask Forge's opinion of a candidate; reuse its legality and payment checks | `OutletPolicy` (`canPayCost`, `doTriggerNoCostWithSubs` for targets) |
| `forge.ai.simulation` | `GameCopier`, `GameSimulator`, `GameStateEvaluator`, `SpellAbilityPicker.setInterceptor`, `SimulationController` public | Copy a game, play a line on the copy, score it: the parts of a search. A copy can be *determinized* by redealing the opponent's hidden cards before we search (`GameCopier` copies them verbatim; we would have to replace them) | nothing yet — the roadmap's step 2 |
| Runtime card hints | `Card.setSVar/removeSVar` public | Steer Forge's own heuristics per card per game — `SacMe`, `AIPreference`, `AILogic` — **without** a card script on disk (D111 forbids hand-written scripts) | `PolicyControllerAi` sets `SacMe` on the chosen victim for one payment |
| `GameState` (`forge.game.GameState`) | public `parse` / `applyToGame` | Build a board from text for unit tests of a policy or evaluator | `ai-bench.sh --selftest` |
| A custom `.ai` profile | profiles load from `res/ai/` only (`AiProfileUtil.loadAllProfiles(ForgeConstants.AI_PROFILE_DIR)`); `res/` is a symlink to the user's install | Tuning the 114 knobs would need a Forge home whose `res/` is our own tree of links plus an `ai/` folder — never a write into `~/forge` | not done |

What is **not** a seam: `AiPlayDecision` is an enum (no new values), the
per-API `SpellAbilityAi` table (`SpellApiToAi.Converter`) is a static map we do
not replace, and card scripts' `AILogic` strings are read from scripts we may
not overlay (D111). Everything above runs on the game thread inside Forge's own
callbacks, so it inherits hard rule 3's discipline for free: no view is walked,
nothing is put on the wire, and the bridge's `Snap`/`WireGuiGame` path is
untouched.

## 7. Roadmap for a search-based play AI (recommended)

1. **Measure first, always** (done: `tools/ai-bench.sh`, D309). Every change
   below lands with a bench run against the plain Default AI on the cube pairs:
   a paired, seat- and deck-balanced win rate with its interval, plus game time.
2. **Search at priority, using Forge's own simulator, honest about hidden cards.**
   In `PolicyControllerAi.chooseSpellAbilityToPlay`: enumerate candidates (Forge's
   `getCandidateSpellsAndAbilities` plus "pass"), copy the game with `GameCopier`
   — catching its `Couldn't map` failure (§4) per decision and falling back to
   Forge's own answer, or first finding which static effects it cannot map —
   **redeal the opponent's hand and library from the unseen card pool**
   (determinization, several samples), play each candidate, then roll the copy
   forward to the end of the turn (and later, of the next turn) with plain
   Default AI controllers on both seats, and score with `GameStateEvaluator`.
   Pick by mean score over samples. This is Forge's full simulation minus its
   cheating, plus rollouts that include the opponent's answer. Budget by wall
   clock (Forge's own AI timeout is 5 s per decision).
3. **Combat next.** Attacks and blocks decide most cube games and Forge searches
   neither. Enumerate a small set of attack configurations (all-in, none, Forge's
   own, each single creature held back) and score each with the same rollout.
4. **A better evaluator.** Replace the hand weights in `GameStateEvaluator` with a
   learned value function trained on self-play outcomes (features: life, cards,
   board power/toughness by evasion, mana, tempo). `main` now carries the ML
   dataset (D305, `tools/ml/`: viewer-side position rows from frame logs, a
   baseline and a small MLP); the bench can produce games in volume for it. Linear
   or a small MLP exported as weights, evaluated in-process in Java on the
   owner's PC.
5. **Keep the policies.** Targeted fixes like D310's outlet policy stay as cheap
   rules in front of the search: they cover what a shallow search misses (a
   response on the stack) and cost nothing per decision.
6. **Then the game's own seat.** Only after the bench shows a gain: switch
   `MtgTable`'s AI seat to `Bootstrap.createAiSeat` behind a flag, so the
   owner plays the stronger AI; the gate's recordings stay on plain Forge.

## 8. Measuring progress: the ladder and the league (D315–D318)

The bench (§7, step 1) answers "is this change better than plain Default, on
these deals?". Once there are many configs — profiles, the outlet policy,
search budgets, evaluator models — the question becomes "where does each stand,
on one scale, and is the newest better than the best so far?". That is
`tools/ai-ladder.sh` (manual: `docs/guides/ai-ladder.md`).

```
players.json ─► kinds.ts: {kind, params} ─► ai-bench seat config ("Reckless+outlets", "Default+search:ms=1500,…")
                                    │
 schedule / sprt / tune / league ───┤ choose a matchup and a seed slot
                                    ▼
          AiBench play --a --b --games 4 --mirror --seed k   (one JVM per batch, J workers)
                                    │ one JSON line per game
                                    ▼
          var/ai-ladder/results/<host>.jsonl   (append-only, one file per machine)
                                    │
                                    ▼
     Bradley–Terry (MAP, forge-default ≡ 1500) ─► report.html, ladder.json (schema 1, ForgeCoach)
```

- **One game engine.** The ladder never plays a game itself; every game is an
  ai-bench game, so a new AI joins the ladder the day the bench can seat it —
  one row in `kinds.ts` mapping the player's params onto the bench's seat
  syntax. The search kind is already written against D312's
  `+search:ms=…,cands=…,turns=…` syntax and turns available when `main`'s bench
  parses it; the evaluator kind is declared and waits for its bench option.
- **Paired by construction.** `--mirror` plays each deal from both sides, and a
  matchup's k-th batch uses the same deals as every other matchup's k-th
  batch, so comparisons against a common opponent are paired, as §7 asks.
- **Ratings with honest intervals**: Bradley–Terry on the Elo scale, the
  anchor fixed, a weak prior so few games give a wide interval rather than an
  infinite rating; Hessian or block-bootstrap 95% intervals.
- **Games where they inform**: new players first, a fixed share against the
  stock anchors, then the closest, most uncertain pair (p(1−p)·(se²+se²)).
- **Decisions, not just numbers**: an SPRT on mirror-pair scores ("A ≥ B +
  elo1?") that stops as soon as the evidence is in; a successive-halving tuner
  over any numeric or enum parameter, on shared deals against a fixed pool,
  writing its winner back under a new name.
- **The self-play loop** (league): the newest version plays a fixed share of
  games against the last N promoted versions and the anchors; a candidate (a
  tuned config, later an evaluator retrained on the league's own games) is
  promoted only if the SPRT says it beats the current best **and** it does not
  lose ground against forge-default on the same deals — so the loop cannot
  drift into beating only itself.

The roadmap then reads: build a search variant or train an evaluator → register
it (a new name, a new hash) → `tune` its knobs against the pool → mark the
winner a candidate → `league` decides; the ladder's report shows the whole
history, and its `ladder.json` is what ForgeCoach will show.

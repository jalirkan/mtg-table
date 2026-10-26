## D486 — The random seat targets cards, and chooses a modal spell's modes with their targets; no listing offers a modal spell the cast would refuse (amends D451, D485, D358's target redraw, D347's target records and D312's mapping)

*Branch `pc/d486-card-targets`, stacked on `pc/d485-stale-targets` (`947bc344`, D485 with its review, PR #213). `node tools/decisions.mjs
next` gave D486. Amends **D451**'s random seat (and **D458**/**D462**/**D466**/**D471**'s guardrails, whose rules are
unchanged), **D485** (its "Found, not fixed" and its "Not fixed here: a modal spell with no modes chosen"), **D358**'s target
redraw and close call, **D347**'s target records, and **D312**'s `SearchPolicy.mapSa`. Protocol amendment **M75**.*

**2026-10-25**

**Context.** Two faults, found by J168's read of J166 and written down by D485.

1. **The random seat could not target a card.** `TargetRestrictions.getAllCandidates(sa, boolean)`'s flag is
   `onlyNonCard` (`forge-game/.../TargetRestrictions.java:571-584` at the `forge-2.0.14` tag; in the pinned jar's
   bytecode the method returns after the players loop when the flag is true -- checked with `javap -c`). `Explorer.randomTargets`
   (the seat's own listing), `Explorer.legalTargets` (the target redraw and the close call) and `Decisions.targets` (the
   target records) all passed `true`. So on every random-seat night so far: the seat's own listing offered a targeted
   play only when a **player** was a legal target of every part -- creature removal, a pump, Troll Negotiations were
   never its own pick, only Forge's answer; the redraw never moved a card target; the close call on a target never had a
   rival (it compares creatures, and the list held none); and every target record listed the players alone, a card
   target added from the answer with `complete: false`.
2. **Modal spells were stranded** -- the card moved hand → stack, the mana spent, the spell never on the stack. J168:
   s05's Suplex, 991 of 5,500 branch games (the largest single loss), 650 of them at the atlas's forced option and 341
   later in the random continuation; only 453 printed "failed to target". Read in Forge 2.0.14's source:
   - A modal spell (`ApiType.Charm`) gets its modes **inside the cast**: `ComputerUtil.handlePlayingSpellAbility`
     moves the card to the stack (`:100`), then `CharmEffect.makeChoices` -- which returns false, card left in the stack
     zone and nothing printed, when fewer legal modes (`makePossibleOptions`: a mode whose targeting has no candidate is
     not one, 603.3c) are left than the minimum; otherwise it asks the controller's `chooseModeForAbility`, which for
     Forge's AI returns the modes its last evaluation chose (`getChosenList`) or, with none, runs `doTrigger(sa, true)`;
     then `chainAbilities` copies the chosen modes, **with their targets**, onto the spell, and `MagicStack.add`'s
     `hasLegalTargeting` drops a spell with a part under its minimum ("failed to target", `[[]]`).
   - **The atlas's forced option**: `SearchPolicy.alternatives` lists a spell Forge declines (`CantPlayAi`) when
     `anyTargeting` finds no targeting part -- and `CharmAi` clears a declined modal spell's modes and chain, so Suplex,
     Abrade and Branching Bolt were listed as untargeted plays, even with no legal mode at all. `mapSa` then mapped a
     WillPlay candidate's chosen modes into the fork's copy **without their targets** (the copy's own mode objects carry
     none), so the forced cast copied an empty target list onto the spell: "failed to target". With no legal mode, the
     cast stopped in `makeChoices`, silently -- the d0 cases.
   - **The random seat's own pick**: its listing walked the chain Forge's last evaluation left on the spell -- empty after
     a decline -- so it listed the modal spell as untargeted; the cast then met `makeChoices` with no legal mode, or
     Forge's mandatory `doTrigger`.
   - D485 checks a modal answer's chosen modes, but not one whose modes do not exist yet.

**Decision.**

1. **Every candidate, cards included** (`Explorer.candidates`; `Decisions.targets`). The three call sites pass `false`:
   the engine's candidates (players where the part allows them, and every card in the part's zones) that
   `canTarget` allows now -- protection, hexproof, shroud, the part's targeting restrictions -- and, for the seat's own
   draw and its redraw, only those the seat can see (`Decisions.entityToken`; `Explorer.keepLegal`, engine-free).
   - **The seat's own targets** (`Explorer.randomTargets`): a part takes `max(min, 1)` to `min(max, legal)` targets, the
     count a seeded uniform draw when there is a choice (`Explorer.targetCount`; before, always `max(min, 1)`), each
     target drawn in turn from those still legal beside the ones already drawn (a total-CMC cap); a part with a minimum
     of 0 and nothing legal (or a maximum of 0) takes none, as before; fewer legal than the minimum leaves the play out.
     A part with divided damage, a cross-target constraint, a random target **or a spell as a target** (a stack zone)
     still leaves the play out -- a card on the stack is not the spell the counterspell needs.
   - **The redraw and the close call** (D358, `Explorer.targets`) draw from the same candidates, so the exploring seat's
     close call on a target now fires. A modal spell's chain is skipped there: the cast rebuilds it from the chosen
     modes, so a redraw on it would be recorded and not cast.
   - **The target records** list every candidate the engine allows, players and cards, sorted as before; a candidate
     the seat cannot see is counted in `hidden`, never named. A card target is now `complete: true` when it is among
     them (protocol **M75**). `hidden` is a filtered count: the hidden cards `canTarget` accepts -- a face-down card in
     exile, a card in the ante zone; no script in the pinned engine targets a card in a hand or a library.
2. **A modal spell's modes are the seat's, with their targets** (`Explorer.randomModes`, `Explorer.isModal`: a Charm
   whose controller chooses -- not a copy, a trigger, `Random`, `Chooser` or `CanRepeatModes`, which keep D485's check).
   - **Its own listing**: the count uniform from `max(MinCharmNum, 1)` to `min(CharmNum, legal modes)` (all for
     entwine; `Explorer.modeCount`), then distinct modes drawn uniformly among the legal ones, each kept only when
     `randomTargets` can target its chain; fewer than the minimum: the play is left out. The modes go on the spell as
     `CharmAi` puts Forge's (`setChosenList`; the record reads them through D485's `Decisions.castTargets`, the cast
     copies them); the old modes are noted first (`Before`, key `MODES`) and put back unless the play is the pick.
   - **Forge's answer**: modes Forge chose stay Forge's while D485's check can make their targets legal; with **no**
     modes chosen, or modes D485 cannot make legal (a chosen mode's every target gone), the seat draws them as above --
     counted **`modesDrawn`** when picked, its priority and target records `why: "MODES_DRAWN"` (not D485's
     `retargeted` / `STALE_TARGETS`, which stay the count of a stale list re-targeted) -- and when it cannot, the play
     is refused as D485's (`staleRefused`).
   - **Inside the cast, a hook the seat owns** (`PolicyControllerAi.chooseModeForAbility` → `Explorer.modesAtCast`): a
     random seat whose spell arrives with modes chosen and every target legal gets them back untouched, nothing drawn
     (the seat's own listed picks always arrive so); otherwise -- the atlas's forced option, or anything that cleared
     the modes -- the seat draws them now, seeded, counted **`modesDrawn`**, and writes the modes' target records then
     and there (`source: "modes"`, `why: "MODES_DRAWN"`, through `Decisions.castTargets`): the callback is on the game
     thread with the seat's recorder, as `chooseTargetsFor`'s records are, and no priority record precedes a forced
     option. Null when no legal set exists: Forge answers.
   - Hard rule 3: no new hop, no thread; all of it runs in the seat's callbacks on the game thread, in `Decisions.quiet`.
3. **No listing offers a modal spell the cast would refuse** (`Explorer.modesCastable`: fewer legal modes than its
   minimum). `SearchPolicy.alternatives` (the search's candidates, the atlas's options, the exploring seat's listing) and
   `Decisions.playable` (the priority record's options) leave it out; the random seat's own listing leaves it out
   through `randomModes`.
4. **The fork carries the modes' targets** (`SearchPolicy.mapSa`): each chosen mode's chain's targets are found in the
   copy and put on the copy's mode (`copyTargets`), as the chain's already were. This also changes the search's
   rollouts of a modal candidate, which went to the engine with an empty target list before.
5. **Counted** (protocol **M75**): `cardTargetOffered` in the random seat's `explore.guardrails`, once per priority
   listing that offered at least one play of its own that only a card target made possible -- one the players-only
   draw before D486 would have left out (`Explorer.playersOnlyWouldList`, which reads the play before the draw writes on
   it; for a modal spell, the chain Forge's AI last left); and `modesDrawn` (2), also summed on the atlas's branch row
   (`Atlas.Branch.modesDrawn`, `BranchRow.modesDrawn`, written when above 0). `tools/check-redaction.mjs` accepts both
   names, the `why` `MODES_DRAWN` (any `^[A-Z_]+$`) and the record source `modes`.

**Comparability (D458 point 3). This changes the random policy, so it changes the label population.**
- The random seat's support is new wherever a deck holds a play that targets a card: removal, pumps, auras, Troll
  Negotiations, any modal spell. Its own targets are drawn among cards and players, a multi-target part's count is
  drawn, and its modal plays carry modes of its own. Every random branch is a different random game from the same seed.
- The atlas's option lists change too: a modal spell with no legal mode is no longer an option (s05's d0 lost two), and
  the decision indices that depend on the records' listing can move (the s05 reproduction below branched at d0 and d10
  where D485's branched at d0 and d13).
- The exploring seat's (D358) target redraw and close call are new, and the search's rollouts of a modal candidate (4).
- The Forge map's continuation is Forge's own; its forced option is mapped with its modes' targets now (4).
- **Every recorded policy seat's records**, not the random seat's only: `Decisions.playable` (`Decisions.java:276`)
  drops an uncastable modal spell from the priority record's options for the Forge, outlets and search seats too, and
  every seat's target records now list cards (1). Rows and labels built from those records change shape.
- **The search seat's own play**: `SearchPolicy.alternatives` (`SearchPolicy.java:692`) offers fewer candidates (no
  uncastable modal spell), and a modal candidate's rollouts now keep their modes' targets through `mapSa` (4) -- so the
  live `--ai-policy search` opponent, the ladder and the lab's search seats play a changed policy.
- **The coach's grade**: `Grader.spellOptions` builds its options with `SearchPolicy.priorityCand`
  (`bridge/src/mtgtable/grade/Grader.java:681,694`), whose rollouts map through `mapSa`; before D486 a modal cast in the
  grader's rollouts went to the engine with no targets and was dropped, so a modal spell's grade was a lost card's.
- So **labels, reads, ladder results and grades from before D486 are never pooled with those after it** -- every
  consumer above: the split is the git sha and the lab
  version (`tools/cubelab/versions.ts`: the code tree under `bridge/src` changed, so the version id did). A J-night
  that compares across it compares two populations, never a repeat.

**Evidence.**

- **`DecisionSelfTest`** (in `bridge/build.sh`): `decision selftest: 210 check(s), 0 failure(s)` -- six new
  (`cardTargetsPlanted`): Murder's planted candidates keep the Bears alone (hexproof Gladecover Scout and protection's
  White Knight refused by `canTarget`, a hand card unseen); an "any target" part keeps both players and the Bears in the
  engine's order; the old players-only list gives a creature part nothing to draw; the part counts and the mode counts
  (Suplex with no creature or artifact: null); "up to two targets" draws one or two, never none.
- **`./tools/ai-bench.sh --selftest`**: the new "card targets" and "modal" cases (engine; `AiBench.cardTargetScenarios`,
  `modalScenarios`), 21 checks:
  - (a) `card-target-offered`: `getAllCandidates(murder, true)` is `[]` and `(…, false)` holds the Bears; with the old
    call (`Explorer.playersOnlyForTest(true)`, the control) Murder is never picked in 40 listings and
    `cardTargetOffered` never fires; with the fix the seat's own listing picks Murder aimed at the Bears, counts the
    listing, and `playChosenSpellAbility` puts it on the stack with nothing printed.
  - (b) `card-target-hexproof`: beside Gladecover Scout and White Knight, 33 picks of Murder in 60 listings, every one
    aimed at the Bears; the target record lists `[target:<Bears>]`, `complete: true`.
  - (c) the modal cases on Suplex with the opponent's Bears and Expedition Map: the **control** -- the exile mode chosen
    with no target, as the old `mapSa` left it in a fork -- prints `failed to target` and strands Suplex in the stack
    zone through Forge's own hand-off; the random seat given that as Forge's answer fills the target (the Map), counts
    it and casts it legally; Forge's damage mode aimed at the Bears, the Bears then dead: the seat draws the modes
    afresh (exile the Map) and casts it; no modes chosen at all: the seat chooses them inside the cast (`modesDrawn` 1, `retargeted` 0; the dead-Bears case is `modesDrawn` too, the
    empty-target case D485's `retargeted`);
    the mapped option carries its mode's target into the copy; with no creature or artifact, Suplex is not a search or
    atlas candidate, not in the record's options, never the seat's pick in 30 listings, and Forge's own hand-off
    strands it silently (the control).
  - **Mutants**, each built into `bridge/out` and reverted: the seat's candidates players-only (5 failures); `mapSa`
    without the modes' targets (1); no cast-time hook (1); no re-draw of Forge's unfixable modes (1); `modesCastable`
    always true (2). None survives.
- **The s05 reproduction** (the command below, decks
  `/home/justin-a/code/lab/data/lab-j166/decks/s05-pauper-2005/decks/pauper-2005-0000{1,2}.dck`), run on D485
  (`f6c950b0`, in the D485 worktree, `var/d486-s05-before`) and on this branch (`var/d486-s05`):
  `CUBELAB_HOME_ROOT=var/d486-homes timeout 1200 tools/cubelab.sh atlas --deck-a … --deck-b … --seed 2105 --phase b
  --decisions 2 --min-options 3 --screen 5 --early-stop 5,10,15 --branch-random 25 --branch-forge 0 --chunk 5
  --checks-parallel 1 --unit-timeout 10 --jobs 4 --out …`.
  - **Before (D485)**: 180 branch games at d0 (turn 4) and d13, checks clean. 0 `failed to target` lines -- yet the
    frames (J168's `strand.py` logic over every card of the viewing seat, not only Suplex) hold **136 stranded casts in
    75 of 360 logs**: Suplex 58, Abrade 75, Branching Bolt 3 (all three modal). 50 of them are the atlas's own forced
    options at d0, `cast:2` Abrade and `cast:1` Suplex, stranded in **25 of 25** branches each (turn 4, no creature or
    artifact on the battlefield: no legal mode, `makeChoices` refuses silently) -- and the map valued them at 42% and
    54% against `pass`'s 28%. The other 86 are the random seat's own picks.
  - **After**: 190 branch games at d0 (now turn 6), d10 and d11, 0 errors, checks clean (7,638 rows, 382 frame logs,
    3 leak checks). **0 `failed to target` lines and 0 stranded casts** in 380 logs (2,505 casts from hand, Suplex 75
    and Branching Bolt 56 among them). The turn-4 decision is no longer branched: with its two uncastable options gone it
    has one option. `modesDrawn` 50 (branch rows 50), `retargeted` 0: the forced options `cast:1` Suplex at d0 and `cast:3` Goblin
    Surprise (modal, no targets) at d10, each with no modes chosen, got the seat's modes inside the cast in 25 of 25
    branches. No record carries `STALE_TARGETS` or `MODES_DRAWN`: no stale list was met, each of the 25 Suplex draws had
    one legal target, so its `source: "modes"` target record was a one-option record (counted in the summary's
    `forced.target`, not written, as every one-option record is), and Goblin Surprise's modes target nothing. 627 target
    records, every one with a card among its options and every one `complete: true` (before: 214, none complete).
    (Run three times -- before and after the rebase onto `947bc344`, and after the `modesDrawn` split -- with the same
    190 branch games and counts, the split moving 50 from `retargeted` to `modesDrawn`.)
  - **The seat's listings that D485's tree would not have offered**: `cardTargetOffered` **1,539** of the 12,958
    randomised priority listings (11.9%) in the after run's random seats' logs carried at least one play of the seat's
    own that only a card target made possible (D485: none, by construction).
  - The before run is on `f6c950b0` (D485 before its review).
- **`./tools/ai-bench.sh --selftest`** on the rebased build: `242 check(s), 0 failure(s)` (the gate does not run it).
- **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh && FORGE_JAR=<config.json's forgeJar> WSPORT=9900
  GATE_JOBS=4 ./tools/check-all.sh`, **`check-all OK`**, 579.0 s wall, 59 jobs (`var/check-all/20261025-205502-537344`;
  node 1862 pass, 11 skipped, 0 fail).

- **The skeptic review's follow-ups** (second commit: the `modesDrawn` split, its records and branch row; the
  comparability consumers; the stack-zone and mode-cost follow-ups; `hidden` as a filtered count): `./bridge/build.sh`
  OK (decision selftest 210/0), `./tools/ai-bench.sh --selftest` 242/0, `node tools/check-redaction-selftest.mjs` OK,
  `npm --prefix web test` OK (node 1850 pass, 9 skipped; vitest 161 passed), the s05 reproduction as above. No full
  gate on the branch: it runs on the merged tree.

**Rejected.**
- **Fix the record's call only, leave the seat players-only.** The records would then list targets the seat never draws;
  and the seat would still never play removal of its own.
- **Let Forge keep choosing an own modal play's modes at the cast** (`doTrigger(sa, true)`, D451's "modes stay
  Forge's"). That is the path that chose a mode with no target, and the seat cannot refuse a play from inside the cast:
  the card is already on the stack.
- **Put a stranded card back after the cast** (D466's `putBack`). The mana is spent by then, and the option's value is
  biased all the same.
- **Drop modal spells from `alternatives`' declined bucket altogether.** It would remove a playable option (Suplex
  exiling an artifact) from the search and the atlas; only an uncastable one goes.

**Not fixed here.**
- **The plain Forge seat** (a Forge-continuation branch, a lab seat with no explorer) still meets `doTrigger(sa, true)`
  inside a cast; the forced option there is now mapped with its modes' targets, which was the J166 case.
- **A modal spell with `CanRepeatModes`, `Random` or `Chooser`**: its modes stay the engine's (D485's check on them).
- **A part whose zones include the stack** is never drawn by the random seat: `randomTargets` leaves the play out on
  `tr.getZone().contains(ZoneType.Stack)` (`Explorer.java:646`), so a counterspell is never its own pick. The same rule
  drops a "target spell or permanent" part (30 script lines at the `forge-2.0.14` tag carry `TgtZone$ Stack,Battlefield`
  or the reverse) even when a permanent would be a legal target. Follow-up: draw such a part's permanents, or its spells
  through `canTargetSpellAbility`.
- **A mode's own cost is not paid for in the listing**: `ComputerUtilCost.canPayCost` runs before `randomModes`, on the
  spell's base cost, so a mode with a cost of its own (`ModeCost$`, 72 script lines; Escalate, 18; Spree, 45) can be
  drawn when it cannot be paid. That is a refused payment (D458's G5, D466's `putBack`), not a strand -- but it wastes
  the option and inflates `refusedCast`. Follow-up: check the chosen modes' cost before the play is listed.
- **A trigger's targets** (D485's s07, Headliner Scarlett) are still Forge's.

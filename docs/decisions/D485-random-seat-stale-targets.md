## D485 — The random seat never hands the engine a stale targeting: Forge's answer is re-targeted or not offered, and the M55 audit accepts the viewer's own token that ceased to exist (amends D451, D458, D347's audit and D481)

*Branch `pc/d485-stale-targets`, on origin/main `26a8db00` (#212, D484). `node tools/decisions.mjs next` gave D485.
Amends **D451**'s random seat (and G5, **D458**/**D462**/**D466**), the M55 / **D347** audit in
`tools/check-redaction.mjs` as **D481** amended it, and corrects D481's account of its s02 case (an addendum in D481's
file). Protocol amendment **M74**.*

**2026-10-25**

**Context.** J168 (2026-10-25), a read-only diagnosis of 18 `check-redaction.mjs` failures on spines s06 and s10 of J166
(`/home/justin-a/code/lab/data/lab-j166/b-s06-peasant-2106`, `b-s10-peasant-2110`). Every flagged id was a **stale
target**: the viewer's own token that had stopped existing turns before (died into its own graveyard, or bounced to its
own hand) and still sat in Forge's target list for the viewer's own Troll Negotiations. Examples:
`b-s10-peasant-2110/phaseB/frames/d22-random-o0-b25-seat1.jsonl.gz:126` (decision 39, `target:131`, the viewer's Spider
Token, dead since seq 34) and `b-s06-peasant-2106/phaseB/frames/d2-random-o2-b166-seat0.jsonl.gz:243` (`target:82`, a
Human Soldier Token bounced to the viewer's own hand).

The mechanism, read in Forge 2.0.14's source (the `forge-2.0.14` tag of `~/code/forge-src`, checked against the pinned
jar with `javap`):

- **Forge's AI leaves a stale list on a play.** `FightAi.canFightAi` (`forge-ai/.../ability/FightAi.java:246-260`)
  appends the "your creature" target with `sa.getTargets().add(aiCreature)` at every evaluation that says WillPlay and
  resets only the fight sub-ability. So each priority window in which Forge's AI evaluates Troll Negotiations (or
  Knockout Maneuver) without casting it adds one more target, and the dead ones stay. D471 noted that several AIs only add.
- **Forge's AI plays it anyway.** `AiController.canPlaySa` refuses a play only when `!isTargetNumberValid()` **and** the
  part has no candidate at all (`AiController.java:956-957`), so an over-full list with live candidates passes.
- **The random seat handed Forge's answer to the engine as it was.** `Explorer.randomOptions` lists Forge's own answer
  (`chosen`) untouched, and `randomTargets` skips it (`sa == forgeSa`).
- **The engine drops the spell after taking the card and the mana.** `ComputerUtil.handlePlayingSpellAbility` moves the
  card to the stack (`:100`) and pays; `MagicStack.add` then checks `hasLegalTargeting` -- `isTargetNumberValid` on every
  part (`MagicStack.java:688-696`) -- prints `Couldn't add to stack, failed to target` and returns (`:321-325`). The card
  stays in the stack zone with no stack instance and is never seen again: its last zone event is
  `{hand, viewer}` → `{stack, null}`.
- **The decision records carried the stale list**: the target records (`source: "targets"`, `complete: false`) hold 2–6
  targets for a one-target part, the dead token among them, which is what the M55 audit caught.

**A second form, J168's s13 (pauper, `b-s13-pauper-2113`): a stale list whose count is valid.** Its 6 flagged logs
(`d2-random-o0-b149`, `-o0-b97`, `-o1-b93`, `-o1-b99`, `-o3-b74` and `d9-random-o3-b98`, all `-seat1`) each name the viewer's
own Saproling Token (92 or 93), dead in its own graveyard 7 to 18 state frames before, as the single target of Forge's
answer drawn by the random seat: Tamiyo's Safekeeping (card 55) in five, Giant Growth (77) in one. The count is valid, so
`MagicStack.add` accepts the spell, and it is countered on resolution for its illegal target: the card moves hand → stack
→ graveyard inside one state frame, mana spent and nothing done. s13's worker logs hold **no** `failed to target` line.
Why Forge's AI answered with a dead target there was not traced. Part 1 covers this form too (a target that is not a
candidate now is stale whatever the count), and part 2 accepts its records.

Across the atlas's worker logs there are about 1,346 `failed to target` lines, each a spell paid for and lost, biasing
that option's value: s10 515 (Troll Negotiations 508, Tear Asunder 7), s05 453 (Suplex), s06 214 (Troll Negotiations,
Knockout Maneuver), s07 138 (Headliner Scarlett), s02 8 (Tear Asunder). D481's s02 "spell" case is one of them (the
addendum in D481's file).

**Decision.**

1. **The random seat never hands the engine an illegal targeting of Forge's answer** (`Explorer.staleTargets`, called
   from `Explorer.randomOptions` when it lists Forge's answer).
   - **Stale** is per targeting part: its target count is not valid (`isTargetNumberValid`: over the maximum, or under
     the minimum), or a target is no longer a legal one -- not among the part's candidates now (by identity, so a card
     that left and came back is a new object) or `canTarget` says no. A dead token and a bounced card are both.
     `MagicStack.add` checks only the count; a dead target in a count-valid list would fizzle at resolution, and is
     replaced all the same.
   - **A stale part keeps the targets that are still legal, drops the rest, cuts to its maximum and fills to its
     minimum** (`Explorer.legalTargetList`, engine-free): the cut and the fill are uniform draws from the seat's own
     seeded stream, the fill from the legal targets the seat can see (`Decisions.entityToken` and `canTarget`, in id
     order). A part that is not stale is never touched and draws nothing, so a game that never meets a stale list plays
     exactly as before.
   - **Its old targets are noted first** (`Explorer.Before`, D471's put-back) and put back unless the play is the pick:
     a listed answer the seat did not pick, and a pick the engine refused, keep Forge's own list, as Forge left it.
   - **A modal spell** (`ApiType.Charm`): Forge's `CharmAi.checkApiLogic` builds a chain of copies of the modes it
     chose, but at the cast `CharmEffect.makeChoices` throws that chain away (`setSubAbility(null)`) and rebuilds it
     from `getChosenList()`, copying each chosen mode with its own targets. So the parts checked are the chosen modes'
     (`Explorer.castParts`), for Forge's answer and for the seat's own listing of a modal spell. The seat's own
     `randomTargets` draws on the discarded chain, so **since D451 the seat's own modal pick has cast the targets Forge
     left on the chosen modes, not its random ones** (unchanged here; those are now checked and kept unless stale). One
     with no modes chosen yet is not checked: Forge chooses them inside the cast (see *Not fixed here*).
   - **The decision record shows what is cast** (added after the skeptic review): the priority path records a play's
     target decisions from the same parts (`Decisions.castTargets`), so a modal spell's records name its chosen modes'
     targets, not the discarded chain's. Every other play's parts are its chain, as before. The trigger and
     `chooseTargetsFor` records are unchanged.
   - **When it cannot be made legal** (no legal list reaches the minimum; a stale part with divided damage, a
     cross-target constraint or a spell as a target), **the play is not offered**: the seat picks among the rest. It is
     G5's refused play for the rest of the priority window (`refusedCast` the first time, `noRepeatRefused` after, as
     D458 counts a payment refusal), and counted as `staleRefused`. The card stays where it is. A throw inside the check
     (after some parts may have changed) is treated the same way, and counted as an explore failure: a play is never
     offered half-fixed.
   - **Counted.** A pick of a re-targeted answer is counted (`retargeted`), both in the seat's `explore.guardrails`
     (protocol **M74**; `tools/check-redaction.mjs` accepts the two names) and on the branch row (`Atlas.Branch.retargeted`,
     `BranchRow.retargeted` in `tools/cubelab/atlas.ts`, written when above 0). Its decision records -- the priority
     record and its target records -- carry `why: "STALE_TARGETS"` (the checker's `^[A-Z_]+$`).
   - **The plain Forge seat is untouched**, and so are the other explorers: the change is inside the random seat's
     listing (`ExploreMath.Config.random`). A Forge-piloted seat that meets FightAi's list still strands the spell, as
     Forge 2.0.14 does.
   - **Hard rule 3:** no new hop and no new thread; everything runs inside the seat's priority callback on the game
     thread, in `Decisions.quiet` as the listing always did.
2. **The checker accepts a stale target the recordings already hold** (`tools/check-redaction.mjs`, D3 as D481 amended
   it). An id that no state frame the decision can use lists is accepted when, over D481's window (the state frames up to
   and including the first one after the decision):
   - **it is the viewer's own token**: D481's birth event onto the viewer's battlefield in the window, **or** a state in
     the window lists it on the viewer's battlefield with `token: true`, `controller` and `owner` the viewer's seat (a
     token older than the log has no birth event); **and**
   - **its latest move** (a `to: null` event skipped, as D481 does) is from `{battlefield, viewer}` to the viewer's own
     `graveyard` or `hand`, where a token ceases to exist.
   Exile, a library and any other seat's zone never. Such an id is counted apart (`M55 decision ids that ceased to
   exist=<n>`), never a problem. D481's own two shapes are unchanged and are tried first.
   - After part 1 new runs should no longer write this shape; the rule is for the recordings already made, and for a
     stale list the seat does not catch (a Forge-piloted seat, a modal spell whose modes Forge chooses at the cast).
3. **D481's s02 case was a stranded cast**, corrected in a dated addendum at the end of D481's file: Tear Asunder (17),
   Forge's answer, carried a target on each of its two kicker-sized parts, one of them over its maximum of 0; the engine
   stranded it, and Take It Back returned it to the hand. D481's acceptance stands.

**Found, not fixed: the random seat draws only players as targets.** `TargetRestrictions.getAllCandidates(sa, boolean)`'s
flag is `onlyNonCard` (`forge-game/.../TargetRestrictions.java:571-584` at the `forge-2.0.14` tag; the jar's bytecode
returns after the players when it is true). `Explorer.randomTargets`, `Explorer.legalTargets` (the target redraw) and
`Decisions.targets` all call it with `true`, reading it as "is targeted". So:
- the random seat's own listing offers a targeted play only when a **player** is a legal target for each part; a play
  that must target a card (Troll Negotiations, creature removal) is never its own pick, only Forge's answer;
- the random redraw of a single target never moves a card target;
- every target record's `options` list only players, plus the chosen card target with `complete: false`.
D485 itself reads every candidate (`getAllCandidates(s, false)`); written first with the old call, it refused the
self-test's stale Troll Negotiations in every listing, because no creature was a candidate. Fixing the three call sites changes the random policy (every
atlas after it is a new policy, D458 point 3) and the decision records' options, so it is a decision of its own, not
part of this one.

**Not fixed here.**
- **A modal spell with no modes chosen** (s05's Suplex, 453 lines, `[[]]`). It is the **seat's own pick**, not Forge's
  answer: a modal spell with no chain passes `randomTargets` (it has no targeting part to draw for). Forge's `CharmAi`
  leaves `chosenList` null when no mode suits it, and the cast -- `ComputerUtil.handlePlayingSpellAbility`:
  `moveToStack` (`:100`), then `CharmEffect.makeChoices` (`:110`), then the payment and `MagicStack.add` -- asks
  `chooseModeForAbility`, which runs `doTrigger(sa, true)` and can choose a mode with no legal target. The check runs
  before the modes exist. The candidate for D486: override `chooseModeForAbility` for the random seat
  (`AtlasController.java:268` already hooks it, on the game thread) and draw the modes and their targets there.
- **A trigger's targets** (s07's Headliner Scarlett, 138 lines, `[[]]`): Forge's AI chose no target for the ETB trigger;
  the random seat does not choose trigger targets.
- **The plain Forge seat** strands the same way (part 1).

**Follow-ups (the skeptic review, 2026-10-25).**
- **A stale spell target is not detected**: a counterspell whose target left the stack keeps a target that is no
  `GameEntity`, which the check does not judge unless the count is invalid. Such a spell fizzles at resolution; it is
  not stranded.
- **Not in the refuse list**: `MaxTotalTargetCMC`, `MaxTotalTargetPower`, `TargetsWithRelatedProperty` and
  `TargetsWithSharedCardType`. A stale part under one of them is re-targeted with `canTarget` judging each target one
  at a time, which these totals and relations are not.
- **G5's counts now include stale refusals**: `refusedCast` and `noRepeatRefused` count a stale answer that was not
  offered as well as a payment the engine refused (M74 says so); `staleRefused` is the stale share.
- **`retargeted` counts the pick**, even when the engine then refuses its payment (the targets are then put back).
- Done in the review's commit: the bench's put-back check compares Forge's two targets object by object, in order.

**Comparability (D458 point 3).** Only a decision that meets a stale list changes: the seat's pick of Forge's answer is
cast (with other targets) instead of being lost, or not offered at all, and the cut and fill draw from the seat's stream.
An atlas after this decision is a new random policy wherever a deck carries such a card (FightAi's spells, a kicker-sized
targeting); the Forge map is unchanged.

**Evidence.**
- **`./bridge/build.sh`**: OK (the lint and its self-test, javac, every build self-test); `decision selftest: 204
  check(s), 0 failure(s)` -- ten new D485 checks (`DecisionSelfTest.staleTargetsPlanted`): J168's Troll Negotiations
  part keeps the live token alone; an over-full list of three live targets is cut to one, each kept sometimes over 300
  draws; a part whose only target died is filled from the legal ones, or refused with none; Tear Asunder's kicker-only
  part (maximum 0) is emptied; an empty part with a minimum of 1 is filled; a duplicate is kept once; up to two targets
  keep both live ones in order; the cut is seeded; a fix that needs no draw moves no stream.
- **`./tools/ai-bench.sh --selftest`**: `216 check(s), 0 failure(s)`; the new "stale targets" cases (engine, 11 checks;
  `AiBench.staleTargetScenarios`). Troll Negotiations in the AI seat's hand with its Llanowar Elves and Grizzly Bears
  both targeted (one over the maximum) and the fight aimed at the opponent's Hill Giant, then the Elves put into the
  graveyard:
  - (a) **control**: Forge's own hand-off (`ComputerUtil.handlePlayingSpellAbility`) prints `failed to target` and
    strands the card in the stack zone with no stack item;
  - (b) **the random seat**, given that list as Forge's answer: in each of the 8 listings that did not pick it, Forge's
    two targets are back; when it picks it (seed 10), the Elves are dropped, the Bears kept, the pick is marked and
    counted once (`retargeted`), and `playChosenSpellAbility` puts Troll Negotiations on the stack with nothing printed;
  - (c) **the Bears dead too**: in 30 priorities the play is never offered (`staleRefused` 30, `refusedCast` 1,
    `noRepeatRefused` 29), the card stays in hand and Forge's list is as Forge left it.
  - **Negative control:** with `staleTargets` switched off (`if (true) return 0;`, built into `bridge/out` and
    reverted), (b) and (c) failed on 4 checks, (b)'s cast printing `Couldn't add to stack, failed to target`.
- **The checker** (`node tools/check-redaction-selftest.mjs`): OK, 107 controls; seven new ones from
  `tools/make-negative-fixtures.mjs` (every other control regenerated byte-identical): PASS
  `stale-token-died-earlier` (no birth; the viewer's token in the first state; dead in the second; a target decision at
  the fourth naming it, `complete: false`) and `stale-token-bounced-to-own-hand`; FAIL
  `stale-token-bounced-to-the-opponent-hand`, `stale-token-of-the-opponent`, `stale-token-then-exiled`,
  `stale-nontoken-ghost` (`token: false`) and `stale-token-shown-only-after-the-window`; D481's
  `m55-option-not-born-in-the-graveyard` stays FAIL. Seven mutants of the rule each fail the selftest (the own-token
  requirement removed, the window bound on the listing removed, the viewer's seat on the destination removed, the hand
  not accepted, exile accepted, the `token` flag ignored, the rule off). One survives: listing any seat's token as the
  viewer's own, because the move rule already requires the viewer's battlefield and the viewer's own graveyard or hand,
  where another seat's token cannot go.
- **The sweep**, the atlas's invocation (`node tools/check-redaction.mjs --empty-hand-ok`, 100 logs a call, two calls at
  once) over every phase B frame log of J166's s06, s10 and s13:
  - s06 + s10: **26,450 logs, 26,450 PASS, 0 FAIL** in 538 s. The rule counted 38 ids in **18 logs** (J168's 18); D481's
    rule counted 136 ids in 62 logs, as before.
  - s13: **13,850 logs, 13,850 PASS, 0 FAIL** in 233 s; the rule counted 12 ids in 6 logs. The old checker (origin/main)
    over the same 13,850: 13,844 PASS, **6 FAIL**, exactly the 6 above.
  - Over `fixtures/games/` and `fixtures/synthetic/` the checker's output is byte-for-byte origin/main's.
- **The s10 reproduction** (`CUBELAB_HOME_ROOT=var/d485-homes timeout 900 tools/cubelab.sh atlas --deck-a <s10 deck 1>
  --deck-b <s10 deck 2> --seed 2110 --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 5,10,15
  --branch-random 25 --branch-forge 0 --chunk 5 --checks-parallel 1 --unit-timeout 10 --jobs 2 --out var/d485-s10`, the
  decks `/home/justin-a/code/lab/data/lab-j166/decks/s10-peasant-2010/decks/peasant-2010-0000{1,2}.dck`), run on this
  branch and, the same command, on origin/main `26a8db00` in a scratch worktree:
  - **Before** (origin/main): 215 branch games at d2, d44 and d45 in 280 s, checks clean; the worker logs hold **22
    `failed to target` lines** (Troll Negotiations 21, Tear Asunder 1).
  - **After**: 215 branch games in 341 s, 0 errors, 0 timeouts, checks clean (7,059 rows, 432 frame logs, 3 leak checks);
    **0 `failed to target` lines**. 20 branch rows carry `retargeted` (1 each, 20 in all), the seats' summaries sum
    `retargeted` 20 and `staleRefused` 0, and the frame logs hold 59 records with `why: "STALE_TARGETS"` (20 priority
    records and their 39 target records).
  - **What else moved**: of the 215 rows (same keys in both runs), 191 are identical (result, turns, steps). Of the 24 that
    differ, 20 are the rows with a re-targeted pick. The other 4 have none; the listing's cut and fill draw from the
    seat's stream whenever it meets a stale list, picked or not, which is the likely cause (not traced).
- **After the skeptic review** (the second commit: modal records, the fill order, a throw refuses, the put-back check):
  `./bridge/build.sh` OK, `decision selftest: 204 check(s), 0 failure(s)`; `./tools/ai-bench.sh --selftest` **219
  checks, 0 failures** -- three new ("stale-targets-modal-record", `AiBench.modalCastTargetsScenario`: Izzet Charm's
  damage mode chosen at the Hill Giant, its chain of copies planted at the Grizzly Bears; the chain read records the
  Bears, `Decisions.castTargets` the Giant, and the cast's `CharmEffect.makeChoices` rebuilds the chain at the Giant),
  and the put-back checks now compare Forge's targets object by object, in order; `check-redaction-selftest.mjs` OK. The
  s10 reproduction once more (`--out var/d485-s10b`): 215 branch games in 282 s, checks clean, **0 `failed to target`
  lines**, 20 `retargeted` rows, and all 215 rows identical (result, turns, steps) to the first run after the fix.
- **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh && FORGE_JAR=<config.json's forgeJar> WSPORT=9800
  GATE_JOBS=4 ./tools/check-all.sh`, **`check-all OK`**, 510.4 s wall, 59 jobs (`var/check-all/20261025-200452-3249297`;
  node 1862 pass, 11 skipped, 0 fail). `./tools/ai-bench.sh --selftest` on the gate's build: 216 checks, 0 failures.
  On the review's commit: **`check-all OK`**, 555.1 s wall, 59 jobs (`var/check-all/20261025-203235-3886623`).

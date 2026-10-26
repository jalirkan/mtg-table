## D488 — The random seat's targets fit the play's cost: a count it can pay for, and never the card its own cost takes (amends D451, D458's G5, D485, D486 and D358's target redraw)

*Branch `pc/d488-target-costs`, written on origin/main `f2b4e9c2` (#215, D486's seat-identity addendum) and rebased onto
`7476e706` (#216, D487 merged). D488 was handed to this lane. Amends **D451**'s random seat, **D458**/**D462**/**D466**'s G5, **D485**'s re-targeting of
Forge's answer, **D486**'s card targets and **D358**'s single-target redraw. Protocol amendment **M77** (D487's is M76).*

**2026-10-26**

**Context.** J171's read of the first D486 night (J170's data, `/home/justin-a/code/lab/data/lab-j170`) counted 645
"lost casts" in 423 branches, new with D486: Fireball on s09 (545), and on s13 Bone Shards 36, Vicious Offering 28,
Candy Grapple 4 and Disfigure 1 (69). A lost cast is J168's `strand.py` made generic
(`/home/justin-a/code/lab/mtg-table/var/lab-j171-local/bin/metrics.py`): a zone event `{hand, caster}` → `{stack, null}`
after which no state frame lists the card on the stack, no event moves it off the stack and no `cast` event names it.

**What those 614 casts were: refused payments, not strands.** Every one of them -- all 545 on s09 and all 69 on s13 --
has its card back in its caster's **hand** in the next state frame that lists it
(`classify2.py`, below, over all 12,150 and 12,870 phase B frame logs). They are G5's refusals (D458), which D466's
`PolicyControllerAi.putBack` returns to the zone they were cast from by a direct zone move -- one that fires no zone event,
so the frame log shows the card leave the hand and never shows it come back, and the read's definition counts it lost.
The card was not lost; the payment was refused, and the refusal's cost is real all the same: the option was wasted, its
value biased, and Forge's failed payment taps the sources and refunds their mana into the pool (`ComputerUtilMana.java:800`
at the `forge-2.0.14` tag), where it empties at the end of the step. The worker logs say so: s09 holds 1,514
`Didn't find what to pay for` lines (1,505 of them Fireball's) and 1,509 `refusedCast`; s13 holds 536 `AI failed to play Vicious
Offering`, 196 of Bone Shards and 41 of Candy Grapple, almost none with a mana line (the sacrifice part refused).
(The metric also undercounts: a refused cast followed later in the log by a real cast of the same card is not counted.)

The two mechanisms, read in Forge 2.0.14's source (the `forge-2.0.14` tag of `~/code/forge-src`, checked against the
pinned jar with `javap`):

1. **A cost that rises with each target.** Fireball: `ManaCost:X R`, `RaiseCost ... Amount$ IncreaseCost`,
   `IncreaseCost:TargetedObjects$Amount/Minus.1`, `TargetMin$ 0 | TargetMax$ MaxTargets`. The random seat's listing
   (`Explorer.randomOptions`) checks `ComputerUtilCost.canPayCost` **before** `randomTargets` draws the targets, and
   D486's draw takes `max(min, 1)` to `min(max, legal)` of them -- up to 8 on s09, the cost `X + R + 7`. The payment
   (`ComputerUtilMana.payManaCost`) prices the raised cost and refuses it. Before D486 the draw was players only: at most 2
   targets, `+{1}`.
2. **A payment Forge's AI never takes from the play's own targets.** Bone Shards (`AlternateAdditionalCost:Sac<1/Creature>:
   Discard<1/Card>`), Vicious Offering (`Kicker:Sac<1/Creature>`), Candy Grapple (Bargain). The payment is
   `CostPayment.payComputerCosts(new AiCostDecision(ai, sa, false))` (`ComputerUtil.java:126`), whose sacrifice choice
   (`AiController.chooseSacrificeType` → `ComputerUtil.chooseSacrificeType`, `:529-585`) runs
   `ComputerUtilCost.paymentChoicesWithoutTargets` (`:740-746`): the payer's own cards the play targets are not
   payments. So Bone Shards aimed at the seat's only creature finds nothing to sacrifice, and the payment is refused --
   while `canPayCost`, whose `CostPayment.canPayAdditionalCosts` does not filter targets, said yes. The exile, return and
   put-into-library choosers filter the same way (`:627`, `:664`, `:781`); the tap choosers do not (a tapped creature is
   still a legal target). Before D486 the seat could not target a card at all.

Both came in three places where the random seat writes targets: its own listing (`randomTargets`), D485's repair of Forge's
answer (`staleTargets`, whose fill draws among every legal target, the seat's own creatures among them), and -- found by
the first s13 reproduction below, which still had 3 refusals -- **D358's single-target redraw** (`Explorer.targets`, which
`PolicyControllerAi.explored` runs on every priority pick of an exploring seat, the random seat included): on heads it
redraws a single target among every candidate, after the listing's checks.

**Decision.**

1. **After the draw, the seat fits the targets to the cost** (`Explorer.fitCosts`), for its own non-modal plays and for
   Forge's answer when D485 re-targeted it:
   - **(b) first, the cost's own cards** (`Explorer.costPool`): the seat asks Forge's AI cost decision -- the same
     `AiCostDecision` the payment uses -- of each sacrifice, exile, return and put-into-library part not paid from the
     source. When one would refuse, the play's targets are drawn again (own play: `randomTargets` with an `avoid` set;
     Forge's answer: `staleTargets` with it, a held target in the set counting as stale) with every card of the seat's
     that such a part could take left out. So a creature the play needs to sacrifice is never its target; with two
     creatures, one may be the target and the other the payment, as Forge's AI would pay it. Counted
     **`costTargetAvoided`** when such a play is the pick. (The sacrifice chooser can shuffle -- `getCardPreference`
     → `CardLists.shuffle` on `MyRandom` -- but every call here runs inside `Decisions.quiet`, which swaps in a fixed
     `Random(0x5EED)`, so the game's stream does not move.)
   - **(a) then, the count** (`Explorer.trimToPayable`, engine-free): while the cost cannot be paid with the targets
     drawn (`Explorer.manaPayable`, below),
     one target is cut -- a uniform draw over the targets above their part's floor `max(min, 1)`, from the seat's
     stream -- and the cost asked again. A part never goes below its floor, the first `floor` targets drawn are kept, and
     a play payable as drawn is untouched and draws nothing. Counted **`targetCountTrimmed`** when such a play is the
     pick. The count is therefore no longer uniform over D486's range: every drawn count above the largest payable one
     lands on it.
   - **Redrawn before it is dropped** (added after the skeptic review): at every part's floor and still unpayable, the
     cost depends on *which* cards are targeted (a cost raised for a kind of target), so the cards held now are added to
     the `avoid` set and the targets drawn again, as for (b); counted `costTargetAvoided`. In all `FIT_ATTEMPTS` = 4 draws
     of a play's targets (the first included), each through (b) and (a), before it gives the play up. No bench case
     reaches this branch (no card in the lab's decks raises its cost for one target and not another, once Ward is out);
     it is written so that such a card is redrawn, never dropped while a payable target exists.
   - **(c) no payable legal set: the play is not offered.** An own play is left out of the listing, as an unpayable one
     always was; Forge's answer is D485's refused stale answer (`staleRefused`, G5's `refusedCast` / `noRepeatRefused`).
     Never a payment that would refuse it.
   - **"Payable" is the payment's own question, not Forge's judgment** (`Explorer.manaPayable`, changed after the skeptic
     review): the two checks `ComputerUtilCost.canPayCost` ends with -- `ComputerUtilMana.canPayManaCost` (the cost as
     `CostAdjustment` prices it for these targets, which is where Fireball's raise is) and
     `CostPayment.canPayAdditionalCosts` -- without what `canPayCost` adds first: a targeted opponent creature's **Ward**
     cost, judged by Forge's AI (`willPayCosts`, `ComputerUtilCost.java:597-610` at the tag, confirmed in the jar), the
     `AI_SpellsNeedExtraMana` taxes, and the planeswalker coin (`MyRandom`, `:576-588`, which can say no at random).
     The first version asked `canPayCost` itself, and so dropped a single-target play whose drawn target had a Ward the
     AI would not pay, and undid a redraw onto one. **Ward is not taken as a cost here, by choice**: it is a trigger on
     the stack after the cast, not part of the payment; a cast at a Ward creature is legal and its payment goes through,
     so it was never a G5 refusal; and whether to pay it is a decision of its own, which the random seat must not settle
     by asking Forge's judgment. The listing's own `canPayCost` before the draw is unchanged (it sees no new targets).
2. **The single-target redraw keeps the fit** (`Explorer.refitRedraw`): when D358's redraw moves a target and the cost no
   longer fits (the cost's cards, or `manaPayable`), the target is drawn again among the legal ones with the cost's
   cards and the unfit target left out, or put back where it was; a close call's rival that does not fit is not
   swapped in. The redraw is counted as what it ends on (after the review): M71's `changed`, the `target` kind's
   counts and `closeCallsChanged` count a change only when the target it ends on is not Forge's. `costTargetAvoided`
   counts once per pick, whether the listing or the redraw drew away from the cost (a flag per pick, cleared after the
   pick's redraw). This also holds for the D358 exploring seat, where a refused payment strands the card (D466's
   `putBack` is the random seat's alone); its guardrail count is not written (M71's counts are a random seat's). The
   exploring seat's half is **untested** here (the bench runs the redraw with a random seat's config), and the seat
   identity game that plays it did not change (the gate's 12m).
3. **Counted** (protocol **M77**): `targetCountTrimmed` and `costTargetAvoided` in the random seat's `explore.guardrails`,
   summed on the atlas's branch row (`Atlas.Branch`, `BranchRow` in `tools/cubelab/atlas.ts`, written when above 0);
   `tools/check-redaction.mjs`'s `GUARDRAIL_NAMES` accepts both (a two-line hunk beside D487's changes to that file). The
   decision records are unchanged (no new `why`): D487 changed `Decisions.targets`' record shape, and this decision does
   not touch `Decisions.java`.
4. **An errored branch's stack goes to the worker log** (`Atlas.logStack`): J171's s12 rows said
   `IndexOutOfBoundsException: Index 0 out of bounds for length 0` and no worker log held a stack. The row keeps its
   one-line `error`; stderr gets the throw and its causes, 40 frames each.
5. Hard rule 3: no new hop, no thread; all of it runs inside the seat's priority callback on the game thread, in
   `Decisions.quiet`, as the listing always did.

**Comparability (D458 point 3). This changes the random policy.** A play with targets whose cost depends on them --
a per-target cost, a sacrifice / exile / return cost that could take one of the seat's own targets -- is now listed,
targeted and redrawn differently, and every draw the fit makes comes from the seat's stream; every later decision of
that branch is a different random game. A play payable as drawn is untouched and draws nothing, so a game that never
meets one plays as before. The D358 exploring seat's redraw can now be put back or redrawn (point 2), so **D358's
position data (the exploring seat's rows) from before D488 are not pooled with those after it either**, wherever a
redraw met a cost it now refits. The Forge map, Forge's seats and the search seats are untouched. Labels and reads from
before D488 are not pooled with those after it: the split is the git sha and the lab version
(`tools/cubelab/versions.ts`, the code tree under `bridge/src`).

**Not fixed here.**
- **A modal spell's cost with its modes' targets** (a mode with a sacrifice cost aimed at the seat's own creature; Escalate,
  Spree): `fitCosts` skips `ApiType.Charm`, whose targets sit on the chosen modes, not the chain the payment reads. D486's
  follow-up on mode costs stands.
- **A later spell's cost taking an earlier spell's target** is play, not a fault of the draw.
- **The plain Forge seat** pays as Forge does.
- **s12's IndexOutOfBoundsException is a Forge 2.0.14 engine fault**, found here (point 4) and not fixed: below.
- **The read's lost-cast metric** counts D466's put-back cards as lost (no zone event) and misses a refused cast followed by
  a real one. A metric that reads payment refusals should count the worker logs' `AI failed to play` lines, or the next
  state's hand; `refusedCast` is not that count alone: it also counts D485's stale answers that were not offered
  (`refuseStale` → `noteRefused`) and, now, Forge's answers this decision could not fit -- `refusedCast` minus
  `staleRefused`'s first-in-window share is the payment refusals. The lab's `metrics.py` is the lab's to change.
- **`costPool` is over-strict** (follow-ups): on a multi-target play it leaves out every card the cost could take, when
  targeting one of them would still leave a payment; and on a cost Forge's AI always refuses (`Sac<All/...>`, an exile with
  `zoneRestriction` 0, `FromTopGrave`) it returns the pool, so the redraw leaves those cards out before the play is
  given up -- the right end (Forge would refuse the payment), reached by a longer road.
- **`TargetChoices.retainAll`** (the cut) does not clean `dividedMap`; `fitCosts` never meets a divided part (the draw
  leaves them out), so this is theoretical.

**Evidence.**

- **`DecisionSelfTest`** (in `bridge/build.sh`): `decision selftest: 225 check(s), 0 failure(s)` on the rebased tree (215 before the rebase onto D487, whose M76 cases
  are the other ten) -- five new
  (`targetCostsPlanted`, engine-free `Explorer.trimToPayable`): Fireball's eight targets with mana for two are cut to
  two in 60 of 60 seeds, the floor's first target kept and each other target dropped sometimes; a payable count is
  untouched and moves no stream; at the floor and still unpayable it answers -1; with two parts only the one above its
  floor is cut; the cut is seeded.
- **`./tools/ai-bench.sh --selftest`**: `260 check(s), 0 failure(s)` (242 before; `AiBench.targetCostScenarios`, 18 new,
  engine; 16 in the first commit, the Ward case's 2 after the review):
  - `target-cost-fireball-control`: with the fit off (`Explorer.fitOffForTest`) the seat picks Fireball with 5 targets
    at X = 1 on three Mountains; the payment prints `ComputerUtilMana: payManaCost() cost was not paid for Fireball ...
    Didn't find what to pay for {1}` and `[Ai] AI failed to play Fireball (5) [Stack]` -- J171's s09 lines -- and is
    refused (`refusedCast` 1; D466 puts the card back in hand).
  - `target-cost-fireball`: 100 picks of Fireball in 200 listings, every one payable as drawn, 74 cut
    (`targetCountTrimmed`), counts 1 and 2; a cut pick with two targets goes on the stack with nothing printed.
  - `target-cost-shards-control`: with the fit off the seat picks Bone Shards' sacrifice aimed at its only creature, the
    Grizzly Bears; Forge's AI payment will not sacrifice the spell's own target: refused, the Bears still there.
  - `target-cost-shards`: with the Bears the only legal target, the sacrifice version is never the seat's pick in 100
    listings.
  - `target-cost-shards-avoided`: beside the opponent's Hill Giant, 57 sacrifice picks, every one aimed at the Giant, 25
    of them drawn again away from the Bears (`costTargetAvoided`); one cast: on the stack at the Giant, the Bears
    sacrificed.
  - `target-cost-shards-redraw`: D358's single-target redraw on that pick moves it to the Bears 33 times in 60 with the
    fit off (the control), and never with it on (33 redrawn away from them, back to the Giant -- the only other legal
    target -- and so, since the review, not counted as a change).
  - `target-cost-ward` (the review): Murder at the opponent's Kappa Cannoneer (Ward {4}), on three Swamps. The seat picks
    it at the Cannoneer in 26 of 40 listings; on each pick `canPayCost`, which judges the Ward, says no and
    `Explorer.manaPayable` says yes (the first version would have dropped every one); a cast goes on the stack, its
    payment taken, nothing printed.
  - `target-cost-shards-answer-refused` / `-filled`: Forge's answer, Bone Shards' sacrifice aimed at a Hill Giant that
    died. With the fit off D485's repair fills the Bears (the control); with it on, and the Bears the only other target,
    the answer is never offered in 30 priorities (`staleRefused` 30, `refusedCast` 1, `noRepeatRefused` 29); with the
    opponent's Llanowar Elves too, 17 picks, every one at the Elves, 10 filled again away from the Bears.
  - `target-cost-shards-two`: the Bears and Llanowar Elves, no other creature: a sacrifice pick aimed at the Elves goes on
    the stack and the Bears are sacrificed -- one target, the other the payment.
- **The reproductions** (`CUBELAB_HOME_ROOT=var/d488-homes timeout 1500 tools/cubelab.sh atlas --deck-a <deck 1> --deck-b
  <deck 2> --seed <2109|2113> --phase b --decisions 2 --min-options 3 --screen 5 --early-stop 5,10,15 --branch-random 25
  --branch-forge 0 --chunk 5 --checks-parallel 1 --unit-timeout 10 --jobs 4 --out …`, the decks
  `/home/justin-a/code/lab/data/lab-j170/decks/s09-pauper-2009/decks/pauper-2009-0000{1,2}.dck` and
  `.../s13-pauper-2013/decks/pauper-2013-0000{1,2}.dck`), each run on origin/main `f2b4e9c2` (a detached worktree,
  `/home/justin-a/code/mtg-table-d488-before`, carrying only point 4's logging; removed after the runs, its outputs with it) and on this branch. "Lost" is
  `metrics.py`'s definition (`classify2.py` in the lane's scratchpad applies it to every frame log and says where each card
  went next); "refused" is the worker logs' `AI failed to play` lines.

  | | branch games | lost casts | refused (`AI failed to play`) | `Didn't find what to pay for` | `refusedCast` | branch rows trimmed / avoided |
  |---|---|---|---|---|---|---|
  | s09 before | 295 | 26 (Fireball, every one back in hand) | 37 (Fireball 37) | 37 | 37 | -- |
  | **s09 after** | 315 | **0** | **0** | **0** | **0** | 35 (35 picks) / 0 |
  | **s09 after review** | 315 | **0** | **0** | **0** | **0** | 35 (35 picks) / 0 |
  | s13 before | 250 | 0 (the metric misses them: each card was cast later) | 19 (Vicious Offering 12, Bone Shards 5, Vulshok Morningstar 2) | 2 | 19 | -- |
  | **s13 after** | 250 | **0** | **0** | **0** | **0** | 0 / 3 rows (5 picks) |
  | **s13 after review** | 250 | **0** | **0** | **0** | **0** | 0 / 8 rows (8 picks) |

  The "after review" rows are the rebased tree with the review's fixes (Ward out of the check, the redraw before a drop,
  the redraw counted as what it ends on, `costTargetAvoided` once per pick); s13's avoided count is now one per pick.
  On s09, Fireball reached the stack 51 times before and 82 times after (both after runs). Both runs branched the same decisions' baseline
  (Forge's, unchanged); the option sets differ by the cuts' screen and early stop. s13's checks are clean before and after.
  s09's checks carry one problem in both runs, the same class: 86 frame logs before and 95 after fail
  `check-redaction.mjs` on `decision N chosen null is not a token` -- Tear Asunder's empty kicker part, J171's 2,361
  null-chosen logs on s09, which D487 (M76) fixes; no other check line differs. The "after review" run, on the tree with
  D487 merged, has **clean** checks on s09 (9,601 rows, 632 frame logs, 7 leak checks) and on s13.
  - The first s13 run after the listing's fit alone still had 3 refusals (Bone Shards 2, Vicious Offering 1): their
    target records carried `explore: {rule: "random", forge: <the opponent's creature>}` with the seat's own creature
    chosen -- D358's redraw, after the listing. Point 2 is that finding; the table's after run includes it.
- **s12's error, found** (point 4, reproduced on origin/main): J171's 10 errored s12 rows were re-run by copying
  `b-s12-powered-2112`'s plan, schedule, baseline and ledger with the errored rows and their 9 units removed, and resuming
  the same plan (`--options 8 --decisions 8 --min-options 3 --screen 25 --early-stop 50,100,150 --branch-random 200
  --branch-forge 0 --chunk 25`, `var/d488-s12-repro` in the before worktree): **all 10 errors reproduced**, each stack
  the same:
  ```
  java.lang.IndexOutOfBoundsException: Index 0 out of bounds for length 0
    at forge.util.collect.FCollection.get(FCollection.java:447)
    at forge.game.ability.effects.PumpEffect.resolve(PumpEffect.java:299)
    at forge.game.spellability.AbilitySub.resolve(AbilitySub.java:99)
    at forge.game.ability.AbilityUtils.resolveSubAbilities(AbilityUtils.java:1372)
    at forge.game.zone.MagicStack.resolveStack(MagicStack.java:611)
  ```
  `PumpEffect.java:299` at the tag is `chooseKeywordForPump(..., tgtCards.get(0))` under `KWChoice` with no empty check.
  The card is deck 2's **Practiced Offense** (`PutCounterAll` at target player, `SubAbility$ DBPump | ValidTgts$ Creature |
  KWChoice$ Double Strike,Lifelink`). In `d0-random-o1-b192` seat B's random seat cast it at the player and at the
  opponent's Six (D486's card target; the redraw chose it), then cast Leyline Binding, whose trigger exiled Six; Practiced
  Offense resolved for its legal player target, its pump part had no target left, and Forge threw. An engine fault in
  Forge 2.0.14, reachable by any seat whenever that creature leaves first; D486 made it reachable for the random seat
  (J168, before D486, had 2). Not fixed here: a guard would be a change to how a resolving Forge spell is played.
- **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh && FORGE_JAR=<config.json's forgeJar> WSPORT=9900
  GATE_JOBS=4 ./tools/check-all.sh`, **`check-all OK`**, 757.6 s wall, 60 jobs (`var/check-all/20261026-131950-137344`;
  the load average reached 34 with other lanes' engines running beside it; node 1863 pass, 11 skipped, 0 fail). **12m: all
  4 seat-identity games are the golden's** -- no seat there is a random seat, and the exploring seat's redraw met no cost
  it changed -- so the golden is not regenerated.
- **After the skeptic review** (the second commit, on the tree rebased onto `7476e706`, D487 merged): `./bridge/build.sh`
  OK (decision selftest 225/0), `./tools/ai-bench.sh --selftest` 260/0, `node tools/check-redaction-selftest.mjs` OK,
  `npm --prefix web test` OK (node 1851 pass, 9 skipped; vitest 161 passed), `node tools/decisions.mjs check` OK, the two
  reproductions above ("after review"). **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh &&
  FORGE_JAR=<config.json's forgeJar> WSPORT=9900 GATE_JOBS=4 ./tools/check-all.sh`, **`check-all OK`**, 532.9 s wall, 60
  jobs (`var/check-all/20261026-135753-828726`; node 1864 pass, 11 skipped, 0 fail); 12m: all 4 seat-identity games the
  golden's, not regenerated. Two Javadoc blocks in `Explorer.java` (`fitCosts`, `costPool`) were corrected after that
  run, comments only; `./bridge/build.sh` OK on them.

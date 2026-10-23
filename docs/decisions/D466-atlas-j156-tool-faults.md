## D466 — J156's four atlas tool faults: the fork carries a play's optional costs, branch errors are problems, G1 reads one land listing, a refused cast puts its card back (G5), and a truncated frame log no longer kills the checks (amends D451, D458, D462)

*Branch `pc/atlas-j156-fixes`. `node tools/decisions.mjs next` gave D466. Amends **D451** point 2 (the
random seat's options) and point 6 (the checks), **D458** and **D462** (G5).*

**2026-10-23**

**Context.** J156 ran the move atlas's rung 2 on 6fb13bf9 (nine spines, three pairs). Its summary
(`pc-results/results/J156/summary.md`) found four faults in the tool, not in the play, and a fifth in
how the run ended:

1. **Spine 458 was 9 of 16 complete.** 6,480 of its 16,990 branch games errored with
   `IllegalStateException: optional costs are not copied`: from d5 on, every branch of every cast of
   Orcish Bowmasters, Retrofitter Foundry, Recurring Nightmare, Tireless Tracker, Walking Ballista and
   Eternal Witness. Six (cast at d2) gives the nonland permanent cards in its controller's graveyard
   retrace, and `SearchPolicy.mapSa` refused any play carrying an optional cost.
2. **The atlas named none of it.** `atlas.problems` counted unit failures, fork problems, leaks and
   guardrails, never a branch's error.
3. **G1 flagged 3,071 "offered a land and played X"** on the vintage pair, every one a land in exile
   that Laelia, the Blade Reforged lets its controller play, 2,518 of them after the land drop was used.
   The seat's own options held none of them. The checker also printed 200 (50 an atlas) as the count.
4. **G5's `noRepeatRefused` was 0 of 4,942 refusals** on the repeat pair.
5. **One hung branch cost 458 its atlas.json.** The watchdog killed the worker, the branch's two frame
   logs were left truncated, and the end-of-spine checks died on them (gunzip's "unexpected end of
   file").

**What each turned out to be.**

1. **`mapSa`.** Forge builds a play with an optional cost as a copy of the base spell with the cost
   added: `GameActionUtil.addOptionalCosts` (`forge-game/.../GameActionUtil.java:520-551` at the
   `forge-2.0.14` tag) copies the spell, adds each cost to its pay costs and records it with
   `addOptionalCost` (`:535`). Retrace, offered by `getOptionalCostValues` (`:396`) for a `Retrace`
   keyword on a graveyard card (`:487`), also moves the restriction zone to the graveyard. The AI's
   candidate list is built that way (`ComputerUtilAbility.getOriginalAndAltCostAbilities`,
   `forge-ai/.../ComputerUtilAbility.java:142`). The copy keeps the base's description, so `mapSa`'s
   match by description finds the copy's base spell, without the cost. Forge's own simulation copier
   adds the same costs back (`SpellAbilityChoiceCopier.copyCastChoices`, `:25-28`), and every call it
   needs is in the 2.0.14 jar (javap: `getOptionalCostValues`, `addOptionalCosts`, `getOptionalCosts`,
   `OptionalCostValue.getType`).
2. **Branch errors** were in `branches.jsonl` and in `phaseB.branchErrors` as one number, and nowhere
   else.
3. **G1.** The decision record listed lands from `ComputerUtilAbility.getAvailableLandsToPlay`
   (`forge-ai/.../ComputerUtilAbility.java:38-65` at the tag). That function checks the land drop
   (`Player.canPlayLand`, `:48`) for the hand only; a land in exile, the graveyard or on top of the
   library is listed whenever something lets the player play it (`:60`), drop used or not. The random
   seat built its own list from the same call but kept a land only if it had a land ability that
   `Card.getAllPossibleAbilities(seat, true)` keeps, which drops one whose `canPlay` fails
   (`Card.java:7487`), and a `LandAbility`'s `canPlay` *is* the land drop (`LandAbility.java:60`). So the
   record offered lands the seat could not play. It was the checker, not the seat.
4. **G5.** Neither the window key nor the counter. Forge's AI moves a spell's card to the stack before it
   pays (`ComputerUtil.handlePlayingSpellAbility`, `forge-ai/.../ComputerUtil.java:100` at the tag) and
   freezes the stack (`:123`). When the payment fails it prints "AI failed to play X [zone]", marks the
   play skipped, and moves the card back only if it was cast *from* the stack (`:136`), under its own
   comment "FIXME: Should not arrive here, though the card seems to be stuck on stack zone and
   invalidated and nowhere to be found" (`:133`). Every one of J156's ff5 refusals printed `[Stack]`
   (4,961 lines over phase A and the three spines). Each refusal took its card out of the game, so the
   seat's next listing in that window could not hold the play, and there was never anything for G5 to
   leave out. (It also means the Forge seats' D465 pay cap can only ever fire on an activated ability,
   which matches its 0.) The "listing already drops the play" hypothesis was right, for this reason.
5. **The checks** read every frame log with `zlib.gunzipSync` and let the throw end `writeAtlas`.

**Decision.**

1. **`mapSa` carries the optional costs.** The copy's base spell gets the costs the original play was
   built with, from those `getOptionalCostValues` offers on the copy, in Forge's order
   (`SearchPolicy.chosenOptionalCosts`). A cost the copy does not offer fails the mapping and names the
   cost, instead of the blanket refusal.
2. **Branch errors are problems.** `checks.branchErrors` counts every errored branch game by error text,
   with ids written as `#` so one fault reads as one text. An option (one decision's one option, over both
   continuations) whose branch games errored more than `--branch-error-max` of the time (a share, default
   0.1, kept in the plan) is listed with its errors by continuation, and each listed option is a problem.
   `atlas.md`'s checks show the texts and the listed options. On J156's 458 rows, this names 27 options
   (the six cards' casts at d5, d7, d8, d10, d12, d14 and d15). 460's 23 "No band for attacker" NPEs stay
   under the bar and are counted.
3. **One land listing.** `Decisions.landPlays(seat)` is every land the seat may play now, with its land
   abilities (`getAvailableLandsToPlay`, then the land abilities `getAllPossibleAbilities(seat, true)`
   keeps). The decision record's options (`Decisions.priority`), the random seat's
   (`Explorer.randomOptions`) and the D358 exploring seat's (`Explorer.priorityOptions`) are all built
   from it. G1 can now flag only a land the seat could have played. The checker counts every violation
   (`violationCount`, and `checks.guardrails.violations` is that count, with `violationsBy` splitting
   G1 from G4). It still names only the first 50, and a problem line gives the total.
4. **A refused cast puts its card back.** In the random seat's `playChosenSpellAbility`, a refused spell
   whose card was left in the Stack zone, and on no stack, goes back to the zone it was cast from, as the
   same object (so a may-play effect that remembers it, such as Elite Spellbinder's, still applies), at
   the same position. The stack is unfrozen. This is the move Forge's own cancelled cast makes
   (`GameActionUtil.rollbackAbility`, `:947-963`, then `clearFrozen`), done by hand
   (`PolicyControllerAi.putBack`). It skips that method's refund: the failed payment already refunded
   its mana to the pool (`ComputerUtilMana.java:800`), and the refund would also undo the mana abilities
   that produced it. Only the random seat does this. Forge's seats keep Forge's behaviour, because the
   Forge map is Forge's.
5. **A truncated log is skipped and named.** Every frame-log read in `writeAtlas` (the rows' id check,
   the guardrails, the Forge seats' pay cap) goes through one reader (`frameLogReader`). The reader
   returns null for a file zlib cannot inflate and remembers it. Such a log is not sent to the redaction
   checker, is listed in `checks.unreadableFrameLogs` with zlib's reason, and is one problem. `atlas.json`
   and `atlas.md` are written as usual.
6. **The atlas test's "two maps" flake was V8, and is worked around.** It failed J153's and J154's
   pilots, and this lane's new tests in the same file made it fail 6 runs in 8. `decisionAtlas` read the
   random map's regret, low and high back with the Forge map's values (its `best` its own) after the
   second `regretInterval` call returned. Inside `regretInterval` the values were right. Under
   `node --no-maglev` it failed 0 runs in 3. The pattern fits Node 24.20's Maglev sharing a double
   field's box between two objects. `decisionAtlas` now copies each map's numbers out before the next
   call (`mapOf`), and the file passed 12 of 12 runs. No J156 atlas shows the signature: in every
   decision whose best is not option 0, the regret is above zero.

**Comparability (D458 point 3).** Points 3 and 4 touch the random policy:

- **Point 3 changes no choice.** The seat's land options are what they were. The replayed vintage
  rollouts below are the same games.
- **Point 4 changes the game after every refusal.** The refused card stays in the game and can be cast
  again in a later window. An atlas after this decision is a fourth random policy. The Forge map is
  unchanged, and so are the decisions and seats that never see a refusal.
- **Point 1 changes the search everywhere, not only the atlas** (added 2026-10-23, #184's review).
  `mapSa` is how every search seat installs a candidate on its rollout copy (`PriorityCand.install`,
  and the target search). That covers search-v2 on the ladder, in the SPRT and tuner, in census games,
  and the coach helper's live hint. Before #184, a candidate built with an optional cost (retrace,
  kicker, buyback, entwine, jump-start, ...) threw on the copy:
  - when it was Forge's own answer, the search kept that answer with no verdict
    (`search.fallback.unmappable`);
  - when it was any other candidate, the search dropped it and searched without it
    (`search.candidateUnmappable`).

  After #184 such a play is a candidate like any other and is ranked. **So search-v2 results (ladder
  ratings, SPRT verdicts, tuner winners, census numbers) from before and after #184 (merged as 9fe69ad8)
  are two engines and are not pooled**, even though the player's config hash did not change. Split them
  by the experiment log's git sha. The change can only show in games where such a play was a candidate,
  but nothing records which games those were.

**Follow-ups from #184's review (2026-10-23, `pc/d466-followups`).**
- **The search's comparability:** see the last bullet under *Comparability* above, and
  `docs/guides/ai-ladder.md`'s *A code change is not a config change*. `docs/search-hint.md` states no
  comparability, so it is unchanged.
- **The repro is kept with the workaround.** The `mapOf` comment in `decisionAtlas` gives the loop that
  fails without it and passes under `--no-maglev`, and says when the workaround can go.
- **The rows' id check names what it skipped.** When the reader cannot read a game's frame log, the atlas
  prints that game's id check as skipped, naming the game and the log. The list is
  `checks.idChecksSkipped`.
- **atlas-selftest shows G5 firing.** Its decks are not ours to change for this:
  - `pacho-shield` is the user's deck in play;
  - `doom-legion` is the gate's villain, written from its spec, and changing it would move the gate's
    recordings.

  So a second leg plays phase A of the committed repeat pair, fair-fight-900000005 (Elite Spellbinder
  in seat B). It uses seed 452 and 6 rollouts, because J156 saw a refusal in that seed's rollout 6. It
  requires `refusedCast` >= 1 and `noRepeatRefused` >= 1, and in two runs it gave 2 and 2, from the same
  game each time. The leg adds about 30 s. The self-test has no golden digests, so nothing was
  regenerated.

**Rejected.**
- **Call `GameActionUtil.rollbackAbility` itself.** Its refund (`CostPayment.refundPayment`, then
  `ManaRefundService.refundManaPaid`) undoes the play's paying mana abilities, but the failed AI payment
  has already put that mana in the pool. Undoing the abilities would untap the sources with the mana
  still floating.
- **Leave the stranded card, and drop G5's count from the checks.** That keeps a refusal that removes a
  card from the game, which is the real fault. G5's count is how it was found.
- **Drop the record's exile lands only after the land drop** (a filter in `Decisions.priority`). That is
  a second listing beside the seat's, which is the shape of the bug.
- **Run node with `--no-maglev`.** That is a flag for every caller of the atlas code, for a bug fixed by
  one copy.
- **Count branch errors per unit.** A unit is a chunk of branches, and the reader needs the option.

**Measured.**
- `bridge/build.sh`: OK, the lint and its self-test included. `DecisionSelfTest`: 150 checks. New: a
  planted retrace cast maps (the copy's base gets `Retrace` back); kicker costs come back in Forge's order
  and nothing else; a cost the copy does not offer fails, naming it. G5 planted: a refusal, then a
  same-window decision that still lists the play, counts 1; with the card gone from the listing
  (J156's case) it counts 0.
- Node: `web/test/cubelab-atlas.test.ts` adds five tests:
  - branch errors by text and by option, the threshold the job's own;
  - `writeAtlas` makes an errored option a problem and prints it in atlas.md;
  - G1's planted controls: Laelia's exiled land after the drop, which the listing does not hold, is no
    flag; a land in hand with the drop unused and not played is one;
  - 70 violations counted though 50 are named;
  - J156's truncated logs skipped and named, with atlas.json still written.

  All node tests pass (1,796, 0 failed), vitest passes (161), and `tsc --noEmit` is clean.
- Real engine (the lab runner idle), one check a fix:
  - **mapSa:** spine 458 decision 5 on vintage-900000007, replayed from J156's own baseline listing,
    four random and two Forge branches of each option. Orcish Bowmasters' retrace cast (`cast:36`)
    played all 6 of its branches, against J156's 240 of 240 errored. The fork's graveyard shows the
    discarded Swamp, and the frame log shows the stack item resolving.
  - **G1:** J156's phase A rollouts g101 and g102 of the vintage pair, replayed. They are the same games
    (the same winner, turns and guardrail counts as J156's rows). `land:93` is no longer offered at g101
    seat 1's decisions 103 and 105, and G1's violations are 0 against J156's 3 in these two games.
  - **G5:** five of J156's ff5 phase A rollouts that had a refusal (g6, g16, g18, g35, g36). 7 refusals,
    and `noRepeatRefused` 5, against 0 before. The checks were clean.
  - **Truncated logs:** `--phase report` over the 458 check's folder with J156's two truncated logs
    (`b-vintage7-458/truncated/`) added. Exit 3, both named "unexpected end of file", and atlas.json
    was written.
- No full gate (the lane's instructions), and no atlas-selftest G5 case (D462 point 4 still holds: its
  decks carry no tax).

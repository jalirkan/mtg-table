## D471 — The move atlas's random seat draws X itself, from 1 to the most it can pay, and never offers a play payable only at X = 0 (guardrail G6)

*Branch `pc/random-seat-zero-x`. Amends **D451** point 2 (the guardrails) and point 6 (the checks), as
**D458** did for G5. `node tools/decisions.mjs next` gave D470, which PR #191 (`pc/atlas-no-band`) holds,
so this is D471.*

**2026-10-24**

**Context.** J158's pauper spine (`b-pauper5-464`: `tools/ai-bench/decks/sets/pauper-900000005-{A,B}.dck`,
seed 464) ended 54 of its first 1,332 branches with D467's `BranchTimeout` at 120 s, all random
continuations (decisions 0, 2 and 4). In every sampled one, seat A's random seat kept activating
**Crypt Rats** (card 40, deck A: `{X}: Crypt Rats deals X damage to each creature and each player. Spend
only black mana on X.`) at **X = 0**. That activation is free and does nothing. The seat took it
3,600–20,700 times a branch, roughly alternating with passes, with dozens of copies on the stack at once,
and ran 7k–45k steps before the clock fired. Nothing was stuck inside one step. G3 (`noRepeatNoOp`) never
saw it, because G3 judges a repeat only at a decision with the stack empty, and the stack was almost never
empty. Even when it was, G3 bans the play for one decision only.

**The mechanism** (confirmed by replaying `d0-random-o0-b27` from J158's plan and baseline, one worker,
on origin/main `6e784354`). The replay timed out exactly as J158's did: turn 16, MAIN2, after 15,412
steps. Seat A's decision records show `activate:40` chosen 6,165 times, and Forge's own answer at every one
of them was `pass` (`explore.forge`). Every Crypt Rats item on the stack reads
`Deals 0 damage to each creature and each player. (X=0)`, and the stack peaked at 260 items.

Why X was 0:

- **The random seat never chose X.** Forge's AI sizes X inside its decision to play: `AiController.canPlaySa`
  for a play with no API AI (`forge-ai/.../AiController.java:922-927` at the `forge-2.0.14` tag), and each
  API's own AI otherwise (`DamageAllAi`, `DamageDealAi`, `TokenAi`, `ChangeZoneAi`, `PermanentAi`, ...).
  Both write X onto the play with `setXManaCostPaid`, from `ComputerUtilCost.setMaxXValue`. The random seat
  asks no API AI (D451 point 1), so its play went to the engine with whatever X was already on it. The
  payment reads that value (`ComputerUtilMana.calculateManaCost`, `:1230-1260`).
- **For Crypt Rats that value is nothing.** `DamageAllAi` writes X only when it wants to play
  (`best_x > 0`, `:69-73`). After every activation `MagicStack.add` puts a fresh copy on the stack and
  clears the original's X (`:334-341`). So X is null, which pays as 0, which costs nothing.
- **For a spell it is stale.** The value is whatever Forge's last evaluation of the card wrote, often
  Forge's maximum, sometimes 0. J158's random branches show Fireball cast at X = 0 to 8.
- **Forge's AI never answers X = 0.** `canPlaySa`'s generic path returns `CantAffordX` when the maximum
  is not above 0. So do `PermanentAi` (`:93-95`) and `ChangeZoneAi` (`:369-372`). `TokenAi` refuses
  `x <= 0` (`:289-291`), and `DamageAllAi` plays only with `best_x > 0`. The one place it chooses 0 on
  purpose is Chalice of the Void's logic (`PermanentAi`'s `ChaliceOfTheVoid`, after the same `xPay <= 0`
  check), where 0 is a real play.

**Decision.**

1. **G6, the random seat sizes X itself.** The rule applies when the seat lists a play of its own (not
   Forge's answer) whose mana cost has an {X} (`SpellAbility.costHasManaX`).
   - The listing reads the most X the seat can pay now from Forge's own function,
     `ComputerUtilCost.setMaxXValue`. That is its payable mana under any `XColor` (Crypt Rats: black
     only), `XMax`, the script's `AIXMax`, and the non-mana X limits. Its signature is
     `setMaxXValue(SpellAbility sa, Player ai, boolean effect)` (`ComputerUtilCost.java:671` at the
     `forge-2.0.14` tag). The third argument, `effect`, says whether the cost is paid as part of an effect
     (Forge's callers pass `sa.isTrigger()`) rather than to cast or activate: it goes down to
     `determineLeftoverMana`, the cost checks under it and the non-mana X limit, and with it true Forge
     applies no cost increase or reduction (`CostAdjustment.java:37-41` and `:173-179`). It is not a
     choice between the cost's X and an effect's own X: both are the play's one `xManaCostPaid`. The seat passes `false`, as Forge's
     `canPlaySa` does for a play that is not a trigger (`sa.isTrigger()`, `AiController.java:924`).
   - **X in a non-mana cost is outside G6 by design.** A play whose X is only in a non-mana cost part
     (`costHasManaX()` false: sacrifice X, remove X counters, pay X life) is listed as before, with no X
     drawn and no `zeroX` verdict. Such an X costs something real even when the seat does not size it, so
     it cannot make the free loop G6 exists to end.
   - If that is 0, the play is **left out** of the listing and the removal is counted (`zeroXLeftOut`).
   - Otherwise X is drawn **uniformly from 1 to that maximum** (`Explorer.drawX`, the seat's own seeded
     stream) and set on the play. Like the play's random targets, it is set before the "can pay" check.
   - The X each listed play carried is noted before the draw (`setMaxXValue` writes one too), and **no
     play the seat listed and did not pick keeps a drawn X**. A play left out, or listed and not picked,
     gets its old X back when the pick is made (`Explorer.restoreChoices`, at the end of `randomPriority`). The
     pick keeps its draw until the engine has played it, and gets its old X back if the engine refuses
     it (`Explorer.played`). This was added after #192's review: the draw is written on the real
     `SpellAbility`, so an unpicked play kept a random X into the next priority window.
   - **Does Forge's AI trust an X already on a play?** Mostly not. Its decision path sizes X again before
     it plays: `canPlaySa`'s generic path (`AiController.java:924`) and the API AIs (`DamageAllAi.java:35`)
     call `setMaxXValue`, which writes X unconditionally (`ComputerUtilCost.java:736`), and
     `canPlayAndPayForFace` runs `canPayCost` only after `canPlaySa` (`AiController.java:855-861`). But a
     cost check made without that sizing prices X from the play's own value
     (`ComputerUtilMana.calculateManaCost`, `ComputerUtilMana.java:1238`, when testing with no extra mana),
     and `predictSpellToCastInMain2` makes one (`canPayCost(sa, player, false)` on a permanent spell,
     `AiController.java:752`). So a stale random X on a Walking Ballista or Hangarback Walker could change
     that prediction. The restore takes the question away rather than leaving it to Forge's paths.
   - **The random targets were the same leftover** (the same review). `Explorer.randomTargets` writes
     the targets it draws onto each targeting part of the real `SpellAbility` (after `resetTargets()`),
     so a listed play the seat did not pick kept them into the next priority window. Forge's AI does not
     always choose targets afresh: neither `canPlaySa` (`AiController.java:877`) nor the template it
     calls, `SpellAbilityAi.canPlayWithSubs` -> `canPlayWithoutRestrict` -> `checkApiLogic`
     (`SpellAbilityAi.java:54`, `:79`, `:167`), resets a play's targets, and `canPlaySa` itself reads
     them as they stand (`isTargetNumberValid()`, `AiController.java:956-957`). Resetting is left to each
     effect's AI. Most targeting AIs do it (`PumpAi.java:370`), but some only add: `GoadAi.checkApiLogic`
     puts its pick next to whatever is there (`sa.getTargets().add(...)`, `GoadAi.java:62`), and
     `CountersRemoveAi`, `MustBlockAi` and `ProtectAllAi`, among others, never call `resetTargets`. The
     only reset on the play path is for splice (`ComputerUtil.java:92`). So each part's targets are now
     noted, as a copy (`TargetChoices.clone()`), before the seat resets them, and put back with the X,
     by the same helper and at the same two moments: on every listed play the seat did not pick, at the
     end of the pick, and on a pick the engine refused. A played pick keeps its targets, which its
     resolution reads. `Explorer.Before` holds one put-back per thing the seat wrote on a play.
   - When the seat picks such a play, the pick is counted (`xDrawn`).
   - **Forge's own answer keeps Forge's X**, 0 included. It is always among the options, so a Chalice at 0
     chosen by Forge's logic is still played.
   - Nothing changes for a seat that is not the random seat. The listing is the random seat's own
     (`Explorer.randomOptions`).
2. **Why (a), and not (b), a cap on repeating one activation within a priority window.**
   - (a) is the mechanism. The loop exists because a free activation exists, and it is free only at
     X = 0. With X at least 1, Crypt Rats spends black mana each time, and the seat's mana is finite.
   - (a) is also Forge's own floor, so it removes an option that Forge's AI never plays. D451's guardrails
     are allowed to remove only options no player would consider, and G3 removed only exact no-op repeats.
   - (b) would be a new strategic limit on legal, costly repeats such as pumping or pinging, which D451
     does not allow.
   - (a) left no loop. In the replays below no branch ran long, and the lab's decks hold no other free
     repeatable activation. A scan of every `[Main]` card in `tools/ai-bench/decks/sets/*.dck` for an
     activated ability whose cost is only `0` or `X` found Crypt Rats alone, in 9 decks. So (b) is not
     added.
3. **X = 0 is left out for every own X play, not only for Crypt Rats.** The other {X} cards in the lab's
   decks:
   - Fireball, Walking Ballista, Hangarback Walker, Secure the Wastes, Nyxborn Hydra, Rolling Thunder and
     Polukranos: at X = 0 each does nothing, or puts a 0/0 into the graveyard. Rolling Thunder's divided
     damage already keeps it out of the random seat's listing.
   - Choco-Comet and Green Sun's Zenith are the two where X = 0 does something: a 2/2 Bird for {R}{R}, or
     an MV-0 green creature. Under G6 the random seat plays them only with X at least 1, or as Forge's own
     answer.

   A rule that sorted "X = 0 is a no-op" from "X = 0 does something" would have to read each effect's
   parameters for X: amounts, filters, keyword counters. The cards that gain from that sorting are two
   corner cases that Forge's own AI also never plays at 0. The plain rule is chosen, and the cost is
   stated here.
4. **G6's violation, and how it is counted.**
   - A violation is a play the random seat picked itself (not Forge's answer) with {X} in its mana cost
     that the engine put on the stack with X below 1.
   - It is read back after the play, from the stack item. An activated ability goes onto the stack as a
     copy (`MagicStack.add`) and the original's X is cleared, so the original's X would always read 0.
     The first replay of this branch showed exactly that: a `zeroX` of 1 for a Crypt Rats item at X = 1.
   - Each violation is counted as `zeroX` (`Explorer.played`, `zeroXViolation`). A play that is not on the
     stack after the engine accepted it gives no verdict.
   - **So `zeroX` can under-count.** The seat's own X play that the engine accepted but that never
     reached the stack, or left it before the read (countered as it was cast, a special action), is not
     judged, and a violation there would not be counted. A 0 is "no violation among the plays that
     reached the stack", not "none at all". The listing never offers X = 0 (`zeroXLeftOut`), which is the
     check that does not depend on the read.
   - The three counts are in the seat's `decisions` summary (`explore.guardrails`, protocol **M73**), as
     G3's and G5's are (M71). `tools/check-redaction.mjs` accepts the three names.
   - `guardrailCheck` sums them over phase A's logs and the random branches' logs.
   - `atlas.json`'s `checks.guardrails` carries `xDrawn`, `zeroXLeftOut` and `zeroX`, zero when none
     fired. `zeroX` is added to `violations` and `violationsBy.G6`, and any `zeroX` above 0 is a problem
     (exit 3). `atlas.md` prints all three.
5. **`atlas-selftest` gains a G6 leg**, the way D466 gave it a G5 leg. It plays phase A of the Crypt
   Rats pair, pauper-900000005 (`SELFTEST_G6`: seed 464, 6 rollouts), and requires `xDrawn` >= 1,
   `zeroXLeftOut` >= 1 and `zeroX` = 0.
   - The G5 leg moves from 6 rollouts to 16. Its pair carries {X} cards too (Walking Ballista in deck A,
     Hangarback Walker in deck B), so G6 changed its games. Under G6, seed 452's first 6 rollouts refuse
     nothing. In 20 probe rollouts, rollout 16 is the first with a refusal and a removal after it (the
     others: rollouts 18 and 19). The leg costs about 10 more games.
6. **This changes the random policy, so atlases before and after it are not pooled** (D458 point 3,
   D466's *Comparability*).
   - Every own X play now has a drawn X where it had a stale one or 0, and a play payable only at X = 0
     is no longer offered. Its draws also move the seat's random stream.
   - A random branch on a deck with any {X} card is therefore a different game from the same seed. An
     atlas after this decision is a fifth random policy, even on the same pair, seed and baseline.
   - J158's random map, and every atlas before this, is read beside a later one as two policies, never
     pooled. Split them by the plan's mtg-table commit.
   - The Forge map is unchanged: G6 touches no Forge-continuation seat. A deck with no {X} card loses
     nothing, except the stream draws its X plays would have made.

**Rejected.**

- **(b), a repeat cap per priority window** (point 2).
- **Uniform X over 0..max.** That keeps the loop, because the free X = 0 is still drawn as often as any
  other value, and it keeps an option Forge's AI never plays.
- **X = the maximum** (what `setMaxXValue` leaves on the play). That is one fixed "how much", which makes
  every random Crypt Rats a board wipe. The random seat is uniform over legal answers, and X is part of
  the answer.
- **Ask Forge's API AI for X** (run `canPlaySa` on the pick). Its X comes with its judgment of whether to
  play at all, and when it declines it writes nothing. That is the per-card judgment D451 point 1 keeps
  out, and it is what left Crypt Rats at 0.
- **Read G6's violation from the frames' stack text** (`(X=0)` on an item the seat controls). That parses
  an engine string, and it cannot tell the seat's own pick from Forge's answer, whose X = 0 is allowed.
  The read-back from the stack item is exact.
- **A no-op test for X = 0 per effect** (point 3).

**Measured.**

- Engine-free: `DecisionSelfTest` (in `bridge/build.sh`), 167 checks, 0 failures.
  - Planted Crypt Rats with no black mana (maximum 0) is left out and counted, and so is a negative
    maximum.
  - With mana for 3, 300 draws are all in 1..3 and each of 1, 2 and 3 comes up. With mana for 1, X is 1.
  - The violation predicate: an own pick paid at 0, or never sized, is a violation. An own pick at 1 is
    not, and neither is a play with no {X}.
  - Positive control: Forge's own answer at X = 0 is never a violation.
- Node: `web/test/cubelab-atlas.test.ts` adds a G6 test.
  - The counts are summed from phase A's and the random branches' summaries, and a Forge branch's log is
    not read.
  - `zeroX` = 0 gives no problem. A planted `zeroX` of 2 gives `violations` 2, `violationsBy.G6` 2 and the
    problem line.
  - `atlas.md` prints the counts.
  - The G1 violation test now reads `violationsBy` with G6 too.
  - `web/test/cubelab-record.test.ts`: the checker accepts a random seat's summary with G6's names.
- Real engine, one worker beside J158's six, J158's own plan and baseline:
  - **`d0-random-o0-b27`**. Before (origin/main): `BranchTimeout` at 120 s, turn 16, MAIN2, after
    15,412 steps. After: it ends normally in 4.2 s (seat A wins, 18 turns, 464 steps). Crypt Rats was
    activated once, at X = 1. 22 offers payable only at X = 0 were left out. `zeroX` is 0, and both logs
    pass `check-redaction.mjs --empty-hand-ok`. Option 1 of the same branch also ends normally, in 6.1 s.
  - **`d2-random-*-b17`**. J158 timed out options 0 and 1 of this branch. After the fix all three options
    end normally, in 7.5, 5.8 and 2.8 s.
- **`tools/cubelab.sh atlas-selftest --jobs 1`**: OK in 4 min 22 s. The main atlas has 16 forks, 8 no-leak
  checks, 38 frame logs and 538 rows; its decks hold no {X} card, so G6 counts 0 there.
  - The G5 leg (16 rollouts) refused 2 and left out 2.
  - The G6 leg (Crypt Rats pair, 6 rollouts) drew X 10 times, left out 63 offers payable only at X = 0,
    and paid 0 own plays at X = 0.
  - The first run, with the G5 leg still at 6 rollouts, failed on exactly that leg (refused 0). Its G6
    counts there were 7 drawn, 16 left out and 0 paid at 0.
- No full gate (the lane's instructions), and J158 was not re-run.
- **After #192's review** (the X restore, on main `0e0ec412`): `DecisionSelfTest` 172 checks, 0 failures
  (four new: after a pick the unpicked X abilities carry their original X, null and 2, and the pick its
  draw; a refused pick gets its X back; a played pick keeps its draw; a pass leaves every listed X as it
  was). `tools/cubelab.sh atlas-selftest --jobs 1`: OK in 3 min 56 s, with the same counts as above (the
  tax pair's G5 refused 2 and left out 2; the G6 leg drew X 10 times, left out 63 and paid 0 at X = 0):
  the restore moves no pick and no draw.

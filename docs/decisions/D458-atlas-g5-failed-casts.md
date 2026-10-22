## D458 — The move atlas's random seat does not re-pick a play the engine refused to pay for in the same priority window (guardrail G5), and every random seat's guardrail counts are read back from its own log

*Branch `pc/atlas-random-seat-failed-casts`. Amends **D451** point 2 (the guardrails) and point 6 (the
checks). `node tools/decisions.mjs next` gave D457, which PR #174 (`pc/ledger-followups`) holds, so
this is D458.*

**2026-10-22**

**Name.** The request called this guardrail G4. D451 point 2 already uses **G4** for "the opening
hand is always kept", and the code says the same (`Explorer.mulligan`, `atlas.ts`'s
`guardrailCheck`), so this one is **G5**. G1–G4 keep their meanings.

**Context.** The first full move atlas (J148, fair-fight-900000005, seed 451) found the following.

- The random seat picked spells that its "can play and pay for now" test admits
  (`ComputerUtilCost.canPayCost`) and that Forge's auto-pay then could not pay for under a tax. The
  tax was Elite Spellbinder's (seat B's cards 77 and 81).
- The worker logs hold 1,066 lines of `ComputerUtilMana`'s "Didn't find what to pay for {1}". They
  come from 217 unit attempts across 42 decisions, and every one was a random continuation.
- After a refusal Forge gives the seat priority again in the same window. The random seat's
  options were the same as before, so it could pick the same play again, as often as its draws
  allowed. Most runs were 1–3 refusals long, the longest 19.
- One unit (d6-random-0, twice) ended in a Java heap OOM in `ComputerUtilMana.getAvailableManaSources`
  right after the two longest runs. The next unit in that JVM (d24-random-50) died with it.
- Forge's own AI avoids this: `AiController.getSpellAbilityToPlay` leaves out the plays Forge
  marked `skip` when their payment failed. The random seat lists its plays itself, so nothing
  stopped it. G3 covers only a no-op ability, never a refused play.
- The atlas also read G1 and G4 back from every random seat's decision records, but G3's count only
  from phase A's worker rows. No random branch reported one.

**Decision.**

1. **G5, no refused play twice in one priority window.**
   - Detection: `PolicyControllerAi.playChosenSpellAbility` hands the random seat's pick (never a land)
     to Forge as before. If Forge marked the play `skip` during that call (it was not marked before), the
     engine refused it. Forge sets the mark when the payment fails: `ComputerUtilMana`'s "Didn't find
     what to pay for" and `ComputerUtil.handlePlayingSpellAbility`'s failed costs.
   - The seat then counts the refusal (`refusedCast`) and remembers the play's option token with the
     **priority window** it was refused in: the turn, the phase, and the stack's size and top item
     (`Explorer.window`).
   - At each later priority decision in the same window, the refused tokens are removed from the options
     before the uniform pick. As with G3, a removal never takes away the last option, and each removal is
     counted (`noRepeatRefused`).
   - Any change to the turn, the phase or the stack starts a new window and forgets the set, so the play
     is offered again once something has happened.
   - G5 is mechanical, as D451 point 2 requires. It removes an answer the engine itself would not play
     here, which is the meaning of "can play and pay for now". It says nothing about which move is
     good.
   - Only the random seat changes (`ExploreMath.Config.random`). The Forge, search, D358-exploring and
     census seats take the old path unchanged: the wrapper returns before reading anything.
2. **Every random seat's guardrail counts are in its own log (protocol M71).**
   - The `decisions` summary of a log whose header says `epsilon` 1 carries `explore.guardrails`: `land`,
     `keep`, `noRepeatNoOp`, `refusedCast` and `noRepeatRefused`.
   - `tools/check-redaction.mjs` accepts that block only in such a log, only those names, and only
     non-negative integers.
   - `guardrailCheck` sums the counts over phase A's logs and the random branches' logs.
   - `atlas.json`'s `checks.guardrails` gains `noRepeatNoOp`, `refusedCast` and `noRepeatRefused`, zero
     when none fired, and the checks paragraph of `atlas.md` prints them. G3's count now covers the
     branches too.
   - `atlas-selftest` requires all three keys.
3. **This changes the random policy's support, so atlases before and after it are not comparable.**
   - With a taxed or otherwise unpayable spell in play, the random seat's next answers in that window
     are now uniform over fewer options. A random branch is therefore a different random game from the
     same seed, and its value is a value under a different continuation policy.
   - J148's random map (and every atlas run before this decision) is a map under the old policy. A later
     atlas is under the new one, even on the same pair, seed and baseline.
   - Compare the two only as two policies, never as a repeat. An atlas's plan names the mtg-table
     commit, and a job that pins a commit after this decision runs under G5.
   - The Forge map is unchanged. G5 touches no Forge-continuation seat.

**Rejected.**
- **Fix the "can play and pay for" test instead**, by asking Forge's auto-pay to plan the payment
  before listing the play. That would mean calling `ComputerUtilMana.payManaCost` in test mode for
  every candidate at every priority, which is expensive. It would still miss non-mana costs, and the
  engine's real answer is the payment itself.
- **Ban the play for the rest of the turn.** That outlasts the cause: after the stack resolves, or in a
  new step, the play may be payable, and a window is the unit Forge itself re-asks in.
- **Read Forge's `skip` mark in the option list** (leave out any play marked `skip`). That mark is
  Forge's own AI's bookkeeping. Forge clears and sets it inside its own chooser, which the random seat
  calls first for "Forge's answer", so whether a play is marked at the random seat's next pick would
  depend on that chooser's internals.
- **Count G5 from the worker's output only.** The atlas's checks read guardrails back from the logs
  (D451 point 6), and a branch's worker row carries no guardrail counts.
- **Call it G4.** That number is taken (above).

**Measured.**
- Engine-free:
  - `DecisionSelfTest` (in `bridge/build.sh`): after a refusal in a window, the refused cast is left
    out and the other options are kept; 200 random picks in that window never take it; the last option
    is never removed; the refusal is counted once and each removal is counted; another window offers
    the play again and forgets the set.
  - `web/test/cubelab-atlas.test.ts`: the counts are summed from the summaries, a pre-M71 log adds
    nothing, `writeAtlas` puts them in `atlas.json`'s checks from phase A's and the random branches'
    logs only, and `atlas.md` prints them.
  - `web/test/cubelab-record.test.ts`: a random seat's summary with the counts passes the checker; the
    same block in a D358 log, an unknown name and a non-integer count fail it.
- On the engine: see the PR. `atlas-selftest` is a two-decision smoke on pacho-shield vs doom-legion,
  which has no Spellbinder, so its G5 count says only that the path runs.

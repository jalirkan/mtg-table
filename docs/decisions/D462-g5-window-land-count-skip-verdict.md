## D462 — G5's priority window counts the seat's lands, and Forge's `skip` mark is read as the play's own verdict (amends D458)

*Branch `pc/review-followups-oct22-g5`. This lane reserved D461–D462. D461 is the JS follow-ups' PR.*

**2026-10-22**

**Context.** The cloud's review of #177 (D458) left these LOW findings:

- G5's window (the turn, the phase, the stack's size and top item; `Explorer.window`) survives a land
  drop. A cast refused for want of mana therefore stays banned after more mana arrives.
- The refusal test, `!skippedBefore && sa.isSkip()`, assumed Forge clears `skip` before the seat's
  next play, and nothing had checked that.
- `check-redaction.mjs` iterated `explore.guardrails` with `Object.entries(v ?? {})`, so a `null`, an
  `[]` or a `""` passed as "no counts".
- The atlas self-test cannot show G5 firing.

**What Forge does with `skip`.** I read the source checkout `~/code/forge-src` (`579d0a84c`) as prose
and confirmed it against the pinned 2.0.14 jar with `javap -c`:

- `AiController.getSpellAbilityToPlay` (`forge-ai/.../AiController.java:1513-1520`) is the only
  place that clears the mark. It clears it only for the plays in its `skipped` list. That list is
  rebuilt at `:1570-1572` from the plays marked at that moment, and those plays are left out of
  Forge's own choice.
- The payment's refusal sets the mark *after* the list was made. The places that set it are
  `ComputerUtilMana.java:812`, "Didn't find what to pay for", and `ComputerUtil.java:138` and
  `:142`. So a refused play stays marked through the next `getSpellAbilityToPlay`, which puts it in
  the list, and is cleared at the one after.
- A priority that Forge answers with a land drop returns before `getSpellAbilityToPlay` (`:1391`, against `:1397`).
- `ComputerUtil.protectRecursion` (`:3292-3305`) sets and clears the mark around AI checks.
- The jar's bytecode agrees: `AiController.getSpellAbilityToPlay` calls `setSkip(false)` at offset 38,
  in a loop over `skipped`.

So `skip` is **not** cleared on reuse. A play the random seat picks again at the very next priority
is still marked, and a second refusal of it went uncounted. Forge's own AI never plays a marked play.
The random seat can.

**Decision.**

1. **G5's window adds the seat's land count** (`Player.getLandsInPlay().size()`):
   `Explorer.window(game, seat)`, written by `windowKey(turn, phase, stackSize, top, lands)`. A land
   drop opens a new window, so the refused cast is offered again.
   - Rejected, the mana pool: a refused payment taps its sources and refunds what it spent into the
     pool (`ComputerUtilMana.payManaCost`'s `manapool.refundMana(manaSpentToPay)`, `:801`). The pool
     moves because of the refusal, so the window would never hold.
   - Rejected, untapped lands: they move for the same reason.
2. **The mark is this play's own verdict.**
   - `PolicyControllerAi.playChosenSpellAbility` takes a carried-over mark off before handing the
     random seat's pick to Forge.
   - Afterwards it reads `isSkip()` as "refused now".
   - On a play that went through, it puts the mark back, so Forge's bookkeeping is as it was.
   - The play itself now runs unmarked, as Forge's own picks always do.
   - Only the random seat takes this path. The other seats return before it.
3. **`explore.guardrails` must be a plain object** of counts, or the checker fails the log.
4. **The atlas self-test gets no G5 case.** Its decks, `pacho-shield` and `doom-legion`, hold no
   cost-raising card: a scan of every committed `decks/*.dck` for `RaiseCost` finds none. The committed
   decks that have one are `tools/ai-bench/decks/sets/*` (Elite Spellbinder, Thalia, Vryn Wingmare).
   Whether a two-rollout, two-decision atlas on one of them reaches a refusal depends on the draws.
   Spellbinder's tax needs its ETB to exile a card that the random seat then casts. Proving a seed
   would mean running units, which this lane did not do.
   - J150's pilot check instead: **on the repeat pair's spines (fair-fight-900000005), `refusedCast`
     ≥ 1 and `noRepeatRefused` ≥ 1 in `atlas.json`'s `checks.guardrails`.** In each worker log, the
     count of "Didn't find what to pay for" lines from random continuations should be at most about
     `refusedCast`. The refusals' longest run in one window must be 1, against J148's 19, and no
     worker may OOM in `getAvailableManaSources`.

**Comparability (D458 point 3).** Both changes move the random policy again, but only narrowly.
After a land drop, a refused play is in the options again. A repeat refusal at the next priority is
now counted and banned. A play that carried a stale mark now pays unmarked. An atlas after this
decision is a third policy, so compare it with D458's only as two policies.

**Measured.**
- `bridge/build.sh`: OK, including the lint and its self-test. `DecisionSelfTest`: 136 checks; the
  new one shows that a land drop with the same turn, phase and stack is another window and offers the
  refused cast again.
- `web/test/cubelab-record.test.ts`: 12/12. The new negative control (`null`, `[]` and `""`
  guardrails) passes under the old checker and fails under this one.
- No engine run: no atlas or units were run, because a census is running.

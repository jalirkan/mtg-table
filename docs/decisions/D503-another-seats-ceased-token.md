## D503 — The M55 audit accepts another seat's token that ceased to exist, named by last known information (amends D485's checker rule, and D347's audit as D481–D496 amended it)

*Branch `pc/d502-checker-shapes`, off main `ac07876b` (#226). Reserved for this lane with D502 and D504. Amends part 2 of
**D485** (the audit's "the viewer's own token that ceased to exist"; its "another seat's zone never") in
`tools/check-redaction.mjs`. The bridge is unchanged.*

**2026-11-02**

**Context.** Of J182's 11 failing branch logs (see **D502**), five failed on the M55 decision audit. All five are in
spine `b-s10-peasant-2510`, under `/home/justin-a/code/lab/data/lab-j182/b-s10-peasant-2510/phaseB/frames/`:
`d10-random-o0-b15`, `d10-random-o0-b53`, `d10-random-o0-b89`, `d12-random-o0-b5` and `d12-random-o1-b5` (each
`-seat0.jsonl.gz`). All five show the same message:

    decision 5 names card 103 (option:103), which its state frame does not show seat 0 -- a stub's id, a library card
    or another seat's hidden card is never an option (M55, D347)

The decision number is 4, 5 or 6, depending on the log. In `d10-random-o0-b15`:
- **Card 103 is a Goat Token.** Its owner and controller are player 1 (the opponent). Every state frame from the
  first (seq 2, line 3) to seq 5 lists it on player 1's battlefield with `token: true`.
- **Seat 0 activated Colossal Skyturtle.** Decision 2 (line 5) targets 103, and the `cast` text reads "Return Goat
  Token (103) to its owner's hand".
- **Then seat 0 cast Eye for an Eye** (card 4) in response.
- **Player 1 paid Woe Strider's cost.** In the state where Eye for an Eye goes on the stack (seq 6, line 12), player 1
  sacrificed 103 to Woe Strider's scry ability: `sacrificed` 103, then the zone event 103 `{battlefield, 1}` →
  `{graveyard, 1}`. A token in a graveyard ceases to exist, and no later state lists it.
- **Eye for an Eye asked for a source.** Its "choose a source" asked seat 0 at decision 6 (line 16, `kind: choice`,
  `source: entity`, `by: forge`, state seq 9). The options include `option:103`, a source of damage this turn, read
  by last known information. The Skyturtle fizzled at seq 10.

D485 already accepts exactly this shape for the viewer's **own** token, a stale target Forge's AI left on a play. It
states "exile, a library or another seat's zone never". Here the token was the opponent's.

**Why it is public.** A token on a battlefield is public whoever controls it. Every state frame showed this one to both
seats, name and all. A token in a graveyard or in a hand ceases to exist at the next check of state-based actions, so
nobody can hide it there. The id names an object that both seats saw last on a battlefield. Forge offers it because a
source of damage is chosen by last known information. Nothing about the opponent's hidden cards is in it.

**The rule before (D485 part 2).** An id that no state the decision can use lists was accepted when:
- it is the viewer's own token: born onto the viewer's battlefield in the window, or listed there by a state in the
  window (`token: true`, owner and controller the viewer); and
- its latest move (a `to: null` skipped) took it from the viewer's battlefield into the viewer's own graveyard or hand.

**The rule after.** D485's rule is unchanged and is tried first. After every older rule (D481, D485, D495, D496) has
declined an id, the id is also accepted when all of these hold:
1. **A state frame lists it as another seat's own token.** The state is in D481's window (from the first state up to
   and including the first state after the decision). It lists the id on a seat S's own battlefield as S's token:
   `token: true`, owner and controller both S, and S is not the viewer.
2. **Its latest move ended it on S's side.** Either:
   - its latest move (a `to: null` skipped) took it from `{battlefield, S}` into S's own graveyard or hand; or
   - its very last move is a `to: null` straight off `{battlefield, S}`.
3. **Neither the decision's state frame nor the state after it lists the id as a stub.** This guard is new. D485 had
   none, because the viewer's own hand is never a stub. It refuses a token that was bounced and is still in its owner's
   hidden hand.

A **birth alone** does not vouch for another seat's token. D481's control `m55-option-born-on-the-opponent-battlefield`
(a token born onto the opponent's battlefield and gone to their graveyard, never listed) stays a FAIL, because only a
state's listing showed the token to the viewer. The stats line counts such ids apart:
`M55 decision ids that ceased to exist, another seat's token=<n> (D503: ...)`. That count is never a WARN.

**D485's control flips.** `stale-token-of-the-opponent.jsonl` was a D485 FAIL control. It holds the opponent's token,
listed on its battlefield, dead in its own graveyard and named by a target list: exactly J182's shape. It is now a PASS
control, and it is named that way in the selftest's `REQUIRED`. Its file is byte-identical. Only its manifest entry and
the reason it gives changed.

**The authority.** The bridge's own gate at decision time is `Decisions.visible` (**D347**), which names a card in a
graveyard, on a battlefield, on the stack or in the command zone as it is now. The audit cannot see last known
information, and this rule does not claim to. It says only that the id names a public object the viewer was shown. That
is the same position D481, D485, D495 and D496 take.

**What is still rejected.**
- A nontoken card:
  - one listed nowhere afterwards (`token: false`, a ghost);
  - one the decision's state shows only as a stub.
  A nontoken card in a graveyard is listed there, so D3 vouches for it directly.
- A token never listed on a battlefield in the window, or listed only after the window.
- A latest move:
  - into exile, or into a library;
  - into another seat's hand;
  - from somewhere other than the token's battlefield (exiled, then to the graveyard);
  - to nowhere from exile.
- A token still listed as a stub in its owner's hand at the decision.
- The viewer's own token whose latest move went to the opponent's hand. That is D485's control, unchanged: this rule
  is only for a seat other than the viewer.

**Rejected alternatives.**
- **Any token, of any seat, in any zone.** A token can be exiled face down (D481's reason to refuse exile), and a
  library is hidden.
- **Accepting a birth onto another seat's battlefield, as D481 does for the viewer's own.** No J182 log needs it, and
  only a listing shows the viewer the token.
- **Reading the Skyturtle's `cast` text, which names "Goat Token (103)".** An engine string is evidence of nothing the
  checker can verify, and D3 never reads one.
- **Teaching the bridge to drop last-known-information sources from the option list.** Eye for an Eye may legally
  choose a source that has left the battlefield, and the decision record must hold Forge's real options.

**Tests.** These are new controls from `tools/make-negative-fixtures.mjs`, built on D485's helper (five state frames, the
token listed in the first, its move in the second, the decision at the fourth), all in `REQUIRED`.
- **PASS:**
  - `stale-token-of-the-opponent` (flipped);
  - `ceased-opponent-token-source-choice` (J182's `choice` / `entity` record);
  - `ceased-opponent-token-bounced-to-its-hand`;
  - `ceased-opponent-token-to-nowhere`.
  - Each must show the D503 count on its stats line.
- **FAIL:**
  - `ceased-opponent-nontoken-ghost`;
  - `ceased-opponent-nontoken-a-stub` (a stub in its graveyard at the decision);
  - `ceased-opponent-token-never-listed`;
  - `ceased-opponent-token-shown-only-after-the-window`;
  - `ceased-opponent-token-then-exiled`;
  - `ceased-opponent-token-into-a-library`;
  - `ceased-opponent-token-into-the-viewer-hand`;
  - `ceased-opponent-token-exiled-then-to-graveyard`;
  - `ceased-opponent-token-exiled-then-gone`;
  - `ceased-opponent-token-still-a-hand-stub`.

**Mutants.** Each mutant ran in a scratch copy against the whole selftest, and each of these failed it:
- the token flag ignored;
- the window bound removed;
- the destination seat ignored;
- the from-battlefield requirement removed;
- exile accepted;
- a library accepted;
- the `to: null` branch removed;
- the `to: null` branch taken from any zone;
- the stub guard removed;
- the rule off.

Two survive, and both guards are kept as defence in depth:
- **"S is not the viewer".** The viewer's own token is D485's, which runs first. A viewer's token that D485 refuses
  (its move into the opponent's hand) is refused here by the destination seat as well.
- **The listing's owner equal to its controller.** A token listed on S's battlefield and owned by another seat would
  have to die into its owner's graveyard, which is not S's.

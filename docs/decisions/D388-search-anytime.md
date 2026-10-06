## D388 — The search respects its budget: `anytime=1` keeps a cut round's rollouts, prunes candidates to the time left, races out the clearly worse, and decides on the paired evidence that exists

*Branch `c/search-week3`. Written as D352–D354 and renumbered on the branch
(D353–D355, then D354–D356) as main took those numbers; main's D354 is gate 2's
evaluator-at-the-leaves switch (`leaf=eval:<model.json>`), not this. D388–D390
are the first numbers free when the branch was merged with main (`node
tools/decisions.mjs next`), and its protocol amendment, written as M56, is M58
(main's M56 is `hello_ok.match.aiPolicy`, M57 play exploration). The engine
review's week-3 search upgrades, each behind a
`SearchConfig` switch that is off by default, so `search-v1` and
`search-v1-fixed3` are unchanged rollout for rollout and the ladder can SPRT
each one.*

**2026-10-03**

**Decision.** `SearchConfig` gains `anytime=1`. Under it, `SearchPolicy`'s
search loop (`searchAnytime`, scheduling in the pure `mtgtable.ai.Anytime`):

- **never throws work away**: a round the deadline cuts short keeps the
  rollouts it finished (a NaN for each one not played), and every statistic is
  per candidate over its own rounds, its paired difference to Forge's answer
  over the rounds both were scored in (`Report.fillStats`, NaN-aware; on
  complete rounds it is D350's arithmetic exactly);
- **plays what matters first**: round 0 plays Forge's answer, then the rest in
  the order they came (the prior's, D389); later rounds Forge's, then the rest
  best-first by their paired difference;
- **prunes to the budget**: before each later round, the measured time per
  rollout says how many candidates the time left can carry to `rounds` rounds,
  and the worst are pruned to fit (never Forge's answer, never below two);
- **races**: from 3 paired rounds, an alternative whose paired difference to
  the current leader is below zero by 2 standard errors is retired; the search
  stops when only Forge's answer is left (a verdict, not a fallback);
- **retires a candidate whose copies keep throwing** (its second error) instead
  of abandoning the search; only Forge's own answer erroring three times, or
  errors on every candidate, falls back (`rolloutErrors`);
- **decides on what exists**: the best is the alternative with the highest
  paired difference among those with `min(rounds, most)` paired rounds, and
  the override rule (D312's margin or D350's lcb) decides as always. Forge's
  answer is kept without a verdict (`fallback: budget`) only when no
  alternative was scored against it at all.

The `Report` says so: `anytime`, `pruned`, `retired`, per-candidate `n`;
counters `search.anytime.{pruned,retired,short,erroredOut}` (`short`: a
verdict on fewer rounds than `rounds`, where D312 would have fallen back).
Ladder player `search-v1-anytime` (search-v1 + `anytime=1`), SPRT against
`search-v1`: both wall clock on purpose, since the budget behaviour is what is
measured.

**Measured** (`docs/evidence/search-week3.md`): 12 games on three dev deck
pairs, the same deals, search at 1.5 s against Default+outlets, three JVMs on
the shared 4-core container. Budget fallbacks **18.5% → 0.9%** of searched
decisions (55 of 297 → 3 of 316), all fallbacks 19.5% → 4.4%; with the
erroring-candidate rule, **0 fallbacks of any kind in 302 searched decisions**
(five candidates retired on errors); 1,407 → 1,208 ms per searched decision. On 156 games of the larger dev set, D312's
loop fell back on budget in 11.7%; the review cites 26–37% (another machine
and load; a budget fallback rate is a property of the CPU as much as the search).

**Rejected.** Lowering `rounds` to 1 (it removes the fallback by making every
verdict a one-round one, not only the cut ones); a fixed larger budget (a
think the player waits for); D334's grader schedule as is (`mtgtable.grade`
depends on `mtgtable.ai`, not the other way, and its racing starts at 40
rounds); requiring `rounds` paired rounds before an override (it is D312's
fallback again, under another name). **Known risk**, left to the SPRT: under
the margin rule an override may rest on a single paired round when the budget
cut everything else (`search.anytime.short` counts them); `override=lcb` needs
3.

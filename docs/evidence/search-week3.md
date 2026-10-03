# The search's week-3 upgrades — measured (D353–D355)

*2026-10-03, branch `c/search-week3`, in a shared 4-core cloud container with
Forge 2.0.14 fetched from the tagged release (sha256 `3c0a7c38…8e5dd9`). Smoke
size only: the SPRTs (PC jobs, `tools/ai-ladder.sh sprt … --elo0 0 --elo1 20`
on the confirm set) are the test of strength.*

## 1. The smoke

`./tools/ai-bench.sh play --pairs <3 dev pairs> --a "Default+outlets+search:<cfg>"
--b Default+outlets --games 4 --jobs 3 --seed 5`: 12 games per config, the same
deals for every config, three JVMs at once. The three pairs are every 11th
line of `tools/ai-bench/pairs-dev.txt` (fair-fight 900000000, pauper
900000002, synergy 900000004). `<base>` is search-v1's
`ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0`.
Counters are the searching seat's (`aStats.counts`), summed.

| config | searched | budget fallback | other fallbacks | ms / decision | rollouts / decision | play + copy ms / rollout | A won |
|---|---|---|---|---|---|---|---|
| before: `<base>` | 297 | **55 (18.5%)** | 3 (rolloutErrors) | 1,407 | 16.3 | 73.2 + 8.0 | 6 of 12 |
| `<base>,anytime=1` | 316 | **3 (0.9%)** | 11 (rolloutErrors) | 1,189 | 11.1 | 91.0 + 8.6 | 8 of 12 |
| `<base>,anytime=1` after the erroring-candidate fix | 302 | **0** | **0** (5 candidates retired on errors) | 1,208 | 11.9 | 87.3 + 8.5 | 8 of 12 |
| `<base>,anytime=1,rank=prior,gen=24` | 324 | 3 (0.9%) | 6 | 1,217 | 10.3 | 96.6 + 8.8 | 8 of 12 |
| `<base>,rollout=outlets` | 306 | 46 (15.0%) | 8 | 1,387 | 16.0 | 73.9 + 7.8 | 8 of 12 |
| fixed 3 rounds: `ms=60000,rounds=3,maxrounds=3,seed=1` | 302 | 0 | 8 | 1,415 | 9.7 | **135.3** + 9.1 | 8 of 12 |
| fixed 3 rounds, `rollout=outlets` | 297 | 0 | 8 | 1,417 | 9.6 | **136.3** + 9.4 | 8 of 12 |

The win column is 12 games and means nothing; it is there to show nothing broke.

**The budget (D353).** D312's loop kept Forge's answer on 18.5% of searched
decisions because two complete rounds did not fit in 1.5 s. A larger, earlier
run of the same "before" config on the dev set (156 games, stopped early)
gave 11.7% (464 of 3,974): the rate depends on the load as much as on the
search. Under `anytime=1` the budget fallback is 0.9%: the three left are
decisions where not one alternative finished a rollout. 39 decisions were
decided on fewer than two paired rounds (`search.anytime.short`), 221
candidates were pruned to the budget and 212 raced out. Rounds per decision
fell (5.6 → 4.0) because the anytime search plays fewer candidates per round
once it has pruned and raced, and stops when only Forge's answer is left.

The first anytime run showed more rollout-error fallbacks (11 against 3): a
candidate whose copies throw every time was replayed every round until three
errors ended the search. Since that run a candidate is retired on its second
error and only Forge's own answer erroring (three times) or errors on every
candidate fall back; the row "after the fix" is that build.

**The prior (D354).** Ranking ran on 25 of 324 decisions (the others generated
`cands` or fewer candidates): 143 candidates scored, 100 cut, 393 ms per
ranking, 16 rankings stopped by their 30% share of the budget. The decisions
it ran on are the wide ones: attacks and blocks with many creatures, main
phases with many plays.

**Outlets in the rollouts (D355).** Per rollout, with exactly three rounds per
decision: 136.3 ms of play against 135.3 (+0.7%), within noise. The policy
costs nothing measurable; whether it values sacrifice lines better is the
SPRT's question (J025).

## 2. Checks

- `bridge/build.sh`: green; `DecisionSelfTest` 68 checks (44 before): the
  week-3 switches' parse, round trip and refusals, `fillStats` on complete and
  NaN rounds, the anytime order, racing, pruning and verdict on synthetic
  rounds, and M56's record keys.
- `./tools/ai-bench.sh --selftest`: 53 checks (42 before) — a ranked anytime
  attack search with `rollout=both` on a five-creature board (6 generated, 3
  kept, priors scored, 2 raced out, a verdict), and the anytime search at a
  60 ms budget.
- `node tools/check-redaction-selftest.mjs`: the M56 control passes, the M56
  probe (`generated` a string) fails as it must.
- An independent review of the diff (all switches off: rollout for rollout the
  old search; findings fixed: the prior's cut on a copy failure, pending
  triggers in `applied`, a fallback label, pruning ties, `gen` validation).

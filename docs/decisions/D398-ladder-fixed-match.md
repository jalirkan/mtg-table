## D398 — `ai-ladder.sh match`: a fixed-size paired match with an interval; `search-v1-reckless`

*Branch `c/ladder-match`.* Amends D318–D321 (the AI ladder) and D373 (what an SPRT result
says). The outside review (2026-10-06), its recommendations "Stop 2" (J089) and T5.

**2026-10-06**

**Context.** The ladder could measure two players against each other only with `sprt`, which
stops at Wald's bounds or at its game limit. The outside review estimated the gain from the
anytime search (D388) at about 10–13 Elo: under J089's elo1 of 20, so its SPRT would most
likely spend up to two nights to say H0, which says nothing about the size. What the owner
needs is the size, within an interval, at a cost known before the run. The same review's T5
asks how strong Forge's Reckless profile is against Default (D311: +10 points in 100 paired
games), alone and as the base under the search; the registry had no search player on Reckless.

**Decision.**

1. **`ai-ladder.sh match A B --games N [--out FILE]`** (`tools/ai-ladder/match.ts`, `cli.ts`).
   N games, rounded up to whole batches (`--batch-pairs` 2: 8 games), of A against B on the
   confirm set in mirrored deals, with no stopping rule. It reports:
   - A's score over the mirror pairs (sprt.ts's `pairScores`: a deal from both sides is one
     observation) with a 95% normal interval x̄ ± 1.96·s/√N on the pair scores, and the same in
     Elo, each end mapped through the ratings' logistic scale (not symmetric);
   - the games played, draws, engine errors and timeouts, and `complete` (false when the
     deadline or a signal stopped it; the interval is then over what was played);
   - each side's search counters, read from the batches' own ai-bench lines (`aStats.counts`,
     `bStats.counts`, which the results log does not keep): decisions searched, answers changed,
     fallbacks to Forge's answer by reason (`search.fallback.*`), and the budget-fallback rate
     with a 95% interval from a ratio estimator clustered by game.
   One line goes to `var/ai-ladder/match.jsonl` and, with `--out`, the same JSON to a file a
   job's `metrics:` can read. The experiment log gets its start and end lines as for `sprt`.
   The games are ladder games (purpose `match:<host>:<run>`), rated like any other.
2. **Seeds:** the host base + 900,000, then the matchup's next unused block (`nextBseed`), so two
   matches against a common opponent are played on the same deals.
3. **`search-v1-reckless`** in `players.json`: search-v1 with `profile: Reckless`, every other
   knob search-v1's, wall clock at 1.5 s like the live seat. The kind always had the parameter.
   The seat's own answers are Reckless's, and so is its side of every rollout: Forge's
   `GameCopier.clonePlayer` keeps a `LobbyPlayerAi` as it is, and `AiProfileUtil.getAIProp`
   reads the profile from the lobby player (javap on the pinned 2.0.14 jar).

**What a match result means.** An interval, not a verdict: the tool prints no H0/H1. A job's
`rule:` says beforehand how the interval is read (for example "adopt when the lower end is
above 0"). An interval that includes 0 is "not shown", never "no effect".

**Rejected.** *`sprt --elo1 1000 --max-games N`* as a fixed-size run: the SPRT would still stop
at its lower bound, and its line has no interval. *Keeping the search counters in the results
log*: it would add per-game fields to every ladder line for one command's use; the batch files
already hold them. *A bootstrap interval*: with hundreds of pairs the normal interval on the
pair means is the same to the reported precision, and it is deterministic.

**Evidence.** `web/test/ai-ladder.test.ts`: the interval and its Elo ends by hand on 200 pairs;
coverage on 400 synthetic matches of 300 mirrored pairs with a deal effect, inside [0.92, 0.98];
the counters and the clustered rate by hand on three ai-bench lines and a torn one; a seat that
never searched is not counted; `search-v1-reckless` is search-v1's config with `Reckless+` and
nothing else. Planning (`pairsForHalfWidth`): at a pair-score SD of 0.35, ±20 Elo needs about
570 pairs (1,140 games).

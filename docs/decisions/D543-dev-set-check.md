## D543 — J215's pair on the dev deck set: `search-v3-declined-instant` against the live seat once more, one fixed 4,800-game match on the 30 deck pairs no search number has been read on, and a pooled read with J215, both registered before any game; the reading fixes what the PC session recommends to the owner and moves no seat (J216)

*Branch `pc/d543-dev-set`, off main `1eaa00d30` (D541's merge, J215's pin). Reads J215 (`results/J215/` on
`pc-results`: `report.md`, `verdict.json`, `match-J215.json`, `summary.md`; and the match's own result rows in the
lab checkout's `var/j215-ladder/results/j215.jsonl`, read-only). No player, config, hash, script or test changes:
the match plays D541's two players at D541's hashes with `--pairs tools/ai-bench/pairs-dev.txt`, and the job's
pilot checks that nothing under `bridge/src`, `tools/ai-ladder` or `tools/ai-bench` differs from J215's pin. This
file, PLAN's rows and, in the same lane, D542's closing text are the whole change.*

**Status: registered; text only; the job's pilot dry-run at this lane's head is in *Verification*; unplayed. J216
plays it.**

**2026-11-12**

**Context.**

- **J215 read D541's pair: SMALL GAIN, a measured gain** (2026-11-12 12:34 to 21:09, mtg-table `1eaa00d3`, alone,
  7 workers, 8.45 h). `search-v3-declined-instant` (`af6771947a25`) against `search-v2-no-b` (`59505e241363`, the
  live seat), 4,800 games on the confirm set, blocks 519,900,000–519,900,599, 0 draws, 0 errors, 0 timeouts, every
  completeness part of D541 point 3 held: 2,448 wins, score 0.510 [0.502, 0.518], **+6.9 Elo [+1.4, +12.5]**. Of
  the 2,400 mirrored pairs A won both games in 218, lost both in 170 and split 2,012; the pair scores' standard
  deviation is 0.2008 and the score's standard error 0.0040995 (the match line rounds it to 0.0041), about 2.85 Elo.
  Both keys fired far above D540's floor (declined 3.46 windows a game, instant 1.80); the cost was 21.89 against
  19.17 search seconds a game (×1.14), more decisions searched rather than slower ones (909 against 905 ms a searched
  decision). Under D541 point 6 this names the pair a live-seat candidate for the owner; the owner has been asked and
  has not answered, and nothing has moved. D541's own *Status* is left as it was written: a read is recorded in the
  next decision and in PLAN (as D541 recorded J214's read of D540), not in the older file.
- **Every search number since D398 has been read on one deck set.** The confirm set (`tools/ai-bench/pairs-confirm.txt`)
  is 30 deck pairs drafted by D318 from six cubes (fair-fight, modern-era, pauper, peasant, synergy, vintage; five
  drafts each); every ladder match of the search family since D398 — more than fifteen of them — was played on it, and each night's next arm was chosen from the last night's points on it. The deals were new every
  time; the decks never were. A choice made from many readings of one set can fit that set's 30 pairs, and a
  pre-registered match on the same 30 pairs cannot see it: new deals answer the noise in the deals, not the
  selection on the decks.
- **Positive points have shrunk before.** Three earlier positive 1,200-game points came back at about +2 to +3 when
  4,800 games read them again (D542's hypothesis: targets, the evaluator leaf, routlets; D519 point 8 for routlets,
  +6.9 at 1,200 to +2.9 at 4,800). Those were 1,200 → 4,800 on the same deck set; J215 is already a 4,800-game
  match, so its interval is its own. What it cannot rule out is the deck set.
- **The dev set is the holdout we have.** `tools/ai-bench/pairs-dev.txt` holds the other 30 drafts of the same six
  cubes (dealt alternately to dev and confirm by D318; no deck file is in both), and no game with `declined=1` or
  `instant=1` has ever been played on it (point 3). Playing the same pair on it, once, at J215's size, says whether
  the gain travels to 30 deck pairs nobody looked at.

**Decision.**

1. **The match: J215's, on the dev set.** One fixed 4,800-game match (D398: 2,400 mirrored pairs, 600 batches of 8,
   no stopping rule), alone (D521), at `--game-timeout 900`, `--pairs tools/ai-bench/pairs-dev.txt`:
   - A = `search-v3-declined-instant` (`af6771947a25`):
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`;
   - B = `search-v2-no-b` (`59505e241363`, search-v3, the live seat since D539):
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`.

   The same players at the same hashes, the same code (the pin's `bridge/src`, `tools/ai-ladder` and `tools/ai-bench`
   are byte-identical to `1eaa00d30`'s, which the pilot checks as an empty diff), the same match size, timeout and
   stop (`--hours 13.5`); only the deck set and the deals differ.
2. **The deals: `--host j216`**, in a ladder folder of its own, `var/j216-ladder`, emptied by its step.
   `hostBase('j216')` is 622,000,000 (read from `tools/ai-ladder/schedule.ts`), so an emptied folder's 600 match
   blocks are **622,900,000–622,900,599**, on a first run and on a retry. Of the 355,429 ladder result rows under the
   lab checkout's `var/` (the three other lab checkouts' `var/` are links to it), read 2026-11-12 at 22:00, none is
   on base 622; no job file under `pc-jobs/jobs/` names `--host j216` or a block on that base, and no result under
   `pc-results/results/` names `j216`. One unposted draft did: D542's J216 (`drafts/J216-deepen.md`, renamed
   `drafts/not-played-D542-deepen.md` in this lane), which named host `j216` and these same blocks for a match that
   was never played (D542 point 11 chose no player; its dry-run pilot ran `j216-pilot` games in a throwaway overlay
   under `/tmp`, which wrote no row to any checkout). So the blocks are unplayed, and `j216` keeps the job-id-as-host
   convention every match since J194 has used; a new name such as `j216-dev` (base 464,000,000) would buy nothing and
   break it. The pilot host is `j216-pilot`, base 594,000,000; its only rows anywhere are D542's dry-run's, in that
   overlay. With 30 pairs and 2 pairs a batch, 600 consecutive blocks give each of the dev set's 30 deck pairs exactly
   40 batches, 160 games, in both seat orders (`batchPairs`), as on the confirm set.
3. **What the rows carry, and what has been played on the dev set.**
   - Every result row and the match line carry `set: "tools/ai-bench/pairs-dev.txt"` (`Session.set`, the pairs file
     as the records name it). `ai-ladder.sh ratings` and `report` rate the confirm set alone unless given `--set all`
     (or the dev set by name; `Session.rated` filters on `r.set`), so these games would stay out of the ratings even
     in the lab's main ladder; in their own folder they are out of it twice. The experiment line's purpose is `dev`
     (`purposeOf`), the rows' `purpose` the match's own `match:j216:<run>`.
   - **No game with `declined=1`, `instant=1` or `lands=1` has been played on the dev set.** A scan of every ladder
     result row and every ai-bench shard line under the lab checkout's `var/`, this repository's main checkout and
     every `mtg-table-*` worktree's `var/`, and the kept dry-run overlays under `/tmp`, read 2026-11-12, found 8,456
     lines with one of the keys in a seat config, every one on the confirm set: J214's three arms (1,200 games each)
     and their pilots (4 ladder and 4 recorded games each, the confirm set's first pair, `fair-fight-900000001`),
     J215's 4,800 games and its pilot (the same pair), and D540's lane's own pilot copies. The ai-bench self-test's
     D540 scenarios are built boards, not decks of either set.
   - **No parameter of either player was tuned with these keys on.** The two seats share every parameter of
     search-v3 (`ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1`), each set
     before D540 wrote the keys (2026-11-11); the keys have no parameter of their own; and `tune`, the only command
     that plays the dev set by design, has never run a config with them (the scan above). What the dev set did see
     is older tuning of the parameters both players share (*What is unverified*).
4. **Readings, completeness and NOT READ: D541's, for this match alone.** The match is complete when D541 point 3
   holds with this match's names: its line names A and B in that order at their hashes, says `complete: true`,
   played all 4,800 games with engine errors plus timeouts at most 240, and carries `score`, `lo`, `elo`, `eloLo`
   and `eloHi`; **its line's `set` is `tools/ai-bench/pairs-dev.txt` and every one of its result rows says so**; it
   was played on exactly the 600 blocks 622,900,000–622,900,599 with no other match's game in its folder; every
   batch line carried the two seat configs exactly; both sides searched priority and attacks and neither a block;
   B's batch counters show no `search.p.declined.`, `search.p.instant.` or `search.p.lands.` counter above 0 and A's
   no `search.p.lands.` counter above 0; **and its mirrored pairs, rebuilt from the result rows with the ladder's own
   `pairScores`, `blockKey` and `matchSummary`, reproduce the line's `pairs`, `score`, `lo` and `hi`** (the pooled
   line in point 5 is computed from them). An incomplete match gets no reading and is reposted alone under a new job
   id after its cause is found. **NOT READ**: complete in every other part, but `search.p.declined.windows` or
   `search.p.instant.windows` on A's side, summed over the match, under 0.25 a game (`windows × 4 < played`). Else
   exactly one of D519's four readings at 4,800 for J216 alone, compared as the line carries them (`lo` in integer
   ten-thousandths, Elo in integer tenths): **SHOWN** `lo` > 0.5 and `elo` ≥ +15; **SMALL GAIN** `lo` > 0.5 and
   `elo` < +15; **INCONCLUSIVE AT 4,800** `lo` ≤ 0.5 and `eloHi` ≥ +15; **NOT SHOWN** `lo` ≤ 0.5 and `eloHi` < +15.
   Beside it, deciding nothing: indistinguishable, a measured loss (`eloHi` < 0), a measured gain (`eloLo` > 0).
5. **A second registered line: the pooled read of J215 and J216**, 9,600 games of the same two hashes on two
   disjoint deck sets and disjoint blocks (519,900,000–519,900,599 and 622,900,000–622,900,599). **Why pooling is
   fair here, when D541 point 8 kept J214 out of J215:** J214's arms were other players, and their points chose
   J215's pair; J215 and J216 are two runs of one registered pair under one code version, both matches fixed in size
   before any of their games, and neither's result chooses whether or how the other is played (J216 is registered
   whatever J215 read, and this line is written before any J216 game). The condition that makes it one pair under
   one code: the pin's `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` are byte-identical to J215's pin
   `1eaa00d30` (the pilot's `git diff` over those paths is empty, `tools/ai-ladder/players.json` included).
   **How it is computed.** `match` gets its interval from the mirrored pairs (`matchSummary` over `pairScores`): the
   score is the mean of the pair scores (A's share of a pair's decisive games), `se` = s/√N with s their sample
   standard deviation, `lo`/`hi` = score ∓ 1.96·se, and the Elo ends are `eloOf(lo)`, `eloOf(hi)`. The collected J215
   result does not carry pair-level outcomes, and J215's rows live in the lab checkout's `var/`, which a job
   should not read, so the pooled line is formed from the two matches' pair counts, scores and standard errors — the
   stratified mean of the two sets of pairs, which is what the ladder's own interval over all 4,800 pairs would be
   but for the between-set spread in s:
   - score_p = (n₁·m₁ + n₂·m₂) / (n₁ + n₂); se_p = √(n₁²·se₁² + n₂²·se₂²) / (n₁ + n₂); lo_p, hi_p = score_p ∓
     1.96·se_p; Elo through `eloOf`, to tenths as the line carries them;
   - J215's side as literals in the job, from J215's result (`pc-results/results/J215/match-J215.json`: 2,400 pairs,
     score 0.51, se 0.0041, lo 0.502, hi 0.518) with the standard error to seven places, **0.0040995**, rebuilt by
     the ladder's own `pairScores` and `matchSummary` from J215's 4,800 result rows (the lab checkout's
     `var/j215-ladder/results/j215.jsonl`, read 2026-11-12; it reproduces the line's score, lo and hi exactly);
   - J216's side from its own rows (point 4's rebuilt pairs, not the line's rounded `se`).
   Compared like a line: `lo_p` in integer ten-thousandths. The pooled line is read only for a complete J216.
6. **What it decides, written before any game.** This decision moves no seat: `SearchConfig.LIVE_DEFAULTS` stays
   `what=pa,anytime=1` whatever J216 reads, and adoption is the owner's, under a separate decision and seat-queue row
   10 (D509). What J216 fixes is **the PC session's recommendation** on that row:
   - **STANDS** — the recommendation to adopt `search-v3-declined-instant` goes to the owner as written after J215 —
     when J216 alone reads SHOWN or SMALL GAIN, or when the pooled `lo_p` is above 0.5 and J216 is not a measured
     loss.
   - **WITHDRAWN** — the PC session recommends not adopting it on this evidence and says why — when J216 is a
     measured loss (`eloHi` < 0, so `hi` < 0.5), or the pooled `lo_p` is at most 0.5.
   - For a complete J216 exactly one of the two holds (a SMALL GAIN or SHOWN J216 with J215's SMALL GAIN always gives
     `lo_p` > 0.5, since se₁ + se₂ ≥ √(se₁² + se₂²)). **A J216 that gives no reading** (NOT PLAYED, NOT READ or
     INCOMPLETE) neither confirms nor withdraws it: the recommendation is reported **OPEN**, with J215 alone and the
     cause beside it; an INCOMPLETE match is owed a repost under a new job id after its cause is found, and a NOT READ
     one (the keys too rare on the dev decks to read) is not played again without a new decision.
   - **The next candidate-side lane** (a change to what the search considers or values, measured against a base)
     is built on `search-v3-declined-instant` when the recommendation STANDS — whether or not the owner has adopted
     it yet, so that the lane measures against the seat it may become — and on the live seat `search-v2-no-b` when it
     is WITHDRAWN; while it is OPEN, on the live seat.
7. **The hypothesis, registered as information before any game (no check reads it).** Take J215's standard error
   for J216 too (se₂ = 0.0041, a half-width of ±5.6 Elo near 50%; the dev set's pair spread is unmeasured, and at
   J211's 0.0039 the numbers move by a point or two, given after the table). J216 alone reads SHOWN or SMALL GAIN
   when its score exceeds 0.5 + 1.96 × 0.0041 = 0.50804 (+5.6 Elo), SHOWN from 0.52157 (+15). The pooled line has
   se_p = √(0.0040995² + 0.0041²)/2 = 0.0028990, a half-width of 0.00568 in score, **±3.95 Elo** (±3.85 at se₂
   0.0039). Given J215's observed 0.51, `lo_p` > 0.5 exactly when J216's score exceeds 1 + 2 × 1.96 × 0.0028990 −
   0.51 = **0.50136 (+0.95 Elo)**, and J216 is a measured loss only below 0.49196 (−5.6 Elo), which that already
   excludes; so **STANDS is J216's point above about +1 Elo**. By the normal approximation of J216's score:

   | true effect on the dev set | J216 SHOWN | J216 SMALL GAIN | together | J216 NOT SHOWN | STANDS | WITHDRAWN |
   |---|---|---|---|---|---|---|
   | 0 | 0.0% | 2.5% | 2.5% | 97.5% | 37.0% | 63.0% |
   | +2.5 Elo (where earlier gains shrank to) | 0.0% | 14.0% | 14.0% | 86.0% | 70.7% | 29.3% |
   | +5 Elo | 0.0% | 41.9% | 41.9% | 58.1% | 92.3% | 7.7% |
   | +6.9 Elo (J215's point as the truth) | 0.2% | 67.6% | 67.8% | 32.2% | 98.2% | 1.8% |
   | +10 Elo | 4.0% | 89.9% | 93.9% | 6.1% | 99.9% | 0.1% |

   (At se₂ 0.0039: a true +6.9 reads SHOWN or SMALL GAIN 72.1%, a true +2.5 15.0%, a null 2.5%; STANDS 98.8%, 74.0%
   and 39.0%.) The arithmetic, for one row: a true +6.9 Elo is a score of 1/(1 + 10^(−6.9/400)) = 0.50993; J216's
   SMALL GAIN bar 0.50804 is (0.50804 − 0.50993)/0.0041 = −0.46 standard errors from it, so P = Φ(0.46) = 67.8%; the
   STANDS bar 0.50136 is −2.09 standard errors away, P = Φ(2.09) = 98.2%. **What the table says plainly:** J216 alone
   is a fair test of the gain on new decks (a null reads SMALL GAIN 2.5% of the time, and a true +6.9 does two times
   in three); the pooled line is a weak one, because J215 already sits at +6.9 inside it — a dev-set effect of 0
   still leaves the recommendation standing 37% of the time, and one of +2.5 71%. So the summary of J216 reports
   which branch carried STANDS, and a STANDS carried by the pooled line alone, with J216 NOT SHOWN, is worded as
   what it is: the gain did not show on the dev set by itself, and the two sets together still put its lower end
   above 0. Before either match the pooled line would have been the stronger test (at a true 0 it clears 0.5 2.5% of
   the time, at +2.5 23.6%, at +6.9 92.8%); after J215 it is not, and this decision registers it anyway because the
   owner's question is "is the effect above 0 on all the evidence", which it answers, and J216 alone answers "does it
   travel".
8. **Time.** J215 took 8.45 h for the same pair at 7 workers (D541 point 11's fit had put it at 9.0 h); the dev
   decks' game lengths are unmeasured for this pair, so about 8.5 h (range 8–10.5 h), about 10.5 h if memory pressure
   holds the night at 6 workers. The pilot about 10 minutes. The match stops itself at `--hours 13.5` and the step's
   timeout is 14 h; a match that reaches its own stop is `complete: false` and gets no reading.
9. **The pilot, before the match** (J215's, on the dev set): the build with the decision self-test at 0 failures and
   472 checks (no bridge source changed since D540's merge); the ai-bench self-test (its D540 lines kept); the ladder
   test; the five players at their hashes and seat configs; the empty diff of point 5; `hostBase('j216')` 622,000,000
   and the pilot host's another base; the job's readers tested on synthetic files (the verdict's cases include the
   pooled line and each recommendation on both sides of its bars); a 4-game ladder match against `search-v2-no-b`
   under `--host j216-pilot --pairs tools/ai-bench/pairs-dev.txt` and a 4-game recorded run against Forge Default on
   the dev set's first pair (`fair-fight-900000000`). **The match is played only if** both keys' windows summed over
   those 8 games are above 0, none ended in an engine error or a timeout, and the two keys' retries together are at
   most 2 a game; otherwise NOT PLAYED with the condition it failed (D541 point 10's gate, on the dev decks).

**Under D509: the atlas's seat and the live seat are unchanged.** No file under `bridge/src`, `tools/ai-bench` or
`tools/ai-ladder` changes; nothing the atlas's seat or `SearchConfig.LIVE_DEFAULTS` reads moves.

**Hidden information and threads.** Nothing new: the players are D541's, whose argument is D540's.

**Rejected.**

- **A fresh deck set drafted now**, as a third set never used for anything. It is the cleaner holdout — new drafts
  from the cube lab, a decision of their own, a deck check and a set file — and is worth building as a standing
  holdout that only confirmations play; it is a lane of its own and cannot be ready tonight, while the dev set exists,
  is drafted the same way and has never seen either key.
- **Replaying the confirm set on new blocks.** It answers the noise in the deals, which J215's interval already
  carries, and not the selection on the 30 decks every recent night has read.
- **2,400 games.** A half-width of about ±7.9 Elo cannot tell +5 from 0, and a SMALL GAIN at J215's point would need
  the dev effect to be larger than the confirm one.
- **Waiting for the next lane instead.** The machine is idle tonight, D542's match is not played (its pilot chose no
  player), and the adoption question is open now; a dev-set read is the one thing that changes what the owner is
  told.
- **Pooling without a J216 reading of its own**, or reading only the pooled line. J215's +6.9 dominates a two-match
  pool (point 7); J216 alone is the test that the gain travels, and the summary leads with it.
- **Reading J216 against J215** (a difference of the two points). Two sets of different decks differ in more than
  this pair's effect; the question is whether each, and both together, are above 0.

**What is unverified.**

- **Out of sample in decks and deals, not in card pool.** The dev set is drafted from the same six cubes as the
  confirm set; an effect that depends on the cubes' card pools travels to it by construction.
- **The dev set has been used before**, for the older tuning of parameters both players share (D318's purpose: tune
  and explore there); neither key, nor any parameter of them, was tuned on it (point 3).
- **One opponent**: the live seat, as every search number since D398.
- **The dev set's pair spread and game lengths for this pair**: unmeasured; the hypothesis assumes J215's standard
  error and the time J215's.
- **That the keys fire on the dev decks as on the confirm decks**: the pilot's gate needs only one window of each
  in 8 games of one pair; the match's NOT READ rule needs 0.25 a game.
- **The pooled line's form**: the stratified mean and standard error, not the ladder's one `matchSummary` over 4,800
  pairs; the two differ only by the between-set spread in the pair scores' standard deviation (with equal pair
  counts the means are identical), which is small against s ≈ 0.2 and not computed.
- **That `hostBase('j216')`'s blocks are unplayed everywhere**: read from the lab checkout, this repository's
  checkouts and the job files on 2026-11-12; the job's block reader checks the match's own folder only.

**Verification (the lane, 2026-11-12, at `1eaa00d30` with this lane on top):**

- `node tools/decisions.mjs check` OK (456 decisions, next D544); `node --test web/test/claude-md.test.ts` 5 of 5;
  `node --test web/test/ai-ladder.test.ts` 56 of 56 (no player added or changed); `./tools/public-check.sh` OK.
- `./tools/runner.sh check` on the draft (`pc-jobs` `drafts/J216-dev-set.md`, its `repos:` sha a placeholder of 40
  zeros for the merge commit): `lint: clean`, `machine-checked`; the pilot 7 blocks and 52 checks, the commands 2
  blocks and 30 checks.
- **J216's pilot, dry-run at this lane's head `61d14700c`** (a scratch copy of the draft pinned to it; `./tools/runner.sh
  dry-run --root <this worktree> --pilot-only --max-seconds 7200 --workers 6`, sandboxed, run twice, the second with
  `--keep` to read its files): every block exit 0 (the build and the self-tests 39 s; the 4-game ladder match 163 s
  and 189 s; the 4-game recorded run 61 s and 69 s); **51 of the 52 pilot checks pass both times**, the one that
  fails being `merged == 1` (the lane is not on `origin/main`). The build: the lint's self-test 33 rules, 79 firing
  cases, the lint 97 files under `bridge/src` and 4 under `tools/`, **decision self-test 472 checks, 0 failures**;
  the ai-bench self-test 352 checks, 0 failures; the five players at their hashes; the code against `1eaa00d30`
  under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` an empty diff; `hostBase('j216')` 622,000,000, the
  pilot host 594,000,000, the dev set 30 pairs at exactly 40 batches each over the 600 blocks; the verdict's
  self-test 59 of 59 cases, the pairs reader's 6 of 6, the exposure reader's 5 of 5, the recording reader's 13 of
  13, the block, rollout and gate readers' each ok. In the 4 ladder games on the dev set (pair `fair-fight-900000000`,
  the match line's set `tools/ai-bench/pairs-dev.txt`): both sides searched priority and attacks and no block, B's
  D540 counters and A's lands counters all 0, the pairs reader rebuilt the line's 2 pairs from its 4 rows (`agree`
  1). **The gate passed** (`play` 1): over the 8 games `search.p.declined.windows` 17 (4 ladder, 13 recorded) and
  `search.p.instant.windows` 12 (8 and 4), no error or timeout, no retry. In the recorded games the searched priority
  decisions were 67 in the seat's own main phase, 4 in an empty-stack instant-speed window (all with 2 candidates)
  and 0 in a land window, none on a stack. A searched 23.0 s a game against B's 21.3 over the 4 ladder games (×1.08;
  J215's match ran ×1.14).
- Not run on the lane: the full gate (the coordinator's, at the merge).

**Follow-up.** J216 plays the match at this lane's merge; its `report.md` carries J216's reading, the pooled line
and the recommendation, and `summary.md` (the PC session) words them, J216 alone first. Its row in PLAN is the cube
lab's 59; D543 closes the cube lab's 58 with J215's read.

## D547 — cheaper depth: J218's deeper horizon for less thinking, two new players on `search-v3-declined-instant`, the attack horizon alone at the pair's clock on the dev deck set (J219) and D545's `t1-x3` at twice the clock instead of three times on the confirm deck set (J220), each played once against the pair in its own fixed 4,800-game match under D519's four readings written for it

*Branch `pc/d547-cheaper-depth`, off main `2a13482a9` (D546's merge, after D545's and D544's). Reads J218 (D545;
`results/J218/` on `pc-results`: `summary.md`, `report.md`, `verdict.json`, `rollouts.json`, `match-J218.json`, and
the `j218-ladder` match's own result rows in the lab checkout's `var/`, read-only), J212 (D537; `results/J212/`:
`rollouts-a1.json`, `match-J212-a1.json`) and J215 and J216 (`results/J215/`, `results/J216/`). Two new ladder
players and their decision: `tools/ai-ladder/players.json` (two players appended), the ladder test, the ladder guide's
line, PLAN's rows and this file. No file under `bridge/src`, `tools/ai-bench` or `tools/ai-ladder/*.ts` changes, every
registered player's hash is unchanged, the live seat does not move, and the two hashes were computed by the ladder's
own `resolvePlayer` and `configHash` (`node tools/ai-ladder/cli.ts cfg`, and `list`, whose output is main's with these
two lines added). `node tools/decisions.mjs next` printed D547 on this lane. Written while lab job J217 held the
machine alone; built, self-tested and piloted on the lane after J217 ended (*Verification*).*

**Status: registered; built, self-tested and both pilots dry-run on the lane (*Verification*);
unplayed. J219 and J220 play it, one after the other, each alone.**

**2026-11-14**

**Context.**

- **J218 read SHOWN** (D545, 2026-11-13 10:09 to 2026-11-14 05:00, 4,800 games on the dev set, blocks
  655,900,000–655,900,599, 0 draws, 0 errors, 0 timeouts, every completeness part held):
  `search-v3-declined-instant-t1-x3` (`9aeacaff9142`: the pair with `turns=1` and `ms=4500`, attacks following
  `turns`) won 2,510 of 4,800 against `search-v3-declined-instant` (`af6771947a25`, the live seat as search-v4 since
  D546): score 0.5229 [0.5136, 0.5323], **+15.9 Elo [+9.4, +22.5]**, a measured gain, on D519's +15 line rather than
  clear of it (2,503 wins would have read SMALL GAIN). It is a live-seat candidate for the owner under D545 point 5.
- **It costs three times the thinking.** On the same games:

  | | A (`t1-x3`) | B (the pair) | ratio |
  |---|---|---|---|
  | search seconds a game | 70.4 | 22.3 | ×3.15 |
  | ms a searched decision | 2,800 | 900 | ×3.11 |
  | rollouts a decision | 18.47 | 15.81 | ×1.17 |
  | decisions short of two rounds | 2.43% | 3.08% | |
  | ms of play a finished rollout | 140.4 | 49.4 | ×2.84 |
  | budget fallbacks | 0.91% | 0.69% | |

  At the table a searched decision waits 2.8 s instead of 0.9 s. In the lab the live seat is every later match's
  baseline, and J218 took 18.7 h against J216's 8.6 h for the same 4,800 games. Adopting `t1-x3` as it stands would
  roughly double every night that plays against the live seat. The PC session's read of J218 recommended not
  adopting it at 4.5 s until two cheaper arms have been played, and named them.
- **What J218 does not separate** (D545 point 6): the priority rollouts' depth from the attacks', and the depth from
  the clock. On the clock there is outside evidence: more clock at the old horizon bought nothing (×0.25 to ×4
  against search-v2, −14.5 to +1.7 Elo, J194, J195, J198), so J218's gain is the horizon, and the clock is what the
  horizon needed to be fed: J212's `t1` at 1.5 s starved (11.8% of its decisions short of two rounds) and read −1.7.
  On the split there is only description: A changed Forge's answer in 21.1% of its searched priority decisions
  against B's 19.4%, and in 16.2% of its attacks against B's 16.6%; a change rate is not a value, and no reading is
  drawn from it.
- **The attack arm's only evidence is J212's**, on the old base: `search-v2-a1` (`3cf65e94df28`, search-v1-anytime
  with `aturns=1`, `what=pab`), 1,200 games on the confirm set against `search-v1-anytime`, +5.2 Elo [−5.7, +16.2],
  INCONCLUSIVE AT 1,200, at 24.3 against 21.5 search seconds a game (×1.13), 61.3 against 51.2 ms of play a rollout
  (×1.197) with attacks 22.6% of its searched decisions, and **7.73% of its decisions short of two rounds against
  3.44%** (14.39 against 15.53 rollouts a decision): at the 1.5 s clock the deeper attack rollouts get fewer rounds.
  No game of an attacks-only horizon has been played on the pair or on the dev set.
- **The code moved after J218's pin.** J218 played `23854dde0`'s `bridge/src`. D544 (six `bridge/src` files: the
  stack carry and three keys, off by default, "with the keys off no engine call is added or removed", its point 15
  and D509 argument) and D546 (the live seat's version and defaults, read only by `parseLive`, which no ladder seat
  goes through) merged after it. B's seat config is J218's B's, byte for byte, and the argument is that it plays as
  it did; but these matches are another code version from J218's, which is one more reason they are never pooled with
  it (D341).
- **The two deck sets.** J218 read the deeper horizon on the dev set (`tools/ai-bench/pairs-dev.txt`), where the
  pair had been read once before (J216). The confirm set (`tools/ai-bench/pairs-confirm.txt`, the ladder's default)
  has seen J212's three depth arms on the old base, at 1,200 games each, and the pair in J215 and in J217 (running as
  this is written, D544's union against the pair), and no deeper horizon on the pair.
- **The deals.** `hostBase` (FNV-1a, `tools/ai-ladder/schedule.ts`, computed on the lane beside `j215` → 519,000,000,
  `j216` → 622,000,000, `j217` → 725,000,000 and `j218` → 655,000,000, as their jobs registered them): `j219` →
  758,000,000, `j219-pilot` → 636,000,000, `j220` → 302,000,000, `j220-pilot` → 500,000,000. Of the 365,056 ladder
  result rows under the lab checkout's `var/` (310 result files, read 2026-11-14; the rows lie on 34 bases) and the
  343 under this machine's `mtg-table*` checkouts' `var/` (31 files), none is on base 758, 636, 302 or 500; no job
  file in `pc-jobs/jobs/` or `drafts/` names `j219`, `j220` or a block on those bases.

**Decision.**

1. **The players.** Both are new players, built on `search-v3-declined-instant` (`af6771947a25`); their hashes were
   computed by the ladder's own `resolvePlayer` and `configHash` on the lane and are held by `web/test/ai-ladder.test.ts`.
   - **`search-v3-declined-instant-a1`, config hash `dbf415e66452`**: the pair's params with `"aturns": 1` and
     nothing else different (`turns` stays 0, `budgetMs` 1500). Its seat config is the pair's with `aturns=1`:
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,aturns=1,anytime=1,declined=1,instant=1`.
     Its attack rollouts play to the end of the next turn, so an attack is scored after the opponent's crack-back
     (`SearchConfig.horizonFor("a")` is `attackTurns` when it is 0 or more); its priority rollouts, the declined and
     instant-speed windows among them, are the live seat's (`horizonFor("p")` is `turns`, 0); `what=pa`, so no block
     is searched. It is J212's `search-v2-a1` on the pair, and the attack half of J218's player without its deeper
     priority rollouts or its clock.
   - **`search-v3-declined-instant-t1-x2`, config hash `5319a60d7e3b`**: J218's player at `"budgetMs": 3000`, so the
     pair's params with `"turns": 1` and `"budgetMs": 3000` and nothing else different. `aturns` is left unset, so
     attacks follow `turns` as in J218's player. Its seat config is J218's A's with `ms=3000`:
     `Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`.
     D545 point 5's registered follow-up. The round cap stays 12 and the 2 minimum rounds stay, as in D545 point 1.
2. **The matches: two, each one fixed 4,800-game match** (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping
   rule), each alone on the machine (D521), A against B = `search-v3-declined-instant` (`af6771947a25`), in a ladder
   folder of its own emptied by its step, at `--game-timeout 1800`:
   - **J219: A = `search-v3-declined-instant-a1`, on the dev set** (`--pairs tools/ai-bench/pairs-dev.txt`), under
     `--host j219` in `var/j219-ladder`, so on **blocks 758,900,000–758,900,599** on a first run and on a retry; its
     pilot's host `j219-pilot` (base 636,000,000). The dev set because J212's a1 point was read and chosen on the
     confirm set, and because J218's gain, which this arm asks about, was read on the dev set.
   - **J220: A = `search-v3-declined-instant-t1-x2`, on the confirm set** (the ladder's default pairs file,
     `tools/ai-bench/pairs-confirm.txt`, as J215 and J217 play it), under `--host j220` in `var/j220-ladder`, so on
     **blocks 302,900,000–302,900,599**; its pilot's host `j220-pilot` (base 500,000,000). The confirm set so that a
     reading above 0 is also the deeper horizon read on a second deck set: J218 was the dev set.
   - 600 consecutive blocks give each set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders
     (`batchPairs`, computed on the lane for both hosts and both sets). The timeout, 1,800 s, cuts only a stuck game
     and changes nothing a game plays by: J218's longest game on the dev set ran 1,517 s with A at 4.5 s (its next
     703 s), J216's 706 s at 1.5 s against 1.5 s, and the a1 arm thinks about 1.15 times as long as B, so that game
     would run about 800 s; on the confirm set J215's longest ran 268 s at 1.5 s and J212's `t1-x3` match's 317 s, so
     J220's, at about twice the thinking, about 400–500 s.
   - **The order**: J219 first (about 10.5 h), J220 after it (about 14 h). The order changes no reading: different
     deals, different folders, different players.
3. **Each match is complete** when its line names A and B in that order at their hashes, says `complete: true`,
   played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries
   `score`, `lo`, `elo`, `eloLo` and `eloHi`; its line's `set`, and every one of its result rows', is its registered
   set (J219 the dev set, J220 the confirm set); it was played on exactly its 600 registered blocks with no other
   match's game in its folder; every batch line carried the two seat configs exactly; both sides searched priority
   and attack decisions and neither searched a block; neither side's batch counters show a `search.p.lands.` counter
   above 0; and **A's rollouts were deeper than B's on the same games**, by the match's trace of the horizon, A's ms
   of play a finished rollout (`search.playUs ÷ search.rollouts`, D537 point 9) against B's:
   - **J220: at least 1.3 times B's** (D545 point 3's bar; J218 ×2.84; the ratio is a property of the horizon, not of
     the clock: J212's `t1-x3` at 4.5 s ×2.49 and `t1` at 1.5 s ×1.85 on the old base);
   - **J219: at least 1.05 times B's.** No counter splits play time or rollouts by decision kind (the rollout reader
     sums `search.playUs` and `search.rollouts` over all kinds), so an attacks-only horizon shows in the match only
     as an all-kinds ratio diluted by the priority rollouts, which are B's own config. J212's a1 read ×1.197 with
     attacks 22.6% of its searched decisions; the pair's attacks are 21.2% (J218's B: 25,251 of 119,134), so about
     ×1.15–1.2 is expected, and D545's 1.3 bar would be expected to fail on a valid match. A match in which the attack
     horizon never applied plays the same config on both sides and reads about 1.00 (J218's two sides' copy time a
     rollout: 4.3 and 4.3 ms). 1.05 is two to three times as far below the expected ratio as it is above 1.00, and far
     above what two sides of one config differ by over 4,800 shared games. That the horizon applied by kind — attacks
     at 1, priority at 0 — is shown per decision by the pilot's records (point 10), which carry the horizon each
     decision's rollouts were given (`SearchPolicy.horizonFor(kind)` → the report's `horizon`).
   An incomplete match gets no reading and is reposted alone under a new job id after its cause is found, with one
   named exception: **a complete, valid-looking match whose play-time trace reads under its bar** (J219 1.05, J220
   1.3) is INCOMPLETE and is **not reposted unchanged**. Either the bar was wrong or the horizon did not apply, and a
   repost would only repeat it; it is owed a new decision that says which, and what the next match changes. There is
   no NOT READ: the horizon applies to every searched decision of its kind, which the pilot's records and the trace
   hold.
4. **The readings, written before any game: D519's four at 4,800 games, for each match by itself, exactly one for a
   complete match, in this precedence, compared as the line carries them (`lo` in integer ten-thousandths, Elo in
   integer tenths):**
   - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
   - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
   - **INCONCLUSIVE AT 4,800**: `lo` at most 0.5 and `eloHi` at least +15;
   - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
   Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below
   0), a measured gain (wholly above). At the expected widths INCONCLUSIVE AT 4,800 cannot happen (it needs a score
   standard error of about 0.0055 or more; J215 0.0041, J216 0.0043, J218 0.0048) and stays in the rule for a match
   whose interval comes out wider than planned.
5. **What J219's reading earns.**
   - **SHOWN or SMALL GAIN**: the attack horizon alone, at the pair's clock, beats the pair.
     `search-v3-declined-instant-a1` is a **live-seat candidate for the owner**, under a separate decision and a
     seat-queue row (D509), with the match's point and interval and its cost beside them: A's and B's search seconds
     a game and their ratio, and ms a searched decision on each side (J212: ×1.13). The cost is reported and is never
     part of the reading (D519 point 5).
   - **INCONCLUSIVE AT 4,800**: information, not confirmed again (D519 point 3).
   - **NOT SHOWN**: the attack horizon alone is not shown to carry J218's gain: at J216's width on this set
     (0.0043192) it is worth less than about +11.8 Elo over the pair (the highest upper end a lower end at 0.5 allows; +13.1 at J218's
     0.0048). It does not say attacks are worth nothing: a true +5 reads NOT SHOWN about three times in five (62%; 68%
     at J218's width) and a true +8 about one time in four (24%; 33%). No attacks-only arm at 1.5 s is played again
     without a new decision saying what is different.
6. **What J220's reading earns.**
   - **SHOWN or SMALL GAIN**: the deeper horizon at twice the clock beats the pair on the confirm set, and the deeper
     horizon has read above 0 on both deck sets (J218 at 4.5 s on the dev set, this at 3 s on the confirm set; never
     pooled). `search-v3-declined-instant-t1-x2` is a **live-seat candidate for the owner** under a separate decision
     and a seat-queue row, with its point, interval and cost beside it (A's and B's search seconds a game and their
     ratio, ms a searched decision on each side), beside `t1-x3`'s J218 numbers and cost. Which of the two, if
     either, is the owner's choice; this decision does not compare them (point 8).
   - **INCONCLUSIVE AT 4,800**: information, not confirmed again.
   - **NOT SHOWN**: the deeper horizon is not shown at 3 s on the confirm set: at J215's width on this set (0.0041)
     `t1-x2` is worth less than about +11.2 Elo over the pair (+13.1 at J218's width). **The clock and the deck set
     are not separated**: J220 changes both against J218, and `t1-x3` has never been played on the confirm set, so a
     NOT SHOWN does not say that the gain needs the 4.5 s clock, nor that it was the dev set's. The policy that
     follows is still that **the next depth lane is a cheaper deep rollout, not a clock between** (no clock between
     3 s and 4.5 s at `turns=1` is played without a new decision saying what is different). It does not say J218's
     gain was not real (another clock, another deck set, another code version), and `t1-x3` stays the candidate J218
     made it, at its cost.
   - **The question this match answers, and why it moved.** D545 point 5 registered the cheaper clock as "whether
     most of the gain survives at about twice the thinking time". Played on the confirm set, J220 answers instead
     "is the 3 s deep player a gain on the confirm set": the clock and the deck set change together, so survival
     against J218 cannot be read from it. The confirm set is kept on purpose: a seat change needs a reading on the
     confirm set in any case (it is the set promotion reads, D318), so a gain there is the better evidence for the
     seat and answers the adoption question in one match, and it gives the deeper horizon a reading on each deck
     set. The price is that a NOT SHOWN cannot tell the clock from the deck set.
   - **No reading of either match changes the live seat**: these jobs move no seat. The live seat is search-v4 (B's
     config, D546); a candidate from either match is a new seat-queue row under its own decision, and each job says
     so. If the owner adopts J218's player before these run, B stays pinned by its hash (`af6771947a25`) and the
     readings stay valid as written, but their premise, cheaper arms played before an adoption, no longer holds:
     each then reads a cheaper player against the old seat, not an alternative to an open choice.
7. **What a reading does not say.** J219's: not what the priority rollouts' depth is worth (no match here plays
   `turns=1` with `aturns=0` on the pair) and not what the attack horizon is worth at another clock. J220's: not how
   much of J218's +15.9 survives, and not whether the clock or the deck set made a difference from J218 (both
   change; J218 is not this match's reference), and not which kind's depth carries it. Neither says anything against `search-v2-no-b` or against J212's points, nor anything
   beyond its own 30 deck pairs of six cubes and this one opponent.
8. **Never pooled.** J219 and J220 are never pooled with each other, with J218, with J212 or with J215, J216 or J217:
   other players, other deals or other deck sets, and since D544 another code version under the same configs. They
   are reported beside each other and beside J218 and J212 as description, in their own rows. If both read SHOWN or
   SMALL GAIN, their points are not compared: they were played on different sets, and a comparison between the two
   players would be a match of its own.
9. **Beside each reading, as description only** (D545 point 8, for each match): each side's searched decisions by
   kind and ms a searched decision, overall and by kind; search seconds a game and their ratio; rollouts and
   complete rounds a searched decision (over all kinds together, as the counters keep them); the share decided on
   fewer than 2 paired rounds (`search.anytime.short`); budget fallbacks and their rate; ms of play and of copy a
   finished rollout, and the play-time ratio against its bar; the priority overrides by direction a priority
   decision; D519 point 5's "no cost" flag (A's ms a searched decision within 5% of B's, `aMs × 100 ≤ 105 × bMs`),
   deciding nothing; the land windows left to Forge a game; both sides' `declined` and `instant` windows, candidates, changes
   and retries a game; the games per deck pair; J218's row and J212's rows as they were; and the errors and timeouts,
   with the score recomputed counting every timed-out game as A's loss (for J220, whose A thinks about twice as long,
   that is where a timeout would bias; the PC session's summary computes it from the result rows, the job's report
   prints the counts). For J219, the ms by kind is the cost to read: its attacks' ms a decision against B's, since
   its priority decisions are B's config.
10. **The pilots, before each match**, as D545 point 9's: the build with the decision self-test at 0 failures and
    its count at the pin; the ai-bench self-test; the ladder test; seven players at their hashes and seat configs
    (the anchor, `search-v2-no-b`, the pair, J218's `search-v3-declined-instant-t1-x3`, the two new players and J212's
    `search-v2-a1`); against main `2a13482a9` (this lane's base) the only file changed under `bridge/src`,
    `tools/ai-ladder` and `tools/ai-bench` is `players.json`, by these two players appended; the job's host base and
    its pilot host's; the job's readers tested on synthetic files; a 4-game ladder match of A against B under the
    pilot host on the match's set and a 4-game recorded run of A against Forge Default on that set's first pair. **The
    match is played only if**, over those 8 games:
    - none ended in an engine error or a timeout;
    - A's searched decisions decided on fewer than 2 paired rounds are at most 15% (summed over the 4 ladder games'
      batch lines and the 4 recorded games' bench lines; J212's a1 ran 7.7%, its starved `t1` 11.8%);
    - **J219**: every searched priority decision in A's recorded decision records carries horizon 0 and every
      searched attack decision horizon 1, at least one of each and none at another horizon; the 4 ladder games'
      play-time ratio is reported beside the gate and not gated (4 games of one deck pair, about a fifth of their
      decisions attacks: too few to hold a diluted ratio to a bar, and the records hold the horizon decision by
      decision);
    - **J220**: every searched priority and attack decision in A's records carries horizon 1 (none another, at least
      one of each), and in the 4 ladder games A's ms of play a finished rollout is at least 1.3 times B's;
    - A's `search.p.declined.retry` and `search.p.instant.retry` together are at most 2 a game.
    Otherwise the job writes its match as NOT PLAYED with the condition it failed. A lands counter above 0 on either
    side, a searched priority decision on a non-empty stack or in a land window, or a player off its hash stops the
    night as a pilot failure. Each pilot's longest game is reported beside its gate.
11. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game, residual sd 0.15 h), read at four times the games, held against the last three 4,800-game
    matches: J215 8.45 h against its 9.04 h, J216 8.6 h against 9.06 h, J218 18.7 h against 18.05 h (−6.5%, −5%,
    +3.6%).
    - **J219**: B searched 22.3 s a game on the dev set (J218's B). A's priority decisions are B's; its attacks
      search deeper at the same 1.5 s, and J212's a1 searched ×1.13 its base's seconds, so A about 25.2–26.8 s (×1.13
      to ×1.20) and both sides about 47.5–49.1 s a game: **about 10.2–10.4 h** by the fit, 10.6–10.8 h at J218's
      excess; so about 10.5 h (range 9.5–11.5 h) at 7 workers and about 12.3 h at 6. The match stops itself at
      `--hours 20` under a step timeout of 20.5 h: a full replay from the first block fits at 5 workers (about 14.7 h
      by the fit) and at 4 (about 18.4 h). The pilot about 10 minutes.
    - **J220**: B about 21.9 s a game on the confirm set (J215's A, the same config). A at 3 s: J218's A spent 2,800
      ms a searched decision of its 4,500 (62%) and B 900 of 1,500 (60%), so the share of the budget a decision uses
      held from 1.5 s to 4.5 s, and at 3 s A should spend about 1,870 ms a decision, about 47 s a game on J218's 25.1
      decisions a game (×2.1); ×1.9–×2.3 is A about 41.6–50.4 s, both sides about 63.5–72.3 s: **about 13.0–14.5 h**
      by the fit, 13.4–15.0 h at J218's excess; so about 14 h (range 13–15.5 h) at 7 workers and about 16.5 h at 6.
      `--hours 27` under a 27.5 h step timeout: a full replay fits at 5 workers (about 19.6 h) and at 4 (about
      24.5 h). The pilot about 15 minutes.
    - **How a memory-stop retry is timed** (read in `tools/runner/runner.ts`): a retry starts a new unit, and the
      runner sets the step's elapsed time to 0 at every unit start (`stepElapsedMs`; the `timeout:` is checked
      against it), and the match step empties its folder and starts the ladder again with its own `--hours`. So each
      attempt has the whole budget, however late the first one stopped; the retry runs with one worker fewer than
      the stopped run had (`retryCap`), and the third memory stop fails the job. A stopped and retried job holds the
      machine for both attempts together: up to about 10 h plus the replay for J219, 14 h plus the replay for J220.
    - Together about 25 h of the machine alone, J219 first. A match that reaches its own stop is `complete: false`
      and gets no reading.

**Under D509: the atlas's seat and the live seat are unchanged by this lane.** It changes no file under
`bridge/src`, `tools/ai-bench` or the ladder's code: two players appended to `tools/ai-ladder/players.json`, a test,
the ladder guide's line, PLAN's rows and this file. The atlas's seat and `SearchConfig.LIVE_DEFAULTS` read none of
them.

**Hidden information and threads.** Nothing new: `aturns`, `turns` and `ms` are config the ladder already passes and
`SearchPolicy` already honours (`aturns` since D351, `turns` since D312); the rollouts run on the copies as every
search rollout does. No wire, `Snap`, `CardView` or thread change.

**The hypotheses, registered as information before any game (no check reads them).**

- **J219.** J212's a1 point, +5.2 [−5.7, +16.2] at 1,200 games, was the arm that read positive, on the confirm set,
  against another opponent; earlier positive 1,200-game points came back at about +2 to +3 at 4,800 (D519 point 8),
  and J218's priority decisions changed Forge's answer more often than B's while its attacks did not (description,
  *Context*). The attack rollouts also get fewer rounds at the 1.5 s clock: J212's a1 decided 7.7% of its decisions
  on fewer than 2 rounds against 3.4%, which, if the excess is all attacks, is about one attack decision in five. So
  a true effect below +5 is the likelier, and a NOT SHOWN the likelier reading. With J216's pair standard error on
  this set (0.0043192, ±5.9 Elo; SMALL GAIN needs a point above about +5.9), from the normal approximation of the
  score (J218's 0.0048 in brackets):

  | true effect over the pair | SHOWN | SMALL GAIN | together | NOT SHOWN |
  |---|---|---|---|---|
  | 0 | 0.0% | 2.5% | 2.5% [2.5%] | 97.5% |
  | +2.5 Elo | 0.0% | 13.0% | 13.0% [11.3%] | 87.0% |
  | +5 Elo (J212's a1 point) | 0.0% | 38.4% | 38.4% [32.2%] | 61.6% |
  | +8 Elo | 1.0% | 75.0% | 76.0% [66.9%] | 24.0% |
  | +10 Elo | 4.8% | 86.7% | 91.5% [85.0%] | 8.5% |
  | +12 Elo | 15.9% | 82.0% | 97.9% [94.9%] | 2.1% |

- **J220.** If the clock is only what feeds the horizon (*Context*), most of J218's gain should survive at 3 s:
  J218's A was short of two rounds on 2.4% of its decisions, B on 3.1%, so A had evidence to spare at 4.5 s, and at
  3 s, with about two thirds of the rollouts, it should still be above J212's starved `t1` (11.8%). Against that,
  J218's +15.9 is one 4,800-game draw that sits on D519's line, and this is another deck set. With J215's standard
  error on the confirm set (0.0041, ±5.6 Elo; SMALL GAIN needs a point above about +5.6; J218's 0.0048 in brackets):

  | true effect over the pair | SHOWN | SMALL GAIN | together | NOT SHOWN |
  |---|---|---|---|---|
  | 0 | 0.0% | 2.5% | 2.5% [2.5%] | 97.5% |
  | +5 Elo | 0.0% | 41.9% | 41.9% [32.2%] | 58.1% |
  | +8 Elo (half of J218's point) | 0.7% | 79.5% | 80.2% [66.9%] | 19.8% |
  | +10 Elo | 4.0% | 89.9% | 93.9% [85.0%] | 6.1% |
  | +12 Elo | 14.7% | 84.1% | 98.8% [94.9%] | 1.2% |
  | +15.9 Elo (J218's point as the truth) | 62.4% | 37.6% | 100.0% [99.7%] | 0.0% |

  A truly null arm reads SMALL GAIN 2.5% of the time in either match, which is why a SMALL GAIN is a candidate for
  the owner's decision and not an adoption.

**Rejected.**

- **`turns=1` with `aturns=0` (the priority half of J218's player) at 4.5 s.** It would say where J218's gain is,
  not how to have it for less: it costs about what `t1-x3` costs. A later question if the owner wants the split.
- **A clock between 3 s and 4.5 s now** (`ms=3750`). Played before `ms=3000`, a gain there would not say whether the
  cheaper clock fails; `ms=3000` is the registered follow-up, and a NOT SHOWN there points at the rollout's cost.
- **`a1` at a larger clock.** The question is whether part of the gain is nearly free; at a larger clock it is not.
- **J220 on the dev set.** It would hold the deck set to J218's and so read the clock alone (new blocks redraw the
  deals; a deck-specific effect is real, which is why that comparison would be cleaner). Rejected because a seat
  change needs a reading on the confirm set anyway: the confirm match answers the adoption question in one match,
  where a dev match would need a second on the confirm set before any adoption.
- **J219 on the confirm set.** It would read a1 on the set J212 chose its point on.
- **One match with both arms, or 1,200-game screens first.** A 1,200-game screen repeats J212's shape (±11 Elo,
  every interval holding 0); each question needs its own resolvable answer.
- **Against `search-v3-declined-instant-t1-x3`.** Each arm's question is what it buys over the live seat at its
  cost; a match against `t1-x3` would read the difference between two expensive players and say nothing about what
  the owner would adopt in place of the live seat.
- **Pooling with J218 or J212.** Other players, other deals, J218 another code version.
- **Scaling the round cap with the clock** (`maxrounds=24` at 3 s). D537's Rejected: the question is the horizon at
  about the base's evidence a decision.

**What is unverified.**

- **The costs**: J219's from J212's a1 on another base and opponent; J220's from a linear reading of J218's ms a
  decision. The pilots' 4 ladder games and the matches measure them.
- **J219's trace bar**: 1.05 is set from J212's ×1.197 at a 22.6% attack share and the pair's 21.2%; no attacks-only
  match on the pair has been played. A valid-looking match below 1.05 is INCOMPLETE and is not reposted unchanged
  (point 3): it is owed a new decision saying what was wrong; the pilot's ladder ratio, reported beside its gate, is
  the first reading of it.
- **J219's starvation**: J212's a1 at 1.5 s was short of two rounds on 7.7% of its decisions; the gate's 15% bar
  catches a clock that never reached the player, not that.
- **The decision self-test count at this lane's merge**: the drafts check `== 514`, the count the full gate printed
  on `2a13482a9` (its run `20261113-095630-3556457`, `decision selftest: 514 check(s), 0 failure(s)`, twice); this
  lane changes no bridge source, but it has not been built (J217 held the machine), and the lane's own build is
  compared with it after J217.
- **That B plays as J218's B did**: argued by D544 (keys off, no engine call added or removed) and D546 (`parseLive`
  only), not measured; nothing here reads against J218's B.
- **That the four bases are unplayed everywhere**: read from the lab checkout's and this machine's checkouts' result
  rows and the job files on 2026-11-14; each job's block reader checks its own folder only.
- One opponent and one deck set a match.

**Verification (the lane, 2026-11-14, at `2a13482a9` with this lane on top; while J217 ran alone on the machine, so
no Java, no build, no game):**

- `node tools/decisions.mjs next`: D547 before this file. `node tools/ai-ladder/cli.ts cfg` (node only, no engine):
  `search-v3-declined-instant-a1` `dbf415e66452` and `search-v3-declined-instant-t1-x2` `5319a60d7e3b` with point 1's
  seat configs, `search-v3-declined-instant` `af6771947a25` and `-t1-x3` `9aeacaff9142` unchanged; `node
  tools/ai-ladder/cli.ts list` is main's output with exactly these two lines added.
- `node --test web/test/ai-ladder.test.ts` 60 of 60 (D547's case added); `web/test/claude-md.test.ts` 5 of 5; `node
  tools/decisions.mjs check` OK (461 decisions; next D548); `./tools/public-check.sh` OK; the bases and the 40 batches
  a deck pair computed with `tools/ai-ladder/schedule.ts` under node; the block scan above.
- The two drafts (`pc-jobs` `drafts/J219-attack-horizon.md` and `drafts/J220-cheaper-clock.md`, J218's job made each
  match's; their `repos:` sha a placeholder of 40 zeros for the merge commit, their decision self-test bar the
  count of 514, *What is unverified*): their readers, run alone in a scratch folder under node — J219's exposure
  reader 5 of 5, verdict 56 of 56 (the trace's named case and the "no cost" flag among them), recording reader 15 of
  15, the block, rollout and gate readers each ok; J220's 5, 55 and 15 of theirs and the other three ok. `node tools/runner/cli.ts check` on each: `lint: clean`, `machine-checked`; the pilot 7 blocks and
  50 checks, the commands 2 blocks and 25 checks.
- Not run then: `./tools/check-forge.sh`, `./bridge/build.sh` (the lint, its self-test, the decision self-test and
  its count), the ai-bench self-test, `./tools/ai-ladder.sh list` through the shell, the two pilot dry-runs and the
  full gate. All but the gate were run after J217 ended, below; the gate is the merge commit's.

**Verification after J217 (2026-11-14 14:29-14:45 EST on `c35992ada`, the lab idle):**

- `./tools/check-forge.sh` OK (sha256 `3c0a7c38...8e5dd9`); `./bridge/build.sh` rc 0: the lint's self-test OK (33
  rules, 79 firing cases, 93 checks), the eval self-test 8,039 checks, the grade self-test 132, **the decision
  self-test 514 check(s), 0 failure(s)** (the count both drafts' bar names), the distill self-test 38; the ai-bench
  self-test 476 check(s), 0 failure(s).
- `./tools/ai-ladder.sh list` through the shell: `search-v3-declined-instant` `af6771947a25`, `-t1-x3`
  `9aeacaff9142`, `-a1` `dbf415e66452`, `-t1-x2` `5319a60d7e3b`, as registered; `node --test
  web/test/ai-ladder.test.ts` 60 of 60.
- The two pilots, dry-run from this lane (`./tools/runner.sh dry-run <job> --root <lane> --pilot-only --workers 6
  --keep`, each draft pinned to `c35992ada`): J219's seven blocks ok (40, 0, 0, 0, 0, 152 and 81 s), J220's ok (44,
  0, 0, 0, 0, 394 and 187 s); **49 of 50 checks pass on each**, and the one that fails is `merged == 1`, which is
  false by construction off `main` and is the merge's to make true.

**Follow-up.** J219 and J220 play the two matches at this lane's merge, J219 first; each `report.md` carries its
reading and description, and `summary.md` (the PC session) words them. A SHOWN or SMALL GAIN goes to the owner as a
seat-queue row under its own decision, with its cost beside it and beside `t1-x3`'s; J219 NOT SHOWN closes the
attacks-only arm at the pair's clock; J220 NOT SHOWN makes the next depth lane a cheaper deep rollout. Its rows in
PLAN are the cube lab's 64 (J219) and 65 (J220); 62, D545's, is closed by J218's read.

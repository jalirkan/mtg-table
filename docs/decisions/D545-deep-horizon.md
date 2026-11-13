## D545 — the search's horizon on the pair: J212's two positive depth points together, `turns=1` with attacks following it at three times the clock, on one new player built on `search-v3-declined-instant`, played once against it in one fixed 4,800-game match on the dev deck set, under D519's four readings written for this match (J218)

*Branch `pc/d545-deep-horizon`, off main `97122947c` (D543's merge, J216's pin). Reads J212 (`results/J212/` on
`pc-results`: `summary.md`, `verdict.json`, the three match lines and rollout files; and the `j212-x3` match's own
result rows in the lab checkout's `var/`, read-only), J215 and J216 (`results/J215/`, `results/J216/`). A new ladder
player and its decision: `tools/ai-ladder/players.json` (one player appended), the ladder test, the ladder guide's
line, PLAN's rows and this file. No file under `bridge/src`, `tools/ai-bench` or `tools/ai-ladder/*.ts` changes,
every registered player's hash is unchanged, the live seat does not move, and the player's hash was computed by the
ladder's own `resolvePlayer` and confirmed by `./tools/ai-ladder.sh list` on the lane. `node tools/decisions.mjs
next` printed D544 on this lane: D544 is reserved by the unmerged lane `pc/d544-wide-windows` (J217), so this file
takes D545 (D200: a reserved number is not reused).*

**Status: registered; built and self-tested on the lane (*Verification*); unplayed. J218 plays it.**

**2026-11-13**

**Context.**

- **The search's value is deterministic and biased at its horizon.** Every rollout of the live seat and of
  `search-v3-declined-instant` ends with the turn its decision is made in (`turns=0`): a main-phase play and an
  attack are scored before the opponent untaps, the reply is never played, and the leaf prices what it cannot see
  (D537's *Context*). More clock at that horizon has bought nothing (×0.25 to ×4 against search-v2: −14.5 to +1.7 Elo,
  J194, J195, J198); D537 played the horizon instead.
- **J212 played D537's three depth arms** (2026-11-11, 1,200 games each, the confirm set, blocks
  114,900,000–114,900,149, against `search-v1-anytime`, the live seat that night, `what=pab`; 0 errors, 0 timeouts):

  | arm | what changed | Elo [95%] | reading | search s a game, A / B | rollouts a decision, A / B | fewer than 2 rounds, A / B | ms of play a rollout, A / B |
  |---|---|---|---|---|---|---|---|
  | `search-v2-t1` (`63c35e9f7d5b`) | priority and block rollouts to the end of the next turn, 1.5 s | −1.7 [−14.6, +11.2] | NOT SHOWN | 27.8 / 20.6 (×1.35) | 11.47 / 15.79 | 11.8% / 2.8% | 92.1 / 49.7 (×1.85) |
  | `search-v2-a1` (`3cf65e94df28`) | attack rollouts see the crack-back, 1.5 s | +5.2 [−5.7, +16.2] | INCONCLUSIVE AT 1,200 | 24.3 / 21.5 (×1.13) | 14.39 / 15.53 | 7.7% / 3.4% | 61.3 / 51.2 (×1.20) |
  | `search-v2-t1-x3` (`ce99b41f9898`) | `t1` at 4.5 s, the round cap still 12 | +9.8 [−1.7, +21.4] | INCONCLUSIVE AT 1,200 | 53.9 / 19.8 (×2.72) | 19.08 / 16.43 | 1.6% / 2.4% | 114.9 / 46.1 (×2.49) |

  `t1` starved: at the same 1.5 s its deeper rollouts left 11.5 rollouts a decision against 15.8, 11.8% of its
  decisions short of two paired rounds and 2.5% budget fallbacks (0.4% for B); it saw further and less often, and
  the two cancelled. Given three times the clock, `t1-x3` got its evidence back (1.6% short, 0.27% budget fallbacks)
  and its point moved to +9.8. Neither positive point was confirmed at 4,800 games: D537 point 7 left an
  INCONCLUSIVE AT 1,200 as information, and the next lanes went to what the search considers (D540).
- **Since then the base moved.** D541's pair `search-v3-declined-instant` (`af6771947a25`, search-v3 with
  `declined=1` and `instant=1`) read SMALL GAIN against the live seat twice: J215 on the confirm set, +6.9 Elo [+1.4,
  +12.5], and J216 on the dev set, +8.3 [+2.4, +14.1] (score 0.5119 [0.5034, 0.5203], pair standard error
  0.0043192); pooled +7.6 [+3.5, +11.7]. D543 point 6's recommendation to adopt it STANDS, carried by J216 alone, and
  the next candidate-side lane is built on it; the live seat is still `search-v2-no-b` (`59505e241363`) until the
  owner answers.
- **Positive 1,200-game points have shrunk before.** Three earlier positive 1,200-game points came back at about +2
  to +3 when 4,800 games read them again (targets, the evaluator leaf, routlets; D519 point 8: routlets +6.9 at 1,200,
  +2.9 at 4,800; D543's *Context*). J212's two points were each the arm that happened to read positive, on the deck
  set they were read on.
- **The dev set is held out from that selection.** `tools/ai-bench/pairs-dev.txt` is the other 30 drafts of the same
  six cubes (D318). No game with a deeper horizon has been played on it: a scan of every ladder result row and every
  ai-bench shard line under the lab's four checkouts' `var/` and every local `mtg-table*` checkout's `var/`
  (2026-11-13) found 4,648 lines with `turns` or `aturns` from 1 to 4 in a seat config — J212's three arms and
  their ladder pilots (3,612 rows) and October's `search-v1-fixed3-aturns1` (J016, 624 rows), every row's `set` the
  confirm set; J212's three recorded pilots (12 lines, the confirm set's first pair); and an October cube night (400 lines, `Default+search:ms=3000,
  turns=1`, on `tools/ai-bench/decks/synergy-100x` decks, in neither set) — and none on the dev set. J216's pair has
  played it once, at `turns=0`.

**Decision.**

1. **The player: `search-v3-declined-instant-t1-x3`, config hash `9aeacaff9142`** (the ladder's own
   `resolvePlayer` and `configHash` on the lane, confirmed by `./tools/ai-ladder.sh list`; `web/test/ai-ladder.test.ts`
   holds it). Its params are `search-v3-declined-instant`'s with `"turns": 1` and `"budgetMs": 4500` and nothing else
   different, so its seat config is the pair's with `ms=4500` and `turns=1`:
   `Default+outlets+search:ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`.
   **`aturns` is left unset**, so attack rollouts follow `turns` (`SearchConfig`'s field doc, "default: the same as
   turns", and `horizonFor`, which gives attacks `attackTurns` only when it is 0 or more): its priority rollouts are
   `t1-x3`'s and its attack rollouts `a1`'s, both of J212's positive depth points on one seat. `what=pa`, so no
   block is searched and the block horizon is moot. Held at the pair's values on purpose: the round cap 12 and the 2
   minimum rounds (D537 point 3's reason: about the evidence the base gets a decision, at the deeper horizon), the
   copy's 1 s Forge think limit and the 20,000-step cap. It is a new player: its hash is its own and none of J212's
   games is its.
2. **The match: one fixed 4,800-game match** (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule), alone
   (D521), on the **dev set** (`--pairs tools/ai-bench/pairs-dev.txt`), A = `search-v3-declined-instant-t1-x3`
   against B = `search-v3-declined-instant` (`af6771947a25`, D543 point 6's base for the next candidate-side lane),
   under `--host j218` in a ladder folder of its own, `var/j218-ladder`, emptied by its step. `hostBase('j218')` is
   655,000,000 (FNV-1a as `tools/ai-ladder/schedule.ts` computes it, recomputed on the lane beside `j215` →
   519,000,000, `j216` → 622,000,000 and `j217` → 725,000,000), so the match is dealt **blocks
   655,900,000–655,900,599**, on a first run and on a retry. Of the 360,238 ladder result rows under the lab's four
   checkouts' `var/` (read 2026-11-13; the rows lie on 30 bases) and the 141 under the local checkouts, none is on
   base 655; no job file in `pc-jobs/jobs/` or `drafts/` names `j218` or a block on that base; the unposted J217
   draft (D544) takes base 725 and its pilot base 63. **The pilot's host is `j218-pilot`, base 87,000,000**, on which no
   row lies either. 600 consecutive blocks give each of the dev set's 30 deck pairs exactly 40 batches, 160 games, in
   both seat orders (`batchPairs`). **`--game-timeout 1800`**, not J216's 900: J216's longest game on the dev set ran
   706 s (27 turns, a synergy pair) and its next 405 s with both sides at 1.5 s, and A thinks about three times as
   long, so a game like it would run about 1,300–1,400 s; J212's `t1-x3` match on the confirm set had its longest at
   317 s. The timeout cuts only a stuck game and changes nothing a game plays by (D537 point 3).
3. **The match is complete** when its line names A and B in that order at their hashes, says `complete: true`,
   played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries
   `score`, `lo`, `elo`, `eloLo` and `eloHi`; **its line's `set` is the dev set and every one of its result rows
   says so**; it was played on exactly the 600 blocks 655,900,000–655,900,599 with no other match's game in its
   folder; every batch line carried the two seat configs exactly; both sides searched priority and attack decisions
   and neither searched a block; neither side's batch counters show a `search.p.lands.` counter above 0 (both sides'
   third D540 key is off); and **A's rollouts were deeper than B's on the same games**: A's ms of play a finished
   rollout (`search.playUs ÷ search.rollouts`, D537 point 9's trace of the horizon) at least 1.3 times B's over the
   match (J212: ×2.49 for `t1-x3`, ×1.85 for `t1`). An incomplete match gets no reading and is reposted alone under a
   new job id after its cause is found. There is no NOT READ: the horizon applies to every searched decision, which
   the pilot's records and this trace hold, so there is no exposure to fall short of.
4. **The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match, in this
   precedence, compared as the line carries them (`lo` in integer ten-thousandths, Elo in integer tenths):**
   - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
   - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
   - **INCONCLUSIVE AT 4,800**: `lo` at most 0.5 and `eloHi` at least +15;
   - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
   Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below
   0), a measured gain (wholly above). At the expected width INCONCLUSIVE AT 4,800 cannot happen — it needs a score
   standard error of about 0.0055 or more against J216's 0.0043 on this set — and it stays in the rule for a match
   whose interval comes out wider than planned.
5. **What a reading earns.**
   - **SHOWN or SMALL GAIN**: depth pays when it is not starved. `search-v3-declined-instant-t1-x3` is a
     **live-seat candidate for the owner**, under a separate decision and a seat-queue row (D509), with the match's
     point and interval and its cost stated beside them: A's and B's search seconds a game and their ratio, and ms a
     searched decision on each side. The cost is reported and is never part of the reading (D519 point 5). The
     follow-up is the cheaper clock — the same player at `ms=3000`, whether most of the gain survives at about twice
     the thinking time — under its own decision; it is not this job's.
   - **INCONCLUSIVE AT 4,800**: information, not confirmed again (D519 point 3).
   - **NOT SHOWN**: at J216's width the deeper horizon at 2.7 to 3 times the thinking time is worth less than about
     +11.8 Elo over the pair (the highest upper end a lower end at 0.5 allows; +10.6 at J211's width), and **the
     horizon track closes at practical clocks**: no arm deepening the Forge rollouts at three times the clock or less
     is played again without a new decision saying what is different (a cheaper rollout, a different leaf). It does
     not say the horizon is worth nothing.
   - **No reading changes the live seat**: `SearchConfig.LIVE_DEFAULTS` stays `what=pa,anytime=1`, and the job says
     so.
6. **What a reading does not say.** Not which depth carried it — the priority rollouts' or the attacks' — and not
   how much is the clock: the 4.5 s is every kind's budget (`SearchPolicy.budgetFor`), and four times the clock at
   `turns=0` read +1.7 [−6.7, +10.2] (J194), so a gain from the clock alone is not expected and is not excluded. Not
   anything against the live seat: B is the pair, so the match measures depth on top of D541's two keys, and adds
   nothing to J215's or J216's numbers. Not anything on the confirm set, nor anything beyond these 30 dev deck pairs
   of six cubes and this one opponent. Nothing is read against J212's points.
7. **Never pooled.** J212's 1,200 games per arm are other players against another opponent on other deals and stay
   outside this match; they are reported beside it as description, in their own rows, and never added in (D398;
   D519's Rejected). J215 and J216 are the pair against the live seat and are never pooled with it either.
8. **Beside the reading, as description only:** each side's searched decisions by kind and ms a searched decision,
   overall and by kind; search seconds a game and their ratio; rollouts and complete rounds a searched decision
   (counted over all kinds together, as the counters keep them); the share decided on fewer than 2 paired rounds
   (`search.anytime.short`); budget fallbacks and their rate; ms of play and of copy a finished rollout; the priority
   overrides by direction a priority decision; the land windows left to Forge a game; both sides' `declined` and
   `instant` windows, candidates, changes and retries a game (the pair's keys on both seats); the games per dev deck
   pair; and J212's three rows as they were.
9. **The pilot, before the match**: the build with the decision self-test at 0 failures and 472 checks (no bridge
   source changed since D540's merge); the ai-bench self-test; the ladder test; six players at their hashes and seat
   configs (the anchor, the live seat, the pair, the new player and J212's `search-v2-t1-x3` and `search-v2-a1`);
   the code since D543's merge changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` in `players.json`
   alone, by this one player; `hostBase('j218')` 655,000,000 and the pilot host's 87,000,000; the job's readers
   tested on synthetic files; a 4-game ladder match of A against B under `--host j218-pilot` on the dev set and a
   4-game recorded run of A against Forge Default on the dev set's first pair (`fair-fight-900000000`). **The match
   is played only if**, over those 8 games:
   - none ended in an engine error or a timeout;
   - A's searched decisions decided on fewer than 2 paired rounds are at most 15% (`search.anytime.short` against
     `search.p.considered + search.a.considered + search.b.considered`, summed over the 4 ladder games' batch lines
     and the 4 recorded games' bench lines; `t1` starved at 11.8%, `t1-x3` ran 1.6%);
   - A's rollouts were played to `turns=1`: every searched priority and attack decision in A's recorded decision
     records carries horizon 1 (none another horizon, at least one of each kind), and in the 4 ladder games A's ms
     of play a finished rollout is at least 1.3 times B's;
   - A's `search.p.declined.retry` and `search.p.instant.retry` together are at most 2 a game (J215's bar).
   Otherwise the job writes the match as NOT PLAYED with the condition it failed. A lands counter above 0 on either
   side, a searched priority decision on a non-empty stack or in a land window, or a player off its hash stops the
   night as a pilot failure. The pilot's longest game is reported beside the gate (point 2's timeout).
10. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game, residual sd 0.15 h) read at four times the games. B searched 22.2 s a game on the dev set as J216's
    A. A: `t1-x3` searched ×2.72 its base's seconds, about 60 s on this base, plus its attacks' deeper rollouts at
    4.5 s (`a1`'s ×1.13 was at 1.5 s), so about 60–65 s. Both sides about 82–87 s a game: about 16.2–17.0 h for the
    match by the fit, 16.6 h at the middle. J212's `t1-x3` match ran 4.31 h against the fit's 3.68 h for its 73.7 s
    (+17%, beyond the fit's largest residual, +0.37 h): at that ratio about 19.4 h. The pilot about 15 minutes. So
    about 17 h (range 16–20 h) at 7 workers; about 19.4 h if memory pressure holds it at 6 workers by the fit and
    about 22.7 h at 6 with `t1-x3`'s excess. The match stops itself at `--hours 26` and the step's timeout is 26.5 h
    (the runner sets no ceiling on a step's `timeout:`); a match that reaches its own stop is `complete: false` and
    gets no reading. It holds the machine alone for most of a day.

**Under D509: the atlas's seat and the live seat are unchanged.** This lane changes no file under `bridge/src`,
`tools/ai-bench` or the ladder's code: one player appended to `tools/ai-ladder/players.json`, a test, the ladder
guide's line, PLAN's rows and this file. The atlas's seat and `SearchConfig.LIVE_DEFAULTS` read none of them.

**Hidden information and threads.** Nothing new: `turns`, `ms` and the two D540 keys are config the ladder already
passes and `SearchPolicy` already honours; the rollouts run on the copies as every search rollout does. No wire,
`Snap`, `CardView` or thread change.

**The hypothesis, registered as information before any game (no check reads it).** J212's two points are single
1,200-game draws against another opponent, each picked because it was positive: `t1-x3` +9.8 [−1.7, +21.4] at
×2.72 the search time, `a1` +5.2 [−5.7, +16.2] at ×1.13. Every earlier positive 1,200-game point read again at
4,800 came back at about +2 to +3 (the *Context*), and the dev set is held out from the selection, so each point's
true effect is more likely below it than above. If both held as measured and added, about +15 Elo; if each shrank
to +2 or +3 and they add, about +5; if they overlap, less. B is now the pair rather than search-v2, which none of
J212's games measured against. With J216's pair standard error on this set (0.0043192, a half-width of about ±5.9
Elo; SMALL GAIN needs a point above about +5.9), from the normal approximation of the score:

| true effect over the pair | SHOWN | SMALL GAIN | together | NOT SHOWN |
|---|---|---|---|---|
| 0 | 0.0% | 2.5% | 2.5% | 97.5% |
| +2.5 Elo (where earlier gains shrank to) | 0.0% | 13.0% | 13.0% | 87.0% |
| +5 Elo | 0.0% | 38.4% | 38.4% | 61.6% |
| +8 Elo | 1.0% | 75.0% | 76.0% | 24.0% |
| +9.8 Elo (`t1-x3`'s point as the truth) | 4.2% | 86.2% | 90.4% | 9.6% |
| +12 Elo | 15.9% | 82.0% | 97.9% | 2.1% |
| +16 Elo | 63.0% | 36.9% | 100.0% | 0.0% |

At J211's 0.0039, D541's table: SHOWN or SMALL GAIN 2.5% at a true 0, 45% at +5, 84% at +8, 96% at +10. So a true
effect at `t1-x3`'s point reads SMALL GAIN or SHOWN about nine times in ten, one where the earlier gains shrank to
about one time in eight, and a truly null depth SMALL GAIN 2.5% of the time, which is why a SMALL GAIN is a
candidate for the owner's decision and not an adoption.

**Rejected.**

- **`t1-x3` alone (`aturns=0`), or `a1` alone.** Each is the smaller question and the selected draw (D519 point 8's
  warning); a 4,800-game night buys one resolvable answer, and the player with both is the seat the owner would be
  offered if depth pays. Which part carried a gain is a later question for a later night, if there is a gain to
  split.
- **`ms=3000` now.** The cheaper clock is the follow-up of a gain; played first, a NOT SHOWN there could not say
  whether depth or its evidence failed (J212's `t1` starved at 1.5 s).
- **Scaling the round cap with the clock** (`maxrounds=36`). D537's Rejected: the question is the horizon at about
  the base's evidence a decision, not three times the evidence.
- **The confirm set.** J212's points were read there, and every search night since D398 chose its arm there; the dev
  set has never seen a deeper horizon.
- **Against the live seat.** D543 point 6 builds the next candidate-side lane on the pair while the recommendation
  stands; a match against `search-v2-no-b` would read depth and D541's keys at once.
- **A 1,200-game screen first.** It would repeat J212's shape (±11 Elo, every interval holding 0) at a quarter of a
  day of the machine; the positive points exist, and what they lack is resolution.
- **Pooling J212's games.** Other players, another opponent, other deals, the games that chose this player.

**What is unverified.**

- **The cost**: extrapolated from J212's `t1-x3` (×2.72) on another base and opponent; the attacks' deeper rollouts
  at 4.5 s were never measured (`a1` ran at 1.5 s). The pilot's 4 ladder games and the match measure it.
- **That the starvation bar is right for this player**: 15% short of two rounds sits between `t1-x3`'s 1.6% and
  `t1`'s 11.8% plus a margin, on 8 games; the match reports its own share and does not gate on it.
- **The game timeout**: 1,800 s is set from J216's tail (706 s at 1.5 s against 1.5 s) scaled by the thinking time;
  the pilot's 8 games cannot see a tail of one game in 4,800.
- **The horizon in the match**: the ladder's batch counters do not count the turns a rollout played (the `Playout`
  carries them; no counter sums them); the per-decision horizon is read from the pilot's records and the match's
  play time a rollout is the trace.
- **The time**: the fit is of finished matches mostly at 40–50 s a game; J212's `t1-x3` at 73.7 s ran 17% over it.
- **That `hostBase('j218')`'s blocks are unplayed everywhere**: read from the lab's checkouts, this repository's
  checkouts and the job files on 2026-11-13; the job's block reader checks the match's own folder only.
- One opponent and one deck set: the pair and the dev set's 30 deck pairs.

**Verification (the lane, 2026-11-13, at `97122947c` with this lane on top):** *(written from what was run; see
below)*

**Follow-up.** J218 plays the match at this lane's merge; its `report.md` carries the reading and the description,
and `summary.md` (the PC session) words them. A SHOWN or SMALL GAIN goes to the owner as a seat-queue row under its
own decision, and the cheaper clock is the next depth lane; a NOT SHOWN closes the horizon track at practical clocks.
Its row in PLAN is the cube lab's 62 (61 is D544's, on its unmerged branch).

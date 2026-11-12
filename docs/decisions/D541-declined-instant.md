## D541 — search-v3-declined-instant: D540's two positive keys, `declined=1` and `instant=1`, on one new player, played once against the live seat in one fixed 4,800-game match on deals no job has played, under D519's four readings written for this match (J215)

*Branch `pc/d541-declined-instant`, off main `7ff7d6ab2` (D540's merge). Extends D540 (its keys and its exposure
condition) and D519 (the four readings, rewritten here for this match as D519 point 6 asks of a later rule); uses
D398's fixed match unchanged; reads J214 (`results/J214/` on `pc-results`: `report.md`, `verdict.json`, the three
match lines and exposure files). A new ladder player and its decision: `tools/ai-ladder/players.json` (one player
appended), the ladder test, the ladder guide's key line, PLAN's rows and this file. No file under `bridge/src`,
`tools/ai-bench` or `tools/ai-ladder/*.ts` changes, the live seat does not move, and the player's hash was read from
the ladder itself (`ai-ladder.sh list` on the lane), not re-implemented.*

**Status: registered; built and self-tested on the lane (*Verification*); the full gate and the merge pending; unplayed. J215 plays it.**

**2026-11-12**

**Context.**

- **J214 read D540's three arms** (2026-11-12 05:07 to 11:46, mtg-table `7ff7d6ab`, alone, 7 workers; 3,600 games, 0
  draws, 0 errors, 0 timeouts; every name, hash, seat config and block check passed and no D540 counter moved on B's
  side). Each arm was one fixed 1,200-game match against `search-v2-no-b` (`59505e241363`, search-v3, the live seat
  since D539) on blocks 416,900,000–416,900,149:

  | arm | score [95%] | Elo [95%] | reading | its key's windows a game | candidates a window | changes a game | search s a game, A / B |
  |---|---|---|---|---|---|---|---|
  | `search-v3-declined` (`795daea97aaa`) | 0.5083 [0.4934, 0.5233] | +5.8 [−4.6, +16.2] | INCONCLUSIVE AT 1,200 | 3.03 | 1.16 | 0.335 | 19.5 / 18.9 (×1.03) |
  | `search-v3-instant` (`25ee7e76b741`) | 0.5150 [0.4990, 0.5310] | +10.4 [−0.7, +21.5] | INCONCLUSIVE AT 1,200 | 1.84 | 2.15 | 0.187 | 21.2 / 19.1 (×1.11) |
  | `search-v3-lands` (`e0b09eb7b014`) | 0.5017 [0.4862, 0.5172] | +1.2 [−9.6, +11.9] | NOT SHOWN | 3.50 | 2.19 | 0.286 | 21.7 / 18.8 (×1.16) |

  No arm is a candidate; none is NOT READ (each key fired far above D540's floor of 0.25 windows a game); no arm
  retried a widened pick; the declined arm listed 4,318 aimed spells and dropped 5,378 with no legal target. Under
  D540 point 9 an INCONCLUSIVE AT 1,200 is information and is not confirmed, and the NOT SHOWN arm, `lands`, is not
  played again.
- **Every single change to the search since J211 has read between about −2 and +10 Elo, and a 1,200-game match
  cannot resolve that.** J211's 4,800 games put the block search at −2.2 [−7.4, +3.1]; J212's three horizon arms read
  −1.7, +5.2 and +9.8 (against `search-v1-anytime`), J214's three +5.8, +10.4 and +1.2. A 1,200-game match on this
  set has a standard error of about 0.0076–0.0095 in score, 5.3–6.6 Elo, so its interval is about ±11 Elo, and every
  one of those six intervals holds 0. Taken together the six 1,200-game points have a mean of +5.1 Elo and a standard
  deviation of 4.7 Elo, no more than the noise each one carries: they cannot tell the six changes apart, so nothing
  in them says that `instant` is better than `lands` or `declined` better than `turns=1`.
- **A 4,800-game match can.** J211's 4,800 games had a score standard error of 0.0039 and J197's 0.0036, about 2.7
  and 2.5 Elo, so an interval of about ±5.3 Elo (J211: [−7.4, +3.1]; J197: [−2.1, +7.9]). At that width D519's SMALL
  GAIN (a lower end above 0.5 with a point under +15) separates a true effect of about +8 or more from 0, which is
  the size J214's two positive points suggest.
- **The two positive keys are config keys of one player.** `declined` and `instant` are independent switches in
  `SearchConfig` (D540 points 2 and 3), so a seat may turn both on; the retry guard (D540 point 1) keeps one pending
  widened pick at a time across the keys, and both counters are kept apart (`search.p.declined.*`,
  `search.p.instant.*`). With both on, an instant-speed window lists the declined spells too: `choosePriority`
  builds the declined list whenever `declined` is on, inside `Decisions.quiet` in an instant-speed window, so the
  pair searches one thing neither J214 arm did, an aimed declined spell as a candidate in the empty-stack windows
  outside the seat's own main phases (`search.p.declined.windows` counts such a window too).

**Decision.**

1. **The player: `search-v3-declined-instant`, config hash `af6771947a25`** (read from `./tools/ai-ladder.sh list` on
   the lane; `web/test/ai-ladder.test.ts` holds it). Its params are `search-v3-declined`'s with `"instant": "on"`
   added and nothing else different, so its seat config is search-v3's plus `,declined=1,instant=1`:
   `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`.
   `lands` stays off. It is a new player, not either J214 arm: its hash is its own and none of J214's games is its.
2. **The match: one fixed 4,800-game match** (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule) on the
   confirm set (`tools/ai-bench/pairs-confirm.txt`), A = `search-v3-declined-instant` against B = `search-v2-no-b`
   (`59505e241363`), under `--host j215` in a ladder folder of its own emptied by its step, at `--game-timeout 900`
   (J214's). `hostBase('j215')` is 519,000,000, so the match is dealt **blocks 519,900,000–519,900,599**, on a first
   run and on a retry. No row of the 350,620 ladder rows under the lab's four checkouts' `var/` (read 2026-11-12) is
   on base 519, and no job file under `pc-jobs/jobs/` names `--host j215` or a block on that base; J211's 931 and
   J214's 416 are other bases, and the lab host's own 114,900,000 on are J194 to J212's. 600 consecutive blocks give
   each of the confirm set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders (`batchPairs`).
3. **The match is complete** when its line names A and B in that order at their hashes, says `complete: true`, played
   all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries `score`, `lo`,
   `elo`, `eloLo` and `eloHi`; it was played on exactly the 600 blocks 519,900,000–519,900,599 with no other match's
   game in its folder; every batch line carried the two seat configs exactly (point 1's and search-v3's); both sides
   searched priority and attack decisions and neither searched a block; B's batch counters show no
   `search.p.declined.`, `search.p.instant.` or `search.p.lands.` counter above 0 (D540's keys-off path); and **A's
   show no `search.p.lands.` counter above 0** (its third key is off). An incomplete match gets no reading and is
   reposted alone under a new job id after its cause is found.
4. **NOT READ.** A match complete in every other part in which either key fired in fewer than 0.25 windows a game on
   A's side — `search.p.declined.windows` or `search.p.instant.windows`, summed over the match's batch lines, under
   1,200 at 4,800 games (in integers, `windows × 4 < played`) — gives no reading on the pair; the report gives both
   rates, and the player is not played again without a new decision. (J214's arms ran at 3.03 and 1.84 a game.)
5. **The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match, in this
   precedence, compared as the line carries them (`lo` in integer ten-thousandths, Elo in integer tenths):**
   - **SHOWN**: `lo` above 0.5 and `elo` at least +15;
   - **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
   - **INCONCLUSIVE AT 4,800**: `lo` at most 0.5 and `eloHi` at least +15;
   - **NOT SHOWN**: `lo` at most 0.5 and `eloHi` below +15.
   Beside the reading, deciding nothing: indistinguishable (the Elo interval holds 0), a measured loss (wholly below
   0), a measured gain (wholly above). At the expected width INCONCLUSIVE AT 4,800 cannot happen — it needs an
   interval at least about 15 Elo wide, a score standard error of 0.0055 or more against the 0.0036–0.0039 J197 and
   J211 had — and it stays in the rule for a match whose interval comes out wider than planned. So a NOT SHOWN here
   says, at J211's width, that the pair is worth less than about +10.6 Elo against the live seat (the highest upper
   end a lower end at 0.5 allows), not that it is worth nothing.
6. **What a reading earns.** SHOWN or SMALL GAIN names `search-v3-declined-instant` a **live-seat candidate for the
   owner**, decided under a separate decision and a seat-queue row (D509), with the match's point, interval and cost
   (A's and B's search seconds a game and their ratio) beside it; the cost is reported and never part of the reading
   (D519 point 5's reasoning). INCONCLUSIVE AT 4,800 is information and is not confirmed again (D519 point 3). NOT
   SHOWN closes the candidate-list track for the confirm set — the declined spells and the empty-stack instant-speed
   windows; the land drop is already closed by J214 — and the next search lane is the value side (D540 point 13's
   last case: the leaf, or the MAIN1 transposition the judged labels point at). No reading changes the live seat:
   `SearchConfig.LIVE_DEFAULTS` stays `what=pa,anytime=1`, and the job says so.
7. **What a reading does not say.** Not which of the two keys carried it: no ablation is promised, and none of J214's
   numbers is subtracted from this match's. Not that the keys add: the pair also searches declined spells in the
   instant-speed windows (the last *Context* bullet), which neither arm did. Not anything about other deck sets or
   other opponents: the confirm set and the live seat only.
8. **Never pooled.** J214's 2,400 games of the two one-key arms are other players on other deals (416,900,000–
   416,900,149) and stay outside this match; they are reported beside it as description, in their own rows, and
   never added in (D398; D519's Rejected).
9. **Beside the reading, as description only** (D540 point 10's list, for both keys): each side's searched decisions
   by kind and ms a searched decision; search seconds a game; each key's windows a game, candidates a window, changes
   a game and `search.p.<key>.retry` a game; the declined spells listed and dropped for no legal target; priority
   overrides by direction a priority decision; the land windows left to Forge a game. A retry counts against the
   player in its own match and is not corrected for (D540 point 10: under `declined` it is likely a card left in the
   stack zone).
10. **The pilot, before the match**: the build with the decision self-test at 0 failures and at least 472 checks; the
    ai-bench self-test (its D540 lines kept); the ladder test; the five players at their hashes and seat configs; the
    code since D540's merge changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` in `players.json`
    alone, by one player; `hostBase('j215')` 519,000,000; the job's readers tested on synthetic files; a 4-game
    ladder match against `search-v2-no-b` under another host and a 4-game recorded run against Forge Default (the
    confirm set's first pair). **The match is played only if** both keys' windows summed over those 8 games are above
    0, none of the 8 ended in an engine error or a timeout, and the two keys' retries together are at most 2 a game;
    otherwise the job writes the match as NOT PLAYED with the condition it failed. A D540 counter above 0 in B, a
    lands counter above 0 in A, or a searched priority decision on a non-empty stack stops the night as a pilot
    failure.
11. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game, residual sd 0.15 h) read at four times the games put J211 at 9.01 h against its 8.57 and J197
    at 9.41 h against its 9.50. B searched 18.8–19.1 s a game in J214; A should search about B's plus both arms'
    extra seconds, 0.6 s for `declined` and 2.1 s for `instant`, so about 21.7 s, and somewhat more if the declined
    spells in the instant-speed windows add candidates there; 21–23 s. Both sides about 40–42 s a game: about 8.8–9.3
    h for the match, 9.0 h at the middle. J214's pilot took about 10 minutes for 24 games; this one plays 8. About
    9.2 h in all (range 8.5–10.5 h); about 10.5 h if memory pressure holds the night at 6 workers and about 12.6 h at
    5. The match stops itself at `--hours 13.5` and the step's timeout is 14 h; a match that reaches its own stop is
    `complete: false` and gets no reading.

**Under D509: the atlas's seat and the live seat are unchanged.** This lane changes no file under `bridge/src`,
`tools/ai-bench` or the ladder's code: one player appended to `tools/ai-ladder/players.json`, a test, the ladder
guide's line, PLAN's rows and this file. The atlas's seat and `SearchConfig.LIVE_DEFAULTS` read none of them, so the
next atlas night's `seat_code` check has nothing new to admit, and the lane is free under D509 as D519 was.

**Hidden information and threads.** Nothing new: the player runs D540's two keys, whose argument is D540's
(*Hidden information* and *threads*, there). No wire, `Snap`, `CardView` or thread change.

**The hypothesis, registered as information before any game (no check reads it).** J214's two points are single
1,200-game draws, picked for this match because they were positive, so each key's true effect is more likely below
its point than above it; and across the six 1,200-game points of J212 and J214 the spread is no wider than their
noise (the second *Context* bullet), which points the same way, toward effects near their common mean of about +5
Elo each. If both were true as measured and added, the pair would be about +16 Elo; if each is near +5 and they add,
about +10; if they overlap, about +5. With the score standard error J211 had at 4,800 games (0.0039, about 2.7 Elo;
J197's 0.0036 gives slightly sharper numbers), the chance of each reading by the true effect is, from the normal
approximation of the score:

| true effect | SHOWN | SMALL GAIN | NOT SHOWN |
|---|---|---|---|
| 0 | 0.0% | 2.5% | 97.5% |
| +3 Elo | 0.0% | 19.7% | 80.3% |
| +5 Elo | 0.0% | 45.4% | 54.6% |
| +8 Elo | 0.5% | 83.4% | 16.1% |
| +10 Elo | 3.3% | 92.5% | 4.2% |
| +12 Elo | 13.5% | 85.9% | 0.7% |
| +16 Elo | 64.4% | 35.6% | 0.0% |
| +20 Elo | 96.7% | 3.3% | 0.0% |

So a true +8 reads SHOWN or SMALL GAIN about five times in six (84%), a true +5 a little under half the time (45%),
and a truly null pair reads SMALL GAIN about 2.5% of the time (the lower end's one-sided error), which is why a
SMALL GAIN is a candidate for the owner's decision and not an adoption. INCONCLUSIVE AT 4,800 has no row: at this
width it cannot happen (point 5).

**Rejected.**

- **Confirming either J214 arm alone at 4,800 games.** D540 point 9 does not confirm an INCONCLUSIVE AT 1,200, and
  each key alone is the smaller effect: a confirmation of `instant` at its +10.4 would be the INCONCLUSIVE band's
  high draw, the selection J197's hypothesis warned about (D519 point 8). The pair is a new player with a new rule.
- **Adding `aturns=1` from J212 as a third key** (`search-v2-a1`, +5.2 [−5.7, +16.2]). It changes the attack
  rollouts' horizon and their cost, a different question from what the priority search considers, and a pair that
  read SMALL GAIN with it could not say which of three questions paid.
- **Playing `lands` again,** alone or in the pair. J214 read it NOT SHOWN (+1.2 [−9.6, +11.9]) and D540 point 9 does
  not play it again.
- **Three arms at 1,600 games each** (`declined`, `instant` and the pair, one night). Each interval would be about
  ±9 Elo, too wide to separate +8 from 0, so the night would repeat J214's shape; the night's games buy one
  resolvable answer instead.
- **Pooling J214's games** into this match, or reading this match against them. The games that chose the pair would
  sit inside its test (D398; D519's Rejected).

**What is unverified.**

- **That the two keys interact as their code reads.** No self-test turns both on at once; the ai-bench self-test's
  D540 scenarios run one key each. The pilot's 8 games are the first in which both fire in one seat, and its
  recorded run says where the searched windows were.
- **The declined spells in the instant-speed windows**: how often they appear, and whether an aimed instant at the
  opponent's end step behaves on the real game as the own-main aims did in J214. The match's counters say how often;
  nothing here says whether it is good.
- **The cost**: interpolated from J214's two arms; the pilot's 4 ladder games and the match measure it.
- **That `hostBase('j215')`'s blocks are unplayed everywhere**: read from the lab's four checkouts and the job files
  on 2026-11-12; the job's block reader checks the match's own folder only.
- One opponent and one deck set: the live seat and the confirm set's 30 deck pairs, as every search number since
  D398.

**Verification (the lane, 2026-11-12, at `7ff7d6ab2` with this lane on top):**

- `./tools/check-forge.sh`: the pinned jar, `3c0a7c38…8e5dd9`. `./bridge/build.sh`: build OK; the lint's self-test
  33 rules, 79 firing cases; the lint 97 files under `bridge/src` and 4 under `tools/`; **decision self-test 472
  checks, 0 failures** (D540's count, as nothing under `bridge/src` changed).
- `./tools/ai-ladder.sh list`: `search-v3-declined-instant` at `af6771947a25` with the seat config of point 1; every
  other line identical to the list main prints (55 players, their hashes and configs unchanged).
- `node --test web/test/ai-ladder.test.ts` 56 of 56; `web/test/claude-md.test.ts` 5 of 5; `node tools/decisions.mjs
  check` OK.
- **J215's pilot, dry-run at the lane's head `c474f9a9b`** (`tools/runner.sh dry-run --pilot-only`, sandboxed over
  this worktree, 2 workers): seven blocks, each exit 0 (51 s, the build and the self-tests; 154 s, the 4-game ladder
  match; 62 s, the 4-game recorded run); 45 of its 46 pilot checks pass, the one that fails being `merged == 1`
  (the lane is not on `origin/main`); the verdict's self-test 47 of 47 cases, the exposure reader's 5 of 5, the
  recording reader's 13 of 13, the block, rollout and gate readers' each ok; the ai-bench self-test 352 checks, 0
  failures. **The gate passed:** over the 8 games `search.p.declined.windows` 46 (33 ladder, 13 recorded) and
  `search.p.instant.windows` 15 (7 and 8), no error or timeout, no retry; B's D540 counters and A's lands counters
  all 0; both sides searched priority and attacks and no block. In the recorded games every searched priority
  decision was in the seat's own main phase (63) or an empty-stack instant-speed window (8, all with 2 candidates:
  no declined spell was listed in one in these 4 games), none on a stack and none in a land window. A searched 19.9
  s a game against B's 16.5 over the 4 ladder games (×1.21; J214's pilots ran ×1.18 to ×1.29 and the matches ×1.03
  to ×1.16).
- Not run on the lane: the full gate (the coordinator's, at the merge; its line is in the merge commit's message).

**Follow-up.** J215 plays the match at this lane's merge; its `report.md` carries the reading, both keys' exposure
and the cost, and `summary.md` (the PC session) words them. A SHOWN or SMALL GAIN goes to the owner as a seat-queue
row under its own decision. Its row in PLAN is the cube lab's 58.

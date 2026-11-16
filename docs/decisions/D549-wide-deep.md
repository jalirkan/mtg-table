## D549 — the wide windows and the deeper horizon together: `search-v3-wide-t1-x2` against the live seat's config, one fixed 4,800-game match on the dev deck set, read by D519's four readings written before any game; the reading fixes whether the PC session recommends the combined player in place of its two parts, and moves no seat (J222)

*Branch `pc/d549-wide-deep`, off main `afe4f3e63` (D548's merge). Reads J220 (D547; `results/J220/` on `pc-results`:
`summary.md`, `report.md`, `verdict.json`, `rollouts.json`, `match-J220.json`) and J221 (D548; `results/J221/`:
`summary.md`, `report.md`, `verdict.json`, `pairs.json`, `exposure.json`), and the `j218`, `j220` and `j221` matches'
result rows in the lab checkout's `var/`, read-only. One ladder player appended to `tools/ai-ladder/players.json`, its
case in `web/test/ai-ladder.test.ts`, the ladder guide's line, PLAN's rows and this file; no file under `bridge/src`,
`tools/ai-bench` or `tools/ai-ladder/*.ts` changes and every registered hash is unchanged. `node tools/decisions.mjs
next` printed D549 on this lane.*

**Status: registered; built, self-tested and the pilot dry-run on the lane (*Verification*); unplayed. J222 plays
it, alone.**

**2026-11-16**

**Context.**

- **Two steps over the live seat's config (`search-v3-declined-instant`, `af6771947a25`, search-v4), each measured
  alone, never together.** `search-v3-wide` (`b95340935592`, D544: `stackwin`, `passwin`, `dactiv`): J217 SMALL GAIN on
  the confirm set, +6.9 Elo [+1.5, +12.4]; J221 NOT SHOWN alone on the dev set, +3.6 [−1.3, +8.6]; pooled +5.3 [+1.6,
  +9.0], so D548 point 9's recommendation STANDS, carried by the pooled line; 23.4 against 21.3 search seconds a game
  (×1.095), 897 against 895 ms a searched decision, A searching 125,130 decisions against B's 114,453; the union 0.30
  changed decisions a game. `search-v3-declined-instant-t1-x2` (`5319a60d7e3b`, D547: `turns=1`, `budgetMs=3000`):
  J220 SMALL GAIN on the confirm set, +14.2 [+7.8, +20.6], score 0.5204 [0.5112, 0.5296], 0 draws, errors or
  timeouts, 14.5 h at 7 workers; 51.9 against 20.9 s a game (×2.48), 2,084 against 848 ms a decision, 16.54 against
  16.48 rollouts a decision, 115.3 against 45.0 ms of play a rollout (×2.562), 4.29% against 2.67% of decisions short
  of two rounds.
- **The owner's choice is open** (D509's seat queue). Adopting either part makes the other an increment over a seat
  that is no longer live (D548 point 9's last bullet), and whether the two add up has not been measured: the deeper
  rollouts may be worth more or less in the stack windows, and the wide windows' extra decisions cost 2 s each at
  this clock instead of 0.9 s.
- **J221's longest game ran 1,732 s** (32 turns, `synergy-900000002`, at 1.5 s against 1.5 s), 68 s under D548's
  1,800 s cap; J220's longest on the confirm set 492 s, J218's on the dev set 1,517 s at 4.5 s.

**Decision.**

1. **The player: `search-v3-wide-t1-x2`, config hash `709c83cc4d48`** (the ladder's own `resolvePlayer` and
   `configHash`, `node tools/ai-ladder/cli.ts cfg`): `search-v3-wide`'s params with `"turns": 1` and
   `"budgetMs": 3000`, nothing else different, so `search-v3-declined-instant-t1-x2`'s with the three window keys;
   `aturns` unset, so attacks follow `turns` (`SearchConfig.horizonFor`); the round cap 12. Seat config:
   `Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`.
   Every searched priority decision, the stack and pass windows among them, takes `horizonFor("p")` (both search
   paths in `SearchPolicy` read it), so the whole player rolls out one turn further.
2. **The match.** One fixed 4,800-game match (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule), alone
   (D521), A = `search-v3-wide-t1-x2` against B = `search-v3-declined-instant` (`af6771947a25`, fixed as in D548 point
   3), on the dev set (`--pairs tools/ai-bench/pairs-dev.txt`), at `--game-timeout 3600`, stopping itself at `--hours
   29`. **The code**: J222 is pinned to this lane's merge, which against J221's pin `afe4f3e63` changes under
   `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` only `players.json`, by this one player appended (2 lines in,
   1 out); `git diff 847e50a29 afe4f3e63` there is empty, so J220, J221 and J222 play one code version. The pilot
   checks it by content (D547 point 10's form).
3. **The deals.** `--host j222` in `var/j222-ladder`, emptied by its step: `hostBase('j222')` is 508,000,000, so the
   match plays **blocks 508,900,000–508,900,599**, 40 batches for each dev pair, on a first run and on a retry. **The
   pilot's host is `j222-pilot2`, base 829,000,000**, whose first block 829,900,000 deals dev pair 10,
   `pauper-900000000`, at one batch pair (D548 point 4's lesson: a pilot's first block deals pair 0, 10 or 20 only;
   `j222-pilot` would deal pair 0, `fair-fight-900000000`, where the windows open least, D548 point 13's table). The
   recorded run takes `modern-era-900000002` by name, as J221's did. Of the 384,283 ladder result rows under the lab
   checkout's `var/` (312 files, 40 bases, read 2026-11-16 after J220) and the 343 under this machine's `mtg-table*`
   checkouts' `var/` (26 files), none is on base 508 or 829 and none names either host; no job file in `pc-jobs/jobs/`
   or `drafts/` and no result under `pc-results/results/` names `j222` or a block on either base.
4. **Complete** when D548 point 5's parts hold with this match's names, hashes, set and blocks (the dev set, the
   rebuilt pairs, B with no D544 counter above 0), **and** D547 point 3's two: neither side shows a
   `search.p.lands.` counter above 0, and **A's ms of play a finished rollout is at least 1.3 times B's** (the
   horizon's trace; J220 ×2.562, J218 ×2.84). A valid-looking match under the trace's bar is INCOMPLETE and owed a
   new decision, never a repost unchanged (D547 point 3); any other incomplete match is owed a repost alone under a
   new job id after its cause is found.
5. **NOT READ** as D548 point 6: the three keys' floors described, and no reading when they changed fewer than 0.25
   decisions a game together (`changed × 4 < played`): without the wide windows this is J220's player on new decks,
   not the combination. Not played on the dev set again without a new decision.
6. **The readings, written before any game**, D519's four at 4,800 as D548 point 7 and D547 point 4 write them, for a
   complete match that is not NOT READ (`lo` in integer ten-thousandths, Elo in integer tenths): **SHOWN** `lo` > 0.5
   and `elo` ≥ +15; **SMALL GAIN** `lo` > 0.5 and `elo` < +15; **INCONCLUSIVE AT 4,800** `lo` ≤ 0.5 and `eloHi` ≥ +15;
   **NOT SHOWN** `lo` ≤ 0.5 and `eloHi` < +15. Beside it, deciding nothing: indistinguishable, a measured loss, a
   measured gain.
7. **What it decides: the PC session's recommendation.** **SHOWN or SMALL GAIN**: `search-v3-wide-t1-x2` is the one
   live-seat candidate the PC session recommends to the owner, in place of `search-v3-wide` and
   `search-v3-declined-instant-t1-x2` separately, with its point, interval and cost (search seconds a game, ms a
   decision) beside both parts' numbers. **INCONCLUSIVE AT 4,800 or NOT SHOWN**: the match recommends nothing; the two
   parts stand on their own evidence (J217 and J221, J220), and the report describes rollouts a decision, the share of
   decisions short of two rounds and the three window counters a game beside J220's and J221's so the interaction
   can be read. **No reading** (NOT PLAYED, NOT READ, INCOMPLETE): OPEN, nothing recommended, the parts stand.
   Adoption is the owner's under a separate decision; **this match moves no seat** (`SearchConfig.LIVE_DEFAULTS` is
   unchanged whatever it reads). The summary says beside a recommendation that the combination is read on the dev set
   only, while each part has a confirm-set reading (J217, J220; the confirm set is the one the ladder rates on, D318).
8. **Never pooled with, and never read as a difference against, J217, J218, J220 or J221**: other players, other
   sets or other deals, J218 another code version. Described beside them as their numbers were: J220's and J221's
   lines, costs and depth, J217's line, J218's line and cost.
9. **Beside the reading, as description** (D548 point 12 and D547 point 9 together): each key's windows a game,
   candidates a window, changes and retries a game, the refusals and their reasons; both sides' declined and instant
   windows; searched decisions by kind, ms a searched decision, search seconds a game, their ratio and D519 point 5's
   "no cost" flag; rollouts and complete rounds a decision, the share short of two rounds, budget fallbacks, ms of
   play and copy a rollout and the trace's ratio; the overrides by direction; land windows left to Forge; games per
   dev pair; timeouts, and the score with every timed-out game counted as A's loss (`pairs.json`'s `toLoss`).
10. **The pilot, and both things its gate must show** (D548 point 13 and D547 point 10, joined). The build (the
    decision self-test at 0 failures and exactly 514 checks, the ai-bench self-test at 0 failures and exactly 476),
    the ladder test, six players at their hashes, point 2's code check, the bases, the readers on synthetic files; a
    4-game ladder match of A against B under `--host j222-pilot2` on the dev set, so on `pauper-900000000`, and a
    4-game recorded run of A against Forge Default on `modern-era-900000002`. **The match is played only if**, over
    those 8 games: **the wide windows open** (`search.p.stackwin.windows` and `search.p.dactiv.windows` each above 0,
    `passwin` reported; the three keys' retries together at most 2 a game; the stack windows refused under half of
    those met, D544 point 19) **and the rollouts are deeper** (every searched priority and attack decision in A's
    records carries horizon 1, at least one of each and none at another; A's ms of play a rollout in the 4 ladder
    games at least 1.3 times B's; at most 15% of A's searched decisions short of two rounds); none ended in an engine
    error or a timeout; `search.p.declined.retry` and `search.p.instant.retry` together at most 2 a game. Otherwise
    the match is NOT PLAYED, with the condition it failed. A lands counter on either side, a D544 counter in B, a
    searched priority decision on a stack whose top item is the seat's own, or a player off its hash stops the night.
11. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game), at four times the games: B 21.3 s a game on the dev set (J221's B), A about 56.8 s (J220's 51.9
    × J221's 1.095), both about 78 s: **15.5 h by the fit** (J220 ran 14.48 h, 0.7% under it; J221 9.42 h, 2.6% under), so about 15.5 h at 7
    workers (range 14.5–17 h), about 18 h at 6. `--hours 29` under a 31 h step timeout: a full replay after a memory
    stop fits at 5 workers (about 21.7 h) and at 4 (27.1 h, 28.1 h at J218's excess over the fit), and 2 h after the
    stop is left for a batch running past it, one game at the 3,600 s cap and its grace beside the batch's others. The
    timeout, 3,600 s: J221's 1,732 s game, with A thinking about 2.4 times as long, would run about 3,000 s; it cuts
    only a stuck game. The pilot about 15 minutes.

**Under D509: the atlas's seat and the live seat are unchanged.** One player appended; nothing `SearchConfig.parse`,
`parseLive` or the atlas's seat reads moves. **Hidden information and threads**: nothing new (D544's and D545's
arguments; `turns` and `ms` are config `SearchPolicy` already honours).

**The hypothesis, registered as information before any game (no check reads it).** If the parts add up, about +19.5
Elo (+14.2 and +5.3, each on its own deck sets); if the windows add nothing on top of the deeper rollouts, about
J220's +14. With J218's pair standard error on the dev set (0.0047743, a deeper player there; SMALL GAIN needs a
point above about +6.5) and J221's in brackets (0.0036391, +5.0): a true 0 reads SHOWN or SMALL GAIN 2.5% [2.5%];
+5, 32.5% [50.7%]; +10, 85.4% [97.7%]; +14.2, 99.0% [100%], SHOWN 40.5% [37.6%]; +19.5, 100% [100%], SHOWN 91.2%
[96.2%].

**Rejected.**

- **The confirm set.** Both parts' keys and clock were chosen where J217 and J220 read; the dev set holds 30 drafts
  neither J217 nor J220 played. The price, said in point 7: the combination has no confirm-set reading.
- **A 2×2 of matches between the parts** (wide against t1-x2, the combination against each part): it reads the
  players against each other in four matches; the owner's question is what to adopt over the live seat, which one
  match answers.
- **Pooling with J220 or J221, or reading the interaction as J222's point less the parts'**: other sets, deals and
  matches; the description is the interaction's whole read (point 7).
- **`--game-timeout 1800`**: J221's longest game came within 68 s of it at half this player's thinking.
- **The wide keys at `turns=1` and 1.5 s**: J212's `t1` at 1.5 s starved (11.8% short of two rounds, −1.7 Elo).
- **A 1,200-game screen first**: ±11 Elo cannot tell the combination from either part.

**What is unverified.**

- **The cost and the hours**: a product of J220's and J221's ratios on two deck sets; the pilot's 4 ladder games
  and the match measure them.
- **That the wide windows open as often at `turns=1`**: the gate needs 8 games on two chosen pairs; D548 point 13's
  0.1% estimate was made at `turns=0`.
- **The width on the dev set for this player**: the hypothesis assumes J218's or J221's standard error.
- **That bases 508 and 829 are unplayed everywhere**: read on 2026-11-16 from the rows and job files named in point
  3; the job's block reader checks its own folder only.
- **That 3,600 s and 2 h after the stop are enough**: from one 1,732 s game scaled by the thinking ratio.
- One opponent, one deck set; out of sample in decks and deals, not in card pool (the same six cubes).

**Verification (the lane, 2026-11-16, at `afe4f3e63` with this lane on top; the lab idle after J220):**

- `node tools/decisions.mjs next`: D549 before this file. `node tools/ai-ladder/cli.ts cfg search-v3-wide-t1-x2`:
  `709c83cc4d48` and point 1's seat config; `list` is main's output with exactly this one line added
  (`search-v3-wide` `b95340935592`, `-t1-x2` `5319a60d7e3b` and the pair `af6771947a25` unchanged). `hostBase` under
  node: `j222` 508,000,000, `j222-pilot2` 829,000,000 (first block deals dev pair 10, `pauper-900000000`;
  `j222-pilot` 813,000,000 would deal pair 0). The block and key scans of point 3, by Python over the rows.
- `./tools/make-forge-home.sh` OK, `./tools/check-forge.sh` OK (sha256 `3c0a7c38...8e5dd9`); `./bridge/build.sh` rc
  0: the lint's self-test OK (33 rules, 79 firing cases, 93 checks), the lint OK, the eval self-test 8,039 checks,
  the grade self-test 132, **the decision self-test 514 check(s), 0 failure(s)**, the distill self-test 38;
  `./tools/ai-bench.sh --selftest` **476 check(s), 0 failure(s)**.
- The draft's readers and the pilot dry-run: below, after this commit.

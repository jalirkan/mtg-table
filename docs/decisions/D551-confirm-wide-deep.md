## D551 — the combination on the confirm set, against the wide seat: `search-v3-wide-t1-x2` against `search-v3-wide`, one fixed 4,800-game match on the confirm deck set, read by D519's four readings written before any game; a SHOWN or SMALL GAIN is the PC session's recommendation of a 3 s live seat to the owner, and no seat moves (J223)

*Branch `pc/d551-confirm-wide-deep`, off D550's lane head `cc417e4d1` (on main `6fd2e726d`, D549's merge and J222's
pin), so that PLAN's rows line up and the two lanes merge in order. Reads J222 (D549; `results/J222/` on
`pc-results`: `summary.md`, `report.md`, `match-J222.json`, `STATUS`; and the `j222-ladder` match's own result rows in
the lab checkout's `var/`, read-only) and the result rows of J217, J220 and J221 for the confirm set's widths, window
rates and game lengths. No player, config, hash, script or test changes: both players are registered (D544, D549),
and this file and PLAN's rows are the whole change. `node tools/decisions.mjs next` printed D551 on this lane.*

**Status: registered; text only, no Java, build or game on the lane (*Verification*); unplayed. J223 plays it,
alone, after D550's and this lane's merges.**

**2026-11-17**

**Context.**

- **J222 read SHOWN** (D549; 2026-11-16 11:09 to 2026-11-17 05:38, mtg-table `6fd2e72`, alone, 18.31 h of match).
  `search-v3-wide-t1-x2` (`709c83cc4d48`) against `search-v3-declined-instant` (`af6771947a25`, search-v4) on the dev
  set, blocks 508,900,000–508,900,599: 2,542 wins of 4,800, 2 draws, 2 engine errors, 0 timeouts, 28 of 28 checks;
  score 0.5298 [0.5203, 0.5393], **+20.7 Elo [+14.1, +27.3]**; 58.5 against 21.5 search seconds a game (×2.72), 2,099
  against 864 ms a searched decision; 16.09 against 16.37 rollouts a decision, 3.99% against 2.58% of decisions short
  of two rounds, ×2.585 the play time a rollout; the three keys 0.478 changed decisions a game. Under D549 point 7 the
  combination is a live-seat candidate put to the owner beside its two parts, with no claim that it beats either.
- **D550 adopts `search-v3-wide`** (`b95340935592`) as the live seat, search-v5, at the 1.5 s clock (the owner's yes,
  2026-11-16; its lane `pc/live-seat-wide`, head `cc417e4d1`, verified, awaiting its review and the gate). J222's
  summary recommended, from cost and not from its reading: `search-v3-wide` if the table keeps 1.5 s,
  `search-v3-wide-t1-x2` if it takes 3 s, and `t1-x2` alone at neither clock; the PC session recommended the 3 s clock.
- **No match has been played between the combination and `search-v3-wide`, on any set.** J222 read the combination
  against the old seat on the dev set; promotion reads the confirm set (D318). The owner's question after D550 is
  whether the deeper horizon at twice the clock beats the seat the table now plays, on the set the seat is promoted on.
- **The confirm set has seen both players' parts**: J217 (`search-v3-wide` against the pair, +6.9 Elo [+1.5, +12.4],
  pair standard error 0.0040138) and J220 (`search-v3-declined-instant-t1-x2` against the pair, +14.2 [+7.8, +20.6],
  0.0046966; both by the ladder's own `pairScores` and `matchSummary` over their rows); neither combination nor any
  match of the two together.

**Decision.**

1. **The match.** One fixed 4,800-game match (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule), alone
   (D521), on the confirm set (`--pairs tools/ai-bench/pairs-confirm.txt`, the ladder's default, as J215, J217 and
   J220 play it), at `--game-timeout 3600`, stopping itself at `--hours 29`:
   - A = `search-v3-wide-t1-x2` (`709c83cc4d48`, D549 point 1):
     `Default+outlets+search:ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`;
   - B = `search-v3-wide` (`b95340935592`, D544), the live seat once D550 merges:
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`.

   A's seat config is B's with `ms=1500` made `ms=3000` and `turns=0` made `turns=1` and nothing else, so the match
   reads the deeper horizon and the doubled clock together, with the wide windows on both sides. The ladder plays B
   by its name and hash through `SearchConfig.parse`, never `parseLive`, so whether D550 has merged changes nothing B
   plays; the wording "the live seat" is the only thing here that depends on it. B is written once as a constant in
   each place that names it (D548 point 3).
2. **The code.** J223 is pinned to this lane's merge. Against J222's pin `6fd2e726d`, the code under `bridge/src`,
   `tools/ai-ladder` and `tools/ai-bench` differs by D550's six files as its lane head `cc417e4d1` has them, and by
   nothing of this lane's (`git diff --name-only 6fd2e726d cc417e4d1`, read on the lane): `MtgTable.java`,
   `RecordMatch.java`, `DecisionSelfTest.java`, `SearchConfig.java`, `SearchPolicy.java` and `players.json`. The changed
   lines in the four that hold code a game could reach that are not comments are exactly six: `LIVE_VERSION`
   (`search-v4` → `search-v5`) and `LIVE_DEFAULTS` (`...,declined=1,instant=1` → `...,stackwin=1,passwin=1,dactiv=1`
   appended) before and after, and the start line's words (`", D412, D539, D546"` → `", D412, D539, D546, D550"`);
   both constants are read only by `parseLive`, which no ladder seat goes through (D546's argument, D548 point 2's
   check); `DecisionSelfTest.java` is the build's self-test (514 → 526 checks), which no game runs; `players.json`
   changes the notes of two players and no name, kind or params, and adds none. From J220's pin `847e50a29` to J222's,
   `players.json` alone, with D549's one player appended (J222's own check). So J220, J221, J222 and J223 play one
   search code. The pilot checks this by content (D548 point 2's form, `sd`). **If D550's review changes any of its
   code before it merges, this check fails the pilot, and this point is rewritten before J223 is posted.**
3. **The deals.** `--host j223` in `var/j223-ladder`, emptied by its step: `hostBase('j223')` is 405,000,000, so the
   match plays **blocks 405,900,000–405,900,599**, 40 batches for each confirm pair, on a first run and on a retry.
   **The pilot's host is `j223-pilot3`, base 548,000,000**, whose first block 548,900,000 deals confirm pair 20,
   `synergy-900000001`, at one batch pair: a pilot's first block deals pair 0, 10 or 20 only (D548 point 4), and
   `j223-pilot` (954,000,000) and `j223-pilot2` (651,000,000) both deal pair 0, `fair-fight-900000001`, where
   declined-activation windows opened least of the three (the table below). The recorded run takes
   `modern-era-900000001` by name. **The scans** (2026-11-17, after J222, by Python over every `results/*.jsonl` row
   that carries a `bseed`, base = `bseed` div 1,000,000): of the 389,092 ladder result rows under the lab checkout's
   `var/` (315 files, 42 bases; the other three lab checkouts' `var/` are links to it) and the 348 under this
   machine's `mtg-table*` checkouts' `var/` (27 files; D549's 343 and 5 synthetic rows of D549's own block-reader
   self-test, on base 508), none is on base 405 or 548 or names a `j223` host; no job, draft or result under `pc-jobs`
   or `pc-results` names `j223` or a block on either base (the one hit for the digits is a float inside J127's
   `model.json`).

   The window rates that chose the pilot's pairs, from J217's 4,800 games (`search-v3-wide` at 1.5 s against the pair,
   160 games a confirm pair, A's batch counters; scores not read): the share of games in which a key's windows were
   above 0.

   | confirm pair | stack windows open | declined activations open | pass windows open |
   |---|---|---|---|
   | 0 `fair-fight-900000001` (`j223-pilot`'s and `-pilot2`'s pair; J217's and J220's recorded run) | 0.425 | 0.200 | 0.169 |
   | 10 `pauper-900000001` | 0.588 | 0.231 | 0.569 |
   | 20 `synergy-900000001` (`j223-pilot3`'s: the ladder pilot) | 0.412 | 0.506 | 0.169 |
   | 5 `modern-era-900000001` (the recorded run) | 0.656 | 0.700 | 0.319 |

   Treating games as independent at these rates, the gate's window conditions on A (point 10) keep the match out
   about 0.2% of the time with pair 20 and `modern-era-900000001` ((0.588)⁴ × (0.344)⁴ ≈ 0.0017 for stack windows,
   (0.494)⁴ × (0.300)⁴ ≈ 0.0005 for declined activations), about 0.3% with pair 10 and 0.5% with pair 0. The rates are
   A's at 1.5 s against the pair; here A thinks 3 s at `turns=1` and plays B or Forge.
4. **Complete** when D549 point 4's parts hold with this match's names, hashes, set and blocks (the confirm set, the
   rebuilt pairs, neither side with a `search.p.lands.` counter above 0, A's ms of play a finished rollout at least
   1.3 times B's), with **one part replaced, because B is wide**: in place of D548 point 5's "B's batch counters show
   no `search.p.stackwin.`, `search.p.passwin.`, `search.p.dactiv.` or `search.wide.` counter above 0" (B's keys-off
   path, which B no longer has), **B's `search.p.stackwin.windows` and `search.p.dactiv.windows`, summed over the
   match's batch lines, are each above 0** (B played as `search-v3-wide`: J217's A opened 1.293 stack and 1.705
   declined-activation windows a game on this set; a sum of 0 over 4,800 games is a config or code fault). B's D540
   and D544 counters are otherwise its own keys and description. A valid-looking match under the trace's bar is
   INCOMPLETE and owed a new decision, never a repost unchanged (D547 point 3); any other incomplete match is owed a
   repost alone under a new job id after its cause is found.
5. **NOT READ as D549 point 5**, on A's side: no reading when A's three keys changed fewer than 0.25 decisions a game
   together (`changed × 4 < played`): without the windows acting on A's side the match is not the combination J222
   read. The keys' floors are described, B's own window counters beside A's. Not played on the confirm set again
   without a new decision.
6. **The readings, written before any game**, D519's four at 4,800 as D549 point 6 writes them, for a complete match
   that is not NOT READ (`lo` in integer ten-thousandths, Elo in integer tenths): **SHOWN** `lo` > 0.5 and `elo` ≥ +15;
   **SMALL GAIN** `lo` > 0.5 and `elo` < +15; **INCONCLUSIVE AT 4,800** `lo` ≤ 0.5 and `eloHi` ≥ +15; **NOT SHOWN**
   `lo` ≤ 0.5 and `eloHi` < +15. Beside it, deciding nothing: indistinguishable, a measured loss, a measured gain.
7. **What it decides: the PC session's recommendation to the owner. It amends D549 point 7.**
   - **SHOWN or SMALL GAIN — RECOMMEND**: the PC session recommends to the owner that the live seat become
     `search-v3-wide-t1-x2` at a 3 s clock, with this match's point, interval and cost (search seconds a game, ms a
     searched decision) beside J222's. The clock at the table is the owner's to decide; the adoption is a later
     decision with its own lane (D550's form), and nothing moves here.
   - **INCONCLUSIVE AT 4,800 or NOT SHOWN — STAYS**: `search-v3-wide` stays the live seat, and the PC session does not
     recommend the 3 s clock: J222's summary recommended it from cost on a dev-set reading against the old seat, and
     this is the match it said came next. The report describes rollouts a decision, the share short of two rounds and
     both sides' window counters beside J222's and J220's.
   - **No reading (NOT PLAYED, NOT READ, INCOMPLETE) — OPEN**: nothing recommended and nothing withdrawn;
     `search-v3-wide` stays the live seat; an INCOMPLETE match is owed a repost under a new job id after its cause is
     found (or a new decision, point 4), and a NOT READ one is not played on the confirm set again without a new
     decision.
   - **It amends D549 point 7**: after D550 the three candidates are no longer peers, since `search-v3-wide` is the
     seat; this reading settles whether the combination is recommended over it, and `t1-x2` alone is recommended at
     neither clock (J222's summary). **This match moves no seat** (`SearchConfig.LIVE_DEFAULTS` is D550's whatever it
     reads).
   - **What a reading does not say**: A differs from B by the horizon and the clock together, so a reading never
     separates them (D547 point 7), never says what either is worth alone on top of the wide windows, and says nothing
     beyond these 30 deck pairs of six cubes and this one opponent.
   - **If the owner moves the seat before J223 reads**: to `search-v3-wide-t1-x2` at 3 s, J223 reads the same match
     after the fact and its recommendation is on keeping it (STAYS then recommends going back to `search-v3-wide`); to
     anything else, B stays pinned by its hash and the readings stand as written, but RECOMMEND then names an
     increment over a seat that is no longer live (D548 point 9's last bullet).
8. **Never pooled with, and never read as a difference against, J217, J218, J220, J221 or J222** (other opponents,
   sets, deals or code). Their lines, costs and depth are described beside it as they were; J222's +20.7 less
   `search-v3-wide`'s +5.3 is never computed as a prediction or a check.
9. **Beside the reading, as description**: D549 point 9's list, with B's three keys' windows, candidates, changes and
   retries a game beside A's (both sides search the wide windows), B's D540 counters, and both sides' window counters
   against J217's A (the same B config on this set).
10. **The pilot, and its gate**: D549 point 10's, with these changes and why.
    - **Build bars**: the decision self-test at 0 failures and exactly **526** checks (D550's build on its lane,
      `cc417e4d1`, 2026-11-17; this lane adds no source), the ai-bench self-test at 0 failures and exactly 476
      (unchanged since J217's pin: `tools/ai-bench` is untouched by D546 to D551), the ladder test; the same six players
      at their hashes; point 2's code check; the bases and the pilot's pair; the readers on synthetic files.
    - **The runs**: a 4-game ladder match of A against B under `--host j223-pilot3` (so on `synergy-900000001`) and a
      4-game recorded run of A against Forge Default on `modern-era-900000001`.
    - **Removed: "B's D544 counters all 0" as a night stop** (D549's pilot `bClean` and the verdict's `bClean`
      part). It held B's keys-off path; B is now `search-v3-wide` and its keys are on by config. In its place nothing
      new is gated in the pilot: B's seat config is held exactly by the players check (written out, and `wideAtDepth`:
      A's config is B's with `ms` and `turns` changed and nothing else) and by every batch line's config; B's windows
      in the 4 ladder games are reported, not gated. At J217's rates on `synergy-900000001` a gate on B's own windows in
      4 games would keep a sound match out about 17% of the time ((0.588)⁴ + (0.494)⁴ − both); over 4,800 games the
      completeness part of point 4 holds it instead.
    - **Kept, on A's side, as D549 wrote them**: the wide windows open (A's `search.p.stackwin.windows` and
      `search.p.dactiv.windows` over the 8 games each above 0, the three keys' retries at most 2 a game, under half the
      stack windows refused): the candidate is the combination, and its windows must open at `turns=1` and 3 s on the
      confirm decks. B's windows are B's config, read on this set in J217.
    - **Kept: the rollouts deeper** (every searched priority and attack decision in A's records at horizon 1, at least
      one of each; A's ms of play a finished rollout in the ladder games at least 1.3 times B's; at most 15% of A's
      decisions short of two rounds). The ratio still reads the horizon: B is at `turns=0`, and its own wide windows'
      rollouts run to the end of the turn as every turn-0 rollout does. J222's pilot read ×2.529 against the non-wide
      B and its match ×2.585, so B's extra stack windows are not expected to move it near 1.3; that is an estimate.
    - **Kept**: no engine error or timeout in the 8 games, A's declined and instant retries at most 2 a game; a lands
      counter on either side, a searched decision on the seat's own stack item or a player off its hash stops the
      night. Otherwise the match is NOT PLAYED with the condition it failed, and the recommendation is OPEN.
11. **Time.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides' search
    seconds a game), at four times the games.
    - **What it said and what ran**: J220 14.48 h against its fit's 14.58 h (−0.7%), alone and unpressed; J222 **18.31
      h** of match against its fit's 15.84 h (+15.6%): the job ran 11:09 Nov 16 to 05:38 Nov 17 (18.5 h with the
      pilot) with 30 memory-pressure drops and raises between 4 and 7 workers, because the scenery GPU job shared the
      machine's memory (its `STATUS`); most of that excess is the hours spent under 7 workers.
    - **J223**: B about 23.5 s a game (J217's A on this set, the same config), A about 56.3–56.9 s (J220's A, 51.9 s,
      × J217's ×1.0855 for the wide windows; or J222's A, 58.5 s, × the pair's confirm-to-dev ratio 20.9 / 21.5),
      both sides about 80 s a game: **15.8 h by the fit**, about 16 h at 7 workers alone (range 15–18.5 h, the top at
      J222's excess), about 18.5 h at 6. The pilot about 20–25 minutes (the ladder pilot's pair ran 116 s a game in
      J220, the slowest of the three a pilot can reach).
    - **The stop**: `--hours 29` under a 31 h step timeout, D549's. A memory-stop retry is a new attempt with the
      whole budget and one worker fewer: a full replay fits at 5 workers (about 22.2 h) and at 4 (about 27.7 h, 28.7 h
      at J218's +3.6% over the fit); 2 h after the stop is left for a batch running past it, one game at the 3,600 s
      cap and its grace beside the batch's others. J222's +15.6% is not added to a replay's figure: it came from
      hours below the worker count the fit is read at.
    - **The timeout, 3,600 s.** J222's longest game ran 1,113 s on the dev set, at both sides' 80 s a game (this
      match's thinking); J220's longest on the confirm set 492 s at 72.8 s; J217's one timeout on the confirm set was a
      33-turn game cut at 930 s at both sides' 45.1 s, which scaled by both sides' thinking (×1.77) would run at least
      about 1,650 s here — a lower bound, since the cap cut it; J221's 1,732 s dev-set game scaled the same way, about
      3,100 s. The cap is about 2.2 times the confirm set's scaled bound and 3.2 times J222's longest; that it cuts
      only a stuck game is an estimate.

**Under D509: the atlas's seat and the live seat are unchanged.** No file under `bridge/src`, `tools/ai-bench` or
`tools/ai-ladder` changes; nothing `SearchConfig.parse`, `parseLive` or the atlas's seat reads moves. **Hidden
information and threads**: nothing new (D544's and D545's arguments; both players are registered config).

**The hypothesis, as information (no check reads it).** A against B is the horizon and the clock with the wide
windows on both sides. If the deeper horizon's gain over the pair carries over on top of the windows, about +14 Elo
(J220's point); J222's point less the windows' pooled +5.3 is about +15.4 (never computed as a check, point 8). With
J220's pair standard error on this set (0.0046966, a 3 s player against a 1.5 s one; SMALL GAIN needs a point above
about +6.4) and J217's in brackets (0.0040138, +5.5), by the normal approximation, SHOWN or SMALL GAIN: a true 0 2.5%
[2.5%]; +5 33.4% [43.4%]; +10 86.5% [94.8%]; +14.2 99.2% [99.9%], of which SHOWN 40.3% [38.7%]; +15.4 99.7% [100%],
SHOWN 54.9% [55.7%]; +20.7 100% [100%], SHOWN 95.9% [97.9%].

**Rejected.**

- **The dev set again.** J222 read there; a seat change reads the confirm set (D318), and J220 and J217, the parts,
  were read there too.
- **A against `search-v3-declined-instant` on the confirm set**: it would read the combination against a seat that is
  no longer live after D550; the owner's question is against the seat the table plays.
- **`search-v3-declined-instant-t1-x2` against `search-v3-wide`**: J222's summary recommends the horizon alone at
  neither clock; the question is the combination.
- **Separating the clock from the horizon now** (`search-v3-wide` at 3 s and `turns=0`): more clock at the old horizon
  bought nothing (D547's *Context*); a later lane if the owner wants the split.
- **Pooling with J222, or reading J223 against J222 as a difference**: another opponent and another set.
- **`--game-timeout 1800`**: J217's cut game, scaled to this thinking, would run at least about 1,650 s.
- **A gate on B's windows in the pilot**: about 17% false NOT PLAYED (point 10); the match's completeness holds it.
- **The pilot on `j223-pilot` or `-pilot2`** (confirm pair 0): declined activations opened in 0.200 of its games.
- **A 1,200-game screen first**: ±11 Elo cannot tell +14 from +5.

**What is unverified.**

- **The cost and the hours**: from J217's, J220's and J222's ratios on two sets; the match measures them.
- **The code check against D550's merge**: written against D550's lane head `cc417e4d1`; a change in its review
  fails the pilot (point 2).
- **The decision self-test count, 526**: D550's lane build, not yet a full gate on main.
- **That the wide windows open as often for A at 3 s on the confirm decks, and the gate's 0.2%**: from J217's rates at
  1.5 s against the pair.
- **That bases 405 and 548 are unplayed everywhere**: read on 2026-11-17 from the rows and job files named in point 3;
  the job's block reader checks its own folder only.
- **That 3,600 s and 2 h after the stop are enough**: from one cut game scaled by the thinking ratio.
- One opponent, one deck set; out of sample in deals, not in decks (J217's and J220's) or card pool.

**Verification (the lane, 2026-11-17, at `cc417e4d1` with this lane on top; no Java, build, game or pilot by the
coordinator's brief):**

- `node tools/decisions.mjs next` printed D551 before this file. The bases under node with
  `tools/ai-ladder/schedule.ts`: `j223` 405,000,000, `j223-pilot` 954,000,000 and `j223-pilot2` 651,000,000 (both
  pair 0), `j223-pilot3` 548,000,000 (pair 20), `j223-pilot5` 754,000,000 (pair 10); the block scan and the window
  rates of point 3 by Python; J217's, J220's and J222's pair standard errors (0.0040138, 0.0046966, 0.0048354) with the
  ladder's `blockKey`, `pairScores` and `matchSummary` under node over the lab's rows (read-only); the longest games
  and spans of J217, J220, J221 and J222 from their rows; `git diff --name-only 6fd2e726d cc417e4d1 -- bridge/src
  tools/ai-ladder tools/ai-bench`: D550's six files, and its non-comment changed lines the six of point 2.
- After this file: `node tools/decisions.mjs check` OK (465 decisions, next D552); `node --test
  web/test/ai-ladder.test.ts` 62 of 62 (no player added or changed); `web/test/claude-md.test.ts` 5 of 5;
  `./tools/public-check.sh` OK.
- The J223 draft (`pc-jobs` `drafts/J223-confirm-wide-deep.md`, untracked, J222's job made this match's, its `repos:`
  sha 40 zeros for the merge commit): `./tools/runner.sh check` `lint: clean`, `machine-checked`, the pilot 7 blocks
  and 59 checks, the commands 2 blocks and 28 checks. Its node-only blocks run in this worktree (the ladder's `list`
  through `node tools/ai-ladder/cli.ts`): the players `ok` 1 (`wideAtDepth` 1), the base `ok` 1 (pair 20,
  `synergy-900000001`), the code check `exact` 1, `codeLinesOk` 1 (6 lines), `playersOk` 1 (2 notes changed),
  `sameAsJ220` 1; the readers' self-tests: exposure 10 of 10, verdict 76 of 76, recording 16 of 16, pairs 7 of 7, and
  the block, rollout and gate readers `ok`; the reading step on a synthetic NOT PLAYED file: NOT PLAYED, OPEN,
  `liveSeatChanged` 0, `report.md` written.
- **A slip, undone**: while running the draft's blocks one by one, the pilot's ladder-match block was run by mistake
  (2026-11-17 06:12 EST): it built the bridge in this worktree and started the 4-game ladder pilot; both processes
  were killed within about three minutes, and everything it wrote (`bridge/out`, `var/ai-ladder`,
  `var/ai-ladder-pilot`, the build's self-test folders, one result row on base 548 inside this worktree's own
  `var/`) was deleted. Nothing outside this worktree was touched, and the bases' scan in point 3 was read before it.
- Not run on the lane — the coordinator's: `./tools/check-forge.sh`, `./bridge/build.sh` (expect the decision
  self-test at 526 and 0 failures), `./tools/ai-bench.sh --selftest` (476 and 0), the pilot dry-run on a copy of the
  draft pinned to this lane's head (expected: 58 of 59 checks, `merged == 1` the one that fails off `main`), the
  independent review and the full gate at the merge.

## D548 — J217's match on the dev deck set: `search-v3-wide` against the live seat's config once more, one fixed 4,800-game match on the 30 deck pairs it was not read on, and a pooled read with J217, both registered before any game; the reading fixes what the PC session recommends to the owner and moves no seat (J221)

*Branch `pc/d548-wide-dev-set`, off D547's lane head `c35992ada` (on main `2a13482a9`, D546's merge), so that the two
lanes merge in one go. Reads J217 (D544; `results/J217/` on `pc-results`: `report.md`, `verdict.json`,
`match-J217.json`, `exposure.json`, `seeds.json`, `checks.txt`, `STATUS`, and the PC session's `summary.md`; and the
`j217-ladder` match's own result rows in the lab checkout's `var/`, read-only), and the result rows of J215, J216 and
J218 for the deck sets' widths and game lengths. No player, config, hash, script or test changes: the match plays
D544's player against the live seat's config at J217's hashes with `--pairs tools/ai-bench/pairs-dev.txt`, and the
job's pilot checks by content how the code differs from J217's pin (point 2). This file and PLAN's rows are the whole
change. `node tools/decisions.mjs next` printed D548 on this lane (D547 is in the lane it branches from).*

**Status: registered; text only; reviewed independently, the review's blocker (the pilot's deck pairs) and three
text fixes made on the lane (*Verification*); unbuilt and unpiloted on the lane; unplayed. J221 plays it, after
J219 and before J220.**

**2026-11-14**

**Context.**

- **J217 read D544's union: SMALL GAIN, a measured gain** (2026-11-14 05:00 to 14:23, mtg-table `9fb702f`, alone, 7
  workers, 9.28 h of match). `search-v3-wide` (`b95340935592`: `search-v3-declined-instant` with `stackwin=1`,
  `passwin=1` and `dactiv=1`) against `search-v3-declined-instant` (`af6771947a25`, the live seat's config as
  search-v4 since D546), 4,800 games on the confirm set, blocks 725,900,000–725,900,599, 0 draws, 0 engine errors, 1
  timeout, all 25 of the job's checks passed: 2,448 wins, score 0.51 [0.5021, 0.5179], **+6.9 Elo [+1.5, +12.4]**.
  Of the 2,400 mirrored pairs A won both games in 210, lost both in 162 and split 2,028; the pair scores' standard
  deviation is 0.1966 and the score's standard error 0.0040138 (the ladder's own `pairScores` and `matchSummary` over
  the 4,800 result rows, which reproduce the line's score, lo and hi; the line rounds it to 0.004). Every key fired
  above its floor: `stackwin` 1.293 windows a game and 0.150 decisions changed, `passwin` 0.415 and 0.040, `dactiv`
  1.705 and 0.090; the union **0.279 changed decisions a game** against the 0.25 rate; 598 stack windows refused, a
  share of 0.088. The cost: 23.484 against 21.634 search seconds a game (×1.0855), 907 against 913 ms a searched
  decision. Under D544 point 15 that names `search-v3-wide` a live-seat candidate for the owner.
- **The one timeout.** A 33-turn game on the confirm set's `synergy-900000007` decks ran 930 s against the 900 s cap
  and was recorded as A's win (`w: "a"`, `timeout: true`): the ladder writes the winner Forge's outcome names. Counted
  as A's loss instead, the match reads 0.5098 [0.5019, 0.5177], +6.8 Elo [+1.3, +12.3] (computed here from the rows
  with the ladder's functions), still SMALL GAIN. J215's longest game on the confirm set ran 268 s; the wide player's
  tail is longer (its next-longest 386 s).
- **It read well above D544's own expectation.** D544 registered that at the measured exposure and J215's and J216's
  rate of about +11 Elo per changed decision a game, the union was worth about +3 Elo, where a 4,800-game match reads
  SMALL GAIN about one time in five (19.7%, D544's table). +6.9 at 0.279 changes a game is about +25 Elo per changed
  decision a game. Either the stack windows are worth more per change than D540's windows (counter-magic and combat
  tricks live there), or this is the high side of the draw. One match cannot tell the two apart.
- **The confirm set chose the keys.** D544's windows were counted from J212's 720 recorded games on the confirm set,
  and every search match since D398 but J216 and J218 was read there (D543's *Context*: new deals answer the noise in
  the deals, not the selection on the decks). The dev set, `tools/ai-bench/pairs-dev.txt`, holds the other 30 drafts of
  the same six cubes (D318). Games with any of the three keys, found by a scan of every `.jsonl` under the lab
  checkout's `var/` and this machine's `mtg-table*` checkouts' `var/` on 2026-11-14 (lines naming `stackwin=1`,
  `passwin=1` or `dactiv=1`): J217's 4,800 and its pilot's 4 ladder and 4 recorded games, all on the confirm set, and
  D544's exposure run, 240 games of this same pair on the dev set (host `d544-exposure`, blocks
  8,900,000–8,900,029, at the lane's `04bafbfb3`, before the review's fixes), whose score line the ladder printed and
  D544 did not read. This lane read that run's window counts by deck pair, to choose the pilot's two pairs (point
  13), and not its scores; no block of it is J221's.
- **The precedent.** J215 read D541's pair SMALL GAIN on the confirm set; D543 played the same pair once on the dev
  set at J215's size (J216, SMALL GAIN +8.3 [+2.4, +14.1]) and registered a pooled line and the PC session's
  recommendation before any game; the recommendation STOOD on J216 alone, the owner said yes, and D546 moved the seat
  on the two. This decision is that replication for J217, by the PC session's choice, which owns the lab's method.

**Decision.**

1. **The match: J217's, on the dev set.** One fixed 4,800-game match (D398: 2,400 mirrored pairs, 600 batches of 8,
   no stopping rule), alone (D521), at `--game-timeout 1800`, `--pairs tools/ai-bench/pairs-dev.txt`, stopping itself
   at `--hours 19`:
   - A = `search-v3-wide` (`b95340935592`):
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`;
   - B = `search-v3-declined-instant` (`af6771947a25`, the live seat's config since D546, search-v4):
     `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1`.

   The same players at the same hashes as J217, and the code they play is J217's (point 2); only the deck set, the
   deals, the game timeout and the match's own stop differ.
2. **The code, and why it cannot change these two players' play.** J221 is pinned to this lane's merge; against
   J217's pin `9fb702f` the code under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` differs by (`git diff
   9fb702f c35992ada`, read on the lane; D548 adds nothing there):
   - **D546's merge `2a13482a9`**: five files under `bridge/src` and the registry. In `SearchConfig.java` the two
     constants `LIVE_VERSION` (`search-v3` → `search-v4`) and `LIVE_DEFAULTS` (`what=pa,anytime=1` →
     `what=pa,anytime=1,declined=1,instant=1`) and javadoc; in `SearchPolicy.java` and `RecordMatch.java` comments; in
     `MtgTable.java` comments and the start line's words (`", D412, D539"` → `", D412, D539, D546"`); in
     `DecisionSelfTest.java` the build's checks (504 → 514). The constants are read only by `parseLive`, which no
     ladder seat goes through: a ladder game is an `AiBench` game, whose seats are parsed by `SearchConfig.parse`
     (D546's *Under D509*; `AiBench.java` names `parseLive`, `MtgTable` and `DecisionSelfTest` nowhere, and
     `RecordMatch` only in comments, read on the lane), and `parse` is byte for byte J217's. Of every changed line in
     the four files that hold code a game could reach, the six that are not comments are exactly the two constants
     before and after and the start line's two versions.
   - **The registry**: D546 rewrote the notes of `search-v2-no-b` and `search-v3-declined-instant`, and D547 appended
     `search-v3-declined-instant-a1` and `search-v3-declined-instant-t1-x2`; no player's name, kind or params moved. The
     ladder's own listing (`node tools/ai-ladder/cli.ts list`, node only) at `c35992ada` is J217's pin's (from `git
     archive 9fb702f tools`) line for line but for D547's two added players and the evaluator-leaf player's
     "unavailable" text (the archive had no `bridge/src` beside it); `search-v3-wide` `b95340935592` and
     `search-v3-declined-instant` `af6771947a25` are unchanged.

   The pilot checks this by content (`sd`): exactly D546's six files from `9fb702f` to `2a13482a9`, `players.json`
   alone from `2a13482a9` to the pin, the six non-comment lines, and the registry player for player with only notes
   changed and only new players after; the four players at their hashes (`pl`). This is an argument, not a
   measurement (*What is unverified*); it is what makes J217 and J221 one registered pair under one code for the
   pooled line (point 8), as D543 point 5 needed an empty diff.
3. **B is fixed, and J217's B-resolution is removed, not carried.** D544 point 10 chose B from D543's recommendation
   before any J217 game, and J217's job carried both forms, a `b.json` and a sentinel that stopped the pilot until one
   line was uncommented. D546 made `search-v3-declined-instant` the live seat, so the branch has no second outcome left:
   J221 names B once as a constant in each place (the players check, the pilot match, the match step, the verdict),
   and the verdict checks the line's names and hashes against it. Keeping the branch would leave a commented line that
   could be uncommented and a file to resolve, for nothing it could decide. The B-dependent completeness part goes
   with it: B's D540 counters are its own keys and are description only; B's D544 counters must be 0 (point 5).
4. **The deals: `--host j221`**, in a ladder folder of its own, `var/j221-ladder`, emptied by its step.
   `hostBase('j221')` is 199,000,000 (`tools/ai-ladder/schedule.ts` under node, beside `j215` → 519,000,000, `j216` →
   622,000,000, `j217` → 725,000,000, `j218` → 655,000,000, `j219` → 758,000,000 and `j220` → 302,000,000, as their
   decisions registered them), so an emptied folder's 600 match blocks are **199,900,000–199,900,599**, on a first
   run and on a retry. Of the 369,856 ladder result rows under the lab checkout's `var/` (303 result files with rows,
   read 2026-11-14 after J217; the rows lie on 34 bases; the other three lab checkouts' `var/` are links to it) and
   the 343 under this machine's `mtg-table*` checkouts' `var/` (26 files), none is on base 199. No job file in
   `pc-jobs/jobs/` or `drafts/` names `j221` or a block on base 199 or 175, and no result under `pc-results/results/`
   names `j221`. **The pilot's host is `j221-pilot2`, base 175,000,000**, on which no row lies either (the same two
   scans, repeated after the review: 0 of 369,856 and 0 of 343; no job, draft or result names `j221-pilot2`). It is
   chosen for the deck pair its first block deals (point 13): every `hostBase` is a multiple of 1,000,000, and
   1,000,000 mod 30 is 10, so at one batch pair a pilot's first block deals only dev pair 0, 10 or 20;
   `j221-pilot`'s (base 240,000,000, block 240,900,000) deals pair 0, `fair-fight-900000000`, and `j221-pilot2`'s
   (175,900,000) deals pair 10, `pauper-900000000`. 600 consecutive
   blocks give each of the dev set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders (`batchPairs`,
   computed on the lane).
5. **The match is complete** when its line names A and B in that order at their hashes, says `complete: true`,
   played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries `score`,
   `lo`, `elo`, `eloLo` and `eloHi`; **its line's set is `tools/ai-bench/pairs-dev.txt` and every one of its result
   rows says so**; it was played on exactly the 600 blocks 199,900,000–199,900,599 with no other match's game in its
   folder; every batch line carried the two seat configs exactly; both sides searched priority and attack decisions
   and neither searched a block; B's batch counters show no `search.p.stackwin.`, `search.p.passwin.`,
   `search.p.dactiv.` or `search.wide.` counter above 0, and A's no `search.p.lands.` counter above 0; **and its
   mirrored pairs, rebuilt from the result rows with the ladder's own `pairScores`, `blockKey` and `matchSummary`,
   reproduce the line's `pairs`, `score`, `lo` and `hi`**. An incomplete match gets no reading and is reposted alone
   under a new job id after its cause is found. (D544 point 12's parts with this match's names, and D543 point 4's
   two additions: the dev set and the rebuilt pairs.) **Timed-out games count as the rows record them; the pairs
   reader's `toLoss` decides nothing.** (`tools/ai-ladder/results.ts`'s header says a timeout is `w: "d"`, a draw, but
   J217's one timed-out row says `w: "a"`: the row carries the winner Forge's outcome named, *Context*; the line, the
   rebuilt pairs and every reading use `w` as written.)
6. **Exposure and NOT READ, D544 point 13's.** Summed over the match's batch lines on A's side, per game played:
   each key's windows against D544 point 13's floor (`search.p.stackwin.windows` 0.25 a game,
   `search.p.passwin.windows` 0.10, `search.p.dactiv.windows` 0.25); a key under its floor is reported as unexposed,
   and the reading says nothing about that key. The union is NOT READ when the three keys together changed fewer than
   0.25 decisions a game (`search.p.stackwin.changed + search.p.passwin.changed + search.p.dactiv.changed`, in
   integers `changed × 4 < played`): the report gives every rate, the match gets no reading, and the player is not
   played on the dev set again without a new decision. D544 point 13's descriptions (the refusal share and reasons,
   `.ownAim`, `.sameHost`, `.memoryRestored`, `.oppPassed`, each key's `.retry`, `search.p.declined.instantWindows`)
   and its reading aid are carried unchanged.
7. **The readings, written before any game.** Exactly one of D519's four readings at 4,800 for J221 alone, for a
   complete match that is not NOT READ, in this precedence, compared as the line carries them (`lo` in integer
   ten-thousandths, Elo in integer tenths): **SHOWN** `lo` > 0.5 and `elo` ≥ +15; **SMALL GAIN** `lo` > 0.5 and
   `elo` < +15; **INCONCLUSIVE AT 4,800** `lo` ≤ 0.5 and `eloHi` ≥ +15; **NOT SHOWN** `lo` ≤ 0.5 and `eloHi` < +15.
   Beside it, deciding nothing: indistinguishable, a measured loss (`eloHi` < 0), a measured gain (`eloLo` > 0). A J221
   reading earns only the recommendation in point 9: D544 point 15's consequences (a candidate, a union closed on the
   confirm set, a union removed) were J217's, and nothing here re-applies them. A NOT SHOWN at J216's width says the
   union's effect over the live seat's config on the dev set is below about +11.8 Elo, not that it is nothing.
8. **A second registered line: the pooled read of J217 and J221**, 9,600 games of the same two hashes under one code
   (point 2) on two disjoint deck sets and disjoint blocks (725,900,000–725,900,599 and 199,900,000–199,900,599).
   **What it is and is not.** It answers the owner's question "is the effect above 0 on all the evidence". It holds
   the match that triggered this one: J221 is played because J217 read SMALL GAIN, so the pooled line carries J217's
   draw, which the replication exists to test, and leans upward by that selection. D519's Rejected kept a 1,200-game
   screen out of the confirmation it triggered for that reason; here the confirmation's test is J221 alone, which the
   summary leads with, and the pooled line is the weaker second line it was in D543 (point 10 says how weak). Both
   matches were fixed in size before any of their games, and this line is written before any J221 game.
   **How it is computed** (D543 point 5's form): the stratified mean of the two sets of pairs —
   score_p = (n₁·m₁ + n₂·m₂) / (n₁ + n₂); se_p = √(n₁²·se₁² + n₂²·se₂²) / (n₁ + n₂); lo_p, hi_p = score_p ∓ 1.96·se_p;
   Elo through `eloOf`, to tenths as the line carries them; J217's side as literals in the job (2,400 pairs, score
   0.51, **se 0.0040138**, lo 0.5021, hi 0.5179, from `match-J217.json` and, for the seven-place se, the ladder's own
   functions over J217's 4,800 rows in the lab checkout's `var/j217-ladder/results/j217.jsonl`, read 2026-11-14, which
   reproduce the line's score, lo and hi); J221's side from its own rows (point 5's rebuilt pairs). Compared like a
   line: `lo_p` in integer ten-thousandths. The pooled line is read only for a complete J221.
9. **What it decides, written before any game: the PC session's recommendation.** This decision moves no seat:
   `SearchConfig.LIVE_DEFAULTS` stays `what=pa,anytime=1,declined=1,instant=1` whatever J221 reads; a seat change is
   a separate decision with the owner's yes (D509's seat queue).
   - **STANDS** — the PC session recommends to the owner that `search-v3-wide` become the live seat, with both
     matches' points, intervals and costs beside it — when J221 alone reads SHOWN or SMALL GAIN, or when the pooled
     `lo_p` is above 0.5 and J221 is not a measured loss.
   - **WITHDRAWN** — the PC session recommends not adopting it on this evidence and says why — when J221 is a measured
     loss (`eloHi` < 0, so `hi` < 0.5), or the pooled `lo_p` is at most 0.5.
   - For a complete J221 exactly one of the two holds (a SHOWN or SMALL GAIN J221 with J217's SMALL GAIN always gives
     `lo_p` > 0.5, since se₁ + se₂ ≥ √(se₁² + se₂²)). **A J221 that gives no reading (NOT PLAYED, NOT READ or
     INCOMPLETE) neither confirms nor withdraws it**: the recommendation is reported **OPEN**, with J217 alone and the
     cause beside it; an INCOMPLETE match is owed a repost under a new job id after its cause is found, and a NOT READ
     one is not played on the dev set again without a new decision.
   - It does not fix the base of a later lane: that is each lane's own decision.
   - **If the owner adopts another player before J221 runs** (J218's `t1-x3`, or J219's or J220's player), B stays
     pinned by its hash (`af6771947a25`) and the readings stay valid as written, but their premise, a replication
     against the live seat before a recommendation to move it, no longer holds: J221 then reads `search-v3-wide`
     against the old seat's config, and a STANDS recommends an increment over a seat that is no longer live; a wide
     player built on the new seat is a lane of its own. **If the owner adopts `search-v3-wide` before J221 runs** (the
     summary of J217 said they could), J221 reads the same match after the fact, and the recommendation is then on
     keeping it: WITHDRAWN recommends going back to search-v4.
10. **The hypothesis, registered as information before any game (no check reads it).** J217's point is above what
    D544 expected (*Context*), so the true effect on the dev set is probably under +6.9. Take J216's pair standard
    error on the dev set for J221 (se₂ = 0.0043192, a half-width of ±5.9 Elo near 50%; J218's 0.0047743 in
    brackets, a player whose pair scores spread more). J221 alone reads SHOWN or SMALL GAIN when its score exceeds 0.5
    + 1.96 × 0.0043192 = 0.50847 (+5.9 Elo), SHOWN from 0.52157 (+15). The pooled line has se_p = √(0.0040138² +
    0.0043192²)/2 = 0.0029481, a half-width of **±4.0 Elo**. Given J217's 0.51, `lo_p` > 0.5 exactly when J221's score
    exceeds 1 + 2 × 1.96 × 0.0029481 − 0.51 = **0.50156 (+1.1 Elo)**, and J221 is a measured loss only below 0.49153
    (−5.9 Elo), which that already excludes; so **STANDS is J221's point above about +1 Elo**. By the normal
    approximation of J221's score:

    | true effect on the dev set | J221 SHOWN | J221 SMALL GAIN | together | J221 NOT SHOWN | STANDS | WITHDRAWN |
    |---|---|---|---|---|---|---|
    | 0 | 0.0% | 2.5% | 2.5% [2.5%] | 97.5% | 35.9% [32.1%] | 64.1% |
    | +3 Elo (D544's expectation at J217's exposure) | 0.0% | 16.8% | 16.8% [14.6%] | 83.2% | 73.9% [66.9%] | 26.1% |
    | +5 Elo | 0.0% | 38.4% | 38.4% [32.5%] | 61.6% | 90.4% [85.1%] | 9.6% |
    | +6.9 Elo (J217's point as the truth) | 0.4% | 62.9% | 63.3% [54.8%] | 36.7% | 97.4% [94.7%] | 2.6% |
    | +10 Elo | 4.8% | 86.7% | 91.5% [85.4%] | 8.5% | 99.9% [99.5%] | 0.1% |

    The arithmetic, for one row: a true +6.9 Elo is a score of 1/(1 + 10^(−6.9/400)) = 0.50993; J221's SMALL GAIN bar
    0.50847 is (0.50847 − 0.50993)/0.0043192 = −0.34 standard errors from it, so P = Φ(0.34) = 63.3%; the STANDS bar
    0.50156 is −1.94 standard errors away, P = Φ(1.94) = 97.4%. **What the table says plainly:** J221 alone is a fair
    test of the gain on new decks (a null reads SMALL GAIN 2.5% of the time, a true +6.9 does about two times in
    three, and D544's +3 one time in six); the pooled line is a weak one, because J217 already sits at +6.9 inside it —
    a dev-set effect of 0 still leaves the recommendation standing 36% of the time, and one of +3 74%. So the summary
    of J221 reports which branch carried STANDS, and a STANDS carried by the pooled line alone, with J221 NOT SHOWN, is
    worded as what it is: the gain did not show on the dev set by itself, and the two sets together still put its
    lower end above 0, on a line that holds the match which triggered this one.
11. **Never pooled with J215, J216, J218, J219 or J220, and never read against them**: other players (J215 and J216
    the pair against `search-v2-no-b`, J218 to J220 deeper or slower players) or other deals, and J218 another code
    version. Nor is J221 read against J217 as a difference: two sets of different decks differ in more than this pair's
    effect. **The order**: D547's J219 first, then J221, then D547's J220, each alone; the order changes no reading
    (different deals, folders and players). D548 changes no file under `bridge/src`, `tools/ai-ladder` or
    `tools/ai-bench`, so J219's and J220's code checks (against D546's merge, `players.json` alone) hold at this lane's
    merge too.
12. **Beside the reading, as description only** (D544 point 18 and D547 point 9's additions): each side's searched
    decisions by kind and ms a searched decision; search seconds a game and their ratio, and D519 point 5's "no cost"
    flag (`aMs × 100 ≤ 105 × bMs`, in integer microseconds; J217's A was within it, 907 against 913 ms); each key's
    windows a game, candidates a window, changes a game and retries a game, beside J217's; the refusals by reason and
    their share; priority overrides by direction a priority decision; the land windows left to Forge a game; the games
    per dev deck pair; the timeouts, and the score with every timed-out game counted as A's loss (the pairs reader's
    `toLoss`); and J217's line as it was.
13. **The pilot, before the match** (J217's, on the dev set): the build with the decision self-test at 0 failures and
    exactly 514 checks (the count the full gate printed on `2a13482a9`, its run `20261113-095630-3556457`, as D547's
    drafts check it); the ai-bench self-test at 0 failures and exactly 476 checks (J217's pilot's count at its pin;
    nothing under `tools/ai-bench` changed since); the ladder test; the four players at their hashes and seat configs;
    point 2's code check; `hostBase('j221')` 199,000,000, the pilot host's 175,000,000 and the pair its first block
    deals (dev pair 10, `pauper-900000000`); the job's readers tested on synthetic files (the verdict's 61 cases
    include the pooled line and each recommendation on both sides of its bars); a 4-game ladder match of A against B
    under `--host j221-pilot2 --pairs tools/ai-bench/pairs-dev.txt`, so on `pauper-900000000`, and a 4-game recorded
    run of A against Forge Default on `modern-era-900000002`, chosen by name. **The match is played only if** D544
    point 19's gate holds on the dev decks: over those 8 games `search.p.stackwin.windows` and
    `search.p.dactiv.windows` are each above 0 (`search.p.passwin.windows` is reported and may be 0), none of the 8
    ended in an engine error or a timeout, the three keys' retries together are at most 2 a game, and the refusal
    share of stack windows is below one half; otherwise the job writes the match as NOT PLAYED with the condition it
    failed, and the recommendation is OPEN.
    **The two pairs, chosen from D544's dev-set exposure run** (240 games of this pair, A = `search-v3-wide`, 8 games
    of each dev deck pair, read from its batch lines in `mtg-table-d544/var/d544-exposure/batches/`; its window counts
    were read, its scores were not used to choose). A game "opened" a key when A's `search.p.<key>.windows` was above
    0 in it:

    | dev pair | stack windows open (of 8) | declined activations open (of 8) | pass windows open | stack windows refused |
    |---|---|---|---|---|
    | 0 `fair-fight-900000000` (the first line; `j221-pilot`'s pair) | 1 | 2 | 1 | 1 of 5 |
    | 10 `pauper-900000000` (`j221-pilot2`'s pair: the ladder pilot) | 7 | 2 | 6 | 1 of 34 |
    | 6 `modern-era-900000002` (the recorded run) | 5 | 6 | 4 | 1 of 15 |

    With the first line for the recorded run and `j221-pilot` for the ladder pilot, all 8 pilot games would have been
    on pair 0, where (treating games as independent at these rates) no stack window in 8 has a chance of about 0.34
    and no declined-activation window about 0.10: NOT PLAYED about 0.41 of the time. The recorded run takes the pair
    with the lowest chance of a zero on both counters in 4 games, `modern-era-900000002` ((3/8)⁴ = 0.020 and (2/8)⁴
    = 0.004; `vintage-900000002` and `modern-era-900000000` are as good, and this one also opened pass windows in 4 of
    8). The ladder pilot can only reach pairs 0, 10 and 20, and pair 10 opens stack windows most (7 of 8; pair 20,
    `synergy-900000000`, 5 of 8). **The gate still reads both runs**, as D544 point 19 wrote it: it exists to show the
    new windows open on the dev set at all, in the match's own setting (A against B) as well as against Forge, and
    reading only the recorded run would drop the 4 games against B; with both runs on pairs where the windows open, the
    chance the window conditions keep the match out is about **0.1%** ((1/8)⁴ × (3/8)⁴ ≈ 0.000005 for stack windows,
    (6/8)⁴ × (2/8)⁴ ≈ 0.0012 for declined activations). That estimate rests on 8 games a pair, at the unfixed build
    `04bafbfb3` and against B, where the recorded run plays Forge Default; the error, retry and refusal conditions are
    not in it (that run's games on these two pairs had no error, timeout or retry, and refused 2 of the 49 stack windows met). A D544 counter above 0 in B, a lands counter above 0 in A, or a searched
    priority decision on a stack whose top item is the seat's own stops the night as a pilot failure.
14. **Time and the game timeout.**
    - **The timeout, 1,800 s.** It cuts only a stuck game and changes nothing a game plays by. On the dev set J216's
      longest game ran 706 s at 1.5 s against 1.5 s (its next 405 s), and J218's 1,517 s with A at 4.5 s (its next
      703 s); on the confirm set the wide player ran one game past J217's 900 s cap (930 s, 33 turns) where J215's
      longest had been 268 s, so its tail is longer than the pair's, and at ×1.09 the thinking a 706 s dev-set game
      would run about 770 s. At 900 s a dev-set timeout or two is likely; 1,800 s is about twice J217's 930 s game and 2.5 times J216's
      longest, and only J218's single game at three times the clock came near it; D545 and D547 set the same on the
      dev set.
    - **The hours.** D537 point 11's fit (a 1,200-game match at 7 workers, alone: 0.47 h + 0.0436 h × both sides'
      search seconds a game), read at four times the games: B searched 22.3 s a game on the dev set (J218's B, the
      same config), A ×1.0855 that in J217 and ×1.09 in D544's 240-game dev-set run, so about 24.2 s, both sides about
      46.5 s a game: **9.99 h by the fit**; the last three 1.5 s matches ran 4.8–6.5% under it (J215 8.45 h against 9.04,
      J216 8.6 against 9.06, J217 9.28 against 9.75), so **about 9.5 h** (range 9–10.5 h) at 7 workers and about 11.1 h
      at 6. The pilot about 10 minutes.
    - **The stop.** `--hours 19` under a 20.5 h step timeout. The ladder starts a batch only while its expected time
      (the mean of the last eight batches) fits before the stop, and a batch then runs to its end, so the step needs
      room after the stop for a batch that meets a long game: 1.5 h is just under three games (three are
      5,490 s) at the 1,800 s cap and its 30 s grace (`--hours 20` left 0.5 h, less than one such game beside the
      batch's other games). A memory-stop retry is a new attempt (the runner sets the step's elapsed time to 0 at
      every unit start, and the match step empties
      its folder and starts the ladder again with its own `--hours`), with one worker fewer, and the third memory stop
      fails the job: a full replay fits at 5 workers (about 14 h by the fit) and at 4 (about 17.5 h, 18.1 h at J218's
      excess over the fit). A match that reaches its own stop is `complete: false` and gets no reading.
    - With J219 (about 10.5 h) and J220 (about 14 h), the three hold the machine alone about 34 h.

**Under D509: the atlas's seat and the live seat are unchanged.** No file under `bridge/src`, `tools/ai-bench` or
`tools/ai-ladder` changes; nothing the atlas's seat or `SearchConfig.LIVE_DEFAULTS` reads moves.

**Hidden information and threads.** Nothing new: the players are D544's and D541's, whose arguments are D544's and
D540's.

**Rejected.**

- **Recommending the seat change on J217 alone.** The pair before it was replicated before the owner was asked
  (D543), and J217 read well above its own registered expectation (*Context*): the dev set is where a fit to the
  confirm set's 30 decks would show. The owner can still say "adopt wide" before J221 reads (point 9 says what J221
  then means).
- **Keeping J217's B-resolution branch** (point 3): a constant cannot be resolved wrong; the branch's one job was a
  choice D546 has made.
- **Replaying the confirm set on new blocks.** It answers the noise in the deals, which J217's interval already
  carries, not the selection on the decks.
- **A fresh third deck set** (D543's Rejected): still a lane of its own and not ready; the dev set exists, is drafted
  the same way and has seen the three keys only in D544's 240-game exposure run, whose scores nobody read.
- **The pilot on the dev set's first line and `j221-pilot`** (as J216 and J217 placed theirs): all 8 gate games on
  `fair-fight-900000000`, where the windows opened least, NOT PLAYED about 0.41 of the time (point 13).
- **A gate that reads only the recorded run**: it would drop the only pilot games against B; moving the ladder
  pilot's host keeps D544's 8-game gate as written (point 13).
- **A step timeout raised instead of `--hours` lowered** (21 h): the same margin, and a longer hold on the machine
  when something hangs; `--hours 19` still fits a full replay at 4 workers.
- **2,400 games.** A half-width of about ±8.3 Elo at the dev set's width cannot tell +5 from 0.
- **Pooling without a J221 reading of its own, or reading only the pooled line.** J217's +6.9, a selected draw, sits
  inside any two-match pool (points 8 and 10); J221 alone is the test that the gain travels.
- **Reading J221 against J217** (a difference of two points): two deck sets differ in more than this pair's effect.
- **`--game-timeout 900`, J217's**: its one timeout came on the confirm set, and the dev decks' games run longer
  (point 14).
- **J221 before J219.** D547 registered J219 first; nothing here needs the machine sooner, and the order changes no
  reading.

**What is unverified.**

- **That the code argument holds in play** (point 2): no game has been played at this lane's pin; it rests on D546's
  argument (`parseLive` only) and the pilot's content checks, and the pilot's 4 ladder games are the first.
- **The decision self-test count and the ai-bench self-test count at the pin** (514 and 476): not built on this lane
  (no Java beside the lab, by the coordinator's brief); 514 is the full gate's count on `2a13482a9`, 476 J217's
  pilot's at `9fb702f`, and nothing under `bridge/src` or `tools/ai-bench` that either runs has changed since but
  D546's, which the 514 already counts.
- **Out of sample in decks and deals, not in card pool**: the dev set is drafted from the same six cubes.
- **The dev set's pair spread and game lengths for this pair**: unmeasured; the hypothesis assumes J216's standard
  error, and the time J218's B and J217's ratio.
- **That the keys fire on the dev decks as on the confirm decks.** D544's 240-game run measured 0.292 changed
  decisions a game on the dev set, at the unfixed build; J217, at the fixed build, 0.279 on the confirm set. The NOT
  READ rate is 0.25. The pilot's gate needs stackwin and dactiv each above 0 over its 8 games; on its two pairs,
  `pauper-900000000` (stack windows open in 7 of 8 of that run's games, declined activations in 2 of 8) and
  `modern-era-900000002` (5 and 6 of 8), the window conditions fail about 0.1% of the time (point 13), an estimate
  from 8 games a pair at the unfixed build, against B where the recorded run plays Forge Default.
- **How J217's timed-out game came to be scored as A's win**: the ladder recorded the winner Forge's outcome named
  with `timeout: true`; whether the game ended during `AiBench`'s 30-second grace after the cap or the draw it sets
  lost a race is not read here. Counted as A's loss it changes no reading (*Context*).
- **The pooled line's form**: the stratified mean and standard error, not one `matchSummary` over 4,800 pairs; and its
  upward lean from the selection (point 8), which no number here corrects.
- **That bases 199 and 175 are unplayed everywhere**: read from the lab checkout's and this machine's checkouts' result
  rows and the job files on 2026-11-14; the job's block reader checks the match's own folder only.
- One opponent: the live seat's config.

**Verification (the lane, 2026-11-14, at `c35992ada` with this lane on top; the lab idle after J217, but no Java, no
build and no game by the coordinator's brief):**

- `node tools/decisions.mjs next`: D548 before this file; `node tools/decisions.mjs check` after it: OK, 462
  decisions, next D549. `node --test web/test/ai-ladder.test.ts` 60 of 60 (no player added or changed);
  `node --test web/test/claude-md.test.ts` 5 of 5; `./tools/public-check.sh` OK (git and shell only).
- `git diff --name-only 9fb702f c35992ada -- bridge/src tools/ai-ladder tools/ai-bench`: the six files of point 2;
  `git diff 2a13482a9 c35992ada` there: `players.json` alone; the non-comment changed lines: the six of point 2.
- `node tools/ai-ladder/cli.ts list` (node only) at `c35992ada` against the same over `git archive 9fb702f tools`:
  identical but for D547's two added players and the evaluator-leaf player's "unavailable" text; the two match players
  at `b95340935592` and `af6771947a25`. `hostBase` under node: `j221` 199,000,000, `j221-pilot2` 175,000,000 (its first block
  175,900,000 deals dev pair 10 at one batch pair; `j221-pilot` 240,000,000 would deal pair 0), 40 batches for each of
  the dev set's 30 pairs.
- The block scan (point 4, bases 199 and 175, the second after the review), the key scan (*Context*) and the pilot
  pairs' window counts (point 13, from `mtg-table-d544/var/d544-exposure/batches/`), by Python over the rows.
- J217's se 0.0040138 and its pair counts, J216's 0.0043192, J215's 0.0040995 (D543's literal, reproduced) and J218's
  0.0047743, rebuilt with the ladder's `blockKey`, `pairScores` and `matchSummary` under node from the lab checkout's
  rows (read-only); the power table by Python from those widths.
- The J221 draft (`pc-jobs` `drafts/J221-wide-dev-set.md`, untracked, its `repos:` sha 40 zeros for the merge
  commit): `./tools/runner.sh check` `lint: clean`, `machine-checked`, the pilot 7 blocks and 61 checks, the commands
  2 blocks and 30 checks. Its node-only pilot blocks run in this worktree (the ladder's `list` through `node
  tools/ai-ladder/cli.ts`): the players check `ok` 1, the base `ok` 1, the code check `exact1` 1, `exact2` 1,
  `codeLinesOk` 1 (6 lines), `playersOk` 1 (notes changed: 2; appended: D547's two); the exposure reader 8 of 8, the
  verdict 61 of 61, the recording reader 14 of 14, the pairs reader 7 of 7, the block, rollout and gate readers each
  `ok`. The readers over J217's own files (read-only, out to a scratch folder): the pairs reader agrees with J217's line
  (`agree` 1, se 0.0040138, 1 timeout); the verdict reads J217's match INCOMPLETE, "NOT THE DEV SET", as it must.
- **After the independent review** (2026-11-14): the pilot host moved to `j221-pilot2` and the recorded run to
  `modern-era-900000002` (point 13), the timed-out games' scoring said (point 5), `--hours 19` (point 14), and the
  unverified list's pilot sentence rewritten with the measured counts. The same node-only checks again: decisions
  check, ladder test, claude-md test, public check, `runner.sh check` and the draft's node-only pilot blocks (the base
  now also checks `pilotPair` 10, `pauper-900000000`); results in the commit message.
- **Not run on the lane — the coordinator's**: `./tools/check-forge.sh`; `./bridge/build.sh` (expect the decision
  self-test at 514 checks and 0 failures); `./tools/ai-bench.sh --selftest` (476 and 0); the pilot dry-run, on a
  scratch copy of the draft pinned to this lane's head (`./tools/runner.sh dry-run <copy> --root
  ~/code/mtg-table-d548 --pilot-only --max-seconds 7200 --workers 6`, expected 60 of 61 checks, `merged
  == 1` the one that fails off main); the independent review; the full gate at the merge.

**Follow-up.** J221 plays the match at this lane's merge, after J219; its `report.md` carries J221's reading, the
pooled line and the recommendation, and `summary.md` (the PC session) words them, J221 alone first. Its row in PLAN
is the cube lab's 66; D548 closes the cube lab's 61 with J217's read.

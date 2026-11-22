## D552 — The live search seat is search-v6: search-v5 at D549's 3 s clock and one turn deeper (`ms=3000`, `turns=1`), adopted on J223's SHOWN and the owner's yes

*Branch `pc/live-seat-deep`, off main `2802940e7` (D551's merge, J223's pin). Amends D412, D539, D546 and D550 (the
live seat's version and defaults) and reads J223 (D551) (`results/J223/` on `pc-results`: `summary.md`,
`verdict.json`, `match-J223.json`, `report.md`, read on this lane and checked against the brief's numbers: they
agree). Code: `SearchConfig`'s two live constants and the comments that name the live version, the decision
self-test, the ladder's two notes, the watch bots' player id, the match launcher's advertised default budget,
protocol amendment M86 and the docs that say which search the game plays — D550's places, plus the two that name the
budget. Built, tested and played on the lane, the lab idle (`lab-status`: `idle` since J223 ended, queue empty) and
the scenery GPU job running beside it (*Verification*).*

**Status: built, tested and played on the lane (*Verification*); not merged. The independent review and the full
gate are the owner's session's, at the merge.**

**2026-11-21**

**Context.**

- **J223 read D551's match: SHOWN** (2026-11-17 06:39 to 2026-11-18 00:39, mtg-table `2802940`, alone, 7 workers, 4
  to 6 for parts of the run under memory pressure from the scenery painting). `search-v3-wide-t1-x2`
  (`709c83cc4d48`: `search-v3-wide`'s seat config with `ms=3000` and `turns=1` and nothing else, 4,800 of 4,800 lines
  exact) against `search-v3-wide` (`b95340935592`, the live seat since D550, search-v5), one fixed 4,800-game match on
  the confirm set, blocks 405,900,000–405,900,599: 0 draws, 0 engine errors, 0 timeouts, 2,400 mirrored pairs, 30 deck
  pairs at 160 games each, 28 of 28 checks; 2,516 wins, score 0.5242 [0.5150, 0.5333], **+16.8 Elo [+10.4, +23.2]**
  (`verdict.json`: `shown` 1, `smallGain` 0). Under D551 point 7 the PC session recommended to the owner a 3 s live seat
  `search-v3-wide-t1-x2`.

  | | search-v3-wide-t1-x2 (3 s) | search-v3-wide (live, 1.5 s) | ratio |
  |---|---|---|---|
  | search seconds a game | 56.8 | 23.1 | ×2.46 |
  | ms a searched decision | 2,077 (priority 2,071, attacks 2,103) | 847 | ×2.45 |
  | searched decisions | 131,239 | 130,855 | |
  | rollouts a decision | 16.12 | 16.00 | |
  | budget fallbacks | 1.16% [0.95%, 1.38%] | 0.56% [0.46%, 0.66%] | |

  Both sides had the wide windows open and used them (A: stack windows 1.479 a game, pass 0.472, declined activations
  1.822; B: 1.495, 0.471, 1.742); no land was searched on either side.
- **Beside it, never pooled (D551 point 8)**: J222, the same player against search-v4 on the dev set, SHOWN +20.7
  [+14.1, +27.3] at ×2.72; J220, the horizon and clock without the wide windows, SMALL GAIN +14.2 [+7.8, +20.6].
- **The owner's word**: yes, 2026-11-21 ("Yes, let's follow your recommendations", in answer to the PC session's
  standing recommendation from D551 and J223).

**Decision.**

1. **A new search version, `search-v6` = search-v5 + `ms=3000,turns=1`.** `SearchConfig.LIVE_VERSION` becomes
   `"search-v6"` and `SearchConfig.LIVE_DEFAULTS` becomes
   `"what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1,ms=3000,turns=1"`: search-v5's seven keys,
   in their order, then D549's two (the key spellings are `parse`'s `case "ms"` and `case "turns"`; `aturns` is left
   unset, so attack rollouts follow `turns`, `SearchConfig.horizonFor`, exactly as the ladder player leaves it). The
   round cap stays 12 and the minimum 2 rounds, `lands` stays off, blocks stay Forge's. `parseLive` is unchanged: it
   parses `LIVE_DEFAULTS` before the caller's keys, so a key the caller names wins. The live line goes from
   `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`
   to
   `ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`
   — exactly `search-v3-wide-t1-x2`'s seat config without its `Default+outlets+search:` prefix and its `seed=0`
   (`toString` prints `ms` and `turns` in their fixed places, so the strings match character for character).
   `MtgTable`'s start line names it `search-v6, D412, D539, D546, D550, D552`.
2. **Where it takes effect: every path through `parseLive`**, as D550 point 2 listed them. `MtgTable --ai-policy
   search` / `--ai-search` (a bare `./scripts/play.sh`, the match launcher's search AI, Play vs Forge and the opponent
   picker); `RecordMatch --policy search` (the watch bots' and `scripts/spectate.sh`'s search player, when one is
   asked for); `CubeLab.liveSearchSeat`, which seats `census-play`'s `--policy-a/-b search` pilots; and
   `tools/llm-seat/run-match.mjs --ai-policy search`. It takes effect when the engine restarts.
3. **The budget a caller picks.** D333's `--ai-search ms=<n>` (`play.sh --ai-search-ms`, the match launcher's
   `aiSearchMs`) keeps working and keeps every other key, `turns=1` included: a picked 1,500 ms is search-v6's horizon
   at search-v5's clock, a configuration no match has measured. The match launcher's `/health` advertises
   `"aiSearchMs": {"min":500,"max":5000,"default":3000}` (the default was 1500, the bridge's then; it says the bridge's
   default, so it follows it), and the session header names `search-v6` at any budget (M86). ForgeCoach needs nothing
   first: it sends `aiSearchMs` only when its request carries one, and none of its pickers sets one (read in
   `~/code/ForgeCoach/src/draft/launch.ts`, read-only), so its matches play the bridge's 3,000 ms.
4. **What a player sees: the AI thinks about twice as long.** Every searched decision (its main-phase plays, attacks,
   declined spells and activations, instant-speed, stack and pass windows) now has 3,000 ms of budget instead of 1,500,
   and its rollouts play to the end of the NEXT turn, so a play is scored after the player's reply turn. On the cube
   decks that is 2.1 s a searched decision on average against 0.8 s, close to a minute of thinking a game against 23 s
   (J223, this machine's seconds, D388); on this lane's played session (*Verification*) 1.6 s on average, the median
   1.4 s and the longest 3.2 s, against search-v5's 0.7 s, 0.6 s and 1.6 s on the same seed. Head to head against search-v5 it
   measured +16.8 Elo [+10.4, +23.2] on the confirm set: a measured gain above D519's +15 line. What is not measured is
   whether the horizon or the clock carries it (they were only ever played together at this horizon, D551 point 7).
5. **What does not change.** `SearchConfig.parse` and `defaults()` — `ms=1500`, `turns=0`, `what=pab`, `anytime` off,
   D540's and D544's keys off — so the bench, the cube lab's seat specs, the move atlas's seats, the label probe and
   every ladder player keep meaning what their games were played under. The ladder's names, params and hashes:
   `search-v3-wide-t1-x2` keeps `709c83cc4d48` and is how the ladder rates search-v6 (no `search-v6` alias is
   registered: one name per config), `search-v3-wide` keeps `b95340935592`; both notes say what they are now, and the
   notes are the only lines of `tools/ai-ladder/players.json` that change (*Verification*: every other field of every
   player is main's, and `./tools/ai-ladder.sh list` is main's byte for byte). The wire's shape: `hello_ok` is
   unchanged, and the session header's `ai` (M62) keeps its four keys — amendment **M86** says only that `version`
   names `"search-v6"` when the seat runs the live default, whose `budgetMs` is now 3000. A log written before D552
   says `"search-v5"` (or older), which is what that game played; `tools/ml/human_collect.py` carries any
   `search-v<n>` as written, and `tools/check-redaction.mjs` accepts `^search-v\d+$`, any `config` starting
   `ms=<n>,` and any `budgetMs` in 50–60,000.
6. **How to get search-v5 back:** `--ai-search ms=1500,turns=0` (`./scripts/play.sh -- --ai-search ms=1500,turns=0`),
   whose config is `search-v3-wide`'s exactly. Each key alone can be named. With D550's `stackwin=0,passwin=0,dactiv=0`
   after them it is search-v4, and so on down (`SearchConfig.LIVE_DEFAULTS`' javadoc, `play.sh`'s examples). The
   session header names no version for any of them (M86).
7. **The watch bots' player id** (`tools/watch-runner.mjs`, `tools/cubelab/watch.ts`, `docs/watch-bots.md`) becomes
   `search-v6`, labelled so; `search`, `search-v2`, `search-v3`, `search-v4` and `search-v5` stay accepted as aliases
   and answer as `search-v6`, so a request ForgeCoach stored before D552 still starts. `watch.ts`'s `seatSpecOf`, which
   spells the live seat by hand for `run.json`'s `profiles`, gains `,ms=3000,turns=1`. ForgeCoach's watch page reads any
   `search-v<n>` id; its words for the live seat go staler (the cube lab's 63, widened).
8. **A `census-play` folder begun before D552 with a `search` pilot is never resumed or extended** (D539's rule as
   D546 and D550 extended it): its `plan.json` binds the pilot as the string `search`, so a folder straddling D552
   would hold search-v5 and search-v6 under one name.
9. **The clocks, watchdogs and budgets that could assume 1.5 s** (the brief's first question; each read on this
   lane's tree). Only one thing had to change, the match launcher's advertised default (point 3); the rest hold, and
   the two RecordMatch comments that said "~1.5 s" now say "~3 s":
   - `MtgTable.GAME_TIMEOUT_SEC` (900 s, the null and auto transports only; a human seat has no game clock, D286):
     holds. This lane's three auto-seat games at search-v6 took 40.0, 61.8 and 64.8 s of wall time.
   - `AutoTransport.STUCK_MS` (60 s with no frame, then the automated seat concedes): would need about twenty
     full-budget decisions in a row with no frame between them; none of this lane's games conceded (`concedes 0`).
     `STEP_CAP_MS`, `ASK_TIMEOUT_MS` and `SETTLE_MS` time the automated seat's own answers, not the AI's: unaffected.
   - `RecordMatch`: 600 s a game plus `SEARCH_TIMEOUT_SEC` 1,800 s when a seat searches, plus the pace's dwells:
     **kept**. A watch with two search seats now thinks about 114 s a game on average (twice J223's 56.8 s); the lab's
     longest game at this thinking was J222's 1,113 s with one 3 s seat (D551), and J223 played 4,800 games at 3 s with
     no timeout at a 3,600 s cap. `tools/cubelab/watch.ts`'s backstop mirrors the same sum plus 180 s: kept with it.
   - `MtgTable`'s `KEEP_OPEN_MS`, `NEXT_GAME_GRACE_MS`, `NO_CLIENT_GAME_TIMEOUT_SEC`, `QUEUED_NEW_GAME_GRACE_MS`: run
     after `over` or while no client is connected, never while the AI thinks: unaffected. `ABANDON_OVER_MS` and
     `NEXT_AFTER_ABANDON_MS` (60 s): a deferred concede waits for `Game-0`'s next check, now at most one 3 s search
     later instead of 1.5 s: unaffected.
   - `ReplyPool.WATCHDOG_MS` (30 s) and `WsTransport.NO_CLIENT_ASK_TIMEOUT_MS` (120 s) time a human's reply;
     `TableMatch`'s decision and grace clocks (180 s, 120 s) are a table of two people with no AI seat (D402):
     unaffected.
   - The mulligan search's own `MULL_MS` (6,000 ms) runs only with `mull=1`, off in the live seat: unaffected.
   - The web client: the follow transport's `FOLLOW_STALL_MS` (30 s with no new line) and the arena's cue budget while
     the engine thinks are not tied to the AI's clock; a stall would need ten full-budget decisions in a row with no
     frame. No web test runs the engine. Unaffected.
   - `scripts/play.sh`'s `/health` polls (60 s to the first answer, the wake's 200 s) come before a game exists:
     unaffected. `tools/llm-seat/run-match.mjs`'s `--health-timeout` likewise.
   - The gate: no job plays a game under the live defaults (point 10), so no job budget, `GATE_*` limit or test timeout
     moves. `tools/deck-smoke.sh` (not in the gate) seats plain Forge.
   - The texts in this repo that describe the seat to ForgeCoach and its user: `docs/watch-bots.md` (its search game
     timings are marked as measured before D552), `docs/match-launcher.md`, `play.sh`'s help and AI line.
10. **The gate plays no game under the live defaults** (the brief's second question). `tools/check-all.sh` passes no
    `--ai-policy`, no `--policy search` and no search player to any engine run, and the last full gate's logs (run
    `20261117-063028-1024617` in `../mtg-table-gate`, 62 jobs) contain no `ai policy = search` line and no `search =
    search-v` line. The jobs that name the live seat are text: 12f (`match-launcher-selftest.mjs`, against a fake
    engine; `watch-runner-selftest.mjs`, against a fake watch), 13c (`web/test/ai-ladder.test.ts`,
    `cubelab-watch.test.ts`) and the build's decision self-test. The search seats the gate does play are explicit
    `parse` configs: 12m's seat-identity search game (`Default+search:ms=60000,cands=4,rounds=2,maxrounds=2,seed=1`)
    and 12h's `search-v2` ladder seat. So no job's duration moves with the clock; the lane measured the jobs it touched
    (*Verification*).

**Under D509: the atlas's seat is unchanged.** This lane changes, under `bridge/src`, D550's five files and no other:
two string constants and javadoc in `ai/SearchConfig.java`, a comment in `ai/SearchPolicy.java`, comments, the start
line's words and the usage line's example in `MtgTable.java`, comments in `RecordMatch.java`, and checks in
`ai/DecisionSelfTest.java`. D550's argument holds on this tree: the constants are read only by `parseLive` (and printed
by `MtgTable`'s start line and session header and `RecordMatch`'s start line); `git diff main --
bridge/src/mtgtable/ai/SearchConfig.java` changes javadoc and the two constants only; no atlas seat goes through
`parseLive` (`tools/cubelab/CubeLab.java`, untouched, seats the atlas's units by `SearchConfig.parse` and reaches
`liveSearchSeat` only from a census job's `policyA`/`policyB` key, which an atlas job does not carry); the
seat-identity golden is untouched and its four games are the golden's (*Verification*). The next atlas night's
`seat_code` check must admit exactly these five files, beside D544's, D546's and D550's; this paragraph is the
admission.

**Hidden information (hard rule 8) and threads (hard rule 3).** A budget and a horizon, nothing else: no frame, field,
`Snap` call, `CardView`, label or engine string is added or changed, and no card path is touched — the five
`bridge/src` files above are the whole of the Java, and none of them is the serialiser, the label gate or a transport.
The session header's `config` string changes two numbers, no card. The rollouts that now play one turn further are the
same rollouts on the same determinized copies (`Determinizer` redeals what the seat cannot see on every copy, as since
D312); a deeper rollout reads nothing the seat could not see, and nothing a rollout reads reaches the wire. The lint is
untouched (33 rules, 79 firing cases); no thread or `invokeInGameThread` is added, so `HOP_ALLOW` stays three. The
live session's frame logs pass `tools/check-redaction.mjs` with `REVEAL count 0` (*Verification*).

**What a person can now read off the clock.** D546 and D550 wrote down that a pause that ends in a pass says the AI
weighed a play there. Nothing new is said by the pause's existence — the same windows are searched — but it is longer:
a searched decision now takes up to about 3 s, so the tell lasts longer, and the player waits about a minute more of
the AI's thinking over a game (J223: 56.8 against 23.1 s on cube decks; this lane's three Doom Legion games 18 to 38 s against search-v5's 10 to 15 s).

**Rejected.**

- **Keep 1.5 s (search-v5).** J223 measured the 3 s deeper seat +16.8 Elo [+10.4, +23.2] over it on the set the seat
  is promoted on, its lower end far above 0; the cost, about 2 s a searched decision, is the owner's to weigh, and he
  said yes.
- **Wait for more evidence** (a dev-set match against `search-v3-wide`, or an ablation of the horizon against the
  clock). J222 already read the same player SHOWN on the dev set (against search-v4), the two sets agree in sign and
  size, and D551 point 7 made SHOWN on the confirm set the recommendation's trigger. An ablation would say which half
  carries the gain, not whether the combination is better than the seat at the table; it can still be asked, as a
  measurement, with no seat moving.
- **Adopt the horizon without the clock, or the clock without the horizon.** Neither was measured on top of the wide
  windows (J219's attack horizon alone read −1.3 on the old base; D514's compute curve was search-v2's); the owner's yes
  is to `search-v3-wide-t1-x2`.
- **Keeping the name `search-v5`.** The seat plays differently and thinks twice as long; the version labels the
  owner's games in the human test set (D414) and the engine's start line.
- **Changing `parse()`'s defaults.** Every ladder player, bench scenario, cube-lab seat spec, atlas seat and
  seat-identity's golden is parsed by it (D318, D412 point 2).
- **Registering `search-v6` as a ladder name.** A second name for `709c83cc4d48`.
- **Leaving the match launcher's advertised default at 1500.** It says the bridge's default; a client that pre-filled
  it would play search-v6's horizon at half its clock, a configuration nothing measured.
- **Raising `RecordMatch`'s 1,800 s.** Nothing measured needs it (point 9); a watch with two 3 s seats is the case
  closest to it, and it is not measured here either (*What is unverified*).

**What is unverified.**

- **Against a person.** Every Elo number is the search against search-v5 on 30 deck pairs from six cubes; how the
  deeper seat plays against the owner, on Pacho SHIELD or anything else, is not measured, nor how a 2 s average pause
  feels at the table (J223's summary said so).
- **Which half carries the gain** (the horizon or the clock): never separated at this base (D551 point 7).
- **A picked budget below 3,000 ms with `turns=1`** (point 3): unmeasured; the session header names it `search-v6` with
  its own `budgetMs`.
- **A watch with two search-v6 seats** against `RecordMatch`'s 2,400 s cap: not played here; the argument is J222's
  and J223's game lengths with one 3 s seat (point 9).
- **The full gate** is the owner's, at the merge; this lane ran the parts named below.
- The seconds are this machine's (D388), with the scenery GPU job running beside every run here.

**Verification (the lane, 2026-11-21, at `f3d725a2a` plus this file; `~/code/lab/lab-status/status.json` read first:
state `idle` since 2026-11-18 00:39, `running` and `queue` empty; the scenery GPU job at 100% GPU beside it, the
machine's load average 1.0 to 1.8 during the runs; one JVM at a time, in this lane's worktree, whose `forge-home` was
made first by `./tools/make-forge-home.sh`).**

1. `./tools/check-forge.sh`: the pinned jar, `3c0a7c38…8e5dd9`, `forge jar OK`.
2. `./bridge/build.sh` from a deleted `bridge/out`: **`build OK`** in 15.0 s. The lint's self-test 33 rules, 79 firing
   cases, 93 checks; the lint 97 files under `bridge/src` and 4 under `tools/`, 33 rules (unchanged). **The decision
   self-test 537 checks, 0 failures** (526 on main plus `liveSeatDeep`'s 11, the hand count, which the first build
   printed); `TableSelfTest` 114, `StalledGameSelfTest` 156, the grade self-test 132, the distill self-test 38, the eval
   self-test 8,039, each 0 failures; every other self-test the build runs at 0 failures.
3. `git diff main -- bridge/src`: the lines that are not comments are the two constants before and after
   (`SearchConfig`), the start line's decision list and the usage line's example (`MtgTable`), and the self-test.
4. `./tools/cubelab.sh seat-identity` (gate step 12m), 12.0 s: **all 4 games are the golden's** (forge B in 15, digest
   `78f3a94998355ea8`; search A in 13, 92 lines, `c68c2a849b7b0d54`; explore A in 18, `82d6d18c57bbd861`; plain B in
   14); no fixture edited.
5. `./tools/ai-ladder.sh list` on the lane and on main (`2802940e7`): 61 lines each, **byte-identical**;
   `search-v3-wide-t1-x2` `709c83cc4d48` and `search-v3-wide` `b95340935592` among them. `players.json` against
   main's, field by field: only the two notes differ.
6. After `npm --prefix web ci`: `node --test web/test/ai-ladder.test.ts` **63 of 63** (D552's case among them; 1.3 s),
   `web/test/cubelab-watch.test.ts` 13 of 13 (0.2 s), `web/test/claude-md.test.ts` 5 of 5;
   `node tools/watch-runner-selftest.mjs` **161 checks, 0 failures** (160 + the search-v6 alias; 5.9 s);
   `node tools/match-launcher-selftest.mjs` 238 checks (82.3 s; it plays no engine); `test_human.py` 15 tests OK (ws-8,
   `search-v6` at 3000, inside the M62 test); `node tools/decisions.mjs check` OK (466 decisions, next D553);
   `./tools/public-check.sh` OK; `npm --prefix web run build` (`tsc --noEmit`, then vite) clean. The rest of the web
   suite and the full gate were not run (the owner's, at the merge).
7. **The live seat, read off a real session**: `MTGTABLE_DISTILL_ROWS=var/d552/rows ./bridge/run.sh mtgtable.MtgTable
   --transport auto --ai-policy search --deck decks/pacho-shield.dck --ai-deck decks/doom-legion.dck --games 3 --seed
   64775`, 2 min 49 s. The start line is `ai policy = search
   (ms=3000,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pa,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1;
   search-v6, D412, D539, D546, D550, D552)`, and each of the three games' session headers carries `ai` = `{policy:
   search, version: search-v6, budgetMs: 3000, config: ms=3000,…,turns=1,…,dactiv=1}`. Three games to the end, the AI
   winning each by AllOpponentsLost (14, 16 and 19 turns; 40.0, 61.8 and 64.8 s of wall time), `MTGTABLE OK`, `emit
   errors 0`, `REVEAL count 0`, `UNIMPL members none`, `concedes 0`, `late frames 0`, two notices swept (an engine
   string that named a concealed card, blanked as §6 says); `tools/check-redaction.mjs` **PASS** on all three frame
   logs. The AI's searched decisions (the distill rows): **58** (41 priority, 17 attacks, 0 blocks), 11 overriding Forge
   (8, 3), no fallback; 92.9 s of search in all (18.4, 37.8 and 36.7 s a game); **mean 1,601 ms, median 1,446 ms, the
   longest 3,244 ms**, 16 decisions over 3,000 ms and none over 3,500.
   **Before, the same seed as search-v5** (`--ai-search ms=1500,turns=0`): the header `version: null`, `budgetMs:
   1500` (M86: search-v5's loop names no version now); the AI won all three (14, 16, 16 turns; 33.5, 41.0, 32.0 s);
   `MTGTABLE OK`, emit errors 0, REVEAL 0, redaction PASS ×3; 51 searched decisions (34, 17), 10 overriding, 38.1 s of
   search (10.4, 14.9, 12.8 s a game), mean 748 ms, median 573 ms, the longest 1,581 ms. So on these decks search-v6
   thinks ×2.4 as long a game and about twice as long a decision, as J223 measured on cube decks.
8. **The counters**: `./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --ai-deck
   decks/doom-legion.dck --ai-policy search --seed <s> --out var/d552/rec-<s>.jsonl`, `<s>` = 64775, 64776, 64777: each
   `RECORD OK` and the redaction check PASS, the start line `policies = seat 0 plain, seat 1 search (search = search-v6,
   D440)`; 27.6, 37.7 and 30.1 s of wall time; the search seat won two (14 and 16 turns) and lost one (17), the
   results D546's and D550's runs had. Summed: 35 priority and 17 attack decisions considered, 84.0 s of search (59.4
   and 24.5), 6 changed (5 priority, 4 of them to a pass, and 1 attack); `search.p.dactiv.windows` 7,
   `declined.windows` 4, `instant.windows` 2, **`stackwin.windows` 1 and `passwin.windows` 1** (the first of either seen
   against Doom Legion at the live seat; D550's three had none), the opponent's pass granted once, no refusal, no
   retry, 0 searched blocks.
9. **Load**: every run above shared the machine with the scenery GPU job (100% GPU, a few CPU cores); load average
   1.0 to 1.8; the lab idle.

**Follow-up.** The cube lab's 63 widens: ForgeCoach's words for the live seat should say search-v6 and that it thinks
about 3 s a decision to the end of the next turn. `tools/cubelab/CubeLab.java`'s comment on `census-play`'s search
pilot still says "the 1.5 s budget" (line 139); true until D552, left as written because the file is the atlas's and
this lane does not touch it. Any job draft whose pilot checks the decision self-test's count (`dst.checks == 526`)
names 537 from this lane's merge on. The seat queue (`~/code/pc-results/study/seat-queue.md`, which this lane does
not write) gets a row for `search-v3-wide-t1-x2` marked landed by D552 at the merge.

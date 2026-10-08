id: J109
title: ForgeCoach table playtest, short: three best-of-three matches between two browsers (the friend on a phone), every move a click on the real board, after the J107 triage (ForgeCoach #109)
public_title: Table playtest (short)
public_est: ~2 to 4 h
cpu: light
cores: 3
max_workers: 1
mem_per_worker_gb: 4
repos: mtg-table@59a0ced (main: #98 state.playable M61, #99 Evybaby's cube; no change since J107's 503c602 touches the bridge's seat or the room), ForgeCoach@0011633 (main with #109: the target-player hang fixed in the harness, the last plan kept on screen while the next is written, the playtest judging the board only once it draws the wire's input); pinned so every game is one code version
decides: whether two-person play inside ForgeCoach is ready for a friend game: after J107's triage, three best-of-threes between two browsers end with no stuck seat, no hang on a trigger's target, no board left behind the wire, and every remaining unreachable option judged
public_decides: Two-person play inside ForgeCoach ready for a friend game
hypothesis: J107's table findings were the harness (a board read a moment early, a click as the question changed, a phone hand re-folded) and its three hangs were the harness waiting on a "Select target player" with both buttons off (ForgeCoach #109, reproduced on the fake engine and real Forge). With the harness fixed, three table best-of-threes complete with zero stuck, no-progress, board-lag and unreachable-option findings
rule: written before the run. READY if all three best-of-threes complete (a match winner in the room), every table game reaches a real end (win, loss or draw; a game past the turn cap is not one), and the counts of stuck / no-progress / ask-not-answered, board-lag, hidden-info, stack or combat mismatch, log-incomplete, page or console error and harness-error findings are all 0. Unreachable-option and click-no-act findings do not block READY by themselves: each is listed with its shot and frame and judged in the summary (a play no click can make is a bug; a monkey miss is not). Otherwise NOT READY, with each failing kind triaged
followup: morning-read
est: ~2-4 h. 3 best-of-three matches (seed 109; the cube per match is the playtest's own seeded pick), each a grid draft in the draft room and then two or three games between two browsers, both seats monkeys, the friend on a phone-sized touch board. J107: 15-40 min a game on the 9700X (median about 18). Pilot ~10 min
resumable: no
timeout: 6h
clean: var/playtest/J109
progress: metric pt.games games of 9
metrics: pt = sh: node -e 'const fs=require("fs");const o={games:0,ended:0,matches:0,matchesDone:0,findings:0,unreachable:0,clickNoAct:0,stuck:0,lag:0,hidden:0,board:0,log:0,errors:0,harness:0,turnCap:0,flow:0,other:0};const f="var/playtest/J109/table/report.json";if(fs.existsSync(f)){const r=JSON.parse(fs.readFileSync(f,"utf8"));for(const g of r.games||[]){o.games++;if(/^(win|loss|draw|host won|friend won)$/.test(g.result))o.ended++}for(const x of r.matches||[]){o.matches++;if(/won/.test(x.result))o.matchesDone++}const all=[...(r.games||[]).flatMap((g)=>g.findings||[]),...(r.matches||[]).flatMap((x)=>x.findings||[])];for(const y of all){o.findings++;const k=y.kind;if(k==="unreachable-option")o.unreachable++;else if(k==="click-no-act"||k==="control-not-clickable")o.clickNoAct++;else if(k==="stuck"||k==="no-progress"||k==="ask-not-answered"||k==="no-seat"||k==="reload-no-seat")o.stuck++;else if(k==="board-lag")o.lag++;else if(k==="hidden-info")o.hidden++;else if(/mismatch/.test(k))o.board++;else if(k==="log-incomplete")o.log++;else if(k==="page-error"||k==="console-error")o.errors++;else if(k==="harness-error")o.harness++;else if(k==="turn-cap")o.turnCap++;else if(k==="table-flow"||k==="bo3-incomplete"||k==="match-refused")o.flow++;else o.other++}}console.log(JSON.stringify(o))'
headline: pt.games, pt.ended, pt.matchesDone, pt.stuck, pt.lag, pt.unreachable, pt.clickNoAct, pt.errors

**Why.** J107 (2026-10-07) played 50 solo games and four of five table best-of-threes before a reboot. Its table findings and its three hangs were triaged in ForgeCoach #109:
- The hangs (solo g17, g18; table 2.1) were a mandatory trigger's "Select target player" (Blood Artist, Falkenrath Noble). Forge turns both buttons off and lists no card. The board offered the portraits, but the harness took the seat for "not deciding", and its watchdog counted ping/pong as progress, so each game ran to the 75-minute deadline.
- Most `unreachable-option` findings were the board read a moment before it drew the new input. Others were clicks landing as the engine's question changed, or a phone hand that folded again when the mode changed.
- `coach-blank` was real: the last plan disappeared while the next was written. It now stays, labelled.

The harness now waits for the board's `data-input-seq` before judging, records a board that stays behind as `board-lag` (a real-bug signal), and asks the target-player trigger like any decision. This short table-only night checks that friend play holds up with the measuring fixed. It also plays the fifth best-of-three that J107 lost to the reboot.

**What the night plays.** Three best-of-threes in the draft room. The host is on a desktop board and the friend on a phone-sized touch board (390×844, `--viewport mixed`). There is no coach (`--coach` off, as in J107's table half). Each game leaves its frames (`frames-g*.jsonl.gz`) and a trace of every decision and click (`trace-g*.jsonl`).

**Isolation.** As in J107, everything runs on its own ports:
- the engine on 8862;
- its helper on 8863;
- the draft room on 8864;
- the table on 8866 (`--port-base 8862`).

A game Justin is playing on 8642 is never touched. The playtest starts its own `scripts/play.sh --engine-only --no-human-collect --no-auto-review`, and every step runs under `nice -n 19`. playwright-core comes from the PC's global install, exported as `PLAYWRIGHT_CORE` (J107's line).

## Pilot
About 10 minutes: the forge home, the bridge build, ForgeCoach's `npm ci`, a browser launch, then one solo game against real Forge (the machinery, not the table).
```bash
./tools/make-forge-home.sh
./bridge/build.sh
cd {ForgeCoach}
export PLAYWRIGHT_CORE="${PLAYWRIGHT_CORE:-$HOME/.nvm/versions/node/v24.20.0/lib/node_modules/playwright-core}"  # the PC's global install (J107); the harness also tries `npm root -g`
npm ci
node --input-type=module -e "import('./e2e/harness.mjs').then(async (h) => { const pw = await h.loadPlaywright(); const b = await h.launchBrowser(pw); await b.close(); console.log('browser ok'); })"
rc=0
nice -n 19 npm run playtest -- --mode solo --games 1 --seed 1091 --decks cube --port-base 8862 --out {mtg-table}/var/playtest/J109/pilot || rc=$?
test "$rc" -le 1
```
metrics: pilot = sh: node -e 'const fs=require("fs");const f="var/playtest/J109/pilot/report.json";const o={games:0,ended:0,harness:0,stuck:0};if(fs.existsSync(f)){const r=JSON.parse(fs.readFileSync(f,"utf8"));for(const g of r.games||[]){o.games++;if(/^(win|loss|draw)$/.test(g.result))o.ended++;for(const y of g.findings||[]){if(y.kind==="harness-error")o.harness++;if(y.kind==="stuck"||y.kind==="no-progress"||y.kind==="no-seat")o.stuck++}}}console.log(JSON.stringify(o))'
check: pilot.games == 1
check: pilot.ended == 1
check: pilot.harness == 0

A finding in the pilot's game does not fail the pilot. It goes into the night's report.

## Commands
```bash
cd {ForgeCoach}
export PLAYWRIGHT_CORE="${PLAYWRIGHT_CORE:-$HOME/.nvm/versions/node/v24.20.0/lib/node_modules/playwright-core}"  # the PC's global install (J107); the harness also tries `npm root -g`
rc=0
nice -n 19 npm run playtest -- --mode table --games 3 --seed 109 --decks cube --viewport mixed --stall-s 150 --port-base 8862 --max-shots 150 --out {mtg-table}/var/playtest/J109/table || rc=$?
test "$rc" -le 1
```
check: pt.games >= 6
check: pt.matches == 3
check: pt.harness <= 1

The playtest exits 1 when a game has a finding, which is its normal result, and 2 when it cannot run. The block fails only on 2. The checks only say that the night played its games. READY comes from the rule, in the summary.

## Abort if
abort: pt.games >= 3 and pt.harness > pt.games / 2
abort: pt.games >= 3 and pt.ended == 0

## Report
collect: var/playtest/J109/table/report.md
collect: var/playtest/J109/table/report.json
collect: var/playtest/J109/table/shots/*.png
collect: var/playtest/J109/table/trace-*.jsonl
collect: var/playtest/J109/table/frames-*.jsonl.gz
collect: var/playtest/J109/pilot/report.md

summary.md should give:
- **READY or NOT READY**, by the rule, in one line.
- The three matches, each with its cube, result and games, and seconds per game.
- Every finding kind from report.md's "Findings by kind", with:
  - its count;
  - one example (game, seat, frame, prompt, card);
  - its screenshot path;
  - whether the seat was the phone (friend) or the desktop (host).
- `board-lag`, `stuck` and `no-progress` called out first, whatever their count.
- Any "Select target player" in the traces (`grep -l "Select target player" trace-*.jsonl`) and how it ended.
- Paths exercised (report.md's "Paths exercised"), saying plainly if `target-player` never came up.

Do not read win rates into these games. The monkey plays at random by design.

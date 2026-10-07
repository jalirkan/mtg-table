id: J107
title: ForgeCoach full-game playtest overnight: 50 games against Forge and 5 best-of-three tables between two browsers, every move a click on the real board by a monkey that reads the engine's offer from the protocol stream and never sends a frame of its own
public_title: Full-game playtest
public_est: one night (~5 to 8 h)
cpu: light
cores: 3
max_workers: 1
mem_per_worker_gb: 4
repos: mtg-table@503c602 (main with #96 play.sh --no-auto-review, #97 search-v2, #98 state.playable M61), ForgeCoach@311da8e (main with #101 the playtest, #99/#100, #102 faster live coach + advice across reloads, #103 graveyard abilities from state.playable); pinned so every game is one code version
decides: whether two-person play is ready for Justin's friend again: every unreachable option, stuck seat, board that disagrees with the frames, lost log, leak and page error the suite finds is fixed or listed before the next game
public_decides: Two-person play ready for a friend again
hypothesis: after ForgeCoach #86 to #103 (the playtest, the faster live coach, graveyard abilities from the engine's state.playable) and mtg-table #92, #93, #96 and #98 (M61), complete games played through the real UI reach a real end with no stuck seat and no hidden card in the page, and no option the engine lists in state.playable is unreachable (the two gaps the container runs left, graveyard abilities that are not keywords and the coach asking again after a reload, are fixed)
rule: written before the run. READY if, over all games: the five best-of-threes complete (a match winner in the room), at least 45 of the 50 solo games and every table game reach a real end (win, loss or draw), and the counts of stuck, hidden-info, stack or combat mismatch, log-incomplete, page or console error and harness error findings are all 0. Unreachable-option findings do not block READY by themselves: each kind is listed with its screenshot and frame, and judged in the summary (a play the engine offers that no click can make is a bug to fix; one the monkey guessed from the card script and Forge then refused is not). Turn-cap findings (a game past 40 rounds, when a 40-card deck runs out by about round 34) count as a game that did not reach a real end. Otherwise NOT READY, with each failing kind triaged
followup: morning-read
est: ~5-8 h. Solo: 50 games of a vintage, modern-era, pauper or synergy cube draft (two of ForgeCoach's drafting AIs, then its deck builder) or one of decks/*.dck, against Forge's Default, Reckless or Cautious AI. In this container a game took 4-6 min of wall clock, about 130 decisions, on a shared 4-core machine; on the 9700X perhaps 2-4 min, so 2-3 h. Table: 5 best-of-three matches, each a grid draft in the draft room and then two to three games between two browsers, both seats monkeys; 15 min a game here, 2.5-4 h for all five. Pilot ~10 min
resumable: no
timeout: 9h
clean: var/playtest/J107
progress: metric pt.games games of 60
metrics: pt = sh: node -e 'const fs=require("fs");const o={games:0,ended:0,matches:0,matchesDone:0,findings:0,unreachable:0,stuck:0,hidden:0,board:0,log:0,errors:0,harness:0,turnCap:0,flow:0,other:0};for(const m of ["solo","table"]){const f="var/playtest/J107/"+m+"/report.json";if(!fs.existsSync(f))continue;const r=JSON.parse(fs.readFileSync(f,"utf8"));for(const g of r.games||[]){o.games++;if(/^(win|loss|draw|host won|friend won)$/.test(g.result))o.ended++}for(const x of r.matches||[]){o.matches++;if(/won/.test(x.result))o.matchesDone++}const all=[...(r.games||[]).flatMap((g)=>g.findings||[]),...(r.matches||[]).flatMap((x)=>x.findings||[])];for(const y of all){o.findings++;const k=y.kind;if(k==="unreachable-option")o.unreachable++;else if(k==="stuck"||k==="no-progress"||k==="ask-not-answered"||k==="no-seat"||k==="reload-no-seat")o.stuck++;else if(k==="hidden-info")o.hidden++;else if(/mismatch/.test(k))o.board++;else if(k==="log-incomplete")o.log++;else if(k==="page-error"||k==="console-error")o.errors++;else if(k==="harness-error")o.harness++;else if(k==="turn-cap")o.turnCap++;else if(k==="table-flow"||k==="bo3-incomplete"||k==="match-refused")o.flow++;else o.other++}}console.log(JSON.stringify(o))'
headline: pt.games, pt.ended, pt.matchesDone, pt.unreachable, pt.stuck, pt.hidden, pt.board, pt.log, pt.errors

**Why.** The first real two-person game failed in front of Justin's friend: an attached Equipment could not be activated, a "choose a card from a graveyard" target never showed, blocking and the stack were unclear, the log was empty after a rejoin, and the coach slowed every turn. Agents had only tested with scripted bots and quick concedes. ForgeCoach's full-game playtest (`e2e/playtest/`, `npm run playtest`) plays whole games through the real UI. At every decision a monkey reads what the engine offers from the protocol stream: the ask and its options, the input's buttons and selectable cards, and at priority the seat's own cards, using Forge's card scripts to say which can be activated or cast from where. It finds the on-screen control for one option and clicks it: board tiles, attached chips, the hand, the zone picker and viewer, dialogs, the decision panel, combat and mana payment. An option the engine says is legal with no control is an unreachable-option finding, with a screenshot, the frame index, the ask and the card. Invariants are checked throughout:
- no stuck seat;
- no page or console errors;
- the stack panel and the who-blocks-whom badges agree with the frames;
- a mid-game reload keeps the Game Log and the seat;
- no card the other seat holds hidden appears in the page;
- every game reaches a real end;
- a best of three completes with sideboarding.

In the container (2026-10-07), the first runs found and fixed three bugs: cycling at instant speed and flashback from the graveyard had no click (ForgeCoach #99), and a reload against Forge lost the log (#100). This night runs the suite at a scale the container cannot.

**What the night plays.** Every other solo game is on a phone-sized touch board (390×844), and so is the friend at every table (`--viewport mixed`). Justin's friend may well play on a phone: the hand folds, the stack and the dialogs share a small screen, and Concede is in the More menu. Solo desktop games run with a coach helper that answers at once (`--coach fake`), so the coach is checked too: its panel must never go blank on the opponent's turn, and auto-coach must ask at most once per turn cycle (`coach-blank`, `coach-cadence`). Before the auto-coach rework, main asks at each main phase and combat, about three times a round, so `coach-cadence` is expected until that rework is merged. Each game also leaves its frames (`frames-g*.jsonl.gz`) and a trace of every decision and click (`trace-g*.jsonl`), so a finding can be replayed by hand.

**Isolation.** Everything runs on its own ports: the engine on 8862, its coach helper on 8863, the draft room on 8864 and the table on 8866 (`--port-base 8862`). A game Justin is playing on 8642 is never touched. The playtest starts its own `scripts/play.sh --engine-only` with `--no-human-collect` (its games are not Justin's) and `--no-auto-review` (mtg-table #96; without it the helper's automatic review would queue a review per solo game at idle priority). Every step runs under `nice -n 19`. The browser is headless Chromium through playwright-core. playwright-core is not a ForgeCoach dependency, so the pilot only checks that it is there: `PLAYWRIGHT_CORE`, the global npm root, or the clone's own `node_modules`. If the pilot fails on it, the PC session installs it once, outside the clones (`npm install -g playwright-core@1.56.1 && npx playwright-core install chromium`), and runs the job again. That install is not part of the job.

**Re-posted from J106 (2026-10-07):** J106's pilot ran before the PC installed playwright-core (07:55 note) and stopped on `playwright-core is not installed`. J107 is the same job; each block now exports `PLAYWRIGHT_CORE` to the PC's global install, so the module resolves from inside the clone (08:50 note). **Posted 2026-10-07 by the cloud session** (drafted as J103 in the container; renumbered J107 and pinned to the fixes for the two gaps the container runs left).

## Pilot
About 10 minutes: the forge home, the bridge build, ForgeCoach's `npm ci`, a browser launch, then one solo game against real Forge.
```bash
./tools/make-forge-home.sh
./bridge/build.sh
cd {ForgeCoach}
export PLAYWRIGHT_CORE="${PLAYWRIGHT_CORE:-$HOME/.nvm/versions/node/v24.20.0/lib/node_modules/playwright-core}"  # the PC's global install (07:55 note); the harness also tries `npm root -g`
npm ci
node --input-type=module -e "import('./e2e/harness.mjs').then(async (h) => { const pw = await h.loadPlaywright(); const b = await h.launchBrowser(pw); await b.close(); console.log('browser ok'); })"
rc=0
nice -n 19 npm run playtest -- --mode solo --games 1 --seed 1031 --decks cube --port-base 8862 --out {mtg-table}/var/playtest/J107/pilot || rc=$?
test "$rc" -le 1
```
metrics: pilot = sh: node -e 'const fs=require("fs");const f="var/playtest/J107/pilot/report.json";const o={games:0,ended:0,harness:0,stuck:0};if(fs.existsSync(f)){const r=JSON.parse(fs.readFileSync(f,"utf8"));for(const g of r.games||[]){o.games++;if(/^(win|loss|draw)$/.test(g.result))o.ended++;for(const y of g.findings||[]){if(y.kind==="harness-error")o.harness++;if(y.kind==="stuck"||y.kind==="no-progress"||y.kind==="no-seat")o.stuck++}}}console.log(JSON.stringify(o))'
check: pilot.games == 1
check: pilot.ended == 1
check: pilot.harness == 0

The pilot only asks whether the machinery works: a browser starts, the engine starts on its own ports, and one game is played to its end. A finding in that game does not fail the pilot. It goes into the night's report.

## Commands
```bash
cd {ForgeCoach}
export PLAYWRIGHT_CORE="${PLAYWRIGHT_CORE:-$HOME/.nvm/versions/node/v24.20.0/lib/node_modules/playwright-core}"  # the PC's global install (07:55 note); the harness also tries `npm root -g`
rc=0
nice -n 19 npm run playtest -- --mode solo --games 50 --seed 106 --decks cube,dck --viewport mixed --coach fake --port-base 8862 --max-shots 150 --out {mtg-table}/var/playtest/J107/solo || rc=$?
test "$rc" -le 1
```
```bash
cd {ForgeCoach}
export PLAYWRIGHT_CORE="${PLAYWRIGHT_CORE:-$HOME/.nvm/versions/node/v24.20.0/lib/node_modules/playwright-core}"  # the PC's global install (07:55 note); the harness also tries `npm root -g`
rc=0
nice -n 19 npm run playtest -- --mode table --games 5 --seed 106 --decks cube --viewport mixed --port-base 8862 --max-shots 150 --out {mtg-table}/var/playtest/J107/table || rc=$?
test "$rc" -le 1
```
check: pt.games >= 55
check: pt.matches == 5
check: pt.harness <= 2

The playtest exits 1 when a game has a finding, which is its normal result. It exits 2 when it cannot run. Each block fails only on 2. The checks only say the night played its games. Whether play is READY comes from the rule above, in the summary.

## Abort if
abort: pt.games >= 10 and pt.harness > pt.games / 2
abort: pt.games >= 10 and pt.ended == 0

These fire only when the harness itself is broken: half the games end in a harness error, or ten games in, none has reached an end.

## Report
collect: var/playtest/J107/solo/report.md
collect: var/playtest/J107/solo/report.json
collect: var/playtest/J107/table/report.md
collect: var/playtest/J107/table/report.json
collect: var/playtest/J107/solo/shots/*.png
collect: var/playtest/J107/table/shots/*.png
collect: var/playtest/J107/solo/trace-*.jsonl
collect: var/playtest/J107/table/trace-*.jsonl
collect: var/playtest/J107/solo/frames-*.jsonl.gz
collect: var/playtest/J107/table/frames-*.jsonl.gz

These land in results/J107/ on pc-results, the playtest's report and screenshots together, as `playtest/` asked.

summary.md should give:
- **READY or NOT READY**, by the rule, in one line.
- Solo: games, results (win / loss / draw / abandoned), median turns and decisions, and seconds per game.
- Table: the five matches, each with its cube, result and games.
- Every finding kind from report.md's "Findings by kind", with its count, one example (game, frame, prompt, card), its screenshot path, and whether it was a phone or a desktop game (`viewport` in report.json).
- The coach: `coach-blank` and `coach-cadence` counts, questions per round (report.md's "Coach"). Name the unreachable options by card and reason. Say which kinds the container already found and fixed (ForgeCoach #99 and #100) and which are new.
- Paths exercised (report.md's "Paths exercised"): equip on an attached Equipment, a graveyard target, a multi-block, trigger order, an X spell, a modal choice. Say plainly if one never came up in the night.

Do not read win rates into these games. The monkey plays at random by design.

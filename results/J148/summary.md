# J148 — the move atlas, first full run (D451): summary

Written by the PC session, 2026-10-22, from `atlas.md`, `atlas.json` and `plan.json`; `phaseA/games.jsonl`; `phaseB/units.jsonl`, `branches.jsonl`, `logs/worker-0…6.log` and the frame logs; the STATUS, events and run logs of J143, J146 and J148; the job files (J143, J148 on pc-jobs); the system's boot list; and `tools/cubelab/engine.ts`.

**Method only. D451 registered no rule on what the maps say, and none is applied here.** Any surprise below is a candidate until a fresh seed and a second pair show it again.

## The run
- **Pair and plan.** `--pair auto` chose line 2, fair-fight-900000005 A vs B. On the ladder that line has 844 games, deck A won 439 of them, and its rule score is 0.0538, just ahead of peasant line 18 at 0.0546. The job was sized on peasant because the ladder grew to 25,056 games after posting.
- **The baseline listed 49 decisions, not 15:** 168 options, 490 units and 40,320 planned branch games. The job had assumed 15 decisions and 8,880 branch games.
- **J143 (mtg-table 3051b41), 10-19.**
  - Run1 began 18:59 on 7 workers. Phase A played 10,000 games with 0 engine errors, about 4,850 games/h, done near 21:03.
  - It was OOM-killed at 21:09 beside the PC's other lanes. It resumed at 21:25 and the PC went off at 21:34.
- **A ~4-minute boot near 18:08 on 10-20** (the journal stamps it 14:08: Windows writes local time to the RTC). Four more units finished.
- **10-21 boot at 10:39** (stamped 06:39). J143 ran on 3 workers, with two swap-driven drops to 2 between 11:43 and 12:08.
- **J143's 9 h wall timeout fired at 15:40 by the stamped clock**, about 5 h of real time. 237 unit lines were logged, 228 of them complete.
- **J146 (60252b3).** It started at 19:29 on 7 workers beside the GPU lane and was OOM-killed at 19:39.
- **J148, first attempt.** It started at 19:59 on 6 workers with nothing beside it and was OOM-killed at 20:07. Each phase-B JVM fills its `-Xmx4096m`: 3.9–4.1 GB RSS measured. The runner's `peak_worker_rss_gb` reads 1.31 and does not see this.
- **J148, resumed at 20:22 on 4 workers.**
  - All 259 remaining units ran in 7,833 s (to 22:33): 21,013 branch rows, ending near 9,650 branch games/h.
  - A branch took 2.28 s on average under random play and 1.27 s under Forge.
  - The final checks ran 22:33–00:10, 3,274 s of it the redaction checker. The worker logs stop at 22:32–22:33, so nothing was retried after 22:33.

**Clean checks:**
- 1,922,912 rows (ids checked against each seat's own log).
- 40,213 forks, all of them the position.
- 99 no-leak checks: none moved, and the negative control moved in all 99.
- 0 branch errors and 0 branch timeouts.
- Guardrails, read back from 86,988 random seats' logs:
  - a land was offered at 427,913 of 5,198,207 priority decisions and taken every time;
  - 20,000 of 20,000 opening hands were kept;
  - 0 violations.

## The two problems
**(a) 24 frame logs failed `check-redaction.mjs`. This is a false positive from the opponent's empty hand, not a leak.**
- **Which logs:** 16 seat-0 logs (d23-forge ×5, d25 ×2, d26 ×1, d40-random ×5, d41-random ×3) fail "not one card was redacted". The 8 seat-1 logs of the d40/d41 games fail the twin assertion, "the viewer never saw a named card in their own hand". These are 16 branch games in all.
- **What every one shows** (the state bodies read against protocol §3: `players[].zones`, hand `count`, the five-key `{id, zone, owner, controller, hidden:true}` stub):
  - Seat B's hand count is 0 in every state frame.
  - Seat B's library ships `count` with `cards: []`.
  - No seat-B card in hand or library appears anywhere in the file, in any frame type, stubbed or full.
- **Worked example, `d23-forge-o0-b15-seat0`:**
  - 52 states, game over at turn 18 (A won), with 299 named cards in seat A's own hand.
  - At the fork (turn 16) seat B had emptied its hand.
  - The one card it drew, Swords to Plowshares (turn 17), was cast in the draw step. It went library → hand → stack between two frames, so it appears only on the stack, which is public.
- **The passing sibling, `d23-forge-o0-b14-seat0`:** it ran to turn 22, seat B held 1 card at times, and the file has 17 five-key stubs and no full card.
- **A related flaw in the same files.** A forked copy's first frames read `turn: 0`. 2,365 branch logs never left turn 0 because they ended inside the fork's turn, and they pass only as the checker's pre-game WARN.
- **Fix, in the checker rather than the atlas.**
  - Add a flag, say `--empty-hand-ok`, that turns both "proves nothing" assertions into a WARN only when the file itself shows opponent hand count 0 and no opponent library card in every state. A broken `canBeShownTo` would show non-zero counts with full cards, so it still fails.
  - The atlas passes the flag for branch logs.
  - Make the fork copy carry the real turn number.
  - A blanket excuse on the atlas side would check nothing.

**(b) "11 units did not finish": 11 failure records for 6 units, of which 2 units never finished.**
- **7 records, "no answer in 7960 s (hung)", on d1-random-0/25/50/75.** These were clock jumps, not hangs. The watchdog in `tools/cubelab/engine.ts` compares `Date.now()` against each unit's start. On both boots, all running workers were declared hung at once within a minute of starting: 4 workers at the 10-20 boot (18:08:27Z start → 22:08:54Z restart), 3 at the 10-21 boot. The retries took 275–352 s.
- **1 record, d6-random-125: "the replay diverged at decision 6".** The replay listed `activate:144` where the baseline had `activate:145`, the same Map-token option with a different card id. Its retry completed.
- **d6-random-0 (2 records, 143 of 150 both times).** Both attempts stopped at branch 23, option 5 (`cast:18`), after the two longest pay-failure runs (19 and 17 lines). Worker 0's log shows the Java heap OOM in `ComputerUtilMana.getAvailableManaSources`. The 7 lost branches leave d6's random column at n 198.
- **d24-random-50 (1 record).** It ran next in the same out-of-heap JVM (worker 1). It OOM'd in the replay and returned `ok:false` with 0 branches after 2 s and no error text. The tool did not retry it, so d24's random column is n 175.
- **The Spellbinder pay loop.**
  - The seven worker logs carry 1,066 lines of "Didn't find what to pay for {1}". Every named source is Elite Spellbinder (seat B's cards 77 and 81).
  - They come from 217 unit attempts across 42 decisions, and **all are random continuations; no Forge playout looped.**
  - The random seat picks a spell its "can play and pay for now" test admits, Forge's auto-pay fails it under the tax, and nothing stops the seat picking it again. G3 covers only no-op abilities, not failed casts.
  - Most runs are 1–3 lines long. Only d6-random-0's ended in a kill, and the "hung" units were not this.

## Phase A: random vs random from the opening
- 10,000 games, 0 engine errors. Seat A won 5,322 and seat B 4,346. There were 332 draws, all at the turn cap.
- **Seat A's score: 54.9% [53.9, 55.9].** Under Forge on the ladder, deck A took 439 of 844 decisive games (52.0%).
- Turns: mean 26.2, median 25, 10th–90th 19–36, maximum 41.
- The first player won 4,804 of 9,668 decisive games.
- A ±2-point interval needs about 2,299 rollouts at this variance (2,401 at worst).
- G3 fired 33,016 times.

## Phase B: the two maps
- **Baseline** (seed 451, Forge on both seats): 26 turns, A won, B on the play.
- **Decisions:** 49 for seat A, 39 priority and 10 attack, at turns 2–26. There was **no block decision** with two or more options.
- **Branch games:** 40,213 distinct, 33,493 random and 6,720 Forge. 495 random and 11 Forge branches ended at the cap.

**Agreement**
- **Same best option: 32 of 49, 65.3% [51.3, 77.1].**
  - At 21 of those 49 decisions (d21–d22, d30–d48, turns 16–26) every option scored 100.0 under both maps, because the game was already won. There "same best" is a tie going to option 0.
  - On the other 28 decisions the maps agree at 11. On the 16 decisions of turns 2–12 (d0–d15) they agree at 4.
- **Mean rank correlation: −0.34 [−0.63, −0.03].**
  - This is over the 18 decisions where both maps' values vary. At the other 31 a tie leaves ρ undefined; `atlas.md`'s "over 49" overstates the base.
  - None of the 18 has an interval above zero. 4 lie below zero: d6 −0.93 [−0.97, −0.17], d8 −0.73 [−0.73, −0.35], d12 −1.00 and d29 −1.00 (two-option decisions, where ρ is ±1 by construction). The other 14 straddle zero.
- **Regret (best minus played).**
  - Under the random map the point is above zero at 13 decisions, and the interval excludes zero at 3: **d5 `cast:18` 55.0 [47.5, 63.0], d6 `activate:145` 27.8 [18.7, 36.4], d11 `attack:none` 22.5 [17.0, 29.0].**
  - Under Forge's map the point is above zero at 6 decisions and the interval excludes zero at none. The largest are d28 `attack:18` 10.0 [0.0, 22.5], d6 `pass` 5.0 [0.0, 12.5] and d29 `cast:2` 5.0 [0.0, 12.5].

**Where the disagreement sits.** Values are seat A's score in %, random (n 200) / Forge (n 40), with Wilson intervals.

| decision | option | random | Forge |
|---|---|---|---|
| d2, turn 4, p | pass (played) | 74.5 [68.0, 80.0] | 75.0 [59.8, 85.8] |
| | Deadly Dispute | 79.0 [72.8, 84.1] | 55.0 [39.8, 69.3] |
| d5, turn 6, p | Sentinel of the Nameless City (played) | 25.0 [19.5, 31.4] | 72.5 [57.2, 83.9] |
| | pass | 71.0 [64.4, 76.8] | 35.0 [22.1, 50.5] |
| | Llanowar Visionary | 80.0 [73.9, 85.0] | 62.5 [47.0, 75.8] |
| | Deadly Dispute | 73.5 [67.0, 79.1] | 20.0 [10.5, 34.8] |
| d6, turn 8, p (random n 198) | Ravenous Chupacabra (played) | 46.0 [39.2, 52.9] | 95.0 [83.5, 98.6] |
| | pass | 32.3 [26.2, 39.1] | 100.0 [91.2, 100.0] |
| | Map token | 73.7 [67.2, 79.4] | 90.0 [77.0, 96.0] |
| d7, turn 8, a | attack with Sentinel (played) | 47.5 [40.7, 54.4] | 90.0 [77.0, 96.0] |
| | no attack | 49.0 [42.2, 55.9] | 77.5 [62.5, 87.7] |
| d11, turn 10, a | attack with both (played) | 76.5 [70.2, 81.8] | 100.0 [91.2, 100.0] |
| | no attack | 99.0 [96.4, 99.7] | 100.0 [91.2, 100.0] |

**The pattern by kind.**
- **Priority, turns 4–8 (d2–d6).**
  - The random map's best is a cast or activation now: Deadly Dispute, Llanowar Visionary, a Map token. Forge's map prefers passing, or Sentinel at d5.
  - The largest single split is Sentinel of the Nameless City at d4 and d5: 23.5 and 25.0 under random play against 80.0 and 72.5 under Forge. Random branches after it last as long as the others (25.1–25.4 turns).
  - From d8 on, Forge's map saturates: most options score 97.5–100 at n 40. Later "disagreements" are the random map ranking options that Forge's map cannot separate.
- **Attack.**
  - Random's best is "no attack" at d7, d11 and d14, where Forge attacked. At d7 the two random values are within noise.
  - At d19 and d28 random play prefers the larger attack.
  - The maps name the same best option at 5 of 10 attack decisions.
- **Block.** None listed.

**The built-in caveat.** The random map values an option against an opponent who does not punish: random blocks are poor and random attacks do not press. "No attack" can score well because a random opponent's blocks and crack-back are weak, not because holding back is right. "Cast now" can likewise score well against an opponent who never answers it. Forge's map is about twice as wide at n 40.

## Known gaps
- **Small base.** One pair, one baseline game and one seed. The 49 decisions come from one game, so they are not independent, and the 21 already-won decisions dilute every across-decision number.
- **200/40 branches.** Forge's intervals are ±15 points, and ρ on 2–3-option decisions is ±1 or undefined.
- **Duplicates.** `branches.jsonl` holds 40,356 lines but 40,213 distinct rows: d6-random-0's second attempt re-logged 143. `atlas.md`'s "40,356 branch games" and "496 capped" include them; the per-option values are on paired distinct rows.
- **Timing.** The restarts mix loads (7, 5, 4 and 3 workers, plus swap), and `atlas.json`'s timing covers only J148's 259 units.
- **Never finished:** 2 units (d6 random n 198, d24 random n 175).
- **Checker flags.** The 24 false positives above, plus the turn-0 copies the checker excuses.
- **Spellbinder loop.** The random seat wastes decisions on casts it cannot pay for wherever Spellbinder is in play. That is a property of the random seat, not of Forge's map.
- **Three memory kills**, at 7, 7 and 6 workers. Each worker fills a 4 GB heap, but the job declared 2.5 GB and then 3 GB per worker. The fixes:
  - mtg-table PR #175 makes the heap configurable and gives the atlas 2048m;
  - `mem_per_worker_gb` 2.7;
  - nothing running beside phase B;
  - a unit timeout in minutes rather than 7,960 s, measured on a monotonic clock (`performance.now()`), so a clock jump can no longer "hang" every worker.

## What it says
On this one game, the two maps name the same best option at 32 of 49 decisions, but 21 of those are moves after the game was won, and on turns 2–12 they agree at 4 of 16. Where both maps can rank the options, they tend to rank them in reverse: mean ρ −0.34 [−0.63, −0.03] over 18 decisions, none positive beyond noise. Random play after a move favours casting now and not attacking, where Forge passes, casts Sentinel and attacks. Because the random map's opponent does not punish, this says what moves are worth against random play, not that Forge's moves are wrong.

id: J206
title: Random rollouts, iteration 6 (random-v7, one change: rollout=random4-them): one fixed 1,200-game match (600 mirrored pairs, D398, the confirm set, no stopping rule) of search-v2-rrandom4them-lcb-m40 against search-v1-anytime (search-v2) -- J205 (a)'s arm (D350's override=lcb, z 1, at margin 40) with only the rollout's opponent seat random-v4 and the searching seat's own continuation Forge's, as search-v2's rollouts play it -- read under D527's table (its SHOWN row restated by D530 point 7) and for D528's SIGNAL against J204 (b)'s policy-outlet line on the same deals (not replayed), with the count of successive SIGNAL INCONCLUSIVE readings re-read from J205's and J204's match lines; alone on the machine
public_title: Random rollouts in the search, sixth try: only the opponent random
public_est: ~3 h (one match)
public_decides: Whether a random opponent alone in the rollouts helps, or the track closes
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@ecd9bb4effcb9d792d22e7076fa0c962174cbea0 (the merge commit of D531's lane, pc/rollout-random-v7, on main, its first parent 1e72a8ec (D530's merge and J205's pin) or a main equal to it under every path a match runs, pushed to origin/main before posting; the lane's tip: b1764a161a518f68e8e47bae58f76fd0cdf788aa. It carries: the rollout value random4-them in bridge/src/mtgtable/ai/SearchConfig.java (the opponent's rollout seat random-v4, the searching seat none; parseLive refuses it), its DecisionSelfTest case (the never-run us-false/them-true seating), the ladder's rollout enum value (tools/ai-ladder/kinds.ts), the ladder player search-v2-rrandom4them-lcb-m40 (tools/ai-ladder/players.json), D531's decision file, the PLAN entry and the registry test. Pinned so every game is one code version, D341; D531 merges alone and first, and any other lane (D529's included) after it; the pilot checks, by content, that the pin is that merge (two parents, its second the lane tip, its first equal to 1e72a8ec under every path a match runs, the merge result equal to the lane tip there), that it brought exactly those four files under bridge/src, tools/ai-ladder and tools/ai-bench, and that nothing a ladder match runs (bridge/src, tools/ai-bench, tools/ai-ladder, tools/cubelab/lines.ts and rng.ts, tools/runner/control.ts, tools/ai-ladder.sh, tools/ai-bench.sh, tools/config.sh, forge-home/custom-cards, config.json) differs from J204's pin 137b2bf6 but those four files, none of which changes what search-v2 or policy-outlet plays (D531 point 4), so search-v2, the bench's deal function, the confirm set and the Forge homes are J204's)
decides: three pre-registered readings and the loop (D531 point 5), each from the match lines alone, every threshold compared in integer tenths of Elo (and ten-thousandths of score) as the lines carry them. FIRST, D527's table for the arm against search-v1-anytime, its SHOWN row restated for a random4-them candidate: SHOWN (a 4,800-game confirmation under D519's readings, then Forge's opponent model leaves the rollout loop for this arm; Forge stays for the searching seat's own continuation), INCONCLUSIVE (a 4,800-game confirmation first), NOT SHOWN indistinguishable (a candidate, confirmed at 4,800 games), NOT SHOWN worse not badly or loses badly (diagnose). SECOND, SIGNAL against J204 (b)'s baseline line (policy-outlet against search-v1-anytime on the same 600 deals, not replayed): diff = the arm's Elo point minus J204 (b)'s, hw = sqrt(((a.eloHi - a.eloLo)/2)^2 + ((b.eloHi - b.eloLo)/2)^2): SIGNAL SHOWN (diff >= +15 and diff - hw > 0), SIGNAL AGAINST (diff <= -15 and diff + hw < 0: the track closes), NO SIGNAL (the interval contains 0 and |diff| < 15: no signal under override=lcb at margin 40 with the opponent alone random at +-15 on the point, not equivalence; the track closes), SIGNAL INCONCLUSIVE (anything else), read only when the arm and J204 (b) are complete and both played exactly blocks 114,900,000-114,900,149. THIRD, the count of SUCCESSIVE SIGNAL INCONCLUSIVE readings: J205's own, recomputed from J205's and J204's match lines by J205's own verdict, plus 1 on this night's SIGNAL INCONCLUSIVE, reset to 0 by any other SIGNAL reading; two close the track as NO SIGNAL does. The loop's count: this iteration loses badly when its one arm does, and the loop stops when it does and J205's iteration lost badly (both J205 arms, their lines). The track closes on NO SIGNAL, SIGNAL AGAINST, the count at 2 or the loop's stop, unless the arm is a candidate, whose 4,800-game confirmation then runs first and decides (holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL). With the arm to diagnose and the track open, no random-v8 is pre-registered: the next step is decided from random-v7's counters and worst-lost games in a new decision (D530 point 7, D531 point 6); after random-v7 only these same stops close the track, never a schedule. SIGNAL unread because the deals differ: the next job replays what puts the arm and the baseline on the same blocks, nothing else follows. The self-play-from-random path waits for a reading confirmed at 4,800 games; any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on any reading. What is known: J204 on these deals, 1,200 games each: (a) search-v2-rrandom4-m60 -24.4 Elo [-38.4, -10.4], worse, not badly; (b) policy-outlet (search-v2's seat with the search off) score 0.3808 [0.3601, 0.4016], Elo -84.4 [-99.9, -69.3], 0 errors, 1 timeout; its blocks min 114900000, max 114900149, 150 blocks, 1200 games. J205 on these deals, 1,200 games each: (a) search-v2-rrandom4-lcb-m40 score 0.4492 [0.4292, 0.4691], Elo -35.4 [-49.5, -21.5], NOT SHOWN, loses badly, 0 errors, 1 timeout; (b) search-v2-rrandom4-lcb-m60 Elo -34.3 [-47.8, -20.9], NOT SHOWN, loses badly, 0 errors, 0 timeouts; SIGNAL (a) - J204 (b) +49.0 [28.3, 69.7] (+-20.7), SIGNAL SHOWN; signalInconclusiveCount 0; its iteration lost badly (both arms), so the two-losing count is 1 going into this night; (a)'s from-pass, to-other-play and to-pass shares of priority decisions 11.39%, 7.43%, 1.88% and its attack and block change rates 7.8%, 11.5% ((b): 9.68%, 6.26%, 1.21%, 6.7%, 9.9%), beside search-v2's 8.15%, 6.27%, 4.65%, 14.8%, 19.5% and J202 (b)'s 16.4%, 10.5%, 4.82%, 14.3%, 18.0%; lcb overrode / held / none 4,669 / 2,849 / 20,071 on (a), 3,913 / 2,317 / 21,366 on (b) (it held 37.9% and 37.2% of what the margin rule would have overridden, and cut attack, block and to-pass overrides to under search-v2's rates as well as the from-pass excess); the rule's own effect, (a) - J202 (b), -14.5 on the point (about +-19). D530 point 8 (an inference from four nights' direction counts, which this night tests): J199's random-self (the searching seat random, Forge the opponent) overrode at priority as both-seats random did, so the excess from-pass overrides are traced to the searching seat's own random continuation, and random4-them removes it; expected, not registered: from-pass overrides near search-v2's 8.15%, rollouts a decision nearer search-v2's than J205's (the searching seat's continuation is Forge's AI again), search.rr.* per random rollout about half of J205's (one random seat). Each reading's noise: the arm's own interval about +-13.5 Elo at 1,200 games; SIGNAL's hw about +-19 to +-21. Information, not a prediction any check reads
rule: written 2026-11-10 before any rated game of the arm, word for word as D531 states it (its point 5; D531's bold dropped, its table given row by row as reading | when | what it decides): "The pre-registered rule for J206 (written on 2026-11-10 before any rated game of the arm; the night's job quotes it word for word). Three readings and the loop, each from the match lines alone. *First, D527's table*, exactly as D530 point 5 states it, with the SHOWN row restated as D530 point 7 restates it for a `random4-them` candidate: the arm against `search-v1-anytime`, read once by the first row that holds — SHOWN (lower end above 0.5 and point at least +15 Elo: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games before it replaces Forge in the loop), NOT SHOWN, worse, not badly (upper end below 0 and at least −15 Elo: diagnose and iterate), NOT SHOWN, loses badly (upper end below −15 Elo: the same, the principle's cheap path in doubt) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player. (Only SHOWN is restated; in the other rows, D527's words as they stand, "replaces Forge in the loop" is read as SHOWN's restatement reads it, Forge's opponent model, and "iterate" is point 6's new decision.) *Second, SIGNAL*, D528's, with J204's baseline, on the arm: `diff` = the arm's Elo point minus J204 (b)'s (`policy-outlet` against `search-v1-anytime`, its own match line), `hw` = √(((a.eloHi − a.eloLo)/2)² + ((b.eloHi − b.eloLo)/2)²), the interval [`diff − hw`, `diff + hw`]; read only when the arm's match is complete, J204 (b)'s line is complete by D528's test (the two players in that order at `e350d94649a4` and `cdd55e02a89c`, `complete: true`, 1,200 games, errors plus timeouts at most 60, the four numbers) and both played exactly blocks 114,900,000–114,900,149, 150 blocks, every game: SIGNAL SHOWN | `diff` ≥ +15 and `diff − hw` > 0 | the random opponent under lcb carries signal beyond Forge's choice: the track stays open; SIGNAL AGAINST | `diff` ≤ −15 and `diff + hw` < 0 | worse than no search at all: the track closes; NO SIGNAL | `diff − hw` ≤ 0 ≤ `diff + hw` and |`diff`| < 15 | no signal under lcb at margin 40 with the opponent alone random at ±15 on the point (not a finding of equivalence): the track closes; SIGNAL INCONCLUSIVE | anything else | counted (third); the track stays open only if the count stays under 2; *Third, the count.* The SIGNAL INCONCLUSIVE count is of successive readings and is re-read from J205's and J204's match lines, not from J205's verdict file or this text: the verdict recomputes J204's SIGNAL from `var/ai-ladder/match-J204a.json` (at `216e66d89fe3`) and `match-J204b.json` by D528's rule, which gives J204's count (0 or 1); then J205's SIGNAL from `var/ai-ladder/match-J205a.json` (the deciding arm at `98eea870967e`) against J204 (b) by D530's rule, with D530's block condition on J205's (`var/j205/seeds-a.json`), which gives J205's count (J204's plus 1 on SIGNAL INCONCLUSIVE, 0 on any other reading, J204's when unread); this night's count is J205's plus 1 on SIGNAL INCONCLUSIVE and 0 on any other SIGNAL reading, and J205's unchanged when SIGNAL is unread. Two successive SIGNAL INCONCLUSIVE readings — J205's and J206's — close the track as NO SIGNAL does (D528 point 6). J206 emits `signalInconclusiveCount` (0, 1 or 2) for the next job to re-read the same way. If J204's two lines or J205 (a)'s line are not complete on the host (J205 (a) by the same test, at `98eea870967e`), the count is unread, and the verdict says so (no closing on it). J205's own verdict, kept unchanged in J206's, is what re-reads it. *The loop* (D523 point 10, D527 point 7). random-v7 registers one arm, so it loses badly exactly when that arm does (complete, upper end below −15). The loop stops when it does and J205's iteration lost badly — both of J205's arms complete and each with its upper end below −15, read from `var/ai-ladder/match-J205a.json` (`98eea870967e`) and `match-J205b.json` (`d6d75fdefd25`), complete by the same test; when they are not both complete, whether J205's iteration lost badly is unread and the loop does not stop on it. Going into J206 the count is 1 (J205's iteration lost badly: both arms, upper ends −21.5 and −20.9), so the loop stops if J206's arm loses badly. *Numbers.* Every threshold above is compared on the numbers the match lines carry: Elo in integer tenths, the score's lower end in integer ten-thousandths; `hw` is the root of those exact numbers. *The track closes* (D523 point 10's stop, the owner told with the counters which way it went; a closing decision writes it from the track's closing draft with the night's numbers) on NO SIGNAL, SIGNAL AGAINST, a SIGNAL INCONCLUSIVE count of 2, or the loop's stop — unless the arm is a candidate under the first reading, in which case its 4,800-game confirmation runs first and the closing waits on it (holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL). NO SIGNAL is worded as the table words it, never as equivalence. An incomplete arm gives no reading and is reposted. A complete arm whose blocks are not exactly 114,900,000–114,900,149 (a memory retry) is read under the first table, but SIGNAL is unread, nothing closes and nothing follows from it: the next job replays what puts the arm and the baseline on the same blocks (each in a ladder folder of its own, whose blocks start at 114,900,000: the arm, and the baseline too when J204 (b)'s were not those) and reads SIGNAL, the count and what follows by this rule. Reported beside, deciding nothing: the arm minus J205 (a) (`search-v2-rrandom4-lcb-m40`, the same rule on the same deals with both rollout seats random: the effect of giving the searching seat Forge's continuation, about ±19); the arm minus J205 (b) and minus J202 (b); each side's overrides of Forge by kind and by direction at priority (`fromPass`, `toOther`, `toPass`) against J205's and J202's; `search.lcb.overrode`, `held` and `none` a decision, and `held` as a share of overrode plus held; ms, rollouts and rounds a decision; every `search.rr.*` per random rollout (one random seat now, so about half of J205's where both seats fired alike); the deal blocks; the arm's ten longest and ten quickest lost games." How the night applies it (D531 points 3 to 5). ONE ARM: search-v2-rrandom4them-lcb-m40 (01e2aba2d33e), J205 (a)'s seat config (search-v2-rrandom4-lcb-m40, 98eea870967e) with rollout=random4-them for rollout=random4 and nothing else, one fixed match (D398, no stopping rule) of 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt) against search-v1-anytime (cdd55e02a89c), var/ai-ladder/match-J206a.json; the matchup is new on this host, so it takes the host's match blocks 114,900,000-114,900,149: J204's and J205's deals. NUMBERS: every threshold is compared in integers, Elo in tenths (Math.round(x * 10)) and the score's lower end in ten-thousandths, as the match lines carry them; hw is the root of a sum of exact half-tenths squared. A match is COMPLETE when its line names the two players in that order at their config hashes, says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers; J205's, J204's and J202 (b)'s lines by the same test. THE ARM is read on its own match alone, only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15 (D531: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation holds it); INCONCLUSIVE when not SHOWN and eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (tooWide and case 3 included). A candidate is SHOWN, INCONCLUSIVE, indistinguishable or no weaker (confirm 1: its own 4,800-game job); to diagnose is worse, not badly or loses badly. SAME DEALS: J204 (b)'s seeds file (var/j204/seeds-b.json) and the arm's (var/j206/seeds-a.json) each show 150 blocks, lowest 114,900,000, highest 114,900,149, and as many games as the match line played (1,200). SIGNAL is read on the arm only when it and J204 (b) are complete and on the same deals, exactly one of signalShown, signalAgainst, noSignal, signalInconclusive (diff, hw and the interval reported to 0.1); when they are complete and the deals are not provably the same, replayBaseline is 1: nothing closes, nothing follows, and the next job replays what puts the arm and the baseline on the same blocks. THE COUNT, of SUCCESSIVE readings: J205's own verdict, kept unchanged in this job's verdict script (nightJ205), re-reads J205 from var/ai-ladder/match-J205a.json, match-J205b.json, match-J204a.json, match-J204b.json, match-J202b.json, var/j204/seeds-b.json, var/j205/seeds-a.json and var/j205/seeds-b.json; its v6Margin must be 40 and its (a) complete at 98eea870967e, else the count is unread; J205's signalInconclusiveCount is that verdict's; signalInconclusiveCount is J205's plus 1 when this night's SIGNAL is INCONCLUSIVE, 0 when it is any other reading, J205's when SIGNAL is unread, null when J205's is unread; countCloses is 1 exactly when it is 2. THE LOOP: iterationLosesBadly is 1 exactly when the arm is complete and loses badly (one arm); loopStops is 1 exactly when it is and J205's iteration lost badly (both J205 lines complete, both eloHi < -15; unread when they are not both complete, and then the loop does not stop on it). closes is 1 exactly when noSignal, signalAgainst, countCloses or loopStops; trackCloses is closes and the arm no candidate (closing 1: a closing decision is owed); closingWaits is closes and a candidate; keepsOpen is SIGNAL read and not closes; newDecision (iterate) is 1 exactly when the arm is complete and to diagnose, SIGNAL was read and nothing closes: the next step is decided from random-v7's counters and worst-lost games in a new decision, and no random-v8 is named (v8 null). principleInDoubt is iterationLosesBadly. repost is 1 exactly when the arm is not complete. selfPlayOpens and liveSeatChanged are 0 in every reading of this night. Reported beside, deciding nothing: aMinusJ205a, the arm minus J205 (a) (the same rule on the same deals with both rollout seats random: the effect of giving the searching seat Forge's continuation, about +-19); aMinusJ205b and aMinusJ202b; J205's and J204's SIGNAL as recomputed; each side's ms per decision (p + a + b, and by kind) and their ratio, rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps, every search.rr.* counter per random rollout and per game (the opponent's random seat alone), each side's search.lcb.overrode, held and none and held as a share of overrode plus held, searched and changed decisions by kind and the priority overrides by direction (from a pass, to another play, to a pass) as shares, beside J205's and J202's; budget fallbacks with their interval and other fallbacks, the deal blocks played, the arm's ten longest and ten quickest lost games with their counters. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~2.5-3 h at 7 workers (an estimate; range 2.2-3.5 h), 4 h at worst (the match's own stop). From this host at 7 workers, alone, on these same 600 deals: J202 (b), search-v2-rrandom4-m40 against search-v2, played its 1,200 games in 2.62 h, J202 (a) in 2.27 h, J204 (a) in 2.39 h J205 (a) in 2.32 h and (b) in 2.51 h; the arm's searching seat plays Forge's continuation in its rollouts, as search-v2's do, so its decisions are guessed at about search-v2's cost, ~2.3-2.8 h. The match stops itself at --hours 4, which with the pilot is well under the 5 h timeout; a match that reaches its stop reports complete: false and gives no reading. It runs under the ladder's default 300 s per-game timeout (maxRounds is not lifted). Pilot ~12 min (the build, the bench self-test, the ladder tests, 4 games on one worker)
resumable: no
timeout: 5h
clean: var/j206 var/ai-ladder-pilot/J206 var/ai-ladder/match-J206a.json
progress: metric j206_games games of 1200
metrics: j206_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4them-lcb-m40","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j206_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4them-lcb-m40","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J206a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: c5a = sh: cat var/ai-ladder/match-J205a.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: c5b = sh: cat var/ai-ladder/match-J205b.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: c4b = sh: cat var/ai-ladder/match-J204b.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: roa = sh: cat var/j206/rollouts-a.json 2>/dev/null || echo '{"games":0}'
metrics: bsa = sh: cat var/j206/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: bs4 = sh: cat var/j204/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: wa = sh: cat var/j206/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0}'
metrics: v = sh: cat var/j206/verdict.json 2>/dev/null || echo '{"written":0,"arm":null,"candidate":0,"confirm":0,"newDecision":0,"iterate":0,"v8":null,"trackCloses":0,"closingWaits":0,"keepsOpen":0,"closes":0,"closing":0,"countCloses":0,"loopStops":0,"principleInDoubt":0,"iterationLosesBadly":0,"repost":0,"replayBaseline":0,"selfPlayOpens":0,"liveSeatChanged":0,"signalInconclusiveCount":null,"aMinusJ205a":null,"aMinusJ205b":null,"aMinusJ202b":null,"j205":{"read":0,"aRead":0,"v6Margin":null,"count":null,"loopRead":0,"iterationLosesBadly":0,"iterate":0,"v7":null,"signal":{"read":0}},"j204":{"read":0,"count":null,"baselineDeals":0,"b":{"complete":0}},"a":{"complete":0,"sameDeals":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0},"signal":{"read":0,"signalShown":0,"signalAgainst":0,"noSignal":0,"signalInconclusive":0,"diff":0,"hw":0,"lo":0,"hi":0}}'
headline: cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.eloLo, cma.eloHi, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, roa.aRolloutsPerDecision, roa.bRolloutsPerDecision, roa.ratio, roa.aLcb.overrode, roa.aLcb.held, roa.aLcb.none, roa.aLcbHeldShare, roa.aPriorityShare.fromPass, roa.bPriorityShare.fromPass, roa.aPerRollout.v2_ownStack, roa.aPerRollout.v3_goodBlock, roa.aRrFailures, v.a.shown, v.a.inconclusive, v.a.indistinguishable, v.a.worseNotBadly, v.a.losesBadly, v.a.candidate, v.a.sameDeals, v.signal.diff, v.signal.hw, v.signal.lo, v.signal.hi, v.signal.signalShown, v.signal.signalAgainst, v.signal.noSignal, v.signal.signalInconclusive, v.j205.count, v.signalInconclusiveCount, v.countCloses, v.j205.iterationLosesBadly, v.iterationLosesBadly, v.loopStops, v.trackCloses, v.closingWaits, v.keepsOpen, v.confirm, v.newDecision, v.replayBaseline, v.aMinusJ205a, v.aMinusJ202b, bsa.min, bs4.min, v.repost, wa.lost

**Why this job** (D531, the sixth iteration of D523's point 10 loop: J199 random-v2, J201 random-v3, J202 random-v4,
J204 random-v5, J205 random-v6, and now random-v7; the owner's principle,
in his words as D523 quotes them): "Yes, there are terribly useless situations that will arise from randomized moves, but
you are the agent in the loop who can recognize that, iterate to avoid it, so we waste less time on useless data." D523
took Forge's judgment out of the search's rollouts and put guarded randomness in; D525 and D527 added and fixed
guardrails; D528 found the override margin the one lever that moved and asked whether the random values carry any
signal beyond Forge's own choice (J204: SIGNAL SHOWN); D530 tried the margin's noise-aware form, D350's lcb. The chain
so far, every arm against search-v1-anytime on these same 600 deals:

| iteration | arm | change | Elo vs search-v2 [95%] | reading |
|---|---|---|---|---|
| random-v2 (J199 a) | search-v2-rrandom | the atlas's random seat + R1-R7, both rollout seats | -43.7 [-57.1, -30.4] | loses badly |
| random-v2 (J199 b) | search-v2-rrandom-self | the same, searching seat only | -25.5 [-38.3, -12.8] | worse, not badly |
| random-v3 (J201 a) | search-v2-rrandom3 | + R8 the good block | -30.8 [-44.4, -17.2] | loses badly |
| random-v3 (J201 b) | search-v2-rrandom3-held | + R9 the held instant | -29.6 [-43.7, -15.6] | loses badly |
| random-v4 (J202 a) | search-v2-rrandom4 | R8 made lethal-aware | -39.5 [-53.9, -25.3] | loses badly |
| random-v4 (J202 b) | search-v2-rrandom4-m40 | + the override margin 20 to 40 | -20.9 [-34.1, -7.7] | worse, not badly |
| random-v5 (J204 a) | search-v2-rrandom4-m60 | the override margin 40 to 60 | -24.4 [-38.4, -10.4] | worse, not badly |
| random-v5 (J204 b) | policy-outlet (the baseline) | search-v2's seat with the search off | -84.4 [-99.9, -69.3] | (no reading of its own) |
| random-v6 (J205 a) | search-v2-rrandom4-lcb-m40 | D350's override=lcb, z 1, at margin 40 | -35.4 [-49.5, -21.5] | loses badly |
| random-v6 (J205 b) | search-v2-rrandom4-lcb-m60 | the same at margin 60 | -34.3 [-47.8, -20.9] | loses badly |

J205's SIGNAL, (a) minus J204 (b): +49.0 [28.3, 69.7] (+-20.7), SIGNAL SHOWN; its successive count 0;
its iteration lost badly (both arms: upper ends -21.5 and -20.9), so the two-losing count is 1 going into this night. This job exists only if J205 reads both arms to diagnose with the track open
(it did: its verdict carries iterate 1 and v7 search-v2-rrandom4them-lcb-m40; the pilot checks it, `pj.v7IsArm`); then D530 point 7's pre-registered random-v7 runs: one change from J205 (a), `rollout=random4-them` -- in the rollouts the opponent's seat
plays random-v4 and the searching seat plays its own continuation as search-v2's rollouts do. D530 point 8 is why: the
excess overrides left at margin 40 are at priority and about acting (from a pass to a play at x2.01 search-v2's rate,
one play to another at x1.68), and J199's `random-self` (the searching seat random, Forge the opponent) overrode at
priority exactly as both-seats random did; a pass hands the rest of the turn to the searching seat's random
continuation while a play is made as the candidate says, so the search prefers to act. random-v7 removes that source
and keeps the random opponent. D531 is `docs/decisions/D531-random-v7-them.md` at the pin: its point 5 is the rule,
point 6 what follows each case, point 4 the night and why J204 (b) is still its baseline; D530 point 7 the
pre-registration and point 8 the argument; D528 the SIGNAL rule; D527 the table; D523 the seam and point 10, the
iteration loop; D350 the lcb rule.

**What is built** (D531, the merge of pc/rollout-random-v7). The first lane since D527 to change code a match runs:
- `bridge/src/mtgtable/ai/SearchConfig.java`: the rollout value `random4-them`. `rolloutRandomUs()` is false for it,
  `rolloutRandomThem()` and `rolloutRandomV4()` true, so `rolloutRandomSeat()` is `Config.randomV4Block()` (random-v2
  plus R8 made lethal-aware, no R9: J202's to J205's seat, unchanged); every older value's three predicates return what
  they did. `parseLive` refuses a random seat on either side (measurement only). No guardrail changes;
- `bridge/src/mtgtable/ai/DecisionSelfTest.java`: `rolloutRandomV4Them`, the seating never run before -- the searching
  seat no random seat, the opponent random-v4, the `SearchPolicy.Limits` the rollout builds carrying exactly that,
  `random-self`'s reversed; the config differing from J205 (a)'s in `rollout` alone; `parseLive` refusing it. The
  build runs it (`decision selftest: <n> check(s), 0 failure(s)`);
- `tools/ai-ladder/kinds.ts`: the ladder's `rollout` enum takes `random4-them`;
- `tools/ai-ladder/players.json`: `search-v2-rrandom4them-lcb-m40` (kind `search`, every param search-v1-anytime's
  (`profile: Default`, `outlets: on`, `budgetMs: 1500`, `anytime: on`) plus `margin: 40`, `override: lcb`, `z: '1'`,
  `rollout: random4-them`), config hash `01e2aba2d33e`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1,rollout=random4-them`;
  J205 (a)'s (`search-v2-rrandom4-lcb-m40`, `98eea870967e`) with the rollout value alone changed
  (`web/test/ai-ladder.test.ts` holds that);
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hash is D531's, computed by `registry.ts` on the lane; the pilot records the real ones
(`var/j206-tools/players.json`) and checks the config strings and the hashes (`pl.hashesAsD531`). In the rollouts
(`SearchPolicy.playout`) the searching seat is plain `RolloutController` (Forge's AI with the candidate forced first,
every search-v2 rollout's seat) and the opponent `RolloutController.Random` on random-v4, seeded from the rollout's seed
and its seat index as under `random4`, common random numbers across a round's candidates. The rule is J205 (a)'s: with
lcb, Forge's answer is kept when the best candidate has fewer than 3 paired rounds or no standard error, and
overridden when `diffLeaf[best] - z*seDiff[best] > 40`; each searched decision counts `search.lcb.overrode`, `held` or
`none` on the arm's side; search-v2's side, on the margin rule, has none.

**The counters.** The arm's batch lines carry D523's, D525's and D527's `search.rr.*` counters -- now the opponent's
random seat's alone, counted into the searching seat's counts (`countRandomSeats`), so a counter per random rollout is
about half of J205's where both seats fired alike -- and D350's `search.lcb.*`; the match line carries none of them
(`tallyLine`). `var/j206-tools/rollouts.cjs` is J205's reader unchanged: each side's lcb verdicts, its searched and
changed decisions by kind and its priority overrides by direction (`search.p.changed.fromPass`, `toOther`, `toPass`).
D530 point 8's prediction lives in those directions; the night reports them beside J205's and J202's.

**The worst-lost games** (D523 point 10): `var/j206-tools/worst.cjs` is J205's, unchanged, its mode `random4-them`.

**The match** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), 1,200 games, 600 pairs,
in the real ladder folder `var/ai-ladder` on this host: **(a) `search-v2-rrandom4them-lcb-m40` vs `search-v1-anytime`**,
`--out var/ai-ladder/match-J206a.json`.

**Deal blocks, and why J204's baseline is this night's** (D531 point 4). A match's batches take the host's match base
(`hostBase(host)` + 900,000 = 114,900,000, `cmdMatch` in `tools/ai-ladder/cli.ts`) and then the matchup's next unused
block (`nextBseed`), counting blocks per unordered matchup by name (`mkey`). The arm is a new name, so it takes
**114,900,000-114,900,149**, as J204 (b)'s `policy-outlet` and J205's arms did; a block's deck pairs are
`batchPairs(bseed, nPairs, per)`, a fixed function of the block and the set, and its games' seeds the bench's `--seed
<bseed>`. So when the pin is D531's merge, its first parent `1e72a8ec` under every path a match runs and its result the
lane tip there (the pilot's `sd`, by content: D531 merges alone and first, and J206 is pinned to that merge), nothing
a ladder match runs differs from J204's pin 137b2bf6 but `players.json`'s added players and D531's four files (each
read in D531 point 4 for whether it changes what search-v2 or policy-outlet plays: it does not), and
both lines played exactly those 150 blocks (`var/j204/seeds-b.json`, the pilot's `pj.baselineDeals`; the arm's
`var/j206/seeds-a.json`, the verdict's `a.sameDeals`), the arm and the baseline played the same deals and SIGNAL is
read on them. A match retried after a memory stop takes the next unused blocks (114,900,150 onward); the verdict then
reads the arm under the table but not SIGNAL, and the next job replays what puts the arm and the baseline on the same
blocks, nothing else following from the night.

**Why one night and no tuning.** The arm changes one thing in an arm already played on these deals (which seat the
rollouts make random), and every other value is J205 (a)'s. Nothing is selected, so its score is read as it is. What
follows the night is D531 point 6: a 4,800-game confirmation for a candidate; for an arm to diagnose with the track
open, a new decision from random-v7's counters and worst-lost games (no random-v8 is pre-registered; after random-v7
only the same stops close the track); for a closed track, a closing decision written from the track's closing draft and
the owner told. D523's point 10 iteration rule, quoted word for word (bold dropped): "After J199, the agent reads the
counters and the worst-lost games — the arm's lost games with the longest turn count and the lowest arm life at the
end, the batch line's `seed` replayed with `--record full` into a frame log (the searched decisions' reports say which
candidate each rollout preferred) — names the useless lines random-v2 still plays, adds or fixes guardrails (each a
rule with the failure it prevents, the evidence and a counter, as above, in a new decision that amends this one),
registers the result as a new arm (`random-v3`, a new name and hash; the arms above stay what they measured), pilots it
and re-runs the same 1,200-game match without asking the owner, who gets each night's results. The loop stops only on
a SHOWN or indistinguishable reading confirmed at 4,800 games, or on two successive v-iterations that lose badly; then
the owner is told, with the counters, which way it went." D528 added the SIGNAL stop to it and D530 and D531 the
count's re-reading, all written before this night's first game. The match never touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523 to D531 name it in their rules): a ladder match plays to
wall-clock budgets, so contention changes the rollouts each side affords, and the match has search-v2 on one side; it
is admitted only onto an empty machine and nothing, heavy or light, is admitted beside it; while it is next and waits,
nothing newer starts. `cores: 7` keeps the width J195's to J205's walls were measured at. No `after:`; it starts once
the jobs before it have ended, and it needs J205's report block to have run (the pilot reads J205's and J204's match
lines and `var/j205/seeds-a.json`, `var/j205/seeds-b.json` and `var/j204/seeds-b.json`). It may run beside the art
session's GPU painting queue, which is outside the lab and CPU-light but not memory-free; the runner's memory rule
handles that as for J205.
## Pilot
About 12 minutes:
- the pin is merged;
- the build (the lint, javac and the decision self-test, which now holds D531's `random4-them` case), the bench
  self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the four players (search-v1-anytime, J205 (a)'s search-v2-rrandom4-lcb-m40, J204 (b)'s
  policy-outlet, and the arm), the arm's seat config is J205 (a)'s with `rollout=random4-them` for `rollout=random4`
  and nothing else, and the hashes are D531's;
- the pin is the merge of D531's lane (two parents), it brought under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` exactly `bridge/src/mtgtable/ai/SearchConfig.java`, `bridge/src/mtgtable/ai/DecisionSelfTest.java`,
  `tools/ai-ladder/kinds.ts` and `tools/ai-ladder/players.json`; and **nothing a ladder match runs but those four files
  differs from J204's pin 137b2bf6** (`bridge/src`, `tools/ai-bench` (the set and its decks), `tools/ai-ladder`, the
  modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`,
  `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge home),
  `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path)); `sd.sameCode`: search-v2, the bench's
  deal function, the confirm set and the Forge homes are J204's, so J204 (b)'s line is this night's baseline; if it is
  not, the job is not run as drafted: D531 point 4 adds the baseline's replay as a second match instead;
- J205's two final match lines, J204's and J202 (b)'s are on this host, J204 (b) played exactly blocks
  114,900,000-114,900,149 (`var/j204/seeds-b.json`), J205 is re-read by its own verdict (v6Margin 40, its deciding arm
  `search-v2-rrandom4-lcb-m40` complete), and J205 is a night that iterated to this arm (`v7`
  `search-v2-rrandom4them-lcb-m40`: both arms to diagnose, SIGNAL read, nothing closed), so a J206 posted after a J205
  that closed the track or found a candidate fails here;
- the verdict script, the rollout reader, the worst-games reader and the block reader written and tested on synthetic
  files;
- 4 games of the arm against `search-v1-anytime`, one worker, in the pilot's own folder: the arm and search-v2 search,
  the arm on the lcb rule and search-v2 on the margin rule (`search.lcb.*` on the arm's side only), the reader agrees
  with the match line, the arm's random rollouts are counted and its guardrails fire (the opponent's random seat:
  **the first run of this seating**), every line's config A ends in `,rollout=random4-them`, and search-v2's side
  carries no `search.rr.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j206-merged.txt || echo 0 > var/j206-merged.txt
cat var/j206-merged.txt
rc=0; ./bridge/build.sh > var/j206-build.txt 2>&1 || rc=$?
cat var/j206-build.txt
# D531's self-test case runs inside the build's decision self-test: its line, with 0 failures
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j206-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j206-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the four players resolve; the arm is J205 (a) with rollout=random4-them for rollout=random4 and nothing else (D531
# point 3); the hashes are D531's; the pin is D531's merge and, in everything a ladder match runs, J204's pin but D531's four files
mkdir -p var/j206-tools
./tools/ai-ladder.sh list > var/j206-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom4-lcb-m40|policy-outlet|search-v2-rrandom4them-lcb-m40) ' var/j206-tools/players.txt
node - <<'J206EOF'
// J206's pilot: the four players resolve; the arm is J205 (a)'s seat config with `,rollout=random4` replaced by
// `,rollout=random4-them` at its end and nothing else; the hashes are D531's (and D530's and D528's unchanged).
const fs = require('fs');
const L = fs.readFileSync('var/j206-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), l40 = get('search-v2-rrandom4-lcb-m40'), po = get('policy-outlet'), arm = get('search-v2-rrandom4them-lcb-m40');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const L40CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1,rollout=random4';
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const r = {
  present: [v1, l40, po, arm].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  them_only: base && l40 && arm && l40.kind === 'search' && arm.kind === 'search' && l40.cfg === L40CFG
    && arm.cfg === L40CFG.replace(/,rollout=random4$/, ',rollout=random4-them') && arm.cfg !== l40.cfg
    && /,margin=40,.*,override=lcb,z=1,anytime=1,rollout=random4-them$/.test(arm.cfg) ? 1 : 0,
  baseline_is_seat: base && po && po.kind === 'policy' && po.cfg === 'Default+outlets' && v1.cfg.slice(0, v1.cfg.indexOf('+search:')) === po.cfg ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-rrandom4-lcb-m40': l40?.hash ?? null, 'policy-outlet': po?.hash ?? null, 'search-v2-rrandom4them-lcb-m40': arm?.hash ?? null },
  hashesAsD531: v1?.hash === 'cdd55e02a89c' && l40?.hash === '98eea870967e' && po?.hash === 'e350d94649a4' && arm?.hash === '01e2aba2d33e' ? 1 : 0,
  cfg: arm?.cfg ?? null,
};
r.ok = r.present && r.v1_cfg_ok && r.them_only && r.baseline_is_seat && r.hashesAsD531 ? 1 : 0;
fs.writeFileSync('var/j206-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J206EOF
# the code, by content (D531 point 4, condition 1). HEAD is the runner's checkout of the pin, D531's merge: it must have
# two parents, its second the lane tip, its first equal to 1e72a8ec (D530's merge, J205's pin) under every path a match
# runs, and the merge result equal to the lane tip there. A pin with no second parent writes `none` and FAILS the check.
LANE_TIP='b1764a161a518f68e8e47bae58f76fd0cdf788aa'
PATHS='bridge/src tools/ai-bench tools/ai-ladder tools/cubelab/lines.ts tools/cubelab/rng.ts tools/runner/control.ts tools/ai-ladder.sh tools/ai-bench.sh tools/config.sh forge-home/custom-cards config.json'
C=var/j206-tools/code
rm -rf $C && mkdir -p $C
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > $C/parents.txt
git rev-parse -q --verify 'HEAD^2' > $C/parent2.txt 2>/dev/null || { echo none > $C/parent2.txt; echo 'J206 PILOT: HEAD has no second parent: the pin is not a merge' >&2; }
echo "$LANE_TIP" > $C/lanetip.txt
if git diff --quiet 1e72a8ecbb332d35c8edb2e1008b706dcd993ba7 'HEAD^1' -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/first-same.txt
if git diff --quiet 'HEAD^2' HEAD -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/merge-is-tip.txt
git diff --name-only 'HEAD^1' HEAD -- bridge/src tools/ai-ladder tools/ai-bench > $C/merge-code.txt 2>/dev/null || : > $C/merge-code.txt
git diff --name-only 137b2bf697c30c95533fa6a02c10a6d57ca32b75 HEAD -- $PATHS > $C/since-j204.txt 2>/dev/null || echo '(J204 pin 137b2bf6 is not in this checkout)' > $C/since-j204.txt
cat > var/j206-tools/codecheck.cjs <<'J206EOF'
// J206's code check (D531 point 4, condition 1), by content as well as by name. Reads the files the pilot's git block
// wrote into <dir> and writes <dir>/../search-diff.json (or <out>). Each git answer is a file holding 1 (holds), 0
// (does not) or the answer itself:
//   parents.txt        the pin's parent count (`git rev-list --parents -n 1 HEAD`): must be 2, a merge
//   parent2.txt        HEAD^2's sha, or `none` when HEAD has no second parent (then the check FAILS, never passes)
//   lanetip.txt        the lane tip the job names (D531's merge's second parent)
//   first-same.txt     `git diff --quiet 1e72a8ec HEAD^1 -- <paths>` exited 0: main under every path a match runs is
//                      D530's merge (J205's pin), whose own diff from J204's pin there is players.json alone (J205's pilot)
//   merge-is-tip.txt   `git diff --quiet HEAD^2 HEAD -- <paths>` exited 0: the merge result there is the lane tip
//   merge-code.txt     `git diff --name-only HEAD^1 HEAD -- bridge/src tools/ai-ladder tools/ai-bench`: the lane's four files
//   since-j204.txt     `git diff --name-only 137b2bf6 HEAD -- <paths>`: the same four files (by name; read beside)
// usage: node codecheck.cjs <dir> <out.json>
const fs = require('fs');
const [dir, out] = process.argv.slice(2);
const lines = (f) => { try { return fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean); } catch { return []; } };
const one = (f) => lines(f)[0] ?? '';
const LANE = ['bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/SearchConfig.java', 'tools/ai-ladder/kinds.ts', 'tools/ai-ladder/players.json'];
const same = (x) => x.length === LANE.length && [...x].sort().every((y, i) => y === LANE[i]);
const parents = Number(one('parents.txt') || '0');
const parent2 = one('parent2.txt') || 'none', laneTip = one('lanetip.txt');
const merge = lines('merge-code.txt'), since = lines('since-j204.txt');
const r = {
  parents, parent2, laneTip,
  isMerge: parents === 2 && parent2 !== 'none' ? 1 : 0,
  secondParentIsLaneTip: /^[0-9a-f]{40}$/.test(laneTip) && parent2 === laneTip ? 1 : 0,
  firstParentIsJ205Pin: one('first-same.txt') === '1' ? 1 : 0,
  mergeIsTip: one('merge-is-tip.txt') === '1' ? 1 : 0,
  mergeIsLane: same(merge) ? 1 : 0,
  sameCode: same(since) ? 1 : 0,
  merge, sinceJ204: since, other: since.filter((x) => !LANE.includes(x)),
};
r.ok = r.isMerge && r.secondParentIsLaneTip && r.firstParentIsJ205Pin && r.mergeIsTip && r.mergeIsLane && r.sameCode ? 1 : 0;
r.why = r.ok ? null : !r.isMerge ? 'the pin is not a merge (no second parent): not D531\'s merge, the code check fails'
  : !r.secondParentIsLaneTip ? 'HEAD^2 is not the lane tip the job names' : !r.firstParentIsJ205Pin ? 'main moved under a path a match runs since 1e72a8ec (another lane merged first): replay the baseline (D531 point 4)'
  : !r.mergeIsTip ? 'the merge result differs from the lane tip under a path a match runs' : !r.mergeIsLane ? 'the merge brought other files than the lane\'s four' : 'the diff from J204\'s pin names other files than the lane\'s four';
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
if (!r.ok) { console.error(`J206 PILOT CODE CHECK FAILS: ${r.why}`); process.exitCode = 1; }
J206EOF
node var/j206-tools/codecheck.cjs $C var/j206-tools/search-diff.json
# the code check on synthetic answers: the good merge passes; no second parent, another second parent, main moved under
# a match path (the same four names, other contents), a merge result that is not the tip, a fifth file each fail
L4='bridge/src/mtgtable/ai/SearchConfig.java bridge/src/mtgtable/ai/DecisionSelfTest.java tools/ai-ladder/kinds.ts tools/ai-ladder/players.json'
T=0123456789abcdef0123456789abcdef01234567
mkc() { d=var/j206-tools/code-selftest/$1; mkdir -p $d; echo "$2" > $d/parents.txt; echo "$3" > $d/parent2.txt; echo $T > $d/lanetip.txt; echo "$4" > $d/first-same.txt; echo "$5" > $d/merge-is-tip.txt; printf '%s\n' $L4 > $d/merge-code.txt; printf '%s\n' $L4 $6 > $d/since-j204.txt; node var/j206-tools/codecheck.cjs $d $d/out.json > /dev/null 2>&1 || true; }
rm -rf var/j206-tools/code-selftest
mkc good 2 $T 1 1
mkc noparent 1 none 1 1
mkc otherparent 2 fedcba9876543210fedcba9876543210fedcba98 1 1
mkc moved 2 $T 0 1
mkc notip 2 $T 1 0
mkc fifth 2 $T 1 1 tools/ai-bench/bench.ts
node -e 'const fs=require("fs");const r=(k)=>JSON.parse(fs.readFileSync(`var/j206-tools/code-selftest/${k}/out.json`,"utf8"));const ok=r("good").ok===1&&r("noparent").ok===0&&r("noparent").isMerge===0&&r("otherparent").ok===0&&r("otherparent").secondParentIsLaneTip===0&&r("moved").ok===0&&r("moved").firstParentIsJ205Pin===0&&r("moved").mergeIsLane===1&&r("moved").sameCode===1&&r("notip").ok===0&&r("notip").mergeIsTip===0&&r("fifth").ok===0&&r("fifth").sameCode===0?1:0;fs.writeFileSync("var/j206-tools/code-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
cat > var/j206-tools/verdict.mjs <<'J206EOF'
// J206's reading, pre-registered 2026-11-10 before any rated game of the arm (the job's rule: line; D531 point 5:
// D527's table with D530 point 7's SHOWN restatement for the one arm, D528's SIGNAL against J204 (b)'s baseline line,
// the SIGNAL INCONCLUSIVE count re-read from J205's and J204's match lines, the loop's count; D398's fixed match).
// usage: node verdict.mjs <match-J206a.json> <rollouts-a.json> <J205a.json> <J205b.json> <J204a.json> <J204b.json> <J202b.json> <J204-seeds-b.json> <J205-seeds-a.json> <J205-seeds-b.json> <J206-seeds-a.json> <out.json>
//        node verdict.mjs --prior <J205a.json> <J205b.json> <J204a.json> <J204b.json> <J202b.json> <J204-seeds-b.json> <J205-seeds-a.json> <J205-seeds-b.json> <out.json>
//        node verdict.mjs --selftest <scratch dir>
// EVERY THRESHOLD IS COMPARED IN INTEGERS: Elo values in tenths (Math.round(x * 10); a match line carries Elo to 0.1),
//   the score's lower end in ten-thousandths (it carries 4 places). hw stays a real number (the root of a sum of exact
//   half-tenths squared).
// THE ARM (D531 point 3): search-v2-rrandom4them-lcb-m40 (01e2aba2d33e), config A against search-v1-anytime (search-v2,
//   cdd55e02a89c), 1,200 games, 600 mirrored pairs, the confirm set, no stopping rule. One arm: random-v7.
// J205, RE-READ (D531 point 5, third): nightJ205 below is J205's own verdict, unchanged (its selftest cases kept), run
//   on J205's and J204's match lines and seeds files; it gives J205's v6Margin (must be 40: its deciding arm is
//   search-v2-rrandom4-lcb-m40, 98eea870967e), its SIGNAL, its successive count, whether its iteration lost badly (both
//   arms) and whether it iterated (v7 = this arm).
// COMPLETE, the TABLE, SIGNAL, SAME DEALS: J205's, below; the arm's SHOWN reads "Forge's opponent model leaves the
//   rollout loop for this arm, after a 4,800-game confirmation holds it" (D530 point 7, restated in D531 point 5).
// THE COUNT (SUCCESSIVE): J205's count as J205's verdict computes it (J204's re-read count plus 1 on its SIGNAL
//   INCONCLUSIVE, 0 on any other reading, J204's when unread); this night's is that + 1 on SIGNAL INCONCLUSIVE, 0 on
//   any other SIGNAL reading, J205's unchanged when SIGNAL is unread; 2 closes the track. Unread when J204's two lines
//   or J205 (a)'s line are not complete (J205's count null, or J205 (a) not complete at 98eea870967e).
// THE LOOP (D531 point 5): this iteration loses badly when the arm is complete and loses badly (one arm); loopStops = it
//   does and J205's iteration lost badly (both J205 arms complete, both eloHi < -15).
// THE NIGHT: closes = NO SIGNAL or AGAINST or the count at 2 or loopStops; trackCloses = closes and the arm no
//   candidate (a closing decision owed); closingWaits = closes and a candidate (its 4,800-game confirmation first);
//   keepsOpen = SIGNAL read and nothing closes; confirm = the arm is a candidate (its own 4,800-game job); newDecision
//   (= iterate) = the arm complete and to diagnose, SIGNAL read and nothing closes: the next step is decided from
//   random-v7's counters and worst-lost games in a new decision (D530 point 7, D531 point 6); no random-v8 is named
//   (v8 is always null). repost = the arm not complete. SIGNAL unread on other deals (replayBaseline): the next job
//   replays what puts the arm and the baseline on the same blocks, nothing else follows.
// ---------------------------------------------------------------- J205 (D530), kept verbatim: J206 re-reads J205 by it
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const OPP = ['search-v1-anytime', 'cdd55e02a89c'];
export const ARMS = { 60: ['search-v2-rrandom4-lcb-m60', 'd6d75fdefd25'], 40: ['search-v2-rrandom4-lcb-m40', '98eea870967e'] };
export const J204 = { a: ['search-v2-rrandom4-m60', '216e66d89fe3'], b: ['policy-outlet', 'e350d94649a4'] };
export const J202B = ['search-v2-rrandom4-m40', '968c9003c616'];
export const BLOCK_LO = 114900000, BLOCK_HI = 114900149, BLOCKS = 150;
const READINGS = ['shown', 'inconclusive', 'indistinguishable', 'noWeaker', 'worseNotBadly', 'losesBadly'];
const SIGNALS = ['signalShown', 'signalAgainst', 'noSignal', 'signalInconclusive'];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const T = (x) => Math.round(x * 10);      // Elo in integer tenths
const L4 = (x) => Math.round(x * 10000);  // a score in integer ten-thousandths

function line(m, [A, hA]) {
  const names = m !== null && m.a === A && m.b === OPP[0] && m.ah === hA && m.bh === OPP[1] ? 1 : 0;
  const complete = names && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR
    && num(m.lo) !== null && num(m.elo) !== null && num(m.eloLo) !== null && num(m.eloHi) !== null ? 1 : 0;
  return { match: m === null ? 0 : 1, names, complete, a: A, ah: hA, id: m?.id ?? null, played: m?.played ?? 0,
    errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi),
    elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi), aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision) };
}
const missing = (s, which) => (s.match === 0 ? `NO MATCH (${which}): no reading` : s.names === 0 ? `NOT THIS MATCH (${which}): no reading (want ${s.a} at ${s.ah} against ${OPP[0]})` : `INCOMPLETE (${which}): no reading`);

export function table(s) {
  const r = Object.fromEntries(READINGS.map((k) => [k, 0]));
  let tooWide = 0, upperAtZero = 0, inconclusiveAbove = 0;
  if (s.complete) {
    const lo = L4(s.lo), e = T(s.elo), eL = T(s.eloLo), eH = T(s.eloHi);
    const containsZero = eL < 0 && eH > 0;
    if (lo > 5000 && e >= 150) r.shown = 1;
    else if (eH >= 150) { r.inconclusive = 1; inconclusiveAbove = lo > 5000 ? 1 : 0; }
    else if (containsZero && eL > -150) r.indistinguishable = 1;
    else if (eL >= 0) r.noWeaker = 1;
    else if (eH < -150) r.losesBadly = 1;
    else { r.worseNotBadly = 1; tooWide = containsZero ? 1 : 0; upperAtZero = eH === 0 ? 1 : 0; }
  }
  const candidate = r.shown + r.inconclusive + r.indistinguishable + r.noWeaker;
  const diagnose = r.worseNotBadly + r.losesBadly;
  const reading = r.shown ? 'SHOWN' : r.inconclusive ? 'INCONCLUSIVE' : r.indistinguishable ? 'NOT SHOWN, indistinguishable'
    : r.noWeaker ? 'NOT SHOWN, no weaker' : r.losesBadly ? 'NOT SHOWN, loses badly' : r.worseNotBadly ? 'NOT SHOWN, worse, not badly' : null;
  return { ...r, reading, candidate, diagnose, notShown: r.indistinguishable + r.noWeaker + r.worseNotBadly + r.losesBadly, tooWide, upperAtZero, inconclusiveAbove };
}

export function signal(a, b, margin) {
  const z = Object.fromEntries(SIGNALS.map((k) => [k, 0]));
  if (!(a.complete && b.complete)) return { read: 0, ...z, diff: null, hw: null, lo: null, hi: null, share: null, reading: null };
  // in integer tenths: dT exact, hwT the root of exact half-tenths squared
  const dT = T(a.elo) - T(b.elo);
  const hwT = Math.sqrt(((T(a.eloHi) - T(a.eloLo)) / 2) ** 2 + ((T(b.eloHi) - T(b.eloLo)) / 2) ** 2);
  const loT = dT - hwT, hiT = dT + hwT;
  if (dT >= 150 && loT > 0) z.signalShown = 1;
  else if (dT <= -150 && hiT < 0) z.signalAgainst = 1;
  else if (loT <= 0 && hiT >= 0 && dT > -150 && dT < 150) z.noSignal = 1;
  else z.signalInconclusive = 1;
  const diff = dT / 10, hw = hwT / 10, lo = loT / 10, hi = hiT / 10;
  const reading = z.signalShown ? 'SIGNAL SHOWN' : z.signalAgainst ? 'SIGNAL AGAINST' : z.noSignal ? 'NO SIGNAL' : 'SIGNAL INCONCLUSIVE';
  const words = z.noSignal ? `no signal ${margin} at +-15 on the point (not a finding of equivalence)` : reading;
  return { read: 1, ...z, diff: r1(diff), hw: r1(hw), lo: r1(lo), hi: r1(hi), share: b.elo < 0 ? Math.round((diff / -b.elo) * 1000) / 1000 : null,
    reading, text: `${reading}: ${a.a} minus ${b.a} ${r1(diff)} Elo [${r1(lo)}, ${r1(hi)}] (+-${r1(hw)}); ${words}` };
}

const seedsOk = (s, played) => (s !== null && s.blocks === BLOCKS && s.min === BLOCK_LO && s.max === BLOCK_HI && s.games === played && played === GAMES ? 1 : 0);

// J204's lines, re-read: v6Margin, J204's own SIGNAL (the count), whether random-v5 lost badly, the baseline's blocks.
export function prior(ja, jb, pb, sb) {
  const a = line(ja, J204.a), b = line(jb, J204.b), p = line(pb, J202B);
  const v6Margin = a.complete && p.complete ? (T(a.elo) - T(p.elo) < 0 ? 40 : 60) : null;
  const ta = table(a);
  const sig = signal(a, b, 'at margin 60');
  return { read: a.complete && b.complete && p.complete ? 1 : 0, a, b, j202b: p, v6Margin, marginStep: a.complete && p.complete ? (T(a.elo) - T(p.elo)) / 10 : null, aCandidate: ta.candidate, aDiagnose: ta.diagnose, aReading: ta.reading,
    signal: sig, count: sig.read ? sig.signalInconclusive : null, losesBadly: a.complete ? (T(a.eloHi) < -150 ? 1 : 0) : null,
    baselineDeals: b.complete ? seedsOk(sb, b.played) : 0, baselineBlocks: sb };
}

export function nightJ205(ma, mb, roa, ja, jb, pb, sb204, sa, sb) {
  const pr = prior(ja, jb, pb, sb204);
  const dm = pr.v6Margin, om = dm === 60 ? 40 : dm === 40 ? 60 : null;
  const sa0 = dm === null ? { ...line(null, ['(v6Margin unread)', '-']), match: ma === null ? 0 : 1 } : line(ma, ARMS[dm]);
  const sb0 = om === null ? { ...line(null, ['(v6Margin unread)', '-']), match: mb === null ? 0 : 1 } : line(mb, ARMS[om]);
  const a = { ...sa0, ...table(sa0) }, b = { ...sb0, ...table(sb0) };
  const run = typeof ma?.id === 'string' ? ma.id.slice(ma.id.lastIndexOf(':') + 1) : null;
  const sameRun = roa !== null && run !== null && roa.run === run ? 1 : 0;
  a.cost = { read: sameRun, ratio: sameRun ? num(roa.ratio) : null, aRolloutsPerDecision: sameRun ? num(roa.aRolloutsPerDecision) : null,
    bRolloutsPerDecision: sameRun ? num(roa.bRolloutsPerDecision) : null, aLcb: sameRun ? roa.aLcb ?? null : null, aPerRollout: sameRun ? roa.aPerRollout ?? null : null };
  a.sameDeals = a.complete && pr.baselineDeals && seedsOk(sa, a.played) ? 1 : 0;
  b.sameDeals = b.complete && pr.baselineDeals && seedsOk(sb, b.played) ? 1 : 0;
  const words = dm === null ? '' : `under override=lcb at margin ${dm}`;
  const sig = a.sameDeals ? signal(a, pr.b, words) : { ...signal({ complete: 0 }, pr.b, words), read: 0 };
  const sigB = b.sameDeals ? signal(b, pr.b, `under override=lcb at margin ${om}`) : { ...signal({ complete: 0 }, pr.b, ''), read: 0 };
  const why = sig.read ? null : !a.complete ? 'the deciding arm is not complete' : !pr.b.complete ? "J204 (b)'s line is not complete" : 'not provably on the same deals (a seeds file shows other blocks, misses games or is missing)';
  if (!sig.read) sig.text = `SIGNAL: no reading (${why})`;
  // the count is of SUCCESSIVE SIGNAL INCONCLUSIVE readings (D528 point 6): any other reading resets it
  const count = pr.count === null ? null : sig.read ? (sig.signalInconclusive ? pr.count + 1 : 0) : pr.count;
  const countCloses = count !== null && count >= 2 ? 1 : 0;
  // an iteration loses badly only when every arm it registered does (D527 point 7): both arms, both complete
  const iterationLosesBadly = a.complete && b.complete && a.losesBadly && b.losesBadly ? 1 : 0;
  const loopStops = iterationLosesBadly && pr.losesBadly === 1 ? 1 : 0;
  const closes = sig.noSignal || sig.signalAgainst || countCloses || loopStops ? 1 : 0;
  const candidate = a.candidate || b.candidate ? 1 : 0;
  const trackCloses = closes && !candidate ? 1 : 0;
  const closingWaits = closes && candidate ? 1 : 0;
  const keepsOpen = sig.read && !closes ? 1 : 0;
  const confirmA = a.candidate ? 1 : 0, confirmB = b.candidate ? 1 : 0;
  const iterate = a.complete && b.complete && a.diagnose && b.diagnose && sig.read && !closes ? 1 : 0;
  const v7 = iterate ? `search-v2-rrandom4them-lcb-m${dm}` : null;
  const replayBaseline = a.complete && pr.b.complete && !a.sameDeals ? 1 : 0;
  const ref = dm === 60 ? pr.a : dm === 40 ? pr.j202b : null;
  const ruleEffect = a.complete && ref && ref.complete ? (T(a.elo) - T(ref.elo)) / 10 : null;
  const bMinusA = a.complete && b.complete ? (T(b.elo) - T(a.elo)) / 10 : null;
  const repostWhich = dm === null ? null : !a.complete && !b.complete ? 'a and b' : !a.complete ? 'a' : !b.complete ? 'b' : null;
  const reading = [
    dm === null ? "NO DECIDING ARM: J204 (a)'s or J202 (b)'s line is not complete on this host, so v6Margin is unread; nothing is read" : `v6Margin ${dm} (J204 (a) minus J202 (b) ${pr.marginStep}): the deciding arm is ${ARMS[dm][0]}, the other margin ${ARMS[om][0]}`,
    a.complete ? `(a) ${a.reading}: ${a.a} ${a.elo} Elo [${a.eloLo}, ${a.eloHi}], score ${a.score}, lower end ${a.lo}` : missing(a, 'a'),
    sig.text,
    b.complete ? `(b) ${b.reading}: ${b.a} ${b.elo} Elo [${b.eloLo}, ${b.eloHi}], score ${b.score}, lower end ${b.lo}; against the baseline ${sigB.read ? `${sigB.diff} [${sigB.lo}, ${sigB.hi}] (${sigB.reading}, reported, deciding nothing)` : 'unread'}; minus (a) ${bMinusA}` : missing(b, 'b'),
    count === null ? "the SIGNAL INCONCLUSIVE count is unread (J204's two lines are not both complete)" : `successive SIGNAL INCONCLUSIVE count ${count} (J204 ${pr.count}, this night ${sig.read ? (sig.signalInconclusive ? '+1' : 'reset') : 'unread'})${countCloses ? ': two in a row, the track closes as on NO SIGNAL' : ''}`,
    pr.losesBadly === null ? "random-v5's loop count unread" : loopStops ? 'both arms lose badly after random-v5 lost badly: the loop stops (two successive iterations)' : `the two-losing count does not stop the loop (random-v5 lost badly ${pr.losesBadly}, this iteration loses badly ${iterationLosesBadly}: both arms ${a.losesBadly}/${b.losesBadly})`,
    candidate ? `a 4,800-game confirmation follows, each its own job, for ${[confirmA ? a.a : null, confirmB ? b.a : null].filter(Boolean).join(' and ')}${closingWaits ? ' (the closing waits on it: holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL)' : ''}` : 'neither arm is a candidate',
    trackCloses ? "the random-rollout track closes (D523 point 10's stop); the owner is told, with the counters, which way it went; a closing decision writes it from the track's closing draft"
      : keepsOpen ? 'the track stays open' : closingWaits ? 'the track closes unless a confirmation holds' : 'no SIGNAL reading: the track neither closes nor is kept open on this night',
    iterate ? `the agent iterates as random-v7 without asking the owner: ${v7}, rollout=random4-them (the opponent random-v4, the searching seat's own continuation Forge's) at the deciding arm's rule, override=lcb, z 1, margin ${dm} (D530 point 7)` : 'no iteration from this night',
    replayBaseline ? 'SIGNAL unread on other deals: the next job replays what puts the arm and the baseline on the same blocks (D530 point 5); nothing else follows from this night' : 'no replay owed',
    repostWhich ? `reposted: ${repostWhich === 'a and b' ? '(a) and (b)' : `(${repostWhich})`}` : 'no repost',
    'the self-play-from-random path does not open on this night', 'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, v6Margin: dm, marginStep: pr.marginStep, deciding: dm === null ? null : ARMS[dm][0], other: om === null ? null : ARMS[om][0],
    a, b, signal: sig, signalB: sigB, j204: { read: pr.read, a: pr.a, b: pr.b, j202b: pr.j202b, signal: pr.signal, count: pr.count, losesBadly: pr.losesBadly, baselineDeals: pr.baselineDeals, aDiagnose: pr.aDiagnose },
    signalInconclusiveCount: count, countCloses, loopStops, closes, candidate, trackCloses, closingWaits, keepsOpen, confirmA, confirmB, confirm: candidate, iterate, v7, replayBaseline,
    closing: trackCloses, principleInDoubt: iterationLosesBadly, iterationLosesBadly, ruleEffect, bMinusA,
    repost: repostWhich ? 1 : 0, repostWhich, selfPlayOpens: 0, liveSeatChanged: 0, reading };
}


// ---------------------------------------------------------------- J206 (D531): random-v7, one arm
export const ARM7 = ['search-v2-rrandom4them-lcb-m40', '01e2aba2d33e'];
export const J205 = { a: ARMS[40], b: ARMS[60] };
const SHOWN7 = "Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it";

// J205's reading, re-read from its match lines and seeds files by J205's own verdict (nightJ205), for the count and the loop
export function priorJ206(m5a, m5b, ja, jb, pb, sb204, s5a, s5b) {
  const r = nightJ205(m5a, m5b, null, ja, jb, pb, sb204, s5a, s5b);
  // the count is read only when J205's deciding arm is this lane's predecessor, lcb-m40, and complete
  const aRead = r.v6Margin === 40 && r.a.complete === 1 ? 1 : 0;
  const count = aRead && r.signalInconclusiveCount !== null ? r.signalInconclusiveCount : null;
  return { read: aRead && r.b.complete && r.j204.read ? 1 : 0, r, v6Margin: r.v6Margin, aRead, count,
    loopRead: r.a.complete && r.b.complete ? 1 : 0, iterationLosesBadly: r.iterationLosesBadly, iterate: r.iterate, v7: r.v7,
    signal: r.signal, aReading: r.a.reading, bReading: r.b.reading, a: r.a, b: r.b, j204: r.j204, baselineDeals: r.j204.baselineDeals, j204b: r.j204.b };
}

export function nightJ206(ma, roa, m5a, m5b, ja, jb, pb, sb204, s5a, s5b, sa) {
  const p = priorJ206(m5a, m5b, ja, jb, pb, sb204, s5a, s5b);
  const s0 = line(ma, ARM7);
  const a = { ...s0, ...table(s0) };
  if (a.shown) a.readingMeans = SHOWN7;
  const run = typeof ma?.id === 'string' ? ma.id.slice(ma.id.lastIndexOf(':') + 1) : null;
  const sameRun = roa !== null && run !== null && roa.run === run ? 1 : 0;
  a.cost = { read: sameRun, ratio: sameRun ? num(roa.ratio) : null, aRolloutsPerDecision: sameRun ? num(roa.aRolloutsPerDecision) : null,
    bRolloutsPerDecision: sameRun ? num(roa.bRolloutsPerDecision) : null, aLcb: sameRun ? roa.aLcb ?? null : null, aPerRollout: sameRun ? roa.aPerRollout ?? null : null,
    aPriorityShare: sameRun ? roa.aPriorityShare ?? null : null };
  const base = p.j204b;
  a.sameDeals = a.complete && p.baselineDeals && seedsOk(sa, a.played) ? 1 : 0;
  const words = 'under override=lcb at margin 40 with the opponent alone random';
  const sig = a.sameDeals ? signal(a, base, words) : { ...signal({ complete: 0 }, base, words), read: 0 };
  const why = sig.read ? null : !a.complete ? 'the arm is not complete' : !base.complete ? "J204 (b)'s line is not complete" : 'not provably on the same deals (a seeds file shows other blocks, misses games or is missing)';
  if (!sig.read) sig.text = `SIGNAL: no reading (${why})`;
  const count = p.count === null ? null : sig.read ? (sig.signalInconclusive ? p.count + 1 : 0) : p.count;
  const countCloses = count !== null && count >= 2 ? 1 : 0;
  // random-v7 registers one arm: the iteration loses badly exactly when it does (D527 point 7)
  const iterationLosesBadly = a.complete && a.losesBadly ? 1 : 0;
  const loopStops = iterationLosesBadly && p.loopRead && p.iterationLosesBadly === 1 ? 1 : 0;
  const closes = sig.noSignal || sig.signalAgainst || countCloses || loopStops ? 1 : 0;
  const candidate = a.candidate ? 1 : 0;
  const trackCloses = closes && !candidate ? 1 : 0;
  const closingWaits = closes && candidate ? 1 : 0;
  const keepsOpen = sig.read && !closes ? 1 : 0;
  const newDecision = a.complete && a.diagnose && sig.read && !closes ? 1 : 0;
  const replayBaseline = a.complete && base.complete && !a.sameDeals ? 1 : 0;
  const d = (x) => (a.complete && x && x.complete ? (T(a.elo) - T(x.elo)) / 10 : null);
  const aMinusJ205a = d(p.a), aMinusJ205b = d(p.b), aMinusJ202b = d(p.j204.j202b);
  const reading = [
    p.aRead ? `J205 re-read: v6Margin ${p.v6Margin}, (a) ${p.a.a} ${p.aReading}, SIGNAL ${p.signal.read ? p.signal.reading : 'unread'}, count ${p.count ?? 'unread'}; (b) ${p.b.complete ? p.bReading : 'not complete'}; its iteration lost badly ${p.loopRead ? p.iterationLosesBadly : 'unread'}; it iterated ${p.iterate} (${p.v7 ?? 'no v7'})`
      : `J205 not re-read: ${p.v6Margin === null ? "v6Margin unread (J204 (a)'s or J202 (b)'s line)" : p.v6Margin !== 40 ? `v6Margin ${p.v6Margin}, not 40` : "J205 (a)'s line is not search-v2-rrandom4-lcb-m40 complete"}`,
    a.complete ? `(a) ${a.reading}: ${a.a} ${a.elo} Elo [${a.eloLo}, ${a.eloHi}], score ${a.score}, lower end ${a.lo}${a.shown ? ` (${SHOWN7})` : ''}` : missing(a, 'a'),
    sig.text,
    count === null ? "the SIGNAL INCONCLUSIVE count is unread (J204's two lines or J205 (a)'s are not complete)" : `successive SIGNAL INCONCLUSIVE count ${count} (J205 ${p.count}, this night ${sig.read ? (sig.signalInconclusive ? '+1' : 'reset') : 'unread'})${countCloses ? ': two in a row, the track closes as on NO SIGNAL' : ''}`,
    !p.loopRead ? "J205's loop count unread (its two lines are not both complete): the loop does not stop on it" : loopStops ? 'the arm loses badly after random-v6 lost badly (both J205 arms): the loop stops (two successive iterations)' : `the two-losing count does not stop the loop (random-v6 lost badly ${p.iterationLosesBadly}, this iteration loses badly ${iterationLosesBadly})`,
    candidate ? `a 4,800-game confirmation follows, its own job, for ${a.a}${closingWaits ? ' (the closing waits on it: holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL)' : ''}` : 'the arm is not a candidate',
    trackCloses ? "the random-rollout track closes (D523 point 10's stop); the owner is told, with the counters, which way it went; a closing decision writes it from the track's closing draft"
      : keepsOpen ? 'the track stays open' : closingWaits ? 'the track closes unless the confirmation holds' : 'no SIGNAL reading: the track neither closes nor is kept open on this night',
    newDecision ? "the arm to diagnose with the track open: the next step is decided from random-v7's counters and worst-lost games in a new decision (D530 point 7, D531 point 6); no random-v8 is pre-registered" : 'no new iteration decision from this night',
    replayBaseline ? 'SIGNAL unread on other deals: the next job replays what puts the arm and the baseline on the same blocks (D531 point 5); nothing else follows from this night' : 'no replay owed',
    a.complete ? 'no repost' : 'reposted: (a)',
    'the self-play-from-random path does not open on this night', 'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, arm: ARM7[0], a, signal: sig,
    j205: { read: p.read, aRead: p.aRead, v6Margin: p.v6Margin, count: p.count, loopRead: p.loopRead, iterationLosesBadly: p.iterationLosesBadly, iterate: p.iterate, v7: p.v7,
      signal: p.signal, a: { complete: p.a.complete, reading: p.a.reading, elo: p.a.elo, eloLo: p.a.eloLo, eloHi: p.a.eloHi, losesBadly: p.a.losesBadly, sameDeals: p.a.sameDeals },
      b: { complete: p.b.complete, reading: p.b.reading, elo: p.b.elo, eloLo: p.b.eloLo, eloHi: p.b.eloHi, losesBadly: p.b.losesBadly } },
    j204: { read: p.j204.read, count: p.j204.count, baselineDeals: p.baselineDeals, b: p.j204b },
    signalInconclusiveCount: count, countCloses, loopStops, closes, candidate, trackCloses, closingWaits, keepsOpen, confirm: candidate,
    newDecision, iterate: newDecision, v8: null, replayBaseline, closing: trackCloses, principleInDoubt: iterationLosesBadly, iterationLosesBadly,
    aMinusJ205a, aMinusJ205b, aMinusJ202b, repost: a.complete ? 0 : 1, selfPlayOpens: 0, liveSeatChanged: 0, reading };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (who, hash, elo, half = 13.5, o = {}) => ({ id: `host:run-${who}`, a: who, b: OPP[0], ah: hash, bh: OPP[1], complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.5 + elo / 700, lo: 0.5 + (elo - half) / 700, hi: 0.5 + (elo + half) / 700, elo, eloLo: elo - half, eloHi: elo + half, aSearch: { msPerDecision: 900 }, bSearch: { msPerDecision: 890 }, ...o });
  const A = (m, elo, o = {}) => mk(ARMS[m][0], ARMS[m][1], elo, o.half ?? 13.5, { id: 'host:run-a', ...o });
  const B = (m, elo, o = {}) => mk(ARMS[m][0], ARMS[m][1], elo, o.half ?? 13.5, { id: 'host:run-b', ...o });
  const J4A = (elo, o = {}) => mk(J204.a[0], J204.a[1], elo, o.half ?? 13.5, o);
  const J4B = (elo, o = {}) => mk(J204.b[0], J204.b[1], elo, o.half ?? 13.5, o);
  const J2B = mk(J202B[0], J202B[1], -20.9, 13.2, { eloLo: -34.1, eloHi: -7.7 });
  const S = (o = {}) => ({ purpose: 'match:x', games: GAMES, blocks: BLOCKS, min: BLOCK_LO, max: BLOCK_HI, ...o });
  const RO = { run: 'run-a', ratio: 1.13, aRolloutsPerDecision: 18, bRolloutsPerDecision: 15.9, aLcb: { overrode: 10, held: 5, none: 85 }, aPerRollout: { v2_ownStack: 2.45 } };
  // J204 as expected: (a) -15 (above J202 (b): v6Margin 60), (b) -87.5: SIGNAL SHOWN, count 0, (a) not losing badly
  const all = (ma, mb, o = {}) => [ma, mb, o.ro === undefined ? RO : o.ro, o.ja === undefined ? J4A(-15) : o.ja, o.jb === undefined ? J4B(-87.5) : o.jb,
    o.pb === undefined ? J2B : o.pb, o.sb204 === undefined ? S() : o.sb204, o.sa === undefined ? S() : o.sa, o.sbb === undefined ? S() : o.sbb];
  const oneArm = (x) => (x.complete === 0 ? READINGS.every((k) => x[k] === 0) && x.candidate + x.diagnose === 0 : READINGS.reduce((y, k) => y + x[k], 0) === 1 && x.candidate + x.diagnose === 1);
  const oneSig = (s) => (s.read === 0 ? SIGNALS.every((k) => s[k] === 0) : SIGNALS.reduce((y, k) => y + s[k], 0) === 1);
  const sane = (r) => r.liveSeatChanged === 0 && r.selfPlayOpens === 0 && oneArm(r.a) && oneArm(r.b) && oneSig(r.signal)
    && r.trackCloses + r.closingWaits + r.keepsOpen <= 1 && !(r.trackCloses && (r.iterate || r.confirm)) && !(r.iterate && r.confirm)
    && r.closing === r.trackCloses && r.confirmA === r.a.candidate && r.confirmB === r.b.candidate && r.confirm === (r.a.candidate || r.b.candidate ? 1 : 0)
    && r.iterationLosesBadly === (r.a.complete && r.b.complete && r.a.losesBadly && r.b.losesBadly ? 1 : 0) && r.loopStops <= r.iterationLosesBadly
    && (r.signalInconclusiveCount === null || r.signal.read === 0 || r.signalInconclusiveCount === (r.signal.signalInconclusive ? r.j204.count + 1 : 0))
    && (r.iterate === 0) === (r.v7 === null) && (r.v7 === null || r.v7 === `search-v2-rrandom4them-lcb-m${r.v6Margin}`)
    && (r.v6Margin === null || r.deciding === ARMS[r.v6Margin][0]);
  const cases = [
    ['as expected: v6Margin 60, the deciding arm lcb-m60 -10 [-23.5, +3.5] too wide, SIGNAL SHOWN +77.5, iterate as random-v7 at 60', all(A(60, -10), B(40, -12)),
      (r) => r.v6Margin === 60 && r.deciding === ARMS[60][0] && r.a.worseNotBadly === 1 && r.a.tooWide === 1 && r.signal.signalShown === 1 && r.signal.diff === 77.5 && r.iterate === 1 && r.v7 === 'search-v2-rrandom4them-lcb-m60' && r.keepsOpen === 1 && r.signalInconclusiveCount === 0 && r.ruleEffect === 5 && r.bMinusA === -2],
    ['J204 (a) -21, 0.1 under J202 (b): v6Margin 40, the deciding arm lcb-m40 (match a), the rule effect against J202 (b)', all(A(40, -12), B(60, -15), { ja: J4A(-21) }),
      (r) => r.v6Margin === 40 && r.deciding === ARMS[40][0] && r.other === ARMS[60][0] && r.a.complete === 1 && r.b.complete === 1 && r.ruleEffect === 8.9 && r.v7 === 'search-v2-rrandom4them-lcb-m40'],
    ['J204 (a) exactly at J202 (b) (-20.9): not below 0, v6Margin 60', all(A(60, -12), B(40, -15), { ja: J4A(-20.9) }), (r) => r.v6Margin === 60 && r.marginStep === 0],
    ["v6Margin 40 but lcb-m60 in (a)'s file: not this match, no reading, reposted; the other margin's file is then not it either", all(A(60, -12), B(40, -15), { ja: J4A(-21) }),
      (r) => r.a.names === 0 && r.a.complete === 0 && r.signal.read === 0 && r.repost === 1 && r.repostWhich === 'a and b' && r.iterate === 0 && r.trackCloses === 0 && r.b.names === 0],
    ['J204 (a) missing: no v6Margin, no deciding arm, nothing read', all(A(60, -10), B(40, -12), { ja: null }),
      (r) => r.v6Margin === null && r.deciding === null && r.a.complete === 0 && r.signal.read === 0 && r.repost === 0 && r.signalInconclusiveCount === null && r.reading[0].startsWith('NO DECIDING ARM')],
    ['J202 (b) at another hash: no v6Margin', all(A(60, -10), B(40, -12), { pb: { ...J2B, ah: '646d59a008f6' } }), (r) => r.v6Margin === null],
    ['J204 (a) at the margin-40 hash is not J204 (a): no v6Margin', all(A(60, -10), B(40, -12), { ja: J4A(-15, { ah: '968c9003c616' }) }), (r) => r.v6Margin === null && r.j204.read === 0],
    ['the arm at the baseline (-80 against -87.5): NO SIGNAL, worded with lcb and the margin, loses badly, the track closes', all(A(60, -80), B(40, -70)),
      (r) => r.signal.noSignal === 1 && r.signal.text.includes('no signal under override=lcb at margin 60 at +-15 on the point') && r.a.losesBadly === 1 && r.trackCloses === 1 && r.closing === 1 && r.iterate === 0 && r.loopStops === 0],
    ['diff +15 exactly against the baseline, interval reaching 0: INCONCLUSIVE, count 1 after J204 SHOWN: open, iterate', all(A(60, -72.5), B(40, -70)),
      (r) => r.signal.signalInconclusive === 1 && r.signalInconclusiveCount === 1 && r.countCloses === 0 && r.keepsOpen === 1 && r.iterate === 1],
    ["J204 INCONCLUSIVE (a -45, b -60: diff 15) and J205 INCONCLUSIVE: count 2, the track closes as on NO SIGNAL", all(A(40, -42, { eloLo: -56, eloHi: -14 }), B(60, -50), { ja: J4A(-45), jb: J4B(-60) }),
      (r) => r.v6Margin === 40 && r.j204.signal.signalInconclusive === 1 && r.j204.count === 1 && r.signal.signalInconclusive === 1 && r.signalInconclusiveCount === 2 && r.countCloses === 1 && r.trackCloses === 1 && r.iterate === 0 && r.a.worseNotBadly === 1 && r.loopStops === 0],
    ['J204 INCONCLUSIVE and J205 SHOWN: the count is of successive readings, so it resets to 0; open, iterate', all(A(40, -20), B(60, -25), { ja: J4A(-45), jb: J4B(-60) }),
      (r) => r.signalInconclusiveCount === 0 && r.countCloses === 0 && r.signal.signalShown === 1 && r.keepsOpen === 1 && r.iterate === 1],
    ['J204 INCONCLUSIVE and J205 unread (the arm stopped): count 1, nothing closes, reposted', all({ ...A(40, -20), complete: false, played: 700 }, B(60, -25), { ja: J4A(-45), jb: J4B(-60) }),
      (r) => r.signalInconclusiveCount === 1 && r.trackCloses === 0 && r.repost === 1 && r.signal.read === 0],
    ['the loop: J204 (a) lost badly (-45 [-58.5, -31.5]) and both arms lose badly: the loop stops, the track closes', all(A(40, -40), B(60, -45), { ja: J4A(-45) }),
      (r) => r.j204.losesBadly === 1 && r.a.losesBadly === 1 && r.b.losesBadly === 1 && r.iterationLosesBadly === 1 && r.loopStops === 1 && r.trackCloses === 1 && r.signal.signalShown === 1 && r.iterate === 0],
    ['the loop: J204 (a) did not lose badly: both arms losing badly do not stop it, and iterate', all(A(60, -40), B(40, -45)),
      (r) => r.j204.losesBadly === 0 && r.a.losesBadly === 1 && r.iterationLosesBadly === 1 && r.loopStops === 0 && r.iterate === 1 && r.principleInDoubt === 1],
    ['the loop: J204 (a) lost badly and the deciding arm loses badly but the other margin does not: no stop (every arm must)', all(A(40, -40), B(60, -20), { ja: J4A(-45) }),
      (r) => r.j204.losesBadly === 1 && r.a.losesBadly === 1 && r.b.worseNotBadly === 1 && r.iterationLosesBadly === 0 && r.loopStops === 0 && r.iterate === 1 && r.principleInDoubt === 0],
    ['a candidate (indistinguishable) with NO SIGNAL against a baseline at -5: the closing waits on its confirmation', all(A(60, 0, { half: 9.5 }), B(40, -10), { jb: J4B(-5) }),
      (r) => r.a.indistinguishable === 1 && r.signal.noSignal === 1 && r.closingWaits === 1 && r.trackCloses === 0 && r.confirm === 1 && r.iterate === 0 && r.closing === 0],
    ['a SHOWN arm: confirm, no iteration, open', all(A(60, 20.9, { lo: 0.518, eloLo: 11.4, eloHi: 30.4 }), B(40, 0)),
      (r) => r.a.shown === 1 && r.confirm === 1 && r.iterate === 0 && r.keepsOpen === 1],
    ['a lower end above 0.5 with a point of +14.9: INCONCLUSIVE (case 1), a candidate', all(A(60, 14.9, { lo: 0.505, eloLo: 5.4, eloHi: 24.4 }), B(40, 0)), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 1 && r.confirm === 1],
    ['an upper end of exactly +15: INCONCLUSIVE', all(A(60, 5.5, { eloLo: -4, eloHi: 15 }), B(40, 0)), (r) => r.a.inconclusive === 1],
    ['a lower end of -14.9 containing 0: indistinguishable', all(A(60, -5, { eloLo: -14.9, eloHi: 4.9 }), B(40, 0)), (r) => r.a.indistinguishable === 1],
    ['a lower end of exactly -15: too wide, worse not badly', all(A(60, -5.1, { eloLo: -15, eloHi: 4.8 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1],
    ['an upper end of exactly -15: worse, not badly', all(A(60, -24.5, { eloLo: -34, eloHi: -15 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.losesBadly === 0],
    ['an upper end of -15.1: loses badly', all(A(60, -24.6, { eloLo: -34.1, eloHi: -15.1 }), B(40, 0)), (r) => r.a.losesBadly === 1],
    ['an upper end of exactly 0: worse, not badly (case 3)', all(A(60, -9.5, { eloLo: -19, eloHi: 0 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.upperAtZero === 1],
    ['an interval wholly at or above 0 under +15: no weaker (case 2)', all(A(60, 4.5, { lo: 0.5, eloLo: 0, eloHi: 9 }), B(40, 0)), (r) => r.a.noWeaker === 1 && r.confirm === 1],
    ["the arm's blocks moved (a memory retry, from 114,900,150): read under the table, SIGNAL unread, a replay owed, nothing closes", all(A(60, -10), B(40, -12), { sa: S({ min: 114900150, max: 114900299 }) }),
      (r) => r.a.complete === 1 && r.a.sameDeals === 0 && r.signal.read === 0 && r.replayBaseline === 1 && r.trackCloses === 0 && r.iterate === 0 && r.keepsOpen === 0 && r.signal.text.includes('not provably on the same deals')],
    ["J204 (b)'s blocks moved: SIGNAL unread, a replay owed", all(A(60, -10), B(40, -12), { sb204: S({ min: 114900150, max: 114900299 }) }), (r) => r.signal.read === 0 && r.replayBaseline === 1 && r.j204.baselineDeals === 0],
    ["J204 (b)'s seeds file missing: not provably the same deals", all(A(60, -10), B(40, -12), { sb204: null }), (r) => r.signal.read === 0 && r.replayBaseline === 1],
    ['the block reader missed a game of the arm: not the same deals', all(A(60, -10), B(40, -12), { sa: S({ games: 1199 }) }), (r) => r.signal.read === 0],
    ['149 blocks: not the same deals', all(A(60, -10), B(40, -12), { sa: S({ blocks: 149 }) }), (r) => r.signal.read === 0],
    ["J204 (b) missing: SIGNAL unread, no count, nothing closes, not a replay (its line is not here)", all(A(60, -10), B(40, -12), { jb: null }),
      (r) => r.signal.read === 0 && r.signalInconclusiveCount === null && r.trackCloses === 0 && r.replayBaseline === 0 && r.iterate === 0],
    ["forge-default in J204 (b)'s file is not the baseline", all(A(60, -10), B(40, -12), { jb: { ...J4B(-87.5), a: 'forge-default', ah: '3ed453ffef1c' } }), (r) => r.j204.b.names === 0 && r.signal.read === 0],
    ['the other margin a candidate while the deciding arm is to diagnose: its own 4,800-game confirmation, no iteration', all(A(60, -20), B(40, 0, { half: 9.5 })),
      (r) => r.b.indistinguishable === 1 && r.confirmB === 1 && r.confirmA === 0 && r.confirm === 1 && r.iterate === 0 && r.keepsOpen === 1],
    ['the other margin a candidate with NO SIGNAL on the deciding arm: the closing waits on the confirmation', all(A(60, -80), B(40, 0, { half: 9.5 })),
      (r) => r.signal.noSignal === 1 && r.confirmB === 1 && r.closingWaits === 1 && r.trackCloses === 0 && r.closing === 0],
    ['the other margin losing badly with NO SIGNAL of its own: SIGNAL is the deciding arm\'s, nothing closes', all(A(60, -20), B(40, -80)),
      (r) => r.b.losesBadly === 1 && r.signalB.noSignal === 1 && r.trackCloses === 0 && r.iterate === 1 && r.loopStops === 0],
    ['the other margin missing: the deciding arm read as always, (b) reposted, no iteration until it is read', all(A(60, -20), null), (r) => r.a.worseNotBadly === 1 && r.signal.read === 1 && r.repost === 1 && r.repostWhich === 'b' && r.iterate === 0 && r.keepsOpen === 1],
    ['the deciding arm 1,199 games: incomplete, reposted', all(A(60, -20, { played: 1199 }), B(40, -12)), (r) => r.a.complete === 0 && r.repost === 1 && r.signal.read === 0],
    ['61 errors and timeouts: incomplete', all(A(60, -20, { errors: 40, timeouts: 21 }), B(40, -12)), (r) => r.a.complete === 0],
    ['60 errors and timeouts: complete', all(A(60, -20, { errors: 40, timeouts: 20 }), B(40, -12)), (r) => r.a.complete === 1],
    ['the players swapped in (a): not this match', all({ ...A(60, 20), a: OPP[0], b: ARMS[60][0], ah: OPP[1], bh: ARMS[60][1] }, B(40, -12)), (r) => r.a.names === 0],
    ["J204 (a)'s margin arm in (a)'s file is not the lcb arm", all(mk(J204.a[0], J204.a[1], -15, 13.5, { id: 'host:run-a' }), B(40, -12)), (r) => r.a.names === 0 && r.a.complete === 0],
    ['diff -20 against the baseline with its upper end below 0: SIGNAL AGAINST, the track closes', all(A(60, -50, { half: 9 }), B(40, -12), { jb: J4B(-30, { half: 9 }) }),
      (r) => r.signal.signalAgainst === 1 && r.trackCloses === 1 && r.iterate === 0],
    ['a small signal whose interval is above 0 (diff +10, hw 7.1): INCONCLUSIVE', all(A(60, -50, { half: 5 }), B(40, -12), { jb: J4B(-60, { half: 5 }) }), (r) => r.signal.signalInconclusive === 1 && r.signal.lo > 0],
    // NOT float-exact: -63.1 - (-78.1) = 14.999999999999993 in doubles; the rule reads the +15.0 the lines say
    ['a -63.1 against a baseline -78.1 (diff +15.0, float 14.999999999999993), hw 19.1: INCONCLUSIVE, not NO SIGNAL', all(A(60, -63.1), B(40, -12), { jb: J4B(-78.1) }),
      (r) => r.signal.diff === 15 && r.signal.signalInconclusive === 1 && r.signal.noSignal === 0 && r.trackCloses === 0],
    ['a -63.1 against a baseline -78.1 with hw 7.1 (half-widths 5): SIGNAL SHOWN, not INCONCLUSIVE', all(A(60, -63.1, { half: 5 }), B(40, -12), { jb: J4B(-78.1, { half: 5 }) }),
      (r) => r.signal.diff === 15 && r.signal.signalShown === 1],
    ['a -93.1 against a baseline -78.1 (diff -15.0), hw 7.1: SIGNAL AGAINST', all(A(60, -93.1, { half: 5 }), B(40, -12), { jb: J4B(-78.1, { half: 5 }) }),
      (r) => r.signal.diff === -15 && r.signal.signalAgainst === 1 && r.trackCloses === 1],
    ['a -93.1 against a baseline -78.1 (diff -15.0), hw 19.1: INCONCLUSIVE, not NO SIGNAL', all(A(60, -93.1), B(40, -12), { jb: J4B(-78.1) }),
      (r) => r.signal.diff === -15 && r.signal.signalInconclusive === 1 && r.signal.noSignal === 0],
    ['J204 itself at -63.1 against -78.1 (wide): J204 INCONCLUSIVE counts 1, and J205 INCONCLUSIVE makes 2', all(A(40, -60, { eloLo: -80, eloHi: -40 }), B(60, -20), { ja: J4A(-63.1), jb: J4B(-78.1) }),
      (r) => r.j204.signal.signalInconclusive === 1 && r.j204.count === 1 && r.signal.signalInconclusive === 1 && r.signalInconclusiveCount === 2 && r.countCloses === 1 && r.loopStops === 0 && r.trackCloses === 1],
    ['a point of 15.1 - 0.1 (14.999999999999998) with the lower end above 0.5 is SHOWN (+15.0)', all(A(60, 15.1 - 0.1, { lo: 0.505, eloLo: 5.5, eloHi: 24.5 }), B(40, 0)), (r) => r.a.shown === 1],
    ['an upper end of -15.1 + 0.1 (-14.999999999999998) is worse, not badly (-15.0)', all(A(60, -24.5, { eloLo: -34, eloHi: -15.1 + 0.1 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.losesBadly === 0],
    ['a lower end of -15.1 + 0.1 containing 0 is too wide (-15.0), not indistinguishable', all(A(60, -5.1, { eloLo: -15.1 + 0.1, eloHi: 4.8 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1],
    ['an upper end of 0.3 - 0.1 - 0.2 (about -2.8e-17) is exactly 0 (case 3), not below 0', all(A(60, -9.5, { eloLo: -19, eloHi: 0.3 - 0.1 - 0.2 }), B(40, 0)), (r) => r.a.worseNotBadly === 1 && r.a.upperAtZero === 1],
    ['J204 (a) at J202 (b) - 0.1 + 0.1 (float-near the tie): v6Margin 60, not 40', all(A(60, -12), B(40, -15), { ja: J4A(-20.9 - 0.1 + 0.1) }), (r) => r.v6Margin === 60 && r.marginStep === 0],
    ['the rollouts are read from the arm\'s run only', all(A(60, -10), B(40, -12)), (r) => r.a.cost.read === 1 && r.a.cost.aLcb.held === 5],
    ['a rollout file from another run is not read', all(A(60, -10), B(40, -12), { ro: { ...RO, run: 'run-x' } }), (r) => r.a.cost.read === 0 && r.a.cost.aLcb === null],
  ];
  // ---- J206 (D531): the one-arm shape. Fixtures: J204 as it read (a -24.4 [-38.4, -10.4], b -84.4 [-99.9, -69.3]),
  // J202 (b) -20.9, so v6Margin 40; J205 (a) lcb-m40 -15 [-28.5, -1.5] worse, not badly, SIGNAL SHOWN, count 0; J205 (b)
  // lcb-m60 -20 worse, not badly: J205 iterated, random-v7 = this arm.
  const R4A = J4A(-24.4, { eloLo: -38.4, eloHi: -10.4 }), R4B = J4B(-84.4, { eloLo: -99.9, eloHi: -69.3 });
  const A7 = (elo, o = {}) => mk(ARM7[0], ARM7[1], elo, o.half ?? 13.5, { id: 'host:run-a', ...o });
  const J5A = (elo, o = {}) => mk(J205.a[0], J205.a[1], elo, o.half ?? 13.5, { id: 'host:run-5a', ...o });
  const J5B = (elo, o = {}) => mk(J205.b[0], J205.b[1], elo, o.half ?? 13.5, { id: 'host:run-5b', ...o });
  const all6 = (ma, o = {}) => [ma, o.ro === undefined ? RO : o.ro, o.m5a === undefined ? J5A(-15) : o.m5a, o.m5b === undefined ? J5B(-20) : o.m5b,
    o.ja === undefined ? R4A : o.ja, o.jb === undefined ? R4B : o.jb, o.pb === undefined ? J2B : o.pb, o.sb204 === undefined ? S() : o.sb204,
    o.s5a === undefined ? S() : o.s5a, o.s5b === undefined ? S() : o.s5b, o.sa === undefined ? S() : o.sa];
  const sane6 = (r) => r.liveSeatChanged === 0 && r.selfPlayOpens === 0 && oneArm(r.a) && oneSig(r.signal) && r.v8 === null
    && r.trackCloses + r.closingWaits + r.keepsOpen <= 1 && !(r.trackCloses && (r.newDecision || r.confirm)) && !(r.newDecision && r.confirm)
    && r.closing === r.trackCloses && r.confirm === r.a.candidate && r.iterate === r.newDecision && r.repost === (r.a.complete ? 0 : 1)
    && r.iterationLosesBadly === (r.a.complete && r.a.losesBadly ? 1 : 0) && r.loopStops <= r.iterationLosesBadly
    && (r.signalInconclusiveCount === null || r.signal.read === 0 || r.signalInconclusiveCount === (r.signal.signalInconclusive ? r.j205.count + 1 : 0))
    && (r.signalInconclusiveCount === null || r.signal.read === 1 || r.signalInconclusiveCount === r.j205.count)
    && r.signal.read === r.a.sameDeals && r.replayBaseline === (r.a.complete && r.j204.b.complete && !r.a.sameDeals ? 1 : 0);
  const cases6 = [
    ['J206 as expected: J205 re-read (v6Margin 40, SHOWN, count 0, iterated to this arm); the arm -10 too wide, SIGNAL SHOWN +74.4, a new decision', all6(A7(-10)),
      (r) => r.j205.v6Margin === 40 && r.j205.aRead === 1 && r.j205.iterate === 1 && r.j205.v7 === ARM7[0] && r.j205.count === 0 && r.a.worseNotBadly === 1 && r.a.tooWide === 1
        && r.signal.signalShown === 1 && r.signal.diff === 74.4 && r.signalInconclusiveCount === 0 && r.keepsOpen === 1 && r.newDecision === 1 && r.iterate === 1 && r.aMinusJ205a === 5 && r.aMinusJ205b === 10 && r.aMinusJ202b === 10.9],
    ['J206: the arm indistinguishable (0 +-9.5): a candidate, its confirmation, no new decision, open', all6(A7(0, { half: 9.5 })),
      (r) => r.a.indistinguishable === 1 && r.confirm === 1 && r.newDecision === 0 && r.keepsOpen === 1 && r.trackCloses === 0],
    ["J206: a SHOWN arm reads D531's restated SHOWN (Forge's opponent model leaves the loop), after its confirmation", all6(A7(20.9, { lo: 0.518, eloLo: 11.4, eloHi: 30.4 })),
      (r) => r.a.shown === 1 && r.confirm === 1 && r.a.readingMeans.startsWith("Forge's opponent model") && r.reading[1].includes("Forge's opponent model leaves the rollout loop") && r.newDecision === 0],
    ['J206: the arm at the baseline (-80 against -84.4): NO SIGNAL worded with the seating, loses badly, J205 did not: the track closes, no loop stop', all6(A7(-80)),
      (r) => r.signal.noSignal === 1 && r.signal.text.includes('no signal under override=lcb at margin 40 with the opponent alone random at +-15 on the point') && r.a.losesBadly === 1
        && r.iterationLosesBadly === 1 && r.loopStops === 0 && r.trackCloses === 1 && r.closing === 1 && r.newDecision === 0],
    ['J206: diff -20 with its upper end below 0 against a baseline at -30: SIGNAL AGAINST, the track closes', all6(A7(-50, { half: 9 }), { jb: J4B(-30, { half: 9 }) }),
      (r) => r.signal.signalAgainst === 1 && r.trackCloses === 1 && r.newDecision === 0],
    ['J206: J205 INCONCLUSIVE (-69.4 against -84.4: diff 15.0, hw 20.4) and J206 INCONCLUSIVE (-69.4): count 2, the track closes as on NO SIGNAL', all6(A7(-69.4), { m5a: J5A(-69.4) }),
      (r) => r.j205.signal.signalInconclusive === 1 && r.j205.count === 1 && r.j205.iterate === 1 && r.signal.signalInconclusive === 1 && r.signalInconclusiveCount === 2 && r.countCloses === 1
        && r.trackCloses === 1 && r.newDecision === 0 && r.loopStops === 0],
    ['J206: J205 INCONCLUSIVE and J206 SHOWN: successive, so the count resets to 0; open, a new decision', all6(A7(-20), { m5a: J5A(-69.4) }),
      (r) => r.j205.count === 1 && r.signal.signalShown === 1 && r.signalInconclusiveCount === 0 && r.countCloses === 0 && r.keepsOpen === 1 && r.newDecision === 1],
    ['J206: J205 INCONCLUSIVE and the arm stopped (700 games): count 1 carried, nothing closes, reposted', all6({ ...A7(-20), complete: false, played: 700 }, { m5a: J5A(-69.4) }),
      (r) => r.a.complete === 0 && r.signal.read === 0 && r.signalInconclusiveCount === 1 && r.trackCloses === 0 && r.repost === 1 && r.newDecision === 0],
    ['J206: the loop: both J205 arms lost badly (-40, -45; J204 (a) did not, so J205 iterated) and the arm loses badly: the loop stops, the track closes', all6(A7(-40), { m5a: J5A(-40), m5b: J5B(-45) }),
      (r) => r.j205.iterationLosesBadly === 1 && r.j205.iterate === 1 && r.a.losesBadly === 1 && r.iterationLosesBadly === 1 && r.loopStops === 1 && r.trackCloses === 1 && r.signal.signalShown === 1 && r.newDecision === 0 && r.principleInDoubt === 1],
    ['J206: the loop: one J205 arm lost badly, the arm loses badly: no stop (J205 lost badly only if both did), a new decision', all6(A7(-40), { m5a: J5A(-40), m5b: J5B(-20) }),
      (r) => r.j205.iterationLosesBadly === 0 && r.a.losesBadly === 1 && r.loopStops === 0 && r.newDecision === 1],
    ['J206: the loop: both J205 arms lost badly, the arm worse, not badly: no stop', all6(A7(-20), { m5a: J5A(-40), m5b: J5B(-45) }),
      (r) => r.j205.iterationLosesBadly === 1 && r.a.worseNotBadly === 1 && r.loopStops === 0 && r.newDecision === 1],
    ["J206: J205 (b) missing: J205's loop count unread (no stop on it), the count still read from J205 (a)", all6(A7(-40), { m5a: J5A(-40), m5b: null }),
      (r) => r.j205.loopRead === 0 && r.loopStops === 0 && r.j205.aRead === 1 && r.signalInconclusiveCount === 0 && r.j205.iterate === 0 && r.newDecision === 1],
    ["J206: J205 (a) missing: the count unread (no closing on it); SIGNAL still read against J204 (b)", all6(A7(-10), { m5a: null }),
      (r) => r.j205.aRead === 0 && r.signalInconclusiveCount === null && r.countCloses === 0 && r.signal.read === 1 && r.reading[0].startsWith('J205 not re-read')],
    ["J206: lcb-m60 in J205 (a)'s file: not J205's deciding arm, the count unread", all6(A7(-10), { m5a: mk(J205.b[0], J205.b[1], -15, 13.5, { id: 'host:run-5a' }) }),
      (r) => r.j205.aRead === 0 && r.j205.a.complete === 0 && r.signalInconclusiveCount === null],
    ["J206: J204 (a) missing: J205's v6Margin unread, so J205 is not re-read and the count is unread", all6(A7(-10), { ja: null }),
      (r) => r.j205.v6Margin === null && r.j205.aRead === 0 && r.signalInconclusiveCount === null && r.signal.read === 1],
    ["J206: J204 (a) above J202 (b) (-15): J205's v6Margin would have been 60, so its (a) file is not its deciding arm; the count unread", all6(A7(-10), { ja: J4A(-15) }),
      (r) => r.j205.v6Margin === 60 && r.j205.aRead === 0 && r.signalInconclusiveCount === null],
    ["J206: the arm's blocks moved (a memory retry): read under the table, SIGNAL unread, a replay owed, nothing closes, the count J205's", all6(A7(-10), { sa: S({ min: 114900150, max: 114900299 }) }),
      (r) => r.a.complete === 1 && r.a.sameDeals === 0 && r.signal.read === 0 && r.replayBaseline === 1 && r.trackCloses === 0 && r.newDecision === 0 && r.keepsOpen === 0 && r.signalInconclusiveCount === 0 && r.signal.text.includes('not provably on the same deals')],
    ["J206: J204 (b)'s seeds file missing: SIGNAL unread, a replay owed", all6(A7(-10), { sb204: null }), (r) => r.signal.read === 0 && r.replayBaseline === 1],
    ['J206: the block reader missed a game of the arm: not the same deals', all6(A7(-10), { sa: S({ games: 1199 }) }), (r) => r.signal.read === 0 && r.replayBaseline === 1],
    ["J206: J204 (b) missing: SIGNAL unread, the count unread, nothing closes, not a replay", all6(A7(-10), { jb: null }),
      (r) => r.signal.read === 0 && r.signalInconclusiveCount === null && r.trackCloses === 0 && r.replayBaseline === 0 && r.newDecision === 0],
    ['J206: the arm 1,199 games: incomplete, reposted', all6(A7(-20, { played: 1199 })), (r) => r.a.complete === 0 && r.repost === 1 && r.signal.read === 0],
    ['J206: 61 errors and timeouts: incomplete', all6(A7(-20, { errors: 40, timeouts: 21 })), (r) => r.a.complete === 0],
    ['J206: 60 errors and timeouts: complete', all6(A7(-20, { errors: 40, timeouts: 20 })), (r) => r.a.complete === 1],
    ['J206: the players swapped: not this match', all6({ ...A7(20), a: OPP[0], b: ARM7[0], ah: OPP[1], bh: ARM7[1] }), (r) => r.a.names === 0 && r.repost === 1],
    ["J206: J205 (a)'s arm (rollout=random4) in the arm's file is not random-v7", all6(J5A(-15, { id: 'host:run-a' })), (r) => r.a.names === 0 && r.a.complete === 0],
    ['J206: -63.1 against a baseline -78.1 (diff +15.0, float 14.999999999999993), hw 19.1: INCONCLUSIVE, count 1', all6(A7(-63.1), { jb: J4B(-78.1) }),
      (r) => r.signal.diff === 15 && r.signal.signalInconclusive === 1 && r.signal.noSignal === 0 && r.signalInconclusiveCount === 1 && r.trackCloses === 0 && r.newDecision === 1],
    ['J206: an upper end of exactly -15: worse, not badly; -15.1: loses badly', all6(A7(-24.5, { eloLo: -34, eloHi: -15 })), (r) => r.a.worseNotBadly === 1 && r.iterationLosesBadly === 0],
    ['J206: an upper end of -15.1 loses badly', all6(A7(-24.6, { eloLo: -34.1, eloHi: -15.1 })), (r) => r.a.losesBadly === 1 && r.iterationLosesBadly === 1],
    ['J206: an interval wholly at or above 0 under +15: no weaker (case 2), a candidate', all6(A7(4.5, { lo: 0.5, eloLo: 0, eloHi: 9 })), (r) => r.a.noWeaker === 1 && r.confirm === 1],
    ['J206: a candidate with NO SIGNAL against a baseline at -5: the closing waits on its confirmation', all6(A7(0, { half: 9.5 }), { jb: J4B(-5) }),
      (r) => r.a.indistinguishable === 1 && r.signal.noSignal === 1 && r.closingWaits === 1 && r.trackCloses === 0 && r.closing === 0 && r.newDecision === 0],
    ["J206: J205 did not iterate (its (a) a candidate): re-read and reported (the pilot stops such a night), the arm read as always", all6(A7(-10), { m5a: J5A(0, { half: 9.5 }) }),
      (r) => r.j205.iterate === 0 && r.j205.v7 === null && r.a.complete === 1 && r.signal.read === 1],
    ['J206: the rollouts are read from the arm\'s run only', all6(A7(-10)), (r) => r.a.cost.read === 1 && r.a.cost.aLcb.held === 5],
    ['J206: a rollout file from another run is not read', all6(A7(-10), { ro: { ...RO, run: 'run-x' } }), (r) => r.a.cost.read === 0 && r.a.cost.aLcb === null],
  ];
  const run = (list, fn, label) => list.reduce((ok, [what, ms, pred], i) => {
    const files = ms.map((x, j) => {
      const f = path.join(scratch, `case-${label}-${i}-${j}.json`);
      if (x !== null) fs.writeFileSync(f, JSON.stringify(x));
      return f;
    });
    const r = fn(...files.map(read));
    const pass = pred(r) && (label === '205' ? sane(r) : sane6(r));
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading.slice(0, 3).join(' | ')}`);
    return ok + (pass ? 1 : 0);
  }, 0);
  const ok205 = run(cases, nightJ205, '205');
  const ok206 = run(cases6, nightJ206, '206');
  const n = cases.length + cases6.length;
  return { selftest: 1, cases: n, cases205: cases.length, cases206: cases6.length, passed: ok205 + ok206, passed206: ok206, ok: ok205 + ok206 === n ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv[0] === '--prior' && argv.length === 10) {
  const p = priorJ206(...argv.slice(1, 9).map(read));
  const r = { read: p.read, aRead: p.aRead, v6Margin: p.v6Margin, count: p.count, iterate: p.iterate, v7: p.v7, v7IsArm: p.v7 === ARM7[0] ? 1 : 0, loopRead: p.loopRead, iterationLosesBadly: p.iterationLosesBadly,
    signal: { read: p.signal.read, reading: p.signal.reading, signalShown: p.signal.signalShown, signalAgainst: p.signal.signalAgainst, noSignal: p.signal.noSignal, signalInconclusive: p.signal.signalInconclusive, diff: p.signal.diff, hw: p.signal.hw, lo: p.signal.lo, hi: p.signal.hi },
    aReading: p.aReading, bReading: p.bReading, aCandidate: p.a.candidate, bCandidate: p.b.candidate, aDiagnose: p.a.diagnose, bDiagnose: p.b.diagnose, trackCloses: p.r.trackCloses, closingWaits: p.r.closingWaits,
    baselineDeals: p.baselineDeals, aSameDeals: p.a.sameDeals, j204Count: p.j204.count,
    a: { complete: p.a.complete, elo: p.a.elo, eloLo: p.a.eloLo, eloHi: p.a.eloHi }, b: { complete: p.b.complete, elo: p.b.elo, eloLo: p.b.eloLo, eloHi: p.b.eloHi },
    j204b: { complete: p.j204b.complete, elo: p.j204b.elo, eloLo: p.j204b.eloLo, eloHi: p.j204b.eloHi } };
  fs.mkdirSync(path.dirname(argv[9]), { recursive: true });
  fs.writeFileSync(argv[9], JSON.stringify(r) + '\n');
  console.log(JSON.stringify(r));
} else if (argv.length === 12) {
  const r = nightJ206(...argv.slice(0, 11).map(read));
  fs.mkdirSync(path.dirname(argv[11]), { recursive: true });
  fs.writeFileSync(argv[11], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <J206a> <rollouts-a> <J205a> <J205b> <J204a> <J204b> <J202b> <J204-seeds-b> <J205-seeds-a> <J205-seeds-b> <J206-seeds-a> <out.json> | --prior <J205a> <J205b> <J204a> <J204b> <J202b> <J204-seeds-b> <J205-seeds-a> <J205-seeds-b> <out.json> | --selftest <dir>');
  process.exit(2);
}
J206EOF
cat > var/j206-tools/rollouts.cjs <<'J206EOF'
// J206 (J205's, unchanged; under rollout=random4-them the arm's search.rr.* are the opponent's random seat's alone, counted into the
// searching seat's counters by SearchPolicy.countRandomSeats). J205's: J204's reader, plus each side's lcb verdicts (D350's `search.lcb.overrode`, `held`, `none`: a decision's best cleared the
// margin by its lower bound, cleared it by its mean only, or neither) and its priority overrides by direction
// (`search.p.changed.fromPass`, `toOther`, `toPass`) and its searched and changed decisions by kind, each as a share. J204's: J202's reader (J201's, J199's, J198's, J197's, itself J195's), plus each side's outlet-policy actions (D310's `policy.*` keys:
// how often the seat under the search answered by its own rule, the games with any, and each key). Rollouts per searched
// decision (p + a + b) for each side of one match: the match line has no rollouts field and no search.rr.*, so this reads each batch
// line's aStats/bStats counts (config A is the match's first player, as tools/ai-ladder/cli.ts cmdMatch tallies it):
// `search.rollouts`, `search.rounds`, `search.anytime.short`, `search.<p|a|b>.considered`, `search.playUs`,
// `search.copyUs`, `search.rolloutErrors`, `search.rolloutStepCap`, and every key under `search.rr.` (D523's random
// rollouts: `rollouts`, D451's guardrail names, the `v2.` ones, D525's `v3.` ones, D527's `v4.` ones, `failures`) and `search.prior.rr.` (the ranking's
// playouts; the arm does not rank). Each `search.rr.<name>` is given per random rollout (over `search.rr.rollouts`) as
// `<side>PerRollout.<name with dots as _>` and per game (over the batch lines read) as `<side>PerGame.<...>`.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, playUs: 0, copyUs: 0, rolloutErrors: 0, stepCap: 0, rr: {}, prr: {}, pol: {}, polGames: 0, lines: 0, lcb: { overrode: 0, held: 0, none: 0 }, kd: { p: [0, 0], a: [0, 0], b: [0, 0] }, dir: { fromPass: 0, toOther: 0, toPass: 0 } });
const t = { a: side(), b: side() };
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
      const s = t[k];
      s.rollouts += n('search.rollouts'); s.rounds += n('search.rounds'); s.short += n('search.anytime.short');
      s.decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
      s.playUs += n('search.playUs'); s.copyUs += n('search.copyUs');
      s.rolloutErrors += n('search.rolloutErrors'); s.stepCap += n('search.rolloutStepCap'); s.lines++;
      for (const x of ['overrode', 'held', 'none']) s.lcb[x] += n(`search.lcb.${x}`);
      for (const x of ['p', 'a', 'b']) { s.kd[x][0] += n(`search.${x}.considered`); s.kd[x][1] += n(`search.${x}.changed`); }
      for (const x of ['fromPass', 'toOther', 'toPass']) s.dir[x] += n(`search.p.changed.${x}`);
      let pg = 0;
      for (const key of Object.keys(c)) {
        if (key.startsWith('search.rr.')) s.rr[key.slice(10)] = (s.rr[key.slice(10)] || 0) + n(key);
        else if (key.startsWith('search.prior.rr.')) s.prr[key.slice(16)] = (s.prr[key.slice(16)] || 0) + n(key);
        else if (key.startsWith('policy.')) { s.pol[key.slice(7)] = (s.pol[key.slice(7)] || 0) + n(key); pg += n(key); }
      }
      if (pg > 0) s.polGames++;
    }
  }
}
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const per = (s, x) => (s.decisions > 0 ? r2(s[x] / s.decisions) : null);
const fires = (s, p) => Object.entries(s.rr).filter(([x]) => x.startsWith(p)).reduce((y, [, v]) => y + v, 0);
const r = { run, a: m?.a ?? null, b: m?.b ?? null, games: t.a.lines };
for (const k of ['a', 'b']) {
  const s = t[k];
  const rrN = s.rr.rollouts || 0;
  const perRollout = {}, perGame = {};
  for (const [name, v] of Object.entries(s.rr).sort()) {
    if (name === 'rollouts') continue;
    const key = name.replace(/\./g, '_');
    perRollout[key] = rrN > 0 ? r4(v / rrN) : null;
    perGame[key] = s.lines > 0 ? r2(v / s.lines) : null;
  }
  Object.assign(r, {
    [`${k}RolloutsPerDecision`]: per(s, 'rollouts'), [`${k}RoundsPerDecision`]: per(s, 'rounds'), [`${k}Decisions`]: s.decisions,
    [`${k}Rollouts`]: s.rollouts, [`${k}Short`]: s.short, [`${k}ShortShare`]: s.decisions > 0 ? r4(s.short / s.decisions) : null,
    [`${k}PlayMsPerRollout`]: s.rollouts > 0 ? r2(s.playUs / s.rollouts / 1000) : null, [`${k}CopyMsPerRollout`]: s.rollouts > 0 ? r2(s.copyUs / s.rollouts / 1000) : null,
    [`${k}RolloutErrors`]: s.rolloutErrors, [`${k}StepCaps`]: s.stepCap,
    [`${k}RrRollouts`]: rrN, [`${k}RrRolloutShare`]: s.rollouts > 0 ? r4(rrN / s.rollouts) : null, [`${k}RrFailures`]: s.rr.failures || 0,
    [`${k}V2Fires`]: fires(s, 'v2.'), [`${k}V3Fires`]: fires(s, 'v3.'), [`${k}V4Fires`]: fires(s, 'v4.'),
    [`${k}Rr`]: s.rr, [`${k}PriorRr`]: s.prr, [`${k}PerRollout`]: perRollout, [`${k}PerGame`]: perGame,
    [`${k}Policy`]: Object.values(s.pol).reduce((x, y) => x + y, 0), [`${k}PolicyGames`]: s.polGames, [`${k}PolicyKeys`]: s.pol,
    [`${k}Lcb`]: s.lcb, [`${k}LcbHeldShare`]: s.lcb.overrode + s.lcb.held > 0 ? r4(s.lcb.held / (s.lcb.overrode + s.lcb.held)) : null,
    [`${k}ChangedShare`]: Object.fromEntries(['p', 'a', 'b'].map((x) => [x, s.kd[x][0] > 0 ? r4(s.kd[x][1] / s.kd[x][0]) : null])),
    [`${k}PriorityShare`]: Object.fromEntries(['fromPass', 'toOther', 'toPass'].map((x) => [x, s.kd.p[0] > 0 ? r4(s.dir[x] / s.kd.p[0]) : null])),
  });
}
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run: r.run, games: r.games, aRolloutsPerDecision: r.aRolloutsPerDecision, bRolloutsPerDecision: r.bRolloutsPerDecision, ratio: r.ratio, aRrRollouts: r.aRrRollouts, bRrRollouts: r.bRrRollouts, aV2Fires: r.aV2Fires, aV3Fires: r.aV3Fires, aV4Fires: r.aV4Fires, aPolicy: r.aPolicy, aPolicyGames: r.aPolicyGames, bPolicy: r.bPolicy, bPolicyGames: r.bPolicyGames, aLcb: r.aLcb, bLcb: r.bLcb, aPriorityShare: r.aPriorityShare, bPriorityShare: r.bPriorityShare, aPerRollout: r.aPerRollout }));
J206EOF
cat > var/j206-tools/worst.cjs <<'J206EOF'
// J206 (J205's, J204's and J202's, unchanged; its mode argument is random4-them for this arm): the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 and D527 continue it). A batch line has no life total, so the
// arm's lost games (winner "B": config A is the arm; no error, no timeout) are ranked by `turns`: the ten longest
// (turns descending, then ms descending; D523's "longest turn count") and the ten quickest (turns ascending, then ms
// ascending). Each game: the batch file and line, seed, pair, game, aSeat, both decks, turns, reason, ms, cpuMs, and
// the arm's own counters in that game: decisions searched (search.<p|a|b>.considered) and changed
// (search.<p|a|b>.changed), random rollouts (search.rr.rollouts), each search.rr.v2.*, search.rr.v3.* and search.rr.v4.* per random rollout,
// search.rr.failures and search.rolloutErrors. aCfgOther counts lines whose config A is not `,rollout=<mode>`-suffixed.
// usage: node worst.cjs <ladder dir> <match.json> <random4> <out.json>
const fs = require('fs');
const path = require('path');
const [dir, matchFile, mode, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const lost = [];
let games = 0, won = 0, other = 0, aCfgOther = 0, turnsLost = 0, turnsWon = 0;
const deck = (p) => (typeof p === 'string' ? path.basename(p).replace(/\.dck$/, '') : null);
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)).sort() : []) {
  fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n').forEach((line, i) => {
    let l; try { l = JSON.parse(line); } catch { return; }
    games++;
    if (typeof l.a !== 'string' || !l.a.endsWith(`,rollout=${mode}`)) aCfgOther++;
    const bad = l.timeout === true || (typeof l.error === 'string' && l.error !== '');
    if (bad || (l.winner !== 'A' && l.winner !== 'B')) { other++; return; }
    if (l.winner === 'A') { won++; turnsWon += l.turns || 0; return; }
    turnsLost += l.turns || 0;
    const c = (l.aStats && l.aStats.counts) || {};
    const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
    const rrN = n('search.rr.rollouts');
    const pre = (p) => {
      const o = {};
      for (const key of Object.keys(c).filter((x) => x.startsWith(p)).sort()) o[key.slice(p.length)] = rrN > 0 ? Math.round((n(key) / rrN) * 1000) / 1000 : null;
      return o;
    };
    lost.push({ batch: f, line: i, seed: l.seed, pair: l.pair, game: l.game, aSeat: l.aSeat, aDeck: deck(l.aDeck), bDeck: deck(l.bDeck), turns: l.turns, reason: l.reason, ms: l.ms, cpuMs: l.cpuMs ?? null,
      searched: n('search.p.considered') + n('search.a.considered') + n('search.b.considered'), changed: n('search.p.changed') + n('search.a.changed') + n('search.b.changed'),
      rrRollouts: rrN, v2PerRollout: pre('search.rr.v2.'), v3PerRollout: pre('search.rr.v3.'), v4PerRollout: pre('search.rr.v4.'), rrFailures: n('search.rr.failures'), rolloutErrors: n('search.rolloutErrors') });
  });
}
const longest = [...lost].sort((x, y) => (y.turns - x.turns) || (y.ms - x.ms)).slice(0, 10);
const quickest = [...lost].sort((x, y) => (x.turns - y.turns) || (x.ms - y.ms)).slice(0, 10);
const r = { run, a: m?.a ?? null, mode, games, lost: lost.length, won, other, aCfgOther,
  meanTurnsLost: lost.length ? Math.round((turnsLost / lost.length) * 100) / 100 : null, meanTurnsWon: won ? Math.round((turnsWon / won) * 100) / 100 : null,
  longest, quickest };
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run, games, lost: r.lost, won, other, aCfgOther, meanTurnsLost: r.meanTurnsLost, meanTurnsWon: r.meanTurnsWon }));
J206EOF
cat > var/j206-tools/seeds.cjs <<'J206EOF'
// J206 (J205's, J204's and J202's, unchanged): which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
// every results line of <ladder dir>/results/*.jsonl whose purpose is the match's own `match:<id>` and reports its
// games, distinct blocks (`bseed`) and their lowest and highest.
// usage: node seeds.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
let games = 0;
const blocks = new Set();
const rdir = `${dir}/results`;
for (const f of purpose !== null && fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(`${rdir}/${f}`, 'utf8').split('\n')) {
    if (!line.includes('"purpose":"match:')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.purpose === purpose && typeof r.bseed === 'number') { games++; blocks.add(r.bseed); }
  }
}
const b = [...blocks].sort((x, y) => x - y);
const r = { purpose, games, blocks: b.length, min: b.length ? b[0] : null, max: b.length ? b[b.length - 1] : null };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J206EOF
rm -rf var/j206-tools/selftest
node var/j206-tools/verdict.mjs --selftest var/j206-tools/selftest > var/j206-tools/selftest.json
cat var/j206-tools/selftest.json
# J205 re-read by its own verdict from J205's, J204's and J202 (b)'s final lines and seeds files on this host: v6Margin
# (40), J205's SIGNAL and count, whether its iteration lost badly, whether it iterated to this arm; J204 (b)'s blocks
node var/j206-tools/verdict.mjs --prior var/ai-ladder/match-J205a.json var/ai-ladder/match-J205b.json var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202b.json var/j204/seeds-b.json var/j205/seeds-a.json var/j205/seeds-b.json var/j206-tools/j205.json
# the rollout reader and the worst-games reader on a synthetic batch folder: three games; the arm (A) wins one, loses
# two, with lcb verdicts, priority overrides by direction and the opponent random seat's guardrails on its side;
# search-v2 (B) carries no search.rr.* and no search.lcb.* key, and its outlet policy acted in two games
rm -rf var/j206-tools/ro-selftest
mkdir -p var/j206-tools/ro-selftest/batches/run-s
C='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1'
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"',rollout=random4-them","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.p.changed.fromPass":2,"search.lcb.overrode":2,"search.lcb.none":8,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":320,"search.rr.v3.goodBlock":8,"search.rr.v4.goodBlockLethal":4}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10,"search.p.changed":1,"search.p.changed.toPass":1,"policy.LETHAL":2}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"',rollout=random4-them","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.lcb.held":3,"search.lcb.none":7,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":160,"search.rr.failures":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10,"search.b.changed":2}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"',rollout=random4-them","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.b.considered":10,"search.b.changed":1,"search.lcb.overrode":1,"search.lcb.none":9,"search.rr.rollouts":160,"search.rr.v2.castSomething":16,"search.rr.v4.goodBlockRefused":4}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10,"policy.COMBAT":1}}}' \
  > var/j206-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rrandom4them-lcb-m40","b":"search-v1-anytime"}' > var/j206-tools/ro-selftest/match.json
node var/j206-tools/rollouts.cjs var/j206-tools/ro-selftest var/j206-tools/ro-selftest/match.json var/j206-tools/ro-selftest/out.json
node var/j206-tools/worst.cjs var/j206-tools/ro-selftest var/j206-tools/ro-selftest/match.json random4-them var/j206-tools/ro-selftest/worst.json
node var/j206-tools/worst.cjs var/j206-tools/ro-selftest var/j206-tools/ro-selftest/match.json random4 var/j206-tools/ro-selftest/worst-r4.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j206-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j206-tools/ro-selftest/worst.json","utf8"));const w4=JSON.parse(fs.readFileSync("var/j206-tools/ro-selftest/worst-r4.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.ratio===1.2&&r.aRrRollouts===480&&r.bRrRollouts===0&&r.aPerRollout.v2_ownStack===1&&r.aRrFailures===1&&r.aV3Fires===8&&r.aV4Fires===8&&r.aLcb.overrode===3&&r.aLcb.held===3&&r.aLcb.none===24&&r.aLcbHeldShare===0.5&&r.bLcb.overrode+r.bLcb.held+r.bLcb.none===0&&r.bLcbHeldShare===null&&r.aChangedShare.p===0.1111&&r.aChangedShare.b===0.1&&r.aChangedShare.a===0&&r.aPriorityShare.fromPass===0.1111&&r.aPriorityShare.toPass===0&&r.bPriorityShare.toPass===0.05&&r.bChangedShare.b===0.2&&r.bPolicy===3&&r.bPolicyGames===2&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w4.aCfgOther===3&&w.longest[0].seed===11&&w.quickest[0].seed===13?1:0;fs.writeFileSync("var/j206-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j206-tools/seeds-selftest
mkdir -p var/j206-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j206-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j206-tools/seeds-selftest/match.json
node var/j206-tools/seeds.cjs var/j206-tools/seeds-selftest var/j206-tools/seeds-selftest/match.json var/j206-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j206-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j206-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of the arm (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range; each
# side's rollouts, search.rr.*, search.lcb.* and policy.* counters from the batch; the worst-games reader on it
./tools/ai-ladder.sh match search-v2-rrandom4them-lcb-m40 search-v1-anytime --games 4 --batch-pairs 1 --host j206-pilot --purpose pilot --dir var/ai-ladder-pilot/J206 --experiments var/ai-ladder-pilot/J206/experiments.jsonl --out var/ai-ladder-pilot/J206/match-a.json --jobs 1
node var/j206-tools/rollouts.cjs var/ai-ladder-pilot/J206 var/ai-ladder-pilot/J206/match-a.json var/j206-tools/rollouts-pilot-a.json
node var/j206-tools/worst.cjs var/ai-ladder-pilot/J206 var/ai-ladder-pilot/J206/match-a.json random4-them var/j206-tools/worst-pilot-a.json
```
metrics: merged = sh: cat var/j206-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j206-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0}'
metrics: pl = sh: cat var/j206-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j206-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"isMerge":0,"secondParentIsLaneTip":0,"firstParentIsJ205Pin":0,"mergeIsTip":0,"mergeIsLane":0,"sameCode":0}'
metrics: cst = sh: cat var/j206-tools/code-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: st = sh: cat var/j206-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pj = sh: cat var/j206-tools/j205.json 2>/dev/null || echo '{"read":0,"aRead":0,"v6Margin":null,"baselineDeals":0,"iterate":0,"v7":null,"v7IsArm":0}'
metrics: rst = sh: cat var/j206-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j206-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J206/match-a.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmn = sh: node -e 'let ok=0;try{const m=JSON.parse(require("fs").readFileSync("var/ai-ladder-pilot/J206/match-a.json","utf8"));ok=m.a==="search-v2-rrandom4them-lcb-m40"&&m.ah==="01e2aba2d33e"&&m.b==="search-v1-anytime"&&m.bh==="cdd55e02a89c"?1:0}catch(e){}console.log(JSON.stringify({ok}))'
metrics: pra = sh: cat var/j206-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0}'
metrics: pwa = sh: cat var/j206-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.checks >= 352
check: pl.ok == 1
check: pl.them_only == 1
check: pl.baseline_is_seat == 1
check: pl.hashesAsD531 == 1
check: sd.parents == 2
check: sd.isMerge == 1
check: sd.secondParentIsLaneTip == 1
check: sd.firstParentIsJ205Pin == 1
check: sd.mergeIsTip == 1
check: sd.mergeIsLane == 1
check: sd.sameCode == 1
check: sd.ok == 1
check: cst.ok == 1
check: st.ok == 1
check: st.cases == 88
check: pj.read == 1
check: pj.aRead == 1
check: pj.v6Margin == 40
check: pj.baselineDeals == 1
check: pj.aSameDeals == 1
check: pj.iterate == 1
check: pj.v7IsArm == 1
check: rst.ok == 1
check: sst.ok == 1
check: pmn.ok == 1
check: pma.complete == true
check: pma.played == 4
check: pma.errors + pma.timeouts <= 1
check: pma.aSearch.searched >= 10
check: pma.bSearch.searched >= 10
check: pra.games == 4
check: pra.aDecisions == pma.aSearch.searched
check: pra.bDecisions == pma.bSearch.searched
check: pra.aRrRollouts > 0
check: pra.aV2Fires > 0
check: pra.bRrRollouts == 0
check: pra.aLcb.overrode + pra.aLcb.held + pra.aLcb.none > 0
check: pra.bLcb.overrode + pra.bLcb.held + pra.bLcb.none == 0
check: pwa.games == 4
check: pwa.aCfgOther == 0
check: pma.aSearch.msPerDecision < 1500
check: pma.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken, and whether the night can be read as D531 registered it:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass, and `dst`: the build's decision self-test ran with 0 failures and at least 352
  checks (D530's build counted 337; D531's case adds 15). **This is the first compile of D531's Java**, written while
  J205 held the machine; a failure here stops the job before any game;
- the four players resolve on this PC: `pl.them_only` says the arm's ai-bench config is J205 (a)'s
  (`search-v2-rrandom4-lcb-m40`) with `,rollout=random4-them` for `,rollout=random4` at its end and nothing else;
  `pl.baseline_is_seat` that policy-outlet is still search-v2's seat with the search off; and `pl.hashesAsD531` that the
  arm's hash is D531's (`01e2aba2d33e`) and the others unchanged (`98eea870967e`, `e350d94649a4`, `cdd55e02a89c`);
- `sd`, the code by content (D531 point 4, condition 1; HEAD is the runner's checkout of the pin): the pin is a merge
  (two parents; a pin with no second parent writes `none` and fails here, never passes), its second parent is the lane
  tip the job names (`sd.secondParentIsLaneTip`), its first parent is `1e72a8ec` (D530's merge, J205's pin) under every
  path a match runs (`git diff --quiet`, `sd.firstParentIsJ205Pin`: nothing merged onto main there since; J205's pilot
  showed `137b2bf6..1e72a8ec` there is `players.json` alone), and the merge result there is the lane tip
  (`sd.mergeIsTip`), whose diff is exactly D531's four files (`sd.mergeIsLane`, and by name against J204's pin,
  `sd.sameCode`). The paths: `bridge/src`, `tools/ai-bench` (the set and its decks), `tools/ai-ladder`, the modules the
  ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`, `tools/runner/control.ts`),
  `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge home), `forge-home/custom-cards` and
  `config.json`. So search-v2's code, the bench's deal function, the confirm set, its decks and the Forge homes are the
  ones J204 (b) played, plus D531's four files, read in D531 point 4. Names alone would not do: another lane editing
  `SearchConfig.java`, `kinds.ts` or `players.json` would give the same four names. If any part fails (`sd.why`), the
  job does not run as drafted: the baseline is replayed as a second match (D531 point 4). `cst.ok`: the check itself on
  six synthetic sets of answers (the good merge passes; no second parent, another second parent, main moved under a
  match path with the same four names, a merge result that is not the tip, a fifth file each fail);
- the verdict script reads eighty-eight synthetic sets of files: J205's own fifty-five, unchanged (its verdict is how
  this night re-reads J205), and thirty-three of this night's one-arm shape -- D527's table with the SHOWN row in
  D531's words, SIGNAL at its bars against J204 (b) (NO SIGNAL worded with the seating), values that are not
  float-exact (-63.1 against -78.1 read as +15.0), SIGNAL unread when a seeds file moved, misses a game or is missing
  (and a replay then owed), the count of successive readings re-read from J205's lines (J205 INCONCLUSIVE and this
  night INCONCLUSIVE closing the track; this night SHOWN resetting it; unread without J205 (a), without J204 (a) or
  when J205's v6Margin would not be 40), the loop stopping only when the arm and both J205 arms lose badly (one J205
  arm is not enough; J205 (b) missing leaves it unread), a candidate getting its confirmation and holding a closing,
  an incomplete or wrong-config arm reposted, no random-v8 ever named; exactly one reading of the arm when complete,
  the self-play path never opened and the live seat never changed;
- `pj`: J205 re-read by its own verdict from the lines on this host: its two lines and J204's are complete, v6Margin
  is 40 (J204 (a) minus J202 (b)), J205 (a) is `search-v2-rrandom4-lcb-m40` on the same deals as J204 (b) (both
  exactly blocks 114,900,000-114,900,149 with every game), and J205 is a night that iterated to this arm (`pj.v7IsArm`):
  both arms to diagnose, its SIGNAL read and nothing closed, so a J206 posted after a J205 that closed the track or
  found a candidate fails here; `pj.count` (J205's successive count, 0 or 1), `pj.signal` and
  `pj.iterationLosesBadly` are recorded, not checked;
- the readers read a synthetic batch of three games as written (`rst.ok`: the lcb verdicts, held as a share, the
  changed shares by kind and the priority overrides by direction on each side; the worst-games reader counts no
  foreign config under mode `random4-them` and all three under `random4`), and the block reader a synthetic results
  log (`sst.ok`);
- in 4 games of the arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **the arm's random rollouts are counted and its guardrails fired** (the opponent's seat, in the first
  games this seating has played; its failures, `pra.aRrFailures`, are read), **the arm decided on the lcb rule and search-v2 did
  not**, search-v2's side carries no `search.rr.*`, every line's config A ends in `,rollout=random4-them`; both sides
  stay under the 1.5 s budget on average.

Read, not checked: `sd.sinceJ204` (should be the four files), `pj.count`, `pj.signal`, `pj.iterationLosesBadly`; the
arm's rollouts a decision against search-v2's (`pra.ratio`: expected nearer 1 than D530's pilot's x1.34-x1.42, the
searching seat's continuation being Forge's again), each guardrail per random rollout (about half of J205's), `pra.aLcb`
and `pra.aLcbHeldShare`, the priority directions on both sides.

There are no win-rate bounds. The match is the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J206a.json
```bash
# (a) random-v7: search-v2-rrandom4them-lcb-m40 against search-v2, 1,200 games on the confirm set
test -f var/j206-tools/verdict.mjs
mkdir -p var/j206
echo "J206 (a): search-v2-rrandom4them-lcb-m40 (random-v7) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom4them-lcb-m40 search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J206a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j206/verdict.json var/j206/report.md var/j206/rollouts-a.json var/j206/seeds-a.json var/j206/worst-a.json var/j206/rollouts-j205a.json var/j206/rollouts-j202b.json
```bash
# the pre-registered readings (D527's table with D531's SHOWN, SIGNAL against J204 (b), the count re-read from J205's
# and J204's lines, the loop's count); the match's rollouts, counters, deal blocks and the arm's worst-lost games (read,
# not gated); report.md (numbers only; the PC session writes the summary beside it)
mkdir -p var/j206
node var/j206-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J206a.json var/j206/rollouts-a.json
node var/j206-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J206a.json var/j206/seeds-a.json
node var/j206-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J206a.json random4-them var/j206/worst-a.json
node var/j206-tools/verdict.mjs var/ai-ladder/match-J206a.json var/j206/rollouts-a.json var/ai-ladder/match-J205a.json var/ai-ladder/match-J205b.json var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202b.json var/j204/seeds-b.json var/j205/seeds-a.json var/j205/seeds-b.json var/j206/seeds-a.json var/j206/verdict.json
# the same reader over J205 (a)'s and J202 (b)'s batches: both seats random at margin 40 under lcb and under the margin rule, beside the night's
node var/j206-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J205a.json var/j206/rollouts-j205a.json
node var/j206-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J202b.json var/j206/rollouts-j202b.json
node - <<'J206EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const M = read('var/ai-ladder/match-J206a.json'), RO = read('var/j206/rollouts-a.json'), BS = read('var/j206/seeds-a.json');
const B4 = read('var/j204/seeds-b.json'), W = read('var/j206/worst-a.json');
const R5A = read('var/j206/rollouts-j205a.json'), R2B = read('var/j206/rollouts-j202b.json');
const v = read('var/j206/verdict.json');
const sg = v.signal || {}, j5 = v.j205 || {}, j4 = v.j204 || {}, x = v.a || {};
const pct = (y, d = 1) => (typeof y === 'number' ? `${(y * 100).toFixed(d)}%` : '-');
const runStart = (id) => { const z = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || ''); return z ? Date.UTC(+z[1], +z[2] - 1, +z[3], +z[4], +z[5], +z[6]) : null; };
const hours = (m) => { const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const L = ['# J206: random-v7, rollout=random4-them (the opponent alone random) at J205 (a)\'s rule, search-v2-rrandom4them-lcb-m40 against search-v1-anytime (D531)', ''];
L.push(`**J205, re-read by its own verdict:** ${(v.reading || [])[0] ?? '-'}.`, '');
L.push(`**The arm under D527's table (SHOWN restated by D530 point 7):** ${(v.reading || [])[1] ?? 'no reading'}.`, '');
L.push(`**SIGNAL against J204 (b)'s baseline on the same deals:** ${sg.text ?? 'no reading'}${typeof sg.share === 'number' ? `; the share of search-v2's own gain over the seat under it that the arm keeps: ${pct(sg.share)} (information)` : ''}. Same deals: J204 (b) ${j4.baselineDeals ?? 0} (blocks ${B4.min ?? '-'} to ${B4.max ?? '-'}, ${B4.blocks ?? '-'} blocks, ${B4.games ?? '-'} games), the arm ${x.sameDeals ?? 0} (blocks ${BS.min ?? '-'} to ${BS.max ?? '-'}, ${BS.blocks ?? '-'}, ${BS.games ?? '-'} games).`, '');
L.push(`**The count and the loop:** J205's SIGNAL, recomputed: ${(j5.signal || {}).reading ?? '-'} (${(j5.signal || {}).diff ?? '-'} [${(j5.signal || {}).lo ?? '-'}, ${(j5.signal || {}).hi ?? '-'}]), its count ${j5.count ?? 'unread'}; ${(v.reading || [])[3] ?? '-'}; ${(v.reading || [])[4] ?? '-'}.`, '');
L.push(`**What the night decides:** ${(v.reading || []).slice(5).join('; ') || '-'}.`, '');
L.push(`**Beside the reading (information, deciding nothing):** the arm minus J205 (a) (the same rule on the same deals with both rollout seats random: the effect of giving the searching seat Forge's continuation, about +-19): ${v.aMinusJ205a ?? '-'} Elo on the point; minus J205 (b) (lcb at margin 60): ${v.aMinusJ205b ?? '-'}; minus J202 (b) (both seats random, the margin rule at 40): ${v.aMinusJ202b ?? '-'}.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| (a) ${M.a} vs ${M.b} | ${M.played} / ${M.planned} | ${M.complete} | ${M.score} [${M.lo}, ${M.hi}] | ${M.elo} [${M.eloLo}, ${M.eloHi}] | ${M.draws}, ${M.errors}, ${M.timeouts} | ${(M.aSearch || {}).msPerDecision ?? '-'} | ${(M.bSearch || {}).msPerDecision ?? '-'} | ${RO.aRolloutsPerDecision ?? '-'} | ${RO.bRolloutsPerDecision ?? '-'} | ${RO.ratio ?? '-'} | ${RO.aPlayMsPerRollout ?? '-'} / ${RO.bPlayMsPerRollout ?? '-'} | ${RO.aCopyMsPerRollout ?? '-'} / ${RO.bCopyMsPerRollout ?? '-'} | ${hours(M) ?? '-'} |`);
L.push(`| J205 (a) ${R5A.a ?? '-'} vs ${R5A.b ?? '-'} (information) | | | | | | | | ${R5A.aRolloutsPerDecision ?? '-'} | ${R5A.bRolloutsPerDecision ?? '-'} | ${R5A.ratio ?? '-'} | ${R5A.aPlayMsPerRollout ?? '-'} / ${R5A.bPlayMsPerRollout ?? '-'} | ${R5A.aCopyMsPerRollout ?? '-'} / ${R5A.bCopyMsPerRollout ?? '-'} | |`);
L.push('');
L.push(`(a) config hashes: ${M.a} ${M.ah}, ${M.b} ${M.bh}. Deck set ${M.set}; ${M.pairs} mirrored pairs; match id ${M.id}. Deal blocks ${BS.blocks ?? '-'}, ${BS.min ?? '-'} to ${BS.max ?? '-'}, ${BS.games ?? '-'} games. Rounds per searched decision ${RO.aRoundsPerDecision ?? '-'} / ${RO.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${RO.aShort ?? '-'} = ${pct(RO.aShortShare, 2)} / ${RO.bShort ?? '-'} = ${pct(RO.bShortShare, 2)}; rollout errors ${RO.aRolloutErrors ?? '-'} / ${RO.bRolloutErrors ?? '-'}, step caps ${RO.aStepCaps ?? '-'} / ${RO.bStepCaps ?? '-'}; the rollout reader saw ${RO.games ?? '-'} games and ${RO.aDecisions ?? '-'} / ${RO.bDecisions ?? '-'} searched decisions (the match line: ${(M.aSearch || {}).searched ?? '-'} / ${(M.bSearch || {}).searched ?? '-'}). Random rollouts ${RO.aRrRollouts ?? '-'} of config A's ${RO.aRollouts ?? '-'} (the opponent's random seat); search-v2's side ${RO.bRrRollouts ?? '-'}; random-seat failures ${RO.aRrFailures ?? '-'}. The lcb verdicts on the arm's side: overrode ${(RO.aLcb || {}).overrode ?? '-'}, held ${(RO.aLcb || {}).held ?? '-'} (the margin rule would have overridden; ${pct(RO.aLcbHeldShare)} of overrode plus held), none ${(RO.aLcb || {}).none ?? '-'}; search-v2's side ${JSON.stringify(RO.bLcb || {})}; J205 (a)'s: ${JSON.stringify(R5A.aLcb || {})} (${pct(R5A.aLcbHeldShare)} held).`);
const dir = (r, s) => (r && r[`${s}PriorityShare`] ? `${pct(r[`${s}PriorityShare`].fromPass, 2)} / ${pct(r[`${s}PriorityShare`].toOther, 2)} / ${pct(r[`${s}PriorityShare`].toPass, 2)}` : '-');
const kd = (r, s) => (r && r[`${s}ChangedShare`] ? `${pct(r[`${s}ChangedShare`].p)} / ${pct(r[`${s}ChangedShare`].a)} / ${pct(r[`${s}ChangedShare`].b)}` : '-');
L.push('', '| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |', '|---|---|---|');
for (const [label, r, s] of [[`(a) ${M.a}`, RO, 'a'], ['(a) search-v2', RO, 'b'], ['J205 (a) search-v2-rrandom4-lcb-m40 (both seats random, lcb)', R5A, 'a'], ['J205 (a) search-v2', R5A, 'b'], ['J202 (b) search-v2-rrandom4-m40 (both seats random, margin rule)', R2B, 'a'], ['J202 (b) search-v2', R2B, 'b']]) {
  L.push(`| ${label} | ${kd(r, s)} | ${dir(r, s)} |`);
}
L.push('', "D530 point 8: J202 (b), margin 40, changed Forge at priority from a pass 16.4%, to another play 10.5%, to a pass 4.82%, attack 14.3%, block 18.0%; search-v2 8.15%, 6.27%, 4.65%, 14.8%, 19.5%. random-v7 is expected (not registered) to bring the from-pass share toward search-v2's (D531 point 7).");
const names = [...new Set([...Object.keys(RO.aPerRollout || {}), ...Object.keys(R5A.aPerRollout || {})])].sort((p, q) => ((p.startsWith('v') ? 0 : 1) - (q.startsWith('v') ? 0 : 1)) || p.localeCompare(q));
L.push('', '| search.rr.<name> | (a) fires | (a) per random rollout | (a) per game | J205 (a) per random rollout (both seats) |', '|---|---|---|---|---|');
for (const n of names) {
  const raw = n.replace(/_/g, '.');
  L.push(`| ${raw} | ${(RO.aRr || {})[raw] ?? 0} | ${(RO.aPerRollout || {})[n] ?? '-'} | ${(RO.aPerGame || {})[n] ?? '-'} | ${(R5A.aPerRollout || {})[n] ?? '-'} |`);
}
L.push(`| rollouts (the denominator) | ${RO.aRrRollouts ?? '-'} | 1 | ${RO.games ? Math.round((RO.aRrRollouts / RO.games) * 100) / 100 : '-'} | 1 |`);
L.push('', "Under rollout=random4-them the fires are the opponent's random seat's alone; under J205's random4 both seats' were summed, so about half per random rollout is the expected level, not a finding.");
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const [who, t] of [[M.a, M.aSearch], [M.b, M.bSearch]]) {
  if (!t || !t.searched) { L.push(`| ${who} | no search | | | | | | | | | |`); continue; }
  const kd2 = t.byKind || {};
  const ch = (k) => (kd2[k] ? `${kd2[k].changed}/${kd2[k].searched} (${pct(kd2[k].rate)})` : '-');
  const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  const ms = t.msMean || {};
  L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
}
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, y]) => `v2.${n} ${y}`), ...Object.entries(g.v3PerRollout || {}).map(([n, y]) => `v3.${n} ${y}`), ...Object.entries(g.v4PerRollout || {}).map(([n, y]) => `v4.${n} ${y}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
L.push('', `(a) ${W.a ?? '-'}: ${W.lost ?? '-'} lost, ${W.won ?? '-'} won, ${W.other ?? '-'} drawn, errored or timed out of ${W.games ?? '-'} batch lines; mean turns ${W.meanTurnsLost ?? '-'} lost, ${W.meanTurnsWon ?? '-'} won; lines whose config A is not the arm's: ${W.aCfgOther ?? '-'}. No life total is on a batch line: a diagnosis replays a game's seed with full recording for it (D523 point 10).`);
for (const [what, list] of [['the ten longest lost games (turns descending)', W.longest], ['the ten quickest lost games (turns ascending)', W.quickest]]) {
  L.push('', `(a) ${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const g of list || []) L.push(row(g));
}
const n = (y) => typeof y === 'number';
L.push('', `Rule parts. The arm, read by the first row that holds: complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(M.lo) && M.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(M.elo) && M.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(M.eloHi) && M.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(M.eloLo) && n(M.eloHi) && M.eloLo < 0 && M.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(M.eloLo) && M.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(M.eloHi) && M.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(M.eloHi) && M.eloHi < -15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0} (case 1 ${x.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${x.indistinguishable ?? 0}, no weaker (case 2) ${x.noWeaker ?? 0}, worse, not badly ${x.worseNotBadly ?? 0} (too wide ${x.tooWide ?? 0}, case 3 ${x.upperAtZero ?? 0}), loses badly ${x.losesBadly ?? 0}; candidate ${x.candidate ?? 0}, diagnose ${x.diagnose ?? 0}. SIGNAL read ${sg.read ?? 0}: diff ${sg.diff ?? '-'}, hw ${sg.hw ?? '-'}, interval [${sg.lo ?? '-'}, ${sg.hi ?? '-'}]; SHOWN ${sg.signalShown ?? 0}, AGAINST ${sg.signalAgainst ?? 0}, NO SIGNAL ${sg.noSignal ?? 0}, INCONCLUSIVE ${sg.signalInconclusive ?? 0}. The count ${v.signalInconclusiveCount ?? 'unread'} (J205 ${j5.count ?? 'unread'}; closes ${v.countCloses ?? 0}); this iteration loses badly ${v.iterationLosesBadly ?? 0}, J205's ${j5.loopRead ? j5.iterationLosesBadly : 'unread'}, the loop stops ${v.loopStops ?? 0}. The night: closes ${v.closes ?? 0}; the track closes ${v.trackCloses ?? 0} (a closing decision owed ${v.closing ?? 0}); the closing waits on a confirmation ${v.closingWaits ?? 0}; kept open ${v.keepsOpen ?? 0}; a 4,800-game confirmation owed ${v.confirm ?? 0}; a new decision from the counters ${v.newDecision ?? 0} (no random-v8: ${v.v8 === null ? 'none named' : v.v8}); a replay owed (other deals) ${v.replayBaseline ?? 0}; repost ${v.repost ?? 0}; self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (both 0 on this night by the rule).`);
for (const [label, f] of [['J205 (a)', 'var/ai-ladder/match-J205a.json'], ['J205 (b)', 'var/ai-ladder/match-J205b.json'], ['J204 (a)', 'var/ai-ladder/match-J204a.json'], ['J204 (b)', 'var/ai-ladder/match-J204b.json'], ['J202 (b)', 'var/ai-ladder/match-J202b.json']]) {
  const p = read(f);
  L.push('', `${label} on the same deals (information): ${p.a ?? '-'} vs ${p.b ?? '-'}, ${p.played ?? '-'} games, complete ${p.complete ?? '-'}, score ${p.score ?? '-'} [${p.lo ?? '-'}, ${p.hi ?? '-'}], Elo ${p.elo ?? '-'} [${p.eloLo ?? '-'}, ${p.eloHi ?? '-'}].`);
}
L.push('', 'Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6], J202 (a) random-v4 -39.5 [-53.9, -25.3].');
fs.writeFileSync('var/j206/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J206EOF
```
check: cma.complete == true
check: cma.played == 1200
check: cma.errors + cma.timeouts <= 60
check: bsa.blocks == 150
check: bsa.games == cma.played
check: roa.aRrRollouts > 0
check: roa.bRrRollouts == 0
check: roa.aLcb.overrode + roa.aLcb.held + roa.aLcb.none > 0
check: roa.bLcb.overrode + roa.bLcb.held + roa.bLcb.none == 0
check: wa.aCfgOther == 0
check: v.written == 1
check: v.a.names == 1
check: v.a.complete == 1
check: v.j205.aRead == 1
check: v.j205.v6Margin == 40
check: v.a.shown + v.a.inconclusive + v.a.indistinguishable + v.a.noWeaker + v.a.worseNotBadly + v.a.losesBadly == 1
check: v.a.shown == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.lo > 0.5 and cma.elo >= 15)
check: v.a.shown == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.lo > 0.5 and cma.elo >= 15)
check: v.a.inconclusive == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi >= 15 and not (cma.lo > 0.5 and cma.elo >= 15))
check: v.a.inconclusive == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi >= 15 and not (cma.lo > 0.5 and cma.elo >= 15))
check: v.a.indistinguishable == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and cma.eloLo < 0 and cma.eloHi > 0 and cma.eloLo > -15)
check: v.a.indistinguishable == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and cma.eloLo < 0 and cma.eloHi > 0 and cma.eloLo > -15)
check: v.a.noWeaker == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and cma.eloLo >= 0)
check: v.a.noWeaker == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and cma.eloLo >= 0)
check: v.a.losesBadly == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < -15)
check: v.a.losesBadly == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < -15)
check: v.a.tooWide == 0 or (v.a.worseNotBadly == 1 and cma.eloLo <= -15 and cma.eloHi > 0)
check: v.a.candidate == v.a.shown + v.a.inconclusive + v.a.indistinguishable + v.a.noWeaker
check: v.a.diagnose == v.a.worseNotBadly + v.a.losesBadly
check: v.a.sameDeals == 1 or not (bsa.blocks == 150 and bsa.min == 114900000 and bsa.max == 114900149 and bsa.games == cma.played and bs4.blocks == 150 and bs4.min == 114900000 and bs4.max == 114900149 and bs4.games == c4b.played and c4b.played == 1200)
check: v.signal.read == v.a.sameDeals
check: v.signal.read == 0 or v.signal.signalShown + v.signal.signalAgainst + v.signal.noSignal + v.signal.signalInconclusive == 1
check: v.signal.read == 0 or (v.signal.diff >= cma.elo - c4b.elo - 0.06 and v.signal.diff <= cma.elo - c4b.elo + 0.06)
check: v.signal.signalShown == 0 or (v.signal.diff >= 15 and v.signal.lo > -0.06)
check: v.signal.signalAgainst == 0 or (v.signal.diff <= -15 and v.signal.hi < 0.06)
check: v.signal.noSignal == 0 or (v.signal.diff > -15 and v.signal.diff < 15 and v.signal.lo <= 0.06 and v.signal.hi >= -0.06)
check: v.replayBaseline == 1 - v.a.sameDeals
check: v.signal.read == 0 or v.signal.signalInconclusive == 0 or v.signalInconclusiveCount == v.j205.count + 1
check: v.signal.read == 0 or v.signal.signalInconclusive == 1 or v.signalInconclusiveCount == 0
check: v.signal.read == 1 or v.signalInconclusiveCount == v.j205.count
check: v.countCloses == 1 or not (v.signalInconclusiveCount >= 2)
check: v.countCloses == 0 or v.signalInconclusiveCount >= 2
check: v.iterationLosesBadly == v.a.losesBadly
check: v.loopStops == 1 or not (v.iterationLosesBadly == 1 and v.j205.loopRead == 1 and v.j205.iterationLosesBadly == 1)
check: v.loopStops == 0 or (v.iterationLosesBadly == 1 and v.j205.loopRead == 1 and v.j205.iterationLosesBadly == 1)
check: v.j205.iterationLosesBadly == 0 or (c5a.eloHi < -15 and c5b.eloHi < -15)
check: v.closes == 1 or not (v.signal.noSignal == 1 or v.signal.signalAgainst == 1 or v.countCloses == 1 or v.loopStops == 1)
check: v.closes == 0 or (v.signal.noSignal == 1 or v.signal.signalAgainst == 1 or v.countCloses == 1 or v.loopStops == 1)
check: v.candidate == v.a.candidate
check: v.confirm == v.a.candidate
check: v.trackCloses == 1 or not (v.closes == 1 and v.candidate == 0)
check: v.trackCloses == 0 or (v.closes == 1 and v.candidate == 0)
check: v.closingWaits == 1 or not (v.closes == 1 and v.candidate == 1)
check: v.closingWaits == 0 or (v.closes == 1 and v.candidate == 1)
check: v.keepsOpen == 1 or not (v.signal.read == 1 and v.closes == 0)
check: v.keepsOpen == 0 or (v.signal.read == 1 and v.closes == 0)
check: v.closing == v.trackCloses
check: v.newDecision == 1 or not (v.a.diagnose == 1 and v.signal.read == 1 and v.closes == 0)
check: v.newDecision == 0 or (v.a.diagnose == 1 and v.signal.read == 1 and v.closes == 0)
check: v.iterate == v.newDecision
check: v.v8 == null
check: v.principleInDoubt == v.iterationLosesBadly
check: v.repost == 0
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0

The first three checks say the match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next two say it played 150 deal blocks and the block reader found every
game. The next five say the arm's rollouts were random ones on the batch lines and search-v2's were not, the arm
decided on the lcb rule and search-v2 did not, and every line's config A was the arm's (`,rollout=random4-them`). Then
the verdict ran on this arm, and J205 was re-read with v6Margin 40 and its deciding arm complete. Then fourteen for the
arm: exactly one of the six readings, D527's table in the runner's own language, row by row, each both ways, `tooWide`
only where it belongs, and `candidate` and `diagnose` the readings' two groups. Then SIGNAL: it is read exactly when
the arm and the baseline are on the same deals (and when both seeds files show exactly blocks
114,900,000-114,900,149 with every game, it is), exactly one of its four readings, its `diff` the two match lines'
points' difference, and each of SHOWN, AGAINST and NO SIGNAL only where its bars hold (the interval's ends are
reported to 0.1, so the checks allow 0.06 at 0; the script decides on the unrounded values); a replay is owed exactly
when it is not. Then the count of successive readings (J205's re-read count plus one on this night's INCONCLUSIVE, 0
on any other reading, J205's when SIGNAL is unread; closing at 2, both ways), this iteration losing badly exactly when
the arm does, the loop (both ways, and J205's half only where both J205 lines lost badly), what closes (both ways),
the candidate, the track closing, waiting or kept open (each both ways), the closing decision owed exactly when it
closes, the confirmation exactly for a candidate, a new decision from the counters exactly when the arm is to diagnose,
SIGNAL was read and nothing closes, no random-v8 ever named, the principle's cheap path in doubt exactly when the
iteration loses badly, no repost, and the self-play path closed and the live seat unchanged. Any reading passes them;
a reading is not a failure, and a closed track is not a failure either. The time per decision, the rollouts, the
guardrail and lcb counters, the changed answers, the fallbacks and the worst-lost games are reported, not gated.

## Abort if
abort: j206_err >= 30 and j206_err > j206_games / 10

Engine trouble only: once 30 games have ended in an engine error or a timeout, the job stops if they are more than one
in ten. The match has no stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J206a.json
collect: var/j206/verdict.json
collect: var/j206/report.md
collect: var/j206/rollouts-a.json
collect: var/j206/worst-a.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J199 to J205:
- **J205, re-read** (`v.j205`): its v6Margin, its deciding arm's reading, its SIGNAL and successive count, whether its
  iteration lost badly, and that it iterated to this arm;
- **the arm's reading under D527's table**: SHOWN, INCONCLUSIVE, NOT SHOWN indistinguishable, NOT SHOWN worse not
  badly, or NOT SHOWN loses badly (and the three unreached cases by name if one occurred), with its score against
  search-v2 and its 95% interval, the same in Elo, and the pair and game counts; for a too-wide interval, say that it
  is "too wide to call" and read as worse, not badly; a SHOWN in D531's words (Forge's opponent model leaves the
  rollout loop for this arm once its confirmation holds; Forge stays for the searching seat);
- **the SIGNAL reading against J204 (b)** in D531's words: `diff`, `hw` and the interval, which of the four readings,
  and what it decides (NO SIGNAL worded as "no signal under override=lcb at margin 40 with the opponent alone random
  at +-15 on the point", never as equivalence), whether the deals were the same (`v.a.sameDeals`,
  `v.j204.baselineDeals`), and when they were not, that the next job replays what puts the arm and the baseline on the
  same blocks and nothing else follows;
- **the count** (`v.j205.count`, `v.signalInconclusiveCount`): J205's own SIGNAL as recomputed from its lines, this
  night's, and whether two in a row closed the track; **the loop** (`v.j205.iterationLosesBadly`,
  `v.iterationLosesBadly`, `v.loopStops`);
- **what the night decides, in D531's words:** when `v.trackCloses` is 1, that the random-rollout track closes (D523
  point 10's stop), which of the four ways (`v.signal`, `v.countCloses`, `v.loopStops`), that the owner is told, with
  the counters, which way it went, and that a closing decision writes it from the track's closing draft with D530
  point 8's finding and this night's counters as the evidence a reopening starts from; when `v.closingWaits` is 1,
  that the candidate's 4,800-game confirmation runs first and decides (holding, the track reached its goal and stays
  open; failing, it closes as on NO SIGNAL); when `v.newDecision` is 1, that the next step is decided from random-v7's
  counters and worst-lost games in a new decision (D530 point 7, D531 point 6) -- no random-v8 was pre-registered --
  naming what the counters and the worst-lost games say; for a candidate (`v.confirm`), that its 4,800-game
  confirmation is owed, as its own job, before anything; then, plainly, whatever the reading, that the live seat is
  unchanged and any change to it is a separate decision (a seat-queue row, D509);
- **the seating's own effect** (`v.aMinusJ205a`: the arm minus J205 (a), the same rule on the same deals with both
  rollout seats random, about +-19) and **the lcb verdicts** (`roa.aLcb`, `roa.aLcbHeldShare`) beside J205 (a)'s;
- **the changed answers by kind and by direction** on both sides, beside J205 (a)'s and J202 (b)'s both-seats arms and
  search-v2's own (D530 point 8's table): whether the from-pass excess fell toward search-v2's 8.15%, as D531 point 7
  expects, and what happened to the attack overrides;
- **the compute each side spent:** ms per decision on both sides and their ratio, by kind; the arm's rollouts and
  rounds per searched decision against search-v2's and against J205 (a)'s, play and copy ms a rollout, the short
  decisions, rollout errors and step caps, budget fallbacks with their interval and other fallbacks;
- **the guardrails:** the arm's `search.rr.*` counters per random rollout and per game, beside J205 (a)'s (one random
  seat against two: about half is the expected level);
- **the worst-lost games:** the arm's ten longest and ten quickest lost games, with the mean turns of lost against won
  games; say that the batch line has no life total;
- **the code:** the pilot's `sd` (exactly D531's four files, `sd.sinceJ204` the same four) and the build's decision
  self-test count (`dst.checks`: the first compile and run of D531's Java);
- **the run:** draws, errors and timeouts, the deal blocks (expected 114,900,000-114,900,149), the match's hours
  against its estimate (2.3-2.8 h), the pressure events in STATUS (drops, raises, any stop and its retry), that it ran
  alone (D521), and whether the GPU queue or anything else outside the lab was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it; "NO SIGNAL" is the pre-registered reading for a difference within +-15 whose interval contains 0, not
a proof of none. If the arm stopped early (`complete: false`), say so: it gets no reading, SIGNAL has none, and what
follows is a decision about reposting it, not a reading.

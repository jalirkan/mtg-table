id: J205
title: Random rollouts, iteration 5 (random-v6, no new rollout logic): two fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule), each against search-v1-anytime (search-v2), of the two registered arms D350's override=lcb (z 1) on rollout=random4 at margins 60 and 40, both read under D527's table: (a) the arm at J204's v6Margin (40, so search-v2-rrandom4-lcb-m40: J204 (a) minus J202 (b) read -3.5; the job reads it from J204's match lines), which alone is read for D528's SIGNAL against J204 (b)'s policy-outlet line on the same deals (not replayed), with the count of successive SIGNAL INCONCLUSIVE readings re-read from J204's match lines; (b) the other margin; alone on the machine
public_title: Random rollouts in the search, fifth try: a noise-aware override
public_est: ~5-6 h (one night)
public_decides: Whether a noise-aware override saves random rollouts, or the track closes
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@1e72a8ecbb332d35c8edb2e1008b706dcd993ba7 (the merge commit of D530's lane, pc/rollout-random-v6, on main, merged alone before D529's lane, its first parent 137b2bf6 (D528's merge, J204's pin), pushed to origin/main before posting; the lane's tip: 58ca284e. It carries: the ladder players search-v2-rrandom4-lcb-m60 and search-v2-rrandom4-lcb-m40 (search-v2-rrandom4-m60 and -m40 with override=lcb, z 1), D530's decision file, the PLAN entry and the registry test; nothing under bridge/src, tools/ai-bench or tools/ai-ladder's code changes. Pinned so every game of both matches is one code version, D341; the pilot checks the pin is that merge (two parents), that it brought nothing under bridge/src and only players.json under tools/ai-ladder, and that nothing a ladder match runs (bridge/src, tools/ai-bench, tools/ai-ladder, tools/cubelab/lines.ts and rng.ts, tools/runner/control.ts, tools/ai-ladder.sh, tools/ai-bench.sh, tools/config.sh, forge-home/custom-cards, config.json) differs from J204's pin 137b2bf6 but players.json, so search-v2, the bench's deal function, the confirm set and the Forge homes are J204's)
decides: three pre-registered readings (D530 point 5), each from the match lines alone, every threshold compared in integer tenths of Elo (and ten-thousandths of score) as the lines carry them. FIRST, D527's table, unchanged, for EACH arm against search-v1-anytime: SHOWN (a 4,800-game confirmation under D519's readings, then Forge leaves the rollout loop for this arm), INCONCLUSIVE (a 4,800-game confirmation first), NOT SHOWN indistinguishable (a candidate, confirmed at 4,800 games), NOT SHOWN worse not badly or loses badly (diagnose); a candidate from either arm gets its confirmation as its own job. SECOND, SIGNAL, on the deciding arm (a) alone, the lcb arm at J204's v6Margin (D528 point 8: 60, unless J204 (a)'s Elo point minus J202 (b)'s is below 0, then 40; derived from those two match lines on this host), against J204 (b)'s baseline line (policy-outlet against search-v1-anytime on the same 600 deals, not replayed): diff = (a)'s Elo point minus J204 (b)'s, hw = sqrt(((a.eloHi - a.eloLo)/2)^2 + ((b.eloHi - b.eloLo)/2)^2): SIGNAL SHOWN (diff >= +15 and diff - hw > 0), SIGNAL AGAINST (diff <= -15 and diff + hw < 0: the track closes), NO SIGNAL (the interval contains 0 and |diff| < 15: no signal under override=lcb at margin v6Margin at +-15 on the point, not equivalence; the track closes), SIGNAL INCONCLUSIVE (anything else), read only when (a) and J204 (b) are complete and both played exactly blocks 114,900,000-114,900,149. THIRD, the count of SUCCESSIVE SIGNAL INCONCLUSIVE readings: J204's own, recomputed from J204's two match lines, plus 1 on this night's SIGNAL INCONCLUSIVE, reset to 0 by any other SIGNAL reading; two close the track as NO SIGNAL does. The loop's count: this iteration loses badly when both arms do (D527 point 7), and the loop stops when it does and J204 (a) lost badly (its line). The track closes on NO SIGNAL, SIGNAL AGAINST, the count at 2 or the loop's stop, unless either arm is a candidate, whose 4,800-game confirmation then runs first and decides (holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL). With the track open and both arms to diagnose, the agent iterates as random-v7 without asking the owner (D530 point 7, pre-registered: rollout=random4-them, the rollout's opponent random-v4 and the searching seat's own continuation Forge's, at the deciding arm's rule unchanged); after random-v7 only these same stops close the track, and otherwise the next step is decided from its counters in a new decision. SIGNAL unread because the deals differ: the next job replays what puts the arm and the baseline on the same blocks, nothing else follows. The self-play-from-random path waits for a reading confirmed at 4,800 games; any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on any reading. What is known: J204 on these deals, 1,200 games each: (a) search-v2-rrandom4-m60 (random4, margin 60) score 0.4650 [0.4449, 0.4851], Elo -24.4 [-38.4, -10.4], NOT SHOWN, worse, not badly, 0 errors, 0 timeouts; (b) policy-outlet (search-v2's seat with the search off) score 0.3808 [0.3601, 0.4016], Elo -84.4 [-99.9, -69.3], 0 errors, 1 timeout; SIGNAL (a) - (b) +60.0 [39.3, 80.7] (+-20.7), SIGNAL SHOWN (the random values keep 71% of search-v2's own gain over the seat under it); signalInconclusiveCount 0; marginStep (J204 (a) minus J202 (b)) -3.5, so v6Margin 40 and the deciding arm search-v2-rrandom4-lcb-m40; J204 (b)'s blocks: min 114900000, max 114900149, 150 blocks, 1200 games. J202 (b), search-v2-rrandom4-m40 (margin 40, the same rollouts), -20.9 [-34.1, -7.7], worse, not badly. The lcb arms use the same rollout procedure as their margin arms (the rule is read by the verdict alone), so each is expected (not registered) to override Forge less than its margin arm: J202 (b) changed Forge's answer in 26.4% of its searched decisions (priority 31.7%: from a pass 16.4%, to another play 10.5%, to a pass 4.8%; attack 14.3%, block 18.0%), search-v2 18.0% (19.0%: 8.15%, 6.27%, 4.65%; 14.8%, 19.5%). D530's pilot (8 games, run beside J204 (a), which it should not have been: D530 discloses it) saw every arm decision under `rule lcb margin <m> z 1.00`, lcb overriding in 8 of 86 and 8 of 88, holding 5 the margin rule would have taken in each. Each reading's noise: (a)'s own interval about +-13.5 Elo at 1,200 games; SIGNAL's hw about +-19 to +-21. Information, not a prediction any check reads
rule: written 2026-11-10 before any rated game of either match, word for word as D530 states it (its point 5; D530's bold dropped, its table given row by row as reading | when | what it decides): "The pre-registered rule for J205 (written on 2026-11-10 before any rated game of either arm; the night's job quotes it word for word). Three readings, each from the match lines alone. *First, D527's table for each arm*, unchanged, exactly as D528 point 6 states it: each lcb arm against `search-v1-anytime`, read once by the first row that holds — SHOWN (lower end above 0.5 and point at least +15 Elo: Forge leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games before it replaces Forge in the loop), NOT SHOWN, worse, not badly (upper end below 0 and at least −15 Elo: diagnose and iterate), NOT SHOWN, loses badly (upper end below −15 Elo: the same, the principle's cheap path in doubt) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player. *Second, SIGNAL*, D528's, with J204's baseline, on the deciding arm (a) alone: `diff` = (a)'s Elo point minus J204 (b)'s (`policy-outlet` against `search-v1-anytime`, its own match line), `hw` = √(((a.eloHi − a.eloLo)/2)² + ((b.eloHi − b.eloLo)/2)²), the interval [`diff − hw`, `diff + hw`]; read only when (a) is complete, J204 (b)'s line is complete by D528's test (the two players in that order at `e350d94649a4` and `cdd55e02a89c`, `complete: true`, 1,200 games, errors plus timeouts at most 60, the four numbers) and both played exactly blocks 114,900,000–114,900,149, 150 blocks, every game: SIGNAL SHOWN | `diff` ≥ +15 and `diff − hw` > 0 | the random values under lcb carry signal beyond Forge's choice: the track stays open; SIGNAL AGAINST | `diff` ≤ −15 and `diff + hw` < 0 | worse than no search at all: the track closes; NO SIGNAL | `diff − hw` ≤ 0 ≤ `diff + hw` and |`diff`| < 15 | no signal under lcb at margin `v6Margin` at ±15 on the point (not a finding of equivalence): the track closes; SIGNAL INCONCLUSIVE | anything else | counted (point 6); the track stays open only if the count stays under 2; *Third, the count.* The SIGNAL INCONCLUSIVE count is of successive readings and is re-read from J204's two match lines, not from J204's verdict file or this text: the verdict recomputes J204's SIGNAL from `var/ai-ladder/match-J204a.json` (the arm at `216e66d89fe3`) and `match-J204b.json` by D528's rule, which gives J204's count (its `signalInconclusive`, 0 or 1); this night's count is J204's plus 1 on SIGNAL INCONCLUSIVE and 0 on any other SIGNAL reading, and J204's unchanged when SIGNAL is unread. Two successive SIGNAL INCONCLUSIVE readings — J204's and J205's — close the track as NO SIGNAL does (D528 point 6). J205 emits `signalInconclusiveCount` (0, 1 or 2) for the next job to re-read the same way. If J204's lines are not both complete on the host, the count is unread, and the verdict says so (no closing on it). *Numbers.* Every threshold above is compared on the numbers the match lines carry: Elo in integer tenths, the score's lower end in integer ten-thousandths (so −63.1 − (−78.1) is the +15.0 it is, not 14.999999999999993); `hw` is the root of those exact numbers. *The other margin (b)* is read under the first table, as (a) is; its difference to J204 (b) and to (a) is reported, not read as SIGNAL. *The track closes* (D523 point 10's stop, the owner told with the counters which way it went; a closing decision writes it from the track's closing draft with the night's numbers) on NO SIGNAL, SIGNAL AGAINST, a SIGNAL INCONCLUSIVE count of 2, or the loop's stop (point 6) — unless either arm is a candidate under the first reading, in which case its 4,800-game confirmation runs first and the closing waits on it (holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL). NO SIGNAL is worded as the table words it, never as equivalence. An incomplete arm gives no reading of its own and is reposted; SIGNAL needs (a), and random-v7 waits on both arms' readings. A complete (a) whose blocks are not exactly 114,900,000–114,900,149 (a memory retry) is read under the first table, but SIGNAL is unread, nothing closes and nothing iterates on it: the next job replays what puts the arm and the baseline on the same blocks (each in a ladder folder of its own, whose blocks start at 114,900,000: the arm, and the baseline too when J204 (b)'s were not those) and reads SIGNAL, the count and what follows by this rule. Reported beside, deciding nothing: (a) minus J204 (a) (the rule at margin 60, when (a) is `-lcb-m60`) or minus J202 (b) (at margin 40, when it is `-lcb-m40`), the rule's own effect, about ±19; (a) minus the other margin arm of the chain; each side's overrides of Forge by kind and by direction at priority (`fromPass`, `toOther`, `toPass`) against J202's and J204's; `search.lcb.overrode`, `held` and `none` a decision, and `held` as a share of what the margin rule would have overridden; ms, rollouts and rounds a decision; every `search.rr.*` per random rollout; the deal blocks." How the night applies it (D530 points 2 to 6). WHICH ARM DECIDES: v6Margin = 40 when J204 (a)'s line (search-v2-rrandom4-m60 at 216e66d89fe3 against search-v1-anytime at cdd55e02a89c, var/ai-ladder/match-J204a.json) and J202 (b)'s (search-v2-rrandom4-m40 at 968c9003c616, var/ai-ladder/match-J202b.json) are both complete and J204 (a)'s elo minus J202 (b)'s is below 0 (in integer tenths), 60 when it is not, unread otherwise (then nothing is read); the deciding arm is search-v2-rrandom4-lcb-m60 (d6d75fdefd25) at 60 and search-v2-rrandom4-lcb-m40 (98eea870967e) at 40, and the other margin is the other; the pilot writes both names to var/j205-tools/arms.txt and the matches play them in that order. Two fixed matches (D398, no stopping rule), each 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 30 deck pairs never tuned on): (a) the deciding arm vs search-v1-anytime, var/ai-ladder/match-J205a.json; (b) the other margin vs search-v1-anytime, var/ai-ladder/match-J205b.json. Both matchups are new on this host, so each takes the host's match blocks 114,900,000-114,900,149: J204's deals, and J194's, J195's, J199's, J201's and J202's. NUMBERS: every threshold is compared in integers, Elo in tenths (Math.round(x * 10)) and the score's lower end in ten-thousandths, as the match lines carry them; hw is the root of a sum of exact half-tenths squared. A match is COMPLETE when its line names the two players in that order at their config hashes, says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers; J204's two lines and J202 (b)'s by the same test. EACH ARM is read on its own match alone, only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15; INCONCLUSIVE when not SHOWN and eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (tooWide and case 3 included). A candidate is SHOWN, INCONCLUSIVE, indistinguishable or no weaker; to diagnose is worse, not badly or loses badly; candidate is 1 when either arm is one, and confirmA and confirmB name which (each its own 4,800-game job). SAME DEALS: J204 (b)'s seeds file (var/j204/seeds-b.json) and (a)'s (var/j205/seeds-a.json) each show 150 blocks, lowest 114,900,000, highest 114,900,149, and as many games as the match line played (1,200). SIGNAL is read on (a) alone, only when (a) and J204 (b) are complete and on the same deals, exactly one of signalShown, signalAgainst, noSignal, signalInconclusive, by the conditions above (diff, hw and the interval reported to 0.1); when (a) and J204 (b) are complete and the deals are not provably the same, replayBaseline is 1: nothing closes, nothing iterates, and the next job replays what puts the arm and the baseline on the same blocks. (b)'s difference to J204 (b) is computed the same way and reported, deciding nothing. THE COUNT, of SUCCESSIVE readings: J204's SIGNAL recomputed from J204's two match lines by D528's rule (both complete; D528 set no block condition on its own reading) gives J204's count (its signalInconclusive, 0 or 1); signalInconclusiveCount is J204's plus 1 when this night's SIGNAL is INCONCLUSIVE, 0 when it is any other reading, J204's when SIGNAL is unread, and null when J204's lines are not both complete; countCloses is 1 exactly when it is 2. THE LOOP: iterationLosesBadly is 1 exactly when both arms are complete and both lose badly (D527 point 7); loopStops is 1 exactly when it is and J204 (a)'s line is complete with eloHi < -15. closes is 1 exactly when noSignal, signalAgainst, countCloses or loopStops; trackCloses is closes and no candidate (closing 1: a closing decision is owed); closingWaits is closes and a candidate; keepsOpen is SIGNAL read and not closes; iterate is 1 exactly when both arms are complete and to diagnose, SIGNAL was read and not closes, and v7 is then search-v2-rrandom4them-lcb-m<v6Margin>. principleInDoubt is iterationLosesBadly. repost is 1 exactly when v6Margin is read and an arm is not complete (repostWhich names it). selfPlayOpens and liveSeatChanged are 0 in every reading of this night. Reported beside, deciding nothing: ruleEffect, (a) minus J204 (a) when v6Margin is 60 or minus J202 (b) when it is 40 (lcb against the margin rule at the same margin, same deals, about +-19); bMinusA (the margin under lcb); (b) against the baseline; J204's own SIGNAL as recomputed; each side's ms per decision (p + a + b, and by kind) and their ratio, rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps, every `search.rr.*` counter per random rollout and per game for (a), each side's `search.lcb.overrode`, `held` and `none` and held as a share of overrode plus held, searched and changed decisions by kind and the priority overrides by direction (from a pass, to another play, to a pass) as shares, beside J202's and J204's; budget fallbacks with their interval and other fallbacks, the deal blocks played, (a)'s ten longest and ten quickest lost games with their counters. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~5-5.5 h at 7 workers (an estimate; range 4.5-6.5 h), 8 h at worst (the two matches' own stops). From this host at 7 workers, alone, on these same 600 deals: J202 (b), search-v2-rrandom4-m40 against search-v2 at 898 against 889 ms a decision, played its 1,200 games in 2.62 h, J202 (a) in 2.27 h; the lcb rule is read by the verdict alone, so each lcb arm plays its margin arm's rollouts and is guessed at ~2.3-2.8 h (J204 (a), the margin 60 arm, played its 1,200 games in 2.39 h with three short worker drops). Each match stops itself at --hours 4: 8 h in all, which with the pilot is under the 9 h timeout, so a slow (a) cannot let the timeout cut (b); a match that reaches its stop reports complete: false and gives no reading. Both run under the ladder's default 300 s per-game timeout (neither lifts maxRounds). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games of each match on one worker)
resumable: no
timeout: 9h
clean: var/j205 var/ai-ladder-pilot/J205 var/ai-ladder/match-J205a.json var/ai-ladder/match-J205b.json
progress: metric j205_games games of 2400
metrics: j205_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4-lcb-m60","search-v1-anytime"],["search-v2-rrandom4-lcb-m40","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j205_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4-lcb-m60","search-v1-anytime"],["search-v2-rrandom4-lcb-m40","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J205a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J205b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: c4a = sh: cat var/ai-ladder/match-J204a.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: c4b = sh: cat var/ai-ladder/match-J204b.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: c2b = sh: cat var/ai-ladder/match-J202b.json 2>/dev/null || echo '{"played":0,"complete":false,"elo":null}'
metrics: roa = sh: cat var/j205/rollouts-a.json 2>/dev/null || echo '{"games":0}'
metrics: rob = sh: cat var/j205/rollouts-b.json 2>/dev/null || echo '{"games":0}'
metrics: bsa = sh: cat var/j205/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: bsb = sh: cat var/j205/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: bs4 = sh: cat var/j204/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: wa = sh: cat var/j205/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0}'
metrics: v = sh: cat var/j205/verdict.json 2>/dev/null || echo '{"written":0,"v6Margin":null,"deciding":null,"other":null,"candidate":0,"confirm":0,"confirmA":0,"confirmB":0,"iterate":0,"v7":null,"trackCloses":0,"closingWaits":0,"keepsOpen":0,"closes":0,"closing":0,"countCloses":0,"loopStops":0,"principleInDoubt":0,"iterationLosesBadly":0,"repost":0,"repostWhich":null,"replayBaseline":0,"selfPlayOpens":0,"liveSeatChanged":0,"signalInconclusiveCount":null,"ruleEffect":null,"bMinusA":null,"j204":{"read":0,"count":null,"losesBadly":null,"baselineDeals":0,"aDiagnose":0,"signal":{"read":0}},"a":{"complete":0,"sameDeals":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0},"b":{"complete":0,"sameDeals":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0},"signal":{"read":0,"signalShown":0,"signalAgainst":0,"noSignal":0,"signalInconclusive":0,"diff":0,"hw":0,"lo":0,"hi":0},"signalB":{"read":0}}'
headline: v.v6Margin, v.deciding, cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.eloLo, cma.eloHi, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, roa.aRolloutsPerDecision, roa.bRolloutsPerDecision, roa.ratio, roa.aLcb.overrode, roa.aLcb.held, roa.aLcb.none, roa.aLcbHeldShare, roa.aPriorityShare.fromPass, roa.bPriorityShare.fromPass, roa.aPerRollout.v2_ownStack, roa.aPerRollout.v3_goodBlock, roa.aRrFailures, v.a.shown, v.a.inconclusive, v.a.indistinguishable, v.a.worseNotBadly, v.a.losesBadly, v.a.candidate, v.a.sameDeals, cmb.played, cmb.elo, cmb.eloLo, cmb.eloHi, v.b.shown, v.b.inconclusive, v.b.indistinguishable, v.b.worseNotBadly, v.b.losesBadly, v.b.candidate, v.signal.diff, v.signal.hw, v.signal.lo, v.signal.hi, v.signal.signalShown, v.signal.signalAgainst, v.signal.noSignal, v.signal.signalInconclusive, v.j204.count, v.signalInconclusiveCount, v.countCloses, v.j204.losesBadly, v.iterationLosesBadly, v.loopStops, v.trackCloses, v.closingWaits, v.keepsOpen, v.confirmA, v.confirmB, v.iterate, v.v7, v.replayBaseline, v.ruleEffect, v.signalB.diff, v.bMinusA, bsa.min, bs4.min, v.repost, v.repostWhich, wa.lost

**Why this job** (D530, the fifth iteration of D523's point 10 loop: J199 random-v2, J201 random-v3, J202 random-v4,
J204 random-v5, and now random-v6; the owner's principle,
in his words as D523 quotes them): "Yes, there are terribly useless situations that will arise from randomized moves, but
you are the agent in the loop who can recognize that, iterate to avoid it, so we waste less time on useless data." D523
took Forge's judgment out of the search's rollouts and put guarded randomness in; D525 and D527 added and fixed
guardrails; D528 found the search's override margin the one lever that moved and asked whether the random values carry
any signal beyond Forge's own choice. The chain so far, every arm against search-v1-anytime on these same 600 deals:

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

J204's SIGNAL, (a) minus (b): +60.0 [39.3, 80.7] (+-20.7), SIGNAL SHOWN; its v6Margin 40.
D528 point 8 pre-registered what follows when the track stays open with the arm to diagnose: random-v6, one change,
D350's `override=lcb` (the paired difference's lower bound, mean_d - z*se_d, must clear the margin, over at least 3
paired rounds) at v6Margin. D530 fixed the rest before any game: z at D350's registered 1; two registered arms, one at
each margin, both read under D527's table, the one at v6Margin deciding SIGNAL and passing its rule to random-v7; J204 (b)'s baseline read again rather than replayed;
and random-v7. D530 is `docs/decisions/D530-random-v6-lcb.md` at the pin: its point 5 is the rule, point 6 the loop's
count, point 7 what follows each case, point 8 why random-v7 is what it is; D528 is the SIGNAL rule and point 8; D527 the
table; D523 the seam and point 10, the iteration loop; D350 the lcb rule.

**What is built** (D530, the merge of pc/rollout-random-v6). Two new ladder players in `tools/ai-ladder/players.json`:
- `search-v2-rrandom4-lcb-m60` (kind `search`, every param search-v1-anytime's (`profile: Default`, `outlets: on`,
  `budgetMs: 1500`, `anytime: on`) plus `rollout: random4`, `margin: 60`, `override: lcb`, `z: '1'`), config hash
  `d6d75fdefd25`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=60,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1,rollout=random4`;
- `search-v2-rrandom4-lcb-m40`, the same with `margin: 40`, config hash `98eea870967e`;
- each is its margin arm (`search-v2-rrandom4-m60`, `216e66d89fe3`, J204 (a); `search-v2-rrandom4-m40`, `968c9003c616`,
  J202 (b)) with `override=lcb,z=1` where `SearchConfig.toString` prints it, and nothing else
  (`web/test/ai-ladder.test.ts` holds that);
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hashes are D530's, computed by `registry.ts` on the lane; the pilot records the real ones
(`var/j205-tools/players.json`) and checks the config strings and the hashes (`pl.hashesAsD530`). The rollouts are
J202's and J204's exactly (`rollout=random4`, both seats random-v2 plus R8 made lethal-aware, seeded from the rollout's
seed, common random numbers across a round's candidates). The rule is read by the verdict alone
(`SearchPolicy.Report.verdict`: with lcb, Forge's answer is kept when the best candidate has fewer than 3 paired rounds
or no standard error, and overridden when `diffLeaf[best] - z*seDiff[best] > margin`); the anytime loop's budget,
rounds, pruning and racing do not read it. Each searched decision counts `search.lcb.overrode`, `search.lcb.held` (its
best's mean cleared the margin, its lower bound did not: an override the margin rule makes and lcb refuses) or
`search.lcb.none` on the arm's side; search-v2's side, on the margin rule, has none.

**The counters.** The arms' batch lines carry D523's, D525's and D527's `search.rr.*` counters (summed over the
rollout's two random seats into the searching seat's counts) and D350's `search.lcb.*`; the match line carries none of
them (`tallyLine` in `tools/ai-ladder/match.ts`). `var/j205-tools/rollouts.cjs` is J204's reader with each side's lcb
verdicts (`<side>Lcb`, `<side>LcbHeldShare`), its searched and changed decisions by kind (`<side>ChangedShare`) and its
priority overrides by direction (`<side>PriorityShare`: `search.p.changed.fromPass`, `toOther`, `toPass` over
`search.p.considered`) added: D530 point 8's evidence for random-v7 is in those directions, and the night reports
them beside J202's.

**The worst-lost games** (D523 point 10), for (a) only: `var/j205-tools/worst.cjs` is J204's, unchanged.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host, in this order:
1. **(a) the deciding arm**, the lcb arm at v6Margin (the first line of `var/j205-tools/arms.txt`, which the pilot
   derives from J204's and J202's match lines; J204 read 40, so search-v2-rrandom4-lcb-m40), vs `search-v1-anytime`,
   `--out var/ai-ladder/match-J205a.json`.
2. **(b) the other margin**, the other lcb arm (the second line), vs `search-v1-anytime`,
   `--out var/ai-ladder/match-J205b.json`.

**Deal blocks, and why J204's baseline is this night's** (D530's Context). A match's batches take the host's match base
(`hostBase(host)` + 900,000 = 114,900,000, `cmdMatch` in `tools/ai-ladder/cli.ts`) and then the matchup's next unused
block (`nextBseed`), counting blocks per unordered matchup by name (`mkey`). Both arms are new names, so each takes
**114,900,000-114,900,149**, as J204 (b)'s `policy-outlet` did; a block's deck pairs are `batchPairs(bseed, nPairs,
per)`, a fixed function of the block and the set, and its games' seeds the bench's `--seed <bseed>`. The confirm set and
its 60 decks are under `tools/ai-bench/`. So when nothing under `bridge/src`, `tools/ai-bench` or the ladder's code
differs from J204's pin 137b2bf6 (the pilot's `sd.sameCode`) and both lines played exactly those 150 blocks (J204 (b)'s
`var/j204/seeds-b.json`, the pilot's `pj.baselineDeals`; (a)'s `var/j205/seeds-a.json`, the verdict's `a.sameDeals`),
the arm and the baseline played the same deals and SIGNAL is read on them. A match retried after a memory stop takes
the next unused blocks (114,900,150 onward); the verdict then reads (a) under the table but not SIGNAL, and the
next job replays what puts the arm and the baseline on the same blocks (D530 point 5), nothing else following from
the night.

**Why one night and no tuning.** Each arm changes one thing in an arm already played on these deals (the override
rule), and z is D350's registered value. Nothing is selected, so each score is read as it is. Both arms are registered and
read under D527's table; the second look this gives at one night is guarded by the 4,800-game confirmation any
candidate needs, and only the deciding arm is read for SIGNAL. What follows the night is D530 point 7: a 4,800-game
confirmation for a candidate from either arm; for both arms to diagnose with the track open, random-v7 (`rollout=random4-them`), after which only the same stops close the track; for a closed track, a closing decision written from the track's closing
draft and the owner told. D523's point 10 iteration rule, quoted word for word (bold dropped): "After J199, the agent
reads the counters and the worst-lost games — the arm's lost games with the longest turn count and the lowest arm life
at the end, the batch line's `seed` replayed with `--record full` into a frame log (the searched decisions' reports say
which candidate each rollout preferred) — names the useless lines random-v2 still plays, adds or fixes guardrails (each
a rule with the failure it prevents, the evidence and a counter, as above, in a new decision that amends this one),
registers the result as a new arm (`random-v3`, a new name and hash; the arms above stay what they measured), pilots it
and re-runs the same 1,200-game match without asking the owner, who gets each night's results. The loop stops only on
a SHOWN or indistinguishable reading confirmed at 4,800 games, or on two successive v-iterations that lose badly; then
the owner is told, with the counters, which way it went." D528 added the SIGNAL stop to it and D530 the count's
re-reading, both written before this night's first game. Neither match ever touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523 to D530 name it in their rules): a ladder match plays to
wall-clock budgets, so contention changes the rollouts each side affords, and both matches have search-v2 on one side;
it is admitted only onto an empty machine and nothing, heavy or light, is admitted beside it; while it is next and
waits, nothing newer starts. `cores: 7` keeps the width J195's to J204's walls were measured at. No `after:`; it starts
once the jobs before it have ended, and it needs J204's report block to have run (the pilot reads J204's match lines
and `var/j204/seeds-b.json`). It may run beside the art session's GPU painting queue, which is outside the lab and
CPU-light but not memory-free; the runner's memory rule handles that as for J204.

## Pilot
About 15 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the six players (search-v1-anytime, J202 (b)'s search-v2-rrandom4-m40, J204 (a)'s
  search-v2-rrandom4-m60, J204 (b)'s policy-outlet, and the two lcb arms), each lcb arm's seat config is its margin
  arm's with `override=lcb,z=1` after `seed=0` and nothing else, the two lcb arms differ in the margin alone, and the
  hashes are D530's;
- the pin is the merge of D530's lane (two parents), it brought nothing under `bridge/src` and, under `tools/ai-ladder`
  and `tools/ai-bench`, only `tools/ai-ladder/players.json`; and **nothing a ladder match runs but `players.json` differs
  from J204's pin 137b2bf6** (`bridge/src`, `tools/ai-bench` (the set and its decks), `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`, `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge home), `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path); `sd.sameCode`: search-v2, the bench's deal function, the confirm set and the
  Forge homes are J204's, so J204 (b)'s line is this night's baseline; if it is not, the job is not
  run as drafted: D530's Context replays the baseline instead);
- J204's two final match lines and J202 (b)'s are on this host and complete, J204 (b) played exactly blocks
  114,900,000-114,900,149 (`var/j204/seeds-b.json`), and v6Margin is read from them: `var/j205-tools/arms.txt` gets the
  deciding arm on its first line and the other margin on its second; and J204 itself is a night that iterates (its
  SIGNAL SHOWN or INCONCLUSIVE, its arm to diagnose), so a J205 posted by mistake fails here;
- the verdict script, the rollout reader, the worst-games reader and the block reader written and tested on synthetic
  files;
- 4 games of each arm against `search-v1-anytime`, one worker, in the pilot's own folder (the same deal for both): the
  arm and search-v2 search, the arm on the lcb rule and search-v2 on the margin rule (`search.lcb.*` on the arm's side
  only), the reader agrees with each match line, the arm's random rollouts are counted and its guardrails fire, and
  search-v2's side carries no `search.rr.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j205-merged.txt || echo 0 > var/j205-merged.txt
cat var/j205-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the six players resolve; each lcb arm is its margin arm with override=lcb,z=1 and nothing else (D530 point 2); the
# hashes are D530's; the pin is D530's merge and, in everything a ladder match runs, J204's pin
mkdir -p var/j205-tools
./tools/ai-ladder.sh list > var/j205-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom4-m40|search-v2-rrandom4-m60|policy-outlet|search-v2-rrandom4-lcb-m60|search-v2-rrandom4-lcb-m40) ' var/j205-tools/players.txt
node - <<'J205EOF'
// J205's pilot: the six players resolve; each lcb arm is its margin arm with `override=lcb,z=1` inserted after `seed=0`
// and nothing else; the two lcb arms differ in the margin alone; the hashes are D530's (and D527's and D528's unchanged).
const fs = require('fs');
const L = fs.readFileSync('var/j205-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), m40 = get('search-v2-rrandom4-m40'), m60 = get('search-v2-rrandom4-m60'), po = get('policy-outlet'), l60 = get('search-v2-rrandom4-lcb-m60'), l40 = get('search-v2-rrandom4-lcb-m40');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const lcbOf = (c) => c.replace(',seed=0,anytime=1,', ',seed=0,override=lcb,z=1,anytime=1,');
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const r = {
  present: [v1, m40, m60, po, l60, l40].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  lcb_only_rule: base && m60 && m40 && l60 && l40 && l60.kind === 'search' && l40.kind === 'search'
    && m60.cfg === V1CFG.replace(',margin=20,', ',margin=60,') + ',rollout=random4' && m40.cfg === V1CFG.replace(',margin=20,', ',margin=40,') + ',rollout=random4'
    && l60.cfg === lcbOf(m60.cfg) && l40.cfg === lcbOf(m40.cfg) && l60.cfg !== m60.cfg && l60.cfg === l40.cfg.replace(',margin=40,', ',margin=60,')
    && /,override=lcb,z=1,anytime=1,rollout=random4$/.test(l60.cfg) ? 1 : 0,
  baseline_is_seat: base && po && po.kind === 'policy' && po.cfg === 'Default+outlets' && v1.cfg.slice(0, v1.cfg.indexOf('+search:')) === po.cfg ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-rrandom4-m40': m40?.hash ?? null, 'search-v2-rrandom4-m60': m60?.hash ?? null, 'policy-outlet': po?.hash ?? null, 'search-v2-rrandom4-lcb-m60': l60?.hash ?? null, 'search-v2-rrandom4-lcb-m40': l40?.hash ?? null },
  hashesAsD530: v1?.hash === 'cdd55e02a89c' && m40?.hash === '968c9003c616' && m60?.hash === '216e66d89fe3' && po?.hash === 'e350d94649a4' && l60?.hash === 'd6d75fdefd25' && l40?.hash === '98eea870967e' ? 1 : 0,
  cfgs: { 'search-v2-rrandom4-lcb-m60': l60?.cfg ?? null, 'search-v2-rrandom4-lcb-m40': l40?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.lcb_only_rule && r.baseline_is_seat && r.hashesAsD530 ? 1 : 0;
fs.writeFileSync('var/j205-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J205EOF
# the pin is a merge, what it brought (first parent to it), and what differs from J204's pin under the search, the bench and the ladder
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > var/j205-tools/parents.txt
git diff --name-only HEAD^1 HEAD -- bridge/src > var/j205-tools/merge-bridge.txt 2>/dev/null || true
git diff --name-only HEAD^1 HEAD -- tools/ai-ladder tools/ai-bench > var/j205-tools/merge-ladder.txt 2>/dev/null || true
git diff --name-only 137b2bf697c30c95533fa6a02c10a6d57ca32b75 HEAD -- bridge/src tools/ai-bench tools/ai-ladder tools/cubelab/lines.ts tools/cubelab/rng.ts tools/runner/control.ts tools/ai-ladder.sh tools/ai-bench.sh tools/config.sh forge-home/custom-cards config.json > var/j205-tools/since-j204.txt 2>/dev/null || echo '(J204 pin 137b2bf6 is not in this checkout)' > var/j205-tools/since-j204.txt
node - <<'J205EOF'
const fs = require('fs');
const lines = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
const parents = Number((lines('var/j205-tools/parents.txt')[0] || '0').trim());
const bridge = lines('var/j205-tools/merge-bridge.txt'), ladder = lines('var/j205-tools/merge-ladder.txt'), since = lines('var/j205-tools/since-j204.txt');
const r = { parents, bridge, ladder, bridgeFiles: bridge.length, ladderOther: ladder.filter((x) => x !== 'tools/ai-ladder/players.json').length,
  players: ladder.includes('tools/ai-ladder/players.json') ? 1 : 0, sinceJ204: since, sameCode: since.length > 0 && since.every((x) => x === 'tools/ai-ladder/players.json') ? 1 : 0 };
r.ok = r.parents === 2 && r.bridgeFiles === 0 && r.ladderOther === 0 && r.players === 1 && r.sameCode === 1 ? 1 : 0;
fs.writeFileSync('var/j205-tools/search-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J205EOF
```
```bash
cat > var/j205-tools/verdict.mjs <<'J205EOF'
// J205's reading, pre-registered 2026-11-10 before any rated game of either match (the job's rule: line; D530 point 5:
// D527's table for both arms, D528's SIGNAL for the deciding arm against J204 (b)'s baseline line, the SIGNAL
// INCONCLUSIVE count re-read from J204's match lines, the loop's count; D398's fixed match).
// usage: node verdict.mjs <match-a.json> <match-b.json> <rollouts-a.json> <J204a.json> <J204b.json> <J202b.json> <J204-seeds-b.json> <seeds-a.json> <seeds-b.json> <out.json>
//        node verdict.mjs --prior <J204a.json> <J204b.json> <J202b.json> <J204-seeds-b.json> <out.json>
//        node verdict.mjs --selftest <scratch dir>
// EVERY THRESHOLD IS COMPARED IN INTEGERS: Elo values in tenths (Math.round(x * 10); a match line carries Elo to 0.1),
//   the score's lower end in ten-thousandths (it carries 4 places), so -63.1 - (-78.1) = 14.999999999999993 reads as the
//   +15.0 it is. hw stays a real number (the root of a sum of exact half-tenths squared): exact when it is a whole number.
// THE ARMS (D530 point 2): search-v2-rrandom4-lcb-m60 (d6d75fdefd25) and -lcb-m40 (98eea870967e), each config A against
//   search-v1-anytime (search-v2, cdd55e02a89c), 1,200 games, 600 mirrored pairs, the confirm set, no stopping rule. Both
//   are registered arms, each read under D527's table.
// WHICH ARM DECIDES (D528 point 8, read from the match lines, not typed): v6Margin = 40 when J204 (a)'s Elo point
//   (search-v2-rrandom4-m60, 216e66d89fe3) minus J202 (b)'s (search-v2-rrandom4-m40, 968c9003c616) is below 0, else 60,
//   both lines complete; the deciding arm (match a) is the lcb arm at v6Margin, the other margin (match b) the other.
//   What is the deciding arm's alone: SIGNAL, and the rule random-v7 inherits. No v6Margin, no reading.
// COMPLETE (each line): the two players in that order at their hashes, complete: true, all 1,200 games, errors +
//   timeouts <= 60 (one in 20), lo, elo, eloLo and eloHi numbers.
// EACH ARM, only when complete, read once by the first row that holds (D527's table, D530 point 5):
//   SHOWN lo > 0.5 and elo >= 15; INCONCLUSIVE eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable eloHi < 15,
//   eloLo < 0 < eloHi, eloLo > -15; NOT SHOWN, no weaker eloHi < 15, eloLo >= 0 (case 2); NOT SHOWN, loses badly
//   eloHi < -15; NOT SHOWN, worse, not badly the rest (too wide, case 3). candidate = SHOWN, INCONCLUSIVE,
//   indistinguishable or no weaker; diagnose = worse, not badly or loses badly.
// SAME DEALS: J204 (b) (policy-outlet, e350d94649a4, against search-v2) and the deciding arm each played exactly 150
//   blocks, 114,900,000 to 114,900,149, and the block reader found every game of each line.
// SIGNAL (D528's rule, J204 (b) the baseline), on the deciding arm only, only when it and J204 (b) are complete and on
//   the same deals: diff = a.elo - b.elo; hw = sqrt(((a.eloHi - a.eloLo)/2)^2 + ((b.eloHi - b.eloLo)/2)^2):
//   SIGNAL SHOWN diff >= 15 and diff - hw > 0; SIGNAL AGAINST diff <= -15 and diff + hw < 0;
//   NO SIGNAL diff - hw <= 0 <= diff + hw and -15 < diff < 15; SIGNAL INCONCLUSIVE anything else.
// THE COUNT (SUCCESSIVE, D528 point 6): J204's SIGNAL recomputed from its two match lines by D528's rule (no block
//   condition: D528's own) gives J204's count (0|1); this night's is that + 1 on SIGNAL INCONCLUSIVE, 0 on any other
//   SIGNAL reading, J204's unchanged when SIGNAL is unread; 2 closes the track. Unread when J204's lines are not both
//   complete.
// THE LOOP (D530 point 6, D527 point 7): this iteration loses badly when both arms are complete and both lose badly;
//   loopStops = it does and J204 (a) lost badly (its line, eloHi < -15).
// THE NIGHT: closes = NO SIGNAL or AGAINST or the count at 2 or loopStops; a candidate is either arm's; trackCloses =
//   closes and no candidate (a closing decision owed); closingWaits = closes and a candidate (its 4,800-game
//   confirmation first); keepsOpen = SIGNAL read and nothing closes; confirmA / confirmB = that arm is a candidate (each
//   its own 4,800-game job); iterate = both arms complete and to diagnose, SIGNAL read and nothing closes: random-v7,
//   rollout=random4-them at the deciding arm's rule (search-v2-rrandom4them-lcb-m<v6Margin>, D530 point 7). repost
//   names an incomplete arm. SIGNAL unread on other deals (replayBaseline): the next job replays what puts the arm and
//   the baseline on the same blocks (D530 point 5), nothing else follows.
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

export function night(ma, mb, roa, ja, jb, pb, sb204, sa, sb) {
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
  let ok = 0;
  cases.forEach(([what, ms, pred], i) => {
    const files = ms.map((x, j) => {
      const f = path.join(scratch, `case-${i}-${j}.json`);
      if (x !== null) fs.writeFileSync(f, JSON.stringify(x));
      return f;
    });
    const r = night(...files.map(read));
    const pass = pred(r) && sane(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading.slice(0, 3).join(' | ')}`);
    ok += pass ? 1 : 0;
  });
  return { selftest: 1, cases: cases.length, passed: ok, ok: ok === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv[0] === '--prior' && argv.length === 6) {
  const p = prior(read(argv[1]), read(argv[2]), read(argv[3]), read(argv[4]));
  const r = { read: p.read, v6Margin: p.v6Margin, marginStep: p.marginStep, deciding: p.v6Margin === null ? null : ARMS[p.v6Margin][0],
    count: p.count, signal: { read: p.signal.read, reading: p.signal.reading, signalShown: p.signal.signalShown, signalAgainst: p.signal.signalAgainst, noSignal: p.signal.noSignal, signalInconclusive: p.signal.signalInconclusive, diff: p.signal.diff, hw: p.signal.hw, lo: p.signal.lo, hi: p.signal.hi },
    aReading: p.aReading, aCandidate: p.aCandidate, aDiagnose: p.aDiagnose, losesBadly: p.losesBadly, baselineDeals: p.baselineDeals,
    a: { complete: p.a.complete, elo: p.a.elo, eloLo: p.a.eloLo, eloHi: p.a.eloHi }, b: { complete: p.b.complete, elo: p.b.elo, eloLo: p.b.eloLo, eloHi: p.b.eloHi },
    j202b: { complete: p.j202b.complete, elo: p.j202b.elo }, blocks: p.baselineBlocks };
  fs.mkdirSync(path.dirname(argv[5]), { recursive: true });
  fs.writeFileSync(argv[5], JSON.stringify(r) + '\n');
  console.log(JSON.stringify(r));
} else if (argv.length === 10) {
  const r = night(...argv.slice(0, 9).map(read));
  fs.mkdirSync(path.dirname(argv[9]), { recursive: true });
  fs.writeFileSync(argv[9], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match-a> <match-b> <rollouts-a> <J204a> <J204b> <J202b> <J204-seeds-b> <seeds-a> <seeds-b> <out.json> | --prior <J204a> <J204b> <J202b> <J204-seeds-b> <out.json> | --selftest <dir>');
  process.exit(2);
}
J205EOF
cat > var/j205-tools/rollouts.cjs <<'J205EOF'
// J205: J204's reader, plus each side's lcb verdicts (D350's `search.lcb.overrode`, `held`, `none`: a decision's best cleared the
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
J205EOF
cat > var/j205-tools/worst.cjs <<'J205EOF'
// J205 (J204's and J202's, unchanged): the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 and D527 continue it). A batch line has no life total, so the
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
J205EOF
cat > var/j205-tools/seeds.cjs <<'J205EOF'
// J205 (J204's and J202's, unchanged): which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
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
J205EOF
rm -rf var/j205-tools/selftest
node var/j205-tools/verdict.mjs --selftest var/j205-tools/selftest > var/j205-tools/selftest.json
cat var/j205-tools/selftest.json
# J204's and J202 (b)'s final lines on this host: v6Margin, the deciding arm, J204's SIGNAL count, whether random-v5 lost
# badly, and J204 (b)'s blocks; then the two arms in the order the night plays them
node var/j205-tools/verdict.mjs --prior var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202b.json var/j204/seeds-b.json var/j205-tools/j204.json
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("var/j205-tools/j204.json","utf8"));const A={60:"search-v2-rrandom4-lcb-m60",40:"search-v2-rrandom4-lcb-m40"};if(p.v6Margin===60||p.v6Margin===40)fs.writeFileSync("var/j205-tools/arms.txt",A[p.v6Margin]+"\n"+A[p.v6Margin===60?40:60]+"\n");else{try{fs.unlinkSync("var/j205-tools/arms.txt")}catch{}}'
cat var/j205-tools/arms.txt 2>/dev/null || echo 'no v6Margin on this host: no arms, the night cannot start'
# the rollout reader and the worst-games reader on a synthetic batch folder: three games; the arm (A) wins one, loses
# two, with lcb verdicts and priority overrides by direction on its side; search-v2 (B) carries no search.rr.* and no
# search.lcb.* key, and its outlet policy acted in two games
rm -rf var/j205-tools/ro-selftest
mkdir -p var/j205-tools/ro-selftest/batches/run-s
C='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=60,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1'
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"',rollout=random4","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.p.changed.fromPass":2,"search.lcb.overrode":2,"search.lcb.none":8,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":320,"search.rr.v3.goodBlock":8,"search.rr.v4.goodBlockLethal":4}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10,"search.p.changed":1,"search.p.changed.toPass":1,"policy.LETHAL":2}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"',rollout=random4","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.lcb.held":3,"search.lcb.none":7,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":160,"search.rr.failures":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10,"search.b.changed":2}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"',rollout=random4","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.b.considered":10,"search.b.changed":1,"search.lcb.overrode":1,"search.lcb.none":9,"search.rr.rollouts":160,"search.rr.v2.castSomething":16,"search.rr.v4.goodBlockRefused":4}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10,"policy.COMBAT":1}}}' \
  > var/j205-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rrandom4-lcb-m60","b":"search-v1-anytime"}' > var/j205-tools/ro-selftest/match.json
node var/j205-tools/rollouts.cjs var/j205-tools/ro-selftest var/j205-tools/ro-selftest/match.json var/j205-tools/ro-selftest/out.json
node var/j205-tools/worst.cjs var/j205-tools/ro-selftest var/j205-tools/ro-selftest/match.json random4 var/j205-tools/ro-selftest/worst.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j205-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j205-tools/ro-selftest/worst.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.ratio===1.2&&r.aRrRollouts===480&&r.bRrRollouts===0&&r.aPerRollout.v2_ownStack===1&&r.aRrFailures===1&&r.aV3Fires===8&&r.aV4Fires===8&&r.aLcb.overrode===3&&r.aLcb.held===3&&r.aLcb.none===24&&r.aLcbHeldShare===0.5&&r.bLcb.overrode+r.bLcb.held+r.bLcb.none===0&&r.bLcbHeldShare===null&&r.aChangedShare.p===0.1111&&r.aChangedShare.b===0.1&&r.aChangedShare.a===0&&r.aPriorityShare.fromPass===0.1111&&r.aPriorityShare.toPass===0&&r.bPriorityShare.toPass===0.05&&r.bChangedShare.b===0.2&&r.bPolicy===3&&r.bPolicyGames===2&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w.longest[0].seed===11&&w.quickest[0].seed===13?1:0;fs.writeFileSync("var/j205-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j205-tools/seeds-selftest
mkdir -p var/j205-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j205-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j205-tools/seeds-selftest/match.json
node var/j205-tools/seeds.cjs var/j205-tools/seeds-selftest var/j205-tools/seeds-selftest/match.json var/j205-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j205-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j205-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of each arm (one batch of one deck pair, one worker, the deciding arm first), in the pilot's own ladder folder
# and seed range (the same deal for both); each side's rollouts, search.rr.*, search.lcb.* and policy.* counters from
# the batch; the worst-games reader on the deciding arm's; and whether each pilot match is the arm arms.txt names
test -s var/j205-tools/arms.txt
i=0
for p in $(cat var/j205-tools/arms.txt); do
  if [ "$i" -eq 0 ]; then k=a; else k=b; fi
  i=$((i + 1))
  ./tools/ai-ladder.sh match "$p" search-v1-anytime --games 4 --batch-pairs 1 --host j205-pilot --purpose pilot --dir var/ai-ladder-pilot/J205 --experiments var/ai-ladder-pilot/J205/experiments.jsonl --out var/ai-ladder-pilot/J205/match-$k.json --jobs 1
  node var/j205-tools/rollouts.cjs var/ai-ladder-pilot/J205 var/ai-ladder-pilot/J205/match-$k.json var/j205-tools/rollouts-pilot-$k.json
done
node var/j205-tools/worst.cjs var/ai-ladder-pilot/J205 var/ai-ladder-pilot/J205/match-a.json random4 var/j205-tools/worst-pilot-a.json
node -e 'const fs=require("fs");const rd=(f)=>{try{return JSON.parse(fs.readFileSync(f,"utf8"))}catch{return {}}};const A=fs.readFileSync("var/j205-tools/arms.txt","utf8").split("\n").filter(Boolean);const H={"search-v2-rrandom4-lcb-m60":"d6d75fdefd25","search-v2-rrandom4-lcb-m40":"98eea870967e"};const a=rd("var/ai-ladder-pilot/J205/match-a.json"),b=rd("var/ai-ladder-pilot/J205/match-b.json");const ok=A.length===2&&a.a===A[0]&&a.ah===H[A[0]]&&b.a===A[1]&&b.ah===H[A[1]]&&a.b==="search-v1-anytime"&&b.b==="search-v1-anytime"?1:0;fs.writeFileSync("var/j205-tools/pilot-arms.json",JSON.stringify({ok,arms:A,a:a.a??null,b:b.a??null})+"\n");console.log(JSON.stringify({ok,arms:A}))'
```
metrics: merged = sh: cat var/j205-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j205-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j205-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"bridgeFiles":-1,"ladderOther":-1,"players":0,"sameCode":0}'
metrics: st = sh: cat var/j205-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pj = sh: cat var/j205-tools/j204.json 2>/dev/null || echo '{"read":0,"v6Margin":null,"baselineDeals":0}'
metrics: rst = sh: cat var/j205-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j205-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: parm = sh: cat var/j205-tools/pilot-arms.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J205/match-a.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmb = sh: cat var/ai-ladder-pilot/J205/match-b.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pra = sh: cat var/j205-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0}'
metrics: prb = sh: cat var/j205-tools/rollouts-pilot-b.json 2>/dev/null || echo '{"games":0}'
metrics: pwa = sh: cat var/j205-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: pl.ok == 1
check: pl.lcb_only_rule == 1
check: pl.baseline_is_seat == 1
check: pl.hashesAsD530 == 1
check: sd.parents == 2
check: sd.bridgeFiles == 0
check: sd.ladderOther == 0
check: sd.players == 1
check: sd.sameCode == 1
check: st.ok == 1
check: st.cases == 55
check: pj.read == 1
check: pj.baselineDeals == 1
check: pj.v6Margin == 60 or pj.v6Margin == 40
check: pj.signal.signalShown + pj.signal.signalInconclusive == 1
check: pj.aDiagnose == 1
check: rst.ok == 1
check: sst.ok == 1
check: parm.ok == 1
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
check: pmb.complete == true
check: pmb.played == 4
check: pmb.errors + pmb.timeouts <= 1
check: pmb.aSearch.searched >= 10
check: prb.games == 4
check: prb.aDecisions == pmb.aSearch.searched
check: prb.aRrRollouts > 0
check: prb.bRrRollouts == 0
check: prb.aLcb.overrode + prb.aLcb.held + prb.aLcb.none > 0
check: prb.bLcb.overrode + prb.bLcb.held + prb.bLcb.none == 0
check: pmb.aSearch.msPerDecision < 1500

The pilot asks only whether anything is broken, and whether the night can be read as D530 registered it:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- the six players resolve on this PC: `pl.lcb_only_rule` says each lcb arm's ai-bench config is its margin arm's (J204
  (a)'s at 60, J202 (b)'s at 40) with `override=lcb,z=1` after `seed=0` and nothing else, and the two differ in the
  margin alone; `pl.baseline_is_seat` that policy-outlet is still search-v2's seat with the search off; and
  `pl.hashesAsD530` that the hashes are D530's (`d6d75fdefd25`, `98eea870967e`) and the others unchanged
  (`216e66d89fe3`, `968c9003c616`, `e350d94649a4`, `cdd55e02a89c`);
- `sd`: the pin has two parents (it is a merge), it brought no file under `bridge/src` and under `tools/ai-ladder` and
  `tools/ai-bench` only `tools/ai-ladder/players.json`; and `sd.sameCode`: against J204's pin 137b2bf6, nothing a ladder
  match runs but `players.json` differs (`bridge/src`, `tools/ai-bench` (the set and its decks), `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`, `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge home), `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path)), so search-v2's code, the bench's deal
  function, the confirm set, its decks and the Forge homes are the ones J204 (b) played (D530's Context, condition 1). If it fails, the
  job does not run as drafted: the baseline is replayed (D530's Context);
- the verdict script reads fifty-five synthetic sets of files as D530's rule says: which arm decides from J204 (a) and
  J202 (b) (60 at a tie, 40 0.1 under, none without either line or at another hash), a wrong arm in (a)'s file read as
  no reading, D527's table at and beside every bar, SIGNAL at its bars against J204 (b), values that are not float-exact
  (-63.1 against -78.1 read as +15.0, with hw above and below 15, and -93.1 against -78.1 as -15.0; table bounds and the
  v6Margin tie reached by float arithmetic), SIGNAL unread when either line's blocks moved, miss a game or are missing
  (and a replay then owed), the count of successive readings re-read from J204's lines (J204 INCONCLUSIVE and this
  night INCONCLUSIVE closing the track; this night SHOWN resetting it to 0), the loop stopping only when both arms and
  J204 (a) lose badly, a candidate from either arm getting its confirmation and holding a closing, an incomplete other
  margin reposted and holding random-v7, random-v7 named at v6Margin; exactly one reading of each kind for each arm when
  complete, the self-play path never opened and the live seat never changed;
- `pj`: J204's two final lines and J202 (b)'s are on this host and complete, J204 (b) played exactly blocks
  114,900,000-114,900,149 with every game (condition 2's half that is already played), v6Margin is 60 or 40, and J204
  is a night that iterates: its SIGNAL SHOWN or INCONCLUSIVE and its arm to diagnose (`pj.aDiagnose`), so a J205 posted
  after a J204 that closed the track or found a candidate fails here;
  `pj.count` (J204's own SIGNAL INCONCLUSIVE, 0 or 1), `pj.signal` and `pj.losesBadly` are recorded, not checked;
- the readers read a synthetic batch of three games as written (`rst.ok`: the lcb verdicts, held as a share, the
  changed shares by kind and the priority overrides by direction on each side, beside J204's fields), and the block
  reader a synthetic results log (`sst.ok`);
- `parm.ok`: the pilot played the arms in `arms.txt`'s order at D530's hashes, the deciding arm first;
- in 4 games of each arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **the arm's random rollouts are counted and its guardrails fired**, **the arm decided on the lcb rule and
  search-v2 did not** (`search.lcb.*` on the arm's side only), search-v2's side carries no `search.rr.*`, every line's
  config A ends in `,rollout=random4`; the searching sides stay under the 1.5 s budget on average.

Read, not checked: `sd.sinceJ204` (should be `players.json` alone), `pj.count`, `pj.signal`, `pj.losesBadly`; the arm's
rollouts a decision against search-v2's (`pra.ratio`; D530's pilot, under load, x1.34 and x1.42), each guardrail per
random rollout, `pra.aLcb` and `pra.aLcbHeldShare` (D530's pilot: 8 overrode, 5 held of 86 and 88), the priority
directions on both sides.

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J205a.json
```bash
# (a) the deciding arm: the lcb arm at J204's v6Margin (arms.txt's first line, from J204's and J202's match lines), against search-v2, 1,200 games
test -f var/j205-tools/verdict.mjs
A=$(sed -n 1p var/j205-tools/arms.txt)
test -n "$A"
mkdir -p var/j205
echo "J205 (a): $A (the deciding arm) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match "$A" search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J205a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J205b.json
```bash
# (b) the other margin: the other lcb arm (arms.txt's second line), against search-v2, 1,200 games; D527's table, no SIGNAL
B=$(sed -n 2p var/j205-tools/arms.txt)
test -n "$B"
echo "J205 (b): $B (the other margin) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match "$B" search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J205b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j205/verdict.json var/j205/report.md var/j205/rollouts-a.json var/j205/rollouts-b.json var/j205/seeds-a.json var/j205/seeds-b.json var/j205/worst-a.json var/j205/rollouts-j204a.json var/j205/rollouts-j202b.json
```bash
# the pre-registered readings (D527's table for the deciding arm, SIGNAL against J204 (b), the count re-read from J204's
# lines, the loop's count); each match's rollouts, counters, deal blocks and the deciding arm's worst-lost games (read,
# not gated); report.md (numbers only; the PC session writes the summary beside it)
mkdir -p var/j205
for k in a b; do
  node var/j205-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J205$k.json var/j205/rollouts-$k.json
  node var/j205-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J205$k.json var/j205/seeds-$k.json
done
node var/j205-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J205a.json random4 var/j205/worst-a.json
node var/j205-tools/verdict.mjs var/ai-ladder/match-J205a.json var/ai-ladder/match-J205b.json var/j205/rollouts-a.json var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202b.json var/j204/seeds-b.json var/j205/seeds-a.json var/j205/seeds-b.json var/j205/verdict.json
# the same reader over J204 (a)'s and J202 (b)'s batches, for the margin arms' lcb-free priority directions beside the night's
node var/j205-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J204a.json var/j205/rollouts-j204a.json
node var/j205-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J202b.json var/j205/rollouts-j202b.json
node - <<'J205EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const K = ['a', 'b'];
const M = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J205${k}.json`)]));
const RO = Object.fromEntries(K.map((k) => [k, read(`var/j205/rollouts-${k}.json`)]));
const BS = Object.fromEntries(K.map((k) => [k, read(`var/j205/seeds-${k}.json`)]));
const B4 = read('var/j204/seeds-b.json');
const W = read('var/j205/worst-a.json');
const R4A = read('var/j205/rollouts-j204a.json'), R2B = read('var/j205/rollouts-j202b.json');
const v = read('var/j205/verdict.json');
const sg = v.signal || {}, sb = v.signalB || {}, j = v.j204 || {};
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => { const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || ''); return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null; };
const hours = (m) => { const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const L = [`# J205: random-v6, D350's override=lcb on random4 rollouts; the deciding arm ${v.deciding ?? '-'} (v6Margin ${v.v6Margin ?? '-'}), the other margin ${v.other ?? '-'}, each against search-v1-anytime (D530)`, ''];
L.push(`**Which arm decides (D528 point 8, from the match lines):** J204 (a) minus J202 (b) ${v.marginStep ?? '-'}, so v6Margin ${v.v6Margin ?? '-'}: ${v.deciding ?? 'no deciding arm'}.`, '');
L.push(`**Both arms under D527's table (D530 point 5):** ${(v.reading || [])[1] ?? 'no reading'}; ${(v.reading || [])[3] ?? 'no reading'}.`, '');
L.push(`**SIGNAL against J204 (b)'s baseline on the same deals:** ${sg.text ?? 'no reading'}${typeof sg.share === 'number' ? `; the share of search-v2's own gain over the seat under it that the random values keep: ${pct(sg.share)} (information)` : ''}. Same deals: J204 (b) ${j.baselineDeals ?? 0} (blocks ${B4.min ?? '-'} to ${B4.max ?? '-'}, ${B4.blocks ?? '-'} blocks, ${B4.games ?? '-'} games), (a) ${(v.a || {}).sameDeals ?? 0} (blocks ${BS.a.min ?? '-'} to ${BS.a.max ?? '-'}, ${BS.a.blocks ?? '-'}, ${BS.a.games ?? '-'} games).`, '');
L.push(`**The count and the loop:** J204's own SIGNAL, recomputed from its lines: ${(j.signal || {}).reading ?? '-'} (${(j.signal || {}).diff ?? '-'} [${(j.signal || {}).lo ?? '-'}, ${(j.signal || {}).hi ?? '-'}]); successive SIGNAL INCONCLUSIVE count ${v.signalInconclusiveCount ?? 'unread'} (two close the track: ${v.countCloses ?? 0}); random-v5 lost badly ${j.losesBadly ?? '-'}, this iteration loses badly ${v.iterationLosesBadly ?? 0} (both arms: ${(v.a || {}).losesBadly ?? 0}, ${(v.b || {}).losesBadly ?? 0}), the loop stops ${v.loopStops ?? 0}.`, '');
L.push(`**What the night decides:** ${(v.reading || []).slice(6).join('; ') || '-'}.`, '');
L.push(`**Beside the reading (information, deciding nothing):** the rule's own effect, the deciding arm minus its margin arm on the same deals (${v.v6Margin === 40 ? 'J202 (b)' : 'J204 (a)'}): ${v.ruleEffect ?? '-'} Elo on the point (about +-19); the other margin minus the deciding arm: ${v.bMinusA ?? '-'}; the other margin against the baseline: ${sb.read ? `${sb.diff} [${sb.lo}, ${sb.hi}] (${sb.reading})` : 'unread'}.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k], r = RO[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${r.aRolloutsPerDecision ?? '-'} | ${r.bRolloutsPerDecision ?? '-'} | ${r.ratio ?? '-'} | ${r.aPlayMsPerRollout ?? '-'} / ${r.bPlayMsPerRollout ?? '-'} | ${r.aCopyMsPerRollout ?? '-'} / ${r.bCopyMsPerRollout ?? '-'} | ${hours(m) ?? '-'} |`);
}
L.push('');
for (const k of K) {
  const m = M[k], r = RO[k], b = BS[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Deal blocks ${b.blocks ?? '-'}, ${b.min ?? '-'} to ${b.max ?? '-'}, ${b.games ?? '-'} games. Rounds per searched decision ${r.aRoundsPerDecision ?? '-'} / ${r.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${r.aShort ?? '-'} = ${pct(r.aShortShare, 2)} / ${r.bShort ?? '-'} = ${pct(r.bShortShare, 2)}; rollout errors ${r.aRolloutErrors ?? '-'} / ${r.bRolloutErrors ?? '-'}, step caps ${r.aStepCaps ?? '-'} / ${r.bStepCaps ?? '-'}; the rollout reader saw ${r.games ?? '-'} games and ${r.aDecisions ?? '-'} / ${r.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}). Random rollouts ${r.aRrRollouts ?? '-'} of config A's ${r.aRollouts ?? '-'}; search-v2's side ${r.bRrRollouts ?? '-'}; random-seat failures ${r.aRrFailures ?? '-'}. The lcb verdicts on the arm's side: overrode ${(r.aLcb || {}).overrode ?? '-'}, held ${(r.aLcb || {}).held ?? '-'} (the margin rule would have overridden; ${pct(r.aLcbHeldShare)} of overrode plus held), none ${(r.aLcb || {}).none ?? '-'}; search-v2's side ${JSON.stringify(r.bLcb || {})}.`);
}
const dir = (r, s) => (r && r[`${s}PriorityShare`] ? `${pct(r[`${s}PriorityShare`].fromPass, 2)} / ${pct(r[`${s}PriorityShare`].toOther, 2)} / ${pct(r[`${s}PriorityShare`].toPass, 2)}` : '-');
const kd = (r, s) => (r && r[`${s}ChangedShare`] ? `${pct(r[`${s}ChangedShare`].p)} / ${pct(r[`${s}ChangedShare`].a)} / ${pct(r[`${s}ChangedShare`].b)}` : '-');
L.push('', '| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |', '|---|---|---|');
for (const [label, r, s] of [[`(a) ${M.a.a}`, RO.a, 'a'], ['(a) search-v2', RO.a, 'b'], [`(b) ${M.b.a}`, RO.b, 'a'], ['(b) search-v2', RO.b, 'b'], ['J204 (a) search-v2-rrandom4-m60 (margin rule)', R4A, 'a'], ['J204 (a) search-v2', R4A, 'b'], ['J202 (b) search-v2-rrandom4-m40 (margin rule)', R2B, 'a'], ['J202 (b) search-v2', R2B, 'b']]) {
  L.push(`| ${label} | ${kd(r, s)} | ${dir(r, s)} |`);
}
L.push('', 'D530 point 8: J202 (b), margin 40, changed Forge at priority from a pass 16.4%, to another play 10.5%, to a pass 4.82%, attack 14.3%, block 18.0%; search-v2 8.15%, 6.27%, 4.65%, 14.8%, 19.5%. random-v7 (rollout=random4-them) is expected (not registered) to bring the from-pass share toward search-v2\'s.');
const names = Object.keys(RO.a.aPerRollout || {}).sort((x, y) => ((x.startsWith('v') ? 0 : 1) - (y.startsWith('v') ? 0 : 1)) || x.localeCompare(y));
L.push('', '| search.rr.<name> | (a) fires | (a) per random rollout | (a) per game |', '|---|---|---|---|');
for (const n of names) {
  const raw = n.replace(/_/g, '.');
  L.push(`| ${raw} | ${(RO.a.aRr || {})[raw] ?? 0} | ${(RO.a.aPerRollout || {})[n] ?? '-'} | ${(RO.a.aPerGame || {})[n] ?? '-'} |`);
}
L.push(`| rollouts (the denominator) | ${RO.a.aRrRollouts ?? '-'} | 1 | ${RO.a.games ? Math.round((RO.a.aRrRollouts / RO.a.games) * 100) / 100 : '-'} |`);
L.push('', 'Under rollout=random4 the fires of both random seats are summed. J202 (b), the same rollouts at margin 40, per random rollout: v2.ownStack 2.4546, v2.targetSide 0.5908, v2.castSomething 0.2316, v3.goodBlock 0.0231, v4.goodBlockLethal 0.0025, v4.goodBlockRefused 0.0294, v2.lethalBlock 0.014, v2.chumpBlock 0.0541.');
L.push('', '| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k];
  for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| (${k}) | ${who} | no search | | | | | | | | | |`); continue; }
    const kd2 = t.byKind || {};
    const ch = (x) => (kd2[x] ? `${kd2[x].changed}/${kd2[x].searched} (${pct(kd2[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    const ms = t.msMean || {};
    L.push(`| (${k}) | ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
  }
}
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, x]) => `v2.${n} ${x}`), ...Object.entries(g.v3PerRollout || {}).map(([n, x]) => `v3.${n} ${x}`), ...Object.entries(g.v4PerRollout || {}).map(([n, x]) => `v4.${n} ${x}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
L.push('', `(a) ${W.a ?? '-'}: ${W.lost ?? '-'} lost, ${W.won ?? '-'} won, ${W.other ?? '-'} drawn, errored or timed out of ${W.games ?? '-'} batch lines; mean turns ${W.meanTurnsLost ?? '-'} lost, ${W.meanTurnsWon ?? '-'} won; lines whose config A is not the arm's: ${W.aCfgOther ?? '-'}. No life total is on a batch line: the iteration replays a game's seed with full recording for it (D523 point 10).`);
for (const [what, list] of [['the ten longest lost games (turns descending)', W.longest], ['the ten quickest lost games (turns ascending)', W.quickest]]) {
  L.push('', `(a) ${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const g of list || []) L.push(row(g));
}
const x = v.a || {}, m = M.a, n = (y) => typeof y === 'number';
L.push('', `Rule parts. The deciding arm, read by the first row that holds: complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(m.lo) && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(m.elo) && m.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(m.eloHi) && m.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(m.eloLo) && n(m.eloHi) && m.eloLo < 0 && m.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(m.eloLo) && m.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(m.eloHi) && m.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(m.eloHi) && m.eloHi < -15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0} (case 1 ${x.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${x.indistinguishable ?? 0}, no weaker (case 2) ${x.noWeaker ?? 0}, worse, not badly ${x.worseNotBadly ?? 0} (too wide ${x.tooWide ?? 0}, case 3 ${x.upperAtZero ?? 0}), loses badly ${x.losesBadly ?? 0}; candidate ${x.candidate ?? 0}, diagnose ${x.diagnose ?? 0}. The other margin: ${(v.b || {}).reading ?? 'no reading'} (candidate ${(v.b || {}).candidate ?? 0}, loses badly ${(v.b || {}).losesBadly ?? 0}); this iteration loses badly ${v.iterationLosesBadly ?? 0} (both arms). SIGNAL read ${sg.read ?? 0}: diff ${sg.diff ?? '-'}, hw ${sg.hw ?? '-'}, interval [${sg.lo ?? '-'}, ${sg.hi ?? '-'}]; SHOWN ${sg.signalShown ?? 0}, AGAINST ${sg.signalAgainst ?? 0}, NO SIGNAL ${sg.noSignal ?? 0}, INCONCLUSIVE ${sg.signalInconclusive ?? 0}. The night: closes ${v.closes ?? 0} (count ${v.countCloses ?? 0}, loop ${v.loopStops ?? 0}); the track closes ${v.trackCloses ?? 0} (a closing decision owed ${v.closing ?? 0}); the closing waits on a confirmation ${v.closingWaits ?? 0}; kept open ${v.keepsOpen ?? 0}; a 4,800-game confirmation owed (a) ${v.confirmA ?? 0}, (b) ${v.confirmB ?? 0}; iterate as random-v7 ${v.iterate ?? 0} (${v.v7 ?? 'none'}); a replay owed (other deals) ${v.replayBaseline ?? 0}; repost ${v.repost ?? 0} (${v.repostWhich ?? 'none'}); self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (both 0 on this night by the rule).`);
for (const [label, f] of [['J204 (a)', 'var/ai-ladder/match-J204a.json'], ['J204 (b)', 'var/ai-ladder/match-J204b.json'], ['J202 (b)', 'var/ai-ladder/match-J202b.json'], ['J202 (a)', 'var/ai-ladder/match-J202a.json']]) {
  const p = read(f);
  L.push('', `${label} on the same deals (information): ${p.a ?? '-'} vs ${p.b ?? '-'}, ${p.played ?? '-'} games, complete ${p.complete ?? '-'}, score ${p.score ?? '-'} [${p.lo ?? '-'}, ${p.hi ?? '-'}], Elo ${p.elo ?? '-'} [${p.eloLo ?? '-'}, ${p.eloHi ?? '-'}].`);
}
L.push('', 'Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6].');
fs.writeFileSync('var/j205/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J205EOF
```
check: cma.complete == true
check: cma.played == 1200
check: cma.errors + cma.timeouts <= 60
check: cmb.complete == true
check: cmb.played == 1200
check: cmb.errors + cmb.timeouts <= 60
check: bsa.blocks == 150
check: bsa.games == cma.played
check: bsb.blocks == 150
check: bsb.games == cmb.played
check: roa.aRrRollouts > 0
check: roa.bRrRollouts == 0
check: rob.aRrRollouts > 0
check: rob.bRrRollouts == 0
check: roa.aLcb.overrode + roa.aLcb.held + roa.aLcb.none > 0
check: roa.bLcb.overrode + roa.bLcb.held + roa.bLcb.none == 0
check: wa.aCfgOther == 0
check: v.written == 1
check: v.v6Margin == 60 or v.v6Margin == 40
check: v.v6Margin == 40 or not (c4a.elo < c2b.elo)
check: v.v6Margin == 60 or not (c4a.elo >= c2b.elo)
check: v.a.complete == 1
check: v.j204.read == 1
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
check: v.b.complete == 1
check: v.b.shown + v.b.inconclusive + v.b.indistinguishable + v.b.noWeaker + v.b.worseNotBadly + v.b.losesBadly == 1
check: v.b.shown == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.b.shown == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.b.inconclusive == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi >= 15 and not (cmb.lo > 0.5 and cmb.elo >= 15))
check: v.b.inconclusive == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi >= 15 and not (cmb.lo > 0.5 and cmb.elo >= 15))
check: v.b.indistinguishable == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and cmb.eloLo < 0 and cmb.eloHi > 0 and cmb.eloLo > -15)
check: v.b.indistinguishable == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and cmb.eloLo < 0 and cmb.eloHi > 0 and cmb.eloLo > -15)
check: v.b.noWeaker == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and cmb.eloLo >= 0)
check: v.b.noWeaker == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and cmb.eloLo >= 0)
check: v.b.losesBadly == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < -15)
check: v.b.losesBadly == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < -15)
check: v.b.tooWide == 0 or (v.b.worseNotBadly == 1 and cmb.eloLo <= -15 and cmb.eloHi > 0)
check: v.b.candidate == v.b.shown + v.b.inconclusive + v.b.indistinguishable + v.b.noWeaker
check: v.b.diagnose == v.b.worseNotBadly + v.b.losesBadly
check: v.a.sameDeals == 1 or not (bsa.blocks == 150 and bsa.min == 114900000 and bsa.max == 114900149 and bsa.games == cma.played and bs4.blocks == 150 and bs4.min == 114900000 and bs4.max == 114900149 and bs4.games == c4b.played and c4b.played == 1200)
check: v.signal.read == v.a.sameDeals
check: v.signal.read == 0 or v.signal.signalShown + v.signal.signalAgainst + v.signal.noSignal + v.signal.signalInconclusive == 1
check: v.signal.read == 0 or (v.signal.diff >= cma.elo - c4b.elo - 0.06 and v.signal.diff <= cma.elo - c4b.elo + 0.06)
check: v.signal.signalShown == 0 or (v.signal.diff >= 15 and v.signal.lo > -0.06)
check: v.signal.signalAgainst == 0 or (v.signal.diff <= -15 and v.signal.hi < 0.06)
check: v.signal.noSignal == 0 or (v.signal.diff > -15 and v.signal.diff < 15 and v.signal.lo <= 0.06 and v.signal.hi >= -0.06)
check: v.replayBaseline == 1 - v.a.sameDeals
check: v.signal.read == 0 or v.signal.signalInconclusive == 0 or v.signalInconclusiveCount == v.j204.count + 1
check: v.signal.read == 0 or v.signal.signalInconclusive == 1 or v.signalInconclusiveCount == 0
check: v.signal.read == 1 or v.signalInconclusiveCount == v.j204.count
check: v.countCloses == 1 or not (v.signalInconclusiveCount >= 2)
check: v.countCloses == 0 or v.signalInconclusiveCount >= 2
check: v.iterationLosesBadly == 1 or not (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.iterationLosesBadly == 0 or (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.loopStops == 1 or not (v.iterationLosesBadly == 1 and v.j204.losesBadly == 1)
check: v.loopStops == 0 or (v.iterationLosesBadly == 1 and v.j204.losesBadly == 1)
check: v.closes == 1 or not (v.signal.noSignal == 1 or v.signal.signalAgainst == 1 or v.countCloses == 1 or v.loopStops == 1)
check: v.closes == 0 or (v.signal.noSignal == 1 or v.signal.signalAgainst == 1 or v.countCloses == 1 or v.loopStops == 1)
check: v.candidate == 1 or not (v.a.candidate == 1 or v.b.candidate == 1)
check: v.candidate == 0 or (v.a.candidate == 1 or v.b.candidate == 1)
check: v.trackCloses == 1 or not (v.closes == 1 and v.candidate == 0)
check: v.trackCloses == 0 or (v.closes == 1 and v.candidate == 0)
check: v.closingWaits == 1 or not (v.closes == 1 and v.candidate == 1)
check: v.closingWaits == 0 or (v.closes == 1 and v.candidate == 1)
check: v.keepsOpen == 1 or not (v.signal.read == 1 and v.closes == 0)
check: v.keepsOpen == 0 or (v.signal.read == 1 and v.closes == 0)
check: v.closing == v.trackCloses
check: v.confirmA == v.a.candidate
check: v.confirmB == v.b.candidate
check: v.iterate == 1 or not (v.a.diagnose == 1 and v.b.diagnose == 1 and v.signal.read == 1 and v.closes == 0)
check: v.iterate == 0 or (v.a.diagnose == 1 and v.b.diagnose == 1 and v.signal.read == 1 and v.closes == 0)
check: v.principleInDoubt == v.iterationLosesBadly
check: v.repost == 0
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0

The first six checks say each match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next four say each match played 150 deal blocks and the block reader
found every game. The next seven say both arms' rollouts were random ones on the batch lines and search-v2's were not,
the deciding arm decided on the lcb rule and search-v2 did not, and every line's config A was the arm's. Then the
verdict ran, v6Margin was read from J204's and J202's lines and is the one D528 point 8 names (40 exactly when J204
(a)'s point is below J202 (b)'s), and the deciding arm and J204's lines are complete. Then fourteen for the deciding
arm and fifteen for the other margin: exactly one of the six readings, D527's table in the runner's own language, row
by row, each both ways, `tooWide` only where it belongs, and `candidate` and `diagnose` the readings' two groups. Then SIGNAL: it is read exactly when
the arm and the baseline are on the same deals (and when both seeds files show exactly blocks 114,900,000-114,900,149
with every game, it is), exactly one of its four readings, its `diff` the two match lines' points' difference, and
each of SHOWN, AGAINST and NO SIGNAL only where its bars hold (the interval's ends are reported to 0.1, so the checks
allow 0.06 at 0; the script decides on the unrounded values); a replay is owed exactly when it is not. Then the
count of successive readings (J204's re-read count plus one on this night's INCONCLUSIVE, 0 on any other reading,
J204's when SIGNAL is unread; closing at 2, both ways), this iteration losing badly exactly when both arms do, the loop
(both ways), what closes (both ways), a candidate from either arm (both ways), the track closing, waiting or kept open
(each both ways), the closing decision owed exactly when it closes, a confirmation exactly for each candidate arm,
random-v7 exactly when both arms are to diagnose, SIGNAL was read and nothing closes, the principle's cheap path in
doubt exactly when the iteration loses badly, no repost, and the self-play path closed and the live seat unchanged. Any reading passes them; a reading is not a
failure, and a closed track is not a failure either. Whether both arms start at block 114,900,000 is checked through
`v.a.sameDeals` for the deciding arm and reported for the other margin. The other margin's SIGNAL, the time per
decision, the rollouts, the guardrail and lcb counters, the changed answers, the fallbacks and the worst-lost games are
reported, not gated.

## Abort if
abort: j205_err >= 30 and j205_err > j205_games / 10

Engine trouble only: once 30 games of the two matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J205a.json
collect: var/ai-ladder/match-J205b.json
collect: var/j205/verdict.json
collect: var/j205/report.md
collect: var/j205/rollouts-a.json
collect: var/j205/rollouts-b.json
collect: var/j205/worst-a.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J199, J201, J202 and
J204:
- **which arm decided** (`v.v6Margin`, `v.deciding`) and why (J204 (a) minus J202 (b), `v.marginStep`);
- **the deciding arm's reading under D527's table**: SHOWN, INCONCLUSIVE, NOT SHOWN indistinguishable, NOT SHOWN worse
  not badly, or NOT SHOWN loses badly (and the three unreached cases by name if one occurred), with its score against
  search-v2 and its 95% interval, the same in Elo, and the pair and game counts; for a too-wide interval, say that it
  is "too wide to call" and read as worse, not badly;
- **the SIGNAL reading against J204 (b)** in D530's words: `diff`, `hw` and the interval, which of the four readings,
  and what it decides (NO SIGNAL worded as "no signal under override=lcb at margin <v6Margin> at +-15 on the point",
  never as equivalence), whether the deals were the same (`v.a.sameDeals`, `v.j204.baselineDeals`), and when they
  were not, that the next job replays what puts the arm and the baseline on the same blocks and nothing else follows;
- **the count** (`v.j204.count`, `v.signalInconclusiveCount`): J204's own SIGNAL as recomputed from its lines, this
  night's, and whether two in a row closed the track; **the loop** (`v.j204.losesBadly`, `v.iterationLosesBadly`: both arms, `v.loopStops`);
- **what the night decides, in D530's words:** when `v.trackCloses` is 1, that the random-rollout track closes (D523
  point 10's stop), which of the four ways (`v.signal`, `v.countCloses`, `v.loopStops`), that the owner is told, with
  the counters, which way it went, that a closing decision writes it from the track's closing draft with D530 point
  8's finding as the evidence a reopening starts from, and that the paused `-self` path stops with it; when
  `v.closingWaits` is 1, that the candidate's 4,800-game confirmation runs first and decides (holding, the track reached its
  goal and stays open; failing, it closes as on NO SIGNAL); when `v.iterate` is 1, that the agent iterates as
  random-v7 without asking the owner (`v.v7`: rollout=random4-them at the deciding arm's rule, D530 point 7; after it only the same stops
  close the track), naming what the counters and the worst-lost games say; for a candidate from either arm
  (`v.confirmA`, `v.confirmB`), that its 4,800-game confirmation is owed, as its own job, before anything; then, plainly, whatever the reading, that
  the live seat is unchanged and any change to it is a separate decision (a seat-queue row, D509);
- **the other margin** (b): its reading under the same table (a candidate there is confirmed too), its difference to
  the baseline and to the deciding arm, reported, not read as SIGNAL;
- **the rule's own effect** (`v.ruleEffect`: the deciding arm minus its margin arm on the same deals, about +-19) and
  **the lcb verdicts** (`roa.aLcb`, `roa.aLcbHeldShare`: how many of the margin rule's overrides lcb refused);
- **the changed answers by kind and by direction** on every side, beside J204 (a)'s and J202 (b)'s margin arms and
  search-v2's own (D530 point 8's table): whether lcb cut the from-pass excess or only the rest;
- **the compute each side spent:** ms per decision on both sides of both matches and their ratio, by kind; the arm's
  rollouts and rounds per searched decision against search-v2's, play and copy ms a rollout, the short decisions,
  rollout errors and step caps, budget fallbacks with their interval and other fallbacks;
- **the guardrails:** the deciding arm's `search.rr.*` counters per random rollout and per game, beside J202 (b)'s (the
  same rollouts: they should be alike);
- **the worst-lost games:** the deciding arm's ten longest and ten quickest lost games, with the mean turns of lost
  against won games; say that the batch line has no life total;
- **the code:** the pilot's `sd` (no file under `bridge/src`, only `players.json` under the ladder, and `sd.sinceJ204`
  `players.json` alone);
- **the run:** draws, errors and timeouts, the deal blocks of both matches (expected 114,900,000-114,900,149), each
  match's hours against its estimate (2.3-2.8 h each), the pressure events in STATUS (drops, raises, any stop and its
  retry, and which match they fell in), that it ran alone (D521), and whether the GPU queue or anything else outside
  the lab was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it; "NO SIGNAL" is the pre-registered reading for a difference within +-15 whose interval contains 0, not
a proof of none. If an arm stopped early (`complete: false`), say so, naming which (`v.repostWhich`): it gets no reading, SIGNAL has
none if it is the deciding arm, random-v7 waits, and what follows is a decision about reposting it, not a reading.

id: J207
title: Random rollouts, iteration 7 (random-v8, no new Java: rollout=random4-them on the margin rule): two fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule), each against search-v1-anytime (search-v2): (a) search-v2-rrandom4them-m40, J206's arm without override=lcb (the rollout's opponent random-v4, the searching seat's own continuation Forge's, the margin rule at 40), then (b) search-v2-rrandom4them, the same at search-v2's own margin of 20; each read from its own match under D527's table (its SHOWN row restated by D530 point 7); a candidate goes to a 4,800-game confirmation, both arms losing badly close the random-rollout track, otherwise random-v9 (a per-rollout mix, the track's last iteration) at the better arm's margin; alone on the machine
public_title: Random rollouts in the search, seventh try: the plain margin rule
public_est: ~5 h (two matches)
public_decides: Which margin suits a random opponent in the rollouts, or the track closes
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@429ccd9e87bd98399282708276a645ab0a17245f (the merge commit of D532's lane, pc/rollout-random-v8, on main, its first parent main at the merge (03d5464f, D529's merge, or a main equal to it under every path a match runs), pushed to origin/main before posting; the lane's tip: 8fa2523a37884480bf6a9100ed6c9d43620d1677. It carries: the ladder players search-v2-rrandom4them-m40 and search-v2-rrandom4them (tools/ai-ladder/players.json), D532's decision file, the PLAN entry and the registry test; nothing under bridge/src, tools/ai-bench or the ladder's code changes. Pinned so every game of both matches is one code version, D341; the pilot checks, by content, that the pin is that merge (two parents, its second the lane tip) and that its tree under every path a match runs (bridge/src, tools/ai-bench, tools/ai-ladder, tools/cubelab/lines.ts and rng.ts, tools/runner/control.ts, tools/ai-ladder.sh, tools/ai-bench.sh, tools/config.sh, forge-home/custom-cards, config.json) is the lane tip's, which differs there from its base 03d5464f in players.json alone and from J206's pin ecd9bb4e in D529's three bridge files (Atlas.java, LeakVerdict.java, DecisionSelfTest.java) and players.json, which D532's Context reads as leaving what a match runs unchanged)
decides: D532 point 4's pre-registered rule, each arm from its own match line alone, every threshold compared in integer tenths of Elo (and ten-thousandths of score) as the lines carry them. EACH ARM under D527's table against search-v1-anytime, its SHOWN row restated for a random4-them candidate: SHOWN (a 4,800-game confirmation under D519's readings, then Forge's opponent model leaves the rollout loop for this arm; Forge stays for the searching seat's own continuation), INCONCLUSIVE (a 4,800-game confirmation first), NOT SHOWN indistinguishable (a candidate, confirmed at 4,800 games), NOT SHOWN worse not badly or loses badly (to diagnose). WHAT FOLLOWS, only when both arms are complete, exactly one: a 4,800-game confirmation of a candidate arm, as its own job (the higher Elo point when both are candidates, (a) on a tie); the random-rollout track closes at once, with a closing decision, when both arms lose badly (the two-losing count going in is 0: J205 lost badly, J206 did not; D532 closes on both anyway, because random-v9 is built on the better arm and there would be none); otherwise random-v9 (D532 point 5: each candidate's rollouts alternate between search-v2's Forge rollout and a random4-them rollout, first Forge's) at the margin of the arm with the higher point, 40 for (a), 20 for (b), 40 on a tie, new Java under its own decision and one 1,200-game match, after which the track closes whatever it reads unless its arm is a candidate (D532 point 6). An incomplete arm gives no reading and is reposted alone, and nothing follows until both are read. SIGNAL is no longer a condition (SHOWN three times running): each arm minus J204 (b)'s policy-outlet is reported, never replayed or counted. Every comparison with an earlier job is information, labelled as across D529's merge. The self-play-from-random path waits for a reading confirmed at 4,800 games; any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on any reading. What is known: J206 on these deals, 1,200 games: search-v2-rrandom4them-lcb-m40 (the same rollouts, D350's override=lcb at margin 40) score 0.4667 [0.4502, 0.4831], Elo -23.2 [-34.7, -11.7], NOT SHOWN, worse, not badly, 0 errors, 0 timeouts; SIGNAL against J204 (b) +61.2 [42.1, 80.3] (+-19.1), SIGNAL SHOWN (the third: +60.0 at J204, +49.0 at J205); its priority overrides from a pass, to another play and to a pass 5.11%, 4.17%, 1.94% of priority decisions, attack 8.4%, block 11.6% changed, against search-v2's 7.96%, 6.36%, 4.80%, 14.7%, 16.8% on its other side; lcb overrode / held / none 3,034 / 1,669 / 23,615 (held 35.5% of what the margin rule would have overridden); 16.28 rollouts a decision against search-v2's 15.45; the arm minus J205 (a) (both seats random, lcb at 40) +12.2 on the point. J202 on these deals, both rollout seats random-v4, the margin rule: (a) search-v2-rrandom4 at 20 -39.5 [-53.9, -25.3] (from a pass 19.2%, attack 19.9%), (b) search-v2-rrandom4-m40 at 40 -20.9 [-34.1, -7.7] (from a pass 16.4%, attack 14.3%). Expected, not registered (D532 point 7): (a)'s overrides above J206's in every kind and near search-v2's, its from-pass share near search-v2's 7.96%; (b)'s above (a)'s, its attack overrides the question; both arms' rollouts a decision about J206's. D532's pilot (4 games each, one deal): (a) 1-3, (b) 2-2, 0 errors, random rollouts on the arm's side alone and no search.lcb.* on either side. Each reading's noise: an arm's own interval about +-13.5 Elo at 1,200 games; a difference between two arms about +-19. Information, not a prediction any check reads
rule: written 2026-11-10 before any rated game of either arm, word for word as D532 states it (its point 4; D532's bold dropped): "The pre-registered rule for J207 (written on 2026-11-10 before any rated game of either arm; the night's job quotes it word for word). Each arm, (a) `search-v2-rrandom4them-m40` and (b) `search-v2-rrandom4them`, is read once against `search-v1-anytime` from its own match line by the first row of D527's table that holds, the SHOWN row as D530 point 7 restated it for a `random4-them` candidate: SHOWN (lower end above 0.5 and point at least +15 Elo: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games), NOT SHOWN, worse, not badly (upper end below 0 and at least −15 Elo: to diagnose), NOT SHOWN, loses badly (upper end below −15 Elo: to diagnose) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player. A match is complete when its line names the arm and `search-v1-anytime` in that order at their config hashes, says `complete: true`, played all 1,200 games with engine errors plus timeouts at most 60, and carries the four numbers. Every threshold is compared on the numbers the match lines carry: Elo in integer tenths, the score's lower end in integer ten-thousandths. What follows is decided only when both arms are complete; an incomplete arm gives no reading and is reposted alone, and the reposted arm's job applies this rule to both lines (the repost is a job of its own in a ladder folder of its own, whose blocks start at 114,900,000, the incomplete line kept and never resumed; both arms incomplete are reposted in one job, (a) first; an arm incomplete a second time is diagnosed before any third post). Exactly one of three things follows. A confirmation: when either arm is a candidate (SHOWN, INCONCLUSIVE, indistinguishable or no weaker), a 4,800-game confirmation of that arm under D519's readings, posted as its own job — of the arm with the higher Elo point when both are, and of (a) when the points are equal. The track closes: when both arms lose badly, the random-rollout track closes at once, without random-v9, with a closing decision. The two-losing count going into J207 is 0 (J205's iteration lost badly and J206's did not, so D523's stop on two successive iterations that lose badly cannot fire on this night); D532 closes the track on both arms losing badly anyway, because random-v9 is the track's last iteration and is built on the better of these two arms, and with both losing badly there is none to build on. random-v9: otherwise (both arms to diagnose and not both losing badly), random-v9, point 5, at the margin of the arm with the higher Elo point, 40 for (a) and 20 for (b), 40 when the points are equal. A confirmation that does not hold sends the track to random-v9 the same way, at the margin this rule names from J207's two points; when both arms were candidates the other is not confirmed in its place (its point was the lower on the same deals, and one confirmation for the night is the guard against two looks at it). Reported beside, deciding nothing: point 3's comparisons; each arm minus J204 (b) with D528's `hw` and interval; each side's overrides of Forge by kind and by direction at priority (`fromPass`, `toOther`, `toPass`) beside J206's, J205 (a)'s and J202's; ms, rollouts and rounds a decision; every `search.rr.*` per random rollout; the deal blocks; each arm's ten longest and ten quickest lost games. The self-play-from-random path does not open and the live seat does not change on any reading of this night." How the night applies it (D532 points 2 to 4). TWO ARMS, each config A of its own fixed match (D398, no stopping rule) of 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt) against search-v1-anytime (cdd55e02a89c): (a) search-v2-rrandom4them-m40 (179ab0649521; J206's arm, search-v2-rrandom4them-lcb-m40, without override=lcb,z=1), var/ai-ladder/match-J207a.json, first; (b) search-v2-rrandom4them (d5381ade9e66; search-v2's own seat config with ,rollout=random4-them, margin 20), var/ai-ladder/match-J207b.json. Both matchups are new on this host, so each takes the host's match blocks 114,900,000-114,900,149. NUMBERS: every threshold is compared in integers, Elo in tenths (Math.round(x * 10)) and the score's lower end in ten-thousandths, as the match lines carry them; the higher point is compared in tenths, and equal tenths are a tie. COMPLETE: the line names the arm and search-v1-anytime in that order at their config hashes, says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers. EACH ARM is read on its own match alone, only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15; INCONCLUSIVE when not SHOWN and eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (tooWide and case 3 included). A candidate is SHOWN, INCONCLUSIVE, indistinguishable or no weaker; to diagnose is worse, not badly or loses badly. WHAT FOLLOWS, only when both arms are complete (bothComplete), exactly one (follows 1): confirm when either arm is a candidate (confirmA when (a) is and (b) is not, or both are and (a)'s point is at least (b)'s; confirmB otherwise when (b) is); trackCloses (and closing) when both arms lose badly (bothLoseBadly); v9 otherwise, v9Margin 40 (v9A) when (a)'s point is at least (b)'s, 20 (v9B) when (b)'s is higher. v9Margin is 0 when v9 is 0. keepsOpen is confirm plus v9. repostA and repostB are 1 for an arm not complete, repost when either is; then follows is 0 and nothing follows from the night. EVERY CHECKED VALUE IS A NUMBER: every flag is 0 or 1, v9Margin 40, 20 or 0, and no check compares with null or with a string. selfPlayOpens and liveSeatChanged are 0 in every reading of this night. Reported beside, deciding nothing, each labelled as across D529's merge (which leaves what a ladder match runs unchanged by D532's reading and by the compiled classes) and, for an arm whose blocks are not exactly 114,900,000-114,900,149 with every game (chainDeals 0), as across deals: each arm minus J206's arm (search-v2-rrandom4them-lcb-m40), (a) minus J202 (b) (search-v2-rrandom4-m40, both seats random at margin 40) and (b) minus J202 (a) (search-v2-rrandom4, both seats random at margin 20), each arm minus J205 (a) and minus J204 (a), (b) minus (a), each arm minus J204 (b)'s policy-outlet with D528's hw and interval (no reading, no replay, no count); each side's ms per decision (p + a + b, and by kind), rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps, every search.rr.* counter per random rollout and per game (the opponent's random seat alone), searched and changed decisions by kind and the priority overrides by direction (from a pass, to another play, to a pass) as shares beside J206's, J202 (a)'s and J202 (b)'s, budget fallbacks with their interval and other fallbacks, the deal blocks played, each arm's ten longest and ten quickest lost games with their counters. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~5 h at 7 workers (an estimate; range 4.5-6 h), 8 h at worst (the two matches' own stops). From this host at 7 workers, alone, on these same 600 deals: J206, search-v2-rrandom4them-lcb-m40 (the same rollouts) against search-v2 at 934 against 917 ms a decision, played its 1,200 games in 2.37 h; J205 (a) in 2.32 h and (b) in 2.51 h, J204 (a) in 2.39 h. The margin rule is read by the verdict alone, so each arm plays J206's rollouts and is guessed at ~2.3-2.8 h. Each match stops itself at --hours 4: 8 h in all, which with the pilot is under the 9 h timeout, so a slow (a) cannot let the timeout cut (b); a match that reaches its stop reports complete: false and gives no reading. Both run under the ladder's default 300 s per-game timeout (neither lifts maxRounds). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games of each arm on one worker)
resumable: no
timeout: 9h
clean: var/j207 var/ai-ladder-pilot/J207 var/ai-ladder/match-J207a.json var/ai-ladder/match-J207b.json
progress: metric j207_games games of 2400
metrics: j207_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4them-m40","search-v1-anytime"],["search-v2-rrandom4them","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j207_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4them-m40","search-v1-anytime"],["search-v2-rrandom4them","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J207a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J207b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: roa = sh: cat var/j207/rollouts-a.json 2>/dev/null || echo '{"games":0,"aRrRollouts":0,"bRrRollouts":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0}}'
metrics: rob = sh: cat var/j207/rollouts-b.json 2>/dev/null || echo '{"games":0,"aRrRollouts":0,"bRrRollouts":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0}}'
metrics: bsa = sh: cat var/j207/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0}'
metrics: bsb = sh: cat var/j207/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0}'
metrics: wa = sh: cat var/j207/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0,"aCfgOther":-1}'
metrics: wb = sh: cat var/j207/worst-b.json 2>/dev/null || echo '{"games":0,"lost":0,"aCfgOther":-1}'
metrics: caa = sh: cat var/j207/cfgs-a.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: cab = sh: cat var/j207/cfgs-b.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: v = sh: cat var/j207/verdict.json 2>/dev/null || echo '{"written":0,"bothComplete":0,"candidate":0,"confirm":0,"confirmA":0,"confirmB":0,"bothLoseBadly":0,"trackCloses":0,"closing":0,"v9":0,"v9Margin":0,"v9A":0,"v9B":0,"follows":0,"keepsOpen":0,"repost":0,"repostA":0,"repostB":0,"selfPlayOpens":0,"liveSeatChanged":0,"a":{"names":0,"complete":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"candidate":0,"diagnose":0,"tooWide":0,"upperAtZero":0,"inconclusiveAbove":0,"margin":0,"chainDeals":0},"b":{"names":0,"complete":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"candidate":0,"diagnose":0,"tooWide":0,"upperAtZero":0,"inconclusiveAbove":0,"margin":0,"chainDeals":0}}'
headline: cma.played, cma.score, cma.elo, cma.eloLo, cma.eloHi, cmb.played, cmb.score, cmb.elo, cmb.eloLo, cmb.eloHi, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, cmb.aSearch.msPerDecision, cmb.bSearch.msPerDecision, roa.aRolloutsPerDecision, rob.aRolloutsPerDecision, roa.ratio, rob.ratio, roa.aPriorityShare.fromPass, roa.bPriorityShare.fromPass, rob.aPriorityShare.fromPass, rob.bPriorityShare.fromPass, roa.aChangedShare.a, rob.aChangedShare.a, v.a.shown, v.a.inconclusive, v.a.indistinguishable, v.a.noWeaker, v.a.worseNotBadly, v.a.losesBadly, v.b.shown, v.b.inconclusive, v.b.indistinguishable, v.b.noWeaker, v.b.worseNotBadly, v.b.losesBadly, v.confirm, v.confirmA, v.confirmB, v.bothLoseBadly, v.trackCloses, v.v9, v.v9Margin, v.repost, v.info.aMinusJ206, v.info.bMinusJ206, v.info.bMinusA, v.info.aMinusJ204b.diff, v.info.bMinusJ204b.diff, v.a.chainDeals, v.b.chainDeals, wa.lost, wb.lost
**Why this job** (D532, the seventh iteration of D523's point 10 loop: J199 random-v2, J201 random-v3, J202 random-v4,
J204 random-v5, J205 random-v6, J206 random-v7, and now random-v8; the owner's principle, in his words as D523 quotes
them): "Yes, there are terribly useless situations that will arise from randomized moves, but you are the agent in the
loop who can recognize that, iterate to avoid it, so we waste less time on useless data." D523 took Forge's judgment
out of the search's rollouts and put guarded randomness in; D525 and D527 added and fixed guardrails; D528 found the
override margin the one lever that moved and asked whether the random values carry any signal beyond Forge's own
choice (J204: SIGNAL SHOWN); D530 tried the margin's noise-aware form, D350's lcb; D531 gave the searching seat its own
continuation back and kept the opponent random. The chain so far, every arm against search-v1-anytime on these same
600 deals:

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
| random-v7 (J206) | search-v2-rrandom4them-lcb-m40 | the rollout's opponent alone random (random4-them) | -23.2 [-34.7, -11.7] | worse, not badly |

J206 read 2026-11-10: SIGNAL +61.2 [42.1, 80.3], SHOWN for the third time running; the iteration did not lose badly,
so the track stayed open and the next step was a new decision from random-v7's counters (D531 point 6). They said:
with the searching seat's continuation Forge's again, the excess of plays made from a pass that every both-random arm
showed (11% to 19% of priority decisions against search-v2's 8%) is gone (5.11% against 7.96%), so D530 point 8's
tracing of it to the searching seat's own random continuation held; and lcb, brought in to remove that excess, now
held back 35.5% of the overrides the margin rule would have made, so the arm overrode Forge less than search-v2 in
every kind (attack 8.4% against 14.7%, block 11.6% against 16.8%). D532 is the decision from them: random-v8 keeps
the rollout and returns to the margin rule, at 40 (one change from J206) and at search-v2's own 20 (D527 raised the
margin only for the from-pass excess, now gone). D532 is `docs/decisions/D532-random-v8-them-margin.md` at the pin:
its point 4 is the rule, point 5 random-v9, point 6 the closing rule, and its Context why the comparisons with earlier
nights are across a commit that does not change what a match runs; D531 the seating; D530 point 7 the restated SHOWN;
D527 the table; D523 the seam and point 10, the iteration loop.

**What is built** (D532, the merge of pc/rollout-random-v8). No Java changes:
- `tools/ai-ladder/players.json`: `search-v2-rrandom4them-m40` (kind `search`, every param search-v1-anytime's
  (`profile: Default`, `outlets: on`, `budgetMs: 1500`, `anytime: on`) plus `margin: 40` and `rollout: random4-them`),
  config hash `179ab0649521`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them`
  -- J206's arm's (`search-v2-rrandom4them-lcb-m40`, `01e2aba2d33e`) without `override=lcb,z=1`, and J202 (b)'s
  (`search-v2-rrandom4-m40`, `968c9003c616`) with the rollout value alone changed;
- `search-v2-rrandom4them` (every param search-v1-anytime's plus `rollout: random4-them`, no margin key, as
  `search-v2-rrandom4` has none), config hash `d5381ade9e66`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them`
  -- search-v2's own seat config with `,rollout=random4-them` appended, and J202 (a)'s (`search-v2-rrandom4`,
  `646d59a008f6`) with the rollout value alone changed; it differs from (a) in the margin alone;
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hashes are D532's, computed by `registry.ts` on the lane (`web/test/ai-ladder.test.ts` holds them); the pilot
records the real ones (`var/j207-tools/players.json`) and checks the config strings and the hashes (`pl.hashesAsD532`).
In the rollouts (`SearchPolicy.playout`) the searching seat is plain `RolloutController` (Forge's AI with the
candidate forced first, every search-v2 rollout's seat) and the opponent `RolloutController.Random` on random-v4, as in
J206's 1,200 games. The rule is search-v2's: Forge's answer is overridden when the best candidate's mean paired
difference to it clears the margin (40 for (a), 20 for (b)); no `search.lcb.*` counter is written on either side.

**The counters.** Each arm's batch lines carry D523's, D525's and D527's `search.rr.*` counters (the opponent's random
seat's alone, counted into the searching seat's counts, as at J206); the match line carries none of them.
`var/j207-tools/rollouts.cjs` is J206's reader unchanged: each side's searched and changed decisions by kind, its
priority overrides by direction (`search.p.changed.fromPass`, `toOther`, `toPass`) and its lcb verdicts (none
expected). `var/j207-tools/cfgs.cjs` counts the batch lines whose config A is exactly the arm's and config B exactly
search-v2's (the worst-games reader checks the `,rollout=random4-them` suffix alone, which both arms share), so each
arm is shown to have played its own margin and no lcb.

**The worst-lost games** (D523 point 10): `var/j207-tools/worst.cjs` is J206's, unchanged, its mode `random4-them`,
over each arm's match.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host: **(a) `search-v2-rrandom4them-m40` vs
`search-v1-anytime`**, `--out var/ai-ladder/match-J207a.json`, then **(b) `search-v2-rrandom4them` vs
`search-v1-anytime`**, `--out var/ai-ladder/match-J207b.json`.

**Deal blocks.** A match's batches take the host's match base (`hostBase(host)` + 900,000 = 114,900,000, `cmdMatch`
in `tools/ai-ladder/cli.ts`) and then the matchup's next unused block (`nextBseed`), counting blocks per unordered
matchup by name (`mkey`). Both arms are new names, so each takes **114,900,000-114,900,149**, the chain's deals. The
reading does not depend on it: each arm and search-v2 play the same deals in their own match, on mirrored pairs. The
blocks matter only to the comparisons with earlier nights (information): a match retried after a memory stop takes the
next unused blocks (114,900,150 onward), and the verdict then marks that arm's comparisons as across deals
(`v.a.chainDeals`, `v.b.chainDeals`).

**Why one night and no tuning.** Each arm changes one thing in an arm already played on these deals ((a) the override
rule of J206's arm; (b) the rollout seat of J202 (a)'s), and both are registered before any game; neither is selected
after the fact. What follows the night is D532 point 4: a 4,800-game confirmation for a candidate, the track's closing
when both arms lose badly, otherwise random-v9, the track's last iteration (D532 points 5 and 6). The match never
touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523 to D532 name it in their rules): a ladder match plays to
wall-clock budgets, so contention changes the rollouts each side affords, and each match has search-v2 on one side; it
is admitted only onto an empty machine and nothing, heavy or light, is admitted beside it; while it is next and waits,
nothing newer starts. `cores: 7` keeps the width J195's to J206's walls were measured at. No `after:`; it starts once
the jobs before it have ended (the pilot reads J206's match line, `var/ai-ladder/match-J206a.json`, and the earlier
chain's lines for the report). It may run beside the art session's GPU painting queue, which is outside the lab and
CPU-light but not memory-free; the runner's memory rule handles that as for J206 (whose six pressure events, three
drops to 6 workers each back to 7 within about five minutes, coincided with the painter loading its models).
## Pilot
About 15 minutes:
- the pin is merged;
- the build (the lint, javac and the decision self-test; no Java changed in D532, so this is the pin's build), the
  bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the six players (search-v1-anytime, J206's search-v2-rrandom4them-lcb-m40, J202's
  search-v2-rrandom4-m40 and search-v2-rrandom4, and the two arms): (a)'s seat config is J206's arm's with
  `,override=lcb,z=1` removed and J202 (b)'s with `rollout=random4-them` for `rollout=random4`; (b)'s is search-v2's
  with `,rollout=random4-them` appended, J202 (a)'s with the rollout value changed, and (a)'s with `margin=20` for
  `margin=40`; the hashes are D532's;
- the code, by content: the pin is the merge of D532's lane (two parents, its second the lane tip), its tree under
  every path a match runs is the lane tip's (`bridge/src`, `tools/ai-bench` (the set and its decks),
  `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`,
  `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge
  home), `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path)), and there it differs from the
  lane's base `03d5464f` in `tools/ai-ladder/players.json` alone and from J206's pin `ecd9bb4e` in exactly D529's
  three bridge files and `players.json`;
- J206's final match line is on this host, complete, and read worse, not badly (not a candidate, not losing badly), so
  the two-losing count going into this night is 0 as D532 point 4 says;
- the verdict script, the rollout reader, the config reader, the worst-games reader and the block reader written and
  tested on synthetic files;
- 4 games of each arm against `search-v1-anytime`, one worker, in the pilot's own folder, (a) first: both sides
  search, the reader agrees with the match line, each arm's random rollouts are counted and its guardrails fire (the
  opponent's random seat), no `search.lcb.*` counter on either side, every line's config A is exactly the arm's (its
  margin, no lcb) and config B exactly search-v2's, and search-v2's side carries no `search.rr.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j207-merged.txt || echo 0 > var/j207-merged.txt
cat var/j207-merged.txt
rc=0; ./bridge/build.sh > var/j207-build.txt 2>&1 || rc=$?
cat var/j207-build.txt
# the build's decision self-test: its line, with 0 failures (D531's random4-them case and D529's leak verdict inside)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j207-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j207-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the six players resolve; (a) is J206's arm without override=lcb,z=1 and J202 (b) with the rollout value changed; (b) is
# search-v2 with ,rollout=random4-them, J202 (a) with the rollout value changed and (a) at margin 20; the hashes are D532's
mkdir -p var/j207-tools
./tools/ai-ladder.sh list > var/j207-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom4them-lcb-m40|search-v2-rrandom4-m40|search-v2-rrandom4|search-v2-rrandom4them-m40|search-v2-rrandom4them) ' var/j207-tools/players.txt
node - <<'J207EOF'
// J207's pilot: the six players resolve and the two arms' seat configs are what D532 point 2 says they are.
const fs = require('fs');
const L = fs.readFileSync('var/j207-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), j206 = get('search-v2-rrandom4them-lcb-m40'), m40 = get('search-v2-rrandom4-m40'), r4 = get('search-v2-rrandom4');
const a = get('search-v2-rrandom4them-m40'), b = get('search-v2-rrandom4them');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const ACFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4-them';
const BCFG = V1CFG + ',rollout=random4-them';
const all = [v1, j206, m40, r4, a, b];
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const r = {
  present: all.every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  a_ok: base && a && a.kind === 'search' && a.cfg === ACFG && j206 && a.cfg === j206.cfg.replace(',seed=0,override=lcb,z=1,anytime=1,', ',seed=0,anytime=1,')
    && m40 && a.cfg === m40.cfg.replace(/,rollout=random4$/, ',rollout=random4-them') && !/override=|,z=/.test(a.cfg) ? 1 : 0,
  b_ok: base && b && b.kind === 'search' && b.cfg === BCFG && r4 && b.cfg === r4.cfg.replace(/,rollout=random4$/, ',rollout=random4-them')
    && a && b.cfg === a.cfg.replace(',margin=40,', ',margin=20,') && !/override=|,z=/.test(b.cfg) ? 1 : 0,
  hashes: Object.fromEntries([['search-v1-anytime', v1], ['search-v2-rrandom4them-lcb-m40', j206], ['search-v2-rrandom4-m40', m40], ['search-v2-rrandom4', r4], ['search-v2-rrandom4them-m40', a], ['search-v2-rrandom4them', b]].map(([n, p]) => [n, p?.hash ?? ''])),
  hashesAsD532: v1?.hash === 'cdd55e02a89c' && j206?.hash === '01e2aba2d33e' && m40?.hash === '968c9003c616' && r4?.hash === '646d59a008f6' && a?.hash === '179ab0649521' && b?.hash === 'd5381ade9e66' ? 1 : 0,
  aCfg: a?.cfg ?? '', bCfg: b?.cfg ?? '', v1Cfg: v1?.cfg ?? '',
};
r.ok = r.present && r.v1_cfg_ok && r.a_ok && r.b_ok && r.hashesAsD532 ? 1 : 0;
fs.writeFileSync('var/j207-tools/players.json', JSON.stringify(r, null, 1) + '\n');
fs.writeFileSync('var/j207-tools/cfg-a.txt', ACFG + '\n');
fs.writeFileSync('var/j207-tools/cfg-b.txt', BCFG + '\n');
fs.writeFileSync('var/j207-tools/cfg-v1.txt', V1CFG + '\n');
console.log(JSON.stringify(r));
J207EOF
# the code, by content (D532 point 3). HEAD is the runner's checkout of the pin, D532's merge: it must have two parents,
# its second the lane tip; its tree under every path a match runs must be the lane tip's; and there it must differ from
# the lane's base 03d5464f in players.json alone and from J206's pin ecd9bb4e in D529's three files and players.json.
# A pin with no second parent writes `none` and FAILS the check.
LANE_TIP='8fa2523a37884480bf6a9100ed6c9d43620d1677'
PATHS='bridge/src tools/ai-bench tools/ai-ladder tools/cubelab/lines.ts tools/cubelab/rng.ts tools/runner/control.ts tools/ai-ladder.sh tools/ai-bench.sh tools/config.sh forge-home/custom-cards config.json'
C=var/j207-tools/code
rm -rf $C && mkdir -p $C
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > $C/parents.txt
git rev-parse -q --verify 'HEAD^2' > $C/parent2.txt 2>/dev/null || { echo none > $C/parent2.txt; echo 'J207 PILOT: HEAD has no second parent: the pin is not a merge' >&2; }
echo "$LANE_TIP" > $C/lanetip.txt
if git diff --quiet "$LANE_TIP" HEAD -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/tree-is-tip.txt
git diff --name-only 03d5464f9954de3706cb2e82275ab2fa5a2e8091 HEAD -- $PATHS > $C/since-base.txt 2>/dev/null || echo '(the base 03d5464f is not in this checkout)' > $C/since-base.txt
git diff --name-only ecd9bb4effcb9d792d22e7076fa0c962174cbea0 HEAD -- $PATHS > $C/since-j206.txt 2>/dev/null || echo '(J206 pin ecd9bb4e is not in this checkout)' > $C/since-j206.txt
cat > var/j207-tools/codecheck.cjs <<'J207EOF'
// J207's code check (D532 point 3), by content. Reads the files the pilot's git block wrote into <dir> and writes
// <out>. Each git answer is a file holding 1 (holds), 0 (does not) or the answer itself:
//   parents.txt        the pin's parent count (`git rev-list --parents -n 1 HEAD`): must be 2, a merge
//   parent2.txt        HEAD^2's sha, or `none` when HEAD has no second parent (then the check FAILS, never passes)
//   lanetip.txt        the lane tip the job names (D532's merge's second parent)
//   tree-is-tip.txt    `git diff --quiet <lane tip> HEAD -- <paths>` exited 0: the pin's tree under every path a match
//                      runs IS the lane tip's (by content: another lane's change there, merged first, fails it)
//   since-base.txt     `git diff --name-only 03d5464f HEAD -- <paths>`: the lane's own change there, from its base
//                      (D529's merge): tools/ai-ladder/players.json alone
//   since-j206.txt     `git diff --name-only ecd9bb4e HEAD -- <paths>`: from J206's pin, D529's three bridge files and
//                      players.json, exactly (D532's Context reads those three for what a match runs)
// usage: node codecheck.cjs <dir> <out.json>
const fs = require('fs');
const [dir, out] = process.argv.slice(2);
const lines = (f) => { try { return fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean); } catch { return []; } };
const one = (f) => lines(f)[0] ?? '';
const BASE = ['tools/ai-ladder/players.json'];
const SINCE_J206 = ['bridge/src/mtgtable/ai/Atlas.java', 'bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/LeakVerdict.java', 'tools/ai-ladder/players.json'];
const same = (x, want) => x.length === want.length && [...x].sort().every((y, i) => y === want[i]);
const parents = Number(one('parents.txt') || '0');
const parent2 = one('parent2.txt') || 'none', laneTip = one('lanetip.txt');
const base = lines('since-base.txt'), j206 = lines('since-j206.txt');
const r = {
  parents, parent2, laneTip,
  isMerge: parents === 2 && parent2 !== 'none' ? 1 : 0,
  secondParentIsLaneTip: /^[0-9a-f]{40}$/.test(laneTip) && parent2 === laneTip ? 1 : 0,
  treeIsTip: one('tree-is-tip.txt') === '1' ? 1 : 0,
  laneOnly: same(base, BASE) ? 1 : 0,
  sinceJ206AsRead: same(j206, SINCE_J206) ? 1 : 0,
  sinceBase: base, sinceJ206: j206, other: j206.filter((x) => !SINCE_J206.includes(x)),
};
r.ok = r.isMerge && r.secondParentIsLaneTip && r.treeIsTip && r.laneOnly && r.sinceJ206AsRead ? 1 : 0;
r.why = r.ok ? null : !r.isMerge ? "the pin is not a merge (no second parent): not D532's merge, the code check fails"
  : !r.secondParentIsLaneTip ? 'HEAD^2 is not the lane tip the job names'
    : !r.treeIsTip ? 'the pin differs from the lane tip under a path a match runs (another change merged there): redraft the job on the new main (D532 point 3)'
      : !r.laneOnly ? 'the pin differs from the lane\'s base 03d5464f under a match path in more than players.json'
        : 'the pin\'s difference from J206\'s pin under a match path is not D529\'s three files and players.json';
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
if (!r.ok) { console.error(`J207 PILOT CODE CHECK FAILS: ${r.why}`); process.exitCode = 1; }
J207EOF
node var/j207-tools/codecheck.cjs $C var/j207-tools/search-diff.json
# the code check on synthetic answers: the good merge passes; no second parent, another second parent, a tree that is
# not the tip's, a lane that brought more than players.json, and a sixth file since J206's pin each fail
T=0123456789abcdef0123456789abcdef01234567
J6='bridge/src/mtgtable/ai/Atlas.java bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/LeakVerdict.java tools/ai-ladder/players.json'
mkc() { d=var/j207-tools/code-selftest/$1; mkdir -p $d; echo "$2" > $d/parents.txt; echo "$3" > $d/parent2.txt; echo $T > $d/lanetip.txt; echo "$4" > $d/tree-is-tip.txt; printf '%s\n' tools/ai-ladder/players.json $5 > $d/since-base.txt; printf '%s\n' $J6 $6 > $d/since-j206.txt; node var/j207-tools/codecheck.cjs $d $d/out.json > /dev/null 2>&1 || true; }
rm -rf var/j207-tools/code-selftest
mkc good 2 $T 1 '' ''
mkc noparent 1 none 1 '' ''
mkc otherparent 2 fedcba9876543210fedcba9876543210fedcba98 1 '' ''
mkc nottip 2 $T 0 '' ''
mkc morelane 2 $T 1 tools/ai-ladder/kinds.ts ''
mkc sixth 2 $T 1 '' bridge/src/mtgtable/ai/SearchPolicy.java
node -e 'const fs=require("fs");const r=(k)=>JSON.parse(fs.readFileSync(`var/j207-tools/code-selftest/${k}/out.json`,"utf8"));const ok=r("good").ok===1&&r("noparent").ok===0&&r("noparent").isMerge===0&&r("otherparent").ok===0&&r("otherparent").secondParentIsLaneTip===0&&r("nottip").ok===0&&r("nottip").treeIsTip===0&&r("nottip").laneOnly===1&&r("morelane").ok===0&&r("morelane").laneOnly===0&&r("sixth").ok===0&&r("sixth").sinceJ206AsRead===0&&r("sixth").laneOnly===1?1:0;fs.writeFileSync("var/j207-tools/code-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
cat > var/j207-tools/verdict.mjs <<'J207EOF'
// J207's reading, pre-registered 2026-11-10 before any rated game of either arm (the job's rule: line; D532 point 4:
// D527's table with D530 point 7's SHOWN restatement for each arm, each read from its own match; what follows decided
// only when both are complete; D398's fixed matches).
// usage: node verdict.mjs <J207a.json> <J207b.json> <rollouts-a.json> <rollouts-b.json> <seeds-a.json> <seeds-b.json> <J206a.json> <J205a.json> <J204a.json> <J204b.json> <J202a.json> <J202b.json> <out.json>
//        node verdict.mjs --prior <J206a.json> <J205a.json> <J204a.json> <J204b.json> <J202a.json> <J202b.json> <out.json>
//        node verdict.mjs --selftest <scratch dir>
// EVERY THRESHOLD IS COMPARED IN INTEGERS: Elo values in tenths (Math.round(x * 10); a match line carries Elo to 0.1),
//   the score's lower end in ten-thousandths (it carries 4 places).
// EVERY CHECKED VALUE IS A NUMBER (D532, after J206's `v.v8 == null`, which the runner read as a missing metric and so
//   failed the job): every flag is 0 or 1, v9Margin is 40, 20 or 0 (0 when random-v9 does not follow), and nothing a
//   job's check: line reads is ever null, absent or a string. Information-only numbers (the cross-job differences) are
//   null when an input line is missing; no check reads them.
// THE ARMS (D532 point 2): (a) search-v2-rrandom4them-m40 (179ab0649521), (b) search-v2-rrandom4them (d5381ade9e66),
//   each config A of its own match against search-v1-anytime (search-v2, cdd55e02a89c), 1,200 games, 600 mirrored
//   pairs, the confirm set, no stopping rule.
// WHAT FOLLOWS (D532 point 4), only when both arms are complete, exactly one of: confirm (either arm a candidate: the
//   one with the higher Elo point, (a) on a tie), trackCloses (both arms lose badly: the track closes without
//   random-v9), v9 (otherwise: random-v9 at the margin of the arm with the higher point, 40 for (a), 20 for (b), 40 on
//   a tie). An incomplete arm gives no reading and is reposted; then nothing follows.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const OPP = ['search-v1-anytime', 'cdd55e02a89c'];
export const ARM_A = ['search-v2-rrandom4them-m40', '179ab0649521'];
export const ARM_B = ['search-v2-rrandom4them', 'd5381ade9e66'];
export const MARGIN = { a: 40, b: 20 };
export const J206 = ['search-v2-rrandom4them-lcb-m40', '01e2aba2d33e'];
export const J205A = ['search-v2-rrandom4-lcb-m40', '98eea870967e'];
export const J204A = ['search-v2-rrandom4-m60', '216e66d89fe3'];
export const J204B = ['policy-outlet', 'e350d94649a4'];
export const J202A = ['search-v2-rrandom4', '646d59a008f6'];
export const J202B = ['search-v2-rrandom4-m40', '968c9003c616'];
export const BLOCK_LO = 114900000, BLOCK_HI = 114900149, BLOCKS = 150;
const READINGS = ['shown', 'inconclusive', 'indistinguishable', 'noWeaker', 'worseNotBadly', 'losesBadly'];
const SHOWN_MEANS = "Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it";
// every key a check: line of the job reads off the verdict, by path; the selftest holds each to a number
export const CHECKED = ['written', 'bothComplete', 'candidate', 'confirm', 'confirmA', 'confirmB', 'bothLoseBadly', 'trackCloses', 'closing',
  'v9', 'v9Margin', 'v9A', 'v9B', 'follows', 'keepsOpen', 'repost', 'repostA', 'repostB', 'selfPlayOpens', 'liveSeatChanged',
  ...['a', 'b'].flatMap((k) => ['names', 'complete', ...READINGS, 'candidate', 'diagnose', 'tooWide', 'upperAtZero', 'inconclusiveAbove', 'margin'].map((x) => `${k}.${x}`))];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const T = (x) => Math.round(x * 10);      // Elo in integer tenths
const L4 = (x) => Math.round(x * 10000);  // a score in integer ten-thousandths

export function line(m, [A, hA]) {
  const names = m !== null && m !== undefined && m.a === A && m.b === OPP[0] && m.ah === hA && m.bh === OPP[1] ? 1 : 0;
  const complete = names && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR
    && num(m.lo) !== null && num(m.elo) !== null && num(m.eloLo) !== null && num(m.eloHi) !== null ? 1 : 0;
  return { match: m === null || m === undefined ? 0 : 1, names, complete, a: A, ah: hA, id: m?.id ?? null, played: m?.played ?? 0,
    errors: m?.errors ?? 0, timeouts: m?.timeouts ?? 0, score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi),
    elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi), aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision) };
}
const missing = (s, which) => (s.match === 0 ? `NO MATCH (${which}): no reading` : s.names === 0 ? `NOT THIS MATCH (${which}): no reading (want ${s.a} at ${s.ah} against ${OPP[0]})` : `INCOMPLETE (${which}): no reading`);

// D527's table, as J205's and J206's verdicts read it (unchanged)
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

// information only: x minus y on the point, in tenths; with D528's hw and interval when asked (the arm minus J204 (b))
const minus = (x, y) => (x.complete && y && y.complete ? (T(x.elo) - T(y.elo)) / 10 : null);
function withHw(x, y) {
  if (!(x.complete && y && y.complete)) return { diff: null, hw: null, lo: null, hi: null };
  const dT = T(x.elo) - T(y.elo);
  const hwT = Math.sqrt(((T(x.eloHi) - T(x.eloLo)) / 2) ** 2 + ((T(y.eloHi) - T(y.eloLo)) / 2) ** 2);
  return { diff: r1(dT / 10), hw: r1(hwT / 10), lo: r1((dT - hwT) / 10), hi: r1((dT + hwT) / 10) };
}
const chainDeals = (s, played) => (s && s.blocks === BLOCKS && s.min === BLOCK_LO && s.max === BLOCK_HI && s.games === played && played === GAMES ? 1 : 0);

// the lines the night compares itself with (information) and J206's own reading (the pilot's premise)
export function prior(m6a, m5a, m4a, m4b, m2a, m2b) {
  const j206 = { ...line(m6a, J206), ...table(line(m6a, J206)) };
  const j205a = line(m5a, J205A), j204a = line(m4a, J204A), j204b = line(m4b, J204B), j202a = line(m2a, J202A), j202b = line(m2b, J202B);
  return { j206, j205a, j204a, j204b, j202a, j202b,
    // J206 did not lose badly and was no candidate: the two-losing count going into J207 is 0 (D532 point 4)
    countIn: j206.complete && !j206.losesBadly ? 0 : -1 };
}

function arm(m, who, k, ro, seeds) {
  const s0 = line(m, who);
  const x = { ...s0, ...table(s0), margin: MARGIN[k] };
  if (x.shown) x.readingMeans = SHOWN_MEANS;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && ro !== undefined && run !== null && ro.run === run ? 1 : 0;
  x.cost = { read: sameRun, ratio: sameRun ? num(ro.ratio) : null, aRolloutsPerDecision: sameRun ? num(ro.aRolloutsPerDecision) : null,
    bRolloutsPerDecision: sameRun ? num(ro.bRolloutsPerDecision) : null, aLcb: sameRun ? ro.aLcb ?? null : null,
    aPriorityShare: sameRun ? ro.aPriorityShare ?? null : null, bPriorityShare: sameRun ? ro.bPriorityShare ?? null : null,
    aChangedShare: sameRun ? ro.aChangedShare ?? null : null, bChangedShare: sameRun ? ro.bChangedShare ?? null : null };
  x.chainDeals = x.complete ? chainDeals(seeds, x.played) : 0;
  x.blocks = seeds ? { blocks: seeds.blocks ?? null, min: seeds.min ?? null, max: seeds.max ?? null, games: seeds.games ?? null } : null;
  return x;
}

export function nightJ207(ma, mb, roa, rob, sa, sb, m6a, m5a, m4a, m4b, m2a, m2b) {
  const p = prior(m6a, m5a, m4a, m4b, m2a, m2b);
  const a = arm(ma, ARM_A, 'a', roa, sa), b = arm(mb, ARM_B, 'b', rob, sb);
  const bothComplete = a.complete && b.complete ? 1 : 0;
  const aAhead = bothComplete && T(a.elo) >= T(b.elo) ? 1 : 0;   // (a) on a tie
  let confirm = 0, confirmA = 0, confirmB = 0, trackCloses = 0, v9 = 0, v9A = 0, v9B = 0;
  const candidate = bothComplete && (a.candidate || b.candidate) ? 1 : 0;
  const bothLoseBadly = bothComplete && a.losesBadly && b.losesBadly ? 1 : 0;
  if (bothComplete) {
    if (candidate) {
      confirm = 1;
      if (a.candidate && b.candidate) { confirmA = aAhead; confirmB = 1 - aAhead; } else { confirmA = a.candidate ? 1 : 0; confirmB = b.candidate ? 1 : 0; }
    } else if (bothLoseBadly) {
      trackCloses = 1;
    } else {
      v9 = 1; v9A = aAhead; v9B = 1 - aAhead;
    }
  }
  const v9Margin = v9 ? (v9A ? MARGIN.a : MARGIN.b) : 0;
  const repostA = a.complete ? 0 : 1, repostB = b.complete ? 0 : 1;
  const confirmArm = confirmA ? ARM_A[0] : confirmB ? ARM_B[0] : '';
  const info = {
    aMinusJ206: minus(a, p.j206), bMinusJ206: minus(b, p.j206), bMinusA: bothComplete ? (T(b.elo) - T(a.elo)) / 10 : null,
    aMinusJ202b: minus(a, p.j202b), bMinusJ202a: minus(b, p.j202a), aMinusJ205a: minus(a, p.j205a), bMinusJ205a: minus(b, p.j205a),
    aMinusJ204a: minus(a, p.j204a), bMinusJ204a: minus(b, p.j204a),
    aMinusJ204b: withHw(a, p.j204b), bMinusJ204b: withHw(b, p.j204b),
    acrossCode: 'every difference with another job is across D529\'s merge (03d5464f), which leaves what a ladder match runs unchanged by D532\'s reading; information only',
    acrossDeals: { a: a.complete && !a.chainDeals ? 1 : 0, b: b.complete && !b.chainDeals ? 1 : 0 } };
  const armText = (x, k) => (x.complete ? `(${k}) ${x.reading}: ${x.a} ${x.elo} Elo [${x.eloLo}, ${x.eloHi}], score ${x.score}, lower end ${x.lo}, margin ${x.margin}${x.shown ? ` (${SHOWN_MEANS})` : ''}` : missing(x, k));
  const reading = [
    p.j206.complete ? `J206 re-read: ${J206[0]} ${p.j206.reading}, ${p.j206.elo} [${p.j206.eloLo}, ${p.j206.eloHi}]; the two-losing count going in ${p.countIn === 0 ? 0 : 'not 0'}` : "J206's line is not on this host complete (information; the pilot checks it)",
    armText(a, 'a'),
    armText(b, 'b'),
    !bothComplete ? `nothing follows from this night: ${[repostA ? '(a)' : null, repostB ? '(b)' : null].filter(Boolean).join(' and ')} reposted, and the reposted arm's job reads both lines by this rule`
      : confirm ? `a 4,800-game confirmation of ${confirmArm} under D519's readings follows, as its own job${a.candidate && b.candidate ? ` (both arms candidates: the higher point, ${aAhead ? '(a), the higher or equal' : '(b)'})` : ''}; random-v9 waits on it`
        : trackCloses ? "both arms lose badly: the random-rollout track closes now, without random-v9; a closing decision writes it from the track's closing draft, and the owner is told, with the counters, which way it went"
          : `random-v9 follows (D532 point 5): a per-rollout mix of search-v2's Forge rollouts and random4-them rollouts at margin ${v9Margin}, the margin of ${v9A ? '(a)' : '(b)'}, ${v9A && T(a.elo) === T(b.elo) ? 'the two points equal (a tie goes to 40)' : 'the arm with the higher point'}; new Java under its own decision and one 1,200-game match, after which the track closes whatever it reads unless its arm is a candidate`,
    'the self-play-from-random path does not open on this night', 'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, arms: [ARM_A[0], ARM_B[0]], a, b, bothComplete, candidate, confirm, confirmA, confirmB, confirmArm,
    bothLoseBadly, trackCloses, closing: trackCloses, v9, v9Margin, v9A, v9B, follows: confirm + trackCloses + v9, keepsOpen: confirm + v9,
    repost: repostA || repostB ? 1 : 0, repostA, repostB, selfPlayOpens: 0, liveSeatChanged: 0, countIn: p.countIn,
    j206: { complete: p.j206.complete, reading: p.j206.reading, elo: p.j206.elo, eloLo: p.j206.eloLo, eloHi: p.j206.eloHi },
    info, reading };
}

const get = (o, k) => k.split('.').reduce((x, y) => (x === null || x === undefined ? undefined : x[y]), o);

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (who, hash, elo, half = 13.5, o = {}) => ({ id: `host:run-${who}`, a: who, b: OPP[0], ah: hash, bh: OPP[1], complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.5 + elo / 700, lo: 0.5 + (elo - half) / 700, hi: 0.5 + (elo + half) / 700, elo, eloLo: elo - half, eloHi: elo + half, aSearch: { msPerDecision: 900 }, bSearch: { msPerDecision: 890 }, ...o });
  const A = (elo, o = {}) => mk(ARM_A[0], ARM_A[1], elo, o.half ?? 13.5, { id: 'host:run-a', ...o });
  const B = (elo, o = {}) => mk(ARM_B[0], ARM_B[1], elo, o.half ?? 13.5, { id: 'host:run-b', ...o });
  // the lines on this host as they read (J206, J205 (a), J204 (a) and (b), J202 (a) and (b))
  const P6 = mk(J206[0], J206[1], -23.2, 11.5, { eloLo: -34.7, eloHi: -11.7 }), P5 = mk(J205A[0], J205A[1], -35.4, 14, { eloLo: -49.5, eloHi: -21.5 });
  const P4A = mk(J204A[0], J204A[1], -24.4, 14, { eloLo: -38.4, eloHi: -10.4 }), P4B = mk(J204B[0], J204B[1], -84.4, 15.3, { eloLo: -99.9, eloHi: -69.3 });
  const P2A = mk(J202A[0], J202A[1], -39.5, 14.3, { eloLo: -53.9, eloHi: -25.3 }), P2B = mk(J202B[0], J202B[1], -20.9, 13.2, { eloLo: -34.1, eloHi: -7.7 });
  const S = (o = {}) => ({ purpose: 'match:x', games: GAMES, blocks: BLOCKS, min: BLOCK_LO, max: BLOCK_HI, ...o });
  const RO = (run) => ({ run, ratio: 1.05, aRolloutsPerDecision: 16.3, bRolloutsPerDecision: 15.5, aLcb: { overrode: 0, held: 0, none: 0 }, aPriorityShare: { fromPass: 0.07, toOther: 0.06, toPass: 0.04 } });
  const all = (ma, mb, o = {}) => [ma, mb, 'roa' in o ? o.roa : RO('run-a'), 'rob' in o ? o.rob : RO('run-b'), 'sa' in o ? o.sa : S(), 'sb' in o ? o.sb : S(),
    'm6a' in o ? o.m6a : P6, 'm5a' in o ? o.m5a : P5, 'm4a' in o ? o.m4a : P4A, 'm4b' in o ? o.m4b : P4B, 'm2a' in o ? o.m2a : P2A, 'm2b' in o ? o.m2b : P2B];
  const oneArm = (x) => (x.complete === 0 ? READINGS.every((k) => x[k] === 0) && x.candidate + x.diagnose === 0 : READINGS.reduce((y, k) => y + x[k], 0) === 1 && x.candidate + x.diagnose === 1);
  const numbers = (r) => CHECKED.every((k) => typeof get(r, k) === 'number' && Number.isFinite(get(r, k)));
  const sane = (r) => numbers(r) && r.liveSeatChanged === 0 && r.selfPlayOpens === 0 && oneArm(r.a) && oneArm(r.b) && r.a.margin === 40 && r.b.margin === 20
    && r.follows === (r.bothComplete ? 1 : 0) && r.confirm + r.trackCloses + r.v9 === r.follows && r.confirm === r.confirmA + r.confirmB && r.v9 === r.v9A + r.v9B
    && (r.v9 ? r.v9Margin === (r.v9A ? 40 : 20) : r.v9Margin === 0) && r.closing === r.trackCloses && r.keepsOpen === r.confirm + r.v9
    && r.repost === (r.bothComplete ? 0 : 1) && r.repostA === 1 - r.a.complete && r.repostB === 1 - r.b.complete
    && r.candidate === (r.bothComplete && (r.a.candidate || r.b.candidate) ? 1 : 0) && r.confirm === r.candidate
    && r.bothLoseBadly === (r.bothComplete && r.a.losesBadly && r.b.losesBadly ? 1 : 0) && r.trackCloses === r.bothLoseBadly
    && (!r.confirmA || r.a.candidate === 1) && (!r.confirmB || r.b.candidate === 1);
  const cases = [
    // ---- the four branches the rule names, each at least once
    ['as expected: (a) -15 worse not badly, (b) -18 worse not badly: random-v9 at 40 (the higher point, (a))', all(A(-15), B(-18)),
      (r) => r.a.worseNotBadly === 1 && r.b.worseNotBadly === 1 && r.v9 === 1 && r.v9A === 1 && r.v9Margin === 40 && r.keepsOpen === 1 && r.trackCloses === 0 && r.confirm === 0
        && r.info.aMinusJ206 === 8.2 && r.info.bMinusA === -3 && r.info.aMinusJ202b === 5.9 && r.info.bMinusJ202a === 21.5 && r.info.aMinusJ204b.diff === 69.4 && r.reading[3].includes('margin 40')],
    ['(b) ahead: (a) -22 worse, (b) -10 too wide: random-v9 at 20', all(A(-22), B(-10)),
      (r) => r.b.worseNotBadly === 1 && r.b.tooWide === 1 && r.v9 === 1 && r.v9B === 1 && r.v9Margin === 20 && r.reading[3].includes('margin 20')],
    ['a tie on the point (-15.0 and -15.0): random-v9 at 40', all(A(-15), B(-15, { half: 12 })), (r) => r.v9 === 1 && r.v9A === 1 && r.v9Margin === 40 && r.reading[3].includes('the two points equal (a tie goes to 40)')],
    ['a float-near tie (-15.1 + 0.1 against -15): a tie in tenths, 40', all(A(-15.1 + 0.1), B(-15)), (r) => r.v9Margin === 40],
    ['(b) ahead by 0.1 (-14.9 against -15.0): 20', all(A(-15), B(-14.9)), (r) => r.v9Margin === 20],
    ['both lose badly (-30, -35): the track closes now, no random-v9', all(A(-30), B(-35)),
      (r) => r.a.losesBadly === 1 && r.b.losesBadly === 1 && r.bothLoseBadly === 1 && r.trackCloses === 1 && r.closing === 1 && r.v9 === 0 && r.v9Margin === 0 && r.keepsOpen === 0 && r.reading[3].startsWith('both arms lose badly')],
    ['(a) loses badly, (b) worse not badly: random-v9 at 20 ((b) higher)', all(A(-30), B(-20)), (r) => r.bothLoseBadly === 0 && r.trackCloses === 0 && r.v9 === 1 && r.v9Margin === 20],
    ['(a) worse not badly, (b) loses badly: random-v9 at 40', all(A(-20), B(-30)), (r) => r.v9 === 1 && r.v9Margin === 40],
    ['(a) indistinguishable (0 +-9.5), (b) worse: confirm (a)', all(A(0, { half: 9.5 }), B(-20)),
      (r) => r.a.indistinguishable === 1 && r.confirm === 1 && r.confirmA === 1 && r.confirmB === 0 && r.confirmArm === ARM_A[0] && r.v9 === 0 && r.v9Margin === 0 && r.keepsOpen === 1],
    ['(b) a candidate, (a) loses badly: confirm (b)', all(A(-30), B(0, { half: 9.5 })), (r) => r.confirmB === 1 && r.confirmA === 0 && r.trackCloses === 0 && r.v9 === 0],
    ['both candidates, (b) higher (2 against 0): confirm (b)', all(A(0, { half: 9.5 }), B(2, { half: 9.5 })), (r) => r.a.candidate === 1 && r.b.candidate === 1 && r.confirmB === 1 && r.confirmA === 0],
    ['both candidates, equal points: confirm (a)', all(A(1, { half: 9.5 }), B(1, { half: 9 })), (r) => r.confirmA === 1 && r.confirmB === 0],
    ["(b) SHOWN: confirm (b), D530's restated SHOWN", all(A(-20), B(20.9, { lo: 0.518, eloLo: 11.4, eloHi: 30.4 })),
      (r) => r.b.shown === 1 && r.confirmB === 1 && r.b.readingMeans.startsWith("Forge's opponent model") && r.reading[2].includes('Forge\'s opponent model leaves the rollout loop')],
    // ---- D527's table, its edges, in integers
    ['a lower end above 0.5 with a point of +14.9: INCONCLUSIVE (case 1), a candidate', all(A(14.9, { lo: 0.505, eloLo: 5.4, eloHi: 24.4 }), B(-20)), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 1 && r.confirmA === 1],
    ['an upper end of exactly +15: INCONCLUSIVE', all(A(5.5, { eloLo: -4, eloHi: 15 }), B(-20)), (r) => r.a.inconclusive === 1],
    ['a lower end of -14.9 containing 0: indistinguishable', all(A(-5, { eloLo: -14.9, eloHi: 4.9 }), B(-20)), (r) => r.a.indistinguishable === 1],
    ['a lower end of exactly -15 containing 0: too wide, worse not badly', all(A(-5.1, { eloLo: -15, eloHi: 4.8 }), B(-20)), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1 && r.v9 === 1],
    ['an upper end of exactly -15: worse, not badly', all(A(-24.5, { eloLo: -34, eloHi: -15 }), B(-30)), (r) => r.a.worseNotBadly === 1 && r.a.losesBadly === 0 && r.trackCloses === 0 && r.v9 === 1],
    ['an upper end of -15.1 on both: both lose badly', all(A(-24.6, { eloLo: -34.1, eloHi: -15.1 }), B(-30)), (r) => r.a.losesBadly === 1 && r.trackCloses === 1],
    ['an upper end of -15.1 + 0.1 (-14.999999999999998) is -15.0: worse, not badly', all(A(-24.5, { eloLo: -34, eloHi: -15.1 + 0.1 }), B(-30)), (r) => r.a.worseNotBadly === 1 && r.trackCloses === 0],
    ['an upper end of exactly 0: worse, not badly (case 3)', all(A(-9.5, { eloLo: -19, eloHi: 0 }), B(-20)), (r) => r.a.worseNotBadly === 1 && r.a.upperAtZero === 1],
    ['an upper end of 0.3 - 0.1 - 0.2 (about -2.8e-17) is exactly 0 (case 3)', all(A(-9.5, { eloLo: -19, eloHi: 0.3 - 0.1 - 0.2 }), B(-20)), (r) => r.a.upperAtZero === 1],
    ['an interval wholly at or above 0 under +15: no weaker (case 2), a candidate', all(A(-20), B(4.5, { lo: 0.5, eloLo: 0, eloHi: 9 })), (r) => r.b.noWeaker === 1 && r.confirmB === 1],
    ['a point of 15.1 - 0.1 with the lower end above 0.5 is SHOWN (+15.0)', all(A(15.1 - 0.1, { lo: 0.505, eloLo: 5.5, eloHi: 24.5 }), B(-20)), (r) => r.a.shown === 1],
    // ---- completeness: nothing follows until both are read
    ['(a) 1,199 games: incomplete, reposted alone, nothing follows', all(A(-15, { played: 1199 }), B(-18)),
      (r) => r.a.complete === 0 && r.repostA === 1 && r.repostB === 0 && r.repost === 1 && r.follows === 0 && r.v9 === 0 && r.v9Margin === 0 && r.b.worseNotBadly === 1],
    ['(b) missing: (b) reposted, (a) read, nothing follows', all(A(-30), null), (r) => r.b.match === 0 && r.repostB === 1 && r.a.losesBadly === 1 && r.trackCloses === 0 && r.follows === 0],
    ['(b) stopped at its hours (complete: false), (a) a candidate: no confirmation until (b) is read', all(A(0, { half: 9.5 }), { ...B(-18), complete: false, played: 900 }),
      (r) => r.a.candidate === 1 && r.confirm === 0 && r.confirmA === 0 && r.repostB === 1 && r.follows === 0],
    ['both missing: both reposted', all(null, null), (r) => r.repostA === 1 && r.repostB === 1 && r.follows === 0],
    ['61 errors and timeouts: incomplete', all(A(-15, { errors: 40, timeouts: 21 }), B(-18)), (r) => r.a.complete === 0 && r.repostA === 1],
    ['60 errors and timeouts: complete', all(A(-15, { errors: 40, timeouts: 20 }), B(-18)), (r) => r.a.complete === 1 && r.v9 === 1],
    ['the players swapped in (a): not this match', all({ ...A(20), a: OPP[0], b: ARM_A[0], ah: OPP[1], bh: ARM_A[1] }, B(-18)), (r) => r.a.names === 0 && r.repostA === 1],
    ["J206's arm (override=lcb) in (a)'s file is not random-v8", all(mk(J206[0], J206[1], -15, 13.5, { id: 'host:run-a' }), B(-18)), (r) => r.a.names === 0 && r.a.complete === 0],
    ["(b)'s arm in (a)'s file and (a)'s in (b)'s: neither is its match", all(B(-15), A(-18)), (r) => r.a.names === 0 && r.b.names === 0 && r.repost === 1],
    ["(a) at another hash (margin 40, the same name): not this match", all(A(-15, { ah: '000000000000' }), B(-18)), (r) => r.a.names === 0],
    // ---- information only: the cross-job numbers never change what follows
    ["J204 (b) missing: the arm minus the baseline unread, what follows unchanged", all(A(-15), B(-18), { m4b: null }), (r) => r.info.aMinusJ204b.diff === null && r.v9 === 1 && r.v9Margin === 40],
    ["J206 missing: the differences with it unread, countIn not 0, what follows unchanged", all(A(-30), B(-35), { m6a: null }), (r) => r.info.aMinusJ206 === null && r.countIn === -1 && r.trackCloses === 1],
    ["(a)'s blocks moved (a memory retry, from 114,900,150): read as always, its cross-job numbers marked across deals", all(A(-15), B(-18), { sa: S({ min: 114900150, max: 114900299 }) }),
      (r) => r.a.complete === 1 && r.a.chainDeals === 0 && r.info.acrossDeals.a === 1 && r.info.acrossDeals.b === 0 && r.v9 === 1],
    ["(b)'s seeds file missing: not the chain's deals, read as always", all(A(-15), B(-18), { sb: null }), (r) => r.b.chainDeals === 0 && r.info.acrossDeals.b === 1 && r.v9 === 1],
    ['the rollouts are read from each arm\'s own run only', all(A(-15), B(-18), { rob: RO('run-x') }), (r) => r.a.cost.read === 1 && r.b.cost.read === 0 && r.b.cost.aLcb === null],
  ];
  let passed = 0;
  cases.forEach(([what, ms, pred], i) => {
    const files = ms.map((x, j) => {
      const f = path.join(scratch, `case-207-${i}-${j}.json`);
      if (x !== null) fs.writeFileSync(f, JSON.stringify(x)); else fs.rmSync(f, { force: true });
      return f;
    });
    const r = nightJ207(...files.map(read));
    const pass = pred(r) && sane(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading.slice(1, 4).join(' | ')}`);
    if (pass) passed++;
  });
  return { selftest: 1, cases: cases.length, passed, ok: passed === cases.length ? 1 : 0 };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv[0] === '--prior' && argv.length === 8) {
  const p = prior(...argv.slice(1, 7).map(read));
  const c = (x) => (x.complete ? 1 : 0);
  const r = { j206Read: c(p.j206), j206Candidate: p.j206.candidate, j206Diagnose: p.j206.diagnose, j206WorseNotBadly: p.j206.worseNotBadly, j206LosesBadly: p.j206.losesBadly,
    countInZero: p.countIn === 0 ? 1 : 0, j205aRead: c(p.j205a), j204aRead: c(p.j204a), j204bRead: c(p.j204b), j202aRead: c(p.j202a), j202bRead: c(p.j202b),
    j206: { reading: p.j206.reading, elo: p.j206.elo, eloLo: p.j206.eloLo, eloHi: p.j206.eloHi } };
  fs.mkdirSync(path.dirname(argv[7]), { recursive: true });
  fs.writeFileSync(argv[7], JSON.stringify(r) + '\n');
  console.log(JSON.stringify(r));
} else if (argv.length === 13) {
  const r = nightJ207(...argv.slice(0, 12).map(read));
  fs.mkdirSync(path.dirname(argv[12]), { recursive: true });
  fs.writeFileSync(argv[12], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <J207a> <J207b> <rollouts-a> <rollouts-b> <seeds-a> <seeds-b> <J206a> <J205a> <J204a> <J204b> <J202a> <J202b> <out.json> | --prior <J206a> <J205a> <J204a> <J204b> <J202a> <J202b> <out.json> | --selftest <dir>');
  process.exit(2);
}
J207EOF
cat > var/j207-tools/rollouts.cjs <<'J207EOF'
// J207 (J206's, unchanged; J205's, unchanged; under rollout=random4-them the arm's search.rr.* are the opponent's random seat's alone, counted into the
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
J207EOF
cat > var/j207-tools/worst.cjs <<'J207EOF'
// J207 (J206's, unchanged; J205's, J204's and J202's, unchanged; its mode argument is random4-them for both arms): the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 and D527 continue it). A batch line has no life total, so the
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
J207EOF
cat > var/j207-tools/seeds.cjs <<'J207EOF'
// J207 (J206's, unchanged; J205's, J204's and J202's, unchanged): which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
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
J207EOF
cat > var/j207-tools/cfgs.cjs <<'J207EOF'
// J207 (D532): the seat configs a match's batch lines actually played. Reads every batch line of the match's run
// (<ladder dir>/batches/<run>/b*.jsonl, the run the match line's id names, as rollouts.cjs does) and counts the lines
// whose config A (`a`) is exactly <want A> and whose config B (`b`) is exactly <want B>: worst.cjs checks only the
// `,rollout=<mode>` suffix, which both random-v8 arms share, so this is the check that each arm played its own margin
// (40 or 20) and its own rule (no override=lcb), and search-v2 its own. Every count is a number.
// usage: node cfgs.cjs <ladder dir> <match.json> <want A> <want B> <out.json>
const fs = require('fs');
const [dir, matchFile, wantA, wantB, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
let lines = 0, aExact = 0, bExact = 0;
const aOther = new Set(), bOther = new Set();
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)).sort() : []) {
  for (const t of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    if (!t.trim()) continue;
    let l;
    try { l = JSON.parse(t); } catch { continue; }
    lines++;
    if (l.a === wantA) aExact++; else aOther.add(String(l.a));
    if (l.b === wantB) bExact++; else bOther.add(String(l.b));
  }
}
const r = { run, lines, aExact, bExact, aOther: lines - aExact, bOther: lines - bExact, ok: lines > 0 && aExact === lines && bExact === lines ? 1 : 0,
  aOtherSeen: [...aOther].slice(0, 3), bOtherSeen: [...bOther].slice(0, 3) };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J207EOF
rm -rf var/j207-tools/selftest
node var/j207-tools/verdict.mjs --selftest var/j207-tools/selftest > var/j207-tools/selftest.json
cat var/j207-tools/selftest.json
# J206's line on this host, read by D527's table (worse, not badly: the two-losing count going in is 0), and whether the
# chain's other lines the report compares with are here (information)
node var/j207-tools/verdict.mjs --prior var/ai-ladder/match-J206a.json var/ai-ladder/match-J205a.json var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202a.json var/ai-ladder/match-J202b.json var/j207-tools/j206.json
# the rollout reader and the worst-games reader on a synthetic batch folder (J206's selftest, the readers unchanged):
# three games; the arm (A) wins one, loses two, with lcb verdicts, priority overrides by direction and the opponent random
# seat's guardrails on its side; search-v2 (B) carries no search.rr.* and no search.lcb.* key
rm -rf var/j207-tools/ro-selftest
mkdir -p var/j207-tools/ro-selftest/batches/run-s
C='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,override=lcb,z=1,anytime=1'
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"',rollout=random4-them","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.p.changed.fromPass":2,"search.lcb.overrode":2,"search.lcb.none":8,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":320,"search.rr.v3.goodBlock":8,"search.rr.v4.goodBlockLethal":4}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10,"search.p.changed":1,"search.p.changed.toPass":1,"policy.LETHAL":2}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"',rollout=random4-them","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.lcb.held":3,"search.lcb.none":7,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":160,"search.rr.failures":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10,"search.b.changed":2}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"',rollout=random4-them","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.b.considered":10,"search.b.changed":1,"search.lcb.overrode":1,"search.lcb.none":9,"search.rr.rollouts":160,"search.rr.v2.castSomething":16,"search.rr.v4.goodBlockRefused":4}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10,"policy.COMBAT":1}}}' \
  > var/j207-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rrandom4them-lcb-m40","b":"search-v1-anytime"}' > var/j207-tools/ro-selftest/match.json
node var/j207-tools/rollouts.cjs var/j207-tools/ro-selftest var/j207-tools/ro-selftest/match.json var/j207-tools/ro-selftest/out.json
node var/j207-tools/worst.cjs var/j207-tools/ro-selftest var/j207-tools/ro-selftest/match.json random4-them var/j207-tools/ro-selftest/worst.json
node var/j207-tools/worst.cjs var/j207-tools/ro-selftest var/j207-tools/ro-selftest/match.json random4 var/j207-tools/ro-selftest/worst-r4.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j207-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j207-tools/ro-selftest/worst.json","utf8"));const w4=JSON.parse(fs.readFileSync("var/j207-tools/ro-selftest/worst-r4.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.ratio===1.2&&r.aRrRollouts===480&&r.bRrRollouts===0&&r.aPerRollout.v2_ownStack===1&&r.aRrFailures===1&&r.aV3Fires===8&&r.aV4Fires===8&&r.aLcb.overrode===3&&r.aLcb.held===3&&r.aLcb.none===24&&r.aLcbHeldShare===0.5&&r.bLcb.overrode+r.bLcb.held+r.bLcb.none===0&&r.bLcbHeldShare===null&&r.aChangedShare.p===0.1111&&r.aChangedShare.b===0.1&&r.aChangedShare.a===0&&r.aPriorityShare.fromPass===0.1111&&r.aPriorityShare.toPass===0&&r.bPriorityShare.toPass===0.05&&r.bChangedShare.b===0.2&&r.bPolicy===3&&r.bPolicyGames===2&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w4.aCfgOther===3&&w.longest[0].seed===11&&w.quickest[0].seed===13?1:0;fs.writeFileSync("var/j207-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the config reader on the same folder, with config B written in: three lines; one with config A exactly the one asked for,
# two with another; config B exactly search-v2's on two lines, another on one
rm -rf var/j207-tools/cfg-selftest
mkdir -p var/j207-tools/cfg-selftest/batches/run-c
V1="$(cat var/j207-tools/cfg-v1.txt)"
A="$(cat var/j207-tools/cfg-a.txt)"
printf '%s\n' '{"a":"'"$A"'","b":"'"$V1"'"}' '{"a":"'"$C"',rollout=random4-them","b":"'"$V1"'"}' '{"a":"'"$V1"',rollout=random4-them","b":"'"$V1"',rollout=random4"}' > var/j207-tools/cfg-selftest/batches/run-c/b0.jsonl
echo '{"id":"h:run-c"}' > var/j207-tools/cfg-selftest/match.json
node var/j207-tools/cfgs.cjs var/j207-tools/cfg-selftest var/j207-tools/cfg-selftest/match.json "$A" "$V1" var/j207-tools/cfg-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j207-tools/cfg-selftest/out.json","utf8"));const ok=r.lines===3&&r.aExact===1&&r.bExact===2&&r.aOther===2&&r.bOther===1&&r.ok===0?1:0;require("fs").writeFileSync("var/j207-tools/cfg-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j207-tools/seeds-selftest
mkdir -p var/j207-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j207-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j207-tools/seeds-selftest/match.json
node var/j207-tools/seeds.cjs var/j207-tools/seeds-selftest var/j207-tools/seeds-selftest/match.json var/j207-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j207-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j207-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of each arm (one batch of one deck pair, one worker, (a) first), in the pilot's own ladder folder and seed
# range (the same deal for both); each side's rollouts, search.rr.*, search.lcb.* and policy.* counters from the batch;
# the config reader and the worst-games reader on each
V1="$(cat var/j207-tools/cfg-v1.txt)"
for k in a b; do
  if [ "$k" = a ]; then p=search-v2-rrandom4them-m40; else p=search-v2-rrandom4them; fi
  ./tools/ai-ladder.sh match "$p" search-v1-anytime --games 4 --batch-pairs 1 --host j207-pilot --purpose pilot --dir var/ai-ladder-pilot/J207 --experiments var/ai-ladder-pilot/J207/experiments.jsonl --out var/ai-ladder-pilot/J207/match-$k.json --jobs 1
  node var/j207-tools/rollouts.cjs var/ai-ladder-pilot/J207 var/ai-ladder-pilot/J207/match-$k.json var/j207-tools/rollouts-pilot-$k.json
  node var/j207-tools/cfgs.cjs var/ai-ladder-pilot/J207 var/ai-ladder-pilot/J207/match-$k.json "$(cat var/j207-tools/cfg-$k.txt)" "$V1" var/j207-tools/cfgs-pilot-$k.json
  node var/j207-tools/worst.cjs var/ai-ladder-pilot/J207 var/ai-ladder-pilot/J207/match-$k.json random4-them var/j207-tools/worst-pilot-$k.json
done
```
metrics: merged = sh: cat var/j207-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j207-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0}'
metrics: pl = sh: cat var/j207-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"v1_cfg_ok":0,"a_ok":0,"b_ok":0,"hashesAsD532":0}'
metrics: sd = sh: cat var/j207-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"isMerge":0,"secondParentIsLaneTip":0,"treeIsTip":0,"laneOnly":0,"sinceJ206AsRead":0}'
metrics: cst = sh: cat var/j207-tools/code-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: st = sh: cat var/j207-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: pj = sh: cat var/j207-tools/j206.json 2>/dev/null || echo '{"j206Read":0,"j206Candidate":0,"j206Diagnose":0,"j206WorseNotBadly":0,"j206LosesBadly":0,"countInZero":0}'
metrics: rst = sh: cat var/j207-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: cfst = sh: cat var/j207-tools/cfg-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j207-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J207/match-a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"aSearch":{"searched":0,"msPerDecision":0},"bSearch":{"searched":0,"msPerDecision":0}}'
metrics: pmb = sh: cat var/ai-ladder-pilot/J207/match-b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"aSearch":{"searched":0,"msPerDecision":0},"bSearch":{"searched":0,"msPerDecision":0}}'
metrics: pmn = sh: node -e 'let a=0,b=0;try{const r=(k)=>JSON.parse(require("fs").readFileSync(`var/ai-ladder-pilot/J207/match-${k}.json`,"utf8"));const x=r("a"),y=r("b");a=x.a==="search-v2-rrandom4them-m40"&&x.ah==="179ab0649521"&&x.b==="search-v1-anytime"&&x.bh==="cdd55e02a89c"?1:0;b=y.a==="search-v2-rrandom4them"&&y.ah==="d5381ade9e66"&&y.b==="search-v1-anytime"&&y.bh==="cdd55e02a89c"?1:0}catch(e){}console.log(JSON.stringify({a,b}))'
metrics: pra = sh: cat var/j207-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0,"aDecisions":0,"bDecisions":0,"aRrRollouts":0,"bRrRollouts":0,"aV2Fires":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0}}'
metrics: prb = sh: cat var/j207-tools/rollouts-pilot-b.json 2>/dev/null || echo '{"games":0,"aDecisions":0,"bDecisions":0,"aRrRollouts":0,"bRrRollouts":0,"aV2Fires":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0}}'
metrics: pca = sh: cat var/j207-tools/cfgs-pilot-a.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: pcb = sh: cat var/j207-tools/cfgs-pilot-b.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: pwa = sh: cat var/j207-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
metrics: pwb = sh: cat var/j207-tools/worst-pilot-b.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.checks >= 371
check: pl.ok == 1
check: pl.a_ok == 1
check: pl.b_ok == 1
check: pl.hashesAsD532 == 1
check: sd.parents == 2
check: sd.isMerge == 1
check: sd.secondParentIsLaneTip == 1
check: sd.treeIsTip == 1
check: sd.laneOnly == 1
check: sd.sinceJ206AsRead == 1
check: sd.ok == 1
check: cst.ok == 1
check: st.ok == 1
check: st.cases == 39
check: st.passed == 39
check: pj.j206Read == 1
check: pj.j206WorseNotBadly == 1
check: pj.j206LosesBadly == 0
check: pj.j206Candidate == 0
check: pj.countInZero == 1
check: rst.ok == 1
check: cfst.ok == 1
check: sst.ok == 1
check: pmn.a == 1
check: pmn.b == 1
check: pma.complete == true
check: pma.played == 4
check: pma.errors + pma.timeouts <= 1
check: pma.aSearch.searched >= 10
check: pma.bSearch.searched >= 10
check: pmb.complete == true
check: pmb.played == 4
check: pmb.errors + pmb.timeouts <= 1
check: pmb.aSearch.searched >= 10
check: pmb.bSearch.searched >= 10
check: pra.games == 4
check: pra.aDecisions == pma.aSearch.searched
check: pra.bDecisions == pma.bSearch.searched
check: pra.aRrRollouts > 0
check: pra.aV2Fires > 0
check: pra.bRrRollouts == 0
check: pra.aLcb.overrode + pra.aLcb.held + pra.aLcb.none == 0
check: pra.bLcb.overrode + pra.bLcb.held + pra.bLcb.none == 0
check: prb.games == 4
check: prb.aDecisions == pmb.aSearch.searched
check: prb.bDecisions == pmb.bSearch.searched
check: prb.aRrRollouts > 0
check: prb.aV2Fires > 0
check: prb.bRrRollouts == 0
check: prb.aLcb.overrode + prb.aLcb.held + prb.aLcb.none == 0
check: prb.bLcb.overrode + prb.bLcb.held + prb.bLcb.none == 0
check: pca.ok == 1
check: pca.lines == 4
check: pcb.ok == 1
check: pcb.lines == 4
check: pwa.games == 4
check: pwa.aCfgOther == 0
check: pwb.games == 4
check: pwb.aCfgOther == 0
check: pma.aSearch.msPerDecision < 1500
check: pma.bSearch.msPerDecision < 1500
check: pmb.aSearch.msPerDecision < 1500
check: pmb.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken, and whether the night can be read as D532 registered it:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass, and `dst`: the build's decision self-test ran with 0 failures and at least 371
  checks (D531's 352 and D529's leak-verdict cases; D532 changes no Java);
- the six players resolve on this PC: `pl.a_ok` says (a)'s ai-bench config is J206's arm's with `,override=lcb,z=1`
  removed and J202 (b)'s (`search-v2-rrandom4-m40`) with `,rollout=random4-them` for `,rollout=random4`; `pl.b_ok`
  that (b)'s is search-v2's with `,rollout=random4-them` appended, J202 (a)'s (`search-v2-rrandom4`) with the rollout
  value changed and (a)'s with `margin=20` for `margin=40`; neither carries `override=` or `z=`; `pl.hashesAsD532`
  that the arms' hashes are D532's (`179ab0649521`, `d5381ade9e66`) and the others unchanged (`cdd55e02a89c`,
  `01e2aba2d33e`, `968c9003c616`, `646d59a008f6`);
- `sd`, the code by content (D532 point 3; HEAD is the runner's checkout of the pin): the pin is a merge (two parents;
  a pin with no second parent writes `none` and fails here, never passes), its second parent is the lane tip the job
  names (`sd.secondParentIsLaneTip`), its tree under every path a match runs is the lane tip's (`git diff --quiet`,
  `sd.treeIsTip`: nothing merged there but this lane), and there it differs from the lane's base `03d5464f` in
  `tools/ai-ladder/players.json` alone (`sd.laneOnly`) and from J206's pin `ecd9bb4e` in exactly D529's three bridge
  files and `players.json` (`sd.sinceJ206AsRead`: the change D532's Context read, by its methods and by the compiled
  classes, as leaving what a match runs unchanged). The paths: `bridge/src`, `tools/ai-bench` (the set and its
  decks), `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`,
  `tools/cubelab/rng.ts`, `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh`
  (each worker's Forge home), `forge-home/custom-cards` and `config.json`. If any part fails (`sd.why`), the job does
  not run: it is redrafted on the new main with D532's Context reading redone (D532 point 3); nothing is replayed.
  `cst.ok`: the check itself on six synthetic sets of answers (the good merge passes; no second parent, another second
  parent, a tree that is not the tip's, a lane that brought more than `players.json`, a sixth file since J206's pin
  each fail);
- the verdict script reads thirty-nine synthetic sets of files: every branch of D532 point 4 (random-v9 at 40 and at
  20, a tie and a float-near tie going to 40, both arms losing badly closing the track, one losing badly not closing
  it, a candidate in (a), in (b), in both with either point higher and with equal points, a SHOWN in D530's restated
  words), D527's table at every edge in integers (case 1, case 2, case 3, too wide, upper ends at -15 and -15.1, float
  edges), an incomplete or missing arm reposted alone with nothing following (a candidate included), the players
  swapped, J206's arm or the other arm in an arm's file, another hash, and the information-only inputs missing or on
  other blocks changing nothing that follows; in every case every value a check reads is a number and exactly one thing
  follows when both arms are complete, none otherwise;
- `pj`: J206's line on this host is complete at `01e2aba2d33e` and reads worse, not badly (neither a candidate nor
  losing badly), so the two-losing count going into this night is 0, as D532 point 4 says;
- the readers read synthetic files as written (`rst.ok`: J206's rollout and worst-games readers, unchanged, on J206's
  three games; `cfst.ok`: the config reader counts exact config A and config B lines and fails a folder with any other;
  `sst.ok`: the block reader);
- in 4 games of each arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **each arm's random rollouts are counted and its guardrails fired** (the opponent's seat), **no
  `search.lcb.*` counter on either side** (the margin rule), search-v2's side carries no `search.rr.*`, every line's
  config A is exactly the arm's (its margin; `pca`, `pcb`) and config B exactly search-v2's, and both sides stay under
  the 1.5 s budget on average.

Read, not checked: `sd.sinceBase` and `sd.sinceJ206` (the file lists), `pj.j205aRead`, `pj.j204aRead`, `pj.j204bRead`,
`pj.j202aRead`, `pj.j202bRead` (whether the chain's lines the report compares with are on this host); each arm's
rollouts a decision against search-v2's (`pra.ratio`, `prb.ratio`: about J206's x1.05), each guardrail per random
rollout, the priority directions on both sides.

There are no win-rate bounds. The matches are the test.
## Commands
cores: 7
clean: var/ai-ladder/match-J207a.json
```bash
# (a) random-v8 at margin 40: search-v2-rrandom4them-m40 against search-v2, 1,200 games on the confirm set
test -f var/j207-tools/verdict.mjs
mkdir -p var/j207
echo "J207 (a): search-v2-rrandom4them-m40 (random-v8, margin 40) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom4them-m40 search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J207a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J207b.json
```bash
# (b) random-v8 at search-v2's own margin, 20: search-v2-rrandom4them against search-v2, 1,200 games on the confirm set
echo "J207 (b): search-v2-rrandom4them (random-v8, margin 20) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom4them search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J207b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j207/verdict.json var/j207/report.md var/j207/rollouts-a.json var/j207/rollouts-b.json var/j207/seeds-a.json var/j207/seeds-b.json var/j207/worst-a.json var/j207/worst-b.json var/j207/cfgs-a.json var/j207/cfgs-b.json var/j207/rollouts-j206a.json var/j207/rollouts-j202a.json var/j207/rollouts-j202b.json
```bash
# the pre-registered reading (D532 point 4: D527's table with D530's SHOWN for each arm from its own match; what follows);
# each match's rollouts, seat configs, deal blocks and worst-lost games (read, not gated); report.md (numbers only; the
# PC session writes the summary beside it)
mkdir -p var/j207
V1="$(cat var/j207-tools/cfg-v1.txt)"
for k in a b; do
  node var/j207-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J207$k.json var/j207/rollouts-$k.json
  node var/j207-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J207$k.json var/j207/seeds-$k.json
  node var/j207-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J207$k.json random4-them var/j207/worst-$k.json
  node var/j207-tools/cfgs.cjs var/ai-ladder var/ai-ladder/match-J207$k.json "$(cat var/j207-tools/cfg-$k.txt)" "$V1" var/j207/cfgs-$k.json
done
node var/j207-tools/verdict.mjs var/ai-ladder/match-J207a.json var/ai-ladder/match-J207b.json var/j207/rollouts-a.json var/j207/rollouts-b.json var/j207/seeds-a.json var/j207/seeds-b.json var/ai-ladder/match-J206a.json var/ai-ladder/match-J205a.json var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202a.json var/ai-ladder/match-J202b.json var/j207/verdict.json
# the same reader over J206's and J202's batches: the opponent alone random under lcb, and both seats random under the margin rule at 40 and 20, beside the night's
node var/j207-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J206a.json var/j207/rollouts-j206a.json
node var/j207-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J202a.json var/j207/rollouts-j202a.json
node var/j207-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J202b.json var/j207/rollouts-j202b.json
node - <<'J207EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const K = ['a', 'b'];
const M = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J207${k}.json`)]));
const RO = Object.fromEntries(K.map((k) => [k, read(`var/j207/rollouts-${k}.json`)]));
const BS = Object.fromEntries(K.map((k) => [k, read(`var/j207/seeds-${k}.json`)]));
const W = Object.fromEntries(K.map((k) => [k, read(`var/j207/worst-${k}.json`)]));
const CF = Object.fromEntries(K.map((k) => [k, read(`var/j207/cfgs-${k}.json`)]));
const R6 = read('var/j207/rollouts-j206a.json'), R2A = read('var/j207/rollouts-j202a.json'), R2B = read('var/j207/rollouts-j202b.json');
const v = read('var/j207/verdict.json');
const I = v.info || {};
const pct = (y, d = 1) => (typeof y === 'number' ? `${(y * 100).toFixed(d)}%` : '-');
const runStart = (id) => { const z = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || ''); return z ? Date.UTC(+z[1], +z[2] - 1, +z[3], +z[4], +z[5], +z[6]) : null; };
const hours = (m) => { const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const hw = (x) => (x && x.diff !== null && x.diff !== undefined ? `${x.diff} [${x.lo}, ${x.hi}] (+-${x.hw})` : '-');
const L = ['# J207: random-v8, rollout=random4-them on the margin rule; (a) search-v2-rrandom4them-m40, (b) search-v2-rrandom4them (margin 20), each against search-v1-anytime (D532)', ''];
L.push(`**J206, re-read (the premise):** ${(v.reading || [])[0] ?? '-'}.`, '');
L.push(`**Each arm under D527's table (SHOWN restated by D530 point 7), from its own match:** ${(v.reading || [])[1] ?? 'no reading'}; ${(v.reading || [])[2] ?? 'no reading'}.`, '');
L.push(`**What follows (D532 point 4):** ${(v.reading || []).slice(3).join('; ') || '-'}.`, '');
L.push(`**Beside the reading (information, deciding nothing; every difference with another job is across D529's merge, which leaves what a match runs unchanged by D532's reading${(I.acrossDeals || {}).a || (I.acrossDeals || {}).b ? `, and across deals for ${[(I.acrossDeals || {}).a ? '(a)' : null, (I.acrossDeals || {}).b ? '(b)' : null].filter(Boolean).join(' and ')}` : ''}):** (b) minus (a), the margin 20 against 40: ${I.bMinusA ?? '-'}; (a) minus J206's arm (lcb at 40, the same rollouts: the rule's own effect): ${I.aMinusJ206 ?? '-'}; (b) minus J206's arm: ${I.bMinusJ206 ?? '-'}; (a) minus J202 (b) (both seats random, margin 40: the seating's effect under the margin rule): ${I.aMinusJ202b ?? '-'}; (b) minus J202 (a) (both seats random, margin 20): ${I.bMinusJ202a ?? '-'}; (a) and (b) minus J205 (a): ${I.aMinusJ205a ?? '-'}, ${I.bMinusJ205a ?? '-'}; minus J204 (a): ${I.aMinusJ204a ?? '-'}, ${I.bMinusJ204a ?? '-'}; each minus J204 (b)'s policy-outlet (SIGNAL's arithmetic, no reading): (a) ${hw(I.aMinusJ204b)}, (b) ${hw(I.bMinusJ204b)}. Each about +-19 between two lines.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k], r = RO[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${r.aRolloutsPerDecision ?? '-'} | ${r.bRolloutsPerDecision ?? '-'} | ${r.ratio ?? '-'} | ${r.aPlayMsPerRollout ?? '-'} / ${r.bPlayMsPerRollout ?? '-'} | ${r.aCopyMsPerRollout ?? '-'} / ${r.bCopyMsPerRollout ?? '-'} | ${hours(m) ?? '-'} |`);
}
L.push(`| J206 ${R6.a ?? '-'} vs ${R6.b ?? '-'} (information) | | | | | | | | ${R6.aRolloutsPerDecision ?? '-'} | ${R6.bRolloutsPerDecision ?? '-'} | ${R6.ratio ?? '-'} | ${R6.aPlayMsPerRollout ?? '-'} / ${R6.bPlayMsPerRollout ?? '-'} | ${R6.aCopyMsPerRollout ?? '-'} / ${R6.bCopyMsPerRollout ?? '-'} | |`);
L.push('');
for (const k of K) {
  const m = M[k], r = RO[k], b = BS[k], c = CF[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Deal blocks ${b.blocks ?? '-'}, ${b.min ?? '-'} to ${b.max ?? '-'}, ${b.games ?? '-'} games (the chain's: ${((v[k] || {}).chainDeals) ?? 0}). Batch lines with config A exactly the arm's ${c.aExact ?? '-'} and config B exactly search-v2's ${c.bExact ?? '-'} of ${c.lines ?? '-'}. Rounds per searched decision ${r.aRoundsPerDecision ?? '-'} / ${r.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${r.aShort ?? '-'} = ${pct(r.aShortShare, 2)} / ${r.bShort ?? '-'} = ${pct(r.bShortShare, 2)}; rollout errors ${r.aRolloutErrors ?? '-'} / ${r.bRolloutErrors ?? '-'}, step caps ${r.aStepCaps ?? '-'} / ${r.bStepCaps ?? '-'}; the rollout reader saw ${r.games ?? '-'} games and ${r.aDecisions ?? '-'} / ${r.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}). Random rollouts ${r.aRrRollouts ?? '-'} of config A's ${r.aRollouts ?? '-'} (the opponent's random seat); search-v2's side ${r.bRrRollouts ?? '-'}; random-seat failures ${r.aRrFailures ?? '-'}. lcb verdicts (none expected): ${JSON.stringify(r.aLcb || {})} / ${JSON.stringify(r.bLcb || {})}.`, '');
}
const dir = (r, s) => (r && r[`${s}PriorityShare`] ? `${pct(r[`${s}PriorityShare`].fromPass, 2)} / ${pct(r[`${s}PriorityShare`].toOther, 2)} / ${pct(r[`${s}PriorityShare`].toPass, 2)}` : '-');
const kd = (r, s) => (r && r[`${s}ChangedShare`] ? `${pct(r[`${s}ChangedShare`].p)} / ${pct(r[`${s}ChangedShare`].a)} / ${pct(r[`${s}ChangedShare`].b)}` : '-');
L.push('| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |', '|---|---|---|');
for (const [label, r, s] of [[`(a) ${M.a.a}`, RO.a, 'a'], ['(a) search-v2', RO.a, 'b'], [`(b) ${M.b.a}`, RO.b, 'a'], ['(b) search-v2', RO.b, 'b'],
  ['J206 search-v2-rrandom4them-lcb-m40 (the opponent alone random, lcb at 40)', R6, 'a'], ['J206 search-v2', R6, 'b'],
  ['J202 (b) search-v2-rrandom4-m40 (both seats random, margin 40)', R2B, 'a'], ['J202 (b) search-v2', R2B, 'b'],
  ['J202 (a) search-v2-rrandom4 (both seats random, margin 20)', R2A, 'a'], ['J202 (a) search-v2', R2A, 'b']]) {
  L.push(`| ${label} | ${kd(r, s)} | ${dir(r, s)} |`);
}
L.push('', "D532 point 7 (expected, not registered): (a)'s overrides above J206's in every kind and near search-v2's, its from-pass share near search-v2's 7.96% rather than J202 (b)'s 16.4%; (b)'s above (a)'s, its attack overrides the question (J202 (a), both seats random at margin 20: attack 19.9% against search-v2's 14.8%).");
const names = [...new Set([...Object.keys(RO.a.aPerRollout || {}), ...Object.keys(RO.b.aPerRollout || {}), ...Object.keys(R6.aPerRollout || {})])].sort((p, q) => ((p.startsWith('v') ? 0 : 1) - (q.startsWith('v') ? 0 : 1)) || p.localeCompare(q));
L.push('', '| search.rr.<name> | (a) fires | (a) per random rollout | (b) fires | (b) per random rollout | J206 per random rollout |', '|---|---|---|---|---|---|');
for (const n of names) {
  const raw = n.replace(/_/g, '.');
  L.push(`| ${raw} | ${(RO.a.aRr || {})[raw] ?? 0} | ${(RO.a.aPerRollout || {})[n] ?? '-'} | ${(RO.b.aRr || {})[raw] ?? 0} | ${(RO.b.aPerRollout || {})[n] ?? '-'} | ${(R6.aPerRollout || {})[n] ?? '-'} |`);
}
L.push(`| rollouts (the denominator) | ${RO.a.aRrRollouts ?? '-'} | 1 | ${RO.b.aRrRollouts ?? '-'} | 1 | 1 |`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k];
  for (const [who, t] of [[`(${k}) ${m.a}`, m.aSearch], [`(${k}) ${m.b}`, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| ${who} | no search | | | | | | | | | |`); continue; }
    const kd2 = t.byKind || {};
    const ch = (q) => (kd2[q] ? `${kd2[q].changed}/${kd2[q].searched} (${pct(kd2[q].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    const ms = t.msMean || {};
    L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
  }
}
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, y]) => `v2.${n} ${y}`), ...Object.entries(g.v3PerRollout || {}).map(([n, y]) => `v3.${n} ${y}`), ...Object.entries(g.v4PerRollout || {}).map(([n, y]) => `v4.${n} ${y}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
for (const k of K) {
  const w = W[k];
  L.push('', `(${k}) ${w.a ?? '-'}: ${w.lost ?? '-'} lost, ${w.won ?? '-'} won, ${w.other ?? '-'} drawn, errored or timed out of ${w.games ?? '-'} batch lines; mean turns ${w.meanTurnsLost ?? '-'} lost, ${w.meanTurnsWon ?? '-'} won; lines whose config A does not end in the rollout value: ${w.aCfgOther ?? '-'}. No life total is on a batch line: a diagnosis replays a game's seed with full recording for it (D523 point 10).`);
  for (const [what, list] of [['the ten longest lost games (turns descending)', w.longest], ['the ten quickest lost games (turns ascending)', w.quickest]]) {
    L.push('', `(${k}) ${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const g of list || []) L.push(row(g));
  }
}
const n = (y) => typeof y === 'number';
for (const k of K) {
  const m = M[k], x = v[k] || {};
  L.push('', `Rule parts, (${k}) at margin ${x.margin ?? '-'}: complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(m.lo) && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(m.elo) && m.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(m.eloHi) && m.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(m.eloLo) && n(m.eloHi) && m.eloLo < 0 && m.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(m.eloLo) && m.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(m.eloHi) && m.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(m.eloHi) && m.eloHi < -15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0} (case 1 ${x.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${x.indistinguishable ?? 0}, no weaker (case 2) ${x.noWeaker ?? 0}, worse, not badly ${x.worseNotBadly ?? 0} (too wide ${x.tooWide ?? 0}, case 3 ${x.upperAtZero ?? 0}), loses badly ${x.losesBadly ?? 0}; candidate ${x.candidate ?? 0}, diagnose ${x.diagnose ?? 0}.`);
}
L.push('', `What follows: both complete ${v.bothComplete ?? 0}; a confirmation ${v.confirm ?? 0} ((a) ${v.confirmA ?? 0}, (b) ${v.confirmB ?? 0}${v.confirmArm ? `: ${v.confirmArm}` : ''}); both lose badly ${v.bothLoseBadly ?? 0}, the track closes ${v.trackCloses ?? 0} (a closing decision owed ${v.closing ?? 0}); random-v9 ${v.v9 ?? 0} at margin ${v.v9Margin ?? 0} ((a) ahead or tied ${v.v9A ?? 0}, (b) ahead ${v.v9B ?? 0}); exactly one followed ${v.follows ?? 0}; kept open ${v.keepsOpen ?? 0}; repost ${v.repost ?? 0} ((a) ${v.repostA ?? 0}, (b) ${v.repostB ?? 0}); self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (both 0 on this night by the rule).`);
for (const [label, f] of [['J206', 'var/ai-ladder/match-J206a.json'], ['J205 (a)', 'var/ai-ladder/match-J205a.json'], ['J204 (a)', 'var/ai-ladder/match-J204a.json'], ['J204 (b)', 'var/ai-ladder/match-J204b.json'], ['J202 (a)', 'var/ai-ladder/match-J202a.json'], ['J202 (b)', 'var/ai-ladder/match-J202b.json']]) {
  const p = read(f);
  L.push('', `${label} on the same deals, at an earlier pin (information): ${p.a ?? '-'} vs ${p.b ?? '-'}, ${p.played ?? '-'} games, complete ${p.complete ?? '-'}, score ${p.score ?? '-'} [${p.lo ?? '-'}, ${p.hi ?? '-'}], Elo ${p.elo ?? '-'} [${p.eloLo ?? '-'}, ${p.eloHi ?? '-'}].`);
}
L.push('', 'Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6], J205 (b) lcb at 60 -34.3 [-47.8, -20.9].');
fs.writeFileSync('var/j207/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J207EOF
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
check: roa.aLcb.overrode + roa.aLcb.held + roa.aLcb.none == 0
check: roa.bLcb.overrode + roa.bLcb.held + roa.bLcb.none == 0
check: rob.aLcb.overrode + rob.aLcb.held + rob.aLcb.none == 0
check: rob.bLcb.overrode + rob.bLcb.held + rob.bLcb.none == 0
check: caa.ok == 1
check: caa.lines >= cma.played
check: cab.ok == 1
check: cab.lines >= cmb.played
check: wa.aCfgOther == 0
check: wb.aCfgOther == 0
check: v.written == 1
check: v.a.names == 1
check: v.a.complete == 1
check: v.b.names == 1
check: v.b.complete == 1
check: v.bothComplete == 1
check: v.a.margin == 40
check: v.b.margin == 20
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
check: v.candidate == 1 or not (v.a.candidate == 1 or v.b.candidate == 1)
check: v.candidate == 0 or (v.a.candidate == 1 or v.b.candidate == 1)
check: v.confirm == v.candidate
check: v.confirmA + v.confirmB == v.confirm
check: v.confirmA == 0 or (v.a.candidate == 1 and (v.b.candidate == 0 or cma.elo >= cmb.elo))
check: v.confirmB == 0 or (v.b.candidate == 1 and (v.a.candidate == 0 or cmb.elo > cma.elo))
check: v.bothLoseBadly == 1 or not (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.bothLoseBadly == 0 or (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.trackCloses == v.bothLoseBadly
check: v.closing == v.trackCloses
check: v.v9 == 1 or not (v.candidate == 0 and v.bothLoseBadly == 0)
check: v.v9 == 0 or (v.candidate == 0 and v.bothLoseBadly == 0)
check: v.confirm + v.trackCloses + v.v9 == 1
check: v.follows == 1
check: v.v9A + v.v9B == v.v9
check: v.v9 == 1 or v.v9Margin == 0
check: v.v9 == 0 or v.v9Margin == 40 or v.v9Margin == 20
check: v.v9Margin == 40 or not (v.v9 == 1 and cma.elo >= cmb.elo)
check: v.v9Margin == 20 or not (v.v9 == 1 and cmb.elo > cma.elo)
check: v.keepsOpen == v.confirm + v.v9
check: v.repost == 0
check: v.repostA == 0
check: v.repostB == 0
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0

The first six checks say both matches are complete: neither was stopped, all 1,200 games of each were played, and at
most one in 20 ended in an engine error or a timeout. The next four say each played 150 deal blocks and the block
reader found every game. The next fourteen say each arm's rollouts were random ones on the batch lines and search-v2's
were not, neither side of either match decided on the lcb rule (the margin rule is D532's whole change from J206), and
every batch line's config A was exactly the arm's (its margin; `caa`, `cab`) and config B exactly search-v2's, with the
`,rollout=random4-them` suffix on every line (`wa`, `wb`). Then the verdict ran on both arms, each at its margin. Then
fourteen for each arm: exactly one of the six readings, D527's table in the runner's own language, row by row, each
both ways, `tooWide` only where it belongs, and `candidate` and `diagnose` the readings' two groups. Then what follows,
each both ways where it can be: a candidate exactly when either arm is one, a confirmation exactly for a candidate,
of (a) only when (a) is a candidate and (b) is not or its point is not higher, of (b) only when (b) is a candidate
and (a) is not or (b)'s point is higher; both losing badly exactly when both do, the track closing exactly then and a
closing decision owed exactly then; random-v9 exactly when neither is a candidate and not both lose badly; exactly one
of the three; random-v9's margin 0 when it does not follow, else 40 or 20, 40 when (a)'s point is at least (b)'s and
20 when (b)'s is higher; kept open exactly on a confirmation or random-v9; no repost; the self-play path closed and the
live seat unchanged. Every value these checks read is a number the verdict always writes (D532, after J206's
`v.v8 == null`); none compares with null or a string. Any reading passes them; a reading is not a failure, and a closed
track is not a failure either. The time per decision, the rollouts, the guardrail counters, the changed answers, the
fallbacks, the worst-lost games and every comparison with an earlier night are reported, not gated.

## Abort if
abort: j207_err >= 30 and j207_err > j207_games / 10

Engine trouble only: once 30 games of the two matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J207a.json
collect: var/ai-ladder/match-J207b.json
collect: var/j207/verdict.json
collect: var/j207/report.md
collect: var/j207/rollouts-a.json
collect: var/j207/rollouts-b.json
collect: var/j207/worst-a.json
collect: var/j207/worst-b.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J199 to J206:
- **each arm's reading under D527's table**: SHOWN, INCONCLUSIVE, NOT SHOWN indistinguishable, NOT SHOWN worse not
  badly, or NOT SHOWN loses badly (and the three unreached cases by name if one occurred), with its score against
  search-v2 and its 95% interval, the same in Elo, and the pair and game counts; for a too-wide interval, say that it
  is "too wide to call" and read as worse, not badly; a SHOWN in D530's restated words (Forge's opponent model leaves
  the rollout loop for this arm once its confirmation holds; Forge stays for the searching seat);
- **what follows, in D532's words:** when `v.confirm` is 1, that a 4,800-game confirmation of the named arm is owed,
  as its own job, before anything, and that random-v9 waits on it (holding, the track reached its goal; failing,
  random-v9 at the margin this rule names from J207's two points); when `v.trackCloses` is 1, that the random-rollout
  track closes now, without random-v9, that the owner is told, with the counters, which way it went, and that a
  closing decision writes it from the track's closing draft, naming what would reopen it; when `v.v9` is 1, that
  random-v9 follows at `v.v9Margin` (a per-rollout mix of search-v2's Forge rollouts and `random4-them` rollouts, new
  Java under its own decision, one 1,200-game match), and that after it the track closes whatever it reads unless its
  arm is a candidate; then, plainly, whatever the reading, that the live seat is unchanged and any change to it is a
  separate decision (a seat-queue row, D509);
- **the comparisons, information only and labelled as across D529's merge** (and across deals for an arm with
  `chainDeals` 0): (b) minus (a); each arm minus J206's arm (the override rule's own effect for (a)); (a) minus J202
  (b) and (b) minus J202 (a) (the seating's effect under the margin rule); minus J205 (a) and J204 (a); each arm minus
  J204 (b)'s policy-outlet with its `hw`, worded as arithmetic, never as a SIGNAL reading;
- **the changed answers by kind and by direction** on both sides of both matches, beside J206's and J202's both-seats
  arms and search-v2's own: whether (a)'s from-pass share stayed near search-v2's (D532 point 7), and what the lower
  margin did to (b)'s attack overrides;
- **the compute each side spent:** ms per decision on both sides and their ratio, by kind; each arm's rollouts and
  rounds per searched decision against search-v2's and against J206's, play and copy ms a rollout, the short
  decisions, rollout errors and step caps, budget fallbacks with their interval and other fallbacks;
- **the guardrails:** each arm's `search.rr.*` counters per random rollout, beside J206's;
- **the worst-lost games:** each arm's ten longest and ten quickest lost games, with the mean turns of lost against
  won games; say that the batch line has no life total;
- **the code:** the pilot's `sd` (the pin's tree the lane tip's; `sd.sinceBase` `players.json` alone; `sd.sinceJ206`
  D529's three files and `players.json`) and the build's decision self-test count (`dst.checks`);
- **the run:** draws, errors and timeouts, the deal blocks (expected 114,900,000-114,900,149 for both), each match's
  hours against its estimate (2.3-2.8 h), the pressure events in STATUS (drops, raises, any stop and its retry), that
  it ran alone (D521), and whether the GPU queue or anything else outside the lab was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it. If an arm stopped early (`complete: false`), say so: it gets no reading, nothing follows from the
night, and what is owed is a repost of that arm, not a reading.

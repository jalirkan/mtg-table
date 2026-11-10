id: J209
title: Random rollouts, iteration 8, the track's last (random-v9, new Java: rollout=mix4-them, a decision's rollouts taken by turns by round between search-v2's Forge rollout and D531's random4-them, round 0 Forge's): one fixed 1,200-game match (600 mirrored pairs, D398, the confirm set, no stopping rule), search-v2-rmix4them-m40 (margin 40, the margin D532 point 4 names from J208's two points) against search-v1-anytime (search-v2), read from its own match under D527's table (its SHOWN row restated by D530 point 7, in D532 point 4's words); a candidate goes to a 4,800-game confirmation, anything else closes the random-rollout track; alone on the machine
public_title: Random rollouts in the search, last try: Forge and random by turns
public_est: ~2 h 30 (one match)
public_decides: Whether mixing Forge and random rollouts helps the search, else the track closes
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@4e8237182c12a9476311d949d35a5100e0920d3b (the merge commit of D533's lane, pc/rollout-random-v9, on main, its first parent main at the merge (429ccd9e, D532's merge and J208's pin, or a main equal to it under every path a match runs), pushed to origin/main before posting; the lane's tip: ce3c098d0b0fa3d47532f79a81c5958b3802ce8b. It carries: rollout=mix4-them (bridge/src/mtgtable/ai/SearchConfig.java, SearchPolicy.java and the case in DecisionSelfTest.java), the ladder's enum value (tools/ai-ladder/kinds.ts), the players search-v2-rmix4them-m40 and search-v2-rmix4them (tools/ai-ladder/players.json), D533's decision file, the PLAN entry and the registry test. Pinned so every game is one code version, D341; the pilot checks, by content, that the pin is that merge (two parents, its second the lane tip), that its tree under every path a match runs (bridge/src, tools/ai-bench, tools/ai-ladder, tools/cubelab/lines.ts and rng.ts, tools/runner/control.ts, tools/ai-ladder.sh, tools/ai-bench.sh, tools/config.sh, forge-home/custom-cards, config.json) is the lane tip's, that its first parent there is J208's pin 429ccd9e, and that there it differs from its first parent and from 429ccd9e in exactly D533's five files, which D533 point 3 reads as leaving every earlier value's play unchanged)
decides: D533 point 7's pre-registered rule, the arm from its own match line alone, every threshold compared in integer tenths of Elo (and ten-thousandths of score) as the line carries them. THE ARM under D527's table against search-v1-anytime, its SHOWN row restated for a random4-them candidate and read for a mix as D532 point 6 reads it: SHOWN (a 4,800-game confirmation under D519's readings, then Forge's opponent model leaves the rollout loop for this arm; Forge stays for the searching seat's own continuation and, under mix4-them, for half the rollouts), INCONCLUSIVE (a 4,800-game confirmation first), NOT SHOWN indistinguishable or no weaker (a candidate, confirmed at 4,800 games), NOT SHOWN worse not badly or loses badly. WHAT FOLLOWS, only when the match is complete, exactly one: a 4,800-game confirmation of the arm, as its own job, when it is a candidate (holding, the random-rollout track closes as reached; failing, it closes); otherwise the random-rollout track closes, with a closing decision (D532 point 6), no further iteration. An incomplete match gives no reading and is reposted alone, and nothing follows until it is read. Every comparison with an earlier job is information, labelled as across D533's merge (which changes bridge/src and by D533 point 3 leaves every earlier value's play unchanged). The self-play-from-random path does not open on any reading; any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on any reading. What is known, on these deals, 1,200 games each against search-v2: J208 (a) search-v2-rrandom4them-m40 -19.1 [-30.3, -8.0] and (b) search-v2-rrandom4them -19.7 [-31.0, -8.4], both NOT SHOWN, worse, not badly (random4-them rollouts on the margin rule at 40 and at 20); J206 search-v2-rrandom4them-lcb-m40 (the same rollouts under lcb at 40) -23.2 [-34.7, -11.7], NOT SHOWN, worse, not badly, 16.28 rollouts a decision against search-v2's 15.45, 50.0 ms a rollout against 51.7; J202 (b) search-v2-rrandom4-m40 (both rollout seats random, margin 40) -20.9 [-34.1, -7.7]; J194 (b) search-v2-ms6000-r48 (x3.14 search-v2's Forge rollouts a decision) +1.7 [-6.7, +10.2] against search-v2. Expected, not registered (D533 point 9): about half the arm's rounds and rollouts random, Forge's rounds at least the random ones, the cost of a decision near search-v2's and J206's; not predicted: the override rates against J208's arm at the same margin, and how often the two kinds disagree. Each reading's noise: the arm's own interval about +-11.5 to +-14 Elo at 1,200 games; a difference between two arms about +-19. Information, not a prediction any check reads
rule: written 2026-11-10 before any rated game of either random-v9 arm, word for word as D533 states it (its point 7; D533's bold dropped): "The pre-registered rule for J209 (written on 2026-11-10 before any rated game of either arm; the night's job quotes it word for word). The arm is the one at the margin D532 point 4 names from J208's two points: the margin of J208's arm with the higher Elo point, 40 for (a) `search-v2-rrandom4them-m40` and 20 for (b) `search-v2-rrandom4them`, 40 when the points are equal; so `search-v2-rmix4them-m40` (`fcf472f384b7`) when that margin is 40 and `search-v2-rmix4them` (`b2592de740c9`) when it is 20. ONE 1,200-game D398 match of that arm against `search-v1-anytime` on the confirm set, `alone: yes`. The arm is read once against `search-v1-anytime` from its match line by the first row of D527's table that holds, the SHOWN row as D530 point 7 restated it for a `random4-them` candidate, in D532 point 4's words: SHOWN (lower end above 0.5 and point at least +15 Elo: Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games), NOT SHOWN, worse, not badly (upper end below 0 and at least −15 Elo: to diagnose), NOT SHOWN, loses badly (upper end below −15 Elo: to diagnose) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly). "Lower end" in the SHOWN and INCONCLUSIVE rows is the match line's `lo`, "point" its `elo`, "interval" and "upper end" its `eloLo` and `eloHi`, the arm the match's first player. A match is complete when its line names the arm and `search-v1-anytime` in that order at their config hashes, says `complete: true`, played all 1,200 games with engine errors plus timeouts at most 60, and carries the four numbers. Every threshold is compared on the numbers the match lines carry: Elo in integer tenths, the score's lower end in integer ten-thousandths. (Under `mix4-them` Forge's opponent model stays in the loop for half the rollouts, so SHOWN's consequence is read as D532 point 6 reads a holding confirmation: the random opponent model is as good as Forge's for the search, Forge staying in the loop for the searching seat's own continuation and, under random-v9, for half the rollouts.) Exactly one of two things follows from a complete match. A confirmation: when the arm is a candidate (SHOWN, INCONCLUSIVE, indistinguishable or no weaker), a 4,800-game confirmation of the arm under D519's readings, posted as its own job; holding, the random-rollout track closes as reached, its closing decision saying so; failing, the track closes. The track closes: otherwise (worse, not badly or loses badly), the random-rollout track closes with a closing decision (D532 point 6), with no further iteration. An incomplete match gives no reading and nothing follows from it: it is reposted alone, as D532 point 4 handles an incomplete arm (the repost is a job of its own in a ladder folder of its own, whose blocks start at 114,900,000, the incomplete line kept and never resumed; an arm incomplete a second time is diagnosed before any third post), and the reposted job applies this rule to its line. Reported beside, deciding nothing: the arm minus J208's arm at the same margin (the mix's own effect, across this lane's change), minus J206's arm and minus J202 (b) or (a) at the same margin; the arm minus J204 (b) with D528's `hw` and interval; each side's overrides of Forge by kind and by direction at priority (`fromPass`, `toOther`, `toPass`) beside J208's, J206's and J202's; ms, rollouts and rounds a decision; Forge and random rounds and rollouts a decision; the best alternative's paired differences by kind and the share of decisions whose two kinds disagreed in sign; every `search.rr.*` per random rollout; the deal blocks; the arm's ten longest and ten quickest lost games. The live seat never changes, and the self-play-from-random path does not open, on any reading of this night." How the night applies it (D533 points 5 to 7). ONE ARM, config A of a fixed match (D398, no stopping rule) of 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt) against search-v1-anytime (cdd55e02a89c): search-v2-rmix4them-m40 (fcf472f384b7; search-v2-rrandom4them-m40's seat config with rollout=mix4-them for rollout=random4-them, margin 40), var/ai-ladder/match-J209a.json. The matchup is new on this host, so it takes the host's match blocks 114,900,000-114,900,149. THE ARM'S MARGIN is the one D532 point 4 names from J208's two points (the higher Elo point's arm, 40 on a tie); the pilot recomputes it from J208's two match lines on this host and checks it is 40 (pj.marginMatches). NUMBERS: every threshold is compared in integers, Elo in tenths (Math.round(x * 10)) and the score's lower end in ten-thousandths, as the match line carries them. COMPLETE: the line names the arm and search-v1-anytime in that order at their config hashes, says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers. THE ARM is read only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15; INCONCLUSIVE when not SHOWN and eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (tooWide and case 3 included). A candidate is SHOWN, INCONCLUSIVE, indistinguishable or no weaker. WHAT FOLLOWS, only when the match is complete, exactly one (follows 1): confirm when the arm is a candidate (closesAsReachedIfHolds 1: a holding confirmation closes the track as reached); trackCloses (and closing) otherwise. repost is 1 when the match is not complete; then follows is 0 and nothing follows from the night. EVERY CHECKED VALUE IS A NUMBER: every flag is 0 or 1, margin 40, the mix counters per decision numbers (0 when unread), and no check compares with null or with a string. selfPlayOpens and liveSeatChanged are 0 in every reading of this night. Reported beside, deciding nothing, each labelled as across D533's merge (which changes bridge/src and by D533 point 3 leaves every earlier value's play unchanged) and, when the blocks are not exactly 114,900,000-114,900,149 with every game (chainDeals 0), as across deals: the arm minus J208's arm at the same margin (search-v2-rrandom4them-m40: the mix's own effect) and minus J208's other arm, minus J206's arm (search-v2-rrandom4them-lcb-m40) and minus J202's arm at the same margin (search-v2-rrandom4-m40, both seats random), the arm minus J204 (b)'s policy-outlet with D528's hw and interval (no reading, no replay, no count); each side's ms per decision (p + a + b, and by kind), rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps; the arm's Forge and random rounds and rollouts per mix decision, the best alternative's paired differences by kind (pairs and mean, in leaf points) and the share of decisions whose two kinds disagreed in sign (a rate, never which kind was right); every search.rr.* counter per random rollout and per game (the opponent's random seat in the random rounds alone); searched and changed decisions by kind and the priority overrides by direction (from a pass, to another play, to a pass) as shares beside J208's, J206's and J202's; budget fallbacks with their interval and other fallbacks; the deal blocks played; the arm's ten longest and ten quickest lost games with their counters. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~2.5 h at 7 workers (an estimate; range 2.2-3 h), 4 h at worst (the match's own stop). From this host at 7 workers, alone, on these same 600 deals: J206, search-v2-rrandom4them-lcb-m40 (random4-them rollouts in every round) against search-v2 at 934 against 917 ms a decision, played its 1,200 games in 2.37 h; J208's arms, random4-them rollouts on the margin rule, at 931 against 913 ms a decision (margin 40) and 879 against 867 (margin 20), played theirs in 2.24 h and 2.40 h. Under mix4-them half the rounds are search-v2's own Forge rollouts and half random4-them's, both seating Forge's continuation for the searching seat, so the arm is guessed at about J206's pace. The match stops itself at --hours 4, which with the pilot (the build compiles the new Java) is under the 5 h timeout; a match that reaches its stop reports complete: false and gives no reading. It runs under the ladder's default 300 s per-game timeout (the arm does not lift maxRounds). Pilot ~15 min (the build, the decision self-test, the bench self-test, the ladder tests, 4 games of the arm on one worker)
resumable: no
timeout: 5h
clean: var/j209 var/ai-ladder-pilot/J209 var/ai-ladder/match-J209a.json
progress: metric j209_games games of 1200
metrics: j209_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const A="search-v2-rmix4them-m40",B="search-v1-anytime";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+A+"\"")&&l.includes("\"b\":\""+B+"\""))n++;console.log(n)'
metrics: j209_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const A="search-v2-rmix4them-m40",B="search-v1-anytime";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+A+"\"")&&l.includes("\"b\":\""+B+"\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J209a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: ro = sh: cat var/j209/rollouts-a.json 2>/dev/null || echo '{"games":0,"aRollouts":0,"aRrRollouts":0,"bRrRollouts":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0},"aMixDecisions":0,"aMixForgeRounds":0,"aMixRandomRounds":0,"aMixForgeRollouts":0,"aMixRandomRollouts":0,"bMixDecisions":0,"bMixForgeRollouts":0,"bMixRandomRollouts":0}'
metrics: bs = sh: cat var/j209/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0,"min":0,"max":0}'
metrics: w = sh: cat var/j209/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0,"aCfgOther":-1}'
metrics: ca = sh: cat var/j209/cfgs-a.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: v = sh: cat var/j209/verdict.json 2>/dev/null || echo '{"written":0,"complete":0,"names":0,"candidate":0,"diagnose":0,"confirm":0,"trackCloses":0,"closing":0,"closesAsReachedIfHolds":0,"follows":0,"repost":0,"selfPlayOpens":0,"liveSeatChanged":0,"margin":0,"armM40":0,"armM20":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"tooWide":0,"upperAtZero":0,"inconclusiveAbove":0,"chainDeals":0,"mix":{"read":0,"decisions":0,"forgeRounds":0,"randomRounds":0,"forgeRoundsPerDecision":0,"randomRoundsPerDecision":0,"forgeRollouts":0,"randomRollouts":0,"forgeRolloutsPerDecision":0,"randomRolloutsPerDecision":0,"pairsForge":0,"pairsRandom":0,"meanDForge":0,"meanDRandom":0,"both":0,"disagree":0,"disagreeShare":0}}'
headline: cm.played, cm.score, cm.elo, cm.eloLo, cm.eloHi, cm.aSearch.msPerDecision, cm.bSearch.msPerDecision, ro.aRolloutsPerDecision, ro.bRolloutsPerDecision, ro.ratio, ro.aPriorityShare.fromPass, ro.bPriorityShare.fromPass, ro.aChangedShare.a, ro.aChangedShare.b, v.shown, v.inconclusive, v.indistinguishable, v.noWeaker, v.worseNotBadly, v.losesBadly, v.candidate, v.confirm, v.trackCloses, v.repost, v.mix.forgeRoundsPerDecision, v.mix.randomRoundsPerDecision, v.mix.meanDForge, v.mix.meanDRandom, v.mix.disagreeShare, v.info.minusJ208Same, v.info.minusJ206, v.info.minusJ204b.diff, v.chainDeals, w.lost
**Why this job** (D533, the eighth and last iteration of D523's point 10 loop: J199 random-v2, J201 random-v3, J202
random-v4, J204 random-v5, J205 random-v6, J206 random-v7, J208 random-v8, and now random-v9; the owner's principle,
in his words as D523 quotes them): "Yes, there are terribly useless situations that will arise from randomized moves,
but you are the agent in the loop who can recognize that, iterate to avoid it, so we waste less time on useless data."
D523 took Forge's judgment out of the search's rollouts and put guarded randomness in; D525 and D527 added and fixed
guardrails; D528 found the override margin the one lever that moved; D530 tried D350's lcb; D531 gave the searching
seat its own continuation back and kept the opponent random; D532 returned to the margin rule. The chain so far, every
arm against search-v1-anytime on these same 600 deals:

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
| random-v8 (J208 a) | search-v2-rrandom4them-m40 | J206's arm on the margin rule, margin 40 | −19.1 [−30.3, −8.0] | worse, not badly |
| random-v8 (J208 b) | search-v2-rrandom4them | the same at search-v2's own margin, 20 | −19.7 [−31.0, −8.4] | worse, not badly |

The random-v8 night is J208: D532 drafted it as J207, whose pilot failed on one metric line of the job file itself
(a `systemd-run`-expanded template literal) before any rated game, and J208 is the same job reposted on the same pin
(429ccd9e). J208 read 2026-11-10: both matches complete, (a) −19.1 Elo [−30.3, −8.0] at margin 40 and (b) −19.7 Elo
[−31.0, −8.4] at margin 20, both NOT SHOWN, worse, not badly; no candidate and not both losing badly, so its verdict
carries `v9` 1 and `v9Margin` 40, the margin of (a), the arm with the higher point (by 0.6 Elo; the two margins are
not told apart). D532 point 5 pre-registered random-v9 as the track's last iteration: a second, differently
wrong opponent model beside Forge's, in the same search, is the one construction left that could add information to
the search rather than replace it (an argument, not a measurement: J194 measured more Forge rollouts of the same kind
buying nothing, +1.7 Elo [-6.7, +10.2] at x3.14 search-v2's rollouts). D533 is
`docs/decisions/D533-random-v9-mix.md` at the pin: its point 1 reads "alternate" by round index, point 2 keeps the
margin rule over the pooled paired differences, point 3 is the Java, point 7 the rule, point 8 the closing; D532
points 4 to 6 the table's words, random-v9 and the closing rule; D531 the random4-them seating; D530 point 7 the
restated SHOWN; D527 the table; D523 the seam and point 10, the iteration loop.

**What is built** (D533, the merge of pc/rollout-random-v9). New Java under `bridge/src/mtgtable/ai/`:
- `SearchConfig.java`: the value `rollout=mix4-them`, `rolloutMix()`, `mixRoundRandom(round)` (odd rounds random) and
  `rolloutRandomThemIn(round)`; `parseLive` refuses it; its random seat is random-v4 (`Config.randomV4Block()`,
  random4-them's).
- `SearchPolicy.java`: `rollout(...)` takes the round's index and builds its limits in `rolloutLimits(cfg, deadline,
  horizon, leafEval, round)`, which reads `rolloutRandomThemIn(round)`: round 0 of a decision plays every candidate's
  rollout as search-v2's (both seats Forge's Default AI, the candidate forced first), round 1 every candidate's as
  random4-them's (the opponent `RolloutController.Random` on random-v4, the searching seat plain Forge), and so on. For
  every earlier value the limits are what they were, whatever the round. The counters, on the arm's batch lines:
  `search.mix.forgeRollouts` / `randomRollouts` (summing to `search.rollouts`), `search.mix.forgeRounds` /
  `randomRounds` (rounds holding a leaf, by kind) and `search.mix.decisions`, and for the best alternative its paired
  differences by kind, `search.mix.pairsForge` / `pairsRandom`, `dForge` / `dRandom` (summed leaf points),
  `search.mix.both` and `search.mix.disagree`.
- `DecisionSelfTest.java`: `rolloutMix4Them`, 21 checks (the build's count is D532's 371 plus 21, 392, 0 failures).
- `tools/ai-ladder/kinds.ts` (the enum value) and `tools/ai-ladder/players.json`: `search-v2-rmix4them-m40`
  (`fcf472f384b7`, `...,margin=40,...,seed=0,anytime=1,rollout=mix4-them`) and `search-v2-rmix4them` (`b2592de740c9`,
  search-v2's own seat config with `,rollout=mix4-them`). **This night plays search-v2-rmix4them-m40** (`fcf472f384b7`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=mix4-them` -- search-v2-rrandom4them-m40's (`179ab0649521`) with the rollout value alone changed;
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hashes are D533's, computed by `registry.ts` on the lane (`web/test/ai-ladder.test.ts` holds them); the pilot
records the real ones (`var/j209-tools/players.json`) and checks the config strings and the hashes
(`pl.hashesAsD533`). The rule is search-v2's margin rule: Forge's answer is overridden when the best candidate's mean
paired difference to it, pooled over both kinds of round, clears 40; no `search.lcb.*` counter is written on
either side.

**The counters.** The arm's batch lines carry D523's, D525's and D527's `search.rr.*` counters (the opponent's random
seat in the random rounds alone) and D533's `search.mix.*`; search-v2's side carries neither. `var/j209-tools/rollouts.cjs`
is J208's reader plus the mix counters: each side's searched and changed decisions by kind, its priority overrides by
direction (`search.p.changed.fromPass`, `toOther`, `toPass`), its lcb verdicts (none expected), and the arm's Forge and
random rounds and rollouts per mix decision, the best alternative's mean paired difference by kind and the
disagreement share. `var/j209-tools/cfgs.cjs` counts the batch lines whose config A is exactly the arm's and config B
exactly search-v2's.

**The worst-lost games** (D523 point 10): `var/j209-tools/worst.cjs` is J208's, unchanged, its mode `mix4-them`.

**The match** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), 1,200 games, 600 pairs,
in the real ladder folder `var/ai-ladder` on this host: **search-v2-rmix4them-m40 vs `search-v1-anytime`**, `--out
var/ai-ladder/match-J209a.json`.

**Deal blocks.** A match's batches take the host's match base (`hostBase(host)` + 900,000 = 114,900,000, `cmdMatch`
in `tools/ai-ladder/cli.ts`) and then the matchup's next unused block (`nextBseed`), counting blocks per unordered
matchup by name (`mkey`). The arm is a new name, so it takes **114,900,000-114,900,149**, the chain's deals. The
reading does not depend on it: the arm and search-v2 play the same deals in their own match, on mirrored pairs. The
blocks matter only to the comparisons with earlier nights (information): a match retried after a memory stop takes
the next unused blocks (114,900,150 onward), and the verdict then marks them as across deals (`v.chainDeals` 0).

**Why one match and no tuning.** The arm changes one thing in an arm already played on these deals (the rollout value
of J208's arm at the same margin), it was registered before any game, and its margin was fixed by D532 point 4 from
J208's two points; the other random-v9 arm is registered and does not play. What follows is D533 point 7: a 4,800-game
confirmation for a candidate, else the track closes. The match never touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523 to D533 name it in their rules): a ladder match plays to
wall-clock budgets, so contention changes the rollouts each side affords; it is admitted only onto an empty machine
and nothing, heavy or light, is admitted beside it; while it is next and waits, nothing newer starts. `cores: 7` keeps
the width J195's to J208's walls were measured at. No `after:`; it starts once the jobs before it have ended (the
pilot reads J208's two match lines, `var/ai-ladder/match-J208a.json` and `match-J208b.json`, for the margin, and the
earlier chain's lines for the report). It may run beside the art session's GPU painting queue, which is outside the
lab and CPU-light but not memory-free; the runner's memory rule handles that as for J206 and J208.
## Pilot
About 15 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac and the decision self-test, D533's `rolloutMix4Them` case inside: the
  first build of the new Java on this host), the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the players (search-v1-anytime, J208's two arms, J206's arm and the two random-v9 arms):
  each random-v9 arm's seat config is its J208 arm's with `rollout=mix4-them` for `rollout=random4-them`, the two
  differ in the margin alone, neither carries `override=` or `z=`; the hashes are D533's;
- the code, by content: the pin is the merge of D533's lane (two parents, its second the lane tip), its tree under
  every path a match runs is the lane tip's (`bridge/src`, `tools/ai-bench` (the set and its decks),
  `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`,
  `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge
  home), `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path)), its first parent there is
  J208's pin `429ccd9e`, and there it differs from its first parent and from `429ccd9e` in exactly D533's five files
  (`SearchConfig.java`, `SearchPolicy.java`, `DecisionSelfTest.java`, `kinds.ts`, `players.json`);
- J208's two match lines are on this host, complete, not both losing badly, and the margin their two points name (the
  higher point's arm, 40 on a tie) is this arm's, 40;
- the verdict script, the rollout reader (with D533's mix counters), the config reader, the worst-games reader and the
  block reader written and tested on synthetic files;
- 4 games of the arm against `search-v1-anytime`, one worker, in the pilot's own folder: both sides search, the reader
  agrees with the match line, **the arm's mix counters are on its batch lines** (Forge and random rounds both counted,
  its Forge and random rollouts summing to its rollouts, its random rollouts counted by `search.rr.rollouts` and its
  guardrails firing), no `search.lcb.*` counter on either side, every line's config A is exactly the arm's and
  config B exactly search-v2's, and search-v2's side carries no `search.rr.*` and no `search.mix.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j209-merged.txt || echo 0 > var/j209-merged.txt
cat var/j209-merged.txt
rc=0; ./bridge/build.sh > var/j209-build.txt 2>&1 || rc=$?
cat var/j209-build.txt
# the build's decision self-test: its line, with 0 failures (D533's mix4-them case, D531's random4-them case and D529's leak verdict inside)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j209-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1,mixCase:/FAIL .*mix4-them/.test(t)?0:1};fs.writeFileSync("var/j209-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the players resolve; each random-v9 arm is its J208 arm with rollout=mix4-them for rollout=random4-them, the two
# differ in the margin alone, and the hashes are D533's
mkdir -p var/j209-tools
./tools/ai-ladder.sh list > var/j209-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom4them-lcb-m40|search-v2-rrandom4them-m40|search-v2-rrandom4them|search-v2-rmix4them-m40|search-v2-rmix4them) ' var/j209-tools/players.txt
node - <<'J209EOF'
// J209's pilot: the players resolve and the random-v9 arms' seat configs are what D533 point 5 says they are.
const fs = require('fs');
const L = fs.readFileSync('var/j209-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), j206 = get('search-v2-rrandom4them-lcb-m40'), t40 = get('search-v2-rrandom4them-m40'), t20 = get('search-v2-rrandom4them');
const x40 = get('search-v2-rmix4them-m40'), x20 = get('search-v2-rmix4them');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const X40CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=mix4-them';
const X20CFG = V1CFG + ',rollout=mix4-them';
const ACFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=40,maxrounds=12,what=pab,seed=0,anytime=1,rollout=mix4-them';
const all = [v1, j206, t40, t20, x40, x20];
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const r = {
  present: all.every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  m40_ok: base && x40 && x40.kind === 'search' && x40.cfg === X40CFG && t40 && x40.cfg === t40.cfg.replace(/,rollout=random4-them$/, ',rollout=mix4-them') && !/override=|,z=/.test(x40.cfg) ? 1 : 0,
  m20_ok: base && x20 && x20.kind === 'search' && x20.cfg === X20CFG && t20 && x20.cfg === t20.cfg.replace(/,rollout=random4-them$/, ',rollout=mix4-them')
    && x40 && x20.cfg === x40.cfg.replace(',margin=40,', ',margin=20,') && !/override=|,z=/.test(x20.cfg) ? 1 : 0,
  arm_ok: ACFG === X40CFG || ACFG === X20CFG ? 1 : 0,
  hashes: Object.fromEntries([['search-v1-anytime', v1], ['search-v2-rrandom4them-lcb-m40', j206], ['search-v2-rrandom4them-m40', t40], ['search-v2-rrandom4them', t20], ['search-v2-rmix4them-m40', x40], ['search-v2-rmix4them', x20]].map(([n, p]) => [n, p?.hash ?? ''])),
  hashesAsD533: v1?.hash === 'cdd55e02a89c' && j206?.hash === '01e2aba2d33e' && t40?.hash === '179ab0649521' && t20?.hash === 'd5381ade9e66' && x40?.hash === 'fcf472f384b7' && x20?.hash === 'b2592de740c9' ? 1 : 0,
  armCfg: ACFG, v1Cfg: v1?.cfg ?? '',
};
r.ok = r.present && r.v1_cfg_ok && r.m40_ok && r.m20_ok && r.arm_ok && r.hashesAsD533 ? 1 : 0;
fs.writeFileSync('var/j209-tools/players.json', JSON.stringify(r, null, 1) + '\n');
fs.writeFileSync('var/j209-tools/cfg-a.txt', ACFG + '\n');
fs.writeFileSync('var/j209-tools/cfg-v1.txt', V1CFG + '\n');
console.log(JSON.stringify(r));
J209EOF
# the code, by content (D533 point 6). HEAD is the runner's checkout of the pin, D533's merge: it must have two parents,
# its second the lane tip; its tree under every path a match runs must be the lane tip's; its first parent there J208's
# pin 429ccd9e; and there it must differ from its first parent and from 429ccd9e in exactly D533's five files.
# A pin with no second parent writes `none` and FAILS the check.
LANE_TIP='ce3c098d0b0fa3d47532f79a81c5958b3802ce8b'
J208PIN='429ccd9e87bd98399282708276a645ab0a17245f'
PATHS='bridge/src tools/ai-bench tools/ai-ladder tools/cubelab/lines.ts tools/cubelab/rng.ts tools/runner/control.ts tools/ai-ladder.sh tools/ai-bench.sh tools/config.sh forge-home/custom-cards config.json'
C=var/j209-tools/code
rm -rf $C && mkdir -p $C
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > $C/parents.txt
git rev-parse -q --verify 'HEAD^2' > $C/parent2.txt 2>/dev/null || { echo none > $C/parent2.txt; echo 'J209 PILOT: HEAD has no second parent: the pin is not a merge' >&2; }
echo "$LANE_TIP" > $C/lanetip.txt
if git diff --quiet "$LANE_TIP" HEAD -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/tree-is-tip.txt
if git diff --quiet "$J208PIN" 'HEAD^1' -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/main-is-j208.txt
git diff --name-only 'HEAD^1' HEAD -- $PATHS > $C/since-parent1.txt 2>/dev/null || echo '(HEAD^1 is not in this checkout)' > $C/since-parent1.txt
git diff --name-only "$J208PIN" HEAD -- $PATHS > $C/since-j208.txt 2>/dev/null || echo '(J208 pin 429ccd9e is not in this checkout)' > $C/since-j208.txt
cat > var/j209-tools/codecheck.cjs <<'J209EOF'
// J209's code check (D533 point 6), by content. Reads the files the pilot's git block wrote into <dir> and writes
// <out>. Each git answer is a file holding 1 (holds), 0 (does not) or the answer itself:
//   parents.txt         the pin's parent count (`git rev-list --parents -n 1 HEAD`): must be 2, a merge
//   parent2.txt         HEAD^2's sha, or `none` when HEAD has no second parent (then the check FAILS, never passes)
//   lanetip.txt         the lane tip the job names (D533's merge's second parent)
//   tree-is-tip.txt     `git diff --quiet <lane tip> HEAD -- <paths>` exited 0: the pin's tree under every path a match
//                       runs IS the lane tip's (another lane's change there, merged first, fails it)
//   main-is-j208.txt    `git diff --quiet 429ccd9e HEAD^1 -- <paths>` exited 0: main there, the merge's first parent,
//                       is J208's pin (D532's merge)
//   since-parent1.txt   `git diff --name-only HEAD^1 HEAD -- <paths>`: what the merge brought there: D533's five files
//   since-j208.txt      `git diff --name-only 429ccd9e HEAD -- <paths>`: the same five files, from J208's pin
// Unlike J208's pin, D533's merge DOES change bridge/src (SearchConfig, SearchPolicy, DecisionSelfTest): the check is
// that it changes exactly those three and the ladder's two files, and nothing else under a match path.
// usage: node codecheck.cjs <dir> <out.json>
const fs = require('fs');
const [dir, out] = process.argv.slice(2);
const lines = (f) => { try { return fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean); } catch { return []; } };
const one = (f) => lines(f)[0] ?? '';
const LANE = ['bridge/src/mtgtable/ai/DecisionSelfTest.java', 'bridge/src/mtgtable/ai/SearchConfig.java', 'bridge/src/mtgtable/ai/SearchPolicy.java',
  'tools/ai-ladder/kinds.ts', 'tools/ai-ladder/players.json'];
const same = (x, want) => x.length === want.length && [...x].sort().every((y, i) => y === want[i]);
const parents = Number(one('parents.txt') || '0');
const parent2 = one('parent2.txt') || 'none', laneTip = one('lanetip.txt');
const p1 = lines('since-parent1.txt'), j208 = lines('since-j208.txt');
const r = {
  parents, parent2, laneTip,
  isMerge: parents === 2 && parent2 !== 'none' ? 1 : 0,
  secondParentIsLaneTip: /^[0-9a-f]{40}$/.test(laneTip) && parent2 === laneTip ? 1 : 0,
  treeIsTip: one('tree-is-tip.txt') === '1' ? 1 : 0,
  mainIsJ208: one('main-is-j208.txt') === '1' ? 1 : 0,
  laneOnly: same(p1, LANE) ? 1 : 0,
  sinceJ208AsRead: same(j208, LANE) ? 1 : 0,
  bridgeFiles: p1.filter((x) => x.startsWith('bridge/src/')).length,
  sinceParent1: p1, sinceJ208: j208, other: p1.filter((x) => !LANE.includes(x)),
};
r.ok = r.isMerge && r.secondParentIsLaneTip && r.treeIsTip && r.mainIsJ208 && r.laneOnly && r.sinceJ208AsRead ? 1 : 0;
r.why = r.ok ? null : !r.isMerge ? "the pin is not a merge (no second parent): not D533's merge, the code check fails"
  : !r.secondParentIsLaneTip ? 'HEAD^2 is not the lane tip the job names'
    : !r.treeIsTip ? 'the pin differs from the lane tip under a path a match runs (another change merged there): redraft the job on the new main (D533 point 6)'
      : !r.mainIsJ208 ? "the merge's first parent differs from J208's pin 429ccd9e under a match path: main moved there; redraft"
        : !r.laneOnly ? "the merge's change under a match path is not exactly D533's five files"
          : "the pin's difference from J208's pin under a match path is not exactly D533's five files";
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
if (!r.ok) { console.error(`J209 PILOT CODE CHECK FAILS: ${r.why}`); process.exitCode = 1; }
J209EOF
node var/j209-tools/codecheck.cjs $C var/j209-tools/search-diff.json
# the code check on synthetic answers: the good merge passes; no second parent, another second parent, a tree that is
# not the tip's, a main that moved, a lane that brought a sixth file, a lane without its bridge files, and a sixth file
# since J208's pin each fail
T=0123456789abcdef0123456789abcdef01234567
LANE5='bridge/src/mtgtable/ai/DecisionSelfTest.java bridge/src/mtgtable/ai/SearchConfig.java bridge/src/mtgtable/ai/SearchPolicy.java tools/ai-ladder/kinds.ts tools/ai-ladder/players.json'
mkc() { d=var/j209-tools/code-selftest/$1; mkdir -p $d; echo "$2" > $d/parents.txt; echo "$3" > $d/parent2.txt; echo $T > $d/lanetip.txt; echo "$4" > $d/tree-is-tip.txt; echo "$5" > $d/main-is-j208.txt; printf '%s\n' $6 > $d/since-parent1.txt; printf '%s\n' $7 > $d/since-j208.txt; node var/j209-tools/codecheck.cjs $d $d/out.json > /dev/null 2>&1 || true; }
rm -rf var/j209-tools/code-selftest
mkc good 2 $T 1 1 "$LANE5" "$LANE5"
mkc noparent 1 none 1 1 "$LANE5" "$LANE5"
mkc otherparent 2 fedcba9876543210fedcba9876543210fedcba98 1 1 "$LANE5" "$LANE5"
mkc nottip 2 $T 0 1 "$LANE5" "$LANE5"
mkc mainmoved 2 $T 1 0 "$LANE5" "$LANE5"
mkc sixth 2 $T 1 1 "$LANE5 bridge/src/mtgtable/ai/Atlas.java" "$LANE5 bridge/src/mtgtable/ai/Atlas.java"
mkc nobridge 2 $T 1 1 'tools/ai-ladder/kinds.ts tools/ai-ladder/players.json' 'tools/ai-ladder/kinds.ts tools/ai-ladder/players.json'
mkc sixthj208 2 $T 1 1 "$LANE5" "$LANE5 tools/ai-bench/AiBench.java"
node -e 'const fs=require("fs");const r=(k)=>JSON.parse(fs.readFileSync(`var/j209-tools/code-selftest/${k}/out.json`,"utf8"));const ok=r("good").ok===1&&r("good").bridgeFiles===3&&r("noparent").ok===0&&r("noparent").isMerge===0&&r("otherparent").ok===0&&r("otherparent").secondParentIsLaneTip===0&&r("nottip").ok===0&&r("nottip").treeIsTip===0&&r("mainmoved").ok===0&&r("mainmoved").mainIsJ208===0&&r("mainmoved").laneOnly===1&&r("sixth").ok===0&&r("sixth").laneOnly===0&&r("nobridge").ok===0&&r("nobridge").laneOnly===0&&r("sixthj208").ok===0&&r("sixthj208").sinceJ208AsRead===0&&r("sixthj208").laneOnly===1?1:0;fs.writeFileSync("var/j209-tools/code-selftest.json",JSON.stringify({ok,cases:8})+"\n");console.log(JSON.stringify({ok,cases:8}))'
```
```bash
cat > var/j209-tools/verdict.mjs <<'J209EOF'
// J209's reading, pre-registered 2026-11-10 before any rated game of either random-v9 arm (the job's rule: line; D533
// point 7: D527's table with D530 point 7's SHOWN restatement, in D532 point 4's words, on ONE arm read from its own
// match; D398's fixed match; D532 point 6's closing rule).
// usage: node verdict.mjs <J209a.json> <rollouts-a.json> <seeds-a.json> <J208a.json> <J208b.json> <J206a.json> <J204b.json> <J202a.json> <J202b.json> <out.json>
//        node verdict.mjs --prior <J208a.json> <J208b.json> <out.json>
//        node verdict.mjs --selftest <scratch dir>
// THE ARM is fixed when the job is assembled (`assemble.mjs --arm m40|m20`, the margin D532 point 4 names from J208's
//   two points): ARM_KEY below. m40: search-v2-rmix4them-m40 (fcf472f384b7); m20: search-v2-rmix4them (b2592de740c9);
//   config A of its match against search-v1-anytime (search-v2, cdd55e02a89c), 1,200 games, 600 mirrored pairs, the
//   confirm set, no stopping rule.
// EVERY THRESHOLD IS COMPARED IN INTEGERS: Elo values in tenths (Math.round(x * 10); a match line carries Elo to 0.1),
//   the score's lower end in ten-thousandths (it carries 4 places).
// EVERY CHECKED VALUE IS A NUMBER (D532, after J206's `v.v8 == null`): every flag is 0 or 1, margin is 40 or 20, and
//   nothing a job's check: line reads is ever null, absent or a string. The mix counters per decision are numbers,
//   0 when unread (mix.read 0). Information-only numbers (the cross-job differences) are null when an input line is
//   missing; no check reads them.
// WHAT FOLLOWS (D533 point 7), only when the match is complete, exactly one of: confirm (the arm a candidate: a
//   4,800-game confirmation under D519's readings, its own job; holding, the track closes as reached; failing, it
//   closes), trackCloses (otherwise: the random-rollout track closes with a closing decision, no further iteration).
//   An incomplete match gives no reading and is reposted alone; then nothing follows.
import fs from 'node:fs';
import path from 'node:path';

export const ARM_KEY = 'm40';
export const ARMS = {
  m40: { arm: ['search-v2-rmix4them-m40', 'fcf472f384b7'], margin: 40, j208: ['search-v2-rrandom4them-m40', '179ab0649521'], j202: ['search-v2-rrandom4-m40', '968c9003c616'] },
  m20: { arm: ['search-v2-rmix4them', 'b2592de740c9'], margin: 20, j208: ['search-v2-rrandom4them', 'd5381ade9e66'], j202: ['search-v2-rrandom4', '646d59a008f6'] },
};
if (!(ARM_KEY in ARMS)) throw new Error(`ARM_KEY is ${ARM_KEY}: the draft was not assembled with --arm m40|m20`);
export const GAMES = 1200;
export const BAR = GAMES / 20;
export const OPP = ['search-v1-anytime', 'cdd55e02a89c'];
export const ARM = ARMS[ARM_KEY].arm;
export const MARGIN = ARMS[ARM_KEY].margin;
export const J208A = ARMS.m40.j208, J208B = ARMS.m20.j208;
export const J208SAME = ARMS[ARM_KEY].j208, J202SAME = ARMS[ARM_KEY].j202;
export const J206 = ['search-v2-rrandom4them-lcb-m40', '01e2aba2d33e'];
export const J204B = ['policy-outlet', 'e350d94649a4'];
export const BLOCK_LO = 114900000, BLOCK_HI = 114900149, BLOCKS = 150;
const READINGS = ['shown', 'inconclusive', 'indistinguishable', 'noWeaker', 'worseNotBadly', 'losesBadly'];
const SHOWN_MEANS = "Forge's opponent model leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it (under mix4-them read as D532 point 6 reads a holding confirmation: Forge stays for the searching seat's own continuation and for half the rollouts)";
const MIXK = ['read', 'decisions', 'forgeRounds', 'randomRounds', 'forgeRoundsPerDecision', 'randomRoundsPerDecision', 'forgeRollouts', 'randomRollouts',
  'forgeRolloutsPerDecision', 'randomRolloutsPerDecision', 'pairsForge', 'pairsRandom', 'meanDForge', 'meanDRandom', 'both', 'disagree', 'disagreeShare'];
// every key a check: line of the job reads off the verdict, by path; the selftest holds each to a number
export const CHECKED = ['written', 'complete', 'names', 'candidate', 'diagnose', 'confirm', 'trackCloses', 'closing', 'closesAsReachedIfHolds', 'follows',
  'repost', 'selfPlayOpens', 'liveSeatChanged', 'margin', 'armM40', 'armM20', ...READINGS, 'tooWide', 'upperAtZero', 'inconclusiveAbove', 'chainDeals',
  ...MIXK.map((x) => `mix.${x}`)];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const n0 = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
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
const missing = (s) => (s.match === 0 ? 'NO MATCH: no reading' : s.names === 0 ? `NOT THIS MATCH: no reading (want ${s.a} at ${s.ah} against ${OPP[0]})` : 'INCOMPLETE: no reading');

// D527's table, as J205's to J208's verdicts read it (unchanged)
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
  return { ...r, reading, candidate, diagnose, tooWide, upperAtZero, inconclusiveAbove };
}

// information only: x minus y on the point, in tenths; with D528's hw and interval when asked (the arm minus J204 (b))
const minus = (x, y) => (x.complete && y && y.complete ? (T(x.elo) - T(y.elo)) / 10 : null);
function withHw(x, y) {
  if (!(x.complete && y && y.complete)) return { diff: null, hw: null, lo: null, hi: null };
  const dT = T(x.elo) - T(y.elo);
  const hwT = Math.sqrt(((T(x.eloHi) - T(x.eloLo)) / 2) ** 2 + ((T(y.eloHi) - T(y.eloLo)) / 2) ** 2);
  return { diff: r1(dT / 10), hw: r1(hwT / 10), lo: r1((dT - hwT) / 10), hi: r1((dT + hwT) / 10) };
}
const chainDeals = (s, played) => (s && s.blocks === BLOCKS && s.min === BLOCK_LO && s.max === BLOCK_HI && s.games >= played && played === GAMES ? 1 : 0);

// J208's two lines: the margin D532 point 4 names from its two points (the higher Elo point's arm, 40 on a tie), whether
// both lose badly (then the track closed and there is no random-v9), and whether either is a candidate (information:
// random-v9 then runs only after that candidate's confirmation failed, which the posting session asserts)
export function prior(m7a, m7b) {
  const a = { ...line(m7a, J208A), ...table(line(m7a, J208A)) }, b = { ...line(m7b, J208B), ...table(line(m7b, J208B)) };
  const both = a.complete && b.complete ? 1 : 0;
  const marginFromJ208 = both ? (T(a.elo) >= T(b.elo) ? 40 : 20) : 0;
  return { j208a: a, j208b: b, j208BothComplete: both, marginFromJ208, marginMatches: both && marginFromJ208 === MARGIN ? 1 : 0,
    j208BothLoseBadly: both && a.losesBadly && b.losesBadly ? 1 : 0, j208Candidate: both && (a.candidate || b.candidate) ? 1 : 0 };
}

function mixOf(ro, sameRun) {
  const g = (k) => (sameRun ? n0(ro[k]) : 0);
  return { read: sameRun ? n0(ro.aMixRead) : 0, decisions: g('aMixDecisions'), forgeRounds: g('aMixForgeRounds'), randomRounds: g('aMixRandomRounds'),
    forgeRoundsPerDecision: g('aMixForgeRoundsPerDecision'), randomRoundsPerDecision: g('aMixRandomRoundsPerDecision'),
    forgeRollouts: g('aMixForgeRollouts'), randomRollouts: g('aMixRandomRollouts'),
    forgeRolloutsPerDecision: g('aMixForgeRolloutsPerDecision'), randomRolloutsPerDecision: g('aMixRandomRolloutsPerDecision'),
    pairsForge: g('aMixPairsForge'), pairsRandom: g('aMixPairsRandom'), meanDForge: g('aMixMeanDForge'), meanDRandom: g('aMixMeanDRandom'),
    both: g('aMixBoth'), disagree: g('aMixDisagree'), disagreeShare: g('aMixDisagreeShare') };
}

export function nightJ209(ma, ro, seeds, m7a, m7b, m6a, m4b, m2a, m2b) {
  const p = prior(m7a, m7b);
  const s0 = line(ma, ARM);
  const x = { ...s0, ...table(s0) };
  const run = typeof ma?.id === 'string' ? ma.id.slice(ma.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && ro !== undefined && run !== null && ro.run === run ? 1 : 0;
  const complete = x.complete;
  const confirm = complete && x.candidate ? 1 : 0;
  const trackCloses = complete && !x.candidate ? 1 : 0;
  const j6 = line(m6a, J206), j4b = line(m4b, J204B), j2same = line(ARM_KEY === 'm40' ? m2b : m2a, J202SAME);
  const j7same = ARM_KEY === 'm40' ? p.j208a : p.j208b;
  const cd = complete ? chainDeals(seeds, x.played) : 0;
  const info = {
    minusJ208Same: minus(x, j7same), minusJ208Other: minus(x, ARM_KEY === 'm40' ? p.j208b : p.j208a), minusJ206: minus(x, j6), minusJ202Same: minus(x, j2same),
    minusJ204b: withHw(x, j4b),
    acrossCode: "every difference with another job is across D533's merge, which changes bridge/src and by D533 point 3 leaves every earlier value's play unchanged; information only",
    acrossDeals: complete && !cd ? 1 : 0,
    cost: { read: sameRun, ratio: sameRun ? num(ro.ratio) : null, aRolloutsPerDecision: sameRun ? num(ro.aRolloutsPerDecision) : null,
      bRolloutsPerDecision: sameRun ? num(ro.bRolloutsPerDecision) : null, aPriorityShare: sameRun ? ro.aPriorityShare ?? null : null,
      bPriorityShare: sameRun ? ro.bPriorityShare ?? null : null, aChangedShare: sameRun ? ro.aChangedShare ?? null : null, bChangedShare: sameRun ? ro.bChangedShare ?? null : null } };
  const reading = [
    p.j208BothComplete ? `J208 re-read: (a) ${p.j208a.reading} ${p.j208a.elo}, (b) ${p.j208b.reading} ${p.j208b.elo}; the margin its two points name ${p.marginFromJ208}, this arm's ${MARGIN} (${p.marginMatches ? 'the same' : 'NOT the same'})` : "J208's two lines are not both on this host complete (the pilot checks them)",
    complete ? `${x.reading}: ${ARM[0]} ${x.elo} Elo [${x.eloLo}, ${x.eloHi}], score ${x.score}, lower end ${x.lo}, margin ${MARGIN}${x.shown ? ` (${SHOWN_MEANS})` : ''}` : missing(x),
    !complete ? 'nothing follows from this night: the match is reposted alone (a job of its own, a ladder folder of its own, blocks from 114,900,000), and the reposted job reads its line by this rule'
      : confirm ? `a 4,800-game confirmation of ${ARM[0]} under D519's readings follows, as its own job; holding, the random-rollout track closes as reached; failing, it closes`
        : "the random-rollout track closes now, with a closing decision written from the track's closing draft (D532 point 6); no further iteration; the owner is told, with the counters, which way it went",
    'the self-play-from-random path does not open on this night', 'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, armKey: ARM_KEY, arm: ARM[0], armHash: ARM[1], margin: MARGIN, armM40: ARM_KEY === 'm40' ? 1 : 0, armM20: ARM_KEY === 'm20' ? 1 : 0,
    ...x, complete, chainDeals: cd, blocks: seeds ? { blocks: seeds.blocks ?? null, min: seeds.min ?? null, max: seeds.max ?? null, games: seeds.games ?? null } : null,
    readingMeans: x.shown ? SHOWN_MEANS : null,
    confirm, trackCloses, closing: trackCloses, closesAsReachedIfHolds: confirm, follows: confirm + trackCloses, repost: complete ? 0 : 1,
    selfPlayOpens: 0, liveSeatChanged: 0, mix: mixOf(ro, sameRun),
    j208: { bothComplete: p.j208BothComplete, marginFromJ208: p.marginFromJ208, marginMatches: p.marginMatches, bothLoseBadly: p.j208BothLoseBadly, candidate: p.j208Candidate },
    info, reading };
}

const get = (o, k) => k.split('.').reduce((x, y) => (x === null || x === undefined ? undefined : x[y]), o);

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (who, hash, elo, half = 13.5, o = {}) => ({ id: `host:run-${who}`, a: who, b: OPP[0], ah: hash, bh: OPP[1], complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.5 + elo / 700, lo: 0.5 + (elo - half) / 700, hi: 0.5 + (elo + half) / 700, elo, eloLo: elo - half, eloHi: elo + half, aSearch: { msPerDecision: 900 }, bSearch: { msPerDecision: 890 }, ...o });
  const A = (elo, o = {}) => mk(ARM[0], ARM[1], elo, o.half ?? 13.5, { id: 'host:run-a', ...o });
  // J208's two lines as the arm's margin needs them (the arm's margin's J208 arm higher), and the information lines
  const hiA = MARGIN === 40;
  const P7A = mk(J208A[0], J208A[1], hiA ? -18 : -22), P7B = mk(J208B[0], J208B[1], hiA ? -22 : -18);
  const P6 = mk(J206[0], J206[1], -23.2, 11.5, { eloLo: -34.7, eloHi: -11.7 }), P4B = mk(J204B[0], J204B[1], -84.4, 15.3, { eloLo: -99.9, eloHi: -69.3 });
  const P2A = mk(ARMS.m20.j202[0], ARMS.m20.j202[1], -39.5, 14.3, { eloLo: -53.9, eloHi: -25.3 }), P2B = mk(ARMS.m40.j202[0], ARMS.m40.j202[1], -20.9, 13.2, { eloLo: -34.1, eloHi: -7.7 });
  const S = (o = {}) => ({ purpose: 'match:x', games: GAMES, blocks: BLOCKS, min: BLOCK_LO, max: BLOCK_HI, ...o });
  const RO = (run, o = {}) => ({ run, ratio: 1.03, aRolloutsPerDecision: 16.0, bRolloutsPerDecision: 15.5, aMixRead: 1, aMixDecisions: 1000, aMixForgeRounds: 5600, aMixRandomRounds: 5300,
    aMixForgeRoundsPerDecision: 5.6, aMixRandomRoundsPerDecision: 5.3, aMixForgeRollouts: 8200, aMixRandomRollouts: 7800, aMixForgeRolloutsPerDecision: 8.2, aMixRandomRolloutsPerDecision: 7.8,
    aMixPairsForge: 4000, aMixPairsRandom: 3800, aMixMeanDForge: -12.5, aMixMeanDRandom: 4.25, aMixBoth: 700, aMixDisagree: 210, aMixDisagreeShare: 0.3, ...o });
  const all = (ma, o = {}) => [ma, 'ro' in o ? o.ro : RO('run-a'), 'sa' in o ? o.sa : S(), 'm7a' in o ? o.m7a : P7A, 'm7b' in o ? o.m7b : P7B,
    'm6a' in o ? o.m6a : P6, 'm4b' in o ? o.m4b : P4B, 'm2a' in o ? o.m2a : P2A, 'm2b' in o ? o.m2b : P2B];
  const one = (r) => (r.complete === 0 ? READINGS.every((k) => r[k] === 0) && r.candidate + r.diagnose === 0 : READINGS.reduce((y, k) => y + r[k], 0) === 1 && r.candidate + r.diagnose === 1);
  const numbers = (r) => CHECKED.every((k) => typeof get(r, k) === 'number' && Number.isFinite(get(r, k)));
  const sane = (r) => numbers(r) && r.liveSeatChanged === 0 && r.selfPlayOpens === 0 && one(r) && r.margin === MARGIN && r.armM40 + r.armM20 === 1
    && r.follows === (r.complete ? 1 : 0) && r.confirm + r.trackCloses === r.follows && r.confirm === (r.complete && r.candidate ? 1 : 0)
    && r.trackCloses === (r.complete && r.diagnose ? 1 : 0) && r.closing === r.trackCloses && r.closesAsReachedIfHolds === r.confirm
    && r.repost === 1 - r.complete;
  const rows = { shown: 0, inconclusive: 0, indistinguishable: 0, noWeaker: 0, worseNotBadly: 0, losesBadly: 0 };
  const cases = [
    // ---- each of the table's rows, and what follows
    ['worse, not badly (-15 +-13.5): the track closes', all(A(-15)),
      (r) => r.worseNotBadly === 1 && r.trackCloses === 1 && r.closing === 1 && r.confirm === 0 && r.reading[2].startsWith('the random-rollout track closes now')
        && r.info.minusJ208Same === 3 && r.info.minusJ206 === 8.2 && r.info.minusJ204b.diff === 69.4 && r.j208.marginMatches === 1],
    ['loses badly (-30): the track closes', all(A(-30)), (r) => r.losesBadly === 1 && r.trackCloses === 1 && r.confirm === 0],
    ['indistinguishable (0 +-9.5): confirm', all(A(0, { half: 9.5 })), (r) => r.indistinguishable === 1 && r.candidate === 1 && r.confirm === 1 && r.trackCloses === 0 && r.closesAsReachedIfHolds === 1],
    ['no weaker (case 2: an interval wholly at or above 0 under +15): confirm', all(A(4.5, { lo: 0.5, eloLo: 0, eloHi: 9 })), (r) => r.noWeaker === 1 && r.confirm === 1],
    ['INCONCLUSIVE (an upper end of exactly +15): confirm', all(A(5.5, { eloLo: -4, eloHi: 15 })), (r) => r.inconclusive === 1 && r.confirm === 1],
    ["SHOWN (+20.9, lower end 0.518): confirm, D530's restated SHOWN", all(A(20.9, { lo: 0.518, eloLo: 11.4, eloHi: 30.4 })),
      (r) => r.shown === 1 && r.confirm === 1 && r.readingMeans.startsWith("Forge's opponent model") && r.reading[1].includes('half the rollouts')],
    // ---- D527's table, its edges, in integers
    ['a lower end above 0.5 with a point of +14.9: INCONCLUSIVE (case 1)', all(A(14.9, { lo: 0.505, eloLo: 5.4, eloHi: 24.4 })), (r) => r.inconclusive === 1 && r.inconclusiveAbove === 1 && r.confirm === 1],
    ['a lower end of -14.9 containing 0: indistinguishable', all(A(-5, { eloLo: -14.9, eloHi: 4.9 })), (r) => r.indistinguishable === 1],
    ['a lower end of exactly -15 containing 0: too wide, worse not badly', all(A(-5.1, { eloLo: -15, eloHi: 4.8 })), (r) => r.worseNotBadly === 1 && r.tooWide === 1 && r.trackCloses === 1],
    ['an upper end of exactly -15: worse, not badly', all(A(-24.5, { eloLo: -34, eloHi: -15 })), (r) => r.worseNotBadly === 1 && r.losesBadly === 0],
    ['an upper end of -15.1: loses badly', all(A(-24.6, { eloLo: -34.1, eloHi: -15.1 })), (r) => r.losesBadly === 1],
    ['an upper end of -15.1 + 0.1 (-14.999999999999998) is -15.0: worse, not badly', all(A(-24.5, { eloLo: -34, eloHi: -15.1 + 0.1 })), (r) => r.worseNotBadly === 1],
    ['an upper end of exactly 0: worse, not badly (case 3)', all(A(-9.5, { eloLo: -19, eloHi: 0 })), (r) => r.worseNotBadly === 1 && r.upperAtZero === 1],
    ['an upper end of 0.3 - 0.1 - 0.2 (about -2.8e-17) is exactly 0 (case 3)', all(A(-9.5, { eloLo: -19, eloHi: 0.3 - 0.1 - 0.2 })), (r) => r.upperAtZero === 1],
    ['a point of 15.1 - 0.1 with the lower end above 0.5 is SHOWN (+15.0)', all(A(15.1 - 0.1, { lo: 0.505, eloLo: 5.5, eloHi: 24.5 })), (r) => r.shown === 1],
    ['a lower end of exactly 0.5 with a point of +15: INCONCLUSIVE, not SHOWN', all(A(15, { lo: 0.5, eloLo: 0, eloHi: 30 })), (r) => r.inconclusive === 1 && r.shown === 0],
    // ---- completeness: nothing follows until the line is read
    ['1,199 games: incomplete, reposted, nothing follows', all(A(-15, { played: 1199 })), (r) => r.complete === 0 && r.repost === 1 && r.follows === 0 && r.trackCloses === 0],
    ['missing: reposted, nothing follows', all(null), (r) => r.match === 0 && r.repost === 1 && r.follows === 0],
    ['stopped at its hours (complete: false), a candidate on the point: no confirmation', all({ ...A(0, { half: 9.5 }), complete: false, played: 900 }), (r) => r.confirm === 0 && r.repost === 1],
    ['61 errors and timeouts: incomplete', all(A(-15, { errors: 40, timeouts: 21 })), (r) => r.complete === 0 && r.repost === 1],
    ['60 errors and timeouts: complete', all(A(-15, { errors: 40, timeouts: 20 })), (r) => r.complete === 1 && r.trackCloses === 1],
    ['the players swapped: not this match', all({ ...A(20), a: OPP[0], b: ARM[0], ah: OPP[1], bh: ARM[1] }), (r) => r.names === 0 && r.repost === 1],
    ["J208's arm at the same margin (random4-them) in the file: not random-v9", all(mk(J208SAME[0], J208SAME[1], -15, 13.5, { id: 'host:run-a' })), (r) => r.names === 0 && r.complete === 0],
    ['the other random-v9 arm in the file: not this match', all(mk(ARMS[ARM_KEY === 'm40' ? 'm20' : 'm40'].arm[0], ARMS[ARM_KEY === 'm40' ? 'm20' : 'm40'].arm[1], -15, 13.5, { id: 'host:run-a' })), (r) => r.names === 0],
    ['the arm at another hash: not this match', all(A(-15, { ah: '000000000000' })), (r) => r.names === 0],
    // ---- the mix counters, numbers whatever is read
    ["the mix counters per decision from the arm's own run", all(A(-15)), (r) => r.mix.read === 1 && r.mix.forgeRoundsPerDecision === 5.6 && r.mix.randomRoundsPerDecision === 5.3 && r.mix.disagreeShare === 0.3 && r.mix.meanDForge === -12.5],
    ["another run's rollouts: the mix counters read 0, what follows unchanged", all(A(-15), { ro: RO('run-x') }), (r) => r.mix.read === 0 && r.mix.decisions === 0 && r.mix.forgeRoundsPerDecision === 0 && r.trackCloses === 1],
    ['no rollouts file: the mix counters read 0', all(A(0, { half: 9.5 }), { ro: null }), (r) => r.mix.read === 0 && r.confirm === 1],
    // ---- J208's lines (the pilot's premise) and the information lines never change what follows
    ["J208's other arm higher: the margin its points name is not this arm's (marginMatches 0), what follows unchanged", all(A(-15), { m7a: mk(J208A[0], J208A[1], hiA ? -22 : -18), m7b: mk(J208B[0], J208B[1], hiA ? -18 : -22) }),
      (r) => r.j208.marginMatches === 0 && r.j208.marginFromJ208 === (hiA ? 20 : 40) && r.trackCloses === 1],
    ["J208's two points equal: 40", all(A(-15), { m7a: mk(J208A[0], J208A[1], -20), m7b: mk(J208B[0], J208B[1], -20) }), (r) => r.j208.marginFromJ208 === 40 && r.j208.marginMatches === (MARGIN === 40 ? 1 : 0)],
    ["J208 missing: unread, what follows unchanged", all(A(-15), { m7a: null, m7b: null }), (r) => r.j208.bothComplete === 0 && r.j208.marginFromJ208 === 0 && r.info.minusJ208Same === null && r.trackCloses === 1],
    ['J204 (b) missing: the arm minus the baseline unread', all(A(-15), { m4b: null }), (r) => r.info.minusJ204b.diff === null && r.trackCloses === 1],
    ['the blocks moved (a memory retry): read as always, its cross-job numbers marked across deals', all(A(-15), { sa: S({ min: 114900150, max: 114900299 }) }), (r) => r.chainDeals === 0 && r.info.acrossDeals === 1 && r.trackCloses === 1],
    ['no seeds file: not the chain\'s deals, read as always', all(A(0, { half: 9.5 }), { sa: null }), (r) => r.chainDeals === 0 && r.confirm === 1],
  ];
  let passed = 0;
  cases.forEach(([what, ms, pred], i) => {
    const files = ms.map((x, j) => {
      const f = path.join(scratch, `case-208-${i}-${j}.json`);
      if (x !== null) fs.writeFileSync(f, JSON.stringify(x)); else fs.rmSync(f, { force: true });
      return f;
    });
    const r = nightJ209(...files.map(read));
    const pass = pred(r) && sane(r);
    if (pass && r.complete) for (const k of READINGS) rows[k] += r[k];
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading.slice(1, 3).join(' | ')}`);
    if (pass) passed++;
  });
  return { selftest: 1, armKey: ARM_KEY, cases: cases.length, passed, ok: passed === cases.length && READINGS.every((k) => rows[k] > 0) ? 1 : 0, rows };
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest') {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv[0] === '--prior' && argv.length === 4) {
  const p = prior(read(argv[1]), read(argv[2]));
  const r = { j208BothComplete: p.j208BothComplete, marginFromJ208: p.marginFromJ208, marginMatches: p.marginMatches, j208BothLoseBadly: p.j208BothLoseBadly,
    j208Candidate: p.j208Candidate, armMargin: MARGIN, j208a: { reading: p.j208a.reading, elo: p.j208a.elo }, j208b: { reading: p.j208b.reading, elo: p.j208b.elo } };
  fs.mkdirSync(path.dirname(argv[3]), { recursive: true });
  fs.writeFileSync(argv[3], JSON.stringify(r) + '\n');
  console.log(JSON.stringify(r));
} else if (argv.length === 10) {
  const r = nightJ209(...argv.slice(0, 9).map(read));
  fs.mkdirSync(path.dirname(argv[9]), { recursive: true });
  fs.writeFileSync(argv[9], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <J209a> <rollouts-a> <seeds-a> <J208a> <J208b> <J206a> <J204b> <J202a> <J202b> <out.json> | --prior <J208a> <J208b> <out.json> | --selftest <dir>');
  process.exit(2);
}
J209EOF
cat > var/j209-tools/rollouts.cjs <<'J209EOF'
// J209 (D533): J208's reader plus D533's `search.mix.*` counters (below). J208's: (J206's, unchanged; J205's, unchanged; under rollout=random4-them the arm's search.rr.* are the opponent's random seat's alone, counted into the
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
// D533 (J209): each side's `search.mix.*` counters (`forgeRollouts`, `randomRollouts`, `forgeRounds`, `randomRounds`,
// `decisions`, `pairsForge`, `pairsRandom`, `dForge`, `dRandom`, `both`, `disagree`), summed, as `<side>Mix<Name>` (0 when
// absent: search-v2's side writes none), with Forge and random rounds and rollouts per mix decision, the best
// alternative's mean paired difference by kind (dForge / pairsForge, dRandom / pairsRandom, in leaf points) and the
// disagreement share (disagree / both); the per-decision and mean values are 0 when their denominator is 0, and
// <side>MixRead says whether any mix decision was read.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, playUs: 0, copyUs: 0, rolloutErrors: 0, stepCap: 0, rr: {}, prr: {}, pol: {}, polGames: 0, lines: 0, lcb: { overrode: 0, held: 0, none: 0 }, kd: { p: [0, 0], a: [0, 0], b: [0, 0] }, dir: { fromPass: 0, toOther: 0, toPass: 0 }, mix: Object.fromEntries(MIX.map((x) => [x, 0])) });
const MIX = ['forgeRollouts', 'randomRollouts', 'forgeRounds', 'randomRounds', 'decisions', 'pairsForge', 'pairsRandom', 'dForge', 'dRandom', 'both', 'disagree'];
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
      for (const x of MIX) s.mix[x] += n(`search.mix.${x}`);
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
  const mx = s.mix, q = (x, y) => (y > 0 ? r4(x / y) : 0), cap = (x) => x[0].toUpperCase() + x.slice(1);
  for (const x of MIX) r[`${k}Mix${cap(x)}`] = mx[x];
  Object.assign(r, {
    [`${k}MixRead`]: mx.decisions > 0 ? 1 : 0,
    [`${k}MixForgeRoundsPerDecision`]: q(mx.forgeRounds, mx.decisions), [`${k}MixRandomRoundsPerDecision`]: q(mx.randomRounds, mx.decisions),
    [`${k}MixForgeRolloutsPerDecision`]: q(mx.forgeRollouts, mx.decisions), [`${k}MixRandomRolloutsPerDecision`]: q(mx.randomRollouts, mx.decisions),
    [`${k}MixMeanDForge`]: q(mx.dForge, mx.pairsForge), [`${k}MixMeanDRandom`]: q(mx.dRandom, mx.pairsRandom),
    [`${k}MixDisagreeShare`]: q(mx.disagree, mx.both),
  });
}
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run: r.run, games: r.games, aRolloutsPerDecision: r.aRolloutsPerDecision, bRolloutsPerDecision: r.bRolloutsPerDecision, ratio: r.ratio, aRrRollouts: r.aRrRollouts, bRrRollouts: r.bRrRollouts, aV2Fires: r.aV2Fires, aV3Fires: r.aV3Fires, aV4Fires: r.aV4Fires, aPolicy: r.aPolicy, aPolicyGames: r.aPolicyGames, bPolicy: r.bPolicy, bPolicyGames: r.bPolicyGames, aLcb: r.aLcb, bLcb: r.bLcb, aPriorityShare: r.aPriorityShare, bPriorityShare: r.bPriorityShare, aMixDecisions: r.aMixDecisions, aMixForgeRounds: r.aMixForgeRounds, aMixRandomRounds: r.aMixRandomRounds, aMixForgeRollouts: r.aMixForgeRollouts, aMixRandomRollouts: r.aMixRandomRollouts, bMixDecisions: r.bMixDecisions, aMixDisagreeShare: r.aMixDisagreeShare, aPerRollout: r.aPerRollout }));
J209EOF
cat > var/j209-tools/worst.cjs <<'J209EOF'
// J209 (J208's, unchanged; its mode argument is mix4-them). J208's: (J206's, unchanged; J205's, J204's and J202's, unchanged): the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 and D527 continue it). A batch line has no life total, so the
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
J209EOF
cat > var/j209-tools/seeds.cjs <<'J209EOF'
// J209 (J208's, unchanged; J206's, unchanged; J205's, J204's and J202's, unchanged): which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
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
J209EOF
cat > var/j209-tools/cfgs.cjs <<'J209EOF'
// J209 (J208's cfgs.cjs, unchanged; D532): the seat configs a match's batch lines actually played. Reads every batch line of the match's run
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
J209EOF
rm -rf var/j209-tools/selftest
node var/j209-tools/verdict.mjs --selftest var/j209-tools/selftest > var/j209-tools/selftest.json
cat var/j209-tools/selftest.json
# J208's two lines on this host: both complete, not both losing badly, and the margin their points name is this arm's
node var/j209-tools/verdict.mjs --prior var/ai-ladder/match-J208a.json var/ai-ladder/match-J208b.json var/j209-tools/j208.json
# the rollout reader and the worst-games reader on a synthetic batch folder: three games; the arm (A) wins one, loses
# two, with mix counters, priority overrides by direction and the opponent random seat's guardrails on its side;
# search-v2 (B) carries no search.rr.*, no search.mix.* and no search.lcb.* key
rm -rf var/j209-tools/ro-selftest
mkdir -p var/j209-tools/ro-selftest/batches/run-s
C="$(cat var/j209-tools/cfg-a.txt)"
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"'","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.p.changed.fromPass":2,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":80,"search.rr.v2.ownStack":160,"search.rr.v3.goodBlock":8,"search.mix.forgeRollouts":82,"search.mix.randomRollouts":78,"search.mix.forgeRounds":33,"search.mix.randomRounds":30,"search.mix.decisions":10,"search.mix.pairsForge":20,"search.mix.pairsRandom":18,"search.mix.dForge":-100,"search.mix.dRandom":90,"search.mix.both":6,"search.mix.disagree":2}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10,"search.p.changed":1,"search.p.changed.toPass":1,"policy.LETHAL":2}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"'","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":80,"search.rr.v2.ownStack":80,"search.rr.failures":1,"search.mix.forgeRollouts":80,"search.mix.randomRollouts":80,"search.mix.forgeRounds":32,"search.mix.randomRounds":32,"search.mix.decisions":10,"search.mix.pairsForge":20,"search.mix.pairsRandom":20,"search.mix.dForge":-20,"search.mix.dRandom":10,"search.mix.both":5,"search.mix.disagree":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10,"search.b.changed":2}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"'","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.b.considered":10,"search.b.changed":1,"search.rr.rollouts":80,"search.rr.v2.castSomething":8,"search.rr.v4.goodBlockRefused":4,"search.mix.forgeRollouts":82,"search.mix.randomRollouts":78,"search.mix.forgeRounds":35,"search.mix.randomRounds":28,"search.mix.decisions":10,"search.mix.pairsForge":20,"search.mix.pairsRandom":22,"search.mix.dForge":0,"search.mix.dRandom":0,"search.mix.both":4,"search.mix.disagree":0}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10,"policy.COMBAT":1}}}' \
  > var/j209-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rmix4them-m40","b":"search-v1-anytime"}' > var/j209-tools/ro-selftest/match.json
node var/j209-tools/rollouts.cjs var/j209-tools/ro-selftest var/j209-tools/ro-selftest/match.json var/j209-tools/ro-selftest/out.json
node var/j209-tools/worst.cjs var/j209-tools/ro-selftest var/j209-tools/ro-selftest/match.json mix4-them var/j209-tools/ro-selftest/worst.json
node var/j209-tools/worst.cjs var/j209-tools/ro-selftest var/j209-tools/ro-selftest/match.json random4-them var/j209-tools/ro-selftest/worst-r4t.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j209-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j209-tools/ro-selftest/worst.json","utf8"));const w4=JSON.parse(fs.readFileSync("var/j209-tools/ro-selftest/worst-r4t.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.ratio===1.2&&r.aRrRollouts===240&&r.bRrRollouts===0&&r.aRrFailures===1&&r.aLcb.overrode+r.aLcb.held+r.aLcb.none===0&&r.aMixRead===1&&r.aMixDecisions===30&&r.aMixForgeRounds===100&&r.aMixRandomRounds===90&&r.aMixForgeRollouts+r.aMixRandomRollouts===r.aRollouts&&r.aMixRandomRollouts===236&&r.aMixForgeRoundsPerDecision===3.3333&&r.aMixRandomRoundsPerDecision===3&&r.aMixMeanDForge===-2&&r.aMixMeanDRandom===1.6667&&r.aMixBoth===15&&r.aMixDisagree===3&&r.aMixDisagreeShare===0.2&&r.bMixRead===0&&r.bMixDecisions===0&&r.bMixForgeRollouts+r.bMixRandomRollouts===0&&r.bMixForgeRoundsPerDecision===0&&r.aPriorityShare.fromPass===0.1111&&r.bPriorityShare.toPass===0.05&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w4.aCfgOther===3&&w.longest[0].seed===11&&w.quickest[0].seed===13?1:0;fs.writeFileSync("var/j209-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the config reader on a synthetic folder: three lines; one with config A exactly the arm's, two with another (J208's
# arm at the same margin, and search-v2's with random4-them); config B exactly search-v2's on two lines, another on one
rm -rf var/j209-tools/cfg-selftest
mkdir -p var/j209-tools/cfg-selftest/batches/run-c
V1="$(cat var/j209-tools/cfg-v1.txt)"
A="$(cat var/j209-tools/cfg-a.txt)"
printf '%s\n' '{"a":"'"$A"'","b":"'"$V1"'"}' '{"a":"'"${A%,rollout=mix4-them}"',rollout=random4-them","b":"'"$V1"'"}' '{"a":"'"$V1"',rollout=random4-them","b":"'"$V1"',rollout=random4"}' > var/j209-tools/cfg-selftest/batches/run-c/b0.jsonl
echo '{"id":"h:run-c"}' > var/j209-tools/cfg-selftest/match.json
node var/j209-tools/cfgs.cjs var/j209-tools/cfg-selftest var/j209-tools/cfg-selftest/match.json "$A" "$V1" var/j209-tools/cfg-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j209-tools/cfg-selftest/out.json","utf8"));const ok=r.lines===3&&r.aExact===1&&r.bExact===2&&r.aOther===2&&r.bOther===1&&r.ok===0?1:0;require("fs").writeFileSync("var/j209-tools/cfg-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j209-tools/seeds-selftest
mkdir -p var/j209-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j209-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j209-tools/seeds-selftest/match.json
node var/j209-tools/seeds.cjs var/j209-tools/seeds-selftest var/j209-tools/seeds-selftest/match.json var/j209-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j209-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j209-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of the arm (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range; each
# side's rollouts, search.rr.*, search.mix.*, search.lcb.* and policy.* counters from the batch; the config reader and
# the worst-games reader on it
V1="$(cat var/j209-tools/cfg-v1.txt)"
./tools/ai-ladder.sh match search-v2-rmix4them-m40 search-v1-anytime --games 4 --batch-pairs 1 --host j209-pilot --purpose pilot --dir var/ai-ladder-pilot/J209 --experiments var/ai-ladder-pilot/J209/experiments.jsonl --out var/ai-ladder-pilot/J209/match-a.json --jobs 1
node var/j209-tools/rollouts.cjs var/ai-ladder-pilot/J209 var/ai-ladder-pilot/J209/match-a.json var/j209-tools/rollouts-pilot-a.json
node var/j209-tools/cfgs.cjs var/ai-ladder-pilot/J209 var/ai-ladder-pilot/J209/match-a.json "$(cat var/j209-tools/cfg-a.txt)" "$V1" var/j209-tools/cfgs-pilot-a.json
node var/j209-tools/worst.cjs var/ai-ladder-pilot/J209 var/ai-ladder-pilot/J209/match-a.json mix4-them var/j209-tools/worst-pilot-a.json
```
metrics: merged = sh: cat var/j209-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j209-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1,"mixCase":0}'
metrics: pl = sh: cat var/j209-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"v1_cfg_ok":0,"m40_ok":0,"m20_ok":0,"arm_ok":0,"hashesAsD533":0}'
metrics: sd = sh: cat var/j209-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"isMerge":0,"secondParentIsLaneTip":0,"treeIsTip":0,"mainIsJ208":0,"laneOnly":0,"sinceJ208AsRead":0,"bridgeFiles":0}'
metrics: cst = sh: cat var/j209-tools/code-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0}'
metrics: st = sh: cat var/j209-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: pj = sh: cat var/j209-tools/j208.json 2>/dev/null || echo '{"j208BothComplete":0,"marginFromJ208":0,"marginMatches":0,"j208BothLoseBadly":0,"j208Candidate":0,"armMargin":0}'
metrics: rst = sh: cat var/j209-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: cfst = sh: cat var/j209-tools/cfg-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j209-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J209/match-a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"aSearch":{"searched":0,"msPerDecision":0},"bSearch":{"searched":0,"msPerDecision":0}}'
metrics: pmn = sh: node -e 'let a=0;try{const x=JSON.parse(require("fs").readFileSync("var/ai-ladder-pilot/J209/match-a.json","utf8"));a=x.a==="search-v2-rmix4them-m40"&&x.ah==="fcf472f384b7"&&x.b==="search-v1-anytime"&&x.bh==="cdd55e02a89c"?1:0}catch(e){}console.log(JSON.stringify({a:a}))'
metrics: pra = sh: cat var/j209-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0,"aDecisions":0,"bDecisions":0,"aRollouts":0,"aRrRollouts":0,"bRrRollouts":0,"aV2Fires":0,"aLcb":{"overrode":0,"held":0,"none":0},"bLcb":{"overrode":0,"held":0,"none":0},"aMixDecisions":0,"aMixForgeRounds":0,"aMixRandomRounds":0,"aMixForgeRollouts":0,"aMixRandomRollouts":0,"bMixDecisions":0,"bMixForgeRollouts":0,"bMixRandomRollouts":0}'
metrics: pca = sh: cat var/j209-tools/cfgs-pilot-a.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: pwa = sh: cat var/j209-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: dst.ok == 1
check: dst.checks >= 392
check: dst.mixCase == 1
check: pl.ok == 1
check: pl.m40_ok == 1
check: pl.m20_ok == 1
check: pl.arm_ok == 1
check: pl.hashesAsD533 == 1
check: sd.parents == 2
check: sd.isMerge == 1
check: sd.secondParentIsLaneTip == 1
check: sd.treeIsTip == 1
check: sd.mainIsJ208 == 1
check: sd.laneOnly == 1
check: sd.sinceJ208AsRead == 1
check: sd.bridgeFiles == 3
check: sd.ok == 1
check: cst.ok == 1
check: cst.cases == 8
check: st.ok == 1
check: st.cases == 34
check: st.passed == 34
check: pj.j208BothComplete == 1
check: pj.j208BothLoseBadly == 0
check: pj.marginMatches == 1
check: pj.marginFromJ208 == 40
check: pj.armMargin == 40
check: rst.ok == 1
check: cfst.ok == 1
check: sst.ok == 1
check: pmn.a == 1
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
check: pra.aLcb.overrode + pra.aLcb.held + pra.aLcb.none == 0
check: pra.bLcb.overrode + pra.bLcb.held + pra.bLcb.none == 0
check: pra.aMixDecisions > 0
check: pra.aMixForgeRounds > 0
check: pra.aMixRandomRounds > 0
check: pra.aMixForgeRollouts + pra.aMixRandomRollouts == pra.aRollouts
check: pra.aRrRollouts >= pra.aMixRandomRollouts
check: pra.bMixDecisions == 0
check: pra.bMixForgeRollouts + pra.bMixRandomRollouts == 0
check: pca.ok == 1
check: pca.lines >= pma.played
check: pwa.games == 4
check: pwa.aCfgOther == 0
check: pma.aSearch.msPerDecision < 1500
check: pma.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken, and whether the night can be read as D533 registered it:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass, and `dst`: the build's decision self-test ran with 0 failures, no failing
  `mix4-them` line, and at least 392 checks (D532's 371 plus D533's 21; the lane's first build printed
  `decision selftest: 392 check(s), 0 failure(s)`);
- the players resolve on this PC: `pl.m40_ok` and `pl.m20_ok` say each random-v9 arm's ai-bench config is its J208
  arm's (`search-v2-rrandom4them-m40`, `search-v2-rrandom4them`) with `,rollout=mix4-them` for `,rollout=random4-them`,
  the two differing in the margin alone, neither carrying `override=` or `z=`; `pl.arm_ok` that this night's arm's
  config is one of the two; `pl.hashesAsD533` that the random-v9 hashes are D533's (`fcf472f384b7`, `b2592de740c9`)
  and the others unchanged (`cdd55e02a89c`, `01e2aba2d33e`, `179ab0649521`, `d5381ade9e66`);
- `sd`, the code by content (D533 point 6; HEAD is the runner's checkout of the pin): the pin is a merge (two parents;
  a pin with no second parent writes `none` and fails here, never passes), its second parent is the lane tip the job
  names, its tree under every path a match runs is the lane tip's (`sd.treeIsTip`), its first parent there is J208's
  pin `429ccd9e` (`sd.mainIsJ208`), and there the merge changed exactly D533's five files (`sd.laneOnly`, three of them
  under `bridge/src`, `sd.bridgeFiles`), which are also exactly its difference from `429ccd9e` (`sd.sinceJ208AsRead`).
  If any part fails (`sd.why`), the job does not run: it is redrafted on the new main; nothing is replayed. `cst.ok`:
  the check itself on eight synthetic sets of answers;
- the verdict script reads thirty-four synthetic sets of files: each of D527's rows and what follows it (a candidate
  confirmed, anything else closing the track), the table's edges in integers, an incomplete or missing or stopped
  match reposted with nothing following (a candidate included), the players swapped, J208's arm or the other random-v9
  arm or another hash in the file, the mix counters read from the arm's own run and 0 otherwise, and J208's lines and
  the information lines missing or moved changing nothing that follows; every row fires at least once and every value
  a check reads is a number;
- `pj`: J208's two lines on this host are complete, not both losing badly, and the margin their two points name (the
  higher point's arm, 40 on a tie) is this arm's (`pj.marginMatches`): the arm is the one D532 point 4 names. Whether
  random-v9 follows J208's `v9` or a failed confirmation is the posting session's to state (`pj.j208Candidate`, read);
- the readers read synthetic files as written (`rst.ok`: the rollout reader with D533's mix counters, and the
  worst-games reader; `cfst.ok`: the config reader; `sst.ok`: the block reader);
- in 4 games of the arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **the arm's mix counters are on its batch lines** (Forge and random rounds both counted, its Forge and
  random rollouts summing exactly to its rollouts, `search.rr.rollouts` at least its random rollouts) and its
  guardrails fired, **no `search.lcb.*` counter on either side**, search-v2's side carries no `search.rr.*` and no
  `search.mix.*`, every line's config A is exactly the arm's and config B exactly search-v2's, and both sides stay
  under the 1.5 s budget on average.

Read, not checked: `sd.sinceParent1` and `sd.sinceJ208` (the file lists); the arm's rollouts a decision against
search-v2's (`pra.ratio`), its Forge and random rounds per mix decision, each guardrail per random rollout, the
priority directions on both sides.

There are no win-rate bounds. The match is the test.
## Commands
cores: 7
clean: var/ai-ladder/match-J209a.json
```bash
# random-v9 at margin 40: search-v2-rmix4them-m40 against search-v2, 1,200 games on the confirm set
test -f var/j209-tools/verdict.mjs
mkdir -p var/j209
echo "J209: search-v2-rmix4them-m40 (random-v9, rollout=mix4-them, margin 40) against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rmix4them-m40 search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J209a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j209/verdict.json var/j209/report.md var/j209/rollouts-a.json var/j209/seeds-a.json var/j209/worst-a.json var/j209/cfgs-a.json var/j209/rollouts-j208same.json var/j209/rollouts-j206a.json
```bash
# the pre-registered reading (D533 point 7: D527's table with D530's SHOWN on the arm from its own match; what follows);
# the match's rollouts and mix counters, seat configs, deal blocks and worst-lost games (read, not gated); report.md
# (numbers only; the PC session writes the summary beside it)
mkdir -p var/j209
V1="$(cat var/j209-tools/cfg-v1.txt)"
node var/j209-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J209a.json var/j209/rollouts-a.json
node var/j209-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J209a.json var/j209/seeds-a.json
node var/j209-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J209a.json mix4-them var/j209/worst-a.json
node var/j209-tools/cfgs.cjs var/ai-ladder var/ai-ladder/match-J209a.json "$(cat var/j209-tools/cfg-a.txt)" "$V1" var/j209/cfgs-a.json
node var/j209-tools/verdict.mjs var/ai-ladder/match-J209a.json var/j209/rollouts-a.json var/j209/seeds-a.json var/ai-ladder/match-J208a.json var/ai-ladder/match-J208b.json var/ai-ladder/match-J206a.json var/ai-ladder/match-J204b.json var/ai-ladder/match-J202a.json var/ai-ladder/match-J202b.json var/j209/verdict.json
# the same reader over J208's arm at the same margin and J206's batches, beside the night's
node var/j209-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J208a.json var/j209/rollouts-j208same.json
node var/j209-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J206a.json var/j209/rollouts-j206a.json
node - <<'J209EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder/match-J209a.json'), r = read('var/j209/rollouts-a.json'), b = read('var/j209/seeds-a.json');
const w = read('var/j209/worst-a.json'), c = read('var/j209/cfgs-a.json'), v = read('var/j209/verdict.json');
const R8 = read('var/j209/rollouts-j208same.json'), R6 = read('var/j209/rollouts-j206a.json');
const I = v.info || {}, X = v.mix || {};
const pct = (y, d = 1) => (typeof y === 'number' ? `${(y * 100).toFixed(d)}%` : '-');
const runStart = (id) => { const z = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || ''); return z ? Date.UTC(+z[1], +z[2] - 1, +z[3], +z[4], +z[5], +z[6]) : null; };
const hours = (x) => { const t0 = runStart(x.id), t1 = typeof x.at === 'string' ? Date.parse(x.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const hw = (x) => (x && x.diff !== null && x.diff !== undefined ? `${x.diff} [${x.lo}, ${x.hi}] (+-${x.hw})` : '-');
const L = [`# J209: random-v9, rollout=mix4-them; ${m.a ?? 'search-v2-rmix4them-m40'} (margin 40) against search-v1-anytime (D533)`, ''];
L.push(`**J208, re-read (the premise):** ${(v.reading || [])[0] ?? '-'}.`, '');
L.push(`**The arm under D527's table (SHOWN restated by D530 point 7), from its own match:** ${(v.reading || [])[1] ?? 'no reading'}.`, '');
L.push(`**What follows (D533 point 7):** ${(v.reading || []).slice(2).join('; ') || '-'}.`, '');
L.push(`**Beside the reading (information, deciding nothing; every difference with another job is across D533's merge, which changes bridge/src and by D533 point 3 leaves every earlier value's play unchanged${I.acrossDeals ? ', and across deals' : ''}):** the arm minus J208's arm at the same margin (the mix's own effect): ${I.minusJ208Same ?? '-'}; minus J208's other arm: ${I.minusJ208Other ?? '-'}; minus J206's arm: ${I.minusJ206 ?? '-'}; minus J202's arm at the same margin (both seats random): ${I.minusJ202Same ?? '-'}; minus J204 (b)'s policy-outlet (arithmetic, no reading): ${hw(I.minusJ204b)}. Each about +-19 between two lines.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${r.aRolloutsPerDecision ?? '-'} | ${r.bRolloutsPerDecision ?? '-'} | ${r.ratio ?? '-'} | ${r.aPlayMsPerRollout ?? '-'} / ${r.bPlayMsPerRollout ?? '-'} | ${r.aCopyMsPerRollout ?? '-'} / ${r.bCopyMsPerRollout ?? '-'} | ${hours(m) ?? '-'} |`);
for (const [label, q] of [['J208 at the same margin', R8], ['J206', R6]]) L.push(`| ${label} ${q.a ?? '-'} vs ${q.b ?? '-'} (information) | | | | | | | | ${q.aRolloutsPerDecision ?? '-'} | ${q.bRolloutsPerDecision ?? '-'} | ${q.ratio ?? '-'} | ${q.aPlayMsPerRollout ?? '-'} / ${q.bPlayMsPerRollout ?? '-'} | ${q.aCopyMsPerRollout ?? '-'} / ${q.bCopyMsPerRollout ?? '-'} | |`);
L.push('', `Config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Deal blocks ${b.blocks ?? '-'}, ${b.min ?? '-'} to ${b.max ?? '-'}, ${b.games ?? '-'} games (the chain's: ${v.chainDeals ?? 0}). Batch lines with config A exactly the arm's ${c.aExact ?? '-'} and config B exactly search-v2's ${c.bExact ?? '-'} of ${c.lines ?? '-'}. Rounds per searched decision ${r.aRoundsPerDecision ?? '-'} / ${r.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${r.aShort ?? '-'} = ${pct(r.aShortShare, 2)} / ${r.bShort ?? '-'} = ${pct(r.bShortShare, 2)}; rollout errors ${r.aRolloutErrors ?? '-'} / ${r.bRolloutErrors ?? '-'}, step caps ${r.aStepCaps ?? '-'} / ${r.bStepCaps ?? '-'}; the rollout reader saw ${r.games ?? '-'} games and ${r.aDecisions ?? '-'} / ${r.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}). Random rollouts (search.rr.rollouts) ${r.aRrRollouts ?? '-'} of config A's ${r.aRollouts ?? '-'}; search-v2's side ${r.bRrRollouts ?? '-'}; random-seat failures ${r.aRrFailures ?? '-'}. lcb verdicts (none expected): ${JSON.stringify(r.aLcb || {})} / ${JSON.stringify(r.bLcb || {})}.`, '');
L.push('**The mix (D533 point 3), the arm\'s side:**', '', '| mix decisions | Forge rounds | random rounds | Forge / random rounds a decision | Forge rollouts | random rollouts | Forge / random rollouts a decision | best alternative: Forge pairs, mean paired difference | random pairs, mean paired difference | decisions with both kinds | of them disagreeing in sign |', '|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| ${X.decisions ?? '-'} | ${X.forgeRounds ?? '-'} | ${X.randomRounds ?? '-'} | ${X.forgeRoundsPerDecision ?? '-'} / ${X.randomRoundsPerDecision ?? '-'} | ${X.forgeRollouts ?? '-'} | ${X.randomRollouts ?? '-'} | ${X.forgeRolloutsPerDecision ?? '-'} / ${X.randomRolloutsPerDecision ?? '-'} | ${X.pairsForge ?? '-'}, ${X.meanDForge ?? '-'} | ${X.pairsRandom ?? '-'}, ${X.meanDRandom ?? '-'} | ${X.both ?? '-'} | ${X.disagree ?? '-'} = ${pct(X.disagreeShare)} |`);
L.push('', 'The disagreement share is a rate of decisions whose Forge rounds and random rounds pointed opposite ways on the candidate the verdict read; it never says which kind was right, and no override rate says which overrides win games. search-v2\'s side carries no search.mix.* (its mix decisions: ' + (r.bMixDecisions ?? '-') + ').');
const dir = (q, s) => (q && q[`${s}PriorityShare`] ? `${pct(q[`${s}PriorityShare`].fromPass, 2)} / ${pct(q[`${s}PriorityShare`].toOther, 2)} / ${pct(q[`${s}PriorityShare`].toPass, 2)}` : '-');
const kd = (q, s) => (q && q[`${s}ChangedShare`] ? `${pct(q[`${s}ChangedShare`].p)} / ${pct(q[`${s}ChangedShare`].a)} / ${pct(q[`${s}ChangedShare`].b)}` : '-');
L.push('', '| side | changed Forge p / a / b | priority: from a pass / to another play / to a pass (of priority decisions) |', '|---|---|---|');
for (const [label, q, s] of [[`${m.a}`, r, 'a'], ['search-v2 (this match)', r, 'b'], ['J208 at the same margin (random4-them in every round)', R8, 'a'], ['J208 search-v2', R8, 'b'],
  ['J206 search-v2-rrandom4them-lcb-m40', R6, 'a'], ['J206 search-v2', R6, 'b']]) L.push(`| ${label} | ${kd(q, s)} | ${dir(q, s)} |`);
const names = [...new Set([...Object.keys(r.aPerRollout || {}), ...Object.keys(R8.aPerRollout || {})])].sort();
L.push('', '| search.rr.<name> | fires | per random rollout | J208 at the same margin per random rollout |', '|---|---|---|---|');
for (const n of names) { const raw = n.replace(/_/g, '.'); L.push(`| ${raw} | ${(r.aRr || {})[raw] ?? 0} | ${(r.aPerRollout || {})[n] ?? '-'} | ${(R8.aPerRollout || {})[n] ?? '-'} |`); }
L.push(`| rollouts (the denominator) | ${r.aRrRollouts ?? '-'} | 1 | 1 |`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
  if (!t || !t.searched) { L.push(`| ${who} | no search | | | | | | | | | |`); continue; }
  const k2 = t.byKind || {};
  const ch = (q) => (k2[q] ? `${k2[q].changed}/${k2[q].searched} (${pct(k2[q].rate)})` : '-');
  const other = Object.entries(t.fallback || {}).filter(([q]) => q !== 'budget').map(([q, n]) => `${q} ${n}`).join(', ') || 'none';
  const ms = t.msMean || {};
  L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
}
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, y]) => `v2.${n} ${y}`), ...Object.entries(g.v3PerRollout || {}).map(([n, y]) => `v3.${n} ${y}`), ...Object.entries(g.v4PerRollout || {}).map(([n, y]) => `v4.${n} ${y}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
L.push('', `${w.a ?? '-'}: ${w.lost ?? '-'} lost, ${w.won ?? '-'} won, ${w.other ?? '-'} drawn, errored or timed out of ${w.games ?? '-'} batch lines; mean turns ${w.meanTurnsLost ?? '-'} lost, ${w.meanTurnsWon ?? '-'} won; lines whose config A does not end in the rollout value: ${w.aCfgOther ?? '-'}. No life total is on a batch line: a diagnosis replays a game's seed with full recording for it (D523 point 10).`);
for (const [what, list] of [['the ten longest lost games (turns descending)', w.longest], ['the ten quickest lost games (turns ascending)', w.quickest]]) {
  L.push('', `${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const g of list || []) L.push(row(g));
}
const n = (y) => typeof y === 'number';
L.push('', `Rule parts, at margin ${v.margin ?? '-'}: complete ${v.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(m.lo) && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(m.elo) && m.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(m.eloHi) && m.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(m.eloLo) && n(m.eloHi) && m.eloLo < 0 && m.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(m.eloLo) && m.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(m.eloHi) && m.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(m.eloHi) && m.eloHi < -15 ? 1 : 0}. SHOWN ${v.shown ?? 0}, INCONCLUSIVE ${v.inconclusive ?? 0} (case 1 ${v.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${v.indistinguishable ?? 0}, no weaker (case 2) ${v.noWeaker ?? 0}, worse, not badly ${v.worseNotBadly ?? 0} (too wide ${v.tooWide ?? 0}, case 3 ${v.upperAtZero ?? 0}), loses badly ${v.losesBadly ?? 0}; candidate ${v.candidate ?? 0}.`);
L.push('', `What follows: a confirmation ${v.confirm ?? 0} (holding closes the track as reached: ${v.closesAsReachedIfHolds ?? 0}); the track closes ${v.trackCloses ?? 0} (a closing decision owed ${v.closing ?? 0}); exactly one followed ${v.follows ?? 0}; repost ${v.repost ?? 0}; self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (both 0 on this night by the rule).`);
for (const [label, f] of [['J208 (a)', 'var/ai-ladder/match-J208a.json'], ['J208 (b)', 'var/ai-ladder/match-J208b.json'], ['J206', 'var/ai-ladder/match-J206a.json'], ['J204 (b)', 'var/ai-ladder/match-J204b.json'], ['J202 (a)', 'var/ai-ladder/match-J202a.json'], ['J202 (b)', 'var/ai-ladder/match-J202b.json']]) {
  const p = read(f);
  L.push('', `${label} on the same deals, at an earlier pin (information): ${p.a ?? '-'} vs ${p.b ?? '-'}, ${p.played ?? '-'} games, complete ${p.complete ?? '-'}, score ${p.score ?? '-'} [${p.lo ?? '-'}, ${p.hi ?? '-'}], Elo ${p.elo ?? '-'} [${p.eloLo ?? '-'}, ${p.eloHi ?? '-'}].`);
}
fs.writeFileSync('var/j209/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J209EOF
```
check: cm.complete == true
check: cm.played == 1200
check: cm.errors + cm.timeouts <= 60
check: bs.blocks == 150
check: bs.games >= cm.played
check: ro.aRrRollouts > 0
check: ro.bRrRollouts == 0
check: ro.aLcb.overrode + ro.aLcb.held + ro.aLcb.none == 0
check: ro.bLcb.overrode + ro.bLcb.held + ro.bLcb.none == 0
check: ro.aMixDecisions > 0
check: ro.aMixForgeRounds > 0
check: ro.aMixRandomRounds > 0
check: ro.aMixForgeRollouts + ro.aMixRandomRollouts == ro.aRollouts
check: ro.aRrRollouts >= ro.aMixRandomRollouts
check: ro.bMixDecisions == 0
check: ro.bMixForgeRollouts + ro.bMixRandomRollouts == 0
check: ca.ok == 1
check: ca.lines >= cm.played
check: w.aCfgOther == 0
check: v.written == 1
check: v.names == 1
check: v.complete == 1
check: v.margin == 40
check: v.armM40 + v.armM20 == 1
check: v.mix.read == 1
check: v.mix.decisions == ro.aMixDecisions
check: v.shown + v.inconclusive + v.indistinguishable + v.noWeaker + v.worseNotBadly + v.losesBadly == 1
check: v.shown == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.lo > 0.5 and cm.elo >= 15)
check: v.shown == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.lo > 0.5 and cm.elo >= 15)
check: v.inconclusive == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi >= 15 and not (cm.lo > 0.5 and cm.elo >= 15))
check: v.inconclusive == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi >= 15 and not (cm.lo > 0.5 and cm.elo >= 15))
check: v.indistinguishable == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < 15 and cm.eloLo < 0 and cm.eloHi > 0 and cm.eloLo > -15)
check: v.indistinguishable == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < 15 and cm.eloLo < 0 and cm.eloHi > 0 and cm.eloLo > -15)
check: v.noWeaker == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < 15 and cm.eloLo >= 0)
check: v.noWeaker == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < 15 and cm.eloLo >= 0)
check: v.losesBadly == 1 or not (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < -15)
check: v.losesBadly == 0 or (cm.complete == true and cm.played == 1200 and cm.errors + cm.timeouts <= 60 and cm.eloHi < -15)
check: v.tooWide == 0 or (v.worseNotBadly == 1 and cm.eloLo <= -15 and cm.eloHi > 0)
check: v.candidate == v.shown + v.inconclusive + v.indistinguishable + v.noWeaker
check: v.diagnose == v.worseNotBadly + v.losesBadly
check: v.confirm == v.candidate
check: v.trackCloses == v.diagnose
check: v.closing == v.trackCloses
check: v.closesAsReachedIfHolds == v.confirm
check: v.confirm + v.trackCloses == 1
check: v.follows == 1
check: v.repost == 0
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0

The first three checks say the match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next two say it played 150 deal blocks and the block reader found every
game. The next eleven say the arm's rollouts carried random ones on the batch lines and search-v2's did not, neither
side decided on the lcb rule, the arm's mix counters are there (Forge and random rounds both counted, its Forge and
random rollouts summing exactly to its rollouts, `search.rr.rollouts` at least its random rollouts) and search-v2's
side has none; then that every batch line's config A was exactly the arm's (`ca`) and config B exactly search-v2's,
with the `,rollout=mix4-them` suffix on every line (`w`). Then the verdict ran on the arm at its margin and read the
mix counters from its own run. Then the reading: exactly one of the six, D527's table in the runner's own language,
row by row, each both ways, `tooWide` only where it belongs, `candidate` and `diagnose` the readings' two groups. Then
what follows, each both ways: a confirmation exactly for a candidate (a holding one closing the track as reached), the
track closing exactly otherwise, exactly one of the two; no repost; the self-play path closed and the live seat
unchanged. Every value these checks read is a number the verdict always writes; none compares with null or a string,
and no metric line carries a `$` (J207's failed pilot). Any reading passes them; a reading is not a failure, and a
closed track is not a failure either. The time per decision, the rollouts, the mix's disagreement, the guardrail
counters, the changed answers, the fallbacks, the worst-lost games and every comparison with an earlier night are
reported, not gated.

## Abort if
abort: j209_err >= 30 and j209_err > j209_games / 10

Engine trouble only: once 30 games have ended in an engine error or a timeout, the job stops if they are more than one
in ten. The match has no stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J209a.json
collect: var/j209/verdict.json
collect: var/j209/report.md
collect: var/j209/rollouts-a.json
collect: var/j209/worst-a.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J199 to J208:
- **the arm's reading under D527's table**: SHOWN, INCONCLUSIVE, NOT SHOWN indistinguishable, NOT SHOWN no weaker,
  NOT SHOWN worse not badly, or NOT SHOWN loses badly (and the unreached cases by name if one occurred), with its score
  against search-v2 and its 95% interval, the same in Elo, and the pair and game counts; for a too-wide interval, say
  that it is "too wide to call" and read as worse, not badly; a SHOWN in D530's restated words, read for a mix as D532
  point 6 reads it;
- **what follows, in D533's words:** when `v.confirm` is 1, that a 4,800-game confirmation of the arm is owed, as its
  own job, and that holding closes the random-rollout track as reached and failing closes it; when `v.trackCloses` is
  1, that the random-rollout track closes now, with no further iteration, that the owner is told, with the counters,
  which way it went, and that a closing decision writes it from the track's closing draft, naming what would reopen
  it; then, plainly, whatever the reading, that the live seat is unchanged and any change to it is a separate decision
  (a seat-queue row, D509);
- **the mix**: Forge and random rounds and rollouts a decision, the best alternative's mean paired difference by
  kind, and the share of decisions whose two kinds disagreed in sign, worded as rates (never as which kind was right);
- **the comparisons, information only and labelled as across D533's merge** (and across deals with `chainDeals` 0):
  the arm minus J208's arm at the same margin (the mix's own effect), minus J208's other arm, minus J206's and J202's
  arm at the same margin; minus J204 (b)'s policy-outlet with its `hw`, worded as arithmetic, never as a SIGNAL;
- **the changed answers by kind and by direction** on both sides, beside J208's arm at the same margin and J206's;
- **the compute each side spent:** ms per decision on both sides and their ratio, by kind; rollouts and rounds per
  searched decision against search-v2's and against J208's, play and copy ms a rollout, the short decisions, rollout
  errors and step caps, budget fallbacks with their interval and other fallbacks;
- **the guardrails:** the arm's `search.rr.*` counters per random rollout, beside J208's;
- **the worst-lost games:** the arm's ten longest and ten quickest lost games, with the mean turns of lost against won
  games; say that the batch line has no life total;
- **the code:** the pilot's `sd` (the merge's five files, three under `bridge/src`) and the build's decision self-test
  count (`dst.checks`);
- **the run:** draws, errors and timeouts, the deal blocks (expected 114,900,000-114,900,149), the match's hours
  against its estimate (2.2-3 h), the pressure events in STATUS, that it ran alone (D521), and whether the GPU queue or
  anything else outside the lab was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it. If the match stopped early (`complete: false`), say so: it gets no reading, nothing follows from the
night, and what is owed is a repost, not a reading.

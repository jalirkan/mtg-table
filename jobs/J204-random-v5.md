id: J204
title: Random rollouts, iteration 4 (random-v5, no new rollout logic): two fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule), each against search-v1-anytime (search-v2): (a) search-v2-rrandom4-m60, J202 (b)'s search-v2-rrandom4-m40 with the search's override margin at 60 instead of 40 (rollout=random4 unchanged, both seats), read under D527's table; and (b) policy-outlet, the seat search-v2 sits on with the search off (Default+outlets, the baseline the arm converges on as the margin rises), never played on this host; then D528's SIGNAL reading, (a)'s Elo minus (b)'s on the same deals with both intervals' noise (SIGNAL SHOWN keeps the random-rollout track open on the margin/LCB line; NO SIGNAL or SIGNAL AGAINST closes it unless (a) is a candidate), alone on the machine
public_title: Random rollouts in the search, fourth try: stricter bar, no-search baseline
public_est: ~4-5 h (one night)
public_decides: Whether random rollouts carry any signal beyond the AI choice alone
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@137b2bf697c30c95533fa6a02c10a6d57ca32b75 (the merge commit of D528's lane, pc/rollout-random-v5, on main, pushed to origin/main before posting; the lane's tip when this draft was written was 986b5470, off main 1ac01c0b (D527's merge). It carries: the ladder player search-v2-rrandom4-m60 (search-v2-rrandom4-m40 with `margin` 60 for 40, rollout=random4 unchanged), D528's decision file, the PLAN entry and the registry test; nothing under bridge/src, tools/ai-bench or tools/ai-ladder's code changes, and policy-outlet is the registry's existing player. Pinned so every game of both matches is one code version, D341; the pilot checks the pin is that merge (two parents), that it brought nothing under bridge/src and only players.json under tools/ai-ladder)
decides: two pre-registered readings (D528 point 6), each from the match lines alone. FIRST, D527's table, unchanged, for the arm (a) search-v2-rrandom4-m60 against search-v1-anytime: SHOWN (a 4,800-game confirmation under D519's readings, then Forge leaves the rollout loop for this arm), INCONCLUSIVE (a 4,800-game confirmation first), NOT SHOWN indistinguishable (a candidate, confirmed at 4,800 games), NOT SHOWN worse not badly or loses badly (diagnose; losing badly puts the principle's cheap path in doubt). SECOND, SIGNAL: diff = (a)'s Elo point minus (b)'s, each against search-v1-anytime on the same 600 deals, with hw = sqrt(((a.eloHi - a.eloLo)/2)^2 + ((b.eloHi - b.eloLo)/2)^2) and the interval [diff - hw, diff + hw]: SIGNAL SHOWN (diff >= +15 and diff - hw > 0: the random values carry signal beyond Forge's choice, the track stays open on the margin/LCB line), SIGNAL AGAINST (diff <= -15 and diff + hw < 0: worse than no search, the track closes), NO SIGNAL (the interval contains 0 and |diff| < 15: no signal at margin 60 at +-15 on the point, not equivalence; the track closes), SIGNAL INCONCLUSIVE (anything else: one more iteration on the margin/LCB line, which registers the reading again). The track closes (D523 point 10's stop; the owner told, with the counters; a D529 writes the closing from the track's closing draft) on NO SIGNAL or SIGNAL AGAINST unless (a) is a candidate, in which case its 4,800-game confirmation runs first and the closing waits (holding, the track reached its goal and stays open; failing, it closes as on NO SIGNAL). When (a) is to diagnose and the track stays open, the agent iterates as random-v6 without asking the owner (D528 point 8, pre-registered: D350's override=lcb at margin 60, unless (a)'s Elo point minus J202 (b)'s is below 0, then 40; one change). Two successive SIGNAL INCONCLUSIVE readings close the track; this night's count is v.signalInconclusiveCount, which random-v6's job re-reads from these match lines. The loop's count (D528 point 7): random-v4 did not lose badly as a whole (J202 (b) read worse, not badly), so the count of successive iterations that lose badly restarted; random-v5 has one random arm, so it loses badly exactly when (a) does, and the two-losing stop can fire on this night only if J202's two lines (read by the verdict script from this host, v.j202.v4LosesBadly) both lost badly, which they did not. The self-play-from-random path waits for a reading confirmed at 4,800 games; any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on either reading. What is known: J202's two matches on these deals, 1,200 games each, 0 errors, 0 timeouts: (a) search-v2-rrandom4 (random-v4, margin 20) 0.4433 [0.4230, 0.4636], Elo -39.5 [-53.9, -25.3], NOT SHOWN, loses badly; (b) search-v2-rrandom4-m40 (the same rollouts, margin 40) 0.4700 [0.4511, 0.4889], Elo -20.9 [-34.1, -7.7], NOT SHOWN, worse, not badly; (b) - (a) +18.6 on the point (about +-19 of noise). The guardrail R8 made lethal-aware fired 0.0022 a random rollout and did nothing measurable; the margin moved the score by overriding Forge less: the arm changed Forge's answer in 33.3% of its searched decisions at margin 20 (priority 39.5%, attack 19.8%, block 22.1%) and 26.4% at margin 40 (31.7%, 14.3%, 18.0%), where search-v2 on the other side changed it in 18.0% (19.0%, 14.6%, 18.6%), with the same rollouts (v3.goodBlock 0.0209 and 0.0231 a random rollout, rollouts a decision x1.141 and x1.134 search-v2's at equal ms). So (a) at margin 60 is expected (not registered) to override less again. The baseline's nearest line on this host is J194 (a): search-v1-anytime against forge-default (Default, outlets off, 3ed453ffef1c) on exactly these blocks, 1,200 games, search-v2 +87.5 [+72.1, +103.2]; forge-default is not policy-outlet (D310's outlet policy, on in policy-outlet and under search-v2, acted on J194 (a)'s search-v2 side 311 times in 72 of the 1,200 games), so (b) is expected (not registered) near -87.5 unless the outlet policy is worth tens of Elo on these decks. With that, J202 (b) - forge-default is +66.6 (about +-20), and the SIGNAL reading is expected (not registered, and no check reads it) to be SIGNAL SHOWN by a wide margin: the random rollouts then keep about three quarters of search-v2's own gain over the seat under it, and the question left open is D527's table, whether they can match Forge's. Each reading's noise: (a)'s own interval about +-13.5 Elo at 1,200 games (J202's +-13.2 to +-14.4); SIGNAL's hw about +-19 to +-21 (the shared deals may narrow it, unmeasured). Information, not a prediction any check reads
rule: written 2026-11-09 before any rated game of either match, word for word as D528 states it (its point 6; D528's bold dropped, its table given row by row as reading | when | what it decides): "Two readings, each from the match lines alone. First, D527's table for (a), unchanged: `search-v2-rrandom4-m60` against `search-v1-anytime`, read once by the first row that holds — SHOWN (lower end above 0.5 and point at least +15 Elo: Forge leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it), INCONCLUSIVE (upper end at least +15 and lower end at most 0.5: confirm at 4,800 games under D519's readings before anything), NOT SHOWN, indistinguishable (upper end below +15, the interval contains 0, and its lower end is above −15 Elo: a candidate, confirmed at 4,800 games before it replaces Forge in the loop), NOT SHOWN, worse, not badly (upper end below 0 and at least −15 Elo: diagnose and iterate), NOT SHOWN, loses badly (upper end below −15 Elo: the same, the principle's cheap path in doubt) — with D527's three unreached cases read as D527 reads them (a lower end above 0.5 with a point under +15 and an upper end at least +15 is INCONCLUSIVE; an interval wholly at or above 0 with an upper end below +15 is NOT SHOWN, no weaker, a candidate; an upper end of exactly 0 is worse, not badly) and its too-wide case (an interval containing 0 with its lower end at or below −15 is worse, not badly). Second, SIGNAL: does the random value carry any signal beyond Forge's own choice? `diff` = (a)'s Elo point minus (b)'s, each against `search-v1-anytime` on the same deals, each from its own match line (`elo`, the arm the match's first player). Its noise is the two intervals' half-widths combined, `hw` = √(((a.eloHi − a.eloLo)/2)² + ((b.eloHi − b.eloLo)/2)²) (about ±19 at 1,200 games each, D525's residual), and its interval [`diff − hw`, `diff + hw`]; the shared deals may narrow the true one, unmeasured, so this is the conservative width. Read once, only when both matches are complete: SIGNAL SHOWN | `diff` ≥ +15 and `diff − hw` > 0 | the random values carry signal beyond Forge's choice: the track stays open on the margin/LCB line (point 8); SIGNAL AGAINST | `diff` ≤ −15 and `diff + hw` < 0 | the random values are worse than no search at all: the track closes; NO SIGNAL | `diff − hw` ≤ 0 ≤ `diff + hw` and |`diff`| < 15 | no signal at margin 60 at ±15 on the point (not a finding of equivalence): the track closes; SIGNAL INCONCLUSIVE | anything else (a small signal whose interval excludes 0, or a large point whose interval reaches 0) | the track stays open for one more iteration on the margin/LCB line, whose decision registers this reading again; two successive SIGNAL INCONCLUSIVE readings close it as NO SIGNAL does. The four rows exclude each other, so the order does not matter. The track closes (D523 point 10's stop, the owner told, with the counters, which way it went; a D529 writes the closing from the track's closing draft, with this night's numbers) on NO SIGNAL or SIGNAL AGAINST — unless (a) is a candidate under the first reading, in which case the 4,800-game confirmation runs first and the closing waits on it (a candidate is an arm level with search-v2, which is the track's goal, whatever its distance from the seat under it): if the confirmation holds, the track reached its goal and stays open; if it fails, the track closes as on NO SIGNAL. D529, if it is written, words a NO SIGNAL reading as this table does — no signal at margin 60 at ±15 on the point — and never as equivalence. An incomplete match gives its reading nothing and is reposted, the verdict naming which ((b) alone when (a) is complete); the SIGNAL reading needs both. The SIGNAL INCONCLUSIVE count is kept in the match lines, not in this text: random-v5 is the first SIGNAL reading, so J204's count is its own (the verdict emits `signalInconclusiveCount`, 0 or 1), and random-v6's job re-reads J204's two match lines on the host to count it, as J204 reads J202's for point 7." And D528 point 8, fixed before any game: random-v6, if the agent iterates, is D350's override=lcb at margin 60, unless (a)'s Elo point minus J202 (b)'s is below 0, then 40 (v6Margin; marginStep is that difference to 0.1, the script deciding on the unrounded one). Two fixed matches (D398, no stopping rule), each 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 30 deck pairs never tuned on), in this order: (a) search-v2-rrandom4-m60 vs search-v1-anytime, var/ai-ladder/match-J204a.json; (b) policy-outlet vs search-v1-anytime, var/ai-ladder/match-J204b.json. Both matchups are new on this host, so each takes the host's match blocks 114,900,000-114,900,149: the same 600 deals for both, and the same deals as J194's three matches, J195's four, J199's two, J201's two and J202's two. In the quoted rule an arm's "lower end" in the SHOWN and INCONCLUSIVE rows is its match line's 95% lower end on its score (lo), its "point" its Elo point estimate (elo), its "upper end" its Elo upper end (eloHi), and its "interval" and the "lower end" of the non-inferiority bound its Elo interval (eloLo, eloHi) and eloLo, the arm being the match's first player; SIGNAL reads each match's elo, eloLo and eloHi, each match's first player being (a)'s arm and (b)'s policy-outlet. A match is COMPLETE when its line names the two players in that order at their config hashes (216e66d89fe3 for (a) and e350d94649a4 for (b), against cdd55e02a89c), says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers. (a) is read on its own match alone, only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15; INCONCLUSIVE when not SHOWN and eloHi >= 15 (case 1 included); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (tooWide and case 3 included). A candidate (candidate 1) is SHOWN, INCONCLUSIVE, indistinguishable or no weaker; to diagnose (diagnose 1) is worse, not badly or loses badly. SIGNAL is read only when both matches are complete, exactly one of signalShown, signalAgainst, noSignal, signalInconclusive, by the conditions above on the unrounded diff and hw (diff, hw and the interval are reported to 0.1). trackCloses is 1 exactly when noSignal or signalAgainst and (a) is not a candidate (d529 1); closingWaits is 1 exactly when noSignal or signalAgainst and (a) is a candidate; keepsOpen is 1 exactly when signalShown or signalInconclusive; confirm is (a)'s candidate; iterate is 1 exactly when (a) is to diagnose, SIGNAL was read and the track does not close. principleInDoubt and iterationLosesBadly are (a)'s losesBadly (one random arm). The loop's count (D528 point 7): random-v4 lost badly (v.j202.v4LosesBadly 1) exactly when both of J202's match lines on this host, (a) search-v2-rrandom4 at 646d59a008f6 and (b) search-v2-rrandom4-m40 at 968c9003c616, each against search-v1-anytime at cdd55e02a89c, are complete by the same test and each has eloHi < -15; loopStops is 1 exactly when iterationLosesBadly is 1 and random-v4 lost badly, else 0. selfPlayOpens and liveSeatChanged are 0 in every reading of this night. An incomplete match gives no reading of its own and no SIGNAL, and it is reposted (repostWhich names it: (b) alone when (a) is complete). signalInconclusiveCount is signalInconclusive (0 or 1); v6Margin is 40 when (a) and J202 (b) are complete and (a)'s elo is below J202 (b)'s, 60 when it is not, else null. Reported beside, deciding nothing: J202 (b) minus (b) (m40MinusBaseline: margin 40 against the same baseline on the same deals, about +-20); whether both matches start at block 114,900,000 (bsa.min, bsb.min); (a) minus J202 (b) (the margin 40 to 60) and (a) minus J202 (a) (20 to 60), each about +-19 of noise; the share diff / (0 - b.elo) when (b) is below 0 (the fraction of search-v2's own gain over the seat under it that the random values keep); (b) beside J194 (a)'s forge-default (the outlet policy's worth, about +-21); each side's ms per decision (p + a + b, and by kind) and their ratio, rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps, every `search.rr.*` counter per random rollout and per game for (a), each side's outlet-policy actions (`policy.*`) in both matches, searched and changed decisions by kind, budget fallbacks with their interval and other fallbacks, the deal blocks played, (a)'s ten longest and ten quickest lost games with their counters, and J202's two and J194 (a)'s match lines on the same deals. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~4-4.5 h at 7 workers (an estimate; range 3.5-6 h), 8 h at worst (the two matches' own stops). From this host at 7 workers, alone, on these same 600 deals: J202 (b), search-v2-rrandom4-m40 against search-v2 at 898 against 889 ms a decision, played its 1,200 games in 2.62 h (its (a) 2.27 h); the margin is read by the verdict alone, so (a) is guessed at ~2.3-2.8 h. J194 (a), search-v2 against forge-default (one side searching), played its 1,200 games in 1.27 h; policy-outlet is the same seat with the outlet policy on, so (b) is guessed at ~1.2-1.5 h. Each match stops itself at --hours 4: 8 h in all, which with the pilot is under the 9 h timeout, so a slow (a) cannot let the timeout cut (b); a match that reaches its stop reports complete: false and gives no reading. Both run under the ladder's default 300 s per-game timeout (neither lifts maxRounds). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games of each match on one worker)
resumable: no
timeout: 9h
clean: var/j204 var/ai-ladder-pilot/J204 var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json
progress: metric j204_games games of 2400
metrics: j204_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4-m60","search-v1-anytime"],["policy-outlet","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j204_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom4-m60","search-v1-anytime"],["policy-outlet","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J204a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J204b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: roa = sh: cat var/j204/rollouts-a.json 2>/dev/null || echo '{"games":0}'
metrics: rob = sh: cat var/j204/rollouts-b.json 2>/dev/null || echo '{"games":0}'
metrics: bsa = sh: cat var/j204/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: bsb = sh: cat var/j204/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: wa = sh: cat var/j204/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0}'
metrics: v = sh: cat var/j204/verdict.json 2>/dev/null || echo '{"written":0,"confirm":0,"iterate":0,"trackCloses":0,"closingWaits":0,"keepsOpen":0,"d529":0,"principleInDoubt":0,"iterationLosesBadly":0,"repost":0,"loopStops":0,"selfPlayOpens":0,"liveSeatChanged":0,"signalInconclusiveCount":0,"v6Margin":null,"marginStep":null,"m40MinusBaseline":null,"repostWhich":null,"j202":{"read":0,"v4LosesBadly":0,"b":{"elo":null}},"a":{"complete":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0},"b":{"complete":0},"signal":{"read":0,"signalShown":0,"signalAgainst":0,"noSignal":0,"signalInconclusive":0,"diff":0,"hw":0,"lo":0,"hi":0}}'
headline: cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.eloLo, cma.eloHi, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, roa.aRolloutsPerDecision, roa.bRolloutsPerDecision, roa.ratio, roa.aPerRollout.v2_lethalBlock, roa.aPerRollout.v2_ownStack, roa.aPerRollout.v3_goodBlock, roa.aPerRollout.v4_goodBlockLethal, roa.aRrFailures, v.a.shown, v.a.inconclusive, v.a.indistinguishable, v.a.worseNotBadly, v.a.losesBadly, v.a.candidate, cmb.played, cmb.score, cmb.lo, cmb.hi, cmb.elo, cmb.eloLo, cmb.eloHi, cmb.bSearch.msPerDecision, rob.bRolloutsPerDecision, rob.aPolicy, rob.aPolicyGames, v.signal.diff, v.signal.hw, v.signal.lo, v.signal.hi, v.signal.share, v.signal.signalShown, v.signal.signalAgainst, v.signal.noSignal, v.signal.signalInconclusive, v.trackCloses, v.closingWaits, v.keepsOpen, v.signalInconclusiveCount, v.m40MinusBaseline, v.marginStep, v.v6Margin, v.repostWhich, bsa.min, bsb.min, v.confirm, v.iterate, v.principleInDoubt, v.j202.v4LosesBadly, v.loopStops, wa.lost

**Why this job** (D528, the third turn of D523's iteration loop after D525's and D527's; the owner's principle, in his
words as D523 quotes them): "Yes, there are terribly useless situations that will arise from randomized moves, but you
are the agent in the loop who can recognize that, iterate to avoid it, so we waste less time on useless data." D523 took
Forge's judgment out of the search's rollouts and put guarded randomness in (random-v2: the move atlas's random seat
plus guardrails R1-R7); D525 and D527 added and fixed guardrails one at a time. The chain so far, every arm against
search-v1-anytime on these same 600 deals:

| iteration | arm | change | Elo vs search-v2 [95%] | reading |
|---|---|---|---|---|
| random-v2 (J199 a) | search-v2-rrandom | the atlas's random seat + R1-R7, both rollout seats | -43.7 [-57.1, -30.4] | loses badly |
| random-v2 (J199 b) | search-v2-rrandom-self | the same, searching seat only | -25.5 [-38.3, -12.8] | worse, not badly |
| random-v3 (J201 a) | search-v2-rrandom3 | + R8 the good block | -30.8 [-44.4, -17.2] | loses badly |
| random-v3 (J201 b) | search-v2-rrandom3-held | + R9 the held instant | -29.6 [-43.7, -15.6] | loses badly |
| random-v4 (J202 a) | search-v2-rrandom4 | R8 made lethal-aware | -39.5 [-53.9, -25.3] | loses badly |
| random-v4 (J202 b) | search-v2-rrandom4-m40 | + the override margin 20 to 40 | -20.9 [-34.1, -7.7] | worse, not badly |

J202's lesson (D528's Context): the last guardrail did nothing (R8 made lethal-aware fired 0.0022 a random rollout),
and the one lever that moved was the search's override margin, the leaf points an alternative's mean must beat Forge's
own answer's by to replace it: +18.6 Elo on the point for 20 to 40, with the same rollouts, by overriding Forge less
(33.3% of searched decisions to 26.4%; search-v2's own 18.0%). As the margin rises, the arm converges on the seat the
search sits on with the search off: Forge's Default AI behind D310's outlet policy, the ladder's `policy-outlet`. So
the question this night settles is not a better guardrail but whether the random values carry any signal beyond
Forge's own choice, read against that seat on the same deals and not only against search-v2. Random-v5 therefore adds
no rollout logic (no new rollout value: the hash rule ties a value to a definition, and nothing is redefined), and
plays two matches: (a) the arm one step further along the margin, `search-v2-rrandom4-m60` (J202 (b) with margin 60
for 40), read under D527's table as every arm before it; and (b) the baseline, `policy-outlet`, the "no override at
all" end of the same line. Their difference is D528's SIGNAL. The nearest line already on this host is J194 (a),
search-v2 against `forge-default` on exactly these blocks (+87.5 [+72.1, +103.2] from search-v2's side), but
`forge-default` has the outlet policy off and search-v2 on (it acted in 72 of J194 (a)'s 1,200 games), so it is one
rule away from the seat and is printed beside, as information. D528 is
`docs/decisions/D528-random-v5-margin-and-forge-baseline.md` at the pin: its point 6 is the rule, point 7 how the loop
counts this night, point 8 what follows each case; D527 (`docs/decisions/D527-random-v4-lethal-good-block.md`) is
random-v4 and the table; D523 (`docs/decisions/D523-random-rollouts.md`) is the seam and point 10, the iteration loop.

**What is built** (D528, the merge of pc/rollout-random-v5). One new ladder player in `tools/ai-ladder/players.json`
and one existing one:
- `search-v2-rrandom4-m60` (kind `search`, every param search-v1-anytime's (`profile: Default`, `outlets: on`,
  `budgetMs: 1500`, `anytime: on`) plus `rollout: random4` and `margin: 60`), config hash `216e66d89fe3`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=60,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random4`;
- `policy-outlet` (kind `policy`, `profile: Default`, `outlets: on`; registered with D310), config hash
  `e350d94649a4`: `Default+outlets`, which is search-v1-anytime's seat config before its `+search:` part, byte for byte
  (`web/test/ai-ladder.test.ts` holds that, and that `forge-default`'s `Default` is not it);
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hashes are D528's, computed by `registry.ts` on the lane; the pilot records the real ones
(`var/j204-tools/players.json`) and checks the config strings and the hashes (`pl.hashesAsD528`: the arm at
`216e66d89fe3`, policy-outlet at `e350d94649a4`, search-v1-anytime at `cdd55e02a89c`, and J202's
search-v2-rrandom4 at `646d59a008f6` and search-v2-rrandom4-m40 at `968c9003c616`, unchanged). Both seats are
`Bootstrap.createAiSeat` seats (`PolicyControllerAi`); the outlet policy answers first in both, and in the arm the search
only reconsiders a priority none of its rules claimed (`PolicyControllerAi.choose0`). The arm's rollouts are J202's
exactly (`rollout=random4`, both seats random-v2 plus R8 made lethal-aware, seeded from the rollout's seed, common
random numbers across a round's candidates); the margin is read by the verdict alone (`SearchPolicy.Report.verdict`;
the anytime loop's budget, rounds and stopping do not read it).

**The counters.** The arm's batch lines carry D523's, D525's and D527's `search.rr.*` counters (the guardrails' fires,
`search.rr.rollouts`, `search.rr.failures`), summed over the rollout's two random seats into the searching seat's
counts (`SearchPolicy.countRandomSeats`); the match line carries none of them, nor rollouts (`tallyLine` in
`tools/ai-ladder/match.ts`). `var/j204-tools/rollouts.cjs` is J202's reader with each side's outlet-policy actions added
(`<side>Policy`, `<side>PolicyGames`, `<side>PolicyKeys`: the `policy.*` keys `PolicyControllerAi` counts when the
outlet policy answers), so the night says how often the seat under the search answered by its own rule on both sides
of both matches. `policy-outlet`'s side has no `search.*` key at all.

**The worst-lost games** (D523 point 10), for (a) only: `var/j204-tools/worst.cjs` is J202's, unchanged; the arm's lost
games ranked by `turns`, the ten longest and the ten quickest, each with the arm's counters. (b) searches nothing, so
it has no diagnosis.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host, in this order:
1. **(a) the margin at 60**, `search-v2-rrandom4-m60` vs `search-v1-anytime`, `--out var/ai-ladder/match-J204a.json`.
2. **(b) the seat under the search**, `policy-outlet` vs `search-v1-anytime`, `--out var/ai-ladder/match-J204b.json`.

**Deal blocks.** A match's batches take the host's match base (`hostBase(host)` + 900,000 = 114,900,000 on this
host, `cmdMatch` in `tools/ai-ladder/cli.ts`) and then, one batch at a time, the matchup's next unused block
(`nextBseed`, `tools/ai-ladder/schedule.ts`, D398 point 2), counting every block the unordered matchup has used in
the results log and the batches running. Both matchups are new on this host (the arm is D528's, and no results line
names policy-outlet at all), so each takes **114,900,000-114,900,149**, as every new matchup against
search-v1-anytime has: (a) and (b) play the same 600 deals, which are also J194's, J195's, J199's, J201's and J202's,
so the SIGNAL difference and the margin chain (J202 (a), J202 (b), J204 (a)) are read on identical deals. A match
retried after a memory stop takes the next unused blocks for the games it plays again (114,900,150 onward), so its deals
then differ in part; the stopped attempt's games stay in the log under their own purpose and are not counted.
`var/j204-tools/seeds.cjs` reads the blocks each match actually played; the checks require 150 blocks and every game,
and the report gives the lowest and highest (expected 114,900,000 and 114,900,149).

**Why one night and no tuning.** The arm changes one thing in J202 (b) (the margin), and the baseline changes nothing:
it is the seat as registered. Nothing is selected, so each score is read as it is. What follows the night is D528's
point 8: a 4,800-game confirmation for a candidate; for an arm to diagnose with the track open, random-v6 on the
margin/LCB line (D350's `override=lcb`, one change); for a closed track, D529 written from the track's closing draft and
the owner told. D523's point 10 iteration rule, quoted word for word (bold dropped): "After J199, the agent reads the
counters and the worst-lost games — the arm's lost games with the longest turn count and the lowest arm life at the
end, the batch line's `seed` replayed with `--record full` into a frame log (the searched decisions' reports say which
candidate each rollout preferred) — names the useless lines random-v2 still plays, adds or fixes guardrails (each a
rule with the failure it prevents, the evidence and a counter, as above, in a new decision that amends this one),
registers the result as a new arm (`random-v3`, a new name and hash; the arms above stay what they measured), pilots it
and re-runs the same 1,200-game match without asking the owner, who gets each night's results. The loop stops only on a
SHOWN or indistinguishable reading confirmed at 4,800 games, or on two successive v-iterations that lose badly; then
the owner is told, with the counters, which way it went." D528 adds the SIGNAL stop to it, written before this night's
first game. The two-losing count (D528 point 7) restarted after random-v4, which did not lose badly as a whole; the
verdict script reads that from J202's own match lines on this host (`v.j202.v4LosesBadly`), not from this text. Neither
match ever touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523, D525, D527 and D528 name it in their rule): a ladder match plays
to wall-clock budgets, so contention changes the rollouts each side affords, and both matches have search-v2 on one
side; it is admitted only onto an empty machine and nothing, heavy or light, is admitted beside it; while it is next
and waits, nothing newer starts. `cores: 7` keeps the width J195's, J199's, J201's and J202's walls were measured at.
No `after:`; it starts once the jobs before it have ended. It may run beside the art session's GPU painting queue,
which is outside the lab and CPU-light but not memory-free. The runner's memory rule handles that without the job: a
drop takes one worker away as that worker's game ends and a raise gives it back; it changes no deal and no side's
budget, and the deals are mirrored, so the load falls on both sides alike. A memory stop is retried first; its retry
starts the match that was running again from its first game on new blocks, under a fresh `--hours 4`.

## Pilot
About 15 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the six players (search-v1-anytime, J202's search-v2-rrandom4 and -m40, the arm,
  policy-outlet and forge-default), the arm's seat config is search-v1-anytime's with `margin=60` for `margin=20` and
  `,rollout=random4` appended and nothing else (and -m40's with 60 for 40), policy-outlet's is search-v1-anytime's
  before `+search:` and nothing else, forge-default's is not it, and the hashes are D528's;
- the pin is the merge of D528's lane (two parents), and it brought nothing under `bridge/src` and, under
  `tools/ai-ladder`, only `players.json`; reported beside: the files under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` that differ from the lane's tip 986b5470 when this was drafted, and what main carried under them
  between D528's base 1ac01c0b and the merge's first parent;
- J202's two final match lines on this host are there, complete and at their hashes, so the loop's count can be read;
- the verdict script, the rollout reader, the worst-games reader and the block reader written and tested on synthetic
  files;
- 4 games of each match against `search-v1-anytime`, one worker, in the pilot's own folder (the same deal for both):
  the arm and search-v2 search, policy-outlet does not, the reader agrees with each match line, the arm's random
  rollouts are counted and its guardrails fire, and search-v2's side carries no `search.rr.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j204-merged.txt || echo 0 > var/j204-merged.txt
cat var/j204-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the six players resolve; the arm is search-v2 with margin=60 and rollout=random4 and nothing else, policy-outlet is
# search-v2's seat config before +search: (D528 point 5); the hashes are D528's; the pin is D528's merge
mkdir -p var/j204-tools
./tools/ai-ladder.sh list > var/j204-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom4|search-v2-rrandom4-m40|search-v2-rrandom4-m60|policy-outlet|forge-default) ' var/j204-tools/players.txt
node - <<'J204EOF'
// J204's pilot: the six players resolve; (a) is search-v1-anytime (search-v2) with `margin=60` for `margin=20` and
// `,rollout=random4` appended and nothing else (and search-v2-rrandom4-m40's with 60 for 40); (b) policy-outlet is
// search-v2's seat config before `+search:`, byte for byte, and forge-default's is not; the hashes are D528's.
const fs = require('fs');
const L = fs.readFileSync('var/j204-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), r4 = get('search-v2-rrandom4'), m40 = get('search-v2-rrandom4-m40'), m60 = get('search-v2-rrandom4-m60'), po = get('policy-outlet'), fd = get('forge-default');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const M60CFG = V1CFG.replace(',margin=20,', ',margin=60,') + ',rollout=random4';
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const r = {
  present: [v1, r4, m40, m60, po, fd].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  m60_only_margin: base && m60 && m60.kind === 'search' && m60.cfg === M60CFG && r4 && m60.cfg === r4.cfg.replace(',margin=20,', ',margin=60,') && m40 && m60.cfg === m40.cfg.replace(',margin=40,', ',margin=60,') ? 1 : 0,
  baseline_is_seat: base && po && po.kind === 'policy' && po.cfg === 'Default+outlets' && v1.cfg.slice(0, v1.cfg.indexOf('+search:')) === po.cfg ? 1 : 0,
  forge_default_not_seat: fd && po && fd.cfg === 'Default' && fd.cfg !== po.cfg ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-rrandom4': r4?.hash ?? null, 'search-v2-rrandom4-m40': m40?.hash ?? null, 'search-v2-rrandom4-m60': m60?.hash ?? null, 'policy-outlet': po?.hash ?? null, 'forge-default': fd?.hash ?? null },
  hashesAsD528: v1?.hash === 'cdd55e02a89c' && r4?.hash === '646d59a008f6' && m40?.hash === '968c9003c616' && m60?.hash === '216e66d89fe3' && po?.hash === 'e350d94649a4' && fd?.hash === '3ed453ffef1c' ? 1 : 0,
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-rrandom4-m60': m60?.cfg ?? null, 'policy-outlet': po?.cfg ?? null, 'forge-default': fd?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.m60_only_margin && r.baseline_is_seat && r.forge_default_not_seat && r.hashesAsD528 ? 1 : 0;
fs.writeFileSync('var/j204-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J204EOF
# the pin is a merge, and what it brought (first parent to it): nothing under bridge/src, only players.json under tools/ai-ladder
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > var/j204-tools/parents.txt
git diff --name-only HEAD^1 HEAD -- bridge/src > var/j204-tools/merge-bridge.txt 2>/dev/null || true
git diff --name-only HEAD^1 HEAD -- tools/ai-ladder tools/ai-bench > var/j204-tools/merge-ladder.txt 2>/dev/null || true
# reported, not checked: against the lane's tip when drafted, and what main carried since D528's base
git diff --name-only 986b547044513d28cb6532777e50edf802530a10 HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j204-tools/tip-diff.txt 2>/dev/null || echo '(the lane tip 986b5470 is not in this checkout)' > var/j204-tools/tip-diff.txt
git diff --name-only 1ac01c0baf9e47b04e7da1e894f71384e7a9ed23 HEAD^1 -- bridge/src tools/ai-ladder tools/ai-bench > var/j204-tools/main-diff.txt 2>/dev/null || true
node - <<'J204EOF'
const fs = require('fs');
const lines = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
const parents = Number((lines('var/j204-tools/parents.txt')[0] || '0').trim());
const bridge = lines('var/j204-tools/merge-bridge.txt'), ladder = lines('var/j204-tools/merge-ladder.txt');
const r = { parents, bridge, ladder, bridgeFiles: bridge.length, ladderOther: ladder.filter((x) => x !== 'tools/ai-ladder/players.json').length,
  players: ladder.includes('tools/ai-ladder/players.json') ? 1 : 0, tipDiff: lines('var/j204-tools/tip-diff.txt'), mainDiff: lines('var/j204-tools/main-diff.txt') };
r.ok = r.parents === 2 && r.bridgeFiles === 0 && r.ladderOther === 0 && r.players === 1 ? 1 : 0;
fs.writeFileSync('var/j204-tools/search-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J204EOF
```
```bash
cat > var/j204-tools/verdict.mjs <<'J204EOF'
// J204's reading, pre-registered 2026-11-09 before any rated game of either match (the job's rule: line; D528 point 6:
// D527's table for the arm, unchanged, and the SIGNAL rule; D398's fixed match).
// usage: node verdict.mjs <match-a.json> <match-b.json> <rollouts-a.json> <J202a.json> <J202b.json> <out.json>
//        node verdict.mjs --prior <J202a.json> <J202b.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// THE MATCHES: (a) search-v2-rrandom4-m60, the arm, and (b) policy-outlet, the baseline (search-v2's seat with the search
//   off), each config A against search-v1-anytime (search-v2), 1,200 games, 600 mirrored pairs, the confirm set, no
//   stopping rule.
// COMPLETE (each): the line names the two players in that order at their config hashes (HASHES), complete: true, all
//   1,200 games played, errors + timeouts <= 60 (one in 20), lo, elo, eloLo and eloHi numbers.
// THE ARM (a), on its own match, only when complete, read once by the first row that holds (D527's table, D528 point 6):
//   SHOWN                         lo > 0.5 and elo >= 15                       -> confirm at 4,800 (D519's readings)
//   INCONCLUSIVE                  eloHi >= 15 (not SHOWN; lo > 0.5 included,   -> confirm at 4,800 (D519's readings)
//                                 case 1: inconclusiveAbove)
//   NOT SHOWN, indistinguishable  eloHi < 15, eloLo < 0 < eloHi, eloLo > -15   -> a candidate, confirmed at 4,800
//   NOT SHOWN, no weaker          eloHi < 15, eloLo >= 0 (case 2)              -> read with the row above
//   NOT SHOWN, loses badly        eloHi < -15                                  -> diagnose
//   NOT SHOWN, worse, not badly   the rest: eloHi in [-15, 0), the too-wide    -> diagnose
//                                 case (contains 0, eloLo <= -15: tooWide) and eloHi exactly 0 (case 3: upperAtZero)
//   candidate = SHOWN, INCONCLUSIVE, indistinguishable or no weaker; diagnose = worse, not badly or loses badly.
// SIGNAL (D528 point 6), only when both matches are complete: diff = a.elo - b.elo; hw = sqrt(((a.eloHi - a.eloLo)/2)^2
//   + ((b.eloHi - b.eloLo)/2)^2); lo = diff - hw, hi = diff + hw (lo, hi, diff and hw kept unrounded for the reading):
//   SIGNAL SHOWN        diff >= 15 and lo > 0
//   SIGNAL AGAINST      diff <= -15 and hi < 0
//   NO SIGNAL           lo <= 0 <= hi and -15 < diff < 15
//   SIGNAL INCONCLUSIVE anything else
// THE NIGHT: trackCloses = (NO SIGNAL or SIGNAL AGAINST) and the arm is not a candidate (D529 writes the closing);
//   closingWaits = (NO SIGNAL or AGAINST) and the arm is a candidate (its 4,800-game confirmation first);
//   confirm = the arm is a candidate; iterate = the arm is to diagnose and the track does not close (random-v6 on the
//   margin/LCB line); principleInDoubt = iterationLosesBadly = the arm loses badly (one random arm, D528 point 7);
//   repost = a match is incomplete (repostWhich names it: 'a', 'b' or 'a and b').
//   closingWaits: the confirmation holding means the track reached its goal and stays open; failing, it closes as on
//   NO SIGNAL (the confirmation's own job reads that, not this one).
// THE COUNTS AND THE NEXT STEP, pre-registered (D528 points 6-8), emitted for the next job to read from this night's
//   match lines on the host: signalInconclusiveCount = signalInconclusive (0|1; random-v5 is the first SIGNAL reading,
//   so the count is this night's own; random-v6's job adds its own and closes the track at 2); v6Margin, random-v6's
//   override=lcb margin, = 40 when (a)'s Elo point minus J202 (b)'s is below 0, else 60 (null when either line is not
//   complete); m40MinusBaseline = J202 (b)'s Elo point minus (b)'s (margin 40 against the same baseline, same deals),
//   reported, deciding nothing.
// THE LOOP'S COUNT (D528 point 7): j202.v4LosesBadly = J202's (a) search-v2-rrandom4 and (b) search-v2-rrandom4-m40
//   lines (PRIOR_HASHES) both complete and both eloHi < -15; loopStops = iterationLosesBadly and j202.v4LosesBadly. J202
//   read random-v4 as not losing badly, so this is 0 on the night unless its lines say otherwise; read from the lines.
//   selfPlayOpens and liveSeatChanged are 0 in every reading.
// THE COST (from rollouts.cjs, only when its file names the arm's match run): reported, never changing a reading.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const MATCHES = { a: ['search-v2-rrandom4-m60', 'search-v1-anytime'], b: ['policy-outlet', 'search-v1-anytime'] };
export const HASHES = { a: ['216e66d89fe3', 'cdd55e02a89c'], b: ['e350d94649a4', 'cdd55e02a89c'] };
export const PRIOR = { a: ['search-v2-rrandom4', 'search-v1-anytime'], b: ['search-v2-rrandom4-m40', 'search-v1-anytime'] };
export const PRIOR_HASHES = { a: ['646d59a008f6', 'cdd55e02a89c'], b: ['968c9003c616', 'cdd55e02a89c'] };
const READINGS = ['shown', 'inconclusive', 'indistinguishable', 'noWeaker', 'worseNotBadly', 'losesBadly'];
const SIGNALS = ['signalShown', 'signalAgainst', 'noSignal', 'signalInconclusive'];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const isComplete = (m, A, B, hA, hB) => m !== null && m.a === A && m.b === B && m.ah === hA && m.bh === hB && m.complete === true
  && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR
  && num(m.lo) !== null && num(m.elo) !== null && num(m.eloLo) !== null && num(m.eloHi) !== null;

function line(which, m) {
  const [A, B] = MATCHES[which];
  const names = m !== null && m.a === A && m.b === B && m.ah === HASHES[which][0] && m.bh === HASHES[which][1] ? 1 : 0;
  return {
    match: m === null ? 0 : 1, names, a: A, b: B, id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
    complete: names === 1 && isComplete(m, A, B, HASHES[which][0], HASHES[which][1]) ? 1 : 0,
  };
}
const missing = (s, which) => (s.match === 0 ? `NO MATCH (${which}): no reading; repost` : s.names === 0 ? `NOT THIS MATCH (${which}): no reading` : `INCOMPLETE (${which}): no reading; repost`);

export function arm(m, ro = null) {
  const s = line('a', m);
  const ok = s.complete === 1;
  const r = Object.fromEntries(READINGS.map((k) => [k, 0]));
  let tooWide = 0, upperAtZero = 0, inconclusiveAbove = 0;
  if (ok) {
    const containsZero = s.eloLo < 0 && s.eloHi > 0;
    if (s.lo > 0.5 && s.elo >= 15) r.shown = 1;
    else if (s.eloHi >= 15) { r.inconclusive = 1; inconclusiveAbove = s.lo > 0.5 ? 1 : 0; }
    else if (containsZero && s.eloLo > -15) r.indistinguishable = 1;
    else if (s.eloLo >= 0) r.noWeaker = 1;
    else if (s.eloHi < -15) r.losesBadly = 1;
    else { r.worseNotBadly = 1; tooWide = containsZero ? 1 : 0; upperAtZero = s.eloHi === 0 ? 1 : 0; }
  }
  const notShown = r.indistinguishable + r.noWeaker + r.worseNotBadly + r.losesBadly;
  const candidate = r.shown + r.inconclusive + r.indistinguishable + r.noWeaker;
  const diagnose = r.worseNotBadly + r.losesBadly;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && run !== null && ro.run === run ? 1 : 0;
  const rr = (k) => (sameRun ? num(ro[k]) : null);
  const cost = { read: sameRun, aRolloutsPerDecision: rr('aRolloutsPerDecision'), bRolloutsPerDecision: rr('bRolloutsPerDecision'), ratio: rr('ratio'),
    msRatio: s.aMs !== null && s.bMs !== null && s.bMs > 0 ? Math.round((s.aMs / s.bMs) * 10000) / 10000 : null,
    aRrRollouts: rr('aRrRollouts'), aRrFailures: rr('aRrFailures'), aPerRollout: sameRun && ro.aPerRollout ? ro.aPerRollout : null };
  const name = r.shown ? 'SHOWN' : r.inconclusive ? 'INCONCLUSIVE' : r.indistinguishable ? 'NOT SHOWN, indistinguishable'
    : r.noWeaker ? 'NOT SHOWN, no weaker' : r.losesBadly ? 'NOT SHOWN, loses badly' : r.worseNotBadly ? 'NOT SHOWN, worse, not badly' : null;
  const what = r.shown ? 'Forge leaves the rollout loop for this arm, after a 4,800-game confirmation under D519\'s readings holds it'
    : r.inconclusive ? `nothing yet: confirm at 4,800 games under D519's readings before anything${inconclusiveAbove ? ' (lower end above 0.5, point under +15: case 1)' : ''}`
    : r.indistinguishable ? 'the arm is a candidate to replace Forge in the loop, confirmed at 4,800 games (the same three conditions) before it does'
    : r.noWeaker ? 'an interval wholly at or above 0 (case 2): read with the indistinguishable row, a candidate confirmed at 4,800 games'
    : r.losesBadly ? 'diagnose; the principle\'s cheap path is in doubt'
    : r.worseNotBadly ? `diagnose${tooWide ? '; too wide to call (its interval contains 0 but its lower end is at or below -15)' : ''}${upperAtZero ? ' (upper end exactly 0: case 3)' : ''}`
    : null;
  const text = !ok ? missing(s, 'a') : `${name}: ${s.a} ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score}, lower end ${s.lo}; ${what}`;
  return { ...s, ...r, reading: name, notShown, candidate, diagnose, tooWide, upperAtZero, inconclusiveAbove, cost, text };
}

export function baseline(m) {
  const s = line('b', m);
  const text = s.complete ? `${s.a} (search-v2's seat with the search off) ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score}` : missing(s, 'b');
  return { ...s, text };
}

export function signal(a, b) {
  const z = Object.fromEntries(SIGNALS.map((k) => [k, 0]));
  if (!(a.complete === 1 && b.complete === 1)) return { read: 0, ...z, diff: null, hw: null, lo: null, hi: null, share: null, reading: null, text: 'SIGNAL: no reading (a match is incomplete)' };
  const diff = a.elo - b.elo;
  const hw = Math.sqrt(((a.eloHi - a.eloLo) / 2) ** 2 + ((b.eloHi - b.eloLo) / 2) ** 2);
  const lo = diff - hw, hi = diff + hw;
  if (diff >= 15 && lo > 0) z.signalShown = 1;
  else if (diff <= -15 && hi < 0) z.signalAgainst = 1;
  else if (lo <= 0 && hi >= 0 && diff > -15 && diff < 15) z.noSignal = 1;
  else z.signalInconclusive = 1;
  const share = b.elo < 0 ? Math.round((diff / -b.elo) * 1000) / 1000 : null;
  const reading = z.signalShown ? 'SIGNAL SHOWN' : z.signalAgainst ? 'SIGNAL AGAINST' : z.noSignal ? 'NO SIGNAL' : 'SIGNAL INCONCLUSIVE';
  const what = z.signalShown ? 'the random values carry signal beyond Forge\'s choice: the track stays open on the margin/LCB line'
    : z.signalAgainst ? 'the random values are worse than no search at all: the track closes'
    : z.noSignal ? 'no signal at margin 60 at +-15 on the point (not a proof of equivalence): the track closes'
    : 'the track stays open for one more iteration on the margin/LCB line, which registers this reading again';
  return { read: 1, ...z, diff: r1(diff), hw: r1(hw), lo: r1(lo), hi: r1(hi), share, reading,
    text: `${reading}: ${a.a} minus ${b.a} ${r1(diff)} Elo [${r1(lo)}, ${r1(hi)}] (+-${r1(hw)}); ${what}` };
}

// D528 point 7: did random-v4 (J202) lose badly? Both of its arms, each read from its own final line.
export function prior(pa, pb) {
  const one = (k, m) => {
    const [A, B] = PRIOR[k];
    const c = isComplete(m, A, B, PRIOR_HASHES[k][0], PRIOR_HASHES[k][1]) ? 1 : 0;
    return { complete: c, elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi), played: m?.played ?? 0, losesBadly: c && m.eloHi < -15 ? 1 : 0 };
  };
  const a = one('a', pa), b = one('b', pb);
  const read = a.complete && b.complete ? 1 : 0;
  return { read, a, b, v4LosesBadly: read && a.losesBadly && b.losesBadly ? 1 : 0 };
}

export function night(ma, mb, roa = null, pa = null, pb = null) {
  const a = arm(ma, roa), b = baseline(mb);
  const sig = signal(a, b);
  const j202 = prior(pa, pb);
  const closeSignal = sig.noSignal || sig.signalAgainst ? 1 : 0;
  const trackCloses = closeSignal && !a.candidate ? 1 : 0;
  const closingWaits = closeSignal && a.candidate ? 1 : 0;
  const keepsOpen = sig.signalShown || sig.signalInconclusive ? 1 : 0;
  const confirm = a.candidate ? 1 : 0;
  const iterate = a.diagnose && !trackCloses && sig.read ? 1 : 0;
  const principleInDoubt = a.losesBadly ? 1 : 0;
  const iterationLosesBadly = a.losesBadly ? 1 : 0;
  const loopStops = iterationLosesBadly && j202.v4LosesBadly ? 1 : 0;
  const repost = a.complete === 0 || b.complete === 0 ? 1 : 0;
  const repostWhich = a.complete === 0 && b.complete === 0 ? 'a and b' : a.complete === 0 ? 'a' : b.complete === 0 ? 'b' : null;
  const signalInconclusiveCount = sig.signalInconclusive ? 1 : 0;
  const marginStep = a.complete && j202.b.complete ? r1(a.elo - j202.b.elo) : null;
  const v6Margin = marginStep === null ? null : a.elo - j202.b.elo < 0 ? 40 : 60;
  const m40MinusBaseline = b.complete && j202.b.complete ? r1(j202.b.elo - b.elo) : null;
  const reading = [a.text, b.text, sig.text,
    confirm ? `a 4,800-game confirmation follows for ${a.a}${closingWaits ? ' (the closing waits on it)' : ''}` : 'the arm is not a candidate',
    trackCloses ? 'the random-rollout track closes (D523 point 10\'s stop); the owner is told, with the counters, which way it went; a D529 writes the closing from the track\'s closing draft'
      : closingWaits ? 'NO SIGNAL or AGAINST, but the arm is a candidate: its 4,800-game confirmation runs first; if it holds, the track reached its goal and stays open; if it fails, the track closes as on NO SIGNAL'
      : keepsOpen && sig.read ? 'the track stays open on the margin/LCB line' : 'no SIGNAL reading: the track neither closes nor is kept open on this night',
    iterate ? `the agent diagnoses ${a.a} and iterates as random-v6, override=lcb at margin ${v6Margin} (D528 point 8: (a) minus J202 (b) ${marginStep}${v6Margin === 40 ? ', below 0' : ', not below 0'}), without asking the owner` : 'no iteration from this night\'s arm',
    repost ? `an incomplete match is reposted: ${repostWhich === 'a and b' ? '(a) and (b)' : `(${repostWhich})`}${repostWhich === 'b' ? ' alone, (a) being complete' : ''}` : 'both matches complete',
    signalInconclusiveCount ? 'SIGNAL INCONCLUSIVE count 1 of 2: random-v6\'s job reads this night\'s match lines for it' : 'SIGNAL INCONCLUSIVE count 0',
    !j202.read ? 'J202\'s two final lines are not both here and complete: random-v4\'s count is unread'
      : j202.v4LosesBadly ? `random-v4 lost badly (J202 (a) upper end ${j202.a.eloHi}, (b) ${j202.b.eloHi})` : `random-v4 did not lose badly (J202 (a) upper end ${j202.a.eloHi}, (b) ${j202.b.eloHi}): the count restarted`,
    iterationLosesBadly ? (loopStops ? 'the arm loses badly after random-v4 lost badly: the loop stops (two successive iterations)' : 'the arm loses badly: random-v5 is an iteration that loses badly (count 1); the loop does not stop on that count')
      : 'random-v5 does not lose badly',
    loopStops ? 'the loop stops on the two-losing count' : 'the two-losing count does not stop the loop on this night',
    'the self-play-from-random path does not open on this night', 'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, a, b, signal: sig, j202, confirm, iterate, trackCloses, closingWaits, keepsOpen, d529: trackCloses,
    signalInconclusiveCount, marginStep, v6Margin, m40MinusBaseline, repostWhich,
    principleInDoubt, iterationLosesBadly, loopStops, repost, selfPlayOpens: 0, liveSeatChanged: 0, reading };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (which, o = {}) => {
    const [A, B] = MATCHES[which];
    return { id: `host:run-${which}`, a: A, b: B, ah: HASHES[which][0], bh: HASHES[which][1], complete: true, played: GAMES, errors: 0, timeouts: 0, score: 0.5, lo: 0.4864, hi: 0.5136, elo: 0, eloLo: -9.5, eloHi: 9.5,
      aSearch: { msPerDecision: 900 }, bSearch: { msPerDecision: 890 }, ...o };
  };
  const pm = (k, o = {}) => ({ id: `host:j202-${k}`, a: PRIOR[k][0], b: PRIOR[k][1], ah: PRIOR_HASHES[k][0], bh: PRIOR_HASHES[k][1], complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.4433, lo: 0.423, hi: 0.4636, elo: -39.5, eloLo: -53.9, eloHi: -25.3, ...o });
  // J202's final lines as they ended: (a) loses badly, (b) worse, not badly
  const J202A = pm('a');
  const J202B = pm('b', { score: 0.47, lo: 0.4511, hi: 0.4889, elo: -20.9, eloLo: -34.1, eloHi: -7.7 });
  const RO = (o = {}) => ({ run: 'run-a', games: GAMES, aRolloutsPerDecision: 18, bRolloutsPerDecision: 15, ratio: 1.2, aRrRollouts: 300000, aRrFailures: 0,
    aPerRollout: { v2_ownStack: 2.4, v4_goodBlockLethal: 0.002 }, ...o });
  // the arm and the baseline, each half-width 13.5: hw = 19.09
  const A = (elo, o = {}) => mk('a', { elo, eloLo: elo - 13.5, eloHi: elo + 13.5, score: 0.5 + elo / 700, lo: 0.5 + (elo - 13.5) / 700, ...o });
  const B = (elo, o = {}) => mk('b', { elo, eloLo: elo - 13.5, eloHi: elo + 13.5, score: 0.5 + elo / 700, lo: 0.5 + (elo - 13.5) / 700, ...o });
  const SHOWN = { score: 0.53, lo: 0.518, hi: 0.542, elo: 20.9, eloLo: 11.4, eloHi: 30.4 };
  const all = (ma, mb, roa = RO(), pa = J202A, pb = J202B) => [ma, mb, roa, pa, pb];
  const oneArm = (x) => (x.complete === 0 ? READINGS.every((k) => x[k] === 0) && x.candidate + x.diagnose === 0 : READINGS.reduce((y, k) => y + x[k], 0) === 1 && x.candidate + x.diagnose === 1);
  const oneSig = (s) => (s.read === 0 ? SIGNALS.every((k) => s[k] === 0) : SIGNALS.reduce((y, k) => y + s[k], 0) === 1);
  const sane = (r) => r.liveSeatChanged === 0 && r.selfPlayOpens === 0 && oneArm(r.a) && oneSig(r.signal)
    && r.trackCloses + r.closingWaits <= 1 && !(r.trackCloses && r.keepsOpen) && !(r.trackCloses && r.iterate) && !(r.trackCloses && r.confirm)
    && r.loopStops <= r.iterationLosesBadly && r.loopStops <= r.j202.v4LosesBadly && r.iterationLosesBadly === r.a.losesBadly
    && r.signalInconclusiveCount === r.signal.signalInconclusive && (r.repost === 0) === (r.repostWhich === null)
    && (r.v6Margin === null || r.v6Margin === (r.a.elo - r.j202.b.elo < 0 ? 40 : 60));
  const cases = [
    ['J202 (b)-like arm -20.9 against a baseline at -87.5: SIGNAL SHOWN, worse not badly, iterate, open', all(A(-20.9), B(-87.5)), (r) => r.signal.signalShown === 1 && r.signal.diff === 66.6 && r.a.worseNotBadly === 1 && r.iterate === 1 && r.trackCloses === 0 && r.keepsOpen === 1 && r.signal.share === 0.761],
    ['the arm at the baseline (-60 and -60): NO SIGNAL, the arm loses badly, the track closes, no iteration', all(A(-60), B(-60)), (r) => r.signal.noSignal === 1 && r.a.losesBadly === 1 && r.trackCloses === 1 && r.d529 === 1 && r.iterate === 0 && r.principleInDoubt === 1 && r.loopStops === 0],
    ['diff +14.9 with its interval containing 0: NO SIGNAL', all(A(-45.1), B(-60)), (r) => r.signal.noSignal === 1 && r.trackCloses === 1],
    ['diff +15 exactly, lower end -4.1: INCONCLUSIVE (the interval reaches 0), open', all(A(-45), B(-60)), (r) => r.signal.signalInconclusive === 1 && r.keepsOpen === 1 && r.trackCloses === 0 && r.iterate === 1],
    ['diff +19.2, lower end just above 0: SIGNAL SHOWN', all(A(-40.8), B(-60)), (r) => r.signal.signalShown === 1 && r.signal.lo > 0],
    ['diff +19.0, lower end just below 0: INCONCLUSIVE', all(A(-41), B(-60)), (r) => r.signal.signalInconclusive === 1],
    ['diff +10 with tight intervals (hw 7.1): its interval above 0 but under +15: INCONCLUSIVE, a small signal', all(A(-50, { eloLo: -55, eloHi: -45 }), B(-60, { eloLo: -65, eloHi: -55 })), (r) => r.signal.signalInconclusive === 1 && r.signal.lo > 0 && r.keepsOpen === 1],
    ['diff -14.9: NO SIGNAL', all(A(-74.9), B(-60)), (r) => r.signal.noSignal === 1],
    ['diff -15 exactly with its interval reaching 0: INCONCLUSIVE', all(A(-75), B(-60)), (r) => r.signal.signalInconclusive === 1 && r.trackCloses === 0],
    ['diff -20 with its upper end below 0: SIGNAL AGAINST, the track closes', all(A(-80), B(-60)), (r) => r.signal.signalAgainst === 1 && r.trackCloses === 1 && r.iterate === 0],
    ['diff -20 whose upper end reaches +0.5 (hw 20.5): INCONCLUSIVE, not AGAINST', all(A(-80, { eloLo: -94.5, eloHi: -65.5 }), B(-60, { eloLo: -74.5, eloHi: -45.5 })), (r) => r.signal.signalInconclusive === 1 && r.signal.hi > 0 && r.signal.hi < 1],
    ['diff -10 with tight intervals, upper end below 0 but over -15: INCONCLUSIVE', all(A(-70, { eloLo: -75, eloHi: -65 }), B(-60, { eloLo: -65, eloHi: -55 })), (r) => r.signal.signalInconclusive === 1 && r.signal.hi < 0],
    ['the arm indistinguishable from search-v2 and NO SIGNAL (a baseline at -5): the closing waits on the confirmation', all(mk('a'), B(-5)), (r) => r.a.indistinguishable === 1 && r.signal.noSignal === 1 && r.trackCloses === 0 && r.closingWaits === 1 && r.confirm === 1 && r.d529 === 0],
    ['the arm SHOWN against a baseline at -87.5: SIGNAL SHOWN, confirm, no iteration', all(mk('a', SHOWN), B(-87.5)), (r) => r.a.shown === 1 && r.signal.signalShown === 1 && r.confirm === 1 && r.iterate === 0 && r.keepsOpen === 1],
    ['a point of exactly +15 with the lower end above 0.5 is SHOWN', all(mk('a', { lo: 0.505, elo: 15, eloLo: 5.5, eloHi: 24.5 }), B(-87.5)), (r) => r.a.shown === 1],
    ['a lower end above 0.5 with a point of +14.9 is INCONCLUSIVE (case 1)', all(mk('a', { lo: 0.505, elo: 14.9, eloLo: 5.4, eloHi: 24.4 }), B(-87.5)), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 1 && r.a.candidate === 1],
    ['a lower end of exactly 0.5 is not SHOWN: INCONCLUSIVE, not case 1', all(mk('a', { lo: 0.5, elo: 18, eloLo: 0, eloHi: 36 }), B(-87.5)), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 0],
    ['an upper end of +14.9 containing 0 is indistinguishable', all(mk('a', { elo: 5.4, eloLo: -4.1, eloHi: 14.9 }), B(-87.5)), (r) => r.a.indistinguishable === 1],
    ['an upper end of exactly +15 is INCONCLUSIVE', all(mk('a', { elo: 5.5, eloLo: -4, eloHi: 15 }), B(-87.5)), (r) => r.a.inconclusive === 1 && r.a.indistinguishable === 0],
    ['-1 [-17.2, +15.2] is INCONCLUSIVE before indistinguishable', all(mk('a', { elo: -1, eloLo: -17.2, eloHi: 15.2 }), B(-87.5)), (r) => r.a.inconclusive === 1],
    ['a lower end of -14.9 is indistinguishable', all(mk('a', { elo: -5, eloLo: -14.9, eloHi: 4.9 }), B(-87.5)), (r) => r.a.indistinguishable === 1],
    ['a lower end of exactly -15 is too wide: worse, not badly', all(mk('a', { elo: -5.1, eloLo: -15, eloHi: 4.8 }), B(-87.5)), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1 && r.a.diagnose === 1],
    ['-12 [-21.5, -2.5] is worse, not badly, not too wide', all(mk('a', { elo: -12, eloLo: -21.5, eloHi: -2.5 }), B(-87.5)), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 0],
    ['an upper end of exactly -15 is worse, not badly', all(mk('a', { elo: -24.5, eloLo: -34, eloHi: -15 }), B(-87.5)), (r) => r.a.worseNotBadly === 1 && r.a.losesBadly === 0],
    ['an upper end of -15.1 loses badly; random-v4 did not: no stop', all(mk('a', { elo: -24.6, eloLo: -34.1, eloHi: -15.1 }), B(-87.5)), (r) => r.a.losesBadly === 1 && r.iterationLosesBadly === 1 && r.j202.v4LosesBadly === 0 && r.loopStops === 0 && r.iterate === 1],
    ['an upper end of exactly 0 is worse, not badly (case 3)', all(mk('a', { elo: -9.5, eloLo: -19, eloHi: 0 }), B(-87.5)), (r) => r.a.worseNotBadly === 1 && r.a.upperAtZero === 1],
    ['an interval wholly at or above 0 under +15 is no weaker (case 2): a candidate', all(mk('a', { lo: 0.5, elo: 4.5, eloLo: 0, eloHi: 9 }), B(-87.5)), (r) => r.a.noWeaker === 1 && r.a.candidate === 1 && r.confirm === 1],
    ['the loop: had J202 (b) lost badly too, an arm losing badly would stop it', all(A(-60), B(-87.5), RO(), J202A, pm('b', { elo: -30, eloLo: -44, eloHi: -16 })), (r) => r.j202.v4LosesBadly === 1 && r.a.losesBadly === 1 && r.loopStops === 1],
    ['the loop: J202 as it ended (b not losing badly): the count restarted, no stop', all(A(-60), B(-87.5)), (r) => r.j202.read === 1 && r.j202.v4LosesBadly === 0 && r.loopStops === 0],
    ['the loop: J202 (b) missing: unread, no stop', all(A(-60), B(-87.5), RO(), J202A, null), (r) => r.j202.read === 0 && r.loopStops === 0],
    ['the loop: J202 (a) at another hash is not J202 (a): unread', all(A(-60), B(-87.5), RO(), { ...J202A, ah: '8d1623965986' }, J202B), (r) => r.j202.read === 0],
    ['a stopped (a): no arm reading, no SIGNAL, reposted, nothing closes', all({ ...A(-20), complete: false, played: 800 }, B(-87.5)), (r) => r.a.complete === 0 && r.signal.read === 0 && r.repost === 1 && r.trackCloses === 0 && r.iterate === 0 && r.keepsOpen === 0],
    ['a stopped (b): the arm is read, no SIGNAL, reposted, nothing closes, no iteration yet', all(A(-20.9), { ...B(-87.5), complete: false, played: 1100 }), (r) => r.a.worseNotBadly === 1 && r.b.complete === 0 && r.signal.read === 0 && r.repost === 1 && r.trackCloses === 0 && r.iterate === 0],
    ['1,199 games of (b) is not complete', all(A(-20.9), { ...B(-87.5), played: 1199 }), (r) => r.b.complete === 0 && r.signal.read === 0],
    ['61 errors and timeouts in (a) is not complete', all(A(-20.9, { errors: 40, timeouts: 21 }), B(-87.5)), (r) => r.a.complete === 0],
    ['60 errors and timeouts is complete', all(A(-20.9, { errors: 40, timeouts: 20 }), B(-87.5)), (r) => r.a.complete === 1 && r.repost === 0],
    ['a (b) line without eloHi is not complete', all(A(-20.9), { ...B(-87.5), eloHi: null }), (r) => r.b.complete === 0],
    ['forge-default in (b)\'s file is not the baseline', all(A(-20.9), { ...B(-87.5), a: 'forge-default', ah: '3ed453ffef1c' }), (r) => r.b.names === 0 && r.b.complete === 0 && r.signal.read === 0],
    ['J194 (a)\'s line (search-v1-anytime first, forge-default second) in (b)\'s file is not the baseline', all(A(-20.9), { ...B(87.5), a: 'search-v1-anytime', b: 'forge-default', ah: 'cdd55e02a89c', bh: '3ed453ffef1c' }), (r) => r.b.names === 0 && r.b.complete === 0],
    ['J202 (b)\'s arm (margin 40) in (a)\'s file is not (a)', all({ ...A(-20.9), a: 'search-v2-rrandom4-m40', ah: '968c9003c616' }, B(-87.5)), (r) => r.a.names === 0 && r.a.complete === 0],
    ['(a) at the margin-40 hash is not this match', all({ ...A(-20.9), ah: '968c9003c616' }, B(-87.5)), (r) => r.a.names === 0 && r.a.complete === 0],
    ['the players swapped in (a) is not this match', all({ ...A(20.9), a: 'search-v1-anytime', b: 'search-v2-rrandom4-m60' }, B(-87.5)), (r) => r.a.names === 0],
    ['no (b) file: no SIGNAL, reposted', all(A(-20.9), null), (r) => r.b.match === 0 && r.signal.read === 0 && r.repost === 1],
    ['the rollouts are read from the arm\'s own run and change no reading', all(A(-20.9), B(-87.5)), (r) => r.a.cost.read === 1 && r.a.cost.ratio === 1.2 && r.a.cost.aPerRollout.v2_ownStack === 2.4 && r.a.cost.msRatio === 1.0112],
    ['a rollout file from another run is not read', all(A(-20.9), B(-87.5), RO({ run: 'run-x' })), (r) => r.a.cost.read === 0 && r.a.cost.ratio === null && r.signal.signalShown === 1],
    ['random-v6\'s margin: (a) at -20.9, level with J202 (b)\'s -20.9 (not below 0): 60; J202 (b) minus the baseline 66.6', all(A(-20.9), B(-87.5)), (r) => r.marginStep === 0 && r.v6Margin === 60 && r.m40MinusBaseline === 66.6 && r.iterate === 1],
    ['random-v6\'s margin: (a) at -21, 0.1 under J202 (b): 40', all(A(-21), B(-87.5)), (r) => r.marginStep === -0.1 && r.v6Margin === 40],
    ['random-v6\'s margin: (a) at -5, above J202 (b): 60', all(A(-5, { eloLo: -14.5, eloHi: 4.5 }), B(-87.5)), (r) => r.v6Margin === 60 && r.a.indistinguishable === 1 && r.iterate === 0],
    ['random-v6\'s margin with J202 (b) missing: none, and no m40 line', all(A(-21), B(-87.5), RO(), J202A, null), (r) => r.v6Margin === null && r.m40MinusBaseline === null],
    ['SIGNAL INCONCLUSIVE counts 1; SHOWN counts 0', all(A(-45), B(-60)), (r) => r.signalInconclusiveCount === 1 && r.reading.some((x) => x.includes('count 1 of 2'))],
    ['repost names (b) alone when (a) is complete', all(A(-20.9), { ...B(-87.5), complete: false, played: 900 }), (r) => r.repostWhich === 'b' && r.reading.some((x) => x.includes('(b) alone'))],
    ['repost names both', all({ ...A(-20.9), complete: false }, null), (r) => r.repostWhich === 'a and b'],
    ['NO SIGNAL is worded as no signal at margin 60 at +-15 on the point', all(A(-60), B(-60)), (r) => r.signal.text.includes('no signal at margin 60 at +-15 on the point')],
    ['a closing that waits says what the confirmation decides', all(mk('a'), B(-5)), (r) => r.closingWaits === 1 && r.reading.some((x) => x.includes('if it holds, the track reached its goal and stays open; if it fails, the track closes'))],
    ['the share is not given when the baseline is not below 0', all(A(10), B(5)), (r) => r.signal.share === null && r.signal.noSignal === 1],
  ];
  let ok = 0;
  cases.forEach(([what, ms, pred], i) => {
    const files = ['a', 'b', 'roa', 'pa', 'pb'].map((w, j) => {
      const f = path.join(scratch, `case-${i}-${w}.json`);
      if (ms[j] !== null) fs.writeFileSync(f, JSON.stringify(ms[j]));
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
} else if (argv[0] === '--prior' && argv.length === 4) {
  const r = prior(read(argv[1]), read(argv[2]));
  fs.mkdirSync(path.dirname(argv[3]), { recursive: true });
  fs.writeFileSync(argv[3], JSON.stringify(r) + '\n');
  console.log(JSON.stringify(r));
} else if (argv.length === 6) {
  const r = night(read(argv[0]), read(argv[1]), read(argv[2]), read(argv[3]), read(argv[4]));
  fs.mkdirSync(path.dirname(argv[5]), { recursive: true });
  fs.writeFileSync(argv[5], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match-a.json> <match-b.json> <rollouts-a.json> <J202a.json> <J202b.json> <out.json> | --prior <J202a.json> <J202b.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J204EOF
cat > var/j204-tools/rollouts.cjs <<'J204EOF'
// J204: J202's reader (J201's, J199's, J198's, J197's, itself J195's), plus each side's outlet-policy actions (D310's `policy.*` keys:
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
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, playUs: 0, copyUs: 0, rolloutErrors: 0, stepCap: 0, rr: {}, prr: {}, pol: {}, polGames: 0, lines: 0 });
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
  });
}
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run: r.run, games: r.games, aRolloutsPerDecision: r.aRolloutsPerDecision, bRolloutsPerDecision: r.bRolloutsPerDecision, ratio: r.ratio, aRrRollouts: r.aRrRollouts, bRrRollouts: r.bRrRollouts, aV2Fires: r.aV2Fires, aV3Fires: r.aV3Fires, aV4Fires: r.aV4Fires, aPolicy: r.aPolicy, aPolicyGames: r.aPolicyGames, bPolicy: r.bPolicy, bPolicyGames: r.bPolicyGames, aPerRollout: r.aPerRollout }));
J204EOF
cat > var/j204-tools/worst.cjs <<'J204EOF'
// J204 (J202's, unchanged): the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 and D527 continue it). A batch line has no life total, so the
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
J204EOF
cat > var/j204-tools/seeds.cjs <<'J204EOF'
// J204 (J202's, unchanged): which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
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
J204EOF
rm -rf var/j204-tools/selftest
node var/j204-tools/verdict.mjs --selftest var/j204-tools/selftest > var/j204-tools/selftest.json
cat var/j204-tools/selftest.json
# J202's two final match lines on this host, read for the loop's count (D528 point 7): both there, complete, at their hashes
node var/j204-tools/verdict.mjs --prior var/ai-ladder/match-J202a.json var/ai-ladder/match-J202b.json var/j204-tools/j202.json
# the rollout reader and the worst-games reader on a synthetic batch folder: three games; the arm (A) wins one, loses
# two (one of them the longer), with R8's v3. and D527's v4. counters on the lost two; search-v2 (B) carries no
# search.rr.* key, and its outlet policy acted in two games (policy.* keys, 3 in all)
rm -rf var/j204-tools/ro-selftest
mkdir -p var/j204-tools/ro-selftest/batches/run-s
C='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=60,maxrounds=12,what=pab,seed=0,anytime=1'
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"',rollout=random4","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":320,"search.rr.v2.lethalAttack":4,"search.rr.v3.goodBlock":8,"search.rr.v4.goodBlockLethal":4,"search.rr.land":20}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10,"policy.LETHAL":2}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"',rollout=random4","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":160,"search.rr.failures":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"',rollout=random4","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.rr.rollouts":160,"search.rr.v2.castSomething":16,"search.rr.v4.goodBlockRefused":4}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10,"policy.COMBAT":1}}}' \
  > var/j204-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rrandom4-m60","b":"search-v1-anytime"}' > var/j204-tools/ro-selftest/match.json
node var/j204-tools/rollouts.cjs var/j204-tools/ro-selftest var/j204-tools/ro-selftest/match.json var/j204-tools/ro-selftest/out.json
node var/j204-tools/worst.cjs var/j204-tools/ro-selftest var/j204-tools/ro-selftest/match.json random4 var/j204-tools/ro-selftest/worst.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j204-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j204-tools/ro-selftest/worst.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.bRolloutsPerDecision===13.33&&r.ratio===1.2&&r.aRrRollouts===480&&r.bRrRollouts===0&&r.aPerRollout.v2_ownStack===1&&r.aPerRollout.v2_lethalAttack===0.0083&&r.aPerRollout.v2_castSomething===0.0333&&r.aPerRollout.land===0.0417&&r.aPerGame.v2_ownStack===160&&r.aRrFailures===1&&r.aV2Fires===500&&r.aV3Fires===8&&r.aV4Fires===8&&r.aPerRollout.v3_goodBlock===0.0167&&r.aPerRollout.v4_goodBlockLethal===0.0083&&r.aPerRollout.v4_goodBlockRefused===0.0083&&r.bV3Fires===0&&r.bV4Fires===0&&r.aPlayMsPerRollout===33.33&&r.aPolicy===0&&r.aPolicyGames===0&&r.bPolicy===3&&r.bPolicyGames===2&&r.bPolicyKeys.LETHAL===2&&r.bPolicyKeys.COMBAT===1&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w.longest[0].seed===11&&w.longest[0].v2PerRollout.ownStack===2&&w.longest[0].v3PerRollout.goodBlock===0.05&&w.longest[0].v4PerRollout.goodBlockLethal===0.025&&w.quickest[0].v4PerRollout.goodBlockRefused===0.025&&w.longest[0].changed===2&&w.longest[0].aDeck==="x-A"&&w.quickest[0].seed===13&&w.meanTurnsLost===10&&w.meanTurnsWon===9?1:0;fs.writeFileSync("var/j204-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j204-tools/seeds-selftest
mkdir -p var/j204-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j204-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j204-tools/seeds-selftest/match.json
node var/j204-tools/seeds.cjs var/j204-tools/seeds-selftest var/j204-tools/seeds-selftest/match.json var/j204-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j204-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j204-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of each match (one batch of one deck pair, one worker, one after the other), in the pilot's own ladder folder
# and seed range (the same deal for both), then each side's rollouts, search.rr.* and policy.* counters from the batch,
# and the worst-games reader on the arm's
for x in a:search-v2-rrandom4-m60 b:policy-outlet; do
  k=${x%%:*}; p=${x#*:}
  ./tools/ai-ladder.sh match "$p" search-v1-anytime --games 4 --batch-pairs 1 --host j204-pilot --purpose pilot --dir var/ai-ladder-pilot/J204 --experiments var/ai-ladder-pilot/J204/experiments.jsonl --out var/ai-ladder-pilot/J204/match-$k.json --jobs 1
  node var/j204-tools/rollouts.cjs var/ai-ladder-pilot/J204 var/ai-ladder-pilot/J204/match-$k.json var/j204-tools/rollouts-pilot-$k.json
done
node var/j204-tools/worst.cjs var/ai-ladder-pilot/J204 var/ai-ladder-pilot/J204/match-a.json random4 var/j204-tools/worst-pilot-a.json
```
metrics: merged = sh: cat var/j204-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j204-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j204-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"bridgeFiles":-1,"ladderOther":-1,"players":0}'
metrics: st = sh: cat var/j204-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pj = sh: cat var/j204-tools/j202.json 2>/dev/null || echo '{"read":0,"v4LosesBadly":0}'
metrics: rst = sh: cat var/j204-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j204-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J204/match-a.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmb = sh: cat var/ai-ladder-pilot/J204/match-b.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pra = sh: cat var/j204-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0}'
metrics: prb = sh: cat var/j204-tools/rollouts-pilot-b.json 2>/dev/null || echo '{"games":0}'
metrics: pwa = sh: cat var/j204-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: pl.ok == 1
check: pl.m60_only_margin == 1
check: pl.baseline_is_seat == 1
check: pl.forge_default_not_seat == 1
check: pl.hashesAsD528 == 1
check: sd.parents == 2
check: sd.bridgeFiles == 0
check: sd.ladderOther == 0
check: sd.players == 1
check: st.ok == 1
check: st.cases == 55
check: pj.read == 1
check: rst.ok == 1
check: sst.ok == 1
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
check: pwa.games == 4
check: pwa.aCfgOther == 0
check: pma.aSearch.msPerDecision < 1500
check: pma.bSearch.msPerDecision < 1500
check: pmb.complete == true
check: pmb.played == 4
check: pmb.errors + pmb.timeouts <= 1
check: pmb.aSearch.searched == 0
check: pmb.bSearch.searched >= 10
check: prb.games == 4
check: prb.aDecisions == 0
check: prb.bDecisions == pmb.bSearch.searched
check: prb.aRrRollouts == 0
check: prb.bRrRollouts == 0
check: pmb.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- the six players resolve on this PC: `pl.m60_only_margin` says the arm's ai-bench config is search-v1-anytime's with
  `margin=60` for `margin=20` and `,rollout=random4` appended and nothing else (and search-v2-rrandom4's and -m40's
  with only the margin changed); `pl.baseline_is_seat` that policy-outlet's is `Default+outlets`, search-v1-anytime's
  before `+search:`, byte for byte; `pl.forge_default_not_seat` that forge-default's is `Default`, not it; and
  `pl.hashesAsD528` that the hashes are D528's (`216e66d89fe3`, `e350d94649a4`, `cdd55e02a89c`, and J202's
  `646d59a008f6` and `968c9003c616`, and forge-default `3ed453ffef1c`, unchanged);
- `sd`: the pin has two parents (it is a merge), it brought no file under `bridge/src`, and under `tools/ai-ladder` and
  `tools/ai-bench` only `tools/ai-ladder/players.json`, so the arm plays D527's rollouts and nothing else changed in
  the search or the bench with it;
- the verdict script reads fifty-five synthetic sets of files as D528's rule says: SIGNAL at and beside each of its bars
  (the +15 and -15 points, the interval's lower end at and beside 0 for SHOWN and its upper end for AGAINST, a small
  signal whose interval excludes 0 read INCONCLUSIVE both ways, J202 (b)'s -20.9 against a baseline at -87.5 read
  SIGNAL SHOWN at +66.6 with a share of 0.761), the track closing on NO SIGNAL and AGAINST and waiting on a candidate,
  D527's table for the arm at and beside every bar (its three unreached cases and the too-wide case among them), an
  incomplete match giving no reading and no SIGNAL and being reposted, 1,199 games, 61 errors, a missing upper end,
  forge-default or J194 (a)'s line in (b)'s file, the margin-40 arm or its hash in (a)'s, swapped players, a rollout
  file from another run not read, and the loop's count: it stops only when the arm loses badly and both of J202's
  complete lines lost badly (J202 as it ended, (b) not losing badly: no stop; J202 (b) missing or J202 (a) at another
  hash: unread, no stop), random-v6's pre-registered margin at and beside J202 (b)'s point (60 at a tie, 40 0.1 under,
  none without J202 (b)), the SIGNAL INCONCLUSIVE count, repost naming (b) alone or both, NO SIGNAL's wording and what
  a waiting closing decides; exactly one arm reading and one SIGNAL reading when complete, the self-play path never
  opened and the live seat never changed;
- `pj.read`: J202's two final match lines are on this host, complete and at their hashes, so the night can count the
  loop (`pj.v4LosesBadly` is recorded, not checked; expected 0: J202 (b) did not lose badly);
- the rollout reader and the worst-games reader read a synthetic batch of three games as written (`rst.ok`: rollouts
  and rounds a decision, every `search.rr.*` per random rollout and per game, the `v3.` and `v4.` sums, the failures,
  the outlet policy's `policy.*` actions per side and the games with any, the lost games ranked by turns with the arm's
  counters), and the block reader a synthetic results log (`sst.ok`);
- in 4 games of the arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **the arm's random rollouts are counted and its guardrails fired** (`pra.aRrRollouts`, `pra.aV2Fires`),
  **search-v2's side carries none** (`pra.bRrRollouts` 0), every line's config A is the arm's (`pwa.aCfgOther` 0);
  in 4 games of the baseline **policy-outlet searches nothing** (`pmb.aSearch.searched` 0, `prb.aDecisions` 0, no
  random rollout on either side) while search-v2 does; both searching sides stay under the 1.5 s budget on average.

Read, not checked:
- `sd.tipDiff`, the files under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` that differ between the lane's
  tip when this was drafted (986b5470) and the pin: empty unless the lane took commits after this draft (a skeptic's
  fixes) or main moved under those folders before the merge, which `sd.mainDiff` (main's changes there between D528's
  base 1ac01c0b and the merge's first parent) separates out; `summary.md` names any file in either;
- the arm's rollouts a decision against search-v2's (`pra.ratio`; D528's pilot in its Measured section, x1.22; J202
  (b) x1.134 over its night), play and copy ms a rollout, each guardrail per random rollout (`pra.aPerRollout`),
  `pra.aRrFailures` and rollout errors; the arm's changed answers against search-v2's (the margin at 60 should override
  Forge less than J202 (b)'s 26.4%); each side's outlet-policy actions (`pr*.aPolicy`, `pr*.bPolicy`; zero on a deal
  with no sacrifice outlet);
- `pj.a` and `pj.b`: J202's two readings as this job's loop count reads them.

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J204a.json
```bash
# (a) random4 rollouts with the override margin at 60: search-v2 with margin=60 and rollout=random4 against search-v2, 1,200 games
test -f var/j204-tools/verdict.mjs
mkdir -p var/j204
echo "J204 (a): search-v2-rrandom4-m60 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom4-m60 search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J204a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J204b.json
```bash
# (b) the baseline: search-v2's seat with the search off (policy-outlet, Default+outlets) against search-v2, 1,200 games
echo "J204 (b): policy-outlet against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match policy-outlet search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J204b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j204/verdict.json var/j204/report.md var/j204/rollouts-a.json var/j204/rollouts-b.json var/j204/seeds-a.json var/j204/seeds-b.json var/j204/worst-a.json var/j204/rollouts-j194a.json
```bash
# the pre-registered readings (D527's table for the arm, SIGNAL for the arm against the baseline); each match's
# rollouts, counters, deal blocks and the arm's worst-lost games (read, not gated); the loop's count from J202's two
# final lines; J194 (a)'s outlet-policy actions for the beside line; report.md (numbers only; the PC session writes the
# summary beside it)
mkdir -p var/j204
for k in a b; do
  node var/j204-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J204$k.json var/j204/rollouts-$k.json
  node var/j204-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J204$k.json var/j204/seeds-$k.json
done
node var/j204-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J204a.json random4 var/j204/worst-a.json
node var/j204-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J194a.json var/j204/rollouts-j194a.json
node var/j204-tools/verdict.mjs var/ai-ladder/match-J204a.json var/ai-ladder/match-J204b.json var/j204/rollouts-a.json var/ai-ladder/match-J202a.json var/ai-ladder/match-J202b.json var/j204/verdict.json
node - <<'J204EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const K = ['a', 'b'];
const M = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J204${k}.json`)]));
const RO = Object.fromEntries(K.map((k) => [k, read(`var/j204/rollouts-${k}.json`)]));
const BS = Object.fromEntries(K.map((k) => [k, read(`var/j204/seeds-${k}.json`)]));
const W = read('var/j204/worst-a.json');
const R194 = read('var/j204/rollouts-j194a.json');
const v = read('var/j204/verdict.json');
const sg = v.signal || {};
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const r1 = (x) => Math.round(x * 10) / 10;
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const hours = (m) => { const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const L = ['# J204: random-v5, search-v2-rrandom4-m60 (random4 rollouts, override margin 60) and the baseline policy-outlet (search-v2\'s seat with the search off), each against search-v1-anytime (D528)', ''];
L.push(`**The arm under D527's table (D528 point 6):** ${(v.a || {}).text ?? 'no reading'}.`, '');
L.push(`**The baseline:** ${(v.b || {}).text ?? 'no reading'}.`, '');
L.push(`**SIGNAL (D528 point 6):** ${sg.text ?? 'no reading'}${typeof sg.share === 'number' ? `; the random values keep ${pct(sg.share)} of search-v2's own gain over the seat under it (information)` : ''}.`, '');
L.push(`**Beside the reading (information, deciding nothing):** J202 (b), random4 at margin 40, minus the baseline on the same deals: ${v.m40MinusBaseline ?? '-'} Elo on the point (margin 40 against the same seat under the search); (a) minus J202 (b): ${v.marginStep ?? '-'} (the margin 40 to 60), so random-v6's override=lcb margin is ${v.v6Margin ?? '-'} (D528 point 8: 40 when that difference is below 0, else 60); SIGNAL INCONCLUSIVE count ${v.signalInconclusiveCount ?? 0} of 2. Both matches start at block 114,900,000: (a) ${BS.a.min === 114900000 ? 1 : 0}, (b) ${BS.b.min === 114900000 ? 1 : 0} (lowest blocks ${BS.a.min ?? '-'} and ${BS.b.min ?? '-'}; a memory retry starts later, and the deals then differ in part).`, '');
L.push(`**What the night decides:** ${(v.reading || []).slice(3).join('; ') || '-'}.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k], r = RO[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${r.aRolloutsPerDecision ?? '-'} | ${r.bRolloutsPerDecision ?? '-'} | ${r.ratio ?? '-'} | ${r.aPlayMsPerRollout ?? '-'} / ${r.bPlayMsPerRollout ?? '-'} | ${r.aCopyMsPerRollout ?? '-'} / ${r.bCopyMsPerRollout ?? '-'} | ${hours(m) ?? '-'} |`);
}
L.push('');
for (const k of K) {
  const m = M[k], r = RO[k], b = BS[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Deal blocks ${b.blocks ?? '-'}, ${b.min ?? '-'} to ${b.max ?? '-'}, ${b.games ?? '-'} games. Rounds per searched decision ${r.aRoundsPerDecision ?? '-'} / ${r.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${r.aShort ?? '-'} = ${pct(r.aShortShare, 2)} / ${r.bShort ?? '-'} = ${pct(r.bShortShare, 2)}; rollout errors ${r.aRolloutErrors ?? '-'} / ${r.bRolloutErrors ?? '-'}, step caps ${r.aStepCaps ?? '-'} / ${r.bStepCaps ?? '-'}; the rollout reader saw ${r.games ?? '-'} games and ${r.aDecisions ?? '-'} / ${r.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}). Random rollouts ${r.aRrRollouts ?? '-'} of config A's ${r.aRollouts ?? '-'}; search-v2's side ${r.bRrRollouts ?? '-'}; random-seat failures ${r.aRrFailures ?? '-'}. Outlet-policy actions (policy.*): ${m.a} ${r.aPolicy ?? '-'} in ${r.aPolicyGames ?? '-'} games ${JSON.stringify(r.aPolicyKeys || {})}, ${m.b} ${r.bPolicy ?? '-'} in ${r.bPolicyGames ?? '-'} games ${JSON.stringify(r.bPolicyKeys || {})}.`);
}
L.push('', `J194 (a), search-v1-anytime vs forge-default on the same deals (information only): search-v2's outlet-policy actions ${R194.aPolicy ?? '-'} in ${R194.aPolicyGames ?? '-'} games ${JSON.stringify(R194.aPolicyKeys || {})}; forge-default (outlets off) ${R194.bPolicy ?? '-'}.`);
const names = Object.keys(RO.a.aPerRollout || {}).sort((x, y) => ((x.startsWith('v') ? 0 : 1) - (y.startsWith('v') ? 0 : 1)) || x.localeCompare(y));
L.push('', '| search.rr.<name> | (a) fires | (a) per random rollout | (a) per game |', '|---|---|---|---|');
for (const n of names) {
  const raw = n.replace(/_/g, '.');
  L.push(`| ${raw} | ${(RO.a.aRr || {})[raw] ?? 0} | ${(RO.a.aPerRollout || {})[n] ?? '-'} | ${(RO.a.aPerGame || {})[n] ?? '-'} |`);
}
L.push(`| rollouts (the denominator) | ${RO.a.aRrRollouts ?? '-'} | 1 | ${RO.a.games ? Math.round((RO.a.aRrRollouts / RO.a.games) * 100) / 100 : '-'} |`);
L.push('', 'R3\'s v2.targetSide counts target lists narrowed at each listing, not picks (D523\'s residual). Under rollout=random4 the fires of both random seats are summed. J202 (b), the same rollouts at margin 40, per random rollout: v2.ownStack 2.4546, v2.targetSide 0.5908, v2.castSomething 0.2316, v3.goodBlock 0.0231, v4.goodBlockLethal 0.0025, v4.goodBlockRefused 0.0294, v2.lethalBlock 0.014, v2.chumpBlock 0.0541.');
L.push('', '| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k];
  for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| (${k}) | ${who} | no search | | | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    const ms = t.msMean || {};
    L.push(`| (${k}) | ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
  }
}
L.push('', 'J202, the same deals, changed Forge (all / p / a / b): search-v2-rrandom4 (margin 20) 33.3% / 39.5% / 19.8% / 22.1%; search-v2-rrandom4-m40 26.4% / 31.7% / 14.3% / 18.0%; search-v2 on their other side 18.0% / 19.0% / 14.6% / 18.6%.');
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, x]) => `v2.${n} ${x}`), ...Object.entries(g.v3PerRollout || {}).map(([n, x]) => `v3.${n} ${x}`), ...Object.entries(g.v4PerRollout || {}).map(([n, x]) => `v4.${n} ${x}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
L.push('', `(a) ${W.a ?? '-'}: ${W.lost ?? '-'} lost, ${W.won ?? '-'} won, ${W.other ?? '-'} drawn, errored or timed out of ${W.games ?? '-'} batch lines; mean turns ${W.meanTurnsLost ?? '-'} lost, ${W.meanTurnsWon ?? '-'} won; lines whose config A is not the arm's: ${W.aCfgOther ?? '-'}. No life total is on a batch line: the iteration replays a game's seed with full recording for it (D523 point 10).`);
for (const [what, list] of [['the ten longest lost games (turns descending)', W.longest], ['the ten quickest lost games (turns ascending)', W.quickest]]) {
  L.push('', `(a) ${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.*, v3.* and v4.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const g of list || []) L.push(row(g));
}
const x = v.a || {};
const m = M.a;
const n = (y) => typeof y === 'number';
const j = v.j202 || {};
L.push('', `Rule parts. The arm, read by the first row that holds: complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(m.lo) && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(m.elo) && m.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(m.eloHi) && m.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(m.eloLo) && n(m.eloHi) && m.eloLo < 0 && m.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(m.eloLo) && m.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(m.eloHi) && m.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(m.eloHi) && m.eloHi < -15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0} (case 1 ${x.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${x.indistinguishable ?? 0}, no weaker (case 2) ${x.noWeaker ?? 0}, worse, not badly ${x.worseNotBadly ?? 0} (too wide ${x.tooWide ?? 0}, case 3 ${x.upperAtZero ?? 0}), loses badly ${x.losesBadly ?? 0}; candidate ${x.candidate ?? 0}, diagnose ${x.diagnose ?? 0}. The baseline complete ${(v.b || {}).complete ?? 0}. SIGNAL read ${sg.read ?? 0}: diff ${sg.diff ?? '-'}, hw ${sg.hw ?? '-'}, interval [${sg.lo ?? '-'}, ${sg.hi ?? '-'}]; SIGNAL SHOWN ${sg.signalShown ?? 0}, SIGNAL AGAINST ${sg.signalAgainst ?? 0}, NO SIGNAL ${sg.noSignal ?? 0}, SIGNAL INCONCLUSIVE ${sg.signalInconclusive ?? 0}. The night: the track closes ${v.trackCloses ?? 0} (D529 owed ${v.d529 ?? 0}); the closing waits on a confirmation ${v.closingWaits ?? 0}; the track kept open ${v.keepsOpen ?? 0}; a 4,800-game confirmation owed ${v.confirm ?? 0}; iterate as random-v6 ${v.iterate ?? 0}; the principle's cheap path in doubt ${v.principleInDoubt ?? 0}; repost ${v.repost ?? 0} (${v.repostWhich ?? 'none'}). The loop's count (D528 point 7): J202's lines read ${j.read ?? 0} ((a) complete ${(j.a || {}).complete ?? 0}, upper end ${(j.a || {}).eloHi ?? '-'}, loses badly ${(j.a || {}).losesBadly ?? 0}; (b) complete ${(j.b || {}).complete ?? 0}, upper end ${(j.b || {}).eloHi ?? '-'}, loses badly ${(j.b || {}).losesBadly ?? 0}); random-v4 lost badly ${j.v4LosesBadly ?? 0}; this iteration loses badly ${v.iterationLosesBadly ?? 0}; loop stops ${v.loopStops ?? 0}; self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (both 0 on this night by the rule).`);
for (const [label, f, what] of [['J202 (b)', 'var/ai-ladder/match-J202b.json', 'random4 at margin 40: (a) minus it is the margin 40 to 60'], ['J202 (a)', 'var/ai-ladder/match-J202a.json', 'random4 at margin 20: (a) minus it is the margin 20 to 60'], ['J194 (a)', 'var/ai-ladder/match-J194a.json', 'search-v2 against forge-default (outlets off), from search-v2\'s side: forge-default is the negative']]) {
  const p = read(f);
  const diff = label === 'J194 (a)' ? (n(M.b.elo) && n(p.elo) ? `; (b) minus forge-default (the outlet policy's worth) ${r1(M.b.elo + p.elo)}` : '')
    : (n(M.a.elo) && n(p.elo) ? `; (a)'s point minus it: ${r1(M.a.elo - p.elo)} (about +-19 of noise)` : '');
  L.push('', `${label}, ${what}, on the same deals (information only): ${p.a ?? '-'} vs ${p.b ?? '-'}, ${p.played ?? '-'} games, complete ${p.complete ?? '-'}, score ${p.score ?? '-'} [${p.lo ?? '-'}, ${p.hi ?? '-'}], Elo ${p.elo ?? '-'} [${p.eloLo ?? '-'}, ${p.eloHi ?? '-'}]${diff}.`);
}
L.push('', 'Beside them on the same 600 deals, against search-v2 (information only): J199 (a) random-v2 -43.7 [-57.1, -30.4], J199 (b) random-v2 searching seat only -25.5 [-38.3, -12.8], J201 (a) random-v3 -30.8 [-44.4, -17.2], J201 (b) R8 + R9 -29.6 [-43.7, -15.6]; J195 search-v2-routlets +6.9 [-2.7, +16.6].');
fs.writeFileSync('var/j204/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J204EOF
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
check: rob.aRrRollouts == 0
check: rob.bRrRollouts == 0
check: rob.aDecisions == 0
check: wa.aCfgOther == 0
check: v.written == 1
check: v.a.complete == 1
check: v.b.complete == 1
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
check: v.signal.read == 1
check: v.signal.signalShown + v.signal.signalAgainst + v.signal.noSignal + v.signal.signalInconclusive == 1
check: v.signal.diff >= cma.elo - cmb.elo - 0.06 and v.signal.diff <= cma.elo - cmb.elo + 0.06
check: v.signal.signalShown == 0 or (v.signal.diff >= 15 and v.signal.lo > -0.06)
check: v.signal.signalAgainst == 0 or (v.signal.diff <= -15 and v.signal.hi < 0.06)
check: v.signal.noSignal == 0 or (v.signal.diff > -15 and v.signal.diff < 15 and v.signal.lo <= 0.06 and v.signal.hi >= -0.06)
check: v.trackCloses == 1 or not ((v.signal.noSignal == 1 or v.signal.signalAgainst == 1) and v.a.candidate == 0)
check: v.trackCloses == 0 or ((v.signal.noSignal == 1 or v.signal.signalAgainst == 1) and v.a.candidate == 0)
check: v.closingWaits == 1 or not ((v.signal.noSignal == 1 or v.signal.signalAgainst == 1) and v.a.candidate == 1)
check: v.closingWaits == 0 or ((v.signal.noSignal == 1 or v.signal.signalAgainst == 1) and v.a.candidate == 1)
check: v.keepsOpen == v.signal.signalShown + v.signal.signalInconclusive
check: v.d529 == v.trackCloses
check: v.confirm == v.a.candidate
check: v.iterate == 1 or not (v.a.diagnose == 1 and v.trackCloses == 0)
check: v.iterate == 0 or (v.a.diagnose == 1 and v.trackCloses == 0)
check: v.principleInDoubt == v.a.losesBadly
check: v.iterationLosesBadly == v.a.losesBadly
check: v.j202.read == 1
check: v.loopStops == 1 or not (v.iterationLosesBadly == 1 and v.j202.v4LosesBadly == 1)
check: v.loopStops == 0 or (v.iterationLosesBadly == 1 and v.j202.v4LosesBadly == 1)
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0
check: v.signalInconclusiveCount == v.signal.signalInconclusive
check: v.v6Margin == 40 or not (cma.elo < v.j202.b.elo)
check: v.v6Margin == 60 or not (cma.elo >= v.j202.b.elo)

The first six checks say each match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next four say each match played 150 deal blocks and the block reader
found every game. The next six say the arm's rollouts were random ones on the batch lines and search-v2's were not, the
baseline searched nothing and drew no random rollout, and every line's config A was the arm's. The next three say the
verdict script ran and agrees that both matches are complete. Then fourteen for the arm: exactly one of the six
readings; D527's table in the runner's own language, row by row, each both ways; `tooWide` only on a worse, not badly
reading whose interval contains 0 with its lower end at or below -15; and `candidate` and `diagnose` the readings' two
groups. Then six for SIGNAL: it was read, exactly one of its four readings, its `diff` is the two match lines' points'
difference, and each of SHOWN, AGAINST and NO SIGNAL only where its bars hold (the interval's ends are reported to 0.1,
so the checks allow 0.06 at 0; the script decides on the unrounded values). The last fourteen are the night: the track
closes exactly on NO SIGNAL or AGAINST with the arm not a candidate, the closing waits exactly when the arm is one, the
track is kept open exactly on SIGNAL SHOWN or INCONCLUSIVE, D529 is owed exactly when the track closes, a 4,800-game
confirmation is owed exactly when the arm is a candidate, the agent iterates exactly when the arm is to be diagnosed and
the track stays open, the principle's cheap path is in doubt and this iteration loses badly exactly when the arm loses
badly (one random arm, D528 point 7), J202's two lines were read, the loop stops on the two-losing count exactly when
this iteration and random-v4 both lost badly, and the self-play-from-random path never opens and the live seat never
changes on this night. The last three say the SIGNAL INCONCLUSIVE count is this night's reading and random-v6's
margin is the pre-registered one (40 exactly when (a)'s point is below J202 (b)'s, else 60). Whether both matches
start at block 114,900,000 is reported (`bsa.min`, `bsb.min`, report.md), not checked: a memory retry moves a match's
blocks, and that is a run fact, not a fault. Any reading passes them; a reading is not a failure, and a closed track is not a failure
either. The time per decision, the rollouts, the guardrail and outlet-policy counters, the changed answers, the
fallbacks and the worst-lost games are reported, not gated.

## Abort if
abort: j204_err >= 30 and j204_err > j204_games / 10

Engine trouble only: once 30 games of the two matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J204a.json
collect: var/ai-ladder/match-J204b.json
collect: var/j204/verdict.json
collect: var/j204/report.md
collect: var/j204/rollouts-a.json
collect: var/j204/rollouts-b.json
collect: var/j204/worst-a.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J199, J201 and J202:
- **the arm's reading under D527's table** (match (a), read once by the first row that holds): SHOWN, INCONCLUSIVE,
  NOT SHOWN indistinguishable, NOT SHOWN worse not badly, or NOT SHOWN loses badly (and the three unreached cases by
  name if one occurred), with its score against search-v2 and its 95% interval, the same in Elo, and the pair and game
  counts; for a too-wide interval, say that it is "too wide to call" and read as worse, not badly;
- **the baseline**: policy-outlet's score and Elo against search-v2 with its interval, beside J194 (a)'s forge-default
  on the same deals (-87.5 [-103.2, -72.1] from forge-default's side; the difference is the outlet policy's worth,
  about +-21 of noise) and each side's outlet-policy actions;
- **the SIGNAL reading** (D528 point 6) in its words: `diff`, `hw` and the interval, which of the four readings, and
  what it decides (NO SIGNAL worded as "no signal at margin 60 at +-15 on the point", never as equivalence); the share
  of search-v2's own gain over the seat under it that the random values keep (`v.signal.share`), and J202 (b) minus
  the baseline (`v.m40MinusBaseline`, margin 40 against the same seat on the same deals), as information; the SIGNAL
  INCONCLUSIVE count (`v.signalInconclusiveCount`, which random-v6's job re-reads from these match lines);
- **what the night decides, in D528's words:** when `v.trackCloses` is 1, say plainly that the random-rollout track
  closes (D523 point 10's stop), that the owner is told, with the counters, which way it went, that a D529 writes the
  closing from the track's closing draft with this night's numbers, and that the paused `-self` path stops with it;
  when `v.closingWaits` is 1, that the arm's 4,800-game confirmation runs first and the closing waits on it; when
  `v.keepsOpen` is 1, that the track stays open on the margin/LCB line, and, when `v.iterate` is 1, that the agent
  iterates as random-v6 without asking the owner (D528 point 8: `override=lcb` at `v.v6Margin`, pre-registered as 60
  unless (a) minus J202 (b) is below 0, then 40; one change), naming what the counters and the worst-lost games say;
  when `v.closingWaits` is 1, also that a holding confirmation means the track reached its goal and stays open, and a
  failing one closes it as on NO SIGNAL; for a candidate (`v.confirm`), that a 4,800-game
  confirmation is owed before anything. **The loop's count (D528 point 7):** J202's readings as `v.j202` reads them and
  that the count restarted after random-v4; `v.loopStops` only if both lost badly. **The attributions:** (a) against
  J202 (b)'s -20.9 [-34.1, -7.7] (the margin 40 to 60) and J202 (a)'s -39.5 (20 to 60), each about +-19 Elo of noise.
  Then, plainly, whatever the reading, that the live seat is unchanged and any change to it is a separate decision (a
  seat-queue row, D509);
- **the compute each side spent:** ms per decision on both sides of both matches and their ratio, by kind; the arm's
  rollouts and rounds per searched decision against search-v2's (J202 (b): x1.134), play and copy ms a rollout, the
  short decisions, rollout errors and step caps, budget fallbacks with their interval and other fallbacks;
- **the guardrails:** the arm's `search.rr.*` counters per random rollout and per game (report.md's table), beside J202
  (b)'s (the same rollouts: they should be alike, the margin changing only the verdict); which rules carry the load;
- **the changed answers by kind:** each searching side's p/a/b decisions searched and changed in both matches, beside
  J202 (a)'s (33.3%: priority 39.5%, attack 19.8%, block 22.1%), J202 (b)'s (26.4%: 31.7%, 14.3%, 18.0%) and search-v2's
  own (18.0%): whether the margin at 60 cut the overrides again, and by how much at priority;
- **the worst-lost games:** the arm's ten longest and ten quickest lost games (batch file and line, seed, decks, the
  arm's seat, turns, reason, its searched and changed decisions and its `search.rr.*` per random rollout), with the
  mean turns of lost against won games; say that the batch line has no life total;
- **the code:** the pilot's `sd` (no file under `bridge/src`, only `players.json` under the ladder), and any file in
  `sd.tipDiff` or `sd.mainDiff`;
- **the run:** draws, errors and timeouts, whether both matches started at block 114,900,000 (`bsa.min`, `bsb.min`), each match's hours against its estimate ((a) 2.3-2.8 h, (b) 1.2-1.5 h), the
  deal blocks (expected 114,900,000-114,900,149 in both), the pressure events in STATUS (drops, raises, any stop and
  its retry, and which match they fell in), that it ran alone (D521), and whether the GPU queue or anything else
  outside the lab was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it; "NO SIGNAL" is the pre-registered reading for a difference within +-15 whose interval contains 0, not
a proof of none. If (a) or (b) stopped early (`complete: false`), say so, naming which (`v.repostWhich`): that match gets no reading, SIGNAL has none,
and what follows is a decision about reposting it, not a reading.

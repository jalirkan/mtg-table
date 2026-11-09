id: J201
title: Random rollouts, iteration 2 (random-v3): two fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule), each against search-v1-anytime (search-v2), a chain of single additions on both rollout seats: (a) search-v2-rrandom3, D523's random-v2 plus R8, the good block (rollout=random3; J199 (a) plus one rule), and (b) search-v2-rrandom3-held, R8 plus R9, the held instant (rollout=random3-held; (a) plus one rule), each read once under D525's pre-registered table, D523's copied with the arms renamed (SHOWN, INCONCLUSIVE or NOT SHOWN indistinguishable: a 4,800-game confirmation before Forge leaves the loop; NOT SHOWN worse or losing badly: the diagnosis and the iteration loop's random-v4), alone on the machine
public_title: Random rollouts in the search, second try: two fixed matches
public_est: ~5-6 h (one night)
public_decides: Whether random play that blocks well can replace the AI inside the search
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@ec9b77fb (the merge commit of D525's lane, pc/rollout-random-v3, on main, pushed to origin/main before posting; the lane's tip was 7351f3e5. It carries: random-v3, one rule at a time (`RolloutGuards.goodBlocks` R8 under `Config.randomV3Block()` for rollout=random3, R8 and `holdInstants` R9 under `Config.randomV3BlockHeld()` for rollout=random3-held, `RolloutController.Random` taking its config through `SearchPolicy.Limits`), `rollout=random3` and `rollout=random3-held` in `SearchConfig`, the `search.rr.v3.*` counters (through D523's `SearchPolicy.countRandomSeats`), the ladder players search-v2-rrandom3 and search-v2-rrandom3-held, `DecisionSelfTest.rolloutRandomV3` and the registry test; the lane's tip when this draft was written was ec9b77fb, off main 2ffb65fe. Pinned so every game of both matches is one code version, D341; the pilot checks the pin is that merge (two parents) and that what it brought under bridge/src/mtgtable/ai is exactly D525's seven files)
decides: for each arm on its own match, exactly one of D525's five readings (point 6's table, D523's point 9 copied with the arms renamed) and what it decides. SHOWN: Forge leaves the rollout loop for that arm only after a 4,800-game confirmation under D519's readings holds it. INCONCLUSIVE: nothing yet, a 4,800-game confirmation under D519's readings first. NOT SHOWN, indistinguishable (the interval contains 0 and its lower end is above -15 Elo, the non-inferiority bound): a candidate to replace Forge in the loop, confirmed at 4,800 games under the same three conditions before it does. NOT SHOWN, worse, not badly, and NOT SHOWN, loses badly: the agent diagnoses the arm from its `search.rr.*` counters and its worst-lost games and iterates under D523's point 10 without asking the owner (new or fixed guardrails in a new decision amending D525, a new arm random-v4 with its own name and hash, a pilot and the same 1,200-game match); after losing badly the principle's cheap path, Forge out of the loop at no cost, is in doubt until a v4 recovers it. Each arm adds exactly one rule to the arm before it, so each is attributed to that rule: (a), search-v2-rrandom3, is J199 (a) plus R8 and answers whether the good block fixes the defender (against J199 (a), -43.7); (b), search-v2-rrandom3-held, is (a) plus R9 and answers what the held instant adds on top ((b) - (a) on the same night and deals is R9). The rule's readings are each arm against search-v2; these comparisons are read beside them, J199's lines printed in the report. The -self path pauses at J199 (b)'s -25.5 (neither rule acts there). This is the loop's second night (random-v2, J199, was the first). Its other stop cannot be reached on it: D525 point 7 reads an iteration as losing badly when every arm it registered does, and J199 did not (its (b) read worse, not badly), so when both of this night's arms lose badly (v.iterationLosesBadly) random-v3 is the first iteration that loses badly and the next one stops the loop if it does too; v.loopStops is 0. The self-play-from-random path waits for a reading confirmed at 4,800 games. Any change to the live seat is a separate decision (a seat-queue row, D509), never this job's
hypothesis: none registered on the score. What is known: J199's match (a), search-v2-rrandom (random-v2 on both rollout seats), lost badly at 1,200 games: 0.4375 [0.4186, 0.4564], Elo -43.7 [-57.1, -30.4], 0 errors (NOT SHOWN, loses badly). Its match (b), search-v2-rrandom-self (the searching seat alone, Forge the opponent), read 0.4633 [0.4451, 0.4816], Elo -25.5 [-38.3, -12.8], 0 errors (NOT SHOWN, worse, not badly): 18 Elo better than (a), the defender fact, since the opponent's rollout seat is the only difference; the searching seat's own random play costs the rest. Both arms searched more than search-v2 (x1.15 and x1.08 its rollouts a decision, 7.1 and 6.6 rounds against 6.0) at equal ms: a bias of the value, not a budget. Their counters per random rollout, (a) / (b): R7 2.38 / 1.92, R3 0.57 / 0.31, R4 0.23 / 0.20, R5 0.050 / 0.058, R6 0.055 / 0, R2 0.016 / 0, R1 0.012 / 0.011; random-seat failures 86 / 2. J199's final lines are on this host as var/ai-ladder/match-J199a.json and -J199b.json, and the report prints them beside this night's. The diagnosis read (a)'s batch lines at 976 games (D525's Context): its counters were within x0.41-x2.2 of D523's pilot per rollout and its search was not starved (x1.15 search-v2's rollouts a decision, 3 budget fallbacks against 38); the loss sat in the overrides: x2.06, x1.47 and x1.32 search-v2's at priority, attack and block decisions, extra attackers over Forge's "attack none" x1.55 as often, games holding one won 0.72 of the arm's base against search-v2's 0.86, paired excess +0.72 in deal-sides the arm lost against -0.18 in those it won. The diagnosis: random-v2 as the rollout's defender draws each blocker's block uniformly, so it takes the block that kills the attacker and survives only about 1/(k+1) of the time and attacks look safe; R8 makes that block; R9 holds the random seat's harmful instants to combat after blockers and the end step (the weaker signal: passes over Forge's main-2 play x2.32). (a) carries R8 on both seats, against J199 (a); (b) carries R8 and R9, against (a) on the same night; the difference of two 1,200-game matches carries both their noise, about +-18.5 Elo (J199's own 95% intervals were +-13.35 and +-12.75; the shared deals may lower it, but nothing measured that), so only a large R9 effect reads clearly. D525's pilot (4 games each, D523's recipe, at nice 10 after J199 ended, J200's pilot beside it, on the R8 / R8+R9 code after the skeptic's fixes): both matches 2-2, 0 engine errors, 0 step timeouts, 0 budget fallbacks, 0 random-seat failures; search-v2-rrandom3 at 886 against 852 ms a decision and 17.14 against 13.88 rollouts (x1.24), search-v2-rrandom3-held at 868 against 846 ms and 16.75 against 13.94 (x1.20); R8 (v3.goodBlock) took 0.011 and 0.016 good blocks a random rollout, R9 (v3.heldInstant) held 0.36 in rrandom3-held and is absent from rrandom3; no R8 result was refused as illegal (v3.goodBlockIllegal 0), and R2 rejected an R8 result (v3.goodBlockDead, per attempt) 0.086 and 0.19 times a rollout, x8-x12 the good blocks taken: most of R8's chances came under lethal attacks, where R2's arithmetic overrules it and the draw as it was stands; R7 2.13 and 1.88, R3 1.10 and 1.05, R4 0.21 and 0.22, R6 0.031 and 0.060, R2 0.018 and 0.045, R5 0.036 and 0.043, R1 0 and 0.017. Nothing says which way these matches go; an R8 that removed J199 (a)'s whole loss would read (a) near 0. The width: J195's two knob matches against search-v2 on these same 600 deals came out +-9.65 and +-9.25 Elo at 1,200 games. Under about +-9.5 (an SE near 4.85 Elo), as approximations, the readings fall on the point: SHOWN at +15 or more; INCONCLUSIVE from about +5.5 to +15; NOT SHOWN, indistinguishable from about -5.5 to +5.5 (both the +15 upper bound and the -15 non-inferiority bound bind); NOT SHOWN, worse, not badly from about -24.5 to -5.5 (the too-wide case included); loses badly below about -24.5. So a true 0 reads indistinguishable about 74% of the time and is sent to a 4,800-game confirmation (SHOWN, INCONCLUSIVE or indistinguishable) about 87%; a true -5 indistinguishable about 53%, confirmed-bound about 54%; a true -10 confirmed-bound about 18%; a true -15 about 2.5%; a true +5 indistinguishable about 53%; a true +25 SHOWN about 98%, a true +15 about 50%; losing badly needs a point under about -24.5 (a true -20 about 18%, -25 about 54%, -30 about 87%; J199 (a)'s -45 would lose badly almost surely). Information, not a prediction any check reads
rule: written 2026-11-09 before any rated game of either arm, word for word as D525 states it (its point 6, D523's point 9 copied with the arms renamed; D525's bold dropped, its table given row by row as reading | when | what it decides): "Each arm, `search-v2-rrandom3` and `search-v2-rrandom3-held`, plays a fixed D398 match of 1,200 games on the confirm set against `search-v1-anytime`, `alone: yes` (D521: the budget is wall-clock, so contention changes the rollouts). Reported with each: the score and Elo with the 95% interval, ms and rollouts a decision against search-v2's in the same match, and each guardrail's fires per rollout, `search.rr.<rule>` over `search.rr.rollouts` — every rollout that seated a random seat, those the deadline cut included — summed over the match's games. The readings and what each decides (every arm is read once, by the first row that holds): SHOWN | lower end above 0.5 and point at least +15 Elo | Forge leaves the rollout loop for this arm, after a 4,800-game confirmation under D519's readings holds it; INCONCLUSIVE | upper end at least +15 and lower end at most 0.5 | nothing yet: confirm at 4,800 games under D519's readings before anything; NOT SHOWN, indistinguishable | upper end below +15, the interval contains 0, and its lower end is above −15 Elo (a non-inferiority bound) | the arm is a candidate to replace Forge in the loop, confirmed at 4,800 games (the same three conditions) before it does; NOT SHOWN, worse, not badly | upper end below 0 and at least −15 Elo | diagnose from the counters and the worst-lost games (D523 point 10) and iterate as random-v4; NOT SHOWN, loses badly | upper end below −15 Elo | the same diagnosis and iteration; and the principle's cheap path — Forge out of the loop at no cost — is in doubt until a v4 recovers it. A NOT SHOWN whose interval contains 0 but whose lower end is at or below −15 is too wide to call: it is read as "worse, not badly" for the iteration and says so. A confirmed SHOWN or indistinguishable arm also opens the self-play-from-random path (search over random rollouts generating the games and values a later policy learns from, D522's step 2 with this rollout instead of Forge's). If both arms are confirmed, the one with the higher point is taken, `random3` at a tie (no Forge in the loop at all). Any change to the live seat is a separate decision (a seat-queue row, D509)." Three cases the table's rows do not reach, read here before any game, settled in D525's point 6 (its *Three cases the rows do not reach* paragraph, D523's copied), in substance, as D525 point 6 settles them: (1) a lower end above 0.5 with a point under +15 and an upper end at least +15 (for example +12 [+2.5, +21.5]) is INCONCLUSIVE, as D517's shape, which D523 and D525 take, reads it ("otherwise INCONCLUSIVE"; inconclusiveAbove 1); (2) a NOT SHOWN interval wholly at or above 0 (eloLo >= 0 and eloHi < 15; it needs a half-width under 7.5 Elo, not expected at 1,200 games) is NOT SHOWN, no weaker, read with the indistinguishable row: a candidate, confirmed at 4,800 games (noWeaker 1); (3) a NOT SHOWN upper end of exactly 0 (the interval does not contain 0, and the upper end is not below 0) is worse, not badly (upperAtZero 1). Two fixed matches (D398, no stopping rule), each 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 30 deck pairs never tuned on), in this order: (a) search-v2-rrandom3 vs search-v1-anytime, var/ai-ladder/match-J201a.json; (b) search-v2-rrandom3-held vs search-v1-anytime, var/ai-ladder/match-J201b.json. Both matchups are new on this host, so each takes the host's match blocks 114,900,000-114,900,149: the same 600 deals for both, and the same deals as J194's three matches, J195's four and J199's two. In the quoted rule an arm's "lower end" in the SHOWN and INCONCLUSIVE rows is its match line's 95% lower end on its score (lo), its "point" its Elo point estimate (elo), its "upper end" its Elo upper end (eloHi), and its "interval" and the "lower end" of the non-inferiority bound its Elo interval (eloLo, eloHi) and eloLo, the arm being the match's first player. A match is COMPLETE when its line names the two players in that order at their config hashes (8d1623965986 for (a) and a484402b1185 for (b), against cdd55e02a89c), says complete: true, all 1,200 games were played, engine errors plus timeouts are at most 60 (one in 20) and lo, elo, eloLo and eloHi are numbers. Each arm is read on its own match alone, only when complete, by the first row that holds, exactly one reading: SHOWN when lo > 0.5 and elo >= 15; INCONCLUSIVE when not SHOWN and eloHi >= 15 (cases with lo > 0.5 included, case 1); NOT SHOWN, indistinguishable when eloHi < 15, eloLo < 0 < eloHi and eloLo > -15; NOT SHOWN, no weaker when eloHi < 15 and eloLo >= 0 (case 2); NOT SHOWN, loses badly when eloHi < -15; NOT SHOWN, worse, not badly otherwise (eloHi from -15 to below 0, the too-wide case eloLo <= -15 with the interval containing 0 (tooWide 1), and case 3). A candidate (candidate 1) is SHOWN, INCONCLUSIVE, indistinguishable or no weaker: a 4,800-game confirmation of that arm follows. An arm to diagnose (diagnose 1) is worse, not badly or loses badly: the iteration of D523's point 10 follows (iterate 1 when either arm is one). principleInDoubt is 1 when an arm loses badly; iterationLosesBadly is 1 when both arms lose badly (this iteration loses badly, D525 point 7). loopStops, selfPlayOpens and liveSeatChanged are 0 in every reading of this night: J199 was not an iteration that lost badly (D525 point 7), so two successive ones cannot end here, and the other stop and the self-play path need a reading confirmed at 4,800 games. An incomplete match gives its arm no reading, and it is reposted. Reported beside, deciding nothing: each side's ms per decision (p + a + b, and by kind) and their ratio, rollouts and rounds per searched decision and their ratio, play and copy ms a rollout, the decisions decided on fewer than two rounds, rollout errors and step caps, every `search.rr.*` counter per random rollout and per game (R8's `v3.goodBlock` and R9's `v3.heldInstant` among them), searched and changed decisions by kind, budget fallbacks with their interval and other fallbacks, the deal blocks played, R8's diagnostics `v3.goodBlockIllegal` (an R8 result refused as illegal) and `v3.goodBlockDead` (an R8 result R2 rejected), each arm's ten longest and ten quickest lost games with their counters, and J199's two match lines on the same deals. An interval that includes 0.5 is never "no effect" and never "no cost"
followup: morning-read
est: ~4.5-5.5 h at 7 workers (an estimate; range 4-7 h), 8 h at worst (the two matches' own stops). From J199 on this host at 7 workers, alone, on these same 600 deals: its (a), search-v2-rrandom against search-v2 at 931 against 915 ms a decision, ran at about 560 games an hour (1,000 games in 1 h 58 min with the pilot), so a 1,200-game match takes about 2-2.5 h; random-v3 adds two predicates to random-v2 and no engine call beyond R8's pair predicate at each random block, so each match is guessed at ~2-2.5 h, ~4.5-5 h for both, ~6 h on a night as pressured as J197's. Each match stops itself at --hours 4 (about 1.7x its estimate): 8 h in all, which with the pilot is under the 9 h timeout, so a slow (a) cannot let the timeout cut (b); a match that reaches its stop reports complete: false and gives its arm no verdict. Both run under the ladder's default 300 s per-game timeout (neither arm lifts maxRounds). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games of each arm on one worker; D525's pilot played each arm's 4 games in 2 min 38 s (rrandom3) and 2 min 45 s (rrandom3-held))
resumable: no
timeout: 9h
clean: var/j201 var/ai-ladder-pilot/J201 var/ai-ladder/match-J201a.json var/ai-ladder/match-J201b.json
progress: metric j201_games games of 2400
metrics: j201_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom3","search-v1-anytime"],["search-v2-rrandom3-held","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j201_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-rrandom3","search-v1-anytime"],["search-v2-rrandom3-held","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J201a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J201b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: roa = sh: cat var/j201/rollouts-a.json 2>/dev/null || echo '{"games":0}'
metrics: rob = sh: cat var/j201/rollouts-b.json 2>/dev/null || echo '{"games":0}'
metrics: bsa = sh: cat var/j201/seeds-a.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: bsb = sh: cat var/j201/seeds-b.json 2>/dev/null || echo '{"games":0,"blocks":0}'
metrics: wa = sh: cat var/j201/worst-a.json 2>/dev/null || echo '{"games":0,"lost":0}'
metrics: wb = sh: cat var/j201/worst-b.json 2>/dev/null || echo '{"games":0,"lost":0}'
metrics: v = sh: cat var/j201/verdict.json 2>/dev/null || echo '{"written":0,"confirm":0,"iterate":0,"principleInDoubt":0,"iterationLosesBadly":0,"repost":0,"loopStops":0,"selfPlayOpens":0,"liveSeatChanged":0,"a":{"complete":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0},"b":{"complete":0,"shown":0,"inconclusive":0,"indistinguishable":0,"noWeaker":0,"worseNotBadly":0,"losesBadly":0,"notShown":0,"tooWide":0,"candidate":0,"diagnose":0}}'
headline: cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.eloLo, cma.eloHi, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, roa.aRolloutsPerDecision, roa.bRolloutsPerDecision, roa.ratio, roa.aPerRollout.v2_lethalAttack, roa.aPerRollout.v2_lethalBlock, roa.aPerRollout.v2_targetSide, roa.aPerRollout.v2_castSomething, roa.aPerRollout.v2_dominatedAttacker, roa.aPerRollout.v2_chumpBlock, roa.aPerRollout.v2_ownStack, roa.aPerRollout.v3_goodBlock, roa.aPerRollout.v3_goodBlockIllegal, roa.aPerRollout.v3_goodBlockDead, roa.aPerRollout.v3_heldInstant, roa.aRrFailures, v.a.shown, v.a.inconclusive, v.a.indistinguishable, v.a.worseNotBadly, v.a.losesBadly, v.a.candidate, cmb.played, cmb.score, cmb.lo, cmb.hi, cmb.elo, cmb.eloLo, cmb.eloHi, cmb.aSearch.msPerDecision, cmb.bSearch.msPerDecision, rob.aRolloutsPerDecision, rob.bRolloutsPerDecision, rob.ratio, rob.aPerRollout.v2_lethalAttack, rob.aPerRollout.v2_lethalBlock, rob.aPerRollout.v2_targetSide, rob.aPerRollout.v2_castSomething, rob.aPerRollout.v2_dominatedAttacker, rob.aPerRollout.v2_chumpBlock, rob.aPerRollout.v2_ownStack, rob.aPerRollout.v3_goodBlock, rob.aPerRollout.v3_goodBlockIllegal, rob.aPerRollout.v3_goodBlockDead, rob.aPerRollout.v3_heldInstant, rob.aRrFailures, v.b.shown, v.b.inconclusive, v.b.indistinguishable, v.b.worseNotBadly, v.b.losesBadly, v.b.candidate, v.confirm, v.iterate, v.principleInDoubt, v.iterationLosesBadly, v.iterationLosesBadly, v.iterationLosesBadly, v.iterationLosesBadly, wa.lost, wb.lost

**Why this job** (D525, the first turn of D523's iteration loop; the owner's principle, in his words as D523 quotes
them): "Yes, there are terribly useless situations that will arise from randomized moves, but you are the agent in the
loop who can recognize that, iterate to avoid it, so we waste less time on useless data." D523 took Forge's judgment
out of the search's rollouts and put guarded randomness in, random-v2: the move atlas's random seat (D451, its
guardrails G1-G6 and D485-D488) asking Forge's AI for no answer, plus seven guardrails R1-R7 read from 3,900 of J193's
random branch logs. J199 measured it: its match (a), `search-v2-rrandom`, lost badly (-43.7 Elo [-57.1, -30.4], 0
errors), and its match (b), `search-v2-rrandom-self`, read worse, not badly (-25.5 [-38.3, -12.8]): 18 Elo better, the
defender fact, since the opponent's rollout seat is the arms' one difference. The diagnosis (D525's Context) found no
guardrail misfiring and no starved search; it found the search overriding Forge's "attack none" with extra attackers
x1.55 as often as search-v2 does, and losing those games, because random-v2 as the rollout's defender draws each
blocker's block uniformly among no block and each attacker it can block, and so rarely takes the block that kills the
attacker and survives. D525 adds two rules, one at a time, both rollout seats random: R8, that block is taken, and R9,
the random seat's harmful instants wait for combat after blockers or the end step. This night is a chain of single
additions on the same 600 deals as J199: (a) `search-v2-rrandom3` is J199 (a) plus R8 and answers whether the good
block fixes the defender (against -43.7); (b) `search-v2-rrandom3-held` is (a) plus R9 and answers what the held
instant adds on top (against (a)'s own result on the same night and deals: (b) - (a) is R9). The `-self` path pauses
at J199 (b)'s -25.5: under `random-self` only the searching seat is random and a rollout ends with the turn, so neither
rule acts there (a `-self` R9 seat fired 8 times in 1,517 rollouts in D525's lane). D525 is
`docs/decisions/D525-random-v3-good-block.md` at the pin; its point 3 says what each arm attributes, point 6 is the rule
and point 7 how the loop counts this night. D523 (`docs/decisions/D523-random-rollouts.md`) is the seam, random-v2,
its counters and point 10, the iteration loop.

**What is built** (D525, the merge of pc/rollout-random-v3). Two ladder players in `tools/ai-ladder/players.json`, kind
`search`, every param search-v1-anytime's (`profile: Default`, `outlets: on`, `budgetMs: 1500`, `anytime: on`) plus
`rollout`:
- `search-v2-rrandom3` (`rollout: random3`: both seats inside each rollout are random-v2 plus R8, the good block),
  config hash `8d1623965986`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=random3`;
- `search-v2-rrandom3-held` (`rollout: random3-held`: both seats random-v2 plus R8 and R9, the held instant), config
  hash `a484402b1185`: the same with `…,anytime=1,rollout=random3-held`;
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The hashes are D525's, computed by `registry.ts` on the lane; the pilot records the real ones
(`var/j201-tools/players.json`) and checks the config strings, not the hashes. D523's arms (`search-v2-rrandom`
`fb8ae32c014d`, `search-v2-rrandom-self` `d3aa28be73b2`) are unchanged and still seat random-v2; no `-self` random-v3
arm is registered. In both new arms the candidate is still forced first (`RolloutController.Forced`, D470's combat
rules included), then the random seats play; their draws are seeded from the rollout's seed
(`ExploreMath.seedFor(seed, -523, seat)`), so every candidate of a round meets the same random opponent and the same
random self (common random numbers, as the redeal and the engine stream already are). Mana payment, costs, triggers'
targets and effects' choices stay Forge's, as for every random seat. The leaf, the horizon, the budget, the race and
every other knob are search-v2's.

**The guardrails and their counters** (D523 point 3 and D525 points 1-3, `RolloutGuards`; R1-R8 on both arms, R9 on
(b) alone; R1-R7 and R9 remove an answer, R8 replaces a drawn block with one Forge's combat arithmetic says kills the
attacker and survives, and a change that would leave a declaration illegal is not made):

| rule | what it does | counter on the batch line |
|---|---|---|
| R1 lethal attack | attacks with everything when the damage through no possible blocker is at least the defender's life | `search.rr.v2.lethalAttack` |
| R2 lethal block | blocks after which the seat's life would not stay above 0 by Forge's arithmetic (`lifeThatWouldRemain`, trample through a blocker included) are redrawn up to 64 times, else the most damage blocked, which need not save it | `search.rr.v2.lethalBlock` |
| R3 target side | a harmful part at its own side, a helpful part at the opponent's, while a target on the right side is legal, is removed | `search.rr.v2.targetSide` (per target list narrowed; it counts listings, not picks, D523's residual) |
| R4 cast something | no pass in its own main 2 with an empty stack, nothing cast this turn and a non-instant spell listed (an instant may wait) | `search.rr.v2.castSomething` |
| R5 no losing attack | judged on the attack as a set: when it is not lethal and does not outnumber the defender's untapped potential blockers, each attacker one of them can block, destroy and survive is taken out (a go-wide attack stands) | `search.rr.v2.dominatedAttacker` |
| R6 no chump | judged on the block assignment as a whole, unless the attack is lethal: a blocker that dies while the blockers on its attacker do not kill it is taken out (a gang block that kills stands) | `search.rr.v2.chumpBlock` |
| R7 own stack | it passes on a stack that holds only its own items | `search.rr.v2.ownStack` |
| **R8 good block** (D525; both arms) | in every random block, the forced candidate attack's included: an attacker one of the seat's blockers can block, destroy and survive (R5's pair predicate) gets that blocker, alone, largest attacker first, several candidates drawn from the seeded stream; then R2 and R6 judge the result | `search.rr.v3.goodBlock` (per attacker given a good block) |
| **R9 held instant** (D525; (b) only) | on the opponent's turn a harmful play (R3's harm on any part) is removed unless the stack is empty and combat is past its blockers, or it is the end step: never in answer to a cast; never the last option | `search.rr.v3.heldInstant` (per priority narrowed) |

Beside them, D451's guardrail names under the same prefix (`search.rr.land`, `.zeroXLeftOut`, `.refusedCast`,
`.cardTargetOffered`, and the rest), `search.rr.rollouts` (one per rollout that seated a random seat) and
`search.rr.failures`, all summed over the rollout's two random seats into the searching seat's counts after each
rollout (`SearchPolicy.countRandomSeats`), which each batch line carries in `aStats.counts`.
`search.rr.v3.heldInstant` is absent on (a)'s lines. The ranking's playouts (`search.prior.rr.*`) do not occur here:
neither arm ranks.

**Rollouts and the guardrails are not on the match line.** The match line's `aSearch`/`bSearch` carry
`msPerDecision`, `searched`, `byKind`, `msMean` and the fallbacks, but no rollout count and no `search.rr.*`
(`tallyLine` in `tools/ai-ladder/match.ts`). `var/j201-tools/rollouts.cjs` is J199's reader (J198's, J197's, itself
J195's) with the `v3.` fires summed beside the `v2.` ones (`aV3Fires`); it reads a match's batch folder
(`<ladder dir>/batches/<run>/b*.jsonl`, the run from the match line's `id`) and writes, per side, rollouts and rounds
per searched decision, play and copy time a rollout, rollout errors and step caps, each `search.rr.<name>` per random
rollout (`aPerRollout.<name>`, dots as `_`, over `search.rr.rollouts`, as the rule words it) and per game
(`aPerGame.<name>`, over the batch lines read). `search.rr.rollouts` runs a little above `search.rollouts`: it counts
the rollouts the deadline cut, which `search.rollouts` does not.

**The worst-lost games** (D523 point 10: "the arm's lost games with the longest turn count and the lowest arm life at
the end"). A batch line carries `seed`, `pair`, `game`, `aSeat`, `aDeck`, `bDeck`, `winner` (`A` is the arm, config A
of every match batch, as `cmdMatch` tallies it), `reason`, `turns`, `ms`, `cpuMs`, `timeout`, `error` and both seats'
counters, and **no life total**, so the night ranks the arm's lost games (winner `B`, no error, no timeout) by `turns`:
the ten longest (turns descending, then `ms`), the life half of D523's sentence and the frame log being the
iteration's (the `seed` replayed with full recording, D523 point 10; not this job), and, beside them, the ten quickest
(turns ascending, then `ms`), the blowouts. For each game `var/j201-tools/worst.cjs` writes the batch file and line,
the `seed`, the decks, the arm's seat, `turns`, `reason`, `ms`, and the arm's own counters in that game: decisions
searched and changed, random rollouts, every `search.rr.v2.*` and `search.rr.v3.*` fire per random rollout,
`search.rr.failures` and rollout errors. It also checks every line's config A is the arm's (`aCfgOther`, expected 0)
and gives the mean turns of lost and won games.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host, in this order:
1. **(a) the good block**, `search-v2-rrandom3` vs `search-v1-anytime`, `--out var/ai-ladder/match-J201a.json`.
2. **(b) the good block and the held instant**, `search-v2-rrandom3-held` vs `search-v1-anytime`, `--out var/ai-ladder/match-J201b.json`.

**Deal blocks.** A match's batches take the host's match base (`hostBase(host)` + 900,000 = 114,900,000 on this
host, `cmdMatch` in `tools/ai-ladder/cli.ts`) and then, one batch at a time, the matchup's next unused block
(`nextBseed`, `tools/ai-ladder/schedule.ts`, D398 point 2), counting every block the unordered matchup has used in
the results log and the batches running. Both matchups are new on this host (the arms are D525's, registered after
J199 was posted, so no results line names either), so each takes **114,900,000-114,900,149**, as every new matchup
against search-v1-anytime has (J194's three, J195's four, J199's two): (a) and (b) play the same 600 deals, which are
also J199's deals, so random-v3 reads beside random-v2 on identical deals (J201 (a) beside J199 (a), and J201 (b)
beside J201 (a)). Each batch plays two
consecutive deck pairs from a start fixed by the block number (`batchPairs`), and 150 consecutive blocks give each of
the confirm set's 30 deck pairs 10 batches, 40 games, in both seat orders. The pilot plays in its own folder under its
own host name, and leaves the real blocks untouched. A match retried after a memory stop takes the next unused blocks
for the games it plays again (114,900,150 onward), so its deals then differ in part; the stopped attempt's games stay
in the log under their own purpose and are not counted. `var/j201-tools/seeds.cjs` reads the blocks each match
actually played; the checks require 150 blocks and every game, and the report gives the lowest and highest (expected
114,900,000 and 114,900,149).

**Why one night and no tuning.** Each arm adds one rule to the arm before it (J199 (a), then J201 (a)), and that
addition is the hypothesis; the deals and decks are the held-out confirm set. Nothing is selected, so each score is
read as it is. What follows the night is D523's loop, which D525 continues: a 4,800-game confirmation for a candidate
(SHOWN, INCONCLUSIVE or NOT SHOWN indistinguishable), posted as its own job, and for an arm that is worse or loses
badly, the iteration rule, quoted here word for word (D523 point 10, bold dropped): "After J199, the agent reads the
counters and the worst-lost games — the arm's lost games with the longest turn count and the lowest arm life at the
end, the batch line's `seed` replayed with `--record full` into a frame log (the searched decisions' reports say which
candidate each rollout preferred) — names the useless lines random-v2 still plays, adds or fixes guardrails (each a
rule with the failure it prevents, the evidence and a counter, as above, in a new decision that amends this one),
registers the result as a new arm (`random-v3`, a new name and hash; the arms above stay what they measured), pilots
it and re-runs the same 1,200-game match without asking the owner, who gets each night's results. The loop stops only
on a SHOWN or indistinguishable reading confirmed at 4,800 games, or on two successive v-iterations that lose badly;
then the owner is told, with the counters, which way it went." After this night the same rule reads random-v3 for
random-v2 and random-v4 for random-v3. J201 is the loop's second night, and D525 point 7 reads an iteration as losing
badly when every arm it registered does: J199 did not (its (b) read worse, not badly), so neither stop can be reached
on J201 (`v.loopStops` is 0 in every reading); when both of its arms lose badly (`v.iterationLosesBadly`), random-v3
is the first iteration that loses badly, and the next one stops the loop if it does too. `v.iterate` says only that
an arm's reading sends the loop on, and `v.confirm` that a 4,800-game confirmation is owed. Neither arm ever touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5; D523 and D525 name it in their rule): a ladder match plays to
wall-clock budgets, so contention changes the rollouts each side affords, and this night compares two rollout players
whose cost a rollout differs from search-v2's; it is admitted only onto an empty machine and nothing, heavy or light,
is admitted beside it; while it is next and waits, nothing newer starts. `cores: 7` keeps the width J195's and J199's
walls were measured at. No `after:`; it starts once the jobs before it have ended. It may run beside the art session's
GPU painting queue, which is outside the lab and CPU-light but not memory-free (J197 logged 30 memory-pressure events,
J195 24). The runner's memory rule handles that without the job: a drop takes one worker away as that worker's game
ends and a raise gives it back; it changes no deal and no side's budget, and the deals are mirrored, so the load falls
on both sides alike. A memory stop is retried first; its retry starts the match that was running again from its first
game on new blocks, under a fresh `--hours 4`.

## Pilot
About 15 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the three players, and each arm's seat config is search-v1-anytime's (itself checked
  against search-v2's string) with exactly `,rollout=random3` or `,rollout=random3-held` appended; the hashes are
  recorded, not checked;
- the pin is the merge of D525's lane (two parents), and what it brought under `bridge/src/mtgtable/ai` (its first
  parent to it) is exactly D525's seven files; reported beside: the files under `bridge/src`, `tools/ai-ladder` and
  `tools/ai-bench` that differ from the lane's tip ec9b77fb when this was drafted, and what main carried under them
  between D525's base 2ffb65fe and the merge's first parent;
- the verdict script, the rollout reader, the worst-games reader and the block reader written and tested on synthetic
  files;
- 4 games of each arm against `search-v1-anytime`, one worker, in the pilot's own folder (the same deal for both):
  both sides search, the reader agrees with each match line, the arm's random rollouts are counted, its guardrails
  fire, and search-v2's side carries no `search.rr.*` at all.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j201-merged.txt || echo 0 > var/j201-merged.txt
cat var/j201-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the three players resolve, and each arm is search-v2 with only its rollout appended (D525 point 5); the pin is D525's merge
mkdir -p var/j201-tools
./tools/ai-ladder.sh list > var/j201-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-rrandom3|search-v2-rrandom3-held) ' var/j201-tools/players.txt
node - <<'J201EOF'
// J201's pilot: the three players resolve, and each arm is search-v1-anytime (search-v2) with `,rollout=random3` or
// `,rollout=random3-held` appended and nothing else. Config strings are checked; hashes are recorded.
const fs = require('fs');
const L = fs.readFileSync('var/j201-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), rr = get('search-v2-rrandom3'), rs = get('search-v2-rrandom3-held');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const base = v1 && v1.kind === 'search' && v1.cfg === V1CFG;
const is = (p, suffix) => (base && p && p.kind === 'search' && p.cfg === V1CFG + suffix && p.cfg === v1.cfg + suffix ? 1 : 0);
const r = {
  present: [v1, rr, rs].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: base ? 1 : 0,
  rrandom3_only_rollout: is(rr, ',rollout=random3'),
  rrandom3_held_only_rollout: is(rs, ',rollout=random3-held'),
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-rrandom3': rr?.hash ?? null, 'search-v2-rrandom3-held': rs?.hash ?? null },
  hashesAsD525: v1?.hash === 'cdd55e02a89c' && rr?.hash === '8d1623965986' && rs?.hash === 'a484402b1185' ? 1 : 0,
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-rrandom3': rr?.cfg ?? null, 'search-v2-rrandom3-held': rs?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.rrandom3_only_rollout && r.rrandom3_held_only_rollout ? 1 : 0;
fs.writeFileSync('var/j201-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J201EOF
# the pin is a merge, and what it brought under bridge/src/mtgtable/ai (first parent to it) is D525's seven files
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > var/j201-tools/parents.txt
git diff --name-only HEAD^1 HEAD -- bridge/src/mtgtable/ai > var/j201-tools/merge-diff.txt 2>/dev/null || true
# reported, not checked: against the lane's tip when drafted, and what main carried since D525's base
git diff --name-only ec9b77fb801471219222fe3f7612fc609e497aed HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j201-tools/tip-diff.txt 2>/dev/null || echo '(the lane tip ec9b77fb is not in this checkout)' > var/j201-tools/tip-diff.txt
git diff --name-only ec9b77fb801471219222fe3f7612fc609e497aed HEAD^1 -- bridge/src tools/ai-ladder tools/ai-bench > var/j201-tools/main-diff.txt 2>/dev/null || true
node - <<'J201EOF'
const fs = require('fs');
const lines = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
const D525 = ['DecisionSelfTest.java', 'ExploreMath.java', 'Explorer.java', 'RolloutController.java', 'RolloutGuards.java', 'SearchConfig.java', 'SearchPolicy.java'].map((x) => 'bridge/src/mtgtable/ai/' + x);
const files = lines('var/j201-tools/merge-diff.txt');
const parents = Number((lines('var/j201-tools/parents.txt')[0] || '0').trim());
const r = { parents, files, d525: D525.filter((x) => files.includes(x)).length, other: files.filter((x) => !D525.includes(x)).length,
  tipDiff: lines('var/j201-tools/tip-diff.txt'), mainDiff: lines('var/j201-tools/main-diff.txt') };
r.ok = r.parents === 2 && r.d525 === 7 && r.other === 0 ? 1 : 0;
fs.writeFileSync('var/j201-tools/search-diff.json', JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J201EOF
```
```bash
cat > var/j201-tools/verdict.mjs <<'J201EOF'
// J201's reading, pre-registered 2026-11-09 before any rated game of either arm (the job's rule: line; D525 point 6,
// D523's point 9 copied with the arms renamed, quoted word for word there; D517's shape and +15 bar; D398's fixed match).
// usage: node verdict.mjs <match-a.json> <match-b.json> <rollouts-a.json> <rollouts-b.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// THE MATCHES: (a) search-v2-rrandom3 and (b) search-v2-rrandom3-held, each config A against search-v1-anytime
//   (search-v2), 1,200 games, 600 mirrored pairs, the confirm set, no stopping rule.
// COMPLETE (each): the line names the two players in that order at their config hashes (HASHES), complete: true, all 1,200 games played, errors +
//   timeouts <= 60 (one in 20), lo, elo, eloLo and eloHi numbers.
// EACH ARM, on its own match, only when complete, read once by the first row that holds (D525's table):
//   SHOWN                         lo > 0.5 and elo >= 15                       -> confirm at 4,800 (D519's readings)
//   INCONCLUSIVE                  eloHi >= 15 (not SHOWN; lo > 0.5 included,   -> confirm at 4,800 (D519's readings)
//                                 the job's case 1: inconclusiveAbove)
//   NOT SHOWN, indistinguishable  eloHi < 15, eloLo < 0 < eloHi, eloLo > -15   -> a candidate, confirmed at 4,800
//   NOT SHOWN, no weaker          eloHi < 15, eloLo >= 0 (the job's case 2)    -> read with the row above
//   NOT SHOWN, loses badly        eloHi < -15                                  -> diagnose, iterate (random-v4)
//   NOT SHOWN, worse, not badly   the rest: eloHi in [-15, 0), the too-wide    -> diagnose, iterate (random-v4)
//                                 case (contains 0, eloLo <= -15: tooWide) and eloHi exactly 0 (case 3: upperAtZero)
//   candidate = SHOWN, INCONCLUSIVE, indistinguishable or no weaker; diagnose = worse, not badly or loses badly.
// THE NIGHT: confirm = an arm is a candidate; iterate = an arm is to diagnose (D523 point 10); principleInDoubt = an
//   arm loses badly; iterationLosesBadly = both arms lose badly (this iteration loses badly, D525 point 7); repost =
//   an arm's match is incomplete. loopStops, selfPlayOpens and liveSeatChanged are 0 in every reading: J199 was not
//   an iteration that lost badly (its (b) read worse, not badly), so two successive ones cannot end here; the other
//   stop and the self-play path need a reading confirmed at 4,800 games.
// THE COST (from rollouts.cjs, only when its file names the match's run): reported, never changing a reading.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const MATCHES = { a: ['search-v2-rrandom3', 'search-v1-anytime'], b: ['search-v2-rrandom3-held', 'search-v1-anytime'] };
export const HASHES = { a: ['8d1623965986', 'cdd55e02a89c'], b: ['a484402b1185', 'cdd55e02a89c'] };
const READINGS = ['shown', 'inconclusive', 'indistinguishable', 'noWeaker', 'worseNotBadly', 'losesBadly'];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function arm(which, m, ro = null) {
  const [A, B] = MATCHES[which];
  const names = m !== null && m.a === A && m.b === B && m.ah === HASHES[which][0] && m.bh === HASHES[which][1] ? 1 : 0;
  const s = {
    match: m === null ? 0 : 1, names, a: A, b: B, id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
  };
  const complete = names === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR
    && s.lo !== null && s.elo !== null && s.eloLo !== null && s.eloHi !== null ? 1 : 0;
  const ok = complete === 1;
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
    : r.inconclusive ? `nothing yet: confirm at 4,800 games under D519's readings before anything${inconclusiveAbove ? ' (lower end above 0.5, point under +15: the job\'s case 1)' : ''}`
    : r.indistinguishable ? 'the arm is a candidate to replace Forge in the loop, confirmed at 4,800 games (the same three conditions) before it does'
    : r.noWeaker ? 'an interval wholly at or above 0 (the job\'s case 2): read with the indistinguishable row, a candidate confirmed at 4,800 games'
    : r.losesBadly ? 'diagnose from the counters and the worst-lost games (point 10) and iterate as random-v4; the principle\'s cheap path is in doubt until a v4 recovers it'
    : r.worseNotBadly ? `diagnose from the counters and the worst-lost games (point 10) and iterate as random-v4${tooWide ? '; too wide to call (its interval contains 0 but its lower end is at or below -15)' : ''}${upperAtZero ? ' (upper end exactly 0: the job\'s case 3)' : ''}`
    : null;
  const reading = !ok ? (s.match === 0 ? `NO MATCH (${which}): no reading; repost` : s.names === 0 ? `NOT THIS MATCH (${which}): no reading` : `INCOMPLETE (${which}): no reading; repost`)
    : `${name}: ${A} ${s.elo} Elo [${s.eloLo}, ${s.eloHi}], score ${s.score}, lower end ${s.lo}; ${what}`;
  return { ...s, complete, ...r, reading: name, notShown, candidate, diagnose, tooWide, upperAtZero, inconclusiveAbove, cost, text: reading };
}

export function night(ma, mb, roa = null, rob = null) {
  const a = arm('a', ma, roa), b = arm('b', mb, rob);
  const confirm = a.candidate || b.candidate ? 1 : 0;
  const iterate = a.diagnose || b.diagnose ? 1 : 0;
  const principleInDoubt = a.losesBadly || b.losesBadly ? 1 : 0;
  const iterationLosesBadly = a.losesBadly && b.losesBadly ? 1 : 0;
  const repost = a.complete === 0 || b.complete === 0 ? 1 : 0;
  const reading = [a.text, b.text,
    confirm ? `a 4,800-game confirmation follows for ${[a, b].filter((x) => x.candidate).map((x) => x.a).join(' and ')}` : 'no arm is a candidate',
    iterate ? `the agent diagnoses ${[a, b].filter((x) => x.diagnose).map((x) => x.a).join(' and ')} and iterates as random-v4 (D523 point 10), without asking the owner` : 'no arm to diagnose',
    repost ? 'an incomplete match is reposted' : 'both matches complete',
    iterationLosesBadly ? 'both arms lose badly: random-v3 is the first iteration that loses badly (J199 was not), and the next one stops the loop if it does too (D525 point 7)' : 'this iteration does not lose badly as a whole (D525 point 7)',
    'the loop does not stop on this night',
    'the self-play-from-random path does not open on this night (it waits for a reading confirmed at 4,800 games)',
    'the live seat is unchanged (a separate decision, D509)'];
  return { written: 1, games: GAMES, bar: BAR, a, b, confirm, iterate, principleInDoubt, iterationLosesBadly, repost,
    confirmBlock: a.candidate, confirmHeld: b.candidate, diagnoseBlock: a.diagnose, diagnoseHeld: b.diagnose,
    loopStops: 0, selfPlayOpens: 0, liveSeatChanged: 0, reading };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (which, o = {}) => {
    const [A, B] = MATCHES[which];
    return { id: `host:run-${which}`, a: A, b: B, ah: HASHES[which][0], bh: HASHES[which][1], complete: true, played: GAMES, errors: 0, timeouts: 0, score: 0.5, lo: 0.4864, hi: 0.5136, elo: 0, eloLo: -9.5, eloHi: 9.5,
      aSearch: { msPerDecision: 980 }, bSearch: { msPerDecision: 930 }, ...o };
  };
  const RO = (which, o = {}) => ({ run: `run-${which}`, games: GAMES, aRolloutsPerDecision: 18, bRolloutsPerDecision: 15, ratio: 1.2, aRrRollouts: 300000, aRrFailures: 0,
    aPerRollout: { v2_ownStack: 1.8 }, ...o });
  const SHOWN = { score: 0.53, lo: 0.518, hi: 0.542, elo: 20.9, eloLo: 11.4, eloHi: 30.4 };
  const BAD = { score: 0.457, lo: 0.443, hi: 0.471, elo: -30, eloLo: -39.5, eloHi: -20.5 };
  const WORSE = { score: 0.483, lo: 0.469, hi: 0.497, elo: -12, eloLo: -21.5, eloHi: -2.5 };
  const all = (ma, mb, roa = RO('a'), rob = RO('b')) => [ma, mb, roa, rob];
  const one = (x) => (x.complete === 0 ? READINGS.every((k) => x[k] === 0) && x.candidate + x.diagnose === 0 : READINGS.reduce((y, k) => y + x[k], 0) === 1 && x.candidate + x.diagnose === 1);
  const sane = (r) => r.liveSeatChanged === 0 && r.loopStops === 0 && r.selfPlayOpens === 0 && one(r.a) && one(r.b);
  const cases = [
    ['both flat, 0 [-9.5, +9.5]: NOT SHOWN, indistinguishable; both confirmed at 4,800', all(mk('a'), mk('b')), (r) => r.a.indistinguishable === 1 && r.a.notShown === 1 && r.b.indistinguishable === 1 && r.confirm === 1 && r.iterate === 0 && r.confirmBlock === 1 && r.confirmHeld === 1],
    ['a clear gain is SHOWN (confirm); a clear loss loses badly (diagnose, the principle in doubt)', all(mk('a', SHOWN), mk('b', BAD)), (r) => r.a.shown === 1 && r.a.candidate === 1 && r.b.losesBadly === 1 && r.b.diagnose === 1 && r.confirm === 1 && r.iterate === 1 && r.principleInDoubt === 1 && r.iterationLosesBadly === 0],
    ['a point of exactly +15 with the lower end above 0.5 is SHOWN', all(mk('a', { lo: 0.505, elo: 15, eloLo: 5.5, eloHi: 24.5 }), mk('b')), (r) => r.a.shown === 1],
    ['a lower end above 0.5 with a point of +14.9 is INCONCLUSIVE (case 1)', all(mk('a', { lo: 0.505, elo: 14.9, eloLo: 5.4, eloHi: 24.4 }), mk('b')), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 1 && r.a.candidate === 1],
    ['a lower end of exactly 0.5 is not SHOWN: INCONCLUSIVE, not case 1', all(mk('a', { lo: 0.5, elo: 18, eloLo: 0, eloHi: 36 }), mk('b')), (r) => r.a.inconclusive === 1 && r.a.inconclusiveAbove === 0],
    ['an upper end of +14.9 with the interval containing 0 is NOT SHOWN, indistinguishable', all(mk('a'), mk('b', { elo: 5.4, eloLo: -4.1, eloHi: 14.9 })), (r) => r.b.indistinguishable === 1 && r.b.inconclusive === 0],
    ['an upper end of exactly +15 is INCONCLUSIVE', all(mk('a'), mk('b', { elo: 5.5, eloLo: -4, eloHi: 15 })), (r) => r.b.inconclusive === 1 && r.b.indistinguishable === 0],
    ['INCONCLUSIVE comes before indistinguishable: -1 [-17.2, +15.2] is INCONCLUSIVE', all(mk('a', { elo: -1, eloLo: -17.2, eloHi: 15.2 }), mk('b')), (r) => r.a.inconclusive === 1 && r.a.indistinguishable === 0 && r.a.candidate === 1],
    ['a lower end of -14.9 is indistinguishable (above the -15 bound)', all(mk('a', { elo: -5, eloLo: -14.9, eloHi: 4.9 }), mk('b')), (r) => r.a.indistinguishable === 1],
    ['a lower end of exactly -15 is too wide to call: worse, not badly', all(mk('a', { elo: -5.1, eloLo: -15, eloHi: 4.8 }), mk('b')), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1 && r.a.diagnose === 1 && r.iterate === 1],
    ['-6 [-15.5, +3.5] is too wide to call: worse, not badly', all(mk('a', { elo: -6, eloLo: -15.5, eloHi: 3.5 }), mk('b')), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 1],
    ['-12 [-21.5, -2.5] is worse, not badly, and not too wide', all(mk('a', WORSE), mk('b')), (r) => r.a.worseNotBadly === 1 && r.a.tooWide === 0 && r.a.notShown === 1],
    ['an upper end of exactly -15 is worse, not badly', all(mk('a', { elo: -24.5, eloLo: -34, eloHi: -15 }), mk('b')), (r) => r.a.worseNotBadly === 1 && r.a.losesBadly === 0],
    ['an upper end of -15.1 loses badly', all(mk('a', { elo: -24.6, eloLo: -34.1, eloHi: -15.1 }), mk('b')), (r) => r.a.losesBadly === 1 && r.a.worseNotBadly === 0 && r.principleInDoubt === 1],
    ['an upper end of exactly 0 is worse, not badly (case 3)', all(mk('a', { elo: -9.5, eloLo: -19, eloHi: 0 }), mk('b')), (r) => r.a.worseNotBadly === 1 && r.a.upperAtZero === 1 && r.a.tooWide === 0],
    ['a NOT SHOWN interval wholly at or above 0, +4.5 [0, +9], is no weaker (case 2): a candidate', all(mk('a', { lo: 0.5, elo: 4.5, eloLo: 0, eloHi: 9 }), mk('b', WORSE)), (r) => r.a.noWeaker === 1 && r.a.indistinguishable === 0 && r.a.candidate === 1 && r.confirm === 1 && r.iterate === 1],
    ['a lower end of exactly 0 with an upper end of +19 is INCONCLUSIVE', all(mk('a', { lo: 0.5, elo: 9.5, eloLo: 0, eloHi: 19 }), mk('b')), (r) => r.a.inconclusive === 1 && r.a.noWeaker === 0],
    ['both lose badly: diagnose both, no confirmation', all(mk('a', BAD), mk('b', BAD)), (r) => r.a.losesBadly === 1 && r.b.losesBadly === 1 && r.confirm === 0 && r.iterate === 1 && r.diagnoseBlock === 1 && r.diagnoseHeld === 1 && r.iterationLosesBadly === 1],
    ['both worse, not badly: iterate, the principle not in doubt', all(mk('a', WORSE), mk('b', WORSE)), (r) => r.iterate === 1 && r.confirm === 0 && r.principleInDoubt === 0 && r.iterationLosesBadly === 0],
    ['rrandom3 indistinguishable, rrandom3-held worse: confirm rrandom3, diagnose rrandom3-held', all(mk('a'), mk('b', WORSE)), (r) => r.confirmBlock === 1 && r.confirmHeld === 0 && r.diagnoseBlock === 0 && r.diagnoseHeld === 1],
    ['a stopped (a) gets no reading and is reposted; (b) losing badly is diagnosed', all({ ...mk('a', SHOWN), complete: false, played: 800 }, mk('b', BAD)), (r) => r.a.complete === 0 && r.a.reading === null && r.repost === 1 && r.iterate === 1 && r.confirm === 0],
    ['1,199 games is not complete', all({ ...mk('a', SHOWN), played: 1199 }, mk('b')), (r) => r.a.complete === 0 && r.a.shown === 0 && r.repost === 1],
    ['61 errors and timeouts is not complete', all(mk('a', { ...SHOWN, errors: 40, timeouts: 21 }), mk('b')), (r) => r.a.complete === 0 && r.a.shown === 0],
    ['60 errors and timeouts is complete', all(mk('a', { ...SHOWN, errors: 40, timeouts: 20 }), mk('b')), (r) => r.a.complete === 1 && r.a.shown === 1 && r.repost === 0],
    ['a line without eloLo is not complete', all({ ...mk('a'), eloLo: null }, mk('b')), (r) => r.a.complete === 0],
    ['the players swapped is not this match', all({ ...mk('a'), a: 'search-v1-anytime', b: 'search-v2-rrandom3' }, mk('b')), (r) => r.a.names === 0 && r.a.complete === 0],
    ['(b)\'s arm in (a)\'s file is not (a)', all({ ...mk('a'), a: 'search-v2-rrandom3-held' }, mk('b')), (r) => r.a.names === 0 && r.a.complete === 0],
    ['J199\'s search-v2-rrandom (random-v2) in (a)\'s file is not (a)', all({ ...mk('a'), a: 'search-v2-rrandom' }, mk('b')), (r) => r.a.names === 0 && r.a.complete === 0],
    ['(a) at another config hash (D523\'s rrandom fb8ae32c014d) is not this match', all({ ...mk('a'), ah: 'fb8ae32c014d' }, mk('b')), (r) => r.a.names === 0 && r.a.complete === 0 && r.repost === 1],
    ['no (b) file gives (b) no reading', all(mk('a', WORSE), null), (r) => r.b.match === 0 && r.b.complete === 0 && r.repost === 1 && r.iterate === 1],
    ['the rollouts are read from the match\'s own run and change no reading', all(mk('a'), mk('b')), (r) => r.a.cost.read === 1 && r.a.cost.ratio === 1.2 && r.a.cost.aPerRollout.v2_ownStack === 1.8 && r.a.cost.msRatio === 1.0538],
    ['a rollout file from another run is not read, and changes no reading', all(mk('a'), mk('b'), RO('x')), (r) => r.a.cost.read === 0 && r.a.cost.ratio === null && r.a.indistinguishable === 1],
  ];
  let ok = 0;
  cases.forEach(([what, ms, pred], i) => {
    const files = ['a', 'b', 'roa', 'rob'].map((w, j) => {
      const f = path.join(scratch, `case-${i}-${w}.json`);
      if (ms[j] !== null) fs.writeFileSync(f, JSON.stringify(ms[j]));
      return f;
    });
    const r = night(...files.map(read));
    const pass = pred(r) && sane(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading.join(' | ')}`);
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
} else if (argv.length === 5) {
  const r = night(read(argv[0]), read(argv[1]), read(argv[2]), read(argv[3]));
  fs.mkdirSync(path.dirname(argv[4]), { recursive: true });
  fs.writeFileSync(argv[4], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match-a.json> <match-b.json> <rollouts-a.json> <rollouts-b.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J201EOF
cat > var/j201-tools/rollouts.cjs <<'J201EOF'
// J201: J199's reader (J198's, J197's, itself J195's) with D525's v3. fires summed beside the v2. ones. Rollouts per searched decision (p + a + b)
// for each side of one match: the match line has no rollouts field and no search.rr.*, so this reads each batch
// line's aStats/bStats counts (config A is the match's first player, as tools/ai-ladder/cli.ts cmdMatch tallies it):
// `search.rollouts`, `search.rounds`, `search.anytime.short`, `search.<p|a|b>.considered`, `search.playUs`,
// `search.copyUs`, `search.rolloutErrors`, `search.rolloutStepCap`, and every key under `search.rr.` (D523's random
// rollouts: `rollouts`, D451's guardrail names, the `v2.` ones, D525's `v3.` ones, `failures`) and `search.prior.rr.` (the ranking's
// playouts; neither arm ranks). Each `search.rr.<name>` is given per random rollout (over `search.rr.rollouts`) as
// `<side>PerRollout.<name with dots as _>` and per game (over the batch lines read) as `<side>PerGame.<...>`.
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, short: 0, decisions: 0, playUs: 0, copyUs: 0, rolloutErrors: 0, stepCap: 0, rr: {}, prr: {}, lines: 0 });
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
      for (const key of Object.keys(c)) {
        if (key.startsWith('search.rr.')) s.rr[key.slice(10)] = (s.rr[key.slice(10)] || 0) + n(key);
        else if (key.startsWith('search.prior.rr.')) s.prr[key.slice(16)] = (s.prr[key.slice(16)] || 0) + n(key);
      }
    }
  }
}
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const per = (s, x) => (s.decisions > 0 ? r2(s[x] / s.decisions) : null);
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
    [`${k}V2Fires`]: Object.entries(s.rr).filter(([x]) => x.startsWith('v2.')).reduce((y, [, v]) => y + v, 0),
    [`${k}V3Fires`]: Object.entries(s.rr).filter(([x]) => x.startsWith('v3.')).reduce((y, [, v]) => y + v, 0),
    [`${k}Rr`]: s.rr, [`${k}PriorRr`]: s.prr, [`${k}PerRollout`]: perRollout, [`${k}PerGame`]: perGame,
  });
}
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run: r.run, games: r.games, aRolloutsPerDecision: r.aRolloutsPerDecision, bRolloutsPerDecision: r.bRolloutsPerDecision, ratio: r.ratio, aRrRollouts: r.aRrRollouts, bRrRollouts: r.bRrRollouts, aV2Fires: r.aV2Fires, aV3Fires: r.aV3Fires, aPerRollout: r.aPerRollout }));
J201EOF
cat > var/j201-tools/worst.cjs <<'J201EOF'
// J201: the arm's worst-lost games of one match, for D523 point 10's diagnosis (D525 continues it). A batch line has no life total, so the
// arm's lost games (winner "B": config A is the arm; no error, no timeout) are ranked by `turns`: the ten longest
// (turns descending, then ms descending; D523's "longest turn count") and the ten quickest (turns ascending, then ms
// ascending). Each game: the batch file and line, seed, pair, game, aSeat, both decks, turns, reason, ms, cpuMs, and
// the arm's own counters in that game: decisions searched (search.<p|a|b>.considered) and changed
// (search.<p|a|b>.changed), random rollouts (search.rr.rollouts), each search.rr.v2.* and search.rr.v3.* per random rollout,
// search.rr.failures and search.rolloutErrors. aCfgOther counts lines whose config A is not `,rollout=<mode>`-suffixed.
// usage: node worst.cjs <ladder dir> <match.json> <random3|random3-held> <out.json>
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
    const v2 = {};
    for (const key of Object.keys(c).filter((x) => x.startsWith('search.rr.v2.')).sort()) v2[key.slice(13)] = rrN > 0 ? Math.round((n(key) / rrN) * 1000) / 1000 : null;
    const v3 = {};
    for (const key of Object.keys(c).filter((x) => x.startsWith('search.rr.v3.')).sort()) v3[key.slice(13)] = rrN > 0 ? Math.round((n(key) / rrN) * 1000) / 1000 : null;
    lost.push({ batch: f, line: i, seed: l.seed, pair: l.pair, game: l.game, aSeat: l.aSeat, aDeck: deck(l.aDeck), bDeck: deck(l.bDeck), turns: l.turns, reason: l.reason, ms: l.ms, cpuMs: l.cpuMs ?? null,
      searched: n('search.p.considered') + n('search.a.considered') + n('search.b.considered'), changed: n('search.p.changed') + n('search.a.changed') + n('search.b.changed'),
      rrRollouts: rrN, v2PerRollout: v2, v3PerRollout: v3, rrFailures: n('search.rr.failures'), rolloutErrors: n('search.rolloutErrors') });
  });
}
const longest = [...lost].sort((x, y) => (y.turns - x.turns) || (y.ms - x.ms)).slice(0, 10);
const quickest = [...lost].sort((x, y) => (x.turns - y.turns) || (x.ms - y.ms)).slice(0, 10);
const r = { run, a: m?.a ?? null, mode, games, lost: lost.length, won, other, aCfgOther,
  meanTurnsLost: lost.length ? Math.round((turnsLost / lost.length) * 100) / 100 : null, meanTurnsWon: won ? Math.round((turnsWon / won) * 100) / 100 : null,
  longest, quickest };
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify({ run, games, lost: r.lost, won, other, aCfgOther, meanTurnsLost: r.meanTurnsLost, meanTurnsWon: r.meanTurnsWon }));
J201EOF
cat > var/j201-tools/seeds.cjs <<'J201EOF'
// J201: which deal blocks a match played (D398 point 2: a new matchup's blocks start at the host's match base). Reads
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
J201EOF
rm -rf var/j201-tools/selftest
node var/j201-tools/verdict.mjs --selftest var/j201-tools/selftest > var/j201-tools/selftest.json
cat var/j201-tools/selftest.json
# the rollout reader and the worst-games reader on a synthetic batch folder: three games; the arm (A) wins one, loses
# two (one of them the longer), with R8's and R9's v3. counters on the lost two, and search-v2 (B) carries no search.rr.* key
rm -rf var/j201-tools/ro-selftest
mkdir -p var/j201-tools/ro-selftest/batches/run-s
C='Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1'
printf '%s\n' \
  '{"seed":11,"pair":0,"game":0,"aSeat":0,"aDeck":"d/x-A.dck","bDeck":"d/x-B.dck","a":"'"$C"',rollout=random3","winner":"B","reason":"AllOpponentsLost","turns":14,"ms":40000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":8,"search.a.considered":2,"search.p.changed":2,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":320,"search.rr.v2.lethalAttack":4,"search.rr.v3.goodBlock":8,"search.rr.land":20}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.p.considered":10}}}' \
  '{"seed":12,"pair":0,"game":1,"aSeat":1,"aDeck":"d/x-B.dck","bDeck":"d/x-A.dck","a":"'"$C"',rollout=random3","winner":"A","reason":"AllOpponentsLost","turns":9,"ms":30000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.playUs":8000000,"search.copyUs":1000000,"search.rr.rollouts":160,"search.rr.v2.ownStack":160,"search.rr.failures":1}},"bStats":{"counts":{"search.rollouts":130,"search.rounds":50,"search.b.considered":10}}}' \
  '{"seed":13,"pair":1,"game":0,"aSeat":0,"aDeck":"d/y-A.dck","bDeck":"d/y-B.dck","a":"'"$C"',rollout=random3","winner":"B","reason":"AllOpponentsLost","turns":6,"ms":20000,"timeout":false,"error":"","aStats":{"counts":{"search.rollouts":160,"search.rounds":60,"search.p.considered":10,"search.rr.rollouts":160,"search.rr.v2.castSomething":16,"search.rr.v3.heldInstant":4}},"bStats":{"counts":{"search.rollouts":140,"search.rounds":50,"search.p.considered":10}}}' \
  > var/j201-tools/ro-selftest/batches/run-s/b0.jsonl
echo '{"id":"h:run-s","a":"search-v2-rrandom3","b":"search-v1-anytime"}' > var/j201-tools/ro-selftest/match.json
node var/j201-tools/rollouts.cjs var/j201-tools/ro-selftest var/j201-tools/ro-selftest/match.json var/j201-tools/ro-selftest/out.json
node var/j201-tools/worst.cjs var/j201-tools/ro-selftest var/j201-tools/ro-selftest/match.json random3 var/j201-tools/ro-selftest/worst.json
node -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync("var/j201-tools/ro-selftest/out.json","utf8"));const w=JSON.parse(fs.readFileSync("var/j201-tools/ro-selftest/worst.json","utf8"));const ok=r.games===3&&r.aDecisions===30&&r.bDecisions===30&&r.aRolloutsPerDecision===16&&r.bRolloutsPerDecision===13.33&&r.ratio===1.2&&r.aRrRollouts===480&&r.bRrRollouts===0&&r.aPerRollout.v2_ownStack===1&&r.aPerRollout.v2_lethalAttack===0.0083&&r.aPerRollout.v2_castSomething===0.0333&&r.aPerRollout.land===0.0417&&r.aPerGame.v2_ownStack===160&&r.aRrFailures===1&&r.aV2Fires===500&&r.aV3Fires===12&&r.aPerRollout.v3_goodBlock===0.0167&&r.aPerRollout.v3_heldInstant===0.0083&&r.bV3Fires===0&&r.aPlayMsPerRollout===33.33&&w.games===3&&w.lost===2&&w.won===1&&w.aCfgOther===0&&w.longest[0].seed===11&&w.longest[0].v2PerRollout.ownStack===2&&w.longest[0].v3PerRollout.goodBlock===0.05&&w.quickest[0].v3PerRollout.heldInstant===0.025&&w.longest[0].changed===2&&w.longest[0].aDeck==="x-A"&&w.quickest[0].seed===13&&w.meanTurnsLost===10&&w.meanTurnsWon===9?1:0;fs.writeFileSync("var/j201-tools/ro-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# the block reader on a synthetic results log: the match's purpose at two blocks over three games, another purpose that must not count
rm -rf var/j201-tools/seeds-selftest
mkdir -p var/j201-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:h:new","bseed":114900000}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:other","bseed":114900150}' > var/j201-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j201-tools/seeds-selftest/match.json
node var/j201-tools/seeds.cjs var/j201-tools/seeds-selftest var/j201-tools/seeds-selftest/match.json var/j201-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j201-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900000&&r.max===114900149?1:0;require("fs").writeFileSync("var/j201-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# 4 games of each arm (one batch of one deck pair, one worker, one after the other), in the pilot's own ladder folder
# and seed range (the same deal for both), then each side's rollouts and search.rr.* counters from the batch, and the
# worst-games reader on it
for x in a:search-v2-rrandom3:random3 b:search-v2-rrandom3-held:random3-held; do
  k=${x%%:*}; rest=${x#*:}; p=${rest%%:*}; mode=${rest#*:}
  ./tools/ai-ladder.sh match "$p" search-v1-anytime --games 4 --batch-pairs 1 --host j201-pilot --purpose pilot --dir var/ai-ladder-pilot/J201 --experiments var/ai-ladder-pilot/J201/experiments.jsonl --out var/ai-ladder-pilot/J201/match-$k.json --jobs 1
  node var/j201-tools/rollouts.cjs var/ai-ladder-pilot/J201 var/ai-ladder-pilot/J201/match-$k.json var/j201-tools/rollouts-pilot-$k.json
  node var/j201-tools/worst.cjs var/ai-ladder-pilot/J201 var/ai-ladder-pilot/J201/match-$k.json "$mode" var/j201-tools/worst-pilot-$k.json
done
```
metrics: merged = sh: cat var/j201-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j201-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j201-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"d525":0,"other":-1}'
metrics: st = sh: cat var/j201-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: rst = sh: cat var/j201-tools/ro-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j201-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J201/match-a.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmb = sh: cat var/ai-ladder-pilot/J201/match-b.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pra = sh: cat var/j201-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0}'
metrics: prb = sh: cat var/j201-tools/rollouts-pilot-b.json 2>/dev/null || echo '{"games":0}'
metrics: pwa = sh: cat var/j201-tools/worst-pilot-a.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
metrics: pwb = sh: cat var/j201-tools/worst-pilot-b.json 2>/dev/null || echo '{"games":0,"aCfgOther":-1}'
check: merged == 1
check: pl.ok == 1
check: pl.rrandom3_only_rollout == 1
check: pl.rrandom3_held_only_rollout == 1
check: sd.parents == 2
check: sd.d525 == 7
check: sd.other == 0
check: st.ok == 1
check: st.cases == 32
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
check: pmb.aSearch.searched >= 10
check: pmb.bSearch.searched >= 10
check: prb.games == 4
check: prb.aDecisions == pmb.aSearch.searched
check: prb.bDecisions == pmb.bSearch.searched
check: prb.aRrRollouts > 0
check: prb.aV2Fires > 0
check: prb.bRrRollouts == 0
check: pwb.games == 4
check: pwb.aCfgOther == 0
check: pmb.aSearch.msPerDecision < 1500
check: pmb.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- the three players resolve on this PC: `pl.ok` is search-v1-anytime at search-v2's exact config string and both arms
  present; `pl.rrandom3_only_rollout` and `pl.rrandom3_held_only_rollout` say each arm's ai-bench config is
  search-v1-anytime's with `,rollout=random3` or `,rollout=random3-held` appended and nothing else. The hashes are in
  `pl.hashes` (`pl.hashesAsD525` says whether they are D525's), reported, not checked;
- `sd`: the pin has two parents (it is a merge), and the files its merge brought under `bridge/src/mtgtable/ai` are
  D525's seven (`DecisionSelfTest`, `ExploreMath`, `Explorer`, `RolloutController`, `RolloutGuards`, `SearchConfig`,
  `SearchPolicy`, the same seven D523 changed) and no other, so the arms play D525's code and nothing else changed in the search with them;
- the verdict script reads thirty-two synthetic pairs of match files as D525's table says, by the first row that
  holds: the +15 point and the 0.5 lower end at and beside their bars (SHOWN), the +15 upper end at and beside its bar
  (INCONCLUSIVE before indistinguishable, the job's case 1 among them), the -15 non-inferiority bound at and beside it
  (indistinguishable above, too wide to call at and below), the -15 upper end at and beside it (loses badly only
  below), an upper end of exactly 0 (case 3) and an interval wholly at or above 0 (case 2), the night's confirmation,
  iteration and doubt for each mix of readings, an incomplete match reposted, 1,199 games, 61 errors, a missing lower
  end, swapped players, the wrong arm and a wrong config hash refused, a rollout file from another run not read, exactly one reading per
  complete arm, and the loop never stopped, the self-play path never opened and the live seat never changed;
- the rollout reader and the worst-games reader read a synthetic batch of three games as written (`rst.ok`: rollouts
  and rounds a decision, every `search.rr.*` per random rollout and per game, the failures, the lost games ranked by
  turns with the arm's counters), and the block reader a synthetic results log (`sst.ok`);
- in 4 games of each arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match line
  counts, **the arm's random rollouts are counted and its guardrails fired** (`pr*.aRrRollouts`, `pr*.aV2Fires`: the
  counters reach the batch line, D523 point 5), **search-v2's side carries none** (`pr*.bRrRollouts` 0: its rollouts
  are still Forge's), every line's config A is the arm's (`pw*.aCfgOther` 0), and both sides stay under the 1.5 s
  budget on average (D525's pilot: 886 and 852 ms under rrandom3, 868 and 846 under rrandom3-held).

Read, not checked:
- `sd.tipDiff`, the files under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` that differ between the lane's
  tip when this was drafted (ec9b77fb) and the pin: empty unless the lane took commits after this draft (a skeptic's
  fixes) or main moved under those folders before the merge, which `sd.mainDiff` (main's changes there between
  D525's base 2ffb65fe and the merge's first parent) separates out; `summary.md` names any file in either;
- each arm's rollouts a decision against search-v2's (`pr*.ratio`; D525's pilot x1.24 (rrandom3) and x1.20 (rrandom3-held); J199 x1.15 under `random` over its night), play and copy ms a
  rollout, its random rollouts against all its rollouts (`pr*.aRrRolloutShare`, about 1 or a little above: it counts the rollouts the deadline cut), each guardrail per
  random rollout (`pr*.aPerRollout`, R8's `v3_goodBlock` and R9's `v3_heldInstant` among them, `pr*.aV3Fires` their sum), `pr*.aRrFailures` and rollout errors (D525's pilot: 0).

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J201a.json
```bash
# (a) both seats random-v2 + R8 in the rollouts: search-v2 with rollout=random3 against search-v2, 1,200 games, a verdict
test -f var/j201-tools/verdict.mjs
mkdir -p var/j201
echo "J201 (a): search-v2-rrandom3 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom3 search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J201a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J201b.json
```bash
# (b) both seats random-v2 + R8 + R9 in the rollouts: search-v2 with rollout=random3-held against search-v2, 1,200 games, a verdict
echo "J201 (b): search-v2-rrandom3-held against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-rrandom3-held search-v1-anytime --games 1200 --hours 4 --out var/ai-ladder/match-J201b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j201/verdict.json var/j201/report.md var/j201/rollouts-a.json var/j201/rollouts-b.json var/j201/seeds-a.json var/j201/seeds-b.json var/j201/worst-a.json var/j201/worst-b.json
```bash
# the pre-registered reading; each match's rollouts, search.rr.* counters, deal blocks and worst-lost games (read, not
# gated); report.md (numbers only; the PC session writes the summary beside it)
mkdir -p var/j201
for x in a:random3 b:random3-held; do
  k=${x%%:*}; mode=${x#*:}
  node var/j201-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J201$k.json var/j201/rollouts-$k.json
  node var/j201-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J201$k.json var/j201/seeds-$k.json
  node var/j201-tools/worst.cjs var/ai-ladder var/ai-ladder/match-J201$k.json "$mode" var/j201/worst-$k.json
done
node var/j201-tools/verdict.mjs var/ai-ladder/match-J201a.json var/ai-ladder/match-J201b.json var/j201/rollouts-a.json var/j201/rollouts-b.json var/j201/verdict.json
node - <<'J201EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const K = ['a', 'b'];
const M = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J201${k}.json`)]));
const RO = Object.fromEntries(K.map((k) => [k, read(`var/j201/rollouts-${k}.json`)]));
const BS = Object.fromEntries(K.map((k) => [k, read(`var/j201/seeds-${k}.json`)]));
const W = Object.fromEntries(K.map((k) => [k, read(`var/j201/worst-${k}.json`)]));
const v = read('var/j201/verdict.json');
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const hours = (m) => { const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const L = ['# J201: random rollouts, search-v2-rrandom3 (both seats random-v2 + R8) and search-v2-rrandom3-held (both seats random-v2 + R8 + R9), each against search-v1-anytime (D525)', ''];
L.push(`**Readings under the pre-registered table (D525 point 6, D523's copied):** (a) ${(v.a || {}).text ?? 'no reading'}. (b) ${(v.b || {}).text ?? 'no reading'}.`, '');
L.push(`**What the night decides:** ${(v.reading || []).slice(2).join('; ') || '-'}.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A / B ms | A rollouts per decision | B rollouts per decision | A / B rollouts | A / B play ms a rollout | A / B copy ms a rollout | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k], r = RO[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${((v[k] || {}).cost || {}).msRatio ?? '-'} | ${r.aRolloutsPerDecision ?? '-'} | ${r.bRolloutsPerDecision ?? '-'} | ${r.ratio ?? '-'} | ${r.aPlayMsPerRollout ?? '-'} / ${r.bPlayMsPerRollout ?? '-'} | ${r.aCopyMsPerRollout ?? '-'} / ${r.bCopyMsPerRollout ?? '-'} | ${hours(m) ?? '-'} |`);
}
L.push('');
for (const k of K) {
  const m = M[k], r = RO[k], b = BS[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Deal blocks ${b.blocks ?? '-'}, ${b.min ?? '-'} to ${b.max ?? '-'}, ${b.games ?? '-'} games. Rounds per searched decision ${r.aRoundsPerDecision ?? '-'} / ${r.bRoundsPerDecision ?? '-'}; decided on fewer than two rounds ${r.aShort ?? '-'} = ${pct(r.aShortShare, 2)} / ${r.bShort ?? '-'} = ${pct(r.bShortShare, 2)}; rollout errors ${r.aRolloutErrors ?? '-'} / ${r.bRolloutErrors ?? '-'}, step caps ${r.aStepCaps ?? '-'} / ${r.bStepCaps ?? '-'}; the rollout reader saw ${r.games ?? '-'} games and ${r.aDecisions ?? '-'} / ${r.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}). Random rollouts ${r.aRrRollouts ?? '-'} of the arm's ${r.aRollouts ?? '-'} (${pct(r.aRrRolloutShare)}); search-v2's side ${r.bRrRollouts ?? '-'}; random-seat failures ${r.aRrFailures ?? '-'}.`);
}
const rank = (x) => (x.startsWith('v2_') ? 0 : x.startsWith('v3_') ? 1 : 2);
const names = [...new Set(K.flatMap((k) => Object.keys(RO[k].aPerRollout || {})))].sort((x, y) => (rank(x) - rank(y)) || x.localeCompare(y));
L.push('', '| search.rr.<name> | (a) fires | (a) per random rollout | (a) per game | (b) fires | (b) per random rollout | (b) per game |', '|---|---|---|---|---|---|---|');
for (const n of names) {
  const raw = n.replace(/_/g, '.');
  L.push(`| ${raw} | ${(RO.a.aRr || {})[raw] ?? 0} | ${(RO.a.aPerRollout || {})[n] ?? '-'} | ${(RO.a.aPerGame || {})[n] ?? '-'} | ${(RO.b.aRr || {})[raw] ?? 0} | ${(RO.b.aPerRollout || {})[n] ?? '-'} | ${(RO.b.aPerGame || {})[n] ?? '-'} |`);
}
L.push(`| rollouts (the denominator) | ${RO.a.aRrRollouts ?? '-'} | 1 | ${RO.a.games ? Math.round((RO.a.aRrRollouts / RO.a.games) * 100) / 100 : '-'} | ${RO.b.aRrRollouts ?? '-'} | 1 | ${RO.b.games ? Math.round((RO.b.aRrRollouts / RO.b.games) * 100) / 100 : '-'} |`);
L.push('', 'R3\'s v2.targetSide counts target lists narrowed at each listing, not picks (D523\'s residual). Under both rollout=random3 and random3-held the fires of both random seats are summed; v3.heldInstant appears only under random3-held. R8 (v3.goodBlock) counts each attacker given a good block, R9 (v3.heldInstant) each priority whose harmful plays it held.');
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
const row = (g) => `| ${g.batch}:${g.line} | ${g.seed} | ${g.aDeck} vs ${g.bDeck} | ${g.aSeat} | ${g.turns} | ${g.reason} | ${g.ms} | ${g.searched} / ${g.changed} | ${g.rrRollouts} | ${[...Object.entries(g.v2PerRollout || {}).map(([n, x]) => `v2.${n} ${x}`), ...Object.entries(g.v3PerRollout || {}).map(([n, x]) => `v3.${n} ${x}`)].join(', ') || '-'} | ${g.rrFailures} / ${g.rolloutErrors} |`;
for (const k of K) {
  const w = W[k];
  L.push('', `(${k}) ${w.a ?? '-'}: ${w.lost ?? '-'} lost, ${w.won ?? '-'} won, ${w.other ?? '-'} drawn, errored or timed out of ${w.games ?? '-'} batch lines; mean turns ${w.meanTurnsLost ?? '-'} lost, ${w.meanTurnsWon ?? '-'} won; lines whose config A is not the arm's: ${w.aCfgOther ?? '-'}. No life total is on a batch line: the iteration replays a game's seed with full recording for it (D523 point 10).`);
  for (const [what, list] of [['the ten longest lost games (turns descending)', w.longest], ['the ten quickest lost games (turns ascending)', w.quickest]]) {
    L.push('', `(${k}) ${what}:`, '', '| batch:line | seed | arm\'s deck vs search-v2\'s | arm seat | turns | reason | ms | searched / changed | random rollouts | search.rr.v2.* and v3.* per random rollout | failures / rollout errors |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const g of list || []) L.push(row(g));
  }
}
const parts = (k, m) => {
  const x = v[k] || {};
  const n = (y) => typeof y === 'number';
  return `(${k}) complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${n(m.lo) && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${n(m.elo) && m.elo >= 15 ? 1 : 0}; upper end at least +15 Elo: ${n(m.eloHi) && m.eloHi >= 15 ? 1 : 0}; Elo interval contains 0: ${n(m.eloLo) && n(m.eloHi) && m.eloLo < 0 && m.eloHi > 0 ? 1 : 0}; lower end above -15 Elo: ${n(m.eloLo) && m.eloLo > -15 ? 1 : 0}; upper end below 0: ${n(m.eloHi) && m.eloHi < 0 ? 1 : 0}; upper end below -15 Elo: ${n(m.eloHi) && m.eloHi < -15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0} (case 1 ${x.inconclusiveAbove ?? 0}), NOT SHOWN indistinguishable ${x.indistinguishable ?? 0}, no weaker (case 2) ${x.noWeaker ?? 0}, worse, not badly ${x.worseNotBadly ?? 0} (too wide ${x.tooWide ?? 0}, case 3 ${x.upperAtZero ?? 0}), loses badly ${x.losesBadly ?? 0}; candidate ${x.candidate ?? 0}, diagnose ${x.diagnose ?? 0}.`;
};
L.push('', `Rule parts, each arm on its own match, read by the first row that holds: ${parts('a', M.a)} ${parts('b', M.b)} The night: a 4,800-game confirmation owed ${v.confirm ?? 0} (rrandom3 ${v.confirmBlock ?? 0}, rrandom3-held ${v.confirmHeld ?? 0}); iterate as random-v4 ${v.iterate ?? 0} (diagnose rrandom3 ${v.diagnoseBlock ?? 0}, rrandom3-held ${v.diagnoseHeld ?? 0}); the principle's cheap path in doubt ${v.principleInDoubt ?? 0}; this iteration loses badly (both arms) ${v.iterationLosesBadly ?? 0}; repost ${v.repost ?? 0}; loop stops ${v.loopStops ?? 0}, self-play from random opens ${v.selfPlayOpens ?? 0}, live seat changed ${v.liveSeatChanged ?? 0} (all three 0 on this night by the rule: J199 was not an iteration that lost badly, D525 point 7).`);
L.push('', 'Beside them on the same 600 deals, against search-v2 (J195, information only): search-v2-routlets +6.9 [-2.7, +16.6], search-v2-ranked -12.2 [-21.4, -2.9], search-v2-ms750-r6 -4.6 [-14.3, +5.0], search-v2-ms375-r3 -14.5 [-26.1, -2.9]; Forge Default, no search, -87.5 [-103.2, -72.1] from search-v2\'s side (J194).');
const prior = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J199${k}.json`)]));
for (const k of K) {
  const m = prior[k];
  const fin = typeof m.eloHi === 'number';
  L.push('', `J199 (${k}), random-v2 on the same deals (information only; D525 point 7 reads J199 as not an iteration that lost badly, its (b) being worse, not badly): ${m.a ?? '-'} vs ${m.b ?? '-'}, ${m.played ?? '-'} games, complete ${m.complete ?? '-'}, score ${m.score ?? '-'} [${m.lo ?? '-'}, ${m.hi ?? '-'}], Elo ${m.elo ?? '-'} [${m.eloLo ?? '-'}, ${m.eloHi ?? '-'}]${fin ? `; upper end below -15 Elo: ${m.eloHi < -15 ? 1 : 0}` : ''}.`);
}
fs.writeFileSync('var/j201/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J201EOF
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
check: wa.aCfgOther == 0
check: wb.aCfgOther == 0
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
check: v.confirm == 1 or not (v.a.candidate == 1 or v.b.candidate == 1)
check: v.confirm == 0 or (v.a.candidate == 1 or v.b.candidate == 1)
check: v.iterate == 1 or not (v.a.diagnose == 1 or v.b.diagnose == 1)
check: v.iterate == 0 or (v.a.diagnose == 1 or v.b.diagnose == 1)
check: v.principleInDoubt == 1 or not (v.a.losesBadly == 1 or v.b.losesBadly == 1)
check: v.principleInDoubt == 0 or (v.a.losesBadly == 1 or v.b.losesBadly == 1)
check: v.iterationLosesBadly == 1 or not (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.iterationLosesBadly == 0 or (v.a.losesBadly == 1 and v.b.losesBadly == 1)
check: v.loopStops == 0
check: v.selfPlayOpens == 0
check: v.liveSeatChanged == 0

The first six checks say each match is complete: it was not stopped, all 1,200 games were played, and at most one in
20 ended in an engine error or a timeout. The next four say each match played 150 deal blocks and the block reader
found every game. The next six say each arm's rollouts were random ones on the batch lines and search-v2's were not
(`search.rr.rollouts` above 0 on the arm's side, 0 on search-v2's), and every line's config A was the arm's. The next
three say the verdict script ran and agrees that both matches are complete. Then, per arm, fourteen: exactly one of
the six readings; D525's table in the runner's own language, row by row, each both ways (`shown` exactly when the
complete match's lower end is above 0.5 and its point at least +15 Elo; `inconclusive` exactly when it is not SHOWN
and its upper end is at least +15; `indistinguishable` exactly when its upper end is below +15, its Elo interval
contains 0 and its lower end is above -15; `noWeaker`, the job's case 2, exactly when its upper end is below +15 and
its lower end at or above 0; `losesBadly` exactly when its upper end is below -15; so `worseNotBadly` is the rest, by
the first check); `tooWide` only on a worse, not badly reading whose interval contains 0 with its lower end at or
below -15; and `candidate` and `diagnose` the readings' two groups. The last eleven are the night: a 4,800-game
confirmation is owed exactly when an arm is a candidate, the agent iterates exactly when an arm is to be diagnosed,
the principle's cheap path is in doubt exactly when an arm loses badly, this iteration loses badly exactly when both
arms do (D525 point 7), and the loop never stops (J199 was not an iteration that lost badly), the
self-play-from-random path never opens and the live seat never changes on this night. Any reading passes them; a
reading is not a failure. The time per decision, the rollouts, the guardrail counters, the changed answers, the
fallbacks and the worst-lost games are reported, not gated.

## Abort if
abort: j201_err >= 30 and j201_err > j201_games / 10

Engine trouble only: once 30 games of the two matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J201a.json
collect: var/ai-ladder/match-J201b.json
collect: var/j201/verdict.json
collect: var/j201/report.md
collect: var/j201/rollouts-a.json
collect: var/j201/rollouts-b.json
collect: var/j201/worst-a.json
collect: var/j201/worst-b.json

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J195, J198 and J199:
- **each arm's reading under D525's table** (matches (a) and (b), each on its own, read once by the first row that
  holds): SHOWN, INCONCLUSIVE, NOT SHOWN indistinguishable, NOT SHOWN worse not badly, or NOT SHOWN loses badly (and
  the job's three unreached cases by name if one occurred), with its score against search-v2 and its 95% interval,
  the same in Elo, and the pair and game counts; for a too-wide interval, say that it is "too wide to call" and read as
  worse, not badly, for the iteration;
- **what the night decides, in D525's words (D523's, copied):** for a candidate (`v.a.candidate`, `v.b.candidate`), that a 4,800-game
  confirmation of that arm is owed before anything (under D519's readings for SHOWN and INCONCLUSIVE, under the same
  three conditions for indistinguishable), and that only a confirmed SHOWN or indistinguishable arm takes Forge out
  of the loop and opens the self-play-from-random path (the higher point if both are confirmed, `random3` at a tie);
  for an arm to diagnose (`v.iterate`), that the agent iterates under D523's point 10 without asking the owner, and
  what the counters and the worst-lost games say it should rule out (which rules fire, how often a rollout, and the
  useless lines the worst games point at, each a candidate guardrail for random-v4, named as a failure seen, never a
  verdict on random rollouts as such); for an arm that loses badly (`v.principleInDoubt`), that the principle's cheap
  path, Forge out of the loop at no cost, is in doubt until a v4 recovers it. **The loop's count (D525 point 7):** the
  loop does not stop on this night (J199 was not an iteration that lost badly: its (b) read worse, not badly); when
  both arms lose badly (`v.iterationLosesBadly`), say that random-v3 is the first iteration that loses badly and the
  next one stops the loop if it does too. **The attributions:** (a) against J199 (a)'s -43.7 on the same deals
  (what R8 did), and (b) against (a) on this night ((b) - (a) is R9, with both matches' noise, about +-18.5 Elo from J199's own intervals, +-13.35 and +-12.75; the shared deals may lower it, unmeasured);
  J199 (b)'s -25.5 is the paused `-self` path's baseline, printed for reference. Then, plainly, whatever the reading, that the live seat is unchanged and any change to it is a separate
  decision (a seat-queue row, D509);
- **the compute each side spent:** ms per decision on both sides and their ratio, by kind; rollouts and rounds per
  searched decision and their ratio (D525's pilot: x1.24 (rrandom3) and x1.20 (rrandom3-held); J199: x1.15 and x1.08, 7.1 and 6.6 rounds against 6.0), play and copy ms a rollout, the short
  decisions, rollout errors and step caps, budget fallbacks with their interval and other fallbacks, against J195's
  search-v2 sides on the same deals (~905-978 ms a decision);
- **the guardrails:** every `search.rr.*` counter per random rollout and per game for each arm (report.md's table),
  beside J199's night, (a) / (b) per random rollout (R7 2.38 / 1.92, R3 0.57 / 0.31, R4 0.23 / 0.20, R5 0.050 /
  0.058, R6 0.055 / 0, R2 0.016 / 0, R1 0.012 / 0.011; failures 86 / 2) and D525's pilot (R8 0.011 and 0.016 a random rollout, R9 0.36 in rrandom3-held, goodBlockIllegal 0 and goodBlockDead 0.086 and 0.19 per attempt), with R3's listing caveat and the random-seat failures; how often R8
  gave a good block in each arm, and how often an R8 result was refused as illegal (`v3.goodBlockIllegal`) or rejected
  by R2 (`v3.goodBlockDead`) — a quiet R8 reading is believable only if these stay small — and R9 held a play in (b); which rules carry the load, and any that never fired;
- **the changed answers by kind:** each side's p/a/b decisions searched and changed in both matches, beside J199 (a)'s
  (overrides of Forge a decision: priority 0.396, attack 0.210, block 0.221, against search-v2's 0.192, 0.143,
  0.168): whether the attack overrides fell back toward search-v2's in both arms, which is what R8 was written to do,
  and whether (b)'s main-2 passes over Forge's play fell, which is what R9 was written to do;
- **the worst-lost games:** each arm's ten longest and ten quickest lost games (batch file and line, seed, decks, the
  arm's seat, turns, reason, its searched and changed decisions and its `search.rr.v2.*` and `v3.*` per random rollout), with
  the mean turns of lost against won games; say that the batch line has no life total and that the iteration replays
  the chosen seeds with full recording to read it;
- **the code:** the pilot's `sd.files` (D525's seven), and any file in `sd.tipDiff` or `sd.mainDiff`;
- **the run:** draws, errors and timeouts, each match's hours against the 2-2.5 h estimate, the deal blocks
  (expected 114,900,000-114,900,149 in both), the pressure events in STATUS (drops, raises, any stop and its retry,
  and which match they fell in), that it ran alone (D521), and whether the GPU queue or anything else outside the lab
  was running.

Never write "no effect", "no cost" or "equal" for an interval that includes 0.5; "NOT SHOWN, indistinguishable" is the
pre-registered reading for such an interval within the -15 bound, and a candidate is not a result until its 4,800
games confirm it. If (a) or (b) stopped early (`complete: false`), say so: that arm gets no reading, and what follows
is a decision about reposting it, not a reading.

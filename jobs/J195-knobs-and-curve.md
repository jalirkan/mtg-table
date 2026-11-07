id: J195
title: The knobs and the curve's lower half: four fixed 1,200-game matches (600 mirrored pairs each, D398, the confirm set, no stopping rule) in one night, each against search-v1-anytime (search-v2): (a) search-v2-routlets, D390's rollout=outlets under the anytime search, and (b) search-v2-ranked, D389's rank=prior,gen=24, the two built, never-matched knobs (the review's §5 row 6), each with a verdict; (c) search-v2-ms750-r6 and (d) search-v2-ms375-r3, search-v2 with the wall-clock budget and the round cap lowered together, x0.5 and x0.25, read beside J194's upper half, no verdict (D517)
public_title: Search knobs and the lower compute curve: four fixed matches
public_est: ~8-10 h (one night)
public_decides: Whether two search options add strength; what the live budget buys over less
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@ea313c01c3a11b4653fb332b0647a031988f3ac3 (the merge commit of D517's lane, pc/d517-knob-and-curve-arms, on main: the ladder players search-v2-routlets (search-v1-anytime's params plus rollout outlets), search-v2-ranked (plus rank prior and gen 24), search-v2-ms750-r6 (budgetMs 750 and maxRounds 6) and search-v2-ms375-r3 (budgetMs 375 and maxRounds 3), DecisionSelfTest's knobAndCurveArms and the registry test, and nothing else. Pinned so every game of the four matches is one code version, D341. Since J194's pin 72302c69 the only other changes under bridge/src, tools/ai-ladder, tools/ai-bench and config.json are D516's: config.json's forgeJar spelled with a leading ~/ and Config.java and tools/config.sh expanding it, no search code; so (c) and (d) play the search J194's (b) and (c) played, and the pilot reports the files changed under bridge/src/mtgtable/ai since J194's pin)
decides: two things, apart. THE KNOBS (matches a and b, the play-AI review of 2026-11-05, §5 row 6): each arm is SHOWN, NOT SHOWN or INCONCLUSIVE on its own match; both NOT SHOWN closes the knob track, unless (a) is NOT SHOWN, UNEXPOSED (its exposure under 3% of games, 36 of 1,200: the policy had no chance at all), which keeps the knob open until a rollout-level counter exists; an INCONCLUSIVE arm gets a 4,800-game confirmation against search-v2 before anything else is said about it; a SHOWN arm is a measured gain over search-v2 at 1,200 games, and folding it into the live seat is a separate decision with its own evidence, never this job's. THE CURVE (matches c and d): no verdict; how much strength the live 1.5 s buys over 0.75 s and 0.375 s, read beside J194's 3 s and 6 s, so the whole curve from x0.25 to x4 is on the same 600 deals. It never decides the live seat, which stays search-v2 at 1.5 s and 12 rounds (D514's point 3; the owner: "a production model needs to be fast but we can experiment for testing")
hypothesis: J194 found that more compute does not pay (COMPUTE DOES NOT PAY: search-v2-ms6000-r48 +1.7 Elo [-6.7, +10.2] at 3.14x search-v2's rollouts a decision, search-v2-ms3000-r24 -4.1 [-13.1, +5.0] at 1.73x), which D514 reads as pointing the work at the rollout policy. (a) is the one rollout-policy change already built: D390's outlet policy plays the searching seat inside the rollouts in front of Forge, at no measurable cost a rollout (+0.7%, D390), and acts only where the seat has a sacrifice outlet to use, a minority of decisions, so a large gain is not expected; whether it values sacrifice lines better has never been matched (D390's SPRT against search-v1-fixed3 left no ladder line on this host). (b) acts on the ~8% of decisions with more than six candidates (D389's smoke: 25 of 324) and spends up to 30% of their budget on the one-step prior; the review's §4 rates ordering "worth it only if compute pays", and J194 says compute did not, so NOT SHOWN or INCONCLUSIVE is the expectation and SHOWN would be a surprise. (c) and (d): above 1.5 s the curve was flat within about +-10 Elo (J194); at no search at all the seat is Forge, 87.5 Elo [72.1, 103.2] below search-v2 (J194's a). Where it bends is unmeasured: at 375 ms, with 2 rounds needed to overrule Forge and ~63 ms a rollout (the review's §3a), one round of six candidates costs about the whole budget, so (d) is expected to hand many decisions back to Forge (budget fallbacks, which the anytime loop's +9.3 came from deciding, J102) and to be clearly weaker; (a)'s exposure is expected to clear its 3% bar (36 of 1,200) about twice over, and no more: on J194's games, which are this night's 600 deals, search-v2's own seat, whose outer outlet policy is the routlets arm's byte for byte (`outlets: on` in both), recorded an `opportunity.*` key in 64 to 72 of each match's 1,200 games (5.3% to 6.0%: 72 against Forge, 65 and 71, 64 and 72 in the two arm matches); D517's four routlets pilot games recorded none, which at a 6% rate happens about 78% of the time; so a NOT SHOWN for (a) is expected to close its half of the knob track, for this deck set. (c) is the candidate for the two descriptive readings, "indistinguishable from search-v2" and "at most 10 Elo weaker". All of this is information, not a prediction any check reads
rule: written 2026-11-07 before any J195 game was played, word for word as D517 states it (its curve sentence replaced, before any game, a first wording whose "not measurably weaker" read an upper end above −10 Elo, which at this size holds for any point above about −18.5): "for (a) and (b): SHOWN if the arm's lower end is above 0.5 and its point is at least +15 Elo; NOT SHOWN if its upper end is below +15 Elo; otherwise INCONCLUSIVE, confirm with 4,800 games; both NOT SHOWN closes the knob track (the review's §5 row 6). For (c) and (d): no verdict; the curve's lower half, read beside J194's upper half: how much strength the live 1.5 s buys over 0.75 s and 0.375 s; two descriptive readings, "indistinguishable from search-v2" when the match is complete and its Elo interval contains 0, and "at most 10 Elo weaker" when the match is complete and its lower end is above −10 Elo, the bar a later, separate live-seat decision would cite; any change to the live seat is a separate decision, never this job's." Four fixed matches (D398, no stopping rule), each 1,200 games (150 batches of 8, 600 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 34 deck pairs never tuned on), in this order: (a) search-v2-routlets vs search-v1-anytime, var/ai-ladder/match-J195a.json; (b) search-v2-ranked vs search-v1-anytime, var/ai-ladder/match-J195b.json; (c) search-v2-ms750-r6 vs search-v1-anytime, var/ai-ladder/match-J195c.json; (d) search-v2-ms375-r3 vs search-v1-anytime, var/ai-ladder/match-J195d.json. Each matchup is new, so each takes this host's match blocks 114,900,000-114,900,149: the same 600 deals for all four, and the same deals as J194's three matches. In the quoted rule an arm's "lower end", "point" and "upper end" are its match line's 95% lower end on its score (lo), its Elo point estimate (elo) and its Elo upper end (eloHi), the arm being the match's first player. A match is COMPLETE when its line says complete: true, all 1,200 games were played and engine errors plus timeouts are at most 60 (one in 20). Each knob arm's verdict is its own match's alone, read only when that match is complete: SHOWN when lo > 0.5 and elo >= 15; NOT SHOWN when eloHi < 15 (the two cannot both hold, since elo >= 15 puts eloHi at 15 or above); otherwise INCONCLUSIVE, to be confirmed with 4,800 games. An incomplete match gives its arm no verdict. Added before any game, from the skeptic review of D517 (D517 amended to say the same), word for word: "A routlets NOT SHOWN closes its half of the knob track only if exposure is at least 3% of games (36 of 1,200, about half of J194's measured base rate of 5.3–6.0%); below that the reading is NOT SHOWN, UNEXPOSED and the knob stays open until a rollout-level counter exists." (A first wording with a 20% bar was replaced before any game, once J194's base rate showed no routlets match on this deck set could reach it; the bar's purpose is to catch "the policy had no chance at all", not to demand high exposure.) Exposure is the share of match (a)'s games played (1,200 when complete) in which the arm's seat, search-v2-routlets (config A of each batch line, as tools/ai-ladder/match.ts tallyBatch reads it), recorded at least one `opportunity.*` key above 0 in its batch counts (`aStats.counts`), read by var/j195-tools/rollouts.cjs from the batch run named in match (a)'s id; "at least 3%" is exposedGames x 100 >= 3 x games played (36 of 1,200), in integers. No counter sees the outlet policy acting inside the rollouts (SearchPolicy never harvests the rollout controller's counts), so the outer seat's opportunities stand in for how often the knob could matter. (a) NOT SHOWN with exposure under 3%, or with no exposure read for that match, is NOT SHOWN, UNEXPOSED (notShown 1, unexposed 1); exposure never changes SHOWN or INCONCLUSIVE and is reported beside them. The knob track is closed when (a) and (b) are both NOT SHOWN and (a) is not UNEXPOSED, and only then. At this deck set's exposure the knob can act in roughly one game in seventeen; a NOT SHOWN closes the track for this deck set, not for an outlet-heavy one. Information only, no rule: the ranked arm's touch rate, the share of its searched decisions that D389's ranking ran on (`search.prior.ranked`, which counts one a ranked decision, over the decisions searched), and the share of games in which it ran at least once. The curve arms carry no verdict: each is described by its score and Elo with the interval, by what the live 1.5 s buys over it (minus its Elo, interval [-eloHi, -eloLo]), and by two descriptive readings, each only when its match is complete: "indistinguishable from search-v2" when its Elo interval contains 0 (eloLo < 0 < eloHi), and "at most 10 Elo weaker" when its lower end is above -10 Elo (eloLo > -10), the bar a later, separate live-seat decision would cite. Reported beside, deciding nothing: each side's milliseconds per decision (p + a + b, and by kind), rollouts and rounds per searched decision, searched and changed decisions by kind, budget fallbacks with their interval and other fallbacks, and for (b) the decisions ranked and the prior's playouts, cuts and timeouts. An interval that includes 0.5 is never "no effect"
followup: morning-read
est: ~8.5 h at 7 workers (range 7.5-10 h; ~10 h at 6 workers beside the GPU queue), 13 h at worst. From J194's walls on 7 workers: its three matches took 1 h 16 min (search vs Forge), 3 h 57 min (the x4 arm) and 2 h 43 min (the x2 arm); against each match line's ms per decision and decisions a game, a game costs about 3.5-4 s a worker plus both sides' thinking, so a search-v2 mirror (2 x ~23 decisions x ~845 ms) is ~42.5 s a game, ~2.0 h for 1,200 games (J139's 545 games an hour gives 2.2 h). (a) ~2.0-2.2 h: D390 measured the outlet policy at +0.7% a rollout. (b) ~3.0-3.3 h, budgeted at ~1.5x a search-v2 game because rank=prior applies up to 24 candidates once each in a decision it ranks; that factor is a GUESS: the prior's share is inside the 1.5 s budget (30%, D389), and D389's 12-game smoke measured 1,217 ms a decision under the anytime search against search-v2's ~907, which would be ~1.2x (~2.5 h). (c) ~1.6 h and (d) ~1.4 h: their arms are guessed at ~470 ms and ~300 ms a decision (D514's arms bought 1.78x and 3.18x search-v2's time at x2 and x4 on J194, so halving is guessed at ~0.55x; at 375 ms the first round alone takes most of the budget), the search-v2 side unchanged. ~8.2 h of matches. Each match stops itself at --hours 3.25, 5, 2.5 and 2.25 (about 1.5x its estimate, (b)'s 1.6x for its guessed factor): 13 h in all, under the 15 h timeout, so a slow match cannot let the timeout cut a later one; a match that reaches its stop reports complete: false and, for (a) or (b), gives its arm no verdict. All four run under the ladder's default 300 s per-game timeout (J194 raised it to 900 s only for arms that lifted maxRounds; none does here). Pilot ~15 min (the build, the bench self-test, the ladder tests, 4 games of each arm on one worker; J194's pilot played its 4 games in under 2 minutes)
resumable: no
timeout: 15h
clean: var/j195 var/ai-ladder-pilot/J195 var/ai-ladder/match-J195a.json var/ai-ladder/match-J195b.json var/ai-ladder/match-J195c.json var/ai-ladder/match-J195d.json
progress: metric j195_games games of 4800
metrics: j195_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-routlets","search-v1-anytime"],["search-v2-ranked","search-v1-anytime"],["search-v2-ms750-r6","search-v1-anytime"],["search-v2-ms375-r3","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\"")))n++;console.log(n)'
metrics: j195_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const P=[["search-v2-routlets","search-v1-anytime"],["search-v2-ranked","search-v1-anytime"],["search-v2-ms750-r6","search-v1-anytime"],["search-v2-ms375-r3","search-v1-anytime"]];let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&P.some((p)=>l.includes("\"a\":\""+p[0]+"\"")&&l.includes("\"b\":\""+p[1]+"\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cma = sh: cat var/ai-ladder/match-J195a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmb = sh: cat var/ai-ladder/match-J195b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmc = sh: cat var/ai-ladder/match-J195c.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: cmd = sh: cat var/ai-ladder/match-J195d.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: roa = sh: cat var/j195/rollouts-a.json 2>/dev/null || echo '{"games":0}'
metrics: rob = sh: cat var/j195/rollouts-b.json 2>/dev/null || echo '{"games":0}'
metrics: roc = sh: cat var/j195/rollouts-c.json 2>/dev/null || echo '{"games":0}'
metrics: rod = sh: cat var/j195/rollouts-d.json 2>/dev/null || echo '{"games":0}'
metrics: v = sh: cat var/j195/verdict.json 2>/dev/null || echo '{"written":0,"knobTrackClosed":0,"a":{"complete":0,"shown":0,"notShown":0,"inconclusive":0,"unexposed":0,"exposure":{"exposedGames":0}},"b":{"complete":0,"shown":0,"notShown":0,"inconclusive":0},"c":{"complete":0,"indistinguishable":0,"atMost10Weaker":0},"d":{"complete":0,"indistinguishable":0,"atMost10Weaker":0}}'
headline: cma.played, cma.score, cma.lo, cma.hi, cma.elo, cma.aSearch.msPerDecision, cma.bSearch.msPerDecision, cmb.played, cmb.score, cmb.lo, cmb.hi, cmb.elo, cmb.aSearch.msPerDecision, cmb.bSearch.msPerDecision, cmc.played, cmc.score, cmc.lo, cmc.hi, cmc.elo, cmc.aSearch.msPerDecision, cmc.bSearch.msPerDecision, cmd.played, cmd.score, cmd.lo, cmd.hi, cmd.elo, cmd.aSearch.msPerDecision, cmd.bSearch.msPerDecision, roa.ratio, rob.ratio, rob.aRankedShare, rob.aTouchedShare, roc.ratio, rod.ratio, v.a.shown, v.a.notShown, v.a.inconclusive, v.a.unexposed, v.a.exposure.share, roa.aExposedGames, roa.aPolicyGames, v.b.shown, v.b.notShown, v.b.inconclusive, v.knobTrackClosed, v.c.indistinguishable, v.c.atMost10Weaker, v.d.indistinguishable, v.d.atMost10Weaker

**Why this job** (the play-AI review of 2026-11-05, §4 and §5 row 6; J194's reading). J194 answered the review's top
question: on the confirm set, search-v2 at 6 s and 48 rounds a decision is +1.7 Elo [-6.7, +10.2] over search-v2 at
1.5 s and 12, at 3.14x its rollouts a decision, so COMPUTE DOES NOT PAY, and at 3 s and 24 rounds -4.1 [-13.1, +5.0];
today's search-v2 is +87.5 [+72.1, +103.2] over Forge Default on the same 600 deals. Two things follow, and this night
does both. First, D514's DOES NOT PAY points at what a rollout plays, and the review's §5 row 6 lists the two search
knobs that were built in week 3 (D389, D390) and never matched: `rollout=outlets` changes the rollout policy, and
`rank=prior` changes which candidates the rollouts are spent on. Both were measured only under the fixed three-round
search (`search-v1-fixed3-routlets`, `search-v1-fixed3-ranked`); under the anytime search, which is what search-v2 is
(D412), neither has a ladder line. Second, J194 drew the curve's upper half only: whether the live 1.5 s is already on
the flat part, or whether 0.75 s or 0.375 s would cost strength, is the lower half, and it is what the live seat's
budget is buying. The owner asked for the knobs to be matched and for the curve's lower half beside them.

**What is built** (D517, mtg-table merge ea313c01c3a11b4653fb332b0647a031988f3ac3). Four ladder players in `tools/ai-ladder/players.json`, kind
`search`, search-v1-anytime's params (`profile: Default`, `outlets: on`, `budgetMs: 1500`, `anytime: on`) with one
change each:
- `search-v2-routlets` (`rollout: outlets`, D390), config hash `b704d57245a1`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=outlets`;
- `search-v2-ranked` (`rank: prior`, `gen: 24`, D389), config hash `bbbaad18882c`: the same with
  `…,anytime=1,rank=prior,gen=24`;
- `search-v2-ms750-r6` (`budgetMs` 750, `maxRounds` 6), config hash `ef6def992355`: search-v2's with `ms=750,…,maxrounds=6`;
- `search-v2-ms375-r3` (`budgetMs` 375, `maxRounds` 3), config hash `c2f054d190cf`: search-v2's with `ms=375,…,maxrounds=3`
  (3 still clears search-v2's 2 minimum rounds, which `SearchConfig`'s constructor demands);
- against `search-v1-anytime` (search-v2, the live seat's config, hash `cdd55e02a89c`):
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

The two downward arms scale the budget and the round cap together, as D514's upward ones do, for D514's reason: a
budget alone leaves the cap binding where the deadline was, so it would measure a different mix of endings, not less
of the same search. Every other knob (6 candidates, 2 rounds before an override, margin 20, the race from round 3 at z
2, the end-of-turn horizon, each rollout's step cap and step clock) stays search-v2's; `DecisionSelfTest.knobAndCurveArms`
holds that by reflection. Computed from `registry.ts`'s `configHash` on main f6a5a732 with exactly those params, the
four hashes would be `b704d57245a1` (routlets), `bbbaad18882c` (ranked), `ef6def992355` (ms750-r6) and `c2f054d190cf`
(ms375-r3), with search-v1-anytime's `cdd55e02a89c` and search-v2-ms3000-r24's `994bf685f6b9` reproduced by the same
computation; the pilot records the real ones (`var/j195-tools/players.json`) and checks the config strings, not the
hashes.

**Rollouts a decision are not on the match line.** As J194 found, its `aSearch`/`bSearch` carry `msPerDecision`,
`searched`, `byKind` and the fallbacks but no rollout count (`tallyLine` in `tools/ai-ladder/match.ts`). The counters
are in each batch's ai-bench lines: `aStats.counts["search.rollouts"]` and `search.rounds` beside
`search.<p|a|b>.considered`. `var/j195-tools/rollouts.cjs` is J194's reader with D389's four ranking counters added
(`search.prior.ranked`, `.playouts`, `.cut`, `.timedOut`); it sums them over a match's batch folder
(`<ladder dir>/batches/<run>/b*.jsonl`, the run from the match line's `id`) into rollouts and rounds per searched
decision per side, and checks its decision count against the match line's `searched`. The prior's playouts are
counted apart from `search.rollouts` (`SearchPolicy.rank`), so the ranked arm's rollouts a decision are its search's
alone and will read lower than search-v2's where it ranked. Run over J194's batches it reproduces J194's table:
52.15 against 16.62 (b) and 28.49 against 16.46 (c).

**Exposure: how often the outlet knob could act** (the skeptic review of D517). `rollout=outlets` changes what the
searching seat plays inside a rollout only where it has a sacrifice outlet to use, and no counter sees the policy act
there: `SearchPolicy` never harvests the rollout controller's counts. The outer seat's own `PolicyControllerAi` does
count, into each game's batch line: `opportunity.<why>` when it finds a sacrifice-outlet opportunity (`COMBAT`,
`FODDER`, `CAST_OUTLET`, `LETHAL`, `THREATENED`) and `policy.<why>` when it acts on one. A game in which the arm's seat
recorded any `opportunity.*` key is EXPOSED, and exposure is the share of (a)'s games that were. The rule (above) lets
a NOT SHOWN close (a)'s half of the knob track only at 3% exposure or more (36 of 1,200 games). The bar's basis is
J194: search-v2's seat runs the same outer policy, and on J194's games, which are this night's 600 deals, it recorded
an `opportunity.*` key in 72 of 1,200 games against Forge and in 65, 71, 64 and 72 of 1,200 on the two sides of its arm
matches (5.3% to 6.0%; every `opportunity.*` key there came with its `policy.*` twin). 3% is about half of that: it
catches "the policy had no chance at all" (a broken counter, a deck set with no outlets), not low exposure as such. In
D517's four routlets pilot games neither seat recorded one, which at a 6% rate happens about 78% of the time. So (a)'s
NOT SHOWN is expected to close its half of the track. At this deck set's exposure the knob can act in roughly one game in seventeen; a NOT SHOWN closes the track for this deck set, not for an outlet-heavy one. The ranked arm gets the same kind of number, as information
only: its touch rate, the share of its searched decisions D389's ranking ran on, and the share of games it ran in.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600
pairs, in the real ladder folder `var/ai-ladder` on this host (base 114,000,000), in this order:
1. **(a) the outlet rollouts**, `search-v2-routlets` vs `search-v1-anytime`, `--out var/ai-ladder/match-J195a.json`.
   Verdict: SHOWN, NOT SHOWN or INCONCLUSIVE.
2. **(b) the ranked candidates**, `search-v2-ranked` vs `search-v1-anytime`, `--out var/ai-ladder/match-J195b.json`.
   Verdict: SHOWN, NOT SHOWN or INCONCLUSIVE.
3. **(c) half the compute**, `search-v2-ms750-r6` vs `search-v1-anytime`, `--out var/ai-ladder/match-J195c.json`. No
   verdict.
4. **(d) a quarter of the compute**, `search-v2-ms375-r3` vs `search-v1-anytime`, `--out var/ai-ladder/match-J195d.json`.
   No verdict.

All four matchups are new on this host, so each takes blocks 114,900,000-114,900,149 (the host's match base, 114,000,000
+ 900,000, then the matchup's next unused block: D398 point 2, `nextBseed`; the pilot plays in its own folder and
leaves the real one's blocks untouched). So all four play the same 600 deals, and the same deals as J194's three
matches: (c) and (d) read beside J194's (b) and (c) on identical deals, the whole curve from x0.25 to x4 on one set. A
match retried after a memory stop takes the next unused blocks for the games it plays again, so its deals then differ
in part. J194's search-vs-search matches came out narrower than planned, about +-8.4 to +-9.0 Elo at 1,200 games (not
the +-13-15 J194 sized for). Under that width, as approximations: a knob arm whose true effect is +25 Elo is SHOWN
with about 99% probability, a true +15 about 50%; a true 0 is NOT SHOWN with about 93% (it needs a point below about
+6.5), a true +5 about 63%, a true +10 about 21%. For the curve arms, under the same width: "indistinguishable from
search-v2" (the interval contains 0) holds for a point within about +-8.5 Elo: a true 0 reads so with about 95%
probability, a true -5 about 79%, a true -10 about 37%. "At most 10 Elo weaker" (lower end above -10) needs a point
above about -1.5: a true +5 reads so with about 93% probability, a true 0 about 64%, a true -5 about 21%, a true -10
about 2.5%. So at 1,200 games that reading can be earned only by an arm about as strong as search-v2, and such an arm
misses it about a third of the time; a later live-seat decision that cites the bar may need more games than this.

**Why one night and no tuning.** Each arm changes one thing, and the change is the hypothesis itself; the deals and
decks are the held-out confirm set. Nothing is selected, so each score is read as it is. A 4,800-game confirmation of a
knob is a later job, posted only on its INCONCLUSIVE.

**When it runs.** No `after:`. `cores: 7` takes the whole width for every match, so no other heavy job runs beside it
and both players see the same CPU; that matters most for (c) and (d), whose difference from search-v2 is bought in wall
clock time. It is expected to run beside the art session's GPU painting queue, which is CPU-light but not memory-free:
J193 ran beside it sized at 6 workers and logged 8 memory-pressure events, and J194 logged 2 (one drop to 6 workers and
its raise, 6 minutes apart). The runner's memory rule handles that without the job: every 10 s it reads the host's
memory pressure, and at `some avg10` 10% or more, swap-in at 2,000 pages a second or the unit at 95% of its
`MemoryMax` (two samples running) it drops one worker as that worker's game ends, raising again when the pressure
clears; only at 40% (three samples) does it stop the job, which then waits 15 minutes, retries with one worker fewer
from the `## Commands` block that was running (the pilot and finished blocks are skipped), and fails on the third
such stop. A dropped worker slows a match; it changes no deal and no side's budget, and the deals are mirrored, so the
GPU queue, a light job or Justin at the table falls on both sides alike. A pressure episode is noise on the wall-clock
arms' deadline share, which is the PC's under the night's load (D514's residual, D388). Each match's own `--hours` stop
(3.25, 5, 2.5 and 2.25 h) is about 1.5 times its expected time at 7 workers, and the four add up to 13 h, under the
15 h timeout.

## Pilot
About 15 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the five players, and each arm's seat config is search-v1-anytime's with exactly its
  one change (`,rollout=outlets` or `,rank=prior,gen=24` appended; `ms=` and `maxrounds=` replaced for the curve arms);
- the files changed under `bridge/src/mtgtable/ai` since J194's pin, reported (expected: `DecisionSelfTest.java` only);
- the verdict script written and tested on synthetic match files;
- 4 games of each arm against `search-v1-anytime`, one worker, in the pilot's own folder (the same deal for all four):
  both sides search, the reader agrees with each match line, and the curve arms' rounds stay under their caps.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j195-merged.txt || echo 0 > var/j195-merged.txt
cat var/j195-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the five players resolve, and each arm is search-v2 with exactly its one change (D517)
mkdir -p var/j195-tools
./tools/ai-ladder.sh list > var/j195-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-routlets|search-v2-ranked|search-v2-ms750-r6|search-v2-ms375-r3) ' var/j195-tools/players.txt
node - <<'J195EOF'
// J195's pilot: the five players resolve, and each new one is search-v1-anytime (search-v2) with only its one change.
const fs = require('fs');
const L = fs.readFileSync('var/j195-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), ro = get('search-v2-routlets'), rk = get('search-v2-ranked'), m7 = get('search-v2-ms750-r6'), m3 = get('search-v2-ms375-r3');
const base = v1 && v1.cfg && v1.kind === 'search' && v1.cfg.endsWith(',anytime=1') && /:ms=1500,/.test(v1.cfg) && v1.cfg.includes(',maxrounds=12,');
const is = (p, want) => (base && p && p.cfg && p.kind === 'search' && p.cfg === want ? 1 : 0);
const scaled = (ms, mr) => (base ? v1.cfg.replace(':ms=1500,', `:ms=${ms},`).replace(',maxrounds=12,', `,maxrounds=${mr},`) : null);
const r = {
  present: [v1, ro, rk, m7, m3].every((p) => p && p.cfg) ? 1 : 0,
  v1_hash_ok: v1 && v1.hash === 'cdd55e02a89c' ? 1 : 0,
  routlets_only_rollout: is(ro, base ? v1.cfg + ',rollout=outlets' : null),
  ranked_only_rank: is(rk, base ? v1.cfg + ',rank=prior,gen=24' : null),
  ms750_only_ms_and_cap: is(m7, scaled(750, 6)),
  ms375_only_ms_and_cap: is(m3, scaled(375, 3)),
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-routlets': ro?.hash ?? null, 'search-v2-ranked': rk?.hash ?? null, 'search-v2-ms750-r6': m7?.hash ?? null, 'search-v2-ms375-r3': m3?.hash ?? null },
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-routlets': ro?.cfg ?? null, 'search-v2-ranked': rk?.cfg ?? null, 'search-v2-ms750-r6': m7?.cfg ?? null, 'search-v2-ms375-r3': m3?.cfg ?? null },
};
r.ok = r.present && r.v1_hash_ok && r.routlets_only_rollout && r.ranked_only_rank && r.ms750_only_ms_and_cap && r.ms375_only_ms_and_cap ? 1 : 0;
fs.writeFileSync('var/j195-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J195EOF
# reported, not checked: the search code since J194's pin (expected: DecisionSelfTest.java alone, D517's test)
git diff --name-only 72302c695999f9dbbd5a886d173e31fb5ca4b921 HEAD -- bridge/src/mtgtable/ai > var/j195-tools/search-diff.txt || true
node -e 'const fs=require("fs");const f=fs.readFileSync("var/j195-tools/search-diff.txt","utf8").split("\n").filter(Boolean);const r={files:f,other:f.filter((x)=>!x.endsWith("/DecisionSelfTest.java")).length};fs.writeFileSync("var/j195-tools/search-diff.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
```
```bash
cat > var/j195-tools/verdict.mjs <<'J195EOF'
// J195's reading, pre-registered 2026-11-07 before any J195 game (the job's rule: line; D517; the play-AI review of
// 2026-11-05, §5 row 6, and J194's upper half of the curve).
// usage: node verdict.mjs <match-a.json> <match-b.json> <match-c.json> <match-d.json> <rollouts-a.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// COMPLETE (each match): the match line names the planned players, says complete: true, all 1,200 games were played,
//   errors + timeouts <= 60 (one in 20, J131's bar).
// The two knob arms, (a) search-v2-routlets and (b) search-v2-ranked, each against search-v1-anytime (search-v2), each
// read on its own and only when its own match is complete:
//   SHOWN         its 95% lower end above 0.5 and its point estimate at least +15 Elo (lo > 0.5 and elo >= 15);
//   NOT SHOWN     its upper end below +15 Elo (eloHi < 15); (SHOWN needs elo >= 15 <= eloHi, so the two never meet)
//   INCONCLUSIVE  otherwise: confirm with 4,800 games.
//   EXPOSURE, (a) only (the skeptic review of D517): the share of match (a)'s games in which the arm's seat (config A,
//   search-v2-routlets) recorded at least one `opportunity.*` key in its batch counts, read by rollouts.cjs
//   (aExposedGames, from the batch run named in match (a)'s id) over the games played.
//   "A routlets NOT SHOWN closes its half of the knob track only if exposure is at least 3% of games (36 of 1,200,
//   about half of J194's measured base rate of 5.3–6.0%); below that the reading is NOT SHOWN, UNEXPOSED and the knob
//   stays open until a rollout-level counter exists."
//   So (a) NOT SHOWN with exposedGames x 100 < 3 x played, 36 of 1,200, (or with no
//   exposure read for this match) is NOT SHOWN, UNEXPOSED: notShown 1 and unexposed 1. Exposure never changes SHOWN or
//   INCONCLUSIVE; it is reported beside them.
//   The knob track is closed (the review's §5 row 6) when both are NOT SHOWN and (a) is not UNEXPOSED: knobTrackClosed = 1.
// The two curve arms, (c) search-v2-ms750-r6 and (d) search-v2-ms375-r3: no verdict. Each is described: its score
//   and Elo with the interval, what the live 1.5 s buys over it (-elo, interval [-eloHi, -eloLo]), and two descriptive
//   readings, each only when its match is complete: "indistinguishable from search-v2" when its Elo interval contains 0
//   (eloLo < 0 < eloHi), and "at most 10 Elo weaker" when its lower end is above -10 Elo (eloLo > -10), the bar a
//   later, separate live-seat decision would cite.
// The job's check: lines restate the same rule in the runner's language.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 1200;
export const BAR = GAMES / 20;
export const MATCHES = {
  a: ['search-v2-routlets', 'search-v1-anytime'],
  b: ['search-v2-ranked', 'search-v1-anytime'],
  c: ['search-v2-ms750-r6', 'search-v1-anytime'],
  d: ['search-v2-ms375-r3', 'search-v1-anytime'],
};

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const neg = (x) => (x === null ? null : Math.round(-x * 10) / 10 + 0);

export function side(which, m) {
  const [A, B] = MATCHES[which];
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const complete = names === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR ? 1 : 0;
  return {
    match: m === null ? 0 : 1, names, complete, a: A, b: B, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
  };
}

function knob(which, m, ro = null) {
  const s = side(which, m);
  const ok = s.complete === 1;
  const shown = ok && s.lo !== null && s.elo !== null && s.lo > 0.5 && s.elo >= 15 ? 1 : 0;
  const notShown = ok && shown === 0 && s.eloHi !== null && s.eloHi < 15 ? 1 : 0;
  const inconclusive = ok && shown === 0 && notShown === 0 ? 1 : 0;
  const reading = !ok ? (s.match === 0 ? `NO MATCH (${which}): no verdict` : s.names === 0 ? `NOT THIS MATCH (${which}): no verdict` : `INCOMPLETE (${which}): no verdict`)
    : shown ? `SHOWN: ${s.a}'s lower end ${s.lo} is above 0.5 and its point ${s.elo} Elo is at least +15`
    : notShown ? `NOT SHOWN: ${s.a}'s upper end ${s.eloHi} Elo is below +15`
    : `INCONCLUSIVE: ${s.a}'s lower end ${s.lo}, point ${s.elo} Elo, upper end ${s.eloHi} Elo; confirm with 4,800 games`;
  if (which !== 'a') return { ...s, shown, notShown, inconclusive, reading };
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && run !== null && ro.run === run && typeof ro.aExposedGames === 'number';
  const exposure = { exposedGames: sameRun ? ro.aExposedGames : null, games: s.played, linesRead: sameRun ? ro.games ?? null : null,
    share: sameRun && s.played > 0 ? Math.round((ro.aExposedGames / s.played) * 10000) / 10000 : null,
    policyGames: sameRun ? ro.aPolicyGames ?? null : null };
  const unexposed = notShown === 1 && !(sameRun && ro.aExposedGames * 100 >= 3 * s.played) ? 1 : 0;
  const shown_ = exposure.share === null ? 'no exposure read for this match' : `exposure ${exposure.exposedGames} of ${exposure.games} games (${(exposure.share * 100).toFixed(1)}%)`;
  return { ...s, shown, notShown, inconclusive, unexposed, exposure,
    reading: notShown && unexposed ? `NOT SHOWN, UNEXPOSED: ${s.a}'s upper end ${s.eloHi} Elo is below +15, but ${shown_} is under 3%: the knob stays open until a rollout-level counter exists`
      : `${reading}; ${shown_}` };
}

function curve(which, m) {
  const s = side(which, m);
  const ok = s.complete === 1;
  const indistinguishable = ok && s.eloLo !== null && s.eloHi !== null && s.eloLo < 0 && s.eloHi > 0 ? 1 : 0;
  const atMost10Weaker = ok && s.eloLo !== null && s.eloLo > -10 ? 1 : 0;
  const buys = ok ? { elo: neg(s.elo), lo: neg(s.eloHi), hi: neg(s.eloLo) } : { elo: null, lo: null, hi: null };
  const reading = !ok ? (s.match === 0 ? `NO MATCH (${which}): not described` : s.names === 0 ? `NOT THIS MATCH (${which}): not described` : `INCOMPLETE (${which}): what was played, as incomplete`)
    : `${s.a}: ${s.elo} Elo [${s.eloLo}, ${s.eloHi}] against search-v2; the live 1.5 s buys ${buys.elo} Elo [${buys.lo}, ${buys.hi}] over it${indistinguishable ? '; indistinguishable from search-v2 (its Elo interval contains 0)' : ''}${atMost10Weaker ? '; at most 10 Elo weaker (its lower end is above -10 Elo)' : ''}`;
  return { ...s, indistinguishable, atMost10Weaker, buys, reading };
}

export function verdict(ma, mb, mc, md, roa = null) {
  const a = knob('a', ma, roa), b = knob('b', mb), c = curve('c', mc), d = curve('d', md);
  const knobTrackClosed = a.notShown === 1 && a.unexposed === 0 && b.notShown === 1 ? 1 : 0;
  return {
    written: 1, games: GAMES, bar: BAR, knobTrackClosed,
    reading: [a.reading, b.reading, knobTrackClosed ? 'both NOT SHOWN, (a) exposed: the knob track is closed (the review\'s §5 row 6)' : 'the knob track stays open', c.reading, d.reading],
    a, b, c, d,
  };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (which, o = {}) => {
    const [A, B] = MATCHES[which];
    return { id: `host:run-${which}`, a: A, b: B, complete: true, played: GAMES, errors: 0, timeouts: 0, score: 0.5, lo: 0.488, hi: 0.512, elo: 0, eloLo: -8.3, eloHi: 8.3,
      aSearch: { msPerDecision: 850 }, bSearch: { msPerDecision: 850 }, ...o };
  };
  const GAIN = { score: 0.53, lo: 0.518, hi: 0.542, elo: 20.9, eloLo: 12.5, eloHi: 29.3 };
  const FLAT = {};
  const C = mk('c', { score: 0.48, lo: 0.468, hi: 0.492, elo: -13.9, eloLo: -22.3, eloHi: -5.6 });
  const D = mk('d', { score: 0.42, lo: 0.408, hi: 0.432, elo: -56.1, eloLo: -64.9, eloHi: -47.5 });
  const RO = (n, o = {}) => ({ run: 'run-a', games: GAMES, aExposedGames: n, aPolicyGames: 0, ...o });
  const all = (a, b, c = C, d = D, ro = RO(600)) => [a, b, c, d, ro];
  const cases = [
    ['a clear gain in (a) is SHOWN, (b) flat is NOT SHOWN', all(mk('a', GAIN), mk('b', FLAT)), (r) => r.a.shown === 1 && r.a.notShown + r.a.inconclusive === 0 && r.b.notShown === 1 && r.knobTrackClosed === 0],
    ['a point of exactly +15 with the lower end above 0.5 is SHOWN', all(mk('a', { lo: 0.505, elo: 15, eloLo: 3.5, eloHi: 26.6 }), mk('b')), (r) => r.a.shown === 1],
    ['a lower end above 0.5 but a point of +14.9 is INCONCLUSIVE', all(mk('a', { lo: 0.505, elo: 14.9, eloLo: 3.5, eloHi: 26.4 }), mk('b')), (r) => r.a.shown === 0 && r.a.notShown === 0 && r.a.inconclusive === 1],
    ['a lower end of exactly 0.5 is not SHOWN', all(mk('a', { lo: 0.5, elo: 18, eloLo: 0, eloHi: 36 }), mk('b')), (r) => r.a.shown === 0 && r.a.inconclusive === 1],
    ['an upper end of +14.9 Elo is NOT SHOWN', all(mk('a'), mk('b', { score: 0.509, lo: 0.497, hi: 0.5214, elo: 6.3, eloLo: -2.1, eloHi: 14.9 })), (r) => r.b.notShown === 1 && r.b.shown + r.b.inconclusive === 0],
    ['an upper end of exactly +15 Elo is INCONCLUSIVE', all(mk('a'), mk('b', { score: 0.509, lo: 0.497, hi: 0.5216, elo: 6.3, eloLo: -2.1, eloHi: 15 })), (r) => r.b.inconclusive === 1 && r.b.notShown === 0],
    ['a loss is NOT SHOWN', all(mk('a', { score: 0.47, lo: 0.458, hi: 0.482, elo: -20.9, eloLo: -29.3, eloHi: -12.5 }), mk('b')), (r) => r.a.notShown === 1],
    ['both NOT SHOWN closes the knob track', all(mk('a'), mk('b')), (r) => r.a.notShown === 1 && r.b.notShown === 1 && r.knobTrackClosed === 1],
    ['exactly 3% exposure (36 of 1,200) is exposed: both NOT SHOWN close the track', all(mk('a'), mk('b'), C, D, RO(36)), (r) => r.a.notShown === 1 && r.a.unexposed === 0 && r.a.exposure.share === 0.03 && r.knobTrackClosed === 1],
    ['35 of 1,200 is NOT SHOWN, UNEXPOSED: the track stays open', all(mk('a'), mk('b'), C, D, RO(35)), (r) => r.a.notShown === 1 && r.a.unexposed === 1 && r.b.notShown === 1 && r.knobTrackClosed === 0],
    ['no exposure at all (D517\'s four pilot games) is UNEXPOSED', all(mk('a'), mk('b'), C, D, RO(0)), (r) => r.a.unexposed === 1 && r.a.exposure.share === 0 && r.knobTrackClosed === 0],
    ['a reader file from another run gives no exposure: UNEXPOSED', all(mk('a'), mk('b'), C, D, RO(900, { run: 'run-x' })), (r) => r.a.unexposed === 1 && r.a.exposure.share === null && r.knobTrackClosed === 0],
    ['no reader file: UNEXPOSED', all(mk('a'), mk('b'), C, D, null), (r) => r.a.notShown === 1 && r.a.unexposed === 1 && r.knobTrackClosed === 0],
    ['a SHOWN arm with 1% exposure is SHOWN, not UNEXPOSED', all(mk('a', GAIN), mk('b'), C, D, RO(12)), (r) => r.a.shown === 1 && r.a.unexposed === 0 && r.a.exposure.share === 0.01],
    ['an INCONCLUSIVE arm with 1% exposure stays INCONCLUSIVE', all(mk('a', { lo: 0.497, elo: 9, eloLo: -2, eloHi: 20 }), mk('b'), C, D, RO(12)), (r) => r.a.inconclusive === 1 && r.a.notShown === 0 && r.a.unexposed === 0],
    ['NOT SHOWN and INCONCLUSIVE leave the track open', all(mk('a'), mk('b', { lo: 0.497, elo: 9, eloLo: -2, eloHi: 20 })), (r) => r.a.notShown === 1 && r.b.inconclusive === 1 && r.knobTrackClosed === 0],
    ['NOT SHOWN and an incomplete match leave the track open', all(mk('a'), { ...mk('b'), complete: false, played: 800 }), (r) => r.a.notShown === 1 && r.b.complete === 0 && r.b.notShown === 0 && r.knobTrackClosed === 0],
    ['a stopped (a) gives (a) no verdict and leaves (b) alone', all({ ...mk('a', GAIN), complete: false, played: 800 }, mk('b', GAIN)), (r) => r.a.complete === 0 && r.a.shown + r.a.notShown + r.a.inconclusive === 0 && r.b.shown === 1],
    ['1,199 games of (a) is not complete', all({ ...mk('a', GAIN), played: 1199 }, mk('b')), (r) => r.a.complete === 0 && r.a.shown === 0],
    ['61 errors and timeouts in (b) is not complete', all(mk('a'), mk('b', { ...GAIN, errors: 40, timeouts: 21 })), (r) => r.b.complete === 0 && r.b.shown === 0],
    ['60 errors and timeouts in (b) is complete', all(mk('a'), mk('b', { ...GAIN, errors: 40, timeouts: 20 })), (r) => r.b.complete === 1 && r.b.shown === 1],
    ['(b) in (a)\'s file is not (a)', all({ ...mk('a', GAIN), a: 'search-v2-ranked' }, mk('b')), (r) => r.a.names === 0 && r.a.shown + r.a.notShown + r.a.inconclusive === 0],
    ['D390\'s fixed-rollout player search-v1-fixed3-routlets is not (a)', all({ ...mk('a', GAIN), a: 'search-v1-fixed3-routlets' }, mk('b')), (r) => r.a.names === 0 && r.a.shown === 0],
    ['no (b) file gives (b) no verdict', all(mk('a'), null), (r) => r.b.match === 0 && r.b.shown + r.b.notShown + r.b.inconclusive === 0 && r.knobTrackClosed === 0],
    ['(c) at -13.9 [-22.3, -5.6] carries neither reading; the live seat buys +13.9 [+5.6, +22.3]', all(mk('a'), mk('b')), (r) => r.c.indistinguishable === 0 && r.c.atMost10Weaker === 0 && r.c.buys.elo === 13.9 && r.c.buys.lo === 5.6 && r.c.buys.hi === 22.3],
    ['(d) at -56.1 [-64.9, -47.5] carries neither reading', all(mk('a'), mk('b')), (r) => r.d.indistinguishable === 0 && r.d.atMost10Weaker === 0 && r.d.buys.elo === 56.1],
    ['an interval containing 0 with its lower end above -10 is both', all(mk('a'), mk('b'), mk('c', { elo: -1, eloLo: -9.5, eloHi: 7.4 })), (r) => r.c.indistinguishable === 1 && r.c.atMost10Weaker === 1],
    ['an interval containing 0 with its lower end at -12 is indistinguishable, not at most 10 weaker', all(mk('a'), mk('b'), mk('c', { elo: -3.5, eloLo: -12, eloHi: 5 })), (r) => r.c.indistinguishable === 1 && r.c.atMost10Weaker === 0],
    ['a lower end of -9.9 Elo is at most 10 weaker', all(mk('a'), mk('b'), mk('c', { elo: -1.5, eloLo: -9.9, eloHi: 6.9 })), (r) => r.c.atMost10Weaker === 1],
    ['a lower end of exactly -10 Elo is not at most 10 weaker', all(mk('a'), mk('b'), mk('c', { elo: -1.6, eloLo: -10, eloHi: 6.8 })), (r) => r.c.atMost10Weaker === 0 && r.c.indistinguishable === 1],
    ['an upper end of exactly 0 is not indistinguishable', all(mk('a'), mk('b'), mk('c', { elo: -8.3, eloLo: -16.7, eloHi: 0 })), (r) => r.c.indistinguishable === 0 && r.c.atMost10Weaker === 0],
    ['a lower end of exactly 0 is not indistinguishable but is at most 10 weaker', all(mk('a'), mk('b'), mk('c', { elo: 8.4, eloLo: 0, eloHi: 16.8 })), (r) => r.c.indistinguishable === 0 && r.c.atMost10Weaker === 1],
    ['an incomplete (d) carries neither reading', all(mk('a'), mk('b'), C, { ...mk('d', { elo: -1, eloLo: -9.5, eloHi: 7.4 }), played: 1100 }), (r) => r.d.complete === 0 && r.d.indistinguishable === 0 && r.d.atMost10Weaker === 0 && r.d.buys.elo === null],
    ['the curve arms carry no verdict and change no knob verdict', all(mk('a', GAIN), mk('b'), null, null), (r) => r.a.shown === 1 && r.b.notShown === 1 && r.c.match === 0 && r.d.match === 0 && r.c.shown === undefined && r.d.notShown === undefined],
  ];
  let ok = 0;
  cases.forEach(([what, ms, pred], i) => {
    const fs4 = ['a', 'b', 'c', 'd', 'ro'].map((w, j) => {
      const f = path.join(scratch, `case-${i}-${w}.json`);
      if (ms[j] !== null) fs.writeFileSync(f, JSON.stringify(ms[j]));
      return f;
    });
    const r = verdict(...fs4.map(read));
    const pass = pred(r);
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
} else if (argv.length === 6) {
  const r = verdict(read(argv[0]), read(argv[1]), read(argv[2]), read(argv[3]), read(argv[4]));
  fs.mkdirSync(path.dirname(argv[5]), { recursive: true });
  fs.writeFileSync(argv[5], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match-a.json> <match-b.json> <match-c.json> <match-d.json> <rollouts-a.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J195EOF
cat > var/j195-tools/rollouts.cjs <<'J195EOF'
// J195: rollouts per searched decision (p + a + b) for each side of one match. The match line has no rollouts
// field, so this reads the counters J194's reader read (D514's pilot): each batch line's aStats/bStats
// `search.rollouts`, `search.rounds` and `search.<p|a|b>.considered` (config A is the match's first player, as
// tools/ai-ladder/match.ts tallyBatch reads it), and, for D389's ranking, `search.prior.ranked` (decisions ranked),
// `search.prior.playouts` (candidates applied once), `search.prior.cut` and `search.prior.timedOut`. The prior's
// playouts are counted apart from `search.rollouts` (SearchPolicy.rank), so a ranked side's rollouts are its
// search's alone.
// Per game (one batch line is one game), for D517's exposure reading: a side's game is EXPOSED when its counts hold
// at least one `opportunity.*` key above 0 (the outer seat's PolicyControllerAi saw a sacrifice-outlet opportunity; no
// counter sees the policy inside the rollouts), POLICY when they hold a `policy.*` key above 0, and TOUCHED when
// `search.prior.ranked` is above 0 (D389's ranking ran at least once).
// usage: node rollouts.cjs <ladder dir> <match.json> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const run = m && typeof m.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : '';
const bdir = `${dir}/batches/${run}`;
const side = () => ({ rollouts: 0, rounds: 0, decisions: 0, ranked: 0, priorPlayouts: 0, priorCut: 0, priorTimedOut: 0, exposed: 0, policy: 0, touched: 0, lines: 0 });
const t = { a: side(), b: side() };
for (const f of run && fs.existsSync(bdir) ? fs.readdirSync(bdir).filter((x) => /^b\d+\.jsonl$/.test(x)) : []) {
  for (const line of fs.readFileSync(`${bdir}/${f}`, 'utf8').split('\n')) {
    let l; try { l = JSON.parse(line); } catch { continue; }
    for (const [k, st] of [['a', l.aStats], ['b', l.bStats]]) {
      const c = (st && st.counts) || {};
      const n = (x) => (typeof c[x] === 'number' ? c[x] : 0);
      t[k].rollouts += n('search.rollouts'); t[k].rounds += n('search.rounds');
      t[k].decisions += n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
      t[k].ranked += n('search.prior.ranked'); t[k].priorPlayouts += n('search.prior.playouts');
      t[k].priorCut += n('search.prior.cut'); t[k].priorTimedOut += n('search.prior.timedOut'); t[k].lines++;
      const keys = Object.keys(c).filter((x) => n(x) > 0);
      if (keys.some((x) => x.startsWith('opportunity.'))) t[k].exposed++;
      if (keys.some((x) => x.startsWith('policy.'))) t[k].policy++;
      if (n('search.prior.ranked') > 0) t[k].touched++;
    }
  }
}
const per = (s, x) => (s.decisions > 0 ? Math.round((s[x] / s.decisions) * 100) / 100 : null);
const r = { run, a: m?.a ?? null, b: m?.b ?? null, aRolloutsPerDecision: per(t.a, 'rollouts'), bRolloutsPerDecision: per(t.b, 'rollouts'),
  aRoundsPerDecision: per(t.a, 'rounds'), bRoundsPerDecision: per(t.b, 'rounds'), aDecisions: t.a.decisions, bDecisions: t.b.decisions,
  aRanked: t.a.ranked, bRanked: t.b.ranked, aPriorPlayouts: t.a.priorPlayouts, aPriorCut: t.a.priorCut, aPriorTimedOut: t.a.priorTimedOut,
  aRankedShare: t.a.decisions > 0 ? Math.round((t.a.ranked / t.a.decisions) * 10000) / 10000 : null,
  aExposedGames: t.a.exposed, bExposedGames: t.b.exposed, aPolicyGames: t.a.policy, bPolicyGames: t.b.policy, aTouchedGames: t.a.touched, games: t.a.lines };
const share = (x) => (r.games > 0 ? Math.round((x / r.games) * 10000) / 10000 : null);
r.aExposure = share(r.aExposedGames); r.bExposure = share(r.bExposedGames); r.aTouchedShare = share(r.aTouchedGames);
r.ratio = r.aRolloutsPerDecision !== null && r.bRolloutsPerDecision ? Math.round((r.aRolloutsPerDecision / r.bRolloutsPerDecision) * 1000) / 1000 : null;
fs.writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J195EOF
rm -rf var/j195-tools/selftest
node var/j195-tools/verdict.mjs --selftest var/j195-tools/selftest > var/j195-tools/selftest.json
cat var/j195-tools/selftest.json
```
```bash
# 4 games of each match (one batch of one deck pair, one worker each, one after another), in the pilot's own ladder
# folder and seed range (the same deal for all four), then each side's rollouts and rounds per searched decision from
# the batch's counters (the match line has none)
for x in a:search-v2-routlets b:search-v2-ranked c:search-v2-ms750-r6 d:search-v2-ms375-r3; do
  k=${x%%:*}; p=${x#*:}
  ./tools/ai-ladder.sh match "$p" search-v1-anytime --games 4 --batch-pairs 1 --host j195-pilot --purpose pilot --dir var/ai-ladder-pilot/J195 --experiments var/ai-ladder-pilot/J195/experiments.jsonl --out var/ai-ladder-pilot/J195/match-$k.json --jobs 1
  node var/j195-tools/rollouts.cjs var/ai-ladder-pilot/J195 var/ai-ladder-pilot/J195/match-$k.json var/j195-tools/rollouts-pilot-$k.json
done
```
metrics: merged = sh: cat var/j195-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j195-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j195-tools/search-diff.json 2>/dev/null || echo '{"other":-1}'
metrics: st = sh: cat var/j195-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: pma = sh: cat var/ai-ladder-pilot/J195/match-a.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmb = sh: cat var/ai-ladder-pilot/J195/match-b.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmc = sh: cat var/ai-ladder-pilot/J195/match-c.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pmd = sh: cat var/ai-ladder-pilot/J195/match-d.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pra = sh: cat var/j195-tools/rollouts-pilot-a.json 2>/dev/null || echo '{"games":0}'
metrics: prb = sh: cat var/j195-tools/rollouts-pilot-b.json 2>/dev/null || echo '{"games":0}'
metrics: prc = sh: cat var/j195-tools/rollouts-pilot-c.json 2>/dev/null || echo '{"games":0}'
metrics: prd = sh: cat var/j195-tools/rollouts-pilot-d.json 2>/dev/null || echo '{"games":0}'
check: merged == 1
check: pl.ok == 1
check: pl.routlets_only_rollout == 1
check: pl.ranked_only_rank == 1
check: pl.ms750_only_ms_and_cap == 1
check: pl.ms375_only_ms_and_cap == 1
check: st.ok == 1
check: st.cases == 34
check: pma.complete == true
check: pma.played == 4
check: pma.errors + pma.timeouts <= 1
check: pma.aSearch.searched >= 10
check: pma.bSearch.searched >= 10
check: pra.games == 4
check: pra.aDecisions == pma.aSearch.searched
check: pra.bDecisions == pma.bSearch.searched
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
check: pmb.aSearch.msPerDecision < 1500
check: pmb.bSearch.msPerDecision < 1500
check: pmc.complete == true
check: pmc.played == 4
check: pmc.errors + pmc.timeouts <= 1
check: pmc.aSearch.searched >= 10
check: pmc.bSearch.searched >= 10
check: prc.games == 4
check: prc.aDecisions == pmc.aSearch.searched
check: prc.bDecisions == pmc.bSearch.searched
check: prc.aRoundsPerDecision <= 6
check: pmc.bSearch.msPerDecision < 1500
check: pmd.complete == true
check: pmd.played == 4
check: pmd.errors + pmd.timeouts <= 1
check: pmd.aSearch.searched >= 10
check: pmd.bSearch.searched >= 10
check: prd.games == 4
check: prd.aDecisions == pmd.aSearch.searched
check: prd.bDecisions == pmd.bSearch.searched
check: prd.aRoundsPerDecision <= 3
check: pmd.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- the five players resolve on this PC: `pl.ok` is search-v1-anytime at its hash `cdd55e02a89c` and all four arms
  present; `pl.routlets_only_rollout` and `pl.ranked_only_rank` say each knob arm's ai-bench config is
  search-v1-anytime's with `,rollout=outlets` or `,rank=prior,gen=24` appended and nothing else, and
  `pl.ms750_only_ms_and_cap` and `pl.ms375_only_ms_and_cap` that each curve arm's is search-v1-anytime's with `ms=1500`
  and `maxrounds=12` replaced (750 and 6, 375 and 3) and nothing else;
- the verdict script reads thirty-four synthetic sets of match files (and (a)'s reader file) as the rule says, the exposure bar tested at exactly 3% (36 of 1,200: exposed) and just under it (35: UNEXPOSED);
- in 4 games of each arm both sides search, the rollout reader saw all 4 games and exactly the decisions the match
  line counts (`pr*.aDecisions`, `pr*.bDecisions` against `searched`), search-v2 and the two knob arms stay under their
  1.5 s budget on average, and **each curve arm's rounds per searched decision stay at or under its cap** (6 and 3).
  The rounds counter is complete rounds, which the search never runs past `maxRounds`, so these two checks cannot fail
  on a deal: they fail only if the arm's cap did not reach its seat. For the r3 arm that is a real test, since
  search-v2 averages 5.6 to 7.5 rounds a decision (D514's pilots, J194's pilot); for the r6 arm it is weaker (search-v2
  averages near 6 itself) and the config-string check carries it.

Read, not checked:
- `sd.other`, the files changed under `bridge/src/mtgtable/ai` since J194's pin other than D517's
  `DecisionSelfTest.java` (expected 0; `sd.files` lists them). A non-zero count does not stop the night, but it changes
  what reading (c) and (d) beside J194 means, and `summary.md` names the files;
- the curve arms' milliseconds per decision. At 750 and 375 ms a rollout in flight (~63 ms each, its step clock 2 s
  past the deadline, D468) can carry a decision past its deadline, so the mean is not bounded by the budget; it is
  reported;
- **the routlets arm's exposure over the pilot's 4 games**: `pra.aExposedGames` of `pra.games` (and `pra.aPolicyGames`,
  `pra.bExposedGames`). D517's own four pilot games recorded none on either seat, and J194's base rate is about 6% of
  games, so 0 of 4 is the expected reading and is not a failure; the night's exposure decides, under the rule;
- **the ranked arm's touch rate over the pilot's 4 games**: `prb.aRanked` decisions ranked of `prb.aDecisions` searched
  (`prb.aRankedShare`; D389's smoke: 25 of 324, about 8%) and `prb.aTouchedGames` of `prb.games` games. Four games on
  one deck pair may deal no decision with more than six candidates, so a zero here is not a failure; the night's
  `rob.aRankedShare` and `rob.aTouchedShare` are reported beside (b)'s verdict, and if they are near zero, `summary.md`
  says what the verdict was then about;
- every arm's rollouts per decision against search-v2's (`pr*.ratio`): expected near 1 for (a), below 1 for (b) where it
  ranked, and well below 1 for (c) and (d).

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J195a.json
```bash
# (a) the outlet rollouts: search-v2 with rollout=outlets against search-v2, 1,200 games, a verdict
test -f var/j195-tools/verdict.mjs
mkdir -p var/j195
echo "J195 (a): search-v2-routlets against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-routlets search-v1-anytime --games 1200 --hours 3.25 --out var/ai-ladder/match-J195a.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J195b.json
```bash
# (b) the ranked candidates: search-v2 with rank=prior,gen=24 against search-v2, 1,200 games, a verdict
echo "J195 (b): search-v2-ranked against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-ranked search-v1-anytime --games 1200 --hours 5 --out var/ai-ladder/match-J195b.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J195c.json
```bash
# (c) half the compute: search-v2 at 0.75 s and 6 rounds against search-v2 at 1.5 s and 12, 1,200 games, no verdict
echo "J195 (c): search-v2-ms750-r6 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-ms750-r6 search-v1-anytime --games 1200 --hours 2.5 --out var/ai-ladder/match-J195c.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J195d.json
```bash
# (d) a quarter of the compute: search-v2 at 0.375 s and 3 rounds against search-v2 at 1.5 s and 12, 1,200 games, no verdict
echo "J195 (d): search-v2-ms375-r3 against search-v1-anytime, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-ms375-r3 search-v1-anytime --games 1200 --hours 2.25 --out var/ai-ladder/match-J195d.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j195/verdict.json var/j195/report.md var/j195/rollouts-a.json var/j195/rollouts-b.json var/j195/rollouts-c.json var/j195/rollouts-d.json
```bash
# the pre-registered reading; each match's rollouts per searched decision (read, not gated); report.md (numbers only;
# the PC session writes the summary beside it)
for x in a b c d; do node var/j195-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J195$x.json var/j195/rollouts-$x.json; done
node var/j195-tools/verdict.mjs var/ai-ladder/match-J195a.json var/ai-ladder/match-J195b.json var/ai-ladder/match-J195c.json var/ai-ladder/match-J195d.json var/j195/rollouts-a.json var/j195/verdict.json
node - <<'J195EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const K = ['a', 'b', 'c', 'd'];
const M = Object.fromEntries(K.map((k) => [k, read(`var/ai-ladder/match-J195${k}.json`)]));
const RO = Object.fromEntries(K.map((k) => [k, read(`var/j195/rollouts-${k}.json`)]));
const v = read('var/j195/verdict.json');
const pct = (x) => (typeof x === 'number' ? `${(x * 100).toFixed(1)}%` : '-');
const L = ['# J195: the knobs (rollout=outlets, rank=prior) and the curve\'s lower half (0.75 s and 6 rounds, 0.375 s and 3), each against search-v2 (D517)', ''];
L.push(`**Readings under the pre-registered rule:** (a) ${(v.a || {}).reading ?? 'no verdict'}. (b) ${(v.b || {}).reading ?? 'no verdict'}. ${v.knobTrackClosed ? 'Both NOT SHOWN: the knob track is closed (the review\'s §5 row 6).' : 'The knob track stays open.'}`, '');
L.push(`**The curve, no verdict:** (c) ${(v.c || {}).reading ?? '-'}. (d) ${(v.d || {}).reading ?? '-'}.`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k];
  L.push(`| (${k}) ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${RO[k].aRolloutsPerDecision ?? '-'} | ${RO[k].bRolloutsPerDecision ?? '-'} | ${RO[k].ratio ?? '-'} |`);
}
L.push('');
for (const k of K) {
  const m = M[k];
  L.push(`(${k}) config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; ${m.pairs} mirrored pairs; match id ${m.id}. Rounds per decision ${RO[k].aRoundsPerDecision ?? '-'} / ${RO[k].bRoundsPerDecision ?? '-'}; the rollout reader saw ${RO[k].games ?? '-'} games and ${RO[k].aDecisions ?? '-'} / ${RO[k].bDecisions ?? '-'} searched decisions.`);
}
const rb = RO.b || {};
const ra = RO.a || {}, ea = (v.a || {}).exposure || {};
L.push(`(a) Exposure, the routlets arm's seat: ${ea.exposedGames ?? '-'} of ${ea.games ?? '-'} games recorded an opportunity.* key (${pct(ea.share)}; the rule's bar 3%, 36 of 1,200; J194's base rate 5.3% to 6.0%), ${ea.policyGames ?? '-'} a policy.* key; search-v2's side ${ra.bExposedGames ?? '-'} and ${ra.bPolicyGames ?? '-'} of ${ra.games ?? '-'}. UNEXPOSED ${(v.a || {}).unexposed ?? 0}.`);
L.push(`(b) Touch rate, information only: D389's ranking ran on ${rb.aRanked ?? '-'} of ${rb.aDecisions ?? '-'} searched decisions (${pct(rb.aRankedShare)}), in ${rb.aTouchedGames ?? '-'} of ${rb.games ?? '-'} games (${pct(rb.aTouchedShare)}).`);
L.push(`(b) D389's ranking on the ranked side: ${rb.aRanked ?? '-'} decisions ranked of ${rb.aDecisions ?? '-'} searched (${pct(rb.aRankedShare)}), ${rb.aPriorPlayouts ?? '-'} candidates applied once, ${rb.aPriorCut ?? '-'} cut, ${rb.aPriorTimedOut ?? '-'} prior timeouts; search-v2's side ranked ${rb.bRanked ?? '-'}.`);
L.push('', '| match | side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const k of K) {
  const m = M[k];
  for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
    if (!t || !t.searched) { L.push(`| (${k}) | ${who} | no search | | | | | | | | |`); continue; }
    const kd = t.byKind || {};
    const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
    const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
    const ms = t.msMean || {};
    L.push(`| (${k}) | ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} |`);
  }
}
const parts = (k, m) => {
  const x = v[k] || {};
  return `(${k}) complete ${x.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${typeof m.lo === 'number' && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${typeof m.elo === 'number' && m.elo >= 15 ? 1 : 0}; upper end below +15 Elo: ${typeof m.eloHi === 'number' && m.eloHi < 15 ? 1 : 0}. SHOWN ${x.shown ?? 0}, NOT SHOWN ${x.notShown ?? 0}, INCONCLUSIVE ${x.inconclusive ?? 0}.`;
};
L.push('', `Rule parts, the knob arms, each on its own match: ${parts('a', M.a)} ${parts('b', M.b)} (a) exposed (exposure at least 3%, when NOT SHOWN): ${(v.a || {}).notShown ? 1 - ((v.a || {}).unexposed ?? 1) : '-'}. Knob track closed (both NOT SHOWN, (a) not UNEXPOSED): ${v.knobTrackClosed ?? 0}.`);
const cv = (k) => {
  const x = v[k] || {};
  return `(${k}) complete ${x.complete ?? 0}; Elo interval contains 0 ("indistinguishable from search-v2"): ${x.indistinguishable ?? 0}; lower end above -10 Elo ("at most 10 Elo weaker"): ${x.atMost10Weaker ?? 0}; the live 1.5 s buys ${(x.buys || {}).elo ?? '-'} Elo [${(x.buys || {}).lo ?? '-'}, ${(x.buys || {}).hi ?? '-'}] over it.`;
};
L.push(`Beside them, deciding nothing, the curve arms: ${cv('c')} ${cv('d')}`);
L.push('', 'The whole curve on the same 600 deals, each arm against search-v2 (Elo [95%]; the arm\'s ms and rollouts a searched decision): '
  + `x0.25 (this night's d) ${M.d.elo ?? '-'} [${M.d.eloLo ?? '-'}, ${M.d.eloHi ?? '-'}], ${(M.d.aSearch || {}).msPerDecision ?? '-'} ms, ${RO.d.aRolloutsPerDecision ?? '-'}; `
  + `x0.5 (c) ${M.c.elo ?? '-'} [${M.c.eloLo ?? '-'}, ${M.c.eloHi ?? '-'}], ${(M.c.aSearch || {}).msPerDecision ?? '-'} ms, ${RO.c.aRolloutsPerDecision ?? '-'}; `
  + 'x1 search-v2 itself, 0 by definition (836-852 ms, 16.5-16.6 rollouts against the arms on J194); '
  + 'x2 (J194 c, search-v2-ms3000-r24) -4.1 [-13.1, +5.0], 1,488.8 ms, 28.49; x4 (J194 b, search-v2-ms6000-r48) +1.7 [-6.7, +10.2], 2,655.4 ms, 52.15. '
  + 'Forge Default, no search: -87.5 [-103.2, -72.1] from search-v2\'s side (J194 a; search-v2 930.4 ms, 15.25 rollouts against Forge).');
fs.writeFileSync('var/j195/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J195EOF
```
check: cma.complete == true
check: cma.played == 1200
check: cma.errors + cma.timeouts <= 60
check: cmb.complete == true
check: cmb.played == 1200
check: cmb.errors + cmb.timeouts <= 60
check: cmc.complete == true
check: cmc.played == 1200
check: cmc.errors + cmc.timeouts <= 60
check: cmd.complete == true
check: cmd.played == 1200
check: cmd.errors + cmd.timeouts <= 60
check: v.written == 1
check: v.a.complete == 1
check: v.b.complete == 1
check: v.c.complete == 1
check: v.d.complete == 1
check: v.a.shown + v.a.notShown + v.a.inconclusive == 1
check: v.b.shown + v.b.notShown + v.b.inconclusive == 1
check: v.a.shown == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.lo > 0.5 and cma.elo >= 15)
check: v.a.shown == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.lo > 0.5 and cma.elo >= 15)
check: v.a.notShown == 1 or not (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and not (cma.lo > 0.5 and cma.elo >= 15))
check: v.a.notShown == 0 or (cma.complete == true and cma.played == 1200 and cma.errors + cma.timeouts <= 60 and cma.eloHi < 15 and not (cma.lo > 0.5 and cma.elo >= 15))
check: v.b.shown == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.b.shown == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.lo > 0.5 and cmb.elo >= 15)
check: v.b.notShown == 1 or not (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and not (cmb.lo > 0.5 and cmb.elo >= 15))
check: v.b.notShown == 0 or (cmb.complete == true and cmb.played == 1200 and cmb.errors + cmb.timeouts <= 60 and cmb.eloHi < 15 and not (cmb.lo > 0.5 and cmb.elo >= 15))
check: v.a.exposure.exposedGames == roa.aExposedGames
check: v.a.unexposed == 1 or not (v.a.notShown == 1 and roa.aExposedGames * 100 < 3 * cma.played)
check: v.a.unexposed == 0 or (v.a.notShown == 1 and roa.aExposedGames * 100 < 3 * cma.played)
check: v.knobTrackClosed == 1 or not (v.a.notShown == 1 and v.a.unexposed == 0 and v.b.notShown == 1)
check: v.knobTrackClosed == 0 or (v.a.notShown == 1 and v.a.unexposed == 0 and v.b.notShown == 1)
check: v.c.indistinguishable == 1 or not (cmc.complete == true and cmc.played == 1200 and cmc.errors + cmc.timeouts <= 60 and cmc.eloLo < 0 and cmc.eloHi > 0)
check: v.c.indistinguishable == 0 or (cmc.complete == true and cmc.played == 1200 and cmc.errors + cmc.timeouts <= 60 and cmc.eloLo < 0 and cmc.eloHi > 0)
check: v.c.atMost10Weaker == 1 or not (cmc.complete == true and cmc.played == 1200 and cmc.errors + cmc.timeouts <= 60 and cmc.eloLo > -10)
check: v.c.atMost10Weaker == 0 or (cmc.complete == true and cmc.played == 1200 and cmc.errors + cmc.timeouts <= 60 and cmc.eloLo > -10)
check: v.d.indistinguishable == 1 or not (cmd.complete == true and cmd.played == 1200 and cmd.errors + cmd.timeouts <= 60 and cmd.eloLo < 0 and cmd.eloHi > 0)
check: v.d.indistinguishable == 0 or (cmd.complete == true and cmd.played == 1200 and cmd.errors + cmd.timeouts <= 60 and cmd.eloLo < 0 and cmd.eloHi > 0)
check: v.d.atMost10Weaker == 1 or not (cmd.complete == true and cmd.played == 1200 and cmd.errors + cmd.timeouts <= 60 and cmd.eloLo > -10)
check: v.d.atMost10Weaker == 0 or (cmd.complete == true and cmd.played == 1200 and cmd.errors + cmd.timeouts <= 60 and cmd.eloLo > -10)

The first twelve checks say each match is complete: it was not stopped, all 1,200 games were played, and at most one
in 20 ended in an engine error or a timeout. The next five say the verdict script ran and agrees that each match is
complete; the two after them that each knob arm got exactly one reading. The next eight are the knob rule in the
runner's own language, per arm: `v.a.shown` is 1 exactly when (a) is complete with its lower end above 0.5 and its
point at least +15 Elo, and `v.a.notShown` exactly when (a) is complete, not SHOWN, and its upper end is below +15 Elo;
the same for (b). The next three are the exposure rule: the verdict read (a)'s exposure from the reader's file for
this match, and `v.a.unexposed` is 1 exactly when (a) is NOT SHOWN and fewer than 3% of its games (36 of 1,200)
recorded an `opportunity.*` key on the arm's seat. The next two say the knob track is closed exactly when both are NOT
SHOWN and (a) is not UNEXPOSED. The last eight are the
curve's two descriptive readings: `indistinguishable` is 1 exactly when that match is complete and its Elo interval
contains 0 (eloLo < 0 < eloHi), and `atMost10Weaker` exactly when it is complete and its lower end is above -10 Elo.
Any reading passes them; a reading is not a failure. The time per decision, the rollouts, the changed answers and
the fallbacks are reported, not gated.

## Abort if
abort: j195_err >= 30 and j195_err > j195_games / 10

Engine trouble only: once 30 games of the four matches have ended in an engine error or a timeout, the job stops if
they are more than one in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J195a.json
collect: var/ai-ladder/match-J195b.json
collect: var/ai-ladder/match-J195c.json
collect: var/ai-ladder/match-J195d.json
collect: var/j195/verdict.json
collect: var/j195/report.md

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J131, J139 and J194:
- **the knob readings under the rule** (matches (a) and (b), each on its own): SHOWN, NOT SHOWN or INCONCLUSIVE. Give
  each arm's score against search-v2 with its 95% interval, the same in Elo, and the pair and game counts; on an
  INCONCLUSIVE, say that the 4,800-game confirmation of that arm is what follows; if both are NOT SHOWN and (a) is exposed,
  say that the knob track is closed (the review's §5 row 6); if (a) is NOT SHOWN, UNEXPOSED, say so in those words and
  that the outlets knob stays open until a rollout-level counter exists; on a SHOWN, say that it is a measured gain at 1,200 games and that any
  change to the live seat is a separate decision;
- **(a)'s exposure:** the games in which the arm's seat recorded an `opportunity.*` key (and a `policy.*` key) of the games
  played, its share against the 3% bar, search-v2's side beside it, and J194's base rate (5.3% to 6.0%), with the
  dilution said plainly: at this deck set's exposure the knob can act in roughly one game in seventeen; a NOT SHOWN closes the track for this deck set, not for an outlet-heavy one;
- **what the ranked arm actually did:** its touch rate, information only: the share of its searched decisions it ranked
  (`rob.aRankedShare`, beside D389's ~8%) and of games it ranked in (`rob.aTouchedShare`), its prior's playouts, cuts and timeouts, and its rollouts per decision against search-v2's (the prior's
  share comes out of the same 1.5 s). If it ranked almost nothing, say what (b)'s verdict was then about;
- **the curve's lower half** (matches (c) and (d), no verdict): each arm's score and Elo with the interval, what the live
  1.5 s buys over it (`v.c.buys`, `v.d.buys`), and the descriptive readings "indistinguishable from search-v2" where
  `indistinguishable` is 1 and "at most 10 Elo weaker" where `atMost10Weaker` is 1 (the bar a later, separate live-seat
  decision would cite), always with both interval ends named; then the whole curve on the same deals, x0.25 to x4, with J194's two arms
  and Forge Default from J194, as report.md's last line gives it. Say plainly that a curve arm decides nothing and that
  any change to the live seat's budget is a separate decision;
- **the compute each arm actually spent:** each side's ms and rollouts and rounds per searched decision in all four
  matches (`rollouts-*.json`, the headline's `roa.ratio` … `rod.ratio`), each arm's budget fallbacks with their interval
  (expected to rise at 375 ms), and other fallbacks;
- **the changed answers by kind:** each side's p/a/b decisions searched and changed, in all four matches;
- **the search code**: the pilot's `sd.files` (expected: D517's `DecisionSelfTest.java` alone since J194's pin), so the
  reading beside J194 is on the same search;
- **the run:** draws, errors and timeouts, each match's hours, the pressure events in STATUS (drops and raises, and
  which matches they fell in), and whether the GPU queue or anything else was running.

Never write "no gain", "no effect" or "no cost" for an interval that includes 0.5; "indistinguishable from search-v2"
is the pre-registered reading for such an interval on a curve arm, never "equal" or "free". If (a) or (b) stopped early
(`complete: false`), say so: that arm gets no verdict. If (c) or (d) stopped early, report what was played as incomplete.

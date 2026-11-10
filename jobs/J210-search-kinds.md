id: J210
title: Where the search's strength is, by decision kind (D535, config only, no new Java): search-v2 with each of priority, attacks and blocks searched or left to Forge, all eight combinations, each one fixed 1,200-game match (600 mirrored pairs, D398, the confirm set, no stopping rule) against forge-default on the same 600 deals, each in a ladder folder of its own, read paired by deal (WHOLE, ALONE and LAST for each kind, INTERACTION, REPLICATION against J194 (a)'s rows) and by D535's faster-seat candidate rule; alone on the machine
public_title: Which decisions make the search strong: priority, attacks or blocks
public_est: ~6 h (eight matches)
public_decides: Where the search gets its strength, and whether a faster seat is worth testing
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
alone: yes
repos: mtg-table@c744a0e848cdecc8ddf7c61e128b6c4e590004fd (the merge commit of D535's lane, pc/search-kinds, on main, its first parent main at the merge (4e823718, D533's merge and J209's pin, or a main equal to it under every path a match runs), pushed to origin/main before posting; the lane's tip: 77a57d80. It carries: six config-only ladder players in tools/ai-ladder/players.json (search-v2-only-p, search-v2-only-a, search-v2-only-b, search-v2-no-b, search-v2-no-a, search-v2-no-p: search-v2's seat config with what= alone changed), their hashes in the registry test (web/test/ai-ladder.test.ts), D535's file docs/decisions/D535-search-kinds.md, D534's file docs/decisions/D534-random-rollout-track-closes.md (the random-rollout track's closing decision, written when J209 was read: words only) and PLAN's rows. Nothing under bridge/src: no new Java, and the pilot checks that by content)
decides: D535 points 5 and 6, from the night's eight match lines and their rows, paired by deal (D535 point 4), every threshold compared in ten-thousandths of score. WHOLE = the all corner's pair score minus the none corner's, the search's whole gain: its lower end not above 0 means something is broken, nothing else is read and the night is diagnosed first. ALONE for each of priority, attacks and blocks (only-k minus none): ADDS ALONE, HURTS ALONE or NOT SHOWN ALONE. LAST for each (all minus no-k): NEEDED, HURTS or NOT SHOWN NEEDED. INTERACTION and REPLICATION (all minus J194 (a)'s rows) are information only. The faster-seat candidate rule: a partial arm X is a candidate when all minus X has its point at or under +0.014 score with WHOLE above 0; among several the one with the least search time a game is taken forward, and it earns a 4,800-game head-to-head against search-v1-anytime as its own job under its own decision (J198's shape). No candidate is the expected reading: the table then says where the next lane's compute goes (D535 point 7). No reading of this night changes the live seat (D509: a seat-queue row and the owner's)
hypothesis: none registered on any reading. What is known, on these deals: J194 (a) search-v1-anytime (search-v2) against forge-default 0.6233 [0.6023, 0.6444], +87.5 Elo [72.1, 103.2], 1,200 games at pin 72302c69, 29,179 searched decisions (20,434 priority, 6,839 attacks, 1,906 blocks; 4,004, 1,073 and 304 changed: 19.6%, 15.7%, 15.9%), so priority is about 70% of the seat's thinking time, attacks about 23% and blocks about 6.4%; J204 (b) policy-outlet (search-v2's seat with the search off) against search-v2 head to head -84.4 Elo [-99.9, -69.3]. No match of any of the six partial arms has been played, and what= has been pab in every search player before them. Expected, not registered (D535 point 7): no faster-seat candidate. The paired comparison's own noise, measured on this host's earlier matches on these deals before any game of this night: two search seats' pair scores correlate at about 0.45 to 0.55 and the difference's 95% half-width is about 0.020 to 0.022 in score, about 15 to 16 Elo; a search seat against a seat without search correlates at 0.09 to 0.21, about 0.026 to 0.028. The night resolves differences of about 16 to 20 Elo and no finer
rule: written 2026-11-10 before any rated game of any of the six partial arms, word for word as D535 states it (its points 5 and 6; D535's bold dropped): "5. The readings, written before any game of the night. `none`, `only-k`, `no-k` and `all` are the corners of point 1; k is one of p, a, b. - WHOLE = Δ(all, none): the search's whole gain on these deals. If its lower end is not above 0, something is broken (J204 (b) measured search-v2 84 Elo above `policy-outlet` head to head): nothing else is read and the night is diagnosed first. - ALONE(k) = Δ(only-k, none): what searching kind k adds when nothing else is searched. `ADDS ALONE` when its lower end is above 0; `HURTS ALONE` when its upper end is below 0; otherwise `NOT SHOWN ALONE`. - LAST(k) = Δ(all, no-k): what searching kind k adds when the other two are searched already, which is what the live seat would lose by not searching it. `NEEDED` when its lower end is above 0; `HURTS` when its upper end is below 0; otherwise `NOT SHOWN NEEDED`. - INTERACTION (information only) = the mean over deals of all − only-p − only-a − only-b + 2 × none: above 0, the kinds help each other; below, they overlap. - REPLICATION (information only) = Δ(all, J194 (a)'s rows): the same config on the same deals at two pins and five days apart. It is the paired comparison's own noise floor, and the one place where the code under search-v2 between `72302c69` and this night's pin would show. An interval that includes 0 is never worded as "no effect". 6. The faster-seat candidate rule. The six partial arms (`only-p`, `only-a`, `only-b`, `no-p`, `no-a`, `no-b`) are each read against `all`: an arm X is a faster-seat candidate when Δ(all, X)'s point is at most +0.014 in score (about 10 Elo at these scores: the bar J198 used), WHOLE's interval being wholly above 0 (point 5's reading). Among several candidates the one taken forward is the one with the least search time a game on its own match line (`aSearch.msPerDecision × aSearch.searched / played`). A candidate is not a result: at this night's ± 16 Elo an arm truly 20 Elo worse passes about one time in nine (a standard error of about 8 Elo, the bar 10 Elo under the truth). It earns a 4,800-game head-to-head against `search-v1-anytime`, as its own job under its own decision, in J198's shape (the −10 Elo bar, D519's four readings). A seat change is never made by this decision or that one: it is a seat-queue row and the owner's (D509)."
followup: morning-read
est: ~6 h at 7 workers (an estimate; range 5.5-7.5 h), 16 h at worst (the eight matches' own stops: 1, 1, 1.5, 2.5, 1.5, 2.5, 3 and 3 h). From this host at 7 workers, alone: J194 (a), search-v2 against forge-default on these deals, took 1.27 h for its 1,200 games (a pressure drop to 6 workers for 6 minutes inside), searching 29,179 decisions at 930 ms each; its time shares by kind (priority about 70%, attacks 23%, blocks 6.4%) give 0.2, 0.3, 0.45, 0.95, 0.5, 1.0, 1.2 and 1.3 h for the eight matches in the night's order; the 0.2 h for the match with no search is an estimate (no such match has been timed on this host at 7 workers). The pilot is about 15 minutes
resumable: no
timeout: 4h
clean: var/j210 var/j210-none var/j210-b var/j210-a var/j210-p var/j210-ab var/j210-pb var/j210-pa var/j210-pab var/ai-ladder-pilot/J210 var/ai-ladder/match-J210-none.json var/ai-ladder/match-J210-b.json var/ai-ladder/match-J210-a.json var/ai-ladder/match-J210-p.json var/ai-ladder/match-J210-ab.json var/ai-ladder/match-J210-pb.json var/ai-ladder/match-J210-pa.json var/ai-ladder/match-J210-pab.json
progress: metric j210_games games of 9600
metrics: j210_games = sh: node -e 'const fs=require("fs");const C={none:"policy-outlet",b:"search-v2-only-b",a:"search-v2-only-a",p:"search-v2-only-p",ab:"search-v2-no-p",pb:"search-v2-no-a",pa:"search-v2-no-b",pab:"search-v1-anytime"};let n=0;for(const k in C){const f="var/j210-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"forge-default\""))n++}console.log(n)'
metrics: j210_err = sh: node -e 'const fs=require("fs");const C={none:"policy-outlet",b:"search-v2-only-b",a:"search-v2-only-a",p:"search-v2-only-p",ab:"search-v2-no-p",pb:"search-v2-no-a",pa:"search-v2-no-b",pab:"search-v1-anytime"};let n=0;for(const k in C){const f="var/j210-"+k+"/results";for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\""+C[k]+"\"")&&l.includes("\"b\":\"forge-default\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++}console.log(n)'
metrics: mn = sh: cat var/ai-ladder/match-J210-none.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mb = sh: cat var/ai-ladder/match-J210-b.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: ma = sh: cat var/ai-ladder/match-J210-a.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mp = sh: cat var/ai-ladder/match-J210-p.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mab = sh: cat var/ai-ladder/match-J210-ab.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mpb = sh: cat var/ai-ladder/match-J210-pb.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mpa = sh: cat var/ai-ladder/match-J210-pa.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: mall = sh: cat var/ai-ladder/match-J210-pab.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0,"elo":0,"eloLo":0,"eloHi":0}'
metrics: cf = sh: cat var/j210/cfgs.json 2>/dev/null || echo '{"corners":0,"ok":0,"lines":0}'
metrics: v = sh: cat var/j210/v.json 2>/dev/null || echo '{"written":0,"names":0,"present":0,"complete":0,"valid":0,"kindsOk":0,"seedsOk":0,"sidesOk":0,"rowsAgree":0,"scoresAgree":0,"allNight":0,"allJ194":0,"refValid":0,"whole":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"above":0},"diagnose":0,"gate":0,"alone":{"p":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"adds":0,"hurts":0,"notShown":0,"unread":0},"a":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"adds":0,"hurts":0,"notShown":0,"unread":0},"b":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"adds":0,"hurts":0,"notShown":0,"unread":0}},"last":{"p":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"needed":0,"hurts":0,"notShown":0,"unread":0},"a":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"needed":0,"hurts":0,"notShown":0,"unread":0},"b":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0,"needed":0,"hurts":0,"notShown":0,"unread":0}},"interaction":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0},"replication":{"read":0,"n":0,"mean":0,"se":0,"lo":0,"hi":0,"rho":0,"eloAbout":0,"eloHalfAbout":0},"cand":{"b":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0},"a":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0},"p":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0},"ab":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0},"pb":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0},"pa":{"read":0,"n":0,"mean":0,"lo":0,"hi":0,"eloAbout":0,"eloHalfAbout":0,"candidate":0,"msPerGame":0}},"candidates":0,"takenIndex":0,"headToHead":0,"readings":0,"sharedMin":0,"liveSeatChanged":0}'
headline: mn.played, mn.elo, mb.elo, ma.elo, mp.elo, mab.elo, mpb.elo, mpa.elo, mall.played, mall.elo, mall.eloLo, mall.eloHi, v.whole.mean, v.whole.lo, v.whole.hi, v.gate, v.alone.p.mean, v.alone.a.mean, v.alone.b.mean, v.alone.p.adds, v.alone.a.adds, v.alone.b.adds, v.last.p.mean, v.last.a.mean, v.last.b.mean, v.last.p.needed, v.last.a.needed, v.last.b.needed, v.interaction.mean, v.replication.mean, v.candidates, v.takenIndex, v.readings, v.allNight

**Why this job** (D535). search-v2 (`search-v1-anytime`, the live seat's config) asks Forge for its answer at three
kinds of decision (a priority window `p`, an attack declaration `a`, a block declaration `b`), plays rollouts of up to
six candidates for at most 1.5 s, and overrides Forge's answer when a candidate leads by the margin. Against Forge
Default on the confirm set's 600 deals it scored 0.6233 [0.6023, 0.6444], +87.5 Elo [72.1, 103.2] (J194 (a)). **Which
kind of decision that strength comes from has never been measured.** J194 (a)'s counters give rates only: 20,434
priority decisions searched (19.6% changed), 6,839 attacks (15.7%), 1,906 blocks (15.9%), so priority windows are
about 70% of the seat's thinking time, attacks about 23% and blocks about 6.4%; a changed answer is not a won game,
and the random-rollout track said the same of its own counters eight times (D532 point 6, D533 point 8: they "give
rates, not which overrides win"). Two things wait on the answer. The owner asked for a faster seat; halving the budget
did not hold (J198, 0.75 s: -6.5 Elo [-11.7, -1.3], INCONCLUSIVE AT 4,800, D519), and the other way to a faster seat
is to stop searching a kind of decision that pays little. And every lane that tried to make the search stronger since
the anytime loop changed all three kinds at once and landed between -84 and +9 Elo; knowing where the strength is says
where the next lane's compute and candidates go. `what=` has been `pab` in every registered search player until this
lane: the switch has never been run as an ablation. D535 is `docs/decisions/D535-search-kinds.md` at the pin: its
point 1 is the eight corners, points 2 and 3 the folders and the deals, point 4 the paired comparison, point 5 the
readings, point 6 the candidate rule, point 7 what no candidate means, point 8 the order. The same merge carries D534 (`docs/decisions/D534-random-rollout-track-closes.md`), which closes the random-rollout track on J209's reading; it changes no code and no player.

**What is built** (D535, the merge of pc/search-kinds). **No new Java.** `what=` is a `SearchConfig` key the ladder
already passes (`KINDS.search.params.what`) and `SearchPolicy` already honours (`wantsPriority` is false without `p`;
`chooseAttack` and `chooseBlock` return Forge's answer at once without `a` or `b`). The lane adds six players to
`tools/ai-ladder/players.json`, each search-v2's seat config with `what=` alone changed, and their hashes to
`web/test/ai-ladder.test.ts`; under every path a match runs, the pin differs from J209's in that one file.

**The eight matches**, in the night's order (D535 point 8: cheapest and most needed first, so a cut night still
reads), every one against `forge-default` (`3ed453ffef1c`, config `Default`):

| # | corner | player | `what=` | hash | searched | its folder | its stop | about |
|---|---|---|---|---|---|---|---|---|
| 1 | none | `policy-outlet` | search off | `e350d94649a4` | nothing | `var/j210-none` | 1 h | 0.2 h |
| 2 | b | `search-v2-only-b` | `b` | `c214a22644a2` | blocks | `var/j210-b` | 1 h | 0.3 h |
| 3 | a | `search-v2-only-a` | `a` | `9f7945dd5b1b` | attacks | `var/j210-a` | 1.5 h | 0.45 h |
| 4 | p | `search-v2-only-p` | `p` | `cf536ce63aee` | priority | `var/j210-p` | 2.5 h | 0.95 h |
| 5 | ab | `search-v2-no-p` | `ab` | `d8508f47552b` | attacks and blocks | `var/j210-ab` | 1.5 h | 0.5 h |
| 6 | pb | `search-v2-no-a` | `pb` | `ba2eafaee6fb` | priority and blocks | `var/j210-pb` | 2.5 h | 1.0 h |
| 7 | pa | `search-v2-no-b` | `pa` | `59505e241363` | priority and attacks | `var/j210-pa` | 3 h | 1.2 h |
| 8 | pab | `search-v1-anytime` | `pab` | `cdd55e02a89c` | everything (search-v2 itself) | `var/j210-pab` | 3 h | 1.3 h |

Each arm's seat config is
`Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=<w>,seed=0,anytime=1`;
`policy-outlet` is `Default+outlets`, search-v2's seat with the search off (D528, J204 (b)). The hashes are D535's,
computed by `registry.ts` on the lane; the pilot records the real ones (`var/j210-tools/players.json`) and checks the
config strings and the hashes (`pl.hashesAsD535`). Each match is `ai-ladder.sh match <player> forge-default --dir
var/j210-<corner> --games 1200 --hours <stop> --out var/ai-ladder/match-J210-<corner>.json` (D398, the confirm set,
mirrored pairs, no stopping rule on the score).

**The readings** (D535 points 4 to 6; `var/j210-tools/verdict.mjs`, written and tested in the pilot before any game).
An arm's pair score on a deal is its wins over its decisive games there (draws dropped, as the ladder's `pairScores`
does); a deal is D321's key (batch seed, deck pair, the game's block of four, the half). For two corners X and Y the
difference is the mean over the deals where both have a pair score of X's minus Y's, with a 95% interval of 1.96
standard errors of those differences either side. The verdict writes, as numbers and 0/1 flags only:
- WHOLE = all minus none (`v.whole`), and `v.gate` 1 when its lower end is above 0; `v.diagnose` 1 when it was read and
  is not. With `v.gate` 0 nothing else carries a flag;
- ALONE for p, a and b = only-k minus none (`v.alone.<k>`: `adds`, `hurts`, `notShown`, `unread`, exactly one);
- LAST for p, a and b = all minus no-k (`v.last.<k>`: `needed`, `hurts`, `notShown`, `unread`, exactly one);
- INTERACTION = the mean over the deals all five have of all - only-p - only-a - only-b + 2 x none (`v.interaction`);
- REPLICATION = the night's all minus J194 (a)'s rows of the same deals (`v.replication`): the same config at two pins
  and five days apart, the paired comparison's own noise floor;
- the six candidate rows (`v.cand.<corner>`): all minus the arm, `candidate` 1 when the point is at or under 0.0140
  with the gate open, `msPerGame` the arm's search time a game from its own match line; `v.candidates` their count and
  `v.takenIndex` the one with the least search time (1 to 6 in the order b, a, p, ab, pb, pa; 0 for none);
- what it stands on: a corner is valid when its match line is the night's (names and hashes), complete, 1,200 played
  with at most 60 errors and timeouts, its rows in its folder agree with the line (count and score), every row's
  batch seed is in 114,900,000-114,900,149, each deal has both seats, and it searched exactly the kinds its `what=`
  names (`v.valid`, `v.kindsOk`, `v.seedsOk`, `v.sidesOk`, `v.rowsAgree`, `v.scoresAgree`, each a count of corners,
  8 on a whole night). A comparison is read only when both its corners are valid and they share at least 590 deals.
  If the night's all corner is not valid and J194 (a)'s rows are, LAST and the candidate rows are read against J194
  (a)'s rows instead (`v.allJ194` 1, `v.allNight` 0; D535 point 8) and the report says so in every line that uses
  them.
An interval that includes 0 is never worded as "no effect".

**A folder per match, and the deal blocks.** A match's batches take the host's match base (`hostBase(host)` + 900,000
= 114,900,000, `cmdMatch` in `tools/ai-ladder/cli.ts`) and then the matchup's next block its folder has not played
(`nextBseed`, by the two players' names). In the real ladder folder `search-v1-anytime` against `forge-default` has
played 114,900,000-114,900,149 already (J194 (a)) and would take the next 150, other deals than the other seven
corners'; and a match the runner starts again after a memory stop (as J206's and J208's were) would find its own first
rows and take the blocks after them. So each match has a ladder folder of its own, `var/j210-<corner>`, on the same
host name, **which its block empties before the match starts**: the seed base is the host's, the folder holds no
earlier game, and the match takes the same 150 blocks on a first run and on a retry. The night's rows stay out of
`var/ai-ladder/results`, where J194 (a)'s rows of the same deals are read from for REPLICATION; so the six new arms do
not appear on the public ladder from this night (accepted, D535 point 2). The worker homes and the compiled bench
are the real ladder's (`var/ai-ladder/homes`, `var/ai-ladder/classes`), whatever `--dir` says.

**Why fixed matches and no tuning.** Every arm changes one key in a config already played on these deals, all six were
registered before any game, and nothing about an arm is chosen from this night's data. A candidate is not a result:
at this night's 16 Elo half-width an arm truly 20 Elo worse passes the candidate rule about one time in nine, which
is why a candidate earns a 4,800-game head-to-head and nothing more. No match touches the live seat.

**When it runs.** `alone: yes` (D521 Decision 5): a ladder match plays to wall-clock budgets, so contention changes
the rollouts each side affords; it is admitted only onto an empty machine and nothing, heavy or light, is admitted
beside it; while it is next and waits, nothing newer starts. `cores: 7` keeps the width J195's to J209's walls were
measured at. No `after:`; it starts once the jobs before it have ended. The pilot reads J194 (a)'s match line and
rows on this host (`var/ai-ladder/match-J194a.json`, `var/ai-ladder/results`). It may run beside the art session's
GPU painting queue, which is outside the lab and CPU-light but not memory-free; the runner's memory rule handles that
as for J206 and J208. A step's `timeout:` is 4 h, an hour over the longest match's own stop.

## Pilot
About 15 minutes:
- the pin is merged;
- the build (the lint and its self-test, javac and the decision self-test: no Java is new, so this is the same build
  J209's pilot ran), the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves the nine players (the anchor, the eight corners): each of the six partial arms' seat
  config is search-v2's with its own `what=` for `what=pab` and nothing else, `policy-outlet` is `Default+outlets`,
  the anchor is `Default`, the nine hashes are D535's and no two are the same;
- the code, by content: the pin is the merge of D535's lane (two parents, its second the lane tip), its tree under
  every path a match runs is the lane tip's (`bridge/src`, `tools/ai-bench` (the set and its decks),
  `tools/ai-ladder`, the modules the ladder imports from outside it (`tools/cubelab/lines.ts`, `tools/cubelab/rng.ts`,
  `tools/runner/control.ts`), `tools/ai-ladder.sh`, `tools/ai-bench.sh`, `tools/config.sh` (each worker's Forge
  home), `forge-home/custom-cards` (D14's overlay) and `config.json` (the jar's path)), its first parent there is
  J209's pin `4e823718`, and there it differs from its first parent and from `4e823718` in exactly one file,
  `tools/ai-ladder/players.json`: nothing under `bridge/src`;
- the verdict script, the config reader and the kinds reader written and tested on synthetic files; the verdict run
  once on this host's real J194 (a) rows with no night file present (the reference reads as valid, nothing else is
  read);
- three pilot matches of 4 games each against `forge-default`, one worker, in the pilot's own folder:
  `search-v2-only-a` searches attacks and nothing else, `search-v2-no-a` searches priority and no attack,
  `search-v2-only-b` searches no priority and no attack; Forge's side searches nothing in any of them, and every
  batch line's config A is exactly the arm's and config B exactly `Default`.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j210-merged.txt || echo 0 > var/j210-merged.txt
cat var/j210-merged.txt
rc=0; ./bridge/build.sh > var/j210-build.txt 2>&1 || rc=$?
cat var/j210-build.txt
# the build's decision self-test: its line, with 0 failures (unchanged Java: J209's pilot printed 392 checks)
node -e 'const fs=require("fs");const t=fs.readFileSync("var/j210-build.txt","utf8");const m=/^decision selftest: (\d+) check\(s\), (\d+) failure\(s\)$/m.exec(t);const r={ok:m&&m[2]==="0"?1:0,checks:m?Number(m[1]):0,failures:m?Number(m[2]):-1};fs.writeFileSync("var/j210-decision-selftest.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
test "$rc" -eq 0
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# the nine players resolve; each partial arm is search-v2 with its own what= and nothing else; the hashes are D535's
mkdir -p var/j210-tools
./tools/ai-ladder.sh list > var/j210-tools/players.txt
grep -E '^(forge-default|policy-outlet|search-v1-anytime|search-v2-(only|no)-[pab]) ' var/j210-tools/players.txt || true
node - <<'J210EOF'
// J210's pilot: the players resolve and the six partial arms' seat configs are what D535 says they are.
const fs = require('fs');
const L = fs.readFileSync('var/j210-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
// corner, player, D535's hash, the kinds it searches
const CORNERS = [['none', 'policy-outlet', 'e350d94649a4', ''], ['b', 'search-v2-only-b', 'c214a22644a2', 'b'], ['a', 'search-v2-only-a', '9f7945dd5b1b', 'a'],
  ['p', 'search-v2-only-p', 'cf536ce63aee', 'p'], ['ab', 'search-v2-no-p', 'd8508f47552b', 'ab'], ['pb', 'search-v2-no-a', 'ba2eafaee6fb', 'pb'],
  ['pa', 'search-v2-no-b', '59505e241363', 'pa'], ['pab', 'search-v1-anytime', 'cdd55e02a89c', 'pab']];
const want = (w) => (w === '' ? 'Default+outlets' : V1CFG.replace(',what=pab,', `,what=${w},`));
const forge = get('forge-default');
const got = CORNERS.map(([key, name, hash, what]) => ({ key, name, hash, what, p: get(name) }));
const partial = got.filter((c) => c.what !== '' && c.what !== 'pab');
const v1 = got.find((c) => c.key === 'pab').p, none = got.find((c) => c.key === 'none').p;
const hashes = [forge?.hash ?? '', ...got.map((c) => c.p?.hash ?? '')];
const r = {
  present: forge && forge.cfg !== undefined && got.every((c) => c.p && c.p.cfg !== undefined) ? 1 : 0,
  forge_ok: forge && forge.kind === 'forge' && forge.cfg === 'Default' && forge.hash === '3ed453ffef1c' ? 1 : 0,
  none_ok: none && none.kind === 'policy' && none.cfg === 'Default+outlets' ? 1 : 0,
  v1_cfg_ok: v1 && v1.kind === 'search' && v1.cfg === V1CFG ? 1 : 0,
  arms_ok: partial.filter((c) => c.p && c.p.kind === 'search' && c.p.cfg === want(c.what) && c.p.cfg !== V1CFG).length,
  hashesAsD535: forge?.hash === '3ed453ffef1c' && got.every((c) => c.p?.hash === c.hash) ? 1 : 0,
  distinctHashes: hashes.every((h) => /^[0-9a-f]{12}$/.test(h)) && new Set(hashes).size === 9 ? 1 : 0,
  hashes: Object.fromEntries([['forge-default', forge?.hash ?? ''], ...got.map((c) => [c.name, c.p?.hash ?? ''])]),
  cfgs: Object.fromEntries(got.map((c) => [c.name, c.p?.cfg ?? ''])),
};
r.ok = r.present && r.forge_ok && r.none_ok && r.v1_cfg_ok && r.arms_ok === 6 && r.hashesAsD535 && r.distinctHashes ? 1 : 0;
fs.writeFileSync('var/j210-tools/players.json', JSON.stringify(r, null, 1) + '\n');
// what each corner's batch lines must carry as config A, and Forge's as config B (the night's config reader reads these)
for (const c of got) fs.writeFileSync(`var/j210-tools/cfg-${c.key}.txt`, want(c.what) + '\n');
fs.writeFileSync('var/j210-tools/cfg-forge.txt', 'Default\n');
console.log(JSON.stringify(r));
J210EOF
# the code, by content (D535 point 4). HEAD is the runner's checkout of the pin, D535's merge: it must have two parents,
# its second the lane tip; its tree under every path a match runs must be the lane tip's; its first parent there J209's
# pin 4e823718; and there it must differ from its first parent and from 4e823718 in exactly one file, players.json.
# A pin with no second parent writes `none` and FAILS the check.
LANE_TIP='77a57d80674241ba83decb87166d662b689d6173'
J209PIN='4e8237182c12a9476311d949d35a5100e0920d3b'
PATHS='bridge/src tools/ai-bench tools/ai-ladder tools/cubelab/lines.ts tools/cubelab/rng.ts tools/runner/control.ts tools/ai-ladder.sh tools/ai-bench.sh tools/config.sh forge-home/custom-cards config.json'
C=var/j210-tools/code
rm -rf $C && mkdir -p $C
git rev-list --parents -n 1 HEAD | awk '{print NF-1}' > $C/parents.txt
git rev-parse -q --verify 'HEAD^2' > $C/parent2.txt 2>/dev/null || { echo none > $C/parent2.txt; echo 'J210 PILOT: HEAD has no second parent: the pin is not a merge' >&2; }
echo "$LANE_TIP" > $C/lanetip.txt
if git diff --quiet "$LANE_TIP" HEAD -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/tree-is-tip.txt
if git diff --quiet "$J209PIN" 'HEAD^1' -- $PATHS 2>/dev/null; then echo 1; else echo 0; fi > $C/main-is-j209.txt
git diff --name-only 'HEAD^1' HEAD -- $PATHS > $C/since-parent1.txt 2>/dev/null || echo '(HEAD^1 is not in this checkout)' > $C/since-parent1.txt
git diff --name-only "$J209PIN" HEAD -- $PATHS > $C/since-j209.txt 2>/dev/null || echo '(J209 pin 4e823718 is not in this checkout)' > $C/since-j209.txt
cat > var/j210-tools/codecheck.cjs <<'J210EOF'
// J210's code check (D535 point 4), by content. Reads the files the pilot's git block wrote into <dir> and writes
// <out>. Each git answer is a file holding 1 (holds), 0 (does not) or the answer itself:
//   parents.txt         the pin's parent count (`git rev-list --parents -n 1 HEAD`): must be 2, a merge
//   parent2.txt         HEAD^2's sha, or `none` when HEAD has no second parent (then the check FAILS, never passes)
//   lanetip.txt         the lane tip the job names (D535's merge's second parent)
//   tree-is-tip.txt     `git diff --quiet <lane tip> HEAD -- <paths>` exited 0: the pin's tree under every path a match
//                       runs IS the lane tip's (another lane's change there, merged first, fails it)
//   main-is-j209.txt    `git diff --quiet 4e823718 HEAD^1 -- <paths>` exited 0: main there, the merge's first parent,
//                       is J209's pin (D533's merge)
//   since-parent1.txt   `git diff --name-only HEAD^1 HEAD -- <paths>`: what the merge brought there: players.json alone
//   since-j209.txt      `git diff --name-only 4e823718 HEAD -- <paths>`: the same one file, from J209's pin
// D535's lane is config only: the check is that it changes exactly tools/ai-ladder/players.json under a match path,
// and so nothing under bridge/src: the Java every corner of the night plays is the Java J209 played.
// usage: node codecheck.cjs <dir> <out.json>
const fs = require('fs');
const [dir, out] = process.argv.slice(2);
const lines = (f) => { try { return fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean); } catch { return []; } };
const one = (f) => lines(f)[0] ?? '';
const LANE = ['tools/ai-ladder/players.json'];
const same = (x, want) => x.length === want.length && [...x].sort().every((y, i) => y === want[i]);
const parents = Number(one('parents.txt') || '0');
const parent2 = one('parent2.txt') || 'none', laneTip = one('lanetip.txt');
const p1 = lines('since-parent1.txt'), j209 = lines('since-j209.txt');
const r = {
  parents, parent2, laneTip,
  isMerge: parents === 2 && parent2 !== 'none' ? 1 : 0,
  secondParentIsLaneTip: /^[0-9a-f]{40}$/.test(laneTip) && parent2 === laneTip ? 1 : 0,
  treeIsTip: one('tree-is-tip.txt') === '1' ? 1 : 0,
  mainIsJ209: one('main-is-j209.txt') === '1' ? 1 : 0,
  laneOnly: same(p1, LANE) ? 1 : 0,
  sinceJ209AsRead: same(j209, LANE) ? 1 : 0,
  bridgeFiles: p1.filter((x) => x.startsWith('bridge/src/')).length + j209.filter((x) => x.startsWith('bridge/src/')).length,
  sinceParent1: p1, sinceJ209: j209, other: p1.filter((x) => !LANE.includes(x)),
};
r.ok = r.isMerge && r.secondParentIsLaneTip && r.treeIsTip && r.mainIsJ209 && r.laneOnly && r.sinceJ209AsRead ? 1 : 0;
r.why = r.ok ? null : !r.isMerge ? "the pin is not a merge (no second parent): not D535's merge, the code check fails"
  : !r.secondParentIsLaneTip ? 'HEAD^2 is not the lane tip the job names'
    : !r.treeIsTip ? 'the pin differs from the lane tip under a path a match runs (another change merged there): redraft the job on the new main (D535 point 4)'
      : !r.mainIsJ209 ? "the merge's first parent differs from J209's pin 4e823718 under a match path: main moved there; redraft"
        : !r.laneOnly ? "the merge's change under a match path is not exactly players.json"
          : "the pin's difference from J209's pin under a match path is not exactly players.json";
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
if (!r.ok) { console.error(`J210 PILOT CODE CHECK FAILS: ${r.why}`); process.exitCode = 1; }
J210EOF
node var/j210-tools/codecheck.cjs $C var/j210-tools/search-diff.json
# the code check on synthetic answers: the good merge passes; no second parent, another second parent, a tree that is
# not the tip's, a main that moved, a lane that brought a second file, a lane that brought a bridge file, a second file
# since J209's pin, and a lane that brought nothing each fail
T=0123456789abcdef0123456789abcdef01234567
LANE1='tools/ai-ladder/players.json'
mkc() { d=var/j210-tools/code-selftest/$1; mkdir -p $d; echo "$2" > $d/parents.txt; echo "$3" > $d/parent2.txt; echo $T > $d/lanetip.txt; echo "$4" > $d/tree-is-tip.txt; echo "$5" > $d/main-is-j209.txt; printf '%s\n' $6 > $d/since-parent1.txt; printf '%s\n' $7 > $d/since-j209.txt; node var/j210-tools/codecheck.cjs $d $d/out.json > /dev/null 2>&1 || true; }
rm -rf var/j210-tools/code-selftest
mkc good 2 $T 1 1 "$LANE1" "$LANE1"
mkc noparent 1 none 1 1 "$LANE1" "$LANE1"
mkc otherparent 2 fedcba9876543210fedcba9876543210fedcba98 1 1 "$LANE1" "$LANE1"
mkc nottip 2 $T 0 1 "$LANE1" "$LANE1"
mkc mainmoved 2 $T 1 0 "$LANE1" "$LANE1"
mkc second 2 $T 1 1 "$LANE1 tools/ai-ladder/kinds.ts" "$LANE1 tools/ai-ladder/kinds.ts"
mkc bridge 2 $T 1 1 "$LANE1 bridge/src/mtgtable/ai/SearchPolicy.java" "$LANE1 bridge/src/mtgtable/ai/SearchPolicy.java"
mkc secondj209 2 $T 1 1 "$LANE1" "$LANE1 tools/ai-bench/AiBench.java"
mkc nothing 2 $T 1 1 "" ""
node -e 'const fs=require("fs");const r=(k)=>JSON.parse(fs.readFileSync(`var/j210-tools/code-selftest/${k}/out.json`,"utf8"));const ok=r("good").ok===1&&r("good").bridgeFiles===0&&r("noparent").ok===0&&r("noparent").isMerge===0&&r("otherparent").ok===0&&r("otherparent").secondParentIsLaneTip===0&&r("nottip").ok===0&&r("nottip").treeIsTip===0&&r("mainmoved").ok===0&&r("mainmoved").mainIsJ209===0&&r("mainmoved").laneOnly===1&&r("second").ok===0&&r("second").laneOnly===0&&r("bridge").ok===0&&r("bridge").laneOnly===0&&r("bridge").bridgeFiles===2&&r("secondj209").ok===0&&r("secondj209").sinceJ209AsRead===0&&r("secondj209").laneOnly===1&&r("nothing").ok===0&&r("nothing").laneOnly===0?1:0;fs.writeFileSync("var/j210-tools/code-selftest.json",JSON.stringify({ok,cases:9})+"\n");console.log(JSON.stringify({ok,cases:9}))'
```
```bash
cat > var/j210-tools/verdict.mjs <<'J210EOF'
// J210's verdict (D535 points 4 to 6): eight 1,200-game matches against forge-default on the same 600 deals, read
// paired by deal. A deal is D321's key (batch seed, deck pair, the game's block of four, the half); a corner's pair
// score on a deal is its wins over its decisive games there (draws dropped, as the ladder's pairScores does; a game
// that timed out counts as the ladder counted it). Delta(X, Y) is the mean over shared deals of X's pair score minus
// Y's, with a 95% interval of +-1.96 standard errors of those differences. Every value a check reads is a number.
// usage: node verdict.mjs <ref ladder dir> <night folder prefix> <match file prefix> <J194a match.json> <out.json>
//        node verdict.mjs --selftest <scratch dir>
// <match file prefix>-<corner>.json is each corner's match line (corners: none b a p ab pb pa pab); each corner's rows
// are read from its own ladder folder, <night folder prefix>-<corner>/results (a folder a match so each takes the
// host's first match blocks and a retried match replays the same deals), and J194 (a)'s (pab's config on the same
// deals at an earlier pin) from <ref ladder dir>/results by its own match line's id.
import fs from 'node:fs';
import path from 'node:path';

export const FORGE = { name: 'forge-default', hash: '3ed453ffef1c' };
export const CORNERS = [
  { key: 'none', name: 'policy-outlet', hash: 'e350d94649a4', what: '' },
  { key: 'b', name: 'search-v2-only-b', hash: 'c214a22644a2', what: 'b' },
  { key: 'a', name: 'search-v2-only-a', hash: '9f7945dd5b1b', what: 'a' },
  { key: 'p', name: 'search-v2-only-p', hash: 'cf536ce63aee', what: 'p' },
  { key: 'ab', name: 'search-v2-no-p', hash: 'd8508f47552b', what: 'ab' },
  { key: 'pb', name: 'search-v2-no-a', hash: 'ba2eafaee6fb', what: 'pb' },
  { key: 'pa', name: 'search-v2-no-b', hash: '59505e241363', what: 'pa' },
  { key: 'pab', name: 'search-v1-anytime', hash: 'cdd55e02a89c', what: 'pab' },
];
// the six partial arms in the order a tie on search time is broken (fewest kinds searched first)
export const PARTIAL = ['b', 'a', 'p', 'ab', 'pb', 'pa'];
export const BLOCK_LO = 114900000, BLOCK_HI = 114900149, BLOCKS = 150;
export const GAMES = 1200, MAX_BAD = 60, MIN_SHARED = 590;
/** D535 point 6: an arm is a candidate when Delta(all, arm)'s point is at most +0.014, compared in ten-thousandths. */
export const CAND_MAX_TTS = 140;

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const r1 = (x) => Math.round(x * 10) / 10;
const eloOf = (s) => (s <= 0 || s >= 1 ? 0 : -400 * Math.log10(1 / s - 1));

/** Every results row of <dir>/results/*.jsonl whose purpose is exactly `purpose`. */
export function rowsOf(dir, purpose) {
  const out = [];
  const rdir = path.join(dir, 'results');
  if (!purpose || !fs.existsSync(rdir)) return out;
  for (const f of fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')).sort()) {
    for (const line of fs.readFileSync(path.join(rdir, f), 'utf8').split('\n')) {
      if (!line.includes('"purpose":"match:')) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (r.purpose === purpose) out.push(r);
    }
  }
  return out;
}

/** One corner: its match line, its rows, its pair score on every deal, and the flags a check reads. */
export function corner(spec, dir, matchFile) {
  const m = read(matchFile);
  const names = m && m.a === spec.name && m.ah === spec.hash && m.b === FORGE.name && m.bh === FORGE.hash ? 1 : 0;
  const complete = names && m.complete === true && m.played === GAMES && num(m.errors) + num(m.timeouts) <= MAX_BAD ? 1 : 0;
  const rows = names && typeof m.id === 'string' ? rowsOf(dir, `match:${m.id}`) : [];
  const acc = new Map();
  const blocks = new Set();
  let other = 0, draws = 0, outOfRange = 0;
  for (const r of rows) {
    const armIsA = r.ah === spec.hash && r.bh === FORGE.hash;
    const armIsB = r.bh === spec.hash && r.ah === FORGE.hash;
    if (!armIsA && !armIsB) { other++; continue; }
    if (typeof r.bseed !== 'number' || typeof r.pair !== 'number' || typeof r.g !== 'number') { other++; continue; }
    blocks.add(r.bseed);
    if (r.bseed < BLOCK_LO || r.bseed > BLOCK_HI) outOfRange++;
    if (r.w === 'd') { draws++; continue; }
    if (r.w !== 'a' && r.w !== 'b') { other++; continue; }
    const q = r.g % 4;
    const key = `${r.bseed}:${r.pair}:${r.g - q}:${q === 0 || q === 3 ? 0 : 1}`;
    const e = acc.get(key) ?? { w: 0, n: 0 };
    e.n++;
    if ((r.w === 'a') === armIsA) e.w++;
    acc.set(key, e);
  }
  const scores = new Map([...acc].map(([k, e]) => [k, e.w / e.n]));
  const mean = scores.size ? [...scores.values()].reduce((t, x) => t + x, 0) / scores.size : 0;
  const b = [...blocks].sort((x, y) => x - y);
  const by = (m && m.aSearch && m.aSearch.byKind) || {};
  const searched = { p: num(by.p?.searched), a: num(by.a?.searched), b: num(by.b?.searched) };
  const aSearched = num(m?.aSearch?.searched), bSearched = num(m?.bSearch?.searched);
  const kindsOk = names && bSearched === 0 && aSearched === searched.p + searched.a + searched.b
    && ['p', 'a', 'b'].every((k) => (spec.what.includes(k) ? searched[k] > 0 : searched[k] === 0)) ? 1 : 0;
  const seedsOk = names && b.length === BLOCKS && outOfRange === 0 ? 1 : 0;
  const sidesOk = names && rows.length > 0 && other === 0 ? 1 : 0;
  const rowsAgree = names && rows.length === num(m.played) ? 1 : 0;
  const scoreAgrees = names && scores.size > 0 && Math.abs(mean - num(m.score)) <= 0.00006 ? 1 : 0;
  const valid = complete && kindsOk && seedsOk && sidesOk && rowsAgree && scoreAgrees ? 1 : 0;
  const msPerDecision = num(m?.aSearch?.msPerDecision);
  return {
    key: spec.key, name: spec.name, hash: spec.hash, what: spec.what, id: names ? m.id : '',
    present: m ? 1 : 0, names, complete, valid, kindsOk, seedsOk, sidesOk, rowsAgree, scoreAgrees,
    played: num(m?.played), errors: num(m?.errors), timeouts: num(m?.timeouts), rows: rows.length, other, draws,
    deals: scores.size, blocks: b.length, blockMin: b.length ? b[0] : 0, blockMax: b.length ? b[b.length - 1] : 0, outOfRange,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    pairMean: r5(mean), searched, searchedAll: aSearched, changed: num(m?.aSearch?.changed), msPerDecision,
    msPerGame: r1(msPerDecision * aSearched / (num(m?.played) || 1)),
    scores,
  };
}

/** Delta(X, Y), paired by deal. `read` is 1 only when both corners are valid and share at least MIN_SHARED deals. */
export function delta(X, Y) {
  const d = [];
  const xs = [], ys = [];
  if (X && Y) for (const [k, x] of X.scores) { const y = Y.scores.get(k); if (y !== undefined) { d.push(x - y); xs.push(x); ys.push(y); } }
  const n = d.length;
  const none = { read: 0, n, mean: 0, se: 0, lo: 0, hi: 0, rho: 0, eloAbout: 0, eloHalfAbout: 0 };
  if (n < 2) return none;
  const mean = d.reduce((t, x) => t + x, 0) / n;
  const v = d.reduce((t, x) => t + (x - mean) * (x - mean), 0) / (n - 1);
  const se = Math.sqrt(v / n);
  const mx = xs.reduce((t, x) => t + x, 0) / n, my = ys.reduce((t, x) => t + x, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const rho = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  // information: the difference in Elo words, at the two corners' own scores
  const p = Math.min(0.99, Math.max(0.01, (mx + my) / 2));
  const slope = 400 / (Math.LN10 * p * (1 - p));
  return {
    read: X.valid && Y.valid && n >= MIN_SHARED ? 1 : 0, n, mean: r5(mean), se: r5(se), lo: r5(mean - 1.96 * se), hi: r5(mean + 1.96 * se),
    rho: r5(rho), eloAbout: r1(eloOf(mx) - eloOf(my)), eloHalfAbout: r1(1.96 * se * slope),
  };
}

const three = (d, gate, up, down) => {
  const on = gate && d.read ? 1 : 0;
  return { ...d, read: on, [up]: on && d.lo > 0 ? 1 : 0, hurts: on && d.hi < 0 ? 1 : 0, notShown: on && !(d.lo > 0) && !(d.hi < 0) ? 1 : 0, unread: on ? 0 : 1 };
};

export function verdict(refDir, nightPrefix, prefix, refFile) {
  const C = Object.fromEntries(CORNERS.map((s) => [s.key, corner(s, `${nightPrefix}-${s.key}`, `${prefix}-${s.key}.json`)]));
  const ref = corner(CORNERS[7], refDir, refFile);
  const allNight = C.pab.valid ? 1 : 0;
  const allJ194 = !allNight && ref.valid ? 1 : 0;
  const ALL = allNight ? C.pab : allJ194 ? ref : null;
  const whole0 = delta(ALL, C.none);
  const whole = { ...whole0, above: whole0.read && whole0.lo > 0 ? 1 : 0 };
  const diagnose = whole.read && !whole.above ? 1 : 0;
  const gate = whole.above;
  const alone = {}, last = {}, cand = {};
  const NO = { p: 'ab', a: 'pb', b: 'pa' };
  for (const k of ['p', 'a', 'b']) {
    alone[k] = three(delta(C[k], C.none), gate, 'adds');
    last[k] = three(delta(ALL, C[NO[k]]), gate, 'needed');
  }
  // INTERACTION: all - only-p - only-a - only-b + 2 x none, over the deals all five have
  const iv = [];
  if (ALL) for (const [k, x] of ALL.scores) {
    const p = C.p.scores.get(k), a = C.a.scores.get(k), b = C.b.scores.get(k), z = C.none.scores.get(k);
    if (p !== undefined && a !== undefined && b !== undefined && z !== undefined) iv.push(x - p - a - b + 2 * z);
  }
  let interaction = { read: 0, n: iv.length, mean: 0, se: 0, lo: 0, hi: 0 };
  if (iv.length >= 2) {
    const mean = iv.reduce((t, x) => t + x, 0) / iv.length;
    const se = Math.sqrt(iv.reduce((t, x) => t + (x - mean) * (x - mean), 0) / (iv.length - 1) / iv.length);
    const ok = gate && ALL.valid && C.p.valid && C.a.valid && C.b.valid && C.none.valid && iv.length >= MIN_SHARED ? 1 : 0;
    interaction = { read: ok, n: iv.length, mean: r5(mean), se: r5(se), lo: r5(mean - 1.96 * se), hi: r5(mean + 1.96 * se) };
  }
  const replication = allNight ? delta(C.pab, ref) : { ...delta(null, null) };
  let taken = '', takenIndex = 0, candidates = 0;
  PARTIAL.forEach((k, i) => {
    const d = delta(ALL, C[k]);
    const on = gate && d.read ? 1 : 0;
    const is = on && Math.round(d.mean * 1e4) <= CAND_MAX_TTS ? 1 : 0;
    cand[k] = { name: C[k].name, read: on, n: d.n, mean: d.mean, lo: d.lo, hi: d.hi, eloAbout: d.eloAbout, eloHalfAbout: d.eloHalfAbout, candidate: is, msPerGame: C[k].msPerGame };
    if (is) {
      candidates++;
      if (!takenIndex || C[k].msPerGame < C[PARTIAL[takenIndex - 1]].msPerGame) { takenIndex = i + 1; taken = C[k].name; }
    }
  });
  const reads = [whole, ...Object.values(alone), ...Object.values(last), ...PARTIAL.map((k) => cand[k]), interaction].filter((d) => d.read);
  const list = Object.values(C);
  const corners = Object.fromEntries(list.map((c) => { const { scores, ...rest } = c; return [c.key, rest]; }));
  const { scores: _s, ...refOut } = ref;
  return {
    written: 1,
    names: list.every((c) => c.names) ? 1 : 0, present: list.filter((c) => c.present).length,
    complete: list.filter((c) => c.complete).length, valid: list.filter((c) => c.valid).length,
    kindsOk: list.filter((c) => c.kindsOk).length, seedsOk: list.filter((c) => c.seedsOk).length, sidesOk: list.filter((c) => c.sidesOk).length,
    rowsAgree: list.filter((c) => c.rowsAgree).length, scoresAgree: list.filter((c) => c.scoreAgrees).length,
    allNight, allJ194, refValid: ref.valid,
    whole, diagnose, gate,
    alone, last, interaction, replication,
    cand, candidates, takenIndex, taken, headToHead: candidates > 0 ? 1 : 0,
    readings: reads.length, sharedMin: reads.length ? Math.min(...reads.map((d) => d.n)) : 0,
    liveSeatChanged: 0,
    corners, ref: refOut,
  };
}

// ---------------------------------------------------------------- the self-test: synthetic nights

const BASE_T = { none: 40, b: 42, a: 45, p: 60, ab: 47, pb: 62, pa: 68, pab: 70 };
const MS = { none: 0, b: 60, a: 220, p: 640, ab: 280, pb: 700, pa: 860, pab: 930 };

/**
 * Write one synthetic night under `root`. A corner wins both games of deal i when (i * 37 + shift) % 100 < T, so two
 * corners on one shift differ on exactly |T1 - T2| deals in every hundred; `lose` flips the first N deals pab wins.
 */
function night(root, over = {}) {
  fs.rmSync(root, { recursive: true, force: true });
  const main = path.join(root, 'main');
  fs.mkdirSync(root, { recursive: true });
  const out = { main: [], ...Object.fromEntries(CORNERS.map((s) => [s.key, []])) };
  const mk = (spec, o, where, id, file) => {
    if (o.missing) return;
    const T = o.T ?? BASE_T[spec.key], shift = o.shift ?? 0, deals = o.deals ?? 600, off = o.seedOffset ?? 0;
    const hash = o.rowHash ?? spec.hash;
    let wins = 0, flipped = 0, drawn = 0, sum = 0, n = 0, rows = 0;
    for (let i = 0; i < deals; i++) {
      let win = (i * 37 + shift) % 100 < T;
      if (o.lose !== undefined) { win = (i * 37) % 100 < BASE_T.pab; if (win && flipped < o.lose) { win = false; flipped++; } }
      const half = i & 1, pair = (i >> 1) & 1, bseed = BLOCK_LO + (i >> 2) + off;
      const swap = i % 3 === 1; // some rows carry the arm as side b
      let decisive = 0, w = 0;
      for (const g of half === 0 ? [0, 3] : [1, 2]) {
        const draw = o.draws !== undefined && drawn < o.draws && g < 2 && i % 7 === 0;
        if (draw) drawn++;
        const res = draw ? 'd' : win === !swap ? 'a' : 'b';
        if (!draw) { decisive++; if (win) w++; }
        out[where].push(JSON.stringify({ purpose: `match:${id}`, a: swap ? FORGE.name : spec.name, b: swap ? spec.name : FORGE.name,
          ah: swap ? FORGE.hash : hash, bh: swap ? hash : FORGE.hash, pair, g, bseed, w: res, timeout: false, error: false }));
        rows++;
      }
      if (decisive) { sum += w / decisive; n++; }
      if (win) wins++;
    }
    const score = Math.round((n ? sum / n : 0.5) * 1e4) / 1e4;
    const kinds = o.kinds ?? Object.fromEntries([...spec.what].map((k) => [k, { searched: 1000, changed: 150 }]));
    const searched = Object.values(kinds).reduce((t, x) => t + x.searched, 0);
    const ms = o.ms ?? MS[spec.key];
    const line = {
      id, a: o.swapNames ? FORGE.name : spec.name, b: o.swapNames ? spec.name : FORGE.name,
      ah: o.swapNames ? FORGE.hash : (o.lineHash ?? spec.hash), bh: o.swapNames ? spec.hash : FORGE.hash,
      complete: o.complete ?? true, played: o.played ?? rows, errors: 0, timeouts: o.timeouts ?? 0,
      score: score + (o.scoreOff ?? 0), lo: score - 0.02, hi: score + 0.02, elo: r1(eloOf(score)), eloLo: r1(eloOf(score - 0.02)), eloHi: r1(eloOf(score + 0.02)),
      aSearch: { searched, changed: 0, byKind: kinds, msPerDecision: searched ? r1(ms * 1200 / searched) : null },
      bSearch: { searched: o.forgeSearched ?? 0, byKind: {}, msPerDecision: null },
    };
    fs.writeFileSync(file, JSON.stringify(line) + '\n');
  };
  for (const spec of CORNERS) mk(spec, over[spec.key] ?? {}, spec.key, `h:run-${spec.key}`, path.join(root, `match-${spec.key}.json`));
  mk(CORNERS[7], { shift: 3, ...(over.ref ?? {}) }, 'main', 'h:run-j194', path.join(root, 'match-ref.json'));
  // a row of another purpose that must never be counted
  out.none.push(JSON.stringify({ purpose: 'match:h:other', a: 'policy-outlet', b: FORGE.name, ah: 'e350d94649a4', bh: FORGE.hash, pair: 0, g: 0, bseed: BLOCK_LO, w: 'a' }));
  // the night's own pab rows are never read from the reference folder, nor J194 (a)'s from pab's
  for (const [where, rows] of Object.entries(out)) {
    const d = where === 'main' ? path.join(main, 'results') : path.join(root, `n-${where}`, 'results');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'h.jsonl'), rows.join('\n') + (rows.length ? '\n' : ''));
  }
  return verdict(main, path.join(root, 'n'), path.join(root, 'match'), path.join(root, 'match-ref.json'));
}

/** The paths the job's checks read: each must be a number in every synthetic night. */
const CHECKED = ['written', 'names', 'present', 'complete', 'valid', 'kindsOk', 'seedsOk', 'sidesOk', 'rowsAgree', 'scoresAgree', 'allNight', 'allJ194',
  'whole.read', 'whole.above', 'whole.n', 'diagnose', 'gate', 'candidates', 'takenIndex', 'headToHead', 'readings', 'sharedMin', 'liveSeatChanged',
  'interaction.read', 'replication.read',
  ...['p', 'a', 'b'].flatMap((k) => [`alone.${k}.adds`, `alone.${k}.hurts`, `alone.${k}.notShown`, `alone.${k}.unread`, `last.${k}.needed`, `last.${k}.hurts`, `last.${k}.notShown`, `last.${k}.unread`]),
  ...PARTIAL.map((k) => `cand.${k}.candidate`)];
const at = (v, p) => p.split('.').reduce((x, k) => (x === null || x === undefined ? undefined : x[k]), v);
const numbers = (v) => CHECKED.every((p) => typeof at(v, p) === 'number' && Number.isFinite(at(v, p)));
const oneEach = (v) => ['p', 'a', 'b'].every((k) => v.alone[k].adds + v.alone[k].hurts + v.alone[k].notShown + v.alone[k].unread === 1
  && v.last[k].needed + v.last[k].hurts + v.last[k].notShown + v.last[k].unread === 1);
const unreadAll = (v) => ['p', 'a', 'b'].every((k) => v.alone[k].unread === 1 && v.last[k].unread === 1) && v.candidates === 0 && v.interaction.read === 0;

export function selftest(scratch) {
  const cases = [
    ['the base night: every kind adds alone and is needed, no candidate', {},
      (v) => v.names === 1 && v.valid === 8 && v.allNight === 1 && v.allJ194 === 0 && v.whole.above === 1 && v.whole.mean === 0.3 && v.gate === 1 && v.diagnose === 0
        && ['p', 'a', 'b'].every((k) => v.alone[k].adds === 1 && v.last[k].needed === 1) && v.alone.b.mean === 0.02 && v.last.p.mean === 0.23 && v.last.a.mean === 0.08 && v.last.b.mean === 0.02
        && v.candidates === 0 && v.takenIndex === 0 && v.taken === '' && v.headToHead === 0 && v.interaction.read === 1 && v.interaction.mean === 0.03
        && v.replication.read === 1 && v.replication.mean === 0 && v.replication.lo < 0 && v.replication.hi > 0
        && v.sharedMin === 600 && v.readings === 14 && v.seedsOk === 8 && v.kindsOk === 8 && v.sidesOk === 8 && v.rowsAgree === 8 && v.scoresAgree === 8
        && v.corners.none.deals === 600 && v.corners.none.rows === 1200 && v.corners.pab.blocks === 150 && v.liveSeatChanged === 0],
    ['two candidates: the one with less search time a game is taken', { pa: { T: 69 }, pb: { T: 69 } },
      (v) => v.candidates === 2 && v.cand.pa.candidate === 1 && v.cand.pb.candidate === 1 && v.taken === 'search-v2-no-a' && v.takenIndex === 5 && v.headToHead === 1 && v.last.b.needed === 1],
    ['two candidates at the same search time: the earlier in the order is taken', { pa: { T: 69, ms: 700 }, pb: { T: 69, ms: 700 } },
      (v) => v.candidates === 2 && v.taken === 'search-v2-no-a' && v.takenIndex === 5],
    ['the candidate bar from below: 8 deals of 600 lost against all (0.0133) is a candidate', { pa: { lose: 8 } },
      (v) => v.cand.pa.candidate === 1 && v.cand.pa.mean === 0.01333 && v.candidates === 1 && v.taken === 'search-v2-no-b' && v.takenIndex === 6],
    ['the candidate bar from above: 9 deals of 600 (0.015) is not', { pa: { lose: 9 } },
      (v) => v.cand.pa.candidate === 0 && v.cand.pa.mean === 0.015 && v.candidates === 0 && v.takenIndex === 0],
    ['WHOLE not above 0: the night is diagnosed and nothing else is read', { pab: { T: 40, shift: 13 } },
      (v) => v.whole.read === 1 && v.whole.above === 0 && v.diagnose === 1 && v.gate === 0 && unreadAll(v) && v.headToHead === 0 && v.valid === 8],
    ['a kind that hurts alone', { a: { T: 30 } }, (v) => v.alone.a.hurts === 1 && v.alone.a.adds === 0 && v.alone.p.adds === 1],
    ['a kind whose search hurts when the others are searched: its arm is a candidate', { pa: { T: 75 } },
      (v) => v.last.b.hurts === 1 && v.last.b.needed === 0 && v.cand.pa.candidate === 1 && v.cand.pa.mean === -0.05 && v.taken === 'search-v2-no-b'],
    ['intervals that include 0 are NOT SHOWN, never no effect', { b: { T: 40, shift: 13 }, pa: { T: 70, shift: 13 } },
      (v) => v.alone.b.notShown === 1 && v.alone.b.adds === 0 && v.alone.b.hurts === 0 && v.last.b.notShown === 1 && v.cand.pa.candidate === 1],
    ['a corner cut short gives no reading that uses it', { p: { complete: false, deals: 400 } },
      (v) => v.complete === 7 && v.valid === 7 && v.alone.p.unread === 1 && v.interaction.read === 0 && v.cand.p.candidate === 0 && v.cand.p.read === 0
        && v.alone.a.adds === 1 && v.last.p.needed === 1 && v.gate === 1],
    ['all cut short: LAST, WHOLE and the candidates are read against J194 (a)', { pab: { complete: false, deals: 300 } },
      (v) => v.allNight === 0 && v.allJ194 === 1 && v.whole.read === 1 && v.whole.above === 1 && v.last.p.unread === 0 && v.replication.read === 0 && v.valid === 7],
    ['all missing and J194 (a) missing: nothing is read', { pab: { missing: true }, ref: { missing: true } },
      (v) => v.present === 7 && v.allNight === 0 && v.allJ194 === 0 && v.whole.read === 0 && v.diagnose === 0 && v.gate === 0 && unreadAll(v) && v.names === 0],
    ['another hash in a match file: that corner is not read', { a: { lineHash: '000000000000' } },
      (v) => v.names === 0 && v.valid === 7 && v.alone.a.unread === 1 && v.alone.p.adds === 1],
    ['the players swapped in a match file', { b: { swapNames: true } }, (v) => v.names === 0 && v.valid === 7 && v.alone.b.unread === 1],
    ['rows of another config under the match id', { a: { rowHash: 'ffffffffffff' } }, (v) => v.sidesOk === 7 && v.valid === 7 && v.alone.a.unread === 1 && v.corners.a.other === 1200],
    ['a match on other deal blocks', { ab: { seedOffset: 150 } }, (v) => v.seedsOk === 7 && v.valid === 7 && v.last.p.unread === 1 && v.corners.ab.outOfRange === 1200 && v.corners.ab.blockMin === 114900150],
    ['fewer than 590 shared deals', { b: { deals: 500, played: 1000 } }, (v) => v.alone.b.unread === 1 && v.alone.b.n === 500 && v.complete === 7],
    ['an unsearched kind with searched decisions', { a: { kinds: { a: { searched: 900, changed: 1 }, p: { searched: 5, changed: 0 } } } },
      (v) => v.kindsOk === 7 && v.valid === 7 && v.alone.a.unread === 1],
    ['a searched kind with none', { pa: { kinds: { p: { searched: 900, changed: 1 } } } }, (v) => v.kindsOk === 7 && v.last.b.unread === 1],
    ['the corner with no search searched', { none: { kinds: { p: { searched: 3, changed: 0 } } } }, (v) => v.kindsOk === 7 && v.whole.read === 0 && unreadAll(v)],
    ['Forge\'s side searched', { p: { forgeSearched: 4 } }, (v) => v.kindsOk === 7 && v.alone.p.unread === 1],
    ['draws are dropped from a deal, as the ladder drops them', { p: { draws: 10 } },
      (v) => v.corners.p.draws === 10 && v.corners.p.deals === 600 && v.valid === 8 && v.alone.p.adds === 1 && v.alone.p.mean === 0.2],
    ['a match line whose score is not its rows\'', { a: { scoreOff: 0.01 } }, (v) => v.scoresAgree === 7 && v.valid === 7 && v.alone.a.unread === 1],
    ['J194 (a) under another hash: no replication, the night unchanged', { ref: { lineHash: '111111111111' } },
      (v) => v.refValid === 0 && v.replication.read === 0 && v.allNight === 1 && v.whole.above === 1 && v.readings === 14],
    ['too many timeouts in a match', { pb: { timeouts: 61 } }, (v) => v.complete === 7 && v.last.a.unread === 1],
  ];
  let passed = 0;
  for (const [what, over, pred] of cases) {
    const v = night(path.join(scratch, `case-${cases.findIndex((c) => c[0] === what)}`), over);
    let ok = false;
    try { ok = !!pred(v) && numbers(v) && oneEach(v) && v.diagnose + v.gate <= 1 && (v.gate === 1 || v.candidates === 0) && (v.takenIndex > 0) === (v.candidates > 0); } catch { ok = false; }
    if (ok) passed++;
    console.error(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  }
  return { selftest: 1, cases: cases.length, passed, ok: passed === cases.length ? 1 : 0 };
}

const argv = process.argv.slice(2);
if (argv[0] === '--selftest' && argv[1]) {
  const r = selftest(argv[1]);
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
} else if (argv.length === 5) {
  const r = verdict(argv[0], argv[1], argv[2], argv[3]);
  fs.writeFileSync(argv[4], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <ref ladder dir> <night folder prefix> <match file prefix> <J194a match.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J210EOF
# the verdict on its own synthetic nights (25 cases: every reading fires, every value a check reads is a number)
rm -rf var/j210-tools/selftest
node var/j210-tools/verdict.mjs --selftest var/j210-tools/selftest > var/j210-tools/selftest.json || true
cat var/j210-tools/selftest.json
# the verdict on this host's real J194 (a) rows, with no night file present: the reference is read and valid (1,200
# games, 600 deals, 150 blocks), no corner is, and nothing is read
mkdir -p var/ai-ladder-pilot/J210
node var/j210-tools/verdict.mjs var/ai-ladder var/ai-ladder-pilot/J210/nonight var/ai-ladder-pilot/J210/nomatch var/ai-ladder/match-J194a.json var/j210-tools/verdict-ref.json > /dev/null || true
node -e 'const fs=require("fs");let v={};try{v=JSON.parse(fs.readFileSync("var/j210-tools/verdict-ref.json","utf8"))}catch(e){}const n=(x)=>typeof x==="number"?x:-1;const ref=v.ref||{};const r={written:n(v.written),refValid:n(v.refValid),allJ194:n(v.allJ194),present:n(v.present),valid:n(v.valid),readings:n(v.readings),candidates:n(v.candidates),refPlayed:n(ref.played),refDeals:n(ref.deals),refBlocks:n(ref.blocks),refScore:n(ref.score)};fs.writeFileSync("var/j210-tools/pv.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
cat > var/j210-tools/cfgs.cjs <<'J210EOF'
// J210's config reader: every batch line of a match carries exactly the two config strings the night means.
// A batch line names its two seats by their ai-bench config strings (`a`, `b`); the match file gives the run whose
// batches are read. ok = at least one line, and every line's A is <want A> and its B <want B>.
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
J210EOF
# the config reader on a synthetic batch: three lines, one with config A as wanted and two with config B as wanted
rm -rf var/j210-tools/cfg-selftest
mkdir -p var/j210-tools/cfg-selftest/batches/run-c
A="$(cat var/j210-tools/cfg-a.txt)"
printf '%s\n' '{"a":"'"$A"'","b":"Default"}' '{"a":"'"${A/what=a,/what=pa,}"'","b":"Default"}' '{"a":"Default","b":"'"$A"'"}' > var/j210-tools/cfg-selftest/batches/run-c/b0.jsonl
echo '{"id":"h:run-c"}' > var/j210-tools/cfg-selftest/match.json
node var/j210-tools/cfgs.cjs var/j210-tools/cfg-selftest var/j210-tools/cfg-selftest/match.json "$A" Default var/j210-tools/cfg-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j210-tools/cfg-selftest/out.json","utf8"));const ok=r.lines===3&&r.aExact===1&&r.bExact===2&&r.aOther===2&&r.bOther===1&&r.ok===0?1:0;require("fs").writeFileSync("var/j210-tools/cfg-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
cat > var/j210-tools/kinds.cjs <<'J210EOF'
// J210's kinds reader: from one match file, who played (names and hashes as wanted, against forge-default) and how many
// decisions of each kind the arm's side searched (aSearch.byKind; a kind never searched has no key and reads 0), the
// arm's total, Forge's side's total (must be 0) and the arm's wall-clock a searched decision. Every value is a number.
// usage: node kinds.cjs <match.json> <want A name> <want A hash> <out.json>
const fs = require('fs');
const [file, wantA, wantAh, out] = process.argv.slice(2);
let m = null;
try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { m = null; }
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const by = (m && m.aSearch && m.aSearch.byKind) || {};
const r = {
  names: m && m.a === wantA && m.ah === wantAh && m.b === 'forge-default' && m.bh === '3ed453ffef1c' ? 1 : 0,
  played: num(m && m.played), complete: m && m.complete === true ? 1 : 0, bad: num(m && m.errors) + num(m && m.timeouts),
  p: num(by.p && by.p.searched), a: num(by.a && by.a.searched), b: num(by.b && by.b.searched),
  searched: num(m && m.aSearch && m.aSearch.searched), forge: num(m && m.bSearch && m.bSearch.searched),
  ms: num(m && m.aSearch && m.aSearch.msPerDecision),
};
r.sums = r.searched === r.p + r.a + r.b ? 1 : 0;
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J210EOF
# the kinds reader on synthetic match files: an attacks-only match as written, the same under another hash, a total
# that is not its kinds' sum, and a missing file
rm -rf var/j210-tools/kinds-selftest
mkdir -p var/j210-tools/kinds-selftest
echo '{"a":"search-v2-only-a","ah":"9f7945dd5b1b","b":"forge-default","bh":"3ed453ffef1c","played":4,"complete":true,"errors":0,"timeouts":1,"aSearch":{"searched":7,"byKind":{"a":{"searched":7,"changed":1}},"msPerDecision":812.5},"bSearch":{"searched":0,"byKind":{},"msPerDecision":null}}' > var/j210-tools/kinds-selftest/good.json
echo '{"a":"search-v2-only-a","ah":"000000000000","b":"forge-default","bh":"3ed453ffef1c","played":4,"complete":false,"errors":0,"timeouts":0,"aSearch":{"searched":9,"byKind":{"a":{"searched":7,"changed":1}},"msPerDecision":812.5},"bSearch":{"searched":2,"byKind":{},"msPerDecision":null}}' > var/j210-tools/kinds-selftest/bad.json
node var/j210-tools/kinds.cjs var/j210-tools/kinds-selftest/good.json search-v2-only-a 9f7945dd5b1b var/j210-tools/kinds-selftest/good-out.json
node var/j210-tools/kinds.cjs var/j210-tools/kinds-selftest/bad.json search-v2-only-a 9f7945dd5b1b var/j210-tools/kinds-selftest/bad-out.json
node var/j210-tools/kinds.cjs var/j210-tools/kinds-selftest/absent.json search-v2-only-a 9f7945dd5b1b var/j210-tools/kinds-selftest/absent-out.json
node -e 'const fs=require("fs");const r=(k)=>JSON.parse(fs.readFileSync(`var/j210-tools/kinds-selftest/${k}-out.json`,"utf8"));const g=r("good"),b=r("bad"),x=r("absent");const ok=g.names===1&&g.played===4&&g.complete===1&&g.bad===1&&g.p===0&&g.a===7&&g.b===0&&g.searched===7&&g.forge===0&&g.ms===812.5&&g.sums===1&&b.names===0&&b.complete===0&&b.sums===0&&b.forge===2&&x.names===0&&x.played===0&&x.complete===0&&x.searched===0&&x.sums===1?1:0;fs.writeFileSync("var/j210-tools/kinds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
```
```bash
# three pilot matches of 4 games (one batch of one deck pair, one worker each), in the pilot's own ladder folder and
# seed range: attacks alone, priority and blocks, blocks alone; the kinds reader and the config reader on each
P=var/ai-ladder-pilot/J210
./tools/ai-ladder.sh match search-v2-only-a forge-default --games 4 --batch-pairs 1 --host j210-pilot --purpose pilot --dir $P --experiments $P/experiments.jsonl --out $P/match-a.json --jobs 1
node var/j210-tools/kinds.cjs $P/match-a.json search-v2-only-a 9f7945dd5b1b var/j210-tools/kinds-pilot-a.json
node var/j210-tools/cfgs.cjs $P $P/match-a.json "$(cat var/j210-tools/cfg-a.txt)" "$(cat var/j210-tools/cfg-forge.txt)" var/j210-tools/cfgs-pilot-a.json
./tools/ai-ladder.sh match search-v2-no-a forge-default --games 4 --batch-pairs 1 --host j210-pilot --purpose pilot --dir $P --experiments $P/experiments.jsonl --out $P/match-pb.json --jobs 1
node var/j210-tools/kinds.cjs $P/match-pb.json search-v2-no-a ba2eafaee6fb var/j210-tools/kinds-pilot-pb.json
node var/j210-tools/cfgs.cjs $P $P/match-pb.json "$(cat var/j210-tools/cfg-pb.txt)" "$(cat var/j210-tools/cfg-forge.txt)" var/j210-tools/cfgs-pilot-pb.json
./tools/ai-ladder.sh match search-v2-only-b forge-default --games 4 --batch-pairs 1 --host j210-pilot --purpose pilot --dir $P --experiments $P/experiments.jsonl --out $P/match-b.json --jobs 1
node var/j210-tools/kinds.cjs $P/match-b.json search-v2-only-b c214a22644a2 var/j210-tools/kinds-pilot-b.json
node var/j210-tools/cfgs.cjs $P $P/match-b.json "$(cat var/j210-tools/cfg-b.txt)" "$(cat var/j210-tools/cfg-forge.txt)" var/j210-tools/cfgs-pilot-b.json
```
metrics: merged = sh: cat var/j210-merged.txt 2>/dev/null || echo 0
metrics: dst = sh: cat var/j210-decision-selftest.json 2>/dev/null || echo '{"ok":0,"checks":0,"failures":-1}'
metrics: pl = sh: cat var/j210-tools/players.json 2>/dev/null || echo '{"ok":0,"present":0,"forge_ok":0,"none_ok":0,"v1_cfg_ok":0,"arms_ok":0,"hashesAsD535":0,"distinctHashes":0}'
metrics: sd = sh: cat var/j210-tools/search-diff.json 2>/dev/null || echo '{"ok":0,"parents":0,"isMerge":0,"secondParentIsLaneTip":0,"treeIsTip":0,"mainIsJ209":0,"laneOnly":0,"sinceJ209AsRead":0,"bridgeFiles":-1}'
metrics: cst = sh: cat var/j210-tools/code-selftest.json 2>/dev/null || echo '{"ok":0,"cases":0}'
metrics: st = sh: cat var/j210-tools/selftest.json 2>/dev/null || echo '{"ok":0,"cases":0,"passed":0}'
metrics: pv = sh: cat var/j210-tools/pv.json 2>/dev/null || echo '{"written":0,"refValid":0,"allJ194":0,"present":-1,"valid":-1,"readings":-1,"candidates":-1,"refPlayed":0,"refDeals":0,"refBlocks":0,"refScore":0}'
metrics: cfst = sh: cat var/j210-tools/cfg-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: kst = sh: cat var/j210-tools/kinds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: ka = sh: cat var/j210-tools/kinds-pilot-a.json 2>/dev/null || echo '{"names":0,"played":0,"complete":0,"bad":0,"p":-1,"a":-1,"b":-1,"searched":-1,"forge":-1,"ms":0,"sums":0}'
metrics: kpb = sh: cat var/j210-tools/kinds-pilot-pb.json 2>/dev/null || echo '{"names":0,"played":0,"complete":0,"bad":0,"p":-1,"a":-1,"b":-1,"searched":-1,"forge":-1,"ms":0,"sums":0}'
metrics: kb = sh: cat var/j210-tools/kinds-pilot-b.json 2>/dev/null || echo '{"names":0,"played":0,"complete":0,"bad":0,"p":-1,"a":-1,"b":-1,"searched":-1,"forge":-1,"ms":0,"sums":0}'
metrics: pca = sh: cat var/j210-tools/cfgs-pilot-a.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: pcpb = sh: cat var/j210-tools/cfgs-pilot-pb.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
metrics: pcb = sh: cat var/j210-tools/cfgs-pilot-b.json 2>/dev/null || echo '{"lines":0,"aExact":0,"bExact":0,"ok":0}'
check: merged == 1
check: dst.ok == 1
check: dst.checks >= 392
check: pl.ok == 1
check: pl.forge_ok == 1
check: pl.none_ok == 1
check: pl.v1_cfg_ok == 1
check: pl.arms_ok == 6
check: pl.hashesAsD535 == 1
check: pl.distinctHashes == 1
check: sd.ok == 1
check: sd.parents == 2
check: sd.isMerge == 1
check: sd.secondParentIsLaneTip == 1
check: sd.treeIsTip == 1
check: sd.mainIsJ209 == 1
check: sd.laneOnly == 1
check: sd.sinceJ209AsRead == 1
check: sd.bridgeFiles == 0
check: cst.ok == 1
check: st.ok == 1
check: st.cases == 25
check: st.passed == 25
check: pv.written == 1
check: pv.refValid == 1
check: pv.allJ194 == 1
check: pv.refPlayed == 1200
check: pv.refDeals == 600
check: pv.refBlocks == 150
check: pv.present == 0
check: pv.valid == 0
check: pv.readings == 0
check: pv.candidates == 0
check: cfst.ok == 1
check: kst.ok == 1
check: ka.names == 1
check: ka.complete == 1
check: ka.played == 4
check: ka.bad <= 1
check: ka.a >= 1
check: ka.p == 0
check: ka.b == 0
check: ka.forge == 0
check: ka.sums == 1
check: ka.ms < 1500
check: kpb.names == 1
check: kpb.complete == 1
check: kpb.played == 4
check: kpb.bad <= 1
check: kpb.p >= 10
check: kpb.a == 0
check: kpb.forge == 0
check: kpb.sums == 1
check: kpb.ms < 1500
check: kb.names == 1
check: kb.complete == 1
check: kb.played == 4
check: kb.bad <= 1
check: kb.p == 0
check: kb.a == 0
check: kb.forge == 0
check: kb.sums == 1
check: pca.ok == 1
check: pca.lines >= ka.played
check: pcpb.ok == 1
check: pcpb.lines >= kpb.played
check: pcb.ok == 1
check: pcb.lines >= kb.played

The pilot asks only whether anything is broken, and whether the night can be read as D535 registered it:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass, and `dst`: the build's decision self-test ran with 0 failures and at least 392
  checks (the count J209's pilot printed; this lane adds no Java);
- the players resolve on this PC: `pl.forge_ok` says the anchor is `Default` under hash `3ed453ffef1c`, `pl.none_ok`
  that `policy-outlet` is `Default+outlets`, `pl.v1_cfg_ok` that `search-v1-anytime` is search-v2's config string as
  every job since J194 has read it, `pl.arms_ok` counts the partial arms (six) whose config is that string with its own
  `what=` for `what=pab` and nothing else, `pl.hashesAsD535` that the nine hashes are D535's, `pl.distinctHashes`
  that no two are the same (no name is a second name for another's config);
- `sd`, the code by content (D535 point 4; HEAD is the runner's checkout of the pin): the pin is a merge (two parents;
  a pin with no second parent writes `none` and fails here, never passes), its second parent is the lane tip the job
  names, its tree under every path a match runs is the lane tip's (`sd.treeIsTip`), its first parent there is J209's
  pin `4e823718` (`sd.mainIsJ209`), and there the merge changed exactly one file, `tools/ai-ladder/players.json`
  (`sd.laneOnly`), which is also exactly its difference from `4e823718` (`sd.sinceJ209AsRead`): nothing under
  `bridge/src` (`sd.bridgeFiles`). If any part fails (`sd.why`), the job does not run: it is redrafted on the new
  main; nothing is replayed. `cst.ok`: the check itself on nine synthetic sets of answers;
- the verdict script reads twenty-five synthetic nights (`st`): the base night, a candidate and two (the one with
  less search time a game taken, a tie going to the earlier in the order), the candidate bar from both sides in
  whole deals, WHOLE not above 0 (the night diagnosed, nothing else read), a kind that hurts alone or with the
  others, intervals that include 0 as NOT SHOWN, a corner cut short, missing, under another hash, with its players
  swapped, with rows of another config, on other deal blocks, with too few shared deals, with a kind searched that
  should not be or the reverse, with Forge's side searching, with draws, with a match line that is not its rows', with
  too many timeouts, and `all` read from J194 (a) when the night's own is cut short; every value a check reads is a
  number in every one;
- `pv`: the same script on this host's real J194 (a) rows with no night file: the reference match is read and valid
  (1,200 games, 600 deals over 150 blocks), no corner is present, and nothing is read. `pv.refScore` is read, not
  checked (0.6233 as J194 reported it);
- the readers read synthetic files as written (`cfst.ok`: the config reader; `kst.ok`: the kinds reader);
- in 4 games each: `search-v2-only-a` searched at least one attack, no priority decision and no block (`ka`);
  `search-v2-no-a` searched at least ten priority decisions and no attack (`kpb`); `search-v2-only-b` searched no
  priority decision and no attack (`kb`); in each the match line names the arm and the anchor under D535's hashes,
  the arm's total is the sum of its kinds, Forge's side searched nothing, at most one game ended in an error or a
  timeout, every batch line's config A is exactly the arm's and config B exactly `Default`, and a searched decision
  stays under the 1.5 s budget on average.

Read, not checked: `sd.sinceParent1` and `sd.sinceJ209` (the file lists); how many blocks `search-v2-only-b`
searched in 4 games (`kb.b`, about 6 at search-v2's rate, and 0 is possible in four short games) and
`search-v2-no-a` (`kpb.b`); each arm's wall-clock a searched decision.

There are no win-rate bounds. The matches are the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J210-none.json var/j210-none
```bash
# corner 1 of 8, none: policy-outlet (e350d94649a4, the search off) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-none var/ai-ladder/match-J210-none.json
echo "J210 1/8: policy-outlet against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match policy-outlet forge-default --dir var/j210-none --games 1200 --hours 1 --out var/ai-ladder/match-J210-none.json --jobs {workers}
tail -1 var/j210-none/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-b.json var/j210-b
```bash
# corner 2 of 8, b: search-v2-only-b (c214a22644a2, what=b: it searches blocks) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-b var/ai-ladder/match-J210-b.json
echo "J210 2/8: search-v2-only-b against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-only-b forge-default --dir var/j210-b --games 1200 --hours 1 --out var/ai-ladder/match-J210-b.json --jobs {workers}
tail -1 var/j210-b/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-a.json var/j210-a
```bash
# corner 3 of 8, a: search-v2-only-a (9f7945dd5b1b, what=a: it searches attacks) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-a var/ai-ladder/match-J210-a.json
echo "J210 3/8: search-v2-only-a against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-only-a forge-default --dir var/j210-a --games 1200 --hours 1.5 --out var/ai-ladder/match-J210-a.json --jobs {workers}
tail -1 var/j210-a/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-p.json var/j210-p
```bash
# corner 4 of 8, p: search-v2-only-p (cf536ce63aee, what=p: it searches priority) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-p var/ai-ladder/match-J210-p.json
echo "J210 4/8: search-v2-only-p against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-only-p forge-default --dir var/j210-p --games 1200 --hours 2.5 --out var/ai-ladder/match-J210-p.json --jobs {workers}
tail -1 var/j210-p/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-ab.json var/j210-ab
```bash
# corner 5 of 8, ab: search-v2-no-p (d8508f47552b, what=ab: it searches attacks and blocks) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-ab var/ai-ladder/match-J210-ab.json
echo "J210 5/8: search-v2-no-p against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-no-p forge-default --dir var/j210-ab --games 1200 --hours 1.5 --out var/ai-ladder/match-J210-ab.json --jobs {workers}
tail -1 var/j210-ab/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-pb.json var/j210-pb
```bash
# corner 6 of 8, pb: search-v2-no-a (ba2eafaee6fb, what=pb: it searches priority and blocks) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-pb var/ai-ladder/match-J210-pb.json
echo "J210 6/8: search-v2-no-a against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-no-a forge-default --dir var/j210-pb --games 1200 --hours 2.5 --out var/ai-ladder/match-J210-pb.json --jobs {workers}
tail -1 var/j210-pb/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-pa.json var/j210-pa
```bash
# corner 7 of 8, pa: search-v2-no-b (59505e241363, what=pa: it searches priority and attacks) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-pa var/ai-ladder/match-J210-pa.json
echo "J210 7/8: search-v2-no-b against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v2-no-b forge-default --dir var/j210-pa --games 1200 --hours 3 --out var/ai-ladder/match-J210-pa.json --jobs {workers}
tail -1 var/j210-pa/match.jsonl
```
cores: 7
clean: var/ai-ladder/match-J210-pab.json var/j210-pab
```bash
# corner 8 of 8, pab: search-v1-anytime (cdd55e02a89c, what=pab: it searches everything (search-v2 itself)) against forge-default, 1,200 games on the confirm set, in a
# ladder folder of its own, emptied here, so this match is dealt blocks 114,900,000-114,900,149 whatever ran before
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
rm -rf var/j210-pab var/ai-ladder/match-J210-pab.json
echo "J210 8/8: search-v1-anytime against forge-default, 1,200 games on the confirm set"
./tools/ai-ladder.sh match search-v1-anytime forge-default --dir var/j210-pab --games 1200 --hours 3 --out var/ai-ladder/match-J210-pab.json --jobs {workers}
tail -1 var/j210-pab/match.jsonl
```
cores: 1
clean: var/j210/verdict.json var/j210/v.json var/j210/report.md var/j210/cfgs.json
```bash
# the reading: the verdict over the eight folders and match lines and J194 (a)'s rows, each corner's batch lines'
# config strings, and the report. Nothing here plays a game; a reading is never a failure of the job.
test -f var/j210-tools/verdict.mjs
mkdir -p var/j210
node var/j210-tools/verdict.mjs var/ai-ladder var/j210 var/ai-ladder/match-J210 var/ai-ladder/match-J194a.json var/j210/verdict.json > /dev/null
# the checks' copy: the verdict without its per-corner detail (every value a number; the strings are dropped by the runner)
node -e 'const fs=require("fs");const v=JSON.parse(fs.readFileSync("var/j210/verdict.json","utf8"));delete v.corners;delete v.ref;fs.writeFileSync("var/j210/v.json",JSON.stringify(v)+"\n");console.log(JSON.stringify(v))'
FORGE="$(cat var/j210-tools/cfg-forge.txt)"
for k in none b a p ab pb pa pab; do
  node var/j210-tools/cfgs.cjs var/j210-$k var/ai-ladder/match-J210-$k.json "$(cat var/j210-tools/cfg-$k.txt)" "$FORGE" var/j210/cfgs-$k.json
done
node -e 'const fs=require("fs");let ok=0,lines=0,corners=0;const by={};for(const k of ["none","b","a","p","ab","pb","pa","pab"]){let r={};try{r=JSON.parse(fs.readFileSync("var/j210/cfgs-"+k+".json","utf8"))}catch(e){}corners++;ok+=r.ok===1?1:0;lines+=typeof r.lines==="number"?r.lines:0;by[k]={lines:r.lines||0,aExact:r.aExact||0,bExact:r.bExact||0,ok:r.ok===1?1:0}}const o={corners,ok,lines,by};fs.writeFileSync("var/j210/cfgs.json",JSON.stringify(o)+"\n");console.log(JSON.stringify(o))'
node - <<'J210EOF'
// J210's report: the night's own numbers and D535's readings as flags. It words no result; summary.md does.
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const v = read('var/j210/verdict.json'), cf = read('var/j210/cfgs.json');
const KEYS = ['none', 'b', 'a', 'p', 'ab', 'pb', 'pa', 'pab'];
const SEARCHED = { none: 'nothing', b: 'blocks', a: 'attacks', p: 'priority', ab: 'attacks and blocks', pb: 'priority and blocks', pa: 'priority and attacks', pab: 'everything' };
const KIND = { p: 'priority', a: 'attacks', b: 'blocks' };
const NO = { p: 'ab', a: 'pb', b: 'pa' };
const C = v.corners || {}, R = v.ref || {};
const runStart = (id) => { const z = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || ''); return z ? Date.UTC(+z[1], +z[2] - 1, +z[3], +z[4], +z[5], +z[6]) : null; };
const hours = (x) => { const t0 = runStart(x.id), t1 = typeof x.at === 'string' ? Date.parse(x.at) : null; return t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null; };
const s4 = (y) => (typeof y === 'number' ? (y >= 0 ? '+' : '') + y.toFixed(4) : '-');
const dl = (d) => (d && d.n ? `${s4(d.mean)} [${s4(d.lo)}, ${s4(d.hi)}]` : '-');
const el = (d) => (d && d.n ? `${d.eloAbout >= 0 ? '+' : ''}${d.eloAbout} +-${d.eloHalfAbout}` : '-');
const shut = (v.whole || {}).read === 1 && v.gate === 0;
const flag = (d, up, name) => (!d || d.unread ? (shut ? 'not read: the gate is closed (the numbers are for the diagnosis)' : 'not read') : d[up] ? name[0] : d.hurts ? name[1] : name[2]);
const f4 = (y) => (typeof y === 'number' ? String(Math.round(y * 1e4) / 1e4) : '-');
const allIs = v.allNight ? "the night's own all corner" : v.allJ194 ? "J194 (a)'s rows (the night's all corner is not valid: D535 point 8)" : 'nothing (no valid all corner, on the night or from J194 (a))';
const L = ['# J210: where the search\'s strength is, by decision kind (D535)', ''];
L.push(`Corners valid ${v.valid ?? 0} of 8 (present ${v.present ?? 0}, complete ${v.complete ?? 0}, names and hashes as D535's on all eight: ${v.names ?? 0}). \`all\` is read from ${allIs}. WHOLE read ${(v.whole || {}).read ?? 0}, above 0: ${(v.whole || {}).above ?? 0}; the gate is open: ${v.gate ?? 0}; the night is diagnosed first: ${v.diagnose ?? 0}. Readings read ${v.readings ?? 0} of 14, on at least ${v.sharedMin ?? 0} shared deals each. Candidates ${v.candidates ?? 0}${v.taken ? `, taken forward: ${v.taken}` : ''}; a head-to-head is owed: ${v.headToHead ?? 0}. Live seat changed: ${v.liveSeatChanged ?? 0}.`, '');
L.push('## The eight matches, each against forge-default', '');
L.push('| corner | player (hash) | searched | played / rows | complete | valid | score [95%] | Elo [95%] | draws, errors, timeouts | searched p / a / b | changed | ms a searched decision | search s a game | deals, blocks (first to last) | config lines exact A, B of lines | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
let total = 0;
for (const k of KEYS) {
  const c = C[k] || {}, m = read(`var/ai-ladder/match-J210-${k}.json`), q = (cf.by || {})[k] || {};
  const h = hours(m);
  if (h !== null) total += h;
  const sc = c.searched || {};
  L.push(`| ${k} | ${c.name ?? '-'} (${c.hash ?? '-'}) | ${SEARCHED[k]} | ${c.played ?? 0} / ${c.rows ?? 0} | ${c.complete ?? 0} | ${c.valid ?? 0} | ${f4(c.score)} [${f4(c.lo)}, ${f4(c.hi)}] | ${c.elo ?? '-'} [${c.eloLo ?? '-'}, ${c.eloHi ?? '-'}] | ${c.draws ?? '-'}, ${c.errors ?? '-'}, ${c.timeouts ?? '-'} | ${sc.p ?? 0} / ${sc.a ?? 0} / ${sc.b ?? 0} | ${c.changed ?? 0} | ${c.msPerDecision ?? '-'} | ${typeof c.msPerGame === 'number' ? (c.msPerGame / 1000).toFixed(1) : '-'} | ${c.deals ?? 0}, ${c.blocks ?? 0} (${c.blockMin ?? '-'} to ${c.blockMax ?? '-'}) | ${q.aExact ?? '-'}, ${q.bExact ?? '-'} of ${q.lines ?? '-'} | ${h ?? '-'} |`);
}
const rs = R.searched || {};
L.push(`| J194 (a), information | ${R.name ?? '-'} (${R.hash ?? '-'}) at pin 72302c69 | everything | ${R.played ?? 0} / ${R.rows ?? 0} | ${R.complete ?? 0} | ${R.valid ?? 0} | ${f4(R.score)} [${f4(R.lo)}, ${f4(R.hi)}] | ${R.elo ?? '-'} [${R.eloLo ?? '-'}, ${R.eloHi ?? '-'}] | ${R.draws ?? '-'}, ${R.errors ?? '-'}, ${R.timeouts ?? '-'} | ${rs.p ?? 0} / ${rs.a ?? 0} / ${rs.b ?? 0} | ${R.changed ?? 0} | ${R.msPerDecision ?? '-'} | ${typeof R.msPerGame === 'number' ? (R.msPerGame / 1000).toFixed(1) : '-'} | ${R.deals ?? 0}, ${R.blocks ?? 0} (${R.blockMin ?? '-'} to ${R.blockMax ?? '-'}) | | |`);
L.push('', `The eight matches' hours sum to ${Math.round(total * 100) / 100} (estimate about 6). Validity parts, each a count of corners: kinds searched as \`what=\` names ${v.kindsOk ?? 0}, batch seeds in 114,900,000-114,900,149 ${v.seedsOk ?? 0}, both seats on every deal ${v.sidesOk ?? 0}, rows agree with the match line in count ${v.rowsAgree ?? 0} and in score ${v.scoresAgree ?? 0}. Config lines: ${cf.ok ?? 0} of 8 corners with every batch line's config A exactly the arm's and config B exactly \`Default\` (${cf.lines ?? 0} lines).`, '');
L.push('## The readings (D535 point 5), paired by deal, in score', '');
L.push('| reading | what minus what | shared deals | difference [95%] | about, in Elo | correlation | flag |');
L.push('|---|---|---|---|---|---|---|');
const W = v.whole || {};
L.push(`| WHOLE | all minus none | ${W.n ?? 0} | ${dl(W)} | ${el(W)} | ${W.rho ?? '-'} | ${!W.read ? 'not read' : W.above ? 'above 0: the gate is open' : 'NOT above 0: diagnose, nothing else is read'} |`);
for (const k of ['p', 'a', 'b']) { const d = (v.alone || {})[k] || {}; L.push(`| ALONE ${KIND[k]} | only-${k} minus none | ${d.n ?? 0} | ${dl(d)} | ${el(d)} | ${d.rho ?? '-'} | ${flag(d, 'adds', ['ADDS ALONE', 'HURTS ALONE', 'NOT SHOWN ALONE'])} |`); }
for (const k of ['p', 'a', 'b']) { const d = (v.last || {})[k] || {}; L.push(`| LAST ${KIND[k]} | all minus no-${k} (${NO[k]}) | ${d.n ?? 0} | ${dl(d)} | ${el(d)} | ${d.rho ?? '-'} | ${flag(d, 'needed', ['NEEDED', 'HURTS', 'NOT SHOWN NEEDED'])} |`); }
const I = v.interaction || {}, P = v.replication || {};
L.push(`| INTERACTION (information) | (all minus none) minus the three ALONE | ${I.n ?? 0} | ${dl(I)} | | | ${I.read ? 'read' : 'not read'} |`);
L.push(`| REPLICATION (information) | the night's all minus J194 (a)'s rows | ${P.n ?? 0} | ${dl(P)} | ${el(P)} | ${P.rho ?? '-'} | ${P.read ? 'read' : 'not read'} |`);
L.push('', `Every LAST row and WHOLE use \`all\` from ${allIs}. A flag is the interval's side of 0 and nothing more: an interval that includes 0 is NOT SHOWN, never "no effect". "About, in Elo" is the difference of the two corners' Elo at their own scores, with the interval's half-width at that slope: information beside the score, which is what the rule reads.`, '');
L.push('## The faster-seat candidate rule (D535 point 6)', '');
L.push('| arm | searches | all minus the arm, shared deals | difference [95%] | about, in Elo | point at or under +0.0140 | search s a game | candidate |');
L.push('|---|---|---|---|---|---|---|---|');
for (const k of ['b', 'a', 'p', 'ab', 'pb', 'pa']) {
  const d = (v.cand || {})[k] || {};
  L.push(`| ${d.name ?? k} | ${SEARCHED[k]} | ${d.n ?? 0} | ${d.read ? dl(d) : 'not read'} | ${d.read ? el(d) : '-'} | ${d.read ? (Math.round(d.mean * 1e4) <= 140 ? 1 : 0) : '-'} | ${typeof d.msPerGame === 'number' ? (d.msPerGame / 1000).toFixed(1) : '-'} | ${d.candidate ?? 0} |`);
}
L.push('', `\`all\` here is ${allIs}; its own search time a game is ${typeof (C.pab || {}).msPerGame === 'number' && (C.pab || {}).msPerGame > 0 ? ((C.pab.msPerGame) / 1000).toFixed(1) : typeof R.msPerGame === 'number' ? (R.msPerGame / 1000).toFixed(1) + ' (J194 (a))' : '-'} s. Candidates: ${v.candidates ?? 0}. ${v.taken ? `Taken forward (the least search time a game): ${v.taken}, which earns a 4,800-game head-to-head against search-v1-anytime as its own job under its own decision; a candidate is not a result.` : 'None is taken forward: the table above says where the next lane\'s compute goes (D535 point 7).'} No reading of this night changes the live seat (D509).`);
fs.writeFileSync('var/j210/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J210EOF
```
check: mn.complete == true
check: mn.played == 1200
check: mn.errors + mn.timeouts <= 60
check: mb.complete == true
check: mb.played == 1200
check: mb.errors + mb.timeouts <= 60
check: ma.complete == true
check: ma.played == 1200
check: ma.errors + ma.timeouts <= 60
check: mp.complete == true
check: mp.played == 1200
check: mp.errors + mp.timeouts <= 60
check: mab.complete == true
check: mab.played == 1200
check: mab.errors + mab.timeouts <= 60
check: mpb.complete == true
check: mpb.played == 1200
check: mpb.errors + mpb.timeouts <= 60
check: mpa.complete == true
check: mpa.played == 1200
check: mpa.errors + mpa.timeouts <= 60
check: mall.complete == true
check: mall.played == 1200
check: mall.errors + mall.timeouts <= 60
check: cf.corners == 8
check: cf.ok == 8
check: cf.lines >= 9600
check: v.written == 1
check: v.names == 1
check: v.present == 8
check: v.complete == 8
check: v.valid == 8
check: v.kindsOk == 8
check: v.seedsOk == 8
check: v.sidesOk == 8
check: v.rowsAgree == 8
check: v.scoresAgree == 8
check: v.allNight == 1
check: v.allJ194 == 0
check: v.whole.read == 1
check: v.gate + v.diagnose == 1
check: v.gate == 1 or not (v.whole.read == 1 and v.whole.lo > 0)
check: v.gate == 0 or (v.whole.read == 1 and v.whole.lo > 0)
check: v.diagnose == 1 or not (v.whole.read == 1 and v.whole.lo <= 0)
check: v.diagnose == 0 or (v.whole.read == 1 and v.whole.lo <= 0)
check: v.alone.p.adds + v.alone.p.hurts + v.alone.p.notShown + v.alone.p.unread == 1
check: v.alone.p.unread == 0 or v.alone.p.read == 0
check: v.alone.p.read == 1 or v.alone.p.unread == 1
check: v.alone.p.read == 0 or v.gate == 1
check: v.alone.p.read == 1 or v.gate == 0
check: v.alone.p.adds == 1 or not (v.alone.p.read == 1 and v.alone.p.lo > 0)
check: v.alone.p.adds == 0 or (v.alone.p.read == 1 and v.alone.p.lo > 0)
check: v.alone.p.hurts == 1 or not (v.alone.p.read == 1 and v.alone.p.hi < 0)
check: v.alone.p.hurts == 0 or (v.alone.p.read == 1 and v.alone.p.hi < 0)
check: v.alone.p.n >= 590
check: v.alone.a.adds + v.alone.a.hurts + v.alone.a.notShown + v.alone.a.unread == 1
check: v.alone.a.unread == 0 or v.alone.a.read == 0
check: v.alone.a.read == 1 or v.alone.a.unread == 1
check: v.alone.a.read == 0 or v.gate == 1
check: v.alone.a.read == 1 or v.gate == 0
check: v.alone.a.adds == 1 or not (v.alone.a.read == 1 and v.alone.a.lo > 0)
check: v.alone.a.adds == 0 or (v.alone.a.read == 1 and v.alone.a.lo > 0)
check: v.alone.a.hurts == 1 or not (v.alone.a.read == 1 and v.alone.a.hi < 0)
check: v.alone.a.hurts == 0 or (v.alone.a.read == 1 and v.alone.a.hi < 0)
check: v.alone.a.n >= 590
check: v.alone.b.adds + v.alone.b.hurts + v.alone.b.notShown + v.alone.b.unread == 1
check: v.alone.b.unread == 0 or v.alone.b.read == 0
check: v.alone.b.read == 1 or v.alone.b.unread == 1
check: v.alone.b.read == 0 or v.gate == 1
check: v.alone.b.read == 1 or v.gate == 0
check: v.alone.b.adds == 1 or not (v.alone.b.read == 1 and v.alone.b.lo > 0)
check: v.alone.b.adds == 0 or (v.alone.b.read == 1 and v.alone.b.lo > 0)
check: v.alone.b.hurts == 1 or not (v.alone.b.read == 1 and v.alone.b.hi < 0)
check: v.alone.b.hurts == 0 or (v.alone.b.read == 1 and v.alone.b.hi < 0)
check: v.alone.b.n >= 590
check: v.last.p.needed + v.last.p.hurts + v.last.p.notShown + v.last.p.unread == 1
check: v.last.p.unread == 0 or v.last.p.read == 0
check: v.last.p.read == 1 or v.last.p.unread == 1
check: v.last.p.read == 0 or v.gate == 1
check: v.last.p.read == 1 or v.gate == 0
check: v.last.p.needed == 1 or not (v.last.p.read == 1 and v.last.p.lo > 0)
check: v.last.p.needed == 0 or (v.last.p.read == 1 and v.last.p.lo > 0)
check: v.last.p.hurts == 1 or not (v.last.p.read == 1 and v.last.p.hi < 0)
check: v.last.p.hurts == 0 or (v.last.p.read == 1 and v.last.p.hi < 0)
check: v.last.p.n >= 590
check: v.last.a.needed + v.last.a.hurts + v.last.a.notShown + v.last.a.unread == 1
check: v.last.a.unread == 0 or v.last.a.read == 0
check: v.last.a.read == 1 or v.last.a.unread == 1
check: v.last.a.read == 0 or v.gate == 1
check: v.last.a.read == 1 or v.gate == 0
check: v.last.a.needed == 1 or not (v.last.a.read == 1 and v.last.a.lo > 0)
check: v.last.a.needed == 0 or (v.last.a.read == 1 and v.last.a.lo > 0)
check: v.last.a.hurts == 1 or not (v.last.a.read == 1 and v.last.a.hi < 0)
check: v.last.a.hurts == 0 or (v.last.a.read == 1 and v.last.a.hi < 0)
check: v.last.a.n >= 590
check: v.last.b.needed + v.last.b.hurts + v.last.b.notShown + v.last.b.unread == 1
check: v.last.b.unread == 0 or v.last.b.read == 0
check: v.last.b.read == 1 or v.last.b.unread == 1
check: v.last.b.read == 0 or v.gate == 1
check: v.last.b.read == 1 or v.gate == 0
check: v.last.b.needed == 1 or not (v.last.b.read == 1 and v.last.b.lo > 0)
check: v.last.b.needed == 0 or (v.last.b.read == 1 and v.last.b.lo > 0)
check: v.last.b.hurts == 1 or not (v.last.b.read == 1 and v.last.b.hi < 0)
check: v.last.b.hurts == 0 or (v.last.b.read == 1 and v.last.b.hi < 0)
check: v.last.b.n >= 590
check: v.cand.b.read == 0 or v.gate == 1
check: v.cand.b.read == 1 or v.gate == 0
check: v.cand.b.candidate == 1 or not (v.cand.b.read == 1 and v.cand.b.mean < 0.01405)
check: v.cand.b.candidate == 0 or (v.cand.b.read == 1 and v.cand.b.mean < 0.01405)
check: v.cand.a.read == 0 or v.gate == 1
check: v.cand.a.read == 1 or v.gate == 0
check: v.cand.a.candidate == 1 or not (v.cand.a.read == 1 and v.cand.a.mean < 0.01405)
check: v.cand.a.candidate == 0 or (v.cand.a.read == 1 and v.cand.a.mean < 0.01405)
check: v.cand.p.read == 0 or v.gate == 1
check: v.cand.p.read == 1 or v.gate == 0
check: v.cand.p.candidate == 1 or not (v.cand.p.read == 1 and v.cand.p.mean < 0.01405)
check: v.cand.p.candidate == 0 or (v.cand.p.read == 1 and v.cand.p.mean < 0.01405)
check: v.cand.ab.read == 0 or v.gate == 1
check: v.cand.ab.read == 1 or v.gate == 0
check: v.cand.ab.candidate == 1 or not (v.cand.ab.read == 1 and v.cand.ab.mean < 0.01405)
check: v.cand.ab.candidate == 0 or (v.cand.ab.read == 1 and v.cand.ab.mean < 0.01405)
check: v.cand.pb.read == 0 or v.gate == 1
check: v.cand.pb.read == 1 or v.gate == 0
check: v.cand.pb.candidate == 1 or not (v.cand.pb.read == 1 and v.cand.pb.mean < 0.01405)
check: v.cand.pb.candidate == 0 or (v.cand.pb.read == 1 and v.cand.pb.mean < 0.01405)
check: v.cand.pa.read == 0 or v.gate == 1
check: v.cand.pa.read == 1 or v.gate == 0
check: v.cand.pa.candidate == 1 or not (v.cand.pa.read == 1 and v.cand.pa.mean < 0.01405)
check: v.cand.pa.candidate == 0 or (v.cand.pa.read == 1 and v.cand.pa.mean < 0.01405)
check: v.candidates == v.cand.b.candidate + v.cand.a.candidate + v.cand.p.candidate + v.cand.ab.candidate + v.cand.pb.candidate + v.cand.pa.candidate
check: v.candidates == 0 or v.gate == 1
check: v.headToHead == 0 or v.candidates >= 1
check: v.headToHead == 1 or v.candidates == 0
check: v.takenIndex == 0 or v.candidates >= 1
check: v.takenIndex >= 1 or v.candidates == 0
check: v.takenIndex <= 6
check: v.readings == 14 or v.gate == 0
check: v.readings == 1 or v.gate == 1
check: v.sharedMin >= 590
check: v.liveSeatChanged == 0

The first twenty-four checks say each of the eight matches is complete: it was not stopped, all 1,200 games were
played, and at most one in 20 ended in an engine error or a timeout. `cf`: in all eight, every batch line's config A
is exactly the arm's and config B exactly `Default`. Then the verdict ran and found the night as D535 registered it:
the eight match lines under D535's names and hashes, each complete and valid, each searching exactly the kinds its
`what=` names, on the 150 deal blocks 114,900,000-114,900,149 with both seats on every deal, its rows agreeing with
its line; `all` read from the night's own corner. Then the readings in the runner's own language, each both ways:
WHOLE is read and either opens the gate (its lower end above 0) or diagnoses the night, exactly one of the two; each
kind's ALONE and LAST is exactly one of its three flags or unread, ADDS and NEEDED exactly when the interval's lower
end is above 0, HURTS exactly when its upper end is under 0, and nothing but WHOLE is read with the gate closed; each
partial arm is a candidate exactly when it is read and its point is at or under +0.0140 (compared in ten-thousandths,
as the verdict rounds it: under 0.01405); the candidates' count is the six flags' sum, a head-to-head is owed and an
arm taken forward exactly when there is one; fourteen readings with the gate open and one (WHOLE) with it closed,
each on at least 590 shared deals; the live seat unchanged. Every value these checks read is a number the verdict
always writes; none compares with null or a string, and no metric line carries a `$` (J207's failed pilot). Any
reading passes them: a reading is not a failure, a candidate is not a result, and no candidate is not a failure
either. Each match's score, the time per decision and per game, the changed answers, INTERACTION, REPLICATION and
every "about, in Elo" are reported, not gated.

If a match is cut short (its stop, or a memory stop the runner retries from that match's block), the job fails on
that match's checks and the report is still written: the verdict reads every comparison whose two corners are valid,
`all` from J194 (a)'s rows when the night's own is the one that is cut (D535 point 8), and says which in every line.
What is then owed is a repost of the missing corners under a new job id, not a reading of a cut match.

## Abort if
abort: j210_err >= 30 and j210_err > j210_games / 10

Engine trouble only: once 30 games have ended in an engine error or a timeout, the job stops if they are more than one
in ten. No match has a stopping rule on the score, so the job never stops early on a result.

## Report
collect: var/ai-ladder/match-J210-none.json
collect: var/ai-ladder/match-J210-b.json
collect: var/ai-ladder/match-J210-a.json
collect: var/ai-ladder/match-J210-p.json
collect: var/ai-ladder/match-J210-ab.json
collect: var/ai-ladder/match-J210-pb.json
collect: var/ai-ladder/match-J210-pa.json
collect: var/ai-ladder/match-J210-pab.json
collect: var/j210/verdict.json
collect: var/j210/report.md
collect: var/j210/cfgs.json

`report.md` is the job's own numbers and D535's flags. The PC session writes `summary.md` from it, the same way as
J199 to J209:
- **the answer first:** where the search's strength is, in one sentence a person can act on: WHOLE, then for each of
  priority, attacks and blocks what it adds alone and whether it is needed when the others are searched, each with its
  interval in score and about in Elo, worded by D535 point 5's flags and no further;
- **the candidate rule:** the six arms' rows, which are candidates, which one is taken forward and its search time a
  game beside search-v2's; a candidate earns a 4,800-game head-to-head against `search-v1-anytime` as its own job
  under its own decision (J198's shape) and is not a result; with no candidate, where the table says the next lane's
  compute goes (D535 point 7) and what that lane is;
- **the eight matches:** each corner's score and Elo against Forge with its interval, searched decisions by kind,
  changed answers, ms a decision and search seconds a game;
- **INTERACTION and REPLICATION:** as information, with their intervals; REPLICATION against the 15 to 16 Elo noise
  measured before the night;
- **which `all`:** the night's own, or J194 (a)'s rows when the night's is cut, said wherever it is used;
- **the code:** the pilot's `sd` (the pin is D535's merge, one file under a match path, nothing under `bridge/src`)
  and `dst.checks`;
- **the run:** draws, errors and timeouts, the deal blocks, each match's hours against its estimate, the pressure
  events in STATUS and any block the runner retried, that it ran alone (D521), and whether the GPU queue or anything
  else outside the lab was running.

Never write "no effect", "no cost", "adds nothing" or "equal" for an interval that includes 0: the flag is NOT SHOWN,
and the interval says how large an effect the night could not have seen. A kind's ALONE and LAST are differences
between seats that both played Forge, never a head-to-head between them. If a match stopped early (`complete:
false`), say so: it gets no reading, the comparisons that need it are unread, and what is owed is a repost of that
corner, not a reading.

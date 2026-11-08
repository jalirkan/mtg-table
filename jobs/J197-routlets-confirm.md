id: J197
title: The routlets confirmation: one fixed 4,800-game match (2,400 mirrored pairs, D398, the confirm set, no stopping rule) of search-v2-routlets, D390's rollout=outlets under the anytime search, against search-v1-anytime (search-v2), the 4,800-game confirmation D517's rule names for J195's INCONCLUSIVE (a), with a verdict: SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN (D517, extended by SMALL GAIN for this confirmation, to be recorded as D519)
public_title: Search knob confirmation: one fixed 4,800-game match
public_est: ~9-11 h (one long night)
public_decides: Whether one search option adds strength, at four times the games
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@310ba71b657b93d4ce755fcd17aeb6b85d003ac4 (the merge commit of D518's lane, pc/d518-eval-v3-tooling, on main; the newest main when this job was written. Its players and its search are J195's: `git diff ea313c01 310ba71b` (J195's pin to this one) changes nothing under bridge/src, tools/ai-ladder or tools/ai-bench; D518 touched tools/ml, the coach helper, the eval runner, docs and one config.json key, coach.evalModel, which nothing the ladder runs reads. Pinned so every game of the match is one code version, D341, and the pilot checks that diff is empty)
decides: whether the outlet rollouts are a measured gain over search-v2, at four times J195's games. SHOWN makes search-v2-routlets a candidate for the live seat, under a separate decision with its own evidence, never this job's (D517 Decision 4: the live seat stays search-v2 at 1.5 s and 12 rounds, plain-Forge rollouts; under D509 a seat change is a seat-queue row). SMALL GAIN (a lower end above 0.5 with a point under +15 Elo: under D517's bar, but a measured gain) does the same: the knob track does not close, and the knob is recorded as a live-seat candidate for the owner to decide under a separate decision with its own evidence, never this job's. NOT SHOWN closes the routlets half of the knob track for this deck set, and since search-v2-ranked is already NOT SHOWN (J195 (b), upper end -2.9 Elo), the knob track closes (the play-AI review of 2026-11-05, §5 row 6), unless it is NOT SHOWN, UNEXPOSED (exposure under 3% of games, 144 of 4,800), which keeps the knob open until a rollout-level counter exists. INCONCLUSIVE AT 4,800 (a lower end at or under 0.5 with an upper end at or over +15) leaves the knob as information: it is not confirmed again, it is not a candidate, and the knob track is neither closed by this job nor reopened
hypothesis: J195's (a) read +6.9 Elo [-2.7, +16.6] (score 0.510 [0.4962, 0.5238], 600 pairs), INCONCLUSIVE only because its upper end passed +15; exposure 74 of 1,200 games (6.2%, the arm's seat; search-v2's 63), 0 errors and timeouts, and no cost (984 against 978 ms a decision, 14.45 against 14.52 rollouts). This confirmation was posted because (a) landed in the INCONCLUSIVE band, which favours a high draw, so the true effect is more likely below +6.9 than above it. At 4,800 games the interval is about +-4.8 Elo (J195's (a) was +-9.65 at 1,200; four times the games halve it), so SHOWN needs a point of +15 (its lower end is then far above 0.5), SMALL GAIN a point between about +4.8 (where the lower end passes 0.5) and +15, and NOT SHOWN a point below about +4.8. INCONCLUSIVE AT 4,800 needs a lower end at or under 0.5 and an upper end at or over +15, an interval about 15 Elo wide, which this size almost never gives: it stays in the rule for a match whose interval comes out wider than planned. Under that width, as approximations: a true +6.9 reads SMALL GAIN about 80% of the time and NOT SHOWN about 20%; a true +10 about 96% SMALL GAIN; a true +15 about 50% SHOWN and 50% SMALL GAIN; a true +20 about 98% SHOWN; a true +3 about 77% NOT SHOWN, 23% SMALL GAIN; a true +5 about 47% NOT SHOWN, 53% SMALL GAIN; and a true 0 reads SMALL GAIN about 2.5% of the time (the lower end's one-sided error), NOT SHOWN about 97.5%. Exposure is expected near J195's 6.2% (about 290 of 4,800), well over the 3% bar. All of this is information, not a prediction any check reads
rule: written 2026-11-07 before any J197 game was played (after J195, whose (a) line is the reason for this match), word for word as D517 Decision 5 states it: "For `search-v2-routlets` and `search-v2-ranked`, each a fixed D398 match of 1,200 games on the confirm set against `search-v1-anytime`: SHOWN if the arm's lower end is above 0.5 and its point is at least +15 Elo; NOT SHOWN if its upper end is below +15 Elo; otherwise INCONCLUSIVE, confirm with 4,800 games; both NOT SHOWN closes the knob track (the review's §5 row 6)." and its exposure reading: "A routlets NOT SHOWN closes its half of the knob track only if exposure is at least 3% of games (36 of 1,200, about half of J194's measured base rate of 5.3–6.0%); below that the reading is NOT SHOWN, UNEXPOSED and the knob stays open until a rollout-level counter exists (cube-lab follow-up 38). SHOWN and INCONCLUSIVE are read as above at any exposure." Applied here, unchanged in its thresholds, to the 4,800-game confirmation it names, and EXTENDED for this confirmation by a fourth reading, SMALL GAIN, added 2026-11-07 before any J197 game (after J195's report showed that its point at this size would sit above 0.5 and under +15): this extends D517 for the 4,800-game confirmation and will be recorded as a decision, D519, when the night is read, whichever way it lands. D517's bar stays what it was; SMALL GAIN changes what follows a result under it, not the bar. The match: one fixed match (D398, no stopping rule) of 4,800 games (600 batches of 8, 2,400 mirrored pairs) on the confirm deck set (tools/ai-bench/pairs-confirm.txt, 30 deck pairs never tuned on), search-v2-routlets vs search-v1-anytime, var/ai-ladder/match-J197.json. In the rule an arm's "lower end", "point" and "upper end" are the match line's 95% lower end on its score (lo), its Elo point estimate (elo) and its Elo upper end (eloHi), the arm being the match's first player. The match is COMPLETE when its line names the two players in that order, is not J195's match (id justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667), says complete: true, all 4,800 games were played and engine errors plus timeouts are at most 240 (one in 20, J195's 60 of 1,200). Read only when complete, exactly one reading, in this order of precedence: SHOWN when lo > 0.5 and elo >= 15; SMALL GAIN when lo > 0.5 and elo < 15 (NOT SHOWN under D517's bar, or INCONCLUSIVE under it when eloHi >= 15; D517's own reading is reported beside it), a measured gain under the bar: the knob track does NOT close on it, and the knob is recorded as a candidate for the live seat, to be decided by the owner under a separate decision with its own evidence, never this job's (verdict smallGain 1, knobTrackClosed 0, liveSeatCandidate 1); INCONCLUSIVE AT 4,800 when lo <= 0.5 and eloHi >= 15, and since this is the confirmation the rule names, it is not confirmed again: the knob is left as information; NOT SHOWN when lo <= 0.5 and eloHi < 15. The cost is read from the match line and reported beside every reading, never changing one: the arm's ms per decision against search-v2's, "within 5%" when aMs x 100 <= 105 x bMs (a cheaper arm is within; J195: 984 against 978, x1.007); a SMALL GAIN outside 5% is still SMALL GAIN, and its cost is what the owner's decision weighs. An incomplete match gives no verdict. The match is a NEW match: its games are those whose purpose is its own match:<host>:<run>, never J195's 1,200, which are not pooled with it; J195's line is reported beside it as a description only. Exposure is the share of the match's games played (4,800 when complete) in which the arm's seat (config A of each batch line, as tools/ai-ladder/match.ts tallyBatch reads it) recorded at least one `opportunity.*` key above 0 in its batch counts (`aStats.counts`), read by var/j197-tools/rollouts.cjs (J195's reader, unchanged) from the batch run named in the match's id; "at least 3%" is exposedGames x 100 >= 3 x games played (144 of 4,800), in integers. NOT SHOWN with exposure under 3%, or with no exposure read for this match, is NOT SHOWN, UNEXPOSED (notShown 1, unexposed 1); UNEXPOSED applies to NOT SHOWN only, and exposure never changes SHOWN, SMALL GAIN or INCONCLUSIVE AT 4,800 and is reported beside them. The knob track is closed when this match is NOT SHOWN and not UNEXPOSED (search-v2-ranked's NOT SHOWN from J195 is the other half, and stands), and only then. At this deck set's exposure the knob can act in roughly one game in sixteen; a NOT SHOWN closes the track for this deck set, not for an outlet-heavy one. Reported beside, deciding nothing: each side's milliseconds per decision (p + a + b, and by kind), rollouts and rounds per searched decision, searched and changed decisions by kind, budget fallbacks with their interval and other fallbacks, and the deal blocks played. An interval that includes 0.5 is never "no effect"
followup: morning-read
est: ~9.5 h at 7 workers (range 9-11 h), 12.25 h at worst (the match's own stop). From J195's walls on 7 workers: its (a), this matchup, took 2 h 41 min for 1,200 games (10:23 to 13:04 on 2026-11-07) with 18 of the night's 24 pressure events inside it, its workers dropped to 6, 5 and once 4 between 10:35 and 12:43; its (b), the same kind of mirror at ~905 ms a decision on both sides against (a)'s ~981, took 2 h 10 min with 2 events. (b)'s pace scaled by the thinking time (x1.08) is ~2 h 21 min for 1,200 games, so 4,800 games are ~9.4 h unloaded; at (a)'s own pressured pace, ~10.7 h. The match stops itself at --hours 12.25 (about 1.3x the estimate, 1.15x the pressured pace), under the 13 h timeout; a match that reaches its stop reports complete: false and gives no verdict. The ladder's default 300 s per-game timeout, as J195's (a). Pilot ~10 min (the build, the bench self-test, the ladder tests, 4 games on one worker; J195's whole pilot, its four arms' 16 games included, took about 10 minutes, 10:13 to 10:23)
resumable: no
timeout: 13h
clean: var/j197 var/ai-ladder-pilot/J197 var/ai-ladder/match-J197.json
progress: metric j197_games games of 4800
metrics: j197_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const J195="match:justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&!l.includes("\"purpose\":\""+J195+"\"")&&l.includes("\"a\":\"search-v2-routlets\"")&&l.includes("\"b\":\"search-v1-anytime\""))n++;console.log(n)'
metrics: j197_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";const J195="match:justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&!l.includes("\"purpose\":\""+J195+"\"")&&l.includes("\"a\":\"search-v2-routlets\"")&&l.includes("\"b\":\"search-v1-anytime\"")&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: cm = sh: cat var/ai-ladder/match-J197.json 2>/dev/null || echo '{"played":0,"complete":false,"errors":0,"timeouts":0,"score":0,"lo":0,"hi":0}'
metrics: ro = sh: cat var/j197/rollouts.json 2>/dev/null || echo '{"games":0}'
metrics: bs = sh: cat var/j197/seeds.json 2>/dev/null || echo '{"blocks":0,"games":0,"j195Blocks":0,"overlap":-1}'
metrics: v = sh: cat var/j197/verdict.json 2>/dev/null || echo '{"written":0,"complete":0,"shown":0,"smallGain":0,"inconclusive4800":0,"notShown":0,"unexposed":0,"noCost":0,"knobTrackClosed":0,"liveSeatCandidate":0,"exposure":{"exposedGames":0}}'
headline: cm.played, cm.score, cm.lo, cm.hi, cm.elo, cm.eloLo, cm.eloHi, cm.aSearch.msPerDecision, cm.bSearch.msPerDecision, ro.ratio, v.costRatio, v.noCost, v.shown, v.smallGain, v.inconclusive4800, v.notShown, v.d517, v.unexposed, v.exposure.share, ro.aExposedGames, ro.aPolicyGames, ro.bExposedGames, v.knobTrackClosed, v.liveSeatCandidate, bs.min, bs.max, bs.overlap

**Why this job** (J195's (a); D517 Decision 5). J195 matched the two built, never-matched search knobs against
search-v2 at 1,200 games each. `search-v2-ranked` came out NOT SHOWN (-12.2 Elo [-21.4, -2.9]). `search-v2-routlets`,
D390's outlet policy playing the searching seat inside the rollouts, came out INCONCLUSIVE: +6.9 Elo [-2.7, +16.6],
score 0.510 [0.4962, 0.5238] over 600 pairs, its point under the +15 bar but its upper end over it. Its exposure
cleared the 3% bar (74 of 1,200 games, 6.2%), there were no engine errors or timeouts, and it cost nothing measurable
(984 against 978 ms a decision, 14.45 against 14.52 rollouts, 0.995x). D517's rule, written before J195, says what
follows an INCONCLUSIVE arm: "confirm with 4,800 games". This is that match, and nothing else: one matchup, one
fixed size, the same rule, extended by one reading (SMALL GAIN, below) before any game. J195's report and verdict are `~/code/pc-results/results/J195/report.md` and `verdict.json`.

**What is played** (D517's players, unchanged at this pin). `tools/ai-ladder/players.json`, kind `search`:
- `search-v2-routlets`, config hash `b704d57245a1`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1,rollout=outlets`;
- against `search-v1-anytime` (search-v2, the live seat's config), config hash `cdd55e02a89c`:
  `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1`.

These are the hashes J195's (a) match line recorded, and the pilot checks both, with the config strings. The pin moved
from J195's `ea313c01` to `310ba71b` only because main moved (D518, the evaluator's tooling): `git diff ea313c01
310ba71b --stat` lists 17 files, none under `bridge/src`, `tools/ai-ladder` or `tools/ai-bench`, and its one
`config.json` line is `coach.evalModel`, which the coach helper reads and the ladder does not. The pilot repeats that
diff on the runner's checkout and fails if it is not empty, so the 4,800 games play J195's code.

**A new match, not a pooled one** (D398). The match counts only games whose purpose is its own `match:<host>:<run>`
(`cmdMatch` in `tools/ai-ladder/cli.ts` filters the results by purpose), so J195's 1,200 games are not in it. Pooling
them would put the 1,200 games that triggered the confirmation inside the confirmation, which is the selection the
fixed match exists to avoid; J195's line is reported beside J197's as a description, in its own row, and never added
in. The verdict script refuses a match line carrying J195's id.

**Deal blocks.** A match's batches take the host's match base (114,000,000 + 900,000 = 114,900,000) and then, one
batch at a time, the matchup's next unused block: `nextBseed` (`tools/ai-ladder/schedule.ts`) walks up from the base
past every block the matchup has used in either order, counted from the results log and from the batches running
(`Session.usedBseeds`). On this host the matchup `search-v2-routlets` / `search-v1-anytime` has used exactly
114,900,000-114,900,149, J195's (a) (read from the runner's results log on 2026-11-07: 1,200 games, 150 blocks, no
other purpose). So J197's 600 batches take **114,900,150-114,900,749**: new blocks after the used ones, not J195's
150 again. Every one of its deals is new: J194's and J195's matches played only blocks 114,900,000-114,900,149. Each
batch plays two consecutive deck pairs from a start fixed by the block number (`batchPairs`: start (bseed mod 30) x 2
mod 30), and 600 consecutive blocks give each of the confirm set's 30 deck pairs exactly 40 batches, 160 games, in
both seat orders. `var/j197-tools/seeds.cjs` reads the blocks the match actually played from the results log; the
checks require 600 blocks, all 4,800 games, none of J195's 150 blocks, and J195's 150 still in the log (if they had
vanished, `nextBseed` would hand out J195's deals again, and the overlap check would mean nothing). A match retried
after a memory stop takes the next unused blocks after the stopped attempt's, so its deals then differ from these; the
stopped attempt's games stay in the log under their own purpose and are never counted.

**Exposure: how often the knob could act** (D517's exposure reading). `rollout=outlets` changes what the searching
seat plays inside a rollout only where it has a sacrifice outlet to use, and no counter sees the policy act there
(`SearchPolicy` never harvests the rollout controller's counts; cube-lab follow-up 38 is the counter, a bridge change
not in this pin). The outer seat's own `PolicyControllerAi` counts `opportunity.<why>` into each game's batch line,
so a game in which the arm's seat recorded any `opportunity.*` key is EXPOSED. `var/j197-tools/rollouts.cjs` is
J195's reader with only its comment changed; run over J195's (a) batches it reproduces J195's 74 exposed games of
1,200 (63 on search-v2's side) and 14.45 / 14.52 rollouts a decision. The bar is D517's 3% of games, 144 of 4,800;
J195's 6.2% and J194's 5.3-6.0% put the expected count near 290.

**The match** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), 4,800 games, 2,400
pairs, in the real ladder folder `var/ai-ladder` on this host: `search-v2-routlets` vs `search-v1-anytime`, `--out
var/ai-ladder/match-J197.json`. Verdict: SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800 or NOT SHOWN.

**SMALL GAIN, the fourth reading** (pre-registered 2026-11-07 before any J197 game; to be recorded as D519 when the
night is read, whichever way it lands). D517's rule closes the knob track on any NOT SHOWN, and at 4,800 games a NOT
SHOWN can carry a lower end above 0.5: J195's own point, +6.9, would read about [+2.2, +11.7] at this size. That is a
gain measured with 95% confidence, at no measured cost (J195: 984 against 978 ms a decision), and closing the track
on it would discard it. So for this confirmation a complete match whose lower end is above 0.5 and whose point is
below +15 Elo reads SMALL GAIN, after SHOWN and before INCONCLUSIVE AT 4,800 and NOT SHOWN: D517's bar is unchanged
(the reading is NOT SHOWN or INCONCLUSIVE under it, and the verdict says which), the knob track does not close, and
the knob is recorded as a candidate for the live seat, for the owner to decide under a separate decision with its
own evidence. The cost is read from the match line and reported (within 5% of search-v2's ms a decision, or not);
it never changes the reading. A truly null knob reads SMALL GAIN about 2.5% of the time, the lower end's one-sided
error, which is why it is a candidate for a decision and not an adoption.

**Why one match and no tuning.** The arm changes one thing, and the change is the hypothesis; the deals and decks are
the held-out confirm set and new blocks of it. Nothing is selected, so the score is read as it is.

**When it runs.** No `after:`. `cores: 7` takes the whole width, so no other heavy job runs beside the match and both
players see the same CPU; queued behind J196 (`cores: 6`), whose width leaves too few of the 8 cores for this job's
pilot (3), so J197 starts when J196 ends. It is expected to run beside the art session's GPU painting queue, which is
CPU-light but not memory-free: J195 logged 24 memory-pressure events (drops and raises, 18 of them during its (a)),
J194 2, J193 8. The runner's memory rule handles that without the job: every 10 s it reads the host's memory pressure,
and at `some avg10` 10% or more, swap-in at 2,000 pages a second or the unit at 95% of its `MemoryMax` (two samples
running) it drops one worker as that worker's game ends, raising again when the pressure clears; only at 40% (three
samples) does it stop the job, which then waits 15 minutes and retries the running block with one worker fewer, and
fails on the third such stop. A dropped worker slows the match; it changes no deal and no side's budget, and the deals
are mirrored, so the GPU queue, a light job or Justin at the table falls on both sides alike. A memory stop is the
one event this single 4,800-game block handles badly: the retry starts the match again from its first game on new
blocks, under a fresh `--hours 12.25`, so a stop late in the night costs most of a night (J195's 24 events, J194's 2
and J193's 8 were all drops and raises; none stopped a job).

## Pilot
About 10 minutes:
- the pin is merged;
- the build, the bench self-test and the ladder registry test;
- `ai-ladder.sh list` resolves both players at J195's hashes, and the arm's seat config is search-v1-anytime's with
  `,rollout=outlets` appended and nothing else;
- the files changed under `bridge/src`, `tools/ai-ladder` and `tools/ai-bench` since J195's pin: none;
- J195's blocks are in the results log (150 blocks, 114,900,000-114,900,149, 1,200 games), so the match's blocks
  will start after them;
- the verdict script and the block reader written and tested on synthetic files;
- 4 games of the arm against `search-v1-anytime`, one worker, in the pilot's own folder: both sides search and the
  rollout reader agrees with the match line.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j197-merged.txt || echo 0 > var/j197-merged.txt
cat var/j197-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --test web/test/ai-ladder.test.ts
```
```bash
# both players resolve at J195's hashes, and the arm is search-v2 with rollout=outlets and nothing else (D517)
mkdir -p var/j197-tools
./tools/ai-ladder.sh list > var/j197-tools/players.txt
grep -E '^(search-v1-anytime|search-v2-routlets) ' var/j197-tools/players.txt
node - <<'J197EOF'
// J197's pilot: both players resolve, at the hashes J195's (a) match line recorded, and the arm is search-v1-anytime
// (search-v2) with only `,rollout=outlets` appended.
const fs = require('fs');
const L = fs.readFileSync('var/j197-tools/players.txt', 'utf8').split('\n');
const get = (n) => {
  const l = L.find((x) => x.startsWith(n + ' '));
  if (!l) return null;
  const m = /^(\S+)\s+(\S+)\s+([0-9a-f]{12})\s+ai-bench "([^"]*)"/.exec(l);
  return m ? { kind: m[2], hash: m[3], cfg: m[4] } : { unavailable: l.trim() };
};
const v1 = get('search-v1-anytime'), ro = get('search-v2-routlets');
const V1CFG = 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1';
const r = {
  present: [v1, ro].every((p) => p && p.cfg) ? 1 : 0,
  v1_cfg_ok: v1 && v1.kind === 'search' && v1.cfg === V1CFG ? 1 : 0,
  routlets_only_rollout: ro && ro.kind === 'search' && ro.cfg === V1CFG + ',rollout=outlets' ? 1 : 0,
  hashes_ok: v1 && ro && v1.hash === 'cdd55e02a89c' && ro.hash === 'b704d57245a1' ? 1 : 0,
  hashes: { 'search-v1-anytime': v1?.hash ?? null, 'search-v2-routlets': ro?.hash ?? null },
  cfgs: { 'search-v1-anytime': v1?.cfg ?? null, 'search-v2-routlets': ro?.cfg ?? null },
};
r.ok = r.present && r.v1_cfg_ok && r.routlets_only_rollout && r.hashes_ok ? 1 : 0;
fs.writeFileSync('var/j197-tools/players.json', JSON.stringify(r, null, 1) + '\n');
console.log(JSON.stringify(r));
J197EOF
# the players and the search since J195's pin ea313c01: expected none (D518 touched neither)
git diff --name-only ea313c01c3a11b4653fb332b0647a031988f3ac3 HEAD -- bridge/src tools/ai-ladder tools/ai-bench > var/j197-tools/search-diff.txt || true
node -e 'const fs=require("fs");const f=fs.readFileSync("var/j197-tools/search-diff.txt","utf8").split("\n").filter(Boolean);const r={files:f,count:f.length};fs.writeFileSync("var/j197-tools/search-diff.json",JSON.stringify(r)+"\n");console.log(JSON.stringify(r))'
```
```bash
cat > var/j197-tools/verdict.mjs <<'J197EOF'
// J197's reading, pre-registered 2026-11-07 before any J197 game (the job's rule: line; D517 Decision 5, applied to
// the 4,800-game confirmation its own INCONCLUSIVE branch names; D398's fixed match).
// usage: node verdict.mjs <match.json> <rollouts.json> <out.json>     node verdict.mjs --selftest <scratch dir>
// THE MATCH: search-v2-routlets (config A) against search-v1-anytime (search-v2), 4,800 games, 2,400 mirrored pairs,
//   the confirm set, no stopping rule. It is a NEW match: J195's 1,200 games (match id J195_ID) are never in it and
//   never pooled with it; J195's line is carried beside it as a description only (J195_A).
// COMPLETE: the match line names the two players in that order, is not J195's match, says complete: true, all 4,800
//   games were played, errors + timeouts <= 240 (one in 20, J131's bar, as J195's 60 of 1,200).
// D517's rule, word for word, applied to 4,800 games: "SHOWN if the arm's lower end is above 0.5 and its point is at
//   least +15 Elo; NOT SHOWN if its upper end is below +15 Elo; otherwise INCONCLUSIVE, confirm with 4,800 games",
//   extended for this confirmation (pre-registered before any J197 game; to be recorded as D519 when the night is read)
//   by a fourth reading, SMALL GAIN. Exactly one reading, in this order of precedence:
//   SHOWN                  lo > 0.5 and elo >= 15;
//   SMALL GAIN             lo > 0.5 and elo < 15: under D517's bar (D517 alone reads it NOT SHOWN or INCONCLUSIVE, the
//                          `d517` field), but a measured gain; the knob track does not close on it, and the knob is a
//                          candidate for the live seat, for the owner to decide under a separate decision;
//   INCONCLUSIVE AT 4,800  lo <= 0.5 and eloHi >= 15: the knob is left as information and is not confirmed again;
//   NOT SHOWN              lo <= 0.5 and eloHi < 15.
//   COST, reported beside every reading and never changing one: noCost is 1 when the arm's ms per decision on the match
//   line is within 5% of search-v2's (aMs x 100 <= 105 x bMs; a cheaper arm is within), costRatio = aMs / bMs.
// EXPOSURE (D517's exposure reading, its bar 3% of games: 144 of 4,800): the games in which the arm's seat recorded
//   at least one `opportunity.*` key above 0 in its batch counts (rollouts.cjs's aExposedGames, read from the batch run
//   named in this match's id) over the games played. NOT SHOWN with exposedGames x 100 < 3 x played, or with no
//   exposure read for this match, is NOT SHOWN, UNEXPOSED (notShown 1, unexposed 1): the knob stays open until a
//   rollout-level counter exists. Exposure never changes SHOWN or INCONCLUSIVE AT 4,800.
// THE KNOB TRACK (the review's §5 row 6): search-v2-ranked is NOT SHOWN from J195 (upper end -2.9 Elo, a constant
//   here), so the track is closed exactly when this match is NOT SHOWN and not UNEXPOSED: knobTrackClosed = 1.
//   SHOWN or SMALL GAIN makes the routlets knob a candidate for the live seat under a separate decision with its own
//   evidence (liveSeatCandidate = 1); this job never changes the seat.
import fs from 'node:fs';
import path from 'node:path';

export const GAMES = 4800;
export const BAR = GAMES / 20;
export const A = 'search-v2-routlets';
export const B = 'search-v1-anytime';
export const J195_ID = 'justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667';
export const J195_A = { id: J195_ID, played: 1200, pairs: 600, score: 0.51, lo: 0.4962, hi: 0.5238, elo: 6.9, eloLo: -2.7, eloHi: 16.6,
  exposedGames: 74, reading: 'INCONCLUSIVE', blocks: '114900000-114900149' };
export const J195_RANKED = { reading: 'NOT SHOWN', eloHi: -2.9 };

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function verdict(m, ro = null) {
  const names = m !== null && m.a === A && m.b === B ? 1 : 0;
  const notJ195 = m !== null && m.id !== J195_ID ? 1 : 0;
  const complete = names === 1 && notJ195 === 1 && m.complete === true && m.played === GAMES && (m.errors ?? 0) + (m.timeouts ?? 0) <= BAR ? 1 : 0;
  const s = {
    match: m === null ? 0 : 1, names, notJ195, complete, a: A, b: B, id: m?.id ?? null, ah: m?.ah ?? null, bh: m?.bh ?? null,
    played: m?.played ?? 0, errors: m?.errors ?? null, timeouts: m?.timeouts ?? null, pairs: m?.pairs ?? null,
    score: num(m?.score), lo: num(m?.lo), hi: num(m?.hi), elo: num(m?.elo), eloLo: num(m?.eloLo), eloHi: num(m?.eloHi),
    aMs: num(m?.aSearch?.msPerDecision), bMs: num(m?.bSearch?.msPerDecision),
  };
  const ok = complete === 1;
  const shown = ok && s.lo !== null && s.elo !== null && s.lo > 0.5 && s.elo >= 15 ? 1 : 0;
  const smallGain = ok && shown === 0 && s.lo !== null && s.elo !== null && s.lo > 0.5 && s.elo < 15 ? 1 : 0;
  const notShown = ok && shown === 0 && smallGain === 0 && s.eloHi !== null && s.eloHi < 15 ? 1 : 0;
  const inconclusive4800 = ok && shown === 0 && smallGain === 0 && notShown === 0 ? 1 : 0;
  const d517 = !ok ? null : shown ? 'SHOWN' : s.eloHi !== null && s.eloHi < 15 ? 'NOT SHOWN' : 'INCONCLUSIVE';
  const costRatio = s.aMs !== null && s.bMs !== null && s.bMs > 0 ? Math.round((s.aMs / s.bMs) * 10000) / 10000 : null;
  const noCost = s.aMs !== null && s.bMs !== null && s.aMs * 100 <= 105 * s.bMs ? 1 : 0;
  const run = typeof m?.id === 'string' ? m.id.slice(m.id.lastIndexOf(':') + 1) : null;
  const sameRun = ro !== null && run !== null && ro.run === run && typeof ro.aExposedGames === 'number';
  const exposure = { exposedGames: sameRun ? ro.aExposedGames : null, games: s.played, linesRead: sameRun ? ro.games ?? null : null,
    share: sameRun && s.played > 0 ? Math.round((ro.aExposedGames / s.played) * 10000) / 10000 : null,
    policyGames: sameRun ? ro.aPolicyGames ?? null : null, bar: Math.ceil((3 * GAMES) / 100) };
  const unexposed = notShown === 1 && !(sameRun && ro.aExposedGames * 100 >= 3 * s.played) ? 1 : 0;
  const knobTrackClosed = notShown === 1 && unexposed === 0 ? 1 : 0;
  const liveSeatCandidate = shown === 1 || smallGain === 1 ? 1 : 0;
  const cost = costRatio === null ? 'no cost read' : `${s.aMs} against ${s.bMs} ms a decision (x${costRatio}, ${noCost ? 'within' : 'outside'} 5%)`;
  const ex = exposure.share === null ? 'no exposure read for this match' : `exposure ${exposure.exposedGames} of ${exposure.games} games (${(exposure.share * 100).toFixed(2)}%)`;
  const reading = !ok ? (s.match === 0 ? 'NO MATCH: no verdict' : s.names === 0 ? 'NOT THIS MATCH: no verdict' : s.notJ195 === 0 ? 'J195\'S MATCH, NOT J197\'S: no verdict' : 'INCOMPLETE: no verdict')
    : shown ? `SHOWN: ${A}'s lower end ${s.lo} is above 0.5 and its point ${s.elo} Elo is at least +15; ${ex}; ${cost}; a candidate for the live seat under a separate decision`
    : smallGain ? `SMALL GAIN: ${A}'s lower end ${s.lo} is above 0.5 and its point ${s.elo} Elo is below +15 (D517 alone: ${d517}, upper end ${s.eloHi} Elo); ${ex}; ${cost}; the knob track does not close; a candidate for the live seat, for the owner under a separate decision`
    : notShown && unexposed ? `NOT SHOWN, UNEXPOSED: ${A}'s upper end ${s.eloHi} Elo is below +15, but ${ex} is under 3% (${cost}): the knob stays open until a rollout-level counter exists`
    : notShown ? `NOT SHOWN: ${A}'s upper end ${s.eloHi} Elo is below +15; ${ex}; ${cost}; with search-v2-ranked NOT SHOWN at J195, the knob track is closed for this deck set`
    : `INCONCLUSIVE AT 4,800: ${A}'s lower end ${s.lo}, point ${s.elo} Elo, upper end ${s.eloHi} Elo; ${ex}; ${cost}; left as information, not confirmed again`;
  return { written: 1, games: GAMES, bar: BAR, ...s, shown, smallGain, inconclusive4800, notShown, d517, unexposed, exposure, costRatio, noCost, knobTrackClosed, liveSeatCandidate,
    reading, j195: J195_A, j195Ranked: J195_RANKED };
}

function selftest(scratch) {
  fs.mkdirSync(scratch, { recursive: true });
  const mk = (o = {}) => ({ id: 'host:run-197', a: A, b: B, complete: true, played: GAMES, errors: 0, timeouts: 0,
    score: 0.5, lo: 0.4965, hi: 0.5035, elo: 0, eloLo: -2.4, eloHi: 2.4, aSearch: { msPerDecision: 980 }, bSearch: { msPerDecision: 978 }, ...o });
  const GAIN = { score: 0.526, lo: 0.5191, hi: 0.5329, elo: 18.1, eloLo: 13.3, eloHi: 22.9 };
  const J195LIKE = { score: 0.51, lo: 0.5031, hi: 0.5169, elo: 6.9, eloLo: 2.2, eloHi: 11.7 };
  const RO = (n, o = {}) => ({ run: 'run-197', games: GAMES, aExposedGames: n, aPolicyGames: n, ...o });
  const one = (r) => r.shown + r.smallGain + r.inconclusive4800 + r.notShown === 1;
  const cases = [
    ['a clear gain is SHOWN and a live-seat candidate, the track open', mk(GAIN), RO(296), (r) => r.shown === 1 && one(r) && r.liveSeatCandidate === 1 && r.knobTrackClosed === 0],
    ['a point of exactly +15 with the lower end above 0.5 is SHOWN', mk({ lo: 0.5146, elo: 15, eloLo: 10.2, eloHi: 19.8 }), RO(296), (r) => r.shown === 1 && one(r)],
    ['a lower end above 0.5 and a point of +14.9 is SMALL GAIN (D517 alone: INCONCLUSIVE)', mk({ lo: 0.5145, elo: 14.9, eloLo: 10.1, eloHi: 19.7 }), RO(296), (r) => r.smallGain === 1 && one(r) && r.d517 === 'INCONCLUSIVE' && r.knobTrackClosed === 0 && r.liveSeatCandidate === 1],
    ['lo 0.502 and a point of +8 is SMALL GAIN, the track open, a live-seat candidate', mk({ score: 0.5115, lo: 0.502, hi: 0.521, elo: 8, eloLo: 1.4, eloHi: 14.6 }), RO(296), (r) => r.smallGain === 1 && one(r) && r.d517 === 'NOT SHOWN' && r.notShown === 0 && r.knobTrackClosed === 0 && r.liveSeatCandidate === 1],
    ['lo 0.499 and a point of +8 is NOT SHOWN, the track closed', mk({ score: 0.5115, lo: 0.499, hi: 0.524, elo: 8, eloLo: -0.7, eloHi: 14.6 }), RO(296), (r) => r.notShown === 1 && one(r) && r.smallGain === 0 && r.knobTrackClosed === 1 && r.liveSeatCandidate === 0],
    ['lo 0.502 and a point of +15.1 is SHOWN, not SMALL GAIN', mk({ score: 0.5217, lo: 0.502, hi: 0.5414, elo: 15.1, eloLo: 1.4, eloHi: 28.8 }), RO(296), (r) => r.shown === 1 && one(r) && r.smallGain === 0 && r.liveSeatCandidate === 1],
    ['SMALL GAIN at 1% exposure stays SMALL GAIN, not UNEXPOSED', mk({ score: 0.5115, lo: 0.502, hi: 0.521, elo: 8, eloLo: 1.4, eloHi: 14.6 }), RO(48), (r) => r.smallGain === 1 && r.unexposed === 0 && r.knobTrackClosed === 0],
    ['SMALL GAIN at 10% more time a decision stays SMALL GAIN, the cost reported outside 5%', mk({ score: 0.5115, lo: 0.502, hi: 0.521, elo: 8, eloLo: 1.4, eloHi: 14.6, aSearch: { msPerDecision: 1078 }, bSearch: { msPerDecision: 980 } }), RO(296), (r) => r.smallGain === 1 && r.noCost === 0 && r.costRatio === 1.1],
    ['an arm at exactly 5% more time a decision is within 5%', mk({ aSearch: { msPerDecision: 1029 }, bSearch: { msPerDecision: 980 } }), RO(296), (r) => r.noCost === 1 && r.costRatio === 1.05],
    ['a lower end of exactly 0.5 is neither SHOWN nor SMALL GAIN', mk({ lo: 0.5, elo: 15, eloLo: 0, eloHi: 30 }), RO(296), (r) => r.shown === 0 && r.smallGain === 0 && r.inconclusive4800 === 1],
    ['a lower end under 0.5 and an upper end of +14.9 Elo is NOT SHOWN, the track closed', mk({ lo: 0.4995, elo: 7.4, eloLo: -0.3, eloHi: 14.9 }), RO(296), (r) => r.notShown === 1 && one(r) && r.knobTrackClosed === 1],
    ['a lower end under 0.5 and an upper end of exactly +15 Elo is INCONCLUSIVE AT 4,800', mk({ lo: 0.4995, elo: 7.5, eloLo: -0.3, eloHi: 15 }), RO(296), (r) => r.inconclusive4800 === 1 && one(r) && r.notShown === 0 && r.knobTrackClosed === 0 && r.liveSeatCandidate === 0],
    ['J195\'s point at 4,800 games ([+2.2, +11.7], lo 0.5031) is SMALL GAIN, the track open', mk(J195LIKE), RO(296), (r) => r.smallGain === 1 && one(r) && r.knobTrackClosed === 0 && r.liveSeatCandidate === 1],
    ['a loss is NOT SHOWN', mk({ score: 0.48, lo: 0.4731, hi: 0.4869, elo: -13.9, eloLo: -18.7, eloHi: -9.1 }), RO(296), (r) => r.notShown === 1 && r.knobTrackClosed === 1],
    ['exactly 3% exposure (144 of 4,800) is exposed: NOT SHOWN closes the track', mk(), RO(144), (r) => r.notShown === 1 && r.unexposed === 0 && r.exposure.share === 0.03 && r.knobTrackClosed === 1],
    ['143 of 4,800 is NOT SHOWN, UNEXPOSED: the track stays open', mk(), RO(143), (r) => r.notShown === 1 && r.unexposed === 1 && r.knobTrackClosed === 0],
    ['no exposure at all is UNEXPOSED', mk(), RO(0), (r) => r.unexposed === 1 && r.exposure.share === 0 && r.knobTrackClosed === 0],
    ['a reader file from another run gives no exposure: UNEXPOSED', mk(), RO(900, { run: 'run-x' }), (r) => r.unexposed === 1 && r.exposure.share === null && r.knobTrackClosed === 0],
    ['J195\'s reader file (its run, its 74 games) is another run: UNEXPOSED', mk(), RO(74, { run: '20261107T152316-2245667', games: 1200 }), (r) => r.unexposed === 1 && r.exposure.exposedGames === null],
    ['no reader file: UNEXPOSED', mk(), null, (r) => r.notShown === 1 && r.unexposed === 1 && r.knobTrackClosed === 0],
    ['SHOWN at 1% exposure stays SHOWN, not UNEXPOSED', mk(GAIN), RO(48), (r) => r.shown === 1 && r.unexposed === 0 && r.exposure.share === 0.01],
    ['INCONCLUSIVE AT 4,800 at 1% exposure stays INCONCLUSIVE', mk({ lo: 0.4998, elo: 8.6, eloLo: -0.1, eloHi: 17.3 }), RO(48), (r) => r.inconclusive4800 === 1 && r.unexposed === 0],
    ['a stopped match (complete: false, 3,000 played) gets no verdict', { ...mk(GAIN), complete: false, played: 3000 }, RO(180), (r) => r.complete === 0 && r.shown + r.smallGain + r.notShown + r.inconclusive4800 === 0 && r.knobTrackClosed === 0 && r.liveSeatCandidate === 0],
    ['4,799 games is not complete', { ...mk(GAIN), played: 4799 }, RO(296), (r) => r.complete === 0 && r.shown === 0],
    ['241 errors and timeouts is not complete', mk({ ...GAIN, errors: 200, timeouts: 41 }), RO(296), (r) => r.complete === 0 && r.shown === 0],
    ['240 errors and timeouts is complete', mk({ ...GAIN, errors: 200, timeouts: 40 }), RO(296), (r) => r.complete === 1 && r.shown === 1],
    ['J195\'s own 1,200-game line is not this match', { id: J195_ID, a: A, b: B, complete: true, played: 1200, errors: 0, timeouts: 0, score: 0.51, lo: 0.4962, hi: 0.5238, elo: 6.9, eloLo: -2.7, eloHi: 16.6 }, RO(74), (r) => r.complete === 0 && r.shown + r.smallGain + r.notShown + r.inconclusive4800 === 0],
    ['J195\'s id on a 4,800-game line is still not this match', { ...mk(GAIN), id: J195_ID }, RO(296), (r) => r.notJ195 === 0 && r.complete === 0],
    ['search-v2-ranked in the file is not this match', { ...mk(GAIN), a: 'search-v2-ranked' }, RO(296), (r) => r.names === 0 && r.shown === 0],
    ['the players swapped is not this match', { ...mk(GAIN), a: B, b: A }, RO(296), (r) => r.names === 0 && r.shown === 0],
    ['D390\'s fixed-rollout player search-v1-fixed3-routlets is not this match', { ...mk(GAIN), a: 'search-v1-fixed3-routlets' }, RO(296), (r) => r.names === 0 && r.shown === 0],
    ['no match file gives no verdict', null, RO(296), (r) => r.match === 0 && r.shown + r.smallGain + r.notShown + r.inconclusive4800 === 0 && r.knobTrackClosed === 0],
    ['J195 is carried beside, never pooled: the score is this match\'s alone', mk(J195LIKE), RO(296), (r) => r.score === 0.51 && r.played === 4800 && r.eloHi === 11.7 && r.j195.played === 1200 && r.j195.eloHi === 16.6],
  ];
  let ok = 0;
  cases.forEach(([what, m, ro, pred], i) => {
    const fm = path.join(scratch, `case-${i}-m.json`), fr = path.join(scratch, `case-${i}-ro.json`);
    if (m !== null) fs.writeFileSync(fm, JSON.stringify(m));
    if (ro !== null) fs.writeFileSync(fr, JSON.stringify(ro));
    const r = verdict(read(fm), read(fr));
    const pass = pred(r);
    console.error(`${pass ? 'ok  ' : 'FAIL'} ${what}: ${r.reading}`);
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
} else if (argv.length === 3) {
  const r = verdict(read(argv[0]), read(argv[1]));
  fs.mkdirSync(path.dirname(argv[2]), { recursive: true });
  fs.writeFileSync(argv[2], JSON.stringify(r, null, 1) + '\n');
  console.log(JSON.stringify(r));
} else {
  console.error('usage: node verdict.mjs <match.json> <rollouts.json> <out.json> | --selftest <dir>');
  process.exit(2);
}
J197EOF
cat > var/j197-tools/rollouts.cjs <<'J197EOF'
// J197: J195's reader (var/j195-tools/rollouts.cjs) unchanged but for this comment, so J197's exposure is read the way
// J195's was. Rollouts per searched decision (p + a + b) for each side of one match: the match line has no rollouts
// field, so this reads each batch line's aStats/bStats `search.rollouts`, `search.rounds` and
// `search.<p|a|b>.considered` (config A is the match's first player, as tools/ai-ladder/match.ts tallyBatch reads it),
// and D389's ranking counters, which are 0 on both sides of this match (neither ranks).
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
J197EOF
cat > var/j197-tools/seeds.cjs <<'J197EOF'
// J197: which deal blocks a match played, and that none of them is one J195's routlets match played (D398 point 2:
// the matchup's next unused block from the host's match base, so a new match of the same matchup takes new blocks).
// Reads every results line of <ladder dir>/results/*.jsonl whose purpose is the match's own `match:<id>` (the id in
// <match.json>; none when the file is absent) and those of J195's match (its id below, a constant), and reports each
// one's games, distinct blocks (`bseed`), their lowest and highest, and how many of this match's blocks J195 used.
// usage: node seeds.cjs <ladder dir> <match.json | none> <out.json>
const fs = require('fs');
const [dir, matchFile, out] = process.argv.slice(2);
const J195_PURPOSE = 'match:justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667';
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const m = read(matchFile);
const purpose = m && typeof m.id === 'string' ? `match:${m.id}` : null;
const t = { mine: { games: 0, blocks: new Set() }, j195: { games: 0, blocks: new Set() } };
const rdir = `${dir}/results`;
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir).filter((x) => x.endsWith('.jsonl')) : []) {
  for (const line of fs.readFileSync(`${rdir}/${f}`, 'utf8').split('\n')) {
    if (!line.includes('"purpose":"match:')) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (typeof r.bseed !== 'number') continue;
    if (purpose !== null && r.purpose === purpose) { t.mine.games++; t.mine.blocks.add(r.bseed); }
    if (r.purpose === J195_PURPOSE) { t.j195.games++; t.j195.blocks.add(r.bseed); }
  }
}
const sum = (s) => { const b = [...s.blocks].sort((x, y) => x - y); return { games: s.games, blocks: b.length, min: b.length ? b[0] : null, max: b.length ? b[b.length - 1] : null }; };
const mine = sum(t.mine), j195 = sum(t.j195);
const r = { purpose, ...mine, j195Games: j195.games, j195Blocks: j195.blocks, j195Min: j195.min, j195Max: j195.max,
  overlap: [...t.mine.blocks].filter((b) => t.j195.blocks.has(b)).length };
fs.writeFileSync(out, JSON.stringify(r) + '\n');
console.log(JSON.stringify(r));
J197EOF
rm -rf var/j197-tools/selftest
node var/j197-tools/verdict.mjs --selftest var/j197-tools/selftest > var/j197-tools/selftest.json
cat var/j197-tools/selftest.json
# the block reader on a synthetic results log: J195's purpose at two blocks, a new match at two blocks (one of them
# J195's) over three games, and a third purpose that must not count
rm -rf var/j197-tools/seeds-selftest
mkdir -p var/j197-tools/seeds-selftest/results
printf '%s\n' '{"purpose":"match:justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667","bseed":114900000}' '{"purpose":"match:justin-a-B650-GAMING-X-AX-V2:20261107T152316-2245667","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900149}' '{"purpose":"match:h:new","bseed":114900150}' '{"purpose":"match:h:new","bseed":114900150}' '{"purpose":"match:h:other","bseed":114900151}' > var/j197-tools/seeds-selftest/results/h.jsonl
echo '{"id":"h:new"}' > var/j197-tools/seeds-selftest/match.json
node var/j197-tools/seeds.cjs var/j197-tools/seeds-selftest var/j197-tools/seeds-selftest/match.json var/j197-tools/seeds-selftest/out.json
node -e 'const r=JSON.parse(require("fs").readFileSync("var/j197-tools/seeds-selftest/out.json","utf8"));const ok=r.games===3&&r.blocks===2&&r.min===114900149&&r.max===114900150&&r.j195Games===2&&r.j195Blocks===2&&r.overlap===1?1:0;require("fs").writeFileSync("var/j197-tools/seeds-selftest.json",JSON.stringify({ok})+"\n");console.log(JSON.stringify({ok}))'
# J195's blocks in the real results log, before the match: the match's blocks start after them (nextBseed)
node var/j197-tools/seeds.cjs var/ai-ladder none var/j197-tools/seeds-j195.json
```
```bash
# 4 games (one batch of one deck pair, one worker), in the pilot's own ladder folder and seed range, then each side's
# rollouts per searched decision and the arm's exposure from the batch's counters (the match line has none)
./tools/ai-ladder.sh match search-v2-routlets search-v1-anytime --games 4 --batch-pairs 1 --host j197-pilot --purpose pilot --dir var/ai-ladder-pilot/J197 --experiments var/ai-ladder-pilot/J197/experiments.jsonl --out var/ai-ladder-pilot/J197/match.json --jobs 1
node var/j197-tools/rollouts.cjs var/ai-ladder-pilot/J197 var/ai-ladder-pilot/J197/match.json var/j197-tools/rollouts-pilot.json
```
metrics: merged = sh: cat var/j197-merged.txt 2>/dev/null || echo 0
metrics: pl = sh: cat var/j197-tools/players.json 2>/dev/null || echo '{"ok":0}'
metrics: sd = sh: cat var/j197-tools/search-diff.json 2>/dev/null || echo '{"count":-1}'
metrics: st = sh: cat var/j197-tools/selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: sst = sh: cat var/j197-tools/seeds-selftest.json 2>/dev/null || echo '{"ok":0}'
metrics: s195 = sh: cat var/j197-tools/seeds-j195.json 2>/dev/null || echo '{"j195Blocks":0}'
metrics: pm = sh: cat var/ai-ladder-pilot/J197/match.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pr = sh: cat var/j197-tools/rollouts-pilot.json 2>/dev/null || echo '{"games":0}'
check: merged == 1
check: pl.ok == 1
check: pl.routlets_only_rollout == 1
check: pl.hashes_ok == 1
check: sd.count == 0
check: st.ok == 1
check: st.cases == 33
check: sst.ok == 1
check: s195.j195Games == 1200
check: s195.j195Blocks == 150
check: s195.j195Min == 114900000
check: s195.j195Max == 114900149
check: pm.complete == true
check: pm.played == 4
check: pm.errors + pm.timeouts <= 1
check: pm.aSearch.searched >= 10
check: pm.bSearch.searched >= 10
check: pr.games == 4
check: pr.aDecisions == pm.aSearch.searched
check: pr.bDecisions == pm.bSearch.searched
check: pm.aSearch.msPerDecision < 1500
check: pm.bSearch.msPerDecision < 1500

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main`;
- the build and the self-tests pass;
- both players resolve on this PC: `pl.v1_cfg_ok` and `pl.routlets_only_rollout` say search-v1-anytime's ai-bench
  config is search-v2's and the arm's is that with `,rollout=outlets` appended and nothing else, and `pl.hashes_ok`
  that both carry the hashes J195's (a) recorded, `cdd55e02a89c` and `b704d57245a1`;
- `sd.count`: no file under `bridge/src`, `tools/ai-ladder` or `tools/ai-bench` changed since J195's pin, so the
  match plays J195's code (`sd.files` would list them);
- the verdict script reads thirty-three synthetic match files (and reader files) as the rule says: the +15 point and
  the 0.5 lower end at and either side of their bars, the +15 upper end the same, SMALL GAIN against SHOWN and NOT
  SHOWN (lo 0.502 at +8: SMALL GAIN, the track open; lo 0.499 at +8: NOT SHOWN; lo 0.502 at +15.1: SHOWN), SMALL GAIN
  at 1% exposure and at 10% more time a decision, the 5% cost line exactly, J195's point at 4,800 games' width (SMALL GAIN),
  the exposure bar at exactly 3% (144 of 4,800: exposed) and just under it (143: UNEXPOSED), a reader file from J195's
  run refused, J195's own match line refused (by its id, and by its 1,200 games), 4,799 games and 241 errors not
  complete;
- the block reader counts a match's own blocks, J195's and their overlap on a synthetic log (`sst.ok`), and the real
  results log still holds J195's 150 blocks, 114,900,000-114,900,149, 1,200 games (`s195`), which is what makes the
  match take 114,900,150 onward;
- in 4 games both sides search, the rollout reader saw all 4 games and exactly the decisions the match line counts,
  and both stay under their 1.5 s budget on average.

Read, not checked:
- **the arm's exposure over the pilot's 4 games**: `pr.aExposedGames` of `pr.games` (and `pr.aPolicyGames`,
  `pr.bExposedGames`). At J195's 6.2% a game, 0 of 4 happens about 77% of the time, so a zero is not a failure; the
  night's exposure decides, under the rule;
- the arm's rollouts per decision against search-v2's (`pr.ratio`): expected near 1 (J195: 0.995).

There are no win-rate bounds. The match is the test.

## Commands
cores: 7
clean: var/ai-ladder/match-J197.json
```bash
# the confirmation: search-v2 with rollout=outlets against search-v2, 4,800 games on new blocks, a verdict
test -f var/j197-tools/verdict.mjs
mkdir -p var/j197
echo "J197: search-v2-routlets against search-v1-anytime, 4,800 games on the confirm set (D517's confirmation of J195's (a))"
./tools/ai-ladder.sh match search-v2-routlets search-v1-anytime --games 4800 --hours 12.25 --out var/ai-ladder/match-J197.json --jobs {workers}
tail -1 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/j197/verdict.json var/j197/report.md var/j197/rollouts.json var/j197/seeds.json
```bash
# the pre-registered reading; the rollouts, rounds and exposure; the blocks played; report.md (numbers only; the PC
# session writes the summary beside it)
node var/j197-tools/rollouts.cjs var/ai-ladder var/ai-ladder/match-J197.json var/j197/rollouts.json
node var/j197-tools/seeds.cjs var/ai-ladder var/ai-ladder/match-J197.json var/j197/seeds.json
node var/j197-tools/verdict.mjs var/ai-ladder/match-J197.json var/j197/rollouts.json var/j197/verdict.json
node - <<'J197EOF'
const fs = require('fs');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const m = read('var/ai-ladder/match-J197.json');
const ro = read('var/j197/rollouts.json');
const bs = read('var/j197/seeds.json');
const v = read('var/j197/verdict.json');
const j = v.j195 || {};
const pct = (x, d = 1) => (typeof x === 'number' ? `${(x * 100).toFixed(d)}%` : '-');
const runStart = (id) => {
  const x = /:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})-\d+$/.exec(id || '');
  return x ? Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]) : null;
};
const t0 = runStart(m.id), t1 = typeof m.at === 'string' ? Date.parse(m.at) : null;
const hours = t0 !== null && t1 !== null && Number.isFinite(t1) ? Math.round(((t1 - t0) / 3600000) * 100) / 100 : null;
const L = ['# J197: the routlets confirmation, search-v2-routlets against search-v1-anytime, 4,800 games (D517, D398)', ''];
L.push(`**Reading under the pre-registered rule:** ${v.reading ?? 'no verdict'}.`, '');
L.push(`**The knob track:** ${v.knobTrackClosed ? 'closed for this deck set (this match NOT SHOWN and exposed; search-v2-ranked NOT SHOWN at J195, upper end -2.9 Elo).' : v.smallGain ? `open: SMALL GAIN (D517 alone: ${v.d517}), a measured gain under D517's +15 bar; the routlets knob is a candidate for the live seat, for the owner to decide under a separate decision with its own evidence (D519 records the reading); nothing here changes the seat.` : v.liveSeatCandidate ? 'the routlets knob is a candidate for the live seat, under a separate decision with its own evidence; nothing here changes the seat.' : v.inconclusive4800 ? 'the routlets knob is left as information (INCONCLUSIVE AT 4,800), not confirmed again; search-v2-ranked stays NOT SHOWN from J195.' : v.unexposed ? 'open: NOT SHOWN, UNEXPOSED, until a rollout-level counter exists.' : 'no verdict (the match is not complete).'}`, '');
L.push('| match | played / planned | complete | score [95%] | Elo [95%] | pairs | draws, errors, timeouts | A ms per decision | B ms per decision | A rollouts per decision | B rollouts per decision | A / B rollouts | hours |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
L.push(`| J197 ${m.a} vs ${m.b} | ${m.played} / ${m.planned} | ${m.complete} | ${m.score} [${m.lo}, ${m.hi}] | ${m.elo} [${m.eloLo}, ${m.eloHi}] | ${m.pairs} | ${m.draws}, ${m.errors}, ${m.timeouts} | ${(m.aSearch || {}).msPerDecision ?? '-'} | ${(m.bSearch || {}).msPerDecision ?? '-'} | ${ro.aRolloutsPerDecision ?? '-'} | ${ro.bRolloutsPerDecision ?? '-'} | ${ro.ratio ?? '-'} | ${hours ?? '-'} |`);
L.push(`| beside it, never pooled: J195 (a), the same matchup | ${j.played ?? '-'} / 1200 | true | ${j.score ?? '-'} [${j.lo ?? '-'}, ${j.hi ?? '-'}] | ${j.elo ?? '-'} [${j.eloLo ?? '-'}, ${j.eloHi ?? '-'}] | ${j.pairs ?? '-'} | 0, 0, 0 | 984.443 | 977.505 | 14.45 | 14.52 | 0.995 | 2.68 |`);
L.push('');
L.push(`Config hashes: ${m.a} ${m.ah}, ${m.b} ${m.bh}. Deck set ${m.set}; match id ${m.id}. Rounds per searched decision ${ro.aRoundsPerDecision ?? '-'} / ${ro.bRoundsPerDecision ?? '-'}; the rollout reader saw ${ro.games ?? '-'} games and ${ro.aDecisions ?? '-'} / ${ro.bDecisions ?? '-'} searched decisions (the match line: ${(m.aSearch || {}).searched ?? '-'} / ${(m.bSearch || {}).searched ?? '-'}).`);
L.push(`Deal blocks: ${bs.blocks ?? '-'} blocks, ${bs.min ?? '-'} to ${bs.max ?? '-'}, ${bs.games ?? '-'} games; J195's routlets match played ${bs.j195Blocks ?? '-'} blocks, ${bs.j195Min ?? '-'} to ${bs.j195Max ?? '-'}; blocks in both: ${bs.overlap ?? '-'}. J195's games are not in this match (its purpose is its own) and are not pooled with it.`);
const ex = v.exposure || {};
L.push(`Cost: the arm thought ${v.aMs ?? '-'} ms a decision against search-v2's ${v.bMs ?? '-'} (x${v.costRatio ?? '-'}; within 5%: ${v.noCost ?? 0}); rollouts a decision x${ro.ratio ?? '-'}.`);
L.push(`Exposure, the routlets arm's seat: ${ex.exposedGames ?? '-'} of ${ex.games ?? '-'} games recorded an opportunity.* key (${pct(ex.share, 2)}; the rule's bar 3%, ${ex.bar ?? 144} of 4,800; J195's (a) 74 of 1,200, 6.2%; J194's base rate 5.3% to 6.0%), ${ex.policyGames ?? '-'} a policy.* key; search-v2's side ${ro.bExposedGames ?? '-'} and ${ro.bPolicyGames ?? '-'} of ${ro.games ?? '-'}. UNEXPOSED ${v.unexposed ?? 0}.`);
L.push('', '| side | decisions searched (games) | changed Forge: p | a | b | all | ms per decision (p+a+b) | ms p / a / b | budget fallbacks [95%] | other fallbacks | step timeouts |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const [who, t] of [[m.a, m.aSearch], [m.b, m.bSearch]]) {
  if (!t || !t.searched) { L.push(`| ${who} | no search | | | | | | | | | |`); continue; }
  const kd = t.byKind || {};
  const ch = (x) => (kd[x] ? `${kd[x].changed}/${kd[x].searched} (${pct(kd[x].rate)})` : '-');
  const other = Object.entries(t.fallback || {}).filter(([r]) => r !== 'budget').map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  const ms = t.msMean || {};
  L.push(`| ${who} | ${t.searched} (${t.games}) | ${ch('p')} | ${ch('a')} | ${ch('b')} | ${t.changed}/${t.searched} (${pct(t.searched ? t.changed / t.searched : null)}) | ${t.msPerDecision} | ${ms.p ?? '-'} / ${ms.a ?? '-'} / ${ms.b ?? '-'} | ${(t.fallback || {}).budget ?? 0} = ${pct(t.budgetRate)} [${pct(t.budgetLo)}, ${pct(t.budgetHi)}] | ${other} | ${t.stepTimeouts ?? '-'} |`);
}
L.push('', `Rule parts: complete ${v.complete ?? 0} (complete: true, ${v.games} games, errors + timeouts at most ${v.bar}); lower end above 0.5: ${typeof m.lo === 'number' && m.lo > 0.5 ? 1 : 0}; point at least +15 Elo: ${typeof m.elo === 'number' && m.elo >= 15 ? 1 : 0}; upper end below +15 Elo: ${typeof m.eloHi === 'number' && m.eloHi < 15 ? 1 : 0}. D517 alone: ${v.d517 ?? '-'}. SHOWN ${v.shown ?? 0}, SMALL GAIN ${v.smallGain ?? 0}, INCONCLUSIVE AT 4,800 ${v.inconclusive4800 ?? 0}, NOT SHOWN ${v.notShown ?? 0} (that order of precedence); exposed (at least 3%, when NOT SHOWN): ${v.notShown ? 1 - (v.unexposed ?? 1) : '-'}. Knob track closed: ${v.knobTrackClosed ?? 0}. Live-seat candidate (SHOWN or SMALL GAIN; a separate decision): ${v.liveSeatCandidate ?? 0}.`);
fs.mkdirSync('var/j197', { recursive: true });
fs.writeFileSync('var/j197/report.md', L.join('\n') + '\n');
console.log(L.join('\n'));
J197EOF
```
check: cm.complete == true
check: cm.played == 4800
check: cm.errors + cm.timeouts <= 240
check: bs.games == cm.played
check: bs.blocks == 600
check: bs.j195Blocks == 150
check: bs.overlap == 0
check: v.written == 1
check: v.complete == 1
check: v.shown + v.smallGain + v.inconclusive4800 + v.notShown == 1
check: v.shown == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.lo > 0.5 and cm.elo >= 15)
check: v.shown == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.lo > 0.5 and cm.elo >= 15)
check: v.smallGain == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.lo > 0.5 and cm.elo < 15)
check: v.smallGain == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.lo > 0.5 and cm.elo < 15)
check: v.notShown == 1 or not (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < 15 and not (cm.lo > 0.5))
check: v.notShown == 0 or (cm.complete == true and cm.played == 4800 and cm.errors + cm.timeouts <= 240 and cm.eloHi < 15 and not (cm.lo > 0.5))
check: v.exposure.exposedGames == ro.aExposedGames
check: v.unexposed == 1 or not (v.notShown == 1 and ro.aExposedGames * 100 < 3 * cm.played)
check: v.unexposed == 0 or (v.notShown == 1 and ro.aExposedGames * 100 < 3 * cm.played)
check: v.knobTrackClosed == 1 or not (v.notShown == 1 and v.unexposed == 0)
check: v.knobTrackClosed == 0 or (v.notShown == 1 and v.unexposed == 0)
check: v.liveSeatCandidate == v.shown + v.smallGain
check: v.noCost == 1 or not (cm.aSearch.msPerDecision * 100 <= 105 * cm.bSearch.msPerDecision)
check: v.noCost == 0 or (cm.aSearch.msPerDecision * 100 <= 105 * cm.bSearch.msPerDecision)

The first three checks say the match is complete: it was not stopped, all 4,800 games were played, and at most one in
20 ended in an engine error or a timeout. The next four say it is a new match on new deals: the block reader found
every game, 600 blocks, J195's 150 blocks still in the log, and none of them among the match's. The next three say the
verdict script ran, agrees the match is complete, and gave exactly one reading. The next six are the rule in the
runner's own language: `v.shown` is 1 exactly when the match is complete with its lower end above 0.5 and its point
at least +15 Elo, `v.smallGain` exactly when it is complete with its lower end above 0.5 and its point below +15, and
`v.notShown` exactly when it is complete, its lower end is not above 0.5 and its upper end is below +15 Elo (so
`v.inconclusive4800` is the rest, by the check before). The next three are the exposure rule: the verdict read the
exposure from the reader's file for this match, and `v.unexposed` is 1 exactly when the match is NOT SHOWN and fewer
than 3% of its games (144 of 4,800) recorded an `opportunity.*` key on the arm's seat. The next two say the knob track
is closed exactly when the match is NOT SHOWN and not UNEXPOSED (search-v2-ranked's NOT SHOWN from J195 is the other
half), the next that the arm is a live-seat candidate exactly when SHOWN or SMALL GAIN, and the last two that
`v.noCost` is 1 exactly when the arm's ms per decision on the match line is within 5% of search-v2's. Any reading passes them; a reading is not
a failure. The time per decision, the rollouts, the changed answers and the fallbacks are reported, not gated.

## Abort if
abort: j197_err >= 30 and j197_err > j197_games / 10

Engine trouble only: once 30 games of the match have ended in an engine error or a timeout, the job stops if they are
more than one in ten. The match has no stopping rule on the score, so the job never stops early on a result. Both
counts leave out J195's 1,200 games of the same matchup, which are in the same results log.

## Report
collect: var/ai-ladder/match-J197.json
collect: var/j197/verdict.json
collect: var/j197/report.md

`report.md` is the job's own numbers. The PC session writes `summary.md` from it, the same way as J194 and J195:
- **the reading under the rule:** SHOWN, SMALL GAIN, INCONCLUSIVE AT 4,800, NOT SHOWN or NOT SHOWN, UNEXPOSED. Give the arm's score
  against search-v2 with its 95% interval, the same in Elo, and the pair and game counts. On a SHOWN, say that it is a
  measured gain at 4,800 games and that making it the live seat is a separate decision with its own evidence (and
  under D509 a seat-queue row), never this job's. On a NOT SHOWN with exposure at least 3%, say that the routlets half
  of the knob track is closed for this deck set and, with search-v2-ranked NOT SHOWN at J195, the knob track is closed
  (the review's §5 row 6). On a SMALL GAIN, say both things plainly: a gain is measured (the lower end is above 0.5)
  and it is under D517's +15 bar (name D517's own reading, `v.d517`); the knob track does not close; the knob is a
  candidate for the live seat, for the owner to decide under a separate decision with its own evidence, never this
  job's; give the cost beside it (`v.aMs`, `v.bMs`, `v.costRatio`, within 5% or not) and say that a truly null knob
  reads SMALL GAIN about 2.5% of the time. On NOT
  SHOWN, UNEXPOSED, say so in those words and that the outlets knob stays open until a rollout-level counter exists.
  On INCONCLUSIVE AT 4,800, say that the knob is left as information and is not confirmed again. Whatever the reading,
  say that D519 records the SMALL GAIN extension and this night's reading under it, and is written when the night is read;
- **J195 beside it, never pooled:** J195's (a) line in its own row (+6.9 Elo [-2.7, +16.6] at 1,200 games, on blocks
  114,900,000-114,900,149) as a description of the match that triggered this one; never a combined score;
- **exposure:** the games in which the arm's seat recorded an `opportunity.*` key (and a `policy.*` key) of the games
  played, its share against the 3% bar (144 of 4,800), search-v2's side beside it, J195's 6.2% and J194's 5.3-6.0%,
  with the dilution said plainly: at this deck set's exposure the knob can act in roughly one game in sixteen, and a
  NOT SHOWN closes the track for this deck set, not for an outlet-heavy one;
- **the compute each side spent:** ms, rollouts and rounds per searched decision on both sides (`v.costRatio`, `ro.ratio`), budget
  fallbacks with their interval, other fallbacks and step timeouts; the changed answers by kind;
- **the deals:** the blocks played (`bs.min` to `bs.max`, expected 114,900,150-114,900,749) and that none was J195's;
- **the run:** draws, errors and timeouts, the match's hours, the pressure events in STATUS (drops, raises, any stop
  and its retry), and whether the GPU queue or anything else was running.

Never write "no gain", "no effect" or "no cost" for an interval that includes 0.5. If the match stopped early
(`complete: false`), say so: it gets no verdict, and what follows is a decision about reposting, not a reading.

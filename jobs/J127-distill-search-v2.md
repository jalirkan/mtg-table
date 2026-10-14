id: J127
title: B1, distilling search-v2 into a fast policy: 1,800 lab games of Vintage 180, Evan's cube and Synergy with search-v2 in both seats and D435's row exporter on (seeds 814,000,001+), one small candidate scorer per decision kind trained on what search-v2 played (split by game, 80/10/10), its held-out top-1 agreement per kind, then two fixed 1,200-game matches (600 mirrored pairs, D398): distilled vs search-v2 and distilled vs Forge Default
public_title: Distilled search policy: train and two fixed matches
public_est: ~6-9 h (one night)
public_decides: Ship a distilled search policy for lab games
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@e8d24480 (J126 re-posted as J127 after its pilot failed only on `merged == 1`: PR #141 is now merged, this is its merge commit on main; the split salt stays "J126|" as pre-registered. Was: the head of branch pc/j126-distill, mtg-table PR #141 (D435): the row exporter mtgtable.ai.DistillRows behind MTGTABLE_DISTILL_ROWS, the feature function DistillFeatures, the seat's SearchConfig distill=<model.json> and DistillModel, tools/ml/distill.py train/register/verdict/stats, the ladder kind search-distill and the match line's msPerDecision. The cloud reviews and merges that PR before this job runs and re-pins this line to the merge commit; the pilot refuses a pin that is not on origin/main. Pinned so every game is one code version, D341)
decides: whether the distilled policy (search-v2's own candidates at priority, attack and block, scored by a small model trained on search-v2's choices, no rollout) ships as a lab policy, a ladder player for faster lab games and a candidate for the live hint
hypothesis: search-v2 keeps Forge's answer at about 80-86% of the decisions it searches (J115, J116: it changes 20% of priority plays, 14% of attacks, 16-17% of blocks), so the always-Forge baseline agrees about 82% of the time and the question is how many of the other 18% a small model recovers; a distilled seat that recovers few of them plays close to Forge Default plus outlets, which search-v2 beats, so a score of 0.45-0.49 against search-v2 is the plausible range and SHIP is not the expected outcome; the speed side is near certain (the smoke: 3.2 ms a decision against search-v2's 715 ms)
rule: written 2026-10-14 before any J127 row was generated. SHIP the distilled player (search-v2-distill-<sha12>, kind search-distill, registered by distill.py register from this run's model) as a lab policy when ALL of (1) its fixed match against search-v1-anytime (search-v2) is complete, 1,200 of 1,200 games; (2) it is not shown worse than search-v2 by more than 0.03 in score: the lower end of the 95% interval on its score in that match (var/ai-ladder/match-J127-search.json, `lo`) is at least 0.47; (3) it is at least 10 times faster per decision: search-v2's mean decision time over the held-out TEST decisions of this run's rows (p + a + b, rows with a search fallback excluded; metrics.json test.searchMsMean) divided by the distilled seat's mean decision time in that same match (aSearch.msPerDecision: p + a + b, the same span, from before the candidates are generated to the verdict) is at least 10. Otherwise NOT SHOWN, naming the part that failed. distill.py verdict computes it (MARGIN 0.03, SPEEDUP 10). Fixed before the data: the split (by game, sha256("J126|<game key>") mod 100, the key being the rows folder (one a cube) and the lab's lab:<seed>:g<n>: 0-79 train, 80-89 val, 90-99 test), the exclusions (a row whose search fell back; a game without an ok end line), the model and its settings (distill.py train's defaults at the pinned commit: hidden 32, at most 40 epochs, patience 4 on validation loss, Adam lr 0.003, L2 0.0001, batch 512, seed 126, at least 200 training decisions for a kind to get a head), and that nothing is tuned on the test split. The agreement report and the match against Forge Default decide nothing: both are reported. An interval whose lower end is under 0.47 is "not shown non-inferior", never "worse"; a match that stopped early gives no verdict
followup: morning-read
est: ~6-9 h. Rows: 1,800 search-vs-search lab games (600 a cube) at 7 workers. J115 played search-vs-search at 51 s a game a worker (J112's lab decks 41 s; up to 75 s), so 1,800 games take ~3.7 h (2.9-5.4 h); this PC's smoke (6 Synergy drafts, 3 workers, at a load of 13 from other work) took 30.6 s a draft wall-clock, ~90 s a game a worker. Training ~5-15 min (numpy, 2 cores). Match vs search-v2: the distilled side decides in milliseconds, so a game costs about half of J115's, ~25-35 s a worker: 1,200 games ~1.2-1.7 h (up to 2.5 h). Match vs Forge Default: no search on either side, ~5-10 s a game: ~15-30 min. Pilot ~15 min. Total ~5.5-7.5 h at J115's speed, ~9 h at the smoke's
resumable: no
timeout: 10h
progress: metric units_done units of 4200
metrics: drafts_done = sh: cat var/ml/distill/J127/lab/vintage/drafts.jsonl var/ml/distill/J127/lab/evybaby/drafts.jsonl var/ml/distill/J127/lab/synergy/drafts.jsonl 2>/dev/null | grep -c . || true
metrics: match_games = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-distill-")&&(l.includes("\"b\":\"search-v1-anytime\"")||l.includes("\"b\":\"forge-default\"")))n++;console.log(n)'
metrics: match_err = sh: node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-distill-")&&(l.includes("\"b\":\"search-v1-anytime\"")||l.includes("\"b\":\"forge-default\""))&&(l.includes("\"error\":true")||l.includes("\"timeout\":true")))n++;console.log(n)'
metrics: units_done = sh: echo $(( $(cat var/ml/distill/J127/lab/vintage/drafts.jsonl var/ml/distill/J127/lab/evybaby/drafts.jsonl var/ml/distill/J127/lab/synergy/drafts.jsonl 2>/dev/null | grep -c . || true) + $(node -e 'const fs=require("fs");const f="var/ai-ladder/results";let n=0;for(const x of fs.existsSync(f)?fs.readdirSync(f):[])for(const l of fs.readFileSync(f+"/"+x,"utf8").split("\n"))if(l.includes("\"purpose\":\"match:")&&l.includes("\"a\":\"search-v2-distill-"))n++;console.log(n)') ))
metrics: dv = cubelab var/ml/distill/J127/lab/vintage
metrics: de = cubelab var/ml/distill/J127/lab/evybaby
metrics: ds = cubelab var/ml/distill/J127/lab/synergy
metrics: rs = sh: cat var/ml/distill/J127/rows-stats.json 2>/dev/null || echo '{"games":0,"rows":0,"p":0,"a":0,"b":0,"layoutOk":0}'
metrics: mt = sh: cat var/ml/distill/J127/metrics.json 2>/dev/null || echo '{"covered":[]}'
metrics: ms = sh: cat var/ai-ladder/match-J127-search.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: mf = sh: cat var/ai-ladder/match-J127-forge.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: vd = sh: cat var/ml/distill/J127/verdict.json 2>/dev/null || echo '{"ship":0,"written":0}'
headline: mt.test.agreement.rate, mt.test.forgeBaseline.rate, ms.score, ms.lo, ms.hi, ms.elo, mf.score, mf.elo, vd.speedup, vd.ship

**What is built** (mtg-table PR #141, D435). B1 of the search plan Justin approved on 2026-10-08. Nothing exported (state,
search choice) rows with the search's own candidates, so the PR adds the smallest complete mechanism:
- **The rows.** With `MTGTABLE_DISTILL_ROWS=<dir>` in a JVM's environment, every priority, attack and block decision of a
  SEARCHING seat appends one line to `<dir>/rows-<pid>.jsonl`: the state (D361's encoder with no cube cards: the 243 board
  features and the nine special slots x 17 states, 396 numbers, the deciding seat's knowledge only), each of the search's
  candidates as a short vector (Forge's answer first; 29 numbers for a priority play, 18 for an attack, 19 for a block), the
  index the seat PLAYED (0 after a fallback or an invalid declaration), the fallback, the decision's wall time. The cube lab
  names each game and writes an `end` line, so a game a killed worker left half-written is dropped.
- **The model.** `tools/ml/distill.py train`: per kind, a softmax over the decision's candidates of
  `w2 . relu(W1 x + b1) + u . x`, `x = [state, candidate, candidate - Forge's]`, numpy, early stopping on validation loss.
- **The seat.** `distill=<model.json>` in a search config: search-v2's own candidate generation, then the model's arg max (Forge's
  answer on a tie), no rollout. Mulligans and targets are Forge's, as in search-v2 (D417's switches were not adopted: J115,
  J116), so "the decisions search covers" are priority, attack and block. A kind the model does not cover keeps Forge's answer.
- **On the ladder:** kind `search-distill`, search-v2's params plus the model's 12-hex hash; `distill.py register` copies the
  model to `var/ml/models/distill-<sha12>.json` and writes a registry with `search-v2-distill-<sha12>`. Both sides of a match are
  timed by the same counter (`search.<kind>.us`), and the match line carries `msPerDecision` per side.

**The rows: 1,800 lab games, 600 a cube.** Vintage 180, Evan's cube (`evybaby`, 360) and Synergy, grid, best of one, the lab
drafter and builder (each cube's ratings file where it has one), both seats `Default+outlets+search:anytime=1`, which is
search-v2's exact config (the ladder's `search-v1-anytime`, `ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,
seed=0,anytime=1`). Both seats export, so each game gives both chairs' decisions; the split keeps a game's two chairs together.
The smoke gave ~51 priority, 14 attack and 6 block rows a game, so 1,800 games give about 90,000, 25,000 and 11,000, and the
test split (10% of the games) about 9,000, 2,500 and 1,100 decisions: agreement within about +-1, +-2 and +-3 points.

*Seeds.* 814,000,001-814,000,600 (Vintage), 814,100,001-814,100,600 (Evan's), 814,200,001-814,200,600 (Synergy); pilot
814,900,001-814,900,002 in each cube. D340's VERIFY range; no job has used 814M (J121 812M, J124 813M). The ladder deck sets'
reserved seeds are never drafted, and the matches play on the ladder's confirm set, which no lab draft reaches: the model never
sees a match deck.

**The matches** (D398, `ai-ladder.sh match`, the confirm set, mirrored pairs, no stopping rule), each 1,200 games, 600 pairs:
- `search-v2-distill-<sha12>` vs `search-v1-anytime` (search-v2, the live 1.5 s budget): the rule's match. At 600 pairs the score's
  95% half-width is about +-0.014 (J115: SE 0.0071), so a distilled player truly level with search-v2 passes (2) with about 97%
  probability, one at 0.49 about 80%, and one at 0.47 about 2.5%.
- `search-v2-distill-<sha12>` vs `forge-default`: reported beside it, decides nothing (where the distilled seat stands against
  the stock AI the lab's other games use).

**Never beside another heavy job.** `cores: 7` for every game block; `after: J125` because both jobs play the ladder's
`var/ai-ladder/` on the whole machine (and it gives the cloud time to merge PR #141 and re-pin).

## Pilot
About 15 minutes: the pin is merged; the build (DistillSelfTest inside) and the self-tests; 2 drafts a cube with the exporter on
(6 games, 3 workers), their rows counted; a model trained on them; 8 games of each match in the pilot's own ladder folder.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/ml-j127-merged.txt || echo 0 > var/ml-j127-merged.txt
cat var/ml-j127-merged.txt
./bridge/build.sh
./tools/ai-bench.sh --selftest
python3 -m unittest tools/ml/tests/test_distill.py
node --test web/test/ai-ladder.test.ts
```
```bash
# the exporter on, 2 drafts a cube (6 games), search-v2 in both seats
P=var/ml/distill/J127/pilot
mkdir -p "$P"
export CUBELAB_HOME_ROOT=var/ml/distill/J127/homes-pilot
SV2='Default+outlets+search:anytime=1,Default+outlets+search:anytime=1'
MTGTABLE_DISTILL_ROWS="$PWD/$P/rows/vintage" tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --games 1 --drafts 2 --jobs {workers} --seed 814900001 --profiles "$SV2" --out "$P/lab/vintage"
MTGTABLE_DISTILL_ROWS="$PWD/$P/rows/evybaby" tools/cubelab.sh run cubes/evybaby-cube-360.md --format grid --games 1 --drafts 2 --jobs {workers} --seed 814900001 --profiles "$SV2" --out "$P/lab/evybaby"
MTGTABLE_DISTILL_ROWS="$PWD/$P/rows/synergy" tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --games 1 --drafts 2 --jobs {workers} --seed 814900001 --profiles "$SV2" --out "$P/lab/synergy"
```
```bash
# the rows counted, a throwaway model, its player
P=var/ml/distill/J127/pilot
python3 tools/ml/distill.py stats "$P/rows" > "$P/rows-stats.json"
cat "$P/rows-stats.json"
python3 tools/ml/distill.py train "$P/rows" --out "$P/model.json" --metrics "$P/metrics.json" --min-train 10
python3 tools/ml/distill.py register --model "$P/model.json" --registry "$P/players.json" > "$P/player.txt"
cat "$P/player.txt"
```
```bash
# 8 games of each match, in the pilot's own ladder folder
P=var/ml/distill/J127/pilot
NAME=$(cat "$P/player.txt")
./tools/ai-ladder.sh match "$NAME" search-v1-anytime --games 8 --purpose pilot --registry "$P/players.json" --dir "$P/ladder" --experiments "$P/experiments.jsonl" --out "$P/match-search.json" --jobs {workers}
./tools/ai-ladder.sh match "$NAME" forge-default --games 8 --purpose pilot --registry "$P/players.json" --dir "$P/ladder" --experiments "$P/experiments.jsonl" --out "$P/match-forge.json" --jobs {workers}
```
metrics: merged = sh: cat var/ml-j127-merged.txt 2>/dev/null || echo 0
metrics: pr = sh: cat var/ml/distill/J127/pilot/rows-stats.json 2>/dev/null || echo '{"games":0,"layoutOk":0}'
metrics: pm = sh: cat var/ml/distill/J127/pilot/metrics.json 2>/dev/null || echo '{"kinds":{}}'
metrics: ps = sh: cat var/ml/distill/J127/pilot/match-search.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pf = sh: cat var/ml/distill/J127/pilot/match-forge.json 2>/dev/null || echo '{"played":0,"complete":false}'
metrics: pv = cubelab var/ml/distill/J127/pilot/lab/vintage
metrics: pe = cubelab var/ml/distill/J127/pilot/lab/evybaby
metrics: py = cubelab var/ml/distill/J127/pilot/lab/synergy
check: merged == 1
check: pv.drafts == 2
check: pe.drafts == 2
check: py.drafts == 2
check: pv.engine_errors + pe.engine_errors + py.engine_errors == 0
check: pr.games == 6
check: pr.unended == 0
check: pr.layouts == 1
check: pr.layoutOk == 1
check: pr.p >= 60
check: pr.a >= 12
check: pr.b >= 1
check: pr.fallback <= pr.rows / 10
check: pr.msMean between 100 and 3000
check: pm.kinds.p.covered == true
check: pm.kinds.a.covered == true
check: ps.complete == true
check: ps.played == 8
check: ps.errors + ps.timeouts <= 1
check: ps.aSearch.searched >= 20
check: ps.bSearch.searched >= 20
check: ps.aSearch.msPerDecision < 100
check: ps.bSearch.msPerDecision > 100
check: pf.complete == true
check: pf.played == 8
check: pf.errors + pf.timeouts <= 1

The pilot asks only whether anything is broken:
- `merged`: the pinned commit is on `origin/main` (the cloud merged PR #141 and, if it changed it, re-pinned);
- the build and the self-tests pass (DistillSelfTest's numpy parity, the ai-bench scenarios where search-v2 exports rows and the
  distilled seat decides with no rollout, the Python and ladder tests);
- the six pilot games end, every row file carries the one layout DistillSelfTest holds (`fixtures/distill/names.json`), and every
  kind has rows (the smoke had 51 p, 14 a and 6 b a game; the bars are a tenth of that);
- a model trains and the distilled player plays both pilot matches, deciding in milliseconds while search-v2 takes its budget.

There are no agreement or win-rate bounds: the pilot model is trained on six games and is thrown away.

## Commands
cores: 7
```bash
# 1. rows: Vintage 180, 600 drafts, search-v2 in both seats, the exporter on (resumes: the lab skips done seeds)
export CUBELAB_HOME_ROOT=var/ml/distill/J127/homes
export MTGTABLE_DISTILL_ROWS="$PWD/var/ml/distill/J127/rows/vintage"
tools/cubelab.sh run cubes/vintage-cube-180.md --format grid --games 1 --drafts 600 --jobs {workers} --seed 814000001 --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1' --out var/ml/distill/J127/lab/vintage
```
cores: 7
```bash
# 2. rows: Evan's cube (360), 600 drafts
export CUBELAB_HOME_ROOT=var/ml/distill/J127/homes
export MTGTABLE_DISTILL_ROWS="$PWD/var/ml/distill/J127/rows/evybaby"
tools/cubelab.sh run cubes/evybaby-cube-360.md --format grid --games 1 --drafts 600 --jobs {workers} --seed 814100001 --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1' --out var/ml/distill/J127/lab/evybaby
```
cores: 7
```bash
# 3. rows: Synergy, 600 drafts
export CUBELAB_HOME_ROOT=var/ml/distill/J127/homes
export MTGTABLE_DISTILL_ROWS="$PWD/var/ml/distill/J127/rows/synergy"
tools/cubelab.sh run cubes/synergy-cube-180.md --format grid --games 1 --drafts 600 --jobs {workers} --seed 814200001 --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1' --out var/ml/distill/J127/lab/synergy
```
cores: 2
mem_gb: 8
clean: var/ml/distill/J127/model.json var/ml/distill/J127/metrics.json var/ml/distill/J127/rows-stats.json
```bash
# 4. the rows counted, then the model and its held-out report (the pre-registered settings: distill.py train's defaults)
D=var/ml/distill/J127
python3 tools/ml/distill.py stats "$D/rows" > "$D/rows-stats.json"
cat "$D/rows-stats.json"
python3 tools/ml/distill.py train "$D/rows" --out "$D/model.json" --metrics "$D/metrics.json"
```
cores: 7
clean: var/ai-ladder/match-J127-search.json var/ml/distill/J127/players.json var/ml/distill/J127/player.txt
```bash
# 5. the player, and the rule's match: distilled vs search-v2, 1,200 games (600 mirrored pairs) on the confirm set
D=var/ml/distill/J127
python3 tools/ml/distill.py register --model "$D/model.json" --registry "$D/players.json" > "$D/player.txt"
NAME=$(cat "$D/player.txt")
echo "the distilled player: $NAME"
./tools/ai-ladder.sh match "$NAME" search-v1-anytime --games 1200 --hours 6 --registry "$D/players.json" --out var/ai-ladder/match-J127-search.json --jobs {workers}
```
cores: 7
clean: var/ai-ladder/match-J127-forge.json
```bash
# 6. beside it, deciding nothing: distilled vs Forge Default, 1,200 games
D=var/ml/distill/J127
NAME=$(cat "$D/player.txt")
./tools/ai-ladder.sh match "$NAME" forge-default --games 1200 --hours 3 --registry "$D/players.json" --out var/ai-ladder/match-J127-forge.json --jobs {workers}
tail -2 var/ai-ladder/match.jsonl
```
cores: 1
clean: var/ml/distill/J127/verdict.json var/ml/distill/J127/summary.md
```bash
# 7. the pre-registered reading and summary.md
D=var/ml/distill/J127
python3 tools/ml/distill.py verdict --metrics "$D/metrics.json" --match-search var/ai-ladder/match-J127-search.json --match-forge var/ai-ladder/match-J127-forge.json --out "$D/verdict.json"
python3 - "$D" <<'PY'
import json, os, sys
d = sys.argv[1]
def load(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}
mt = load(os.path.join(d, "metrics.json"))
rs = load(os.path.join(d, "rows-stats.json"))
vd = load(os.path.join(d, "verdict.json"))
ms = load("var/ai-ladder/match-J127-search.json")
mf = load("var/ai-ladder/match-J127-forge.json")
def iv(x):
    x = x or {}
    return f"{x.get('rate')} [{x.get('lo')}, {x.get('hi')}]" if x.get("rate") is not None else "-"
L = ["# J127: search-v2 distilled into a fast policy (B1, D435)", ""]
L.append(f"**Reading under the pre-registered rule: {vd.get('reading', 'no verdict')}.**")
L.append("")
L.append("## The rows")
L.append("")
L.append(f"{rs.get('games')} ended games ({rs.get('gamesNotOk')} not ok, {rs.get('unended')} unended, {rs.get('duplicate')} duplicates dropped); "
         f"{rs.get('rows')} rows: p {rs.get('p')}, a {rs.get('a')}, b {rs.get('b')}; search fallbacks {rs.get('fallback')}; "
         f"search-v2 overrode Forge on {rs.get('overrodeRate')} of them; its mean decision time {rs.get('msMean')} ms; layout ok {rs.get('layoutOk')}.")
L.append("")
L.append("## Held-out agreement with search-v2 (test split, by game)")
L.append("")
L.append("| kind | test decisions | games | top-1 agreement [95%] | always Forge [95%] | recall on search-v2's overrides | model overrides | precision of the model's overrides | search-v2 ms |")
L.append("|---|---|---|---|---|---|---|---|---|")
for k in ("p", "a", "b"):
    r = (mt.get("kinds") or {}).get(k) or {}
    t = r.get("test") or {}
    if not r.get("covered"):
        L.append(f"| {k} | not covered: {r.get('why', 'no rows')} | | | | | | | |")
        continue
    L.append(f"| {k} | {t.get('decisions')} | {t.get('games')} | {iv(t.get('agreement'))} | {iv(t.get('forgeBaseline'))} | "
             f"{iv(t.get('recallOnOverrides'))} | {t.get('modelOverrides')} | {iv(t.get('precisionOnModelOverrides'))} | {t.get('searchMsMean')} |")
te = mt.get("test") or {}
L.append(f"| p+a+b | {te.get('decisions')} | | {iv(te.get('agreement'))} | {iv(te.get('forgeBaseline'))} | | | | {te.get('searchMsMean')} |")
L.append("")
L.append(f"numpy's forward pass: {te.get('pythonInferMsPerDecision')} ms a decision (reference only; the seat's time is in the match).")
L.append("")
L.append("## The matches (D398, 600 mirrored pairs each, the confirm set)")
L.append("")
L.append("| against | played / planned | score [95%] | Elo [95%] | draws, errors, timeouts | distilled ms a decision | opponent ms a decision |")
L.append("|---|---|---|---|---|---|---|")
for name, m in (("search-v2 (search-v1-anytime)", ms), ("Forge Default", mf)):
    a, b = m.get("aSearch") or {}, m.get("bSearch") or {}
    L.append(f"| {name} | {m.get('played')} / {m.get('planned')} | {m.get('score')} [{m.get('lo')}, {m.get('hi')}] | "
             f"{m.get('elo')} [{m.get('eloLo')}, {m.get('eloHi')}] | {m.get('draws')}, {m.get('errors')}, {m.get('timeouts')} | "
             f"{a.get('msPerDecision')} | {b.get('msPerDecision')} |")
L.append("")
L.append(f"Speed-up (the rule's): search-v2's held-out {vd.get('heldOutSearchMs')} ms / the distilled seat's {vd.get('distillMsLive')} ms "
         f"= {vd.get('speedup')}x (bar 10); within the match: {vd.get('speedupLive')}x.")
L.append(f"Rule parts: complete {vd.get('complete')}, not worse by more than 0.03 {vd.get('notWorse')}, at least 10x faster {vd.get('fast')}; ship {vd.get('ship')}.")
with open(os.path.join(d, "summary.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(L) + "\n")
print("\n".join(L))
PY
```
check: dv.drafts == 600
check: de.drafts == 600
check: ds.drafts == 600
check: dv.engine_error_rate <= 2%
check: de.engine_error_rate <= 2%
check: ds.engine_error_rate <= 2%
check: rs.games >= 1700
check: rs.layoutOk == 1
check: rs.p >= 20000
check: rs.a >= 5000
check: rs.b >= 1000
check: mt.kinds.p.covered == true
check: mt.kinds.a.covered == true
check: mt.kinds.b.covered == true
check: ms.complete == true
check: ms.played == 1200
check: ms.errors + ms.timeouts <= ms.played / 20
check: mf.complete == true
check: mf.played == 1200
check: mf.errors + mf.timeouts <= mf.played / 20
check: vd.complete == 1
check: vd.margin == 0.03
check: vd.speedupBar == 10
check: (vd.notWorse == 1 and ms.lo >= 0.47) or (vd.notWorse == 0 and ms.lo < 0.47)
check: (vd.fast == 1 and vd.speedup >= 10) or (vd.fast == 0 and vd.speedup < 10)
check: vd.ship == vd.complete * vd.notWorse * vd.fast

The checks are the job's health and the rule's arithmetic, not the decision. The last five hold the verdict to the
pre-registered rule mechanically: its bars are 0.03 and 10, `notWorse` is exactly "the score's lower end against search-v2 is at
least 0.47", `fast` exactly "the speed-up is at least 10", and `ship` exactly all three parts. Whether the distilled policy
ships is `verdict.json`'s `ship` (the headline's last number): a NOT SHOWN is a finding, not a failed job, as in J115-J123. Blocks 1-3 resume (the cube lab skips the seeds it
has; a game a stopped worker left half-written has no `end` line and is dropped, its seed played again), blocks 4-7 own their
`clean:` paths, so a retry starts at the block that stopped. Blocks 5 and 6 are fixed matches with no stopping rule; a match that
stops early (`complete: false`) gives no verdict.

## Abort if
abort: match_err >= 30 and match_err > match_games / 10
abort: dv.drafts >= 100 and dv.engine_errors > 0.05 * dv.drafts
abort: de.drafts >= 100 and de.engine_errors > 0.05 * de.drafts
abort: ds.drafts >= 100 and ds.engine_errors > 0.05 * ds.drafts

Engine trouble only: more than one game in ten ending in an engine error or a timeout once 30 have (the matches), or more than 5%
engine errors in a cube's lab games once 100 drafts are in. Nothing stops on a score.

## Report
collect: var/ml/distill/J127/summary.md
collect: var/ml/distill/J127/verdict.json
collect: var/ml/distill/J127/metrics.json
collect: var/ml/distill/J127/rows-stats.json
collect: var/ml/distill/J127/model.json
collect: var/ml/distill/J127/player.txt
collect: var/ai-ladder/match-J127-search.json
collect: var/ai-ladder/match-J127-forge.json

`summary.md` is written by the job, in the shape of J115-J123's. The PC session adds its reading below it, plainly:
- **The rule** (`verdict.json`): SHIP or NOT SHOWN, each part beside its bar: the match complete (1,200 games), the score's lower
  end against 0.47, the speed-up against 10 (search-v2's held-out ms over the distilled seat's live ms), with the score and Elo
  and their intervals and the pair and game counts.
- **Agreement per kind** (`metrics.json`, test split): top-1 agreement with its interval beside the always-Forge baseline, and
  how many of search-v2's overrides the model recovers (recall) and how often its own overrides are right (precision). Say
  plainly if the model is close to "always Forge": that is a finding.
- **The match against Forge Default**, beside it, deciding nothing; search-v2's own standing against Forge Default from the
  ladder if there is one, for scale.
- **The run:** games and rows per cube, fallbacks, games dropped, each phase's hours (rows, training, each match), and whether the
  PC was in other use.
- Never write "worse than search-v2" for an interval whose lower end is under 0.47 but whose upper end is over it: that is "not
  shown non-inferior". If a match stopped early, say so; there is no verdict.
- **Leave the model where it is** (`var/ml/models/distill-<sha12>.json` in the lab clone): if it ships, the cloud registers the
  player in `tools/ai-ladder/players.json`.

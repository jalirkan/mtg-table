id: J136
title: The best 180 out of the whole library -- four candidate cubes (Omega, library hits by lab rating, a seeded random control, Synergy v3 if committed else v2) compared on D439's measures: 400 grid drafts each on one seed block (836,000,001-836,000,400), then each evolved 2 generations x 200 drafts from the 1,592-card library pool (no notes, exploration on), then the four evolved cubes compared on a fresh block (836,100,001-836,100,400); best of three, Default vs Default, unrecorded; no verdict rule
public_title: Best 180 from the whole library: four candidate cubes compared
public_est: ~5-7 h
public_decides: Which way of choosing 180 library cards drafts more balanced AI decks
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@68523b7e (the head of branch pc/library-180-candidates, mtg-table PR #146: cubes/library/ -- library-pool.tsv, hits-180.md, random-180.md, synergy-v2-180.md. THIS PIN DOES NOT HOLD `tools/cubelab.sh compare`, which is PR pc/cubelab-compare, D439, J133's: RE-PIN to the commit on origin/main that merges BOTH PRs before posting; the pilot fails on merged == 1 and has_compare == 1 until then)
decides: which way of seeding a 180-card cube from the whole library (Omega's design, the lab's greatest hits, an unselected random draw, the Synergy design) gives the more balanced AI drafts, before and after two generations of evolve from the same pool (Justin, 2026-10-15: "treat the entire library as one cube", approved as this comparison): a measurement for the owner and the cloud to read, not a switch
hypothesis: none to confirm. The random control should be the least balanced on card flatness (nothing selected it; 62 of its cards have no lab data and three are AI:RemoveDeck:All), and hits may be flatter than Omega on cards but not on colour pairs (it was chosen card by card, from metas of cubes with different power levels, with Ancestral Recall, Time Walk and two Moxen among its picks). Two 200-draft generations swap at most 6 cards a generation (dead cards, mostly), so the evolved cubes should differ from their inputs by a few cards and their tables by little
rule: D439 measures, written 2026-10-16 before any J136 draft. NO verdict rule: no --rule is passed. Per table (baseline, final) the summary reports, for each of the five pre-registered measure groups (flatness; pair_spread and pair_within5; draw_rate, timeout_rate and game_turns; lands, colours, two_colour and splash; first_pick_top10), every population's estimate with its 95% paired draft-clustered bootstrap interval (1,000 replicates, boot seed 1, colour pairs with 30+ decisive games), and every pairwise difference whose interval excludes 0, with its size. Before against after is read only as two intervals side by side, never as a test: the two tables are on different seed blocks and different cube lists. The swaps each evolve made are reported as evolve decided them (D331 discovery then confirmation, D357), with their evidence
followup: morning-read
est: ~5-7 h on 7 workers at the cube-lab guide's 25 s of one core per draft and best of three (pilot ~15 min). Stage 1: 1,600 drafts, ~1.6 h. Stage 2: 1,600 discovery drafts, ~1.6 h, plus a confirmation batch of 20-300 drafts in each of the eight generations that finds candidates (0-2,400 drafts, 0-2.4 h; ~1.2 h if half the generations confirm about 150). Stage 3: 1,600 drafts, ~1.6 h. Total 4,800-7,200 drafts: 4.8-7.1 h, ~6 h likely. J120 measured 2.6 s a draft wall clock on 7 workers (Synergy), which would make it ~3.5-5 h
resumable: yes
timeout: 16h
clean: var/lab-j136 var/cubelab/homes-J136
progress: cubelab var/lab-j136/baseline/runs var/lab-j136/evolve var/lab-j136/final/runs of 4800
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: base = sh: cat var/lab-j136/baseline/compare.json 2>/dev/null || echo '{"written":0}'
metrics: fin = sh: cat var/lab-j136/final/compare.json 2>/dev/null || echo '{"written":0}'
metrics: bstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j136/baseline/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: fstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j136/final/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: all = cubelab var/lab-j136/baseline/runs var/lab-j136/evolve var/lab-j136/final/runs
metrics: ev_omega = evolve var/lab-j136/evolve/omega
metrics: ev_hits = evolve var/lab-j136/evolve/hits
metrics: ev_random = evolve var/lab-j136/evolve/random
metrics: ev_synergy = evolve var/lab-j136/evolve/synergy
metrics: sw = sh: cat var/lab-j136/out/swaps.json 2>/dev/null || echo '{"written":0}'
headline: base.pop.omega.m.flatness.est, base.pop.hits.m.flatness.est, base.pop.random.m.flatness.est, base.pop.synergy.m.flatness.est, fin.pop.omega.m.flatness.est, fin.pop.hits.m.flatness.est, fin.pop.random.m.flatness.est, fin.pop.synergy.m.flatness.est, sw.swaps, all.engine_error_rate

**Why (Justin, 2026-10-15).** He asked to "treat the entire library as one cube" and approved the
productive version: seed several candidate 180s from the whole library by different ideas, play each on
the same seeds, evolve each a couple of generations from the whole library, and compare them on
pre-registered balance measures. mtg-table PR #146 (`pc/library-180-candidates`) committed the library
and the candidates under `cubes/library/` (`docs/guides/cube-lab.md`, *The whole library as a pool*);
D439 (`tools/cubelab.sh compare`, PR `pc/cubelab-compare`, J133's tool) is the measurement.

**The library** is `cubes/library/library-pool.tsv`: the union of ForgeCoach's nine cube documents and its
two proxy lists (the MTGO Vintage Cube 540 and Old School 93-94 360), 1,592 cards, 1,568 supported by
Forge 2.0.14 and 24 not (listed `no`, never drawn or added). It is the seed pool for every evolve here,
in omega-seed-pool.tsv's columns; the engine's facts replace its support and AI-flag columns at run time.

**The populations** (each an ordinary `run` under the compare folder's `runs/<name>/`; grid, best of three,
Default vs Default, the lab builder, unrecorded, no profile mix; every one on Forge's ranks -- none has a
ratings file beside it, Omega included -- so the comparison is of the lists):
- `omega`: `cubes/omega-cube-180.md` as it is (the designed greatest-hits cut).
- `hits`: `cubes/library/hits-180.md`, greatest hits by lab rating: supported cards with 80+ lab games across
  ForgeCoach's eight metas (814 of 1,568 eligible; 754 with fewer games or none are not), best pooled
  shrunk win rate under Omega's skeleton (24 a colour, 2 gold a pair, 18 colourless, 2 fixing lands a pair
  and 2 others, Omega's curve, every count exact).
- `random`: `cubes/library/random-180.md`, the control: every supported card keyed by `rng(180)` under the
  same skeleton; legal, colour-balanced, unselected.
- `synergy`: `cubes/library/synergy-v3-180.md` if that file exists at the pinned commit (J135 may propose a v3;
  someone must commit it there for this job to take it), else `cubes/library/synergy-v2-180.md`, ForgeCoach's
  Synergy v2 copied. The pilot records which (`var/lab-j136/synergy-cube.txt`; metric `syn.v3`), and every
  stage uses that one file. The population is named `synergy` either way.

**Stage 1, the baseline.** `compare` on the four, 400 drafts each, seeds 836,000,001-836,000,400 (D340's
verification range; no job in `jobs/` uses 836M), best of three -> `baseline.json`, `baseline.md`.

**Stage 2, evolve.** Each population evolved for 2 generations x 200 drafts from `library-pool.tsv`, with
**no notes** (`--notes none`: no file, so Omega's own `omega-notes.tsv` -- its Power and draft-decider
exclusions -- is NOT read; the library holds the Power Nine and the evolve may add one where a slot opens
and its rating is 60+, as it may for every population), exploration on (`--explore on`, D356), the evolve
knobs' defaults (at most 6 swaps a generation; D331 discovery then confirmation on fresh seeds; D357).
All four on the same seeds: discovery 186,000,001-186,000,400, confirmation from 187,000,001 (D340's lab
range; no job uses 186M or 187M). Unrecorded.

**Stage 3, the final table.** `compare` on the four evolved cubes (each evolve folder's latest cube, on
Forge's ranks), 400 drafts each, a fresh block 836,100,001-836,100,400 -> `final.json`, `final.md`.

**No verdict.** No `--rule`. compare ranks the populations on each measure with intervals and lists every
pairwise difference that excludes 0; the summary reports and leaves the reading to the owner.

**Outputs** (`var/lab-j136/out/`): `baseline.json`, `baseline.md`, `final.json`, `final.md` (compare's own
`compare.json` and `compare.md`, copied), `swaps.json` (numbers only) and `swaps.md` (each population's swaps,
generation by generation), each evolve's `changelog.md` and `evolve.json`, and the four evolved cubes. Never
`summary.md` or `metrics.json`: those names are the runner's and the PC session's.

**Not beside a queue night.** It aborts if a `queue run` starts. Every stage resumes (`run` skips the seeds it
has; evolve skips finished generations and resumes a started one; compare's analysis is a pure function of
the run folders), so a stop or a hold costs only the games in flight. To stop it cleanly: `tools/runner.sh
stop J136` (and `resume` carries on).

## Pilot
About 15 minutes: the pin is merged and holds compare; the library and compare tests on this pin; the four
cubes against Forge 2.0.14; then the three stages at their smallest -- compare at 4 drafts, evolve at 1
generation x 8 drafts with one game a draft, compare of the four evolved pilot cubes at 4 drafts -- on the
pilot's own seeds (836,900,001+, 836,950,001+; evolve 188,500,001+, confirmation 189,500,001+) and folders. At
4 drafts no card has 10 games, so the pilot's flatness rows are empty by design; the checks ask that every
stage ran on the same seeds and wrote strict, complete JSON.
```bash
mkdir -p var/lab-j136
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j136/merged.txt || echo 0 > var/lab-j136/merged.txt
grep -q "case 'compare'" tools/cubelab/cli.ts && echo 1 > var/lab-j136/has-compare.txt || echo 0 > var/lab-j136/has-compare.txt
cat var/lab-j136/merged.txt var/lab-j136/has-compare.txt
node --test web/test/cubelab-library.test.ts web/test/cubelab-compare.test.ts
if [ -f cubes/library/synergy-v3-180.md ]; then echo cubes/library/synergy-v3-180.md; else echo cubes/library/synergy-v2-180.md; fi > var/lab-j136/synergy-cube.txt
SYN=$(cat var/lab-j136/synergy-cube.txt)
head -1 "$SYN"
test ! -e none
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
for C in cubes/omega-cube-180.md cubes/library/hits-180.md cubes/library/random-180.md "$SYN"; do
  tools/cubelab.sh check "$C" > "var/lab-j136/check-$(basename "$C" .md).txt" || true
  grep -E "^(cards listed|in Forge's DB|unsupported)" "var/lab-j136/check-$(basename "$C" .md).txt"
done
node -e '
  const fs = require("node:fs");
  const files = fs.readdirSync("var/lab-j136").filter((f) => /^check-.*\.txt$/.test(f));
  let ok = 0, listed = 0;
  for (const f of files) {
    const t = fs.readFileSync("var/lab-j136/" + f, "utf8");
    if (/^cards listed\s+180$/m.test(t) && /^in Forge.s DB\s+180$/m.test(t) && /^unsupported\s+0$/m.test(t)) ok++;
    listed++;
  }
  const v3 = fs.readFileSync("var/lab-j136/synergy-cube.txt", "utf8").includes("synergy-v3") ? 1 : 0;
  fs.writeFileSync("var/lab-j136/pilot-cubes.json", JSON.stringify({ cubes: listed, cubes_ok: ok, v3 }) + "\n");
'
cat var/lab-j136/pilot-cubes.json
```
metrics: merged = sh: cat var/lab-j136/merged.txt 2>/dev/null || echo 0
metrics: has_compare = sh: cat var/lab-j136/has-compare.txt 2>/dev/null || echo 0
metrics: syn = sh: cat var/lab-j136/pilot-cubes.json 2>/dev/null || echo '{"cubes":0}'
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
tools/cubelab.sh compare --variant omega=cubes/omega-cube-180.md --variant hits=cubes/library/hits-180.md \
    --variant random=cubes/library/random-180.md --variant "synergy=$SYN" \
    --drafts 4 --games 3 --jobs {workers} --seed 836900001 --out var/lab-j136/pilot/baseline
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
for P in omega hits random synergy; do
  case "$P" in
    omega) C=cubes/omega-cube-180.md ;;
    hits) C=cubes/library/hits-180.md ;;
    random) C=cubes/library/random-180.md ;;
    synergy) C="$SYN" ;;
  esac
  tools/cubelab.sh evolve "$C" --pool cubes/library/library-pool.tsv --notes none \
      --generations 1 --drafts-per-gen 8 --games 1 --jobs {workers} --seed 188500001 --explore on \
      --out "var/lab-j136/pilot/evolve/$P"
done
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
E=var/lab-j136/pilot/evolve
tools/cubelab.sh compare --variant "omega=$E/omega/omega-cube-180.md" --variant "hits=$E/hits/hits-180.md" \
    --variant "random=$E/random/random-180.md" --variant "synergy=$E/synergy/$(basename "$SYN")" \
    --drafts 4 --games 1 --jobs {workers} --seed 836950001 --out var/lab-j136/pilot/final
cat var/lab-j136/pilot/final/compare.md | head -30
```
metrics: pb = sh: cat var/lab-j136/pilot/baseline/compare.json 2>/dev/null || echo '{"written":0}'
metrics: pf = sh: cat var/lab-j136/pilot/final/compare.json 2>/dev/null || echo '{"written":0}'
metrics: pbstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j136/pilot/baseline/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pfstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j136/pilot/final/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pe = cubelab var/lab-j136/pilot
metrics: pev_omega = evolve var/lab-j136/pilot/evolve/omega
metrics: pev_hits = evolve var/lab-j136/pilot/evolve/hits
metrics: pev_random = evolve var/lab-j136/pilot/evolve/random
metrics: pev_synergy = evolve var/lab-j136/pilot/evolve/synergy
check: merged == 1
check: has_compare == 1
check: qwriters == 0
check: syn.cubes == 4
check: syn.cubes_ok == 4
check: pbstrict == 1
check: pb.same_seeds == 1
check: pb.populations == 4
check: pb.drafts == 4
check: pb.seed_first == 836900001
check: pb.seed_last == 836900004
check: pb.pop.omega.drafts == 4
check: pb.pop.hits.drafts == 4
check: pb.pop.random.drafts == 4
check: pb.pop.synergy.drafts == 4
check: pb.boot.replicates == 1000
check: pev_omega.generations_done == 1
check: pev_hits.generations_done == 1
check: pev_random.generations_done == 1
check: pev_synergy.generations_done == 1
check: pev_omega.drafts + pev_hits.drafts + pev_random.drafts + pev_synergy.drafts == 32
check: pfstrict == 1
check: pf.same_seeds == 1
check: pf.populations == 4
check: pf.drafts == 4
check: pf.seed_first == 836950001
check: pe.engine_errors == 0
check: pe.timeouts <= 3
check: pe.recorded_games == 0

The pilot asks whether anything is broken: the pin is on origin/main and holds `compare`; the library and
compare tests pass on it; all four cubes are 180 cards that Forge 2.0.14 has and supports; the baseline
compare ran the four populations on the same four seeds and wrote strict JSON; each population evolved one
generation from the library pool (each evolve folder's latest cube is where stage 3 reads it); and the
compare of the four evolved cubes ran on its own seeds. No balance number is checked: the job is the
measurement.

Dry run (2026-10-16, `tools/runner.sh dry-run --max-seconds 120 --workers 2`, user-namespace sandbox,
against a local merge of PR #146 and `pc/cubelab-compare`, 88a91bfe, never pushed): pilot1 ok in 26 s (both
test files pass; four cubes 180/180, 0 unsupported; Synergy v2 chosen, no v3), pilot2 cut at 120 s with three
of the four 4-draft populations played and no error (Synergy's games are the long ones), pilot3 ok in 113 s
(four 1-generation evolves from the library pool, notes (none), exploration on, each latest cube where
stage 3 reads it), pilot4 ok in 70 s (the four evolved cubes compared, strict JSON, same seeds). Every pilot
check passed but `merged == 1` (the local merge is not on origin/main) and pilot2's, which were unread
because it was cut. Commands: run1 and run2 cut at 120 s with no error (run2 had played 33 Omega discovery
drafts); run3 refused because stage 2 had not finished (`no cube file var/lab-j136/evolve/omega/omega-cube-180.md`),
as a cut-short dry run must. The swaps tabulation was run on the pilot's evolve folders by hand and wrote
`swaps.json` (strict, numbers only) and `swaps.md`.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
test -s "$SYN"
tools/cubelab.sh compare --variant omega=cubes/omega-cube-180.md --variant hits=cubes/library/hits-180.md \
    --variant random=cubes/library/random-180.md --variant "synergy=$SYN" \
    --drafts 400 --games 3 --jobs {workers} --seed 836000001 --out var/lab-j136/baseline
mkdir -p var/lab-j136/out
cp var/lab-j136/baseline/compare.json var/lab-j136/out/baseline.json
cp var/lab-j136/baseline/compare.md var/lab-j136/out/baseline.md
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
test ! -e none
for P in omega hits random synergy; do
  case "$P" in
    omega) C=cubes/omega-cube-180.md ;;
    hits) C=cubes/library/hits-180.md ;;
    random) C=cubes/library/random-180.md ;;
    synergy) C="$SYN" ;;
  esac
  tools/cubelab.sh evolve "$C" --pool cubes/library/library-pool.tsv --notes none \
      --generations 2 --drafts-per-gen 200 --games 3 --jobs {workers} --seed 186000001 --explore on \
      --out "var/lab-j136/evolve/$P"
done
```
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J136
SYN=$(cat var/lab-j136/synergy-cube.txt)
E=var/lab-j136/evolve
tools/cubelab.sh compare --variant "omega=$E/omega/omega-cube-180.md" --variant "hits=$E/hits/hits-180.md" \
    --variant "random=$E/random/random-180.md" --variant "synergy=$E/synergy/$(basename "$SYN")" \
    --drafts 400 --games 3 --jobs {workers} --seed 836100001 --out var/lab-j136/final
mkdir -p var/lab-j136/out
cp var/lab-j136/final/compare.json var/lab-j136/out/final.json
cp var/lab-j136/final/compare.md var/lab-j136/out/final.md
for P in omega hits random synergy; do
  cp "$E/$P/changelog.md" "var/lab-j136/out/evolve-$P-changelog.md"
  cp "$E/$P/evolve.json" "var/lab-j136/out/evolve-$P.json"
done
cp "$E/omega/omega-cube-180.md" var/lab-j136/out/evolved-omega.md
cp "$E/hits/hits-180.md" var/lab-j136/out/evolved-hits.md
cp "$E/random/random-180.md" var/lab-j136/out/evolved-random.md
cp "$E/synergy/$(basename "$SYN")" var/lab-j136/out/evolved-synergy.md
node -e '
  const fs = require("node:fs");
  const E = "var/lab-j136/evolve", pops = ["omega", "hits", "random", "synergy"];
  const nums = { written: 1, swaps: 0, pop: {} };
  const md = ["# J136: the swaps each evolve made", "", "| population | generation | out | in | why | evidence |", "|---|---|---|---|---|---|"];
  for (const p of pops) {
    const ev = JSON.parse(fs.readFileSync(`${E}/${p}/evolve.json`, "utf8"));
    const gens = ev.generations || [];
    const why = {};
    let n = 0;
    for (const g of gens) for (const s of g.swaps || []) {
      n++;
      why[s.why] = (why[s.why] || 0) + 1;
      md.push(`| ${p} | ${g.gen} | ${s.out} | ${s.in} | ${s.why} | ${String(s.evidence || "").replace(/\|/g, "/")} |`);
    }
    const w = {};
    for (const [k, v] of Object.entries(why)) w[k.replace(/[^A-Za-z0-9]+/g, "_")] = v;
    nums.pop[p] = { generations: gens.length, swaps: n, why: w };
    nums.swaps += n;
  }
  fs.writeFileSync("var/lab-j136/out/swaps.json", JSON.stringify(nums, null, 1) + "\n");
  fs.writeFileSync("var/lab-j136/out/swaps.md", md.join("\n") + "\n");
'
cat var/lab-j136/out/swaps.md
```
check: bstrict == 1
check: base.same_seeds == 1
check: base.populations == 4
check: base.drafts == 400
check: base.seed_first == 836000001
check: base.seed_last == 836000400
check: base.boot.replicates == 1000
check: base.pop.omega.flatness_detail.readable == 1
check: base.pop.hits.flatness_detail.readable == 1
check: base.pop.random.flatness_detail.readable == 1
check: base.pop.synergy.flatness_detail.readable == 1
check: ev_omega.generations_done == 2
check: ev_hits.generations_done == 2
check: ev_random.generations_done == 2
check: ev_synergy.generations_done == 2
check: ev_omega.drafts == 400
check: ev_hits.drafts == 400
check: ev_random.drafts == 400
check: ev_synergy.drafts == 400
check: fstrict == 1
check: fin.same_seeds == 1
check: fin.populations == 4
check: fin.drafts == 400
check: fin.seed_first == 836100001
check: fin.seed_last == 836100400
check: fin.pop.omega.flatness_detail.readable == 1
check: fin.pop.hits.flatness_detail.readable == 1
check: fin.pop.random.flatness_detail.readable == 1
check: fin.pop.synergy.flatness_detail.readable == 1
check: sw.written == 1
check: all.engine_error_rate <= 2%
check: all.recorded_games == 0

What the checks mean: both tables cover the four populations on exactly their 400 seeds with 1,000
replicates and enough card games to read flatness; every evolve finished both generations at 200 discovery
drafts each; the swaps were tabulated; the engine did not fail. No check is on a balance number.

## Abort if
abort: qwriters > 0
abort: all.drafts >= 500 and all.engine_errors > 0.02 * all.drafts
abort: all.games >= 500 and all.timeouts > 0.05 * all.games
- Free disk under 10 GB.
- Any evolve generation's decision.discovery.deff over 2.0, or a swap that is not a note-cut without
  "confirmed on fresh seeds" in its evidence (there are no notes here, so every swap must say it).

## Report
collect: var/lab-j136/out/baseline.json
collect: var/lab-j136/out/baseline.md
collect: var/lab-j136/out/final.json
collect: var/lab-j136/out/final.md
collect: var/lab-j136/out/swaps.json
collect: var/lab-j136/out/swaps.md
collect: var/lab-j136/out/evolve-omega-changelog.md
collect: var/lab-j136/out/evolve-hits-changelog.md
collect: var/lab-j136/out/evolve-random-changelog.md
collect: var/lab-j136/out/evolve-synergy-changelog.md
collect: var/lab-j136/out/evolve-omega.json
collect: var/lab-j136/out/evolve-hits.json
collect: var/lab-j136/out/evolve-random.json
collect: var/lab-j136/out/evolve-synergy.json
collect: var/lab-j136/out/evolved-omega.md
collect: var/lab-j136/out/evolved-hits.md
collect: var/lab-j136/out/evolved-random.md
collect: var/lab-j136/out/evolved-synergy.md
collect: var/lab-j136/synergy-cube.txt

summary.md (the PC session's; the job's own outputs are the files above):
- Which Synergy ran (v2 or v3, `synergy-cube.txt`), and the pin.
- The baseline table and the final table, each measure group by group: the four estimates with their 95%
  intervals in rank order, and every pairwise difference whose interval excludes 0 with its size and
  interval. Say how many colour pairs each population had with 30+ decisive games (compare.md's line under
  pair_spread), and that pair_spread and first_pick_top10 are read as differences, not levels.
- Before and after, per population: the baseline and final estimates side by side with their intervals.
  Never call a move a change or a trend: the two tables are on different seed blocks and different lists.
- The swaps each evolve made (swaps.md): out, in, why, with discovery and confirmation numbers as the
  changelog gives them; name any Power Nine card or other card Omega's notes would have excluded that
  entered (no notes were read). A population with no swap: say so.
- No verdict and no "most balanced" overall: no rule was registered. Engine errors, timeouts, wall time per
  stage, and the drafts actually played (with confirmation batches).

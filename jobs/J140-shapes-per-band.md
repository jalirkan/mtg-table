id: J140
title: Census Phase 1, shapes per band -- for each power band (pauper, peasant, legacy, powered) 40 census cubes (10 each of the four colour structures, cubelab.sh sample --seed 140), 100 grid drafts each (16,000; seeds 840,000,001-840,016,000), best of one, Default vs Default, numbers only, every seat forced to a deck shape (D446 --shape-explore share=1, per-band weights so each shape expects about 1,500 built decks a band); labels per band and shape by a pre-registered interval rule (VIABLE / DOMINANT / NOT VIABLE); band offsets, card flow by shape and rough per-card ratings reported, deciding nothing
public_title: Library census phase 1: which deck shapes hold up in each power band
public_est: ~3 h
public_decides: Which deck shapes hold up in each power band (labels only; Justin decides)
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
after: J136
repos: mtg-table@99f5aa5a (the head of branch pc/census-shapes, mtg-table PR #153, D446; RE-PIN to the commit on origin/main that merges #153 before posting: the pilot fails on merged == 1 until then)
decides: which deck shapes (mono, two-colour, three-colour, good-stuff) the census's lab may offer in each power band -- a measurement for Justin, who decides what the builder may offer per band; the labels decide nothing by themselves
hypothesis: none to confirm. Two-colour, the lab's own deck and the control arm, should sit near 0.5 everywhere (its seats are today's drafter and builder, forced at random). Mono builds in only about half its seats (D446's offline measurement: ~90% in mono-heavy cubes, 17-42% elsewhere), and the decks it does build are the pools that suit it. The Forge AI plays aggro well and control poorly (the programme's stated bias), so fast, focused decks may do better than they would for people, and five-colour good-stuff worse
rule: written 2026-10-16 before any J140 draft, D446 point 7, the cloud's answers of 2026-10-16. Per band (the census band in each cube's header) and per shape, over the seats forced to the shape and built to it (no fallback; no mirror match, which the exploration never makes), the match win rate over decisive matches with its 95% percentile interval from a draft-clustered bootstrap (1,000 replicates, boot seed 1, a draft = a (folder, seed)): VIABLE iff the interval contains 0.5; DOMINANT iff it lies wholly above 0.55; NOT VIABLE iff wholly below 0.45; a row with fewer than 30 decisive matches gets no label. Labels only: no shape is chosen, promoted or removed by this job. Reported beside each row, deciding nothing: the land and colour rule it played under and its fallback rate
followup: morning-read
est: ~1.5-2 h of games at Bo1 rates (~10-12k drafts an hour on 7 workers: 16,000 drafts), plus 160 run start-ups (a facts lookup of ~2 s and the worker pool's boot each, ~10-20 min), plus ~15 min of pilot; say 3 h
resumable: yes
timeout: 10h
clean: var/lab-j140 var/cubelab/homes-J140
progress: cubelab var/lab-j140/runs of 16000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: all = cubelab var/lab-j140/runs
metrics: cnt = sh: cat var/lab-j140/out/counts.json 2>/dev/null || echo '{"drafts":0}'
metrics: sh = sh: cat var/lab-j140/out/shapes.json 2>/dev/null || echo '{"written":0}'
metrics: strict = sh: python3 -c "import json,sys; json.load(open('var/lab-j140/out/shapes.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
headline: sh.group.pauper.label.mono.est, sh.group.peasant.label.mono.est, sh.group.legacy.label.mono.est, sh.group.powered.label.mono.est, sh.group.legacy.label.good_stuff.est, all.drafts, all.engine_error_rate

**Why (Justin, 2026-10-16).** The library census (the cloud's notes of 2026-10-16 in this README, *NOTES TO
THE PC*; the PC's corrections, all accepted; J140's design in `pc-results/HEARTBEAT.md`, 2026-10-16 19:00,
and the cloud's answers to its three questions) learns each card's value in context, and colour structure is
a context. The lab drafter and builder aim at two colours, so mono and three-or-more-colour decks were never
measured fairly. PR #153 (D446) gives a seat a deck shape to draft and build to, and an exploration share
that forces shapes at random; this job measures each shape in each power band.

**The shapes** (D446, `SHAPE_RULES` in `tools/cubelab/shapes.ts`, all written before any test):

| shape | drafter | builder |
|---|---|---|
| mono | today's lean for two picks, then committed for good to the heaviest colour; on-colour or colourless only | one colour, a splash of at most 2 one-pip cards; 16 lands, 17 when its spells average mana value 3.0 or more |
| two-colour | today's lab drafter | today's builder (16 lands at an average of 2.5 or less, else 17; splash of at most 3) |
| three-colour | today's lean, then its three heaviest colours at a third of its picks; fixers weighted x2 | exactly three colours, no splash; 17 lands with 3+ fixers for them in the pool, else 18 |
| good-stuff | no lean, no synergy, the highest-rated card; +12 for any fixer | the most colours (3-5) its fixers support (3 a colour beyond two), no splash; 18 lands |

A seat whose shape has no legal build plays today's deck (`shapeFallback`): it counts by its colours in the
colour-count measures and is left out of its shape's row, and the row's fallback rate is reported.

**The cubes.** `tools/cubelab.sh sample --band <band> --structure <structure> --seed 140 --count 10
--cross-band 0.10` for each of the four bands and the four structures (mono-heavy, two-colour, three-colour,
good-stuff; D445): 160 documents, deterministic from census.tsv at the pin, each with its 10% cross-band slice
(CROSS cards from the neighbouring bands, for the offsets) and its FILL cards listed in the header. A
"powered" cube is about three quarters legacy fill (the powered band is 41 cards), which is what a vintage
cube is (the cloud, 2026-10-16). Cube k of the 160 (bands pauper, peasant, legacy, powered; structures in the
order above; cubes 1-10) drafts seeds 840,000,001 + 100k .. 840,000,100 + 100k (D340's verification range; no
job in `jobs/` uses 840M). Pilot seeds 840,900,001+.

**The exploration share.** Every seat is forced (`share=1`): the measured build rates leave no room for
unforced seats. Without mirrors (the plan never gives both seats one shape) a band's 4,000 drafts hold at
most 8,000 seats, and a shape with build rate b needs 1,500 / b of them. At the rates D446 measured
offline, the four shapes need about 7,700-7,900 seats a band, so share 1 is the only share that reaches
~1,500 built decks per shape. The weights equalise the expected built decks. They come from
`shapeMarginals` and the build rates measured offline under these weights, on 12 census cubes a band (3 per
structure, sample seed 977001, not this job's) and 90 drafts each, with no engine:

| band | build rate mono / two / three / good | weights mono / two / three / good | expected built decks per shape |
|---|---|---|---|
| pauper | 0.553 / 1.000 / 0.975 / 0.981 | 0.44 / 0.18 / 0.19 / 0.19 | ~1,650 |
| peasant | 0.479 / 1.000 / 0.986 / 0.972 | 0.52 / 0.16 / 0.16 / 0.16 | ~1,560 |
| legacy | 0.523 / 1.000 / 0.964 / 0.935 | 0.46 / 0.17 / 0.18 / 0.19 | ~1,590 |
| powered | 0.483 / 1.000 / 0.941 / 0.885 | 0.49 / 0.16 / 0.17 / 0.18 | ~1,520 |

The PR's engine smoke (8 drafts at equal weights on a legacy two-colour cube) built mono 3 of 4,
three-colour 4 of 4, good-stuff 3 of 6 and two-colour 2 of 2. That is consistent with these rates, but at 16
seats too few to set anything. About 1,500 is the expectation, not a floor. The final checks hold each row to
a sanity bound (1,200) and the counts are reported as they come. The weights change how many decks of each
shape are played, never how one is drafted, built or counted.

**Outputs** (`var/lab-j140/out/`): `shapes.json` (numbers only: per band `label.<shape>.{est,lo,hi,n,viable,
dominant,not_viable,fallback,seats}`, `shape.<key>` for D446's measures, `offset.<band>`), `shapes.md` (the
tables), `ratings-rough.tsv` (every played card's games within its band, report only), `counts.json` (seats,
shapes, fallbacks, mirrors) and `plan.tsv` (the 160 cubes with their seeds and sha256). Never `summary.md` or
`metrics.json`: those names are the runner's and the PC session's.

**Not beside a queue night.** It aborts if a `queue run` starts. Each `run` resumes (it skips the seeds it has),
and `shapes` is a pure function of the run folders, so a stop costs only the games in flight. To stop it
cleanly: `tools/runner.sh stop J140` (and `resume` carries on).

## Pilot
About 15 minutes. It checks that the pin is merged and holds the shapes, runs the shapes and census tests on
this pin, samples the 160 cubes (no engine) and checks them, then plays one two-colour cube per band at 4
drafts with every seat forced, on the pilot's own seeds, and reads them with `shapes`.
```bash
mkdir -p var/lab-j140
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j140/merged.txt || echo 0 > var/lab-j140/merged.txt
grep -q "case 'shapes'" tools/cubelab/cli.ts && grep -q 'shapeMarginals' tools/cubelab/shapes.ts && echo 1 > var/lab-j140/has-shapes.txt || echo 0 > var/lab-j140/has-shapes.txt
cat var/lab-j140/merged.txt var/lab-j140/has-shapes.txt
node --test web/test/cubelab-shapes.test.ts web/test/cubelab-census.test.ts
# the 160 cubes: 4 bands x 4 structures x 10, sample seed 140, the 10% cross-band slice
for B in pauper peasant legacy powered; do
  for S in mono-heavy two-colour three-colour good-stuff; do
    tools/cubelab.sh sample --band "$B" --structure "$S" --seed 140 --count 10 --cross-band 0.10 --out "var/lab-j140/cubes/$B-$S"
  done
done
cat > var/lab-j140/count.mjs <<'JS'
// node var/lab-j140/count.mjs cubes <out.json>          the 160 cubes and their manifests
// node var/lab-j140/count.mjs runs <root> <out.json>    every drafts.jsonl under <root>: seats, shapes, fallbacks, mirrors
import fs from 'node:fs';
import path from 'node:path';
const [mode, ...args] = process.argv.slice(2);
const walk = (d, f, depth = 0) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && depth < 3 && !['games', 'decks', 'logs'].includes(e.name)) walk(p, f, depth + 1);
    else if (e.isFile()) f(p);
  }
};
if (mode === 'cubes') {
  const doc = { cubes: 0, manifests: 0, census_headers: 0, bands: 0, structures: 0 };
  const bands = new Set(), structures = new Set();
  walk('var/lab-j140/cubes', (p) => {
    if (p.endsWith('.md')) {
      doc.cubes++;
      const m = /^# Census sample — ([a-z]+), ([a-z-]+), seed 140,/.exec(fs.readFileSync(p, 'utf8').split('\n', 1)[0]);
      if (m) { doc.census_headers++; bands.add(m[1]); structures.add(m[2]); }
    }
    if (p.endsWith('.tsv')) doc.manifests++;
  });
  doc.bands = bands.size; doc.structures = structures.size;
  fs.writeFileSync(args[0], JSON.stringify(doc) + '\n');
  console.log(JSON.stringify(doc));
} else if (mode === 'runs') {
  const doc = { drafts: 0, seats: 0, forced_seats: 0, mirrors: 0, fallbacks: 0, flow_marked_runs: 0, runs: 0 };
  const shapes = {};
  walk(args[0], (p) => {
    if (path.basename(p) === 'run.json') { doc.runs++; if (JSON.parse(fs.readFileSync(p, 'utf8')).shapes) doc.flow_marked_runs++; }
    if (path.basename(p) !== 'drafts.jsonl') return;
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!l.trim()) continue;
      const r = JSON.parse(l);
      doc.drafts++;
      const [a, b] = r.drafters;
      if (a.shape === b.shape && a.shape !== 'auto') doc.mirrors++;
      for (const d of r.drafters) {
        doc.seats++;
        if (d.shapeForced) doc.forced_seats++;
        if (d.shapeFallback) doc.fallbacks++;
        const k = String(d.shape).replace(/-/g, '_');
        shapes[k] = (shapes[k] ?? 0) + 1;
        if (!d.shapeFallback) shapes[`${k}_built`] = (shapes[`${k}_built`] ?? 0) + 1;
      }
    }
  });
  fs.mkdirSync(path.dirname(args[1]), { recursive: true });
  fs.writeFileSync(args[1], JSON.stringify({ ...doc, shape: shapes }) + '\n');
  console.log(JSON.stringify({ ...doc, shape: shapes }));
} else throw new Error('count.mjs cubes|runs');
JS
node var/lab-j140/count.mjs cubes var/lab-j140/pilot-cubes.json
```
metrics: merged = sh: cat var/lab-j140/merged.txt 2>/dev/null || echo 0
metrics: has_shapes = sh: cat var/lab-j140/has-shapes.txt 2>/dev/null || echo 0
metrics: pc = sh: cat var/lab-j140/pilot-cubes.json 2>/dev/null || echo '{"cubes":0}'
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J140
K=0
for B in pauper peasant legacy powered; do
  case "$B" in
    pauper) X="share=1,mono=0.44,two-colour=0.18,three-colour=0.19,good-stuff=0.19" ;;
    peasant) X="share=1,mono=0.52,two-colour=0.16,three-colour=0.16,good-stuff=0.16" ;;
    legacy) X="share=1,mono=0.46,two-colour=0.17,three-colour=0.18,good-stuff=0.19" ;;
    powered) X="share=1,mono=0.49,two-colour=0.16,three-colour=0.17,good-stuff=0.18" ;;
  esac
  C="var/lab-j140/cubes/$B-two-colour/$B-two-colour-140-001.md"
  test -s "$C"
  tools/cubelab.sh run "$C" --drafts 4 --games 1 --jobs {workers} --seed $((840900001 + 100 * K)) \
      --shape-explore "$X" --out "var/lab-j140/pilot/runs/$B/two-colour-1"
  K=$((K + 1))
done
printf '%s\n' var/lab-j140/pilot/runs/pauper/two-colour-1 var/lab-j140/pilot/runs/peasant/two-colour-1 \
    var/lab-j140/pilot/runs/legacy/two-colour-1 var/lab-j140/pilot/runs/powered/two-colour-1 > var/lab-j140/pilot/runs.txt
tools/cubelab.sh shapes $(cat var/lab-j140/pilot/runs.txt) --out var/lab-j140/pilot/out --boot 200
node var/lab-j140/count.mjs runs var/lab-j140/pilot/runs var/lab-j140/pilot/out/counts.json
head -20 var/lab-j140/pilot/out/shapes.md
```
metrics: pe = cubelab var/lab-j140/pilot/runs
metrics: pcnt = sh: cat var/lab-j140/pilot/out/counts.json 2>/dev/null || echo '{"drafts":0}'
metrics: psh = sh: cat var/lab-j140/pilot/out/shapes.json 2>/dev/null || echo '{"written":0}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j140/pilot/out/shapes.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
check: merged == 1
check: has_shapes == 1
check: qwriters == 0
check: pc.cubes == 160
check: pc.manifests == 16
check: pc.census_headers == 160
check: pc.bands == 4
check: pc.structures == 4
check: pe.drafts == 16
check: pe.engine_errors == 0
check: pe.timeouts <= 1
check: pe.recorded_games == 0
check: pcnt.drafts == 16
check: pcnt.seats == 32
check: pcnt.forced_seats == 32
check: pcnt.mirrors == 0
check: pcnt.flow_marked_runs == 4
check: pstrict == 1
check: psh.groups == 4
check: psh.drafts == 16
check: psh.group.pauper.drafts == 4
check: psh.group.peasant.drafts == 4
check: psh.group.legacy.drafts == 4
check: psh.group.powered.drafts == 4
check: psh.boot.replicates == 200

The pilot asks whether anything is broken. The pin is on origin/main and holds the shapes, and the tests
pass on it. The 160 cubes are census samples of four bands and four structures with their manifests. Four
pilot runs played every seat forced, with no mirror, no engine error and nothing recorded, and their run.json
marks the shapes (so cards.json carries card flow). `shapes` read them into four band groups and wrote
strict JSON. At 4 drafts a band no row has 30 decisive matches, so the pilot's labels are empty by design. No
win rate is checked: the job is the measurement.

Dry run (2026-10-16): `tools/runner.sh dry-run --max-seconds 120 --workers 2 --no-build` in the user and
mount namespace sandbox, against the PR worktree at 99f5aa5a, beside the running lab.
- pilot1 ok in 25 s (the tests pass; 160 cubes, 16 manifests, four bands, four structures); pilot2 ok in 94 s.
- Every pilot check passed except `merged == 1`, which cannot pass before #153 merges. Pilot counts: 16 drafts,
  32 of 32 seats forced, no mirror, no engine error, four flow-marked runs, `shapes` strict over four bands.
- run1 was cut at 120 s with no error and had played 75 drafts on 2 workers. run2 refused at once
  (`runs.txt` held fewer than 160 lines), as a cut-short dry run must.
- `tools/runner.sh check`: lint clean, machine-checked.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J140
mkdir -p var/lab-j140/out
# the same 160 cubes (deterministic: the same bytes as the pilot's), and the plan
for B in pauper peasant legacy powered; do
  for S in mono-heavy two-colour three-colour good-stuff; do
    tools/cubelab.sh sample --band "$B" --structure "$S" --seed 140 --count 10 --cross-band 0.10 --out "var/lab-j140/cubes/$B-$S"
  done
done
printf 'k\tband\tstructure\tcube\tfile\tseed_first\tseed_last\tsha256\n' > var/lab-j140/out/plan.tsv
: > var/lab-j140/runs.txt
K=0
for B in pauper peasant legacy powered; do
  case "$B" in
    pauper) X="share=1,mono=0.44,two-colour=0.18,three-colour=0.19,good-stuff=0.19" ;;
    peasant) X="share=1,mono=0.52,two-colour=0.16,three-colour=0.16,good-stuff=0.16" ;;
    legacy) X="share=1,mono=0.46,two-colour=0.17,three-colour=0.18,good-stuff=0.19" ;;
    powered) X="share=1,mono=0.49,two-colour=0.16,three-colour=0.17,good-stuff=0.18" ;;
  esac
  for S in mono-heavy two-colour three-colour good-stuff; do
    for I in 1 2 3 4 5 6 7 8 9 10; do
      C="var/lab-j140/cubes/$B-$S/$B-$S-140-$(printf '%03d' "$I").md"
      test -s "$C"
      SEED=$((840000001 + 100 * K))
      OUT="var/lab-j140/runs/$B/$S-$I"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$K" "$B" "$S" "$I" "$C" "$SEED" "$((SEED + 99))" "$(sha256sum "$C" | cut -c1-12)" >> var/lab-j140/out/plan.tsv
      echo "$OUT" >> var/lab-j140/runs.txt
      tools/cubelab.sh run "$C" --drafts 100 --games 1 --jobs {workers} --seed "$SEED" --shape-explore "$X" --out "$OUT"
      K=$((K + 1))
    done
  done
done
```
cores: 1
```bash
test "$(wc -l < var/lab-j140/runs.txt)" -eq 160
tools/cubelab.sh shapes $(cat var/lab-j140/runs.txt) --out var/lab-j140/out
node var/lab-j140/count.mjs runs var/lab-j140/runs var/lab-j140/out/counts.json
cat var/lab-j140/out/shapes.md | head -60
```
check: all.drafts == 16000
check: all.engine_error_rate <= 2%
check: all.recorded_games == 0
check: cnt.drafts == 16000
check: cnt.forced_seats == 32000
check: cnt.mirrors == 0
check: cnt.runs == 160
check: strict == 1
check: sh.groups == 4
check: sh.drafts == 16000
check: sh.boot.replicates == 1000
check: sh.group.pauper.drafts == 4000
check: sh.group.peasant.drafts == 4000
check: sh.group.legacy.drafts == 4000
check: sh.group.powered.drafts == 4000
check: sh.group.pauper.label.mono.n >= 1200
check: sh.group.pauper.label.two_colour.n >= 1200
check: sh.group.pauper.label.three_colour.n >= 1200
check: sh.group.pauper.label.good_stuff.n >= 1200
check: sh.group.peasant.label.mono.n >= 1200
check: sh.group.peasant.label.two_colour.n >= 1200
check: sh.group.peasant.label.three_colour.n >= 1200
check: sh.group.peasant.label.good_stuff.n >= 1200
check: sh.group.legacy.label.mono.n >= 1200
check: sh.group.legacy.label.two_colour.n >= 1200
check: sh.group.legacy.label.three_colour.n >= 1200
check: sh.group.legacy.label.good_stuff.n >= 1200
check: sh.group.powered.label.mono.n >= 1200
check: sh.group.powered.label.two_colour.n >= 1200
check: sh.group.powered.label.three_colour.n >= 1200
check: sh.group.powered.label.good_stuff.n >= 1200

The checks mean: every draft of every cube was played and read; every seat was forced and no match was a
mirror; `shapes` wrote strict JSON over the four bands at 4,000 drafts each and 1,000 replicates; and each
shape has at least 1,200 decisive built matches in each band. That last check is a sanity bound well under
the ~1,500 expected: a broken build, not a slow shape. No check is on a win rate.

## Abort if
abort: qwriters > 0
abort: all.drafts >= 500 and all.engine_errors > 0.02 * all.drafts
abort: all.games >= 500 and all.timeouts > 0.05 * all.games
- Free disk under 10 GB.

## Report
collect: var/lab-j140/out/shapes.json
collect: var/lab-j140/out/shapes.md
collect: var/lab-j140/out/ratings-rough.tsv
collect: var/lab-j140/out/counts.json
collect: var/lab-j140/out/plan.tsv

summary.md (the PC session's; the job's own outputs are the files above):
- The pin, and the cubes: 160, the sample seed, the seed blocks (plan.tsv), and each band's in-band, CROSS
  and FILL shares as the manifests give them.
- Per band, the by-shape table from shapes.md, in this order: mono, two-colour, three-colour, good-stuff. Give
  each row's match win rate with its interval, its decisive matches, its fallback rate, its land and colour
  rule, and its label (VIABLE, DOMINANT, NOT VIABLE, or none) exactly as the rule gives it. Two-colour is the
  control arm: say how far it sits from 0.5.
- No verdict beyond the labels. Say plainly that a label decides nothing, and that Justin decides which shapes
  the builder may offer per band. Every rate is "as Forge's AI plays it". A row's decks are the pools that let
  its shape build, so a mono row measures mono where mono was possible.
- Reported, deciding nothing:
  - the colour-count spread (cc1..cc4p, all decks) and `pair_within5` per colour count;
  - card flow per deck by shape and by colour count (the bias feature);
  - the band offsets from the cross-band slice, each with its interval and its deck-games;
  - the rough per-card ratings (`ratings-rough.tsv`): the number of cards per band, the median games a card,
    how many have 100+ games, and the line "report only -- J141 stratifies on these; its rule is written
    before they are read". Do not list top or bottom cards, and do not tune anything on them.
- Engine errors, timeouts, the wall time, and the drafts played per band.

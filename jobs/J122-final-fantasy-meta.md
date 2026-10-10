id: J121
title: Lab stats (meta.json) for the Final Fantasy Cube: its 180 cards against Forge 2.0.14, then 3,000-7,500 grid drafts, best of one, until the shipped metas' bar is met
public_title: Cube meta: the Final Fantasy Cube
public_est: ~2 h
public_decides: Ship a lab meta for the Final Fantasy Cube
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@a944b25 (branch c/hopeful-johnson-20lca7: main plus cubes/final-fantasy-cube-180.md, PR #132), ForgeCoach@bec2dba (branch c/hopeful-johnson-20lca7: the cube's registry entry and src/cube/meta.ts, PR #133, check the meta)
est: ~5 min pilot, then 3,000 drafts ~40 min, at most 7,500 ~1.7 h on 7 workers (J110 measured 4,490-4,730 grid drafts/h best of one on the queue, recording; this run records nothing)
resumable: yes
timeout: 4h
clean: var/cubelab/j121
progress: cubelab var/cubelab/runs/final-fantasy-J121 of 7500
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: ff = cubelab var/cubelab/runs/final-fantasy-J121
metrics: ffl = sh: cat var/cubelab/j121/check.json 2>/dev/null || echo '{"listed":0}'
metrics: cov = sh: cat var/cubelab/j121/out/coverage.json 2>/dev/null || echo '{"written":0}'
headline: ffl.listed, ffl.missing, ff.drafts, cov.share_ge80, cov.median_games, cov.ship
decides: whether ForgeCoach ships public/cubes/final-fantasy-cube-180.meta.json and drops the cube's labData: false (the cloud session copies it from results/J121/), and which of the cube's cards Forge 2.0.14 lacks (the cloud session lists them under the document's "Not in Forge 2.0.14")
hypothesis: Forge 2.0.14 (built 2026-08-08) has the whole Final Fantasy release (June 2025), so all 180 cards are in its database; a 180-card cube reaches the shipped metas' per-card bar within 3,000-7,500 grid drafts
rule: written 2026-10-10 before the run, J110's rule unchanged. The meta ships when ForgeCoach@bec2dba's parseMeta reads it (schema 1), its cubeForMeta names final-fantasy, no card key falls outside the cube, it rests on 100+ drafts, and at least 81% of its playable nonland cards (the cube's nonland cards less those Forge lacks) have 80+ decisive games. Drafting stops at the first of 3,000, 4,500, 6,000 or 7,500 drafts whose meta meets the bar: a stop on card counts, never on win rates. A missed bar at 7,500 is a finding, not a failure: the meta is collected and does not ship
followup: forgecoach-final-fantasy-meta

**Why.** The Final Fantasy Cube (ForgeCoach #133, mtg-table #132) is new: 180 cards from the Final Fantasy release,
picked with 17Lands' human draft data for Justin's two-player Grid drafts. ForgeCoach ships it with `labData: false`.
This job gives it the lab numbers every other cube has, and is the first check of its cards against the engine.
Justin approved it.

**The run.** The cube lab's normal `run`, as J110 drafted Evan's cube: grid, best of one, Default against Default,
the lab builder, no exploration, no profile mix, no recording. Folder `var/cubelab/runs/final-fantasy-J121`, its own
Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J121`). The cube has no ratings file, so it drafts on Forge's
draft ranks (FIN has a rank file if Forge ships one; an unranked card starts at the lab's `unrated` weight).

**Seeds.** 160,000,001+ for the run (at most 7,500), 161,000,001-161,000,030 for the pilot. In the D340 lab range,
clear of every seed in `jobs/` (the highest lab seed there is J120's 143,000,030) and of the nightly queue, which
counts each `cubes/*-cube-180.md` cube's seeds from 1 and will pick this cube up once #132 is merged.

**Cards Forge lacks.** `cubelab.sh check` lists them (it exits 1 when there are any; its output is read, not its
code). The lab drafts without them (`run.ts` lists them in `run.json`'s `missing`), so no game can error on them;
the coverage rule leaves them out. The summary names every one.

**Never beside a queue night.** The job aborts if a `queue run` starts.

## Pilot
About 5 minutes. The cube-lab tests on this pin; ForgeCoach's copy has the cube; the cube against the engine;
a 30-draft run in its own folder turned into a meta and read by ForgeCoach's parser.
```bash
node --test web/test/cubelab.test.ts
grep -q "id: 'final-fantasy'" {ForgeCoach}/src/cube/cubes.ts
cmp cubes/final-fantasy-cube-180.md {ForgeCoach}/public/cubes/final-fantasy-cube-180.md
mkdir -p var/cubelab/j121-tools var/cubelab/j121/pilot/out
cat > var/cubelab/j121-tools/ffcheck.mjs <<'J121EOF'
// J121: the cube against Forge 2.0.14 (`cubelab.sh check`'s output) and, with a run folder, that no card Forge
// lacks reaches a draft line.  usage: node ffcheck.mjs <check.txt> [<run dir>]
import fs from 'node:fs';
import path from 'node:path';
const [checkTxt, runDir] = process.argv.slice(2);
const t = fs.readFileSync(checkTxt, 'utf8');
const listed = Number((/^cards listed\s+(\d+)/m.exec(t) ?? [])[1] ?? -1);
const inDb = Number((/^in Forge's DB\s+(\d+)/m.exec(t) ?? [])[1] ?? -1);
const names = [...t.matchAll(/^ {2}MISSING\s+(.+?)\s{3}did you mean:/gm)].map((x) => x[1].trim());
const out = { listed, in_db: inDb, missing: names.length, names };
if (runDir) {
  const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  const rm = run.missing ?? [];
  out.run_missing = rm.length;
  out.run_missing_match = rm.length === names.length && rm.every((x) => names.includes(x)) ? 1 : 0;
  const needles = names.map((n) => JSON.stringify(n));
  let lines = 0, hit = 0;
  const f = path.join(runDir, 'drafts.jsonl');
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; lines++; if (needles.some((n) => l.includes(n))) hit++; }
  out.lines = lines;
  out.missing_in_lines = hit;
}
console.log(JSON.stringify(out));
J121EOF
cat > var/cubelab/j121-tools/ffcover.mjs <<'J121EOF'
// J121: the Final Fantasy meta read by ForgeCoach's own parser (src/cube/meta.ts, schema 1), matched by its
// cubeForMeta, and J110's rule on it.  usage: node ffcover.mjs <ForgeCoach checkout> <meta.json> <run.json>
import fs from 'node:fs';
import path from 'node:path';
const [fc, metaFile, runFile] = process.argv.slice(2);
const { parseMeta } = await import(path.resolve(fc, 'src/cube/meta.ts'));
const { cubeForMeta } = await import(path.resolve(fc, 'src/cube/cubes.ts'));
const GAMES = 80, SHARE = 0.81, MIN_DRAFTS = 100;  // J110's rule: META_STRENGTH, the shipped metas' lowest share, J075's bar
const r3 = (x) => Math.round(x * 1000) / 1000;
const raw = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
const m = parseMeta(raw);
const missing = new Set(JSON.parse(fs.readFileSync(runFile, 'utf8')).missing ?? []);
const typesOf = (c) => (Array.isArray(c.types) ? c.types : String(c.types ?? '').split(/\s+/));
const land = new Set(m.cube.cards.filter((c) => typesOf(c).includes('Land')).map((c) => c.name));
const nl = m.cube.cards.map((c) => c.name).filter((n) => !land.has(n) && !missing.has(n));
const g = nl.map((n) => m.cards[n]?.games ?? 0).sort((a, b) => a - b);
const names = new Set(m.cube.cards.map((c) => c.name));
const schemaOk = raw.schema === 1 && Array.isArray(raw.cube?.cards) && raw.cube.cards.length > 0 && raw.cards && typeof raw.cards === 'object'
  && Array.isArray(raw.archetypes) && Array.isArray(raw.pairs) && (raw.sample?.drafts ?? 0) > 0 ? 1 : 0;
const idOk = cubeForMeta(m)?.id === 'final-fantasy' ? 1 : 0;
const orphans = Object.keys(m.cards).filter((n) => !names.has(n)).length;
const drafts = m.sample?.drafts ?? 0;
const share = g.length ? r3(g.filter((x) => x >= GAMES).length / g.length) : 0;
const out = {
  written: 1, schema_ok: schemaOk, id_ok: idOk, orphans, drafts, games: m.sample?.games ?? 0, cube_cards: names.size, missing: missing.size,
  playable_nonland: nl.length, share_ge80: share, median_games: g.length ? g[Math.floor(g.length / 2)] : 0, p10_games: g.length ? g[Math.floor(0.1 * (g.length - 1))] : 0,
  lands_played: [...land].filter((n) => (m.cards[n]?.inDecks ?? 0) > 0).length, lands: land.size,
  threshold: { games: GAMES, share: SHARE, drafts: MIN_DRAFTS },
};
out.ship = schemaOk && idOk && orphans === 0 && drafts >= MIN_DRAFTS && share >= SHARE ? 1 : 0;
console.log(JSON.stringify(out));
J121EOF
export CUBELAB_HOME_ROOT=var/cubelab/homes-J121
P=var/cubelab/j121/pilot
# exits 1 when cards are missing: the checks below read its output
tools/cubelab.sh check cubes/final-fantasy-cube-180.md > var/cubelab/j121/check.txt || true
cat var/cubelab/j121/check.txt
tools/cubelab.sh run cubes/final-fantasy-cube-180.md --format grid --games 1 --drafts 30 --jobs {workers} --seed 161000001 --out $P/run
node var/cubelab/j121-tools/ffcheck.mjs var/cubelab/j121/check.txt $P/run > $P/check.json
tools/cubelab.sh meta $P/run --cube cubes/final-fantasy-cube-180.md
node var/cubelab/j121-tools/ffcover.mjs {ForgeCoach} $P/run/meta.json $P/run/run.json > $P/out/coverage.json
cat $P/check.json $P/out/coverage.json
```
metrics: pl = sh: cat var/cubelab/j121/pilot/check.json 2>/dev/null || echo '{"listed":0}'
metrics: pc = sh: cat var/cubelab/j121/pilot/out/coverage.json 2>/dev/null || echo '{"written":0}'
metrics: prun = cubelab var/cubelab/j121/pilot/run
check: qwriters == 0
check: pl.listed == 180
check: pl.in_db + pl.missing == 180
check: pl.run_missing_match == 1
check: pl.missing_in_lines == 0
check: prun.drafts == 30
check: prun.engine_errors == 0
check: pc.schema_ok == 1
check: pc.id_ok == 1
check: pc.orphans == 0

## Commands
```bash
# 1. up to 3,000, 4,500, 6,000, 7,500 drafts; stop at the first step whose meta meets the bar (card counts only)
export CUBELAB_HOME_ROOT=var/cubelab/homes-J121
E=var/cubelab/runs/final-fantasy-J121
O=var/cubelab/j121/out
mkdir -p "$O" var/cubelab/j121/steps
# a resumed run parses every line it finds: drop a line a stopped run left half-written
if [ -s "$E/drafts.jsonl" ]; then
  node -e 'const fs=require("fs");const f=process.argv[1];const b=fs.readFileSync(f);const k=b.lastIndexOf(10);if(k+1<b.length){fs.truncateSync(f,k+1);console.log("dropped a half-written last line");}' "$E/drafts.jsonl"
fi
for n in 3000 4500 6000 7500; do
  echo "== final-fantasy: up to $n drafts, $(date -Is)"
  tools/cubelab.sh run cubes/final-fantasy-cube-180.md --format grid --games 1 --drafts "$n" --jobs {workers} --seed 160000001 --out "$E"
  tools/cubelab.sh meta "$E" --cube cubes/final-fantasy-cube-180.md
  cp "$E/meta.json" "$O/final-fantasy-cube-180.meta.json"
  cp "$E/run.json" "$O/final-fantasy-cube-180.run.json"
  node var/cubelab/j121-tools/ffcover.mjs {ForgeCoach} "$O/final-fantasy-cube-180.meta.json" "$O/final-fantasy-cube-180.run.json" > "var/cubelab/j121/steps/ff-$n.json"
  cat "var/cubelab/j121/steps/ff-$n.json"
  if node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(r.share_ge80 >= r.threshold.share ? 0 : 1)' "var/cubelab/j121/steps/ff-$n.json"; then
    echo "== final-fantasy: the bar is met at $n drafts"
    break
  fi
done
```
cores: 1
```bash
# 2. the checks' numbers and summary.md
O=var/cubelab/j121/out
E=var/cubelab/runs/final-fantasy-J121
node var/cubelab/j121-tools/ffcheck.mjs var/cubelab/j121/check.txt "$E" > var/cubelab/j121/check.json
node var/cubelab/j121-tools/ffcover.mjs {ForgeCoach} "$O/final-fantasy-cube-180.meta.json" "$O/final-fantasy-cube-180.run.json" > "$O/coverage.json"
cp var/cubelab/j121/check.txt "$O/forge-check.txt"
cat var/cubelab/j121/check.json "$O/coverage.json"
```
check: ff.drafts >= 3000
check: ff.engine_error_rate <= 2%
check: ffl.listed == 180
check: ffl.run_missing_match == 1
check: ffl.missing_in_lines == 0
check: ffl.lines >= 3000
check: cov.schema_ok == 1
check: cov.id_ok == 1
check: cov.orphans == 0

What the checks mean: the run is the cube's, at least 3,000 drafts, the engine did not fail, the cards Forge lacks
never reached a draft, and ForgeCoach's parser reads the meta as this cube's. Whether it ships is the rule's
(`cov.ship`), read in the summary, not a check: a missed bar is a finding.

## Abort if
abort: qwriters > 0
abort: ff.drafts >= 500 and ff.engine_errors > 0.02 * ff.drafts
abort: ff.games >= 500 and ff.timeouts > 0.05 * ff.games
- Free disk under 10 GB.

## Report
collect: var/cubelab/j121/out/final-fantasy-cube-180.meta.json
collect: var/cubelab/j121/out/final-fantasy-cube-180.run.json
collect: var/cubelab/j121/out/coverage.json
collect: var/cubelab/j121/out/forge-check.txt
collect: var/cubelab/j121/check.json
collect: var/cubelab/j121/steps/
collect: var/cubelab/j121/pilot/check.json

summary.md:
- Forge: how many of the 180 cards are in Forge 2.0.14's database, and every one that is not, by name.
- The rule, from `coverage.json`: ships or not, with each number beside its bar (schema, cube id, orphans, drafts,
  share of playable nonland cards with 80+ decisive games, median and 10th-percentile games), and the step it
  stopped at with each step's share.
- The ten colour pairs' deck win rates from the meta's `pairs` with their intervals, and the five cards with the
  most and the least decisive games: descriptive, Forge AI against Forge AI, not a verdict on the cube.
- Totals: drafts, games, wall time, engine errors and timeouts.

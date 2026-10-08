id: J110
title: Lab stats (meta.json) for every cube Justin drafts: Omega, Fair Fight and Peasant built from the queue's plain Default-vs-Default drafts, and Evan's cube (evybaby, 360 cards) drafted afresh, 4,500-7,000 grid drafts, best of one
public_title: Cube metas: Omega, Fair Fight, Peasant, Evybaby
public_est: ~2 h
public_decides: Ship lab metas for four more cubes
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@59a0ced (current main: Evan's cube cubes/evybaby-cube-360.md, #99), ForgeCoach@0011633 (J109's pin: its src/cube/meta.ts parser and cubes.ts registry, with evybaby, #106, check the metas)
est: ~5 min for the three queue metas, then Evan's drafting: 4,500 drafts ~1 h, at most 7,000 ~1.5 h on 7 workers (queue nights measured 4,490-4,730 drafts/h, best of one, recording every game; this run records nothing)
resumable: yes
timeout: 5h
progress: cubelab var/cubelab/runs/evybaby-J110 of 7000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: ev = cubelab var/cubelab/runs/evybaby-J110
metrics: fl = sh: cat var/cubelab/j110/filter.json 2>/dev/null || echo '{"min_kept":0}'
metrics: evl = sh: cat var/cubelab/j110/evy-lines.json 2>/dev/null || echo '{"lines":0}'
metrics: mc = sh: cat var/cubelab/j110/out/coverage.json 2>/dev/null || echo '{"written":0}'
headline: mc.ship_count, mc.omega.share_ge80, mc.fair_fight.share_ge80, mc.peasant.share_ge80, mc.evybaby.share_ge80, mc.evybaby.drafts
decides: whether ForgeCoach ships lab meta.json files for Omega, Fair Fight, Peasant and Evan's cube (evybaby) and drops their labData: false (the cloud session copies them from results/J110/)
hypothesis: the queue's plain Default-vs-Default drafts give Omega, Fair Fight and Peasant at least the shipped four's per-card data; Evan's 360-card cube, whose cards each reach about half as many grid drafts as a 180-card cube's, reaches the same per-card bar within 4,500-7,000 drafts; the 13 cards Forge 2.0.14 lacks never reach a draft line
rule: written 2026-10-08 before the run. A cube's meta ships when ForgeCoach@0011633's parseMeta reads it (schema 1) and its cubeForMeta names that cube, no card key falls outside the cube, it rests on 100+ drafts (J075), and at least 81% of its playable nonland cards (the cube's nonland cards less those Forge lacks) have 80+ decisive games. 80 is ForgeCoach's META_STRENGTH, the games at which a card's lab number carries half its weight; 0.81 is the lowest share among the four shipped metas (Pauper 0.819; Synergy 0.831, Vintage 0.843, Modern-Era 0.894), rounded down. A meta under the bar is not shipped, and the summary says how many more drafts it would need. Evan's drafting stops at the first of 4,500, 6,000 or 7,000 drafts whose meta meets the bar: a stop on card counts, never on win rates, so it biases no rate
followup: forgecoach-metas

**Why.** ForgeCoach ships lab metas for four cubes (Modern-Era, Pauper, Synergy, Vintage: J075) and marks
Omega, Fair Fight, Peasant and Evan's new cube `labData: false`. Justin drafts all of them. The research
retrospective (2026-10-08, §3F-G) found that the queue already holds 12-21k drafts each for Omega, Fair Fight
and Peasant; nobody built their metas. Evan's cube has no lab data at all. Justin approved this job.

**Part 1: Omega, Fair Fight and Peasant, from the queue (read-only, minutes).** As J075 did for the other four,
with one more filter. Nights 4 and 5 drew each seat's play profile from D375's mix (Default 0.5, Reckless 0.25,
Cautious 0.25). Every shipped meta is Default against Default (`sample.aiProfile: "Default"`), and `meta` drops
only the drafts whose games explored (D358). So `filter.mjs` copies each `var/cubelab/queue/normal/<cube>/`
folder's `run.json`, `cards.json` and complete `drafts.jsonl` lines into `var/cubelab/j110/stage/<cube>/`. It keeps
only plain lines whose two seats are Default: the line's own `profiles` (D347), or `run.json`'s when the line has
none, as on nights 1-3. Then `tools/cubelab.sh meta <stage> --cube cubes/<cube>-cube-180.md` runs. Nothing is
written into the queue. Omega's queue drafts used Omega's default ratings, which are Forge's ranks: there is no
`omega-cube-180.ratings.tsv`, and the raised file of J064 is still unpromoted (retro §3H). So this meta describes the
drafter ForgeCoach's Draft vs AI has today; if the raised ratings are promoted, the meta is rebuilt. The summary
lists each folder's `ratingsFile`.

**Part 2: Evan's cube, drafted (1-1.5 PC-hours).** The cube lab's normal `run` command is used, not a queue night:
grid, best of one (as every shipped meta), Default against Default, the lab builder, no exploration, no profile mix and
no recording. The folder is `var/cubelab/runs/evybaby-J110`, seeds 1+, and the job uses its own Forge homes,
`CUBELAB_HOME_ROOT=var/cubelab/homes-J110`. Evan's cube has no ratings file, so it drafts on Forge's draft ranks,
and an unranked card starts at the lab's `unrated` weight. Omega drafted the same way in the queue. The cube
lab's parser reads the document: all 360 cards, 8 sections, no warnings (checked in the cloud on 59a0ced).

*Sizing.*
- **Speed.** The queue nights ran 4,490 (night 3) and about 4,730 (night 4) drafts an hour, on 7 workers at best
  of one, recording every game. This run records nothing.
- **Per-card sample.** A grid deals 162 cards a draft. In Evan's cube, those 162 come from the 347 cards Forge
  has, so each card is dealt in 47% of drafts, against 90% in a 180-card cube. That is about half the per-card
  games for each draft.
- **Estimate.** I scaled the shipped metas' per-card rates by that 0.52. The card at the bar's 19th percentile then
  reaches 80 games at about 3,500 drafts if Evan's cube is shaped like Modern-Era, 4,900 like Vintage, 10,000 like
  Synergy, and 15,000 like Pauper. The spread comes from the tail of cards Forge's drafter almost never plays.
- **Steps.** The job drafts up to 4,500 (about 1 h), builds the meta and checks the bar. It stops there if the bar
  is met, and otherwise continues to 6,000 and then 7,000 (about 1.5 h), checking again at each.
- **If the bar is missed at 7,000.** That is an honest outcome, not a failure. The meta is collected all the same,
  the rule says it does not ship, and a follow-up can top the same folder up: `run` resumes, and the seeds continue.
- **Median card.** At 6,000 drafts the median card should sit near 600-750 games. The shipped metas' median is
  1,266-1,703.

*The 13 cards Forge 2.0.14 lacks* (Reality Fracture, listed in the document's "Not in Forge 2.0.14").
- **How the lab handles them.** The lab's loader (`tools/cubelab/lab.ts`) looks every card up in Forge's
  database. It drafts without the cards it cannot find: `run.ts` warns "drafted without them" and lists them in
  `run.json`'s `missing`. So they never enter a grid, a pool, a deck or the engine, and no game can error on them.
- **ForgeCoach's side** (#106: `draft/deck.ts` `forForge`) keeps them out of anything a person hands the engine.
- **The pilot checks** that `cubelab.sh check`'s MISSING list, the document's list and the pilot run's `missing`
  are the same 13 names. It also checks that no draft line names one. The final checks repeat both on the real run.
- **In the meta.** These 13 keep their entries with zero counts and empty facts (colours, types), because `meta`
  lists every card of the cube document. The rule's bar leaves them out. ForgeCoach takes a card's facts from
  Scryfall first.

**Part 3: collected for the cloud.** The four metas go to `results/J110/`, named as ForgeCoach's
`public/cubes/` expects them, together with `coverage.json` (the rule's numbers) and `summary.md`. The cloud session
copies the metas that ship and flips `labData`.

**Never beside a queue night.** None is queued, and the nightly nights are paused (NOTES). The job aborts if a
`queue run` starts.

## Pilot
About 10 minutes. The cube-lab tests on this pin; the ForgeCoach copy has the parser and Evan's cube; the
helpers written; the three queue folders there, their first 300 lines through filter, `meta` and the
ForgeCoach check; Evan's cube against the engine (`check`) and a 30-draft run in its own folder (seeds 1,101,001+,
never reused), checked for the 13 missing cards and turned into a meta; the shipped metas' bar recomputed from
the ForgeCoach copy (it must reproduce 0.81).
```bash
node --test web/test/cubelab.test.ts
test -s {ForgeCoach}/src/cube/meta.ts
grep -q "id: 'evybaby'" {ForgeCoach}/src/cube/cubes.ts
mkdir -p var/cubelab/j110-tools var/cubelab/j110/pilot/out
cat > var/cubelab/j110-tools/filter.mjs <<'J110EOF'
// J110: a queue key folder's plain Default-vs-Default drafts (complete lines only) into a staging folder.
// usage: node filter.mjs <out.json> <src> <dst> [<src> <dst>]...
import fs from 'node:fs';
import path from 'node:path';
const [outFile, ...pairs] = process.argv.slice(2);
const cubes = {};
for (let i = 0; i + 1 < pairs.length; i += 2) {
  const src = pairs[i], dst = pairs[i + 1];
  fs.mkdirSync(dst, { recursive: true });
  for (const f of ['run.json', 'cards.json']) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  const run = JSON.parse(fs.readFileSync(path.join(src, 'run.json'), 'utf8'));
  const runDD = Array.isArray(run.profiles) && run.profiles.length === 2 && run.profiles.every((p) => p === 'Default');
  const buf = fs.readFileSync(path.join(src, 'drafts.jsonl'));
  const end = buf.lastIndexOf(10) + 1; // a line still being written is left out
  const fd = fs.openSync(path.join(dst, 'drafts.jsonl'), 'w');
  const c = { lines: 0, explore: 0, mixed: 0, bad: 0, kept: 0, kept_mb: 0, run_profiles_dd: runDD ? 1 : 0, missing: (run.missing ?? []).length, ratings: run.ratingsFile ?? null };
  let bytes = 0;
  for (let at = 0; at < end;) {
    const nl = buf.indexOf(10, at);
    const s = buf.subarray(at, nl + 1);
    at = nl + 1;
    if (s.length <= 1) continue;
    c.lines++;
    let r;
    try { r = JSON.parse(s.toString('utf8')); } catch { c.bad++; continue; }
    if (r.playExplore) { c.explore++; continue; }
    const p = r.profiles ?? (runDD ? ['Default', 'Default'] : null);
    if (!Array.isArray(p) || p.length !== 2 || p[0] !== 'Default' || p[1] !== 'Default') { c.mixed++; continue; }
    fs.writeSync(fd, s);
    c.kept++;
    bytes += s.length;
  }
  fs.closeSync(fd);
  c.kept_mb = Math.round((bytes / 1048576) * 10) / 10;
  cubes[path.basename(src).replace(/-/g, '_')] = c;
}
const vals = Object.values(cubes);
const out = { cubes, min_kept: Math.min(...vals.map((c) => c.kept)), max_kept_mb: Math.max(...vals.map((c) => c.kept_mb)), bad: vals.reduce((s, c) => s + c.bad, 0), not_dd_runs: vals.filter((c) => !c.run_profiles_dd).length };
fs.writeFileSync(outFile, `${JSON.stringify(out)}\n`);
console.log(JSON.stringify(out));
J110EOF
cat > var/cubelab/j110-tools/metacheck.mjs <<'J110EOF'
// J110: each <cube>.meta.json in a folder, read by ForgeCoach's own parser (src/cube/meta.ts, schema 1) and
// matched to its cube by ForgeCoach's cubeForMeta; structure as tools/cubelab/meta-regen-summary.mjs; and the
// per-card sample the pre-registered rule reads.  <stem>.run.json beside a meta names the cards Forge lacks.
// usage: node metacheck.mjs <ForgeCoach checkout> <dir> [--md]
import fs from 'node:fs';
import path from 'node:path';
const [fc, dir] = process.argv.slice(2);
const md = process.argv.includes('--md');
const { parseMeta } = await import(path.resolve(fc, 'src/cube/meta.ts'));
const { cubeForMeta } = await import(path.resolve(fc, 'src/cube/cubes.ts'));
const GAMES = 80;      // ForgeCoach score.ts META_STRENGTH: the games at which a card's lab number carries half its weight
const SHARE = 0.81;    // the lowest share of the shipped metas (pauper 0.819), to two places, rounded down
const MIN_DRAFTS = 100; // J075's bar
const r3 = (x) => Math.round(x * 1000) / 1000;
const typesOf = (c) => (Array.isArray(c.types) ? c.types : String(c.types ?? '').split(/\s+/));
function cover(m, missing) {
  const land = new Set(m.cube.cards.filter((c) => typesOf(c).includes('Land')).map((c) => c.name));
  const nl = m.cube.cards.map((c) => c.name).filter((n) => !land.has(n) && !missing.has(n));
  const g = nl.map((n) => m.cards[n]?.games ?? 0).sort((a, b) => a - b);
  return {
    playable_nonland: nl.length,
    share_ge80: g.length ? r3(g.filter((x) => x >= GAMES).length / g.length) : 0,
    median_games: g.length ? g[Math.floor(g.length / 2)] : 0,
    p10_games: g.length ? g[Math.floor(0.1 * (g.length - 1))] : 0,
    lands_played: [...land].filter((n) => (m.cards[n]?.inDecks ?? 0) > 0).length,
    lands: land.size,
  };
}
const out = { written: 0, ship_count: 0, bad_schema: 0, id_mismatch: 0, orphans: 0, lands_counted: 0, threshold: { games: GAMES, share: SHARE, drafts: MIN_DRAFTS } };
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.meta.json')).sort()) {
  const stem = f.slice(0, -'.meta.json'.length);
  const id = stem.replace(/-cube-\d+$/, '');
  const key = id.replace(/-/g, '_');
  let raw, m;
  try { raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); m = parseMeta(raw); } catch (e) { out.bad_schema++; out[key] = { schema_ok: 0, error: String(e.message ?? e) }; continue; }
  const schemaOk = raw.schema === 1 && Array.isArray(raw.cube?.cards) && raw.cube.cards.length > 0 && raw.cards && typeof raw.cards === 'object'
    && Array.isArray(raw.archetypes) && Array.isArray(raw.pairs) && (raw.sample?.drafts ?? 0) > 0 ? 1 : 0;
  if (!schemaOk) out.bad_schema++;
  const runFile = path.join(dir, `${stem}.run.json`);
  const missing = new Set(fs.existsSync(runFile) ? JSON.parse(fs.readFileSync(runFile, 'utf8')).missing ?? [] : []);
  const names = new Set(m.cube.cards.map((c) => c.name));
  const orphans = Object.keys(m.cards).filter((n) => !names.has(n)).length;
  const idOk = cubeForMeta(m)?.id === id ? 1 : 0;
  const cv = cover(m, missing);
  const drafts = m.sample?.drafts ?? 0;
  const ship = schemaOk && idOk && orphans === 0 && drafts >= MIN_DRAFTS && cv.share_ge80 >= SHARE ? 1 : 0;
  out.written++;
  out.ship_count += ship;
  out.id_mismatch += 1 - idOk;
  out.orphans += orphans;
  if (cv.lands_played > 0) out.lands_counted++;
  out[key] = { schema_ok: schemaOk, id_ok: idOk, drafts, games: m.sample?.games ?? 0, cube_cards: names.size, missing: missing.size, orphans, ...cv, kb: Math.round(fs.statSync(path.join(dir, f)).size / 1024), ship };
  rows.push([f, out[key]]);
}
// the shipped metas this checkout carries: where the threshold comes from
const shipped = fs.readdirSync(path.join(fc, 'public/cubes')).filter((x) => x.endsWith('.meta.json')).sort();
const base = shipped.map((f) => ({ f, ...cover(parseMeta(JSON.parse(fs.readFileSync(path.join(fc, 'public/cubes', f), 'utf8'))), new Set()), drafts: JSON.parse(fs.readFileSync(path.join(fc, 'public/cubes', f), 'utf8')).sample?.drafts ?? 0 }));
out.baseline = { files: base.length, min_share_ge80: Math.min(...base.map((b) => b.share_ge80)), min_median_games: Math.min(...base.map((b) => b.median_games)), min_drafts: Math.min(...base.map((b) => b.drafts)) };
if (md) {
  console.log('| file | ships | drafts | decisive games | playable nonland | share with 80+ games | median games | p10 games | lands played | orphans | ForgeCoach id | KB |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [f, r] of rows) console.log(`| ${f} | ${r.ship ? 'yes' : 'no'} | ${r.drafts} | ${r.games} | ${r.playable_nonland}${r.missing ? ` (${r.missing} not in Forge)` : ''} | ${r.share_ge80} | ${r.median_games} | ${r.p10_games} | ${r.lands_played} / ${r.lands} | ${r.orphans} | ${r.id_ok ? 'ok' : 'MISMATCH'} | ${r.kb} |`);
  console.log('');
  console.log(`Shipped metas (${fc}/public/cubes): ${base.map((b) => `${b.f} ${b.share_ge80} / median ${b.median_games} / ${b.drafts} drafts`).join('; ')}.`);
  console.log(`Rule: ship when schema_ok, id_ok, no orphans, drafts >= ${MIN_DRAFTS} and share >= ${SHARE} of playable nonland cards with ${GAMES}+ decisive games.`);
} else console.log(JSON.stringify(out));
J110EOF
cat > var/cubelab/j110-tools/evycheck.mjs <<'J110EOF'
// J110: Evan's cube against Forge 2.0.14: `cubelab.sh check`'s output and the document's "Not in Forge" list
// agree, and no card Forge lacks reaches a draft line (the lab drafts without them: run.ts, lab.ts).
// usage: node evycheck.mjs <check.txt> <cube.md> [<run dir>]
import fs from 'node:fs';
import path from 'node:path';
const [checkTxt, cubeMd, runDir] = process.argv.slice(2);
const t = fs.readFileSync(checkTxt, 'utf8');
const doc = fs.readFileSync(cubeMd, 'utf8');
const listed = Number((/^cards listed\s+(\d+)/m.exec(t) ?? [])[1] ?? -1);
const inDb = Number((/^in Forge's DB\s+(\d+)/m.exec(t) ?? [])[1] ?? -1);
const fromCheck = [...t.matchAll(/^ {2}MISSING\s+(.+?)\s{3}did you mean:/gm)].map((x) => x[1].trim());
const sec = (doc.split(/^## Not in Forge[^\n]*\n/m)[1] ?? '').split(/^## /m)[0];
const fromDoc = [...sec.matchAll(/^- (.+)$/gm)].map((x) => x[1].trim());
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const out = { listed, in_db: inDb, missing: fromCheck.length, doc_missing: fromDoc.length, missing_match: same(fromCheck, fromDoc) ? 1 : 0, names: fromCheck };
if (runDir) {
  const run = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  out.run_missing = (run.missing ?? []).length;
  out.run_missing_match = same(run.missing ?? [], fromDoc) ? 1 : 0;
  const needles = fromDoc.map((n) => JSON.stringify(n));
  let lines = 0, hit = 0;
  const f = path.join(runDir, 'drafts.jsonl');
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; lines++; if (needles.some((n) => l.includes(n))) hit++; }
  out.lines = lines;
  out.missing_in_lines = hit;
}
console.log(JSON.stringify(out));
J110EOF
for c in omega fair-fight peasant; do
  d=var/cubelab/queue/normal/$c
  test -s "$d/run.json" && test -s "$d/cards.json" && test -s "$d/drafts.jsonl"
  echo "$c: $(wc -l < "$d/drafts.jsonl") lines, $(du -h "$d/drafts.jsonl" | cut -f1)"
  s=var/cubelab/j110/pilot/src/$c
  mkdir -p "$s"
  cp "$d/run.json" "$d/cards.json" "$s/"
  head -n 300 "$d/drafts.jsonl" > "$s/drafts.jsonl"
done
P=var/cubelab/j110/pilot
node var/cubelab/j110-tools/filter.mjs $P/filter.json \
  $P/src/omega $P/stage/omega $P/src/fair-fight $P/stage/fair-fight $P/src/peasant $P/stage/peasant
for c in omega fair-fight peasant; do
  tools/cubelab.sh meta "$P/stage/$c" --cube "cubes/$c-cube-180.md"
  cp "$P/stage/$c/meta.json" "$P/out/$c-cube-180.meta.json"
  cp "$P/stage/$c/run.json" "$P/out/$c-cube-180.run.json"
done
export CUBELAB_HOME_ROOT=var/cubelab/homes-J110
# exits 1 when cards are missing (13 expected): the checks below read its output
tools/cubelab.sh check cubes/evybaby-cube-360.md > var/cubelab/j110/evy-check.txt || true
cat var/cubelab/j110/evy-check.txt
tools/cubelab.sh run cubes/evybaby-cube-360.md --format grid --games 1 --drafts 30 --jobs {workers} --seed 1101001 --out $P/evy
node var/cubelab/j110-tools/evycheck.mjs var/cubelab/j110/evy-check.txt cubes/evybaby-cube-360.md $P/evy > $P/evy-lines.json
tools/cubelab.sh meta $P/evy --cube cubes/evybaby-cube-360.md
cp $P/evy/meta.json $P/out/evybaby-cube-360.meta.json
cp $P/evy/run.json $P/out/evybaby-cube-360.run.json
node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} $P/out > $P/coverage.json
node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} $P/out --md
cat $P/filter.json $P/evy-lines.json
```
metrics: pf = sh: cat var/cubelab/j110/pilot/filter.json 2>/dev/null || echo '{"min_kept":0}'
metrics: pq = sh: cat var/cubelab/j110/pilot/coverage.json 2>/dev/null || echo '{"written":0}'
metrics: pl = sh: cat var/cubelab/j110/pilot/evy-lines.json 2>/dev/null || echo '{"lines":0}'
metrics: pe = cubelab var/cubelab/j110/pilot/evy
metrics: big = sh: m=0; for c in omega fair-fight peasant; do s=$(stat -c %s var/cubelab/queue/normal/$c/drafts.jsonl 2>/dev/null || echo 0); [ "$s" -gt "$m" ] && m=$s; done; echo $((m / 1048576))
check: qwriters == 0
check: big < 3000
check: pf.min_kept >= 1
check: pf.bad == 0
check: pf.not_dd_runs == 0
check: pq.written == 4
check: pq.bad_schema == 0
check: pq.id_mismatch == 0
check: pq.orphans == 0
check: pq.baseline.files == 4
check: pq.baseline.min_share_ge80 >= 0.81
check: pl.listed == 360
check: pl.in_db == 347
check: pl.missing == 13
check: pl.missing_match == 1
check: pl.run_missing_match == 1
check: pl.lines == 30
check: pl.missing_in_lines == 0
check: pe.drafts == 30
check: pe.engine_errors == 0
check: pe.timeouts <= 1
check: pe.median_game_s between 1 and 30

`big` is the largest of the three source files in MB. `filter.mjs` reads a file as one Buffer, which is
fine to 3 GB. The meta tool reads its staged copy as one string, which caps it near 512 MB, so the commands
stop on a staged copy of 450 MB or more (J075's limit). The pilot's own runs stay in `var/cubelab/j110/pilot/`
and never touch the real folder `var/cubelab/runs/evybaby-J110`. Record the pilot's seconds per draft from its
`matches:` line.

## Commands
cores: 1
mem_gb: 10
```bash
# 1. Omega, Fair Fight, Peasant: the queue's plain Default-vs-Default drafts, staged, then meta (read-only on the queue)
export NODE_OPTIONS=--max-old-space-size=8192
O=var/cubelab/j110/out
S=var/cubelab/j110/stage
mkdir -p "$O" "$S"
node var/cubelab/j110-tools/filter.mjs var/cubelab/j110/filter.json \
  var/cubelab/queue/normal/omega "$S/omega" var/cubelab/queue/normal/fair-fight "$S/fair-fight" \
  var/cubelab/queue/normal/peasant "$S/peasant"
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if (j.max_kept_mb >= 450) { console.error("a staged drafts.jsonl is " + j.max_kept_mb + " MB: over the meta tool string limit"); process.exit(1); }' var/cubelab/j110/filter.json
for c in omega fair-fight peasant; do
  tools/cubelab.sh meta "$S/$c" --cube "cubes/$c-cube-180.md"
  cp "$S/$c/meta.json" "$O/$c-cube-180.meta.json"
  cp "$S/$c/run.json" "$O/$c-cube-180.run.json"
done
node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} "$O" --md
```
```bash
# 2. Evan's cube: up to 4,500, 6,000, 7,000 drafts; stop at the first step whose meta meets the bar (card counts only)
export CUBELAB_HOME_ROOT=var/cubelab/homes-J110
E=var/cubelab/runs/evybaby-J110
O=var/cubelab/j110/out
mkdir -p "$O" var/cubelab/j110/steps
# a resumed run parses every line it finds: drop a line a stopped run left half-written
if [ -s "$E/drafts.jsonl" ]; then
  node -e 'const fs=require("fs");const f=process.argv[1];const b=fs.readFileSync(f);const k=b.lastIndexOf(10);if(k+1<b.length){fs.truncateSync(f,k+1);console.log("dropped a half-written last line");}' "$E/drafts.jsonl"
fi
for n in 4500 6000 7000; do
  echo "== evybaby: up to $n drafts, $(date -Is)"
  tools/cubelab.sh run cubes/evybaby-cube-360.md --format grid --games 1 --drafts "$n" --jobs {workers} --seed 1 --out "$E"
  tools/cubelab.sh meta "$E" --cube cubes/evybaby-cube-360.md
  cp "$E/meta.json" "$O/evybaby-cube-360.meta.json"
  cp "$E/run.json" "$O/evybaby-cube-360.run.json"
  node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} "$O" > "var/cubelab/j110/steps/evy-$n.json"
  cat "var/cubelab/j110/steps/evy-$n.json"
  if node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(r.evybaby && r.evybaby.share_ge80 >= r.threshold.share ? 0 : 1)' "var/cubelab/j110/steps/evy-$n.json"; then
    echo "== evybaby: the bar is met at $n drafts"
    break
  fi
done
```
cores: 1
```bash
# 3. the checks' numbers and summary.md
O=var/cubelab/j110/out
node var/cubelab/j110-tools/evycheck.mjs var/cubelab/j110/evy-check.txt cubes/evybaby-cube-360.md var/cubelab/runs/evybaby-J110 > var/cubelab/j110/evy-lines.json
node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} "$O" > "$O/coverage.json"
{
  echo "# J110: lab metas for Omega, Fair Fight, Peasant and Evan's cube"
  echo
  node var/cubelab/j110-tools/metacheck.mjs {ForgeCoach} "$O" --md
  echo
  echo "## The queue folders, filtered to plain Default-vs-Default drafts"
  echo
  echo '```'
  cat var/cubelab/j110/filter.json
  echo '```'
  echo
  echo "## Evan's cube, step by step (drafts, share of playable nonland cards with 80+ games, median games)"
  echo
  for f in var/cubelab/j110/steps/evy-*.json; do
    node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).evybaby||{}; console.log("- " + process.argv[2] + ": " + r.drafts + " drafts, share " + r.share_ge80 + ", median " + r.median_games + ", p10 " + r.p10_games)' "$f" "$(basename "$f" .json)"
  done
  echo
  echo "## Evan's cube against Forge 2.0.14"
  echo
  echo '```'
  cat var/cubelab/j110/evy-lines.json
  grep -E "^(cards listed|in Forge|draft ranks|unranked|AI:RemAIDeck|unsupported)" var/cubelab/j110/evy-check.txt || true
  echo '```'
} > "$O/summary.md"
cat "$O/summary.md"
```
check: fl.min_kept >= 100
check: fl.bad == 0
check: fl.not_dd_runs == 0
check: fl.max_kept_mb < 450
check: mc.written == 4
check: mc.bad_schema == 0
check: mc.id_mismatch == 0
check: mc.orphans == 0
check: mc.lands_counted == 4
check: mc.baseline.min_share_ge80 >= 0.81
check: ev.drafts >= 4500
check: ev.engine_error_rate <= 2%
check: evl.lines >= 4500
check: evl.run_missing_match == 1
check: evl.missing_in_lines == 0

The checks are the job's health, not the decision. Whether each meta ships is the `rule:`, read from
`coverage.json` (`ship`, `share_ge80` and the rest per cube; `ship_count` overall). A missed bar is a finding,
not a failed job. Block 2's width is 7 and the others' is 1. A retry after a stop resumes Evan's folder (`run`
skips seeds it has, and nothing is moved aside: `resumable: yes`), and rewrites the staging and output files.

## Abort if
abort: qwriters > 0
abort: ev.drafts >= 500 and ev.engine_errors > 0.02 * ev.drafts
abort: ev.games >= 500 and ev.timeouts > 0.05 * ev.games
- A "queue run" process on the machine (a queue night started beside this job): TERM; it resumes later.
- More than 2% engine errors or 5% timeouts in Evan's games: something in the cube is wrong for the engine.

## Report
collect: var/cubelab/j110/out/omega-cube-180.meta.json
collect: var/cubelab/j110/out/fair-fight-cube-180.meta.json
collect: var/cubelab/j110/out/peasant-cube-180.meta.json
collect: var/cubelab/j110/out/evybaby-cube-360.meta.json
collect: var/cubelab/j110/out/coverage.json
collect: var/cubelab/j110/out/summary.md
collect: var/cubelab/j110/filter.json
collect: var/cubelab/j110/evy-check.txt
collect: var/cubelab/j110/evy-lines.json
collect: var/cubelab/j110/steps/*.json

`summary.md` is written by the job. The PC session adds its reading below it, plainly:
- **The rule, per cube** (from `coverage.json`): ships or not, with each number beside its bar: schema,
  ForgeCoach id, orphans, drafts against 100, and the share of playable nonland cards with 80+ games against 0.81.
  Give the median and the 10th-percentile card's games next to the shipped metas' (in the table's footer).
- **The filter** (`filter.json`): per folder, lines, exploring, mixed-profile and kept, and each folder's
  `ratingsFile`.
- **Evan's cube.** The step it stopped at, the drafts per hour (from run2's `matches:` lines and the step times),
  engine errors and timeouts, and the `check` lines on draft ranks and unranked cards. Say whether the 13
  missing cards matched and never appeared.
- **If Evan's meta missed the bar,** extrapolate the drafts needed from the steps' shares, and how long that
  would take at the measured rate.
- **Leave the files where they are.** Do not copy them into ForgeCoach: the cloud session moves the metas that
  ship and drops their `labData: false`.

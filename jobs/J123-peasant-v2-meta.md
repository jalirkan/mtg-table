id: J123
title: Peasant Cube v2 lab meta: MatEffect's 11 rare lands back in the list (ForgeCoach #131), drafted afresh, 6,000-12,000 grid drafts, best of one, Default vs Default, unrecorded
public_title: Peasant Cube meta after the rare-lands change
public_est: ~1-3 h
public_decides: Ship a new Peasant lab meta for the list with its 11 rare lands back
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@4b424a2 (main, PR #134 merged: Peasant v2's cubes/peasant-cube-180.md, its ratings rows and the eval golden's peasant names, plus the streaming resume #133 and M64-M66 #131), ForgeCoach@c93d90e (current main, #131: public/cubes/peasant-cube-180.md v2, src/cube/meta.ts parseMeta, cubes.ts cubeForMeta, parseCube.ts)
est: 6,000 drafts ~0.5-1.3 h, at most 12,000 ~1-2.7 h on 7 workers (J110 drafted Evan's cube unrecorded at 0.30 s a draft, ~11,900 an hour; the queue nights ran 4,490-4,730 an hour recording every game); pilot ~10 min
resumable: yes
timeout: 8h
progress: cubelab var/cubelab/runs/peasant-v2-J123 of 12000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: ev = cubelab var/cubelab/runs/peasant-v2-J123
metrics: dc = sh: cat var/cubelab/j123/doc.json 2>/dev/null || echo '{"listed":0}'
metrics: mc = sh: cat var/cubelab/j123/out/coverage.json 2>/dev/null || echo '{"written":0}'
headline: mc.ship, mc.share_ge80, mc.drafts, mc.median_games, mc.p10_games, mc.new_lands_played
decides: whether ForgeCoach replaces public/cubes/peasant-cube-180.meta.json, which still describes v1 (the ten Duskmourn duals and Ash Barrens; J110, 10,956 queue drafts), with this run's v2 meta (the cloud session copies it from results/J123/)
hypothesis: none to confirm: a rebuild. v1's per-card counts, scaled to 6,000 drafts, give 0.873 of playable nonland cards 80+ games (0.81 is the bar), so the first step should meet it; the 11 rare lands (Forge ranks 50-99, against 11-54 for what they replaced) are drafted earlier and played in more decks, which shifts the nonland picks a little
rule: written 2026-10-10 before the run. The meta ships when ForgeCoach@c93d90e's parseMeta reads it (schema 1) and its cubeForMeta names peasant, its card list is ForgeCoach's v2 document's exactly (the 11 rare lands in, the 11 cards they replaced out), no card key falls outside the cube, it rests on 100+ drafts (J075), and at least 81% of its playable nonland cards have 80+ decisive games (J110's bar: 80 is ForgeCoach's META_STRENGTH, 0.81 the lowest share among the four metas shipped before J110, rounded down). Drafting stops at the first of 6,000, 9,000 or 12,000 drafts whose meta meets the bar: a stop on card counts, never on win rates. A meta under the bar at 12,000 is not shipped (ForgeCoach then decides between v1's meta and labData: false), and the summary says how many more drafts it would need; a follow-up tops the same folder up
followup: forgecoach-metas

**Why.** ForgeCoach #131 (merged 2026-10-10, c93d90e) put MatEffect's 11 rare lands back into the Peasant Cube:
Meticulous Archive, Undercity Sewers, Blood Crypt, Stomping Ground, Horizon Canopy, Godless Shrine, Steam Vents,
Underground Mortuary, Sacred Foundry, Breeding Pool and Prismatic Vista, in place of the ten Duskmourn common duals
and Ash Barrens. ForgeCoach's `peasant-cube-180.meta.json` (J110, from the queue's plain Default-vs-Default drafts)
still describes the old list: the 11 new lands have no numbers, and every nonland card's numbers came from drafts
with the old mana. Justin drafts this cube. mtg-table's copy of the document got the same change (branch
`claude/peasant-rare-lands`, byte for byte ForgeCoach's; the pilot checks with `cmp`), with the ratings file's 11
land rows re-seeded from Forge's ranks by `cubelab.sh ratings init` (every other row unchanged).

**What runs.** J110's Part 2, on Peasant: the cube lab's normal `run`, not a queue night. Grid, best of one (as every
shipped meta), Default against Default, the lab builder, the cube's ratings file, no exploration, no profile mix, no
recording. Folder `var/cubelab/runs/peasant-v2-J123`, its own Forge homes (`CUBELAB_HOME_ROOT=var/cubelab/homes-J123`).
Then `cubelab.sh meta` and the check below, at 6,000, 9,000 and 12,000 drafts, stopping at the first that meets the bar.

*Sizing.*
- **Speed.** J110 drafted Evan's cube unrecorded at 0.30 s a draft wall-clock on 7 workers (~11,900 drafts an hour,
  1.8 s a game); the queue nights, recording every game, ran 4,490-4,730 an hour. So 6,000 drafts take 0.5-1.3 h and
  12,000 at most 1-2.7 h. The 8 h timeout is three times the slow end.
- **Per-card sample.** v1's meta rested on 10,956 drafts: share 0.899, median 2,772 games, p10 74. Scaling its per-card
  games to N drafts gives a share of 0.829 at 3,000, 0.873 at 6,000, 0.899 at 9,000 and 0.905 at 12,000. The steps leave
  room for a v2 shape with a longer tail.
- **Bytes.** The local dry run wrote 16.3 KB of `drafts.jsonl` a draft (325,484 bytes for 20 drafts); J110's Peasant
  queue lines were 15.9 KB (170.4 MB for 10,956). So 12,000 drafts are about 195 MB, plus ~16 KB a draft of `.dck` files
  (4 per draft) on disk: under 0.5 GB in all.
- **A known lab bug, kept clear of.** `cubelab run`'s resume reads the whole `drafts.jsonl` into one string, which fails
  above ~512 MB (a fix is in progress on `claude/cubelab-stream-resume`). This folder stays near 195 MB at its largest
  step. The pilot checks its bytes a draft (under 30 KB, which keeps 12,000 drafts under 360 MB); the commands refuse to
  start a step on a file of 450 MB or more, and the job aborts there.

*Seeds.* 150,000,001+ for the run (at most 12,000), 151,000,001-151,000,030 for the pilot. In the D340 lab range,
clear of every seed in `jobs/` (J120 140,000,001-143,000,030; J122 160,000,001+ and 161,000,001+; J121 812,000,001+)
and of the nightly queue, which counts each cube's seeds from 1 (Peasant reached ~21,000).

**Collected for the cloud.** The meta goes to `results/J123/peasant-cube-180.meta.json`, as ForgeCoach's
`public/cubes/` names it, with `coverage.json` (the rule's numbers and the 11 lands' own) and `summary.md`. The cloud
session copies it if it ships.

**Never beside a queue night.** None is queued; the job aborts if a `queue run` starts.

## Pilot
About 10 minutes. The cube-lab tests on this pin; mtg-table's document is ForgeCoach's; the document against Forge
2.0.14 (all 180 in its DB, none unsupported) and against its ratings file; a 30-draft run in its own folder (seeds
151,000,001+, never reused) turned into a meta and read by the ForgeCoach check; the other shipped metas' bar
recomputed from the ForgeCoach copy (it must still be at least 0.81).
```bash
node --test web/test/cubelab.test.ts
cmp cubes/peasant-cube-180.md {ForgeCoach}/public/cubes/peasant-cube-180.md
grep -q "id: 'peasant'" {ForgeCoach}/src/cube/cubes.ts
mkdir -p var/cubelab/j123-tools var/cubelab/j123/pilot/out
cat > var/cubelab/j123-tools/doccheck.mjs <<'J123EOF'
// J123: mtg-table's Peasant document against Forge 2.0.14 (`cubelab.sh check`'s output) and its ratings file
// against the document (ForgeCoach's parseCube): every card listed, in Forge's DB and rated once, no other row.
// usage: node doccheck.mjs <ForgeCoach checkout> <check.txt> <cube.md> <ratings.tsv>
import fs from 'node:fs';
import path from 'node:path';
const [fc, checkTxt, cubeMd, tsv] = process.argv.slice(2);
const { parseCube } = await import(path.resolve(fc, 'src/cube/parseCube.ts'));
const t = fs.readFileSync(checkTxt, 'utf8');
const num = (re) => Number((re.exec(t) ?? [])[1] ?? -1);
const doc = parseCube(fs.readFileSync(cubeMd, 'utf8'));
const names = new Set(doc.cards.map((c) => c.name));
const rows = fs.readFileSync(tsv, 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]);
const rated = new Set(rows);
const NEW = ['Meticulous Archive', 'Undercity Sewers', 'Blood Crypt', 'Stomping Ground', 'Horizon Canopy', 'Godless Shrine',
  'Steam Vents', 'Underground Mortuary', 'Sacred Foundry', 'Breeding Pool', 'Prismatic Vista'];
console.log(JSON.stringify({
  listed: num(/^cards listed\s+(\d+)/m),
  in_db: num(/^in Forge's DB\s+(\d+)/m),
  unsupported: num(/^unsupported\s+(\d+)/m),
  missing: [...t.matchAll(/^ {2}MISSING\s/gm)].length,
  doc_cards: names.size,
  doc_warnings: doc.warnings.length,
  new_lands_in_doc: NEW.filter((n) => names.has(n)).length,
  ratings_rows: rows.length,
  ratings_match: rows.length === rated.size && rated.size === names.size && [...names].every((n) => rated.has(n)) ? 1 : 0,
}));
J123EOF
cat > var/cubelab/j123-tools/metacheck.mjs <<'J123EOF'
// J123: the rebuilt Peasant meta, read by ForgeCoach's own parser (src/cube/meta.ts, schema 1) and matched by
// its cubeForMeta; its card list against ForgeCoach's v2 document (src/cube/parseCube.ts on
// public/cubes/peasant-cube-180.md); the 11 rare lands in, the 11 cards they replaced out; and the per-card
// sample the pre-registered rule reads (J110's bar).  <dir>/peasant-cube-180.run.json names the cards Forge lacks.
// usage: node metacheck.mjs <ForgeCoach checkout> <dir> [--md]
import fs from 'node:fs';
import path from 'node:path';
const [fc, dir] = process.argv.slice(2);
const md = process.argv.includes('--md');
const { parseMeta } = await import(path.resolve(fc, 'src/cube/meta.ts'));
const { cubeForMeta } = await import(path.resolve(fc, 'src/cube/cubes.ts'));
const { parseCube } = await import(path.resolve(fc, 'src/cube/parseCube.ts'));
const GAMES = 80;       // ForgeCoach score.ts META_STRENGTH
const SHARE = 0.81;     // J110's bar: the lowest share of the four metas shipped before it (pauper 0.819), rounded down
const MIN_DRAFTS = 100; // J075's bar
const NEW = ['Meticulous Archive', 'Undercity Sewers', 'Blood Crypt', 'Stomping Ground', 'Horizon Canopy', 'Godless Shrine',
  'Steam Vents', 'Underground Mortuary', 'Sacred Foundry', 'Breeding Pool', 'Prismatic Vista'];
const OLD = ['Abandoned Campground', 'Murky Sewer', 'Razortrap Gorge', 'Bleeding Woods', 'Etched Cornfield', 'Neglected Manor',
  'Peculiar Lighthouse', 'Strangled Cemetery', 'Raucous Carnival', 'Lakeside Shack', 'Ash Barrens'];
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
const file = path.join(dir, 'peasant-cube-180.meta.json');
const out = { written: 0, ship: 0, threshold: { games: GAMES, share: SHARE, drafts: MIN_DRAFTS } };
if (fs.existsSync(file)) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  let m = null;
  try { m = parseMeta(raw); } catch (e) { out.error = String(e.message ?? e); }
  out.written = 1;
  out.schema_ok = m && raw.schema === 1 && Array.isArray(raw.cube?.cards) && raw.cube.cards.length > 0 && raw.cards && typeof raw.cards === 'object'
    && Array.isArray(raw.archetypes) && Array.isArray(raw.pairs) && (raw.sample?.drafts ?? 0) > 0 ? 1 : 0;
  if (m) {
    const runFile = path.join(dir, 'peasant-cube-180.run.json');
    const run = fs.existsSync(runFile) ? JSON.parse(fs.readFileSync(runFile, 'utf8')) : {};
    const missing = new Set(run.missing ?? []);
    const names = new Set(m.cube.cards.map((c) => c.name));
    const doc = parseCube(fs.readFileSync(path.join(fc, 'public/cubes/peasant-cube-180.md'), 'utf8'));
    const docNames = new Set(doc.cards.map((c) => c.name));
    out.id_ok = cubeForMeta(m)?.id === 'peasant' ? 1 : 0;
    out.cube_cards = names.size;
    out.doc_cards = docNames.size;
    out.not_in_doc = [...names].filter((n) => !docNames.has(n)).length;
    out.not_in_meta = [...docNames].filter((n) => !names.has(n)).length;
    out.new_lands_in = NEW.filter((n) => names.has(n)).length;
    out.old_cards_in = OLD.filter((n) => names.has(n) || n in m.cards).length;
    out.orphans = Object.keys(m.cards).filter((n) => !names.has(n)).length;
    out.missing = missing.size;
    out.drafts = m.sample?.drafts ?? 0;
    out.games = m.sample?.games ?? 0;
    out.ai_default = m.sample?.aiProfile === 'Default' ? 1 : 0;
    out.ratings = run.ratingsFile ?? null;
    Object.assign(out, cover(m, missing));
    out.new_lands = Object.fromEntries(NEW.map((n) => {
      const c = m.cards[n] ?? {};
      return [n, { picked: c.picked ?? 0, avgPickIndex: c.avgPickIndex ?? null, inDecks: c.inDecks ?? 0, games: c.games ?? 0, winRate: c.winRate ?? null }];
    }));
    out.new_lands_played = NEW.filter((n) => (m.cards[n]?.inDecks ?? 0) > 0).length;
    out.ship = out.schema_ok && out.id_ok && out.not_in_doc === 0 && out.not_in_meta === 0 && out.orphans === 0
      && out.drafts >= MIN_DRAFTS && out.share_ge80 >= SHARE ? 1 : 0;
  }
}
// the metas ForgeCoach ships at this pin, less Peasant's own (it describes v1): where the bar comes from
const shipped = fs.readdirSync(path.join(fc, 'public/cubes')).filter((x) => x.endsWith('.meta.json') && !x.startsWith('peasant-')).sort();
const base = shipped.map((f) => {
  const raw = JSON.parse(fs.readFileSync(path.join(fc, 'public/cubes', f), 'utf8'));
  return { f, ...cover(parseMeta(raw), new Set(raw.cube?.forgeMissing ?? [])), drafts: raw.sample?.drafts ?? 0 };
});
out.baseline = { files: base.length, min_share_ge80: Math.min(...base.map((b) => b.share_ge80)), min_drafts: Math.min(...base.map((b) => b.drafts)) };
if (md) {
  const r = out;
  console.log('| ships | drafts | decisive games | playable nonland | share with 80+ games | median games | p10 games | lands played | rare lands in / old cards in | orphans | ForgeCoach id |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  console.log(`| ${r.ship ? 'yes' : 'no'} | ${r.drafts} | ${r.games} | ${r.playable_nonland} | ${r.share_ge80} | ${r.median_games} | ${r.p10_games} | ${r.lands_played} / ${r.lands} | ${r.new_lands_in} / ${r.old_cards_in} | ${r.orphans} | ${r.id_ok ? 'ok' : 'MISMATCH'} |`);
  console.log('');
  console.log('| rare land | picked | avg pick | in decks | games | win rate |');
  console.log('|---|---|---|---|---|---|');
  for (const [n, c] of Object.entries(r.new_lands ?? {})) console.log(`| ${n} | ${c.picked} | ${c.avgPickIndex ?? '-'} | ${c.inDecks} | ${c.games} | ${c.winRate ?? '-'} |`);
  console.log('');
  console.log(`Other shipped metas (${fc}/public/cubes): ${base.map((b) => `${b.f} ${b.share_ge80} / median ${b.median_games} / ${b.drafts} drafts`).join('; ')}.`);
  console.log(`Rule: ship when schema_ok, id_ok, the card list is ForgeCoach's v2 document's, no orphans, drafts >= ${MIN_DRAFTS} and share >= ${SHARE} of playable nonland cards with ${GAMES}+ decisive games.`);
} else console.log(JSON.stringify(out));
J123EOF
export CUBELAB_HOME_ROOT=var/cubelab/homes-J123
P=var/cubelab/j123/pilot
tools/cubelab.sh check cubes/peasant-cube-180.md > var/cubelab/j123/check.txt
cat var/cubelab/j123/check.txt
node var/cubelab/j123-tools/doccheck.mjs {ForgeCoach} var/cubelab/j123/check.txt cubes/peasant-cube-180.md cubes/peasant-cube-180.ratings.tsv > var/cubelab/j123/doc.json
cat var/cubelab/j123/doc.json
tools/cubelab.sh run cubes/peasant-cube-180.md --format grid --games 1 --drafts 30 --jobs {workers} --seed 151000001 --out $P/run
tools/cubelab.sh meta $P/run --cube cubes/peasant-cube-180.md
cp $P/run/meta.json $P/out/peasant-cube-180.meta.json
cp $P/run/run.json $P/out/peasant-cube-180.run.json
node var/cubelab/j123-tools/metacheck.mjs {ForgeCoach} $P/out > $P/coverage.json
node var/cubelab/j123-tools/metacheck.mjs {ForgeCoach} $P/out --md
```
metrics: pq = sh: cat var/cubelab/j123/pilot/coverage.json 2>/dev/null || echo '{"written":0}'
metrics: pe = cubelab var/cubelab/j123/pilot/run
check: qwriters == 0
check: dc.listed == 180
check: dc.in_db == 180
check: dc.unsupported == 0
check: dc.missing == 0
check: dc.doc_cards == 180
check: dc.new_lands_in_doc == 11
check: dc.ratings_match == 1
check: pq.written == 1
check: pq.schema_ok == 1
check: pq.id_ok == 1
check: pq.not_in_doc == 0
check: pq.not_in_meta == 0
check: pq.new_lands_in == 11
check: pq.old_cards_in == 0
check: pq.orphans == 0
check: pq.missing == 0
check: pq.ai_default == 1
check: pq.baseline.files == 7
check: pq.baseline.min_share_ge80 >= 0.81
check: pq.new_lands_played >= 1
check: pe.drafts == 30
check: pe.engine_errors == 0
check: pe.timeouts <= 1
check: pe.recorded_games == 0
check: pe.median_game_s between 1 and 30
check: pe.output_bytes < 30000 * pe.drafts

The pilot's run stays in `var/cubelab/j123/pilot/` and never touches the real folder. `baseline` is the other seven
metas ForgeCoach ships at c93d90e (Peasant's own v1 meta left out). Record the pilot's seconds a draft from its
`matches:` line.

## Commands
```bash
# 1. Peasant v2: up to 6,000, 9,000, 12,000 drafts; stop at the first step whose meta meets the bar (card counts only)
export CUBELAB_HOME_ROOT=var/cubelab/homes-J123
R=var/cubelab/runs/peasant-v2-J123
O=var/cubelab/j123/out
mkdir -p "$O" var/cubelab/j123/steps
# a resumed run parses every line it finds: drop a line a stopped run left half-written
if [ -s "$R/drafts.jsonl" ]; then
  node -e 'const fs=require("fs");const f=process.argv[1];const b=fs.readFileSync(f);const k=b.lastIndexOf(10);if(k+1<b.length){fs.truncateSync(f,k+1);console.log("dropped a half-written last line");}' "$R/drafts.jsonl"
fi
for n in 6000 9000 12000; do
  # the lab's resume reads drafts.jsonl as one string (~512 MB limit): never start a step on 450 MB or more
  if [ -s "$R/drafts.jsonl" ] && [ "$(stat -c %s "$R/drafts.jsonl")" -ge 471859200 ]; then
    echo "drafts.jsonl is $(( $(stat -c %s "$R/drafts.jsonl") / 1048576 )) MB: at the 450 MB guard, not resuming" >&2
    exit 1
  fi
  echo "== peasant v2: up to $n drafts, $(date -Is)"
  tools/cubelab.sh run cubes/peasant-cube-180.md --format grid --games 1 --drafts "$n" --jobs {workers} --seed 150000001 --out "$R"
  tools/cubelab.sh meta "$R" --cube cubes/peasant-cube-180.md
  cp "$R/meta.json" "$O/peasant-cube-180.meta.json"
  cp "$R/run.json" "$O/peasant-cube-180.run.json"
  node var/cubelab/j123-tools/metacheck.mjs {ForgeCoach} "$O" > "var/cubelab/j123/steps/peasant-$n.json"
  cat "var/cubelab/j123/steps/peasant-$n.json"
  echo "== peasant v2: $(du -m "$R/drafts.jsonl" | cut -f1) MB of drafts.jsonl at $n drafts"
  if node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(r.share_ge80 >= r.threshold.share ? 0 : 1)' "var/cubelab/j123/steps/peasant-$n.json"; then
    echo "== peasant v2: the bar is met at $n drafts"
    break
  fi
done
```
cores: 1
```bash
# 2. the checks' numbers and summary.md
O=var/cubelab/j123/out
node var/cubelab/j123-tools/metacheck.mjs {ForgeCoach} "$O" > "$O/coverage.json"
{
  echo "# J123: the Peasant Cube's lab meta, v2 (the 11 rare lands back)"
  echo
  node var/cubelab/j123-tools/metacheck.mjs {ForgeCoach} "$O" --md
  echo
  echo "## Step by step (drafts, share of playable nonland cards with 80+ games, median, p10)"
  echo
  for f in var/cubelab/j123/steps/peasant-*.json; do
    node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("- " + process.argv[2] + ": " + r.drafts + " drafts, share " + r.share_ge80 + ", median " + r.median_games + ", p10 " + r.p10_games)' "$f" "$(basename "$f" .json)"
  done
  echo
  echo "## The document against Forge 2.0.14"
  echo
  echo '```'
  cat var/cubelab/j123/doc.json
  grep -E "^(cards listed|in Forge|unsupported|AI:RemAIDeck|draft ranks|unranked)" var/cubelab/j123/check.txt || true
  echo '```'
} > "$O/summary.md"
cat "$O/summary.md"
```
check: ev.drafts >= 6000
check: ev.engine_error_rate <= 2%
check: ev.recorded_games == 0
check: ev.output_bytes < 471859200
check: mc.written == 1
check: mc.schema_ok == 1
check: mc.id_ok == 1
check: mc.not_in_doc == 0
check: mc.not_in_meta == 0
check: mc.new_lands_in == 11
check: mc.old_cards_in == 0
check: mc.orphans == 0
check: mc.ai_default == 1
check: mc.missing == 0
check: mc.drafts == ev.drafts
check: mc.baseline.min_share_ge80 >= 0.81

The checks are the job's health, not the decision. Whether the meta ships is the `rule:`, read from `coverage.json`
(`ship`, `share_ge80` and the rest). A missed bar is a finding, not a failed job. Block 1's width is 7 and block 2's
is 1. A retry after a stop resumes the folder (`run` skips the seeds it has; nothing is moved aside: `resumable: yes`)
and rewrites the output files.

## Abort if
abort: qwriters > 0
abort: ev.drafts >= 500 and ev.engine_errors > 0.02 * ev.drafts
abort: ev.games >= 500 and ev.timeouts > 0.05 * ev.games
abort: ev.output_bytes >= 471859200
- A "queue run" process on the machine (a queue night started beside this job): TERM; it resumes later.
- More than 2% engine errors or 5% timeouts: something in the cube is wrong for the engine.
- `drafts.jsonl` at 450 MB: the lab's resume would fail near 512 MB (it should never get near: ~195 MB at 12,000).

## Report
collect: var/cubelab/j123/out/peasant-cube-180.meta.json
collect: var/cubelab/j123/out/coverage.json
collect: var/cubelab/j123/out/summary.md
collect: var/cubelab/j123/doc.json
collect: var/cubelab/j123/check.txt
collect: var/cubelab/j123/steps/*.json

`summary.md` is written by the job. The PC session adds its reading below it, plainly:
- **The rule** (from `coverage.json`): ships or not, with each number beside its bar: schema, ForgeCoach id, the card
  list against v2's document, orphans, drafts against 100, and the share of playable nonland cards with 80+ games
  against 0.81. Give the median and the 10th-percentile card's games next to v1's (J110: 0.899, median 2,772, p10 74,
  10,956 drafts) and the other shipped metas' (in the table's footer).
- **The 11 rare lands:** how often each was picked, its average pick and how many decks played it (the table).
- **The run:** the step it stopped at, drafts an hour (from the `matches:` lines and the step times), engine errors,
  timeouts, and the `drafts.jsonl` size at the end.
- **If the bar was missed at 12,000,** extrapolate the drafts needed from the steps' shares, and how long that would
  take at the measured rate.
- **Leave the files where they are.** Do not copy them into ForgeCoach: the cloud session moves the meta if it ships.

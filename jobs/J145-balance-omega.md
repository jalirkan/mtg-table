id: J145
title: Is Omega balanced by colour? Three arms on the Omega 180, Forge Default piloting every game: (A) PULL -- grid drafts by three drafters, each against the lab drafter, 600 drafts each for the human-pick model and Forge's ranks, 2,000 lab-vs-lab drafts (seeds 814,500,001 and up), and the share of each drafter's two-colour decks holding each colour (target 2/5), reported, not judged tonight; (B) PAYOFF -- each draft's two decks played against each other twice, each on the play once (census-play --replay, Bo1, recorded rows), and each colour's win rate in games between decks that differ in it (target 0.5), judged on the lab-vs-lab drafts; (C) the pool's own payoff -- 2,000 decks drawn from Omega's list by decks --cube (D456: k on 1-3, D447's land and castability rules, the repeat cap reported) in 8,000 Bo1 games; registered rules: a cell OFF / EVEN / UNCLEAR, the night's verdict BALANCED ON PAYOFF when no colour is OFF on arm B's lab-vs-lab payoff (pull is not judged tonight: the human-pick model was demoted to context, 105 of 180 cards covered); pairs, triples, A vs C and closeness reported as candidates; no swaps
public_title: Omega colour balance: drafted pull, drafted payoff and the pool payoff
public_est: ~2 to 4 h
public_decides: Whether the Omega cube is balanced by colour on payoff
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 3
after: J147
repos: mtg-table@60252b32 (origin/main: the merge of #173, D456's `cubelab.sh decks --cube`), ForgeCoach@866c256 (J114's pick files: public/cubes/omega-cube-180.picks.json, sha256 9ee28421c115..., the same bytes on ForgeCoach main; checked by the pilot)
decides: whether Omega is BALANCED ON PAYOFF at colour level by the registered rule below (no colour OFF on the lab-vs-lab drafts' payoff); pull is reported and NOT judged tonight (the rule's registered change), and every other reading (pairs, triples, the pool's payoff, A vs C, closeness) reported as a candidate (D447 point 9). No card is swapped on this night: the swap / evolve-objective rule is written after this report, as its own pre-registration
hypothesis: none to confirm. Omega was built with 24 cards a colour and 8 gold a colour (2 a pair), so if the cards are even the pull is near 0.4 and the payoff near 0.5 for every colour; J111/J114 saw the lab drafter over-draft blue and Forge play blue worse (J141: blue's main-colour rate .433 under Forge), so blue is the colour most likely to read OFF, in pull (up) and in payoff (down)
rule: registered by the cloud on 2026-10-19 23:55 UTC (pc-jobs README), before any data, verbatim in substance. CELLS: colour level (5) decides; pairs (10) reported with intervals; triples only where a cell has 40+ decks; 4-5-colour decks excluded everywhere; a deck's colours = colours with 3+ spells. PULL (arm A, drafted decks): share of two-colour decks containing colour c, target 2/5; mono and three-colour shares reported beside it, not judged; one reading per drafter (lab, forge-ranks, the human-pick model), never pooled; the human-pick model's reading is the primary one for pull, the other two context; real drafts (the draft-deck ledger, #169) shown, never judged until 30+ decks. PAYOFF (arm B, the drafted decks played makeup-vs-makeup, Forge Default both seats): each colour's win rate in games between decks that differ in that colour, deck-clustered bootstrap; target 0.5. Arm C (decks --cube census on Omega's pool, k in {1,2,3}, same land/castability rules) gives the pool's intrinsic payoff by colour, same target, same read. "Clearly off even": a cell is OFF when its 95% interval excludes the target AND the point is at least 0.08 from it for pull (outside [0.32, 0.48]) or 0.05 for payoff (outside [0.45, 0.55]); else EVEN if its interval sits inside that band; else UNCLEAR. The cube is BALANCED at colour level when no colour is OFF on primary pull or on arm-B payoff. Everything else (pairs, A vs C contrasts, closeness) is a candidate per D447 point 9. A vs C: a colour OFF in B but EVEN in C reads "the drafter/deck-building favours or starves it"; OFF in both reads "the cards"; report, don't act. CLOSENESS: per colour and pair, median final life margin of the winner and median turns, with IQR, reported only. The report's first line carries the Forge-pilot caveat (J141: search lifts every colour about equally, +8.9 pts, so a Forge-only payoff is the right first cut). No swaps from this night. THIS JOB'S CHOICES, fixed here before any game: pull intervals are a percentile bootstrap clustered by draft (1,000 replicates); payoff intervals a deck-clustered bootstrap (J141's multinomial deck weights, 1,000 replicates); arm B's judged reading is the lab-vs-lab drafts (both seats one drafter and one builder, so no colour's rate is a drafter's strength), the human-pick and forge-ranks drafts' own games context; "games between decks that differ in c" means one deck has c among its colours with 3+ spells and the other does not, both decks with 1-3 such colours, decisive games only; the winner's final life is its life on the ledger's last line; real drafts labelled as context (never in the verdict) at 30+ Omega decks. REGISTERED CHANGE (the cloud, 2026-10-20, before any J145 data): the human-pick model is DEMOTED to context for pull. Reason: its Omega file covers 105 of the 180 cards, unevenly by colour (W 15/24, U 13/24, B 11/24, R 14/24, G 13/24, gold 12/20, colourless 7/18, lands 20/22), and the other 75 are valued by its rating fallback, so its coverage biases exactly the quantity pull measures (how much each colour is drafted). So tonight NO drafter's pull is judged: all three readings (lab, forge-ranks, the human-pick model) are reported with their intervals, the OFF / EVEN / UNCLEAR labels shown as information, and the model's per-colour coverage beside its reading. The night's verdict is BALANCED ON PAYOFF when no colour is OFF on arm B's lab-vs-lab payoff, else NOT BALANCED ON PAYOFF, and the report says pull is not judged. Pull becomes judged in a later night when the draft-deck ledger reaches 30+ real Omega decks (the real drafts then the primary reading, the same OFF / EVEN band, target 2/5) or a human pick model covering the whole cube exists
followup: morning-read
est: ~2.5 h (2-3.5 h) on 6 workers (the memory rule below gives 6 on this PC's budget). Arm A: 3,200 grid drafts with --games 0 (draft and build only: the lab's builder and Forge's for each seat, about a second of a worker each; J134 measured the drafters at well under 1 s a draft) ~0.2 h. Games: 6,400 (arm B: two a draft) + 8,000 (arm C) = 14,400 Bo1 games. J136 measured an Omega game at 2.91 s of a worker (1,007 games, 7 workers), and D450 rows mode costs ~4% more, so ~3.0 s: 14,400 x 3.0 / 6 = 2.0 h; J140's census ran 9,000-9,500 games an hour on 5 workers at 16.5 turns, which gives ~1.4 h. Plus ~15 min of pilot and ~2 min to read. Storage on the data folder: ~14,400 x 47 KB = ~0.7 GB of rows and ledgers, plus ~6,400 + 2,000 small deck files
resumable: yes
timeout: 4h
clean: var/lab-j145-local var/cubelab/homes-J145
progress: metric played games
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: played = lines /home/justin-a/code/lab/data/lab-j145/games/B-lab/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-hp/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-fr/games.jsonl /home/justin-a/code/lab/data/lab-j145/census/games/games.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j145/games/B-lab/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-hp/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-fr/games.jsonl /home/justin-a/code/lab/data/lab-j145/census/games/games.jsonl "\"engineError\":\""
metrics: timeouts = count /home/justin-a/code/lab/data/lab-j145/games/B-lab/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-hp/games.jsonl /home/justin-a/code/lab/data/lab-j145/games/B-fr/games.jsonl /home/justin-a/code/lab/data/lab-j145/census/games/games.jsonl "\"timeout\":true"
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: runs = cubelab /home/justin-a/code/lab/data/lab-j145/runs/lab /home/justin-a/code/lab/data/lab-j145/runs/hp /home/justin-a/code/lab/data/lab-j145/runs/fr
metrics: prof = sh: python3 -c "import json; print(json.dumps({n: json.load(open(f'/home/justin-a/code/lab/data/lab-j145/prof/{n}/profile.json')) for n in ['lab', 'hp', 'fr']}))" 2>/dev/null || echo '{}'
metrics: cd = sh: cat /home/justin-a/code/lab/data/lab-j145/census/decks/decks.json 2>/dev/null || echo '{"count":0}'
metrics: rec = sh: python3 -c "import json; d=[json.load(open(f'/home/justin-a/code/lab/data/lab-j145/{p}/census-play.json')).get('record') or {} for p in ['games/B-lab', 'games/B-hp', 'games/B-fr', 'census/games']]; print(json.dumps({'arms': sum(1 for x in d if x.get('mode') == 'rows'), 'games': sum(x.get('games', 0) for x in d), 'problems': sum(len(x.get('problems') or []) for x in d), 'rowsProblems': sum((x.get('rowsCheck') or {}).get('problems', 0) for x in d), 'leaks': sum((x.get('leakCheck') or {}).get('leaks', 0) for x in d)}))" 2>/dev/null || echo '{"arms":0}'
metrics: bal = sh: cat /home/justin-a/code/lab/data/lab-j145/out/balance.json 2>/dev/null || echo '{"verdict":{"code":-9}}'
metrics: balstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j145/out/balance.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
headline: played, engine_errors, bal.verdict.code, bal.labels.payoff.Blab.W, bal.labels.payoff.Blab.U, bal.labels.payoff.Blab.B, bal.labels.payoff.Blab.R, bal.labels.payoff.Blab.G, bal.labels.payoff.C.W, bal.labels.payoff.C.U, bal.labels.payoff.C.B, bal.labels.payoff.C.R, bal.labels.payoff.C.G

**Why (the cloud, pc-jobs README, 2026-10-19 23:55 UTC: "cube colour balance, Omega first: approved as you
designed it, with these rules fixed now (before any data)").** A cube is balanced by colour when drafters are
drawn to each colour about equally (pull) and a colour's decks win about as often as the decks without it
(payoff). Bots draft like bots, so the cloud first named the human-pick model the primary reading of pull; it is demoted
to context tonight (below, and the rule's registered change), so tonight judges payoff only. Forge pilots every
game, so payoff is Forge's. Arm C separates the cards from the drafting: the same read on decks drawn straight from
Omega's list, with no drafter at all.

**The arms.**

| arm | what | size | seeds |
|---|---|---|---|
| A, pull | `cubelab.sh run cubes/omega-cube-180.md --format grid --games 0`: each draft's two decks built by the lab builder with the cube's default ratings (Omega has no `ratings.tsv`, so Forge's ranks, as in J133/J136) | lab vs lab 2,000 drafts (4,000 lab decks); `--drafter human-picks:<ForgeCoach>/public/cubes/omega-cube-180.picks.json --drafter-seat A` 600 drafts (600 human-pick decks, seat B the lab drafter); `--drafter forge-ranks --drafter-seat A` 600 (600 forge-ranks decks). Who opens alternates with the seed's parity, so seat A opens half | drafts 814,500,001 and up, the same deals in every folder (the lab folder's first 600 are the others' 600) |
| B, payoff | every draft's two decks (the deck that `run` would play: the lab's, or Forge's where the lab built none) copied into a census-play folder and played against each other twice, Bo1, each on the play once (`census-play --replay` of a list of the draft's two games: game g's seed S x 1,000,000 + g, side a on the play when it is even), Forge Default both seats, `--record rows` | 4,000 + 1,200 + 1,200 games | S = 1451 (lab), 1452 (human-pick), 1453 (forge-ranks) |
| C, the pool | `cubelab.sh decks --cube cubes/omega-cube-180.md --count 2000` (D456: k uniform on 1-3, the cube's colourless share, D447's land formula and castability, the repeat cap at k = 1) and `census-play --pairs 8000` (random pairings, every deck in 8 games), Bo1, Forge Default both seats, `--record rows` | 2,000 decks, 8,000 games | decks 1455, games 1455 |

**How `run` pairs decks, and why B goes through census-play.** `run` plays each draft's two decks against each other
(a best of `--games`, stopping at a majority) and records no life totals, which closeness needs; census-play keeps a
per-turn ledger (D450) and plays exactly the listed games. So arm A drafts with `--games 0`, and arm B plays the same
pairing `run` would (the draft's two decks) through census-play, two games a draft so each deck is on the play once.
census-play reads only a deck's id and file from `decks.jsonl`, so `profile.ts` (below) makes that folder; it could
pair drafted decks ACROSS drafts too (its own `--pairs`), but the rule's "makeup-vs-makeup" is met within the
drafts -- a grid draft's two decks compete for colours and nearly always differ -- and cross-draft pairing is not
how the cube is played, so none is added.

**The human-pick model on Omega: partly covered.** J114's files are ForgeCoach@866c256's
`public/cubes/*.picks.json`; mtg-table's own `fixtures/human-picks/` copies hold Vintage and Synergy only, but the
same ForgeCoach commit ships `omega-cube-180.picks.json` (the same bytes on ForgeCoach main today). It matches 105
of Omega's 180 cards to the 17Lands Powered Cube data: by section W 15/24, U 13/24, B 11/24, R 14/24, G 13/24, gold
12/20, colourless 7/18, lands 20/22. The other 75 are valued by D416's fallback (s = a + b x rating, the least-squares
line over the covered cards). So its pull is the model's on 58% of the cube, and the colours are covered unevenly
(black least, white most): that biases exactly what pull measures, so the cloud demoted it to context (the rule's
registered change) and NO drafter's pull is judged tonight. `balance.md` prints the coverage beside its reading
(`coverage.json`, written by the pilot from the pick file and the cube's sections).

**Real drafts.** The draft-deck ledger (#169, D455) lives in Justin's checkout, which the runner never lets a job
read; the coach helper serves it as colour counts only (`GET /draft-decks?cube=omega-cube-180` on 127.0.0.1:8643,
D455's aggregate: per deck its nonland cards of each colour, no card names). The read step fetches that once; on
2026-10-20 it held 0 Omega decks. Shown, and labelled as context only at 30+ decks, never in the verdict.

**Workers and memory.** `max_workers: 7`, `mem_per_worker_gb: 3`, as J144: J140's measured 2.15 GB a worker plus 40%
for rows mode, so the runner sizes the run at min(7, cores - 1, budget / 3 x 0.85) = 6 on this PC's 21-23 GB budget,
and fewer if the GPU lane holds memory (J140's 7-worker OOM kill came from sizing at 2 GB a worker beside it).

**Where it writes.** Every lab command runs under `LAB_DATA_DIR=/home/justin-a/code/lab/data` (the README's only
value), so `var/lab-j145/...` is re-rooted to `/home/justin-a/code/lab/data/lab-j145/...`; the job's scripts and
self-tests stay in the clone (`var/lab-j145-local/`). The pilot checks the setting, creates the folder if absent and
stops under 50 GB free; each run block checks it again and `abort:` watches it. `clean:` names only the clone's
folders (the lint allows no other); the job is resumable, so a fresh start would need the data folder's
`lab-j145` removed by hand.

**The scripts** (written by the pilot into `var/lab-j145-local/bin/`, no engine):
- `profile.ts` (Node, the clone's own `deckcensus.ts`): every deck of a run folder, profiled by the census's rule
  (`profileOf`: a spell counts for its printed colours and every colour of its cost; colours with 3+ spells),
  copied into a census-play folder with `decks.jsonl` and the replay list `pairs.jsonl`; `profile.json` counts the
  decks by k, the drafts skipped (a seat with no deck) and the decks Forge's builder made.
- `balance.py` (numpy): the registered read. Its self-test, in the pilot, plants a +0.10 edge for black decks in
  fabricated games over arm C's real decks and requires black OFF and no other colour OFF in that payoff.

Never `summary.md` or `metrics.json`. Not beside a queue night (it aborts if one starts). Everything resumes:
`run` and `census-play` skip what is done, `decks` and `profile.ts` are deterministic.

## Pilot
About 15 minutes: the data folder, the pin, the tools and the pick file; the tests; the arm C decks (no engine);
the scripts and the read's planted self-test; then 6 drafts per folder, their 12 games, 40 census games, and the
read over them.
cores: 1
```bash
mkdir -p var/lab-j145-local/bin
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J145: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J145: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J145: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J145: under 50 GB free on the data folder')"
echo 1 > var/lab-j145-local/datadir.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j145-local/merged.txt || echo 0 > var/lab-j145-local/merged.txt
grep -q 'export function cubeDecksCommand' tools/cubelab/deckcensus.ts && grep -q 'export function drawCubeRun' tools/cubelab/deckcensus.ts && grep -q "kind: 'forge-ranks'" tools/cubelab/run.ts && grep -q 'export const RECORD_MODES' tools/cubelab/censusplay.ts && echo 1 > var/lab-j145-local/has-tools.txt || echo 0 > var/lab-j145-local/has-tools.txt
sha256sum {ForgeCoach}/public/cubes/omega-cube-180.picks.json | cut -c1-64 > var/lab-j145-local/picks-sha.txt
test "$(cat var/lab-j145-local/picks-sha.txt)" = 9ee28421c115570839e46ab270288ec6b982db18cc467bb5899b436ae6901b23 && echo 1 > var/lab-j145-local/picks-ok.txt || echo 0 > var/lab-j145-local/picks-ok.txt
cat var/lab-j145-local/datadir.txt var/lab-j145-local/merged.txt var/lab-j145-local/has-tools.txt var/lab-j145-local/picks-ok.txt
env -u LAB_DATA_DIR node --test web/test/cubelab-deck-census.test.ts web/test/cubelab-humanpicks.test.ts
# the human-pick model's coverage of Omega, by the cube's sections (shown beside its pull reading: the reason it is context tonight)
node --input-type=module -e "import fs from 'node:fs'; import { parseCube } from './tools/cubelab/cube.ts'; const p = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const by = {}; for (const c of parseCube(fs.readFileSync('cubes/omega-cube-180.md', 'utf8')).cards) { const x = by[c.section] ??= { covered: 0, cards: 0 }; x.cards++; if (p.cards[c.name]) x.covered++; } const all = Object.values(by).reduce((a, x) => ({ covered: a.covered + x.covered, cards: a.cards + x.cards }), { covered: 0, cards: 0 }); fs.writeFileSync('var/lab-j145-local/coverage.json', JSON.stringify({ file: 'omega-cube-180.picks.json', ...all, bySection: by }, null, 2)); console.log(JSON.stringify(all));" {ForgeCoach}/public/cubes/omega-cube-180.picks.json
export LAB_DATA_DIR=/home/justin-a/code/lab/data
# arm C's decks: the run's own (deterministic, no engine)
tools/cubelab.sh decks --cube cubes/omega-cube-180.md --count 2000 --seed 1455 --out var/lab-j145/census/decks
cat > var/lab-j145-local/bin/profile.ts <<'TS'
// J145's deck profiles (pc-results drafts/J145-balance-omega.md): every drafted deck of a cube-lab run folder,
// profiled by the census's own rule (tools/cubelab/deckcensus.ts profileOf: a spell counts for its printed
// colours and every colour of its cost; a deck's colours are those with 3+ spells), copied into a census-play
// decks folder (decks.jsonl + decks/<id>.dck), with a replay list that plays each draft's two decks against
// each other twice, each on the play once (pairs.jsonl: game g's seed S x 1,000,000 + g, side a on the play
// when it is even).  No engine.  Run from the mtg-table clone's root.
//   node profile.ts --run <run folder> --name <tag> --seed-base S --cube <cube.md> --out <dir>
import fs from 'node:fs';
import path from 'node:path';

const arg = (k: string): string => { const i = process.argv.indexOf(`--${k}`); if (i < 0 || !process.argv[i + 1]) throw new Error(`profile.ts: --${k} is required`); return process.argv[i + 1] as string; };
const run = arg('run'), name = arg('name'), out = arg('out'), cubeFile = arg('cube');
const seedBase = Number(arg('seed-base'));
const dc = await import(path.resolve('tools/cubelab/deckcensus.ts'));
const { openForgeScripts } = await import(path.resolve('tools/forge-scripts.ts'));
const scripts = openForgeScripts(dc.defaultScriptsZip(process.cwd()));
if (!scripts) throw new Error('profile.ts: no Forge card scripts');
const { lib } = dc.censusPopulation(fs.readFileSync('cubes/library/library-pool.tsv', 'utf8'), fs.readFileSync('cubes/library/census.tsv', 'utf8'), dc.scriptLookup(scripts));
const byName = new Map(lib.map((c: { name: string }) => [c.name, c]));
const cubeName = dc.cubeNameOf(cubeFile);
const { parseCube } = await import(path.resolve('tools/cubelab/cube.ts'));
const inCube = new Set(parseCube(fs.readFileSync(cubeFile, 'utf8')).cards.map((c: { name: string }) => c.name));
const meta = JSON.parse(fs.readFileSync(path.join(run, 'run.json'), 'utf8'));
const drafterOf = (seat: string): string => (meta.drafter && meta.drafter.seat === seat ? meta.drafter.kind : 'lab');
const BASIC = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

function mainOf(file: string): Array<[number, string]> {
  const out2: Array<[number, string]> = [];
  let inMain = false;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const l = raw.trim();
    if (/^\[.*\]$/.test(l)) { inMain = /^\[main\]$/i.test(l); continue; }
    const m = /^(\d+)\s+(.+?)(\|.*)?$/.exec(l);
    if (inMain && m) out2.push([Number(m[1]), (m[2] as string).trim()]);
  }
  return out2;
}

fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
const drafts = fs.readFileSync(path.join(run, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((x, y) => x.seed - y.seed);
const lines: string[] = [], pairs: string[] = [];
const tally = { drafts: drafts.length, decks: 0, skippedDrafts: 0, forgeBuilt: 0, notInCube: 0, unknown: 0, byK: [0, 0, 0, 0, 0, 0] as number[] };
let j = 0;
for (const d of drafts) {
  const ids: string[] = [];
  for (const dr of d.drafters) {
    const rel = dr.played === 'lab' && dr.deckFile ? dr.deckFile : dr.forgeDeckFile;
    const src = rel ? path.join(run, rel) : '';
    if (!rel || !fs.existsSync(src)) continue;
    const main = mainOf(src);
    if (main.reduce((a, [n]) => a + n, 0) < 40) continue;
    const spells: unknown[] = [];
    const names: string[] = [];
    for (const [n, nm] of main) {
      if (BASIC.has(nm)) continue;
      const c = byName.get(nm) as { land: boolean } | undefined;
      if (!c) { tally.unknown += n; continue; }
      if (!inCube.has(nm)) tally.notInCube += n;
      if (c.land) continue;
      for (let i = 0; i < n; i++) { spells.push(c); names.push(nm); }
    }
    const p = dc.profileOf(spells);
    const colours3 = 'WUBRG'.split('').filter((x) => p.spellsByColour[x] >= 3).join('');
    const id = `${name}-${d.seed}-${dr.seat}`;
    fs.copyFileSync(src, path.join(out, 'decks', `${id}.dck`));
    lines.push(JSON.stringify({ v: 1, id, band: `cube:${cubeName}`, file: `decks/${id}.dck`, run: name, draft: d.seed, seat: dr.seat, drafter: drafterOf(dr.seat), played: dr.played,
      colours3, k: colours3.length, profile: p, spells: names }));
    tally.decks++;
    tally.byK[colours3.length] = (tally.byK[colours3.length] as number) + 1;
    if (dr.played !== 'lab') tally.forgeBuilt++;
    ids.push(id);
  }
  if (ids.length !== 2) { tally.skippedDrafts++; continue; }
  j++;
  for (const g of [2 * j - 1, 2 * j]) pairs.push(JSON.stringify({ g, seed: seedBase * 1_000_000 + g, a: ids[0], b: ids[1], draft: d.seed }));
}
fs.writeFileSync(path.join(out, 'decks.jsonl'), `${lines.join('\n')}\n`);
fs.writeFileSync(path.join(out, 'pairs.jsonl'), `${pairs.join('\n')}\n`);
const summary = { v: 1, run: name, cube: cubeName, drafter: meta.drafter ?? null, seedBase, ...tally, pairs: pairs.length };
fs.writeFileSync(path.join(out, 'profile.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
TS
cat > var/lab-j145-local/bin/balance.py <<'PY'
import argparse, gzip, json, math, os
import numpy as np
# J145's read (pc-results drafts/J145-balance-omega.md, "The registered rules"): Omega's colour balance from
# three arms, numpy only, no engine.  The rules are the cloud's, registered 2026-10-19 23:55 UTC before any data:
#
#  CELLS.  Colour level (5) decides; pairs (10) are reported with intervals; triples only where a cell has 40+
#  decks; 4- and 5-colour decks are excluded everywhere (and 0-colour ones, which have no colour to count).
#  A deck's colours are its colours with 3+ spells (the census's rule, deckcensus.ts profileOf).
#  PULL (arm A, drafted decks): the share of two-colour decks containing colour c, target 2/5; mono and
#  three-colour shares beside it, not judged; one reading per drafter, never pooled.  REGISTERED CHANGE (the
#  cloud, 2026-10-20, before any data): the human-pick model, first named the primary reading, is demoted to
#  context (its Omega file covers 105 of 180 cards, unevenly by colour, which biases what pull measures), so
#  NO drafter's pull is judged tonight: all three are reported with their labels as information and the
#  model's per-colour coverage beside it; pull is judged once the draft-deck ledger holds 30+ real Omega
#  decks (real drafts then primary, the same band) or a full-coverage human model exists.  Intervals: a percentile bootstrap clustered by
#  draft (the drafts resampled with replacement, 1,000 replicates), since a lab-vs-lab draft's two decks
#  compete for colours.
#  PAYOFF (arm B, the drafted decks played against each other; arm C, the cube's census): colour c's win rate
#  in the games between decks that differ in c (one has it, the other not), decisive games only; target
#  0.5; a deck-clustered bootstrap (J141's: multinomial deck weights, a deck-game weighted by its deck's,
#  1,000 replicates).  Arm B's judged reading is the lab-vs-lab folder (both seats one drafter and one
#  builder, so a colour's rate is not a drafter's strength); the other folders' games are context.
#  "CLEARLY OFF EVEN": a cell is OFF when its 95% interval excludes the target AND the point is at least
#  0.08 from it for pull (0.05 for payoff); else EVEN if its interval sits inside [target - 0.08, target +
#  0.08] for pull ([0.45, 0.55] for payoff); else UNCLEAR.  Tonight's verdict: BALANCED ON PAYOFF when no
#  colour is OFF on arm B's judged payoff (lab vs lab), else NOT BALANCED ON PAYOFF; pull is not judged.
#  Everything else is a candidate (D447 point 9).
#  A vs C: OFF in B but EVEN in C reads "the drafter/deck-building favours or starves it"; OFF in both "the
#  cards".  CLOSENESS: per colour and pair, the winner's final life and the game's turns, median and IQR.
#  Real drafts (the coach helper's aggregate): shown; labelled (as context, never in the verdict) only at 30+.
ap = argparse.ArgumentParser()
ap.add_argument('--pull', action='append', default=[])     # name=<drafter>,<profile dir>: that drafter's decks of one run (decks.jsonl)
ap.add_argument('--payoff', action='append', default=[])   # name=<decks dir>,<census-play games dir>
ap.add_argument('--coverage', action='append', default=[])  # name=<coverage.json>: a pick model's coverage, shown beside that drafter's pull
ap.add_argument('--judged-payoff', default='Blab')
ap.add_argument('--census', default=None)                  # name=<decks dir>,<games dir>: arm C
ap.add_argument('--real', default=None)                    # the coach helper's GET /draft-decks?cube=... answer
ap.add_argument('--boot', type=int, default=1000)
ap.add_argument('--seed', type=int, default=145)
ap.add_argument('--min-triple', type=int, default=40)
ap.add_argument('--real-min', type=int, default=30)
ap.add_argument('--out', required=True)
a = ap.parse_args()

C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
TRIPLES = [x + y + z for i, x in enumerate(C5) for j, y in enumerate(C5) if j > i for z in C5[j + 1:]]
PULL_T, PULL_B, PAY_T, PAY_B = 0.4, 0.08, 0.5, 0.05


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def jsonl(p):
    if not os.path.exists(p):
        return []
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf8') as f:
        return [json.loads(l) for l in f if l.strip() and l.endswith('\n')]


def colours3(d):
    if 'colours3' in d:
        return d['colours3']
    sb = d['profile']['spellsByColour']
    return ''.join(c for c in C5 if sb.get(c, 0) >= 3)


def pct(reps):
    reps = np.sort(reps[np.isfinite(reps)])
    if len(reps) == 0:
        return None, None
    return r4(reps[int(math.floor(0.025 * (len(reps) - 1)))]), r4(reps[int(math.ceil(0.975 * (len(reps) - 1)))])


def label(est, lo, hi, t, band):
    if est is None or lo is None or hi is None:
        return 'UNCLEAR'
    if (lo > t or hi < t) and abs(est - t) >= band - 1e-12:
        return 'OFF'
    if lo >= t - band - 1e-12 and hi <= t + band + 1e-12:
        return 'EVEN'
    return 'UNCLEAR'


def cell(num, den, W, t=None, band=None):
    """A share sum(num)/sum(den) with its replicates under weight matrix W (rows: replicates, cols: units)."""
    n, d = float(num.sum()), float(den.sum())
    est = n / d if d else None
    sd = W @ den
    reps = np.where(sd > 0, (W @ num) / np.where(sd > 0, sd, 1), np.nan)
    lo, hi = pct(reps)
    out = {'n': int(d), 'hits': int(n), 'est': r4(est), 'lo': lo, 'hi': hi}
    if t is not None:
        out['target'] = t
        out['label'] = label(out['est'], lo, hi, t, band)
    return out


def weights(n, tag):
    return np.random.default_rng([a.seed, tag]).multinomial(n, np.full(n, 1 / n), size=a.boot).astype(float) if n else np.zeros((a.boot, 0))


# ---------------------------------------------------------------- PULL
def pull_of(decks, tag):
    drafts = sorted({d['draft'] for d in decks})
    di = {s: i for i, s in enumerate(drafts)}
    W = weights(len(drafts), tag)
    S = [colours3(d) for d in decks]
    k = np.array([len(s) for s in S])
    unit = np.array([di[d['draft']] for d in decks])
    def agg(mask):  # per-draft sums of a deck mask
        v = np.zeros(len(drafts))
        np.add.at(v, unit, mask.astype(float))
        return v
    out = {'decks': len(decks), 'drafts': len(drafts), 'byK': {str(i): int((k == i).sum()) for i in range(6)},
           'kShares': {str(i): r4((k == i).mean()) if len(k) else None for i in range(6)}, 'twoColour': {}, 'mono': {}, 'threeColour': {}, 'pairs': {}, 'triples': {}}
    two, one, three = agg(k == 2), agg(k == 1), agg(k == 3)
    for c in C5:
        has = np.array([c in s for s in S])
        out['twoColour'][c] = cell(agg((k == 2) & has), two, W, PULL_T, PULL_B)
        out['mono'][c] = cell(agg((k == 1) & has), one, W)
        out['threeColour'][c] = cell(agg((k == 3) & has), three, W)
    for p in PAIRS:
        out['pairs'][p] = cell(agg(np.array([s == p for s in S])), two, W)
    for t in TRIPLES:
        m = np.array([s == t for s in S])
        if m.sum() >= a.min_triple:
            out['triples'][t] = cell(agg(m), three, W)
    return out


# ---------------------------------------------------------------- PAYOFF (and closeness)
def payoff_of(decks, rows, ledgers, tag):
    by = {d['id']: d for d in decks}
    S = {i: colours3(d) for i, d in by.items()}
    ok = lambda i: 1 <= len(S[i]) <= 3
    ids = sorted(by)
    ix = {i: n for n, i in enumerate(ids)}
    dg_deck, dg_win, dg_own, dg_opp = [], [], [], []
    excluded = {'engineError': 0, 'notDecisive': 0, 'deckOutside1to3': 0}
    games = []
    for r in rows:
        if r.get('engineError'):
            excluded['engineError'] += 1
            continue
        if r.get('winner') not in ('a', 'b'):
            excluded['notDecisive'] += 1
            continue
        if r['a'] not in by or r['b'] not in by or not ok(r['a']) or not ok(r['b']):
            excluded['deckOutside1to3'] += 1
            continue
        games.append(r)
        for side, me, op in (('a', r['a'], r['b']), ('b', r['b'], r['a'])):
            dg_deck.append(ix[me]); dg_win.append(1.0 if r['winner'] == side else 0.0); dg_own.append(S[me]); dg_opp.append(S[op])
    dd = np.array(dg_deck, int)
    win = np.array(dg_win)
    W = weights(len(ids), tag)
    WD = W[:, dd] if len(dd) else np.zeros((a.boot, 0))
    def pc(mask, t=None, band=None):
        m = mask.astype(float)
        return cell(m * win, m, WD, t, band) if len(dd) else {'n': 0, 'hits': 0, 'est': None, 'lo': None, 'hi': None, **({'target': t, 'label': 'UNCLEAR'} if t is not None else {})}
    out = {'decks': len(ids), 'games': len(games), 'excluded': excluded, 'colour': {}, 'pairs': {}, 'triples': {}, 'byK': {}}
    for c in C5:
        out['colour'][c] = pc(np.array([(c in o) and (c not in p) for o, p in zip(dg_own, dg_opp)]), PAY_T, PAY_B)
    for p in PAIRS:
        out['pairs'][p] = pc(np.array([o == p and q != p for o, q in zip(dg_own, dg_opp)]))
    deck_count = {}
    for i in ids:
        deck_count[S[i]] = deck_count.get(S[i], 0) + 1
    for t in TRIPLES:
        if deck_count.get(t, 0) >= a.min_triple:
            out['triples'][t] = pc(np.array([o == t and q != t for o, q in zip(dg_own, dg_opp)]))
    for kk in (1, 2, 3):
        out['byK'][str(kk)] = pc(np.array([len(o) == kk and len(q) != kk for o, q in zip(dg_own, dg_opp)]))
    # closeness: the winner's final life (the ledger's last turn) and the game's turns
    led = {}
    for l in ledgers:
        t = ((l.get('ledger') or {}).get('turns') or [])
        if t:
            led[l['g']] = t[-1]['s']
    def close(sel):
        life = [led[r['g']][0 if r['winner'] == 'a' else 1][0] for r in sel if r['g'] in led]
        turns = [r['turns'] for r in sel if r.get('turns') is not None]
        q = lambda xs: None if not xs else {'n': len(xs), 'median': r4(np.median(xs)), 'q1': r4(np.percentile(xs, 25)), 'q3': r4(np.percentile(xs, 75))}
        return {'winnerLife': q(life), 'turns': q(turns)}
    out['closeness'] = {'all': close(games), 'colour': {c: close([r for r in games if c in S[r['a']] or c in S[r['b']]]) for c in C5},
                        'pairs': {p: close([r for r in games if S[r['a']] == p or S[r['b']] == p]) for p in PAIRS}}
    return out


def load_payoff(spec):
    name, rest = spec.split('=', 1)
    ddir, gdir = rest.split(',', 1)
    decks = jsonl(os.path.join(ddir, 'decks.jsonl'))
    rows = jsonl(os.path.join(gdir, 'games.jsonl'))
    led = jsonl(os.path.join(gdir, 'ledger.jsonl'))
    return name, decks, rows, led


doc = {'v': 1, 'job': 'J145', 'cube': 'omega-cube-180', 'options': {'boot': a.boot, 'seed': a.seed, 'minTriple': a.min_triple, 'realMin': a.real_min},
       'caveat': 'Every game is piloted by Forge\'s Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge\'s.',
       'pull': {}, 'payoff': {}}
for t, spec in enumerate(a.pull):
    name, rest = spec.split('=', 1)
    kind, d = rest.split(',', 1)
    decks = [x for x in jsonl(os.path.join(d, 'decks.jsonl')) if x.get('drafter') == kind]
    doc['pull'][name] = pull_of(decks, 100 + t)
    doc['pull'][name]['drafter'] = kind
for t, spec in enumerate(a.payoff):
    name, decks, rows, led = load_payoff(spec)
    doc['payoff'][name] = payoff_of(decks, rows, led, 200 + t)
if a.census:
    name, decks, rows, led = load_payoff(a.census)
    doc['payoff'][name] = payoff_of(decks, rows, led, 300)
    doc['censusArm'] = name

# real drafts: the helper's aggregate (counts only), shown; labelled at 30+ decks, never in the verdict
real = None
if a.real and os.path.exists(a.real):
    try:
        rj = json.load(open(a.real))
    except ValueError:
        rj = {}
    if rj.get('ok') and isinstance(rj.get('decks'), list):
        S = [''.join(c for c in C5 if (x.get('spells') or {}).get(c, 0) >= 3) for x in rj['decks']]
        k = np.array([len(s) for s in S])
        n2 = int((k == 2).sum())
        real = {'decks': len(S), 'byK': {str(i): int((k == i).sum()) for i in range(6)}, 'twoColour': {}, 'labelled': len(S) >= a.real_min}
        W = weights(len(S), 400)
        for c in C5:
            m = np.array([len(s) == 2 and c in s for s in S], float)
            real['twoColour'][c] = cell(m, (k == 2).astype(float), W, PULL_T if real['labelled'] else None, PULL_B if real['labelled'] else None)
        real['twoColourDecks'] = n2
    else:
        real = {'decks': 0, 'note': 'the coach helper did not answer, or answered no decks'}
doc['real'] = real

for spec in a.coverage:
    name, f = spec.split('=', 1)
    if name in doc['pull'] and os.path.exists(f):
        doc['pull'][name]['coverage'] = json.load(open(f))

# the verdict: payoff only (the registered change: no drafter's pull is judged tonight)
pay = doc['payoff'].get(a.judged_payoff)
cens = doc['payoff'].get(doc.get('censusArm')) if doc.get('censusArm') else None
off_pay = [c for c in C5 if pay and pay['colour'][c].get('label') == 'OFF'] if pay else []
verdict = 'INCOMPLETE' if not pay or pay['games'] == 0 else ('BALANCED ON PAYOFF' if not off_pay else 'NOT BALANCED ON PAYOFF')
avc = {}
for c in C5:
    b = pay['colour'][c]['label'] if pay else None
    cc = cens['colour'][c]['label'] if cens else None
    avc[c] = {'B': b, 'C': cc, 'reads': 'the drafter/deck-building favours or starves it' if b == 'OFF' and cc == 'EVEN' else 'the cards' if b == 'OFF' and cc == 'OFF' else None}
doc['verdict'] = {'colourLevel': verdict, 'code': {'BALANCED ON PAYOFF': 1, 'NOT BALANCED ON PAYOFF': 0, 'INCOMPLETE': -1}[verdict], 'offPayoffB': off_pay,
                  'pullJudged': False, 'pullNote': 'pull is not judged tonight: the human-pick model is context (105 of 180 cards covered, unevenly by colour); pull is judged once the draft-deck ledger holds 30+ real Omega decks or a full-coverage human model exists',
                  'judgedPayoff': a.judged_payoff,
                  'unclearPayoffB': [c for c in C5 if pay and pay['colour'][c].get('label') == 'UNCLEAR'], 'aVsC': avc}
doc['labels'] = {f'pull.{n}.{c}': {'OFF': 1, 'EVEN': 0, 'UNCLEAR': -1}[p['twoColour'][c]['label']] for n, p in doc['pull'].items() for c in C5}
doc['labels'].update({f'payoff.{n}.{c}': {'OFF': 1, 'EVEN': 0, 'UNCLEAR': -1}[p['colour'][c]['label']] for n, p in doc['payoff'].items() for c in C5})


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return r4(o)
    return o


doc = clean(doc)
os.makedirs(a.out, exist_ok=True)
with open(os.path.join(a.out, 'balance.json'), 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')

f3 = lambda x: '–' if x is None else f'{x:.3f}'
iv = lambda c: '–' if not c or c.get('lo') is None else f"{f3(c['lo'])}–{f3(c['hi'])}"
L = [f"**Forge-pilot caveat:** {doc['caveat']}", '', '# J145: is Omega balanced by colour?', '',
     f"**Colour level: {verdict}.** OFF on arm-B payoff ({a.judged_payoff}, lab vs lab): {', '.join(off_pay) or 'none'}. **Pull is not judged tonight**: the human-pick model was demoted to context (it covers 105 of Omega's 180 cards, unevenly by colour), so all three drafters' pull is reported as information; pull is judged once the draft-deck ledger holds 30+ real Omega decks or a full-coverage human model exists. "
     'The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. '
     'BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.', '',
     '## Pull (arm A, not judged tonight): share of two-colour decks containing the colour (target 0.400; labels are information)', '',
     '| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | ' + ' | '.join(C5) + ' |', '|---|---|---|' + '---|' * 5]
for n, p in doc['pull'].items():
    bk = p['byK']
    L.append(f"| {n} ({p.get('drafter', n)}) | {p['decks']} | {bk['1']} / {bk['2']} / {bk['3']} ({bk['0']}, {bk['4']}, {bk['5']}) | " +
             ' | '.join(f"{f3(p['twoColour'][c]['est'])} [{iv(p['twoColour'][c])}] {p['twoColour'][c]['label']}" for c in C5) + ' |')
for n, p in doc['pull'].items():
    cv = p.get('coverage')
    if cv:
        L.append(f"\n{n}'s pick model covers {cv.get('covered')} of the cube's {cv.get('cards')} cards: " + ', '.join(f"{k} {v['covered']}/{v['cards']}" for k, v in (cv.get('bySection') or {}).items()) + ' (the rest valued by its rating fallback).')
L += ['', 'Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).', '',
      '| drafter | ' + ' | '.join(f'mono {c}' for c in C5) + ' | ' + ' | '.join(f'3c {c}' for c in C5) + ' |', '|---|' + '---|' * 10]
for n, p in doc['pull'].items():
    L.append(f'| {n} | ' + ' | '.join(f3(p['mono'][c]['est']) for c in C5) + ' | ' + ' | '.join(f3(p['threeColour'][c]['est']) for c in C5) + ' |')
L += ['', '**Pairs** (share of two-colour decks, average 0.100; candidates):', '', '| drafter | ' + ' | '.join(PAIRS) + ' |', '|---|' + '---|' * 10]
for n, p in doc['pull'].items():
    L.append(f'| {n} | ' + ' | '.join(f"{f3(p['pairs'][x]['est'])} [{iv(p['pairs'][x])}]" for x in PAIRS) + ' |')
for n, p in doc['pull'].items():
    if p['triples']:
        L.append(f"\nTriples with {a.min_triple}+ decks ({n}): " + '; '.join(f"{t} {f3(c['est'])} [{iv(c)}] of {c['n']}" for t, c in p['triples'].items()))
L += ['', '## Payoff: the colour\'s win rate in games between decks that differ in it (target 0.500)', '',
      '| arm | decks | games | ' + ' | '.join(C5) + ' |', '|---|---|---|' + '---|' * 5]
for n, p in doc['payoff'].items():
    tag = ' (judged)' if n == a.judged_payoff else ' (census, the pool)' if n == doc.get('censusArm') else ' (context)'
    L.append(f"| {n}{tag} | {p['decks']} | {p['games']} | " + ' | '.join(f"{f3(p['colour'][c]['est'])} [{iv(p['colour'][c])}] n {p['colour'][c]['n']} {p['colour'][c]['label']}" for c in C5) + ' |')
L += ['', '**A vs C** (report, don\'t act): ' + '; '.join(f"{c}: B {v['B']}, C {v['C']}" + (f" -- {v['reads']}" if v['reads'] else '') for c, v in avc.items()), '',
      '**Pairs' + "'" + ' payoff** (a pair\'s decks against decks that are not that pair; candidates):', '', '| arm | ' + ' | '.join(PAIRS) + ' |', '|---|' + '---|' * 10]
for n, p in doc['payoff'].items():
    L.append(f'| {n} | ' + ' | '.join(f"{f3(p['pairs'][x]['est'])} [{iv(p['pairs'][x])}]" for x in PAIRS) + ' |')
L += ['', '**By colour count** (decks with k colours against decks with another k; information): ' + '; '.join(
    f"{n}: " + ', '.join(f"k{kk} {f3(c['est'])} [{iv(c)}]" for kk, c in p['byK'].items()) for n, p in doc['payoff'].items())]
L += ['', '## Closeness (reported only): the winner\'s final life and the game\'s turns, median [IQR]', '', '| arm | cell | games | winner life | turns |', '|---|---|---|---|---|']
q = lambda x: '–' if not x else f"{f3(x['median'])} [{f3(x['q1'])}–{f3(x['q3'])}]"
for n, p in doc['payoff'].items():
    cl = p['closeness']
    for key, v in [('all', cl['all'])] + [(c, cl['colour'][c]) for c in C5] + [(x, cl['pairs'][x]) for x in PAIRS]:
        L.append(f"| {n} | {key} | {(v['turns'] or {}).get('n', 0)} | {q(v['winnerLife'])} | {q(v['turns'])} |")
L += ['', '## Real drafts (the draft-deck ledger, colour counts only)', '']
if real and real.get('decks'):
    L.append(f"{real['decks']} deck(s); by colours with 3+ spells {real['byK']}; " + ('labelled as context (30+ decks), never in the verdict: ' if real['labelled'] else f"shown only (under {a.real_min} decks): ") +
             ', '.join(f"{c} {f3(real['twoColour'][c]['est'])}" + (f" {real['twoColour'][c].get('label')}" if real['labelled'] else '') for c in C5))
else:
    L.append((real or {}).get('note', 'not read'))
with open(os.path.join(a.out, 'balance.md'), 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'verdict': verdict, 'offPayoff': off_pay, 'pull': {n: p['decks'] for n, p in doc['pull'].items()}, 'payoff': {n: p['games'] for n, p in doc['payoff'].items()}}))
PY
# the read's self-test: fabricated games over arm C's real decks, black decks given +0.10; black must read OFF, no other colour OFF
python3 - <<'PY'
import json, os, random
D = '/home/justin-a/code/lab/data/lab-j145/census/decks'
out = 'var/lab-j145-local/selftest/games'
os.makedirs(out, exist_ok=True)
decks = {}
for l in open(os.path.join(D, 'decks.jsonl')):
    d = json.loads(l)
    decks[d['id']] = ''.join(c for c in 'WUBRG' if d['profile']['spellsByColour'][c] >= 3)
ids = sorted(decks)
rnd = random.Random(145)
with open(os.path.join(out, 'games.jsonl'), 'w') as G, open(os.path.join(out, 'ledger.jsonl'), 'w') as L:
    for g in range(1, 8001):
        a, b = rnd.sample(ids, 2)
        pa = 0.5 + 0.1 * (('B' in decks[a]) - ('B' in decks[b]))
        w = 'a' if rnd.random() < pa else 'b'
        G.write(json.dumps({'v': 1, 'g': g, 'seed': g, 'a': a, 'b': b, 'winner': w, 'turns': rnd.randint(8, 20), 'engineError': None}) + '\n')
        life = [rnd.randint(1, 20), 0] if w == 'a' else [0, rnd.randint(1, 20)]
        L.write(json.dumps({'g': g, 'ledger': {'turns': [{'t': 1, 's': [[life[0]], [life[1]]]}]}}) + '\n')
PY
python3 var/lab-j145-local/bin/balance.py --census C=/home/justin-a/code/lab/data/lab-j145/census/decks,var/lab-j145-local/selftest/games --boot 400 --out var/lab-j145-local/selftest
python3 -c "import json; d=json.load(open('var/lab-j145-local/selftest/balance.json')); c=d['payoff']['C']['colour']; ok = c['B']['label'] == 'OFF' and all(c[x]['label'] != 'OFF' for x in 'WURG'); print(json.dumps({x: c[x]['label'] for x in 'WUBRG'})); open('var/lab-j145-local/selftest-ok.txt', 'w').write('1' if ok else '0')"
```
metrics: merged = sh: cat var/lab-j145-local/merged.txt 2>/dev/null || echo 0
metrics: has_tools = sh: cat var/lab-j145-local/has-tools.txt 2>/dev/null || echo 0
metrics: datadir = sh: cat var/lab-j145-local/datadir.txt 2>/dev/null || echo 0
metrics: picks_ok = sh: cat var/lab-j145-local/picks-ok.txt 2>/dev/null || echo 0
metrics: selftest = sh: cat var/lab-j145-local/selftest-ok.txt 2>/dev/null || echo 0
metrics: cov = sh: cat var/lab-j145-local/coverage.json 2>/dev/null || echo '{"cards":0}'
cores: 3
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J145
D=/home/justin-a/code/lab/data/lab-j145
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 6 --seed 814590001 --games 0 --jobs {workers} --out var/lab-j145/pilot/runs/lab
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 6 --seed 814590001 --games 0 --jobs {workers} --drafter "human-picks:{ForgeCoach}/public/cubes/omega-cube-180.picks.json" --drafter-seat A --out var/lab-j145/pilot/runs/hp
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 6 --seed 814590001 --games 0 --jobs {workers} --drafter forge-ranks --drafter-seat A --out var/lab-j145/pilot/runs/fr
K=1
for N in lab hp fr; do
  node var/lab-j145-local/bin/profile.ts --run "$D/pilot/runs/$N" --name "$N" --seed-base $((1490 + K)) --cube cubes/omega-cube-180.md --out "$D/pilot/prof/$N"
  tools/cubelab.sh census-play --decks "var/lab-j145/pilot/prof/$N" --replay "var/lab-j145/pilot/prof/$N/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j145/pilot/games/B-$N"
  K=$((K + 1))
done
tools/cubelab.sh decks --cube cubes/omega-cube-180.md --count 60 --seed 1495 --out var/lab-j145/pilot/census/decks
tools/cubelab.sh census-play --decks var/lab-j145/pilot/census/decks --pairs 40 --seed 1495 --jobs {workers} --record rows --out var/lab-j145/pilot/census/games
mkdir -p "$D/pilot/out"
curl -s --max-time 10 'http://127.0.0.1:8643/draft-decks?cube=omega-cube-180' > "$D/pilot/out/real-drafts.json" || echo '{"ok":false}' > "$D/pilot/out/real-drafts.json"
python3 var/lab-j145-local/bin/balance.py --pull "lab=lab,$D/pilot/prof/lab" --pull "hp=human-picks,$D/pilot/prof/hp" --pull "fr=forge-ranks,$D/pilot/prof/fr" \
    --payoff "Blab=$D/pilot/prof/lab,$D/pilot/games/B-lab" --payoff "Bhp=$D/pilot/prof/hp,$D/pilot/games/B-hp" --payoff "Bfr=$D/pilot/prof/fr,$D/pilot/games/B-fr" \
    --census "C=$D/pilot/census/decks,$D/pilot/census/games" --real "$D/pilot/out/real-drafts.json" --coverage hp=var/lab-j145-local/coverage.json --boot 200 --out "$D/pilot/out"
head -20 "$D/pilot/out/balance.md"
```
metrics: pruns = cubelab /home/justin-a/code/lab/data/lab-j145/pilot/runs/lab /home/justin-a/code/lab/data/lab-j145/pilot/runs/hp /home/justin-a/code/lab/data/lab-j145/pilot/runs/fr
metrics: pprof = sh: python3 -c "import json; print(json.dumps({n: json.load(open(f'/home/justin-a/code/lab/data/lab-j145/pilot/prof/{n}/profile.json')) for n in ['lab', 'hp', 'fr']}))" 2>/dev/null || echo '{}'
metrics: pgames = lines /home/justin-a/code/lab/data/lab-j145/pilot/games/B-lab/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/games/B-hp/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/games/B-fr/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/census/games/games.jsonl
metrics: perr = count /home/justin-a/code/lab/data/lab-j145/pilot/games/B-lab/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/games/B-hp/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/games/B-fr/games.jsonl /home/justin-a/code/lab/data/lab-j145/pilot/census/games/games.jsonl "\"engineError\":\""
metrics: prec = sh: python3 -c "import json; d=[json.load(open(f'/home/justin-a/code/lab/data/lab-j145/pilot/{p}/census-play.json')).get('record') or {} for p in ['games/B-lab', 'games/B-hp', 'games/B-fr', 'census/games']]; print(json.dumps({'arms': sum(1 for x in d if x.get('mode') == 'rows'), 'problems': sum(len(x.get('problems') or []) for x in d), 'rowsProblems': sum((x.get('rowsCheck') or {}).get('problems', 0) for x in d), 'leaks': sum((x.get('leakCheck') or {}).get('leaks', 0) for x in d)}))" 2>/dev/null || echo '{"arms":0}'
metrics: pbal = sh: cat /home/justin-a/code/lab/data/lab-j145/pilot/out/balance.json 2>/dev/null || echo '{"verdict":{"code":-9}}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j145/pilot/out/balance.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
check: merged == 1
check: has_tools == 1
check: datadir == 1
check: picks_ok == 1
check: selftest == 1
check: cov.cards == 180 and cov.covered == 105
check: data_free_gb >= 50
check: qwriters == 0
check: cd.count == 2000
check: cd.v == 2
check: cd.pool.drawable == 180
check: cd.decksOf40 == 2000 and cd.decksAllCastable == 2000
check: cd.makeupK.k1 between 580 and 760 and cd.makeupK.k2 between 580 and 760 and cd.makeupK.k3 between 580 and 760
check: cd.coloursWith3.c4 + cd.coloursWith3.c5 == 0
check: cd.repeatCap.maxShareOfK1 <= 0.25
check: pruns.drafts == 18
check: pprof.lab.decks == 12 and pprof.hp.decks == 12 and pprof.fr.decks == 12
check: pprof.lab.pairs == 12 and pprof.hp.pairs == 12 and pprof.fr.pairs == 12
check: pprof.lab.unknown + pprof.hp.unknown + pprof.fr.unknown == 0
check: pprof.lab.notInCube + pprof.hp.notInCube + pprof.fr.notInCube == 0
check: pgames == 76
check: perr <= 1
check: prec.arms == 4
check: prec.problems + prec.rowsProblems + prec.leaks == 0
check: pstrict == 1
check: pbal.pull.hp.decks == 6 and pbal.pull.fr.decks == 6 and pbal.pull.lab.decks == 12

The pilot asks whether anything is broken:
- **The setting, the pin, the tools and the pick file.** The data folder as the README says; the pin on origin/main
  with `decks --cube` (D456), the drafters and `--record`; the Omega pick file's sha256.
- **The read.** Its planted self-test: a +0.10 edge for black decks in 8,000 fabricated games over arm C's real
  decks reads black OFF and no other colour OFF.
- **Arm C's decks.** 2,000 from Omega's 180 drawable cards, 40 cards and castable, k = 1, 2, 3 each near a third, no
  deck with 4+ colours of 3+ spells, the repeat cap's bound kept.
- **The pipeline.** 6 drafts in each folder (18), every deck profiled from cards the library knows and Omega lists,
  12 replay games a folder and 40 census games recorded and checked, and the read's strict JSON over them, the
  human-pick and forge-ranks readings from their own seat only.

No check is on a share, a rate or a label. Dry run: not done (the cloud reviews this file first; the engine lane is
on J143 then J144). Run outside the runner on 2026-10-20: `decks --cube` on Omega (2,000 decks at seed 1601 in ~2 s:
670 / 666 / 664 at k = 1 / 2 / 3, 36 rejected draws, the cap unbound, a card's largest share of the k = 1 decks
0.194); `profile.ts` on J134's HA-vintage folder (300 decks, 300 replay games, every card known); `balance.py` on
fabricated games over those decks and Omega's (a planted black edge read OFF in both payoff arms, strict JSON, 1.7 s).
`tools/runner.sh check`: lint clean (below).

## Commands
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J145
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J145: under 50 GB free on the data folder')"
# arm A: the drafts (draft and build only), the same deals in every folder
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 600 --seed 814500001 --games 0 --jobs {workers} --drafter "human-picks:{ForgeCoach}/public/cubes/omega-cube-180.picks.json" --drafter-seat A --out var/lab-j145/runs/hp
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 600 --seed 814500001 --games 0 --jobs {workers} --drafter forge-ranks --drafter-seat A --out var/lab-j145/runs/fr
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 2000 --seed 814500001 --games 0 --jobs {workers} --out var/lab-j145/runs/lab
```
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J145
D=/home/justin-a/code/lab/data/lab-j145
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J145: under 50 GB free on the data folder')"
# arm B: each draft's two decks against each other, twice, each on the play once
K=1
for N in lab hp fr; do
  test -s "$D/prof/$N/pairs.jsonl" || node var/lab-j145-local/bin/profile.ts --run "$D/runs/$N" --name "$N" --seed-base $((1450 + K)) --cube cubes/omega-cube-180.md --out "$D/prof/$N"
  tools/cubelab.sh census-play --decks "var/lab-j145/prof/$N" --replay "var/lab-j145/prof/$N/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j145/games/B-$N"
  K=$((K + 1))
done
```
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J145
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J145: under 50 GB free on the data folder')"
# arm C: the pool's own decks, 8 games each
test -s /home/justin-a/code/lab/data/lab-j145/census/decks/decks.json || tools/cubelab.sh decks --cube cubes/omega-cube-180.md --count 2000 --seed 1455 --out var/lab-j145/census/decks
tools/cubelab.sh census-play --decks var/lab-j145/census/decks --pairs 8000 --seed 1455 --jobs {workers} --record rows --out var/lab-j145/census/games
```
cores: 1
```bash
D=/home/justin-a/code/lab/data/lab-j145
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
test "$(wc -l < "$D/games/B-hp/games.jsonl")" -eq "$(wc -l < "$D/prof/hp/pairs.jsonl")"
test "$(wc -l < "$D/games/B-fr/games.jsonl")" -eq "$(wc -l < "$D/prof/fr/pairs.jsonl")"
test "$(wc -l < "$D/census/games/games.jsonl")" -eq 8000
test -s var/lab-j145-local/bin/balance.py
mkdir -p "$D/out"
curl -s --max-time 10 'http://127.0.0.1:8643/draft-decks?cube=omega-cube-180' > "$D/out/real-drafts.json" || echo '{"ok":false}' > "$D/out/real-drafts.json"
python3 var/lab-j145-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --pull "hp=human-picks,$D/prof/hp" --pull "fr=forge-ranks,$D/prof/fr" \
    --payoff "Blab=$D/prof/lab,$D/games/B-lab" --payoff "Bhp=$D/prof/hp,$D/games/B-hp" --payoff "Bfr=$D/prof/fr,$D/games/B-fr" \
    --census "C=$D/census/decks,$D/census/games" --real "$D/out/real-drafts.json" --coverage hp=var/lab-j145-local/coverage.json --judged-payoff Blab --boot 1000 --seed 145 --out "$D/out"
for N in lab hp fr; do cat "$D/prof/$N/decks.jsonl"; done | gzip -9 > "$D/out/drafted-decks.jsonl.gz"
for P in games/B-lab games/B-hp games/B-fr census/games; do cat "$D/$P/games.jsonl"; done | gzip -9 > "$D/out/games.jsonl.gz"
python3 - <<'PY'
import json
D = '/home/justin-a/code/lab/data/lab-j145'
doc = {'profiles': {n: json.load(open(f'{D}/prof/{n}/profile.json')) for n in ['lab', 'hp', 'fr']},
       'censusDecks': {k: v for k, v in json.load(open(f'{D}/census/decks/decks.json')).items() if k != 'rules'},
       'games': {p: json.load(open(f'{D}/{p}/census-play.json')) for p in ['games/B-lab', 'games/B-hp', 'games/B-fr', 'census/games']}}
json.dump(doc, open(f'{D}/out/counts.json', 'w'), indent=2)
PY
cp "$D/census/decks/card-shares.tsv" "$D/out/card-shares.tsv"
head -60 "$D/out/balance.md"
```
check: played >= 14300
check: engine_errors <= 0.01 * played
check: timeouts <= 0.02 * played
check: runs.drafts == 3200
check: prof.lab.decks >= 3980 and prof.hp.decks >= 1190 and prof.fr.decks >= 1190
check: prof.lab.unknown + prof.hp.unknown + prof.fr.unknown == 0
check: prof.lab.notInCube + prof.hp.notInCube + prof.fr.notInCube == 0
check: cd.count == 2000
check: rec.arms == 4
check: rec.problems + rec.rowsProblems + rec.leaks == 0
check: balstrict == 1
check: bal.verdict.code >= 0
check: bal.pull.hp.decks >= 595 and bal.pull.fr.decks >= 595 and bal.pull.lab.decks >= 3980
check: bal.payoff.Blab.games >= 3000 and bal.payoff.C.games >= 7000

What the checks mean: every draft and every planned game was played (engine errors at most 1%, timeouts at most 2%),
every deck profiled from known Omega cards, every recorded game checked clean, and the read wrote strict JSON with
a verdict (BALANCED ON PAYOFF or NOT BALANCED ON PAYOFF; -1, INCOMPLETE, fails) over at least 595 decks of each drafter and 3,000
judged games (Blab's 4,000 less draws and decks outside 1-3 colours). No check is on a share, a rate or a label.

## Abort if
abort: qwriters > 0
abort: played >= 500 and engine_errors > 0.02 * played
abort: played >= 500 and timeouts > 0.05 * played
abort: data_free_gb < 50

## Report
collect: /home/justin-a/code/lab/data/lab-j145/out/balance.md
collect: /home/justin-a/code/lab/data/lab-j145/out/balance.json
collect: /home/justin-a/code/lab/data/lab-j145/out/counts.json
collect: /home/justin-a/code/lab/data/lab-j145/out/card-shares.tsv
collect: /home/justin-a/code/lab/data/lab-j145/out/real-drafts.json
collect: /home/justin-a/code/lab/data/lab-j145/out/drafted-decks.jsonl.gz
collect: /home/justin-a/code/lab/data/lab-j145/out/games.jsonl.gz
collect: var/lab-j145-local/selftest/balance.json
collect: var/lab-j145-local/coverage.json

summary.md is the PC session's. Its FIRST LINE is the Forge-pilot caveat (`balance.md`'s first line: every game is
Forge's Default AI on both seats; J141 found search lifts every colour about equally, +8.9 points, so a Forge-only
payoff is the right first cut). Then, in this order:
- **The verdict at colour level**, by the registered rule: BALANCED ON PAYOFF or NOT BALANCED ON PAYOFF, naming any
  colour OFF on the lab-vs-lab payoff, with the UNCLEAR ones beside it. Say in so many words that pull is NOT judged
  tonight: the human-pick model was demoted to context (it covers 105 of Omega's 180 cards, unevenly by colour, and
  values the rest by its rating fallback), and pull becomes judged when the draft-deck ledger holds 30+ real Omega
  decks or a full-coverage human model exists.
- **Pull**, per drafter, never pooled, all three as context with the model's per-colour coverage beside its reading: each colour's two-colour share with its interval and label; the k counts
  (and how many decks were excluded at 0, 4 or 5 colours); mono and three-colour shares beside it; the pairs with
  intervals; triples with 40+ decks.
- **Payoff**: arm B judged (lab vs lab), arm B context (human-pick and forge-ranks drafts, each against the lab
  drafter), arm C (the pool): per colour, the rate, interval, n and label; the pairs; the A vs C reading per colour
  ("the drafter/deck-building favours or starves it", "the cards", or neither). Report, don't act.
- **Closeness**, per arm, colour and pair: the winner's final life and the turns, median and IQR.
- **Real drafts**: how many Omega decks the ledger holds and their colours; shown, not judged under 30.
- **Arm C's repeat** (`card-shares.tsv`, `counts.json`'s `censusDecks.repeatCap`): whether the cap bound, the
  largest share of the k = 1 decks, and that the within-colour repeat (a colour's mono decks are close to one list)
  is structural (D456).
- **Every other difference is a candidate** (D447 point 9). No card is swapped; the swap rule comes after this report.
- **The run**: drafts and games an hour, engine errors, timeouts, the peak worker RSS against 3 GB.

id: J135
title: Synergy balance, measure and propose: an overnight evolve of ForgeCoach's Synergy Cube v2 (8 generations x 200 drafts, best of 3, exploration on, seeds 170,000,001+) on a proper seed pool (Omega's cards on Synergy's nine themes, 601 candidates, plus the cube's own 180 rows), with a fresh 300-draft batch of the input and of the final cube read by ForgeCoach's flatness.ts; nothing ships, Justin decides whether v3 does
public_title: Synergy cube evolve for balance
public_est: ~2-4 h
public_decides: Whether Synergy v3 ships
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 1.5
repos: mtg-table@0c5de786 (current main, no code change: tools/cubelab.sh evolve as it is, D299-D300, D331, D356, D357, D377), ForgeCoach@3e3b007b (current main: the input cube public/cubes/synergy-cube-180.md, "version 2" of 2026-10-10, sha256 8cb5e5f0...806c36, unchanged since 8353790; src/cube/flatness.ts, the spread test, imported and run as it is; public/cubes/synergy-cube-180.meta.json, the shipped meta whose spreads the pilot reproduces)
decides: whether the evolved Synergy list (synergy-cube-180.v3-candidate.md) is offered to Justin as v3. The lab measures and proposes; nothing here edits a cube in either repo. Justin decides whether v3 ships
hypothesis: a handful of swaps, mostly dead cards (200 drafts a generation finds the dead; a dominant card by wins needs 400-600). The archetype spread (ForgeCoach's shipped meta: WB/WG tokens ~72-76%, UG ~29%, card true SD 8.9, archetype true SD 14.9 points) is expected NOT to narrow measurably: D377 tests a card's win rate against its own colour pairs' rate, so the loop removes card outliers within their colours and does not target the gap between archetypes (only fitBalance steers replacements toward the weak themes and colours), and at 300 drafts a batch the archetype true-SD intervals are about +-5 points wide
rule: written 2026-10-15 before any J135 draft. A swap counts only as evolve decides it (D331 discovery then confirmation on fresh seeds, D357 pooled repeats); a discovery alone never counts. The comparison is the INPUT batch (300 fresh drafts of v2, seeds 172,000,001-300) against the FINAL batch (300 fresh drafts of the final cube, seeds 173,000,001-300), same settings, no exploration. Narrowed is SHOWN only when the final interval lies wholly below the input's: for card and archetype true SD, flatness.ts's compareCubes rule (true-SD 95% intervals do not overlap); for the max-min spread of the two-colour pairs with >= 40 decisive games, the 95% parametric-bootstrap interval of (final - input) lies wholly below 0. Overlap is NOT SHOWN, never "no change"; widened is read the same way. Generation 1's discovery batch (plain drafts only) is reported for the input as a description and decides nothing. No check is on the outcome. Justin decides whether v3 ships
followup: morning-read
est: ~2-3.5 h on 7 workers (worst ~4.5 h), pilot ~10-15 min. J120 (Synergy, the same loop, 1,600 discovery drafts best of 3 on 7 workers) ran 1,693 drafts in 1 h 14 m, ~1,370 drafts an hour. Here: 1,600 discovery + 300 input + 300 final + confirmation batches (20-300 drafts each in a generation with candidates; J120 had 93 in all, but its cube cards were all read as rated 40, so more dead candidates are expected now, see Why) = ~2,300-3,500 drafts, 1.7-2.6 h; every generation confirming at 300 would be ~4,600 drafts, 3.4 h. The guide's "3-6 h for eight generations" is four workers on four cores
resumable: yes
timeout: 12h
clean: var/lab-j135 var/lab-j135-pilot var/lab-j135-tools var/cubelab/evolve/j135-synergy var/cubelab/evolve/j135-synergy-pilot
progress: evolve var/cubelab/evolve/j135-synergy generations 8
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: big = evolve var/cubelab/evolve/j135-synergy
metrics: ex = sh: if [ -f var/cubelab/evolve/j135-synergy/evolve.json ]; then node tools/cubelab/explore-health.ts var/cubelab/evolve/j135-synergy; else echo '{"explore_on":0,"generations_done":0}'; fi
metrics: base = cubelab var/lab-j135/baseline
metrics: fin = cubelab var/lab-j135/final
metrics: bm = sh: cat var/lab-j135/out/balance-metrics.json 2>/dev/null || echo '{"written":0}'
metrics: st = sh: cat var/lab-j135/strict.json 2>/dev/null || echo '{"strict":0}'
headline: bm.swaps, bm.swaps_dead, bm.swaps_dominant_win, bm.swaps_dominant_pick, bm.pair_spread_before, bm.pair_spread_after, bm.pair_spread_change_lo, bm.pair_spread_change_hi, bm.arch_true_sd_before, bm.arch_true_sd_after, bm.card_true_sd_before, bm.card_true_sd_after, big.engine_error_rate

**Why (Justin, 2026-10-15).** "Work towards a more balanced cube, start with the synergy cube... run some stuff overnight
to see if we could get more balance out of it." ForgeCoach's shipped Synergy meta (6,980 lab drafts, measured on v1) has
WB-TOK 81%, WG-TOK 73%, WB-ART 73% against UG-ETB 29%, UG-SPL 28%; ForgeCoach's `flatness.ts` puts the card true SD at
8.9 points [8.0, 10.0] and the archetype true SD at 14.9 [12.1, 19.1], both "uneven". This job asks what evolve, the
lab's only automatic cube editor, does to that cube overnight, and measures balance before and after on fresh drafts.
No new code: `tools/cubelab.sh evolve` at main 0c5de786.

**The input is v2, ForgeCoach's.** The current Synergy is ForgeCoach's `public/cubes/synergy-cube-180.md`, "version 2"
(2026-10-10: Skullclamp, Ledger Shredder and Man-o'-War out; Yawgmoth, Reanimate and Murderous Redcap in).
mtg-table's `cubes/synergy-cube-180.md` is still v1 (checked with `diff`: those six cards, the counts and the prose).
As J124 did, the job copies v2 from the pinned ForgeCoach clone into `var/lab-j135/cubes/` and the pilot checks its
sha256 and that Forge 2.0.14 has all 180 cards. No ratings file lies beside the copy, so every batch drafts on Forge's
ranks; mtg-table's `synergy-cube-180.ratings.tsv` is v1's Forge ranks unedited (J124), so nothing is lost.

**The pool is new, and the cube's own cards are in it.** J120 (Synergy's only earlier evolve) used a 37-card Final
Fantasy pool, and it left the cube's cards out of the pool. evolve reads a cube card's rating, mana value, fixing and
AI flag from the POOL (`evolveCards`: absent, it is rated 40, mana value 0, no fixing, no flag), so in J120 every cube
card was rated 40, under `deadMinRating` 60, and every card the decks passed over came back `rating-limited`, never
`dead` (J120's 40 rating-limited cards all say "rated 40"; Mayhem Devil and Winding Constrictor among them). This pool
carries the cube's 180 rows (178 with Omega's columns, Yawgmoth and Redcap from their sections; the engine's facts
replace colours, mana value, fixing, rating and AI flags for every row, `enrichPool`), plus the candidates: every card of
`cubes/omega-seed-pool.tsv` (938) with `forge_supported=yes`, not in the cube, whose `theme_tags` carry at least one of
the cube's nine theme codes (SAC TOK ETB CTR GY SPL ART LND LIFE, read from its theme table): **601 candidates**
(586 of at most two colours; 117 lands, which evolve swaps only by a note; 25 `AI:RemoveDeck:All`, never added
without a `try` but listed as human-test candidates for the weakest archetypes; 27 `Random`), 781 rows. The pool is
written by `pool.mts` (below) from the pinned files, byte-identical on every run (evolve refuses a folder whose pool
moved).

**The notes** (`var/lab-j135/notes.tsv`, written by the same script, passed with `--notes`; mtg-table has no
Synergy notes file and this one is not committed). Read conservatively from v2's "Cards to watch": **keep** what the
document calls intended, Hardened Scales and Winding Constrictor ("can snowball with Hangarback and Ballista.
Intended."). Judged by the loop, with no note: Yawgmoth ("watch it"), Grumgully ("cut Grumgully if [the loop] ever
happens", a human call the lab cannot see), Reanimate and Archon ("watch whether Archon decides games"), Mana Leak and
Remand, Chandra and Elspeth (the document invites swapping them). **cut** (never add; no cut note names a card in the
cube): Skullclamp, Ledger Shredder and Man-o'-War (v2 took them out), Sheoldred, Ragavan and The One Ring (design
principle 2 names them), and Omega's own design exclusions (`omega-notes.tsv`'s 54 cut lines, less Faithless Looting
and Archon of Cruelty, which Synergy plays: the Power, fast mana, the cheat plans and the two-card wins, against
Synergy's principles 2 and 3). 2 keep, 57 cut.

**What runs.** `evolve --generations 8 --drafts-per-gen 200 --games 3 --explore on`, the knobs at their defaults
(at most 6 swaps a generation, FDR 10%, Holm 5%, D357 pooling, D377's colour-adjusted null), the lab drafter and
builder, Default vs Default, grid. Exploration (D356) forces low-rated on-colour cards into 30% of the discovery
drafts' decks and judges them; it never cuts a card, and the win-rate rules read the other 70%. Then the before and
after batches: **300 drafts of the input** and **300 drafts of the final cube** (`cubelab.sh run`, the same settings,
no exploration), each `report`ed to a `meta.json`, and `balance.mts` (below) reads both. Generation 1's discovery
batch is the brief's "input from generation 1": reported, but it is ~140 plain drafts against the final batch's 300,
and a max-min over noisier rates is wider, so the symmetric 300/300 pair carries the reading.

**balance.mts** writes `balance.json` (strict JSON), `balance.md` and `balance-metrics.json`. For each batch: every
archetype (pair + primary theme, meta.json's) and every two-colour pair (every theme summed, as evolve's `balanceOf`),
decisive games, win rate, Wilson 95%; the pair spread (max - min over the pairs with >= 40 decisive games); and
`cubeSpread(meta)` from ForgeCoach's `src/cube/flatness.ts`, **imported from the pinned clone and run as it is**
rather than ported, so the card and archetype true SDs are the site's arithmetic exactly (the pilot proves it: on the
shipped meta it must give 8.9 and 14.9). The pair-spread change gets a parametric bootstrap (10,000 draws, seed 135,
each pair's rate normal with variance rate(1-rate)x1.25/games, the 1.25 a design effect above the lab's measured
1.08-1.24). Then every swap with its generation, status, evidence and fit, counted by status (dead, dominant-win,
dominant-pick; explore 0 by construction), and the last generation's human-test candidates.

**Seeds** (D340's lab range; the highest any job or the lab clone's evolve folders used near here is 161M, the queue
counts from 1, J124/J127/J133/J134 sit at 556M and 8xxM): discovery 170,000,001-170,001,600 (200 a generation);
confirmation 171,000,001-171,002,400 (`confirmSeedOffset`, 300 apart per generation); input batch
172,000,001-172,000,300; final batch 173,000,001-173,000,300; pilot evolve 174,000,001-012 (its confirmation
175,000,001+); pilot final batch 176,000,001-004.

**Tests (on the PC, 2026-10-15, no engine games).** `pool.mts` run twice: byte-identical pool.tsv and notes.tsv, 781
rows that evolve's own `parsePool` reads (137 lands) and 59 notes its `parseNotes` reads. `cubelab.sh check` on the v2
copy: 180 listed, 180 in Forge's DB, 8 AI:RemAIDeck, 6 RemRandomDeck. `balance.mts` run on J120's lab folders
(gen-01 as the input batch, gen-04 as the final, its evolve.json and cube): strict JSON (Python's parser with
NaN/Infinity refused), its one dominant-pick swap counted as confirmed, the tables written; `repro.mts` on the shipped
meta gives 8.9 and 14.9. `runner.sh check`: lint clean. `dry-run --max-seconds 120 --workers 2` (sandboxed, at this pin,
a ForgeCoach@3e3b007b export): the pilot's input, pool, notes and reproduction checks PASS (16 of them) and every block
starts (the input batch and the evolve draft; no "cube card(s) not in the pool" warning); block 3 stops on the evolve
output a 120 s cut cannot write, as it must. `dry-run --pilot-only --max-seconds 1500 --workers 2`: the whole pilot in
375 s with J131 running beside it, **all 36 pilot checks PASS** (12 drafts, 6 explored; no swap; 28 rating-limited on
Forge's real ranks, where J120 read 40 at a flat 40; 10 human-test candidates listed).

**What it is not.** The lab's AI is not Justin; a swap is the AI's evidence about the AI's games. Justin's notes win
over any number, and he decides whether v3 ships. Disk: 16 GB free on the PC when this was written; the run writes
about 0.2 GB (J120's folder is 61 MB), and it stops below 4 GB.

## Pilot
About 10-15 minutes, at most 3 workers: the input copy and its check, the pool and notes, the flatness reproduction,
one 12-draft evolve generation on the pool (exploration on), the next cube checked, a 4-draft batch of it, and
balance.mts on the two. Everything under `var/lab-j135-pilot/` and `var/cubelab/evolve/j135-synergy-pilot`.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J135
P=var/lab-j135-pilot
T=var/lab-j135-tools
rm -rf "$P" var/cubelab/evolve/j135-synergy-pilot
mkdir -p "$P/cubes" "$T"
node --version
cat > "$T/pool.mts" <<'J135POOL'
// SPDX-License-Identifier: GPL-3.0-or-later
// J135: the Synergy Cube v2's evolve seed pool and notes, from files at the pinned commits.  Deterministic.
//   node --no-warnings pool.mts <synergy-cube-180.md> <cubes/omega-seed-pool.tsv> <cubes/omega-notes.tsv> <outdir>
// pool.tsv  = the cube's own 180 cards (so evolve's enrichPool gives them the engine's facts: rating, mana value,
//             fixing, AI flags; a cube card missing from the pool is read as rated 40, mana value 0, no fixing --
//             which is why J120 called 40 of Synergy's cards rating-limited) + every Omega pool card that is
//             forge_supported=yes, not in the cube, and carries at least one of the cube's nine theme codes.
// notes.tsv = keep what the cube's "Cards to watch" calls intended; cut (= never add) what v2 removed, the
//             bombs design principle 2 names, and Omega's design exclusions (omega-notes.tsv's cut lines) for
//             every card not in Synergy.  Nothing in the cube is cut by a note.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { parseCube } = await import(pathToFileURL(path.resolve('tools/cubelab/cube.ts')).href);
const [cubeFile, omegaFile, omegaNotes, outDir] = process.argv.slice(2) as [string, string, string, string];
const cube = parseCube(fs.readFileSync(cubeFile, 'utf8'));
const codes = Object.keys(cube.themeNames);
if (codes.length !== 9) throw new Error(`want the cube's 9 theme codes, got ${codes.join(' ')}`);
if (cube.cards.length !== 180) throw new Error(`want 180 cube cards, got ${cube.cards.length}`);
const lines = fs.readFileSync(omegaFile, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
const head = lines.shift()!.split('\t');
const ix = (n: string) => { const i = head.indexOf(n); if (i < 0) throw new Error(`omega pool: no ${n} column`); return i; };
const [N, ID, TY, MV, TAG, SRC, SUP, AI] = ['name', 'colour_identity', 'type', 'mana_value', 'theme_tags', 'sources', 'forge_supported', 'forge_ai_flag'].map(ix) as number[];
const rows = lines.map((l) => l.split('\t'));
const inCube = new Set<string>(cube.cards.map((c: any) => c.name));
const omegaBy = new Map(rows.map((r) => [r[N]!, r]));
const cand = rows.filter((r) => !inCube.has(r[N]!) && r[SUP] === 'yes' && r[TAG]!.split(/\s+/).some((t) => codes.includes(t)))
  .sort((a, b) => (a[N]! < b[N]! ? -1 : a[N]! > b[N]! ? 1 : 0));
const SEC: Record<string, string> = { White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G' };
const out = ['name\tcolour_identity\ttype\tmana_value\ttheme_tags\tsources\tforge_supported\tforge_ai_flag\tin_synergy_v2'];
for (const c of cube.cards as any[]) {
  const o = omegaBy.get(c.name);
  const land = /land/i.test(c.section);
  out.push([c.name, o ? o[ID] : (c.pair ?? SEC[c.section] ?? ''), o ? o[TY] : (land ? 'Land' : ''), o ? o[MV] : '0',
    [...c.themes, ...c.roles].join(' '), 'synergy-v2', 'yes', o ? o[AI] : 'none', 'yes'].join('\t'));
}
for (const r of cand) out.push([r[N], r[ID], r[TY], r[MV], r[TAG], r[SRC], r[SUP], r[AI], 'no'].join('\t'));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pool.tsv'), `${out.join('\n')}\n`);

const notes: string[] = [
  '# J135 notes for the Synergy Cube v2 evolve (card<TAB>verdict<TAB>note). keep = never cut; cut = never add (none is in the cube).',
  '# Judged by the loop, no note: Yawgmoth ("watch it"), Grumgully ("cut if the loop ever happens" - a human call),',
  '# Reanimate/Archon ("watch"), Mana Leak/Remand, Chandra/Elspeth ("swap them if they feel out of place").',
  'card\tverdict\tnote',
  'Hardened Scales\tkeep\tSynergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.',
  'Winding Constrictor\tkeep\tSynergy v2, Cards to watch: Hardened Scales / Winding Constrictor can snowball with Hangarback and Ballista. Intended.',
  'Skullclamp\tcut\tSynergy v2 iteration log: out (Clamp too strong); never re-add',
  'Ledger Shredder\tcut\tSynergy v2 iteration log: out (a card on its own, not a synergy piece); never re-add',
  "Man-o'-War\tcut\tSynergy v2 iteration log: out; never re-add",
  'Sheoldred, the Apocalypse\tcut\tSynergy design principle 2 names it: no card wins on its own regardless of the board',
  'Ragavan, Nimble Pilferer\tcut\tSynergy design principle 2 names it: no card wins on its own regardless of the board',
  'The One Ring\tcut\tSynergy design principle 2 names it: no card wins on its own regardless of the board',
];
const seen = new Set(notes.filter((l) => !l.startsWith('#')).map((l) => l.split('\t')[0]));
let omegaCuts = 0;
for (const l of fs.readFileSync(omegaNotes, 'utf8').split('\n')) {
  const [c, v, note] = l.split('\t');
  if (!c || l.startsWith('#') || c === 'card' || v !== 'cut' || inCube.has(c) || seen.has(c)) continue;
  notes.push(`${c}\tcut\tOmega's design exclusion (${note ?? ''}); Synergy principles 2-3 (tight power band, no combo): never add`);
  seen.add(c); omegaCuts++;
}
fs.writeFileSync(path.join(outDir, 'notes.tsv'), `${notes.join('\n')}\n`);
const notInCube = notes.filter((l) => !l.startsWith('#') && l.split('\t')[1] === 'cut').every((l) => !inCube.has(l.split('\t')[0]!));
const keepInCube = notes.filter((l) => l.split('\t')[1] === 'keep').every((l) => inCube.has(l.split('\t')[0]!));
const facts = {
  theme_codes: codes.length, cube_cards: cube.cards.length, cube_rows_from_omega: (cube.cards as any[]).filter((c) => omegaBy.has(c.name)).length,
  candidates: cand.length, candidates_max2colours: cand.filter((r) => r[ID]!.replace(/[^WUBRG]/g, '').length <= 2).length,
  candidates_lands: cand.filter((r) => /\bLand\b/.test(r[TY]!)).length,
  candidates_ai_all: cand.filter((r) => r[AI] === 'All').length, candidates_ai_random: cand.filter((r) => r[AI] === 'Random').length,
  rows: out.length - 1, notes_keep: notes.filter((l) => l.split('\t')[1] === 'keep').length,
  notes_cut: notes.filter((l) => l.split('\t')[1] === 'cut').length, notes_cut_from_omega: omegaCuts,
  notes_cut_none_in_cube: notInCube ? 1 : 0, notes_keep_all_in_cube: keepInCube ? 1 : 0,
};
fs.writeFileSync(path.join(outDir, 'pool-facts.json'), `${JSON.stringify(facts)}\n`);
console.log(JSON.stringify(facts));
J135POOL
cat > "$T/repro.mts" <<'J135REPRO'
// J135 pilot: ForgeCoach's flatness.ts on its own shipped Synergy meta (the numbers the brief quotes: 8.9 and 14.9).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const fc = path.resolve(process.argv[2]!);
const { cubeSpread } = await import(pathToFileURL(path.join(fc, 'src/cube/flatness.ts')).href);
const s = cubeSpread(JSON.parse(fs.readFileSync(path.join(fc, 'public/cubes/synergy-cube-180.meta.json'), 'utf8')));
console.log(JSON.stringify({ card_true_sd_pts: Math.round(s.cards.trueSd * 1000) / 10, arch_true_sd_pts: Math.round(s.archetypes.trueSd * 1000) / 10, cards_n: s.cards.n, arch_n: s.archetypes.n }));
J135REPRO
cat > "$T/balance.mts" <<'J135BAL'
// SPDX-License-Identifier: GPL-3.0-or-later
// J135: Synergy's balance before and after an evolve run, from each cube's own fresh drafts.  Reads files only.
//   node --experimental-transform-types --no-warnings balance.mts --forgecoach DIR --evolve DIR --input-run DIR
//        --final-run DIR --gen1 DIR --notes TSV --candidate MD --check-txt FILE --out DIR
// Card and archetype spread: ForgeCoach's own src/cube/flatness.ts (cubeSpread), imported from the pinned
// clone and run as it is, so the numbers are the site's arithmetic exactly.  Pairs: a played deck's two
// colours, every theme summed (evolve's balanceOf), decisive games, Wilson 95%.  The pair spread is max - min
// raw win rate over the two-colour pairs with >= PAIR_MIN_GAMES decisive games in that batch; its change has a
// parametric bootstrap interval (each pair's rate ~ normal, variance rate(1-rate)*DEFF/games, B draws, seeded).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PAIR_MIN_GAMES = 40, DEFF = 1.25, B = 10000, SEED = 135, Z = 1.959964;
const PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'];
const CONFIRMED = ['dead', 'dominant-win', 'dominant-pick'];

const args = process.argv.slice(2);
const opt = (k: string): string => { const i = args.indexOf(`--${k}`); if (i < 0 || !args[i + 1]) throw new Error(`need --${k}`); return args[i + 1]!; };
const fc = path.resolve(opt('forgecoach'));
const { cubeSpread } = await import(pathToFileURL(path.join(fc, 'src/cube/flatness.ts')).href);
const { parseCube } = await import(pathToFileURL(path.resolve('tools/cubelab/cube.ts')).href);
const readJson = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8'));

function wilson(x: number, n: number): [number, number] {
  if (n <= 0) return [0, 1];
  const p = x / n, d = 1 + (Z * Z) / n, c = p + (Z * Z) / (2 * n), h = Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n));
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)];
}
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const ci4 = (c: [number, number]) => [r4(c[0]), r4(c[1])];

function spreadOut(s: any) {
  if (!s) return null;
  return { n: s.n, total: s.total, minGames: s.minGames, meanRate: r4(s.meanRate), sd: r4(s.sd), noiseSd: r4(s.noiseSd), noiseSource: s.noiseSource,
    designEffect: r4(s.designEffect), trueSd: r4(s.trueSd), trueSdCi: ci4(s.trueSdCi), verdict: s.verdict,
    outliers: s.outliers.map((o: any) => ({ name: o.name, games: o.games, shrunk: r4(o.shrunk), dev: r4(o.dev), clear: o.clear })) };
}

function batch(dir: string, label: string) {
  const meta = readJson(path.join(dir, 'meta.json'));
  const arch = (meta.archetypes as any[]).map((a) => {
    const wins = Math.round(a.winRate * a.games);
    return { id: a.id, colors: a.colors, theme: a.primaryTheme ?? null, decks: a.decks, games: a.games, wins, rate: r4(a.games ? wins / a.games : 0), wilson: ci4(wilson(wins, a.games)) };
  }).sort((x, y) => y.games - x.games || (x.id < y.id ? -1 : 1));
  const acc = new Map<string, { decks: number; games: number; wins: number }>();
  for (const a of arch) {
    const g = acc.get(a.colors) ?? { decks: 0, games: 0, wins: 0 };
    g.decks += a.decks; g.games += a.games; g.wins += a.wins; acc.set(a.colors, g);
  }
  const pairs = PAIRS.map((p) => {
    const g = acc.get(p) ?? { decks: 0, games: 0, wins: 0 };
    return { pair: p, decks: g.decks, games: g.games, wins: g.wins, rate: r4(g.games ? g.wins / g.games : 0), wilson: ci4(wilson(g.wins, g.games)), included: g.games >= PAIR_MIN_GAMES };
  });
  const inc = pairs.filter((p) => p.included);
  const hi = inc.length >= 2 ? inc.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const lo = inc.length >= 2 ? inc.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const other = [...acc.entries()].filter(([k]) => !PAIRS.includes(k)).map(([k, g]) => ({ colors: k, ...g }));
  const sp = cubeSpread(meta);
  return {
    label, dir, drafts: meta.sample.drafts, games: meta.sample.games, seedRange: meta.sample.seedRange, mean: meta.sample.shrinkage?.mean ?? null,
    pairs, otherColours: other,
    pairSpread: hi && lo ? { max: hi.pair, maxRate: hi.rate, min: lo.pair, minRate: lo.rate, spread: r4(hi.rate - lo.rate), pairsIncluded: inc.length } : null,
    flatness: { cards: spreadOut(sp.cards), archetypes: spreadOut(sp.archetypes) },
    archetypes: arch,
  };
}

// mulberry32 + Box-Muller: a seeded parametric bootstrap of (final spread - input spread).
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bootDiff(a: ReturnType<typeof batch>, b: ReturnType<typeof batch>) {
  const ia = a.pairs.filter((p) => p.included), ib = b.pairs.filter((p) => p.included);
  if (ia.length < 2 || ib.length < 2) return null;
  const u = rng(SEED);
  const norm = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const draw = (ps: typeof ia) => { let mx = -1, mn = 2; for (const p of ps) { const r = p.wins / p.games; const x = Math.min(1, Math.max(0, r + norm() * Math.sqrt((r * (1 - r) * DEFF) / p.games))); if (x > mx) mx = x; if (x < mn) mn = x; } return mx - mn; };
  const d: number[] = [];
  for (let i = 0; i < B; i++) d.push(draw(ib) - draw(ia));
  d.sort((x, y) => x - y);
  const q = (p: number) => d[Math.min(B - 1, Math.max(0, Math.floor(p * B)))]!;
  return { diff: r4(b.pairSpread!.spread - a.pairSpread!.spread), ci95: [r4(q(0.025)), r4(q(0.975))], draws: B, deff: DEFF, seed: SEED };
}

const evo = readJson(path.join(opt('evolve'), 'evolve.json'));
const swaps = (evo.generations as any[]).flatMap((g) => (g.swaps as any[]).map((s) => ({
  gen: g.gen, out: s.out, outSection: s.outSection, in: s.in, inSection: s.inSection, why: s.why, evidence: s.evidence, fit: s.fit,
  confirmed: CONFIRMED.includes(s.why) && /confirmed on fresh seeds/.test(s.evidence ?? ''),
})));
const byStatus: Record<string, number> = { dead: 0, 'dominant-win': 0, 'dominant-pick': 0, explore: 0, other: 0 };
for (const s of swaps) byStatus[CONFIRMED.includes(s.why) ? s.why : 'other']! += 1;

const notes = fs.readFileSync(opt('notes'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
const keep = notes.filter((f) => f[1] === 'keep').map((f) => f[0]!.trim());
const candText = fs.readFileSync(opt('candidate'), 'utf8');
const cand = parseCube(candText);
const candNames = new Set(cand.cards.map((c: any) => c.name));
const chk = fs.readFileSync(opt('check-txt'), 'utf8');
const num = (re: RegExp) => Number((re.exec(chk) ?? [])[1] ?? -1);

// The last decided generation's human-test candidates and verdict.
const gens = fs.readdirSync(opt('evolve')).filter((g) => /^gen-\d+$/.test(g)).sort();
const lastStats = gens.map((g) => path.join(opt('evolve'), g, 'stats.json')).filter((f) => fs.existsSync(f)).pop();
const last = lastStats ? readJson(lastStats) : null;

const input = batch(opt('input-run'), 'input cube (Synergy v2): baseline batch, fresh seeds, no exploration');
const final = batch(opt('final-run'), 'final cube (the v3 candidate): final batch, fresh seeds, no exploration');
const gen1 = batch(opt('gen1'), 'input cube: evolve generation 1 discovery batch (plain drafts only; exploration on)');
const boot = bootDiff(input, final);
const shownBelow = (a: any, b: any) => (a && b ? (b.trueSdCi[1] < a.trueSdCi[0] ? 1 : 0) : 0);
const shownAbove = (a: any, b: any) => (a && b ? (b.trueSdCi[0] > a.trueSdCi[1] ? 1 : 0) : 0);
const fa = input.flatness, ff = final.flatness;
const reading = {
  rule: 'written before the run (J135): narrowed is SHOWN only when the final batch\'s interval lies wholly below the input batch\'s (flatness.ts compareCubes for card and archetype true SD; the bootstrap 95% interval of the pair-spread change wholly below 0). Overlap is NOT SHOWN, never "no change". Widened is read the same way. No verdict ships anything: Justin decides whether v3 ships.',
  card_trueSd_narrowed_shown: shownBelow(fa.cards, ff.cards), card_trueSd_widened_shown: shownAbove(fa.cards, ff.cards),
  archetype_trueSd_narrowed_shown: shownBelow(fa.archetypes, ff.archetypes), archetype_trueSd_widened_shown: shownAbove(fa.archetypes, ff.archetypes),
  pair_spread_narrowed_shown: boot && boot.ci95[1] < 0 ? 1 : 0, pair_spread_widened_shown: boot && boot.ci95[0] > 0 ? 1 : 0,
};
const doc = {
  schema: 'j135-balance-1', job: 'J135',
  inputs: { evolve: opt('evolve'), forgecoach: fc, notes: opt('notes'), candidate: opt('candidate') },
  headline: {
    swaps: swaps.length, swaps_confirmed: swaps.filter((s) => s.confirmed).length,
    pair_spread_before: input.pairSpread?.spread ?? null, pair_spread_after: final.pairSpread?.spread ?? null, pair_spread_change: boot,
    archetype_trueSd_before: fa.archetypes?.trueSd ?? null, archetype_trueSd_before_ci: fa.archetypes?.trueSdCi ?? null,
    archetype_trueSd_after: ff.archetypes?.trueSd ?? null, archetype_trueSd_after_ci: ff.archetypes?.trueSdCi ?? null,
    card_trueSd_before: fa.cards?.trueSd ?? null, card_trueSd_before_ci: fa.cards?.trueSdCi ?? null,
    card_trueSd_after: ff.cards?.trueSd ?? null, card_trueSd_after_ci: ff.cards?.trueSdCi ?? null,
  },
  reading,
  swaps: { total: swaps.length, byStatus, exploreNote: 'exploration (D356) never cuts a card: its count is 0 by construction', list: swaps },
  checks: {
    candidate_cards: cand.cards.length, candidate_listed: num(/^cards listed\s+(\d+)/m), candidate_in_db: num(/^in Forge.s DB\s+(\d+)/m),
    keep: keep.map((k) => ({ card: k, present: candNames.has(k) })), unconfirmed_swaps: swaps.filter((s) => !s.confirmed).length,
  },
  humanTest: last?.decision?.humanTest ?? [], lastVerdict: last?.decision?.verdict ?? null,
  input, final, inputGen1: gen1,
  method: { pairMinGames: PAIR_MIN_GAMES, bootstrap: { draws: B, deff: DEFF, seed: SEED, model: 'per pair rate ~ N(rate, rate(1-rate)*deff/games), clipped to [0,1]' }, wilsonZ: Z, flatness: 'ForgeCoach src/cube/flatness.ts cubeSpread(meta), defaults (cards >= 10 games, archetypes >= 5)' },
};
const strict = (_k: string, v: unknown) => { if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite number at ${_k}`); return v; };
const out = opt('out');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'balance.json'), `${JSON.stringify(doc, strict, 1)}\n`);

const pct = (x: number | null | undefined) => (x === null || x === undefined ? 'n/a' : (x * 100).toFixed(1));
const md: string[] = ['# J135: Synergy balance before and after the evolve run', '',
  `Input batch: ${input.drafts} drafts, ${input.games} decisive games (seeds ${input.seedRange?.join('-')}). Final batch: ${final.drafts} drafts, ${final.games} decisive games (seeds ${final.seedRange?.join('-')}).`, '',
  `Swaps: ${swaps.length} (dead ${byStatus.dead}, dominant-win ${byStatus['dominant-win']}, dominant-pick ${byStatus['dominant-pick']}, explore 0, other ${byStatus.other}).`, '',
  '| measure | input | final | reading |', '|---|---|---|---|',
  `| pair spread (max - min, pairs with >= ${PAIR_MIN_GAMES} games) | ${pct(input.pairSpread?.spread)} (${input.pairSpread?.max} - ${input.pairSpread?.min}) | ${pct(final.pairSpread?.spread)} (${final.pairSpread?.max} - ${final.pairSpread?.min}) | change ${pct(boot?.diff)}, 95% ${pct(boot?.ci95[0])} to ${pct(boot?.ci95[1])}: ${reading.pair_spread_narrowed_shown ? 'narrowed (shown)' : reading.pair_spread_widened_shown ? 'widened (shown)' : 'not shown'} |`,
  `| archetype true SD (flatness.ts) | ${pct(fa.archetypes?.trueSd)} [${pct(fa.archetypes?.trueSdCi[0])}, ${pct(fa.archetypes?.trueSdCi[1])}] | ${pct(ff.archetypes?.trueSd)} [${pct(ff.archetypes?.trueSdCi[0])}, ${pct(ff.archetypes?.trueSdCi[1])}] | ${reading.archetype_trueSd_narrowed_shown ? 'narrowed (shown)' : reading.archetype_trueSd_widened_shown ? 'widened (shown)' : 'not shown'} |`,
  `| card true SD (flatness.ts) | ${pct(fa.cards?.trueSd)} [${pct(fa.cards?.trueSdCi[0])}, ${pct(fa.cards?.trueSdCi[1])}] | ${pct(ff.cards?.trueSd)} [${pct(ff.cards?.trueSdCi[0])}, ${pct(ff.cards?.trueSdCi[1])}] | ${reading.card_trueSd_narrowed_shown ? 'narrowed (shown)' : reading.card_trueSd_widened_shown ? 'widened (shown)' : 'not shown'} |`,
  '', '## Colour pairs (decisive games, Wilson 95%)', '', '| pair | input games | input rate | final games | final rate |', '|---|---|---|---|---|',
  ...PAIRS.map((p) => { const a = input.pairs.find((x) => x.pair === p)!, b = final.pairs.find((x) => x.pair === p)!; return `| ${p} | ${a.games} | ${pct(a.rate)} [${pct(a.wilson[0])}, ${pct(a.wilson[1])}] | ${b.games} | ${pct(b.rate)} [${pct(b.wilson[0])}, ${pct(b.wilson[1])}] |`; }),
  '', '## Archetypes with 20+ games in either batch', '', '| archetype | input games | input rate | final games | final rate |', '|---|---|---|---|---|',
  ...[...new Set([...input.archetypes, ...final.archetypes].filter((a) => a.games >= 20).map((a) => a.id))].sort().map((id) => {
    const a = input.archetypes.find((x) => x.id === id), b = final.archetypes.find((x) => x.id === id);
    const f = (x: any) => (x ? `${x.games} | ${pct(x.rate)} [${pct(x.wilson[0])}, ${pct(x.wilson[1])}]` : '0 | -');
    return `| ${id} | ${f(a)} | ${f(b)} |`;
  }),
  '', '## Swaps', '', ...(swaps.length ? swaps.map((s) => `- gen ${s.gen}: **${s.out}** out, **${s.in}** in (${s.why}${s.confirmed ? ', confirmed' : ', NOT CONFIRMED'}): ${s.evidence}. Fit: ${s.fit}`) : ['- none']),
  '', 'Justin decides whether v3 ships.', ''];
fs.writeFileSync(path.join(out, 'balance.md'), md.join('\n'));

const flat = {
  written: 1, swaps: swaps.length, swaps_dead: byStatus.dead, swaps_dominant_win: byStatus['dominant-win'], swaps_dominant_pick: byStatus['dominant-pick'], swaps_explore: 0, swaps_other: byStatus.other,
  unconfirmed_swaps: doc.checks.unconfirmed_swaps, keep_cards: keep.length, keep_missing: keep.filter((k) => !candNames.has(k)).length,
  candidate_cards: cand.cards.length, candidate_listed: doc.checks.candidate_listed, candidate_in_db: doc.checks.candidate_in_db,
  input_drafts: input.drafts, final_drafts: final.drafts, gen1_drafts: gen1.drafts, input_games: input.games, final_games: final.games,
  pair_spread_before: input.pairSpread?.spread ?? -1, pair_spread_after: final.pairSpread?.spread ?? -1, pair_spread_change: boot?.diff ?? -9,
  pair_spread_change_lo: boot?.ci95[0] ?? -9, pair_spread_change_hi: boot?.ci95[1] ?? -9,
  arch_true_sd_before: fa.archetypes?.trueSd ?? -1, arch_true_sd_after: ff.archetypes?.trueSd ?? -1,
  card_true_sd_before: fa.cards?.trueSd ?? -1, card_true_sd_after: ff.cards?.trueSd ?? -1,
  ...reading, rule: undefined,
};
delete (flat as any).rule;
fs.writeFileSync(path.join(out, 'balance-metrics.json'), `${JSON.stringify(flat, strict)}\n`);
console.log(JSON.stringify(flat));
J135BAL
cp {ForgeCoach}/public/cubes/synergy-cube-180.md "$P/cubes/synergy-cube-180.md"
head -1 "$P/cubes/synergy-cube-180.md"
tools/cubelab.sh check "$P/cubes/synergy-cube-180.md" > "$P/input-check.txt"
node -e 'const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const c=fs.readFileSync(process.argv[2]);const n=(r)=>Number((r.exec(t)??[])[1]??-1);console.log(JSON.stringify({listed:n(/^cards listed\s+(\d+)/m),in_db:n(/^in Forge.s DB\s+(\d+)/m),missing:[...t.matchAll(/^ {2}MISSING\s/gm)].length,v2:/version 2/.test(c.toString().split("\n")[0])?1:0,sha_ok:require("crypto").createHash("sha256").update(c).digest("hex")==="8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36"?1:0}))' "$P/input-check.txt" "$P/cubes/synergy-cube-180.md" | tee "$P/input-check.json"
node --no-warnings "$T/pool.mts" "$P/cubes/synergy-cube-180.md" cubes/omega-seed-pool.tsv cubes/omega-notes.tsv "$P"
node --experimental-transform-types --no-warnings "$T/repro.mts" {ForgeCoach} | tee "$P/repro.json"
tools/cubelab.sh evolve "$P/cubes/synergy-cube-180.md" --pool "$P/pool.tsv" --notes "$P/notes.tsv" \
  --generations 1 --drafts-per-gen 12 --games 3 --jobs {workers} --seed 174000001 \
  --out var/cubelab/evolve/j135-synergy-pilot --explore on
E=var/cubelab/evolve/j135-synergy-pilot
node tools/cubelab/explore-health.ts "$E" | tee "$P/health.json"
cp "$E/synergy-cube-180.md" "$P/synergy-cube-180.next.md"
tools/cubelab.sh check "$P/synergy-cube-180.next.md" > "$P/next-check.txt"
node -e 'const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const n=(r)=>Number((r.exec(t)??[])[1]??-1);const e=process.argv[2];console.log(JSON.stringify({listed:n(/^cards listed\s+(\d+)/m),in_db:n(/^in Forge.s DB\s+(\d+)/m),missing:[...t.matchAll(/^ {2}MISSING\s/gm)].length,changelog:fs.existsSync(e+"/changelog.md")&&fs.statSync(e+"/changelog.md").size>0?1:0,gen_cube:fs.existsSync(e+"/gen-01/cube.md")?1:0,next_cube:fs.existsSync(e+"/synergy-cube-180.md")?1:0}))' "$P/next-check.txt" "$E" | tee "$P/next-check.json"
tools/cubelab.sh run "$P/synergy-cube-180.next.md" --drafts 4 --games 3 --jobs {workers} --seed 176000001 --out "$P/final"
tools/cubelab.sh report "$P/final"
node --experimental-transform-types --no-warnings "$T/balance.mts" --forgecoach {ForgeCoach} --evolve "$E" \
  --input-run "$E/gen-01/run" --final-run "$P/final" --gen1 "$E/gen-01/run" --notes "$P/notes.tsv" \
  --candidate "$P/synergy-cube-180.next.md" --check-txt "$P/next-check.txt" --out "$P/out"
python3 -c 'import json,sys; json.load(open(sys.argv[1]), parse_constant=lambda c: sys.exit("not strict JSON: "+c)); print(json.dumps({"strict":1}))' "$P/out/balance.json" | tee "$P/strict.json"
```
metrics: pdisk = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: pin = sh: cat var/lab-j135-pilot/input-check.json 2>/dev/null || echo '{"listed":0}'
metrics: pf = sh: cat var/lab-j135-pilot/pool-facts.json 2>/dev/null || echo '{"rows":0}'
metrics: rp = sh: cat var/lab-j135-pilot/repro.json 2>/dev/null || echo '{"card_true_sd_pts":0}'
metrics: pe = evolve var/cubelab/evolve/j135-synergy-pilot
metrics: pex = sh: cat var/lab-j135-pilot/health.json 2>/dev/null || echo '{"explore_on":0}'
metrics: pn = sh: cat var/lab-j135-pilot/next-check.json 2>/dev/null || echo '{"listed":0}'
metrics: pfin = cubelab var/lab-j135-pilot/final
metrics: pb = sh: cat var/lab-j135-pilot/out/balance-metrics.json 2>/dev/null || echo '{"written":0}'
metrics: pst = sh: cat var/lab-j135-pilot/strict.json 2>/dev/null || echo '{"strict":0}'
check: pdisk >= 6
check: pin.listed == 180
check: pin.in_db == 180
check: pin.missing == 0
check: pin.v2 == 1
check: pin.sha_ok == 1
check: pf.theme_codes == 9
check: pf.cube_cards == 180
check: pf.candidates == 601
check: pf.rows == 781
check: pf.notes_keep == 2
check: pf.notes_cut == 57
check: pf.notes_cut_none_in_cube == 1
check: pf.notes_keep_all_in_cube == 1
check: rp.card_true_sd_pts == 8.9
check: rp.arch_true_sd_pts == 14.9
check: pe.generations_done == 1
check: pe.drafts == 12
check: pe.engine_errors == 0
check: pex.explore_on == 1
check: pex.explored_drafts + pex.plain_drafts == 12
check: pn.changelog == 1
check: pn.gen_cube == 1
check: pn.next_cube == 1
check: pn.listed == 180
check: pn.in_db == 180
check: pn.missing == 0
check: pfin.drafts == 4
check: pfin.engine_errors == 0
check: pb.written == 1
check: pb.candidate_cards == 180
check: pb.keep_missing == 0
check: pb.unconfirmed_swaps == 0
check: pb.final_drafts == 4
check: pb.gen1_drafts == pex.plain_drafts
check: pst.strict == 1

What the pilot checks: the input is v2 byte for byte and Forge has all of it; the pool and notes are the ones described
above; flatness.ts, imported, reproduces the shipped meta's 8.9 and 14.9; one evolve generation runs on the pool with
exploration, writes a changelog and a next cube, and the next cube still parses with 180 cards Forge has; a run of the
next cube is reported; balance.mts reads them all and writes strict JSON. At 12 drafts a generation nothing is
expected to be cut (BH over ~280 tests); if a swap happens it must be a confirmed one.

## Commands
Block 1: the input copy, the pool and notes (byte-identical to the pilot's), and the INPUT batch, 300 drafts of v2.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J135
T=var/lab-j135-tools
W=var/lab-j135
test -f "$T/pool.mts" && test -f "$T/balance.mts"
mkdir -p "$W/cubes" "$W/out"
cp {ForgeCoach}/public/cubes/synergy-cube-180.md "$W/cubes/synergy-cube-180.md"
echo "8cb5e5f0827a3fc2563a3d15950aad237816b654f9a1baa400ebb2ba9c806c36  $W/cubes/synergy-cube-180.md" | sha256sum -c
node --no-warnings "$T/pool.mts" "$W/cubes/synergy-cube-180.md" cubes/omega-seed-pool.tsv cubes/omega-notes.tsv "$W"
cmp "$W/pool.tsv" var/lab-j135-pilot/pool.tsv
cmp "$W/notes.tsv" var/lab-j135-pilot/notes.tsv
tools/cubelab.sh run "$W/cubes/synergy-cube-180.md" --drafts 300 --games 3 --jobs {workers} --seed 172000001 --out "$W/baseline"
tools/cubelab.sh report "$W/baseline"
```
Block 2: the evolve run. Resumable: run the same line again after a stop (finished generations are skipped, a
started one resumes its drafts).
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J135
W=var/lab-j135
tools/cubelab.sh evolve "$W/cubes/synergy-cube-180.md" --pool "$W/pool.tsv" --notes "$W/notes.tsv" \
  --generations 8 --drafts-per-gen 200 --games 3 --jobs {workers} --seed 170000001 \
  --out var/cubelab/evolve/j135-synergy --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/j135-synergy | tee "$W/health.json"
```
Block 3: the candidate, checked, and the FINAL batch, 300 drafts of it.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J135
W=var/lab-j135
E=var/cubelab/evolve/j135-synergy
cp "$E/synergy-cube-180.md" "$W/out/synergy-cube-180.v3-candidate.md"
tools/cubelab.sh check "$W/out/synergy-cube-180.v3-candidate.md" > "$W/out/candidate-check.txt"
tools/cubelab.sh run "$W/out/synergy-cube-180.v3-candidate.md" --drafts 300 --games 3 --jobs {workers} --seed 173000001 --out "$W/final"
tools/cubelab.sh report "$W/final"
```
Block 4: the reading, and the files the summary needs, renamed so no two collected files share a name.
cores: 1
```bash
W=var/lab-j135
E=var/cubelab/evolve/j135-synergy
node --experimental-transform-types --no-warnings var/lab-j135-tools/balance.mts --forgecoach {ForgeCoach} --evolve "$E" \
  --input-run "$W/baseline" --final-run "$W/final" --gen1 "$E/gen-01/run" --notes "$W/notes.tsv" \
  --candidate "$W/out/synergy-cube-180.v3-candidate.md" --check-txt "$W/out/candidate-check.txt" --out "$W/out"
python3 -c 'import json,sys; json.load(open(sys.argv[1]), parse_constant=lambda c: sys.exit("not strict JSON: "+c)); print(json.dumps({"strict":1}))' "$W/out/balance.json" | tee "$W/strict.json"
cp "$E/changelog.md" "$W/out/changelog.md"
cp "$E/evolve.json" "$W/out/evolve.json"
cp "$W/health.json" "$W/out/explore-health.json"
cp "$W/pool-facts.json" "$W/notes.tsv" "$W/out/"
for g in "$E"/gen-*; do n=$(basename "$g"); cp "$g/result.json" "$W/out/$n-result.json"; cp "$g/stats.json" "$W/out/$n-stats.json"; done
ls -la "$W/out"
```
check: big.generations_done == 8
check: big.drafts == 1600
check: big.engine_error_rate <= 1%
check: ex.explore_on == 1
check: ex.generations_done == 8
check: ex.explored_drafts + ex.plain_drafts == 1600
check: ex.share_z between -4 and 4
check: ex.explored_engine_error_rate <= ex.plain_engine_error_rate + 1%
check: base.drafts == 300
check: base.engine_error_rate <= 1%
check: fin.drafts == 300
check: fin.engine_error_rate <= 1%
check: bm.written == 1
check: bm.input_drafts == 300
check: bm.final_drafts == 300
check: bm.candidate_cards == 180
check: bm.candidate_listed == 180
check: bm.candidate_in_db == 180
check: bm.keep_missing == 0
check: bm.unconfirmed_swaps == 0
check: bm.swaps == bm.swaps_dead + bm.swaps_dominant_win + bm.swaps_dominant_pick
check: st.strict == 1

What the checks mean: the run finished at its size with the engine healthy and exploration at its share; both
batches are complete; the candidate is 180 cards Forge has; the intended cards are still in; every swap is a
confirmed dead or dominant card (a note-cut, a discovery alone or anything else fails `unconfirmed_swaps`); the
reading is strict JSON. **No check is on the outcome**: zero swaps, or a spread that did not narrow, is a result.

## Abort if
abort: disk_gb < 4
abort: big.drafts >= 200 and big.engine_error_rate > 1%
abort: ex.explored_drafts >= 100 and ex.explored_engine_error_rate > ex.plain_engine_error_rate + 2%
abort: base.drafts >= 100 and base.engine_error_rate > 2%
abort: fin.drafts >= 100 and fin.engine_error_rate > 2%
- Any generation's decision.discovery.deff over 2.0, or decision.discovery.candidates over 30 (for a person reading
  the progress, as J120).

## Report
collect: var/lab-j135/out/balance.json
collect: var/lab-j135/out/balance.md
collect: var/lab-j135/out/balance-metrics.json
collect: var/lab-j135/out/synergy-cube-180.v3-candidate.md
collect: var/lab-j135/out/candidate-check.txt
collect: var/lab-j135/out/changelog.md
collect: var/lab-j135/out/evolve.json
collect: var/lab-j135/out/explore-health.json
collect: var/lab-j135/out/pool-facts.json
collect: var/lab-j135/out/notes.tsv
collect: var/lab-j135/out/gen-*-result.json
collect: var/lab-j135/out/gen-*-stats.json
collect: var/lab-j135-pilot/pool-facts.json
collect: var/lab-j135-pilot/repro.json

summary.md (the PC session), from balance.json, balance.md, changelog.md and the per-generation files:
- **Headline:** the number of swaps (by status: dead, dominant-win, dominant-pick; explore 0), and the spread before
  and after: the pair spread (max - min, which pairs) with the change's 95% interval, the archetype and card true SD
  with their intervals, each with its pre-registered reading (narrowed shown / widened shown / not shown). Never read
  an overlap as "no change".
- **The swap list:** per swap, its generation, the card out and the card in, its status and both evidence lines
  (discovery with p and q, confirmation with Holm p and seeds), and the fit line. Name any swap that touches a card
  the document's "Cards to watch" discusses (Yawgmoth, Grumgully, Reanimate, Archon, Mana Leak, Remand, Chandra,
  Elspeth). If there are none: say so, and how many leads the changelog calls insufficient data.
- **The archetype table before and after** (balance.md's, the input batch against the final batch), and the ten pairs
  with their Wilson intervals; whether WB/WG tokens and UG moved, read only through the intervals. Generation 1's
  batch beside it as a description.
- **The pooled exploration table** (holds its own / weak when played / undecided / too few) as the changelog writes it,
  no direction read into undecided rows; and the human-test candidates for the weakest archetypes, from balance.json.
- Every check beside its value; totals (discovery, confirmation, input and final drafts; wall time; engine errors and
  timeouts).
- End with: **Justin decides whether v3 ships** (the candidate is `results/J135/synergy-cube-180.v3-candidate.md`; its
  title carries evolve's version count, which is not a release number).

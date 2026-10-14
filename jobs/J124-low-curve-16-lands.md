id: J124
title: B2 follow-up, 16 or 17 lands where ForgeCoach's deck assistant picks 16: fresh lab drafts of Vintage 180, Evan's cube and Synergy (1,400 each, seeds 813,000,001+), only the seats whose ForgeCoach build plays 16 lands (about 2,000 pools), that deck against the same deck on 17 lands, each against the other seat's lab deck; paired by pool, clustered by draft; Forge Default on every pool (4 games a deck), search-v2 on the first 300 pools (2 games a deck) as the sign check
public_title: Deck builder: 16 or 17 lands where it picks 16
public_est: ~3-4 h
public_decides: ForgeCoach deck builder: its 16-land rule
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@37c6ae6 (current main, #139: the cube lab's --games 0 drafts, ai-bench play's pairs files with focusDeck/focusWon and resume (D337), the lab seeds' VERIFY range (D340); no code change for this job, its tool is the inline variants.mts below), ForgeCoach@3972058 (current main: src/cube/builder.ts unchanged since J121's 866c256; the shipped vintage-, evybaby- and synergy-cube-*.meta.json, the vintage and synergy .human.json, Synergy v2's public/cubes/synergy-cube-180.md and src/cube/testdata/scryfall-*.json)
decides: whether ForgeCoach's deck assistant keeps playing 16 lands where it now picks 16 (its low-curve rule) or plays 17 there
hypothesis: J121's secondary read (its fc16_vs_17: 760 pools where the builder picked 16, mostly Vintage) was -3.9 points for 16, 95% [-7.5, -0.3], 99% [-8.7, +0.9], search-v2 -5.2 on 124 pools; that read was chosen after the fact among several, so the true effect is likely smaller, 1-3 points
rule: written 2026-10-14 before any J124 draft or game. Unit: a focus pool = one seat of one lab draft whose ForgeCoach build (buildDecks(ctx, pool)[0] at ForgeCoach@3972058) plays 16 lands; l16 = that deck, l17 = the same colours and splash on 17 lands (J121's stepLands: the land in cuts the spell whose loss leaves the builder's best score). Both play the OTHER seat's lab deck. A game scores 1/0, a draw or timeout 1/2, an engine error is left out; per pool l16's mean score minus l17's, averaged within the draft (its seats), then over drafts; normal 95% and 99% intervals. ONE contrast. SHOWN if the Forge Default arm's 99% interval on (16 - 17) over every kept pool lies entirely below 0 AND search-v2's point estimate on its subsample is below 0 too; then the cloud changes ForgeCoach's low-curve rule to 17. Otherwise NOT SHOWN, and the rule stays (16 shown better is also NOT SHOWN: the rule stays). Per cube and per source (lowcurve = the low-curve rule chose 16, meta = the meta's land table did) are descriptions and decide nothing. An interval that includes 0 is not shown, never no effect
followup: morning-read
est: ~3.5-4 h on 7 workers, pilot included. Pilot ~10-15 min. Drafts ~20 min (4,200 grid drafts, --games 0; J121 drafted 1,600 and built its variants in 8 min). Variants ~5 min (buildDecks on 8,400 pools, 17 s per 600 here). Forge arm ~17,500 games (~2,180 pools x 2 decks x 4): J121's Forge arm ran 32,444 games in 2 h 36 m (0.29 s a game wall-clock on 7 workers, 1.95 s mean), so ~1.4 h; the pilot's 7 s ceiling would be ~5 h. Search arm 1,200 games (300 pools x 2 decks x 2): J121's ran 2,948 in 4.0 h (4.9 s a game wall-clock, 33 s mean), so ~1.6 h; the pilot's 75 s ceiling ~3.6 h. Read ~1 min
resumable: yes
timeout: 10h
progress: aibench var/ai-bench/j124-forge var/ai-bench/j124-search of 18600
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: stopfile = files var/lab-j124/ABORT
metrics: dv = cubelab var/lab-j124/drafts-vintage
metrics: de = cubelab var/lab-j124/drafts-evybaby
metrics: ds = cubelab var/lab-j124/drafts-synergy
metrics: vf = sh: cat var/lab-j124/variants/variants.json 2>/dev/null || echo '{"written":0}'
metrics: f = aibench var/ai-bench/j124-forge
metrics: s = aibench var/ai-bench/j124-search
metrics: jr = sh: cat var/lab-j124/out/metrics.json 2>/dev/null || echo '{"written":0}'
headline: jr.shown, jr.f_est, jr.f_lo99, jr.f_hi99, jr.f_lo95, jr.f_hi95, jr.s_est, jr.f_pools, jr.f_source_lowcurve_est, jr.f_source_meta_est

**Why (Justin's next jobs, 2026-10-14, item 1).** J121 (B2) measured ForgeCoach's deck assistant (`src/cube/builder.ts`)
on 3,188 lab pools. Its pre-registered land contrast (16 minus 17 over every pool) was not shown, but a secondary read
was: where the builder itself chose 16 lands (760 pools), the same deck on 17 did 3.9 points better, 95% [-7.5, -0.3],
not shown at the 99% J121 used. J121's summary named this the natural narrow follow-up. This job asks only that
question, on fresh pools, with the rule written first.

**Where the builder's 16 comes from (measured while writing this job, not a J124 number).** `buildOne` plays 24 spells
and 16 lands in two cases: (1) **the meta's land table** (`metaLandCount`: the archetype's or the overall 16 vs 17 win
rate in the shipped `*.meta.json`, shrunk by 20 games, at least 2 points apart) says 16; (2) **the low-curve rule**:
no meta answer, and the best 23 spells average mana value 2.4 or less. All three shipped metas carry a land table.
Run on 300 earlier lab drafts of each cube (J121's Vintage and Evan's folders, the queue's Synergy v1 folder) at
ForgeCoach@3972058, the builder chose 16 in 46.5% of Vintage pools (88% of them from the meta's table: Vintage's
overall row prefers 16, 51.7% vs 49.3%), 28% of Synergy pools (79% from the low-curve rule) and 3.3% of Evan's (6 of 20
from the low-curve rule). So J121's 760 pools were mostly Vintage's meta-table 16s, and the brief's "low-curve rule"
covers about 35-40% of the pools this job will keep. **The rule is the brief's: over every pool where the builder
picks 16, whatever the reason.** Each kept pool records its source (`src`, recomputed with `buildOne`'s own inputs),
and the read reports both sources separately as descriptions, so the cloud can see which path the evidence is about
before it changes code. If the cloud wants the rule on the low-curve pools alone, it amends this file before the
job starts (the runner reads the file when it takes the job).

**What is played.**
- **Pools.** 1,400 lab drafts each of Vintage 180 (`cubes/vintage-cube-180.md` and its ratings), Evan's cube
  (`cubes/evybaby-cube-360.md`, Forge's ranks) and the Synergy Cube: grid, the lab drafter, Default vs Default,
  `--games 0` (each seat's pool and the lab's deck, no game), seeds 813,000,001-813,001,400 in each cube (D340's VERIFY
  range; no job has used 813M), pilot 813,900,001-813,900,006. **Synergy is ForgeCoach's v2 document** (what the site
  drafts and the deck assistant reads: Yawgmoth, Reanimate and Murderous Redcap in place of v1's Ledger Shredder,
  Man-o'-War and Skullclamp), copied from the pinned ForgeCoach clone into `var/lab-j124/cubes/` and drafted on
  Forge's ranks (no ratings file beside it). mtg-table's `cubes/synergy-cube-180.md` is still v1, whose ratings file
  is Forge's ranks unedited, so the lab drafter values the 177 shared cards the same way either way. The pilot runs
  `cubelab.sh check` on the copy: all 180 in Forge 2.0.14's DB.
- **Decks per kept pool** (`variants.mts build`): `l16` = ForgeCoach's first suggestion when it plays 16 lands (the
  shipped meta, the Scryfall snapshot and the 17Lands numbers where shipped: what the site shows); `l17` = the same
  colours and splash on 17 lands, J121's `stepLands` unchanged. Pools where the builder picks 17 or 18 are counted and
  dropped. Thin builds never play 16.
- **Opponent.** The other seat's lab deck, one fixed deck per pool for both decks.
- **Forge arm (carries the rule).** Every kept pool, each deck 4 games against the opponent (`ai-bench.sh play --games
  4 --no-mirror`: two in each seat, four deals), Forge Default vs Forge Default. J121 played 2 a deck; 4 halves the
  deal noise in each pool's difference for ~40 minutes more, which buys more precision than 2,000 more pools would
  at the same cost in games, and keeps the brief's ~2,000 pools.
- **search-v2 arm (the sign check).** `Default+outlets+search:anytime=1` (D412, as J121) on the first 300 kept pools
  in draft order, cubes interleaved, whole drafts only: each deck 2 games (one per seat).

**Precision (planning numbers).** J121's fc16_vs_17 read had SE 1.85 points over 760 pools in 607 drafts at 2 games a
deck. Here ~2,100 pools in ~1,500 drafts at 4 games a deck: SE about 0.9-1.0 points, a 99% half-width of about
2.3-2.6. A true -3.9 is shown about 95% of the time, -3 about 70%, -2 about 35%. The search subsample (~300 pools,
~220 drafts) has SE about 3 points and gets the sign right about 85% of the time for a true -3.

**What it is not.** The pools are the lab drafter's, not people's, and both pilots are AIs. It does not test 18 lands,
the splash or the builders (J121 did). It does not touch the meta's land tables: the cloud decides what a SHOWN result
means for that path, from the per-source rows.

**Tests (on the PC, 2026-10-14; no cloud run).** `variants.mts` is J121's (loadFC, stepLands, dck, tally and the
clustered contrast unchanged) narrowed to l16/l17, plus `sourceOf` and a `selftest` of the read's arithmetic and the
rule (11 cases, run first in the pilot). Its `build` was run on 60 earlier drafts of each cube at ForgeCoach@3972058:
97 pools of 16 kept, every one with a legal 17-land twin, every deck 40 cards, no source `other`. `runner.sh check`:
lint clean; the rule's check line was evaluated on made-up metrics (passes for SHOWN and NOT SHOWN when `shown` is
the rule, fails when it is not). `dry-run --pilot-only --max-seconds 1500 --workers 2` (sandboxed, at this pin, a
ForgeCoach@3972058 export): the whole pilot in 316 s, **every pilot check PASS** (18 drafts, 7 pools of 16 kept: 4
Vintage, 2 Synergy, 1 Evan's; 5 meta, 2 low-curve; 56 Forge games at 3.6 s mean, 0 errors; 8 search-v2 games at
29 s, 315 searched decisions; the read written). The machine was running two other jobs' dry runs and the engine
meanwhile, so the game times are high. `dry-run --max-seconds 60`: every block starts; block 2 stops on the pairs file
block 1 had no time to write, as a 60 s cut must.

**Not beside anything.** 7 of 8 cores. It aborts if a `queue run` starts. Justin at the table holds it as usual;
everything resumes (`cubelab.sh run` skips done seeds, `ai-bench.sh play` skips played games, the variants are a pure
function of the drafts). To stop it cleanly: `touch var/lab-j124/ABORT` in the lab clone.

## Pilot
About 10-15 minutes: the build and ai-bench's self-test, the tool's self-test, the Synergy v2 copy checked against
Forge, 6 drafts of each cube, the variants, every Forge game of those pools and 8 search-v2 games, then the read, all
under `var/lab-j124-pilot/` and `var/ai-bench/j124-pilot-*` (never the real folders).
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --version
export CUBELAB_HOME_ROOT=var/cubelab/homes-J124
P=var/lab-j124-pilot
rm -rf "$P" var/ai-bench/j124-pilot-forge var/ai-bench/j124-pilot-search
mkdir -p "$P" var/lab-j124-tools var/lab-j124/cubes
cat > var/lab-j124-tools/variants.mts <<'J124EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
// J124: the low-curve 16-land follow-up to J121 (B2).  J121's variants.ts, narrowed to one question.
//
// `build`: for every seat of every cube-lab draft (drafts.jsonl: the pool and the lab's deck), ForgeCoach's own
// best build (cube/builder.ts `buildDecks`, the deck assistant's first suggestion: the shipped meta, the Scryfall
// snapshot and the 17Lands numbers where the cube ships them).  Only the pools where that build plays 16 lands are
// kept; for each, `l16` is that deck and `l17` the same colours and splash on 17 lands (J121's `stepLands`: the land
// in cuts the spell whose loss leaves the builder's best score).  Both play the OTHER seat's lab deck, the same
// opponent for both.  Each kept pool also records WHY the builder chose 16 (`src`): `lowcurve` = no meta land count
// for its archetype and 23 spells averaging mana value <= 2.4 (buildOne's low-curve rule); `meta` = the meta's land
// table said 16 (metaLandCount); `other` = neither (never expected).  `read`: the paired contrast and J124's rule.
// `selftest`: the read's arithmetic and the rule on made-up numbers.
// Run: node --experimental-transform-types --no-warnings variants.mts build|read|selftest --flag value ...
import fs from 'node:fs';
import path from 'node:path';
import type * as BuilderT from '../../src/cube/builder.ts';
import type { CubeContext } from '../../src/cube/score.ts';

type Builder = typeof BuilderT;
type Build = BuilderT.DeckBuild;
export const norm = (s: string): string => (s.split(' // ')[0] ?? s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mod = any;
export interface FC { B: Builder; facts: Mod; meta: Mod; score: Mod; colors: Mod; ctx: CubeContext }

/** ForgeCoach's deck-assistant context for a cube: document, Scryfall snapshot, shipped meta and (when shipped) 17Lands numbers (J121's loadFC). */
export async function loadFC(fcRoot: string, cube: string): Promise<FC> {
  const imp = (p: string) => import(path.resolve(fcRoot, p));
  const [B, facts, score, load, human, meta, colors] = await Promise.all(['src/cube/builder.ts', 'src/cube/facts.ts', 'src/cube/score.ts', 'src/cube/testdata/load.ts', 'src/cube/human.ts', 'src/cube/meta.ts', 'src/cube/colors.ts'].map(imp));
  const doc = load.loadCube(cube);
  const hf = path.resolve(fcRoot, 'public/cubes', `${load.cubeFile(cube)}.human.json`);
  const h = fs.existsSync(hf) ? human.parseHumanCards(JSON.parse(fs.readFileSync(hf, 'utf8'))) : null;
  return { B, facts, meta, score, colors, ctx: score.makeContext(doc, load.loadInfos(cube, doc), load.loadRealMeta(cube), h) };
}

const remove1 = (xs: string[], x: string): string[] => { const i = xs.indexOf(x); return i < 0 ? xs : [...xs.slice(0, i), ...xs.slice(i + 1)]; };
const legal = (fc: FC, pool: string[], b: Build): boolean => b.missing === 0 && fc.B.checkBuild(b, pool, fc.ctx).length === 0 && b.splashCards.length <= 3;

/** The best legal build among `spellLists` (ties: the first), at `lands` lands, in `b`'s colours and splash (J121). */
function best(fc: FC, pool: string[], b: Build, splash: string | null, spellLists: string[][], lands: number): Build | null {
  let top: Build | null = null;
  for (const spells of spellLists) {
    const nb = fc.B.evaluateBuild(fc.ctx, pool, b.colors, splash, spells, { landCount: lands, n: 40 - lands, thin: b.thin });
    if (legal(fc, pool, nb) && (!top || nb.score > top.score)) top = nb;
  }
  return top;
}

const sideSpells = (fc: FC, pool: string[], spells: string[], allowed: string): string[] =>
  [...new Set(fc.B.sideboard({ spells, nonbasics: [] } as unknown as Build, pool))].filter((s) => {
    const f = fc.ctx.facts.get(s);
    return !!f && !f.land && fc.facts.castableIn(f, allowed);
  }).sort();

/** One land more (cut a spell) or fewer (add a spell), keeping colours and splash (J121, unchanged). */
export function stepLands(fc: FC, pool: string[], b: Build, dir: 1 | -1): Build | null {
  const lists = dir === 1
    ? [...new Set(b.spells)].sort().map((s) => remove1(b.spells, s))
    : sideSpells(fc, pool, b.spells, b.colors + (b.splash ?? '')).map((s) => [...b.spells, s]);
  return best(fc, pool, b, b.splash, lists, b.landCount + dir);
}

/** Why the builder put 16 lands in `b`: buildOne's own land decision, recomputed with its inputs (builder.ts buildOne). */
export function sourceOf(fc: FC, pool: string[], b: Build): 'meta' | 'lowcurve' | 'other' {
  const ctx = fc.ctx;
  const cands: string[] = [];
  for (const s of pool) {
    const f = ctx.facts.get(s);
    if (!f || f.land || fc.colors.BASIC_NAMES.has(s)) continue;
    if (fc.facts.castableIn(f, b.colors)) cands.push(s);
    else if (b.splash && fc.facts.splashColourOf(f, b.colors) === b.splash && fc.score.cardValue(s, ctx) >= fc.B.SPLASH_MIN) cands.push(s);
  }
  const arch0 = fc.meta.findArchetype(ctx.meta?.meta ?? null, b.colors, fc.score.topThemes(cands, ctx, 1)[0]?.[0]);
  const ml = fc.B.metaLandCount(ctx, arch0);
  // No meta land count: buildOne starts at 23 spells and goes to 24 (16 lands) only by the low-curve rule.
  if (!ml) return 'lowcurve';
  return ml.lands === 16 ? 'meta' : 'other';
}

/** Forge's .dck, the cube lab's layout, in the pool's own (Forge) names (J121). */
export function dck(fc: FC, b: Build, pool: string[], forgeName: (n: string) => string, name: string): string {
  const lines = ['[metadata]', `Name=${name}`, '[Main]', ...fc.B.mainDeck(b).map(([n, c]) => `${n} ${forgeName(c)}`), '[Sideboard]'];
  const side = new Map<string, number>();
  for (const c of fc.B.sideboard(b, pool)) side.set(forgeName(c), (side.get(forgeName(c)) ?? 0) + 1);
  for (const [c, n] of side) lines.push(`${n} ${c}`);
  return `${lines.join('\n')}\n`;
}

interface DraftLine { seed: number; drafters: Array<{ seat: string; pool: string[]; deckFile: string | null }> }
export interface Manifest { cube: string; seed: number; seat: string; search: boolean; src: string; avgMv: number; fcKey: string; fcSplash: string | null; opp: string; arms: Record<string, string | null>; unknown: string[] }

/** `build --forgecoach DIR --out DIR --run cube=DIR... [--search-pools N]`. */
export async function build(a: Map<string, string[]>): Promise<number> {
  const out = one(a, 'out'), fcRoot = one(a, 'forgecoach'), searchN = Number(one(a, 'search-pools', '0'));
  fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
  const rows: Manifest[] = [];
  const count: Record<string, number> = {};
  const inc = (k: string, n = 1) => { count[k] = (count[k] ?? 0) + n; };
  for (const spec of a.get('run') ?? []) {
    const [cube, dir] = spec.split('=') as [string, string];
    const fc = await loadFC(fcRoot, cube);
    const byNorm = new Map([...fc.ctx.facts.keys()].map((n) => [norm(n), n]));
    const drafts = fs.readFileSync(path.join(dir, 'drafts.jsonl'), 'utf8').split('\n').filter((l) => l.endsWith('}')).map((l) => JSON.parse(l) as DraftLine).sort((x, y) => x.seed - y.seed);
    for (const d of drafts) {
      if (d.drafters.length !== 2 || d.drafters.some((s) => !s.deckFile || !fs.existsSync(path.join(dir, s.deckFile)))) { inc('drafts_skipped'); continue; }
      inc('drafts'); inc(`${cube}_drafts`);
      d.drafters.forEach((s, k) => {
        inc('pools_all'); inc(`${cube}_pools_all`);
        const toFc = new Map<string, string>(), toForge = new Map<string, string>(), unknown: string[] = [];
        for (const n of s.pool) { const m = byNorm.get(norm(n)); if (m) { toFc.set(n, m); toForge.set(m, n); } else unknown.push(n); }
        inc('unknown_cards_all', unknown.length);
        const pool = s.pool.map((n) => toFc.get(n)).filter((n): n is string => !!n);
        const top = fc.B.buildDecks(fc.ctx, pool, {}, 1)[0];
        if (!top || !legal(fc, pool, top)) { inc('fc_none'); return; }
        inc(`fc${top.landCount}`); inc(`${cube}_fc${top.landCount}`);
        if (top.landCount !== 16 || top.thin) return;
        const src = sourceOf(fc, pool, top);
        const l17 = stepLands(fc, pool, top, 1);
        if (!l17) { inc('no_l17'); return; }
        const file = (arm: string, b: Build): string => {
          const f = path.join(out, 'decks', `${cube}-${d.seed}-${s.seat}-${arm}.dck`);
          fs.writeFileSync(f, dck(fc, b, pool, (c) => toForge.get(c) ?? c, `j124 ${cube} ${d.seed} ${s.seat} ${arm}`));
          return f;
        };
        const opp = d.drafters[1 - k] as DraftLine['drafters'][number];
        const avgMv = top.spells.reduce((x, c) => x + (fc.ctx.facts.get(c)?.mv ?? 3), 0) / top.spells.length;
        rows.push({
          cube, seed: d.seed, seat: s.seat, search: false, src, avgMv: Math.round(avgMv * 100) / 100, fcKey: top.key, fcSplash: top.splash,
          opp: path.join(dir, opp.deckFile as string), unknown, arms: { l16: file('l16', top), l17: file('l17', l17) },
        });
      });
    }
  }
  // Pool by pool (cubes interleaved by draft order): a stopped run covers whole pools of every cube.
  rows.sort((x, y) => x.seed - y.seed || (x.cube < y.cube ? -1 : x.cube > y.cube ? 1 : 0) || (x.seat < y.seat ? -1 : 1));
  // search-v2's subsample: the first pools in that order, whole drafts only, until N pools (both seats of a draft stay together).
  let taken = 0;
  for (let i = 0; i < rows.length && taken < searchN;) {
    const key = `${rows[i]?.cube}/${rows[i]?.seed}`;
    for (; i < rows.length && `${rows[i]?.cube}/${rows[i]?.seed}` === key; i++) { (rows[i] as Manifest).search = true; taken++; }
  }
  const pairs = (keep: (m: Manifest) => boolean): string[] => rows.filter(keep).flatMap((m) =>
    ['l16', 'l17'].map((x) => `${m.arms[x]} ${m.opp}   # ${m.cube} ${m.seed} ${m.seat} ${m.src}`));
  const forge = pairs(() => true), search = pairs((m) => m.search);
  fs.writeFileSync(path.join(out, 'manifest.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'pairs-forge.txt'), forge.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'pairs-search.txt'), search.join('\n') + '\n');
  const n = (f: (m: Manifest) => boolean) => rows.filter(f).length;
  const cubes = [...new Set((a.get('run') ?? []).map((x) => x.split('=')[0] as string))];
  const summary: Record<string, number> = {
    written: 1, drafts: count.drafts ?? 0, drafts_skipped: count.drafts_skipped ?? 0, pools_all: count.pools_all ?? 0,
    fc_none: count.fc_none ?? 0, fc16: count.fc16 ?? 0, fc17: count.fc17 ?? 0, fc18: count.fc18 ?? 0, no_l17: count.no_l17 ?? 0,
    pools: rows.length, search_pools: n((m) => m.search), search_drafts: new Set(rows.filter((m) => m.search).map((m) => `${m.cube}/${m.seed}`)).size,
    forge_pairs: forge.length, search_pairs: search.length,
    src_lowcurve: n((m) => m.src === 'lowcurve'), src_meta: n((m) => m.src === 'meta'), src_other: n((m) => m.src === 'other'),
    unknown_cards: rows.reduce((s, m) => s + m.unknown.length, 0), unknown_cards_all: count.unknown_cards_all ?? 0,
  };
  for (const c of cubes) {
    summary[`${c}_drafts`] = count[`${c}_drafts`] ?? 0;
    summary[`${c}_pools_all`] = count[`${c}_pools_all`] ?? 0;
    summary[`${c}_fc16`] = count[`${c}_fc16`] ?? 0;
    summary[`${c}_pools`] = n((m) => m.cube === c);
    summary[`${c}_lowcurve`] = n((m) => m.cube === c && m.src === 'lowcurve');
    summary[`${c}_search_pools`] = n((m) => m.cube === c && m.search);
  }
  fs.writeFileSync(path.join(out, 'variants.json'), JSON.stringify(summary) + '\n');
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return 0;
}

// ---------------------------------------------------------------- read (J124's pre-registered rule)

/** [score sum, games] per focus deck path; a game scores 1 / 0 / ½ (draw or timeout); an engine error is left out (J121). */
export function tally(lines: Array<Record<string, unknown>>): Map<string, [number, number]> {
  const t = new Map<string, [number, number]>();
  for (const g of lines) {
    if (typeof g.error === 'string' && g.error !== '') continue;
    const x = g.focusWon === 'yes' ? 1 : g.focusWon === 'no' ? 0 : 0.5;
    const cur = t.get(String(g.focusDeck)) ?? [0, 0];
    t.set(String(g.focusDeck), [cur[0] + x, cur[1] + 1]);
  }
  return t;
}

export interface Est { pools: number; drafts: number; est: number; se: number; lo95: number; hi95: number; lo99: number; hi99: number }

/** l16 − l17, paired by pool (same opponent deck), averaged within the draft (its seats), then over drafts (J121's contrast). */
export function contrast(rows: Manifest[], t: Map<string, [number, number]>): Est | null {
  const byDraft = new Map<string, number[]>();
  for (const m of rows) {
    const px = m.arms.l16, py = m.arms.l17;
    const a = px ? t.get(px) : undefined, b = py ? t.get(py) : undefined;
    if (!a || !b || !a[1] || !b[1]) continue;
    const k = `${m.cube}/${m.seed}`;
    byDraft.set(k, [...(byDraft.get(k) ?? []), a[0] / a[1] - b[0] / b[1]]);
  }
  const d = [...byDraft.values()].map((v) => v.reduce((s, x) => s + x, 0) / v.length);
  if (d.length < 2) return null;
  const est = d.reduce((s, x) => s + x, 0) / d.length;
  const se = Math.sqrt(d.reduce((s, x) => s + (x - est) ** 2, 0) / (d.length - 1) / d.length);
  const r = (x: number) => Math.round(x * 10000) / 10000;
  return { pools: [...byDraft.values()].reduce((s, v) => s + v.length, 0), drafts: d.length, est: r(est), se: r(se), lo95: r(est - 1.96 * se), hi95: r(est + 1.96 * se), lo99: r(est - 2.576 * se), hi99: r(est + 2.576 * se) };
}

/** J124's rule: SHOWN (1) when the Forge arm's 99% interval on l16 − l17 lies entirely below 0 AND search-v2's estimate is below 0 too. */
export function rule(f: Est | null, s: Est | null): { shown: number; direction: number } {
  const direction = !f ? 0 : f.lo99 > 0 ? 1 : f.hi99 < 0 ? -1 : 0;
  return { shown: f !== null && s !== null && f.hi99 < 0 && s.est < 0 ? 1 : 0, direction };
}

function shardLines(dir: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^shard-\d+\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter((l) => l.endsWith('}')).map((l) => JSON.parse(l) as Record<string, unknown>));
}

/** `read --manifest FILE --forge-run DIR --search-run DIR --out DIR`: metrics.json (flat) and summary.md. */
export function read(a: Map<string, string[]>): number {
  const rows = fs.readFileSync(one(a, 'manifest'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Manifest);
  const tf = tally(shardLines(one(a, 'forge-run'))), ts = tally(shardLines(one(a, 'search-run')));
  const f = contrast(rows, tf), s = contrast(rows.filter((m) => m.search), ts);
  const v = rule(f, s);
  const flat: Record<string, number> = { written: 1, pools: rows.length, shown: v.shown, direction: v.direction };
  const put = (p: string, e: Est | null) => { if (e) for (const [k, x] of Object.entries(e)) flat[`${p}_${k}`] = x; };
  put('f', f); put('s', s);
  const pts = (x: number) => `${x > 0 ? '+' : ''}${(x * 100).toFixed(1)}`;
  const fmt = (e: Est | null) => (e ? `${e.pools} | ${e.drafts} | ${pts(e.est)} | [${pts(e.lo95)}, ${pts(e.hi95)}] | [${pts(e.lo99)}, ${pts(e.hi99)}]` : '0 | 0 | - | - | -');
  const md = ['# J124: 16 or 17 lands where ForgeCoach\'s builder picks 16 (paired by pool, clustered by draft)', '',
    'Points = the 16-land deck\'s game score minus the same deck on 17 lands, on the same pool against the same opponent deck (+1.0 = 16 lands wins 1 point more).', '',
    `**Rule (pre-registered): ${v.shown ? 'SHOWN: 17 lands beat 16 on these pools; the cloud changes the low-curve rule to 17' : 'NOT SHOWN: the rule stays'}.** ` +
    'SHOWN needs the Forge arm\'s 99% interval entirely below 0 and search-v2\'s estimate below 0.', '',
    '| read | pilot | pools | drafts | points | 95% | 99% |', '|---|---|---|---|---|---|---|',
    `| all 16-land pools (the rule) | Forge Default | ${fmt(f)} |`, `| search subsample (the rule's sign) | search-v2 | ${fmt(s)} |`];
  const desc: Array<[string, (m: Manifest) => boolean]> = [];
  for (const c of [...new Set(rows.map((m) => m.cube))]) desc.push([`cube ${c}`, (m) => m.cube === c]);
  for (const src of ['lowcurve', 'meta', 'other']) desc.push([`source ${src}`, (m) => m.src === src]);
  desc.push(['search subsample', (m) => m.search]);
  for (const [name, keep] of desc) {
    const e = contrast(rows.filter(keep), tf);
    put(`f_${name.replace(/\s+/g, '_')}`, e);
    md.push(`| ${name} (description) | Forge Default | ${fmt(e)} |`);
  }
  for (const src of ['lowcurve', 'meta']) {
    const e = contrast(rows.filter((m) => m.search && m.src === src), ts);
    put(`s_source_${src}`, e);
    md.push(`| source ${src} (description) | search-v2 | ${fmt(e)} |`);
  }
  fs.mkdirSync(one(a, 'out'), { recursive: true });
  fs.writeFileSync(path.join(one(a, 'out'), 'metrics.json'), JSON.stringify(flat) + '\n');
  fs.writeFileSync(path.join(one(a, 'out'), 'summary.md'), md.join('\n') + '\n\nAn interval that includes 0 is "not shown", never "no effect".\n');
  process.stdout.write(`${md.join('\n')}\n`);
  return 0;
}

/** `selftest`: the contrast's arithmetic (paired, clustered by draft) and the rule, on made-up numbers. Exit 1 on any miss. */
export function selftest(): number {
  const bad: string[] = [];
  const ok = (c: boolean, what: string) => { if (!c) bad.push(what); };
  const row = (cube: string, seed: number, seat: string, search = true): Manifest => ({ cube, seed, seat, search, src: 'lowcurve', avgMv: 2.2, fcKey: 'WR', fcSplash: null, opp: `o-${cube}-${seed}-${seat}`, unknown: [], arms: { l16: `${cube}-${seed}-${seat}-l16`, l17: `${cube}-${seed}-${seat}-l17` } });
  const g = (deck: string, won: string, error = '') => ({ focusDeck: deck, focusWon: won, error });
  const rows = [row('v', 1, 'A'), row('v', 1, 'B'), row('s', 1, 'A'), row('s', 2, 'B')];
  // draft v/1: A 16 = 1/2, 17 = 2/2 -> -0.5; B 16 = 0/2, 17 = 1/2 -> -0.5; draft mean -0.5
  // draft s/1: A 16 = 2/2 (one error left out), 17 = 1/2 -> +0.5;   draft s/2: B 16 = 1/2, 17 = 1/2 (a draw = ½ each side) -> 0
  const lines = [g('v-1-A-l16', 'yes'), g('v-1-A-l16', 'no'), g('v-1-A-l17', 'yes'), g('v-1-A-l17', 'yes'),
    g('v-1-B-l16', 'no'), g('v-1-B-l16', 'no'), g('v-1-B-l17', 'yes'), g('v-1-B-l17', 'no'),
    g('s-1-A-l16', 'yes'), g('s-1-A-l16', 'yes'), g('s-1-A-l16', 'no', 'engine error'), g('s-1-A-l17', 'yes'), g('s-1-A-l17', 'no'),
    g('s-2-B-l16', 'draw'), g('s-2-B-l16', 'yes'), g('s-2-B-l16', 'no'), g('s-2-B-l16', 'draw'), g('s-2-B-l17', 'yes'), g('s-2-B-l17', 'no')];
  const e = contrast(rows, tally(lines));
  const mean = (-0.5 + 0.5 + 0) / 3, sd = Math.sqrt(((-0.5 - mean) ** 2 + (0.5 - mean) ** 2 + (0 - mean) ** 2) / 2);
  ok(!!e && e.drafts === 3 && e.pools === 4, `clustered: 3 drafts, 4 pools (got ${e?.drafts}, ${e?.pools})`);
  ok(!!e && Math.abs(e.est - mean) < 1e-4 && Math.abs(e.se - sd / Math.sqrt(3)) < 1e-4, `estimate and SE (got ${e?.est}, ${e?.se})`);
  ok(!!e && Math.abs(e.hi99 - (mean + 2.576 * sd / Math.sqrt(3))) < 2e-4 && Math.abs(e.lo95 - (mean - 1.96 * sd / Math.sqrt(3))) < 2e-4, 'the 99% and 95% bounds');
  ok(contrast([row('v', 1, 'A')], tally(lines)) === null, 'one draft gives no interval');
  const E = (est: number, lo99: number, hi99: number): Est => ({ pools: 9, drafts: 9, est, se: 0, lo95: lo99, hi95: hi99, lo99, hi99 });
  ok(rule(E(-0.04, -0.07, -0.01), E(-0.03, -0.1, 0.04)).shown === 1, 'shown: Forge 99% below 0 and search-v2 below 0');
  ok(rule(E(-0.04, -0.07, -0.01), E(0.01, -0.05, 0.07)).shown === 0, 'not shown: search-v2 on the other side');
  ok(rule(E(-0.04, -0.07, -0.01), E(0, -0.05, 0.05)).shown === 0, 'not shown: search-v2 exactly 0');
  ok(rule(E(-0.03, -0.06, 0.001), E(-0.05, -0.1, 0)).shown === 0, 'not shown: the 99% interval touches 0');
  ok(rule(E(0.04, 0.01, 0.07), E(0.03, -0.01, 0.07)).shown === 0 && rule(E(0.04, 0.01, 0.07), null).direction === 1, '16 better is not shown (direction +1)');
  ok(rule(E(-0.04, -0.07, -0.01), null).shown === 0, 'not shown without the search arm');
  ok(rule(null, E(-0.03, -0.1, 0.04)).shown === 0, 'not shown without the Forge arm');
  process.stdout.write(bad.length ? `selftest FAIL\n${bad.map((b) => `  ${b}`).join('\n')}\n` : 'selftest OK (11 cases)\n');
  return bad.length ? 1 : 0;
}

const one = (a: Map<string, string[]>, k: string, d?: string): string => {
  const v = a.get(k)?.at(-1) ?? d;
  if (v === undefined) throw new Error(`--${k} is needed`);
  return v;
};

export function args(argv: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i += 2) m.set((argv[i] as string).replace(/^--/, ''), [...(m.get((argv[i] as string).replace(/^--/, '')) ?? []), argv[i + 1] as string]);
  return m;
}

if (process.argv[1] && /variants\.m?ts$/.test(process.argv[1])) {
  const cmd = process.argv[2], a = args(process.argv.slice(3));
  (cmd === 'build' ? build(a) : cmd === 'read' ? Promise.resolve(read(a)) : cmd === 'selftest' ? Promise.resolve(selftest()) : Promise.reject(new Error('usage: variants.mts build|read|selftest --flag value ...')))
    .then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
}
J124EOF
sha256sum var/lab-j124-tools/variants.mts
node --experimental-transform-types --no-warnings var/lab-j124-tools/variants.mts selftest
cp {ForgeCoach}/public/cubes/synergy-cube-180.md var/lab-j124/cubes/synergy-cube-180.md
head -1 var/lab-j124/cubes/synergy-cube-180.md
tools/cubelab.sh check var/lab-j124/cubes/synergy-cube-180.md > "$P/synergy-check.txt"
cat "$P/synergy-check.txt"
node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const n=(r)=>Number((r.exec(t)??[])[1]??-1);console.log(JSON.stringify({listed:n(/^cards listed\s+(\d+)/m),in_db:n(/^in Forge.s DB\s+(\d+)/m),missing:[...t.matchAll(/^ {2}MISSING\s/gm)].length,v2:/version 2/.test(require("fs").readFileSync(process.argv[2],"utf8").split("\n")[0])?1:0}))' "$P/synergy-check.txt" var/lab-j124/cubes/synergy-cube-180.md > "$P/synergy-check.json"
cat "$P/synergy-check.json"
for c in cubes/vintage-cube-180.md cubes/evybaby-cube-360.md var/lab-j124/cubes/synergy-cube-180.md; do
  n=$(basename "$c" .md)
  tools/cubelab.sh run "$c" --format grid --drafts 6 --games 0 --jobs {workers} --seed 813900001 --profiles Default,Default --out "$P/drafts-${n%%-*}"
done
node --experimental-transform-types --no-warnings var/lab-j124-tools/variants.mts build --forgecoach {ForgeCoach} --out "$P/variants" --run vintage="$P/drafts-vintage" --run evybaby="$P/drafts-evybaby" --run synergy="$P/drafts-synergy" --search-pools 2
./tools/ai-bench.sh play --pairs "$P/variants/pairs-forge.txt" --a Default --b Default --games 4 --seed 124 --no-mirror --timeout 300 --run j124-pilot-forge --jobs {workers}
head -4 "$P/variants/pairs-search.txt" > "$P/variants/pairs-search-4.txt"
./tools/ai-bench.sh play --pairs "$P/variants/pairs-search-4.txt" --a 'Default+outlets+search:anytime=1' --b 'Default+outlets+search:anytime=1' --games 2 --seed 124 --no-mirror --timeout 900 --run j124-pilot-search --jobs {workers}
node --experimental-transform-types --no-warnings var/lab-j124-tools/variants.mts read --manifest "$P/variants/manifest.jsonl" --forge-run var/ai-bench/j124-pilot-forge --search-run var/ai-bench/j124-pilot-search --out "$P/out"
```
metrics: sc = sh: cat var/lab-j124-pilot/synergy-check.json 2>/dev/null || echo '{"listed":0}'
metrics: pd = cubelab var/lab-j124-pilot/drafts-vintage var/lab-j124-pilot/drafts-evybaby var/lab-j124-pilot/drafts-synergy
metrics: pv = sh: cat var/lab-j124-pilot/variants/variants.json 2>/dev/null || echo '{"written":0}'
metrics: pf = aibench var/ai-bench/j124-pilot-forge
metrics: ps = aibench var/ai-bench/j124-pilot-search
metrics: pj = sh: cat var/lab-j124-pilot/out/metrics.json 2>/dev/null || echo '{"written":0}'
check: qwriters == 0
check: disk_gb >= 20
check: sc.listed == 180
check: sc.in_db == 180
check: sc.missing == 0
check: sc.v2 == 1
check: pd.drafts == 18
check: pv.written == 1
check: pv.drafts == 18
check: pv.unknown_cards_all == 0
check: pv.src_other == 0
check: pv.no_l17 == 0
check: pv.pools == pv.fc16
check: pv.pools >= 4
check: pv.forge_pairs == 2 * pv.pools
check: pv.search_pools >= 2
check: pf.games == 4 * pv.forge_pairs
check: pf.errors + pf.timeouts <= 1
check: pf.searched_decisions == 0
check: pf.mean_game_s between 0.5 and 7
check: ps.games == 8
check: ps.errors + ps.timeouts == 0
check: ps.searched_decisions >= 20
check: ps.mean_game_s between 15 and 75
check: pj.written == 1
check: pj.pools == pv.pools

What the checks say:
- The Synergy copy is ForgeCoach's v2 and Forge 2.0.14 has all 180 of its cards.
- The drafts ran in all three cubes, ForgeCoach's builder read every pool card by name, every kept pool's 16 has a
  known source and a legal 17-land twin, and every 16-land pool was kept.
- Every Forge game was played, plain Forge (no searched decision), at most 7 s a game: the Forge arm fits in about
  5 h at worst on 7 workers.
- search-v2 really searched, at most 75 s a game: the search arm fits in about 3.6 h at worst.
- The read ran on the pilot's games.
There are no win-rate bounds. A pilot of 6 drafts a cube may keep few pools (about 9 expected); `pv.pools >= 4` only
asks that the path was exercised.

## Commands
The drafts and the variants first, then the Forge arm, then the search arm, then the read. `resumable: yes`:
`cubelab.sh run` on the same `--out` skips seeds already in its `drafts.jsonl`, `ai-bench.sh play` on the same `--run`
skips games already in its shards (D337), and `variants.mts build` writes the same files from the same drafts.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J124
mkdir -p var/lab-j124/cubes
cp {ForgeCoach}/public/cubes/synergy-cube-180.md var/lab-j124/cubes/synergy-cube-180.md
for c in cubes/vintage-cube-180.md cubes/evybaby-cube-360.md var/lab-j124/cubes/synergy-cube-180.md; do
  n=$(basename "$c" .md)
  tools/cubelab.sh run "$c" --format grid --drafts 1400 --games 0 --jobs {workers} --seed 813000001 --profiles Default,Default --out "var/lab-j124/drafts-${n%%-*}"
done
node --experimental-transform-types --no-warnings var/lab-j124-tools/variants.mts build --forgecoach {ForgeCoach} --out var/lab-j124/variants --run vintage=var/lab-j124/drafts-vintage --run evybaby=var/lab-j124/drafts-evybaby --run synergy=var/lab-j124/drafts-synergy --search-pools 300
```
```bash
./tools/ai-bench.sh play --pairs var/lab-j124/variants/pairs-forge.txt --a Default --b Default --games 4 --seed 124 --no-mirror --timeout 300 --run j124-forge --jobs {workers}
```
```bash
./tools/ai-bench.sh play --pairs var/lab-j124/variants/pairs-search.txt --a 'Default+outlets+search:anytime=1' --b 'Default+outlets+search:anytime=1' --games 2 --seed 124 --no-mirror --timeout 900 --run j124-search --jobs {workers}
```
cores: 1
```bash
node --experimental-transform-types --no-warnings var/lab-j124-tools/variants.mts read --manifest var/lab-j124/variants/manifest.jsonl --forge-run var/ai-bench/j124-forge --search-run var/ai-bench/j124-search --out var/lab-j124/out
```
check: dv.drafts == 1400
check: de.drafts == 1400
check: ds.drafts == 1400
check: vf.written == 1
check: vf.drafts == 4200
check: vf.unknown_cards_all == 0
check: vf.src_other == 0
check: vf.no_l17 == 0
check: vf.pools == vf.fc16
check: vf.pools >= 1500
check: vf.search_pools between 300 and 301
check: f.games == 4 * vf.forge_pairs
check: s.games == 2 * vf.search_pairs
check: f.error_rate <= 1%
check: f.searched_decisions == 0
check: s.errors + s.timeouts <= s.games / 50
check: s.mean_game_s >= 15
check: jr.written == 1
check: jr.pools == vf.pools
check: jr.f_pools >= 1500
check: jr.s_pools >= 250
check: jr.shown between 0 and 1
check: (jr.shown == 1 and jr.f_hi99 < 0 and jr.s_est < 0) or (jr.shown == 0 and not (jr.f_hi99 < 0 and jr.s_est < 0))

The checks say the run is whole (every draft, every kept pool's two decks, every game of both arms, few engine errors,
plain Forge on one arm and a searching seat on the other, the read written) and that the read's `shown` is the
pre-registered rule applied to its own numbers: the last line is the rule, recomputed by the runner from
`jr.f_hi99` (the Forge arm's 99% upper bound on 16 - 17) and `jr.s_est` (search-v2's estimate). It passes for SHOWN
and for NOT SHOWN alike: "not shown" is a finished job with an answer, never a failed one. `jr.shown` is the decision
(1 = SHOWN: 17 beats 16 on these pools, the cloud changes the low-curve rule to 17; 0 = NOT SHOWN: the rule stays).
`vf.pools >= 1500` is a floor under the ~2,100 expected (an outcome-blind count); fewer would mean the builder picks 16
far less often than in the measurements above, which the summary must explain before anyone reads the contrast.

## Abort if
abort: qwriters > 0
abort: disk_gb < 10
abort: stopfile > 0
abort: f.games >= 500 and f.error_rate > 5%
abort: s.games >= 100 and s.errors + s.timeouts > s.games / 10

A queue night starting beside it, the disk running low, a stop file, or engine trouble. Nothing looks at win rates.

## Report
collect: var/lab-j124/out/summary.md
collect: var/lab-j124/out/metrics.json
collect: var/lab-j124/variants/variants.json
collect: var/lab-j124/variants/manifest.jsonl

`summary.md` is written by the job (its table). The PC session adds its reading below it, plainly, the way J115-J123
were reported:
- **The rule:** the Forge arm's estimate in points for 16 minus 17 with its 95% and 99% intervals, pools and drafts;
  search-v2's estimate (with its 95%) beside it; and the decision: SHOWN (17 better; the cloud changes the low-curve
  rule to 17) or NOT SHOWN (the rule stays), with "16 shown better" said in words if the 99% interval lies above 0.
- **Where the 16s came from** (`variants.json`, the per-source rows): how many kept pools each source gave per cube,
  and the Forge arm's estimate on the low-curve pools and on the meta-table pools, as descriptions. Say plainly
  whether a SHOWN result rests mostly on meta-table pools, because the brief's change (the low-curve rule) does not
  touch those; the cloud decides what to do about the meta tables.
- **Descriptive only:** each cube's row; how often the builder chose 16, 17 and 18 per cube (`variants.json`);
  the Forge arm on the search subsample beside search-v2 on the same pools.
- **Against J121:** this job's estimate beside J121's -3.9 [-7.5, -0.3] (95%).
- **Cost:** each arm's games, mean game time and hours, and whether the PC was in other use while it ran.
- **An interval that includes 0 is "not shown",** never "no effect" or "no difference".

id: J121
title: B2, deckbuilder choices: from 800 lab drafts each of Vintage 180 and Evan's cube (seeds 812,000,001+), every seat's pool built by ForgeCoach's deck assistant and a few one-decision variants (16 / 17 / 18 lands, the splash cut) plus the lab's and Forge's own builds, each played against the other seat's lab deck; paired by pool, Forge Default vs Forge Default on all of them and search-v2 vs search-v2 on 120 drafts a cube as a sign check
public_title: Deckbuilder choices: lands, splash, builders
public_est: ~10-14 h (one night and a morning)
public_decides: ForgeCoach deck builder: land count and splash
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 2.5
repos: mtg-table@fcdb174 (current main: the cube lab's --games 0 drafts write both the lab's and Forge's BoosterDeckBuilder deck per seat; ai-bench play takes any pairs file of .dck decks and a seat config each side, records focusDeck/focusWon per game, and resumes, D337), ForgeCoach@866c256 (current main: cube/builder.ts, the deck assistant's builder; the shipped vintage- and evybaby-cube-*.meta.json, vintage-cube-180.human.json and src/cube/testdata/scryfall-*.json it scores with)
decides: whether ForgeCoach's deck assistant changes its land count (16 vs 17) or its splash, and how its builds compare with the lab's and Forge's; 18 lands goes to Justin, never changed by this job
hypothesis: ForgeCoach's builder (lab win rates + 17Lands, Justin's two colours + a <=3-card splash on 16-17 lands) should beat Forge's BoosterDeckBuilder clearly (Forge leaves out colourless lands and low-rated cards and pads thin pools) and the lab builder slightly; one land or the splash is a small effect, a few points at most, so most contrasts may be not shown at this size
rule: written 2026-10-10 before any J121 game was played (variants.ts, the read). Unit: a focus pool = one seat of one lab draft; each of its decks plays 2 games (one per seat) against the OTHER seat's lab deck, the same opponent for every variant; a game scores 1/0, a draw or timeout 1/2, an engine error is left out; per pool the variant's mean minus the reference's, averaged within the draft (its two seats), then over drafts; normal 95% and 99% intervals. Five primary contrasts on the Forge Default arm (all drafts, both cubes pooled): lands16 = 16 minus 17 lands and lands18 = 18 minus 17 lands (ForgeCoach's colours and splash, one spell per land, the builder's own pick), nosplash = ForgeCoach's splash swapped for on-colour spells minus ForgeCoach's deck (pools where it splashes), lab = the lab builder minus ForgeCoach, forge = Forge's builder minus ForgeCoach. A contrast is SHOWN when its 99% interval excludes 0 (five contrasts, about 5% familywise). lands16, lands18 and nosplash also need the search-v2 arm's point estimate on the same side, else NOT SHOWN. Decisions: lands16 shown for 16 -> a follow-up makes 16 the deck assistant's default (the meta's land table still first); shown for 17 -> it drops its low-curve 16-land rule. nosplash shown for the cut -> a follow-up stops the deck assistant's splashes; shown for the splash -> it keeps them. lands18 shown for 18 -> reported to Justin (his rule keeps 18 for thin pools), nothing changes. lab / forge -> which builder wins, nothing changes by itself. Everything else: no change. An interval that includes 0 is not shown, never no effect
followup: morning-read
est: ~10-14 h. Pilot ~15-20 min. Drafts ~10 min (--games 0: the draft and both builders; 4 drafts took 20 s in the cloud, mostly JVM start). Variants ~1 min (0.9 s for 16 pools in the cloud). Forge arm ~33,300 games (3,200 pools x ~5.2 decks x 2): 3.2 s a game on 7 workers (J112 arm A; J110 1.8 s on Evan's cube) is 4.2 h, 5 s is 6.6 h, the pilot's 7 s ceiling 9.3 h. Search arm ~3,000 games (480 pools x ~3.1 decks x 2): 41 s a game (J112 arm B) is 4.9 h, 60 s is 7.1 h. Read ~1 min
resumable: yes
timeout: 24h
progress: aibench var/ai-bench/j121-forge var/ai-bench/j121-search of 36300
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: disk_gb = sh: df -Pk var/ | awk 'NR==2{print int($4/1048576)}'
metrics: stopfile = files var/lab-j121/ABORT
metrics: dv = cubelab var/lab-j121/drafts-vintage
metrics: de = cubelab var/lab-j121/drafts-evybaby
metrics: vf = sh: cat var/lab-j121/variants/variants.json 2>/dev/null || echo '{"written":0}'
metrics: f = aibench var/ai-bench/j121-forge
metrics: s = aibench var/ai-bench/j121-search
metrics: jr = sh: cat var/lab-j121/out/metrics.json 2>/dev/null || echo '{"written":0}'
headline: jr.lands16_decision, jr.f_lands16_est, jr.f_lands16_lo99, jr.f_lands16_hi99, jr.lands18_decision, jr.f_lands18_est, jr.nosplash_decision, jr.f_nosplash_est, jr.f_lab_est, jr.f_forge_est

**Why (B2, Justin approved).** After a draft, ForgeCoach's deck assistant (`src/cube/builder.ts`) suggests a 40 from
the pool by hand-written rules and card values: lab win rates blended with 17Lands, two colours plus a splash of at most
three one-pip cards, 16-17 lands, 18 or three colours only for thin pools. Nothing has measured whether its choices win.
This job builds many decks from the same drafted pools, plays them, and reads which choices matter: the land count, the
splash, and the builder itself. It is the first, measured step of "learn a better deckbuilder": the games it plays (every
deck list and result) are the training set for a learned "which 23" model, if these effects turn out real.

**What is played.**
- **Pools.** 800 lab drafts each of Vintage 180 and Evan's cube (`evybaby`, 360), the two cubes Justin drafts with Evan:
  grid, the lab drafter, seeds 812,000,001 and up (D340's VERIFY range; no earlier job used them), `--games 0`. That gives
  each seat's pool, the lab's deck (`decks/<seed>-<seat>.dck`) and Forge's BoosterDeckBuilder deck (`-forge.dck`; the
  engine builds it even with no games). Up to 3,200 focus pools.
- **Decks per pool** (`variants.ts build`, below; ForgeCoach's own code at 866c256, read from the ForgeCoach clone):
  - `fc`: the deck assistant's first suggestion (`buildDecks(ctx, pool)[0]`, the shipped meta, the Scryfall snapshot
    and, for Vintage, the 17Lands numbers: what the site shows);
  - `l16`, `l17`, `l18`: the same colours and splash on 16, 17 and 18 lands, one land at a time from fc's count: a land in
    cuts the spell whose loss leaves the builder's best score; a land out adds the best castable sideboard spell (fc is
    its own count's deck, so each pool plays two of them);
  - `nospl` (pools where fc splashes and the pool has enough on-colour spells): fc's splash cards swapped one at a time
    for the best on-colour sideboard spells, the splash's basics and duals gone;
  - `lab` and `forge`: the lab's deck and Forge's, as the cube lab built them.
- **Opponent.** The other seat's lab deck: one fixed deck per pool, whatever the variant.
- **Games.** Each deck 2 games against it, one in each seat (`ai-bench.sh play --games 2 --no-mirror`; both seats run
  the same pilot, so mirroring would only replay one deal). About 5.2 decks a pool in the cloud test (16 pools).
- **Two pilots.**
  - Forge Default vs Forge Default on everything: the shipped metas' pilot. J112 found search-v2's games no closer to
    17Lands humans than Forge's (Vintage rho 0.461 vs 0.535), so the lab has no reason to trust search-v2 more for deck
    quality, and Forge's games are 13 times cheaper. This arm carries the rule.
  - search-v2 vs search-v2 (`Default+outlets+search:anytime=1`, D412) on the first 120 drafts of each cube, decks fc,
    l16-l18 and nospl only: a sign check, so a land or splash change is adopted only when it does not help Forge's own
    AI alone. It does not play the lab and Forge builds.

**Precision (planning numbers).** A pool difference of two 2-game means has variance about 0.22. Over 3,200 pools the
lands contrasts' 99% interval is about +-2.1 points; nosplash (about 20% of pools in the cloud test) about +-4.8. A true
3-point land effect is shown about 85% of the time, a 2-point one about 40%. The search arm (480 pools, ~+-4 points at
95%) gets the sign right about 80-85% of the time for a true 2-3 points.

**What it is not.** No land in Vintage or Evan's cube is a Mutavault: Mutavault and Mishra's Factory are in Omega only,
and Vintage's one colourless land is Ancient Tomb, so the colourless-land question is not asked here (Omega would be a
follow-up). Single cards like Ephemerate are not swapped either: Forge's AI plays an `AI:RemoveDeck` card badly, so
under either pilot its number would measure the AI, not the card. The pools are the lab drafter's, not people's.

**Cloud tests (2026-10-10, mtg-table fcdb174 + ForgeCoach 866c256, Forge 2.0.14, a 4-core container).** 4 drafts of each
cube with `--games 0` (both builders' decks written), `variants.ts build` on them (16 pools, 0 unknown card names, fc on
16 lands in 6 and 17 in 10, a splash in 5, nospl in 3, 83 forge pairs), all 166 Forge games (0 errors, 5.6 s a game at 3
workers on 4 cores), 12 search-v2 games (49.8 s, 445 searched decisions, 0 errors) and the read. Then the whole `## Pilot` block (all but
`bridge/build.sh`, which `runner.sh dry-run`'s overlay could not run here) in 10.7 min at 3 workers: every pilot check
passes (Forge 6.0 s a game and search-v2 58 s on this slow box, against the 7 s and 75 s ceilings). ForgeCoach branch
`claude/b2-deck-variants` holds the same `variants.ts` with its tests (vitest, 6 tests).

**Not beside anything.** 7 of 8 cores. It aborts if a `queue run` starts (none is planned). Justin at the table holds it
as usual; everything resumes (`cubelab.sh run` skips done seeds, `ai-bench.sh play` skips played games, the variants are
a pure function of the drafts). To stop it cleanly: `touch var/lab-j121/ABORT` in the lab clone.

## Pilot
About 15-20 minutes: the build and ai-bench's self-test, 4 drafts of each cube, the variants, every Forge game of those
pools and 8 search-v2 games, then the read, all under `var/lab-j121-pilot/` and `var/ai-bench/j121-pilot-*` (never the
real folders).
```bash
./bridge/build.sh
./tools/ai-bench.sh --selftest
node --version
export CUBELAB_HOME_ROOT=var/cubelab/homes-J121
P=var/lab-j121-pilot
rm -rf "$P" var/ai-bench/j121-pilot-forge var/ai-bench/j121-pilot-search
mkdir -p "$P" var/lab-j121-tools
cat > var/lab-j121-tools/variants.mts <<'J121EOF'
// SPDX-License-Identifier: GPL-3.0-or-later
// ForgeCoach — scripts/deck-variants/variants.ts: B2's deck variants (mtg-table J121).
//
// `build`: for every seat of every cube-lab draft (drafts.jsonl: the pool, the lab's deck, Forge's deck), ForgeCoach's
// own best build (cube/builder.ts `buildDecks`, the deck assistant's first suggestion) and small changes of it, each
// one decision apart:
//   l16 l17 l18  the same colours and splash on 16/17/18 lands, one land at a time from ForgeCoach's count:
//                a land in = the spell whose cut leaves the best builder score out; a land out = the best castable
//                sideboard spell in (the FC deck is its own count's variant)
//   nospl        ForgeCoach's splash cards swapped one at a time for the best on-colour sideboard spells
// as Forge .dck files (Forge names), plus ai-bench pairs files: focus deck vs the OTHER seat's lab deck (fixed for
// every variant), pool by pool so a stopped run covers whole pools.  `read`: the paired contrasts (J121's rule).
// Run: node --experimental-transform-types variants.ts build|read --forgecoach <ForgeCoach checkout> ...
import fs from 'node:fs';
import path from 'node:path';
import type * as BuilderT from '../../src/cube/builder.ts';
import type { CubeContext } from '../../src/cube/score.ts';

type Builder = typeof BuilderT;
type Build = BuilderT.DeckBuild;
export const LANDS = [16, 17, 18] as const;
export const norm = (s: string): string => (s.split(' // ')[0] ?? s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export interface FC { B: Builder; castableIn: (f: { colors: string }, c: string) => boolean; ctx: CubeContext }

/** ForgeCoach's deck-assistant context for a cube: document, Scryfall snapshot, shipped meta and (when shipped) 17Lands numbers. */
export async function loadFC(fcRoot: string, cube: string): Promise<FC> {
  const imp = (p: string) => import(path.resolve(fcRoot, p));
  const [B, facts, score, load, human] = await Promise.all(['src/cube/builder.ts', 'src/cube/facts.ts', 'src/cube/score.ts', 'src/cube/testdata/load.ts', 'src/cube/human.ts'].map(imp));
  const doc = load.loadCube(cube);
  const hf = path.resolve(fcRoot, 'public/cubes', `${load.cubeFile(cube)}.human.json`);
  const h = fs.existsSync(hf) ? human.parseHumanCards(JSON.parse(fs.readFileSync(hf, 'utf8'))) : null;
  return { B, castableIn: facts.castableIn, ctx: score.makeContext(doc, load.loadInfos(cube, doc), load.loadRealMeta(cube), h) };
}

const remove1 = (xs: string[], x: string): string[] => { const i = xs.indexOf(x); return i < 0 ? xs : [...xs.slice(0, i), ...xs.slice(i + 1)]; };
const legal = (fc: FC, pool: string[], b: Build): boolean => b.missing === 0 && fc.B.checkBuild(b, pool, fc.ctx).length === 0 && b.splashCards.length <= 3;

/** The best legal build among `spellLists` (ties: the first), at `lands` lands, in `b`'s colours and splash. */
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
    return !!f && !f.land && fc.castableIn(f, allowed);
  }).sort();

/** One land more (cut a spell) or fewer (add a spell), keeping colours and splash. */
export function stepLands(fc: FC, pool: string[], b: Build, dir: 1 | -1): Build | null {
  const lists = dir === 1
    ? [...new Set(b.spells)].sort().map((s) => remove1(b.spells, s))
    : sideSpells(fc, pool, b.spells, b.colors + (b.splash ?? '')).map((s) => [...b.spells, s]);
  return best(fc, pool, b, b.splash, lists, b.landCount + dir);
}

/** ForgeCoach's splash cut: each splash card swapped for the best on-colour sideboard spell; null when none is left. */
export function noSplash(fc: FC, pool: string[], b: Build): Build | null {
  if (!b.splash) return null;
  let cur: Build = b;
  for (let i = 0; i < b.splashCards.length; i++) {
    const base = remove1(cur.spells, b.splashCards[i] as string);
    // the splash (its basics and duals) stays until its last card is gone
    const next = best(fc, pool, cur, i === b.splashCards.length - 1 ? null : b.splash, sideSpells(fc, pool, base, b.colors).map((x) => [...base, x]), b.landCount);
    if (!next) return null;
    cur = next;
  }
  return cur.splashCards.length === 0 ? cur : null;
}

export interface PoolVariants { fc: Build; l16: Build | null; l17: Build | null; l18: Build | null; nospl: Build | null }

export function variantsOf(fc: FC, pool: string[]): PoolVariants | null {
  const top = fc.B.buildDecks(fc.ctx, pool, {}, 1)[0];
  if (!top || !legal(fc, pool, top) || top.landCount < 16 || top.landCount > 18) return null;
  const at: Record<number, Build | null> = { [top.landCount]: top };
  for (let k = top.landCount + 1; k <= 18; k++) at[k] = at[k - 1] ? stepLands(fc, pool, at[k - 1] as Build, 1) : null;
  for (let k = top.landCount - 1; k >= 16; k--) at[k] = at[k + 1] ? stepLands(fc, pool, at[k + 1] as Build, -1) : null;
  return { fc: top, l16: at[16] ?? null, l17: at[17] ?? null, l18: at[18] ?? null, nospl: noSplash(fc, pool, top) };
}

/** Forge's .dck, the cube lab's layout, in the pool's own (Forge) names. */
export function dck(fc: FC, b: Build, pool: string[], forgeName: (n: string) => string, name: string): string {
  const lines = ['[metadata]', `Name=${name}`, '[Main]', ...fc.B.mainDeck(b).map(([n, c]) => `${n} ${forgeName(c)}`), '[Sideboard]'];
  const side = new Map<string, number>();
  for (const c of fc.B.sideboard(b, pool)) side.set(forgeName(c), (side.get(forgeName(c)) ?? 0) + 1);
  for (const [c, n] of side) lines.push(`${n} ${c}`);
  return `${lines.join('\n')}\n`;
}

interface DraftLine { seed: number; drafters: Array<{ seat: string; pool: string[]; deckFile: string | null; forgeDeckFile: string | null }> }
export interface Manifest { cube: string; seed: number; seat: string; search: boolean; fcKey: string; fcLands: number; fcSplash: string | null; opp: string; arms: Record<string, string | null>; unknown: string[] }

/** `build --forgecoach DIR --out DIR --run cube=DIR... [--search-drafts N]`. */
export async function build(a: Map<string, string[]>): Promise<number> {
  const out = one(a, 'out'), fcRoot = one(a, 'forgecoach'), searchN = Number(one(a, 'search-drafts', '0'));
  fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
  const rows: Manifest[] = [];
  for (const spec of a.get('run') ?? []) {
    const [cube, dir] = spec.split('=') as [string, string];
    const fc = await loadFC(fcRoot, cube);
    const byNorm = new Map([...fc.ctx.facts.keys()].map((n) => [norm(n), n]));
    const drafts = fs.readFileSync(path.join(dir, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftLine).sort((x, y) => x.seed - y.seed);
    drafts.forEach((d, i) => {
      if (d.drafters.some((s) => !s.deckFile || !s.forgeDeckFile || !fs.existsSync(path.join(dir, s.deckFile)) || !fs.existsSync(path.join(dir, s.forgeDeckFile)))) return;
      d.drafters.forEach((s, k) => {
        const toFc = new Map<string, string>(), toForge = new Map<string, string>(), unknown: string[] = [];
        for (const n of s.pool) { const m = byNorm.get(norm(n)); if (m) { toFc.set(n, m); toForge.set(m, n); } else unknown.push(n); }
        const pool = s.pool.map((n) => toFc.get(n)).filter((n): n is string => !!n);
        const v = variantsOf(fc, pool);
        if (!v) return;
        const file = (arm: string, b: Build | null): string | null => {
          if (!b) return null;
          if (arm !== 'fc' && b === v.fc) return path.join(out, 'decks', `${cube}-${d.seed}-${s.seat}-fc.dck`);
          const f = path.join(out, 'decks', `${cube}-${d.seed}-${s.seat}-${arm}.dck`);
          fs.writeFileSync(f, dck(fc, b, pool, (c) => toForge.get(c) ?? c, `j121 ${cube} ${d.seed} ${s.seat} ${arm}`));
          return f;
        };
        const opp = d.drafters[1 - k] as DraftLine['drafters'][number];
        rows.push({
          cube, seed: d.seed, seat: s.seat, search: i < searchN, fcKey: v.fc.key, fcLands: v.fc.landCount, fcSplash: v.fc.splash,
          opp: path.join(dir, opp.deckFile as string), unknown,
          arms: { fc: file('fc', v.fc), lab: path.join(dir, s.deckFile as string), forge: path.join(dir, s.forgeDeckFile as string), l16: file('l16', v.l16), l17: file('l17', v.l17), l18: file('l18', v.l18), nospl: file('nospl', v.nospl) },
        });
      });
    });
  }
  // Pool by pool (cubes interleaved by draft order), each deck once: a stopped run covers whole pools of both cubes.
  rows.sort((x, y) => x.seed - y.seed || (x.cube < y.cube ? -1 : x.cube > y.cube ? 1 : 0) || (x.seat < y.seat ? -1 : 1));
  const pairs = (keep: (m: Manifest) => boolean, arms: string[]): string[] => rows.filter(keep).flatMap((m) =>
    [...new Set(arms.map((x) => m.arms[x]).filter((p): p is string => !!p))].map((p) => `${p} ${m.opp}   # ${m.cube} ${m.seed} ${m.seat}`));
  const forge = pairs(() => true, ['fc', 'lab', 'forge', 'l16', 'l17', 'l18', 'nospl']);
  const search = pairs((m) => m.search, ['fc', 'l16', 'l17', 'l18', 'nospl']);
  fs.writeFileSync(path.join(out, 'manifest.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'pairs-forge.txt'), forge.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'pairs-search.txt'), search.join('\n') + '\n');
  const count = (f: (m: Manifest) => boolean) => rows.filter(f).length;
  const summary = {
    written: 1, pools: rows.length, search_pools: count((m) => m.search), forge_pairs: forge.length, search_pairs: search.length,
    fc16: count((m) => m.fcLands === 16), fc17: count((m) => m.fcLands === 17), fc18: count((m) => m.fcLands === 18), fc_splash: count((m) => !!m.fcSplash),
    has_l16: count((m) => !!m.arms.l16), has_l17: count((m) => !!m.arms.l17), has_l18: count((m) => !!m.arms.l18), has_nospl: count((m) => !!m.arms.nospl),
    unknown_cards: rows.reduce((s, m) => s + m.unknown.length, 0),
  };
  fs.writeFileSync(path.join(out, 'variants.json'), JSON.stringify(summary) + '\n');
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return 0;
}

// ---------------------------------------------------------------- read (J121's pre-registered contrasts)

/** [score sum, games] per focus deck path; a game scores 1 / 0 / ½ (draw or timeout); an engine error is left out. */
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

export interface Contrast { id: string; x: string; y: string; where?: (m: Manifest) => boolean }
/** Primary (the rule's five), then descriptive. x − y: the variant's score minus the reference's. */
export const PRIMARY: Contrast[] = [
  { id: 'lands16', x: 'l16', y: 'l17' }, { id: 'lands18', x: 'l18', y: 'l17' }, { id: 'nosplash', x: 'nospl', y: 'fc' },
  { id: 'lab', x: 'lab', y: 'fc' }, { id: 'forge', x: 'forge', y: 'fc' },
];
export const DESCRIPTIVE: Contrast[] = [
  { id: 'fc16_vs_17', x: 'fc', y: 'l17', where: (m) => m.fcLands === 16 }, { id: 'l16_at17', x: 'l16', y: 'l17', where: (m) => m.fcLands === 17 },
  { id: 'l18_at17', x: 'l18', y: 'l17', where: (m) => m.fcLands === 17 },
];

export interface Est { pools: number; drafts: number; est: number; se: number; lo95: number; hi95: number; lo99: number; hi99: number }

/** Paired by pool (both decks played the same opponent deck), clustered by draft (its two seats share the draft). */
export function contrast(rows: Manifest[], t: Map<string, [number, number]>, c: Contrast): Est | null {
  const byDraft = new Map<string, number[]>();
  for (const m of rows) {
    if (c.where && !c.where(m)) continue;
    const px = m.arms[c.x], py = m.arms[c.y];
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

/** The rule: 1 = the variant (x) shown better, −1 = the reference (y) shown better, 0 = not shown (Forge Default's 99% interval);
 * the decision for lands16, lands18 and nosplash also needs search-v2's point estimate on the same side. */
export function verdict(f: Est | null, s: Est | null, guarded: boolean): { verdict: number; decision: number } {
  const v = !f ? 0 : f.lo99 > 0 ? 1 : f.hi99 < 0 ? -1 : 0;
  return { verdict: v, decision: v !== 0 && (!guarded || (s !== null && Math.sign(s.est) === v)) ? v : 0 };
}

function shardLines(dir: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^shard-\d+\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter((l) => l.endsWith('}')).map((l) => JSON.parse(l) as Record<string, unknown>));
}

/** `read --manifest FILE --forge-run DIR --search-run DIR --out DIR`: metrics.json (flat) and summary.md. */
export function read(a: Map<string, string[]>): number {
  const rows = fs.readFileSync(one(a, 'manifest'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Manifest);
  const tf = tally(shardLines(one(a, 'forge-run'))), ts = tally(shardLines(one(a, 'search-run')));
  const flat: Record<string, number> = { written: 1, pools: rows.length };
  const md = ['# J121: which deck choices win more (paired by pool, clustered by draft)', '',
    'Score = the variant\'s game score minus the reference\'s on the same pool against the same opponent deck (+0.02 = 2 points).', '',
    '| contrast | pilot | cube | pools | est | 95% | 99% | verdict |', '|---|---|---|---|---|---|---|---|'];
  const fmt = (e: Est | null) => (e ? `${e.pools} | ${e.est} | [${e.lo95}, ${e.hi95}] | [${e.lo99}, ${e.hi99}]` : '0 | - | - | -');
  for (const c of [...PRIMARY, ...DESCRIPTIVE]) {
    const primary = PRIMARY.includes(c), guarded = primary && ['lands16', 'lands18', 'nosplash'].includes(c.id);
    const f = contrast(rows, tf, c), s = guarded || !primary ? contrast(rows.filter((m) => m.search), ts, c) : null;
    for (const [p, e] of [['f', f], ['s', s]] as const) if (e) for (const [k, v] of Object.entries(e)) flat[`${p}_${c.id}_${k}`] = v;
    const v = verdict(f, s, guarded);
    if (primary) { flat[`${c.id}_verdict`] = v.verdict; flat[`${c.id}_decision`] = v.decision; }
    const words = !primary ? 'description' : v.decision === 1 ? `${c.x} better` : v.decision === -1 ? `${c.y} better` : v.verdict !== 0 ? 'not shown (search-v2 disagrees)' : 'not shown';
    md.push(`| ${c.id} (${c.x} − ${c.y}) | Forge Default | both | ${fmt(f)} | ${words} |`);
    for (const cube of [...new Set(rows.map((m) => m.cube))]) md.push(`| ${c.id} | Forge Default | ${cube} | ${fmt(contrast(rows.filter((m) => m.cube === cube), tf, c))} | description |`);
    if (s || guarded) md.push(`| ${c.id} | search-v2 | both | ${fmt(s)} | guard: sign only |`);
  }
  fs.mkdirSync(one(a, 'out'), { recursive: true });
  fs.writeFileSync(path.join(one(a, 'out'), 'metrics.json'), JSON.stringify(flat) + '\n');
  fs.writeFileSync(path.join(one(a, 'out'), 'summary.md'), md.join('\n') + '\n\nAn interval that includes 0 is "not shown", never "no effect".\n');
  process.stdout.write(`${md.join('\n')}\n`);
  return 0;
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
  (cmd === 'build' ? build(a) : cmd === 'read' ? Promise.resolve(read(a)) : Promise.reject(new Error('usage: variants.ts build|read --flag value ...')))
    .then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
}
J121EOF
sha256sum var/lab-j121-tools/variants.mts
for c in vintage-cube-180 evybaby-cube-360; do
  tools/cubelab.sh run cubes/$c.md --format grid --drafts 4 --games 0 --jobs {workers} --seed 812000001 --profiles Default,Default --out $P/drafts-${c%%-*}
done
node --experimental-transform-types --no-warnings var/lab-j121-tools/variants.mts build --forgecoach {ForgeCoach} --out $P/variants --run vintage=$P/drafts-vintage --run evybaby=$P/drafts-evybaby --search-drafts 1
./tools/ai-bench.sh play --pairs $P/variants/pairs-forge.txt --a Default --b Default --games 2 --seed 120 --no-mirror --timeout 300 --run j121-pilot-forge --jobs {workers}
head -4 $P/variants/pairs-search.txt > $P/variants/pairs-search-4.txt
./tools/ai-bench.sh play --pairs $P/variants/pairs-search-4.txt --a 'Default+outlets+search:anytime=1' --b 'Default+outlets+search:anytime=1' --games 2 --seed 120 --no-mirror --timeout 900 --run j121-pilot-search --jobs {workers}
node --experimental-transform-types --no-warnings var/lab-j121-tools/variants.mts read --manifest $P/variants/manifest.jsonl --forge-run var/ai-bench/j121-pilot-forge --search-run var/ai-bench/j121-pilot-search --out $P/out
```
metrics: pd = cubelab var/lab-j121-pilot/drafts-vintage var/lab-j121-pilot/drafts-evybaby
metrics: pv = sh: cat var/lab-j121-pilot/variants/variants.json 2>/dev/null || echo '{"written":0}'
metrics: pf = aibench var/ai-bench/j121-pilot-forge
metrics: ps = aibench var/ai-bench/j121-pilot-search
metrics: pj = sh: cat var/lab-j121-pilot/out/metrics.json 2>/dev/null || echo '{"written":0}'
check: qwriters == 0
check: disk_gb >= 20
check: pd.drafts == 8
check: pv.written == 1
check: pv.pools >= 12
check: pv.unknown_cards == 0
check: pv.has_l16 + pv.has_l17 + pv.has_l18 >= 3 * pv.pools - 2
check: pv.forge_pairs >= 4 * pv.pools
check: pf.games == 2 * pv.forge_pairs
check: pf.errors + pf.timeouts <= 1
check: pf.searched_decisions == 0
check: pf.mean_game_s between 0.5 and 7
check: ps.games == 8
check: ps.errors + ps.timeouts == 0
check: ps.searched_decisions >= 20
check: ps.mean_game_s between 15 and 75
check: pj.written == 1
check: pj.f_lab_pools >= 12

What the checks say:
- The drafts and both of the lab's builders ran, and ForgeCoach's builder read every pool card by name.
- Nearly every pool has all three land counts, and at least four decks.
- Every Forge game was played, plain Forge (no searched decision), at most 7 s a game: the Forge arm fits in about
  9 h at worst on 7 workers.
- search-v2 really searched, at most 75 s a game: the search arm fits in about 9 h at worst.
- The read ran on the pilot's games.
There are no win-rate bounds.

## Commands
The drafts and the variants first (fast), then the Forge arm, then the search arm, then the read. `resumable: yes`:
`cubelab.sh run` on the same `--out` skips seeds already in its `drafts.jsonl`, `ai-bench.sh play` on the same `--run`
skips games already in its shards (D337), and `variants.ts build` writes the same files from the same drafts.
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J121
mkdir -p var/lab-j121
for c in vintage-cube-180 evybaby-cube-360; do
  tools/cubelab.sh run cubes/$c.md --format grid --drafts 800 --games 0 --jobs {workers} --seed 812000001 --profiles Default,Default --out var/lab-j121/drafts-${c%%-*}
done
node --experimental-transform-types --no-warnings var/lab-j121-tools/variants.mts build --forgecoach {ForgeCoach} --out var/lab-j121/variants --run vintage=var/lab-j121/drafts-vintage --run evybaby=var/lab-j121/drafts-evybaby --search-drafts 120
```
```bash
./tools/ai-bench.sh play --pairs var/lab-j121/variants/pairs-forge.txt --a Default --b Default --games 2 --seed 120 --no-mirror --timeout 300 --run j121-forge --jobs {workers}
```
```bash
./tools/ai-bench.sh play --pairs var/lab-j121/variants/pairs-search.txt --a 'Default+outlets+search:anytime=1' --b 'Default+outlets+search:anytime=1' --games 2 --seed 120 --no-mirror --timeout 900 --run j121-search --jobs {workers}
```
cores: 1
```bash
node --experimental-transform-types --no-warnings var/lab-j121-tools/variants.mts read --manifest var/lab-j121/variants/manifest.jsonl --forge-run var/ai-bench/j121-forge --search-run var/ai-bench/j121-search --out var/lab-j121/out
```
check: dv.drafts == 800
check: de.drafts == 800
check: vf.written == 1
check: vf.unknown_cards == 0
check: vf.pools >= 3000
check: vf.search_pools >= 440
check: f.games == 2 * vf.forge_pairs
check: s.games == 2 * vf.search_pairs
check: f.error_rate <= 1%
check: f.searched_decisions == 0
check: s.errors + s.timeouts <= s.games / 50
check: s.mean_game_s >= 15
check: jr.written == 1
check: jr.lands16_decision between -1 and 1
check: jr.f_lab_pools >= 3000

The checks only say the run is whole: every draft, every pool's decks, every game of both arms, few engine errors,
plain Forge on one arm and a searching seat on the other, and the read written. The decisions are the `rule:`, read from
`jr.<contrast>_decision` (1 = the variant shown better, -1 = the reference shown better, 0 = not shown), never a check:
"not shown" everywhere is a finished job with an answer.

## Abort if
abort: qwriters > 0
abort: disk_gb < 10
abort: stopfile > 0
abort: f.games >= 500 and f.error_rate > 5%
abort: s.games >= 100 and s.errors + s.timeouts > s.games / 10

A queue night starting beside it, the disk running low, a stop file, or engine trouble. Nothing looks at win rates.

## Report
collect: var/lab-j121/out/summary.md
collect: var/lab-j121/out/metrics.json
collect: var/lab-j121/variants/variants.json
collect: var/lab-j121/variants/manifest.jsonl

`summary.md` is written by the job (its table). The PC session adds its reading below it, plainly:
- **Each primary contrast** (lands16, lands18, nosplash, lab, forge): the Forge arm's estimate in points with its 95% and
  99% intervals, pools and drafts; for lands16, lands18 and nosplash the search arm's estimate beside it; and the
  decision under the rule (variant better / reference better / not shown, and "not shown, search-v2 disagrees").
- **What changes in ForgeCoach**, if anything, as the rule says. lands18 shown for 18 is a note to Justin, not a change.
- **Descriptive only:** each contrast per cube; fc16_vs_17 (the deck assistant's own 16-land picks against 17 on the
  same pools), l16_at17 and l18_at17; how often fc chose 16, 17 and 18 lands and splashed (`variants.json`).
- **Cost:** each arm's games, mean game time and hours, and whether the PC was in other use while it ran.
- **An interval that includes 0 is "not shown",** never "no effect" or "no difference".

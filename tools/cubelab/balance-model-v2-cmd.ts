// mtg-table — the cube lab's `balance-model` command, model v2 (D475): drafted context, the drafter's own mix, a robust generator.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   balance-model --census <lab-j144 dir> --omega <lab-j145 dir> --night <dir> [--night <dir> ...] | --sources <dir,dir,...>
//                 --facts <facts.json> --out <dir> [--reps 200] [--seed 1] [--cubes-out <dir>] [--drafts 2000]
//                 [--exclude <file> [--suffix <text>]] [--min-gain 0.002] [--rating-window 25] [--max-swaps 40] [--no-validate] [--no-cubes]
//
// Any `--night` (or `--sources`) makes balance-model run v2; without one it is v1 (balance-model-cmd.ts, D473), byte
// for byte.  A night folder is either J145-shaped (`out/drafted-decks.jsonl.gz`, `out/games.jsonl.gz`,
// `out/balance.json`) or a report folder of per-cube files (J160's `report/`: `<cube>.drafted-decks.jsonl.gz`,
// `<cube>.games.jsonl.gz`, `<cube>.balance.json`).  Each deck names its cube (`band: cube:<id>`), found under `cubes/` as
// `<id>.md`.  `--omega` (J145) is what v1's mix and play curve came from, so the validation can put v1 beside v2; it is
// read as a night too.  balance-model.ts is the model; D475 is the decision; docs/guides/cube-lab.md the manual.
//
// What v2 does, in order (each step's numbers land in model.json and summary.md):
//   1. the census fits v1 makes (legacy + powered, pauper; makeup groups);
//   2. the DRAFTED fit: every arm-B game of every night, decks clustered by draft, makeup groups by band, each deck's
//      census strength (the sum of its cards' census values) as a covariate with a free coefficient alpha per band,
//      and card terms ridge-shrunk toward alpha x census value — a card with little drafted data keeps its census
//      value, one with a lot moves to what drafted decks say.  The penalty, and the choice between census values,
//      drafted values and this blend, by 5-fold CV BY DRAFT (no draft on both sides);
//   3. the drafter's mix per band (two- and three-colour shares, cards per class, the play curve) and each card's
//      draft concentration, measured on the lab drafter's decks;
//   4. the leave-one-night-out validation: every measured cube re-predicted with the drafted fit refitted without its
//      night, v1's prediction beside it; and the same leaving out the cube (every night of it) instead;
//   5. the generator: v1's flow on the v2 values, then the robust search on the lab drafter's own decks (the TS
//      drafter, the same code and weights a night drafts with, at fresh seeds), judged on bootstrap replicates the
//      search never saw, with the model's transfer error from step 4 in every predicted interval.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import {
  balanceSearchRobust, bootstrapFit, buildDesign, cellGap, CELL_KEYS, classSummary, concentration, crossValidate, DEFAULT_GEN, DEFAULT_PENALTY, estimateMix, generateCube,
  groupOf, parseExcludeList, playCurve, playShares, predictDecks, predictPayoffs, predictPayoffsV2, quantile, robustGap, sdOf, solveRidge,
  type DeckLite, type DeckMix, type DeckMixV2, type GenCard, type GenOptions, type MDeck, type MGame, type PayoffPrediction,
} from './balance-model.ts';
import { decisive, fitSource, gzLines, toDeck, valueFn, type RawDeck, type RawGame, type Source } from './balance-model-cmd.ts';
import { parseCensus } from './census.ts';
import type { Fact } from './cards.ts';
import { parseCube } from './cube.ts';
import { parseManaCost } from './deckcensus.ts';
import { loadCube, runDraft } from './lab.ts';
import { parseLibraryPool } from './library-candidates.ts';
import { initialRating } from './ratings.ts';
import { joinCensus, structurePlan, type SampleCard } from './sample.ts';
import { cubeDocument, MONO, PAIRS, planErrors } from './skeleton.ts';
import { DEFAULT_WEIGHTS } from './weights.ts';
import { rng } from './rng.ts';

type Flags = Map<string, string[]>;
const one = (f: Flags, k: string): string | undefined => f.get(k)?.at(-1);
const f3 = (x: number): string => (Number.isFinite(x) ? x.toFixed(3) : '—');
const pts = (x: number): string => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}` : '—');
const sha = (file: string): string => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** The two value scales a cube can be read on: the legacy + powered census or the pauper one (v1's choice, by the cube's majority band). */
export type Scale = 'legacy' | 'pauper';

/** The lambdas the drafted fit's CV tries. */
export const DRAFTED_LAMBDAS = [400, 800, 1600, 3200, 6400];
/** Seeds for the lab drafter's simulated drafts: far from every night's (8xx,xxx,xxx). */
export const SIM_SEED = 947_500_001;
/** A pair the night would judge: 400+ deck-games (J145's rule); a simulated pairing stands for two games, four deck-games. */
export const QUALIFY = 400;

// ------------------------------------------------------------------ the nights

export interface NightCube {
  night: string; cube: string; cubeFile: string; scale: Scale;
  decks: Array<MDeck & { run: string }>; games: MGame[];
  blab: { colour: Record<string, { est: number; lo: number; hi: number; n: number }>; pairs: Record<string, { est: number; lo: number; hi: number; n: number }> } | null;
  files: string[];
  /** The lab arm's run.json, when the night folder keeps it: the ratings file the drafter picked by (null = Forge's ranks) and whether its weights are the defaults the simulation uses. */
  labRun: { file: string; ratingsFile: string | null; ratingsSha256: string | null; weightsDefault: boolean } | null;
}

function findCube(repo: string, id: string): string {
  const hits: string[] = [];
  const walk = (d: string): void => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === `${id}.md`) hits.push(p); } };
  walk(path.join(repo, 'cubes'));
  if (hits.length !== 1) throw new Error(`balance-model: cube ${id} found ${hits.length} times under cubes/ (${hits.join(', ')})`);
  return hits[0] as string;
}

/** A night folder's cubes: J145-shaped (`out/`) or a report folder of per-cube files. */
export function loadNight(repo: string, dir: string, scaleOf: (cubeFile: string) => Scale): NightCube[] {
  const base = path.basename(dir);
  const night = base === 'report' || base === 'out' ? path.basename(path.dirname(dir)) : base;
  const sets: Array<{ decks: string; games: string; balance: string }> = [];
  if (fs.existsSync(path.join(dir, 'out/drafted-decks.jsonl.gz'))) sets.push({ decks: path.join(dir, 'out/drafted-decks.jsonl.gz'), games: path.join(dir, 'out/games.jsonl.gz'), balance: path.join(dir, 'out/balance.json') });
  else for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.drafted-decks.jsonl.gz')).sort()) {
    const id = f.replace(/\.drafted-decks\.jsonl\.gz$/, '');
    sets.push({ decks: path.join(dir, f), games: path.join(dir, `${id}.games.jsonl.gz`), balance: path.join(dir, `${id}.balance.json`) });
  }
  if (!sets.length) throw new Error(`balance-model: ${dir} holds no drafted decks (out/drafted-decks.jsonl.gz or <cube>.drafted-decks.jsonl.gz)`);
  return sets.map((s) => {
    const raw = gzLines<RawDeck & { draft: number; run: string }>(s.decks);
    const ids = [...new Set(raw.map((d) => d.band ?? ''))];
    if (ids.length !== 1 || !ids[0]?.startsWith('cube:')) throw new Error(`balance-model: ${s.decks} holds decks of ${ids.join(', ')}; one cube a file`);
    const cube = (ids[0] as string).slice(5);
    const cubeFile = findCube(repo, cube);
    const scale = scaleOf(cubeFile);
    const decks = raw.map((d) => ({ ...toDeck(d, `${night}:${cube}:${d.run}:${d.draft}`, scale), id: `${night}/${cube}/${d.id}`, run: d.run }));
    const own = new Set(raw.map((d) => d.id));
    const games = decisive(gzLines<RawGame>(s.games).filter((g) => own.has(g.a) && own.has(g.b))).map((g) => ({ ...g, a: `${night}/${cube}/${g.a}`, b: `${night}/${cube}/${g.b}` }));
    const bal = fs.existsSync(s.balance) ? (JSON.parse(fs.readFileSync(s.balance, 'utf8')) as { payoff: Record<string, NightCube['blab']> }).payoff.Blab ?? null : null;
    const runJson = [path.join(dir, 'runs/lab/run.json'), path.join(path.dirname(dir), cube, 'runs/lab/run.json')].find((p) => fs.existsSync(p));
    const labRun = runJson ? (() => {
      const rj = JSON.parse(fs.readFileSync(runJson, 'utf8')) as { ratingsFile?: string | null; weights?: Record<string, unknown>; versions?: Array<{ ratingsSha256?: string | null }> };
      return { file: runJson, ratingsFile: rj.ratingsFile ?? null, ratingsSha256: rj.versions?.at(-1)?.ratingsSha256 ?? null, weightsDefault: JSON.stringify(rj.weights ?? {}) === JSON.stringify(DEFAULT_WEIGHTS) };
    })() : null;
    return { night, cube, cubeFile, scale, decks, games, blab: bal, files: [s.decks, s.games, ...(fs.existsSync(s.balance) ? [s.balance] : [])], labRun };
  });
}

// ------------------------------------------------------------------ the lab drafter, simulated

export interface SimDeck extends DeckLite { mainShare: number; stratum: string }

/** A deck's colours with 3+ spells and its main colour's pip share, from the facts' costs (the profile a night records; checked equal on 32,800 recorded decks). */
export function profileFromFacts(spells: string[], factBy: Map<string, Fact>): { colours: string; mainShare: number } {
  const pips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 }, by: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const s of spells) {
    const f = factBy.get(s);
    const cost = parseManaCost((f?.manaCost ?? '').replace(/[{}]/g, ' '));
    const cols = new Set([...(f?.colors ?? ''), ...Object.keys(cost.share)]);
    for (const c of MONO) if (cols.has(c)) by[c] = (by[c] as number) + 1;
    for (const [c, n] of Object.entries(cost.share)) pips[c] = (pips[c] as number) + (n as number);
  }
  const tot = MONO.reduce((a, c) => a + (pips[c] as number), 0);
  let main: string | null = null;
  for (const c of MONO) if (tot > 0 && (main === null || (pips[c] as number) > (pips[main] as number) + 1e-12)) main = c;
  return { colours: MONO.filter((c) => (by[c] as number) >= 3).join(''), mainShare: main ? Math.round(((pips[main] as number) / tot) * 1e4) / 1e4 : 1 };
}

/** `drafts` grid drafts of a cube document by the lab drafter (lab.ts, DEFAULT_WEIGHTS, Forge's ranks), both seats' decks paired. */
export function simulateDrafts(cubeText: string, facts: Fact[], factBy: Map<string, Fact>, drafts: number, seed0: number, stratum: string): Array<[SimDeck, SimDeck]> {
  const lc = loadCube(parseCube(cubeText), facts, null, DEFAULT_WEIGHTS);
  if (lc.missing.length) throw new Error(`balance-model: the facts lack ${lc.missing.length} of the cube's cards (${lc.missing.slice(0, 3).map((m) => m.listed).join(', ')})`);
  const nonland = new Set(lc.cards.filter((c) => !c.land).map((c) => c.name));
  const out: Array<[SimDeck, SimDeck]> = [];
  for (let i = 0; i < drafts; i++) {
    const d = runDraft(lc, 'grid', seed0 + i, DEFAULT_WEIGHTS);
    const two = d.drafters.map((dr) => {
      if (!dr.deck) return null;
      const spells = dr.deck.main.map(([, n]) => n).filter((n) => nonland.has(n));
      return { spells, ...profileFromFacts(spells, factBy), stratum };
    });
    if (two[0] && two[1]) out.push([two[0], two[1]]);
  }
  return out;
}

// ------------------------------------------------------------------ the drafted fit

export interface DraftedFit {
  lambda: number; beta: Float64Array; reps: Float64Array[]; cards: string[]; groups: string[]; covs: string[];
  alpha: Record<string, number>;
  /** A card's drafted-context value on a scale (alpha x census + its own term), point (rep -1) or replicate. */
  value: (scale: Scale, name: string, rep: number) => number;
  group: (d: Pick<MDeck, 'colours' | 'mainShare'>, scale: Scale, rep: number) => number;
  deckGames: Map<string, number>; decks: Map<string, number>;
}

function draftedFit(nights: NightCube[], census: Record<Scale, Source>, lambda: number, reps: number, seed: number, usePrior = true): DraftedFit {
  const cv = { legacy: valueFn(census.legacy), pauper: valueFn(census.pauper) };
  const decks: MDeck[] = nights.flatMap((n) => n.decks.map((d) => (usePrior ? { ...d, prior: d.spells.reduce((s, c) => s + cv[n.scale](c, -1), 0), priorKey: n.scale } : { ...d })));
  const ds = buildDesign(decks, nights.flatMap((n) => n.games), 'makeup');
  const pen = { ...DEFAULT_PENALTY, card: lambda };
  const beta = solveRidge(ds, pen);
  const scaleOfDeck = nights.flatMap((n) => n.decks.map(() => n.scale));
  const priorOf = (b: number): Float64Array => Float64Array.from(decks, (d, i) => (d.prior === undefined ? 0 : d.spells.reduce((s, c) => s + cv[scaleOfDeck[i] as Scale](c, b), 0)));
  const repsOut = reps > 0 ? bootstrapFit(ds, pen, beta, reps, seed, usePrior ? priorOf : undefined) : [];
  const nc = ds.cards.length, ng = ds.groups.length;
  const ix = new Map(ds.cards.map((c, i) => [c, i]));
  const gx = new Map(ds.groups.map((g, j) => [g, nc + j]));
  const cx = new Map(ds.covs.map((k, j) => [k, nc + ng + j]));
  const at = (rep: number): Float64Array => (rep < 0 ? beta : (repsOut[rep] as Float64Array));
  const value = (scale: Scale, name: string, rep: number): number => {
    const b = at(rep), i = ix.get(name), a = cx.get(scale);
    return (i === undefined ? 0 : (b[i] as number)) + (a === undefined ? 0 : (b[a] as number) * cv[scale](name, rep < 0 ? -1 : rep));
  };
  const group = (d: Pick<MDeck, 'colours' | 'mainShare'>, scale: Scale, rep: number): number => { const j = gx.get(groupOf({ ...d, stratum: scale }, 'makeup')); return j === undefined ? 0 : (at(rep)[j] as number); };
  return {
    lambda, beta, reps: repsOut, cards: ds.cards, groups: ds.groups, covs: ds.covs, alpha: Object.fromEntries(ds.covs.map((k) => [k, beta[cx.get(k) as number] as number])), value, group,
    deckGames: new Map(ds.cards.map((c, i) => [c, ds.cardGames[i] as number])), decks: new Map(ds.cards.map((c, i) => [c, ds.cardDecks[i] as number])),
  };
}

// ------------------------------------------------------------------ the command

interface Cell { est: number; lo?: number; hi?: number; n?: number }
interface Scored { c: number; p: number; sc: number; n: number; sp: number; np: number; bias: Record<string, number> }

function score(nc: NightCube, pred: Record<string, number>): Scored {
  const b = nc.blab as NonNullable<NightCube['blab']>;
  let sc = 0, n = 0, sp = 0, np = 0;
  const bias: Record<string, number> = {};
  for (const k of MONO) { const d = (b.colour[k] as Cell).est - (pred[k] as number); sc += d * d; n++; bias[k] = d; }
  for (const k of PAIRS) { const m = b.pairs[k] as Cell & { n: number }; if (m.n < QUALIFY) continue; const d = m.est - (pred[k] as number); sp += d * d; np++; bias[k] = d; }
  return { c: Math.sqrt(sc / n), p: np ? Math.sqrt(sp / np) : NaN, sc, n, sp, np, bias };
}
const flat = (p: PayoffPrediction): Record<string, number> => Object.fromEntries([...MONO.map((c) => [c, (p.colour[c] as Cell).est]), ...PAIRS.map((q) => [q, (p.pair[q] as Cell).est])]);

export function balanceModelV2Command(repo: string, f: Flags, say: (s: string) => void): number {
  const censusDir = one(f, 'census'), factsFile = one(f, 'facts'), out = one(f, 'out'), omegaDir = one(f, 'omega');
  if (!censusDir || !factsFile || !out || !omegaDir) throw new Error('balance-model v2 needs --census <lab-j144> --omega <lab-j145> --night <dir> ... --facts <facts.json> --out <dir>');
  const nightDirs = [...(f.get('night') ?? []), ...(f.get('sources') ?? []).flatMap((s) => s.split(',')).filter(Boolean)].map((d) => path.resolve(repo, d));
  if (!nightDirs.some((d) => path.resolve(d) === path.resolve(repo, omegaDir))) nightDirs.unshift(path.resolve(repo, omegaDir));
  const reps = Number(one(f, 'reps') ?? 200), seed = Number(one(f, 'seed') ?? 1), drafts = Number(one(f, 'drafts') ?? 2000);
  const cubesOut = one(f, 'cubes-out') ?? path.join(out, 'cubes');
  const excludeFile = one(f, 'exclude');
  const suffix = one(f, 'suffix') ?? '';
  if (suffix && !/^[-a-z0-9]+$/.test(suffix)) throw new Error(`balance-model: --suffix wants lower-case letters, digits and '-', got ${suffix}`);
  const minGain = Number(one(f, 'min-gain') ?? 0.002), ratingWindow = Number(one(f, 'rating-window') ?? 25), maxSwaps = Number(one(f, 'max-swaps') ?? 40);
  if (!(minGain >= 0) || !(ratingWindow >= 0) || !(maxSwaps >= 0)) throw new Error('balance-model v2: --min-gain, --rating-window and --max-swaps want numbers >= 0');
  if (reps < 20 || reps % 2) throw new Error('balance-model v2: --reps wants an even number, 20 or more (the search and the report each take half)');
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();

  // The library, Forge's facts and ratings.
  const lib = joinCensus(parseLibraryPool(fs.readFileSync(path.join(repo, 'cubes/library/library-pool.tsv'), 'utf8')),
    parseCensus(fs.readFileSync(path.join(repo, 'cubes/library/census.tsv'), 'utf8')));
  const libBy = new Map(lib.map((c) => [c.name, c]));
  const facts = (JSON.parse(fs.readFileSync(factsFile, 'utf8')) as { cards: Fact[] }).cards;
  const factBy = new Map<string, Fact>();
  for (const x of facts) { factBy.set(x.listed, x); if (x.name) factBy.set(x.name, x); }
  const ratingOf = (n: string): number => { const x = factBy.get(n); return x && x.found ? initialRating(x, 40).rating : 40; };
  const colorsOf = (n: string): string | undefined => libBy.get(n)?.colors;
  const excluded = new Set(excludeFile ? parseExcludeList(fs.readFileSync(excludeFile, 'utf8')) : []);
  const notInLibrary = [...excluded].filter((n) => !libBy.has(n));
  if (notInLibrary.length) throw new Error(`balance-model: ${excludeFile} names card(s) the library lacks: ${notInLibrary.join(', ')}`);
  const exclusion = excludeFile ? { file: path.relative(repo, path.resolve(excludeFile)), sha256: sha(excludeFile), names: excluded.size } : null;
  const scaleOf = (cubeFile: string): Scale => {
    const names = parseCube(fs.readFileSync(cubeFile, 'utf8')).cards.map((c) => libBy.get(c.name)).filter((c): c is SampleCard => !!c && !c.land);
    return names.filter((c) => c.band === 'pauper').length * 2 > names.length ? 'pauper' : 'legacy';
  };

  // ---- 1. the census fits (v1's: legacy + powered with makeup groups by band, and pauper)
  const rawDecks = gzLines<RawDeck>(path.join(censusDir, 'out/census-decks.jsonl.gz'));
  const rawGames = gzLines<RawGame>(path.join(censusDir, 'out/census-games.jsonl.gz'));
  const bandOfDeck = new Map(rawDecks.map((d) => [d.id, d.band as string]));
  const gamesOfBand = (b: string[]): MGame[] => decisive(rawGames.filter((g) => b.includes(bandOfDeck.get(g.a) ?? '')));
  const census: Record<Scale, Source> = {
    legacy: fitSource('legacy+powered.makeup', 'census legacy + powered bands together, makeup groups by band', rawDecks.filter((d) => d.band === 'legacy' || d.band === 'powered').map((d) => toDeck(d, d.id, d.band)), gamesOfBand(['legacy', 'powered']), 'makeup', reps, seed, say),
    pauper: fitSource('pauper.makeup', 'census pauper band (J144/J149)', rawDecks.filter((d) => d.band === 'pauper').map((d) => toDeck(d, d.id)), gamesOfBand(['pauper']), 'makeup', reps, seed, say),
  };
  const censusV = { legacy: valueFn(census.legacy), pauper: valueFn(census.pauper) };
  const censusGames = { legacy: new Map(census.legacy.effects.map((e) => [e.card, e.deckGames])), pauper: new Map(census.pauper.effects.map((e) => [e.card, e.deckGames])) };
  const censusGroup = (s: Scale) => { const src = census[s], nc = src.fit.design.cards.length; const gx = new Map(src.fit.design.groups.map((g, j) => [g, nc + j])); return (d: Pick<MDeck, 'colours' | 'mainShare'>, rep: number): number => { const j = gx.get(groupOf({ ...d, ...(s === 'legacy' ? { stratum: 'legacy' } : {}) }, 'makeup')); return j === undefined ? 0 : ((rep < 0 ? src.fit.beta : (src.fit.reps[rep] as Float64Array))[j] as number); }; };

  // ---- the nights
  const nights = nightDirs.flatMap((d) => loadNight(repo, d, scaleOf));
  for (const n of nights) say(`night ${n.night} / ${n.cube} (${n.scale}): ${n.decks.length} decks (${n.decks.filter((d) => d.run === 'lab').length} lab), ${n.games.length} decisive games${n.blab ? '' : ', no balance read'}; lab drafter ${n.labRun ? `${n.labRun.ratingsFile ? `on ratings ${n.labRun.ratingsFile} (NOT Forge's ranks, which the simulation assumes)` : 'on Forge\'s ranks'}${n.labRun.weightsDefault ? '' : ', weights NOT the defaults the simulation uses'}` : 'ratings unknown (no run.json beside the night)'}`);
  const labPairs = (n: NightCube): Array<[MDeck, MDeck]> => {
    const by = new Map(n.decks.map((d) => [d.id, d]));
    return n.games.filter((g) => by.get(g.a)?.run === 'lab' && by.get(g.b)?.run === 'lab').map((g) => [by.get(g.a) as MDeck, by.get(g.b) as MDeck]);
  };

  // ---- 2. the drafted fit: census, drafted and blend compared by CV by draft
  const allDecks = (prior: boolean): MDeck[] => nights.flatMap((n) => n.decks.map((d) => (prior ? { ...d, prior: d.spells.reduce((s, c) => s + censusV[n.scale](c, -1), 0), priorKey: n.scale } : { ...d })));
  const allGames = nights.flatMap((n) => n.games);
  const dsBlend = buildDesign(allDecks(true), allGames, 'makeup');
  const cvBlend = crossValidate(dsBlend, DRAFTED_LAMBDAS, 5, seed, DEFAULT_PENALTY, 'deck');
  const dsDrafted = buildDesign(allDecks(false), allGames, 'makeup');
  const cvDrafted = crossValidate(dsDrafted, DRAFTED_LAMBDAS, 5, seed, DEFAULT_PENALTY, 'deck');
  const cvChoice = {
    census: { brier: cvBlend.brierGroupsOnly, note: 'alpha x census values, makeup groups refitted on drafted games' },
    drafted: { brier: cvDrafted.brier, lambda: cvDrafted.lambda, note: 'card terms shrunk toward 0' },
    blend: { brier: cvBlend.brier, lambda: cvBlend.lambda, note: 'card terms shrunk toward alpha x census value' },
    groupsOnly: { brier: cvDrafted.brierGroupsOnly, note: 'makeup groups and the play only' },
    tested: cvBlend.tested, byLambdaBlend: cvBlend.byLambda, byLambdaDrafted: cvDrafted.byLambda,
  };
  const choice = (['census', 'drafted', 'blend'] as const).reduce((a, b) => (cvChoice[b].brier < cvChoice[a].brier ? b : a));
  say(`drafted CV by draft (${cvBlend.tested} games): census ${cvChoice.census.brier.toFixed(5)}, drafted ${cvChoice.drafted.brier.toFixed(5)} (lambda ${cvDrafted.lambda}), blend ${cvChoice.blend.brier.toFixed(5)} (lambda ${cvBlend.lambda}); chosen ${choice}`);
  if (choice !== 'blend') say(`balance-model: the CV chose ${choice}, not the blend; v2 still predicts with the blend at lambda ${cvBlend.lambda} — read model.json's cvChoice before trusting it`);
  const lambda = cvBlend.lambda;
  const fit = draftedFit(nights, census, lambda, reps, seed);
  const fitDraftedOnly = draftedFit(nights, census, cvDrafted.lambda, 0, seed, false);
  say(`drafted blend: ${fit.cards.length} cards, alpha ${Object.entries(fit.alpha).map(([k, a]) => `${k} ${a.toFixed(3)}`).join(', ')}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // the values table: census, drafted-only, blend
  // a card is reported on the legacy scale when any legacy-scale cube drafted it, else on the pauper one
  const onLegacy = new Set(nights.filter((n) => n.scale === 'legacy').flatMap((n) => n.decks.flatMap((d) => d.spells)));
  const scaleOfCard = (n: string): Scale => (onLegacy.has(n) ? 'legacy' : 'pauper');
  const valueRows = fit.cards.map((c) => {
    const s = scaleOfCard(c);
    const xs = fit.reps.map((_, b) => fit.value(s, c, b)).sort((a, b) => a - b);
    return { card: c, scale: s, band: libBy.get(c)?.band ?? '', colors: colorsOf(c) ?? '', rating: ratingOf(c), census: censusV[s](c, -1), censusGames: censusGames[s].get(c) ?? 0, drafted: fitDraftedOnly.value(s, c, -1), blend: fit.value(s, c, -1), sd: sdOf(xs), lo: quantile(xs, 0.025), hi: quantile(xs, 0.975), decks: fit.decks.get(c) ?? 0, deckGames: fit.deckGames.get(c) ?? 0 };
  }).sort((a, b) => b.blend - a.blend);
  fs.writeFileSync(path.join(out, 'cards-drafted.tsv'), `# balance-model v2 (D475): drafted-context card values. census = the census fit's value on the card's scale; drafted = drafted games alone (ridge to 0, lambda ${cvDrafted.lambda}); blend = alpha x census + the card's own term, ridge-shrunk toward it (lambda ${lambda}; alpha ${Object.entries(fit.alpha).map(([k, a]) => `${k} ${a.toFixed(3)}`).join(', ')}), the value v2 predicts with; sd/lo/hi its draft-bootstrap with the census's replicates as the prior. Win-rate points per game.\n`
    + `${['card', 'scale', 'band', 'colors', 'rating', 'census', 'census_deck_games', 'drafted', 'blend', 'sd', 'lo', 'hi', 'drafted_decks', 'drafted_deck_games'].join('\t')}\n`
    + valueRows.map((r) => [r.card, r.scale, r.band, r.colors, r.rating.toFixed(1), r.census.toFixed(4), r.censusGames, r.drafted.toFixed(4), r.blend.toFixed(4), r.sd.toFixed(4), r.lo.toFixed(4), r.hi.toFixed(4), r.decks, r.deckGames].join('\t')).join('\n') + '\n');

  // ---- 3. the drafter's mix, per scale, and the concentration it puts on cards
  const lab = (n: NightCube): MDeck[] => n.decks.filter((d) => d.run === 'lab');
  const cubeCards = (file: string): Array<{ name: string; colors: string; land: boolean }> => parseCube(fs.readFileSync(file, 'utf8')).cards.map((c) => ({ name: c.name, colors: colorsOf(c.name) ?? '', land: !!libBy.get(c.name)?.land }));
  const curveOf = (decks: DeckLite[], cards: Array<{ name: string; colors: string; land: boolean }>) => playCurve([...playShares(decks, cards.filter((c) => !c.land && c.colors.length <= 2))].filter(([, s]) => s.decks >= 30).map(([n, s]) => ({ rating: ratingOf(n), rate: s.share })));
  const mixes: Record<string, { mix: DeckMixV2; curve: { a: number; b: number }; cubes: string[] }> = {};
  for (const s of ['legacy', 'pauper'] as Scale[]) {
    const ns = nights.filter((n) => n.scale === s);
    if (!ns.length) continue;
    const decks = ns.flatMap(lab);
    const pts2 = ns.flatMap((n) => [...playShares(lab(n), cubeCards(n.cubeFile).filter((c) => !c.land && c.colors.length <= 2))].filter(([, x]) => x.decks >= 30).map(([name, x]) => ({ rating: ratingOf(name), rate: x.share })));
    const curve = playCurve(pts2);
    mixes[s] = { mix: estimateMix(decks, colorsOf), curve: { a: curve.a, b: curve.b }, cubes: ns.map((n) => `${n.night}/${n.cube}`) };
  }
  const perCube = nights.map((n) => ({ night: n.night, cube: n.cube, mix: estimateMix(lab(n), colorsOf), k: [1, 2, 3].map((k) => lab(n).filter((d) => d.colours.length === k).length) }));
  // concentration: the measured play share over the curve share, on each cube's actual lab decks
  const concentrationRows: Array<{ night: string; cube: string; card: string; colors: string; rating: number; share: number; kappa: number }> = [];
  for (const n of nights) {
    const cards = cubeCards(n.cubeFile);
    const m = mixes[n.scale] as { mix: DeckMixV2; curve: { a: number; b: number } };
    const w = (name: string): number => Math.min(1, Math.max(0.05, m.curve.a + m.curve.b * ratingOf(name)));
    const sh = playShares(lab(n), cards.filter((c) => !c.land));
    const kap = concentration(cards, sh, estimateMix(lab(n), colorsOf), w);
    for (const c of cards) if (!c.land && c.colors.length <= 2) concentrationRows.push({ night: n.night, cube: n.cube, card: c.name, colors: c.colors, rating: ratingOf(c.name), share: sh.get(c.name)?.share ?? NaN, kappa: kap.get(c.name) ?? 1 });
  }

  // ---- v1's mix and curve (J145's lab two-colour decks), for the v1 column
  const omegaNight = nights.find((n) => path.resolve(repo, omegaDir).endsWith(n.night) && n.cube === 'omega-cube-180') ?? nights.find((n) => n.cube === 'omega-cube-180');
  if (!omegaNight) throw new Error('balance-model v2: --omega must be a J145-shaped night of omega-cube-180 (v1\'s mix and play curve)');
  const two145 = lab(omegaNight).filter((d) => d.colours.length === 2);
  let mono = 0, gold = 0, cl = 0;
  for (const d of two145) for (const c of d.spells) { const k = colorsOf(c); if (k === undefined) continue; if (k === '') cl++; else if (k === d.colours) gold++; else if (k.length === 1 && d.colours.includes(k)) mono++; }
  const v1mix: DeckMix = { perColour: mono / two145.length / 2, gold: gold / two145.length, colourless: cl / two145.length };
  const v1pts: Array<{ rating: number; rate: number }> = [];
  for (const c of cubeCards(omegaNight.cubeFile)) { if (c.land) continue; const on = two145.filter((d) => [...c.colors].every((x) => d.colours.includes(x))); if (on.length < 30) continue; v1pts.push({ rating: ratingOf(c.name), rate: on.filter((d) => d.spells.includes(c.name)).length / on.length }); }
  const v1curve = playCurve(v1pts);

  // ---- simulated drafts, one set a cube (the lab drafter at fresh seeds: no game of any night enters them)
  const simCache = new Map<string, Array<[SimDeck, SimDeck]>>();
  const simOf = (file: string, scale: Scale, n = drafts, s0 = SIM_SEED): Array<[SimDeck, SimDeck]> => {
    const key = `${file}|${n}|${s0}`;
    let x = simCache.get(key);
    if (!x) { x = simulateDrafts(fs.readFileSync(file, 'utf8'), facts, factBy, n, s0, scale); simCache.set(key, x); }
    return x;
  };

  // ---- 4. leave-one-night-out (and leave-one-cube-out) validation
  const validate = !f.has('no-validate');
  const valRows: Array<Record<string, unknown>> = [];
  const pooled: Record<string, { sc: number; n: number; sp: number; np: number }> = {};
  const pool = (k: string, r: Scored): void => { const t = pooled[k] ?? { sc: 0, n: 0, sp: 0, np: 0 }; t.sc += r.sc; t.n += r.n; t.sp += r.sp; t.np += r.np; pooled[k] = t; };
  if (validate) {
    const fitsCache = new Map<string, DraftedFit>();
    for (const target of nights.filter((n) => n.blab)) {
      const cards = cubeCards(target.cubeFile);
      const sim = simOf(target.cubeFile, target.scale);
      const simDecks = sim.flat();
      const mixSim = estimateMix(simDecks, colorsOf);
      const curveSim = curveOf(simDecks, cards);
      const wSim = (n: string): number => curveSim.weight(ratingOf(n));
      const kap = concentration(cards, playShares(simDecks, cards.filter((c) => !c.land)), mixSim, wSim);
      const wKap = (n: string): number => wSim(n) * (kap.get(n) ?? 1);
      const cg = censusGroup(target.scale);
      const v1 = predictPayoffs(cards, (n) => censusV[target.scale](n, -1), 0, v1mix, (n) => v1curve.weight(ratingOf(n)));
      const sv1 = score(target, flat(v1));
      const cen = { v: (n: string) => censusV[target.scale](n, -1), g: (d: DeckLite & { mainShare?: number }) => cg({ colours: d.colours, mainShare: d.mainShare ?? 1 }, -1) };
      // 'night' (the headline) refits without every cube of the target's night; 'cube' without every night of the target's
      // cube; 'none' is in-sample, the target's own games in the fit: what the drafted values can carry once measured.
      for (const mode of ['night', 'cube', 'none'] as const) {
        const held = (n: NightCube): boolean => (mode === 'night' ? n.night === target.night : mode === 'cube' ? n.cube === target.cube : false);
        const key = `${mode}:${nights.filter(held).map((n) => `${n.night}/${n.cube}`).join('+')}`;
        let lf = fitsCache.get(key);
        if (!lf) { lf = mode === 'none' ? fit : draftedFit(nights.filter((n) => !held(n)), census, lambda, 0, seed); fitsCache.set(key, lf); }
        const LF = lf;
        const v = (n: string): number => LF.value(target.scale, n, -1);
        const g = (d: DeckLite & { mainShare?: number }): number => LF.group({ colours: d.colours, mainShare: d.mainShare ?? 1 }, target.scale, -1);
        const S = (d: DeckLite & { mainShare?: number }): number => d.spells.reduce((s, c) => s + v(c), 0) + g(d);
        const gk = (k: number): number => { const ds = simDecks.filter((d) => d.colours.length === k); return ds.reduce((s, d) => s + g(d), 0) / Math.max(1, ds.length); };
        const preds: Record<string, PayoffPrediction> = {
          v2: predictPayoffsV2(cards, (n) => v(n), 0, mixSim, wKap, gk),
          v2noConc: predictPayoffsV2(cards, (n) => v(n), 0, mixSim, wSim, gk),
          v2decks: predictDecks(sim, S, 0),
          v2oracle: predictDecks(labPairs(target), S, 0),
          censusSimDecks: predictDecks(sim, (d) => d.spells.reduce((s, c) => s + cen.v(c), 0) + cen.g(d), 0),
          censusOracle: predictDecks(labPairs(target), (d) => d.spells.reduce((s, c) => s + cen.v(c), 0) + cen.g(d), 0),
          censusConc: predictPayoffsV2(cards, cen.v, 0, mixSim, wKap, (k) => { const ds = simDecks.filter((d) => d.colours.length === k); return ds.reduce((s, d) => s + cen.g(d), 0) / Math.max(1, ds.length); }),
        };
        const row: Record<string, unknown> = { mode, night: target.night, cube: target.cube, heldOut: nights.filter(held).map((n) => `${n.night}/${n.cube}`), alpha: LF.alpha, v1: { rmseColour: sv1.c, rmsePair: sv1.p, nPairs: sv1.np, U: v1.colour.U?.est } };
        if (mode === 'night') pool(`${target.night}:v1`, sv1);
        for (const [k, p] of Object.entries(preds)) {
          const sc = score(target, flat(p));
          row[k] = { rmseColour: sc.c, rmsePair: sc.p, nPairs: sc.np, U: p.colour.U?.est, cells: flat(p), residual: sc.bias };
          pool(`${target.night}:${mode}:${k}`, sc);
        }
        row.measured = Object.fromEntries([...MONO.map((c) => [c, (target.blab as NonNullable<NightCube['blab']>).colour[c]]), ...PAIRS.map((q) => [q, (target.blab as NonNullable<NightCube['blab']>).pairs[q]])]);
        row.v1cells = flat(v1);
        valRows.push(row);
      }
      say(`validated ${target.night}/${target.cube}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
  const pooledOut = Object.fromEntries(Object.entries(pooled).map(([k, t]) => [k, { rmseColour: Math.sqrt(t.sc / t.n), rmsePair: t.np ? Math.sqrt(t.sp / t.np) : NaN, nColour: t.n, nPair: t.np }]));
  // The transfer error v2 still carries: night-held-out residuals beyond the reads' own noise, per source.  A NEW cube
  // (no other night drafted it: J160's five) and a RE-MEASURED one (Omega, whose other night stays in the fit) are very
  // different problems, so they are computed apart, and the generated cubes — new cubes — carry the new-cube figure.
  const isNewCube = (r: Record<string, unknown>): boolean => !nights.some((n) => n.cube === r.cube && n.night !== r.night);
  const transferOf = (rows: Array<Record<string, unknown>>) => {
    const res: { c: number[]; p: number[]; vc: number[]; vp: number[] } = { c: [], p: [], vc: [], vp: [] };
    for (const r of rows) {
      const m = r.measured as Record<string, { est: number; lo: number; hi: number; n: number }>;
      const v2 = r.v2 as { residual: Record<string, number> };
      for (const [k, d] of Object.entries(v2.residual)) { const cell = m[k] as { lo: number; hi: number }; const vr = ((cell.hi - cell.lo) / 3.92) ** 2; if (k.length === 1) { res.c.push(d); res.vc.push(vr); } else { res.p.push(d); res.vp.push(vr); } }
    }
    const ms = (xs: number[]): number => xs.reduce((a, b) => a + b * b, 0) / Math.max(1, xs.length);
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    return { colour: Math.sqrt(Math.max(0, ms(res.c) - mean(res.vc))), pair: Math.sqrt(Math.max(0, ms(res.p) - mean(res.vp))), nColour: res.c.length, nPair: res.p.length, cubes: [...new Set(rows.map((r) => `${r.night}/${r.cube}`))] };
  };
  const nightRows = valRows.filter((x) => x.mode === 'night');
  const transfer = {
    newCube: transferOf(nightRows.filter(isNewCube)),
    remeasured: transferOf(nightRows.filter((r) => !isNewCube(r))),
    pooled: transferOf(nightRows),
    byNight: Object.fromEntries([...new Set(nightRows.map((r) => r.night as string))].map((n) => [n, transferOf(nightRows.filter((r) => r.night === n))])),
    note: 'sqrt(max(0, mean squared night-held-out residual - mean read variance)); the prediction\'s own bootstrap variance is not subtracted (it is carried separately in the intervals), so this is the transfer error plus the values\' noise. newCube: cubes no other night drafted (what a generated cube is); remeasured: cubes another night in the fit drafted.',
  };
  // The floors (.015 a colour, .025 a pair) are hand-set, D473's base case and its pair analogue: a validation with no
  // new cube (or --no-validate) must not print intervals as if the model had no transfer error at all.
  const TRANSFER_FLOOR = { colour: 0.015, pair: 0.025 };
  const tSource = transfer.newCube.nColour ? transfer.newCube : transfer.pooled;
  const TRANSFER = { colour: Math.max(tSource.colour, TRANSFER_FLOOR.colour), pair: Math.max(tSource.pair, TRANSFER_FLOOR.pair), source: transfer.newCube.nColour ? 'newCube' : transfer.pooled.nColour ? 'pooled' : 'floor', floor: TRANSFER_FLOOR };

  // ---- 5. the generator
  const cubes: Array<Record<string, unknown>> = [];
  if (!f.has('no-cubes')) {
    fs.mkdirSync(cubesOut, { recursive: true });
    const plan = structurePlan('two-colour');
    const ALL = ['pauper', 'peasant', 'legacy', 'powered'];
    const evenReps = Array.from({ length: reps / 2 }, (_, i) => 2 * i), oddReps = Array.from({ length: reps / 2 }, (_, i) => 2 * i + 1);
    const vOf = (s: Scale) => (n: string, rep: number): number => fit.value(s, n, rep);
    const genPool = (s: Scale, core: string[]): Array<SampleCard & GenCard> => lib.filter((c) => !excluded.has(c.name) && ALL.includes(c.band) && c.supported && !c.basic && c.aiFlag !== 'All' && !(c.land && /\bBasic\b/.test(c.type))).map((c) => {
      const measured = (censusGames[s].get(c.name) ?? 0) >= 200 || (fit.deckGames.get(c.name) ?? 0) >= 200;
      const xs = measured ? fit.reps.map((_, b) => fit.value(s, c.name, b)) : [];
      return { ...c, creature: /\bCreature\b/.test(c.type), rating: ratingOf(c.name), value: measured ? fit.value(s, c.name, -1) : null, sd: measured ? sdOf(xs) : null, tier: core.includes(c.band) ? 0 : 1 };
    });
    const scanTarget = (pool: Array<SampleCard & GenCard>): number => {
      let best = 0;
      for (let t = 0; t <= 0.08 + 1e-9; t += 0.005) {
        try {
          const cs = generateCube(pool, plan, { ...DEFAULT_GEN, target: t });
          const nl = cs.filter((c) => !c.land && c.value !== null);
          if (nl.reduce((s, c) => s + Math.abs((c.value as number) - t), 0) / nl.length <= 0.008) best = t;
        } catch { /* a level the pool cannot fill */ }
      }
      return Math.round(best * 1000) / 1000;
    };
    const docOf = (title: string, made: string[], cs: Array<SampleCard & GenCard>): string => cubeDocument({
      title: `${title}, version 1 (180 cards, two-player)`, made, cards: cs, themeNames: {}, madeBy: '`tools/cubelab.sh balance-model`',
      notes: ['A generated cube: the cards are the library model\'s choice under the lab\'s structural rules, for measuring head to head against other candidates. It drafts on Forge\'s ranks unless a ratings file is given.'],
    });
    // The table of record for a cube: the lab drafter's own decks for it (simulated) give the mix, the play curve and each
    // card's concentration; predictPayoffsV2 gives the cells on every replicate; the gap is judged on the odd replicates
    // (the search uses the even ones), with and without the transfer error; the deck-sum on the same decks is the cross-check.
    const judge = (cs: Array<SampleCard & GenCard>, s: Scale, id: string, seed0: number) => {
      const text = docOf(id, ['(a draft of the document, for the drafter)'], cs);
      const sim = simulateDrafts(text, facts, factBy, drafts, seed0, s);
      const simDecks = sim.flat();
      const cards = cs.map((c) => ({ name: c.name, colors: c.colors, land: c.land }));
      const mix = estimateMix(simDecks, colorsOf);
      const curve = curveOf(simDecks, cards);
      const kap = concentration(cards, playShares(simDecks, cards.filter((c) => !c.land)), mix, (n) => curve.weight(ratingOf(n)));
      const weight = (n: string): number => curve.weight(ratingOf(n)) * (kap.get(n) ?? 1);
      const v = vOf(s);
      const gMemo = new Map<string, number>();
      const gk = (k: number, rep: number): number => {
        const key = `${k}|${rep}`; let x = gMemo.get(key);
        if (x === undefined) { const ds = simDecks.filter((d) => d.colours.length === k); x = ds.reduce((t, d) => t + fit.group(d, s, rep), 0) / Math.max(1, ds.length); gMemo.set(key, x); }
        return x;
      };
      const deckCheck = predictDecks(sim, (d) => d.spells.reduce((t, c) => t + v(c, -1), 0) + fit.group(d, s, -1), 0);
      const nNight = CELL_KEYS.map((k) => ((deckCheck.n[k] as number) * 2 * 2000) / drafts);   // deck-games at a 2,000-draft night (two games a draft)
      const pairCounts = PAIRS.map((_, j) => (nNight[MONO.length + j] as number) >= QUALIFY);
      const all: Float64Array[] = [];
      const pred = predictPayoffsV2(cards, v, reps, mix, weight, gk, all);
      const rows = oddReps.map((b) => all[b] as Float64Array);
      const point = flat(pred);
      const robust = robustGap(rows, pairCounts);
      // with the transfer error: each held-out replicate's cells plus N(0, transfer) per cell (seeded)
      const r = rng(seed, `balance-model-v2/transfer/${id}/${seed0}`);
      const gauss = (): number => { let u = 0; while (u === 0) u = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r.next()); };
      const withT = rows.flatMap((row) => Array.from({ length: 10 }, () => Float64Array.from(row, (x, k) => x + (k < MONO.length ? TRANSFER.colour : TRANSFER.pair) * gauss())));
      const honest = robustGap(withT, pairCounts);
      const cellsWithT = Object.fromEntries(CELL_KEYS.map((k, i) => {
        const c = (i < MONO.length ? pred.colour[k] : pred.pair[k]) as { est: number; sd: number };
        const sdT = Math.sqrt(c.sd ** 2 + (i < MONO.length ? TRANSFER.colour : TRANSFER.pair) ** 2);
        return [k, { est: c.est, sd: c.sd, loT: c.est - 1.96 * sdT, hiT: c.est + 1.96 * sdT, deckSum: deckCheck.n[k] ? (flat(deckCheck)[k] as number) : null, deckGamesAtNight: Math.round(nNight[i] as number) }];
      }));
      return { mix, weight, gk, pointGap: cellGap(CELL_KEYS.map((k) => point[k] as number), pairCounts), robust, honest, pairCounts, cells: cellsWithT,
        concentrated: [...kap].filter(([, x]) => x >= 1.5 || x <= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, x]) => ({ card: n, kappa: Math.round(x * 100) / 100 })) };
    };
    const make = (id0: string, title0: string, idea: string, s: Scale, core: string[], fixedTarget?: number): void => {
      const id = `${id0}${suffix}`;
      const pool = genPool(s, core);
      const target = fixedTarget ?? scanTarget(pool);
      const opts: GenOptions = { ...DEFAULT_GEN, target };
      const flowCards = generateCube(pool, plan, opts);
      const flow = judge(flowCards, s, id, SIM_SEED + 100_000);
      // the robust search, on the flow's own drafted decks and the even replicates, then re-drafted and judged on the odd ones
      const searched = balanceSearchRobust(flowCards, pool.filter((c) => c.tier === 0), flow.mix, flow.weight, vOf(s), flow.gk,
        { target, band: 0.03, minCreaturesPerColour: opts.minCreaturesPerColour, maxSwaps, ratingWindow, minGain, searchReps: evenReps, pairCounts: flow.pairCounts });
      const errs = planErrors(searched.cards, plan);
      if (errs.length) throw new Error(`balance-model: candidate ${id} misses the plan: ${errs.join('; ')}`);
      const after = searched.swaps.length ? judge(searched.cards, s, id, SIM_SEED + 200_000) : flow;
      // keep the search only if the held-out robust gap, on fresh drafts, beats the flow's by the search's own threshold
      const keep = searched.swaps.length > 0 && after.robust.mean <= flow.robust.mean - minGain;
      const cards = keep ? searched.cards : flowCards;
      const record = judge(cards, s, id, SIM_SEED);    // the table of record: 2,000 fresh drafts, every replicate
      const file = path.join(cubesOut, `${id}.md`);
      const title = exclusion ? `${title0}, without ${path.basename(exclusion.file)}` : title0;
      const cellTxt = (k: string): string => { const c = record.cells[k] as { est: number; loT: number; hiT: number }; return `${k} ${f3(c.est)} (${f3(c.loT)}–${f3(c.hiT)})`; };
      const made = [
        `Made by tools/cubelab.sh balance-model, model v2 (D475; tools/cubelab/balance-model.ts, balance-model-v2-cmd.ts) from the recorded deck census J144/J149 and the drafted games of ${[...new Set(nights.map((n) => n.night))].join(', ')}: no designed archetypes, no hand choices. Idea: ${idea}.`,
        `The values: drafted context (D475) — each card's census value (${census[s].label}) times alpha ${f3(fit.alpha[s] ?? NaN)}, plus its own term from ${allGames.length} drafted games (decks clustered by draft), ridge-shrunk toward the census value at lambda ${lambda} (chosen by CV by draft); ${reps} draft-bootstrap replicates with the census's replicates as the prior. A card is "measured" with 200+ deck-games in the census or the drafted games.`,
        `The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by v1's min-cost flow at cost 1000 x |value - ${target}| + 300 x sd (an unmeasured card costs as if ${opts.unmeasuredGap} off, a card outside the ${core.join(' + ')} band${core.length > 1 ? 's' : ''} ${opts.offBand} more), at least ${opts.minCreaturesPerColour} creatures a colour, lands by Forge's rating; then D475's robust search: like-for-like swaps (same colour class and mana value, within 3 points of the level and ${ratingWindow} Forge rating points of the card replaced) judged by the mean gap over ${reps / 2} bootstrap replicates on the mix and concentration the lab drafter shows on the flow's cube, each kept only if it buys ${minGain} of that mean, the result re-drafted and kept only if it beats the flow by as much on ${reps / 2} replicates the search never saw: ${keep ? `${searched.swaps.length} swap(s) kept` : `${searched.swaps.length} swap(s) tried, none kept: this is the flow's cube`}.`,
        `Predicted payoff when drafted by the lab drafter and played by Forge (the drafter's own decks: ${drafts} simulated grid drafts at seeds from ${SIM_SEED}; ${(100 * record.mix.k3).toFixed(0)}% three-colour decks), with 95% intervals that hold the values' bootstrap and the model's transfer error on a new cube (${f3(TRANSFER.colour)} a colour, ${f3(TRANSFER.pair)} a pair, from the leave-one-night-out validation's new cubes, added to each cell independently): ${MONO.map(cellTxt).join(', ')}; pairs ${PAIRS.map(cellTxt).join(', ')}.`,
        `The gap (max |colour − .5| + max |pair − .5| over the pairs a night would judge, 400+ deck-games): point ${f3(record.pointGap)}; over held-out bootstrap replicates ${f3(record.robust.mean)} (${f3(record.robust.lo)}–${f3(record.robust.hi)}); with the transfer error as well ${f3(record.honest.mean)} (${f3(record.honest.lo)}–${f3(record.honest.hi)}) — that last is what a night should expect to measure before its own noise.`,
        ...(exclusion ? [`Excluded before the flow: the ${exclusion.names} cards of ${exclusion.file} (sha256 ${exclusion.sha256.slice(0, 12)}), so none can be chosen; everything else as in the cube without the list.`] : []),
        'A prediction, not a measurement. Model v2 was validated by leaving each measured night out (D475); its error on a new cube is the transfer error above, not the third decimal.',
      ];
      fs.writeFileSync(file, docOf(title, made, cards));
      const back = parseCube(fs.readFileSync(file, 'utf8'));
      if (back.cards.length !== 180 || back.warnings.length) throw new Error(`balance-model: ${file} does not parse back cleanly (${back.cards.length} cards; ${back.warnings.join('; ')})`);
      cubes.push({
        id, file: path.relative(repo, file), idea, scale: s, target, kept: keep, swapsTried: searched.swaps, searchGapEven: { start: searched.startGap, end: searched.gap },
        flow: { pointGap: flow.pointGap, robust: flow.robust, honest: flow.honest }, searched: keep || searched.swaps.length ? { pointGap: after.pointGap, robust: after.robust, honest: after.honest } : null,
        record: { pointGap: record.pointGap, robust: record.robust, honest: record.honest, cells: record.cells, mix: record.mix, pairCounts: record.pairCounts },
        analytic: (() => { const m = mixes[s]; if (!m) return null; const p = predictPayoffsV2(cards, (n) => fit.value(s, n, -1), 0, m.mix, (n) => Math.min(1, Math.max(0.05, m.curve.a + m.curve.b * ratingOf(n)))); return flat(p); })(),
        summary: classSummary(cards), excludedInPool: lib.filter((c) => excluded.has(c.name)).length,
        unmeasured: cards.filter((x) => !x.land && x.value === null).length,
      });
      say(`cube ${id}: level ${pts(target)}; gap point ${f3(record.pointGap)}, robust ${f3(record.robust.mean)} (${f3(record.robust.lo)}–${f3(record.robust.hi)}), with transfer ${f3(record.honest.mean)}; ${keep ? `${searched.swaps.length} swaps kept` : 'flow kept'}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    };
    make('balanced-v2-legacy-even-high', 'Balanced by model v2 — legacy, even and strong', 'every class\'s cards near the highest level each colour can hold, valued in drafted context on the legacy + powered scale', 'legacy', ['legacy', 'powered']);
    make('balanced-v2-legacy-even-mid', 'Balanced by model v2 — legacy, even at the band average', 'every class\'s cards near 0 points (the legacy census\'s average card), valued in drafted context on the legacy + powered scale', 'legacy', ['legacy', 'powered'], 0);
    make('balanced-v2-pauper-even', 'Balanced by model v2 — pauper, even', 'every class\'s cards near the highest level each colour can hold, valued in drafted context on the pauper scale, pauper cards only where they fill the plan', 'pauper', ['pauper']);
  }

  // ---- write
  const inputs: Record<string, { file: string; sha256: string }> = {
    'census-decks': { file: path.join(censusDir, 'out/census-decks.jsonl.gz'), sha256: sha(path.join(censusDir, 'out/census-decks.jsonl.gz')) },
    'census-games': { file: path.join(censusDir, 'out/census-games.jsonl.gz'), sha256: sha(path.join(censusDir, 'out/census-games.jsonl.gz')) },
    facts: { file: factsFile, sha256: sha(factsFile) },
    ...(excludeFile ? { exclude: { file: excludeFile, sha256: sha(excludeFile) } } : {}),
  };
  for (const n of nights) n.files.forEach((file, i) => { inputs[`${n.night}/${n.cube}/${['decks', 'games', 'balance'][i]}`] = { file, sha256: sha(file) }; });
  for (const n of nights) inputs[`cube:${n.cube}`] = { file: path.relative(repo, n.cubeFile), sha256: sha(n.cubeFile) };
  const json = {
    v: 3, model: 'v2 (D475)', made: 'tools/cubelab.sh balance-model', reps, seed, drafts, simSeed: SIM_SEED, suffix, exclude: exclusion ? { ...exclusion, list: [...excluded] } : null, inputs,
    nights: nights.map((n) => ({ night: n.night, cube: n.cube, scale: n.scale, decks: n.decks.length, labDecks: lab(n).length, games: n.games.length, read: !!n.blab, labRun: n.labRun })),
    // what the drafter simulation (the mix, the play curve, the concentration) assumes: Forge's ranks from the facts file, DEFAULT_WEIGHTS
    drafterAssumes: { ratings: 'Forge\'s ranks from the facts file (no --ratings file)', facts: { file: factsFile, sha256: sha(factsFile) }, weights: 'DEFAULT_WEIGHTS (tools/cubelab/weights.ts)', nightsAgree: nights.every((n) => n.labRun && !n.labRun.ratingsFile && n.labRun.weightsDefault) },
    census: Object.fromEntries((['legacy', 'pauper'] as Scale[]).map((s) => [s, { source: census[s].name, lambda: census[s].fit.pen.card, cards: census[s].fit.design.cards.length }])),
    drafted: { lambda, alpha: fit.alpha, cards: fit.cards.length, games: allGames.length, cvChoice, choice },
    mixes, perCube, v1: { mix: v1mix, curve: { a: v1curve.a, b: v1curve.b, cards: v1pts.length } },
    concentration: concentrationRows.filter((r) => Number.isFinite(r.share)).map((r) => ({ ...r, share: Math.round(r.share * 1e4) / 1e4, kappa: Math.round(r.kappa * 1e3) / 1e3 })),
    validation: { rows: valRows, pooled: pooledOut, transfer, transferUsed: TRANSFER },
    cubes,
  };
  fs.writeFileSync(path.join(out, 'model.json'), `${JSON.stringify(json, null, 1)}\n`);
  fs.writeFileSync(path.join(out, 'summary.md'), summaryV2(json, valueRows));
  say(`balance-model v2: wrote ${out}/model.json, summary.md, cards-drafted.tsv${cubes.length ? ` and ${cubes.length} cubes under ${cubesOut}` : ''}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return 0;
}

// ------------------------------------------------------------------ the summary

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summaryV2(j: any, values: Array<{ card: string; colors: string; rating: number; census: number; drafted: number; blend: number; lo: number; hi: number; deckGames: number }>): string {
  const L: string[] = ['# balance-model v2 (D475): drafted context, the drafter\'s own decks, a robust generator', ''];
  L.push('## Which values: CV by draft over every drafted game', '', `${j.drafted.games} drafted games (${j.drafted.cvChoice.tested} scored held out, every draft on one side). Brier score, lower is better:`, '',
    '| values | held-out Brier |', '|---|---|',
    `| makeup groups and the play only | ${j.drafted.cvChoice.groupsOnly.brier.toFixed(5)} |`,
    `| census values x alpha | ${j.drafted.cvChoice.census.brier.toFixed(5)} |`,
    `| drafted values alone (lambda ${j.drafted.cvChoice.drafted.lambda}) | ${j.drafted.cvChoice.drafted.brier.toFixed(5)} |`,
    `| **blend**: drafted terms shrunk toward alpha x census (lambda ${j.drafted.cvChoice.blend.lambda}) | **${j.drafted.cvChoice.blend.brier.toFixed(5)}** |`, '',
    `Chosen: **${j.drafted.choice}**. alpha (drafted value per census point): ${Object.entries(j.drafted.alpha).map(([k, a]) => `${k} ${(a as number).toFixed(3)}`).join(', ')}.`, '');
  L.push('## The validation: each measured cube predicted without its night (and without its cube)', '',
    'RMSE over the five colours and the pairs with 400+ deck-games. v1 = census values on J145\'s analytic mix (D473, the prediction of record). **v2** = drafted-context values refitted without the held-out data, on the mix, play curve and concentration the lab drafter shows on the cube (its own decks for it, simulated at fresh seeds: no game of the night). The other columns take it apart: v2 without the concentration factor; v2\'s values summed over the drafter\'s simulated decks, and over the decks the night actually drafted (the oracle mix); census values on v2\'s mix with concentration, on the drafter\'s decks and on the night\'s own.', '',
    '| held out | night / cube | v1 | **v2** | v2, no concentration | v2 values, drafter\'s decks | v2 values, the night\'s own decks | census, v2 mix + concentration | census, drafter\'s decks | census, the night\'s own decks | U measured / v1 / v2 |', '|---|---|---|---|---|---|---|---|---|---|---|');
  const rc = (x: { rmseColour: number; rmsePair: number }): string => `${f3(x.rmseColour)} / ${f3(x.rmsePair)}`;
  for (const r of j.validation.rows) L.push(`| ${r.mode === 'none' ? 'nothing (in-sample)' : r.mode} | ${r.night} / ${r.cube} | ${rc(r.v1)} | **${rc(r.v2)}** | ${rc(r.v2noConc)} | ${rc(r.v2decks)} | ${rc(r.v2oracle)} | ${rc(r.censusConc)} | ${rc(r.censusSimDecks)} | ${rc(r.censusOracle)} | ${f3(r.measured.U.est)} / ${f3(r.v1.U)} / ${f3(r.v2.U)} |`);
  L.push('', '| pooled | colours | pairs | cells |', '|---|---|---|---|');
  for (const [k, p] of Object.entries(j.validation.pooled) as Array<[string, { rmseColour: number; rmsePair: number; nColour: number; nPair: number }]>) L.push(`| ${k} | ${f3(p.rmseColour)} | ${f3(p.rmsePair)} | ${p.nColour} + ${p.nPair} |`);
  const tr = j.validation.transfer;
  L.push('', `Transfer error left in v2, night held out (${tr.note}): on NEW cubes (${tr.newCube.cubes.join(', ') || 'none'}) colours ${f3(tr.newCube.colour)}, pairs ${f3(tr.newCube.pair)}; on RE-MEASURED cubes (${tr.remeasured.cubes.join(', ') || 'none'}) ${f3(tr.remeasured.colour)} / ${f3(tr.remeasured.pair)}; pooled ${f3(tr.pooled.colour)} / ${f3(tr.pooled.pair)}. The generated cubes are new cubes: their intervals carry ${f3(j.validation.transferUsed.colour)} / ${f3(j.validation.transferUsed.pair)} (${j.validation.transferUsed.source}; hand-set floors ${j.validation.transferUsed.floor.colour} / ${j.validation.transferUsed.floor.pair}). Each cell gets independent noise, while the real residuals are correlated across a colour's pairs: a known narrowing of the gap-with-transfer interval.`, '');
  L.push('## The drafter\'s mix, by scale', '', '| scale | lab decks | three-colour share | two-colour: a colour / gold / colourless / splash | three-colour: a colour / gold / colourless | play curve |', '|---|---|---|---|---|---|');
  for (const [s, m] of Object.entries(j.mixes) as Array<[string, { mix: DeckMixV2; curve: { a: number; b: number } }]>) L.push(`| ${s} | ${m.mix.decks} | ${f3(m.mix.k3)} | ${m.mix.two.perColour.toFixed(2)} / ${m.mix.two.gold.toFixed(2)} / ${m.mix.two.colourless.toFixed(2)} / ${m.mix.two.splash.toFixed(2)} | ${m.mix.three.perColour.toFixed(2)} / ${m.mix.three.gold.toFixed(2)} / ${m.mix.three.colourless.toFixed(2)} | ${m.curve.a.toFixed(3)} + ${m.curve.b.toFixed(4)} x rating |`);
  L.push('', `v1's mix (J145): ${j.v1.mix.perColour.toFixed(2)} a colour, ${j.v1.mix.gold.toFixed(2)} gold, ${j.v1.mix.colourless.toFixed(2)} colourless, no three-colour deck.`, '', '| night / cube | k = 1 / 2 / 3 | three-colour share |', '|---|---|---|');
  for (const c of j.perCube) L.push(`| ${c.night} / ${c.cube} | ${c.k.join(' / ')} | ${f3(c.mix.k3)} |`);
  L.push('', '## Draft concentration: the most-concentrated cards (measured play share over the curve\'s share)', '', '| night / cube | card | colours | rating | share of its colours\' decks | concentration |', '|---|---|---|---|---|---|');
  for (const r of [...j.concentration].filter((x: { night: string }) => x.night !== 'lab-j159').sort((a: { kappa: number }, b: { kappa: number }) => b.kappa - a.kappa).slice(0, 15)) L.push(`| ${r.night} / ${r.cube} | ${r.card} | ${r.colors || 'C'} | ${r.rating.toFixed(0)} | ${f3(r.share)} | ${r.kappa.toFixed(2)} |`);
  for (const name of ['Ancestral Recall', 'Time Walk']) for (const r of j.concentration.filter((x: { card: string }) => x.card === name)) L.push(`| ${r.night} / ${r.cube} | ${r.card} | ${r.colors} | ${r.rating.toFixed(0)} | ${f3(r.share)} | ${r.kappa.toFixed(2)} |`);
  L.push('', '## Drafted-context values: the 25 largest moves from the census (cards with 1,000+ drafted deck-games)', '', '| card | colours | rating | census | drafted alone | blend (95%) | drafted deck-games |', '|---|---|---|---|---|---|---|');
  for (const v of values.filter((x) => x.deckGames >= 1000).sort((a, b) => Math.abs(b.blend - b.census) - Math.abs(a.blend - a.census)).slice(0, 25)) L.push(`| ${v.card} | ${v.colors || 'C'} | ${v.rating.toFixed(0)} | ${pts(v.census)} | ${pts(v.drafted)} | ${pts(v.blend)} (${pts(v.lo)} to ${pts(v.hi)}) | ${v.deckGames} |`);
  if (j.cubes.length) {
    L.push('', '## The generated cubes (v2)', '', 'Cells from the lab drafter\'s own decks for each cube (2,000 simulated drafts); intervals hold the values\' bootstrap and the transfer error. The gap is max |colour − .5| + max |pair − .5| over the pairs a night would judge; "robust" is its mean over held-out replicates, "with transfer" adds the validation\'s transfer error to each cell.', '',
      '| cube | level | search | gap, point | gap, robust (95%) | gap with transfer (95%) | flow alone: robust / with transfer | three-colour decks |', '|---|---|---|---|---|---|---|---|');
    for (const c of j.cubes) L.push(`| ${c.id} | ${pts(c.target)} | ${c.kept ? `${c.swapsTried.length} swaps kept` : `flow kept (${c.swapsTried.length} tried)`} | ${f3(c.record.pointGap)} | ${f3(c.record.robust.mean)} (${f3(c.record.robust.lo)}–${f3(c.record.robust.hi)}) | ${f3(c.record.honest.mean)} (${f3(c.record.honest.lo)}–${f3(c.record.honest.hi)}) | ${f3(c.flow.robust.mean)} / ${f3(c.flow.honest.mean)} | ${f3(c.record.mix.k3)} |`);
    for (const c of j.cubes) {
      L.push('', `### ${c.id}`, '', '| cell | predicted | 95% with transfer | deck-games at a 2,000-draft night |', '|---|---|---|---|');
      for (const k of CELL_KEYS) { const x = c.record.cells[k]; L.push(`| ${k} | ${f3(x.est)} | ${f3(x.loT)}–${f3(x.hiT)} | ${x.deckGamesAtNight} |`); }
    }
  }
  return `${L.join('\n')}\n`;
}

// mtg-table — the cube lab's `balance-model` command: the library-wide card model and the balanced-cube generator.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   balance-model --census <lab-j144 dir> [--omega <lab-j145 dir>] --facts <facts.json> --out <dir>
//                 [--reps 200] [--seed 1] [--cubes-out <dir>] [--search-tol 0.008] [--exclude <file> [--suffix <text>]]
//
// `--exclude <file>` keeps the listed cards out of every generated cube (one name a line, `#` comments; every name
// must be a library card), recorded in each cube document and model.json with the file's sha256; `--suffix` is
// appended to each cube's id (`--suffix -nopower` beside `cubes/library/powered-exclude.txt`).
//
// No engine.  Reads a recorded deck census (D447/D450: `out/census-decks.jsonl.gz`, `out/census-games.jsonl.gz`)
// and, optionally, a J145-shaped balance night (`out/drafted-decks.jsonl.gz`, `out/games.jsonl.gz`,
// `census/decks/decks.jsonl`, `out/balance.json`), the committed library (`cubes/library/library-pool.tsv`,
// `census.tsv`) and a facts file the cube lab cached (Forge's ranks, for the ratings the drafter picks by).
// Writes `<out>/model.json` (every number), `<out>/cards-<source>.tsv` (every card's value and interval),
// `<out>/summary.md`, and the generated cubes as cube documents (`--cubes-out`, default `<out>/cubes`).
// balance-model.ts is the model, its header the method.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

import {
  agreement, BALANCE_TOL, balanceSearch, parseExcludeList, bootstrapFit, buildDesign, cardEffects, classSummary, crossValidate, DEFAULT_GEN, DEFAULT_PENALTY, generateCube, groupEffects, groupOf,
  maxGap, playCurve, predictPayoffs, quantile, sdOf, simulateProgramme, solveRidge, splitHalf, trueSpread,
  type CardEffect, type CvResult, type DeckMix, type Fit, type GenCard, type GenOptions, type Grouping, type MDeck, type MGame, type PayoffPrediction, type SplitHalf,
} from './balance-model.ts';
import { parseCensus, type Band } from './census.ts';
import type { Fact } from './cards.ts';
import { parseLibraryPool } from './library-candidates.ts';
import { initialRating } from './ratings.ts';
import { joinCensus, structurePlan, type SampleCard } from './sample.ts';
import { cubeDocument, MONO, PAIRS, planErrors, shapeOf } from './skeleton.ts';
import { parseCube } from './cube.ts';
import { parseNotes } from './evolve.ts';
import { balanceModelV2Command } from './balance-model-v2-cmd.ts';

type Flags = Map<string, string[]>;
const one = (f: Flags, k: string): string | undefined => f.get(k)?.at(-1);

export const gzLines = <T>(file: string): T[] => {
  const buf = fs.readFileSync(file);
  const text = file.endsWith('.gz') ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as T);
};

export interface RawDeck { id: string; band?: string; draft?: number; run?: string; spells: string[]; profile: { spellsByColour: Record<string, number>; mainShare: number } }
export interface RawGame { a: string; b: string; winner: string | null; first: string; engineError?: unknown }

export const colours3 = (d: RawDeck): string => 'WUBRG'.split('').filter((c) => (d.profile.spellsByColour[c] ?? 0) >= 3).join('');
export const toDeck = (d: RawDeck, cluster: string, stratum?: string): MDeck => ({ id: d.id, spells: d.spells, colours: colours3(d), mainShare: d.profile.mainShare, cluster, ...(stratum ? { stratum } : {}) });
export const decisive = (gs: RawGame[]): MGame[] => gs.filter((g) => (g.winner === 'a' || g.winner === 'b') && !g.engineError).map((g) => ({ a: g.a, b: g.b, winner: g.winner as 'a' | 'b', first: g.first === 'b' ? 'b' : 'a' }));

export const LAMBDAS = [100, 200, 400, 800, 1600, 3200];

/**
 * A fitted source.  `cv` and `reliability` are by game (the lambda the fit uses comes from `cv`); `cvDeck` and
 * `repeat` are by deck (no deck on both sides), and `repeat.full` is the headline repeatability: the one the
 * true spreads and the disattenuated agreements use.
 */
export interface Source { name: string; label: string; grouping: Grouping; fit: Fit; effects: CardEffect[]; cv: CvResult; cvDeck: CvResult; decks: number; games: number; reliability: SplitHalf; repeat: SplitHalf }

export function fitSource(name: string, label: string, decks: MDeck[], games: MGame[], grouping: Grouping, reps: number, seed: number, say: (s: string) => void): Source {
  const t0 = Date.now();
  const ds = buildDesign(decks, games, grouping);
  const cv = crossValidate(ds, LAMBDAS, 5, seed);
  const cvDeck = crossValidate(ds, LAMBDAS, 5, seed, DEFAULT_PENALTY, 'deck');
  const pen = { ...DEFAULT_PENALTY, card: cv.lambda };
  const beta = solveRidge(ds, pen);
  const fit: Fit = { design: ds, pen, beta, reps: bootstrapFit(ds, pen, beta, reps, seed) };
  const reliability = splitHalf(ds, pen, 200, 'game');
  const repeat = splitHalf(ds, pen, 200, 'deck', seed);
  say(`${name}: ${ds.cards.length} cards, ${ds.groups.length} groups, ${ds.y.length} games; lambda ${cv.lambda} (by deck ${cvDeck.lambda}), held-out Brier ${cv.brier.toFixed(4)} vs ${cv.brierGroupsOnly.toFixed(4)} makeup-only (${(100 * cv.skill).toFixed(1)}%; by deck ${(100 * cvDeck.skill).toFixed(1)}%); repeatability by deck ${repeat.full.toFixed(2)} (by game ${reliability.full.toFixed(2)}); ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { name, label, grouping, fit, effects: cardEffects(fit), cv, cvDeck, decks: decks.length, games: ds.y.length, reliability, repeat };
}

/** A card's value in a source, point (rep -1) or replicate; 0 for a card the source never saw. */
export function valueFn(s: Source): (name: string, rep: number) => number {
  const ix = new Map(s.fit.design.cards.map((c, i) => [c, i]));
  return (name, rep) => {
    const i = ix.get(name);
    if (i === undefined) return 0;
    return (rep < 0 ? s.fit.beta[i] : (s.fit.reps[rep] as Float64Array)[i]) as number;
  };
}

export function groupValueFn(s: Source): (key: string, rep: number) => number {
  const nc = s.fit.design.cards.length;
  const ix = new Map(s.fit.design.groups.map((g, j) => [g, nc + j]));
  return (key, rep) => {
    const i = ix.get(key);
    if (i === undefined) return 0;
    return (rep < 0 ? s.fit.beta[i] : (s.fit.reps[rep] as Float64Array)[i]) as number;
  };
}

// ------------------------------------------------------------------ predicting a measured night from real decks

interface Cell { est: number; lo: number; hi: number; n?: number }

/**
 * The payoff J145's read would report, predicted from the decks that actually played: each deck's strength
 * is the sum of its cards' values plus its makeup group's (from `src`, a census fit), and a pair's payoff is
 * 1/2 + the mean of (own - opponent) over its deck-games against decks that are not that pair (balance.py's
 * cells, k 1-3 only).  Intervals from the source's replicates.
 */
function predictNight(decks: MDeck[], games: MGame[], src: Source, stratum: string | undefined, reps: number): { colour: Record<string, Cell>; pair: Record<string, Cell> } {
  const v = valueFn(src), gv = groupValueFn(src);
  const by = new Map(decks.map((d) => [d.id, d]));
  const ok = (d: MDeck | undefined): d is MDeck => !!d && d.colours.length >= 1 && d.colours.length <= 3;
  const strength = (d: MDeck, rep: number): number => d.spells.reduce((s, c) => s + v(c, rep), 0) + gv(groupOf({ ...d, ...(stratum ? { stratum } : {}) }, 'makeup'), rep);
  const dg: Array<{ own: MDeck; opp: MDeck }> = [];
  for (const g of games) { const a = by.get(g.a), b = by.get(g.b); if (!ok(a) || !ok(b)) continue; dg.push({ own: a, opp: b }, { own: b, opp: a }); }
  const cells = (rep: number): { colour: Record<string, number>; pair: Record<string, number> } => {
    const S = new Map<string, number>();
    for (const d of decks) S.set(d.id, strength(d, rep));
    const mean = (sel: (x: { own: MDeck; opp: MDeck }) => boolean): number => {
      let s = 0, n = 0;
      for (const x of dg) if (sel(x)) { s += (S.get(x.own.id) as number) - (S.get(x.opp.id) as number); n++; }
      return n ? 0.5 + s / n : NaN;
    };
    return {
      colour: Object.fromEntries(MONO.map((c) => [c, mean((x) => x.own.colours.includes(c) && !x.opp.colours.includes(c))])),
      pair: Object.fromEntries(PAIRS.map((p) => [p, mean((x) => x.own.colours === p && x.opp.colours !== p)])),
    };
  };
  const point = cells(-1);
  const rs = Array.from({ length: reps }, (_, b) => cells(b));
  const cell = (k: 'colour' | 'pair', key: string): Cell => {
    const xs = rs.map((r) => r[k][key] as number).sort((a, b) => a - b);
    return { est: point[k][key] as number, lo: quantile(xs, 0.025), hi: quantile(xs, 0.975) };
  };
  return { colour: Object.fromEntries(MONO.map((c) => [c, cell('colour', c)])), pair: Object.fromEntries(PAIRS.map((p) => [p, cell('pair', p)])) };
}

// ------------------------------------------------------------------ the command

const f3 = (x: number): string => (Number.isFinite(x) ? x.toFixed(3) : '—');
const pts = (x: number): string => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}` : '—');
const iv = (c: { est: number; lo: number; hi: number }): string => `${f3(c.est)} (${f3(c.lo)}–${f3(c.hi)})`;

export function effectsTsv(src: Source, info: Map<string, { band: string; colors: string; rating: number }>): string {
  const L = [`# balance-model: ${src.label}; grouping ${src.grouping}; lambda ${src.fit.pen.card}; ${src.fit.reps.length} deck-bootstrap replicates. Values are win-rate points per game (a deck holding the card instead of the band's average card).`,
    'card\tband\tcolors\trating\tvalue\tsd\tlo\thi\tdecks\tdeck_games'];
  for (const e of [...src.effects].sort((a, b) => b.est - a.est)) {
    const i = info.get(e.card);
    L.push([e.card, i?.band ?? '', i?.colors ?? '', i ? i.rating.toFixed(1) : '', e.est.toFixed(4), e.sd.toFixed(4), e.lo.toFixed(4), e.hi.toFixed(4), e.decks, e.deckGames].join('\t'));
  }
  return `${L.join('\n')}\n`;
}

export function balanceModelCommand(repo: string, f: Flags, say: (s: string) => void): number {
  // D475: measured nights as drafted-context sources make it model v2 (balance-model-v2-cmd.ts); without them it is v1, byte for byte.
  if (f.has('night') || f.has('sources')) return balanceModelV2Command(repo, f, say);
  const censusDir = one(f, 'census');
  const factsFile = one(f, 'facts');
  const out = one(f, 'out');
  if (!censusDir || !factsFile || !out) throw new Error('balance-model needs --census <lab-j144 dir> --facts <facts.json> --out <dir> [--omega <lab-j145 dir>]');
  const omegaDir = one(f, 'omega');
  const reps = Number(one(f, 'reps') ?? 200);
  const seed = Number(one(f, 'seed') ?? 1);
  const cubesOut = one(f, 'cubes-out') ?? path.join(out, 'cubes');
  const searchTol = Number(one(f, 'search-tol') ?? BALANCE_TOL);
  if (!(searchTol >= 0)) throw new Error(`balance-model: --search-tol wants a number >= 0, got ${one(f, 'search-tol')}`);
  const excludeFile = one(f, 'exclude');
  const suffix = one(f, 'suffix') ?? '';
  if (suffix && !/^[-a-z0-9]+$/.test(suffix)) throw new Error(`balance-model: --suffix wants lower-case letters, digits and '-', got ${suffix}`);
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(cubesOut, { recursive: true });

  // The library, its bands, Forge's ranks and the creature line.
  const lib = joinCensus(parseLibraryPool(fs.readFileSync(path.join(repo, 'cubes/library/library-pool.tsv'), 'utf8')),
    parseCensus(fs.readFileSync(path.join(repo, 'cubes/library/census.tsv'), 'utf8')));
  const facts = (JSON.parse(fs.readFileSync(factsFile, 'utf8')) as { cards: Fact[] }).cards;
  const factBy = new Map<string, Fact>();
  for (const x of facts) { factBy.set(x.listed, x); if (x.name) factBy.set(x.name, x); }
  const ratingOf = (n: string): number => { const x = factBy.get(n); return x && x.found ? initialRating(x, 40).rating : 40; };
  const info = new Map(lib.map((c) => [c.name, { band: c.band, colors: c.colors, rating: ratingOf(c.name) }]));
  const excluded = new Set(excludeFile ? parseExcludeList(fs.readFileSync(excludeFile, 'utf8')) : []);
  const notInLibrary = [...excluded].filter((n) => !info.has(n));
  if (notInLibrary.length) throw new Error(`balance-model: ${excludeFile} names card(s) the library lacks: ${notInLibrary.join(', ')}`);
  const exclusion = excludeFile ? {
    file: path.relative(repo, path.resolve(excludeFile)), sha256: createHash('sha256').update(fs.readFileSync(excludeFile)).digest('hex'), names: excluded.size,
  } : null;

  // ---- the census fits
  const rawDecks = gzLines<RawDeck>(path.join(censusDir, 'out/census-decks.jsonl.gz'));
  const rawGames = gzLines<RawGame>(path.join(censusDir, 'out/census-games.jsonl.gz'));
  const bandOfDeck = new Map(rawDecks.map((d) => [d.id, d.band as string]));
  const bands: Band[] = ['pauper', 'peasant', 'legacy', 'powered'];
  const sources: Source[] = [];
  const gamesOfBand = (b: string[]): MGame[] => decisive(rawGames.filter((g) => b.includes(bandOfDeck.get(g.a) ?? '')));
  for (const b of bands) {
    const D = rawDecks.filter((d) => d.band === b).map((d) => toDeck(d, d.id));
    for (const g of ['makeup', 'colour'] as Grouping[]) sources.push(fitSource(`${b}.${g}`, `census ${b} band (J144/J149)`, D, gamesOfBand([b]), g, reps, seed, say));
  }
  const LP = rawDecks.filter((d) => d.band === 'legacy' || d.band === 'powered').map((d) => toDeck(d, d.id, d.band));
  const joint = fitSource('legacy+powered.makeup', 'census legacy + powered bands together, makeup groups by band', LP, gamesOfBand(['legacy', 'powered']), 'makeup', reps, seed, say);
  sources.push(joint);
  const pauper = sources.find((s) => s.name === 'pauper.makeup') as Source;

  // ---- Omega's night (J145), when given
  let omega: null | {
    labDecks: MDeck[]; labGames: MGame[]; poolDecks: MDeck[]; poolGames: MGame[]; read: { Blab: { colour: Record<string, Cell>; pairs: Record<string, Cell> }; C: { colour: Record<string, Cell>; pairs: Record<string, Cell> } };
    B: Source; C: Source; Bc: Source; Cc: Source; cube: string[];
  } = null;
  if (omegaDir) {
    const dd = gzLines<RawDeck>(path.join(omegaDir, 'out/drafted-decks.jsonl.gz'));
    const pd = gzLines<RawDeck>(path.join(omegaDir, 'census/decks/decks.jsonl'));
    const gg = gzLines<RawGame>(path.join(omegaDir, 'out/games.jsonl.gz'));
    const drafted = dd.map((d) => toDeck(d, `draft:${d.draft}`));
    const pool = pd.map((d) => toDeck(d, d.id));
    const draftedIds = new Set(drafted.map((d) => d.id)), poolIds = new Set(pool.map((d) => d.id));
    const gB = decisive(gg.filter((g) => draftedIds.has(g.a)));
    const gC = decisive(gg.filter((g) => poolIds.has(g.a)));
    const labIds = new Set(dd.filter((d) => d.run === 'lab').map((d) => d.id));
    const B = fitSource('omega-B.makeup', 'J145 arm B: drafted Omega decks (all three drafters), clusters = drafts', drafted, gB, 'makeup', reps, seed, say);
    const C = fitSource('omega-C.makeup', 'J145 arm C: random Omega pool decks', pool, gC, 'makeup', reps, seed, say);
    const Bc = fitSource('omega-B.colour', 'J145 arm B, colour groups', drafted, gB, 'colour', reps, seed, say);
    const Cc = fitSource('omega-C.colour', 'J145 arm C, colour groups', pool, gC, 'colour', reps, seed, say);
    sources.push(B, C, Bc, Cc);
    const bal = JSON.parse(fs.readFileSync(path.join(omegaDir, 'out/balance.json'), 'utf8')) as { payoff: Record<string, { colour: Record<string, Cell>; pairs: Record<string, Cell> }> };
    const cube = parseCube(fs.readFileSync(path.join(repo, 'cubes/omega-cube-180.md'), 'utf8')).cards.map((c) => c.name);
    omega = {
      labDecks: drafted.filter((d) => labIds.has(d.id)), labGames: gB.filter((g) => labIds.has(g.a)), poolDecks: pool, poolGames: gC,
      read: { Blab: bal.payoff.Blab as { colour: Record<string, Cell>; pairs: Record<string, Cell> }, C: bal.payoff.C as { colour: Record<string, Cell>; pairs: Record<string, Cell> } }, B, C, Bc, Cc, cube,
    };
  }

  for (const s of sources) fs.writeFileSync(path.join(out, `cards-${s.name}.tsv`), effectsTsv(s, info));

  // ---- coverage, by band: the census's pool (in-band, drawable) and how well each card is measured
  const byName = (s: Source): Map<string, CardEffect> => new Map(s.effects.map((e) => [e.card, e]));
  const coverage = bands.map((b) => {
    const s = sources.find((x) => x.name === `${b}.makeup`) as Source;
    const m = byName(s);
    const poolCards = lib.filter((c) => c.band === b && c.supported && !c.land && c.aiFlag !== 'All');
    const es = poolCards.map((c) => m.get(c.name)).filter((e): e is CardEffect => !!e);
    const sds = es.map((e) => e.sd).sort((x, y) => x - y);
    const gamesMed = quantile(es.map((e) => e.deckGames).sort((x, y) => x - y), 0.5);
    const sdMed = quantile(sds, 0.5);
    const excl = (e: CardEffect): boolean => e.lo > 0 || e.hi < 0;
    return {
      band: b, pool: poolCards.length, drawn: es.length, never: poolCards.length - es.length,
      games200: es.filter((e) => e.deckGames >= 200).length, games1000: es.filter((e) => e.deckGames >= 1000).length,
      sd02: es.filter((e) => e.sd <= 0.02).length, sd03: es.filter((e) => e.sd <= 0.03).length,
      sdMedian: sdMed, gamesMedian: gamesMed, excludesZero: es.filter(excl).length, trueSpread: trueSpread(es, s.repeat.full), repeatability: s.repeat.full,
      trueSpreadByGame: trueSpread(es, s.reliability.full), reliabilityByGame: s.reliability.full,
      inFitTotal: s.effects.length,
      // games a card needs for sd .02 at the band's own rate: sd ~ 1/sqrt(games)
      nightsForSd02: Number.isFinite(sdMed) ? Math.max(0, (sdMed / 0.02) ** 2 - 1) : NaN,
    };
  });

  // ---- agreement between sources on shared cards (a card counts when both have 200+ deck-games)
  // trueCorrelation disattenuates by the by-deck repeatability (the headline); trueCorrelationByGame by the by-game split.
  const agreements: Array<{ a: string; b: string; trueCorrelationByGame?: number } & ReturnType<typeof agreement>> = [];
  const agree = (a: string, b: string): void => {
    const A = sources.find((s) => s.name === a), B2 = sources.find((s) => s.name === b);
    if (A && B2) {
      agreements.push({ a, b, ...agreement(A.effects, B2.effects, 200, A.repeat.full, B2.repeat.full),
        trueCorrelationByGame: agreement(A.effects, B2.effects, 200, A.reliability.full, B2.reliability.full).trueCorrelation });
    }
  };
  agree('legacy.makeup', 'powered.makeup'); agree('pauper.makeup', 'peasant.makeup'); agree('peasant.makeup', 'legacy.makeup');
  { const A = sources.find((x) => x.name === 'legacy.makeup') as Source, B2 = sources.find((x) => x.name === 'legacy.colour') as Source; agreements.push({ a: 'legacy.makeup', b: 'legacy.colour (same games)', ...agreement(A.effects, B2.effects, 200) }); }
  if (omega) {
    agree('omega-C.makeup', 'omega-B.makeup'); agree('omega-C.colour', 'omega-B.colour');
    agree('legacy+powered.makeup', 'omega-C.makeup'); agree('legacy+powered.makeup', 'omega-B.makeup');
    agree('legacy.makeup', 'omega-C.makeup'); agree('powered.makeup', 'omega-C.makeup');
  }

  // ---- validation: predict Omega's measured payoffs from the census alone
  let validation: null | { rows: Array<{ arm: string; key: string; obs: Cell; pred: Cell; predOwn: Cell }>; rmse: Record<string, number>; corr: Record<string, number>; transferSd: Record<string, number> } = null;
  let mix: DeckMix = { perColour: 8.5, gold: 1.2, colourless: 4 };
  let curve = playCurve([]);
  let curveN = 0;
  if (omega) {
    const colorsOf = (n: string): string | undefined => info.get(n)?.colors;
    const two = omega.labDecks.filter((d) => d.colours.length === 2);
    let mono = 0, gold = 0, cl = 0;
    for (const d of two) for (const c of d.spells) { const k = colorsOf(c); if (k === undefined) continue; if (k === '') cl++; else if (k === d.colours) gold++; else if (k.length === 1 && d.colours.includes(k)) mono++; }
    mix = { perColour: mono / two.length / 2, gold: gold / two.length, colourless: cl / two.length };
    // How often the builder plays a card of a given rating in the decks of its colours (two-colour lab decks).
    const pts2: Array<{ rating: number; rate: number }> = [];
    for (const name of omega.cube) {
      const k = colorsOf(name);
      if (k === undefined || (info.get(name) && lib.find((c) => c.name === name)?.land)) continue;
      const on = two.filter((d) => [...k].every((x) => d.colours.includes(x)));
      if (on.length < 30) continue;
      pts2.push({ rating: ratingOf(name), rate: on.filter((d) => d.spells.includes(name)).length / on.length });
    }
    curve = playCurve(pts2);
    curveN = pts2.length;
    const rows: Array<{ arm: string; key: string; obs: Cell; pred: Cell; predOwn: Cell }> = [];
    const pB = predictNight(omega.labDecks, omega.labGames, joint, 'legacy', reps);
    const pBown = predictNight(omega.labDecks, omega.labGames, omega.B, undefined, reps);
    const pC = predictNight(omega.poolDecks, omega.poolGames, joint, 'legacy', reps);
    const pCown = predictNight(omega.poolDecks, omega.poolGames, omega.C, undefined, reps);
    for (const [arm, pr, own, read] of [['Blab', pB, pBown, omega.read.Blab], ['C', pC, pCown, omega.read.C]] as const) {
      for (const c of MONO) rows.push({ arm, key: c, obs: read.colour[c] as Cell, pred: pr.colour[c] as Cell, predOwn: own.colour[c] as Cell });
      for (const p of PAIRS) rows.push({ arm, key: p, obs: read.pairs[p] as Cell, pred: pr.pair[p] as Cell, predOwn: own.pair[p] as Cell });
    }
    const rmse: Record<string, number> = {}, corr: Record<string, number> = {}, transferSd: Record<string, number> = {};
    for (const arm of ['Blab', 'C']) {
      for (const which of ['pred', 'predOwn'] as const) {
        const rs = rows.filter((r) => r.arm === arm && Number.isFinite(r.obs.est) && Number.isFinite(r[which].est));
        const res = rs.map((r) => r.obs.est - r[which].est);
        const k = `${arm}.${which}`;
        rmse[k] = Math.sqrt(res.reduce((s, x) => s + x * x, 0) / res.length);
        const xo = rs.map((r) => r.obs.est), xp = rs.map((r) => r[which].est);
        const mo = xo.reduce((s, x) => s + x, 0) / xo.length, mp = xp.reduce((s, x) => s + x, 0) / xp.length;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < xo.length; i++) { sxy += ((xo[i] as number) - mo) * ((xp[i] as number) - mp); sxx += ((xo[i] as number) - mo) ** 2; syy += ((xp[i] as number) - mp) ** 2; }
        corr[k] = sxy / Math.sqrt(sxx * syy);
        // what the residuals hold beyond the read's own noise and the prediction's: the model's transfer error
        const obsVar = rs.reduce((s, r) => s + ((r.obs.hi - r.obs.lo) / 3.92) ** 2, 0) / rs.length;
        const predVar = rs.reduce((s, r) => s + ((r[which].hi - r[which].lo) / 3.92) ** 2, 0) / rs.length;
        transferSd[k] = Math.sqrt(Math.max(0, rmse[k] ** 2 - obsVar - predVar));
      }
    }
    validation = { rows, rmse, corr, transferSd };
  }

  // ---- the generator
  const med = (xs: number[]): number => quantile([...xs].sort((a, b) => a - b), 0.5);
  const plan = structurePlan('two-colour');
  const ALL = ['pauper', 'peasant', 'legacy', 'powered'];
  const weightOf = (n: string): number => curve.weight(ratingOf(n));
  const genPool = (src: Source, allowed: string[], core: string[] = allowed): Array<SampleCard & GenCard> => {
    const m = byName(src);
    return lib.filter((c) => !excluded.has(c.name) && allowed.includes(c.band) && c.supported && !c.basic && c.aiFlag !== 'All' && !(c.land && /\bBasic\b/.test(c.type))).map((c) => {
      const e = m.get(c.name);
      const measured = !!e && e.deckGames >= 200;
      return { ...c, creature: /\bCreature\b/.test(c.type), rating: ratingOf(c.name), value: measured ? (e as CardEffect).est : null, sd: measured ? (e as CardEffect).sd : null, tier: core.includes(c.band) ? 0 : 1 };
    });
  };
  interface Candidate { id: string; title: string; idea: string; src: Source; bands: string[]; core: string[]; opts: GenOptions; cards: Array<SampleCard & GenCard>; pred: PayoffPrediction; summary: ReturnType<typeof classSummary>; ratingByColour: Record<string, number>; file: string; searchSwaps: number; flowGap: number; searchedGap: number; excludedSeen: number }
  const candidates: Candidate[] = [];
  const makeCandidate = (id: string, title: string, idea: string, src: Source, bandsAllowed: string[], core: string[], opts: GenOptions): void => {
    const pool = genPool(src, bandsAllowed, core);
    const flow = generateCube(pool, plan, opts);
    const vPoint = valueFn(src);
    const searched = balanceSearch(flow, pool.filter((c) => c.tier === 0), (n) => vPoint(n, -1), mix, weightOf, { target: opts.target, band: 0.03, minCreaturesPerColour: opts.minCreaturesPerColour, maxSwaps: 40, tol: searchTol });
    const cards = searched.cards;
    const errs = planErrors(cards, plan);
    if (errs.length) throw new Error(`balance-model: candidate ${id} misses the plan: ${errs.join('; ')}`);
    const v = valueFn(src);
    const valueOf = (n: string, rep: number): number => v(n, rep);
    const pred = predictPayoffs(cards, valueOf, reps, mix, weightOf);
    const predFlow = predictPayoffs(flow, valueOf, 0, mix, weightOf);
    const summary = classSummary(cards);
    const ratingByColour = Object.fromEntries(MONO.map((c) => {
      const xs = cards.filter((x) => !x.land && x.colors.includes(c)).map((x) => x.rating).sort((a, b) => b - a).slice(0, 24);
      return [c, xs.reduce((s, x) => s + x, 0) / xs.length];
    }));
    const file = path.join(cubesOut, `${id}${suffix}.md`);
    candidates.push({ id: `${id}${suffix}`, title: exclusion ? `${title}, without ${path.basename(exclusion.file)}` : title, idea, src, bands: bandsAllowed, core, opts, cards, pred, summary, ratingByColour, file, searchSwaps: searched.swaps.length, flowGap: maxGap(predFlow.colour) + maxGap(predFlow.pair), searchedGap: maxGap(pred.colour) + maxGap(pred.pair),
      excludedSeen: lib.filter((c) => excluded.has(c.name) && bandsAllowed.includes(c.band) && c.supported && !c.basic && c.aiFlag !== 'All').length });
  };
  // The level a colour class can hold: scan targets, keep the highest whose chosen cards stay within 0.8 points of it on average (a thinner level leaves the balance search no room).
  const scanTarget = (src: Source, bandsAllowed: string[], core: string[], base: GenOptions): number => {
    const pool = genPool(src, bandsAllowed, core);
    let best = 0;
    for (let t = 0; t <= 0.08 + 1e-9; t += 0.005) {
      try {
        const cards = generateCube(pool, plan, { ...base, target: t });
        const nl = cards.filter((c) => !c.land && c.value !== null);
        const gap = nl.reduce((s, c) => s + Math.abs((c.value as number) - t), 0) / nl.length;
        if (gap <= 0.008) best = t;
      } catch { /* a target the pool cannot fill */ }
    }
    return Math.round(best * 1000) / 1000;
  };
  // A band's decks also drew its neighbours' cards (the cross-band slice), so the whole library is offered; a card the
  // source never measured costs `unmeasuredGap`, so it fills a slot only where the measured cards cannot (a gold pair, a land).
  const LP2 = ['legacy', 'powered'];
  const tHigh = scanTarget(joint, ALL, LP2, DEFAULT_GEN);
  makeCandidate('balanced-legacy-even-high', 'Balanced by model — legacy, even and strong', `every class's cards near ${pts(tHigh)} points (the highest level each colour can hold), valued by the legacy + powered census`, joint, ALL, LP2, { ...DEFAULT_GEN, target: tHigh });
  makeCandidate('balanced-legacy-even-mid', 'Balanced by model — legacy, even at the band average', 'every class\'s cards near 0 points (the band\'s average card), valued by the legacy + powered census', joint, ALL, LP2, { ...DEFAULT_GEN, target: 0 });
  const tPauper = scanTarget(pauper, ALL, ['pauper'], DEFAULT_GEN);
  makeCandidate('balanced-pauper-even', 'Balanced by model — pauper, even', `every class's cards near ${pts(tPauper)} points (the highest level each colour can hold), valued by the pauper census, pauper cards only where they fill the plan`, pauper, ALL, ['pauper'], { ...DEFAULT_GEN, target: tPauper });

  // The documents.
  const themeNames: Record<string, string> = {};
  for (const c of candidates) {
    const made = [
      `Made by tools/cubelab.sh balance-model (tools/cubelab/balance-model.ts) from the recorded deck census J144/J149 (80,000 games, D447/D450)${omega ? ' and J145' : ''}: no designed archetypes, no hand choices. Idea: ${c.idea}.`,
      `The model: ${c.src.label}; a ridge linear-probability model of deck win on card indicators + makeup groups (colour count x main-colour share), the opponent's deck antisymmetric (a D377-style null); lambda ${c.src.fit.pen.card}, ${c.src.fit.reps.length} deck-bootstrap replicates. A card is "measured" with 200+ deck-games.`,
      `The selection: sample.ts's two-colour structure (Omega's skeleton without its list: 24 a colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact) filled by a min-cost flow at cost 1000 x |value - ${c.opts.target}| + 300 x sd (an unmeasured card costs as if ${c.opts.unmeasuredGap} off, a card outside the ${c.core.join(' + ')} band${c.core.length > 1 ? 's' : ''} ${c.opts.offBand} more, a land from outside only where no band land fits), at least ${c.opts.minCreaturesPerColour} creatures a colour, lands by Forge's rating; then ${c.searchSwaps} like-for-like swaps (same colour class and mana value, within 3 points of the level) that even the predicted payoffs out, stopping once max |colour − .5| + max |pair − .5| is at most ${searchTol} (about one card's SD in the census: below it the point estimates differ by their noise); not AI:RemoveDeck:All, supported by Forge 2.0.14.`,
      `Predicted payoff when drafted by the lab drafter and played by Forge (deck mix ${mix.perColour.toFixed(1)} cards of each colour, ${mix.gold.toFixed(1)} gold, ${mix.colourless.toFixed(1)} colourless, J145's lab decks): colours ${MONO.map((k) => `${k} ${f3((c.pred.colour[k] as Cell).est)}`).join(', ')}; worst pair gap ${f3(maxGap(c.pred.pair))}. Colour + pair gap ${f3(c.flowGap)} after the flow alone, ${f3(c.searchedGap)} after the search${c.searchedGap <= searchTol + 1e-12 ? '' : ` (${c.searchedGap.toFixed(4)}: no like-for-like swap narrowed it further, so it stops above the ${searchTol} tolerance)`}: even to within about the model's own uncertainty (each colour cell's model interval is about ±${f3(1.96 * med(MONO.map((k) => (c.pred.colour[k] as { sd: number }).sd)))}), not to the third decimal.`,
      ...(exclusion ? [`Excluded before the flow: the ${exclusion.names} cards of ${exclusion.file} (sha256 ${exclusion.sha256.slice(0, 12)}; ${c.excludedSeen} of them in the cube's candidate pool), so none can be chosen; everything else as in the cube without the list.`] : []),
      `A prediction, not a measurement, and an untested kind: the census model's card values were validated by summing them over the decks J145 actually played (r .84), but this table comes from class means × an assumed deck mix × a rating play curve, which no measurement has tested yet. A J145-shaped night on fresh seeds is that test (study/omega-balance-model.md).`,
    ];
    fs.writeFileSync(c.file, cubeDocument({
      title: `${c.title}, version 1 (180 cards, two-player)`, made, cards: c.cards, themeNames, madeBy: '`tools/cubelab.sh balance-model`',
      notes: ['A generated cube: the cards are the library model\'s choice under the lab\'s structural rules, for measuring head to head against other candidates. It drafts on Forge\'s ranks unless a ratings file is given.'],
    }));
    const back = parseCube(fs.readFileSync(c.file, 'utf8'));
    if (back.cards.length !== 180 || back.warnings.length) throw new Error(`balance-model: ${c.file} does not parse back cleanly (${back.cards.length} cards; ${back.warnings.join('; ')})`);
  }

  // ---- Omega, briefly: what the census model says about the one cube we measured
  let omegaAppendix: null | { analytic: PayoffPrediction; cutsAdds: Array<{ cut: string; add: string; dCut: number; dAdd: number }>; after: PayoffPrediction; k: number } = null;
  if (omega) {
    const cubeCards = omega.cube.map((n) => lib.find((c) => c.name === n)).filter((c): c is SampleCard => !!c).map((c) => ({ name: c.name, colors: c.colors, land: c.land }));
    const v = valueFn(joint);
    const analytic = predictPayoffs(cubeCards, v, reps, mix, weightOf);
    // Greedy k = 10 like-for-like UPGRADES (same colour class, so every count and the skeleton hold; the added card valued at
    // least the cut's): evolve's add rules (supported, not AI:RemoveDeck:All, rated 60+, no `cut` note in cubes/omega-notes.tsv).
    const notes = parseNotes(fs.readFileSync(path.join(repo, 'cubes/omega-notes.tsv'), 'utf8'));
    const pool = genPool(joint, ALL).filter((c) => !c.land && c.value !== null && c.colors.length <= 2 && c.rating >= 60 && notes.get(c.name)?.verdict !== 'cut');
    const inCube = new Set(omega.cube);
    let cur = [...cubeCards];
    const swaps: Array<{ cut: string; add: string; dCut: number; dAdd: number }> = [];
    for (let k = 0; k < 10; k++) {
      const pr = predictPayoffs(cur, v, 0, mix, weightOf);
      let best: { gain: number; cut: string; add: string; dCut: number; dAdd: number; next: typeof cur } | null = null;
      const base = maxGap(pr.pair) + maxGap(pr.colour);
      for (const cut of cur.filter((c) => !c.land && c.colors.length <= 2 && notes.get(c.name)?.verdict !== 'keep')) {
        for (const add of pool.filter((p) => p.colors === cut.colors && !inCube.has(p.name) && (p.value as number) >= v(cut.name, -1))) {
          const next = cur.map((c) => (c.name === cut.name ? { name: add.name, colors: add.colors, land: false } : c));
          const p2 = predictPayoffs(next, v, 0, mix, weightOf);
          const gain = base - (maxGap(p2.pair) + maxGap(p2.colour));
          if (!best || gain > best.gain) best = { gain, cut: cut.name, add: add.name, dCut: v(cut.name, -1), dAdd: add.value as number, next };
        }
      }
      if (!best || best.gain <= 1e-6) break;
      swaps.push({ cut: best.cut, add: best.add, dCut: best.dCut, dAdd: best.dAdd });
      inCube.delete(best.cut); inCube.add(best.add);
      cur = best.next;
    }
    omegaAppendix = { analytic, cutsAdds: swaps, after: predictPayoffs(cur, v, reps, mix, weightOf), k: swaps.length };
  }

  // ---- the measurement programme, simulated: nights to a confirmed balanced cube
  const predColourSd = med(candidates.flatMap((c) => MONO.map((k) => (c.pred.colour[k] as { sd: number }).sd)));
  const predPairSd = med(candidates.flatMap((c) => PAIRS.map((k) => (c.pred.pair[k] as { sd: number }).sd)));
  // The transfer error (census -> drafted decks) is NOT identified by 15 cells: rmse² − obsVar − predVar came out <= 0,
  // which bounds it below at 0 and says nothing about its size.  The base case is .015, the pessimistic one .03, and the
  // measured residual is kept only as the lower bound.
  const transferLow = validation ? Math.max(validation.transferSd['Blab.pred'] ?? 0, 0) : 0;
  const TRANSFER_BASE = 0.015, TRANSFER_PESSIMISTIC = 0.03;
  const blab = omega?.read.Blab;
  const colourN = blab ? med(MONO.map((k) => (blab.colour[k] as Cell & { n: number }).n)) : 2500;
  const pairNBot = blab ? PAIRS.map((k) => (blab.pairs[k] as Cell & { n: number }).n) : PAIRS.map(() => 760);
  const totalPair = pairNBot.reduce((a, b) => a + b, 0);
  const pairNEven = PAIRS.map(() => Math.round(totalPair / 10));
  const programme: Array<Record<string, unknown>> = [];
  for (const tr of [TRANSFER_BASE, TRANSFER_PESSIMISTIC, ...(transferLow < TRANSFER_BASE ? [transferLow] : [])]) {
    for (const [pullName, pairN] of [['bot pull (J145)', pairNBot], ['even pull', pairNEven]] as const) {
      for (const [rule, scale] of [['no-off', 1], ['all-even', 1], ['all-even', 3]] as const) {
        for (const perNight of [1, 4, 8]) {
          const sc = Math.sqrt(predColourSd ** 2 + tr ** 2), sp = Math.sqrt(predPairSd ** 2 + tr ** 2);
          const res = simulateProgramme({ perNight, sigmaColour: sc, sigmaPair: sp, kappa: 0.5, colourN: colourN * scale, pairN: pairN.map((n) => n * scale), deff: 1.1, band: 0.05, minPairN: 400, rule, maxNights: 30, sims: 2000, seed });
          programme.push({ transfer: tr, case: tr === TRANSFER_BASE ? 'base' : tr === TRANSFER_PESSIMISTIC ? 'pessimistic' : 'lower bound', pull: pullName, rule, scale, perNight, sigmaColour: sc, sigmaPair: sp, median: res.median, p80: res.p80, within: res.within, truePass: res.truePass, by5: res.byNight[4], by10: res.byNight[9] });
        }
      }
    }
  }

  // ---- write
  const json = {
    v: 2, made: 'tools/cubelab.sh balance-model', reps, seed, mix, searchTol, exclude: exclusion ? { ...exclusion, list: [...excluded] } : null, suffix,
    inputs: Object.fromEntries([
      ['census-decks', path.join(censusDir, 'out/census-decks.jsonl.gz')], ['census-games', path.join(censusDir, 'out/census-games.jsonl.gz')], ['facts', factsFile], ...(excludeFile ? [['exclude', excludeFile]] : []),
      ...(omegaDir ? [['omega-drafted-decks', path.join(omegaDir, 'out/drafted-decks.jsonl.gz')], ['omega-pool-decks', path.join(omegaDir, 'census/decks/decks.jsonl')], ['omega-cube', path.join(repo, 'cubes/omega-cube-180.md')], ['omega-games', path.join(omegaDir, 'out/games.jsonl.gz')], ['omega-balance', path.join(omegaDir, 'out/balance.json')]] : []),
    ].map(([k, file]) => [k, { file, sha256: createHash('sha256').update(fs.readFileSync(file as string)).digest('hex') }])), playCurve: { a: curve.a, b: curve.b, cards: curveN },
    sources: sources.map((s) => ({ name: s.name, label: s.label, grouping: s.grouping, decks: s.decks, games: s.games, cards: s.fit.design.cards.length, groups: groupEffects(s.fit), cv: s.cv, cvByDeck: s.cvDeck, reliability: s.reliability, repeatability: s.repeat, trueSpread: trueSpread(s.effects.filter((e) => e.deckGames >= 200), s.repeat.full), trueSpreadByGame: trueSpread(s.effects.filter((e) => e.deckGames >= 200), s.reliability.full) })),
    coverage, agreements, validation,
    candidates: candidates.map((c) => ({ id: c.id, file: path.relative(repo, c.file), idea: c.idea, source: c.src.name, target: c.opts.target, pred: c.pred, summary: c.summary, ratingByColour: c.ratingByColour, maxPairGap: maxGap(c.pred.pair), maxColourGap: maxGap(c.pred.colour), searchSwaps: c.searchSwaps, flowGap: c.flowGap, searchedGap: c.searchedGap, searchTol, excludedInPool: c.excludedSeen, unmeasured: c.cards.filter((x) => !x.land && x.value === null).length })),
    omega: omegaAppendix,
    programme: { predColourSd, predPairSd, transferBase: TRANSFER_BASE, transferPessimistic: TRANSFER_PESSIMISTIC, transferLowerBound: transferLow, colourN, pairNBot, pairNEven, kappa: 0.5, runs: programme },
  };
  fs.writeFileSync(path.join(out, 'model.json'), `${JSON.stringify(json, null, 1)}\n`);
  fs.writeFileSync(path.join(out, 'summary.md'), summaryMd(json, sources, candidates.map((c) => c.cards), info));
  say(`balance-model: wrote ${out}/model.json, summary.md, ${sources.length} card tables and ${candidates.length} cubes under ${cubesOut}`);
  return 0;
}

// ------------------------------------------------------------------ the summary (tables)

function topTable(s: Source, n: number, sign: 1 | -1, info: Map<string, { band: string; colors: string; rating: number }>): string[] {
  const es = s.effects.filter((e) => e.deckGames >= 200).sort((a, b) => sign * (b.est - a.est)).slice(0, n);
  return ['| card | band | colours | rating | value (pts) | 95% | deck-games |', '|---|---|---|---|---|---|---|',
    ...es.map((e) => { const i = info.get(e.card); return `| ${e.card} | ${i?.band ?? '?'} | ${i?.colors || 'C'} | ${i ? i.rating.toFixed(0) : '?'} | ${pts(e.est)} | ${pts(e.lo)} to ${pts(e.hi)} | ${e.deckGames} |`; })];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summaryMd(j: any, sources: Source[], cubes: GenCard[][], info: Map<string, { band: string; colors: string; rating: number }>): string {
  const L: string[] = ['# balance-model: the library card model and the generated cubes', ''];
  L.push('## Fit quality (5-fold held-out) and repeatability, by game and by deck', '',
    'By game, a deck\'s games fall on both sides of every split, so what a deck does that its cards absorb counts as signal. By deck (decks, or J145-B\'s drafts, split at random; a held-out game is one whose two decks were both held out), no deck is on both sides: the **repeatability by deck** is the headline, the share of the card values\' spread that holds on new decks. It is stepped up from its halves by Spearman–Brown at k = full games / a half\'s games (the census halves keep only the games inside a half). The fit keeps the by-game lambda.', '',
    '| source | decks | games | cards | lambda (by game / by deck) | Brier, cards | Brier, makeup only | skill by game | skill by deck (games scored) | accuracy | reliability by game | **repeatability by deck** (half r, k) | true spread of card values (pts SD, by deck / by game) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of j.sources) L.push(`| ${s.name} | ${s.decks} | ${s.games} | ${s.cards} | ${s.cv.lambda} / ${s.cvByDeck.lambda} | ${s.cv.brier.toFixed(4)} | ${s.cv.brierGroupsOnly.toFixed(4)} | ${(100 * s.cv.skill).toFixed(1)}% | ${(100 * s.cvByDeck.skill).toFixed(1)}% (${s.cvByDeck.tested}) | ${s.cv.accuracy.toFixed(3)} | ${s.reliability.full.toFixed(2)} | **${s.repeatability.full.toFixed(2)}** (${s.repeatability.half.toFixed(2)}, ${s.repeatability.k.toFixed(1)}) | ${(100 * s.trueSpread).toFixed(2)} / ${(100 * s.trueSpreadByGame).toFixed(2)} |`);
  L.push('', '## Coverage by band (census pool: in-band, supported, nonland, not AI:RemoveDeck:All)', '', '| band | pool | drawn | never drawn | 200+ deck-games | 1000+ | sd ≤ 2 pts | sd ≤ 3 pts | median sd | median deck-games | interval excludes 0 | extra census nights for median sd 2 pts |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of j.coverage) L.push(`| ${c.band} | ${c.pool} | ${c.drawn} | ${c.never} | ${c.games200} | ${c.games1000} | ${c.sd02} | ${c.sd03} | ${(100 * c.sdMedian).toFixed(2)} | ${c.gamesMedian} | ${c.excludesZero} | ${c.nightsForSd02.toFixed(1)} |`);
  L.push('', '## Agreement between sources (cards with 200+ deck-games in both)', '', '| A | B | n | Pearson | Spearman | slope B on A | true-value r (disattenuated by the by-deck repeatability) | the same by the by-game split |', '|---|---|---|---|---|---|---|---|');
  for (const a of j.agreements) L.push(`| ${a.a} | ${a.b} | ${a.n} | ${f3(a.pearson)} | ${f3(a.spearman)} | ${f3(a.slope)} | ${f3(a.trueCorrelation)} | ${f3(a.trueCorrelationByGame ?? NaN)} |`);
  if (j.validation) {
    L.push('', '## Validation: Omega\'s measured payoffs (J145) predicted from the census alone', '', `RMSE census-predicted: Blab ${f3(j.validation.rmse['Blab.pred'])}, C ${f3(j.validation.rmse['C.pred'])}; correlation Blab ${f3(j.validation.corr['Blab.pred'])}, C ${f3(j.validation.corr['C.pred'])}; residual beyond both noises (sqrt(max(0, RMSE² − read variance − prediction variance))): Blab ${f3(j.validation.transferSd['Blab.pred'])}, C ${f3(j.validation.transferSd['C.pred'])} — 0 here means 15 cells cannot tell the transfer error from 0, a lower bound and not an estimate; the programme below uses .015 as its base case. In-sample (J145's own card fit): RMSE Blab ${f3(j.validation.rmse['Blab.predOwn'])}, C ${f3(j.validation.rmse['C.predOwn'])}.`, '',
      '| arm | cell | observed | census-predicted | J145-fit (in-sample) |', '|---|---|---|---|---|');
    for (const r of j.validation.rows) L.push(`| ${r.arm} | ${r.key} | ${iv(r.obs)} | ${iv(r.pred)} | ${iv(r.predOwn)} |`);
  }
  for (const name of ['legacy+powered.makeup', 'pauper.makeup', 'omega-B.makeup', 'omega-C.makeup']) {
    const s = sources.find((x) => x.name === name);
    if (!s) continue;
    L.push('', `## ${name}: the 20 highest values`, '', ...topTable(s, 20, 1, info), '', `## ${name}: the 20 lowest values`, '', ...topTable(s, 20, -1, info));
  }
  L.push('', '## The generated cubes: predicted payoff (lab drafter, Forge piloting)', '', `Deck mix (J145 lab two-colour decks): ${j.mix.perColour.toFixed(2)} cards of each colour, ${j.mix.gold.toFixed(2)} gold, ${j.mix.colourless.toFixed(2)} colourless. Play weight by Forge rating (J145, ${j.playCurve.cards} cards): ${j.playCurve.a.toFixed(3)} + ${j.playCurve.b.toFixed(4)} x rating, clipped to [.05, 1].`, '');
  j.candidates.forEach((c: { id: string; idea: string; pred: PayoffPrediction; maxPairGap: number; maxColourGap: number; unmeasured: number; flowGap: number; searchedGap: number; searchTol: number; searchSwaps: number; ratingByColour: Record<string, number>; summary: Array<{ cls: string; n: number; measured: number; meanValue: number; meanRating: number; creatures: number }> }, i: number) => {
    L.push(`### ${c.id}`, '', c.idea, '', `max |colour − .5| ${f3(c.maxColourGap)}, max |pair − .5| ${f3(c.maxPairGap)}; colour + pair gap ${f3(c.flowGap)} after the flow alone, ${f3(c.searchedGap)} after ${c.searchSwaps} balancing swaps (the search stops at ${c.searchTol}, about one card's SD${c.searchedGap > c.searchTol + 1e-12 ? ', and ran out of improving swaps above it here' : ''}: even to within the model's own uncertainty); unmeasured nonland cards ${c.unmeasured}; ${cubes[i]?.length} cards.`, '',
      '| | ' + MONO.join(' | ') + ' |', '|---|' + '---|'.repeat(5), `| payoff | ${MONO.map((k) => iv(c.pred.colour[k] as Cell)).join(' | ')} |`, `| mean rating, top 24 (pull proxy) | ${MONO.map((k) => (c.ratingByColour[k] as number).toFixed(1)).join(' | ')} |`, '',
      '| ' + PAIRS.join(' | ') + ' |', '|' + '---|'.repeat(10), `| ${PAIRS.map((p) => iv(c.pred.pair[p] as Cell)).join(' | ')} |`, '',
      '| class | cards | measured | mean value (pts) | mean rating | creatures |', '|---|---|---|---|---|---|',
      ...c.summary.map((s) => `| ${s.cls} | ${s.n} | ${s.measured} | ${pts(s.meanValue)} | ${s.meanRating.toFixed(1)} | ${s.creatures} |`), '');
  });
  L.push('## The measurement programme, simulated', '', `Model error per cell = sqrt(prediction SD² + transfer SD²): prediction SD colour ${f3(j.programme.predColourSd)}, pair ${f3(j.programme.predPairSd)} (the generated cubes' bootstrap, median); transfer SD (census values carried to drafted decks) ${f3(j.programme.transferBase)} as the base case and ${f3(j.programme.transferPessimistic)} as the pessimistic one; Omega's residuals (${f3(j.programme.transferLowerBound)}) only bound it from below, so that row is a lower bound, not a case. A measurement is J145's arm B: ${j.programme.colourN} deck-games per colour cell; pairs at the bots' J145 pull (${j.programme.pairNBot.join('/')}) or even pull (${j.programme.pairNEven[0]} each). Each night's refit divides the error variance by 1 + 0.5 x nights. A pass needs a second fresh-seed measurement (the next night's first slot). 2,000 simulated programmes, 30 nights at most.`, '',
    '| transfer SD | case | pull | rule | measurement size (x J145 arm B) | cubes a night | median nights | 80th pct | confirmed by night 5 | by night 10 | within 30 | confirmed cube truly in band |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of j.programme.runs) L.push(`| ${f3(r.transfer)} | ${r.case} | ${r.pull} | ${r.rule} | ${r.scale} | ${r.perNight} | ${r.median > 30 ? '>30' : Math.ceil(r.median)} | ${r.p80 > 30 ? '>30' : Math.ceil(r.p80)} | ${(100 * r.by5).toFixed(0)}% | ${(100 * r.by10).toFixed(0)}% | ${(100 * r.within).toFixed(0)}% | ${Number.isFinite(r.truePass) ? `${(100 * r.truePass).toFixed(0)}%` : '—'} |`);
  L.push('');
  if (j.omega) {
    L.push('## Omega (appendix)', '', 'The census model on Omega\'s list (the analytic deck mix, cards weighted by the play curve), and after up to ten like-for-like upgrades under evolve\'s add rules and Omega\'s notes:', '',
      '| | ' + MONO.join(' | ') + ' |', '|---|' + '---|'.repeat(5), `| v1 | ${MONO.map((k) => iv(j.omega.analytic.colour[k])).join(' | ')} |`, `| after ${j.omega.k} swaps | ${MONO.map((k) => iv(j.omega.after.colour[k])).join(' | ')} |`, '',
      '| | ' + PAIRS.join(' | ') + ' |', '|---|' + '---|'.repeat(10), `| v1 | ${PAIRS.map((p) => f3(j.omega.analytic.pair[p].est)).join(' | ')} |`, `| after | ${PAIRS.map((p) => f3(j.omega.after.pair[p].est)).join(' | ')} |`, '',
      '| # | cut | value | add | value |', '|---|---|---|---|---|', ...j.omega.cutsAdds.map((s: { cut: string; add: string; dCut: number; dAdd: number }, i: number) => `| ${i + 1} | ${s.cut} | ${pts(s.dCut)} | ${s.add} | ${pts(s.dAdd)} |`), '');
  }
  return `${L.join('\n')}\n`;
}

export { sdOf, shapeOf };

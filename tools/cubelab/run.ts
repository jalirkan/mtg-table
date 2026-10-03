// mtg-table — the cube lab: `run`, from a cube file to <out>/drafts.jsonl.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// 1. the cube, its facts (one engine boot, cached) and its ratings;
// 2. every draft and both decks, in this process, seed by seed (pure, D294);
//    the decks are written as Forge .dck files under <out>/decks/;
// 3. the matches, sharded over --jobs workers (engine.ts's pool and watchdog),
//    each result appended to <out>/drafts.jsonl the moment it lands, so an
//    overnight run that is stopped keeps every finished draft, and a re-run
//    with the same --out resumes (a seed already in the file is skipped);
// 4. --record M: the first M drafts' decks played once more by
//    mtgtable.RecordMatch, one game each, into <out>/frames/ (a ForgeCoach
//    frame log, seat 0 = drafter A's view);
// 5. every worker's Forge home checked for a saved preferences file (hard rule
//    11 / D107: a run must never save one).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Fact } from './cards.ts';
import { loadBridge, type BridgeMeta, type BridgeOptions, type BridgeTag } from './bridge.ts';
import { parseCube } from './cube.ts';
import { dckText } from './deck.ts';
import { engineFacts, runPool, type EngineEnv, type ForgeBuild, type GameRow, type MatchJob } from './engine.ts';
import { loadCube, runDraft, type DrafterOut, type DraftOut, type Format, type LoadedCube } from './lab.ts';
import { parseSynergy } from './pairs.ts';
import { parseRatings } from './ratings.ts';
import { reRated, runMixedDraft, type MixedMode } from './selfplay.ts';
import type { CardInfo } from './report.ts';
import type { Weights } from './weights.ts';

export interface RunOptions {
  cubeFile: string;
  format: Format;
  drafts: number;
  games: number;
  jobs: number;
  seed: number;
  profiles: [string, string];
  ratingsFile: string | null;
  record: number;
  out: string;
  builder: 'lab' | 'forge';
  gameTimeoutSec: number;
  winstonCards: number;
  weights: Weights;
  /** Learned pair synergy for both drafters (`--synergy <tsv>`, D301). */
  synergyFile?: string | null;
  /** ...and for both deckbuilders (`--deck-synergy`). */
  deckSynergy?: boolean;
  /** Head-to-head (D302): seat A drafts and/or builds with these, seat B with the baseline (`--ratings`, no pairs). */
  mixed?: { mode: MixedMode; ratingsFile: string; synergyFile: string | null; deckSynergy: boolean };
  /** A bridge run (`--bridge a,b`): every draft's pool sampled from these cubes (bridge.ts). */
  bridge?: BridgeOptions;
}

/** A drafter's line in drafts.jsonl: the draft side, plus which deck played and Forge's own build. */
export interface DrafterRecord extends DrafterOut {
  played: 'lab' | 'forge';
  /** The lab's .dck, relative to the run folder (null when it built none and Forge's played). */
  deckFile: string | null;
  forgeDeckFile: string;
  forge: ForgeBuild | null;
}

/** One line of drafts.jsonl. */
export interface DraftRecord extends Omit<DraftOut, 'drafters' | 'ms'> {
  v: 1;
  cube: string;
  drafters: [DrafterRecord, DrafterRecord];
  match: { games: GameRow[]; winsA: number; winsB: number; winner: 'A' | 'B' | 'draw'; engineError?: string; worker: number };
  ms: DraftOut['ms'] & { match: number };
  /** A bridge draft's pool: its source cubes and which cube each card came from (bridge.ts; absent in a normal run). */
  bridge?: BridgeTag;
}

export interface RunMeta {
  v: 1;
  cube: string;
  cubeFile: string;
  cubeSha: string;
  format: Format;
  seed: number;
  drafts: number;
  games: number;
  profiles: [string, string];
  builder: 'lab' | 'forge';
  ratingsFile: string | null;
  ratingsFromFile: number;
  gameTimeoutSec: number;
  winstonCards: number;
  weights: Weights;
  forgeJar: string;
  missing: string[];
  themeNames: Record<string, string>;
  archetypes: Record<string, string>;
  /** D301-D302: the learned files this run drafted or built with (absent for a plain run). */
  learned?: {
    synergyFile: string | null; synergySha: string | null; deckSynergy: boolean;
    mixed: { mode: MixedMode; ratingsFile: string; ratingsSha: string; synergyFile: string | null; synergySha: string | null; deckSynergy: boolean } | null;
  };
  /** A bridge run's source cubes, shares and pool size (bridge.ts; absent in a normal run). */
  bridge?: BridgeMeta;
}

export const sha = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

export function loadForRun(env: EngineEnv, cubeFile: string, ratingsFile: string | null, w: Weights, say: (s: string) => void): { lc: LoadedCube; facts: Fact[]; text: string } {
  const text = fs.readFileSync(cubeFile, 'utf8');
  const cube = parseCube(text);
  for (const warn of cube.warnings) say(`cube: ${warn}`);
  const facts = engineFacts(env, cube.cards.map((c) => c.name), say);
  const ratings = ratingsFile ? parseRatings(fs.readFileSync(ratingsFile, 'utf8')) : null;
  return { lc: loadCube(cube, facts, ratings, w), facts, text };
}

/** The ratings file beside a cube (`cubes/x.md` -> `cubes/x.ratings.tsv`), when there is one. */
export function defaultRatings(cubeFile: string): string | null {
  const f = cubeFile.replace(/\.md$/, '') + '.ratings.tsv';
  return fs.existsSync(f) ? f : null;
}

export async function runLab(env: EngineEnv, o: RunOptions, say: (s: string) => void): Promise<void> {
  const t0 = Date.now();
  const bridge = o.bridge ? loadBridge(env, o.bridge, o.weights, say, sha) : null;
  const { lc, text } = bridge ?? loadForRun(env, o.cubeFile, o.ratingsFile, o.weights, say);
  const rel = (f: string): string => path.relative(env.repo, path.resolve(f));
  const shaOf = (f: string | null | undefined): string | null => (f ? sha(fs.readFileSync(f)) : null);
  let draftOne = (seed: number): DraftOut => runDraft(lc, o.format, seed, o.weights, o.winstonCards);
  if (bridge) {
    if (o.synergyFile || o.mixed) throw new Error('--bridge drafts with each cube\'s ratings; it takes no --synergy or head-to-head');
    draftOne = (seed) => bridge.draft(seed, o.format, o.weights, o.winstonCards);
  }
  let learnedMeta: RunMeta['learned'];
  if (o.synergyFile || o.mixed) {
    if (o.synergyFile) {
      const t = parseSynergy(fs.readFileSync(o.synergyFile, 'utf8'));
      lc.pairs = t;
      if (o.deckSynergy) lc.deckPairs = t;
    }
    let mixedMeta = null;
    if (o.mixed) {
      const m = o.mixed;
      const t = m.synergyFile ? parseSynergy(fs.readFileSync(m.synergyFile, 'utf8')) : undefined;
      const learned = reRated(lc, parseRatings(fs.readFileSync(m.ratingsFile, 'utf8')), t);
      draftOne = (seed) => runMixedDraft(lc, learned, m.mode, o.format, seed, o.weights, o.winstonCards, m.deckSynergy ? t : undefined);
      mixedMeta = { mode: m.mode, ratingsFile: rel(m.ratingsFile), ratingsSha: shaOf(m.ratingsFile) as string, synergyFile: m.synergyFile ? rel(m.synergyFile) : null, synergySha: shaOf(m.synergyFile), deckSynergy: m.deckSynergy };
      say(`head-to-head (${m.mode}): seat A ${m.ratingsFile}${m.synergyFile ? ` + ${m.synergyFile}` : ''}${m.deckSynergy ? ' (deck pairs on)' : ''}, seat B the baseline`);
    }
    learnedMeta = { synergyFile: o.synergyFile ? rel(o.synergyFile) : null, synergySha: shaOf(o.synergyFile), deckSynergy: !!o.deckSynergy, mixed: mixedMeta };
  }
  if (lc.missing.length > 0) say(`WARNING: ${lc.missing.length} card(s) not in the engine, drafted without them: ${lc.missing.map((m) => m.listed).join(', ')} (run check)`);
  const meta: RunMeta = {
    v: 1, cube: lc.cube.title, cubeFile: path.relative(env.repo, path.resolve(o.cubeFile)), cubeSha: sha(text),
    format: o.format, seed: o.seed, drafts: o.drafts, games: o.games, profiles: o.profiles, builder: o.builder,
    ratingsFile: o.ratingsFile ? path.relative(env.repo, path.resolve(o.ratingsFile)) : null, ratingsFromFile: lc.ratedFromFile,
    gameTimeoutSec: o.gameTimeoutSec, winstonCards: o.winstonCards, weights: o.weights,
    forgeJar: process.env.FORGE_JAR ?? '', missing: lc.missing.map((m) => m.listed),
    themeNames: lc.cube.themeNames, archetypes: lc.cube.archetypes,
    ...(learnedMeta ? { learned: learnedMeta } : {}),
    ...(bridge ? { bridge: bridge.meta } : {}),
  };
  fs.mkdirSync(path.join(o.out, 'decks'), { recursive: true });
  const metaFile = path.join(o.out, 'run.json');
  const jsonl = path.join(o.out, 'drafts.jsonl');
  const done = new Set<number>();
  if (fs.existsSync(metaFile)) {
    const old = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as RunMeta;
    const same = (k: (m: RunMeta) => unknown): boolean => JSON.stringify(k(old)) === JSON.stringify(k(meta));
    if (!same((m) => [m.cubeSha, m.format, m.games, m.profiles, m.builder, m.weights, m.winstonCards, m.learned ?? null, m.bridge ?? null])) {
      throw new Error(`${o.out} holds a run with a different cube, format, games, profiles, builder, weights or learned files -- use a new --out`);
    }
    if (fs.existsSync(jsonl)) {
      for (const line of fs.readFileSync(jsonl, 'utf8').split('\n')) if (line.trim()) done.add((JSON.parse(line) as DraftRecord).seed);
    }
    meta.seed = Math.min(old.seed, o.seed);
    meta.drafts = Math.max(old.seed + old.drafts, o.seed + o.drafts) - meta.seed;
    if (done.size > 0) say(`resuming: ${done.size} draft(s) already in ${jsonl}`);
  }
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  // What the report needs to know about each card, as this run saw it.
  const info: Record<string, CardInfo> = {};
  for (const c of lc.cards) {
    info[c.name] = { section: c.section, colors: c.colors, cmc: c.cmc, land: c.land, themes: c.themes, rating: c.rating, remAIDeck: c.remAIDeck, type: c.type };
  }
  fs.writeFileSync(path.join(o.out, 'cards.json'), `${JSON.stringify(info, null, 1)}\n`);

  // 2. drafts and decks
  const jobs: MatchJob[] = [];
  const outs = new Map<number, DraftOut>();
  const tDraft = Date.now();
  for (let i = 0; i < o.drafts; i++) {
    const seed = o.seed + i;
    if (done.has(seed)) continue;
    const d = draftOne(seed);
    outs.set(seed, d);
    const deckPath = (side: string, kind: string): string => path.join(o.out, 'decks', `${seed}-${side}${kind}.dck`);
    const sides = d.drafters.map((dr) => {
      if (!dr.deck || dr.deckErrors.length > 0) return null;
      const sideboard = [...dr.pool];
      for (const [n, name] of dr.deck.main) for (let k = 0; k < n; k++) { const at = sideboard.indexOf(name); if (at >= 0) sideboard.splice(at, 1); }
      const f = deckPath(dr.seat, '');
      fs.writeFileSync(f, dckText(`cubelab ${seed} ${dr.seat}`, dr.deck.main, sideboard));
      return path.resolve(f);
    });
    jobs.push({
      id: String(seed), seed, games: o.games, gameTimeoutSec: o.gameTimeoutSec,
      profileA: o.profiles[0], profileB: o.profiles[1], builder: o.builder,
      deckA: sides[0] ?? null, deckB: sides[1] ?? null,
      poolA: d.drafters[0].pool, poolB: d.drafters[1].pool,
      forgeDeckOutA: path.resolve(deckPath('A', '-forge')), forgeDeckOutB: path.resolve(deckPath('B', '-forge')),
    });
  }
  say(`drafted and built ${jobs.length} draft(s) in ${((Date.now() - tDraft) / 1000).toFixed(1)} s; playing ${o.games > 1 ? `best of ${o.games}` : '1 game'} each on ${Math.min(o.jobs, Math.max(1, jobs.length))} worker(s)`);

  // 3. matches
  let finished = 0;
  const tMatch = Date.now();
  const started = new Map<string, number>();
  for (const j of jobs) started.set(j.id, Date.now());
  const homes = env.homes.slice(0, Math.max(1, Math.min(o.jobs, jobs.length)));
  await runPool({ ...env, homes }, jobs, path.join(o.out, 'logs'), (job, r, worker) => {
    const d = outs.get(job.seed) as DraftOut;
    const wins = { A: 0, B: 0 };
    for (const g of r.games) if (g.winner === 'A' || g.winner === 'B') wins[g.winner]++;
    const rec: DraftRecord = {
      v: 1, cube: lc.cube.title, ...d,
      drafters: d.drafters.map((dr, k): DrafterRecord => {
        const side = k === 0 ? 'A' : 'B';
        const fb = r.forge.find((f) => f.side === side);
        const labDeck = side === 'A' ? job.deckA : job.deckB;
        return {
          ...dr,
          played: o.builder === 'forge' || !labDeck ? 'forge' : 'lab',
          deckFile: labDeck ? path.relative(o.out, labDeck) : null,
          forgeDeckFile: path.relative(o.out, side === 'A' ? job.forgeDeckOutA : job.forgeDeckOutB),
          forge: fb ?? null,
        };
      }) as [DrafterRecord, DrafterRecord],
      match: {
        games: r.games, winsA: wins.A, winsB: wins.B,
        winner: wins.A > wins.B ? 'A' : wins.B > wins.A ? 'B' : 'draw', worker,
        ...(r.engineError ? { engineError: r.engineError } : {}),
      },
      ms: { ...d.ms, match: Date.now() - (started.get(job.id) ?? Date.now()) },
    };
    fs.appendFileSync(jsonl, `${JSON.stringify(rec)}\n`);
    finished++;
    const g = r.games.map((x) => (x.winner === 'draw' ? (x.timeout ? 'T' : 'D') : x.winner)).join('');
    say(`[${finished}/${jobs.length}] seed ${job.seed}: ${deckLabel(d, 0)} ${wins.A}-${wins.B} ${deckLabel(d, 1)}  games ${g || '-'}${r.engineError ? `  ENGINE ERROR: ${r.engineError}` : ''}`);
  }, say);
  const matchSecs = (Date.now() - tMatch) / 1000;
  if (jobs.length > 0) say(`matches: ${matchSecs.toFixed(0)} s for ${jobs.length} (${(matchSecs / jobs.length).toFixed(1)} s a draft wall-clock on ${homes.length} worker(s))`);

  // 4. recordings
  if (o.record > 0) recordGames(env, o, say);

  // 5. no Forge home saved preferences
  for (const h of env.homes) {
    const prefs = path.join(path.dirname(h), 'forge', 'preferences');
    const saved = fs.existsSync(prefs) ? fs.readdirSync(prefs) : [];
    if (saved.length > 0) throw new Error(`a worker SAVED Forge preferences under ${prefs} (${saved.join(', ')}) -- a run must never save prefs (CLAUDE.md hard rule 11, D107)`);
  }
  say(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${jsonl}`);
}

function deckLabel(d: DraftOut, k: 0 | 1): string {
  const deck = d.drafters[k].deck;
  return deck ? `${d.drafters[k].seat}:${deck.colors}${deck.splash ? `+${deck.splash.toLowerCase()}` : ''}` : `${d.drafters[k].seat}:forge`;
}

/** Record game 1 of the first `o.record` drafts with mtgtable.RecordMatch, seat 0 = drafter A. */
export function recordGames(env: EngineEnv, o: RunOptions, say: (s: string) => void): void {
  const jsonl = path.join(o.out, 'drafts.jsonl');
  if (!fs.existsSync(jsonl)) return;
  const recs = fs.readFileSync(jsonl, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord)
    .sort((a, b) => a.seed - b.seed).slice(0, o.record);
  const framesDir = path.join(o.out, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  const indexFile = path.join(o.out, 'recordings.json');
  const index: Array<{ seed: number; file: string; seat: 'A'; decks: [string, string]; ok: boolean; ms: number }> =
    fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : [];
  for (const rec of recs) {
    if (index.some((x) => x.seed === rec.seed && x.ok)) continue;
    const deckOf = (k: 0 | 1): string => {
      const dr = rec.drafters[k];
      return path.resolve(o.out, (dr.played === 'lab' && dr.deckFile) ? dr.deckFile : (dr.forgeDeckFile as string));
    };
    const out = path.join(framesDir, `draft-${rec.seed}-g1.jsonl`);
    const t = Date.now();
    const r = spawnSync(path.join(env.repo, 'bridge/run.sh'), ['mtgtable.RecordMatch', '--deck', deckOf(0), '--ai-deck', deckOf(1),
      '--profile', o.profiles[0], '--ai-profile', o.profiles[1], '--seed', String(rec.seed), '--out', path.resolve(out)],
    { cwd: env.repo, encoding: 'utf8', env: { ...process.env, MTG_TABLE_CONFIG: env.homes[0] }, timeout: (o.gameTimeoutSec + 120) * 1000, maxBuffer: 256 * 1024 * 1024 });
    const ok = r.status === 0 && fs.existsSync(out);
    fs.writeFileSync(path.join(o.out, 'logs', `record-${rec.seed}.log`), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
    index.push({ seed: rec.seed, file: path.relative(o.out, out), seat: 'A', decks: [path.basename(deckOf(0)), path.basename(deckOf(1))], ok, ms: Date.now() - t });
    say(`record seed ${rec.seed}: ${ok ? path.relative(env.repo, out) : `FAILED (exit ${r.status}; logs/record-${rec.seed}.log)`} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
  fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
}

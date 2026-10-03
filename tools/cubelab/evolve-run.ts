// mtg-table — the cube lab: `evolve`, the loop — generations of drafts, stats and swaps on disk.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh evolve <cube.md> --pool <pool.tsv> [--notes <tsv>] --generations G
//       --drafts-per-gen N [--jobs K] [--seed S] [--out <dir>] [--swaps M] [--evolve name=value]...
//       [--record-all | --record-every N]
//
// <out>/
//   evolve.json          the options, knobs, constraints (from the starting cube) and every generation's result
//   gen-NN/input.md      the cube this generation drafted
//   gen-NN/run/          the lab's run folder (run.ts): drafts.jsonl, decks, report.html, meta.json -- the DISCOVERY batch
//   gen-NN/confirm/      a second run folder, only when discovery found candidates: the CONFIRMATION batch (D331)
//   gen-NN/cube.md       the cube coming out: swaps applied, an iteration-log entry added
//   gen-NN/stats.json    every card's numbers and assessment, the balance, the decision
//   gen-NN/section.html  the generation as an HTML section
//   gen-NN/result.json   written last: the generation is done
//   evolve.lock          the running process's pid (a second evolve on the folder is refused)
//   changelog.md, index.html, <cube>.md (the latest cube)
//
// Generation g plays seeds S + (g−1)·N .. S + g·N − 1 (fresh drafts every
// generation); its confirmation batch, when there is one, seeds
// S + confirmSeedOffset + (g−1)·confirmMaxDrafts onward -- a range no discovery
// batch and no other generation's confirmation touches.  Nothing is pooled
// across generations or across the two batches (D331).  --record-all /
// --record-every N (D315) record both batches' games.  RESUMABLE: a generation whose result.json names the same input
// is skipped; one without it resumes its run folder (run.ts skips the seeds
// already played).  A folder made with other options or knobs is refused.
// The drafts and decks are a function of the seed (D294) and the swaps a pure
// function of the drafts.jsonl (evolve.ts); only Forge's games vary between
// runs, as they do for `run`.

import fs from 'node:fs';
import path from 'node:path';

import { GUILD } from './cards.ts';
import { parseCube } from './cube.ts';
import { writeCubeDoc } from './cubedoc.ts';
import { engineFacts, type EngineEnv } from './engine.ts';
import {
  applySwaps, balanceOf, batchDeff, cardStats, constraintsOf, discoveryStage, enrichPool, evolveCards, parseNotes, parsePool, selectSwaps,
  type ConfirmInput, type Constraints, type EvolveKnobs, type MetaDoc, type Note, type Swap,
} from './evolve.ts';
import { changelog, htmlPage, htmlSection, logEntry, type GenSummary } from './evolve-report.ts';
import { buildMeta } from './meta.ts';
import { parseRatings } from './ratings.ts';
import { aggregate, renderHtml, type CardInfo } from './report.ts';
import { runLab, sha, type DraftRecord, type RunMeta } from './run.ts';
import type { Weights } from './weights.ts';

export interface EvolveOptions {
  cubeFile: string;
  poolFile: string;
  notesFile: string | null;
  generations: number;
  drafts: number;
  jobs: number;
  seed: number;
  out: string;
  games: number;
  profiles: [string, string];
  ratingsFile: string | null;
  gameTimeoutSec: number;
  weights: Weights;
  knobs: EvolveKnobs;
  date: string;
  /** D315: record every game of each draft whose seed is a multiple of this, in both batches (0 = off). */
  recordEvery?: number;
}

interface GenResult {
  gen: number; inputSha: string; outputSha: string; versionIn: number; versionOut: number; seeds: [number, number];
  /** The confirmation batch's seeds (absent: discovery found no candidate). */
  confirmSeeds?: [number, number];
  swaps: Swap[]; verdict: string; date: string; notesSha: string | null;
}
interface State {
  v: 1;
  cube: string;
  startSha: string;
  pool: string;
  poolSha: string;
  drafts: number;
  seed: number;
  games: number;
  profiles: [string, string];
  weights: Weights;
  knobs: EvolveKnobs;
  constraints: Constraints;
  date: string;
  generations: GenResult[];
}

/** The notes file beside a cube: `cubes/omega-cube-180.md` -> `cubes/omega-notes.tsv`. */
export function defaultNotes(cubeFile: string): string {
  const base = path.basename(cubeFile, '.md').replace(/-cube.*$/, '');
  return path.join(path.dirname(cubeFile), `${base}-notes.tsv`);
}

/** A cube's list, whatever its prose says: the sorted names with their sections. */
const listKey = (c: { cards: Array<{ name: string; section: string }> }): string => c.cards.map((x) => `${x.section}\t${x.name}`).sort().join('\n');
const versionOf = (title: string): number => Number(/\bversion (\d+)\b/.exec(title)?.[1] ?? 1);
const pad = (g: number): string => String(g).padStart(2, '0');

function readRunDir(out: string): { meta: RunMeta; cards: Record<string, CardInfo>; recs: DraftRecord[] } {
  const meta = JSON.parse(fs.readFileSync(path.join(out, 'run.json'), 'utf8')) as RunMeta;
  const cards = JSON.parse(fs.readFileSync(path.join(out, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  const jsonl = path.join(out, 'drafts.jsonl');
  const recs = fs.existsSync(jsonl) ? fs.readFileSync(jsonl, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as DraftRecord) : [];
  return { meta, cards, recs };
}

/** One evolve per folder: a second process would append the same seeds and share the workers' Forge homes. */
function lock(out: string): () => void {
  const file = path.join(out, 'evolve.lock');
  if (fs.existsSync(file)) {
    const pid = Number(fs.readFileSync(file, 'utf8').trim());
    let alive = false;
    try { process.kill(pid, 0); alive = pid > 0; } catch { alive = false; }
    if (alive) throw new Error(`${out} is in use by evolve pid ${pid} -- wait for it, or stop it first`);
  }
  fs.writeFileSync(file, `${process.pid}\n`);
  return () => { try { fs.unlinkSync(file); } catch { /* already gone */ } };
}

export async function evolve(env: EngineEnv, o: EvolveOptions, say: (s: string) => void): Promise<void> {
  fs.mkdirSync(o.out, { recursive: true });
  const unlock = lock(o.out);
  try {
    await evolveLocked(env, o, say);
  } finally {
    unlock();
  }
}

async function evolveLocked(env: EngineEnv, o: EvolveOptions, say: (s: string) => void): Promise<void> {
  const startText = fs.readFileSync(o.cubeFile, 'utf8');
  const startCube = parseCube(startText);
  for (const w of startCube.warnings) say(`cube: ${w}`);
  const poolText = fs.readFileSync(o.poolFile, 'utf8');
  let pool = parsePool(poolText, o.weights.unrated);
  // One engine boot (cached under var/cubelab/facts/) for the pool and the cube: colours, ranks, AI flags.
  const names = [...new Set([...pool.map((p) => p.name), ...startCube.cards.map((c) => c.name)])];
  pool = enrichPool(pool, engineFacts(env, names, say), o.weights.unrated);
  // --ratings: the drafters pick by that file, so the loop judges ratings by it too (rating-limited, adds).
  if (o.ratingsFile) {
    const r = parseRatings(fs.readFileSync(o.ratingsFile, 'utf8'));
    pool = pool.map((p) => (r.has(p.name) ? { ...p, rating: r.get(p.name) as number } : p));
  }
  const poolBy = new Map(pool.map((p) => [p.name, p]));
  const missing = startCube.cards.filter((c) => !poolBy.has(c.name)).map((c) => c.name);
  if (missing.length) say(`WARNING: ${missing.length} cube card(s) not in the pool (their colours come from their sections): ${missing.join(', ')}`);

  const stateFile = path.join(o.out, 'evolve.json');
  const fresh: State = {
    v: 1, cube: path.relative(env.repo, path.resolve(o.cubeFile)), startSha: sha(startText),
    pool: path.relative(env.repo, path.resolve(o.poolFile)), poolSha: sha(poolText), drafts: o.drafts, seed: o.seed, games: o.games,
    profiles: o.profiles, weights: o.weights, knobs: o.knobs, constraints: constraintsOf(evolveCards(startCube, poolBy), o.knobs),
    date: o.date, generations: [],
  };
  let state = fresh;
  if (fs.existsSync(stateFile)) {
    const old = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as State;
    const key = (s: State): string => JSON.stringify([s.startSha, s.poolSha, s.drafts, s.seed, s.games, s.profiles, s.weights]);
    if (key(old) !== key(fresh)) throw new Error(`${o.out} holds an evolve run with a different cube, pool, drafts, seed, games, profiles or weights -- use a new --out`);
    // The knobs only decide the swaps: they may change while no generation has been decided under the old ones.
    old.generations = old.generations.filter((r) => fs.existsSync(path.join(o.out, `gen-${pad(r.gen)}`, 'result.json')));
    const knobsMoved = JSON.stringify(old.knobs) !== JSON.stringify(fresh.knobs);
    if (knobsMoved && old.generations.length > 0) throw new Error(`${o.out} has generation(s) decided under other knobs -- use a new --out, or delete their result.json files and the generations after them`);
    state = knobsMoved ? { ...old, knobs: fresh.knobs, constraints: fresh.constraints } : old;
    if (state.generations.length) say(`resuming: ${state.generations.length} generation(s) done in ${o.out}`);
  }
  const save = (): void => fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
  save();

  const summaries: GenSummary[] = [];
  for (let g = 1; g <= o.generations; g++) {
    const dir = path.join(o.out, `gen-${pad(g)}`);
    const inputText = g === 1 ? startText : fs.readFileSync(path.join(o.out, `gen-${pad(g - 1)}`, 'cube.md'), 'utf8');
    const seeds: [number, number] = [o.seed + (g - 1) * o.drafts, o.seed + g * o.drafts - 1];
    const resultFile = path.join(dir, 'result.json');
    const notesText = o.notesFile && fs.existsSync(o.notesFile) ? fs.readFileSync(o.notesFile, 'utf8') : null;
    if (fs.existsSync(resultFile)) {
      const r = JSON.parse(fs.readFileSync(resultFile, 'utf8')) as GenResult;
      if (r.inputSha === sha(inputText)) {
        say(`generation ${g}: done (${r.swaps.length} swap(s)), skipping`);
        summaries.push(JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8')) as GenSummary);
        continue;
      }
      throw new Error(`${resultFile} was made from a different cube than ${g === 1 ? o.cubeFile : `gen-${pad(g - 1)}/cube.md`} -- use a new --out`);
    }
    fs.mkdirSync(dir, { recursive: true });
    const inputFile = path.join(dir, 'input.md');
    const cube = parseCube(inputText);
    const runDir = path.join(dir, 'run');
    // Re-deciding a generation (its result.json removed, e.g. after editing the notes or a knob): the
    // generation before it wrote a new log entry, so the input's text moved while its list did not.
    // The drafts are still this list's, so the run folder is told the new text.
    for (const runJson of [path.join(runDir, 'run.json'), path.join(dir, 'confirm', 'run.json')]) {
      if (!fs.existsSync(inputFile) || !fs.existsSync(runJson)) continue;
      const old = fs.readFileSync(inputFile, 'utf8');
      if (old !== inputText && listKey(parseCube(old)) === listKey(cube)) {
        const rm = JSON.parse(fs.readFileSync(runJson, 'utf8')) as RunMeta;
        if (rm.cubeSha === sha(old)) {
          fs.writeFileSync(runJson, `${JSON.stringify({ ...rm, cubeSha: sha(inputText) }, null, 2)}\n`);
          say(`generation ${g}: the input's prose changed but not its list; keeping the drafts already played in ${path.relative(o.out, path.dirname(runJson))}`);
        }
      }
    }
    fs.writeFileSync(inputFile, inputText);
    say(`== generation ${g}/${o.generations}: ${cube.title} (${cube.cards.length} cards), seeds ${seeds[0]}-${seeds[1]}`);
    const labRun = (drafts: number, seed: number, out: string): Promise<void> => runLab(env, {
      cubeFile: inputFile, format: 'grid', drafts, games: o.games, jobs: o.jobs, seed, profiles: o.profiles,
      ratingsFile: o.ratingsFile, record: 0, ...(o.recordEvery ? { recordEvery: o.recordEvery } : {}), out, builder: 'lab',
      gameTimeoutSec: o.gameTimeoutSec, winstonCards: 90, weights: o.weights,
    }, say);
    /** A batch's run folder as the decision reads it: meta.json (written), stats, balance, design effect. */
    const readBatch = (out: string): { recs: DraftRecord[]; metaDoc: MetaDoc; stats: ReturnType<typeof cardStats>; deff: number } => {
      const { meta, cards: info, recs } = readRunDir(out);
      const metaDoc = buildMeta(meta, info, recs, cube) as MetaDoc;
      fs.writeFileSync(path.join(out, 'meta.json'), `${JSON.stringify(metaDoc)}\n`);
      fs.writeFileSync(path.join(out, 'report.html'), renderHtml(aggregate(meta, info, recs, [], { pairs: GUILD, themes: cube.themeNames })));
      return { recs, metaDoc, stats: cardStats(metaDoc, recs, info), deff: batchDeff(recs) };
    };
    // 1. Discovery: this generation's own drafts, never pooled with another generation's (D331).
    await labRun(o.drafts, seeds[0], runDir);
    const disc = readBatch(runDir);
    const recs = disc.recs;
    const metaDoc = disc.metaDoc;
    const stats = disc.stats;
    const balance = balanceOf(metaDoc);
    const notes: Map<string, Note> = notesText ? parseNotes(notesText) : new Map();
    const tabu = new Set(state.generations.flatMap((r) => r.swaps.map((s) => s.out)));
    const sel = {
      cube, cards: evolveCards(cube, poolBy), pool, stats, balance, drafts: recs.length, constraints: state.constraints, notes, tabu, knobs: o.knobs, deff: disc.deff,
    };
    const first = discoveryStage(sel);
    // 2. Confirmation: the candidates, tested again on a fresh, disjoint seed range, read on its own.
    let confirmation: ConfirmInput | undefined;
    let confirmSeeds: [number, number] | undefined;
    if (first.plan.drafts > 0) {
      const c0 = o.seed + o.knobs.confirmSeedOffset + (g - 1) * o.knobs.confirmMaxDrafts;
      confirmSeeds = [c0, c0 + first.plan.drafts - 1];
      say(`generation ${g}: ${first.candidates.length} candidate(s) at FDR ${o.knobs.fdrQ} (${first.candidates.map((a) => `${a.name}: ${a.status}`).join('; ')}); `
        + `confirming on ${first.plan.drafts} fresh draft(s), seeds ${confirmSeeds[0]}-${confirmSeeds[1]}`
        + (first.plan.underpowered.length ? ` (under-powered at the ${o.knobs.confirmMaxDrafts}-draft cap: ${first.plan.underpowered.join(', ')})` : ''));
      const confirmDir = path.join(dir, 'confirm');
      await labRun(first.plan.drafts, confirmSeeds[0], confirmDir);
      const cb = readBatch(confirmDir);
      confirmation = { stats: cb.stats, mean: cb.metaDoc.sample.shrinkage.mean, deff: cb.deff, drafts: cb.recs.length, seeds: confirmSeeds, games: cb.metaDoc.sample.games };
    }
    const decision = selectSwaps({ ...sel, ...(confirmation ? { confirmation } : {}) });
    const versionIn = versionOf(cube.title);
    const versionOut = decision.swaps.length ? versionIn + 1 : versionIn;
    const summary: GenSummary = {
      gen: g, versionIn, versionOut, date: o.date, drafts: recs.length, seeds, games: metaDoc.sample.games, decision, balance,
      stats: [...stats.values()].filter((s) => cube.cards.some((c) => c.name === s.name)),
    };
    const outText = writeCubeDoc(inputText, applySwaps(cube, decision.swaps, poolBy), { version: versionOut, logEntry: logEntry(summary) });
    const check = parseCube(outText);
    if (check.cards.length !== cube.cards.length || check.warnings.length) throw new Error(`generation ${g}: the written cube does not parse cleanly: ${check.warnings.join('; ')}`);
    fs.writeFileSync(path.join(dir, 'cube.md'), outText);
    fs.writeFileSync(path.join(dir, 'stats.json'), `${JSON.stringify({ gen: g, drafts: recs.length, seeds, confirmSeeds: confirmSeeds ?? null, mean: balance.mean, balance, decision, stats: summary.stats }, null, 1)}\n`);
    fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary)}\n`);
    fs.writeFileSync(path.join(dir, 'section.html'), `${htmlSection(summary)}\n`);
    const result: GenResult = {
      gen: g, inputSha: sha(inputText), outputSha: sha(outText), versionIn, versionOut, seeds, ...(confirmSeeds ? { confirmSeeds } : {}), swaps: decision.swaps, verdict: decision.verdict,
      date: o.date, notesSha: notesText ? sha(notesText) : null,
    };
    fs.writeFileSync(resultFile, `${JSON.stringify(result, null, 2)}\n`);
    state.generations = [...state.generations.filter((r) => r.gen !== g), result].sort((a, b) => a.gen - b.gen);
    save();
    summaries.push(summary);
    say(`generation ${g}: ${decision.verdict}`);
    for (const s of decision.swaps) say(`  OUT ${s.out} (${s.why})  IN ${s.in}`);
    writeTop(o, startCube.title, summaries, outText);
  }
  if (summaries.length) writeTop(o, startCube.title, summaries, fs.readFileSync(path.join(o.out, `gen-${pad(summaries.length)}`, 'cube.md'), 'utf8'));
  say(`done: ${path.join(o.out, 'changelog.md')}, ${path.join(o.out, 'index.html')}, ${path.join(o.out, path.basename(o.cubeFile))}`);
}

function writeTop(o: EvolveOptions, title: string, gens: GenSummary[], latest: string): void {
  fs.writeFileSync(path.join(o.out, 'changelog.md'), `${changelog(title, gens)}\n`);
  fs.writeFileSync(path.join(o.out, 'index.html'), htmlPage(`${title} — evolve`, gens));
  fs.writeFileSync(path.join(o.out, path.basename(o.cubeFile)), latest);
}

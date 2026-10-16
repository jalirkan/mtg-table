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
//    --record-all / --record-every N (D315) instead record the games the
//    workers PLAY, in the worker, both chairs, gzipped, into
//    <out>/games/<seed>/g<n>-seat{0,1}.jsonl.gz, with the cube's markdown
//    copied to <out>/cube.md (the ML dataset's vocabulary, tools/ml);
//    --play-explore (D358, playexplore.ts): a seeded share of the drafts play
//    games whose decisions explore; their lines carry `playExplore`;
// 5. every worker's Forge home checked for a saved preferences file (hard rule
//    11 / D107: a run must never save one).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Fact } from './cards.ts';
import { loadBridge, type BridgeMeta, type BridgeOptions, type BridgeTag } from './bridge.ts';
import { fileLines } from './lines.ts';
import { parseCube } from './cube.ts';
import { dckText } from './deck.ts';
import { engineFacts, runPool, type EngineEnv, type ForgeBuild, type GameRow, type MatchJob, type PoolLoad } from './engine.ts';
import { loadCube, runDraft, type DrafterOut, type DraftOut, type Format, type LoadedCube } from './lab.ts';
import { checkExploreOptions, exploreDraft, type ExploreOptions } from './explore.ts';
import { parseSynergy } from './pairs.ts';
import { parseRatings } from './ratings.ts';
import { reRated, runMixedDraft, type MixedMode } from './selfplay.ts';
import type { CardInfo } from './report.ts';
import type { Weights } from './weights.ts';
import { assertRunSeeds } from './seeds.ts';
import { labVersion, resumeVersions, type LabVersion, type VersionEntry } from './versions.ts';
import { mixText, pickProfiles, type MixEntry } from './profiles.ts';
import { draftExplores, playExploreTag, type PlayExploreOptions, type PlayExploreTag } from './playexplore.ts';
import { humanDrafter, parsePicks, runHumanDraft, type Fallback } from './humanpicks.ts';
import { FORGE_RANKS_WEIGHTS, forgeRanked, runForgeRanksDraft } from './drafters.ts';
import {
  cardTexts, claudeDraftModel, DEFAULT_FALLBACK_RATE, DEFAULT_LLM_MAX_USD, fakeDraftModel, LLM_PROMPT_VERSION, LlmBudget, LlmStop, MAX_LLM_JOBS,
  runLlmDraft, sumStats, themeSummary, type DraftModel, type LlmDraftStats, type LlmModelName, type LlmThinking,
} from './llmdraft.ts';

export interface RunOptions {
  cubeFile: string;
  format: Format;
  drafts: number;
  games: number;
  jobs: number;
  seed: number;
  profiles: [string, string];
  /** D347: each drafter's seat drawn per draft from this mix (`--profile-mix`), instead of `profiles`. */
  profileMix?: MixEntry[];
  ratingsFile: string | null;
  record: number;
  /** D315: record every game of every Nth draft (seed % N === 0) in the worker; 0 = off, 1 = every game. */
  recordEvery?: number;
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
  /** D340: draft the AI ladder's deck sets at their reserved seeds (`--deckset`, with --games 0 only; seeds.ts). */
  deckset?: boolean;
  /** D341: append to a folder another lab version wrote (`--allow-version-change`; logged in run.json). */
  allowVersionChange?: boolean;
  /** D356: controlled exploration in the lab's deckbuilder (explore.ts); absent or share 0 = off, and the run is the old one. */
  explore?: ExploreOptions;
  /** D358: a share of the drafts play games whose decisions explore (playexplore.ts); absent = none, and the run is the old one. */
  playExplore?: PlayExploreOptions;
  /**
   * D394: check only.  Load the cube, build the run's meta and version, and apply both resume checks
   * (the folder's identity and D341's version) against `out`'s run.json, then return without writing
   * anything (`queue check`, and `queue run`'s preflight over every key folder of the night).
   */
  checkOnly?: boolean;
  /**
   * D416: one seat drafts with ForgeCoach's human pick model (`--drafter human-picks:<file>`, humanpicks.ts),
   * the other with the current drafter; grid, one cube, no learned files.  Absent = the run is the old one.
   */
  drafter?: RunDrafterOption;
  /** D439: how many LLM drafts ask the model at once (`--llm-jobs`, default 2, at most 4); not part of the identity. */
  llmJobs?: number;
  /**
   * The LLM drafter's spend cap and fallback stop (the #144 review; llmdraft.ts `LlmBudget`), one for the
   * whole run; absent = `--llm-max-usd 5`, no call cap, the 25% fallback stop.  The caller keeps it to read
   * the spend afterwards, a stopped run's included (the watch's match.json `cost`).  Not part of the identity.
   */
  llmBudget?: LlmBudget;
  /** The LLM drafter's model, made on first use; absent = the spec's (the CLI, or `fake`).  Tests only. */
  llmModel?: () => Promise<DraftModel>;
}

/**
 * The drafter one seat is given (`--drafter`): D416's human pick model, or D439's forge-ranks seat or LLM.
 * `seesOpponent` (D439, `--llm-sees-opponent`): the LLM's prompt also lists the opponent's pool.
 */
export type RunDrafterOption =
  | { kind: 'human-picks'; file: string; seat: 'A' | 'B' }
  | { kind: 'forge-ranks'; seat: 'A' | 'B' }
  | { kind: 'llm'; model: LlmModelName; thinking: LlmThinking; seat: 'A' | 'B'; seesOpponent: boolean };

/** D394: what `runLab` found when it checked a folder (`checkOnly`), or after it ran. */
export interface RunCheck { out: string; meta: RunMeta; version: LabVersion; resumed: boolean; done: number; versionChange: string[] | null }

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
  /** D376 `load`: the pool when the match finished (matches in progress, JVMs alive, 1-min load average, cores); absent before D376. */
  match: { games: GameRow[]; winsA: number; winsB: number; winner: 'A' | 'B' | 'draw'; engineError?: string; worker: number; load?: PoolLoad };
  ms: DraftOut['ms'] & { match: number };
  /** A bridge draft's pool: its source cubes and which cube each card came from (bridge.ts; absent in a normal run). */
  bridge?: BridgeTag;
  /** D341: the lab version (versions.ts) that drafted and played this line; absent on lines written before D341. */
  ver?: string;
  /** D347: the two seats that played this draft (`--profile-mix`); absent when they are run.json's `profiles`. */
  profiles?: [string, string];
  /** D358: present when this draft's games explored (its settings); win-rate readers leave such lines out by default. */
  playExplore?: PlayExploreTag;
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
  /** D315: in-worker recording (absent when off): every game of a draft whose seed % every === 0. */
  record?: { every: number; dir: 'games'; cubeCopy: 'cube.md' };
  /** D301-D302: the learned files this run drafted or built with (absent for a plain run). */
  learned?: {
    synergyFile: string | null; synergySha: string | null; deckSynergy: boolean;
    mixed: { mode: MixedMode; ratingsFile: string; ratingsSha: string; synergyFile: string | null; synergySha: string | null; deckSynergy: boolean } | null;
  };
  /** A bridge run's source cubes, shares and pool size (bridge.ts; absent in a normal run). */
  bridge?: BridgeMeta;
  /** D347: the profile mix the seats were drawn from (absent: every draft plays `profiles`). */
  profileMix?: string;
  /** D341: every lab version that wrote to this folder, oldest first; the last is the current one (versions.ts). */
  versions?: VersionEntry[];
  /** D340: a deck-set run at reserved seeds (seeds.ts). */
  deckset?: boolean;
  /** D356: the exploration this run's drafts used (absent: none). */
  explore?: ExploreOptions;
  /** D358: the play exploration of the drafts this run appended last (absent: none). A change is a version change (D341). */
  playExplore?: PlayExploreOptions;
  /** D416: the seat that drafted with the human pick model, its file, and how much of the cube the file covered. */
  drafter?: RunDrafter;
}

export type RunDrafter =
  | { kind: 'human-picks'; seat: 'A' | 'B'; file: string; sha: string; cards: number; covered: number; fallback: Fallback }
  /** D439: Forge's ranks, the three weights it changes, how many cards Forge ranks and how many differ from the cube's ratings. */
  | { kind: 'forge-ranks'; seat: 'A' | 'B'; weights: typeof FORGE_RANKS_WEIGHTS; cards: number; ranked: number; differ: number }
  /** D439: the model, its thinking, whether it sees the opponent's pool, the prompt's version and the fallback drafter. */
  | { kind: 'llm'; seat: 'A' | 'B'; model: LlmModelName; thinking: LlmThinking; seesOpponent: boolean; promptVersion: number; fallback: 'lab'; summaryChars: number };

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

/**
 * The fields that make a run folder ONE population, compared on every resume and never appended across
 * (`identityDiff`; a difference is refused even with --allow-version-change).  D394: the profile mix is
 * NOT one of them -- it is part of the lab version (below), so a night that adds or changes the mix is a
 * version change: refused without --allow-version-change, logged in run.json with it, and every line
 * carries `ver` and its own `profiles`, so readers split by either.  Before D394 the mix sat here too,
 * which no flag could pass: night 4 (J096) failed every chunk on it.
 */
export const IDENTITY_FIELDS = ['cubeSha', 'format', 'games', 'profiles', 'builder', 'weights', 'winstonCards', 'learned', 'bridge', 'explore', 'drafter'] as const;

/** The identity fields that differ between a folder's run.json and this run's meta (empty: the same population). */
export function identityDiff(old: Partial<RunMeta>, cur: Partial<RunMeta>): string[] {
  const at = (m: Partial<RunMeta>, k: (typeof IDENTITY_FIELDS)[number]): string => JSON.stringify((m as Record<string, unknown>)[k] ?? null);
  return IDENTITY_FIELDS.filter((k) => at(old, k) !== at(cur, k));
}

/**
 * The weights-like input of a run's lab version (D341): the weights, plus each option that changes the
 * games when it is on (D356 exploration, D358 play exploration, D394 the profile mix).  With all of them
 * off it is the plain weights, so the version id of an ordinary run is what it always was.
 */
export function versionWeights(w: Weights, x: { explore?: ExploreOptions | null; playExplore?: PlayExploreOptions | null; profileMix?: string | null; drafter?: DrafterVersionInput | null }): unknown {
  if (!x.explore && !x.playExplore && !x.profileMix && !x.drafter) return w;
  return {
    ...w, ...(x.explore ? { explore: x.explore } : {}), ...(x.playExplore ? { playExplore: x.playExplore } : {}), ...(x.profileMix ? { profileMix: x.profileMix } : {}),
    ...(x.drafter ? { drafter: drafterVersion(x.drafter) } : {}),
  };
}

/** What of a run's drafter enters its version: run.json's `drafter`, or the fields of it the version reads. */
export interface DrafterVersionInput { kind?: string; seat: string; sha?: string; model?: string; thinking?: string; seesOpponent?: boolean; promptVersion?: number; weights?: Record<string, number> }

/** A drafter's part of the lab version: D416's object exactly as it was (so its ids do not move), D439's by kind. */
function drafterVersion(d: DrafterVersionInput): unknown {
  if (!d.kind || d.kind === 'human-picks') return { kind: 'human-picks', seat: d.seat, sha: d.sha };
  if (d.kind === 'llm') return { kind: 'llm', seat: d.seat, model: d.model, thinking: d.thinking, seesOpponent: !!d.seesOpponent, promptVersion: d.promptVersion };
  // forge-ranks drafts with FORGE_RANKS_WEIGHTS, so a change to them is a change of version (the #144
  // review).  At D439's own values the object is D439's {kind, seat}, so no existing folder's id moves.
  if (d.kind === 'forge-ranks' && d.weights && JSON.stringify(d.weights) !== JSON.stringify(FORGE_RANKS_WEIGHTS_D439)) return { kind: d.kind, seat: d.seat, weights: d.weights };
  return { kind: d.kind, seat: d.seat };
}

/** The forge-ranks weights D439 shipped: version ids written with them stay as they were. */
const FORGE_RANKS_WEIGHTS_D439 = { synergy: 0, lean: 0, commitAt: 0.04 };

export async function runLab(env: EngineEnv, o: RunOptions, say: (s: string) => void): Promise<RunCheck> {
  const t0 = Date.now();
  assertRunSeeds(o.seed, o.drafts, { deckset: o.deckset, games: o.games });
  const bridge = o.bridge ? loadBridge(env, o.bridge, o.weights, say, sha) : null;
  const loaded = bridge ? null : loadForRun(env, o.cubeFile, o.ratingsFile, o.weights, say);
  const { lc, text } = bridge ?? (loaded as NonNullable<typeof loaded>);
  const rel = (f: string): string => path.relative(env.repo, path.resolve(f));
  const shaOf = (f: string | null | undefined): string | null => (f ? sha(fs.readFileSync(f)) : null);
  let draftOne = (seed: number, _signal?: AbortSignal): DraftOut | Promise<DraftOut> => runDraft(lc, o.format, seed, o.weights, o.winstonCards);
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
  const explore = o.explore && o.explore.share > 0 ? o.explore : null;
  if (explore) {
    checkExploreOptions(explore);
    if (bridge || o.mixed || o.builder !== 'lab') throw new Error('exploration (D356) runs with the lab builder on one cube only: no --bridge, head-to-head or --builder forge');
    // every drafter here is synchronous: the D416/D439 drafters (the only async one, the LLM) refuse --explore
    const base = draftOne as (seed: number) => DraftOut;
    const maxSplash = (stretched: boolean): number => (stretched ? o.weights.maxSplashStretch : o.weights.maxSplash);
    draftOne = (seed) => exploreDraft(base(seed), explore, lc.byName, maxSplash);
    say(`exploring (D356): ${explore.share} of the drafts; a target rated under ${explore.below} forced with probability v / max(sum v, ${explore.cap}), v ${explore.gold} for gold`);
  }
  let drafterMeta: RunDrafter | null = null;
  const llmStats: LlmDraftStats[] = [];
  let budget: LlmBudget | null = null;
  if (o.drafter) {
    // D416, D439: one seat drafts with another drafter; everything else is a plain run's.
    const kind = o.drafter.kind;
    if (bridge || o.mixed || o.synergyFile || explore) throw new Error(`--drafter ${kind} runs on one cube with its own ratings: no --bridge, --synergy, head-to-head or --explore`);
    if (o.format !== 'grid') throw new Error(`--drafter ${kind} drafts grid only`);
    const seat = o.drafter.seat;
    const facts = loaded?.facts ?? [];
    if (o.drafter.kind === 'human-picks') {
      const raw = fs.readFileSync(o.drafter.file);
      const file = parsePicks(JSON.parse(raw.toString('utf8')));
      if (file.cube.file !== path.basename(o.cubeFile)) throw new Error(`${o.drafter.file} is for ${file.cube.file}, not ${path.basename(o.cubeFile)}`);
      const listedOf = new Map<string, string>();
      for (const f of facts) if (f.found && f.name) listedOf.set(f.name, f.listed);
      const hd = humanDrafter(file, lc.cards, listedOf);
      draftOne = (seed) => runHumanDraft(lc, hd, seat, seed, o.weights);
      drafterMeta = { kind: 'human-picks', seat, file: rel(o.drafter.file), sha: sha(raw), cards: lc.cards.length, covered: hd.covered.size, fallback: hd.fallback };
      const fb = hd.fallback;
      say(`drafter (D416): seat ${seat} drafts with the human pick model ${o.drafter.file} (${hd.covered.size} of ${lc.cards.length} cards covered, ${file.cube.matched} in the file); `
        + `the rest at s = ${fb.intercept.toFixed(3)} + ${fb.slope.toFixed(4)} x rating (least squares over the covered cards, r ${fb.r.toFixed(2)}); seat ${seat === 'A' ? 'B' : 'A'} the current drafter`);
    } else if (o.drafter.kind === 'forge-ranks') {
      const fr = forgeRanked(lc, facts, o.weights.unrated);
      draftOne = (seed) => runForgeRanksDraft(lc, fr, seat, seed, o.weights);
      drafterMeta = { kind: 'forge-ranks', seat, weights: FORGE_RANKS_WEIGHTS, cards: lc.cards.length, ranked: fr.ranked, differ: fr.differ };
      say(`drafter (D439): seat ${seat} drafts on Forge's ranks (${fr.ranked} of ${lc.cards.length} cards ranked, ${fr.differ} rated differently from the cube's ratings; synergy 0, lean 0, commits after its first line); seat ${seat === 'A' ? 'B' : 'A'} the lab drafter`);
    } else {
      const d = o.drafter;
      const texts = cardTexts(facts);
      const summary = themeSummary(text);
      let made: Promise<DraftModel> | null = null;
      const model = o.llmModel ?? ((): Promise<DraftModel> => (made ??= d.model === 'fake' ? Promise.resolve(fakeDraftModel()) : claudeDraftModel(d.model, d.thinking, path.resolve(o.out, 'llm', 'cwd'))));
      const b = o.llmBudget ?? new LlmBudget({ maxCalls: null, maxUsd: DEFAULT_LLM_MAX_USD, maxFallbackRate: DEFAULT_FALLBACK_RATE });
      budget = b;
      draftOne = async (seed, signal) => {
        const out = await runLlmDraft({ lc, seat, spec: { kind: 'llm', model: d.model, thinking: d.thinking }, model, texts, summary, seesOpponent: d.seesOpponent, w: o.weights, cacheDir: path.join(o.out, 'llm'), say, budget: b, signal: signal ?? null }, seed);
        if (out.llm) llmStats.push(out.llm);
        return out;
      };
      drafterMeta = { kind: 'llm', seat, model: d.model, thinking: d.thinking, seesOpponent: d.seesOpponent, promptVersion: LLM_PROMPT_VERSION, fallback: 'lab', summaryChars: summary.length };
      say(`drafter (D439): seat ${seat} asks ${d.model === 'fake' ? 'the fake model (no network, no spend)' : `Claude (${d.model}, thinking ${d.thinking}) through the Claude Code CLI, once a decision`}; `
        + `${d.seesOpponent ? 'the prompt lists the opponent\'s pool; ' : ''}two failed replies take the lab drafter's line; decisions kept in ${path.join(o.out, 'llm')}; seat ${seat === 'A' ? 'B' : 'A'} the lab drafter`);
      const c = b.caps;
      say(`llm drafter caps: ${c.maxCalls === null ? 'no call cap' : `at most ${c.maxCalls} call(s)`}, ${c.maxUsd === null ? 'NO dollar cap' : `at most $${c.maxUsd} at list price`}, `
        + `${c.maxFallbackRate >= 1 ? 'no fallback stop' : `stop past ${Math.round(c.maxFallbackRate * 100)}% fallbacks`} (--llm-max-calls, --llm-max-usd, --llm-fallback-rate); ${Math.min(MAX_LLM_JOBS, Math.max(1, o.llmJobs ?? 2))} draft(s) at once`);
    }
  }
  const playExplore = o.playExplore && o.playExplore.share > 0 ? o.playExplore : null;
  if (playExplore) {
    if (o.games < 1) throw new Error('--play-explore explores games: it needs --games 1 or more');
    say(`play exploration (D358): ${playExplore.share} of the drafts explore; epsilon ${playExplore.epsilon}, close call ${playExplore.closeCall}, opening ${playExplore.opening ? 'on' : 'off'}`);
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
    ...(o.recordEvery ? { record: { every: o.recordEvery, dir: 'games' as const, cubeCopy: 'cube.md' as const } } : {}),
    ...(o.deckset ? { deckset: true } : {}),
    ...(o.profileMix ? { profileMix: mixText(o.profileMix) } : {}),
    ...(explore ? { explore } : {}),
    ...(playExplore ? { playExplore } : {}),
    ...(drafterMeta ? { drafter: drafterMeta } : {}),
  };
  const version = labVersion(env.repo, {
    cubeShas: bridge ? bridge.meta.sources.map((x) => x.sha) : [meta.cubeSha],
    ratingsFiles: bridge ? bridge.meta.sources.map((x) => x.ratingsFile ? path.resolve(env.repo, x.ratingsFile) : null) : [o.ratingsFile],
    // D356: exploration changes the decks that play, so it is part of the version; off, the id is the old one.
    // D358: play exploration changes the games, so it is too (a change between nights of one folder is a
    // version change: refused unless --allow-version-change, and logged); off, the id is the old one.
    // D394: so does the profile mix (each line also carries its seats' `profiles`).
    // D416: the human-pick drafter changes the drafts, so its seat and file are part of the version; off, the id is the old one.
    weights: versionWeights(o.weights, { explore, playExplore, profileMix: meta.profileMix ?? null, drafter: drafterMeta }),
  });
  const metaFile = path.join(o.out, 'run.json');
  const jsonl = path.join(o.out, 'drafts.jsonl');
  const done = new Set<number>();
  let resumed = false;
  let before = 0;
  if (fs.existsSync(metaFile)) {
    resumed = true;
    const old = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as RunMeta;
    const differ = identityDiff(old, meta);
    if (differ.length > 0) {
      throw new Error(`${o.out} holds a run with a different ${differ.join(', ')} (D394: the folder's identity, which no flag changes) -- use a new --out`);
    }
    if (fs.existsSync(jsonl)) {
      for (const line of fileLines(jsonl)) if (line.trim()) done.add((JSON.parse(line) as DraftRecord).seed);
    }
    before = old.versions?.length ?? 0;
    meta.seed = Math.min(old.seed, o.seed);
    meta.drafts = Math.max(old.seed + old.drafts, o.seed + o.drafts) - meta.seed;
    if (done.size > 0 && !o.checkOnly) say(`resuming: ${done.size} draft(s) already in ${jsonl}`);
    // D341: a folder is one lab version unless --allow-version-change says otherwise (and it is logged).
    meta.versions = resumeVersions(old.versions ?? (done.size === 0 ? null : undefined), version, o.seed, !!o.allowVersionChange, o.out, say);
  } else {
    meta.versions = resumeVersions(null, version, o.seed, false, o.out, say);
  }
  const last = meta.versions.at(-1);
  const check: RunCheck = {
    out: o.out, meta, version, resumed, done: done.size,
    versionChange: resumed && meta.versions.length > before && last?.allowedChange ? last.allowedChange.changed : null,
  };
  if (o.checkOnly) return check;
  fs.mkdirSync(path.join(o.out, 'decks'), { recursive: true });
  fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  // D315: the cube as drafted, beside the recordings, so the dataset's vocabulary is this pool.
  const cubeCopy = path.join(o.out, 'cube.md');
  if (o.recordEvery) fs.writeFileSync(cubeCopy, text);
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
  const pending: number[] = [];
  for (let i = 0; i < o.drafts; i++) if (!done.has(o.seed + i)) pending.push(o.seed + i);
  // D439: an LLM drafter waits on the model, so its drafts run --llm-jobs at a time; every other drafter is
  // synchronous and runs one by one, exactly as before.  The results are used in seed order either way.
  // A failed draft stops the others (mapLimit aborts their signal); an LLM stop also leaves spend.json.
  let drafted: DraftOut[];
  try {
    drafted = await mapLimit(pending, o.drafter?.kind === 'llm' ? Math.min(MAX_LLM_JOBS, Math.max(1, o.llmJobs ?? 2)) : 1, async (seed, signal) => draftOne(seed, signal));
  } catch (e) {
    if (budget) writeSpend(o.out, budget);
    if (e instanceof LlmStop) throw new LlmStop(e.reason, `llm drafter stopped, ${e.message}; the drafts finished before it are kept in ${path.join(o.out, 'llm')} and are not asked again on a resume`);
    throw e;
  }
  if (budget) {
    writeSpend(o.out, budget);
    say(`llm drafter spend: ${budget.summary()}`);
  }
  if (llmStats.length > 0) {
    const t = sumStats(llmStats);
    say(`llm drafter: ${t.drafts} draft(s), ${t.decisions} decisions, ${t.calls} calls, ${t.retries} retries, ${t.fallbacks} fallbacks; `
      + `input ${t.tokensIn} plain + ${t.cacheRead} cache read + ${t.cacheCreate} cache write, output ${t.tokensOut}${t.costUsd != null ? `; CLI cost $${t.costUsd.toFixed(4)}` : ''}`);
  }
  for (const [k, seed] of pending.entries()) {
    const d = drafted[k] as DraftOut;
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
      ...(playExplore && draftExplores(seed, playExplore.share) ? { playExplore: playExploreTag(playExplore) } : {}),
      ...seatsOf(o, seed), builder: o.builder,
      deckA: sides[0] ?? null, deckB: sides[1] ?? null,
      poolA: d.drafters[0].pool, poolB: d.drafters[1].pool,
      forgeDeckOutA: path.resolve(deckPath('A', '-forge')), forgeDeckOutB: path.resolve(deckPath('B', '-forge')),
      ...(o.recordEvery && seed % o.recordEvery === 0 ? {
        record: {
          dir: path.resolve(o.out, 'games', String(seed)), rel: path.join('games', String(seed)),
          run: path.basename(path.resolve(o.out)), cube: lc.cube.title, cubeFile: rel(cubeCopy), cubeSha: meta.cubeSha,
          format: o.format, deckNameA: `cubelab ${seed} A`, deckNameB: `cubelab ${seed} B`, ver: version.id,
        },
      } : {}),
    });
  }
  say(`drafted and built ${jobs.length} draft(s) in ${((Date.now() - tDraft) / 1000).toFixed(1)} s; playing ${o.games > 1 ? `best of ${o.games}` : '1 game'} each on ${Math.min(o.jobs, Math.max(1, jobs.length))} worker(s)`);

  // 3. matches
  let finished = 0;
  const recTotal = { games: 0, bytes: 0, errors: 0 };
  const tMatch = Date.now();
  const started = new Map<string, number>();
  for (const j of jobs) started.set(j.id, Date.now());
  const homes = env.homes.slice(0, Math.max(1, Math.min(o.jobs, jobs.length)));
  await runPool({ ...env, homes }, jobs, path.join(o.out, 'logs'), (job, r, worker, load) => {
    const d = outs.get(job.seed) as DraftOut;
    const wins = { A: 0, B: 0 };
    for (const g of r.games) if (g.winner === 'A' || g.winner === 'B') wins[g.winner]++;
    const rec: DraftRecord = {
      v: 1, cube: lc.cube.title, ...d, ver: version.id,
      ...(o.profileMix ? { profiles: [job.profileA, job.profileB] as [string, string] } : {}),
      ...(job.playExplore ? { playExplore: job.playExplore } : {}),
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
        load,
      },
      ms: { ...d.ms, match: Date.now() - (started.get(job.id) ?? Date.now()) },
    };
    fs.appendFileSync(jsonl, `${JSON.stringify(rec)}\n`);
    for (const g of r.games) if (g.recorded) { recTotal.games++; recTotal.bytes += g.recorded.bytes; recTotal.errors += g.recorded.errors; }
    finished++;
    const g = r.games.map((x) => (x.winner === 'draw' ? (x.timeout ? 'T' : 'D') : x.winner)).join('');
    say(`[${finished}/${jobs.length}] seed ${job.seed}: ${deckLabel(d, 0)} ${wins.A}-${wins.B} ${deckLabel(d, 1)}  games ${g || '-'}${r.engineError ? `  ENGINE ERROR: ${r.engineError}` : ''}`);
  }, say);
  const matchSecs = (Date.now() - tMatch) / 1000;
  if (jobs.length > 0) say(`matches: ${matchSecs.toFixed(0)} s for ${jobs.length} (${(matchSecs / jobs.length).toFixed(1)} s a draft wall-clock on ${homes.length} worker(s))`);
  if (recTotal.games > 0) {
    say(`recorded: ${recTotal.games} game(s), both chairs, ${(recTotal.bytes / 1048576).toFixed(1)} MiB gzipped (${Math.round(recTotal.bytes / recTotal.games / 1024)} KiB a game) under ${path.join(o.out, 'games')}`);
    if (recTotal.errors > 0) say(`WARNING: ${recTotal.errors} snapshot or write error(s) in the recordings; see logs/worker-*.log`);
  }

  // 4. recordings
  if (o.record > 0) recordGames(env, o, say);

  // 5. no Forge home saved preferences
  for (const h of env.homes) {
    const prefs = path.join(path.dirname(h), 'forge', 'preferences');
    const saved = fs.existsSync(prefs) ? fs.readdirSync(prefs) : [];
    if (saved.length > 0) throw new Error(`a worker SAVED Forge preferences under ${prefs} (${saved.join(', ')}) -- a run must never save prefs (CLAUDE.md hard rule 11, D107)`);
  }
  say(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${jsonl}`);
  return check;
}

/** `<out>/llm/spend.json`: the run's LLM caps, what it spent and why it stopped (null = it did not). */
function writeSpend(out: string, b: LlmBudget): void {
  const dir = path.join(out, 'llm');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'spend.json.tmp'), `${JSON.stringify({ v: 1, ...b.record() }, null, 1)}\n`);
  fs.renameSync(path.join(dir, 'spend.json.tmp'), path.join(dir, 'spend.json'));
}

/**
 * `f` over `items`, at most `limit` at a time; the results in the items' order.  The first failure
 * stops the rest: no lane takes another item, the in-flight calls see `signal` aborted (with that
 * failure as its reason), and mapLimit rejects with it once every lane has settled, so nothing keeps
 * running (or spending) after it returns.
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, f: (x: T, signal: AbortSignal) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  const ac = new AbortController();
  let failure: { e: unknown } | null = null;
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < items.length && !ac.signal.aborted) {
      const i = next++;
      try {
        out[i] = await f(items[i] as T, ac.signal);
      } catch (e) {
        if (!failure) { failure = { e }; ac.abort(e); }
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, lane));
  if (failure) throw (failure as { e: unknown }).e;
  return out;
}

/** The two seats of the draft at `seed`: drawn from the mix (D347), else `--profiles`. */
export function seatsOf(o: Pick<RunOptions, 'profiles' | 'profileMix'>, seed: number): { profileA: string; profileB: string } {
  const [a, b] = o.profileMix ? pickProfiles(o.profileMix, seed) : o.profiles;
  return { profileA: a, profileB: b };
}

function deckLabel(d: DraftOut, k: 0 | 1): string {
  const deck = d.drafters[k].deck;
  return deck ? `${d.drafters[k].seat}:${deck.colors}${deck.splash ? `+${deck.splash.toLowerCase()}` : ''}` : `${d.drafters[k].seat}:forge`;
}

/**
 * The `n` lowest-seed records of a drafts.jsonl, by seed, file order among equal seeds -- what the whole-file
 * read's stable sort and slice gave (a torn last line throws, as it did) -- holding n + 1 records, never the file.
 */
export function firstBySeed(jsonl: string, n: number): DraftRecord[] {
  const recs: DraftRecord[] = [];
  for (const l of fileLines(jsonl)) {
    if (!l) continue;
    recs.push(JSON.parse(l) as DraftRecord);
    if (recs.length > n) recs.sort((a, b) => a.seed - b.seed).pop();
  }
  return recs.sort((a, b) => a.seed - b.seed);
}

/** Record game 1 of the first `o.record` drafts with mtgtable.RecordMatch, seat 0 = drafter A. */
export function recordGames(env: EngineEnv, o: RunOptions, say: (s: string) => void): void {
  const jsonl = path.join(o.out, 'drafts.jsonl');
  if (!fs.existsSync(jsonl)) return;
  const recs = firstBySeed(jsonl, o.record);
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
      // a mixed run's seats (D347); RecordMatch seats plain Forge, so only the profile half of a spec
      '--profile', (rec.profiles ?? o.profiles)[0].split('+')[0] as string, '--ai-profile', (rec.profiles ?? o.profiles)[1].split('+')[0] as string, '--seed', String(rec.seed), '--out', path.resolve(out)],
    { cwd: env.repo, encoding: 'utf8', env: { ...process.env, MTG_TABLE_CONFIG: env.homes[0] }, timeout: (o.gameTimeoutSec + 120) * 1000, maxBuffer: 256 * 1024 * 1024 });
    const ok = r.status === 0 && fs.existsSync(out);
    fs.writeFileSync(path.join(o.out, 'logs', `record-${rec.seed}.log`), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
    index.push({ seed: rec.seed, file: path.relative(o.out, out), seat: 'A', decks: [path.basename(deckOf(0)), path.basename(deckOf(1))], ok, ms: Date.now() - t });
    say(`record seed ${rec.seed}: ${ok ? path.relative(env.repo, out) : `FAILED (exit ${r.status}; logs/record-${rec.seed}.log)`} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
  fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
}

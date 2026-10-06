// mtg-table — the cube lab: `queue`, the overnight mix of normal and bridge drafts.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh queue plan --night 1 --drafts 25000 --jobs 7      # writes and prints the plan, plays nothing
//   tools/cubelab.sh queue run  --night 1 --drafts 25000 --jobs 7      # plays it (resumable: run the same line again)
//   tools/cubelab.sh queue check --night 1 --drafts 25000 --jobs 7     # D394: would every key folder accept it? writes nothing
//       [--bridge-share 0.2] [--games 1] [--chunk 250] [--min-drafts 20] [--cubes a,b,...] [--power power.tsv]
//       [--bridge-ratings even|own] [--record-every N]   (N = 1: every game, both chairs, D315; a night that
//                                  recorded is refused a re-run without it, D365: --record-every 0 to stop on purpose)
//       [--allow-version-change]   append to key folders another lab version wrote (D341; logged)
//       [--play-explore share=0.15,epsilon=0.05,closecall=0.02,opening=off]   a seeded share of every
//                                  chunk's drafts play games whose decisions explore (D358, playexplore.ts)
//       [--profile-mix Default:0.5,Reckless:0.25,Cautious:0.25]   each drafter's AI drawn per draft by
//                                  its seed (D347's mix, profiles.ts); off by default (D375)
//
// PROFILE MIX (D375).  Without --profile-mix every chunk plays Default against
// Default, as before.  With it the night's plan records the mix (`profileMix`,
// normalised), every chunk passes it to `run`, and each draft's seats are a
// pure function of its seed; every drafts.jsonl row of such a run carries
// `profiles` (seat A's and B's), and tools/ml's games.jsonl copies them.  The
// mix is part of each key folder's lab version (D341; since D394 in the
// version id, run.ts `versionWeights` -- before D394 run.ts compared it as part
// of the folder's identity, which no flag passes, and night 4 failed every
// chunk), so the first night with a mix appends to the folders only with
// --allow-version-change; a re-run of a night uses the plan's mix, and a
// different flag is refused.
//
// KEY FOLDERS FIRST (D394).  Before a `queue run` plays or records anything it
// checks every key folder of the night the way that folder's first chunk will
// (`checkKeyFolders`: run.ts's own identity and version checks, `checkOnly`),
// and stops on any refusal; `queue check` does only that, writing nothing (not
// even a new night's plan), so a job's pilot can run it against the real root.  The methods review (2026-10-04, rec. 5) asks for
// it from night 4: one pilot's habits confound card power.
//
// PLAY EXPLORATION (D358).  With --play-explore the night's plan records the
// settings (`playExplore`), every chunk passes them to `run`, and each draft
// explores or not by its own seed (rng(seed, 'play-explore') < share).  The
// settings are part of each key folder's lab version (D341): a night that
// turns exploration on or off, or changes it, is a version change for every
// folder it appends to, so it needs --allow-version-change, which run.json
// logs.  A re-run of a night uses the plan's settings; a different flag is
// refused.  The coverage below counts only drafts that did not explore.
//
// SEEDS (D340, seeds.ts): the ledger counts each key's seeds up from 1 and a
// chunk must stay below 800,000,000; the AI ladder's deck sets live at
// 900,000,000+ and the lab never drafts them.  VERSIONS (D341): every chunk's
// run refuses to append to a key folder another code / engine / ratings / cube
// version wrote unless --allow-version-change, and night-<N>.json lists every
// `queue run` of the night with its code and jar.
//
// One folder (`--root`, default var/cubelab/queue) holds every night: a run
// folder per POOL KEY — `normal/<cube>` for a cube's own drafts,
// `bridge/<a>+<b>` for a bridge pair (bridge.ts) — that every night appends
// new seeds to, `queue.json` (the ledger: the games per draft, the format and
// each key's next free seed) and `night-<N>.json` (that night's plan).
//
// NO DOUBLE WORK.  A draft is a function of its pool key and its seed (D294),
// so a (key, seed) pair is a job, and the ledger hands every key's seeds out
// once, across all nights: two nights never draft the same deck pair.  A plan,
// once written, is re-read rather than re-planned, and run.ts skips a seed its
// drafts.jsonl already holds, so re-running a night after a stop plays only
// the drafts that never finished (a draft's games are written when its match
// ends; with the default --games 1 there is no half-played draft to replay).
// A pair is keyed in one order (`pauper+vintage`, never also `vintage+pauper`).
// The games all feed ONE model keyed by card name (tools/ml/matchup.py), so
// nothing here rates a cube on its own.
//
// THE MIX.  `--bridge-share` (0.2) of the night's drafts go to bridge pairs,
// the rest to the cubes' own drafts.  Within each half the drafts follow
// WEIGHTS, so they go where they teach the model the most:
//
//   cube weight  = Σ over its cards of var_c / m_c
//   pair weight  = novelty × link(tier gap) × (mean var_c over the pair's cards) / prior var
//
// var_c is a card's current uncertainty: its posterior variance from the
// matchup model's power.tsv when `--power` names one (the `sdPost` column, the
// Laplace posterior SD, D342; an old file with only a bootstrap `sd` is
// refused, and an AI-limited card counts 0), else
// 1 / (1/τ² + g_c/4), τ = 0.25 logits, g_c = the decisive games the card has
// already played in ANY cube's runs under the root (pooled by name: a card's
// Omega games count for Vintage too).  m_c is the number of selected cubes
// listing the card, so a card five cubes share is paid for once, not five
// times; a cube whose cards are covered elsewhere gets fewer drafts.
// novelty = 1 − shared / the smaller cube: Omega and Vintage share 108 of 180
// cards, so a draft from their mix is mostly an in-cube draft again.  link()
// favours pairs that chain the power levels (TIERS below): adjacent tiers
// (flat with middle, middle with powered) 1.0, flat with powered 0.7 (the
// games are lopsided, and a logistic model learns little from a 90 % favourite),
// the same tier 0.4.  A pair under `minPairWeight` (0.25) is skipped, and
// `plan` prints every pair with its numbers and why it was kept or skipped.
// Drafts are split by the largest remainder; a key with under `minDrafts`
// (default 20) gets none and its share goes to the rest.

import fs from 'node:fs';
import path from 'node:path';

import { apportion, bridgeOptions, cubeId, resolveCube } from './bridge.ts';
import { parseCube } from './cube.ts';
import { engineEnv, engineFacts, type EngineEnv } from './engine.ts';
import { defaultRatings, runLab, type DraftRecord, type RunOptions } from './run.ts';
import { DEFAULT_WEIGHTS } from './weights.ts';
import { assertQueueSeeds } from './seeds.ts';
import { codeVersion, fileSha } from './versions.ts';
import { isPlayExplored, parsePlayExploreArgs, playExploreText, type PlayExploreOptions } from './playexplore.ts';
import { checkProfiles, mixText, parseProfileMix } from './profiles.ts';

/** Power tier of each cube: 0 flat, 1 middle, 2 powered.  A cube not listed is treated as middle. */
export const TIERS: Record<string, { tier: number; why: string }> = {
  pauper: { tier: 0, why: 'commons only' },
  peasant: { tier: 0, why: 'commons and uncommons' },
  'fair-fight': { tier: 0, why: "Pauper's power ceiling at every rarity" },
  synergy: { tier: 1, why: 'mid power, theme-driven' },
  'modern-era': { tier: 1, why: 'Modern-era rares, no Power' },
  omega: { tier: 2, why: 'high power, evolved from Vintage-era cards' },
  vintage: { tier: 2, why: 'Vintage power' },
};

export interface QueueKnobs {
  bridgeShare: number;
  /** link() by tier gap 0, 1, 2+. */
  linkSame: number; linkAdjacent: number; linkFar: number;
  minPairWeight: number;
  /** Prior SD of a card's effect, logits (for var_c from game counts). */
  tau: number;
  minDrafts: number;
}
export const QUEUE_DEFAULTS: QueueKnobs = { bridgeShare: 0.2, linkSame: 0.4, linkAdjacent: 1, linkFar: 0.7, minPairWeight: 0.25, tau: 0.25, minDrafts: 20 };

export interface CubeSet { id: string; file: string; cards: string[] }

export interface PairRow { key: string; a: string; b: string; shared: number; novelty: number; gap: number; link: number; unc: number; weight: number; kept: boolean; why: string }
export interface KeyAlloc { key: string; kind: 'normal' | 'bridge'; cubes: string[]; weight: number; drafts: number }

export function tierOf(id: string): number { return TIERS[id]?.tier ?? 1; }

/** A card's uncertainty: from power.tsv's sd, else from its pooled game count. */
export function cardVar(name: string, games: Map<string, number>, sd: Map<string, number> | null, k: QueueKnobs = QUEUE_DEFAULTS): number {
  const s = sd?.get(name);
  if (s !== undefined && Number.isFinite(s)) return s * s;
  return 1 / (1 / (k.tau * k.tau) + (games.get(name) ?? 0) / 4);
}

/** The pair a and b are keyed by: lower tier first, then by id. */
export function pairKey(a: string, b: string): [string, string] {
  return [a, b].sort((x, y) => tierOf(x) - tierOf(y) || (x < y ? -1 : x > y ? 1 : 0)) as [string, string];
}

/** Every pair of the selected cubes, scored. */
export function scorePairs(cubes: CubeSet[], games: Map<string, number>, sd: Map<string, number> | null, k: QueueKnobs = QUEUE_DEFAULTS): PairRow[] {
  const prior = k.tau * k.tau;
  const rows: PairRow[] = [];
  for (let i = 0; i < cubes.length; i++) {
    for (let j = i + 1; j < cubes.length; j++) {
      const [ia, ib] = pairKey((cubes[i] as CubeSet).id, (cubes[j] as CubeSet).id);
      const A = cubes.find((c) => c.id === ia) as CubeSet;
      const B = cubes.find((c) => c.id === ib) as CubeSet;
      const setA = new Set(A.cards);
      const shared = B.cards.filter((c) => setA.has(c)).length;
      const novelty = 1 - shared / Math.min(A.cards.length, B.cards.length);
      const gap = Math.abs(tierOf(A.id) - tierOf(B.id));
      const link = gap === 0 ? k.linkSame : gap === 1 ? k.linkAdjacent : k.linkFar;
      const union = [...new Set([...A.cards, ...B.cards])];
      const unc = union.reduce((s, c) => s + cardVar(c, games, sd, k), 0) / union.length / prior;
      const weight = novelty * link * unc;
      const kept = novelty * link >= k.minPairWeight;
      const what = gap === 0 ? 'same power tier' : gap === 1 ? 'adjacent tiers: chains the power levels' : 'flat with powered: lopsided games';
      const why = `${what}; ${shared} cards shared${kept ? '' : ` -- skipped: novelty × link ${(novelty * link).toFixed(2)} < ${k.minPairWeight}, mostly the same pool`}`;
      rows.push({ key: `${A.id}+${B.id}`, a: A.id, b: B.id, shared, novelty, gap, link, unc, weight, kept, why });
    }
  }
  return rows.sort((x, y) => y.weight - x.weight || (x.key < y.key ? -1 : 1));
}

/** Each cube's own weight: Σ var_c / m_c over its cards. */
export function cubeWeights(cubes: CubeSet[], games: Map<string, number>, sd: Map<string, number> | null, k: QueueKnobs = QUEUE_DEFAULTS): Map<string, number> {
  const mult = new Map<string, number>();
  for (const c of cubes) for (const n of new Set(c.cards)) mult.set(n, (mult.get(n) ?? 0) + 1);
  return new Map(cubes.map((c) => [c.id, [...new Set(c.cards)].reduce((s, n) => s + cardVar(n, games, sd, k) / (mult.get(n) as number), 0)]));
}

/** Split `total` drafts over keys by weight; keys under minDrafts are dropped and the split redone. */
export function allocate(total: number, keys: Array<{ key: string; weight: number }>, minDrafts: number): Map<string, number> {
  let live = keys.filter((x) => x.weight > 0);
  for (;;) {
    const parts = apportion(total, live.map((x) => x.weight));
    const small = live.filter((_, i) => (parts[i] as number) < minDrafts);
    if (small.length === 0 || small.length === live.length) return new Map(live.map((x, i) => [x.key, parts[i] as number]));
    const worst = small.reduce((a, b) => (a.weight <= b.weight ? a : b));
    live = live.filter((x) => x !== worst);
  }
}

export interface Chunk { key: string; kind: 'normal' | 'bridge'; cubes: string[]; seed: number; drafts: number }
export interface NightPlan {
  night: number; drafts: number; games: number; format: string; knobs: QueueKnobs; alloc: KeyAlloc[]; pairs: PairRow[]; chunks: Chunk[]; bridgeRatings?: 'even' | 'own';
  /** D341: one line per `queue run` of this night: when, the code and engine it ran on (each chunk's run.json has the full version). */
  runs?: Array<{ at: string; gitSha: string | null; codeTree: string | null; dirty: boolean; diffSha: string | null; forgeJarSha256: string | null; allowVersionChange: boolean; recordEvery?: number }>;
  /** D358: the night's play exploration (absent: none), passed to every chunk; a re-run must not change it. */
  playExplore?: PlayExploreOptions;
  /** D375: the night's --profile-mix, normalised (mixText); absent: Default vs Default. A re-run must not change it. */
  profileMix?: string;
  /** D365: the night records its games (`--record-every N`, D315); a re-run without the flag is refused. */
  recordEvery?: number;
}
export interface Ledger { v: 1; games: number; format: string; nextSeed: Record<string, number>; nights: number[] }

/** The night's plan: the allocation, then chunks of at most `chunk` drafts with fresh seeds from the ledger, interleaved. */
export function planNight(night: number, total: number, cubes: CubeSet[], games: Map<string, number>, sd: Map<string, number> | null,
  ledger: Ledger, chunk: number, k: QueueKnobs = QUEUE_DEFAULTS): NightPlan {
  const pairs = scorePairs(cubes, games, sd, k);
  const nBridge = Math.round(total * k.bridgeShare);
  const cw = cubeWeights(cubes, games, sd, k);
  const normal = allocate(total - nBridge, cubes.map((c) => ({ key: `normal/${c.id}`, weight: cw.get(c.id) as number })), k.minDrafts);
  const bridge = allocate(nBridge, pairs.filter((p) => p.kept).map((p) => ({ key: `bridge/${p.key}`, weight: p.weight })), k.minDrafts);
  const alloc: KeyAlloc[] = [
    ...cubes.map((c) => ({ key: `normal/${c.id}`, kind: 'normal' as const, cubes: [c.id], weight: cw.get(c.id) as number, drafts: normal.get(`normal/${c.id}`) ?? 0 })),
    ...pairs.filter((p) => p.kept).map((p) => ({ key: `bridge/${p.key}`, kind: 'bridge' as const, cubes: [p.a, p.b], weight: p.weight, drafts: bridge.get(`bridge/${p.key}`) ?? 0 })),
  ];
  // Chunks: each key's drafts cut into pieces, then interleaved, so a night cut short has done a little of everything.
  const perKey = alloc.filter((a) => a.drafts > 0).map((a) => {
    const out: Chunk[] = [];
    let seed = ledger.nextSeed[a.key] ?? 1;
    for (let left = a.drafts; left > 0;) {
      const n = Math.min(chunk, left);
      assertQueueSeeds(a.key, seed, n);
      out.push({ key: a.key, kind: a.kind, cubes: a.cubes, seed, drafts: n });
      seed += n; left -= n;
    }
    ledger.nextSeed[a.key] = seed;
    return out;
  });
  const chunks: Chunk[] = [];
  for (let i = 0; perKey.some((l) => i < l.length); i++) for (const l of perKey) if (l[i]) chunks.push(l[i] as Chunk);
  if (!ledger.nights.includes(night)) ledger.nights.push(night);
  return { night, drafts: total, games: ledger.games, format: ledger.format, knobs: k, alloc, pairs, chunks };
}

/**
 * D375: the night's mix from the flag, normalised -- or null without one.  On a night already
 * planned, `planned` is its plan's mix: a flag may repeat it, never change it.
 */
export function nightProfileMix(flag: string | undefined, planned: string | null | undefined, night: number): string | null {
  const want = flag === undefined ? undefined : mixText(parseProfileMix(flag));
  if (planned !== undefined) {
    if (want !== undefined && want !== (planned ?? undefined)) {
      throw new Error(`night ${night} was planned with ${planned ? `--profile-mix ${planned}` : 'no --profile-mix'}; re-run it with the same (or without the flag)`);
    }
    return planned ?? null;
  }
  return want ?? null;
}

/** D375: a chunk's seats: Default vs Default, or the night's mix (each draft's seats drawn by its seed; rows carry `profiles`). */
export function seatOptions(plan: Pick<NightPlan, 'profileMix'>): Pick<RunOptions, 'profiles' | 'profileMix'> {
  return plan.profileMix ? { profiles: ['Default', 'Default'], profileMix: parseProfileMix(plan.profileMix) } : { profiles: ['Default', 'Default'] };
}

/** Every (key, seed) of every plan, once: throws on a duplicate (it would be the same draft twice) or a seed out of the lab range (D340). */
export function assertNoDuplicates(plans: NightPlan[]): number {
  const seen = new Set<string>();
  let n = 0;
  for (const p of plans) for (const c of p.chunks) assertQueueSeeds(c.key, c.seed, c.drafts);
  for (const p of plans) for (const c of p.chunks) for (let s = c.seed; s < c.seed + c.drafts; s++) {
    const id = `${c.key}#${s}`;
    if (seen.has(id)) throw new Error(`queue: ${c.key} seed ${s} is planned twice (nights ${p.night} and earlier) -- the ledger is broken`);
    seen.add(id);
    n++;
  }
  return n;
}

/**
 * Decisive games per card, pooled by name over every drafts.jsonl under these folders (played decks; basics left out).
 * Drafts whose games explored (D358) are left out: the matchup model does not read them, so they cover nothing.
 */
export function gamesByCard(dirs: string[]): Map<string, number> {
  const g = new Map<string, number>();
  const visit = (d: string): void => {
    if (!fs.existsSync(d)) return;
    const jl = path.join(d, 'drafts.jsonl');
    if (fs.existsSync(jl)) {
      for (const line of fs.readFileSync(jl, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const rec = JSON.parse(line) as DraftRecord;
        if (isPlayExplored(rec)) continue;
        const decisive = rec.match.games.filter((x) => x.winner === 'A' || x.winner === 'B').length;
        if (!decisive) continue;
        const names = new Set<string>();
        for (const dr of rec.drafters) {
          const main = dr.played !== 'forge' && dr.deck ? dr.deck.main : (dr.forge?.main ?? []);
          for (const [, n] of main) if (!BASICS.has(n)) names.add(n);
        }
        for (const n of names) g.set(n, (g.get(n) ?? 0) + decisive);
      }
    }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !['decks', 'logs', 'frames', 'games'].includes(e.name)) visit(path.join(d, e.name));
  };
  for (const d of dirs) visit(d);
  return g;
}
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

/**
 * power.tsv's POSTERIOR SD column (`sdPost`, tools/ml/matchup.py, D342), by card name.  A file with only the old
 * `sd` column (a bootstrap of shrunk estimates, 2-15x too small for the least-seen cards: review 2, N1) is
 * refused, not read.  An AI-limited card (`ai` = limited) gets 0: Forge's games cannot rate it, so no
 * draft is spent on learning it.
 */
export function readPowerSd(file: string): Map<string, number> {
  const m = new Map<string, number>();
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const head = (lines.shift() ?? '').split('\t');
  const iName = head.indexOf('name');
  const iSd = head.indexOf('sdPost');
  const iAi = head.indexOf('ai');
  if (iName < 0 || iSd < 0) {
    throw new Error(head.includes('sd')
      ? `${file} is an old power.tsv: its sd column is a bootstrap of shrunk estimates (far too small for the least-seen cards) -- retrain with tools/ml/matchup.py, which writes sdPost`
      : `${file}: want a header with name and sdPost columns`);
  }
  for (const l of lines) {
    const f = l.split('\t');
    m.set(f[iName] as string, iAi >= 0 && f[iAi] === 'limited' ? 0 : Number(f[iSd]));
  }
  return m;
}

/**
 * The `--record-every` this night has recorded at before, or 0: the plan's own `recordEvery` (written by
 * every recording run since D365), else -- a plan written before that -- recordings already under
 * `<root>/<key>/games/<seed>/` for a seed of this night's chunks (D315's layout).
 */
export function nightRecorded(plan: NightPlan, root: string): number {
  if (plan.recordEvery && plan.recordEvery > 0) return plan.recordEvery;
  const fromRuns = (plan.runs ?? []).map((r) => r.recordEvery ?? 0).find((n) => n > 0);
  if (fromRuns) return fromRuns;
  for (const c of plan.chunks) {
    let ents: string[] = [];
    try { ents = fs.readdirSync(path.join(root, c.key, 'games')); } catch { continue; }
    for (const e of ents) {
      const s = /^\d+$/.test(e) ? Number(e) : NaN;
      if (s >= c.seed && s < c.seed + c.drafts) return -1;            // recorded, at a rate the old plan did not keep
    }
  }
  return 0;
}

/**
 * D365: a night that recorded its games, run again WITHOUT --record-every, would play its remaining chunks
 * unrecorded and say nothing (the evaluator's dataset reads those recordings).  Refused, unless the flag is
 * given: `--record-every 0` plays the rest unrecorded on purpose (said loudly); a different N is said too.
 * Returns the warning to print, or null; throws the refusal.
 */
export function checkNightRecording(plan: NightPlan, root: string, flagGiven: boolean, recordEvery: number): string | null {
  const before = nightRecorded(plan, root);
  if (!before || recordEvery === before) return null;
  const was = before > 0 ? `--record-every ${before}` : 'recording (the plan predates D365 and does not say at what rate)';
  if (!flagGiven) {
    throw new Error(`night ${plan.night} was played with ${was}, but this run has no --record-every: its remaining chunks would play unrecorded. ` +
      `Run it again with ${before > 0 ? `--record-every ${before}` : 'the same --record-every'} (or --record-every 0 to play the rest unrecorded on purpose)`);
  }
  if (recordEvery === 0) return `WARNING: night ${plan.night} was played with ${was}; --record-every 0 plays the rest of it UNRECORDED, as asked`;
  return before > 0 ? `WARNING: night ${plan.night} was played with --record-every ${before}; the rest records every ${recordEvery}, as asked` : null;
}

function renderPlan(p: NightPlan, root: string): string {
  const out: string[] = [];
  out.push(`night ${p.night}: ${p.drafts} drafts (${p.chunks.length} chunks), ${p.games} game(s) a draft, ${p.format}, bridge share ${p.knobs.bridgeShare}`);
  if (p.profileMix) out.push(`AI seats (D375): each drafter drawn per draft from ${p.profileMix}; drafts.jsonl rows carry \`profiles\``);
  if (p.playExplore) out.push(`play exploration (D358): ${playExploreText(p.playExplore)} -- about ${Math.round(p.drafts * p.playExplore.share)} drafts explore; win rates leave them out`);
  out.push('', 'pool key                         weight    drafts');
  for (const a of p.alloc) out.push(`${a.key.padEnd(32)} ${a.weight.toFixed(3).padStart(7)} ${String(a.drafts).padStart(9)}`);
  out.push('', 'bridge pairs (novelty = 1 - shared / smaller cube; link by power tier; unc = mean card variance / prior)');
  for (const r of p.pairs) out.push(`  ${r.kept ? 'keep' : 'skip'} ${r.key.padEnd(24)} novelty ${r.novelty.toFixed(2)} link ${r.link.toFixed(1)} unc ${r.unc.toFixed(2)} weight ${r.weight.toFixed(3)}  ${r.why}`);
  out.push('', `folders: ${root}/normal/<cube>, ${root}/bridge/<a>+<b>`);
  return out.join('\n');
}

/** One chunk's `run` options: the same for `queue run`, its preflight and `queue check` (D394). */
export function chunkOptions(repo: string, root: string, plan: NightPlan, c: Chunk,
  x: { jobs: number; allowVersionChange: boolean; recordEvery: number; gameTimeoutSec: number }): RunOptions {
  const cubeFile = c.kind === 'normal' ? resolveCube(c.cubes[0] as string, repo) : '';
  const o: RunOptions = {
    cubeFile, format: plan.format as 'grid' | 'winston', drafts: c.drafts, games: plan.games, jobs: x.jobs, seed: c.seed,
    ...seatOptions(plan), ratingsFile: c.kind === 'normal' ? defaultRatings(cubeFile) : null, record: 0,
    out: path.join(root, c.key), builder: 'lab', gameTimeoutSec: x.gameTimeoutSec, winstonCards: 90, weights: DEFAULT_WEIGHTS,
    ...(x.allowVersionChange ? { allowVersionChange: true } : {}),
  };
  if (c.kind === 'bridge') {
    o.bridge = bridgeOptions(repo, c.cubes.join(','), undefined, 180, plan.bridgeRatings ?? 'even');
    o.cubeFile = `bridge:${c.cubes.join('+')}`;
  }
  // Recording every game in the worker, both chairs (D315): the evaluator's dataset and this model read one run.
  if (x.recordEvery) o.recordEvery = x.recordEvery;
  // D358: a seeded share of this chunk's drafts explore their games
  if (plan.playExplore) o.playExplore = plan.playExplore;
  return o;
}

/**
 * D394: each key folder of the night, checked by `runLab` itself (`checkOnly`) with the options of its first
 * chunk still to play: the identity check and D341's version check, nothing written.  Returns the refusals
 * (one line per folder); prints one line per folder.
 */
export async function checkKeyFolders(env: EngineEnv, plan: NightPlan, opts: (c: Chunk) => RunOptions, say: (s: string) => void): Promise<string[]> {
  const first = new Map<string, Chunk>();
  for (const c of plan.chunks) if (!first.has(c.key)) first.set(c.key, c);
  const refused: string[] = [];
  const quiet = (): void => {};
  say(`\nkey folders (D394): ${first.size} checked before anything is written`);
  for (const [key, c] of first) {
    try {
      const r = await runLab(env, { ...opts(c), checkOnly: true }, quiet);
      const what = !r.resumed ? 'new folder' : r.versionChange ? `version change allowed (${r.versionChange.join(', ')})` : 'same version';
      say(`  ok       ${key}: ${what}${r.done ? `, ${r.done} draft(s) already there` : ''}`);
    } catch (e) {
      const m = e instanceof Error ? e.message.split('\n')[0] as string : String(e);
      refused.push(`${key}: ${m}`);
      say(`  REFUSED  ${key}: ${m}`);
    }
  }
  return refused;
}

export async function queueCommand(repo: string, mode: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const num = (k: string, d: number): number => { const v = one(k); const n = v === undefined ? d : Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`--${k} wants a number, got ${v}`); return n; };
  const root = one('root') ?? 'var/cubelab/queue';
  const night = num('night', NaN);
  if (!Number.isInteger(night) || night < 1) throw new Error('queue needs --night N (1, 2, ...)');
  const ids = (one('cubes') ?? fs.readdirSync(path.join(repo, 'cubes')).filter((x) => /-cube-180\.md$/.test(x)).map(cubeId).sort().join(',')).split(',');
  const cubes: CubeSet[] = ids.map((id) => {
    const file = resolveCube(id, repo);
    return { id: cubeId(file), file, cards: parseCube(fs.readFileSync(path.join(repo, file), 'utf8')).cards.map((c) => c.name) };
  });
  fs.mkdirSync(root, { recursive: true });
  const ledgerFile = path.join(root, 'queue.json');
  const planFile = path.join(root, `night-${night}.json`);
  const games = num('games', 1);
  const format = one('format') ?? 'grid';
  let ledger: Ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) as Ledger : { v: 1, games, format, nextSeed: {}, nights: [] };
  if (ledger.games !== games || ledger.format !== format) throw new Error(`${root} was planned with --games ${ledger.games} --format ${ledger.format}; use those or a new --root`);
  let plan: NightPlan;
  const playExplore = parsePlayExploreArgs(f.get('play-explore') ?? []);
  if (fs.existsSync(planFile)) {
    plan = JSON.parse(fs.readFileSync(planFile, 'utf8')) as NightPlan;
    for (const c of plan.chunks) assertQueueSeeds(c.key, c.seed, c.drafts);
    // D358: the plan's exploration is the night's; a flag may repeat it, never change it
    if (f.has('play-explore') && JSON.stringify(playExplore) !== JSON.stringify(plan.playExplore ?? null)) {
      throw new Error(`night ${night} was planned with ${plan.playExplore ? `--play-explore ${playExploreText(plan.playExplore)}` : 'no --play-explore'}; re-run it with the same (or without the flag)`);
    }
    const mix = nightProfileMix(f.get('profile-mix')?.at(-1), plan.profileMix ?? null, night);
    if (mix) plan.profileMix = mix;
    say(`night ${night}: re-reading its plan (${planFile}); finished drafts are skipped`);
  } else {
    const drafts = num('drafts', NaN);
    if (!Number.isInteger(drafts) || drafts < 1) throw new Error('a new night needs --drafts D');
    const knobs: QueueKnobs = { ...QUEUE_DEFAULTS, bridgeShare: num('bridge-share', QUEUE_DEFAULTS.bridgeShare), minDrafts: num('min-drafts', QUEUE_DEFAULTS.minDrafts) };
    const sd = one('power') ? readPowerSd(one('power') as string) : null;  // sdPost, D342
    const g = gamesByCard([root]);
    say(`coverage: ${g.size} card(s) with games under ${root}${sd ? `; uncertainty from ${one('power')}` : ''}`);
    ledger = JSON.parse(JSON.stringify(ledger)) as Ledger;
    plan = planNight(night, drafts, cubes, g, sd, ledger, Math.max(1, num('chunk', 250)), knobs);
    const br = one('bridge-ratings') ?? 'even';
    if (br !== 'even' && br !== 'own') throw new Error(`--bridge-ratings is even or own, got ${br}`);
    plan.bridgeRatings = br;
    if (playExplore) plan.playExplore = playExplore;
    const mix = nightProfileMix(f.get('profile-mix')?.at(-1), undefined, night);
    if (mix) plan.profileMix = mix;
    const others = ledger.nights.filter((n) => n !== night).map((n) => path.join(root, `night-${n}.json`)).filter((x) => fs.existsSync(x))
      .map((x) => JSON.parse(fs.readFileSync(x, 'utf8')) as NightPlan);
    assertNoDuplicates([...others, plan]);
    if (mode === 'run') {
      fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 1)}\n`);
      fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 1)}\n`);
    }
  }
  say(renderPlan(plan, root));
  if (mode === 'plan') { say('\n(plan only: nothing written; `queue run` with the same flags writes and plays it)'); return 0; }
  const recordEvery = num('record-every', 0);
  // D365: a recorded night is never finished unrecorded by a re-run that forgot the flag.
  const recWarning = checkNightRecording(plan, root, f.has('record-every'), recordEvery);
  if (recWarning) say(recWarning);

  if (plan.profileMix) {
    const aiDir = path.join(repo, 'forge-home', 'res', 'ai');
    checkProfiles(parseProfileMix(plan.profileMix).map((m) => m.spec),
      fs.existsSync(aiDir) ? fs.readdirSync(aiDir).filter((n) => n.endsWith('.ai')).map((n) => n.slice(0, -3)) : null);
  }
  const env = engineEnv(repo);
  // One engine lookup for every cube's cards; every chunk's own lookup is then a subset of it (engine.ts).
  engineFacts(env, [...new Set(cubes.flatMap((c) => c.cards))], say);
  const jobs = Math.max(1, num('jobs', 1));
  const allowVersionChange = f.has('allow-version-change');
  if (jobs > env.homes.length) throw new Error(`--jobs ${jobs} but only ${env.homes.length} Forge home(s) were built`);
  const chunkOpts = (c: Chunk): RunOptions => chunkOptions(repo, root, plan, c, { jobs, allowVersionChange, recordEvery, gameTimeoutSec: num('game-timeout', 300) });
  // D394: every key folder the night appends to is checked first, exactly as its first chunk's `run` will
  // check it (the folder's identity, then D341's version), writing nothing.  `queue check` stops here; a
  // `queue run` that would be refused anywhere stops before any chunk plays or the plan records the run.
  const refused = await checkKeyFolders(env, plan, chunkOpts, say);
  if (mode === 'check') {
    say(refused.length ? `\nnight ${night}: ${refused.length} key folder(s) would refuse this run:\n  ${refused.join('\n  ')}` : `\nnight ${night}: every key folder accepts this run (check only: nothing written)`);
    return refused.length ? 1 : 0;
  }
  if (refused.length) throw new Error(`night ${night}: ${refused.length} key folder(s) would refuse this run, so nothing was played:\n  ${refused.join('\n  ')}`);
  // D341: the night's plan records every run of it, with the code and engine (each chunk's run.json has the full version).
  plan.runs = [...(plan.runs ?? []), { at: new Date().toISOString(), ...codeVersion(repo), forgeJarSha256: fileSha(process.env.FORGE_JAR ?? null), allowVersionChange, recordEvery }];
  if (recordEvery) plan.recordEvery = recordEvery;
  fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 1)}\n`);
  let k = 0;
  const failed: string[] = [];
  for (const c of plan.chunks) {
    k++;
    const o = chunkOpts(c);
    say(`\n== chunk ${k}/${plan.chunks.length}: ${c.key}, seeds ${c.seed}..${c.seed + c.drafts - 1}`);
    // One chunk failing (an engine that would not boot under load, say) does not end the night: the
    // rest play, and running the same line again retries only what is missing.
    try {
      await runLab(env, o, say);
      if (recordEvery) {
        const rj = JSON.parse(fs.readFileSync(path.join(o.out, 'run.json'), 'utf8')) as { record?: unknown };
        if (!rj.record) throw new Error('--record-every was asked for, but the run did not record (D315) -- stopping the night');
      }
    } catch (e) {
      // A refusal is the same for every chunk of its folder (D341, D394): it stops the night, never fails it chunk by chunk.
      if (e instanceof Error && /did not record \(D315\)|was written by lab version|holds a run with a different/.test(e.message)) throw e;
      failed.push(`${c.key} seeds ${c.seed}..${c.seed + c.drafts - 1}: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
      say(`chunk ${k} FAILED, carrying on: ${failed.at(-1)}`);
    }
  }
  if (failed.length) {
    say(`\nnight ${night}: ${failed.length} chunk(s) failed -- run the same line again to retry them:\n  ${failed.join('\n  ')}`);
    return 1;
  }
  say(`\nnight ${night} done. Next: python3 tools/ml/matchup.py train ${root} --out var/ml/matchup`);
  return 0;
}

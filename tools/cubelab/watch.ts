// mtg-table — the cube lab's `watch`: two bots grid-draft a cube, then play a best of three you can watch (D440).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh watch cubes/fair-fight-cube-180.md [--format grid] [--seed S] [--games 3]
//       [--drafter-a lab|forge-ranks|llm:<model>[:thinking=...]|human-picks:<x.picks.json>] [--drafter-b ...]
//       [--player-a <Profile>|search-v2] [--player-b ...] [--pace 600] [--out <dir>]
//       [--ratings <tsv>] [--game-timeout <sec>]
//       [--llm-max-usd 1|none] [--llm-max-calls 40] [--llm-fallback-rate 0.25]
//
// THE DRAFTERS (D443): each side drafts with the lab drafter (`lab`), or ONE side
// with another drafter the lab has -- Forge's ranks (`forge-ranks`), Claude
// (`llm:<model>`, D439) or ForgeCoach's human pick model (`human-picks:<file>`,
// D416) -- the other side then the lab drafter, as every `--drafter` run is.
// An `llm:` drafter runs under a spend cap for the whole watch (D442: $1 and 40
// calls unless the flags say otherwise) and the fallback stop: past 25% of its
// decisions falling back to the lab drafter's line (a logged-out CLI, replies it
// cannot read), the watch ends `error` saying so -- it never goes on as a lab vs
// lab draft under an `llm` name.  match.json's `cost` is what it really spent
// (calls, failed calls, decisions, fallbacks, tokens, dollars at list price),
// kept up to date while it drafts, and written when it stops.
//
// What it does, in order, all of it into ONE folder (--out; default
// var/spectate/watch-<cube>-<seed>/, the id is the folder's name).  The cube
// may be any path: a custom cube (D444, ForgeCoach's cube builder) is
// <out>/cube.md, which the coach helper writes before it starts the watch and
// the watch keeps; with no ratings file beside it the lab drafts with Forge's
// ranks (defaultRatings is null):
//
//   1. match.json `status: "drafting"`, with the cube, the seed, the players, the
//      drafters and startedAt from the first write (a killed watch still says what it was);
//   2. ONE grid draft with the lab's drafters and builders -- `run` itself, with
//      --drafts 1 --games 0 (draft and build only, D318), into <out>/lab/, so the
//      picks and the decks are exactly what `run` makes at this seed (D294);
//   3. draft.json: the whole draft as a viewer replays it -- every grid as each
//      drafter saw it (nine slots, null where the first pick emptied them), the
//      line taken (0-2 rows, 3-5 columns, as ForgeCoach's draft and the draft
//      room number them) and the cards gained, both pools, both decks (the lab
//      builder's colours, curve, themes, score and the next-best builds);
//   4. the best of `--games`: each game a PACED both-AI mtgtable.RecordMatch
//      (scripts/spectate.sh's recorder, amendment M47) from SEAT 0's eyes --
//      drafter A's -- into <out>/<id>-g<n>.jsonl, a follower reading it as it grows;
//      after each game its winner goes into match.json, the recording through
//      tools/check-redaction.mjs; it stops once a side has more than half;
//   5. match.json `status: "done"` (or "error" / "stopped", with why).
//
// HIDDEN INFORMATION.  A grid draft is played face up -- both drafters see every
// grid and every line the other takes -- so draft.json's picks and pools reveal
// nothing a drafter did not see; its decks are built in private, so B's main /
// side split is the one thing in it A never saw (docs/watch-bots.md says how to
// label it).  The GAMES are not face
// up: each recording is one seat's view (seat 0, drafter A), the other hand the
// five-key stub (hard rule 8), checked by tools/check-redaction.mjs like every
// spectated game.  A viewer that shows draft.json's deck B beside a game shows a
// decklist, never what B holds.
//
// A player is a Forge AI profile (an .ai file: Default, Cautious, Reckless,
// Experimental) or `search` -- search-v2, the live search seat (Default plus
// D310's outlets plus D412's anytime search; the ladder's search-v1-anytime),
// seated by RecordMatch's --policy search.
//
// match.json is rewritten whole (a temp file renamed over it) after every change,
// so a reader never sees half of one; draft.json is written once.  The coach
// helper's /watch routes serve both and the games (tools/watch-runner.mjs);
// docs/watch-bots.md is the contract.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { parseCube } from './cube.ts';
import { parseDrafter } from './drafters.ts';
import { engineEnv, type EngineEnv } from './engine.ts';
import { dckText } from './deck.ts';
import { LINES } from './draft.ts';
import { LlmBudget, llmCapsOf, LlmStop, type DraftModel, type LlmCaps, type LlmSpend, type LlmStopReason } from './llmdraft.ts';
import { defaultRatings, runLab, sha, type DraftRecord, type RunDrafterOption, type RunMeta } from './run.ts';
import { DEFAULT_WEIGHTS } from './weights.ts';
import { RESERVED_SEED_MIN, VERIFY_SEED_MIN } from './seeds.ts';

export type Side = 'A' | 'B';
export type WatchStatus = 'drafting' | 'playing' | 'done' | 'error' | 'stopped';

/** One seat's player: a Forge profile, or `search` (search-v2 on the Default profile). */
export interface Player { player: string; profile: string; policy: 'plain' | 'search' }

/** The live search seat's version, as RecordMatch prints it (SearchConfig.LIVE_VERSION). */
export const SEARCH_VERSION = 'search-v2';

/** `--player-a` / `--player-b`: a profile name (any case) or `search` / `search-v2`. */
export function parsePlayer(text: string, profiles: string[]): Player {
  const t = text.trim();
  if (/^search(-v2)?$/i.test(t)) return { player: 'search', profile: 'Default', policy: 'search' };
  const p = profiles.find((x) => x.toLowerCase() === t.toLowerCase());
  if (!p) throw new Error(`player "${text}" is not search or one of the profiles ${profiles.join(', ')}`);
  return { player: p, profile: p, policy: 'plain' };
}

/** The seat spec `run` records for this player (run.json's profiles; games 0 plays none). */
export function seatSpecOf(p: Player): string {
  return p.policy === 'search' ? `${p.profile}+outlets+search:anytime=1` : p.profile;
}

// ------------------------------------------------------------------ draft.json

export interface WatchPick {
  /** 1-based over the whole draft: grid 1's first pick, its second, grid 2's first, ... */
  n: number;
  grid: number;
  seat: Side;
  /** 1 = this drafter opened the grid, 2 = it picked from what was left. */
  order: 1 | 2;
  /** The grid as this drafter saw it: nine slots, row by row, null where a card was already taken. */
  slots: Array<string | null>;
  /** 0-2 the rows, 3-5 the columns (ForgeCoach's draft and the draft room's numbering). */
  line: number;
  /** "row 2", "col 1": the lab's own words for `line`. */
  lineName: string;
  /** What the line held, in slot order: the cards this drafter gained. */
  took: string[];
  /** The lab drafter's value for the line it took (pick.ts's setValue). */
  value: number;
}

export interface WatchDeck {
  /** The deck's Name= in the .dck the games played (what hello_ok.match prints). */
  name: string;
  /** The .dck the games played, relative to the watch folder. */
  file: string;
  /** Who built it: the lab's builder, or Forge's when the lab's found no legal build (run's fallback). */
  builder: 'lab' | 'forge';
  colors: string | null;
  splash: string | null;
  cards: number;
  main: Array<[number, string]>;
  /** The pool's cards not in the main deck. */
  sideboard: Array<[number, string]>;
  /** The lab builder's own numbers (null for Forge's build): why this deck. */
  why: null | {
    spells: number; lands: number; creatures: number; curve: number[]; avgCmc: number;
    themes: Array<[string, number]>; score: number; parts: Record<string, number>;
    alternatives: Array<{ colors: string; splash: string | null; score: number }>; stretched: boolean;
  };
  /** What the lab's deck checker said about its own build (empty = legal; non-empty = Forge's played). */
  labErrors: string[];
}

export interface WatchDraft {
  v: 1;
  kind: 'watch-draft';
  id: string;
  /** A grid draft is face up, so both pools and both decks are here (D440); the games are seat 0's eyes. */
  faceUp: true;
  cube: { title: string; file: string; sha256: string };
  format: 'grid';
  seed: number;
  startedAt: string;
  /** ms from the watch's start to the draft and both decks being done (the picks themselves take milliseconds). */
  draftedMs: number;
  drafters: Record<Side, { drafter: string }>;
  /** Who opens grid 1 (then the opener alternates grid by grid). */
  firstSeat: Side;
  grids: number;
  picks: WatchPick[];
  pools: Record<Side, string[]>;
  decks: Record<Side, WatchDeck>;
}

const LINE_OF: Record<string, number> = { 'row 1': 0, 'row 2': 1, 'row 3': 2, 'col 1': 3, 'col 2': 4, 'col 3': 5 };

/** The draft as a viewer replays it, rebuilt from `run`'s pick log (each grid's first look is all nine slots). */
export function watchPicks(rec: Pick<DraftRecord, 'aOpens' | 'drafters'>): WatchPick[] {
  const logs = { A: rec.drafters[0].picks.filter((p) => p.kind === 'grid'), B: rec.drafters[1].picks.filter((p) => p.kind === 'grid') };
  const grids = Math.max(0, ...logs.A.map((p) => p.at), ...logs.B.map((p) => p.at));
  const out: WatchPick[] = [];
  for (let g = 1; g <= grids; g++) {
    const first: Side = ((g - 1) % 2 === 0) === rec.aOpens ? 'A' : 'B';
    const second: Side = first === 'A' ? 'B' : 'A';
    const p1 = logs[first].find((p) => p.at === g);
    const p2 = logs[second].find((p) => p.at === g);
    if (!p1 || !p2) throw new Error(`grid ${g}: the pick log has no ${p1 ? 'second' : 'first'} pick`);
    if (p1.seen.length !== 9) throw new Error(`grid ${g}: the opener saw ${p1.seen.length} cards, not 9`);
    const slots1: Array<string | null> = [...p1.seen];
    const l1 = LINE_OF[p1.how];
    const l2 = LINE_OF[p2.how];
    if (l1 === undefined || l2 === undefined) throw new Error(`grid ${g}: a line the lab does not name (${p1.how}, ${p2.how})`);
    const slots2 = slots1.map((c, i) => ((LINES[l1] as number[]).includes(i) ? null : c));
    // The second drafter's own log must be exactly what is left: a check that the slots are right.
    if (JSON.stringify(slots2.filter((c) => c !== null)) !== JSON.stringify(p2.seen)) throw new Error(`grid ${g}: the second look is not what the first pick left`);
    const lineCards = (s: Array<string | null>, l: number): string[] => (LINES[l] as number[]).map((i) => s[i]).filter((c): c is string => c !== null);
    for (const [seat, order, slots, l, p] of [[first, 1, slots1, l1, p1], [second, 2, slots2, l2, p2]] as const) {
      const took = lineCards(slots, l);
      if (JSON.stringify(took) !== JSON.stringify(p.took)) throw new Error(`grid ${g}: seat ${seat}'s line ${p.how} holds ${took.join(', ')}, the log says ${p.took.join(', ')}`);
      out.push({ n: out.length + 1, grid: g, seat, order, slots: [...slots], line: l, lineName: p.how, took, value: p.value });
    }
  }
  return out;
}

const countPairs = (names: string[]): Array<[number, string]> => {
  const m = new Map<string, number>();
  for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
  return [...m].map(([n, c]) => [c, n]);
};

/** The pool minus the main deck (basics are not in the pool and drop out). */
export function sideboardOf(pool: string[], main: Array<[number, string]>): string[] {
  const side = [...pool];
  for (const [n, name] of main) for (let k = 0; k < n; k++) { const at = side.indexOf(name); if (at >= 0) side.splice(at, 1); }
  return side;
}

/** Each seat's deck as the games will play it: run's choice (the lab's build, else Forge's). */
export function watchDeck(rec: DraftRecord, k: 0 | 1): Omit<WatchDeck, 'name' | 'file'> {
  const dr = rec.drafters[k];
  const lab = dr.played === 'lab' && dr.deck !== null ? dr.deck : null;
  const main: Array<[number, string]> = lab ? lab.main : (dr.forge?.main ?? []);
  if (main.length === 0) throw new Error(`seat ${dr.seat}: no deck -- the lab's build failed (${dr.deckErrors.join('; ')}) and Forge's ${dr.forge?.error ?? 'is missing'}`);
  return {
    builder: lab ? 'lab' : 'forge',
    colors: lab ? lab.colors : (dr.forge?.colors ?? null),
    splash: lab ? lab.splash : null,
    cards: main.reduce((s, [n]) => s + n, 0),
    main,
    sideboard: countPairs(sideboardOf(dr.pool, main)),
    why: lab ? {
      spells: lab.spells, lands: lab.lands, creatures: lab.creatures, curve: lab.curve, avgCmc: lab.avgCmc,
      themes: lab.themes, score: lab.score, parts: lab.parts, alternatives: lab.alternatives, stretched: lab.stretched,
    } : null,
    labErrors: dr.deckErrors,
  };
}

/** draft.json's own checks: what the self-test and the watch itself hold every draft to. Returns the problems. */
export function draftProblems(d: WatchDraft): string[] {
  const bad: string[] = [];
  if (d.v !== 1 || d.kind !== 'watch-draft' || d.format !== 'grid' || d.faceUp !== true) bad.push('not a v1 grid watch-draft');
  if (d.picks.length !== d.grids * 2) bad.push(`${d.picks.length} picks for ${d.grids} grids`);
  const gained: Record<Side, string[]> = { A: [], B: [] };
  d.picks.forEach((p, i) => {
    const where = `pick ${p.n} (grid ${p.grid}, ${p.seat})`;
    if (p.n !== i + 1) bad.push(`${where}: numbered out of order`);
    if (p.slots.length !== 9) bad.push(`${where}: ${p.slots.length} slots, not 9`);
    if (p.order === 1 && p.slots.some((c) => c === null)) bad.push(`${where}: the opener saw an empty slot`);
    if (!Number.isInteger(p.line) || p.line < 0 || p.line > 5) bad.push(`${where}: line ${p.line} is not 0-5`);
    const inLine = (LINES[p.line] ?? []).map((s) => p.slots[s]).filter((c): c is string => c != null);
    if (inLine.length === 0) bad.push(`${where}: line ${p.line} is empty`);
    if (JSON.stringify(inLine) !== JSON.stringify(p.took)) bad.push(`${where}: took ${p.took.join(', ')}, the line holds ${inLine.join(', ')}`);
    if (p.order === 2) {
      const prev = d.picks[i - 1];
      if (!prev || prev.grid !== p.grid || prev.order !== 1 || prev.seat === p.seat) bad.push(`${where}: not after its grid's opener`);
      else {
        if (p.line === prev.line) bad.push(`${where}: the opener's own line`);
        const left = prev.slots.map((c, s) => ((LINES[prev.line] as number[]).includes(s) ? null : c));
        if (JSON.stringify(left) !== JSON.stringify(p.slots)) bad.push(`${where}: not the grid the opener left`);
      }
    }
    gained[p.seat].push(...p.took);
  });
  for (const s of ['A', 'B'] as const) {
    if (JSON.stringify([...gained[s]].sort()) !== JSON.stringify([...d.pools[s]].sort())) bad.push(`pool ${s} is not the sum of its picks`);
    const deck = d.decks[s];
    if (deck.cards !== 40) bad.push(`deck ${s} has ${deck.cards} cards, not 40`);
    if (deck.main.reduce((n, [c]) => n + c, 0) !== deck.cards) bad.push(`deck ${s}'s count is not its main's`);
    const pool = countPairs(d.pools[s]);
    const have = new Map(pool.map(([c, n]) => [n, c]));
    for (const [c, n] of deck.main) {
      if (have.has(n) && (have.get(n) as number) < c) bad.push(`deck ${s} plays ${c} ${n}, the pool has ${have.get(n)}`);
    }
  }
  return bad;
}

// ------------------------------------------------------------------ match.json

export interface WatchGame {
  n: number;
  /** The frame log, in the watch folder: `<id>-g<n>.jsonl` (its gameId is that name); the helper serves it as /watch/<id>/game/<n>. */
  file: string;
  seed: number;
  status: 'playing' | 'done' | 'error';
  winner: Side | 'draw' | null;
  /** Forge's win condition (e.g. "AllOpponentsLost"), when the game ended. */
  reason: string | null;
  turns: number | null;
  /** ms from the watch's start. */
  startedMs: number;
  endedMs: number | null;
  /** tools/check-redaction.mjs on the recording: null until the game ends. */
  redaction: 'pass' | 'fail' | null;
  error?: string;
}

export interface WatchMatch {
  v: 1;
  kind: 'watch-match';
  id: string;
  status: WatchStatus;
  error?: string;
  startedAt: string;
  updatedAt: string;
  cube: { title: string; file: string };
  seed: number;
  /** Best of this many; `need` wins take it. */
  bestOf: number;
  need: number;
  paceMs: number;
  /** Whose eyes every recording is: seat 0, drafter A. */
  view: { seat: 0; side: 'A' };
  players: Record<Side, Player & { deck: string | null }>;
  /** D443: who drafts each side (`lab`, `forge-ranks`, `llm:<model>`, `human-picks:<file>`). */
  drafters: Record<Side, { drafter: string }>;
  /** D443: what an `llm:` drafter spent (null when no side drafts with one), kept current while it drafts. */
  cost: WatchCost | null;
  games: WatchGame[];
  wins: { A: number; B: number; draws: number };
  winner: Side | 'draw' | null;
  /** The game being played now (its n), else null. */
  current: number | null;
  /**
   * The cube's names the engine does not know, drafted without (the #150 review): the helper's check
   * of a custom cube before its 202 (forge-scripts.ts's name index; null = not checked), then, once
   * the draft has run, the engine's own list (run.json's `missing`) for every watch.
   */
  unknownCards?: string[] | null;
}

/** match.json's `cost`: the LLM drafter's caps, its spend so far, and why it stopped the watch (null = it did not). */
export interface WatchCost {
  side: Side;
  drafter: string;
  caps: LlmCaps;
  calls: number;
  callErrors: number;
  decisions: number;
  retries: number;
  fallbacks: number;
  tokensIn: number;
  cacheRead: number;
  cacheCreate: number;
  tokensOut: number;
  /** Dollars at list price: the Claude Code CLI's own cost figure, summed (on a subscription login, what the API would charge). */
  usd: number;
  stopped: LlmStopReason | null;
  why: string | null;
}

/** The watch's defaults for an `llm:` drafter's caps (the coach helper passes its config's): $1, 40 calls (18 decisions, two attempts each), 25%. */
export const WATCH_LLM_CAPS: LlmCaps = { maxCalls: 40, maxUsd: 1, maxFallbackRate: 0.25 };

/** `--drafter-a` / `--drafter-b`: lab, forge-ranks, llm:<model>[:thinking=...], human-picks:<file>; one side at most is not lab. */
export function parseWatchDrafters(a: string, b: string): { drafters: Record<Side, string>; option: RunDrafterOption | null } {
  const drafters: Record<Side, string> = { A: a.trim(), B: b.trim() };
  let option: RunDrafterOption | null = null;
  for (const s of ['A', 'B'] as const) {
    const d = drafters[s];
    if (d === 'lab') continue;
    const spec = parseDrafter(d);
    if (!spec) throw new Error(`--drafter-${s.toLowerCase()} is lab, forge-ranks, llm:<haiku|sonnet|opus|fake>[:thinking=off|low|default] or human-picks:<x.picks.json>, got ${d}`);
    if (option) throw new Error('one side at most drafts with something other than the lab drafter (D416, D439: a drafter is measured against the lab\'s); the other is lab');
    option = spec.kind === 'llm' ? { kind: 'llm', model: spec.model, thinking: spec.thinking, seat: s, seesOpponent: false }
      : spec.kind === 'forge-ranks' ? { kind: 'forge-ranks', seat: s } : { kind: 'human-picks', file: spec.file, seat: s };
  }
  return { drafters, option };
}

/** match.json's `cost` from the budget. */
export function watchCost(side: Side, drafter: string, b: LlmBudget): WatchCost {
  const s: LlmSpend = b.spent;
  return {
    side, drafter, caps: { ...b.caps }, calls: s.calls, callErrors: s.callErrors, decisions: s.decisions, retries: s.retries, fallbacks: s.fallbacks,
    tokensIn: s.tokensIn, cacheRead: s.cacheRead, cacheCreate: s.cacheCreate, tokensOut: s.tokensOut, usd: Math.round(s.usd * 1e6) / 1e6,
    stopped: b.stopped?.reason ?? null, why: b.stopped?.message ?? null,
  };
}

/** The statuses each may move to. A terminal status stays. */
export const NEXT: Record<WatchStatus, WatchStatus[]> = {
  drafting: ['playing', 'error', 'stopped'],
  playing: ['done', 'error', 'stopped'],
  done: [],
  error: [],
  stopped: [],
};
export const TERMINAL: WatchStatus[] = ['done', 'error', 'stopped'];

/** A legal move of match.json, one write to the next (the self-test's state machine). Returns the problem or null. */
export function transitionProblem(prev: WatchMatch | null, next: WatchMatch): string | null {
  if (!prev) return next.status === 'drafting' && next.games.length === 0 ? null : `the first match.json is ${next.status} with ${next.games.length} game(s)`;
  if (prev.status !== next.status && !NEXT[prev.status].includes(next.status)) return `${prev.status} -> ${next.status}`;
  if (next.games.length < prev.games.length) return 'a game vanished';
  for (const g of prev.games) {
    const h = next.games[g.n - 1];
    if (!h || h.n !== g.n || h.file !== g.file) return `game ${g.n} changed identity`;
    if (g.status !== 'playing' && JSON.stringify(g) !== JSON.stringify(h)) return `finished game ${g.n} changed`;
  }
  if (next.games.length > prev.games.length + 1) return 'two games started in one step';
  if (next.status === 'drafting' && next.games.length > 0) return 'a game while drafting';
  const playing = next.games.filter((g) => g.status === 'playing');
  if (playing.length > 1) return 'two games playing at once';
  if (TERMINAL.includes(next.status) && playing.length > 0) return `${next.status} with a game still playing`;
  const w = { A: 0, B: 0, draws: 0 };
  for (const g of next.games) if (g.status === 'done') { if (g.winner === 'A' || g.winner === 'B') w[g.winner]++; else w.draws++; }
  if (JSON.stringify(w) !== JSON.stringify(next.wins)) return 'wins are not the finished games';
  if (next.status === 'done' && next.winner === null) return 'done with no result';
  if (w.A > next.need || w.B > next.need || (w.A === next.need && w.B === next.need)) return 'played past the decision';
  return null;
}

/** The match's result from its wins: a side with `need`, else (every game played) the side ahead or a draw. */
export function resultOf(m: Pick<WatchMatch, 'wins' | 'need' | 'bestOf' | 'games'>): Side | 'draw' | null {
  if (m.wins.A >= m.need) return 'A';
  if (m.wins.B >= m.need) return 'B';
  if (m.games.filter((g) => g.status !== 'playing').length >= m.bestOf) return m.wins.A > m.wins.B ? 'A' : m.wins.B > m.wins.A ? 'B' : 'draw';
  return null;
}

// ------------------------------------------------------------------ the command

export interface WatchOptions {
  cubeFile: string;
  seed: number;
  games: number;
  players: Record<Side, Player>;
  /** `lab`, or one side's forge-ranks / llm:<model> / human-picks:<file> (D416, D439, D443). */
  drafters: Record<Side, string>;
  /** An `llm:` drafter's caps for the whole watch (D442); absent = WATCH_LLM_CAPS. */
  llmCaps?: LlmCaps;
  /** The LLM drafter's model, made on first use; absent = the spec's.  Tests only (run.ts `llmModel`). */
  llmModel?: () => Promise<DraftModel>;
  paceMs: number;
  out: string;
  ratingsFile: string | null;
  gameTimeoutSec: number;
}

/** What a watch folder may hold; anything else and `watch` refuses to clear it. */
const OURS = /^(lab|draft\.json|match\.json|watch\.log|(.+-)?g\d+\.(jsonl|log)|deck-[AB]\.dck|.*\.tmp)$/;

/** The game seed for game n of a watch: a pure function of the watch's seed. */
export const gameSeed = (seed: number, n: number): number => seed * 10 + n;

function writeJson(file: string, v: unknown): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(v, null, 1)}\n`);
  fs.renameSync(tmp, file);
}

/** The RecordMatch summary's winner line -> a side (AI-Seat0 is seat 0, drafter A's deck). */
export function parseSummary(stdout: string): { winner: Side | 'draw' | null; reason: string | null; turns: number | null; ok: boolean } {
  const w = /^winner\s*=\s*(.+?)(?:, reason = (\S+))?\s*$/m.exec(stdout);
  const t = /^player turns\s*=\s*(\d+)/m.exec(stdout);
  const name = w?.[1] ?? null;
  return {
    winner: name === 'AI-Seat0' ? 'A' : name === 'AI-Seat1' ? 'B' : name === '(draw)' ? 'draw' : null,
    reason: w?.[2] ?? null,
    turns: t ? Number(t[1]) : null,
    ok: /^RECORD OK$/m.test(stdout),
  };
}

export async function watch(env: EngineEnv, o: WatchOptions, say: (s: string) => void): Promise<number> {
  const t0 = Date.now();
  const startedAt = new Date(t0).toISOString();
  const id = path.basename(path.resolve(o.out));
  const rel = (f: string): string => path.relative(env.repo, path.resolve(f));
  // D444: a custom cube (ForgeCoach's cube builder) is the helper's <out>/cube.md, written before the watch starts: it stays
  const ownCube = path.resolve(o.cubeFile) === path.resolve(o.out, 'cube.md');
  if (fs.existsSync(o.out)) {
    const foreign = fs.readdirSync(o.out).filter((n) => !OURS.test(n) && !(ownCube && n === 'cube.md'));
    if (foreign.length > 0) throw new Error(`${o.out} holds files a watch did not write (${foreign.slice(0, 3).join(', ')}) -- use a new --out`);
    // watch.log is the helper's for this run, and match.json the helper's first word on it (D443): both stay, and the first save replaces match.json
    for (const n of fs.readdirSync(o.out)) if (n !== 'watch.log' && n !== 'match.json' && !(ownCube && n === 'cube.md')) fs.rmSync(path.join(o.out, n), { recursive: true, force: true });
  }
  fs.mkdirSync(o.out, { recursive: true });
  const cubeText = fs.readFileSync(o.cubeFile, 'utf8');
  const need = Math.floor(o.games / 2) + 1;
  const { option: drafterOption } = parseWatchDrafters(o.drafters.A, o.drafters.B);
  const m: WatchMatch = {
    v: 1, kind: 'watch-match', id, status: 'drafting', startedAt, updatedAt: startedAt,
    cube: { title: parseCube(cubeText).title, file: rel(o.cubeFile) }, seed: o.seed, bestOf: o.games, need, paceMs: o.paceMs, view: { seat: 0, side: 'A' },
    players: { A: { ...o.players.A, deck: null }, B: { ...o.players.B, deck: null } },
    drafters: { A: { drafter: o.drafters.A }, B: { drafter: o.drafters.B } },
    cost: null,
    games: [], wins: { A: 0, B: 0, draws: 0 }, winner: null, current: null,
  };
  const matchFile = path.join(o.out, 'match.json');
  // the helper's first match.json named a custom cube's unknown cards before its 202: kept until the engine says
  try {
    const first = JSON.parse(fs.readFileSync(matchFile, 'utf8')) as Partial<WatchMatch>;
    if (Array.isArray(first.unknownCards) || first.unknownCards === null) m.unknownCards = first.unknownCards;
  } catch { /* no first word: a watch run by hand */ }
  let last: WatchMatch | null = null;
  const save = (): void => {
    m.updatedAt = new Date().toISOString();
    // Every write is held to the state machine the self-test checks (transitionProblem); a bug here is loud.
    const problem = transitionProblem(last, m);
    if (problem && !TERMINAL.includes(m.status)) throw new Error(`match.json would break its state machine: ${problem}`);
    if (problem) say(`watch ${id}: WARNING match.json: ${problem}`);
    writeJson(matchFile, m);
    last = JSON.parse(JSON.stringify(m)) as WatchMatch;
  };
  const fail = (status: 'error' | 'stopped', why: string): void => {
    m.status = status;
    m.error = why;
    for (const g of m.games) if (g.status === 'playing') { g.status = 'error'; g.error = why; g.endedMs = Date.now() - t0; }
    m.current = null;
    save();
  };
  let child: ReturnType<typeof spawn> | null = null;
  // D442/D443: an llm: drafter's spend, one budget for the watch; match.json's `cost` follows it as it moves.
  let budget: LlmBudget | null = null;
  if (drafterOption?.kind === 'llm') {
    const side = drafterOption.seat;
    const llmDrafter = o.drafters[side];
    budget = new LlmBudget(o.llmCaps ?? WATCH_LLM_CAPS, (b) => {
      m.cost = watchCost(side, llmDrafter, b);
      if (m.status === 'drafting') save();
    });
    m.cost = watchCost(side, llmDrafter, budget);
  }
  const onSignal = (sig: NodeJS.Signals): void => {
    // the CLI's calls run in process groups of their own: the budget's stop is what kills them
    if (budget && !budget.stopped) { try { budget.stop(new LlmStop('aborted', `the watch was stopped (${sig})`)); } catch { /* stop() throws by design */ } }
    child?.kill('SIGTERM');
    fail('stopped', `stopped (${sig})`);
    process.exit(130);
  };
  process.once('SIGTERM', onSignal);
  process.once('SIGINT', onSignal);
  save();

  try {
    // 2. the draft: `run` itself, one draft, no games.
    say(`watch ${id}: drafting ${o.cubeFile} (grid, seed ${o.seed}) -- A: ${o.drafters.A} drafts, ${o.players.A.player} plays; B: ${o.drafters.B} drafts, ${o.players.B.player} plays`);
    const labOut = path.join(o.out, 'lab');
    try {
      await runLab(env, {
        cubeFile: o.cubeFile, format: 'grid', drafts: 1, games: 0, jobs: 1, seed: o.seed,
        profiles: [seatSpecOf(o.players.A), seatSpecOf(o.players.B)], ratingsFile: o.ratingsFile, record: 0, out: labOut,
        builder: 'lab', gameTimeoutSec: o.gameTimeoutSec, winstonCards: 90, weights: DEFAULT_WEIGHTS,
        ...(drafterOption ? { drafter: drafterOption } : {}),
        ...(budget ? { llmBudget: budget, llmJobs: 1, ...(o.llmModel ? { llmModel: o.llmModel } : {}) } : {}),
      }, (s) => say(`  lab: ${s}`));
    } catch (e) {
      // D443: an llm: drafter that hit its cap or fell back too often ends the watch in its own words, never as lab vs lab.
      if (budget?.stopped && e instanceof LlmStop && drafterOption) {
        m.cost = watchCost(drafterOption.seat, o.drafters[drafterOption.seat], budget);
        throw new Error(`drafter ${drafterOption.seat} (${o.drafters[drafterOption.seat]}) stopped the watch -- ${budget.stopped.message}`);
      }
      throw e;
    }
    if (budget) m.cost = watchCost((drafterOption as RunDrafterOption).seat, o.drafters[(drafterOption as RunDrafterOption).seat], budget);
    const lines = fs.readFileSync(path.join(labOut, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean);
    const rec = JSON.parse(lines.at(-1) as string) as DraftRecord;
    const meta = JSON.parse(fs.readFileSync(path.join(labOut, 'run.json'), 'utf8')) as RunMeta;
    m.cube.title = meta.cube;
    m.unknownCards = [...(meta.missing ?? [])];   // the engine's own word on the cube's names
    const decks = {} as Record<Side, WatchDeck>;
    for (const k of [0, 1] as const) {
      const side: Side = k === 0 ? 'A' : 'B';
      const d = watchDeck(rec, k);
      const name = `Drafter ${side}${d.colors ? ` (${d.colors}${d.splash ? `+${d.splash.toLowerCase()}` : ''})` : ''}`;
      const file = `deck-${side}.dck`;
      fs.writeFileSync(path.join(o.out, file), dckText(name, d.main, sideboardOf(rec.drafters[k].pool, d.main)));
      decks[side] = { name, file, ...d };
      m.players[side].deck = name;
    }
    const draft: WatchDraft = {
      v: 1, kind: 'watch-draft', id, faceUp: true,
      cube: { title: meta.cube, file: rel(o.cubeFile), sha256: sha(cubeText) }, format: 'grid', seed: o.seed, startedAt,
      draftedMs: Date.now() - t0,
      drafters: { A: { drafter: o.drafters.A }, B: { drafter: o.drafters.B } },
      firstSeat: rec.aOpens ? 'A' : 'B',
      grids: Math.max(...rec.drafters.flatMap((d) => d.picks.map((p) => p.at))),
      picks: watchPicks(rec),
      pools: { A: rec.drafters[0].pool, B: rec.drafters[1].pool },
      decks,
    };
    const problems = draftProblems(draft);
    if (problems.length > 0) throw new Error(`draft.json fails its own checks: ${problems.slice(0, 5).join('; ')}`);
    writeJson(path.join(o.out, 'draft.json'), draft);
    say(`watch ${id}: drafted ${draft.picks.length} picks over ${draft.grids} grids; A ${decks.A.name} (${decks.A.builder}), B ${decks.B.name} (${decks.B.builder}) -> draft.json`);

    // 4. the games.
    m.status = 'playing';
    save();
    for (let n = 1; n <= o.games && resultOf(m) === null; n++) {
      // <id>-g<n>: RecordMatch names the game by its file, so every watch's games have ids of their own.
      const file = `${id}-g${n}.jsonl`;
      const out = path.join(o.out, file);
      const seed = gameSeed(o.seed, n);
      const g: WatchGame = { n, file, seed, status: 'playing', winner: null, reason: null, turns: null, startedMs: Date.now() - t0, endedMs: null, redaction: null };
      m.games.push(g);
      m.current = n;
      save();
      say(`watch ${id}: game ${n} (seed ${seed}) -> ${rel(out)}`);
      const args = ['mtgtable.RecordMatch', '--deck', path.resolve(o.out, decks.A.file), '--ai-deck', path.resolve(o.out, decks.B.file),
        '--profile', o.players.A.profile, '--ai-profile', o.players.B.profile,
        ...(o.players.A.policy === 'search' ? ['--policy', 'search'] : []), ...(o.players.B.policy === 'search' ? ['--ai-policy', 'search'] : []),
        '--seed', String(seed), '--seat', '0', '--match', ...(o.paceMs > 0 ? ['--pace', String(o.paceMs)] : []), '--out', path.resolve(out)];
      const logFile = path.join(o.out, `${id}-g${n}.log`);
      const { code, stdout } = await new Promise<{ code: number | null; stdout: string }>((resolve) => {
        const fd = fs.openSync(logFile, 'w');
        child = spawn(path.join(env.repo, 'bridge/run.sh'), args, { cwd: env.repo, stdio: ['ignore', fd, fd], env: { ...process.env, MTG_TABLE_CONFIG: env.homes[0] } });
        // RecordMatch has its own timeout; this is the backstop for a JVM that hangs past it.
        const limitMs = (600 + (o.paceMs * 3000) / 1000 + (o.players.A.policy === 'search' || o.players.B.policy === 'search' ? 1800 : 0) + 180) * 1000;
        const timer = setTimeout(() => child?.kill('SIGKILL'), limitMs);
        child.on('exit', (c) => { clearTimeout(timer); fs.closeSync(fd); child = null; resolve({ code: c, stdout: fs.readFileSync(logFile, 'utf8') }); });
      });
      const s = parseSummary(stdout);
      g.endedMs = Date.now() - t0;
      g.turns = s.turns;
      g.reason = s.reason;
      if (code !== 0 || !s.ok || s.winner === null) {
        g.status = 'error';
        g.error = `the recorder failed (exit ${code}; ${rel(logFile)})`;
        throw new Error(g.error);
      }
      const red = spawn(process.execPath, [path.join(env.repo, 'tools/check-redaction.mjs'), path.resolve(out)], { cwd: env.repo, stdio: 'ignore' });
      const redCode = await new Promise<number | null>((resolve) => red.on('exit', resolve));
      g.redaction = redCode === 0 ? 'pass' : 'fail';
      if (g.redaction === 'fail') {
        g.status = 'error';
        g.error = `${rel(out)} failed tools/check-redaction.mjs`;
        throw new Error(g.error);
      }
      g.status = 'done';
      g.winner = s.winner;
      if (s.winner === 'draw') m.wins.draws++; else m.wins[s.winner]++;
      m.current = null;
      m.winner = resultOf(m);
      say(`watch ${id}: game ${n} -> ${s.winner === 'draw' ? 'a draw' : `drafter ${s.winner}`} in ${s.turns} turns (${s.reason}); ${m.wins.A}-${m.wins.B}${m.wins.draws ? ` (${m.wins.draws} drawn)` : ''}; redaction PASS`);
      save();
    }
    m.status = 'done';
    m.winner = resultOf(m);
    save();
    say(`watch ${id}: done in ${((Date.now() - t0) / 1000).toFixed(0)} s -- ${m.winner === 'draw' ? 'a draw' : `drafter ${m.winner} wins`} ${m.wins.A}-${m.wins.B} -> ${rel(matchFile)}`);
    return 0;
  } catch (e) {
    fail('error', e instanceof Error ? e.message : String(e));
    throw e;
  } finally {
    process.removeListener('SIGTERM', onSignal);
    process.removeListener('SIGINT', onSignal);
  }
}

/** `tools/cubelab.sh watch <cube.md> ...`: the flags, then `watch`. */
export async function watchCommand(repo: string, cubeFile: string | undefined, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  if (!cubeFile) throw new Error('watch needs a cube file');
  if ((one('format') ?? 'grid') !== 'grid') throw new Error('watch drafts grid only: a grid is what a viewer can replay pick by pick');
  const num = (k: string, d: number, lo: number, hi: number): number => {
    const v = one(k);
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`--${k} wants a whole number ${lo}..${hi}, got "${v}"`);
    return n;
  };
  const seed = num('seed', 1 + Math.floor(Math.random() * 99_999), 1, VERIFY_SEED_MIN - 1);
  if (seed >= RESERVED_SEED_MIN) throw new Error('a reserved seed (seeds.ts)');
  const games = num('games', 3, 1, 7);
  if (games % 2 === 0) throw new Error(`--games is a best of an odd number (1, 3, 5, 7), got ${games}`);
  const aiDir = path.join(repo, 'forge-home', 'res', 'ai');
  const profiles = fs.existsSync(aiDir) ? fs.readdirSync(aiDir).filter((n) => n.endsWith('.ai')).map((n) => n.slice(0, -3)) : ['Default'];
  const players = { A: parsePlayer(one('player-a') ?? 'Default', profiles), B: parsePlayer(one('player-b') ?? 'Default', profiles) };
  const { drafters, option } = parseWatchDrafters(one('drafter-a') ?? 'lab', one('drafter-b') ?? 'lab');
  if (option?.kind === 'human-picks' && !fs.existsSync(option.file)) throw new Error(`--drafter-${option.seat.toLowerCase()}: no file ${option.file}`);
  const llmFlags = ['llm-max-usd', 'llm-max-calls', 'llm-fallback-rate'];
  if (option?.kind !== 'llm' && llmFlags.some((k) => f.has(k))) throw new Error(`${llmFlags.map((k) => `--${k}`).join(', ')} need an llm:<model> drafter`);
  const llmCaps = option?.kind === 'llm' ? llmCapsOf(one, WATCH_LLM_CAPS) : undefined;
  const slug = path.basename(cubeFile, '.md').replace(/[^A-Za-z0-9._-]/g, '-');
  const out = one('out') ?? path.join('var/spectate', `watch-${slug}-${seed}`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path.basename(path.resolve(out)))) throw new Error(`--out's folder name must be letters, digits, . _ - (got ${out})`);
  const env = engineEnv(repo);
  return watch(env, {
    cubeFile, seed, games, players, drafters, paceMs: num('pace', 600, 0, 60_000), out,
    ratingsFile: one('ratings') ?? defaultRatings(cubeFile), gameTimeoutSec: num('game-timeout', 300, 30, 3600),
    ...(llmCaps ? { llmCaps } : {}),
  }, say);
}

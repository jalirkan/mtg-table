// mtg-table — the cube lab: a seat that drafts grid lines by asking an LLM (D439).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `--drafter llm:<model>[:thinking=off|low|default]` makes one seat (`--drafter-seat`) choose its grid
// lines by asking Claude through the logged-in Claude Code CLI, the same wrapper the LLM seat plays
// with (tools/llm-seat/lib/model.mjs: every tool off, one turn, the system prompt by argv, thinking
// through coach-helper's two environment variables).  The other seat is the lab drafter, and both
// build with the lab builder and the cube's ratings, so a head-to-head isolates PICKING.
//
// ONE CALL A DECISION.  A grid draft gives each seat 18 decisions.  Each call is fresh (no session):
//   system  the rules of the grid and the reply format;
//   user    the cube's name and a theme summary from its own document (<= 600 characters), the grid
//           (each card: name, cost, type, P/T, oracle text cut at 200 characters), the lines it may
//           take with their cards, and its pool so far grouped by colour with mana value and type.
//           The opponent's pool only under `--llm-sees-opponent`: a grid's picks are public, so it
//           is no hidden information, but the default keeps the prompt small.  Nothing hidden is
//           in a grid draft at all: all nine cards are face up for both drafters.
// The reply is one JSON object, {"take": "row"|"col", "index": 0..2, "reason": "..."}; the parse is
// strict (the object alone, or the object in one ```json fence; no other key; index an integer; the
// line one the rules allow).  A reply that fails, or a call that fails, is retried ONCE with the
// fault named; a second failure takes the lab drafter's line for that decision and counts a
// FALLBACK.  Every count goes into the draft's `llm` record in drafts.jsonl: calls, retries,
// fallbacks, input / cache-read / cache-create / output tokens, the CLI's own cost figure, the
// model's milliseconds and the draft's wall time.
//
// DETERMINISM.  The Claude Code CLI has no temperature setting, so a model's answers are not a
// function of the seed.  What is: the deal, who opens, the other seat, the fallback (the lab
// drafter's own line), and the REPLAY -- each draft's decisions are written to <out>/llm/<seed>.json
// the moment the draft ends, and a resumed run replays that file instead of asking again, so a
// stopped run never pays twice and a folder's drafts are reproducible from it.
//
// THE SPEND CAP AND THE FALLBACK STOP (the #144 review).  A run holds ONE `LlmBudget` across all its
// drafts (every --llm-jobs lane draws on it): `--llm-max-calls` (model calls, retries included) and
// `--llm-max-usd` (dollars at list price: the CLI's own cost figure, summed; default $5) refuse the call
// that would pass them -- the dollar check projects the next call at the run's mean cost a call so
// far, so it stops BEFORE the call that would cross the cap, not after -- and `--llm-fallback-rate`
// (default 0.25) stops the run once more than that share of its decisions fell back, the share taken
// over at least FALLBACK_FLOOR decisions so that one early fault does not end it (a logged-out CLI
// fails every call: it stops after its third decision, six failed calls).  A stop is an `LlmStop`
// with the reason in words: the draft in flight is abandoned (finished drafts keep their replay
// files, so a resumed run never pays for them twice), every in-flight CLI call is killed, and the
// run ends with that message.  Without the stop a logged-out CLI turned a run into lab vs lab while
// it was still labelled `llm`.
//
// `llm:fake` is a model with no network and no spend (the first line the prompt lists): the tests,
// the job's pilot and the runner's dry run use it.

import fs from 'node:fs';
import path from 'node:path';

import type { Fact, LabCard } from './cards.ts';
import { aiChooser, gridDraftAsync, lineCards, lineName, type GridAsk } from './draft.ts';
import { draftOuts, type DraftOut, type LoadedCube } from './lab.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

export const LLM_MODELS = ['haiku', 'sonnet', 'opus', 'fake'] as const;
export type LlmModelName = (typeof LLM_MODELS)[number];
export const LLM_THINKING = ['off', 'low', 'default'] as const;
export type LlmThinking = (typeof LLM_THINKING)[number];
export interface LlmSpec { kind: 'llm'; model: LlmModelName; thinking: LlmThinking }

/** The prompt's shape, bumped by hand when the text below changes meaning (it is in run.json and every record). */
export const LLM_PROMPT_VERSION = 1;
export const SUMMARY_MAX = 600;
export const ORACLE_MAX = 200;
export const REASON_WORDS = 20;

/** `llm:<model>[:thinking=off|low|default]` -> the spec (null for anything else).  Thinking defaults to low, as the LLM seat's. */
export function parseLlmSpec(spec: string): LlmSpec | null {
  const m = /^llm:([a-z]+)(?::thinking=([a-z]+))?$/.exec(spec);
  if (!m) return null;
  const model = m[1] as LlmModelName;
  const thinking = (m[2] ?? 'low') as LlmThinking;
  if (!LLM_MODELS.includes(model) || !LLM_THINKING.includes(thinking)) return null;
  return { kind: 'llm', model, thinking };
}

// ------------------------------------------------------------ what the prompt says about a card

export interface CardText { cost: string; type: string; pt: string | null; oracle: string }

/** Forge's short cost (`1 {G} {U}`, `{W/U}`, `no cost`) as `{1}{G}{U}`; '' for none. */
export function costText(manaCost: string | undefined): string {
  if (!manaCost || /^(no cost|-1)$/i.test(manaCost.trim())) return '';   // Forge writes a land's cost as -1
  return manaCost.trim().split(/\s+/).map((t) => (t.startsWith('{') ? t : `{${t}}`)).join('');
}

/** Oracle text on one line (Forge's facts carry literal `\n`), cut at `max` characters on a word. */
export function oracleText(oracle: string | undefined, max = ORACLE_MAX): string {
  const one = String(oracle ?? '').replace(/\\n|\n/g, ' / ').replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

/** Each found card's text, by Forge's name (the LabCard's name). */
export function cardTexts(facts: readonly Fact[]): Map<string, CardText> {
  const out = new Map<string, CardText>();
  for (const f of facts) {
    if (!f.found || !f.name) continue;
    const pt = f.power != null && f.toughness != null ? `${f.power}/${f.toughness}` : null;
    out.set(f.name, { cost: costText(f.manaCost), type: String(f.type ?? '').replace(/ - /g, ' — '), pt, oracle: oracleText(f.oracle) });
  }
  return out;
}

const strip = (s: string): string => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/^\s*(\d+\.|[-•])\s+/gm, '').replace(/\s+/g, ' ').trim();

/**
 * A cube's own description in at most `max` characters: the sections that say what it is ("What it
 * is", "The themes and how they connect", "Design principles"), then its italic opening line, then
 * "Source and credit" (a cube with no design notes, as Evan's, has only those two), markdown dropped,
 * cut on a word.  Only the document's words.
 */
export function themeSummary(markdown: string, max = SUMMARY_MAX): string {
  const lines = markdown.split('\n');
  const sections = new Map<string, string[]>();
  let cur: string | null = null;
  let intro = '';
  for (const l of lines) {
    const h = /^##\s+(.*)$/.exec(l);
    if (h) { cur = (h[1] ?? '').trim(); sections.set(cur, []); continue; }
    if (cur === null) { if (!intro && /^\*[^*].*\*\s*$/.test(l.trim())) intro = l.trim(); continue; }
    sections.get(cur)?.push(l);
  }
  const parts: string[] = [];
  for (const name of ['What it is', 'The themes and how they connect', 'Design principles', '*intro*', 'Source and credit']) {
    if (name === '*intro*') { if (intro) parts.push(strip(intro)); continue; }
    const body = sections.get(name);
    if (!body) continue;
    const text = strip(body.filter((l) => !l.trim().startsWith('|')).join('\n'));
    if (text) parts.push(text);
    if (parts.join(' ').length >= max) break;
  }
  const all = parts.join(' ');
  if (all.length <= max) return all;
  const cut = all.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

// ------------------------------------------------------------ the prompt

export const LLM_SYSTEM = [
  'You are drafting a two-player Magic: The Gathering cube by GRID DRAFT against one opponent.',
  'The rules: nine cards are dealt face up in a 3 x 3 grid. The drafter who picks first on a grid takes one whole row or one whole column. The other drafter then takes one of the rows or columns that still hold cards (a line crossing the first one holds 2 cards, a parallel one 3). The rest of the grid is discarded. 18 grids are dealt; who picks first alternates grid by grid.',
  'After the draft you will play a best-of-three match with a 40-card deck (about 23 spells and 17 lands, two colours plus at most a small splash) built from your pool. Draft the pool that makes the strongest deck.',
  'REPLY FORMAT: only one JSON object and nothing else, exactly {"take": "row" or "col", "index": 0, 1 or 2, "reason": "at most 20 words"}. Rows and columns are numbered from 0. You may take only a line listed under LINES YOU MAY TAKE. A reply in any other shape cannot be read and is sent back once as invalid.',
].join('\n\n');

const COLOUR_NAME: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

/** A card's group in a pool listing: its colour, Multicolour, Colourless or Lands. */
export function groupOf(c: LabCard): string {
  if (c.land) return 'Lands';
  if (c.colors.length > 1) return 'Multicolour';
  if (c.colors.length === 0) return 'Colourless';
  return COLOUR_NAME[c.colors] ?? c.colors;
}

/** A pool as text: one line per group (WUBRG, Multicolour, Colourless, Lands), each card with its mana value and type. */
export function poolText(pool: readonly LabCard[], texts: ReadonlyMap<string, CardText>): string {
  if (pool.length === 0) return '  (empty: this is your first pick)';
  const order = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolour', 'Colourless', 'Lands'];
  const by = new Map<string, string[]>();
  for (const c of pool) {
    const g = groupOf(c);
    const type = texts.get(c.name)?.type || c.type;
    by.set(g, [...(by.get(g) ?? []), c.land ? `${c.name} (${type})` : `${c.name} (MV ${c.cmc}, ${type})`]);
  }
  return order.filter((g) => by.has(g)).map((g) => `  ${g} (${by.get(g)?.length}): ${by.get(g)?.join('; ')}`).join('\n');
}

function cardLine(c: LabCard, texts: ReadonlyMap<string, CardText>): string {
  const t = texts.get(c.name);
  const bits = [c.name];
  if (t?.cost) bits.push(t.cost);
  bits.push(t?.type || c.type);
  if (t?.pt) bits.push(t.pt);
  if (t?.oracle) bits.push(t.oracle);
  return bits.join(' — ');
}

/** The JSON answer for draft.ts's line number (rows 0-2, columns 3-5). */
export const answerOf = (line: number): { take: 'row' | 'col'; index: number } => (line < 3 ? { take: 'row', index: line } : { take: 'col', index: line - 3 });
export const lineOfAnswer = (take: 'row' | 'col', index: number): number => (take === 'row' ? index : 3 + index);
const answerName = (line: number): string => { const a = answerOf(line); return `${a.take} ${a.index}`; };

/** The lines a drafter may take now: not the first drafter's, and holding at least one card. */
export function legalLines(grid: readonly (LabCard | null)[], taken: number | null): number[] {
  const out: number[] = [];
  for (let l = 0; l < 6; l++) if (l !== taken && lineCards(grid as (LabCard | null)[], l).length > 0) out.push(l);
  return out;
}

export interface PromptIn {
  cube: string;
  summary: string;
  ask: GridAsk;
  texts: ReadonlyMap<string, CardText>;
  seesOpponent: boolean;
}

/** One decision's prompt: the system text (fixed) and the user text. */
export function buildPrompt(p: PromptIn): { system: string; user: string; legal: number[] } {
  const { ask } = p;
  const legal = legalLines(ask.grid, ask.taken);
  const L: string[] = [];
  L.push(`CUBE: ${p.cube}`);
  if (p.summary) L.push(`ABOUT THIS CUBE: ${p.summary}`);
  L.push('');
  L.push(ask.taken === null
    ? `GRID ${ask.at} of ${ask.of}. You pick FIRST on this grid: take one row or one column. The opponent then takes a row or column of what is left; the rest is discarded.`
    : `GRID ${ask.at} of ${ask.of}. The opponent picked first and took ${answerName(ask.taken)}. Take one row or column of what is left; the rest is discarded.`);
  L.push('The grid, as [row,col] from 0, every card face up:');
  for (let i = 0; i < 9; i++) {
    const c = ask.grid[i];
    L.push(`[${Math.floor(i / 3)},${i % 3}] ${c ? cardLine(c, p.texts) : '(taken by the opponent)'}`);
  }
  L.push('');
  L.push('LINES YOU MAY TAKE:');
  for (const l of legal) L.push(`${answerName(l)}: ${lineCards(ask.grid as (LabCard | null)[], l).map((c) => c.name).join(' | ')}`);
  L.push('');
  L.push(`YOUR POOL SO FAR (${ask.d.state.picks.length} cards):`);
  L.push(poolText(ask.d.state.picks, p.texts));
  if (p.seesOpponent) {
    L.push('');
    L.push(`THE OPPONENT'S POOL SO FAR (${ask.other.state.picks.length} cards; grid picks are public):`);
    L.push(poolText(ask.other.state.picks, p.texts));
  }
  L.push('');
  L.push('Reply with only the JSON object: {"take": "row" or "col", "index": 0, 1 or 2, "reason": "at most 20 words"}');
  return { system: LLM_SYSTEM, user: L.join('\n'), legal };
}

// ------------------------------------------------------------ the reply

export type ParsedReply = { ok: true; line: number; reason: string } | { ok: false; error: string };

/**
 * The strict parse: the reply is one JSON object (alone, or in a single ``` / ```json fence), with
 * `take` "row" or "col", `index` the integer 0, 1 or 2, `reason` a string (cut at 20 words; it may be
 * absent) and no other key, naming a line in `legal`.  Every rejection says what was wrong.
 */
export function parseReply(text: string, legal: readonly number[]): ParsedReply {
  let t = String(text ?? '').trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(t);
  if (fence) t = (fence[1] ?? '').trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return { ok: false, error: 'the reply was not a single JSON object (no text before or after it)' };
  let o: unknown;
  try { o = JSON.parse(t); } catch (e) { return { ok: false, error: `the JSON did not parse (${(e as Error).message})` }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, error: 'the reply was not a JSON object' };
  const r = o as Record<string, unknown>;
  const extra = Object.keys(r).filter((k) => k !== 'take' && k !== 'index' && k !== 'reason');
  if (extra.length) return { ok: false, error: `unexpected key(s): ${extra.join(', ')}` };
  if (r.take !== 'row' && r.take !== 'col') return { ok: false, error: '"take" must be "row" or "col"' };
  if (typeof r.index !== 'number' || !Number.isInteger(r.index) || r.index < 0 || r.index > 2) return { ok: false, error: '"index" must be the number 0, 1 or 2' };
  if (r.reason !== undefined && typeof r.reason !== 'string') return { ok: false, error: '"reason" must be a string' };
  const line = lineOfAnswer(r.take, r.index);
  if (!legal.includes(line)) return { ok: false, error: `${r.take} ${r.index} cannot be taken now (it is the opponent's line or empty); allowed: ${legal.map(answerName).join(', ')}` };
  const words = String(r.reason ?? '').trim().split(/\s+/).filter(Boolean);
  return { ok: true, line, reason: words.slice(0, REASON_WORDS).join(' ') };
}

// ------------------------------------------------------------ the models

export interface DraftModelUsage { input: number | null; cacheCreate: number | null; cacheRead: number | null; output: number | null }
export interface DraftModelReply { text: string; usage: DraftModelUsage | null; costUsd: number | null; ms: number; model?: string | null }
export interface DraftModel { name: string; call(a: { system: string; user: string; signal?: AbortSignal }): Promise<DraftModelReply> }

/**
 * The fake model: no network, no spend.  With a script it replies with the script's strings in order
 * (a string starting `!` throws that message instead, as a failed call); after it, or without one, it
 * takes the first line listed under LINES YOU MAY TAKE.
 */
export function fakeDraftModel(script: readonly string[] = []): DraftModel & { calls: number } {
  const queue = [...script];
  const m = {
    name: 'fake',
    calls: 0,
    async call({ user, signal }: { system: string; user: string; signal?: AbortSignal }): Promise<DraftModelReply> {
      if (signal?.aborted) throw signal.reason;
      m.calls++;
      const next = queue.shift();
      if (next !== undefined && next.startsWith('!')) throw new Error(next.slice(1));
      if (next !== undefined) return { text: next, usage: null, costUsd: null, ms: 0, model: 'fake' };
      const at = user.indexOf('\nLINES YOU MAY TAKE:\n');
      const first = at < 0 ? null : /^(row|col) (\d):/.exec(user.slice(at + 21));
      const take = first ? first[1] : 'row';
      const index = first ? Number(first[2]) : 0;
      return { text: JSON.stringify({ take, index, reason: 'fake model: the first line listed' }), usage: null, costUsd: null, ms: 0, model: 'fake' };
    },
  };
  return m;
}

/** The real model: the Claude Code CLI through the LLM seat's wrapper, one fresh call a decision. */
export async function claudeDraftModel(model: LlmModelName, thinking: LlmThinking, cwd: string, timeoutS = 180): Promise<DraftModel> {
  fs.mkdirSync(cwd, { recursive: true });
  const lib = await import('../llm-seat/lib/model.mjs');
  const m = lib.makeClaudeModel({ model, thinking, cwd, timeoutS });
  return {
    name: model,
    async call({ system, user, signal }) {
      const r = await m.call({ system, user, session: null, ...(signal ? { signal } : {}) });
      return { text: r.text, usage: r.usage, costUsd: r.costUsd, ms: r.ms, model: r.model };
    },
  };
}

// ------------------------------------------------------------ the spend cap and the fallback stop

export interface LlmCaps {
  /** Model calls the run may make, retries included; null = no cap. */
  maxCalls: number | null;
  /** Dollars at list price (the CLI's own cost figure, summed) the run may spend; null = no cap. */
  maxUsd: number | null;
  /** The run stops once more than this share of its decisions fell back (0..1; 1 = never). */
  maxFallbackRate: number;
}

/** `run`'s default dollar cap: a 100-draft Sonnet arm (about $30, D439) needs `--llm-max-usd` said out loud. */
export const DEFAULT_LLM_MAX_USD = 5;
export const DEFAULT_FALLBACK_RATE = 0.25;
/** The fallback share's denominator is at least this many decisions: 3 fallbacks in the first 8 stop a run, 1 does not. */
export const FALLBACK_FLOOR = 8;
/** `--llm-jobs` at most: each lane is one `claude -p` at a time, and the cap's projection is per lane. */
export const MAX_LLM_JOBS = 4;

export type LlmStopReason = 'max-calls' | 'max-usd' | 'fallbacks' | 'aborted';

/** Why an LLM run stopped, in words; `reason` is the machine's half. */
export class LlmStop extends Error {
  readonly reason: LlmStopReason;
  constructor(reason: LlmStopReason, message: string) {
    super(message);
    this.name = 'LlmStop';
    this.reason = reason;
  }
}

/** What a run's model calls cost, over every draft it asked (an abandoned one included). */
export interface LlmSpend {
  calls: number;
  /** Calls that failed (the CLI exited, timed out or said is_error). */
  callErrors: number;
  decisions: number;
  retries: number;
  fallbacks: number;
  tokensIn: number;
  cacheRead: number;
  cacheCreate: number;
  tokensOut: number;
  /** The CLI's cost figure, summed: dollars at list price. */
  usd: number;
  /** How many calls reported a cost (the projection's denominator). */
  costCalls: number;
}

const usd = (x: number): string => `$${x.toFixed(x < 1 ? 4 : 2)}`;

/**
 * The caps from `--llm-max-calls N`, `--llm-max-usd X` (or `none`) and `--llm-fallback-rate R` (`one`
 * reads a flag's value), over `d`'s defaults.  Throws a sentence naming the flag on a bad value.
 */
export function llmCapsOf(one: (k: string) => string | undefined, d: LlmCaps = { maxCalls: null, maxUsd: DEFAULT_LLM_MAX_USD, maxFallbackRate: DEFAULT_FALLBACK_RATE }): LlmCaps {
  const caps = { ...d };
  const calls = one('llm-max-calls');
  if (calls !== undefined) {
    const n = Number(calls);
    if (!Number.isInteger(n) || n < 1 || n > 100_000) throw new Error(`--llm-max-calls is a whole number of model calls, 1..100000, got "${calls}"`);
    caps.maxCalls = n;
  }
  const dollars = one('llm-max-usd');
  if (dollars !== undefined) {
    const n = Number(dollars);
    if (dollars === 'none') caps.maxUsd = null;
    else if (!Number.isFinite(n) || n <= 0 || n > 10_000) throw new Error(`--llm-max-usd is dollars at list price above 0 (or none), got "${dollars}"`);
    else caps.maxUsd = n;
  }
  const rate = one('llm-fallback-rate');
  if (rate !== undefined) {
    const n = Number(rate);
    if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`--llm-fallback-rate is a share 0..1 (1 = never stop), got "${rate}"`);
    caps.maxFallbackRate = n;
  }
  return caps;
}

/**
 * One run's spend, shared by every draft and lane.  `beforeCall` refuses a call past a cap,
 * `afterCall` counts it, `afterDecision` applies the fallback stop; each refusal is an `LlmStop`,
 * remembered (every later call refuses with the same one) and signalled on `signal`, which kills
 * the in-flight CLI calls.  `onChange` sees every count move (the watch writes it into match.json).
 */
export class LlmBudget {
  readonly caps: LlmCaps;
  readonly spent: LlmSpend = { calls: 0, callErrors: 0, decisions: 0, retries: 0, fallbacks: 0, tokensIn: 0, cacheRead: 0, cacheCreate: 0, tokensOut: 0, usd: 0, costCalls: 0 };
  stopped: LlmStop | null = null;
  private inFlight = 0;
  private readonly ac = new AbortController();
  private readonly onChange: ((b: LlmBudget) => void) | null;

  constructor(caps: LlmCaps, onChange: ((b: LlmBudget) => void) | null = null) {
    if (caps.maxCalls !== null && (!Number.isInteger(caps.maxCalls) || caps.maxCalls < 1)) throw new Error(`the call cap is a whole number of calls >= 1, got ${caps.maxCalls}`);
    if (caps.maxUsd !== null && (!Number.isFinite(caps.maxUsd) || caps.maxUsd <= 0)) throw new Error(`the dollar cap is a number above 0, got ${caps.maxUsd}`);
    if (!Number.isFinite(caps.maxFallbackRate) || caps.maxFallbackRate < 0 || caps.maxFallbackRate > 1) throw new Error(`the fallback rate is 0..1, got ${caps.maxFallbackRate}`);
    this.caps = caps;
    this.onChange = onChange;
  }

  get signal(): AbortSignal { return this.ac.signal; }

  /** Stop the run: remembered, signalled, thrown. */
  stop(e: LlmStop): never {
    if (!this.stopped) {
      this.stopped = e;
      this.ac.abort(e);
      this.onChange?.(this);
    }
    throw this.stopped;
  }

  /** Before a model call: refuse it when it would pass a cap. */
  beforeCall(): void {
    if (this.stopped) throw this.stopped;
    const s = this.spent;
    const { maxCalls, maxUsd } = this.caps;
    if (maxCalls !== null && s.calls + this.inFlight >= maxCalls) {
      this.stop(new LlmStop('max-calls', `the call cap: ${s.calls + this.inFlight} model call(s) made of at most ${maxCalls} (${this.summary()})`));
    }
    if (maxUsd !== null) {
      const per = s.costCalls > 0 ? s.usd / s.costCalls : 0;
      if (s.usd >= maxUsd || s.usd + per * (this.inFlight + 1) > maxUsd) {
        this.stop(new LlmStop('max-usd', `the spend cap: ${usd(s.usd)} spent of at most ${usd(maxUsd)} at list price, and the next call (about ${usd(per)} each) would pass it (${this.summary()})`));
      }
    }
    this.inFlight++;
  }

  /** After a model call: its reply (null = the call failed). */
  afterCall(r: DraftModelReply | null): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const s = this.spent;
    s.calls++;
    if (!r) s.callErrors++;
    else {
      if (r.usage) {
        s.tokensIn += r.usage.input ?? 0;
        s.cacheRead += r.usage.cacheRead ?? 0;
        s.cacheCreate += r.usage.cacheCreate ?? 0;
        s.tokensOut += r.usage.output ?? 0;
      }
      if (r.costUsd != null) { s.usd += r.costUsd; s.costCalls++; }
    }
    this.onChange?.(this);
  }

  /** After a decision: how it was made; stops the run when too many fell back. */
  afterDecision(by: LlmDecision['by']): void {
    const s = this.spent;
    s.decisions++;
    if (by === 'retry') s.retries++;
    if (by === 'fallback') s.fallbacks++;
    this.onChange?.(this);
    const rate = this.caps.maxFallbackRate;
    if (rate < 1 && s.fallbacks > rate * Math.max(s.decisions, FALLBACK_FLOOR)) {
      this.stop(new LlmStop('fallbacks', `the fallback stop: ${s.fallbacks} of ${s.decisions} decision(s) fell back to the lab drafter's line (more than ${Math.round(rate * 100)}%`
        + `${s.decisions < FALLBACK_FLOOR ? ` of at least ${FALLBACK_FLOOR}` : ''}); ${s.callErrors} of ${s.calls} call(s) failed -- is the Claude Code CLI logged in? (${this.summary()})`));
    }
  }

  /** The counts in one line. */
  summary(): string {
    const s = this.spent;
    return `${s.calls} call(s), ${s.callErrors} failed, ${s.decisions} decision(s), ${s.fallbacks} fallback(s), `
      + `${s.tokensIn + s.cacheRead + s.cacheCreate} input + ${s.tokensOut} output tokens, ${usd(s.usd)} at list price`;
  }

  /** The record a run or a watch writes (spend.json, match.json's `cost`). */
  record(): { caps: LlmCaps; spent: LlmSpend; stopped: LlmStopReason | null; why: string | null } {
    return { caps: { ...this.caps }, spent: { ...this.spent }, stopped: this.stopped?.reason ?? null, why: this.stopped?.message ?? null };
  }
}

// ------------------------------------------------------------ one draft

export interface LlmDecision {
  /** The grid (1-based). */
  at: number;
  /** The line taken, as draft.ts names it ("row 2", "col 1"). */
  line: string;
  /** model: the first reply; retry: the second; fallback: the lab drafter's line after two failures. */
  by: 'model' | 'retry' | 'fallback';
  reason: string;
  /** What was wrong with each failed attempt. */
  errors?: string[];
  /** Characters of the user prompt (the system prompt is fixed). */
  promptChars: number;
}

export interface LlmDraftStats {
  seat: 'A' | 'B';
  model: LlmModelName;
  thinking: LlmThinking;
  seesOpponent: boolean;
  promptVersion: number;
  /** The model the CLI says answered (e.g. claude-haiku-...), from the first call that named one. */
  resolved: string | null;
  decisions: number;
  calls: number;
  retries: number;
  fallbacks: number;
  /** Failed calls (the CLI exited, timed out or said is_error), included in `retries` / `fallbacks`. */
  callErrors: number;
  tokensIn: number;
  cacheRead: number;
  cacheCreate: number;
  tokensOut: number;
  /** The CLI's own cost figure, summed (null when no call reported one, as the fake model). */
  costUsd: number | null;
  /** Milliseconds inside model calls, and the whole draft's wall time. */
  modelMs: number;
  wallMs: number;
  /** True when the decisions came from <out>/llm/<seed>.json (a resumed run); the counts are the original's. */
  replayed: boolean;
  picks: LlmDecision[];
}

export interface LlmDrafterOptions {
  lc: LoadedCube;
  seat: 'A' | 'B';
  spec: LlmSpec;
  /** The model, made on first use (a run that replays every draft never starts the CLI). */
  model: () => Promise<DraftModel>;
  texts: ReadonlyMap<string, CardText>;
  summary: string;
  seesOpponent: boolean;
  w: Weights;
  /** <out>/llm: one <seed>.json per finished draft, read back on resume; absent = no cache (tests). */
  cacheDir?: string | null;
  say?: (s: string) => void;
  /** The run's caps and counts, shared by every draft (absent = no cap: tests). */
  budget?: LlmBudget | null;
  /** Aborted when the run stops for another reason (another lane's draft failed, run.ts mapLimit). */
  signal?: AbortSignal | null;
}

interface CacheFile { v: 1; seed: number; seat: 'A' | 'B'; model: string; thinking: string; seesOpponent: boolean; promptVersion: number; lines: string[]; stats: LlmDraftStats }

const LINE_BY_NAME = new Map(Array.from({ length: 6 }, (_, l) => [lineName(l), l]));

/**
 * One grid draft where seat `seat` asks the model for its lines and the other seat is the lab drafter.
 * The deal, who opens, both builders and the lab seat's choices are a plain run's for the seed
 * (lab.ts `runDraft`): with a model that never answers, the draft IS the plain draft (every LLM-seat
 * decision falls back to the lab drafter's own line).
 */
export async function runLlmDraft(o: LlmDrafterOptions, seed: number): Promise<DraftOut> {
  const t0 = Date.now();
  const base = aiChooser(o.w, o.lc.pairs);
  const cacheFile = o.cacheDir ? path.join(o.cacheDir, `${seed}.json`) : null;
  let replay: CacheFile | null = null;
  if (cacheFile && fs.existsSync(cacheFile)) {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as CacheFile;
    const same = c.seed === seed && c.seat === o.seat && c.model === o.spec.model && c.thinking === o.spec.thinking && c.seesOpponent === o.seesOpponent && c.promptVersion === LLM_PROMPT_VERSION;
    if (!same) throw new Error(`${cacheFile} was written by another LLM drafter (${c.model}/${c.thinking}, seat ${c.seat}); use a new --out`);
    replay = c;
  }
  const stats: LlmDraftStats = {
    seat: o.seat, model: o.spec.model, thinking: o.spec.thinking, seesOpponent: o.seesOpponent, promptVersion: LLM_PROMPT_VERSION, resolved: null,
    decisions: 0, calls: 0, retries: 0, fallbacks: 0, callErrors: 0, tokensIn: 0, cacheRead: 0, cacheCreate: 0, tokensOut: 0, costUsd: null,
    modelMs: 0, wallMs: 0, replayed: false, picks: [],
  };
  const lines: string[] = [];
  let k = 0;
  let model: DraftModel | null = null;
  const signals = [o.budget?.signal, o.signal].filter((x): x is AbortSignal => !!x);
  const signal = signals.length === 0 ? undefined : signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  /** The reason the run stopped, if it did: the budget's own, else whatever aborted it. */
  const halted = (): unknown => o.budget?.stopped ?? (signal?.aborted ? (signal.reason ?? new LlmStop('aborted', 'the run stopped')) : null);
  const ask = async (system: string, user: string, errors: string[]): Promise<string | null> => {
    const h = halted();
    if (h) throw h;
    model ??= await o.model();
    o.budget?.beforeCall();
    stats.calls++;
    let r: DraftModelReply;
    try {
      r = await model.call({ system, user, ...(signal ? { signal } : {}) });
    } catch (e) {
      o.budget?.afterCall(null);
      const stop = halted();
      if (stop) throw stop;
      stats.callErrors++;
      errors.push(`the call failed: ${(e as Error).message.slice(0, 200)}`);
      return null;
    }
    o.budget?.afterCall(r);
    stats.modelMs += r.ms;
    if (r.usage) {
      stats.tokensIn += r.usage.input ?? 0;
      stats.cacheRead += r.usage.cacheRead ?? 0;
      stats.cacheCreate += r.usage.cacheCreate ?? 0;
      stats.tokensOut += r.usage.output ?? 0;
    }
    if (r.costUsd != null) stats.costUsd = (stats.costUsd ?? 0) + r.costUsd;
    if (!stats.resolved && r.model) stats.resolved = r.model;
    return r.text;
  };
  const choose = async (q: GridAsk): Promise<number> => {
    if (q.d.seat !== o.seat) return base.gridLine(q.d, q.grid, q.taken);
    if (replay) {
      const name = replay.lines[k++];
      const l = name === undefined ? undefined : LINE_BY_NAME.get(name);
      if (l === undefined || !legalLines(q.grid, q.taken).includes(l)) throw new Error(`${cacheFile}: decision ${k} (${name}) does not replay on grid ${q.at}; the lab changed under it -- use a new --out`);
      return l;
    }
    stats.decisions++;
    const p = buildPrompt({ cube: o.lc.cube.title, summary: o.summary, ask: q, texts: o.texts, seesOpponent: o.seesOpponent });
    const errors: string[] = [];
    let line: number | null = null;
    let reason = '';
    let by: LlmDecision['by'] = 'model';
    for (let attempt = 0; attempt < 2 && line === null; attempt++) {
      if (attempt === 1) stats.retries++;
      const user = attempt === 0 ? p.user : `${p.user}\n\nYOUR LAST REPLY COULD NOT BE USED: ${errors.at(-1) ?? 'no reply'}. Reply again with only the JSON object.`;
      const text = await ask(p.system, user, errors);
      if (text === null) continue;
      const r = parseReply(text, p.legal);
      if (r.ok) { line = r.line; reason = r.reason; by = attempt === 0 ? 'model' : 'retry'; } else errors.push(r.error);
    }
    if (line === null) {
      line = base.gridLine(q.d, q.grid, q.taken);
      by = 'fallback';
      reason = 'the lab drafter\'s line, after two failed replies';
      stats.fallbacks++;
    }
    lines.push(lineName(line));
    stats.picks.push({ at: q.at, line: lineName(line), by, reason, ...(errors.length ? { errors } : {}), promptChars: p.user.length });
    o.budget?.afterDecision(by);
    return line;
  };
  const r = rng(seed, 'draft:grid');
  const aOpens = seed % 2 === 0;
  const d = await gridDraftAsync(o.lc.cards, r, choose, o.w, aOpens);
  const t1 = Date.now();
  let out: LlmDraftStats;
  if (replay) {
    out = { ...replay.stats, replayed: true };
  } else {
    stats.wallMs = t1 - t0;
    out = stats;
    if (cacheFile) {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      const c: CacheFile = { v: 1, seed, seat: o.seat, model: o.spec.model, thinking: o.spec.thinking, seesOpponent: o.seesOpponent, promptVersion: LLM_PROMPT_VERSION, lines, stats };
      fs.writeFileSync(`${cacheFile}.tmp`, `${JSON.stringify(c)}\n`);
      fs.renameSync(`${cacheFile}.tmp`, cacheFile);
    }
    o.say?.(`llm drafter: seed ${seed}: ${stats.decisions} decisions, ${stats.calls} calls, ${stats.retries} retries, ${stats.fallbacks} fallbacks, `
      + `${stats.tokensIn + stats.cacheRead + stats.cacheCreate} input tokens (${stats.cacheRead} cache read, ${stats.cacheCreate} cache write), ${stats.tokensOut} output, `
      + `${(stats.wallMs / 1000).toFixed(1)} s${stats.costUsd != null ? `, CLI cost $${stats.costUsd.toFixed(4)}` : ''}`);
  }
  const outs = draftOuts(o.lc, d, o.w);
  return { seed, format: 'grid', dealt: d.dealt.length, aOpens, drafters: outs, ms: { draft: t1 - t0, build: Date.now() - t1 }, llm: out };
}

/** Sum of several drafts' stats (the run's closing line, and the job's cost estimate). */
export function sumStats(all: readonly LlmDraftStats[]): { drafts: number; decisions: number; calls: number; retries: number; fallbacks: number; tokensIn: number; cacheRead: number; cacheCreate: number; tokensOut: number; costUsd: number | null; wallMs: number } {
  const s = { drafts: 0, decisions: 0, calls: 0, retries: 0, fallbacks: 0, tokensIn: 0, cacheRead: 0, cacheCreate: 0, tokensOut: 0, costUsd: null as number | null, wallMs: 0 };
  for (const x of all) {
    s.drafts++;
    s.decisions += x.decisions; s.calls += x.calls; s.retries += x.retries; s.fallbacks += x.fallbacks;
    s.tokensIn += x.tokensIn; s.cacheRead += x.cacheRead; s.cacheCreate += x.cacheCreate; s.tokensOut += x.tokensOut; s.wallMs += x.wallMs;
    if (x.costUsd != null) s.costUsd = (s.costUsd ?? 0) + x.costUsd;
  }
  return s;
}

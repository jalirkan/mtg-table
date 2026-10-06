// mtg-table — the AI ladder: AI kinds, their parameters, and the ai-bench seat
// config each player becomes.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A player in tools/ai-ladder/players.json is `{name, kind, params}`.  A KIND is
// one row of `KINDS` below: its parameters (each numeric or an enum, which is
// what `tune` can vary), and `cfg()`, which turns the params into the seat
// config string tools/ai-bench/AiBench.java parses (`<Profile>[+sim|+hybrid]
// [+outlets|+shadow][+search:k=v,...]`).  The ladder never plays a game itself:
// every game is an ai-bench game (D309), so a kind is only as real as the
// bench's parser.
//
// `available()` says whether this checkout can play the kind.  A kind the table
// does not know, or one whose engine side has not merged (the search before
// c/search-ai, the evaluator before c/evaluator), is reported UNAVAILABLE with a
// reason and skipped by every scheduler — never a crash (D318).
//
// Plugging a new AI in is one row here: its params, its cfg() mapping onto the
// bench's seat syntax, and an available() probe for the files it needs.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ParamValue = string | number;
export type Params = Record<string, ParamValue>;

export interface ParamSpec {
  /** int and enum can be tuned; text (a model hash, say) only named. */
  type: 'int' | 'enum' | 'text';
  /** int: inclusive bounds. */
  min?: number;
  max?: number;
  /** enum: the allowed values. */
  values?: string[];
  default: ParamValue;
  doc: string;
  /**
   * A parameter added after players had played (D350): left out of the resolved
   * params -- so out of the config hash and the seat config -- while it is at
   * its default, so an old player's identity does not change.
   */
  omitAtDefault?: boolean;
}

export interface Kind {
  doc: string;
  params: Record<string, ParamSpec>;
  /** The ai-bench seat config for these (validated, defaults filled) params. */
  cfg(p: Params): string;
  /** null when this checkout can play the kind; else why not. */
  available(repo: string): string | null;
}

const PROFILES = ['Default', 'Cautious', 'Reckless', 'Experimental'];

const profile: ParamSpec = { type: 'enum', values: PROFILES, default: 'Default', doc: "Forge's .ai profile (res/ai/)" };
const outlets: ParamSpec = { type: 'enum', values: ['off', 'on', 'shadow'], default: 'off', doc: "D310's sacrifice-outlet policy: off, on, or shadow (counts only)" };

const outletSuffix = (o: ParamValue): string => (o === 'on' ? '+outlets' : o === 'shadow' ? '+shadow' : '');

/** The bench source this checkout compiles: a kind that needs a bench option is available when the parser names it. */
function benchKnows(repo: string, token: string): boolean {
  try {
    return readFileSync(join(repo, 'tools/ai-bench/AiBench.java'), 'utf8').includes(token);
  } catch {
    return false;
  }
}

/** The search's knobs (D312's SearchConfig) by ladder name -> bench key. */
const SEARCH_KEYS: Record<string, string> = {
  budgetMs: 'ms', cands: 'cands', turns: 'turns', rounds: 'rounds', margin: 'margin', maxRounds: 'maxrounds', what: 'what', seed: 'seed',
};

export const KINDS: Record<string, Kind> = {
  forge: {
    doc: "Stock Forge AI: an .ai profile, optionally Forge's own simulation (AIOption). The anchors are this kind.",
    params: {
      profile,
      sim: { type: 'enum', values: ['none', 'full', 'hybrid'], default: 'none', doc: "Forge's AIOption simulation (D311: it ends cube games; keep none)" },
    },
    cfg: (p) => `${p.profile}${p.sim === 'full' ? '+sim' : p.sim === 'hybrid' ? '+hybrid' : ''}`,
    available: () => null,
  },
  policy: {
    doc: "D309's PolicyControllerAi in front of a Forge profile, with D310's outlet policy.",
    params: { profile, outlets: { ...outlets, default: 'on' } },
    cfg: (p) => `${p.profile}${outletSuffix(p.outlets as string)}`,
    available: () => null,
  },
  search: {
    doc: "D312's determinized rollout search inside PolicyControllerAi (branch c/search-ai).",
    params: {
      profile,
      outlets: { ...outlets, default: 'on' },
      budgetMs: { type: 'int', min: 50, max: 60000, default: 1500, doc: 'wall-clock budget per searched decision (ms)' },
      cands: { type: 'int', min: 2, max: 32, default: 6, doc: "most candidates searched, Forge's own and pass included" },
      turns: { type: 'int', min: 0, max: 4, default: 0, doc: 'rollout horizon: 0 = end of this turn, 1 = end of the next' },
      rounds: { type: 'int', min: 1, max: 64, default: 2, doc: 'determinizations each candidate must finish before overruling Forge' },
      margin: { type: 'int', min: 0, max: 1000, default: 20, doc: "leaf points an alternative must beat Forge's own answer by" },
      maxRounds: { type: 'int', min: 1, max: 256, default: 12, doc: 'stop after this many complete rounds' },
      what: { type: 'enum', values: ['p', 'a', 'b', 'pa', 'pb', 'ab', 'pab'], default: 'pab', doc: 'decisions searched: priority, attacks, blocks' },
      seed: { type: 'int', min: 0, max: 2147483647, default: 0, doc: "the determinizations' seed; 0 = the clock" },
      // D350–D351 (the engine review's week 1), each off by default and out of the hash while off.
      aturns: { type: 'int', min: -1, max: 4, default: -1, omitAtDefault: true, doc: 'the horizon for ATTACK decisions only (-1 = turns); 1 lets an attack see the crack-back' },
      override: { type: 'enum', values: ['margin', 'lcb'], default: 'margin', omitAtDefault: true, doc: "margin: best mean beats Forge's by margin; lcb: the paired difference's lower bound (mean - z*se, >= 3 rounds) clears margin" },
      z: { type: 'enum', values: ['1', '1.645', '2'], default: '1', omitAtDefault: true, doc: "the lcb rule's multiplier" },
      untapped: { type: 'int', min: 0, max: 1000, default: 1, omitAtDefault: true, doc: "leaf points an untapped creature is worth over a tapped one (1 = Forge's CreatureEvaluator)" },
      oracle: { type: 'enum', values: ['off', 'on'], default: 'off', omitAtDefault: true, doc: 'TEST ONLY: rollouts keep the real hidden cards (an upper bound on inference); never live, never promoted' },
      // D388–D390 (the engine review's week-3 search upgrades), each off by default and out of the hash while off.
      anytime: { type: 'enum', values: ['off', 'on'], default: 'off', omitAtDefault: true, doc: 'D388: keep partial rounds, prune to the budget, race, decide on whatever paired evidence exists (fall back only with none)' },
      rank: { type: 'enum', values: ['order', 'prior'], default: 'order', omitAtDefault: true, doc: "D389: order = the first `cands` in enumeration order; prior = generate `gen`, apply each once, keep the best `cands` by the leaf after it" },
      gen: { type: 'int', min: 2, max: 64, default: 24, omitAtDefault: true, doc: 'D389: candidates generated before the prior keeps `cands` (rank=prior only; at least cands)' },
      rollout: { type: 'enum', values: ['default', 'outlets', 'both'], default: 'default', omitAtDefault: true, doc: "D390: the rollouts' policy: plain Forge, D310's outlet policy for the searching seat, or for both seats" },
    },
    // FIXED-ROLLOUT benchmark mode needs no search change (D312's loop stops at
    // maxrounds): rounds = maxRounds = N, budgetMs at its 60000 ceiling, a fixed
    // seed -- every searched decision does exactly N rounds on any machine, so a
    // benchmark measures the search, not the CPU (D318; search-v1-fixed3).
    cfg: (p) => {
      const kv = Object.entries(SEARCH_KEYS).map(([k, b]) => `${b}=${p[k]}`);
      // D350–D351's switches, only when set (omitAtDefault): the bench's SearchConfig keys.
      if (p.aturns !== undefined) kv.push(`aturns=${p.aturns}`);
      if (p.override !== undefined) kv.push(`override=${p.override}`, `z=${p.z ?? '1'}`);
      if (p.untapped !== undefined) kv.push(`untapped=${p.untapped}`);
      if (p.oracle === 'on') kv.push('oracle=1');
      if (p.anytime === 'on') kv.push('anytime=1');
      if (p.rank === 'prior') kv.push('rank=prior', `gen=${p.gen ?? Math.max(24, Number(p.cands))}`);
      if (p.rollout !== undefined) kv.push(`rollout=${p.rollout}`);
      return `${p.profile}${outletSuffix(p.outlets as string)}+search:${kv.join(',')}`;
    },
    available: (repo) => {
      if (!benchKnows(repo, '+search')) return 'the search AI has not merged (ai-bench has no +search seat option; branch c/search-ai, D312)';
      return null;
    },
  },
};

// The search with the learned evaluator at its leaves (D316's model through
// D354's one search flag, `leaf=eval:<model.json>`).  `model` is the first 12
// hex of the model file's sha256, and the file is var/ml/models/eval-<model>.json
// (tools/ml/gate_sprt.py puts it there and registers the player): the name and
// the config hash then pin the exact model, and a file whose content does not
// match its name makes the player unavailable instead of rating another model.
export const EVAL_MODEL_DIR = 'var/ml/models';
export const evalModelPath = (hash: ParamValue): string => `${EVAL_MODEL_DIR}/eval-${hash}.json`;

KINDS['search-eval'] = {
  doc: "D312's search scoring the leaves of unfinished rollouts with D316's learned evaluator (D354): `model` is the 12-hex sha256 prefix of var/ml/models/eval-<model>.json.",
  params: { ...KINDS.search!.params, model: { type: 'text', default: '', doc: "the evaluator model's content hash (12 hex of its sha256)" } },
  cfg: (p) => {
    const { model, ...search } = p;
    if (!/^[0-9a-f]{12}$/.test(String(model))) throw new Error(`search-eval.model must be 12 hex (the model file's sha256 prefix), got ${JSON.stringify(model)}`);
    const file = evalModelPath(model as string);
    let got: string;
    try {
      got = createHash('sha256').update(readFileSync(join(REPO_FOR_MODELS.root, file))).digest('hex').slice(0, 12);
    } catch {
      throw new Error(`search-eval: ${file} is not here (tools/ml/gate_sprt.py register puts it there)`);
    }
    if (got !== model) throw new Error(`search-eval: ${file} hashes to ${got}, not ${model} -- the file changed; register the new model under its own name`);
    return `${KINDS.search!.cfg(search)},leaf=eval:${file}`;
  },
  available: (repo) => {
    REPO_FOR_MODELS.root = repo;
    const s = KINDS.search!.available(repo);
    if (s) return s;
    try {
      if (!readFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'utf8').includes('case "leaf"')) return 'the search has no leaf= flag in this checkout (D354)';
    } catch {
      return 'the search has no leaf= flag in this checkout (D354)';
    }
    return null;
  },
};

/** Where `search-eval` reads its model files from: the repo `available()` was last asked about (the ladder's REPO). */
const REPO_FOR_MODELS = { root: '.' };

/** Fill defaults and check every param against the kind; throws on an unknown param or a bad value. */
export function resolveParams(kindName: string, params: Params): Params {
  const k = KINDS[kindName];
  if (!k) throw new Error(`unknown kind ${kindName}`);
  for (const key of Object.keys(params)) if (!k.params[key]) throw new Error(`kind ${kindName} has no parameter ${key} (has ${Object.keys(k.params).join(', ')})`);
  const out: Params = {};
  for (const [key, spec] of Object.entries(k.params)) {
    const v = params[key] ?? spec.default;
    checkValue(kindName, key, spec, v);
    if (spec.omitAtDefault && v === spec.default) continue;
    out[key] = v;
  }
  return out;
}

export function checkValue(kindName: string, key: string, spec: ParamSpec, v: ParamValue): void {
  if (spec.type === 'text') {
    if (typeof v !== 'string' || !/^[A-Za-z0-9._@-]*$/.test(v)) throw new Error(`${kindName}.${key} must be a plain token, got ${JSON.stringify(v)}`);
  } else if (spec.type === 'int') {
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error(`${kindName}.${key} must be an integer, got ${JSON.stringify(v)}`);
    if ((spec.min !== undefined && v < spec.min) || (spec.max !== undefined && v > spec.max)) throw new Error(`${kindName}.${key} must be ${spec.min}..${spec.max}, got ${v}`);
  } else if (!spec.values?.includes(String(v))) {
    throw new Error(`${kindName}.${key} must be one of ${spec.values?.join(', ')}, got ${JSON.stringify(v)}`);
  }
}

/** Parse a command-line value for a param (`budgetMs=1500` gives 1500, `profile=Reckless` gives 'Reckless'). */
export function parseValue(kindName: string, key: string, raw: string): ParamValue {
  const spec = KINDS[kindName]?.params[key];
  if (!spec) throw new Error(`kind ${kindName} has no parameter ${key}`);
  const v: ParamValue = spec.type === 'int' ? Number(raw) : raw;
  checkValue(kindName, key, spec, v);
  return v;
}

/** Why this repo cannot play `kind` (unknown kinds included), or null. */
export function unavailable(kindName: string, repo: string): string | null {
  const k = KINDS[kindName];
  if (!k) return `unknown kind "${kindName}" (this checkout knows ${Object.keys(KINDS).join(', ')})`;
  return k.available(repo);
}

/** A player that may only ever be benchmarked (D350's oracle): never rated by `run` unless named, never a league candidate. */
export function testOnly(resolved: Params): boolean {
  return resolved.oracle === 'on';
}

/*
 * mtg-table — arena/cues/validate.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The cue file's validator** (report 09 §7.4). Hand-written, no `ajv` —
 * consistent with decision D4 (hand-written types on both ends, no codegen) and
 * it adds zero dependencies.
 *
 * Two behaviours, and the difference between them is the whole design:
 *
 *   - **At runtime the arena never throws because a cue file is wrong.** An
 *     entry with an error is *dropped*, the ladder falls through to the next
 *     rung, and the worst case is the default animation. A renderer that
 *     refused to start over a typo in an art-direction file would be a renderer
 *     that could be stopped by an art-direction file.
 *   - **In the tests an error is a failure.** `web/test/cues-exhaustive.test.ts`
 *     asserts `errors.length === 0` over the committed `cues.json`, so the typo
 *     is caught where typos are cheap.
 *
 * **Unknown fields are errors** (E5). A validator that ignores what it does not
 * recognise is a validator that lets `"mss": 600` or `"presence": {"hoverZ": 1}`
 * sit in the file looking like they work; every object below therefore has a
 * closed key set, and the one escape hatch is deliberate and visible: **a key
 * beginning with `_` is a comment** and is skipped everywhere. That is what lets
 * `cues.json` carry its own `_note` beside each card — which is the only place
 * the *reason* for a cue can live, since the file is JSON and has no comments.
 */

import { isKnownEventKind, type CueData, type CueSpec, type CueTable, type Problem } from './types.ts';

export interface ValidationResult {
  /** The usable subset: every entry that survived. Never `null`. */
  data: CueData;
  errors: Problem[];
  warnings: Problem[];
}

export interface ValidateOptions {
  /** Every cue id the registry knows. An entry naming another is an error. */
  cueIds?: ReadonlySet<string>;
  /** Card names from `decks/pacho-shield.dck` — the typo net (§10.2). */
  deckNames?: ReadonlySet<string>;
  /** Archetype keys the deck can actually produce. */
  archetypeKeys?: ReadonlySet<string>;
}

/** §7.4 — `ms` outside this range is an error, not a clamp. */
export const MS_RANGE = { min: 0, max: 4000 } as const;

/**
 * The selector grammar of §7.3, and nothing beyond it:
 *
 * ```
 * selector  := kind [ ':' qualifier ]
 * qualifier := <zone> '>' <zone>        hand>battlefield, *>graveyard
 *            | 'alone' | 'lethal' | 'player' | 'card' | 'on' | 'off'
 *            | 'transform' | 'fizzled' | 'out' | 'in'
 *            | <COUNTER> [ '+' | '-' ] | '+' | '-'
 *            | '*'
 * ```
 */
const WORD_QUALIFIERS = new Set([
  'alone',
  'lethal',
  'player',
  'card',
  'on',
  'off',
  'transform',
  'fizzled',
  'out',
  'in',
  '*',
]);

const ZONE_WORD = /^[a-z_]+$|^\*$/;
const COUNTER_QUALIFIER = /^[A-Z][A-Z0-9]*[+-]?$/;

export function isValidSelector(selector: string): boolean {
  if (selector === 'presence') return true;
  const colon = selector.indexOf(':');
  const kind = colon < 0 ? selector : selector.slice(0, colon);
  if (!isKnownEventKind(kind)) return false;
  if (colon < 0) return true;
  const qualifier = selector.slice(colon + 1);
  if (qualifier === '') return false;
  if (WORD_QUALIFIERS.has(qualifier)) return true;
  if (qualifier === '+' || qualifier === '-') return true;
  if (COUNTER_QUALIFIER.test(qualifier)) return true;
  const arrow = qualifier.indexOf('>');
  if (arrow > 0) {
    const from = qualifier.slice(0, arrow);
    const to = qualifier.slice(arrow + 1);
    return ZONE_WORD.test(from) && ZONE_WORD.test(to);
  }
  return false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A key beginning with `_` is a comment: JSON has none, and this file needs them. */
export function isCommentKey(key: string): boolean {
  return key.startsWith('_');
}

/** Every key a cue entry may carry (§7.2). Anything else is an error. */
const SPEC_KEYS = new Set(['cue', 'ms', 'params', 'lane']);
/** Every key the file itself may carry. */
const FILE_KEYS = new Set(['version', 'cards', 'archetypes', 'defaults', 'presence']);
/** §5.1's `presence`, and these are all of its fields. */
const PRESENCE_KEYS = new Set(['hoverY', 'bobAmp', 'bobHz']);
/**
 * What a `presence` may ask for. A hover of ten card heights or a bob of half a
 * card is not art direction, it is a typo, and the cost of catching it here is
 * three numbers.
 */
const PRESENCE_RANGE: Readonly<Record<string, readonly [number, number]>> = {
  hoverY: [0, 3],
  bobAmp: [0, 0.2],
  bobHz: [0, 4],
};

/** Complain about any key an object should not have. */
function unknownKeys(
  where: string,
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  errors: Problem[],
  what: string,
): void {
  for (const key of Object.keys(value)) {
    if (isCommentKey(key) || allowed.has(key)) continue;
    errors.push({ where: `${where}.${key}`, message: `unknown ${what} field "${key}"` });
  }
}

/**
 * Validate a parsed cue file. Returns the usable subset plus every complaint;
 * it never throws and never returns `null` data.
 */
export function validateCues(raw: unknown, options: ValidateOptions = {}): ValidationResult {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const cards: Record<string, CueTable> = {};
  const archetypes: Record<string, CueTable> = {};
  let defaults: CueTable | undefined;
  const presence: Record<string, Record<string, number>> = {};

  if (!isObject(raw)) {
    errors.push({ where: '$', message: 'the cue file is not an object' });
    return { data: { version: 1, cards, archetypes }, errors, warnings };
  }

  unknownKeys('$', raw, FILE_KEYS, errors, 'top-level');

  const version = raw['version'];
  if (version !== 1) {
    errors.push({
      where: '$.version',
      message: `version must be 1, saw ${JSON.stringify(version)}`,
    });
  }

  const table = (
    where: string,
    value: unknown,
    into: Record<string, CueTable>,
    kindOfKey: 'card' | 'archetype',
  ): void => {
    if (value === undefined) return;
    if (!isObject(value)) {
      errors.push({ where, message: 'must be an object' });
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (isCommentKey(key)) continue;
      if (!isObject(entry)) {
        errors.push({ where: `${where}["${key}"]`, message: 'must be an object of selectors' });
        continue;
      }
      // §7.4 — a name that is not in the deck is a *warning*: it catches the
      // "Peggy Carter" vs "Peggy Carter, Secret Agent" typo report 03 proved is
      // a real hazard for this deck, without making a second deck impossible.
      if (kindOfKey === 'card' && options.deckNames !== undefined && !options.deckNames.has(key)) {
        warnings.push({
          where: `${where}["${key}"]`,
          message: 'no card of that name in decks/pacho-shield.dck',
        });
      }
      if (
        kindOfKey === 'archetype' &&
        options.archetypeKeys !== undefined &&
        !options.archetypeKeys.has(key)
      ) {
        warnings.push({
          where: `${where}["${key}"]`,
          message: 'no card in the deck produces this archetype key',
        });
      }
      const kept: Record<string, CueSpec> = {};
      for (const [selector, spec] of Object.entries(entry)) {
        if (isCommentKey(selector)) continue;
        if (selector === 'presence') {
          const problem = checkPresence(`${where}["${key}"].presence`, spec);
          if (problem !== null) errors.push(problem);
          else presence[key] = spec as Record<string, number>;
          continue;
        }
        const where2 = `${where}["${key}"]["${selector}"]`;
        if (!isValidSelector(selector)) {
          errors.push({ where: where2, message: 'not a selector §7.3 can emit' });
          continue;
        }
        const checked = checkSpec(where2, spec, options.cueIds, errors);
        if (checked !== null) kept[selector] = checked;
      }
      into[key] = kept;
    }
  };

  table('$.cards', raw['cards'], cards, 'card');
  table('$.archetypes', raw['archetypes'], archetypes, 'archetype');

  const rawDefaults = raw['defaults'];
  if (rawDefaults !== undefined) {
    if (!isObject(rawDefaults)) {
      errors.push({ where: '$.defaults', message: 'must be an object' });
    } else {
      const kept: Record<string, CueSpec> = {};
      for (const [selector, spec] of Object.entries(rawDefaults)) {
        if (isCommentKey(selector)) continue;
        const where = `$.defaults["${selector}"]`;
        if (!isValidSelector(selector)) {
          errors.push({ where, message: 'not a selector §7.3 can emit' });
          continue;
        }
        const checked = checkSpec(where, spec, options.cueIds, errors);
        if (checked !== null) kept[selector] = checked;
      }
      defaults = kept;
    }
  }

  const data: CueData = { version: 1, cards, archetypes };
  if (defaults !== undefined) data.defaults = defaults;
  if (Object.keys(presence).length > 0) data.presence = presence;
  return { data, errors, warnings };
}

function checkSpec(
  where: string,
  raw: unknown,
  cueIds: ReadonlySet<string> | undefined,
  errors: Problem[],
): CueSpec | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'a cue entry must be an object' });
    return null;
  }
  const before = errors.length;
  unknownKeys(where, raw, SPEC_KEYS, errors, 'cue-entry');
  if (errors.length > before) return null;
  const cue = raw['cue'];
  if (typeof cue !== 'string' || cue === '') {
    errors.push({ where: `${where}.cue`, message: 'missing cue id' });
    return null;
  }
  if (cueIds !== undefined && !cueIds.has(cue)) {
    errors.push({ where: `${where}.cue`, message: `"${cue}" is not in the cue registry` });
    return null;
  }
  const rawMs = raw['ms'];
  let ms = 0;
  if (rawMs === undefined) {
    // Fall back to whatever the registry default for this cue is — an entry
    // that only retints a cue should not have to restate its duration.
    ms = -1;
  } else if (typeof rawMs !== 'number' || !Number.isFinite(rawMs)) {
    errors.push({ where: `${where}.ms`, message: 'ms must be a number' });
    return null;
  } else if (rawMs < MS_RANGE.min || rawMs > MS_RANGE.max) {
    errors.push({
      where: `${where}.ms`,
      message: `ms must be within [${String(MS_RANGE.min)}, ${String(MS_RANGE.max)}]`,
    });
    return null;
  } else {
    ms = rawMs;
  }

  const params: Record<string, number | string | boolean> = {};
  const rawParams = raw['params'];
  if (rawParams !== undefined) {
    if (!isObject(rawParams)) {
      errors.push({ where: `${where}.params`, message: 'params must be an object' });
      return null;
    }
    for (const [key, value] of Object.entries(rawParams)) {
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        params[key] = value;
      } else {
        errors.push({
          where: `${where}.params.${key}`,
          message: 'a param must be a number, a string or a boolean',
        });
        return null;
      }
    }
  }

  const spec: CueSpec = { cue, ms: ms < 0 ? 0 : ms };
  if (Object.keys(params).length > 0) spec.params = params;
  const lane = raw['lane'];
  if (typeof lane === 'string') {
    if (lane === 'card' || lane === 'hud' || lane === 'camera' || lane === 'particle') {
      spec.lane = lane;
    } else {
      errors.push({ where: `${where}.lane`, message: `unknown lane "${lane}"` });
    }
  }
  return spec;
}

/**
 * §5.1's `presence`: a persistent layout rule, three named numbers and nothing
 * else.
 *
 * It is the one entry in the file that changes `layout()` rather than playing
 * over it, so a wrong key here is the one wrong key that would be invisible —
 * `hoverZ` would simply never hover anything and never say why.
 */
function checkPresence(where: string, raw: unknown): Problem | null {
  if (!isObject(raw)) return { where, message: 'presence must be an object' };
  for (const [key, value] of Object.entries(raw)) {
    if (isCommentKey(key)) continue;
    if (!PRESENCE_KEYS.has(key)) {
      return { where: `${where}.${key}`, message: `unknown presence field "${key}"` };
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { where: `${where}.${key}`, message: 'presence values must be numbers' };
    }
    const range = PRESENCE_RANGE[key];
    if (range !== undefined && (value < range[0] || value > range[1])) {
      return {
        where: `${where}.${key}`,
        message: `presence.${key} must be within [${String(range[0])}, ${String(range[1])}]`,
      };
    }
  }
  return null;
}

/**
 * Merge a validated cue file over the built-in tables. The file's entries win,
 * which is what makes `?cues=<url>` a real iteration loop (§7.1).
 */
export function mergeCueData(base: CueData, extra: CueData): CueData {
  const merged: CueData = {
    version: 1,
    cards: { ...base.cards, ...extra.cards },
    archetypes: { ...base.archetypes, ...extra.archetypes },
  };
  const defaults = { ...(base.defaults ?? {}), ...(extra.defaults ?? {}) };
  if (Object.keys(defaults).length > 0) merged.defaults = defaults;
  const presence = { ...(base.presence ?? {}), ...(extra.presence ?? {}) };
  if (Object.keys(presence).length > 0) merged.presence = presence;
  return merged;
}

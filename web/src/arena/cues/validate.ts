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

import { isGestureParam } from '../figures/duelists.ts';
import { isClipName } from '../figures/types.ts';
import { BURSTS, isBurst, isEffectShape } from './stage.ts';
import {
  STATION_KINDS,
  isKnownEventKind,
  type CueData,
  type CueSpec,
  type CueTable,
  type Problem,
  type Station,
} from './types.ts';

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
  if (selector === 'presence' || selector === 'station') return true;
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

/** T12's `station` (see `types.ts`'s {@link Station}), and these are all of its fields. */
const STATION_KEYS = new Set(['kind', 'colour', 'lift', 'scale']);
const STATION_RANGE: Readonly<Record<string, readonly [number, number]>> = {
  lift: [0, 3],
  scale: [0.2, 3],
};
const STATION_KIND_SET: ReadonlySet<string> = new Set<string>(STATION_KINDS);

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
/** A clip alias is a model's own key: `pistolDraw`, `radioCall`, `jet`. Never a sentence. */
const CLIP_ALIAS = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

/**
 * **Every param a cue file may set, with its type and its range** (Tier 2 slice
 * 3; the task's "every new param validated").
 *
 * Until slice 3 a param was only type-checked as *a primitive* — `{"scale":
 * "big"}` or `{"specK": 1}` passed, did nothing, and looked like it worked, which
 * is exactly the failure the unknown-FIELD rule above exists to prevent one level
 * up. So the set is CLOSED here too: a name that is not in this table is an
 * error, and so is a value outside its range.
 *
 * What is **not** in it is as deliberate: the event facts `cues/resolve.ts`
 * writes (`beamTo`, `strikeCard`, `toId`, `fromZone`, `amount`, `defenderId`,
 * `foe`, …). They are the ENGINE's, merged under the file's params at resolution,
 * and a cue file that set one would be a cue file inventing a fact — an aim the
 * wire never stated. `cues-exhaustive.test.ts` holds both halves.
 */
type ParamSpec =
  | { type: 'number'; min: number; max: number; int?: boolean }
  | { type: 'boolean' }
  | { type: 'colour' }
  | { type: 'clip' }
  | { type: 'hostClip' }
  | { type: 'shape' }
  | { type: 'gesture' }
  | { type: 'burst' };

export const PARAM_SPECS: Readonly<Record<string, ParamSpec>> = {
  // -- Tier 1 (report 09 §12.2) and Tier 2 slices 1–2 ------------------------
  colour: { type: 'colour' },
  scale: { type: 'number', min: 0.05, max: 3 },
  popScale: { type: 'number', min: 0.5, max: 3 },
  targetScale: { type: 'number', min: 0.05, max: 3 },
  width: { type: 'number', min: 0.002, max: 0.3 },
  radius: { type: 'number', min: 0, max: 6 },
  impact: { type: 'number', min: 0, max: 4 },
  shake: { type: 'number', min: 0, max: 1 },
  spotlight: { type: 'number', min: 0, max: 2 },
  spread: { type: 'number', min: 0, max: 4 },
  height: { type: 'number', min: 0, max: 8 },
  lift: { type: 'number', min: 0, max: 3 },
  depth: { type: 'number', min: 0, max: 3 },
  speed: { type: 'number', min: 0.1, max: 4 },
  glowFloor: { type: 'number', min: 0, max: 1 },
  mote: { type: 'number', min: 0.01, max: 0.5 },
  padding: { type: 'number', min: 0, max: 8 },
  tilt: { type: 'number', min: -1, max: 1 },
  camera: { type: 'boolean' },
  collapse: { type: 'boolean' },
  lunge: { type: 'boolean' },
  off: { type: 'boolean' },
  /** T3 — the per-card clip alias, resolved against the model (§3.6 rung 1). */
  clip: { type: 'clip' },
  /** T5 — the host's reaction to a snap: one of the ten clip names. */
  hostClip: { type: 'hostClip' },

  // -- Tier 2 slice 3 — T11's per-card beats -----------------------------------
  /** `attack.shrink`: how bright the speck he shrinks to is. */
  speck: { type: 'number', min: 0, max: 2 },
  /** `attack.lunge`: a muzzle flash at the figure's hands, twice, in the hold. */
  muzzle: { type: 'boolean' },
  /** `attack.jet`: the eye fires a laser at the player the band attacks. */
  laser: { type: 'boolean' },
  /** `attack.jet`: `false` is a flier on the jet's lunge — no robot's eye (default true). */
  eye: { type: 'boolean' },
  /** `fx.scaleBeam`: grow or shrink by what the struck card's P/T did (`strikeGrew`). */
  follow: { type: 'boolean' },
  /** `fx.shockwave`: a fissure along the table to what her trigger was aimed at. */
  fissure: { type: 'boolean' },
  /** `fx.agents`: a beam from him to each place an agent materialises. */
  beams: { type: 'boolean' },
  /** `fx.strike`: the reticle locks and holds — the cast, before the beam. */
  lock: { type: 'boolean' },
  /** `fx.hologram`: the vials at the figure's hands glow in turn. */
  vials: { type: 'boolean' },
  /** `fx.hologram`: this many cards fly from the figure to its controller's hand. */
  toHand: { type: 'number', min: 0, max: 4, int: true },
  /** `fx.swarm`: the cloud travels — to the target, or across the table. */
  sweep: { type: 'boolean' },
  /** `cast.rise`: the freeze-frame and the mission-control banner. */
  freeze: { type: 'boolean' },
  /** `attach.snap`: the HUD flourish that closes on the host, in this shape. */
  flourish: { type: 'shape' },
  /** `fx.badge`, `attack.aegis`: the billboard's shape. */
  shape: { type: 'shape' },

  // -- the second verification pass --------------------------------------------
  /** `attack.aegis`: the ring at her feet in its own colour (else the cue's colour). */
  rim: { type: 'colour' },
  /** `attack.aegis`: a second, wider ring in its own colour — her shield's red, white and blue. */
  rim2: { type: 'colour' },

  // -- Tier 2 slice 4 — T13's duelists -----------------------------------------
  /**
   * **What the seat's DUELIST does while this cue plays** (`figures/duelists.ts`'s
   * `GESTURE_PARAMS`): `cast`, `flinch`, `outcome` or `none`. The ladder writes it
   * as a fact for the four events a duelist answers — a `cast`, damage to a
   * player, a life LOSS and the `outcome` — and a row may override it like
   * `colour`: `none` keeps a card's own cue from raising its caster's hand. It
   * names a gesture, never a player: whose duelist moves is the event's
   * (`gesturePlayer`, a fact no file can set).
   */
  gesture: { type: 'gesture' },

  // -- the comic motion lane (report 15 §5; D130–D136 on branch `motion`) -------
  // Every one is read only while the queue's *comic FX* is on; with it off a row
  // that sets them plays the film as it was before the lane.
  /**
   * **The impact star, and the word lettered on it** (D130, D133): `none`, `star`
   * (unlettered), or one of the closed onomatopoeia — `pow`, `blam`, `krak`,
   * `zzak`, `whoosh`. Where it lands is the cue's (the body the event names).
   */
  burst: { type: 'burst' },
  /** The star's fill (its ink outline and lettering are fixed). Absent is POW yellow. */
  burstColour: { type: 'colour' },
  /** Speed lines on a dash: their density, 0 (none) to 2. Absent is 1. */
  streaks: { type: 'number', min: 0, max: 2 },
  /** The speed lines' colour. Absent is white. */
  streakColour: { type: 'colour' },
  /** `zone.dissolve`: the ink splat a creature leaves where it dies, 0 (none) to 2. Absent is 1. */
  splat: { type: 'number', min: 0, max: 2 },
  /** `damage.player`, `fx.badge`: the halftone dot burst, 0 (the plain flash) to 2. Absent is 1. */
  dots: { type: 'number', min: 0, max: 2 },
  /** An arrival: where the hologram-to-ink summon starts, 0 (all hologram) to 1 (no ramp). Absent is 0. */
  inkFrom: { type: 'number', min: 0, max: 1 },
};

/** A param value against its spec, or the complaint. */
function checkParam(key: string, value: unknown): string | null {
  const spec = PARAM_SPECS[key];
  if (spec === undefined) {
    return `unknown param "${key}" — a cue file sets art direction; event facts are the ladder's`;
  }
  switch (spec.type) {
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return `param ${key} must be a number`;
      if (value < spec.min || value > spec.max) {
        return `param ${key} must be within [${String(spec.min)}, ${String(spec.max)}]`;
      }
      if (spec.int === true && !Number.isInteger(value)) return `param ${key} must be a whole number`;
      return null;
    case 'boolean':
      return typeof value === 'boolean' ? null : `param ${key} must be true or false`;
    case 'colour':
      return typeof value === 'string' && HEX_COLOUR.test(value) ? null : `param ${key} must be #rrggbb`;
    case 'clip':
      return typeof value === 'string' && CLIP_ALIAS.test(value) ? null : `param ${key} must be a clip alias`;
    case 'hostClip':
      return typeof value === 'string' && isClipName(value) ? null : `param ${key} must be a clip name`;
    case 'shape':
      return typeof value === 'string' && isEffectShape(value) ? null : `param ${key} must be an effect shape`;
    case 'gesture':
      return isGestureParam(value) ? null : `param ${key} must be cast, flinch, outcome or none`;
    case 'burst':
      return isBurst(value) ? null : `param ${key} must be one of ${BURSTS.join(', ')}`;
    default:
      return `param ${key} has no type`;
  }
}

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
  const stations: Record<string, Station> = {};

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
        if (selector === 'station') {
          const checked = checkStation(spec);
          if (typeof checked === 'string') {
            errors.push({ where: `${where}["${key}"].station`, message: checked });
          } else if (kindOfKey !== 'card') {
            errors.push({ where: `${where}["${key}"].station`, message: 'a station is per card, never per archetype' });
          } else {
            stations[key] = checked;
          }
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
  if (Object.keys(stations).length > 0) data.stations = stations;
  return { data, errors, warnings };
}

/**
 * T12's `station`: a closed key set, a kind from the closed list, and two bounded
 * numbers. Returns the station or the complaint — a bad station is dropped whole,
 * because a half-understood one would draw the wrong thing somewhere.
 */
function checkStation(raw: unknown): Station | string {
  if (!isObject(raw)) return 'station must be an object';
  for (const key of Object.keys(raw)) {
    if (isCommentKey(key)) continue;
    if (!STATION_KEYS.has(key)) return `unknown station field "${key}"`;
  }
  const kind = raw['kind'];
  if (typeof kind !== 'string' || !STATION_KIND_SET.has(kind)) {
    return `station.kind must be one of ${STATION_KINDS.join(', ')}`;
  }
  const out: Station = { kind: kind as Station['kind'] };
  const colour = raw['colour'];
  if (colour !== undefined) {
    if (typeof colour !== 'string' || !HEX_COLOUR.test(colour)) return 'station.colour must be #rrggbb';
    out.colour = colour;
  }
  for (const key of ['lift', 'scale'] as const) {
    const value = raw[key];
    if (value === undefined) continue;
    const range = STATION_RANGE[key]!;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < range[0] || value > range[1]) {
      return `station.${key} must be within [${String(range[0])}, ${String(range[1])}]`;
    }
    out[key] = value;
  }
  return out;
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
      if (isCommentKey(key)) continue;
      if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
        errors.push({
          where: `${where}.params.${key}`,
          message: 'a param must be a number, a string or a boolean',
        });
        return null;
      }
      // Slice 3: the name and the range are checked too (`PARAM_SPECS`).
      const problem = checkParam(key, value);
      if (problem !== null) {
        errors.push({ where: `${where}.params.${key}`, message: problem });
        return null;
      }
      params[key] = value;
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
  const stations = { ...(base.stations ?? {}), ...(extra.stations ?? {}) };
  if (Object.keys(stations).length > 0) merged.stations = stations;
  return merged;
}

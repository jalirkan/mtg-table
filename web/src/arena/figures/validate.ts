/*
 * mtg-table — arena/figures/validate.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure file's validator**, mirroring `cues/validate.ts` exactly (report
 * 13 §9.2) — hand-written, no `ajv`, consistent with decision D4 and adding no
 * dependency.
 *
 * The two behaviours are the cue file's, for the same reasons:
 *
 *   - **At runtime the arena never throws because a data file is wrong.** An
 *     entry with an error is *dropped*, the ladder falls through to the next
 *     rung, and the worst case is a glow disc. A renderer that refused to start
 *     over a typo in an art-direction file would be a renderer that could be
 *     stopped by an art-direction file.
 *   - **In the tests an error is a failure.** `web/test/models-data.test.ts`
 *     asserts zero errors over the committed data.
 *
 * **Unknown fields are errors** and **a key beginning with `_` is a comment** —
 * the same two rules, so `figures.json` can carry the `_note` that says which
 * event or which fact each entry keys off (§12's mitigation).
 */

import {
  ATTACH_KINDS,
  DEFAULT_ATTACH_SPEC,
  DEFAULT_TILE_SPEC,
  isAttachKind,
  isClipName,
  isTileKind,
  TILE_KINDS,
  type AttachSpec,
  type ClipLibraryRecord,
  type FigureData,
  type FigureProblem,
  type FigureSpec,
  type ModelData,
  type ModelEntry,
  type ModelLibraryRecord,
  type TileSpec,
} from './types.ts';
import {
  BODY_STYLES,
  COSTUME_SLOTS,
  FORMATIONS,
  IDLE_STYLES,
  PROP_KINDS,
  SILHOUETTES,
  isPropKind,
  type PropKind,
} from './props.ts';
import { SUBTYPE_ORDER } from './resolve.ts';
import type { TraitData, TraitRow } from './traits.ts';

export interface FigureValidation<T> {
  /** The usable subset: every entry that survived. Never `null`. */
  data: T;
  errors: FigureProblem[];
  warnings: FigureProblem[];
}

const FILE_KEYS = new Set([
  'version',
  'cards',
  'archetypes',
  'default',
  'lands',
  'landDefault',
  'attachments',
  'attachDefault',
]);
const SPEC_KEYS = new Set(['model', 'tint', 'scale', 'clips', 'token']);
/** T4 — the terrain table's own entry shape (report 13 §5.2). */
const TILE_KEYS = new Set(['tile', 'tint', 'rim']);
/** T5 — the attachment table's own entry shape (report 13 §4.2). */
const ATTACH_KEYS = new Set(['kind', 'tint', 'hostScale', 'strength', 'metal']);
/** A `hostScale` outside this is a typo, not art direction. */
const HOST_SCALE_RANGE = [0.2, 2] as const;
/** `"Thriving Isle"`, `"subtype:island"` or `"*"` — the three rungs and nothing else. */
const LAND_KEY = /^(\*|subtype:[a-z]+|[^_].*)$/;
const MODELS_FILE_KEYS = new Set(['version', 'models', 'library', 'clipLibraries']);
/** T8 — the built file's identity (Tier 2 follow-up 9). */
const LIBRARY_KEYS = new Set(['path', 'bytes', 'sha256']);
/** T8 — a clip library's provenance: a model row's licence fields, and no mesh. */
const CLIP_LIBRARY_KEYS = new Set([
  'title',
  'source',
  'licence',
  'licenceUrl',
  'licenceBadge',
  'retrieved',
  'committable',
]);
/** `"ual:Hit_Chest"` — a library prefix, a colon, a clip name with no `|`. */
const RETARGETED = /^([a-z][a-z0-9-]*):([^|:]+)$/;
const MODEL_KEYS = new Set([
  'path',
  'node',
  'height',
  'width',
  'facing',
  'rootMotion',
  'bones',
  'triangles',
  'clips',
  'rig',
  'retargeted',
  'source',
  'licence',
  'licenceUrl',
  'licenceBadge',
  'retrieved',
  'committable',
]);

/** A hex colour, the only colour spelling the arena accepts anywhere. */
const HEX = /^#[0-9a-fA-F]{6}$/;
/** `creature/subtype:spy`, `creature/W`, `creature/*`, `*​/*`. */
const ARCHETYPE_KEY = /^[a-z*]+\/(subtype:[a-z]+|[A-Z*]+)$/;
/** A scale outside this is a typo, not art direction. */
const SCALE_RANGE = [0.2, 4] as const;
const FACINGS = new Set(['+z', '-z', '+x', '-x']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCommentKey(key: string): boolean {
  return key.startsWith('_');
}

function unknownKeys(
  where: string,
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  errors: FigureProblem[],
  what: string,
): void {
  for (const key of Object.keys(value)) {
    if (isCommentKey(key) || allowed.has(key)) continue;
    errors.push({ where: `${where}.${key}`, message: `unknown ${what} field "${key}"` });
  }
}

export interface ValidateFiguresOptions {
  /** Every model id `models.json` defines. A spec naming another is an error. */
  modelIds?: ReadonlySet<string>;
}

/** One `FigureSpec`, or `null` when it must be dropped. */
function checkSpec(
  where: string,
  raw: unknown,
  options: ValidateFiguresOptions,
  errors: FigureProblem[],
): FigureSpec | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return null;
  }
  unknownKeys(where, raw, SPEC_KEYS, errors, 'figure');
  let bad = false;

  const model = raw['model'] ?? null;
  if (model !== null && typeof model !== 'string') {
    errors.push({ where: `${where}.model`, message: 'must be a model id or null' });
    bad = true;
  } else if (
    typeof model === 'string' &&
    options.modelIds !== undefined &&
    !options.modelIds.has(model)
  ) {
    // **Dropped, not warned.** A spec naming a model the manifest does not
    // define would resolve to a figure the loader can never build, and the
    // ladder falling through to the disc is the declared fallback (§9.4).
    errors.push({ where: `${where}.model`, message: `no model "${model}" in models.json` });
    bad = true;
  }

  const tint = raw['tint'] ?? null;
  if (tint !== null && (typeof tint !== 'string' || !HEX.test(tint))) {
    errors.push({ where: `${where}.tint`, message: 'must be a #rrggbb colour or absent' });
    bad = true;
  }

  const scale = raw['scale'] ?? 1;
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale < SCALE_RANGE[0] || scale > SCALE_RANGE[1]) {
    errors.push({
      where: `${where}.scale`,
      message: `must be a number in [${String(SCALE_RANGE[0])}, ${String(SCALE_RANGE[1])}]`,
    });
    bad = true;
  }

  const clips: Record<string, string> = {};
  const rawClips = raw['clips'];
  if (rawClips !== undefined) {
    if (!isObject(rawClips)) {
      errors.push({ where: `${where}.clips`, message: 'must be an object' });
      bad = true;
    } else {
      for (const [name, alias] of Object.entries(rawClips)) {
        if (isCommentKey(name)) continue;
        if (!isClipName(name)) {
          errors.push({ where: `${where}.clips.${name}`, message: 'not one of CLIP_NAMES' });
          bad = true;
          continue;
        }
        if (typeof alias !== 'string' || alias === '') {
          errors.push({ where: `${where}.clips.${name}`, message: 'must be a non-empty clip alias' });
          bad = true;
          continue;
        }
        clips[name] = alias;
      }
    }
  }

  const token = raw['token'] ?? false;
  if (typeof token !== 'boolean') {
    errors.push({ where: `${where}.token`, message: 'must be a boolean' });
    bad = true;
  }

  if (bad) return null;
  return {
    model: model as string | null,
    tint: tint as string | null,
    scale: scale as number,
    clips,
    token: token as boolean,
  };
}

/**
 * One `TileSpec`, or `null` when it must be dropped (T4, report 13 §5.2).
 *
 * Same two behaviours as {@link checkSpec}: at runtime a bad entry falls through
 * the ladder to the neutral slab, and in the tests it is a failure.
 */
function checkTile(where: string, raw: unknown, errors: FigureProblem[]): TileSpec | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return null;
  }
  unknownKeys(where, raw, TILE_KEYS, errors, 'tile');
  let bad = false;

  const tile = raw['tile'];
  if (typeof tile !== 'string' || !isTileKind(tile)) {
    errors.push({
      where: `${where}.tile`,
      message: `must be one of ${TILE_KINDS.join(', ')}`,
    });
    bad = true;
  }
  const tint = raw['tint'] ?? null;
  if (tint !== null && (typeof tint !== 'string' || !HEX.test(tint))) {
    errors.push({ where: `${where}.tint`, message: 'must be a #rrggbb colour or absent' });
    bad = true;
  }
  const rim = raw['rim'] ?? null;
  if (rim !== null && (typeof rim !== 'string' || !HEX.test(rim))) {
    errors.push({ where: `${where}.rim`, message: 'must be a #rrggbb colour or absent' });
    bad = true;
  }
  if (bad) return null;
  return { tile: tile as TileSpec['tile'], tint: tint as string | null, rim: rim as string | null };
}

/**
 * One `AttachSpec`, or `null` when it must be dropped (T5, report 13 §4.2).
 *
 * Same two behaviours as {@link checkSpec}: at runtime a bad entry falls through
 * the ladder to the default halo — which is the whole point of §4.4 having one —
 * and in the tests it is a failure.
 */
function checkAttach(where: string, raw: unknown, errors: FigureProblem[]): AttachSpec | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return null;
  }
  unknownKeys(where, raw, ATTACH_KEYS, errors, 'attachment');
  let bad = false;

  const kind = raw['kind'];
  if (typeof kind !== 'string' || !isAttachKind(kind)) {
    errors.push({ where: `${where}.kind`, message: `must be one of ${ATTACH_KINDS.join(', ')}` });
    bad = true;
  }
  const tint = raw['tint'] ?? null;
  if (tint !== null && (typeof tint !== 'string' || !HEX.test(tint))) {
    errors.push({ where: `${where}.tint`, message: 'must be a #rrggbb colour or absent' });
    bad = true;
  }
  const hostScale = raw['hostScale'] ?? 1;
  if (
    typeof hostScale !== 'number' ||
    !Number.isFinite(hostScale) ||
    hostScale < HOST_SCALE_RANGE[0] ||
    hostScale > HOST_SCALE_RANGE[1]
  ) {
    errors.push({
      where: `${where}.hostScale`,
      message: `must be a number in [${String(HOST_SCALE_RANGE[0])}, ${String(HOST_SCALE_RANGE[1])}]`,
    });
    bad = true;
  }
  const strength = raw['strength'] ?? DEFAULT_ATTACH_SPEC.strength;
  if (typeof strength !== 'number' || !Number.isFinite(strength) || strength < 0 || strength > 1) {
    errors.push({ where: `${where}.strength`, message: 'must be a number in [0, 1]' });
    bad = true;
  }
  const metal = raw['metal'] ?? false;
  if (typeof metal !== 'boolean') {
    errors.push({ where: `${where}.metal`, message: 'must be a boolean' });
    bad = true;
  }
  if (bad) return null;
  return {
    kind: kind as AttachSpec['kind'],
    tint: tint as string | null,
    hostScale: hostScale as number,
    strength: strength as number,
    metal: metal as boolean,
  };
}

/** Validate a parsed `figures.json`. Never throws, never returns `null` data. */
export function validateFigures(
  raw: unknown,
  options: ValidateFiguresOptions = {},
): FigureValidation<FigureData> {
  const errors: FigureProblem[] = [];
  const warnings: FigureProblem[] = [];
  const cards: Record<string, FigureSpec> = {};
  const archetypes: Record<string, FigureSpec> = {};
  const lands: Record<string, TileSpec> = {};
  const attachments: Record<string, AttachSpec> = {};
  let fallback: FigureSpec = { model: null, tint: null, scale: 1, clips: {}, token: false };
  let landFallback: TileSpec = { ...DEFAULT_TILE_SPEC };
  let attachFallback: AttachSpec = { ...DEFAULT_ATTACH_SPEC };

  const done = (): FigureValidation<FigureData> => ({
    data: {
      version: 1,
      cards,
      archetypes,
      default: fallback,
      lands,
      landDefault: landFallback,
      attachments,
      attachDefault: attachFallback,
    },
    errors,
    warnings,
  });

  if (!isObject(raw)) {
    errors.push({ where: '$', message: 'the figure file is not an object' });
    return done();
  }
  unknownKeys('$', raw, FILE_KEYS, errors, 'top-level');

  const version = raw['version'];
  if (version !== 1) {
    errors.push({ where: '$.version', message: `version must be 1, saw ${JSON.stringify(version)}` });
  }

  const table = (where: string, value: unknown, into: Record<string, FigureSpec>, checkKey: boolean): void => {
    if (value === undefined) return;
    if (!isObject(value)) {
      errors.push({ where, message: 'must be an object' });
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (isCommentKey(key)) continue;
      if (checkKey && !ARCHETYPE_KEY.test(key)) {
        errors.push({ where: `${where}["${key}"]`, message: 'not an archetype key §3.7 can produce' });
        continue;
      }
      const spec = checkSpec(`${where}["${key}"]`, entry, options, errors);
      if (spec !== null) into[key] = spec;
    }
  };

  table('$.cards', raw['cards'], cards, false);
  table('$.archetypes', raw['archetypes'], archetypes, true);

  if (raw['default'] !== undefined) {
    const spec = checkSpec('$.default', raw['default'], options, errors);
    // A broken `default` falls back to the disc, which is what a default is for.
    if (spec !== null) fallback = spec;
  }

  // -- T4's terrain table (report 13 §5.2) ---------------------------------
  const rawLands = raw['lands'];
  if (rawLands !== undefined) {
    if (!isObject(rawLands)) {
      errors.push({ where: '$.lands', message: 'must be an object' });
    } else {
      for (const [key, entry] of Object.entries(rawLands)) {
        if (isCommentKey(key)) continue;
        if (!LAND_KEY.test(key)) {
          errors.push({ where: `$.lands["${key}"]`, message: 'not a land key §5.2 can produce' });
          continue;
        }
        const spec = checkTile(`$.lands["${key}"]`, entry, errors);
        if (spec !== null) lands[key] = spec;
      }
    }
  }
  if (raw['landDefault'] !== undefined) {
    const spec = checkTile('$.landDefault', raw['landDefault'], errors);
    if (spec !== null) landFallback = spec;
  }

  // -- T5's attachment table (report 13 §4.3) ------------------------------
  const rawAttach = raw['attachments'];
  if (rawAttach !== undefined) {
    if (!isObject(rawAttach)) {
      errors.push({ where: '$.attachments', message: 'must be an object' });
    } else {
      for (const [key, entry] of Object.entries(rawAttach)) {
        if (isCommentKey(key)) continue;
        // The same key shape the terrain table uses: a card name, a
        // `subtype:<word>` rung, or `*`.
        if (!LAND_KEY.test(key)) {
          errors.push({ where: `$.attachments["${key}"]`, message: 'not an attachment key §4.3 can produce' });
          continue;
        }
        const spec = checkAttach(`$.attachments["${key}"]`, entry, errors);
        if (spec !== null) attachments[key] = spec;
      }
    }
  }
  if (raw['attachDefault'] !== undefined) {
    const spec = checkAttach('$.attachDefault', raw['attachDefault'], errors);
    if (spec !== null) attachFallback = spec;
  }

  return done();
}

/** Validate a parsed `models.json`. Same contract. */
export function validateModels(raw: unknown): FigureValidation<ModelData> {
  const errors: FigureProblem[] = [];
  const warnings: FigureProblem[] = [];
  const models: Record<string, ModelEntry> = {};
  const clipLibraries: Record<string, ClipLibraryRecord> = {};
  let library: ModelLibraryRecord | null = null;
  const done = (): FigureValidation<ModelData> => ({
    data: { version: 1, models, library, clipLibraries },
    errors,
    warnings,
  });

  if (!isObject(raw)) {
    errors.push({ where: '$', message: 'the model manifest is not an object' });
    return done();
  }
  unknownKeys('$', raw, MODELS_FILE_KEYS, errors, 'top-level');

  const version = raw['version'];
  if (version !== 1) {
    errors.push({ where: '$.version', message: `version must be 1, saw ${JSON.stringify(version)}` });
  }

  // -- T8: the built file's identity (Tier 2 follow-up 9) --------------------
  const rawLibrary = raw['library'];
  if (rawLibrary !== undefined) {
    if (!isObject(rawLibrary)) {
      errors.push({ where: '$.library', message: 'must be an object' });
    } else {
      unknownKeys('$.library', rawLibrary, LIBRARY_KEYS, errors, 'library');
      const path = rawLibrary['path'];
      const bytes = rawLibrary['bytes'];
      const sha256 = rawLibrary['sha256'];
      let ok = true;
      if (typeof path !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(path) || path.startsWith('/') || path.includes('..')) {
        errors.push({ where: '$.library.path', message: 'must be a relative path under web/public/' });
        ok = false;
      }
      if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes <= 0) {
        errors.push({ where: '$.library.bytes', message: 'must be a positive integer' });
        ok = false;
      }
      if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
        errors.push({ where: '$.library.sha256', message: 'must be 64 lowercase hex digits' });
        ok = false;
      }
      if (ok) library = { path: path as string, bytes: bytes as number, sha256: sha256 as string };
    }
  }

  // -- T8: clip libraries (a retarget source contributes animation, no mesh) --
  const rawLibraries = raw['clipLibraries'];
  if (rawLibraries !== undefined) {
    if (!isObject(rawLibraries)) {
      errors.push({ where: '$.clipLibraries', message: 'must be an object' });
    } else {
      for (const [prefix, entry] of Object.entries(rawLibraries)) {
        if (isCommentKey(prefix)) continue;
        const where = `$.clipLibraries["${prefix}"]`;
        if (!isObject(entry)) {
          errors.push({ where, message: 'must be an object' });
          continue;
        }
        unknownKeys(where, entry, CLIP_LIBRARY_KEYS, errors, 'clip library');
        const fields: Record<string, string> = {};
        let ok = true;
        for (const key of ['title', 'source', 'licence', 'licenceUrl', 'licenceBadge', 'retrieved'] as const) {
          const v = entry[key];
          if (typeof v !== 'string' || v === '') {
            errors.push({ where: `${where}.${key}`, message: 'must be a non-empty string' });
            ok = false;
          } else fields[key] = v;
        }
        if (typeof entry['committable'] !== 'boolean') {
          errors.push({ where: `${where}.committable`, message: 'must be a boolean' });
          ok = false;
        }
        if (ok) {
          clipLibraries[prefix] = {
            title: fields['title']!,
            source: fields['source']!,
            licence: fields['licence']!,
            licenceUrl: fields['licenceUrl']!,
            licenceBadge: fields['licenceBadge']!,
            retrieved: fields['retrieved']!,
            committable: entry['committable'] as boolean,
          };
        }
      }
    }
  }

  const rawModels = raw['models'];
  if (rawModels === undefined) return done();
  if (!isObject(rawModels)) {
    errors.push({ where: '$.models', message: 'must be an object' });
    return done();
  }

  for (const [id, entry] of Object.entries(rawModels)) {
    if (isCommentKey(id)) continue;
    const where = `$.models["${id}"]`;
    if (!isObject(entry)) {
      errors.push({ where, message: 'must be an object' });
      continue;
    }
    unknownKeys(where, entry, MODEL_KEYS, errors, 'model');
    let bad = false;

    const str = (key: string, extra?: (v: string) => string | null): string => {
      const v = entry[key];
      if (typeof v !== 'string' || v === '') {
        errors.push({ where: `${where}.${key}`, message: 'must be a non-empty string' });
        bad = true;
        return '';
      }
      const problem = extra?.(v) ?? null;
      if (problem !== null) {
        errors.push({ where: `${where}.${key}`, message: problem });
        bad = true;
      }
      return v;
    };
    const num = (key: string, min: number, max: number): number => {
      const v = entry[key];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
        errors.push({
          where: `${where}.${key}`,
          message: `must be a number in [${String(min)}, ${String(max)}]`,
        });
        bad = true;
        return 0;
      }
      return v;
    };
    const bool = (key: string): boolean => {
      const v = entry[key];
      if (typeof v !== 'boolean') {
        errors.push({ where: `${where}.${key}`, message: 'must be a boolean' });
        bad = true;
        return false;
      }
      return v;
    };

    // **No leading slash, and no scheme.** The loader resolves every path
    // against the page's own origin under `web/public/`, and report 09 §2.1
    // rule 1 forbids the arena a network fetch: a model id whose path was an
    // absolute URL would be exactly that, spelled in a data file.
    const path = str('path', (v) =>
      /^[A-Za-z0-9._/-]+$/.test(v) && !v.startsWith('/') && !v.includes('..')
        ? null
        : 'must be a relative path under web/public/ with no scheme and no ".."',
    );
    const node = str('node');
    const height = num('height', 0.01, 100);
    // T7: measured by `tools/build-figures.mjs`, and the clamp in `figures/pose.ts`
    // is meaningless without it — so it is required rather than defaulted.
    const width = num('width', 0.01, 100);
    const facing = str('facing', (v) => (FACINGS.has(v) ? null : 'must be one of +z, -z, +x, -x'));
    const rootMotion = bool('rootMotion');
    const bones = num('bones', 0, 300);
    const triangles = num('triangles', 0, 200000);
    const source = str('source');
    const licence = str('licence');
    const licenceUrl = str('licenceUrl');
    const licenceBadge = str('licenceBadge');
    const retrieved = str('retrieved', (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'must be an ISO date (YYYY-MM-DD)',
    );
    const committable = bool('committable');

    // §3.4 — a clip that translates the root fights `figurePose ⊕ offset`,
    // which owns position. The manifest declares it and the loader enforces it.
    if (rootMotion) {
      errors.push({
        where: `${where}.rootMotion`,
        message: 'root motion is forbidden (§3.4): clips animate bones about a fixed root',
      });
      bad = true;
    }

    const clips: Record<string, string> = {};
    const rawClips = entry['clips'];
    if (!isObject(rawClips)) {
      errors.push({ where: `${where}.clips`, message: 'must be an object' });
      bad = true;
    } else {
      for (const [name, actual] of Object.entries(rawClips)) {
        if (isCommentKey(name)) continue;
        if (typeof actual !== 'string' || actual === '') {
          errors.push({ where: `${where}.clips.${name}`, message: 'must be a non-empty clip name' });
          bad = true;
          continue;
        }
        // **`Armature|Attack` is not a clip name here.** FBX2glTF prefixes the
        // armature (report 12 §2.4) and the loader normalises on the substring
        // after `|`; a manifest that carried the prefix would silently miss.
        if (actual.includes('|')) {
          errors.push({
            where: `${where}.clips.${name}`,
            message: 'clip names are stored normalised — strip the "Armature|" prefix',
          });
          bad = true;
          continue;
        }
        clips[name] = actual;
      }
      if (clips['idle'] === undefined) {
        warnings.push({ where: `${where}.clips`, message: 'no idle clip: the figure holds its bind pose' });
      }
    }

    // -- T8: the shared rig, and which clips were retargeted into it ----------
    const rawRig = entry['rig'] ?? null;
    if (rawRig !== null && (typeof rawRig !== 'string' || rawRig === '')) {
      errors.push({ where: `${where}.rig`, message: 'must be a rig id or absent' });
      bad = true;
    }
    const retargeted: Record<string, string> = {};
    const rawRetargeted = entry['retargeted'];
    if (rawRetargeted !== undefined) {
      if (!isObject(rawRetargeted)) {
        errors.push({ where: `${where}.retargeted`, message: 'must be an object' });
        bad = true;
      } else {
        for (const [key, value] of Object.entries(rawRetargeted)) {
          if (isCommentKey(key)) continue;
          const match = typeof value === 'string' ? RETARGETED.exec(value) : null;
          if (match === null) {
            errors.push({ where: `${where}.retargeted.${key}`, message: 'must be "<library>:<clip>"' });
            bad = true;
            continue;
          }
          if (clips[key] === undefined) {
            errors.push({ where: `${where}.retargeted.${key}`, message: 'names a clip this model does not carry' });
            bad = true;
            continue;
          }
          // **A retargeted clip's provenance must be written down too** — the
          // same rule as a model's. A library prefix nobody recorded is a clip
          // nobody can decide whether to ship.
          if (clipLibraries[match[1]!] === undefined) {
            errors.push({
              where: `${where}.retargeted.${key}`,
              message: `no clip library "${match[1]!}" in $.clipLibraries`,
            });
            bad = true;
            continue;
          }
          retargeted[key] = value as string;
        }
      }
    }

    if (bad) continue;
    models[id] = {
      path,
      node,
      height,
      width,
      facing: facing as ModelEntry['facing'],
      rootMotion,
      bones,
      triangles,
      clips,
      rig: rawRig as string | null,
      retargeted,
      source,
      licence,
      licenceUrl,
      licenceBadge,
      retrieved,
      committable,
    };
  }

  return done();
}

// ---------------------------------------------------------------------------
// Slice 3 — `traits.json`, the per-card identity table (figures/traits.ts)
// ---------------------------------------------------------------------------

const TRAIT_FILE_KEYS = new Set(['version', 'cards', 'archetypes', 'default']);
const TRAIT_KEYS = new Set([
  'scale',
  'hover',
  'idle',
  'tint',
  'accent',
  'shade',
  'turn',
  'turnedRatio',
  'props',
  'swarm',
  'formation',
  'silhouette',
  'shrink',
  // Slice 4: what the body wears, and which body.
  'costume',
  'body',
]);
/** A costume colour: `#rrggbb`, or the figure's own `tint`. */
const COSTUME_COLOUR = /^(#[0-9a-fA-F]{6}|tint)$/;
/** `subtype:insect` — and only a word `resolve.ts`'s `SUBTYPE_ORDER` can produce. */
const TRAIT_ARCHETYPE_KEY = /^subtype:([a-z]+)$/;
/** Each numeric trait's legal range: outside it is a typo, not art direction. */
const TRAIT_RANGES: Readonly<Record<string, readonly [number, number]>> = {
  scale: [0.2, 4],
  hover: [0, 2],
  shade: [0.3, 1.5],
  turn: [-180, 180],
  turnedRatio: [0.1, 4],
  swarm: [0, 8],
  shrink: [0.05, 1],
};
/** A swarm is a handful of copies: more is a crowd the budget was not sized for. */
const MAX_SWARM = 8;

/** One `TraitRow`, or `null` when it must be dropped. */
function checkTraitRow(where: string, raw: unknown, errors: FigureProblem[]): TraitRow | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return null;
  }
  unknownKeys(where, raw, TRAIT_KEYS, errors, 'trait');
  let bad = false;
  const row: Record<string, unknown> = {};

  for (const [key, [min, max]] of Object.entries(TRAIT_RANGES)) {
    const value = raw[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      errors.push({ where: `${where}.${key}`, message: `must be a number in [${String(min)}, ${String(max)}]` });
      bad = true;
      continue;
    }
    if (key === 'swarm' && (!Number.isInteger(value) || value > MAX_SWARM)) {
      errors.push({ where: `${where}.swarm`, message: `must be a whole number of copies, at most ${String(MAX_SWARM)}` });
      bad = true;
      continue;
    }
    row[key] = value;
  }
  for (const key of ['tint', 'accent'] as const) {
    const value = raw[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !HEX.test(value)) {
      errors.push({ where: `${where}.${key}`, message: 'must be a #rrggbb colour or absent' });
      bad = true;
      continue;
    }
    row[key] = value;
  }
  const idle = raw['idle'];
  if (idle !== undefined) {
    if (typeof idle !== 'string' || !(IDLE_STYLES as readonly string[]).includes(idle)) {
      errors.push({ where: `${where}.idle`, message: `must be one of ${IDLE_STYLES.join(', ')}` });
      bad = true;
    } else row['idle'] = idle;
  }
  const formation = raw['formation'];
  if (formation !== undefined) {
    if (typeof formation !== 'string' || !(FORMATIONS as readonly string[]).includes(formation)) {
      errors.push({ where: `${where}.formation`, message: `must be one of ${FORMATIONS.join(', ')}` });
      bad = true;
    } else row['formation'] = formation;
  }
  const silhouette = raw['silhouette'];
  if (silhouette !== undefined) {
    if (silhouette !== null && (typeof silhouette !== 'string' || !(SILHOUETTES as readonly string[]).includes(silhouette))) {
      errors.push({ where: `${where}.silhouette`, message: `must be one of ${SILHOUETTES.join(', ')} or null` });
      bad = true;
    } else row['silhouette'] = silhouette;
  }
  const props = raw['props'];
  if (props !== undefined) {
    if (!Array.isArray(props)) {
      errors.push({ where: `${where}.props`, message: 'must be an array of prop kinds' });
      bad = true;
    } else {
      const kinds: PropKind[] = [];
      for (const [i, kind] of props.entries()) {
        if (typeof kind !== 'string' || !isPropKind(kind)) {
          errors.push({
            where: `${where}.props[${String(i)}]`,
            message: `"${String(kind)}" is not one of ${PROP_KINDS.join(', ')}`,
          });
          bad = true;
          continue;
        }
        if (kinds.includes(kind)) {
          errors.push({ where: `${where}.props[${String(i)}]`, message: `"${kind}" is listed twice` });
          bad = true;
          continue;
        }
        kinds.push(kind);
      }
      row['props'] = kinds;
    }
  }
  // -- slice 4: the costume and the body ------------------------------------
  const body = raw['body'];
  if (body !== undefined) {
    if (typeof body !== 'string' || !(BODY_STYLES as readonly string[]).includes(body)) {
      errors.push({ where: `${where}.body`, message: `must be one of ${BODY_STYLES.join(', ')}` });
      bad = true;
    } else row['body'] = body;
  }
  const costume = raw['costume'];
  if (costume !== undefined) {
    if (!isObject(costume)) {
      errors.push({ where: `${where}.costume`, message: 'must be an object of costume slots' });
      bad = true;
    } else {
      const slots: Record<string, string> = {};
      for (const [slot, colour] of Object.entries(costume)) {
        if (isCommentKey(slot)) continue;
        if (!(COSTUME_SLOTS as readonly string[]).includes(slot)) {
          errors.push({ where: `${where}.costume.${slot}`, message: `not a costume slot — one of ${COSTUME_SLOTS.join(', ')}` });
          bad = true;
          continue;
        }
        if (typeof colour !== 'string' || !COSTUME_COLOUR.test(colour)) {
          errors.push({ where: `${where}.costume.${slot}`, message: 'must be a #rrggbb colour or "tint"' });
          bad = true;
          continue;
        }
        slots[slot] = colour;
      }
      row['costume'] = slots;
    }
  }
  // A turned figure needs its turned footprint, or the width clamp is a guess.
  if (row['turn'] !== undefined && row['turn'] !== 0 && row['turnedRatio'] === undefined) {
    errors.push({ where: `${where}.turnedRatio`, message: 'a turned figure must say its turned width/height ratio' });
    bad = true;
  }
  if (bad) return null;
  return row as TraitRow;
}

/**
 * Validate a parsed `traits.json`. Same contract as {@link validateFigures}: a
 * bad row is dropped and the ladder falls through; never throws, never `null`.
 */
export function validateTraits(raw: unknown): FigureValidation<TraitData> {
  const errors: FigureProblem[] = [];
  const warnings: FigureProblem[] = [];
  const cards: Record<string, TraitRow> = {};
  const archetypes: Record<string, TraitRow> = {};
  let fallback: TraitRow = {};
  const done = (): FigureValidation<TraitData> => ({
    data: { version: 1, cards, archetypes, default: fallback },
    errors,
    warnings,
  });

  if (!isObject(raw)) {
    errors.push({ where: '$', message: 'the trait file is not an object' });
    return done();
  }
  unknownKeys('$', raw, TRAIT_FILE_KEYS, errors, 'top-level');
  if (raw['version'] !== 1) {
    errors.push({ where: '$.version', message: `version must be 1, saw ${JSON.stringify(raw['version'])}` });
  }

  const rawCards = raw['cards'];
  if (rawCards !== undefined) {
    if (!isObject(rawCards)) errors.push({ where: '$.cards', message: 'must be an object' });
    else {
      for (const [name, entry] of Object.entries(rawCards)) {
        if (isCommentKey(name)) continue;
        const row = checkTraitRow(`$.cards["${name}"]`, entry, errors);
        if (row !== null) cards[name] = row;
      }
    }
  }
  const rawArchetypes = raw['archetypes'];
  if (rawArchetypes !== undefined) {
    if (!isObject(rawArchetypes)) errors.push({ where: '$.archetypes', message: 'must be an object' });
    else {
      for (const [key, entry] of Object.entries(rawArchetypes)) {
        if (isCommentKey(key)) continue;
        const match = TRAIT_ARCHETYPE_KEY.exec(key);
        if (match === null || !(SUBTYPE_ORDER as readonly string[]).includes(match[1]!)) {
          // A rung the ladder can never produce is a row nothing will ever read.
          errors.push({
            where: `$.archetypes["${key}"]`,
            message: `not a subtype rung — one of ${SUBTYPE_ORDER.map((s) => `subtype:${s}`).join(', ')}`,
          });
          continue;
        }
        const row = checkTraitRow(`$.archetypes["${key}"]`, entry, errors);
        if (row !== null) archetypes[key] = row;
      }
    }
  }
  if (raw['default'] !== undefined) {
    const row = checkTraitRow('$.default', raw['default'], errors);
    if (row !== null) fallback = row;
  }
  return done();
}

/*
 * mtg-table — workshop/tuning.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The tuning panel's data: overrides of `traits.json` rows and `cues.json`
 * params, held in THIS browser and never written to the repo.**
 *
 * An override is applied the only way the arena would ever see a change: the
 * committed file is copied, the card's row is replaced by the override, and the
 * copy goes through the arena's own validator (`validateTraits`, `validateCues`).
 * So a value the arena would refuse is refused here too — the row is dropped, the
 * ladder falls through, and the panel prints the validator's own complaint — and
 * the panel's "copy" buttons are disabled while that complaint names the card:
 * the clipboard only ever gets a row or an entry the validator has accepted.
 *
 * **The copies are the committed text with the edit folded in, nothing else.**
 * Both are built from the card's raw row or entry in the committed file, every key
 * in its original order and every comment key (`_note`, `_t11`, `_station`, …)
 * kept, and — for `cues.json` — `presence` and `station` kept too, because a paste
 * replaces the whole row or entry and those are the entry's hover and its station.
 * Only the edited values change: a trait row's overridden fields, and the `params`
 * of the overridden cue selectors. They are printed in the files' own style (one
 * key per line, each value on one line), so an unedited copy is the committed
 * text byte for byte and a paste is a one-line diff (`workshop.test.ts`).
 *
 * Storage is `localStorage` under {@link STORE_KEY}, every access inside `try`
 * (a private window or blocked site data throws): a per-viewer convenience, like
 * the arena's stored camera view, and the workshop renders the same with nothing
 * stored — which is the committed files.
 *
 * `[NO three]`, `[NO React]`. The two storage functions take the `Storage` as an
 * argument so `node --test` can hand them a fake.
 */

import type { CueData, Problem } from '../arena/cues/types.ts';
import type { FigureProblem } from '../arena/figures/types.ts';
import traitsJson from '../arena/figures/traits.json' with { type: 'json' };
import { type TraitData } from '../arena/figures/traits.ts';
import { validateTraits } from '../arena/figures/validate.ts';
import { cueDataOf } from './validated.ts';

export const STORE_KEY = 'mtg-table.workshop.overrides';

/** A card's trait row, as JSON values — what a `traits.json` `cards` entry holds. */
export type RawRow = Record<string, unknown>;

export interface Overrides {
  /** Card name → the whole row that replaces its `traits.json` row. */
  traits: Record<string, RawRow>;
  /** Card name → selector → the `params` that replace that entry's. */
  cues: Record<string, Record<string, RawRow>>;
}

export const NO_OVERRIDES: Overrides = Object.freeze({ traits: {}, cues: {} }) as Overrides;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse whatever is stored. Anything malformed is nothing — never a crash. */
export function parseOverrides(text: string | null): Overrides {
  if (text === null || text === '') return { traits: {}, cues: {} };
  try {
    const raw: unknown = JSON.parse(text);
    if (!isObject(raw)) return { traits: {}, cues: {} };
    const traits: Record<string, RawRow> = {};
    const cues: Record<string, Record<string, RawRow>> = {};
    if (isObject(raw['traits'])) {
      for (const [name, row] of Object.entries(raw['traits'])) if (isObject(row)) traits[name] = row;
    }
    if (isObject(raw['cues'])) {
      for (const [name, entry] of Object.entries(raw['cues'])) {
        if (!isObject(entry)) continue;
        const kept: Record<string, RawRow> = {};
        for (const [selector, params] of Object.entries(entry)) if (isObject(params)) kept[selector] = params;
        cues[name] = kept;
      }
    }
    return { traits, cues };
  } catch {
    return { traits: {}, cues: {} };
  }
}

/** The stored overrides, or none. `storage` is `window.localStorage` in the page. */
export function readOverrides(storage: Pick<Storage, 'getItem'> | null): Overrides {
  try {
    return parseOverrides(storage?.getItem(STORE_KEY) ?? null);
  } catch {
    return { traits: {}, cues: {} };
  }
}

/** Keep them for next time. A storage that throws keeps them for this page only. */
export function writeOverrides(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, overrides: Overrides): void {
  try {
    const empty = Object.keys(overrides.traits).length === 0 && Object.keys(overrides.cues).length === 0;
    if (empty) storage?.removeItem(STORE_KEY);
    else storage?.setItem(STORE_KEY, JSON.stringify(overrides));
  } catch {
    // Nothing to do: the override still applies to this page.
  }
}

/** A deep copy of plain JSON. */
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The committed `traits.json` row for a card, without its comment keys, or `{}`. */
export function committedRow(name: string): RawRow {
  const cards = (traitsJson as { cards?: Record<string, unknown> }).cards ?? {};
  const row = cards[name];
  if (!isObject(row)) return {};
  const out: RawRow = {};
  for (const [key, value] of Object.entries(row)) if (!key.startsWith('_')) out[key] = copy(value);
  return out;
}

/**
 * The trait table with every stored override applied, through the arena's own
 * validator. `errors` are the validator's, limited to the overridden rows — the
 * committed file's own health is `traits.test.ts`'s business.
 */
export function traitsWith(overrides: Overrides): { data: TraitData; errors: FigureProblem[] } {
  const names = Object.keys(overrides.traits);
  const raw = copy(traitsJson) as { cards?: Record<string, unknown> };
  raw.cards = { ...(raw.cards ?? {}) };
  for (const name of names) raw.cards[name] = overrides.traits[name];
  const { data, errors } = validateTraits(raw);
  const mine = errors.filter((problem) => names.some((name) => problem.where.startsWith(`$.cards["${name}"]`)));
  return { data, errors: mine };
}

/**
 * The cue data with every stored params override applied, through `validateCues`.
 * `cues` is the committed file's parsed JSON (`data.ts`'s `CUES_RAW`).
 */
export function cuesWith(overrides: Overrides, cues: unknown): { data: CueData; errors: Problem[] } {
  const names = Object.keys(overrides.cues);
  if (names.length === 0) return cueDataOf(cues);
  const raw = copy(cues) as { cards?: Record<string, Record<string, unknown>> };
  raw.cards = { ...(raw.cards ?? {}) };
  for (const name of names) {
    const entry = isObject(raw.cards[name]) ? { ...raw.cards[name] } : {};
    for (const [selector, params] of Object.entries(overrides.cues[name] ?? {})) {
      const spec = entry[selector];
      if (isObject(spec)) entry[selector] = { ...spec, params };
    }
    raw.cards[name] = entry;
  }
  const { data, errors } = cueDataOf(raw);
  const mine = errors.filter((problem) => names.some((name) => problem.where.startsWith(`$.cards["${name}"]`)));
  return { data, errors: mine };
}

/** A comment key (`_note`, `_t11`, …) — the files' own rule (`validate.ts`'s `isCommentKey`). */
function isComment(key: string): boolean {
  return key.startsWith('_');
}

/**
 * The keys of a card's `cues.json` entry that are cue SPECS — what the params
 * panel can tune: not a comment, not `presence` (the hover, a layout rule) and not
 * `station` (T12's console or cocoon, a pose).
 */
function isCueSpecKey(key: string): boolean {
  return !isComment(key) && key !== 'presence' && key !== 'station';
}

/**
 * **A card's committed `cues.json` entry exactly as the file has it** — every key
 * in its original order, comments, `presence` and `station` included — or `null`.
 */
export function rawCueEntry(name: string, cues: unknown): Record<string, unknown> | null {
  const cards = (cues as { cards?: Record<string, unknown> }).cards ?? {};
  const entry = cards[name];
  return isObject(entry) ? copy(entry) : null;
}

/**
 * The selectors of a card's committed cue entry the params panel lists —
 * selector → spec, in the file's order — or `{}`. **Not** the entry: it leaves out
 * the comments, `presence` and `station`, which is why the export is built from
 * {@link rawCueEntry} and never from this.
 */
export function cueSelectorsOf(name: string, cues: unknown): Record<string, RawRow> {
  const out: Record<string, RawRow> = {};
  for (const [selector, spec] of Object.entries(rawCueEntry(name, cues) ?? {})) {
    if (isCueSpecKey(selector) && isObject(spec)) out[selector] = spec;
  }
  return out;
}

/**
 * One value on one line, as `cues.json` and `traits.json` write theirs:
 * `{ "cue": "attack.aegis", "ms": 900, "params": { "colour": "#4f7fe8" } }`,
 * `["shield", "hat"]`. `JSON.stringify` for everything but the spacing.
 */
export function inlineJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inlineJson).join(', ')}]`;
  if (isObject(value)) {
    const fields = Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${inlineJson(v)}`);
    return fields.length === 0 ? '{}' : `{ ${fields.join(', ')} }`;
  }
  return JSON.stringify(value);
}

/**
 * A card's row or entry as the files print it inside their `cards` block: the
 * name at four spaces, one key per line at six, each value inline — ready to
 * replace the committed lines in place.
 */
function entryText(name: string, entry: Record<string, unknown>): string {
  const lines = Object.entries(entry).map(([key, value]) => `      ${JSON.stringify(key)}: ${inlineJson(value)}`);
  return lines.length === 0
    ? `    ${JSON.stringify(name)}: {}`
    : `    ${JSON.stringify(name)}: {\n${lines.join(',\n')}\n    }`;
}

/** The committed `traits.json` row of a card, exactly as the file has it — comments included — or `null`. */
function rawTraitRow(name: string): Record<string, unknown> | null {
  const cards = (traitsJson as { cards?: Record<string, unknown> }).cards ?? {};
  const row = cards[name];
  return isObject(row) ? copy(row) : null;
}

/**
 * **The row "copy as traits.json row" prints**: the committed row's keys in their
 * order with the override's values, its comments where they were, a field the
 * override dropped gone, and a field it added after the committed row's last data
 * key (before its trailing `_note`). With no committed row it is the override.
 */
export function traitsRowOf(name: string, row: RawRow): Record<string, unknown> {
  const raw = rawTraitRow(name);
  if (raw === null) return copy(row);
  const keys = Object.keys(raw);
  let lastData = -1;
  keys.forEach((key, i) => {
    if (!isComment(key)) lastData = i;
  });
  const added = Object.keys(row).filter((key) => !isComment(key) && !(key in raw));
  const out: Record<string, unknown> = {};
  const addNew = (): void => {
    for (const key of added) out[key] = copy(row[key]);
  };
  if (lastData < 0) addNew();
  keys.forEach((key, i) => {
    if (isComment(key)) out[key] = raw[key];
    else if (key in row) out[key] = copy(row[key]);
    if (i === lastData) addNew();
  });
  return out;
}

/**
 * **"Copy as traits.json row"**: `"<name>": { … }` in the file's own style, ready
 * to replace the committed row. Built by {@link traitsRowOf}: the committed row's
 * order, its `_note` kept — the paste replaces the whole row, and the note is the
 * row's reason.
 */
export function traitsRowText(name: string, row: RawRow): string {
  return entryText(name, traitsRowOf(name, row));
}

/**
 * **The entry "copy as cues.json entry" prints**: the card's raw committed entry —
 * every key in its original order, the comments, `presence` and `station`
 * included — with only the `params` of the overridden selectors replaced (added,
 * after `ms`, where the committed spec had none).
 */
export function cueEntryOf(name: string, params: Record<string, RawRow>, cues: unknown): Record<string, unknown> {
  const entry = rawCueEntry(name, cues) ?? {};
  for (const [selector, value] of Object.entries(params)) {
    const spec = entry[selector];
    if (isCueSpecKey(selector) && isObject(spec)) entry[selector] = { ...spec, params: copy(value) };
  }
  return entry;
}

/** **"Copy as cues.json entry"**: the card's whole entry (see {@link cueEntryOf}) in the file's own style. */
export function cueEntryText(name: string, params: Record<string, RawRow>, cues: unknown): string {
  return entryText(name, cueEntryOf(name, params, cues));
}

/** Set one override row (or drop it, with `null`), returning a new object. */
export function withTraitRow(overrides: Overrides, name: string, row: RawRow | null): Overrides {
  const traits = { ...overrides.traits };
  if (row === null) delete traits[name];
  else traits[name] = row;
  return { traits, cues: overrides.cues };
}

export function withCueParams(overrides: Overrides, name: string, selector: string, params: RawRow | null): Overrides {
  const cues = { ...overrides.cues };
  const entry = { ...(cues[name] ?? {}) };
  if (params === null) delete entry[selector];
  else entry[selector] = params;
  if (Object.keys(entry).length === 0) delete cues[name];
  else cues[name] = entry;
  return { traits: overrides.traits, cues };
}

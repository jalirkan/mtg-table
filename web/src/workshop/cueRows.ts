/*
 * mtg-table — workshop/cueRows.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **What a card does, read off the arena's own ladder** — the rows of the
 * workshop's action panel.
 *
 * For every transition a card can go through on the table (`synthetic.ts`'s
 * rehearsals), the synthetic batch is run through `cues/resolve.ts` exactly as a
 * game batch is — `selectorsFor`, the ladder, `cuesFor` — so each row says which
 * `cues.json` entry answered (the card's own, an archetype's, or the §6 default),
 * which cue id that is in the registry, its nominal length, and the clip it makes
 * the figure play (`CLIP_FOR`, the cue's `params.clip`, the card's alias in
 * `figures.json`, against the clips the model actually has). Nothing here is a
 * second table: a row is what the queue will do when the button is pressed.
 *
 * And the other direction: every selector the card's own `cues.json` entry keys
 * on is checked against the rows, so an entry no transition reaches is listed
 * rather than silently never seen.
 *
 * **And what the ladder's order hides.** §7.3 resolves rung first — the card's own
 * entry, then the archetypes, then the defaults — and a selector only within a
 * rung, so a card's bare `resolved` beats the defaults' more specific
 * `resolved:fizzled`: a fizzled Helicarrier Strike plays its full strike and a
 * `hit` on its target. Each line says when a rung below held a MORE specific
 * selector for the same event ({@link CueLine.outranks}); whether that is intended
 * is the cue file's call, and the workshop only makes it visible.
 *
 * `[NO three]`, `[NO React]`: `node --test` drives it.
 */

import { clipForCue } from '../arena/figures/clips.ts';
import { figureFor } from '../arena/figures/resolve.ts';
import type { FigureData, ModelData } from '../arena/figures/types.ts';
import { REGISTRY } from '../arena/cues/registry.ts';
import { cuesFor, resolve, selectorsFor, subjectOf } from '../arena/cues/resolve.ts';
import { soundOfParams } from '../arena/cues/sound.ts';
import type { CueData, CueParams } from '../arena/cues/types.ts';
import { isCommentKey } from '../arena/cues/validate.ts';
import { cardOf, type WorkshopEntry } from './catalog.ts';
import { DEFAULT_OPTIONS, IDS, rehearsalsFor, rehearse, type PedestalOptions, type RehearsalKind } from './synthetic.ts';

export interface CueLine {
  /** The event kind and the selector that matched: `attackers` · `attackers:alone`. */
  event: string;
  selector: string;
  /** Which rung answered: the card's own entry, an archetype's, the §6 default. */
  source: 'card' | 'archetype' | 'default' | 'none';
  cue: string;
  ms: number;
  /** In the registry? A cue file naming anything else is dropped by `validate.ts`. */
  known: boolean;
  /** The clip lane: `attack → pistolDraw`, `hit`, or `—` (no clip for this cue). */
  clip: string;
  /** D250 — the sound it plays, as the ladder decided it: `comms at 0 ×0.9`, or `—`. */
  sound: string;
  /** The data params (not the event facts the ladder merges in). */
  params: CueParams;
  /** Which card id it plays on — the subject, its host, or another card entirely. */
  on: 'subject' | 'host' | 'player' | 'other';
  /**
   * A MORE specific selector a lower rung has for this event, which the rung that
   * answered outranks — `{ selector: 'resolved:fizzled', source: 'default',
   * cue: 'resolved.fizzle' }` under a card's bare `resolved` — or `null`.
   */
  outranks: { selector: string; source: 'archetype' | 'default'; cue: string } | null;
}

export interface CueRow {
  kind: RehearsalKind;
  label: string;
  lines: CueLine[];
  fiction: string | null;
}

/** The clip a cue makes a figure play, resolved against the model — §3.6's ladder, as words. */
export function clipWords(
  cueId: string,
  params: CueParams,
  cardAliases: Readonly<Record<string, string>>,
  modelClips: ReadonlySet<string> | null,
): string {
  const generic = clipForCue(cueId);
  if (generic === null) return '—';
  const has = (key: string): boolean => modelClips === null || modelClips.has(key);
  const alias = typeof params['clip'] === 'string' && params['clip'] !== '' ? params['clip'] : null;
  if (alias !== null && has(alias)) return `${generic} → ${alias} (cue alias)`;
  const byCard = cardAliases[generic];
  if (byCard !== undefined && has(byCard)) return `${generic} → ${byCard} (card alias)`;
  if (has(generic)) return generic;
  return `${generic} (not in this model — the offset still plays)`;
}

/** D250 — the sound a planned cue carries (already gated by the ladder), as words. */
export function soundWords(params: CueParams): string {
  const sound = soundOfParams(params);
  if (sound === null) return '—';
  return `${sound.sound} at ${String(Math.round(sound.at * 100) / 100)} ×${String(Math.round(sound.gain * 100) / 100)}`;
}

/** The data half of a cue's params: what `cues.json` said, not what the event did. */
function dataParams(spec: { params?: CueParams }): CueParams {
  return spec.params ?? {};
}

/**
 * Every rehearsal of a card, and the cues each one resolves to — for the card on
 * your seat alone (the "both seats" copy resolves identically: it is the same card).
 */
export function cueRows(
  entry: WorkshopEntry,
  data: CueData,
  figures: FigureData,
  models: ModelData,
  options: PedestalOptions = DEFAULT_OPTIONS,
): CueRow[] {
  const single: PedestalOptions = { ...options, both: false };
  const card = cardOf(entry, IDS.subject, 0);
  const spec = figureFor(card, figures).spec;
  const model = spec.model === null ? null : (models.models[spec.model] ?? null);
  const modelClips = model === null ? new Set<string>() : new Set(Object.keys(model.clips));
  const rows: CueRow[] = [];
  for (const kind of rehearsalsFor(entry)) {
    const rehearsal = rehearse(entry, kind, single);
    const lines: CueLine[] = [];
    for (const event of rehearsal.events) {
      const selectors = selectorsFor(event, rehearsal.after);
      const subject = subjectOf(event, rehearsal.after);
      const found = resolve(selectors, event.kind, subject, data);
      const outranks = outranked(selectors, event.kind, subject, data, found);
      const cues = cuesFor(event, rehearsal.after, data, rehearsal.before.board);
      for (const cue of cues) {
        const target = cue.targets[0];
        lines.push({
          event: event.kind,
          selector: found.selector,
          source: found.source,
          cue: cue.id,
          ms: cue.ms,
          known: REGISTRY.has(cue.id),
          clip: clipWords(cue.id, cue.params, spec.clips, model === null ? null : modelClips),
          sound: soundWords(cue.params),
          params: dataParams(found.spec),
          on:
            target === undefined
              ? 'player'
              : target === IDS.subject
                ? 'subject'
                : target === IDS.host
                  ? 'host'
                  : 'other',
          outranks,
        });
      }
    }
    rows.push({ kind, label: rehearsal.label, lines, fiction: rehearsal.fiction });
  }
  return rows;
}

/**
 * What the ladder would have answered with the answering rung taken away, when
 * that is a more specific selector (earlier in `selectors`) — the thing the rung
 * order hid. `null` when nothing below is more specific, or the answer was
 * already the defaults.
 */
function outranked(
  selectors: string[],
  kind: string,
  subject: Parameters<typeof resolve>[2],
  data: CueData,
  found: ReturnType<typeof resolve>,
): CueLine['outranks'] {
  if (found.source !== 'card' && found.source !== 'archetype') return null;
  const name = (subject as { name?: unknown } | null)?.name;
  const below: CueData =
    found.source === 'card'
      ? { ...data, cards: Object.fromEntries(Object.entries(data.cards).filter(([card]) => card !== name)) }
      : { ...data, cards: {}, archetypes: {} };
  const next = resolve(selectors, kind, subject, below);
  if (next.source !== 'archetype' && next.source !== 'default') return null;
  const at = (selector: string): number => {
    const i = selectors.indexOf(selector);
    return i < 0 ? selectors.length : i;
  };
  return at(next.selector) < at(found.selector) ? { selector: next.selector, source: next.source, cue: next.spec.cue } : null;
}

/**
 * The card's own `cues.json` selectors that no rehearsal reached — listed so an
 * entry the workshop cannot stage is visible rather than silently never played.
 */
export function unreachedSelectors(entry: WorkshopEntry, rows: readonly CueRow[], data: CueData): string[] {
  const table = entry.name === '' ? undefined : data.cards[entry.name];
  if (table === undefined) return [];
  const reached = new Set<string>();
  for (const row of rows) for (const line of row.lines) if (line.source === 'card') reached.add(line.selector);
  return Object.keys(table).filter((selector) => !isCommentKey(selector) && !reached.has(selector));
}

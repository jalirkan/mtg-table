/*
 * mtg-table — web/test/hidden-oracle.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Hard rule 8's oracle for a rendering of narrated text** — shared by
 * `story-render.test.tsx` (the `#story` page, D127) and `arena-caption.test.tsx`
 * (the arena's caption strip, D255). Moved here unchanged from the first when
 * the second needed it; it is not a test file (neither runner's glob takes it).
 *
 * It is written apart from `web/src/story/narrate.ts` on purpose, so a bug in the
 * narrator's one face reader is not also a bug in the check: from the log alone
 * it learns which ids are concealed in every frame, which names each id carries
 * on a visible card, and which names the log shows at all, and `problemsOf` holds
 * a rendering's markup to them — by ids, by backing, by the decks' names, and for
 * hygiene (no `undefined`, no `[object Object]`, no `(123)` engine id).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { ParsedFrameLog } from '../src/transport/replay.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

// ---------------------------------------------------------------------------
// The oracle: written apart from narrate.ts on purpose, so a bug in the
// narrator's one face reader is not also a bug in the check.

interface CardLike {
  id: number;
  hidden?: boolean;
  faceDown?: boolean;
  name?: string;
  alt?: { name?: string } | null;
}

function isCardObject(o: unknown): o is CardLike {
  if (o === null || typeof o !== 'object') return false;
  const c = o as Record<string, unknown>;
  return typeof c['id'] === 'number' && 'zone' in c && ('hidden' in c || 'name' in c);
}

function visibleNameOf(card: CardLike): string | null {
  if (card.hidden === true) return null;
  if (card.faceDown === true) return typeof card.alt?.name === 'string' && card.alt.name !== '' ? card.alt.name : null;
  return typeof card.name === 'string' && card.name !== '' ? card.name : null;
}

function* cardsIn(value: unknown): Generator<CardLike> {
  if (Array.isArray(value)) {
    for (const v of value) yield* cardsIn(v);
  } else if (value !== null && typeof value === 'object') {
    if (isCardObject(value)) yield value;
    for (const v of Object.values(value)) if (v !== null && typeof v === 'object') yield* cardsIn(v);
  }
}

export interface Oracle {
  alwaysHidden: Set<number>;
  /** id → every name that id carries on a visible card somewhere in the log. */
  namesById: Map<number, Set<string>>;
  visibleNames: Set<string>;
}

export function audit(log: ParsedFrameLog): Oracle {
  const visibleIds = new Set<number>();
  const seen = new Set<number>();
  const namesById = new Map<number, Set<string>>();
  const visibleNames = new Set<string>();
  for (const f of log.frames) {
    if (f.dir === 'c2s') continue;
    for (const card of cardsIn(f.body)) {
      seen.add(card.id);
      const name = visibleNameOf(card);
      if (name === null) continue;
      visibleIds.add(card.id);
      visibleNames.add(name);
      if (!namesById.has(card.id)) namesById.set(card.id, new Set());
      namesById.get(card.id)!.add(name);
    }
    const body = f.body as Record<string, unknown>;
    if (f.type === 'hello_ok' && body['match'] !== null && typeof body['match'] === 'object') {
      const m = body['match'] as { yourDeck?: { name?: unknown }; aiDeck?: { name?: unknown } };
      for (const d of [m.yourDeck, m.aiDeck]) if (typeof d?.name === 'string') visibleNames.add(d.name);
    }
    if (f.type === 'ask' && body['kind'] === 'sideboard') {
      for (const o of [...((body['main'] as Array<{ label?: unknown }>) ?? []), ...((body['side'] as Array<{ label?: unknown }>) ?? [])]) {
        visibleNames.add(String(o.label ?? '').replace(/\s+\([A-Z0-9]{2,6}\)$/, ''));
      }
    }
  }
  return { alwaysHidden: new Set([...seen].filter((id) => !visibleIds.has(id))), namesById, visibleNames };
}

export function deckNames(): Set<string> {
  const names = new Set<string>();
  for (const file of readdirSync(REPO + 'decks').filter((f) => f.endsWith('.dck'))) {
    let section = '';
    for (const raw of readFileSync(REPO + 'decks/' + file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (/^\[.*\]$/.test(line)) section = line.toLowerCase();
      else if (section !== '[metadata]') {
        const m = /^(\d+)\s+(.+?)(\|.*)?$/.exec(line);
        if (m) names.add(m[2]!.trim());
      }
    }
  }
  return names;
}
export const DECK_NAMES = deckNames();

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const nameRe = (name: string): RegExp => new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`);

export function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/** Every element's (data-card-id, data-card-name) pair, un-escaped. */
export function markedCards(html: string): Array<{ id: number; name: string | null }> {
  return [...html.matchAll(/<[^>]*\bdata-card-id="(\d+)"[^>]*>/g)].map((m) => {
    const name = /data-card-name="([^"]*)"/.exec(m[0]);
    return { id: Number(m[1]), name: name ? unescapeHtml(name[1] ?? '') : null };
  });
}

/**
 * Checks 1, 2, 3 and 5 over one rendering — the `#story` page's or the arena's
 * caption strip's markup; a list of problems, so a control can assert some are FOUND.
 */
export function problemsOf(label: string, html: string, oracle: Oracle): string[] {
  const problems: string[] = [];
  for (const { id, name } of markedCards(html)) {
    if (name === null) continue;
    if (oracle.alwaysHidden.has(id)) {
      problems.push(`${label}: card #${String(id)} is concealed in every frame of the log, and the page names it ${JSON.stringify(name)}`);
    }
    if (!(oracle.namesById.get(id)?.has(name) ?? false)) {
      problems.push(`${label}: the page names #${String(id)} ${JSON.stringify(name)}, which no visible card of that id carries`);
    }
  }
  const plain = unescapeHtml(html);
  const forbidden = [...DECK_NAMES].filter((n) => !oracle.visibleNames.has(n));
  for (const n of forbidden) {
    if (nameRe(n).test(plain)) problems.push(`${label}: the page prints ${JSON.stringify(n)}, a name the log never shows`);
  }
  const text = plain.replace(/<[^>]*>/g, ' ');
  if (/\(\d+\)/.test(text)) problems.push(`${label}: an engine id reaches the page: ${/.{0,40}\(\d+\).{0,20}/.exec(text)?.[0] ?? ''}`);
  if (html.includes('undefined')) problems.push(`${label}: the page prints "undefined"`);
  if (html.includes('[object Object]')) problems.push(`${label}: the page prints "[object Object]"`);
  return problems;
}

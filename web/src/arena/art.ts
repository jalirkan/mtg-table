/*
 * mtg-table — arena/art.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The art palette, read at runtime** (lane BODIES, report 15 §7.2; **D160**).
 *
 * `figures/palette.ts` is the pure half — k-means over pixels. This is the
 * half that has pixels: for every card drawn FACE UP on the table it reads the
 * Scryfall image `art.json` already names (the same `normal` URL `CardPlane`
 * loads, so the browser's cache answers it), draws it once into a small canvas,
 * and hands the art window's pixels to the pure half. The result is cached per
 * card NAME for the life of the page, and `useArtPalettes` hands the arena a new
 * map when one arrives — at which point the pose is recomputed at commit, exactly
 * as a texture arrival repaints a card.
 *
 * ---------------------------------------------------------------------------
 * Four rules, each an arena rule it is bound by:
 *
 *  1. **Hard rule 8.** A name is asked for only through {@link paletteNamesOf},
 *     which skips every placement drawn as a back and every redacted stub — the
 *     gate `CardPlane` asks `art.json` behind. A concealed card's art is never
 *     looked up, fetched or read (`web/test/palette.test.ts` holds it over the
 *     corpus, and `liveness.test.ts` holds this file to that one entry point).
 *  2. **Off the hot path.** Nothing here runs in the frame loop, and the frame
 *     loop imports nothing from here. The browser decodes the image off the main
 *     thread; the read and the clustering wait for an idle period with room for
 *     them (3–22 ms a card at ¼ scale, measured, docs/evidence/bodies.md), as
 *     many cards as it has room for, and the hook hears once for the lot. A page
 *     that is never idle simply has no palettes yet, and every figure keeps its
 *     hand-written colours and its colour identity.
 *  3. **Nothing is committed, nothing is sent.** The pixels are the viewer's own
 *     download of art `art.json` names; the palette lives in this page's memory.
 *     No URL is written here (`art.ts`'s `imageUrl` builds the one it reads).
 *  4. **A miss is a state, not an error.** No `art.json` entry (a token, a miss),
 *     a failed decode, a tainted canvas (no CORS header) — the card simply has no
 *     art rung, and the ladder falls through to the colour identity.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react';

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import { isHidden } from '../protocol.ts';
import { ART_WINDOW, paletteFromPixels, type ArtPalette } from './figures/palette.ts';
import type { Layout } from './layout.ts';

/** name → its palette, or `null` once it is known there is none. One per page. */
const cache = new Map<string, ArtPalette | null>();
/** Names queued or being read. */
const pending = new Set<string>();
const listeners = new Set<() => void>();

/**
 * **The one entry point: the names this layout may read art for** — creatures,
 * lands, attachments and spells on the stack, and ONLY those drawn face up.
 */
export function paletteNamesOf(placed: Layout): string[] {
  const out = new Set<string>();
  for (const placement of placed.placements) {
    if (placement.back || isHidden(placement.card)) continue;
    if (placement.kind !== 'creature' && placement.kind !== 'land' && placement.kind !== 'attachment' && placement.kind !== 'stack') continue;
    const name = (placement.card as { name?: string }).name;
    if (typeof name === 'string' && name !== '') out.add(name);
  }
  return [...out].sort();
}

/**
 * Scale the `normal` image (488 × 680) is read at: 122 × 170 — ~7,600 samples in
 * the art window, about report 15 §7.1's 9,430 (every 13th pixel at full size);
 * 1/8 averaged the painting's small bright shapes away (Fury's explosion read as
 * an unsaturated tan).
 */
const READ_SCALE = 1 / 4;

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * What one read and clustering needs from an idle period: measured 3–22 ms a
 * card at ¼ scale in Chromium (docs/evidence/bodies.md §4), so an idle period
 * shorter than this is left alone rather than overrun into the next frame.
 */
const IDLE_BUDGET_MS = 12;

interface IdleDeadlineLike {
  timeRemaining(): number;
}
type IdleRunner = (callback: (deadline: IdleDeadlineLike) => void) => void;

/**
 * `requestIdleCallback` with **no timeout** where the browser has it: the work
 * waits for a genuinely idle period — which a table at rest (`frameloop:
 * 'demand'`) is almost all of — and a page that is animating without pause
 * reads nothing until it stops (rule 2 above). A timeout would force the reads
 * into the middle of play, where the table is busiest — the first cut had one
 * (2 s), and its reads ran in the decode's callback rather than in idle time.
 * Safari has no `requestIdleCallback`; there a 50 ms timeout stands in, with a
 * full budget.
 *
 * Both are ONE-SHOT timers, not a poll (`liveness.test.ts`'s poll clause, which
 * wants each spelled out on its own line with its reason): {@link pump} arms one
 * only while decoded images wait, and stops the moment they are read.
 */
function idleRunner(): IdleRunner {
  if (typeof globalThis.requestIdleCallback === 'function') {
    return (cb) => void requestIdleCallback(cb); // ALLOW timer: one idle callback per pump, armed only while decoded images wait
  }
  return (cb) => void setTimeout(() => cb({ timeRemaining: () => IDLE_BUDGET_MS }), 50); // ALLOW timer: Safari's stand-in for the idle callback, the same one-shot
}

/** Decoded images waiting for an idle period, first in, first out. */
const ready: Array<{ name: string; image: HTMLImageElement }> = [];
let pumping = false;
/** One small canvas, reused for every read. */
let canvas: HTMLCanvasElement | null = null;

/** The palette of one decoded image, or `null` (a tainted canvas throws on read). */
function readPalette(image: HTMLImageElement): ArtPalette | null {
  try {
    const w = Math.max(8, Math.round(image.naturalWidth * READ_SCALE));
    const h = Math.max(8, Math.round(image.naturalHeight * READ_SCALE));
    canvas ??= document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) return null;
    ctx.drawImage(image, 0, 0, w, h);
    return paletteFromPixels(ctx.getImageData(0, 0, w, h).data, w, h, { window: ART_WINDOW });
  } catch {
    return null;
  }
}

/**
 * **Read the decoded images while the browser is idle**, as many as the idle
 * period has room for, and tell the hook ONCE for the lot — so a table's worth
 * of palettes costs one re-render of the poses, not one per card.
 */
function pump(): void {
  if (pumping || ready.length === 0) return;
  pumping = true;
  idleRunner()((deadline) => {
    pumping = false;
    let read = 0;
    while (ready.length > 0 && deadline.timeRemaining() >= IDLE_BUDGET_MS) {
      const next = ready.shift()!;
      cache.set(next.name, readPalette(next.image));
      pending.delete(next.name);
      read += 1;
    }
    if (read > 0) notify();
    pump();
  });
}

/** Start reading one card's art. Never throws; the cache holds `null` on any miss. */
function extract(name: string, art: ArtIndex): void {
  // No entry yet is not cached: `art.json` may still be loading, and the hook
  // asks again when the index changes. A token or a miss just keeps asking cheaply.
  const entry = lookupArt(art, name);
  if (entry === null || typeof Image !== 'function' || typeof document === 'undefined') return;
  pending.add(name);
  const image = new Image();
  // three's `Loader` asks with `crossOrigin = 'anonymous'` too, so the request
  // `CardPlane` already made answers this one from the browser's cache. The
  // decode is the browser's, off the main thread; only the read waits for idle.
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.src = imageUrl(entry, 'normal');
  image
    .decode()
    .then(() => {
      ready.push({ name, image });
      pump();
    })
    .catch(() => {
      // A 404 or a decode error: no art rung for this card, and nothing to redraw.
      cache.set(name, null);
      pending.delete(name);
    });
}

/** The cached palette for a name — `undefined` while unknown. For the workshop's strip. */
export function peekArtPalette(name: string): ArtPalette | null | undefined {
  return cache.get(name);
}

/**
 * **The palettes for these names**, as a map the pose functions take
 * (`figurePose`'s and `tilePose`'s `palettes`). Starts reading any name it has
 * not seen; returns a NEW map only when a name's palette arrives, so a memo keyed
 * on it recomputes the pose once per arrival and never per frame.
 */
export function useArtPalettes(names: readonly string[], art: ArtIndex): ReadonlyMap<string, ArtPalette> {
  // The arrival signal: its value is never read, only its change re-renders.
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = (): void => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const key = names.join('\u0000');
  useEffect(() => {
    for (const name of names) {
      if (cache.has(name) || pending.has(name)) continue;
      extract(name, art);
    }
    // `names` is represented by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, art]);
  // A new map only when one of THESE names has a palette it did not have.
  const resolved = names.filter((name) => (cache.get(name) ?? null) !== null).join('\u0000');
  return useMemo(() => {
    const out = new Map<string, ArtPalette>();
    for (const name of names) {
      const palette = cache.get(name);
      if (palette !== undefined && palette !== null) out.set(name, palette);
    }
    return out;
    // `resolved` is the arrival; `names` is in it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);
}

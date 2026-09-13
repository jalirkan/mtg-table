/*
 * mtg-table — arena/scene/numberSprite.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Numbers and banners, drawn to a canvas** — damage numbers, life totals,
 * counter pips, the turn banner and the result card.
 *
 * ---------------------------------------------------------------------------
 * **This is a deliberate departure from report 09 §12.1, which buys drei
 * `<Text>` (troika SDF) for +44 kB gzip.** Three reasons, all mechanical, and
 * all found while wiring E4 rather than guessed at:
 *
 *  1. **drei's `<Text>` takes its string from `children`.** It re-assigns
 *     `troika.text` on every React render, so the "pre-create one `<Text>` per
 *     HUD slot and mutate `.text`" plan of §9.3 rule 2 fights the component: a
 *     `ClientState` arriving mid-cue would reset the number being drawn.
 *     Mutating troika directly means importing `troika-three-text`, which is
 *     drei's dependency and not ours to declare.
 *  2. **It suspends.** `Text` calls `suspend(() => preloadFont(...))`, and a
 *     component suspending *inside* `<Canvas>` re-suspends the whole canvas
 *     subtree unless a second `<Suspense>` is mounted in the scene.
 *  3. **Its default font is fetched from `fonts.gstatic.com`.** A local-only
 *     game (README: localhost only) whose damage numbers need a CDN is a game
 *     that silently loses its numbers offline. Card *art* is hot-linked by
 *     decision 5 and degrades to a text frame; a missing digit degrades to
 *     nothing.
 *
 * A canvas is what `textFrame.ts` already uses for the card fallback, it uses
 * the browser's own fonts, it costs no bundle bytes, and it answers §14's
 * question 2 the other way with a reason. The cache is by string **and**
 * colour, capped, so the repeated `-3` of a combat turn is one texture.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { initTexture } from './useCardTexture.ts';

/** 2:1, so a banner fits and a number is not stretched. */
const WIDTH = 512;
const HEIGHT = 256;
export const SPRITE_ASPECT = WIDTH / HEIGHT;

/** How many distinct string+colour pairs to keep. A game produces a few dozen. */
const MAX_CACHE = 64;

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * A texture of `text` in `colour`, cached.
 *
 * **The string is always a number, a fixed word or an enum name** — the cue
 * layer is the gate (`Effect.text`, `registry.ts`), and `replay-cues.test.ts`
 * asserts across every committed recording that nothing that reaches here is a
 * card name. This function draws whatever it is handed, so the check has to be
 * upstream, and it is.
 */
export function textTexture(text: string, colour: string): THREE.Texture | null {
  const key = `${text}|${colour}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // Size to fit: a `-12` and a `Turn 17 — your turn` share one sprite shape.
  let size = 132;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (; size > 26; size -= 6) {
    ctx.font = `700 ${String(size)}px ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif`;
    if (ctx.measureText(text).width <= WIDTH - 48) break;
  }

  // A dark halo, so a number over card art is legible whatever is behind it.
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(6, size * 0.14);
  ctx.strokeStyle = 'rgba(6, 9, 13, 0.92)';
  ctx.strokeText(text, WIDTH / 2, HEIGHT / 2);
  ctx.fillStyle = colour;
  ctx.fillText(text, WIDTH / 2, HEIGHT / 2);

  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  cache.set(key, texture);
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next();
    if (!oldest.done) {
      cache.get(oldest.value)?.dispose();
      cache.delete(oldest.value);
    }
  }
  return texture;
}

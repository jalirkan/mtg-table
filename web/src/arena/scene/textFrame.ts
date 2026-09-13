/*
 * mtg-table — arena/scene/textFrame.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The two textures the arena draws for itself**: the text-frame fallback for
 * a card with no image, and the procedural card back (report 09 §4.3, §4.4).
 *
 * The fallback is needed for four cases that all happen in the first ten games:
 * a **token** (no deck entry, so never in `art.json` — Nick Fury and Ant-Man's
 * Air Force both make them), an **`art.json` miss**, a **404 or dropped
 * connection** on the image itself, and a **fresh checkout** where `art.json`
 * has not been generated at all. It draws at 488×680 — deliberately the same
 * pixel size as Scryfall's `normal` — so the aspect, the mip chain and the VRAM
 * accounting are identical and nothing downstream branches.
 *
 * ---------------------------------------------------------------------------
 * **A redacted card is not this** (hard rule 8, §4.4).
 *
 * `{id, zone, owner, controller, hidden:true}` carries no name, and a face-down
 * card's name is not public. Neither may ever reach a texture that draws text:
 * this is the surface PLAN's *"What M6 hands to M7"* warns about — "a Three.js
 * scene draws no markup", so the board's per-frame `data-card-name` check
 * cannot see in here. Three things keep it honest, and all three are cheap:
 *
 *   1. `layout()` sets `Placement.back` for a hidden **or** face-down card;
 *   2. `CardPlane` branches on `back` before it asks for any face at all;
 *   3. `renderTextFrame` **itself** re-checks and hands back the card back, so
 *      a future caller that forgets 1 and 2 still cannot print a name.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { isHidden, type AnyCard, type Card } from '../../protocol.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import { initTexture, roundedRect } from './useCardTexture.ts';

/** Scryfall's `normal` pixel size. Same aspect, same mip chain, same accounting. */
const W = 488;
const H = 680;

const frameCache = new Map<string, THREE.CanvasTexture>();

/**
 * The cache key: everything the frame actually draws. A token re-entering the
 * battlefield with the same name, type line and P/T redraws nothing.
 */
export function textFrameKey(card: Card): string {
  return `${card.name}|${card.types}|${card.power ?? ''}/${card.toughness ?? ''}|${card.loyalty ?? ''}|${card.manaCost ?? ''}`;
}

/**
 * A card frame drawn from the fields the snapshot already carries (§3.2):
 * `name`, `manaCost`, `types`, `power`, `toughness`, `loyalty`, `counters` and
 * `abilities[].text`. No network, no fonts to load, no layout dependency on the
 * 2D board.
 */
export function renderTextFrame(
  card: AnyCard,
  gl: THREE.WebGLRenderer | null,
): THREE.Texture | null {
  // Gate 3 of the three above. A concealed card has no name to draw and must
  // never be given one; it gets the back, exactly like `layout()` asked for.
  if (isHidden(card)) return cardBackTexture(gl);
  const full = card as Card;
  const key = textFrameKey(full);
  const cached = frameCache.get(key);
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  const tint = colourHex(colourIdOf(full.manaCost));

  // Border — the colour identity, so a glance across the table still reads.
  ctx.fillStyle = tint;
  roundedRect(ctx, 0, 0, W, H, 26);
  ctx.fill();

  // Card body.
  ctx.fillStyle = '#14161a';
  roundedRect(ctx, 14, 14, W - 28, H - 28, 18);
  ctx.fill();

  // Name bar, with the mana cost right-aligned.
  ctx.fillStyle = '#1c1f25';
  roundedRect(ctx, 28, 30, W - 56, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#e6e8ec';
  ctx.textBaseline = 'middle';
  const cost = full.manaCost ?? '';
  ctx.textAlign = 'right';
  ctx.font = 'bold 24px ui-monospace, monospace';
  const costWidth = cost === '' ? 0 : ctx.measureText(cost).width + 16;
  if (cost !== '') ctx.fillText(cost, W - 40, 57);
  ctx.textAlign = 'left';
  fitText(ctx, full.name, W - 56 - 24 - costWidth, 26, 15, 'bold', (font) => {
    ctx.font = font;
    ctx.fillText(full.name, 40, 57);
  });

  // Art box — a flat tint, because there is no art. This is the whole point of
  // the frame: it says "no image", not "broken".
  const art = ctx.createLinearGradient(0, 96, 0, 356);
  art.addColorStop(0, '#232833');
  art.addColorStop(1, '#171a20');
  ctx.fillStyle = art;
  roundedRect(ctx, 28, 96, W - 56, 260, 10);
  ctx.fill();
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.18;
  roundedRect(ctx, 28, 96, W - 56, 260, 10);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (full.token) {
    ctx.fillStyle = '#8d95a3';
    ctx.font = 'italic 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('token', W / 2, 226);
    ctx.textAlign = 'left';
  }

  // Type line.
  ctx.fillStyle = '#1c1f25';
  roundedRect(ctx, 28, 368, W - 56, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#c6ccd6';
  fitText(ctx, full.types, W - 80, 20, 12, '', (font) => {
    ctx.font = font;
    ctx.fillText(full.types, 40, 390);
  });

  // Rules text, word-wrapped, auto-shrinking until it fits (§4.4).
  const rules = full.abilities
    .map((ability) => ability.text)
    .filter((text) => text.trim() !== '')
    .join('\n');
  ctx.fillStyle = '#12141a';
  roundedRect(ctx, 28, 420, W - 56, 190, 10);
  ctx.fill();
  if (rules !== '') {
    ctx.fillStyle = '#b9c0cc';
    drawWrapped(ctx, rules, 44, 442, W - 88, 178);
  }

  // P/T, loyalty, or nothing. Counters go beside it, because a +1/+1 counter is
  // the difference between a 2/2 and a 4/4 and the frame must not hide it.
  const pt =
    full.power !== null && full.toughness !== null
      ? `${full.power}/${full.toughness}`
      : full.loyalty !== null
        ? full.loyalty
        : '';
  if (pt !== '') {
    ctx.fillStyle = '#1c1f25';
    roundedRect(ctx, W - 150, H - 92, 112, 56, 10);
    ctx.fill();
    ctx.fillStyle = '#e6e8ec';
    ctx.font = 'bold 32px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pt, W - 94, H - 62);
    ctx.textAlign = 'left';
  }
  const counters = Object.entries(full.counters).filter(([, n]) => n > 0);
  if (counters.length > 0) {
    ctx.fillStyle = '#7ddf87';
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText(
      counters.map(([name, n]) => `${name} ${String(n)}`).join('  '),
      40,
      H - 62,
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, gl);
  frameCache.set(key, texture);
  return texture;
}

/**
 * Draw `text` at the largest font between `max` and `min` px that fits `width`.
 * Used for the name bar, where "Quake, Agent of S.H.I.E.L.D." and "Plains" have
 * to live in the same box.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  max: number,
  min: number,
  weight: string,
  draw: (font: string) => void,
): void {
  for (let size = max; size >= min; size -= 1) {
    const font = `${weight} ${String(size)}px system-ui, sans-serif`.trim();
    ctx.font = font;
    if (ctx.measureText(text).width <= width || size === min) {
      draw(font);
      return;
    }
  }
}

/** Word-wrapped rules text, shrinking 20px → 12px until the block fits its box. */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (let size = 20; size >= 12; size -= 1) {
    ctx.font = `${String(size)}px system-ui, sans-serif`;
    const lineHeight = size * 1.25;
    const lines = wrap(ctx, text, width);
    if (lines.length * lineHeight <= height || size === 12) {
      let ty = y + lineHeight / 2;
      for (const line of lines) {
        if (ty > y + height) break;
        ctx.fillText(line, x, ty);
        ty += lineHeight;
      }
      return;
    }
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (ctx.measureText(candidate).width > width && line !== '') {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// The card back (§4.3)
// ---------------------------------------------------------------------------

let cardBack: THREE.CanvasTexture | null = null;

/**
 * **Drawn, never scanned.** Wizards' printed card back is trademarked artwork,
 * so the arena draws its own: a dark rounded panel with a radial sheen and a
 * thin inner rule. One 256×358 canvas, made once, shared by every face-down
 * card, every concealed card and the opponent's whole hand.
 */
export function cardBackTexture(gl: THREE.WebGLRenderer | null): THREE.Texture | null {
  if (cardBack !== null) return cardBack;
  if (typeof document === 'undefined') return null;
  const w = 256;
  const h = 358;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  ctx.fillStyle = '#0b0d11';
  ctx.fillRect(0, 0, w, h);

  const sheen = ctx.createRadialGradient(w / 2, h * 0.42, 8, w / 2, h * 0.42, w * 0.78);
  sheen.addColorStop(0, '#33405a');
  sheen.addColorStop(0.55, '#1b2230');
  sheen.addColorStop(1, '#0a0c10');
  ctx.fillStyle = sheen;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 16);
  ctx.fill();

  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 3;
  roundedRect(ctx, 22, 22, w - 44, h - 44, 12);
  ctx.stroke();

  ctx.strokeStyle = '#6fb4ff';
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  roundedRect(ctx, 34, 34, w - 68, h - 68, 8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, gl);
  cardBack = texture;
  return texture;
}

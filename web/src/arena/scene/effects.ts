/*
 * mtg-table — arena/scene/effects.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The Tier-1 primitive kit, as a fixed pool of objects** (report 09 §12.1,
 * §9.3).
 *
 * Six primitives — glow, ring, beam, particles, text, plate — and **not one of
 * them is a React component**. They are `THREE.Mesh`es created once, parked
 * invisible, and bound to whatever the cue queue is asking for this frame by
 * the single `useFrame` in `CueRunner.tsx`.
 *
 * Two reasons, and both are §9:
 *
 *  - **§9.2 rule 7 — no React state updates from `useFrame`.** A cue sets an
 *    effect sixty times a second; a component per effect would be sixty
 *    reconciles a second on top of the ~1 render/second the game itself causes.
 *  - **§9.3 rule 2 — mount once, mutate.** Mounting and unmounting a mesh per
 *    damage number is exactly the cost the report warns about for `<Text>`, and
 *    it applies to every kind here, not just text.
 *
 * The whole pool is **invisible by default and therefore free**: three's
 * renderer skips invisible objects outright (`WebGLRenderer.js:1862`), so 26
 * parked meshes cost zero draw calls and zero GPU time.
 */

import * as THREE from 'three';

import type { AnchorRef, Effect, EffectKind, EffectShape } from '../cues/stage.ts';
import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import { FIGURE_HEIGHT, figurePointInto } from '../layout.ts';
import { parsedColour } from './colourCache.ts';
import type { OffsetSource } from './discs.ts';
import { UNIT_PLANE } from './geometry.ts';
import { SPRITE_ASPECT, textTexture } from './numberSprite.ts';
import { initTexture } from './useCardTexture.ts';

/**
 * How many of each primitive exist. The **total** live at once is capped at 8
 * by `MAX_LIVE_EFFECTS` in `cues/stage.ts`, so these are generous by design:
 * a slot that is never used costs one invisible mesh.
 *
 * **Tier 2 slice 3 grew it once, and it is still fixed** (38 → 45): the per-card
 * cues of T11 reach for more beams (a spotlight's cone, the Doombot's laser,
 * Quake's fissure, Web Up's two strands, Fury's two calls) and a third particle
 * system (the Air Force's sweep beside its burst). The eight-object CAP did not
 * move — it bounds overdraw, and it is what degrades a crowded batch — but a
 * batch the cap allows should never be refused by the pool beneath it.
 */
const POOL = { glow: 8, ring: 8, beam: 5, particles: 3, text: 6, plate: 3, mote: 12 } as const;

/** Points per burst. One buffer, re-aimed rather than re-allocated (§9.2 rule 6). */
const PARTICLE_COUNT = 48;

// ---------------------------------------------------------------------------
// The three generated textures. One canvas each, for the whole page.
// ---------------------------------------------------------------------------

let glowTex: THREE.Texture | null | undefined;
let ringTex: THREE.Texture | null | undefined;
let dotTex: THREE.Texture | null | undefined;

function canvas2d(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  return ctx === null ? null : { canvas, ctx };
}

/** A soft radial falloff — the glow, the beam's body and the plate all use it. */
function glowTexture(): THREE.Texture | null {
  if (glowTex !== undefined) return glowTex;
  const made = canvas2d(256);
  if (made === null) return (glowTex = null);
  const { canvas, ctx } = made;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (glowTex = texture);
}

/** An annulus with soft edges — the shockwave, the landing dust, the ripple. */
function ringTexture(): THREE.Texture | null {
  if (ringTex !== undefined) return ringTex;
  const made = canvas2d(256);
  if (made === null) return (ringTex = null);
  const { canvas, ctx } = made;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.72, 'rgba(255,255,255,0)');
  g.addColorStop(0.86, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (ringTex = texture);
}

/** A soft dot for the `Points` sprite. */
function dotTexture(): THREE.Texture | null {
  if (dotTex !== undefined) return dotTex;
  const made = canvas2d(64);
  if (made === null) return (dotTex = null);
  const { canvas, ctx } = made;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (dotTex = texture);
}

// ---------------------------------------------------------------------------
// T11 — the shapes (`cues/stage.ts`'s `EffectShape`). One canvas each, drawn once
// for the page the first time a cue asks for it, white on transparent so the
// material's colour tints it — exactly the three textures above, more of them.
// Exported because `overlays.ts` wears the same shapes as poses (T12).
// ---------------------------------------------------------------------------

const shapeCache = new Map<string, THREE.Texture | null>();

/** A deterministic pseudo-random sequence — a circuit is drawn the same every time. */
function lcg(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Fade a drawing out toward its edge — the soft boundary every shape shares. */
function radialFade(ctx: CanvasRenderingContext2D, w: number, h: number, inner: number): void {
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(inner, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function drawShape(name: string, ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const c = w / 2;
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (name) {
    case 'badge': {
      // A shield crest with a star on it — "S.H.I.E.L.D. badge" without a word.
      const crest = (inset: number): void => {
        ctx.beginPath();
        ctx.moveTo(40 + inset, 34 + inset);
        ctx.quadraticCurveTo(c, 58 + inset, 216 - inset, 34 + inset);
        ctx.lineTo(214 - inset, 132);
        ctx.quadraticCurveTo(206 - inset, 196 - inset * 0.4, c, 234 - inset * 1.3);
        ctx.quadraticCurveTo(50 + inset, 196 - inset * 0.4, 42 + inset, 132);
        ctx.closePath();
      };
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 16;
      crest(0);
      ctx.fillStyle = 'rgba(255,255,255,0.26)';
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      crest(20);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 40 : 17;
        const a = -Math.PI / 2 + (Math.PI / 5) * i;
        const x = c + r * Math.cos(a);
        const y = 122 + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      return;
    }
    case 'shield': {
      // A force-field bubble: a bright rim, a faint honeycomb, a clear middle.
      const g = ctx.createRadialGradient(c, c, 0, c, c, 124);
      g.addColorStop(0, 'rgba(255,255,255,0.03)');
      g.addColorStop(0.62, 'rgba(255,255,255,0.08)');
      g.addColorStop(0.88, 'rgba(255,255,255,0.4)');
      g.addColorStop(0.95, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, 112, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      const r = 17;
      for (let row = -8; row <= 8; row++) {
        for (let col = -8; col <= 8; col++) {
          const x = c + col * r * Math.sqrt(3) + (row % 2 === 0 ? 0 : (r * Math.sqrt(3)) / 2);
          const y = c + row * r * 1.5;
          hexPath(ctx, x, y, r);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }
    case 'reticle': {
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(c, c, 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(c, c, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 8;
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.moveTo(c + 70 * Math.cos(a), c + 70 * Math.sin(a));
        ctx.lineTo(c + 124 * Math.cos(a), c + 124 * Math.sin(a));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(c, c, 7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case 'web': {
      // Spokes and sagging rings: a web, or a cocoon's wrapping seen face on.
      const spokes = 10;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < spokes; i++) {
        const a = ((Math.PI * 2) / spokes) * i + 0.2;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + 124 * Math.cos(a), c + 124 * Math.sin(a));
        ctx.stroke();
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      for (let ring = 1; ring <= 6; ring++) {
        const r = ring * 19;
        ctx.beginPath();
        for (let i = 0; i <= spokes; i++) {
          const a0 = ((Math.PI * 2) / spokes) * i + 0.2;
          const a1 = ((Math.PI * 2) / spokes) * (i + 1) + 0.2;
          const x0 = c + r * Math.cos(a0);
          const y0 = c + r * Math.sin(a0);
          const mid = (a0 + a1) / 2;
          const sag = r * 0.82;
          if (i === 0) ctx.moveTo(x0, y0);
          if (i < spokes) {
            ctx.quadraticCurveTo(c + sag * Math.cos(mid), c + sag * Math.sin(mid), c + r * Math.cos(a1), c + r * Math.sin(a1));
          }
        }
        ctx.stroke();
      }
      radialFade(ctx, w, h, 0.72);
      return;
    }
    case 'circuit': {
      // Traces and pads, from a fixed seed: the same board every time it is drawn.
      // BOLD, because it is worn by a figure ~40 px tall at table distance: a
      // hairline trace is invisible there (measured in the browser, slice 3).
      const rand = lcg(0x5eed);
      ctx.lineWidth = 13;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 8;
      for (let n = 0; n < 9; n++) {
        let x = 36 + rand() * 184;
        let y = 36 + rand() * 184;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let seg = 0; seg < 3; seg++) {
          const len = 30 + rand() * 46;
          const dir = Math.floor(rand() * 6);
          const dx = [1, -1, 0, 0, 0.7, -0.7][dir]!;
          const dy = [0, 0, 1, -1, 0.7, 0.7][dir]!;
          x = Math.max(16, Math.min(240, x + dx * len));
          y = Math.max(16, Math.min(240, y + dy * len));
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
      }
      radialFade(ctx, w, h, 0.62);
      return;
    }
    case 'star': {
      // A four-point glint: a hot core and two thin crossed rays.
      const core = ctx.createRadialGradient(c, c, 0, c, c, 44);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(0.4, 'rgba(255,255,255,0.45)');
      core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        const ray = ctx.createLinearGradient(c, c, c + 126 * Math.cos(a), c + 126 * Math.sin(a));
        ray.addColorStop(0, 'rgba(255,255,255,1)');
        ray.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(c + 7 * Math.cos(a + Math.PI / 2), c + 7 * Math.sin(a + Math.PI / 2));
        ctx.lineTo(c + 126 * Math.cos(a), c + 126 * Math.sin(a));
        ctx.lineTo(c + 7 * Math.cos(a - Math.PI / 2), c + 7 * Math.sin(a - Math.PI / 2));
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    case 'hex': {
      // Plating: a honeycomb of bright-edged cells, fading out at the rim.
      const r = 22;
      for (let row = -7; row <= 7; row++) {
        for (let col = -5; col <= 5; col++) {
          const x = c + col * r * Math.sqrt(3) + (row % 2 === 0 ? 0 : (r * Math.sqrt(3)) / 2);
          const y = c + row * r * 1.5;
          hexPath(ctx, x, y, r - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.stroke();
        }
      }
      radialFade(ctx, w, h, 0.6);
      return;
    }
    default:
      return;
  }
}

/**
 * The texture for one {@link EffectShape} (or one of `overlays.ts`'s own), drawn
 * once for the page. `null` in a DOM-less test and for a name nothing draws —
 * the caller then keeps its default map, which is the soft glow.
 */
export function shapeTexture(name: EffectShape | 'console' | 'capsule' | 'cocoon'): THREE.Texture | null {
  const cached = shapeCache.get(name);
  if (cached !== undefined) return cached;
  const size: [number, number] = name === 'console' ? [512, 320] : name === 'cocoon' ? [128, 256] : name === 'capsule' ? [160, 256] : [256, 256];
  if (typeof document === 'undefined') {
    shapeCache.set(name, null);
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    shapeCache.set(name, null);
    return null;
  }
  if (name === 'console' || name === 'cocoon' || name === 'capsule') drawStation(name, ctx, size[0], size[1]);
  else drawShape(name, ctx, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  shapeCache.set(name, texture);
  return texture;
}

/**
 * The three larger drawings T12's poses wear (`overlays.ts`): the ops console
 * over Strategic Intervention, the cocoon over Web Up, and Super Suit's armour
 * capsule around its host.
 */
function drawStation(name: 'console' | 'cocoon' | 'capsule', ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (name === 'console') {
    // A holographic ops screen: a bracketed frame, a grid, a radar with its sweep,
    // a bar chart and a row of status lights. No words — nothing on it names anything.
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(18, 18, w - 36, h - 36);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    for (const [x, y, dx, dy] of [
      [12, 12, 1, 1],
      [w - 12, 12, -1, 1],
      [12, h - 12, 1, -1],
      [w - 12, h - 12, -1, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 46);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 46, y);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    for (let x = 40; x < w - 30; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
    }
    for (let y = 40; y < h - 30; y += 32) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 30, y);
      ctx.stroke();
    }
    const rx = 150;
    const ry = h / 2 + 6;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    for (const r of [96, 64, 32]) {
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    const sweep = ctx.createRadialGradient(rx, ry, 0, rx, ry, 96);
    sweep.addColorStop(0, 'rgba(255,255,255,0.7)');
    sweep.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = sweep;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.arc(rx, ry, 96, -Math.PI / 2, -Math.PI / 2 + 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (const [a, r] of [
      [0.4, 70],
      [2.2, 44],
      [3.9, 82],
      [5.1, 28],
    ] as const) {
      ctx.beginPath();
      ctx.arc(rx + r * Math.cos(a), ry + r * Math.sin(a), 6, 0, Math.PI * 2);
      ctx.fill();
    }
    const bars = [0.55, 0.8, 0.35, 0.95, 0.6, 0.72, 0.4];
    for (let i = 0; i < bars.length; i++) {
      const bh = 150 * bars[i]!;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(290 + i * 26, h - 56 - bh, 16, bh);
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 3 === 1 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(300 + i * 30, 52, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (name === 'cocoon') {
    // A spindle of wrapped silk hanging from its thread.
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, 56);
    ctx.stroke();
    const cy = 150;
    const rx = 44;
    const ry = 92;
    const body = ctx.createRadialGradient(w / 2, cy, 4, w / 2, cy, ry);
    body.addColorStop(0, 'rgba(255,255,255,0.55)');
    body.addColorStop(0.8, 'rgba(255,255,255,0.3)');
    body.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(w / 2, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, cy + i * 18 - 30);
      ctx.bezierCurveTo(w * 0.35, cy + i * 18 - 6, w * 0.65, cy + i * 18 + 10, w, cy + i * 18 + 30);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // `capsule`: Super Suit's armour shell — a hard rim the shape of a standing
  // figure's silhouette box, with plating inside it, clear in the middle.
  const r = w / 2 - 8;
  const top = 8;
  const bottom = h - 8;
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(8, top + r);
    ctx.arc(w / 2, top + r, r, Math.PI, 0);
    ctx.lineTo(w - 8, bottom - r * 0.7);
    ctx.quadraticCurveTo(w - 8, bottom, w / 2, bottom);
    ctx.quadraticCurveTo(8, bottom, 8, bottom - r * 0.7);
    ctx.closePath();
  };
  ctx.save();
  outline();
  ctx.clip();
  const fill = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.55);
  fill.addColorStop(0, 'rgba(255,255,255,0.02)');
  fill.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  fill.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  const cell = 22;
  for (let row = -2; row <= 12; row++) {
    for (let col = -1; col <= 6; col++) {
      const x = col * cell * Math.sqrt(3) + (row % 2 === 0 ? 0 : (cell * Math.sqrt(3)) / 2);
      const y = row * cell * 1.5;
      hexPath(ctx, x, y, cell);
      ctx.stroke();
    }
  }
  ctx.restore();
  // The rim is what survives at table distance, so it is the loudest line here.
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  outline();
  ctx.stroke();
  // Two plate seams across the chest and the waist — armour, not a bubble.
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  for (const y of [h * 0.42, h * 0.64]) {
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.quadraticCurveTo(w / 2, y + 16, w - 18, y);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/**
 * **A creature that left the table in the snapshot on screen** (T11): its last
 * pose and where its departing body stands (`figures/pose.ts`'s `departureStand`).
 * Built by `CueRunner` at commit, one frame of look-behind — the rule the
 * departing-body field already keeps (D64) — so a `figure` anchor on a dying
 * creature resolves to its falling body.
 */
export interface DepartedBody {
  pose: FigurePose;
  stand: readonly [number, number, number];
}

interface Slot {
  kind: EffectKind;
  object: THREE.Object3D;
  material: THREE.Material & { color?: THREE.Color; opacity: number; map?: THREE.Texture | null };
  /**
   * The `bind` pass that last claimed this slot. A frame counter instead of a
   * `Set<Slot>` per frame: §9.2 rule 6, and the set was one of three allocations
   * the hot loop was making sixty times a second.
   */
  gen: number;
}

const FLAT = -Math.PI / 2;

function additive(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
}

/** The fixed directions a particle burst re-aims. See `#seeds`. */
function seedDirections(): Float32Array {
  const seeds = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = (i / PARTICLE_COUNT) * Math.PI * 2 * 1.618;
    const y = 0.15 + (0.85 * ((i * 37) % 100)) / 100;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    seeds[i * 3] = Math.cos(theta) * r;
    seeds[i * 3 + 1] = y * 0.6;
    seeds[i * 3 + 2] = Math.sin(theta) * r;
  }
  return seeds;
}

/**
 * The pool. One per `<Canvas>`, mounted with `<primitive object={pool.group} />`
 * and driven from one `useFrame`.
 */
export class EffectPool {
  readonly group = new THREE.Group();
  #slots: Slot[] = [];
  /** Scratch, allocated once — a `new Vector3()` per effect per frame is a GC sawtooth. */
  readonly #a = new THREE.Vector3();
  readonly #b = new THREE.Vector3();
  readonly #dir = new THREE.Vector3();
  /**
   * One shared set of directions on the unit sphere: a burst re-aims these
   * rather than generating new ones, so a particle system allocates nothing
   * (§9.2 rule 6). Built once for the life of the pool, not per `#build()`.
   */
  readonly #seeds: Float32Array = seedDirections();
  /** Which `bind` pass we are on. See `Slot.gen`. */
  #gen = 0;
  /**
   * Scratch for `bind`'s key ordering, reused rather than rebuilt: the whole
   * point of the ordering is that a live effect keeps the same slot for its
   * whole life, and `[...effects.keys()].sort()` allocated an array per frame to
   * say so. `MAX_LIVE_EFFECTS` bounds it at 8.
   */
  readonly #keys: string[] = [];

  // -- T11: the `figure` anchor ---------------------------------------------
  //
  // A cue names a point on a BODY (`cues/stage.ts`'s `figure` anchor) and this is
  // where it is resolved: against the frame's figure poses and each card's live
  // offset, which `CueRunner` hands in once a frame ({@link setFigures}) before
  // `bind`. Everything below is scratch owned by the pool — two alternating result
  // tuples (a beam resolves both of its ends before it reads either), one mutable
  // `card` ref for the fallback — so resolving a figure point allocates nothing.
  #figures: FigureLayout | null = null;
  #departed: ReadonlyMap<number, DepartedBody> | null = null;
  #offsets: OffsetSource | null = null;
  #seconds = 0;
  #external: ((ref: Effect['at']) => [number, number, number] | null) | null = null;
  readonly #points: [[number, number, number], [number, number, number]] = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  #point = 0;
  readonly #cardRef: { kind: 'card'; id: number } = { kind: 'card', id: 0 };

  constructor() {
    this.group.name = 'arena-effects';
    this.group.renderOrder = 300;
    this.#build();
  }

  /**
   * Build the slots. Separate from the constructor because {@link dispose} can
   * be called on a pool that is about to be used again — see it for why.
   */
  #build(): void {
    const glow = glowTexture();
    const ring = ringTexture();
    const dot = dotTexture();

    for (let i = 0; i < POOL.glow; i++) this.#addQuad('glow', glow);
    // T4's mana motes (report 13 §5.4). Twelve, matching `MAX_LIVE_MOTES`: they
    // are their own bucket because a 0.07-unit dot is not the thing the
    // eight-slot blended cap was sized against, and a five-land mana ability
    // would otherwise cap itself out against its own ripples.
    for (let i = 0; i < POOL.mote; i++) this.#addQuad('mote', glow);
    for (let i = 0; i < POOL.ring; i++) this.#addQuad('ring', ring);
    for (let i = 0; i < POOL.beam; i++) this.#addQuad('beam', glow);
    for (let i = 0; i < POOL.text; i++) this.#addQuad('text', null);
    for (let i = 0; i < POOL.plate; i++) this.#addQuad('plate', glow);

    for (let i = 0; i < POOL.particles; i++) this.#addPoints(dot);
  }

  #addQuad(kind: EffectKind, map: THREE.Texture | null): void {
    const material = additive(map);
    const mesh = new THREE.Mesh(UNIT_PLANE, material);
    mesh.visible = false;
    mesh.renderOrder = 300;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.#slots.push({ kind, object: mesh, material, gen: -1 });
  }

  #addPoints(map: THREE.Texture | null): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3),
    );
    const material = new THREE.PointsMaterial({
      map,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    points.frustumCulled = false;
    this.group.add(points);
    this.#slots.push({ kind: 'particles', object: points, material, gen: -1 });
  }

  /**
   * Bind this frame's live effects to slots, in key order so a given effect
   * keeps the same slot for its whole life, and park everything else.
   *
   * `resolve` is `layout.ts`'s anchor resolver: the pool never computes a
   * position of its own (§8 rule 3), and it is `SceneStage.positionOf` itself
   * — a bound arrow property — rather than a closure built per frame.
   *
   * **It allocates nothing** (§9.2 rule 6): the "which slots are taken" set is a
   * generation stamp on each slot, and the sorted key list is one array reused
   * for the life of the pool.
   */
  /**
   * **T11 — the frame's bodies, for the `figure` anchor.** Called once a frame
   * from `CueRunner`'s effect-binding step, before {@link bind}; three references
   * and a number, stored — nothing is copied and nothing is allocated. `seconds`
   * is the frame loop's own clock, for the `presence` bob a figure carries (the
   * same term `CueRunner.applyFigures` adds to the body itself).
   */
  setFigures(
    figures: FigureLayout | null,
    offsets: OffsetSource | null,
    seconds: number,
    departed: ReadonlyMap<number, DepartedBody> | null = null,
  ): void {
    this.#figures = figures;
    this.#offsets = offsets;
    this.#seconds = seconds;
    this.#departed = departed;
  }

  /**
   * An anchor → a position: the `figure` kind here, everything else through
   * `layout.ts` (`SceneStage.positionOf`, handed to {@link bind}). An arrow
   * property so `#apply` passes it on without building a closure per frame.
   */
  readonly #anchor = (ref: AnchorRef): [number, number, number] | null => {
    if (ref.kind !== 'figure') return this.#external === null ? null : this.#external(ref);
    return this.#figurePoint(ref);
  };

  /**
   * One `figure` anchor → a point, into one of the two scratch tuples. On the
   * frame loop's path for every effect a T11 cue sets, so it allocates nothing —
   * `liveness.test.ts` holds it to that with the disc field's allocation scan.
   */
  #figurePoint(ref: { id: number; at: number; fwd?: number; side?: number }): [number, number, number] | null {
    const out = this.#points[this.#point]!;
    this.#point = this.#point === 0 ? 1 : 0;
    const offset = this.#offsets?.offsetOf(ref.id) ?? null;
    const pose = this.#figures?.get(ref.id);
    const dx = offset?.dx ?? 0;
    const dy = offset?.dy ?? 0;
    const dz = offset?.dz ?? 0;
    const scale = offset?.scale ?? 1;
    const turn = offset?.dRotY ?? 0;
    if (pose === undefined) {
      // A body that died in this snapshot is drawn where `departureStand` put it
      // (`CueRunner`'s one frame of look-behind, the departing-body field's own
      // rule) — so a strike that kills lands on the falling body, not on the card
      // the queue has already laid in its graveyard.
      const gone = this.#departed?.get(ref.id);
      if (gone !== undefined) {
        const h = gone.pose.height;
        return figurePointInto(
          out,
          gone.stand[0],
          gone.stand[1],
          gone.stand[2],
          gone.pose.facingY,
          (ref.fwd ?? 0) * h,
          ref.at * h,
          (ref.side ?? 0) * h,
        );
      }
      // No body: the card, where its cue has carried it — how a wrap follows a
      // card to exile, and how an instant's own point is its card on the stack.
      this.#cardRef.id = ref.id;
      const card = this.#external === null ? null : this.#external(this.#cardRef);
      if (card === null) return null;
      out[0] = card[0] + dx;
      out[1] = card[1] + dy + ref.at * FIGURE_HEIGHT * 0.5 * scale;
      out[2] = card[2] + dz;
      return out;
    }
    const height = pose.height * scale;
    const bob = pose.bobAmp > 0 ? pose.bobAmp * Math.sin(this.#seconds * 2 * Math.PI * pose.bobHz) : 0;
    // `fwd` is along the figure's FRONT and `side` toward its right hand — the
    // same front the prop field draws its eye, badge and pistol at (`layout.ts`'s
    // FIGURE_FRONT_Z, D81): one definition, so a beat lands on the prop it is about.
    return figurePointInto(
      out,
      pose.position[0] + dx,
      pose.position[1] + dy + bob,
      pose.position[2] + dz,
      // The body's facing plus the cue's turn (an attacker facing its defender),
      // exactly the rotation `CueRunner.applyFigures` gives the rig.
      pose.facingY + turn,
      (ref.fwd ?? 0) * height,
      ref.at * height,
      (ref.side ?? 0) * height,
    );
  }

  /**
   * The table under a `figure` anchor: its stand point with the flier's `lift`
   * taken back out (the figure pose folds a hover into `position[1]`). Any other
   * anchor, or a card with no figure, keeps the height it resolved to.
   */
  #groundOf(ref: AnchorRef, y: number): number {
    if (ref.kind !== 'figure') return y;
    const pose = this.#figures?.get(ref.id);
    return pose === undefined ? y : pose.position[1] - pose.lift;
  }

  /** `fit`'s unit: the anchored figure's drawn height, or 1 at any other anchor. */
  #fitOf(effect: Effect): number {
    if (effect.fit !== true || effect.at.kind !== 'figure') return 1;
    const scale = this.#offsets?.offsetOf(effect.at.id).scale ?? 1;
    const pose = this.#figures?.get(effect.at.id);
    return (pose === undefined ? FIGURE_HEIGHT : pose.height) * scale;
  }

  bind(
    effects: ReadonlyMap<string, Effect>,
    resolve: (ref: Effect['at']) => [number, number, number] | null,
    camera: THREE.Camera,
  ): void {
    this.#external = resolve;
    // **A disposed pool rebuilds itself, and this is not defensive programming.**
    // `<StrictMode>` mounts, cleans up and re-mounts every effect in
    // development, so the arena's `useEffect(() => () => pool.dispose(), [pool])`
    // ran `dispose()` on the pool the re-mounted tree then went on using: the
    // group was empty, every slot was gone, and **not one glow, ring, beam or
    // damage number was drawn in dev** — a whole primitive kit, silently
    // absent, with the card motion (which is offsets, not slots) still working
    // perfectly. Measured 2026-09-13 in the browser: `pool.group.children.length
    // === 0` while `stage.effects` held a live ring.
    if (this.#slots.length === 0) this.#build();
    const gen = ++this.#gen;
    const keys = this.#keys;
    keys.length = 0;
    for (const key of effects.keys()) keys.push(key);
    keys.sort();
    for (const key of keys) {
      const effect = effects.get(key)!;
      let slot: Slot | undefined;
      for (const candidate of this.#slots) {
        if (candidate.kind === effect.kind && candidate.gen !== gen) {
          slot = candidate;
          break;
        }
      }
      if (slot === undefined) continue; // pool exhausted: degrade, never stutter
      slot.gen = gen;
      this.#apply(slot, effect, this.#anchor, camera);
    }
    for (const slot of this.#slots) {
      if (slot.gen === gen) continue;
      slot.object.visible = false;
      slot.material.opacity = 0;
    }
  }

  /**
   * **Compile every slot's program now rather than on first use** (T7; report 13
   * §8.3 rule 3, "warm the programs"). Call it AFTER `bind()`, for one frame.
   *
   * A slot is parked invisible, and three compiles a program on the first frame
   * an object is drawn — so the first ring, number or burst of a game paid a shader
   * compile mid-cue. With bloom on, every material also needs a second variant for
   * the composer's render target, and T7's bench caught exactly that: bloom-off
   * held 12 programs for the whole sample, bloom-on started at 23 and compiled a
   * 24th *during* it, on the one frame that went over 50 ms. Drawing every idle
   * slot once at opacity 0 (and every `text` slot with a map, which is its own
   * variant) moves those compiles to the frame the arena — or the composer —
   * mounts, where a hitch is expected. The next `bind()` parks them again.
   */
  prime(): void {
    if (this.#slots.length === 0) this.#build();
    for (const slot of this.#slots) {
      if (slot.object.visible) continue;
      slot.object.visible = true;
      slot.material.opacity = 0;
      slot.object.position.set(0, 0.01, 0);
      if (slot.kind === 'text') {
        const mat = slot.material as THREE.MeshBasicMaterial;
        if (mat.map === null) {
          mat.map = textTexture('0', '#ffffff');
          mat.needsUpdate = true;
        }
        mat.blending = THREE.NormalBlending;
      }
    }
  }

  #apply(
    slot: Slot,
    effect: Effect,
    resolve: (ref: Effect['at']) => [number, number, number] | null,
    camera: THREE.Camera,
  ): void {
    const at = resolve(effect.at);
    if (at === null) {
      slot.object.visible = false;
      return;
    }
    const object = slot.object;
    const material = slot.material;
    const strength = Math.max(0, Math.min(1.4, effect.strength));
    if (strength <= 0.001) {
      object.visible = false;
      return;
    }
    object.visible = true;
    material.opacity = Math.min(1, strength);
    // Parsed once per string, not once per effect per frame (§9.2 rule 6).
    material.color?.copy(parsedColour(effect.colour));
    // `at` is the pool's own scratch for a `figure` anchor, and the next resolve
    // (a beam's far end) takes the OTHER tuple — so it is read before that.
    const ax = at[0];
    const ay = at[1];
    const az = at[2];

    switch (effect.kind) {
      case 'glow': {
        // T11: a shape is a texture on the same quad; absent is the soft glow.
        this.#setMap(slot, effect.shape === undefined || effect.shape === 'soft' ? glowTexture() : shapeTexture(effect.shape), glowTexture());
        object.position.set(ax, ay + 0.02, az);
        object.quaternion.copy(camera.quaternion);
        const size = effect.radius * this.#fitOf(effect) * (0.8 + 0.4 * strength);
        object.scale.set(size * (effect.aspect ?? 1), size, 1);
        break;
      }
      case 'ring': {
        this.#setMap(slot, effect.shape === 'reticle' ? shapeTexture('reticle') : ringTexture(), ringTexture());
        // A ring lies on the table: at a `figure` anchor it is drawn on the GROUND
        // under the body, not in the air under a flier (Wasp, the Doombot).
        object.position.set(ax, this.#groundOf(effect.at, ay) + 0.004, az);
        object.rotation.set(FLAT, 0, effect.spin ?? 0);
        const size = effect.radius * this.#fitOf(effect) * 2;
        object.scale.set(size, size, 1);
        break;
      }
      case 'plate': {
        object.position.set(at[0], at[1] - 0.08, at[2]);
        object.quaternion.copy(camera.quaternion);
        object.scale.set(effect.radius * 2.4, effect.radius * 1.1, 1);
        break;
      }
      case 'text': {
        const map = textTexture(effect.text ?? '', effect.colour);
        const mesh = object as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat.map !== map) {
          mat.map = map;
          mat.needsUpdate = true;
        }
        // White, not the colour: the glyphs are drawn in the colour already, and
        // multiplying twice turns a red number brown.
        mat.color.set('#ffffff');
        mat.blending = THREE.NormalBlending;
        object.position.set(at[0] + (effect.driftX ?? 0), at[1] + (effect.rise ?? 0) + 0.1, at[2]);
        object.quaternion.copy(camera.quaternion);
        object.scale.set(effect.radius * 2 * SPRITE_ASPECT, effect.radius * 2, 1);
        break;
      }
      case 'beam': {
        const to = effect.to === undefined ? null : resolve(effect.to);
        if (to === null) {
          object.visible = false;
          return;
        }
        this.#a.set(ax, ay + 0.05, az);
        this.#b.set(to[0], to[1] + 0.05, to[2]);
        this.#dir.subVectors(this.#b, this.#a);
        const length = this.#dir.length();
        if (length < 1e-3) {
          object.visible = false;
          return;
        }
        object.position.copy(this.#a).addScaledVector(this.#dir, 0.5);
        this.#dir.normalize();
        object.quaternion.setFromUnitVectors(UP, this.#dir);
        object.scale.set(Math.max(0.01, effect.radius * 2), length, 1);
        break;
      }
      /**
       * **A mote of mana in flight** (report 13 §5.4, user decision 9).
       *
       * The only primitive that interpolates between two anchors. `travel` is the
       * cue's own progress, so the flight is on the queue's virtual clock like
       * everything else — pause it and the mote hangs in mid-air.
       *
       * The arc is the whole of the reading: a straight line between a land and a
       * casting anchor looks like a laser, and a mote has to look like something
       * rising. `sin(πu)` peaks at the midpoint and is 0 at both ends, so the
       * mote leaves the tile and arrives at the anchor exactly, whatever the
       * distance.
       */
      case 'mote': {
        const to = effect.to === undefined ? null : resolve(effect.to);
        if (to === null) {
          object.visible = false;
          return;
        }
        const u = Math.max(0, Math.min(1, effect.travel ?? 0));
        const lift = (effect.arc ?? 0.55) * Math.sin(Math.PI * u);
        object.position.set(ax + (to[0] - ax) * u, ay + (to[1] - ay) * u + lift, az + (to[2] - az) * u);
        object.quaternion.copy(camera.quaternion);
        object.scale.setScalar(effect.radius * (2.2 + 1.4 * strength));
        break;
      }
      case 'particles': {
        const points = object as THREE.Points;
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const spread = effect.radius * (0.35 + 1.6 * (effect.burst ?? 0.5));
        // T11: a cloud given a `to` TRAVELS — its centre goes from `at` to `to`
        // over `travel`, arcing over the table — which is the Air Force's sweep.
        let cx = ax;
        let cy = ay;
        let cz = az;
        if (effect.to !== undefined) {
          const to = resolve(effect.to);
          if (to === null) {
            object.visible = false;
            return;
          }
          const u = Math.max(0, Math.min(1, effect.travel ?? 0));
          cx = ax + (to[0] - ax) * u;
          cy = ay + (to[1] - ay) * u + (effect.arc ?? 0.35) * Math.sin(Math.PI * u);
          cz = az + (to[2] - az) * u;
        }
        const array = attr.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          array[i * 3] = cx + this.#seeds[i * 3]! * spread;
          array[i * 3 + 1] = cy + this.#seeds[i * 3 + 1]! * spread + 0.05;
          array[i * 3 + 2] = cz + this.#seeds[i * 3 + 2]! * spread;
        }
        attr.needsUpdate = true;
        break;
      }
      default:
        object.visible = false;
    }
  }

  /**
   * Swap a quad's texture for a shape (T11), falling back to its default when the
   * shape has no texture here (a DOM-less test). Every map is a canvas texture set
   * up by the same `initTexture`, so a swap is a uniform change, never a recompile.
   */
  #setMap(slot: Slot, wanted: THREE.Texture | null, fallback: THREE.Texture | null): void {
    const map = wanted ?? fallback;
    if (slot.material.map !== map) slot.material.map = map;
  }

  /** Park everything. Called on flush, on a scrub and on a new `gameId`. */
  clear(): void {
    for (const slot of this.#slots) {
      slot.object.visible = false;
      slot.material.opacity = 0;
    }
  }

  dispose(): void {
    for (const slot of this.#slots) {
      slot.material.dispose();
      if (slot.object instanceof THREE.Points) slot.object.geometry.dispose();
    }
    this.#slots = [];
    this.group.clear();
  }

  /** How many primitives exist. `0` means disposed — `bind` rebuilds. */
  get slotCount(): number {
    return this.#slots.length;
  }
}

const UP = new THREE.Vector3(0, 1, 0);

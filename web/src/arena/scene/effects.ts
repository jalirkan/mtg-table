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
 *
 * ---------------------------------------------------------------------------
 * **The comic motion lane** (`docs/research/15-art-direction.md` §5; D130 and
 * D133 on branch `motion`) grew the kit by three SHAPES and one KIND:
 *
 *  - `burst`, `splat` and `dots` are textures on the slots that already exist — an
 *    impact star (optionally lettered with one of the closed onomatopoeia), an ink
 *    splash, a Ben-Day dot burst — so they cost no draw call a glow would not;
 *  - they are INK, so a slot drawing one is switched to `NormalBlending` at bind
 *    and back to additive for the next soft glow. Blending is render state in
 *    three 0.186, not part of the program key (`WebGLPrograms.js`: `opaque` needs
 *    `transparent === false`, and every slot is transparent), so no program is
 *    added — the `text` slots have switched the same way since Tier 1;
 *  - `streak` is the one new kind: four more quads (the pool goes 45 → 49), each
 *    with its OWN clone of one speed-line canvas so each can scroll its lines by
 *    its cue's `t` (a clone shares the canvas's `Source`, so it is one upload).
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { COMIC_WORDS, isInkShape, type AnchorRef, type ComicWord, type Effect, type EffectKind, type EffectShape } from '../cues/stage.ts';
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
 *
 * **The comic motion lane grew it once more, by exactly its one new kind** (45 →
 * 49, report 15 §5.1's budget): four `streak` slots — an alpha strike of five
 * attackers draws four sets of speed lines and the fifth degrades, as the pool
 * always has. The new SHAPES take no slot of their own.
 */
export const POOL = { glow: 8, ring: 8, beam: 5, particles: 3, text: 6, plate: 3, mote: 12, streak: 4 } as const;

/** The pool's size — 49 since the comic motion lane (D130). */
export const POOL_SIZE = Object.values(POOL).reduce((sum, n) => sum + n, 0);

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
    case 'burst':
      drawBurst(ctx, w, h, null);
      return;
    case 'splat': {
      // **An ink splash** (D130, D138), seen from above: a lobed blob, a few arms
      // flung out with a droplet at each end, and loose drops — INK, with a light
      // rim and a gloss. The body is drawn in ink, so it stays ink whatever the
      // tint; the rim and the gloss are white, so the material tints THEM (paper
      // by default, a card row's `colour` otherwise). On the hologram's dark felt
      // the rim carries the shape and the body reads as a hole of ink; on a light
      // stage the body carries it. History: the first cut was an ink body with a
      // thin tinted rim (invisible on the felt, `g1`@359); the second a white body
      // tinted grey with an ink rim, which the lane's verification pass read as
      // MILK — "a cream splash", "a pale smudge" at table distance.
      const rand = lcg(0x5b1a7);
      const lobes: number[] = [];
      for (let i = 0; i < 36; i++) lobes.push(0.82 + 0.3 * rand());
      const arms: Array<[number, number, number]> = [];
      for (let i = 0; i < 7; i++) arms.push([rand() * Math.PI * 2, 0.62 + 0.3 * rand(), 5 + 7 * rand()]);
      const drops: Array<[number, number, number]> = [];
      for (let i = 0; i < 9; i++) drops.push([rand() * Math.PI * 2, 0.66 + 0.26 * rand(), 3 + 6 * rand()]);
      // `pad` is an absolute outset in canvas pixels, so the rim is as thick on a
      // thin arm and a small drop as on the blob — a proportional one vanished there.
      const paint = (pad: number, fill: string): void => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        ctx.beginPath();
        for (let i = 0; i <= lobes.length; i++) {
          const a = ((Math.PI * 2) / lobes.length) * i;
          const r = 56 * lobes[i % lobes.length]! + pad;
          const x = c + r * Math.cos(a);
          const y = c + r * Math.sin(a);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        for (const [a, reach, size] of arms) {
          ctx.lineWidth = size * 1.3 + 2 * pad;
          ctx.beginPath();
          ctx.moveTo(c + 40 * Math.cos(a), c + 40 * Math.sin(a));
          ctx.lineTo(c + 112 * reach * Math.cos(a), c + 112 * reach * Math.sin(a));
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(c + 112 * reach * Math.cos(a), c + 112 * reach * Math.sin(a), size + pad, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const [a, reach, size] of drops) {
          ctx.beginPath();
          ctx.arc(c + 116 * reach * Math.cos(a), c + 116 * reach * Math.sin(a), size + pad, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      paint(9, 'rgba(255,255,255,1)');
      paint(0, INK_FILL);
      // The gloss: a crescent of light on the blob and a glint on the bigger drops —
      // what makes a black shape read as WET ink rather than a hole.
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(c - 20, c - 22, 20, 8, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c - 38, c - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      for (const [a, reach, size] of drops) {
        if (size < 6) continue;
        ctx.beginPath();
        ctx.arc(c + 116 * reach * Math.cos(a) - size * 0.35, c + 116 * reach * Math.sin(a) - size * 0.35, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    case 'dots': {
      // **A Ben-Day burst** (D130): a 45°-screened dot grid whose dots swell toward
      // the centre and vanish at the rim — print, not light. White, so the
      // material's colour is the ink it is printed in.
      const step = 13;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(Math.PI / 4);
      for (let gy = -12; gy <= 12; gy++) {
        for (let gx = -12; gx <= 12; gx++) {
          const x = gx * step;
          const y = gy * step;
          const d = Math.hypot(x, y) / 124;
          if (d >= 1) continue;
          const r = (step * 0.56) * (1 - Math.pow(d, 1.4));
          if (r < 0.6) continue;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return;
    }
    default:
      return;
  }
}

/** The comic lane's ink: near-black with a little blue, a printed K plate (report 15's `#0e1016`). */
const INK_FILL = 'rgba(14,16,22,1)';

/**
 * **An impact star** (D130), and — with a word — **its lettering** (D133). A jagged
 * twelve-point star, filled white (the material tints it: POW yellow by default)
 * with a heavy ink outline, an inner star and a halftone band between them; the
 * word is set across it in heavy, forward-leaning capitals — red, outlined in ink
 * with an ink drop shadow — which the tint leaves red. The word is one of the
 * closed `COMIC_WORDS`; this function draws whatever it is handed, so the gate is
 * upstream (`cues/validate.ts`'s `burst` param and `replay-cues.test.ts`'s net).
 */
function drawBurst(ctx: CanvasRenderingContext2D, w: number, h: number, word: string | null): void {
  const c = w / 2;
  const k = w / 256;
  const rand = lcg(0xb005 + (word === null ? 0 : word.length * 131 + word.charCodeAt(0)));
  const points = 12;
  const radii: number[] = [];
  for (let i = 0; i < points * 2; i++) radii.push(i % 2 === 0 ? 118 * (0.82 + 0.18 * rand()) : 70 * (0.86 + 0.18 * rand()));
  const star = (scale: number): void => {
    ctx.beginPath();
    for (let i = 0; i < radii.length; i++) {
      const a = -Math.PI / 2 + (Math.PI / points) * i;
      const r = radii[i]! * scale * k;
      const x = c + r * Math.cos(a);
      const y = c + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  // The fill, and the ink line around it.
  star(0.94);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fill();
  ctx.lineWidth = 11 * k;
  ctx.strokeStyle = INK_FILL;
  ctx.stroke();
  // A halftone band just inside the rim: the printed shading a colourist screens in.
  ctx.save();
  star(0.9);
  ctx.clip();
  ctx.fillStyle = 'rgba(150,150,150,1)';
  const step = 9 * k;
  for (let y = -h; y <= h; y += step) {
    for (let x = -w; x <= w; x += step) {
      const px = c + (x - y) * 0.7071;
      const py = c + (x + y) * 0.7071;
      const d = Math.hypot(px - c, py - c) / (118 * k);
      if (d < 0.62 || d > 1.05) continue;
      ctx.beginPath();
      ctx.arc(px, py, step * 0.3 * Math.min(1, (d - 0.62) / 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // The inner star, as a thin ink line.
  star(0.58);
  ctx.lineWidth = 4 * k;
  ctx.strokeStyle = INK_FILL;
  ctx.stroke();
  if (word === null) return;
  // The lettering: fitted to the star's waist, leaning forward.
  ctx.save();
  ctx.translate(c, c + 4 * k);
  ctx.rotate(-0.12);
  ctx.transform(1, 0, -0.2, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 96 * k;
  for (; size > 20 * k; size -= 4 * k) {
    ctx.font = `900 ${String(Math.round(size))}px Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    if (ctx.measureText(word).width <= 176 * k) break;
  }
  ctx.lineJoin = 'round';
  ctx.fillStyle = INK_FILL;
  ctx.fillText(word, 5 * k, 6 * k);
  ctx.lineWidth = 9 * k;
  ctx.strokeStyle = INK_FILL;
  ctx.strokeText(word, 0, 0);
  ctx.fillStyle = 'rgba(232,50,43,1)';
  ctx.fillText(word, 0, 0);
  ctx.lineWidth = 2 * k;
  ctx.strokeStyle = 'rgba(255,236,190,0.9)';
  ctx.strokeText(word, -1.5 * k, -1.5 * k);
  ctx.restore();
}

/**
 * The comic lane's stars, by WORD (`null` is the plain star). Keyed by the word
 * itself rather than by a `burst:${word}` string: a lookup is on the frame loop's
 * path (`#glowMap`, every frame, every live star), and a template string there was
 * an allocation per star per frame that the loop's scan could not see — it stopped
 * one call short (the lane's verification pass, negative-controlled since).
 */
const burstCache = new Map<ComicWord | null, THREE.Texture | null>();

/**
 * **An impact star's texture, lettered or not** — one canvas per word, kept for the
 * page. A LOOKUP, and nothing else, on the frame loop's path: the drawing is
 * {@link drawBurstTexture}'s, which `EffectPool.prime` reaches for every star at
 * mount, so a miss mid-cue is only a pool used without its prime (a test).
 */
export function burstTexture(word: ComicWord | null): THREE.Texture | null {
  const cached = burstCache.get(word);
  return cached !== undefined ? cached : drawBurstTexture(word);
}

/**
 * Draw and cache one star — 512 px, because a lethal star is most of a card tall
 * in the workshop's close-up and a 256 px word goes soft there. `null` in a
 * DOM-less test. Off the frame loop: {@link burstTexture}'s miss path.
 */
function drawBurstTexture(word: ComicWord | null): THREE.Texture | null {
  const made = canvas2d(512);
  if (made === null) {
    burstCache.set(word, null);
    return null;
  }
  drawBurst(made.ctx, 512, 512, word);
  const texture = new THREE.CanvasTexture(made.canvas);
  initTexture(texture, null);
  burstCache.set(word, texture);
  return texture;
}

let streakTex: THREE.Texture | null | undefined;

/**
 * **Speed lines** (the `streak` kind, D130): parallel lines along the canvas's
 * height, each an ink-edged white stroke that fades in just behind the head (the
 * canvas's top, which is the quad's +Y — the way the body is going) and out toward
 * the tail. The top and bottom rows are left empty, so a slot that scrolls its
 * clone (`offset.y`, the cue's `t`) samples clear texture past either end
 * (`ClampToEdge`) and the lines slide back without a seam.
 */
function streakTexture(): THREE.Texture | null {
  if (streakTex !== undefined) return streakTex;
  if (typeof document === 'undefined') return (streakTex = null);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (streakTex = null);
  const rand = lcg(0x57a3);
  ctx.lineCap = 'round';
  // Five lines, spaced across the quad and staggered along it: packed any closer
  // they merged into one glowing slab under bloom (measured at `g1`@356).
  for (let i = 0; i < 5; i++) {
    const x = 6 + (52 * (i + 0.25 + 0.5 * rand())) / 5;
    const top = 14 + 46 * rand();
    const bottom = Math.min(244, top + 100 + 90 * rand());
    const width = 1.1 + 1.5 * rand();
    // Each gradient fades to its OWN colour at zero alpha: a fade to transparent
    // black would drag the white line through grey.
    const line = (rgb: string, alpha: number, lw: number): void => {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(0.18, `rgba(${rgb},${String(alpha)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    };
    line('14,16,22', 0.9, width + 2.6);
    line('255,255,255', 1, width);
  }
  const texture = new THREE.CanvasTexture(canvas);
  initTexture(texture, null);
  return (streakTex = texture);
}

/**
 * The texture for one {@link EffectShape} (or one of `overlays.ts`'s own), drawn
 * once for the page. `null` in a DOM-less test and for a name nothing draws —
 * the caller then keeps its default map, which is the soft glow. A LOOKUP on the
 * frame loop's path (the names are constants, so it builds nothing); the drawing
 * is {@link drawShapeTexture}'s.
 */
export function shapeTexture(name: EffectShape | 'console' | 'capsule' | 'cocoon'): THREE.Texture | null {
  // The star is drawn at its own size, lettered or not — its own cache.
  if (name === 'burst') return burstTexture(null);
  const cached = shapeCache.get(name);
  return cached !== undefined ? cached : drawShapeTexture(name);
}

/** Draw and cache one shape. Off the frame loop: {@link shapeTexture}'s miss path. */
function drawShapeTexture(name: Exclude<EffectShape, 'burst'> | 'console' | 'capsule' | 'cocoon'): THREE.Texture | null {
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
  /** The comic lane's streak basis — its across axis, its face, and the matrix they make (D130). */
  readonly #across = new THREE.Vector3();
  readonly #face = new THREE.Vector3();
  readonly #basis = new THREE.Matrix4();
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
  /** The comic lane's ink textures, listed once for {@link prime}. */
  #ink: ReadonlyArray<THREE.Texture | null> | null = null;

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

    // The comic lane's speed lines (D130): each slot its own CLONE of the one
    // canvas, because each scrolls its lines by its own cue's `t` (`offset.y`).
    // A clone shares the canvas's `Source`, so the four upload once.
    const streak = streakTexture();
    for (let i = 0; i < POOL.streak; i++) {
      let map: THREE.Texture | null = null;
      if (streak !== null) {
        map = streak.clone();
        map.needsUpdate = true;
      }
      this.#addQuad('streak', map);
      const slot = this.#slots[this.#slots.length - 1]!;
      slot.material.blending = THREE.NormalBlending;
    }
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
    if (pose !== undefined) return pose.position[1] - pose.lift;
    // A body that just died (the comic lane's splat, D130): its departing stand
    // still carries the flier's lift, and a "ground" ring drawn there hung inside
    // the falling body — measured on the Giant-Sized Flying Ant at `g1`@359.
    const gone = this.#departed?.get(ref.id);
    return gone === undefined ? y : gone.stand[1] - gone.pose.lift;
  }

  /** `fit`'s unit: the anchored figure's drawn height, or 1 at any other anchor. */
  #fitOf(effect: Effect): number {
    if (effect.fit !== true || effect.at.kind !== 'figure') return 1;
    return this.#heightOf(effect.at.id);
  }

  /** A card's figure's drawn height, its live offset's scale included. */
  #heightOf(id: number): number {
    const scale = this.#offsets?.offsetOf(id).scale ?? 1;
    const pose = this.#figures?.get(id);
    if (pose !== undefined) return pose.height * scale;
    // A body that just died is sized as it stood (the comic lane's splat, D130):
    // a flier's departing body is as wide as it was, and a fixed-size stain hid
    // under it (`g1`@359's Giant-Sized Flying Ant).
    const gone = this.#departed?.get(id);
    return (gone === undefined ? FIGURE_HEIGHT : gone.pose.height) * scale;
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
    // **The comic lane's ink is drawn and uploaded HERE, at mount** (the lane's
    // verification pass): the six stars (plain and the five words), the splat and
    // the dot screen, each handed to a parked glow slot so this frame's draw at
    // opacity 0 uploads it. Drawn lazily inside `bind`, the first star of a game
    // paid a 512 px canvas and its upload mid-cue — two over-50 ms frames on the
    // GTX 1080 bench coincided with one. Only GLOW slots take them: a glow's map is
    // re-chosen on every use (`#glowMap`), a mote's is not. The streaks' clones are
    // already on their own slots and upload with them.
    const ink = this.#primeInk();
    let next = 0;
    for (const slot of this.#slots) {
      if (slot.object.visible) continue;
      slot.object.visible = true;
      slot.material.opacity = 0;
      slot.object.position.set(0, 0.01, 0);
      if (slot.kind === 'glow' && next < ink.length) {
        const map = ink[next++];
        if (map !== null && map !== undefined) slot.material.map = map;
      }
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

  /**
   * Every ink texture the comic lane draws, drawn now (their caches are the page's,
   * so this is a list of lookups after the first pool). At mount only — never on
   * the frame loop's path.
   */
  #primeInk(): ReadonlyArray<THREE.Texture | null> {
    if (this.#ink === null) {
      const ink: Array<THREE.Texture | null> = [burstTexture(null)];
      for (const word of COMIC_WORDS) ink.push(burstTexture(word));
      ink.push(shapeTexture('splat'), shapeTexture('dots'));
      this.#ink = ink;
    }
    return this.#ink;
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
        // The comic lane (D130/D133): the impact star is its own texture per word,
        // and every ink shape is blended normally.
        this.#setMap(slot, this.#glowMap(effect), glowTexture());
        this.#blend(slot, isInkShape(effect.shape));
        object.position.set(ax, ay + 0.02, az);
        object.quaternion.copy(camera.quaternion);
        // A comic star is tilted, not square to the lens: a turn about the view axis.
        if (effect.spin !== undefined) object.rotateZ(effect.spin);
        const size = effect.radius * this.#fitOf(effect) * (0.8 + 0.4 * strength);
        object.scale.set(size * (effect.aspect ?? 1), size, 1);
        if (effect.shape === 'burst') {
          if (effect.aside !== undefined && effect.at.kind === 'figure') {
            // **A star beside its body** (D137): an attacker's own flourish, and a
            // hit that must not hide the body it lands on.
            this.#beside(object, effect, effect.at.id, size, resolve, camera);
          } else {
            // **An impact star is drawn IN FRONT of the body it is on** (D130):
            // pulled toward the lens by half its size, so its lettering is not cut
            // by the figure it names — it still depth-tests against everything
            // nearer. Along the view ray, so it does not move on screen.
            this.#dir.copy(camera.position).sub(object.position);
            const away = this.#dir.length();
            if (away > 1e-3) object.position.addScaledVector(this.#dir, Math.min(0.45 * size, 0.4 * away) / away);
          }
        }
        break;
      }
      case 'ring': {
        this.#setMap(slot, this.#ringMap(effect), ringTexture());
        this.#blend(slot, isInkShape(effect.shape));
        // A ring lies on the table: at a `figure` anchor it is drawn on the GROUND
        // under the body, not in the air under a flier (Wasp, the Doombot).
        object.position.set(ax, this.#groundOf(effect.at, ay) + 0.004, az);
        object.rotation.set(FLAT, 0, effect.spin ?? 0);
        const size = effect.radius * this.#fitOf(effect) * 2;
        object.scale.set(size, size, 1);
        break;
      }
      case 'plate': {
        // The comic lane's halftone flash (D130): the same plate, screened.
        const dots = effect.shape === 'dots';
        this.#setMap(slot, dots ? shapeTexture('dots') : glowTexture(), glowTexture());
        this.#blend(slot, dots);
        object.position.set(at[0], at[1] - 0.08, at[2]);
        object.quaternion.copy(camera.quaternion);
        object.scale.set(effect.radius * (dots ? 2.2 : 2.4), effect.radius * (dots ? 1.6 : 1.1), 1);
        break;
      }
      case 'streak': {
        this.#streak(slot, effect, ax, ay, az, resolve, camera);
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
   * **Push a star off the body it is on, in SCREEN space** (D137, the lane's
   * verification pass: a POW centred on an attacker's head hid Peggy's hat and
   * shield and Fury's head at the top of their dash, in the workshop and at the
   * table). The billboard already faces the lens (`camera.quaternion`), so its
   * right and up are the camera's: the star moves by its own half-width plus
   * `clear` of the figure's height along the camera's right, toward the screen's
   * centre as seen from `aside` (a REST point, so the side is fixed for the cue —
   * a body mid-dash crossing the centre line does not flip it), and up by `lift`
   * of its size. Then it is pulled toward the lens along its own view ray and
   * shrunk by the same ratio — the same place and size on the screen, but in front
   * of the body, whose bulk would otherwise hide the star's inner edge. On the
   * frame loop's path — the pool's own vectors, nothing allocated.
   */
  #beside(
    object: THREE.Object3D,
    effect: Effect,
    id: number,
    size: number,
    resolve: (ref: Effect['at']) => [number, number, number] | null,
    camera: THREE.Camera,
  ): void {
    this.#across.set(1, 0, 0).applyQuaternion(camera.quaternion);
    let side = 1;
    const rest = effect.aside === undefined ? null : resolve(effect.aside);
    if (rest !== null) {
      // Right of the view's centre line is a positive camera-space x; the star goes
      // the other way, toward the middle of the screen, so it is never cut by an edge.
      this.#a.set(rest[0], rest[1], rest[2]).sub(camera.position);
      const reach = this.#a.length();
      if (reach > 1e-3 && this.#a.dot(this.#across) > ASIDE_TIE * reach) side = -1;
    }
    const push = 0.5 * size * (effect.aspect ?? 1) + (effect.clear ?? 0) * this.#heightOf(id);
    object.position.addScaledVector(this.#across, side * push);
    const lift = effect.lift ?? 0;
    if (lift !== 0) {
      this.#face.set(0, 1, 0).applyQuaternion(camera.quaternion);
      object.position.addScaledVector(this.#face, lift * size);
    }
    // …and IN FRONT of that body, at the same place on the screen: pulled along
    // its own view ray and shrunk by the same ratio, so its footprint is exactly the
    // one placed above. At the body's own depth a wide body hid the star's inner
    // half (the Giant-Sized Flying Ant from the side, `g1`@359 view 4).
    this.#dir.copy(camera.position).sub(object.position);
    const away = this.#dir.length();
    if (away > 1e-3) {
      const pull = Math.min(0.45 * size, 0.4 * away);
      object.position.addScaledVector(this.#dir, pull / away);
      const keep = (away - pull) / away;
      object.scale.set(object.scale.x * keep, object.scale.y * keep, 1);
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

  /** A glow's texture: the soft glow, a T11 shape, or the comic lane's star (lettered or not). */
  #glowMap(effect: Effect): THREE.Texture | null {
    const shape = effect.shape;
    if (shape === undefined || shape === 'soft') return glowTexture();
    if (shape === 'burst') return burstTexture(effect.word ?? null);
    return shapeTexture(shape);
  }

  /** A ring's texture: the annulus, the reticle, or the comic lane's splat and dots. */
  #ringMap(effect: Effect): THREE.Texture | null {
    const shape = effect.shape;
    if (shape === 'reticle' || shape === 'splat' || shape === 'dots') return shapeTexture(shape);
    return ringTexture();
  }

  /**
   * **Ink is painted, light is added** (D130). A slot drawing one of the comic
   * lane's ink shapes blends normally — an additive ink outline would add nothing —
   * and a slot drawing anything else goes back to additive. Render state only: the
   * program is the same (see the file header), so a switch is never a recompile.
   */
  #blend(slot: Slot, ink: boolean): void {
    const want = ink ? THREE.NormalBlending : THREE.AdditiveBlending;
    if (slot.material.blending !== want) slot.material.blending = want;
  }

  /**
   * **Speed lines** (the `streak` kind, D130) — a quad that trails from the head
   * (`at`, the body) back along the motion (`from → to`, or `at → to`) for `length`
   * world units, turned about its own length to face the camera, its lines
   * scrolled back along it by the cue's `t` (`travel`) on the slot's own clone of
   * the texture. On the frame loop's path, so it allocates nothing: the three
   * vectors and the matrix are the pool's own, and the two anchors were resolved
   * into the pool's alternating scratch tuples before this is called.
   */
  #streak(
    slot: Slot,
    effect: Effect,
    ax: number,
    ay: number,
    az: number,
    resolve: (ref: Effect['at']) => [number, number, number] | null,
    camera: THREE.Camera,
  ): void {
    const object = slot.object;
    const to = effect.to === undefined ? null : resolve(effect.to);
    if (to === null) {
      object.visible = false;
      return;
    }
    // Read before `from` is resolved: a figure anchor's point is one of two
    // alternating scratch tuples, and a third resolve reuses the first.
    const tx = to[0];
    const ty = to[1];
    const tz = to[2];
    const from = effect.from === undefined ? null : resolve(effect.from);
    if (from === null) this.#dir.set(tx - ax, ty - ay, tz - az);
    else this.#dir.set(tx - from[0], ty - from[1], tz - from[2]);
    // **A dash is level.** A body's chest to a lane anchor on the felt slopes down,
    // and the reverse of that slope points UP past a low camera — the lines stood
    // on the figure's head (measured in the workshop's close-up). So the travel
    // axis is flattened unless the motion is mostly vertical (the Helicarrier
    // coming down onto its slot), where the height IS the motion.
    if (Math.hypot(this.#dir.x, this.#dir.z) >= 0.5 * Math.abs(this.#dir.y)) this.#dir.y = 0;
    const reach = this.#dir.length();
    if (reach < 1e-4) {
      object.visible = false;
      return;
    }
    this.#dir.multiplyScalar(1 / reach);
    const length = Math.max(0.05, effect.length ?? 1);
    // The quad's centre is half its length BEHIND the head: the lines trail.
    this.#a.set(ax, ay, az).addScaledVector(this.#dir, -0.5 * length);
    // Its face: toward the camera, with the travel axis taken out of the view ray.
    this.#face.copy(camera.position).sub(this.#a);
    this.#face.addScaledVector(this.#dir, -this.#face.dot(this.#dir));
    if (this.#face.lengthSq() < 1e-8) {
      object.visible = false;
      return;
    }
    this.#face.normalize();
    this.#across.crossVectors(this.#dir, this.#face);
    // Columns x, y, z: across, the way it is going, its face — right-handed.
    this.#basis.makeBasis(this.#across, this.#dir, this.#face);
    object.quaternion.setFromRotationMatrix(this.#basis);
    object.position.copy(this.#a);
    object.scale.set(Math.max(0.01, effect.radius * 2), length, 1);
    const map = slot.material.map;
    if (map !== null && map !== undefined) map.offset.y = 0.4 * Math.max(0, Math.min(1, effect.travel ?? 0));
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
      // A streak slot owns its clone of the speed-line canvas (the canvas itself
      // is the page's, like every shape's).
      if (slot.kind === 'streak') slot.material.map?.dispose();
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

/**
 * How far right of the view's centre line (as a fraction of its distance) a rest
 * point must be before a star beside its body goes LEFT (D137). The workshop's
 * pedestal puts the card on the line, and a threshold keeps rounding from choosing.
 */
const ASIDE_TIE = 0.01;

/*
 * mtg-table — arena/scene/status.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Every status strip on the table, as ONE instanced mesh** (the status layer,
 * amendment M49, D210–D212).
 *
 * `figures/status.ts` lays each creature's strip out as pixel quads over a glyph
 * atlas; this field draws them all — keyword icons, bars, pips and marks, both
 * seats — in **one draw call**. That is the budget's answer, not a nicety: at
 * `g1`@316 the arena draws 90 calls with bloom off, ON report 13 §8.2's line
 * (Lane BODIES' merge), so a layer that cost a call per creature or per kind had
 * no room at all. One `InstancedMesh`, one `ShaderMaterial`, one texture.
 *
 * **A billboard in screen pixels.** Each instance carries its anchor (world) and
 * its quad (CSS px from the anchor); the vertex shader projects the anchor and
 * adds the quad in clip space scaled by the canvas's CSS size, so the strip faces
 * the lens from every view and an icon is 16 CSS px however far the figure is —
 * the owner's floor is 14 at the table view. It stays upright at its fixed
 * offset when its figure kneels (`layout.ts`'s `STATUS_LIFT`), and it rides the
 * figure's cue offset (a lunge carries it) and its hover bob.
 *
 * **A pose layer on the one frame loop**, exactly as the prop field is
 * (`scene/props.ts`, D78): built and installed only by `FigureLayer`, COMMITTED
 * there once per snapshot, and bound only from `DiscField.bind` — which is
 * `CueRunner`'s single `useFrame` — where it writes each strip's anchor plus its
 * card's live offset into a preallocated buffer and allocates nothing (a
 * liveness clause scans the body). No clock of its own: the frame loop hands it
 * the queue's seconds. No click: `raycast` is cleared, and it names no card.
 *
 * **The glyphs** are `status.ts`'s procedural path data (D212), painted into one
 * canvas at first use — the atlas is a lookup after that, like `effects.ts`'s
 * shapes. Drawn over everything on the table (`depthTest` off, after the cards
 * and figures), like a HUD, and never so bright that bloom takes it (`BRIGHT`).
 */

import * as THREE from 'three';

import { GLYPHS, type GlyphId } from '../../status.ts';
import { STATUS_CELLS, type StatusCell, type StatusLayout } from '../figures/status.ts';
import { parsedColour } from './colourCache.ts';
import type { OffsetSource } from './discs.ts';
import { initTexture } from './useCardTexture.ts';

/** Quads the buffers hold: 24 creatures (the ceiling is 21, report 13 §2) × 16, the most a strip draws. */
export const STATUS_CAPACITY = 384;
/** Strip records, one per creature. */
const STRIP_CAPACITY = 48;

/**
 * After the cards (ranks ≤ 80, the stack 200+) and the figures (opaque, drawn
 * first), before the duelists' busts (270) and the cue effects (300).
 */
export const STATUS_ORDER = 260;

/**
 * The atlas: 64 px cells, eight to a row. A 16 px icon samples it three mips
 * down, and every glyph keeps a margin inside its cell so a mip does not bleed.
 */
const CELL = 64;
const COLS = 8;
const ROWS = Math.ceil(STATUS_CELLS.length / COLS);
const TEX_W = CELL * COLS;
const TEX_H = CELL * (ROWS <= 4 ? 4 : 8);
/** Inset of each cell's uv rect, px, so a quad never samples its neighbour. */
const INSET = 2;

/**
 * The strip's colours are multiplied down this much: bloom's threshold is 0.62
 * luminance (`Post.tsx`), and a white or gold icon at full value would glow.
 */
const BRIGHT = 0.86;

const VERTEX = /* glsl */ `
  attribute vec3 aAnchor;
  attribute vec4 aQuad;
  attribute vec4 aCell;
  attribute vec4 aTint;
  uniform vec2 uViewport;
  varying vec2 vUv;
  varying vec4 vTint;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4( aAnchor, 1.0 );
    vec2 px = aQuad.xy + position.xy * aQuad.zw;
    clip.xy += px * 2.0 / uViewport * clip.w;
    gl_Position = clip;
    vUv = aCell.xy + ( position.xy + 0.5 ) * aCell.zw;
    vTint = aTint;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uBright;
  varying vec2 vUv;
  varying vec4 vTint;
  void main() {
    vec4 t = texture2D( uAtlas, vUv );
    float a = t.a * vTint.a;
    if ( a < 0.01 ) discard;
    gl_FragColor = vec4( t.rgb * vTint.rgb * uBright, a );
    #include <colorspace_fragment>
  }
`;

let atlas: THREE.Texture | null | undefined;

/** The uv rect `[u0, v0, du, dv]` of one cell (the texture is flipped: row 0 is the top). */
export function cellRect(cell: StatusCell): [number, number, number, number] {
  const i = Math.max(0, STATUS_CELLS.indexOf(cell));
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const u0 = (col * CELL + INSET) / TEX_W;
  const v0 = 1 - ((row + 1) * CELL - INSET) / TEX_H;
  return [u0, v0, (CELL - 2 * INSET) / TEX_W, (CELL - 2 * INSET) / TEX_H];
}

/** One glyph as a badge: a dark disc, a ring and the glyph in white — tinted as a whole. */
function paintBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, glyph: GlyphId): void {
  ctx.save();
  ctx.fillStyle = 'rgba(11,15,19,0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
  const size = 34;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(GLYPHS[glyph].path), 'evenodd');
  ctx.restore();
}

/** A bare glyph (the pip) with a dark outline, so it reads on any ground. */
function paintBare(ctx: CanvasRenderingContext2D, cx: number, cy: number, glyph: GlyphId): void {
  ctx.save();
  const size = CELL - 12;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  const path = new Path2D(GLYPHS[glyph].path);
  ctx.strokeStyle = 'rgba(11,15,19,0.95)';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.fillStyle = '#ffffff';
  ctx.fill(path, 'evenodd');
  ctx.restore();
}

/**
 * **The glyph atlas** — painted once per page, the first time a field is built,
 * from `status.ts`'s path data. `null` where there is no DOM (`node --test`), in
 * which case the field still lays out and binds, and simply samples nothing.
 */
export function statusAtlas(): THREE.Texture | null {
  if (atlas !== undefined) return atlas;
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return (atlas = null);
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return (atlas = null);
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  STATUS_CELLS.forEach((cell, i) => {
    const cx = (i % COLS) * CELL + CELL / 2;
    const cy = Math.floor(i / COLS) * CELL + CELL / 2;
    if (cell === 'solid') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
    } else if (cell === 'pip') {
      paintBare(ctx, cx, cy, cell);
    } else {
      paintBadge(ctx, cx, cy, cell);
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  initTexture(texture, null);
  return (atlas = texture);
}

/** One strip's record: the instances it owns and where they hang. Pooled, never built in the loop. */
interface Strip {
  cardId: number;
  x: number;
  y: number;
  z: number;
  bobAmp: number;
  bobHz: number;
  start: number;
  count: number;
}

export class StatusField {
  readonly mesh: THREE.InstancedMesh;
  readonly capacity: number;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly anchors: THREE.InstancedBufferAttribute;
  private readonly quadsAttr: THREE.InstancedBufferAttribute;
  private readonly cells: THREE.InstancedBufferAttribute;
  private readonly tints: THREE.InstancedBufferAttribute;
  private readonly strips: Strip[] = [];
  private stripCount = 0;
  private committed: StatusLayout | null = null;
  /** Scratch for {@link track}: the renderer's current viewport, physical px. */
  private readonly viewport = new THREE.Vector4();

  constructor(capacity = STATUS_CAPACITY) {
    this.capacity = capacity;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.anchors = attribute(capacity, 3);
    this.quadsAttr = attribute(capacity, 4);
    this.cells = attribute(capacity, 4);
    this.tints = attribute(capacity, 4);
    this.geometry.setAttribute('aAnchor', this.anchors);
    this.geometry.setAttribute('aQuad', this.quadsAttr);
    this.geometry.setAttribute('aCell', this.cells);
    this.geometry.setAttribute('aTint', this.tints);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uAtlas: { value: statusAtlas() },
        uViewport: { value: new THREE.Vector2(1600, 1000) },
        uBright: { value: BRIGHT },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'status:strips';
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = STATUS_ORDER;
    // Never a click target: `HitProxy` is the only thing the raycaster sees.
    this.mesh.raycast = () => {};
    // The viewport a pixel quad is measured against, read as the mesh is drawn:
    // the canvas, the composer's target, or one half of the workshop's split view.
    this.mesh.onBeforeRender = (renderer) => {
      this.track(renderer);
    };
    for (let i = 0; i < STRIP_CAPACITY; i++) {
      this.strips.push({ cardId: -1, x: 0, y: 0, z: 0, bobAmp: 0, bobHz: 0, start: 0, count: 0 });
    }
  }

  /**
   * **The viewport a pixel quad is measured against**, in CSS pixels — read from
   * the renderer as the mesh is drawn (`onBeforeRender`), because it is not
   * always the canvas: the workshop's split view draws each seat into one half
   * of it, the composer draws into a target, and the DPR governor moves the
   * pixel ratio. `getCurrentViewport` is in physical pixels, so it is divided by
   * the ratio. Two numbers into a preallocated uniform; nothing is allocated.
   */
  track(renderer: THREE.WebGLRenderer): void {
    renderer.getCurrentViewport(this.viewport);
    const ratio = renderer.getPixelRatio() || 1;
    (this.material.uniforms['uViewport']!.value as THREE.Vector2).set(
      Math.max(1, this.viewport.z / ratio),
      Math.max(1, this.viewport.w / ratio),
    );
  }

  /**
   * **Once per snapshot** (`FigureLayer`): every strip's quads into the buffers,
   * and a record per strip for the frame loop. The anchors are written here at
   * rest and again by {@link bind} with each card's live offset.
   */
  commit(layout: StatusLayout): void {
    if (layout === this.committed) return;
    this.committed = layout;
    const quad = this.quadsAttr.array as Float32Array;
    const cell = this.cells.array as Float32Array;
    const tint = this.tints.array as Float32Array;
    const anchor = this.anchors.array as Float32Array;
    let n = 0;
    let s = 0;
    for (const pose of layout.values()) {
      if (s >= STRIP_CAPACITY) break;
      if (n + pose.quads.length > this.capacity) break;
      const strip = this.strips[s]!;
      strip.cardId = pose.cardId;
      strip.x = pose.anchor[0];
      strip.y = pose.anchor[1];
      strip.z = pose.anchor[2];
      strip.bobAmp = pose.bobAmp;
      strip.bobHz = pose.bobHz;
      strip.start = n;
      strip.count = pose.quads.length;
      for (const q of pose.quads) {
        quad[n * 4] = q.x;
        quad[n * 4 + 1] = q.y;
        quad[n * 4 + 2] = q.w;
        quad[n * 4 + 3] = q.h;
        const rect = cellRect(q.cell);
        cell[n * 4] = rect[0];
        cell[n * 4 + 1] = rect[1];
        cell[n * 4 + 2] = rect[2];
        cell[n * 4 + 3] = rect[3];
        const colour = parsedColour(q.colour);
        tint[n * 4] = colour.r;
        tint[n * 4 + 1] = colour.g;
        tint[n * 4 + 2] = colour.b;
        tint[n * 4 + 3] = q.alpha;
        anchor[n * 3] = strip.x;
        anchor[n * 3 + 1] = strip.y;
        anchor[n * 3 + 2] = strip.z;
        n += 1;
      }
      s += 1;
    }
    this.stripCount = s;
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.quadsAttr.needsUpdate = true;
    this.cells.needsUpdate = true;
    this.tints.needsUpdate = true;
    this.anchors.needsUpdate = true;
  }

  /**
   * **Once a frame, from `DiscField.bind`** (so from `CueRunner`'s one loop): each
   * strip's anchor plus its card's live offset and its hover bob. Writes numbers
   * into the preallocated buffer; allocates nothing.
   */
  bind(offsets: OffsetSource, seconds: number): void {
    const count = this.stripCount;
    if (count === 0) return;
    const anchor = this.anchors.array as Float32Array;
    for (let s = 0; s < count; s++) {
      const strip = this.strips[s]!;
      const offset = offsets.offsetOf(strip.cardId);
      const bob = strip.bobAmp > 0 ? strip.bobAmp * Math.sin(seconds * 2 * Math.PI * strip.bobHz) : 0;
      const x = strip.x + offset.dx;
      const y = strip.y + offset.dy + bob;
      const z = strip.z + offset.dz;
      const end = strip.start + strip.count;
      for (let i = strip.start; i < end; i++) {
        anchor[i * 3] = x;
        anchor[i * 3 + 1] = y;
        anchor[i * 3 + 2] = z;
      }
    }
    this.anchors.needsUpdate = true;
  }

  /** §8.3 rule 3's warm-up: the program is compiled at mount (`FigureLayer`), not on the first strip. */
  setPrimeVisible(on: boolean): void {
    this.mesh.visible = on || this.mesh.count > 0;
  }

  /** Quads drawn — `?glinfo=1`'s census. */
  drawn(): number {
    return this.mesh.count;
  }

  /** Strips drawn — `?glinfo=1`'s census. */
  stripsDrawn(): number {
    return this.stripCount;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function attribute(capacity: number, size: number): THREE.InstancedBufferAttribute {
  const attr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
  attr.setUsage(THREE.DynamicDrawUsage);
  return attr;
}

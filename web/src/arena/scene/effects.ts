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

import type { Effect, EffectKind } from '../cues/stage.ts';
import { UNIT_PLANE } from './geometry.ts';
import { SPRITE_ASPECT, textTexture } from './numberSprite.ts';
import { initTexture } from './useCardTexture.ts';

/**
 * How many of each primitive exist. The **total** live at once is capped at 8
 * by `MAX_LIVE_EFFECTS` in `cues/stage.ts`, so these are generous by design:
 * a slot that is never used costs one invisible mesh.
 */
const POOL = { glow: 6, ring: 6, beam: 3, particles: 2, text: 6, plate: 3 } as const;

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
// Slots
// ---------------------------------------------------------------------------

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
  bind(
    effects: ReadonlyMap<string, Effect>,
    resolve: (ref: Effect['at']) => [number, number, number] | null,
    camera: THREE.Camera,
  ): void {
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
      this.#apply(slot, effect, resolve, camera);
    }
    for (const slot of this.#slots) {
      if (slot.gen === gen) continue;
      slot.object.visible = false;
      slot.material.opacity = 0;
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
    material.color?.set(effect.colour);

    switch (effect.kind) {
      case 'glow': {
        object.position.set(at[0], at[1] + 0.02, at[2]);
        object.quaternion.copy(camera.quaternion);
        object.scale.setScalar(effect.radius * (0.8 + 0.4 * strength));
        break;
      }
      case 'ring': {
        object.position.set(at[0], at[1] + 0.004, at[2]);
        object.rotation.set(FLAT, 0, effect.spin ?? 0);
        object.scale.set(effect.radius * 2, effect.radius * 2, 1);
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
        this.#a.set(at[0], at[1] + 0.05, at[2]);
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
      case 'particles': {
        const points = object as THREE.Points;
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const spread = effect.radius * (0.35 + 1.6 * (effect.burst ?? 0.5));
        const array = attr.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          array[i * 3] = at[0] + this.#seeds[i * 3]! * spread;
          array[i * 3 + 1] = at[1] + this.#seeds[i * 3 + 1]! * spread + 0.05;
          array[i * 3 + 2] = at[2] + this.#seeds[i * 3 + 2]! * spread;
        }
        attr.needsUpdate = true;
        break;
      }
      default:
        object.visible = false;
    }
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

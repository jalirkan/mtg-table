/*
 * mtg-table — arena/scene/tiles.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The terrain, as three `InstancedMesh`es and one rim** (report 13 §5.2, §5.3;
 * user decision 5).
 *
 * Every land on the table is a shallow, procedurally extruded **rounded
 * rectangle** — not a hex tile — sized to the card footprint plus a margin, with
 * the card lying on top of it. All the tiles of one kind are one instance buffer,
 * so the whole terrain of a 21-land board costs **4 draw calls**: a plateau, the
 * water, the neutral slab, and one rim mesh for the two-tone (*Thriving*) lands.
 *
 * ---------------------------------------------------------------------------
 * Three things it deliberately does not do.
 *
 * **It is not lit.** The arena has no lights at all (report 09 §4.3) and §8.3
 * rule 2's hard line is that the *cards* never become lit. A tile is a flat
 * colour with a painted edge, exactly as `Table.tsx`'s felt is.
 *
 * **Water is one program, not one per tile.** It copies `cardMaterial.ts`'s
 * pattern line for line: `onBeforeCompile` plus a **constant**
 * `customProgramCacheKey`, so every water tile in the game shares one compiled
 * program. It is the one new shader Tier 2 writes and the budget is one — Tier 1
 * wrote exactly one too. **No reflections, no render targets, no second camera**:
 * the arena has never rendered the scene twice and must not start.
 *
 * **The water only moves while something else does.** `uTime` is advanced by the
 * frame's `dt` and `CueRunner` passes **0 while the queue is idle** — the same
 * rule as the figures' breathing (§8.3 rule 1, user decision 7). A scrolling
 * surface is precisely the "one always-on motion costs the whole idle budget"
 * trap that `frameloop='demand'` exists to avoid, and still water on an idle
 * table is not a defect.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import type { TileLayout } from '../figures/tiles.ts';
import { TILE_KINDS, type TileKind } from '../figures/types.ts';
import { CARD_W } from '../layout.ts';
import type { OffsetSource } from './discs.ts';

/** Report 13 §2's measured ceiling is 21 lands in one frame; 24 is that with room. */
export const TILE_CAPACITY = 24;

/**
 * §5.1 — the footprint, and it is **the rank pitch rather than the card**.
 *
 * `RANK_PITCH` is `CARD_W + 0.08`, so a tile 0.075 wider than a card leaves a
 * 5 mm gutter between neighbours and a row of lands reads as a **paved strip**
 * rather than as six separate coasters. That is the whole difference between
 * "the card is sitting on something" and "this part of the table is Plains".
 */
const TILE_W = CARD_W + 0.075;
const TILE_D = 1.22;
const TILE_H = 0.06;
const TILE_RADIUS = 0.07;

/**
 * **Where the top face of a tile sits, and it is measured from the TABLE and not
 * from the card.**
 *
 * §5.1 writes the tile as `y ∈ [−0.06, +0.004]` — a slab set *into* the table,
 * with only its top face above the felt — and the first build read that as a drop
 * from the card's own y. The land anchor is at `y = 0.006` (`layout.ts`), so
 * dropping 0.055 from it put the **whole tile at −0.049, underneath the table
 * quad**, and 17 tiles rendered in three draw calls that nothing could see.
 * Measured 2026-09-26 in headless Chromium: `gl.info.render.calls` went to 62 and
 * the board looked exactly like T2's.
 *
 * Terrain does not stack, so this is a constant: a wrapped rank's back row lifts
 * its *cards* by `RANK_WRAP_Y` and its tiles stay on the ground.
 */
const TILE_TOP_Y = 0.0035;

/** A spent land is dimmed rather than recoloured (§5.3). Pose, not cue. */
const TAPPED_DIM = 0.42;

/**
 * The rim band of a two-tone land. Wider in z than in x, because x is where the
 * neighbours are: at the rank pitch a symmetric 1.16 would overlap the tile next
 * door, and the *Thriving* lands are the only users.
 */
const RIM_SCALE_X = 1.05;
const RIM_SCALE_Z = 1.12;

const CACHE_KEY = 'mtg-table/tile-water/1';

// ---------------------------------------------------------------------------
// The geometry: one rounded slab, shared by every tile of every kind
// ---------------------------------------------------------------------------

/**
 * A rounded rectangle, extruded and laid flat.
 *
 * Built once at module scope and shared by all three kinds, which is what makes
 * the whole terrain three buffers rather than 21 (`geometry.ts` makes the same
 * argument for the card quad). The extrusion runs along +Z and is then rotated
 * onto the table, so the instance matrix only ever has to scale and place it.
 */
function slabGeometry(width: number, depth: number, height: number, radius: number): THREE.BufferGeometry {
  const r = Math.min(radius, width / 2, depth / 2);
  const x = width / 2;
  const z = depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -z);
  shape.lineTo(x - r, -z);
  shape.quadraticCurveTo(x, -z, x, -z + r);
  shape.lineTo(x, z - r);
  shape.quadraticCurveTo(x, z, x - r, z);
  shape.lineTo(-x + r, z);
  shape.quadraticCurveTo(-x, z, -x, z - r);
  shape.lineTo(-x, -z + r);
  shape.quadraticCurveTo(-x, -z, -x + r, -z);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: height * 0.35,
    bevelSize: radius * 0.45,
    bevelSegments: 1,
    curveSegments: 3,
  });
  geometry.rotateX(-Math.PI / 2);
  /**
   * **Put the real top face at y = 0, and measure it rather than computing it.**
   *
   * `ExtrudeGeometry`'s `bevelThickness` extends the extrusion *beyond* `depth`
   * at both ends, so a "0.06 tall" slab with a 0.021 bevel is 0.102 tall and its
   * top is 0.021 above where `translate(0, -depth, 0)` puts it. That is 2.1 cm of
   * world in a game whose card sits 6 mm off the table: the tiles drew **over**
   * every land on the board — 17 rounded rectangles where the Plains and Islands
   * should be, photographed at g1 frame 355 on 2026-09-26. The bounding box is
   * the only thing that knows, so ask it.
   */
  geometry.computeBoundingBox();
  geometry.translate(0, -(geometry.boundingBox?.max.y ?? height), 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

const SLAB = slabGeometry(TILE_W, TILE_D, TILE_H, TILE_RADIUS);
/** The rim is the same slab, thinner, so the two share nothing but a shape. */
const RIM = slabGeometry(TILE_W, TILE_D, TILE_H * 0.5, TILE_RADIUS);

// ---------------------------------------------------------------------------
// The one new shader
// ---------------------------------------------------------------------------

export interface WaterUniforms {
  uTime: { value: number };
}

/**
 * **Water**: a scrolling two-band distortion of the instance colour, injected
 * into a stock `MeshBasicMaterial`.
 *
 * `cardMaterial.ts`'s three safety rules, kept exactly:
 *
 *  1. the whole effect is inside the shader and the steady state is one `sin`
 *     per fragment — there is no branch to get wrong;
 *  2. `customProgramCacheKey` is a **constant**, so every water tile shares one
 *     compiled program (`WebGLPrograms.js` includes it in the key);
 *  3. it reads `vInstanceColor`-free: the colour arrives through three's own
 *     `USE_INSTANCING_COLOR` chunk, so nothing here depends on a chunk that may
 *     not be compiled in.
 */
function waterMaterial(): { material: THREE.MeshBasicMaterial; uniforms: WaterUniforms } {
  const uniforms: WaterUniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshBasicMaterial({ toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = uniforms.uTime;
    shader.vertexShader = 'varying vec3 mtgPos;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  mtgPos = transformed;',
    );
    shader.fragmentShader =
      'uniform float uTime;\nvarying vec3 mtgPos;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float mtgW = sin( mtgPos.x * 11.0 + uTime * 1.35 ) * 0.5
                 + sin( mtgPos.z * 8.0 - uTime * 0.9 ) * 0.5;
      diffuseColor.rgb *= 0.82 + 0.26 * mtgW;
      diffuseColor.rgb += vec3( 0.06, 0.10, 0.14 ) * max( 0.0, mtgW );`,
    );
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return { material, uniforms };
}

function flatMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ toneMapped: false });
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

/** §9.2 rule 6 — scratch at module scope, never inside the frame loop. */
const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const EULER = new THREE.Euler();
const SCALE = new THREE.Vector3();
const COLOUR = new THREE.Color();
const GLOW = new THREE.Color();

interface Bucket {
  kind: TileKind | 'rim';
  mesh: THREE.InstancedMesh;
  count: number;
}

export class TileField {
  readonly group = new THREE.Group();
  readonly capacity: number;
  readonly #buckets: Bucket[] = [];
  #water: WaterUniforms = { uTime: { value: 0 } };

  constructor(capacity = TILE_CAPACITY) {
    this.capacity = capacity;
    this.group.name = 'arena-tiles';
    this.#build();
  }

  /**
   * Build the buckets. Separate from the constructor because {@link dispose} can
   * be called on a field that is about to be used again — see {@link bind}.
   */
  #build(): void {
    const water = waterMaterial();
    this.#water = water.uniforms;
    for (const kind of TILE_KINDS) {
      this.#add(kind, SLAB, kind === 'water' ? water.material : flatMaterial());
    }
    // One rim mesh for every two-tone land on the table, whatever kind it is:
    // the band is a colour, and a colour is per-instance and free.
    this.#add('rim', RIM, flatMaterial());
  }

  #add(kind: TileKind | 'rim', geometry: THREE.BufferGeometry, material: THREE.Material): void {
    const mesh = new THREE.InstancedMesh(geometry, material, this.capacity);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.renderOrder = kind === 'rim' ? -6 : -5;
    // A tile is never a click target, for the reason a figure is not (§3.10 rule
    // 2): `HitProxy` sits at `layout(state)` and is the only thing the raycaster
    // sees. A tile is also *under* the card whose click it would steal.
    mesh.raycast = () => {};
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.capacity * 3),
      3,
    );
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    this.#buckets.push({ kind, mesh, count: 0 });
  }

  /**
   * Write this frame's terrain. Called once per frame from `CueRunner`'s single
   * `useFrame` and from nowhere else.
   *
   * **`dt` is 0 while the queue is idle**, which is the whole of the water's
   * budget discipline — see the file header.
   *
   * The cue lane reaches the terrain through one field and one only:
   * `offset.glow`, which `land.tap` and `land.untap` write on the *card*. That is
   * deliberate — a tile has no cue of its own and no id of its own, so there is
   * nothing here for a cue to address, and "the land lit up when it was spent" is
   * carried by the same offset that turned the card.
   */
  bind(tiles: TileLayout, offsets: OffsetSource, dt: number): void {
    // **A disposed field rebuilds itself, and this is not defensive
    // programming** — it is `effects.ts`'s documented defect, hit again by the
    // next pool to be written. `<StrictMode>` mounts, cleans up and re-mounts
    // every component in development, so `useEffect(() => () =>
    // tileField.dispose(), [tileField])` runs `dispose()` on the field the
    // re-mounted tree then goes on using: `#buckets` is empty, the group is
    // cleared, and **not one tile is drawn** while the cards and the figures
    // (which are meshes, not buckets) keep working perfectly. Measured
    // 2026-09-26 in headless Chromium: `tileField.counts()` returned `{}` and
    // `gl.info.render.calls` was T2's 59 rather than T4's 62.
    if (this.#buckets.length === 0) this.#build();
    this.#water.uTime.value += dt;
    for (const bucket of this.#buckets) bucket.count = 0;

    for (const tile of tiles.values()) {
      const bucket = this.#bucketFor(tile.kind);
      if (bucket === null || bucket.count >= this.capacity) continue;
      const offset = offsets.offsetOf(tile.cardId);
      POSITION.set(
        tile.position[0] + offset.dx,
        TILE_TOP_Y + offset.dy,
        tile.position[2] + offset.dz,
      );
      EULER.set(0, tile.rotationY, 0);
      QUATERNION.setFromEuler(EULER);
      SCALE.set(1, 1, 1);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      bucket.mesh.setMatrixAt(bucket.count, MATRIX);

      COLOUR.set(tile.tint);
      // **Tapped is a pose** (§5.3): the tile dims, so a board scrubbed to
      // mid-turn shows exactly the lands that are spent, with no cue history.
      if (tile.tapped) COLOUR.multiplyScalar(TAPPED_DIM);
      if (offset.glow > 0 && offset.glowColour !== null) {
        COLOUR.lerp(GLOW.set(offset.glowColour), Math.min(0.55, offset.glow * 0.5));
        COLOUR.multiplyScalar(1 + Math.min(0.6, offset.glow * 0.45));
      }
      bucket.mesh.setColorAt(bucket.count, COLOUR);
      bucket.count += 1;

      if (tile.rim === null) continue;
      const rim = this.#buckets[this.#buckets.length - 1]!;
      if (rim.count >= this.capacity) continue;
      // A hair lower, so the tile sits ON the band rather than z-fighting it.
      POSITION.y -= 0.0012;
      SCALE.set(RIM_SCALE_X, 1, RIM_SCALE_Z);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      rim.mesh.setMatrixAt(rim.count, MATRIX);
      COLOUR.set(tile.rim);
      if (tile.tapped) COLOUR.multiplyScalar(TAPPED_DIM);
      rim.mesh.setColorAt(rim.count, COLOUR);
      rim.count += 1;
    }

    for (const bucket of this.#buckets) {
      bucket.mesh.count = bucket.count;
      bucket.mesh.instanceMatrix.needsUpdate = true;
      if (bucket.mesh.instanceColor !== null) bucket.mesh.instanceColor.needsUpdate = true;
    }
  }

  #bucketFor(kind: TileKind): Bucket | null {
    for (const bucket of this.#buckets) {
      if (bucket.kind === kind) return bucket;
    }
    return null;
  }

  /** How many instances each bucket drew last frame — the draw-call evidence. */
  counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const bucket of this.#buckets) out[bucket.kind] = bucket.count;
    return out;
  }

  dispose(): void {
    for (const bucket of this.#buckets) {
      bucket.mesh.dispose();
      (bucket.mesh.material as THREE.Material).dispose();
    }
    this.#buckets.length = 0;
    this.group.clear();
  }
}

/*
 * mtg-table — arena/standee.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The portrait standee, as pure data** (**D260**–**D264**; the personal
 * tier is **D190**, its relief cache **D225**–**D228**).
 *
 * The likeness experiment's one clear result (report 15 §8, the likeness
 * evidence §10) was that a relief cut from the card's OWN painting reads better
 * at figure size than anything image-to-3D made. The relief cache already holds,
 * for every card in `art.json`, a depth map of the painting (red the front
 * layer's depth, green the back layer's, blue the front's keep mask) and the
 * back layer's colour. A STANDEE is that painting's near subjects cut out and
 * stood on the table at a face-up creature's stand point — the personal tier's
 * second renderer path, drawn from the Vite dev server alone, where no personal
 * model dresses the card, in place of its CC0 body.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock, no request
 * (`liveness.test.ts`): everything that decides here is `node --test`'s.
 *
 *  - {@link standeeCutOf} is THE definition of the cut, measured once per map
 *    by the dev route (Node, `web/src/personal/devRoute.ts`) from the map's own
 *    pixels: the box round the painting's near subjects and the depth at which a
 *    texel is near. {@link STANDEE_FRAGMENT} draws exactly that test, texel by
 *    texel.
 *  - {@link standeeChoicesOf} is THE lookup, and hard rule 8's renderer half for
 *    this second card-art surface (D264): a standee only where `figurePose`
 *    placed a NAMED figure a CC0 body would stand in, on a placement drawn face
 *    up that is not a redacted stub, that no personal model has taken — all
 *    decided before the card's name is read — and then only through the SAME art
 *    lookup `CardPlane` uses (`art.ts`'s `artEntryFor`), whose print's Scryfall id
 *    is the one key the relief index is asked about.
 *  - {@link standeeLegibilityAt} is THE legibility floor (D261, amended by the
 *    fix pass): a standee stands only where its subject, kneeling, reads at 1×
 *    from the table view — measured on the stand point, as the vertex shader
 *    poses it — and the lookup applies it last, so a sliver is the CC0 body.
 *  - {@link dressStandees} makes a choice a pose once its textures have LOADED:
 *    an opaque id (`s0`, `s1`, …), no props, no costume, no hair, no resting
 *    pose, and the height refitted to the cut's own aspect — the width clamp
 *    stays strict (D65).
 *  - {@link STANDEE_STANCES} is how the snapshot's stances read on a body with
 *    no rig (D262), and {@link standeeFallOf} the death's fall.
 */

import { artEntryFor, imageUrl, type ArtIndex } from '../art.ts';
import { isHidden } from '../protocol.ts';
import { VIEW_BY_ID, projectToNdc } from './camera.ts';
import { fitHeight, type FigureLayout, type FigurePose } from './figures/pose.ts';
import type { Stance } from './figures/types.ts';
import type { Layout, Placement } from './layout.ts';
import {
  RELIEF_CLIFF,
  STANDEE_BACK_GRID,
  STANDEE_GRID,
  STANDEE_LEGIBLE_CANVAS,
  STANDEE_MIN_PX,
  STANDEE_MIN_SHARE,
  STANDEE_PAD_PX,
} from './perf.ts';
import type { ReliefEntry, ReliefIndex, StandeeCut } from './relief.ts';

// ---------------------------------------------------------------------------
// The cut (D260): measured once per map, from its own pixels
// ---------------------------------------------------------------------------

/** The art box's edge pixels a cut never reaches: the card frame's line (measured, D228's `margin` note). */
const FRAME_LINE_PX = 2;

/**
 * **THE cut** — where a standee is cut from its painting, from the relief map's
 * pixels (`channels` 3 or 4, rows top-down, 8 bits; `personal/relief/<id>.png`).
 *
 * A texel is an OCCLUDER when the front keeps it (blue ≥ 128, D228's keep mask)
 * and it stands nearer than the far side it hides (green) by more than
 * `RELIEF_CLIFF` — exactly `relief_depth.py`'s own test for a subject, read back
 * off the two layers it wrote. The occluders' box (their 1st to 99th percentile
 * across and down, padded {@link STANDEE_PAD_PX}) is the standee's crop; the
 * median of what they hide, plus the cliff, is how NEAR a texel must be. A texel
 * of the crop is the SUBJECT when the front keeps it and it is an occluder or at
 * least that near — so a subject's interior past an orbit's reach (where green
 * eases back to the painting's own depth, D228) is still solid, and a far wall
 * behind it is not. `share` is the subject's share of the whole art box; under
 * {@link STANDEE_MIN_SHARE} (a landscape, a flat map) there is no standee.
 *
 * Measured on the deck's paintings (docs/evidence/standee.md §1): the
 * occluder test alone holes a subject whose interior is past the back layer's
 * reach (Peggy's torso, the Hulk's chest); the depth test alone keeps the floor
 * a subject stands on across the whole painting (Okoye's, Moonstone's); inside
 * the occluders' box, the two together keep the figure and what it holds.
 */
export function standeeCutOf(px: Uint8Array, width: number, height: number, channels: number): StandeeCut | null {
  if (width <= 0 || height <= 0 || channels < 3 || px.length < width * height * channels) return null;
  const cliff = RELIEF_CLIFF * 255;
  const xs = new Uint32Array(width);
  const ys = new Uint32Array(height);
  const hidden = new Uint32Array(256);
  let occluders = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = px[i]!;
      const g = px[i + 1]!;
      const b = px[i + 2]!;
      if (b < 128 || r - g <= cliff) continue;
      occluders += 1;
      xs[x]! += 1;
      ys[y]! += 1;
      hidden[g]! += 1;
    }
  }
  if (occluders === 0) return null;
  const at = (counts: Uint32Array, fraction: number): number => {
    const want = fraction * occluders;
    let seen = 0;
    for (let k = 0; k < counts.length; k++) {
      seen += counts[k]!;
      if (seen > want) return k;
    }
    return counts.length - 1;
  };
  // Never the art box's outermost pixels: its first row and column are the card
  // frame's black line (D228's margin skips them too).
  const x0 = Math.max(FRAME_LINE_PX, at(xs, 0.01) - STANDEE_PAD_PX);
  const x1 = Math.min(width - 1 - FRAME_LINE_PX, at(xs, 0.99) + STANDEE_PAD_PX);
  const y0 = Math.max(FRAME_LINE_PX, at(ys, 0.01) - STANDEE_PAD_PX);
  const y1 = Math.min(height - 1 - FRAME_LINE_PX, at(ys, 0.99) + STANDEE_PAD_PX);
  if (x1 <= x0 || y1 <= y0) return null;
  const nearByte = Math.min(255, at(hidden, 0.5) + cliff);
  let subject = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * channels;
      const r = px[i]!;
      if (px[i + 2]! < 128) continue;
      if (r - px[i + 1]! > cliff || r >= nearByte) subject += 1;
    }
  }
  const share = subject / (width * height);
  if (share < STANDEE_MIN_SHARE) return null;
  const round = (v: number): number => Math.round(v * 1e4) / 1e4;
  return {
    box: { left: round(x0 / width), right: round((x1 + 1) / width), top: round(y0 / height), bottom: round((y1 + 1) / height) },
    near: round(nearByte / 255),
    share: round(share),
  };
}

/** The cut's aspect in the painting's own pixels (width over height): a standee is this wide per unit of height. */
export function standeeAspectOf(entry: Pick<ReliefEntry, 'width' | 'height'>, cut: StandeeCut): number {
  const w = (cut.box.right - cut.box.left) * entry.width;
  const h = (cut.box.bottom - cut.box.top) * entry.height;
  return h > 0 ? w / h : 0;
}

/** How much of the cut's own box its subject fills (0–1): `share` is of the whole art box. */
export function standeeFillOf(cut: StandeeCut): number {
  const area = (cut.box.right - cut.box.left) * (cut.box.bottom - cut.box.top);
  return area > 0 ? Math.min(1, cut.share / area) : 0;
}

// ---------------------------------------------------------------------------
// THE legibility floor (D261, amended by the fix pass)
// ---------------------------------------------------------------------------

/** What a standee's subject measures on screen: the side of a square of its drawn area, and its drawn height (px). */
export interface StandeeLegibility {
  size: number;
  height: number;
}

/**
 * **How a standee reads from the table** — its subject as drawn at 1× from the
 * table view (`camera.ts`'s `table`, the {@link STANDEE_LEGIBLE_CANVAS}) at its
 * own stand point, posed exactly as `STANDEE_VERTEX` poses it: turned to the
 * camera about the vertical (D261), `height` tall and `aspect` wide per unit of
 * it, in `stance` (its bow about its base, its sink cut at the table's plane).
 * `size` is the side of a square of the subject's drawn pixels (the box's drawn
 * area × `fill`), `height` the box's drawn height. `web/test/standee.test.ts`
 * rasterises the same standee through the same camera and holds the two equal.
 */
export function standeeLegibilityAt(
  stand: readonly [number, number, number],
  height: number,
  aspect: number,
  fill: number,
  stance: StandeeStance = STANDEE_STANCES.crouch,
): StandeeLegibility {
  const cam = VIEW_BY_ID.table.pose;
  const [pxW, pxH] = STANDEE_LEGIBLE_CANVAS;
  let fx = cam.position[0] - stand[0];
  let fz = cam.position[2] - stand[2];
  const len = Math.hypot(fx, fz);
  if (!(len > 0) || !(height > 0) || !(aspect > 0)) return { size: 0, height: 0 };
  fx /= len;
  fz /= len;
  const c = Math.cos(stance.lean);
  const sn = Math.sin(stance.lean);
  // The part under the table is cut (the fragment shader's `vAbove`): the box from there up.
  const from = Math.min(1, Math.max(0, stance.sink / c));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [u, v] of [
    [-0.5, from],
    [0.5, from],
    [0.5, 1],
    [-0.5, 1],
  ] as const) {
    const x = u * aspect;
    const y = v * c - stance.sink;
    const z = -v * sn;
    // right = (front.z, 0, -front.x): `STANDEE_VERTEX`'s basis.
    const ndc = projectToNdc(cam, [stand[0] + height * (fz * x + fx * z), stand[1] + height * y, stand[2] + height * (-fx * x + fz * z)], undefined, pxW / pxH);
    if (ndc === null) return { size: 0, height: 0 };
    xs.push(((ndc[0] + 1) / 2) * pxW);
    ys.push(((1 - ndc[1]) / 2) * pxH);
  }
  let twice = 0;
  for (let i = 0; i < 4; i++) twice += xs[i]! * ys[(i + 1) % 4]! - xs[(i + 1) % 4]! * ys[i]!;
  return { size: Math.sqrt((Math.abs(twice) / 2) * Math.max(0, fill)), height: Math.max(...ys) - Math.min(...ys) };
}

/** **Does it read** — the floor, kneeling, at the pose's stand point and its height refitted to the cut (D65 strict). */
export function standeeReads(pose: Pick<FigurePose, 'position' | 'height'>, aspect: number, fill: number): boolean {
  return standeeLegibilityAt(pose.position, fitHeight(pose.height, aspect), aspect, fill).size >= STANDEE_MIN_PX;
}

// ---------------------------------------------------------------------------
// THE lookup (D264: hard rule 8's renderer half for a second card-art surface)
// ---------------------------------------------------------------------------

/** One card's standee, chosen: what the loader fetches and what the pose is cut to. */
export interface StandeeChoice {
  /**
   * The print's Scryfall id — the loader's key, and the one thing the relief
   * index was asked about. It never reaches a pose (a dressed pose carries an
   * opaque `s<n>`), an op log, a label or the wire.
   */
  key: string;
  /** The card image — `imageUrl(entry, 'normal')`, the very URL `CardPlane` draws, so one texture. */
  image: string;
  /** The dev route's address of the map and of the back layer's colour. */
  map: string;
  back: string;
  entry: ReliefEntry;
  cut: StandeeCut;
}

/**
 * **Whether this figure may stand as a standee at all** — decided from the pose
 * and the placement BEFORE any name is read: a named figure a CC0 body would
 * stand in (a model, not the anonymous figure, not a disc, not a swarm, not a
 * silhouette, not an uncrewed vehicle), not already dressed in a personal model,
 * on a placement drawn face up that is not a redacted stub.
 */
export function mayStand(placement: Placement, pose: FigurePose): boolean {
  if (pose.anonymous || pose.modelId === null || pose.silhouette !== null || pose.swarm > 0 || pose.vehicle) return false;
  if (pose.personal !== undefined) return false;
  if (placement.back || isHidden(placement.card)) return false;
  return true;
}

export interface StandeeOptions {
  /**
   * The dev route's relief prefix (`scene/reliefCache.ts`'s `RELIEF_BASE`): `null` in
   * a build — and with the tier off (`?personal=0`) or the standee off
   * (`?standee=0`) — and then nothing stands.
   */
  base: string | null;
  /** Cards a personal model has taken (`personalChoicesOf`): the model wins, loaded or loading (D260). */
  taken?: ReadonlyMap<number, unknown>;
}

/**
 * **THE lookup** — card id → the standee it may stand as. Placements in layout
 * order, each card once (the ranks before the stack, as `figurePose` reads them).
 * The art index is asked only after {@link mayStand} has passed — through
 * `artEntryFor`, `CardPlane`'s own lookup — and the relief index only with the
 * print that lookup answered: that ordering IS hard rule 8 here
 * (`standee.test.ts` sweeps the corpus made hostile, with an ungated control).
 * No cap of its own: a standee stands only where a CC0 body would, and those are
 * `MAX_FIGURES` already (D263). Last, THE legibility floor ({@link standeeReads}):
 * a cut that would not read kneeling at its stand point stands as its CC0 body.
 */
export function standeeChoicesOf(
  placed: Layout,
  poses: FigureLayout,
  art: ArtIndex,
  relief: ReliefIndex,
  options: StandeeOptions,
): ReadonlyMap<number, StandeeChoice> {
  const out = new Map<number, StandeeChoice>();
  const base = options.base;
  if (base === null || relief.byId.size === 0) return out;
  const seen = new Set<number>();
  for (const placement of placed.placements) {
    if (placement.kind !== 'creature' && placement.kind !== 'stack') continue;
    if (seen.has(placement.cardId)) continue;
    seen.add(placement.cardId);
    if (options.taken?.has(placement.cardId) === true) continue;
    const pose = poses.get(placement.cardId);
    if (pose === undefined || !mayStand(placement, pose)) continue;
    const hit = artEntryFor(art, placement.card);
    if (hit === null || hit.scryfallId === '') continue;
    const entry = relief.byId.get(hit.scryfallId);
    if (entry === undefined || entry.standee === null) continue;
    // THE legibility floor (D261, amended): a standee that would not read from
    // the table — kneeling, at 1× from the table view — is the CC0 body.
    if (!standeeReads(pose, standeeAspectOf(entry, entry.standee), standeeFillOf(entry.standee))) continue;
    out.set(placement.cardId, {
      key: hit.scryfallId,
      image: imageUrl(hit, 'normal'),
      map: `${base}${entry.file}`,
      back: `${base}${entry.back.file}`,
      entry,
      cut: entry.standee,
    });
  }
  return out;
}

/** What the loader measured of a loaded standee: its opaque id and its cut's aspect. */
export interface StandeeFit {
  /** Opaque (`s0`, `s1`, … in load order): never a Scryfall id, a file or a name. */
  id: string;
  aspect: number;
}

/**
 * **The dressed poses** — each chosen figure whose standee has LOADED becomes
 * that standee's pose: the opaque id, no props, no costume, no hair, no resting
 * pose (a painting has no rig to rest), and its height refitted so the cut's own
 * width stays inside the rank slot (`fitHeight` from the pose's own height, so it
 * only ever shrinks: D65 strict). A figure whose standee has not loaded keeps its
 * CC0 pose. With nothing to dress, the SAME map comes back.
 */
export function dressStandees(
  poses: FigureLayout,
  choices: ReadonlyMap<number, StandeeChoice>,
  loaded: ReadonlyMap<string, StandeeFit>,
): FigureLayout {
  let out: FigureLayout | null = null;
  for (const [cardId, choice] of choices) {
    const pose = poses.get(cardId);
    const fit = loaded.get(choice.key);
    if (pose === undefined || fit === undefined || !(fit.aspect > 0) || pose.personal !== undefined) continue;
    out ??= new Map(poses);
    const height = fitHeight(pose.height, fit.aspect);
    out.set(cardId, {
      ...pose,
      standee: fit.id,
      props: [],
      costume: null,
      hair: null,
      rest: null,
      height,
      width: height * fit.aspect,
    });
  }
  return out ?? poses;
}

// ---------------------------------------------------------------------------
// The stances on a body with no rig (D262), and the fall (D64's body)
// ---------------------------------------------------------------------------

/**
 * How a standee holds a stance: `lean` (radians, about its base, + BACK — its
 * top away from its front, − a bow toward it) and `sink` (a fraction of its
 * height below the table, cut at the table's plane). A pose, written at commit (never per frame);
 * the summoning-sick translucency is the pose's `opacity`, as a figure's.
 */
export interface StandeeStance {
  lean: number;
  sink: number;
}

/**
 * **The stances** (D262, chosen from pictures at the table's distance and
 * amended by its fix pass, `docs/evidence/standee.md` §4 and §9): a tapped
 * standee KNEELS as a painting can — a fifth of its height sunk into the table
 * and its top bowed 6° toward the lens — so it reads 0.68–0.78 of its standing
 * height from the table view, its silhouette dropping as the CC0 body's kneel
 * does, with its face whole. The first stance (a quarter sunk, 17° of bow) read
 * 0.39–0.59 of it — a sliver: the table view looks down 45–58°, so a bow turns
 * the painting away from it. Leaning BACK was measured and refused: the camera
 * looks down, so a standee leaning back faces it squarely and reads TALLER (into
 * its own status strip), not tapped. THE legibility floor is judged in this
 * stance, the smallest a snapshot draws a standee in. Attacking, blocking and sick stand as they are: the attack is the
 * lunge cue's offset and the combat bands, the block the bands and its tether,
 * sick the pose's translucency (D142's, as a figure's).
 */
export const STANDEE_STANCES: Readonly<Record<Stance, StandeeStance>> = Object.freeze({
  ready: Object.freeze({ lean: 0, sink: 0 }),
  sick: Object.freeze({ lean: 0, sink: 0 }),
  blocking: Object.freeze({ lean: 0, sink: 0 }),
  attacking: Object.freeze({ lean: 0, sink: 0 }),
  crouch: Object.freeze({ lean: -0.1, sink: 0.2 }),
});

/** How far a dying standee has fallen back by its death cue's `t`, radians: flat on its back by 0.7. */
export const STANDEE_FALL = 1.45;
export function standeeFallOf(t: number): number {
  const x = t <= 0 ? 0 : t >= 0.7 ? 1 : t / 0.7;
  return STANDEE_FALL * x * x * (3 - 2 * x);
}

// ---------------------------------------------------------------------------
// The mesh and the program (data and strings; `scene/reliefCache.ts` builds and
// compiles them once, for the page)
// ---------------------------------------------------------------------------

/** The two sheets of THE standee mesh, as buffers: what `scene/reliefCache.ts`'s `standeeGeometry` uploads. */
export interface StandeeSheets {
  positions: number[];
  uvs: number[];
  /** Per vertex: 0 the FRONT, 1 the BACK. */
  layers: number[];
  indices: number[];
}

/**
 * **THE standee mesh, as data** (D263): the BACK sheet (`STANDEE_BACK_GRID`)
 * and the FRONT (`STANDEE_GRID`) in one buffer, told apart per vertex, so a
 * standee is ONE draw call. The positions are placeholders over the unit square
 * (the vertex shader builds every point from the UV, the map and the pose). The
 * back is first in the index, so where the two coincide the front is drawn over
 * it in the same call.
 */
export function standeeSheets(): StandeeSheets {
  const out: StandeeSheets = { positions: [], uvs: [], layers: [], indices: [] };
  const sheet = (cols: number, rows: number, layer: number): void => {
    const first = out.positions.length / 3;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const v = j / rows;
        out.positions.push(u - 0.5, v, 0);
        out.uvs.push(u, v);
        out.layers.push(layer);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = first + j * (cols + 1) + i;
        const b = a + 1;
        const c = a + cols + 1;
        const d = c + 1;
        out.indices.push(a, b, d, a, d, c);
      }
    }
  };
  sheet(STANDEE_BACK_GRID[0], STANDEE_BACK_GRID[1], 1);
  sheet(STANDEE_GRID[0], STANDEE_GRID[1], 0);
  return out;
}

/**
 * **The vertex shader — both layers of one mesh** (D263: one draw call). The
 * shared geometry is two sheets over the cut's box (`aLayer` 0 the FRONT, 1 the
 * BACK). Each vertex reads its layer's depth (red, green) — clamped to the
 * subject's own range (`max(depth, uNear)`), so a triangle that spans a silhouette
 * never stretches back to the painting's background — and stands that far
 * in front of the standee's plane (a bas-relief, `uRelief` of its height at most,
 * along its own front), the back a hair further. Then the stance: a `uLean` about
 * its base and a `uSink` into the table. Then the facing (D261): the standee's
 * front is turned toward the camera about the vertical (`uFaceCamera` 1 — a
 * billboard that stays upright), or it keeps its root's own turn (the pose's
 * `facingY` plus the cue's `dRotY`); the root's scale is its height.
 */
export const STANDEE_VERTEX = /* glsl */ `
  attribute float aLayer;
  uniform sampler2D uDepth;
  uniform vec4 uBox;
  uniform vec4 uArtBox;
  uniform vec4 uBackBox;
  uniform float uAspect;
  uniform float uRelief;
  uniform float uBehind;
  uniform float uNear;
  uniform float uLean;
  uniform float uSink;
  uniform float uFaceCamera;
  varying vec2 vMapUv;
  varying vec2 vArtUv;
  varying vec2 vBackUv;
  varying float vLayer;
  varying float vAbove;
  void main() {
    vec2 mapUv = uBox.xy + uv * uBox.zw;
    vMapUv = mapUv;
    vArtUv = uArtBox.xy + mapUv * uArtBox.zw;
    vBackUv = uBackBox.xy + mapUv * uBackBox.zw;
    vLayer = aLayer;
    vec4 d = texture2D( uDepth, mapUv );
    float depth = max( mix( d.r, d.g, aLayer ), uNear );
    vec3 local = vec3( ( uv.x - 0.5 ) * uAspect, uv.y, ( depth - 1.0 ) * uRelief - aLayer * uBehind );
    float c = cos( uLean );
    float s = sin( uLean );
    vec3 posed = vec3( local.x, local.y * c + local.z * s - uSink, local.z * c - local.y * s );
    vAbove = posed.y;
    vec3 origin = modelMatrix[3].xyz;
    float scale = length( modelMatrix[1].xyz );
    vec3 own = modelMatrix[2].xyz;
    own.y = 0.0;
    vec3 toEye = cameraPosition - origin;
    toEye.y = 0.0;
    vec3 fwd = normalize( mix( own, toEye, uFaceCamera ) + vec3( 0.0, 0.0, 1e-5 ) );
    vec3 right = vec3( fwd.z, 0.0, -fwd.x );
    vec3 world = origin + scale * ( right * posed.x + vec3( 0.0, posed.y, 0.0 ) + fwd * posed.z );
    gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
  }
`;

/**
 * **The fragment shader — the cut, texel by texel** (D260), unlit, the painting
 * as it is (sRGB sampled linear, three's `colorspace_fragment`): no band, no
 * halftone — and, since the fix pass (D261, amended), an INK RIM round the cut.
 *
 *  - the FRONT keeps a texel where the keep mask does (blue, D228) and it is the
 *    subject — an occluder (red over green by more than the cliff) or at least
 *    `uNear` — exactly {@link standeeCutOf}'s test; it draws the card image
 *    through the art box;
 *  - the FRONT draws INK (`uInk`, the comic look's K plate) where it is not the
 *    subject but a subject texel lies `uRim` render-target pixels away (eight
 *    taps, the pixel's own footprint in the map from `fwidth`): a line of the
 *    figures' own outer ink weight (`COMIC.inkCssPx` × the dpr) round every cut,
 *    so a painting standing over a painting — the opponent's standees over their
 *    own cards, seen from the table — still has an edge (the verifier's MoE@209);
 *  - the BACK keeps a texel whose own depth (green) is at least `uNear`: what a
 *    nearer part of the subject hides that is itself the subject (a coat behind a
 *    fist, filled by the tool, D228), and never the background; it draws the back
 *    layer's colour;
 *  - below the table (`vAbove` < 0, a sunk stance) nothing is drawn.
 *
 * Every coordinate a sample reads — the eight taps included — is computed before
 * any branch, so a sample's implicit mip level is the pixel's own wherever the
 * cut divides a quad; the taps are read only where the front is not the subject.
 * (`textureGrad` would say the same explicitly, and cost SwiftShader about nine
 * milliseconds more a frame for nine standees, `textureLod` about three; this
 * form is within the noise of the shader with no rim — `docs/evidence/standee.md`
 * §9.2.) Then the numbers the frame loop writes, as a
 * figure's: `uOpacity` (the sick translucency, a cue's fade), `uMaterialize`
 * (the summon: the painting resolves out of its card's colour, D148's number),
 * `uDrain` toward `uDrainTo` (a dying body), and `uWash` (the combat freeze's
 * grey, written at commit). Seen from behind (only when it keeps its root's
 * turn), a standee is its cardboard: the card's colour, flat.
 */
export const STANDEE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D uBack;
  uniform sampler2D uDepth;
  uniform float uNear;
  uniform float uCut;
  uniform float uRim;
  uniform vec3 uInk;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uMaterialize;
  uniform float uDrain;
  uniform vec3 uDrainTo;
  uniform float uWash;
  uniform vec3 uWashTo;
  varying vec2 vMapUv;
  varying vec2 vArtUv;
  varying vec2 vBackUv;
  varying float vLayer;
  varying float vAbove;
  bool subjectAt( const in vec2 uv ) {
    vec4 t = texture2D( uDepth, uv );
    return t.b >= 0.5 && ( t.r - t.g > uCut || t.r >= uNear );
  }
  void main() {
    vec2 reach = fwidth( vMapUv ) * uRim;
    vec2 dg = reach * 0.7071;
    vec2 e = vMapUv + vec2( reach.x, 0.0 );
    vec2 w = vMapUv - vec2( reach.x, 0.0 );
    vec2 n = vMapUv + vec2( 0.0, reach.y );
    vec2 s = vMapUv - vec2( 0.0, reach.y );
    vec2 ne = vMapUv + dg;
    vec2 sw = vMapUv - dg;
    vec2 se = vMapUv + vec2( dg.x, -dg.y );
    vec2 nw = vMapUv + vec2( -dg.x, dg.y );
    vec4 d = texture2D( uDepth, vMapUv );
    if ( vAbove < 0.0 ) discard;
    vec3 colour;
    if ( vLayer < 0.5 ) {
      bool subject = d.b >= 0.5 && ( d.r - d.g > uCut || d.r >= uNear );
      if ( subject ) {
        colour = texture2D( map, vArtUv ).rgb;
      } else {
        bool rim = subjectAt( e ) || subjectAt( w ) || subjectAt( n ) || subjectAt( s ) ||
          subjectAt( ne ) || subjectAt( sw ) || subjectAt( se ) || subjectAt( nw );
        if ( !rim ) discard;
        colour = uInk;
      }
    } else {
      if ( d.g < uNear ) discard;
      colour = texture2D( uBack, vBackUv ).rgb;
    }
    if ( !gl_FrontFacing ) colour = uTint * 0.55;
    colour = mix( colour, uWashTo, uWash );
    float materialize = clamp( uMaterialize, 0.0, 1.0 );
    colour = mix( uTint * 1.15, colour, materialize );
    colour = mix( colour, uDrainTo, uDrain );
    gl_FragColor = vec4( colour, clamp( uOpacity * mix( 0.45, 1.0, materialize ), 0.0, 1.0 ) );
    #include <colorspace_fragment>
  }
`;

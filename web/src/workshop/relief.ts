/*
 * mtg-table — workshop/relief.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief window — the inspect view's painting with depth** (D225–D227),
 * as pure data: which image, which depth map, where the two layers stand, and
 * the two shaders that displace and cut them.
 *
 * **What the relief is, and is not.** It is the PERSONAL TIER's inspect
 * backdrop: the card's art box, enlarged behind the figure (D196), displaced
 * toward the lens by a depth map `tools/personal/relief.mjs` computed from the
 * painting (Depth Anything V2 Small) and keeps in the gitignored
 * `personal/relief/` — card-art-derived, so never committed and never
 * published (D190, D225), and served by the Vite dev server alone (D92). It is
 * **not a card**: `CardPlane` stays THE card renderer (M7 convention 2) and draws
 * the card itself on the pedestal; this plane is a crop of the same image
 * behind the figure, the workshop's second card-image surface outside
 * `CardPlane` (web/CLAUDE.md, M4 convention 2's exemption), and nothing in a game
 * reads it.
 *
 * **Hard rule 8.** The one way in is {@link inspectSourceOf}: a concealed entry
 * never looks its art up, so no Scryfall id — and so no depth map — is ever
 * asked about for a face-down card or a redacted stub. {@link inspectPlan} then
 * builds ONE backdrop for a face-up card with a figure and an image, and none
 * otherwise (`web/test/workshop.test.ts`, with an ungated source as its negative
 * control).
 *
 * **Two layers** (D227). The FRONT is the painting at its depth (the map's red),
 * CUT wherever the map jumps at a silhouette (`perf.ts`'s `RELIEF_CLIFF`) —
 * the triangles that would otherwise stretch the subject's edge across the gap
 * an orbit opens (the rubber sheet D226 accepted and the verifier did not). The
 * BACK stands behind it at the farthest depth near each silhouette (the green),
 * coloured by `<id>.back.jpg` — the painting with what its subjects hide filled
 * in, soft, and continued past its edges — so the gap shows what was behind the
 * subject, out of focus. From the seat the two are one picture: the back keeps
 * the painting's own pixels wherever the front is cut. And both are clipped to
 * the WINDOW — the flat picture's rectangle, on its plane — so the frame stays
 * still while the painting moves behind it, as a window's does.
 *
 * **One reader of the served index**: {@link reliefIndexOf}. A map is used only
 * when its file is `<id>.png`, it has a size and a back layer (`<id>.back.jpg`,
 * the same margin on every side), and it was cut with THIS art box
 * (`framing.ts`'s `ART_BOX`) — a box moved since, or a map made before the back
 * layer, is stale, and the backdrop is flat until the tool runs again, rather
 * than a depth that no longer lines up with its painting.
 *
 * `[NO three]`, `[NO React]`: `node --test` drives every line of it, and the
 * shaders are strings (`Pedestal.tsx`'s `InspectStage` compiles them, once per
 * card, at commit — never in a frame loop).
 */

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import { RELIEF_DEPTH } from '../arena/perf.ts';
import type { WorkshopEntry } from './catalog.ts';
import { ART_BOX, inspectLayout, type Framing, type InspectLayout, type Panel } from './framing.ts';

/** One depth map the dev route serves: `<route><file>`, the art box's size in pixels, and its back layer. */
export interface ReliefEntry {
  id: string;
  file: string;
  width: number;
  height: number;
  /** The back layer's colour: `<route><file>`, its size — the art box plus `margin` pixels on every side. */
  back: { file: string; width: number; height: number; margin: number };
}

/** The served index, read: Scryfall id → map. */
export interface ReliefIndex {
  byId: ReadonlyMap<string, ReliefEntry>;
  /** Maps the reader refused, and why — for the console, never for the wire. */
  dropped: readonly string[];
}

export const EMPTY_RELIEF: ReliefIndex = Object.freeze({ byId: new Map<string, ReliefEntry>(), dropped: [] });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The box a map was cut with is THIS art box, to a millionth. */
export function isArtBox(box: unknown): boolean {
  if (!isRecord(box)) return false;
  return (['left', 'right', 'top', 'bottom'] as const).every((k) => {
    const v = box[k];
    return typeof v === 'number' && Math.abs(v - ART_BOX[k]) < 1e-6;
  });
}

/**
 * **THE reader of the relief index** the dev route serves
 * (`{version: 1, reliefs: {<id>: {file, width, height, box, back}}}`). Anything
 * it cannot vouch for is dropped: a key that is not a Scryfall id, a file that is
 * not `<id>.png` or a back that is not `<id>.back.jpg` (no path can be smuggled
 * through the index), a size that is not a whole number of pixels, a back whose
 * margin is not the same whole number of pixels on every side, a map cut with
 * another art box, a map made before the back layer.
 */
export function reliefIndexOf(data: unknown): ReliefIndex {
  if (!isRecord(data) || data['version'] !== 1 || !isRecord(data['reliefs'])) return EMPTY_RELIEF;
  const byId = new Map<string, ReliefEntry>();
  const dropped: string[] = [];
  for (const [id, raw] of Object.entries(data['reliefs'])) {
    if (!UUID.test(id) || !isRecord(raw)) {
      dropped.push(`${id.slice(0, 40)}: not a Scryfall id`);
      continue;
    }
    const { file, width, height, box } = raw;
    if (file !== `${id}.png`) {
      dropped.push(`${id}: its file is not ${id}.png`);
      continue;
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) <= 0 || (height as number) <= 0) {
      dropped.push(`${id}: no size`);
      continue;
    }
    if (!isArtBox(box)) {
      dropped.push(`${id}: cut with another art box — run tools/personal/relief.mjs again`);
      continue;
    }
    const back = raw['back'];
    if (!isRecord(back) || back['file'] !== `${id}.back.jpg`) {
      dropped.push(`${id}: made before the back layer (D227) — run tools/personal/relief.mjs again`);
      continue;
    }
    const bw = back['width'];
    const bh = back['height'];
    const margin = Number.isInteger(bw) ? ((bw as number) - (width as number)) / 2 : NaN;
    if (!Number.isInteger(bh) || !Number.isInteger(margin) || margin < 0 || (bh as number) - (height as number) !== 2 * margin) {
      dropped.push(`${id}: its back layer is not the art box with one margin on every side`);
      continue;
    }
    byId.set(id, {
      id,
      file,
      width: width as number,
      height: height as number,
      back: { file: `${id}.back.jpg`, width: bw as number, height: bh as number, margin },
    });
  }
  return { byId, dropped };
}

/** The card image the inspect view draws, and the id its depth map is keyed by. */
export interface InspectSource {
  /** The `normal` image — the URL `CardPlane` draws for the card, so the same texture. */
  url: string;
  scryfallId: string;
}

/**
 * **The one way in, face up only** (hard rule 8): a concealed entry never looks
 * its art up, so it has no image, no Scryfall id and no depth map to ask for.
 */
export function inspectSourceOf(entry: WorkshopEntry, art: ArtIndex): InspectSource | null {
  const hit = entry.concealed === null ? lookupArt(art, entry.name) : null;
  if (hit === null) return null;
  return { url: imageUrl(hit, 'normal'), scryfallId: hit.scryfallId };
}

/** What the inspect view draws: where everything stands, the painting, and its depth (or none: flat). */
export interface InspectPlan {
  layout: InspectLayout;
  /** The colour map: the card's `normal` image. */
  image: string;
  /**
   * The depth map and the back layer's colour, when there is a map and the
   * toolbar says relief; `null` draws the flat backdrop.
   */
  depth: { url: string; backUrl: string; entry: ReliefEntry } | null;
}

/**
 * **The inspect view's plan** — one backdrop for a face-up card with a figure
 * and an image, and nothing for anything else. `base` is the dev route's prefix
 * (`Pedestal.tsx`'s `RELIEF_BASE`, `null` in a build, where every backdrop is
 * flat); `on` is the toolbar's relief toggle.
 */
export function inspectPlan(
  framing: Framing | undefined,
  source: InspectSource | null,
  relief: ReliefIndex,
  options: { on: boolean; base: string | null },
): InspectPlan | null {
  if (framing === undefined || source === null) return null;
  const entry = options.on && options.base !== null ? relief.byId.get(source.scryfallId) : undefined;
  const layout = inspectLayout(framing, entry === undefined ? 0 : RELIEF_DEPTH);
  if (layout === null) return null;
  return {
    layout,
    image: source.url,
    depth:
      entry === undefined || options.base === null
        ? null
        : { url: `${options.base}${entry.file}`, backUrl: `${options.base}${entry.back.file}`, entry },
  };
}

/**
 * The colour map's UV transform — the art box of a card image, texture v running
 * bottom-up — as `[u0, v0, du, dv]`: the plane's own UV (0–1 over the art box,
 * which is exactly the depth map's) becomes `offset + uv × scale` in the card
 * image. The depth map is sampled at the plane's UV as it is.
 */
export function artBoxUv(): [number, number, number, number] {
  return [ART_BOX.left, 1 - ART_BOX.bottom, ART_BOX.right - ART_BOX.left, ART_BOX.bottom - ART_BOX.top];
}

/** How a layer's plane reads its maps: the colour map's UV box, and the depth map's (`(uv − xy) / zw`). */
export interface LayerBoxes {
  /** The plane's size over the window's, across and up — 1 for the front, more for the back's margin. */
  scale: [number, number];
  /** `[u0, v0, du, dv]`: the plane's UV → its colour map's (`offset + uv × scale`). */
  colour: [number, number, number, number];
  /** `[u0, v0, du, dv]`: the plane's UV → the depth map's (`(uv − offset) / scale`; outside 0–1 the map's edge). */
  depth: [number, number, number, number];
}

/** The FRONT layer: the window's size, the card image's art box, the depth map as it is. */
export function frontBoxes(): LayerBoxes {
  return { scale: [1, 1], colour: artBoxUv(), depth: [0, 0, 1, 1] };
}

/**
 * The BACK layer: the window grown by the back image's margin on every side, its
 * colour the whole back image, the depth map inside the margin (the map's edge
 * continues past it).
 */
export function backBoxes(entry: ReliefEntry): LayerBoxes {
  const { width: bw, height: bh, margin } = entry.back;
  return {
    scale: [bw / entry.width, bh / entry.height],
    colour: [0, 0, 1, 1],
    depth: [margin / bw, margin / bh, entry.width / bw, entry.height / bh],
  };
}

/** The window — the flat picture's rectangle on its plane — as the fragment shader clips to it. */
export interface WindowClip {
  centre: [number, number, number];
  /** Its normal, toward the seat. */
  front: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  /** Half its width and height, a hair over (`1 + 1e-3`), so the window's own edge is never clipped. */
  half: [number, number];
}

/** {@link WindowClip} of a backdrop panel (a vertical plane turned `rotationY` about the vertical). */
export function windowClipOf(panel: Panel): WindowClip {
  const s = Math.sin(panel.rotationY);
  const c = Math.cos(panel.rotationY);
  return {
    centre: [panel.position[0], panel.position[1], panel.position[2]],
    front: [s, 0, c],
    right: [c, 0, -s],
    up: [0, 1, 0],
    half: [(panel.width / 2) * (1 + 1e-3), (panel.height / 2) * (1 + 1e-3)],
  };
}

/**
 * **The vertex shader — a window, not a bas-relief**, for both layers. The plane
 * stands at the WINDOW (`inspectLayout`'s backdrop, where the flat picture
 * stood; the back layer's is larger by its margin). Every vertex samples the
 * depth map (vertex texture fetch; the map is linear data, not colour) — the red
 * for the front, the green for the back (`uLayer`) — and goes BACK from the
 * window along its own ray from `uEye`, the inspect view's camera seat, until it
 * stands `(1 − depth) × uRelief` behind the window's plane (the back layer a hair
 * further, `uBehind`): the map's nearest texels stay on the window, its farthest
 * are `uRelief` behind it. Put the other way round, as D226 states it: the
 * plane's base is pushed back by the relief and each vertex comes back toward the
 * camera by `depth × uRelief`.
 *
 * Along the RAY, not along the plane's normal, for one reason: seen from the
 * seat, every vertex lands on the pixel its texel had in the flat picture, so the
 * painting is exactly the card's; the depth is only seen when the camera moves —
 * the parallax of a window. `across` is how squarely the ray meets the plane, so
 * the depth behind the plane is exactly `(1 − depth) × uRelief` however
 * obliquely the seat looks at a corner.
 *
 * `vCut` is the vertex's SILHOUETTE test (D227): how far its depth and its four
 * neighbours' one grid cell away (`uCell`) differ. The fragment shader cuts the
 * front layer where it passes `RELIEF_CLIFF`; `tools/personal/relief.mjs` builds
 * the back layer to the same test. `vDepthUv` is where the fragment reads the map
 * for its own, per-pixel cut.
 */
export const RELIEF_VERTEX = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uRelief;
  uniform float uLayer;
  uniform float uBehind;
  uniform vec3 uEye;
  uniform vec4 uArtBox;
  uniform vec4 uDepthBox;
  uniform vec2 uCell;
  varying vec2 vArtUv;
  varying vec2 vDepthUv;
  varying float vCut;
  varying vec3 vWorld;
  float depthAt( vec2 at ) {
    vec4 d = texture2D( uDepth, clamp( at, 0.0, 1.0 ) );
    return mix( d.r, d.g, uLayer );
  }
  void main() {
    vArtUv = uArtBox.xy + uv * uArtBox.zw;
    vec2 at = ( uv - uDepthBox.xy ) / uDepthBox.zw;
    vDepthUv = clamp( at, 0.0, 1.0 );
    float depth = depthAt( at );
    float east = depthAt( at + vec2( uCell.x, 0.0 ) );
    float west = depthAt( at - vec2( uCell.x, 0.0 ) );
    float north = depthAt( at + vec2( 0.0, uCell.y ) );
    float south = depthAt( at - vec2( 0.0, uCell.y ) );
    vCut = max( max( max( east, west ), max( north, south ) ), depth ) - min( min( min( east, west ), min( north, south ) ), depth );
    vec4 world = modelMatrix * vec4( position, 1.0 );
    vec3 front = normalize( mat3( modelMatrix ) * vec3( 0.0, 0.0, 1.0 ) );
    vec3 ray = normalize( world.xyz - uEye );
    float across = max( 0.2, dot( ray, -front ) );
    world.xyz += ray * ( ( 1.0 - depth ) * uRelief / across + uBehind );
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * **The fragment shader**: the painting, unlit, as it is — the same colour a
 * `MeshBasicMaterial` with no tone mapping gives the flat backdrop (the texture
 * is sRGB, sampled linear, and written back through three's own
 * `colorspace_fragment`). No band, no halftone and no ink mark: D226 says why,
 * with the pictures. Two cuts, and nothing else:
 *
 *  - **the silhouette**, twice: a vertex whose map jumps (`vCut > uCut`) — its
 *    triangles would stretch across the gap an orbit opens — and, pixel by
 *    pixel, the band the front's map grew past the silhouette (its red over the
 *    painting's own blue by more than `uCut`: the background's pixels, carried
 *    at the subject's depth). Where the front is cut, the back layer behind it
 *    is drawn — the same pixels from the seat, the background at its own depth
 *    and what the subject hid (filled in) as the camera moves. The back's
 *    `uCut` is over 1, so it is never cut.
 *  - **the window** — the ray from the camera (three's `cameraPosition`) to the
 *    fragment crosses the window's plane outside its rectangle (or the fragment
 *    is on that plane, outside it: `t` up to a hair over 1): a fragment the
 *    window's frame would hide. So the rectangle stays on its plane from every
 *    orbit and the painting moves behind it — where the first cut's edge followed
 *    the depth and bowed (the verifier's "curled poster").
 */
export const RELIEF_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D uDepth;
  uniform float uCut;
  uniform vec3 uWindow;
  uniform vec3 uFront;
  uniform vec3 uRight;
  uniform vec3 uUp;
  uniform vec2 uHalf;
  varying vec2 vArtUv;
  varying vec2 vDepthUv;
  varying float vCut;
  varying vec3 vWorld;
  void main() {
    if ( vCut > uCut ) discard;
    vec4 d = texture2D( uDepth, vDepthUv );
    if ( d.r - d.b > uCut ) discard;
    vec3 ray = vWorld - cameraPosition;
    float toward = dot( ray, uFront );
    if ( toward < 0.0 ) {
      float t = dot( uWindow - cameraPosition, uFront ) / toward;
      vec3 onWindow = cameraPosition + ray * t - uWindow;
      if ( t > 0.0 && t < 1.001 && ( abs( dot( onWindow, uRight ) ) > uHalf.x || abs( dot( onWindow, uUp ) ) > uHalf.y ) ) discard;
    }
    gl_FragColor = vec4( texture2D( map, vArtUv ).rgb, 1.0 );
    #include <colorspace_fragment>
  }
`;

/*
 * mtg-table — workshop/relief.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief window — the inspect view's painting with depth** (D225, D226),
 * as pure data: which image, which depth map, where the plane stands, and the
 * two shaders that displace it.
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
 * **One reader of the served index**: {@link reliefIndexOf}. A map is used only
 * when its file is `<id>.png`, it has a size, and it was cut with THIS art box
 * (`framing.ts`'s `ART_BOX`) — a box moved since makes the map stale, and the
 * backdrop is flat until the tool runs again, rather than a depth that no longer
 * lines up with its painting.
 *
 * `[NO three]`, `[NO React]`: `node --test` drives every line of it, and the
 * shaders are strings (`Pedestal.tsx`'s `InspectStage` compiles them, once per
 * card, at commit — never in a frame loop).
 */

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import { RELIEF_DEPTH } from '../arena/perf.ts';
import type { WorkshopEntry } from './catalog.ts';
import { ART_BOX, inspectLayout, type Framing, type InspectLayout } from './framing.ts';

/** One depth map the dev route serves: `<route><file>`, the art box's size in pixels. */
export interface ReliefEntry {
  id: string;
  file: string;
  width: number;
  height: number;
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
 * (`{version: 1, reliefs: {<id>: {file, width, height, box}}}`). Anything it
 * cannot vouch for is dropped: a key that is not a Scryfall id, a file that is
 * not `<id>.png` (no path can be smuggled through the index), a size that is not
 * a whole number of pixels, a map cut with another art box.
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
    byId.set(id, { id, file, width: width as number, height: height as number });
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
  /** The depth map, when there is one and the toolbar says relief; `null` draws the flat backdrop. */
  depth: { url: string; entry: ReliefEntry } | null;
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
    depth: entry === undefined || options.base === null ? null : { url: `${options.base}${entry.file}`, entry },
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

/**
 * **The vertex shader — a window, not a bas-relief.** The plane stands at the
 * WINDOW (`inspectLayout`'s backdrop, where the flat picture stood). Every vertex
 * samples the depth map (vertex texture fetch; the map is linear data, not
 * colour) and goes BACK from the window along its own ray from `uEye` — the
 * inspect view's camera seat — until it stands `(1 − depth) × uRelief` behind the
 * window's plane: the map's nearest texels stay on the window, its farthest are
 * `uRelief` behind it. Put the other way round, as D226 states it: the plane's
 * base is pushed back by the relief and each vertex comes back toward the camera
 * by `depth × uRelief`.
 *
 * Along the RAY, not along the plane's normal, for one reason: seen from the
 * seat, every vertex lands on the pixel its texel had in the flat picture, so the
 * art box stays a rectangle and the painting is exactly the card's; the depth is
 * only seen when the camera moves — the parallax of a window. Along the normal
 * the far content shrank toward the middle and the box's edge went ragged (the
 * first cut; its picture is in `docs/evidence/relief-window.md`). `across` is how
 * squarely the ray meets the plane, so the depth behind the plane is exactly
 * `(1 − depth) × uRelief` however obliquely the seat looks at a corner.
 */
export const RELIEF_VERTEX = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uRelief;
  uniform vec3 uEye;
  uniform vec4 uArtBox;
  varying vec2 vArtUv;
  void main() {
    vArtUv = uArtBox.xy + uv * uArtBox.zw;
    float depth = texture2D( uDepth, uv ).r;
    vec4 world = modelMatrix * vec4( position, 1.0 );
    vec3 front = normalize( mat3( modelMatrix ) * vec3( 0.0, 0.0, 1.0 ) );
    vec3 ray = normalize( world.xyz - uEye );
    float across = max( 0.2, dot( ray, -front ) );
    world.xyz += ray * ( ( 1.0 - depth ) * uRelief / across );
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * **The fragment shader**: the painting, unlit, as it is — the same colour a
 * `MeshBasicMaterial` with no tone mapping gives the flat backdrop (the texture
 * is sRGB, sampled linear, and written back through three's own
 * `colorspace_fragment`). No band, no halftone and no ink mark: D226 says why,
 * with the pictures.
 */
export const RELIEF_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vArtUv;
  void main() {
    gl_FragColor = vec4( texture2D( map, vArtUv ).rgb, 1.0 );
    #include <colorspace_fragment>
  }
`;

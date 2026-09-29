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
 * **Two layers** (D227, D228). The FRONT is the painting at its depth (the map's
 * red), CUT wherever the map jumps at a silhouette (`perf.ts`'s `RELIEF_CLIFF`)
 * — the triangles that would otherwise stretch the subject's edge across the gap
 * an orbit opens (the rubber sheet D226 accepted and the verifier did not) — and
 * pixel by pixel where the map's blue, the front's keep mask, says so: the
 * subject keeps its painted contour, and the background beside it is cut. The
 * BACK stands behind it at the far side of each silhouette (the green), coloured
 * by `<id>.back.jpg` — the painting with its subjects filled by the background
 * just across each silhouette, mirrored and out of focus, and continued past its
 * edges the same way — so the gap shows what was behind the subject. From the
 * seat the two are one picture: the back keeps the painting's own pixels
 * wherever the front is cut, and a texel past it. And both are clipped to
 * the WINDOW — the flat picture's rectangle, on its plane — so the frame stays
 * still while the painting moves behind it, as a window's does.
 *
 * **One reader of the served index**: `reliefIndexOf`, the arena's since the
 * standee (D260; `arena/relief.ts`, re-exported here). A map is used only
 * when its file is `<id>.png`, it has a size and a back layer (`<id>.back.jpg`,
 * the same margin on every side), and it was cut with THIS art box
 * (`ART_BOX`, `arena/relief.ts`'s, re-exported by `framing.ts`) — a box moved since, or a map made before the back
 * layer or with an older recipe (the dev route serves those without a back,
 * `perf.ts`'s `RELIEF_MAP_VERSION`), is stale, and the backdrop is flat until
 * the tool runs again, rather than a depth that no longer lines up with its
 * painting or a blue the shader would misread.
 *
 * `[NO three]`, `[NO React]`: `node --test` drives every line of it, and the
 * shaders are strings (`Pedestal.tsx`'s `InspectStage` compiles them, once per
 * card, at commit — never in a frame loop).
 */

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import type { Presence } from '../arena/cues/types.ts';
import { figurePose } from '../arena/figures/pose.ts';
import type { FigureData, ModelData } from '../arena/figures/types.ts';
import type { TraitData } from '../arena/figures/traits.ts';
import { layout } from '../arena/layout.ts';
import { RELIEF_DEPTH } from '../arena/perf.ts';
import { personalChoicesOf, type PersonalOverlay } from '../arena/personal.ts';
import { ART_BOX, type ReliefEntry, type ReliefIndex } from '../arena/relief.ts';
import { standeeChoicesOf } from '../arena/standee.ts';
import { roleOf, type WorkshopEntry } from './catalog.ts';
import { inspectLayout, type Framing, type InspectLayout, type Panel } from './framing.ts';
import { DEFAULT_OPTIONS, figureIds, pedestalState } from './synthetic.ts';

// The reader moved to the arena with the standee (D260): `arena/relief.ts` is THE
// reader of the relief index now — the arena's standee and this inspect view both
// read through it — and the names below are its own, re-exported so the
// workshop's callers (and `relief.test.ts`) read it where they always did.
export { EMPTY_RELIEF, isArtBox, reliefIndexOf, type ReliefEntry, type ReliefIndex } from '../arena/relief.ts';

/** What the list's *standee* badge is decided with — the pedestal's own inputs. */
export interface StandeeBadgeInputs {
  art: ArtIndex;
  relief: ReliefIndex;
  /** The dev route's relief prefix (`RELIEF_BASE`): `null` in a build, and then no badge. */
  base: string | null;
  /** The active personal models: a card one dresses is its model's, never a standee's (D260). */
  overlay: PersonalOverlay;
  figures: FigureData;
  models: ModelData;
  traits: TraitData;
  presence?: Readonly<Record<string, Presence>>;
}

/**
 * **The list's *standee* badge** (D260; routed through THE lookup by the fix
 * pass): the names of the entries the pedestal stands as a standee at its
 * default options — each creature entry's own resting board (`pedestalState`),
 * laid out and posed as the pedestal poses it, the personal models the same
 * overlay would dress taken first, then asked of the arena's `standeeChoicesOf`.
 * So the badge says exactly what the pedestal draws: the gates (face up, a body
 * a CC0 figure stands in — never a swarm, a squad or a silhouette), the card's
 * own art lookup, the relief and the legibility floor are all the lookup's, and
 * the list decides nothing of its own (`workshop.test.ts` sweeps the catalog with
 * a hostile relief against an oracle).
 */
export function standeeBadgesOf(entries: readonly WorkshopEntry[], inputs: StandeeBadgeInputs): Set<string> {
  const out = new Set<string>();
  if (inputs.base === null || inputs.relief.byId.size === 0) return out;
  for (const entry of entries) {
    if (roleOf(entry) !== 'creature') continue;
    const state = pedestalState(entry, DEFAULT_OPTIONS);
    const placed = layout(state, inputs.presence ?? {});
    const poses = figurePose(placed, state.board?.combat ?? null, inputs.figures, { models: inputs.models, traits: inputs.traits });
    const taken = personalChoicesOf(placed, poses, inputs.overlay);
    const chosen = standeeChoicesOf(placed, poses, inputs.art, inputs.relief, { base: inputs.base, taken });
    if (figureIds(entry, DEFAULT_OPTIONS).some((id) => chosen.has(id))) out.add(entry.name);
  }
  return out;
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
 * (`arena/scene/reliefCache.ts`'s `RELIEF_BASE`, `null` in a build, where every backdrop is
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
 * the keep mask and the back layer to the same test. `vDepthUv` is where the
 * fragment reads the keep mask (the map's blue) for its own, per-pixel cut.
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
 *  - **the silhouette**, twice, on the FRONT only (`uLayer` 0): a vertex whose
 *    map jumps (`vCut > uCut`) — its triangles would stretch across the gap an
 *    orbit opens — and, pixel by pixel, the map's blue: the front's KEEP MASK
 *    (D228), 1 where the front is drawn and 0 where it is cut, decided by
 *    `tools/personal/relief.mjs` texel for texel (sampled linearly, so the cut
 *    falls on a texel edge). The subject and its painted contour are always
 *    kept, so they move with the subject; the band the red was grown across is
 *    cut. Where the front is cut, the back layer behind it is drawn — the
 *    painting's own pixels there, so from the seat the two layers are one
 *    picture, and what the subject hid (filled in) as the camera moves.
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
  uniform float uLayer;
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
    if ( uLayer < 0.5 && ( vCut > uCut || texture2D( uDepth, vDepthUv ).b < 0.5 ) ) discard;
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

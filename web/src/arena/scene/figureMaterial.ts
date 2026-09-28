/*
 * mtg-table — arena/scene/figureMaterial.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure material** — every creature on the table, every dying body and
 * both duelists are drawn by this one program. It was `holoMaterial.ts` until
 * Lane LOOK (report 15 §9.1, **D120**); `holoMaterial.ts` re-exports it for one
 * release.
 *
 * **Two looks, one program, one number.** `uLook` 0 draws **D53**'s hologram (a
 * view-space fresnel over the **D97** costume palette, scanlines, translucent);
 * `uLook` 1 draws the comic look — the same palette PAINTED: saturated, "black is
 * blue", shaded in three flat bands from one key light fixed to the lens
 * (**D121**), the core shadow cooled and screened with halftone dots, a specular
 * dot on the lit band, the card's own colour as a rim on the silhouette's shadow
 * side, opaque. `arena/look.ts` holds every number; they arrive as uniforms.
 *
 * Four properties, and each one is a budget line:
 *
 *  - **No scene light.** The key light is a UNIFORM in view space (or, the
 *    workshop's toggle, a world direction turned into view space in the vertex
 *    shader) — there is no `DirectionalLight`, no shadow map, and the cards are
 *    never lit (report 13 §8.3 rule 2). "Unlit" in D53's sense is superseded
 *    (D120); "no lights" is not.
 *  - **One program.** Every figure gets its **own material instance** (the tint,
 *    the palette and the look are per figure), all built from this source, so
 *    three compiles one program for the library — `gl.info.programs`, measured
 *    in `docs/evidence/look.md`. The comic block's uniforms (key, bands, tone,
 *    halftone, specular, rim) are ONE set of value objects shared by every figure
 *    and prop material ({@link COMIC_UNIFORMS}), written once at commit.
 *  - **No clock.** No `uTime`: the scanlines are a function of the figure's own
 *    height, the halftone of the fragment's screen position. Nothing here can
 *    keep `frameloop='demand'` awake (`liveness.test.ts` asserts it).
 *  - **The look is written at COMMIT** ({@link applyLook}, from layout effects —
 *    never from the frame loop; a liveness clause, negative-controlled). The one
 *    number the frame loop MAY write besides opacity, tint and drain is
 *    `uMaterialize` (identity 1, multiplied into the look): Lane MOTION's
 *    hologram-to-ink summon (report 15 §5.3), a decaying offset.
 *
 * **The paint input path** (**D127**, report 15 §2.3 and §8.3). The palette is
 * multiplied by a per-vertex colour (`vertexColors`, three's `USE_COLOR`) and by
 * a texture (`paintMap`, the `USE_PAINT_MAP` define) when a model carries one, so
 * a personal texture-baked model draws in COLOUR under the same bands, halftone,
 * rim and ink — not as a tinted silhouette. Both are defines: today's bodies carry
 * neither, so they stay one program; a model that does compiles its own variant.
 *
 * ---------------------------------------------------------------------------
 * `#include <colorspace_fragment>`: three's built-in shaders end with it; a
 * custom `ShaderMaterial` gets no such thing for free. `THREE.Color.set` converts
 * an sRGB hex into the working space on the way in, this converts back on the way
 * out, and the round trip is what makes `#f6f0d8` arrive as `#f6f0d8`.
 *
 * Skinning is three's own: `USE_SKINNING` is defined for **any** material on a
 * `SkinnedMesh` and the renderer sets `bindMatrix` / `boneTexture` with
 * `setOptional`, so including the four skinning chunks is the whole of what a
 * custom shader has to do.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';

import { COSTUME_SLOTS } from '../figures/props.ts';
import { COMIC, type MaterialLook } from '../look.ts';

/** How many costume slots a palette carries — the shader's array length. */
export const COSTUME_SIZE = COSTUME_SLOTS.length;

/**
 * **The attribute a body's costume slots arrive in.** `tools/build-figures.mjs`
 * writes them as the glTF custom attribute `_REGION`, which `GLTFLoader` names
 * `_region`; `scene/models.ts` renames it once, at load, on the shared geometry.
 * A body without it (the drone, the bee) reads slot 0 and draws no costume anyway
 * (`uCostumeOn` 0).
 */
export const COSTUME_ATTRIBUTE = 'costumeRegion';

// ---------------------------------------------------------------------------
// The comic block — shared by the figure and the prop shaders
// ---------------------------------------------------------------------------

const v3 = (t: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(t[0], t[1], t[2]);
const rgb = (t: readonly [number, number, number]): THREE.Color => new THREE.Color().setRGB(t[0], t[1], t[2]);

/**
 * **The comic block's uniforms — ONE set of value objects**, spread into every
 * figure and prop material, so a write here reaches every material at once
 * (three reads `material.uniforms[name].value` at draw time and never copies a
 * `ShaderMaterial`'s uniforms). Written only by {@link applyComicGlobals}, at
 * commit. Each is one of `look.ts`'s `COMIC` numbers.
 */
export const COMIC_UNIFORMS = {
  /** The key light, in VIEW space (D121). */
  uKey: { value: v3(COMIC.key).normalize() },
  /** The world-fixed key (the workshop's toggle), turned into view space per vertex. */
  uKeyWorld: { value: v3(COMIC.keyWorld).normalize() },
  /** 0 the lens-fixed key, 1 the world-fixed one. */
  uKeyFrame: { value: 0 as number },
  /** The band edges in `N·L`: (lit lo, lit hi, umbra lo, umbra hi). */
  uBands: { value: new THREE.Vector4(COMIC.bands[0], COMIC.bands[1], COMIC.bands[2], COMIC.bands[3]) },
  /** The core shadow's multiplier, and how far the mid band sits from it toward the paint. */
  uShadowTone: { value: rgb(COMIC.shadowTone) },
  uMidMix: { value: COMIC.midMix as number },
  /** Saturation push, "black is blue", and paper white. */
  uSat: { value: COMIC.saturation as number },
  uBlack: { value: rgb(COMIC.black) },
  uBlackAt: { value: COMIC.blackAt as number },
  /** Dark paint's lit band, lifted (hue kept): (luminance lo, hi, the lit band's target luminance). */
  uDarkLift: { value: new THREE.Vector3(COMIC.darkLift[0], COMIC.darkLift[1], COMIC.darkLift[2]) },
  uPaperWhite: { value: COMIC.paperWhite as number },
  /** The halftone cell in DEVICE pixels (CSS px × the render dpr) and its depth (0 = off). */
  uDotPx: { value: COMIC.dotCssPx as number },
  uDotDepth: { value: COMIC.dotDepth as number },
  /** The specular dot: (N·H lo, N·H hi, strength), and its colour. */
  uSpec: { value: new THREE.Vector3(COMIC.specBand[0], COMIC.specBand[1], COMIC.specStrength) },
  uSpecColour: { value: rgb(COMIC.specColour) },
  /** The rim in the card's colour: (1 − N·V lo, hi, strength), and its lift toward white. */
  uEdgeBand: { value: new THREE.Vector3(COMIC.rimBand[0], COMIC.rimBand[1], COMIC.rimMix) },
  uEdgeLift: { value: COMIC.rimLift as number },
};

/**
 * **The comic block, vertex half**: which way the key light comes from, in view
 * space — the lens-fixed uniform, or the world direction turned by the view.
 */
export const COMIC_VERTEX_GLSL = /* glsl */ `
  uniform vec3 uKey;
  uniform vec3 uKeyWorld;
  uniform float uKeyFrame;
  vec3 comicKeyOf( const in mat4 view ) {
    return mix( uKey, ( view * vec4( uKeyWorld, 0.0 ) ).xyz, uKeyFrame );
  }
`;

/**
 * **The comic block, fragment half** — the paint and the three bands, used by the
 * figure shader below and by `propMaterial.ts`. No clock: the dots are a function
 * of `gl_FragCoord`, everything else of the surface.
 */
export const COMIC_FRAGMENT_GLSL = /* glsl */ `
  uniform vec4 uBands;
  uniform vec3 uShadowTone;
  uniform float uMidMix;
  uniform float uSat;
  uniform vec3 uBlack;
  uniform float uBlackAt;
  uniform vec3 uDarkLift;
  uniform float uPaperWhite;
  uniform float uDotPx;
  uniform float uDotDepth;
  uniform vec3 uSpec;
  uniform vec3 uSpecColour;

  // The palette, painted: saturated, black lifted to blue, capped at paper white.
  vec3 comicPaint( vec3 paint ) {
    float grey = dot( paint, vec3( 0.2126, 0.7152, 0.0722 ) );
    paint = max( mix( vec3( grey ), paint, uSat ), 0.0 );
    paint = mix( uBlack, paint, smoothstep( 0.0, uBlackAt, grey ) );
    return min( paint, vec3( uPaperWhite ) );
  }

  // Three flat bands from the key, halftone in the core shadow, a specular dot on
  // the lit band. 'lit' is handed back for the caller's rim.
  vec3 comicShade( const in vec3 paint, const in vec3 n, const in vec3 viewDir, const in vec3 key, out float lit ) {
    float ndl = dot( n, key );
    lit = smoothstep( uBands.x, uBands.y, ndl );
    float umbra = 1.0 - smoothstep( uBands.z, uBands.w, ndl );
    // "Black is blue WITH BLUE HIGHLIGHTS": a dark paint's LIT band is lifted to a
    // readable value, its hue kept, so a navy suit on a mid stage keeps three bands
    // (a highlight, the navy, a near-black core) instead of one silhouette.
    float lum = dot( paint, vec3( 0.2126, 0.7152, 0.0722 ) );
    float dark = 1.0 - smoothstep( uDarkLift.x, uDarkLift.y, lum );
    vec3 litPaint = mix( paint, max( paint, paint * ( uDarkLift.z / max( lum, 1e-4 ) ) ), dark );
    vec3 c = mix( litPaint, paint * mix( uShadowTone, vec3( 1.0 ), uMidMix ), 1.0 - lit );
    c = mix( c, paint * uShadowTone, umbra );
    vec2 cell = mat2( 0.7071, -0.7071, 0.7071, 0.7071 ) * gl_FragCoord.xy / max( 1.0, uDotPx );
    float dots = 1.0 - smoothstep( 0.26, 0.34, length( fract( cell ) - 0.5 ) );
    c *= 1.0 - uDotDepth * dots * umbra;
    float spec = smoothstep( uSpec.x, uSpec.y, dot( n, normalize( key + viewDir ) ) );
    return mix( c, uSpecColour, uSpec.z * spec * lit );
  }
`;

/**
 * **The commit-time globals** — the comic block's numbers that depend on the
 * table rather than on a figure: the halftone on or off, the key's frame, and
 * the render dpr (a dot is `dotCssPx` CSS pixels at every rung of the DPR
 * ladder). Called from `FigureLayer`'s and `DuelistLayer`'s layout effects when
 * the look or the dpr changes — never from the frame loop.
 */
export function applyComicGlobals(look: MaterialLook, dpr: number): void {
  COMIC_UNIFORMS.uDotDepth.value = look.halftone > 0 ? COMIC.dotDepth : 0;
  COMIC_UNIFORMS.uKeyFrame.value = look.keyWorld;
  COMIC_UNIFORMS.uDotPx.value = COMIC.dotCssPx * Math.max(0.25, dpr);
}

// ---------------------------------------------------------------------------
// The figure material
// ---------------------------------------------------------------------------

export interface FigureUniforms {
  uTint: { value: THREE.Color };
  uOpacity: { value: number };
  /** How tight the hologram's rim is. Higher is a thinner edge. */
  uRim: { value: number };
  /** How much of the tint the hologram's body carries before the rim is added. */
  uCore: { value: number };
  /** 0 ⇒ no scanlines. */
  uScan: { value: number };
  /**
   * **Slice 4 — the costume.** One colour per `COSTUME_SLOTS` slot, looked up per
   * vertex by the body's `costumeRegion`; `uCostumeOn` 0 draws the body in
   * `uTint` alone (the drone, the bee, an anonymous figure never gets a palette).
   * Written at COMMIT, from the pose — never per frame — by {@link applyCostume}.
   */
  uCostume: { value: THREE.Color[] };
  uCostumeOn: { value: number };
  /** The model's own units → figure units (`LoadedModel.unitScale`), for the scanlines. */
  uUnitScale: { value: number };
  /**
   * **D64's drain, as a uniform** (slice 4): a dying body fades toward
   * `uDrainTo` by `uDrain`, 0…1, which the departing body's frame loop writes as
   * a number — so the drain reaches every costume slot under both looks.
   */
  uDrain: { value: number };
  uDrainTo: { value: THREE.Color };
  /**
   * **The look** (D120): 0 the hologram, 1 the comic look. Written at COMMIT
   * ({@link applyLook}) and nowhere else — a pose (`look.ts`'s `figureLookOf`),
   * so it survives skip, scrub and `resync` (D56).
   */
  uLook: { value: number };
  /**
   * **Lane MOTION's summon** (report 15 §5.3): multiplied into `uLook`, identity
   * 1. The frame loop may write it as a number — the hologram resolving into ink
   * as a creature arrives, a decaying offset (D50) — which is why the look itself
   * never needs a frame-loop write.
   */
  uMaterialize: { value: number };
  /** The paint map (`USE_PAINT_MAP` only) — a personal model's baked colour (D127). */
  uPaintMap: { value: THREE.Texture | null };
}

export type FigureMaterial = THREE.ShaderMaterial & { uniforms: FigureUniforms & typeof COMIC_UNIFORMS };

const VERTEX = /* glsl */ `
  #include <common>
  #include <color_pars_vertex>
  #include <skinning_pars_vertex>

  attribute float ${COSTUME_ATTRIBUTE};
  uniform vec3 uCostume[ ${String(COSTUME_SIZE)} ];
  uniform float uUnitScale;

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying vec3 vCostume;
  varying vec3 vKey;
  #ifdef USE_PAINT_MAP
    varying vec2 vPaintUv;
  #endif

  void main() {
    #include <color_vertex>
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
    // Both in VIEW space. Mixing a view-space normal with a world-space view
    // vector is the classic fresnel bug: the rim then swims as the camera orbits.
    vViewNormal = normalize( transformedNormal );
    vViewDir = normalize( -mvPosition.xyz );
    vLocalY = transformed.y * uUnitScale;
    // The slot is looked up HERE, per vertex (a dynamic index into a uniform
    // array is legal in a vertex shader), and interpolated.
    int slot = int( clamp( ${COSTUME_ATTRIBUTE} + 0.5, 0.0, ${String(COSTUME_SIZE - 1)}.0 ) );
    vCostume = uCostume[ slot ];
    vKey = comicKeyOf( viewMatrix );
    #ifdef USE_PAINT_MAP
      vPaintUv = uv;
    #endif
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  #include <color_pars_fragment>
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uCore;
  uniform float uScan;
  uniform float uCostumeOn;
  uniform float uDrain;
  uniform vec3 uDrainTo;
  uniform float uLook;
  uniform float uMaterialize;
  uniform vec3 uEdgeBand;
  uniform float uEdgeLift;
  #ifdef USE_PAINT_MAP
    uniform sampler2D uPaintMap;
    varying vec2 vPaintUv;
  #endif

  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying float vLocalY;
  varying vec3 vCostume;
  varying vec3 vKey;

  void main() {
    vec3 normal = normalize( vViewNormal );
    vec3 viewDir = normalize( vViewDir );

    // **The paint input path** (D127): the palette, times a model's own colour.
    vec3 painted = mix( uTint, vCostume, uCostumeOn );
    #ifdef USE_COLOR
      painted *= vColor.rgb;
    #endif
    #ifdef USE_PAINT_MAP
      painted *= texture2D( uPaintMap, vPaintUv ).rgb;
    #endif

    // -- the hologram (D53, D97) ------------------------------------------------
    // abs() so a back face rims like a front one: the figure is translucent and
    // both sides are visible at a grazing angle.
    float facing = abs( dot( normal, viewDir ) );
    float fresnel = pow( 1.0 - facing, uRim );
    // A function of the figure's own height, not of time.
    float lines = fract( vLocalY * 23.0 );
    float scan = 1.0 - uScan * mix( 0.35, 0.12, uCostumeOn ) * step( 0.5, lines );
    vec3 body = painted;
    vec3 rimColour = mix( body, uTint, 0.55 * uCostumeOn );
    body = mix( body, uDrainTo, uDrain );
    rimColour = mix( rimColour, uDrainTo, uDrain );
    float core = mix( uCore, 0.95, uCostumeOn );
    float rim = mix( 1.7, 1.05, uCostumeOn );
    vec3 colour = ( body * core + rimColour * fresnel * rim ) * scan;
    float alpha = clamp( uOpacity * ( mix( 0.38, 0.74, uCostumeOn ) + fresnel * mix( 0.85, 0.4, uCostumeOn ) ), 0.0, 1.0 );

    // -- the comic look (D120) ---------------------------------------------------
    float look = clamp( uLook * uMaterialize, 0.0, 1.0 );
    if ( look > 0.0 ) {
      float lit;
      vec3 comic = comicShade( comicPaint( painted ), normal, viewDir, normalize( vKey ), lit );
      // The card's own colour as a rim on the silhouette's SHADOW side: where the
      // hologram's colour identity survives in the comic look.
      float edge = smoothstep( uEdgeBand.x, uEdgeBand.y, 1.0 - max( dot( normal, viewDir ), 0.0 ) );
      comic = mix( comic, min( mix( uTint, vec3( 1.0 ), uEdgeLift ), vec3( uPaperWhite ) ), edge * uEdgeBand.z * ( 1.0 - lit ) );
      comic = mix( comic, uDrainTo, uDrain );
      colour = mix( colour, comic, look );
      alpha = mix( alpha, clamp( uOpacity, 0.0, 1.0 ), look );
    }

    gl_FragColor = vec4( colour, alpha );

    #include <colorspace_fragment>
  }
`;

/** What a model may bring to the paint (D127). Neither is carried by any committed body. */
export interface PaintInput {
  /** Multiply the palette by the geometry's `color` attribute. */
  vertexColors?: boolean;
  /** Multiply the palette by this texture, sampled at the geometry's `uv`. */
  map?: THREE.Texture | null;
}

/**
 * **The one material every figure is built from**, so there is one program (per
 * paint input). `unitScale` is the model's (`LoadedModel.unitScale`). A new
 * material starts in the hologram (`uLook` 0) until {@link applyLook} writes the
 * look at commit.
 */
export function makeFigureMaterial(tint: string, unitScale = 1, paint: PaintInput = {}): FigureMaterial {
  const costume: THREE.Color[] = [];
  for (let i = 0; i < COSTUME_SIZE; i++) costume.push(new THREE.Color(tint));
  const map = paint.map ?? null;
  const material = new THREE.ShaderMaterial({
    vertexShader: COMIC_VERTEX_GLSL + VERTEX,
    fragmentShader: COMIC_FRAGMENT_GLSL + FRAGMENT,
    defines: map === null ? {} : { USE_PAINT_MAP: '' },
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uRim: { value: 2.1 },
      uCore: { value: 0.55 },
      uScan: { value: 1 },
      uCostume: { value: costume },
      uCostumeOn: { value: 0 },
      uUnitScale: { value: unitScale },
      uDrain: { value: 0 },
      uDrainTo: { value: new THREE.Color('#8b939e') },
      uLook: { value: 0 },
      uMaterialize: { value: 1 },
      uPaintMap: { value: map },
      ...COMIC_UNIFORMS,
    },
    vertexColors: paint.vertexColors === true,
    transparent: true,
    // **`depthWrite` stays on.** A hologram that writes no depth shows its own
    // back through its front and reads as a smear rather than a body; the comic
    // look is opaque and the ink pass reads the depth it writes.
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  return material as FigureMaterial;
}

/** §6.4's freeze wash — the grey `CueRunner` lerps a frozen figure's tint toward. */
const FREEZE_WASH = new THREE.Color('#8d949e');
const FREEZE_MIX = 0.45;

/**
 * **Write a pose's costume into a figure's material** — at COMMIT, from
 * `FigureLayer`'s layout effect, never from the frame loop (the palette is a
 * pose: it changes when the snapshot does). `costume` is the pose's resolved
 * palette, one `#rrggbb` per slot, or `null` for a body that wears none. A frozen
 * pose (§6.4's combat freeze) washes the palette as `CueRunner` washes the tint.
 * Returns the key it wrote, so the caller can skip an unchanged pose; `previous`
 * is the key it wrote last time.
 */
export function applyCostume(
  material: FigureMaterial,
  costume: readonly string[] | null,
  frozen: boolean,
  previous: string | null = null,
): string {
  const key = costume === null ? 'none' : `${frozen ? 'f' : 'l'}${costume.join('')}`;
  if (key === previous) return key;
  const uniforms = material.uniforms;
  if (costume === null) {
    uniforms.uCostumeOn.value = 0;
    return key;
  }
  for (let i = 0; i < COSTUME_SIZE; i++) {
    const colour = uniforms.uCostume.value[i]!;
    colour.set(costume[i] ?? '#ffffff');
    if (frozen) colour.lerp(FREEZE_WASH, FREEZE_MIX);
  }
  uniforms.uCostumeOn.value = 1;
  return key;
}

/**
 * **The painted MARK** (**D129**): a painted surface writes **alpha 0** into the
 * frame it is drawn into, so `Post.tsx`'s ink knows where a figure is and inks
 * nothing else — a card's edge, a tile's, the table's. The colour blends exactly
 * as three's `NormalBlending` does (`SRC_ALPHA`, `ONE_MINUS_SRC_ALPHA`), so a
 * translucent hologram still reads as one; only the ALPHA channel is replaced
 * (`ZERO`, `ZERO`). It is blend STATE, not a define: the program is the same one,
 * marked or not (`figure-material.test.ts`). The canvas is opaque (`alpha: false`,
 * `Arena.tsx` and the pedestal), so a frame drawn without the composer shows no
 * mark; with the composer, the ink writes alpha 1 back. Unmarked is
 * `NormalBlending` — the base blend of every material this is called on (an
 * additive prop kind is never painted and never passed here). Commit time only.
 */
export function markPainted(material: THREE.Material, painted: boolean): void {
  if (painted) {
    if (material.blending === THREE.CustomBlending) return;
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = THREE.SrcAlphaFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
    material.blendEquationAlpha = THREE.AddEquation;
    material.blendSrcAlpha = THREE.ZeroFactor;
    material.blendDstAlpha = THREE.ZeroFactor;
    return;
  }
  material.blending = THREE.NormalBlending;
}

/**
 * **The look, at COMMIT** (`arena/look.ts`'s `figureLookOf` → this): one uniform
 * on the figure's own material, so the program is the same one under both looks,
 * and the painted mark with it (a figure with any comic in it is inked, D129).
 * Called from layout effects and commit-time methods only — `liveness.test.ts`
 * holds every `uLook` write to this file and every caller out of the frame loop.
 */
export function applyLook(material: FigureMaterial, look: number): void {
  material.uniforms.uLook.value = look;
  markPainted(material, look > 0);
}

// ---------------------------------------------------------------------------
// The one-release aliases (holoMaterial.ts's names)
// ---------------------------------------------------------------------------

/** @deprecated since Lane LOOK — {@link makeFigureMaterial}. Kept for one release. */
export const makeHoloMaterial = makeFigureMaterial;
/** @deprecated since Lane LOOK — {@link FigureMaterial}. Kept for one release. */
export type HoloMaterial = FigureMaterial;
/** @deprecated since Lane LOOK — {@link FigureUniforms}. Kept for one release. */
export type HoloUniforms = FigureUniforms;
